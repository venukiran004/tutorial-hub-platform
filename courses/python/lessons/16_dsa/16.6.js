/* ============================================================================
   LESSON 16.6 — Recursion, Backtracking and Dynamic Programming
   ========================================================================= */
EC.receiveLesson({
  id: "16.6",

  lede: "Dynamic programming is not a bag of patterns to recognise. **It is one method: write the brute-force recursion, notice it recomputes, add a cache.** Everything else — tabulation, space optimisation, the famous problems — is refinement of a solution you already had, and starting from the recursion is what makes an unfamiliar problem tractable.",

  objectives: [
    "Write a correct recursion by defining the state precisely",
    "Add memoisation, and know what makes a state cacheable",
    "Convert a memoised recursion to a table when it is worth it",
    "Reduce space when only the last row is needed",
    "Prune a backtracking search rather than exploring everything"
  ],

  prerequisites: ["8.1", "16.4"],

  blocks: [

    { t: "h2", n: "01", text: "The method", id: "method" },

    { t: "viz",
      title: "Four steps, in order, every time",
      caption: "Each step is a mechanical transformation of the previous one. You never invent a recurrence — you write a recursion you can reason about, then improve it without changing what it computes.",
      svg: `<svg viewBox="0 0 900 240" role="img" aria-label="Four steps from brute-force recursion to space-optimised tabulation">
  <rect x="20" y="40" width="196" height="84" rx="9" style="fill:var(--surface);stroke:var(--t-blue)"/>
  <text x="118" y="66" text-anchor="middle" class="s-label" style="fill:var(--t-blue)">1 · RECURSE</text>
  <text x="118" y="90" text-anchor="middle" class="s-sub">define the state</text>
  <text x="118" y="110" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">exponential, correct</text>

  <rect x="238" y="40" width="196" height="84" rx="9" style="fill:var(--surface);stroke:var(--t-green)"/>
  <text x="336" y="66" text-anchor="middle" class="s-label" style="fill:var(--t-green)">2 · MEMOISE</text>
  <text x="336" y="90" text-anchor="middle" class="s-sub">@cache — one line</text>
  <text x="336" y="110" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">states × work per state</text>

  <rect x="456" y="40" width="196" height="84" rx="9" style="fill:var(--surface);stroke:var(--t-violet)"/>
  <text x="554" y="66" text-anchor="middle" class="s-label" style="fill:var(--t-violet)">3 · TABULATE</text>
  <text x="554" y="90" text-anchor="middle" class="s-sub">bottom-up loop</text>
  <text x="554" y="110" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">no recursion limit</text>

  <rect x="674" y="40" width="206" height="84" rx="9" style="fill:var(--surface);stroke:var(--t-amber)"/>
  <text x="777" y="66" text-anchor="middle" class="s-label" style="fill:var(--t-amber)">4 · COMPRESS</text>
  <text x="777" y="90" text-anchor="middle" class="s-sub">keep one row</text>
  <text x="777" y="110" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">O(n) instead of O(n²)</text>

  <path d="M216 82 L234 82" style="stroke:var(--border-strong)" fill="none"/>
  <path d="M434 82 L452 82" style="stroke:var(--border-strong)" fill="none"/>
  <path d="M652 82 L670 82" style="stroke:var(--border-strong)" fill="none"/>

  <text x="20" y="170" class="s-sub" style="fill:var(--good)">STEP 2 IS USUALLY ENOUGH. It has the same complexity as tabulation and is far harder to get wrong.</text>
  <text x="20" y="196" class="s-sub" style="fill:var(--ink-3)">Step 3 earns its place when recursion depth is a risk or the constant factor matters.</text>
  <text x="20" y="222" class="s-sub" style="fill:var(--ink-3)">Step 4 only when memory is genuinely the constraint — it costs readability every time.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the method applied, start to finish", code: `
# THE PROBLEM: climb n stairs, taking 1 or 2 steps. How many ways?

# STEP 1 -- RECURSE. Define the state, then the recurrence follows.
#   STATE: "the number of ways to climb n stairs"
#   That is the whole design decision. Get the state right and the
#   recurrence writes itself.
def climb(n: int) -> int:
    if n <= 2:                       # base cases FIRST
        return max(n, 1)
    return climb(n - 1) + climb(n - 2)
# O(2^n). Correct, and unusable past n = 40.


# STEP 2 -- MEMOISE. One decorator, no change to the logic.
from functools import cache

@cache
def climb(n: int) -> int:
    if n <= 2:
        return max(n, 1)
    return climb(n - 1) + climb(n - 2)
# O(n) time, O(n) space. STOP HERE unless there is a reason not to.


# STEP 3 -- TABULATE. Same recurrence, computed bottom-up, so there
# is no recursion depth to exceed.
def climb(n: int) -> int:
    if n <= 2:
        return max(n, 1)
    dp = [0] * (n + 1)
    dp[1], dp[2] = 1, 2
    for i in range(3, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]    # the SAME recurrence
    return dp[n]


# STEP 4 -- COMPRESS. Only the last two values are ever read.
def climb(n: int) -> int:
    if n <= 2:
        return max(n, 1)
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
# O(n) time, O(1) space -- and now unrecognisable as the recursion.
`,
      hl: [5, 16, 32, 42],
      caption: "**Step 2 has the same complexity as steps 3 and 4 in time.** Go further only for a stated reason — recursion depth, memory, or a constant factor you have measured."
    },

    { t: "h2", n: "02", text: "Defining the state", id: "state" },

    { t: "ladder",
      title: "The coin change problem: fewest coins summing to an amount",
      rungs: [
        { level: "bad", label: "A state that is not enough",
          why: "\"Ways to make `amount`\" ignores which coins remain available. For unlimited coins that happens to be sufficient; the moment each coin can be used once, this state cannot distinguish two situations that need different answers.",
          code: `@cache
def fewest(amount):
    # What if each coin may be used only once? This state cannot
    # express "which coins are left", so it silently returns the
    # unlimited-coins answer to a limited-coins question.
    ...` },
        { level: "ok", label: "A state that is too much",
          why: "Adding the remaining coins as a frozenset makes it correct and explodes the state space to 2ⁿ — the memo now has more entries than the brute force had calls, and the cache helps nothing.",
          code: `@cache
def fewest(amount, remaining: frozenset[int]):
    ...
# Correct. 2^n distinct states, so memoisation buys nothing.` },
        { level: "best", label: "The smallest state that determines the answer",
          why: "An index plus the amount is enough: coins before `i` are decided, coins from `i` onwards are available. Two integers, so the state space is `n × amount` and every subproblem is genuinely shared.",
          code: `@cache
def fewest(i: int, amount: int) -> float:
    """Fewest coins from coins[i:] summing to exactly amount.

    THE STATE IS THE DESIGN. Two integers, so there are
    len(coins) x amount states -- and each is reached many times,
    which is what makes caching pay.
    """
    if amount == 0:
        return 0
    if i >= len(coins) or amount < 0:
        return float("inf")           # infeasible

    return min(
        fewest(i + 1, amount),                    # skip coins[i]
        1 + fewest(i, amount - coins[i]),         # use it (unlimited)
        # ...for each coin ONCE, this becomes fewest(i + 1, ...)
    )

# THE TEST FOR A STATE: does it capture everything that affects the
# answer, and nothing that does not? Too little is wrong; too much
# defeats the cache.`,
          note: "**The state is the whole design.** If two different situations map to the same state and need different answers, the state is too small; if two identical situations map to different states, it is too large." }
      ]
    },

    { t: "callout", kind: "trap", title: "What breaks memoisation", body: [
      { t: "code", lang: "python", title: "four failures", numbered: false, code: `
# 1. UNHASHABLE ARGUMENTS. @cache builds a dict key from the args.
@cache
def f(items: list[int]): ...      # TypeError: unhashable type: 'list'
# Pass a tuple, or pass indices into a list closed over.

# 2. MUTABLE STATE OUTSIDE THE ARGUMENTS.
@cache
def f(i):
    return i + global_counter     # the cache is now WRONG whenever
                                  # global_counter changes
# Everything affecting the result must be an argument.

# 3. AN UNBOUNDED CACHE ON A LONG-LIVED PROCESS. @cache never
#    evicts, so a web handler using it leaks memory for the life of
#    the process.
@lru_cache(maxsize=10_000)        # bounded
def f(...): ...

# 4. TOO MANY DISTINCT STATES. If nearly every call has a unique
#    state, the cache adds overhead and saves nothing. Count the
#    state space BEFORE reaching for the decorator:
#      n x amount           -> fine
#      2^n subsets          -> pointless
#      floats as keys       -> almost never repeat

# @cache is @lru_cache(maxsize=None). In an interview, prefer @cache
# for clarity; in production, bound it.`},
      { t: "p", text: "**Count the state space before memoising.** Two small integers is a good sign; a set, a list or a float is usually a sign the state has been chosen wrongly." }
    ]},

    { t: "h2", n: "03", text: "Backtracking", id: "backtracking" },

    {"kind": "tree", "title": "Backtracking explores and undoes", "caption": "Choose, recurse, un-choose. Each level of the tree is one decision; a branch that violates a constraint is pruned before it grows. The undo step is what makes the same partial state reusable across branches.", "root": {"label": "[]", "tone": "accent", "children": [{"label": "[1]", "tone": "good", "children": [{"label": "[1, 2]", "tone": "good"}, {"label": "[1, 3]", "sub": "pruned", "tone": "crit"}]}, {"label": "[2]", "tone": "good", "children": [{"label": "[2, 1]", "sub": "pruned", "tone": "crit"}, {"label": "[2, 3]", "tone": "good"}]}, {"label": "[3]", "sub": "pruned", "tone": "crit"}]}, "t": "diagram", "id": "dg-16_6-03-0"},


    { t: "code", lang: "python", title: "the template, and what makes it fast", code: `
def solve(candidates, target):
    """Backtracking is DFS over a decision tree. The template is
    always: choose, recurse, un-choose."""
    result: list[list[int]] = []
    path: list[int] = []

    def backtrack(start: int, remaining: int) -> None:
        # BASE CASE -- a complete solution.
        if remaining == 0:
            result.append(path.copy())     # COPY: path is mutated
            return                         # after this returns
        # PRUNE -- this branch cannot lead to a solution.
        if remaining < 0:
            return

        for i in range(start, len(candidates)):
            # PRUNE HARDER: with candidates sorted, once one is too
            # large every later one is too. This single line is often
            # the difference between seconds and minutes.
            if candidates[i] > remaining:
                break

            # SKIP DUPLICATES at the same tree level, so identical
            # combinations are not generated twice.
            if i > start and candidates[i] == candidates[i - 1]:
                continue

            path.append(candidates[i])                  # CHOOSE
            backtrack(i, remaining - candidates[i])     # RECURSE
            path.pop()                                  # UN-CHOOSE

    candidates.sort()          # sorting enables both prunings
    backtrack(0, target)
    return result
`,
      hl: [9, 20, 25, 29],
      caption: "**`path.copy()` is not optional.** Appending `path` itself stores a reference to a list that the very next `pop()` mutates — every result ends up identical and usually empty."
    },

    { t: "callout", kind: "insight", title: "Backtracking or DP", body: [
      { t: "table",
        head: ["", "Backtracking", "Dynamic programming"],
        rows: [
          ["Returns", "**All solutions**, or one valid one", "**A count or an optimum**"],
          ["Subproblems", "Rarely overlap", "**Overlap heavily**"],
          ["Speed comes from", "**Pruning**", "**Caching**"],
          ["Typical cost", "Exponential, pruned", "States × work per state"],
          ["Question shape", "\"list all…\", \"is there a…\"", "\"how many…\", \"what is the max…\""]
        ]
      },
      { t: "p", text: "**\"How many\" or \"what is the best\" means DP; \"list them all\" means backtracking.** You cannot memoise a problem whose answer is every solution, because the answers themselves are exponential in size." },
      { t: "p", text: "**Pruning is where backtracking is won.** Sorting so that one failed candidate rules out all later ones is usually the single highest-value line in the function." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Edit distance, four ways",
      difficulty: "advanced",
      minutes: 44,
      body: [
        { t: "p", text: "Given two strings, return the minimum number of single-character insertions, deletions or substitutions to transform one into the other." },
        { t: "code", lang: "python", numbered: false, title: "examples", code: `
"horse", "ros"       ->  3    horse -> rorse -> rose -> ros
"intention", "execution" -> 5
"", "abc"            ->  3    three insertions
"same", "same"       ->  0`},
        { t: "p", text: "Work through all four steps of the method, showing each transformation. Then reconstruct the actual sequence of edits, which is the part that makes this useful rather than an exercise." }
      ],
      requirements: [
        "Give the brute-force recursion, with the state defined explicitly.",
        "Memoise it and state the complexity.",
        "Tabulate it and explain the base row and column.",
        "Compress the space to O(min(m, n)).",
        "Reconstruct the edit sequence, and say what that costs.",
        "Say which version you would ship and why."
      ],
      hint: "The state is a pair of indices: how much of each string remains. Every operation consumes a character from one string, the other, or both.",
      solution: {
        lang: "python",
        title: "edit_distance.py",
        code: `# =========================================================================
# STEP 1 -- THE RECURSION
# =========================================================================
#
# DEFINE THE STATE FIRST. Everything else follows from it.
#
#   STATE: (i, j) = the edit distance between a[i:] and b[j:]
#
# Two integers. Nothing else affects the answer -- the characters
# already consumed cannot influence what remains.
#
# THE RECURRENCE, from the three allowed operations:
#
#   if a[i] == b[j]:   no cost, advance both
#   otherwise, the minimum of:
#       INSERT      1 + solve(i,     j + 1)   consume from b
#       DELETE      1 + solve(i + 1, j    )   consume from a
#       SUBSTITUTE  1 + solve(i + 1, j + 1)   consume from both
#
# BASE CASES:
#   a exhausted -> insert the rest of b   -> len(b) - j
#   b exhausted -> delete the rest of a   -> len(a) - i

def edit_distance_recursive(a: str, b: str) -> int:
    """O(3^(m+n)) -- exponential. Correct, and unusable past ~12
    characters, which is exactly what makes it a good starting
    point: it is obviously right."""
    def solve(i: int, j: int) -> int:
        if i == len(a):
            return len(b) - j
        if j == len(b):
            return len(a) - i

        if a[i] == b[j]:
            return solve(i + 1, j + 1)      # free

        return 1 + min(
            solve(i,     j + 1),            # insert
            solve(i + 1, j    ),            # delete
            solve(i + 1, j + 1),            # substitute
        )

    return solve(0, 0)


# =========================================================================
# STEP 2 -- MEMOISE
# =========================================================================

from functools import cache

def edit_distance_memo(a: str, b: str) -> int:
    """O(m * n) time, O(m * n) space.

    THE COMPLEXITY ARGUMENT: there are m * n distinct states, each
    computed once, each doing O(1) work. Exponential to quadratic,
    for one decorator and no change to the logic.
    """
    @cache
    def solve(i: int, j: int) -> int:
        if i == len(a):
            return len(b) - j
        if j == len(b):
            return len(a) - i
        if a[i] == b[j]:
            return solve(i + 1, j + 1)
        return 1 + min(solve(i, j + 1), solve(i + 1, j),
                       solve(i + 1, j + 1))

    result = solve(0, 0)
    solve.cache_clear()      # the closure holds a and b; without this
    return result            # they are retained for the process's life

# NOTE the cache is on an INNER function, recreated per call. A
# module-level @cache on a function taking (a, b, i, j) would key on
# the full strings at every level -- correct, but the keys are then
# O(m + n) to hash, which changes the complexity.


# =========================================================================
# STEP 3 -- TABULATE
# =========================================================================

def edit_distance_table(a: str, b: str) -> int:
    """O(m * n) time and space, iterative.

    Same recurrence, filled bottom-up. Worth doing when the strings
    can be long: the memoised version recurses to depth m + n, so
    two 10,000-character strings raise RecursionError (Lesson 16.4).
    """
    m, n = len(a), len(b)
    # dp[i][j] = edit distance between a[:i] and b[:j]
    #
    # NOTE the indexing flips: the table works on PREFIXES where the
    # recursion worked on SUFFIXES. Both are correct; prefixes are
    # the convention for tabulation because the base cases land in
    # row 0 and column 0.
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    # BASE ROW AND COLUMN -- these are the recursion's base cases.
    for i in range(m + 1):
        dp[i][0] = i         # a[:i] -> "" costs i deletions
    for j in range(n + 1):
        dp[0][j] = j         # "" -> b[:j] costs j insertions
    # Getting these wrong is the classic tabulation bug: leaving them
    # as zeros makes every empty-string case return 0.

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:      # -1: dp is 1-indexed over
                dp[i][j] = dp[i - 1][j - 1]   # 0-indexed strings
            else:
                dp[i][j] = 1 + min(
                    dp[i][j - 1],         # insert
                    dp[i - 1][j],         # delete
                    dp[i - 1][j - 1],     # substitute
                )

    return dp[m][n]


# =========================================================================
# STEP 4 -- COMPRESS
# =========================================================================

def edit_distance_compressed(a: str, b: str) -> int:
    """O(m * n) time, O(min(m, n)) space.

    Each cell reads only from the row above and the cell to its left,
    so only ONE previous row is ever needed.
    """
    # Iterate over the SHORTER string, so the row is as small as
    # possible.
    if len(a) < len(b):
        a, b = b, a
    m, n = len(a), len(b)

    previous = list(range(n + 1))          # the base row

    for i in range(1, m + 1):
        current = [i] + [0] * n            # the base column value
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                current[j] = previous[j - 1]
            else:
                current[j] = 1 + min(
                    current[j - 1],        # insert  (this row, left)
                    previous[j],           # delete  (row above)
                    previous[j - 1],       # substitute (diagonal)
                )
        previous = current

    return previous[n]

# THE COST OF THIS STEP: the relationship to the recurrence is now
# obscured, and the reconstruction below becomes IMPOSSIBLE -- the
# table it walks backwards through no longer exists. That trade is
# the reason step 4 is optional.


# =========================================================================
# RECONSTRUCTING THE EDITS
# =========================================================================

def edit_operations(a: str, b: str) -> list[str]:
    """The actual sequence of edits, not just the count.

    O(m * n) time and space -- the FULL table is required, so this
    cannot be combined with step 4. Walking backwards from dp[m][n],
    each step asks which predecessor produced this value.
    """
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            dp[i][j] = (dp[i - 1][j - 1] if a[i - 1] == b[j - 1]
                        else 1 + min(dp[i][j - 1], dp[i - 1][j],
                                     dp[i - 1][j - 1]))

    # WALK BACK. At each cell, determine which choice was taken.
    ops: list[str] = []
    i, j = m, n
    while i > 0 or j > 0:
        if i > 0 and j > 0 and a[i - 1] == b[j - 1] \\
                and dp[i][j] == dp[i - 1][j - 1]:
            i, j = i - 1, j - 1                       # matched, free
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            ops.append(f"substitute {a[i-1]!r} -> {b[j-1]!r} at {i-1}")
            i, j = i - 1, j - 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            ops.append(f"delete {a[i-1]!r} at {i-1}")
            i -= 1
        else:
            ops.append(f"insert {b[j-1]!r} at {i}")
            j -= 1

    return ops[::-1]      # built backwards

# THE ORDER OF THE elif BRANCHES DETERMINES WHICH MINIMAL SEQUENCE
# IS RETURNED when several are equally short. All are valid; if a
# specific one is required, that is a further constraint on the
# tie-breaking and must be stated.


# =========================================================================
# COMPARISON, AND WHAT I WOULD SHIP
# =========================================================================
#
#                   time        space           depth      notes
#   recursive       O(3^(m+n))  O(m+n)          m+n        unusable
#   memoised        O(m*n)      O(m*n)          m+n        clearest
#   tabulated       O(m*n)      O(m*n)          none       no limit
#   compressed      O(m*n)      O(min(m,n))     none       opaque
#   with edits      O(m*n)      O(m*n)          none       most useful
#
# At m = n = 1,000:
#   recursive   ~10^900 operations        (never finishes)
#   memoised    ~10^6 operations, 8 MB
#   compressed  ~10^6 operations, 8 KB
#
# WHAT I WOULD SHIP:
#
#   The TABULATED version, by default. Same complexity as the
#   memoised one, no recursion depth to worry about, and the table
#   is available if edits are ever needed.
#
#   The MEMOISED version in an interview or where strings are short:
#   it is closest to the recurrence, so it is the easiest to verify
#   by reading.
#
#   The COMPRESSED version only when memory is measured and binding.
#   8 MB is nothing on a server and everything in a tight loop over
#   millions of string pairs -- but it forecloses reconstruction,
#   which is usually what a caller actually wants.
#
#   NEVER the plain recursion, except as the thing you write first
#   to establish that the recurrence is right.
#
# AND IN PRODUCTION: use python-Levenshtein or RapidFuzz. They are C,
# they are 50-100x faster, and this is a solved problem. Write it
# yourself to understand it, not to deploy it.
#
#
# =========================================================================
# TESTS
# =========================================================================

@pytest.mark.parametrize("a,b,expected", [
    ("horse", "ros",           3),
    ("intention", "execution", 5),
    ("", "abc",                3),
    ("abc", "",                3),
    ("", "",                   0),
    ("same", "same",           0),
    ("a", "b",                 1),
    ("abcdef", "abcdef",       0),
    ("kitten", "sitting",      3),
])
def test_edit_distance(a, b, expected):
    for fn in (edit_distance_memo, edit_distance_table,
               edit_distance_compressed):
        assert fn(a, b) == expected, fn.__name__


def test_all_versions_agree_on_random_input():
    """Property test. The recursion is obviously correct and slow,
    which makes it the oracle for the fast versions."""
    for _ in range(300):
        a = "".join(random.choices("abc", k=random.randint(0, 8)))
        b = "".join(random.choices("abc", k=random.randint(0, 8)))

        expected = edit_distance_recursive(a, b)
        assert edit_distance_memo(a, b) == expected
        assert edit_distance_table(a, b) == expected
        assert edit_distance_compressed(a, b) == expected


def test_symmetry():
    """Edit distance is a metric, so d(a,b) == d(b,a). A good
    invariant to assert -- it catches index errors that example-based
    tests miss."""
    for _ in range(300):
        a = "".join(random.choices("abcd", k=random.randint(0, 10)))
        b = "".join(random.choices("abcd", k=random.randint(0, 10)))

        assert edit_distance_table(a, b) == edit_distance_table(b, a)


def test_triangle_inequality():
    """The other metric property: d(a,c) <= d(a,b) + d(b,c)."""
    for _ in range(200):
        a, b, c = (random_string() for _ in range(3))

        assert (edit_distance_table(a, c)
                <= edit_distance_table(a, b) + edit_distance_table(b, c))


def test_the_operations_actually_transform_the_string():
    """The reconstruction is only correct if applying it works."""
    for _ in range(200):
        a, b = random_string(), random_string()

        ops = edit_operations(a, b)

        assert len(ops) == edit_distance_table(a, b)
        assert apply_operations(a, ops) == b


def test_no_recursion_error_on_long_strings():
    """The reason the tabulated version exists."""
    a, b = "x" * 5_000, "y" * 5_000

    assert edit_distance_table(a, b) == 5_000       # no RecursionError

    with pytest.raises(RecursionError):
        edit_distance_memo(a, b)`,
        notes: [
          { t: "p", text: "**The state is the design decision.** `(i, j)` — how much of each string remains — captures everything affecting the answer and nothing that does not, which is why there are exactly m × n states and each is genuinely shared." },
          { t: "p", text: "**The memoised version is exponential-to-quadratic for one decorator**, with no change to the logic. That is the whole payoff of starting from a recursion you can verify by reading rather than inventing a recurrence." },
          { t: "callout", kind: "insight", title: "Tabulation flips suffixes to prefixes", body: [
            { t: "p", text: "The recursion is naturally written over suffixes (`a[i:]`), while the table is conventionally over prefixes (`a[:i]`) — because that puts the base cases in row 0 and column 0 where they are easy to fill." },
            { t: "p", text: "The `- 1` in `a[i - 1] == b[j - 1]` is the consequence: the table is 1-indexed over 0-indexed strings, and forgetting it is the most common tabulation bug after leaving the base row as zeros." }
          ]},
          { t: "p", text: "**Compression forecloses reconstruction.** The backward walk needs the full table, so step 4 and the edit sequence are mutually exclusive — and the sequence is usually what a caller actually wants." },
          { t: "p", text: "**The order of the `elif` branches decides which minimal sequence is returned** when several are equally short. All are valid; if a particular one is required, that is an additional constraint that must be stated." },
          { t: "p", text: "**Ship the tabulated version by default.** Same complexity as the memoised one, no recursion depth, and the table is there if edits are ever needed — and in production, use RapidFuzz, because this is a solved problem in C." },
          { t: "p", text: "**Test the metric properties, not just examples.** Symmetry and the triangle inequality catch index errors that hand-picked cases miss, and the reconstruction test — apply the operations and check you get the target — is the only real proof it is right." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team spent three days trying to derive a DP recurrence for a scheduling problem from the shape of the answer. They filled a whiteboard with tables and never got one that was correct." },
      { t: "p", text: "**Writing the brute-force recursion took twenty minutes.** It was obviously correct, ran on small inputs, and made the state visible — two indices and a boolean. Adding `@cache` made it fast enough that afternoon." },
      { t: "p", text: "**They never wrote the tabulated version**, because the memoised one had identical complexity and the inputs were small enough that recursion depth was not a risk." },
      { t: "p", text: "**Do not start from the recurrence.** Start from a recursion you can verify by reading, then improve it mechanically — the recurrence is something you end up with, not something you invent." }
    ]}
  ],

  takeaways: [
    "**DP is one method, not a set of patterns: recurse, memoise, tabulate, compress** — and each step is a mechanical transformation of the last.",
    "**Start from a brute-force recursion you can verify by reading.** The recurrence is what you end up with, not what you invent.",
    "**The state is the whole design.** Too small and two different situations collide; too large and nothing is shared, so caching buys nothing.",
    "**Count the state space before memoising.** Two small integers is a good sign; a set, a list or a float means the state is wrong.",
    "**`@cache` requires hashable arguments and no hidden mutable state** — everything affecting the result must be an argument.",
    "**Bound the cache in a long-lived process.** `@cache` never evicts, so a request handler using it leaks for the process's lifetime.",
    "**Stop at memoisation unless there is a reason not to.** It has the same time complexity as tabulation and is far harder to get wrong.",
    "**Tabulate when recursion depth is a risk** — two 10,000-character strings will exceed the limit.",
    "**Tabulation flips suffixes to prefixes**, which is why the base cases land in row 0 and column 0, and why the `- 1` indexing appears.",
    "**Leaving the base row and column as zeros is the classic tabulation bug**, and it makes every empty-input case return 0.",
    "**Compress only when memory is measured and binding** — it obscures the recurrence and forecloses reconstructing the actual answer.",
    "**Backtracking is DFS with choose, recurse, un-choose** — and `path.copy()` when recording, or every result aliases the same mutating list.",
    "**Pruning is where backtracking is won.** Sorting so one failed candidate rules out all later ones is often the highest-value line.",
    "**\"How many\" or \"what is the best\" means DP; \"list them all\" means backtracking** — you cannot memoise an answer that is exponential in size."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is the first step when facing an unfamiliar DP problem?",
        options: [
          "Identify which classic problem it resembles",
          "Write the brute-force recursion, defining the state precisely — memoisation is then one decorator away",
          "Draw the DP table and derive the recurrence",
          "Determine the time complexity target"
        ],
        answer: 1,
        why: "Deriving a recurrence from the shape of the answer is guessing; a recursion can be verified by reading and tested on small inputs. Once it is correct, `@cache` takes it from exponential to states × work-per-state with no change to the logic."
      },
      {
        stem: "You memoise a function on `(amount, frozenset(remaining_coins))` and it is no faster. Why?",
        options: [
          "frozensets are slow to hash",
          "The state space is 2ⁿ, so almost every call has a unique state and nothing is ever reused",
          "The cache needs a larger maxsize",
          "Sets cannot be used as cache keys"
        ],
        answer: 1,
        why: "Memoisation only pays when subproblems overlap. The state must be the smallest thing that determines the answer — here an index plus an amount, giving n × amount states, each reached many times."
      },
      {
        stem: "A tabulated edit-distance solution returns 0 for `(\"abc\", \"\")`. What is wrong?",
        options: [
          "The loop bounds are off by one",
          "The base row and column were left as zeros — `dp[i][0]` must be `i` and `dp[0][j]` must be `j`",
          "Empty strings need a special case before the loop",
          "The minimum should be a maximum"
        ],
        answer: 1,
        why: "The base row and column are the recursion's base cases, and leaving them zero silently makes every empty-input case free. It is the most common tabulation bug, and it passes any test that never involves an empty string."
      },
      {
        stem: "In backtracking, why must you append `path.copy()` rather than `path`?",
        options: [
          "To avoid a memory leak",
          "`path` is mutated by the subsequent `pop()`, so storing a reference means every recorded result changes as the search continues",
          "Lists cannot be nested",
          "Copying is required for the recursion to unwind"
        ],
        answer: 1,
        why: "All the appended references point at the same list object, so by the time the search finishes they are all identical — usually all empty. It is the single most common backtracking bug and it produces a result that looks structurally right and is entirely wrong."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How do you approach a dynamic programming problem?",
        strong: "Write the brute-force recursion first, defining the state explicitly. Memoise it, which is usually enough. Tabulate only if recursion depth is a risk, and compress only if memory is measured and binding.",
        answer: [
          { t: "p", text: "Presenting it as a mechanical method rather than pattern recognition is what makes it usable on a problem you have not seen." },
          { t: "p", text: "Saying you would stop at memoisation, with a reason, shows judgement rather than a reflex to optimise." },
          { t: "p", text: "Emphasising that the state is the design — and that a wrong state is either incorrect or uncacheable — is the part interviewers are actually probing." }
        ]
      },
      {
        level: "advanced",
        q: "When is memoisation not the answer?",
        strong: "When subproblems do not overlap, so the cache never hits — a state space of 2ⁿ subsets, or keys built from floats. And in a long-lived process, where an unbounded cache leaks for the lifetime of the process.",
        answer: [
          { t: "p", text: "Counting the state space before reaching for the decorator is a concrete habit rather than a rule of thumb." },
          { t: "p", text: "The production concern — `@cache` never evicting — shows you think beyond the interview framing." },
          { t: "p", text: "Noting that unhashable arguments and hidden mutable state both break it covers the two ways it fails outright." }
        ]
      },
      {
        level: "core",
        q: "Backtracking or dynamic programming?",
        strong: "\"List all solutions\" or \"is there one\" is backtracking; \"how many\" or \"what is the optimum\" is DP. You cannot memoise a problem whose answer is every solution, because the answers are themselves exponential.",
        answer: [
          { t: "p", text: "The question-shape heuristic is quick and reliable, and explaining *why* it holds is what makes it more than a rule." },
          { t: "p", text: "Naming pruning as where backtracking is won, and sorting as what enables it, gives a concrete technique." },
          { t: "p", text: "The `path.copy()` detail is worth mentioning — it is the bug that produces a plausible-looking wrong answer." }
        ]
      }
    ]
  }
});

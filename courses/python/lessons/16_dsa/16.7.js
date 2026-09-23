/* ============================================================================
   LESSON 16.7 — Algorithm Paradigms: Choosing the Approach
   Mirrors 27_DSA/Types_of_Algorithms.md: brute force, divide and conquer,
   greedy, dynamic programming, backtracking, randomised, the family
   overview, and the decision guide. Every timing was measured here.
   ========================================================================= */
EC.receiveLesson({
  id: "16.7",

  lede: "**Before a data structure, before a trick, an algorithm question is a question about which paradigm fits: try everything, split and merge, take the locally best step, reuse subproblem answers, build and prune, or accept randomness.** Lessons 16.1–16.6 taught the structures and the classic problems; this one is the reference's map of the six paradigms, each with its signature problem, its cost, and the moment it fails — greedy giving 3 coins where 2 suffice, brute force on N-Queens needing sixteen million boards where pruning needs a few thousand — and the decision guide that picks between them from the shape of the problem.",

  objectives: [
    "Define brute force, divide and conquer, greedy, dynamic programming, backtracking and randomised algorithms, each with a canonical example and its complexity",
    "Recognise when greedy is wrong and dynamic programming is needed, from a case where the two disagree",
    "Explain why backtracking beats brute force on constrained search, with the N-Queens count",
    "Place the algorithm families — searching, sorting, graphs, hashing, strings, numeric — in the map",
    "Apply the decision guide: brute force first as an oracle, then spot the structure that upgrades it"
  ],

  prerequisites: ["16.5", "16.6", "10.1"],

  blocks: [

    { t: "h2", n: "01", text: "What an algorithm is, and how it is measured", id: "measure" },

    { t: "p", text: "An algorithm is a finite, unambiguous procedure that turns an input into an output. It is judged on correctness first and then on cost — time and memory — expressed as growth with input size: O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ) (lesson 10.1). The paradigms below are strategies for *designing* one; the families in section 08 are the well-known results of applying them." },

    { t: "h2", n: "02", text: "Brute force", id: "brute" },

    { t: "p", text: "Try every candidate and keep the ones that work. It is always correct, usually exponential, and the right first move on any hard problem — because it gives you a test oracle to check the clever version against. Linear search is brute force; so is checking every pair for a two-sum; so is enumerating every permutation." },

    { t: "code", lang: "python", title: "Brute force as an oracle",
      code: `from itertools import combinations

def two_sum_brute(nums, target):                 # O(n²): every pair
    return [pair for pair in combinations(range(len(nums)), 2) if nums[pair[0]] + nums[pair[1]] == target]

def two_sum_fast(nums, target):                  # O(n): the hash-map version from lesson 16.2
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [(seen[target - x], i)]
        seen[x] = i
    return []

import random
for _ in range(1000):                            # the brute-force answer checks the fast one
    nums = [random.randint(0, 20) for _ in range(8)]
    assert (two_sum_fast(nums, 15) or [None])[0] in (two_sum_brute(nums, 15) or [None])`,
      caption: "A thousand random cases where the slow, obviously-correct version judges the fast one. Keep the brute-force function in the tests after the fast one ships." },

    { t: "h2", n: "03", text: "Divide and conquer", id: "divide" },

    { t: "diagram", kind: "tree", title: "Merge sort: split, sort the halves, merge", caption: "Each level of the tree does O(n) work merging and there are log₂ n levels, so the total is O(n log n) whatever the input order. Binary search is the same idea with only one half kept.", root: { label: "[38, 27, 43, 3, 9, 82]", tone: "accent", children: [
      { label: "[38, 27, 43]", tone: "warn", children: [{ label: "[38]" }, { label: "[27, 43]", children: [{ label: "[27]" }, { label: "[43]" }] }] },
      { label: "[3, 9, 82]", tone: "warn", children: [{ label: "[3]" }, { label: "[9, 82]", children: [{ label: "[9]" }, { label: "[82]" }] }] }
    ] } },

    { t: "code", lang: "python", title: "Merge sort against bubble sort, timed",
      code: `def merge_sort(a):
    if len(a) <= 1:
        return a
    m = len(a) // 2
    left, right = merge_sort(a[:m]), merge_sort(a[m:])        # divide
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):                   # conquer: merge two sorted runs
        if left[i] <= right[j]: out.append(left[i]); i += 1
        else:                   out.append(right[j]); j += 1
    return out + left[i:] + right[j:]

# 2,000 random integers, measured here
# bubble sort 128 ms · merge sort 2.7 ms · sorted() 0.15 ms`,
      caption: "Fifty times faster than the quadratic sort at 2,000 items, and the ratio doubles every time n doubles. The built-in sorted() — Timsort, in C — is another twenty times faster again, which is why you write merge sort to understand it and call sorted() to use it." },

    { t: "h2", n: "04", text: "Greedy", id: "greedy" },

    { t: "p", text: "At each step take the locally best choice and never look back. When a locally best choice is provably globally best — Dijkstra, Huffman coding, interval scheduling by earliest finish, making change with standard coins — greedy is the fastest correct algorithm there is. When it is not provable, greedy is fast and wrong, and the coin problem shows both faces:" },

    { t: "code", lang: "python", title: "Greedy change-making: right for one coin set, wrong for another",
      code: `def coins_greedy(amount, coins):
    n = 0
    for c in sorted(coins, reverse=True):       # largest coin first, as many as fit
        n += amount // c
        amount %= c
    return n if amount == 0 else None

print(coins_greedy(63, [1, 5, 10, 25]))         # 6  (25+25+10+1+1+1) — optimal
print(coins_greedy(6, [1, 3, 4]))               # 3  (4+1+1) — but 3+3 is 2 coins`,
      caption: "With 1, 5, 10, 25 every larger coin is a multiple of the structure below it and greedy is optimal. With 1, 3, 4 it is not: taking the 4 first leaves a remainder that costs two coins. Nothing in the greedy rule can see that." },

    { t: "h2", n: "05", text: "Dynamic programming", id: "dp" },

    { t: "p", text: "When a problem asks for an optimum and its subproblems overlap — the same smaller question is asked many times — remember each answer and reuse it. Top-down with memoisation (lesson 3.8's `lru_cache`) or bottom-up with a table; either way exponential becomes polynomial. DP is what to reach for when greedy gives the wrong answer." },

    { t: "code", lang: "python", title: "The coin problem, bottom-up",
      code: `import math

def coins_dp(amount, coins):
    best = [0] + [math.inf] * amount                       # best[a] = fewest coins for amount a
    for a in range(1, amount + 1):
        best[a] = min((best[a - c] + 1 for c in coins if c <= a), default=math.inf)
    return best[amount] if best[amount] < math.inf else None

print(coins_dp(63, [1, 5, 10, 25]))   # 6 — agrees with greedy
print(coins_dp(6, [1, 3, 4]))         # 2 — 3 + 3, which greedy could not find

# the classic: fib(30) by naive recursion 119 ms; with @lru_cache 64 µs — fib(200) is instant`,
      caption: "best[6] looks at best[5] + 1, best[3] + 1 and best[2] + 1 — and best[3] is 1 (one 3-coin), so the answer is 2. Every amount is solved once; O(amount × coins)." },

    { t: "diagram", kind: "cells", title: "The DP table for amount 6 with coins 1, 3, 4", caption: "Each cell is the fewest coins for that amount, built left to right from the cells a coin's value to its left. best[6] = best[3] + 1 = 2.", items: ["0", "1", "2", "1", "1", "2", "2"], highlight: [3, 6], negative: false, tone: "good", label: "amount 0 … 6 — greedy's answer of 3 is nowhere in the table" },

    { t: "h2", n: "06", text: "Backtracking", id: "backtracking" },

    { t: "p", text: "Build a solution one decision at a time; the moment a partial solution breaks a constraint, undo the last decision and try the next option. It is brute force with pruning, and the pruning is everything: N-Queens by brute force means trying 8⁸ = 16,777,216 boards, while backtracking abandons a branch as soon as two queens attack." },

    { t: "code", lang: "python", title: "N-Queens by backtracking",
      code: `def nqueens(n):
    count, cols, diag1, diag2 = 0, set(), set(), set()
    def place(row):
        nonlocal count
        if row == n:
            count += 1; return
        for c in range(n):
            if c in cols or row - c in diag1 or row + c in diag2:
                continue                                   # prune: this square is attacked
            cols.add(c); diag1.add(row - c); diag2.add(row + c)      # choose
            place(row + 1)                                            # explore
            cols.discard(c); diag1.discard(row - c); diag2.discard(row + c)   # un-choose
    place(0)
    return count

print(nqueens(8))     # 92 solutions, 2 ms here — against 16,777,216 boards for brute force`,
      caption: "Choose, explore, un-choose — the shape of every backtracking solution (lesson 16.6). The three sets make the attack check O(1); the un-choose step is what lets the same sets serve every branch." },

    { t: "h2", n: "07", text: "Randomised algorithms", id: "random" },

    { t: "p", text: "Sometimes the worst case only bites when the input is adversarial, and a random choice makes every input average: quicksort with a random pivot is O(n log n) in expectation on *every* input, where a fixed pivot is O(n²) on sorted data. And sometimes an exact answer is too expensive but an estimate is enough — Monte Carlo methods sample and count." },

    { t: "code", lang: "python", title: "Monte Carlo π",
      code: `import random
random.seed(1)
N = 200_000
inside = sum(1 for _ in range(N) if random.random() ** 2 + random.random() ** 2 <= 1)
print(4 * inside / N)      # 3.1372 — within 0.15 % of π; the error shrinks like 1/√N`,
      caption: "Two hundred thousand random points in the unit square; the fraction inside the quarter circle estimates π/4. Four times more samples halve the error." },

    { t: "h2", n: "08", text: "The families", id: "families" },

    { t: "diagram", kind: "compare", title: "The algorithm families the paradigms produced", caption: "Lessons 16.1–16.6 covered the structures and the problems; this is the reference's map of the named algorithms by family, with the complexity you should be able to state for each.", columns: [
      { title: "Searching", tone: "accent", items: ["linear O(n)", "binary O(log n) on sorted data", "BFS / DFS on graphs"] },
      { title: "Sorting", tone: "good", items: ["bubble, insertion O(n²)", "merge, quick O(n log n)", "Timsort — sorted()"] },
      { title: "Graphs", tone: "warn", items: ["BFS shortest unweighted path", "DFS, topological sort", "Dijkstra O((V+E) log V)"] },
      { title: "Hashing, strings, numbers", tone: "violet", items: ["hash tables O(1) average", "two-pointer palindromes, naive search O(n·m)", "Euclid's GCD, sieve, fast exponentiation O(log n)"] }
    ] },

    { t: "h2", n: "09", text: "The decision guide", id: "decide" },

    { t: "diagram", kind: "steps", title: "Which paradigm, from the shape of the problem", caption: "The reference's decision tree, read top to bottom; the first match usually holds. On a genuinely hard problem the progression is brute force → notice repeated work → memoise or prove a greedy rule → tune constants.", items: [
      { label: "Input tiny, or you need a correctness baseline?", desc: "brute force — try everything, keep it as the oracle", tone: "accent" },
      { label: "Splits into similar independent pieces you can merge?", desc: "divide and conquer — merge sort, binary search", tone: "good" },
      { label: "Asks for an optimum and a local best is provably global?", desc: "greedy — fast, but prove it", tone: "warn" },
      { label: "Asks for an optimum and choices overlap or greedy is wrong?", desc: "dynamic programming — reuse subproblem answers", tone: "warn" },
      { label: "Find all or any valid arrangement under constraints?", desc: "backtracking — build and prune", tone: "violet" },
      { label: "Worst cases hurt, or exact is too costly?", desc: "randomised — random pivot, Monte Carlo", tone: "crit" }
    ] },

    { t: "callout", kind: "mental", title: "A correct answer beats an elegant wrong one",
      body: [{ t: "p", text: "In an interview, say the brute-force approach and its complexity first, then improve it. Interviewers want to see that you can get *an* answer, that you can see what is being recomputed, and that you can name what the improvement costs. Skipping to the clever version and getting it wrong scores lower than the plain version done right." }] },

    { t: "exercise", kind: "practice", title: "Greedy or DP?", difficulty: "advanced", minutes: 20,
      body: [{ t: "p", text: "For each problem decide whether greedy is correct, and if not write the DP: (a) schedule the maximum number of non-overlapping meetings from a list of (start, end); (b) fewest coins for an amount with coins {1, 7, 10}; (c) the maximum sum of a contiguous subarray. Give the paradigm, the complexity, and a test case where the wrong paradigm fails if there is one." }],
      requirements: ["A verdict and a reason for each", "Code for (b) and (c)", "A counter-example for any greedy that fails"],
      hint: "(b): try amount 14.",
      solution: { lang: "python", title: "Solution",
        code: `# (a) greedy by earliest end time is optimal — exchange argument; O(n log n) for the sort
# (b) greedy takes 10+1+1+1+1 = 5 coins for 14; 7+7 is 2 → DP (coins_dp(14, [1, 7, 10]) == 2)
# (c) Kadane's algorithm: a one-pass DP where best_ending_here = max(x, best_ending_here + x); O(n)
def max_subarray(a):
    best = cur = a[0]
    for x in a[1:]:
        cur = max(x, cur + x); best = max(best, cur)
    return best
print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))   # 6`,
        notes: [{ t: "p", text: "(a) is the classic provable greedy; (b) is the coin trap with a different coin set; (c) looks greedy but is a DP with a one-cell table — the state is 'best sum ending here', and reusing it is what makes the pass linear." }] } }
  ],

  takeaways: [
    "Brute force is always correct and usually exponential; write it first and keep it as the oracle for the fast version.",
    "Divide and conquer splits, solves and merges — merge sort's O(n log n) beat bubble sort fifty to one at 2,000 items, and sorted() beat merge sort twenty to one.",
    "Greedy is the fastest correct algorithm when a local best is provably global, and confidently wrong otherwise: 3 coins for 6 with {1, 3, 4} where 2 suffice.",
    "Dynamic programming remembers overlapping subproblems — the coin table gives 2, fib(30) drops from 119 ms to 64 µs.",
    "Backtracking is brute force with pruning: 92 solutions to 8-Queens in 2 ms against sixteen million boards.",
    "Randomisation removes adversarial worst cases (random pivot) or trades exactness for speed (Monte Carlo π to 0.15 % from 200,000 samples).",
    "Decide from the problem's shape: baseline, splittable, optimum-with-proof, optimum-with-overlap, constrained search, or worst-case-sensitive."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "For coins {1, 3, 4} and amount 6, greedy returns 3 and DP returns 2. Why does greedy fail?",
      options: ["Greedy cannot handle amounts above 5", "Taking the largest coin first leaves a remainder whose best solution is worse than a different first choice — the local best is not the global best", "DP uses more coins", "The coins are not sorted"],
      answer: 1,
      why: "Greedy commits to the 4 because it is locally best, leaving 2 that costs two 1-coins. The optimum, 3 + 3, never takes the largest coin. With {1, 5, 10, 25} every coin divides the structure above it and the greedy choice is provably safe; with {1, 3, 4} it is not, and only a method that compares subproblem answers finds 2." },
    { stem: "What does backtracking add to brute force?",
      options: ["Randomness", "Pruning: a partial solution that already violates a constraint is abandoned before it is extended", "Memoisation", "Sorting"],
      answer: 1,
      why: "Brute force enumerates complete candidates and checks each; backtracking builds candidates incrementally and stops extending any prefix that is already invalid. For 8-Queens that is the difference between 16.7 million boards and a search that finds all 92 solutions in milliseconds." },
    { stem: "Why is quicksort given a random pivot?",
      options: ["To make it stable", "So that no fixed input order can force the O(n²) worst case — the expected time is O(n log n) on every input", "To use less memory", "Because Python requires it"],
      answer: 1,
      why: "With a fixed pivot choice, an adversary (or an already-sorted input) produces maximally unbalanced partitions and quadratic time. A random pivot makes the partition balance a matter of chance independent of the input, so the expected cost is O(n log n) for any input." },
    { stem: "A problem asks for the maximum value achievable under constraints, and a small example shows the greedy answer is not optimal. What is the next paradigm to try?",
      options: ["Randomised", "Divide and conquer", "Dynamic programming", "Linear search"],
      answer: 2,
      why: "An optimisation problem where greedy fails is the signature of overlapping subproblems: the best answer depends on comparing the best answers to smaller versions. Define the state, write the recurrence, memoise or tabulate — the reference's decision guide sends you there directly." }
  ] },

  interview: { title: "Interview", sub: "The paradigm questions", questions: [
    { level: "Core", q: "How do you decide between greedy and dynamic programming?",
      strong: "Greedy when the greedy-choice property and optimal substructure can be argued; DP when subproblems overlap or a counter-example breaks greedy.",
      answer: [{ t: "p", text: "Both need optimal substructure — an optimal solution contains optimal solutions to subproblems. Greedy additionally needs the greedy-choice property: a locally optimal choice is part of some globally optimal solution, usually shown by an exchange argument (swap any optimal solution's first choice for the greedy one without loss). If I can make that argument — interval scheduling by earliest finish, Dijkstra with non-negative weights — greedy is O(n log n) and done. If I cannot, or a small case breaks it, the subproblems overlap and I define a state and a recurrence for DP, accepting polynomial rather than near-linear time. In practice: try to break greedy with a five-element example before trusting it." }] },
    { level: "Core", q: "Explain divide and conquer and give its recurrence for merge sort.",
      strong: "Split into halves, solve each recursively, merge in O(n); T(n) = 2T(n/2) + O(n) = O(n log n).",
      answer: [{ t: "p", text: "Divide the input into independent parts, solve each part the same way, combine the results. Merge sort splits a list in half, sorts each half recursively, and merges the two sorted halves in linear time. The recurrence is T(n) = 2T(n/2) + O(n): log₂ n levels of recursion, each doing O(n) total merge work, so O(n log n) regardless of input order — unlike quicksort, which depends on the pivot. The cost is O(n) extra memory for the merges. Binary search is the degenerate case with one half kept and O(1) combine: T(n) = T(n/2) + O(1) = O(log n)." }] },
    { level: "Senior", q: "You are handed an optimisation problem you have never seen. Walk me through your first fifteen minutes.",
      strong: "Restate, pick a brute force and its complexity, find a small counter-example for greedy, define a DP state, then estimate whether the state space fits the limits.",
      answer: [{ t: "p", text: "Restate the problem with a three-element example to fix the semantics. Write the brute force in my head — enumerate the choices — and state its complexity so we both know the baseline; it is also the oracle for testing. Ask what is being recomputed: if the same subproblem recurs, that is DP, and I define the state as the smallest description of 'where I am' and the recurrence as the choices from that state. Before coding, size the state space against the input limits — a 10⁴ × 10⁴ table is fine, 10⁵ × 10⁵ is not — and if it is too large look for a greedy rule with an exchange argument, or a monotonic structure that allows binary search on the answer. Then code the simplest correct version, test it against brute force on random small inputs, and only then optimise constants." }] }
  ] }
});

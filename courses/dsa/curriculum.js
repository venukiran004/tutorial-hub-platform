/* ============================================================================
   DATA STRUCTURES & ALGORITHMS IN PYTHON — CURRICULUM
   ----------------------------------------------------------------------------
   Organised by the pattern behind the question rather than by the structure,
   because the patterns are few and the questions are not. Every complexity
   claim in the lessons is measured on the machine rather than asserted, and
   the interview bank sits in the same course as the patterns that answer it.

   Assumes the Python language itself: the lessons use comprehensions, slicing,
   `collections` and `heapq` without re-teaching them.
   ========================================================================= */
(function () {
  "use strict";

  EC.defineCourse({
    id: "dsa",
    title: "Data Structures & Algorithms",
    subtitle: "The patterns behind the questions",
    short: "DSA",
    tagline: "Two pointers, hashing, monotonic stacks, one BFS and one DFS template, binary search on the answer, and brute force through to tabulated DP — each drawn before it is coded, each cost measured.",

    blurb: "Data structures and algorithms in Python, taught by pattern: the linear structures and the problems that collapse onto them, tree and graph traversal as two templates, sorting and binary search including search on the answer, recursion through memoisation to tabulation, and how to tell which paradigm a problem wants. The interview bank is part of the course.",

    published: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "4.1", "i1.1"],

    modules: [

      /* ==================================================================
         PHASE 1 — the linear structures, and the patterns that use them
         ================================================================== */
      {
        id: "patterns",
        dir: "01_patterns",
        short: "P1",
        phase: "Phase 1 · Linear structures",
        title: "Patterns on Arrays, Hashes and Stacks",
        blurb: "The three structures that most interview questions reduce to, each taught as the pattern it enables rather than as an API.",
        outcome: "You can recognise a two-pointer, a counting or a monotonic-stack problem from its statement, and say what each costs.",
        lessons: [
          { id: "1.1", title: "Arrays, Strings and Two Pointers", difficulty: "core", minutes: 38, tier: "must",
            summary: "The pattern behind a third of interview questions, with the Python-specific pitfall that slicing copies.",
            keywords: ["two pointer", "sliding window", "array", "string", "in-place"] },
          { id: "1.2", title: "Hash Maps, Sets and Counting", difficulty: "core", minutes: 34, tier: "must",
            summary: "Trading space for time, Counter as a weapon, and the problems that collapse to one dict pass.",
            keywords: ["hash map", "counter", "frequency", "set", "lookup"] },
          { id: "1.3", title: "Stacks, Queues and Heaps", difficulty: "core", minutes: 36, tier: "must",
            summary: "deque and heapq in anger — monotonic stacks, top-k, and scheduling problems.",
            keywords: ["stack", "queue", "deque", "heapq", "priority queue", "monotonic", "top-k"] },
          { id: "1.4", title: "Sliding Window, Fixed and Variable", difficulty: "core", minutes: 34, tier: "must",
            summary: "Fixed and variable windows, the invariant each maintains, and why the variable window is O(n) despite a nested loop — measured.",
            keywords: ["sliding window", "substring", "subarray", "invariant"] },
          { id: "1.5", title: "Prefix Sums and Difference Arrays", difficulty: "core", minutes: 30, tier: "must",
            summary: "Range sums in O(1) after O(n) work, subarray-sum-equals-k with a hash of prefixes, and difference arrays for range updates.",
            keywords: ["prefix sum", "difference array", "subarray sum", "range query"] },
          { id: "1.6", title: "Linked Lists", difficulty: "core", minutes: 32, tier: "should",
            summary: "Pointer manipulation without losing nodes: reversal, fast and slow pointers, merging, and the dummy head — and why Python lists usually win anyway.",
            keywords: ["linked list", "fast slow pointer", "floyd", "reverse", "dummy node"] },
          { id: "1.7", title: "Intervals and the Sweep Line", difficulty: "core", minutes: 32, tier: "must",
            summary: "Merge, insert and count overlaps by sorting endpoints; meeting rooms as a sweep with a heap.",
            keywords: ["intervals", "merge intervals", "sweep line", "meeting rooms", "events"] }
        ]
      },

      /* ==================================================================
         PHASE 2 — the non-linear structures, and search
         ================================================================== */
      {
        id: "nonlinear",
        dir: "02_nonlinear",
        short: "P2",
        phase: "Phase 2 · Trees, graphs and search",
        title: "Traversal and Search",
        blurb: "Two traversal templates cover nearly every tree and graph question, and binary search is more useful on an answer space than on an array.",
        outcome: "You can write BFS and DFS from memory and spot when the search space, not the array, is what to binary search.",
        lessons: [
          { id: "2.1", title: "Trees, Graphs and Traversal", difficulty: "advanced", minutes: 42, tier: "must",
            summary: "BFS and DFS as one template each, recursion against an explicit stack, and cycle detection.",
            keywords: ["tree", "graph", "bfs", "dfs", "traversal", "topological", "cycle"] },
          { id: "2.2", title: "Sorting, Searching and Binary Search", difficulty: "core", minutes: 34, tier: "must",
            summary: "Timsort, sort keys, bisect, and binary search on the answer rather than on an array.",
            keywords: ["sort", "timsort", "binary search", "bisect", "key", "search space"] },
          { id: "2.3", title: "Shortest Paths", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "BFS for unit weights, Dijkstra with heapq, 0-1 BFS, and Bellman-Ford for negative edges — each measured, with the case that breaks Dijkstra.",
            keywords: ["dijkstra", "shortest path", "bellman-ford", "0-1 bfs", "heapq"] },
          { id: "2.4", title: "Union-Find", difficulty: "core", minutes: 30, tier: "must",
            summary: "Disjoint sets with path compression and union by rank, measured against naive merging; connectivity, cycles and counting components.",
            keywords: ["union find", "disjoint set", "dsu", "path compression", "connected components"] },
          { id: "2.5", title: "Topological Order and DAG Dynamic Programming", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Kahn's algorithm and DFS ordering, cycle detection, and longest paths and counting on a DAG.",
            keywords: ["topological sort", "kahn", "dag", "course schedule", "longest path"] },
          { id: "2.6", title: "Tries and String Search", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Tries for prefixes, KMP and rolling hashes for substring search — and when str.find is already the answer.",
            keywords: ["trie", "prefix tree", "kmp", "rabin-karp", "rolling hash", "string search"] },
          { id: "2.7", title: "Minimum Spanning Trees", difficulty: "advanced", minutes: 30, tier: "could",
            summary: "Kruskal with union-find and Prim with a heap, the cut property that makes greedy correct, and where MSTs appear in practice.",
            keywords: ["minimum spanning tree", "kruskal", "prim", "cut property", "greedy"] }
        ]
      },

      /* ==================================================================
         PHASE 3 — recursion, DP, and choosing
         ================================================================== */
      {
        id: "recursion",
        dir: "03_recursion",
        short: "P3",
        phase: "Phase 3 · Recursion and DP",
        title: "Recursion, DP and Choosing a Paradigm",
        blurb: "The march from brute force to memoised to tabulated as a repeatable method, then the question that comes before all of it: which paradigm does this problem want.",
        outcome: "You can take a problem from brute force to a tabulated solution by method rather than by recognition, and justify the paradigm you chose.",
        lessons: [
          { id: "3.1", title: "Recursion, Backtracking and Dynamic Programming", difficulty: "advanced", minutes: 44, tier: "must",
            summary: "From brute force to memoised to tabulated, with a repeatable method rather than pattern recognition.",
            keywords: ["backtracking", "dp", "memoization", "tabulation", "state", "subproblem"] },
          { id: "3.2", title: "Algorithm Paradigms: Choosing the Approach", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "Brute force, divide and conquer, greedy, dynamic programming, backtracking and randomised algorithms — each with its signature problem and the case where it fails — plus the decision guide.",
            keywords: ["brute force", "divide and conquer", "greedy", "dynamic programming", "backtracking", "randomized", "monte carlo", "n-queens", "coin change", "merge sort", "paradigm"] },
          { id: "3.3", title: "DP on Sequences: LIS, LCS and Edit Distance", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "Three classic sequence DPs, the state each needs, and LIS in O(n log n) with bisect — measured against the quadratic version.",
            keywords: ["longest increasing subsequence", "lcs", "edit distance", "levenshtein", "sequence dp"] },
          { id: "3.4", title: "Knapsack and Subset Problems", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "0/1 and unbounded knapsack, subset sum and coin change as one family, and the space reduction to a single row.",
            keywords: ["knapsack", "subset sum", "coin change", "partition", "1d dp"] },
          { id: "3.5", title: "DP on Grids and Trees", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Paths and obstacles on grids, and DP over a tree with post-order: the house-robber-on-a-tree pattern.",
            keywords: ["grid dp", "unique paths", "tree dp", "post-order", "house robber"] },
          { id: "3.6", title: "Bit Manipulation and Bitmask DP", difficulty: "advanced", minutes: 32, tier: "could",
            summary: "Bit tricks that actually appear, subsets as integers, and travelling salesman on 15 cities by bitmask DP.",
            keywords: ["bit manipulation", "bitmask", "xor", "tsp", "subset enumeration"] },
          { id: "3.7", title: "Greedy, with Proof", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Interval scheduling, jump game and task scheduling, the exchange argument that proves a greedy choice, and the counterexample that disproves one.",
            keywords: ["greedy", "exchange argument", "interval scheduling", "jump game", "proof"] }
        ]
      },

      /* ==================================================================
         PHASE 4 — range structures and the cost of Python itself
         ================================================================== */
      {
        id: "advanced",
        dir: "05_advanced",
        short: "P4",
        phase: "Phase 4 · Range queries and constant factors",
        title: "Range Structures and Python Performance",
        blurb: "The structures that answer range questions in logarithmic or constant time, and the constant factors that decide which O(n log n) wins in Python.",
        outcome: "You can choose between prefix sums, a Fenwick tree, a segment tree and a sparse table, and predict which Python implementation is fast before timing it.",
        lessons: [
          { id: "4.1", title: "Segment Trees and Fenwick Trees", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "Range queries with point updates in O(log n): a Fenwick tree in twelve lines, a segment tree for min and max, measured against recomputation.",
            keywords: ["segment tree", "fenwick tree", "binary indexed tree", "range query", "point update"] },
          { id: "4.2", title: "Python's Constant Factors", difficulty: "core", minutes: 30, tier: "must",
            summary: "What big-O hides in Python: list against deque, dict against list lookup, recursion limits, and the built-ins that run in C — all timed.",
            keywords: ["python performance", "constant factor", "deque", "recursion limit", "built-ins"] },
          { id: "4.3", title: "Monotonic Queues and Sparse Tables", difficulty: "advanced", minutes: 32, tier: "could",
            summary: "Sliding-window maximum in O(n) with a monotonic deque, and O(1) range-minimum queries after O(n log n) preprocessing.",
            keywords: ["monotonic queue", "sliding window maximum", "sparse table", "rmq"] }
        ]
      },
      /* ==================================================================
         THE LADDER — graded problems across the course
         ================================================================== */
      {
        id: "ladder",
        dir: "06_ladder",
        short: "LD",
        phase: "The Ladder",
        title: "The Problem Ladder",
        blurb: "Graded problems from easy to hard, each tagged with the pattern lesson that answers it, with hints and tested solutions folded away.",
        outcome: "You can solve a problem you have not seen by naming its pattern first, and you know where your ladder stops.",
        lessons: [
          { id: "5.1", title: "The Ladder: Linear Patterns", difficulty: "core", minutes: 60, tier: "must",
            summary: "Twelve graded problems on arrays, hashes, windows, stacks and intervals — easy to hard, each with a hint and a tested solution.",
            keywords: ["practice", "problems", "ladder", "arrays", "two pointers"] },
          { id: "5.2", title: "The Ladder: Graphs, Search and DP", difficulty: "advanced", minutes: 60, tier: "must",
            summary: "Twelve graded problems on traversal, shortest paths, binary search on the answer and dynamic programming, each with a hint and a tested solution.",
            keywords: ["practice", "problems", "ladder", "graphs", "dynamic programming"] }
        ]
      },
      /* ==================================================================
         INTERVIEW TRACK
         ================================================================== */
      {
        id: "iv_dsa",
        dir: "04_interview",
        short: "IV",
        phase: "Interview",
        track: "interview",
        title: "Interview: Data Structures & Algorithms",
        blurb: "The questions, with the answers folded away — next to the patterns in this course that answer them.",
        outcome: "You can answer the standard algorithmic questions out loud, with the complexity and the trade-off, not only the solution.",
        lessons: [
          { id: "i1.1", title: "Data Structures & Algorithms", difficulty: "core", minutes: 40, tier: "must",
            summary: "25 interview questions, answers hidden until you ask for them.",
            keywords: ["dsa", "algorithms", "complexity"] }
        ]
      }
    ]
  });
})();

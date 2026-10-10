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

    published: ["1.1", "1.2", "1.3", "2.1", "2.2", "3.1", "3.2", "i1.1"],

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
            keywords: ["stack", "queue", "deque", "heapq", "priority queue", "monotonic", "top-k"] }
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
            keywords: ["sort", "timsort", "binary search", "bisect", "key", "search space"] }
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
            keywords: ["brute force", "divide and conquer", "greedy", "dynamic programming", "backtracking", "randomized", "monte carlo", "n-queens", "coin change", "merge sort", "paradigm"] }
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
          { id: "i1.1", title: "Data Structures & Algorithms", difficulty: "core", minutes: 46, tier: "must",
            summary: "29 interview questions, answers hidden until you ask for them.",
            keywords: ["dsa", "algorithms", "complexity"] }
        ]
      }
    ]
  });
})();

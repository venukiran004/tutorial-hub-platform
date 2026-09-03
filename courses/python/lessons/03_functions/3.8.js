/* ============================================================================
   LESSON 3.8 — Recursion, and Its Limits in Python
   ========================================================================= */
EC.receiveLesson({
  id: "3.8",

  lede: "Recursion is the right tool for a narrow, real set of problems — anything shaped like a tree. It is also the tool people reach for when iteration would be simpler, and Python punishes that more than most languages: **there is no tail-call optimisation and the stack limit is about 1000 frames.** This lesson covers when recursion genuinely wins, and how to convert it away when it does not.",

  objectives: [
    "Write a correct recursive function by identifying its base case first",
    "Explain what the call stack costs and why Python limits its depth",
    "State why Python has no tail-call optimisation and what that rules out",
    "Convert a recursive function to an iterative one with an explicit stack",
    "Choose recursion deliberately rather than by habit"
  ],

  prerequisites: ["3.1", "3.3"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "Base case first", id: "base-case" },

    { t: "p", text: "Every recursive function has two parts, and writing them in the wrong order is why recursion feels hard. **The base case is the one that stops.** Write it first, and the recursive case usually falls out." },

    { t: "code", lang: "python", title: "the shape", code: `
def countdown(n: int) -> None:
    if n <= 0:              # 1. BASE CASE -- when do we stop?
        print("done")
        return

    print(n)
    countdown(n - 1)        # 2. RECURSIVE CASE -- same problem, smaller


countdown(3)
`,
      out: `3
2
1
done`
    },

    { t: "callout", kind: "mental", title: "The three questions", body: [
      { t: "ol", items: [
        "**What is the smallest input, and what is the answer for it?** That is the base case.",
        "**How do I make the problem smaller?** Every recursive call must move measurably toward the base case, or you have infinite recursion.",
        "**Assuming the recursive call works, how do I build my answer from it?** Do not trace the whole tree in your head — trust the call and combine."
      ]},
      { t: "p", text: "The third is the leap people find hard. You do not need to simulate the recursion; you need to assume it is correct for a smaller input and write the one step that combines. If the base case is right and each call gets smaller, the induction holds." }
    ]},

    { t: "code", lang: "python", title: "where recursion genuinely wins: trees", code: `
def total_size(node: dict) -> int:
    """Sum file sizes in a directory tree of arbitrary depth."""
    if node["type"] == "file":                  # base: a leaf
        return node["size"]

    return sum(total_size(child) for child in node["children"])


tree = {
    "type": "dir", "children": [
        {"type": "file", "size": 100},
        {"type": "dir", "children": [
            {"type": "file", "size": 50},
            {"type": "file", "size": 25},
        ]},
    ],
}
print(total_size(tree))
`,
      out: `175`,
      caption: "The iterative version needs an explicit stack and a loop; the recursive version is four lines and reads like the definition of the problem. **Recursion wins when the data is recursive** — trees, nested JSON, filesystems, expression parsing, the DOM."
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "What the stack costs", id: "the-stack" },

    { t: "viz",
      title: "One frame per pending call",
      caption: "Each call pushes a frame holding its locals, arguments and return address. The frames cannot be freed until the calls return, so recursion depth is memory — and Python caps it deliberately, because exhausting the real C stack would segfault the interpreter rather than raise.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="Diagram: a call stack growing with each recursive call, then unwinding as calls return">
  <defs>
    <marker id="a15" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em">GROWING — each call pushes a frame</text>

  <rect x="20" y="36" width="180" height="26" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="34" y="54" class="s-mono" style="font-size:10px">countdown(3)   n=3</text>
  <rect x="40" y="66" width="180" height="26" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="54" y="84" class="s-mono" style="font-size:10px">countdown(2)   n=2</text>
  <rect x="60" y="96" width="180" height="26" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="74" y="114" class="s-mono" style="font-size:10px">countdown(1)   n=1</text>
  <rect x="80" y="126" width="180" height="26" rx="5" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
  <text x="94" y="144" class="s-mono" style="font-size:10px;fill:var(--good)">countdown(0)   BASE</text>

  <path d="M270 49 L270 139" style="stroke:var(--border-strong);fill:none" stroke-width="1.5" marker-end="url(#a15)"/>
  <text x="284" y="94" class="s-sub">4 frames alive</text>
  <text x="284" y="110" class="s-sub">at peak depth</text>

  <line x1="20" y1="170" x2="880" y2="170" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="196" class="s-sub" style="font-weight:700;letter-spacing:.08em">THE LIMIT</text>
  <rect x="20" y="208" width="400" height="58" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <text x="36" y="228" class="s-mono" style="font-size:10.5px">sys.getrecursionlimit()  ->  1000</text>
  <text x="36" y="246" class="s-sub">exceed it and Python raises RecursionError --</text>
  <text x="36" y="260" class="s-sub">deliberately, before the real C stack overflows</text>

  <rect x="440" y="36" width="440" height="120" rx="9" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="456" y="58" class="s-sub" style="fill:var(--ink-2);font-weight:600">Why a Python frame is expensive</text>
  <text x="456" y="80" class="s-sub">Each frame is a heap-allocated object holding locals, the</text>
  <text x="456" y="96" class="s-sub">argument values, a reference to the code object and the</text>
  <text x="456" y="112" class="s-sub">return address — hundreds of bytes, not a few words.</text>
  <text x="456" y="136" class="s-sub" style="fill:var(--warn)">A loop reuses one frame. Recursion allocates n of them.</text>

  <rect x="440" y="208" width="440" height="58" rx="8" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="456" y="228" class="s-sub" style="fill:var(--crit);font-weight:600">No tail-call optimisation</text>
  <text x="456" y="248" class="s-sub">Even when the recursive call is the last thing a function does,</text>
  <text x="456" y="262" class="s-sub">Python keeps the frame. Deep recursion always costs memory.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the limit is real and it is low", code: `
import sys

print(sys.getrecursionlimit())


def depth(n: int = 0) -> int:
    return depth(n + 1)


try:
    depth()
except RecursionError as exc:
    print(exc)
`,
      out: `1000
maximum recursion depth exceeded`
    },

    { t: "callout", kind: "warn", title: "Raising the limit is almost never the fix", body: [
      { t: "code", lang: "python", title: "what it actually does", numbered: false, code: `
import sys
sys.setrecursionlimit(100_000)     # tempting, and dangerous`},
      { t: "p", text: "The limit exists to raise `RecursionError` **before** the real C stack overflows. Past the point the C stack can hold, you do not get an exception — you get a segfault, which kills the process with no traceback, no logging and no chance to clean up." },
      { t: "p", text: "The safe uses are narrow: a known-deep but bounded structure, with a modest increase and a measured thread stack size. **If you do not know the maximum depth, raising the limit converts a catchable error into a crash.** Convert to iteration instead." }
    ]},

    { t: "callout", kind: "insight", title: "Why Python has no tail-call optimisation", body: [
      { t: "p", text: "A tail call is a recursive call that is the **last** thing a function does. Languages like Scheme reuse the current frame for it, so tail-recursive functions run in constant stack space. Python does not, and the omission is deliberate." },
      { t: "p", text: "Guido van Rossum's stated reasoning: eliminating frames destroys the traceback. Python's stack traces are one of its best debugging features, and a tail-call-optimised recursion would report a single frame with no history of how it got there. He also considers explicit loops clearer than recursion for the cases TCO would help with." },
      { t: "p", text: "**The practical consequence:** rewriting a recursive function into tail-recursive form buys you nothing in Python. If depth is the problem, the answer is a loop or an explicit stack, not a restructured recursion." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Converting recursion to iteration", id: "converting" },

    { t: "ladder",
      title: "Walking a directory tree",
      rungs: [
        { level: "bad", label: "Naive recursion", why: "fails on deep trees",
          code: `def find_large(node, threshold):
    results = []
    if node["type"] == "file":
        if node["size"] > threshold:
            results.append(node["path"])
    else:
        for child in node["children"]:
            results.extend(find_large(child, threshold))
    return results`,
          note: "Correct and readable, and it raises `RecursionError` on a tree deeper than about 1000 levels. Symlink loops in a real filesystem produce infinite depth, so this is not a theoretical concern." },

        { level: "ok", label: "Explicit stack", why: "unbounded depth, same traversal",
          code: `def find_large(root, threshold):
    results = []
    stack = [root]                 # the call stack, made explicit

    while stack:
        node = stack.pop()         # pop -> depth-first, like recursion
        if node["type"] == "file":
            if node["size"] > threshold:
                results.append(node["path"])
        else:
            stack.extend(node["children"])

    return results`,
          note: "The recursion is now a list you control, limited by heap rather than stack. Note the two behaviour changes: `pop()` from the end reverses sibling order, and swapping `stack.pop()` for `deque.popleft()` turns depth-first into breadth-first — which is often a useful knob the recursive version did not expose." },

        { level: "best", label: "A generator, streaming", why: "constant memory, works on any size",
          code: `from collections.abc import Iterator


def walk(root: dict) -> Iterator[dict]:
    """Yield every file node, depth-first, without building a list."""
    stack = [root]
    seen: set[int] = set()          # cycle guard for real filesystems

    while stack:
        node = stack.pop()
        if id(node) in seen:
            continue
        seen.add(id(node))

        if node["type"] == "file":
            yield node
        else:
            stack.extend(reversed(node["children"]))   # preserve order


def find_large(root: dict, threshold: int) -> Iterator[str]:
    return (n["path"] for n in walk(root) if n["size"] > threshold)`,
          note: "Three improvements at once. The traversal is reusable for any question about the tree, not just this one. Nothing accumulates, so a million-file tree uses constant memory. And the cycle guard makes it safe on a real filesystem where symlinks create loops — the case that turns the recursive version from slow into a crash. Generators are Lesson 5.7." }
      ]
    },

    { t: "callout", kind: "good", title: "The mechanical conversion", body: [
      { t: "p", text: "Any recursion can be converted, because the call stack **is** a stack:" },
      { t: "table",
        head: ["Recursive", "Iterative equivalent"],
        rows: [
          ["The call stack", "An explicit `list` used as a stack"],
          ["A recursive call", "`stack.append(smaller_problem)`"],
          ["The base case", "The `while stack:` loop condition, plus a leaf check"],
          ["Local variables per call", "Data stored alongside the item on the stack"],
          ["Return value combining", "An accumulator outside the loop"]
        ]
      },
      { t: "p", text: "The conversion is easy when the recursion does its work **before** recursing (pre-order). It is harder when work happens **after** the recursive call returns (post-order) — then you must push a marker to revisit the node, which is genuinely fiddly. That is the case where recursion earns its keep even at some risk." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Memoisation and the exponential trap", id: "memoisation" },

    { t: "code", lang: "python", title: "the classic disaster, and the one-line fix", code: `
import functools
import time


def fib_slow(n: int) -> int:
    if n < 2:
        return n
    return fib_slow(n - 1) + fib_slow(n - 2)     # recomputes the same values


@functools.lru_cache(maxsize=None)
def fib_fast(n: int) -> int:
    if n < 2:
        return n
    return fib_fast(n - 1) + fib_fast(n - 2)


start = time.perf_counter()
fib_slow(32)
print(f"no cache: {time.perf_counter() - start:.2f}s")

start = time.perf_counter()
fib_fast(32)
print(f"cached:   {time.perf_counter() - start:.6f}s")
`,
      out: `no cache: 0.42s
cached:   0.000023s`,
      caption: "`fib_slow(32)` makes over four million calls because it recomputes the same subproblems along every branch — O(2ⁿ). The cache makes each value computed once, turning it into O(n)."
    },

    { t: "callout", kind: "insight", title: "The real lesson is not about Fibonacci", body: [
      { t: "p", text: "Nobody computes Fibonacci at work. The pattern generalises: **whenever a recursive function's branches overlap, memoisation collapses exponential work to linear.** That covers edit distance, path counting, knapsack, and most of what is labelled dynamic programming (Lesson 16.6)." },
      { t: "p", text: "The diagnostic is simple: *does the recursion call itself more than once, on inputs that can coincide?* A tree walk calls itself once per child on disjoint subtrees — no overlap, no benefit from caching. Fibonacci calls itself twice on ranges that overlap almost entirely." },
      { t: "p", text: "One caution: `lru_cache(maxsize=None)` on a recursive function is unbounded, and the cache persists for the life of the process. Fine for a bounded input domain, a memory leak for an unbounded one — the failure mode from Lesson 3.6." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Choosing", id: "choosing" },

    { t: "table",
      head: ["Use recursion when", "Use iteration when"],
      rows: [
        ["The **data** is recursive — trees, nested JSON, filesystems, expression grammars", "The problem is a linear sequence"],
        ["Depth is bounded and known small — a JSON document, a parse tree", "Depth is unbounded or user-controlled"],
        ["The recursive form is dramatically clearer", "Both forms are similarly clear"],
        ["The traversal is naturally post-order", "The traversal is pre-order and converts mechanically"],
        ["Branches overlap and memoisation applies", "Input can be arbitrarily large"]
      ],
      caption: "The strongest single signal is the shape of the **data**, not the shape of the algorithm. Recursive data invites recursive code; a list does not."
    },

    { t: "code", lang: "python", title: "the cases where recursion is simply wrong", code: `
# 1. A linear sequence -- a loop is clearer and cannot overflow
def total_wrong(items, i=0):
    if i == len(items):
        return 0
    return items[i] + total_wrong(items, i + 1)   # RecursionError at ~1000

def total(items):
    return sum(items)


# 2. User-controlled depth -- an attacker chooses the recursion depth
def parse(json_text):
    return json.loads(json_text)     # deeply nested input can raise
                                     # RecursionError; validate depth first
`,
      caption: "The second case is a real denial-of-service vector: a payload nested a few thousand levels deep can crash a parser that recurses. Validate nesting depth at the boundary before parsing untrusted input."
    },

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Flatten an arbitrarily nested structure, twice",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Write a function that flattens a nested list of arbitrary depth into a flat list — recursively first, then iteratively. Then prove the difference by feeding both a structure deep enough to break one of them." }
      ],
      requirements: [
        "**Part A:** a recursive `flatten` handling any depth of nested lists, preserving order.",
        "**Part B:** an iterative version using an explicit stack, with identical output.",
        "Both must treat strings as atoms, not as iterables to descend into.",
        "Build a structure nested 2000 levels deep and show that A raises while B does not.",
        "Explain why `sys.setrecursionlimit` is the wrong response.",
        "**Part C:** make B a generator and state what that changes for a very large input."
      ],
      hint: "For the string case, remember Lesson 1.8: `str` is iterable, so a naive check descends into it forever — a one-character string contains itself. For the iterative order, popping from the end reverses siblings.",
      solution: {
        lang: "python",
        title: "flatten.py",
        code: `"""Flatten nested lists: recursive, iterative, and streaming."""

from __future__ import annotations

import sys
from collections.abc import Iterator


# ---- PART A: recursive -------------------------------------------------

def flatten_recursive(items: list) -> list:
    """Flatten any depth of nested lists. Fails past the recursion limit."""
    out: list = []
    for item in items:
        # str is iterable, so descending into it would recurse forever:
        # "ab" -> "a", "b" -> "a" -> "a" ... a one-character string
        # contains itself. Treat strings as atoms.
        if isinstance(item, (list, tuple)):
            out.extend(flatten_recursive(item))
        else:
            out.append(item)
    return out


# ---- PART B: iterative -------------------------------------------------

def flatten_iterative(items: list) -> list:
    """Same result, unbounded depth. The stack is a list we control."""
    out: list = []
    stack: list = [iter(items)]

    # Holding ITERATORS rather than raw lists preserves order without any
    # reversing, and means we never copy a sublist.
    while stack:
        try:
            item = next(stack[-1])
        except StopIteration:
            stack.pop()
            continue

        if isinstance(item, (list, tuple)):
            stack.append(iter(item))
        else:
            out.append(item)

    return out


# ---- PART C: streaming -------------------------------------------------

def flatten_lazy(items: list) -> Iterator:
    """Yield leaves one at a time. Constant memory for the OUTPUT.

    Memory is now proportional to the DEPTH of the structure rather than
    to the number of leaves -- so a billion-element flat list costs
    nothing, and only pathological nesting costs anything at all.
    """
    stack: list = [iter(items)]

    while stack:
        try:
            item = next(stack[-1])
        except StopIteration:
            stack.pop()
            continue

        if isinstance(item, (list, tuple)):
            stack.append(iter(item))
        else:
            yield item


# ---- the demonstration -------------------------------------------------

def build_deep(depth: int) -> list:
    """Build a structure nested N levels deep: [[[...[1]...]]]"""
    node: list = [1]
    for _ in range(depth):
        node = [node]
    return node


if __name__ == "__main__":
    sample = [1, [2, [3, [4]], "hello"], [[5]], 6]
    expected = [1, 2, 3, 4, "hello", 5, 6]

    assert flatten_recursive(sample) == expected
    assert flatten_iterative(sample) == expected
    assert list(flatten_lazy(sample)) == expected

    deep = build_deep(2000)
    print("limit:", sys.getrecursionlimit())

    try:
        flatten_recursive(deep)
        print("recursive: unexpectedly survived")
    except RecursionError:
        print("recursive: RecursionError at 2000 levels")

    print("iterative:", flatten_iterative(deep))
    print("lazy:     ", next(flatten_lazy(deep)))

    # WHY NOT setrecursionlimit:
    #
    # The limit exists so Python raises a CATCHABLE RecursionError before
    # the real C stack overflows. Raise it past what the C stack can hold
    # and you get a segfault -- process killed, no traceback, no logging,
    # no cleanup, nothing written to your error tracker.
    #
    # It is also a guess. You would be picking a number based on the
    # deepest input you happen to have seen, and the next input decides
    # whether your service crashes. The iterative version has no such
    # number in it.`,
        out: `limit: 1000
recursive: RecursionError at 2000 levels
iterative: [1]
lazy:      1`,
        notes: [
          { t: "p", text: "**Holding iterators on the stack rather than lists** is the detail that makes Part B clean. The obvious version pushes sublists and pops from the end, which reverses sibling order and forces a `reversed()` call to compensate. Pushing an iterator preserves position naturally: when it is exhausted, pop it and resume the one underneath — which is exactly what returning from a recursive call does." },
          { t: "p", text: "**The string check is not a detail.** `str` is iterable, and iterating a one-character string yields that same one-character string — so a naive `isinstance(item, Iterable)` recurses forever on any text. This is the Lesson 1.8 trap in its most damaging form, and it is why the check tests for `list` and `tuple` specifically rather than for iterability." },
          { t: "p", text: "**Part C changes what the memory is proportional to.** All three versions hold the traversal state; only the eager ones also hold every leaf. `flatten_lazy` uses memory proportional to *depth*, not to *size* — so a flat list of a billion elements costs almost nothing, and only genuinely pathological nesting is expensive." },
          { t: "callout", kind: "insight", title: "The argument against raising the limit, stated precisely", body: [
            { t: "p", text: "Two separate objections. First, `RecursionError` is a catchable exception thrown *before* the C stack overflows; past that point you get a segfault, which is unrecoverable and leaves no evidence. Second, any limit you choose is a guess about input you have not seen yet." },
            { t: "p", text: "The iterative version contains no such number. That is the real advantage — not that it is faster, but that it removes a parameter you would otherwise have to keep being right about." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "An API endpoint accepts JSON and crashes with `RecursionError` on a request from an unfamiliar client. The payload is small — a few kilobytes — but nested several thousand levels deep. The process returns 500s until it is restarted." },
      { t: "p", text: "**This is a denial-of-service vector, not a bug in the parser.** Most JSON parsers, including Python's, recurse per nesting level, so a payload of `[[[[...]]]]` a few kilobytes long can exhaust the stack. The attacker controls the recursion depth of your service." },
      { t: "p", text: "**The fix is at the boundary, before parsing.** Cap the request body size, and validate nesting depth — either with a parser that enforces a maximum depth, or by rejecting payloads whose bracket nesting exceeds a threshold. Pydantic and most schema validators can bound this, and Lesson 12.3 covers validating at the edge." },
      { t: "p", text: "The general principle: **any recursion whose depth is chosen by an untrusted caller is an availability risk.** File paths, XML, JSON, deeply chained ORM relations and user-supplied expression trees all qualify. Bound the depth explicitly rather than relying on the interpreter's limit to be a safe default." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**Write the base case first.** Then make the problem smaller, then assume the recursive call works and combine — do not trace the tree in your head.",
    "Recursion wins when the **data** is recursive: trees, nested JSON, filesystems, expression grammars. A linear sequence is a loop.",
    "Each call allocates a heap frame holding locals and arguments. **The default limit is about 1000**, and it exists so Python raises a catchable `RecursionError` before the C stack overflows.",
    "**Raising `sys.setrecursionlimit` is almost never the fix.** Past what the C stack holds you get a segfault — no traceback, no logging, no cleanup — and any limit you pick is a guess about future input.",
    "**Python has no tail-call optimisation**, deliberately: eliminating frames would destroy tracebacks. Restructuring into tail-recursive form buys nothing.",
    "Any recursion converts to iteration, because **the call stack is a stack**. Push sub-problems onto an explicit list; the `while stack:` loop replaces the base case.",
    "Pushing **iterators** rather than sublists preserves sibling order naturally and avoids copying.",
    "Pre-order recursion converts mechanically; post-order needs a revisit marker and is genuinely fiddly — that is where recursion earns its keep.",
    "**Memoisation collapses exponential recursion to linear** whenever branches overlap. A tree walk has no overlap and gains nothing.",
    "`str` is iterable and a one-character string contains itself — check for `list`/`tuple` specifically, never for bare iterability.",
    "**Any recursion whose depth an untrusted caller controls is a denial-of-service vector.** Bound nesting depth at the boundary."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does Python not implement tail-call optimisation?",
        options: [
          "It is technically impossible in a dynamically typed language",
          "It is a deliberate design choice — eliminating frames would destroy the traceback, and explicit loops are considered clearer",
          "It is implemented but disabled by default for compatibility",
          "The GIL prevents the necessary stack manipulation"
        ],
        answer: 1,
        why: "Guido van Rossum has stated the reasoning explicitly: Python's stack traces are one of its most valuable debugging features, and a tail-call-optimised recursion would report a single frame with no history of how execution got there. He also considers a loop clearer than recursion for the cases TCO would help. The practical consequence is that restructuring a function into tail-recursive form buys nothing in Python — if depth is the problem, use iteration."
      },
      {
        stem: "A recursive tree walk raises `RecursionError` on deep input. What is the right response?",
        options: [
          "Call `sys.setrecursionlimit(50_000)` to allow deeper recursion",
          "Convert to iteration with an explicit stack, which has no depth limit and no number to guess",
          "Add `@lru_cache` to reduce the number of calls",
          "Increase the thread stack size and keep the recursion"
        ],
        answer: 1,
        why: "The recursion limit exists so Python raises a catchable exception *before* the real C stack overflows — past that point you get a segfault with no traceback, no logging and no cleanup. Any limit you set is also a guess about input you have not seen. An explicit stack is bounded by heap rather than stack and contains no such number. Caching helps only when branches overlap, which a tree walk's disjoint subtrees do not."
      },
      {
        stem: "Why does a naive `flatten` that checks `isinstance(item, Iterable)` recurse forever on strings?",
        options: [
          "Strings are immutable, so the recursion cannot make progress",
          "`str` is iterable, and iterating a one-character string yields that same one-character string — the input never gets smaller",
          "Strings raise `StopIteration` inconsistently",
          "It does not; strings are not iterable in Python 3"
        ],
        answer: 1,
        why: "`\"ab\"` iterates to `\"a\"` and `\"b\"`, and `\"a\"` iterates to `\"a\"` — a one-character string contains itself, so the recursive case never reaches a base case. This is the `str`-is-iterable trap from Lesson 1.8 in its most damaging form. The fix is to check for the container types you actually mean, `list` and `tuple`, rather than for iterability in general."
      },
      {
        stem: "When does adding `@lru_cache` to a recursive function help?",
        options: [
          "Always — caching reduces the number of stack frames",
          "When the recursion calls itself more than once on inputs that can coincide, so subproblems are recomputed",
          "Only for functions returning immutable values",
          "When the recursion depth exceeds the default limit"
        ],
        answer: 1,
        why: "Memoisation collapses exponential work to linear precisely when branches overlap — Fibonacci calls itself twice on ranges that almost entirely coincide. A tree walk recurses once per child on disjoint subtrees, so nothing is ever recomputed and the cache is pure overhead. Caching also does nothing about depth: `fib(5000)` still exceeds the recursion limit, cached or not."
      }
    ]
  },

  /* ==================================================================== */
  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you use recursion in Python?",
        strong: "When the data is recursive — trees, nested JSON, filesystems, expression grammars — and the depth is bounded and known small. For linear sequences a loop is clearer and cannot overflow. Python's default limit is about 1000 frames and there is no tail-call optimisation, so deep recursion is a real constraint rather than a theoretical one.",
        answer: [
          { t: "p", text: "The framing that carries weight is that the decision follows the **shape of the data**, not the shape of the algorithm. Recursive data invites recursive code; a list does not." },
          { t: "p", text: "Mentioning the absence of TCO unprompted signals you have hit this in practice — and that you know restructuring into tail-recursive form is not a workaround in Python." },
          { t: "p", text: "A good closing point: post-order traversals, where work happens after the recursive call returns, are genuinely awkward to write iteratively. That is where recursion earns its keep even at some risk." }
        ]
      },
      {
        level: "core",
        q: "How would you convert a recursive function to an iterative one?",
        strong: "Make the call stack explicit. Push sub-problems onto a list, loop `while stack:`, and pop one at a time. The base case becomes the loop condition plus a leaf check, and per-call locals travel alongside the item on the stack.",
        answer: [
          { t: "p", text: "The insight underneath is worth stating: the conversion is always possible because the call stack *is* a stack — you are replacing an implicit structure with one you control." },
          { t: "p", text: "A detail that shows you have written it: pushing **iterators** rather than sublists preserves sibling order naturally. Pushing lists and popping from the end reverses order and needs a compensating `reversed()`." },
          { t: "p", text: "Being honest about the hard case adds credibility — pre-order converts mechanically, post-order needs a marker to revisit a node after its children, and that is fiddly enough to be worth avoiding when depth is genuinely bounded." }
        ]
      },
      {
        level: "advanced",
        q: "An endpoint crashes with RecursionError on a small but deeply nested JSON payload. What is going on?",
        strong: "A denial-of-service vector. JSON parsers recurse per nesting level, so a few kilobytes of `[[[[...]]]]` can exhaust the stack. The attacker controls your recursion depth. The fix is at the boundary — cap body size and validate nesting depth before parsing.",
        answer: [
          { t: "p", text: "Recognising it as a security issue rather than a parser bug is the whole answer. Interviewers are checking whether you connect \"untrusted input\" to \"resource consumption\"." },
          { t: "p", text: "The generalisation is worth offering: any recursion whose depth an untrusted caller controls is an availability risk. XML, file paths, chained ORM relations and user-supplied expression trees all have the same shape." },
          { t: "p", text: "It is also a good place to explain why raising the recursion limit would make things worse — it converts a catchable `RecursionError` into a segfault, so instead of a 500 you get a dead process with no traceback and no log line." }
        ],
        weak: "Treating it as a bug to fix by raising the recursion limit or catching `RecursionError`. Catching it is better than crashing, but it leaves the endpoint burning CPU on hostile input and does not address the resource-consumption problem."
      }
    ]
  }
});

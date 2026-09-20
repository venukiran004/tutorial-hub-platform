/* ============================================================================
   LESSON 15.1 — NumPy and the Vectorised Mindset
   ========================================================================= */
EC.receiveLesson({
  id: "15.1",

  lede: "NumPy is not a faster list. **It is a different memory model** — one contiguous block of one type, operated on by compiled loops you never see. Every performance surprise, every dtype error and every mysterious aliasing bug follows from that one fact, and once you hold it the rest is notation.",

  objectives: [
    "Explain why an ndarray is fast, in terms of memory rather than magic",
    "Choose dtypes deliberately, and recognise silent overflow",
    "Use broadcasting rather than reshaping by hand",
    "Tell a view from a copy, and predict which you have",
    "Replace a loop with an expression that says the same thing"
  ],

  prerequisites: ["10.3"],

  blocks: [

    { t: "h2", n: "01", text: "Why it is fast", id: "why" },

    { t: "viz",
      title: "A Python list and a NumPy array in memory",
      caption: "The list holds pointers to objects scattered across the heap; each element carries a type tag, a reference count and a value. The array holds the values themselves, adjacent, with one dtype for all of them.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Memory layout of a Python list of ints compared with a NumPy int64 array">
  <text x="24" y="30" class="s-label" style="fill:var(--crit)">list [1, 2, 3, 4]</text>
  <g class="s-sub">
    <rect x="24" y="44" width="240" height="30" rx="4" style="fill:var(--surface-2);stroke:var(--border)"/>
    <text x="34" y="64">ptr · ptr · ptr · ptr</text>
    <rect x="300" y="44" width="130" height="30" rx="4" style="fill:var(--surface-3);stroke:var(--border)"/>
    <text x="310" y="64">PyLongObject 1</text>
    <rect x="450" y="88" width="130" height="30" rx="4" style="fill:var(--surface-3);stroke:var(--border)"/>
    <text x="460" y="108">PyLongObject 2</text>
    <rect x="300" y="132" width="130" height="30" rx="4" style="fill:var(--surface-3);stroke:var(--border)"/>
    <text x="310" y="152">PyLongObject 3</text>
    <rect x="620" y="44" width="130" height="30" rx="4" style="fill:var(--surface-3);stroke:var(--border)"/>
    <text x="630" y="64">PyLongObject 4</text>
    <path d="M60 74 L320 88" style="stroke:var(--border-strong)" fill="none"/>
    <path d="M120 74 L470 132" style="stroke:var(--border-strong)" fill="none"/>
    <path d="M180 74 L330 176" style="stroke:var(--border-strong)" fill="none"/>
    <path d="M240 74 L640 88" style="stroke:var(--border-strong)" fill="none"/>
  </g>
  <text x="24" y="196" class="s-sub" style="fill:var(--ink-3)">~28 bytes per int, scattered · a pointer chase per element · a type check per operation</text>

  <text x="24" y="238" class="s-label" style="fill:var(--good)">np.array([1,2,3,4], dtype=int64)</text>
  <g>
    <rect x="24" y="252" width="64" height="30" rx="3" style="fill:var(--good);opacity:.2;stroke:var(--good)"/>
    <rect x="88" y="252" width="64" height="30" rx="3" style="fill:var(--good);opacity:.2;stroke:var(--good)"/>
    <rect x="152" y="252" width="64" height="30" rx="3" style="fill:var(--good);opacity:.2;stroke:var(--good)"/>
    <rect x="216" y="252" width="64" height="30" rx="3" style="fill:var(--good);opacity:.2;stroke:var(--good)"/>
    <text x="56" y="272" text-anchor="middle" class="s-sub">1</text>
    <text x="120" y="272" text-anchor="middle" class="s-sub">2</text>
    <text x="184" y="272" text-anchor="middle" class="s-sub">3</text>
    <text x="248" y="272" text-anchor="middle" class="s-sub">4</text>
  </g>
  <text x="310" y="272" class="s-sub" style="fill:var(--ink-3)">8 bytes each, contiguous · one type for all · SIMD-friendly · cache-friendly</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the speedup, and where it actually comes from", code: `
import numpy as np

n = 10_000_000
py_list = list(range(n))
arr = np.arange(n)

# Python loop: 10M interpreter iterations, 10M type checks, 10M
# object allocations for the results.
sum(x * 2 for x in py_list)          # ~1.8 s

# NumPy: one call into compiled code, one contiguous pass, SIMD
# instructions processing several elements per cycle.
arr * 2                              # ~15 ms   (~120x)

# THE SPEEDUP IS NOT "NUMPY IS OPTIMISED". It is three things:
#   1. no interpreter overhead per element
#   2. no per-element type check -- the dtype is known once
#   3. contiguous memory, so the CPU prefetcher and cache work

# Which is why THIS is slow, despite being NumPy:
total = 0
for x in arr:                        # ~2.5 s -- SLOWER than the list
    total += x
# Each iteration boxes an int64 into a Python object. You pay
# NumPy's indexing cost AND the interpreter's.

arr.sum()                            # ~8 ms
`,
      hl: [12, 20, 25],
      caption: "**A Python loop over a NumPy array is the worst of both worlds.** If you are iterating element by element, you have not vectorised — you have added a layer."
    },

    { t: "h2", n: "02", text: "dtypes", id: "dtypes" },

    { t: "code", lang: "python", title: "the type is a decision, not a detail", code: `
# Memory is dtype x count. On a 100M-element array:
np.zeros(100_000_000, dtype=np.float64)   # 800 MB
np.zeros(100_000_000, dtype=np.float32)   # 400 MB
np.zeros(100_000_000, dtype=np.int8)      #  100 MB

# SILENT OVERFLOW. NumPy uses fixed-width integers, so unlike Python
# ints they wrap around -- with a warning at most, and none at all
# inside an operation.
a = np.array([127], dtype=np.int8)
a + 1                                     # array([-128])  <- wrapped

counts = np.array([2_000_000_000], dtype=np.int32)
counts * 2                                # -294967296

# The fix is to choose a width that fits, and to check when the data
# is untrusted:
np.iinfo(np.int32).max                    # 2147483647
np.finfo(np.float32).eps                  # 1.19e-07

# FLOAT PRECISION. float32 has ~7 significant digits.
np.float32(16_777_216) + np.float32(1)    # 16777216.0 -- unchanged
# Summing a million float32 values accumulates visible error; NumPy's
# .sum() uses pairwise summation to limit it, but a manual loop does
# not.

# THE dtype THAT SIGNALS A MISTAKE:
np.array([1, "two", 3.0])                 # dtype('<U32') -- STRINGS
# Every element became a string. Arithmetic now fails, or worse,
# concatenates. Check dtype after loading external data, always.
`,
      hl: [10, 17, 27],
      caption: "**`dtype=object` and `dtype='<U32'` both mean the array is not doing what you think.** Every operation falls back to Python objects, and the speed advantage is gone."
    },

    { t: "callout", kind: "tradeoff", title: "float32 or float64", body: [
      { t: "table",
        head: ["", "float32", "float64"],
        rows: [
          ["Memory", "**Half**", "Baseline"],
          ["Significant digits", "~7", "~16"],
          ["Speed on CPU", "Similar to 2× faster", "Baseline"],
          ["Speed on GPU", "**Often 2–8× faster**", "Baseline"],
          ["Right for", "**ML features, images, embeddings**", "Money, accumulations, scientific work"]
        ]
      },
      { t: "p", text: "**Machine learning almost always uses float32**, and often less. Model weights carry far more noise than seven digits of precision, so the extra bits buy nothing and cost half your memory bandwidth — which is usually the bottleneck." },
      { t: "p", text: "**Never use floats of any width for money** (Lesson 13.2). The failure is not precision loss in the abstract; it is a penny that does not reconcile." }
    ]},

    { t: "h2", n: "03", text: "Broadcasting", id: "broadcasting" },

    {"kind": "cells", "title": "Broadcasting stretches the smaller shape", "caption": "Shapes are compared from the right; a dimension of 1 is stretched to match. (3, 4) + (4,) works; (3, 4) + (3,) does not, because 4 and 3 disagree — reshape to (3, 1) first.", "items": ["(3, 4)", "+ (4,)", "→ (3, 4)", "·", "(3, 4)", "+ (3, 1)", "→ (3, 4)"], "highlight": [2, 6], "negative": false, "tone": "good", "label": "(3, 4) + (3,) → ValueError: operands could not be broadcast", "t": "diagram", "id": "dg-15_1-03-0"},


    { t: "code", lang: "python", title: "the rule, and reading it off the shapes", code: `
# THE RULE: compare shapes from the RIGHT. Two dimensions are
# compatible if they are equal, or one of them is 1.
#
#   (3, 4)  +  (4,)     ->  (3, 4)    the (4,) is used for each row
#   (3, 4)  +  (3, 1)   ->  (3, 4)    the column is used for each col
#   (3, 4)  +  (3,)     ->  ERROR     4 vs 3, neither is 1
#   (5, 1, 3) + (4, 3)  ->  (5, 4, 3)

prices = np.array([[10., 20., 30.],       # (3, 3): rows are orders
                   [15., 25., 35.],
                   [12., 22., 32.]])

# Per-COLUMN adjustment: shape (3,) aligns with the last axis.
tax = np.array([1.20, 1.19, 1.00])
prices * tax                              # each column scaled

# Per-ROW adjustment: reshape to (3, 1) so it aligns with axis 0.
discount = np.array([0.9, 0.95, 1.0])
prices * discount[:, np.newaxis]          # each ROW scaled
# discount[:, None] is the same thing, and more common in practice.

# WHAT BROADCASTING DOES NOT DO: allocate. The (4,) is not copied
# into a (3, 4) -- NumPy iterates with a stride of 0 on that axis.
# So broadcasting is free in memory as well as in code.

# The classic use: all pairwise differences, with no loop.
points = np.random.rand(1000, 3)
diffs = points[:, None, :] - points[None, :, :]   # (1000, 1000, 3)
dists = np.sqrt((diffs ** 2).sum(axis=-1))        # (1000, 1000)
# ...but note this DOES allocate 1000x1000x3 floats = 24 MB. At
# 10,000 points it is 2.4 GB. Broadcasting is free; the RESULT is not.
`,
      hl: [4, 18, 22, 30],
      caption: "**`[:, None]` is the idiom to learn.** It inserts an axis so a 1-D array aligns with rows rather than columns, and it is how most \"per row\" operations are written."
    },

    { t: "callout", kind: "trap", title: "The axis argument reduces, it does not select", body: [
      { t: "code", lang: "python", title: "the confusion that costs an afternoon", numbered: false, code: `
a = np.array([[1, 2, 3],
              [4, 5, 6]])          # shape (2, 3)

a.sum(axis=0)     # array([5, 7, 9])   -- shape (3,)
a.sum(axis=1)     # array([6, 15])     -- shape (2,)

# THE MENTAL MODEL: axis=k means "collapse axis k". The result has
# that axis REMOVED.
#
#   (2, 3).sum(axis=0)  ->  (3,)      axis 0 is gone
#   (2, 3).sum(axis=1)  ->  (2,)      axis 1 is gone
#
# So axis=0 sums DOWN the rows (giving a per-column result), which
# reads backwards until you think of it as "remove the row axis".

# keepdims saves the reshape when you want to broadcast the result
# back against the original:
col_means = a.mean(axis=0, keepdims=True)   # (1, 3), not (3,)
centred = a - col_means                     # broadcasts directly`},
      { t: "p", text: "**When a broadcast fails, print the shapes.** Nine times in ten the fix is a `[:, None]` or a `keepdims=True`, and the error message names both shapes so the missing axis is visible." }
    ]},

    { t: "h2", n: "04", text: "Views and copies", id: "views" },

    {"kind": "memory", "title": "Views share memory; copies do not", "caption": "A slice of a NumPy array is a view onto the same buffer: writing through it changes the original. Fancy indexing and .copy() allocate a new buffer.", "names": [{"name": "a = np.arange(6)", "to": "o1"}, {"name": "v = a[2:5]  (view)", "to": "o1", "label": "same buffer"}, {"name": "c = a[[2, 3, 4]]  (copy)", "to": "o2"}], "objects": [{"id": "o1", "type": "buffer", "value": "[0 1 2 3 4 5]", "note": "v[0] = 99 changes a[2]", "tone": "accent"}, {"id": "o2", "type": "buffer", "value": "[2 3 4]", "note": "independent", "tone": "good"}], "t": "diagram", "id": "dg-15_1-04-1"},

    { t: "ladder",
      title: "Taking a subset of an array and modifying it",
      rungs: [
        { level: "bad", label: "Assume slicing copies",
          why: "It does not. A basic slice is a *view* — a different window onto the same memory — so writing to it modifies the original. This is the most common source of \"my data changed and I don't know where\".",
          code: `data = np.arange(10)
subset = data[2:5]
subset[0] = 999

data          # array([0, 1, 999, 3, 4, 5, ...])  <- ORIGINAL changed` },
        { level: "ok", label: "Copy defensively everywhere",
          why: "Correct, and it discards the main reason views exist. Copying a 4GB array to read one row is a real cost, and on large data it is the difference between fitting in memory and not.",
          code: `subset = data[2:5].copy()      # safe, and sometimes wasteful

# On a (100_000, 1000) float64 array -- 800 MB -- a defensive copy
# of every slice will exhaust memory long before the logic is wrong.` },
        { level: "best", label: "Know which you have, and say so",
          why: "Basic slicing gives a view; fancy indexing and boolean masks give copies. Once you know the rule you copy where mutation matters and take views everywhere else, deliberately.",
          code: `data = np.arange(10)

data[2:5]            # VIEW    -- basic slicing
data[::2]            # VIEW    -- strided slicing
data.T               # VIEW    -- transpose
data.reshape(2, 5)   # VIEW    -- when the memory allows it

data[[2, 3, 4]]      # COPY    -- fancy (integer array) indexing
data[data > 5]       # COPY    -- boolean mask
data.flatten()       # COPY    -- always
data.ravel()         # VIEW    -- when it can, else a copy

# Check, rather than guess:
subset = data[2:5]
subset.base is data        # True -> it is a view
np.shares_memory(subset, data)   # True`,
          note: "**A function receiving an array can modify its caller's data.** Document whether yours mutates, and if it must not, copy at the boundary — once, not at every slice." }
      ]
    },

    { t: "h2", n: "05", text: "Thinking in whole arrays", id: "vectorising" },

    { t: "code", lang: "python", title: "the four patterns that remove most loops", code: `
# 1. CONDITIONAL -> np.where
result = np.where(prices > 100, prices * 0.9, prices)
# Both branches are evaluated for every element, so avoid it when a
# branch is expensive or invalid (a division by zero, say).

# 2. MULTI-CONDITION -> np.select
band = np.select(
    [total < 100, total < 500, total < 1000],
    ["small",     "medium",    "large"],
    default="enterprise",
)

# 3. LOOKUP -> indexing with an integer array
rates = np.array([0.20, 0.19, 0.00])       # UK, DE, US
country_idx = np.array([0, 2, 1, 0, 1])
tax = subtotals * rates[country_idx]       # one operation, no dict

# 4. ACCUMULATION -> cumulative functions
running_total = np.cumsum(amounts)
running_max = np.maximum.accumulate(prices)

# AND THE ONE THAT LOOKS VECTORISED AND IS NOT:
np.vectorize(some_python_function)(arr)
# This is a LOOP with NumPy-shaped output. The docstring says so.
# It is convenience, not performance -- typically no faster than a
# list comprehension, and sometimes slower.

# When the operation genuinely cannot be expressed in NumPy:
from numba import njit

@njit                        # compiles the loop to machine code
def custom_metric(a, b):
    total = 0.0
    for i in range(len(a)):
        total += complicated_scalar_thing(a[i], b[i])
    return total
`,
      hl: [3, 15, 21, 29],
      caption: "**`np.vectorize` is the trap in this list.** It looks like the answer to \"how do I apply my function to an array\" and it is a Python loop with extra steps — reach for Numba, or restructure the expression."
    },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Vectorise a scoring pipeline",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p", text: "This runs nightly over 40 million rows and takes 3 hours. It also has a numerical bug that produces wrong scores for a small fraction of records." },
        { t: "code", lang: "python", numbered: false, title: "scoring.py", code: `
import numpy as np

def score_all(records):
    scores = []
    for r in records:
        base = r["amount"] * WEIGHTS[r["category"]]

        if r["days_since"] < 30:
            recency = 1.0
        elif r["days_since"] < 90:
            recency = 0.7
        elif r["days_since"] < 365:
            recency = 0.4
        else:
            recency = 0.1

        risk = np.exp(r["risk_raw"]) / (1 + np.exp(r["risk_raw"]))
        normalised = (base - MEAN) / STD

        scores.append(normalised * recency * risk)

    return np.array(scores, dtype=np.float32)`},
        { t: "p", text: "Vectorise it, and find the numerical bug. Explain which records are affected and why." }
      ],
      requirements: [
        "Identify the numerical bug and the inputs that trigger it.",
        "Vectorise every step, with no Python loop.",
        "Handle the category lookup without a dict access per row.",
        "Say what the memory cost is and how to bound it.",
        "Give the expected speedup with reasoning.",
        "Write the tests, including one for the numerical bug."
      ],
      hint: "Look at the sigmoid. What does `np.exp` do for a large positive input, and what does the expression give you then?",
      solution: {
        lang: "python",
        title: "scoring.py",
        code: `# =========================================================================
# THE NUMERICAL BUG
# =========================================================================
#
#   risk = np.exp(x) / (1 + np.exp(x))
#
# This is the sigmoid, written in its unstable form. It OVERFLOWS for
# large positive x:
#
#   x = 800:   np.exp(800) = inf
#              inf / (1 + inf) = inf / inf = nan
#              RuntimeWarning: overflow encountered in exp
#
#   x = 89:    np.exp(89) = 4.4e38, which overflows FLOAT32 but not
#              float64 -- so the bug depends on the dtype of the
#              input, which is exactly the kind of thing that varies
#              between the dev sample and production data.
#
# It also loses precision for large NEGATIVE x, though less
# catastrophically: exp(-800) underflows to 0.0, giving 0/1 = 0.0,
# which is the correct limit -- so negatives are safe here.
#
# WHO IS AFFECTED: records whose risk_raw exceeds ~709 (float64) or
# ~88 (float32). These are outliers -- a tiny fraction -- which is
# why it presents as "wrong scores for a small number of records"
# rather than a crash. And nan PROPAGATES: nan * anything is nan, so
# the final score is nan and any downstream mean or sum over the
# column is also nan.
#
# THE STABLE FORM. Use scipy's expit, which handles both tails:
#
#   from scipy.special import expit
#   risk = expit(x)
#
# Or, if scipy is not available, the standard piecewise identity:
#
#   def sigmoid(x):
#       out = np.empty_like(x)
#       pos = x >= 0
#       # For x >= 0: 1 / (1 + exp(-x))  -- exp(-x) <= 1, no overflow
#       out[pos] = 1.0 / (1.0 + np.exp(-x[pos]))
#       # For x <  0: exp(x) / (1 + exp(x)) -- exp(x) < 1, no overflow
#       ex = np.exp(x[~pos])
#       out[~pos] = ex / (1.0 + ex)
#       return out
#
# Both branches keep the argument to exp non-positive, so it cannot
# overflow in either direction.
#
# A SECOND, QUIETER BUG: the result is cast to float32 at the end,
# but every intermediate is float64 -- so the pipeline uses twice the
# memory it needs to for no benefit, and the final cast can itself
# overflow if a score exceeds 3.4e38.
#
#
# =========================================================================
# THE VECTORISED VERSION
# =========================================================================

import numpy as np
from scipy.special import expit


# Categories become integer CODES once, at load time, so the lookup
# is an array index rather than a dict access per row.
CATEGORY_CODES: dict[str, int] = {name: i for i, name in enumerate(CATEGORIES)}
WEIGHT_TABLE = np.array(
    [WEIGHTS[name] for name in CATEGORIES], dtype=np.float32
)

# The recency bands, as arrays. Expressing them as data rather than
# as an if/elif chain is what makes them vectorisable -- and it also
# makes them reviewable by someone who is not reading code.
RECENCY_EDGES = np.array([30, 90, 365], dtype=np.int32)
RECENCY_VALUES = np.array([1.0, 0.7, 0.4, 0.1], dtype=np.float32)


def score_all(
    amount: np.ndarray,          # float32 (n,)
    category_code: np.ndarray,   # int16   (n,)
    days_since: np.ndarray,      # int32   (n,)
    risk_raw: np.ndarray,        # float32 (n,)
) -> np.ndarray:
    """Columns in, column out. Passing arrays rather than a list of
    dicts is most of the win -- 40M dicts is ~12 GB of Python objects
    before any arithmetic happens."""

    # 1. LOOKUP -> integer-array indexing. One operation, no dict.
    base = amount * WEIGHT_TABLE[category_code]

    # 2. THE if/elif CHAIN -> searchsorted.
    #
    #    searchsorted returns, for each value, the index of the band
    #    it falls into. "right" makes the boundaries match the
    #    original's strict < comparisons:
    #      days <  30  -> 0 -> 1.0
    #      days <  90  -> 1 -> 0.7
    #      days < 365  -> 2 -> 0.4
    #      otherwise   -> 3 -> 0.1
    #
    #    np.select would also work and reads more explicitly, but it
    #    evaluates every condition over the whole array; searchsorted
    #    is one binary search per element and scales to many bands.
    band = np.searchsorted(RECENCY_EDGES, days_since, side="right")
    recency = RECENCY_VALUES[band]

    # 3. THE BUG, FIXED. expit is the numerically stable sigmoid: it
    #    cannot overflow for any finite input.
    risk = expit(risk_raw)

    # 4. Plain arithmetic, elementwise.
    normalised = (base - MEAN) / STD

    return (normalised * recency * risk).astype(np.float32, copy=False)


# =========================================================================
# MEMORY, AND HOW TO BOUND IT
# =========================================================================
#
# PER-COLUMN, at 40M rows:
#
#   amount        float32   160 MB
#   category_code int16      80 MB
#   days_since    int32     160 MB
#   risk_raw      float32   160 MB
#   ------------------------------
#   input                   560 MB
#
# INTERMEDIATES. Each temporary is a full-length array:
#
#   base, recency, risk, normalised, and the final product
#   -> 5 x 160 MB = 800 MB, all live at once at the peak
#
#   TOTAL PEAK: ~1.4 GB.
#
# Fine on a 16 GB machine. If it is not, two options:
#
# (a) IN-PLACE OPERATIONS. Reuse buffers instead of allocating a new
#     one per expression. Cuts the intermediates to roughly one
#     array, at the cost of readability:
#
#       out = amount * WEIGHT_TABLE[category_code]
#       out -= MEAN
#       out /= STD
#       out *= RECENCY_VALUES[np.searchsorted(RECENCY_EDGES,
#                                             days_since, "right")]
#       out *= expit(risk_raw)
#
# (b) CHUNKING. The right answer above ~100M rows, and the one that
#     scales without limit:
#
#       def score_chunked(arrays, chunk=5_000_000):
#           out = np.empty(len(arrays[0]), dtype=np.float32)
#           for lo in range(0, len(out), chunk):
#               hi = lo + chunk
#               out[lo:hi] = score_all(*(a[lo:hi] for a in arrays))
#           return out
#
#     Note that a[lo:hi] is a VIEW, so slicing the inputs costs
#     nothing -- only the per-chunk intermediates are allocated, and
#     they are freed each iteration. Peak memory becomes a constant
#     you choose.
#
#
# =========================================================================
# EXPECTED SPEEDUP
# =========================================================================
#
# WHERE THE 3 HOURS GO, in the original:
#
#   40M iterations of the interpreter loop            ~40%
#   40M dict lookups (r["amount"] etc, 4 per row)     ~20%
#   40M np.exp CALLS ON SCALARS                       ~30%
#     -- each one is a full NumPy dispatch: argument parsing, dtype
#        resolution, ufunc setup, for a single number. This is the
#        single most expensive line, and it is the one that LOOKS
#        like it is using NumPy.
#   list.append and the final np.array conversion     ~10%
#
# AFTER: ~8 vectorised operations over 40M elements. Each is one
# pass over contiguous memory at roughly memory-bandwidth speed.
#
#   estimate: 40M x 8 ops / ~1e9 elements-per-second ~= 0.3 s
#   plus I/O and the astype
#
#   3 hours  ->  a few seconds.  Roughly 1000x.
#
# THE LARGEST SINGLE CONTRIBUTION is not the loop -- it is calling
# np.exp 40 million times on scalars. NumPy's per-call overhead is
# ~1 microsecond, which is nothing on an array and is 40 seconds when
# paid 40 million times. That pattern -- a NumPy function inside a
# Python loop -- is slower than the equivalent math.exp, and much
# slower than one vectorised call.
#
#
# =========================================================================
# TESTS
# =========================================================================

def test_the_sigmoid_does_not_overflow():
    """THE BUG. The original produced nan for these inputs."""
    extreme = np.array([-1000, -800, -100, 0, 100, 800, 1000],
                       dtype=np.float64)

    risk = expit(extreme)

    assert np.all(np.isfinite(risk)), "overflow produced nan or inf"
    assert np.all((risk >= 0) & (risk <= 1))
    assert risk[0] == pytest.approx(0.0)
    assert risk[3] == pytest.approx(0.5)
    assert risk[-1] == pytest.approx(1.0)


def test_no_nan_in_any_output():
    """nan PROPAGATES: one bad record makes every downstream
    aggregate nan, which is how this stayed hidden."""
    scores = score_all(**realistic_inputs(100_000, include_outliers=True))

    assert not np.isnan(scores).any()
    assert np.isfinite(scores).all()


@pytest.mark.parametrize("days,expected", [
    (0, 1.0), (29, 1.0),
    (30, 0.7), (89, 0.7),      # boundary: 30 falls in the SECOND band
    (90, 0.4), (364, 0.4),
    (365, 0.1), (99999, 0.1),
])
def test_recency_band_boundaries(days, expected):
    """searchsorted with side='right' must reproduce the original's
    strict < comparisons exactly. Off by one here changes 40M scores
    and nothing fails."""
    band = np.searchsorted(RECENCY_EDGES, np.array([days]), side="right")

    assert RECENCY_VALUES[band][0] == pytest.approx(expected)


def test_matches_the_original_on_safe_inputs():
    """Characterisation: identical results wherever the original was
    not buggy. This is what makes the rewrite trustworthy."""
    inputs = realistic_inputs(10_000, include_outliers=False)

    np.testing.assert_allclose(
        score_all(**inputs),
        np.array([score_one(r) for r in as_records(inputs)],
                 dtype=np.float32),
        rtol=1e-5,
    )


def test_chunking_gives_the_same_answer():
    inputs = realistic_inputs(1_000_000)

    np.testing.assert_array_equal(
        score_chunked(inputs, chunk=100_000),
        score_all(**inputs),
    )


def test_peak_memory_is_bounded():
    inputs = realistic_inputs(40_000_000)

    peak = measure_peak_rss(lambda: score_chunked(inputs, chunk=5_000_000))

    assert peak < 2 * 1024**3`,
        notes: [
          { t: "p", text: "**`np.exp(x) / (1 + np.exp(x))` overflows to `nan` for large positive `x`** — `inf / inf`. The threshold is around 709 in float64 and 88 in float32, so whether the bug appears depends on the input dtype, which is exactly the kind of thing that differs between a development sample and production data." },
          { t: "p", text: "**`nan` propagates, which is why this stayed hidden.** A handful of outlier records produce `nan` scores, and any mean or sum over that column is then `nan` too — so the symptom appears far from the cause and looks like a reporting problem." },
          { t: "callout", kind: "insight", title: "The biggest cost is np.exp in a loop, not the loop", body: [
            { t: "p", text: "NumPy's per-call overhead is roughly a microsecond: argument parsing, dtype resolution, ufunc setup. That is irrelevant on an array and is forty seconds when paid forty million times on scalars." },
            { t: "p", text: "A NumPy function inside a Python loop is slower than `math.exp` for the same work, and far slower than a single vectorised call. It is the pattern that looks most like using NumPy while getting none of the benefit." }
          ]},
          { t: "p", text: "**`searchsorted` replaces the if/elif chain**, and expressing the bands as arrays makes them reviewable data rather than control flow. `side=\"right\"` is what reproduces the original's strict `<` comparisons — the boundary test exists because an off-by-one here changes forty million scores and nothing fails." },
          { t: "p", text: "**Passing columns rather than a list of dicts is most of the win.** Forty million dicts is roughly 12GB of Python objects before any arithmetic happens, so the loop was never the only problem." },
          { t: "p", text: "**Chunking works because slicing gives a view.** `a[lo:hi]` allocates nothing, so only the per-chunk intermediates exist at any moment — which turns peak memory from a property of the data into a constant you choose." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's feature pipeline used 60GB of RAM and needed a dedicated large instance. They had assumed the data was simply that big." },
      { t: "p", text: "**Every array was float64 by default, and none of the features needed sixteen significant digits.** Casting to float32 halved it; casting three integer columns to `int16` and `int8` where the ranges allowed took another slice off." },
      { t: "p", text: "**Peak memory fell to 18GB and the job moved to a standard instance**, cutting the cost by roughly two thirds. The change was one `astype` at the load boundary." },
      { t: "p", text: "**NumPy's defaults are conservative, not optimal.** `float64` and `int64` are safe choices for a library that cannot know your data; choosing the dtype deliberately is often the cheapest performance work available." }
    ]}
  ],

  takeaways: [
    "**An ndarray is one contiguous block of one dtype.** Everything about NumPy's behaviour and speed follows from that.",
    "**The speedup is no interpreter per element, no per-element type check, and cache-friendly memory** — not optimisation in the abstract.",
    "**A Python loop over a NumPy array is slower than a loop over a list**, because you pay both indexing costs.",
    "**A NumPy function called on scalars inside a loop is the worst pattern of all** — about a microsecond of dispatch overhead, paid per element.",
    "**Choose dtypes deliberately.** `float64` and `int64` are conservative defaults, and halving them is often the cheapest performance work available.",
    "**NumPy integers wrap silently.** `int8(127) + 1` is `-128`, with no exception.",
    "**`dtype=object` or `<U32` means the array is not doing what you think** — every operation falls back to Python objects.",
    "**Broadcasting compares shapes from the right**, and dimensions match when equal or when one is 1.",
    "**`[:, None]` inserts an axis** so a 1-D array aligns with rows instead of columns — the idiom behind most per-row operations.",
    "**Broadcasting allocates nothing; the result does.** Pairwise differences on 10,000 points is 2.4GB.",
    "**`axis=k` removes axis k.** `sum(axis=0)` collapses rows, giving a per-column result.",
    "**Basic slicing gives a view; fancy indexing and boolean masks give copies.** Check with `np.shares_memory` rather than guessing.",
    "**`np.vectorize` is a loop with NumPy-shaped output** — use `np.where`, `np.select`, integer-array lookups, or Numba.",
    "**Write the sigmoid as `expit`.** The naive form overflows to `nan`, and `nan` propagates into every downstream aggregate."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `for x in numpy_array: total += x` slower than the same loop over a Python list?",
        options: [
          "NumPy arrays are stored on disk",
          "Each iteration boxes a machine int into a Python object, so you pay NumPy's indexing cost plus the interpreter's",
          "The array must be copied for iteration",
          "NumPy disables the interpreter's fast path"
        ],
        answer: 1,
        why: "NumPy is fast because compiled loops operate on raw memory without per-element Python objects. Iterating element by element reintroduces exactly the cost it exists to avoid — `.sum()` does the same work about 300× faster."
      },
      {
        stem: "`np.exp(x) / (1 + np.exp(x))` produces `nan` for some records. Why, and what is the fix?",
        options: [
          "Division by zero for negative x; add an epsilon",
          "`np.exp` overflows to `inf` for large positive x, giving `inf/inf` — use `scipy.special.expit`, which is stable in both tails",
          "The dtype is too narrow; use float64",
          "NumPy cannot represent the sigmoid function"
        ],
        answer: 1,
        why: "The threshold is around 709 in float64 and 88 in float32, so whether it triggers depends on the input dtype. `nan` then propagates through every downstream aggregate, which is why it presents as a reporting problem rather than a crash."
      },
      {
        stem: "`subset = data[2:5]; subset[0] = 999`. What happens to `data`?",
        options: [
          "It is unchanged — slicing copies",
          "`data[2]` becomes 999, because basic slicing returns a view onto the same memory",
          "A `ValueError` is raised for writing to a slice",
          "It depends on the dtype"
        ],
        answer: 1,
        why: "Basic slicing, transposing and most reshapes return views; fancy indexing and boolean masks return copies. Knowing which lets you copy where mutation matters instead of defensively copying everywhere, which on a multi-gigabyte array is the difference between fitting in memory and not."
      },
      {
        stem: "You need a per-row scaling factor for a (1000, 50) array from a (1000,) vector. What do you write?",
        options: [
          "`arr * vec`",
          "`arr * vec[:, None]` — the new axis aligns the vector with rows rather than the last axis",
          "`arr * vec.T`",
          "`np.repeat(vec, 50).reshape(1000, 50) * arr`"
        ],
        answer: 1,
        why: "Broadcasting aligns shapes from the right, so a bare (1000,) would be compared against the trailing 50 and fail. `[:, None]` makes it (1000, 1), which broadcasts across columns. `.T` does nothing to a 1-D array, and `np.repeat` allocates a full copy that broadcasting avoids."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why is NumPy faster than a Python list?",
        strong: "Contiguous memory of a single dtype, so there is no per-element Python object, no per-element type check, and the loop runs in compiled code with the cache and SIMD working for it.",
        answer: [
          { t: "p", text: "Explaining it in terms of memory layout rather than \"it's written in C\" is what separates a real answer." },
          { t: "p", text: "Volunteering that a Python loop over an array is slower than over a list shows you understand the mechanism rather than the slogan." },
          { t: "p", text: "The per-call dispatch cost of a NumPy function on scalars is a good specific to have — a microsecond is nothing until it is paid forty million times." }
        ]
      },
      {
        level: "advanced",
        q: "Explain broadcasting.",
        strong: "Shapes are compared from the right; dimensions are compatible when equal or when one is 1, and a size-1 axis is iterated with stride zero rather than being copied. So it costs nothing in memory — though the result may be large.",
        answer: [
          { t: "p", text: "The stride-zero detail is what shows you know it is not silently allocating, which is the usual misconception." },
          { t: "p", text: "The pairwise-distance example is a good illustration of the result being expensive when the operation is not." },
          { t: "p", text: "Mentioning `[:, None]` as the practical idiom makes the answer usable rather than theoretical." }
        ]
      },
      {
        level: "advanced",
        q: "How would you speed up a slow numerical loop?",
        strong: "First check whether it can be an array expression — `np.where`, `np.select`, integer-array lookups, `searchsorted` for banding. If the logic genuinely cannot be expressed that way, Numba compiles the loop; `np.vectorize` does not.",
        answer: [
          { t: "p", text: "Naming `np.vectorize` as a trap is a useful signal, since it is the first thing most people reach for." },
          { t: "p", text: "`searchsorted` for replacing an if/elif chain is a specific technique that shows range beyond the obvious functions." },
          { t: "p", text: "Mentioning dtype reduction as often the cheapest win connects performance to memory bandwidth, which is usually the real constraint." }
        ]
      }
    ]
  }
});

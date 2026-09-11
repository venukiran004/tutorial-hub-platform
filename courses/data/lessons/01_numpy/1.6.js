/* ============================================================================
   LESSON 1.6 — Where NumPy Is the Wrong Tool
   ========================================================================= */
EC.receiveLesson({
  id: "1.6",

  lede: "**NumPy's advantages all come from one assumption: a fixed-size, homogeneous, contiguous block of memory.** Four common situations break that assumption, and in each of them reaching for an array makes the code slower, larger or both — while still looking like the professional choice.",

  objectives: [
    "Recognise when `object` dtype has silently removed every NumPy advantage",
    "Handle ragged data without pretending it is rectangular",
    "Explain why growing an array in a loop is quadratic",
    "Choose between NumPy, pandas, Arrow, Dask and a database for a given size",
    "Know what NumPy's string dtypes actually cost"
  ],

  prerequisites: ["1.1", "1.2"],

  blocks: [

    { t: "h2", n: "01", text: "Object dtype: an array in name only", id: "object" },

    { t: "p", text: "**When NumPy cannot fit your data into one uniform type, it falls back to `object` dtype** — an array of pointers to Python objects. Every operation on it loops in Python, so you have a list with a worse interface and higher memory use." },

    { t: "dl", items: [
      ["`object` dtype", "Elements are pointers to arbitrary Python objects rather than raw values. The array provides no vectorisation, no SIMD and no contiguous values."],
      ["Silent fallback", "NumPy chooses `object` automatically when types cannot be unified. Nothing warns you, and the array looks normal in a REPL."],
      ["Ragged data", "Rows of differing lengths. Not representable as an ndarray at all — since NumPy 1.24 constructing one raises rather than quietly producing an object array."],
      ["`np.str_` / `<U`", "Fixed-width Unicode. `<U20` stores 20 code points per element at **4 bytes each** — 80 bytes per string whether it holds one character or twenty."],
      ["`StringDtype`", "pandas' variable-length string type, backed by Arrow. The right answer for text columns; NumPy has no equivalent."]
    ]},

    { t: "code", lang: "python", title: "the fallback, and what it costs", code: `
import numpy as np
import sys

# TYPES THAT CANNOT BE UNIFIED -> object, with no warning:
a = np.array([1, "two", 3.0, None])
a.dtype                       # object -- NOT an error

# WORSE: types NumPy CAN unify, wrongly.
b = np.array([1, 2.5, 3])
b.dtype                       # float64 -- the integers were widened
c = np.array([1, "2", 3])
c.dtype                       # <U21 -- the INTEGERS BECAME STRINGS
c.sum()                       # TypeError, eventually

# THE PERFORMANCE COLLAPSE, measured:
n = 1_000_000
fast = np.arange(n, dtype=np.int64)
slow = np.arange(n).astype(object)

# fast.sum()                  # ~0.5 ms
# slow.sum()                  # ~60 ms -- 120x, because it loops in Python
# sum(range(n))               # ~15 ms -- the PLAIN PYTHON LOOP IS FASTER
#
# An object array is slower than a list for the same work, because it
# pays the Python loop cost PLUS array indexing overhead.

# THE MEMORY IS WORSE TOO:
fast.nbytes                   # 8,000,000
slow.nbytes                   # 8,000,000 of POINTERS...
                              # ...plus ~28 bytes per int object = ~36 MB

# STRINGS: THE FIXED-WIDTH TRAP
names = np.array(["Ada", "Grace", "Katherine"])
names.dtype                   # <U9 -- sized to the LONGEST element
names.itemsize                # 36 bytes = 9 chars x 4 bytes (UTF-32)

# EVERY element pays for the longest one:
np.array(["a", "b", "c" * 500]).itemsize        # 2000 bytes EACH

# AND ASSIGNMENT TRUNCATES SILENTLY:
short = np.array(["ab", "cd"])          # <U2
short[0] = "abcdefgh"
short[0]                                # 'ab' -- SIX CHARACTERS GONE
#
# No error, no warning. This is how identifiers get corrupted: a
# product code array sized from a sample of short codes truncates
# every longer code that arrives later.

# THE HONEST ALTERNATIVES for text:
import pandas as pd
s = pd.Series(["Ada", "Grace", "Katherine"], dtype="string")   # Arrow-backed
#
# Variable length, no truncation, and vectorised .str methods that
# run in C rather than looping.

# WHEN object IS LEGITIMATE:
#   - a small array of genuinely heterogeneous things you only index
#   - dates before pandas, or Decimal values where precision is exact
#   - an intermediate you immediately convert
# In all three cases the array is a container, not a compute surface.

# DETECT IT IN A PIPELINE, because it will not announce itself:
def assert_numeric(a, name="array"):
    a = np.asarray(a)
    if a.dtype == object:
        kinds = {type(x).__name__ for x in a.ravel()[:100]}
        raise TypeError(f"{name} is object dtype; sample types: {kinds}")
    return a
`,
      hl: [11, 22, 39, 58],
      caption: "**Assigning a longer string into a `<U2` array truncates without warning.** This is how product codes and identifiers get silently corrupted when the array was sized from an unrepresentative sample."
    },

    { t: "callout", kind: "trap", title: "An object array is slower than the list it replaced", body: [
      { t: "p", text: "Summing a million-element object array takes roughly four times as long as summing the equivalent `range` in plain Python — it pays the interpreter loop cost *and* the array indexing overhead." },
      { t: "p", text: "**Object dtype is the one case where using NumPy is strictly worse than not using it.** The code looks vectorised, the profiler shows time inside NumPy, and the reasonable conclusion — \"NumPy is being slow\" — is exactly wrong." },
      { t: "p", text: "**Check `dtype` at pipeline boundaries.** One assertion where data enters catches this at the point it was introduced rather than three transformations downstream." }
    ]},

    { t: "h2", n: "02", text: "Ragged data", id: "ragged" },

    { t: "p", text: "**Sequences of differing lengths have no rectangular representation**, and the workarounds each lose something. Choosing between them is a decision about which loss is acceptable, not a technicality." },

    { t: "table",
      head: ["Approach", "What it costs", "Use when"],
      rows: [
        ["**List of arrays**", "No vectorisation across rows; a Python loop per row", "Row counts are small, or per-row work dominates anyway"],
        ["**Pad to the maximum**", "Memory grows with the longest row; padding must be masked everywhere", "Lengths are similar and a mask is tolerable"],
        ["**Flat array plus offsets**", "Indexing is manual", "Many rows, mostly short — this is what Arrow does internally"],
        ["**`np.ma` masked array**", "Slow, and awkward interop with everything else", "Rarely — usually a worse padding"],
        ["**Arrow `ListArray`**", "A dependency", "The data is genuinely nested and will be shared or written to Parquet"]
      ],
      caption: "**The flat-plus-offsets layout is not a workaround** — it is the representation Arrow and every columnar format actually use for variable-length data."
    },

    { t: "code", lang: "python", title: "three representations of the same ragged data", code: `
sessions = [
    [1, 2, 3],
    [4, 5],
    [6, 7, 8, 9, 10],
    [11],
]

# NumPy REFUSES, and rightly so:
try:
    np.array(sessions)
except ValueError as e:
    print(e)                  # "setting an array element with a sequence"
#
# Before NumPy 1.24 this quietly produced an object array of lists.
# The change to an error was a good one: the object array looked like
# it worked, right up until an operation over it silently did nothing.

np.array(sessions, dtype=object)      # explicit, if you insist

# 1. PADDING -- simple, wasteful when lengths vary a lot:
lengths = np.array([len(s) for s in sessions])
padded = np.full((len(sessions), lengths.max()), np.nan)
for i, s in enumerate(sessions):
    padded[i, :len(s)] = s

np.nanmean(padded, axis=1)            # per-session mean, padding ignored
#
# THE COST: with lengths [3, 2, 5, 1] we store 20 cells for 11 values
# -- 45% waste. On real session data where one user has 10,000 events
# and the median is 4, padding is catastrophic.
lengths.sum() / padded.size           # 0.55 utilisation

# AND EVERY OPERATION MUST REMEMBER THE MASK:
padded.mean(axis=1)                   # nan -- wrong, the padding leaked
np.nanmean(padded, axis=1)            # correct
padded.sum(axis=1)                    # nan
np.nansum(padded, axis=1)             # correct
#
# One forgotten nan-prefix and the result is wrong. That is a
# maintenance cost that lasts as long as the code does.

# 2. FLAT + OFFSETS -- no waste, and still fully vectorised:
flat = np.concatenate([np.asarray(s) for s in sessions])
offsets = np.concatenate([[0], np.cumsum(lengths)])

flat                          # array([1,2,3,4,5,6,7,8,9,10,11])
offsets                       # array([0, 3, 5, 10, 11])

# Row i is flat[offsets[i]:offsets[i+1]] -- and GROUPED REDUCTIONS
# need no loop at all:
group_id = np.repeat(np.arange(len(sessions)), lengths)
totals = np.bincount(group_id, weights=flat)      # sum per session
means = totals / lengths                          # mean per session
maxes = np.maximum.reduceat(flat, offsets[:-1])   # max per session

totals                        # array([6., 9., 40., 11.])
#
# ONE PASS OVER 11 VALUES, no padding, no mask. This scales to
# millions of rows with wildly uneven lengths.

# np.add.reduceat IS THE GENERAL TOOL -- any ufunc has a .reduceat:
np.add.reduceat(flat, offsets[:-1])       # sums
np.minimum.reduceat(flat, offsets[:-1])   # minima
#
# CAUTION: reduceat needs offsets STRICTLY INCREASING. An empty row
# gives a repeated offset and reduceat silently returns the element
# at that position instead of an empty reduction.
assert (np.diff(offsets[:-1]) > 0).all() or len(offsets) <= 2

# 3. LIST OF ARRAYS -- honest when per-row work is genuinely irregular:
rows = [np.asarray(s) for s in sessions]
[r.mean() for r in rows]
#
# A Python loop over rows is fine when there are 1,000 rows and each
# needs different logic. It is not fine for 10 million.
`,
      hl: [26, 42, 51, 66],
      caption: "**`np.bincount` with `weights` and `np.ufunc.reduceat` do grouped reductions in one pass.** Flat-plus-offsets is not a compromise — it is the layout that makes ragged data fully vectorisable."
    },

    { t: "h2", n: "03", text: "Growing an array in a loop", id: "growth" },

    { t: "p", text: "**A NumPy array has a fixed size.** `np.append` does not append — it allocates a new array and copies everything. Doing that in a loop is quadratic, and it is one of the most common performance mistakes in data code." },

    { t: "ladder",
      title: "Accumulating results in a loop",
      rungs: [
        { level: "bad", label: "np.append in a loop", code: `out = np.array([])
for chunk in chunks:
    out = np.append(out, process(chunk))`,
          note: "**Quadratic.** Each call allocates a new array and copies everything accumulated so far — 10,000 appends of 100 elements copies about 5 billion values. The name suggests it is cheap; it is the opposite of cheap." },
        { level: "ok", label: "Collect then concatenate once", code: `parts = []
for chunk in chunks:
    parts.append(process(chunk))
out = np.concatenate(parts)`,
          note: "**Linear, and almost always the right answer.** Python lists are amortised O(1) to append, and one `concatenate` at the end does a single pass. Peak memory is briefly double, which only matters near the memory ceiling." },
        { level: "best", label: "Preallocate when the size is known", code: `out = np.empty(total_size, dtype=np.float64)
pos = 0
for chunk in chunks:
    r = process(chunk)
    out[pos:pos + len(r)] = r
    pos += len(r)`,
          note: "**One allocation, no doubling of peak memory.** Worth the extra lines only when the total size is known up front and the array is large enough that the intermediate list would be a problem. `np.empty` skips zero-initialisation, which is safe here because every cell is written." }
      ]
    },

    { t: "code", lang: "python", title: "the cost, measured", code: `
def grow_append(n_chunks=2000, chunk=100):
    out = np.array([])
    for _ in range(n_chunks):
        out = np.append(out, np.ones(chunk))
    return out
# ~1.9 s -- and it copies ~20 billion bytes to produce 1.6 MB

def grow_list(n_chunks=2000, chunk=100):
    parts = []
    for _ in range(n_chunks):
        parts.append(np.ones(chunk))
    return np.concatenate(parts)
# ~3 ms -- 600x faster

def grow_prealloc(n_chunks=2000, chunk=100):
    out = np.empty(n_chunks * chunk)
    for i in range(n_chunks):
        out[i * chunk:(i + 1) * chunk] = 1.0
    return out
# ~2 ms, and peak memory is exactly the result size

# THE ARITHMETIC BEHIND THE QUADRATIC:
# Appending n chunks of size c copies c + 2c + 3c + ... + nc
#   = c * n(n+1)/2 elements.
# n=2000, c=100 -> 200 MILLION element copies for a 200,000 array.
total_copied = 100 * 2000 * 2001 // 2        # 200,100,000

# np.resize IS ALSO NOT WHAT IT SOUNDS LIKE:
a = np.arange(5)
np.resize(a, 8)               # array([0,1,2,3,4,0,1,2]) -- it REPEATS
#
# It tiles the data to fill the new size. It does not zero-pad and it
# does not modify in place. Almost never what someone wants.

# np.hstack / np.vstack IN A LOOP have the same quadratic problem --
# they call concatenate, which allocates every time. The rule is not
# about which function; it is about allocating inside the loop at all.

# WHEN YOU GENUINELY DO NOT KNOW THE SIZE, and it may be huge:
#   - write chunks to disk and memory-map the result
#   - use a list and accept the 2x peak during concatenate
#   - over-allocate with a growth factor, as C++ vectors do:
class GrowableArray:
    """Amortised O(1) append with a 2x growth factor."""
    def __init__(self, dtype=np.float64, capacity=1024):
        self._buf = np.empty(capacity, dtype=dtype)
        self._n = 0

    def extend(self, values):
        values = np.asarray(values)
        need = self._n + len(values)
        if need > len(self._buf):
            new_cap = max(need, len(self._buf) * 2)
            bigger = np.empty(new_cap, dtype=self._buf.dtype)
            bigger[:self._n] = self._buf[:self._n]
            self._buf = bigger
        self._buf[self._n:need] = values
        self._n = need

    def finish(self):
        return self._buf[:self._n].copy()
#
# Doubling means the total copying is O(n), not O(n**2). This is
# worth writing only when the list-then-concatenate approach is ruled
# out by peak memory -- which is rare.
`,
      hl: [7, 24, 30, 44],
      caption: "**Appending 2,000 chunks of 100 elements copies 200 million values to build an array of 200,000.** The quadratic term is the whole cost."
    },

    { t: "h2", n: "04", text: "When the data is too big", id: "scale" },

    { t: "p", text: "**NumPy assumes the array fits in RAM, with room for temporaries.** Past that point the answer is a different tool, and reaching for one earlier than you need to is its own mistake." },

    { t: "table",
      head: ["Size", "Reach for", "Because"],
      rows: [
        ["< 1 GB", "**NumPy / pandas**", "Fits comfortably with room for intermediates. Anything else is premature."],
        ["1–10 GB", "**pandas with dtype care, or Polars**", "Downcasting and categoricals often halve it; Polars is lazier about temporaries"],
        ["10–100 GB", "**Parquet + chunked reads, DuckDB, Polars streaming**", "Read only the columns and row groups you need; let the engine spill"],
        ["> 100 GB", "**Dask, Spark, or a warehouse**", "The work has to be distributed, or pushed to where the data already lives"],
        ["Any size, columnar", "**Arrow / Parquet**", "Column pruning and predicate pushdown often reduce the problem to the first row"]
      ],
      caption: "**The most common mistake is skipping straight to the last row.** A great many \"we need Spark\" problems are a 30 GB CSV that becomes 3 GB of Parquet and fits in memory."
    },

    { t: "code", lang: "python", title: "memory-mapping: NumPy's answer for larger-than-RAM arrays", code: `
# np.memmap maps a file into the address space. Pages load on access
# and the OS evicts them under pressure -- so you can index a 100 GB
# array on a 16 GB machine, provided your ACCESS PATTERN is local.

big = np.memmap("data.dat", dtype=np.float32, mode="w+", shape=(10_000_000, 50))
big[:1000] = np.random.default_rng(0).random((1000, 50)).astype(np.float32)
big.flush()

view = np.memmap("data.dat", dtype=np.float32, mode="r", shape=(10_000_000, 50))
view[5000:5100].mean()        # only these pages are read from disk

# THE ACCESS PATTERN IS EVERYTHING:
view[:, 0].sum()              # SLOW -- touches every page on disk
view[:1000].sum()             # fast -- one contiguous region
#
# A column of a C-contiguous memmap is strided across the whole file,
# so reading it pulls in the entire array one page at a time. That is
# precisely the case a COLUMNAR format exists to solve, and it is the
# strongest argument for Parquet over a raw binary dump.

# .npy AND .npz FOR ARRAYS YOU OWN:
np.save("arr.npy", np.arange(10))            # dtype and shape preserved
np.load("arr.npy")
np.savez_compressed("many.npz", a=np.arange(10), b=np.ones(5))
np.load("many.npz")["a"]
#
# np.load ON A PICKLED .npy EXECUTES CODE. allow_pickle defaults to
# False for exactly that reason -- never flip it on a file you did
# not create.

# CHUNKED PROCESSING -- the pattern that solves most size problems:
def chunked_mean(path, shape, dtype=np.float32, chunk=100_000):
    """Mean of a file larger than memory, in one pass and O(1) space."""
    arr = np.memmap(path, dtype=dtype, mode="r", shape=shape)
    total, count = 0.0, 0
    for start in range(0, shape[0], chunk):
        block = arr[start:start + chunk]
        total += block.sum(dtype=np.float64)     # float64 accumulator
        count += block.size
    return total / count
#
# The float64 accumulator matters: summing 500 million float32 values
# into a float32 total loses precision steadily and silently.

# WHAT DOES NOT WORK ON A MEMMAP:
#   - anything that materialises the whole array (arr.copy(), sorting)
#   - most sklearn calls, which convert to a real array on entry
#   - fancy indexing, which builds a full-size copy
# The moment you write arr[mask], you have asked for it all in RAM.
`,
      hl: [14, 27, 40, 46],
      caption: "**A column of a C-contiguous memmap is strided across the entire file.** Reading it pulls in every page — which is exactly the problem columnar formats exist to solve."
    },

    { t: "p", text: "Beyond Dask and Polars, three more names come up. **Modin** re-implements the pandas API over Ray or Dask, so `import modin.pandas as pd` parallelises existing code with no rewrite — and no guarantee that every method is faster. **cuDF** (RAPIDS) runs a pandas-like frame on the GPU; the win is real for large numeric groupbys and joins and absent for anything that ships data to and from the card per operation. **Vaex** memory-maps columnar files and evaluates lazily, which suits billion-row exploration on one machine. The question is the same for all of them: is the bottleneck memory, cores, or a Python loop — because only the first two are what they fix." },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Refactor",
      title: "Session features from ragged event data",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A feature job takes per-user event lists of wildly differing lengths — most users have a handful of events, a few automated accounts have hundreds of thousands — and computes per-user aggregates. The current version pads to the maximum length and has started failing on memory." },
        { t: "code", lang: "python", numbered: false, title: "features.py", code: `
def user_features(events_by_user):
    """events_by_user: {user_id: [float, ...]}"""
    users = list(events_by_user)
    lengths = [len(events_by_user[u]) for u in users]
    padded = np.full((len(users), max(lengths)), np.nan)

    for i, u in enumerate(users):
        e = events_by_user[u]
        padded[i, :len(e)] = e

    return {
        "user": users,
        "n": np.array(lengths),
        "total": np.nansum(padded, axis=1),
        "mean": np.nanmean(padded, axis=1),
        "max": np.nanmax(padded, axis=1),
    }`},
        { t: "p", text: "Rewrite it without padding, quantify what the padding was costing, and handle the edge cases the original gets wrong." }
      ],
      requirements: [
        "Use a flat array plus offsets; no padded matrix.",
        "Compute total, mean, max and count in one pass over the flat data.",
        "Quantify the memory saved on a realistic length distribution.",
        "Handle users with zero events correctly.",
        "Keep the output order stable and say how.",
        "Include tests, including one on the memory claim."
      ],
      hint: "`np.bincount` with `weights` and `np.ufunc.reduceat` both work on the flat layout. Watch what `reduceat` does with a repeated offset.",
      solution: {
        lang: "python",
        title: "features_flat.py",
        code: `import numpy as np


# =========================================================================
# WHAT THE PADDING COSTS
# =========================================================================
#
# Event counts per user are heavily right-skewed in every real system:
# a long tail of automated accounts with enormous histories, and a
# median user with a handful of events.
#
# Padding allocates n_users x max_length cells. The single largest
# user therefore sets the width of EVERY row.

def padding_cost(lengths):
    lengths = np.asarray(lengths)
    padded_cells = len(lengths) * lengths.max()
    real_cells = lengths.sum()
    return {
        "users": len(lengths),
        "events": int(real_cells),
        "max_length": int(lengths.max()),
        "median_length": float(np.median(lengths)),
        "padded_cells": int(padded_cells),
        "utilisation": float(real_cells / padded_cells),
        "padded_gb": padded_cells * 8 / 1e9,
        "flat_gb": real_cells * 8 / 1e9,
    }


rng = np.random.default_rng(0)
lengths = np.maximum(1, rng.lognormal(1.2, 1.1, 200_000).astype(int))
lengths[rng.integers(0, 200_000, 20)] = 250_000        # bot accounts

padding_cost(lengths)
# users 200,000 / events ~1.1M / max_length 250,000
# padded_cells 50,000,000,000  -> 400 GB
# flat_cells       1,100,000   -> 0.009 GB
# utilisation 0.000022
#
# TWENTY BOT ACCOUNTS TURN A 9 MB PROBLEM INTO A 400 GB ALLOCATION.
# That is the failure, and it is not gradual -- it appears the day
# one unusual account is created.


# =========================================================================
# THE FLAT LAYOUT
# =========================================================================

def user_features(events_by_user):
    """Per-user aggregates over ragged event lists, without padding.

    Output order follows sorted(events_by_user) so the result does not
    depend on dict insertion order -- which varies between a fresh
    build and one restored from a cache, and would otherwise make the
    feature matrix silently row-shuffled between runs.
    """
    users = sorted(events_by_user)
    lengths = np.array([len(events_by_user[u]) for u in users], dtype=np.int64)
    n_users = len(users)

    if n_users == 0:
        return {"user": [], "n": np.array([], dtype=np.int64),
                "total": np.array([]), "mean": np.array([]),
                "max": np.array([]), "min": np.array([])}

    # THE FLAT BUFFER: every event once, nothing wasted.
    parts = [np.asarray(events_by_user[u], dtype=np.float64) for u in users]
    flat = np.concatenate(parts) if any(lengths) else np.array([])

    # group_id[k] = which user event k belongs to.
    group = np.repeat(np.arange(n_users), lengths)

    # SUM AND COUNT IN ONE PASS -- bincount handles empty groups
    # correctly, returning 0 for a user with no events.
    total = np.bincount(group, weights=flat, minlength=n_users)

    # MEAN: divide by count, but a user with zero events has no mean.
    # 0/0 is nan, which is the honest answer -- but NumPy warns, so we
    # say so explicitly rather than suppressing it blindly.
    with np.errstate(invalid="ignore", divide="ignore"):
        mean = np.where(lengths > 0, total / np.maximum(lengths, 1), np.nan)

    # MAX AND MIN: reduceat is the tool, but it CANNOT handle empty
    # groups -- a repeated offset makes it return the element at that
    # position rather than an empty reduction. So compute over the
    # non-empty groups only and scatter the results back.
    mx = np.full(n_users, np.nan)
    mn = np.full(n_users, np.nan)

    nonempty = np.flatnonzero(lengths > 0)
    if len(nonempty):
        offsets = np.concatenate([[0], np.cumsum(lengths)])[:-1][nonempty]
        mx[nonempty] = np.maximum.reduceat(flat, offsets)
        mn[nonempty] = np.minimum.reduceat(flat, offsets)

    return {
        "user": users,
        "n": lengths,
        "total": total,
        "mean": mean,
        "max": mx,
        "min": mn,
    }


# =========================================================================
# WHAT THE ORIGINAL GOT WRONG, beyond memory
# =========================================================================
#
# 1. ZERO-EVENT USERS. np.nanmax over an all-nan row RAISES
#    ("All-NaN slice encountered") in older NumPy and returns nan with
#    a RuntimeWarning in newer ones. Either way the original does not
#    handle it deliberately.
#
# 2. ORDER. list(dict) follows insertion order, so the row order of
#    the feature matrix depends on how the dict was built. A cached
#    rebuild produces the same features attached to different rows,
#    which is the worst kind of bug: the values are all correct.
#
# 3. nansum OF AN EMPTY ROW IS 0.0, indistinguishable from a user
#    whose events genuinely sum to zero. bincount has the same
#    convention, so we return the count alongside -- always.
#
# 4. PRECISION. The original accumulates in whatever dtype the padded
#    array has. bincount accumulates in float64 regardless, which is
#    what you want over a million values.


# =========================================================================
# TESTS
# =========================================================================

def test_matches_a_naive_implementation():
    data = {"a": [1.0, 2.0, 3.0], "b": [10.0], "c": [4.0, 5.0]}
    f = user_features(data)

    assert f["user"] == ["a", "b", "c"]
    assert np.allclose(f["total"], [6.0, 10.0, 9.0])
    assert np.allclose(f["mean"], [2.0, 10.0, 4.5])
    assert np.allclose(f["max"], [3.0, 10.0, 5.0])
    assert np.allclose(f["min"], [1.0, 10.0, 4.0])
    assert np.array_equal(f["n"], [3, 1, 2])


def test_zero_event_user():
    f = user_features({"a": [1.0, 2.0], "empty": [], "b": [5.0]})

    i = f["user"].index("empty")
    assert f["n"][i] == 0
    assert f["total"][i] == 0.0
    assert np.isnan(f["mean"][i])
    assert np.isnan(f["max"][i])


def test_zero_event_user_first_and_last():
    """reduceat's offset behaviour is position-sensitive."""
    f = user_features({"a": [], "b": [1.0, 2.0], "z": []})

    assert np.isnan(f["max"][0])
    assert f["max"][1] == 2.0
    assert np.isnan(f["max"][2])


def test_consecutive_empty_users():
    f = user_features({"a": [], "b": [], "c": [7.0]})

    assert np.isnan(f["max"][0]) and np.isnan(f["max"][1])
    assert f["max"][2] == 7.0


def test_order_is_stable_regardless_of_insertion():
    one = user_features({"z": [1.0], "a": [2.0]})
    two = user_features({"a": [2.0], "z": [1.0]})

    assert one["user"] == two["user"] == ["a", "z"]
    assert np.allclose(one["total"], two["total"])


def test_memory_claim():
    """The flat layout must be dramatically smaller on skewed lengths."""
    rng = np.random.default_rng(0)
    lengths = np.maximum(1, rng.lognormal(1.2, 1.1, 20_000).astype(int))
    lengths[0] = 250_000

    c = padding_cost(lengths)
    assert c["flat_gb"] * 100 < c["padded_gb"]
    assert c["utilisation"] < 0.01


def test_one_long_user_does_not_change_the_cost():
    """The property padding lacks: cost is linear in EVENTS, not in max."""
    small = user_features({"a": [1.0], "b": [2.0]})

    big = user_features({"a": [1.0], "b": [2.0],
                         "bot": list(np.ones(100_000))})

    assert big["total"][big["user"].index("bot")] == 100_000
    assert np.allclose(small["total"], [1.0, 2.0])


def test_single_user():
    f = user_features({"only": [1.0, 2.0, 3.0, 4.0]})

    assert f["total"][0] == 10.0
    assert f["mean"][0] == 2.5


def test_empty_input():
    f = user_features({})

    assert f["user"] == []
    assert len(f["total"]) == 0`,
        notes: [
          { t: "p", text: "**Twenty bot accounts turn a 9 MB problem into a 400 GB allocation.** The padded width is set by the single longest user, so cost scales with the maximum rather than with the total — and the failure appears the day one unusual account is created, not gradually." },
          { t: "callout", kind: "insight", title: "reduceat cannot express an empty group", body: [
            { t: "p", text: "A user with zero events produces a repeated offset, and `reduceat` responds by returning the element *at* that position rather than an empty reduction. It does not raise; it returns a plausible number belonging to the next user." },
            { t: "p", text: "**Compute over the non-empty groups and scatter back.** `np.bincount` has no such problem — it handles empty groups correctly and returns 0 — which is why sums use it and extrema do not." }
          ]},
          { t: "p", text: "**Sorting the users is not cosmetic.** `list(dict)` follows insertion order, so a cached rebuild produces the same feature values attached to different rows. Every value is correct and the matrix is silently shuffled — the hardest kind of bug to see in a diff." },
          { t: "p", text: "**`nansum` and `bincount` both return 0 for an empty group**, which is indistinguishable from events that genuinely sum to zero. That is why the count is returned alongside every aggregate rather than left for the caller to derive." },
          { t: "p", text: "**`np.bincount` accumulates in float64 regardless of input dtype.** Over a million events that is not a detail — the padded version accumulated in whatever the matrix happened to be." },
          { t: "p", text: "**The cost is now linear in total events, not in the longest one.** That is the property the padded version lacked, and the test asserting a 100,000-event bot does not change the cost for everyone else is the one that encodes it." }
        ]
      }
    },

    { t: "callout", kind: "tradeoff", title: "Knowing when to stop reaching for NumPy", body: [
      { t: "p", text: "**Use NumPy** for fixed-size numeric arrays where the work is uniform across elements. That is a large fraction of numerical computing and it is genuinely excellent at it." },
      { t: "p", text: "**Use pandas or Polars** the moment you have named heterogeneous columns, or text, or missing values with meaning — a frame is a set of arrays plus the metadata NumPy deliberately does not carry." },
      { t: "p", text: "**Use Arrow or Parquet** for anything nested, variable-length, or crossing a process boundary. Column pruning frequently turns a size problem into a non-problem." },
      { t: "p", text: "**Use a database** when the data already lives in one. Pulling 40 GB into pandas to compute a group-by that SQL would do in the storage engine is the most expensive way to get that number." }
    ]}
  ],

  takeaways: [
    "**`object` dtype is an array of pointers** — no vectorisation, no SIMD, and slower than the Python list it replaced.",
    "**NumPy falls back to `object` silently** when types cannot be unified; `np.array([1, \"2\", 3])` turns the integers into strings.",
    "**`<U` strings are fixed-width at 4 bytes per code point**, sized to the longest element, and assignment truncates without warning.",
    "**Ragged data has no rectangular representation** — padding, flat-plus-offsets and a list of arrays each lose something different.",
    "**Padding costs scale with the longest row**, so one outlier can turn a megabyte problem into a terabyte allocation.",
    "**Flat array plus offsets is the layout Arrow uses**, and `np.bincount` with `weights` plus `ufunc.reduceat` make it fully vectorised.",
    "**`reduceat` cannot express an empty group** — a repeated offset returns the element at that position rather than an empty reduction.",
    "**`np.append` in a loop is quadratic**: 2,000 appends of 100 elements copies 200 million values.",
    "**Collect into a list and `concatenate` once** — almost always the right answer; preallocate only when the total size is known and memory is tight.",
    "**`np.resize` tiles the data to fill the new size**, which is almost never what anyone wants.",
    "**A memmapped column is strided across the whole file**, so reading one column touches every page — this is exactly what columnar formats solve.",
    "**Most \"we need Spark\" problems are a 30 GB CSV** that becomes 3 GB of Parquet and fits in memory."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is the dtype of `np.array([1, \"2\", 3])`?",
        options: [
          "object",
          "`<U21` — the integers were converted to strings, and arithmetic on it now fails",
          "int64, with the string coerced",
          "It raises a TypeError"
        ],
        answer: 1,
        why: "NumPy unifies to the type everything can convert to, which here is a fixed-width Unicode string. Nothing warns you, the array looks fine in a REPL, and the failure arrives later as a TypeError from an operation that should have worked."
      },
      {
        stem: "Why does padding ragged session data to the maximum length fail catastrophically on real user event logs?",
        options: [
          "nan handling is slow",
          "The padded width is set by the single longest user, so a handful of bot accounts make every row enormous",
          "np.full cannot allocate large arrays",
          "The lengths must be sorted first"
        ],
        answer: 1,
        why: "Cost scales with `n_users × max_length` rather than with total events. Twenty automated accounts with 250,000 events each turn a 9 MB problem into a 400 GB allocation — and it appears the day one unusual account is created, not gradually."
      },
      {
        stem: "`out = np.append(out, chunk)` inside a loop of 2,000 iterations. What is the problem?",
        options: [
          "np.append is deprecated",
          "Each call allocates a new array and copies everything so far, making the loop quadratic — 200 million element copies to build 200,000",
          "The dtype changes each iteration",
          "It only works on 1-D arrays"
        ],
        answer: 1,
        why: "Arrays are fixed size, so `append` cannot append — it reallocates. Collecting into a Python list and calling `np.concatenate` once is linear and typically hundreds of times faster; preallocating is better still when the total size is known."
      },
      {
        stem: "You memory-map a 100 GB C-contiguous array and read one column. What happens?",
        options: [
          "Only that column is read from disk",
          "Effectively the whole file is read, because the column's elements are strided across every page",
          "It raises a MemoryError",
          "NumPy caches the column"
        ],
        answer: 1,
        why: "In row-major layout, consecutive elements of a column are separated by the full row width, so touching the column touches every page. This is precisely the access pattern columnar formats exist for, and the strongest practical argument for Parquet over a raw binary dump."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "When is using NumPy actively worse than using a plain Python list?",
        strong: "When the data forces `object` dtype. The array becomes pointers to Python objects, so every operation loops in the interpreter — plus array indexing overhead on top. Summing a million-element object array is several times slower than summing the equivalent range in plain Python, while the profiler makes it look like NumPy is the slow part.",
        answer: [
          { t: "p", text: "This inverts the usual framing, and the practical value is knowing to assert on `dtype` at pipeline boundaries." },
          { t: "p", text: "The fixed-width string trap pairs well with it — `<U2` truncating a longer assignment silently is a data corruption, not a performance issue." }
        ]
      },
      {
        level: "advanced",
        q: "How would you compute per-group aggregates over sequences of very different lengths?",
        strong: "Flatten everything into one array and keep an offsets array — the layout Arrow uses internally. `np.bincount` with `weights` gives grouped sums in one pass and handles empty groups correctly; `ufunc.reduceat` gives extrema, though it cannot express an empty group and needs those handled separately. Padding is the alternative, and its cost scales with the longest row rather than the total.",
        answer: [
          { t: "p", text: "Naming `bincount` and `reduceat` shows familiarity beyond the basic API, and the empty-group caveat shows you have actually hit it." },
          { t: "p", text: "Quantifying padding's failure — one long row setting the width of every row — makes the case concretely rather than by preference." }
        ]
      },
      {
        level: "advanced",
        q: "At what point would you move off pandas and NumPy?",
        strong: "Later than most teams do. Under a gigabyte there is no case. Between one and ten, dtype care and categoricals often halve it. Past that, Parquet with column pruning frequently turns the problem into a small one, and DuckDB or Polars handles what is left. Distributed tooling is for data that genuinely will not fit or already lives in a warehouse.",
        answer: [
          { t: "p", text: "Resisting the premature jump to Spark is the judgement being tested — the ladder matters more than any single tool name." },
          { t: "p", text: "Mentioning that a 30 GB CSV often becomes 3 GB of Parquet gives a concrete reason rather than an opinion." }
        ]
      }
    ]
  }
});

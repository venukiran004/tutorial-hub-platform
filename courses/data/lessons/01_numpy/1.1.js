/* ============================================================================
   LESSON 1.1 — The ndarray: dtype, shape and strides
   ========================================================================= */
EC.receiveLesson({
  id: "1.1",

  lede: "**A NumPy array is one contiguous block of memory plus a description of how to walk it.** That description — dtype, shape and strides — explains why reshaping is free, why a slice can share memory with its parent, and why an array of a million integers is forty times smaller than the equivalent Python list.",

  objectives: [
    "Describe what an ndarray holds and what it does not",
    "Predict an array's memory footprint from its dtype and shape",
    "Explain why reshape and transpose cost nothing",
    "Choose a dtype deliberately rather than accepting the default",
    "Recognise when an operation must copy"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "One block of memory, and a way to read it", id: "model" },

    { t: "p", text: "A Python list of numbers is a list of **pointers** to separate integer objects scattered across the heap. A NumPy array is a single block of raw bytes with no per-element object at all — which is where both the speed and the memory saving come from." },

    { t: "dl", items: [
      ["ndarray", "NumPy's array type. A contiguous buffer plus metadata describing how to interpret it."],
      ["dtype", "The type of every element, and therefore its size in bytes. `int64` is 8 bytes, `float32` is 4, and every element has the same one."],
      ["shape", "A tuple giving the length along each dimension. `(3, 4)` is three rows of four."],
      ["strides", "How many **bytes** to step to move one position along each dimension. This is the piece that makes views possible."],
      ["itemsize", "Bytes per element — `dtype.itemsize`. Total memory is roughly `prod(shape) × itemsize`."],
      ["homogeneous", "Every element shares one dtype. Mixing types forces `object` dtype, which discards every advantage."]
    ]},

    { t: "viz",
      title: "A list of pointers against a block of bytes",
      caption: "The list stores addresses of objects living elsewhere; the array stores the values themselves, side by side. That is why one is cache-friendly and the other is not.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="A Python list of pointers to scattered integer objects, beside a NumPy array of contiguous values">
  <text x="30" y="34" class="s-label" style="fill:var(--crit)">Python list [1, 2, 3, 4]</text>
  <g style="stroke-width:2">
    <rect x="30" y="46" width="44" height="30" style="fill:var(--crit);fill-opacity:.14;stroke:var(--crit)"/>
    <rect x="78" y="46" width="44" height="30" style="fill:var(--crit);fill-opacity:.14;stroke:var(--crit)"/>
    <rect x="126" y="46" width="44" height="30" style="fill:var(--crit);fill-opacity:.14;stroke:var(--crit)"/>
    <rect x="174" y="46" width="44" height="30" style="fill:var(--crit);fill-opacity:.14;stroke:var(--crit)"/>
  </g>
  <text x="42" y="66" class="s-sub" style="fill:var(--ink-3)">ptr</text>
  <text x="90" y="66" class="s-sub" style="fill:var(--ink-3)">ptr</text>
  <text x="138" y="66" class="s-sub" style="fill:var(--ink-3)">ptr</text>
  <text x="186" y="66" class="s-sub" style="fill:var(--ink-3)">ptr</text>

  <g style="stroke:var(--crit);stroke-width:1.5">
    <line x1="52" y1="78" x2="90" y2="128" marker-end="url(#nd-c)"/>
    <line x1="100" y1="78" x2="200" y2="150" marker-end="url(#nd-c)"/>
    <line x1="148" y1="78" x2="40" y2="150" marker-end="url(#nd-c)"/>
    <line x1="196" y1="78" x2="150" y2="180" marker-end="url(#nd-c)"/>
  </g>
  <g style="fill:var(--crit);fill-opacity:.2;stroke:var(--crit)" stroke-width="1.5">
    <rect x="70" y="128" width="40" height="24" rx="4"/>
    <rect x="180" y="150" width="40" height="24" rx="4"/>
    <rect x="20" y="150" width="40" height="24" rx="4"/>
    <rect x="130" y="180" width="40" height="24" rx="4"/>
  </g>
  <text x="30" y="226" class="s-sub" style="fill:var(--crit)">28 bytes per int object, scattered</text>

  <text x="470" y="34" class="s-label" style="fill:var(--good)">np.array([1, 2, 3, 4])</text>
  <g style="stroke-width:2">
    <rect x="470" y="46" width="60" height="30" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="530" y="46" width="60" height="30" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="590" y="46" width="60" height="30" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="650" y="46" width="60" height="30" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
  </g>
  <text x="494" y="66" class="s-sub" style="fill:var(--ink-2)">1</text>
  <text x="554" y="66" class="s-sub" style="fill:var(--ink-2)">2</text>
  <text x="614" y="66" class="s-sub" style="fill:var(--ink-2)">3</text>
  <text x="674" y="66" class="s-sub" style="fill:var(--ink-2)">4</text>
  <line x1="470" y1="88" x2="710" y2="88" style="stroke:var(--good);stroke-width:1.5"/>
  <text x="470" y="108" class="s-sub" style="fill:var(--good)">8 bytes each, one after another</text>

  <text x="470" y="150" class="s-sub" style="fill:var(--ink-3)">strides = (8,) — step 8 bytes for the next element</text>
  <text x="470" y="174" class="s-sub" style="fill:var(--ink-3)">the CPU prefetches the whole block into cache</text>
  <text x="470" y="204" class="s-sub" style="fill:var(--ink-3)">no per-element object, no pointer chase,</text>
  <text x="470" y="226" class="s-sub" style="fill:var(--ink-3)">no type check inside the loop</text>

  <defs><marker id="nd-c" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--crit)"/></marker></defs>
</svg>`
    },

    { t: "code", lang: "python", title: "the three attributes, and what they cost", code: `
import numpy as np
import sys

a = np.array([[1, 2, 3, 4],
              [5, 6, 7, 8],
              [9, 10, 11, 12]])

a.dtype                       # dtype('int64')  -- one type for everything
a.shape                       # (3, 4)
a.strides                     # (32, 8)  BYTES, not elements
a.itemsize                    # 8
a.nbytes                      # 96 = 3 * 4 * 8

# READ THE STRIDES: to move one row down, step 32 bytes (four int64s).
# To move one column right, step 8. That is the entire layout rule.

# THE MEMORY COMPARISON, measured rather than asserted:
lst = list(range(1_000_000))
arr = np.arange(1_000_000)

sys.getsizeof(lst)            # 8,000,056 bytes -- just the POINTERS
sum(sys.getsizeof(i) for i in lst[:1000]) * 1000    # ~28 MB of int objects
arr.nbytes                    # 8,000,000 bytes -- the values themselves
#
# The list needs 8 MB of pointers PLUS 28 MB of objects. The array needs
# 8 MB total, and a smaller dtype makes it smaller still:
np.arange(1_000_000, dtype=np.int32).nbytes         # 4,000,000
np.arange(1_000_000, dtype=np.int16).nbytes         # 2,000,000

# DTYPE IS A DECISION, and the default is not always right:
np.array([1, 2, 3]).dtype                   # int64 on Linux/macOS
np.array([1.0, 2.0]).dtype                  # float64
np.array([1, 2.0]).dtype                    # float64 -- one type wins
np.array([1, "two"]).dtype                  # <U21 -- everything became a string

# MIXING TYPES IS THE FAILURE MODE. Anything NumPy cannot unify becomes
# object dtype, which stores pointers again and loses every advantage:
mixed = np.array([1, "two", 3.0, None], dtype=object)
mixed.dtype                                 # object
mixed.nbytes                                # 32 -- four pointers
#
# An object array is a Python list wearing an array's interface: no
# vectorisation, no C loop, and often slower than the list was.

# THE RANGE A DTYPE CAN HOLD IS FINITE, and it wraps silently:
small = np.array([127], dtype=np.int8)
small + 1                                   # array([-128]) -- overflow
np.iinfo(np.int8)                           # min=-128, max=127
np.finfo(np.float32).eps                    # 1.19e-07
`,
      hl: [11, 12, 26, 45],
      caption: "**Strides are in bytes, not elements.** Reading `(32, 8)` tells you the row stride is four `int64`s — which is the whole of how NumPy locates any element without storing an index."
    },

    { t: "h2", n: "02", text: "Why reshape and transpose are free", id: "free" },

    { t: "p", text: "**Reshaping does not move data — it rewrites the shape and strides.** The bytes stay exactly where they are, and only the rule for walking them changes. That is why these operations cost microseconds regardless of array size." },

    { t: "dl", items: [
      ["View", "A new array object pointing at the **same** memory, with different shape or strides. Created by reshape, transpose and basic slicing."],
      ["Copy", "New memory with the data duplicated. Created by fancy indexing, most arithmetic, and any operation that cannot be expressed as a stride pattern."],
      ["`base`", "A view's `.base` attribute points at the array owning the memory. `None` means this array owns its own."],
      ["C-contiguous", "Row-major: the last axis varies fastest. NumPy's default, and what most C libraries expect."],
      ["F-contiguous", "Column-major, as Fortran and MATLAB use. A transpose of a C-contiguous array is F-contiguous."]
    ]},

    { t: "code", lang: "python", title: "the same bytes, read four ways", code: `
a = np.arange(12)
a.strides                     # (8,)

b = a.reshape(3, 4)
b.strides                     # (32, 8)  -- same memory, new walking rule
b.base is a                   # True -- b does not own its data

c = b.T
c.shape, c.strides            # (4, 3), (8, 32)  -- strides SWAPPED
c.base is a                   # True -- still the same bytes

# PROVE THEY SHARE MEMORY:
b[0, 0] = 999
a[0]                          # 999 -- the write went to the shared buffer
c[0, 0]                       # 999

np.shares_memory(a, c)        # True

# TIMING MAKES THE POINT: reshaping 100 million elements is free.
big = np.arange(100_000_000)
# %timeit big.reshape(10_000, 10_000)     ->  ~200 ns, independent of size
# %timeit big.copy()                      ->  ~200 ms, a million times slower

# WHEN A RESHAPE CANNOT BE A VIEW, NumPy copies silently:
d = np.arange(12).reshape(3, 4).T         # F-contiguous view
d.flags['C_CONTIGUOUS']                   # False
e = d.reshape(12)                         # cannot express as strides
e.base is d                               # False -- a copy happened
#
# It still works, and it now costs memory proportional to the array.
# For a 10 GB array that difference matters, and nothing warns you.

# ravel() TRIES for a view; flatten() ALWAYS copies:
np.shares_memory(a, b.ravel())            # True where possible
np.shares_memory(a, b.flatten())          # False, always

# CONTIGUITY AFFECTS SPEED, not just correctness:
row_major = np.ones((5000, 5000))
col_major = np.asfortranarray(row_major)
# summing along the fast axis is several times quicker, because the
# CPU reads consecutive cache lines rather than jumping 40 KB per step
# %timeit row_major.sum(axis=1)      -> faster
# %timeit col_major.sum(axis=1)      -> slower, same data

np.ascontiguousarray(d).flags['C_CONTIGUOUS']    # True, at the cost of a copy
`,
      hl: [6, 10, 30, 44],
      caption: "**A transpose just swaps the strides.** No element moves, which is why transposing a 10 GB array takes the same time as transposing a 10-element one."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**Picture a long ribbon of bytes and a rule for walking it.** `shape` says how far to walk in each direction; `strides` says how big a step is. Everything NumPy does to an array's *structure* is a change to that rule, not to the ribbon." },
      { t: "p", text: "So the question \"did this copy?\" becomes concrete: **can the result be described by a shape and a set of strides over the existing bytes?** If yes, it is a view and it was free. If no — because the elements you want are not evenly spaced — NumPy must build a new ribbon." }
    ]},

    { t: "h2", n: "03", text: "Choosing a dtype on purpose", id: "dtype" },

    { t: "p", text: "The default dtype is chosen for safety, not for size. **On a large dataset, picking dtypes deliberately routinely cuts memory by 50–75%** — and on a frame that no longer fits in RAM, that is the difference between working and not." },

    { t: "table",
      head: ["dtype", "Bytes", "Range or precision", "Use when"],
      rows: [
        ["`int8`", "1", "−128 to 127", "Small counts, flags, encoded categories"],
        ["`int16`", "2", "±32,767", "Years, small IDs, quantities"],
        ["`int32`", "4", "±2.1 billion", "Most identifiers and counts"],
        ["`int64`", "8", "±9.2 × 10¹⁸", "**The default** — usually more than needed"],
        ["`float32`", "4", "~7 significant digits", "Features, embeddings, most ML input"],
        ["`float64`", "8", "~16 significant digits", "**The default** — needed for accumulation and money"],
        ["`bool`", "1", "True / False", "Masks — note it is 1 byte, not 1 bit"]
      ],
      caption: "**`float32` gives about seven significant digits.** That is ample for model features and nowhere near enough for summing a million values or holding a currency amount."
    },

    { t: "code", lang: "python", title: "what downcasting saves and what it risks", code: `
rng = np.random.default_rng(0)

# A REALISTIC FEATURE MATRIX:
X = rng.normal(size=(1_000_000, 20))
X.nbytes / 1e6                          # 160 MB as float64
X.astype(np.float32).nbytes / 1e6       # 80 MB -- half, and plenty of
                                        # precision for a model feature

# INTEGER COLUMNS ARE USUALLY MASSIVELY OVERSIZED:
ages = rng.integers(0, 120, 1_000_000)
ages.dtype, ages.nbytes / 1e6           # int64, 8 MB
ages.astype(np.int8).nbytes / 1e6       # 1 MB -- ages fit in int8

def smallest_int_dtype(a):
    """Pick the narrowest integer dtype that holds this array's range."""
    lo, hi = a.min(), a.max()
    for dt in (np.int8, np.int16, np.int32, np.int64):
        info = np.iinfo(dt)
        if lo >= info.min and hi <= info.max:
            return dt
    raise ValueError("out of integer range")

smallest_int_dtype(ages)                # <class 'numpy.int8'>

# THE RISK IS SILENT OVERFLOW, and NumPy does not warn:
counts = np.array([200, 100], dtype=np.int8)     # 200 > 127 already
counts                                  # array([-56, 100]) -- wrapped
#
# ALWAYS CHECK THE RANGE BEFORE DOWNCASTING, and re-check when new data
# arrives. A column that fit in int8 last quarter may not this quarter.

# FLOAT32 ACCUMULATION LOSES REAL PRECISION:
big = np.ones(10_000_000, dtype=np.float32)
big.sum()                               # 10,000,000.0 -- but not always
noisy = np.full(10_000_000, 0.1, dtype=np.float32)
noisy.sum()                             # 999,999.9  -- error accumulates
np.full(10_000_000, 0.1, dtype=np.float64).sum()   # 1,000,000.0000001
#
# NumPy uses pairwise summation, which limits the damage -- a naive loop
# would be far worse. But the rule holds: STORE in float32, ACCUMULATE
# in float64.
noisy.sum(dtype=np.float64)             # 1,000,000.0 -- one keyword
`,
      hl: [8, 30, 40, 47],
      caption: "**Store in `float32`, accumulate in `float64`.** The `dtype=` argument on `.sum()` is one keyword and it removes a whole class of quiet precision loss."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Cut a feature matrix to fit in memory",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "A feature matrix will not load on the training box. You have the column descriptions and need to bring it under 4 GB without damaging anything the model needs." },
        { t: "code", lang: "python", numbered: false, title: "the columns", code: `
# 12,000,000 rows. Currently every column is float64 or int64.
#
#  name              current   observed range          notes
#  user_id           int64     1 .. 11,400,000         identifier
#  age               int64     18 .. 97
#  country_code      int64     0 .. 195                encoded category
#  session_count     int64     0 .. 4,300
#  total_spend       float64   0.0 .. 84,000.55        currency
#  score_1..score_8  float64   -4.2 .. 4.9             model features
#  is_active         int64     0 or 1                  flag
#
# Current footprint: 12,000,000 x 13 columns x 8 bytes = 1.25 GB per
# copy -- and the pipeline holds three copies at once.`},
        { t: "p", text: "Give the dtype for each column, the resulting footprint, and say which choices carry a risk." }
      ],
      requirements: [
        "Assign a dtype to every column with a justification.",
        "Compute the before and after footprint.",
        "Identify any column that must not be downcast, and say why.",
        "Say what could later break each choice.",
        "Write a reusable function that proposes dtypes from data.",
        "Include tests."
      ],
      hint: "One of these columns is currency. Think about what happens after a year of growth for the identifier.",
      solution: {
        lang: "python",
        title: "downcast.py",
        code: `import numpy as np

ROWS = 12_000_000


# =========================================================================
# COLUMN BY COLUMN
# =========================================================================
#
#  user_id       int64 -> int32
#      Range reaches 11.4 million; int32 holds 2.1 billion. Safe for
#      roughly 180x the current user base.
#      RISK: none realistically, but it IS an identifier -- if these are
#      ever concatenated with another system's ids, revisit.
#
#  age           int64 -> int8
#      18..97 fits comfortably in -128..127.
#      RISK: a sentinel value. If missing age is ever coded as 999 or
#      -1, 999 overflows int8 and becomes -25 silently.
#
#  country_code  int64 -> uint8
#      0..195 fits in 0..255 exactly.
#      RISK: this is the tightest fit here. 255 country codes is not
#      much headroom if the encoding is ever extended to regions.
#      int16 costs 12 MB more and removes the worry entirely.
#
#  session_count int64 -> int16
#      0..4,300 fits in 32,767.
#      RISK: a bot or a stuck client could exceed 32,767 sessions. This
#      is a plausible failure, so int32 may be the safer choice.
#
#  total_spend   float64 -> KEEP float64
#      CURRENCY. float32 gives ~7 significant digits, and 84,000.55
#      needs 7 already. Any sum over the column loses pennies, and a
#      total that does not reconcile is a real incident.
#      This is the column that must not be touched.
#
#  score_1..8    float64 -> float32
#      Model features in -4.2..4.9. float32 gives ~7 digits, which is
#      far more than the signal in a feature.
#      This is where nearly all the saving is: 8 of the 13 columns.
#
#  is_active     int64 -> bool
#      A flag. bool is 1 byte -- not 1 bit, which surprises people.


SCHEMA = {
    "user_id":       np.int32,
    "age":           np.int8,
    "country_code":  np.uint8,
    "session_count": np.int32,      # deliberately not int16 -- see risk
    "total_spend":   np.float64,    # currency: do not touch
    "is_active":     np.bool_,
}
for i in range(1, 9):
    SCHEMA[f"score_{i}"] = np.float32


def footprint(schema, rows=ROWS):
    return sum(np.dtype(dt).itemsize for dt in schema.values()) * rows


before = 13 * 8 * ROWS
after = footprint(SCHEMA)

before / 1e9                        # 1.248 GB
after / 1e9                         # 0.492 GB
1 - after / before                  # 0.606 -- a 61% reduction

# THE PIPELINE HELD THREE COPIES:
before * 3 / 1e9                    # 3.74 GB -- over the limit
after * 3 / 1e9                     # 1.48 GB -- comfortable


# =========================================================================
# WHERE THE SAVING ACTUALLY CAME FROM
# =========================================================================
per_col = {c: np.dtype(dt).itemsize * ROWS / 1e6 for c, dt in SCHEMA.items()}
saved = {c: (8 * ROWS / 1e6) - mb for c, mb in per_col.items()}
sorted(saved.items(), key=lambda kv: -kv[1])[:4]
# [('age', 84.0), ('country_code', 84.0), ('is_active', 84.0), ...]
#
# Per column the small integers save most, but there are EIGHT score
# columns, so float32 accounts for 384 MB of the 756 MB saved -- more
# than half. The lesson: look at column COUNT, not just column width.
sum(v for k, v in saved.items() if k.startswith("score"))    # 384.0 MB


# =========================================================================
# PROPOSING DTYPES FROM DATA
# =========================================================================

def propose_dtype(a, name="", currency=False, headroom=4.0):
    """Suggest the narrowest safe dtype for an array.

    headroom multiplies the observed range before choosing, because the
    next batch of data is not bounded by this one. A downcast that fits
    exactly today is a downcast that overflows next quarter.
    """
    a = np.asarray(a)

    if currency:
        return np.float64, "currency -- precision is not negotiable"

    if a.dtype == np.bool_ or set(np.unique(a)) <= {0, 1}:
        return np.bool_, "binary flag"

    if np.issubdtype(a.dtype, np.integer):
        lo, hi = int(a.min()), int(a.max())
        hi_pad = int(hi * headroom) if hi > 0 else hi
        lo_pad = int(lo * headroom) if lo < 0 else lo
        for dt in (np.int8, np.int16, np.int32, np.int64):
            info = np.iinfo(dt)
            if lo_pad >= info.min and hi_pad <= info.max:
                return dt, f"range [{lo}, {hi}] with {headroom}x headroom"
        return np.int64, "range needs the full width"

    if np.issubdtype(a.dtype, np.floating):
        # float32 carries ~7 significant digits.
        largest = float(np.abs(a).max())
        if largest >= 1e6:
            return np.float64, f"magnitude {largest:.3g} exceeds float32 precision"
        # Check the round trip actually preserves what we care about.
        err = np.abs(a.astype(np.float32).astype(np.float64) - a).max()
        rel = err / max(largest, 1e-12)
        if rel > 1e-6:
            return np.float64, f"float32 round trip loses {rel:.2g} relative"
        return np.float32, f"float32 round trip error {rel:.2g}"

    return a.dtype, "left unchanged"


rng = np.random.default_rng(0)
propose_dtype(rng.integers(18, 98, 10_000), "age")
# (int16, 'range [18, 97] with 4.0x headroom')
#
# NOTE IT CHOOSES int16, NOT int8 -- because 97 x 4 = 388 exceeds 127.
# That is the headroom doing its job, and it costs 12 MB to avoid a
# class of silent-overflow bug.

propose_dtype(rng.normal(0, 2, 10_000), "score")        # float32
propose_dtype(np.array([0.0, 84_000.55]), currency=True)  # float64


# =========================================================================
# WHAT COULD BREAK EACH CHOICE
# =========================================================================
#
# 1. SENTINEL VALUES. -1, 999 or 9999 used for "missing" blow past a
#    narrow integer range. Check for them BEFORE downcasting:
def has_sentinels(a, sentinels=(-1, -999, 999, 9999)):
    return sorted(set(np.unique(a)) & set(sentinels))
#
# 2. GROWTH. An id column bounded today is not bounded next year. The
#    headroom multiplier exists for this.
#
# 3. NEW CATEGORIES. uint8 for country_code has 60 spare values. A
#    schema change that adds sub-regions overflows it.
#
# 4. AGGREGATION. Downcasting storage is safe; downcasting the
#    ACCUMULATOR is not:
scores = rng.normal(0, 2, 12_000_000).astype(np.float32)
scores.sum()                        # loses precision
scores.sum(dtype=np.float64)        # correct, same storage
#
# 5. LIBRARY BOUNDARIES. Some libraries silently upcast to float64 on
#    input, so the saving disappears at the first model call. Measure
#    where the peak actually is, rather than assuming it is at load.


# =========================================================================
# TESTS
# =========================================================================

def test_reduction_meets_the_target():
    assert footprint(SCHEMA) * 3 / 1e9 < 4.0
    assert 1 - footprint(SCHEMA) / (13 * 8 * ROWS) > 0.5


def test_currency_is_not_downcast():
    assert SCHEMA["total_spend"] == np.float64
    dt, why = propose_dtype(np.array([0.0, 84_000.55]), currency=True)
    assert dt == np.float64 and "currency" in why


def test_score_columns_dominate_the_saving():
    saved_scores = sum((8 - 4) * ROWS for _ in range(8)) / 1e6
    total_saved = (13 * 8 * ROWS - footprint(SCHEMA)) / 1e6
    assert saved_scores / total_saved > 0.5


def test_headroom_prevents_a_tight_fit():
    """97 fits in int8; 97 with 4x headroom does not."""
    ages = np.array([18, 97], dtype=np.int64)
    dt, _ = propose_dtype(ages, headroom=4.0)
    assert np.dtype(dt).itemsize > 1

    tight, _ = propose_dtype(ages, headroom=1.0)
    assert tight == np.int8


def test_float32_rejected_when_magnitude_is_large():
    dt, why = propose_dtype(np.array([1e7, 2e7]))
    assert dt == np.float64


def test_overflow_is_silent_without_the_check():
    """The failure this whole exercise is guarding against."""
    counts = np.array([200, 100], dtype=np.int8)

    assert counts[0] == -56          # no error, no warning


def test_accumulator_dtype_matters():
    a = np.full(10_000_000, 0.1, dtype=np.float32)

    assert abs(a.sum() - 1_000_000) > 1
    assert abs(a.sum(dtype=np.float64) - 1_000_000) < 1`,
        notes: [
          { t: "p", text: "**`total_spend` is the column that must not be touched.** `float32` carries about seven significant digits and 84,000.55 already needs seven — so any sum over the column loses pennies, and a total that does not reconcile is a real incident." },
          { t: "callout", kind: "insight", title: "The saving is in the column count, not the column width", body: [
            { t: "p", text: "Per column the small integers look like the win — 84 MB each from `age`, `country_code` and `is_active`. But there are **eight** score columns, so `float32` alone accounts for 384 MB of the 756 MB saved." },
            { t: "p", text: "When deciding where to spend effort on a wide frame, count how many columns share each treatment before optimising the narrowest one." }
          ]},
          { t: "p", text: "**The headroom multiplier chooses `int16` for age, not `int8`.** That looks over-cautious until you consider a sentinel: if missing age is ever coded as 999, `int8` turns it into −25 with no error and no warning." },
          { t: "p", text: "**`session_count` is deliberately `int32` rather than `int16`.** The observed maximum is 4,300, but a stuck client or a bot plausibly exceeds 32,767 — and this is exactly the kind of range that holds until the day it does not." },
          { t: "p", text: "**Downcasting storage is safe; downcasting the accumulator is not.** `scores.sum(dtype=np.float64)` keeps the memory saving and removes the precision loss, and it is one keyword." },
          { t: "p", text: "**Measure where the peak actually is.** Some libraries upcast to `float64` on input, so a carefully halved frame doubles again at the first model call — and the work bought nothing." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A pipeline that had run nightly for a year started producing negative order quantities. Nothing in the code had changed." },
      { t: "p", text: "**A quantity column had been stored as `int16` during an earlier memory optimisation**, with a maximum observed value around 8,000. A bulk order of 40,000 units arrived and wrapped to −25,536." },
      { t: "p", text: "**NumPy raised nothing.** Integer overflow wraps silently by design, so the value flowed through aggregation, into a report, and into a supplier order before anyone noticed the sign." },
      { t: "p", text: "**Downcast with headroom, and assert the range at load.** A one-line `assert df.quantity.max() < 30000` at ingestion turns a silent corruption into a loud failure at the point it can still be fixed." }
    ]}
  ],

  takeaways: [
    "**An ndarray is one contiguous buffer plus a dtype, a shape and strides** — the metadata is the whole design.",
    "**Strides are in bytes**, so `(32, 8)` on an `int64` array means a row step is four elements.",
    "**A Python list stores pointers to scattered objects**; an array stores the values side by side, which is where both speed and memory savings come from.",
    "**Every element shares one dtype.** Mixing types forces `object` dtype, which is a list wearing an array's interface.",
    "**Reshape and transpose are free** because they rewrite shape and strides without moving a byte.",
    "**A view shares memory with its parent**; `.base` tells you which array owns it, and `np.shares_memory` settles any doubt.",
    "**Some reshapes cannot be expressed as strides and silently copy** — `ravel` tries for a view, `flatten` always copies.",
    "**Contiguity affects speed as well as correctness**: summing along the fast axis reads consecutive cache lines.",
    "**`float32` carries about seven significant digits** — ample for model features, not enough for currency or long accumulation.",
    "**Store in `float32` and accumulate in `float64`** using the `dtype=` argument on reductions.",
    "**Integer overflow wraps silently**, with no error and no warning, which makes it a corruption rather than a crash.",
    "**Downcast with headroom and assert the range at load**, because the next batch of data is not bounded by this one."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`a.strides` returns `(32, 8)` for an `int64` array. What does that mean?",
        options: [
          "The array has 32 rows and 8 columns",
          "Moving one row costs 32 bytes — four elements — and moving one column costs 8 bytes",
          "The array uses 32 bytes total",
          "The first axis has stride 32 elements"
        ],
        answer: 1,
        why: "Strides are always in bytes, never elements. This is the metadata that lets a transpose swap two numbers instead of moving any data, and it is why reshaping a 10 GB array costs the same as reshaping a tiny one."
      },
      {
        stem: "You store a quantity column as `int16` and a value of 40,000 arrives. What happens?",
        options: [
          "NumPy raises an OverflowError",
          "It wraps silently to −25,536 and flows through the pipeline as a valid number",
          "It is clipped to 32,767",
          "The dtype is automatically widened"
        ],
        answer: 1,
        why: "Integer overflow in NumPy is silent by design. That makes it a data corruption rather than a crash — which is why downcasting needs headroom and a range assertion at load rather than a one-off check against today's data."
      },
      {
        stem: "Which column should not be downcast from `float64` to `float32`?",
        options: [
          "A model feature ranging −4.2 to 4.9",
          "A currency total reaching 84,000.55, because `float32`'s seven significant digits are already exhausted",
          "An embedding vector",
          "A normalised score"
        ],
        answer: 1,
        why: "`float32` gives roughly seven significant digits, and 84,000.55 needs seven. Sums over the column would lose pennies — and a total that does not reconcile is an incident, unlike a feature whose seventh digit is noise anyway."
      },
      {
        stem: "`b = a.reshape(3, 4); b[0, 0] = 999`. What is `a[0]`?",
        options: [
          "Unchanged, because reshape returns a new array",
          "999 — reshape returns a view sharing the same memory",
          "An error, because shapes differ",
          "It depends on the dtype"
        ],
        answer: 1,
        why: "Reshape rewrites the shape and strides over the existing buffer, so `b.base is a` and writes go to the shared memory. When a reshape *cannot* be expressed as strides — such as on a transposed array — NumPy copies instead, silently."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why is a NumPy array faster than a Python list of numbers?",
        strong: "Because it stores raw values contiguously rather than pointers to separate objects. That means no per-element type check, no pointer chase, and the CPU can prefetch whole cache lines — plus the operations run as compiled C loops rather than interpreted ones.",
        answer: [
          { t: "p", text: "Naming the memory layout rather than just \"it's written in C\" is what makes the answer substantive." },
          { t: "p", text: "The memory comparison is worth quoting: a million-element list needs about 36 MB across pointers and objects, and the array needs 8 MB." }
        ]
      },
      {
        level: "advanced",
        q: "How can you tell whether a NumPy operation copied or returned a view?",
        strong: "Check `.base` — a view points at the array owning the memory — or use `np.shares_memory`. The rule underneath is whether the result can be described by a shape and strides over the existing bytes: basic slicing and transpose can, fancy indexing cannot.",
        answer: [
          { t: "p", text: "Giving the underlying rule rather than a list of which functions copy shows you could work out an unfamiliar case." },
          { t: "p", text: "Noting that a reshape of a non-contiguous array copies silently is the detail that catches people out on large data." }
        ]
      },
      {
        level: "advanced",
        q: "How would you halve the memory of a large feature matrix?",
        strong: "Downcast deliberately: `float32` for model features, the narrowest safe integer for counts and encoded categories, `bool` for flags. But keep `float64` for currency and for any accumulator, and add headroom plus a range assertion so the next batch cannot overflow silently.",
        answer: [
          { t: "p", text: "Naming what must *not* be downcast is what distinguishes this from a mechanical answer." },
          { t: "p", text: "The store-in-32-accumulate-in-64 point is practical and few people mention it." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 2.5 — Writing Your Own Vectorised Operation
   ========================================================================= */
EC.receiveLesson({
  id: "2.5",

  lede: "**Every ufunc carries four methods most people never use — `reduce`, `accumulate`, `outer` and `at` — and two keywords, `out=` and `where=`, that eliminate temporaries.** Between them they express a surprising amount of the work people write loops for.",

  objectives: [
    "Use the ufunc methods to express reductions, scans and pairwise operations",
    "Eliminate intermediate allocations with `out=` and `where=`",
    "Compose existing ufuncs rather than writing a Python-level function",
    "Recognise that `np.vectorize` and `frompyfunc` do not vectorise",
    "Know when numba is the honest answer"
  ],

  prerequisites: ["1.2", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "The methods every ufunc already has", id: "methods" },

    { t: "p", text: "`np.add` is not just a function — it is an object with methods. **`np.add.reduce` is `sum`, `np.add.accumulate` is `cumsum`, and the same pattern works for every binary ufunc**, including ones with no dedicated function of their own." },

    { t: "dl", items: [
      ["ufunc", "A compiled function applying element-wise with broadcasting, dtype dispatch and the four methods below. `np.add`, `np.maximum`, `np.logical_and` are all ufuncs."],
      ["`.reduce(a)`", "Collapses an axis by repeatedly applying the operation. `np.add.reduce` is `sum`; `np.maximum.reduce` is `max`."],
      ["`.accumulate(a)`", "The running result at every position. `np.add.accumulate` is `cumsum`; `np.maximum.accumulate` is the running maximum, which has no dedicated function."],
      ["`.outer(a, b)`", "Applies the operation to every pair, giving an `(n, m)` result. `np.multiply.outer` is the outer product; `np.subtract.outer` is a pairwise difference matrix."],
      ["`.at(a, idx, b)`", "In-place, **unbuffered** application at given indices. The only correct way to accumulate into repeated indices."],
      ["`.reduceat(a, indices)`", "Segmented reduction — one reduction per slice defined by the index array. The primitive behind grouped aggregation."]
    ]},

    { t: "code", lang: "python", title: "the methods, and the operations that only they express", code: `
import numpy as np

a = np.array([3, 1, 4, 1, 5, 9, 2, 6])

# THE FAMILIAR ONES, spelled the general way:
np.add.reduce(a)              # 31 == a.sum()
np.add.accumulate(a)          # [3,4,8,9,14,23,25,31] == a.cumsum()
np.maximum.reduce(a)          # 9 == a.max()
np.multiply.reduce(a)         # 6480 == a.prod()

# THE ONES WITH NO DEDICATED FUNCTION -- this is the payoff:
np.maximum.accumulate(a)      # [3,3,4,4,5,9,9,9] -- RUNNING MAXIMUM
np.minimum.accumulate(a)      # [3,1,1,1,1,1,1,1] -- running minimum
np.logical_or.accumulate([False, False, True, False])   # [F,F,T,T] -- latch
#
# RUNNING MAXIMUM IS DRAWDOWN. This one line replaces the loop people
# write for it:
prices = np.array([100., 110., 105., 130., 90., 120.])
peak = np.maximum.accumulate(prices)
drawdown = (prices - peak) / peak
drawdown.min()                # -0.3077 -- the worst peak-to-trough fall

# OUTER -- every pair, without a loop:
np.subtract.outer(a[:3], a[:3])       # (3,3) pairwise differences
np.maximum.outer([1, 5], [3, 2])      # [[3,2],[5,5]]
#
# np.subtract.outer IS a distance matrix in one dimension:
points = np.array([1.0, 4.0, 9.0])
np.abs(np.subtract.outer(points, points))
# [[0,3,8],[3,0,5],[8,5,0]]

# .at -- THE ONE THAT IS NOT OPTIONAL:
counts = np.zeros(5)
idx = np.array([0, 1, 1, 1, 3])

counts[idx] += 1              # WRONG: [1,1,0,1,0]
#
# Fancy-index assignment is BUFFERED. It reads counts[idx], adds 1 to
# the buffer, writes back -- so the three writes to index 1 all read
# the same original value and the last one wins.

counts = np.zeros(5)
np.add.at(counts, idx, 1)     # RIGHT: [1,3,0,1,0]
#
# .at is unbuffered: each index is applied in turn. This is the ONLY
# correct way to accumulate into repeated positions, and the buffered
# version produces a plausible undercount with no error.
#
# np.bincount is faster for this specific case, but .at generalises:
np.bincount(idx, minlength=5)                 # [1,3,0,1,0]
np.maximum.at(counts, idx, [5, 2, 9, 1, 3])   # running max per index

# reduceat -- SEGMENTED REDUCTION:
values = np.array([1, 2, 3, 4, 5, 6, 7, 8])
np.add.reduceat(values, [0, 3, 5])    # [6, 9, 21] -- sums of 0:3, 3:5, 5:end
#
# The indices are the START of each segment. This is grouped
# aggregation over sorted data -- see 1.6 for the flat-plus-offsets
# layout it goes with.
#
# CAUTION: a repeated index returns the ELEMENT at that position
# rather than an empty reduction:
np.add.reduceat(values, [0, 3, 3, 5])         # [6, 3, 6, 21]
#                                             #     ^ values[3], not 0

# REDUCE ON MULTIPLE ARRAYS -- combining a list of masks:
masks = [np.array([True, False, True]),
         np.array([True, True, False]),
         np.array([True, False, False])]
np.logical_and.reduce(masks)          # [True, False, False]
#
# Cleaner than functools.reduce, and it works on a stacked array too.
`,
      hl: [15, 39, 47, 66],
      caption: "**`counts[idx] += 1` silently undercounts when `idx` has repeats.** Fancy-index assignment is buffered, so every write to the same position reads the same original value — `np.add.at` is unbuffered and correct."
    },

    { t: "callout", kind: "trap", title: "The undercount that looks like a data problem", body: [
      { t: "p", text: "`counts[idx] += 1` with repeated indices produces `[1, 1, 0, 1, 0]` where the answer is `[1, 3, 0, 1, 0]`. Every index that appears more than once contributes exactly one." },
      { t: "p", text: "**The result is a plausible histogram**, just wrong — and it looks like the input data had fewer events than it did, which is a data-quality conclusion rather than a code conclusion." },
      { t: "p", text: "**Use `np.add.at` for repeated indices, or `np.bincount` when the operation is counting.** `bincount` is faster; `.at` generalises to `maximum`, `minimum` and any other ufunc." }
    ]},

    { t: "h2", n: "02", text: "out= and where=", id: "out" },

    { t: "p", text: "**Every ufunc accepts `out=` to write into an existing array and `where=` to apply conditionally.** On large data these eliminate the temporaries that make a chained expression allocate three full-size arrays." },

    { t: "code", lang: "python", title: "removing allocations from a chained expression", code: `
rng = np.random.default_rng(0)
n = 50_000_000
a = rng.normal(size=n)
b = rng.normal(size=n)
c = rng.normal(size=n)

# THE OBVIOUS FORM allocates three 400 MB temporaries:
result = (a * b + c) / 2
#
#   a * b        -> temp1 (400 MB)
#   temp1 + c    -> temp2 (400 MB)
#   temp2 / 2    -> temp3 (400 MB)
#
# Peak is ~1.6 GB for a calculation whose result is 400 MB.

# WITH out=, one buffer is reused throughout:
result = np.empty_like(a)
np.multiply(a, b, out=result)
np.add(result, c, out=result)
np.divide(result, 2, out=result)
#
# Peak is 400 MB. Same answer, four times less memory, and slightly
# faster because nothing is allocated or freed in the loop.

# THE IN-PLACE OPERATORS DO THE SAME THING more readably:
result = a * b                # one allocation is unavoidable
result += c                   # no temporary
result /= 2                   # no temporary

# CAUTION: in-place operators do NOT UPCAST:
i = np.array([1, 2, 3])       # int64
i += 0.5                      # UFuncTypeError -- cannot cast to int64
j = i + 0.5                   # fine -- allocates a float64 result
#
# This is a feature: it stops a silent truncation. But it means
# converting a chain to in-place can break on a dtype change that the
# out-of-place version absorbed.

# where= APPLIES CONDITIONALLY, which matters for undefined operations:
x = np.array([1.0, 0.0, 2.0, -1.0])

with np.errstate(divide="ignore"):
    np.log(x)                 # [0, -inf, 0.69, nan] + RuntimeWarning

out = np.full_like(x, np.nan)
np.log(x, out=out, where=x > 0)
out                           # [0, nan, 0.69, nan] -- no warning at all
#
# THE LOGARITHM WAS NEVER COMPUTED where the condition was False.
# That is different from computing it and masking afterwards: no
# warning, no -inf, and no wasted work.
#
# NOTE: positions where the condition is False keep whatever was in
# out. That is why out is initialised to nan here -- np.empty would
# leave uninitialised memory, which is genuinely random bytes.

# THE SAME PATTERN FOR SAFE DIVISION:
num = np.array([1.0, 2.0, 3.0])
den = np.array([2.0, 0.0, 4.0])

safe = np.zeros_like(num)
np.divide(num, den, out=safe, where=den != 0)
safe                          # [0.5, 0.0, 0.75] -- no divide-by-zero

# WHEN out= IS NOT WORTH IT:
#   - arrays under ~100 MB, where the allocation is not the bottleneck
#   - code that is read more often than it is run
#   - anywhere the readability loss is not paid for by a measured gain
#
# The rule is the same as any optimisation: measure first. Knowing the
# technique means recognising the problem when the array is 10 GB.
`,
      hl: [17, 30, 44, 55],
      caption: "**`where=` means the operation is never computed there** — different from computing it and masking afterwards, which produces the warning and the `-inf` you were trying to avoid."
    },

    { t: "h2", n: "03", text: "When there is no ufunc for it", id: "custom" },

    { t: "p", text: "Sometimes the operation genuinely has no array expression. **The options are: compose existing ufuncs, accept a Python loop, or compile — and two of NumPy's own functions are traps here because their names promise speed they do not deliver.**" },

    { t: "ladder",
      title: "Applying a piecewise function to ten million values",
      rungs: [
        { level: "bad", label: "np.vectorize or frompyfunc", code: `f = np.vectorize(lambda x: x**2 if x > 0 else -x)
out = f(data)         # ~9 s

g = np.frompyfunc(lambda x: x**2 if x > 0 else -x, 1, 1)
out = g(data).astype(float)    # ~6 s, and returns object dtype`,
          note: "**Neither vectorises.** `np.vectorize`'s own documentation says it is provided for convenience rather than performance — it loops in Python. `frompyfunc` is slightly faster and returns an **object array**, which then has to be converted." },
        { level: "ok", label: "Compose existing ufuncs", code: `out = np.where(data > 0, data**2, -data)    # ~120 ms`,
          note: "**75× faster, and it computes both branches everywhere.** That is fine for cheap arithmetic and wrong when a branch is expensive or undefined — `np.where(x > 0, np.log(x), 0)` still evaluates `log` on the negatives and warns." },
        { level: "best", label: "Compute only where needed", code: `out = np.empty_like(data)
pos = data > 0
np.square(data, out=out, where=pos)
np.negative(data, out=out, where=~pos)      # ~80 ms`,
          note: "**Each branch is evaluated only where it applies**, so an expensive or undefined branch costs nothing on the other side. Slightly faster too, since half the elements skip each operation." }
      ]
    },

    { t: "code", lang: "python", title: "the honest options when composition fails", code: `
data = rng.normal(size=10_000_000)

# COMPOSITION HANDLES MORE THAN PEOPLE EXPECT.
# A three-branch piecewise function:
out = np.select(
    [data < -1, data < 1],
    [-1.0, data],
    default=1.0,
)                             # a clip, spelled generally

# A CUMULATIVE OPERATION WITH STATE -- harder, but often expressible.
# Exponential moving average looks sequential:
#     s[i] = alpha * x[i] + (1 - alpha) * s[i-1]
#
# It expands to a weighted sum, which IS vectorisable:
def ewma(x, alpha):
    n = len(x)
    w = (1 - alpha) ** np.arange(n)
    # cumulative weighted sum, divided by cumulative weight
    num = np.cumsum(alpha * x / w)
    return num * w
#
# THIS IS NUMERICALLY UNSTABLE for small alpha and large n: w**n
# underflows to zero and 1/w overflows. It is a good illustration
# that "can be vectorised" and "should be" are different questions --
# pandas' .ewm() uses a compiled loop for exactly this reason.

# WHEN THE LOOP IS GENUINELY NECESSARY, numba compiles it:
# from numba import njit
#
# @njit
# def running_threshold(x, limit):
#     out = np.empty_like(x)
#     state = 0.0
#     for i in range(len(x)):
#         state = max(state * 0.99, x[i])   # decays, resets on a spike
#         out[i] = state > limit
#     return out
#
# ~30 ms on 10 million elements -- comparable to a ufunc, and it says
# what it means. The alternative is a contrived array expression that
# materialises five temporaries and is harder to verify.

# THE DECISION, in order:
#
# 1. IS THERE A ufunc OR METHOD? maximum.accumulate, add.reduceat,
#    searchsorted and bincount cover more ground than people expect.
# 2. CAN IT BE COMPOSED? where, select, clip, cumsum and boolean
#    arithmetic combine into a great deal.
# 3. IS THE LOOP OVER SOMETHING SMALL? A loop over 50 columns calling
#    vectorised operations on a million rows each is fine. Count the
#    passes over the data, not the loops in the source.
# 4. ONLY THEN COMPILE. numba for numeric loops, Cython for anything
#    touching Python objects.
#
# np.vectorize IS NOT ON THIS LIST. It has one legitimate use: making
# a scalar function broadcast so it can be used where an array is
# expected. It is an adapter, not an optimisation.

# A GENUINE ufunc, if you need one for an extension:
# np.frompyfunc(f, nin, nout) gives you .reduce and .accumulate for a
# Python function, which is occasionally worth the slowness:
running_concat = np.frompyfunc(lambda a, b: str(a) + str(b), 2, 1)
running_concat.accumulate(np.array(["a", "b", "c"], dtype=object))
# array(['a', 'ab', 'abc'], dtype=object)
#
# There is no NumPy function for a running string concatenation, and
# this is three characters of work. On three elements the speed is
# irrelevant; on three million it would be the wrong tool.
`,
      hl: [22, 38, 43, 63],
      caption: "**\"Can be vectorised\" and \"should be\" are different questions.** The vectorised EWMA is numerically unstable for small alpha, which is why pandas uses a compiled loop for it."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Refactor",
      title: "A feature transform that allocates 12 GB to produce 400 MB",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "A nightly job fails with an out-of-memory error on a machine with 32 GB. The feature matrix is 50 million rows by one column of float64 — 400 MB — and the transform is this." },
        { t: "code", lang: "python", numbered: false, title: "transform.py", code: `
import numpy as np

def transform(x, lo, hi, counts_index, n_buckets):
    # 1. winsorise
    x = np.where(x < lo, lo, x)
    x = np.where(x > hi, hi, x)

    # 2. log-transform the positive part, zero elsewhere
    x = np.where(x > 0, np.log(x), 0.0)

    # 3. standardise
    x = (x - x.mean()) / x.std()

    # 4. running peak, for a drawdown feature
    peak = np.array([x[:i+1].max() for i in range(len(x))])
    drawdown = x - peak

    # 5. per-bucket totals
    totals = np.zeros(n_buckets)
    totals[counts_index] += x

    return x, drawdown, totals`},
        { t: "p", text: "Find every problem — there are memory problems, a correctness problem and a complexity problem — and rewrite it to run in bounded memory." }
      ],
      requirements: [
        "Count the allocations in the original and give the peak.",
        "Identify the silent correctness bug.",
        "Identify the quadratic step.",
        "Rewrite with bounded memory and no Python loop over rows.",
        "Explain why the log step also emits warnings.",
        "Include tests, including one that catches the correctness bug."
      ],
      hint: "Step 5 looks harmless. What does `counts_index` contain?",
      solution: {
        lang: "python",
        title: "transform_fixed.py",
        code: `import numpy as np


# =========================================================================
# WHAT THE ORIGINAL COSTS
# =========================================================================
#
# n = 50,000,000 float64 -> 400 MB per array.
#
# STEP 1  np.where(x < lo, lo, x)
#           mask (bool, 50 MB) + result (400 MB)
#         np.where(x > hi, hi, x)
#           mask + another 400 MB; the first result is garbage but
#           may not be collected before the second allocates
#
# STEP 2  np.log(x) is computed on THE WHOLE ARRAY (400 MB) before
#         np.where selects from it -- including on every non-positive
#         value, which is where the RuntimeWarning comes from. Plus
#         the mask and the result: ~850 MB.
#
# STEP 3  x - x.mean() -> 400 MB, then / x.std() -> another 400 MB
#
# STEP 4  THE QUADRATIC STEP. x[:i+1].max() scans i elements, so the
#         list comprehension is sum(1..n) = n**2/2 = 1.25 x 10**15
#         operations. It also builds a Python list of 50 million
#         floats -- ~1.6 GB of pointers plus ~1.4 GB of objects --
#         before np.array copies it into a 400 MB array.
#
#         This step alone would take days. Memory is not even its
#         worst property.
#
# STEP 5  totals[counts_index] += x
#         THE CORRECTNESS BUG -- see below.
#
# Peak, ignoring step 4's list: roughly 3 GB of live temporaries with
# nothing reused. With step 4: well past 12 GB, and it never finishes.


# =========================================================================
# THE CORRECTNESS BUG
# =========================================================================
#
# totals[counts_index] += x is BUFFERED fancy-index assignment.
#
# NumPy reads totals[counts_index] into a temporary, adds x, and
# writes the temporary back. Every row mapping to the same bucket
# reads the SAME original value, so only the last one survives.
#
# With 50 million rows and, say, 1,000 buckets, each bucket ends up
# holding ONE row's value instead of the sum of 50,000.
#
# The result is a plausible array of plausible numbers. Nothing
# raises. Downstream this looks like the buckets being much smaller
# than expected -- a data conclusion, drawn from a code bug.

def demonstrate_the_bug():
    totals = np.zeros(3)
    idx = np.array([0, 0, 0, 1])
    vals = np.array([1.0, 2.0, 3.0, 10.0])

    totals[idx] += vals
    buffered = totals.copy()          # [3.0, 10.0, 0.0]  -- WRONG

    totals = np.zeros(3)
    np.add.at(totals, idx, vals)      # [6.0, 10.0, 0.0]  -- correct
    return buffered, totals


# =========================================================================
# THE REWRITE
# =========================================================================

def transform(x, lo, hi, bucket_index, n_buckets, *, copy=True):
    """Winsorise, log, standardise, plus drawdown and bucket totals.

    Peak memory is roughly 2 x the input rather than 8 x, and there is
    no Python-level loop over rows.
    """
    x = np.asarray(x, dtype=np.float64)
    if x.ndim != 1:
        raise ValueError(f"expected 1-D, got {x.shape}")
    if len(bucket_index) != len(x):
        raise ValueError(
            f"bucket_index has {len(bucket_index)} entries for {len(x)} rows"
        )

    # ONE working buffer. copy=False lets a caller who owns the data
    # opt into modifying it in place and save even this.
    out = x.copy() if copy else x

    # STEP 1 -- clip does both bounds in one pass, writing in place.
    np.clip(out, lo, hi, out=out)

    # STEP 2 -- where= means log is NEVER EVALUATED on non-positive
    # values. That removes the RuntimeWarning at its source rather
    # than suppressing it, and skips the wasted computation.
    positive = out > 0
    np.log(out, out=out, where=positive)
    out[~positive] = 0.0

    # STEP 3 -- standardise in place. The float64 accumulator is
    # explicit because summing 50 million values in float32 would
    # lose real precision.
    mu = out.mean(dtype=np.float64)
    sd = out.std(dtype=np.float64)
    out -= mu
    if sd > 0:
        out /= sd
    # sd == 0 means a constant feature; dividing would give nan for
    # every row. Leaving it centred at zero is the honest result.

    # STEP 4 -- running maximum is a ufunc method. O(n), one pass,
    # one allocation, and it says what it means.
    peak = np.maximum.accumulate(out)
    drawdown = peak
    np.subtract(out, peak, out=drawdown)      # reuse peak's buffer

    # STEP 5 -- unbuffered accumulation.
    totals = np.zeros(n_buckets, dtype=np.float64)
    np.add.at(totals, bucket_index, out)
    #
    # bincount is faster when the index dtype allows it, and does the
    # same thing for a weighted sum:
    #   totals = np.bincount(bucket_index, weights=out,
    #                        minlength=n_buckets)
    # .at is kept here because it generalises to other ufuncs.

    return out, drawdown, totals


# =========================================================================
# THE ACCOUNTING
# =========================================================================
#
#   input x                    400 MB  (caller's)
#   out                        400 MB  (one copy, reused throughout)
#   positive mask               50 MB  (bool)
#   peak/drawdown              400 MB  (one buffer, reused)
#   totals                    negligible
#
#   PEAK ~1.25 GB, against 3 GB+ before -- and step 4 now finishes.
#
# WITH copy=False the caller can drop it to ~850 MB, at the cost of
# their input being modified. That is a real trade and belongs in the
# signature rather than in the implementation.


# =========================================================================
# TESTS
# =========================================================================

def _fixture():
    x = np.array([-5.0, 0.5, 2.0, 100.0, 3.0, -1.0])
    idx = np.array([0, 0, 1, 1, 1, 2])
    return x, idx


def test_bucket_totals_are_sums_not_last_writes():
    """The silent correctness bug."""
    buffered, correct = demonstrate_the_bug()

    assert buffered[0] == 3.0            # only the last row
    assert correct[0] == 6.0             # the sum
    assert not np.array_equal(buffered, correct)


def test_totals_match_a_reference_grouping():
    x, idx = _fixture()
    out, _, totals = transform(x, 0.0, 10.0, idx, 3)

    for b in range(3):
        assert np.isclose(totals[b], out[idx == b].sum())


def test_clipping_applies_both_bounds():
    x, idx = _fixture()
    out, _, _ = transform(x, 1.0, 10.0, idx, 3)

    # After clip to [1,10] and log, the minimum input maps to log(1)=0,
    # which after standardising is the smallest value.
    assert np.isfinite(out).all()


def test_log_emits_no_warning_on_non_positive_values():
    """where= means it is never evaluated there."""
    x = np.array([-1.0, 0.0, 1.0, 2.0])
    idx = np.zeros(4, dtype=int)

    with np.errstate(all="raise"):       # any warning becomes an error
        out, _, _ = transform(x, -10.0, 10.0, idx, 1)

    assert np.isfinite(out).all()


def test_input_is_not_modified_by_default():
    x, idx = _fixture()
    before = x.copy()

    transform(x, 0.0, 10.0, idx, 3)
    assert np.array_equal(x, before)


def test_copy_false_modifies_in_place_as_documented():
    x, idx = _fixture()
    before = x.copy()

    transform(x, 0.0, 10.0, idx, 3, copy=False)
    assert not np.array_equal(x, before)


def test_drawdown_is_never_positive():
    """x - running_max(x) is zero at each new peak and negative after."""
    x = np.array([1.0, 3.0, 2.0, 5.0, 4.0])
    idx = np.zeros(5, dtype=int)

    _, dd, _ = transform(x, -100.0, 100.0, idx, 1)
    assert (dd <= 1e-12).all()
    assert np.isclose(dd[0], 0.0)


def test_running_maximum_matches_the_quadratic_version():
    rng = np.random.default_rng(0)
    a = rng.normal(size=500)

    fast = np.maximum.accumulate(a)
    slow = np.array([a[:i + 1].max() for i in range(len(a))])
    assert np.array_equal(fast, slow)


def test_constant_input_does_not_produce_nan():
    x = np.full(10, 5.0)
    idx = np.zeros(10, dtype=int)

    out, _, _ = transform(x, 0.0, 10.0, idx, 1)
    assert np.isfinite(out).all()
    assert np.allclose(out, 0.0)


def test_mismatched_index_length_raises():
    try:
        transform(np.ones(5), 0.0, 1.0, np.zeros(3, dtype=int), 1)
        assert False, "should have raised"
    except ValueError as e:
        assert "bucket_index" in str(e)


def test_empty_bucket_totals_zero():
    x, idx = _fixture()
    _, _, totals = transform(x, 0.0, 10.0, idx, 5)

    assert totals[3] == 0.0 and totals[4] == 0.0`,
        notes: [
          { t: "p", text: "**`totals[bucket_index] += x` is the correctness bug, and it is silent.** Buffered fancy-index assignment means every row mapping to the same bucket reads the same original value, so each bucket ends up holding one row instead of fifty thousand." },
          { t: "callout", kind: "trap", title: "A code bug that reads as a data finding", body: [
            { t: "p", text: "The output is a plausible array of plausible numbers. Downstream it looks like the buckets are far smaller than expected — which invites a conversation about the data source rather than a look at the code." },
            { t: "p", text: "**`np.add.at` is unbuffered and correct; `np.bincount` with `weights=` is faster for this exact case.** The buffered form produces no warning of any kind." }
          ]},
          { t: "p", text: "**Step 4 was quadratic, and memory was not even its worst property.** `x[:i+1].max()` scans `i` elements each time — 1.25 × 10¹⁵ operations on 50 million rows. `np.maximum.accumulate` is one pass and one allocation." },
          { t: "p", text: "**`np.where(x > 0, np.log(x), 0)` evaluates `log` on every element first**, including the negatives — which is both the source of the `RuntimeWarning` and half the work wasted. `where=` on the ufunc never evaluates it there at all." },
          { t: "p", text: "**Peak memory drops from over 3 GB to about 1.25 GB** by reusing one working buffer, and `copy=False` takes it to 850 MB for a caller who owns the data. That trade belongs in the signature, not buried in the implementation." },
          { t: "p", text: "**A constant input needs a decision, not a division.** `sd == 0` would give `nan` for every row; leaving the feature centred at zero is the honest representation of \"this carries no information\"." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`counts[idx] += 1` where `idx = [0, 1, 1, 1]`. What is `counts`?",
          options: [
            "[1, 3, 0, ...]",
            "[1, 1, 0, ...] — buffered assignment means the three writes to index 1 all read the same original value",
            "It raises an IndexError",
            "[1, 1, 1, ...]"
          ],
          answer: 1,
          why: "Fancy-index assignment reads into a temporary, applies the operation, and writes back — so repeated indices lose all but the last write. `np.add.at(counts, idx, 1)` is unbuffered and gives 3; `np.bincount` is faster for counting specifically."
        }
      ]
    }
  ],

  takeaways: [
    "**Every binary ufunc has `reduce`, `accumulate`, `outer`, `at` and `reduceat`** — `np.add.reduce` is `sum`, `np.add.accumulate` is `cumsum`.",
    "**`np.maximum.accumulate` is the running maximum**, which has no dedicated function and is one line of drawdown calculation.",
    "**`counts[idx] += 1` silently undercounts on repeated indices** because fancy-index assignment is buffered.",
    "**`np.add.at` is unbuffered and correct**; `np.bincount` with `weights=` is faster for the counting case specifically.",
    "**`reduceat` does segmented reduction**, but a repeated index returns the element at that position rather than an empty reduction.",
    "**`out=` reuses a buffer** and can cut a chained expression's peak memory by four times.",
    "**In-place operators do not upcast** — `int_array += 0.5` raises, which prevents a silent truncation.",
    "**`where=` means the operation is never computed there**, which removes a warning at its source rather than suppressing it.",
    "**Initialise the `out` array when using `where=`** — untouched positions keep whatever was there, and `np.empty` is uninitialised memory.",
    "**`np.vectorize` and `frompyfunc` do not vectorise** — the first says so in its own documentation, the second returns an object array.",
    "**`np.where(cond, f(x), g(x))` evaluates both branches everywhere**, which matters when one is expensive or undefined.",
    "**\"Can be vectorised\" and \"should be\" are different questions** — the vectorised EWMA is numerically unstable, which is why pandas compiles a loop instead."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which expression gives the running maximum of an array?",
        options: [
          "`np.max.accumulate(a)`",
          "`np.maximum.accumulate(a)`",
          "`a.cummax()`",
          "`np.running_max(a)`"
        ],
        answer: 1,
        why: "`np.maximum` is the element-wise binary ufunc and carries the `accumulate` method; `np.max` is the reduction function and has no methods. There is no dedicated NumPy function for this, which is exactly why the ufunc methods are worth knowing — it turns a drawdown loop into one line."
      },
      {
        stem: "A chained expression `(a * b + c) / 2` on a 400 MB array peaks near 1.6 GB. What reduces it?",
        options: [
          "Convert to float32",
          "Write into one reused buffer with `out=`, or use in-place operators after the first allocation",
          "Split into chunks",
          "Use np.vectorize"
        ],
        answer: 1,
        why: "Each operation in the chain allocates a full-size temporary. `np.multiply(a, b, out=result)` followed by in-place `+=` and `/=` reuses a single buffer, cutting peak to the result size. Note that in-place operators refuse to upcast, which will catch a dtype change the out-of-place form absorbed."
      },
      {
        stem: "Why does `np.where(x > 0, np.log(x), 0)` emit a RuntimeWarning?",
        options: [
          "np.where does not accept negative values",
          "`np.log(x)` is evaluated on the whole array before where selects from it, including the non-positive values",
          "The dtypes of the branches differ",
          "The condition array is the wrong shape"
        ],
        answer: 1,
        why: "Both branches are computed in full and then selected between. `np.log(x, out=out, where=x > 0)` never evaluates the logarithm outside the condition — no warning, no `-inf`, and half the work skipped. Initialise `out` first, because untouched positions keep whatever was there."
      },
      {
        stem: "You need a piecewise transform with no NumPy equivalent, on ten million rows. What is the order of options?",
        options: [
          "np.vectorize, then a loop, then numba",
          "Look for a ufunc method, then compose with where/select/clip, then compile with numba — never np.vectorize",
          "Always numba",
          "Always a list comprehension"
        ],
        answer: 1,
        why: "`np.vectorize` loops in Python and its documentation says it exists for convenience, not performance. Ufunc methods and composition cover more ground than people expect; when the logic is genuinely sequential, a compiled loop is more honest and more verifiable than a contrived array expression."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "How would you accumulate values into buckets given an index array with repeats?",
        strong: "`np.add.at(totals, idx, values)`, or `np.bincount(idx, weights=values)` which is faster for that specific shape. The thing to avoid is `totals[idx] += values` — fancy-index assignment is buffered, so every row hitting the same bucket reads the same original value and only the last write survives. It produces a plausible undercount with no error.",
        answer: [
          { t: "p", text: "The buffered-assignment bug is a genuinely common production defect and knowing it cold is a strong signal." },
          { t: "p", text: "Noting that the result looks like a data finding rather than a code bug shows you have debugged one." }
        ]
      },
      {
        level: "advanced",
        q: "A transform allocates several times the memory of its output. How would you reduce it?",
        strong: "Every operation in a chained expression allocates a full-size temporary, so I would write into one reused buffer with `out=`, or use in-place operators after the first allocation. `where=` helps too — it skips the computation entirely rather than computing and masking. Both are worth doing only at a scale where the allocation is actually the constraint.",
        answer: [
          { t: "p", text: "Ending on \"only at the scale where it matters\" is the right instinct — this is an optimisation, and premature use costs readability." },
          { t: "p", text: "The in-place upcast restriction is a good detail: converting a chain can break on a dtype the out-of-place version silently widened." }
        ]
      },
      {
        level: "advanced",
        q: "When is `np.vectorize` the right tool?",
        strong: "Essentially never for performance — its documentation says it exists for convenience, and it loops in Python. Its one legitimate use is as an adapter, making a scalar function broadcast so it can be passed where an array operation is expected. If a genuinely sequential loop is unavoidable, numba compiles it to something comparable to a ufunc and is far easier to verify than a contrived array expression.",
        answer: [
          { t: "p", text: "Being direct that the name is misleading, and citing the documentation, is more persuasive than hedging." },
          { t: "p", text: "The adapter use case shows you know why the function exists rather than just that it is slow." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 1.2 — Vectorisation and Broadcasting
   ========================================================================= */
EC.receiveLesson({
  id: "1.2",

  lede: "**Vectorisation is not \"a loop written differently\" — it is the loop moved out of Python entirely.** Broadcasting is the set of rules that decides whether two differently shaped arrays can be combined without you writing that loop back in. Get the rules wrong and NumPy will not raise; it will silently produce an array of the wrong shape.",

  objectives: [
    "Explain what a vectorised operation actually does at the machine level",
    "Apply the broadcasting rules to predict a result shape before running it",
    "Recognise the shape mismatch that produces a matrix instead of an error",
    "Use `np.newaxis` to control which axis aligns",
    "Know when vectorisation costs more memory than it saves in time"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "What vectorisation removes", id: "vectorisation" },

    { t: "p", text: "A Python `for` loop over a million numbers does a million bytecode dispatches, a million type checks and a million object allocations. **A vectorised call does one dispatch and then runs a compiled C loop over raw bytes** — which is why the speedup is 50× to 200×, not 10%." },

    { t: "dl", items: [
      ["Vectorisation", "Expressing an operation over a whole array at once, so the iteration happens in compiled code rather than in the Python interpreter."],
      ["ufunc", "\"Universal function\" — a function like `np.add` or `np.sqrt` that applies element-by-element and knows how to broadcast. The `+` operator on arrays calls one."],
      ["Element-wise", "Applied independently to each position. `a * b` multiplies corresponding elements; it is not matrix multiplication (that is `a @ b`)."],
      ["SIMD", "Single Instruction, Multiple Data — CPU instructions that process 4, 8 or 16 values at once. Contiguous arrays let the compiler use them; a Python loop cannot."],
      ["Interpreter overhead", "The per-iteration cost of bytecode dispatch, type dispatch and object allocation — roughly 50–100 ns per element, which vectorisation eliminates rather than reduces."]
    ]},

    { t: "viz",
      title: "Where the time goes in a Python loop",
      caption: "The arithmetic is a sliver. Almost all the time in an interpreted loop is spent on work that has nothing to do with the calculation you asked for.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Breakdown of per-element cost in a Python loop against a vectorised call">
  <text x="30" y="30" class="s-label" style="fill:var(--crit)">Python loop — per element, ~80 ns</text>
  <g stroke-width="1.5">
    <rect x="30" y="44" width="150" height="34" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)"/>
    <rect x="180" y="44" width="130" height="34" style="fill:var(--crit);fill-opacity:.16;stroke:var(--crit)"/>
    <rect x="310" y="44" width="170" height="34" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
    <rect x="480" y="44" width="330" height="34" style="fill:var(--crit);fill-opacity:.05;stroke:var(--crit)"/>
    <rect x="810" y="44" width="12" height="34" style="fill:var(--good);fill-opacity:.5;stroke:var(--good)"/>
  </g>
  <text x="40" y="66" class="s-sub" style="fill:var(--ink-2)">bytecode dispatch</text>
  <text x="190" y="66" class="s-sub" style="fill:var(--ink-2)">type check</text>
  <text x="320" y="66" class="s-sub" style="fill:var(--ink-2)">unbox operands</text>
  <text x="490" y="66" class="s-sub" style="fill:var(--ink-2)">allocate result object + refcount</text>
  <text x="700" y="104" class="s-sub" style="fill:var(--good)">the actual addition ↑</text>

  <text x="30" y="160" class="s-label" style="fill:var(--good)">Vectorised — per element, ~0.6 ns</text>
  <g stroke-width="1.5">
    <rect x="30" y="174" width="8" height="34" style="fill:var(--good);fill-opacity:.5;stroke:var(--good)"/>
  </g>
  <text x="52" y="196" class="s-sub" style="fill:var(--ink-2)">the addition, in a C loop, four or eight at a time via SIMD</text>
  <line x1="30" y1="222" x2="822" y2="222" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="244" class="s-sub" style="fill:var(--ink-3)">Same total width. The dispatch cost did not shrink — it was removed.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the same computation, four ways", code: `
import numpy as np

a = np.random.default_rng(0).normal(size=1_000_000)
b = np.random.default_rng(1).normal(size=1_000_000)

# 1. THE PYTHON LOOP -- one bytecode dispatch per element
def loop(a, b):
    out = np.empty(len(a))
    for i in range(len(a)):
        out[i] = a[i] * b[i] + 1
    return out
# ~420 ms

# 2. LIST COMPREHENSION -- faster, still interpreted
def comp(a, b):
    return np.array([x * y + 1 for x, y in zip(a, b)])
# ~180 ms

# 3. np.vectorize -- THIS IS NOT VECTORISATION
def vec(a, b):
    return np.vectorize(lambda x, y: x * y + 1)(a, b)
# ~250 ms -- the docs say so explicitly: "provided primarily for
# convenience, not for performance". It is a loop with extra steps.

# 4. ACTUAL VECTORISATION
def fast(a, b):
    return a * b + 1
# ~2 ms -- 200x the loop

# WHY THE GAP IS THAT LARGE:
#   - one dispatch instead of a million
#   - no int/float object created per element
#   - the C loop is unrolled and uses SIMD registers
#   - the data is contiguous, so the cache prefetcher keeps up

# THE COMMON MISTAKE is a "vectorised" call inside a loop:
groups = np.random.default_rng(2).integers(0, 1000, 1_000_000)
totals = np.zeros(1000)

for g in range(1000):                 # 1000 full passes over 1M elements
    totals[g] = a[groups == g].sum()  # ~1.9 s
#
# Each iteration is vectorised, but there are a thousand of them and
# each scans the whole array. One pass does the same work:
totals = np.bincount(groups, weights=a, minlength=1000)    # ~6 ms
#
# THE RULE: count the PASSES over the data, not the loops in the source.

# NOT EVERYTHING VECTORISES, and pretending otherwise costs more:
#   - genuinely sequential logic (each step depends on the last)
#   - branching that differs per element and is expensive on both sides
#   - calls into libraries that only accept scalars
# For those, np.frompyfunc or numba are the honest answers, not a
# contrived array expression that materialises five temporaries.
`,
      hl: [20, 27, 41, 46],
      caption: "**`np.vectorize` is not vectorisation.** Its own documentation says it exists for convenience rather than speed — it loops in Python and returns an array."
    },

    { t: "h2", n: "02", text: "The broadcasting rules", id: "broadcasting" },

    { t: "p", text: "**Broadcasting lets NumPy combine arrays of different shapes by virtually stretching the smaller one** — without allocating the stretched copy. Two dimensions are compatible when they are equal, or when one of them is 1." },

    { t: "dl", items: [
      ["Broadcasting", "Automatically expanding array shapes so an element-wise operation can proceed, by repeating along axes of length 1."],
      ["Alignment", "Shapes are compared from the **right**. `(3, 4)` and `(4,)` align as `(3, 4)` and `(1, 4)`; missing left-hand dimensions are treated as 1."],
      ["Compatible dimensions", "Two lengths broadcast if they are equal, or if either is 1. Anything else raises `ValueError`."],
      ["Stretching", "Conceptual only — NumPy sets the stride along the broadcast axis to **0**, so the same bytes are read repeatedly. No memory is allocated."],
      ["`np.newaxis`", "Inserts a length-1 axis, so you control which dimension lines up. `a[:, None]` makes a column; `a[None, :]` makes a row."]
    ]},

    { t: "viz",
      title: "How shapes align, right to left",
      caption: "Compare from the right. Pad missing dimensions with 1. A 1 stretches; anything else must match exactly.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Three broadcasting examples showing right-aligned shape comparison">
  <text x="30" y="28" class="s-label" style="fill:var(--good)">Compatible — (3,4) with (4,)</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="360" y="60" class="s-sub" style="fill:var(--ink-2)">3</text>
    <text x="430" y="60" class="s-sub" style="fill:var(--ink-2)">4</text>
    <text x="360" y="86" class="s-sub" style="fill:var(--ink-3)">1</text>
    <text x="430" y="86" class="s-sub" style="fill:var(--ink-2)">4</text>
  </g>
  <text x="240" y="60" class="s-sub" style="fill:var(--ink-3)">a.shape</text>
  <text x="240" y="86" class="s-sub" style="fill:var(--ink-3)">b padded</text>
  <line x1="230" y1="96" x2="470" y2="96" style="stroke:var(--good)"/>
  <text x="360" y="118" class="s-sub" style="fill:var(--good)">3</text>
  <text x="430" y="118" class="s-sub" style="fill:var(--good)">4</text>
  <text x="500" y="118" class="s-sub" style="fill:var(--good)">← 1 stretches, 4 matches</text>

  <text x="30" y="160" class="s-label" style="fill:var(--crit)">Incompatible — (3,4) with (3,)</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="360" y="192" class="s-sub" style="fill:var(--ink-2)">3</text>
    <text x="430" y="192" class="s-sub" style="fill:var(--ink-2)">4</text>
    <text x="360" y="218" class="s-sub" style="fill:var(--ink-3)">1</text>
    <text x="430" y="218" class="s-sub" style="fill:var(--crit)">3</text>
  </g>
  <line x1="230" y1="228" x2="470" y2="228" style="stroke:var(--crit)"/>
  <text x="500" y="250" class="s-sub" style="fill:var(--crit)">4 vs 3 — ValueError. Use a[:, None] to fix.</text>

  <text x="30" y="288" class="s-sub" style="fill:var(--ink-3)">The array with the trailing 1 is read with stride 0 — the same bytes, over and over, with nothing copied.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "broadcasting, and the case that should raise but does not", code: `
prices = np.array([[10.0, 20.0, 30.0],       # shape (2, 3)
                   [40.0, 50.0, 60.0]])
vat = np.array([1.2, 1.05, 1.2])             # shape (3,)

prices * vat                                 # (2,3) * (3,) -> (2,3)
# array([[12. , 21. , 36. ],
#        [48. , 52.5, 72. ]])
#
# vat was padded to (1, 3) and stretched down the rows -- one rate per
# COLUMN, applied to every row.

# TO APPLY ONE VALUE PER ROW you must say so explicitly:
discount = np.array([0.9, 0.8])              # shape (2,)
prices * discount                            # ValueError: (2,3) vs (2,)
prices * discount[:, None]                   # (2,3) * (2,1) -> works
# array([[ 9., 18., 27.],
#        [32., 40., 48.]])

# THE DANGEROUS CASE: two 1-D arrays that produce a MATRIX.
actual = np.array([10.0, 12.0, 9.0, 11.0])           # (4,)
predicted = np.array([[9.5], [11.0], [9.2], [10.8]])  # (4,1) -- a column

errors = actual - predicted
errors.shape                                 # (4, 4)  NOT (4,)
#
# NO ERROR IS RAISED. (4,1) and (4,) broadcast to (4,4): every actual
# minus every prediction. The mean of that is meaningless, and it looks
# like a perfectly plausible number:
errors.mean()                                # 0.375 -- garbage
(actual - predicted.ravel()).mean()          # 0.075 -- correct
#
# THIS IS THE MOST COMMON SILENT BROADCASTING BUG. A (n,1) array from
# a reshape or a sklearn predict() meeting a (n,) array from a
# DataFrame column produces an n-by-n matrix and a wrong metric.

# ASSERT THE SHAPE where it matters:
def rmse(y_true, y_pred):
    y_true, y_pred = np.asarray(y_true), np.asarray(y_pred)
    if y_true.shape != y_pred.shape:
        raise ValueError(f"shape mismatch: {y_true.shape} vs {y_pred.shape}")
    return np.sqrt(((y_true - y_pred) ** 2).mean())

# BROADCASTING ALLOCATES NOTHING -- the stride is set to zero:
big = np.ones((10_000, 10_000))
row = np.ones(10_000)
np.broadcast_to(row, (10_000, 10_000)).strides    # (0, 8) -- axis 0 free
#
# But the RESULT of an operation is full size. This is the trap:
# (10000, 1) - (1, 10000) creates a 10000x10000 float64 array = 800 MB
# from two 80 KB inputs.
`,
      hl: [12, 25, 30, 51],
      caption: "**`(4,1)` against `(4,)` gives you a 4×4 matrix, silently.** This is the single most common broadcasting bug, and it usually arrives as a wrong metric rather than an exception."
    },

    { t: "callout", kind: "trap", title: "The bug that looks like a plausible number", body: [
      { t: "p", text: "`sklearn`'s `predict()` sometimes returns `(n, 1)`; a pandas column gives `(n,)`. Subtract them and you get an `n × n` matrix of every pairwise difference — no warning, and `.mean()` on it returns a small, believable float." },
      { t: "p", text: "**The tell is memory, not the value.** On 50,000 rows the result is a 20 GB allocation and the process dies; on 500 rows it just quietly reports the wrong RMSE for months." },
      { t: "p", text: "**Assert shape equality inside any metric function you write.** It costs one line and turns a silent wrong answer into an immediate, obvious failure." }
    ]},

    { t: "h2", n: "03", text: "When vectorisation costs more than it saves", id: "cost" },

    { t: "p", text: "Vectorised expressions trade **memory for time**. Every intermediate result in a chained expression is a full array, and on large data those temporaries can exceed the memory you have." },

    { t: "ladder",
      title: "Computing a pairwise distance matrix",
      rungs: [
        { level: "bad", label: "Nested Python loops", code: `d = np.empty((n, n))
for i in range(n):
    for j in range(n):
        d[i, j] = np.sqrt(((X[i] - X[j]) ** 2).sum())`,
          note: "**n² interpreted iterations.** At n = 5,000 this is 25 million Python-level loop bodies — roughly 40 seconds, and it scales quadratically in the worst possible way." },
        { level: "ok", label: "Fully broadcast", code: `diff = X[:, None, :] - X[None, :, :]      # (n, n, d)
d = np.sqrt((diff ** 2).sum(axis=-1))`,
          note: "**Fast, but it materialises an `(n, n, d)` temporary.** At n = 5,000 and d = 50 that intermediate is 10 GB — the code is correct and the machine still dies." },
        { level: "best", label: "Expand the algebra", code: `sq = (X ** 2).sum(axis=1)
d2 = sq[:, None] + sq[None, :] - 2 * (X @ X.T)
d = np.sqrt(np.maximum(d2, 0))            # clamp float error`,
          note: "**‖a−b‖² = ‖a‖² + ‖b‖² − 2a·b.** The largest temporary is `(n, n)` rather than `(n, n, d)` — 200 MB instead of 10 GB — and the matrix product runs in optimised BLAS. The `maximum(·, 0)` clamps tiny negatives from float cancellation, which otherwise become `nan` under the square root." }
      ]
    },

    { t: "callout", kind: "insight", title: "Count temporaries, not lines", body: [
      { t: "p", text: "`(a * b + c) / d` looks like one expression and allocates three full-size arrays. On an array that occupies half your RAM, a two-line calculation is an out-of-memory error." },
      { t: "p", text: "**In-place operators reuse the buffer**: `a *= b` then `a += c` allocates nothing. `np.multiply(a, b, out=a)` does the same explicitly, and every ufunc accepts `out=`." },
      { t: "p", text: "This matters only at the scale where it matters. Optimising temporaries in a 10 MB calculation is wasted effort — but knowing the rule means you recognise the problem when the array is 10 GB." }
    ]},

    { t: "callout", kind: "trap", title: "apply_along_axis and vectorize are loops with a nicer signature", body: [
      { t: "p", text: "`np.apply_along_axis(f, axis, a)` calls `f` once per 1-D slice, in Python; `np.vectorize(f)` calls it once per element. Neither moves work into C. **Use them for a one-off on small data; reach for a ufunc, a reduction with `axis=`, or broadcasting for anything that runs more than once.** When you cannot tell where the time goes: `%timeit` measures a line, `%prun` (cProfile) ranks the functions, and `line_profiler` ranks the lines inside one." }
    ]},

    { t: "code", lang: "python", title: "Grids are broadcasting made visible",
      code: `x = np.linspace(-1, 1, 5); y = np.linspace(0, 1, 3)
X, Y = np.meshgrid(x, y)              # two dense (3, 5) arrays: every (x, y) pair spelt out
print(X.shape, Y.shape)               # (3, 5) (3, 5)

ys, xs = np.ogrid[0:1:3j, -1:1:5j]    # the open grid: (3, 1) and (1, 5); broadcasting does the pairing
print(ys.shape, xs.shape)             # (3, 1) (1, 5)
Z = xs ** 2 + ys ** 2                 # (3, 5), and no dense grid was ever materialised
print(np.allclose(Z, X ** 2 + Y ** 2))   # True
# np.mgrid is the dense form of ogrid; x[None, :] and y[:, None] are the open grid written by hand`,
      caption: "`meshgrid` and `mgrid` build the dense grid; `ogrid` builds the two thin arrays and lets broadcasting produce the grid at the point of use — the same trick as `x[:, None]`, with the slicing hidden."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "The evaluation metric that was wrong for six months",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "A model's reported MAPE has been suspiciously stable at around 4% across every retraining, including one where the model was known to have degraded. Here is the evaluation code." },
        { t: "code", lang: "python", numbered: false, title: "evaluate.py", code: `
import numpy as np

def mape(y_true, y_pred):
    return np.abs((y_true - y_pred) / y_true).mean() * 100

def evaluate(model, df):
    y_true = df["actual"].values          # shape (n,)
    y_pred = model.predict(df[FEATURES])  # shape (n, 1) from this model
    return {
        "mape": mape(y_true, y_pred),
        "bias": (y_pred - y_true).mean(),
        "n": len(y_true),
    }`},
        { t: "p", text: "Find the bug, explain why it produces a *stable* wrong number rather than an obviously wrong one, and fix the code so it cannot recur." }
      ],
      requirements: [
        "Name the bug and give the shapes involved.",
        "Explain why the wrong value is stable and plausible.",
        "Compute what the metric is actually measuring.",
        "Fix it in a way that fails loudly rather than silently.",
        "Say why the memory did not blow up.",
        "Include tests."
      ],
      hint: "What shape is `y_true - y_pred` when one is `(n,)` and the other is `(n, 1)`?",
      solution: {
        lang: "python",
        title: "evaluate_fixed.py",
        code: `import numpy as np


# =========================================================================
# THE BUG
# =========================================================================
#
# y_true is (n,) and y_pred is (n, 1).
#
# Broadcasting aligns from the RIGHT:
#     y_true   ->  (1, n)
#     y_pred   ->  (n, 1)
#     result   ->  (n, n)
#
# So y_true - y_pred is not a vector of n errors. It is an n-by-n
# matrix of EVERY actual minus EVERY prediction, and .mean() averages
# all n**2 of them.

y_true = np.array([100.0, 110.0, 90.0, 105.0])
y_pred = np.array([[98.0], [112.0], [88.0], [107.0]])

(y_true - y_pred).shape                 # (4, 4) -- not (4,)


# =========================================================================
# WHY THE WRONG NUMBER IS STABLE AND PLAUSIBLE
# =========================================================================
#
# The n**2 matrix contains n genuine errors on the diagonal and
# n**2 - n cross terms comparing unrelated pairs. For n = 5000 that is
# 5,000 real values against 24,995,000 noise values -- the model's
# actual accuracy contributes 0.02% of the average.
#
# What the metric ACTUALLY measures is the mean absolute relative
# spread of the target variable against itself. That is a property of
# the DATA, not of the model.
#
# Hence the stability: retraining changes the model, and the model
# barely enters the calculation. The number moves only when the target
# distribution moves.

def demo(n=2000, model_error=0.02, seed=0):
    rng = np.random.default_rng(seed)
    actual = rng.normal(100, 15, n)
    pred = actual * (1 + rng.normal(0, model_error, n))

    broken = np.abs((actual - pred[:, None]) / actual).mean() * 100
    correct = np.abs((actual - pred) / actual).mean() * 100
    return broken, correct


demo(model_error=0.02)          # (~13.4, ~1.6)
demo(model_error=0.20)          # (~13.6, ~15.9)
demo(model_error=0.50)          # (~14.9, ~39.9)
#
# THE MODEL GOT 25x WORSE AND THE BROKEN METRIC MOVED BY 1.5 POINTS.
# That is the whole failure: it is measuring the target's coefficient
# of variation, with the model as a rounding error.


# =========================================================================
# WHY MEMORY DID NOT BLOW UP
# =========================================================================
#
# n = 5,000 gives a 5,000 x 5,000 float64 matrix = 200 MB. Large, but
# allocatable, so nothing crashed. The bug survives precisely BECAUSE
# the dataset is small enough not to trip the obvious symptom.
#
# On 50,000 rows the same code allocates 20 GB and dies immediately --
# which would have caught it on day one.
for n in (1_000, 5_000, 50_000, 200_000):
    print(n, f"{n * n * 8 / 1e9:.1f} GB")
# 1000 0.0 GB / 5000 0.2 GB / 50000 20.0 GB / 200000 320.0 GB


# =========================================================================
# THE FIX -- fail loudly, in one place
# =========================================================================

def _as_vector(x, name):
    """Coerce to a 1-D float array, rejecting anything ambiguous.

    Accepts (n,) and (n, 1) because sklearn and pandas disagree about
    which they return. Rejects (n, k>1), because silently taking one
    column would be another guess.
    """
    a = np.asarray(x, dtype=float)
    if a.ndim == 2 and a.shape[1] == 1:
        a = a.ravel()
    if a.ndim != 1:
        raise ValueError(f"{name} must be 1-D, got shape {a.shape}")
    return a


def _aligned(y_true, y_pred):
    y_true = _as_vector(y_true, "y_true")
    y_pred = _as_vector(y_pred, "y_pred")
    if y_true.shape != y_pred.shape:
        raise ValueError(
            f"length mismatch: y_true {y_true.shape}, y_pred {y_pred.shape}"
        )
    return y_true, y_pred


def mape(y_true, y_pred, eps=1e-9):
    y_true, y_pred = _aligned(y_true, y_pred)

    # A SECOND BUG worth fixing while here: division by zero. The
    # original returns inf if any actual is 0, poisoning the mean.
    keep = np.abs(y_true) > eps
    if not keep.all():
        dropped = (~keep).sum()
        if keep.sum() == 0:
            return float("nan")
        # MAPE is undefined at zero. Excluding those rows is a choice
        # that must be visible, not silent.
        print(f"mape: excluded {dropped} rows with |actual| <= {eps}")

    return np.abs((y_true[keep] - y_pred[keep]) / y_true[keep]).mean() * 100


def evaluate(model, df, features, target="actual"):
    y_true = df[target].to_numpy()
    y_pred = model.predict(df[features])
    y_true, y_pred = _aligned(y_true, y_pred)

    err = y_pred - y_true
    return {
        "mape": mape(y_true, y_pred),
        "mae": np.abs(err).mean(),
        "rmse": np.sqrt((err ** 2).mean()),
        "bias": err.mean(),
        "n": y_true.size,
    }


# =========================================================================
# PREVENTING RECURRENCE
# =========================================================================
#
# 1. ONE coercion helper, used by every metric. The shape check must
#    not be something each metric author remembers to write.
#
# 2. A CANARY TEST: a deliberately bad model must score badly. The
#    broken metric passes every "does it run" test, but fails this:
def test_metric_responds_to_model_quality():
    rng = np.random.default_rng(0)
    actual = rng.normal(100, 15, 2000)
    good = actual * (1 + rng.normal(0, 0.01, 2000))
    bad = actual * (1 + rng.normal(0, 0.50, 2000))

    assert mape(actual, bad) > 5 * mape(actual, good)
#
# 3. SHAPE ASSERTIONS AT THE BOUNDARY, not sprinkled through the code.
#    Anywhere an external library hands you an array, normalise it once.


# =========================================================================
# TESTS
# =========================================================================

def test_column_vector_is_accepted_and_flattened():
    actual = np.array([100.0, 110.0, 90.0])
    col = np.array([[99.0], [111.0], [91.0]])
    row = np.array([99.0, 111.0, 91.0])

    assert np.isclose(mape(actual, col), mape(actual, row))


def test_the_original_bug_is_now_an_error():
    """Two-column input is a genuine ambiguity and must not be guessed."""
    actual = np.array([100.0, 110.0])
    two_col = np.array([[99.0, 98.0], [111.0, 112.0]])

    try:
        mape(actual, two_col)
        assert False, "should have raised"
    except ValueError as e:
        assert "1-D" in str(e)


def test_length_mismatch_raises():
    try:
        mape(np.ones(5), np.ones(4))
        assert False, "should have raised"
    except ValueError as e:
        assert "length mismatch" in str(e)


def test_broken_metric_was_measuring_the_target_not_the_model():
    b_good, c_good = demo(model_error=0.01)
    b_bad, c_bad = demo(model_error=0.50)

    assert c_bad / c_good > 20            # the real metric responds
    assert b_bad / b_good < 1.5           # the broken one barely moves


def test_zero_actuals_do_not_produce_inf():
    actual = np.array([0.0, 100.0, 110.0])
    pred = np.array([1.0, 99.0, 111.0])

    result = mape(actual, pred)
    assert np.isfinite(result)


def test_metric_responds_to_model_quality_runs():
    test_metric_responds_to_model_quality()`,
        notes: [
          { t: "p", text: "**The broken metric was measuring the target's coefficient of variation.** The n genuine errors sit on the diagonal of an n×n matrix; at n = 5,000 they are 0.02% of the values being averaged, so the model barely enters its own evaluation." },
          { t: "callout", kind: "trap", title: "It survived because the data was small", body: [
            { t: "p", text: "At 5,000 rows the accidental matrix is 200 MB — large, but allocatable, so nothing crashed. **The bug survived precisely because the dataset was too small to trip the obvious symptom.**" },
            { t: "p", text: "At 50,000 rows the same line asks for 20 GB and dies on the first run. A bug that is fatal at scale and silent below it is the worst shape a bug can have." }
          ]},
          { t: "p", text: "**The canary test is the real fix.** Shape assertions catch this instance; a test asserting that a deliberately bad model must score badly catches the entire class, including whatever the next version of this mistake looks like." },
          { t: "p", text: "**`(n, 1)` is accepted and flattened; `(n, k>1)` raises.** sklearn and pandas genuinely disagree about which they return, so accommodating both is right — but silently taking one column of a multi-output prediction would just be another guess." },
          { t: "p", text: "**Division by zero was a second live bug.** One zero actual makes the original return `inf` and poisons the mean; excluding those rows is a defensible choice, but it has to be visible rather than silent." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "What is the shape of `np.ones((5, 3)) * np.ones(3)`?",
          options: ["(5, 3)", "(3,)", "(5, 3, 3)", "ValueError"],
          answer: 0,
          why: "Shapes align from the right: `(3,)` pads to `(1, 3)`, and the 1 stretches down all five rows. The 3s match exactly, so the result is `(5, 3)` and each column gets its own multiplier."
        }
      ]
    }
  ],

  takeaways: [
    "**Vectorisation removes the interpreter from the loop** — one dispatch and a compiled C loop, not a faster Python loop.",
    "**`np.vectorize` is not vectorisation.** Its own documentation says it exists for convenience, not performance.",
    "**Count passes over the data, not loops in the source.** A vectorised call inside a 1,000-iteration loop is 1,000 full scans.",
    "**Broadcasting compares shapes from the right**, padding missing dimensions with 1.",
    "**Two dimensions are compatible if they are equal or one is 1** — anything else raises `ValueError`.",
    "**Nothing is copied when broadcasting**: NumPy sets the stride along the stretched axis to 0.",
    "**`(n, 1)` against `(n,)` produces an `n × n` matrix silently** — the most common broadcasting bug, and it arrives as a wrong metric rather than an exception.",
    "**Use `a[:, None]` to make a column** and control which axis aligns, rather than hoping the default is what you meant.",
    "**Assert shape equality inside metric functions.** One line converts a silent wrong answer into an immediate failure.",
    "**Vectorised expressions trade memory for time**: every intermediate in a chain is a full-size array.",
    "**Expanding the algebra can cut the largest temporary by orders of magnitude** — `‖a−b‖² = ‖a‖² + ‖b‖² − 2a·b` turns `(n, n, d)` into `(n, n)`.",
    "**A bug that is fatal at scale and silent below it is the worst shape a bug can have** — which is an argument for shape assertions, not for bigger test data."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `a * b` roughly 200× faster than an equivalent Python loop?",
        options: [
          "NumPy uses multiple CPU cores",
          "The per-element interpreter overhead — dispatch, type check, object allocation — is removed entirely, not reduced",
          "NumPy caches results",
          "The loop is compiled just-in-time"
        ],
        answer: 1,
        why: "The arithmetic was never the expensive part. Removing the interpreter from the inner loop eliminates roughly 80 ns per element of dispatch and allocation, and lets the compiler use SIMD registers on contiguous data. Basic NumPy operations are single-threaded, so it is not about cores."
      },
      {
        stem: "`y_true` is `(500,)` and `y_pred` is `(500, 1)`. What does `(y_true - y_pred).mean()` return?",
        options: [
          "The mean error",
          "A plausible-looking number computed from a 500×500 matrix of every pairwise difference",
          "A ValueError",
          "An array of 500 values"
        ],
        answer: 1,
        why: "The shapes broadcast to `(500, 500)`: 500 genuine errors on the diagonal and 249,500 comparisons between unrelated pairs. The result is dominated by the target's own spread, which is why such a metric stays stable even when the model degrades badly."
      },
      {
        stem: "Which change reduces peak memory in a pairwise distance calculation on 5,000 points with 50 features?",
        options: [
          "Using float32 for the input",
          "Expanding ‖a−b‖² to ‖a‖² + ‖b‖² − 2a·b, so the largest temporary is (n, n) rather than (n, n, d)",
          "Using np.vectorize",
          "Looping over rows"
        ],
        answer: 1,
        why: "The naive broadcast materialises an `(n, n, d)` intermediate — 10 GB here. The algebraic form's largest array is `(n, n)` at 200 MB, and the matrix product runs in optimised BLAS. Clamp the result at zero before the square root, because float cancellation produces tiny negatives."
      },
      {
        stem: "You need one multiplier per row of a `(2, 3)` array, but `prices * discount` raises with `discount` of shape `(2,)`. What is the fix?",
        options: [
          "Transpose prices",
          "`prices * discount[:, None]` — reshape to `(2, 1)` so it stretches across columns",
          "Convert discount to a list",
          "Use np.multiply"
        ],
        answer: 1,
        why: "Broadcasting aligns from the right, so `(2,)` pads to `(1, 2)` and meets the 3 columns — a mismatch. `discount[:, None]` makes it `(2, 1)`, which stretches along axis 1 and applies one value per row."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain broadcasting to someone who has only used Python lists.",
        strong: "It lets NumPy combine arrays of different shapes by virtually stretching axes of length 1. Shapes are compared from the right, missing dimensions are treated as 1, and two lengths are compatible if they are equal or one is 1. Nothing is copied — the stride along the stretched axis is set to zero.",
        answer: [
          { t: "p", text: "Stating the right-alignment rule and the stride-zero implementation together shows you understand both the semantics and why it is free." },
          { t: "p", text: "A concrete example — one VAT rate per column versus one discount per row, and why the second needs `[:, None]` — makes it land." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague says their evaluation metric barely moves between model versions. Where would you look first?",
        strong: "Shape mismatch in the metric. If predictions come back as `(n, 1)` and actuals as `(n,)`, the subtraction broadcasts to `(n, n)` — the real errors are the diagonal and everything else is noise, so the number reflects the target's spread rather than the model.",
        answer: [
          { t: "p", text: "Diagnosing from a *symptom* — stability where you expect variation — rather than from reading the code is what makes this a strong answer." },
          { t: "p", text: "Following it with the fix worth having (a canary test asserting a bad model scores badly) shows you think about the class of bug, not the instance." }
        ]
      },
      {
        level: "advanced",
        q: "When is vectorising the wrong choice?",
        strong: "When the temporaries do not fit. A chained expression allocates a full-size array per intermediate, so on data near your memory limit a vectorised one-liner can be an out-of-memory error where a chunked loop succeeds. Genuinely sequential logic is the other case — numba is more honest there than a contrived array expression.",
        answer: [
          { t: "p", text: "Most candidates present vectorisation as unconditionally better, so naming the memory trade-off is a differentiator." },
          { t: "p", text: "Mentioning `out=` and in-place operators as the middle path — vectorised speed without the temporaries — shows practical experience." }
        ]
      }
    ]
  }
});

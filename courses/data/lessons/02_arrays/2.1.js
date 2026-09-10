/* ============================================================================
   LESSON 2.1 — Combining and Splitting Arrays
   ========================================================================= */
EC.receiveLesson({
  id: "2.1",

  lede: "**`concatenate` joins along an existing axis; `stack` creates a new one.** Every other combining function in NumPy is one of those two with the axis pre-chosen — and knowing which is which turns a family of confusingly-named routines into two rules.",

  objectives: [
    "State the difference between concatenate and stack in one sentence",
    "Predict the output shape of any combining operation",
    "Choose the right function for 1-D, 2-D and higher-dimensional inputs",
    "Split an array by count, by position and by group",
    "Recognise where repeat and tile differ, and why it matters"
  ],

  prerequisites: ["1.1", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "Two operations, many names", id: "two" },

    { t: "p", text: "NumPy has `concatenate`, `stack`, `vstack`, `hstack`, `dstack`, `column_stack`, `block` and `r_`. **They reduce to two behaviours**, and the confusion comes entirely from the convenience wrappers guessing an axis on your behalf." },

    { t: "dl", items: [
      ["`concatenate`", "Joins arrays along an **existing** axis. The result has the same number of dimensions as the inputs; one axis gets longer."],
      ["`stack`", "Joins arrays along a **new** axis. The result has one more dimension than the inputs, and every input must have identical shape."],
      ["`vstack`", "Stacks row-wise. On 2-D it is `concatenate(axis=0)`; on **1-D it promotes to 2-D first**, which is the surprise."],
      ["`hstack`", "Stacks column-wise. On 2-D it is `concatenate(axis=1)`; on 1-D it is `concatenate(axis=0)` — the same call means two different things."],
      ["`column_stack`", "Treats 1-D arrays as columns. This is what people usually mean when `hstack` disappoints them."],
      ["`split` / `array_split`", "The inverse of concatenate. `split` requires an even division and raises otherwise; `array_split` allows uneven pieces."]
    ]},

    { t: "viz",
      title: "concatenate lengthens an axis, stack adds one",
      caption: "Two (2,3) arrays: concatenating on axis 0 gives (4,3), on axis 1 gives (2,6). Stacking gives (2,2,3) — a new dimension, with both inputs intact inside it.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Two two-by-three arrays combined by concatenate on each axis and by stack">
  <text x="30" y="24" class="s-label" style="fill:var(--ink-2)">a (2,3)</text>
  <g stroke-width="1.5" style="fill:var(--acc);fill-opacity:.20;stroke:var(--acc)">
    <rect x="30" y="34" width="34" height="24"/><rect x="64" y="34" width="34" height="24"/><rect x="98" y="34" width="34" height="24"/>
    <rect x="30" y="58" width="34" height="24"/><rect x="64" y="58" width="34" height="24"/><rect x="98" y="58" width="34" height="24"/>
  </g>
  <text x="160" y="24" class="s-label" style="fill:var(--ink-2)">b (2,3)</text>
  <g stroke-width="1.5" style="fill:var(--good);fill-opacity:.20;stroke:var(--good)">
    <rect x="160" y="34" width="34" height="24"/><rect x="194" y="34" width="34" height="24"/><rect x="228" y="34" width="34" height="24"/>
    <rect x="160" y="58" width="34" height="24"/><rect x="194" y="58" width="34" height="24"/><rect x="228" y="58" width="34" height="24"/>
  </g>

  <text x="30" y="126" class="s-sub" style="fill:var(--ink-3)">concatenate(axis=0) → (4,3)</text>
  <g stroke-width="1.5" style="fill:var(--acc);fill-opacity:.20;stroke:var(--acc)">
    <rect x="30" y="136" width="34" height="24"/><rect x="64" y="136" width="34" height="24"/><rect x="98" y="136" width="34" height="24"/>
    <rect x="30" y="160" width="34" height="24"/><rect x="64" y="160" width="34" height="24"/><rect x="98" y="160" width="34" height="24"/>
  </g>
  <g stroke-width="1.5" style="fill:var(--good);fill-opacity:.20;stroke:var(--good)">
    <rect x="30" y="184" width="34" height="24"/><rect x="64" y="184" width="34" height="24"/><rect x="98" y="184" width="34" height="24"/>
    <rect x="30" y="208" width="34" height="24"/><rect x="64" y="208" width="34" height="24"/><rect x="98" y="208" width="34" height="24"/>
  </g>

  <text x="300" y="126" class="s-sub" style="fill:var(--ink-3)">concatenate(axis=1) → (2,6)</text>
  <g stroke-width="1.5" style="fill:var(--acc);fill-opacity:.20;stroke:var(--acc)">
    <rect x="300" y="136" width="34" height="24"/><rect x="334" y="136" width="34" height="24"/><rect x="368" y="136" width="34" height="24"/>
    <rect x="300" y="160" width="34" height="24"/><rect x="334" y="160" width="34" height="24"/><rect x="368" y="160" width="34" height="24"/>
  </g>
  <g stroke-width="1.5" style="fill:var(--good);fill-opacity:.20;stroke:var(--good)">
    <rect x="402" y="136" width="34" height="24"/><rect x="436" y="136" width="34" height="24"/><rect x="470" y="136" width="34" height="24"/>
    <rect x="402" y="160" width="34" height="24"/><rect x="436" y="160" width="34" height="24"/><rect x="470" y="160" width="34" height="24"/>
  </g>

  <text x="600" y="126" class="s-sub" style="fill:var(--ink-3)">stack(axis=0) → (2,2,3)</text>
  <g stroke-width="1.5" style="fill:var(--good);fill-opacity:.20;stroke:var(--good)">
    <rect x="632" y="150" width="34" height="24"/><rect x="666" y="150" width="34" height="24"/><rect x="700" y="150" width="34" height="24"/>
    <rect x="632" y="174" width="34" height="24"/><rect x="666" y="174" width="34" height="24"/><rect x="700" y="174" width="34" height="24"/>
  </g>
  <g stroke-width="1.5" style="fill:var(--acc);fill-opacity:.30;stroke:var(--acc)">
    <rect x="614" y="136" width="34" height="24"/><rect x="648" y="136" width="34" height="24"/><rect x="682" y="136" width="34" height="24"/>
    <rect x="614" y="160" width="34" height="24"/><rect x="648" y="160" width="34" height="24"/><rect x="682" y="160" width="34" height="24"/>
  </g>
  <text x="600" y="222" class="s-sub" style="fill:var(--ink-3)">both inputs survive whole,</text>
  <text x="600" y="242" class="s-sub" style="fill:var(--ink-3)">one layer deeper</text>

  <line x1="30" y1="262" x2="850" y2="262" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="286" class="s-sub" style="fill:var(--ink-3)">concatenate: ndim stays the same, one axis grows.   stack: ndim increases by one, shapes must match exactly.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the two rules, and where the wrappers mislead", code: `
import numpy as np

a = np.array([[1, 2, 3], [4, 5, 6]])          # (2, 3)
b = np.array([[7, 8, 9], [10, 11, 12]])       # (2, 3)

np.concatenate([a, b], axis=0).shape          # (4, 3) -- rows appended
np.concatenate([a, b], axis=1).shape          # (2, 6) -- columns appended
np.stack([a, b], axis=0).shape                # (2, 2, 3) -- NEW axis
np.stack([a, b], axis=2).shape                # (2, 3, 2)

# THE RULE: concatenate keeps ndim, stack adds one.

# ON 2-D THE WRAPPERS ARE JUST ALIASES:
np.vstack([a, b]).shape                       # (4, 3) == concatenate axis=0
np.hstack([a, b]).shape                       # (2, 6) == concatenate axis=1

# ON 1-D THEY ARE NOT, AND THIS IS THE TRAP:
x = np.array([1, 2, 3])
y = np.array([4, 5, 6])

np.vstack([x, y]).shape                       # (2, 3) -- promoted to 2-D!
np.hstack([x, y]).shape                       # (6,)   -- stayed 1-D
np.concatenate([x, y]).shape                  # (6,)
#
# vstack SILENTLY ADDS A DIMENSION on 1-D input and hstack does not.
# The same pair of calls means one thing on a matrix and another on a
# vector -- which is why code written against 2-D test data breaks the
# first time a single row arrives.

# WHAT PEOPLE USUALLY WANT: 1-D arrays as COLUMNS of a feature matrix:
np.hstack([x, y]).shape                       # (6,) -- NOT what they meant
np.column_stack([x, y]).shape                 # (3, 2) -- one column each
np.stack([x, y], axis=1).shape                # (3, 2) -- the same thing
np.c_[x, y].shape                             # (3, 2) -- the shorthand

# AND AS ROWS:
np.row_stack([x, y]).shape                    # (2, 3)
np.r_[[x], [y]].shape                         # (2, 3)

# BUILDING A FEATURE MATRIX FROM COLUMNS OF DIFFERENT SHAPES:
f1 = np.arange(100)                           # (100,)
f2 = np.random.default_rng(0).normal(size=(100, 3))   # (100, 3)

np.column_stack([f1, f2]).shape               # (100, 4) -- handles both
np.hstack([f1[:, None], f2]).shape            # (100, 4) -- explicit
#
# column_stack promotes 1-D to a column automatically. hstack does not,
# which is why the [:, None] is required there.

# SHAPE ERRORS ARE IMMEDIATE AND CLEAR, which is a relief:
try:
    np.concatenate([a, np.ones((3, 3))], axis=1)
except ValueError as e:
    print(e)     # all the input array dimensions except for the
                 # concatenation axis must match exactly

# DTYPE IS UNIFIED, and it can widen silently:
np.concatenate([np.array([1, 2]), np.array([3.5])]).dtype     # float64
np.concatenate([np.array([1, 2]), np.array(["a"])]).dtype     # <U21
#
# The second one turned integers into strings. Concatenating a column
# read from a file with one built in code is exactly where this bites.

# CONCATENATING IN A LOOP IS QUADRATIC -- collect and do it once:
parts = [np.ones(100) for _ in range(1000)]
np.concatenate(parts)                         # one allocation, one pass
`,
      hl: [23, 28, 36, 57],
      caption: "**`vstack` silently promotes 1-D input to 2-D and `hstack` does not.** The same pair of calls means one thing on a matrix and another on a vector."
    },

    { t: "callout", kind: "trap", title: "The function that behaves differently on one row", body: [
      { t: "p", text: "A helper written and tested against `(n, d)` arrays hits production, receives a single record shaped `(d,)`, and `vstack` quietly produces `(1, d)` while `hstack` produces `(d,)` — one of which flows onward and breaks somewhere else entirely." },
      { t: "p", text: "**Use `np.concatenate` with an explicit `axis=`, or `np.stack` when you mean a new dimension.** The convenience wrappers exist to save typing, and they charge for it in cases exactly like this one." },
      { t: "p", text: "**Assert ndim at the boundary** if you accept arrays from elsewhere: `np.atleast_2d(x)` normalises the single-record case once, at the point it arrives." }
    ]},

    { t: "h2", n: "02", text: "Splitting", id: "split" },

    { t: "p", text: "**Splitting is concatenation reversed**, with one distinction worth remembering: `split` demands an even division and `array_split` does not." },

    { t: "code", lang: "python", title: "the three ways to split, and batching done correctly", code: `
a = np.arange(12).reshape(6, 2)

# BY COUNT -- equal pieces, or an error:
np.split(a, 3)                # three (2,2) arrays
try:
    np.split(a, 4)            # 6 does not divide by 4
except ValueError as e:
    print(e)                  # array split does not result in an equal division

np.array_split(a, 4)          # shapes (2,2),(2,2),(1,2),(1,2) -- allowed
#
# array_split distributes the remainder to the EARLIER pieces, so the
# first chunks are the larger ones. That matters when a chunk index
# maps to something -- a worker, a file, a time slice.
[len(p) for p in np.array_split(np.arange(10), 3)]        # [4, 3, 3]

# BY POSITION -- the form you actually want most of the time:
np.split(np.arange(10), [2, 5, 9])
# [array([0,1]), array([2,3,4]), array([5,6,7,8]), array([9])]
#
# The list gives the CUT POINTS, not the sizes. Four pieces from three
# cuts, and the cuts are before those indices.

# ALONG AN AXIS:
np.split(a, 2, axis=1)        # two (6,1) arrays
np.hsplit(a, 2)               # the same
np.vsplit(a, 3)               # three (2,2)

# SPLITTING IS A VIEW OPERATION -- the pieces share memory:
pieces = np.split(np.arange(6), 3)
pieces[0].base is not None    # True
pieces[0][0] = 99             # writes through to the parent
#
# Cheap, and a source of surprise if you hand the pieces to something
# that mutates them.

# BATCHING FOR PROCESSING -- do not use split for this:
def batches(a, size):
    """Yield views of a in chunks of size, last one possibly shorter."""
    for start in range(0, len(a), size):
        yield a[start:start + size]

sum(len(b) for b in batches(np.arange(1000), 256))        # 1000
[len(b) for b in batches(np.arange(1000), 256)]           # [256,256,256,232]
#
# array_split(a, n_chunks) asks "how many pieces"; batching asks "how
# big is each piece". Using the first for the second means recomputing
# the count every time the data size changes, and getting uneven
# batches -- which breaks anything that preallocates per batch.

# SPLITTING BY GROUP, which NumPy has no direct function for:
labels = np.array([0, 1, 0, 2, 1, 0])
values = np.array([10, 20, 30, 40, 50, 60])

order = np.argsort(labels, kind="stable")     # stable keeps input order
sorted_labels = labels[order]
boundaries = np.flatnonzero(np.diff(sorted_labels)) + 1
groups = np.split(values[order], boundaries)

groups                        # [array([10,30,60]), array([20,50]), array([40])]
#
# SORT, FIND THE BOUNDARIES, SPLIT. This is exactly what pandas
# groupby does underneath, and it is worth knowing because it is O(n
# log n) with no Python loop -- unlike the dict-of-lists version.

# REPEAT AND TILE ARE NOT THE SAME:
np.repeat([1, 2, 3], 2)       # [1,1,2,2,3,3] -- each element repeated
np.tile([1, 2, 3], 2)         # [1,2,3,1,2,3] -- the whole array repeated
#
# repeat is what you need to expand group labels to row level;
# tile is what you need to build a repeating pattern.
np.repeat([0, 1, 2], [3, 1, 2])       # [0,0,0,1,2,2] -- per-element counts
`,
      hl: [17, 34, 47, 65],
      caption: "**`np.split` takes cut points, not sizes.** `split(a, [2, 5, 9])` produces four pieces from three cuts, and each cut falls *before* that index."
    },

    { t: "ladder",
      title: "Assembling a feature matrix from separately computed columns",
      rungs: [
        { level: "bad", label: "hstack on 1-D arrays", code: `X = np.hstack([ages, incomes, scores])
X.shape        # (3n,) -- one long vector, not a matrix`,
          note: "**Silently wrong.** `hstack` on 1-D concatenates end to end, so three features of 1,000 rows become a single 3,000-element vector — which a model will happily reject with an unrelated-looking shape error later." },
        { level: "ok", label: "column_stack", code: `X = np.column_stack([ages, incomes, scores])
X.shape        # (n, 3)`,
          note: "**Correct, and it hides a check.** `column_stack` promotes 1-D to columns automatically, so a feature that arrives as `(n, 2)` by mistake is absorbed without complaint and the column meanings shift." },
        { level: "best", label: "Explicit shapes and a name map", code: `cols = {"age": ages, "income": incomes, "score": scores}
for name, v in cols.items():
    if v.shape != (n,):
        raise ValueError(f"{name}: expected ({n},), got {v.shape}")

X = np.column_stack(list(cols.values()))
feature_names = list(cols)`,
          note: "**The names travel with the matrix.** A feature matrix without a column-name list is a matrix nobody can debug — and validating each shape catches the mis-shaped feature at the point it was produced, not six steps downstream." }
      ]
    },

    { t: "h2", n: "03", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Batching that survives the last chunk",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Build the batching utility a training loop and a chunked inference job both use. It has to handle a final partial batch, optional shuffling that keeps features and labels paired, and multiple arrays at once." },
        { t: "p", text: "It must not copy the whole dataset, and it must be reproducible when shuffling." }
      ],
      requirements: [
        "Yield batches from one or more arrays at once, kept aligned.",
        "Handle a final partial batch, with an option to drop it.",
        "Support reproducible shuffling via an injected generator.",
        "Avoid copying the full dataset.",
        "Reject mismatched lengths clearly.",
        "Include tests, including the edge cases."
      ],
      hint: "Shuffling and slicing pull in opposite directions: one wants a permutation, the other wants a view.",
      solution: {
        lang: "python",
        title: "batching.py",
        code: `import numpy as np


def batches(*arrays, size, shuffle=False, drop_last=False, rng=None):
    """Yield aligned batches from one or more arrays.

    arrays      any number of arrays sharing the same first dimension
    size        rows per batch
    shuffle     permute the row order (arrays stay paired)
    drop_last   discard a final partial batch
    rng         a Generator; required for reproducible shuffling

    Yields a tuple of slices, or a single slice if one array was given.
    """
    if not arrays:
        raise ValueError("no arrays given")
    if size < 1:
        raise ValueError(f"size must be >= 1, got {size}")

    arrays = [np.asarray(a) for a in arrays]
    n = len(arrays[0])

    lengths = [len(a) for a in arrays]
    if len(set(lengths)) != 1:
        raise ValueError(f"arrays have different lengths: {lengths}")

    if shuffle:
        rng = np.random.default_rng(rng)
        order = rng.permutation(n)
    else:
        order = None

    stop = n - (n % size) if drop_last else n

    for start in range(0, stop, size):
        end = min(start + size, n)

        if order is None:
            # NO SHUFFLE -> SLICE, which is a VIEW. Nothing is copied,
            # so batching a 10 GB array costs nothing per batch.
            out = tuple(a[start:end] for a in arrays)
        else:
            # SHUFFLE -> FANCY INDEXING, which must copy. But it copies
            # only ONE BATCH at a time, not the dataset. Permuting the
            # whole array up front would double peak memory.
            idx = order[start:end]
            out = tuple(a[idx] for a in arrays)

        yield out[0] if len(out) == 1 else out


# =========================================================================
# THE DESIGN DECISIONS
# =========================================================================
#
# 1. WHY NOT np.array_split?
#    array_split(a, n_chunks) asks "how many pieces", and we want "how
#    big is each piece". Using it means computing n_chunks from the
#    data size on every call, and it distributes the remainder across
#    the EARLY chunks:
#        [len(p) for p in np.array_split(np.arange(10), 3)]  -> [4,3,3]
#    Anything that preallocates a fixed-size buffer per batch then
#    breaks on the first chunk.
#
# 2. WHY PERMUTE INDICES RATHER THAN THE DATA?
#    rng.permutation(X) copies the entire array. For a 10 GB feature
#    matrix that is a 10 GB allocation before the first batch. Indexing
#    per batch copies size x n_features instead.
#
# 3. WHY drop_last?
#    A final batch of 3 rows when the rest are 256 produces a noisy
#    gradient step and breaks anything that assumes a fixed shape --
#    a preallocated buffer, a compiled kernel, a batch-norm layer with
#    too few samples. It is a real choice, so it is a parameter, and
#    the default is to keep the data.
#
# 4. WHY IS rng INJECTED?
#    A generator created inside would either be seeded (identical
#    shuffling every epoch, which defeats shuffling) or unseeded (not
#    reproducible). The caller owns the stream.


# =========================================================================
# USING IT
# =========================================================================

rng = np.random.default_rng(0)
X = rng.normal(size=(1000, 8))
y = rng.integers(0, 2, 1000)

sizes = [len(bx) for bx, by in batches(X, y, size=256)]
sizes                                   # [256, 256, 256, 232]

sizes = [len(bx) for bx, by in batches(X, y, size=256, drop_last=True)]
sizes                                   # [256, 256, 256]

# EPOCHS: a fresh permutation each time, because rng advances.
for epoch in range(3):
    for bx, by in batches(X, y, size=256, shuffle=True, rng=rng):
        pass                            # train step


# =========================================================================
# TESTS
# =========================================================================

def test_covers_every_row_exactly_once():
    a = np.arange(100)
    seen = np.concatenate(list(batches(a, size=32)))

    assert len(seen) == 100
    assert np.array_equal(np.sort(seen), a)


def test_last_partial_batch_is_kept_by_default():
    a = np.arange(100)
    sizes = [len(b) for b in batches(a, size=32)]

    assert sizes == [32, 32, 32, 4]


def test_drop_last_discards_the_remainder():
    a = np.arange(100)
    sizes = [len(b) for b in batches(a, size=32, drop_last=True)]

    assert sizes == [32, 32, 32]
    assert sum(sizes) == 96


def test_exact_multiple_has_no_empty_final_batch():
    """An off-by-one here yields a zero-length batch, which crashes
    anything that divides by the batch size."""
    a = np.arange(96)

    for drop in (False, True):
        sizes = [len(b) for b in batches(a, size=32, drop_last=drop)]
        assert sizes == [32, 32, 32]
        assert 0 not in sizes


def test_batch_larger_than_data():
    a = np.arange(10)

    assert [len(b) for b in batches(a, size=64)] == [10]
    assert list(batches(a, size=64, drop_last=True)) == []


def test_arrays_stay_paired_under_shuffle():
    """The property that makes shuffling safe."""
    X = np.arange(100).reshape(100, 1)
    y = np.arange(100) * 10

    for bx, by in batches(X, y, size=16, shuffle=True,
                          rng=np.random.default_rng(0)):
        assert np.array_equal(bx.ravel() * 10, by)


def test_shuffle_is_reproducible():
    a = np.arange(50)

    one = np.concatenate(list(batches(a, size=8, shuffle=True,
                                      rng=np.random.default_rng(7))))
    two = np.concatenate(list(batches(a, size=8, shuffle=True,
                                      rng=np.random.default_rng(7))))

    assert np.array_equal(one, two)
    assert not np.array_equal(one, a)              # it did shuffle


def test_unshuffled_batches_are_views():
    """No copy means batching a huge array is free."""
    a = np.arange(100)
    first = next(batches(a, size=10))

    assert first.base is not None
    assert np.shares_memory(first, a)


def test_shuffled_batch_does_not_copy_the_dataset():
    a = np.arange(100)
    first = next(batches(a, size=10, shuffle=True,
                         rng=np.random.default_rng(0)))

    assert not np.shares_memory(first, a)          # it is a copy
    assert first.size == 10                        # of ONE batch only


def test_mismatched_lengths_raise():
    try:
        list(batches(np.arange(10), np.arange(9), size=4))
        assert False, "should have raised"
    except ValueError as e:
        assert "different lengths" in str(e)


def test_single_array_yields_the_array_not_a_tuple():
    b = next(batches(np.arange(10), size=4))

    assert isinstance(b, np.ndarray)


def test_empty_input():
    assert list(batches(np.array([]), size=4)) == []


def test_rejects_zero_size():
    try:
        list(batches(np.arange(10), size=0))
        assert False, "should have raised"
    except ValueError:
        pass`,
        notes: [
          { t: "p", text: "**Unshuffled batches are slices, which are views** — batching a 10 GB array costs nothing per batch. Shuffled batches must copy, but they copy one batch at a time rather than permuting the whole dataset up front and doubling peak memory." },
          { t: "callout", kind: "insight", title: "\"how many pieces\" and \"how big\" are different questions", body: [
            { t: "p", text: "`np.array_split(a, 3)` on ten elements gives `[4, 3, 3]` — it distributes the remainder across the *early* chunks. Anything that preallocates a fixed-size buffer per batch breaks on the first one." },
            { t: "p", text: "**Batching asks how big each piece is**, so `range(0, n, size)` is the correct primitive and `array_split` is the wrong tool despite being the obvious one." }
          ]},
          { t: "p", text: "**The exact-multiple test is the one that catches off-by-one errors.** 96 rows in batches of 32 must give three batches, not three plus an empty fourth — and a zero-length batch crashes anything that divides by the batch size." },
          { t: "p", text: "**`drop_last` is a real choice, not tidiness.** A final batch of 3 rows among 256s produces a noisy gradient step and breaks preallocated buffers, compiled kernels and batch-norm layers with too few samples. The default keeps the data because silently discarding rows is worse." },
          { t: "p", text: "**The generator is injected because both alternatives are wrong.** One created inside would be either seeded — identical shuffling every epoch, which defeats the purpose — or unseeded, which is not reproducible." },
          { t: "p", text: "**Pairing is asserted, not assumed.** Shuffling `X` and `y` with separate calls silently destroys the correspondence and produces a model that trains on noise; one permutation applied to both is what makes it safe." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`x` and `y` are both shape `(3,)`. What is `np.vstack([x, y]).shape`?",
          options: ["(6,)", "(2, 3) — vstack promotes 1-D input to 2-D first", "(3, 2)", "(2,)"],
          answer: 1,
          why: "`vstack` promotes 1-D arrays to shape `(1, 3)` before concatenating on axis 0, so the result gains a dimension. `hstack` on the same input gives `(6,)` — the two wrappers disagree on 1-D and agree on 2-D, which is why explicit `concatenate(axis=)` is safer."
        }
      ]
    }
  ],

  takeaways: [
    "**`concatenate` lengthens an existing axis; `stack` creates a new one** — that is the whole distinction.",
    "**`stack` requires identical input shapes**; `concatenate` requires them to match on every axis but the joining one.",
    "**`vstack` promotes 1-D input to 2-D and `hstack` does not** — the same pair of calls means different things on a vector and a matrix.",
    "**`column_stack` is what people usually mean when `hstack` disappoints them** on 1-D feature arrays.",
    "**Concatenating unifies dtype**, which can silently turn integers into strings.",
    "**Concatenating in a loop is quadratic** — collect into a list and join once.",
    "**`np.split` takes cut points, not sizes**, and each cut falls before that index.",
    "**`split` requires an even division; `array_split` allows uneven pieces** and gives the remainder to the earlier ones.",
    "**Split pieces are views** and share memory with the parent.",
    "**Batching asks \"how big\", not \"how many\"** — `range(0, n, size)` is the primitive, not `array_split`.",
    "**Permute indices rather than data** when shuffling: copying one batch beats copying the dataset.",
    "**`repeat` expands each element; `tile` repeats the whole array** — `repeat` is what expands group labels to row level."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Two arrays of shape `(2, 3)`. What does `np.stack([a, b], axis=0)` produce?",
        options: [
          "Shape (4, 3)",
          "Shape (2, 2, 3) — a new axis, with both inputs intact inside it",
          "Shape (2, 6)",
          "An error"
        ],
        answer: 1,
        why: "`stack` adds a dimension rather than lengthening one, so both inputs survive whole one layer deeper. `concatenate(axis=0)` is the operation that gives `(4, 3)` — the rule is that concatenate keeps ndim and stack increases it by one."
      },
      {
        stem: "You have three 1-D feature arrays of length n and want an (n, 3) matrix. Which is correct?",
        options: [
          "`np.hstack([a, b, c])`",
          "`np.column_stack([a, b, c])`",
          "`np.concatenate([a, b, c])`",
          "`np.vstack([a, b, c])`"
        ],
        answer: 1,
        why: "`hstack` and `concatenate` join 1-D arrays end to end, giving a single `(3n,)` vector — silently wrong, and it surfaces as an unrelated-looking shape error further downstream. `vstack` gives `(3, n)`, the transpose of what you wanted."
      },
      {
        stem: "`np.array_split(np.arange(10), 3)` produces chunks of what sizes?",
        options: [
          "[3, 3, 4]",
          "[4, 3, 3] — the remainder goes to the earlier chunks",
          "[3, 3, 3] with one element dropped",
          "It raises, since 10 is not divisible by 3"
        ],
        answer: 1,
        why: "`array_split` allows uneven division and front-loads the remainder; `split` would raise. This matters whenever a chunk index maps to something real — a worker, a file, a time slice — and it is why batching should use `range(0, n, size)` instead."
      },
      {
        stem: "You shuffle a 10 GB feature matrix before batching. What is the memory-efficient approach?",
        options: [
          "`rng.permutation(X)` then slice",
          "Permute an index array once, then fancy-index one batch at a time",
          "Shuffle each batch after slicing",
          "Sort by a random column"
        ],
        answer: 1,
        why: "Permuting the array itself allocates a full copy before the first batch. Permuting indices costs 8 bytes per row, and each batch copies only `size × n_features`. Shuffling within batches is not a shuffle at all — rows never leave their original neighbourhood."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between `np.concatenate` and `np.stack`?",
        strong: "`concatenate` joins along an axis that already exists, so the result has the same number of dimensions with one axis longer. `stack` introduces a new axis, so the result has one more dimension and every input must have exactly the same shape. The wrappers — vstack, hstack, column_stack — are those two with an axis pre-chosen.",
        answer: [
          { t: "p", text: "Reducing eight functions to two rules is the answer being looked for, and it shows you are not memorising an API surface." },
          { t: "p", text: "The 1-D wrinkle — `vstack` promoting and `hstack` not — is the practical detail that turns this into an experience answer." }
        ]
      },
      {
        level: "advanced",
        q: "How would you shuffle and batch a dataset too large to copy?",
        strong: "Permute an index array rather than the data — that costs 8 bytes per row — then fancy-index one batch at a time. Unshuffled batches can be plain slices, which are views and cost nothing. The generator should be a parameter so shuffling is reproducible without being identical every epoch.",
        answer: [
          { t: "p", text: "The index-permutation point is the substantive one; most people reach for `rng.permutation(X)` without noticing it allocates a full copy." },
          { t: "p", text: "Noting that unshuffled batches can stay views shows you know the difference between basic and fancy indexing and its memory consequence." }
        ]
      },
      {
        level: "advanced",
        q: "Why might a helper that assembles a feature matrix break on a single record?",
        strong: "Because the combining wrappers behave differently on 1-D input. A function tested on `(n, d)` arrays that receives a `(d,)` record gets `(1, d)` from vstack and `(d,)` from hstack, and one of those flows onward and fails somewhere unrelated. Normalising with `atleast_2d` at the boundary, or using explicit `concatenate(axis=)`, removes the ambiguity.",
        answer: [
          { t: "p", text: "This is a real production failure mode and connects the API detail to a consequence, which is what makes it worth mentioning." },
          { t: "p", text: "Adding that the feature-name list should travel with the matrix shows you have debugged one without names." }
        ]
      }
    ]
  }
});

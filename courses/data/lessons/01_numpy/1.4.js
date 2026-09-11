/* ============================================================================
   LESSON 1.4 — Axes, Reductions and Keepdims
   ========================================================================= */
EC.receiveLesson({
  id: "1.4",

  lede: "**`axis=0` does not mean \"rows\" — it means the axis that disappears.** Once you read it that way, every reduction, every `keepdims` argument and every broadcasting failure after an aggregation becomes predictable rather than something you settle by trial and error.",

  objectives: [
    "State what `axis=n` removes and what shape results",
    "Predict the output shape of any reduction before running it",
    "Use `keepdims` to keep a result broadcastable against its source",
    "Choose between nan-aware and nan-propagating reductions deliberately",
    "Reduce over multiple axes and over an entire array"
  ],

  prerequisites: ["1.2"],

  blocks: [

    { t: "h2", n: "01", text: "The axis that disappears", id: "axis" },

    { t: "p", text: "People memorise \"axis=0 is down the columns\" and then get lost the first time they meet a 3-D array. **The rule that generalises is simpler: `axis=n` collapses dimension `n`, and the result has that dimension removed.**" },

    { t: "dl", items: [
      ["Axis", "A dimension of an array, numbered from 0. For a 2-D array of shape `(rows, cols)`, axis 0 is the row dimension and axis 1 is the column dimension."],
      ["Reduction", "An operation that collapses one or more axes to a single value each — `sum`, `mean`, `max`, `std`, `any`, `all`, `argmax`."],
      ["`axis=n`", "The axis to collapse. It is the axis that **disappears** from the shape: reducing `(3, 4)` along axis 0 gives `(4,)`."],
      ["`axis=None`", "The default for most reductions. Collapses **every** axis and returns a scalar."],
      ["`keepdims=True`", "Keeps the collapsed axis as length 1 instead of removing it — `(3, 4)` becomes `(1, 4)` rather than `(4,)`, so it still broadcasts against the source."],
      ["`argmax` / `argmin`", "Return the **index** of the extreme value along an axis, not the value itself."]
    ]},

    { t: "viz",
      title: "axis=0 removes the first dimension, axis=1 the second",
      caption: "Read the shape, strike out the axis you named, and what is left is the result shape. The rule holds for any number of dimensions.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="A 3 by 4 grid reduced along axis 0 giving four values, and along axis 1 giving three values">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">X.shape = (3, 4)</text>
  <g stroke-width="1.5">
    <rect x="30" y="40" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="82" y="40" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="134" y="40" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="186" y="40" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="30" y="74" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="82" y="74" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="134" y="74" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="186" y="74" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="30" y="108" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="82" y="108" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="134" y="108" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="186" y="108" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
  </g>

  <g style="stroke:var(--accent);stroke-width:2">
    <line x1="56" y1="34" x2="56" y2="150" marker-end="url(#ax-a)"/>
    <line x1="108" y1="34" x2="108" y2="150" marker-end="url(#ax-a)"/>
    <line x1="160" y1="34" x2="160" y2="150" marker-end="url(#ax-a)"/>
    <line x1="212" y1="34" x2="212" y2="150" marker-end="url(#ax-a)"/>
  </g>
  <text x="30" y="184" class="s-label" style="fill:var(--accent)">X.sum(axis=0)</text>
  <g stroke-width="1.5">
    <rect x="30" y="194" width="52" height="30" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)"/>
    <rect x="82" y="194" width="52" height="30" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)"/>
    <rect x="134" y="194" width="52" height="30" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)"/>
    <rect x="186" y="194" width="52" height="30" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)"/>
  </g>
  <text x="30" y="248" class="s-sub" style="fill:var(--accent)">(3, 4) → strike axis 0 → (4,)</text>
  <text x="30" y="272" class="s-sub" style="fill:var(--ink-3)">one value per COLUMN</text>

  <g style="stroke:var(--good);stroke-width:2">
    <line x1="470" y1="57" x2="700" y2="57" marker-end="url(#ax-g)"/>
    <line x1="470" y1="91" x2="700" y2="91" marker-end="url(#ax-g)"/>
    <line x1="470" y1="125" x2="700" y2="125" marker-end="url(#ax-g)"/>
  </g>
  <g stroke-width="1.5">
    <rect x="470" y="40" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="522" y="40" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="574" y="40" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="626" y="40" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="470" y="74" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="522" y="74" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="574" y="74" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="626" y="74" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="470" y="108" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="522" y="108" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="574" y="108" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="626" y="108" width="52" height="34" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
  </g>
  <g stroke-width="1.5">
    <rect x="712" y="44" width="52" height="26" style="fill:var(--good);fill-opacity:.22;stroke:var(--good)"/>
    <rect x="712" y="78" width="52" height="26" style="fill:var(--good);fill-opacity:.22;stroke:var(--good)"/>
    <rect x="712" y="112" width="52" height="26" style="fill:var(--good);fill-opacity:.22;stroke:var(--good)"/>
  </g>
  <text x="470" y="184" class="s-label" style="fill:var(--good)">X.sum(axis=1)</text>
  <text x="470" y="248" class="s-sub" style="fill:var(--good)">(3, 4) → strike axis 1 → (3,)</text>
  <text x="470" y="272" class="s-sub" style="fill:var(--ink-3)">one value per ROW</text>

  <defs>
    <marker id="ax-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--accent)"/></marker>
    <marker id="ax-g" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--good)"/></marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "python", title: "reading shapes rather than remembering rules", code: `
import numpy as np

X = np.arange(12).reshape(3, 4)

X.sum()                       # 66      -- axis=None, everything collapses
X.sum(axis=0).shape           # (4,)    -- axis 0 struck out
X.sum(axis=1).shape           # (3,)    -- axis 1 struck out
X.sum(axis=(0, 1))            # 66      -- both, same as axis=None

# THE NAMING THAT CONFUSES PEOPLE:
#   axis=0 gives ONE VALUE PER COLUMN -- so people call it "columns"
#   but the argument names the axis being REMOVED, which is rows.
# Say "collapse axis 0" and the ambiguity disappears.

# THE RULE HOLDS IN ANY NUMBER OF DIMENSIONS. A batch of images:
imgs = np.random.default_rng(0).random((32, 64, 64, 3))   # N, H, W, C

imgs.mean(axis=0).shape          # (64, 64, 3)  -- average image
imgs.mean(axis=(1, 2)).shape     # (32, 3)      -- mean colour per image
imgs.mean(axis=-1).shape         # (32, 64, 64) -- greyscale
#
# NEGATIVE AXES COUNT FROM THE END, and axis=-1 is the most portable
# way to say "the last axis" when the number of dimensions varies.

# argmax RETURNS AN INDEX, NOT A VALUE -- a routine source of confusion:
scores = np.array([[0.1, 0.7, 0.2],
                   [0.6, 0.1, 0.3]])
scores.argmax(axis=1)         # array([1, 0]) -- which class
scores.max(axis=1)            # array([0.7, 0.6]) -- the probability

# To get the value AT the argmax along another axis, index explicitly:
best = scores.argmax(axis=1)
scores[np.arange(len(scores)), best]      # array([0.7, 0.6])
#
# scores[:, best] is NOT the same thing -- it selects those COLUMNS for
# every row and gives a (2, 2) matrix. This is a common wrong answer.

# ORDER MATTERS WHEN REDUCING TWICE SEQUENTIALLY:
X.sum(axis=0).sum(axis=0)     # 66 -- fine for sum
X.mean(axis=0).mean(axis=0)   # 5.5 -- correct here ONLY because the
                              # rows are equal length
#
# A mean of means is not the overall mean when groups differ in size.
# X.mean() is unambiguous; chained means are a bug waiting for
# unbalanced data.

# any / all ARE REDUCTIONS TOO:
missing = np.isnan(np.array([[1.0, np.nan], [3.0, 4.0]]))
missing.any(axis=1)           # array([True, False]) -- rows with any nan
missing.all(axis=0)           # array([False, False]) -- fully nan columns
missing.sum()                 # 1 -- True counts as 1
`,
      hl: [17, 27, 33, 44],
      caption: "**`argmax` returns an index.** `scores[:, best]` selects those columns for *every* row and gives a matrix — the correct form pairs each row with its own index."
    },

    { t: "h2", n: "02", text: "keepdims and the broadcast after a reduction", id: "keepdims" },

    { t: "p", text: "**Reductions remove an axis, which breaks the shape alignment you need to use the result against the original array.** `keepdims=True` keeps the axis at length 1, so broadcasting stretches it back — this is the entire reason the argument exists." },

    { t: "code", lang: "python", title: "why normalisation needs keepdims", code: `
X = np.array([[1.0, 2.0, 3.0, 4.0],
              [5.0, 6.0, 7.0, 8.0],
              [9.0, 10.0, 11.0, 12.0]])          # (3, 4)

# NORMALISE EACH COLUMN -- collapse axis 0:
col_mean = X.mean(axis=0)                        # (4,)
X - col_mean                                     # (3,4) - (4,) -> works
#
# It works by luck of alignment: (4,) pads to (1,4) and stretches down
# the rows, which is exactly what per-column means require.

# NORMALISE EACH ROW -- collapse axis 1:
row_mean = X.mean(axis=1)                        # (3,)
X - row_mean                                     # ValueError: (3,4) vs (3,)
#
# (3,) pads to (1,3) and meets 4 columns. The shape that was correct
# for columns is wrong for rows, which is why one of these "just works"
# and the other raises for no apparent reason.

row_mean = X.mean(axis=1, keepdims=True)         # (3, 1)
X - row_mean                                     # works, aligned per row

# keepdims MAKES BOTH CASES UNIFORM -- no thinking required:
X - X.mean(axis=0, keepdims=True)                # (3,4) - (1,4)
X - X.mean(axis=1, keepdims=True)                # (3,4) - (3,1)
#
# USE keepdims=True BY DEFAULT when the result will be used against
# the array it came from. It costs nothing and removes the class of
# error where the wrong axis silently broadcasts.

# THE DANGEROUS VERSION: a case that neither works nor raises.
Y = np.arange(16).reshape(4, 4)                  # SQUARE
Y - Y.mean(axis=1)                               # NO ERROR
#
# On a square array (4,) aligns with the columns just as happily as
# with the rows, so subtracting row means silently subtracts them
# COLUMN-wise. Every value is wrong and nothing complains.
np.allclose(Y - Y.mean(axis=1),
            Y - Y.mean(axis=1, keepdims=True))   # False
#
# THIS IS WHY TOY EXAMPLES ARE DANGEROUS. A 4x4 test array hides the
# bug that a 100x20 production array would have raised on.

# SOFTMAX -- keepdims in its natural home:
def softmax(z, axis=-1):
    z = z - z.max(axis=axis, keepdims=True)      # stability, needs shape
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)   # normalise, needs shape

softmax(np.array([[1.0, 2.0, 3.0]]))             # sums to 1 per row
#
# Both keepdims here are load-bearing. Drop either one and the
# function breaks on non-square input and silently misbehaves on
# square input.
`,
      hl: [13, 22, 31, 44],
      caption: "**On a square array the wrong axis broadcasts silently.** A 4×4 test case hides the bug that a 100×20 production array would have raised on immediately."
    },

    { t: "callout", kind: "trap", title: "Square test data hides shape bugs", body: [
      { t: "p", text: "`Y - Y.mean(axis=1)` raises on a `(100, 20)` array and succeeds — wrongly — on a `(4, 4)` one. The result is subtly incorrect rather than absent, and every assertion about \"it runs\" passes." },
      { t: "p", text: "**Make test arrays deliberately non-square**, and give each dimension a different prime-ish length: `(7, 3)` beats `(4, 4)` for catching axis mistakes, and costs nothing." },
      { t: "p", text: "The same reasoning applies to batch sizes. A test with `batch=n_features` will not catch an axis swap that production data reveals on the first request." }
    ]},

    { t: "h2", n: "03", text: "Reductions and missing data", id: "nan" },

    { t: "p", text: "**One `nan` anywhere in an array makes the whole reduction `nan`** — that is correct behaviour, not a bug. The `nan`-aware variants skip missing values instead, and choosing between them is a decision about what a missing value means, not a convenience." },

    { t: "table",
      head: ["Standard", "nan-aware", "Behaviour with nan present"],
      rows: [
        ["`np.sum`", "`np.nansum`", "`nansum` treats nan as 0 — including an all-nan slice, which returns 0"],
        ["`np.mean`", "`np.nanmean`", "`nanmean` divides by the count of non-missing; all-nan gives nan and a warning"],
        ["`np.max` / `np.min`", "`np.nanmax` / `np.nanmin`", "Standard versions return nan; nan-aware raise on an all-nan slice"],
        ["`np.std` / `np.var`", "`np.nanstd` / `np.nanvar`", "Note `ddof=0` by default — the population form, not the sample form"],
        ["`np.argmax`", "`np.nanargmax`", "`argmax` returns the index of the nan itself, because nan compares as neither"],
        ["`np.median`", "`np.nanmedian`", "Much slower than mean; it must sort"]
      ],
      caption: "**`np.std` uses `ddof=0` by default** — the population standard deviation. pandas defaults to `ddof=1`, so the same column gives two different numbers depending on which library computed it."
    },

    { t: "code", lang: "python", title: "the choice nan-handling forces on you", code: `
sensor = np.array([10.0, 12.0, np.nan, 11.0, np.nan, 13.0])

sensor.mean()                 # nan -- one missing value poisons it
np.nanmean(sensor)            # 11.5 -- the mean of the four present

# THIS IS A MODELLING DECISION, NOT A CLEANUP STEP:
#
#   nanmean says "the missing readings would have looked like the
#   present ones". If the sensor drops out under load, and load
#   correlates with the reading, that assumption is exactly wrong --
#   and it produces a confidently biased number instead of a nan that
#   would have prompted a question.
#
# nan PROPAGATING IS A FEATURE. It is the array telling you that the
# answer depends on data you do not have.

# nansum's ZERO CONVENTION IS THE SHARPEST EDGE:
np.nansum(np.array([np.nan, np.nan]))       # 0.0
np.nanmean(np.array([np.nan, np.nan]))      # nan + RuntimeWarning
#
# A total of 0 for a group with no data is indistinguishable from a
# group that genuinely totalled zero. In a revenue report those mean
# very different things.

# ALWAYS CARRY THE COUNT ALONGSIDE THE AGGREGATE:
def safe_mean(a, axis=None, min_count=1):
    """nanmean, but nan when too few values are present to justify one."""
    a = np.asarray(a, dtype=float)
    n = np.sum(~np.isnan(a), axis=axis)
    with np.errstate(invalid="ignore"):
        m = np.nanmean(np.where(np.isnan(a), np.nan, a), axis=axis)
    return np.where(n >= min_count, m, np.nan), n

safe_mean(np.array([np.nan, np.nan]), min_count=1)     # (nan, 0)
safe_mean(sensor, min_count=5)                         # (nan, 4)
#
# min_count=5 says "four readings is not enough to call this a mean".
# That threshold is a judgement, and it belongs in the code where a
# reviewer can see it rather than in someone's head.

# argmax AND nan -- a genuinely surprising result:
a = np.array([1.0, np.nan, 3.0])
a.argmax()                    # 1 -- the INDEX OF THE NAN
np.nanargmax(a)               # 2 -- correct
#
# nan compares False against everything, including in the "is this
# bigger than the current best" test, so the scan's behaviour depends
# on implementation detail. Never call argmax on data that may
# contain nan.

# 2-D: nan handling is per-slice, not global:
X = np.array([[1.0, 2.0], [np.nan, 4.0], [5.0, 6.0]])
X.mean(axis=0)                # [nan, 4.0] -- only column 0 is poisoned
np.nanmean(X, axis=0)         # [3.0, 4.0]
np.isnan(X).sum(axis=0)       # [1, 0] -- report this next to the means
`,
      hl: [4, 18, 26, 44],
      caption: "**`np.nansum` of an all-nan slice returns 0.** In a revenue report, \"no data\" and \"totalled zero\" are very different claims, and this convention makes them identical."
    },

    { t: "code", lang: "python", title: "argmax on a flattened array, and arrays built from their own indices",
      code: `rng = np.random.default_rng(3)
m = rng.normal(size=(4, 6))
flat = m.argmax()                                   # a position in the flattened array
print(np.unravel_index(flat, m.shape))              # (row, col) -- the coordinates a summary needs
print(np.ravel_multi_index((2, 5), m.shape))        # 17: the inverse
print(m.argmax(axis=1))                             # (4,) -- with an axis, one position per slice

# an array from a function of its indices: the lambda receives index grids and runs once
tri = np.fromfunction(lambda i, j: i >= j, (4, 4))  # lower-triangular mask
print(tri.astype(int).sum())                        # 10`,
      caption: "`argmax` without an axis reports a flat position; `unravel_index` converts it to coordinates. `fromfunction` passes whole index grids, so the function must be vectorised — it is not called per cell."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A per-feature summariser that reports its own reliability",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Build a summary function for a feature matrix — the thing you run before touching an unfamiliar dataset. It must produce per-column statistics that are honest about missing data rather than quietly averaging around it." },
        { t: "p", text: "It also has to normalise the matrix per row and per column, and the shapes have to be right for both without a special case." }
      ],
      requirements: [
        "Per-column count, missing count, mean, std, min, max and the index of the max.",
        "Return nan for any statistic computed from fewer than a stated minimum of values.",
        "Row-wise and column-wise standardisation using the same code path.",
        "Use ddof consistently and say which you chose.",
        "Work on non-square input and be tested on it.",
        "Include tests."
      ],
      hint: "The row and column cases only share a code path if you keep the collapsed axis.",
      solution: {
        lang: "python",
        title: "summarise.py",
        code: `import numpy as np


# =========================================================================
# PER-COLUMN SUMMARY
# =========================================================================

def summarise(X, names=None, min_count=3, ddof=1):
    """Per-column statistics that refuse to lie about missing data.

    min_count  a statistic computed from fewer values than this is
               returned as nan rather than as a confident number
    ddof       1 = SAMPLE standard deviation (n-1 denominator).
               NumPy defaults to 0 (population); pandas defaults to 1.
               We take 1 because a feature matrix is a sample, and
               because it matches what .describe() will show, so the
               two never disagree in a review.
    """
    X = np.asarray(X, dtype=float)
    if X.ndim != 2:
        raise ValueError(f"expected 2-D, got {X.shape}")

    n_rows, n_cols = X.shape
    names = list(names) if names is not None else [f"f{i}" for i in range(n_cols)]
    if len(names) != n_cols:
        raise ValueError(f"{len(names)} names for {n_cols} columns")

    missing = np.isnan(X)
    count = (~missing).sum(axis=0)              # (n_cols,)
    enough = count >= min_count

    # errstate suppresses the "Mean of empty slice" warnings for columns
    # we are about to mark nan anyway. Suppressing them WITHOUT the
    # min_count guard would be hiding the problem instead of reporting it.
    with np.errstate(invalid="ignore", divide="ignore"):
        mean = np.nanmean(X, axis=0)
        std = np.nanstd(X, axis=0, ddof=ddof)
        lo = np.nanmin(np.where(missing, np.inf, X), axis=0)
        hi = np.nanmax(np.where(missing, -np.inf, X), axis=0)

    # nanmin/nanmax RAISE on an all-nan slice, which is why the
    # where() above substitutes infinities and we clean up after.
    lo = np.where(count > 0, lo, np.nan)
    hi = np.where(count > 0, hi, np.nan)

    # THE INDEX OF THE MAX, ignoring nan. argmax alone would return the
    # position of a nan, because nan compares False against everything.
    argmax = np.full(n_cols, -1, dtype=int)
    for j in range(n_cols):
        if count[j] > 0:
            argmax[j] = int(np.nanargmax(X[:, j]))

    # APPLY min_count LAST, uniformly. Every statistic that depends on
    # spread is unreliable on two points; a min and a max are not much
    # better, so all of them are gated the same way.
    def gate(v):
        return np.where(enough, v, np.nan)

    return {
        "n_rows": n_rows,
        "columns": {
            names[j]: {
                "count": int(count[j]),
                "missing": int(n_rows - count[j]),
                "pct_missing": round(100 * (n_rows - count[j]) / n_rows, 2),
                "mean": float(gate(mean)[j]),
                "std": float(gate(std)[j]),
                "min": float(gate(lo)[j]),
                "max": float(gate(hi)[j]),
                "argmax": int(argmax[j]) if enough[j] else -1,
                "reliable": bool(enough[j]),
            }
            for j in range(n_cols)
        },
    }


# =========================================================================
# STANDARDISATION -- ONE CODE PATH FOR BOTH AXES
# =========================================================================

def standardise(X, axis=0, ddof=1, eps=1e-12):
    """Centre and scale along the given axis. Works identically for rows and columns.

    keepdims=True is what makes this possible. Without it:
        axis=0 -> (n_cols,)  which broadcasts correctly by accident
        axis=1 -> (n_rows,)  which raises -- or worse, silently
                             broadcasts the wrong way on square input
    """
    X = np.asarray(X, dtype=float)

    mu = np.nanmean(X, axis=axis, keepdims=True)
    sd = np.nanstd(X, axis=axis, ddof=ddof, keepdims=True)

    # A CONSTANT COLUMN HAS ZERO SPREAD. Dividing gives inf or nan, so
    # scale by 1 instead: a constant feature centres to exactly zero,
    # which is the honest representation of "carries no information".
    sd = np.where(sd < eps, 1.0, sd)

    return (X - mu) / sd


# =========================================================================
# WHY keepdims IS LOAD-BEARING
# =========================================================================
#
# Demonstrated rather than asserted:

def _why_keepdims():
    X = np.arange(12, dtype=float).reshape(3, 4)      # NON-square

    ok = X - X.mean(axis=1, keepdims=True)            # (3,4) - (3,1)
    try:
        X - X.mean(axis=1)                            # (3,4) - (3,)
    except ValueError as e:
        broken = str(e)                               # raises, loudly

    # ON SQUARE INPUT THERE IS NO ERROR, AND THE ANSWER IS WRONG:
    Y = np.arange(16, dtype=float).reshape(4, 4)
    silent = Y - Y.mean(axis=1)                       # no exception
    correct = Y - Y.mean(axis=1, keepdims=True)
    return ok, broken, np.allclose(silent, correct)   # -> False


_why_keepdims()[2]          # False -- the square case is silently wrong


# =========================================================================
# TESTS -- deliberately non-square, with different prime lengths
# =========================================================================

def test_standardise_columns():
    X = np.arange(21, dtype=float).reshape(7, 3)
    Z = standardise(X, axis=0)

    assert np.allclose(Z.mean(axis=0), 0, atol=1e-12)
    assert np.allclose(Z.std(axis=0, ddof=1), 1)


def test_standardise_rows_same_code_path():
    X = np.arange(21, dtype=float).reshape(7, 3)
    Z = standardise(X, axis=1)

    assert np.allclose(Z.mean(axis=1), 0, atol=1e-12)
    assert Z.shape == X.shape


def test_square_input_would_have_hidden_an_axis_bug():
    """The reason test data must not be square."""
    Y = np.arange(16, dtype=float).reshape(4, 4)

    silent = Y - Y.mean(axis=1)                  # no error
    correct = Y - Y.mean(axis=1, keepdims=True)
    assert not np.allclose(silent, correct)

    X = np.arange(12, dtype=float).reshape(3, 4)
    try:
        X - X.mean(axis=1)
        assert False, "non-square should have raised"
    except ValueError:
        pass


def test_constant_column_does_not_produce_inf():
    X = np.array([[5.0, 1.0], [5.0, 2.0], [5.0, 3.0], [5.0, 4.0], [5.0, 5.0]])
    Z = standardise(X, axis=0)

    assert np.isfinite(Z).all()
    assert np.allclose(Z[:, 0], 0)


def test_min_count_gates_unreliable_statistics():
    X = np.array([[1.0, np.nan],
                  [2.0, np.nan],
                  [3.0, 7.0],
                  [4.0, np.nan],
                  [5.0, np.nan]])
    s = summarise(X, names=["good", "sparse"], min_count=3)

    assert s["columns"]["good"]["reliable"] is True
    assert s["columns"]["sparse"]["reliable"] is False
    assert np.isnan(s["columns"]["sparse"]["mean"])
    assert s["columns"]["sparse"]["count"] == 1


def test_all_nan_column_does_not_raise():
    X = np.array([[1.0, np.nan], [2.0, np.nan], [3.0, np.nan]])
    s = summarise(X, min_count=1)

    assert s["columns"]["f1"]["count"] == 0
    assert np.isnan(s["columns"]["f1"]["min"])
    assert s["columns"]["f1"]["argmax"] == -1


def test_argmax_ignores_nan():
    X = np.array([[1.0], [np.nan], [3.0], [2.0]])
    s = summarise(X, min_count=1)

    assert s["columns"]["f0"]["argmax"] == 2      # not 1

    assert np.asarray([1.0, np.nan, 3.0, 2.0]).argmax() == 1   # the trap


def test_ddof_choice_is_visible():
    X = np.arange(15, dtype=float).reshape(5, 3)
    sample = summarise(X, ddof=1)["columns"]["f0"]["std"]
    population = summarise(X, ddof=0)["columns"]["f0"]["std"]

    assert sample > population
    assert np.isclose(sample / population, np.sqrt(5 / 4))`,
        notes: [
          { t: "p", text: "**`keepdims=True` is what lets one function handle both axes.** Without it, `axis=0` broadcasts correctly by coincidence and `axis=1` raises — so the alternative is a special case for each direction and a comment explaining why they differ." },
          { t: "callout", kind: "trap", title: "The square-input test that passes wrongly", body: [
            { t: "p", text: "`Y - Y.mean(axis=1)` on a 4×4 array runs without complaint and subtracts row means *column-wise*. Every value is wrong, no exception is raised, and a test that only checks \"it produces output\" passes." },
            { t: "p", text: "**Give each test dimension a different length** — `(7, 3)` rather than `(4, 4)`. The non-square case raises immediately, which is why the test suite here uses primes." }
          ]},
          { t: "p", text: "**`ddof=1` is chosen so the numbers match `.describe()`.** NumPy defaults to 0 and pandas to 1, so a summariser using the NumPy default reports a different standard deviation than the frame it summarises — and the discrepancy always surfaces during a review, at the worst moment." },
          { t: "p", text: "**`min_count` puts a judgement where a reviewer can see it.** \"Four readings is not enough to call this a mean\" is a defensible position; the version where that threshold lives only in the analyst's head is not." },
          { t: "p", text: "**A constant column scales by 1 rather than by 0.** It centres to exactly zero, which is the honest representation of a feature carrying no information — `inf` would propagate into every downstream calculation instead." },
          { t: "p", text: "**`np.nanmin` raises on an all-nan slice**, unlike `np.nanmean` which warns and returns nan. Substituting infinities and cleaning up afterwards is the reliable way to handle a column that is entirely empty." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`X` has shape `(32, 64, 64, 3)`. What is the shape of `X.mean(axis=(1, 2))`?",
          options: ["(32, 3)", "(64, 64)", "(32, 64, 3)", "(3,)"],
          answer: 0,
          why: "Axes 1 and 2 are struck out, leaving `(32, 3)` — the mean colour of each image in the batch. Reading the shape and removing the named axes works identically at any number of dimensions, which is why it beats memorising \"rows and columns\"."
        }
      ]
    }
  ],

  takeaways: [
    "**`axis=n` names the axis that disappears** — reducing `(3, 4)` along axis 0 gives `(4,)`.",
    "**Read the shape and strike out the named axis.** The rule works identically in two dimensions and in four.",
    "**`axis=-1` is the portable way to say \"the last axis\"** when the number of dimensions varies.",
    "**`argmax` returns an index, not a value** — and `scores[:, best]` selects those columns for every row, which is not what you meant.",
    "**`keepdims=True` keeps the collapsed axis at length 1**, so the result still broadcasts against its source.",
    "**Use `keepdims` by default** when the result will be used against the array it came from; it costs nothing and removes a whole class of error.",
    "**On a square array the wrong axis broadcasts silently** — make test arrays non-square with different dimension lengths.",
    "**One nan makes the whole reduction nan**, which is correct behaviour: the answer genuinely depends on data you do not have.",
    "**`np.nansum` of an all-nan slice returns 0**, making \"no data\" indistinguishable from \"totalled zero\".",
    "**Carry the count alongside every aggregate**, and gate statistics computed from too few values.",
    "**`np.argmax` returns the index of a nan** if one is present — use `np.nanargmax` on data that might be missing.",
    "**`np.std` defaults to `ddof=0` and pandas to `ddof=1`**, so the same column yields two different numbers depending on which library computed it."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`X.shape` is `(3, 4)`. What does `X.sum(axis=0)` return?",
        options: [
          "A shape (3,) array — one value per row",
          "A shape (4,) array — axis 0 is collapsed, giving one value per column",
          "A scalar",
          "A shape (3, 1) array"
        ],
        answer: 1,
        why: "The argument names the axis being removed, so `(3, 4)` becomes `(4,)`. People call this \"summing the columns\" because of what the result contains, which is exactly the confusion that breaks down on a 4-D array — say \"collapse axis 0\" instead."
      },
      {
        stem: "`X - X.mean(axis=1)` raises on a (100, 20) array but works on a (4, 4) one. Why?",
        options: [
          "Square arrays are special-cased",
          "On a square array the (4,) result aligns with the columns just as well as the rows, so it broadcasts wrongly instead of raising",
          "The mean is undefined for non-square arrays",
          "It is a NumPy bug"
        ],
        answer: 1,
        why: "Broadcasting aligns from the right, so a `(n,)` result of collapsing axis 1 meets the column dimension. When the two dimensions happen to be equal it succeeds and subtracts row means column-wise — every value wrong, no exception. `keepdims=True` removes the ambiguity entirely."
      },
      {
        stem: "`np.nansum` on a slice that is entirely nan returns what?",
        options: [
          "nan",
          "0.0, which is indistinguishable from a group that genuinely totalled zero",
          "It raises",
          "The count of nan values"
        ],
        answer: 1,
        why: "nansum treats nan as zero, so an empty group and a zero-valued group produce the same output. In a revenue report those are very different claims — which is why an aggregate should always be reported next to the count it was computed from."
      },
      {
        stem: "`a = np.array([1.0, np.nan, 3.0])`. What is `a.argmax()`?",
        options: [
          "2",
          "1 — the index of the nan, because nan compares False against everything in the running-maximum test",
          "0",
          "nan"
        ],
        answer: 1,
        why: "nan is neither greater nor less than anything, so the scan's behaviour falls out of implementation detail rather than intent. `np.nanargmax` gives 2. The practical rule is never to call `argmax` on data that might contain missing values."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain what `axis=0` means without saying \"rows\" or \"columns\".",
        strong: "It names the axis that gets collapsed and therefore disappears from the shape. Reducing `(3, 4)` along axis 0 gives `(4,)`. The reason people say \"columns\" is that the *result* has one value per column — but that phrasing stops working the moment you have four dimensions.",
        answer: [
          { t: "p", text: "The shape-based rule is the answer that generalises, and interviewers ask this specifically because the row/column mnemonic breaks on image or time-series tensors." },
          { t: "p", text: "Following up with a 4-D example — `imgs.mean(axis=(1, 2))` giving mean colour per image — proves it rather than asserting it." }
        ]
      },
      {
        level: "advanced",
        q: "What does `keepdims=True` do and when is it load-bearing?",
        strong: "It keeps the collapsed axis at length 1 rather than removing it, so the reduction still broadcasts against the array it came from. It is load-bearing whenever you subtract or divide by a per-row statistic — without it, `axis=1` raises on rectangular data and silently computes the wrong thing on square data.",
        answer: [
          { t: "p", text: "Naming the square-array failure mode is what separates a memorised definition from understanding." },
          { t: "p", text: "Softmax is the cleanest example: both `keepdims` calls in it are required, and dropping either breaks the function in a different way." }
        ]
      },
      {
        level: "advanced",
        q: "A column's mean comes back as nan. Would you switch to `nanmean`?",
        strong: "Not automatically. The nan is telling me the answer depends on data I do not have, and `nanmean` replaces that with an assumption — that the missing values resemble the present ones. If the sensor drops out under load and load correlates with the reading, that assumption is precisely wrong, and I would rather report the mean with its count than a confidently biased number.",
        answer: [
          { t: "p", text: "Treating nan propagation as a feature rather than an obstacle is the judgement being tested here." },
          { t: "p", text: "Offering the practical middle ground — report the aggregate alongside its non-missing count, and gate on a minimum — shows you can ship something as well as reason about it." }
        ]
      }
    ]
  }
});

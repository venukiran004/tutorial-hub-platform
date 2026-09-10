/* ============================================================================
   LESSON 1.3 — Indexing, Views and Copies
   ========================================================================= */
EC.receiveLesson({
  id: "1.3",

  lede: "**Basic indexing gives you a view; fancy indexing gives you a copy.** The difference is invisible in the result and decisive in behaviour: one form of assignment reaches the original array, the other writes into a temporary that is discarded on the next line.",

  objectives: [
    "State which indexing forms return a view and which return a copy",
    "Predict whether an in-place write reaches the parent array",
    "Use boolean masks for selection and for conditional assignment",
    "Recognise the aliasing bug where an unexpected view corrupts data",
    "Choose between `np.where`, masks and `np.select` deliberately"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "Two families of indexing", id: "families" },

    { t: "p", text: "NumPy has two indexing mechanisms that look almost identical in source and behave completely differently. **The rule is whether the elements you asked for are evenly spaced** — if they can be described by a start, a stop and a step, NumPy hands you a view over the existing bytes. If not, it has to build a new array." },

    { t: "dl", items: [
      ["Basic indexing", "Integers and slices — `a[2]`, `a[1:5]`, `a[::2]`, `a[:, 0]`. Always returns a **view**, because the selection is a stride pattern."],
      ["Fancy indexing", "Also called advanced indexing: an array or list of indices, such as `a[[0, 3, 7]]`. Always returns a **copy**, because arbitrary positions are not a stride pattern."],
      ["Boolean masking", "`a[a > 5]` — a form of fancy indexing. Always returns a **copy**, and its length is not known until the mask is evaluated."],
      ["Aliasing", "Two array objects referring to the same memory. Writing through one changes what the other reads — intended for a view, a bug when unexpected."],
      ["In-place assignment", "`a[mask] = 0`. This is `__setitem__`, not indexing-then-assigning, so it writes to the original **even for fancy indexing**."]
    ]},

    { t: "viz",
      title: "Why one is a view and the other cannot be",
      caption: "A slice picks evenly spaced elements, which is exactly what strides express. Arbitrary indices have no such pattern, so NumPy must gather them into new memory.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="A strided slice shown as a regular pattern over a buffer, against arbitrary indices gathered into a new buffer">
  <text x="30" y="28" class="s-label" style="fill:var(--ink-2)">buffer  a = np.arange(10)</text>
  <g stroke-width="1.5">
    <rect x="30" y="40" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="86" y="40" width="56" height="30" style="fill:var(--acc);fill-opacity:.22;stroke:var(--acc)"/>
    <rect x="142" y="40" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="198" y="40" width="56" height="30" style="fill:var(--acc);fill-opacity:.22;stroke:var(--acc)"/>
    <rect x="254" y="40" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="310" y="40" width="56" height="30" style="fill:var(--acc);fill-opacity:.22;stroke:var(--acc)"/>
    <rect x="366" y="40" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="422" y="40" width="56" height="30" style="fill:var(--acc);fill-opacity:.22;stroke:var(--acc)"/>
    <rect x="478" y="40" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="534" y="40" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
  </g>
  <text x="600" y="60" class="s-sub" style="fill:var(--acc)">a[1::2] — start 1, stride 16 bytes</text>
  <text x="600" y="82" class="s-sub" style="fill:var(--good)">VIEW: no new memory</text>

  <text x="30" y="140" class="s-label" style="fill:var(--ink-2)">same buffer</text>
  <g stroke-width="1.5">
    <rect x="30" y="152" width="56" height="30" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn)"/>
    <rect x="86" y="152" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="142" y="152" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="198" y="152" width="56" height="30" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn)"/>
    <rect x="254" y="152" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="310" y="152" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="366" y="152" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="422" y="152" width="56" height="30" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn)"/>
    <rect x="478" y="152" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="534" y="152" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
  </g>
  <text x="600" y="172" class="s-sub" style="fill:var(--warn)">a[[0, 3, 7]] — no constant step</text>

  <g style="stroke:var(--warn);stroke-width:1.5">
    <line x1="58" y1="184" x2="60" y2="216" marker-end="url(#fi-w)"/>
    <line x1="226" y1="184" x2="116" y2="216" marker-end="url(#fi-w)"/>
    <line x1="450" y1="184" x2="172" y2="216" marker-end="url(#fi-w)"/>
  </g>
  <g stroke-width="1.5">
    <rect x="30" y="218" width="56" height="30" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn)"/>
    <rect x="86" y="218" width="56" height="30" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn)"/>
    <rect x="142" y="218" width="56" height="30" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn)"/>
  </g>
  <text x="220" y="238" class="s-sub" style="fill:var(--crit)">COPY: new memory, writes do not reach the parent</text>

  <defs><marker id="fi-w" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--warn)"/></marker></defs>
</svg>`
    },

    { t: "code", lang: "python", title: "the distinction, demonstrated", code: `
import numpy as np

a = np.arange(10)

# BASIC INDEXING -> VIEW
s = a[2:6]
s.base is a                       # True
s[0] = 999
a                                 # array([0, 1, 999, 3, ...]) -- reached

# FANCY INDEXING -> COPY
f = a[[2, 3, 4, 5]]
f.base is a                       # False -- f owns its data
f[0] = -1
a[2]                              # 999 -- unchanged. The write went nowhere.

# BOOLEAN MASKING -> COPY
m = a[a > 5]
np.shares_memory(a, m)            # False

# BUT ASSIGNMENT THROUGH A MASK REACHES THE ORIGINAL:
a[a > 5] = 0
a                                 # the zeros are in a
#
# This is not a contradiction. a[mask] = 0 calls __setitem__ on a,
# which writes directly. a[mask] alone calls __getitem__, which must
# build a new array because the selected positions are irregular.

# THE DISTINCTION THAT CATCHES PEOPLE:
a[a > 5] += 1        # works -- one __setitem__ call
b = a[a > 5]
b += 1               # works, but modifies the COPY. a is untouched.

# 2-D: A COLUMN IS A VIEW, A SET OF COLUMNS IS A COPY
X = np.arange(12).reshape(3, 4)

X[:, 1].base is not None          # True -- basic indexing, strided
X[:, [1, 2]].base is None         # True -- fancy, so it copied

X[:, 1] = 0                       # reaches X
col = X[:, 1]; col[:] = 7         # also reaches X -- it is a view

cols = X[:, [1, 2]]; cols[:] = 7  # does NOT reach X

# MIXING THE TWO FAMILIES gives a copy, because one part is fancy:
X[1:3, [0, 2]].base is None       # True

# THE HONEST CHECK -- never guess:
np.shares_memory(X, X[:, 1])      # True
np.shares_memory(X, X[:, [1]])    # False
`,
      hl: [6, 13, 24, 31],
      caption: "**`a[mask] = 0` writes to the original; `b = a[mask]; b += 1` does not.** The first is one `__setitem__` call on `a`; the second builds a copy and then modifies it."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**Ask: can the elements I selected be reached by a start, a stop and a step?** Slices can. A list of arbitrary positions cannot, and neither can a boolean mask whose true positions are scattered." },
      { t: "p", text: "If the answer is yes, NumPy hands you a second window onto the same bytes. If no, it gathers the elements into new memory — and everything you do to the result is happening somewhere else." },
      { t: "p", text: "**When it matters, do not reason about it — ask.** `np.shares_memory(a, b)` is authoritative and costs nothing." }
    ]},

    { t: "h2", n: "02", text: "Boolean masks", id: "masks" },

    { t: "p", text: "**A boolean mask is an array of `True`/`False` the same shape as the data**, used to select or to assign. It is the idiomatic way to express \"the rows where\" without a loop, and it composes — but the operators are not the Python ones." },

    { t: "dl", items: [
      ["Mask", "A boolean array whose shape matches the array being indexed. `a[mask]` returns the elements where the mask is `True`, flattened."],
      ["Element-wise logical operators", "`&` (and), `|` (or), `~` (not). Python's `and`, `or`, `not` call `__bool__` on the whole array and raise."],
      ["Operator precedence", "`&` and `|` bind **tighter** than comparison, so `a > 1 & a < 5` parses as `a > (1 & a) < 5`. Every condition needs its own parentheses."],
      ["`np.where`", "Vectorised ternary: `np.where(cond, x, y)` picks element-wise. With one argument it returns the indices where the condition holds."],
      ["`np.select`", "Multi-branch version of `where` — a list of conditions, a list of choices, and a default. First matching condition wins."]
    ]},

    { t: "code", lang: "python", title: "masks, and the two ways they go wrong", code: `
rng = np.random.default_rng(0)
age = rng.integers(18, 80, 10)
spend = rng.normal(500, 200, 10).round(2)

# BUILDING AND COMBINING MASKS:
adult = age >= 18
big = spend > 600
both = adult & big                # element-wise AND
either = adult | big
neither = ~(adult | big)

spend[both]                       # the values where both hold
both.sum()                        # how many -- True counts as 1
both.mean()                       # what fraction

# MISTAKE 1: Python's boolean operators
try:
    age > 30 and spend > 500
except ValueError as e:
    print(e)
# "The truth value of an array with more than one element is ambiguous"
#
# 'and' asks "is this array True?", which has no single answer. Use &.

# MISTAKE 2: PRECEDENCE. & binds tighter than >, so this is wrong:
# age > 30 & age < 60          -> parsed as age > (30 & age) < 60
(age > 30) & (age < 60)        # correct -- parenthesise every comparison

# np.where AS A VECTORISED IF/ELSE:
band = np.where(age < 30, "young", "older")
capped = np.where(spend > 800, 800, spend)     # same as np.minimum here

# np.where WITH ONE ARGUMENT gives POSITIONS, not values:
np.where(spend > 600)          # (array([1, 4, 7]),) -- a TUPLE
np.where(spend > 600)[0]       # array([1, 4, 7])
#
# The tuple has one entry per dimension, which is what makes it work
# unchanged on 2-D arrays.

# np.select FOR MORE THAN TWO BRANCHES:
band = np.select(
    [age < 25, age < 40, age < 65],
    ["18-24", "25-39", "40-64"],
    default="65+",
)
#
# FIRST MATCH WINS, so order matters and the conditions do not need to
# be mutually exclusive. Writing them as overlapping upper bounds like
# this is usually clearer than a chain of exact ranges.

# NESTED np.where IS THE ANTI-PATTERN np.select REPLACES:
# np.where(age < 25, "18-24",
#     np.where(age < 40, "25-39",
#         np.where(age < 65, "40-64", "65+")))     # unreadable at 4+

# MASKS ON 2-D DATA: a 1-D row mask selects whole rows.
X = rng.normal(size=(10, 3))
keep = X[:, 0] > 0
X[keep].shape                  # (k, 3) -- rows kept, all columns

# A 2-D MASK FLATTENS, which is almost never what you want on a table:
X[X > 0].shape                 # (k,) -- a 1-D array, structure gone
#
# To keep the shape and blank out the rest, assign instead of select:
Y = X.copy()
Y[Y < 0] = np.nan              # (10, 3) preserved

# COUNTING WITH nan PRESENT -- comparisons against nan are always False:
np.array([1.0, np.nan, 3.0]) > 2      # [False, False, True]
#
# So a mask silently EXCLUDES missing values from both branches of a
# where(). If nan means "unknown" rather than "no", handle it explicitly.
`,
      hl: [24, 29, 33, 66],
      caption: "**`&` binds tighter than `>`.** `age > 30 & age < 60` is a genuine parse error waiting to happen — parenthesise every comparison, without exception."
    },

    { t: "h2", n: "03", text: "The aliasing bug", id: "aliasing" },

    { t: "p", text: "Views are the point of NumPy's design, and they are also the source of its worst class of bug: **a function that modifies its argument in place changes data its caller still believes is untouched.**" },

    { t: "ladder",
      title: "A preprocessing function that clips outliers",
      rungs: [
        { level: "bad", label: "Modifies the caller's array", code: `def clip_outliers(X, lo, hi):
    X[X < lo] = lo
    X[X > hi] = hi
    return X

X_clean = clip_outliers(X_raw, -3, 3)
# X_raw is now clipped too -- and the "raw" data is gone`,
          note: "**`X_raw` and `X_clean` are the same object.** Any later comparison against the original data silently compares it against itself, and re-running the cell produces different results the second time." },
        { level: "ok", label: "Copies defensively", code: `def clip_outliers(X, lo, hi):
    X = X.copy()
    X[X < lo] = lo
    X[X > hi] = hi
    return X`,
          note: "**Correct, and it hides the cost.** On a 10 GB array this doubles peak memory with nothing in the signature to say so — fine at small scale, a surprise at large." },
        { level: "best", label: "Explicit about which it does", code: `def clip_outliers(X, lo, hi, *, inplace=False):
    """Clip X to [lo, hi].

    inplace=False (default) returns a new array and leaves X alone.
    inplace=True modifies X and returns it, for use when X is large
    and the caller genuinely owns it.
    """
    out = X if inplace else X.copy()
    np.clip(out, lo, hi, out=out)
    return out`,
          note: "**The caller chooses, and the default is safe.** `np.clip` with `out=` does both comparisons in one pass, and the docstring states the contract rather than leaving it to be discovered." }
      ]
    },

    { t: "callout", kind: "production", title: "In production", body: [
      { t: "p", text: "**A view keeps its parent's entire buffer alive.** Slicing 100 rows out of a 4 GB array and returning them holds all 4 GB in memory for as long as that slice exists — the garbage collector cannot free a buffer something still points into." },
      { t: "p", text: "This shows up as a long-running service whose memory climbs and never falls, with heap profiles that show small arrays and a large resident set." },
      { t: "p", text: "**When you slice a small piece out of something large and keep it, copy deliberately.** `big[:100].copy()` releases the parent as soon as `big` goes out of scope." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A row filter that does not corrupt its input",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Write a filtering utility used across a pipeline. It takes a feature matrix and a set of named conditions, returns the rows that pass, and reports what each condition removed." },
        { t: "p", text: "It must not modify its input under any circumstances, and it must not hold the original array alive after returning a small subset." }
      ],
      requirements: [
        "Accept named conditions as callables returning boolean masks.",
        "Return the filtered rows plus a per-condition report of how many rows each removed.",
        "Distinguish rows removed by a condition alone from rows removed by several.",
        "Guarantee the input is unmodified, and prove it with a test.",
        "Ensure the returned array does not keep the parent buffer alive.",
        "Handle nan correctly and say what you chose.",
        "Include tests."
      ],
      hint: "Rows removed per condition and rows uniquely removed by that condition are different numbers, and the difference is the interesting part of the report.",
      solution: {
        lang: "python",
        title: "row_filter.py",
        code: `import numpy as np


def filter_rows(X, conditions, *, release=True, nan_policy="drop"):
    """Keep rows passing every condition; report what each removed.

    X           (n, d) array. NEVER modified.
    conditions  {name: callable(X) -> (n,) boolean mask of rows to KEEP}
    release     copy the result so the parent buffer can be freed
    nan_policy  "drop"  -- a row with any nan fails (safe default)
                "keep"  -- nan rows are judged only by the conditions
                "raise" -- refuse to guess

    Returns (X_kept, report).
    """
    X = np.asarray(X)
    if X.ndim != 2:
        raise ValueError(f"expected 2-D, got shape {X.shape}")

    n = X.shape[0]
    masks = {}

    # NAN IS HANDLED FIRST AND EXPLICITLY, because a comparison against
    # nan is always False -- so a nan row would fail a "> 0" test AND a
    # "<= 0" test. That is not a filter decision, it is missing data,
    # and silently dropping it under the wrong label hides a problem.
    has_nan = np.isnan(X).any(axis=1)
    if has_nan.any():
        if nan_policy == "raise":
            raise ValueError(f"{has_nan.sum()} rows contain nan")
        if nan_policy == "drop":
            masks["_nan"] = ~has_nan

    for name, fn in conditions.items():
        m = np.asarray(fn(X))
        if m.dtype != bool:
            raise TypeError(f"condition {name!r} returned {m.dtype}, not bool")
        if m.shape != (n,):
            raise ValueError(
                f"condition {name!r} returned shape {m.shape}, expected ({n},)"
            )
        masks[name] = m

    if masks:
        keep = np.logical_and.reduce(list(masks.values()))
    else:
        keep = np.ones(n, dtype=bool)

    # THE REPORT. Two different numbers, and the gap is the point:
    #   removed  -- rows this condition rejects, regardless of others
    #   only     -- rows ONLY this condition rejects
    # If removed is large and only is zero, the condition is redundant.
    report = {"n_in": n, "n_out": int(keep.sum()), "conditions": {}}
    for name, m in masks.items():
        others = [v for k, v in masks.items() if k != name]
        passes_others = (
            np.logical_and.reduce(others) if others else np.ones(n, dtype=bool)
        )
        report["conditions"][name] = {
            "removed": int((~m).sum()),
            "only": int((~m & passes_others).sum()),
            "pct_removed": round(100 * (~m).sum() / n, 2) if n else 0.0,
        }

    out = X[keep]

    # X[keep] is FANCY INDEXING and already a copy, so the input is
    # safe. But NumPy may return something whose .base points at a
    # temporary; .copy() when release=True makes the ownership certain
    # and lets a large parent be collected.
    if release and out.base is not None:
        out = out.copy()

    return out, report


# =========================================================================
# WHY THE INPUT IS SAFE
# =========================================================================
#
# 1. X[keep] uses a boolean mask -- fancy indexing -- which ALWAYS
#    copies. Nothing here writes through a view.
# 2. Nothing in this function uses __setitem__ on X at all.
# 3. np.asarray does not copy if X is already an array, which is what
#    we want: we are not modifying it, so a defensive copy on entry
#    would double memory for no benefit.
#
# The dangerous version of this function is the one that "cleans as it
# filters" -- X[bad] = 0 before selecting. That writes to the caller's
# array, and the caller has no way to know.


# =========================================================================
# USING IT
# =========================================================================

rng = np.random.default_rng(0)
X = rng.normal(size=(1000, 4))
X[rng.integers(0, 1000, 30), 2] = np.nan          # inject missing
X[:20, 0] = 50                                     # inject outliers

kept, rep = filter_rows(X, {
    "no_extreme_f0":  lambda X: np.abs(X[:, 0]) < 10,
    "f1_positive":    lambda X: X[:, 1] > 0,
    "f3_in_range":    lambda X: (X[:, 3] > -4) & (X[:, 3] < 4),
})

rep["n_in"], rep["n_out"]                # (1000, ~470)
rep["conditions"]["no_extreme_f0"]       # removed 20, only ~10
rep["conditions"]["f3_in_range"]         # removed ~1, only ~1
#
# READ THE GAP: no_extreme_f0 rejects 20 rows but is the sole reason
# for only about 10 of them -- the other half would have been dropped
# by f1_positive anyway. A condition whose "only" count is zero can be
# removed without changing the output at all.


# =========================================================================
# THE NAN DECISION
# =========================================================================
#
# nan_policy="drop" is the default because it is the honest one:
#
#   np.nan > 0      -> False
#   np.nan <= 0     -> False
#
# A nan row fails EVERY comparison, so without special handling it
# gets dropped and blamed on whichever condition happens to be listed.
# The report would then claim "f1_positive removed 30 rows" when the
# real cause was missing data.
#
# Reporting it under "_nan" makes the true cause visible, which is the
# entire reason to separate it.


# =========================================================================
# TESTS
# =========================================================================

def test_input_is_never_modified():
    X = np.arange(20, dtype=float).reshape(5, 4)
    before = X.copy()

    filter_rows(X, {"pos": lambda X: X[:, 0] > 4})

    assert np.array_equal(X, before)


def test_result_does_not_alias_the_input():
    X = np.arange(20, dtype=float).reshape(5, 4)
    kept, _ = filter_rows(X, {"pos": lambda X: X[:, 0] > 4})

    kept[0, 0] = -999
    assert X[1, 0] == 4
    assert not np.shares_memory(kept, X)


def test_parent_buffer_is_released():
    big = np.zeros((100_000, 4))
    kept, _ = filter_rows(big, {"few": lambda X: np.arange(len(X)) < 10})

    assert kept.base is None            # owns its data
    assert kept.shape == (10, 4)


def test_removed_and_only_differ_when_conditions_overlap():
    X = np.array([[1.0], [2.0], [3.0], [4.0]])
    _, rep = filter_rows(X, {
        "gt2": lambda X: X[:, 0] > 2,
        "gt1": lambda X: X[:, 0] > 1,
    })

    assert rep["conditions"]["gt2"]["removed"] == 2
    assert rep["conditions"]["gt2"]["only"] == 1     # row 2.0
    assert rep["conditions"]["gt1"]["only"] == 0     # fully redundant


def test_nan_rows_are_attributed_to_nan_not_a_condition():
    X = np.array([[1.0], [np.nan], [3.0]])
    _, rep = filter_rows(X, {"pos": lambda X: X[:, 0] > 0})

    assert rep["conditions"]["_nan"]["removed"] == 1
    assert rep["conditions"]["pos"]["removed"] == 1     # nan fails it too
    assert rep["conditions"]["pos"]["only"] == 0        # but not uniquely


def test_nan_policy_raise():
    X = np.array([[1.0], [np.nan]])
    try:
        filter_rows(X, {}, nan_policy="raise")
        assert False, "should have raised"
    except ValueError as e:
        assert "nan" in str(e)


def test_bad_condition_shape_is_rejected():
    X = np.zeros((5, 2))
    try:
        filter_rows(X, {"bad": lambda X: np.ones(3, dtype=bool)})
        assert False, "should have raised"
    except ValueError as e:
        assert "shape" in str(e)


def test_non_boolean_condition_is_rejected():
    X = np.zeros((5, 2))
    try:
        filter_rows(X, {"bad": lambda X: np.ones(5)})
        assert False, "should have raised"
    except TypeError:
        pass


def test_no_conditions_keeps_everything():
    X = np.arange(12, dtype=float).reshape(4, 3)
    kept, rep = filter_rows(X, {})

    assert kept.shape == (4, 3)
    assert rep["n_out"] == 4`,
        notes: [
          { t: "p", text: "**`X[keep]` is boolean masking, so it already copies** — the input was never at risk. The dangerous version of this function is the one that \"cleans as it filters\" with `X[bad] = 0` before selecting, because that writes through to the caller's array with nothing in the signature to warn them." },
          { t: "callout", kind: "insight", title: "\"removed\" and \"only\" are different numbers", body: [
            { t: "p", text: "A condition can reject 20 rows while being the *sole* reason for just 10 — the rest would have failed another test anyway. **A condition whose `only` count is zero can be deleted without changing a single output row.**" },
            { t: "p", text: "Filter reports that show just one number per rule routinely lead teams to defend a condition that does nothing, or to miss which single rule is discarding most of their data." }
          ]},
          { t: "p", text: "**nan is separated out because a nan row fails every comparison.** `np.nan > 0` and `np.nan <= 0` are both `False`, so without special handling missing data gets dropped and blamed on whichever condition happens to be listed first — the report would say \"f1_positive removed 30 rows\" when the real cause was an empty column." },
          { t: "p", text: "**No defensive copy on entry.** `np.asarray` does not copy an existing array, and since nothing here writes to `X`, copying it would double peak memory for no benefit at all." },
          { t: "p", text: "**`release=True` matters for the opposite reason.** Ten rows sliced out of a 4 GB array can keep all 4 GB alive if the result still points into the parent buffer — the explicit `.copy()` is what lets the original be collected." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's model retraining produced different results every time it ran, on identical input, with a fixed seed. Reruns in the same session got progressively worse." },
      { t: "p", text: "**A normalisation helper wrote through a view.** It received `X_train`, computed statistics, and applied them with `X[:] = (X - mu) / sd`. Because `X_train` was a slice of the full matrix, the normalisation landed in the parent — so the second run normalised already-normalised data." },
      { t: "p", text: "**The fixed seed made it worse, not better.** Identical splits meant the corruption compounded in exactly the same place each run, which looked like a convergence problem rather than a data problem." },
      { t: "p", text: "**The check is one line**: `assert not np.shares_memory(X_train, X_full)` after splitting, or a `.copy()` at the split. Either turns an invisible corruption into an immediate, locatable failure." }
    ]}
  ],

  takeaways: [
    "**Basic indexing — integers and slices — returns a view.** The selection is a stride pattern, so no memory is needed.",
    "**Fancy indexing and boolean masking return a copy.** Arbitrary positions cannot be expressed as strides.",
    "**But `a[mask] = 0` writes to the original**, because that is `__setitem__` on `a`, not indexing followed by assignment.",
    "**`b = a[mask]; b += 1` modifies the copy** and leaves `a` untouched — the difference from the line above is invisible at a glance.",
    "**Mixing basic and fancy indexing gives a copy**, because one part of the selection is irregular.",
    "**Use `&`, `|` and `~`, never `and`, `or`, `not`** — the Python operators call `__bool__` on the whole array and raise.",
    "**`&` binds tighter than comparison**, so every condition needs its own parentheses.",
    "**`np.where(cond)` with one argument returns positions as a tuple**, one entry per dimension — not values.",
    "**`np.select` replaces nested `np.where`** once there are more than two branches; first matching condition wins.",
    "**Comparisons against nan are always False**, so a mask silently excludes missing values from both branches.",
    "**A view keeps its parent's whole buffer alive** — slice a small piece out of something large and copy it deliberately.",
    "**When it matters, ask rather than reason**: `np.shares_memory(a, b)` is authoritative and free."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`b = a[a > 5]; b[0] = 0`. What happened to `a`?",
        options: [
          "Its first element above 5 became 0",
          "Nothing — boolean masking returned a copy, so the write went into a separate array",
          "It raised an error",
          "It depends on the dtype"
        ],
        answer: 1,
        why: "Boolean masking is fancy indexing and always copies. Note that `a[a > 5] = 0` on one line *does* reach `a` — that form is `__setitem__` on `a` rather than indexing followed by assignment, and the visual similarity is what makes this bug survive review."
      },
      {
        stem: "Why does `age > 30 & age < 60` give a wrong or confusing result?",
        options: [
          "`&` is not a valid NumPy operator",
          "`&` binds tighter than `>`, so it parses as `age > (30 & age) < 60`",
          "NumPy requires np.logical_and",
          "The comparison order is reversed"
        ],
        answer: 1,
        why: "Bitwise operators have higher precedence than comparison in Python, so the grouping is not what it reads as. Every comparison in a compound mask needs its own parentheses: `(age > 30) & (age < 60)`."
      },
      {
        stem: "You slice 100 rows out of a 4 GB array, return them from a function, and memory never drops. Why?",
        options: [
          "NumPy caches arrays",
          "The slice is a view, and a view keeps its parent's entire buffer alive",
          "The garbage collector runs infrequently",
          "The rows were copied twice"
        ],
        answer: 1,
        why: "A view holds a reference into the parent's memory, so nothing can be freed while it exists. This is exactly the profile of a long-running service whose resident set climbs while the heap shows only small arrays — `.copy()` on the small result releases the parent."
      },
      {
        stem: "A preprocessing function does `X[X < lo] = lo` and returns `X`. What is the risk?",
        options: [
          "It is slower than np.clip",
          "It modifies the caller's array in place, so the 'raw' data the caller still holds has silently changed",
          "It cannot handle 2-D arrays",
          "The comparison fails on integers"
        ],
        answer: 1,
        why: "`X_clean` and `X_raw` end up as the same object, so later comparisons against the original compare it against itself, and re-running compounds the effect. Copy by default and make in-place an explicit opt-in, so the caller chooses and the safe path is the one you get for free."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When does NumPy indexing return a view and when does it copy?",
        strong: "Basic indexing — integers and slices — returns a view, because the selection is a stride pattern over existing memory. Fancy indexing and boolean masks copy, because arbitrary positions cannot be described by a stride. Mixing the two copies. `np.shares_memory` settles any specific case.",
        answer: [
          { t: "p", text: "Giving the underlying reason — whether the selection is expressible as strides — rather than a memorised list means you can work out unfamiliar cases." },
          { t: "p", text: "The subtlety worth adding is that `a[mask] = 0` still reaches the original, because assignment is `__setitem__` rather than indexing." }
        ]
      },
      {
        level: "advanced",
        q: "A service's memory climbs steadily but heap profiles show only small arrays. What would you check?",
        strong: "Whether small arrays being retained are views into much larger parents. A 100-row slice of a 4 GB array holds all 4 GB alive, because the buffer cannot be freed while anything points into it. Copying at the point you keep the subset fixes it.",
        answer: [
          { t: "p", text: "This is a real production pattern and few candidates connect view semantics to a memory leak profile." },
          { t: "p", text: "Mentioning `.base` as the way to confirm it in a debugger makes the answer actionable rather than theoretical." }
        ]
      },
      {
        level: "advanced",
        q: "How would you design a preprocessing function's contract around mutation?",
        strong: "Default to returning a new array and leaving the input alone, with `inplace=True` as an explicit opt-in for callers who own large data and want the memory back. State it in the docstring, and use `out=` on the ufunc so the in-place path genuinely avoids the temporary.",
        answer: [
          { t: "p", text: "Naming the default as the safe one, rather than the fast one, is the judgement being tested." },
          { t: "p", text: "Acknowledging that a defensive copy hides a real cost at 10 GB scale shows you have thought past the general rule." }
        ]
      }
    ]
  }
});

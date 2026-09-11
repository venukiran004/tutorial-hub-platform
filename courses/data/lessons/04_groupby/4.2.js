/* ============================================================================
   LESSON 4.2 — agg, transform, filter and apply
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "**Four verbs, four output shapes.** `agg` returns one row per group, `transform` returns one row per input aligned to the original index, `filter` returns the original rows from groups that pass a test, and `apply` returns whatever your function returns — which is why it is the slowest and the most reached-for.",

  objectives: [
    "Choose the verb from the output shape you need",
    "Write named aggregations that produce flat, readable columns",
    "Use `transform` to broadcast a group statistic back to every row",
    "Use `filter` to keep or drop whole groups",
    "Recognise when `apply` is necessary and when it is a 100× slowdown"
  ],

  prerequisites: ["4.1"],

  blocks: [

    { t: "h2", n: "01", text: "The shape decides the verb", id: "shape" },

    { t: "p", text: "Before choosing between `agg`, `transform`, `filter` and `apply`, answer one question: **what shape should the result be?** Each verb has a fixed answer, and picking the wrong one produces either an alignment error or a correct result computed very slowly." },

    { t: "dl", items: [
      ["`agg` / `aggregate`", "One row per **group**. Reduces each group to one value per column. `sum`, `mean`, `count` and every reduction go through it."],
      ["`transform`", "One row per **input row**, aligned to the original index. The group statistic is broadcast back to every member — which is what makes \"deviation from group mean\" a one-liner."],
      ["`filter`", "The original rows, from **only the groups** whose test returned `True`. Row count shrinks; rows are untouched."],
      ["`apply`", "**Whatever the function returns.** A scalar gives one row per group; a Series gives a frame; a frame gives a concatenation. General, and slow because pandas cannot plan the output."],
      ["Named aggregation", "`agg(total=(\"amount\", \"sum\"))` — the syntax that produces flat, named columns instead of a MultiIndex."],
      ["Cython path", "Built-in aggregations (`\"sum\"`, `\"mean\"`, etc. as strings) run in compiled code. A Python callable does not, and is 10–100× slower."]
    ]},

    { t: "viz",
      title: "Four verbs on the same six rows",
      caption: "agg collapses each group to one row. transform keeps every row and fills in the group value. filter keeps whole groups or drops them. apply is whatever comes back.",
      svg: `<svg viewBox="0 0 880 320" role="img" aria-label="Six input rows in two groups shown flowing through agg, transform and filter with the resulting row counts">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">input — 6 rows, 2 groups</text>
  <g stroke-width="1.5">
    <rect x="30" y="38" width="90" height="22" style="fill:var(--acc);fill-opacity:.18;stroke:var(--acc)"/>
    <rect x="30" y="60" width="90" height="22" style="fill:var(--acc);fill-opacity:.18;stroke:var(--acc)"/>
    <rect x="30" y="82" width="90" height="22" style="fill:var(--acc);fill-opacity:.18;stroke:var(--acc)"/>
    <rect x="30" y="104" width="90" height="22" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
    <rect x="30" y="126" width="90" height="22" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
    <rect x="30" y="148" width="90" height="22" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
  </g>
  <text x="42" y="54" class="s-sub" style="fill:var(--ink-2)">n  10</text><text x="42" y="76" class="s-sub" style="fill:var(--ink-2)">n  12</text><text x="42" y="98" class="s-sub" style="fill:var(--ink-2)">n  11</text>
  <text x="42" y="120" class="s-sub" style="fill:var(--ink-2)">s  20</text><text x="42" y="142" class="s-sub" style="fill:var(--ink-2)">s  18</text><text x="42" y="164" class="s-sub" style="fill:var(--ink-2)">s  22</text>

  <text x="230" y="26" class="s-label" style="fill:var(--ink-2)">agg("sum") — 2 rows</text>
  <g stroke-width="1.5">
    <rect x="230" y="38" width="90" height="22" style="fill:var(--acc);fill-opacity:.28;stroke:var(--acc)"/>
    <rect x="230" y="60" width="90" height="22" style="fill:var(--good);fill-opacity:.28;stroke:var(--good)"/>
  </g>
  <text x="242" y="54" class="s-sub" style="fill:var(--ink-2)">n  33</text><text x="242" y="76" class="s-sub" style="fill:var(--ink-2)">s  60</text>
  <text x="230" y="104" class="s-sub" style="fill:var(--ink-3)">one row per group,</text>
  <text x="230" y="122" class="s-sub" style="fill:var(--ink-3)">key becomes the index</text>

  <text x="430" y="26" class="s-label" style="fill:var(--ink-2)">transform("sum") — 6 rows</text>
  <g stroke-width="1.5">
    <rect x="430" y="38" width="90" height="22" style="fill:var(--acc);fill-opacity:.18;stroke:var(--acc)"/>
    <rect x="430" y="60" width="90" height="22" style="fill:var(--acc);fill-opacity:.18;stroke:var(--acc)"/>
    <rect x="430" y="82" width="90" height="22" style="fill:var(--acc);fill-opacity:.18;stroke:var(--acc)"/>
    <rect x="430" y="104" width="90" height="22" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
    <rect x="430" y="126" width="90" height="22" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
    <rect x="430" y="148" width="90" height="22" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
  </g>
  <text x="442" y="54" class="s-sub" style="fill:var(--ink-2)">33</text><text x="442" y="76" class="s-sub" style="fill:var(--ink-2)">33</text><text x="442" y="98" class="s-sub" style="fill:var(--ink-2)">33</text>
  <text x="442" y="120" class="s-sub" style="fill:var(--ink-2)">60</text><text x="442" y="142" class="s-sub" style="fill:var(--ink-2)">60</text><text x="442" y="164" class="s-sub" style="fill:var(--ink-2)">60</text>
  <text x="430" y="196" class="s-sub" style="fill:var(--ink-3)">same index as input,</text>
  <text x="430" y="214" class="s-sub" style="fill:var(--ink-3)">assignable as a column</text>

  <text x="640" y="26" class="s-label" style="fill:var(--ink-2)">filter(sum &gt; 50) — 3 rows</text>
  <g stroke-width="1.5">
    <rect x="640" y="38" width="90" height="22" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
    <rect x="640" y="60" width="90" height="22" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
    <rect x="640" y="82" width="90" height="22" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
  </g>
  <text x="652" y="54" class="s-sub" style="fill:var(--ink-2)">s  20</text><text x="652" y="76" class="s-sub" style="fill:var(--ink-2)">s  18</text><text x="652" y="98" class="s-sub" style="fill:var(--ink-2)">s  22</text>
  <text x="640" y="130" class="s-sub" style="fill:var(--ink-3)">group n dropped whole;</text>
  <text x="640" y="148" class="s-sub" style="fill:var(--ink-3)">surviving rows unchanged</text>

  <line x1="30" y1="250" x2="850" y2="250" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="276" class="s-sub" style="fill:var(--ink-3)">apply(f) returns whatever f returns — a scalar per group behaves like agg, a same-length Series like transform, anything else is concatenated.</text>
  <text x="30" y="298" class="s-sub" style="fill:var(--ink-3)">pandas cannot plan the output, so every group runs a Python call. That flexibility is what makes it slow.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "agg: reductions, and the named form that gives flat columns", code: `
import pandas as pd
import numpy as np

sales = pd.DataFrame({
    "region": ["n", "s", "n", "s", "n", "s"],
    "rep": ["ann", "bob", "ann", "cat", "dan", "bob"],
    "amount": [10.0, 20.0, 12.0, 18.0, 11.0, 22.0],
    "units": [1, 2, 1, 2, 1, 3],
})
g = sales.groupby("region")

# ONE FUNCTION, EVERY COLUMN:
g.agg("sum")                              # same as g.sum()

# SEVERAL FUNCTIONS, EVERY COLUMN -> COLUMN MultiIndex:
g[["amount", "units"]].agg(["sum", "mean"])
#         amount        units
#            sum   mean   sum  mean
# region
# n         33.0  11.0     3   1.0
# s         60.0  20.0     7   2.33
#
# Two header rows. Awkward to select from, and to_csv writes both.

# DIFFERENT FUNCTIONS PER COLUMN -> still a MultiIndex if any has >1:
g.agg({"amount": ["sum", "mean"], "units": "max"})

# NAMED AGGREGATION -> FLAT, NAMED COLUMNS. This is the form to use.
g.agg(
    revenue=("amount", "sum"),
    avg_ticket=("amount", "mean"),
    units=("units", "sum"),
    reps=("rep", "nunique"),
    top_rep=("rep", lambda s: s.value_counts().index[0]),
)
#         revenue  avg_ticket  units  reps top_rep
# region
# n          33.0        11.0      3     2     ann
# s          60.0        20.0      7     2     bob
#
# Each keyword is (column, function). Output columns are named by the
# keyword. No MultiIndex, no renaming afterwards.

# STRINGS ARE FASTER THAN CALLABLES -- much faster:
big = pd.DataFrame({
    "k": np.random.default_rng(0).integers(0, 10_000, 2_000_000),
    "v": np.random.default_rng(1).normal(size=2_000_000),
})
# %timeit big.groupby("k")["v"].agg("mean")        -> ~40 ms   Cython
# %timeit big.groupby("k")["v"].agg(np.mean)       -> ~40 ms   recognised
# %timeit big.groupby("k")["v"].agg(lambda s: s.mean())  -> ~2.5 s  Python
#
# The string form (and the bare NumPy function, which pandas
# recognises) dispatches to compiled code. A lambda -- even one that
# just calls .mean() -- runs Python once per group. 10,000 groups,
# 10,000 calls.

# THE BUILT-IN NAMES WORTH KNOWING:
#   sum mean median min max std var count size nunique first last
#   prod sem skew quantile any all idxmin idxmax
#
# count EXCLUDES NaN; size INCLUDES it. first/last SKIP NaN. All
# three distinctions produce different numbers on real data.

# quantile TAKES AN ARGUMENT, which needs the callable form or a lambda:
g["amount"].quantile(0.9)                 # direct method, fast
g.agg(p90=("amount", lambda s: s.quantile(0.9)))   # inside agg, slower

# MULTIPLE OUTPUTS FROM ONE PASS -- describe():
g["amount"].describe()                    # count mean std min 25% 50% 75% max

# AGGREGATING TO A DIFFERENT DTYPE -- watch the result:
g["units"].agg("mean").dtype              # float64 -- ints become floats
g["rep"].agg("first").dtype               # object
`,
      hl: [27, 44, 49, 61],
      caption: "**`agg(lambda s: s.mean())` is 60× slower than `agg(\"mean\")`.** The string dispatches to compiled code; the lambda runs Python once per group, even when all it does is call the same method."
    },

    { t: "h2", n: "02", text: "transform: the group value on every row", id: "transform" },

    { t: "p", text: "**`transform` computes a group statistic and hands it back with the original index**, so the result drops straight in as a new column. Every \"compared to its group\" feature — deviation from the group mean, share of the group total, rank within group — is a transform." },

    { t: "code", lang: "python", title: "transform, and the features it makes trivial", code: `
# THE PATTERN: a group statistic, assigned to every row of the group.
sales["region_total"] = sales.groupby("region")["amount"].transform("sum")
sales["share"] = sales["amount"] / sales["region_total"]
sales["vs_region_mean"] = (sales["amount"]
                           - sales.groupby("region")["amount"].transform("mean"))
sales
#   region  rep  amount  units  region_total  share  vs_region_mean
# 0      n  ann    10.0      1          33.0  0.303           -1.0
# 1      s  bob    20.0      2          60.0  0.333            0.0
# ...
#
# Same 6 rows. The group value is repeated on each member. No merge,
# no reset_index, no alignment risk -- transform returns the source
# index exactly.

# WITHOUT transform, the same thing is a merge:
totals = sales.groupby("region")["amount"].sum().rename("region_total")
sales.merge(totals, left_on="region", right_index=True)
#
# Works, but it is three operations, it can change row order, and a
# duplicated key in totals (impossible here, possible elsewhere)
# would multiply rows. transform cannot do either.

# STANDARDISING WITHIN GROUP -- the z-score by cohort:
grp = sales.groupby("region")["amount"]
sales["z"] = (sales["amount"] - grp.transform("mean")) / grp.transform("std")

# FILLING MISSING WITH THE GROUP VALUE (see 3.4):
sales.loc[2, "amount"] = np.nan
sales["amount"].fillna(sales.groupby("region")["amount"].transform("median"))

# RANK WITHIN GROUP -- rank is already a transform-shaped method:
sales.groupby("region")["amount"].rank(ascending=False)

# CUMULATIVE WITHIN GROUP -- also transform-shaped:
sales.groupby("region")["amount"].cumsum()
sales.groupby("region").cumcount()

# transform WITH A CALLABLE -- must return same length as the group:
sales.groupby("region")["amount"].transform(lambda s: s - s.min())
#
# The callable receives each group as a Series and must return a
# Series of the same length (or a scalar, which is broadcast). It runs
# Python per group, so the same speed caveat as agg applies.

# THE SHAPE RULE THAT CATCHES PEOPLE:
try:
    sales.groupby("region")["amount"].transform(lambda s: s.head(1))
except ValueError as e:
    print("transform must return same length")     # or a scalar
#
# transform is not "apply that returns a Series". It is specifically
# "one value per input row".

# transform ON MULTIPLE COLUMNS:
sales.groupby("region")[["amount", "units"]].transform("sum")
# a DataFrame with the same index, both columns broadcast

# A WORKED FEATURE: share of the rep's total that this sale represents,
# and how the rep compares to their region.
rep_total = sales.groupby("rep")["amount"].transform("sum")
region_mean_per_rep = (sales.groupby(["region", "rep"])["amount"]
                            .transform("sum"))
sales["rep_share_of_sale"] = sales["amount"] / rep_total
#
# Multi-key transforms work the same way: the statistic is computed
# per (region, rep) and broadcast to those rows.
`,
      hl: [2, 15, 40, 54],
      caption: "**`transform` returns the source index exactly, so the result assigns straight in as a column.** The merge alternative is three operations, can reorder rows, and can multiply them on a duplicated key."
    },

    { t: "h2", n: "03", text: "filter and apply", id: "filter_apply" },

    { t: "code", lang: "python", title: "keeping whole groups, and the general escape hatch", code: `
# filter: KEEP THE ROWS OF GROUPS THAT PASS. The rows are unchanged.
sales.groupby("region").filter(lambda g: g["amount"].sum() > 50)
# only region s's rows -- all three, exactly as they were

sales.groupby("rep").filter(lambda g: len(g) >= 2)     # reps with 2+ sales
#
# THE TEST RECEIVES THE WHOLE GROUP FRAME and returns one boolean.
# This is different from a row mask: it cannot keep some of a group.

# THE FAST EQUIVALENT uses transform + a mask:
sales[sales.groupby("region")["amount"].transform("sum") > 50]
#
# Same result. transform("sum") is Cython; filter's lambda is Python
# per group. On 10,000 groups the difference is real. filter reads
# better; transform scales better.

# apply: THE GENERAL FORM. The function gets each group as a frame and
# returns anything.
def summary(g):
    return pd.Series({
        "n": len(g),
        "top_rep": g.loc[g["amount"].idxmax(), "rep"],
        "range": g["amount"].max() - g["amount"].min(),
    })

sales.groupby("region").apply(summary)
#         n top_rep  range
# region
# n       3     ann    2.0
# s       3     bob    4.0
#
# A Series per group -> a frame with one row per group. This is the
# legitimate use: several outputs that need the whole group at once
# and do not decompose into named aggregations.

# BUT MOST apply CALLS ARE A SLOW agg OR transform:
sales.groupby("region").apply(lambda g: g["amount"].sum())    # SLOW agg
sales.groupby("region")["amount"].sum()                       # fast

sales.groupby("region").apply(lambda g: g["amount"] - g["amount"].mean())
sales["amount"] - sales.groupby("region")["amount"].transform("mean")   # fast
#
# %timeit big.groupby("k").apply(lambda g: g["v"].sum())   -> ~4 s
# %timeit big.groupby("k")["v"].sum()                       -> ~40 ms
#
# 100x. apply cannot know what shape is coming back, so it runs the
# function, inspects the result, and infers how to combine -- for
# every group.

# apply's RESULT SHAPE DEPENDS ON WHAT COMES BACK, which is fragile:
sales.groupby("region").apply(lambda g: g["amount"].sum())     # Series
sales.groupby("region").apply(lambda g: g[["amount"]].sum())   # DataFrame
sales.groupby("region").apply(lambda g: g.head(1))             # frame with
                                                               # a MultiIndex
#
# Three near-identical calls, three different output structures.
# Code downstream of an apply has to know which one it got.

# include_groups=False -- the modern default direction:
sales.groupby("region").apply(summary, include_groups=False)
#
# Older pandas passed the grouping column INTO the function as part of
# the frame; newer pandas warns and will exclude it. Passing it
# explicitly removes the warning and the version dependency.

# THE DECISION:
#   one value per group, standard reduction   -> agg with a string
#   one value per group, custom               -> agg with a callable
#   one value per row, group statistic        -> transform
#   keep or drop whole groups                 -> filter (or transform + mask)
#   several outputs needing the whole frame   -> apply, and accept the cost
#   anything else                             -> probably a merge or a loop
#                                                over groups you can name
`,
      hl: [11, 34, 41, 51],
      caption: "**`apply` runs the function, inspects what came back, and infers how to combine — for every group.** That inference is what makes it general and what makes it 100× slower than the verb that already knew the shape."
    },

    { t: "ladder",
      title: "Flagging each sale as above or below its region's average",
      rungs: [
        { level: "bad", label: "apply with a Python lambda", code: `def flag(g):
    g = g.copy()
    g["above"] = g["amount"] > g["amount"].mean()
    return g

out = sales.groupby("region").apply(flag)      # ~4 s on 2M rows
out = out.reset_index(drop=True)               # and a MultiIndex to undo`,
          note: "**Correct and 100× too slow.** Every group runs a Python function that copies the frame; the result comes back with a group-level MultiIndex that has to be removed, and row order may not match the input." },
        { level: "ok", label: "agg then merge", code: `means = sales.groupby("region")["amount"].mean().rename("region_mean")
out = sales.merge(means, left_on="region", right_index=True)
out["above"] = out["amount"] > out["region_mean"]`,
          note: "**Fast, but three steps and a join.** Row order can change, an extra column lingers, and if `means` ever has a duplicated index the merge multiplies rows silently." },
        { level: "best", label: "transform", code: `sales["above"] = (sales["amount"]
                  > sales.groupby("region")["amount"].transform("mean"))    # ~40 ms`,
          note: "**One line, Cython speed, source index preserved.** No merge, no reset, no possibility of row multiplication — the group mean arrives already aligned to every row." }
      ]
    },

    { t: "p", text: "The `total=(\"amount\", \"sum\")` spelling of named aggregation is a tuple pandas reads as *(column, function)*. The explicit form is **`pd.NamedAgg(column=\"amount\", aggfunc=\"sum\")`** — the same thing with names, and the one to use when the aggregation is built programmatically or the function is a lambda that needs a readable output column." },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Refactor",
      title: "The cohort feature job that takes forty minutes",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "A feature job computes per-customer statistics for a model. It runs nightly on 8 million transactions and takes forty minutes. Here it is." },
        { t: "code", lang: "python", numbered: false, title: "features.py", code: `
def customer_features(tx):
    # tx: customer_id, ts, amount, category
    out = tx.copy()

    out["cust_total"] = tx.groupby("customer_id").apply(
        lambda g: g["amount"].sum()).reindex(tx["customer_id"]).values
    out["cust_mean"] = tx.groupby("customer_id").apply(
        lambda g: g["amount"].mean()).reindex(tx["customer_id"]).values
    out["share"] = out["amount"] / out["cust_total"]
    out["above_avg"] = out["amount"] > out["cust_mean"]

    out["n_categories"] = tx.groupby("customer_id").apply(
        lambda g: g["category"].nunique()).reindex(tx["customer_id"]).values

    out["cust_rank"] = tx.groupby("customer_id").apply(
        lambda g: g["amount"].rank(ascending=False)).values

    active = tx.groupby("customer_id").apply(lambda g: len(g) >= 3)
    out = out[out["customer_id"].isin(active[active].index)]
    return out`},
        { t: "p", text: "Rewrite it with the right verb for each feature. Say what each change buys, and identify the one line in the original that is not just slow but wrong." }
      ],
      requirements: [
        "Replace every `apply` with `agg`, `transform` or `filter` as appropriate.",
        "Identify the incorrect line and explain the failure.",
        "Keep the output identical (modulo row order) on correct data.",
        "Preserve the input index or state that you do not.",
        "Estimate the speedup and say where it comes from.",
        "Include tests, including one that exposes the bug."
      ],
      hint: "`.values` on a result with a group-level MultiIndex assumes the rows come back in the input's order. Do they?",
      solution: {
        lang: "python",
        title: "features_fixed.py",
        code: `import pandas as pd
import numpy as np


# =========================================================================
# THE WRONG LINE
# =========================================================================
#
#   out["cust_rank"] = tx.groupby("customer_id").apply(
#       lambda g: g["amount"].rank(ascending=False)).values
#
# apply with a Series-returning function concatenates the per-group
# results IN GROUP ORDER -- sorted by customer_id -- with a MultiIndex
# of (customer_id, original_index). Then .values strips that index
# and assigns positionally.
#
# So row 0 of out gets the rank of the FIRST ROW OF THE FIRST GROUP,
# not the rank of row 0. Unless the input happens to be sorted by
# customer_id, every customer's ranks are attached to someone else's
# rows.
#
# It is silent: the column is full of plausible ranks. It is the
# same shape of bug as the sorted-separately arrays in 2.2.
#
# The other .values lines survive because reindex(tx["customer_id"])
# explicitly re-aligns to the input order first. The rank line has no
# reindex, because a per-row result cannot be reindexed by a group
# key -- which is exactly the situation transform exists for.


def demonstrate_the_bug():
    tx = pd.DataFrame({
        "customer_id": [2, 1, 2, 1],        # NOT sorted
        "amount": [10.0, 50.0, 30.0, 5.0],
    })
    wrong = tx.groupby("customer_id").apply(
        lambda g: g["amount"].rank(ascending=False)).values
    right = tx.groupby("customer_id")["amount"].rank(ascending=False).values
    return wrong.tolist(), right.tolist()
    # ([1.0, 2.0, 1.0, 2.0], [2.0, 1.0, 1.0, 2.0])
    #
    # Row 0 is customer 2's 10 -- rank 2 within customer 2. The buggy
    # version says 1, because it took the first row of customer 1's
    # group (the 50) and assigned it positionally.


# =========================================================================
# THE REWRITE
# =========================================================================

def customer_features(tx, *, min_tx=3):
    """Per-customer features, one row per transaction.

    Every group statistic is a transform, so it comes back aligned to
    the input index and no positional assignment is needed anywhere.
    The input index is preserved.
    """
    out = tx.copy()
    by_cust = out.groupby("customer_id")

    # AGG-SHAPED STATISTICS BROADCAST TO ROWS -> transform.
    # One pass each, Cython, aligned.
    out["cust_total"] = by_cust["amount"].transform("sum")
    out["cust_mean"] = by_cust["amount"].transform("mean")
    out["n_categories"] = by_cust["category"].transform("nunique")

    out["share"] = out["amount"] / out["cust_total"]
    out["above_avg"] = out["amount"] > out["cust_mean"]

    # RANK IS ALREADY TRANSFORM-SHAPED. This is the corrected line.
    out["cust_rank"] = by_cust["amount"].rank(ascending=False, method="min")

    # FILTER: keep customers with enough transactions. transform +
    # mask rather than filter(lambda), for speed on many groups.
    n_tx = by_cust["amount"].transform("size")
    out = out[n_tx >= min_tx]

    return out


# =========================================================================
# WHERE THE FORTY MINUTES WENT
# =========================================================================
#
# 8M rows, ~500k customers.
#
# ORIGINAL: five apply calls, each running a Python lambda 500k times,
# plus three reindex operations and one isin over 8M rows.
#   5 x ~40 s (apply) + reindex/isin overhead -> a few minutes of
#   pure Python dispatch, and the rest is apply's per-group result
#   inspection and concatenation.
#
# REWRITE: four transform calls and one rank, all Cython.
#   ~4 x 0.3 s + rank ~1 s -> under 5 seconds.
#
# The speedup is not from cleverness. It is from telling pandas the
# output shape up front so it never has to call back into Python.


# =========================================================================
# TESTS
# =========================================================================

def _tx():
    return pd.DataFrame({
        "customer_id": [2, 1, 2, 1, 3, 2, 1],
        "ts": pd.date_range("2026-01-01", periods=7, freq="D"),
        "amount": [10.0, 50.0, 30.0, 5.0, 100.0, 20.0, 45.0],
        "category": ["a", "a", "b", "a", "c", "a", "b"],
    })


def test_rank_bug_in_the_original():
    wrong, right = demonstrate_the_bug()
    assert wrong != right


def test_rank_is_within_customer_and_aligned():
    out = customer_features(_tx(), min_tx=1)

    c2 = out[out["customer_id"] == 2].sort_values("amount", ascending=False)
    assert c2["cust_rank"].tolist() == [1, 2, 3]       # 30, 20, 10

    # and specifically: the 10 (row 0 in input) ranks 3rd for customer 2
    assert out.loc[0, "cust_rank"] == 3


def test_totals_and_shares():
    out = customer_features(_tx(), min_tx=1)

    c1 = out[out["customer_id"] == 1]
    assert (c1["cust_total"] == 100.0).all()
    assert np.isclose(c1["share"].sum(), 1.0)


def test_above_avg():
    out = customer_features(_tx(), min_tx=1)

    c1 = out[out["customer_id"] == 1].set_index("amount")
    assert c1.loc[50.0, "above_avg"]
    assert not c1.loc[5.0, "above_avg"]


def test_n_categories():
    out = customer_features(_tx(), min_tx=1)

    assert (out[out["customer_id"] == 1]["n_categories"] == 2).all()
    assert (out[out["customer_id"] == 3]["n_categories"] == 1).all()


def test_min_tx_filter_drops_whole_customers():
    out = customer_features(_tx(), min_tx=3)

    assert set(out["customer_id"]) == {1, 2}           # 3 has one tx
    assert len(out) == 6


def test_input_index_is_preserved():
    tx = _tx()
    tx.index = [f"r{i}" for i in range(len(tx))]

    out = customer_features(tx, min_tx=1)
    assert list(out.index) == list(tx.index)


def test_input_is_not_modified():
    tx = _tx()
    before = tx.copy()
    customer_features(tx)

    pd.testing.assert_frame_equal(tx, before)


def test_unsorted_input_gives_same_result_as_sorted():
    """The property the original's rank line violated."""
    tx = _tx()
    a = customer_features(tx, min_tx=1)
    b = customer_features(tx.sort_values("customer_id"), min_tx=1)

    pd.testing.assert_frame_equal(a.sort_index(), b.sort_index())


def test_single_transaction_customer_has_share_one():
    out = customer_features(_tx(), min_tx=1)

    assert out[out["customer_id"] == 3]["share"].iloc[0] == 1.0`,
        notes: [
          { t: "p", text: "**The rank line is not slow — it is wrong.** `apply` with a Series-returning function concatenates results in *group* order, and `.values` strips the index and assigns positionally. Unless the input was already sorted by customer, every customer's ranks are attached to someone else's rows." },
          { t: "callout", kind: "trap", title: "The other .values lines only work because of reindex", body: [
            { t: "p", text: "`reindex(tx[\"customer_id\"])` explicitly re-aligns a per-group result to the input order before `.values` strips the index. The rank line has no `reindex` because a per-row result cannot be reindexed by a group key." },
            { t: "p", text: "**That is precisely the situation `transform` exists for.** It returns the source index, so alignment is never a step you have to remember." }
          ]},
          { t: "p", text: "**The forty minutes is pure Python dispatch.** Five `apply` calls each run a lambda 500,000 times, and `apply` has to inspect every result to infer how to combine. Four `transform` calls in Cython finish in seconds — the speedup comes from telling pandas the output shape, not from any trick." },
          { t: "p", text: "**`filter(lambda g: len(g) >= 3)` reads well and runs Python per group.** `transform(\"size\") >= 3` as a mask is the same result at Cython speed, and on 500,000 customers the difference is a minute." },
          { t: "p", text: "**The unsorted-equals-sorted test is the one that would have caught the bug.** It encodes the property that group features must not depend on row order, which the original violated silently on every run where the feed happened to be unsorted." },
          { t: "p", text: "**`method=\"min\"` is stated on the rank.** The original used the default `average`, which gives fractional ranks on ties — a choice, and one worth making visible rather than inheriting." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "You need each row's amount as a share of its group's total. Which verb?",
          options: [
            "`agg(\"sum\")` then divide",
            "`transform(\"sum\")` — it returns the group total aligned to every row, so the division is one line",
            "`apply(lambda g: g / g.sum())`",
            "`filter`"
          ],
          answer: 1,
          why: "`transform` broadcasts the group statistic back to the original index, so `amount / transform(\"sum\")` needs no merge and no reset. `agg` gives one row per group and needs a join; `apply` works but runs Python per group and returns a MultiIndex to undo."
        }
      ]
    }
  ],

  takeaways: [
    "**Choose the verb from the output shape**: `agg` is one row per group, `transform` is one per input row, `filter` is whole groups, `apply` is whatever comes back.",
    "**Named aggregation gives flat, named columns** — `agg(revenue=(\"amount\", \"sum\"))` — and avoids the column MultiIndex.",
    "**String function names dispatch to Cython; lambdas run Python per group** — 60× slower for the same computation.",
    "**`count` excludes NaN, `size` includes it, `first` skips it** — three functions, three different numbers on real data.",
    "**`transform` returns the source index exactly**, so the result assigns straight in as a column with no merge and no alignment risk.",
    "**Every \"compared to its group\" feature is a transform**: deviation from the mean, share of the total, z-score within cohort.",
    "**`rank`, `cumsum`, `cumcount` and `shift` on a groupby are already transform-shaped.**",
    "**`transform` must return one value per row or a scalar** — it is not \"apply that returns a Series\".",
    "**`filter` keeps or drops whole groups**; `transform(\"size\") >= n` as a mask does the same at Cython speed.",
    "**`apply` inspects every result to infer how to combine**, which is why it is general and why it is 100× slower.",
    "**`apply`'s output structure depends on what the function returns** — a scalar, a Series and a frame give three different shapes.",
    "**`.values` on an `apply` result assigns positionally in group order**, not input order — silently wrong on unsorted input."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `g.agg(lambda s: s.mean())` much slower than `g.agg(\"mean\")`?",
        options: [
          "Lambdas are always slow in Python",
          "The string dispatches to compiled code; the lambda is a Python call executed once per group",
          "The lambda copies the data",
          "The string form caches results"
        ],
        answer: 1,
        why: "pandas recognises built-in names (and bare NumPy functions) and runs them in Cython over all groups at once. A callable it cannot recognise must be called per group — 10,000 groups, 10,000 Python calls, even when the body is identical."
      },
      {
        stem: "`transform(lambda s: s.head(1))` raises. Why?",
        options: [
          "head is not allowed in transform",
          "transform must return one value per input row or a scalar — a shorter Series cannot be aligned back",
          "The lambda needs an axis argument",
          "It only works with strings"
        ],
        answer: 1,
        why: "transform's contract is a same-length result aligned to the source index. It is not \"apply that returns a Series\" — for a result with a different shape per group, `apply` is the verb, with its speed cost and its index to clean up."
      },
      {
        stem: "`out[\"rank\"] = tx.groupby(\"k\").apply(lambda g: g[\"v\"].rank()).values`. What is wrong?",
        options: [
          "rank needs ascending=False",
          "apply concatenates in group order, and .values assigns positionally — the ranks land on the wrong rows unless the input was sorted by k",
          "apply cannot return a Series",
          "The column must be reset first"
        ],
        answer: 1,
        why: "The apply result has a `(k, original_index)` MultiIndex in sorted-group order. Stripping it and assigning positionally attaches the first group's ranks to whichever rows come first in the input. `groupby(\"k\")[\"v\"].rank()` returns the source index and needs no `.values`."
      },
      {
        stem: "When is `apply` the right choice?",
        options: [
          "Whenever a lambda is involved",
          "When a function needs the whole group frame and returns several outputs that do not decompose into named aggregations",
          "For any custom function",
          "Never"
        ],
        answer: 1,
        why: "A Series-per-group summary combining, say, the row with the max value's label and a range needs the whole frame at once. That is legitimate, and the cost is accepted. Most other uses of `apply` are a slow spelling of `agg` or `transform`."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between `agg`, `transform` and `apply` on a groupby?",
        strong: "The output shape. `agg` reduces each group to one row. `transform` returns one value per input row, aligned to the original index — which is what makes \"deviation from group mean\" a one-liner. `apply` returns whatever the function returns and infers how to combine, so it is general and roughly 100× slower. I pick the verb from the shape I need, and reach for `apply` only when the result genuinely does not fit the other two.",
        answer: [
          { t: "p", text: "Starting from output shape rather than from function descriptions is the framing that shows understanding." }
        ]
      },
      {
        level: "advanced",
        q: "A groupby job is slow. What would you look for first?",
        strong: "`apply` calls and lambdas. Each runs Python once per group, so on half a million customers a single `apply` is minutes where the equivalent `transform(\"mean\")` is under a second. Most `apply` uses are a slow spelling of `agg` or `transform` — the ones that return a scalar or a same-length Series convert directly. Then I would check for `filter(lambda)`, which is a `transform(\"size\")` mask in disguise.",
        answer: [
          { t: "p", text: "Naming the conversion rule — scalar result means `agg`, same-length result means `transform` — makes the advice actionable rather than general." }
        ]
      },
      {
        level: "advanced",
        q: "Why is `.values` on an `apply` result dangerous?",
        strong: "Because `apply` concatenates per-group results in group order with a MultiIndex, and `.values` discards that index and assigns by position. Unless the input was already sorted by the group key, every group's results land on the wrong rows — silently, with plausible values. `transform` and the transform-shaped methods like `rank` return the source index, so alignment is never a step to remember.",
        answer: [
          { t: "p", text: "This is a real production bug and describing its silence — plausible values on the wrong rows — is what makes the answer credible." },
          { t: "p", text: "Proposing the unsorted-equals-sorted test as the guard is the practical close." }
        ]
      }
    ]
  }
});

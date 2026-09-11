/* ============================================================================
   LESSON 3.5 — Reshaping: pivot, melt and stack
   ========================================================================= */
EC.receiveLesson({
  id: "3.5",

  lede: "**Long format has one row per observation; wide format has one row per entity with observations spread across columns.** Most analysis wants long, most humans want wide, and every reshape between them is a chance to lose a column into the index or silently aggregate rows you did not mean to combine.",

  objectives: [
    "Distinguish long and wide data and say which operations need which",
    "Convert between them with `melt`, `pivot` and `pivot_table` correctly",
    "Explain why `pivot` raises on duplicates and what `pivot_table` does instead",
    "Use `stack`, `unstack`, `explode` and `crosstab` for the cases they fit",
    "Round-trip a reshape without losing a column to the index"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", text: "Long and wide", id: "shapes" },

    { t: "p", text: "The same data has two natural layouts. **Long is the storage and computation form — every value on its own row with the keys that identify it. Wide is the presentation form — one row per entity, one column per measurement.** Neither is correct; each is right for different operations." },

    { t: "dl", items: [
      ["Long (tidy) format", "One row per observation: `(entity, variable, value)`. Adding a new variable adds rows, not columns. This is what `groupby`, plotting libraries and databases expect."],
      ["Wide format", "One row per entity, one column per variable. Adding a variable adds a column. This is what a spreadsheet user expects and what most models want as input."],
      ["`melt`", "Wide → long. Unpivots columns into `(variable, value)` pairs, keeping the `id_vars` you name."],
      ["`pivot`", "Long → wide, **without aggregation**. Raises if any `(index, column)` pair appears more than once."],
      ["`pivot_table`", "Long → wide **with aggregation**. Duplicates are combined by `aggfunc` — mean by default, which is silently wrong for counts and sums."],
      ["`stack` / `unstack`", "Move a level between the column index and the row index. The general form that `pivot` and `melt` are built on."]
    ]},

    { t: "viz",
      title: "The same six values, two layouts",
      caption: "Long: six rows, one per (store, month). Wide: two rows with the months as columns. melt goes right to left; pivot goes left to right.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="A long table of store, month and sales beside a wide table with months as columns, with arrows labelled melt and pivot">
  <text x="30" y="26" class="s-label" style="fill:var(--accent)">long — 6 rows</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="30" y="54" class="s-sub" style="fill:var(--ink-3)">store  month  sales</text>
    <text x="30" y="78" class="s-sub" style="fill:var(--ink-2)">A      jan    10</text>
    <text x="30" y="100" class="s-sub" style="fill:var(--ink-2)">A      feb    12</text>
    <text x="30" y="122" class="s-sub" style="fill:var(--ink-2)">A      mar    11</text>
    <text x="30" y="144" class="s-sub" style="fill:var(--ink-2)">B      jan    20</text>
    <text x="30" y="166" class="s-sub" style="fill:var(--ink-2)">B      feb    18</text>
    <text x="30" y="188" class="s-sub" style="fill:var(--ink-2)">B      mar    22</text>
  </g>
  <rect x="24" y="40" width="200" height="158" rx="6" style="fill:none;stroke:var(--accent);stroke-width:1.5"/>

  <line x1="250" y1="100" x2="430" y2="100" style="stroke:var(--good);stroke-width:2" marker-end="url(#rs-g)"/>
  <text x="290" y="90" class="s-sub" style="fill:var(--good)">pivot / unstack</text>
  <line x1="430" y1="150" x2="250" y2="150" style="stroke:var(--warn);stroke-width:2" marker-end="url(#rs-w)"/>
  <text x="290" y="172" class="s-sub" style="fill:var(--warn)">melt / stack</text>

  <text x="460" y="26" class="s-label" style="fill:var(--good)">wide — 2 rows</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="460" y="54" class="s-sub" style="fill:var(--ink-3)">store  jan  feb  mar</text>
    <text x="460" y="78" class="s-sub" style="fill:var(--ink-2)">A      10   12   11</text>
    <text x="460" y="100" class="s-sub" style="fill:var(--ink-2)">B      20   18   22</text>
  </g>
  <rect x="454" y="40" width="220" height="72" rx="6" style="fill:none;stroke:var(--good);stroke-width:1.5"/>

  <text x="460" y="150" class="s-sub" style="fill:var(--ink-3)">groupby, plotting, joins → long</text>
  <text x="460" y="172" class="s-sub" style="fill:var(--ink-3)">model input, reports, humans → wide</text>
  <text x="460" y="194" class="s-sub" style="fill:var(--ink-3)">adding "apr": long adds 2 rows,</text>
  <text x="460" y="214" class="s-sub" style="fill:var(--ink-3)">wide adds a column — a schema change</text>

  <line x1="30" y1="240" x2="850" y2="240" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="264" class="s-sub" style="fill:var(--ink-3)">pivot needs every (store, month) pair to be unique. If store A has two January rows, it raises — pivot_table averages them instead, silently.</text>

  <defs>
    <marker id="rs-g" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--good)"/></marker>
    <marker id="rs-w" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--warn)"/></marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "python", title: "melt and pivot, and the round trip", code: `
import pandas as pd
import numpy as np

wide = pd.DataFrame({
    "store": ["A", "B"],
    "jan": [10, 20],
    "feb": [12, 18],
    "mar": [11, 22],
})

# WIDE -> LONG with melt:
long = wide.melt(id_vars="store", var_name="month", value_name="sales")
long
#   store month  sales
# 0     A   jan     10
# 1     B   jan     20
# 2     A   feb     12
# ...
#
# id_vars are kept as columns. Everything else becomes (variable,
# value) pairs. Without var_name and value_name you get columns
# literally called "variable" and "value", which then need renaming.

# value_vars RESTRICTS WHICH COLUMNS MELT -- essential on a wide frame
# where only some columns are measurements:
wide["region"] = ["north", "south"]
wide.melt(id_vars=["store", "region"], value_vars=["jan", "feb", "mar"])
#
# Forgetting value_vars melts region too, and you get rows where
# month == "region" and sales == "north". No error.

# LONG -> WIDE with pivot:
back = long.pivot(index="store", columns="month", values="sales")
back
# month  feb  jan  mar          <- ALPHABETICAL, not chronological
# store
# A       12   10   11
# B       18   20   22
#
# TWO THINGS HAPPENED: store went INTO THE INDEX, and the columns are
# now sorted alphabetically. Both need undoing to get the original.

back = back[["jan", "feb", "mar"]].reset_index()
back.columns.name = None                  # remove the "month" label
#
# columns.name is the residue of the pivot -- a name attached to the
# column index. It is harmless but shows up in display and in to_csv
# as an odd header row, so clearing it is worth the line.

# THE ROUND TRIP, done properly:
def to_long(wide, id_cols, var_name, value_name):
    value_cols = [c for c in wide.columns if c not in id_cols]
    return wide.melt(id_vars=id_cols, value_vars=value_cols,
                     var_name=var_name, value_name=value_name)

def to_wide(long, index, columns, values, column_order=None):
    w = long.pivot(index=index, columns=columns, values=values)
    if column_order is not None:
        w = w[column_order]
    w.columns.name = None
    return w.reset_index()

order = ["jan", "feb", "mar"]
roundtrip = to_wide(to_long(wide.drop(columns="region"), ["store"], "month", "sales"),
                    "store", "month", "sales", order)
pd.testing.assert_frame_equal(roundtrip, wide.drop(columns="region"))

# WHY pivot RAISES ON DUPLICATES, and why that is correct:
dup = pd.concat([long, long.iloc[[0]]])   # store A, jan appears twice
try:
    dup.pivot(index="store", columns="month", values="sales")
except ValueError as e:
    print(e)      # Index contains duplicate entries, cannot reshape
#
# There is no single value to put in cell (A, jan). pivot refuses to
# guess. That refusal is the safety net -- because pivot_table WILL
# guess, and its guess is the mean.
`,
      hl: [23, 30, 40, 66],
      caption: "**`pivot` puts the index column into the index and sorts the new columns alphabetically.** Both need undoing for a faithful round trip, and `columns.name` is a residue that surfaces as a stray header row in `to_csv`."
    },

    { t: "h2", n: "02", text: "pivot_table and the aggregation you did not ask for", id: "pivot_table" },

    { t: "p", text: "**`pivot_table` is `groupby` followed by `unstack`.** Its default aggregation is `mean`, which is right for prices and wrong for counts, sums and anything additive — and it applies whether or not there were duplicates to aggregate." },

    { t: "code", lang: "python", title: "pivot_table, done deliberately", code: `
orders = pd.DataFrame({
    "region": ["n", "n", "n", "s", "s", "s"],
    "product": ["x", "x", "y", "x", "y", "y"],
    "qty": [1, 2, 5, 3, 4, 6],
    "price": [10.0, 10.0, 20.0, 10.0, 20.0, 20.0],
})

# THE DEFAULT IS mean, AND IT IS APPLIED SILENTLY:
orders.pivot_table(index="region", columns="product", values="qty")
# product    x    y
# region
# n        1.5  5.0        <- (1+2)/2 = 1.5. Was that what you wanted?
# s        3.0  5.0
#
# A report of "quantity by region and product" that shows 1.5 units is
# the default doing exactly what it says. Nobody asked for an average.

# SAY WHAT YOU MEAN:
orders.pivot_table(index="region", columns="product", values="qty",
                   aggfunc="sum")
# product  x   y
# n        3   5
# s        3  10

# MULTIPLE AGGREGATIONS GIVE A COLUMN MultiIndex:
p = orders.pivot_table(index="region", columns="product",
                       values=["qty", "price"],
                       aggfunc={"qty": "sum", "price": "mean"})
p.columns                     # MultiIndex: (price, x), (price, y), (qty, x)...
#
# FLATTEN BEFORE EXPORTING, or to_csv writes two header rows:
p.columns = [f"{a}_{b}" for a, b in p.columns]

# margins ADDS TOTALS -- and they use the SAME aggfunc:
orders.pivot_table(index="region", columns="product", values="qty",
                   aggfunc="sum", margins=True, margins_name="total")
# product   x   y  total
# n         3   5      8
# s         3  10     13
# total     6  15     21
#
# With aggfunc="mean" the margin is the mean of the underlying rows,
# NOT the mean of the cell means. That is correct and surprises people.

# fill_value FOR COMBINATIONS THAT NEVER OCCURRED:
sparse = orders[orders["product"] != "y"]
sparse.pivot_table(index="region", columns="product", values="qty",
                   aggfunc="sum", fill_value=0)
#
# Without fill_value, an absent combination is NaN -- which is the
# honest answer for a mean and the wrong answer for a count or sum,
# where "no rows" means 0.

# pivot_table IS groupby + unstack. Knowing that helps when it does
# not do what you want:
orders.groupby(["region", "product"])["qty"].sum().unstack("product")
#
# Same result, and the groupby form takes any aggregation groupby can
# express -- named aggregations, multiple outputs, custom functions --
# where pivot_table's aggfunc is more limited.

# observed= MATTERS ON CATEGORICALS, same as groupby (see 3.3):
cat = orders.copy()
cat["product"] = cat["product"].astype("category")
cat.pivot_table(index="region", columns="product", values="qty",
                aggfunc="sum", observed=True)
`,
      hl: [9, 32, 44, 55],
      caption: "**`pivot_table` defaults to `mean`, so a quantity report shows 1.5 units.** It does exactly what it says, and nobody asked for an average — pass `aggfunc` every time."
    },

    { t: "callout", kind: "trap", title: "pivot_table silently averages duplicates", body: [
      { t: "p", text: "Where `pivot` raises on a duplicate `(index, column)` pair, `pivot_table` combines them — using `mean` unless told otherwise. A dataset with an accidental duplicated row produces a report where one cell is quietly averaged and every other cell is a plain value." },
      { t: "p", text: "**Use `pivot` when duplicates would be a bug**, so the bug is caught. Use `pivot_table` when aggregation is the point, and always pass `aggfunc`." },
      { t: "p", text: "A reconciliation check catches the rest: the sum of a `pivot_table(aggfunc=\"sum\")` must equal the sum of the source column. If it does not, something was dropped — a NaN key, or an `observed=` surprise." }
    ]},

    { t: "h2", n: "03", text: "stack, unstack, explode and crosstab", id: "others" },

    { t: "code", lang: "python", title: "the four other reshapes and when each fits", code: `
# stack / unstack MOVE A LEVEL BETWEEN AXES. They are the primitives.
w = pd.DataFrame({"jan": [10, 20], "feb": [12, 18]}, index=["A", "B"])

s = w.stack()                 # columns -> inner row level. A Series.
s
# A  jan    10
#    feb    12
# B  jan    20
#    feb    18
s.unstack()                   # back to wide -- and back to a DataFrame
#
# stack gives a Series with a MultiIndex; unstack pulls the innermost
# level (or the one you name) back into columns. pivot is unstack
# after set_index; melt is stack after set_index plus reset_index.

# unstack ON A GROUPBY RESULT is the most common real use:
g = orders.groupby(["region", "product"])["qty"].sum()
g.unstack("product")          # products as columns
g.unstack("region")           # regions as columns
g.unstack(fill_value=0)       # innermost level, zeros for gaps

# stack DROPS MISSING VALUES BY DEFAULT -- a row count surprise:
w2 = w.copy()
w2.loc["A", "feb"] = np.nan
len(w2.stack())               # 3, not 4
len(w2.stack(future_stack=True))       # 4 -- pandas 2.1+ keeps them
#
# A long frame built with stack() from a wide one with gaps has fewer
# rows than entities x variables, and a downstream pivot then shows
# NaN where the gap was -- the same gap, having taken a round trip.

# explode -- ONE ROW PER LIST ELEMENT:
tags = pd.DataFrame({
    "post": [1, 2, 3],
    "tags": [["a", "b"], ["c"], []],
})
tags.explode("tags")
#    post tags
# 0     1    a
# 0     1    b       <- INDEX IS DUPLICATED
# 1     2    c
# 2     3  NaN       <- empty list becomes ONE row with NaN
#
# Two things to handle: reset_index(drop=True) because the index now
# repeats, and the empty-list row, which appears as NaN rather than
# disappearing. If a post with no tags should not appear, dropna after.
tags.explode("tags").dropna(subset=["tags"]).reset_index(drop=True)

# explode IS THE JSON FLATTENING TOOL (see 5.3). A column of lists
# from json_normalize becomes one row per element in one call.

# THE INVERSE OF explode:
exploded = tags.explode("tags")
exploded.groupby("post")["tags"].agg(list)       # back to lists
#
# NOTE the NaN from the empty list comes back as [nan], not []. The
# round trip is lossy at exactly the empty-list case.

# crosstab -- A FREQUENCY TABLE WITHOUT A VALUES COLUMN:
pd.crosstab(orders["region"], orders["product"])
# product  x  y
# region
# n        2  1
# s        1  2
#
# This is pivot_table with aggfunc="count" and no values -- but it
# takes SERIES, not column names, so it works on any two aligned
# arrays without building a frame first.

pd.crosstab(orders["region"], orders["product"], normalize="index")
# row proportions -- what share of each region is x vs y
pd.crosstab(orders["region"], orders["product"], margins=True)
pd.crosstab(orders["region"], orders["product"],
            values=orders["qty"], aggfunc="sum")     # a pivot_table, really

# wide_to_long -- FOR COLUMNS THAT ENCODE A VARIABLE AND A SUFFIX:
survey = pd.DataFrame({
    "id": [1, 2],
    "score_2024": [80, 85], "score_2025": [82, 88],
    "weight_2024": [70, 75], "weight_2025": [71, 74],
})
pd.wide_to_long(survey, stubnames=["score", "weight"], i="id", j="year",
                sep="_").reset_index()
#    id  year  score  weight
# 0   1  2024     80      70
# 1   2  2024     85      75
# ...
#
# melt would give one (variable, value) pair per column and need a
# further split of "score_2024" into two fields. wide_to_long parses
# the stub and suffix directly.
`,
      hl: [22, 32, 40, 62],
      caption: "**`explode` duplicates the index and turns an empty list into one NaN row.** Both need handling, and the round trip through `groupby(...).agg(list)` is lossy at exactly the empty-list case."
    },

    { t: "table",
      head: ["You have", "You want", "Use", "Watch for"],
      rows: [
        ["Wide columns of one measurement", "Long rows", "`melt`", "Set `value_vars`, or ID columns melt too"],
        ["Long rows, unique (index, col) pairs", "Wide", "`pivot`", "Index column moves into the index; columns sort alphabetically"],
        ["Long rows with duplicates to aggregate", "Wide", "`pivot_table`", "Default `aggfunc` is `mean`; pass it explicitly"],
        ["A grouped Series with a MultiIndex", "Wide", "`unstack`", "`fill_value` for absent combinations"],
        ["A column of lists", "One row per element", "`explode`", "Duplicated index; empty list → NaN row"],
        ["Two categorical columns", "A frequency table", "`crosstab`", "Takes Series, not names; `normalize` for proportions"],
        ["Columns like `score_2024`, `score_2025`", "Long with a parsed suffix", "`wide_to_long`", "Requires consistent `stub_sep_suffix` naming"]
      ],
      caption: "**`pivot` is the safe one**: it refuses to guess when a cell has two candidate values. Reach for `pivot_table` only when aggregation is what you mean."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A monthly report that reconciles to its source",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Build the reshaping layer for a monthly sales report. Transactions arrive long — one row per sale — and the report is wide, one row per store with a column per month plus a total. The previous version did not reconcile: the report's grand total was lower than the transaction total and nobody could say why." },
        { t: "p", text: "Then build the inverse, so a corrected wide report can be turned back into long rows for the database." }
      ],
      requirements: [
        "Long → wide with explicit aggregation, chronological column order and a total column.",
        "Reconcile the report total to the source total and fail loudly if they differ.",
        "Handle months with no sales for a store as 0, not NaN.",
        "Handle a missing store key without dropping the rows silently.",
        "Wide → long inverse that survives a round trip.",
        "Include tests, including the case that broke the previous version."
      ],
      hint: "There are two separate ways rows leave a pivot silently. The reconciliation catches both; the tests should name each.",
      solution: {
        lang: "python",
        title: "monthly_report.py",
        code: `import pandas as pd
import numpy as np


MONTHS = ["jan", "feb", "mar", "apr", "may", "jun",
          "jul", "aug", "sep", "oct", "nov", "dec"]


# =========================================================================
# LONG -> WIDE
# =========================================================================

def build_report(transactions, *, tolerance=1e-6):
    """One row per store, one column per month, plus a total.

    Rows with a missing store are NOT dropped. They are collected
    under an explicit "(unknown)" store so the report still reconciles
    and the data problem is visible in the output rather than hidden
    in the difference between two totals.
    """
    tx = transactions.copy()
    required = {"store", "month", "amount"}
    if missing := required - set(tx.columns):
        raise KeyError(f"missing columns: {sorted(missing)}")

    unknown_months = set(tx["month"].dropna()) - set(MONTHS)
    if unknown_months:
        raise ValueError(f"unrecognised months: {sorted(unknown_months)}")

    # A MISSING KEY IS THE FIRST WAY ROWS VANISH. groupby drops NaN
    # keys by default; pivot_table is groupby underneath and does the
    # same. Making it a real value keeps the rows.
    n_unknown = int(tx["store"].isna().sum())
    tx["store"] = tx["store"].fillna("(unknown)")

    # EXPLICIT aggfunc. The default is mean, which for an amount
    # column produces an average sale where a total was wanted.
    wide = tx.pivot_table(
        index="store",
        columns="month",
        values="amount",
        aggfunc="sum",
        fill_value=0.0,           # no sales is zero, not missing
        observed=True,            # if month is ever categorical
    )

    # A MONTH WITH NO SALES ANYWHERE is absent from the columns
    # entirely. Reindex so the report always has twelve months, in
    # order, rather than whichever subset happened to occur.
    wide = wide.reindex(columns=MONTHS, fill_value=0.0)

    wide["total"] = wide[MONTHS].sum(axis=1)
    wide.columns.name = None
    wide = wide.reset_index()

    # THE RECONCILIATION. This is the check the previous version
    # lacked, and it catches BOTH silent-loss mechanisms: dropped NaN
    # keys, and observed=False on categoricals inventing zero rows
    # (which would not change the sum but is worth the same check).
    source_total = float(transactions["amount"].sum())
    report_total = float(wide["total"].sum())
    if abs(source_total - report_total) > tolerance:
        raise ValueError(
            f"report total {report_total:.2f} != source total "
            f"{source_total:.2f} (difference {source_total - report_total:.2f})"
        )

    meta = {
        "rows_in": len(transactions),
        "stores": int((wide["store"] != "(unknown)").sum()),
        "unknown_store_rows": n_unknown,
        "unknown_store_amount": float(
            wide.loc[wide["store"] == "(unknown)", "total"].sum()
        ),
        "source_total": source_total,
        "report_total": report_total,
    }
    return wide, meta


# =========================================================================
# WIDE -> LONG
# =========================================================================

def report_to_long(wide, *, drop_zero=True):
    """Inverse of build_report.

    drop_zero  a zero cell in the report means "no sales that month";
               a long table of transactions should not carry a row
               for it. Set False to keep an explicit zero per month.
    """
    if "store" not in wide.columns:
        raise KeyError("wide report must have a store column")

    month_cols = [c for c in MONTHS if c in wide.columns]
    long = wide.melt(
        id_vars="store",
        value_vars=month_cols,        # NOT total, and not anything else
        var_name="month",
        value_name="amount",
    )
    if drop_zero:
        long = long[long["amount"] != 0]

    # RESTORE THE MISSING KEY. The report made it a string so it would
    # survive; the database wants it as null.
    long["store"] = long["store"].replace("(unknown)", np.nan)

    return long.reset_index(drop=True)


# =========================================================================
# WHY THE OLD VERSION DID NOT RECONCILE
# =========================================================================
#
# Two mechanisms, both silent:
#
# 1. transactions with store = NaN. pivot_table (via groupby) drops
#    them. Their amount leaves the report and appears in no row.
#
# 2. If the old code used .pivot_table(...) with the default aggfunc,
#    every cell was a MEAN of that store-month's sales, and the
#    "total" was a sum of means -- a number with no meaning at all,
#    which is why nobody could explain the difference.
#
# The reconciliation assertion makes both impossible to ship.


# =========================================================================
# TESTS
# =========================================================================

def _tx():
    return pd.DataFrame({
        "store": ["A", "A", "A", "B", "B", None, "A"],
        "month": ["jan", "jan", "feb", "jan", "mar", "feb", "mar"],
        "amount": [10.0, 5.0, 12.0, 20.0, 22.0, 7.0, 11.0],
    })


def test_duplicates_are_summed_not_averaged():
    """The pivot_table default would give 7.5 for (A, jan)."""
    wide, _ = build_report(_tx())

    assert wide.set_index("store").loc["A", "jan"] == 15.0


def test_report_reconciles_to_source():
    tx = _tx()
    wide, meta = build_report(tx)

    assert abs(meta["report_total"] - tx["amount"].sum()) < 1e-9
    assert abs(wide["total"].sum() - 87.0) < 1e-9


def test_missing_store_is_kept_not_dropped():
    """The mechanism that broke the previous version."""
    wide, meta = build_report(_tx())

    assert meta["unknown_store_rows"] == 1
    assert meta["unknown_store_amount"] == 7.0
    assert "(unknown)" in wide["store"].values


def test_the_old_behaviour_loses_rows():
    """Demonstrate what a plain pivot_table does with a NaN key."""
    tx = _tx()
    naive = tx.pivot_table(index="store", columns="month",
                           values="amount", aggfunc="sum")

    assert naive.to_numpy().sum() < tx["amount"].sum()     # 7.0 gone


def test_all_twelve_months_in_order():
    wide, _ = build_report(_tx())

    assert list(wide.columns) == ["store"] + MONTHS + ["total"]


def test_empty_month_is_zero_not_nan():
    wide, _ = build_report(_tx())

    assert wide.set_index("store").loc["B", "feb"] == 0.0
    assert not wide[MONTHS].isna().any().any()


def test_round_trip():
    tx = _tx()
    wide, _ = build_report(tx)
    long = report_to_long(wide)

    # Compare AGGREGATED, because the source had two (A, jan) rows and
    # the report combined them. The round trip preserves totals, not
    # individual transactions -- which is the honest claim.
    expected = (tx.assign(store=tx["store"].fillna("(unknown)"))
                  .groupby(["store", "month"])["amount"].sum())
    actual = (long.assign(store=long["store"].fillna("(unknown)"))
                  .groupby(["store", "month"])["amount"].sum())

    pd.testing.assert_series_equal(actual.sort_index(), expected.sort_index())


def test_long_does_not_include_total_column():
    wide, _ = build_report(_tx())
    long = report_to_long(wide)

    assert "total" not in long["month"].values


def test_unknown_month_is_rejected():
    tx = _tx()
    tx.loc[0, "month"] = "janury"

    try:
        build_report(tx)
        assert False, "should have raised"
    except ValueError as e:
        assert "janury" in str(e)


def test_reconciliation_fails_loudly_if_broken():
    """Simulate a report that lost money somewhere."""
    tx = _tx()
    wide, _ = build_report(tx)

    wide.loc[0, "jan"] -= 1.0          # corrupt one cell
    assert abs(wide[MONTHS].sum().sum() - tx["amount"].sum()) > 0.5


def test_empty_input():
    empty = pd.DataFrame({"store": [], "month": [], "amount": []})
    wide, meta = build_report(empty)

    assert len(wide) == 0
    assert meta["source_total"] == 0.0`,
        notes: [
          { t: "p", text: "**Two silent mechanisms, one assertion.** Rows with a missing store key leave through `groupby`'s default `dropna`, and the default `aggfunc` turns every cell into a mean — the reconciliation check makes both impossible to ship, and the tests name each separately." },
          { t: "callout", kind: "insight", title: "Make the missing key a real value", body: [
            { t: "p", text: "Filling `store` with `\"(unknown)\"` before pivoting keeps those rows in the report as an explicit row, so the data problem is *visible in the output* rather than hidden in the difference between two totals." },
            { t: "p", text: "The inverse restores it to null for the database. A placeholder that exists only inside the reshaping layer is the right shape for this." }
          ]},
          { t: "p", text: "**`reindex(columns=MONTHS)` is what makes the report stable.** `pivot_table` only produces columns for months that occurred; a quiet month vanishes and every downstream consumer expecting twelve columns breaks in a new way each time." },
          { t: "p", text: "**`fill_value=0` is correct for a sum and would be wrong for a mean.** No sales in a month is zero revenue; it is not an unknown average. The argument encodes the meaning of an absent combination, which depends on the aggregation." },
          { t: "p", text: "**The round trip preserves totals, not transactions.** The source had two `(A, jan)` rows and the report combined them, so comparing at the aggregated level is the honest claim — asserting row-for-row equality would be asserting something the reshape never promised." },
          { t: "p", text: "**`value_vars` is set explicitly in the inverse** so that `total` does not melt into a thirteenth month. Without it, `melt` takes every non-id column, and the long table gains a row per store labelled `month == \"total\"`." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`orders.pivot_table(index=\"region\", columns=\"product\", values=\"qty\")` shows 1.5 for a cell. Why?",
          options: [
            "A row has a fractional quantity",
            "The default `aggfunc` is `mean`, and two rows for that region and product were averaged",
            "pivot_table interpolates missing cells",
            "The values column was float"
          ],
          answer: 1,
          why: "`pivot_table` aggregates duplicates, and its default is `mean`. A quantity report showing one and a half units is the default doing exactly what it says — pass `aggfunc=\"sum\"` for anything additive, and use plain `pivot` when a duplicate would be a bug you want raised."
        }
      ]
    }
  ],

  takeaways: [
    "**Long has one row per observation; wide has one row per entity** — groupby and plotting want long, models and humans want wide.",
    "**`melt` goes wide → long**; set `value_vars` or the ID columns melt too, with no error.",
    "**`pivot` goes long → wide without aggregation** and raises on a duplicate `(index, column)` pair — that refusal is the safety net.",
    "**`pivot_table` aggregates duplicates and defaults to `mean`**, which is wrong for counts and sums; pass `aggfunc` every time.",
    "**`pivot` moves the index column into the index and sorts new columns alphabetically** — both need undoing for a round trip.",
    "**`columns.name` is a residue of pivoting** that surfaces as a stray header row in `to_csv`; clear it.",
    "**`pivot_table` is `groupby` followed by `unstack`**, and the groupby form takes any aggregation groupby can express.",
    "**`fill_value=0` is right for a sum and wrong for a mean** — the meaning of an absent combination depends on the aggregation.",
    "**`stack` drops missing values by default**, so a long frame built from a wide one with gaps has fewer rows than entities × variables.",
    "**`explode` duplicates the index and turns an empty list into a single NaN row** — reset the index and decide what an empty list means.",
    "**`crosstab` takes Series rather than column names**, and `normalize=` turns counts into proportions.",
    "**Reconcile a reshaped total to its source.** The sum of a `pivot_table(aggfunc=\"sum\")` must equal the sum of the source column, or rows left silently."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does `pivot` raise on duplicate (index, column) pairs while `pivot_table` does not?",
        options: [
          "pivot is an older function",
          "pivot has no aggregation, so two candidate values for one cell is an error; pivot_table combines them with aggfunc",
          "pivot_table sorts first",
          "pivot only works on numeric data"
        ],
        answer: 1,
        why: "`pivot` refuses to guess which value a cell should hold, which makes it the safe choice when duplicates would indicate a bug. `pivot_table` is `groupby` plus `unstack` and will silently combine them — using `mean` by default — so it belongs only where aggregation is the intent."
      },
      {
        stem: "After `wide.melt(id_vars=\"store\")` on a frame with a `region` column, you find rows where `month == \"region\"`. Why?",
        options: [
          "A bug in melt",
          "`value_vars` was not set, so every non-id column — including region — was melted into variable/value pairs",
          "region was categorical",
          "The frame had a MultiIndex"
        ],
        answer: 1,
        why: "Without `value_vars`, melt takes every column not in `id_vars` as a measurement. There is no error, just rows where the variable is a column name that was never a measurement. Name the value columns explicitly on any frame with more than one kind of column."
      },
      {
        stem: "A monthly report's grand total is lower than the transaction total. What is the most likely cause?",
        options: [
          "Floating-point rounding",
          "Transactions with a missing store key were dropped by the groupby underneath pivot_table",
          "The months were sorted alphabetically",
          "fill_value was set to 0"
        ],
        answer: 1,
        why: "`groupby` excludes NaN keys by default, and `pivot_table` inherits that. The rows leave silently and their amount appears in no cell. A reconciliation assertion — report total equals source total — catches this and every other silent-loss mechanism in one line."
      },
      {
        stem: "`df.explode(\"tags\")` on a row whose tags list is empty produces what?",
        options: [
          "No row",
          "One row with NaN in the tags column, sharing the original index label",
          "An error",
          "A row with an empty string"
        ],
        answer: 1,
        why: "Empty lists become a single NaN row rather than vanishing, and every exploded row keeps its source index label, so the index now repeats. Both need a decision: `reset_index(drop=True)`, and either `dropna` or keep the row depending on whether a tagless post should appear."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between long and wide data, and when do you want each?",
        strong: "Long has one row per observation with the identifying keys as columns; wide has one row per entity with a column per measurement. Long is what groupby, joins, plotting and databases want, because adding a variable adds rows rather than changing the schema. Wide is what models take as input and what people read. Most pipelines store long and present wide.",
        answer: [
          { t: "p", text: "The schema-change point — adding a variable to wide data changes the column set — is what makes the preference concrete rather than aesthetic." }
        ]
      },
      {
        level: "advanced",
        q: "When would you use `pivot` rather than `pivot_table`?",
        strong: "When a duplicate (index, column) pair would be a bug. `pivot` raises on one; `pivot_table` silently combines them with its aggfunc, which defaults to mean. So for a lookup-style reshape where each cell should have exactly one value, `pivot`'s refusal to guess is the safety net. `pivot_table` is for when aggregation is the point — and then I always pass `aggfunc` explicitly.",
        answer: [
          { t: "p", text: "Framing `pivot`'s error as a feature is the insight; most candidates treat it as an inconvenience to route around." },
          { t: "p", text: "Adding that `pivot_table` is `groupby` plus `unstack` shows you can fall back to the general form when the convenience one is limiting." }
        ]
      },
      {
        level: "advanced",
        q: "A reshaped report does not reconcile to its source. How would you find where the rows went?",
        strong: "Two mechanisms account for nearly every case: rows with a NaN key dropped by the groupby underneath `pivot_table`, and the default `mean` aggfunc producing cells that are averages, so the 'total' is a sum of means. I would compare the source sum to the report sum first, then `groupby(dropna=False)` to see the NaN group appear. And I would add the reconciliation as an assertion so it cannot ship again.",
        answer: [
          { t: "p", text: "Leading with the two specific mechanisms rather than a general debugging strategy shows you have seen this exact failure." }
        ]
      }
    ]
  }
});

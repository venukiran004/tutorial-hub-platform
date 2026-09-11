/* ============================================================================
   LESSON 4.1 — GroupBy: Split, Apply, Combine
   ========================================================================= */
EC.receiveLesson({
  id: "4.1",

  lede: "**`groupby` splits a frame into pieces by key, applies something to each piece, and combines the results.** Understanding those three steps separately explains every shape it returns, every index it produces, and the two arguments — `observed` and `dropna` — whose defaults quietly change the row count.",

  objectives: [
    "Describe the split-apply-combine model and predict the output shape",
    "Control the result's index with `as_index` and `reset_index`",
    "Group by columns, index levels, functions and time bins",
    "Explain what `observed=` and `dropna=` do to the row count",
    "Iterate groups and inspect a single group when debugging"
  ],

  prerequisites: ["3.1", "3.5"],

  blocks: [

    { t: "h2", n: "01", text: "Three steps, one object", id: "model" },

    { t: "p", text: "`df.groupby(\"key\")` does no computation. **It returns a lazy object that knows how to split the frame** — the actual work happens when you call an aggregation on it. Seeing it as three separate steps makes the output shape predictable." },

    { t: "dl", items: [
      ["Split", "Partition the rows by the distinct values of the key. Each partition is a sub-frame sharing one key value."],
      ["Apply", "Run a function on each partition. The function decides the output *shape* — one value per group, one value per row, or something else."],
      ["Combine", "Stitch the per-group results back together, with the group keys as the index by default."],
      ["`GroupBy` object", "The lazy result of `.groupby()`. Holds the grouping instructions; computes nothing until an aggregation is called."],
      ["`as_index`", "Whether the group keys become the result's index (`True`, default) or ordinary columns (`False`)."],
      ["`observed`", "For categorical keys: whether to include category combinations that never occur in the data. **`False` produces rows for every combination**, which can be a cartesian product."]
    ]},

    { t: "viz",
      title: "Split, apply, combine",
      caption: "Six rows split by region into two groups; a sum applied to each; the results combined with the keys as the index. The apply step decides whether the output has one row per group or one per original row.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="A six-row frame split into two groups by region, aggregated, and recombined into a two-row result">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">split</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="30" y="52" class="s-sub" style="fill:var(--ink-3)">region  sales</text>
    <text x="30" y="74" class="s-sub" style="fill:var(--acc)">n       10</text>
    <text x="30" y="94" class="s-sub" style="fill:var(--good)">s       20</text>
    <text x="30" y="114" class="s-sub" style="fill:var(--acc)">n       12</text>
    <text x="30" y="134" class="s-sub" style="fill:var(--good)">s       18</text>
    <text x="30" y="154" class="s-sub" style="fill:var(--acc)">n       11</text>
    <text x="30" y="174" class="s-sub" style="fill:var(--good)">s       22</text>
  </g>

  <g style="stroke:var(--ink-3);stroke-width:1.5">
    <line x1="170" y1="110" x2="250" y2="80" marker-end="url(#gb-a)"/>
    <line x1="170" y1="140" x2="250" y2="160" marker-end="url(#gb-a)"/>
  </g>

  <text x="270" y="26" class="s-label" style="fill:var(--ink-2)">apply — sum()</text>
  <rect x="264" y="56" width="150" height="56" rx="6" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc);stroke-width:1.5"/>
  <text x="278" y="80" class="s-sub" style="fill:var(--acc)">n: 10, 12, 11</text>
  <text x="278" y="100" class="s-sub" style="fill:var(--acc)">→ 33</text>
  <rect x="264" y="136" width="150" height="56" rx="6" style="fill:var(--good);fill-opacity:.12;stroke:var(--good);stroke-width:1.5"/>
  <text x="278" y="160" class="s-sub" style="fill:var(--good)">s: 20, 18, 22</text>
  <text x="278" y="180" class="s-sub" style="fill:var(--good)">→ 60</text>

  <g style="stroke:var(--ink-3);stroke-width:1.5">
    <line x1="420" y1="84" x2="500" y2="110" marker-end="url(#gb-a)"/>
    <line x1="420" y1="164" x2="500" y2="130" marker-end="url(#gb-a)"/>
  </g>

  <text x="520" y="26" class="s-label" style="fill:var(--ink-2)">combine</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="520" y="100" class="s-sub" style="fill:var(--ink-3)">region  sales</text>
    <text x="520" y="122" class="s-sub" style="fill:var(--acc)">n       33</text>
    <text x="520" y="142" class="s-sub" style="fill:var(--good)">s       60</text>
  </g>
  <text x="520" y="176" class="s-sub" style="fill:var(--ink-3)">region is the INDEX</text>
  <text x="520" y="196" class="s-sub" style="fill:var(--ink-3)">unless as_index=False</text>

  <line x1="30" y1="220" x2="850" y2="220" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="244" class="s-sub" style="fill:var(--ink-3)">sum() → one row per group.   transform("sum") → 33, 60, 33, 60, 33, 60 — one per ORIGINAL row, aligned to the source index.</text>
  <text x="30" y="266" class="s-sub" style="fill:var(--ink-3)">The apply step chooses the shape. Lesson 4.2 is about which verb gives which.</text>

  <defs><marker id="gb-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/></marker></defs>
</svg>`
    },

    { t: "code", lang: "python", title: "the object, the index it produces, and getting a flat result", code: `
import pandas as pd
import numpy as np

sales = pd.DataFrame({
    "region": ["n", "s", "n", "s", "n", "s"],
    "product": ["x", "x", "y", "y", "x", "y"],
    "amount": [10, 20, 12, 18, 11, 22],
    "units": [1, 2, 1, 2, 1, 3],
})

g = sales.groupby("region")
type(g)                       # DataFrameGroupBy -- nothing computed yet
g.ngroups                     # 2
g.size()                      # rows per group: n 3, s 3

# THE KEY BECOMES THE INDEX:
g["amount"].sum()
# region
# n    33
# s    60
# Name: amount, dtype: int64        <- a SERIES, indexed by region

g[["amount", "units"]].sum()        # a DataFrame, indexed by region

# TWO KEYS -> A MultiIndex:
sales.groupby(["region", "product"])["amount"].sum()
# region  product
# n       x          21
#         y          12
# s       x          20
#         y          40

# GETTING A FLAT FRAME BACK -- two ways, one preferred:
sales.groupby(["region", "product"], as_index=False)["amount"].sum()
#   region product  amount
# 0      n       x      21
# ...
sales.groupby(["region", "product"])["amount"].sum().reset_index()   # same
#
# as_index=False is cleaner when you know you want columns. reset_index
# is what you reach for after the fact. Either is fine; a groupby
# result left with a MultiIndex is what makes the NEXT step awkward.

# SELECTING COLUMNS BEFORE VS AFTER MATTERS FOR SPEED:
sales.groupby("region")["amount"].sum()      # aggregates ONE column
sales.groupby("region").sum()["amount"]      # aggregates ALL, keeps one
#
# On a wide frame the second does every column's work and throws most
# of it away. Select first.

# NON-NUMERIC COLUMNS AND .sum():
# sales.groupby("region").sum()   -> in pandas 2.x, string columns are
# either concatenated or raise, depending on version. numeric_only=True
# makes the intent explicit:
sales.groupby("region").sum(numeric_only=True)

# sort=False KEEPS FIRST-APPEARANCE ORDER, and is faster:
sales.groupby("region", sort=False)["amount"].sum()      # n first, s second
#
# The default sorts the keys. On a high-cardinality key with millions
# of groups that sort is a measurable cost, and if the order does not
# matter, skip it.

# ITERATING GROUPS -- for debugging, not for computation:
for key, frame in sales.groupby("region"):
    print(key, len(frame))
#
# LOOK AT ONE GROUP:
g.get_group("n")
#
# Iterating and calling an aggregation on each frame in Python is the
# slow version of what groupby does in C. Use it to see what a group
# looks like, then write the vectorised form.
`,
      hl: [16, 30, 43, 62],
      caption: "**`groupby(\"region\")[\"amount\"].sum()` aggregates one column; `groupby(\"region\").sum()[\"amount\"]` aggregates every column and discards all but one.** Select before you aggregate."
    },

    { t: "h2", n: "02", text: "What you can group by", id: "keys" },

    { t: "p", text: "**The key does not have to be a column.** It can be an index level, a function of the index, a Series aligned to the frame, a time frequency, or any list of those — which is what lets you group by month, by a derived bucket, or by an external label without adding a column first." },

    { t: "code", lang: "python", title: "keys beyond a column name", code: `
ts = pd.DataFrame({
    "amount": [10, 20, 30, 40, 50, 60],
    "kind": ["a", "b", "a", "b", "a", "b"],
}, index=pd.date_range("2026-01-01", periods=6, freq="20D"))

# BY AN INDEX LEVEL:
ts.groupby(level=0)["amount"].sum()                 # each date (all unique here)

# BY A FUNCTION OF THE INDEX:
ts.groupby(ts.index.month)["amount"].sum()          # month number as key
ts.groupby(ts.index.to_period("M"))["amount"].sum() # Period key: 2026-01, 2026-02...
#
# The function form is the general one: any callable receiving each
# index label and returning a group key.
ts.groupby(lambda d: d.dayofweek < 5)["amount"].sum()    # weekday vs weekend

# BY A TIME FREQUENCY -- pd.Grouper is the groupby form of resample:
ts.groupby(pd.Grouper(freq="MS"))["amount"].sum()   # month start bins
#
# Grouper is what you need when you want to group by time AND by a
# column in one call:
ts.groupby([pd.Grouper(freq="MS"), "kind"])["amount"].sum()
# 2026-01-01  a    40
#             b    20
# 2026-02-01  a    80   ...

# BY AN EXTERNAL SERIES -- aligned on the index, NOT positionally:
labels = pd.Series(["hi", "lo", "hi", "lo", "hi", "lo"], index=ts.index)
ts.groupby(labels)["amount"].sum()
#
# If labels had a different index, it would ALIGN and produce NaN
# groups (see 3.1). This is convenient and a classic silent bug.

# BY A DERIVED BUCKET, without adding a column:
ts.groupby(pd.cut(ts["amount"], [0, 25, 50, 100]))["amount"].count()
# (0, 25]      2
# (25, 50]     3
# (50, 100]    1
#
# pd.cut returns a categorical, and categorical keys bring observed=
# into play (next section).

# BY A DICT MAPPING (index label -> group):
mapping = {d: "early" if i < 3 else "late" for i, d in enumerate(ts.index)}
ts.groupby(mapping)["amount"].sum()

# MIXING KINDS:
ts.groupby([ts.index.month, "kind"])["amount"].sum()
#
# A column name and an array in the same list. pandas resolves strings
# as column names (or index level names) and treats everything else
# as an aligned key.

# THE ALIGNMENT TRAP, spelled out:
bad_labels = pd.Series(["x"] * 6)                   # RangeIndex 0..5
ts.groupby(bad_labels)["amount"].sum()
# Series([], ...) or a NaN group -- the RangeIndex does not match the
# DatetimeIndex, so nothing aligns. NO ERROR.
#
# Pass .values or .to_numpy() to group positionally:
ts.groupby(bad_labels.to_numpy())["amount"].sum()   # x    210
`,
      hl: [10, 18, 27, 60],
      caption: "**Grouping by an external Series aligns on the index, not by position.** A Series with a different index matches nothing and produces an empty or NaN group with no error — pass `.to_numpy()` to group positionally."
    },

    { t: "h2", n: "03", text: "observed and dropna: the row-count arguments", id: "rows" },

    { t: "p", text: "Two defaults decide how many rows a groupby returns, and both have changed or are changing between pandas versions. **`dropna=True` removes rows with a missing key; `observed=False` adds rows for categorical combinations that never occurred.** One silently loses data; the other silently invents rows." },

    { t: "code", lang: "python", title: "the two arguments that change the row count", code: `
orders = pd.DataFrame({
    "region": ["n", "s", None, "n", "s"],
    "tier": pd.Categorical(["gold", "gold", "silver", "silver", "gold"],
                           categories=["gold", "silver", "bronze"]),
    "amount": [100, 200, 50, 75, 125],
})

# dropna=True (the default) DROPS THE NaN-KEY ROW:
orders.groupby("region")["amount"].sum()
# n    175
# s    325
#           <- the 50 with region None is GONE
orders.groupby("region")["amount"].sum().sum()      # 500
orders["amount"].sum()                              # 550
#
# The reconciliation gap is the tell. dropna=False keeps it:
orders.groupby("region", dropna=False)["amount"].sum()
# n      175
# s      325
# NaN     50

# observed=False (pandas < 3.0 default) INVENTS ROWS FOR EMPTY CATEGORIES:
orders.groupby("tier", observed=False)["amount"].sum()
# gold      425
# silver    125
# bronze      0        <- NO ROWS HAVE bronze. The 0 is manufactured.
#
orders.groupby("tier", observed=True)["amount"].sum()
# gold      425
# silver    125

# WITH TWO CATEGORICAL KEYS IT IS A CARTESIAN PRODUCT:
orders["region_cat"] = orders["region"].astype("category")
r = orders.groupby(["region_cat", "tier"], observed=False)["amount"].sum()
len(r)                        # 6 -- every region x every tier
r
# region_cat  tier
# n           gold      100
#             silver     75
#             bronze      0     <- invented
# s           gold      325
#             silver      0     <- invented
#             bronze      0     <- invented
#
# On 100 x 100 categories that is 10,000 rows from a frame that may
# have 50. Memory, time, and a report full of zeros that mean "no
# data" rather than "zero".

# THE DEFAULT IS CHANGING. pandas 2.1+ warns when observed is not
# passed on a categorical key; pandas 3.0 defaults to True. Code that
# relies on either behaviour silently changes on upgrade. PASS IT.

# THE PRACTICAL RULE:
#   observed=True   almost always. "No rows" is not "zero".
#   observed=False  only when you NEED a complete grid -- a report
#                   that must show every product even at zero sales.
#                   Then fill_value / reindex is often clearer anyway.

# RECONCILING IS THE CHECK THAT CATCHES BOTH:
def grouped_sum_checked(df, key, col):
    out = df.groupby(key, dropna=False, observed=True)[col].sum()
    assert np.isclose(out.sum(), df[col].sum()), (
        f"group total {out.sum()} != column total {df[col].sum()}"
    )
    return out
`,
      hl: [9, 20, 31, 55],
      caption: "**`observed=False` on two categorical keys with 100 categories each produces 10,000 rows from a 50-row frame.** The zeros mean \"no data\", not \"zero\", and the default is changing between versions — pass it explicitly."
    },

    { t: "callout", kind: "trap", title: "The two directions a groupby loses honesty", body: [
      { t: "p", text: "**`dropna=True` removes rows** whose key is missing. The group totals no longer sum to the column total, and nothing says so." },
      { t: "p", text: "**`observed=False` adds rows** for category combinations that never occurred, filled with 0 or NaN depending on the aggregation. A report reads \"bronze: 0\" where the truth is \"bronze: no data\"." },
      { t: "p", text: "**Pass both arguments explicitly and reconcile the total.** `groupby(key, dropna=False, observed=True)` followed by an assertion that the group sum equals the column sum catches every silent row-count change in one line." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "The category report with ten thousand rows",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "A daily product report was fine at 200 rows. After the data team converted `store` and `category` to categorical dtypes to save memory, it has 12,000 rows, takes eight times longer, and the totals no longer match finance." },
        { t: "code", lang: "python", numbered: false, title: "product_report.py", code: `
def product_report(sales):
    # sales: store (category, 120 values), category (category, 100 values),
    #        product, amount; some rows have store = NaN from a feed bug
    out = sales.groupby(["store", "category"]).agg(
        revenue=("amount", "sum"),
        orders=("amount", "size"),
    )
    out["avg_order"] = out["revenue"] / out["orders"]
    return out.reset_index()`},
        { t: "p", text: "Explain both symptoms — the row explosion and the total mismatch — and fix the function so it is correct regardless of dtype and pandas version." }
      ],
      requirements: [
        "Explain where 12,000 rows come from and why the dtype change caused it.",
        "Explain why the totals stopped matching, and whether that is the same cause.",
        "Fix both with explicit arguments.",
        "Handle the division for groups that would otherwise be 0/0.",
        "Add a reconciliation check.",
        "Include tests that fail on the original."
      ],
      hint: "120 × 100 = 12,000. And the NaN stores were being dropped before the dtype change too — but the numbers happened to match then. Why?",
      solution: {
        lang: "python",
        title: "product_report_fixed.py",
        code: `import pandas as pd
import numpy as np


# =========================================================================
# SYMPTOM 1: 12,000 ROWS
# =========================================================================
#
# 120 stores x 100 categories = 12,000. With CATEGORICAL keys and the
# pandas 2.x default observed=False, groupby produces one row for
# EVERY combination of categories, whether or not any sale occurred.
#
# Before the dtype change the keys were object columns, and groupby
# on object keys only produces rows for combinations that exist --
# about 200. The dtype change flipped the behaviour without anyone
# touching the groupby line.
#
# Those 11,800 invented rows have revenue 0 and orders 0, and the
# avg_order for each is 0/0 = NaN. The eight-times slowdown is the
# cartesian product being built and then divided.
#
# FIX: observed=True.


# =========================================================================
# SYMPTOM 2: TOTALS NO LONGER MATCH FINANCE
# =========================================================================
#
# This is a DIFFERENT cause and it was there all along.
#
# Rows with store = NaN are dropped by groupby's default dropna=True.
# Their revenue leaves the report. Before the feed bug there were no
# NaN stores, so the totals matched -- not because the code was
# right, but because the data happened not to trigger the defect.
#
# The two symptoms arrived together because the feed bug and the
# dtype change landed in the same week. They are unrelated. The
# hint's "why did the numbers match before" has the answer: no NaNs.
#
# FIX: dropna=False, so NaN-store rows appear as their own group and
# the total reconciles. Then the report SHOWS the feed bug instead of
# hiding it.


def demonstrate():
    rng = np.random.default_rng(0)
    n = 300
    sales = pd.DataFrame({
        "store": pd.Categorical(rng.choice([f"s{i}" for i in range(30)], n),
                                categories=[f"s{i}" for i in range(120)]),
        "category": pd.Categorical(rng.choice([f"c{i}" for i in range(10)], n),
                                   categories=[f"c{i}" for i in range(100)]),
        "amount": rng.uniform(10, 100, n).round(2),
    })
    sales.loc[:4, "store"] = np.nan          # the feed bug

    broken = sales.groupby(["store", "category"], observed=False).agg(
        revenue=("amount", "sum"))
    return len(broken), broken["revenue"].sum(), sales["amount"].sum()
    # (12000, <total minus the 5 NaN rows>, <true total>)


# =========================================================================
# THE FIX
# =========================================================================

def product_report(sales):
    """Per store x category revenue, correct for any key dtype.

    observed=True  only combinations that occur -- "no rows" is not
                   "zero revenue", and it is not a row.
    dropna=False   rows with a missing key are kept as a NaN group,
                   so the total reconciles and the data problem is
                   visible in the output.
    """
    required = {"store", "category", "amount"}
    if missing := required - set(sales.columns):
        raise KeyError(f"missing columns: {sorted(missing)}")

    out = sales.groupby(["store", "category"],
                        observed=True, dropna=False).agg(
        revenue=("amount", "sum"),
        orders=("amount", "size"),
    )

    # size() counts every row, so orders >= 1 for every group that
    # exists. With observed=True there are no 0-row groups, so 0/0
    # cannot happen here -- but a guard costs nothing and protects
    # against someone later switching to count() on a column with NaN.
    out["avg_order"] = out["revenue"] / out["orders"].where(out["orders"] > 0)

    out = out.reset_index()

    # RECONCILE. This one assertion catches both symptoms: invented
    # rows do not change the sum, but dropped rows do -- and the row
    # count check catches the invention.
    total_in = float(sales["amount"].sum())
    total_out = float(out["revenue"].sum())
    if not np.isclose(total_in, total_out):
        raise AssertionError(
            f"report revenue {total_out:.2f} != source {total_in:.2f}"
        )

    n_missing_store = int(out["store"].isna().sum())
    if n_missing_store:
        # Not an error -- the report is correct -- but the caller
        # should know the feed is sending rows with no store.
        out.attrs["warning"] = (
            f"{n_missing_store} group(s) with missing store key; "
            f"revenue {out.loc[out['store'].isna(), 'revenue'].sum():.2f}"
        )

    return out


# =========================================================================
# TESTS
# =========================================================================

def _sales():
    return pd.DataFrame({
        "store": pd.Categorical(["a", "a", "b", None, "b"],
                                categories=["a", "b", "c", "d"]),
        "category": pd.Categorical(["x", "y", "x", "x", "y"],
                                   categories=["x", "y", "z"]),
        "amount": [10.0, 20.0, 30.0, 40.0, 50.0],
    })


def test_only_observed_combinations_appear():
    """The original produced 4 x 3 = 12 rows from 5 sales."""
    out = product_report(_sales())

    assert len(out) == 5          # (a,x) (a,y) (b,x) (b,y) (NaN,x)
    assert (out["orders"] >= 1).all()


def test_the_original_explodes():
    s = _sales()
    broken = s.groupby(["store", "category"], observed=False).agg(
        revenue=("amount", "sum"))

    assert len(broken) == 12
    assert (broken["revenue"] == 0).sum() == 8


def test_revenue_reconciles_including_missing_store():
    s = _sales()
    out = product_report(s)

    assert np.isclose(out["revenue"].sum(), s["amount"].sum())
    assert np.isclose(out["revenue"].sum(), 150.0)


def test_the_original_drops_the_missing_store():
    s = _sales()
    broken = s.groupby(["store", "category"], observed=True).agg(
        revenue=("amount", "sum"))

    assert broken["revenue"].sum() == 110.0       # the 40 is gone


def test_missing_store_is_reported_not_hidden():
    out = product_report(_sales())

    nan_rows = out[out["store"].isna()]
    assert len(nan_rows) == 1
    assert nan_rows["revenue"].iloc[0] == 40.0
    assert "missing store" in out.attrs.get("warning", "")


def test_no_nan_avg_order():
    out = product_report(_sales())

    assert out["avg_order"].notna().all()


def test_works_on_object_keys_too():
    s = _sales()
    s["store"] = s["store"].astype(object)
    s["category"] = s["category"].astype(object)

    out = product_report(s)
    assert len(out) == 5
    assert np.isclose(out["revenue"].sum(), 150.0)


def test_clean_data_has_no_warning():
    s = _sales().dropna(subset=["store"])
    out = product_report(s)

    assert "warning" not in out.attrs`,
        notes: [
          { t: "p", text: "**The two symptoms have two unrelated causes that happened to land in the same week.** The dtype change flipped `observed`'s effect and multiplied the rows; the feed bug introduced NaN keys that `dropna` had always been silently removing — there just had not been any to remove before." },
          { t: "callout", kind: "insight", title: "\"It matched before\" is not evidence the code was right", body: [
            { t: "p", text: "The `dropna=True` defect was present from the first day. The totals reconciled only because no row had a missing store — **the data happened not to exercise the bug.**" },
            { t: "p", text: "That is the general shape of a default-argument defect: correct on the data you tested with, wrong on the data that arrives later, and indistinguishable from a new bug when it finally surfaces." }
          ]},
          { t: "p", text: "**`observed=True` because \"no rows\" is not \"zero revenue\", and it is not a row.** The invented combinations have revenue 0 and orders 0, and their `avg_order` is 0/0 — the eight-times slowdown is the cartesian product being built and then divided." },
          { t: "p", text: "**`dropna=False` makes the feed bug visible in the report.** The NaN-store group appears with its revenue, the total reconciles, and the warning in `attrs` tells the caller something upstream is broken — which is more useful than a report that quietly agrees with itself." },
          { t: "p", text: "**The reconciliation assertion catches both directions.** Invented rows do not change the sum but dropped rows do; the row-count expectation in the test catches the invention. Together they close both ways a groupby can lose honesty." },
          { t: "p", text: "**The function is tested on object keys as well as categorical.** The original broke on a dtype change nobody thought was related; a test on both dtypes is what stops the next one." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`df.groupby(\"region\")[\"amount\"].sum().sum()` is 500 but `df[\"amount\"].sum()` is 550. What happened?",
          options: [
            "Floating-point error",
            "Rows with a missing region were dropped by the default `dropna=True`",
            "The sum was computed on a view",
            "Duplicates were removed"
          ],
          answer: 1,
          why: "The reconciliation gap is the tell. `groupby` excludes NaN keys by default and the 50 of revenue with no region leaves the report silently. `dropna=False` keeps it as a NaN group, and asserting group-total-equals-column-total makes the omission impossible to ship."
        }
      ]
    }
  ],

  takeaways: [
    "**`groupby` is lazy** — it records how to split and computes nothing until an aggregation is called.",
    "**The apply step decides the output shape**: one row per group for an aggregation, one per original row for a transform.",
    "**The group keys become the index by default**; `as_index=False` or `reset_index()` gives a flat frame.",
    "**Select the column before aggregating**, not after — `g.sum()[\"amount\"]` computes every column and discards all but one.",
    "**`sort=False` keeps first-appearance order and skips a sort** that is measurable on high-cardinality keys.",
    "**Keys can be index levels, functions of the index, aligned Series, `pd.Grouper` frequencies, `pd.cut` buckets or dicts** — not just column names.",
    "**An external Series key aligns on the index**, so a mismatched index produces an empty or NaN group with no error.",
    "**`dropna=True` (default) removes rows with a missing key**, and the group totals stop summing to the column total.",
    "**`observed=False` invents rows for categorical combinations that never occurred** — a cartesian product on two keys.",
    "**\"No rows\" is not \"zero\"**; a manufactured 0 in a report is a claim the data does not support.",
    "**The `observed` default is changing between pandas versions** — pass it explicitly or the behaviour changes on upgrade.",
    "**Reconcile the group total to the column total.** One assertion catches every silent row-count change."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A groupby on two categorical keys returns 12,000 rows from a 200-row frame. Why?",
        options: [
          "Duplicate rows in the input",
          "`observed=False` produced a row for every category combination — 120 × 100 — including ones with no data",
          "The keys were not sorted",
          "The index was not reset"
        ],
        answer: 1,
        why: "Categorical keys carry their full category list, and the pandas 2.x default includes every combination whether or not it occurs. The invented rows have sum 0 and count 0, and a mean over them is 0/0. `observed=True` restricts to combinations actually present."
      },
      {
        stem: "Which of these is NOT a valid groupby key?",
        options: [
          "A function applied to each index label",
          "A `pd.Grouper(freq=\"MS\")`",
          "A Series with a different index than the frame — it will align and produce NaN groups rather than raise",
          "A list mixing a column name and an array"
        ],
        answer: 2,
        why: "All four are accepted, which is the point: the third does not raise, it aligns on the index and silently matches nothing. Pass `.to_numpy()` to group positionally when the Series index is not meant to match."
      },
      {
        stem: "Why prefer `df.groupby(\"k\")[\"v\"].sum()` over `df.groupby(\"k\").sum()[\"v\"]`?",
        options: [
          "The first returns a DataFrame",
          "The first aggregates one column; the second aggregates every column and discards all but one",
          "The second raises on string columns",
          "They are identical"
        ],
        answer: 1,
        why: "On a wide frame the second form does all the work for every numeric column and throws the results away. It may also raise or concatenate strings depending on version and `numeric_only`. Select before aggregating."
      },
      {
        stem: "A report matched finance for a year, then stopped after a feed started sending rows with a missing key. Was the code correct before?",
        options: [
          "Yes — the feed broke it",
          "No — `dropna=True` was always dropping missing keys; there had simply been none to drop",
          "Yes — pandas changed the default",
          "It depends on the pandas version"
        ],
        answer: 1,
        why: "A default-argument defect is correct on the data it was tested with and wrong on data that arrives later. The totals matched because the data happened not to exercise the bug. `dropna=False` plus a reconciliation assertion is the fix that would have been right from the start."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain split-apply-combine.",
        strong: "`groupby` partitions the rows by key, applies a function to each partition, and stitches the results back with the keys as the index. The groupby object itself is lazy — it computes nothing until an aggregation is called. The apply step determines the output shape: an aggregation gives one row per group; a transform gives one per original row, aligned to the source index.",
        answer: [
          { t: "p", text: "Naming laziness and the shape distinction takes this beyond the textbook phrase." }
        ]
      },
      {
        level: "advanced",
        q: "What do `observed` and `dropna` do in a groupby, and why do they matter?",
        strong: "They decide the row count in opposite directions. `dropna=True`, the default, removes rows whose key is missing, so group totals stop reconciling to the column total. `observed=False` — the pre-3.0 default for categorical keys — adds a row for every category combination whether or not it occurred, which on two keys is a cartesian product. I pass both explicitly, and I assert that the grouped sum equals the column sum.",
        answer: [
          { t: "p", text: "Framing them as the two directions of dishonesty — losing rows and inventing them — is memorable and correct." },
          { t: "p", text: "Mentioning the version change shows you have been bitten by an upgrade." }
        ]
      },
      {
        level: "advanced",
        q: "A groupby report exploded in size after a colleague converted keys to categorical to save memory. What happened, and was the dtype change wrong?",
        strong: "The dtype change was fine — it did save memory. What changed is that `observed=False` now applied, and the groupby produced every category combination rather than only the ones present. The fix is `observed=True` on the groupby, not reverting the dtype. And I would look for a second problem: in my experience these coincide with a data change, and any totals mismatch has a separate cause — usually NaN keys being dropped.",
        answer: [
          { t: "p", text: "Defending the dtype change and locating the fix precisely is the judgement being tested; suggesting the second, unrelated cause shows real debugging instinct." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 3.1 — Series, DataFrame and the Index
   ========================================================================= */
EC.receiveLesson({
  id: "3.1",

  lede: "**The index is not row numbers — it is a label set, and every pandas operation aligns on it before doing anything else.** Most surprising pandas results are alignment doing exactly what it promised on labels you had not thought about.",

  objectives: [
    "Describe what a Series and a DataFrame actually hold",
    "Explain automatic alignment and predict when it introduces NaN",
    "Decide when an index earns its keep and when it is a liability",
    "Reset, set and rename an index without losing a column",
    "Read a MultiIndex without reaching for documentation"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "What the objects are", id: "objects" },

    { t: "p", text: "A Series is **one array plus one index**. A DataFrame is **a set of Series sharing a single index**, plus a second index for the column names. Almost everything about pandas' behaviour falls out of that structure." },

    { t: "dl", items: [
      ["Series", "A 1-D labelled array — values plus an index. It has a `dtype` and a `name`, and it is what you get from a single DataFrame column."],
      ["DataFrame", "A 2-D labelled table: columns are Series sharing one row index. Columns can have different dtypes; the values in one column cannot."],
      ["Index", "The row labels. Not positions — labels, which may be integers, strings, dates or tuples, and need not be unique or sorted."],
      ["Alignment", "Before combining two objects, pandas matches them on their index labels. Labels present in one and not the other produce `NaN` rather than an error."],
      ["`RangeIndex`", "The default index, `0..n-1`. It looks like positions and behaves like labels, which is the source of considerable confusion."],
      ["MultiIndex", "A hierarchical index where each label is a tuple. Produced by `groupby` on several keys, by `pivot`, and by `stack`."]
    ]},

    { t: "viz",
      title: "A DataFrame is columns sharing one index",
      caption: "The index is a first-class object, not a column and not a position. Two frames combine by matching these labels, not by matching row order.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="A DataFrame drawn as three typed column arrays sharing a single row index">
  <text x="30" y="26" class="s-label" style="fill:var(--acc)">index</text>
  <g stroke-width="1.5">
    <rect x="30" y="38" width="100" height="30" style="fill:var(--acc);fill-opacity:.20;stroke:var(--acc)"/>
    <rect x="30" y="68" width="100" height="30" style="fill:var(--acc);fill-opacity:.20;stroke:var(--acc)"/>
    <rect x="30" y="98" width="100" height="30" style="fill:var(--acc);fill-opacity:.20;stroke:var(--acc)"/>
    <rect x="30" y="128" width="100" height="30" style="fill:var(--acc);fill-opacity:.20;stroke:var(--acc)"/>
  </g>
  <text x="46" y="58" class="s-sub" style="fill:var(--ink-2)">"a"</text>
  <text x="46" y="88" class="s-sub" style="fill:var(--ink-2)">"b"</text>
  <text x="46" y="118" class="s-sub" style="fill:var(--ink-2)">"c"</text>
  <text x="46" y="148" class="s-sub" style="fill:var(--ink-2)">"d"</text>

  <text x="150" y="26" class="s-sub" style="fill:var(--ink-3)">int64</text>
  <text x="290" y="26" class="s-sub" style="fill:var(--ink-3)">float64</text>
  <text x="430" y="26" class="s-sub" style="fill:var(--ink-3)">object</text>
  <g stroke-width="1.5" style="fill:none;stroke:var(--line)">
    <rect x="150" y="38" width="120" height="120"/>
    <rect x="290" y="38" width="120" height="120"/>
    <rect x="430" y="38" width="120" height="120"/>
    <line x1="150" y1="68" x2="270" y2="68"/><line x1="150" y1="98" x2="270" y2="98"/><line x1="150" y1="128" x2="270" y2="128"/>
    <line x1="290" y1="68" x2="410" y2="68"/><line x1="290" y1="98" x2="410" y2="98"/><line x1="290" y1="128" x2="410" y2="128"/>
    <line x1="430" y1="68" x2="550" y2="68"/><line x1="430" y1="98" x2="550" y2="98"/><line x1="430" y1="128" x2="550" y2="128"/>
  </g>
  <text x="150" y="182" class="s-sub" style="fill:var(--ink-3)">one Series</text>
  <text x="290" y="182" class="s-sub" style="fill:var(--ink-3)">one Series</text>
  <text x="430" y="182" class="s-sub" style="fill:var(--ink-3)">one Series</text>

  <line x1="30" y1="200" x2="550" y2="200" style="stroke:var(--acc);stroke-dasharray:4 3"/>
  <text x="30" y="222" class="s-sub" style="fill:var(--acc)">every column shares this one index — that is what makes it a frame</text>

  <text x="600" y="58" class="s-sub" style="fill:var(--ink-3)">Each column is contiguous</text>
  <text x="600" y="80" class="s-sub" style="fill:var(--ink-3)">and separately typed.</text>
  <text x="600" y="112" class="s-sub" style="fill:var(--ink-3)">A ROW is a slice across</text>
  <text x="600" y="134" class="s-sub" style="fill:var(--ink-3)">three arrays — which is</text>
  <text x="600" y="156" class="s-sub" style="fill:var(--ink-3)">why row-wise iteration</text>
  <text x="600" y="178" class="s-sub" style="fill:var(--ink-3)">is so much slower than</text>
  <text x="600" y="200" class="s-sub" style="fill:var(--ink-3)">column-wise work.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "constructing, and what the index does", code: `
import pandas as pd
import numpy as np

s = pd.Series([10, 20, 30], index=["a", "b", "c"], name="sales")
s.values                      # array([10, 20, 30]) -- a NumPy array
s.index                       # Index(['a', 'b', 'c'], dtype='object')
s.dtype                       # int64

df = pd.DataFrame({
    "sales": [10, 20, 30],
    "region": ["north", "south", "north"],
    "margin": [0.21, 0.34, 0.19],
}, index=["a", "b", "c"])

df.dtypes                     # int64 / object / float64 -- per column
df.index                      # the ROW labels
df.columns                    # ALSO an Index object
df.shape                      # (3, 3)

# A COLUMN IS A SERIES, and it carries the frame's index with it:
df["sales"].index             # Index(['a', 'b', 'c'])

# THE DEFAULT RangeIndex LOOKS LIKE POSITIONS AND IS NOT:
d = pd.DataFrame({"x": [1, 2, 3]})
d.index                       # RangeIndex(start=0, stop=3, step=1)

filtered = d[d.x > 1]
filtered.index                # Index([1, 2]) -- LABELS 1 and 2 kept
filtered.iloc[0]              # x=2 -- position 0
try:
    filtered.loc[0]           # KeyError -- label 0 was filtered out
except KeyError as e:
    print("label 0 no longer exists")
#
# THIS IS THE SINGLE MOST COMMON PANDAS CONFUSION. After a filter,
# labels and positions have diverged, and code written against a fresh
# frame breaks in a way that depends on the data.

# THE INDEX NEED NOT BE UNIQUE, and pandas will not stop you:
dup = pd.Series([1, 2, 3], index=["a", "a", "b"])
dup.loc["a"]                  # returns a SERIES of two values
dup.index.is_unique           # False
#
# A non-unique index makes .loc return sometimes a scalar and
# sometimes a Series, depending on the data -- so downstream code
# works until the day a duplicate appears.

# RESETTING AND SETTING:
df.reset_index()              # index becomes a column named 'index'
df.reset_index(drop=True)     # index discarded, fresh RangeIndex
df.set_index("region")        # a column becomes the index (and leaves)
df.set_index("region", drop=False)   # ...and also stays as a column

# rename VS set_axis:
df.rename(index={"a": "A"})              # change specific labels
df.rename(columns={"sales": "revenue"})  # change specific columns
df.set_axis(["x", "y", "z"], axis=0)     # replace the whole index

# THE INDEX HAS A NAME, and it matters after groupby and reset_index:
df.index.name = "store_id"
df.reset_index().columns      # ['store_id', 'sales', ...] -- not 'index'
`,
      hl: [26, 33, 38, 55],
      caption: "**After a filter, labels and positions have diverged.** `filtered.loc[0]` raises while `filtered.iloc[0]` works — and which one your code needs depends on what you meant, not on which reads better."
    },

    { t: "h2", n: "02", text: "Alignment: the behaviour that explains the surprises", id: "alignment" },

    { t: "p", text: "**Every binary operation between two pandas objects aligns on the index first.** Rows present in one and not the other become `NaN`. This is deliberate and usually right — and it is why adding two columns of the same length can produce a column of nothing but `NaN`." },

    { t: "code", lang: "python", title: "alignment, and the failure it causes", code: `
a = pd.Series([1, 2, 3], index=["x", "y", "z"])
b = pd.Series([10, 20, 30], index=["y", "z", "w"])

a + b
# w     NaN
# x     NaN
# y    12.0
# z    23.0
#
# THE UNION OF LABELS, with NaN where either side is missing. Not an
# error, not a length mismatch -- pandas did exactly what it promised.

# TO IGNORE LABELS AND ALIGN BY POSITION, drop to NumPy:
a.values + b.values           # array([11, 22, 33]) -- positional
#
# Correct only if you are SURE the rows correspond. That certainty is
# usually where the bug is.

# THE PRODUCTION SHAPE OF THIS BUG:
sales = pd.DataFrame({"amount": [100, 200, 300]},
                     index=pd.Index([101, 102, 103], name="order_id"))
costs = pd.DataFrame({"cost": [60, 120, 180]},
                     index=pd.Index([1, 2, 3], name="row_num"))

sales["margin"] = sales["amount"] - costs["cost"]
sales["margin"]               # ALL NaN -- no order_id matches a row_num
#
# Same length, same order, completely different labels. The result is
# a column of NaN and no exception anywhere.
sales["margin"].isna().all()  # True

# THE FIX IS TO MAKE THE ALIGNMENT KEY EXPLICIT:
sales = sales.join(costs.set_index(sales.index))     # if truly aligned
# or, properly:
# merge on the real business key rather than trusting row order

# ASSIGNING A SERIES TO A COLUMN ALIGNS TOO:
df = pd.DataFrame({"v": [1, 2, 3]}, index=["a", "b", "c"])
df["w"] = pd.Series([10, 20], index=["a", "c"])
df
#    v     w
# a  1  10.0
# b  2   NaN     <- label 'b' had no value
# c  3  20.0

# ASSIGNING A LIST OR ARRAY DOES NOT ALIGN -- it is positional and
# LENGTH-CHECKED:
df["u"] = [7, 8, 9]           # fine
try:
    df["t"] = [7, 8]          # ValueError: Length of values (2) does
except ValueError:            # not match length of index (3)
    pass
#
# SO: a Series assignment can silently produce NaN; a list assignment
# raises. The stricter behaviour comes from the less informative type.

# CHECK ALIGNMENT DELIBERATELY when you depend on it:
a.index.equals(b.index)                       # False
a.index.difference(b.index)                   # Index(['x'])
len(a.index.intersection(b.index))            # 2

def assert_aligned(left, right, name=""):
    if not left.index.equals(right.index):
        missing = len(left.index.difference(right.index))
        extra = len(right.index.difference(left.index))
        raise ValueError(
            f"{name}: indexes differ - {missing} only in left, "
            f"{extra} only in right"
        )
`,
      hl: [12, 26, 45, 61],
      caption: "**Assigning a Series aligns and can silently produce `NaN`; assigning a list is positional and raises on a length mismatch.** The stricter behaviour comes from the less informative type."
    },

    { t: "callout", kind: "trap", title: "Two frames of the same length, all NaN", body: [
      { t: "p", text: "`sales[\"amount\"] - costs[\"cost\"]` where one index is order IDs and the other is row numbers produces a column of `NaN` from top to bottom. Same length, same order, no overlapping labels, no exception." },
      { t: "p", text: "**The tell is a suspiciously round `isna()` count** — usually 100%, sometimes exactly the number of rows one side lacks. Any derived column that comes back entirely missing is alignment until proven otherwise." },
      { t: "p", text: "**Reach for `.merge()` on the real business key** rather than relying on two frames happening to be in the same order. `reset_index(drop=True)` on both is the quick fix and it is a promise you cannot check." }
    ]},

    { t: "h2", n: "03", text: "When an index earns its keep", id: "when" },

    { t: "p", text: "A meaningful index makes lookups fast and joins automatic. **It also makes half of pandas behave differently, and turns a routine operation into a two-step one.** Setting one is a decision with costs on both sides." },

    { t: "table",
      head: ["Set a meaningful index when", "Keep the default RangeIndex when"],
      rows: [
        ["You look rows up by that key repeatedly — a sorted index gives O(log n) lookup", "The data is a flat record set you scan and filter"],
        ["You join frames on it often — `.join` uses the index by default", "You join on several different keys at different times"],
        ["It is a time index — resampling and time slicing require one", "Nothing is a natural unique key"],
        ["You want `.loc` slicing by label range", "Multiple people will use the frame and expect a plain table"],
        ["You are producing a pivot or grouped result", "You are about to write it out — most formats ignore the index"]
      ],
      caption: "**`to_csv` writes the index by default and `read_csv` does not read it back as one.** Round-tripping a frame with an index therefore adds a stray `Unnamed: 0` column unless you pass `index=False`."
    },

    { t: "code", lang: "python", title: "what an index buys, measured", code: `
rng = np.random.default_rng(0)
n = 1_000_000
df = pd.DataFrame({
    "user_id": rng.integers(0, n, n),
    "value": rng.normal(size=n),
})

# LOOKUP BY COLUMN VALUE -- a full scan, every time:
# %timeit df[df.user_id == 500_000]           -> ~4 ms

indexed = df.set_index("user_id").sort_index()
# %timeit indexed.loc[500_000]                -> ~30 us, 130x faster
#
# THE SORT IS WHAT MAKES IT FAST. An unsorted index still scans:
unsorted = df.set_index("user_id")
unsorted.index.is_monotonic_increasing        # False
# %timeit unsorted.loc[500_000]               -> ~4 ms, no better

# SORTEDNESS IS ALSO REQUIRED FOR SLICING A MultiIndex:
mi = df.set_index(["user_id"])
# .loc slicing on an unsorted MultiIndex raises UnsortedIndexError
# for anything but an exact key -- sort_index() is not optional there.

# THE COSTS, which are real:
#
# 1. THE INDEX IS NOT A COLUMN. Every groupby, merge or export that
#    needs it as data requires reset_index() first -- and forgetting
#    is how a key silently disappears from an output file.
indexed.groupby("user_id")          # KeyError -- it is not a column
indexed.groupby(level=0)            # this is the form you need
indexed.groupby(indexed.index)      # or this

# 2. to_csv WRITES IT, read_csv DOES NOT READ IT BACK:
# indexed.to_csv("out.csv")               # index written as column 0
# pd.read_csv("out.csv").columns          # ['user_id', 'value'] -- ok
# df.to_csv("out.csv")                    # RangeIndex written too
# pd.read_csv("out.csv").columns          # ['Unnamed: 0', ...] -- junk
#
# Pass index=False unless the index is meaningful. This is the single
# most common cause of a stray Unnamed: 0 column.

# 3. DUPLICATE LABELS CHANGE .loc's RETURN TYPE:
d = pd.DataFrame({"v": [1, 2, 3]}, index=["a", "a", "b"])
type(d.loc["a"])              # DataFrame -- two rows
type(d.loc["b"])              # Series -- one row
#
# Code that does d.loc[k]["v"] works for "b" and breaks for "a". Check
# uniqueness when you set an index you intend to look up:
assert d.index.is_unique, "index must be unique for reliable .loc"

# 4. MEMORY: an index of strings costs the same as a string column.
#    Setting an index does not save space; it buys lookup speed.
`,
      hl: [16, 30, 41, 47],
      caption: "**An unsorted index gives you no lookup speed at all.** `set_index` alone is not the optimisation — `set_index(...).sort_index()` is."
    },

    { t: "h2", n: "04", text: "MultiIndex", id: "multiindex" },

    { t: "p", text: "**A MultiIndex is an index whose labels are tuples**, with each position called a level. You will meet one whether you want to or not: any `groupby` on more than one column returns one." },

    { t: "code", lang: "python", title: "reading and flattening a MultiIndex", code: `
sales = pd.DataFrame({
    "region": ["north", "north", "south", "south", "north"],
    "quarter": ["Q1", "Q2", "Q1", "Q2", "Q1"],
    "amount": [100, 150, 200, 250, 120],
})

g = sales.groupby(["region", "quarter"])["amount"].sum()
g
# region  quarter
# north   Q1         220
#         Q2         150
# south   Q1         200
#         Q2         250
#
# THE BLANK "north" ON THE SECOND ROW IS DISPLAY ONLY. The label is
# there; pandas suppresses the repeat for readability, which
# consistently misleads people into thinking it is missing.
g.index[1]                    # ('north', 'Q2') -- both levels present

g.index.names                 # FrozenList(['region', 'quarter'])
g.index.nlevels               # 2
g.index.get_level_values(0)   # Index(['north','north','south','south'])

# SELECTING:
g.loc["north"]                # all quarters for north -- level 0 dropped
g.loc[("north", "Q1")]        # 220 -- a single value, note the TUPLE
g.loc[:, "Q1"]                # all regions, Q1 -- needs a sorted index
g.xs("Q1", level="quarter")   # the readable form of the line above

# SORT BEFORE SLICING. This is not advice, it is a requirement:
g = g.sort_index()
# Without it, g.loc[:, "Q1"] raises UnsortedIndexError.

# GOING BACK TO FLAT -- usually what you want before anything else:
g.reset_index()               # region, quarter, amount as columns
#
# OR ask groupby not to make one in the first place:
sales.groupby(["region", "quarter"], as_index=False)["amount"].sum()

# MULTIINDEX ON COLUMNS, which pivot and agg both produce:
p = sales.pivot_table(index="region", columns="quarter",
                      values="amount", aggfunc=["sum", "mean"])
p.columns                     # MultiIndex: ('sum','Q1'), ('mean','Q1')...
p["sum"]["Q1"]                # drill down one level at a time
p[("sum", "Q1")]              # or address the tuple directly

# FLATTENING COLUMN LEVELS -- do this before exporting anything:
p.columns = ["_".join(map(str, c)).strip("_") for c in p.columns]
p.columns                     # ['sum_Q1', 'sum_Q2', 'mean_Q1', ...]
#
# to_csv on a column MultiIndex writes TWO header rows, which nothing
# downstream reads correctly. Flatten first, always.

# swaplevel AND sort_index(level=) FOR REORDERING:
g.swaplevel().sort_index()    # quarter outer, region inner
`,
      hl: [16, 29, 33, 50],
      caption: "**The blank repeated label is display only.** pandas suppresses repeats for readability, and `g.index[1]` shows both levels are present — this misleads almost everyone once."
    },

    { t: "code", lang: "python", title: "Slicing an inner level with IndexSlice, and the index types .loc consults",
      code: `sales = pd.DataFrame({"region": np.repeat(["north", "south", "west"], 4),
                      "month":  np.tile(["2025-01", "2025-02", "2025-03", "2025-04"], 3),
                      "amount": np.arange(12) * 10})
wide = sales.set_index(["region", "month"]).sort_index()      # lexsorted levels are what slicing requires
idx = pd.IndexSlice
print(wide.loc[idx["north":"south", "2025-02":"2025-03"], :])   # a range on both levels at once
print(wide.loc[idx[:, "2025-03"], "amount"].tolist())          # every region, one month: [20, 60, 100]

# an index is typed, and the type decides what .loc understands
pd.RangeIndex(0, 5)                          # the default: start, stop, step -- no array stored
pd.DatetimeIndex(["2025-01-01"])             # partial-string slicing, resample, timezones (4.4)
pd.CategoricalIndex(["a", "b"])              # fixed categories; reindex and groupby respect their order
pd.IntervalIndex.from_breaks([0, 10, 20])    # what pd.cut produces; .loc[5] finds the bin containing 5
pd.MultiIndex.from_product([["north", "south"], [1, 2]])`,
      caption: "`IndexSlice` is the only way to write a slice on an inner level inside `.loc`. The list underneath is why `.loc` behaves differently on different frames — it asks the index type how to read the label."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "The join that lost 40% of the rows",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "A daily report combines order data with customer attributes. It has always looked right, but a colleague notices the row count dropped after a recent change and nobody can say when." },
        { t: "code", lang: "python", numbered: false, title: "report.py", code: `
import pandas as pd

def build_report(orders_path, customers_path):
    orders = pd.read_csv(orders_path)
    customers = pd.read_csv(customers_path, index_col=0)

    orders = orders[orders["status"] == "complete"]

    orders["tier"] = customers["tier"]
    orders["credit_limit"] = customers["credit_limit"]

    orders["over_limit"] = orders["amount"] > orders["credit_limit"]

    return orders.groupby("tier")["amount"].agg(["sum", "count"])`},
        { t: "p", text: "Find every defect. Explain what each produces — silently or otherwise — and rewrite it so a mismatch is impossible to ignore." }
      ],
      requirements: [
        "Name each defect and the mechanism behind it.",
        "Explain why the row count fell and why nobody noticed for so long.",
        "Explain what `over_limit` actually computes.",
        "Rewrite with an explicit join and validation.",
        "Report match statistics as output, not as a comment.",
        "Include tests."
      ],
      hint: "What is the index of `orders` after the filter? And what does `customers` use for its index?",
      solution: {
        lang: "python",
        title: "report_fixed.py",
        code: `import pandas as pd
import numpy as np


# =========================================================================
# THE DEFECTS -- five of them
# =========================================================================
#
# 1. ASSIGNING A SERIES ALIGNS ON THE INDEX.
#    orders has a RangeIndex from read_csv. customers is indexed by
#    customer_id (index_col=0). Assigning customers["tier"] to orders
#    matches RANGE POSITIONS against CUSTOMER IDS.
#
#    Where a customer_id happens to be a small integer that exists as
#    a row position in orders, a value lands -- and it is the WRONG
#    customer's tier. Everywhere else it is NaN.
#
#    THIS IS THE WORST CASE: not all-NaN, which someone would notice,
#    but a partial, plausible-looking mixture.
#
# 2. THE FILTER MADE IT WORSE, AND EXPLAINS THE ROW-COUNT DROP.
#    orders[orders.status == "complete"] KEEPS the original labels, so
#    after filtering the labels are a sparse subset like [0, 3, 7, 11].
#    Fewer labels overlap with customer_ids, so fewer values match --
#    and the number that match depends on which orders were complete
#    that day. The report's coverage varies with the data.
#
# 3. groupby("tier") SILENTLY DROPS NaN GROUPS.
#    By default groupby excludes NaN keys. Every row whose tier failed
#    to align vanishes from the output entirely. That is the 40%.
#
#    No warning. The report's totals are simply lower, and the row
#    count is the only visible symptom.
#
# 4. over_limit COMPARES AGAINST NaN.
#    NaN > x is False for every x, so any row with an unmatched
#    credit_limit is reported as NOT over limit. The check fails
#    exactly where the data is missing -- silently, in the permissive
#    direction, which is the dangerous one for a credit control.
#
# 5. SettingWithCopyWarning territory.
#    orders is a filtered slice, so orders["tier"] = ... may warn and,
#    depending on version, may not write. The filter should end in a
#    .copy() if the frame is going to be modified.


def demonstrate():
    orders = pd.DataFrame({
        "order_id": [1, 2, 3, 4, 5, 6],
        "customer_id": [101, 102, 101, 103, 102, 104],
        "amount": [50.0, 200.0, 75.0, 500.0, 120.0, 90.0],
        "status": ["complete", "complete", "cancelled",
                   "complete", "complete", "complete"],
    })
    customers = pd.DataFrame({
        "tier": ["gold", "silver", "bronze", "gold"],
        "credit_limit": [1000.0, 300.0, 100.0, 250.0],
    }, index=pd.Index([101, 102, 103, 104], name="customer_id"))

    broken = orders[orders.status == "complete"].copy()
    broken["tier"] = customers["tier"]                  # ALIGNS ON INDEX

    broken[["order_id", "customer_id", "tier"]]
    # order_id 1 -> label 0 -> no customer 0  -> NaN
    # order_id 2 -> label 1 -> no customer 1  -> NaN
    # ... every value NaN here, because no customer_id is below 5.
    #
    # With real customer ids starting at 1, SOME would match -- and
    # match the wrong customer. That is the version that ships.
    return broken


# =========================================================================
# THE REWRITE
# =========================================================================

def build_report(orders, customers, *, min_match_rate=0.99):
    """Join orders to customers explicitly, and refuse to be quiet.

    customers is expected indexed by customer_id or to carry it as a
    column; either is accepted, neither is assumed.
    """
    orders = orders.copy()

    # NORMALISE THE JOIN KEY on both sides rather than relying on
    # whichever shape read_csv happened to produce.
    if customers.index.name == "customer_id":
        customers = customers.reset_index()
    for frame, name in ((orders, "orders"), (customers, "customers")):
        if "customer_id" not in frame.columns:
            raise KeyError(f"{name} has no customer_id column")

    # THE KEY MUST BE UNIQUE ON THE RIGHT, or the join multiplies rows.
    dupes = customers["customer_id"].duplicated().sum()
    if dupes:
        raise ValueError(f"customers has {dupes} duplicate customer_id")

    orders = orders[orders["status"] == "complete"].copy()
    n_orders = len(orders)

    # EXPLICIT LEFT JOIN ON A NAMED KEY. validate= makes pandas check
    # the cardinality it claims, so a many-to-many surprise raises
    # rather than silently multiplying the row count.
    merged = orders.merge(
        customers[["customer_id", "tier", "credit_limit"]],
        on="customer_id",
        how="left",
        validate="many_to_one",
        indicator=True,
    )

    assert len(merged) == n_orders, "left join changed the row count"

    matched = (merged["_merge"] == "both").sum()
    match_rate = matched / n_orders if n_orders else 1.0

    unmatched_ids = sorted(
        merged.loc[merged["_merge"] == "left_only", "customer_id"].unique()
    )

    if match_rate < min_match_rate:
        raise ValueError(
            f"only {match_rate:.1%} of orders matched a customer "
            f"({n_orders - matched} unmatched, ids e.g. {unmatched_ids[:5]})"
        )

    merged = merged.drop(columns="_merge")

    # over_limit MUST NOT SILENTLY PASS ON MISSING DATA. A row with no
    # credit limit is UNKNOWN, not "within limit".
    merged["over_limit"] = np.where(
        merged["credit_limit"].isna(), np.nan,
        merged["amount"] > merged["credit_limit"],
    )

    # dropna=False KEEPS the unmatched rows visible as a NaN group,
    # so a coverage problem appears in the report instead of shrinking it.
    summary = (
        merged.groupby("tier", dropna=False)["amount"]
        .agg(["sum", "count"])
        .rename_axis("tier")
    )

    report = {
        "orders_in": n_orders,
        "matched": int(matched),
        "match_rate": round(float(match_rate), 4),
        "unmatched_customer_ids": unmatched_ids[:20],
        "rows_in_summary": int(summary["count"].sum()),
        "over_limit_unknown": int(merged["over_limit"].isna().sum()),
    }

    # THE RECONCILIATION THAT WOULD HAVE CAUGHT THE ORIGINAL BUG:
    assert report["rows_in_summary"] == n_orders, (
        f"summary covers {report['rows_in_summary']} of {n_orders} orders"
    )

    return summary, report


# =========================================================================
# TESTS
# =========================================================================

def _fixtures():
    orders = pd.DataFrame({
        "order_id": [1, 2, 3, 4, 5],
        "customer_id": [101, 102, 101, 103, 102],
        "amount": [50.0, 200.0, 75.0, 500.0, 120.0],
        "status": ["complete"] * 4 + ["cancelled"],
    })
    customers = pd.DataFrame({
        "customer_id": [101, 102, 103],
        "tier": ["gold", "silver", "bronze"],
        "credit_limit": [1000.0, 300.0, 100.0],
    })
    return orders, customers


def test_every_order_appears_in_the_summary():
    orders, customers = _fixtures()
    summary, rep = build_report(orders, customers)

    assert rep["rows_in_summary"] == rep["orders_in"] == 4
    assert rep["match_rate"] == 1.0


def test_unmatched_customer_raises_rather_than_shrinking():
    orders, customers = _fixtures()
    orders.loc[0, "customer_id"] = 999

    try:
        build_report(orders, customers)
        assert False, "should have raised"
    except ValueError as e:
        assert "matched" in str(e) and "999" in str(e)


def test_unmatched_is_reported_when_threshold_allows():
    orders, customers = _fixtures()
    orders.loc[0, "customer_id"] = 999

    summary, rep = build_report(orders, customers, min_match_rate=0.0)

    assert rep["matched"] == 3
    assert rep["rows_in_summary"] == 4          # the NaN group is kept
    assert 999 in rep["unmatched_customer_ids"]


def test_over_limit_is_unknown_not_false_when_data_is_missing():
    """The original reported missing credit limits as 'within limit'."""
    orders, customers = _fixtures()
    orders.loc[0, "customer_id"] = 999

    _, rep = build_report(orders, customers, min_match_rate=0.0)
    assert rep["over_limit_unknown"] == 1


def test_duplicate_customer_ids_are_rejected():
    orders, customers = _fixtures()
    customers = pd.concat([customers, customers.iloc[[0]]])

    try:
        build_report(orders, customers)
        assert False, "should have raised"
    except ValueError as e:
        assert "duplicate" in str(e)


def test_indexed_customers_are_accepted():
    orders, customers = _fixtures()
    indexed = customers.set_index("customer_id")

    summary, rep = build_report(orders, indexed)
    assert rep["match_rate"] == 1.0


def test_input_is_not_modified():
    orders, customers = _fixtures()
    before = orders.copy()

    build_report(orders, customers)
    pd.testing.assert_frame_equal(orders, before)


def test_the_original_alignment_bug():
    """Assigning a Series aligns on index, not on position."""
    orders, customers = _fixtures()
    indexed = customers.set_index("customer_id")

    broken = orders[orders.status == "complete"].copy()
    broken["tier"] = indexed["tier"]

    assert broken["tier"].isna().all()          # no label overlaps`,
        notes: [
          { t: "p", text: "**Assigning a Series aligns on the index, not on position.** `orders` has a RangeIndex and `customers` is indexed by customer ID, so the assignment matches row positions against customer IDs — landing the wrong customer's tier wherever an ID happens to coincide with a position." },
          { t: "callout", kind: "trap", title: "A partial match is worse than none", body: [
            { t: "p", text: "If every value came back `NaN`, someone would have investigated on day one. **A partial, plausible-looking mixture is what survives**, because the report still renders and the numbers still look like numbers." },
            { t: "p", text: "The filter made it data-dependent: `orders[...]` keeps its original labels, so the surviving label set — and therefore the match count — changes with whichever orders completed that day." }
          ]},
          { t: "p", text: "**`groupby` drops NaN keys by default, which is where the 40% went.** Every row whose tier failed to align disappears from the output with no warning, and the shrinking row count is the only visible symptom. `dropna=False` keeps the coverage problem in the report instead of hiding it." },
          { t: "p", text: "**`over_limit` failed in the permissive direction.** `NaN > x` is `False`, so rows with no credit limit were reported as within limit — the check silently passed exactly where the data was missing, which for a credit control is the wrong way round." },
          { t: "p", text: "**`validate=\"many_to_one\"` makes pandas check the cardinality you are claiming.** A duplicate on the right side would otherwise multiply the row count, which is the other direction this same join fails in." },
          { t: "p", text: "**The reconciliation assertion is the durable fix.** Asserting that the summary covers every input row catches this bug and every future variant of it, without anyone needing to suspect alignment first." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`df = df[df.x > 5]` then `df.loc[0]` raises KeyError. Why?",
          options: [
            "The frame is empty",
            "Filtering keeps the original labels, and label 0 was filtered out — `.iloc[0]` would give the first remaining row",
            "`.loc` requires a sorted index",
            "The index became a MultiIndex"
          ],
          answer: 1,
          why: "A filter preserves labels rather than renumbering them, so after it the index might be `[3, 7, 11]`. `.loc` addresses labels and `.iloc` addresses positions — which one you need depends on what you meant, and the default RangeIndex hides the distinction until the first filter."
        }
      ]
    }
  ],

  takeaways: [
    "**A Series is one array plus an index; a DataFrame is Series sharing one index** — nearly all pandas behaviour follows from that.",
    "**The index holds labels, not positions.** The default `RangeIndex` looks like positions, which is why the distinction only surfaces after the first filter.",
    "**Every binary operation aligns on the index first**, producing `NaN` for labels present on only one side — no error, no length check.",
    "**Assigning a Series aligns; assigning a list is positional and length-checked.** The stricter behaviour comes from the less informative type.",
    "**Two frames of the same length with different labels give an all-`NaN` result** — any fully-missing derived column is alignment until proven otherwise.",
    "**`set_index` alone buys no lookup speed** — `set_index(...).sort_index()` does.",
    "**An index is not a column**: `groupby` needs `level=0`, and export needs `reset_index()`.",
    "**`to_csv` writes the index and `read_csv` does not read it back** — pass `index=False` or inherit an `Unnamed: 0` column.",
    "**A duplicate label makes `.loc` return a Series sometimes and a DataFrame other times**, depending on the data.",
    "**A MultiIndex's repeated labels are blanked for display only** — both levels are present in every tuple.",
    "**Sort before slicing a MultiIndex**; anything but an exact key raises `UnsortedIndexError` otherwise.",
    "**`groupby` drops `NaN` keys by default**, so rows that failed to join vanish from the output rather than appearing as a problem."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`a + b` on two Series of length 3 returns four rows, two of them NaN. What happened?",
        options: [
          "A bug in pandas",
          "Alignment — the result is the union of the two label sets, with NaN where either side lacks a label",
          "The dtypes differed",
          "One Series had duplicates"
        ],
        answer: 1,
        why: "pandas matches on index labels before combining, so partially overlapping indexes produce their union. This is deliberate and usually right — but it means a length check never fires, and a derived column can come back entirely missing without an exception."
      },
      {
        stem: "`orders[\"tier\"] = customers[\"tier\"]` where orders has a RangeIndex and customers is indexed by customer_id. What is the result?",
        options: [
          "The tiers are copied in row order",
          "Row positions are matched against customer IDs, so most values are NaN and any that land belong to the wrong customer",
          "A ValueError for mismatched length",
          "The customers index is adopted by orders"
        ],
        answer: 1,
        why: "Series assignment aligns on labels. Wherever a customer ID coincides numerically with a row position, a value lands and it is the wrong one — a partial, plausible mixture that survives review far longer than an all-NaN column would."
      },
      {
        stem: "You `set_index(\"user_id\")` on a million-row frame and `.loc` lookups are no faster. Why?",
        options: [
          "The frame is too large",
          "The index is not sorted — without `sort_index()` a lookup still scans",
          "`.loc` never uses the index",
          "user_id has duplicates"
        ],
        answer: 1,
        why: "The speedup comes from a binary search over a monotonic index. Check `index.is_monotonic_increasing`; unsorted, `.loc` falls back to a scan and you have paid the cost of an index for none of the benefit. A MultiIndex additionally raises on slicing when unsorted."
      },
      {
        stem: "After a merge, `groupby(\"tier\")` returns fewer total rows than went in. What is the most likely cause?",
        options: [
          "The aggregation dropped duplicates",
          "Rows whose tier is NaN were dropped, because groupby excludes NaN keys by default",
          "The merge was an inner join",
          "groupby sorts and truncates"
        ],
        answer: 1,
        why: "Unmatched rows carry a NaN key and silently leave the output. `dropna=False` keeps them as an explicit NaN group, which turns a shrinking report into a visible coverage problem — and asserting that the summary's count equals the input row count catches it every time."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the pandas index, and why does it matter?",
        strong: "It is the row labels — a first-class object, not positions and not a column. It matters because every binary operation aligns on it before doing anything, so combining two objects matches labels rather than row order. That is why adding two same-length columns can give you nothing but NaN.",
        answer: [
          { t: "p", text: "Leading with alignment rather than with lookup speed is the right emphasis — it is the behaviour that actually produces bugs." },
          { t: "p", text: "The default RangeIndex looking like positions, and the divergence appearing after the first filter, is the concrete example that lands." }
        ]
      },
      {
        level: "advanced",
        q: "When would you set a meaningful index, and when would you not?",
        strong: "Set one when you look rows up by that key repeatedly, join on it often, or need time-based resampling — and sort it, because an unsorted index gives no lookup speed. Avoid it for flat record sets you scan, for data joined on different keys at different times, and for anything about to be exported, since most formats do not round-trip an index.",
        answer: [
          { t: "p", text: "Naming the sort requirement separates people who have measured this from people who have read that indexes are fast." },
          { t: "p", text: "The cost side — `groupby` needing `level=0`, `to_csv` producing `Unnamed: 0` — shows you have lived with the decision rather than just made it." }
        ]
      },
      {
        level: "advanced",
        q: "A report's row count dropped and nobody knows why. How would you investigate?",
        strong: "Check whether a join key failed to match and the rows are being dropped by a `groupby` with NaN keys. I would re-run the merge with `indicator=True` to count `left_only` rows, use `validate=` to confirm the cardinality, and add an assertion that the summary's row count equals the input's — so the next occurrence fails loudly instead of shrinking quietly.",
        answer: [
          { t: "p", text: "Reaching for `indicator=True` and `validate=` shows familiarity with the tools pandas already provides for this." },
          { t: "p", text: "The reconciliation assertion is the answer that generalises: it catches the whole class rather than this instance." }
        ]
      }
    ]
  }
});

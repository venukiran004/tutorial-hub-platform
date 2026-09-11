/* ============================================================================
   LESSON 4.6 — Method Chaining and Readable Pipelines
   ========================================================================= */
EC.receiveLesson({
  id: "4.6",

  lede: "**A transformation you can read top to bottom is one you can review, test and debug.** Method chaining with `assign`, `pipe` and `query` turns eleven intermediate frames into one expression — and the same discipline that makes it readable is what stops chained-indexing bugs and mutation-at-a-distance from ever appearing.",

  objectives: [
    "Write a multi-step transformation as a single readable chain",
    "Use `assign` with callables so each step sees the current frame",
    "Use `pipe` to fold custom functions into a chain",
    "Know when `query` and `eval` help and when they hurt",
    "Debug a chain without dismantling it"
  ],

  prerequisites: ["3.2", "4.2"],

  blocks: [

    { t: "h2", n: "01", text: "Why chain", id: "why" },

    { t: "p", text: "The alternative to a chain is a sequence of statements, each producing a named intermediate. **Those names are where the bugs hide**: a stale variable reused three steps later, a mutation of one frame that was secretly a view of another, an intermediate that outlives its usefulness and doubles memory." },

    { t: "dl", items: [
      ["Method chain", "A sequence of method calls on the result of the previous one, read top to bottom. No intermediate variables."],
      ["`assign`", "Returns a **new frame** with columns added or replaced. With a callable, the function receives the frame as it is at that point in the chain."],
      ["`pipe`", "Calls `f(df, *args)` and returns the result — folding any function into the chain, including ones that do not return a frame."],
      ["`query`", "Filter rows with a string expression: `.query(\"amount > 100 and region == 'n'\")`. Column names are bare; variables use `@`."],
      ["`eval`", "Compute a column from a string expression. Fast on large frames via numexpr; fragile for anything beyond arithmetic."],
      ["Immutability", "Every chain step returns a new object. Nothing upstream is modified, so the chain cannot have a chained-indexing bug."]
    ]},

    { t: "viz",
      title: "Intermediates against a chain",
      caption: "Left: five named frames, any of which can be reused wrongly or mutated by accident. Right: one expression, each step visible, nothing to misname.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Five sequential statements with named intermediate frames, beside a single method chain with the same steps">
  <text x="30" y="26" class="s-label" style="fill:var(--warn)">statements</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="30" y="56" class="s-sub" style="fill:var(--ink-2)">df1 = pd.read_csv(p)</text>
    <text x="30" y="82" class="s-sub" style="fill:var(--ink-2)">df2 = df1[df1.amt &gt; 0]</text>
    <text x="30" y="108" class="s-sub" style="fill:var(--ink-2)">df2["net"] = df2.amt * 0.8</text>
    <text x="30" y="134" class="s-sub" style="fill:var(--ink-2)">df3 = df2.groupby("k").sum()</text>
    <text x="30" y="160" class="s-sub" style="fill:var(--ink-2)">df4 = df1.merge(df3, on="k")</text>
  </g>
  <rect x="24" y="92" width="290" height="24" rx="3" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit);stroke-width:1.2"/>
  <text x="330" y="108" class="s-sub" style="fill:var(--crit)">← write into a slice: warning or no-op</text>
  <rect x="24" y="144" width="290" height="24" rx="3" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit);stroke-width:1.2"/>
  <text x="330" y="160" class="s-sub" style="fill:var(--crit)">← df1, not df2: the filter is lost</text>
  <text x="30" y="200" class="s-sub" style="fill:var(--ink-3)">four names alive at once; two bugs, both silent</text>

  <text x="480" y="26" class="s-label" style="fill:var(--good)">chain</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="480" y="56" class="s-sub" style="fill:var(--ink-2)">result = (</text>
    <text x="500" y="82" class="s-sub" style="fill:var(--ink-2)">pd.read_csv(p)</text>
    <text x="500" y="108" class="s-sub" style="fill:var(--ink-2)">.query("amt &gt; 0")</text>
    <text x="500" y="134" class="s-sub" style="fill:var(--ink-2)">.assign(net=lambda d: d.amt * 0.8)</text>
    <text x="500" y="160" class="s-sub" style="fill:var(--ink-2)">.groupby("k").sum()</text>
    <text x="480" y="186" class="s-sub" style="fill:var(--ink-2)">)</text>
  </g>
  <text x="480" y="226" class="s-sub" style="fill:var(--good)">no names; each step receives the previous result;</text>
  <text x="480" y="246" class="s-sub" style="fill:var(--good)">the merge on df1 cannot be written because df1 does not exist</text>

  <line x1="30" y1="266" x2="850" y2="266" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="290" class="s-sub" style="fill:var(--ink-3)">The chain is not shorter. It is harder to get wrong, because the mistakes on the left have no syntax on the right.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the same pipeline three ways", code: `
import pandas as pd
import numpy as np

rng = np.random.default_rng(0)
raw = pd.DataFrame({
    "order_id": range(1, 201),
    "region": rng.choice(["n", "s", "e", "w"], 200),
    "amount": rng.lognormal(4, 0.6, 200).round(2),
    "status": rng.choice(["paid", "refunded", "pending"], 200, p=[.8, .1, .1]),
    "ts": pd.date_range("2026-01-01", periods=200, freq="6h"),
})

# VERSION 1: STATEMENTS. Correct here; fragile in general.
df = raw.copy()
df = df[df["status"] == "paid"]
df["net"] = df["amount"] * 0.8             # SettingWithCopyWarning territory
df["month"] = df["ts"].dt.to_period("M")
summary = df.groupby(["region", "month"])["net"].sum().reset_index()
summary = summary[summary["net"] > 500]
#
# Five statements, three of which rebind df. A reviewer has to track
# what df IS at each line. The assignment into a filtered df is the
# chained-indexing pattern from 3.2.

# VERSION 2: THE CHAIN. Same steps, one expression.
summary = (
    raw
    .query("status == 'paid'")
    .assign(
        net=lambda d: d["amount"] * 0.8,
        month=lambda d: d["ts"].dt.to_period("M"),
    )
    .groupby(["region", "month"], as_index=False)["net"].sum()
    .query("net > 500")
)
#
# READ IT TOP TO BOTTOM: filter, derive, group, filter. There is no
# df to track. Nothing is mutated. The parentheses let it span lines
# without backslashes.

# WHY THE LAMBDAS: assign(net=raw["amount"] * 0.8) would compute from
# RAW -- 200 rows -- and then try to align 200 values onto the ~160
# rows that survived the query. With a Series it aligns by index and
# happens to work; with an array it raises. The lambda receives the
# frame AT THAT POINT, so it is always the right length and the right
# rows.

# VERSION 3: THE CHAIN WITH A NAMED STEP. When a step is complex or
# reused, pull it into a function and pipe it.
def add_derived(d, margin=0.8):
    return d.assign(
        net=d["amount"] * margin,               # d IS the current frame
        month=d["ts"].dt.to_period("M"),
    )

def top_groups(d, threshold):
    return d[d["net"] > threshold]

summary = (
    raw
    .query("status == 'paid'")
    .pipe(add_derived, margin=0.8)
    .groupby(["region", "month"], as_index=False)["net"].sum()
    .pipe(top_groups, threshold=500)
)
#
# pipe(f, *args) is f(df, *args). Each function is testable on its
# own, with a clear input and output, and the chain reads as a list
# of named operations.

# assign EVALUATES ALL ITS ARGUMENTS AGAINST THE SAME FRAME:
raw.assign(
    a=lambda d: d["amount"] * 2,
    b=lambda d: d["a"] + 1,             # KeyError: 'a' -- not yet there
)
#
# Since pandas 0.23 assign DOES evaluate in order for callables, so
# this actually works in current versions -- b can see a. But it did
# not always, and the two-call form is unambiguous on every version:
raw.assign(a=lambda d: d["amount"] * 2).assign(b=lambda d: d["a"] + 1)
`,
      hl: [16, 26, 40, 60],
      caption: "**`assign(net=raw[\"amount\"] * 0.8)` computes from the original 200-row frame and aligns onto the filtered one.** The lambda receives the frame at that point in the chain — always the right rows."
    },

    { t: "h2", n: "02", text: "query and eval", id: "query" },

    { t: "p", text: "**`query` makes a filter read like a sentence, and `eval` makes an expression run through numexpr.** Both parse a string, which is why they are slower on small frames, faster on huge ones, and unhelpful the moment the logic needs a function call." },

    { t: "code", lang: "python", title: "when a string beats a mask, and when it does not", code: `
# query READS BETTER for compound conditions:
raw[(raw["amount"] > 100) & (raw["region"].isin(["n", "s"])) & (raw["status"] != "refunded")]
raw.query("amount > 100 and region in ['n', 'south'] and status != 'refunded'")
#
# No parentheses per clause, no & and |, and/or/not/in work as
# words. For three or more conditions this is easier to review.

# VARIABLES WITH @:
threshold = 100
regions = ["n", "s"]
raw.query("amount > @threshold and region in @regions")

# COLUMN NAMES WITH SPACES OR PUNCTUATION -- backticks:
odd = raw.rename(columns={"amount": "order amount"})
odd.query("\`order amount\` > 100")

# METHOD CALLS -- limited, but the common ones work:
raw.query("status.str.startswith('p')")
raw.query("ts.dt.month == 1")
raw.query("amount.isna()")
#
# Anything beyond attribute access and simple methods does not parse.
# When the condition needs a function, use a mask or .loc with a
# callable:
raw.loc[lambda d: some_function(d["amount"])]

# PERFORMANCE: query PARSES A STRING, then evaluates. On a small frame
# the parse dominates and query is SLOWER:
small = raw.head(50)
# %timeit small[small.amount > 100]           -> ~150 us
# %timeit small.query("amount > 100")         -> ~900 us    6x slower
#
# On a large frame, engine="numexpr" (default when installed) avoids
# intermediate boolean arrays and is FASTER:
big = pd.DataFrame({"a": rng.normal(size=5_000_000),
                    "b": rng.normal(size=5_000_000)})
# %timeit big[(big.a > 0) & (big.b < 0)]      -> ~90 ms
# %timeit big.query("a > 0 and b < 0")        -> ~45 ms     2x faster
#
# The mask version allocates two boolean arrays and ANDs them; numexpr
# fuses the whole expression into one pass. Readability is the reason
# to use query; speed is a bonus at scale and a cost below it.

# eval FOR ARITHMETIC ON LARGE FRAMES:
big.eval("c = a * 2 + b ** 2", inplace=False)      # returns a new frame
big.eval("a * 2 + b ** 2")                         # returns a Series
#
# Same numexpr fusion: no temporaries for a*2 and b**2. Worth it above
# ~100k rows; below that, plain arithmetic is clearer and as fast.

# WHAT NEITHER DOES: anything that needs Python. A dictionary lookup,
# a custom function, a regex extract -- these are assign with a lambda,
# not eval.

# THE FAILURE MODE OF STRINGS: they are not checked until run time.
raw.query("amout > 100")          # UndefinedVariableError at runtime
raw[raw["amout"] > 100]           # KeyError at runtime -- the same
#
# Neither is caught earlier. But an editor can complete raw["amount"]
# and cannot complete inside a string, and a rename refactor tool
# will miss the string. That is the real cost.

# query IN A CHAIN -- where it shines:
(raw
 .query("status == 'paid' and amount > @threshold")
 .assign(net=lambda d: d["amount"] * 0.8)
 .query("net > 90")                       # can reference the NEW column
 .groupby("region")["net"].sum())
#
# The second query sees net, because it runs on the assign's output.
# With masks you would need to name the intermediate to reference it.
`,
      hl: [3, 22, 30, 60],
      caption: "**`query` is 6× slower than a mask on 50 rows and 2× faster on 5 million.** Readability is the reason to use it; speed is a bonus at scale and a cost below it."
    },

    { t: "h2", n: "03", text: "Debugging a chain", id: "debug" },

    { t: "p", text: "The objection to chains is that you cannot see the middle. **You can — `pipe` lets you insert a function that inspects and returns the frame unchanged**, and the same trick logs shapes, checks invariants and profiles each step without dismantling anything." },

    { t: "code", lang: "python", title: "seeing inside without taking it apart", code: `
import time

# THE IDENTITY PIPE: look, then pass through.
def peek(d, label=""):
    print(f"{label:>12}  shape={d.shape}  cols={list(d.columns)[:5]}")
    return d

(raw
 .pipe(peek, "raw")
 .query("status == 'paid'")
 .pipe(peek, "paid")
 .assign(net=lambda d: d["amount"] * 0.8)
 .pipe(peek, "net")
 .groupby("region", as_index=False)["net"].sum()
 .pipe(peek, "grouped"))
#          raw  shape=(200, 5)   cols=['order_id','region','amount','status','ts']
#         paid  shape=(158, 5)   ...
#          net  shape=(158, 6)   ...
#      grouped  shape=(4, 2)     ...
#
# The row count at each step is the most useful debugging output
# there is. A step that drops 40% of rows is visible immediately.

# ASSERTING INVARIANTS MID-CHAIN:
def check(d, cond, msg):
    if not cond(d):
        raise AssertionError(f"{msg}: shape={d.shape}")
    return d

(raw
 .query("status == 'paid'")
 .pipe(check, lambda d: len(d) > 0, "no paid orders")
 .assign(net=lambda d: d["amount"] * 0.8)
 .pipe(check, lambda d: (d["net"] >= 0).all(), "negative net")
 .groupby("region")["net"].sum())

# TIMING EACH STEP:
def timed(d, label, _t=[None]):
    now = time.perf_counter()
    if _t[0] is not None:
        print(f"{label:>12}: {(now - _t[0]) * 1000:7.1f} ms")
    _t[0] = now
    return d

# THE DEBUGGER APPROACH: a breakpoint in a lambda.
(raw
 .query("status == 'paid'")
 .pipe(lambda d: (breakpoint(), d)[1])       # drop into pdb with d in scope
 .assign(net=lambda d: d["amount"] * 0.8))
#
# Ugly and effective. Remove before committing.

# CAPTURING AN INTERMEDIATE, when you need to keep it:
captured = {}
def stash(d, name):
    captured[name] = d
    return d

result = (raw
          .query("status == 'paid'")
          .pipe(stash, "paid")
          .groupby("region")["amount"].sum())
captured["paid"].shape             # available after the chain runs

# THE SHAPE OF A GOOD CHAIN:
#   - one operation per line
#   - comments on the lines that make a decision, not every line
#   - a pipe(peek) during development, removed or gated on a flag
#   - no step longer than a screen; extract it into a piped function
#
# WHEN NOT TO CHAIN:
#   - the intermediate IS the point (you need it later, for something
#     unrelated)
#   - two branches share an expensive prefix -- compute it once, name
#     it, chain from there
#   - the step needs try/except around it
#
# A chain is a tool for a linear transformation. Force a branching
# workflow into one and it gets worse, not better.

# THE ANTI-PATTERN: a chain that is really a script.
# (raw.pipe(load).pipe(clean).pipe(enrich).pipe(model).pipe(report))
#
# Each of those is a hundred lines behind a name. The chain has hidden
# the structure rather than exposed it. If the functions are that big,
# they are stages, and stages want to be statements with tests
# between them.
`,
      hl: [4, 23, 40, 68],
      caption: "**The row count at each step is the most useful debugging output there is.** A `pipe(peek)` between every step shows a 40% drop the moment it happens, without dismantling the chain."
    },

    { t: "ladder",
      title: "A feature-building step used in three notebooks",
      rungs: [
        { level: "bad", label: "Copy-pasted statements", code: `df = df[df.status == "paid"]
df["net"] = df.amount * 0.8
df["month"] = df.ts.dt.to_period("M")
df["is_large"] = df.net > 100`,
          note: "**Four lines, pasted into three notebooks, each slightly diverged by now.** The second line warns or silently fails depending on what `df` was. A change to the margin has to be made three times." },
        { level: "ok", label: "One chain, pasted", code: `df = (df.query("status == 'paid'")
        .assign(net=lambda d: d.amount * 0.8,
                month=lambda d: d.ts.dt.to_period("M"),
                is_large=lambda d: d.net > 100))`,
          note: "**No mutation, no warning, reads as a unit.** Still pasted three times; still three places to change the margin; still untested." },
        { level: "best", label: "A piped function with a test", code: `def paid_features(d, margin=0.8, large=100):
    return (d.query("status == 'paid'")
             .assign(net=lambda x: x.amount * margin,
                     month=lambda x: x.ts.dt.to_period("M"),
                     is_large=lambda x: x.net > large))

# in each notebook:
df = raw.pipe(paid_features, margin=0.8)

# in tests:
def test_paid_features_drops_unpaid():
    out = paid_features(fixture)
    assert (out.status == "paid").all()`,
          note: "**One definition, one test, three call sites.** The parameters are named, the function has an input and an output, and `pipe` lets it sit inside any larger chain without breaking the flow." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Refactor",
      title: "The notebook cell nobody can modify",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "This cell computes a weekly summary and has grown by accretion. It works. Nobody will touch it because nobody can say what would break." },
        { t: "code", lang: "python", numbered: false, title: "the cell", code: `
df = pd.read_csv("orders.csv", parse_dates=["ts"])
df2 = df[df["status"] != "cancelled"]
df2["net"] = df2["amount"] - df2["discount"]
df2 = df2[df2["net"] > 0]
df2["week"] = df2["ts"].dt.to_period("W-FRI")
df2["is_new"] = df2["customer_since"] > df2["ts"] - pd.Timedelta(days=90)
g = df2.groupby(["region", "week"])
out = g["net"].sum().reset_index()
out2 = g["is_new"].mean().reset_index()
out = out.merge(out2, on=["region", "week"])
out.columns = ["region", "week", "revenue", "new_share"]
out = out[out["revenue"] > 1000]
big = df[df["amount"] > 500]
out["big_orders"] = big.groupby(["region"])["order_id"].count().reindex(out["region"]).values
out = out.sort_values(["region", "week"])`},
        { t: "p", text: "Rewrite it as a tested, piped pipeline. Identify every defect in the original — there are at least three — and say which ones produce wrong numbers." }
      ],
      requirements: [
        "Identify each defect and its effect.",
        "Rewrite as a chain of small piped functions.",
        "Each function has a test.",
        "Keep the correct behaviour identical; fix the incorrect.",
        "Add a peek/check step that would have caught the worst defect.",
        "No mutation of any input."
      ],
      hint: "The `big_orders` line uses `df`, not `df2`. Then look at what `.reindex(out[\"region\"]).values` does when a region appears in several weeks.",
      solution: {
        lang: "python",
        title: "weekly_summary.py",
        code: `import pandas as pd
import numpy as np


# =========================================================================
# THE DEFECTS
# =========================================================================
#
# 1. df2["net"] = ...  on a filtered frame.
#    Chained-assignment. Warns, and under Copy-on-Write does nothing.
#    On the version where it does nothing, "net" is missing and the
#    next line raises -- so this one at least fails loudly SOMETIMES.
#
# 2. big = df[df["amount"] > 500]  -- df, NOT df2.
#    Cancelled orders are back in. big_orders counts cancellations.
#    WRONG NUMBERS, silently.
#
# 3. .reindex(out["region"]).values
#    big.groupby("region").count() has one row per region. out has
#    one row per (region, week). reindex by region gives every week
#    of a region THE SAME count -- the region's total across ALL
#    weeks, not that week's. And .values assigns positionally, which
#    only works because reindex happened to produce the right order.
#    WRONG NUMBERS: big_orders is not per week at all.
#
# 4. out.columns = [...]  -- renaming by position.
#    Fragile: any change to the merge's column order silently
#    mislabels the columns. Not wrong today; wrong the first time
#    someone reorders.
#
# 5. is_new compares customer_since to ts - 90 days.
#    Correct as written, but the intent ("customer for less than 90
#    days at time of order") is buried in an inequality. A name
#    would help; it is not a defect, it is a readability cost.
#
# Defects 2 and 3 produce wrong numbers. Defect 1 may. Defect 4 will.


# =========================================================================
# THE PIPELINE
# =========================================================================

def load(path):
    return pd.read_csv(path, parse_dates=["ts", "customer_since"])


def valid_orders(d):
    """Not cancelled, and positive net after discount."""
    return (d.query("status != 'cancelled'")
             .assign(net=lambda x: x["amount"] - x["discount"])
             .query("net > 0"))


def add_calendar(d, week="W-FRI"):
    return d.assign(week=lambda x: x["ts"].dt.to_period(week))


def add_customer_flags(d, new_days=90):
    """is_new: customer for fewer than new_days at the time of order."""
    tenure = d["ts"] - d["customer_since"]
    return d.assign(is_new=tenure < pd.Timedelta(days=new_days))


def weekly_regional(d, big_threshold=500):
    """One row per (region, week). big_orders is PER WEEK -- the
    original computed it per region and broadcast the total."""
    return (d.assign(is_big=lambda x: x["amount"] > big_threshold)
             .groupby(["region", "week"], as_index=False)
             .agg(revenue=("net", "sum"),
                  new_share=("is_new", "mean"),
                  big_orders=("is_big", "sum"),
                  orders=("order_id", "size")))


def material(d, min_revenue=1000):
    return d.query("revenue > @min_revenue")


def check(d, cond, msg):
    if not cond(d):
        raise AssertionError(f"{msg} (shape={d.shape})")
    return d


def weekly_summary(orders, *, week="W-FRI", new_days=90,
                   big_threshold=500, min_revenue=1000):
    return (
        orders
        .pipe(valid_orders)
        .pipe(check, lambda x: len(x) > 0, "no valid orders")
        .pipe(add_calendar, week=week)
        .pipe(add_customer_flags, new_days=new_days)
        .pipe(weekly_regional, big_threshold=big_threshold)
        # THE CHECK THAT CATCHES DEFECT 3: big_orders cannot exceed
        # orders in the same row. The original violated this on every
        # region with more than one week.
        .pipe(check, lambda x: (x["big_orders"] <= x["orders"]).all(),
              "big_orders exceeds orders -- per-week invariant broken")
        .pipe(material, min_revenue=min_revenue)
        .sort_values(["region", "week"])
        .reset_index(drop=True)
    )


# =========================================================================
# TESTS -- one per function, plus the invariant
# =========================================================================

def _orders():
    return pd.DataFrame({
        "order_id": range(1, 9),
        "region": ["n", "n", "n", "s", "s", "s", "n", "s"],
        "amount": [600.0, 100.0, 700.0, 50.0, 800.0, 120.0, 900.0, 30.0],
        "discount": [0.0, 0.0, 0.0, 60.0, 0.0, 0.0, 0.0, 0.0],
        "status": ["paid", "paid", "cancelled", "paid", "paid", "paid",
                   "paid", "paid"],
        "ts": pd.to_datetime(["2026-01-05", "2026-01-06", "2026-01-07",
                              "2026-01-05", "2026-01-12", "2026-01-13",
                              "2026-01-14", "2026-01-15"]),
        "customer_since": pd.to_datetime(["2025-01-01", "2026-01-01",
                                          "2025-01-01", "2025-06-01",
                                          "2026-01-10", "2025-01-01",
                                          "2025-01-01", "2025-01-01"]),
    })


def test_valid_orders_drops_cancelled_and_nonpositive():
    out = valid_orders(_orders())

    assert "cancelled" not in out["status"].values
    assert (out["net"] > 0).all()
    assert 4 not in out["order_id"].values          # 50 - 60 < 0


def test_add_customer_flags():
    out = add_customer_flags(_orders(), new_days=90)

    assert out.loc[1, "is_new"]            # since 2026-01-01, order 01-06
    assert not out.loc[0, "is_new"]        # since 2025-01-01


def test_big_orders_is_per_week():
    """The original gave every week of region n the region's total."""
    out = weekly_summary(_orders(), min_revenue=0)
    n = out[out["region"] == "n"].set_index("week")

    # week ending 01-09: orders 1 (600, big), 2 (100)     -> 1 big
    # week ending 01-16: order 7 (900, big)               -> 1 big
    assert n["big_orders"].tolist() == [1, 1]
    assert n["orders"].tolist() == [2, 1]


def test_big_orders_excludes_cancelled():
    """Defect 2: the original counted cancelled order 3 (700)."""
    out = weekly_summary(_orders(), min_revenue=0)
    n = out[out["region"] == "n"]

    assert n["big_orders"].sum() == 2          # not 3


def test_invariant_big_le_orders():
    out = weekly_summary(_orders(), min_revenue=0)
    assert (out["big_orders"] <= out["orders"]).all()


def test_revenue_uses_net():
    out = weekly_summary(_orders(), min_revenue=0)
    s_first = out[(out["region"] == "s")].iloc[0]

    # region s, week ending 01-09: only order 4, and it was dropped
    # (net -10). So s's first week is ending 01-16: 800 + 120 + 30.
    assert s_first["revenue"] == 950.0


def test_material_filter():
    out = weekly_summary(_orders(), min_revenue=1000)
    assert (out["revenue"] > 1000).all()


def test_input_not_modified():
    o = _orders()
    before = o.copy()
    weekly_summary(o)
    pd.testing.assert_frame_equal(o, before)


def test_check_raises_with_context():
    try:
        weekly_summary(_orders().assign(status="cancelled"))
        assert False, "should have raised"
    except AssertionError as e:
        assert "no valid orders" in str(e)


def test_the_original_reindex_broadcasts_region_totals():
    """Demonstrate defect 3 in isolation."""
    d = valid_orders(_orders()).pipe(add_calendar)
    out = d.groupby(["region", "week"], as_index=False)["net"].sum()

    big = d[d["amount"] > 500]
    broadcast = (big.groupby("region")["order_id"].count()
                    .reindex(out["region"]).values)

    n_rows = out["region"] == "n"
    assert len(set(broadcast[n_rows])) == 1     # same value every week
    assert broadcast[n_rows][0] == 2            # the region total`,
        notes: [
          { t: "p", text: "**Two defects produce wrong numbers and neither raises.** `big` is filtered from `df` rather than `df2`, so cancelled orders are counted; and `reindex` by region broadcasts each region's *total* big-order count onto every week's row, so the column is not per week at all." },
          { t: "callout", kind: "insight", title: "The invariant catches what inspection missed", body: [
            { t: "p", text: "`big_orders <= orders` in every row is obviously true for a correct per-week count and false for the broadcast version the moment a region has two weeks. **A `pipe(check, ...)` with that condition would have failed on the first run** — which is what the original never had." },
            { t: "p", text: "Invariants like this cost one line, and they are worth more than a hundred lines of careful reading." }
          ]},
          { t: "p", text: "**The rewrite computes `big_orders` inside the same groupby** as revenue and new-share. There is no second frame, no reindex, and no `.values` — the count is per `(region, week)` because that is what the groupby is keyed on." },
          { t: "p", text: "**Positional column renaming is a defect waiting to happen.** `out.columns = [...]` is right today and silently mislabels everything the first time a merge's column order changes; named aggregation produces the names at the source." },
          { t: "p", text: "**Each piped function is small enough to test on its own**, with an input and an output and no shared state. The chain reads as a list of named steps, and a change to the margin or the threshold is a parameter, not a search-and-replace." },
          { t: "p", text: "**The original's `is_new` was correct and unreadable.** Naming the tenure and comparing it to a duration says what the line means; the test for it is the first time anyone confirmed it." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why use `assign(net=lambda d: d.amount * 0.8)` rather than `assign(net=raw.amount * 0.8)` inside a chain?",
          options: [
            "Lambdas are faster",
            "The lambda receives the frame at that point in the chain — after any filtering — so the values are computed from the right rows",
            "assign requires a callable",
            "It avoids a SettingWithCopyWarning"
          ],
          answer: 1,
          why: "`raw.amount` is the original 200-row column. If a `query` earlier in the chain kept 160 rows, the Series form aligns 200 values onto 160 by index — which works by accident — and an array form raises. The lambda always sees the current frame."
        }
      ]
    }
  ],

  takeaways: [
    "**Named intermediates are where bugs hide**: a stale variable reused later, a mutation of a view, a frame that outlives its purpose.",
    "**A chain is not shorter — it is harder to get wrong**, because those mistakes have no syntax in it.",
    "**`assign` returns a new frame**; with a callable, the function receives the frame as it is at that point in the chain.",
    "**`assign(col=some_series)` computes from wherever that Series came from**, not from the current step — use a lambda.",
    "**`pipe(f, *args)` is `f(df, *args)`** — any function folds into the chain, testable on its own.",
    "**`query` reads better for three or more conditions**; `and`, `or`, `not`, `in` work as words and `@` references variables.",
    "**`query` is slower on small frames and faster on huge ones** — readability is the reason, speed is a side effect.",
    "**`eval` fuses arithmetic through numexpr** with no temporaries; worth it above ~100k rows.",
    "**Strings are not checked until run time and are invisible to refactoring tools** — the real cost of `query`.",
    "**`pipe(peek)` shows the row count at every step** without dismantling the chain — the most useful debugging output there is.",
    "**`pipe(check, cond, msg)` asserts an invariant mid-chain**; one line catches what a hundred lines of reading misses.",
    "**Do not chain a branching workflow, or hide hundred-line stages behind `pipe` names** — a chain is for a linear transformation."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does `.pipe(f, x=1)` do inside a chain?",
        options: [
          "Applies f to each column",
          "Calls `f(current_frame, x=1)` and passes the result to the next step",
          "Runs f in a subprocess",
          "Applies f to each group"
        ],
        answer: 1,
        why: "`pipe` is function application with the frame as the first argument. It folds any function — including ones that inspect and return the frame unchanged — into the chain, which is what makes chains debuggable and their steps individually testable."
      },
      {
        stem: "When is `query` slower than a boolean mask?",
        options: [
          "Always",
          "On small frames, where parsing the string dominates; on millions of rows numexpr fusion makes it faster",
          "When the condition uses `and`",
          "Never"
        ],
        answer: 1,
        why: "`query` parses a string every call — around 6× slower than a mask on 50 rows. At scale the numexpr engine evaluates the whole expression in one pass with no intermediate boolean arrays, and wins. Choose it for readability; the speed follows the frame size."
      },
      {
        stem: "How do you inspect the middle of a chain without breaking it apart?",
        options: [
          "You cannot — that is the cost of chaining",
          "Insert `.pipe(peek)` — a function that prints the shape and returns the frame unchanged",
          "Convert it to statements temporarily",
          "Use `.head()` at the end"
        ],
        answer: 1,
        why: "An identity pipe that logs, asserts, times or drops into a debugger sees the frame at that exact point and passes it on. The row count at each step is the single most useful thing it can print — a step that loses 40% of rows is visible immediately."
      },
      {
        stem: "Which of these should NOT be a chain?",
        options: [
          "Filter, derive two columns, group, filter again",
          "A workflow where two branches share an expensive prefix and each needs it separately",
          "Load, clean, aggregate, sort",
          "Query, assign, pipe a tested function, merge"
        ],
        answer: 1,
        why: "A chain is linear. When two branches need the same intermediate, compute it once, name it, and chain from there — forcing it into one expression recomputes the prefix or contorts the structure. The same applies to steps that need `try/except` or that are genuinely hundred-line stages."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why do experienced pandas users prefer method chains?",
        strong: "Because the bugs in the alternative have no syntax in a chain. Named intermediates get reused stale, mutated when they are secretly a view of something else, or outlive their purpose and double memory. A chain reads top to bottom, mutates nothing, and each step receives exactly the previous result. It is not shorter — it is harder to get wrong.",
        answer: [
          { t: "p", text: "Framing it as eliminating a class of bug rather than as style is what makes the answer substantive." }
        ]
      },
      {
        level: "advanced",
        q: "How do you debug a long chain?",
        strong: "With `pipe`. A function that prints the shape and returns the frame unchanged goes between any two steps and shows the row count at that point — which is usually all you need, since most pipeline bugs are a step that drops or multiplies rows. The same pattern asserts an invariant, times a step, or drops into `pdb` with the frame in scope. Nothing has to be dismantled.",
        answer: [
          { t: "p", text: "The invariant-check use is the one to emphasise: a one-line `pipe(check, ...)` catches wrong numbers that no amount of reading would." }
        ]
      },
      {
        level: "advanced",
        q: "When would you use `query` or `eval` over a mask or plain arithmetic?",
        strong: "`query` for compound filters — three or more conditions read as a sentence instead of a forest of parentheses and ampersands. `eval` for arithmetic on large frames, where numexpr fuses the expression and avoids temporaries. Neither below about 100,000 rows for speed, since parsing the string costs more than it saves there. And neither when the logic needs a Python function, a dictionary lookup or a regex — that is `assign` with a lambda.",
        answer: [
          { t: "p", text: "Naming the crossover — readability always, speed only at scale — and the hard limit on what a string can express is the complete answer." }
        ]
      }
    ]
  }
});

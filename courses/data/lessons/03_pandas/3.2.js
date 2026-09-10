/* ============================================================================
   LESSON 3.2 — Selection: loc, iloc and the Traps
   ========================================================================= */
EC.receiveLesson({
  id: "3.2",

  lede: "**`SettingWithCopyWarning` is not a style complaint — it is pandas telling you it does not know whether your write will land.** Understanding why requires understanding chained indexing, and understanding that makes the rest of pandas selection stop being a matter of trial and error.",

  objectives: [
    "Choose between `.loc`, `.iloc` and `[]` for a given task",
    "Explain why `.loc` slices are inclusive and `.iloc` slices are not",
    "Describe what chained indexing does and why the outcome is unpredictable",
    "Read `SettingWithCopyWarning` as a specific diagnosis rather than noise",
    "Write selection code that is correct regardless of pandas version"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", text: "Three ways to select, and what each means", id: "three" },

    { t: "p", text: "pandas offers `[]`, `.loc` and `.iloc`, and they do overlapping but different things. **`[]` is context-dependent, which is why it reads well and behaves inconsistently.**" },

    { t: "dl", items: [
      ["`.loc[rows, cols]`", "Label-based. Takes index labels, column names, boolean masks, or callables. Slices are **inclusive of the endpoint**."],
      ["`.iloc[rows, cols]`", "Position-based. Takes integers and integer slices only. Slices are **exclusive of the endpoint**, like Python."],
      ["`df[...]`", "Context-dependent: a string selects a **column**, a slice selects **rows**, a boolean mask selects **rows**, a list selects **columns**."],
      ["`.at` / `.iat`", "Single-value access by label and by position. Faster than `.loc` / `.iloc` for one scalar, and useless for anything else."],
      ["Chained indexing", "Two consecutive `[]` operations — `df[\"col\"][3]` or `df[mask][\"col\"]`. Whether the second acts on a view or a copy is not determined by the source you wrote."]
    ]},

    { t: "code", lang: "python", title: "the selectors, side by side", code: `
import pandas as pd
import numpy as np

df = pd.DataFrame({
    "sales": [10, 20, 30, 40],
    "region": ["n", "s", "n", "e"],
    "margin": [0.1, 0.2, 0.3, 0.4],
}, index=["w", "x", "y", "z"])

# [] IS CONTEXT-DEPENDENT -- read it carefully every time:
df["sales"]                   # a COLUMN (Series)
df[["sales", "margin"]]       # COLUMNS (DataFrame)
df["w":"y"]                   # ROWS by label -- inclusive
df[0:2]                       # ROWS by position -- exclusive
df[df.sales > 15]             # ROWS by mask
#
# Five different behaviours from one operator. This is why explicit
# .loc and .iloc are preferred in code that others will read.

# .loc IS LABEL-BASED and INCLUSIVE:
df.loc["x"]                   # one row as a Series
df.loc["w":"y"]               # THREE rows -- w, x AND y
df.loc["w":"y", "sales"]      # rows and one column
df.loc[df.sales > 15, "margin"]        # mask plus column
df.loc[:, ["sales", "margin"]]         # all rows, two columns

# .iloc IS POSITION-BASED and EXCLUSIVE:
df.iloc[1]                    # second row
df.iloc[0:3]                  # rows 0, 1, 2 -- NOT 3
df.iloc[0:3, 0]               # and column 0
df.iloc[[0, 2], [0, 2]]       # arbitrary positions

# WHY .loc IS INCLUSIVE: labels have no "one past the end". With
# strings or dates there is no way to name the element after "y", so
# an exclusive endpoint would be unusable:
dates = pd.date_range("2026-01-01", periods=5)
ts = pd.Series(range(5), index=dates)
ts.loc["2026-01-01":"2026-01-03"]      # three days, as anyone would mean

# THE INTEGER INDEX TRAP -- when labels ARE integers:
weird = pd.Series([10, 20, 30], index=[2, 0, 1])
weird.loc[0]                  # 20 -- the row LABELLED 0
weird.iloc[0]                 # 10 -- the row AT POSITION 0
weird[0]                      # 20 in older pandas; deprecated/removed
#
# Bare [] on an integer index is genuinely ambiguous, which is why
# pandas has been removing it. Always say .loc or .iloc.

# BOOLEAN MASKS WORK IN .loc, NOT .iloc:
mask = df.sales > 15
df.loc[mask]                  # fine
df.iloc[mask.values]          # needs a raw array, not a Series
df.iloc[np.flatnonzero(mask)] # or positions

# CALLABLES AVOID NAMING THE INTERMEDIATE -- useful in a chain:
(df.assign(net=lambda d: d.sales * (1 - d.margin))
   .loc[lambda d: d.net > 15]
   .sort_values("net"))
#
# Each lambda receives the frame AT THAT POINT in the chain, so there
# is no stale variable and nothing to name.

# .at AND .iat FOR SINGLE VALUES -- roughly 3x faster:
df.at["x", "sales"]           # 20
df.iat[1, 0]                  # 20
# Only for scalars. Passing a slice raises.
`,
      hl: [18, 33, 42, 58],
      caption: "**`.loc` slices are inclusive because labels have no \"one past the end\".** With dates or strings there is no way to name the element after the last one you want."
    },

    { t: "h2", n: "02", text: "Chained indexing and the warning", id: "chained" },

    { t: "p", text: "**Chained indexing means two separate `[]` operations, and the first one may return a view or a copy** — pandas decides based on the frame's internal block layout, which you neither control nor can see. Writing through the second one is therefore a coin flip." },

    { t: "viz",
      title: "Why a chained write may or may not land",
      caption: "The first operation returns something pandas chooses; the write goes to whatever that was. One call to `.loc` addresses the original frame directly and has no such ambiguity.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="A chained indexing write going into a temporary, against a single loc write going into the frame">
  <text x="30" y="26" class="s-label" style="fill:var(--crit)">df[df.x &gt; 5]["y"] = 0    — two operations</text>
  <rect x="30" y="42" width="130" height="46" rx="5" style="fill:none;stroke:var(--line);stroke-width:1.5"/>
  <text x="66" y="70" class="s-sub" style="fill:var(--ink-2)">df</text>
  <line x1="160" y1="65" x2="230" y2="65" style="stroke:var(--crit);stroke-width:1.5" marker-end="url(#ci-c)"/>
  <text x="164" y="56" class="s-sub" style="fill:var(--ink-3)">[mask]</text>
  <rect x="236" y="42" width="170" height="46" rx="5" style="fill:var(--warn);fill-opacity:.16;stroke:var(--warn);stroke-width:2"/>
  <text x="252" y="62" class="s-sub" style="fill:var(--ink-2)">view OR copy?</text>
  <text x="252" y="80" class="s-sub" style="fill:var(--warn)">pandas decides</text>
  <line x1="406" y1="65" x2="476" y2="65" style="stroke:var(--crit);stroke-width:1.5" marker-end="url(#ci-c)"/>
  <text x="412" y="56" class="s-sub" style="fill:var(--ink-3)">["y"] = 0</text>
  <rect x="482" y="42" width="150" height="46" rx="5" style="fill:var(--crit);fill-opacity:.14;stroke:var(--crit);stroke-width:2"/>
  <text x="498" y="70" class="s-sub" style="fill:var(--ink-2)">the write lands here</text>
  <text x="660" y="60" class="s-sub" style="fill:var(--crit)">…which might be</text>
  <text x="660" y="80" class="s-sub" style="fill:var(--crit)">a discarded temporary</text>

  <text x="30" y="150" class="s-label" style="fill:var(--good)">df.loc[df.x &gt; 5, "y"] = 0    — one operation</text>
  <rect x="30" y="166" width="130" height="46" rx="5" style="fill:none;stroke:var(--line);stroke-width:1.5"/>
  <text x="66" y="194" class="s-sub" style="fill:var(--ink-2)">df</text>
  <line x1="160" y1="189" x2="482" y2="189" style="stroke:var(--good);stroke-width:2" marker-end="url(#ci-g)"/>
  <text x="230" y="180" class="s-sub" style="fill:var(--good)">.loc[mask, "y"] = 0 — one __setitem__ on df itself</text>
  <rect x="488" y="166" width="150" height="46" rx="5" style="fill:var(--good);fill-opacity:.18;stroke:var(--good);stroke-width:2"/>
  <text x="506" y="194" class="s-sub" style="fill:var(--ink-2)">always lands</text>

  <line x1="30" y1="240" x2="850" y2="240" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="264" class="s-sub" style="fill:var(--ink-3)">No intermediate object exists, so there is nothing for the write to go missing into.</text>
  <text x="30" y="286" class="s-sub" style="fill:var(--ink-3)">Copy-on-Write (pandas 3.0) makes the chained form reliably do nothing — clearer, but still wrong.</text>

  <defs>
    <marker id="ci-c" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--crit)"/></marker>
    <marker id="ci-g" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--good)"/></marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "python", title: "the warning, and what it is actually saying", code: `
df = pd.DataFrame({"x": [1, 2, 3, 4], "y": [10, 20, 30, 40]})

# CHAINED -- two operations, unpredictable outcome:
df[df.x > 2]["y"] = 0
# SettingWithCopyWarning: A value is trying to be set on a copy of a
# slice from a DataFrame
df["y"].tolist()              # [10, 20, 30, 40] -- NOTHING HAPPENED
#
# THE WARNING IS PRECISE. pandas is saying: "the object you wrote to
# was probably a copy, so your write probably went nowhere". It is
# not saying the code is untidy.

# THE CORRECT FORM -- one operation:
df.loc[df.x > 2, "y"] = 0
df["y"].tolist()              # [10, 20, 0, 0] -- landed

# THE SAME TRAP THROUGH A VARIABLE, which is how it survives review:
subset = df[df.x > 2]         # a new frame, probably a copy
subset["y"] = 999             # SettingWithCopyWarning
df["y"].tolist()              # unchanged -- and often that IS intended
#
# The warning fires because pandas cannot tell whether you meant to
# modify df or only subset. If you meant only subset, say so:
subset = df[df.x > 2].copy()  # explicit -- no warning, no ambiguity
subset["y"] = 999

# THE FUNCTION-BOUNDARY VERSION, the hardest to spot:
def add_flag(frame):
    frame["flag"] = frame.x > 2      # warns if frame is a slice
    return frame

add_flag(df[df.x > 1])        # SettingWithCopyWarning
#
# The function is fine in isolation. Whether it warns depends on what
# the caller passed, which is why this survives unit tests and
# appears only in the pipeline.

# THE READ-ONLY CHAIN IS FINE, and worth distinguishing:
value = df[df.x > 2]["y"].mean()      # NO warning -- reading only
#
# Chained indexing is only dangerous when you WRITE through it. It is
# still slower for reads, because it builds an intermediate.

# COPY-ON-WRITE (default from pandas 3.0) CHANGES THE OUTCOME:
#   pd.options.mode.copy_on_write = True
#
# Under CoW, every indexing operation behaves as if it returned a
# copy. The chained write then RELIABLY does nothing, and the warning
# is replaced by a ChainedAssignmentError.
#
# That is an improvement -- deterministic beats unpredictable -- but
# the code is still wrong. It just fails the same way every time.

# THE RULE THAT SURVIVES EVERY VERSION:
#   ONE indexing operation when writing. Always .loc or .iloc.
#   .copy() when you want an independent frame, stated explicitly.
`,
      hl: [9, 15, 26, 44],
      caption: "**The warning is a precise diagnosis, not a style note.** \"A value is trying to be set on a copy\" means your write probably went nowhere — and `df[\"y\"].tolist()` confirms it did."
    },

    { t: "callout", kind: "trap", title: "It depends on the caller, not on the function", body: [
      { t: "p", text: "A helper that does `frame[\"flag\"] = ...` is perfectly correct when handed a real DataFrame and warns — possibly silently failing — when handed a filtered slice. **The defect is not in the function you are looking at.**" },
      { t: "p", text: "That is why this survives unit tests: the fixture is a fresh frame, and the pipeline passes a slice." },
      { t: "p", text: "**Make functions that modify take a copy at the boundary, or return a new frame instead of mutating.** Returning is better: it removes the question entirely and composes into a method chain." }
    ]},

    { t: "h2", n: "03", text: "Selection patterns worth knowing", id: "patterns" },

    { t: "code", lang: "python", title: "the selections that come up repeatedly", code: `
rng = np.random.default_rng(0)
df = pd.DataFrame({
    "customer": rng.integers(1, 50, 200),
    "region": rng.choice(["north", "south", "east"], 200),
    "amount": rng.normal(500, 200, 200).round(2),
    "status": rng.choice(["open", "closed", "pending"], 200),
})

# MULTIPLE CONDITIONS -- parenthesise every one:
df.loc[(df.amount > 500) & (df.region == "north")]
#
# 'and' raises here for the same reason it does in NumPy: it calls
# __bool__ on a whole Series.

# MEMBERSHIP instead of chained ORs:
df.loc[df.region.isin(["north", "south"])]
df.loc[~df.status.isin(["closed"])]           # negate with ~

# BETWEEN -- inclusive on both ends by default:
df.loc[df.amount.between(400, 600)]
df.loc[df.amount.between(400, 600, inclusive="neither")]

# STRING PREDICATES -- vectorised, and na= is not optional:
df.loc[df.region.str.startswith("n")]
df.loc[df.region.str.contains("out", na=False)]
#
# WITHOUT na=False, a missing value produces NaN in the mask, and a
# NaN in a boolean mask RAISES on indexing. It is not treated as False.

# query() FOR READABILITY on long conditions:
df.query("amount > 500 and region == 'north'")
threshold = 500
df.query("amount > @threshold")               # @ references a variable
#
# query is easier to read and slower on small frames (it parses a
# string). On large frames it can be faster, because it can use numexpr.

# SELECTING COLUMNS BY DTYPE -- the practical way to split a frame:
df.select_dtypes(include="number")
df.select_dtypes(include=["object", "category"])
df.select_dtypes(exclude="number").columns.tolist()

# NLARGEST BEATS SORT-THEN-HEAD:
df.nlargest(5, "amount")      # partial sort, O(n) rather than O(n log n)
df.sort_values("amount", ascending=False).head(5)      # same result

# SAMPLING:
df.sample(10, random_state=0)
df.sample(frac=0.1, random_state=0)
df.sample(10, weights="amount", random_state=0)

# CONDITIONAL ASSIGNMENT -- three forms for three situations:
df.loc[df.amount < 0, "amount"] = 0                      # a mask
df["band"] = np.where(df.amount > 500, "high", "low")    # two branches
df["band"] = pd.cut(df.amount, [0, 300, 600, np.inf],    # ordered bins
                    labels=["low", "mid", "high"])

# mask AND where ARE INVERSES OF EACH OTHER, and both are the
# OPPOSITE of np.where's argument order:
df.amount.where(df.amount > 0, 0)      # KEEP where True, replace others
df.amount.mask(df.amount < 0, 0)       # REPLACE where True
#
# Series.where keeps the values where the condition holds. np.where
# selects the first argument where it holds. Mixing them up is a
# routine source of inverted logic.
`,
      hl: [26, 40, 58, 62],
      caption: "**`Series.where` keeps values where the condition is `True`; `np.where` selects its first argument where it is `True`.** The two read the same and mean opposite things."
    },

    { t: "ladder",
      title: "Adding a derived column to a filtered subset",
      rungs: [
        { level: "bad", label: "Chained write", code: `high = df[df.amount > 500]
high["tier"] = "premium"     # SettingWithCopyWarning`,
          note: "**Ambiguous by construction.** pandas cannot tell whether you meant to modify `df` or only `high`, so it warns — and whether the write lands depends on the frame's internal block layout." },
        { level: "ok", label: "Explicit copy", code: `high = df[df.amount > 500].copy()
high["tier"] = "premium"`,
          note: "**Correct and clear**: you have said the subset is independent. The cost is a full copy of the selected rows, which only matters when the subset is large." },
        { level: "best", label: "Write into the original, or chain", code: `# modify in place, no intermediate at all
df.loc[df.amount > 500, "tier"] = "premium"

# or build a new frame without mutating anything
result = (df
    .assign(tier=lambda d: np.where(d.amount > 500, "premium", "standard"))
    .loc[lambda d: d.tier == "premium"])`,
          note: "**Neither form can suffer the problem.** `.loc` addresses `df` directly with one operation; the `assign` chain never mutates, so there is no view-or-copy question to get wrong." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "The cleaning step that did nothing",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "A cleaning function is supposed to fix negative amounts and flag suspicious rows. Downstream reports still contain negative amounts, and the flag column is missing entirely from some runs." },
        { t: "code", lang: "python", numbered: false, title: "clean.py", code: `
import pandas as pd
import numpy as np

def clean(df):
    recent = df[df["date"] >= "2026-01-01"]

    recent["amount"][recent["amount"] < 0] = 0

    recent["suspicious"] = False
    recent["suspicious"][recent["amount"] > 10000] = True

    for i in range(len(recent)):
        if recent["region"][i] == "unknown":
            recent["region"][i] = "other"

    return recent`},
        { t: "p", text: "Find every defect. Explain which writes land, which do not, and why the behaviour is not consistent between runs. Then rewrite it." }
      ],
      requirements: [
        "Identify each defect and say whether it fails silently or loudly.",
        "Explain why the loop raises on some data and not on other data.",
        "Explain why the result differs under Copy-on-Write.",
        "Rewrite without chained indexing and without a loop.",
        "Keep the same intended behaviour.",
        "Include tests, including one that would have caught the silent failure."
      ],
      hint: "There are three separate chained writes and one indexing mistake that has nothing to do with copies.",
      solution: {
        lang: "python",
        title: "clean_fixed.py",
        code: `import pandas as pd
import numpy as np


# =========================================================================
# THE DEFECTS
# =========================================================================
#
# 1. recent = df[df["date"] >= ...] IS A SLICE.
#    Every subsequent write to it is a write to something pandas may
#    have created as a copy. All three writes below inherit this.
#
# 2. recent["amount"][mask] = 0  -- CHAINED WRITE.
#    Two operations: select the column, then set into it. Whether the
#    first returns a view of recent's data is a block-layout detail.
#    SILENT FAILURE: no exception, negative amounts survive.
#
# 3. recent["suspicious"] = False  -- this one usually DOES land,
#    because assigning a whole new column takes a different code path.
#    Which is exactly why the bug is confusing: some writes work.
#
# 4. recent["suspicious"][mask] = True  -- CHAINED again.
#    SILENT FAILURE: the column exists and is all False.
#
# 5. recent["region"][i] -- THIS IS NOT A COPY PROBLEM.
#    Series [] with an integer uses the LABEL, not the position. After
#    filtering, labels are a sparse subset like [4, 9, 17].
#
#      i = 0  -> KeyError if label 0 was filtered out
#      i = 4  -> the row LABELLED 4, not the fifth row
#
#    So the loop either raises KeyError or silently reads the wrong
#    rows, depending on which dates survived the filter. THAT is why
#    behaviour changes between runs: it is a function of the data.
#
# 6. THE LOOP ITSELF is O(n) Python iterations doing what one
#    vectorised call does, and it writes through a chain as well.
#
# 7. NO .copy() AND NO CLEAR CONTRACT. The caller cannot tell whether
#    clean() mutates its argument. Under the old behaviour it
#    sometimes did.
#
# UNDER COPY-ON-WRITE (pandas 3.0 default):
#    Every chained write raises ChainedAssignmentError instead of
#    warning. The function fails loudly and consistently rather than
#    silently and intermittently -- better, but still broken.


def demonstrate():
    df = pd.DataFrame({
        "date": pd.to_datetime(["2025-06-01", "2026-02-01",
                                "2026-03-01", "2026-04-01"]),
        "amount": [100.0, -50.0, 20000.0, 300.0],
        "region": ["north", "unknown", "south", "unknown"],
    })

    recent = df[df["date"] >= "2026-01-01"]
    recent.index.tolist()               # [1, 2, 3] -- NOT [0, 1, 2]

    # The loop's first iteration asks for label 0, which is gone:
    try:
        recent["region"][0]
    except KeyError:
        return "KeyError on the very first iteration"


# =========================================================================
# THE REWRITE
# =========================================================================

SUSPICIOUS_THRESHOLD = 10_000


def clean(df, *, cutoff="2026-01-01", threshold=SUSPICIOUS_THRESHOLD):
    """Filter to recent rows and normalise them.

    Returns a NEW frame. The input is never modified -- which is both
    the safe default and the reason there is no view-or-copy question
    anywhere in this function.
    """
    required = {"date", "amount", "region"}
    missing = required - set(df.columns)
    if missing:
        raise KeyError(f"missing columns: {sorted(missing)}")

    out = df.loc[pd.to_datetime(df["date"]) >= pd.Timestamp(cutoff)].copy()

    # ONE operation per write, all through .loc on a frame we own.
    out.loc[out["amount"] < 0, "amount"] = 0

    # Build the flag in one vectorised expression rather than
    # initialising and then patching.
    out["suspicious"] = out["amount"] > threshold

    # replace() handles the region fix without a loop and without
    # touching rows that do not need it.
    out["region"] = out["region"].replace("unknown", "other")

    return out


# THE CHAIN FORM, if the pipeline prefers it -- no mutation at all:
def clean_chained(df, *, cutoff="2026-01-01", threshold=SUSPICIOUS_THRESHOLD):
    return (
        df.loc[pd.to_datetime(df["date"]) >= pd.Timestamp(cutoff)]
          .assign(
              amount=lambda d: d["amount"].clip(lower=0),
              suspicious=lambda d: d["amount"].clip(lower=0) > threshold,
              region=lambda d: d["region"].replace("unknown", "other"),
          )
    )
#
# NOTE THE REPEATED clip IN THE CHAIN. assign evaluates every lambda
# against the ORIGINAL frame, not against the partially-updated one,
# so the suspicious lambda cannot see the clipped amount. Splitting into two
# assign calls is the clearer fix when this gets long.


# =========================================================================
# TESTS
# =========================================================================

def _fixture():
    return pd.DataFrame({
        "date": pd.to_datetime(["2025-06-01", "2026-02-01", "2026-03-01",
                                "2026-04-01", "2026-05-01"]),
        "amount": [100.0, -50.0, 20000.0, 300.0, -1.0],
        "region": ["north", "unknown", "south", "unknown", "east"],
    })


def test_negative_amounts_are_zeroed():
    """The write that silently did nothing in the original."""
    out = clean(_fixture())

    assert (out["amount"] >= 0).all()
    assert out["amount"].tolist() == [0.0, 20000.0, 300.0, 0.0]


def test_suspicious_flag_is_set():
    out = clean(_fixture())

    assert out["suspicious"].sum() == 1
    assert out.loc[out["amount"] == 20000.0, "suspicious"].all()


def test_unknown_regions_are_renamed():
    out = clean(_fixture())

    assert "unknown" not in out["region"].values
    assert (out["region"] == "other").sum() == 2


def test_old_rows_are_excluded():
    out = clean(_fixture())

    assert len(out) == 4
    assert out["date"].min() >= pd.Timestamp("2026-01-01")


def test_input_is_not_modified():
    df = _fixture()
    before = df.copy()

    clean(df)
    pd.testing.assert_frame_equal(df, before)


def test_the_original_loop_bug():
    """Series[int] uses the LABEL, and filtering leaves sparse labels."""
    df = _fixture()
    recent = df[df["date"] >= "2026-01-01"]

    assert recent.index.tolist() == [1, 2, 3, 4]

    try:
        recent["region"][0]
        assert False, "label 0 should not exist"
    except KeyError:
        pass

    assert recent["region"][1] == "unknown"     # label 1, not position 1
    assert recent["region"].iloc[0] == "unknown"


def test_chained_and_direct_agree():
    a = clean(_fixture()).reset_index(drop=True)
    b = clean_chained(_fixture()).reset_index(drop=True)

    pd.testing.assert_frame_equal(a[["amount", "region", "suspicious"]],
                                  b[["amount", "region", "suspicious"]])


def test_missing_column_raises():
    df = _fixture().drop(columns="region")

    try:
        clean(df)
        assert False, "should have raised"
    except KeyError as e:
        assert "region" in str(e)


def test_empty_after_filter():
    df = _fixture()
    out = clean(df, cutoff="2030-01-01")

    assert len(out) == 0
    assert "suspicious" in out.columns          # schema is still correct`,
        notes: [
          { t: "p", text: "**Some writes land and some do not, which is what makes this confusing.** `recent[\"suspicious\"] = False` creates a whole new column and usually works; `recent[\"suspicious\"][mask] = True` is chained and usually does not — so the column appears, full of `False`, and looks like a logic error rather than a write that vanished." },
          { t: "callout", kind: "trap", title: "The loop bug has nothing to do with copies", body: [
            { t: "p", text: "`recent[\"region\"][i]` uses the **label** `i`, not position `i`. After filtering, labels are a sparse subset like `[4, 9, 17]` — so `i = 0` raises `KeyError` and `i = 4` silently reads the wrong row." },
            { t: "p", text: "**That is why the behaviour changes between runs**: whether it raises depends entirely on which dates survived the filter. A dataset where row 0 happens to be recent runs clean; the next day's does not." }
          ]},
          { t: "p", text: "**Under Copy-on-Write the chained writes raise `ChainedAssignmentError` instead of warning.** That is a real improvement — deterministic beats intermittent — but the code is equally wrong either way, and relying on the version to catch it is not a fix." },
          { t: "p", text: "**Returning a new frame removes the question entirely.** With no mutation of the input there is no view-or-copy ambiguity anywhere in the function, and the caller can see the contract from the signature." },
          { t: "p", text: "**`assign` evaluates every lambda against the original frame**, not the partially-updated one — so `suspicious` cannot see the clipped `amount` without repeating the `clip`. When that repetition gets awkward, splitting into two `assign` calls is the clearer answer." },
          { t: "p", text: "**The empty-result test matters more than it looks.** A filter that matches nothing should still produce the right columns, or the next step in the pipeline fails on a missing key rather than on an empty frame." }
        ]
      }
    },

    { t: "callout", kind: "production", title: "In production", body: [
      { t: "p", text: "**Turn `SettingWithCopyWarning` into an error in CI**: `pd.options.mode.chained_assignment = \"raise\"`. It is the only warning in pandas that reliably indicates a real defect, and it costs nothing to enforce." },
      { t: "p", text: "**Prefer functions that return new frames over functions that mutate.** A mutating helper is correct or incorrect depending on what its caller passed, which unit tests with clean fixtures will not reveal." },
      { t: "p", text: "**Assert the effect, not the call.** A test that checks `clean()` ran is useless here; a test that checks no negative amounts remain is the one that catches a write going nowhere." }
    ]}
  ],

  takeaways: [
    "**`.loc` is label-based and its slices include the endpoint**; `.iloc` is position-based and excludes it, like Python.",
    "**`.loc` is inclusive because labels have no \"one past the end\"** — you cannot name the date after the last one you want.",
    "**`[]` is context-dependent**: a string gives a column, a slice gives rows, a mask gives rows, a list gives columns.",
    "**Chained indexing is two `[]` operations**, and whether the first returns a view or a copy is an internal block-layout detail.",
    "**`SettingWithCopyWarning` is a diagnosis, not a style note** — it means your write probably went nowhere.",
    "**Assigning a whole new column usually works while a chained write usually does not**, which is exactly why the bug is confusing.",
    "**Whether a mutating helper is correct depends on its caller**, so unit tests with fresh fixtures will not catch it.",
    "**`Series[i]` on an integer index uses the label, not the position** — after a filter, labels are sparse and `i = 0` may not exist.",
    "**Use `.copy()` to state that a subset is independent**, and `.loc[mask, col] = value` to write into the original.",
    "**`str.contains` needs `na=False`** — a `NaN` in a boolean mask raises on indexing rather than being treated as `False`.",
    "**`Series.where` keeps values where the condition holds; `np.where` selects its first argument** — the two read alike and mean opposites.",
    "**Under Copy-on-Write chained writes raise instead of warning** — deterministic, still wrong, and not a substitute for writing it correctly."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`df.loc[\"a\":\"c\"]` returns how many rows, if a, b and c are consecutive labels?",
        options: [
          "Two — a and b",
          "Three — `.loc` slices include the endpoint",
          "It raises",
          "Depends on whether the index is sorted"
        ],
        answer: 1,
        why: "Label slices are inclusive, because there is no way to name \"one past c\" when labels are strings or dates. `.iloc` slices are exclusive like ordinary Python — the asymmetry is deliberate and is the most common cause of an off-by-one in pandas."
      },
      {
        stem: "`df[df.x > 2][\"y\"] = 0` warns and the values are unchanged. Why?",
        options: [
          "The mask was empty",
          "It is two separate operations — the write went into whatever the first one returned, which was a copy",
          "`.loc` is required for numeric columns",
          "The column dtype prevented assignment"
        ],
        answer: 1,
        why: "The first `[]` may return a view or a copy depending on internal block layout, so writing through the second is a coin flip. `df.loc[df.x > 2, \"y\"] = 0` is a single `__setitem__` on `df` itself and always lands."
      },
      {
        stem: "After `recent = df[df.date >= cutoff]`, why does `recent[\"region\"][0]` sometimes raise KeyError?",
        options: [
          "The column does not exist",
          "`Series[0]` looks up the label 0, and filtering may have removed it — labels are not renumbered",
          "Chained indexing always raises",
          "The frame is empty"
        ],
        answer: 1,
        why: "Filtering preserves labels, so the index might be `[4, 9, 17]`. This has nothing to do with views or copies: it raises when label 0 is gone and silently reads the wrong row when it survives — which is why the behaviour changes with the data."
      },
      {
        stem: "A helper does `frame[\"flag\"] = ...` and warns only when called from the pipeline. What is the fix?",
        options: [
          "Suppress the warning",
          "Have the function return a new frame rather than mutating its argument, so correctness does not depend on the caller",
          "Add `.copy()` at every call site",
          "Use `.iloc` instead"
        ],
        answer: 1,
        why: "The function is correct with a fresh frame and ambiguous with a slice, which is precisely why unit tests miss it. Returning a new frame removes the view-or-copy question entirely and composes into a method chain; copying at the boundary is the acceptable second choice."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between `.loc` and `.iloc`?",
        strong: "`.loc` takes labels and `.iloc` takes positions. The detail people miss is that `.loc` slices include the endpoint while `.iloc` slices do not — because labels have no successor you can name. When the index is integers the two disagree, which is why bare `[]` on an integer index has been deprecated.",
        answer: [
          { t: "p", text: "The inclusive/exclusive asymmetry with its reason is what makes this more than a definition." },
          { t: "p", text: "Adding that `[]` means five different things depending on what you pass shows why explicit selectors are worth the extra characters." }
        ]
      },
      {
        level: "advanced",
        q: "What does SettingWithCopyWarning actually mean?",
        strong: "That you wrote through two chained indexing operations, and pandas cannot tell whether the intermediate was a view of the original or a copy — so it cannot tell whether the write landed. It is a correctness warning, not a style one. The fix is a single `.loc[mask, col] = value`, or `.copy()` if you genuinely wanted an independent subset.",
        answer: [
          { t: "p", text: "Framing it as a correctness diagnosis rather than noise to be suppressed is the whole point of the question." },
          { t: "p", text: "Mentioning that Copy-on-Write turns it into a deterministic error — same wrongness, now consistent — shows you are current." }
        ]
      },
      {
        level: "advanced",
        q: "How would you stop this class of bug appearing in a codebase?",
        strong: "Set `chained_assignment` to raise in CI, and prefer functions that return new frames over functions that mutate their arguments. A mutating helper's correctness depends on what the caller passed, so it passes unit tests with a clean fixture and fails in the pipeline. Tests should assert the effect — no negatives remain — rather than that the function ran.",
        answer: [
          { t: "p", text: "The caller-dependence point is the one that shows real experience: it explains why these bugs reach production despite test coverage." },
          { t: "p", text: "Turning the warning into a CI error is cheap, specific and easy to act on, which makes it a good closing suggestion." }
        ]
      }
    ]
  }
});

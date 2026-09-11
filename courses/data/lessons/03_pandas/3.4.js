/* ============================================================================
   LESSON 3.4 — Missing Data and the Three Representations
   ========================================================================= */
EC.receiveLesson({
  id: "3.4",

  lede: "**pandas has three ways to say \"missing\" — `NaN`, `None` and `NaT` — plus a fourth, `pd.NA`, that was meant to unify them.** They behave differently in comparisons, in arithmetic, in groupby and in `==`, and `NaN` is not even equal to itself. Most missing-data bugs are one representation being treated as another.",

  objectives: [
    "Name the four missing-value representations and where each appears",
    "Explain why `NaN != NaN` and what that does to equality checks",
    "Predict how missing values propagate through arithmetic, comparison and aggregation",
    "Use `isna`, `fillna`, `dropna` and `interpolate` with their real semantics",
    "Distinguish missing-data mechanics from missing-data strategy"
  ],

  prerequisites: ["3.3"],

  blocks: [

    { t: "h2", n: "01", text: "Four ways to be missing", id: "four" },

    { t: "p", text: "The representation a missing value takes depends on the column's dtype, not on what you wrote. **Put `None` in a float column and you get `NaN`; put it in an object column and it stays `None`; put it in a datetime column and it becomes `NaT`.**" },

    { t: "dl", items: [
      ["`np.nan`", "IEEE 754 \"not a number\" — a **float** value. The only missing representation NumPy has, so it forces any column containing it to float dtype."],
      ["`None`", "Python's null object. Survives only in **object** columns; anywhere else pandas converts it on entry."],
      ["`pd.NaT`", "\"Not a Time\" — the missing value for **datetime** and **timedelta** columns. Behaves like `NaN` but for dates."],
      ["`pd.NA`", "The **nullable** missing scalar, used by `Int64`, `boolean`, `string` and Arrow dtypes. Propagates through comparisons rather than returning `False`."],
      ["`isna()` / `notna()`", "The only reliable test. Recognises all four representations; `== np.nan` and `== None` do not."],
      ["Propagation", "How a missing value spreads: `NaN + 1` is `NaN`, `NaN > 1` is `False`, `pd.NA > 1` is `pd.NA`."]
    ]},

    { t: "viz",
      title: "What each dtype does with a missing value",
      caption: "You write `None`; the column decides what it becomes. The representation is a property of the dtype, which is why the same code behaves differently on differently typed columns.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="None entering four column dtypes and becoming NaN, None, NaT or NA">
  <rect x="30" y="110" width="120" height="50" rx="8" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line);stroke-width:1.5"/>
  <text x="62" y="140" class="s-label" style="fill:var(--ink-2)">None</text>
  <text x="30" y="190" class="s-sub" style="fill:var(--ink-3)">what you wrote</text>

  <g style="stroke:var(--ink-3);stroke-width:1.5">
    <line x1="150" y1="135" x2="300" y2="60" marker-end="url(#md-a)"/>
    <line x1="150" y1="135" x2="300" y2="115" marker-end="url(#md-a)"/>
    <line x1="150" y1="135" x2="300" y2="170" marker-end="url(#md-a)"/>
    <line x1="150" y1="135" x2="300" y2="225" marker-end="url(#md-a)"/>
  </g>

  <g stroke-width="1.5">
    <rect x="306" y="42" width="150" height="36" rx="6" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)"/>
    <rect x="306" y="97" width="150" height="36" rx="6" style="fill:var(--warn);fill-opacity:.14;stroke:var(--warn)"/>
    <rect x="306" y="152" width="150" height="36" rx="6" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)"/>
    <rect x="306" y="207" width="150" height="36" rx="6" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)"/>
  </g>
  <text x="322" y="65" class="s-sub" style="fill:var(--ink-2)">float64 column</text>
  <text x="322" y="120" class="s-sub" style="fill:var(--ink-2)">object column</text>
  <text x="322" y="175" class="s-sub" style="fill:var(--ink-2)">datetime64 column</text>
  <text x="322" y="230" class="s-sub" style="fill:var(--ink-2)">Int64 / string column</text>

  <g style="stroke:var(--ink-3);stroke-width:1.5">
    <line x1="456" y1="60" x2="520" y2="60" marker-end="url(#md-a)"/>
    <line x1="456" y1="115" x2="520" y2="115" marker-end="url(#md-a)"/>
    <line x1="456" y1="170" x2="520" y2="170" marker-end="url(#md-a)"/>
    <line x1="456" y1="225" x2="520" y2="225" marker-end="url(#md-a)"/>
  </g>

  <text x="530" y="65" class="s-label" style="fill:var(--accent)">NaN</text>
  <text x="600" y="65" class="s-sub" style="fill:var(--ink-3)">a float; NaN != NaN; NaN &gt; 1 is False</text>
  <text x="530" y="120" class="s-label" style="fill:var(--warn)">None</text>
  <text x="600" y="120" class="s-sub" style="fill:var(--ink-3)">stays a Python object; == None works</text>
  <text x="530" y="175" class="s-label" style="fill:var(--good)">NaT</text>
  <text x="600" y="175" class="s-sub" style="fill:var(--ink-3)">like NaN, for dates; NaT != NaT</text>
  <text x="530" y="230" class="s-label" style="fill:var(--crit)">&lt;NA&gt;</text>
  <text x="600" y="230" class="s-sub" style="fill:var(--ink-3)">NA &gt; 1 is NA; masks with NA raise</text>

  <text x="30" y="282" class="s-sub" style="fill:var(--ink-3)">isna() recognises all four. Nothing else does reliably.</text>

  <defs><marker id="md-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/></marker></defs>
</svg>`
    },

    { t: "code", lang: "python", title: "the same None, four outcomes", code: `
import pandas as pd
import numpy as np

pd.Series([1.0, None]).iloc[1]                          # nan
pd.Series(["a", None]).iloc[1]                          # None
pd.Series([pd.Timestamp("2026-01-01"), None]).iloc[1]   # NaT
pd.Series([1, None], dtype="Int64").iloc[1]             # <NA>

# THE DTYPE CHANGE IS THE FIRST THING TO NOTICE:
pd.Series([1, 2, 3]).dtype               # int64
pd.Series([1, 2, None]).dtype            # float64 -- one None, whole column
pd.Series([True, False, None]).dtype     # object -- not bool!
#
# A boolean column with one missing value becomes object dtype, and
# every downstream boolean operation on it is now a Python loop.

# NaN IS NOT EQUAL TO ITSELF -- this is the IEEE standard, not pandas:
np.nan == np.nan                         # False
np.nan != np.nan                         # True
float("nan") is np.nan                   # False -- and identity fails too

s = pd.Series([1.0, np.nan, 3.0])
(s == np.nan).tolist()                   # [False, False, False] -- USELESS
s.isna().tolist()                        # [False, True, False] -- correct
#
# == np.nan NEVER MATCHES ANYTHING. Code that filters with it silently
# selects zero rows and nobody notices until the count looks wrong.

# NaT BEHAVES THE SAME WAY:
pd.NaT == pd.NaT                         # False
pd.Series([pd.NaT]).isna().iloc[0]       # True

# None IS EQUAL TO ITSELF, which makes object columns inconsistent:
None == None                             # True
obj = pd.Series(["a", None, "b"])
(obj == None).tolist()                   # [False, True, False] -- works...
obj.isna().tolist()                      # [False, True, False] -- ...but use this
#
# An object column can hold BOTH None and NaN, and == None finds only
# one of them. isna finds both.
mixed = pd.Series(["a", None, np.nan], dtype=object)
(mixed == None).sum()                    # 1
mixed.isna().sum()                       # 2

# pd.NA IS THE ODD ONE: it PROPAGATES through comparison.
n = pd.Series([1, None, 3], dtype="Int64")
(n > 1).tolist()                         # [False, <NA>, True]
(n == 1).tolist()                        # [True, <NA>, False]
#
# NaN says "no" to every comparison. NA says "I do not know". The
# second is logically correct and practically inconvenient:
try:
    n[n > 1]                             # ValueError: cannot mask with NA
except ValueError:
    pass
n[(n > 1).fillna(False)]                 # say what NA should mean

# BOOLEAN LOGIC WITH NA -- three-valued, like SQL:
pd.NA | True                             # True  (something is True)
pd.NA & False                            # False (something is False)
pd.NA | False                            # <NA>  (cannot tell)
pd.NA & True                             # <NA>
#
# This is Kleene logic. It is exactly what SQL does with NULL, and it
# is why a WHERE clause with a NULL comparison drops rows silently.

# isna IS THE ONLY TEST THAT WORKS FOR ALL FOUR:
pd.isna(np.nan), pd.isna(None), pd.isna(pd.NaT), pd.isna(pd.NA)
# (True, True, True, True)
`,
      hl: [11, 22, 26, 49],
      caption: "**`== np.nan` never matches anything.** A filter written with it selects zero rows and raises nothing — `isna()` is the only test that recognises all four representations."
    },

    { t: "callout", kind: "trap", title: "One missing boolean makes the whole column object", body: [
      { t: "p", text: "`pd.Series([True, False, None])` is `object` dtype, not `bool`. Every `&`, `|` and `~` on it now runs a Python loop, and `~` on an object column of `True`/`False`/`None` raises or gives `-2`." },
      { t: "p", text: "**This is the case the nullable `boolean` dtype exists for**: `pd.Series([True, False, None], dtype=\"boolean\")` keeps the type and gives `<NA>` for the gap." },
      { t: "p", text: "Check `df.dtypes` after loading anything with flags. A column that should be `bool` and shows `object` has a missing value somewhere in it." }
    ]},

    { t: "h2", n: "02", text: "How missing values move through operations", id: "propagation" },

    { t: "p", text: "**The rule for arithmetic is simple — missing in, missing out. The rules for aggregation, comparison and groupby are each different**, and the differences are where the surprises live." },

    { t: "table",
      head: ["Operation", "With `NaN`", "With `pd.NA`", "Consequence"],
      rows: [
        ["`x + 1`", "`NaN`", "`<NA>`", "Arithmetic propagates — expected"],
        ["`x > 1`", "**`False`**", "`<NA>`", "`NaN` fails every comparison; a mask silently excludes it"],
        ["`x == x`", "**`False`**", "`<NA>`", "Self-equality fails, so `df == df` is not all True"],
        ["`s.sum()`", "**Skipped** (`skipna=True`)", "Skipped", "An all-missing column sums to **0**, not `NaN`"],
        ["`s.mean()`", "Skipped", "Skipped", "Divides by the non-missing count — silently"],
        ["`s.count()`", "Excluded", "Excluded", "`len(s)` and `s.count()` differ by the missing count"],
        ["`groupby(key)`", "**Group dropped**", "Group dropped", "Rows with a missing key vanish unless `dropna=False`"],
        ["`s.value_counts()`", "**Excluded**", "Excluded", "Missing is not a value unless `dropna=False`"],
        ["`s.unique()`", "Included", "Included", "Inconsistent with `value_counts` — a routine surprise"],
        ["`s.astype(int)`", "**Raises**", "Raises", "Cannot cast `NaN` to integer — good, it fails loudly"],
        ["`s.rank()`", "`NaN`", "`NaN`", "Missing values get no rank; `na_option` controls it"]
      ],
      caption: "**`sum()` skips missing values by default and an all-missing column sums to 0.** That is indistinguishable from a column that genuinely totalled zero, and `min_count=1` is the fix."
    },

    { t: "code", lang: "python", title: "the aggregation behaviours that produce wrong numbers quietly", code: `
sales = pd.DataFrame({
    "region": ["n", "n", "s", None, "s"],
    "amount": [100.0, np.nan, 200.0, 50.0, np.nan],
})

# skipna IS THE DEFAULT, and it hides how much was missing:
sales["amount"].sum()                    # 350.0 -- two rows ignored
sales["amount"].mean()                   # 116.67 -- divided by 3, not 5
sales["amount"].count()                  # 3
len(sales)                               # 5
#
# THE MEAN IS OVER THE PRESENT VALUES. Whether that is right depends
# on WHY they are missing (see 6.5). Reporting the count alongside is
# the minimum honesty.

# AN ALL-MISSING COLUMN SUMS TO ZERO:
pd.Series([np.nan, np.nan]).sum()        # 0.0
pd.Series([np.nan, np.nan]).sum(min_count=1)     # nan -- the honest answer
pd.Series([np.nan, np.nan]).mean()       # nan -- mean already does this
#
# min_count=1 says "a sum needs at least one value". Without it, a
# region with no sales and a region with zero sales are identical.

# GROUPBY DROPS MISSING KEYS:
sales.groupby("region")["amount"].sum()
# region
# n    100.0
# s    200.0
#             <- the None-region row (amount 50) is GONE
#
sales.groupby("region", dropna=False)["amount"].sum()
# n      100.0
# s      200.0
# NaN     50.0
#
# The default silently discards rows. Reconciling the group total
# against the column total catches it:
sales.groupby("region")["amount"].sum().sum()    # 300
sales["amount"].sum()                            # 350 -- 50 went missing

# value_counts AND unique DISAGREE:
sales["region"].value_counts()           # n: 2, s: 2 -- None not shown
sales["region"].value_counts(dropna=False)       # n: 2, s: 2, NaN: 1
sales["region"].unique()                 # ['n', 's', None] -- INCLUDED
sales["region"].nunique()                # 2 -- EXCLUDED
#
# So len(unique()) != nunique() when there are missing values. Both
# are documented; nobody remembers which is which.

# COMPARISON EXCLUDES MISSING FROM BOTH SIDES:
(sales["amount"] > 75).sum()             # 2 -- 100 and 200
(sales["amount"] <= 75).sum()            # 1 -- 50
# 2 + 1 = 3, not 5. The two NaN rows are in NEITHER bucket.
#
# A "high" and "low" split that drops 40% of the rows without a
# warning. If missing should be its own bucket, say so:
np.select([sales["amount"].isna(), sales["amount"] > 75],
          ["unknown", "high"], default="low")

# EQUALITY BETWEEN FRAMES IS BROKEN BY NaN:
a = pd.Series([1.0, np.nan])
(a == a).all()                           # False -- NaN != NaN
a.equals(a)                              # True -- treats NaN as equal
pd.testing.assert_series_equal(a, a)     # passes
#
# .equals() and the testing helpers treat missing-as-equal-to-missing,
# which is what you want in a test. == does not.

# CASTING FAILS LOUDLY, which is a feature:
try:
    sales["amount"].astype(int)
except (ValueError, TypeError) as e:
    print("Cannot convert non-finite values to integer")
#
# The nullable dtype allows it:
sales["amount"].astype("Int64")          # 100, <NA>, 200, 50, <NA>
`,
      hl: [16, 30, 45, 55],
      caption: "**A \"high\" and \"low\" split drops every missing row from both buckets.** Two plus one equals three of five, and no warning tells you the other two went nowhere."
    },

    { t: "h2", n: "03", text: "Filling, dropping and interpolating", id: "filling" },

    { t: "p", text: "The mechanics of replacing missing values are simple. **The decision about what to replace them with is not, and it belongs in 6.5 and 6.6** — this section is about doing what you decided correctly." },

    { t: "code", lang: "python", title: "the operations, and their edges", code: `
df = pd.DataFrame({
    "t": pd.date_range("2026-01-01", periods=6, freq="h"),
    "temp": [20.0, np.nan, np.nan, 23.0, np.nan, 25.0],
    "site": ["a", None, "a", "b", "b", None],
})

# dropna -- the subset and thresh arguments are where the control is:
df.dropna()                              # any missing -> row gone: 1 row left
df.dropna(subset=["temp"])               # only care about temp: 3 rows
df.dropna(thresh=2)                      # keep rows with >= 2 non-missing
df.dropna(axis=1, thresh=len(df) * 0.5)  # drop COLUMNS more than half empty
#
# dropna() with no arguments on a wide frame routinely removes 90% of
# the rows, because every row is missing SOMETHING. Always pass subset.

# fillna WITH A SCALAR -- the simple case:
df["temp"].fillna(0)                     # a claim: missing means zero
df["temp"].fillna(df["temp"].mean())     # a claim: missing is typical
#
# EACH OF THESE IS A MODELLING DECISION wearing a one-liner's clothes.
# fillna(0) on a temperature column says the sensor read 0 degrees.

# FORWARD AND BACKWARD FILL -- for ordered data:
df["temp"].ffill()                       # carry the last value forward
df["temp"].bfill()                       # pull the next value back
#
# ffill IS TEMPORALLY HONEST: it uses only the past. bfill uses the
# FUTURE, which in a feature for a time-series model is leakage. The
# operation is the same shape; the direction is the whole difference.

# limit STOPS A FILL RUNNING FOREVER:
long_gap = pd.Series([1.0] + [np.nan] * 100 + [2.0])
long_gap.ffill().isna().sum()            # 0 -- 100 values invented
long_gap.ffill(limit=3).isna().sum()     # 97 -- honest about the gap
#
# A sensor offline for four days should not report its last reading
# for four days. limit is how you encode "how long is a value valid".

# INTERPOLATE -- for numeric data with a meaningful order:
df["temp"].interpolate()                 # linear between known points
# [20, 21, 22, 23, 24, 25]
#
# method="time" USES THE ACTUAL TIMESTAMPS, which matters when the
# spacing is irregular:
ts = df.set_index("t")["temp"]
ts.interpolate(method="time")            # weights by elapsed time
#
# BOTH DIRECTIONS BY DEFAULT: interpolate looks at the future value
# too. limit_direction="forward" makes it causal, and limit_area=
# "inside" stops it extrapolating past the last known point.
ts.interpolate(limit_direction="forward", limit_area="inside")

# FILLING BY GROUP -- the fill value should usually come from the
# same site, not the global mean:
df["temp"].fillna(df.groupby("site")["temp"].transform("mean"))
#
# transform returns a Series aligned to the original index, so fillna
# can use it row by row. This is the idiom.

# THE MISSING INDICATOR -- often the most valuable step:
df["temp_missing"] = df["temp"].isna().astype(int)
df["temp"] = df["temp"].fillna(df["temp"].median())
#
# The FACT of missingness frequently predicts the target better than
# any imputed value does. A sensor that fails under load, a field a
# customer declined to give -- the gap is the signal. Fill AND flag.

# replace FOR SENTINELS THAT SHOULD HAVE BEEN MISSING:
raw = pd.Series([25.0, -999.0, 30.0, 9999.0])
raw.replace([-999.0, 9999.0], np.nan)
#
# -999, 9999, "N/A", "", "null", "None" (the STRING) -- every source
# has its own sentinel, and read_csv catches only the ones in its
# default list. Profile before trusting isna().
pd.read_csv.__defaults__                 # see na_values in 5.1
`,
      hl: [13, 27, 34, 65],
      caption: "**`ffill` uses the past; `bfill` and `interpolate` use the future.** In a feature for a time-series model the second two are leakage — same shape of operation, and the direction is the whole difference."
    },

    { t: "callout", kind: "insight", title: "Fill and flag", body: [
      { t: "p", text: "**The fact that a value was missing is frequently more predictive than whatever you fill it with.** A sensor that drops out under load, a field a customer declined to complete, a transaction with no merchant category — the gap carries information the imputed value destroys." },
      { t: "p", text: "Add `col_missing = col.isna().astype(int)` **before** filling. It costs one column and preserves a signal that would otherwise be erased." },
      { t: "p", text: "This is also what makes the imputation choice less critical: with the indicator present, a model can learn that the filled value is not to be trusted in the same way as an observed one." }
    ]},

    { t: "code", lang: "python", title: "combine_first: patch the holes from a second source",
      code: `primary = pd.DataFrame({"price": [10.0, np.nan, 12.0, np.nan]}, index=["a", "b", "c", "d"])
backup  = pd.DataFrame({"price": [9.5, 11.0, 11.5, np.nan]},  index=["a", "b", "c", "d"])
print(primary.combine_first(backup).price.tolist())    # [10.0, 11.0, 12.0, nan]
# aligned on the index: primary wins wherever it has a value, the backup fills the rest -- an outer
# join followed by a coalesce. fillna(backup) does the same for matching labels; combine_first also
# keeps rows and columns that exist only in the backup.`,
      caption: "The two-frame form of `COALESCE(primary, backup)`. Right when a second feed is authoritative for the gaps in the first; wrong when the gaps are informative (6.5)."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "The sensor report that under-counts outages",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "A daily report summarises sensor readings per site. Operations say it under-reports outages and shows sites as healthy that were down for hours. Here is the code." },
        { t: "code", lang: "python", numbered: false, title: "sensor_report.py", code: `
import pandas as pd
import numpy as np

def report(readings):
    # readings: columns [site, ts, temp]; temp may be -999 when offline
    df = readings.copy()

    df = df[df["temp"] != np.nan]                    # drop missing
    df["temp"] = df["temp"].fillna(method="ffill")   # fill gaps

    df["ok"] = df["temp"] > -50                      # valid reading?

    summary = df.groupby("site").agg(
        readings=("temp", "count"),
        avg_temp=("temp", "mean"),
        pct_ok=("ok", "mean"),
    )
    summary["healthy"] = summary["pct_ok"] > 0.95
    return summary`},
        { t: "p", text: "Find every defect. For each, say what it does to the numbers. Then rewrite it so an outage is counted as an outage." }
      ],
      requirements: [
        "Identify each defect and its effect on the output.",
        "Explain why the -999 sentinel is invisible to `isna`.",
        "Explain what the comparison does with missing values.",
        "Rewrite with correct missing handling and a fill limit.",
        "Report missing counts explicitly rather than hiding them.",
        "Include tests, including one with a multi-hour outage."
      ],
      hint: "Count the rows at each step. The first line does not do what its comment says.",
      solution: {
        lang: "python",
        title: "sensor_report_fixed.py",
        code: `import pandas as pd
import numpy as np


# =========================================================================
# THE DEFECTS -- five of them
# =========================================================================
#
# 1. df["temp"] != np.nan
#    NaN is not equal to anything, including itself, so != np.nan is
#    True for EVERY row. This line drops nothing. The comment says
#    "drop missing"; the code is a no-op.
#
# 2. THE SENTINEL. Offline readings arrive as -999, which is a real
#    float. isna() does not see it, fillna does not touch it, and it
#    flows into the mean: a site with a few -999s has an average
#    temperature of -40 and looks broken in the wrong way. A site with
#    many looks like it has readings when it was offline.
#
# 3. ffill WITH NO LIMIT. A site offline for six hours has its last
#    good reading carried forward for six hours. The outage is not
#    just hidden -- it is REPLACED with plausible-looking data. This
#    is the mechanism behind "sites shown as healthy that were down".
#
#    (fillna(method=...) is also deprecated; .ffill() is the form.)
#
# 4. df["temp"] > -50 ON MISSING VALUES IS False.
#    Any NaN that survived is counted as NOT ok, which is at least
#    conservative. But after step 3 filled everything, there are no
#    NaNs left to be conservative about. And -999 > -50 is False, so
#    the sentinel rows count as not-ok -- which is accidentally right,
#    and only for rows ffill did not reach.
#
# 5. count() EXCLUDES MISSING, so "readings" is the number of
#    non-missing values -- after the fill, which means every row. The
#    metric that should show the outage shows full coverage.
#
# NET EFFECT: outages are filled with the last good value, pct_ok
# approaches 1.0, and every site is healthy.


def demonstrate():
    r = pd.DataFrame({
        "site": ["a"] * 8,
        "ts": pd.date_range("2026-01-01", periods=8, freq="h"),
        "temp": [20.0, 21.0, -999.0, np.nan, np.nan, np.nan, np.nan, 22.0],
    })
    df = r[r["temp"] != np.nan]
    return len(df)                       # 8 -- nothing dropped


# =========================================================================
# THE REWRITE
# =========================================================================

SENTINELS = [-999.0, -9999.0, 9999.0]
VALID_RANGE = (-50.0, 60.0)


def report(readings, *, max_fill=2, healthy_threshold=0.95):
    """Per-site summary that counts an outage as an outage.

    max_fill   how many consecutive missing readings may be carried
               forward from the last good one. Two hourly readings is
               a defensible "the value is probably still about right";
               six is inventing data.
    """
    df = readings.copy()
    required = {"site", "ts", "temp"}
    if missing := required - set(df.columns):
        raise KeyError(f"missing columns: {sorted(missing)}")

    df["ts"] = pd.to_datetime(df["ts"])
    df = df.sort_values(["site", "ts"])

    # STEP 1: SENTINELS BECOME MISSING. Now isna() can see them.
    df["temp"] = df["temp"].replace(SENTINELS, np.nan)

    # STEP 2: OUT-OF-RANGE BECOMES MISSING TOO, and is counted apart
    # from "no reading" because they are different failures.
    lo, hi = VALID_RANGE
    out_of_range = df["temp"].notna() & ~df["temp"].between(lo, hi)
    df["out_of_range"] = out_of_range
    df.loc[out_of_range, "temp"] = np.nan

    # STEP 3: RECORD MISSINGNESS BEFORE FILLING. This is the outage
    # signal, and filling would erase it.
    df["missing"] = df["temp"].isna()

    # STEP 4: FILL WITHIN A LIMIT, PER SITE. ffill without groupby
    # would carry site A's last reading into site B's first gap.
    df["temp_filled"] = df.groupby("site")["temp"].ffill(limit=max_fill)
    df["filled"] = df["missing"] & df["temp_filled"].notna()
    df["still_missing"] = df["temp_filled"].isna()

    # STEP 5: "ok" IS EXPLICIT ABOUT MISSING. A missing reading is not
    # ok; it is not "not ok" either -- it is absent. Counting absent as
    # not-ok is the conservative choice for a health metric, and it is
    # a choice, so it is written down.
    df["ok"] = df["temp"].notna()

    summary = df.groupby("site").agg(
        rows=("temp", "size"),                 # size counts everything
        readings=("temp", "count"),            # count excludes missing
        missing=("missing", "sum"),
        out_of_range=("out_of_range", "sum"),
        filled=("filled", "sum"),
        unrecoverable=("still_missing", "sum"),
        avg_temp=("temp", "mean"),             # over REAL readings only
        pct_ok=("ok", "mean"),
    )
    summary["pct_missing"] = summary["missing"] / summary["rows"]
    summary["healthy"] = summary["pct_ok"] >= healthy_threshold

    # THE LONGEST OUTAGE per site -- the number operations actually
    # asked for, and the one the original could never produce.
    summary["longest_gap"] = df.groupby("site")["missing"].apply(_longest_run)

    return summary


def _longest_run(flags):
    """Length of the longest consecutive True run."""
    flags = flags.to_numpy()
    if not flags.any():
        return 0
    # Positions where a run of True starts and ends.
    padded = np.concatenate([[False], flags, [False]])
    edges = np.flatnonzero(np.diff(padded.astype(int)))
    starts, ends = edges[::2], edges[1::2]
    return int((ends - starts).max())


# =========================================================================
# TESTS
# =========================================================================

def _fixture():
    return pd.DataFrame({
        "site": ["a"] * 8 + ["b"] * 8,
        "ts": list(pd.date_range("2026-01-01", periods=8, freq="h")) * 2,
        "temp": [20.0, 21.0, -999.0, np.nan, np.nan, np.nan, np.nan, 22.0,
                 18.0, 18.5, 19.0, np.nan, 19.5, 20.0, 20.5, 21.0],
    })


def test_nan_inequality_drops_nothing():
    """Defect 1: the original's filter is a no-op."""
    assert demonstrate() == 8


def test_sentinel_is_treated_as_missing():
    s = report(_fixture())

    assert s.loc["a", "missing"] == 5          # -999 plus four NaN
    assert s.loc["a", "avg_temp"] == 21.0      # (20+21+22)/3, no -999


def test_outage_is_not_filled_past_the_limit():
    s = report(_fixture(), max_fill=2)

    assert s.loc["a", "filled"] == 2
    assert s.loc["a", "unrecoverable"] == 3


def test_outage_site_is_not_healthy():
    """The original reported every site healthy."""
    s = report(_fixture())

    assert not s.loc["a", "healthy"]
    assert s.loc["b", "healthy"]


def test_longest_gap_is_reported():
    s = report(_fixture())

    assert s.loc["a", "longest_gap"] == 5
    assert s.loc["b", "longest_gap"] == 1


def test_fill_does_not_cross_sites():
    r = pd.DataFrame({
        "site": ["a", "a", "b", "b"],
        "ts": pd.date_range("2026-01-01", periods=4, freq="h"),
        "temp": [20.0, 20.0, np.nan, 19.0],
    })
    s = report(r)

    assert s.loc["b", "filled"] == 0           # site a's value not used


def test_rows_and_readings_differ_by_missing():
    s = report(_fixture())

    assert s.loc["a", "rows"] == 8
    assert s.loc["a", "readings"] == 3
    assert s.loc["a", "rows"] - s.loc["a", "readings"] == s.loc["a", "missing"]


def test_out_of_range_is_counted_separately():
    r = _fixture()
    r.loc[9, "temp"] = 150.0
    s = report(r)

    assert s.loc["b", "out_of_range"] == 1
    assert s.loc["b", "missing"] == 2          # the 150 became missing too


def test_all_missing_site_has_nan_mean_not_zero():
    r = pd.DataFrame({
        "site": ["z"] * 3,
        "ts": pd.date_range("2026-01-01", periods=3, freq="h"),
        "temp": [np.nan, -999.0, np.nan],
    })
    s = report(r)

    assert np.isnan(s.loc["z", "avg_temp"])
    assert s.loc["z", "pct_ok"] == 0.0
    assert s.loc["z", "longest_gap"] == 3


def test_longest_run_helper():
    assert _longest_run(pd.Series([False, True, True, False, True])) == 2
    assert _longest_run(pd.Series([True] * 4)) == 4
    assert _longest_run(pd.Series([False, False])) == 0`,
        notes: [
          { t: "p", text: "**`df[\"temp\"] != np.nan` is `True` for every row.** NaN is not equal to anything including itself, so the filter that says \"drop missing\" drops nothing — and because it raises no error, the comment is the only evidence of what was intended." },
          { t: "callout", kind: "trap", title: "An unlimited ffill replaces an outage with plausible data", body: [
            { t: "p", text: "A site offline for six hours has its last good reading carried forward for six hours. **The outage is not hidden; it is overwritten with numbers that look like readings.**" },
            { t: "p", text: "`limit=` is how you encode \"how long is a value still probably right\". Two hourly readings is a defensible claim; six is invention, and the report cannot tell the difference afterwards." }
          ]},
          { t: "p", text: "**The sentinel is invisible to `isna()` because −999 is a real float.** It survives `fillna`, flows into `mean`, and pulls a site's average to −40 — so the site looks broken in the wrong way, while a site with many sentinels looks like it has data when it was offline." },
          { t: "p", text: "**Record missingness before filling.** The `missing` flag is the outage signal, and it is precisely what a fill erases. Everything the summary reports about outages comes from that column, computed before any value was replaced." },
          { t: "p", text: "**`size` and `count` differ by exactly the missing count**, which makes the pair a built-in reconciliation. The original reported `count` after filling, so every row counted and coverage always looked complete." },
          { t: "p", text: "**`ffill` without `groupby` carries one site's reading into the next site's gap.** Sorting by site and time and filling within the group is the only form where the carried-forward value belongs to the same sensor." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`pd.Series([np.nan, np.nan]).sum()` returns what?",
          options: ["nan", "0.0 — skipna drops both values and sums nothing", "It raises", "None"],
          answer: 1,
          why: "The default `skipna=True` ignores missing values, and the sum of no values is zero — indistinguishable from a column that genuinely totalled zero. `sum(min_count=1)` returns `nan`, which is the honest answer when nothing was there to sum."
        }
      ]
    }
  ],

  takeaways: [
    "**The dtype decides the missing representation**: `None` becomes `NaN` in float, stays `None` in object, becomes `NaT` in datetime and `<NA>` in nullable columns.",
    "**One `None` turns an integer column into float and a boolean column into object** — check `dtypes` after every load.",
    "**`NaN != NaN`**, so `== np.nan` never matches anything and a filter written with it silently selects zero rows.",
    "**`isna()` is the only test that recognises all four representations.**",
    "**`NaN` fails every comparison; `pd.NA` propagates through them** — and a mask containing `<NA>` raises on indexing.",
    "**A high/low split on a column with missing values drops those rows from both buckets** with no warning.",
    "**`sum()` skips missing by default and an all-missing column sums to 0** — `min_count=1` makes it `nan`.",
    "**`groupby` drops missing keys, `value_counts` excludes missing, `unique` includes it** — three defaults, three behaviours.",
    "**`dropna()` with no arguments routinely removes most of a wide frame** because every row is missing something; always pass `subset`.",
    "**`ffill` uses the past; `bfill` and `interpolate` use the future** — the second two are leakage in a time-series feature.",
    "**An unlimited `ffill` replaces an outage with plausible-looking data**; `limit=` encodes how long a value stays valid.",
    "**Fill and flag**: the fact of missingness is often more predictive than any filled value, and the indicator column preserves it."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does `df[df.temp != np.nan]` fail to drop missing rows?",
        options: [
          "It needs `.loc`",
          "NaN is not equal to anything including itself, so `!= np.nan` is True for every row and nothing is dropped",
          "The column is object dtype",
          "np.nan and pd.NA are different"
        ],
        answer: 1,
        why: "IEEE 754 defines NaN as unequal to everything. Both `== np.nan` and `!= np.nan` are useless as filters — the first matches nothing, the second matches everything — and neither raises. `isna()` and `notna()` are the only correct tests."
      },
      {
        stem: "A sensor sends −999 when offline. Why does `isna()` not detect it?",
        options: [
          "isna only works on object columns",
          "−999 is a real float value — a sentinel is only missing by convention, and pandas has no way to know the convention",
          "The column must be converted to Int64 first",
          "isna requires the na_values argument"
        ],
        answer: 1,
        why: "A sentinel is a valid number that a source has agreed to treat as missing. Nothing marks it. It survives `fillna`, flows into `mean`, and drags the average to −40 — `replace(sentinels, np.nan)` is the step that makes it visible to everything downstream."
      },
      {
        stem: "Which fill method is safe in a feature for a time-series model?",
        options: [
          "`bfill`",
          "`ffill` — it uses only past values, where `bfill` and `interpolate` use the future",
          "`interpolate`",
          "All of them"
        ],
        answer: 1,
        why: "Backward fill and interpolation both look at the next known value, which at prediction time has not happened yet. The operation is the same shape; the direction is the whole difference between a feature and a leak. `ffill(limit=n)` additionally stops a stale value being carried indefinitely."
      },
      {
        stem: "`(s > 75).sum()` is 2 and `(s <= 75).sum()` is 1 on a Series of length 5. What happened to the other two?",
        options: [
          "They were exactly 75",
          "They are missing — NaN fails both comparisons, so they fall into neither bucket and no warning is raised",
          "The Series has duplicates",
          "Integer overflow"
        ],
        answer: 1,
        why: "Every comparison against NaN returns False, so a two-way split silently excludes the missing rows from both sides. If missing should be its own category, `np.select` with an explicit `isna()` condition first makes the third bucket visible."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What are the different missing-value representations in pandas and why does it matter?",
        strong: "`NaN` for floats, `None` in object columns, `NaT` for datetimes, and `pd.NA` for the nullable dtypes. It matters because they behave differently: `NaN` fails every comparison including with itself, `None` is equal to itself, and `pd.NA` propagates through comparisons as unknown. `isna()` is the only test that handles all four — `== np.nan` matches nothing.",
        answer: [
          { t: "p", text: "The `NaN != NaN` point and its practical consequence — a no-op filter — is the detail interviewers are listening for." },
          { t: "p", text: "Mentioning that one `None` widens an int column to float and a bool column to object shows you have debugged the dtype side." }
        ]
      },
      {
        level: "advanced",
        q: "How do pandas aggregations treat missing values, and where does that go wrong?",
        strong: "They skip them by default. `mean` divides by the non-missing count, `sum` of an all-missing column is 0 rather than `NaN`, `groupby` drops rows with a missing key, and `value_counts` excludes missing while `unique` includes it. The failures are all silent: a group total that does not reconcile to the column total, or a report that shows zero revenue for a region that had no data.",
        answer: [
          { t: "p", text: "Listing the inconsistencies between defaults — rather than one rule — shows real familiarity." },
          { t: "p", text: "Naming the reconciliation check (group sum against column sum) is the practical takeaway." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague fills sensor gaps with `ffill()`. What would you ask?",
        strong: "Two things: is there a limit, and is it grouped? Without a limit a six-hour outage becomes six hours of the last good reading — the outage is not hidden, it is replaced with plausible data. Without a groupby, one sensor's last value fills the next sensor's first gap. And I would record the missingness flag before filling, because the gap is usually the most informative thing about the row.",
        answer: [
          { t: "p", text: "Turning a one-liner into two concrete questions shows you know where the operation goes wrong in practice." },
          { t: "p", text: "The fill-and-flag point elevates the answer from mechanics to modelling judgement." }
        ]
      }
    ]
  }
});

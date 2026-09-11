/* ============================================================================
   LESSON 6.1 — Profiling a Dataset You Have Not Seen
   ========================================================================= */
EC.receiveLesson({
  id: "6.1",

  lede: "**The first fifteen minutes with an unfamiliar dataset decide whether the next fifteen hours are spent on analysis or on discovering, one surprise at a time, what the data actually is.** Profiling is a fixed sequence of questions — shape, types, missingness, cardinality, ranges, the checks that catch a broken export — asked before any conclusion is drawn.",

  objectives: [
    "Run a fixed profiling sequence on any tabular dataset",
    "Classify every column by what it is, not what its dtype says",
    "Read a univariate distribution and name what is unusual about it",
    "Detect the specific signatures of a broken or partial export",
    "Produce a profiling report that a colleague could act on"
  ],

  prerequisites: ["3.3", "3.4", "3.7"],

  blocks: [

    { t: "h2", n: "01", text: "The sequence", id: "sequence" },

    { t: "p", text: "Profiling is not exploration. **It is a checklist, run in the same order every time, that turns \"I have a file\" into \"I know what each column is, how much of it is missing, and what is wrong with it.\"** Exploration comes after, and it is much faster once the checklist is done." },

    { t: "dl", items: [
      ["Profiling", "A systematic first pass over a dataset to establish its structure, completeness, distributions and obvious defects — before analysis, and before any cleaning decision."],
      ["Univariate analysis", "Examining one column at a time: its type, its distribution, its missing rate, its extremes. The building block of a profile."],
      ["Cardinality", "The number of distinct values in a column. With the row count, it tells you whether a column is an identifier, a category, or a measurement."],
      ["Column role", "What a column is *for*: identifier, category, measurement, timestamp, free text, flag. The dtype hints at it and often lies."],
      ["Sanity check", "A test of something that must be true if the export is intact — row count against the source, a key that must be unique, a total that must reconcile."],
      ["Skew and kurtosis", "Asymmetry and tail weight of a distribution. A skewed measurement needs a different summary statistic and, later, a different transform."]
    ]},

    { t: "viz",
      title: "Fifteen minutes, in order",
      caption: "Each step answers one question and feeds the next. Skipping to distributions before knowing the column roles is how a timestamp gets a histogram and an identifier gets a mean.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Six profiling steps in a row: shape, types and roles, missingness, cardinality, distributions, and sanity checks, each with the question it answers">
  <g stroke-width="1.5">
    <rect x="30" y="60" width="125" height="70" rx="6" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc)"/>
    <rect x="170" y="60" width="125" height="70" rx="6" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc)"/>
    <rect x="310" y="60" width="125" height="70" rx="6" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc)"/>
    <rect x="450" y="60" width="125" height="70" rx="6" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc)"/>
    <rect x="590" y="60" width="125" height="70" rx="6" style="fill:var(--acc);fill-opacity:.12;stroke:var(--acc)"/>
    <rect x="730" y="60" width="125" height="70" rx="6" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
  </g>
  <text x="44" y="84" class="s-label" style="fill:var(--ink-2)">1 shape</text>
  <text x="44" y="106" class="s-sub" style="fill:var(--ink-3)">rows, columns,</text>
  <text x="44" y="122" class="s-sub" style="fill:var(--ink-3)">memory, head</text>
  <text x="184" y="84" class="s-label" style="fill:var(--ink-2)">2 roles</text>
  <text x="184" y="106" class="s-sub" style="fill:var(--ink-3)">dtype vs what</text>
  <text x="184" y="122" class="s-sub" style="fill:var(--ink-3)">it actually is</text>
  <text x="324" y="84" class="s-label" style="fill:var(--ink-2)">3 missing</text>
  <text x="324" y="106" class="s-sub" style="fill:var(--ink-3)">per column, and</text>
  <text x="324" y="122" class="s-sub" style="fill:var(--ink-3)">the sentinels</text>
  <text x="464" y="84" class="s-label" style="fill:var(--ink-2)">4 cardinality</text>
  <text x="464" y="106" class="s-sub" style="fill:var(--ink-3)">id, category or</text>
  <text x="464" y="122" class="s-sub" style="fill:var(--ink-3)">measurement</text>
  <text x="604" y="84" class="s-label" style="fill:var(--ink-2)">5 distributions</text>
  <text x="604" y="106" class="s-sub" style="fill:var(--ink-3)">range, skew,</text>
  <text x="604" y="122" class="s-sub" style="fill:var(--ink-3)">top values</text>
  <text x="744" y="84" class="s-label" style="fill:var(--ink-2)">6 sanity</text>
  <text x="744" y="106" class="s-sub" style="fill:var(--ink-3)">what must be</text>
  <text x="744" y="122" class="s-sub" style="fill:var(--ink-3)">true, tested</text>

  <g style="stroke:var(--ink-3);stroke-width:1.2">
    <line x1="155" y1="95" x2="170" y2="95" marker-end="url(#pf-a)"/>
    <line x1="295" y1="95" x2="310" y2="95" marker-end="url(#pf-a)"/>
    <line x1="435" y1="95" x2="450" y2="95" marker-end="url(#pf-a)"/>
    <line x1="575" y1="95" x2="590" y2="95" marker-end="url(#pf-a)"/>
    <line x1="715" y1="95" x2="730" y2="95" marker-end="url(#pf-a)"/>
  </g>

  <text x="30" y="180" class="s-sub" style="fill:var(--ink-3)">Step 2 decides what steps 4 and 5 mean: a histogram of an identifier is noise; a mean of a category code is nonsense.</text>
  <text x="30" y="204" class="s-sub" style="fill:var(--ink-3)">Step 3 comes before 5 because the sentinels found there — −999, "N/A", 9999 — would otherwise appear as outliers.</text>
  <text x="30" y="228" class="s-sub" style="fill:var(--ink-3)">Step 6 is the one that gets skipped, and the one that catches the export that stopped at row 400,000.</text>

  <line x1="30" y1="252" x2="850" y2="252" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="278" class="s-sub" style="fill:var(--ink-3)">Output: one report, per column, that says what it is, how complete it is, and what is wrong. Analysis starts after that.</text>

  <defs><marker id="pf-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/></marker></defs>
</svg>`
    },

    { t: "code", lang: "python", title: "steps 1 to 3: shape, roles and missingness", code: `
import pandas as pd
import numpy as np

df = pd.read_csv("unknown.csv", dtype=str, keep_default_na=False)
#
# STEP 0, BEFORE ANYTHING: READ EVERYTHING AS STRING. Type inference
# is a decision, and you have not made it yet. dtype=str keeps leading
# zeros, keeps "N/A" as text so you can SEE it, and stops a blank from
# floating an integer column. You will convert deliberately in step 2.

# STEP 1: SHAPE
df.shape                              # (412_883, 34)
df.memory_usage(deep=True).sum() / 1e6
df.head(3).T                          # transposed: 34 rows of 3 values
#                                       is readable; 3 rows of 34 is not
df.sample(5, random_state=0).T        # head() shows the first rows,
#                                       which are often unrepresentative
#                                       (test data, the oldest records)
df.tail(3).T                          # the last rows: is the export
#                                       truncated? Is there a totals row?

# STEP 2: ROLES -- what each column IS, from its content
def classify(s, n):
    """Guess a column's role from its values. Guess, then confirm."""
    nn = s[s.str.strip() != ""]
    if len(nn) == 0:
        return "empty"
    nun = nn.nunique()
    ratio = nun / len(nn)

    if nun == 1:
        return "constant"
    if ratio > 0.98:
        return "identifier"               # nearly every value distinct
    if nn.str.fullmatch(r"-?\\d+").mean() > 0.95:
        return "integer"
    if nn.str.fullmatch(r"-?\\d*\\.\\d+([eE][-+]?\\d+)?").mean() > 0.95:
        return "float"
    if pd.to_datetime(nn.head(500), errors="coerce").notna().mean() > 0.9:
        return "datetime"
    if nun <= 2 and set(nn.str.lower().unique()) <= {"0","1","true","false","y","n","yes","no"}:
        return "flag"
    if nun <= 50:
        return "category"
    if nn.str.len().mean() > 40:
        return "free text"
    return "high-cardinality string"

roles = {c: classify(df[c], len(df)) for c in df.columns}
pd.Series(roles).value_counts()
#
# THE ROLE DECIDES EVERYTHING AFTER THIS. An "integer" column that is
# an identifier gets no histogram; a "category" with 50 values gets
# a frequency table, not a mean. And the guess is checked against
# the column NAME and your knowledge of the source -- "customer_id"
# classified as "float" means something is wrong with the data.

# STEP 3: MISSINGNESS -- including the sentinels
def missing_report(df):
    out = []
    SENTINELS = {"", "NA", "N/A", "NULL", "null", "None", "none", "-", "--",
                 "?", ".", "nan", "NaN", "-999", "-9999", "9999", "0000-00-00"}
    for c in df.columns:
        s = df[c]
        blank = (s.str.strip() == "").sum()
        sentinel = s.isin(SENTINELS - {""}).sum()
        out.append({"column": c,
                    "blank": blank,
                    "sentinel": sentinel,
                    "sentinel_values": sorted(s[s.isin(SENTINELS - {""})].unique())[:5],
                    "missing_pct": round(100 * (blank + sentinel) / len(df), 2)})
    return pd.DataFrame(out).sort_values("missing_pct", ascending=False)

missing_report(df).head(10)
#
# Blank and sentinel are reported SEPARATELY, because they are
# different facts: a blank is "no value was written"; "-999" is "a
# value was written that means no value". The second tells you about
# the source system; the first does not.
#
# A column at 100% missing is a column that should not exist.
# A column at 0.1% missing has a story -- which rows, and why?
# A column at 40% missing needs a decision before it can be used
# (see 6.5).

# THE MISSINGNESS PATTERN -- do columns go missing TOGETHER?
miss = df.apply(lambda s: s.str.strip() == "")
miss.sum(axis=1).value_counts().sort_index()
#   0     380,000     <- most rows complete
#   1      28,000
#   12      4,883     <- 4,883 rows missing TWELVE columns at once
#
# Rows missing many columns at once are a different population --
# a second source, a partial record type, a truncated import. They
# are not "rows with some missing values"; they are a structural
# feature of the data, and they get their own row in the report.
miss[miss.sum(axis=1) == 12].sum().sort_values(ascending=False).head(12)
#   -> which twelve columns, together
`,
      hl: [4, 29, 51, 82],
      caption: "**Read everything as string first.** Type inference is a decision you have not yet made — `dtype=str` keeps the sentinels visible so step 3 can find them, instead of letting the parser turn `-999` into a number you will later call an outlier."
    },

    { t: "callout", kind: "insight", title: "Rows that are missing twelve columns are not rows with missing values", body: [
      { t: "p", text: "A missing-rate per column tells you how much of each column is absent. It does not tell you that 4,883 rows are missing the *same* twelve columns — which almost always means those rows came from a different source, a different record type, or an import that broke partway." },
      { t: "p", text: "**Count missing values per row, and look at the distribution.** A spike at a specific count is a population, not noise, and it gets its own line in the report before anyone imputes anything." },
      { t: "p", text: "Those rows will also distort every per-column statistic. Profiling them separately is the only way to see the rest of the data clearly." }
    ]},

    { t: "h2", n: "02", text: "Cardinality and distributions", id: "distributions" },

    { t: "code", lang: "python", title: "steps 4 and 5: what each column contains, by role", code: `
# CONVERT DELIBERATELY, now that roles are known:
typed = df.copy()
for c, role in roles.items():
    s = df[c].replace({"": np.nan, "NA": np.nan, "N/A": np.nan, "-999": np.nan})
    if role == "integer":
        typed[c] = pd.to_numeric(s, errors="coerce").astype("Int64")
    elif role == "float":
        typed[c] = pd.to_numeric(s, errors="coerce")
    elif role == "datetime":
        typed[c] = pd.to_datetime(s, errors="coerce")
    elif role in ("category", "flag"):
        typed[c] = s.astype("category")
    else:
        typed[c] = s.astype("string")
#
# errors="coerce" turns anything unparseable into NaN. COUNT them:
for c, role in roles.items():
    if role in ("integer", "float", "datetime"):
        before = (df[c].str.strip() != "").sum()
        after = typed[c].notna().sum()
        if before != after:
            print(f"{c}: {before - after} values failed to parse as {role}")
#
# A column that is 98% integers and 2% "12abc" has a story. The 2%
# is either garbage to drop or a format you have not understood.

# STEP 4: CARDINALITY, PER ROLE
card = pd.DataFrame({
    "role": pd.Series(roles),
    "nunique": typed.nunique(),
    "n": typed.notna().sum(),
})
card["ratio"] = (card["nunique"] / card["n"]).round(4)
card.sort_values("ratio")
#
# READING IT:
#   ratio ~1.0, role identifier  -> a key. Check uniqueness (step 6).
#   ratio ~1.0, role float       -> a measurement. Normal.
#   ratio ~1.0, role string      -> free text, or an id you misclassified
#   ratio ~0.0, nunique 1        -> constant. Drop it; it carries nothing.
#   ratio ~0.0, nunique 2-50     -> a category. Frequency table next.
#   nunique 51-500, string       -> high cardinality: a code, a city, a
#                                   product. Needs encoding thought (7.1).

# STEP 5a: CATEGORIES -- the frequency table, and what to look for
for c in card[card["role"].isin(["category", "flag"])].index:
    vc = typed[c].value_counts(dropna=False)
    print(f"\\n{c}: {len(vc)} values")
    print(vc.head(10))
    print(f"  top value share: {vc.iloc[0] / vc.sum():.1%}")
    rare = (vc < 0.001 * vc.sum()).sum()
    print(f"  values under 0.1%: {rare}")
#
# WHAT THE TABLE SHOWS:
#   - a dominant value at 95%+     -> near-constant; low information
#   - many values under 0.1%       -> a long tail; rare-label problem (7.1)
#   - "North", "north", "NORTH"    -> normalisation needed (4.5)
#   - "Unknown", "Other", "TBC"    -> missing values wearing a category
#   - a value that is a number     -> a code, or a corrupted row

# STEP 5b: MEASUREMENTS -- describe, then the things describe hides
num = typed.select_dtypes("number")
desc = num.describe(percentiles=[.01, .05, .25, .5, .75, .95, .99]).T
desc["skew"] = num.skew()
desc["kurt"] = num.kurt()
desc["zeros"] = (num == 0).sum()
desc["negative"] = (num < 0).sum()
desc[["count", "mean", "50%", "std", "min", "1%", "99%", "max", "skew", "zeros", "negative"]]
#
# WHAT TO LOOK FOR:
#   mean far from median     -> skew. The mean is not the typical value.
#   min or max implausible   -> a sentinel that escaped, or an error
#   99% far from max         -> a few extreme values; outlier work (6.7)
#   many zeros               -> a zero-inflated quantity, or missing
#                               coded as 0
#   negatives where none     -> a sign error, a refund column mixed in
#   should exist
#   skew > 2                 -> a log transform candidate (7.5)
#   kurt > 10                -> heavy tails; the std is unreliable

# A QUICK TEXT HISTOGRAM, for the columns that need a look:
def hist(s, bins=15, width=40):
    s = s.dropna()
    counts, edges = np.histogram(s, bins=bins)
    for c, lo in zip(counts, edges):
        print(f"{lo:12.2f} | {'#' * int(width * c / counts.max()):<{width}} {c}")

hist(typed["amount"])
#
# Not a chart. A shape you can see in a terminal or a log file, which
# is where profiling output usually ends up.

# STEP 5c: TIMESTAMPS
for c in card[card["role"] == "datetime"].index:
    s = typed[c].dropna()
    print(c, s.min(), "->", s.max())
    print("  span:", s.max() - s.min())
    print("  by year:", s.dt.year.value_counts().sort_index().to_dict())
    print("  weekday share:", round((s.dt.dayofweek < 5).mean(), 3))
    print("  midnight share:", round((s.dt.time == pd.Timestamp("00:00").time()).mean(), 3))
#
# span              a 1970 date is an epoch-zero sentinel
# by year           a gap year is a missing extract
# weekday share     a business dataset with 30% weekend rows is odd
# midnight share    90% at 00:00:00 means the times are dates with
#                   a fake time -- do not build hour features
`,
      hl: [16, 40, 66, 96],
      caption: "**`describe()` hides skew, zeros and negatives.** A mean far from the median, a minimum that is implausible, and a 99th percentile far from the maximum are the three signals that the summary statistics will mislead."
    },

    { t: "h2", n: "03", text: "The checks that catch a broken export", id: "sanity" },

    { t: "p", text: "**Everything above describes the data. This step tests it.** Every dataset has facts that must be true if the export is intact — and a broken export passes every descriptive check while failing these." },

    { t: "table",
      head: ["Check", "How", "What a failure means"],
      rows: [
        ["Row count against the source", "`len(df)` vs `SELECT COUNT(*)` or the previous extract", "Truncated, filtered, or duplicated during export"],
        ["Key uniqueness", "`df[key].is_unique`, `duplicated().sum()`", "A join will multiply; the export repeated rows"],
        ["Key completeness", "`df[key].isna().sum() == 0`", "Rows with no identity — orphans or a parse failure"],
        ["Referential integrity", "Foreign keys all present in the parent table", "Orphaned child rows; the parent extract is older"],
        ["Date range", "`min`, `max` against the expected window", "Stale extract, or a future date from a sentinel"],
        ["Totals reconcile", "`amount.sum()` against a known figure", "Rows missing or doubled; a unit change"],
        ["Row-level invariants", "`end >= start`, `qty > 0`, `total == price * qty`", "Logic errors in the source, or column swaps"],
        ["Column set", "Exact match to the expected schema", "Renamed, added or dropped columns upstream"],
        ["Distribution drift", "Key statistics vs the last extract", "The source changed; the pipeline did not"]
      ],
      caption: "**A truncated export passes every descriptive check.** The distributions look fine, the types are right, and 40% of the rows are missing. Only a count against the source catches it."
    },

    { t: "code", lang: "python", title: "step 6: assertions, with the numbers that fail", code: `
def sanity(df, *, key, expected_rows=None, date_col=None, date_window=None,
           invariants=None, reference_totals=None, tol=0.001):
    """Return a list of (check, passed, detail). Never raises: the
    report should show every failure, not stop at the first."""
    results = []

    def check(name, ok, detail=""):
        results.append({"check": name, "passed": bool(ok), "detail": detail})

    # ROW COUNT
    if expected_rows is not None:
        diff = len(df) - expected_rows
        check("row_count", abs(diff) <= tol * expected_rows,
              f"{len(df):,} rows, expected {expected_rows:,} ({diff:+,})")

    # KEY
    check("key_present", df[key].notna().all(),
          f"{df[key].isna().sum():,} rows with missing {key}")
    dupes = df[key].duplicated().sum()
    check("key_unique", dupes == 0,
          f"{dupes:,} duplicate {key} values; e.g. "
          f"{df.loc[df[key].duplicated(), key].head(3).tolist()}")

    # DATES
    if date_col and date_window:
        lo, hi = pd.Timestamp(date_window[0]), pd.Timestamp(date_window[1])
        d = df[date_col].dropna()
        out = ((d < lo) | (d > hi)).sum()
        check("date_window", out == 0,
              f"{out:,} rows outside [{lo.date()}, {hi.date()}]; "
              f"range is {d.min()} to {d.max()}")

    # INVARIANTS -- each a callable returning a boolean Series
    for name, fn in (invariants or {}).items():
        try:
            mask = fn(df)
            bad = (~mask.fillna(False)).sum()
            check(f"invariant:{name}", bad == 0,
                  f"{bad:,} rows violate; e.g. rows {df.index[~mask.fillna(False)][:3].tolist()}")
        except Exception as e:
            check(f"invariant:{name}", False, f"could not evaluate: {e}")

    # REFERENCE TOTALS
    for col, expected in (reference_totals or {}).items():
        actual = df[col].sum()
        rel = abs(actual - expected) / max(abs(expected), 1e-9)
        check(f"total:{col}", rel <= tol,
              f"{actual:,.2f} vs expected {expected:,.2f} ({rel:.2%} off)")

    return pd.DataFrame(results)


report = sanity(
    typed,
    key="order_id",
    expected_rows=412_883,
    date_col="order_date",
    date_window=("2025-01-01", "2026-03-31"),
    invariants={
        "qty_positive":      lambda d: d["quantity"] > 0,
        "total_is_price_qty": lambda d: np.isclose(d["total"], d["price"] * d["quantity"], atol=0.01),
        "ship_after_order":  lambda d: d["ship_date"] >= d["order_date"],
    },
    reference_totals={"total": 84_213_990.55},
)
report[~report["passed"]]
#
#              check  passed                                       detail
#  invariant:ship_after_order   False   1,204 rows violate; e.g. rows [88, 401, ...]
#              total:total      False   83,900,112.10 vs expected 84,213,990.55 (0.37% off)
#
# TWO FAILURES. The report says how many and where. Whether either
# is a data defect or a wrong expectation is the next conversation --
# but it is a conversation about specific rows, not a feeling that
# something is off.

# DRIFT AGAINST THE PREVIOUS EXTRACT -- the check that catches a
# source change:
def drift(current, previous, cols):
    rows = []
    for c in cols:
        a, b = current[c].dropna(), previous[c].dropna()
        rows.append({
            "column": c,
            "mean_now": a.mean(), "mean_prev": b.mean(),
            "mean_shift_sd": (a.mean() - b.mean()) / (b.std() or 1),
            "missing_now": current[c].isna().mean(),
            "missing_prev": previous[c].isna().mean(),
            "nunique_now": a.nunique(), "nunique_prev": b.nunique(),
        })
    return pd.DataFrame(rows)
#
# A mean that shifted by two standard deviations, a missing rate that
# doubled, a cardinality that halved: each is a source change that
# nothing in the current file alone would reveal. Keep the previous
# profile; compare to it.
`,
      hl: [4, 40, 62, 80],
      caption: "**The sanity report never raises.** It shows every failure with the count and example rows, because a profile that stops at the first problem tells you one thing about a file that may have five things wrong with it."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A profiler that produces a report someone can act on",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Build the profiling function you would run on every new dataset. It takes a file path and optional expectations, and returns a structured report — per-column roles, missingness, cardinality, distribution summaries — plus the sanity results, plus a list of *findings*: specific, prioritised statements about what looks wrong." },
        { t: "p", text: "Test it on a generated dataset with known defects, and check that it finds each one." }
      ],
      requirements: [
        "Read as string first; convert by inferred role.",
        "Per-column: role, missing (blank and sentinel separately), cardinality ratio, and a role-appropriate summary.",
        "Detect the row-level missingness pattern (rows missing many columns at once).",
        "Run the sanity checks given as expectations.",
        "Emit findings ranked by severity, each naming the column and the evidence.",
        "Include tests: one per planted defect."
      ],
      hint: "A finding is a sentence a colleague could verify in one query. \"amount: 2.1% of values are −999, a sentinel that would read as an outlier\" is a finding. \"amount looks odd\" is not.",
      solution: {
        lang: "python",
        title: "profiler.py",
        code: `import pandas as pd
import numpy as np


SENTINELS = {"NA", "N/A", "NULL", "null", "None", "none", "-", "--", "?",
             ".", "nan", "NaN", "-999", "-9999", "9999", "0000-00-00", "1970-01-01"}


# =========================================================================
# ROLE INFERENCE
# =========================================================================

def infer_role(s):
    nn = s[s.str.strip() != ""]
    nn = nn[~nn.isin(SENTINELS)]
    if len(nn) == 0:
        return "empty"
    nun = nn.nunique()
    ratio = nun / len(nn)
    if nun == 1:
        return "constant"
    if nn.str.fullmatch(r"-?\\d+").mean() > 0.95:
        return "identifier" if ratio > 0.98 else "integer"
    if nn.str.fullmatch(r"-?\\d*\\.\\d+([eE][-+]?\\d+)?").mean() > 0.95:
        return "float"
    if pd.to_datetime(nn.head(500), errors="coerce", format="mixed").notna().mean() > 0.9:
        return "datetime"
    lowered = set(nn.str.lower().unique())
    if nun <= 2 and lowered <= {"0", "1", "true", "false", "y", "n", "yes", "no", "t", "f"}:
        return "flag"
    if ratio > 0.98:
        return "identifier"
    if nun <= 50:
        return "category"
    if nn.str.len().mean() > 40:
        return "free_text"
    return "high_cardinality"


def convert(s, role):
    s = s.replace({"": np.nan}).mask(s.isin(SENTINELS))
    if role in ("integer",):
        return pd.to_numeric(s, errors="coerce").astype("Int64")
    if role == "float":
        return pd.to_numeric(s, errors="coerce")
    if role == "datetime":
        return pd.to_datetime(s, errors="coerce", format="mixed")
    if role in ("category", "flag"):
        return s.astype("category")
    return s.astype("string")


# =========================================================================
# THE PROFILE
# =========================================================================

def profile(path_or_df, *, key=None, expected_rows=None, invariants=None,
            reference_totals=None):
    raw = (pd.read_csv(path_or_df, dtype=str, keep_default_na=False)
           if isinstance(path_or_df, str) else path_or_df.astype(str))
    n = len(raw)
    findings = []

    def finding(severity, column, text):
        findings.append({"severity": severity, "column": column, "finding": text})

    # --- PER COLUMN ------------------------------------------------------
    columns = []
    typed = pd.DataFrame(index=raw.index)
    for c in raw.columns:
        s = raw[c]
        role = infer_role(s)
        blank = int((s.str.strip() == "").sum())
        sent = s[s.isin(SENTINELS)]
        n_sent = int(len(sent))
        missing_pct = 100 * (blank + n_sent) / n if n else 0

        typed[c] = convert(s, role)
        nn = typed[c].dropna()
        nun = int(nn.nunique())
        row = {"column": c, "role": role, "blank": blank, "sentinel": n_sent,
               "sentinel_values": sorted(sent.unique().tolist())[:3],
               "missing_pct": round(missing_pct, 2), "nunique": nun,
               "ratio": round(nun / len(nn), 4) if len(nn) else 0.0}

        # ROLE-APPROPRIATE SUMMARY
        if role in ("integer", "float") and len(nn):
            q = nn.quantile([.01, .5, .99])
            row.update({"min": float(nn.min()), "p01": float(q[.01]),
                        "median": float(q[.5]), "mean": float(nn.mean()),
                        "p99": float(q[.99]), "max": float(nn.max()),
                        "skew": float(nn.skew()) if len(nn) > 2 else 0.0,
                        "zeros": int((nn == 0).sum()), "negative": int((nn < 0).sum())})
            # PARSE FAILURES
            expected = n - blank - n_sent
            failed = expected - len(nn)
            if failed > 0:
                finding("high", c, f"{failed:,} values could not be parsed as {role}")
            if abs(row["skew"]) > 2:
                finding("low", c, f"skew {row['skew']:.1f}: the mean ({row['mean']:.2f}) "
                                  f"is not the typical value (median {row['median']:.2f})")
            if row["max"] > row["p99"] * 10 and row["p99"] > 0:
                finding("medium", c, f"max {row['max']:,.0f} is >10x the 99th percentile "
                                     f"{row['p99']:,.0f}: extreme values or an escaped sentinel")
        elif role in ("category", "flag") and len(nn):
            vc = nn.value_counts()
            row.update({"top": str(vc.index[0]), "top_share": round(float(vc.iloc[0] / len(nn)), 4),
                        "rare_values": int((vc < 0.001 * len(nn)).sum())})
            if row["top_share"] > 0.95:
                finding("low", c, f"{row['top_share']:.0%} of values are '{row['top']}': near-constant")
            lowered = nn.astype(str).str.lower().str.strip().nunique()
            if lowered < nun:
                finding("medium", c, f"{nun} distinct values collapse to {lowered} after "
                                     "case/whitespace normalisation")
        elif role == "datetime" and len(nn):
            row.update({"min": str(nn.min().date()), "max": str(nn.max().date()),
                        "midnight_share": round(float((nn.dt.hour == 0).mean()), 3)})
            if nn.min().year <= 1971:
                finding("high", c, f"earliest value {nn.min().date()}: an epoch-zero sentinel")

        if n_sent:
            finding("high", c, f"{n_sent:,} sentinel values ({row['sentinel_values']}) "
                               f"that would read as real data")
        if role == "constant":
            finding("low", c, "constant: carries no information")
        if role == "empty":
            finding("medium", c, "entirely empty")
        if missing_pct > 40:
            finding("medium", c, f"{missing_pct:.0f}% missing: needs a decision before use")

        columns.append(row)

    # --- ROW-LEVEL MISSINGNESS PATTERN ------------------------------------
    miss_per_row = typed.isna().sum(axis=1)
    pattern = miss_per_row.value_counts().sort_index()
    big = pattern[pattern.index >= 5]
    if len(big) and big.sum() > 0.005 * n:
        k = int(big.index[big.argmax()])
        cols = typed.columns[typed[miss_per_row == k].isna().all()].tolist()
        finding("high", "(rows)", f"{int(big.sum()):,} rows are missing {k}+ columns at once "
                                  f"(e.g. {cols[:4]}): a separate population, not scattered gaps")

    # --- SANITY ----------------------------------------------------------
    sanity = []
    if key and key in typed:
        d = int(typed[key].duplicated().sum())
        m = int(typed[key].isna().sum())
        sanity.append({"check": "key_unique", "passed": d == 0, "detail": f"{d:,} duplicates"})
        sanity.append({"check": "key_present", "passed": m == 0, "detail": f"{m:,} missing"})
        if d:
            finding("high", key, f"{d:,} duplicate keys: a join on this will multiply rows")
    if expected_rows is not None:
        ok = abs(n - expected_rows) <= 0.001 * expected_rows
        sanity.append({"check": "row_count", "passed": ok,
                       "detail": f"{n:,} vs {expected_rows:,}"})
        if not ok:
            finding("high", "(rows)", f"{n:,} rows against {expected_rows:,} expected "
                                      f"({n - expected_rows:+,}): truncated or duplicated export")
    for name, fn in (invariants or {}).items():
        try:
            mask = fn(typed).fillna(False)
            bad = int((~mask).sum())
            sanity.append({"check": name, "passed": bad == 0, "detail": f"{bad:,} violations"})
            if bad:
                finding("high", "(invariant)", f"{name}: {bad:,} rows violate")
        except Exception as e:
            sanity.append({"check": name, "passed": False, "detail": str(e)})
    for col, expected in (reference_totals or {}).items():
        actual = float(typed[col].sum())
        rel = abs(actual - expected) / max(abs(expected), 1e-9)
        sanity.append({"check": f"total:{col}", "passed": rel <= 0.001,
                       "detail": f"{actual:,.2f} vs {expected:,.2f}"})
        if rel > 0.001:
            finding("high", col, f"total {actual:,.2f} is {rel:.2%} from reference {expected:,.2f}")

    order = {"high": 0, "medium": 1, "low": 2}
    findings.sort(key=lambda f: (order[f["severity"]], f["column"]))

    return {
        "shape": (n, len(raw.columns)),
        "columns": pd.DataFrame(columns),
        "typed": typed,
        "missing_pattern": pattern,
        "sanity": pd.DataFrame(sanity),
        "findings": pd.DataFrame(findings),
    }


# =========================================================================
# TESTS -- one planted defect each
# =========================================================================

def _base(n=2000, seed=0):
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "order_id": np.arange(1, n + 1),
        "customer_id": rng.integers(1, 400, n),
        "region": rng.choice(["north", "south", "east", "west"], n),
        "amount": rng.lognormal(4, 0.5, n).round(2),
        "quantity": rng.integers(1, 10, n),
        "order_date": pd.date_range("2026-01-01", periods=n, freq="h").strftime("%Y-%m-%d %H:%M"),
        "note": "ok",
    })


def _findings(p, col=None):
    f = p["findings"]
    return f[f["column"] == col]["finding"].tolist() if col else f["finding"].tolist()


def test_clean_data_has_few_findings():
    p = profile(_base(), key="order_id")
    assert not any("sentinel" in f for f in _findings(p))
    assert p["sanity"]["passed"].all()


def test_sentinel_is_found_and_not_treated_as_a_number():
    df = _base(); df.loc[:41, "amount"] = -999
    p = profile(df)
    assert any("42 sentinel" in f for f in _findings(p, "amount"))
    assert p["typed"]["amount"].min() > 0            # not -999


def test_duplicate_key():
    df = pd.concat([_base(), _base().head(10)])
    p = profile(df, key="order_id")
    assert any("10 duplicate keys" in f for f in _findings(p, "order_id"))


def test_truncated_export():
    p = profile(_base(n=1200), expected_rows=2000)
    assert any("truncated" in f for f in _findings(p, "(rows)"))


def test_case_variants_in_a_category():
    df = _base(); df.loc[:99, "region"] = "North"
    p = profile(df)
    assert any("collapse to 4" in f for f in _findings(p, "region"))


def test_row_level_missingness_pattern():
    df = _base().astype(str)
    df.loc[:59, ["region", "amount", "quantity", "note", "customer_id"]] = ""
    p = profile(df)
    assert any("60 rows are missing 5+ columns" in f for f in _findings(p, "(rows)"))


def test_epoch_zero_date():
    df = _base(); df.loc[:4, "order_date"] = "1970-01-01 00:00"
    p = profile(df)
    assert any("epoch-zero" in f or "sentinel" in f for f in _findings(p, "order_date"))


def test_constant_column():
    p = profile(_base())
    assert any("constant" in f for f in _findings(p, "note"))


def test_invariant_violation():
    df = _base(); df.loc[:9, "quantity"] = 0
    p = profile(df, invariants={"qty_positive": lambda d: d["quantity"] > 0})
    assert any("qty_positive: 10 rows" in f for f in _findings(p, "(invariant)"))


def test_reference_total_mismatch():
    df = _base()
    p = profile(df, reference_totals={"amount": df["amount"].sum() * 1.1})
    assert any("from reference" in f for f in _findings(p, "amount"))


def test_extreme_value_flagged():
    df = _base(); df.loc[0, "amount"] = 5_000_000
    p = profile(df)
    assert any(">10x the 99th" in f for f in _findings(p, "amount"))


def test_findings_are_ranked():
    df = pd.concat([_base(), _base().head(5)])      # high: dup key
    df.loc[:41, "amount"] = -999                    # high: sentinel
    p = profile(df, key="order_id")
    sev = p["findings"]["severity"].tolist()
    assert sev == sorted(sev, key=lambda s: {"high": 0, "medium": 1, "low": 2}[s])`,
        notes: [
          { t: "p", text: "**A finding is a sentence someone could verify in one query.** \"amount: 42 sentinel values (−999) that would read as real data\" names the column, the count and the consequence; \"amount looks odd\" names nothing. The findings list is the profile's output — the tables are its evidence." },
          { t: "callout", kind: "insight", title: "Sentinels are found before conversion, or they become outliers", body: [
            { t: "p", text: "Reading as string and checking for `-999` *before* `to_numeric` is what lets the profiler say \"42 sentinel values\" rather than \"minimum is −999, which is odd\". **The test asserts the typed minimum is positive** — the sentinel never became a number." },
            { t: "p", text: "The same ordering finds `1970-01-01` as an epoch-zero placeholder rather than as the dataset's earliest date." }
          ]},
          { t: "p", text: "**Row-level missingness is its own finding.** Sixty rows missing the same five columns are a population — a second source, a partial record type — and the profiler names the columns so the next question (\"where did these come from?\") is answerable." },
          { t: "p", text: "**The profiler never raises.** Every check appends to the report; a file with five things wrong produces five findings, not one exception. Severity ordering puts the join-multiplying duplicate key above the near-constant column." },
          { t: "p", text: "**Each planted defect has a test that asserts the specific finding text.** A profiler that \"finds problems\" is untestable; one that says \"10 duplicate keys\" can be checked against ten planted duplicates." },
          { t: "p", text: "**The case-variant check is a cheap normalisation test**: if distinct values collapse under lowercasing, the groupby is currently splitting one category into several. It is the profile's job to say so before anyone counts regions." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why read an unfamiliar CSV with `dtype=str` before profiling?",
          options: [
            "It is faster",
            "Type inference is a decision you have not made yet — strings keep leading zeros and keep sentinels like −999 visible as text rather than turning them into outliers",
            "pandas requires it",
            "Strings use less memory"
          ],
          answer: 1,
          why: "Letting the parser infer types before you know the column roles means an identifier loses its zeros, a blank floats an integer column, and a sentinel becomes a plausible number. Profile first, then convert deliberately by role, and count what fails to parse."
        }
      ]
    }
  ],

  takeaways: [
    "**Profiling is a checklist, not exploration**: shape, roles, missingness, cardinality, distributions, sanity — in that order, every time.",
    "**Read as string first.** Type inference is a decision, and the sentinels it would hide are what step 3 needs to find.",
    "**A column's role — identifier, category, measurement, timestamp — decides what every later statistic means.** The dtype hints and often lies.",
    "**`head()` shows the oldest, often unrepresentative rows; `sample()` and `tail()` show the rest** — and the tail is where a truncated export or a totals row lives.",
    "**Report blank and sentinel missingness separately**; they are different facts about the source.",
    "**Count missing values per row.** A spike at a specific count is a population, not scattered gaps.",
    "**Convert by role with `errors=\"coerce\"`, and count what failed** — 2% unparseable is a story.",
    "**Cardinality ratio classifies**: ~1 is an identifier or measurement, ~0 with one value is a constant, 2–50 is a category.",
    "**`describe()` hides skew, zeros and negatives** — add them; mean far from median means the summary will mislead.",
    "**A timestamp column where 90% of times are midnight is a date column** — do not build hour features from it.",
    "**A truncated export passes every descriptive check.** Only a count against the source catches it.",
    "**The sanity report never raises** — it shows every failure with a count and example rows.",
    "**A finding is a sentence a colleague could verify in one query**, naming the column, the count and the consequence."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A missing-rate table shows twelve columns each 1.2% missing. What does it not tell you?",
        options: [
          "Which columns are missing",
          "Whether those twelve columns are missing on the same 1.2% of rows — a distinct population — or scattered independently",
          "The total missing count",
          "The dtype of each column"
        ],
        answer: 1,
        why: "Per-column rates cannot distinguish scattered gaps from a block of rows that lost twelve fields together. Count missing values per row: a spike at twelve is a second source, a partial record type or a broken import, and it gets its own finding before anything is imputed."
      },
      {
        stem: "A column of order timestamps shows 90% of values at exactly 00:00:00. What should you conclude?",
        options: [
          "Most orders happen at midnight",
          "The source stores dates, not datetimes, and a fake midnight was added — hour-of-day features from this column are meaningless",
          "The timezone is wrong",
          "The data is sorted"
        ],
        answer: 1,
        why: "A real time column has a spread of times. A spike at midnight is a date with a placeholder time. The 10% that are not midnight are worth a look too — they may be a different source that does record time."
      },
      {
        stem: "Every distribution looks plausible, every type is right, and the file has 60% of the rows it should. Which check catches this?",
        options: [
          "describe()",
          "A row count against the source system or the previous extract",
          "value_counts on the key",
          "Missingness per column"
        ],
        answer: 1,
        why: "A truncated export is internally consistent. Nothing about the data that is present reveals the data that is absent — only an external expectation does. That is why sanity checks are a separate step and why they need a reference outside the file."
      },
      {
        stem: "Which of these is a finding, in the sense the profiler should emit?",
        options: [
          "\"amount looks a bit off\"",
          "\"amount: 42 values are −999, a sentinel that would read as an outlier\"",
          "\"check the amount column\"",
          "\"amount has a low mean\""
        ],
        answer: 1,
        why: "A finding names the column, gives the count, and states the consequence — something a colleague could verify with one query and act on. The others are feelings. A profiler's value is measured by how many of its outputs are the first kind."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "You are handed a CSV you have never seen. What do you do in the first fifteen minutes?",
        strong: "Read it as strings, so nothing is inferred yet. Shape, head, sample and tail. Then classify each column's role from its content — identifier, category, measurement, timestamp — because that decides what every later statistic means. Then missingness, blank and sentinel separately, and per row as well as per column. Then cardinality and role-appropriate summaries. Then the sanity checks: row count against the source, key uniqueness, date range, and any invariant that must hold.",
        answer: [
          { t: "p", text: "Giving it as a fixed sequence rather than \"I'd look around\" is the whole answer. The sentinel-before-conversion ordering is the detail that shows you have done it." }
        ]
      },
      {
        level: "advanced",
        q: "What can a profile of a single file not tell you?",
        strong: "Whether it is complete. A truncated export is internally consistent — the distributions are fine, the types are right, and 40% of the rows are gone. Only a count against the source or the previous extract catches it. The same applies to drift: a mean that moved two standard deviations since last month is invisible without last month's profile. So I keep the previous profile and diff against it.",
        answer: [
          { t: "p", text: "Naming the limit of the method — and the external reference that closes it — is what makes this a senior answer." }
        ]
      },
      {
        level: "advanced",
        q: "How would you make profiling output useful to someone who was not in the room?",
        strong: "By emitting findings, not tables. A finding names the column, gives a count, and states the consequence — \"order_id: 10 duplicate keys; a join on this will multiply rows\". It is a sentence someone can verify with one query. The tables are the evidence behind it. Ranked by severity, so the duplicate key comes before the near-constant column, and tested: each planted defect in a fixture must produce its specific finding.",
        answer: [
          { t: "p", text: "\"Testable\" is the part people miss — a profiler that finds problems is unverifiable; one that says exactly what it found can be checked." }
        ]
      }
    ]
  }
});

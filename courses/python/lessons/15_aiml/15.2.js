/* ============================================================================
   LESSON 15.2 — Pandas That Does Not Fall Over
   ========================================================================= */
EC.receiveLesson({
  id: "15.2",

  lede: "Pandas is enormously productive and quietly permissive: it will let you index ambiguously, silently upcast your types, and modify a copy you thought was the original. **The discipline is small** — be explicit about selection, explicit about dtypes, and never chain an assignment — and it converts pandas from a source of surprises into an ordinary tool.",

  objectives: [
    "Select rows and columns unambiguously with `.loc` and `.iloc`",
    "Explain `SettingWithCopyWarning` properly, rather than silencing it",
    "Control memory with dtypes, categories and chunking",
    "Use `groupby` and `merge` without producing the wrong row count",
    "Know when the dataset has outgrown pandas"
  ],

  prerequisites: ["15.1"],

  blocks: [

    { t: "h2", n: "01", text: "Selection, unambiguously", id: "selection" },

    { t: "code", lang: "python", title: "the three accessors and when each is right", code: `
import pandas as pd

# .loc  -- by LABEL. Inclusive of the end point, which surprises
#          people used to Python slicing.
df.loc[3]                     # the row whose INDEX is 3
df.loc[3:5]                   # rows 3, 4 AND 5 -- inclusive
df.loc[df["total"] > 100, "status"]        # mask + column
df.loc[:, ["id", "total"]]                 # all rows, two columns

# .iloc -- by POSITION. Exclusive of the end, like a list.
df.iloc[0]                    # the FIRST row, whatever its index
df.iloc[0:3]                  # rows 0, 1, 2 -- exclusive
df.iloc[-1]                   # the last row

# [] -- ambiguous, and the source of most confusion.
df["total"]                   # a COLUMN
df[0:3]                       # ROWS by position
df[df["total"] > 100]         # ROWS by mask
# Three different meanings for one operator, resolved by guessing at
# the argument's type. Use it for a single column and nothing else.


# THE FAILURE THAT MOTIVATES THE RULE:
df = df.sort_values("date")   # the index is now out of order
df[0:3]                       # the first three ROWS, positionally
df.loc[0:3]                   # rows with LABELS 0..3 -- scattered,
                              # and possibly a different count
# After any sort, filter or concat, position and label diverge.
`,
      hl: [6, 12, 18, 26],
      caption: "**`.loc` slices are inclusive of the endpoint; `.iloc` slices are not.** `df.loc[3:5]` gives three rows and `df.iloc[3:5]` gives two, which is the single most common off-by-one in pandas."
    },

    { t: "h2", n: "02", text: "SettingWithCopyWarning", id: "setting" },

    {"kind": "flow", "title": "Where SettingWithCopyWarning comes from", "caption": "df[df.x > 0] may be a copy or a view; assigning a column on it might modify a temporary that is thrown away. Use .loc[mask, 'col'] = value on the original, or .copy() explicitly when you mean a new frame.", "cols": 3, "nodes": [{"id": "df", "label": "df", "sub": "the original", "tone": "accent"}, {"id": "sub", "label": "df[df.x > 0]", "sub": "copy or view? pandas cannot promise", "tone": "warn"}, {"id": "set", "label": "['col'] = value", "sub": "may vanish — the warning", "tone": "crit"}], "edges": [["df", "sub"], ["sub", "set"]], "t": "diagram", "id": "dg-15_2-02-0"},

    { t: "viz",
      title: "Why chained assignment is unreliable",
      caption: "Each step returns a new object, and pandas cannot promise whether it shares memory with the original. The assignment lands somewhere; which somewhere depends on the data.",
      svg: `<svg viewBox="0 0 900 260" role="img" aria-label="Chained indexing producing an ambiguous target for assignment">
  <rect x="24" y="30" width="180" height="52" rx="8" style="fill:var(--surface-2);stroke:var(--border)"/>
  <text x="114" y="52" text-anchor="middle" class="s-label">df</text>
  <text x="114" y="72" text-anchor="middle" class="s-sub">the original</text>

  <path d="M204 56 L262 56" style="stroke:var(--border-strong)" fill="none"/>
  <text x="233" y="46" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">[mask]</text>

  <rect x="262" y="30" width="200" height="52" rx="8" style="fill:var(--surface-2);stroke:var(--warn)"/>
  <text x="362" y="52" text-anchor="middle" class="s-label" style="fill:var(--warn)">a new object</text>
  <text x="362" y="72" text-anchor="middle" class="s-sub">view or copy — unknown</text>

  <path d="M462 56 L520 56" style="stroke:var(--border-strong)" fill="none"/>
  <text x="491" y="46" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">["col"] =</text>

  <rect x="520" y="30" width="200" height="52" rx="8" style="fill:var(--surface-2);stroke:var(--crit)"/>
  <text x="620" y="52" text-anchor="middle" class="s-label" style="fill:var(--crit)">written where?</text>
  <text x="620" y="72" text-anchor="middle" class="s-sub">df, or a temporary</text>

  <text x="24" y="132" class="s-sub" style="fill:var(--crit)">df[df.total &gt; 100]["status"] = "large"      ← two operations, ambiguous target</text>
  <text x="24" y="164" class="s-sub" style="fill:var(--good)">df.loc[df.total &gt; 100, "status"] = "large"  ← ONE operation, unambiguous</text>

  <text x="24" y="212" class="s-sub" style="fill:var(--ink-3)">The warning is not pedantry: whether it works depends on the dtypes and on pandas' internal block layout,</text>
  <text x="24" y="234" class="s-sub" style="fill:var(--ink-3)">so the same line can succeed in development and silently do nothing in production.</text>
</svg>`
    },

    { t: "ladder",
      title: "Setting a value on filtered rows",
      rungs: [
        { level: "bad", label: "Chained assignment",
          why: "Two separate operations. The first produces an object that may or may not share memory with `df`; the assignment then modifies whichever it got. It works on some dtype layouts and silently does nothing on others.",
          code: `df[df["total"] > 100]["status"] = "large"

# SettingWithCopyWarning: A value is trying to be set on a copy of a
# slice from a DataFrame.
# df is often unchanged. No error, no exception, no result.` },
        { level: "ok", label: "Silence the warning",
          why: "The warning is the only thing telling you the assignment may not have happened. Suppressing it does not make the operation reliable; it removes the notification that it was not.",
          code: `pd.options.mode.chained_assignment = None    # never do this
df[df["total"] > 100]["status"] = "large"    # still unreliable` },
        { level: "best", label: "One `.loc` operation",
          why: "A single indexing operation with an unambiguous target. Pandas knows exactly which rows and which column, so it writes to `df` — always, regardless of dtypes or block layout.",
          code: `df.loc[df["total"] > 100, "status"] = "large"

# When you genuinely want a separate frame, say so:
large = df[df["total"] > 100].copy()
large["status"] = "large"          # no warning: it IS a copy

# THE RULE: if you see SettingWithCopyWarning, you have written two
# indexing operations where you meant one. Combine them into a
# single .loc, or take an explicit .copy().`,
          note: "**pandas 3.0 makes copy-on-write the default**, which removes the ambiguity — chained assignment will then reliably do nothing rather than sometimes working. Writing `.loc` today is correct under both." }
      ]
    },

    { t: "h2", n: "03", text: "Memory", id: "memory" },

    { t: "code", lang: "python", title: "the four changes that usually halve it", code: `
df.info(memory_usage="deep")      # "deep" counts the string objects
                                  # -- without it, object columns are
                                  # reported as 8 bytes per pointer

# 1. CATEGORY for low-cardinality strings. The single biggest win on
#    most real data.
df["country"] = df["country"].astype("category")
#    5M rows, 20 distinct countries:
#      object:   ~320 MB (a Python str per row)
#      category:   ~5 MB (int8 codes + a 20-entry dictionary)

# 2. DOWNCAST numerics to what the range actually needs.
df["quantity"] = pd.to_numeric(df["quantity"], downcast="integer")
df["score"] = pd.to_numeric(df["score"], downcast="float")
#    int64 -> int8 where values fit: 8x less

# 3. READ ONLY WHAT YOU NEED, with the types stated up front.
df = pd.read_csv(
    "data.csv",
    usecols=["id", "total", "country", "date"],   # not all 40 columns
    dtype={"id": "int32", "total": "float32", "country": "category"},
    parse_dates=["date"],
)
#    Specifying dtype on read avoids the peak where pandas holds the
#    inferred object column AND the converted one.

# 4. CHUNK when it still does not fit.
totals = pd.Series(dtype="float64")
for chunk in pd.read_csv("huge.csv", chunksize=500_000):
    totals = totals.add(chunk.groupby("country")["total"].sum(),
                        fill_value=0)
`,
      hl: [7, 13, 20, 28],
      caption: "**`memory_usage=\"deep\"` is the flag that tells the truth.** Without it an object column reports the size of its pointers, so a 300MB string column looks like 40MB."
    },

    { t: "callout", kind: "trap", title: "Dtypes change under you", body: [
      { t: "code", lang: "python", title: "three silent conversions", numbered: false, code: `
# 1. A SINGLE NaN UPCASTS INTEGERS TO FLOAT.
df = pd.DataFrame({"id": [1, 2, 3]})       # int64
df.loc[3] = None
df["id"].dtype                             # float64
df["id"].tolist()                          # [1.0, 2.0, 3.0, nan]
# IDs are now floats. Joining against an int column silently matches
# nothing, and large ids lose precision past 2^53.
#
# The fix: nullable integer dtypes, which keep integers integral.
df["id"] = df["id"].astype("Int64")        # capital I

# 2. A MERGE ON MISMATCHED TYPES MATCHES NOTHING.
left["id"]   # int64
right["id"]  # object, because the CSV had a leading zero somewhere
pd.merge(left, right, on="id")             # 0 rows, no error
# Always check dtypes before a join, and assert the result size.

# 3. concat WITH DIFFERENT COLUMNS FILLS WITH NaN, SILENTLY.
pd.concat([df_a, df_b])       # a typo in one column name gives you
                              # two half-empty columns instead of one`},
      { t: "p", text: "**A zero-row merge is the failure to watch for.** It raises nothing, the pipeline continues, and every downstream aggregate is empty or wrong — check the dtypes on both sides and assert the row count after every join." }
    ]},

    { t: "h2", n: "04", text: "groupby and merge", id: "groupby" },

    { t: "code", lang: "python", title: "aggregation that stays readable", code: `
# Named aggregation: explicit output columns, no MultiIndex to flatten.
summary = (
    df.groupby("country", observed=True)      # observed: skip unused
      .agg(                                   # category combinations
          order_count=("id", "count"),
          revenue=("total", "sum"),
          avg_order=("total", "mean"),
          last_order=("date", "max"),
      )
      .reset_index()
)

# transform: an aggregate BROADCAST back to the original rows. The
# vectorised answer to "compare each row to its group".
df["country_avg"] = df.groupby("country")["total"].transform("mean")
df["above_avg"] = df["total"] > df["country_avg"]

# The loop this replaces -- and which is 100x slower:
#   for country, group in df.groupby("country"):
#       df.loc[group.index, "country_avg"] = group["total"].mean()

# apply is the escape hatch, and it is a LOOP. Use it only when the
# operation genuinely cannot be expressed as an aggregate.
df.groupby("country").apply(some_complex_function)     # slow

# dropna=False when a missing key is meaningful -- by default groupby
# SILENTLY DISCARDS rows whose key is NaN, so totals stop adding up.
df.groupby("country", dropna=False)["total"].sum()
`,
      hl: [4, 15, 27],
      caption: "**`groupby` drops NaN keys by default**, so a column with missing values produces a summary that does not sum to the total. `dropna=False` is usually what you want in a report."
    },

    { t: "code", lang: "python", title: "merges, and the row count that proves it", code: `
# ALWAYS pass validate. It turns a silent fan-out into an exception.
orders_with_customer = orders.merge(
    customers,
    on="customer_id",
    how="left",
    validate="many_to_one",     # raises if customers has duplicates
    indicator=True,             # adds a _merge column: both/left_only
)

# WHY validate MATTERS: a duplicate on the right side multiplies rows.
#   10,000 orders + 1 duplicated customer -> 10,001 rows
#   ...and every sum over the result is now slightly wrong, with no
#   error anywhere. This is the most common silent data bug there is.

# Check what matched, rather than assuming:
orders_with_customer["_merge"].value_counts()
# both          9_950
# left_only        50     <- orders with no customer. Expected?

# ASSERT the shape. One line, and it catches the fan-out immediately.
before = len(orders)
result = orders.merge(customers, on="customer_id", how="left")
assert len(result) == before, f"merge changed row count: {len(result)}"

# suffixes, so overlapping column names are traceable rather than
# becoming total_x and total_y.
orders.merge(refunds, on="id", suffixes=("_order", "_refund"))
`,
      hl: [6, 7, 22],
      caption: "**`validate=` is the cheapest correctness check in pandas.** A many-to-one join that is secretly many-to-many inflates every subsequent sum, and nothing about the output looks wrong."
    },

    { t: "h2", n: "05", text: "When pandas is the wrong tool", id: "limits" },

    { t: "table",
      head: ["Situation", "Reach for"],
      rows: [
        ["Under ~1GB, exploratory", "**pandas** — it is the right tool"],
        ["1–50GB on one machine", "**Polars** or DuckDB — lazy, multi-threaded, out-of-core"],
        ["The data is already in a database", "**SQL** — do not fetch it to aggregate it"],
        ["Larger than memory, single machine", "DuckDB over Parquet, or chunked pandas"],
        ["Genuinely distributed", "Spark — and confirm you need it first"],
        ["A production data pipeline", "**Polars or SQL** — pandas' looseness is a liability"]
      ],
      caption: "**\"Do not fetch it to aggregate it\" is the rule that saves the most time.** A `GROUP BY` in Postgres over 40 million rows beats loading them into pandas, and Lesson 13.1 covers why."
    },

    { t: "callout", kind: "insight", title: "What Polars changes", body: [
      { t: "code", lang: "python", title: "the same query, two libraries", numbered: false, code: `
# pandas -- eager. Each step materialises a full intermediate frame.
result = (
    df[df["date"] >= "2026-01-01"]        # a full copy
      .groupby("country")["total"].sum()  # another
      .reset_index()
)

# Polars -- LAZY. The query is planned, then executed once, with
# predicate pushdown and multi-threaded execution.
result = (
    pl.scan_parquet("orders.parquet")     # nothing read yet
      .filter(pl.col("date") >= date(2026, 1, 1))
      .group_by("country")
      .agg(pl.col("total").sum())
      .collect()                          # NOW it runs
)
# scan_parquet + filter means only the matching row groups are read
# from disk at all -- often 10x less I/O before any computation.`},
      { t: "p", text: "**Polars is typically 5–30× faster and uses far less memory**, mostly from lazy evaluation and multi-threading. It is also stricter: no ambiguous indexing, no silent dtype changes, no `SettingWithCopyWarning` — which is precisely what you want in a pipeline that runs unattended." },
      { t: "p", text: "**Keep pandas for exploration and the ecosystem.** Plotting, scikit-learn and most tutorials speak pandas, and `.to_pandas()` is one call at the boundary." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a report that is quietly wrong",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p", text: "This monthly report takes 40 minutes, uses 12GB of RAM, and finance has noticed that the country totals do not add up to the overall total." },
        { t: "code", lang: "python", numbered: false, title: "monthly_report.py", code: `
import pandas as pd

def monthly_report(month):
    orders = pd.read_csv("orders.csv")           # 40M rows, 38 columns
    customers = pd.read_csv("customers.csv")
    items = pd.read_csv("order_items.csv")

    orders["date"] = pd.to_datetime(orders["date"])
    orders = orders[orders["date"].dt.month == month]

    df = orders.merge(customers, on="customer_id")
    df = df.merge(items, on="order_id")

    df[df["total"] > 1000]["segment"] = "high_value"

    by_country = df.groupby("country")["total"].sum()
    overall = df["total"].sum()

    for country in by_country.index:
        rows = df[df["country"] == country]
        by_country[country] = rows["total"].sum()

    return {"by_country": by_country.to_dict(), "overall": overall}`},
        { t: "p", text: "Find every bug — there are at least seven — and explain precisely why the country totals do not reconcile." }
      ],
      requirements: [
        "List every bug, marking which affect correctness.",
        "Give the full explanation for the reconciliation failure — there is more than one cause.",
        "Explain why the `segment` assignment does nothing.",
        "Rewrite it correctly and efficiently.",
        "Bound the memory.",
        "Give the assertions that would have caught each correctness bug."
      ],
      hint: "The merge with `items` is the big one. And check how the month filter behaves on a file spanning several years.",
      solution: {
        lang: "python",
        title: "monthly_report.py",
        code: `# =========================================================================
# THE BUGS
# =========================================================================
#
# ---- CORRECTNESS --------------------------------------------------
#
# 1. THE ITEMS MERGE MULTIPLIES ORDER ROWS.  <- the main reconciliation bug
#
#      df = orders.merge(items, on="order_id")
#
#    An order with 5 line items becomes 5 ROWS, each carrying the
#    order's full "total". So:
#
#      df["total"].sum()
#
#    counts a 100.00 order five times = 500.00. Every total in this
#    report is inflated by roughly the average items-per-order.
#
#    And "items" is never used for anything. The merge exists, does
#    damage, and serves no purpose.
#
# 2. THE MONTH FILTER MATCHES EVERY YEAR.
#
#      orders["date"].dt.month == month
#
#    March 2024, March 2025 and March 2026 all match. Over a
#    three-year file the "monthly" report contains three months
#    (Lesson 13.1 -- the same bug in SQL).
#
# 3. THE CUSTOMERS MERGE IS UNVALIDATED. If customers.csv has any
#    duplicate customer_id -- a re-import, a soft-deleted row -- each
#    matching order is duplicated again. It is also an INNER join by
#    default, so orders whose customer is missing DISAPPEAR from the
#    report entirely and silently.
#
# 4. CHAINED ASSIGNMENT DOES NOTHING.
#
#      df[df["total"] > 1000]["segment"] = "high_value"
#
#    Two indexing operations. The first produces a new object; the
#    assignment writes to that temporary, which is discarded. df is
#    unchanged. Pandas emits SettingWithCopyWarning, and the report
#    runs to completion with no segment ever set.
#
# 5. groupby DROPS NaN KEYS SILENTLY.
#
#      df.groupby("country")["total"].sum()
#
#    Orders whose country is missing -- from the left_only side of a
#    proper join, or simply blank in the data -- are excluded from
#    by_country but INCLUDED in overall. This is a SECOND, independent
#    reconciliation failure, and it persists even after bug 1 is fixed.
#
# ---- PERFORMANCE --------------------------------------------------
#
# 6. THE LOOP RECOMPUTES WHAT groupby ALREADY COMPUTED.
#
#      for country in by_country.index:
#          rows = df[df["country"] == country]      # FULL SCAN, each
#          by_country[country] = rows["total"].sum()
#
#    A complete pass over the (already inflated) frame per country.
#    With 200 countries that is 200 full scans, producing exactly the
#    numbers groupby produced on line 16. This is most of the 40
#    minutes.
#
# 7. READS EVERYTHING, THEN FILTERS.
#    40M rows x 38 columns loaded, then filtered to one month. The
#    columns are inferred as object where they are strings, so peak
#    memory is far above the data's actual size. This is the 12 GB.
#
# 8. NO dtype ON READ. Every string column is a Python object; a
#    single NaN in an id column upcasts it to float64, which then
#    silently fails to match on merge.
#
#
# =========================================================================
# WHY THE TOTALS DO NOT RECONCILE -- THREE CAUSES
# =========================================================================
#
# The team has noticed ONE symptom with THREE independent causes, so
# fixing any one of them will not make it reconcile.
#
# CAUSE A -- the items merge (bug 1).
#   Both by_country and overall are inflated, but NOT by the same
#   factor: a country whose customers buy more items per order is
#   inflated more. So the sum of the parts and the whole are both
#   wrong, and wrong differently.
#
# CAUSE B -- groupby dropping NaN countries (bug 5).
#   overall INCLUDES orders with a missing country; by_country
#   EXCLUDES them. sum(by_country) < overall by exactly the value of
#   those orders. This is the classic "the parts don't sum to the
#   whole" and it is invisible in the code.
#
# CAUSE C -- the inner join to customers (bug 3).
#   Orders whose customer_id is not in customers.csv are dropped from
#   df entirely -- so they are missing from BOTH numbers, and the
#   report silently under-reports revenue. Nobody notices, because
#   the two numbers are consistent with each other.
#
# So: A makes both wrong, B makes them inconsistent with each other,
# and C makes both too small in a way that is undetectable from the
# output alone.
#
#
# =========================================================================
# THE REWRITE
# =========================================================================

import pandas as pd
from datetime import date

DTYPES = {
    "order_id": "int64",
    "customer_id": "int64",
    "total": "float64",        # see the note on money below
    "status": "category",
}


def monthly_report(month_start: date) -> dict:
    """A half-open month range, validated joins, one aggregation."""
    month_end = (month_start + pd.offsets.MonthBegin(1)).date()

    # --- read ONLY what is needed, with types stated -------------
    # usecols avoids 34 unused columns; dtype avoids the object
    # inference pass and its peak. Together this is the 12 GB.
    orders = pd.read_csv(
        "orders.csv",
        usecols=["order_id", "customer_id", "total", "date"],
        dtype={"order_id": "int64", "customer_id": "int64",
               "total": "float64"},
        parse_dates=["date"],
    )

    customers = pd.read_csv(
        "customers.csv",
        usecols=["customer_id", "country"],
        dtype={"customer_id": "int64", "country": "category"},
    )

    # NOTE: order_items is not read at all. It was never used, and
    # merging it was the primary bug.

    # --- filter: a HALF-OPEN range on the raw column (bug 2) -----
    orders = orders.loc[
        (orders["date"] >= pd.Timestamp(month_start))
        & (orders["date"] < pd.Timestamp(month_end))
    ].copy()          # explicit copy: we own this frame from here on

    # --- join, validated (bug 3) ---------------------------------
    before = len(orders)
    df = orders.merge(
        customers,
        on="customer_id",
        how="left",              # keep orders with no customer row
        validate="many_to_one",  # RAISES if customers has duplicates
        indicator=True,
    )
    # A left join with many_to_one cannot change the row count. This
    # assertion is what turns a silent fan-out into a failed job.
    assert len(df) == before, f"merge changed row count: {before} -> {len(df)}"

    unmatched = int((df["_merge"] == "left_only").sum())
    if unmatched:
        # Report it rather than dropping it. Cause C, made visible.
        logger.warning("orders_without_customer", extra={
            "count": unmatched,
            "value": float(df.loc[df["_merge"] == "left_only",
                                  "total"].sum()),
        })

    # Orders with no customer have no country; give them an explicit
    # bucket so they appear in the breakdown instead of vanishing.
    df["country"] = (
        df["country"].cat.add_categories(["unknown"]).fillna("unknown")
    )

    # --- the segment assignment (bug 4): ONE .loc operation -------
    df["segment"] = "standard"
    df.loc[df["total"] > 1000, "segment"] = "high_value"

    # --- aggregate ONCE (bugs 5 and 6) ---------------------------
    by_country = (
        df.groupby("country", observed=True, dropna=False)["total"]
          .sum()
    )
    overall = df["total"].sum()

    # No loop. groupby already computed exactly this, and the loop
    # was 200 full scans producing the same numbers.

    # --- the reconciliation check itself --------------------------
    # This is the assertion the report should always have had. It is
    # the thing finance was doing by hand.
    assert by_country.sum() == pytest.approx(overall, rel=1e-9), (
        f"country totals {by_country.sum()} != overall {overall}"
    )

    return {
        "month": month_start.isoformat(),
        "by_country": by_country.to_dict(),
        "overall": float(overall),
        "order_count": len(df),
        "orders_without_customer": unmatched,
    }


# A note on "total": float64 is used here because the source is a CSV
# of floats. For a report finance reconciles against, read it as a
# string and convert to Decimal, or do the aggregation in SQL where
# the column is NUMERIC (Lesson 13.2). Summing 40M float64 values
# accumulates error in the last digits, which is exactly the kind of
# discrepancy that starts an investigation.


# =========================================================================
# BOUNDING MEMORY
# =========================================================================
#
# AFTER the changes above, at 40M rows:
#
#   4 columns instead of 38
#   order_id, customer_id  int64    320 MB each
#   total                  float64  320 MB
#   date                   datetime 320 MB
#   country                category   5 MB (int8 codes + dictionary)
#   ------------------------------------------------
#   ~1.3 GB, from 12 GB.
#
# Further, if that is still too much:
#
# (a) DOWNCAST. If order_id fits in int32, that is 160 MB saved per
#     id column.
#
# (b) FILTER ON READ. Only one month is needed, so 40M rows are never
#     required in memory at once:
#
#       parts = []
#       for chunk in pd.read_csv("orders.csv", chunksize=1_000_000,
#                                usecols=COLS, dtype=DTYPES,
#                                parse_dates=["date"]):
#           parts.append(chunk[
#               (chunk["date"] >= start) & (chunk["date"] < end)])
#       orders = pd.concat(parts, ignore_index=True)
#
#     Peak memory becomes one chunk plus the (much smaller) result.
#
# (c) USE PARQUET, and stop re-parsing CSV. Column pruning and
#     predicate pushdown happen at the file level:
#
#       orders = pd.read_parquet(
#           "orders.parquet",
#           columns=COLS,
#           filters=[("date", ">=", start), ("date", "<", end)],
#       )
#
#     Only the matching row groups are read from disk -- typically
#     10-50x less I/O than parsing the whole CSV.
#
# (d) OR DO NOT USE PANDAS. This entire report is one SQL statement
#     against the source database (Lesson 13.1), returning ~200 rows
#     instead of 40 million. That is the correct answer if the data
#     is already in Postgres.


# =========================================================================
# EXPECTED IMPROVEMENT
# =========================================================================
#
#                    before      after
#   runtime          40 min      ~25 s      (no items merge, no loop)
#   peak memory      12 GB       ~1.3 GB
#   columns read     38          4
#   country totals   WRONG       correct and asserted
#   overall total    WRONG       correct
#   segment column   never set   set
#
#
# =========================================================================
# THE ASSERTIONS THAT WOULD HAVE CAUGHT EACH BUG
# =========================================================================

def test_the_items_merge_does_not_inflate_totals():
    """Bug 1. An order with 5 items must contribute its total ONCE."""
    orders = frame([{"order_id": 1, "total": 100.0}])
    items = frame([{"order_id": 1, "sku": s} for s in "abcde"])

    merged = orders.merge(items, on="order_id")

    assert merged["total"].sum() == 500.0      # the BUG, demonstrated
    # ...which is why the report must aggregate before joining
    # line-level data, or not join it at all.


def test_the_month_filter_is_a_half_open_range():
    """Bug 2. .dt.month matched every year."""
    seed_orders([
        ("2025-03-15", 100), ("2026-02-28", 100),
        ("2026-03-01", 50),  ("2026-03-31", 50),
        ("2026-04-01", 100),
    ])

    assert monthly_report(date(2026, 3, 1))["overall"] == 100


def test_the_customer_merge_cannot_change_the_row_count():
    """Bug 3. validate= turns a fan-out into an exception."""
    customers = frame([{"customer_id": 1, "country": "UK"},
                       {"customer_id": 1, "country": "DE"}])  # dup

    with pytest.raises(pd.errors.MergeError):
        orders.merge(customers, on="customer_id",
                     validate="many_to_one")


def test_the_segment_is_actually_set():
    """Bug 4. The original wrote to a discarded temporary."""
    result_df = build_report_frame(seed_orders([("2026-03-01", 1500)]))

    assert (result_df["segment"] == "high_value").sum() == 1


def test_country_totals_reconcile_to_the_overall_total():
    """Bug 5, and the check finance was performing by hand. This is
    the single most valuable assertion in the file."""
    seed_orders_with_missing_countries()

    report = monthly_report(date(2026, 3, 1))

    assert sum(report["by_country"].values()) == pytest.approx(
        report["overall"], rel=1e-9)


def test_orders_with_no_customer_are_reported_not_dropped():
    """Cause C. An inner join hid them from both numbers."""
    seed_order(customer_id=99999)          # no such customer

    report = monthly_report(date(2026, 3, 1))

    assert report["orders_without_customer"] == 1
    assert "unknown" in report["by_country"]


def test_peak_memory_is_bounded():
    peak = measure_peak_rss(lambda: monthly_report(date(2026, 3, 1)))
    assert peak < 2 * 1024**3`,
        notes: [
          { t: "p", text: "**The reconciliation failure has three independent causes**, which is why the team could not fix it by inspection. The items merge inflates both numbers unevenly, the `groupby` NaN drop makes the parts smaller than the whole, and the inner join makes both too small in a way the output cannot reveal." },
          { t: "p", text: "**The `order_items` merge is the primary bug and serves no purpose.** An order with five line items becomes five rows each carrying the full order total, so a £100 order counts as £500 — and `items` is never read afterwards." },
          { t: "callout", kind: "insight", title: "The parts-don't-sum-to-the-whole signature", body: [
            { t: "p", text: "`groupby` silently discards rows whose key is NaN, while `df[\"total\"].sum()` includes them. The difference is exactly the value of the excluded rows, which is why the discrepancy is stable and looks like a rounding problem." },
            { t: "p", text: "`dropna=False`, plus an explicit `unknown` category, makes those rows visible instead of absent — and the reconciliation assertion turns the discrepancy into a failed job rather than a finance query three weeks later." }
          ]},
          { t: "p", text: "**`df[df[\"total\"] > 1000][\"segment\"] = \"high_value\"` writes to a discarded temporary.** The report ran for months with the segment never set, and the only signal was a `SettingWithCopyWarning` in the log that nobody read." },
          { t: "p", text: "**The loop recomputes what `groupby` already produced**, with a full scan per country — two hundred passes over an inflated forty-million-row frame, which is most of the forty minutes." },
          { t: "p", text: "**`validate=\"many_to_one\"` is the cheapest correctness check available.** A duplicate on the right side multiplies rows and inflates every subsequent sum, with no error and nothing about the output looking wrong." },
          { t: "p", text: "**If the data is already in Postgres, this whole report is one SQL statement** returning two hundred rows instead of forty million. Reaching for pandas to aggregate data that lives in a database is the more fundamental error." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's revenue dashboard had been over-reporting by about 8% for four months. The code looked correct and the tests passed." },
      { t: "p", text: "**A `merge` with the discounts table had a many-to-many relationship nobody had checked.** A handful of orders had two discount rows, so those orders were counted twice — 8% of revenue, from perhaps 200 duplicated rows out of two million." },
      { t: "p", text: "**`validate=\"many_to_one\"` would have raised on the first run.** It is one keyword argument, and it converts the single most common silent data bug into an exception." },
      { t: "p", text: "**Assert the row count after every join.** A merge that should not change the row count and does is always a bug, and checking it costs one line." }
    ]}
  ],

  takeaways: [
    "**Use `.loc` for labels and `.iloc` for positions.** Bare `[]` means three different things depending on the argument type.",
    "**`.loc` slices include the endpoint; `.iloc` slices do not** — the most common off-by-one in pandas.",
    "**`SettingWithCopyWarning` means you wrote two indexing operations where you meant one.** Combine into a single `.loc`, or take an explicit `.copy()`.",
    "**Never silence the warning.** It is the only signal that your assignment may not have happened.",
    "**`memory_usage=\"deep\"` is the flag that tells the truth** — object columns otherwise report only the size of their pointers.",
    "**`astype(\"category\")` on low-cardinality strings is usually the single biggest memory win**, often 50× on a country or status column.",
    "**Specify `dtype` and `usecols` on read**, so pandas never materialises the columns you do not need or the object columns it would infer.",
    "**A single NaN upcasts an integer column to float**, which then silently fails to match on a merge. Use nullable `Int64` where NaN is possible.",
    "**`groupby` drops NaN keys by default**, so the parts stop summing to the whole. Pass `dropna=False` in any report.",
    "**Pass `validate=` to every merge.** A duplicate on the right side inflates every downstream sum with no error.",
    "**Assert the row count after a join.** A many-to-one merge that changes the row count is always a bug.",
    "**`transform` broadcasts a group aggregate back to rows** — the vectorised answer to \"compare each row to its group\".",
    "**Do not fetch data to aggregate it.** If it is in a database, the `GROUP BY` belongs there.",
    "**Past a gigabyte or in an unattended pipeline, prefer Polars or DuckDB** — lazy, multi-threaded, and strict where pandas is permissive."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`df[df[\"total\"] > 1000][\"segment\"] = \"high_value\"` produces a warning and no change. Why?",
        options: [
          "The mask is evaluated lazily",
          "It is two indexing operations — the first returns a new object and the assignment writes to that temporary, which is then discarded",
          "String assignment requires `.astype`",
          "The column does not exist yet"
        ],
        answer: 1,
        why: "Whether the intermediate shares memory with the original depends on dtypes and pandas' internal block layout, so the same line can work in development and silently do nothing in production. `df.loc[mask, \"segment\"] = ...` is one operation with an unambiguous target."
      },
      {
        stem: "Country totals sum to less than the overall total. What is the most likely cause?",
        options: [
          "Floating-point accumulation error",
          "`groupby` silently drops rows whose key is NaN, while the overall sum includes them",
          "The index is not unique",
          "The category dtype excludes unused values"
        ],
        answer: 1,
        why: "The discrepancy equals the value of the rows with a missing key, so it is stable and looks like a rounding problem. `dropna=False` plus an explicit \"unknown\" bucket makes those rows visible, and an assertion that the parts sum to the whole turns it into a failed job."
      },
      {
        stem: "You merge orders with customers and the row count increases. What happened, and what prevents it?",
        options: [
          "An outer join added unmatched rows — use an inner join",
          "The right side has duplicate keys, so matching rows fan out; `validate=\"many_to_one\"` raises instead",
          "The index was reset during the merge",
          "Suffixes created extra rows"
        ],
        answer: 1,
        why: "A fan-out inflates every subsequent sum with no error, and it is the most common silent data bug in pandas. `validate=` costs one keyword argument, and asserting the row count after any join that should preserve it costs one line."
      },
      {
        stem: "A string column of 5 million rows with 20 distinct values uses 320MB. What is the fix?",
        options: [
          "Downcast with `pd.to_numeric`",
          "`astype(\"category\")` — stores int8 codes plus a 20-entry dictionary, around 5MB",
          "Use `dtype=\"string\"` instead of object",
          "Chunk the read"
        ],
        answer: 1,
        why: "An object column stores a pointer to a full Python string per row. Categories store small integer codes plus one copy of each distinct value, so the saving grows with row count and shrinks with cardinality — it is the largest single memory win on most real data."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain `SettingWithCopyWarning`.",
        strong: "It means you wrote two indexing operations where one was intended. The first returns an object that may or may not share memory with the original, so the assignment may write to a temporary — the fix is a single `.loc`, or an explicit `.copy()`.",
        answer: [
          { t: "p", text: "Saying it is unreliable rather than always wrong is the accurate version, and it explains why the bug survives development." },
          { t: "p", text: "Noting that silencing it removes the only signal that the assignment did not happen is the point that matters operationally." },
          { t: "p", text: "Mentioning that copy-on-write in pandas 3.0 makes the failure consistent shows you are current." }
        ]
      },
      {
        level: "advanced",
        q: "How would you find a bug where a report's totals are wrong?",
        strong: "Check the joins first — a fan-out from duplicate keys is the most common cause. Then check whether `groupby` is dropping NaN keys, and whether an inner join is silently discarding rows.",
        answer: [
          { t: "p", text: "Naming row-count assertions after joins as the preventative shows you think in terms of guards rather than inspection." },
          { t: "p", text: "The parts-don't-sum-to-the-whole signature pointing at NaN keys is a specific diagnostic worth having." },
          { t: "p", text: "Observing that an inner join makes both numbers consistently wrong — so the output cannot reveal it — demonstrates real debugging experience." }
        ]
      },
      {
        level: "advanced",
        q: "When would you not use pandas?",
        strong: "When the data is already in a database — aggregate there. When it is over a gigabyte or so, Polars or DuckDB. And in any unattended pipeline, because pandas' permissiveness is a liability when nobody is watching.",
        answer: [
          { t: "p", text: "\"Do not fetch it to aggregate it\" is the rule with the largest payoff and the one most often violated." },
          { t: "p", text: "Framing Polars' strictness as the benefit — rather than only its speed — shows you have thought about production rather than benchmarks." },
          { t: "p", text: "Keeping pandas for exploration and the ecosystem is the balanced position, and `.to_pandas()` at the boundary makes it practical." }
        ]
      }
    ]
  }
});

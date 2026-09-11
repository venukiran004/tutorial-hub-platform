/* ============================================================================
   LESSON 3.6 — Joins and Merges
   ========================================================================= */
EC.receiveLesson({
  id: "3.6",

  lede: "**A join's row count tells you whether it did what you meant.** An inner join that returns more rows than the left table had a duplicated key; a left join that returns fewer has a bug. Checking the count before and after is the single most valuable habit in data work, and `validate=` makes pandas do it for you.",

  objectives: [
    "Choose between inner, left, right, outer and cross joins for a given question",
    "Predict the row count of a merge from the key cardinality",
    "Use `validate=` and `indicator=` to make a merge check itself",
    "Diagnose a merge that multiplied rows or dropped them",
    "Use `concat` and `merge_asof` for the cases `merge` does not cover"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", text: "The five joins and what each keeps", id: "types" },

    { t: "p", text: "Every join answers the same question — which rows from the left match which rows from the right — and differs only in **what happens to the rows that do not match**." },

    { t: "dl", items: [
      ["Inner join", "Keeps only rows whose key appears in **both** tables. The default for `merge`, and the one that silently drops unmatched rows."],
      ["Left join", "Keeps **every** row from the left, with `NaN` where the right had no match. The row count cannot fall — which makes it the safest default for enrichment."],
      ["Right join", "The mirror of left. Rarely used; swap the arguments and write a left join instead."],
      ["Outer join", "Keeps every row from both, with `NaN` on whichever side lacked a match. The union of keys."],
      ["Cross join", "Every row paired with every row — `n × m` rows. Almost never wanted by accident, and exactly what a missing `on=` produces on some inputs."],
      ["Cardinality", "How many times each key appears on each side: one-to-one, one-to-many, many-to-one, many-to-many. **This decides the output row count**, and getting it wrong is the source of most merge bugs."]
    ]},

    { t: "viz",
      title: "Which rows survive each join",
      caption: "Two tables sharing keys B and C. Inner keeps the overlap; left keeps all of the left; outer keeps everything. The unmatched side is filled with NaN.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Two key sets A B C and B C D shown as overlapping regions, with the rows each join type keeps">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">left keys: A, B, C      right keys: B, C, D</text>

  <g>
    <text x="30" y="70" class="s-sub" style="fill:var(--acc)">inner</text>
    <rect x="120" y="54" width="52" height="24" rx="3" style="fill:var(--ink-4);fill-opacity:.06;stroke:var(--line);stroke-dasharray:3 2"/>
    <rect x="176" y="54" width="52" height="24" rx="3" style="fill:var(--acc);fill-opacity:.25;stroke:var(--acc)"/>
    <rect x="232" y="54" width="52" height="24" rx="3" style="fill:var(--acc);fill-opacity:.25;stroke:var(--acc)"/>
    <rect x="288" y="54" width="52" height="24" rx="3" style="fill:var(--ink-4);fill-opacity:.06;stroke:var(--line);stroke-dasharray:3 2"/>
    <text x="196" y="71" class="s-sub" style="fill:var(--ink-2)">B</text><text x="252" y="71" class="s-sub" style="fill:var(--ink-2)">C</text>
    <text x="360" y="71" class="s-sub" style="fill:var(--ink-3)">2 rows — A and D dropped silently</text>
  </g>
  <g>
    <text x="30" y="122" class="s-sub" style="fill:var(--good)">left</text>
    <rect x="120" y="106" width="52" height="24" rx="3" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="176" y="106" width="52" height="24" rx="3" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="232" y="106" width="52" height="24" rx="3" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="288" y="106" width="52" height="24" rx="3" style="fill:var(--ink-4);fill-opacity:.06;stroke:var(--line);stroke-dasharray:3 2"/>
    <text x="140" y="123" class="s-sub" style="fill:var(--ink-2)">A</text><text x="196" y="123" class="s-sub" style="fill:var(--ink-2)">B</text><text x="252" y="123" class="s-sub" style="fill:var(--ink-2)">C</text>
    <text x="360" y="123" class="s-sub" style="fill:var(--ink-3)">3 rows — A has NaN in the right columns</text>
  </g>
  <g>
    <text x="30" y="174" class="s-sub" style="fill:var(--warn)">outer</text>
    <rect x="120" y="158" width="52" height="24" rx="3" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn)"/>
    <rect x="176" y="158" width="52" height="24" rx="3" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn)"/>
    <rect x="232" y="158" width="52" height="24" rx="3" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn)"/>
    <rect x="288" y="158" width="52" height="24" rx="3" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn)"/>
    <text x="140" y="175" class="s-sub" style="fill:var(--ink-2)">A</text><text x="196" y="175" class="s-sub" style="fill:var(--ink-2)">B</text><text x="252" y="175" class="s-sub" style="fill:var(--ink-2)">C</text><text x="308" y="175" class="s-sub" style="fill:var(--ink-2)">D</text>
    <text x="360" y="175" class="s-sub" style="fill:var(--ink-3)">4 rows — NaN on whichever side is missing</text>
  </g>

  <line x1="30" y1="206" x2="850" y2="206" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="232" class="s-sub" style="fill:var(--crit)">and if key B appears TWICE on the right:</text>
  <text x="30" y="256" class="s-sub" style="fill:var(--ink-3)">every join above gains a row — the left B row is paired with each right B row. The count is the tell.</text>
  <text x="30" y="280" class="s-sub" style="fill:var(--ink-3)">validate="one_to_one" or "many_to_one" turns that into an immediate MergeError instead of a quiet doubling.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the joins, and the row count that reveals a problem", code: `
import pandas as pd
import numpy as np

orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4],
    "customer_id": [10, 20, 20, 30],
    "amount": [100.0, 250.0, 75.0, 300.0],
})
customers = pd.DataFrame({
    "customer_id": [10, 20, 40],
    "tier": ["gold", "silver", "bronze"],
})

# INNER -- the default, and it DROPS order 4 (customer 30 unknown):
pd.merge(orders, customers, on="customer_id")             # 3 rows
orders.merge(customers, on="customer_id", how="inner")    # the same

# LEFT -- keeps every order; unknown customer gets NaN tier:
orders.merge(customers, on="customer_id", how="left")     # 4 rows
#
# THIS IS THE DEFAULT YOU USUALLY WANT when enriching a fact table.
# The row count cannot drop, so a lookup failure shows as NaN in a
# column rather than as rows missing from the result.

# OUTER -- every key from both sides:
orders.merge(customers, on="customer_id", how="outer")    # 5 rows
# includes customer 40 with NaN order_id and amount

# CROSS -- every pair:
orders.merge(customers, how="cross")                      # 12 rows
#
# 4 x 3. Useful for generating combinations to fill in; catastrophic
# when it happens by accident on two large tables.

# THE ROW COUNT IS THE DIAGNOSTIC. Before and after, every time:
n_before = len(orders)
result = orders.merge(customers, on="customer_id", how="left")
assert len(result) == n_before, "left join changed the row count"
#
# A left join that GROWS has a duplicated key on the right.
# An inner join that SHRINKS has keys with no match.
# Both are silent without the check.

# DIFFERENT KEY NAMES ON EACH SIDE:
cust2 = customers.rename(columns={"customer_id": "id"})
orders.merge(cust2, left_on="customer_id", right_on="id", how="left")
#
# Both key columns survive in the output. Drop one after.

# JOINING ON THE INDEX:
indexed = customers.set_index("customer_id")
orders.merge(indexed, left_on="customer_id", right_index=True, how="left")
orders.join(indexed, on="customer_id")           # the same, via .join
#
# DataFrame.join is merge with the RIGHT side's index as its key and
# how="left" as the default. It is convenient for enrichment from a
# lookup table that has been indexed by its key.

# MULTIPLE KEYS:
daily = pd.DataFrame({"store": ["A", "A"], "date": ["2026-01-01", "2026-01-02"],
                      "sales": [10, 12]})
targets = pd.DataFrame({"store": ["A", "A"], "date": ["2026-01-01", "2026-01-02"],
                        "target": [11, 11]})
daily.merge(targets, on=["store", "date"])
#
# Forgetting one key of a compound key is the most common cause of a
# many-to-many explosion: merging on "store" alone pairs every day
# with every target day.

# OVERLAPPING NON-KEY COLUMNS GET SUFFIXES:
a = pd.DataFrame({"k": [1, 2], "value": [10, 20]})
b = pd.DataFrame({"k": [1, 2], "value": [30, 40]})
a.merge(b, on="k")                        # value_x, value_y
a.merge(b, on="k", suffixes=("_left", "_right"))   # say which is which
#
# _x and _y tell you nothing six lines later. Name them.
`,
      hl: [14, 18, 32, 66],
      caption: "**A left join that grows has a duplicated key on the right; an inner join that shrinks has unmatched keys.** Both are silent without the count check."
    },

    { t: "h2", n: "02", text: "Cardinality, and the merge that multiplied", id: "cardinality" },

    { t: "p", text: "**The output of a join has one row for every matching pair.** If a key appears twice on the left and three times on the right, that key contributes six rows. This is correct behaviour, and it is the mechanism behind every \"my join doubled the revenue\" incident." },

    { t: "code", lang: "python", title: "validate and indicator: making the merge check itself", code: `
# A LOOKUP TABLE WITH AN ACCIDENTAL DUPLICATE:
customers_dup = pd.concat([customers, customers.iloc[[1]]])   # 20 twice

result = orders.merge(customers_dup, on="customer_id", how="left")
len(result)                   # 6 -- was 4. Orders 2 and 3 now appear twice.
result["amount"].sum()        # 1050 -- was 725. Revenue up 45%.
#
# NOTHING RAISED. The join did exactly what a join does: one output
# row per matching pair. Customer 20 had two orders and two lookup
# rows, so four output rows.

# validate= STATES THE CARDINALITY YOU EXPECT, and pandas checks it:
try:
    orders.merge(customers_dup, on="customer_id", how="left",
                 validate="many_to_one")
except pd.errors.MergeError as e:
    print(e)      # Merge keys are not unique in right dataset;
                  # not a many-to-one merge
#
# THE FOUR OPTIONS:
#   "one_to_one"   -- keys unique on both sides
#   "one_to_many"  -- unique on the left
#   "many_to_one"  -- unique on the right  <- enrichment from a lookup
#   "many_to_many" -- no check; you are saying you expect the blow-up
#
# validate COSTS A UNIQUENESS CHECK, which is O(n). It is worth it on
# every merge whose result feeds a number anyone will act on.

# indicator= TELLS YOU WHERE EACH ROW CAME FROM:
result = orders.merge(customers, on="customer_id", how="outer",
                      indicator=True)
result["_merge"].value_counts()
# both          3
# left_only     1      <- order with no customer
# right_only    1      <- customer with no orders
#
# This is the coverage report for free. After a left join, the
# left_only count is the number of failed lookups:
result = orders.merge(customers, on="customer_id", how="left",
                      indicator=True)
unmatched = result[result["_merge"] == "left_only"]
len(unmatched)                # 1
unmatched["customer_id"].unique()         # [30] -- which keys failed

# THE ANTI-JOIN -- rows in the left with NO match on the right:
anti = (orders.merge(customers, on="customer_id", how="left", indicator=True)
              .query("_merge == 'left_only'")
              .drop(columns="_merge"))
#
# There is no how="anti" in pandas. This is the idiom, and it comes
# up constantly: "customers who never ordered", "orders with no
# matching shipment".

# DTYPE MISMATCH ON THE KEY IS A SILENT ZERO-MATCH:
str_keys = customers.assign(customer_id=customers["customer_id"].astype(str))
orders.merge(str_keys, on="customer_id", how="left")["tier"].isna().all()
# True -- int 10 does not equal str "10". EVERY lookup failed.
#
# pandas raises for int-vs-float on some versions and for int-vs-str
# on others, and silently matches nothing on the rest. Check the key
# dtypes on both sides before merging:
assert orders["customer_id"].dtype == customers["customer_id"].dtype

# A FUNCTION THAT MERGES THE WAY YOU MEANT:
def enrich(left, right, on, *, expect="many_to_one", min_match=1.0):
    """Left join with the checks that catch the usual disasters."""
    for col in ([on] if isinstance(on, str) else on):
        if left[col].dtype != right[col].dtype:
            raise TypeError(f"key {col!r}: {left[col].dtype} vs {right[col].dtype}")

    out = left.merge(right, on=on, how="left", validate=expect, indicator=True)
    assert len(out) == len(left)

    matched = (out["_merge"] == "both").mean()
    if matched < min_match:
        raise ValueError(f"only {matched:.1%} of rows matched")
    return out.drop(columns="_merge")
`,
      hl: [5, 14, 36, 55],
      caption: "**An int key on one side and a string key on the other match nothing.** Every lookup fails, every enriched column is NaN, and depending on the pandas version there may or may not be an error."
    },

    { t: "callout", kind: "trap", title: "The join that doubled the revenue", body: [
      { t: "p", text: "A lookup table gains one duplicated row — a customer who appears twice after a bad upstream deduplication. Every order for that customer now produces two output rows, and the revenue total rises by exactly the amount of their orders." },
      { t: "p", text: "**No error, no warning, and the report still renders.** The total is wrong by a plausible amount, which is the hardest kind of wrong to notice." },
      { t: "p", text: "**`validate=\"many_to_one\"` on every enrichment merge.** It costs one uniqueness check and turns this into an immediate `MergeError` at the line that caused it." }
    ]},

    { t: "h2", n: "03", text: "concat, and the joins merge does not do", id: "concat" },

    { t: "code", lang: "python", title: "concat for stacking, merge_asof for time", code: `
# concat STACKS FRAMES -- it is not a join, though it aligns columns:
jan = pd.DataFrame({"id": [1, 2], "v": [10, 20]})
feb = pd.DataFrame({"id": [3, 4], "v": [30, 40]})

pd.concat([jan, feb])                     # 4 rows, index [0,1,0,1]
pd.concat([jan, feb], ignore_index=True)  # index [0,1,2,3]
#
# THE DUPLICATED INDEX IS THE TRAP. .loc[0] now returns two rows,
# and any later merge on the index doubles. ignore_index=True unless
# the index is meaningful.

# COLUMNS ARE ALIGNED BY NAME, and missing ones become NaN:
mar = pd.DataFrame({"id": [5], "v": [50], "extra": ["x"]})
pd.concat([jan, mar])                     # extra is NaN for jan rows
pd.concat([jan, mar], join="inner")       # only the shared columns

# keys= LABELS WHICH FRAME EACH ROW CAME FROM:
pd.concat([jan, feb], keys=["jan", "feb"])
# a MultiIndex with the source as the outer level -- useful for
# stacking monthly extracts and keeping the month.
pd.concat([jan, feb], keys=["jan", "feb"], names=["month", None]).reset_index(level=0)

# axis=1 CONCATENATES SIDE BY SIDE, aligning on the INDEX:
left = pd.DataFrame({"a": [1, 2]}, index=["x", "y"])
right = pd.DataFrame({"b": [3, 4]}, index=["y", "z"])
pd.concat([left, right], axis=1)          # outer join on index: x, y, z
#
# This is a join on the index, and it inherits every alignment
# surprise from 3.1. Two frames with RangeIndexes of different
# lengths produce NaN rows, not an error.

# concat IN A LOOP IS QUADRATIC -- same as np.append:
parts = []
for month in ["jan", "feb", "mar"]:
    parts.append(pd.read_csv(f"{month}.csv") if False else jan)
pd.concat(parts, ignore_index=True)      # once, at the end

# merge_asof -- THE TIME JOIN merge cannot do:
trades = pd.DataFrame({
    "time": pd.to_datetime(["10:00:01", "10:00:05", "10:00:09"]),
    "qty": [100, 200, 150],
})
quotes = pd.DataFrame({
    "time": pd.to_datetime(["10:00:00", "10:00:04", "10:00:08"]),
    "price": [10.0, 10.5, 10.2],
})

pd.merge_asof(trades, quotes, on="time")
#        time   qty  price
# 10:00:01     100   10.0      <- most recent quote AT OR BEFORE
# 10:00:05     200   10.5
# 10:00:09     150   10.2
#
# BOTH FRAMES MUST BE SORTED BY THE KEY. merge_asof raises if not,
# which is better than searchsorted's silent nonsense (see 2.2).

# direction= AND tolerance= CONTROL THE MATCH:
pd.merge_asof(trades, quotes, on="time", direction="backward")   # default
pd.merge_asof(trades, quotes, on="time", direction="forward")    # LEAKAGE
                                                                 # in a feature
pd.merge_asof(trades, quotes, on="time",
              tolerance=pd.Timedelta("2s"))       # NaN if too stale

# by= DOES THE AS-OF JOIN WITHIN GROUPS:
# pd.merge_asof(trades, quotes, on="time", by="symbol")
#
# Each trade gets the latest quote FOR ITS SYMBOL. Without by=, a
# trade in one symbol would pick up the latest quote from any symbol.

# allow_exact_matches=False EXCLUDES A QUOTE AT THE SAME INSTANT --
# which is the correct setting when the "quote" is a target-derived
# value and using the same-timestamp row would leak (see 8.3).
`,
      hl: [8, 24, 44, 59],
      caption: "**`concat` without `ignore_index` produces a duplicated index**, so `.loc[0]` returns two rows and the next merge on the index doubles."
    },

    { t: "ladder",
      title: "Enriching a transactions table from a customer lookup",
      rungs: [
        { level: "bad", label: "Default merge, no checks", code: `df = transactions.merge(customers, on="customer_id")`,
          note: "**Inner join by default**, so transactions with an unknown customer vanish. A duplicate in the lookup doubles rows. A dtype mismatch matches nothing. None of these raises." },
        { level: "ok", label: "Left join with a count check", code: `n = len(transactions)
df = transactions.merge(customers, on="customer_id", how="left")
assert len(df) == n`,
          note: "**Catches the duplicate-key explosion**, and the left join keeps unmatched rows. But a failed lookup is now a NaN in `tier` that nothing reports, and a dtype mismatch still fails silently as all-NaN." },
        { level: "best", label: "validate, indicator, and a coverage threshold", code: `df = transactions.merge(customers, on="customer_id", how="left",
                        validate="many_to_one", indicator=True)
coverage = (df["_merge"] == "both").mean()
if coverage < 0.99:
    unmatched = df.loc[df["_merge"] == "left_only", "customer_id"].unique()
    raise ValueError(f"{coverage:.1%} matched; e.g. {unmatched[:5]}")
df = df.drop(columns="_merge")`,
          note: "**Every failure mode is now loud.** A duplicate raises `MergeError` at the merge line; a lookup failure rate above the threshold raises with example keys; and the dtype mismatch shows up as zero coverage. The check costs one uniqueness scan." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Three tables, one wrong total",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "A revenue report joins orders to customers to regions. The total is 38% higher than the finance system's figure, and it was correct last month." },
        { t: "code", lang: "python", numbered: false, title: "revenue.py", code: `
import pandas as pd

def revenue_by_region(orders, customers, regions):
    df = orders.merge(customers, on="customer_id")
    df = df.merge(regions, on="region_code")
    return df.groupby("region_name")["amount"].sum()`},
        { t: "p", text: "Given the three tables below, find every way this can produce a wrong number, identify which one explains a 38% overstatement, and rewrite it so each failure is caught at the line that causes it." },
        { t: "code", lang: "python", numbered: false, title: "the tables", code: `
# orders:     order_id, customer_id, amount          (12,000 rows)
# customers:  customer_id, region_code               (3,000 rows; region_code has
#                                                     some NaN, and one customer
#                                                     appears twice since a CRM migration)
# regions:    region_code, region_name               (40 rows; codes are strings
#                                                     like "UK-S", customers has
#                                                     some in lowercase)`}
      ],
      requirements: [
        "List every failure mode in the original, with its effect on the total.",
        "Identify which one produces an overstatement and which produce understatements.",
        "Rewrite with validation on every merge.",
        "Report unmatched rows at each stage rather than dropping them.",
        "Make the output reconcile to the input total, including a bucket for unmatched.",
        "Include tests reproducing each failure."
      ],
      hint: "One failure makes the total go up. All the others make it go down. The 38% is the net.",
      solution: {
        lang: "python",
        title: "revenue_fixed.py",
        code: `import pandas as pd
import numpy as np


# =========================================================================
# THE FAILURE MODES
# =========================================================================
#
# 1. DUPLICATED customer_id IN customers  -> OVERSTATEMENT
#    The CRM migration left one customer with two rows. Every order
#    for that customer matches both, so those orders appear twice and
#    their amount is counted twice. If that customer is large -- a
#    key account -- this alone can be tens of percent.
#
# 2. INNER JOIN TO customers               -> UNDERSTATEMENT
#    Orders whose customer_id is not in customers are dropped. New
#    customers not yet synced, deleted customers, test accounts.
#
# 3. NaN region_code IN customers          -> UNDERSTATEMENT
#    The second merge is inner, so customers with a NaN region_code
#    match no region and their orders are dropped. Then groupby drops
#    any NaN key that survived anyway.
#
# 4. CASE MISMATCH ON region_code          -> UNDERSTATEMENT
#    "uk-s" != "UK-S". Those customers match no region and are
#    dropped by the inner join. Silently.
#
# 5. (LATENT) DTYPE MISMATCH ON customer_id
#    If orders carried it as int and customers as str, EVERYTHING
#    would fail to match -- which would be a 100% understatement and
#    would have been noticed. It is on the list because the rewrite
#    must guard against it.
#
# THE 38%: mechanism 1 adds, mechanisms 2-4 subtract. A net +38% means
# the duplicated customer's orders exceed everything that was dropped.
# "It was correct last month" points at the migration: the duplicate
# is new; the other leaks were there before but small.


def demonstrate():
    orders = pd.DataFrame({
        "order_id": range(1, 7),
        "customer_id": [1, 1, 2, 3, 4, 5],
        "amount": [1000.0, 1000.0, 100.0, 100.0, 100.0, 100.0],
    })
    customers = pd.DataFrame({
        "customer_id": [1, 1, 2, 3, 4],          # 1 duplicated; 5 missing
        "region_code": ["UK-S", "UK-S", "UK-N", None, "uk-s"],
    })
    regions = pd.DataFrame({
        "region_code": ["UK-S", "UK-N"],
        "region_name": ["South", "North"],
    })

    naive = (orders.merge(customers, on="customer_id")
                   .merge(regions, on="region_code")
                   .groupby("region_name")["amount"].sum())

    return orders["amount"].sum(), naive.sum()
    # (2400.0, 4100.0): customer 1's 2000 counted twice (+2000),
    # customers 3, 4, 5 dropped (-300). Net +1700 -- a 71% overstatement
    # on this toy data.


# =========================================================================
# THE REWRITE
# =========================================================================

def _check_key_dtypes(left, right, key):
    if left[key].dtype != right[key].dtype:
        raise TypeError(
            f"key {key!r} is {left[key].dtype} on the left and "
            f"{right[key].dtype} on the right -- nothing will match"
        )


def revenue_by_region(orders, customers, regions, *, min_coverage=0.98):
    """Revenue per region that reconciles to the order total.

    Every merge is a validated left join. Rows that fail to match at
    any stage are kept and reported under "(unmatched: <stage>)", so
    the sum of the output ALWAYS equals the sum of the input.
    """
    total_in = float(orders["amount"].sum())
    n_in = len(orders)

    # --- STAGE 1: customers -------------------------------------------
    _check_key_dtypes(orders, customers, "customer_id")

    # THE DUPLICATE. validate raises; but a clearer message names the
    # offending keys, so check first and raise with them.
    dup_keys = customers.loc[customers["customer_id"].duplicated(), "customer_id"]
    if len(dup_keys):
        raise ValueError(
            f"customers has {len(dup_keys)} duplicated customer_id "
            f"(e.g. {sorted(dup_keys.unique())[:5]}) -- every order for "
            "those customers would be counted more than once"
        )

    df = orders.merge(customers, on="customer_id", how="left",
                      validate="many_to_one", indicator="m1")
    assert len(df) == n_in, "left join changed the row count"

    no_customer = df["m1"] == "left_only"
    df = df.drop(columns="m1")

    # --- STAGE 2: regions ---------------------------------------------
    # NORMALISE THE KEY on both sides. Case and whitespace are the two
    # ways a string key silently fails to match.
    df["region_code"] = df["region_code"].str.strip().str.upper()
    regions = regions.assign(
        region_code=regions["region_code"].str.strip().str.upper()
    )
    if regions["region_code"].duplicated().any():
        raise ValueError("regions has duplicated region_code after normalisation")

    df = df.merge(regions, on="region_code", how="left",
                  validate="many_to_one", indicator="m2")
    assert len(df) == n_in

    no_region = (df["m2"] == "left_only") & ~no_customer
    df = df.drop(columns="m2")

    # --- LABEL THE UNMATCHED rather than dropping them ---------------
    df["region_name"] = df["region_name"].astype(object)
    df.loc[no_customer, "region_name"] = "(unmatched: no customer)"
    df.loc[no_region, "region_name"] = "(unmatched: no region)"

    # groupby with dropna=False would also keep NaN keys, but a NAMED
    # bucket tells the reader which stage failed.
    out = df.groupby("region_name")["amount"].sum().sort_index()

    # --- RECONCILE ----------------------------------------------------
    total_out = float(out.sum())
    if abs(total_out - total_in) > 1e-6:
        raise AssertionError(
            f"output {total_out:.2f} != input {total_in:.2f}"
        )

    matched = 1 - (no_customer | no_region).mean()
    report = {
        "orders": n_in,
        "total": total_in,
        "coverage": round(float(matched), 4),
        "unmatched_no_customer": int(no_customer.sum()),
        "unmatched_no_region": int(no_region.sum()),
        "unmatched_amount": float(df.loc[no_customer | no_region, "amount"].sum()),
    }
    if matched < min_coverage:
        raise ValueError(
            f"only {matched:.1%} of orders reached a region: {report}"
        )

    return out, report


# =========================================================================
# TESTS
# =========================================================================

def _tables():
    orders = pd.DataFrame({
        "order_id": range(1, 7),
        "customer_id": [1, 1, 2, 3, 4, 5],
        "amount": [1000.0, 1000.0, 100.0, 100.0, 100.0, 100.0],
    })
    customers = pd.DataFrame({
        "customer_id": [1, 2, 3, 4],
        "region_code": ["UK-S", "UK-N", None, "uk-s"],
    })
    regions = pd.DataFrame({
        "region_code": ["UK-S", "UK-N"],
        "region_name": ["South", "North"],
    })
    return orders, customers, regions


def test_the_naive_version_overstates():
    total_in, naive_total = demonstrate()
    assert naive_total > total_in


def test_output_reconciles_to_input():
    orders, customers, regions = _tables()
    out, rep = revenue_by_region(orders, customers, regions, min_coverage=0.0)

    assert abs(out.sum() - orders["amount"].sum()) < 1e-9


def test_duplicate_customer_is_rejected_with_the_key_named():
    orders, customers, regions = _tables()
    customers = pd.concat([customers, customers.iloc[[0]]])

    try:
        revenue_by_region(orders, customers, regions)
        assert False, "should have raised"
    except ValueError as e:
        assert "duplicated" in str(e) and "1" in str(e)


def test_unknown_customer_is_bucketed_not_dropped():
    orders, customers, regions = _tables()
    out, rep = revenue_by_region(orders, customers, regions, min_coverage=0.0)

    assert out["(unmatched: no customer)"] == 100.0        # customer 5
    assert rep["unmatched_no_customer"] == 1


def test_nan_region_is_bucketed_not_dropped():
    orders, customers, regions = _tables()
    out, rep = revenue_by_region(orders, customers, regions, min_coverage=0.0)

    assert out["(unmatched: no region)"] == 100.0          # customer 3


def test_case_mismatch_is_normalised():
    """Customer 4 has 'uk-s' and must land in South."""
    orders, customers, regions = _tables()
    out, _ = revenue_by_region(orders, customers, regions, min_coverage=0.0)

    assert out["South"] == 2100.0          # customer 1 (2000) + customer 4 (100)


def test_low_coverage_raises_by_default():
    orders, customers, regions = _tables()

    try:
        revenue_by_region(orders, customers, regions)      # 2 of 6 unmatched
        assert False, "should have raised"
    except ValueError as e:
        assert "coverage" in str(e) or "reached a region" in str(e)


def test_dtype_mismatch_on_key_is_rejected():
    orders, customers, regions = _tables()
    customers["customer_id"] = customers["customer_id"].astype(str)

    try:
        revenue_by_region(orders, customers, regions)
        assert False, "should have raised"
    except TypeError as e:
        assert "nothing will match" in str(e)


def test_clean_data_gives_full_coverage():
    orders, customers, regions = _tables()
    customers.loc[2, "region_code"] = "UK-N"
    customers = pd.concat([customers, pd.DataFrame(
        {"customer_id": [5], "region_code": ["UK-N"]})])

    out, rep = revenue_by_region(orders, customers, regions)
    assert rep["coverage"] == 1.0
    assert set(out.index) == {"South", "North"}`,
        notes: [
          { t: "p", text: "**One failure inflates the total and three deflate it, and the 38% is the net.** The duplicated customer from the CRM migration is new — \"it was correct last month\" is the clue — while the dropped rows were there before, small enough not to notice." },
          { t: "callout", kind: "insight", title: "Name the bucket, not just the count", body: [
            { t: "p", text: "`groupby(dropna=False)` would keep the unmatched rows as a single NaN group. **A named bucket — `(unmatched: no customer)` against `(unmatched: no region)` — tells the reader which stage failed** without anyone having to re-run the pipeline with breakpoints." },
            { t: "p", text: "The output still sums to the input, so the report reconciles and the data problem is visible in the same table." }
          ]},
          { t: "p", text: "**The duplicate check runs before `validate=` so the error can name the keys.** `MergeError` says the right side is not unique; a message listing the offending customer IDs is the one that gets acted on." },
          { t: "p", text: "**String keys fail on case and whitespace, silently.** `\"uk-s\"` matches nothing in a table of `\"UK-S\"`, and the inner join drops those rows without comment. Normalising both sides before the merge is one line and closes the whole class." },
          { t: "p", text: "**The dtype check is the guard against the failure that did not happen yet.** An int key on one side and a string on the other match nothing at all — a 100% understatement that would be noticed, but only after a report went out empty." },
          { t: "p", text: "**The reconciliation assertion is the one line that would have caught this on day one.** Output must equal input; if it does not, something was dropped or doubled, and the pipeline refuses to produce a number." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A left join returns more rows than the left table had. What does that tell you?",
          options: [
            "The right table was larger",
            "A key on the right side appears more than once, so some left rows were paired with several right rows",
            "The join should have been inner",
            "The key dtypes differ"
          ],
          answer: 1,
          why: "A left join keeps every left row at least once, so growth can only come from a left row matching multiple right rows — a duplicated key. `validate=\"many_to_one\"` turns this into a `MergeError` at the merge line instead of a quiet row-count change."
        }
      ]
    }
  ],

  takeaways: [
    "**Inner is the default and silently drops unmatched rows**; left keeps every left row and is the safer default for enrichment.",
    "**The output has one row per matching pair**, so a key appearing twice on each side contributes four rows.",
    "**A left join that grows has a duplicated right key; an inner join that shrinks has unmatched keys** — check the count before and after.",
    "**`validate=\"many_to_one\"` on every enrichment merge** costs one uniqueness check and turns a silent doubling into an immediate error.",
    "**`indicator=True` is a free coverage report**: `left_only` counts the failed lookups and names the keys.",
    "**There is no anti-join in pandas** — left join with `indicator`, then filter on `left_only`.",
    "**A dtype mismatch on the key matches nothing**, and depending on version may not raise; check both sides before merging.",
    "**String keys fail on case and whitespace** — normalise both sides.",
    "**`_x` and `_y` suffixes tell you nothing six lines later**; name them with `suffixes=`.",
    "**`concat` without `ignore_index` produces a duplicated index**, so `.loc[0]` returns two rows and the next index merge doubles.",
    "**`merge_asof` is the time join `merge` cannot do**; both sides must be sorted, `by=` scopes it to a group, and `direction=\"forward\"` is leakage in a feature.",
    "**Reconcile the output total to the input total.** If they differ, rows were dropped or doubled, and the pipeline should refuse to produce a number."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A revenue report is 38% higher than the source of truth after a CRM migration. What is the most likely cause?",
        options: [
          "Currency conversion",
          "A duplicated key in the customer lookup, so every order for that customer is counted twice after the join",
          "The inner join dropped rows",
          "A timezone shift"
        ],
        answer: 1,
        why: "Dropping rows can only lower a total; only a duplicated key on the enrichment side can raise it. The join did exactly what joins do — one row per matching pair — and `validate=\"many_to_one\"` would have raised at the line that caused it."
      },
      {
        stem: "Which is the safest default join for enriching a fact table from a lookup?",
        options: [
          "inner",
          "left — the row count cannot fall, so a failed lookup appears as NaN in a column rather than as missing rows",
          "outer",
          "cross"
        ],
        answer: 1,
        why: "Inner silently discards facts with no lookup match. Left preserves them with NaN, which is visible and countable via `indicator=True`. Combine it with `validate=\"many_to_one\"` so the other direction — a duplicated lookup row — also fails loudly."
      },
      {
        stem: "How do you find rows in the left table with no match on the right?",
        options: [
          "`how=\"anti\"`",
          "Left join with `indicator=True`, then keep rows where `_merge == \"left_only\"`",
          "`how=\"outer\"` then dropna",
          "Inner join and compare lengths"
        ],
        answer: 1,
        why: "pandas has no anti-join, and this is the idiom. It answers \"customers who never ordered\" and \"orders with no shipment\", and the `_merge` column is also the free coverage report for any enrichment join."
      },
      {
        stem: "`merge_asof(trades, quotes, on=\"time\", direction=\"forward\")` in a feature pipeline. What is the problem?",
        options: [
          "It is slower than backward",
          "It attaches the next quote after each trade — a future value, which is leakage in a feature",
          "It requires unsorted input",
          "It cannot handle duplicates"
        ],
        answer: 1,
        why: "Forward direction takes the first row at or after the key, which has not happened yet at prediction time. The default `backward` is the causal choice; `allow_exact_matches=False` additionally excludes a same-instant row when that would leak."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How can you tell whether a merge did what you intended?",
        strong: "The row count. A left join must return exactly the left table's count — if it grows, a right key is duplicated. An inner join that shrinks has unmatched keys. I would pass `validate=` to state the cardinality and have pandas check it, and `indicator=True` to count the unmatched rows and see which keys failed.",
        answer: [
          { t: "p", text: "Leading with the count rather than inspecting the output shows you have a fast, general check rather than a case-by-case one." },
          { t: "p", text: "Knowing both `validate=` and `indicator=` and what each catches is the practical signal." }
        ]
      },
      {
        level: "advanced",
        q: "A report total is higher than the source total. Where would you look?",
        strong: "A duplicated key on the enrichment side of a join — it is the only common mechanism that raises a total rather than lowering it. Every fact row matching that key gets multiplied. I would check `customers[\"customer_id\"].duplicated().sum()`, add `validate=\"many_to_one\"` to the merge, and put a reconciliation assertion — output total equals input total — at the end so it cannot recur.",
        answer: [
          { t: "p", text: "Reasoning from the direction of the error to the mechanism is what a senior engineer does; enumerating all possible bugs is what a junior one does." }
        ]
      },
      {
        level: "advanced",
        q: "When would you use `merge_asof` rather than `merge`?",
        strong: "When the match is on ordering rather than equality — the most recent price at or before each trade, the active configuration at each log line. It is the as-of join: backward by default, `by=` scopes it within a group, `tolerance=` rejects stale matches, and both sides must be sorted or it raises. In a feature pipeline the direction has to be backward, and `allow_exact_matches=False` when a same-instant row would leak.",
        answer: [
          { t: "p", text: "Naming the leakage implication of `direction=` connects a pandas detail to a modelling consequence, which is the level this question is testing." }
        ]
      }
    ]
  }
});

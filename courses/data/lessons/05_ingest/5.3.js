/* ============================================================================
   LESSON 5.3 — JSON and Nested Data
   ========================================================================= */
EC.receiveLesson({
  id: "5.3",

  lede: "**JSON is a tree and a DataFrame is a table.** Flattening one into the other is a decision about which branches become columns, which become rows, and what to do with the records that are shaped differently from the rest — and every default makes that decision for you in a way that drops something.",

  objectives: [
    "Flatten nested records into columns with `json_normalize`",
    "Turn arrays into rows with `record_path` and `explode`",
    "Handle records whose shape differs from their neighbours",
    "Read JSON Lines files efficiently, including ones larger than memory",
    "Decide when a relational split beats a wide frame"
  ],

  prerequisites: ["3.5", "5.1"],

  blocks: [

    { t: "h2", n: "01", text: "Trees into tables", id: "trees" },

    { t: "p", text: "A JSON record can contain objects inside objects and arrays inside those. **A table has one level: rows and columns.** Getting from one to the other means choosing, for every nested thing, whether it becomes a dotted column, a set of rows, or a string you deal with later." },

    { t: "dl", items: [
      ["Nested object", "A dict inside a record: `{\"user\": {\"id\": 1, \"name\": \"ada\"}}`. Flattens naturally into `user.id` and `user.name` columns."],
      ["Nested array", "A list inside a record: `{\"order\": 1, \"items\": [...]}`. Cannot become columns without a fixed length; becomes **rows**, one per element, with the parent's fields repeated."],
      ["`json_normalize`", "The flattener. Dotted column names for nested objects; `record_path=` to unroll one array into rows; `meta=` to carry parent fields down."],
      ["JSON Lines (`.jsonl`)", "One JSON object per line. Streamable — you can read it a line at a time — where a single JSON array must be parsed whole."],
      ["Schema drift", "Records in the same feed with different keys, types or nesting. The normal state of any JSON source that has existed for more than a month."],
      ["Relational split", "Storing a nested array as its own table with a foreign key, rather than repeating the parent's columns on every element."]
    ]},

    { t: "viz",
      title: "One record, two ways to flatten it",
      caption: "The nested object becomes dotted columns. The array cannot — it becomes one row per element, with the order fields repeated. That repetition is the cost of a flat table.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="A JSON order with a nested customer object and an items array, flattened into a one-row frame with dotted columns and into a two-row frame with one row per item">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">record</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="30" y="52" class="s-sub" style="fill:var(--ink-2)">{ "order": 17,</text>
    <text x="30" y="74" class="s-sub" style="fill:var(--accent)">  "customer": {"id": 4, "tier": "gold"},</text>
    <text x="30" y="96" class="s-sub" style="fill:var(--warn)">  "items": [</text>
    <text x="30" y="118" class="s-sub" style="fill:var(--warn)">    {"sku": "A", "qty": 2},</text>
    <text x="30" y="140" class="s-sub" style="fill:var(--warn)">    {"sku": "B", "qty": 1} ] }</text>
  </g>

  <text x="400" y="26" class="s-label" style="fill:var(--accent)">json_normalize(rec) — objects become columns</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="400" y="52" class="s-sub" style="fill:var(--ink-3)">order  customer.id  customer.tier  items</text>
    <text x="400" y="74" class="s-sub" style="fill:var(--ink-2)">17     4            gold           [{...},{...}]</text>
  </g>
  <text x="400" y="100" class="s-sub" style="fill:var(--ink-3)">one row; the array survives as a list in a cell — object dtype</text>

  <text x="400" y="150" class="s-label" style="fill:var(--warn)">record_path="items", meta=["order", ["customer","id"]]</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="400" y="176" class="s-sub" style="fill:var(--ink-3)">sku  qty  order  customer.id</text>
    <text x="400" y="198" class="s-sub" style="fill:var(--ink-2)">A    2    17     4</text>
    <text x="400" y="220" class="s-sub" style="fill:var(--ink-2)">B    1    17     4</text>
  </g>
  <text x="400" y="246" class="s-sub" style="fill:var(--ink-3)">two rows; the parent fields you named are repeated on each</text>
  <text x="400" y="266" class="s-sub" style="fill:var(--ink-3)">— an order with 0 items produces 0 rows and vanishes</text>
</svg>`
    },

    { t: "code", lang: "python", title: "json_normalize, and the three shapes it produces", code: `
import pandas as pd
import json

orders = [
    {"order": 17, "customer": {"id": 4, "tier": "gold"},
     "items": [{"sku": "A", "qty": 2}, {"sku": "B", "qty": 1}]},
    {"order": 18, "customer": {"id": 9, "tier": "silver"},
     "items": [{"sku": "A", "qty": 5}]},
    {"order": 19, "customer": {"id": 4, "tier": "gold"},
     "items": []},
]

# SHAPE 1: ONE ROW PER RECORD, objects flattened to dotted columns.
pd.json_normalize(orders)
#    order                                   items  customer.id customer.tier
# 0     17  [{'sku': 'A', 'qty': 2}, {'sku': 'B'...            4          gold
# 1     18                    [{'sku': 'A', 'qty': 5}]            9        silver
# 2     19                                      []            4          gold
#
# customer.id and customer.tier are proper columns. items is a column
# of LISTS -- object dtype, one Python list per cell. Nothing you can
# aggregate. The array has been carried, not flattened.

# max_level= STOPS FLATTENING AT A DEPTH:
pd.json_normalize(orders, max_level=0)     # customer stays a dict

# sep= CHANGES THE JOINER -- "_" is friendlier to SQL and to attribute
# access than ".":
pd.json_normalize(orders, sep="_").columns   # customer_id, customer_tier

# SHAPE 2: ONE ROW PER ARRAY ELEMENT, with parent fields carried down.
pd.json_normalize(orders, record_path="items",
                  meta=["order", ["customer", "id"]])
#   sku  qty  order  customer.id
# 0   A    2     17            4
# 1   B    1     17            4
# 2   A    5     18            9
#
# THREE ROWS FROM THREE ORDERS -- order 19 has an empty items list and
# PRODUCES NO ROWS. It is gone from this frame. If the question is
# "revenue per order", order 19 has none and this is right. If it is
# "how many orders", this frame under-counts by one.

# meta TAKES A PATH AS A LIST for nested fields: ["customer", "id"].
# meta_prefix= and record_prefix= keep names from colliding:
pd.json_normalize(orders, record_path="items",
                  meta=["order", ["customer", "id"]],
                  record_prefix="item_", meta_prefix="order_")
#   item_sku  item_qty  order_order  order_customer.id
#
# Worth it when both levels have an "id".

# SHAPE 3: BOTH -- the parent frame and the child frame, joined by key.
parents = pd.json_normalize(orders, sep="_").drop(columns="items")
children = pd.json_normalize(orders, record_path="items", meta=["order"])
#
# parents: 3 rows (order 19 included, no items)
# children: 3 rows (item lines), each with its order number
#
# This is the RELATIONAL SPLIT. Nothing is repeated, nothing is lost,
# and order 19 exists. A merge reconstructs either flat shape when
# needed:
parents.merge(children, on="order", how="left")    # order 19 with NaN sku

# explode: THE ALTERNATIVE for arrays of SCALARS, or when you already
# have the wide frame:
tags = pd.DataFrame({"post": [1, 2, 3], "tags": [["a", "b"], ["c"], []]})
tags.explode("tags")
#    post tags
# 0     1    a
# 0     1    b
# 1     2    c
# 2     3  NaN         <- explode KEEPS the empty case, as NaN
#
# explode and record_path DISAGREE on empty arrays: explode gives a
# NaN row, record_path gives nothing. Neither is wrong; know which
# you got.

# AN ARRAY OF DICTS AFTER explode still needs flattening:
wide = pd.json_normalize(orders, sep="_")
lines = wide.explode("items").dropna(subset=["items"])
pd.concat([lines.drop(columns="items").reset_index(drop=True),
           pd.json_normalize(lines["items"].tolist())], axis=1)
#
# explode, then normalize the exploded column, then concatenate. Three
# steps where record_path is one -- but it works on a frame you
# already have rather than needing the raw records.
`,
      hl: [21, 36, 51, 71],
      caption: "**`record_path` drops a record with an empty array; `explode` keeps it as a NaN row.** Neither is wrong, and \"how many orders\" gets a different answer from each."
    },

    { t: "h2", n: "02", text: "Records that do not match their neighbours", id: "drift" },

    { t: "p", text: "**Every JSON feed drifts.** A field is added, a field becomes optional, a string becomes a number, a scalar becomes an array. `json_normalize` handles missing keys with NaN and handles everything else by giving you an object column and no warning." },

    { t: "code", lang: "python", title: "the four kinds of drift, and what each does to the frame", code: `
drifted = [
    {"id": 1, "amount": 10.5, "tags": ["a"], "meta": {"src": "web"}},
    {"id": 2, "amount": "12.00", "tags": "b", "meta": {"src": "app", "v": 2}},
    {"id": 3, "tags": ["c", "d"], "meta": None},
    {"id": 4, "amount": 8.0, "tags": [], "meta": {"src": "web"}, "new": True},
]

df = pd.json_normalize(drifted)
df.dtypes
# id            int64
# amount       object      <- DRIFT 1: mixed float and string. object.
# tags         object      <- DRIFT 2: list, string, list, list. object.
# new          object      <- DRIFT 3: present in one record. True/NaN.
# meta.src     object      <- DRIFT 4: meta was None once. NaN there.
# meta.v      float64      <- present once, float because of NaN.

# DRIFT 1: A TYPE CHANGED. 10.5 and "12.00" in one column.
df["amount"].sum()                  # TypeError, eventually -- or a string
pd.to_numeric(df["amount"], errors="coerce")     # 10.5, 12.0, NaN, 8.0
#
# errors="coerce" turns anything unparseable into NaN. The count of
# NaN AFTER coercion minus the count BEFORE is the number of values
# that were not numbers. Report it.

# DRIFT 2: A SCALAR WHERE AN ARRAY WAS EXPECTED. "b" instead of ["b"].
df["tags"].map(type).value_counts()          # list: 3, str: 1
df["tags"] = df["tags"].map(lambda t: t if isinstance(t, list) else [t])
#
# Normalise the SHAPE before exploding. explode on a string splits it
# into characters -- "b" is fine, "hello" becomes five rows.

# DRIFT 3: A NEW FIELD. Present in some records, NaN in the rest.
# json_normalize handles this correctly and silently. The silence is
# the problem: nobody knows the feed changed.
expected = {"id", "amount", "tags", "meta.src"}
unexpected = set(df.columns) - expected
unexpected                                   # {'new', 'meta.v'}
#
# Compare the column set to a declared schema on every load. New
# columns are a finding, not a feature.

# DRIFT 4: A NULL WHERE AN OBJECT WAS. meta: None.
# json_normalize gives NaN for every meta.* column on that row. Fine.
# But a null where an ARRAY was expected:
pd.json_normalize([{"id": 1, "items": None}], record_path="items")
# TypeError: 'NoneType' object is not iterable
#
# record_path REQUIRES a list at the path. Pre-fill:
for rec in drifted:
    rec.setdefault("items", [])
    if rec["items"] is None:
        rec["items"] = []

# THE GENERAL DEFENCE: A SHAPE REPORT BEFORE NORMALISING.
def shape_report(records, sample=1000):
    """Which keys appear, how often, with which types."""
    from collections import defaultdict
    keys = defaultdict(lambda: defaultdict(int))
    n = 0
    for rec in records[:sample]:
        n += 1
        for k, v in rec.items():
            keys[k][type(v).__name__] += 1
    return {k: {"present": round(sum(t.values()) / n, 3), "types": dict(t)}
            for k, t in keys.items()}

shape_report(drifted)
# {'id':     {'present': 1.0,  'types': {'int': 4}},
#  'amount': {'present': 0.75, 'types': {'float': 2, 'str': 1}},   <- 2 problems
#  'tags':   {'present': 1.0,  'types': {'list': 3, 'str': 1}},    <- 1 problem
#  'meta':   {'present': 1.0,  'types': {'dict': 3, 'NoneType': 1}},
#  'new':    {'present': 0.25, 'types': {'bool': 1}}}              <- new field
#
# One pass over a sample tells you every drift before it becomes an
# object column. Run it on every load and diff it against last time.

# THE HONEST OUTCOME for a badly drifted field: keep it as a string.
df["meta_raw"] = [json.dumps(r.get("meta")) for r in drifted]
#
# A JSON string in a column is not analysable, but it is not LOST.
# It can be re-parsed when the schema is understood. A column
# coerced to NaN cannot.
`,
      hl: [17, 29, 41, 62],
      caption: "**A new field is handled correctly and silently.** The silence is the problem — compare the column set to a declared schema on every load, because a new column is a finding, not a feature."
    },

    { t: "callout", kind: "trap", title: "explode on a string splits it into characters", body: [
      { t: "p", text: "One record has `\"tags\": \"hello\"` where every other has a list. `explode(\"tags\")` on that row produces **five rows — h, e, l, l, o** — because a string is iterable and explode iterates." },
      { t: "p", text: "**Check `.map(type).value_counts()` on any column you are about to explode**, and wrap scalars in a list first. The failure is silent and the five extra rows look like tags." },
      { t: "p", text: "The same applies to a dict: exploding one iterates its keys." }
    ]},

    { t: "h2", n: "03", text: "Reading JSON files", id: "files" },

    { t: "code", lang: "python", title: "read_json, JSON Lines, and streaming a large file", code: `
import io

# THREE FILE LAYOUTS, and orient= tells read_json which:
records = '[{"id": 1, "v": 10}, {"id": 2, "v": 20}]'          # a JSON array
pd.read_json(io.StringIO(records))                            # orient="records" inferred

columns = '{"id": [1, 2], "v": [10, 20]}'                     # column -> list
pd.read_json(io.StringIO(columns))                            # orient="columns"

index = '{"0": {"id": 1, "v": 10}, "1": {"id": 2, "v": 20}}'  # index -> record
pd.read_json(io.StringIO(index), orient="index")

# read_json DOES TYPE INFERENCE, INCLUDING ON DATES, and it is
# aggressive: a column of large integers can be read as epoch
# timestamps.
pd.read_json(io.StringIO('[{"id": 1700000000}]'))["id"].dtype
# datetime64[ns] -- it decided 1700000000 was a Unix timestamp
pd.read_json(io.StringIO('[{"id": 1700000000}]'), convert_dates=False)["id"].dtype
# int64
#
# convert_dates=False, or a list of the columns that ARE dates. The
# default is a guess that is wrong on IDs and big counts.

# dtype=False TURNS OFF ALL INFERENCE; dtype={...} pins specific columns.

# JSON LINES: one object per line. The format for anything large.
jsonl = '{"id": 1, "v": 10}\\n{"id": 2, "v": 20}\\n{"id": 3, "v": 30}\\n'
pd.read_json(io.StringIO(jsonl), lines=True)
#
# WHY IT MATTERS: a JSON ARRAY must be parsed as a whole -- the parser
# cannot know where record 500,000 ends without reading to the
# closing bracket. JSON Lines can be read a line at a time.

# STREAMING JSON LINES IN CHUNKS:
# reader = pd.read_json("big.jsonl", lines=True, chunksize=100_000)
# for chunk in reader:
#     process(chunk)
#
# Same pattern as read_csv chunksize. Same rule: per-chunk inference,
# so pass dtype=.

# NESTED JSON LINES: read_json gives you the top level; json_normalize
# does the rest.
nested_jsonl = ('{"id": 1, "user": {"n": "a"}, "items": [{"s": "x"}]}\\n'
                '{"id": 2, "user": {"n": "b"}, "items": []}\\n')
top = pd.read_json(io.StringIO(nested_jsonl), lines=True)
top.dtypes                    # user: object (dicts), items: object (lists)
pd.json_normalize(top.to_dict("records"), sep="_")          # flatten
pd.json_normalize(top.to_dict("records"), record_path="items", meta=["id"])

# OR SKIP read_json AND PARSE LINES YOURSELF, which gives control over
# bad lines:
def read_jsonl(path, max_bad=0.01):
    good, bad = [], []
    with open(path, encoding="utf-8") as fh:
        for i, line in enumerate(fh):
            line = line.strip()
            if not line:
                continue
            try:
                good.append(json.loads(line))
            except json.JSONDecodeError:
                bad.append((i, line[:80]))
    if len(bad) > max_bad * (len(good) + len(bad)):
        raise ValueError(f"{len(bad)} bad lines; first: {bad[0]}")
    return good, bad
#
# read_json(lines=True) raises on the first malformed line and tells
# you nothing about how many there are. A truncated final line -- the
# most common defect in a streamed file -- is one bad line at the end,
# and a loader that counts it is more useful than one that fails.

# WRITING:
df = pd.DataFrame({"id": [1, 2], "v": [10.5, None]})
df.to_json(orient="records", lines=True)      # JSON Lines, one per row
# {"id":1,"v":10.5}
# {"id":2,"v":null}
#
# NaN becomes null. Dates become epoch MILLISECONDS by default, which
# nobody wants:
pd.DataFrame({"t": [pd.Timestamp("2026-03-01")]}).to_json(orient="records")
# [{"t":1772323200000}]
pd.DataFrame({"t": [pd.Timestamp("2026-03-01")]}).to_json(orient="records", date_format="iso")
# [{"t":"2026-03-01T00:00:00.000"}]
#
# date_format="iso" every time. The epoch default is a trap for every
# consumer that is not pandas.
`,
      hl: [15, 30, 50, 76],
      caption: "**`read_json` decided `1700000000` was a timestamp.** Its date inference is aggressive and wrong on IDs and large counts — `convert_dates=False` unless you name the date columns."
    },

    { t: "table",
      head: ["Situation", "Reach for", "Because"],
      rows: [
        ["Nested objects, no arrays", "`json_normalize(records, sep=\"_\")`", "Dotted columns are exactly right"],
        ["One array per record, need one row per element", "`json_normalize(record_path=..., meta=[...])`", "One call; carries parent fields down"],
        ["Array elements are scalars, frame already exists", "`df.explode(col)`", "No re-parsing; keeps empty as NaN"],
        ["Several arrays per record", "Relational split: one frame per array, joined by key", "Two `record_path` calls would multiply rows across arrays"],
        ["Records drift in shape", "`shape_report` first, then normalise with a schema check", "Object columns are silent; the report is not"],
        ["File is large", "JSON Lines with `chunksize=`", "A JSON array cannot be streamed"],
        ["A field is too irregular to flatten", "Keep it as a JSON string column", "Not analysable yet, but not lost"]
      ],
      caption: "**Two arrays in one record cannot both be `record_path`.** Unrolling both produces the cartesian product of their lengths — an order with 3 items and 2 payments becomes 6 rows. Split them into two frames."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "An event feed with two arrays and a drifting schema",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A JSON Lines feed of e-commerce orders. Each record has customer details, an `items` array and a `payments` array. Over the feed's life: `discount` was added as a field, `items[].qty` changed from int to string on one client version, and some records have `payments: null`." },
        { t: "p", text: "Build the loader that produces three clean frames — orders, items, payments — with correct types, a schema-drift report, and totals that reconcile." }
      ],
      requirements: [
        "Three frames joined by `order_id`, with no row multiplication.",
        "Coerce drifted types and count what was coerced.",
        "Handle null and missing arrays without losing the parent record.",
        "Report new and missing fields against a declared schema.",
        "Reconcile: sum of item lines equals order totals, sum of payments equals order totals.",
        "Include tests with a hand-built feed exercising each drift."
      ],
      hint: "If you `record_path` items and then payments from the same records, an order with 3 items and 2 payments becomes 6 rows. That is the bug to avoid, and the reason for three frames.",
      solution: {
        lang: "python",
        title: "order_feed.py",
        code: `import pandas as pd
import numpy as np
import json
from collections import defaultdict


# =========================================================================
# THE DECLARED SCHEMA -- what we EXPECT, so drift is measurable
# =========================================================================

ORDER_FIELDS = {"order_id", "ts", "customer", "items", "payments", "total"}
OPTIONAL_ORDER_FIELDS = {"discount"}            # known additions
ITEM_FIELDS = {"sku", "qty", "unit_price"}
PAYMENT_FIELDS = {"method", "amount"}


# =========================================================================
# SHAPE REPORT -- run before touching the data
# =========================================================================

def shape_report(records):
    keys = defaultdict(lambda: defaultdict(int))
    for rec in records:
        for k, v in rec.items():
            keys[k][type(v).__name__] += 1
    n = len(records) or 1
    seen = set(keys)
    return {
        "records": len(records),
        "fields": {k: {"present": round(sum(t.values()) / n, 4),
                       "types": dict(t)} for k, t in keys.items()},
        "unexpected_fields": sorted(seen - ORDER_FIELDS - OPTIONAL_ORDER_FIELDS),
        "missing_fields": sorted(ORDER_FIELDS - seen),
    }


# =========================================================================
# THE LOADER
# =========================================================================

def load_feed(lines):
    """Three frames from a JSON Lines feed. Never multiplies rows."""
    records, bad = [], []
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            bad.append(i)

    report = {"bad_lines": len(bad), "shape": shape_report(records)}

    # NORMALISE ARRAY FIELDS BEFORE record_path: None -> [], missing -> [].
    # record_path raises on None and KeyErrors on missing.
    for rec in records:
        for arr in ("items", "payments"):
            if rec.get(arr) is None:
                rec[arr] = []

    # --- ORDERS: one row per record, arrays dropped -------------------
    orders = pd.json_normalize(records, sep="_")
    orders = orders.drop(columns=[c for c in ("items", "payments") if c in orders])
    orders["order_id"] = orders["order_id"].astype(str)         # identifier
    orders["ts"] = pd.to_datetime(orders["ts"], utc=True, errors="coerce")
    orders["total"] = pd.to_numeric(orders["total"], errors="coerce")
    if "discount" not in orders:
        orders["discount"] = 0.0                # older feed: field absent
    orders["discount"] = pd.to_numeric(orders["discount"], errors="coerce").fillna(0.0)

    # --- ITEMS: one row per element, SEPARATELY from payments ----------
    # Two record_path calls on the same records is the point: each
    # unrolls ONE array. Doing both in one call is impossible, and
    # doing it by explode-then-explode multiplies.
    items = pd.json_normalize(records, record_path="items", meta=["order_id"])
    items["order_id"] = items["order_id"].astype(str)

    # DRIFT: qty arrived as a string on one client. Coerce and count.
    qty_raw = items["qty"]
    items["qty"] = pd.to_numeric(qty_raw, errors="coerce")
    coerced_qty = int(qty_raw.map(lambda v: isinstance(v, str)).sum())
    failed_qty = int(items["qty"].isna().sum())
    items["unit_price"] = pd.to_numeric(items["unit_price"], errors="coerce")
    items["line_total"] = items["qty"] * items["unit_price"]

    # --- PAYMENTS -------------------------------------------------------
    payments = pd.json_normalize(records, record_path="payments", meta=["order_id"])
    if len(payments):
        payments["order_id"] = payments["order_id"].astype(str)
        payments["amount"] = pd.to_numeric(payments["amount"], errors="coerce")
    else:
        payments = pd.DataFrame(columns=["method", "amount", "order_id"])

    # --- RECONCILIATION -------------------------------------------------
    item_totals = items.groupby("order_id")["line_total"].sum()
    pay_totals = payments.groupby("order_id")["amount"].sum()
    check = orders.set_index("order_id")[["total", "discount"]].copy()
    check["items"] = item_totals.reindex(check.index).fillna(0.0)
    check["paid"] = pay_totals.reindex(check.index).fillna(0.0)
    check["expected"] = check["items"] - check["discount"]

    mismatch_items = ~np.isclose(check["expected"], check["total"], atol=0.01)
    mismatch_paid = ~np.isclose(check["paid"], check["total"], atol=0.01)

    report.update({
        "orders": len(orders),
        "items": len(items),
        "payments": len(payments),
        "orders_without_items": int((check["items"] == 0).sum()),
        "orders_without_payments": int((check["paid"] == 0).sum()),
        "qty_coerced_from_string": coerced_qty,
        "qty_unparseable": failed_qty,
        "total_mismatch_vs_items": sorted(check.index[mismatch_items].tolist()),
        "total_mismatch_vs_paid": sorted(check.index[mismatch_paid].tolist()),
    })
    return orders, items, payments, report


# =========================================================================
# WHY THREE FRAMES
# =========================================================================
#
# An order with 3 items and 2 payments, flattened into one frame via
# both arrays, is 6 rows. Every item appears twice, every payment
# three times. Summing line_total gives 2x revenue; summing amount
# gives 3x. The multiplication is silent and the totals look like
# totals.
#
# Three frames, each with order_id, is the relational form. Nothing
# repeats. Any wide view is a merge, and a merge with validate= tells
# you if it would multiply.


# =========================================================================
# TESTS
# =========================================================================

FEED = [
    # clean
    '{"order_id": "1", "ts": "2026-03-01T10:00:00Z", "customer": {"id": 4},'
    ' "items": [{"sku": "A", "qty": 2, "unit_price": 5.0},'
    '           {"sku": "B", "qty": 1, "unit_price": 10.0}],'
    ' "payments": [{"method": "card", "amount": 15.0},'
    '              {"method": "voucher", "amount": 5.0}], "total": 20.0}',
    # drift: qty as string, discount present
    '{"order_id": "2", "ts": "2026-03-01T11:00:00Z", "customer": {"id": 9},'
    ' "items": [{"sku": "A", "qty": "3", "unit_price": 5.0}],'
    ' "payments": [{"method": "card", "amount": 12.0}], "total": 12.0,'
    ' "discount": 3.0}',
    # drift: payments null, no items, unexpected field
    '{"order_id": "3", "ts": "2026-03-01T12:00:00Z", "customer": {"id": 4},'
    ' "items": [], "payments": null, "total": 0.0, "channel": "app"}',
    # bad line
    '{"order_id": "4", "ts": ',
]


def test_three_frames_no_multiplication():
    """Order 1 has 2 items and 2 payments: must be 2 + 2 rows, not 4 x 2."""
    orders, items, payments, rep = load_feed(FEED)
    assert len(orders) == 3
    assert (items["order_id"] == "1").sum() == 2
    assert (payments["order_id"] == "1").sum() == 2


def test_the_multiplied_alternative():
    """What explode-twice does."""
    recs = [json.loads(FEED[0])]
    wide = pd.json_normalize(recs).explode("items").explode("payments")
    assert len(wide) == 4                     # 2 x 2


def test_qty_string_is_coerced_and_counted():
    orders, items, payments, rep = load_feed(FEED)
    assert items.loc[items["order_id"] == "2", "qty"].iloc[0] == 3
    assert rep["qty_coerced_from_string"] == 1
    assert rep["qty_unparseable"] == 0


def test_null_payments_keeps_the_order():
    orders, items, payments, rep = load_feed(FEED)
    assert "3" in orders["order_id"].values
    assert rep["orders_without_payments"] == 1
    assert rep["orders_without_items"] == 1


def test_missing_discount_defaults_to_zero():
    orders, *_ = load_feed(FEED)
    assert orders.set_index("order_id").loc["1", "discount"] == 0.0
    assert orders.set_index("order_id").loc["2", "discount"] == 3.0


def test_unexpected_field_is_reported():
    _, _, _, rep = load_feed(FEED)
    assert rep["shape"]["unexpected_fields"] == ["channel"]


def test_bad_line_is_counted():
    _, _, _, rep = load_feed(FEED)
    assert rep["bad_lines"] == 1


def test_reconciliation():
    orders, items, payments, rep = load_feed(FEED)
    # order 1: items 20, discount 0, paid 20 -> ok
    # order 2: items 15, discount 3 -> 12, paid 12 -> ok
    # order 3: items 0, total 0, paid 0 -> ok
    assert rep["total_mismatch_vs_items"] == []
    assert rep["total_mismatch_vs_paid"] == []


def test_reconciliation_catches_a_bad_total():
    feed = [FEED[0].replace('"total": 20.0', '"total": 25.0')]
    _, _, _, rep = load_feed(feed)
    assert rep["total_mismatch_vs_items"] == ["1"]
    assert rep["total_mismatch_vs_paid"] == ["1"]


def test_order_ids_are_strings():
    orders, items, payments, _ = load_feed(FEED)
    for f in (orders, items, payments):
        assert f["order_id"].dtype == object
        assert f["order_id"].iloc[0] == "1"


def test_timestamps_are_utc():
    orders, *_ = load_feed(FEED)
    assert orders["ts"].dt.tz is not None
    assert str(orders["ts"].dt.tz) == "UTC"


def test_empty_feed():
    orders, items, payments, rep = load_feed([])
    assert len(orders) == 0 and len(items) == 0 and len(payments) == 0`,
        notes: [
          { t: "p", text: "**Three frames because two arrays in one record cannot both be unrolled into one table.** An order with 3 items and 2 payments becomes 6 rows, every item twice and every payment three times — line totals sum to 2× revenue, payments to 3×, and both look like totals." },
          { t: "callout", kind: "insight", title: "Normalise the shape before normalising the data", body: [
            { t: "p", text: "`record_path` raises on `None` and `KeyError`s on a missing array. **Setting every array field to `[]` when it is null or absent, before any `json_normalize` call**, is what keeps order 3 in the orders frame with zero items rather than crashing the load." },
            { t: "p", text: "The same principle handles the string `qty`: coerce with `errors=\"coerce\"`, and count how many values were strings and how many failed — two numbers, because \"was a string but parsed\" and \"could not be parsed\" are different findings." }
          ]},
          { t: "p", text: "**The shape report runs before the data is touched.** One pass over the records yields presence and type per field, and a diff against the declared schema names `channel` as unexpected — which is the first anyone hears that the feed changed." },
          { t: "p", text: "**A missing `discount` on old records defaults to zero, explicitly.** The alternative — NaN, then `total - NaN` — makes every old order's reconciliation fail for a reason that is not a data problem." },
          { t: "p", text: "**Two reconciliations, because they catch different errors.** Items-minus-discount against the stated total catches a pricing bug; payments against total catches a partial or duplicate payment. The test that corrupts one total shows both firing." },
          { t: "p", text: "**The bad line is counted, not fatal.** A truncated final line is the most common defect in a streamed feed; `read_json(lines=True)` would raise on it and report nothing about the 99.9% that was fine." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`json_normalize(orders, record_path=\"items\", meta=[\"order\"])` returns fewer rows than there are orders. Why?",
          options: [
            "Some items were duplicated",
            "Orders with an empty items array produce no rows — they vanish from this frame",
            "meta must be a list of lists",
            "The records were not sorted"
          ],
          answer: 1,
          why: "`record_path` yields one row per array element; zero elements is zero rows. That is correct for \"revenue per line\" and wrong for \"how many orders\". Keep a separate orders frame, or use `explode`, which keeps the empty case as a NaN row."
        }
      ]
    }
  ],

  takeaways: [
    "**Nested objects become dotted columns; nested arrays become rows** — the array is the part that needs a decision.",
    "**`json_normalize` alone carries an array as a list in a cell**, object dtype, nothing you can aggregate.",
    "**`record_path` unrolls one array with `meta` carrying parent fields down** — and drops records whose array is empty.",
    "**`explode` keeps the empty case as a NaN row**; `record_path` gives nothing — know which you got.",
    "**Two arrays in one record cannot both be `record_path`** — the result is the cartesian product; split into separate frames.",
    "**`explode` on a string iterates its characters** — check `.map(type).value_counts()` first and wrap scalars.",
    "**A new field is handled correctly and silently**; compare the column set to a declared schema on every load.",
    "**A type that drifts produces an object column with no warning** — coerce with `errors=\"coerce\"` and count what failed.",
    "**`record_path` raises on `None`** — set null and missing arrays to `[]` before normalising.",
    "**A JSON array must be parsed whole; JSON Lines can be streamed** — use `lines=True` and `chunksize=` for anything large.",
    "**`read_json` infers dates aggressively**, turning large integers into timestamps; `convert_dates=False` unless you name the date columns.",
    "**`to_json` writes dates as epoch milliseconds by default** — `date_format=\"iso\"` every time."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A record has `items` (3 elements) and `payments` (2 elements). What does flattening both into one frame produce?",
        options: [
          "5 rows",
          "6 rows — the cartesian product, with every item repeated twice and every payment three times",
          "3 rows",
          "An error"
        ],
        answer: 1,
        why: "Unrolling two independent arrays into one table multiplies their lengths. Line totals sum to double the revenue and payments to triple, with nothing to say so. The relational form — one frame per array, joined by the parent key — is the only one that does not repeat."
      },
      {
        stem: "Why is JSON Lines preferred over a JSON array for large files?",
        options: [
          "It compresses better",
          "One object per line can be read and parsed incrementally; a JSON array cannot be parsed until the closing bracket is reached",
          "It supports more types",
          "pandas cannot read JSON arrays"
        ],
        answer: 1,
        why: "A parser cannot know where record 500,000 ends in an array without reading to the end. JSON Lines makes each line independent, so `read_json(lines=True, chunksize=...)` streams it, and a single malformed line is one bad record rather than a failed file."
      },
      {
        stem: "`pd.read_json(...)[\"id\"]` has dtype `datetime64[ns]` but the IDs are integers like 1700000000. What happened?",
        options: [
          "The file stored dates",
          "read_json's date inference decided large integers were epoch timestamps",
          "The column name contained 'date'",
          "A timezone was set"
        ],
        answer: 1,
        why: "`read_json` tries to convert plausible-looking columns to dates by default, and a Unix-epoch-sized integer qualifies. `convert_dates=False`, or a list naming only the real date columns, turns the guess off."
      },
      {
        stem: "One record in a feed has `\"tags\": \"hello\"` instead of a list. What does `explode(\"tags\")` do to it?",
        options: [
          "Raises a TypeError",
          "Produces five rows — h, e, l, l, o — because a string is iterable",
          "Keeps it as one row",
          "Converts it to a list automatically"
        ],
        answer: 1,
        why: "explode iterates whatever it finds. Five extra rows that look like single-character tags is a silent corruption. Check the types before exploding and wrap scalars in a list; a dict would be exploded into its keys the same way."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you flatten nested JSON into a DataFrame?",
        strong: "`json_normalize` for nested objects — they become dotted columns. For arrays, `record_path` unrolls one into rows with `meta` carrying the parent fields down. The decision is what to do with the array: one row per element loses records with empty arrays, keeping it as a list column makes it unanalysable, and two arrays in one record cannot both be unrolled without a cartesian product. Usually that means one frame per array, joined by the parent key.",
        answer: [
          { t: "p", text: "Presenting the array as a decision with consequences, rather than as a method call, is what separates this from a documentation recital." }
        ]
      },
      {
        level: "advanced",
        q: "A JSON feed has been running for a year. What has changed, and how would you find out?",
        strong: "Fields have been added, some have become optional, at least one type has changed, and some arrays are null on some records. `json_normalize` handles all of that without a warning — new fields appear as columns, type changes become object dtype, null arrays raise on `record_path`. I would run a shape report on every load — presence and types per field — and diff it against a declared schema, so the change is a line in a report rather than a surprise in a groupby.",
        answer: [
          { t: "p", text: "Asserting that drift is the normal state, not an edge case, is the experienced position." }
        ]
      },
      {
        level: "advanced",
        q: "When would you keep a JSON field as a string column rather than flatten it?",
        strong: "When it is too irregular to flatten honestly — a field whose shape varies record to record, or one whose schema nobody has documented yet. A JSON string in a column is not analysable, but it is not lost; it can be re-parsed once the schema is understood. A field coerced to NaN, or flattened into forty sparse columns, cannot be recovered.",
        answer: [
          { t: "p", text: "\"Not lost\" as the criterion — over \"clean\" — is the judgement being tested." }
        ]
      }
    ]
  }
});

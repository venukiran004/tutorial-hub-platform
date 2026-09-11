/* ============================================================================
   LESSON 6.3 — Data Quality Dimensions
   ========================================================================= */
EC.receiveLesson({
  id: "6.3",

  lede: "**\"The data is bad\" is not a finding. \"Eleven percent of orders have a ship date before their order date\" is.** Data quality has six named dimensions — completeness, validity, consistency, uniqueness, timeliness, accuracy — and each one is a specific, automatable test that produces a number, a list of failing rows, and a decision about whether the pipeline should continue.",

  objectives: [
    "Name the six quality dimensions and give a testable definition of each",
    "Write an assertion for each dimension that reports failing rows rather than raising on the first",
    "Distinguish a hard failure that stops the pipeline from a soft one that is logged",
    "Explain why accuracy is the dimension that cannot be tested from the data alone",
    "Build a quality gate that runs on every load and records its history"
  ],

  prerequisites: ["6.1"],

  blocks: [

    { t: "h2", n: "01", text: "Six dimensions, six tests", id: "dimensions" },

    { t: "p", text: "Each dimension is a different way data can be wrong, and **each has a test that can be written before the data arrives**. That is what makes them useful: they turn a vague concern into a check that runs on every load and has a pass/fail history." },

    { t: "dl", items: [
      ["Completeness", "Is every value that should be present, present? Missing rate per column against a threshold; required fields with zero nulls."],
      ["Validity", "Does every value conform to its type, format and domain? Emails that match a pattern, ages between 0 and 120, statuses from an allowed set."],
      ["Consistency", "Do values agree with each other, within a row and across tables? `ship_date >= order_date`; `total == price × qty`; every `customer_id` in orders exists in customers."],
      ["Uniqueness", "Is each real-world entity represented once? No duplicate keys; no duplicate rows on the columns that define identity."],
      ["Timeliness", "Is the data recent enough, and did it arrive when expected? The latest timestamp against now; the load time against the schedule."],
      ["Accuracy", "Does the value match reality? **The only dimension that cannot be tested from the data alone** — it needs an external reference: a reconciliation total, a sampled audit, a second source."]
    ]},

    { t: "viz",
      title: "Where each dimension looks",
      caption: "Five dimensions are tested by looking at the data itself — one cell, one row, one column, or across tables. Accuracy needs something outside the data to compare against.",
      svg: `<svg viewBox="0 0 880 320" role="img" aria-label="A table diagram with the six quality dimensions pointing at the scope each one tests: a cell, a column, a row, a key, a timestamp, and an external reference">
  <g stroke-width="1.5" style="fill:none;stroke:var(--line)">
    <rect x="200" y="60" width="360" height="160"/>
    <line x1="200" y1="92" x2="560" y2="92"/><line x1="200" y1="124" x2="560" y2="124"/>
    <line x1="200" y1="156" x2="560" y2="156"/><line x1="200" y1="188" x2="560" y2="188"/>
    <line x1="290" y1="60" x2="290" y2="220"/><line x1="380" y1="60" x2="380" y2="220"/><line x1="470" y1="60" x2="470" y2="220"/>
  </g>
  <text x="212" y="80" class="s-sub" style="fill:var(--ink-3)">id</text>
  <text x="302" y="80" class="s-sub" style="fill:var(--ink-3)">email</text>
  <text x="392" y="80" class="s-sub" style="fill:var(--ink-3)">start</text>
  <text x="482" y="80" class="s-sub" style="fill:var(--ink-3)">end</text>

  <rect x="292" y="126" width="86" height="28" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent);stroke-width:1.5"/>
  <text x="30" y="145" class="s-label" style="fill:var(--accent)">validity</text>
  <text x="30" y="163" class="s-sub" style="fill:var(--ink-3)">one cell: format, domain</text>
  <line x1="130" y1="140" x2="290" y2="140" style="stroke:var(--accent);stroke-width:1.2" marker-end="url(#dq-a)"/>

  <rect x="292" y="62" width="86" height="156" style="fill:var(--good);fill-opacity:.10;stroke:var(--good);stroke-width:1.5;stroke-dasharray:4 2"/>
  <text x="30" y="82" class="s-label" style="fill:var(--good)">completeness</text>
  <text x="30" y="100" class="s-sub" style="fill:var(--ink-3)">one column: missing rate</text>
  <line x1="150" y1="78" x2="290" y2="70" style="stroke:var(--good);stroke-width:1.2" marker-end="url(#dq-g)"/>

  <rect x="202" y="158" width="356" height="28" style="fill:var(--warn);fill-opacity:.15;stroke:var(--warn);stroke-width:1.5;stroke-dasharray:4 2"/>
  <text x="30" y="200" class="s-label" style="fill:var(--warn)">consistency</text>
  <text x="30" y="218" class="s-sub" style="fill:var(--ink-3)">across a row: end ≥ start</text>
  <line x1="130" y1="195" x2="200" y2="176" style="stroke:var(--warn);stroke-width:1.2" marker-end="url(#dq-w)"/>

  <rect x="202" y="62" width="86" height="156" style="fill:var(--crit);fill-opacity:.08;stroke:var(--crit);stroke-width:1.5;stroke-dasharray:4 2"/>
  <text x="600" y="82" class="s-label" style="fill:var(--crit)">uniqueness</text>
  <text x="600" y="100" class="s-sub" style="fill:var(--ink-3)">the key column: no repeats</text>
  <line x1="598" y1="78" x2="290" y2="66" style="stroke:var(--crit);stroke-width:1.2" marker-end="url(#dq-c)"/>

  <text x="600" y="145" class="s-label" style="fill:var(--ink-2)">timeliness</text>
  <text x="600" y="163" class="s-sub" style="fill:var(--ink-3)">max(end) vs now; load vs schedule</text>
  <line x1="598" y1="140" x2="560" y2="140" style="stroke:var(--ink-3);stroke-width:1.2" marker-end="url(#dq-k)"/>

  <rect x="600" y="190" width="240" height="40" rx="6" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line);stroke-width:1.5"/>
  <text x="614" y="208" class="s-label" style="fill:var(--ink-2)">accuracy</text>
  <text x="614" y="224" class="s-sub" style="fill:var(--ink-3)">needs a reference OUTSIDE the table</text>
  <line x1="600" y1="210" x2="562" y2="210" style="stroke:var(--ink-3);stroke-width:1.2;stroke-dasharray:3 3" marker-end="url(#dq-k)"/>

  <line x1="30" y1="252" x2="850" y2="252" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="278" class="s-sub" style="fill:var(--ink-3)">A value can be complete, valid, consistent, unique and timely — and wrong. That is accuracy, and no amount of looking at the table finds it.</text>
  <text x="30" y="300" class="s-sub" style="fill:var(--ink-3)">The other five are cheap and automatic. Accuracy is a reconciliation, an audit sample, or a second source.</text>

  <defs>
    <marker id="dq-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--accent)"/></marker>
    <marker id="dq-g" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--good)"/></marker>
    <marker id="dq-w" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--warn)"/></marker>
    <marker id="dq-c" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--crit)"/></marker>
    <marker id="dq-k" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/></marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "python", title: "one test per dimension, each returning the failing rows", code: `
import pandas as pd
import numpy as np
import re

orders = pd.DataFrame({
    "order_id":    [1, 2, 3, 3, 5, 6],
    "customer_id": [10, 11, 12, 12, None, 14],
    "email":       ["a@x.com", "bad-email", "c@x.com", "c@x.com", "e@x.com", "F@X.COM "],
    "status":      ["paid", "paid", "shipped", "shipped", "PAID", "refunded"],
    "amount":      [10.0, 20.0, 30.0, 30.0, -5.0, 40.0],
    "order_date":  pd.to_datetime(["2026-03-01", "2026-03-02", "2026-03-03",
                                   "2026-03-03", "2026-03-04", "2026-03-05"]),
    "ship_date":   pd.to_datetime(["2026-03-02", "2026-03-01", "2026-03-05",
                                   "2026-03-05", None, "2026-03-06"]),
})
customers = pd.DataFrame({"customer_id": [10, 11, 12, 13]})

# EVERY CHECK RETURNS A BOOLEAN MASK OF FAILING ROWS. Not a bool, not
# an exception: a mask. Then the caller decides what to do, and the
# report can show WHICH rows and HOW MANY.

# --- COMPLETENESS ------------------------------------------------------
def completeness(df, required):
    """Rows missing any required field."""
    return df[required].isna().any(axis=1)

completeness(orders, ["order_id", "customer_id", "amount"])
# row 4: customer_id is None

# --- VALIDITY -----------------------------------------------------------
EMAIL = re.compile(r"^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
ALLOWED_STATUS = {"paid", "shipped", "refunded", "cancelled"}

def validity(df):
    """Values that fail their format, type or domain."""
    bad_email = ~df["email"].str.strip().str.lower().str.fullmatch(EMAIL.pattern, na=False)
    bad_status = ~df["status"].isin(ALLOWED_STATUS)          # "PAID" fails
    bad_amount = ~(df["amount"] >= 0)                         # negative, or NaN
    bad_date = df["order_date"].isna() | (df["order_date"] > pd.Timestamp.now())
    return pd.DataFrame({"email": bad_email, "status": bad_status,
                         "amount": bad_amount, "order_date": bad_date})

validity(orders).sum()
# email         1     <- "bad-email"
# status        1     <- "PAID": the domain is case-sensitive, and so is
#                        every downstream groupby
# amount        1     <- -5.0
# order_date    0

# --- CONSISTENCY --------------------------------------------------------
def consistency(df, ref):
    """Within-row rules and cross-table integrity."""
    ship_before_order = (df["ship_date"] < df["order_date"]).fillna(False)
    shipped_without_date = (df["status"] == "shipped") & df["ship_date"].isna()
    orphan = ~df["customer_id"].isin(ref["customer_id"]) & df["customer_id"].notna()
    return pd.DataFrame({"ship_before_order": ship_before_order,
                         "shipped_no_date": shipped_without_date,
                         "orphan_customer": orphan})

consistency(orders, customers).sum()
# ship_before_order    1     <- row 1
# shipped_no_date      0
# orphan_customer      1     <- row 5, customer 14 not in customers
#
# fillna(False) on the date comparison: a NaN ship_date makes the
# comparison NaN, and a NaN in a "failing rows" mask would be a
# silent third state. A missing ship_date is a COMPLETENESS finding,
# not a consistency one; each dimension reports its own.

# --- UNIQUENESS ---------------------------------------------------------
def uniqueness(df, key, identity=None):
    """Duplicate keys, and duplicate rows on the identity columns."""
    dup_key = df[key].duplicated(keep=False)
    dup_row = df.duplicated(subset=identity, keep=False) if identity else dup_key
    return pd.DataFrame({"dup_key": dup_key, "dup_row": dup_row})

uniqueness(orders, "order_id").sum()
# dup_key    2     <- order 3 appears twice. keep=False flags BOTH, so
#                     the report shows the pair.

# --- TIMELINESS ---------------------------------------------------------
def timeliness(df, date_col, max_age, now=None):
    """Is the latest record recent enough? A frame-level fact."""
    now = now or pd.Timestamp.now()
    latest = df[date_col].max()
    age = now - latest
    return {"latest": latest, "age": age, "stale": age > max_age}

timeliness(orders, "order_date", pd.Timedelta(days=2), now=pd.Timestamp("2026-03-10"))
# {'latest': 2026-03-05, 'age': 5 days, 'stale': True}
#
# Timeliness is about the DATASET, not a row. The other checks return
# a mask; this one returns a verdict.

# --- ACCURACY -----------------------------------------------------------
def accuracy(df, reference_total, col="amount", tol=0.001):
    """Reconcile against an external figure. The only accuracy test
    the data itself permits."""
    actual = df[col].sum()
    rel = abs(actual - reference_total) / max(abs(reference_total), 1e-9)
    return {"actual": actual, "reference": reference_total,
            "relative_diff": rel, "reconciles": rel <= tol}

accuracy(orders, reference_total=125.0)
# {'actual': 125.0, ..., 'reconciles': True}
#
# It reconciles -- and the table contains a duplicated order and a
# negative amount. Accuracy of a TOTAL is not accuracy of every row.
# The reconciliation catches "we lost or doubled money"; the other
# five dimensions catch what it cannot.
`,
      hl: [21, 40, 61, 100],
      caption: "**The total reconciles to the penny, and the table contains a duplicated order and a negative amount.** Accuracy of a total is not accuracy of every row — the reconciliation catches lost or doubled money, and the other five dimensions catch what it cannot."
    },

    { t: "callout", kind: "insight", title: "Each check returns the failing rows, not a verdict", body: [
      { t: "p", text: "A function that returns `True` or `False` tells you the data failed. A function that returns a mask tells you **which rows, how many, and — after a groupby — which source, which day, which customer segment.** The second is what you need to fix it." },
      { t: "p", text: "It also means checks compose: a row can fail validity and consistency at once, and the report shows both without either hiding the other." },
      { t: "p", text: "Raising on the first failure is the worst design: it reports one problem on a file that may have five, and it stops the pipeline before the other four are known." }
    ]},

    { t: "p", text: "The consistency dimension has a hard case: **the same fact coded under different systems by different sources** — one hospital on ICD-9, another on ICD-10; one warehouse on ISO country codes, another on names; product SKUs before and after a re-platforming. The fix is a **crosswalk**: a mapping table from each source code to one canonical code, with the source system and its version as part of the key. Two properties decide whether it is trustworthy. The mapping is rarely one-to-one — a single old code can split into several new ones, and the crosswalk has to say which, or map to the parent — and **every code the crosswalk does not know must be reported, not silently nulled**, because the unmapped share is the measure of how much of the data the harmonisation actually reached." },

    { t: "code", lang: "python", title: "Harmonising two coding systems through a crosswalk",
      code: `walk = pd.DataFrame({"system": ["icd9", "icd9", "icd9", "icd10"], "code": ["250.00", "250.01", "410", "E11.9"],
                     "canonical": ["E11.9", "E10.9", "I21", "E11.9"], "walk_version": "2025.1"})
dx = pd.DataFrame({"hospital": ["A", "A", "B", "B"], "system": ["icd9", "icd9", "icd10", "icd10"],
                   "code": ["250.00", "999.9", "E11.9", "I21.0"]})

out = dx.merge(walk, on=["system", "code"], how="left", validate="m:1")   # m:1 -- a crosswalk with duplicates is a fault
unmapped = out.canonical.isna()
print(out.loc[unmapped, ["hospital", "system", "code"]].to_dict("records"))
# [{'hospital': 'A', 'system': 'icd9', 'code': '999.9'}, {'hospital': 'B', 'system': 'icd10', 'code': 'I21.0'}]
print(f"unmapped share by hospital: {out.groupby('hospital').canonical.apply(lambda s: s.isna().mean()).to_dict()}")
# {'A': 0.5, 'B': 0.5} -- the number that goes in the quality report, per source
# I21.0 is a child of I21: a crosswalk that maps to the parent when the child is absent needs that rule written down`,
      caption: "The crosswalk is data, versioned like data. `validate=\"m:1\"` guarantees it cannot multiply rows; the unmapped share per source is the consistency metric for the harmonised column."
    },

    { t: "h2", n: "02", text: "Hard gates and soft gates", id: "gates" },

    { t: "p", text: "**Not every failure should stop the pipeline.** A duplicated primary key will corrupt every join downstream; a 0.3% rate of malformed emails will not. The quality gate needs two kinds of check — those that block, and those that are logged and trended — and the decision about which is which is a business decision recorded in code." },

    { t: "table",
      head: ["Failure", "Gate", "Why"],
      rows: [
        ["Duplicate primary key", "**Hard** — stop", "Every join downstream multiplies rows; every total is wrong"],
        ["Required field null above threshold", "**Hard**", "The rows cannot be used; the threshold is the tolerance"],
        ["Schema mismatch (columns added/removed)", "**Hard**", "Code downstream will KeyError or silently read the wrong column"],
        ["Reconciliation total off by > 0.1%", "**Hard**", "Money is missing or doubled; nothing downstream can be trusted"],
        ["Orphaned foreign keys above threshold", "**Hard**", "A join will drop them or produce NaN; someone must decide"],
        ["Stale data (latest > 2 days old)", "**Hard** for a daily report; **soft** for a backfill", "Depends on what consumes it — a decision, not a rule"],
        ["Malformed email / phone below threshold", "**Soft** — log, trend", "The rows are usable; the rate is a health metric"],
        ["Status value outside the allowed set", "**Soft** if rare; **hard** if new", "One typo is noise; a new status is a source change"],
        ["Distribution drift vs last load", "**Soft** — alert", "Might be real; someone should look; the pipeline can continue"]
      ],
      caption: "**\"Stale\" is hard for a daily report and soft for a backfill.** The gate level is a property of what consumes the data, not of the check — which is why it is a parameter, not a constant."
    },

    { t: "code", lang: "python", title: "a quality gate that blocks, logs, and remembers", code: `
import json
from datetime import datetime, timezone

class Check:
    """One named check with a severity and a threshold."""
    def __init__(self, name, dimension, fn, *, hard=False, max_fail_rate=0.0):
        self.name, self.dimension, self.fn = name, dimension, fn
        self.hard, self.max_fail_rate = hard, max_fail_rate

    def run(self, df, ctx):
        try:
            mask = self.fn(df, ctx)
        except Exception as e:
            # A CHECK THAT CANNOT RUN IS A FAILURE, not a pass. A schema
            # change that breaks the check's own column reference must
            # not silently disable it.
            return {"check": self.name, "dimension": self.dimension,
                    "error": str(e), "failed": True, "hard": self.hard}
        if isinstance(mask, dict):                      # frame-level verdict
            failed = bool(mask.get("failed", False))
            return {"check": self.name, "dimension": self.dimension,
                    "failed": failed, "hard": self.hard, "detail": mask}
        mask = mask.fillna(False).astype(bool)
        n_fail = int(mask.sum())
        rate = n_fail / len(df) if len(df) else 0.0
        return {"check": self.name, "dimension": self.dimension,
                "n_fail": n_fail, "rate": round(rate, 5),
                "failed": rate > self.max_fail_rate,
                "hard": self.hard,
                "examples": df.index[mask][:5].tolist()}


class QualityGate:
    def __init__(self, checks, history_path=None):
        self.checks = checks
        self.history_path = history_path

    def run(self, df, ctx=None):
        ctx = ctx or {}
        results = [c.run(df, ctx) for c in self.checks]
        hard_failures = [r for r in results if r["failed"] and r["hard"]]
        soft_failures = [r for r in results if r["failed"] and not r["hard"]]

        record = {
            "at": datetime.now(timezone.utc).isoformat(),
            "rows": len(df),
            "passed": not hard_failures,
            "hard_failures": [r["check"] for r in hard_failures],
            "soft_failures": [r["check"] for r in soft_failures],
            "results": results,
        }
        if self.history_path:
            with open(self.history_path, "a") as fh:
                fh.write(json.dumps(record, default=str) + "\\n")

        if hard_failures:
            lines = [f"  {r['check']} ({r['dimension']}): "
                     f"{r.get('n_fail', r.get('detail', r.get('error')))}"
                     for r in hard_failures]
            raise QualityError("quality gate failed:\\n" + "\\n".join(lines), record)
        return record


class QualityError(Exception):
    def __init__(self, msg, record):
        super().__init__(msg)
        self.record = record


# THE CHECKS, declared once, with their gate levels:
def build_gate():
    return QualityGate([
        Check("key_unique", "uniqueness",
              lambda d, c: d["order_id"].duplicated(keep=False), hard=True),
        Check("required_present", "completeness",
              lambda d, c: d[["order_id", "customer_id", "amount"]].isna().any(axis=1),
              hard=True, max_fail_rate=0.001),
        Check("customer_exists", "consistency",
              lambda d, c: ~d["customer_id"].isin(c["customers"]["customer_id"]) & d["customer_id"].notna(),
              hard=True, max_fail_rate=0.005),
        Check("ship_after_order", "consistency",
              lambda d, c: (d["ship_date"] < d["order_date"]).fillna(False), hard=True),
        Check("amount_nonneg", "validity",
              lambda d, c: ~(d["amount"] >= 0), hard=True),
        Check("status_in_domain", "validity",
              lambda d, c: ~d["status"].isin(ALLOWED_STATUS), hard=False, max_fail_rate=0.0),
        Check("email_format", "validity",
              lambda d, c: ~d["email"].str.strip().str.lower().str.fullmatch(EMAIL.pattern, na=False),
              hard=False, max_fail_rate=0.01),
        Check("fresh", "timeliness",
              lambda d, c: {"failed": (c["now"] - d["order_date"].max()) > pd.Timedelta(days=2),
                            "latest": str(d["order_date"].max())}, hard=True),
        Check("reconciles", "accuracy",
              lambda d, c: {"failed": abs(d["amount"].sum() - c["reference_total"])
                                      > 0.001 * abs(c["reference_total"]),
                            "actual": float(d["amount"].sum()),
                            "reference": c["reference_total"]}, hard=True),
    ], history_path="quality_history.jsonl")


gate = build_gate()
try:
    gate.run(orders, ctx={"customers": customers,
                          "now": pd.Timestamp("2026-03-06"),
                          "reference_total": 125.0})
except QualityError as e:
    print(e)
# quality gate failed:
#   key_unique (uniqueness): 2
#   required_present (completeness): 1
#   customer_exists (consistency): 1
#   ship_after_order (consistency): 1
#   amount_nonneg (validity): 1
#
# FIVE hard failures reported at once. The soft ones -- status "PAID",
# the bad email -- are in e.record["soft_failures"], logged, not
# blocking.

# THE HISTORY FILE IS THE TREND. Every run appends one line; a soft
# failure rate that climbs from 0.2% to 4% over a month is a source
# degrading, and it is visible only because every run was recorded.
# history = pd.read_json("quality_history.jsonl", lines=True)
# history.explode("results") ... -> rate per check per run, plotted
`,
      hl: [12, 42, 62, 91],
      caption: "**A check that cannot run is a failure, not a pass.** A schema change that breaks the check's own column reference must raise inside the gate — not silently disable the check and let the pipeline continue."
    },

    { t: "callout", kind: "production", title: "In production", body: [
      { t: "p", text: "**The gate runs on every load, before anything downstream, and writes its result to a history file.** A single run tells you whether today's data passed. The history tells you that the orphan rate has doubled every week for a month, which is the finding that matters." },
      { t: "p", text: "**Hard gates raise with every failure listed**, not the first. An operator fixing a file at 3 a.m. needs the whole list in one message." },
      { t: "p", text: "**Thresholds are parameters with a comment saying who set them and why.** `max_fail_rate=0.005` on orphan customers is a claim that half a percent is tolerable — a claim someone made, and someone will need to revisit." }
    ]},

    { t: "h2", n: "03", text: "Accuracy: the one that needs the outside world", id: "accuracy" },

    { t: "p", text: "A value can pass every test above and be wrong. An email that is well-formed, unique, present and recent can belong to someone else. **Accuracy is agreement with reality, and reality is not in the table** — so every accuracy test is a comparison against something external." },

    { t: "code", lang: "python", title: "the three ways to test accuracy", code: `
# 1. RECONCILIATION -- an aggregate against an authoritative figure.
#    Finance says March revenue was 84,213,990.55. Does the table?
def reconcile(df, col, reference, tol=0.001):
    actual = df[col].sum()
    rel = abs(actual - reference) / abs(reference)
    return {"actual": actual, "reference": reference, "rel": rel, "ok": rel <= tol}
#
# CATCHES: lost rows, doubled rows, a unit change (pence vs pounds),
#          a filter applied twice.
# MISSES:  errors that net to zero (one row +100, another -100), and
#          every error in a column that is not summed.
#
# It is the cheapest accuracy test and the one every pipeline should
# have. It is not the only one.

# 2. CROSS-SOURCE AGREEMENT -- the same fact from two systems.
#    The CRM says customer 12 lives in Leeds. The order system says
#    Leeds. The billing system says Bradford.
def cross_source(a, b, key, col):
    m = a[[key, col]].merge(b[[key, col]], on=key, suffixes=("_a", "_b"))
    disagree = m[col + "_a"].astype(str).str.strip().str.lower() \\
             != m[col + "_b"].astype(str).str.strip().str.lower()
    return {"compared": len(m), "disagree": int(disagree.sum()),
            "rate": disagree.mean(), "examples": m[disagree].head(5)}
#
# CATCHES: stale copies, failed syncs, a source that stopped updating.
# MISSES:  errors both sources share (they were both loaded from the
#          same wrong form).
#
# Disagreement tells you at least one is wrong. It does not tell you
# which. That needs a rule -- "billing is authoritative for address"
# -- and the rule is a business decision.

# 3. AUDIT SAMPLE -- a human checks n rows against the real world.
#    Pick 200 orders at random; someone calls, checks the invoice,
#    looks up the record. Count the errors.
def audit_sample(df, n=200, seed=0):
    return df.sample(n, random_state=seed)
#
# 200 rows checked, 3 wrong -> estimated error rate 1.5%, with a
# confidence interval you can compute:
from statsmodels.stats.proportion import proportion_confint
proportion_confint(3, 200, method="wilson")       # (0.005, 0.043)
#
# "Between 0.5% and 4.3% of rows are wrong, at 95% confidence." That
# is the only sentence in this lesson that is about whether the data
# matches the world, and it cost a person a day.
#
# CATCHES: everything the other two miss, at the sampled rate.
# MISSES:  rare errors -- 200 rows will not find a 0.01% defect.
# COSTS:   a person's time, every time.

# THE HONEST SUMMARY:
#   completeness, validity, consistency, uniqueness, timeliness
#       -> automatable, cheap, run on every load, catch structure
#   accuracy
#       -> needs a reference; reconciliation is the cheap version,
#          cross-source is the medium one, audit is the real one
#
# A pipeline with only the first five is a pipeline that will
# faithfully deliver well-formed, unique, timely, consistent, wrong
# data. Most pipelines are that pipeline.

# A LIGHTWEIGHT PROXY when no reference exists -- plausibility bounds
# from domain knowledge:
def plausible(df):
    return pd.DataFrame({
        "age_plausible":     df["age"].between(0, 120),
        "price_plausible":   df["unit_price"].between(0.01, 10_000),
        "qty_plausible":     df["quantity"].between(1, 1_000),
        "coords_plausible":  df["lat"].between(-90, 90) & df["lon"].between(-180, 180),
    })
#
# This is VALIDITY dressed as accuracy: it catches the impossible,
# not the wrong. An age of 45 for a 32-year-old passes. It is still
# worth having, because the impossible is common.
`,
      hl: [3, 20, 39, 62],
      caption: "**A pipeline with only the first five dimensions faithfully delivers well-formed, unique, timely, consistent, wrong data.** Most pipelines are that pipeline — accuracy needs a reference outside the table."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A quality gate for a two-table feed, with a history",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "A daily feed delivers `orders` and `customers`. Build the quality gate that runs on both before anything downstream: at least one check per dimension, hard and soft gates assigned with a stated reason, a run history, and a function that reads the history and reports which soft-failure rates are trending up." },
        { t: "p", text: "Test it on a clean feed, on a feed with one defect per dimension, and on a history that shows a trend." }
      ],
      requirements: [
        "At least one check per dimension, across both tables.",
        "Every check returns failing rows or a frame-level verdict, never raises on the first failure.",
        "Hard and soft gates with a comment stating the reason for each level.",
        "A JSON Lines history, one record per run.",
        "A trend function that flags soft checks whose failure rate rose over the last n runs.",
        "Tests: clean feed passes; each planted defect fails its check; the trend is detected."
      ],
      hint: "Uniqueness and consistency both need the customers table. Timeliness needs a clock you can control in tests. Accuracy needs a reference total you can pass in.",
      solution: {
        lang: "python",
        title: "feed_gate.py",
        code: `import pandas as pd
import numpy as np
import json
import re
import os
from datetime import datetime, timezone


EMAIL = r"^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"
STATUSES = {"paid", "shipped", "refunded", "cancelled"}


# =========================================================================
# CHECKS -- each returns a mask over the table it names, or a verdict
# =========================================================================

CHECKS = [
    # (name, dimension, table, fn, hard, max_rate, reason)

    # COMPLETENESS
    ("orders_required", "completeness", "orders",
     lambda o, c, x: o[["order_id", "customer_id", "amount", "order_date"]].isna().any(axis=1),
     True, 0.0,
     "a row without these cannot be joined, summed or dated; zero tolerance"),
    ("customers_email_present", "completeness", "customers",
     lambda o, c, x: c["email"].isna(),
     False, 0.05,
     "email is used for contact, not for joins; 5% missing is a health metric"),

    # VALIDITY
    ("amount_nonneg", "validity", "orders",
     lambda o, c, x: ~(o["amount"] >= 0),
     True, 0.0,
     "a negative order amount is a sign error or a refund in the wrong table"),
    ("status_domain", "validity", "orders",
     lambda o, c, x: ~o["status"].str.lower().isin(STATUSES),
     True, 0.0,
     "a new status value is a source change; downstream CASE logic will miss it"),
    ("email_format", "validity", "customers",
     lambda o, c, x: ~c["email"].str.strip().str.fullmatch(EMAIL, na=True),
     False, 0.02,
     "malformed emails are usable rows; the rate is trended"),

    # CONSISTENCY
    ("customer_exists", "consistency", "orders",
     lambda o, c, x: ~o["customer_id"].isin(c["customer_id"]) & o["customer_id"].notna(),
     True, 0.001,
     "an orphan order drops from every join; 0.1% covers timing skew between extracts"),
    ("ship_after_order", "consistency", "orders",
     lambda o, c, x: (o["ship_date"] < o["order_date"]).fillna(False),
     True, 0.0,
     "impossible by definition; indicates a column swap or a clock problem"),

    # UNIQUENESS
    ("order_key_unique", "uniqueness", "orders",
     lambda o, c, x: o["order_id"].duplicated(keep=False),
     True, 0.0,
     "a duplicated key multiplies every downstream join"),
    ("customer_key_unique", "uniqueness", "customers",
     lambda o, c, x: c["customer_id"].duplicated(keep=False),
     True, 0.0,
     "customers is a lookup; a duplicate doubles every order that matches it"),

    # TIMELINESS
    ("orders_fresh", "timeliness", "orders",
     lambda o, c, x: {"failed": (x["now"] - o["order_date"].max()) > pd.Timedelta(days=1),
                      "latest": str(o["order_date"].max()), "now": str(x["now"])},
     True, None,
     "a daily report on data more than a day old is yesterday's report"),

    # ACCURACY
    ("revenue_reconciles", "accuracy", "orders",
     lambda o, c, x: {"failed": abs(o["amount"].sum() - x["reference_total"])
                                > 0.001 * abs(x["reference_total"]),
                      "actual": float(o["amount"].sum()),
                      "reference": x["reference_total"]},
     True, None,
     "if the total disagrees with finance, rows were lost or doubled"),
]


def run_gate(orders, customers, ctx, history_path=None):
    results = []
    for name, dim, table, fn, hard, max_rate, reason in CHECKS:
        df = orders if table == "orders" else customers
        try:
            out = fn(orders, customers, ctx)
        except Exception as e:
            results.append({"check": name, "dimension": dim, "table": table,
                            "hard": hard, "failed": True, "error": str(e)})
            continue
        if isinstance(out, dict):
            results.append({"check": name, "dimension": dim, "table": table,
                            "hard": hard, "failed": bool(out["failed"]), "detail": out})
        else:
            mask = out.fillna(False).astype(bool)
            n_fail = int(mask.sum())
            rate = n_fail / len(df) if len(df) else 0.0
            results.append({"check": name, "dimension": dim, "table": table,
                            "hard": hard, "n_fail": n_fail, "rate": round(rate, 5),
                            "failed": rate > max_rate,
                            "examples": df.index[mask][:5].tolist()})

    record = {
        "at": ctx.get("now", datetime.now(timezone.utc)).isoformat()
              if hasattr(ctx.get("now"), "isoformat") else str(ctx.get("now")),
        "orders": len(orders), "customers": len(customers),
        "hard_failures": [r["check"] for r in results if r["failed"] and r["hard"]],
        "soft_failures": [r["check"] for r in results if r["failed"] and not r["hard"]],
        "results": results,
    }
    record["passed"] = not record["hard_failures"]

    if history_path:
        with open(history_path, "a") as fh:
            fh.write(json.dumps(record, default=str) + "\\n")

    return record


def trend(history_path, last_n=5, min_rise=2.0):
    """Soft checks whose failure rate rose at least min_rise-fold over
    the last last_n runs compared to the runs before."""
    runs = [json.loads(l) for l in open(history_path) if l.strip()]
    if len(runs) < 2 * last_n:
        return {}
    rates = {}
    for run in runs:
        for r in run["results"]:
            if not r["hard"] and "rate" in r:
                rates.setdefault(r["check"], []).append(r["rate"])
    rising = {}
    for check, series in rates.items():
        recent = np.mean(series[-last_n:])
        before = np.mean(series[-2 * last_n:-last_n])
        if before > 0 and recent / before >= min_rise:
            rising[check] = {"before": round(before, 4), "recent": round(recent, 4),
                             "ratio": round(recent / before, 2)}
        elif before == 0 and recent > 0:
            rising[check] = {"before": 0.0, "recent": round(recent, 4), "ratio": float("inf")}
    return rising


# =========================================================================
# TESTS
# =========================================================================

NOW = pd.Timestamp("2026-03-10")


def _clean(n=200, seed=0):
    rng = np.random.default_rng(seed)
    customers = pd.DataFrame({
        "customer_id": np.arange(1, 51),
        "email": [f"u{i}@x.com" for i in range(1, 51)],
    })
    orders = pd.DataFrame({
        "order_id": np.arange(1, n + 1),
        "customer_id": rng.integers(1, 51, n),
        "amount": rng.uniform(5, 100, n).round(2),
        "status": rng.choice(sorted(STATUSES), n),
        "order_date": pd.to_datetime("2026-03-09") - pd.to_timedelta(rng.integers(0, 24, n), "h"),
    })
    orders["ship_date"] = orders["order_date"] + pd.Timedelta(days=1)
    return orders, customers


def _ctx(orders):
    return {"now": NOW, "reference_total": float(orders["amount"].sum())}


def test_clean_feed_passes():
    o, c = _clean()
    rec = run_gate(o, c, _ctx(o))
    assert rec["passed"]
    assert rec["hard_failures"] == [] and rec["soft_failures"] == []


def test_completeness_defect():
    o, c = _clean(); o.loc[0, "customer_id"] = None
    rec = run_gate(o, c, _ctx(o))
    assert "orders_required" in rec["hard_failures"]


def test_validity_defect_hard():
    o, c = _clean(); o.loc[0, "amount"] = -1.0
    ctx = _ctx(o); ctx["reference_total"] = float(o["amount"].sum())
    rec = run_gate(o, c, ctx)
    assert "amount_nonneg" in rec["hard_failures"]


def test_validity_defect_soft():
    o, c = _clean(); c.loc[0, "email"] = "not-an-email"
    rec = run_gate(o, c, _ctx(o))
    assert "email_format" in rec["soft_failures"]
    assert rec["passed"]                              # soft does not block


def test_consistency_orphan():
    o, c = _clean(); o.loc[:4, "customer_id"] = 999   # 2.5% > 0.1%
    rec = run_gate(o, c, _ctx(o))
    assert "customer_exists" in rec["hard_failures"]


def test_consistency_dates():
    o, c = _clean(); o.loc[0, "ship_date"] = o.loc[0, "order_date"] - pd.Timedelta(days=1)
    rec = run_gate(o, c, _ctx(o))
    assert "ship_after_order" in rec["hard_failures"]


def test_uniqueness_defect():
    o, c = _clean(); o = pd.concat([o, o.head(1)], ignore_index=True)
    ctx = _ctx(o)
    rec = run_gate(o, c, ctx)
    assert "order_key_unique" in rec["hard_failures"]
    assert rec["results"][[r["check"] for r in rec["results"]].index("order_key_unique")]["n_fail"] == 2


def test_timeliness_defect():
    o, c = _clean()
    ctx = _ctx(o); ctx["now"] = NOW + pd.Timedelta(days=5)
    rec = run_gate(o, c, ctx)
    assert "orders_fresh" in rec["hard_failures"]


def test_accuracy_defect():
    o, c = _clean()
    ctx = _ctx(o); ctx["reference_total"] *= 1.05
    rec = run_gate(o, c, ctx)
    assert "revenue_reconciles" in rec["hard_failures"]


def test_all_hard_failures_reported_together():
    o, c = _clean()
    o.loc[0, "customer_id"] = None
    o.loc[1, "amount"] = -1.0
    o = pd.concat([o, o.head(1)], ignore_index=True)
    ctx = _ctx(o); ctx["reference_total"] = 1.0
    rec = run_gate(o, c, ctx)
    assert len(rec["hard_failures"]) >= 4


def test_broken_check_is_a_failure_not_a_pass():
    o, c = _clean(); o = o.drop(columns="ship_date")
    rec = run_gate(o, c, _ctx(o))
    r = next(r for r in rec["results"] if r["check"] == "ship_after_order")
    assert r["failed"] and "error" in r


def test_trend_detects_rising_soft_rate(tmp="hist.jsonl"):
    if os.path.exists(tmp):
        os.remove(tmp)
    for i in range(10):
        o, c = _clean(seed=i)
        n_bad = 0 if i < 5 else 1 + i - 5               # 0..0, then 1..5 bad emails
        c.loc[:n_bad - 1, "email"] = "bad" if n_bad else c["email"]
        run_gate(o, c, _ctx(o), history_path=tmp)
    rising = trend(tmp, last_n=5)
    assert "email_format" in rising
    os.remove(tmp)`,
        notes: [
          { t: "p", text: "**Every check carries a one-line reason for its gate level.** `customer_exists` is hard with a 0.1% tolerance \"to cover timing skew between extracts\"; `email_format` is soft at 2% because \"malformed emails are usable rows\". Those sentences are the decisions, and they are in the code where the next person will find them." },
          { t: "callout", kind: "insight", title: "The trend is only visible because every run was recorded", body: [
            { t: "p", text: "A single run with a 2.5% bad-email rate is under threshold and passes. **Ten runs showing 0%, 0%, 0%, 0%, 0%, 0.5%, 1%, 1.5%, 2%, 2.5% is a source degrading** — and the trend function is what turns a JSON Lines file into that finding." },
            { t: "p", text: "Soft gates exist for exactly this: to measure something that does not block today and will matter next month." }
          ]},
          { t: "p", text: "**A check that cannot run fails.** Dropping `ship_date` from the feed breaks the `ship_after_order` lambda; the test asserts that produces a failure with an error, not a silent pass. A schema change must not disable the check that would have caught it." },
          { t: "p", text: "**All hard failures are reported together.** The test plants four defects and asserts at least four appear — an operator fixing a file at 3 a.m. gets one message with everything in it, not one problem per re-run." },
          { t: "p", text: "**The clock and the reference total are injected.** Timeliness needs `now`, accuracy needs finance's figure, and neither can be tested if the check reaches for the real clock or a real database. `ctx` is what makes the gate testable." },
          { t: "p", text: "**Uniqueness reports both copies.** `keep=False` flags the duplicated order and its twin, so `n_fail` is 2 and the examples show the pair — which is what someone needs to decide which one is real." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Every check in a quality gate passes, and the revenue total reconciles to finance. Which dimension is still untested?",
          options: [
            "Timeliness",
            "Accuracy at the row level — the total can reconcile while individual rows are wrong, and only an external reference per row or an audit sample tests that",
            "Uniqueness",
            "Nothing — the data is verified"
          ],
          answer: 1,
          why: "Reconciliation catches lost or doubled money. It does not catch two errors that net to zero, or any error in a column that is not summed, or a well-formed email that belongs to the wrong person. Those need cross-source comparison or a human audit, and cost accordingly."
        }
      ]
    }
  ],

  takeaways: [
    "**Six dimensions, six tests**: completeness, validity, consistency, uniqueness, timeliness, accuracy — each a specific check with a number and a list of failing rows.",
    "**Each check returns the failing rows, not a verdict**, so the report shows which rows, how many, and — after a groupby — which source.",
    "**Raising on the first failure reports one problem on a file that may have five.** Collect, then decide.",
    "**Completeness is per column; consistency is across a row or across tables; uniqueness is on the key** — different scopes, different tests.",
    "**A NaN in a failing-rows mask is a silent third state** — `fillna(False)`, and let the completeness check report the NaN.",
    "**Hard gates block; soft gates log and trend.** The level is a property of what consumes the data, not of the check.",
    "**Every gate level carries a reason in the code** — `max_fail_rate=0.005` is a claim someone made and someone will revisit.",
    "**A check that cannot run is a failure, not a pass.** A schema change must not silently disable the check that would have caught it.",
    "**Timeliness is about the dataset, not a row** — the latest timestamp against a clock you can inject.",
    "**Accuracy needs a reference outside the table**: reconciliation is cheap, cross-source is medium, an audit sample is real.",
    "**A total can reconcile to the penny while rows are wrong** — netting errors, and errors in columns that are not summed.",
    "**A pipeline with five dimensions faithfully delivers well-formed, unique, timely, consistent, wrong data.**",
    "**Record every run.** A 2.5% rate is under threshold today; ten runs show it has been rising for a week."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which dimension does `ship_date >= order_date` test?",
        options: [
          "Validity — the date is well-formed",
          "Consistency — two values in the same row agree with each other",
          "Completeness — both dates are present",
          "Accuracy — the dates are correct"
        ],
        answer: 1,
        why: "Validity is about one value's format and domain; consistency is about values agreeing with each other, within a row or across tables. The ship-date rule is a within-row consistency check, and a missing ship date is a separate completeness finding — each dimension reports its own."
      },
      {
        stem: "Why should a quality check return a boolean mask rather than raise on the first failure?",
        options: [
          "Masks are faster",
          "A mask shows which rows and how many, lets checks compose on the same row, and lets the gate report every failure in one message",
          "Exceptions cannot be logged",
          "pandas requires it"
        ],
        answer: 1,
        why: "A file with five defects should produce five findings, not one exception and four unknowns. The mask can be grouped by source or date to locate the cause, and a row failing two checks shows both. The gate decides what to raise, once, with everything listed."
      },
      {
        stem: "A check's lambda references a column that was dropped from the feed. What should happen?",
        options: [
          "The check is skipped",
          "The check fails with the error recorded — a schema change must not silently disable the check that would have caught it",
          "The gate passes",
          "The column is filled with NaN"
        ],
        answer: 1,
        why: "A `KeyError` inside a check is evidence that the feed changed shape. Catching it and marking the check failed keeps the failure visible; swallowing it means the check that used to guard `ship_date` is now guarding nothing, with no one told."
      },
      {
        stem: "Why is a soft gate worth having if it never blocks the pipeline?",
        options: [
          "It is not",
          "Its failure rate is recorded every run, so a source degrading from 0% to 2.5% over ten days is visible as a trend before it crosses any threshold",
          "It catches hard failures",
          "It is faster than a hard gate"
        ],
        answer: 1,
        why: "Soft gates measure health. A malformed-email rate under 2% is fine today; the same rate having tripled over a week is a source problem worth a conversation now. The history file is what makes that visible, and a check that only ever said pass or fail could not show it."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What are the dimensions of data quality, and how do you test each?",
        strong: "Completeness — missing rate per column against a threshold. Validity — format and domain per value: regex, allowed sets, ranges. Consistency — values agreeing within a row and across tables: end after start, foreign keys present. Uniqueness — no duplicate keys or identity rows. Timeliness — the latest timestamp against a clock. Accuracy — agreement with reality, which needs an external reference: a reconciliation total, a second source, or an audit sample. The first five automate; the sixth costs something every time.",
        answer: [
          { t: "p", text: "Giving a concrete test with each name, and singling out accuracy as the one that needs the outside world, is what makes this complete." }
        ]
      },
      {
        level: "advanced",
        q: "How would you decide which quality checks stop the pipeline?",
        strong: "By what consumes the output. A duplicated primary key multiplies every downstream join, so it is hard with zero tolerance. A malformed email rate under 2% leaves the rows usable, so it is soft — logged and trended. Staleness is hard for a daily report and soft for a backfill. Each level gets a one-line reason in the code, and each threshold is a claim someone made and someone will need to revisit.",
        answer: [
          { t: "p", text: "\"By what consumes the output\" is the principle; the staleness example shows the same check landing at different levels, which is the point." }
        ]
      },
      {
        level: "advanced",
        q: "A pipeline's quality gate has passed every day for a year. What could still be wrong?",
        strong: "Accuracy. The data can be complete, valid, consistent, unique and timely — and wrong, because none of those five compare it to the world. A revenue total that reconciles can still hide two errors that net to zero, and nothing tests the columns that are not summed. I would want a cross-source comparison on the fields that matter and a periodic audit sample with a confidence interval. And I would look at the soft-gate history: a year of passes can contain a rate that has quietly doubled.",
        answer: [
          { t: "p", text: "Naming accuracy as the untested dimension, and the trend hidden inside a year of passes, are the two things a year of green checks cannot reveal." }
        ]
      }
    ]
  }
});

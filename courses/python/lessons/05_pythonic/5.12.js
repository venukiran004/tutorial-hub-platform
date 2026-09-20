/* ============================================================================
   LESSON 5.12 — Refactoring: Bad → Better → Production
   ========================================================================= */
EC.receiveLesson({
  id: "5.12",

  lede: "One real script — the kind that starts as a favour and ends up running the month-end close — taken through three complete rewrites. Every change is justified, and **the order matters more than any individual change**: correctness before structure, structure before polish, because a refactor of code you cannot test is a rewrite with extra steps.",

  objectives: [
    "Order a refactor so each pass is verifiable before the next begins",
    "Separate I/O from logic to create the seam that makes testing possible",
    "Distinguish changes that alter behaviour from changes that preserve it",
    "Apply the pythonic techniques from this module where they help and recognise where they do not",
    "Judge when a script is finished rather than merely improvable"
  ],

  prerequisites: ["5.1", "5.4", "5.9"],

  blocks: [

    { t: "h2", n: "01", text: "The script", id: "script",
      sub: "Sixty lines that have been in production for eighteen months" },

    { t: "p", text: "This runs nightly. It reads the day's orders, applies volume discounts, writes a summary file and emails anyone whose account went over its credit limit. It was written in an afternoon, it works, and everyone is slightly afraid of it." },

    { t: "code", lang: "python", title: "nightly.py — as found", code: `
import csv
import smtplib
from datetime import datetime

def run():
    f = open("/data/orders/" + datetime.now().strftime("%Y-%m-%d") + ".csv")
    rows = list(csv.reader(f))
    results = {}
    over = []
    for r in rows[1:]:
        cust = r[0]
        amt = float(r[2])
        qty = int(r[3])
        if qty > 100:
            amt = amt * 0.9
        elif qty > 50:
            amt = amt * 0.95
        if cust in results:
            results[cust] = results[cust] + amt
        else:
            results[cust] = amt
        if results[cust] > 10000:
            if cust not in over:
                over.append(cust)
    out = open("/data/reports/summary.txt", "w")
    total = 0
    for c in results:
        out.write(c + ": " + str(round(results[c], 2)) + "\\n")
        total = total + results[c]
    out.write("TOTAL: " + str(round(total, 2)) + "\\n")
    out.close()
    s = smtplib.SMTP("smtp.internal", 25)
    for c in over:
        s.sendmail("billing@corp", c + "@corp",
                   "Subject: Credit limit\\n\\nAccount " + c + " is over limit.")
    s.quit()
    print("done, " + str(len(results)) + " customers")

run()
`,
      caption: "Read it before continuing. It is not stupid code — every line does something a requirement asked for. It is **undesigned** code, which is a different problem and a more common one."
    },

    { t: "h2", n: "02", text: "What is actually wrong", id: "wrong" },

    {"kind": "steps", "title": "Three passes over a script", "caption": "Correctness first, then the seams that make it testable, then what production needs. Doing them in this order means each pass has something stable to work on.", "items": [{"label": "Pass 1 — correctness", "desc": "the mutable default, the bare except, the wrong encoding, the off-by-one", "tone": "crit"}, {"label": "Pass 2 — seams", "desc": "pure functions, injected I/O, a main() that takes arguments", "tone": "accent"}, {"label": "Pass 3 — production", "desc": "logging, config, exit codes, idempotence, a test", "tone": "good"}], "t": "diagram", "id": "dg-5_12-02-0"},


    { t: "p", text: "\"Clean it up\" is not a plan. Sort the problems into three buckets, because they get fixed in a specific order and mixing them is how refactors go wrong." },

    { t: "table",
      head: ["Bucket", "Problems here", "Fix when"],
      rows: [
        ["**Correctness** — it produces wrong answers or loses data",
         "`float` for money; no error handling, so one bad row loses the whole run; the file handles are never closed on an exception; the email step can fail after the report is written",
         "First. Always."],
        ["**Structure** — it cannot be tested or changed safely",
         "One 40-line function; I/O and logic interleaved so no part can be exercised alone; paths, thresholds and rates hard-coded; no types",
         "Second — and only once you can tell whether you broke it"],
        ["**Polish** — it is harder to read than it needs to be",
         "`r[0]`, `r[2]`; string concatenation instead of f-strings; the `if/else` accumulator; `print` instead of logging; no docstrings",
         "Last, and it is genuinely last"]
      ],
      caption: "Most refactors people abandon started in the third column. Renaming variables in code you cannot test feels productive and changes nothing about the risk."
    },

    { t: "viz",
      title: "The order of a refactor",
      caption: "Each pass ends somewhere you could stop and ship. That is the property that makes a refactor safe to abandon halfway — and the reason to resist doing all three at once.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="Diagram of four refactoring passes in order: characterise, correctness, seams, then polish, each ending in a shippable state">
  <defs>
    <marker id="rf" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="14" y="60" width="188" height="94" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="108" y="86" text-anchor="middle" class="s-label">0 — CHARACTERISE</text>
  <text x="108" y="108" text-anchor="middle" class="s-sub">pin current behaviour</text>
  <text x="108" y="126" text-anchor="middle" class="s-sub">with a test, bugs</text>
  <text x="108" y="144" text-anchor="middle" class="s-sub">included</text>

  <line x1="206" y1="107" x2="238" y2="107" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#rf)"/>

  <rect x="242" y="60" width="188" height="94" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="336" y="86" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">1 — CORRECTNESS</text>
  <text x="336" y="108" text-anchor="middle" class="s-sub">money, errors, cleanup</text>
  <text x="336" y="126" text-anchor="middle" class="s-sub">behaviour CHANGES</text>
  <text x="336" y="144" text-anchor="middle" class="s-sub">— deliberately</text>

  <line x1="434" y1="107" x2="466" y2="107" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#rf)"/>

  <rect x="470" y="60" width="188" height="94" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="564" y="86" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">2 — SEAMS</text>
  <text x="564" y="108" text-anchor="middle" class="s-sub">split I/O from logic</text>
  <text x="564" y="126" text-anchor="middle" class="s-sub">behaviour IDENTICAL</text>
  <text x="564" y="144" text-anchor="middle" class="s-sub">— that is the rule</text>

  <line x1="662" y1="107" x2="694" y2="107" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#rf)"/>

  <rect x="698" y="60" width="188" height="94" rx="9" class="s-fill-2 s-stroke" stroke-width="1.2"/>
  <text x="792" y="86" text-anchor="middle" class="s-label">3 — PRODUCTION</text>
  <text x="792" y="108" text-anchor="middle" class="s-sub">config, logging, types</text>
  <text x="792" y="126" text-anchor="middle" class="s-sub">idempotence, exit codes</text>

  <line x1="14" y1="182" x2="886" y2="182" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="14" y="206" class="s-sub" style="fill:var(--good)">SHIPPABLE at the end of every box — never leave a refactor half-applied overnight</text>
  <text x="14" y="228" class="s-sub" style="fill:var(--crit)">The common failure: starting at box 3, in code that box 0 was never run on</text>
</svg>`
    },

    { t: "callout", kind: "insight", title: "Pass 0: pin the behaviour before touching anything", body: [
      { t: "code", lang: "python", title: "a characterisation test", numbered: false, code: `
def test_current_behaviour(tmp_path, monkeypatch):
    """Records what the script does TODAY -- bugs included.

    This is not a specification. It is a tripwire: if pass 2 changes
    an output, the diff tells me exactly what I broke.
    """
    write_sample_orders(tmp_path)
    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)

    run()

    assert (tmp_path / "summary.txt").read_text() == EXPECTED_TODAY`},
      { t: "p", text: "This test asserts the float rounding is exactly as wrong as it is now. That feels absurd and it is the entire point: **you cannot preserve behaviour you never measured.** Once pass 1 deliberately changes the money handling, you update this test and its diff shows precisely which numbers moved." },
      { t: "p", text: "For a script with no seams the test can only go around the outside, using the filesystem and a fake SMTP. That is fine — it is temporary scaffolding, and pass 2 replaces it with real unit tests." }
    ]},

    { t: "h2", n: "03", text: "Pass 1 — correctness", id: "pass1",
      sub: "The only pass that is allowed to change what the program does" },

    { t: "code", lang: "python", title: "nightly.py — after pass 1", code: `
import csv
import smtplib
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

def run():
    path = "/data/orders/" + date.today().isoformat() + ".csv"
    results = {}
    over = []
    skipped = 0

    # with: the handle closes even if a row blows up mid-loop
    with open(path, newline="") as f:
        reader = csv.reader(f)
        next(reader, None)                      # header, without a slice
        for line_no, r in enumerate(reader, start=2):
            try:
                cust = r[0]
                amt = Decimal(r[2])             # Decimal from the STRING
                qty = int(r[3])
            except (IndexError, ValueError, ArithmeticError):
                # One malformed row must not lose the other 40,000
                skipped += 1
                continue

            if qty > 100:
                amt *= Decimal("0.90")
            elif qty > 50:
                amt *= Decimal("0.95")

            results[cust] = results.get(cust, Decimal(0)) + amt
            if results[cust] > Decimal(10_000) and cust not in over:
                over.append(cust)

    money = lambda d: d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    with open("/data/reports/summary.txt", "w") as out:
        total = Decimal(0)
        for c in sorted(results):               # sorted: a stable diff
            out.write(f"{c}: {money(results[c])}\\n")
            total += results[c]
        out.write(f"TOTAL: {money(total)}\\n")

    # The report is written and closed BEFORE email is attempted, so a
    # mail outage no longer costs the run
    failures = 0
    with smtplib.SMTP("smtp.internal", 25) as s:
        for c in over:
            try:
                s.sendmail("billing@corp", f"{c}@corp",
                           f"Subject: Credit limit\\n\\nAccount {c} is over limit.")
            except smtplib.SMTPException:
                failures += 1

    print(f"done: {len(results)} customers, {skipped} rows skipped, "
          f"{failures} emails failed")
`,
      hl: [12, 20, 21, 22, 26, 34],
      caption: "Still one function. Still hard-coded paths. **That is deliberate** — this pass fixes only what produces wrong answers or loses work, so if something breaks tonight the cause is in a small, known set of changes."
    },

    { t: "dl", items: [
      ["`Decimal(r[2])`, not `float(r[2])`",
       "`0.1 + 0.2` is not `0.3` in binary floating point, and eighteen months of accumulating those errors is why the report never quite reconciles. Construct from the **string**, never from a float — `Decimal(0.1)` faithfully reproduces the error you were trying to avoid (Lesson 2.6)."],
      ["`with open(...)`",
       "The original leaked a handle on every exception and never closed the writer at all if a row raised. On CPython refcounting hides this; on PyPy or under an exception it does not (Lesson 5.8)."],
      ["`try/except` around the row parse",
       "One row with an empty amount field killed a 40,000-row run. Skipping and **counting** is the right call for a batch job: the count is what tells you whether one supplier broke their export or the whole file is garbage (Lesson 6.2)."],
      ["Report written before email is attempted",
       "The original opened SMTP while the report file was still open, so a mail server outage produced a truncated report. Ordering side effects by how likely they are to fail is free and prevents a whole class of partial-failure bugs."],
      ["`sorted(results)`",
       "Dicts preserve insertion order, so the report's row order followed the input file. Two identical days produced diffable-looking files that differed everywhere. Sorting makes the output a function of the data alone."],
      ["`results.get(cust, Decimal(0))`",
       "Replaces the `if/else` accumulator. A `defaultdict` would work too, but this value crosses no boundary and one call is clearer than importing a type (Lesson 5.9)."]
    ]},

    { t: "callout", kind: "trap", title: "The bug this pass does not fix", body: [
      { t: "p", text: "The credit-limit check fires when a customer's **running total** first exceeds 10,000 — which depends on the order rows appear in the file. A customer whose orders arrive in a different sequence can cross the line at a different row, and one whose orders net out below the limit by the end of the file still gets an email." },
      { t: "p", text: "That is a **requirements question, not a refactoring question**: should the limit apply to the day's total, or to the running balance? Guessing during a refactor is how you introduce a bug nobody can trace back to a decision." },
      { t: "p", text: "**Leave it, and write it down.** A refactor that silently answers open product questions is a redesign in disguise, and it destroys the one property that makes refactors reviewable — that you can say what changed and why." }
    ]},

    { t: "h2", n: "04", text: "Pass 2 — seams", id: "pass2",
      sub: "Behaviour must not change at all. If a test result moves, you made a mistake." },

    { t: "code", lang: "python", title: "nightly.py — after pass 2", code: `
from __future__ import annotations

import csv
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP


@dataclass(frozen=True, slots=True)
class Order:
    customer: str
    amount: Decimal
    quantity: int


@dataclass(frozen=True, slots=True)
class Summary:
    totals: dict[str, Decimal]
    over_limit: list[str]
    skipped: int


DISCOUNTS = ((100, Decimal("0.90")), (50, Decimal("0.95")))
CREDIT_LIMIT = Decimal(10_000)


# ---- pure: no filesystem, no network, no clock -------------------------

def parse_orders(rows: Iterable[list[str]]) -> tuple[list[Order], int]:
    """Turn CSV rows into Orders, returning the malformed count."""
    orders, skipped = [], 0
    for row in rows:
        try:
            orders.append(Order(row[0], Decimal(row[2]), int(row[3])))
        except (IndexError, ValueError, ArithmeticError):
            skipped += 1
    return orders, skipped


def discounted(order: Order) -> Decimal:
    """The pricing rule, in one place, testable in one line."""
    for threshold, rate in DISCOUNTS:
        if order.quantity > threshold:
            return order.amount * rate
    return order.amount


def summarise(orders: Iterable[Order], skipped: int = 0) -> Summary:
    totals: dict[str, Decimal] = {}
    over: list[str] = []
    for order in orders:
        totals[order.customer] = totals.get(order.customer, Decimal(0)) + discounted(order)
        if totals[order.customer] > CREDIT_LIMIT and order.customer not in over:
            over.append(order.customer)
    return Summary(totals, over, skipped)


def format_report(summary: Summary) -> str:
    """A string, not a file. Assertable without a tmp_path fixture."""
    def money(d: Decimal) -> str:
        return str(d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

    lines = [f"{c}: {money(summary.totals[c])}" for c in sorted(summary.totals)]
    lines.append(f"TOTAL: {money(sum(summary.totals.values(), Decimal(0)))}")
    return "\\n".join(lines) + "\\n"


# ---- impure: everything that touches the world -------------------------

def read_rows(path: str) -> Iterator[list[str]]:
    with open(path, newline="") as f:
        reader = csv.reader(f)
        next(reader, None)
        yield from reader
`,
      caption: "Four pure functions and one I/O function. **The pricing rule is now three lines you can test exhaustively**, and it was previously reachable only by writing a CSV file to disk and running the whole program."
    },

    { t: "code", lang: "python", title: "what the seam bought", code: `
def test_discount_boundaries():
    """Every boundary, in six lines. Previously: impossible without a file."""
    price = Decimal(100)
    for qty, expected in [(50, "100"), (51, "95.00"), (100, "95.00"), (101, "90.00")]:
        assert discounted(Order("c", price, qty)) == Decimal(expected)


def test_report_is_stable_regardless_of_row_order():
    orders = [Order("b", Decimal(1), 1), Order("a", Decimal(2), 1)]
    assert format_report(summarise(orders)) == format_report(
        summarise(list(reversed(orders)))
    )
`,
      out: `2 passed in 0.01s`,
      caption: "Note the boundaries: 50 gets no discount, 51 gets 5%, 100 still gets 5%, 101 gets 10%. **Nobody had ever verified those**, because verifying them meant a CSV file, a report file and an SMTP server."
    },

    { t: "callout", kind: "tradeoff", title: "How far to push the seam", body: [
      { t: "p", text: "The instinct after a pass like this is to keep going — a `Repository` for the CSV, a `Notifier` protocol, dependency injection for the clock, a strategy object for the discount table." },
      { t: "table",
        head: ["Abstraction", "Worth it when", "Here?"],
        rows: [
          ["Pure functions for the logic", "Always — this is the seam that pays for itself", "**Yes**"],
          ["A `Protocol` for the mailer", "There is more than one implementation, or you fake it in many tests", "Marginal — one fake in one test file"],
          ["Injecting the clock", "Behaviour depends on time in a way tests must control", "**Yes** — the filename is derived from today"],
          ["A repository class over the CSV", "The storage is likely to change", "No — it has been a CSV for eighteen months"],
          ["A strategy object for discounts", "Rules vary per customer or need runtime configuration", "No — a tuple of thresholds is the whole rule"]
        ]
      },
      { t: "p", text: "**The test for an abstraction is whether it has a second implementation or a second caller.** One of each means you have added a layer of indirection and called it design (Lesson 4.9)." }
    ]},

    { t: "h2", n: "05", text: "Pass 3 — production", id: "pass3" },

    { t: "code", lang: "python", title: "nightly.py — the entry point after pass 3", code: `
import logging
import os
import sys
from datetime import date
from pathlib import Path

log = logging.getLogger("nightly")

ORDERS_DIR = Path(os.environ.get("ORDERS_DIR", "/data/orders"))
REPORTS_DIR = Path(os.environ.get("REPORTS_DIR", "/data/reports"))
MAX_SKIPPED_RATIO = float(os.environ.get("MAX_SKIPPED_RATIO", "0.05"))


def main(argv: list[str] | None = None) -> int:
    """Run one day's close. Returns a process exit code."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    run_date = date.fromisoformat(argv[0]) if argv else date.today()
    source = ORDERS_DIR / f"{run_date.isoformat()}.csv"

    if not source.exists():
        log.error("no orders file for %s at %s", run_date, source)
        return 2                                    # distinct from a crash

    orders, skipped = parse_orders(read_rows(source))
    summary = summarise(orders, skipped)

    # A quality gate: a handful of bad rows is normal, a third of the
    # file being unreadable means the upstream export changed shape.
    seen = len(orders) + skipped
    if seen and skipped / seen > MAX_SKIPPED_RATIO:
        log.error("refusing to publish: %d of %d rows unparseable", skipped, seen)
        return 3

    # Write to a temp file and rename. A crash mid-write then leaves the
    # PREVIOUS report intact rather than a half-written one, because
    # rename within a filesystem is atomic.
    destination = REPORTS_DIR / f"summary-{run_date.isoformat()}.txt"
    staging = destination.with_suffix(".txt.tmp")
    staging.write_text(format_report(summary), encoding="utf-8")
    staging.replace(destination)

    log.info(
        "close complete: customers=%d skipped=%d over_limit=%d report=%s",
        len(summary.totals), skipped, len(summary.over_limit), destination,
    )

    failed = notify_over_limit(summary.over_limit)
    if failed:
        log.warning("%d credit-limit emails failed", failed)
        return 1                                    # partial success

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
`,
      hl: [24, 25, 33, 34, 41, 42, 43],
      caption: "Every change here answers a question an operator asks at 3 a.m.: which day did it run for, why did it stop, is this report complete, and can I safely run it again?"
    },

    { t: "dl", items: [
      ["A date argument",
       "The original could only ever process today. Re-running a failed night, or backfilling after an upstream fix, meant editing the source. **Any job derived from `date.today()` should accept an override** — it costs one parameter and it is the difference between a five-minute recovery and a deployment."],
      ["Dated output filenames",
       "`summary.txt` was overwritten every night, so yesterday's report was gone the moment today's ran — including when today's was wrong."],
      ["Write-then-rename",
       "A crash while writing left a truncated report that looks like a complete one. Writing to a staging file and calling `replace()` makes the publish atomic: readers see the old file or the new one, never a partial."],
      ["Distinct exit codes",
       "`0` success, `1` partial (emails failed), `2` no input, `3` refused on quality. A scheduler can retry a `2` in an hour, page on a `3`, and merely log a `1`. A script that only ever exits 0 or 1 forces the operator to read logs to learn anything."],
      ["`logging`, not `print`",
       "Timestamps, levels, and a logger name that filters. The structured fields in that final `log.info` are what a dashboard graphs — `skipped` trending upward is an upstream problem two weeks before anyone notices a wrong total (Lesson 14.2)."],
      ["A quality gate",
       "Silently skipping rows is right for a handful and wrong for a third of the file. The threshold turns \"the report is quietly incomplete\" into a loud, actionable failure."],
      ["Environment-based paths",
       "Not a config framework — just `os.environ.get` with the current values as defaults. It makes the script runnable in a test, in staging, and on a laptop, which is the whole requirement (Lesson 14.1)."]
    ]},

    { t: "callout", kind: "good", title: "What was deliberately not done", body: [
      { t: "ul", items: [
        "**No class.** The logic is four pure functions with no shared state; wrapping them in a `NightlyCloseProcessor` would add a `self` that carries nothing (Lesson 4.1).",
        "**No plugin system for report formats.** There is one format and no request for a second.",
        "**No async.** It reads one file and sends a handful of emails. Concurrency would add failure modes and save nothing.",
        "**No retry framework.** Failed emails are counted and reported; the scheduler re-runs the job. A bespoke retry loop here would duplicate what the platform already does.",
        "**The credit-limit ordering bug is still there**, documented and flagged for a product decision."
      ]},
      { t: "p", text: "**A refactor is finished when the next change is speculative.** Every item above is defensible engineering for a system that needs it — and unpaid complexity for one that does not. The script is now testable, observable, re-runnable and correct about money, which is what it needed." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Take a second script through the same three passes",
      difficulty: "advanced",
      minutes: 40,
      body: [
        { t: "p", text: "Here is a different undesigned script — a stock reconciliation job. Apply the same method: characterise, correctness, seams, production. Write down what you change in each pass and why." },
        { t: "code", lang: "python", title: "reconcile.py — as found", numbered: false, code: `
import json, requests

def reconcile():
    warehouse = json.load(open("/data/warehouse.json"))
    r = requests.get("http://inventory.internal/api/stock")
    api = r.json()
    diffs = []
    for sku in warehouse:
        if sku in api:
            d = warehouse[sku] - api[sku]
            if d != 0:
                diffs.append((sku, d))
        else:
            diffs.append((sku, warehouse[sku]))
    f = open("/data/diffs.json", "w")
    json.dump(diffs, f)
    f.close()
    if len(diffs) > 0:
        requests.post("http://alerts.internal/notify",
                      json={"msg": str(len(diffs)) + " discrepancies"})
    print(len(diffs))

reconcile()`},
        { t: "p", text: "This one hides at least four correctness problems that the original nightly script did not have. Find them before restructuring anything." }
      ],
      requirements: [
        "Pass 1: fix every correctness problem, including the two that involve the HTTP call and the one about SKUs that exist in the API but not the warehouse.",
        "Pass 1: do not restructure. One function is fine at this stage.",
        "Pass 2: extract pure functions with no network and no filesystem, and write tests for the comparison logic alone.",
        "Pass 3: add config, logging, an atomic write and meaningful exit codes.",
        "State explicitly which pass changed behaviour and which did not.",
        "**Name one abstraction you chose not to add, and justify it.**"
      ],
      hint: "`requests.get` with no timeout is the one that takes down the scheduler. And read the loop again asking what happens to a SKU the API knows about that the warehouse file does not.",
      solution: {
        lang: "python",
        title: "reconcile.py",
        code: `# =========================================================================
# PASS 1 -- CORRECTNESS. Behaviour CHANGES, deliberately. Still one function.
# =========================================================================
#
# Problems found, in the order they would hurt:
#
# 1. requests.get with NO TIMEOUT. The default is to wait forever. One
#    hung inventory service and this job never finishes, never releases
#    its scheduler slot, and blocks every subsequent run.
#
# 2. No status check. A 500 returning an HTML error page reaches .json()
#    and raises there -- or worse, a 200 with {"error": ...} parses fine
#    and produces a reconciliation against an empty dict, reporting
#    EVERY sku as a discrepancy.
#
# 3. SKUs in the API but not in the warehouse are INVISIBLE. The loop
#    iterates over warehouse only, so phantom stock -- the direction that
#    means someone shipped what does not exist -- is never reported.
#    This is a missing requirement, not a style issue.
#
# 4. Files opened without with. json.dump leaves diffs.json truncated if
#    it raises partway.
#
# 5. The alert POST has the same two problems as the GET, and it fires
#    after the file is written, so a failed alert loses nothing -- but a
#    HUNG alert endpoint still hangs the job.
#
# 6. len(diffs) > 0 with no upper bound: if the API returns {} then every
#    sku is a discrepancy and the alert says "48000 discrepancies" rather
#    than "the API is broken".

import json
import requests

TIMEOUT = 10


def reconcile():
    with open("/data/warehouse.json") as f:
        warehouse = json.load(f)

    response = requests.get("http://inventory.internal/api/stock", timeout=TIMEOUT)
    response.raise_for_status()
    api = response.json()

    if not isinstance(api, dict) or not api:
        raise ValueError("inventory API returned no usable stock data")

    diffs = []
    for sku in warehouse.keys() | api.keys():          # BOTH directions
        difference = warehouse.get(sku, 0) - api.get(sku, 0)
        if difference != 0:
            diffs.append((sku, difference))

    diffs.sort()                                       # stable output

    with open("/data/diffs.json", "w") as f:
        json.dump(diffs, f)

    if diffs:
        requests.post("http://alerts.internal/notify",
                      json={"msg": f"{len(diffs)} discrepancies"},
                      timeout=TIMEOUT)
    print(len(diffs))


# =========================================================================
# PASS 2 -- SEAMS. Behaviour IDENTICAL. If a test result moves, I erred.
# =========================================================================

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Discrepancy:
    sku: str
    warehouse: int
    system: int

    @property
    def difference(self) -> int:
        return self.warehouse - self.system

    @property
    def direction(self) -> str:
        """Which way the error runs -- the thing an operator acts on."""
        return "surplus" if self.difference > 0 else "shortfall"


def compare(
    warehouse: Mapping[str, int],
    system: Mapping[str, int],
) -> list[Discrepancy]:
    """Pure. Every sku in EITHER source, sorted for a stable diff."""
    return sorted(
        (
            Discrepancy(sku, warehouse.get(sku, 0), system.get(sku, 0))
            for sku in warehouse.keys() | system.keys()
            if warehouse.get(sku, 0) != system.get(sku, 0)
        ),
        key=lambda d: d.sku,
    )


def is_plausible(
    discrepancies: list[Discrepancy],
    total_skus: int,
    max_ratio: float = 0.10,
) -> bool:
    """A reconciliation flagging most of the catalogue is a broken feed,
    not a warehouse problem. Refusing to alert on it is the difference
    between a useful page and one people learn to ignore."""
    return not total_skus or len(discrepancies) / total_skus <= max_ratio


# ---- tests: no network, no filesystem, no fixtures ----------------------

def test_reports_both_directions() -> None:
    """The bug pass 1 fixed, locked down. A sku the API knows about and
    the warehouse does not was previously invisible."""
    result = compare({"a": 10}, {"a": 8, "phantom": 5})

    assert [(d.sku, d.difference) for d in result] == [("a", 2), ("phantom", -5)]
    assert result[0].direction == "surplus"
    assert result[1].direction == "shortfall"


def test_matching_stock_is_not_reported() -> None:
    assert compare({"a": 10, "b": 0}, {"a": 10, "b": 0}) == []


def test_output_is_sorted() -> None:
    forward = compare({"z": 1, "a": 1}, {})
    assert [d.sku for d in forward] == ["a", "z"]


def test_empty_feed_is_implausible() -> None:
    """An empty API response makes every sku a discrepancy. The gate
    turns "48000 discrepancies" into "the feed is broken"."""
    warehouse = {f"sku-{i}": 1 for i in range(100)}
    discrepancies = compare(warehouse, {})

    assert len(discrepancies) == 100
    assert not is_plausible(discrepancies, total_skus=100)


def test_small_discrepancy_count_is_plausible() -> None:
    assert is_plausible(compare({"a": 1}, {"a": 2}), total_skus=100)


# =========================================================================
# PASS 3 -- PRODUCTION. Config, logging, atomic write, exit codes.
# =========================================================================

import logging
import os
import sys
from pathlib import Path

log = logging.getLogger("reconcile")

WAREHOUSE_FILE = Path(os.environ.get("WAREHOUSE_FILE", "/data/warehouse.json"))
DIFFS_FILE = Path(os.environ.get("DIFFS_FILE", "/data/diffs.json"))
STOCK_URL = os.environ.get("STOCK_URL", "http://inventory.internal/api/stock")
ALERT_URL = os.environ.get("ALERT_URL", "http://alerts.internal/notify")
HTTP_TIMEOUT = float(os.environ.get("HTTP_TIMEOUT", "10"))


def fetch_system_stock() -> dict[str, int]:
    response = requests.get(STOCK_URL, timeout=HTTP_TIMEOUT)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError(f"expected an object from {STOCK_URL}")
    return payload


def publish(discrepancies: list[Discrepancy], path: Path) -> None:
    """Atomic: readers see the old file or the new one, never a partial."""
    staging = path.with_suffix(path.suffix + ".tmp")
    staging.write_text(
        json.dumps([
            {"sku": d.sku, "warehouse": d.warehouse,
             "system": d.system, "difference": d.difference}
            for d in discrepancies
        ], indent=2),
        encoding="utf-8",
    )
    staging.replace(path)


def main() -> int:
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s %(message)s")

    warehouse = json.loads(WAREHOUSE_FILE.read_text(encoding="utf-8"))

    try:
        system = fetch_system_stock()
    except (requests.RequestException, ValueError) as exc:
        log.error("cannot reach inventory API: %s", exc)
        return 2                                  # retryable -- not our bug

    discrepancies = compare(warehouse, system)
    total = len(warehouse.keys() | system.keys())

    if not is_plausible(discrepancies, total):
        log.error(
            "refusing to publish: %d of %d skus differ -- suspect a bad feed",
            len(discrepancies), total,
        )
        return 3                                  # page a human

    publish(discrepancies, DIFFS_FILE)
    log.info(
        "reconciled: skus=%d discrepancies=%d surplus=%d shortfall=%d",
        total, len(discrepancies),
        sum(1 for d in discrepancies if d.difference > 0),
        sum(1 for d in discrepancies if d.difference < 0),
    )

    if discrepancies:
        try:
            requests.post(ALERT_URL,
                          json={"discrepancies": len(discrepancies)},
                          timeout=HTTP_TIMEOUT)
        except requests.RequestException as exc:
            # The file is already published; a failed alert is not a
            # failed reconciliation. Report it and exit partial.
            log.warning("alert delivery failed: %s", exc)
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())


# =========================================================================
# WHICH PASS CHANGED BEHAVIOUR
# =========================================================================
#
# Pass 1  CHANGED behaviour, on purpose: phantom skus are now reported,
#         a failing API now stops the run instead of producing a false
#         all-clear, and output is sorted. The characterisation test was
#         updated with a note saying which assertions moved and why.
#
# Pass 2  Changed NOTHING. Same inputs, same diffs.json. The Discrepancy
#         dataclass carries the same numbers the tuples did.
#
# Pass 3  Changed behaviour only at the edges -- exit codes, an atomic
#         write, and a refusal to publish an implausible result. The
#         comparison logic is byte-identical to pass 2.
#
#
# THE ABSTRACTION I DID NOT ADD
#
# A StockSource protocol with WarehouseFile and InventoryAPI
# implementations. It is the obvious "clean architecture" move and it
# would buy nothing here: compare() already takes two Mappings, so it is
# fully testable with dicts. A protocol would add two classes and an
# import to produce the same dicts by a longer route.
#
# It becomes right the moment there is a SECOND system to reconcile
# against -- at which point the protocol has two implementations and
# earns its existence. Adding it now is a guess about a requirement
# nobody has made.`,
        notes: [
          { t: "p", text: "**The missing timeout is the one that takes down more than this job.** `requests` waits forever by default, so a hung upstream holds the scheduler slot and every subsequent run queues behind it. It is one keyword argument and it belongs on every outbound call you ever write." },
          { t: "p", text: "**The one-directional loop was a missing requirement, not a style problem.** Iterating over `warehouse` only means stock the system believes exists and the warehouse does not — the direction that indicates a shipping or theft problem — was never reported in eighteen months of running. Finding this is why pass 1 comes before restructuring: a tidier version of the same loop would have preserved the bug perfectly." },
          { t: "p", text: "**The plausibility gate turns a useless alert into a useful one.** With an empty API response every SKU differs, and the original would have posted \"48000 discrepancies\" — which reads as a catastrophe and is actually a broken feed. Distinguishing \"the data is bad\" from \"the warehouse is wrong\" is the difference between a page people act on and one they mute." },
          { t: "callout", kind: "insight", title: "Why the pass boundaries are worth the discipline", body: [
            { t: "p", text: "The value of \"pass 2 changed nothing\" is that it is **checkable**. Run the old and new versions over the same input and diff the output; if they differ, you have a bug, and you know it is in the restructuring rather than in the logic." },
            { t: "p", text: "Mix the passes and that check disappears. When a refactor changes behaviour *and* structure at once, a wrong number afterwards could come from either, and the only way to find out is to read all of it again." }
          ]},
          { t: "p", text: "**Naming the abstraction you rejected is a real review skill.** \"I considered a `StockSource` protocol and left it out because `compare()` already takes two mappings\" tells a reviewer you made a decision. Silence on the same point reads as not having thought about it — and invites the reviewer to ask for it." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team inherits a 400-line billing script and books two weeks to \"clean it up\". They start with the obvious wins: rename variables, split the long function, add type hints, replace loops with comprehensions. It reads beautifully by the end of week one." },
      { t: "p", text: "**Week two, month-end runs and three customers are billed twice.** The bug is in a condition that was rewritten from `if not (a or b)` to `if not a or not b` during the tidying. Nobody can say when it was introduced, because there were no tests and the fifty commits are all named \"cleanup\"." },
      { t: "p", text: "**Everything about that failure was avoidable, and none of it was about skill.** No characterisation test meant nothing measured the change. Correctness and structure moved together, so no commit was verifiable. And the pass that mattered — is the money right? — never happened, because it is the least satisfying one to start with." },
      { t: "p", text: "**The order is the technique.** Pin behaviour, fix correctness, then create seams without changing behaviour, then polish. Each pass ends somewhere you could ship. A refactor you can abandon halfway is a refactor you can also review, and both properties come from the same discipline." }
    ]}
  ],

  takeaways: [
    "**Refactor in a fixed order:** characterise, then correctness, then seams, then production polish. The order is what makes each step verifiable.",
    "**Pin current behaviour with a test before touching anything** — bugs included. You cannot preserve behaviour you never measured.",
    "**Only the correctness pass is allowed to change what the program does**, and the changes should be small enough to name individually if tonight's run breaks.",
    "**The seam that pays for itself is pure logic separated from I/O.** A pricing rule you can test in one line was previously reachable only through a CSV file and an SMTP server.",
    "**A pass that restructures must not change behaviour** — that is checkable by diffing old and new output, and mixing the two passes destroys the check.",
    "`Decimal` from the **string**, never from a float, and never `float` for money. Eighteen months of accumulated binary error is why the report never reconciles.",
    "In a batch job, **skip and count** malformed rows rather than raising — then gate on the ratio, because a handful is normal and a third of the file is an upstream change.",
    "**Write to a staging file and rename.** A crash mid-write otherwise leaves a truncated report that looks complete; `replace()` within a filesystem is atomic.",
    "**Distinct exit codes let a scheduler act without reading logs** — retry a missing input, page on a refused publish, merely log a partial success.",
    "**Any job derived from `date.today()` should accept a date override.** It costs one parameter and turns a backfill from a deployment into a five-minute rerun.",
    "**An abstraction needs a second implementation or a second caller.** One of each means indirection wearing the costume of design.",
    "**A refactor is finished when the next change is speculative** — and naming what you deliberately left undone is part of the work."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why write a characterisation test that asserts existing buggy output before refactoring?",
        options: [
          "To document the bug for the issue tracker",
          "So any behaviour change during restructuring shows up as a diff — you cannot preserve behaviour you never measured",
          "Because test coverage targets require it",
          "To prove the bug is not caused by the refactor"
        ],
        answer: 1,
        why: "The test is a tripwire, not a specification. Its value is that the restructuring pass must leave it passing, so an accidental change is caught immediately and localised to the commit that caused it. When the correctness pass deliberately changes behaviour, you update the test and its diff shows exactly which outputs moved — which is a review artefact rather than a guess."
      },
      {
        stem: "You have inherited an untested 400-line script. What do you do first?",
        options: [
          "Split the long function into smaller ones",
          "Pin the current behaviour with a test around the outside, then fix correctness bugs — structure comes after you can tell whether you broke something",
          "Add type hints throughout so a checker can find the bugs",
          "Rewrite it from scratch against the current requirements"
        ],
        answer: 1,
        why: "Splitting first is the most common mistake: it changes structure in code where no test can tell you whether the split preserved meaning, and a rewritten condition or a moved side effect will not surface until month-end. Types help but find a different class of bug. Pin behaviour, fix what produces wrong answers, then restructure under the protection of the test you now have."
      },
      {
        stem: "In the restructuring pass, a previously untestable pricing rule becomes a three-line pure function. What is the primary benefit?",
        options: [
          "It runs faster because there is less indirection",
          "Boundary conditions can be verified exhaustively — the discount thresholds had never been checked because checking them required a CSV file and an SMTP server",
          "It reduces the total line count",
          "Pure functions are automatically thread-safe"
        ],
        answer: 1,
        why: "The seam converts a whole-program integration test into a table of assertions. The discount boundaries — 50 gets nothing, 51 gets 5%, 100 still gets 5%, 101 gets 10% — are exactly the kind of off-by-one that survives for years, because nobody writes a CSV file and starts a mail server to check them. Speed and line count are incidental; testability is the reason."
      },
      {
        stem: "Why write the report to a `.tmp` file and then call `replace()`?",
        options: [
          "It is faster than writing directly",
          "It makes publishing atomic — a crash mid-write leaves the previous report intact rather than a truncated file that looks complete",
          "It avoids needing a `with` block",
          "It prevents concurrent writers from corrupting the file"
        ],
        answer: 1,
        why: "A truncated report is worse than a missing one because it looks finished — a downstream reader consumes it and produces plausible, wrong numbers. `replace()` within a filesystem is atomic, so a reader sees either the old complete file or the new complete file. It is a two-line change that removes an entire class of partial-failure bug, and it belongs on any file another process reads."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you approach refactoring a legacy script with no tests?",
        strong: "Characterise first — a test around the outside that pins current behaviour, bugs included. Then correctness fixes, which are the only ones allowed to change behaviour. Then seams: pure logic split from I/O, with behaviour held identical. Polish last.",
        answer: [
          { t: "p", text: "The order is the answer, and being able to say *why* each step precedes the next is what distinguishes it from a list of good practices — you cannot verify a restructuring in code whose behaviour was never measured." },
          { t: "p", text: "The point that only one pass changes behaviour is the operationally important one: when something breaks the following night, the cause is in a small, named set of changes rather than fifty commits called \"cleanup\"." },
          { t: "p", text: "\"Every pass ends somewhere shippable\" answers the question interviewers usually ask next — what happens when the refactor is interrupted by something urgent." }
        ]
      },
      {
        level: "advanced",
        q: "You find a behavioural bug while refactoring. Do you fix it?",
        strong: "It depends on whether the correct behaviour is knowable. A clear bug — no timeout on an HTTP call, money in floats — gets fixed in the correctness pass, on its own commit. An open question, like whether a credit limit applies to a running total or a daily total, gets documented and raised, not guessed.",
        answer: [
          { t: "p", text: "The distinction between a defect and an unanswered requirement is the substance here, and most candidates collapse the two." },
          { t: "p", text: "The reason not to guess is worth stating: a refactor that silently answers product questions destroys the property that makes it reviewable — that you can say what changed and why." },
          { t: "p", text: "Separate commits for behavioural fixes matter for the same reason. A fix buried in a restructuring commit is invisible in review and unbisectable afterwards." }
        ]
      },
      {
        level: "advanced",
        q: "How do you decide a refactor is finished?",
        strong: "When the next change would be speculative — an abstraction with one implementation, a config system for one setting, a plugin point nobody has asked for. The bar is that the code is correct, testable, observable and re-runnable.",
        answer: [
          { t: "p", text: "Naming the test for an abstraction — a second implementation or a second caller — gives a concrete rule rather than an appeal to taste, and it is one a reviewer can apply to your PR." },
          { t: "p", text: "The strongest version lists what was deliberately left out and why: no class where there is no state, no async where there is no concurrency, no retry framework where the scheduler already retries." },
          { t: "p", text: "It also inverts well: unpaid complexity is a cost that recurs at every future change, so the burden of proof sits with adding the layer, not with leaving it out." }
        ]
      },
      {
        level: "core",
        q: "What would you change first in a script that uses `float` for currency and `print` for output?",
        strong: "The `float`, because it produces wrong answers, and `Decimal` constructed from the string — `Decimal(0.1)` reproduces the exact error you were avoiding. `print` to `logging` is polish and comes later.",
        answer: [
          { t: "p", text: "Ranking the two correctly is the whole question: one silently corrupts money, the other only makes operations harder, and treating them as equally urgent is the instinct the ordering exists to correct." },
          { t: "p", text: "The `Decimal(str(x))` detail is a genuine discriminator — plenty of people know to use `Decimal` and still construct it from a float." },
          { t: "p", text: "Following with what logging actually buys — timestamps, levels, and structured fields a dashboard can graph, like a rising skipped-row count — shows why it is worth doing at all rather than dismissing it as cosmetic." }
        ]
      }
    ]
  }
});

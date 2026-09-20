/* ============================================================================
   LESSON 6.6 — Debugging Beyond print()
   ========================================================================= */
EC.receiveLesson({
  id: "6.6",

  lede: "`print` works, and for a five-line script it is the right tool. It stops working when the bug is three layers down, appears once in a thousand runs, or only in production. **Debugging is a search procedure, not an act of insight** — and the engineers who look fastest are the ones running a method rather than staring harder.",

  objectives: [
    "Read a traceback bottom-up and identify the frame that matters",
    "Drive `pdb` with the dozen commands that cover real sessions",
    "Attach a debugger to a crash after the fact with post-mortem debugging",
    "Narrow a bug by bisection instead of by inspection",
    "Choose a technique for a bug you cannot reproduce locally"
  ],

  prerequisites: ["6.1", "6.4"],

  blocks: [

    { t: "h2", n: "01", text: "Reading a traceback", id: "traceback" },

    { t: "viz",
      title: "Where to look first",
      caption: "Python prints frames outermost-first, so the line that raised is at the bottom — but the frame that contains the mistake is often several lines above it. Read the last line for what went wrong, then scan upward for the last frame you own.",
      svg: `<svg viewBox="0 0 900 330" role="img" aria-label="Annotated traceback showing which frame to read first, which frames are library code, and where the actual bug usually lives">
  <rect x="14" y="20" width="640" height="270" rx="8" class="s-fill s-stroke" stroke-width="1.2"/>

  <g class="s-mono" style="font-size:11px">
    <text x="32" y="46">Traceback (most recent call last):</text>
    <text x="32" y="70">  File "app/api.py", line 44, in handle</text>
    <text x="32" y="88">    return build_invoice(order)</text>
    <text x="32" y="112">  File "app/billing.py", line 91, in build_invoice</text>
    <text x="32" y="130">    total = sum(line_total(l) for l in order.lines)</text>
    <text x="32" y="154">  File "app/billing.py", line 78, in line_total</text>
    <text x="32" y="172">    return line.price * line.quantity</text>
    <text x="32" y="196">  File "vendor/money.py", line 210, in __mul__</text>
    <text x="32" y="214">    return Money(self.amount * other)</text>
    <text x="32" y="238">  File "vendor/money.py", line 33, in __init__</text>
    <text x="32" y="256">    raise TypeError(f"amount must be numeric")</text>
  </g>

  <text x="32" y="282" class="s-mono" style="font-size:11px;fill:var(--crit)">TypeError: amount must be numeric</text>

  <line x1="666" y1="278" x2="668" y2="278" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="678" y="282" class="s-sub" style="fill:var(--crit)">1. READ THIS FIRST — what went wrong</text>

  <rect x="666" y="186" width="220" height="60" rx="6" style="fill:none;stroke:var(--border-strong)" stroke-width="1.1"/>
  <text x="680" y="208" class="s-sub">2. Library frames. Where it</text>
  <text x="680" y="226" class="s-sub">surfaced, rarely where it began.</text>

  <rect x="666" y="140" width="220" height="42" rx="6" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="680" y="164" class="s-sub" style="fill:var(--good)">3. LAST FRAME YOU OWN — start here</text>

  <rect x="666" y="60" width="220" height="72" rx="6" style="fill:none;stroke:var(--accent-line)" stroke-width="1.2"/>
  <text x="680" y="82" class="s-sub">4. Read upward only if the</text>
  <text x="680" y="100" class="s-sub">value came from further out —</text>
  <text x="680" y="118" class="s-sub">which, for bad data, it did</text>

  <text x="14" y="316" class="s-sub">The crash is in vendor code; the BUG is that line.quantity is a string, and the string arrived at api.py line 44.</text>
</svg>`
    },

    { t: "ul", items: [
      "**\"Most recent call last\" means the bottom frame raised.** The top is your entry point.",
      "**The last frame you own is where to start**, not the deepest frame. A `TypeError` inside a library usually means you passed it something wrong.",
      "**A `KeyError` shows the key; a `TypeError` shows the types.** Read the exception message before any frame — it often names the answer.",
      "**Chained tracebacks read top to bottom in time.** The first block happened first; \"The above exception was the direct cause\" tells you it was a deliberate translation, \"During handling\" suggests the handler itself failed (Lesson 6.3).",
      "**Frames repeated hundreds of times with a `RecursionError`** mean infinite recursion; look at the two or three distinct frames in the cycle, not the thousand copies."
    ]},

    { t: "h2", n: "02", text: "pdb, properly", id: "pdb" },

    { t: "code", lang: "python", title: "getting in", code: `
def process(order):
    total = compute(order)
    breakpoint()                 # 3.7+; respects PYTHONBREAKPOINT
    return total

# Disable every breakpoint() in the file without editing it:
#   PYTHONBREAKPOINT=0 python app.py
#
# Or route them to a different debugger:
#   PYTHONBREAKPOINT=ipdb.set_trace python app.py

# Run a script under the debugger from the start:
#   python -m pdb app.py
#
# Run it, and only drop into the debugger IF it crashes:
#   python -m pdb -c continue app.py
`,
      caption: "`PYTHONBREAKPOINT=0` is the reason to use `breakpoint()` over `import pdb; pdb.set_trace()`: a forgotten breakpoint can be neutralised by an environment variable rather than a hotfix."
    },

    { t: "table",
      head: ["Command", "Does", "Note"],
      rows: [
        ["`n` / next", "Run the next line, stepping **over** calls", "The one you use most"],
        ["`s` / step", "Step **into** the call on this line", "Use when you suspect the callee"],
        ["`r` / return", "Run until the current function returns", "Faster than `n` through a loop"],
        ["`c` / continue", "Run until the next breakpoint", ""],
        ["`until N`", "Run until a line number greater than the current", "**Escapes a loop** without stepping every iteration"],
        ["`l` / `ll`", "List source around here / the whole function", "`ll` first, always"],
        ["`w` / `bt`", "Print the stack", "Where am I and how did I get here"],
        ["`u` / `d`", "Move up / down a frame", "Inspect the caller's variables"],
        ["`p x` / `pp x`", "Print / pretty-print an expression", "`pp` for dicts and lists"],
        ["`a`", "Print the current function's arguments", "First command after landing in a frame"],
        ["`b file:42`, `b func`", "Set a breakpoint", "`b file:42, cond` for a conditional one"],
        ["`display x`", "Show `x` after every step when it changes", "Better than repeated `p x`"],
        ["`interact`", "Open a full Python REPL in this frame", "For anything `p` cannot express"],
        ["`q`", "Quit", ""]
      ],
      caption: "Single letters conflict with variable names: if you have a variable called `n`, `p n` prints it but bare `n` steps. Use `!n` to force it to be Python — `!` makes any line a statement rather than a command."
    },

    { t: "callout", kind: "insight", title: "Conditional breakpoints beat stepping 4,000 times", body: [
      { t: "code", lang: "python", title: "two ways to stop on the one that matters", numbered: false, code: `
# In code -- stop only for the bad record
for record in records:
    if record.id == 8821:
        breakpoint()
    process(record)

# In pdb -- no code change, no redeploy of your patience
(Pdb) b billing.py:78, line.quantity < 0
(Pdb) c`},
      { t: "p", text: "The condition is any Python expression evaluated in that frame. This turns \"the 4,000th iteration fails\" from an afternoon into ten seconds — and it is the single biggest reason to learn `pdb` rather than adding prints." },
      { t: "p", text: "`tbreak` sets a breakpoint that fires once and removes itself, which is what you usually want inside a loop." }
    ]},

    { t: "h2", n: "03", text: "Post-mortem debugging", id: "postmortem" },

    { t: "p", text: "The most useful `pdb` feature is the one people never find: you can inspect a crash **after** it happened, with the entire stack and every local variable still intact. No re-running, no guessing what the values were." },

    { t: "code", lang: "python", title: "three ways in", code: `
# 1. In a REPL or notebook, immediately after the exception
import pdb
pdb.pm()                    # post-mortem on the last traceback

# 2. Run a script and land in the debugger only if it crashes
#    python -m pdb -c continue app.py

# 3. In a long-running process: capture the traceback and debug later
import sys, traceback

def excepthook(exc_type, exc, tb):
    traceback.print_exception(exc_type, exc, tb)
    if sys.stdin.isatty():          # never in a container -- it would hang
        pdb.post_mortem(tb)

sys.excepthook = excepthook
`,
      out: `(Pdb) bt
  app.py(44)handle()
> billing.py(78)line_total()
(Pdb) a
line = OrderLine(sku='W-1', price=Decimal('9.99'), quantity='2')
(Pdb) p type(line.quantity)
<class 'str'>
(Pdb) u
(Pdb) p order.source
'legacy-import'`,
      caption: "Four commands and the bug is located: quantity is a string, and moving up one frame shows the orders came from the legacy importer. **No print statement, no re-run.**"
    },

    { t: "callout", kind: "warn", title: "Never leave an interactive debugger reachable in production", body: [
      { t: "ul", items: [
        "A stray `breakpoint()` in a container **hangs the process** waiting on stdin that will never arrive — the request times out and the worker is gone until it is killed.",
        "`pdb.post_mortem` in an `excepthook` does the same, which is why the example above guards on `sys.stdin.isatty()`.",
        "A remote debugger port left open is arbitrary code execution as your service account."
      ]},
      { t: "p", text: "**Add a CI check.** `ruff`'s `T100` rule flags `breakpoint()` and `pdb` imports, and a failing lint is cheaper than an incident (Lesson 9.7)." }
    ]},

    { t: "h2", n: "04", text: "A method, not a hunch", id: "method" },

    {"kind": "steps", "title": "A method, not a hunch", "caption": "Reproduce, narrow, hypothesise, test the hypothesis, fix, and add the test that would have caught it. Skipping the reproduction is where most debugging time goes.", "items": [{"label": "Reproduce", "desc": "a failing test or a one-line script that fails every time", "tone": "crit"}, {"label": "Narrow", "desc": "bisect the input, the commit, or the code path", "tone": "warn"}, {"label": "Hypothesise, then check", "desc": "one hypothesis, one experiment — a print or a breakpoint", "tone": "accent"}, {"label": "Fix, and keep the reproduction", "desc": "the failing test becomes the regression test", "tone": "good"}], "t": "diagram", "id": "dg-6_6-04-0"},


    { t: "ol", items: [
      "**Reproduce it.** A bug you cannot trigger on demand cannot be verified as fixed. Spend the time here — a reliable reproduction is most of the work, and everything after it is mechanical.",
      "**Shrink the reproduction.** Smallest input, fewest steps, fastest run. Every element you remove without losing the failure is a candidate cause eliminated.",
      "**State a hypothesis that could be wrong.** \"`quantity` is a string by the time it reaches `line_total`\" is testable. \"Something is wrong with the parsing\" is not.",
      "**Test one thing.** Change a single variable per run, and write down the result. Two changes at once means a passing run tells you nothing.",
      "**Bisect when hypotheses run out.** Halve the search space instead of reasoning about it — over inputs, over the call chain, or over commits.",
      "**Fix the cause, then confirm the reproduction now passes** — and add it as a test, because a bug that happened once will be reintroduced."
    ]},

    { t: "ladder",
      title: "Narrowing \"the report totals are wrong sometimes\"",
      rungs: [
        { level: "bad", label: "Read the code until it makes sense",
          why: "Unbounded, and it fails silently: you can stare at correct-looking code for hours. It also biases you toward the parts you already understand, which is where the bug is least likely to be.",
          code: `# Open billing.py. Read all 600 lines. Read them again.` },
        { level: "ok", label: "Prints at each stage",
          why: "It is real evidence and it works. But it needs a redeploy per iteration, produces output you must correlate by eye, and the prints get committed by accident.",
          code: `print("after parse:", len(orders))
print("after filter:", len(orders))
print("total:", total)` },
        { level: "best", label: "Bisect the data, then the code",
          why: "Each step halves the search space, so 40,000 rows are narrowed to one in about sixteen runs — and the answer is a specific input, not an impression. Once you have that input, a conditional breakpoint takes you to the exact frame.",
          code: `# 1. Bisect the INPUT: does the first half reproduce it?
total(rows[:20_000])        # correct
total(rows[20_000:])        # wrong  -> the bad row is in here
total(rows[20_000:30_000])  # correct
# ... about 16 halvings to a single row

# 2. Now the reproduction is one row. Stop exactly there:
(Pdb) b billing.py:78, line.sku == "W-8821"

# 3. If it is a regression, bisect the HISTORY:
git bisect start
git bisect bad HEAD
git bisect good v2.3.0
git bisect run pytest tests/test_totals.py -x -q`,
          note: "`git bisect run` automates the whole search: give it a command that exits non-zero on the bug and it finds the commit unattended, typically in a dozen builds over hundreds of commits." }
      ]
    },

    { t: "h2", n: "05", text: "Bugs you cannot reproduce locally", id: "production" },

    { t: "table",
      head: ["Symptom", "Tool", "What it gives you"],
      rows: [
        ["Process hangs, no output", "`faulthandler.dump_traceback_later(30)`", "A stack dump for every thread after 30 seconds — built in, no dependency"],
        ["Process hangs, already running", "`py-spy dump --pid 1234`", "The stack of a live process **without stopping it** or importing anything into it"],
        ["Slow, cause unknown", "`py-spy top --pid 1234`", "A live `top`-style view of where time is going"],
        ["Crashes only under load", "Structured logs with a correlation ID", "The one request's path through the system (Lesson 6.4)"],
        ["Wrong output, cause unknown", "Log the inputs, replay locally", "Turns an unreproducible bug into a reproducible one — the highest-value move"],
        ["Segfault or C-extension crash", "`faulthandler.enable()`", "A Python traceback from a fatal signal, which otherwise prints nothing"]
      ],
      caption: "`py-spy` is worth installing before you need it: it attaches to a running process by PID and does not require the target to cooperate, which makes it the only option for a hung production worker."
    },

    { t: "callout", kind: "trap", title: "\"It works on my machine\" is a list of differences", body: [
      { t: "p", text: "When behaviour differs between environments, the bug is in the difference. Enumerate them rather than re-running and hoping:" },
      { t: "ul", items: [
        "**Python version and package versions** — `pip freeze` on both, and diff it.",
        "**Environment variables** — including the ones your shell sets and the container does not.",
        "**Timezone and locale** — `TZ`, `LANG`. A `datetime` test passing locally and failing in UTC is a classic.",
        "**Filesystem case sensitivity** — Windows and macOS are usually case-insensitive; Linux is not, so `import Utils` works locally and fails in CI.",
        "**Data** — the shape of production data is almost never the shape of your fixtures.",
        "**Concurrency** — a race condition needs contention to appear, and one local request is not contention."
      ]},
      { t: "p", text: "**Bisect the differences too.** Run locally with the production environment variables; run the production image locally; run with production-shaped data. Each one either reproduces the bug or eliminates a cause." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Find the bug that is not where the exception is",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "This job runs nightly. Once or twice a month it raises, always on a different customer, and never in staging. Someone has already \"fixed\" it twice by adding a check at the crash site." },
        { t: "code", lang: "python", title: "the code", numbered: false, code: `
def build_statement(customer_id, orders, adjustments=[]):
    lines = []
    for order in orders:
        if order.customer_id == customer_id:
            lines.append(order)

    for adj in fetch_adjustments(customer_id):
        adjustments.append(adj)

    total = sum(l.amount for l in lines)
    for adj in adjustments:
        total += adj.amount

    return Statement(customer_id, lines, total)`},
        { t: "code", lang: "python", title: "the traceback", numbered: false, code: `
Traceback (most recent call last):
  File "nightly.py", line 40, in run
    statement = build_statement(cid, orders)
  File "billing.py", line 12, in build_statement
    total += adj.amount
AttributeError: 'NoneType' object has no attribute 'amount'`},
        { t: "p", text: "Diagnose it properly. The `AttributeError` is a symptom two removes from the cause, and there is a second, quieter bug producing wrong totals with no exception at all." },
        { t: "p", text: "Write the process, not just the answer — the requirements ask for the reasoning a reviewer would want to see." }
      ],
      requirements: [
        "Name the two bugs, and explain which one causes the traceback.",
        "Explain why it fails only occasionally and never in staging.",
        "Show the `pdb` session that would locate it, with the actual commands.",
        "Explain why a check at the crash site is the wrong fix.",
        "Fix both, and write a test that fails on the original for the *right* reason.",
        "Say what would have caught the second bug before it reached production."
      ],
      hint: "The mutable default argument is only half of it. Ask what `adjustments` contains on the *second* call in the same process — and then ask what that means for the totals on the first customer of the night versus the last.",
      solution: {
        lang: "python",
        title: "billing.py",
        code: `# =========================================================================
# DIAGNOSIS
# =========================================================================
#
# BUG 1 -- mutable default argument (Lesson 3.2)
#
#   def build_statement(customer_id, orders, adjustments=[]):
#
# The list is created ONCE, when the def executes at import time. Every
# call that does not pass adjustments explicitly shares that one list.
#
# BUG 2 -- the function APPENDS to it
#
#   for adj in fetch_adjustments(customer_id):
#       adjustments.append(adj)
#
# So the shared list accumulates every adjustment for every customer for
# the life of the process.
#
#
# WHY THE TRACEBACK LOOKS UNRELATED
#
# Customer 1 gets their own adjustments -- correct.
# Customer 2 gets their own PLUS customer 1's -- silently wrong total.
# Customer 400 carries the entire night's adjustments.
#
# The AttributeError happens when fetch_adjustments returns a list that
# contains a None (a soft-deleted row the query does not filter). Without
# the accumulation, that None would affect one customer on one night.
# WITH it, the None is retained in the shared list and re-processed on
# every subsequent call -- so one bad row poisons the rest of the run.
#
# The crash site is "total += adj.amount". The cause is a default
# argument evaluated at import time, 8 lines earlier and months ago.
#
#
# WHY IT IS INTERMITTENT AND NEVER IN STAGING
#
#   - It needs a None in fetch_adjustments, which needs a soft-deleted
#     adjustment row -- rare, and absent from seeded staging data.
#   - The shared list resets when the process restarts. A nightly job in
#     a fresh container starts clean, so the FIRST customer is always
#     correct and the corruption grows through the run.
#   - Staging processes a handful of customers, so the accumulation never
#     grows enough for anyone to notice the wrong totals either.
#
#
# THE PDB SESSION
#
#   $ python -m pdb -c continue nightly.py
#   ...
#   AttributeError: 'NoneType' object has no attribute 'amount'
#   (Pdb) a                          # arguments of the crashing frame
#   customer_id = 'c-4471'
#   orders = [...]
#   adjustments = [Adj(...), Adj(...), None, Adj(...), ... 340 more]
#                  ^^^^^^^^ 340 adjustments for ONE customer -- the tell
#   (Pdb) p len(adjustments)
#   347
#   (Pdb) p sum(1 for a in adjustments if a is None)
#   1
#   (Pdb) p build_statement.__defaults__       # the smoking gun
#   ([Adj(...), Adj(...), None, ... ],)
#
# __defaults__ holding data is conclusive: the default object itself has
# been mutated, which can only happen if the function appends to it.
#
#
# WHY A CHECK AT THE CRASH SITE IS THE WRONG FIX
#
#   for adj in adjustments:
#       if adj is not None:          # what the last two "fixes" did
#           total += adj.amount
#
# It stops the exception and PRESERVES the real damage: every customer
# after the first still gets other customers' adjustments added to their
# total. The traceback was the only signal that anything was wrong, and
# the "fix" removed the signal while keeping the corruption. Statements
# then go out silently incorrect -- strictly worse than crashing.


# =========================================================================
# THE FIX
# =========================================================================

from __future__ import annotations

from collections.abc import Iterable, Sequence
from decimal import Decimal


def build_statement(
    customer_id: str,
    orders: Iterable[Order],
    adjustments: Sequence[Adjustment] | None = None,
) -> Statement:
    """Build one customer's statement.

    adjustments defaults to None, not []: a mutable default is created
    once at import and shared by every call.
    """
    lines = [o for o in orders if o.customer_id == customer_id]

    # A NEW list per call. The caller's sequence is never mutated either,
    # which is the second half of the bug -- a function that appends to
    # an argument surprises its caller even when the default is fine.
    all_adjustments = list(adjustments or [])
    all_adjustments.extend(
        adj for adj in fetch_adjustments(customer_id) if adj is not None
    )

    total = sum(
        (line.amount for line in lines), start=Decimal(0)
    ) + sum(
        (adj.amount for adj in all_adjustments), start=Decimal(0)
    )

    return Statement(customer_id, lines, total)


# =========================================================================
# TESTS
# =========================================================================

def test_default_is_not_shared_between_calls() -> None:
    """THE test. It fails on the original with a wrong TOTAL, not an
    AttributeError -- which is the point: it targets the cause, not the
    symptom that happened to surface first."""
    first = build_statement("c-1", orders=[])
    second = build_statement("c-2", orders=[])

    # On the original, c-2's total includes c-1's adjustments.
    assert second.total == expected_total_for("c-2")
    assert len(build_statement.__defaults__[-1] or []) == 0 \\
        if build_statement.__defaults__ else True


def test_function_does_not_mutate_its_argument() -> None:
    """The caller's list must come back unchanged -- a separate promise
    from the default-argument one, and separately broken."""
    supplied = [Adjustment("a-1", Decimal("5"))]
    build_statement("c-1", orders=[], adjustments=supplied)

    assert supplied == [Adjustment("a-1", Decimal("5"))]


def test_none_rows_are_filtered_not_crashed_on() -> None:
    """The soft-deleted row is dropped at the source. Guarding at the
    point of use would have hidden the accumulation instead."""
    statement = build_statement("c-with-deleted-adjustment", orders=[])
    assert statement.total == expected_total_for("c-with-deleted-adjustment")


def test_hundreds_of_sequential_calls_stay_correct() -> None:
    """Simulates a nightly run. On the original, totals drift upward as
    the shared list grows -- which no single-call test can see."""
    for i in range(200):
        statement = build_statement(f"c-{i}", orders=[])
        assert statement.total == expected_total_for(f"c-{i}")


# =========================================================================
# WHAT WOULD HAVE CAUGHT IT EARLIER
# =========================================================================
#
#   - ruff / flake8-bugbear rule B006 flags a mutable default argument
#     as a lint error. One CI rule, zero human effort (Lesson 9.7).
#   - B008 catches the related "function call in a default".
#   - The sequential-calls test above: any test that calls the function
#     more than once in a process exposes accumulated state, and single-
#     call unit tests structurally cannot.
#   - A reconciliation check on the nightly job -- statement totals
#     summing to the ledger total -- would have flagged the wrong
#     numbers months before the exception appeared (Lesson 5.12).`,
        notes: [
          { t: "p", text: "**The traceback pointed at line 12; the bug is on line 1.** This is the normal case rather than an unusual one: an exception marks where an invalid value was *used*, and the interesting question is always where it came from. Reading upward through the frames, and then upward through time, is the skill." },
          { t: "p", text: "**`p build_statement.__defaults__` is the conclusive step.** Arguments looking wrong could have many explanations; a default object that contains 347 accumulated items can only mean the function mutates its own default. One command turns a hypothesis into a diagnosis." },
          { t: "p", text: "**The two previous \"fixes\" made things worse in the specific way that matters.** Adding `if adj is not None` removed the crash and kept the corruption, converting a loud failure into silent wrong statements. When a fix eliminates a symptom without explaining it, it has usually removed your only detector." },
          { t: "callout", kind: "insight", title: "Why single-call unit tests could never catch this", body: [
            { t: "p", text: "Every test that calls the function once passes on the broken version, because the first call is always correct. The bug lives in state shared *between* calls, and a test structured as one call per test case cannot express it." },
            { t: "p", text: "This generalises to a useful review question: does anything in this module hold state across calls — a default argument, a module-level dict, an `lru_cache` (Lesson 5.10)? If so, at least one test must call it repeatedly." }
          ]},
          { t: "p", text: "**A lint rule would have prevented the whole incident.** `B006` flags mutable default arguments, it has no false positives worth arguing about, and it costs one line in `pyproject.toml`. Debugging skill is valuable; not needing it is better." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A worker stops processing its queue. No errors, no crash, no logs after a certain timestamp — the process is alive and consuming no CPU. The team restarts it, the backlog clears, and two days later it happens again." },
      { t: "p", text: "**Restarting destroys the evidence every time.** With the process gone there is nothing to inspect, so each occurrence resets the investigation to zero while the on-call engineer learns to reach for the restart faster." },
      { t: "p", text: "**`py-spy dump --pid <pid>` answers it in one command.** It attaches to the live process without stopping it and prints every thread's stack: all workers blocked in `socket.recv` on a connection to a service that had silently stopped responding — no timeout, so no exception, so no log line (Lesson 6.5)." },
      { t: "p", text: "**Two lessons, one technical and one procedural.** The technical one is the missing timeout, which is why the failure had no symptom other than silence. The procedural one is bigger: **capture state before restarting.** A stack dump, a heap snapshot or thirty seconds of `py-spy top` costs almost nothing and is the difference between fixing it and restarting forever." }
    ]}
  ],

  takeaways: [
    "**Read a traceback from the bottom.** The last line says what went wrong; the last frame you own is where to start, not the deepest library frame.",
    "**An exception marks where a bad value was used, not where it came from.** The interesting question is always how it got there.",
    "**`breakpoint()` over `pdb.set_trace()`** — `PYTHONBREAKPOINT=0` disables every one of them without editing code, and it can route to another debugger.",
    "**`a` then `ll` then `bt` is the opening of most sessions**: what were the arguments, what does this function look like, how did I get here.",
    "**Conditional breakpoints — `b file:78, cond` — replace stepping through 4,000 iterations.** This alone justifies learning `pdb`.",
    "**Post-mortem debugging inspects a crash after the fact** with every local intact: `pdb.pm()` in a REPL, or `python -m pdb -c continue script.py`.",
    "**Never leave an interactive debugger reachable in production** — `breakpoint()` in a container hangs the process waiting on stdin. Lint for it with `ruff`'s `T100`.",
    "**Debugging is a search: reproduce, shrink, hypothesise, test one thing, bisect.** A reliable reproduction is most of the work.",
    "**Bisect rather than reason** when hypotheses run out — over input, over the call chain, or over commits with `git bisect run`.",
    "**\"Works on my machine\" is a list of differences**: versions, environment variables, timezone, filesystem case sensitivity, data shape, concurrency. Eliminate them one at a time.",
    "**`py-spy dump --pid` reads a live process's stacks without stopping it**, which makes it the only real option for a hung production worker.",
    "**Capture state before restarting.** A restart clears the backlog and destroys the only evidence, which is why some bugs recur for months."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A traceback ends in a library file with `TypeError: amount must be numeric`. Where do you start?",
        options: [
          "The deepest frame — that is where the error was raised",
          "The last frame in code you own, since a `TypeError` inside a library usually means you passed it something wrong",
          "The top frame, which is the entry point",
          "The library's source, to check whether it is a known bug"
        ],
        answer: 1,
        why: "The deepest frame is where the problem *surfaced*; the library is doing exactly what it should by rejecting a bad value. The frame that matters is the last one you control, because that is where the value was passed in — and often the real question is which of your callers produced it, which means reading further up still."
      },
      {
        stem: "A bug appears on the 4,000th iteration of a loop. What is the efficient way in?",
        options: [
          "Add a print inside the loop and search the output",
          "Set a conditional breakpoint — `b file:78, record.id == 8821` — so execution stops only on the case that fails",
          "Step through with `n` until you reach it",
          "Reduce the input to 100 items and hope it still occurs"
        ],
        answer: 1,
        why: "A conditional breakpoint evaluates any Python expression in that frame and stops only when it is true, turning an afternoon of stepping into ten seconds. Prints work but produce thousands of lines to correlate by eye and need a re-run per iteration of the idea. Shrinking input is a good instinct generally, but here the condition gets you there without changing the reproduction at all."
      },
      {
        stem: "A production worker hangs: alive, no CPU, no logs. What do you do first?",
        options: [
          "Restart it to clear the backlog",
          "Run `py-spy dump --pid <pid>` to capture every thread's stack while the process is still in the broken state",
          "Add more logging and wait for it to happen again",
          "Attach `pdb` remotely"
        ],
        answer: 1,
        why: "Restarting clears the symptom and destroys the only evidence, which is how a bug recurs for months with the investigation resetting each time. `py-spy` attaches by PID without stopping the process or requiring it to cooperate, and the stacks usually name the cause directly — threads blocked in `socket.recv` mean a call with no timeout. Capture state, then restart."
      },
      {
        stem: "Why is `if adj is not None: total += adj.amount` a poor fix for an `AttributeError` on a `None` in a shared list?",
        options: [
          "It is slower than filtering the list once",
          "It removes the exception while leaving the underlying corruption in place, converting a loud failure into silently wrong output",
          "`is not None` does not work for all falsy values",
          "It should be `try/except AttributeError` instead"
        ],
        answer: 1,
        why: "The exception was the only signal that anything was wrong. Guarding at the point of use stops the crash and keeps the accumulation that produced the `None`, so statements now go out with quietly incorrect totals — strictly worse than crashing, because nothing detects it. When a fix removes a symptom without explaining it, check whether it has removed your only detector."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you debug something more complex than a print statement can handle?",
        strong: "`breakpoint()` with a condition, or post-mortem debugging — `python -m pdb -c continue script.py` lands you in the debugger at the moment of the crash with every local intact. Then `a`, `ll`, `bt`, and move up frames to see where the bad value came from.",
        answer: [
          { t: "p", text: "Post-mortem is the feature that separates people who have used `pdb` from people who have heard of it — no re-running and no guessing what the values were." },
          { t: "p", text: "Conditional breakpoints are the other one worth naming: `b file:78, record.id == 8821` turns \"it fails on the 4,000th iteration\" from an afternoon into ten seconds." },
          { t: "p", text: "`PYTHONBREAKPOINT=0` shows operational awareness — a forgotten `breakpoint()` in a container hangs on stdin, and being able to neutralise it with an environment variable beats a hotfix." }
        ]
      },
      {
        level: "advanced",
        q: "Walk me through debugging something you cannot reproduce locally.",
        strong: "Turn it into something reproducible. Log the exact inputs with a correlation ID, replay them locally, and the problem becomes ordinary. In parallel, enumerate the differences between environments — versions, env vars, timezone, filesystem case sensitivity, data shape, concurrency — and eliminate them one at a time.",
        answer: [
          { t: "p", text: "\"Make it reproducible\" as the primary move, rather than a list of production tooling, is the answer that holds up — everything else is a way of getting there." },
          { t: "p", text: "`py-spy dump --pid` is the concrete tool for a hung process, and the point that it works without stopping or instrumenting the target is what makes it usable in production." },
          { t: "p", text: "The procedural point lands hardest: capture state before restarting. A restart clears the backlog and destroys the evidence, which is why some bugs survive for months while every occurrence resets the investigation." }
        ]
      },
      {
        level: "core",
        q: "How do you find which commit introduced a regression?",
        strong: "`git bisect`, and ideally `git bisect run` with a command that exits non-zero on the bug — it searches unattended and finds the commit in roughly log₂(n) builds, so hundreds of commits take about a dozen.",
        answer: [
          { t: "p", text: "The general principle is what to emphasise: bisection beats reasoning whenever the search space is large, and it applies to input data and to the call chain as much as to history." },
          { t: "p", text: "The prerequisite is worth stating — a reliable, fast check for the bug. Building that first is what makes the automated bisect possible, and it becomes the regression test afterwards." },
          { t: "p", text: "The practical caveat shows experience: commits that do not build make the search noisy, and `git bisect skip` exists for exactly that." }
        ]
      }
    ]
  }
});

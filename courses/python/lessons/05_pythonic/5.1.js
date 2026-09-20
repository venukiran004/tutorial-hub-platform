/* ============================================================================
   LESSON 5.1 — What "Pythonic" Actually Means
   ========================================================================= */
EC.receiveLesson({
  id: "5.1",

  lede: "\"Pythonic\" is used in code review as though it meant \"the way I would have written it\", which makes it useless as feedback. It has a sharper meaning than that. **Pythonic code uses the mechanism the language already provides for the thing you are doing, and puts the cost where the reader expects it.** That definition is testable, which means you can defend it in review and be argued out of it when you are wrong.",

  objectives: [
    "State a definition of Pythonic that survives being challenged in code review",
    "Apply four concrete tests to a snippet and say which one a change satisfies",
    "Distinguish idiomatic code from merely short code, with the failure mode of each",
    "Diagnose the two ways the word is misused: cleverness, and cargo-culted idiom",
    "Decide when the unpythonic version is the correct one to ship"
  ],

  prerequisites: ["2.11", "3.9"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The word is doing two jobs", id: "two-jobs" },

    { t: "p", text: "When an engineer says \"this isn't very Pythonic\", they usually mean one of two very different things, and the review stalls because nobody separates them." },

    { t: "dl", items: [
      ["The useful meaning", "You have re-implemented something the language provides — manual index bookkeeping instead of iteration, a `try`-free resource open instead of `with`, a hand-rolled counter instead of `Counter`. The code works, and a Python reader has to decode it before they can review it."],
      ["The useless meaning", "It does not look like the code I write. This is taste dressed as principle, and it produces the review comments that make people dread review."]
    ]},

    { t: "p", text: "Only the first is worth arguing about, because only the first predicts something: that a future reader will misread the code, or that a future change will break it. A definition of Pythonic that cannot predict a cost is a preference." },

    { t: "callout", kind: "mental", title: "The working definition", body: [
      { t: "p", text: "**Pythonic code expresses intent using the protocol the language already has for that intent, and makes the surprising part the visible part.**" },
      { t: "p", text: "Two halves, and both matter. The first half is why `for item in items` beats `while i < len(items)`: iteration is a protocol (Lesson 5.6), and using it means the reader does not have to verify your index arithmetic. The second half is why a clever one-line comprehension can be *less* Pythonic than a loop: it hides the surprising step among four unsurprising ones." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Four tests you can apply in review", id: "four-tests",
      sub: "Each one names a cost. If a change does not satisfy one of them, it is a preference." },

    {"kind": "compare", "title": "Four tests you can apply in review", "caption": "'Pythonic' is a judgement, but each of these is a yes/no question a reviewer can ask of a line of code.", "columns": [{"title": "Does it use the protocol?", "tone": "accent", "items": ["for x in xs, not indices", "with, not try/finally", "len(), not .size()"]}, {"title": "Is the intent on the line?", "tone": "good", "items": ["names say why", "no clever one-liners", "errors say what failed"]}, {"title": "Does the stdlib do it?", "tone": "warn", "items": ["Counter, not a dict loop", "pathlib, not os.path", "enumerate, not range(len)"]}, {"title": "Would a stranger predict it?", "tone": "violet", "items": ["no hidden mutation", "no surprising defaults", "EAFP where it is safe"]}], "t": "diagram", "id": "dg-5_1-02-0"},


    { t: "viz",
      title: "The review gate",
      caption: "Four questions, asked in this order. The first two are about the reader; the third is about the person debugging at 3am; the fourth is about the person changing the code next year. A review comment that satisfies none of them is taste, and should be marked as such.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram: four sequential tests for whether code is Pythonic, each naming the cost it prevents">
  <defs>
    <marker id="p1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="22" class="s-sub" style="font-weight:700;letter-spacing:.08em">A SNIPPET ARRIVES IN REVIEW</text>

  <rect x="20" y="38" width="196" height="66" rx="9" class="s-fill s-stroke" stroke-width="1"/>
  <text x="118" y="60" text-anchor="middle" class="s-label">1 · Protocol</text>
  <text x="118" y="78" text-anchor="middle" class="s-sub">Does the language already</text>
  <text x="118" y="92" text-anchor="middle" class="s-sub">have a mechanism for this?</text>

  <line x1="216" y1="71" x2="248" y2="71" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#p1)"/>

  <rect x="252" y="38" width="196" height="66" rx="9" class="s-fill s-stroke" stroke-width="1"/>
  <text x="350" y="60" text-anchor="middle" class="s-label">2 · Once</text>
  <text x="350" y="78" text-anchor="middle" class="s-sub">Is each fact stated once,</text>
  <text x="350" y="92" text-anchor="middle" class="s-sub">in one place?</text>

  <line x1="448" y1="71" x2="480" y2="71" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#p1)"/>

  <rect x="484" y="38" width="196" height="66" rx="9" class="s-fill s-stroke" stroke-width="1"/>
  <text x="582" y="60" text-anchor="middle" class="s-label">3 · Failure</text>
  <text x="582" y="78" text-anchor="middle" class="s-sub">Can a reader predict how</text>
  <text x="582" y="92" text-anchor="middle" class="s-sub">this breaks, and see it break?</text>

  <line x1="680" y1="71" x2="712" y2="71" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#p1)"/>

  <rect x="716" y="38" width="164" height="66" rx="9" class="s-fill s-stroke" stroke-width="1"/>
  <text x="798" y="60" text-anchor="middle" class="s-label">4 · Change</text>
  <text x="798" y="78" text-anchor="middle" class="s-sub">What does the next</text>
  <text x="798" y="92" text-anchor="middle" class="s-sub">requirement cost?</text>

  <line x1="20" y1="126" x2="880" y2="126" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="150" class="s-sub" style="font-weight:700;letter-spacing:.08em">THE COST EACH TEST PREVENTS</text>

  <rect x="20" y="164" width="196" height="50" rx="7" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="118" y="184" text-anchor="middle" class="s-sub">Reader verifies your</text>
  <text x="118" y="198" text-anchor="middle" class="s-sub">arithmetic, not your logic</text>

  <rect x="252" y="164" width="196" height="50" rx="7" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="350" y="184" text-anchor="middle" class="s-sub">Two copies drift apart;</text>
  <text x="350" y="198" text-anchor="middle" class="s-sub">one gets fixed</text>

  <rect x="484" y="164" width="196" height="50" rx="7" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="582" y="184" text-anchor="middle" class="s-sub">Silent wrong answers</text>
  <text x="582" y="198" text-anchor="middle" class="s-sub">instead of a traceback</text>

  <rect x="716" y="164" width="164" height="50" rx="7" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
  <text x="798" y="184" text-anchor="middle" class="s-sub">Rewrite instead of</text>
  <text x="798" y="198" text-anchor="middle" class="s-sub">an added line</text>

  <rect x="20" y="238" width="860" height="46" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="40" y="258" class="s-label">No test satisfied?</text>
  <text x="160" y="258" class="s-sub">Then the comment is taste. Say so, prefix it with nit, and do not block the pull request on it.</text>
  <text x="40" y="276" class="s-sub" style="fill:var(--ink-2)">Reviews get faster when preference and prediction are labelled differently, because only one of them is worth a round trip.</text>
</svg>`
    },

    { t: "h3", text: "Test 1 — is there already a protocol for this?" },

    { t: "p", text: "Python has a small number of protocols that carry most of the language's expressiveness: iteration, containment, context management, truthiness, comparison, and calling. Re-implementing one by hand is the single most reliable signal that code will be misread." },

    { t: "code", lang: "python", title: "the same job, four times", code: `
lines = ["ok", "ok", "error: disk full", "ok"]

# hand-rolled: the reader must check the bounds and the increment
i = 0
found = -1
while i < len(lines):
    if lines[i].startswith("error"):
        found = i
        break
    i = i + 1

# protocol: enumerate is the mechanism for "index and value"
found = -1
for index, line in enumerate(lines):
    if line.startswith("error"):
        found = index
        break

# protocol, and the intent is now the first thing on the line
found = next(
    (i for i, line in enumerate(lines) if line.startswith("error")),
    -1,
)
`,
      caption: "All three are correct. The first asks the reader to verify three things that cannot be wrong in the other two: the initial value of `i`, the bound, and the increment. That is the cost the protocol removes — not keystrokes."
    },

    { t: "h3", text: "Test 2 — is each fact stated once?" },

    { t: "code", lang: "python", title: "a fact stated twice drifts", code: `
# The retry budget appears twice. A change to one is a silent behaviour change.
def fetch(url: str) -> bytes:
    for attempt in range(3):
        try:
            return http_get(url)
        except TimeoutError:
            if attempt == 2:       # <- the same 3, spelled differently
                raise
    raise AssertionError("unreachable")


# Stated once, and named.
MAX_ATTEMPTS = 3

def fetch(url: str) -> bytes:
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            return http_get(url)
        except TimeoutError:
            if attempt == MAX_ATTEMPTS:
                raise
    raise AssertionError("unreachable")
`,
      hl: [7],
      caption: "The bug this prevents is specific: someone raises the budget to 5, changes `range(3)` to `range(5)`, misses the `== 2`, and the function now swallows two timeouts and returns `None`. Stating the fact once makes that edit impossible rather than merely unlikely."
    },

    { t: "h3", text: "Test 3 — can a reader predict the failure?" },

    { t: "p", text: "This is the test people skip, and it is the one that decides whether an incident lasts ten minutes or four hours. Idiomatic Python is not just readable when it works — it fails in a way that names the problem." },

    { t: "code", lang: "python", title: "two ways to read a required setting", code: `
import os

# Fails silently: a missing DATABASE_URL becomes None, and the failure
# surfaces 200 lines later as a confusing error inside the DB driver.
db_url = os.environ.get("DATABASE_URL")

# Fails at the point of the mistake, naming the missing thing.
db_url = os.environ["DATABASE_URL"]
`,
      out: `KeyError: 'DATABASE_URL'`,
      caption: "`.get()` is the right call when the value is genuinely optional and you have a default. Used on a required setting it converts a startup failure with a precise message into a runtime failure with a vague one. Which of the two you want is a design decision, and the idiom you pick states it."
    },

    { t: "h3", text: "Test 4 — what does the next requirement cost?" },

    { t: "p", text: "The most expensive unpythonic code is not hard to read. It is code where adding one obvious feature requires touching six places, because the structure encodes today's requirement rather than the shape of the problem." },

    { t: "callout", kind: "insight", title: "Where these four tests pay for themselves", body: [
      { t: "ul", items: [
        "**Review throughput.** Separating prediction from preference removes most of the back-and-forth. A comment that names a cost gets fixed; a comment that says \"I'd do it differently\" gets argued.",
        "**Onboarding.** A new engineer can read protocol-based code with the knowledge they already have. Hand-rolled equivalents require reading your codebase's private conventions first.",
        "**Incident duration.** Test 3 is the one that shows up in a post-mortem. Code that fails loudly at the point of the mistake is the difference between reading one traceback and bisecting a data pipeline.",
        "**Static analysis.** Idiomatic code is what linters and type checkers are written to understand. `ruff` has rules for most of the patterns in this module, so the review comment can become a CI check (Lesson 14.4)."
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Pythonic is not short", id: "not-short",
      sub: "The most common misuse of the word, and the most damaging." },

    { t: "p", text: "Terseness correlates with idiom often enough that people conflate them. They are different axes, and past a point they oppose each other: every additional clause in a comprehension removes a place where a debugger can stop and a name can be inspected." },

    { t: "ladder",
      title: "Aggregating failed orders by region",
      rungs: [
        { level: "bad", label: "Manual accumulation", why: "re-implements two protocols",
          code: `def failures_by_region(orders):
    result = {}
    i = 0
    while i < len(orders):
        o = orders[i]
        if o["status"] == "failed":
            r = o["region"]
            if r not in result:
                result[r] = []
            result[r].append(o["id"])
        i = i + 1
    return result`,
          note: "Fails test 1 twice: the index loop re-implements iteration, and the `if r not in result` dance re-implements `defaultdict` (Lesson 5.9). Nine of the twelve lines are bookkeeping, and the reader must check all nine before they can see what the function computes." },
        { level: "ok", label: "One expression", why: "idiomatic parts, unreadable whole",
          code: `def failures_by_region(orders):
    return {
        r: [o["id"] for o in orders
            if o["status"] == "failed" and o["region"] == r]
        for r in {o["region"] for o in orders
                  if o["status"] == "failed"}
    }`,
          note: "Every construct here is idiomatic in isolation, and the result is worse than the loop. It scans `orders` once per region, so it is quadratic; there is nowhere to put a breakpoint; and the filter condition is written twice, which fails test 2. This is the version that gets called Pythonic in review and should not be." },
        { level: "best", label: "Named stages", why: "one pass, one place to stand",
          code: `from collections import defaultdict


def failures_by_region(orders: list[dict]) -> dict[str, list[str]]:
    """Map each region to the ids of its failed orders."""
    by_region: dict[str, list[str]] = defaultdict(list)
    for order in orders:
        if order["status"] != "failed":
            continue
        by_region[order["region"]].append(order["id"])
    return dict(by_region)`,
          note: "A loop, deliberately. It is one pass, the filter appears once, and `continue` puts the uninteresting case out of the way so the remaining line is the whole point. Returning `dict(by_region)` rather than the `defaultdict` matters: callers get a container that raises on a missing region instead of silently inventing one — test 3." }
      ]
    },

    { t: "callout", kind: "trap", title: "The comprehension that should have stayed a loop", body: [
      { t: "p", text: "A comprehension is the right tool when it is a **map, a filter, or both, over one iterable**. The moment it grows a second `for`, a conditional expression in the value position, or a call with side effects, it has stopped being a description of a transformation and become a program with no line numbers." },
      { t: "code", lang: "python", title: "why the debugger matters", numbered: false, code: `
# You cannot step through this. You cannot print an intermediate. A
# stack trace from inside it points at one line, and that line is 90
# characters wide.
totals = {
    k: sum(x["amt"] for x in g if x.get("amt") is not None)
    for k, g in groupby(sorted(rows, key=key), key=key)
    if k not in EXCLUDED
}`},
      { t: "p", text: "The concrete failure is the one in the scenario at the end of this lesson: a filter is subtly wrong, the output is plausible rather than empty, and nobody can bisect the expression because there are no intermediate values to inspect. **Breaking it into three named generator stages costs four lines and makes every stage independently printable and testable** (Lesson 5.7)." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "The Zen of Python, read critically", id: "zen" },

    { t: "p", text: "`import this` prints nineteen aphorisms by Tim Peters. It is half joke, and the half that is not is genuinely load-bearing — but only if you notice that several of the lines contradict each other on purpose." },

    { t: "table",
      head: ["Aphorism", "What it decides in practice"],
      rows: [
        ["Explicit is better than implicit", "Pass dependencies in rather than reaching for module globals. Name the encoding when you open a file. Do not rely on a truthiness coincidence when you mean `is None`."],
        ["Errors should never pass silently / unless explicitly silenced", "`except Exception: pass` is banned; `contextlib.suppress(FileNotFoundError)` is fine. The difference is that the second one names what it is ignoring."],
        ["Simple is better than complex / complex is better than complicated", "Two rungs, not one. Prefer simple; when the problem is genuinely complex, structure the complexity rather than tangling it. This is the pair that licenses the middle ground."],
        ["There should be one obvious way to do it", "The most-quoted line and the least true. There are four ways to merge dicts and three to format a string. Read it as a design *aspiration* for the language, not a claim about it."],
        ["Practicality beats purity", "The escape hatch. It is what lets you keep the ugly `if` for the legacy payload shape, with a comment, instead of building an abstraction for one caller."],
        ["Readability counts", "The only line that survives every argument, and the one the other eighteen are trying to operationalise."]
      ],
      caption: "\"Special cases aren't special enough to break the rules. Although practicality beats purity.\" is a single thought split across two lines, and reading only the first half is how style guides become cargo cult."
    },

    { t: "callout", kind: "tradeoff", title: "When the unpythonic version is the right one to ship", body: [
      { t: "p", text: "There are cases where the idiomatic form is the wrong choice, and being able to name them is what separates judgement from rule-following." },
      { t: "ul", items: [
        "**A measured hot loop.** In a profiled inner loop, hoisting an attribute lookup into a local or replacing a comprehension with a preallocated list can be a real win. Ship it with the measurement in a comment, and only after Lesson 10.2's profiling step.",
        "**A boundary you do not own.** Parsing a legacy fixed-width feed with explicit slice offsets reads badly and matches the specification line for line. An elegant abstraction over a specification you cannot change is a liability.",
        "**Consistency inside a module.** A codebase that uses one older idiom everywhere is easier to work in than one where every file reflects the fashion of the year it was written. Change the whole module or none of it (Lesson 5.2).",
        "**Teaching or debugging code.** An expanded loop with an intermediate variable per step is the right shape for something you are about to explain or bisect."
      ]},
      { t: "p", text: "What all four have in common: the reason is written down. **Unidiomatic code with a comment giving the reason is fine. Unidiomatic code without one is an accident until proven otherwise.**" }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Idiom as a shared vocabulary", id: "vocabulary" },

    { t: "p", text: "The deeper reason idiom matters is compression. When you write `with open(path) as f:`, a Python reader spends no attention on it — they know the file closes on every exit path, including the exception path, without reading further. That is one unit of attention freed for the part of the function that is actually specific to your problem." },

    { t: "code", lang: "python", title: "attention budget, made concrete", code: `
from pathlib import Path

# Six lines, and every one of them needs reading.
def load_settings_manual(path):
    f = None
    try:
        f = open(path)
        data = f.read()
    finally:
        if f is not None:
            f.close()
    return parse(data)


# One line the reader skips, one line that is the point.
def load_settings(path: Path) -> dict:
    return parse(path.read_text(encoding="utf-8"))
`,
      caption: "The second version is not better because it is shorter. It is better because a reviewer reading it spends their attention on `parse` and on the encoding choice, which are the two things in this function that could be wrong."
    },

    { t: "callout", kind: "good", title: "How to write the review comment", body: [
      { t: "p", text: "Name the test, name the cost, and offer the mechanism. Three clauses, one sentence." },
      { t: "ul", items: [
        "**Weak:** \"This isn't very Pythonic.\" No prediction, no action, and it reads as a judgement of the author.",
        "**Strong:** \"This re-implements `enumerate`, so a reviewer has to verify the index arithmetic before they can review the logic — test 1.\"",
        "**Strong:** \"The retry count appears twice, so raising it in one place is a silent behaviour change — test 2.\"",
        "**Honest:** \"nit, taste only: I'd name this `charge` rather than `do_charge`. Not blocking.\""
      ]},
      { t: "p", text: "The last one matters as much as the others. Explicitly marking a comment as preference is what makes your non-preference comments carry weight." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Review a snippet with the four tests",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Below is a function from a real shape of codebase: it works, it has passed review before, and it fails three of the four tests. Rewrite it — but the deliverable is not the rewrite." },
        { t: "p", text: "The deliverable is a review of your own rewrite in which **every change is attributed to one of the four tests**, and in which you identify at least one change you were tempted to make and deliberately did not." }
      ],
      requirements: [
        "Rewrite `summarise_deploys` so that it passes tests 1, 2 and 3.",
        "For each change, write one line naming which test motivated it and what cost it removes.",
        "Identify at least one change that satisfies no test, and say why you left it alone.",
        "Do not turn the body into a single expression. If your rewrite has no place to put a breakpoint, it has failed test 3.",
        "Keep the function's observable behaviour identical for valid input, and say explicitly where you changed the behaviour for invalid input — because you should."
      ],
      hint: "Three protocols are being re-implemented: iteration with an index, grouped accumulation, and \"first match wins\". One fact is stated twice. One failure mode is silent — ask what happens today when a record has no `duration_s` key.",
      solution: {
        lang: "python",
        title: "summarise_deploys.py",
        code: `"""Before and after, with the review attached."""

from collections import defaultdict
from statistics import median

# ---- before -------------------------------------------------------------

def summarise_deploys_v0(records):
    out = {}
    i = 0
    while i < len(records):
        r = records[i]
        if r["status"] == "success" or r["status"] == "succeeded":
            svc = r["service"]
            if svc not in out:
                out[svc] = {"count": 0, "durations": []}
            out[svc]["count"] = out[svc]["count"] + 1
            d = r.get("duration_s")
            if d != None:
                out[svc]["durations"].append(d)
        i = i + 1
    for svc in out:
        ds = out[svc]["durations"]
        if len(ds) > 0:
            out[svc]["median_s"] = sorted(ds)[len(ds) // 2]
        else:
            out[svc]["median_s"] = 0
    return out


# ---- after --------------------------------------------------------------

SUCCESS_STATUSES = frozenset({"success", "succeeded"})


def summarise_deploys(records: list[dict]) -> dict[str, dict]:
    """Count successful deploys per service and take the median duration.

    Records missing a duration are counted but excluded from the median,
    which is why count and the sample size are reported separately.
    """
    durations: dict[str, list[float]] = defaultdict(list)
    counts: dict[str, int] = defaultdict(int)

    for record in records:
        if record["status"] not in SUCCESS_STATUSES:
            continue
        service = record["service"]
        counts[service] += 1
        duration = record.get("duration_s")
        if duration is not None:
            durations[service].append(duration)

    return {
        service: {
            "count": count,
            "sampled": len(durations[service]),
            "median_s": median(durations[service]) if durations[service] else None,
        }
        for service, count in counts.items()
    }


# ---- the review ---------------------------------------------------------
#
# TEST 1  while + index -> for record in records
#         Removes three things a reviewer had to verify (start, bound,
#         increment) that cannot be wrong in the protocol version.
#
# TEST 1  "if svc not in out" -> defaultdict
#         Grouped accumulation is a solved problem. Four lines of the
#         original were the solution being restated.
#
# TEST 1  sorted(ds)[len(ds) // 2] -> statistics.median
#         The original is not the median: for an even-length sample it
#         returns the upper of the two middle values rather than their
#         mean. This was a real bug hidden inside a hand-rolled protocol.
#
# TEST 2  two status strings compared inline -> SUCCESS_STATUSES
#         Adding a third accepted status was previously two edits in one
#         expression. Now it is one edit in one place, and the set is
#         importable by the tests.
#
# TEST 3  "median_s": 0 -> None
#         BEHAVIOUR CHANGE, deliberate. Zero is a plausible duration, so
#         "no samples" and "instant deploy" were indistinguishable in a
#         dashboard. None cannot be mistaken for a measurement, and the
#         new "sampled" key makes the sample size explicit.
#
# TEST 3  d != None -> duration is not None
#         != dispatches to __eq__, which a numeric wrapper type may
#         override to return a non-bool (Lesson 1.4). Identity cannot be
#         intercepted.
#
# NO TEST record["status"] left as a bracket lookup, not .get("status").
#         A record with no status is a corrupt record, and KeyError at
#         the point of the corruption is the behaviour I want. Switching
#         to .get() would satisfy nobody and lose the loud failure.
#
# NO TEST Left as a dict-of-dicts rather than a dataclass. A dataclass
#         would be nicer to read at the call site, but this value is
#         serialised straight to JSON by the only caller, so the change
#         buys a conversion step and no safety. Taste, not a cost.`,
        notes: [
          { t: "p", text: "**The median bug is the point of the exercise.** It was not introduced by the refactor and it was not visible in review — it was hidden inside four characters of hand-rolled protocol. This is the strongest practical argument for test 1: when you re-implement something the standard library provides, you also re-implement its edge cases, and you do it without tests." },
          { t: "p", text: "**The `median_s: 0` change is flagged loudly and separately.** A rewrite that quietly alters behaviour is the worst kind of refactor, because the diff looks like cleanup and the incident looks unrelated (Lesson 5.12). Writing the behaviour change in the review comment is what makes it reviewable." },
          { t: "p", text: "**The two NO TEST entries carry as much weight as the six changes.** They are evidence that the four tests are being used as a filter rather than as a licence — which is exactly the discipline that makes \"this is not Pythonic\" a comment people act on instead of resent." },
          { t: "callout", kind: "insight", title: "Why counts and durations are separate dicts", body: [
            { t: "p", text: "Keeping two `defaultdict`s rather than one dict of nested dicts means neither container can be half-populated. A single nested structure invites the bug where one branch appends a duration for a service that was never counted, and the two numbers disagree with no obvious cause." },
            { t: "p", text: "The final dict comprehension is a comprehension precisely because it is a pure map over one iterable with no filter and no side effects — which is the shape a comprehension is for. That is test 1 applied in the other direction." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "An analytics team replaces a 30-line ETL loop with a single nested dict comprehension during a \"make it more Pythonic\" cleanup sprint. Tests pass, the numbers on the dashboard look normal, and the pull request is approved in eleven minutes." },
      { t: "p", text: "Six weeks later finance reports that regional revenue does not reconcile with the general ledger, by about three per cent. The comprehension filters on `row.get(\"status\") != \"void\"` — and voided rows in one upstream feed use the status `\"VOIDED\"`. Three per cent of rows were being counted that should not have been." },
      { t: "p", text: "**Why it took four hours to find.** The expression has no intermediate values. You cannot set a breakpoint inside a comprehension, you cannot print the row count after the filter, and the only way to test the filter in isolation is to retype it in a REPL — which is what the engineer eventually did. The old loop had a `continue` on its own line, and one `print` would have shown the count." },
      { t: "p", text: "**The fix was not to revert.** It was to break the expression into three named generator stages, each of which is one line and independently testable, then add a test asserting that the set of statuses seen in a day's data is a subset of the known statuses — so the *next* new spelling fails loudly instead of quietly changing a total." },
      { t: "p", text: "The general lesson: the cleanup satisfied nobody's test. It was shorter, which was mistaken for more idiomatic, and it removed exactly the debuggability that test 3 exists to protect. **Compression that removes the places you can stand is not idiom, it is risk.**" }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**Pythonic means using the protocol the language already has for the thing you are doing, and making the surprising part visible.** Anything that predicts no cost is preference, and should be labelled as such.",
    "Test 1 — is there already a protocol? Hand-rolled iteration, accumulation or resource handling makes a reviewer verify your bookkeeping before they can review your logic.",
    "Test 2 — is each fact stated once? A number written twice is an edit waiting to become a silent behaviour change.",
    "Test 3 — can a reader predict the failure? `os.environ[\"KEY\"]` fails at the mistake; `.get()` fails 200 lines later. Both are correct; only one states that the setting is required.",
    "Test 4 — what does the next requirement cost? Structure that encodes today's requirement makes tomorrow's one-line feature a rewrite.",
    "**Terse and idiomatic are different axes.** Past two clauses, a comprehension removes every place a debugger can stop and every intermediate you could print.",
    "A comprehension is right for a map, a filter, or both, over one iterable. A second `for` or a side effect means it should have been a loop or a generator pipeline.",
    "Re-implementing a standard-library function re-implements its edge cases too, untested — which is how `sorted(xs)[len(xs) // 2]` ships as \"the median\" and is wrong for even-length input.",
    "The Zen of Python contains deliberate contradictions. \"Practicality beats purity\" is the licence to keep the ugly special case, with a comment.",
    "**Unidiomatic code with a written reason is a decision. Without one it is an accident.** Measured hot loops, specifications you do not own, and module-wide consistency are all real reasons.",
    "Write review comments as: which test, what cost, which mechanism. Mark taste as taste, so that your other comments carry weight."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A colleague replaces a 12-line loop with the expression below and describes it in the pull request as \"more Pythonic\". What is the strongest objection?",
        lang: "python",
        code: `totals = {
    r: sum(o["amt"] for o in orders if o["region"] == r and o["ok"])
    for r in {o["region"] for o in orders if o["ok"]}
}`,
        options: [
          "Comprehensions are less readable than loops, so a loop is always preferable",
          "It scans `orders` once per region and repeats the filter condition, and there is nowhere to inspect an intermediate value",
          "Dict comprehensions cannot be used with `sum`, so this will raise a `TypeError`",
          "It should use `map` and `filter` instead, which are the functional idioms"
        ],
        answer: 1,
        why: "The objection is three concrete costs, not a general preference: quadratic scanning, the `o[\"ok\"]` filter stated twice so a change to one is a silent behaviour change, and no place to put a breakpoint or print a row count. Option A is the taste answer — comprehensions are the right tool for a map or filter over one iterable. Option C is false; the code runs. Option D swaps one style for another without naming a cost, and `map`/`filter` would be no more debuggable."
      },
      {
        stem: "Which change is justified by test 3 (can a reader predict the failure)?",
        options: [
          "Replacing `while i < len(items)` with `for item in items`",
          "Extracting the literal `3` from two places into a named constant",
          "Replacing `os.environ.get(\"DATABASE_URL\")` with `os.environ[\"DATABASE_URL\"]` for a required setting",
          "Renaming `do_process_data` to `process_orders`"
        ],
        answer: 2,
        why: "Test 3 is about whether the failure is visible at the point of the mistake. A missing required setting read with `.get()` becomes `None` and surfaces later as a confusing error inside a driver; the bracket form raises `KeyError` naming the variable at startup. Option A is test 1 (a re-implemented protocol), option B is test 2 (a fact stated twice), and option D satisfies no test at all — it is a naming preference, and should be marked as one."
      },
      {
        stem: "\"Errors should never pass silently. Unless explicitly silenced.\" Which pair of lines is consistent with both halves?",
        options: [
          "`try: os.remove(p)` / `except Exception: pass`",
          "`with contextlib.suppress(FileNotFoundError): os.remove(p)`",
          "`if os.path.exists(p): os.remove(p)`",
          "`try: os.remove(p)` / `except: logging.debug(\"oops\")`"
        ],
        answer: 1,
        why: "`suppress(FileNotFoundError)` names exactly which error is being ignored, which is what \"explicitly silenced\" means. Option A silences every exception including `MemoryError` and `KeyboardInterrupt`, so a real failure disappears. Option C is a check-then-act race: the file can vanish between the check and the call (Lesson 5.3). Option D uses a bare `except`, logs at a level nobody reads, and gives no indication of which error occurred."
      },
      {
        stem: "In a profiled hot loop you hoist `append = out.append` into a local variable to avoid repeated attribute lookup. Is this Pythonic?",
        options: [
          "No — attribute lookups are the idiomatic form, so the change should be rejected in review",
          "Yes, unconditionally — faster code is better code",
          "It is a defensible unidiomatic choice, provided the measurement and the reason are written next to it",
          "Only if the codebase has no linter, since linters forbid this pattern"
        ],
        answer: 2,
        why: "\"Practicality beats purity\" is a real clause, but it is a licence that comes with a burden of proof. The hoist obscures intent for a reader, so it needs the profile result in a comment saying what it bought and where — otherwise the next reader cannot tell a measured optimisation from a habit. Option A rules out a legitimate case; option B ignores that most such hoists are unmeasured and buy nothing; option D confuses tooling with judgement."
      }
    ]
  },

  /* ==================================================================== */
  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does \"Pythonic\" mean to you?",
        strong: "Code that uses the protocol the language already provides for what it is doing, and that makes the surprising part the visible part. I apply it as a set of tests that each name a cost: is there already a mechanism for this, is each fact stated once, can a reader predict how this fails, and what does the next requirement cost. If a change satisfies none of those, it is taste and I say so.",
        answer: [
          { t: "p", text: "The failure mode of this question is answering with a list of idioms — enumerate, comprehensions, `with`, f-strings. That shows familiarity, not judgement, and it invites the follow-up \"when would you not do that?\", which is the question they actually wanted to ask." },
          { t: "p", text: "Leading with a definition that predicts a cost is what separates a senior answer. Then give one example where the idiom is right and one where it is not — a measured hot loop, or a fixed-width legacy format where explicit offsets match the specification line for line." },
          { t: "p", text: "Mentioning that you label preference as preference in review lands well with anyone who has managed a team. It signals that you use the word to make reviews faster rather than to win them." }
        ],
        weak: "Reciting the Zen of Python, or equating Pythonic with short. The second one is worth pre-empting: terse and idiomatic are different axes, and past two clauses a comprehension removes every place you can put a breakpoint."
      },
      {
        level: "core",
        q: "A colleague rewrites a working loop as a nested comprehension and calls it more Pythonic. How do you respond in review?",
        strong: "I would ask which cost it removes. If the answer is only length, I would push back with three specifics: it scans the input more than once, it repeats the filter condition so a future edit to one copy is a silent behaviour change, and there is no longer anywhere to inspect an intermediate value when the numbers come out wrong. Then I would offer the middle path — named generator stages, which keeps one pass and keeps every stage printable.",
        answer: [
          { t: "p", text: "The interviewer is watching whether you can disagree without making it about taste. Naming three costs converts an argument into a checklist, and offering a third option that is neither the loop nor the one-liner shows you are trying to land the change rather than win the point." },
          { t: "p", text: "The debuggability argument is the one that persuades people who are not persuaded by readability arguments, because it is falsifiable: ask them to show you where they would put a breakpoint to find a wrong total." },
          { t: "p", text: "It is also worth conceding the case where they are right. If the expression is a pure map over one iterable with no filter, the comprehension genuinely is the better shape, and saying so first makes the rest of the review credible." }
        ]
      },
      {
        level: "advanced",
        q: "Give an example of code you deliberately wrote unidiomatically, and how you justified it.",
        strong: "A profiled hot loop where I hoisted a bound method into a local and preallocated the output list, with the before-and-after timings in a comment above it. Or a parser for a fixed-width legacy feed written as explicit slice offsets, because the offsets map one-to-one onto the vendor specification and an elegant abstraction over a document I cannot change is a liability.",
        answer: [
          { t: "p", text: "This question exists to find out whether your idiom knowledge is a rule set or a model. Anyone who has only ever followed the rules will struggle to produce an example, and that is the signal." },
          { t: "p", text: "The strongest answers all share one feature: the reason was written down next to the code. State that explicitly — unidiomatic code with a recorded reason is a decision, and without one it is indistinguishable from an accident, which is why the next engineer \"cleans it up\" and reintroduces the problem." },
          { t: "p", text: "A second good example is module-wide consistency: choosing to match an older convention in a file rather than leave a codebase where every function reflects the fashion of the year it was written. It shows you optimise for the reader of the whole module, not the diff." }
        ],
        weak: "Claiming you always write idiomatic Python. It reads as inexperience with performance work and with codebases older than the engineer."
      },
      {
        level: "advanced",
        q: "How would you get a team to agree on what Pythonic means, rather than arguing about it in every pull request?",
        strong: "Move everything mechanical into tooling so it is never discussed — a formatter and a linter in CI, so line length, import order and the common anti-patterns are settled by a machine. Then keep a short written list of the judgement calls that remain, with the cost each one names, and require review comments to cite one or be marked as a nit.",
        answer: [
          { t: "p", text: "This is a leadership question wearing a language question. The insight to lead with is that most style disagreement is not about judgement at all — it is about things a formatter can decide, and every minute spent on them is waste." },
          { t: "p", text: "The second half is the part candidates miss: after tooling, what remains is genuinely a matter of judgement, and judgement needs a shared vocabulary rather than a longer rule book. A one-page list of tests with the cost each prevents is something a team can actually apply and can actually amend." },
          { t: "p", text: "Mentioning the nit convention is a small detail that signals real review experience. Marking taste explicitly is what stops a team from treating every comment as blocking, and it is what makes the non-taste comments get acted on quickly." }
        ]
      }
    ]
  }
});

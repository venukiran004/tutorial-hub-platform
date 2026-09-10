/* ============================================================================
   LESSON 2.6 — Conditionals and Branching
   ========================================================================= */
EC.receiveLesson({
  id: "2.6",

  lede: "`if` is the first thing anyone learns and the last thing anyone learns to write well. The syntax takes two minutes. What takes longer is recognising that **deeply nested conditionals are almost always a structural problem**, not a complexity that the domain forced on you — and knowing the four transformations that flatten them.",

  objectives: [
    "Write conditionals that read in the order a reader thinks",
    "Apply guard clauses to eliminate nesting rather than indenting further",
    "Choose between `if/elif`, a dispatch dict, and polymorphism for multi-way branching",
    "Use conditional expressions where they help and recognise where they hurt",
    "Explain why an `else` on a chain of returns is usually redundant"
  ],

  prerequisites: ["1.7"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The syntax, and the one rule", id: "syntax" },


    { t: "viz",
      title: "How a chain of conditions is evaluated",
      caption: "The first true branch wins and the rest are never evaluated. That short-circuit is why order matters, and why an expensive or unsafe check belongs after a cheap guard.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="An if-elif-else chain evaluated top to bottom, stopping at the first true condition">
  <g style="stroke-width:2">
    <rect x="40" y="30" width="250" height="44" rx="6" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)"/>
    <rect x="40" y="88" width="250" height="44" rx="6" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
    <rect x="40" y="146" width="250" height="44" rx="6" style="fill:var(--ink-3);fill-opacity:.06;stroke:var(--line)"/>
  </g>
  <text x="58" y="58"  class="s-sub" style="fill:var(--ink-2)">if   cheap_guard(x)</text>
  <text x="58" y="116" class="s-sub" style="fill:var(--ink-2)">elif expensive_check(x)</text>
  <text x="58" y="174" class="s-sub" style="fill:var(--ink-3)">else default</text>

  <text x="310" y="58"  class="s-sub" style="fill:var(--crit)">False — fall through</text>
  <text x="310" y="116" class="s-label" style="fill:var(--good)">True — run this, stop</text>
  <text x="310" y="174" class="s-sub" style="fill:var(--ink-3)">never reached</text>

  <line x1="165" y1="76" x2="165" y2="86" style="stroke:var(--ink-3)" stroke-width="1.5"/>
  <line x1="165" y1="134" x2="165" y2="144" style="stroke:var(--line);stroke-dasharray:3 3" stroke-width="1.5"/>

  <text x="560" y="58"  class="s-sub" style="fill:var(--ink-3)">Order is not cosmetic:</text>
  <text x="560" y="84"  class="s-sub" style="fill:var(--ink-3)">put the cheap or safe test</text>
  <text x="560" y="106" class="s-sub" style="fill:var(--ink-3)">first, so the costly one</text>
  <text x="560" y="128" class="s-sub" style="fill:var(--ink-3)">runs only when needed</text>
  <text x="560" y="164" class="s-sub" style="fill:var(--crit)">if x and x.field:</text>
  <text x="560" y="186" class="s-sub" style="fill:var(--ink-3)">the guard prevents the error</text>

  <text x="40" y="224" class="s-sub" style="fill:var(--ink-3)">and / or short-circuit the same way — they return an operand, not a bool</text>
</svg>`
    },
    { t: "code", lang: "python", title: "the full form", code: `
status = 404

if status < 300:
    label = "success"
elif status < 400:
    label = "redirect"
elif status < 500:
    label = "client error"
else:
    label = "server error"

print(label)
`,
      out: `client error`
    },

    { t: "p", text: "`elif` is one keyword, not a nested `else: if:`. That matters because the alternative — genuine nesting — indents every subsequent branch, and indentation is the visual signal Python readers use to gauge complexity." },

    { t: "callout", kind: "insight", title: "Order is part of the logic", body: [
      { t: "p", text: "A chain evaluates top to bottom and stops at the first match, so conditions are not independent — each one implicitly carries *and none of the above matched*." },
      { t: "code", lang: "python", title: "the ordering bug", numbered: false, code: `
# WRONG: the first condition swallows everything below it
if score >= 50:
    grade = "pass"
elif score >= 80:
    grade = "distinction"      # unreachable -- 90 already matched above`,
        hl: [2, 4]},
      { t: "p", text: "Order overlapping conditions from **most specific to least**. When conditions genuinely are independent, that is a signal they should be separate `if` statements rather than a chain." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Guard clauses flatten nesting", id: "guard-clauses" },

    { t: "p", text: "The most common shape in unmaintained Python is the *arrow*: each validation adds a level of indentation, and the actual work ends up six levels deep at the point of the arrowhead." },

    { t: "ladder",
      title: "Processing an order with four preconditions",
      rungs: [
        { level: "bad", label: "The arrow", why: "work is buried at maximum depth",
          code: `def process(order):
    if order is not None:
        if order.is_valid():
            if order.customer.is_active:
                if order.total > 0:
                    charge(order)
                    return "charged"
                else:
                    return "zero total"
            else:
                return "inactive customer"
        else:
            return "invalid order"
    else:
        return "no order"`,
          note: "Reading this requires holding four open conditions in your head to reach the one line that matters. Every error message is far from the check that produced it, and adding a fifth precondition means re-indenting the whole body." },

        { level: "ok", label: "Guard clauses", why: "handle failure first, exit early",
          code: `def process(order):
    if order is None:
        return "no order"
    if not order.is_valid():
        return "invalid order"
    if not order.customer.is_active:
        return "inactive customer"
    if order.total <= 0:
        return "zero total"

    charge(order)
    return "charged"`,
          note: "Same logic, one level of indentation. Each condition sits next to its own outcome, the happy path is at the bottom in plain sight, and adding a fifth check is one more two-line block. This transformation — invert the condition, return early — is the single highest-value refactor in everyday Python." },

        { level: "best", label: "Guards that raise", why: "the caller cannot ignore a failure",
          code: `class OrderRejected(ValueError):
    """An order failed a precondition and was not charged."""


def process(order: Order) -> Receipt:
    if order is None:
        raise OrderRejected("no order supplied")
    if not order.is_valid():
        raise OrderRejected(f"order {order.id} failed validation")
    if not order.customer.is_active:
        raise OrderRejected(f"customer {order.customer.id} is inactive")
    if order.total <= 0:
        raise OrderRejected(f"order {order.id} has a total of {order.total}")

    return charge(order)`,
          note: "The string-returning version has a flaw the shape hides: a caller who ignores the return value gets no signal that nothing happened. Raising makes the failure impossible to miss, gives the return type a single meaning, and lets one handler at the boundary turn any rejection into a response. Lesson 6.3 covers designing these exceptions." }
      ]
    },

    { t: "callout", kind: "good", title: "The `else` after a `return` is redundant", body: [
      { t: "code", lang: "python", title: "two spellings", numbered: false, code: `
# Redundant: the else can only be reached if the if did not return
def classify(n):
    if n < 0:
        return "negative"
    else:
        return "non-negative"


# Flatter, and identical
def classify(n):
    if n < 0:
        return "negative"
    return "non-negative"`},
      { t: "p", text: "When every branch returns, the `else` adds indentation without adding information. Linters flag it (`ruff` rule `RET505`). The same applies after `raise`, `continue` and `break`." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Replacing long chains", id: "dispatch" },

    { t: "p", text: "A chain of `elif` comparing the same variable against constants is a lookup written as control flow. Past three or four branches, a dict usually reads better and is easier to extend." },

    { t: "tabs", items: [
      { label: "if/elif", blocks: [
        { t: "code", lang: "python", title: "fine for a few branches", code: `
def rate_for(plan: str) -> Decimal:
    if plan == "free":
        return Decimal("0")
    elif plan == "pro":
        return Decimal("29")
    elif plan == "team":
        return Decimal("99")
    elif plan == "enterprise":
        return Decimal("499")
    else:
        raise ValueError(f"unknown plan: {plan!r}")
`},
        { t: "p", text: "Perfectly readable at this size. It stops scaling when the list grows, when the same set of plans is branched on in several places, or when the values need to come from configuration." }
      ]},
      { label: "Dispatch dict", blocks: [
        { t: "code", lang: "python", title: "data instead of control flow", code: `
RATES: dict[str, Decimal] = {
    "free": Decimal("0"),
    "pro": Decimal("29"),
    "team": Decimal("99"),
    "enterprise": Decimal("499"),
}


def rate_for(plan: str) -> Decimal:
    try:
        return RATES[plan]
    except KeyError:
        raise ValueError(f"unknown plan: {plan!r}") from None
`},
        { t: "p", text: "The plans are now data: iterable, testable, and loadable from a config file. Adding one is a single line that cannot introduce a control-flow bug. The lookup is also O(1) rather than a linear walk down the chain." }
      ]},
      { label: "Dispatch to functions", blocks: [
        { t: "code", lang: "python", title: "when each branch does work", code: `
from collections.abc import Callable

def handle_created(event: dict) -> None: ...
def handle_updated(event: dict) -> None: ...
def handle_deleted(event: dict) -> None: ...


HANDLERS: dict[str, Callable[[dict], None]] = {
    "created": handle_created,
    "updated": handle_updated,
    "deleted": handle_deleted,
}


def dispatch(event: dict) -> None:
    handler = HANDLERS.get(event["type"])
    if handler is None:
        raise ValueError(f"no handler for {event['type']!r}")
    handler(event)
`},
        { t: "p", text: "Each branch is now a separately testable function with a name, and the mapping is a single readable table. This is the standard shape for event handlers, command routers and plugin systems." }
      ]},
      { label: "Polymorphism", blocks: [
        { t: "code", lang: "python", title: "when the branch belongs to the data", code: `
class Plan:
    rate: Decimal

    def features(self) -> set[str]:
        raise NotImplementedError


class ProPlan(Plan):
    rate = Decimal("29")

    def features(self) -> set[str]:
        return {"api", "support"}


# No branching at all -- the object knows what it is.
def bill(plan: Plan) -> Decimal:
    return plan.rate
`},
        { t: "p", text: "The right answer when the **same** set of branches appears in several places. One `if plan ==` chain is fine; the same chain repeated in billing, permissions and reporting is a class hierarchy waiting to be extracted. Lesson 4.6 covers this properly." }
      ]}
    ]},

    { t: "callout", kind: "tradeoff", title: "When to stop using if/elif", body: [
      { t: "ul", items: [
        "**Fewer than four branches, one place** — keep the `if/elif`. A dict for two cases is indirection without benefit.",
        "**Many branches mapping a value to a value** — dispatch dict. The data becomes inspectable and configurable.",
        "**Many branches each doing work** — dict of functions. Each branch gains a name and a test.",
        "**The same branches repeated across the codebase** — polymorphism. The repetition is the signal; the branching belongs on the type.",
        "**Branching on the *shape* of data rather than a single value** — `match`/`case` (Lesson 5.5)."
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Conditional expressions", id: "ternary" },

    { t: "code", lang: "python", title: "value, condition, alternative", code: `
label = "even" if n % 2 == 0 else "odd"

# The real purpose: an expression can go where a statement cannot.
rows = [format_row(r) if r.valid else BLANK for r in records]
print(f"{count} item{'s' if count != 1 else ''}")
send(timeout=timeout if timeout is not None else DEFAULT_TIMEOUT)
`,
      caption: "Inside a comprehension, an f-string or an argument list, a statement is not allowed — the conditional expression is the only option. That is what it is for, rather than saving a line."
    },

    { t: "callout", kind: "trap", title: "Where the ternary stops helping", body: [
      { t: "code", lang: "python", title: "past two branches", numbered: false, code: `
# Readable
tier = "high" if score > 90 else "low"

# Borderline
tier = "high" if score > 90 else "mid" if score > 50 else "low"

# Unreadable -- and the reader must parse right-to-left
tier = ("a" if s > 90 else "b" if s > 75 else "c" if s > 60 else
        "d" if s > 50 else "f")`},
      { t: "p", text: "Nested conditional expressions associate to the right, so a reader has to work backwards to evaluate them. At three or more branches, use a plain `if/elif` chain — or, for numeric ranges, `bisect` over a table of thresholds, which is both faster and easier to change." },
      { t: "code", lang: "python", title: "the threshold-table version", numbered: false, code: `
from bisect import bisect_right

CUTOFFS = [50, 60, 75, 90]
GRADES = ["f", "d", "c", "b", "a"]

tier = GRADES[bisect_right(CUTOFFS, score)]`}
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Flatten a validation arrow",
      difficulty: "foundation",
      minutes: 25,
      body: [
        { t: "p", text: "The function below decides whether a user may download a file. It is correct, and almost nobody can read it — the permitted case is six levels deep and each rejection reason is far from the check that produced it." },
        { t: "p", text: "Restructure it without changing its behaviour, then extend it with one new rule to demonstrate that the new shape is genuinely easier to change." }
      ],
      requirements: [
        "Rewrite using guard clauses so the body has at most two levels of indentation.",
        "Each rejection must name the specific reason, close to the check that produced it.",
        "Raise a domain exception instead of returning a tuple of `(bool, str)`.",
        "Replace the file-type branching with a dispatch structure rather than a chain.",
        "Then add one new rule — files over 100 MB require a `bulk_download` permission — and note how many lines it took.",
        "Assert that old and new produce the same decision for a table of cases."
      ],
      hint: "Invert each condition and return (or raise) early. For the file types, notice that the chain maps an extension to a required permission — that is a dict.",
      solution: {
        lang: "python",
        title: "download_access.py",
        code: `# ---- the original -----------------------------------------------------

def can_download(user, file):
    if user is not None:
        if user.is_active:
            if not user.is_suspended:
                if file is not None:
                    if file.exists:
                        if file.type == "pdf":
                            if user.has_permission("read_pdf"):
                                return (True, "")
                            else:
                                return (False, "no pdf permission")
                        elif file.type == "csv":
                            if user.has_permission("read_data"):
                                return (True, "")
                            else:
                                return (False, "no data permission")
                        else:
                            return (False, "unsupported type")
                    else:
                        return (False, "file missing")
                else:
                    return (False, "no file")
            else:
                return (False, "suspended")
        else:
            return (False, "inactive")
    else:
        return (False, "no user")


# ---- the rewrite ------------------------------------------------------

from dataclasses import dataclass

MAX_UNRESTRICTED_BYTES = 100 * 1024 * 1024

# The chain was mapping a file type to the permission it requires.
# As data it is one line per type, iterable and testable.
REQUIRED_PERMISSION: dict[str, str] = {
    "pdf": "read_pdf",
    "csv": "read_data",
    "json": "read_data",
}


class DownloadDenied(PermissionError):
    """The download was refused. The message states why."""


def check_download(user, file) -> None:
    """Raise DownloadDenied if the user may not download the file.

    Returns None on success -- there is nothing useful to return, and a
    boolean would let a caller ignore the outcome by accident.
    """
    if user is None:
        raise DownloadDenied("no user supplied")
    if not user.is_active:
        raise DownloadDenied(f"user {user.id} is inactive")
    if user.is_suspended:
        raise DownloadDenied(f"user {user.id} is suspended")

    if file is None:
        raise DownloadDenied("no file supplied")
    if not file.exists:
        raise DownloadDenied(f"file {file.id} does not exist")

    permission = REQUIRED_PERMISSION.get(file.type)
    if permission is None:
        raise DownloadDenied(f"unsupported file type: {file.type!r}")
    if not user.has_permission(permission):
        raise DownloadDenied(f"user {user.id} lacks {permission!r}")

    # THE NEW RULE -- three lines, appended, no re-indentation anywhere.
    if file.size_bytes > MAX_UNRESTRICTED_BYTES:
        if not user.has_permission("bulk_download"):
            raise DownloadDenied(
                f"file is {file.size_bytes / 1e6:.0f} MB and requires "
                f"'bulk_download'"
            )


def can_download(user, file) -> tuple[bool, str]:
    """Adapter kept only so existing callers and the old tests still work."""
    try:
        check_download(user, file)
    except DownloadDenied as exc:
        return (False, str(exc))
    return (True, "")


# ---- equivalence -------------------------------------------------------

@dataclass
class FakeUser:
    id: int = 1
    is_active: bool = True
    is_suspended: bool = False
    permissions: frozenset = frozenset({"read_pdf", "read_data"})

    def has_permission(self, name: str) -> bool:
        return name in self.permissions


@dataclass
class FakeFile:
    id: int = 1
    exists: bool = True
    type: str = "pdf"
    size_bytes: int = 1024


if __name__ == "__main__":
    cases = [
        (None, FakeFile()),
        (FakeUser(is_active=False), FakeFile()),
        (FakeUser(is_suspended=True), FakeFile()),
        (FakeUser(), None),
        (FakeUser(), FakeFile(exists=False)),
        (FakeUser(), FakeFile(type="exe")),
        (FakeUser(permissions=frozenset()), FakeFile()),
        (FakeUser(), FakeFile()),
    ]
    for user, file in cases:
        allowed, reason = can_download(user, file)
        print(f"{allowed!s:>5}  {reason}")`,
        notes: [
          { t: "p", text: "**The new rule took three lines and required no re-indentation.** In the original it would have gone at depth six or seven, inside both file-type branches, duplicated — which is the practical argument for the refactor. Nesting does not merely look bad; it makes every future change more expensive than the last." },
          { t: "p", text: "**The dispatch dict replaced two branches and removed a duplication.** `csv` and `json` both map to `read_data`, which the chain expressed as two separate blocks. As data it is two lines that obviously share a value." },
          { t: "p", text: "**Raising rather than returning `(bool, str)`** gives the function one meaning for its return. A boolean-returning permission check is a well-known hazard: a caller who forgets to check the result proceeds as though access was granted, and nothing in the code says otherwise. An exception cannot be ignored." },
          { t: "callout", kind: "insight", title: "Why the adapter is worth keeping", body: [
            { t: "p", text: "`can_download` remains as a thin wrapper so existing callers and the original tests keep working unchanged. That is what lets you verify the refactor: run the old test suite against the new implementation and confirm identical results, then migrate callers one at a time." },
            { t: "p", text: "Rewriting the interface and the implementation in one step removes the only cheap way of proving you did not change behaviour." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A pricing function has grown to fourteen `elif` branches over two years. A new discount type is added, and a customer segment starts receiving the wrong price — the new branch was inserted above an existing one whose condition it partly overlaps, so the older rule became unreachable." },
      { t: "p", text: "**Why the chain made this likely:** in an `if/elif` chain, every branch implicitly means *and none of the above matched*. Adding a branch changes the meaning of every branch below it, and nothing in the code shows that coupling. The reviewer sees five added lines and cannot tell they altered the behaviour of the other thirteen." },
      { t: "p", text: "**The structural fix:** make the rules data — a list of `(predicate, discount)` entries, or a dispatch dict keyed by segment — so ordering becomes explicit and testable. A test that asserts exactly one rule matches each input catches the overlap directly, which no amount of reading the chain reliably does." },
      { t: "p", text: "The general signal: **when adding a branch requires understanding all the existing ones, the branching has outgrown `if/elif`.**" }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "`elif` is one keyword. A chain stops at the first match, so every condition implicitly carries *and none of the above matched* — order overlapping conditions most specific first.",
    "**Guard clauses are the highest-value refactor in everyday Python:** invert each precondition, return or raise early, and the happy path ends up at one level of indentation.",
    "An `else` after a branch that returns, raises, breaks or continues adds indentation and no information.",
    "A chain of `elif` comparing one variable to constants is a lookup written as control flow. Past three or four branches, use a dict.",
    "**Dispatch to values** when branches map a key to a value; **dispatch to functions** when each branch does work; **polymorphism** when the same branching appears in several places.",
    "A conditional expression exists so a choice can appear where a statement cannot — inside a comprehension, f-string or argument list. Past two branches it becomes right-to-left reading.",
    "For numeric thresholds, `bisect` over a table beats a nested ternary and is easier to change.",
    "**Prefer raising to returning a boolean for permission checks.** A caller can ignore a `False`; they cannot ignore an exception.",
    "When adding one branch requires understanding all the existing ones, the branching has outgrown `if/elif` — turn the rules into data."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is wrong with this chain?",
        lang: "python",
        code: `if score >= 50:
    grade = "pass"
elif score >= 80:
    grade = "distinction"
elif score >= 95:
    grade = "honours"`,
        options: [
          "Nothing — the conditions are checked in order and all are reachable",
          "The last two branches are unreachable: any score of 80 or 95 already matched the first condition",
          "`elif` cannot be used more than once in a chain",
          "The comparisons should use `>` rather than `>=`"
        ],
        answer: 1,
        why: "A chain stops at the first true condition, so `score >= 50` swallows every score that would have matched the later branches. A score of 95 is `\"pass\"`. Overlapping conditions must be ordered most specific first — here, 95, then 80, then 50. When conditions genuinely do not overlap, that is a signal they should be separate `if` statements rather than a chain."
      },
      {
        stem: "Why do guard clauses improve a function with four preconditions?",
        options: [
          "They execute faster because the interpreter skips the remaining checks",
          "They remove nesting: each condition sits next to its own outcome, the happy path is unindented, and adding a fifth check does not re-indent the body",
          "They allow the checks to be evaluated in parallel",
          "They are required by PEP 8 for functions with more than three branches"
        ],
        answer: 1,
        why: "The benefit is structural, not performance — an early `return` skips the rest either way, and so does a nested `if` that fails. What changes is readability and cost of change: the deeply nested version buries the real work at maximum depth, separates each error message from its check, and forces a re-indentation of everything when a precondition is added."
      },
      {
        stem: "When should a chain of `if/elif` comparing one variable against constants become a dict?",
        options: [
          "Always — dicts are faster and dict lookup is O(1)",
          "When the branches are numerous, or the same set of branches appears elsewhere in the codebase, or the values should be configurable",
          "Never — control flow and data should stay separate",
          "Only when there are more than ten branches"
        ],
        answer: 1,
        why: "For two or three branches in one place, a dict is indirection without benefit. It earns its place when the list grows (the mapping becomes inspectable, iterable and configurable), when the same branching is duplicated elsewhere (a signal for polymorphism or a shared table), or when the values belong in configuration rather than code. Speed is a real but usually irrelevant secondary benefit."
      },
      {
        stem: "Why is raising an exception often better than returning `(False, \"reason\")` from a permission check?",
        options: [
          "Exceptions are faster than constructing a tuple",
          "A caller can silently ignore a returned `False` and proceed as though access was granted; an exception cannot be ignored",
          "Tuples cannot carry enough information about the failure",
          "Returning a tuple prevents the function from being type-annotated"
        ],
        answer: 1,
        why: "A boolean-returning permission check has a well-known failure mode: a caller writes `check_access(user, file)` without inspecting the result, and execution continues as if access were granted. Nothing in the code signals the mistake. An exception forces the caller either to handle it or to propagate it, and it gives the success path a single unambiguous meaning."
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
        q: "How would you refactor a deeply nested set of conditionals?",
        strong: "Guard clauses. Invert each precondition and return or raise early, so failures are handled at the top and the real work ends up unindented at the bottom. Each error message then sits next to the check that produced it, and adding a precondition is a two-line addition instead of a re-indentation.",
        answer: [
          { t: "p", text: "This comes up constantly because the nested shape is so common in code that grew over time." },
          { t: "p", text: "The detail worth adding is the cost-of-change argument rather than the aesthetic one: in a six-level arrow, a new rule has to be inserted at the correct depth and possibly duplicated across sibling branches. Flattened, it is appended. That is a concrete reason a reviewer can act on." },
          { t: "p", text: "If the branching itself is large — many branches on one value — the second move is to turn it into data: a dispatch dict of values or functions, so adding a case cannot introduce a control-flow bug." }
        ]
      },
      {
        level: "core",
        q: "When would you use a dispatch dict instead of if/elif?",
        strong: "When the chain is really a lookup — mapping a key to a value or to a handler — and there are enough branches that the mapping is clearer as a table. It also makes the cases iterable, testable and loadable from configuration, and adding one is a single data line rather than new control flow.",
        answer: [
          { t: "p", text: "Show that you know when *not* to. For two or three branches a dict is indirection with no benefit, and reviewers rightly push back on it." },
          { t: "p", text: "The stronger observation is about repetition: one `if type ==` chain is fine; the same chain appearing in billing, permissions and reporting is a class hierarchy waiting to be extracted. The duplication is the signal that the branching belongs on the type rather than in the callers." }
        ]
      },
      {
        level: "advanced",
        q: "A pricing function has fourteen elif branches and a new one broke an existing rule. What is the underlying problem?",
        strong: "In an `if/elif` chain every branch implicitly means \"and nothing above matched\", so inserting one changes the meaning of every branch below it. That coupling is invisible in the diff — a reviewer sees five added lines and cannot tell that thirteen other rules now behave differently.",
        answer: [
          { t: "p", text: "The interviewer is testing whether you can name a structural cause rather than blaming the change." },
          { t: "p", text: "The fix worth proposing is making the rules data — a list of `(predicate, result)` pairs, or a dispatch table keyed by segment — so precedence becomes an explicit, inspectable property instead of an emergent one. Then a test can assert that exactly one rule matches each representative input, which catches overlaps directly." },
          { t: "p", text: "A good closing observation: the general signal for outgrowing `if/elif` is when adding a branch requires understanding all the existing ones. At that point the ordering has become load-bearing logic that nothing in the code documents." }
        ],
        weak: "Proposing only \"add more tests\" or \"be more careful in review\". Both help, and neither addresses the fact that the structure makes the coupling invisible to the reviewer in the first place."
      }
    ]
  }
});

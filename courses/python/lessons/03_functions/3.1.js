/* ============================================================================
   LESSON 3.1 — Defining Functions and Returning Values
   ========================================================================= */
EC.receiveLesson({
  id: "3.1",

  lede: "A function is the unit of design in Python, and most of what makes one good has nothing to do with syntax. It is about **what the signature promises and whether the body keeps that promise** — a function that returns a value sometimes and `None` other times has broken its contract before anyone reads the code inside it.",

  objectives: [
    "Define functions with a return contract a caller can rely on",
    "Explain what `def` actually does at runtime",
    "Decide when to return a value, return `None`, or raise",
    "Write docstrings that answer the questions a caller actually has",
    "Recognise when a function is doing more than one thing"
  ],

  prerequisites: ["1.4", "2.6"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "def is a statement that runs", id: "def-runs" },

    {"kind": "memory", "title": "def creates a function object and binds a name", "caption": "def runs like any other statement: it builds a function object (code, defaults, closure, docstring) and binds the name. That is why defaults are evaluated once, and why a function can be passed around like any value.", "names": [{"name": "greet", "to": "o1"}, {"name": "say_hi = greet", "to": "o1", "label": "same object"}], "objects": [{"id": "o1", "type": "function", "value": "greet(name, punct='!')", "note": "__code__, __defaults__, __doc__, __name__", "tone": "accent"}], "t": "diagram", "id": "dg-3_1-01-0"},





    { t: "viz",
      title: "What a call actually does",
      caption: "A call binds arguments to parameters in a fresh local namespace, runs the body, and returns. Falling off the end returns `None` — there is no such thing as a function that returns nothing.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="The four steps of a function call: bind, execute, return, discard the frame">
  <g style="stroke-width:2">
    <rect x="24"  y="56" width="180" height="64" rx="7" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)"/>
    <rect x="238" y="56" width="180" height="64" rx="7" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)"/>
    <rect x="452" y="56" width="180" height="64" rx="7" style="fill:var(--good);fill-opacity:.16;stroke:var(--good)"/>
    <rect x="666" y="56" width="190" height="64" rx="7" style="fill:var(--ink-3);fill-opacity:.06;stroke:var(--line)"/>
  </g>
  <text x="44"  y="84"  class="s-label" style="fill:var(--accent)">1 BIND</text>
  <text x="44"  y="106" class="s-sub" style="fill:var(--ink-3)">args to parameters</text>
  <text x="258" y="84"  class="s-label" style="fill:var(--accent)">2 EXECUTE</text>
  <text x="258" y="106" class="s-sub" style="fill:var(--ink-3)">in a new frame</text>
  <text x="472" y="84"  class="s-label" style="fill:var(--good)">3 RETURN</text>
  <text x="472" y="106" class="s-sub" style="fill:var(--ink-3)">a value, always</text>
  <text x="686" y="84"  class="s-label" style="fill:var(--ink-3)">4 DISCARD</text>
  <text x="686" y="106" class="s-sub" style="fill:var(--ink-3)">locals disappear</text>

  <g style="stroke:var(--ink-3);stroke-width:1.5">
    <line x1="206" y1="88" x2="234" y2="88" marker-end="url(#fn-a)"/>
    <line x1="420" y1="88" x2="448" y2="88" marker-end="url(#fn-a)"/>
    <line x1="634" y1="88" x2="662" y2="88" marker-end="url(#fn-a)"/>
  </g>

  <text x="24" y="166" class="s-sub" style="fill:var(--crit)">A function with no return still returns None — so x = f() binds None rather than failing</text>
  <text x="24" y="192" class="s-sub" style="fill:var(--ink-3)">return with no value and falling off the end are identical; both produce None</text>

  <defs><marker id="fn-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/></marker></defs>
</svg>`
    },
    { t: "p", text: "`def` is not a declaration processed at import — it is a statement that **executes**, building a function object and binding it to a name. Everything odd about default arguments, decorators and closures follows from that." },

    { t: "code", lang: "python", title: "a function is an object", code: `
def apply_tax(amount: float, rate: float = 0.2) -> float:
    """Return amount with tax added."""
    return amount * (1 + rate)


print(type(apply_tax))
print(apply_tax.__name__)
print(apply_tax.__doc__)
print(apply_tax.__defaults__)        # evaluated once, at def time
print(apply_tax.__annotations__)

# It is an ordinary value: assign it, store it, pass it around
also = apply_tax
print(also(100))
`,
      out: `<class 'function'>
apply_tax
Return amount with tax added.
(0.2,)
{'amount': <class 'float'>, 'rate': <class 'float'>, 'return': <class 'float'>}
120.0`
    },

    { t: "callout", kind: "insight", title: "Two consequences worth holding on to", body: [
      { t: "ul", items: [
        "**Defaults are evaluated once**, when `def` runs — which is the mutable-default trap from Lesson 1.4, now with its mechanism visible in `__defaults__`.",
        "**Annotations are stored, not enforced.** `__annotations__` is a dict Python keeps and never checks. That is what makes static type checking a separate tool rather than a runtime cost."
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "The return contract", id: "return-contract" },

    { t: "p", text: "Every Python function returns something. A function with no `return` — or one that falls off the end — returns `None`. The problem is not `None` itself; it is a function whose return **type varies with the path taken**." },

    { t: "ladder",
      title: "Looking up a user",
      rungs: [
        { level: "bad", label: "Inconsistent return type", why: "the caller cannot write one correct line",
          code: `def get_user(user_id):
    if not user_id:
        return False                    # a bool
    user = db.find(user_id)
    if user is None:
        return "not found"              # a str
    if user.deleted:
        return None                     # None
    return user                         # a User`,
          note: "Four return types from one function. Every caller needs four branches, and no type hint can describe it. Worse, `if get_user(x):` is falsy for three completely different reasons — no id, deleted, and (if `User` defines `__len__`) potentially a valid empty user." },

        { level: "ok", label: "One optional type", why: "honest, and the caller must handle it",
          code: `def get_user(user_id: str) -> User | None:
    """Return the user, or None if no active user has that id."""
    if not user_id:
        return None
    user = db.find(user_id)
    if user is None or user.deleted:
        return None
    return user


user = get_user(uid)
if user is None:
    return error_response("not found")`,
          note: "One consistent contract, expressed in the signature. mypy will now flag any caller that uses the result without checking for `None`. The remaining weakness: three different situations collapse into one `None`, so the caller cannot tell an invalid id from a deleted account." },

        { level: "best", label: "Return for the expected case, raise for the exceptional", why: "the caller cannot forget",
          code: `class UserNotFound(LookupError):
    """No user exists with the given id."""


def get_user(user_id: str) -> User:
    """Return the active user with this id.

    Raises:
        ValueError: user_id is empty.
        UserNotFound: no such user, or the account is deleted.
    """
    if not user_id:
        raise ValueError("user_id must not be empty")

    user = db.find(user_id)
    if user is None or user.deleted:
        raise UserNotFound(user_id)

    return user`,
          note: "The return type is now unconditional: callers on the happy path write `get_user(uid).email` with no check at all. The two failure modes are distinguishable, and a caller who ignores them gets an exception rather than an `AttributeError` on `None` three frames later. Use the `| None` form when absence is **routine** (a cache lookup, an optional setting); raise when it means the caller's assumption was wrong." }
      ]
    },

    { t: "callout", kind: "trap", title: "The bare `return` that is a bug", body: [
      { t: "code", lang: "python", title: "the silent None", numbered: false, code: `
def find_first_error(records):
    for record in records:
        if record.get("error"):
            return record
    # no return here -- returns None when nothing matched


error = find_first_error(records)
print(error["message"])       # TypeError: 'NoneType' object is not subscriptable`},
      { t: "p", text: "This is the most common source of `'NoneType' object is not subscriptable` in Python (Lesson 1.9). The function is not wrong — returning `None` for \"not found\" is a legitimate design — but the *contract was never stated*, so the caller did not know to check." },
      { t: "p", text: "**Make the fall-through explicit.** Either write `return None` on its own line with the type hint `-> dict | None`, or raise. An implicit fall-through is a contract nobody wrote down." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "One function, one job", id: "single-job" },

    { t: "code", lang: "python", title: "the signal that a function is doing too much", code: `
# Three jobs: fetch, transform, persist. Untestable without a database,
# and unusable if you only want one of the three.
def process_orders(date):
    rows = db.query("SELECT * FROM orders WHERE date = ?", date)
    totals = {}
    for row in rows:
        totals[row["customer"]] = totals.get(row["customer"], 0) + row["amount"]
    db.execute("INSERT INTO summaries ...", totals)
    return totals
`},

    { t: "code", lang: "python", title: "split along the seams", code: `
def fetch_orders(date: date) -> list[Order]:
    """I/O. Mock this in tests."""
    return db.query("SELECT * FROM orders WHERE date = ?", date)


def totals_by_customer(orders: Iterable[Order]) -> dict[str, Decimal]:
    """Pure. No I/O, no globals -- testable with a literal list."""
    totals: defaultdict[str, Decimal] = defaultdict(Decimal)
    for order in orders:
        totals[order.customer] += order.amount
    return dict(totals)


def save_summary(totals: Mapping[str, Decimal]) -> None:
    """I/O. Returns None because it works by side effect."""
    db.execute("INSERT INTO summaries ...", totals)


def process_orders(day: date) -> dict[str, Decimal]:
    """Orchestration only -- reads as the description of the job."""
    totals = totals_by_customer(fetch_orders(day))
    save_summary(totals)
    return totals
`,
      caption: "The seam that matters is **I/O versus computation**. `totals_by_customer` is now a pure function testable with a literal list and no database — which is where every interesting bug in this job actually lives. Lesson 9.6 builds on this."
    },

    { t: "callout", kind: "good", title: "Three signals a function should be split", body: [
      { t: "ul", items: [
        "**The name contains \"and\".** `validate_and_save`, `parse_and_send`. The name is telling you.",
        "**You cannot test it without a database, network or clock.** Extract the pure part; the untestable remainder becomes thin enough to be obviously correct.",
        "**A comment introduces a section.** `# now calculate the totals` is a function name waiting to be extracted."
      ]},
      { t: "p", text: "The counter-pressure is real: splitting too aggressively produces a codebase where following one operation means opening six files. The test is whether each piece is independently **nameable** and **useful**. `totals_by_customer` is both; `_step_three` is neither." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Docstrings", id: "docstrings" },

    { t: "code", lang: "python", title: "answer the caller's questions", code: `
def retry(operation: Callable[[], T], attempts: int = 3) -> T:
    """Call operation, retrying on TimeoutError with exponential backoff.

    Waits 1s, 2s, 4s between attempts. The operation must be idempotent --
    a retry after a partial success will run it again.

    Args:
        operation: A zero-argument callable. Its return value is returned.
        attempts: Total tries including the first. Must be at least 1.

    Returns:
        Whatever operation returns on its first successful call.

    Raises:
        TimeoutError: Every attempt timed out. Chained from the last one.
        ValueError: attempts is less than 1.
    """
`,
      caption: "The valuable lines here are the ones a signature cannot express: that the operation must be idempotent, what the wait schedule is, and that the final `TimeoutError` is chained. Everything else is documentation the type hints already provide."
    },

    { t: "callout", kind: "tradeoff", title: "How much docstring is enough", body: [
      { t: "table",
        head: ["Function", "Needs"],
        rows: [
          ["Short, obvious, private (`_slugify`)", "A one-line summary, or nothing if the name and hints say it all"],
          ["Public API", "Summary, `Args`, `Returns`, `Raises` — callers cannot read your source"],
          ["Anything with a non-obvious constraint", "**That constraint**, always — idempotency, thread-safety, ordering, units"],
          ["Anything with surprising behaviour", "Why, not what. `# noqa` and clever code both need a reason"]
        ]
      },
      { t: "p", text: "A docstring that restates the signature (`\"\"\"Takes a name and returns a greeting.\"\"\"`) costs maintenance and adds nothing — it will drift out of date and mislead someone. **Document what the code cannot say about itself.**" }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a function with four contracts",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "The function below is real in shape: it grew a return type per bug report, and every caller now has a slightly different set of checks. Give it one contract, split it along its seams, and make the pure part testable without a database." }
      ],
      requirements: [
        "Identify every distinct return type and the situation that produces it.",
        "Redesign so the function has **one** return type, with failures distinguishable by the caller.",
        "Split I/O away from computation so the calculation can be tested with a literal list.",
        "Make the implicit fall-through explicit.",
        "Write the docstring for the public function, documenting only what the signature cannot.",
        "Write two tests for the pure function that need no database."
      ],
      hint: "Start by listing the return types. Then ask, for each failure: is this routine (the caller expects it) or exceptional (the caller's assumption was wrong)? Routine becomes part of the return type; exceptional becomes an exception.",
      solution: {
        lang: "python",
        title: "invoice_total.py",
        code: `# ---- the original ------------------------------------------------------

def get_invoice_total(invoice_id):
    if not invoice_id:
        return 0                        # int
    inv = db.find_invoice(invoice_id)
    if inv is None:
        return "not found"              # str
    if not inv["lines"]:
        return None                     # None -- or is this 0?
    total = 0
    for line in inv["lines"]:
        if line.get("void"):
            continue
        total += line["qty"] * line["price"]
    if total < 0:
        return False                    # bool
    return total                        # number
#
# Return types: int, str, None, bool, number -- five, from one function.
# A caller writing "if get_invoice_total(x):" gets a falsy result for an
# empty id, an empty invoice, a negative total AND a legitimate total of
# zero -- four different situations, indistinguishable.


# ---- the redesign ------------------------------------------------------

from __future__ import annotations

from collections.abc import Iterable, Mapping
from decimal import Decimal


class InvoiceNotFound(LookupError):
    """No invoice exists with the given id."""


def line_total(line: Mapping) -> Decimal:
    """Return the value of one invoice line; voided lines are worth zero."""
    if line.get("void"):
        return Decimal("0")
    return Decimal(str(line["price"])) * line["qty"]


def sum_lines(lines: Iterable[Mapping]) -> Decimal:
    """Total the non-void lines.

    Pure: no database, no clock, no globals. An empty invoice totals zero,
    which is a real answer -- not a missing one.
    """
    return sum((line_total(line) for line in lines), start=Decimal("0"))


def get_invoice_total(invoice_id: str) -> Decimal:
    """Return the total of the invoice's non-void lines.

    An invoice with no lines totals Decimal("0"); that is a valid result,
    not an error. Negative totals are permitted -- credit notes are
    represented as invoices with negative line prices.

    Raises:
        ValueError: invoice_id is empty.
        InvoiceNotFound: no invoice has that id.
    """
    # Exceptional: an empty id means the caller made a mistake.
    if not invoice_id:
        raise ValueError("invoice_id must not be empty")

    invoice = db.find_invoice(invoice_id)

    # Exceptional: the caller asked for something that does not exist.
    if invoice is None:
        raise InvoiceNotFound(invoice_id)

    # Routine: no lines is a legitimate state with a legitimate answer.
    return sum_lines(invoice["lines"])


# ---- tests, no database ------------------------------------------------

def test_sums_non_void_lines() -> None:
    lines = [
        {"qty": 2, "price": "10.00"},
        {"qty": 1, "price": "5.50"},
        {"qty": 3, "price": "1.00", "void": True},
    ]
    assert sum_lines(lines) == Decimal("25.50")


def test_empty_invoice_totals_zero() -> None:
    # The behaviour the original could not express: zero is an answer.
    assert sum_lines([]) == Decimal("0")


def test_credit_note_is_negative() -> None:
    assert sum_lines([{"qty": 1, "price": "-20.00"}]) == Decimal("-20.00")


if __name__ == "__main__":
    test_sums_non_void_lines()
    test_empty_invoice_totals_zero()
    test_credit_note_is_negative()
    print("pure function verified without touching a database")`,
        notes: [
          { t: "p", text: "**The decision that drives everything is routine versus exceptional.** An empty invoice id and a missing invoice mean the caller's assumption was wrong — those raise. An invoice with no lines is a perfectly normal state, and its total is zero. The original conflated all three into falsy values." },
          { t: "p", text: "**`return False` for a negative total was a bug hiding as a guard.** Credit notes are legitimately negative, so the original silently converted valid data into a falsy sentinel. Writing the docstring is what surfaces this: stating \"negative totals are permitted\" forces you to decide whether they are." },
          { t: "p", text: "**`sum_lines` is the whole point of the split.** Every interesting bug in this code — void handling, decimal precision, empty totals, negatives — lives in the arithmetic, and it is now testable with three literal dicts and no database. The I/O function that remains is thin enough to be obviously correct by inspection." },
          { t: "callout", kind: "insight", title: "Why the docstring omits the parameter types", body: [
            { t: "p", text: "`invoice_id: str` and `-> Decimal` already say what an `Args`/`Returns` block would repeat, and a repeated fact is a fact that can drift out of date. What the signature *cannot* say is that an empty invoice is valid, that negatives are intentional, and which two failures raise — so those are what the docstring carries." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A payments service has a function `charge(order)` that returns the transaction id on success and `None` on failure. A refactor adds a new failure mode — the card is valid but the issuer declined — which also returns `None`. Support cannot distinguish declines from network errors, and customers are told to retry when retrying cannot possibly work." },
      { t: "p", text: "**The design flaw predates the refactor.** `None` was already carrying \"something went wrong\", so adding a second cause was the path of least resistance. A return type that means *failure, cause unspecified* invites exactly this accumulation." },
      { t: "p", text: "**Two shapes fix it.** Raise distinct exceptions — `CardDeclined`, `PaymentGatewayTimeout` — so callers handle what they can and let the rest propagate. Or return an explicit result type: a small frozen dataclass with `succeeded`, `transaction_id` and `failure_reason`, which suits an API boundary where failures are expected rather than exceptional." },
      { t: "p", text: "The generalisable rule: **a return value that means \"something went wrong\" without saying what will accumulate causes until it means nothing.** Make the failure modes distinguishable at the point you first have more than one." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**`def` is a statement that executes**, building a function object. Defaults are evaluated once at that moment; annotations are stored and never checked.",
    "Every function returns something. **A function whose return type varies with the path taken has no usable contract.**",
    "An implicit fall-through returning `None` is a contract nobody wrote down — the leading cause of `'NoneType' object is not subscriptable`.",
    "Return `| None` when absence is **routine**; raise when it means the caller's assumption was wrong. Distinguish failure modes as soon as there is more than one.",
    "**Split along the I/O seam.** The pure computation is where the interesting bugs live, and it is testable with literal data.",
    "Three signals to split: the name contains \"and\", you cannot test it without infrastructure, or a comment is introducing a section.",
    "Do not split so far that following one operation means opening six files — each piece must be independently nameable and useful.",
    "**Document what the code cannot say about itself:** idempotency, ordering, units, thread-safety, which exceptions. A docstring restating the signature will drift and mislead.",
    "A return value meaning \"something went wrong\" without saying what will accumulate causes until it conveys nothing."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A function loops over records returning the first match, with no `return` after the loop. What does it return when nothing matches?",
        options: [
          "It raises `StopIteration`",
          "`None`, implicitly — and the caller usually discovers this as a `TypeError` further down",
          "An empty collection of the same type as the records",
          "`False`"
        ],
        answer: 1,
        why: "Falling off the end of a function returns `None`. Returning `None` for \"not found\" is a legitimate design — the problem is that it was never *stated*, so the type hint does not mention it and no caller knows to check. The failure then surfaces as `'NoneType' object is not subscriptable` at the call site. Make it explicit with `return None` and a `-> X | None` hint, or raise."
      },
      {
        stem: "When should a lookup function raise rather than return `None`?",
        options: [
          "Always — exceptions are the Pythonic way to signal any failure",
          "When absence means the caller's assumption was wrong, rather than being a routine outcome the caller expects",
          "Only when the function performs I/O",
          "Never — returning `None` is cheaper than raising"
        ],
        answer: 1,
        why: "The distinction is routine versus exceptional. A cache lookup that misses, or an optional setting that is unset, is a normal outcome — `| None` is right, and mypy will force callers to handle it. A missing record that the caller believed existed is a broken assumption; raising means the caller cannot forget, and distinct exception types let different failures be handled differently. Neither is universally correct."
      },
      {
        stem: "Which is the strongest signal that a function should be split?",
        options: [
          "It is longer than 20 lines",
          "It cannot be tested without a database, network call or the current time",
          "It has more than three parameters",
          "It contains a loop and a conditional"
        ],
        answer: 1,
        why: "The I/O seam is where splitting pays most: the pure computation is where the interesting bugs live, and extracting it makes those bugs testable with literal data. Length, parameter count and control flow are weak proxies — a 40-line pure function can be perfectly clear, while a 10-line function mixing a query, a calculation and a write is hard to test and hard to reuse."
      },
      {
        stem: "Which docstring line earns its place?",
        options: [
          "\"Takes an order id and returns the order total.\"",
          "\"The operation must be idempotent — a retry after partial success will run it again.\"",
          "\"Args: order_id (str): The order id.\"",
          "\"This function calculates the total.\""
        ],
        answer: 1,
        why: "The idempotency requirement is a constraint no signature can express, and a caller who violates it will double-charge someone. The other three restate what `def get_total(order_id: str) -> Decimal` already says — and a repeated fact is one that can drift out of date and mislead. Document what the code cannot say about itself."
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
        q: "How do you decide what a function should return when something goes wrong?",
        strong: "By asking whether the situation is routine or exceptional. If the caller reasonably expects it — a cache miss, an optional field — return `| None` so the type hint forces them to handle it. If it means their assumption was wrong, raise, so they cannot silently proceed. And distinguish failure modes as soon as there is more than one.",
        answer: [
          { t: "p", text: "The framing matters more than the choice: interviewers want to see that you think about the *caller's* code, not just the function's." },
          { t: "p", text: "The strongest concrete point is that a return value meaning \"something went wrong\" without saying what will accumulate causes over time. A payments function returning `None` for both a network timeout and a card decline forces support to guess, and the second cause was added precisely because the first had already made `None` mean \"failure, unspecified\"." },
          { t: "p", text: "Mentioning the third option — an explicit result object with a `failure_reason` — shows range. It suits API boundaries where failures are expected outcomes rather than exceptional ones." }
        ],
        weak: "\"Always raise\" or \"always return None\". Both are rules applied without reference to what the caller is trying to do, and both produce awkward code half the time."
      },
      {
        level: "core",
        q: "What makes a function hard to test, and what do you do about it?",
        strong: "Mixing I/O with computation. If a function queries a database, calculates something and writes a result, you cannot test the calculation without infrastructure. Split along that seam: the pure part takes and returns data, the I/O parts become thin enough to be obviously correct.",
        answer: [
          { t: "p", text: "The observation that lands: the interesting bugs are almost always in the computation, and that is the part the mixing makes untestable. You end up needing a database to test arithmetic." },
          { t: "p", text: "It is worth naming the other hidden dependencies with the same shape — the clock, randomness, the filesystem, environment variables. Each one turns a deterministic function into one that behaves differently on Tuesday or on a colleague's machine." },
          { t: "p", text: "Balance it by acknowledging the counter-pressure: splitting too aggressively produces a codebase where following one operation means opening six files. The test is whether each piece is independently nameable and useful." }
        ]
      },
      {
        level: "advanced",
        q: "What belongs in a docstring, and what does not?",
        strong: "What the code cannot say about itself — idempotency, thread-safety, ordering guarantees, units, which exceptions and when. Not a restatement of the signature: type hints already carry parameter and return types, and a duplicated fact is one that can drift out of date.",
        answer: [
          { t: "p", text: "The drift argument is the one that convinces reviewers. A docstring that repeats the signature is not neutral — it is a second copy of a fact that will eventually contradict the first, and a wrong docstring is worse than none." },
          { t: "p", text: "A good example to offer: for a retry helper, the valuable lines are that the operation must be idempotent and what the backoff schedule is. A caller who gets that wrong double-charges a customer, and no type hint could have warned them." },
          { t: "p", text: "Calibrating by audience shows judgement — a short private helper may need nothing beyond a good name, while a public API needs `Args`, `Returns` and `Raises` because callers cannot read your source." }
        ]
      }
    ]
  }
});

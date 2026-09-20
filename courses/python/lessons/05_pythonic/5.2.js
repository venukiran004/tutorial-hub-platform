/* ============================================================================
   LESSON 5.2 — PEP 8, Naming and Layout
   ========================================================================= */
EC.receiveLesson({
  id: "5.2",

  lede: "Most of PEP 8 is now a solved problem: you install a formatter, wire it into CI, and never discuss indentation again. What the formatter cannot do is choose your names, and **naming is the highest-leverage readability decision you make**, because a good name removes the need to read the implementation and a bad one guarantees someone will read it wrong. This lesson sorts PEP 8 into what to automate, what to think about, and what PEP 8 itself tells you to ignore.",

  objectives: [
    "Split PEP 8 into the rules a formatter owns, the rules you own, and the rules to break",
    "Name functions, variables, booleans and constants so the call site reads as a sentence",
    "Lay out a module so imports, constants and definitions appear in the order readers expect",
    "Explain what a single leading underscore means, and what two actually do",
    "Land a formatting change without destroying `git blame` or hiding a logic change"
  ],

  prerequisites: ["5.1"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "Three buckets", id: "three-buckets",
      sub: "Every PEP 8 rule belongs in exactly one of them, and they need completely different treatment." },

    { t: "table",
      head: ["Bucket", "Examples", "How you handle it"],
      rows: [
        ["**Automate it**", "Indentation, quote style, line length, trailing commas, blank lines, operator spacing, import sorting", "`ruff format` plus `ruff check --select I` in CI. Never discuss in review. A comment about any of these is a bug in your tooling, not in the code."],
        ["**Decide it**", "Names, module structure, what is public, where a line is broken for meaning, what gets a comment", "Human judgement. This is where review attention belongs, and it is roughly 5% of PEP 8's text and 95% of its value."],
        ["**Break it**", "Line length in a table of constants, `E731` on a genuinely local lambda, alignment that makes a matrix readable", "PEP 8 says so itself: \"know when to be inconsistent\". Break it with a `# noqa: E501` and a reason."]
      ],
      caption: "The mistake teams make is treating all three the same way — either arguing about bucket one in review, or automating away bucket two by pretending a linter can judge a name."
    },

    { t: "code", lang: "bash", title: "the whole of bucket one, configured once", code: `
$ ruff format .            # formats: layout, quotes, line breaks, commas
$ ruff check --fix .       # lints: import order, unused names, known traps

# pyproject.toml
# [tool.ruff]
# line-length = 100
# [tool.ruff.lint]
# select = ["E", "F", "I", "B", "UP", "SIM", "N"]
`,
      caption: "`I` is import sorting, `B` is bugbear (which catches the mutable default from Lesson 1.4), `UP` rewrites outdated syntax for your target version, `N` checks naming conventions. Lesson 14.4 covers the full configuration and the pre-commit wiring."
    },

    { t: "callout", kind: "insight", title: "Why 100 rather than 79", body: [
      { t: "p", text: "PEP 8 says 79 characters, and that number is from a era of 80-column terminals and side-by-side diffs on small screens. Most teams now pick 88 (the Black default) or 100." },
      { t: "p", text: "The number matters less than the fact that there is one and a machine enforces it. What a longer limit genuinely buys is fewer forced line breaks inside expressions, and forced breaks are where formatters produce their ugliest output. What it costs is side-by-side review on a laptop." },
      { t: "p", text: "**Pick one, put it in `pyproject.toml`, and never revisit it.** The cost of the decision is zero; the cost of relitigating it every quarter is not." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Naming, which is the actual work", id: "naming" },

    { t: "p", text: "A name is a compression of everything the reader would otherwise have to learn by reading the body. When it is accurate, the call site is the documentation. When it is not, the reader learns the wrong thing and does not find out until something breaks." },

    { t: "table",
      head: ["Kind", "Convention", "Example"],
      rows: [
        ["Module and package", "`lower_snake`, short, no underscores if you can avoid them", "`billing`, `http_client`"],
        ["Class", "`CapWords`, a noun", "`OrderRepository`, `RetryPolicy`"],
        ["Function and method", "`lower_snake`, a verb phrase", "`charge_order`, `is_expired`"],
        ["Variable", "`lower_snake`, a noun", "`pending_orders`, `retry_count`"],
        ["Constant", "`UPPER_SNAKE`, module level", "`MAX_ATTEMPTS`, `DEFAULT_TIMEOUT_S`"],
        ["Internal", "one leading underscore", "`_parse_header`, `_cache`"],
        ["Name-mangled", "two leading underscores — rarely what you want", "`__slots_backing`"],
        ["Keyword clash", "one trailing underscore", "`class_`, `id_`, `type_`"]
      ]
    },

    { t: "h3", text: "The four naming failures that actually cost time" },

    { t: "ladder",
      title: "Naming one function, four times",
      rungs: [
        { level: "bad", label: "Type and vagueness", why: "says nothing the signature does not",
          code: `def process_data(data_list, flag):
    ...`,
          note: "Three failures in one line. `process` is a verb that excludes nothing — every function processes something. `data_list` encodes the type, which the annotation already states and which becomes a lie the day it takes a generator. `flag` tells the reader that there is a boolean and nothing about what it selects, so every call site reads `process_data(orders, True)` and means nothing." },
        { level: "ok", label: "Specific verb, honest nouns", why: "readable, still ambiguous at the call site",
          code: `def apply_refunds(orders: list[Order], dry_run: bool) -> list[Refund]:
    ...

apply_refunds(orders, True)`,
          note: "Much better: the verb names the operation, the nouns name the domain objects, and the annotations carry the types. The remaining problem is the call site — `True` at a distance from the parameter name means the reader must open the signature to find out what they just enabled." },
        { level: "best", label: "Keyword-only, predicate reads as English", why: "the call site is the documentation",
          code: `def apply_refunds(
    orders: list[Order],
    *,
    dry_run: bool = False,
) -> list[Refund]:
    """Issue a refund for each order. With dry_run, compute but do not send."""
    ...

apply_refunds(orders, dry_run=True)`,
          note: "The `*` forces `dry_run` to be passed by keyword (Lesson 3.9), so the call site cannot degrade into a positional boolean. `dry_run` reads as a predicate — you can put `if` in front of it and get a sentence. Defaulting to `False` means the dangerous behaviour is the one you have to ask for." }
      ]
    },

    { t: "dl", items: [
      ["**Abbreviation**", "`calc_amt_pmt` saves nine characters and costs every reader a guess. The only abbreviations worth using are the ones your domain already uses in speech — `url`, `id`, `db`, `http`, and whatever your business calls things."],
      ["**Type in the name**", "`user_dict`, `orders_list`, `str_name`. The annotation states the type and stays true; the name does not. When `orders_list` becomes a generator, you either rename it in fourteen places or ship a lie."],
      ["**Booleans that are not predicates**", "`status`, `flag`, `check` are nouns. `is_expired`, `has_permission`, `should_retry`, `can_refund` are predicates, and a predicate reads correctly after `if` and after `not`."],
      ["**Numbers without units**", "`timeout = 30` — seconds or milliseconds? `timeout_s` or `timeout_seconds` removes the question permanently, and removes the class of outage where someone passes 30000 to a function expecting seconds."]
    ]},

    { t: "callout", kind: "good", title: "The sentence test", body: [
      { t: "p", text: "Read the call site out loud with no context. If it is a sentence, the names are right." },
      { t: "code", lang: "python", title: "read each of these aloud", numbered: false, code: `
# not a sentence
if u.st == 2 and check(u):
    p(u, True)

# a sentence
if user.is_active and has_valid_payment_method(user):
    send_invoice(user, retry=True)`},
      { t: "p", text: "This test is cheap, works in review without any tooling, and catches the failures above without you having to classify them. It is also the reason `is_`/`has_`/`should_` prefixes are worth the characters: they are what makes the `if` line grammatical." }
    ]},

    { t: "callout", kind: "trap", title: "Two underscores is not \"more private\"", body: [
      { t: "p", text: "A single leading underscore is a convention: it means \"not part of the public interface, may change\". Nothing enforces it, and that is deliberate. **Two leading underscores invoke name mangling**, which is a different feature with a different purpose, and using it for privacy produces confusing failures." },
      { t: "code", lang: "python", title: "what mangling actually does", code: `
class Base:
    def __init__(self):
        self.__token = "abc"       # becomes self._Base__token

    def show(self):
        print(self.__token)        # compiles to self._Base__token


class Child(Base):
    def __init__(self):
        super().__init__()
        self.__token = "xyz"       # becomes self._Child__token -- a DIFFERENT attribute


c = Child()
c.show()
print(vars(c))
print(c.__token)
`,
        out: `abc
{'_Base__token': 'abc', '_Child__token': 'xyz'}
AttributeError: 'Child' object has no attribute '__token'`,
        hl: [3, 11]},
      { t: "p", text: "The subclass did not override anything. It created a second attribute, and `show()` still prints the base class's value — which is exactly what mangling is *for*: letting a base class keep private state that subclasses cannot accidentally collide with. It is a collision-avoidance tool for library authors, not an access modifier." },
      { t: "p", text: "**Use one underscore for \"internal\", and reserve two for the rare case where a base class genuinely must not be shadowed by a subclass it has never seen.** Lesson 4.4 covers the properties-and-encapsulation side of this." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Module layout", id: "layout",
      sub: "There is a conventional order, and readers rely on it whether or not they could recite it." },

    {"kind": "layers", "title": "Module layout, top to bottom", "caption": "The order a reader expects: what this module is, what it needs, what it exports, then the implementation. A module that opens with helper functions makes the reader scroll to find the point.", "items": [{"label": "docstring", "sub": "one paragraph: what and why", "tone": "accent"}, {"label": "imports", "sub": "stdlib, third-party, local — three groups", "tone": "good"}, {"label": "constants and __all__", "sub": "the public surface, declared"}, {"label": "public functions and classes", "sub": "in the order a reader needs them", "tone": "warn"}, {"label": "private helpers", "sub": "_leading underscore, after the code that uses them"}, {"label": "if __name__ == '__main__':", "sub": "the entry point, last", "tone": "violet"}], "t": "diagram", "id": "dg-5_2-03-0"},


    { t: "viz",
      title: "The shape of a module a Python reader expects",
      caption: "The order is not arbitrary: imports are grouped so that a dependency-related failure names its own group; constants sit above the code that uses them; the main guard is last so that importing the module runs nothing. A reader scanning an unfamiliar file navigates by this shape, and a file that violates it costs them a full read.",
      svg: `<svg viewBox="0 0 900 396" role="img" aria-label="Diagram: conventional top-to-bottom layout of a Python module with the reason for each section">
  <text x="20" y="22" class="s-sub" style="font-weight:700;letter-spacing:.08em">TOP OF FILE</text>

  <rect x="20" y="34" width="330" height="38" rx="7" class="s-fill s-stroke" stroke-width="1"/>
  <text x="36" y="50" class="s-mono">"""Module docstring."""</text>
  <text x="36" y="65" class="s-sub">what this module is for, in one line</text>
  <text x="372" y="57" class="s-sub" style="fill:var(--ink-2)">First statement, or it is not a docstring</text>

  <rect x="20" y="80" width="330" height="34" rx="7" class="s-fill s-stroke" stroke-width="1"/>
  <text x="36" y="102" class="s-mono">from __future__ import annotations</text>
  <text x="372" y="101" class="s-sub" style="fill:var(--ink-2)">Must precede every other import</text>

  <rect x="20" y="122" width="330" height="34" rx="7" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="36" y="144" class="s-mono">import json, pathlib, logging</text>
  <text x="372" y="143" class="s-sub" style="fill:var(--ink-2)">Standard library</text>

  <rect x="20" y="164" width="330" height="34" rx="7" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="36" y="186" class="s-mono">import httpx, pydantic</text>
  <text x="372" y="185" class="s-sub" style="fill:var(--ink-2)">Third party, blank line above</text>

  <rect x="20" y="206" width="330" height="34" rx="7" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="36" y="228" class="s-mono">from billing import Order</text>
  <text x="372" y="227" class="s-sub" style="fill:var(--ink-2)">First party, blank line above</text>

  <rect x="20" y="248" width="330" height="34" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="270" class="s-mono">MAX_ATTEMPTS = 3</text>
  <text x="372" y="269" class="s-sub" style="fill:var(--ink-2)">Module constants, UPPER_SNAKE</text>

  <rect x="20" y="290" width="330" height="34" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="312" class="s-mono">class Repository: ...</text>
  <text x="372" y="311" class="s-sub" style="fill:var(--ink-2)">Two blank lines between top-level defs</text>

  <rect x="20" y="332" width="330" height="34" rx="7" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <text x="36" y="354" class="s-mono">if __name__ == "__main__":</text>
  <text x="372" y="353" class="s-sub" style="fill:var(--ink-2)">Last. Importing the module runs nothing</text>

  <line x1="20" y1="378" x2="880" y2="378" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>
  <text x="20" y="392" class="s-sub" style="fill:var(--ink-2)">Import groups are separated by one blank line. Sorting inside a group is the formatter's job, not yours.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "billing/reconcile.py", code: `
"""Reconcile settled payments against orders and report the differences."""

from __future__ import annotations

import logging
from decimal import Decimal
from pathlib import Path

import httpx

from billing.models import Order, Payment

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 3
DEFAULT_TIMEOUT_S = 10.0
LEDGER_PATH = Path("/var/lib/billing/ledger.ndjson")


class ReconciliationError(RuntimeError):
    """Raised when a payment cannot be matched to exactly one order."""


def reconcile(orders: list[Order], payments: list[Payment]) -> list[Order]:
    ...


def main() -> int:
    ...
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`,
      hl: [13, 15, 16, 17],
      caption: "`logger = logging.getLogger(__name__)` immediately after the imports is near-universal, and `__name__` rather than a literal is what lets logging configuration target this module by its dotted path (Lesson 6.4). `raise SystemExit(main())` rather than calling `main()` directly gives you a real process exit code, which is the difference between a cron job that reports failure and one that does not."
    },

    { t: "callout", kind: "trap", title: "Wildcard imports and the name you cannot find", body: [
      { t: "code", lang: "python", title: "why nobody can trace this", numbered: false, code: `
from billing.models import *
from billing.legacy import *

# Where does Order come from? Both modules define it. The second import
# wins, silently, and reordering the two lines changes the program.
order = Order(...)`},
      { t: "p", text: "`import *` breaks every tool that resolves names: your editor's go-to-definition, `ruff` unused-import detection, and a human reading the file. It also makes shadowing invisible — a name added to `legacy` next month silently replaces one from `models`." },
      { t: "p", text: "The one defensible use is a package's own `__init__.py` re-exporting a curated public API, and even there an explicit `__all__` is better (Lesson 7.5). **Everywhere else, name what you import.**" }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Breaking lines for meaning", id: "line-breaks" },

    { t: "p", text: "This is the one layout decision the formatter cannot make for you, because it depends on which grouping is meaningful. The formatter will produce something legal from any input; you decide what it has to work with." },

    { t: "code", lang: "python", title: "the magic trailing comma", code: `
# Without a trailing comma, the formatter will collapse this if it fits.
result = compute(alpha, beta, gamma)

# With a trailing comma, the formatter keeps one argument per line --
# permanently. This is how you pin a layout you chose deliberately.
result = compute(
    alpha,
    beta,
    gamma,
)
`,
      caption: "Black and `ruff format` both treat a trailing comma as an instruction: \"this was exploded on purpose, leave it exploded\". It is the one lever you have over the formatter, and it is worth knowing because it turns a fight with your tooling into a one-character decision."
    },

    { t: "code", lang: "python", title: "break where the logic breaks", code: `
# Mechanical: fits the limit, groups nothing.
if user.is_active and user.has_payment_method and not user.is_suspended and region in ALLOWED:
    ...

# Grouped: the parentheses let you break at the conjunction, and the two
# halves are now two ideas rather than four conditions.
if (
    user.is_active
    and user.has_payment_method
    and not user.is_suspended
    and region in ALLOWED_REGIONS
):
    ...

# Better still: name the ideas, and the condition disappears.
if user.can_be_billed() and region in ALLOWED_REGIONS:
    ...
`,
      hl: [16],
      caption: "Leading operators rather than trailing ones — PEP 8 changed its recommendation to this, following Knuth, because the operator is the first thing you read on the line and you can scan the column. The third version is the reminder that a formatting problem is often a naming problem in disguise."
    },

    /* ================================================================== */
    { t: "h2", n: "05", text: "Comments and docstrings", id: "comments" },

    { t: "p", text: "PEP 8 and PEP 257 are brief here and the practical rule is briefer: **a comment that says what the code does is a maintenance liability, because it is the part that will not be updated.** A comment that says why is the most valuable line in the file." },

    { t: "code", lang: "python", title: "three comments, one worth keeping", code: `
# increment counter by one          <- restates the code, will go stale
counter += 1

# Retry three times                 <- restates a named constant
for attempt in range(MAX_ATTEMPTS):

# The gateway rate-limits per merchant, not per connection, so parallel
# workers do not help here -- measured 2024-11, ticket BILL-3312.
for attempt in range(MAX_ATTEMPTS):
`,
      caption: "The third comment cannot be derived from the code, is the reason the code has its current shape, and is what stops the next engineer from \"optimising\" it with a thread pool. Dating it and citing the ticket makes it verifiable rather than folklore."
    },

    { t: "dl", items: [
      ["Docstring, one line", "Imperative mood, ends with a full stop: `\"\"\"Return the settled total for an order.\"\"\"` — not \"Returns\" and not \"This function returns\"."],
      ["Docstring, multi-line", "Summary line, blank line, then detail. The closing `\"\"\"` goes on its own line."],
      ["What to document", "The contract: what it returns, what it raises, and any precondition a caller cannot see. Not the parameter types — the annotations already state those and cannot drift."],
      ["What not to document", "Private helpers whose name and five-line body say everything. A docstring on every function regardless of value trains readers to skip docstrings."]
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Rename and relayout a module",
      difficulty: "foundation",
      minutes: 30,
      body: [
        { t: "p", text: "Below is a module that a formatter will happily accept. Every problem in it is in bucket two — the bucket a machine cannot fix." },
        { t: "p", text: "Rewrite it. The constraint that makes this an exercise rather than a reformat: **you must produce two commits**, one containing only mechanical changes and one containing only the changes that alter behaviour, and you must state which is which." }
      ],
      requirements: [
        "Give every name a job: no type suffixes, no unexplained abbreviations, no bare `flag` or `data`.",
        "Every duration, size or money amount carries its unit in the name.",
        "Every boolean parameter is keyword-only and reads as a predicate.",
        "Lay the module out in the conventional order, with a module docstring and a `__name__` guard.",
        "Replace the wildcard import with explicit names.",
        "Identify the one behaviour bug the renaming exposes, fix it in a **separate commit**, and say in the commit message what it was.",
        "Add one comment that explains why, and delete every comment that explains what."
      ],
      hint: "Write out the units for `t` and `timeout` before you rename anything — one of them is milliseconds and the other is seconds, and they are compared to each other. That comparison is the bug.",
      solution: {
        lang: "python",
        title: "retry_client.py",
        code: `# ============================ BEFORE =====================================
#
# from config import *
# import time, requests
#
# MAX = 3
# TIMEOUT = 5000        # ms
#
# def do_req(u, d, flag, t=30):
#     # loop over retries
#     for i in range(MAX):
#         try:
#             r = requests.post(u, json=d, timeout=t)
#             if r.status_code == 200:
#                 return r.json()
#             if flag:
#                 print("retrying")
#         except Exception as e:
#             print(e)
#         time.sleep(1)
#     return None
#
# if TIMEOUT > t:  ...
#
# ================== AFTER, COMMIT 1: mechanical only =====================
#
#   - renamed every identifier, no logic touched
#   - explicit imports, conventional layout, module docstring
#   - one comment kept and rewritten to say why
#   - NO behaviour change: this commit is reviewable by reading names only

"""HTTP client for the payments gateway, with bounded retries."""

from __future__ import annotations

import logging
import time
from typing import Any

import requests

from config import GATEWAY_URL, VERBOSE_RETRIES

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 3
GATEWAY_TIMEOUT_MS = 5000
RETRY_DELAY_S = 1.0


def post_payment(
    url: str,
    payload: dict[str, Any],
    *,
    log_retries: bool = False,
    request_timeout_s: float = 30.0,
) -> dict[str, Any] | None:
    """Post a payment and return the decoded body, or None if all attempts fail."""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = requests.post(url, json=payload, timeout=request_timeout_s)
            if response.status_code == 200:
                return response.json()
            if log_retries:
                logger.info("attempt %d returned %d", attempt, response.status_code)
        except Exception as exc:
            logger.warning("attempt %d failed: %s", attempt, exc)
        # The gateway buckets by merchant id, not by connection, so backing
        # off harder does not help and a flat delay keeps the window small.
        # Measured 2025-02, ticket PAY-4471.
        time.sleep(RETRY_DELAY_S)
    return None


# ================== COMMIT 2: the bug the rename exposed =================
#
#   fix(payments): compare gateway timeout in the same unit
#
#   GATEWAY_TIMEOUT_MS is milliseconds; the request timeout is seconds.
#   The old code compared TIMEOUT (5000) against t (30) and concluded the
#   gateway budget was larger, so the client never shortened its own
#   deadline. Requests therefore sat for 30s against a gateway that gave
#   up at 5s, holding a worker for 25s of guaranteed-dead time.
#
#   Renaming the constants to carry their units made the comparison
#   visibly wrong. Nothing else changed.

GATEWAY_TIMEOUT_S = GATEWAY_TIMEOUT_MS / 1000


def effective_timeout_s(request_timeout_s: float) -> float:
    """Never wait longer than the gateway itself will."""
    return min(request_timeout_s, GATEWAY_TIMEOUT_S)


# ---- the test that pins the fix ----------------------------------------

def test_client_never_outlasts_the_gateway() -> None:
    assert effective_timeout_s(30.0) == 5.0
    assert effective_timeout_s(2.0) == 2.0


if __name__ == "__main__":
    test_client_never_outlasts_the_gateway()
    print("ok")`,
        notes: [
          { t: "p", text: "**The unit suffix is the entire exercise.** `TIMEOUT` and `t` are both plausible names and both wrong, and the comparison between them is invisible until the units are written down. Once the constants read `GATEWAY_TIMEOUT_MS` and `request_timeout_s`, comparing them looks wrong on sight — which is what a good name is for. This class of bug destroyed a Mars orbiter and it still ships weekly in web services." },
          { t: "p", text: "**Two commits, not one.** The mechanical commit touches every line and changes nothing; the fix commit touches four lines and changes behaviour. A reviewer can read the second one in thirty seconds. Combined, they are a 90-line diff in which a semantic change is indistinguishable from a rename — which is how behaviour changes reach production disguised as cleanup." },
          { t: "p", text: "**`except Exception` was kept, not fixed.** It is too broad and Lesson 6.1 will narrow it, but doing that here would be a third kind of change smuggled into a formatting exercise. Noticing a problem and deliberately leaving it for its own commit is the discipline the exercise is teaching." },
          { t: "callout", kind: "good", title: "Why the retry comment survived", body: [
            { t: "p", text: "Every other comment in the original said what the next line did, and all of them were deleted. The one that stayed says why the delay is flat rather than exponential, cites a measurement, and names a ticket." },
            { t: "p", text: "That comment is load-bearing: without it, the next engineer reads a flat retry delay, remembers that exponential backoff is best practice, and \"improves\" it — producing more load on a gateway that rate-limits by merchant. The comment is the only thing standing between the codebase and that change." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team adopts a formatter on a four-year-old codebase and lands the reformat as part of a feature pull request, because \"it was in the way\". The diff is 4,300 lines across 61 files. Two reviewers approve it, because reviewing it properly is not possible." },
      { t: "p", text: "A week later, an order total is occasionally off by one cent. Bisecting points at the reformat commit, which is the last place anyone wants to look — and inside it, one line had been genuinely changed: a rounding call moved from inside a loop to after it, because the author \"tidied\" it while the file was already being touched." },
      { t: "p", text: "**Two mechanisms compounded.** The formatting change made the behaviour change invisible in review, and it made `git blame` useless: every line in every touched file now points at the reformat commit and its author, so the history that would have explained the rounding decision is one indirection further away." },
      { t: "p", text: "**The fix has three parts, and they are all process.** Land a reformat as its own commit that changes nothing else, and say so in the message. Record its hash in `.git-blame-ignore-revs` and set `blame.ignoreRevsFile` in the repository config, so `git blame` and GitHub both skip it. Then enable the formatter in CI on the same day, so the codebase never drifts far enough to need a second big-bang reformat." },
      { t: "p", text: "The general rule this generalises to: **a commit should be reviewable by reading it.** Any change large enough that reviewers approve it without reading is a change that can carry a passenger." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**Sort every PEP 8 rule into automate, decide, or break.** Arguing in review about anything in the first bucket means your tooling is not wired up.",
    "A formatter plus `ruff check` in CI settles layout, quotes, line length and import order permanently. Pick a line length once and put it in `pyproject.toml`.",
    "**Naming is the work a machine cannot do.** A name compresses everything the reader would otherwise learn by reading the body.",
    "The four costly naming failures: unexplained abbreviations, the type baked into the name, booleans that are nouns rather than predicates, and numbers without units.",
    "Every duration, size and amount carries its unit — `timeout_s`, `size_bytes`, `amount_pennies`. This removes an entire class of outage.",
    "Make boolean parameters keyword-only so the call site reads `apply_refunds(orders, dry_run=True)` rather than a bare `True` at a distance from its meaning.",
    "**One leading underscore is a convention meaning internal. Two invoke name mangling**, which is collision avoidance for base classes, not an access modifier — a subclass assigning `self.__x` creates a second attribute rather than overriding.",
    "Readers navigate an unfamiliar module by its conventional shape: docstring, `__future__`, stdlib, third party, first party, constants, definitions, `__main__` guard.",
    "`import *` breaks go-to-definition, unused-import detection and human reading, and makes shadowing between modules silent.",
    "A trailing comma pins an exploded layout against the formatter — the one lever you have, and worth knowing.",
    "**Comments that say what go stale; comments that say why are the most valuable lines in the file.** Date them and cite the ticket.",
    "Land a reformat as its own commit, add its hash to `.git-blame-ignore-revs`, and enable the formatter in CI the same day. A commit too large to read is a commit that can hide a behaviour change."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does this print?",
        lang: "python",
        code: `class Base:
    def __init__(self):
        self.__token = "abc"
    def show(self):
        print(self.__token)

class Child(Base):
    def __init__(self):
        super().__init__()
        self.__token = "xyz"

Child().show()`,
        options: [
          "`xyz` — the subclass overrode the attribute",
          "`abc` — the names were mangled to `_Base__token` and `_Child__token`, which are different attributes",
          "`AttributeError` — the mangled name is not accessible from `show`",
          "`None` — the subclass assignment shadowed the base value with an unset name"
        ],
        answer: 1,
        why: "Two leading underscores trigger name mangling at compile time: inside `Base`, `self.__token` compiles to `self._Base__token`, and inside `Child` it compiles to `self._Child__token`. The instance ends up with both attributes, and `show` still reads the base one. Option A is the intuition mangling deliberately defeats — that is what the feature exists for. Option C is wrong because `show` is defined in `Base`, so its mangled lookup succeeds. Use one underscore when you mean internal."
      },
      {
        stem: "Which of these review comments is worth blocking a pull request on?",
        options: [
          "\"Line 42 is 96 characters; our limit is 88\"",
          "\"`timeout = 30` — is that seconds or milliseconds? It is compared against `GATEWAY_TIMEOUT` which is in ms\"",
          "\"I would use double quotes here rather than single quotes\"",
          "\"These imports should be sorted alphabetically\""
        ],
        answer: 1,
        why: "Options A, C and D are all bucket one: a formatter and linter decide them, and a human raising them in review means the tooling is not wired into CI. Option B is bucket two — a naming decision a machine cannot make, and one that hides a real unit-mismatch bug. The units question is the kind of comment that finds defects, which is what review time is for."
      },
      {
        stem: "Why does adding a trailing comma to a multi-line function call change what the formatter does?",
        options: [
          "It is required syntax for multi-line calls in Python 3.11 and later",
          "Formatters treat it as an explicit instruction that the layout was exploded on purpose, so they will not collapse it back onto one line",
          "It prevents a `SyntaxError` when arguments are later added",
          "It has no effect; formatters ignore trailing commas entirely"
        ],
        answer: 1,
        why: "Black and `ruff format` implement the \"magic trailing comma\": its presence means the author chose one-item-per-line, so the formatter preserves that even when the call would fit on one line. Option A is false — the comma has always been optional. Option C describes a genuine side benefit for diffs but not the formatting mechanism. Option D is the belief that leads to fighting your formatter; the comma is the one lever you have over it."
      },
      {
        stem: "A four-year-old codebase is reformatted for the first time. What is the correct way to land it?",
        options: [
          "Combine it with the feature work that prompted it, so the codebase is only disrupted once",
          "As its own commit, with the hash added to `.git-blame-ignore-revs`, and the formatter enabled in CI the same day",
          "Reformat one file per pull request over several months to keep diffs small",
          "Skip the reformat; formatting old code loses history and is not worth it"
        ],
        answer: 1,
        why: "An isolated commit is reviewable by reading its message rather than its 4,000 lines, and `.git-blame-ignore-revs` with `blame.ignoreRevsFile` keeps `git blame` pointing at the commits that made real decisions. Option A is exactly how a behaviour change hides inside a diff nobody can read. Option C leaves the codebase in two styles for months and produces repeated merge conflicts. Option D gives up a permanent gain to avoid a one-off cost that tooling already solves."
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
        q: "How much of PEP 8 do you enforce, and how?",
        strong: "Everything mechanical goes to `ruff format` and `ruff check` in CI, so line length, quotes, spacing and import order are never discussed by a human. What is left is naming, module structure and what gets a comment — and that is where review attention goes. Roughly five per cent of PEP 8's text carries most of its value.",
        answer: [
          { t: "p", text: "The interviewer is checking whether you have run a real team's style process or only read the document. The tell is whether you separate automation from judgement, or recite rules." },
          { t: "p", text: "A strong follow-up detail is the line length answer: pick 88 or 100, put it in `pyproject.toml`, and never revisit it — the decision costs nothing and relitigating it every quarter costs real time." },
          { t: "p", text: "It is also worth saying that PEP 8 explicitly tells you when to be inconsistent, and giving an example: a table of constants aligned past the line limit with a `noqa` and a reason. It shows you read the document rather than absorbed it second hand." }
        ]
      },
      {
        level: "core",
        q: "What is the difference between one leading underscore and two?",
        strong: "One underscore is a convention meaning \"internal, may change\" — nothing enforces it. Two triggger name mangling, so `self.__x` inside class `Base` compiles to `self._Base__x`. That is collision avoidance for base classes whose subclasses they have never seen, not privacy. A subclass assigning `self.__x` creates a separate attribute rather than overriding.",
        answer: [
          { t: "p", text: "Almost everyone knows the first half. The distinguishing answer is naming what mangling is *for*, and being able to describe the surprise: a subclass that sets the same double-underscore name does not override, it adds a second attribute, and the base class keeps reading its own." },
          { t: "p", text: "Add the practical conclusion so it does not sound like trivia: use one underscore when you mean internal, and reach for two only in a library base class where a subclass colliding with your private state would be a real hazard." },
          { t: "p", text: "If you want to close strongly, note that neither provides security — `obj._Base__token` is accessible to anyone who types it. Python's model is that access control is a convention backed by documentation, not by the runtime." }
        ],
        weak: "Saying two underscores means \"more private\". It predicts the wrong behaviour for the subclass case, which is exactly the follow-up."
      },
      {
        level: "advanced",
        q: "You inherit a codebase with no formatter and inconsistent style. What is your first month?",
        strong: "Add the formatter and linter to CI in report-only mode first so nothing breaks, then land one reformat commit that changes nothing else, record its hash in `.git-blame-ignore-revs`, and turn enforcement on the same day. Then spend the remaining effort on naming and module structure, which is where the actual defects hide.",
        answer: [
          { t: "p", text: "This is a judgement question about sequencing and blast radius. The mistake candidates make is proposing an incremental file-by-file reformat, which leaves the codebase in two styles for months and produces conflicts on every long-lived branch." },
          { t: "p", text: "The `.git-blame-ignore-revs` detail is the one that signals you have actually done this. A reformat destroys blame attribution across the whole repository, and the fix is two lines of configuration that most people learn about only after they need it." },
          { t: "p", text: "Close on priorities: formatting is a one-day problem with a permanent solution, and naming is the ongoing work. Say which defects you would go looking for first — units on durations and amounts, and boolean parameters passed positionally — because those are the ones that correlate with incidents rather than with taste." }
        ],
        weak: "Proposing a hand-written style guide document as the first step. It creates work that a formatter does better, and nobody reads it."
      }
    ]
  }
});

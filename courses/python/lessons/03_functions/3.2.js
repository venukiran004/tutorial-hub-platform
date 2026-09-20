/* ============================================================================
   LESSON 3.2 — Parameters and Arguments in Depth
   ========================================================================= */
EC.receiveLesson({
  id: "3.2",

  lede: "Python has six kinds of parameter and most developers know three. The missing ones — **positional-only** and **keyword-only** — are not trivia: they are how you design a signature that cannot be called wrongly, and how you keep the freedom to rename a parameter later without breaking every caller.",

  objectives: [
    "Use every parameter kind and know why each exists",
    "Read and write the `/` and `*` markers in a signature",
    "Explain what `*args` and `**kwargs` actually collect, and when to use them",
    "Design signatures that make incorrect calls impossible rather than merely discouraged",
    "Avoid the boolean-trap and shared-default failures"
  ],

  prerequisites: ["1.4", "3.1"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The six kinds", id: "the-six" },

    {"kind": "cells", "title": "The six kinds of parameter, in the order they must appear", "caption": "Everything before / is positional-only; everything after * is keyword-only; *args and **kwargs collect whatever is left over. A signature is read left to right in exactly this order.", "items": ["pos-only", "/", "pos-or-kw", "*args", "kw-only", "**kwargs"], "highlight": [1, 3], "negative": false, "label": "def f(a, /, b, *args, c, **kwargs)", "t": "diagram", "id": "dg-3_2-01-0"},




    { t: "code", lang: "python", title: "the full grammar, in order", code: `
def example(pos_only, /, standard, *args, kw_only, **kwargs):
    ...
`,
      caption: "Everything before `/` is positional-only. Everything after `*` (or after `*args`) is keyword-only. The order is fixed and this is the complete set."
    },

    { t: "viz",
      title: "Where the markers divide a signature",
      caption: "The slash and the star are boundaries, not parameters. Anything left of the slash can only be passed by position; anything right of the star can only be passed by name. The region between accepts either.",
      svg: `<svg viewBox="0 0 900 240" role="img" aria-label="Diagram: a Python function signature divided by the slash and star markers into positional-only, standard, and keyword-only regions">
  <text x="20" y="34" class="s-mono" style="font-size:13px">def send(</text>
  <text x="96" y="34" class="s-mono" style="font-size:13px;fill:var(--crit)">url</text>
  <text x="130" y="34" class="s-mono" style="font-size:13px;fill:var(--crit-line)">, /,</text>
  <text x="176" y="34" class="s-mono" style="font-size:13px;fill:var(--accent-ink)">body</text>
  <text x="220" y="34" class="s-mono" style="font-size:13px">,</text>
  <text x="234" y="34" class="s-mono" style="font-size:13px;fill:var(--warn)">*extras</text>
  <text x="308" y="34" class="s-mono" style="font-size:13px">,</text>
  <text x="322" y="34" class="s-mono" style="font-size:13px;fill:var(--good)">timeout=30</text>
  <text x="432" y="34" class="s-mono" style="font-size:13px">,</text>
  <text x="446" y="34" class="s-mono" style="font-size:13px;fill:var(--violet)">**opts</text>
  <text x="512" y="34" class="s-mono" style="font-size:13px">)</text>

  <rect x="88" y="46" width="60" height="3" rx="1" style="fill:var(--crit)"/>
  <rect x="170" y="46" width="56" height="3" rx="1" style="fill:var(--accent)"/>
  <rect x="230" y="46" width="80" height="3" rx="1" style="fill:var(--warn)"/>
  <rect x="318" y="46" width="118" height="3" rx="1" style="fill:var(--good)"/>
  <rect x="442" y="46" width="74" height="3" rx="1" style="fill:var(--violet)"/>

  <g>
    <rect x="20" y="66" width="196" height="66" rx="8" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
    <text x="34" y="86" class="s-sub" style="fill:var(--crit);font-weight:700">POSITIONAL-ONLY</text>
    <text x="34" y="103" class="s-sub">before the /</text>
    <text x="34" y="119" class="s-mono" style="font-size:10px">send("http://x")  ok</text>

    <rect x="228" y="66" width="196" height="66" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
    <text x="242" y="86" class="s-sub" style="fill:var(--accent-ink);font-weight:700">STANDARD</text>
    <text x="242" y="103" class="s-sub">position or keyword</text>
    <text x="242" y="119" class="s-mono" style="font-size:10px">body=... or positional</text>

    <rect x="436" y="66" width="196" height="66" rx="8" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
    <text x="450" y="86" class="s-sub" style="fill:var(--warn);font-weight:700">VAR-POSITIONAL</text>
    <text x="450" y="103" class="s-sub">collects the rest, as a tuple</text>
    <text x="450" y="119" class="s-mono" style="font-size:10px">extras == (a, b, c)</text>

    <rect x="644" y="66" width="118" height="66" rx="8" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
    <text x="658" y="86" class="s-sub" style="fill:var(--good);font-weight:700">KEYWORD-ONLY</text>
    <text x="658" y="103" class="s-sub">after * or *args</text>
    <text x="658" y="119" class="s-mono" style="font-size:10px">timeout=5</text>

    <rect x="774" y="66" width="106" height="66" rx="8" style="fill:var(--violet-soft);stroke:var(--violet-line)" stroke-width="1"/>
    <text x="788" y="86" class="s-sub" style="fill:var(--violet);font-weight:700">VAR-KEYWORD</text>
    <text x="788" y="103" class="s-sub">the rest, as a dict</text>
    <text x="788" y="119" class="s-mono" style="font-size:10px">opts == {...}</text>
  </g>

  <rect x="20" y="152" width="860" height="72" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="174" class="s-sub" style="fill:var(--ink-2);font-weight:600">Why the two markers exist</text>
  <text x="36" y="194" class="s-sub"><tspan style="fill:var(--crit)">/</tspan>   the name is an implementation detail — you keep the freedom to rename it without breaking callers</text>
  <text x="36" y="212" class="s-sub"><tspan style="fill:var(--good)">*</tspan>   the name is the documentation — force it, so nobody writes send(url, body, 5, True, False)</text>
</svg>`
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "Keyword-only: the one to use most", id: "keyword-only" },

    { t: "p", text: "A bare `*` in a signature means *everything after this must be passed by name*. It is the single most useful signature tool in Python and the least used." },

    { t: "ladder",
      title: "A function with several options",
      rungs: [
        { level: "bad", label: "All positional", why: "the call site is unreadable",
          code: `def export(rows, path, True, False, ",", None):
    ...

# A caller writes:
export(rows, "out.csv", True, False, ",", None)`,
          note: "What are the booleans? A reader must open the definition to find out — every time. And the arguments can be transposed with no error: swap the two booleans and you get a silently different export." },

        { level: "ok", label: "Defaults, still positional", why: "better, still abusable",
          code: `def export(rows, path, header=True, index=False, sep=",", encoding=None):
    ...

export(rows, "out.csv", True, False)     # still legal, still unreadable`,
          note: "Defaults help the common case, but nothing stops a caller passing them positionally. Worse, you can no longer reorder or remove a parameter without breaking anyone who did." },

        { level: "best", label: "Keyword-only after the essentials", why: "unreadable calls become impossible",
          code: `def export(
    rows: Iterable[Row],
    path: Path,
    *,
    header: bool = True,
    index: bool = False,
    sep: str = ",",
    encoding: str = "utf-8",
) -> None:
    ...


export(rows, out_path, header=False, sep="\\t")
# export(rows, out_path, False)   -> TypeError, at the call site`,
          note: "The two arguments that are genuinely obvious stay positional. Everything else must be named, so the call site documents itself and transposition becomes impossible. It also frees you to add, reorder or rename options later — no caller depends on their position." }
      ]
    },

    { t: "callout", kind: "good", title: "The rule worth adopting", body: [
      { t: "p", text: "**Two positional parameters at most; everything else keyword-only.** Beyond two, a reader cannot reliably remember the order, and every additional positional parameter is a way to call the function wrongly without an error." },
      { t: "p", text: "It is what the standard library does in modern code — `sorted(iterable, *, key=None, reverse=False)`, `dataclasses.dataclass(cls=None, /, *, init=True, repr=True, ...)`. The pattern is: the subject is positional, the options are named." }
    ]},

    { t: "callout", kind: "trap", title: "The boolean trap", body: [
      { t: "code", lang: "python", title: "what does True mean here?", numbered: false, code: `
user.set_permissions(True, False, True)         # unreadable
parse(data, True)                               # strict? recursive? lenient?

# Keyword-only makes it self-documenting:
user.set_permissions(read=True, write=False, admin=True)
parse(data, strict=True)`},
      { t: "p", text: "A positional boolean is a parameter whose meaning is invisible at the call site. Forcing it keyword-only fixes the readability. For more than two related flags, consider an enum or a small config object instead — three booleans describe eight states, most of which are probably invalid." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Positional-only", id: "positional-only" },

    { t: "code", lang: "python", title: "the / marker", code: `
def distance(x, y, /):
    """x and y can never be passed by name."""
    return (x ** 2 + y ** 2) ** 0.5


distance(3, 4)          # fine
# distance(x=3, y=4)    -> TypeError: distance() got some positional-only
#                          arguments passed as keyword arguments: 'x, y'
`},

    { t: "dl", items: [
      ["You keep the freedom to rename", "If nobody can write `x=3`, you can rename `x` to `dx` in a patch release. Without `/`, a parameter name is part of your public API forever."],
      ["Names that add nothing", "`len(obj=[1,2,3])` is a `TypeError`, and rightly — `obj` carries no information a reader needed. Many built-ins are positional-only for exactly this reason."],
      ["`**kwargs` collision safety", "A function taking `**kwargs` cannot also accept a keyword matching one of its own parameters. Making them positional-only removes the clash entirely."]
    ]},

    { t: "code", lang: "python", title: "the collision case, which is the practical one", code: `
# Without /, a caller passing name="x" in kwargs collides with the parameter
def tag(name, **attrs):
    return f"<{name} {attrs}>"

# tag("div", name="header")
#   -> TypeError: tag() got multiple values for argument 'name'

# With /, 'name' is not a keyword at all, so there is nothing to collide with
def tag(name, /, **attrs):
    return f"<{name} {attrs}>"

print(tag("div", name="header"))
`,
      out: `<div {'name': 'header'}>`,
      caption: "This is why `dict(**kwargs)` and similar wrappers use positional-only parameters. Without it, a perfectly reasonable keyword becomes unusable because it happens to match an internal parameter name."
    },

    /* ================================================================== */
    { t: "h2", n: "04", text: "*args and **kwargs", id: "args-kwargs" },

    { t: "code", lang: "python", title: "collecting and unpacking", code: `
def log(level, *parts, **fields):
    print(level, " ".join(str(p) for p in parts), fields)


log("INFO", "user", 42, request_id="abc", latency=1.2)

# The same syntax unpacks at the call site
args = ("user", 42)
kwargs = {"request_id": "abc"}
log("INFO", *args, **kwargs)
`,
      out: `INFO user 42 {'request_id': 'abc', 'latency': 1.2}
INFO user 42 {'request_id': 'abc'}`,
      caption: "`*` and `**` mean *collect* in a definition and *spread* at a call site. The names `args` and `kwargs` are convention only — `*parts` and `**fields` are better when the contents have a meaning."
    },

    { t: "callout", kind: "tradeoff", title: "When `**kwargs` is right and when it hides your API", body: [
      { t: "table",
        head: ["Legitimate", "Questionable"],
        rows: [
          ["A decorator forwarding to any function", "A public function whose real parameters are undiscoverable"],
          ["A subclass passing through to `super().__init__(**kwargs)`", "Avoiding the work of naming the parameters you actually accept"],
          ["A genuinely open set — HTTP headers, tags, extra log fields", "\"Future flexibility\" that never arrives"]
        ]
      },
      { t: "code", lang: "python", title: "the cost", numbered: false, code: `
# A caller cannot discover what this accepts without reading the source,
# and a typo is silently ignored rather than raising.
def create_user(**kwargs):
    ...

create_user(emial="a@b.com")     # no error -- the user has no email`},
      { t: "p", text: "The second effect is the serious one: with `**kwargs`, a misspelled keyword is silently absorbed instead of raising `TypeError`. Explicit parameters turn a typo into an immediate error at the call site." }
    ]},

    { t: "code", lang: "python", title: "the honest middle ground", code: `
def create_user(
    email: str,
    *,
    name: str | None = None,
    role: str = "viewer",
    **extra_metadata: str,
) -> User:
    """Create a user.

    Known fields are named explicitly; extra_metadata accepts arbitrary
    string tags stored alongside the account.
    """
`,
      caption: "Name what you know; let `**kwargs` collect only what is genuinely open-ended — and say so in the docstring. A typo in `name` or `role` still raises; a typo in a metadata tag is, correctly, just a tag."
    },

    /* ================================================================== */
    { t: "h2", n: "05", text: "Defaults, revisited", id: "defaults" },

    { t: "code", lang: "python", title: "the three rules", code: `
from datetime import datetime, UTC

# 1. Never a mutable default -- evaluated once at def time (Lesson 1.4)
def add(item, basket=None):
    if basket is None:
        basket = []

# 2. Never a call that should happen per-invocation
def stamp(when=datetime.now(UTC)):     # WRONG -- frozen at import
    ...

def stamp(when: datetime | None = None):
    when = when or datetime.now(UTC)   # correct

# 3. A default cannot reference another parameter
# def slice_(items, start=0, end=len(items)):   -> NameError at def time
def slice_(items, start=0, end=None):
    end = len(items) if end is None else end
`,
      hl: [7, 8]
    },

    { t: "callout", kind: "insight", title: "The sentinel for \"not supplied\"", body: [
      { t: "p", text: "`None` works as a sentinel until `None` is itself a valid value the caller might pass. Then you need a private sentinel object, which cannot be confused with anything a caller could construct:" },
      { t: "code", lang: "python", title: "when None is meaningful", numbered: false, code: `
_MISSING = object()


def update(record: dict, *, notes: str | None | object = _MISSING) -> dict:
    """Update notes. Passing None clears the field; omitting it leaves it."""
    if notes is not _MISSING:
        record["notes"] = notes      # may legitimately be None
    return record


update(rec)                # notes untouched
update(rec, notes=None)    # notes explicitly cleared`,
        caption: "This is the same absent-versus-empty distinction as the PATCH endpoint in Lesson 1.5, solved at the function level. Pydantic and dataclasses ship their own sentinels for exactly this."}
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make a signature impossible to misuse",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "The report function below has eight positional parameters, four of them booleans. Every call site is unreadable, transposing two arguments produces silently wrong output rather than an error, and the parameter names are now frozen because callers pass them positionally." },
        { t: "p", text: "Redesign the signature so that the wrong call cannot be written." }
      ],
      requirements: [
        "Reduce it to at most two positional parameters; make the rest keyword-only.",
        "Make at least one parameter positional-only, and justify why its name should not be part of the API.",
        "Replace the group of related booleans with something that cannot express an invalid combination.",
        "Handle the mutable default correctly.",
        "Support an open-ended set of extra template variables without hiding the real parameters.",
        "Write three call sites — minimal, typical and full — and confirm the previously-broken calls now raise."
      ],
      hint: "Ask of each boolean: are these independent switches, or one choice among several? Four independent booleans describe sixteen states; if only three are valid, an enum says so and the type checker enforces it.",
      solution: {
        lang: "python",
        title: "report.py",
        code: `# ---- the original ------------------------------------------------------

def build_report(data, out, True, False, False, True, ",", []):
    ...
# Real signature:
#   build_report(data, out, header, index, compress, email, sep, recipients)
#
# Call site:
#   build_report(rows, "q1.csv", True, False, False, True, ",", ["a@b.com"])
#
# Problems:
#   - six positional arguments nobody can read or remember the order of
#   - transposing header and index is silently wrong, not an error
#   - compress and email are unrelated concerns sharing a parameter list
#   - [] is a shared mutable default
#   - every parameter NAME is now frozen, because callers pass positionally


# ---- the redesign ------------------------------------------------------

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class Layout(str, Enum):
    """How the table is laid out.

    An enum, not three booleans: header/index/plain are mutually exclusive
    choices, and booleans would let a caller ask for all three at once.
    """
    WITH_HEADER = "with_header"
    WITH_INDEX = "with_index"
    PLAIN = "plain"


class Compression(str, Enum):
    NONE = "none"
    GZIP = "gzip"
    ZIP = "zip"


@dataclass(frozen=True, slots=True)
class Delivery:
    """Grouped because these only make sense together.

    Frozen, and recipients is a tuple, so a shared instance cannot be
    mutated by one caller and observed by another (Lesson 2.5).
    """
    recipients: tuple[str, ...] = ()
    subject: str = "Report"

    def __post_init__(self) -> None:
        if self.recipients and not all("@" in r for r in self.recipients):
            raise ValueError(f"invalid recipient in {self.recipients}")


def build_report(
    rows: Iterable[Sequence],
    destination: Path,
    /,
    *,
    layout: Layout = Layout.WITH_HEADER,
    separator: str = ",",
    compression: Compression = Compression.NONE,
    delivery: Delivery | None = None,
    **template_vars: str,
) -> Path:
    """Write rows to destination and return the path actually written.

    rows and destination are positional-only: their names carry no
    information a caller needs, and keeping them out of the API leaves us
    free to rename them. It also means a template variable called "rows"
    or "destination" cannot collide with a parameter.

    template_vars are substituted into the report title. Unknown keys are
    accepted deliberately -- the set is open-ended -- while every real
    option above is named, so a typo in one raises TypeError.
    """
    if compression is Compression.GZIP:
        destination = destination.with_suffix(destination.suffix + ".gz")

    # ... write the file ...

    if delivery is not None and delivery.recipients:
        send(destination, delivery)

    return destination


# ---- call sites --------------------------------------------------------

if __name__ == "__main__":
    rows = [("a", 1), ("b", 2)]

    # minimal
    build_report(rows, Path("out.csv"))

    # typical -- every argument explains itself
    build_report(
        rows,
        Path("q1.csv"),
        layout=Layout.PLAIN,
        separator="\\t",
    )

    # full
    build_report(
        rows,
        Path("q1.csv"),
        layout=Layout.WITH_INDEX,
        compression=Compression.GZIP,
        delivery=Delivery(recipients=("finance@example.com",)),
        quarter="Q1",
        region="EMEA",
    )

    # Calls that used to be legal and are now impossible:
    for bad, why in [
        (lambda: build_report(rows, Path("x"), True), "positional option"),
        (lambda: build_report(rows=rows, destination=Path("x")), "positional-only by name"),
        (lambda: build_report(rows, Path("x"), layuot=Layout.PLAIN), "typo in an option"),
    ]:
        try:
            bad()
        except TypeError as exc:
            print(f"  blocked ({why}): {type(exc).__name__}")`,
        notes: [
          { t: "p", text: "**The enum is the change that adds the most safety.** Four booleans describe sixteen states; if `header`, `index` and `plain` are mutually exclusive, twelve of those are invalid and nothing in the old signature said so. `Layout` makes the invalid states unrepresentable, and mypy checks it — a class of bug removed rather than documented." },
          { t: "p", text: "**Positional-only on `rows` and `destination` does two jobs.** It keeps their names out of the public API, so they can be renamed freely. And because `**template_vars` is present, it removes the collision hazard entirely — a caller can pass `rows=\"Q1 rows\"` as a template variable without a `TypeError`." },
          { t: "p", text: "**`Delivery` groups parameters that only make sense together.** `recipients` and `subject` are meaningless individually; passing them separately means every caller and every layer must carry both. Frozen with a tuple, it also cannot become the shared-mutable-default bug the original `[]` was." },
          { t: "callout", kind: "insight", title: "The test at the end is the real deliverable", body: [
            { t: "p", text: "Asserting that the *previously legal* calls now raise is what proves the redesign did its job. It is easy to make a signature prettier; the question is whether the wrong call is now impossible to write." },
            { t: "p", text: "The typo case is the most valuable of the three. Under the original signature — and under any design that leans on `**kwargs` for real options — `layuot=Layout.PLAIN` would be silently absorbed and the report would come out with the default layout. Now it is a `TypeError` at the call site." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A library releases a patch version renaming a parameter from `data` to `payload` for clarity. Downstream builds break: every caller that wrote `client.send(data=...)` now raises `TypeError`. The maintainers had considered it an internal rename." },
      { t: "p", text: "**Parameter names are public API unless you say otherwise.** The moment a function accepts keyword arguments, every parameter name becomes something callers can depend on — and a rename is a breaking change, whatever the version number says." },
      { t: "p", text: "**`/` is how you opt out.** `def send(payload, /, *, timeout=30)` states that the first parameter's name is an implementation detail, so it can be renamed freely. This is why so much of the standard library is positional-only — it was retrofitted precisely to reclaim that freedom." },
      { t: "p", text: "The design habit: **decide, per parameter, whether its name is part of the contract.** Names that carry meaning at the call site (`timeout`, `strict`) should be keyword-only so they are always visible. Names that carry none (`self`, `obj`, `payload`) should be positional-only so they stay yours." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "Six parameter kinds, in fixed order: **positional-only** `/`, standard, `*args`, **keyword-only**, `**kwargs`.",
    "**Two positional parameters at most; make the rest keyword-only.** The subject is positional, the options are named — as the modern standard library does.",
    "Keyword-only makes unreadable calls impossible and frees you to add, reorder or rename options later.",
    "A positional boolean is a parameter whose meaning is invisible at the call site. Force it keyword-only — and for several related flags, use an enum so invalid combinations cannot be expressed.",
    "**Parameter names are public API** the moment keywords are accepted. `/` is how you opt out and keep the right to rename.",
    "`/` also removes `**kwargs` collisions — without it, a caller's keyword that matches an internal parameter name raises `TypeError`.",
    "`**kwargs` silently absorbs misspelled keywords. **Name every real option**; let `**kwargs` collect only a genuinely open-ended set.",
    "Defaults are evaluated once at `def` time — never a mutable object, and never a call like `datetime.now()` that should happen per invocation.",
    "When `None` is itself a valid argument, use a private `_MISSING = object()` sentinel to distinguish *not supplied* from *supplied as None*.",
    "Group parameters that only make sense together into a small frozen object rather than passing them separately through every layer."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "In `def f(a, /, b, *, c)`, how may each parameter be passed?",
        options: [
          "All three by position or keyword",
          "`a` positionally only; `b` either way; `c` by keyword only",
          "`a` by keyword only; `b` either way; `c` positionally only",
          "`a` and `b` positionally; `c` either way"
        ],
        answer: 1,
        why: "The `/` and `*` are boundaries, not parameters. Everything before `/` is positional-only, everything after `*` is keyword-only, and the region between accepts either. So `f(1, 2, c=3)` and `f(1, b=2, c=3)` are valid, while `f(a=1, ...)` and `f(1, 2, 3)` both raise `TypeError`."
      },
      {
        stem: "A library renames a parameter from `data` to `payload` in a patch release and downstream code breaks. What is the underlying issue?",
        options: [
          "Patch releases should never change function signatures at all",
          "Parameter names are part of the public API as soon as keyword arguments are accepted — `/` is how you opt out",
          "The rename should have been accompanied by a deprecation warning on the old name",
          "Python caches parameter names, so callers need to reinstall"
        ],
        answer: 1,
        why: "Any caller writing `f(data=x)` depends on that name, so renaming it is a breaking change regardless of the version number. Marking the parameter positional-only with `/` declares that its name is an implementation detail and reclaims the freedom to rename. Much of the standard library was retrofitted with `/` for exactly this reason. A deprecation shim helps in the moment but does not address the design question."
      },
      {
        stem: "Why replace three related boolean parameters with an enum?",
        options: [
          "Enums are faster to compare than booleans",
          "Three booleans describe eight states; if the options are mutually exclusive, an enum makes the invalid combinations unrepresentable and lets the type checker verify it",
          "Booleans cannot be made keyword-only",
          "Enums serialise to JSON more reliably"
        ],
        answer: 1,
        why: "It removes a class of bug rather than documenting it. If `header`, `index` and `plain` are alternatives, then `header=True, plain=True` is meaningless — and nothing in a boolean signature says so, so the check has to live inside the function at runtime. An enum makes the invalid state impossible to write and mypy catches a wrong value before the code runs."
      },
      {
        stem: "What happens when a caller misspells a keyword for a function defined as `def create(**kwargs)`?",
        options: [
          "`TypeError`, because the keyword is not a known parameter",
          "Nothing — the misspelling is silently collected into `kwargs` and the intended field is left at its default",
          "A `DeprecationWarning` is emitted",
          "The nearest matching parameter is used"
        ],
        answer: 1,
        why: "`**kwargs` accepts any keyword, so `create(emial=\"a@b.com\")` is absorbed without complaint and the user is created with no email. Explicit parameters turn that typo into an immediate `TypeError` at the call site. This is the strongest argument for naming every real option and reserving `**kwargs` for genuinely open-ended sets such as tags or extra metadata."
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
        q: "What do the `/` and `*` markers do in a function signature?",
        strong: "They divide the parameter list. Everything before `/` is positional-only; everything after a bare `*` is keyword-only; the middle accepts either. `/` keeps a parameter's name out of your public API so you can rename it; `*` forces callers to name an argument so the call site documents itself.",
        answer: [
          { t: "p", text: "Knowing the syntax is the easy half. The half that matters is *why you would reach for each*, and the two reasons are opposite: `/` hides a name, `*` insists on one." },
          { t: "p", text: "The concrete case for `/` is worth naming: parameter names become public API the moment keywords are accepted, so a rename is a breaking change. Much of the standard library was retrofitted with `/` to reclaim that freedom." },
          { t: "p", text: "For `*`, the case is readability plus future flexibility — a caller who cannot pass options positionally is a caller whose code does not break when you add or reorder options." }
        ]
      },
      {
        level: "core",
        q: "When should you use `**kwargs`?",
        strong: "When the set of accepted keywords is genuinely open — HTTP headers, tags, extra metadata — or when forwarding to another callable, as a decorator or a `super().__init__` does. Not as a substitute for naming the parameters you actually accept.",
        answer: [
          { t: "p", text: "The cost is what to lead with: a misspelled keyword is silently absorbed instead of raising. `create_user(emial=...)` produces a user with no email and no error anywhere." },
          { t: "p", text: "The second cost is discoverability — a caller cannot see what the function accepts without reading its source, and neither can an IDE or a type checker." },
          { t: "p", text: "The middle ground is worth offering: name the known parameters explicitly and let `**kwargs` collect only the open-ended remainder, documenting that split. You keep typo protection on the real options and flexibility where it is genuinely needed." }
        ]
      },
      {
        level: "advanced",
        q: "How would you redesign a function with eight parameters, four of them booleans?",
        strong: "Keep at most two positional, make the rest keyword-only, and look at whether the booleans are independent switches or one choice among alternatives. If they are alternatives, an enum makes the invalid combinations unrepresentable. Parameters that only make sense together get grouped into a small frozen object.",
        answer: [
          { t: "p", text: "The counting argument is persuasive and easy to state: four booleans describe sixteen states, and if only three are valid the signature is silently permitting thirteen wrong calls. Moving that into an enum converts a runtime check into a type error." },
          { t: "p", text: "Grouping is the other half. `recipients` and `subject` are meaningless apart, so passing them separately forces every intermediate layer to carry both — a frozen dataclass carries them as one thing and can validate itself." },
          { t: "p", text: "The point that shows seniority: the goal is not a prettier signature but one where the wrong call cannot be written. A good way to demonstrate that is a test asserting the previously-legal bad calls now raise `TypeError`." }
        ],
        weak: "Only adding type hints and defaults. Both help, and neither prevents a caller passing six positional arguments in the wrong order — which is the failure mode that actually ships."
      }
    ]
  }
});

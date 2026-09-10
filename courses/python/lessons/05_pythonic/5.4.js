/* ============================================================================
   LESSON 5.4 — Unpacking and the Walrus Operator
   ========================================================================= */
EC.receiveLesson({
  id: "5.4",

  lede: "Unpacking is one of Python's genuinely distinctive features and most people use about a third of it. The walrus operator is the opposite — heavily discussed, narrowly useful, and **it earns its place in roughly three situations**. This lesson covers what unpacking can actually do, and draws the line on `:=` precisely enough that you can defend either choice in review.",

  objectives: [
    "Use starred, nested and keyword unpacking fluently",
    "Merge and forward collections with `*` and `**` at call sites",
    "Apply the walrus operator in the three cases where it genuinely improves a line",
    "Recognise the walrus uses that hurt readability",
    "Explain why unpacking is safer than indexing"
  ],

  prerequisites: ["2.2", "2.11"],

  blocks: [

    { t: "h2", n: "01", text: "Unpacking is a length assertion", id: "assertion" },


    { t: "viz",
      title: "Unpacking, and where the star goes",
      caption: "A starred target absorbs whatever is left over, always as a list. Exactly one star is allowed, and it can sit anywhere — which is what makes head/tail and first/last splits one line each.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Three unpacking forms showing which elements the starred target absorbs">
  <g class="s-sub" style="fill:var(--ink-2)">
    <text x="30" y="66">first, *rest    = [1, 2, 3, 4, 5]</text>
    <text x="30" y="110">*init, last     = [1, 2, 3, 4, 5]</text>
    <text x="30" y="154">a, *mid, z      = [1, 2, 3, 4, 5]</text>
  </g>

  <g class="s-sub">
    <text x="460" y="66"  style="fill:var(--good)">1</text>
    <text x="490" y="66"  style="fill:var(--accent)">[2, 3, 4, 5]</text>
    <text x="460" y="110" style="fill:var(--accent)">[1, 2, 3, 4]</text>
    <text x="570" y="110" style="fill:var(--good)">5</text>
    <text x="460" y="154" style="fill:var(--good)">1</text>
    <text x="490" y="154" style="fill:var(--accent)">[2, 3, 4]</text>
    <text x="580" y="154" style="fill:var(--good)">5</text>
  </g>

  <text x="680" y="66"  class="s-sub" style="fill:var(--ink-3)">the star always</text>
  <text x="680" y="86"  class="s-sub" style="fill:var(--ink-3)">yields a list,</text>
  <text x="680" y="106" class="s-sub" style="fill:var(--ink-3)">possibly empty</text>

  <text x="30" y="196" class="s-sub" style="fill:var(--ink-3)">The walrus := is the other half of this lesson: it binds inside an expression, so a value can be tested and kept at once.</text>
</svg>`
    },
    { t: "p", text: "The underrated property: unpacking **checks the shape**. Indexing does not, and that difference catches bugs." },

    { t: "code", lang: "python", title: "the same data, two ways to read it", code: `
row = "2024-01-15,deploy,ok".split(",")

# Indexing: silent on the wrong shape
date = row[0]
action = row[1]                    # if the CSV gains a column, this is
status = row[2]                    # still "valid" and now wrong

# Unpacking: raises the moment the shape changes
date, action, status = row
`,
      out: `ValueError: too many values to unpack (expected 3)`,
      caption: "When the upstream file gains a column, the indexing version keeps running and silently reads the wrong fields into the wrong names. The unpacking version stops immediately with a message about the shape — which is the failure you want."
    },

    { t: "code", lang: "python", title: "the full vocabulary", code: `
# Basic, and the swap that needs no temporary
a, b = 1, 2
a, b = b, a

# Starred target: absorbs the remainder, always a list
first, *rest = [1, 2, 3, 4]
*head, last = [1, 2, 3, 4]
first, *middle, last = [1, 2, 3, 4]
print(first, middle, last)

# Nested, mirroring the structure
(name, (lat, lon)), timestamp = ("London", (51.5, -0.1)), 1700000000
print(name, lat)

# In a for loop -- the most common place people use it without noticing
for index, (key, value) in enumerate({"a": 1, "b": 2}.items()):
    print(index, key, value)

# Ignoring fields: _ by convention, *_ for "the rest, whatever it is"
_, action, *_ = ["2024-01-15", "deploy", "ok", "1.2s", "eu-west"]
print(action)
`,
      out: `1 [2, 3] 4
London 51.5
0 a 1
1 b 2
deploy`
    },

    { t: "callout", kind: "insight", title: "A starred target is always a list", body: [
      { t: "code", lang: "python", title: "regardless of the source", numbered: false, code: `
first, *rest = (1, 2, 3)        # a tuple in
print(type(rest))               # a list out

first, *rest = "abc"
print(rest)                     # ['b', 'c']

# And it can be empty, which is why it never raises for a short input
only, *rest = [1]
print(rest)`,
        out: `<class 'list'>
['b', 'c']
[]`},
      { t: "p", text: "That last case is worth noting: `a, *rest = [1]` succeeds with an empty `rest`, so a starred target **removes the length assertion** for everything it absorbs. `a, b = [1]` raises; `a, *b = [1]` does not." }
    ]},

    { t: "h2", n: "02", text: "Unpacking at call sites", id: "call-sites" },

    { t: "code", lang: "python", title: "spreading, merging and forwarding", code: `
# Spread a sequence into positional arguments
point = (3, 7)
print(max(*point))

# Spread a mapping into keyword arguments
options = {"sep": " | ", "end": "!\\n"}
print("a", "b", **options)

# Merge collections -- later values win (Lesson 2.3)
defaults = {"timeout": 30, "retries": 3}
overrides = {"timeout": 5}
merged = {**defaults, **overrides}
print(merged)

# Build a list from several sources
combined = [*required_headers, *optional_headers, "x-request-id"]

# Forward everything a function received (Lesson 3.2)
def wrapper(*args, **kwargs):
    return inner(*args, **kwargs)
`,
      out: `7
a | b!
{'timeout': 5, 'retries': 3}`
    },

    { t: "callout", kind: "warn", title: "`{**a, **b}` is a shallow merge", body: [
      { t: "p", text: "Merging copies the top level only, so nested values are shared with the originals — the Lesson 2.4 trap, and the reason layered configuration needs a recursive merge or typed settings (Lesson 2.9)." },
      { t: "code", lang: "python", title: "and it replaces whole subtrees", numbered: false, code: `
defaults = {"db": {"host": "localhost", "port": 5432}}
override = {"db": {"host": "prod"}}

print({**defaults, **override})     # port is GONE`,
        out: `{'db': {'host': 'prod'}}`}
    ]},

    { t: "h2", n: "03", text: "The walrus operator", id: "walrus" },

    { t: "p", text: "`:=` assigns **as part of an expression**, so a value can be bound and used in the same place. It exists because three specific patterns previously required either duplication or an awkward restructure." },

    { t: "ladder",
      title: "Filtering on an expensive computed value",
      rungs: [
        { level: "bad", label: "Compute twice", why: "double the work, and they can drift",
          code: `results = [
    expensive(item)
    for item in items
    if expensive(item) is not None
]`,
          note: "`expensive` runs twice per item, and if it is not deterministic the filtered value can differ from the returned one. Doubling the cost of a comprehension is easy to miss in review because the duplication reads as symmetry." },

        { level: "ok", label: "Restructure as a loop", why: "correct, and longer",
          code: `results = []
for item in items:
    value = expensive(item)
    if value is not None:
        results.append(value)`,
          note: "Correct and perfectly readable — this was the standard answer before 3.8 and remains a good one. It is four lines where the intent is one, and it turns a declaration of what you want into instructions for building it (Lesson 2.11)." },

        { level: "best", label: "Walrus", why: "computed once, expressed once",
          code: `results = [
    value
    for item in items
    if (value := expensive(item)) is not None
]`,
          note: "The assignment happens in the `if`, and the bound name is used in the output expression. This is the case the operator was designed for, and it is the one where it is unambiguously better than both alternatives — one evaluation, one line, and the intent stays declarative." }
      ]
    },

    { t: "code", lang: "python", title: "the other two cases it was made for", code: `
import re

# 2. A while loop reading until exhaustion -- no priming read, no
#    "while True" with a break buried in the middle
while (chunk := stream.read(8192)):
    process(chunk)

# The pre-3.8 alternatives, both worse:
#   chunk = stream.read(8192)          # priming read, duplicated call
#   while chunk:
#       process(chunk)
#       chunk = stream.read(8192)      # easy to forget, infinite loop

# 3. Using a match object in the branch that tested for it
if (m := re.match(r"(\\d{4})-(\\d{2})-(\\d{2})", text)):
    year, month, day = m.groups()      # no separate assignment line
elif (m := re.match(r"(\\d{2})/(\\d{2})/(\\d{4})", text)):
    day, month, year = m.groups()
`,
      caption: "All three share a shape: **a value is needed both to make a decision and to use afterwards.** Where that is not true, the walrus adds nothing."
    },

    { t: "callout", kind: "trap", title: "Where the walrus hurts", body: [
      { t: "code", lang: "python", title: "four uses to reject in review", numbered: false, code: `
# 1. A plain assignment wearing a disguise
(count := len(items))              # just write count = len(items)

# 2. Several in one expression -- unreadable
if (a := f()) and (b := g(a)) and (c := h(b)):
    ...

# 3. Hiding a side effect inside a condition
if (user := db.fetch(user_id)) and user.active:
    ...                            # the DB call is invisible at a glance

# 4. In a comprehension's output expression -- surprising scope
[y := f(x) for x in data]          # y leaks to the enclosing scope`},
      { t: "p", text: "Case 4 is genuinely surprising and worth knowing: a comprehension has its own scope (Lesson 2.11), but **the walrus deliberately binds in the enclosing scope**. That is occasionally useful — keeping the last computed value — and mostly a source of confusion." },
      { t: "p", text: "**The test:** does the value get used again in the same statement? If yes, the walrus earns its place. If it is used on a later line, a normal assignment is clearer — you have gained nothing and made the binding harder to spot." }
    ]},

    { t: "h2", n: "04", text: "Unpacking in function signatures and returns", id: "signatures" },

    { t: "code", lang: "python", title: "multiple returns, named", code: `
from typing import NamedTuple


# A bare tuple: unpacks, but the caller must remember the order
def parse_range(text: str) -> tuple[int, int]:
    lo, _, hi = text.partition("-")
    return int(lo), int(hi)


start, end = parse_range("10-20")


# A NamedTuple: unpacks AND has names (Lesson 2.2)
class Range(NamedTuple):
    start: int
    end: int


def parse_range(text: str) -> Range:
    lo, _, hi = text.partition("-")
    return Range(int(lo), int(hi))


r = parse_range("10-20")
start, end = r              # still unpacks
print(r.start, r[0], r)     # and has names, indexing and a good repr
`,
      out: `10 10 Range(start=10, end=20)`,
      caption: "A `NamedTuple` return is strictly better than a bare tuple past two fields: existing unpacking call sites keep working, and new ones can use names. Adding a third field to a bare tuple silently breaks every `a, b = f()` in the codebase."
    },

    { t: "callout", kind: "good", title: "Unpacking in a `for` is a shape check too", body: [
      { t: "code", lang: "python", title: "the loop that catches a data change", numbered: false, code: `
# Indexing: a malformed row is read as if it were fine
for row in rows:
    process(row[0], row[1])

# Unpacking: a row of the wrong width raises, naming the problem
for order_id, amount in rows:
    process(order_id, amount)

# And with strict zip, mismatched sources raise too (Lesson 2.10)
for order_id, total in zip(ids, totals, strict=True):
    ...`},
      { t: "p", text: "Both loops are the same length. One reports a data problem at the row that has it; the other carries on with the wrong values. Preferring unpacking to indexing is free, and it converts a class of silent corruption into an exception." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Rewrite six lines, and reject two suggestions",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "Six snippets to improve with unpacking or the walrus. Two of the improvements a colleague suggests are wrong — identify which and say why." }
      ],
      requirements: [
        "**A.** A loop using `row[0]`, `row[1]`, `row[2]` — make it fail loudly on a shape change.",
        "**B.** A `while True` with a read and a `break` — restructure it.",
        "**C.** A comprehension calling a costly function twice — evaluate it once.",
        "**D.** A function returning a 3-tuple whose callers unpack positionally — make it extensible.",
        "**E.** A colleague suggests `(total := sum(items))` on its own line. Accept or reject, with a reason.",
        "**F.** A colleague suggests `if (user := db.fetch(uid)) and user.active:`. Accept or reject, with a reason.",
        "Write a test proving A fails on a malformed row rather than processing it."
      ],
      hint: "For E and F, apply the test: is the value used again in the same statement? And separately, does the line hide something expensive?",
      solution: {
        lang: "python",
        title: "rewrites.py",
        code: `from __future__ import annotations

import re
from decimal import Decimal
from typing import NamedTuple


# =========================================================================
# A. Indexing -> unpacking: a shape change now raises
# =========================================================================

def before_a(rows):
    for row in rows:
        # If the export gains a column, these still "work" and read the
        # wrong fields into the wrong names -- silently.
        process(row[0], row[1], row[2])


def after_a(rows: list[list[str]]) -> None:
    for order_id, sku, amount in rows:
        # A row of the wrong width raises here, naming the row, instead
        # of corrupting three fields quietly.
        process(order_id, sku, amount)


# =========================================================================
# B. while True + break  ->  walrus
# =========================================================================

def before_b(stream):
    while True:
        chunk = stream.read(8192)
        if not chunk:
            break
        process(chunk)


def after_b(stream) -> None:
    # The exit condition is now visible in the loop header rather than
    # buried three lines in.
    while chunk := stream.read(8192):
        process(chunk)


# =========================================================================
# C. Double evaluation -> walrus
# =========================================================================

def before_c(items):
    return [parse(i) for i in items if parse(i) is not None]   # 2x cost


def after_c(items: list[str]) -> list[Record]:
    return [record for i in items if (record := parse(i)) is not None]


# =========================================================================
# D. Bare tuple -> NamedTuple
# =========================================================================

def before_d(text):
    return text[:4], text[5:7], text[8:10]      # what are these?


class ParsedDate(NamedTuple):
    year: str
    month: str
    day: str


def after_d(text: str) -> ParsedDate:
    """Existing "y, m, d = after_d(s)" call sites keep working, AND a
    fourth field can be added later without breaking them -- because
    new callers use names."""
    return ParsedDate(text[:4], text[5:7], text[8:10])


# =========================================================================
# E. REJECT:  (total := sum(items))  on its own line
# =========================================================================
#
#   (total := sum(items))
#
# The value is not used again in the same statement, so the walrus
# achieves nothing that "total = sum(items)" does not -- and it costs
# a pair of parentheses plus a moment of "why is this an expression?"
# for every reader.
#
# ruff flags it. The test is: IS THE VALUE USED AGAIN IN THIS STATEMENT?
# Here it is not, so a plain assignment is correct.

total = sum(items)


# =========================================================================
# F. REJECT (with a nuance):
#        if (user := db.fetch(uid)) and user.active:
# =========================================================================
#
# The walrus itself is legitimate here -- user IS used again in the same
# statement, so the test passes. The problem is what it hides: db.fetch
# is a network call, and burying it inside a condition makes the cost
# invisible at a glance. This is the same objection as a property that
# does I/O (Lesson 4.4) -- the syntax promises something cheap.
#
# Rejected in favour of:

def load_active_user(uid: str) -> User | None:
    user = db.fetch(uid)                 # the I/O is on its own line
    return user if user and user.active else None

# The walrus would be fine for a CHEAP call in the same shape:
#     if (m := PATTERN.match(text)) and m.group(1):


# =========================================================================
# the test for A
# =========================================================================

def test_malformed_row_raises_rather_than_corrupting() -> None:
    processed: list[tuple] = []

    def process(order_id, sku, amount):
        processed.append((order_id, sku, amount))

    globals()["process"] = process

    good = [["o-1", "W-1", "19.99"]]
    after_a(good)
    assert processed == [("o-1", "W-1", "19.99")]

    # A row that gained a column -- the exact upstream change that the
    # indexing version would have absorbed silently.
    try:
        after_a([["o-2", "W-2", "5.00", "eu-west"]])
    except ValueError as exc:
        assert "too many values" in str(exc)
    else:
        raise AssertionError("a 4-column row must not be processed silently")

    # And a short row
    try:
        after_a([["o-3", "W-3"]])
    except ValueError as exc:
        assert "not enough values" in str(exc)
    else:
        raise AssertionError("a 2-column row must raise")

    assert len(processed) == 1          # only the good row got through


if __name__ == "__main__":
    test_malformed_row_raises_rather_than_corrupting()
    print("A-D rewritten; E and F rejected")`,
        notes: [
          { t: "p", text: "**F is the interesting rejection**, because the walrus is used correctly there. `user` genuinely is used again in the same statement, so the mechanical test passes — and the line is still wrong, because it hides a network call inside a condition. Two separate criteria: *does the walrus earn its place*, and *does this line hide something expensive*." },
          { t: "p", text: "**A's test asserts both directions.** A row with an extra column and a row with a missing one both raise, with different messages, and the good row still processes. The indexing version would have silently succeeded on the four-column row — which is the exact upstream change that happens when someone adds a field to an export." },
          { t: "p", text: "**D's `NamedTuple` is backward-compatible by construction.** Every existing `y, m, d = parse(s)` keeps working because a `NamedTuple` unpacks like a tuple, and new callers can use `.year`. Converting a bare tuple return to a `NamedTuple` is one of the safest refactors available." },
          { t: "callout", kind: "insight", title: "The two tests, stated plainly", body: [
            { t: "p", text: "**For the walrus:** is the value used again in the same statement? If not, a plain assignment is clearer and shorter." },
            { t: "p", text: "**For unpacking:** does this code know how many items it should receive? If yes, unpack — the length assertion is free and turns silent corruption into an exception. If the length genuinely varies, a starred target says so explicitly." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "An analytics job reads a partner's CSV export with `region = row[3]`. The partner adds a `currency` column in position 3, shifting everything right. The job keeps running for two weeks and every report attributes revenue to the wrong region." },
      { t: "p", text: "**Indexing cannot detect a shape change.** `row[3]` is valid for any row with at least four columns, so the job read a currency code into a variable named `region` and carried on. Nothing raised, no log line, and the output looked entirely plausible — which is why it survived two weeks of reports." },
      { t: "p", text: "**Unpacking would have failed on the first row.** `order_id, sku, amount, region = row` raises `ValueError: too many values to unpack` immediately, naming the mismatch. Where a partner may legitimately add trailing columns, `order_id, sku, amount, region, *_ = row` accepts extras while still asserting the first four." },
      { t: "p", text: "The habit worth forming: **when you know how many fields you expect, unpack rather than index.** It costs nothing, reads better, and converts an entire class of silent data corruption into an exception at the row that caused it. Pair it with `zip(..., strict=True)` (Lesson 2.10) and header validation, and schema drift stops being invisible." }
    ]}
  ],

  takeaways: [
    "**Unpacking asserts the shape; indexing does not.** `a, b, c = row` raises when the width changes, where `row[2]` silently reads the wrong field.",
    "A starred target absorbs the remainder and is **always a list**, even from a tuple or a string — and it can be empty, which removes the length assertion for what it absorbs.",
    "`*` and `**` spread at call sites, merge collections, and forward arguments. `{**a, **b}` is a **shallow** merge that replaces whole subtrees.",
    "**The walrus earns its place in three cases:** filtering on a computed value in a comprehension, `while (chunk := read())`, and using a match object in the branch that tested for it.",
    "All three share one shape: **a value is needed both to make a decision and to use afterwards.**",
    "**The test for `:=`** — is the value used again in the same statement? If not, a plain assignment is clearer.",
    "The walrus binds in the **enclosing** scope even inside a comprehension, which is deliberate and occasionally surprising.",
    "A walrus can be used correctly and still be wrong — burying a network call inside a condition hides its cost, exactly like a property that does I/O.",
    "**Return a `NamedTuple` rather than a bare tuple** past two fields: existing unpacking call sites keep working, and adding a field no longer breaks them.",
    "Prefer unpacking to indexing in `for` loops. It is the same length, and it turns schema drift into an exception at the offending row."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A partner's CSV gains a column, shifting fields right. Code reading `region = row[3]` runs for two weeks producing wrong reports. What would have caught it?",
        options: [
          "A try/except around the row access",
          "Unpacking — `order_id, sku, amount, region = row` raises immediately when the width changes",
          "Converting the rows to a dict first",
          "Nothing — schema drift is undetectable in application code"
        ],
        answer: 1,
        why: "`row[3]` is valid for any row with four or more columns, so indexing cannot detect a shape change — it reads a different field into the same variable name and carries on. Unpacking asserts the count, so a wider or narrower row raises `ValueError` at the row that caused it. A `try/except` catches nothing because nothing was raised. Where trailing columns are legitimate, `a, b, c, d, *_ = row` still asserts the first four."
      },
      {
        stem: "What is the type of `rest` after `first, *rest = (1, 2, 3)`?",
        options: [
          "`tuple`, matching the source",
          "`list`, always — a starred target produces a list regardless of the source type",
          "`Iterator`, evaluated lazily",
          "It depends on the source; a tuple gives a tuple"
        ],
        answer: 1,
        why: "A starred target always collects into a `list`, whatever it unpacks from — a tuple, a string, a generator. Worth knowing alongside a second property: a starred target can be empty, so `a, *rest = [1]` succeeds with `rest == []`. That means the star removes the length assertion for whatever it absorbs, while the non-starred names before and after it are still checked."
      },
      {
        stem: "Which use of the walrus operator genuinely improves the code?",
        options: [
          "`(count := len(items))` on its own line",
          "`[v for x in data if (v := expensive(x)) is not None]` — the value is computed once and used again in the same statement",
          "`if (user := db.fetch(uid)) and user.active:` — it shortens the lookup",
          "`[y := f(x) for x in data]` — it keeps the last value available"
        ],
        answer: 1,
        why: "Option B is the case the operator was designed for: without it you either call `expensive` twice or restructure into a four-line loop. Option A is a plain assignment with extra parentheses. Option C uses the walrus correctly but hides a network call inside a condition, which is a separate problem. Option D leaks `y` into the enclosing scope — deliberate behaviour, and rarely what a reader expects."
      },
      {
        stem: "Why prefer a `NamedTuple` return over a bare 3-tuple?",
        options: [
          "It is faster to construct and unpack",
          "Existing unpacking call sites keep working *and* new callers can use names — so adding a field later does not break every `a, b, c = f()`",
          "Bare tuples cannot be type-annotated",
          "It prevents callers from unpacking the result"
        ],
        answer: 1,
        why: "A `NamedTuple` is a tuple, so every `a, b, c = f()` continues to work unchanged — but it also has attribute access, indexing and a useful `repr`. That combination makes converting a bare tuple return one of the safest refactors available: nothing breaks today, and adding a fourth field tomorrow no longer silently breaks every positional unpack in the codebase."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why prefer unpacking over indexing?",
        strong: "Because unpacking asserts the shape. `a, b, c = row` raises if the row is the wrong width, while `row[2]` is valid for anything with three or more elements — so a schema change silently reads a different field into the same variable name.",
        answer: [
          { t: "p", text: "The concrete failure makes the argument: a partner adds a CSV column, everything shifts right, and an indexing-based job produces plausible-looking wrong reports for weeks because nothing raised." },
          { t: "p", text: "It costs nothing — the two lines are the same length — which is what makes it a habit worth having rather than a trade-off to weigh." },
          { t: "p", text: "The nuance worth adding: `a, b, c, *_ = row` accepts trailing extras while still asserting the first three, which is the right form when a source may legitimately grow." }
        ]
      },
      {
        level: "core",
        q: "When would you use the walrus operator?",
        strong: "When a value is needed both to make a decision and to use afterwards, in the same statement. Three cases: filtering on a computed value inside a comprehension, `while (chunk := read())`, and using a regex match in the branch that tested for it.",
        answer: [
          { t: "p", text: "Leading with the shared shape rather than a list of examples shows you have a rule: the value is used twice in one statement. Where it is not, a plain assignment is shorter and clearer." },
          { t: "p", text: "The comprehension case is the strongest justification, because the alternatives are genuinely worse — either call the expensive function twice or restructure a declarative comprehension into a four-line loop." },
          { t: "p", text: "A detail that shows depth: the walrus binds in the *enclosing* scope even inside a comprehension, which is deliberate but surprises people who know comprehensions have their own scope." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague writes `if (user := db.fetch(uid)) and user.active:`. Do you approve it?",
        strong: "The walrus is used correctly — `user` is needed again in the same statement — but I would still push back, because it buries a network call inside a condition where its cost is invisible. Two separate criteria: does the walrus earn its place, and does the line hide something expensive.",
        answer: [
          { t: "p", text: "Separating the two criteria is what makes this a good answer. Approving or rejecting on the walrus alone misses the real objection, which is about visible cost rather than syntax." },
          { t: "p", text: "It connects to a pattern seen earlier in the course — a property that does I/O breaks the promise attribute syntax makes, and this breaks the promise a condition makes. Both hide a network call behind something that reads as cheap." },
          { t: "p", text: "Being specific about when it *would* be fine keeps the feedback actionable: the identical shape with a cheap call, `if (m := PATTERN.match(text)) and m.group(1)`, is exactly what the operator is for." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 9.9 — Property-Based Testing with Hypothesis
   ========================================================================= */
EC.receiveLesson({
  id: "9.9",

  lede: "An example-based test checks the inputs you thought of. The bugs that reach production live in the inputs you did not — the one-cent bill split two ways, the empty list, the price that is not exactly representable as a float. **A property-based test states something that must be true for every input, and a library generates hundreds of inputs trying to break it**, then shrinks the first failure to the smallest case that still fails. This lesson is how to write properties that find real bugs, and how to keep them fast and deterministic in CI.",

  objectives: [
    "Explain how a property-based test differs from a parameterised one, and what generation and shrinking add",
    "Write properties with Hypothesis using `@given` and composed strategies such as `st.builds`",
    "Recognise the five property patterns — invariant, round-trip, oracle, idempotence and metamorphic — and pick one for a function",
    "Read a Hypothesis failure report and pin the case with `@example`",
    "Keep property tests fast and reproducible in CI, and avoid properties that only restate the implementation"
  ],

  prerequisites: ["9.2", "9.4"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The bug two example tests passed", id: "bug" },

    { t: "p", text: "Here is a function that splits a bill into equal shares, rounded to the cent. It has two tests, both reasonable, both passing." },

    { t: "code", lang: "python", title: "billing.py, and its tests", code: `
from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")


def split_amount(total: Decimal, parts: int) -> list[Decimal]:
    """Split a bill into equal shares, rounded to the cent."""
    share = (total / parts).quantize(CENT, rounding=ROUND_HALF_UP)
    return [share] * parts


# ---- test_examples.py --------------------------------------------------
def test_even_split():
    assert split_amount(Decimal("30.00"), 3) == [Decimal("10.00")] * 3


def test_two_ways():
    assert split_amount(Decimal("19.98"), 2) == [Decimal("9.99")] * 2
`,
      out: `2 passed in 2.89s` },

    { t: "p", text: "Both tests chose totals that divide exactly. Nobody wrote the test for a total that does not, because the person writing the test had the same blind spot as the person writing the code. Now state what must be true of *any* split — **the shares add up to the total** — and let Hypothesis choose the inputs:" },

    { t: "code", lang: "python", title: "test_properties.py", code: `
from decimal import Decimal

from hypothesis import given, strategies as st

from billing import split_amount

money = st.decimals(min_value=Decimal("0.01"), max_value=Decimal("10000"), places=2)


@given(total=money, parts=st.integers(min_value=1, max_value=12))
def test_shares_add_up_to_the_total(total, parts):
    assert sum(split_amount(total, parts)) == total
`,
      out: `E       AssertionError: assert Decimal('0.02') == Decimal('0.01')
E        +  where Decimal('0.02') = sum([Decimal('0.01'), Decimal('0.01')])
E        +    where [Decimal('0.01'), Decimal('0.01')] = split_amount(Decimal('0.01'), 2)
E       Failing test case: test_shares_add_up_to_the_total(
E           total=Decimal('0.01'),
E           parts=2,
E       )
FAILED test_properties.py::test_shares_add_up_to_the_total - AssertionError: ...
1 failed`,
      caption: "**One cent split two ways is half a cent each, which rounds up to a cent each — so the customer is charged two cents for a one-cent bill.** At scale that is money appearing from nowhere in a ledger that must reconcile." },

    { t: "p", text: "Look at how small the reported case is. Hypothesis did not find `0.01` and `2` first; it found some larger failing pair, then **shrank** it — trying smaller totals, fewer parts, simpler values — until no simpler input still failed. The report is the minimal reproduction a human would have taken twenty minutes to find." },

    {"t": "diagram", "kind": "steps", "title": "What @given does with one test function", "caption": "**Generation finds a failure; shrinking makes it understandable; the database makes it permanent.** Hypothesis stores every failing case in a local `.hypothesis/` directory and replays it first on the next run, so a bug it found once is tried again until it is fixed — even if random generation would not stumble on it twice.", "items": [
      {"label": "Generate", "desc": "draw inputs from the strategies, biased toward edges: 0, empty, min, max", "tone": "accent"},
      {"label": "Run", "desc": "call the test body; by default up to 100 examples", "tone": "accent"},
      {"label": "Fail", "desc": "the first exception or failed assertion stops generation", "tone": "crit"},
      {"label": "Shrink", "desc": "simplify the input step by step while it still fails", "tone": "warn"},
      {"label": "Report and remember", "desc": "print the minimal case, save it to .hypothesis/ for replay", "tone": "good"}
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Fixing it, and pinning the case", id: "fix" },

    { t: "p", text: "The fix is to work in whole cents and distribute the remainder, so shares differ by at most one cent and always sum to the total. With the bug understood, the test can say more than one thing — and keep the case that found the bug forever:" },

    { t: "code", lang: "python", title: "billing.py, fixed, with three properties", code: `
from decimal import Decimal

from hypothesis import example, given, strategies as st

CENT = Decimal("0.01")


def split_amount(total: Decimal, parts: int) -> list[Decimal]:
    """Split into shares that differ by at most a cent and sum exactly to total."""
    cents = int(total / CENT)
    base, extra = divmod(cents, parts)
    return [(base + 1) * CENT if i < extra else base * CENT for i in range(parts)]


money = st.decimals(min_value=Decimal("0.01"), max_value=Decimal("10000"), places=2)


@given(total=money, parts=st.integers(min_value=1, max_value=12))
@example(total=Decimal("0.01"), parts=2)          # the case that found the bug, kept forever
def test_split_properties(total, parts):
    shares = split_amount(total, parts)
    assert len(shares) == parts
    assert sum(shares) == total                    # nothing lost, nothing invented
    assert max(shares) - min(shares) <= CENT       # as fair as cents allow
`,
      out: `1 passed in 12.75s` },

    { t: "callout", kind: "good", title: "Turn every found bug into an @example", body: [
      { t: "p", text: "The `.hypothesis/` database is local: a fresh CI checkout does not have it. `@example(...)` is how a case becomes part of the test file — always run, in every environment, readable by the next person as \"this exact input once broke us\"." }
    ]},

    { t: "ladder", title: "Testing the bill split", rungs: [
      { level: "bad", label: "One hand-picked example", why: "tests what you already believed", code: `def test_split():
    assert split_amount(Decimal("30.00"), 3) == [Decimal("10.00")] * 3`, note: "Passes for the buggy implementation. The example was chosen by someone who expected exact division." },
      { level: "ok", label: "A parameterised table", why: "more cases, same blind spot", code: `@pytest.mark.parametrize("total, parts", [
    (Decimal("30.00"), 3), (Decimal("10.00"), 4), (Decimal("0.03"), 3),
])
def test_split(total, parts):
    assert sum(split_amount(total, parts)) == total`, note: "Better: the assertion is now a property. But every row is still an input someone thought of, and none of these exposes the bug." },
      { level: "best", label: "A property over generated inputs", why: "finds what you did not think of", code: `@given(total=money, parts=st.integers(min_value=1, max_value=12))
@example(total=Decimal("0.01"), parts=2)
def test_split(total, parts):
    shares = split_amount(total, parts)
    assert sum(shares) == total
    assert max(shares) - min(shares) <= CENT`, note: "Hundreds of inputs per run, biased toward the edges, with known failures replayed. Keep the parameterised table too, for cases that document intent." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Strategies: describing the inputs", id: "strategies" },

    { t: "p", text: "A strategy describes a space of values. The built-in ones cover the primitives — `st.integers`, `st.text`, `st.decimals`, `st.datetimes`, `st.lists` — and they compose. `st.builds` calls a constructor with values drawn from the strategies you give it, so a domain object is one expression:" },

    { t: "code", lang: "python", title: "a round-trip property over a dataclass", code: `
import json
from dataclasses import asdict, dataclass
from decimal import Decimal

from hypothesis import given, strategies as st


@dataclass(frozen=True)
class Line:
    sku: str
    qty: int
    price: Decimal


def to_json(line: Line) -> str:
    return json.dumps({**asdict(line), "price": float(line.price)})


def from_json(text: str) -> Line:
    data = json.loads(text)
    return Line(data["sku"], data["qty"], Decimal(data["price"]))


lines = st.builds(
    Line,
    sku=st.text(min_size=1, max_size=12),
    qty=st.integers(min_value=1, max_value=1000),
    price=st.decimals(min_value=Decimal("0"), max_value=Decimal("10000"), places=2),
)


@given(lines)
def test_json_round_trip(line):
    assert from_json(to_json(line)) == line
`,
      out: `E         Drill down into differing attribute price:
E           price: Decimal('0.01000000000000000020816681711721685132943093776702880859375') != Decimal('0.01')
E       Failing test case: test_json_round_trip(
E           line=Line(sku='0', qty=1, price=Decimal('0.01')),
E       )`,
      caption: "The serialiser wrote money as a float and the reader built a `Decimal` from that float — so the round trip invents digits (Lesson 1.5). Shrinking reduced the line to the simplest one that shows it: a one-character SKU, quantity 1, one cent. The fix is to write `str(line.price)`." },

    { t: "dl", items: [
      ["`st.builds(cls, **strategies)`", "Construct domain objects. Unspecified arguments are inferred from type hints where possible."],
      ["`.map(f)` / `.filter(p)`", "Transform or restrict values. Prefer `map` and tighter bounds over `filter`, which discards draws and slows generation."],
      ["`st.one_of(a, b)`, `st.sampled_from(xs)`", "Choose between strategies, or from a fixed set — `st.sampled_from(Status)` draws enum members (Lesson 4.13)."],
      ["`assume(cond)`", "Discard an example inside the test. Use sparingly: if most draws are discarded, Hypothesis raises a health-check error rather than silently testing nothing."]
    ]},

    { t: "callout", kind: "trap", title: "A property that restates the implementation proves nothing", body: [
      { t: "p", text: "The tempting first property is the function's own formula: `assert split_amount(t, n) == [(t / n).quantize(CENT)] * n`. **It passes, because it contains the same bug.** A test that recomputes the answer the way the code does can only detect typos, never a wrong idea." },
      { t: "p", text: "**Assert what must be true of the output, not how it was computed**: the shares sum to the total, they differ by at most a cent, there are `parts` of them. None of those mentions rounding, which is why they caught the rounding bug." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Five patterns for finding a property", id: "patterns" },

    { t: "p", text: "The hard part is rarely Hypothesis; it is knowing what to assert when you cannot write down the expected output. Almost every useful property is one of five shapes:" },

    { t: "table",
      head: ["Pattern", "Shape", "Good for"],
      rows: [
        ["Invariant", "Something about the output always holds: `sum(shares) == total`, `len(page) <= size`", "Calculations, data transformations"],
        ["Round-trip", "`decode(encode(x)) == x`", "Serialisers, parsers, codecs, database mappers"],
        ["Oracle", "`fast(x) == slow_but_obviously_right(x)`", "Optimised code, a rewrite, a cache"],
        ["Idempotence", "`f(f(x)) == f(x)`", "Normalisation, deduplication, formatting, migrations"],
        ["Metamorphic", "Changing the input in a known way changes the output in a known way: sorting a shuffled list gives the same result", "Search, ranking, anything without a known answer"]
      ],
      caption: "Round-trip is the one to reach for first: almost every system has a serialise/parse pair at a boundary, and it is where float money, time zones and encodings quietly break." },

    {"t": "diagram", "kind": "compare", "title": "Example-based against property-based", "caption": "**They are complementary.** Examples document the cases that matter to the business and read as specification; properties search the space around them for the cases nobody listed. A mature suite has both, and every bug a property finds becomes an `@example`.", "columns": [
      {"title": "example-based", "tone": "accent", "items": ["you choose the inputs", "you know the exact output", "fast, readable, specific", "blind where you are blind"]},
      {"title": "property-based", "tone": "good", "items": ["the library chooses inputs", "you state what must hold", "hundreds of cases per run", "minimal failing case reported"]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Fast and reproducible in CI", id: "ci" },

    { t: "p", text: "By default each property runs up to 100 examples with a fresh random seed. That is right on a laptop, where variety finds bugs. In CI you usually want the opposite trade: a fixed budget and a reproducible run, so a failure on a pull request is the same failure when someone re-runs it." },

    { t: "code", lang: "python", title: "conftest.py — profiles per environment", code: `
import os

from hypothesis import HealthCheck, settings

settings.register_profile("dev", max_examples=100)
settings.register_profile(
    "ci",
    max_examples=200,
    derandomize=True,                 # same examples every run: reproducible failures
    deadline=None,                    # CI machines are slow and noisy; do not fail on timing
    suppress_health_check=[HealthCheck.too_slow],
)
settings.load_profile(os.getenv("HYPOTHESIS_PROFILE", "dev"))
` },

    { t: "callout", kind: "tradeoff", title: "Derandomised CI against a nightly search", body: [
      { t: "p", text: "`derandomize=True` makes CI deterministic, which is what you want for a merge gate — but it also means CI explores the same inputs forever. **Run a separate nightly job with a larger `max_examples` and randomness on**, so the search keeps going without making pull requests flaky. Any failure it finds becomes an `@example` and joins the fast suite." }
    ]},

    { t: "callout", kind: "insight", title: "Beyond single functions", body: [
      { t: "p", text: "Hypothesis can also test stateful systems: `RuleBasedStateMachine` generates *sequences* of operations — add, remove, checkout — and checks invariants after each step, shrinking a failing sequence to the shortest one. It is the natural next step for a cache, a shopping basket or the order lifecycle from Lesson 4.13." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Pin down a paginator with properties",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "This paginator has been in production for months and its example tests pass. Write properties that would catch any mistake in it, run them, and fix what they find." },
        { t: "code", lang: "python", title: "pages.py, as inherited", code: `def paginate(items: list, size: int) -> list[list]:
    pages = []
    for start in range(0, len(items) - 1, size):
        pages.append(items[start:start + size])
    return pages` }
      ],
      requirements: [
        "A property that the pages, concatenated, equal the input exactly",
        "A property that every page but the last is full, and no page is empty or over-size",
        "A property for the number of pages, using `math.ceil`",
        "Report the minimal failing case Hypothesis finds, then fix the function so all properties pass",
        "Reject `size < 1` with a `ValueError`, and test that with an ordinary example test"
      ],
      hint: "Start with the round-trip-like property — concatenating the pages must give back the input. It needs no knowledge of how pagination works, which is exactly why it catches the bug.",
      solution: {
        lang: "python",
        title: "test_pages.py",
        code: `"""Pagination, and the properties that pin it down."""
from math import ceil

import pytest
from hypothesis import given, strategies as st


def paginate(items: list, size: int) -> list[list]:
    if size < 1:
        raise ValueError("size must be at least 1")
    return [items[start:start + size] for start in range(0, len(items), size)]


items = st.lists(st.integers())
sizes = st.integers(min_value=1, max_value=50)


@given(items, sizes)
def test_pages_concatenate_to_the_input(xs, size):
    assert [x for page in paginate(xs, size) for x in page] == xs


@given(items, sizes)
def test_every_page_is_full_except_the_last(xs, size):
    pages = paginate(xs, size)
    assert all(len(p) == size for p in pages[:-1])
    assert all(1 <= len(p) <= size for p in pages)


@given(items, sizes)
def test_page_count(xs, size):
    assert len(paginate(xs, size)) == ceil(len(xs) / size)


def test_size_zero_is_rejected():
    with pytest.raises(ValueError):
        paginate([1], 0)`,
        out: `# against the inherited version
E       Failing test case: test_pages_concatenate_to_the_input(
E           xs=[0],
E           size=1,  # or any other generated value
2 failed, 2 passed

# against the fixed version
4 passed in 12.00s`,
        notes: [
          { t: "p", text: "**The minimal case is a one-item list.** `range(0, len(items) - 1, size)` is `range(0, 0)` for one item, so the only page is never produced. The annotation `# or any other generated value` is Hypothesis telling you `size` is irrelevant to the failure — a clue worth reading." },
          { t: "p", text: "**The concatenation property is the strongest of the three** because it is total: any dropped, duplicated or reordered item breaks it, whatever the cause. The other two catch a different class of mistake — pages that are correct in content but wrongly shaped." },
          { t: "p", text: "**`size < 1` is an example test, not a property**, because it is a single decision about an invalid input. Using the right tool for each part is the point: properties for the space of valid inputs, examples for specific contracts." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A marketplace split each order's payment between the seller, the platform fee and the payment processor, rounding each share to the cent. Month-end reconciliation was out by a few hundred pounds every month — never the same amount, never traceable to one order. Finance had been booking the difference to a suspense account for a year." },
      { t: "p", text: "**The bug was the one in this lesson**: each share was rounded independently, so the three shares of an order summed to the total plus or minus a cent. Across two million orders a month, the cents added up. Every unit test used round amounts, and every one passed." },
      { t: "p", text: "**A single property — \"the shares sum to the order total\" — failed on its first run**, shrunk to a total of `0.01` split three ways. The fix was largest-remainder allocation in integer cents, as in section 02. The property and its `@example` now run on every commit, and the suspense account has stayed at zero since." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**An example test checks inputs you thought of; a property test states what must hold for every input** and lets a library search for counterexamples.",
    "**Hypothesis generates inputs biased toward edges, shrinks the first failure to a minimal case, and replays saved failures first** on the next run.",
    "**Assert properties of the output, not the implementation's own formula** — a test that recomputes the answer the same way shares its bugs.",
    "**Five patterns cover most properties**: invariant, round-trip, oracle, idempotence and metamorphic. Reach for round-trip first.",
    "**Strategies compose**: `st.builds` constructs domain objects, and `map` with tight bounds beats `filter` and `assume`.",
    "**Every bug a property finds becomes an `@example`**, because the `.hypothesis/` database does not travel to CI.",
    "**Use profiles**: `derandomize=True` and `deadline=None` for a reproducible CI gate, and a randomised nightly run to keep searching.",
    "**Keep example tests alongside properties**: examples document intent, properties search the space around it.",
    "**Money and serialisation are where properties pay first**: rounding that does not reconcile, and floats that invent digits on a round trip."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does Hypothesis do after it finds an input that makes a property fail?",
        options: [
          "Reports the first failing input exactly as it was generated, so you see the real case",
          "Retries the same input to check it is not flaky, then reports it",
          "Keeps generating until it has run all 100 examples, then reports every failure it found",
          "Shrinks it to the simplest input that still fails, reports that, and saves it for replay"
        ],
        answer: 3,
        why: "Shrinking is what makes reports usable: the generated failure is often large and noisy, and Hypothesis simplifies it step by step while it still fails, then stores it in `.hypothesis/` so it is tried first next time. It does not report the raw case, it is not a flakiness retry, and it stops generating at the first failure rather than finishing the budget."
      },
      {
        stem: "Which assertion is the strongest property for `split_amount(total, parts)`?",
        options: [
          "`assert split_amount(t, n) == [(t / n).quantize(CENT)] * n`",
          "`assert sum(split_amount(t, n)) == t`",
          "`assert split_amount(t, n) is not None`",
          "`assert all(isinstance(s, Decimal) for s in split_amount(t, n))`"
        ],
        answer: 1,
        why: "The sum property states what must be true of any correct split without describing how it is computed, so it catches the rounding bug. Comparing against a list of equal quotients restates the buggy formula and passes with the bug present. Checking for `None` or for the element type is true of almost any implementation, right or wrong."
      },
      {
        stem: "Why add `@example(total=Decimal(\"0.01\"), parts=2)` after fixing a bug Hypothesis found?",
        options: [
          "It makes Hypothesis generate fewer random examples, so the test runs faster in CI",
          "The `.hypothesis/` store is local; `@example` makes CI run the case too",
          "It is required before `@given` will run any examples at all",
          "It disables shrinking for that test, so failures report the original input"
        ],
        answer: 1,
        why: "Saved failures live in a local directory that a fresh CI checkout does not have, so without `@example` the regression case might never be generated again. `@example` adds a case without reducing the random ones, is entirely optional for `@given`, and has no effect on shrinking."
      },
      {
        stem: "Your serialiser writes `float(price)` and your parser reads `Decimal(value)`. Which property finds the bug fastest?",
        options: [
          "Round-trip: `from_json(to_json(line)) == line`",
          "Idempotence: `to_json(to_json(line))` equals `to_json(line)`",
          "Oracle: compare against `pickle`",
          "Metamorphic: sort the lines first"
        ],
        answer: 0,
        why: "A round trip through the float exposes the extra binary digits immediately — `Decimal` built from the float `0.01` is not `Decimal(\"0.01\")`. Idempotence does not apply, since `to_json` takes a `Line`, not a string. Comparing against pickle tests a different serialiser, and sorting changes nothing about how a price is encoded."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is property-based testing, and when would you use it?",
        strong: "Instead of asserting an output for a chosen input, you state a property that holds for all valid inputs and let a library such as Hypothesis generate many inputs, shrinking any failure to a minimal case. Use it wherever correctness can be stated without knowing the exact answer — serialisation round trips, money calculations, parsers, data transformations.",
        answer: [
          { t: "p", text: "A strong answer always includes shrinking — it is what makes the technique practical rather than a random fuzzer — and a concrete property, ideally a round trip or a sum invariant." },
          { t: "p", text: "Saying you keep example tests as well, and turn found bugs into `@example`, shows you have run it on a real codebase rather than read about it." }
        ],
        weak: "\"It tests with random data.\" That describes fuzzing and misses the two things that make property testing useful: stating the property, and shrinking."
      },
      {
        level: "advanced",
        q: "How do you choose a property for a function whose output you cannot predict?",
        strong: "Use one of the standard shapes. Invariants on the output; a round trip if there is an inverse; an oracle if there is a slow but obviously correct version; idempotence for normalisers; metamorphic relations — how a known change to the input should change the output — when there is no ground truth at all.",
        answer: [
          { t: "p", text: "Naming the patterns is good; illustrating one is better. Metamorphic testing is the impressive one: for a search function, adding an irrelevant document must not change the top results for a query that does not match it." },
          { t: "p", text: "Add the warning about properties that restate the implementation — it shows you know the most common way the technique produces tests that pass and prove nothing." }
        ]
      },
      {
        level: "expert",
        q: "Property tests make your CI flaky. What do you change?",
        strong: "Separate the roles. CI runs a derandomised profile with a fixed budget and no deadline, so a failure is reproducible on re-run; a nightly job runs a larger randomised search. Every failure the nightly finds becomes an `@example` in the suite. If a test is slow, tighten strategies instead of filtering with `assume`.",
        answer: [
          { t: "p", text: "The key insight is that \"flaky\" usually means non-deterministic generation plus timing deadlines on noisy machines, and both are settings, not reasons to delete the tests." },
          { t: "p", text: "Mentioning health checks — Hypothesis failing a test that filters away most of its inputs — shows familiarity with the second common cause of slow property suites." }
        ]
      }
    ]
  }
});

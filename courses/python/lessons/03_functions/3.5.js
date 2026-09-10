/* ============================================================================
   LESSON 3.5 — Lambda, map, filter — and When Not To
   ========================================================================= */
EC.receiveLesson({
  id: "3.5",

  lede: "`lambda`, `map` and `filter` arrived from functional languages and Python kept them, but comprehensions replaced most of their uses. Knowing **which cases survived** is the point of this lesson: there are three where they are genuinely the better choice, and everywhere else a comprehension or a named function reads better.",

  objectives: [
    "Write a lambda and state its two real limitations",
    "Choose between a lambda, a named function and a comprehension deliberately",
    "Identify the cases where `map` and `filter` still win",
    "Use `functools.reduce` correctly, and know why it is usually the wrong tool",
    "Recognise a lambda that should have been a named function"
  ],

  prerequisites: ["3.4", "2.11"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "What a lambda is", id: "lambda" },


    { t: "viz",
      title: "When a lambda helps and when it hurts",
      caption: "A lambda earns its place as a throwaway key or predicate. Assigned to a name it is a worse `def` — no docstring, a useless `__name__` in tracebacks, and no room to grow.",
      svg: `<svg viewBox="0 0 880 230" role="img" aria-label="Idiomatic uses of lambda beside the cases where a def is better">
  <rect x="24" y="40" width="400" height="150" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)" stroke-width="2"/>
  <text x="44" y="66" class="s-label" style="fill:var(--good)">USE A LAMBDA</text>
  <text x="44" y="96"  class="s-sub" style="fill:var(--ink-2)">sorted(rows, key=lambda r: r.name)</text>
  <text x="44" y="122" class="s-sub" style="fill:var(--ink-2)">max(items, key=lambda i: i.score)</text>
  <text x="44" y="148" class="s-sub" style="fill:var(--ink-2)">defaultdict(lambda: [])</text>
  <text x="44" y="176" class="s-sub" style="fill:var(--ink-3)">one expression, used once, obvious</text>

  <rect x="456" y="40" width="400" height="150" rx="8" style="fill:var(--crit);fill-opacity:.09;stroke:var(--crit)" stroke-width="2"/>
  <text x="476" y="66" class="s-label" style="fill:var(--crit)">WRITE A def</text>
  <text x="476" y="96"  class="s-sub" style="fill:var(--ink-2)">handler = lambda e: ...</text>
  <text x="476" y="122" class="s-sub" style="fill:var(--ink-2)">anything needing a docstring</text>
  <text x="476" y="148" class="s-sub" style="fill:var(--ink-2)">anything you will want to test</text>
  <text x="476" y="176" class="s-sub" style="fill:var(--ink-3)">named, reused, or longer than a line</text>

  <text x="24" y="216" class="s-sub" style="fill:var(--crit)">A named lambda shows as &lt;lambda&gt; in every traceback — which is exactly when you most want its name</text>
</svg>`
    },
    { t: "code", lang: "python", title: "an expression that evaluates to a function", code: `
double = lambda x: x * 2          # works, and see the warning below
print(double(5))

# The real use: an inline function where a name would add nothing
orders = [{"total": 30}, {"total": 10}]
print(sorted(orders, key=lambda o: o["total"]))

# Lambdas can take any parameter form
print((lambda a, b=2, *rest, **kw: (a, b, rest, kw))(1, 3, 4, x=5))
`,
      out: `10
[{'total': 10}, {'total': 30}]
(1, 3, (4,), {'x': 5})`
    },

    { t: "dl", items: [
      ["It is an expression", "`lambda` produces a function value, so it can appear where a `def` statement cannot — inside a call, a dict literal, a comprehension."],
      ["The body is a single expression", "No statements. No assignment, no `if/elif` blocks, no `try`, no loops. A conditional *expression* is allowed: `lambda x: \"hi\" if x else \"lo\"`."],
      ["It is anonymous", "`__name__` is always `<lambda>`, which is what appears in tracebacks and profiler output."]
    ]},

    { t: "callout", kind: "trap", title: "Never assign a lambda to a name", body: [
      { t: "code", lang: "python", title: "two spellings, one better", numbered: false, code: `
# PEP 8 explicitly advises against this
double = lambda x: x * 2

# Same behaviour, better in every way
def double(x: int) -> int:
    return x * 2`},
      { t: "p", text: "If you are giving it a name, you wanted a function — and `def` gives you a real `__name__` in tracebacks, a docstring, type annotations, and a form that can grow to two lines without being rewritten. `ruff` flags the assignment form as `E731`." },
      { t: "p", text: "**A lambda earns its place only when it stays anonymous**, passed directly as an argument at the point of use." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "The comparison", id: "comparison" },

    { t: "ladder",
      title: "Doubling the active users' scores",
      rungs: [
        { level: "bad", label: "map + filter + lambda", why: "reads inside-out",
          code: `result = list(
    map(
        lambda u: u["score"] * 2,
        filter(lambda u: u["active"], users),
    )
)`,
          note: "To understand this you read from the innermost argument outward: `users`, then the filter, then the map, then the list. Three levels of nesting and two anonymous functions to express one idea." },

        { level: "ok", label: "Comprehension", why: "reads in one direction",
          code: `result = [u["score"] * 2 for u in users if u["active"]]`,
          note: "One line, read left to right: what you want, where it comes from, which ones. No nesting, no anonymous functions, and it is marginally faster because there is no per-element function call." },

        { level: "best", label: "Named predicate when the condition has meaning", why: "the rule gets a name",
          code: `def is_billable(user: User) -> bool:
    return user.active and not user.trial and user.score > 0


result = [u.score * 2 for u in users if is_billable(u)]`,
          note: "Once the condition is more than one obvious comparison, extracting it names the business rule, puts it in one place, and makes it independently testable. The comprehension stays readable no matter how complex the rule becomes." }
      ]
    },

    { t: "callout", kind: "insight", title: "Why comprehensions won", body: [
      { t: "ul", items: [
        "**Reading order.** A comprehension reads left to right; nested `map`/`filter` reads inside-out.",
        "**One construct instead of three.** Filtering and transforming are a single expression rather than two wrapped calls.",
        "**No function-call overhead.** `map(lambda x: x*2, xs)` calls a Python function per element; the comprehension inlines the expression.",
        "**Dict and set forms.** There is no `map` that produces a dict; `{k: v for ...}` is the only readable way."
      ]},
      { t: "p", text: "Guido van Rossum proposed removing `map`, `filter` and `reduce` from Python 3 for exactly these reasons. They survived because of the cases in the next section — which are real, but narrow." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "The three cases where map wins", id: "map-wins" },

    { t: "code", lang: "python", title: "1 — the function already exists", code: `
names = ["  Ada ", " Grace  "]

# A comprehension with no transformation of its own is just noise
cleaned = [name.strip() for name in names]     # fine
cleaned = list(map(str.strip, names))          # cleaner: no lambda, no loop var

# The win is clearest with a named function
totals = list(map(compute_total, orders))
`,
      caption: "When you are applying an existing function unchanged, `map` says exactly that. The moment you need a lambda to adapt it, the comprehension is better again — `map(lambda o: o[\"total\"], orders)` is worse than `[o[\"total\"] for o in orders]`."
    },

    { t: "code", lang: "python", title: "2 — parallel iteration over several sequences", code: `
firsts = ["Ada", "Grace"]
lasts = ["Lovelace", "Hopper"]

# map applies the function across all sequences at once
full = list(map(lambda f, l: f"{f} {l}", firsts, lasts))

# The comprehension needs zip, which is arguably clearer here anyway
full = [f"{f} {l}" for f, l in zip(firsts, lasts, strict=True)]
print(full)
`,
      out: `['Ada Lovelace', 'Grace Hopper']`,
      caption: "`map` stops at the shortest sequence, silently — the same hazard as bare `zip` (Lesson 2.10), and `map` has no `strict` option. The zip form is preferable precisely because it can be made strict."
    },

    { t: "code", lang: "python", title: "3 — laziness over a large or infinite source", code: `
# map returns an iterator: nothing is computed until consumed
parsed = map(parse_line, huge_file)      # constant memory
first_error = next((p for p in parsed if p.failed), None)

# A comprehension would materialise every line first
# parsed = [parse_line(line) for line in huge_file]   -> OOM
`,
      caption: "A generator expression gives the same laziness — `(parse_line(l) for l in huge_file)` — so this is a tie rather than a win. Use whichever reads better; the important part is not using the list form."
    },

    { t: "callout", kind: "good", title: "The rule", body: [
      { t: "p", text: "**Use `map` when you are passing an existing named function and nothing else.** `map(str.strip, names)`, `map(int, values)`, `map(compute_total, orders)`." },
      { t: "p", text: "**Use a comprehension everywhere else** — and especially the moment a `lambda` appears, because `map(lambda x: ..., xs)` is strictly more machinery than `[... for x in xs]` for the same result." },
      { t: "p", text: "`filter` is weaker still: `filter(None, items)` to drop falsy values is its one genuinely idiomatic use. `filter(lambda x: x > 0, xs)` should always be `[x for x in xs if x > 0]`." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "reduce", id: "reduce" },

    { t: "code", lang: "python", title: "folding a sequence into one value", code: `
from functools import reduce
from operator import mul

# reduce(f, seq, initial) applies f cumulatively, left to right
print(reduce(mul, [1, 2, 3, 4], 1))          # 24

# Almost always, a built-in already does it
print(sum([1, 2, 3, 4]))                     # not reduce(add, ...)
print(max([1, 2, 3, 4]))                     # not reduce(...)
print(math.prod([1, 2, 3, 4]))               # 3.8+, replaces the example above
`,
      out: `24
10
4
24`
    },

    { t: "callout", kind: "tradeoff", title: "When reduce is genuinely right", body: [
      { t: "p", text: "The legitimate case is a **custom associative combine with no built-in equivalent** — merging dictionaries, intersecting sets, composing functions:" },
      { t: "code", lang: "python", title: "the case that survives", numbered: false, code: `
from functools import reduce

configs = [{"a": 1}, {"b": 2}, {"a": 9}]
merged = reduce(lambda acc, d: {**acc, **d}, configs, {})
print(merged)

permissions = [{"read", "write"}, {"read"}, {"read", "admin"}]
common = reduce(set.intersection, permissions)
print(common)`,
        out: `{'a': 9, 'b': 2}
{'read'}`},
      { t: "p", text: "Even here, an explicit loop is often clearer and is certainly easier to debug — you can print the accumulator. The honest position: **reduce is worth recognising because it appears in code you will read**, and is worth writing only when the combining operation genuinely has no built-in and the loop version is noticeably longer." },
      { t: "p", text: "The dict-merge example above is also O(n²) — each `{**acc, **d}` copies the whole accumulator. A loop calling `acc.update(d)` is linear. This is a recurring property of `reduce`: the functional form quietly rebuilds the accumulator each step." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Choose the right tool five times",
      difficulty: "foundation",
      minutes: 20,
      body: [
        { t: "p", text: "Five snippets, each written with `lambda`, `map`, `filter` or `reduce`. For each: decide whether the functional form is the right choice, rewrite it if not, and say why in one sentence." },
        { t: "p", text: "Two of the five are already correct. Identifying those matters as much as fixing the others — the goal is judgement, not a blanket preference." }
      ],
      requirements: [
        "**A.** `list(map(lambda o: o[\"total\"], orders))`",
        "**B.** `list(map(str.strip, raw_names))`",
        "**C.** `list(filter(lambda x: x is not None, values))`",
        "**D.** `reduce(lambda a, b: a + b, amounts, 0)`",
        "**E.** `sorted(items, key=lambda i: (i.priority, i.created))`",
        "For each: keep or rewrite, with a one-sentence reason.",
        "For any you rewrite, assert the result is identical to the original."
      ],
      hint: "Ask two questions of each: does a lambda appear, and does a built-in already do this? A lambda inside `map` or `filter` is nearly always a comprehension. A lambda as a `key=` argument nearly always is not.",
      solution: {
        lang: "python",
        title: "choices.py",
        code: `from decimal import Decimal
from functools import reduce
from operator import attrgetter, itemgetter
from typing import NamedTuple


class Item(NamedTuple):
    priority: int
    created: str


orders = [{"total": Decimal("30")}, {"total": Decimal("10")}]
raw_names = ["  Ada ", " Grace  "]
values = [1, None, 3, None]
amounts = [Decimal("1.50"), Decimal("2.50")]
items = [Item(2, "b"), Item(1, "a"), Item(2, "a")]


# ---- A. REWRITE --------------------------------------------------------
a_before = list(map(lambda o: o["total"], orders))
a_after = [o["total"] for o in orders]
# A lambda inside map is strictly more machinery than a comprehension for
# the same result: three constructs (list, map, lambda) instead of one,
# read inside-out, with a Python function call per element.
#
# itemgetter is a defensible middle ground when the field name is the
# only variable part -- it is a C-level callable, so no Python call:
a_alt = list(map(itemgetter("total"), orders))


# ---- B. KEEP -----------------------------------------------------------
b = list(map(str.strip, raw_names))
# The function already exists and is applied unchanged. There is no
# lambda and no loop variable -- the comprehension version would add
# "for name in raw_names" purely as ceremony.


# ---- C. REWRITE --------------------------------------------------------
c_before = list(filter(lambda x: x is not None, values))
c_after = [v for v in values if v is not None]
# Same reasoning as A. Note the common mistake here: filter(None, values)
# is NOT equivalent -- it drops every FALSY value, so 0 and "" disappear
# too. That is the Lesson 1.7 truthiness trap wearing a functional hat.
c_wrong = list(filter(None, [1, 0, None, 3]))     # [1, 3] -- 0 is gone


# ---- D. REWRITE --------------------------------------------------------
d_before = reduce(lambda a, b: a + b, amounts, Decimal("0"))
d_after = sum(amounts, start=Decimal("0"))
# A built-in already does this. reduce with an addition lambda is the
# canonical example of reaching past sum() for no reason.


# ---- E. KEEP -----------------------------------------------------------
e = sorted(items, key=lambda i: (i.priority, i.created))
# This is what lambda is FOR: a small anonymous expression passed
# directly at the point of use, where naming it would add nothing. A
# tuple key for multi-field sorting cannot be expressed by a built-in.
#
# attrgetter is slightly faster and equally clear for plain attributes:
e_alt = sorted(items, key=attrgetter("priority", "created"))


if __name__ == "__main__":
    assert a_before == a_after == a_alt
    assert c_before == c_after
    assert d_before == d_after
    assert e == e_alt
    print("A rewrite, B keep, C rewrite, D rewrite, E keep")
    print("filter(None, ...) drops 0 as well:", c_wrong)`,
        notes: [
          { t: "p", text: "**B and E are the keeps, and they are keeps for opposite reasons.** B uses `map` because the function already exists and needs no adaptation. E uses `lambda` because the expression is tiny, anonymous and passed directly where it is used. Both are cases where the alternative would add machinery, not remove it." },
          { t: "p", text: "**C hides a genuine trap.** `filter(None, values)` looks like a tidier way to drop `None`s and is not — it drops every falsy value, so `0`, `\"\"` and `[]` vanish too. It is the truthiness-versus-`is None` distinction from Lesson 1.7, and it produces data loss that reconciles to plausible-looking output." },
          { t: "p", text: "**`itemgetter` and `attrgetter` are worth knowing** as the middle ground. They are C-level callables, so they avoid the per-element Python function call that a lambda incurs, and they read cleanly for the common case of pulling one field. Reach for them where the lambda does nothing but access an attribute or a key." },
          { t: "callout", kind: "insight", title: "The pattern across all five", body: [
            { t: "p", text: "**A lambda inside `map` or `filter` is almost always a comprehension.** A lambda as a `key=` or callback argument almost always is not." },
            { t: "p", text: "The difference is where the function goes. `map` and `filter` wrap an iteration that a comprehension expresses natively, so the lambda is competing with syntax that already exists. A `key=` argument has no syntactic equivalent — there is no comprehension form for \"sort by this expression\" — so the lambda is doing work nothing else can." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A data pipeline filters out missing readings with `filter(None, readings)`. Months later an analyst reports that sensor readings of exactly zero are absent from every report, though the raw data clearly contains them." },
      { t: "p", text: "**`filter(None, ...)` removes every falsy value, not just `None`.** A reading of `0` — a valid, often important measurement — is falsy and gets dropped alongside the genuinely missing ones. So is `0.0`, and so is an empty string in a text field." },
      { t: "p", text: "**The correct form states what it means:** `[r for r in readings if r is not None]`. It is longer by a few characters and it cannot silently discard a legitimate zero." },
      { t: "p", text: "This is the same failure as `if not limit:` from Lesson 1.5 and `value or default` from Lesson 1.7 — three different syntaxes for one mistake, which is **treating falsy as equivalent to absent**. Wherever zero, empty string or empty list are legitimate values, the test has to be `is None`." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "A lambda is an **expression** producing a function, limited to a single expression body and permanently named `<lambda>` in tracebacks.",
    "**Never assign a lambda to a name.** If it deserves a name it deserves `def` — with a real `__name__`, a docstring, annotations, and room to grow. `ruff` flags this as `E731`.",
    "Comprehensions won because they read left-to-right, express filter and transform as one construct, avoid a per-element function call, and have dict and set forms.",
    "**`map` still wins when you pass an existing named function unchanged** — `map(str.strip, names)`, `map(int, values)`.",
    "**A lambda inside `map` or `filter` is almost always a comprehension.** A lambda as a `key=` or callback argument almost always is not.",
    "`map` truncates silently on sequences of different lengths and has no `strict` option — prefer `zip(..., strict=True)` with a comprehension.",
    "`itemgetter` and `attrgetter` are C-level callables that beat a lambda for plain field access, in both speed and clarity.",
    "**`filter(None, xs)` drops every falsy value**, not just `None` — a legitimate `0` or `\"\"` disappears with it.",
    "`reduce` is worth recognising and rarely worth writing: a built-in usually exists, and the functional form often rebuilds the accumulator each step, turning a linear loop into an O(n²) one."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A pipeline uses `filter(None, readings)` to drop missing values. What else does it remove?",
        options: [
          "Nothing — `None` as the predicate filters only `None` values",
          "Every falsy value, so a legitimate reading of `0` or `0.0` is silently discarded too",
          "It raises `TypeError`, since `None` is not callable",
          "Only values that are `None` or `False`"
        ],
        answer: 1,
        why: "`filter(None, xs)` keeps every element that is truthy, so `0`, `0.0`, `\"\"`, `[]` and `False` are all removed alongside `None`. For sensor data a reading of exactly zero is often the most interesting one, and its absence reconciles to plausible-looking output. The correct form is `[r for r in readings if r is not None]` — the same falsy-versus-absent distinction as `if not limit:` and `value or default`."
      },
      {
        stem: "Which of these is the case where `map` is genuinely preferable to a comprehension?",
        options: [
          "`map(lambda o: o[\"total\"], orders)`",
          "`map(str.strip, raw_names)` — an existing function applied unchanged, with no lambda and no loop variable",
          "`map(lambda x: x * 2, numbers)`",
          "Any case, since `map` is implemented in C and always faster"
        ],
        answer: 1,
        why: "`map` earns its place when you pass an existing named function with no adaptation — the comprehension would add `for name in raw_names` purely as ceremony. As soon as a lambda appears, `map` is strictly more machinery than the comprehension for the same result, and the lambda reintroduces the per-element Python call that would otherwise make `map` faster."
      },
      {
        stem: "Why does PEP 8 advise against `double = lambda x: x * 2`?",
        options: [
          "Lambdas are slower than functions defined with `def`",
          "If it deserves a name it deserves `def` — which gives a real `__name__` in tracebacks, a docstring, annotations, and room to grow",
          "Assigning a lambda creates a memory leak",
          "Lambdas cannot be type-annotated at all"
        ],
        answer: 1,
        why: "The two forms behave identically at runtime; the difference is everything around them. A `def` shows its name in tracebacks and profiler output rather than `<lambda>`, can carry a docstring and annotations, and can grow to two statements without being rewritten. `ruff` flags the assignment form as `E731`. A lambda earns its place only when it stays anonymous."
      },
      {
        stem: "When is `functools.reduce` the right tool?",
        options: [
          "For summing or multiplying a sequence",
          "For a custom associative combine with no built-in equivalent, such as intersecting a list of sets",
          "Whenever a loop accumulates into a single value",
          "Never — it was removed from Python 3"
        ],
        answer: 1,
        why: "`sum`, `max`, `min` and `math.prod` already cover the common folds, so reaching for `reduce` there is the canonical misuse. It survives for custom combines like `reduce(set.intersection, permission_sets)`. Even then an explicit loop is often clearer and easier to debug — and the functional form frequently rebuilds the accumulator each step, as `reduce(lambda a, d: {**a, **d}, dicts)` does, turning a linear operation quadratic."
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
        q: "When would you use a lambda?",
        strong: "When a small function is needed inline and naming it would add nothing — a `key=` argument, a callback, a default in a dispatch table. Never assigned to a name: if it deserves a name it deserves `def`, which gives a real `__name__` in tracebacks, a docstring and annotations.",
        answer: [
          { t: "p", text: "The sharpest distinction to offer is where the lambda sits. Inside `map` or `filter` it is almost always a comprehension in disguise; as a `key=` argument it is almost always correct, because there is no syntax that expresses \"sort by this expression\"." },
          { t: "p", text: "Mentioning `itemgetter` and `attrgetter` shows range — for plain field access they are C-level callables that beat a lambda on both speed and clarity." },
          { t: "p", text: "The limitation worth naming, since it comes up: the body is one expression, so no statements, no assignment, no `try`. A lambda that needs any of those was always meant to be a `def`." }
        ]
      },
      {
        level: "core",
        q: "Why are comprehensions usually preferred over map and filter?",
        strong: "They read left to right rather than inside-out, express filtering and transforming as one construct instead of two nested calls, avoid a per-element Python function call, and have dict and set forms that `map` has no equivalent for.",
        answer: [
          { t: "p", text: "It carries weight to note that Guido proposed removing `map`, `filter` and `reduce` in Python 3 for exactly these reasons, and that they survived for narrow cases rather than as general tools." },
          { t: "p", text: "Being able to name the surviving case is what shows judgement: `map` with an existing named function and no lambda — `map(str.strip, names)` — where the comprehension would add a loop variable purely as ceremony." },
          { t: "p", text: "`filter(None, xs)` is worth flagging as an active hazard rather than merely unidiomatic: it drops every falsy value, so a legitimate `0` disappears with the `None`s." }
        ]
      },
      {
        level: "advanced",
        q: "A colleague replaces a loop with `reduce`. How do you respond?",
        strong: "Ask whether a built-in already does it. `sum`, `max`, `min` and `math.prod` cover most folds. If it is a genuine custom combine, check whether the accumulator is being rebuilt each step — the functional form often turns a linear loop quadratic.",
        answer: [
          { t: "p", text: "The performance point is the substantive one and is easy to miss. `reduce(lambda a, d: {**a, **d}, dicts)` copies the whole accumulator on every element, so merging n dicts is O(n²); a loop calling `acc.update(d)` is linear." },
          { t: "p", text: "The readability argument is secondary but real: with a loop you can print the accumulator, step through it in a debugger, and add a log line. With `reduce` you cannot inspect an intermediate state without rewriting it." },
          { t: "p", text: "Be fair about where it is right — `reduce(set.intersection, permission_sets)` is clear and has no built-in equivalent. The objection is to reaching past `sum()`, not to the function existing." }
        ],
        weak: "Rejecting it purely as \"unpythonic\". That is a matter of taste and invites an argument; the accumulator-copying cost and the availability of a built-in are facts the author can check."
      }
    ]
  }
});

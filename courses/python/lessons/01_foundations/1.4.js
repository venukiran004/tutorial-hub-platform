/* ============================================================================
   LESSON 1.4 — Names, Objects and References
   ========================================================================= */
EC.receiveLesson({
  id: "1.4",

  lede: "This is the most load-bearing lesson in the course. Almost every Python bug that makes an experienced developer say *\"that shouldn't be possible\"* — a list that changed when nobody touched it, a default argument that remembers the last call, two objects that compare equal but behave differently — is one misunderstanding, repeated. **Assignment does not copy a value. It binds a name to an object.** Everything else follows.",

  objectives: [
    "Describe what `x = y` does in terms of names and objects, and what it does not do",
    "Predict whether an operation rebinds a name or mutates an object, and why that distinction decides the outcome",
    "Explain what happens to arguments when you pass them to a function",
    "Choose correctly between `is` and `==`, and explain why the wrong one sometimes appears to work",
    "Recognise the aliasing and shared-default bugs on sight, before they are written"
  ],

  prerequisites: ["1.1"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "A variable is not a box", id: "not-a-box" },

    {"kind": "memory", "title": "A variable is a name bound to an object", "caption": "After a = [1, 2, 3] and b = a there is one list and two names for it. Appending through either name changes the one object; rebinding b = [] only moves the name.", "names": [{"name": "a", "to": "o1"}, {"name": "b", "to": "o1"}], "objects": [{"id": "o1", "type": "list", "value": "[1, 2, 3]", "note": "one object, refcount 2"}], "t": "diagram", "id": "dg-1_4-01-0"},



    { t: "p", text: "Most introductions to programming describe a variable as a box you put a value into. In languages like C that picture is roughly accurate: a variable names a piece of memory, and assigning writes bytes into it." },

    { t: "p", text: "In Python it is wrong, and it is the specific wrongness that produces the bugs in this lesson. A Python name is a **label**. Assignment attaches the label to an object that already exists somewhere in memory. The object does not live in the variable, and two labels can point at the same object." },

    { t: "code", lang: "python", title: "the demonstration", code: `
a = [1, 2, 3]
b = a              # does NOT copy the list -- binds a second name to it

b.append(4)        # mutate the object b refers to

print(a)           # a sees the change, because a and b are the same object
print(a is b)      # True -- not just equal, identical
print(id(a) == id(b))
`,
      out: `[1, 2, 3, 4]
True
True`
    },

    { t: "p", text: "If a variable were a box, `b = a` would have copied the contents into a second box and `a` would still be `[1, 2, 3]`. It is not, so it does not, and it is not." },

    { t: "viz",
      title: "Names, objects, and what assignment actually changes",
      caption: "Names live in a namespace and point at objects on the heap. Assignment moves an arrow. Mutation changes what an arrow points at. These are different operations and the distinction is the whole lesson.",
      svg: `<svg viewBox="0 0 900 330" role="img" aria-label="Diagram: names as labels pointing at heap objects, showing rebinding versus mutation">
  <defs>
    <marker id="a3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
    <marker id="a3a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--accent)"/>
    </marker>
  </defs>

  <text x="20" y="22" class="s-sub" style="font-weight:700;letter-spacing:.08em">NAMESPACE</text>
  <text x="330" y="22" class="s-sub" style="font-weight:700;letter-spacing:.08em">OBJECTS ON THE HEAP</text>

  <!-- step 1 -->
  <text x="20" y="52" class="s-mono" style="fill:var(--ink-2)">a = [1, 2, 3]</text>
  <rect x="20" y="62" width="66" height="28" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="53" y="81" text-anchor="middle" class="s-mono">a</text>
  <line x1="86" y1="76" x2="326" y2="76" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a3)"/>
  <rect x="332" y="58" width="150" height="36" rx="7" class="s-fill s-stroke" stroke-width="1"/>
  <text x="407" y="81" text-anchor="middle" class="s-mono">[1, 2, 3]</text>
  <text x="496" y="81" class="s-sub">one list object</text>

  <line x1="20" y1="110" x2="880" y2="110" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <!-- step 2 -->
  <text x="20" y="140" class="s-mono" style="fill:var(--ink-2)">b = a</text>
  <rect x="20" y="150" width="66" height="28" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="53" y="169" text-anchor="middle" class="s-mono">a</text>
  <rect x="20" y="184" width="66" height="28" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="53" y="203" text-anchor="middle" class="s-mono">b</text>
  <line x1="86" y1="164" x2="326" y2="172" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a3)"/>
  <line x1="86" y1="198" x2="326" y2="186" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#a3a)"/>
  <rect x="332" y="160" width="150" height="36" rx="7" class="s-fill s-stroke" stroke-width="1"/>
  <text x="407" y="183" text-anchor="middle" class="s-mono">[1, 2, 3]</text>
  <text x="496" y="177" class="s-sub" style="fill:var(--warn)">still ONE object,</text>
  <text x="496" y="191" class="s-sub" style="fill:var(--warn)">now with two names</text>

  <line x1="20" y1="228" x2="880" y2="228" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <!-- step 3: mutate vs rebind -->
  <text x="20" y="256" class="s-mono" style="fill:var(--good)">b.append(4)</text>
  <text x="20" y="272" class="s-sub">mutates the object</text>
  <rect x="150" y="242" width="150" height="34" rx="7" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <text x="225" y="264" text-anchor="middle" class="s-mono">[1, 2, 3, 4]</text>
  <text x="312" y="258" class="s-sub">a and b both</text>
  <text x="312" y="272" class="s-sub">see the change</text>

  <text x="470" y="256" class="s-mono" style="fill:var(--crit)">b = [9, 9]</text>
  <text x="470" y="272" class="s-sub">rebinds the name</text>
  <rect x="600" y="234" width="120" height="28" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="660" y="253" text-anchor="middle" class="s-mono">[1, 2, 3]</text>
  <text x="730" y="253" class="s-sub">a still here</text>
  <rect x="600" y="270" width="120" height="28" rx="6" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="660" y="289" text-anchor="middle" class="s-mono">[9, 9]</text>
  <text x="730" y="289" class="s-sub">b points here now</text>

  <text x="20" y="316" class="s-sub" style="fill:var(--ink-2)">Mutation changes the object every name shares. Rebinding changes only the one name.</text>
</svg>`
    },

    { t: "callout", kind: "mental", title: "The two-question test", body: [
      { t: "p", text: "Whenever you are unsure what a line of Python will do to your data, ask these in order:" },
      { t: "ol", items: [
        "**Does this line rebind a name, or mutate an object?** A bare `=` on the left rebinds. A method call, an index assignment, or an in-place operator generally mutates.",
        "**How many names currently point at that object?** If more than one, mutation is visible through all of them."
      ]},
      { t: "p", text: "Every bug in this lesson is a case where the answer to the first question was misjudged, or the answer to the second was larger than the author realised." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Identity, type, value", id: "identity-type-value",
      sub: "Every Python object carries exactly three things." },

    { t: "dl", items: [
      ["Identity", "Fixed for the object's entire life. `id(x)` exposes it — in CPython, the memory address. The `is` operator compares identity."],
      ["Type", "Also fixed. An object never changes type; `x = 5` followed by `x = \"five\"` does not change an object, it binds `x` to a different one."],
      ["Value", "The contents. This is the only one that can change, and only for **mutable** types."]
    ]},

    { t: "code", lang: "python", title: "inspecting all three", code: `
items = [1, 2, 3]

print(id(items), type(items), items)

items.append(4)          # value changed
print(id(items), type(items), items)   # SAME id -- same object

items = [9]              # rebinding
print(id(items), type(items), items)   # DIFFERENT id -- new object
`,
      out: `140234567891200 <class 'list'> [1, 2, 3]
140234567891200 <class 'list'> [1, 2, 3, 4]
140234567894016 <class 'list'> [9]`,
      caption: "Watch the id. Mutation keeps it; rebinding changes it. That single number tells you which of the two operations just happened."
    },

    { t: "table",
      head: ["Mutable — can change in place", "Immutable — never changes"],
      rows: [
        ["`list`", "`int`, `float`, `complex`, `bool`"],
        ["`dict`", "`str`"],
        ["`set`", "`tuple` *(see the trap below)*"],
        ["`bytearray`", "`frozenset`, `bytes`"],
        ["most of your own classes", "`None`"]
      ],
      caption: "Immutable does not mean constant. `x = x + 1` works fine on an int — it just creates a new int and rebinds the name rather than modifying the old one."
    },

    { t: "callout", kind: "trap", title: "A tuple is immutable. Its contents may not be.", body: [
      { t: "p", text: "Immutability in Python is shallow. A tuple guarantees that *which objects it holds* will never change. It guarantees nothing about those objects." },
      { t: "code", lang: "python", title: "the surprise", numbered: false, code: `
config = ("prod", ["us-east", "us-west"])

config[0] = "dev"          # TypeError -- as expected
config[1].append("eu-central")   # works, and changes the tuple's contents

print(config)`,
        out: `TypeError: 'tuple' object does not support item assignment
('prod', ['us-east', 'us-west', 'eu-central'])`},
      { t: "p", text: "This has a practical consequence that catches people: **a tuple is only hashable if everything inside it is.** A tuple containing a list cannot be a dictionary key or a set member, because its hash would change underneath the container." },
      { t: "code", lang: "python", title: "the consequence", numbered: false, code: `
{("a", 1): "fine"}              # works
{("a", [1]): "boom"}            # TypeError: unhashable type: 'list'`}
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Passing arguments to functions", id: "arguments",
      sub: "Not pass-by-value, not pass-by-reference. Something simpler than either." },

    {"kind": "memory", "title": "Arguments are passed by binding", "caption": "Calling f(a) binds the parameter name to the same object. Mutating it inside f is visible to the caller; assigning a new object to the parameter is not.", "left": "caller", "right": "objects", "names": [{"name": "a  (caller)", "to": "o1"}, {"name": "items  (inside f)", "to": "o1", "label": "same object"}, {"name": "items = []  (rebind)", "to": "o2", "dashed": true}], "objects": [{"id": "o1", "type": "list", "value": "[1, 2, 3]", "note": "mutations visible to both"}, {"id": "o2", "type": "list", "value": "[]", "note": "a new object; the caller never sees it", "tone": "warn"}], "t": "diagram", "id": "dg-1_4-03-1"},



    { t: "p", text: "Interview candidates spend a lot of energy on whether Python is \"pass by value\" or \"pass by reference\". Neither term fits, and trying to force one produces confusion. What actually happens is exactly what happens with `=`: **the parameter name is bound to the same object the caller passed.**" },

    { t: "p", text: "So the function can mutate that object and the caller will see it. But if the function rebinds the parameter name, the caller sees nothing, because rebinding only ever affects one name." },

    { t: "code", lang: "python", title: "the two cases, side by side", code: `
def mutates(data: list[int]) -> None:
    data.append(99)          # changes the caller's object


def rebinds(data: list[int]) -> None:
    data = [99]              # points the LOCAL name elsewhere; caller unaffected


numbers = [1, 2]
mutates(numbers)
print(numbers)

numbers = [1, 2]
rebinds(numbers)
print(numbers)
`,
      out: `[1, 2, 99]
[1, 2]`,
      hl: [2, 6]
    },

    { t: "callout", kind: "good", title: "The design rule this implies", body: [
      { t: "p", text: "A function that mutates its arguments is doing something invisible from the call site. `process(orders)` gives the reader no hint that `orders` will be different afterwards." },
      { t: "p", text: "**Prefer returning new data over mutating inputs.** It makes the function easier to test, safe to call twice, and safe to use concurrently." },
      { t: "ladder",
        rungs: [
          { level: "bad", label: "Mutates silently", why: "the caller cannot tell",
            code: `def apply_discount(orders, pct):
    for order in orders:
        order["total"] *= (1 - pct)`,
            note: "No return value, and the caller's data is now different. Call it twice by accident and you have applied the discount twice — a bug that produces plausible-looking wrong numbers rather than an error." },
          { level: "ok", label: "Mutates, but says so", why: "honest, still risky",
            code: `def apply_discount_in_place(orders, pct):
    """Modify each order's total in place. Not idempotent."""
    for order in orders:
        order["total"] *= (1 - pct)`,
            note: "The name and docstring now warn the reader. This is a legitimate choice when the data is large and copying is genuinely expensive — but the burden is on you to prove that it is." },
          { level: "best", label: "Returns new data", why: "safe to call twice",
            code: `def with_discount(
    orders: list[dict], pct: float
) -> list[dict]:
    """Return new orders with the discount applied."""
    return [
        {**order, "total": order["total"] * (1 - pct)}
        for order in orders
    ]`,
            note: "The caller decides whether to keep the original. Calling it twice on the same input gives the same result. It is trivially testable, and it cannot cause a race when two threads hold the same list." }
        ]
      }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "The mutable default argument", id: "mutable-default",
      sub: "The most famous Python trap, and it is pure name-binding." },

    { t: "code", lang: "python", title: "read this and predict the second call", code: `
def add_item(item, basket=[]):
    basket.append(item)
    return basket


print(add_item("apple"))
print(add_item("banana"))
`,
      out: `['apple']
['apple', 'banana']`
    },

    { t: "p", text: "Most people expect `['banana']`. The reason it is not comes straight from Lesson 1.1: **default arguments are evaluated once, when the `def` statement executes** — not on each call. That empty list is created a single time and stored on the function object. Every call that omits the argument binds `basket` to *that same list*." },

    { t: "code", lang: "python", title: "proof", numbered: false, code: `
print(add_item.__defaults__)`,
      out: `(['apple', 'banana'],)`
    },

    { t: "callout", kind: "trap", title: "Why this reaches production", body: [
      { t: "p", text: "In a script you notice immediately. In a long-running service you do not, because the function object lives for the lifetime of the process. The accumulating default silently grows across requests — leaking memory, and leaking *one user's data into another user's response*." },
      { t: "p", text: "**The fix is a sentinel:**" },
      { t: "code", lang: "python", title: "the correct form", numbered: false, code: `
def add_item(item: str, basket: list[str] | None = None) -> list[str]:
    if basket is None:
        basket = []          # a fresh list on every call
    basket.append(item)
    return basket`,
        hl: [2, 3]},
      { t: "p", text: "Use `None` as the default and build the real value inside the body. The type hint `list[str] | None` documents it honestly, and linters (`ruff` rule `B006`) flag the mutable-default form automatically — Lesson 14.4 covers turning that on." },
      { t: "p", text: "The same rule applies to `{}`, `set()`, and any object you construct in a signature — including `datetime.now()`, which freezes at import time and is a genuinely nasty version of this bug." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "is versus ==", id: "is-vs-equals" },

    { t: "dl", items: [
      ["`==`", "Asks *do these represent the same value?* Calls `__eq__`, which types define themselves. This is what you want almost always."],
      ["`is`", "Asks *are these the same object?* Compares identity. No method call, no override possible."]
    ]},

    { t: "code", lang: "python", title: "the distinction", code: `
a = [1, 2, 3]
b = [1, 2, 3]

print(a == b)      # True  -- same contents
print(a is b)      # False -- two separate list objects
`,
      out: `True
False`
    },

    { t: "callout", kind: "trap", title: "The interning trap: when `is` appears to work", body: [
      { t: "p", text: "CPython caches small integers (−5 to 256) and interns some strings, reusing one object rather than allocating a new one. That makes `is` *accidentally* return `True` for small values — and then fail on larger ones." },
      { t: "code", lang: "python", title: "run this in a REPL, not a script", numbered: false, code: `
a = 256
b = 256
print(a is b)          # True  -- cached

x = 257
y = 257
print(x is y)          # False -- two distinct objects
print(x == y)          # True  -- and this is what you meant`,
        out: `True
False
True`},
      { t: "p", text: "This is an implementation detail with **no guarantee**, and it varies between Python versions, between the REPL and a script file, and between implementations. Code that relies on it is broken code that currently passes." },
      { t: "p", text: "**Use `is` for exactly three things:** `is None`, `is True` / `is False` when you genuinely mean the singleton and not truthiness, and sentinel objects you created yourself. Everything else uses `==`." }
    ]},

    { t: "code", lang: "python", title: "why `is None` specifically", code: `
import pandas as pd

value = pd.Series([1, 2, 3])

# == on some types returns a non-boolean, and then 'if' explodes:
#   if value == None:   ->  ValueError: truth value of a Series is ambiguous

if value is None:        # identity check: always safe, never overridable
    ...
`,
      caption: "`is None` cannot be intercepted by a class. `== None` calls `__eq__`, which NumPy arrays, pandas objects and many ORM models override to return something that is not a bool. This is why the idiom is `is None` and not merely a style preference."
    },

    /* ================================================================== */
    { t: "h2", n: "06", text: "Aliasing in real code", id: "aliasing" },

    { t: "p", text: "The toy examples above are obvious once you see them. Here is the shape the bug actually takes in a codebase, where the two names are far apart." },

    { t: "code", lang: "python", title: "a bug that took an afternoon to find", code: `
DEFAULT_TAGS = ["untagged"]


def create_document(title: str, tags: list[str] = None) -> dict:
    return {
        "title": title,
        "tags": tags or DEFAULT_TAGS,     # <- the alias
    }


doc_a = create_document("Report")
doc_b = create_document("Summary")

doc_a["tags"].append("finance")           # tagging ONE document

print(doc_b["tags"])
print(DEFAULT_TAGS)
`,
      out: `['untagged', 'finance']
['untagged', 'finance']`,
      hl: [7, 14]
    },

    { t: "p", text: "`tags or DEFAULT_TAGS` does not copy the default — it binds the new document's `tags` key to the module-level list. Every document created without tags shares one list, and the module constant is corrupted for the lifetime of the process." },

    { t: "code", lang: "python", title: "the fix", code: `
DEFAULT_TAGS = ("untagged",)              # immutable: cannot be mutated at all


def create_document(title: str, tags: list[str] | None = None) -> dict:
    return {
        "title": title,
        "tags": list(tags) if tags else list(DEFAULT_TAGS),
    }
`,
      hl: [1, 7],
      caption: "Two defences, deliberately layered. Making the constant a tuple means an accidental `.append` raises immediately instead of silently corrupting state. Copying with `list(...)` means each document owns its own tags. **Shared mutable state at module level is the thing to avoid; immutability is how you make the mistake impossible rather than merely unlikely.**"
    },

    { t: "callout", kind: "insight", title: "Where this bites hardest in production", body: [
      { t: "ul", items: [
        "**Web handlers** — a module-level dict used as a default or cache is shared by every request. Under concurrency, two users can see each other's data.",
        "**Class attributes** — a mutable class attribute is shared by every instance. Lesson 4.2 covers this specific form in depth; it is the same bug wearing a class.",
        "**Configuration objects** — a config dict passed around and mutated by one component changes behaviour for every other component holding it.",
        "**Test suites** — a fixture returning a shared mutable object makes tests pass or fail depending on execution order, which is the worst kind of flaky."
      ]},
      { t: "p", text: "The defence is the same in all four: at boundaries, either copy or use an immutable type. Lesson 2.4 covers exactly what \"copy\" means, because shallow copying has its own trap." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "07", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Predict, then verify",
      difficulty: "foundation",
      minutes: 25,
      body: [
        { t: "p", text: "The skill this lesson builds is prediction. Write down your answer for every `print` below **before running anything** — on paper, or in a comment. Then run it." },
        { t: "p", text: "The value is entirely in the gap between your prediction and the output. A prediction you got right taught you nothing; a prediction you got wrong located a hole in your model." }
      ],
      requirements: [
        "Predict the output of every print statement in the snippet below.",
        "Run it and compare. For each one you got wrong, write one sentence explaining the actual mechanism.",
        "For each wrong answer, identify which it was: a rebind you read as a mutation, or a mutation you read as a rebind.",
        "Then fix `build_report` so that calling it twice with no arguments produces two independent reports."
      ],
      hint: "For each line, ask the two-question test: does this rebind or mutate, and how many names point at the object? For the tuple case, remember that immutability is shallow.",
      solution: {
        lang: "python",
        title: "predict_then_verify.py",
        code: `# ---- the snippet ------------------------------------------------------

a = [1, 2]
b = a
b += [3]                    # (1)
print(a)

c = [1, 2]
d = c
d = d + [3]                 # (2)
print(c)

t = (1, [2])
t[1].append(3)              # (3)
print(t)

x = "hello"
y = x
y += " world"               # (4)
print(x)


def build_report(rows=[], title="Untitled"):
    rows.append({"title": title})
    return rows

print(build_report(title="Q1"))     # (5)
print(build_report(title="Q2"))     # (6)


# ---- answers ----------------------------------------------------------
# (1) [1, 2, 3]
#     += on a list calls __iadd__, which MUTATES in place and rebinds to the
#     same object. b and a are the same list, so a sees it.
#
# (2) [1, 2]
#     d + [3] builds a NEW list; the assignment rebinds only d. c is untouched.
#     This is the exact pair that shows += and + are not interchangeable.
#
# (3) (1, [2, 3])
#     The tuple still holds the same two objects, so its immutability is not
#     violated. The list it holds is mutable and was mutated.
#
# (4) 'hello'
#     str is immutable, so += cannot mutate. It builds a new string and rebinds
#     y. x still points at the original. Compare with (1): identical syntax,
#     opposite outcome, decided entirely by mutability.
#
# (5) [{'title': 'Q1'}]
# (6) [{'title': 'Q1'}, {'title': 'Q2'}]
#     The default list was created once when def executed and is reused.


# ---- the fix ----------------------------------------------------------

def build_report(
    rows: list[dict] | None = None,
    title: str = "Untitled",
) -> list[dict]:
    """Return a report. Passing no rows starts a fresh, independent list."""
    if rows is None:
        rows = []
    else:
        rows = list(rows)        # do not mutate the caller's list either

    rows.append({"title": title})
    return rows`,
        notes: [
          { t: "p", text: "**Cases (1) and (2) are the pair worth remembering.** `b += [3]` and `d = d + [3]` look like the same operation and are not. On a mutable type, `+=` calls `__iadd__` and modifies the object in place; `+` calls `__add__` and builds a new one. Every name pointing at the original sees the first and not the second." },
          { t: "p", text: "**Case (4) is the same syntax with the opposite result**, because `str` has no `__iadd__` — there is no in-place option for an immutable type, so `+=` falls back to build-and-rebind. This is why you cannot reason about `+=` without knowing the type." },
          { t: "callout", kind: "good", title: "The extra defence in the fix", body: [
            { t: "p", text: "The sentinel handles the default. The `rows = list(rows)` line handles a second, less-discussed problem: if a caller *does* pass a list, the original function would mutate theirs as a side effect. Copying at the boundary means the function cannot surprise its caller either way." },
            { t: "p", text: "That is a judgement call, not a rule — copying a large list on every call has a cost. But for a function returning a report, correctness and predictability comfortably win." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A FastAPI service returns user profiles. QA reports that occasionally a user sees another user's permissions attached to their profile. It is not reproducible locally, appears only under load, and the database rows are correct." },
      { t: "p", text: "**Where would you look first?** For shared mutable state at module or class level: a default argument, a module-level dict used as a cache or template, or a class attribute holding a list. Under concurrency, one request mutates the shared object and a second request reads it." },
      { t: "p", text: "**Why it only appears under load:** with one request at a time you may still be mutating shared state, but you rarely observe another request's version of it. Concurrency does not create this bug — it makes an existing one visible. That is also why it survives local testing and reaches production." },
      { t: "p", text: "The systematic fix is not a lock. It is removing the shared mutable state: build per-request objects, use immutable defaults, and copy at boundaries." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**Assignment binds a name to an object. It never copies.** `b = a` gives one object two names.",
    "Ask two questions about any line: *does it rebind or mutate*, and *how many names point at that object*. Together they predict every behaviour in this lesson.",
    "Every object has identity, type and value. Only value can change, and only for mutable types. Watch `id()` to see which operation just happened.",
    "Arguments are bound, not copied. A function can mutate what you passed; rebinding the parameter affects nothing outside.",
    "**Prefer returning new data to mutating arguments.** It is testable, idempotent and concurrency-safe.",
    "Default arguments are evaluated **once**, at `def` time. Use `None` as the sentinel and build mutable defaults inside the body.",
    "`==` compares value, `is` compares identity. Use `is` only for `None`, the boolean singletons, and your own sentinels — small-integer caching makes it *appear* to work elsewhere.",
    "Immutability is shallow: a tuple can hold a list, and that list can still change. This is also why such a tuple is unhashable.",
    "Shared mutable state at module or class level is the root of a whole family of production bugs, and concurrency reveals rather than causes them."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does this print?",
        lang: "python",
        code: `a = [1, 2]
b = a
b += [3]
c = [1, 2]
d = c
d = d + [3]
print(a, c)`,
        options: [
          "`[1, 2, 3] [1, 2, 3]` — both use the same operation",
          "`[1, 2, 3] [1, 2]` — `+=` mutates in place, `+` builds a new list",
          "`[1, 2] [1, 2]` — neither affects the original name",
          "`[1, 2] [1, 2, 3]` — `+` mutates, `+=` rebinds"
        ],
        answer: 1,
        why: "On a mutable type, `+=` calls `__iadd__`, which modifies the object in place — so `a`, sharing that object with `b`, sees the change. `d + [3]` calls `__add__`, which builds a brand-new list, and the assignment rebinds only `d`. Identical-looking syntax, opposite outcomes. Note that on an immutable type like `str` the first case behaves like the second, because there is no in-place option."
      },
      {
        stem: "A function is defined as `def log(msg, history=[])`. It is called 1,000 times in a long-running server, always without the second argument. What happens?",
        options: [
          "Each call gets a fresh empty list, since defaults are re-evaluated per call",
          "One list is created at `def` time and shared by all 1,000 calls, growing without bound",
          "Python raises a `SyntaxError` because mutable defaults are not permitted",
          "The list is reset whenever the garbage collector runs"
        ],
        answer: 1,
        why: "Default arguments are evaluated once, when the `def` statement runs, and stored on the function object — you can see it in `log.__defaults__`. In a script this is a curiosity; in a server the function object lives for the process lifetime, so the list grows across every request. That is both a memory leak and a data-leak between requests. Use `history=None` and build the list in the body."
      },
      {
        stem: "Why is `if value is None:` preferred over `if value == None:`?",
        options: [
          "`is` is faster because it compares memory addresses rather than contents",
          "`==` can be overridden by a class, and some types return a non-boolean that makes `if` raise",
          "`== None` is deprecated and will be removed in a future Python version",
          "They are equivalent; `is None` is purely a style convention"
        ],
        answer: 1,
        why: "Correctness, not speed. `==` dispatches to `__eq__`, which any class may define. NumPy arrays and pandas objects return an element-wise result rather than a bool, so `if value == None:` raises `ValueError: truth value ... is ambiguous`. `is` compares identity directly and cannot be intercepted, so it behaves identically for every type. `is` is also marginally faster, but that is not the reason the idiom exists."
      },
      {
        stem: "`config = (\"prod\", [\"a\"])`. Which statement is true?",
        options: [
          "`config[1].append(\"b\")` raises `TypeError` because the tuple is immutable",
          "`config[1].append(\"b\")` succeeds, and `config` cannot be used as a dict key",
          "Both `config[0] = \"dev\"` and `config[1].append(\"b\")` succeed",
          "`config` can be used as a dict key because tuples are always hashable"
        ],
        answer: 1,
        why: "Immutability in Python is shallow. The tuple guarantees which objects it references will not change; it says nothing about those objects, so appending to the contained list works. The consequence is hashability: `hash()` on a tuple hashes its contents, and a list is unhashable, so this tuple cannot be a dict key or set member. `config[0] = \"dev\"` does raise `TypeError` — that part of the tuple's guarantee holds."
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
        q: "Is Python pass-by-value or pass-by-reference?",
        strong: "Neither term fits cleanly. Python passes object references by value — the parameter name is bound to the same object the caller passed. So the function can mutate that object and the caller sees it, but rebinding the parameter has no effect outside. It is the same mechanism as ordinary assignment, not a special calling convention.",
        answer: [
          { t: "p", text: "This question is a trap for people who memorised a term. The interviewer wants to see whether you can describe the actual mechanism rather than pick a label." },
          { t: "p", text: "The most convincing answer is a two-case demonstration you can narrate in ten seconds: a function that calls `.append()` on a list changes the caller's data; a function that does `data = [...]` does not. That one contrast proves you understand it, and it makes the terminology question irrelevant." },
          { t: "p", text: "If pressed for a name, \"call by object reference\" or \"call by sharing\" are the accurate terms — but leading with the demonstration is stronger than leading with vocabulary." }
        ],
        weak: "Confidently answering \"pass by reference\" and stopping. It predicts the wrong behaviour for the rebinding case, and the follow-up question is almost always designed to expose exactly that."
      },
      {
        level: "core",
        q: "Explain the mutable default argument problem.",
        strong: "Default values are evaluated once, when the `def` statement executes, and stored on the function object. A mutable default is therefore shared across every call that omits it, so mutations accumulate. The fix is a `None` sentinel with the real default constructed inside the body.",
        answer: [
          { t: "p", text: "Everyone knows the fix. What distinguishes a senior answer is explaining *why* Python behaves this way and why it matters operationally." },
          { t: "p", text: "The why: `def` is a statement that executes, building a function object; the defaults are ordinary expressions evaluated at that moment. It is not a special case — it is the general rule applied consistently." },
          { t: "p", text: "The operational point is the one that lands: in a long-running service the function object lives for the process lifetime, so the accumulating default leaks memory *and* can leak one request's data into another's response. Mentioning that linters catch it automatically (`ruff` rule `B006`) shows you think about prevention rather than vigilance." }
        ]
      },
      {
        level: "advanced",
        q: "Two objects compare equal with `==` but `is` returns `False`. Is that a bug?",
        strong: "No — that is the normal and expected case. `==` compares value, `is` compares identity, and two distinct objects can easily hold the same value. The situation genuinely worth investigating is the reverse: two names that are identical when you expected independent objects, which usually means an aliasing bug.",
        answer: [
          { t: "p", text: "The question tests whether you understand the two operators or have merely memorised \"use `==`\"." },
          { t: "p", text: "A good answer adds the caching nuance: CPython interns small integers and some strings, so `is` sometimes returns `True` for equal values and stops doing so above 256. Anyone who has debugged code relying on that will mention it, and it demonstrates you know it is an implementation detail with no guarantee." },
          { t: "p", text: "The strongest close is the practical inversion: the dangerous discovery is not `is` being `False`, it is `is` being unexpectedly `True` — two variables you believed were separate turning out to share one object. That is the aliasing bug, and it is the one that corrupts data." }
        ]
      },
      {
        level: "advanced",
        q: "A service intermittently returns one user's data on another user's request, only under load. How would you investigate?",
        strong: "Look for shared mutable state: module-level dicts or lists, mutable default arguments, mutable class attributes, and any cache or template object that is built once and mutated per request. Concurrency does not create this bug — it makes an existing one observable.",
        answer: [
          { t: "p", text: "This is a scenario question, so the interviewer is watching your method more than your answer." },
          { t: "p", text: "Narrate it as narrowing the search space: the data layer is probably fine, because the rows are correct. That points at state held between requests. From there, the candidates are a short, enumerable list — module-level mutables, mutable defaults, class attributes, and any object stored on the application instance." },
          { t: "p", text: "The insight worth stating explicitly is that adding a lock would be the wrong fix. A lock serialises access to state that should not be shared in the first place; it trades a correctness bug for a throughput problem and leaves the design flaw in place. The real fix is per-request construction, immutable defaults, and copying at boundaries." }
        ],
        weak: "Jumping straight to \"add a mutex\" or \"it's a database isolation problem\". Both skip the diagnosis, and the first one hides the bug rather than removing it."
      }
    ]
  }
});

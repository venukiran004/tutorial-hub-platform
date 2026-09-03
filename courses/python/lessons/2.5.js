/* ============================================================================
   LESSON 2.5 — Mutability: The Rules That Actually Apply
   ========================================================================= */
EC.receiveLesson({
  id: "2.5",

  lede: "Mutability has appeared in five lessons so far — aliasing, default arguments, shared class state, shallow copies, unhashable keys. That is not repetition; it is the same property surfacing in every place it can. This lesson consolidates it into a set of rules you can apply deliberately, and turns \"be careful\" into a design decision you make once per boundary.",

  objectives: [
    "State which operations mutate and which rebind, for every built-in type",
    "Decide where in a system mutable state is acceptable and where it is not",
    "Apply the four defences — immutability, copying, ownership, and boundaries — to a real design",
    "Explain why concurrency reveals mutability bugs rather than causing them",
    "Design an API whose mutability behaviour is obvious from its signature"
  ],

  prerequisites: ["1.4", "2.1", "2.3", "2.4"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The complete rule", id: "the-rule" },

    { t: "p", text: "Everything about mutability reduces to one question asked in two parts, first seen in Lesson 1.4:" },

    { t: "callout", kind: "mental", title: "The two-question test, restated", body: [
      { t: "ol", items: [
        "**Does this operation change the object, or bind a name to a different object?**",
        "**How many names currently reach that object?**"
      ]},
      { t: "p", text: "If the answer to the first is *changes the object* and the second is *more than one*, the change is visible everywhere. That is the entire mechanism behind every bug in this lesson." }
    ]},

    { t: "table",
      head: ["Operation", "Mutates or rebinds", "Notes"],
      rows: [
        ["`x = value`", "**Rebinds**", "Always. A bare name on the left never mutates."],
        ["`x.attr = value`", "**Mutates** `x`", "Sets an attribute on the object `x` refers to"],
        ["`x[key] = value`", "**Mutates** `x`", "Calls `__setitem__`"],
        ["`x[a:b] = values`", "**Mutates** `x`", "Replaces a region in place"],
        ["`x.append(v)`, `.update()`, `.add()`", "**Mutates**", "And returns `None`"],
        ["`x += y` on a list/set/dict", "**Mutates**", "Calls `__iadd__`, in place"],
        ["`x += y` on an int/str/tuple", "**Rebinds**", "No in-place option exists, so it builds a new object"],
        ["`x = x + y`", "**Rebinds**", "Always — `+` builds a new object regardless of type"],
        ["`sorted(x)`, `reversed(x)`", "Neither", "Return new objects; `x` is untouched"],
        ["`x.sort()`, `x.reverse()`", "**Mutates**", "In place, returning `None`"]
      ],
      caption: "The `+=` rows are the ones worth memorising: identical syntax, opposite behaviour, decided entirely by whether the left operand's type is mutable."
    },

    { t: "code", lang: "python", title: "the += asymmetry, and why it produces a strange error", code: `
# On a mutable type, += mutates and every alias sees it
a = [1, 2]
b = a
a += [3]
print(b)

# On an immutable type, += rebinds and aliases do not
s = "ab"
t = s
s += "c"
print(t)

# And this is why the following surprises people:
data = ([1, 2],)         # a tuple containing a list
data[0] += [3]           # raises TypeError...
print(data)              # ...but the list was modified anyway
`,
      out: `[1, 2, 3]
ab
TypeError: 'tuple' object does not support item assignment
([1, 2, 3],)`,
      caption: "`data[0] += [3]` is two steps: `__iadd__` mutates the list successfully, then the assignment back into the tuple fails. The exception is raised *after* the mutation has already happened — one of the few places Python leaves you in a half-completed state."
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "Where mutability is fine and where it is not", id: "where" },

    { t: "p", text: "Mutable state is not a defect. It is how you accumulate a result, build a cache, or model something that genuinely changes. The failure is not *using* mutable state — it is letting it cross a boundary where ownership becomes unclear." },

    { t: "viz",
      title: "Mutability by scope",
      caption: "Risk grows with how far an object can travel and how long it lives. A list built and returned inside one function is entirely safe. The same list stored at module level and handed to callers is a shared resource with no owner.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="Diagram: mutability risk increasing from local variables through parameters and attributes to module-level state">
  <rect x="20" y="46" width="200" height="88" rx="9" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
  <text x="120" y="70" text-anchor="middle" class="s-label" style="fill:var(--good)">Local</text>
  <text x="120" y="90" text-anchor="middle" class="s-sub">built and used inside</text>
  <text x="120" y="105" text-anchor="middle" class="s-sub">one function</text>
  <text x="120" y="124" text-anchor="middle" class="s-sub" style="fill:var(--good);font-weight:600">no risk — mutate freely</text>

  <rect x="238" y="46" width="200" height="88" rx="9" class="s-fill-2 s-stroke" stroke-width="1.5"/>
  <text x="338" y="70" text-anchor="middle" class="s-label">Parameter</text>
  <text x="338" y="90" text-anchor="middle" class="s-sub">the caller still holds</text>
  <text x="338" y="105" text-anchor="middle" class="s-sub">a reference</text>
  <text x="338" y="124" text-anchor="middle" class="s-sub" style="fill:var(--warn);font-weight:600">mutate only if documented</text>

  <rect x="456" y="46" width="200" height="88" rx="9" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1.5"/>
  <text x="556" y="70" text-anchor="middle" class="s-label" style="fill:var(--warn)">Instance attribute</text>
  <text x="556" y="90" text-anchor="middle" class="s-sub">lives as long as the</text>
  <text x="556" y="105" text-anchor="middle" class="s-sub">object; may be handed out</text>
  <text x="556" y="124" text-anchor="middle" class="s-sub" style="fill:var(--warn);font-weight:600">copy on the way out</text>

  <rect x="674" y="46" width="206" height="88" rx="9" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.5"/>
  <text x="777" y="70" text-anchor="middle" class="s-label" style="fill:var(--crit)">Module / class level</text>
  <text x="777" y="90" text-anchor="middle" class="s-sub">lives for the whole process,</text>
  <text x="777" y="105" text-anchor="middle" class="s-sub">shared by every caller</text>
  <text x="777" y="124" text-anchor="middle" class="s-sub" style="fill:var(--crit);font-weight:600">make it immutable</text>

  <line x1="20" y1="158" x2="880" y2="158" style="stroke:var(--border-strong)" stroke-width="1.5"/>
  <text x="20" y="180" class="s-sub" style="fill:var(--good)">short-lived, one owner</text>
  <text x="880" y="180" text-anchor="end" class="s-sub" style="fill:var(--crit)">long-lived, no owner</text>

  <rect x="20" y="204" width="860" height="58" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <text x="36" y="226" class="s-sub" style="fill:var(--ink-2);font-weight:600">The question that decides it: who is allowed to change this, and who will notice if they do?</text>
  <text x="36" y="248" class="s-sub">One clear owner -> mutate freely.  Several possible mutators -> make it immutable, or copy at the boundary.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the same list, four scopes", code: `
# 1. LOCAL -- entirely safe. Nothing else can reach it.
def totals(rows):
    out = []
    for row in rows:
        out.append(row["amount"])
    return out


# 2. PARAMETER -- the caller holds a reference. Mutating is a side effect.
def add_defaults(config: dict) -> None:      # the None return is the warning
    config.setdefault("timeout", 30)


# 3. ATTRIBUTE -- lives with the object, and .items exposes it to callers
class Cart:
    def __init__(self):
        self._items: list[str] = []

    @property
    def items(self) -> tuple[str, ...]:
        return tuple(self._items)            # hand out an immutable view


# 4. MODULE LEVEL -- shared by everything, for the life of the process
DEFAULT_TAGS = ("untagged",)                 # tuple, not list
`,
      hl: [22, 27]
    },

    /* ================================================================== */
    { t: "h2", n: "03", text: "The four defences", id: "defences" },

    { t: "ladder",
      title: "A settings object handed to many components",
      rungs: [
        { level: "bad", label: "Shared mutable dict", why: "no owner, no protection",
          code: `SETTINGS = {"retries": 3, "hosts": ["a", "b"]}


def get_settings():
    return SETTINGS


# Any component can do this, and it persists forever:
get_settings()["hosts"].append("c")`,
          note: "Every component receives the same dict and can change it for everyone else. There is no error, no log line, and no way to tell from a stack trace which component made the change." },

        { level: "ok", label: "Copy on the way out", why: "protects the source, costs per call",
          code: `import copy

_SETTINGS = {"retries": 3, "hosts": ["a", "b"]}


def get_settings() -> dict:
    return copy.deepcopy(_SETTINGS)`,
          note: "The source is now safe. Two costs remain: a full copy on every call, and callers still receive something mutable, so they can corrupt their own copy in confusing ways and nothing tells them the change was local." },

        { level: "best", label: "Immutable by construction", why: "the mistake becomes impossible",
          code: `from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Settings:
    retries: int = 3
    hosts: tuple[str, ...] = ("a", "b")


SETTINGS = Settings()

# SETTINGS.retries = 5          -> FrozenInstanceError
# SETTINGS.hosts.append("c")    -> AttributeError

# A variant is a new object, and the original is untouched:
from dataclasses import replace
staging = replace(SETTINGS, hosts=("staging",))`,
          note: "No copying, no cost per call, and both mistakes raise at the line that made them. The type itself now documents that these values do not change — a reader does not have to check, and a future contributor cannot accidentally remove the protection the way they could delete a defensive copy." }
      ]
    },

    { t: "dl", items: [
      ["1 · Immutability", "The strongest defence, because it removes the failure mode rather than guarding against it. `tuple`, `frozenset`, `@dataclass(frozen=True)`, `NamedTuple`. Use for constants, configuration, value objects and dict keys."],
      ["2 · Fresh construction", "A factory or `default_factory` builds a new object per call, so there is no shared instance to corrupt. Use for defaults and per-request state."],
      ["3 · Copy at the boundary", "Copy when data enters or leaves your control. Use when the data must stay mutable and the cost is acceptable — and prefer shallow, since a nested copy usually signals defence 1 was the right answer."],
      ["4 · Clear ownership", "Exactly one component may mutate; everyone else reads. Enforce it with naming (`_items`), properties returning immutable views, and documentation. Use when the state genuinely must change and copying would be too expensive."]
    ]},

    { t: "callout", kind: "good", title: "Make the signature tell the truth", body: [
      { t: "code", lang: "python", title: "three functions, three contracts", numbered: false, code: `
def sorted_by_total(orders: Sequence[Order]) -> list[Order]:
    """Returns new. Input untouched -- the return type says so."""


def sort_by_total(orders: list[Order]) -> None:
    """Mutates. The None return and the imperative name both signal it."""


def normalise(config: Mapping[str, str]) -> dict[str, str]:
    """Mapping in, dict out: 'I will not modify what you gave me.'"""`},
      { t: "p", text: "Two conventions do most of the work here. **A function returning `None` is announcing that it works by side effect** — that is why `list.sort()` returns `None`. And **accepting `Sequence` or `Mapping` rather than `list` or `dict`** tells a reader you only read the argument, because those abstract types have no mutating methods. Both are checkable by mypy, so the promise is enforced rather than merely stated." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Why concurrency is not the cause", id: "concurrency" },

    { t: "p", text: "Shared mutable state is a bug in a single-threaded program too — it is just harder to observe, because nothing else runs between your read and your write. Concurrency does not introduce the flaw; it removes the accident of timing that was hiding it." },

    { t: "code", lang: "python", title: "the same bug, twice", code: `
# Single-threaded: the bug exists, and looks like a puzzle.
CACHE = {"defaults": {"limit": 10}}

def build_query(overrides):
    q = CACHE["defaults"]          # NOT a copy
    q.update(overrides)            # mutates the shared default
    return q

print(build_query({"limit": 50}))
print(build_query({}))             # limit is now 50 forever
`,
      out: `{'limit': 50}
{'limit': 50}`
    },

    { t: "callout", kind: "insight", title: "What this means for the fix", body: [
      { t: "p", text: "When a data-corruption bug appears only under load, the instinct is to reach for a lock. A lock is the right tool when state genuinely must be shared and mutated — a counter, a connection pool. It is the wrong tool when the state should never have been shared at all." },
      { t: "p", text: "**Ask first: does this need to be shared?** If the answer is no — and for request-scoped data, templates and configuration it almost always is — then removing the sharing is a better fix than serialising access to it. A lock preserves the design flaw, costs throughput, and introduces the possibility of deadlock." },
      { t: "p", text: "Lesson 11.3 covers locks where they are genuinely needed. The point here is that most \"concurrency bugs\" in Python web services are mutability bugs that concurrency made visible." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make a class safe by design",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "The `ShoppingCart` below leaks mutable state in four separate ways. Each one lets a caller change the cart's internals without going through its methods, which means the class cannot enforce any of its own rules." },
        { t: "p", text: "Find all four, then redesign the class so the leaks are impossible rather than merely discouraged." }
      ],
      requirements: [
        "Identify each of the four leaks and describe how a caller would exploit it — deliberately or by accident.",
        "Redesign so that no caller can modify the cart's contents except through its methods.",
        "Do not use `copy.deepcopy` anywhere.",
        "Keep `items` readable and iterable by callers — hiding it entirely is not an acceptable fix.",
        "Enforce one business rule that the original could not: no more than 10 distinct items.",
        "Write a test that fails against the original for each of the four leaks."
      ],
      hint: "Look at the constructor's parameter, the attribute names, what the property returns, and the class-level default. Three of the four have appeared in earlier lessons.",
      solution: {
        lang: "python",
        title: "cart.py",
        code: `# ---- the original -----------------------------------------------------

class ShoppingCart:
    # LEAK 1: class attribute -- one list shared by every cart ever created
    applied_coupons = []

    # LEAK 2: mutable default -- evaluated once at def time
    def __init__(self, items=[]):
        # LEAK 3: stores the caller's list; the caller still holds it
        self.items = items

    # LEAK 4: returns the internal list itself, so callers can mutate it
    def get_items(self):
        return self.items


# ---- how each is exploited -------------------------------------------
#
# LEAK 1  cart_a.applied_coupons.append("X") is visible from cart_b, and
#         from every cart created later in the process.
#
# LEAK 2  ShoppingCart() twice returns two carts sharing ONE items list.
#         Adding to one adds to the other.
#
# LEAK 3  items = [...]; cart = ShoppingCart(items); items.append("free")
#         -- the caller adds to the cart without calling any method.
#
# LEAK 4  cart.get_items().append("free") bypasses add_item entirely,
#         which is why no quantity or item-limit rule can be enforced.


# ---- the redesign -----------------------------------------------------

from collections.abc import Iterator, Sequence

MAX_DISTINCT_ITEMS = 10


class CartFullError(ValueError):
    """The cart already holds the maximum number of distinct items."""


class ShoppingCart:
    """A cart whose contents can only change through its own methods."""

    def __init__(self, items: Sequence[str] | None = None) -> None:
        # FIX 2: None sentinel -- no mutable object exists at def time.
        # FIX 3: list(...) copies, so the caller's sequence is not adopted.
        #        Accepting Sequence rather than list also signals that we
        #        only read the argument.
        self._items: list[str] = list(items) if items else []

        # FIX 1: per-instance, not per-class. Every cart gets its own.
        self._coupons: set[str] = set()

    # FIX 4: expose a read-only view. tuple() is a cheap, genuinely
    # immutable snapshot -- a caller cannot write through it.
    @property
    def items(self) -> tuple[str, ...]:
        return tuple(self._items)

    @property
    def coupons(self) -> frozenset[str]:
        return frozenset(self._coupons)

    # Iteration and len work without exposing the underlying list, so
    # callers rarely need .items at all.
    def __iter__(self) -> Iterator[str]:
        return iter(self._items)

    def __len__(self) -> int:
        return len(self._items)

    def __contains__(self, item: str) -> bool:
        return item in self._items

    # The rule the original could not enforce, because leak 4 let callers
    # append directly to the internal list.
    def add_item(self, item: str) -> None:
        if item not in self._items and len(set(self._items)) >= MAX_DISTINCT_ITEMS:
            raise CartFullError(
                f"cart already holds {MAX_DISTINCT_ITEMS} distinct items"
            )
        self._items.append(item)

    def remove_item(self, item: str) -> None:
        self._items.remove(item)

    def apply_coupon(self, code: str) -> None:
        self._coupons.add(code.strip().upper())


# ---- the tests --------------------------------------------------------

def test_coupons_are_per_cart() -> None:            # leak 1
    a, b = ShoppingCart(), ShoppingCart()
    a.apply_coupon("SAVE10")
    assert b.coupons == frozenset()


def test_default_items_are_per_cart() -> None:      # leak 2
    a, b = ShoppingCart(), ShoppingCart()
    a.add_item("apple")
    assert len(b) == 0


def test_constructor_copies_input() -> None:        # leak 3
    source = ["apple"]
    cart = ShoppingCart(source)
    source.append("smuggled")
    assert list(cart) == ["apple"]


def test_items_view_is_immutable() -> None:         # leak 4
    cart = ShoppingCart(["apple"])
    snapshot = cart.items
    assert isinstance(snapshot, tuple)
    cart.add_item("pear")
    # The snapshot is a point-in-time value, not a live window.
    assert snapshot == ("apple",)


def test_item_limit_is_enforced() -> None:
    cart = ShoppingCart([f"item{i}" for i in range(MAX_DISTINCT_ITEMS)])
    try:
        cart.add_item("one-too-many")
    except CartFullError:
        pass
    else:
        raise AssertionError("expected CartFullError")


if __name__ == "__main__":
    for test in (
        test_coupons_are_per_cart,
        test_default_items_are_per_cart,
        test_constructor_copies_input,
        test_items_view_is_immutable,
        test_item_limit_is_enforced,
    ):
        test()
    print("all leaks closed")`,
        notes: [
          { t: "p", text: "**Leak 4 is the one that matters most**, and it is the least obvious. The other three cause data to bleed between objects; this one destroys the class's ability to enforce any rule at all. As long as `get_items()` hands out the real list, `add_item` is advisory — a caller can append directly and skip every check. That is why the item limit could not be added until the leak was closed." },
          { t: "p", text: "**`tuple(self._items)` is a snapshot, not a view**, and the test asserts that deliberately. A caller who holds `cart.items` and then adds to the cart sees the old value. That is a defensible design — it is a value, not a window — but it must be a decision rather than an accident, which is why the test states it." },
          { t: "p", text: "**Implementing `__iter__`, `__len__` and `__contains__`** means callers can write `for item in cart`, `len(cart)` and `\"apple\" in cart` without touching `.items` at all. Most consumers then never need the tuple, so the copying cost rarely arises. Lesson 4.9 covers these protocols properly." },
          { t: "callout", kind: "insight", title: "Why the leading underscore is not the fix", body: [
            { t: "p", text: "Renaming `items` to `_items` signals intent, and Python enforces nothing — a caller can still write `cart._items.append(...)`. It is a convention, and conventions are worth having." },
            { t: "p", text: "What actually closes the leak is that **the public surface returns an immutable type**. The underscore tells a reader not to reach inside; the tuple means that reaching in through the front door achieves nothing." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A background job builds a report from a template dict, and a second job runs an hour later using the same template. Over a week, the second job's reports accumulate fields that only the first job should add. Both jobs are in the same worker process, which restarts nightly — so the corruption resets every day and the pattern took weeks to spot." },
      { t: "p", text: "**The mechanism:** a module-level `REPORT_TEMPLATE` dict, copied with `.copy()` before use. The copy is shallow, so a nested `\"sections\"` list is shared. Job one appends to it, and the template is permanently changed for every later job in that process." },
      { t: "p", text: "**Why the nightly restart made it harder, not easier:** the corruption reset daily, so it never grew large enough to break anything obviously, and it never reproduced in a short-lived test run. Long-lived processes accumulate; test processes do not. That asymmetry is what lets this class of bug survive a full test suite." },
      { t: "p", text: "**The fix is defence 1.** A template that is never mutated should not be mutable: a frozen dataclass, or a factory function that builds a fresh dict per call. Both make the mistake raise instead of accumulate." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**A bare name on the left of `=` always rebinds. Everything else — `x.attr`, `x[k]`, `x[a:b]`, method calls — mutates.**",
    "`+=` mutates a list, set or dict and rebinds an int, str or tuple. Identical syntax, opposite behaviour, decided by the type.",
    "`data[0] += [3]` on a tuple mutates the inner list *and then* raises — one of the few places Python leaves a half-completed operation.",
    "Risk grows with scope: **local is free, parameters need documenting, attributes need a read-only view, module-level should be immutable.**",
    "The four defences, strongest first: **immutability**, **fresh construction per call**, **copy at the boundary**, **clear single ownership**.",
    "**Make the signature tell the truth.** Returning `None` announces a side effect; accepting `Sequence`/`Mapping` promises you will only read.",
    "Handing out an internal mutable collection destroys a class's ability to enforce its own rules — the leading underscore is a convention, the immutable return type is the enforcement.",
    "**Concurrency reveals mutability bugs; it does not cause them.** The same corruption exists single-threaded, hidden by timing.",
    "Reach for a lock only when state genuinely must be shared and mutated. For request-scoped data, templates and configuration, remove the sharing instead.",
    "Long-lived processes accumulate corruption that short-lived test runs never reproduce — which is why this whole class of bug passes CI."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What happens when you run `data = ([1, 2],)` followed by `data[0] += [3]`?",
        options: [
          "A `TypeError` is raised and `data` is unchanged",
          "A `TypeError` is raised, but the inner list has already been extended to `[1, 2, 3]`",
          "It succeeds — tuples allow modification of mutable elements",
          "A `TypeError` is raised before `__iadd__` runs, leaving everything untouched"
        ],
        answer: 1,
        why: "`x[0] += y` is two operations: `__iadd__` on the inner list, which succeeds and mutates it in place, then `__setitem__` on the tuple to store the result, which raises. The exception arrives after the mutation, leaving `data` as `([1, 2, 3],)` alongside the error. It is one of very few places in Python where a failed statement leaves a partial effect behind."
      },
      {
        stem: "A class exposes `def get_items(self): return self._items`. Why does this prevent the class from enforcing its rules?",
        options: [
          "It does not — the underscore prefix makes `_items` private",
          "Callers receive the actual internal list and can modify it directly, bypassing every method that would validate the change",
          "Returning a list from a method is a performance problem, not a correctness one",
          "It only matters if the class is used from multiple threads"
        ],
        answer: 1,
        why: "The method hands out the real object, so `cart.get_items().append(x)` skips `add_item` and every check inside it. Any limit, validation or invariant the class intends to maintain becomes advisory. The underscore is a convention that Python does not enforce; what actually closes the leak is returning an immutable type — `tuple(self._items)` — so writing through the returned value is impossible."
      },
      {
        stem: "A data-corruption bug appears only under concurrent load. What is the most likely correct fix?",
        options: [
          "Add a lock around every mutation of the shared object",
          "Determine whether the state should be shared at all — for request-scoped data, templates and config, remove the sharing rather than serialising access to it",
          "Switch from threads to processes so memory is not shared",
          "Increase the isolation level of the database transaction"
        ],
        answer: 1,
        why: "Concurrency reveals mutability bugs rather than causing them — the same corruption exists single-threaded, hidden by the fact that nothing runs between your read and your write. A lock is correct for state that genuinely must be shared and mutated, like a counter or a connection pool. For a template, a default or per-request data, sharing was never intended, and a lock preserves the design flaw while costing throughput and adding deadlock risk."
      },
      {
        stem: "Which signature most clearly promises that the function will not modify its argument?",
        options: [
          "`def process(items: list[str]) -> None:`",
          "`def process(items: Sequence[str]) -> list[str]:`",
          "`def process(items) -> list[str]:`",
          "`def process(items: list[str]) -> list[str]:`"
        ],
        answer: 1,
        why: "Two signals combine. `Sequence` has no mutating methods, so accepting it states that the function only reads — and mypy will reject an `.append()` call on it, making the promise checkable rather than merely stated. Returning a new `list` rather than `None` confirms the function produces a result instead of working by side effect. Option A actively signals the opposite: a `None` return conventionally means the function mutates its input."
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
        q: "Which built-in types are mutable, and why does it matter?",
        strong: "Mutable: list, dict, set, bytearray, and most custom classes. Immutable: int, float, str, tuple, frozenset, bytes, None. It matters because assignment binds names rather than copying, so a mutable object reached by two names can be changed through either — and because only immutable objects are hashable, so only they can be dict keys or set members.",
        answer: [
          { t: "p", text: "The list is easy; the consequences are what the question is testing. Lead with the two that have teeth: shared mutation through aliases, and hashability." },
          { t: "p", text: "Worth adding that immutability is *shallow* — a tuple containing a list is immutable in the sense that it will always hold the same objects, but those objects can still change, which is why such a tuple is unhashable." },
          { t: "p", text: "If you want to demonstrate practical experience rather than recall, name the places it bites: mutable default arguments, mutable class attributes, and shallow copies of nested structures. All three are the same property in different clothing." }
        ]
      },
      {
        level: "core",
        q: "How do you design an API so callers cannot corrupt an object's internal state?",
        strong: "Do not hand out internal mutable objects. Store them privately, expose read-only views — a tuple, a frozenset, or `__iter__` and `__len__` — and copy anything the caller passes in rather than adopting it. Where the value never needs to change, make the type itself immutable.",
        answer: [
          { t: "p", text: "The strongest answers name the reason rather than the rule: if callers can reach the internal list, every validation method becomes advisory, and the class cannot enforce any invariant." },
          { t: "p", text: "Two details that show experience. Copying constructor input matters as much as protecting the output — accepting a caller's list and storing it means they retain a reference and can add to your object without calling any method. And implementing `__iter__`, `__len__` and `__contains__` means most consumers never need the collection at all, so the copying cost rarely arises." },
          { t: "p", text: "It is worth being explicit that a leading underscore is a convention Python does not enforce. It tells a reader not to reach in; the immutable return type is what makes reaching in useless." }
        ]
      },
      {
        level: "advanced",
        q: "How would you decide between making a value immutable, copying it, and locking it?",
        strong: "Ask who owns it and whether it needs to change. If it never changes, make it immutable — that removes the failure mode entirely and costs nothing. If it changes but should not be shared, build it fresh per use. If it must be shared and mutated by exactly one component, use ownership and read-only views. Only when it must be shared *and* mutated by several do you need a lock.",
        answer: [
          { t: "p", text: "This is a judgement question and the ordering is the answer. Interviewers want to know whether you reach for synchronisation first or last." },
          { t: "p", text: "The point worth making explicitly: a lock is the correct tool for genuinely shared mutable state — a counter, a pool, a cache — and the wrong tool for state that should never have been shared. Applied to a template or request-scoped data, it preserves the design flaw, costs throughput, and introduces deadlock as a new failure mode." },
          { t: "p", text: "A strong close is the cost note on immutability: it is not free everywhere. Rebuilding a large structure to change one field is wasteful, which is why mutable accumulators inside a function are entirely correct. The rule is about what crosses a boundary, not about avoiding mutation as such." }
        ],
        weak: "Treating `deepcopy` as the general answer. It is slow, it copies things you did not intend such as connections and locks, and it leaves the shared-mutable design in place behind a defensive copy that a future change can silently remove."
      }
    ]
  }
});

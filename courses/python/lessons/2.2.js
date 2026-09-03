/* ============================================================================
   LESSON 2.2 — Tuples, Sets and Frozensets
   ========================================================================= */
EC.receiveLesson({
  id: "2.2",

  lede: "A tuple is not a read-only list. A set is not a list without duplicates. Both are usually taught as restricted versions of a list, and that framing hides what they are for: **a tuple is a record with positional fields**, and **a set is a hash table without values**. Once you see them that way, choosing between the four containers stops being a matter of taste.",

  objectives: [
    "Explain what makes a tuple different from a list beyond immutability",
    "Use tuple unpacking, including starred targets and swapping",
    "Describe how a set achieves O(1) membership, and what it requires of its elements",
    "Apply set algebra to replace loops with single operations",
    "Say when `frozenset` is necessary rather than merely available"
  ],

  prerequisites: ["1.4", "2.1"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "A tuple is a record, not a frozen list", id: "tuples" },

    { t: "p", text: "The usual explanation — *a tuple is an immutable list* — is technically true and pedagogically misleading. The distinction experienced Python engineers actually use is about **what the positions mean**." },

    { t: "table",
      head: ["", "List", "Tuple"],
      rows: [
        ["Typical contents", "Many items of the **same kind**", "A few fields of **different kinds**"],
        ["Position means", "Nothing in particular — order may be arbitrary", "Something specific — position 0 is always the same field"],
        ["Length", "Varies at runtime", "Fixed by the structure of the data"],
        ["Natural operation", "Iterate over all of them", "Unpack into named variables"],
        ["Example", "`prices = [19.99, 5.01, 0.10]`", "`point = (x, y)`, `row = (id, name, created_at)`"]
      ],
      caption: "A useful test: if you would be comfortable appending an element, it is a list. If appending would make no sense because the fields are positional, it is a tuple."
    },

    { t: "code", lang: "python", title: "the practical consequences of immutability", code: `
# 1. Tuples are hashable (if their contents are), so they can be dict keys.
cache = {}
cache[("users", 42, "profile")] = {"name": "Ada"}

# A list cannot:
# cache[["users", 42]] = ...   ->  TypeError: unhashable type: 'list'

# 2. Tuples are slightly smaller and faster to create.
import sys
print(sys.getsizeof((1, 2, 3)), sys.getsizeof([1, 2, 3]))

# 3. They signal intent: this will not change.
CONNECTION = ("localhost", 5432)
`,
      out: `64 88`
    },

    { t: "callout", kind: "trap", title: "The single-element tuple", body: [
      { t: "code", lang: "python", title: "the comma is the syntax, not the parentheses", numbered: false, code: `
a = (1)        # just the integer 1 in parentheses
b = (1,)       # a one-element tuple
c = 1,         # also a one-element tuple -- parentheses are optional

print(type(a), type(b), type(c))`,
        out: `<class 'int'> <class 'tuple'> <class 'tuple'>`},
      { t: "p", text: "It is the **comma** that builds a tuple, not the brackets. This surfaces most often as an accidental trailing comma turning a value into a tuple:" },
      { t: "code", lang: "python", title: "the accident", numbered: false, code: `
timeout = 30,          # trailing comma -> (30,)
requests.get(url, timeout=timeout)   # TypeError, several frames later`},
      { t: "p", text: "It also explains a syntax that otherwise looks strange: `return x, y` returns a tuple, and `for k, v in d.items()` unpacks one." }
    ]},

    { t: "code", lang: "python", title: "unpacking", code: `
point = (3, 7)
x, y = point                      # basic unpacking

a, b = b, a                       # swap -- builds a tuple, then unpacks it

first, *rest = [1, 2, 3, 4]       # starred target absorbs the remainder
print(first, rest)

*head, last = [1, 2, 3, 4]
print(head, last)

# Ignore fields you do not need with _ by convention
_, name, _ = ("id-1", "Ada", "2024-01-01")
print(name)

# Nested unpacking mirrors the structure
(a, b), c = (1, 2), 3
print(a, b, c)
`,
      out: `1 [2, 3, 4]
[1, 2, 3] 4
Ada
1 2 3`
    },

    { t: "callout", kind: "insight", title: "When a tuple has grown too many fields", body: [
      { t: "p", text: "Tuples index by position, which stops being readable at about three fields. `order[4]` tells a reader nothing, and inserting a field silently breaks every index after it." },
      { t: "code", lang: "python", title: "the upgrade path", numbered: false, code: `
from typing import NamedTuple

class Order(NamedTuple):
    id: int
    customer: str
    total: Decimal
    status: str = "pending"


order = Order(1, "ada", Decimal("19.99"))
print(order.total)          # named access
print(order[2])             # still a tuple -- indexing works
id_, customer, *_ = order   # still unpacks`,
        caption: "`NamedTuple` is a tuple: immutable, hashable, unpackable, and comparable. It adds names for free."},
      { t: "p", text: "**Rule of thumb:** two or three fields whose meaning is obvious from context — a plain tuple is fine. Beyond that, or whenever the tuple crosses a function boundary, use `NamedTuple`. If you need mutability or methods, use a `dataclass` (Lesson 4.10)." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Sets are hash tables without values", id: "sets" },

    { t: "p", text: "A set stores its elements in a hash table: it computes `hash(element)`, uses that to pick a slot directly, and looks only there. That is why membership does not depend on the size of the set." },

    { t: "viz",
      title: "Why set membership is O(1) and list membership is O(n)",
      caption: "A list must compare against each element until it finds a match. A set computes the hash of the value, jumps to the corresponding slot, and compares against whatever is there. The list gets slower as it grows; the set does not.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="Diagram comparing linear scan in a list with direct hash lookup in a set">
  <defs>
    <marker id="a7" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--crit)"/>
    </marker>
    <marker id="a7g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--good)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-mono" style="font-size:11px;fill:var(--crit)">"kiwi" in list</text>
  <g>
    <rect x="20" y="40" width="72" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="56" y="62" text-anchor="middle" class="s-mono" style="font-size:10px">apple</text>
    <rect x="98" y="40" width="72" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="134" y="62" text-anchor="middle" class="s-mono" style="font-size:10px">pear</text>
    <rect x="176" y="40" width="72" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="212" y="62" text-anchor="middle" class="s-mono" style="font-size:10px">plum</text>
    <rect x="254" y="40" width="72" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="290" y="62" text-anchor="middle" class="s-mono" style="font-size:10px">fig</text>
    <rect x="332" y="40" width="72" height="34" rx="5" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
    <text x="368" y="62" text-anchor="middle" class="s-mono" style="font-size:10px">kiwi</text>
  </g>
  <path d="M56 82 L134 82" style="stroke:var(--crit);fill:none" stroke-width="1.3" marker-end="url(#a7)"/>
  <path d="M134 88 L212 88" style="stroke:var(--crit);fill:none" stroke-width="1.3" marker-end="url(#a7)"/>
  <path d="M212 94 L290 94" style="stroke:var(--crit);fill:none" stroke-width="1.3" marker-end="url(#a7)"/>
  <path d="M290 100 L368 100" style="stroke:var(--crit);fill:none" stroke-width="1.3" marker-end="url(#a7)"/>
  <text x="430" y="72" class="s-sub" style="fill:var(--crit)">5 comparisons. A million elements,</text>
  <text x="430" y="88" class="s-sub" style="fill:var(--crit)">a million comparisons.  O(n)</text>

  <line x1="20" y1="124" x2="880" y2="124" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="150" class="s-mono" style="font-size:11px;fill:var(--good)">"kiwi" in set</text>
  <rect x="20" y="164" width="110" height="34" rx="5" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <text x="75" y="186" text-anchor="middle" class="s-mono" style="font-size:10px">hash("kiwi")</text>
  <path d="M130 181 L186 181" style="stroke:var(--good);fill:none" stroke-width="1.6" marker-end="url(#a7g)"/>
  <text x="158" y="173" text-anchor="middle" class="s-sub" style="fill:var(--good)">slot 3</text>

  <g>
    <rect x="192" y="164" width="56" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="220" y="186" text-anchor="middle" class="s-sub">0</text>
    <rect x="254" y="164" width="56" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="282" y="186" text-anchor="middle" class="s-sub">1</text>
    <rect x="316" y="164" width="56" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="344" y="186" text-anchor="middle" class="s-sub">2</text>
    <rect x="378" y="164" width="66" height="34" rx="5" style="fill:var(--good-soft);stroke:var(--good)" stroke-width="1.5"/>
    <text x="411" y="186" text-anchor="middle" class="s-mono" style="font-size:10px">kiwi</text>
    <rect x="450" y="164" width="56" height="34" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="478" y="186" text-anchor="middle" class="s-sub">4</text>
  </g>
  <text x="530" y="180" class="s-sub" style="fill:var(--good)">1 hash + 1 comparison, regardless</text>
  <text x="530" y="196" class="s-sub" style="fill:var(--good)">of size.  O(1)</text>

  <text x="20" y="232" class="s-sub" style="fill:var(--ink-2)">The price: elements must be hashable (immutable), and order is not preserved.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "creating and mutating", code: `
fruits = {"apple", "pear", "plum"}
empty = set()                     # {} is an empty DICT, not a set

fruits.add("fig")                 # add one
fruits.update(["kiwi", "apple"])  # add many; duplicates are ignored
fruits.discard("pear")            # remove if present, no error if absent
fruits.remove("plum")             # remove, raises KeyError if absent

print(len(fruits), "apple" in fruits)

# Deduplicate any iterable in one call:
print(sorted(set([3, 1, 3, 2, 1])))
`,
      out: `4 True
[1, 2, 3]`
    },

    { t: "callout", kind: "trap", title: "Sets require hashable elements, and lose order", body: [
      { t: "code", lang: "python", title: "two constraints", numbered: false, code: `
{[1, 2]}                     # TypeError: unhashable type: 'list'
{(1, 2)}                     # fine -- tuples are hashable
{{"a": 1}}                   # TypeError: unhashable type: 'dict'

# Order is not preserved and must not be relied on:
print(list({"b", "a", "c"}))   # some order, not necessarily this one`},
      { t: "p", text: "The hashability requirement is not arbitrary — a set finds elements *by* their hash, so an element whose hash changed after insertion would become unreachable. Immutability is what guarantees the hash stays stable." },
      { t: "p", text: "**If you need deduplication that preserves order**, use a dict, whose insertion order is guaranteed:" },
      { t: "code", lang: "python", title: "ordered dedup", numbered: false, code: `
items = ["b", "a", "b", "c", "a"]
print(list(dict.fromkeys(items)))`,
        out: `['b', 'a', 'c']`}
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Set algebra replaces loops", id: "set-algebra" },

    { t: "code", lang: "python", title: "the four operations", code: `
current = {"read", "write", "delete"}
required = {"read", "write", "admin"}

print(current | required)     # union        -- in either
print(current & required)     # intersection -- in both
print(current - required)     # difference   -- in current only
print(current ^ required)     # symmetric    -- in exactly one
`,
      out: `{'read', 'write', 'delete', 'admin'}
{'read', 'write'}
{'delete'}
{'delete', 'admin'}`
    },

    { t: "ladder",
      title: "Reconciling permissions between two systems",
      rungs: [
        { level: "bad", label: "Nested loops", why: "O(n*m) and hard to read",
          code: `to_grant = []
for perm in required:
    found = False
    for existing in current:
        if perm == existing:
            found = True
            break
    if not found:
        to_grant.append(perm)`,
          note: "Nine lines to express one idea, and the idea is buried. It is also quadratic — every required permission scans the whole current list." },

        { level: "ok", label: "Comprehension with a set lookup", why: "linear, still explicit",
          code: `current_set = set(current)
to_grant = [p for p in required if p not in current_set]`,
          note: "Linear and readable. This is the right answer when you genuinely need a list, or when order matters and must follow `required`." },

        { level: "best", label: "Set algebra", why: "says what it means",
          code: `current = set(current_permissions)
required = set(required_permissions)

to_grant = required - current
to_revoke = current - required
unchanged = current & required`,
          note: "Three lines answer three questions, each of which reads as its own definition. The nested-loop version computed only the first, and a reader had to reconstruct what it meant. This is the shape of code that survives a rewrite: the operation and the intent are the same expression." }
      ]
    },

    { t: "table",
      head: ["Method", "Operator", "Note"],
      rows: [
        ["`a.union(b)`", "`a | b`", "The method accepts any iterable; the operator requires a set"],
        ["`a.intersection(b)`", "`a & b`", "Same distinction"],
        ["`a.difference(b)`", "`a - b`", "In `a` but not `b`"],
        ["`a.symmetric_difference(b)`", "`a ^ b`", "In exactly one of them"],
        ["`a.issubset(b)`", "`a <= b`", "Every element of `a` is in `b`"],
        ["`a.issuperset(b)`", "`a >= b`", "The reverse"],
        ["`a.isdisjoint(b)`", "—", "No shared elements; cheaper than testing `a & b`"]
      ],
      caption: "The method forms accept any iterable, so `required.difference(current_list)` works without converting first. The operator forms require both sides to be sets, which is occasionally a useful strictness."
    },

    { t: "callout", kind: "good", title: "Subset tests read as requirements", body: [
      { t: "code", lang: "python", title: "permission checks", numbered: false, code: `
REQUIRED = {"read", "write"}

def can_edit(user_permissions: set[str]) -> bool:
    return REQUIRED <= user_permissions        # "has at least these"


def touches_admin(user_permissions: set[str]) -> bool:
    return not user_permissions.isdisjoint({"admin", "root"})`},
      { t: "p", text: "`REQUIRED <= user_permissions` is both faster and clearer than `all(p in user_permissions for p in REQUIRED)`. When a condition is naturally about membership across two collections, set operators usually express it in one line." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "frozenset", id: "frozenset" },

    { t: "p", text: "A `frozenset` is an immutable set. Since it cannot change, it is hashable — which means it can be a dictionary key or an element of another set. That is the reason it exists, and it is a narrower reason than it first appears." },

    { t: "code", lang: "python", title: "the cases that require it", code: `
# 1. A set of sets -- the elements must be hashable
teams = {frozenset({"ada", "grace"}), frozenset({"alan", "edsger"})}

# 2. A dict keyed by a group of things, where order is irrelevant
route_cache: dict[frozenset[str], float] = {}
route_cache[frozenset({"LHR", "JFK"})] = 5540.0
print(route_cache[frozenset({"JFK", "LHR"})])   # same key, either order

# 3. A module-level constant that must not be mutated by accident
VALID_STATUSES = frozenset({"pending", "paid", "refunded"})
# VALID_STATUSES.add("cancelled")   ->  AttributeError
`,
      out: `5540.0`
    },

    { t: "callout", kind: "insight", title: "The third case is the one you will use most", body: [
      { t: "p", text: "Lesson 1.4 covered shared mutable state at module level. A module constant declared as a `set` can be mutated by any code that touches it, and the mutation persists for the life of the process — corrupting every later use with no error and no obvious cause." },
      { t: "p", text: "Declaring it `frozenset` makes that mistake raise immediately, at the line that made it. The cost is nothing: membership tests are identical, and the object is marginally smaller. **Module-level collections that represent fixed vocabularies should be `frozenset` or `tuple` by default.**" }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Reconcile two systems",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "A nightly job compares user records between an internal directory and an external identity provider, and produces a report of what needs to change. This is one of the most common real uses of set operations, and it is usually written as nested loops." },
        { t: "p", text: "Write the reconciliation so that each question is answered by one expression." }
      ],
      requirements: [
        "Given two lists of user dicts (each with `email` and `role`), report: users only in the directory, users only in the provider, and users in both.",
        "For users in both, report those whose `role` differs, showing both values.",
        "Match users by `email`, case-insensitively — the two systems disagree about capitalisation.",
        "Use set operations for the membership questions rather than loops.",
        "Return a structure a caller can act on, not printed text.",
        "Include a module-level constant of roles that must not be mutable."
      ],
      hint: "Build a dict keyed by the normalised email for each system. The dict keys are already a set-like view, so `a.keys() - b.keys()` works directly without building separate sets.",
      solution: {
        lang: "python",
        title: "reconcile.py",
        code: `"""Reconcile user records between two systems using set algebra."""

from __future__ import annotations

from typing import NamedTuple

# frozenset, not set: this is a fixed vocabulary and must not be mutated
# by anything that imports it.
VALID_ROLES = frozenset({"admin", "editor", "viewer"})


class RoleMismatch(NamedTuple):
    email: str
    directory_role: str
    provider_role: str


class Reconciliation(NamedTuple):
    only_in_directory: set[str]
    only_in_provider: set[str]
    in_both: set[str]
    role_mismatches: list[RoleMismatch]


def index_by_email(users: list[dict]) -> dict[str, dict]:
    """Key users by normalised email.

    Normalising here rather than at every comparison means the matching
    rule is stated once, in one place.
    """
    return {user["email"].strip().lower(): user for user in users}


def reconcile(directory: list[dict], provider: list[dict]) -> Reconciliation:
    dir_by_email = index_by_email(directory)
    prov_by_email = index_by_email(provider)

    # dict.keys() is already a set-like view supporting -, & and |,
    # so no intermediate set() conversion is needed.
    only_dir = dir_by_email.keys() - prov_by_email.keys()
    only_prov = prov_by_email.keys() - dir_by_email.keys()
    both = dir_by_email.keys() & prov_by_email.keys()

    mismatches = [
        RoleMismatch(
            email=email,
            directory_role=dir_by_email[email]["role"],
            provider_role=prov_by_email[email]["role"],
        )
        for email in sorted(both)
        if dir_by_email[email]["role"] != prov_by_email[email]["role"]
    ]

    return Reconciliation(
        only_in_directory=set(only_dir),
        only_in_provider=set(only_prov),
        in_both=set(both),
        role_mismatches=mismatches,
    )


if __name__ == "__main__":
    directory = [
        {"email": "Ada@example.com", "role": "admin"},
        {"email": "grace@example.com", "role": "editor"},
        {"email": "alan@example.com", "role": "viewer"},
    ]
    provider = [
        {"email": "ada@example.com ", "role": "editor"},
        {"email": "grace@example.com", "role": "editor"},
        {"email": "edsger@example.com", "role": "viewer"},
    ]

    result = reconcile(directory, provider)

    assert result.only_in_directory == {"alan@example.com"}
    assert result.only_in_provider == {"edsger@example.com"}
    assert result.in_both == {"ada@example.com", "grace@example.com"}
    assert result.role_mismatches == [
        RoleMismatch("ada@example.com", "admin", "editor")
    ]

    print(f"to deprovision : {sorted(result.only_in_directory)}")
    print(f"to create      : {sorted(result.only_in_provider)}")
    for m in result.role_mismatches:
        print(f"role differs   : {m.email}  {m.directory_role} -> {m.provider_role}")`,
        notes: [
          { t: "p", text: "**`dict.keys()` is a set-like view.** It supports `-`, `&`, `|` and `^` directly, so `dir_by_email.keys() - prov_by_email.keys()` needs no conversion. This is the detail that makes the index-then-compare pattern so clean, and most people convert to sets unnecessarily. Lesson 2.3 covers views in full." },
          { t: "p", text: "**Normalising in `index_by_email` states the matching rule once.** Written as a comparison inside the loop, `a[\"email\"].lower() == b[\"email\"].lower()` appears in several places and can drift — one of them forgets `.strip()` and the reconciliation reports a phantom difference. Putting the rule in the index means every comparison inherits it." },
          { t: "p", text: "**Returning a `NamedTuple` rather than printing** means the caller can act on the result — deprovision accounts, open tickets, emit metrics — and the function can be tested with plain equality assertions. A function that prints is a function you cannot test." },
          { t: "callout", kind: "insight", title: "Why sorted() appears in the comprehension", body: [
            { t: "p", text: "`both` is a set, and set iteration order is unspecified. Without `sorted`, the mismatch list would come out in an arbitrary order that could differ between runs — making the assertion flaky and the report unstable diff-to-diff." },
            { t: "p", text: "This is a small habit with a large payoff: **when a set feeds anything a human or a test will compare, sort it on the way out.** Nondeterministic output is one of the more frustrating sources of intermittent CI failures." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A service caches expensive route calculations in a dict keyed by the pair of airports. Cache hit rates are far lower than expected, and profiling shows the same routes being recomputed repeatedly." },
      { t: "p", text: "**The cause:** the key is a tuple, `(origin, destination)`. A journey from LHR to JFK and one from JFK to LHR produce different keys — correct if the route is directional, wrong if the cached value is symmetric. Half the cache is duplicated entries." },
      { t: "p", text: "**The fix depends on the semantics, and that is the point.** If the value genuinely does not depend on direction, `frozenset({origin, destination})` is the honest key — it hashes identically regardless of order, and its type documents that order is irrelevant. If direction does matter, the tuple is correct and the bug is elsewhere." },
      { t: "p", text: "The generalisable habit: **a cache key is a claim about what makes two requests equivalent.** When hit rates disappoint, the key is usually the first thing to examine, and the choice between `tuple` and `frozenset` is exactly the choice between *ordered* and *unordered* equivalence." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**A tuple is a record with positional fields**, not a frozen list. If appending would be meaningless, it is a tuple; if the items are interchangeable members of a collection, it is a list.",
    "The **comma** creates a tuple, not the parentheses. `x = 30,` is a one-element tuple, and an accidental trailing comma fails several frames later.",
    "Tuples are hashable when their contents are, which is what lets them be dict keys and set elements.",
    "Past three fields, upgrade to `NamedTuple` — still a tuple, still unpackable, but positions gain names and inserting a field stops breaking every index.",
    "**A set is a hash table without values.** Membership is O(1) because it computes the hash and looks in one slot rather than scanning.",
    "The price is that elements must be hashable and order is not preserved. For order-preserving deduplication use `dict.fromkeys(items)`.",
    "**Set algebra replaces loops:** `required - current` is what to add, `current - required` is what to remove, `a & b` is the overlap, and `REQUIRED <= permissions` is \"has at least these\".",
    "`dict.keys()` is a set-like view, so you can apply `-`, `&` and `|` to it directly without converting.",
    "Use `frozenset` when you need a set as a dict key or inside another set — and for **module-level constants**, where it turns accidental mutation into an immediate error.",
    "When a set feeds a report, a test or anything a human compares, `sorted()` it on the way out. Unspecified iteration order is a common source of flaky output."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is `type(x)` after `x = (42)`, and after `y = 42,`?",
        options: [
          "Both are tuples — parentheses and commas both create them",
          "`x` is an `int` and `y` is a `tuple` — the comma creates the tuple, not the parentheses",
          "`x` is a `tuple` and `y` is an `int` — parentheses are required",
          "Both are ints — a single value cannot form a tuple"
        ],
        answer: 1,
        why: "The comma is the tuple constructor. `(42)` is just `42` in redundant parentheses, while `42,` is a one-element tuple with the parentheses omitted entirely. This is why `return x, y` returns a tuple and why an accidental trailing comma — `timeout = 30,` — produces a `TypeError` several frames later when something tries to use it as a number. The empty tuple `()` is the one case where parentheses do the work."
      },
      {
        stem: "Why can a list not be an element of a set?",
        options: [
          "Sets only accept scalar values, not containers",
          "Lists are mutable and therefore unhashable — a set locates elements by hash, so an element whose hash could change would become unreachable",
          "Lists have no `__eq__`, which sets require for deduplication",
          "It is an arbitrary restriction inherited from the C implementation"
        ],
        answer: 1,
        why: "A set stores each element in a slot determined by its hash. If an element mutated after insertion, its hash would change and the set would look for it in the wrong slot — it would be present but unfindable, and could be inserted a second time. Immutability is what guarantees hash stability, which is why tuples and frozensets are allowed and lists, dicts and sets are not."
      },
      {
        stem: "Two systems hold permission sets. Which expression gives the permissions that must be **added** to `current` to match `required`?",
        options: [
          "`current - required`",
          "`required - current`",
          "`current ^ required`",
          "`current & required`"
        ],
        answer: 1,
        why: "`required - current` is everything in `required` that is not already in `current` — precisely the set to grant. `current - required` is the reverse: permissions to revoke. The symmetric difference `^` gives both at once but does not say which direction each element needs, so it is the wrong tool for generating actions. `&` gives what is already correct and needs no change."
      },
      {
        stem: "A module defines `VALID_STATUSES = {\"pending\", \"paid\"}`. Why is `frozenset` a better choice?",
        options: [
          "It is faster for membership testing than a regular set",
          "Any code that imports it could otherwise mutate it, and that mutation would persist for the life of the process with no error",
          "Regular sets cannot be used as module-level constants",
          "It reduces memory usage significantly for large collections"
        ],
        answer: 1,
        why: "A module-level set is shared mutable state — the trap from Lesson 1.4. Any importer can call `.add()` on it, corrupting every subsequent use for the whole process with no exception and no obvious cause. `frozenset` turns that mistake into an immediate `AttributeError` at the offending line. Membership performance is effectively identical, so the safety is free."
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
        q: "When would you use a tuple instead of a list?",
        strong: "When the positions mean different things and the length is fixed by the structure of the data — a coordinate, a database row, a return value with two parts. A list holds many items of the same kind; a tuple holds a few fields of different kinds. The immutability follows from that, rather than being the reason.",
        answer: [
          { t: "p", text: "Most candidates answer \"when you do not want it to change\", which is true and shallow. Leading with the record-versus-collection distinction shows you have a design rule rather than a syntax fact." },
          { t: "p", text: "The practical consequences are worth naming: tuples are hashable so they work as dict keys, and they signal to a reader that the shape is fixed. A good test to offer: *would appending an element make sense?* If yes it is a list, if not it is a tuple." },
          { t: "p", text: "Close by mentioning when a tuple has outgrown itself — past about three fields, positional access stops being readable and `NamedTuple` gives you names without giving up tuple behaviour." }
        ]
      },
      {
        level: "core",
        q: "Why is `x in some_set` faster than `x in some_list`?",
        strong: "A set is a hash table. It computes `hash(x)`, uses that to select a slot, and compares against whatever is there — one comparison regardless of size. A list has no index into its contents, so it compares against elements in order until it finds a match. O(1) versus O(n).",
        answer: [
          { t: "p", text: "The follow-up is usually about the cost: what does the set require in exchange? Elements must be hashable, so mutable objects are excluded, and iteration order is not preserved." },
          { t: "p", text: "The observation worth volunteering is where this matters most: a membership test inside a loop turns the whole loop quadratic. Converting the collection to a set once, before the loop, is one of the highest-value single-line changes in everyday Python — and it is the fix behind a large share of \"it works on test data and hangs in production\"." }
        ]
      },
      {
        level: "advanced",
        q: "Given two collections of records, how would you find what to add, remove, and update?",
        strong: "Index both by their key into dicts, then use set algebra on the key views: `new.keys() - old.keys()` to add, `old.keys() - new.keys()` to remove, and `old.keys() & new.keys()` for the overlap, comparing values within that to find updates.",
        answer: [
          { t: "p", text: "This is a design question wearing a data-structures costume — reconciliation appears constantly in real systems, and the nested-loop version is what most people write first." },
          { t: "p", text: "Two details mark experience. First, that `dict.keys()` is already a set-like view, so no conversion is needed. Second, that normalising the key — trimming and lower-casing an email, for instance — belongs in the indexing step, so the matching rule is stated once instead of being repeated at every comparison where it can drift." },
          { t: "p", text: "If you want to go further, mention sorting anything derived from a set before it reaches a report or an assertion. Set iteration order is unspecified, and unstable output is a recurring source of flaky tests and noisy diffs." }
        ],
        weak: "Describing nested loops over both collections. It is quadratic, and it buries three distinct questions inside one block of control flow so a reader cannot tell what is being computed."
      }
    ]
  }
});

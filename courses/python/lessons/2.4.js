/* ============================================================================
   LESSON 2.4 — Indexing, Slicing and Copying
   ========================================================================= */
EC.receiveLesson({
  id: "2.4",

  lede: "Slicing is the most elegant syntax in Python and the source of its most expensive quiet bug. `new = old[:]` looks like it makes a copy — and it does, of the **outer** container only. Every nested object is still shared. This lesson makes slice semantics precise, then draws the shallow-versus-deep line where you can actually see it.",

  objectives: [
    "Predict the result of any slice, including negative indices and steps",
    "Use slice assignment to modify a sequence in place",
    "State exactly what `[:]`, `.copy()`, `list()` and `dict()` copy and what they share",
    "Choose between shallow copy, deep copy and immutability for a given situation",
    "Recognise the nested-mutation bug before it is written"
  ],

  prerequisites: ["1.4", "2.1", "2.3"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "Indexing and slice arithmetic", id: "indexing" },

    { t: "code", lang: "python", title: "the mental model for indices", code: `
items = ["a", "b", "c", "d", "e"]

print(items[0], items[-1])       # first, last
print(items[1:4])                # start inclusive, stop EXCLUSIVE
print(items[:3])                 # omit start -> from the beginning
print(items[2:])                 # omit stop  -> to the end
print(items[::2])                # step 2
print(items[::-1])               # reversed copy
print(items[-2:])                # last two
`,
      out: `a e
['b', 'c', 'd']
['a', 'b', 'c']
['c', 'd', 'e']
['a', 'c', 'e']
['e', 'd', 'c', 'b', 'a']
['d', 'e']`
    },

    { t: "viz",
      title: "Indices label the gaps between elements",
      caption: "Thinking of indices as positions *between* elements rather than on them makes every slice rule obvious: length is stop minus start, adjacent slices join without overlap or gaps, and the exclusive stop stops being arbitrary.",
      svg: `<svg viewBox="0 0 900 220" role="img" aria-label="Diagram: slice indices as boundaries between elements, with positive and negative numbering">
  <g>
    <rect x="120" y="60" width="120" height="48" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="180" y="90" text-anchor="middle" class="s-mono">"a"</text>
    <rect x="240" y="60" width="120" height="48" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="300" y="90" text-anchor="middle" class="s-mono">"b"</text>
    <rect x="360" y="60" width="120" height="48" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
    <text x="420" y="90" text-anchor="middle" class="s-mono">"c"</text>
    <rect x="480" y="60" width="120" height="48" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
    <text x="540" y="90" text-anchor="middle" class="s-mono">"d"</text>
    <rect x="600" y="60" width="120" height="48" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="660" y="90" text-anchor="middle" class="s-mono">"e"</text>
  </g>

  <g style="stroke:var(--border-strong)" stroke-width="1">
    <line x1="120" y1="52" x2="120" y2="116"/>
    <line x1="240" y1="52" x2="240" y2="116"/>
    <line x1="360" y1="52" x2="360" y2="116"/>
    <line x1="480" y1="52" x2="480" y2="116"/>
    <line x1="600" y1="52" x2="600" y2="116"/>
    <line x1="720" y1="52" x2="720" y2="116"/>
  </g>

  <text x="120" y="42" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">0</text>
  <text x="240" y="42" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">1</text>
  <text x="360" y="42" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">2</text>
  <text x="480" y="42" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">3</text>
  <text x="600" y="42" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">4</text>
  <text x="720" y="42" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">5</text>

  <text x="120" y="134" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--warn)">-5</text>
  <text x="240" y="134" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--warn)">-4</text>
  <text x="360" y="134" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--warn)">-3</text>
  <text x="480" y="134" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--warn)">-2</text>
  <text x="600" y="134" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--warn)">-1</text>

  <line x1="360" y1="156" x2="600" y2="156" style="stroke:var(--accent)" stroke-width="2"/>
  <line x1="360" y1="150" x2="360" y2="162" style="stroke:var(--accent)" stroke-width="2"/>
  <line x1="600" y1="150" x2="600" y2="162" style="stroke:var(--accent)" stroke-width="2"/>
  <text x="480" y="176" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent-ink)">items[2:4]  ->  ["c", "d"]</text>

  <text x="20" y="200" class="s-sub" style="fill:var(--ink-2)">Because the numbers sit between elements: len(items[a:b]) == b - a, and items[:k] + items[k:] == items, for any k.</text>
</svg>`
    },

    { t: "callout", kind: "good", title: "Slices never raise IndexError", body: [
      { t: "code", lang: "python", title: "out-of-range is silently clamped", numbered: false, code: `
items = [1, 2, 3]

items[10]          # IndexError
items[1:99]        # [2, 3]  -- clamped, no error
items[99:]         # []      -- empty, no error`},
      { t: "p", text: "This is convenient — `text[:80]` truncates safely regardless of length — and occasionally a trap, because a slice built from a miscalculated index returns an empty list rather than telling you the index was wrong. When a slice unexpectedly yields `[]`, check the indices rather than the data." }
    ]},

    { t: "code", lang: "python", title: "slices work on every sequence", code: `
text = "hello world"
print(text[:5])
print(text[::-1])

data = (1, 2, 3, 4)
print(data[1:3])                 # tuples slice to tuples

import numpy as np               # and NumPy extends the syntax
arr = np.arange(12).reshape(3, 4)
print(arr[1:, 2:])               # multi-dimensional slicing
`,
      out: `hello
dlrow olleh
(2, 3)
[[ 6  7]
 [10 11]]`,
      caption: "A slice of a list is a list, of a string a string, of a tuple a tuple. NumPy extends the syntax to multiple dimensions — and, importantly, its slices are **views** rather than copies (Lesson 15.1)."
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "Slice assignment", id: "slice-assignment" },

    { t: "p", text: "A slice on the left of an assignment replaces that region **in place** — the list object stays the same, so every name bound to it sees the change." },

    { t: "code", lang: "python", title: "replacing regions", code: `
items = [1, 2, 3, 4, 5]

items[1:3] = ["x", "y", "z"]     # replacement need not be the same length
print(items)

items[:] = [9, 9]                # replace ALL contents, same object
print(items)

items[::2] = [0, 0]              # extended slices MUST match in length
print(items)

del items[0:1]
print(items)
`,
      out: `[1, 'x', 'y', 'z', 4, 5]
[9, 9]
[0, 0]
[0]`
    },

    { t: "callout", kind: "insight", title: "`lst[:] = ...` versus `lst = ...`", body: [
      { t: "code", lang: "python", title: "the distinction that matters", numbered: false, code: `
shared = [1, 2, 3]
alias = shared

shared = [9]              # REBINDS the name; alias still sees [1, 2, 3]
print(alias)

shared = [1, 2, 3]
alias = shared
shared[:] = [9]           # MUTATES the object; alias sees the change
print(alias)`,
        out: `[1, 2, 3]
[9]`},
      { t: "p", text: "This is Lesson 1.4's rebind-versus-mutate distinction with slice syntax. `lst[:] = ...` is the tool for \"replace the contents of the list everyone is holding\" — useful for filtering a list that other code has a reference to, and for updating a module-level list without breaking existing imports of it." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "What a copy actually copies", id: "copying" },

    { t: "p", text: "Every standard copying operation in Python is **shallow**: it creates a new outer container whose slots point at the *same objects* as the original." },

    { t: "code", lang: "python", title: "four spellings, one behaviour", code: `
import copy

original = [[1, 2], [3, 4]]

a = original[:]              # slice
b = original.copy()          # method
c = list(original)           # constructor
d = copy.copy(original)      # explicit shallow copy

# All four: new outer list, SAME inner lists
print(a is original, a[0] is original[0])
`,
      out: `False True`
    },

    { t: "viz",
      title: "Shallow versus deep",
      caption: "A shallow copy duplicates the outer container and shares everything inside it. A deep copy recursively duplicates the whole structure. Which you need depends entirely on whether the nested objects are mutable and whether anyone will mutate them.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="Diagram contrasting a shallow copy sharing nested objects with a deep copy duplicating them">
  <defs>
    <marker id="a9" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--warn)">SHALLOW  —  new = old[:]</text>

  <rect x="20" y="40" width="110" height="32" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="75" y="61" text-anchor="middle" class="s-mono" style="font-size:10.5px">old</text>
  <rect x="20" y="86" width="110" height="32" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="75" y="107" text-anchor="middle" class="s-mono" style="font-size:10.5px">new</text>

  <line x1="130" y1="56" x2="216" y2="70" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#a9)"/>
  <line x1="130" y1="102" x2="216" y2="88" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#a9)"/>

  <rect x="222" y="62" width="96" height="34" rx="6" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1.5"/>
  <text x="270" y="84" text-anchor="middle" class="s-mono" style="font-size:10px">[1, 2]</text>
  <text x="332" y="76" class="s-sub" style="fill:var(--warn)">ONE inner list, two owners</text>
  <text x="332" y="92" class="s-sub" style="fill:var(--warn)">new[0].append(3) changes old too</text>

  <line x1="20" y1="140" x2="880" y2="140" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="166" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--good)">DEEP  —  new = copy.deepcopy(old)</text>

  <rect x="20" y="182" width="110" height="32" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="75" y="203" text-anchor="middle" class="s-mono" style="font-size:10.5px">old</text>
  <rect x="20" y="228" width="110" height="32" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="75" y="249" text-anchor="middle" class="s-mono" style="font-size:10.5px">new</text>

  <line x1="130" y1="198" x2="216" y2="198" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#a9)"/>
  <line x1="130" y1="244" x2="216" y2="244" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#a9)"/>

  <rect x="222" y="182" width="96" height="32" rx="6" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
  <text x="270" y="203" text-anchor="middle" class="s-mono" style="font-size:10px">[1, 2]</text>
  <rect x="222" y="228" width="96" height="32" rx="6" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
  <text x="270" y="249" text-anchor="middle" class="s-mono" style="font-size:10px">[1, 2]</text>
  <text x="332" y="212" class="s-sub" style="fill:var(--good)">TWO independent inner lists</text>
  <text x="332" y="228" class="s-sub" style="fill:var(--good)">mutating one cannot affect the other</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the bug, and the fix", code: `
import copy

template = {"name": "", "tags": [], "meta": {"version": 1}}

# Shallow: every "new" record shares one tags list and one meta dict
a = template.copy()
b = template.copy()
a["tags"].append("urgent")
print(b["tags"])                 # ['urgent'] -- b was never touched

# Deep: fully independent
a = copy.deepcopy(template)
b = copy.deepcopy(template)
a["tags"].append("urgent")
print(b["tags"])
`,
      out: `['urgent']
[]`
    },

    { t: "callout", kind: "tradeoff", title: "deepcopy is not the default answer", body: [
      { t: "ul", items: [
        "**It is slow.** It walks the entire object graph, and for a large nested structure that cost is real and repeated on every call.",
        "**It copies more than you meant.** A deepcopy of an object holding a database connection, an open file or a thread lock will try to copy those too — sometimes failing, sometimes producing a broken duplicate.",
        "**It hides a design problem.** Reaching for `deepcopy` usually means mutable state is being shared where it should not be. The better fix is often to stop sharing it."
      ]},
      { t: "p", text: "The order to consider, best first:" },
      { t: "ol", items: [
        "**Make it immutable.** A `tuple`, a `frozenset`, or a `@dataclass(frozen=True)` cannot be mutated, so it never needs copying. This is the strongest fix because it removes the failure mode rather than working around it.",
        "**Build fresh each time.** A factory function or a `default_factory` produces a new object per call, with no template to share.",
        "**Shallow copy**, when the nested values are themselves immutable — copying a `dict[str, int]` needs nothing more.",
        "**Deep copy**, when you genuinely need an independent mutable snapshot of a nested structure."
      ]}
    ]},

    { t: "code", lang: "python", title: "the immutability fix, in practice", code: `
from dataclasses import dataclass, field


@dataclass(frozen=True)
class RequestTemplate:
    name: str = ""
    # A shared mutable default would be the Lesson 1.4 bug in class form.
    # default_factory builds a NEW list per instance.
    tags: tuple[str, ...] = ()
    meta: tuple[tuple[str, int], ...] = ()


# Frozen: cannot be mutated, so it can be shared freely with no copying.
TEMPLATE = RequestTemplate()

# "Changing" it produces a new object, leaving the original intact.
from dataclasses import replace
urgent = replace(TEMPLATE, tags=("urgent",))
print(TEMPLATE.tags, urgent.tags)
`,
      out: `() ('urgent',)`,
      caption: "This is the pattern behind most well-behaved configuration objects: frozen, with `replace()` for derived variants. Nothing needs copying because nothing can be mutated. Lesson 4.10 covers dataclasses in full."
    },

    /* ================================================================== */
    { t: "h2", n: "04", text: "Copying costs", id: "costs" },

    { t: "table",
      head: ["Operation", "Cost", "Copies"],
      rows: [
        ["`lst[:]`, `lst.copy()`, `list(lst)`", "<span class='big-o mid'>O(n)</span>", "n pointers; nested objects shared"],
        ["`d.copy()`, `dict(d)`, `{**d}`", "<span class='big-o mid'>O(n)</span>", "n key/value pointers; values shared"],
        ["`copy.deepcopy(x)`", "<span class='big-o slow'>O(total graph)</span>", "Everything, recursively, tracking cycles"],
        ["`tuple(t)` where `t` is a tuple", "<span class='big-o fast'>O(1)</span>", "Nothing — returns the same object, since it cannot change"],
        ["`lst[a:b]`", "<span class='big-o mid'>O(b-a)</span>", "The pointers in that range"]
      ],
      caption: "`tuple(existing_tuple)` returning the same object is a small but real optimisation, and it is only safe because tuples are immutable. `list(existing_list)` must copy, because the result is mutable and independent."
    },

    { t: "callout", kind: "trap", title: "Slicing in a loop is a hidden O(n²)", body: [
      { t: "code", lang: "python", title: "each slice copies", numbered: false, code: `
# Every iteration copies the remainder of the list.
while data:
    chunk, data = data[:100], data[100:]     # O(n) copy per iteration
    process(chunk)`},
      { t: "p", text: "For a million-element list this copies roughly half a billion pointers. Iterate by index, or use `itertools.batched` (3.12+) which yields tuples without copying the source:" },
      { t: "code", lang: "python", title: "linear instead", numbered: false, code: `
from itertools import batched

for chunk in batched(data, 100):
    process(chunk)

# Or, on older versions, index arithmetic:
for start in range(0, len(data), 100):
    process(data[start:start + 100])`}
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Find the sharing bug",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "The class below manages user profiles built from a template. It passes its unit tests. In production, after a few hours of traffic, every new user is created with a growing list of other users' permissions attached." },
        { t: "p", text: "Find every place mutable state is shared, explain the mechanism for each, and fix them — preferring the strongest available fix rather than reaching for `deepcopy`." }
      ],
      requirements: [
        "Identify each distinct sharing bug in the code below. There are three.",
        "For each, state what is shared and which line causes the leak.",
        "Fix them **without** using `copy.deepcopy` — every one has a better fix.",
        "Write a test that fails on the original and passes on your fix.",
        "Explain in one sentence why the unit tests passed originally."
      ],
      hint: "Look at the class attribute, the default argument, and what `.copy()` does to a nested value. Lessons 1.4 and 2.3 both apply here.",
      solution: {
        lang: "python",
        title: "profiles.py",
        code: `# ---- the original, with the three bugs marked -------------------------

class ProfileFactory:
    # BUG 1: a class attribute is shared by every instance AND every
    # mutation persists for the life of the process.
    DEFAULT_PERMISSIONS = ["read"]

    TEMPLATE = {"name": "", "settings": {"theme": "light"}, "tags": []}

    def create(self, name, permissions=DEFAULT_PERMISSIONS):
        #                  ^ BUG 2: mutable default, evaluated once at def
        profile = self.TEMPLATE.copy()
        #         ^ BUG 3: shallow -- "settings" and "tags" are shared
        profile["name"] = name
        profile["permissions"] = permissions
        return profile


# ---- the mechanisms ---------------------------------------------------
#
# BUG 1  DEFAULT_PERMISSIONS is one list object on the class. Any caller
#        that appends to a returned profile's permissions mutates it,
#        because BUG 2 handed out that exact object.
#
# BUG 2  Default arguments are evaluated once, when def executes. Every
#        call omitting `permissions` binds the SAME list -- so appends
#        accumulate across users. This is the growing-permissions symptom.
#
# BUG 3  dict.copy() is shallow. Every profile's "settings" and "tags"
#        are the same objects as the template's, so one user changing a
#        theme changes it for everyone created afterwards.
#
# WHY THE TESTS PASSED  Each test created one or two profiles in a fresh
#        process and asserted on them immediately. The bugs need repeated
#        calls over time to become visible -- which is exactly what a
#        long-running server does and a unit test does not.


# ---- the fix ----------------------------------------------------------

from dataclasses import dataclass, field, replace


@dataclass(frozen=True)
class Settings:
    theme: str = "light"
    density: str = "comfortable"


@dataclass
class Profile:
    name: str
    # default_factory builds a NEW object per instance. The frozen
    # Settings needs no factory: it cannot be mutated, so sharing it
    # is safe -- immutability removes the problem instead of managing it.
    permissions: list[str] = field(default_factory=lambda: ["read"])
    settings: Settings = Settings()
    tags: list[str] = field(default_factory=list)


class ProfileFactory:
    # frozenset: a fixed vocabulary that cannot be mutated by importers.
    DEFAULT_PERMISSIONS = frozenset({"read"})

    def create(
        self,
        name: str,
        permissions: frozenset[str] | None = None,
    ) -> Profile:
        # None sentinel: the only way to distinguish "not supplied" from
        # a deliberately empty set (Lesson 1.5).
        granted = self.DEFAULT_PERMISSIONS if permissions is None else permissions
        # list(...) materialises a fresh mutable list per profile from an
        # immutable source -- no shared object can escape.
        return Profile(name=name, permissions=sorted(granted))


# ---- the test that catches it -----------------------------------------

def test_profiles_do_not_share_state() -> None:
    factory = ProfileFactory()

    first = factory.create("ada")
    first.permissions.append("admin")
    first.tags.append("staff")

    # The original implementation fails BOTH of these.
    second = factory.create("grace")
    assert second.permissions == ["read"], second.permissions
    assert second.tags == [], second.tags

    # And the class-level default must be untouched.
    assert factory.DEFAULT_PERMISSIONS == frozenset({"read"})


if __name__ == "__main__":
    test_profiles_do_not_share_state()
    print("no shared state")`,
        notes: [
          { t: "p", text: "**Why the tests passed is the most important part of this exercise.** All three bugs require *repeated calls over time* to become visible. A unit test creates one or two objects in a fresh process and asserts immediately — the accumulation never happens. A server calls `create` thousands of times in one process, and the shared list grows all day." },
          { t: "p", text: "**The test that catches it creates two profiles and mutates the first**, which is the minimum reproduction of \"state leaks between calls\". That shape — act on object A, assert about object B — is the general form of a shared-state test and is worth adding wherever a factory or a default is involved." },
          { t: "p", text: "**Each fix uses the strongest available tool rather than `deepcopy`:**" },
          { t: "ul", items: [
            "`frozenset` for the class constant — mutation becomes an immediate `AttributeError` instead of silent corruption.",
            "`None` sentinel for the default — the mutable object is never created at `def` time at all.",
            "`field(default_factory=...)` for per-instance mutables, and a **frozen** `Settings` for the nested config, which needs no factory because it cannot be mutated."
          ]},
          { t: "callout", kind: "insight", title: "The general principle", body: [
            { t: "p", text: "`deepcopy` would have fixed all three, and it would have left the design unchanged — still sharing mutable state, now with a defensive copy standing between it and disaster. Every future maintainer would need to know the copy is load-bearing." },
            { t: "p", text: "Immutability and per-instance construction remove the failure mode. There is nothing left to copy defensively, and nothing for a future change to accidentally undo." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "An API endpoint accepts a filter object, applies defaults to it, and passes it to a query builder. Under load, users occasionally receive results filtered by *someone else's* criteria. The endpoint is stateless and holds no globals — or so the code review concluded." },
      { t: "p", text: "**Where to look:** a module-level defaults dict that the handler merges into the request filter with `.update()` or `.copy()`. The shallow copy shares any nested value, so one request writing into a nested filter mutates the template that every later request starts from." },
      { t: "p", text: "**Why \"stateless\" was wrong:** the handler holds no state, but the *module* does. A dict defined at import time lives for the process lifetime and is shared by every request thread. Statelessness is a property of the whole request path, not of the function signature." },
      { t: "p", text: "**The fix**, in order of preference: make the defaults immutable so mutation raises, or build the filter fresh per request from a factory. A `deepcopy` on every request would also work and would leave the loaded gun in place." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "Indices label the **gaps between** elements. That model makes every slice rule fall out: `len(s[a:b]) == b - a`, and `s[:k] + s[k:] == s`.",
    "Slices clamp instead of raising, so `text[:80]` is always safe — but a slice returning `[]` unexpectedly means the indices are wrong, not the data.",
    "**`lst[:] = ...` mutates the existing object; `lst = ...` rebinds the name.** Use the first when other code holds a reference to that list.",
    "**Every standard copy is shallow.** `[:]`, `.copy()`, `list()`, `dict()` and `{**d}` all build a new outer container sharing every nested object.",
    "Prefer, in order: **make it immutable** → **build fresh each time** → shallow copy → `deepcopy`. Reaching for `deepcopy` usually signals sharing that should not exist.",
    "`deepcopy` is slow, copies more than you intended (connections, locks, file handles), and preserves the design flaw it works around.",
    "`tuple(existing_tuple)` returns the same object — safe only because tuples are immutable. `list(existing_list)` must copy.",
    "**Slicing inside a loop is a hidden O(n²).** Use `itertools.batched` or index arithmetic instead of repeatedly re-slicing the remainder.",
    "Shared-state bugs pass unit tests by construction: they need repeated calls in one process to accumulate. Test them by acting on one object and asserting about the next."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "After `b = a[:]` where `a = [[1], [2]]`, what does `b[0].append(9)` do to `a`?",
        options: [
          "Nothing — `[:]` creates an independent copy",
          "`a` becomes `[[1, 9], [2]]` — the slice copied the outer list but both share the same inner lists",
          "It raises, because `b` is a read-only view of `a`",
          "`a` becomes `[[1, 9], [2, 9]]` — the mutation propagates to every element"
        ],
        answer: 1,
        why: "A slice copy duplicates the outer list's pointers, so `a is not b`. But those pointers still point at the same inner lists, so `b[0] is a[0]` — and appending through either name is visible through both. This is the single most common copying bug in Python, and it applies equally to `.copy()`, `list()`, `dict()` and `{**d}`."
      },
      {
        stem: "What is the difference between `lst = [1, 2]` and `lst[:] = [1, 2]` when another name `alias` refers to the same list?",
        options: [
          "They are equivalent; `[:]` is just more explicit",
          "The first rebinds `lst` and leaves `alias` unchanged; the second replaces the contents of the shared object, so `alias` sees it",
          "The second raises unless the lengths match",
          "The first mutates in place and the second creates a new list"
        ],
        answer: 1,
        why: "This is the rebind-versus-mutate distinction with slice syntax. Plain assignment points the name `lst` at a new list, leaving the object `alias` refers to untouched. Slice assignment replaces the contents of the existing object, so every name bound to it observes the change. Extended slices like `lst[::2] = ...` do require matching lengths, but a full `[:]` does not."
      },
      {
        stem: "A profile factory is written as `def create(self, perms=[\"read\"])`. After hours of production traffic, new profiles have dozens of permissions. Why did unit tests not catch this?",
        options: [
          "The tests mocked the factory rather than calling it",
          "The bug requires repeated calls in one process to accumulate — a test creates one or two objects in a fresh process and asserts immediately",
          "Default arguments behave differently under pytest",
          "The list is only shared when the function is called concurrently"
        ],
        answer: 1,
        why: "The default list is created once at `def` time and shared by every call that omits the argument. Mutations accumulate across calls, so the symptom needs many calls in one long-lived process. A unit test creates a couple of objects and asserts straight away, so the list never grows enough to be visible. The reproduction that does catch it is: create object A, mutate it, then create object B and assert B is clean."
      },
      {
        stem: "Which is the best first fix for a shared nested-mutable-state bug?",
        options: [
          "`copy.deepcopy` at every boundary where the object is handed out",
          "Make the shared object immutable — a tuple, frozenset or frozen dataclass — so mutation raises instead of corrupting",
          "Add a lock around every mutation site",
          "Convert the structure to JSON and parse it back to force a copy"
        ],
        answer: 1,
        why: "Immutability removes the failure mode rather than defending against it: there is nothing to copy and no way for a future change to undo the protection. `deepcopy` works but is slow, copies things you did not intend (connections, locks, file handles), and leaves the shared-mutable design in place with a defensive copy that a maintainer might remove. A lock serialises access to state that should not be shared at all, trading a correctness bug for a throughput problem."
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
        q: "What is the difference between a shallow and a deep copy?",
        strong: "A shallow copy creates a new outer container whose slots point at the same objects as the original — so nested mutables are shared. A deep copy recursively duplicates the entire object graph, giving full independence. Every standard Python copy operation is shallow: `[:]`, `.copy()`, `list()`, `dict()`, `{**d}`.",
        answer: [
          { t: "p", text: "The definition is table stakes; the follow-up is *when does each matter?*" },
          { t: "p", text: "The answer that shows judgement: it only matters when the nested values are mutable *and* someone mutates them. A `dict[str, int]` needs nothing more than `.copy()`, because integers cannot change. The bug only exists when there are nested lists, dicts or objects." },
          { t: "p", text: "Strong candidates volunteer that `deepcopy` is a last resort — slow, and it will happily try to copy a database connection or a lock held inside the object. The better fixes are immutability or per-instance construction, which remove the need to copy at all." }
        ]
      },
      {
        level: "core",
        q: "Explain `lst[:] = new_values`.",
        strong: "It replaces the contents of the existing list object in place, rather than rebinding the name. Every other name referring to that list sees the change — which is exactly the difference from `lst = new_values`.",
        answer: [
          { t: "p", text: "The interviewer is checking whether you understand names versus objects, using slice syntax as the probe." },
          { t: "p", text: "The concrete use case makes the answer land: filtering a list that other code holds a reference to, or updating a module-level list without breaking modules that already imported it. Without slice assignment you would have to mutate element by element." },
          { t: "p", text: "Worth adding that the same syntax replaces a sub-range with a different number of elements — `lst[1:3] = [1, 2, 3, 4]` works — while an extended slice like `lst[::2] = ...` requires matching lengths." }
        ]
      },
      {
        level: "advanced",
        q: "Users occasionally see another user's data from a stateless endpoint. Where do you look?",
        strong: "Module-level mutable state. A dict or list defined at import time lives for the process and is shared by every request. A shallow copy of it shares nested values, so one request mutating a nested structure changes the template every later request starts from.",
        answer: [
          { t: "p", text: "The observation that matters most is that \"stateless\" was a claim about the *handler*, not the process. Statelessness is a property of the whole request path — module-level defaults, class attributes, caches, and mutable default arguments are all state, and all of them outlive a request." },
          { t: "p", text: "A good diagnostic order: mutable default arguments first (they are the easiest to grep for), then module-level dicts and lists, then class attributes, then anything cached on the application object." },
          { t: "p", text: "Close on why concurrency is not the cause: the sharing exists regardless of threading. Concurrency only makes it *observable*, because a second request arrives before anyone notices the first one corrupted the template. Adding a lock would hide the symptom and preserve the bug." }
        ],
        weak: "Attributing it to a caching layer or a database isolation level without first checking for shared mutable state in the process. Both are real causes of cross-user data leaks, but they are far less common than a module-level dict."
      }
    ]
  }
});

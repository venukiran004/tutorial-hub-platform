/* ============================================================================
   LESSON 4.5 — Inheritance, super() and the MRO
   ========================================================================= */
EC.receiveLesson({
  id: "4.5",

  lede: "`super()` does not mean *the parent class*. It means **the next class in the method resolution order**, which for a single inheritance chain happens to be the parent — and for anything more interesting is not. Getting that one sentence right is the difference between multiple inheritance being a usable tool and being the source of bugs nobody can explain.",

  objectives: [
    "Read a class's MRO and explain how C3 linearisation produced it",
    "Describe what `super()` actually resolves to, and why it is not the parent",
    "Write cooperative `__init__` methods that work under multiple inheritance",
    "Diagnose the diamond problem and the errors C3 raises to prevent it",
    "Write mixins that compose rather than collide"
  ],

  prerequisites: ["4.1", "4.3"],

  blocks: [

    { t: "h2", n: "01", text: "Inheritance is for substitutability", id: "substitutability" },

    { t: "p", text: "Before the mechanics: inheritance says **a `Child` is usable anywhere a `Parent` is expected.** If that is not true, you want composition (Lesson 4.7). Reusing code is not a reason to inherit — it is the most common reason people inherit wrongly." },

    { t: "code", lang: "python", title: "the basic mechanics", code: `
class Notification:
    def __init__(self, recipient: str) -> None:
        self.recipient = recipient

    def send(self, message: str) -> None:
        raise NotImplementedError

    def describe(self) -> str:
        return f"{type(self).__name__} to {self.recipient}"


class EmailNotification(Notification):
    def __init__(self, recipient: str, subject: str) -> None:
        super().__init__(recipient)      # run the parent's initialiser
        self.subject = subject

    def send(self, message: str) -> None:
        print(f"[email] {self.subject}: {message}")


e = EmailNotification("ada@example.com", "Deploy finished")
e.send("all green")
print(e.describe())                       # inherited, and type(self) is the child
print(isinstance(e, Notification))
`,
      out: `[email] Deploy finished: all green
EmailNotification to ada@example.com
True`,
      caption: "`describe` is inherited unchanged and still reports the subclass name, because `type(self)` resolves at call time. That is the same reason `cls` matters in classmethods (Lesson 4.3)."
    },

    { t: "h2", n: "02", text: "The MRO", id: "mro" },

    {"kind": "tree", "title": "The diamond, linearised by C3", "caption": "class D(B, C) with both B and C deriving from A gives the MRO D → B → C → A → object. Each class appears once, parents come after children, and the order of the bases is respected — which is what makes super() cooperative.", "root": {"label": "object", "children": [{"label": "A", "tone": "warn", "children": [{"label": "B", "tone": "accent", "children": [{"label": "D(B, C)", "sub": "MRO: D, B, C, A, object", "tone": "good"}]}, {"label": "C", "tone": "accent"}]}]}, "t": "diagram", "id": "dg-4_5-02-0"},




    { t: "p", text: "Every class has a **method resolution order** — a flat, ordered list of itself and all its ancestors. Attribute lookup walks it front to back and stops at the first match. `__mro__` shows it." },

    { t: "code", lang: "python", title: "reading the order", code: `
class A:
    def who(self) -> str:
        return "A"


class B(A):
    pass


class C(A):
    def who(self) -> str:
        return "C"


class D(B, C):
    pass


for klass in D.__mro__:
    print(klass.__name__)

print(D().who())
`,
      out: `D
B
C
A
object
C`,
      caption: "`D().who()` returns `\"C\"`, not `\"A\"`. `B` has no `who`, so the search continues to `C` — which comes **before** `A` in the order. A depth-first search would have found `A` through `B` first and produced the wrong answer."
    },

    { t: "viz",
      title: "C3 linearisation on a diamond",
      caption: "C3 produces an order satisfying three rules: a class precedes its parents, parents keep their declared left-to-right order, and the rules hold consistently across the whole hierarchy. On a diamond that means the shared ancestor appears exactly once, at the end — after every class that inherits from it.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram: a diamond inheritance hierarchy and the resulting C3 method resolution order">
  <defs>
    <marker id="b4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em">THE HIERARCHY</text>

  <rect x="150" y="200" width="90" height="34" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="195" y="222" text-anchor="middle" class="s-mono">D(B, C)</text>
  <rect x="70" y="130" width="70" height="34" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="105" y="152" text-anchor="middle" class="s-mono">B(A)</text>
  <rect x="250" y="130" width="70" height="34" rx="7" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
  <text x="285" y="152" text-anchor="middle" class="s-mono" style="fill:var(--good)">C(A)</text>
  <rect x="160" y="60" width="70" height="34" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="195" y="82" text-anchor="middle" class="s-mono">A</text>

  <line x1="180" y1="200" x2="120" y2="168" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#b4)"/>
  <line x1="215" y1="200" x2="272" y2="168" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#b4)"/>
  <line x1="112" y1="130" x2="172" y2="98" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#b4)"/>
  <line x1="278" y1="130" x2="220" y2="98" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#b4)"/>

  <text x="360" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em">THE MRO — searched front to back</text>
  <g>
    <rect x="360" y="40" width="80" height="30" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
    <text x="400" y="60" text-anchor="middle" class="s-mono" style="font-size:10.5px">D</text>
    <rect x="450" y="40" width="80" height="30" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="490" y="60" text-anchor="middle" class="s-mono" style="font-size:10.5px">B</text>
    <rect x="540" y="40" width="80" height="30" rx="6" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
    <text x="580" y="60" text-anchor="middle" class="s-mono" style="font-size:10.5px">C</text>
    <rect x="630" y="40" width="80" height="30" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="670" y="60" text-anchor="middle" class="s-mono" style="font-size:10.5px">A</text>
    <rect x="720" y="40" width="90" height="30" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="765" y="60" text-anchor="middle" class="s-mono" style="font-size:10.5px">object</text>
  </g>

  <text x="360" y="96" class="s-sub" style="fill:var(--good)">D().who() finds C.who — C precedes A, so the shared</text>
  <text x="360" y="112" class="s-sub" style="fill:var(--good)">ancestor is never reached first.</text>

  <rect x="360" y="132" width="450" height="102" rx="9" class="s-fill s-stroke" stroke-width="1"/>
  <text x="376" y="154" class="s-sub" style="fill:var(--ink-2);font-weight:600">The three C3 guarantees</text>
  <text x="376" y="176" class="s-sub">1.  a class always precedes its own parents</text>
  <text x="376" y="194" class="s-sub">2.  parents keep the left-to-right order they were declared in</text>
  <text x="376" y="212" class="s-sub">3.  those rules hold consistently across every class in the hierarchy</text>
  <text x="376" y="230" class="s-sub" style="fill:var(--crit)">If no order satisfies all three, the class definition raises TypeError.</text>

  <rect x="20" y="256" width="860" height="34" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="278" class="s-sub">super() means "the next class in the MRO of type(self)" — which depends on the instance, not on where the code was written.</text>
</svg>`
    },

    { t: "callout", kind: "trap", title: "`super()` is not the parent class", body: [
      { t: "code", lang: "python", title: "what super() actually resolves to", numbered: false, code: `
class A:
    def who(self):
        return "A"


class B(A):
    def who(self):
        return "B -> " + super().who()      # NOT necessarily A


class C(A):
    def who(self):
        return "C -> " + super().who()


class D(B, C):
    pass


print(D().who())
print(B().who())`,
        out: `B -> C -> A
B -> A`},
      { t: "p", text: "The same line — `super().who()` inside `B` — calls `C.who` in one case and `A.who` in the other. **`super()` resolves against `type(self)`'s MRO**, so what it does depends on the object it is called on, not on where the code lives." },
      { t: "p", text: "That is the point of it. It is what lets a class be composed into hierarchies its author never saw, and it is why `super()` is correct where a hard-coded `A.who(self)` would break the chain and skip `C` entirely." }
    ]},

    { t: "h2", n: "03", text: "Cooperative __init__", id: "cooperative" },

    {"kind": "steps", "title": "Cooperative __init__ through the MRO", "caption": "Each __init__ calls super().__init__(**kwargs) and takes only its own arguments; super() follows the MRO, not the parent, so every class in the diamond runs exactly once.", "items": [{"label": "D.__init__(name, size, colour)", "desc": "takes name, passes the rest up", "tone": "good"}, {"label": "super() → B.__init__(size, colour)", "desc": "takes size", "tone": "accent"}, {"label": "super() → C.__init__(colour)", "desc": "takes colour — next in the MRO, not B's parent", "tone": "accent"}, {"label": "super() → A.__init__()", "desc": "runs once", "tone": "warn"}, {"label": "object.__init__()", "desc": "accepts no arguments: **kwargs must be empty by here", "tone": "violet"}], "t": "diagram", "id": "dg-4_5-03-1"},

    { t: "ladder",
      title: "Initialising a hierarchy",
      rungs: [
        { level: "bad", label: "Naming the parent directly", why: "breaks the chain",
          code: `class Loggable:
    def __init__(self, **kwargs):
        self.log = []


class Timestamped:
    def __init__(self, **kwargs):
        self.created_at = datetime.now(UTC)


class Order(Loggable, Timestamped):
    def __init__(self, order_id):
        Loggable.__init__(self)          # explicit parent call
        self.order_id = order_id


o = Order("o-1")
print(hasattr(o, "created_at"))          # False -- Timestamped never ran`,
          note: "Calling `Loggable.__init__` directly means the MRO is never walked, so `Timestamped.__init__` is skipped entirely. The object is half-initialised, and the missing attribute surfaces much later as an `AttributeError` with no obvious cause." },

        { level: "ok", label: "super(), but signatures do not match", why: "fragile under reordering",
          code: `class Loggable:
    def __init__(self):
        super().__init__()
        self.log = []


class Timestamped:
    def __init__(self):
        super().__init__()
        self.created_at = datetime.now(UTC)


class Order(Loggable, Timestamped):
    def __init__(self, order_id):
        super().__init__()
        self.order_id = order_id`,
          note: "This works — every `__init__` calls `super()`, so the whole MRO runs. It is fragile because none of them accept arguments: the moment one mixin needs a parameter, every class in the chain has to be edited to pass it through." },

        { level: "best", label: "**kwargs cooperation", why: "each class takes what it needs",
          code: `class Loggable:
    def __init__(self, *, log_level: str = "INFO", **kwargs) -> None:
        # Consume our own kwargs, forward the rest up the MRO.
        super().__init__(**kwargs)
        self.log_level = log_level
        self.log: list[str] = []


class Timestamped:
    def __init__(self, *, clock: Callable[[], datetime] = None, **kwargs) -> None:
        super().__init__(**kwargs)
        self.created_at = (clock or (lambda: datetime.now(UTC)))()


class Order(Loggable, Timestamped):
    def __init__(self, order_id: str, **kwargs) -> None:
        super().__init__(**kwargs)
        self.order_id = order_id


o = Order("o-1", log_level="DEBUG")
print(o.log_level, o.order_id, bool(o.created_at))`,
          note: "Each class pulls out the keywords it understands and forwards the rest. Adding a mixin with a new parameter requires no change to any other class. The rules that make this work: **every class calls `super().__init__(**kwargs)`**, keyword-only arguments so nothing collides positionally, and `object.__init__` at the end of the MRO accepting the now-empty kwargs — which is why an unconsumed keyword raises a clear `TypeError` rather than being silently dropped." }
      ]
    },

    { t: "callout", kind: "insight", title: "The cooperative contract", body: [
      { t: "p", text: "Multiple inheritance works in Python only when every class in the hierarchy follows the same rules. They are not enforced, which is why mixed codebases break:" },
      { t: "ol", items: [
        "**Always call `super().__init__(...)`**, even in a class with no parent — `object` is always at the end of the MRO and its `__init__` accepts nothing, which is the check that catches unconsumed keywords.",
        "**Use keyword-only parameters** in mixins. Positional arguments cannot be safely forwarded through an MRO whose order you do not control.",
        "**Accept and forward `**kwargs`.** A class that does not forward silently truncates the chain for everything after it.",
        "**Do not call a parent by name.** `Base.__init__(self)` skips the MRO and is the single most common cause of half-initialised objects."
      ]}
    ]},

    { t: "h2", n: "04", text: "When C3 refuses", id: "c3-errors" },

    { t: "code", lang: "python", title: "an impossible order", code: `
class A: pass
class B: pass


class X(A, B): pass
class Y(B, A): pass


class Z(X, Y): pass
`,
      out: `TypeError: Cannot create a consistent method resolution
order (MRO) for bases X, Y`,
      caption: "`X` requires A before B; `Y` requires B before A. No linearisation satisfies both, so Python refuses to create the class. This is C3 doing its job — the alternative would be an arbitrary order that silently produces wrong behaviour."
    },

    { t: "callout", kind: "good", title: "The error is a design signal", body: [
      { t: "p", text: "An MRO conflict almost never wants a clever fix. It means two branches of your hierarchy disagree about ordering, which usually means one of them should not be inheritance at all." },
      { t: "p", text: "**The usual resolution is composition** (Lesson 4.7): make one of the conflicting behaviours a collaborator the class holds rather than a base it inherits. That removes the ordering question entirely, and the result is easier to test because the collaborator can be substituted." }
    ]},

    { t: "h2", n: "05", text: "Mixins that behave", id: "mixins" },

    { t: "code", lang: "python", title: "the rules, applied", code: `
from __future__ import annotations

import json
from typing import Any


class SerialisableMixin:
    """Adds JSON serialisation. Adds no state and no __init__.

    A mixin is not usable alone -- it assumes something about the class
    it is mixed into. Naming it "...Mixin" and documenting the
    assumption is how you make that contract visible.

    Requires: the host class defines __slots__ or __dict__ attributes
    that are JSON-serialisable.
    """

    def to_json(self) -> str:
        return json.dumps(self._as_dict(), sort_keys=True)

    def _as_dict(self) -> dict[str, Any]:
        return {
            key: value
            for key, value in vars(self).items()
            if not key.startswith("_")
        }


class ComparableMixin:
    """Adds ordering from a single sort_key method.

    Requires: the host class defines sort_key() -> tuple.
    """

    def sort_key(self) -> tuple:
        raise NotImplementedError(
            f"{type(self).__name__} must define sort_key()"
        )

    def __lt__(self, other: object) -> bool:
        if not isinstance(other, ComparableMixin):
            return NotImplemented        # let Python try the reflected op
        return self.sort_key() < other.sort_key()

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, ComparableMixin):
            return NotImplemented
        return self.sort_key() == other.sort_key()

    def __hash__(self) -> int:
        # Defining __eq__ sets __hash__ to None -- must restore it
        # explicitly, or instances become unhashable (Lesson 4.9).
        return hash(self.sort_key())


class Task(SerialisableMixin, ComparableMixin):
    def __init__(self, name: str, priority: int) -> None:
        super().__init__()
        self.name = name
        self.priority = priority

    def sort_key(self) -> tuple:
        return (self.priority, self.name)


tasks = [Task("deploy", 2), Task("fix outage", 1)]
print(sorted(tasks)[0].name)
print(tasks[0].to_json())
`,
      out: `fix outage
{"name": "deploy", "priority": 2}`
    },

    { t: "callout", kind: "good", title: "What makes a mixin safe", body: [
      { t: "ul", items: [
        "**Name it `...Mixin`.** The suffix tells a reader it is not usable alone and is designed to be combined.",
        "**No `__init__` if you can avoid it.** A stateless mixin cannot participate in an initialisation-order bug. If it must have one, follow the cooperative rules above.",
        "**Document what it requires of the host** — `sort_key()`, an `id` attribute, whatever. That contract is the mixin's real interface and nothing enforces it, so write it down.",
        "**Put mixins to the left of the base class.** `class Task(SerialisableMixin, Base)` puts the mixin earlier in the MRO, so its methods win — which is normally the intent.",
        "**Keep them narrow.** One capability per mixin. A mixin that adds five unrelated behaviours is a base class in disguise."
      ]}
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a broken hierarchy",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "The hierarchy below produces half-initialised objects and, when a fourth class is added, refuses to be defined at all. Diagnose both, fix them, and then decide which part of the hierarchy should not have been inheritance in the first place." }
      ],
      requirements: [
        "Explain why `Report` objects are missing attributes, tracing the MRO.",
        "Convert the hierarchy to cooperative initialisation so every class runs.",
        "Make the mixins accept their own keyword arguments without any other class knowing about them.",
        "Add the fourth class that triggers an MRO conflict, show the error, and explain what C3 objected to.",
        "Resolve the conflict with composition rather than by reordering bases.",
        "Write a test proving every attribute is set, and a test proving an unknown keyword raises rather than being silently dropped."
      ],
      hint: "For the last test, the reason an unknown keyword raises is that `object.__init__` is at the end of the MRO and accepts no arguments — so anything left unconsumed reaches it and fails.",
      solution: {
        lang: "python",
        title: "reporting.py",
        code: `# ---- the original ------------------------------------------------------

class Cacheable:
    def __init__(self):
        self.cache = {}


class Auditable:
    def __init__(self):
        self.audit_log = []


class Report(Cacheable, Auditable):
    def __init__(self, title):
        Cacheable.__init__(self)          # BUG: names the parent directly
        self.title = title


r = Report("Q1")
print(hasattr(r, "audit_log"))            # False
#
# MRO is: Report -> Cacheable -> Auditable -> object
#
# Calling Cacheable.__init__ directly jumps straight into that class and
# never walks the rest of the MRO, so Auditable.__init__ never runs.
# The object is half-initialised, and the missing attribute surfaces
# later as an AttributeError far from the cause.


# ---- cooperative initialisation ----------------------------------------

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any


class CacheableMixin:
    """Adds a cache. Requires nothing of the host class."""

    def __init__(self, *, cache_size: int = 128, **kwargs: Any) -> None:
        # Forward first, then set our own state. Order matters less than
        # the forwarding itself -- but every class MUST forward, or the
        # chain stops here for everything after it in the MRO.
        super().__init__(**kwargs)
        self.cache_size = cache_size
        self.cache: dict[str, Any] = {}


class AuditableMixin:
    """Adds an audit log. Requires nothing of the host class."""

    def __init__(
        self,
        *,
        clock: Callable[[], datetime] | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self._clock = clock or (lambda: datetime.now(UTC))
        self.audit_log: list[tuple[datetime, str]] = []

    def record(self, event: str) -> None:
        self.audit_log.append((self._clock(), event))


class Report(CacheableMixin, AuditableMixin):
    def __init__(self, title: str, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.title = title


# ---- the MRO conflict --------------------------------------------------
#
# Now add two classes that order the mixins differently:
#
#   class FastReport(CacheableMixin, AuditableMixin): ...
#   class AuditFirstReport(AuditableMixin, CacheableMixin): ...
#   class HybridReport(FastReport, AuditFirstReport): ...
#
#     TypeError: Cannot create a consistent method resolution order (MRO)
#     for bases FastReport, AuditFirstReport
#
# FastReport requires Cacheable before Auditable.
# AuditFirstReport requires Auditable before Cacheable.
# No single order satisfies both, so C3 refuses rather than picking one
# arbitrarily -- which would silently give one branch the wrong
# behaviour.
#
# The fix is NOT to reorder the bases. The conflict is telling you that
# these are two independent capabilities being forced into one linear
# chain. Composition removes the ordering question entirely.


# ---- composition instead ------------------------------------------------

class Cache:
    """A collaborator, not a base class. Substitutable in tests."""

    def __init__(self, size: int = 128) -> None:
        self.size = size
        self._data: dict[str, Any] = {}

    def get(self, key: str) -> Any | None:
        return self._data.get(key)

    def set(self, key: str, value: Any) -> None:
        self._data[key] = value


class AuditLog:
    def __init__(self, clock: Callable[[], datetime] | None = None) -> None:
        self._clock = clock or (lambda: datetime.now(UTC))
        self.entries: list[tuple[datetime, str]] = []

    def record(self, event: str) -> None:
        self.entries.append((self._clock(), event))


class ComposedReport:
    """No inheritance at all. No MRO, no ordering, no cooperation rules.

    Both capabilities are now injectable, so a test supplies a fake
    clock without patching anything (Lesson 4.1).
    """

    def __init__(
        self,
        title: str,
        *,
        cache: Cache | None = None,
        audit: AuditLog | None = None,
    ) -> None:
        self.title = title
        self.cache = cache or Cache()
        self.audit = audit or AuditLog()

    def render(self) -> str:
        cached = self.cache.get(self.title)
        if cached is not None:
            self.audit.record("cache hit")
            return cached

        self.audit.record("rendered")
        result = f"<report>{self.title}</report>"
        self.cache.set(self.title, result)
        return result


# ---- tests -------------------------------------------------------------

def test_every_mixin_initialiser_runs() -> None:
    """The bug the original had: a half-initialised object."""
    report = Report("Q1", cache_size=256)

    assert report.title == "Q1"
    assert report.cache_size == 256
    assert report.cache == {}
    assert report.audit_log == []        # would be missing originally

    # And the MRO is what we think it is
    names = [c.__name__ for c in Report.__mro__]
    assert names == [
        "Report", "CacheableMixin", "AuditableMixin", "object"
    ], names


def test_unknown_keyword_raises() -> None:
    """Unconsumed kwargs reach object.__init__, which accepts none.

    This is why the cooperative pattern is safe: a typo in a keyword
    fails loudly instead of being silently dropped somewhere in the
    chain.
    """
    try:
        Report("Q1", cache_siz=256)      # typo
    except TypeError as exc:
        assert "cache_siz" in str(exc), exc
    else:
        raise AssertionError("expected TypeError for unknown keyword")


def test_composition_needs_no_patching() -> None:
    """A fixed clock, injected -- no mock, no MRO, no ordering."""
    fixed = datetime(2024, 1, 1, tzinfo=UTC)
    report = ComposedReport("Q1", audit=AuditLog(clock=lambda: fixed))

    report.render()
    report.render()                       # second call is a cache hit

    assert [e for _, e in report.audit.entries] == ["rendered", "cache hit"]
    assert all(t == fixed for t, _ in report.audit.entries)


if __name__ == "__main__":
    test_every_mixin_initialiser_runs()
    test_unknown_keyword_raises()
    test_composition_needs_no_patching()
    print("hierarchy fixed; conflict resolved by composition")`,
        notes: [
          { t: "p", text: "**`test_unknown_keyword_raises` is the one that proves the pattern is safe.** The cooperative `**kwargs` chain looks like it might swallow typos — but `object.__init__` sits at the end of every MRO and accepts no arguments, so anything unconsumed reaches it and raises with the offending name. Without that backstop, `cache_siz=256` would be silently ignored and the cache would quietly use its default." },
          { t: "p", text: "**Asserting the MRO explicitly** is worth doing in any hierarchy with more than one base. It is a one-line test that documents the intended order and fails loudly if someone reorders the bases — which changes method resolution for the whole class." },
          { t: "p", text: "**The composition version has no ordering question at all.** No MRO, no cooperative-`super()` contract, no rules for future contributors to know. It is also the only version where the clock can be injected without patching, which is why the test is three lines rather than a `mock.patch` decorator." },
          { t: "callout", kind: "insight", title: "The signal the MRO conflict was sending", body: [
            { t: "p", text: "`TypeError: Cannot create a consistent MRO` reads like an obstacle and is actually a diagnosis. It means two branches of the hierarchy disagree about which capability comes first — and if the order genuinely matters, they are not independent mixins. If it genuinely does not matter, they should not be in a linear chain." },
            { t: "p", text: "Either way the answer is usually composition, not a reordering. Reordering makes the error go away and leaves the ambiguity in place for the next person to trip over." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A Django project defines a model mixin adding `created_at` and `updated_at`. A developer adds it to an existing model and the timestamps are never populated — silently, with no error. The model's `save()` works, rows are written, only the two columns are always null." },
      { t: "p", text: "**The model's `save()` calls `Model.save(self, *args, **kwargs)` by name rather than `super().save(...)`.** That jumps directly to the base implementation and skips every class between it and the model in the MRO — including the mixin whose `save()` sets the timestamps." },
      { t: "p", text: "**Why it is silent:** skipping a method in the chain is not an error. The base `save()` runs, the row is written, and everything looks successful. The only evidence is data that is not there, which is exactly the kind of failure that survives review and testing." },
      { t: "p", text: "**The rule this justifies:** never call a parent implementation by name. `super()` walks the MRO of `type(self)`, which is the only thing that composes correctly with classes the original author never saw. A one-line `assert Model.__mro__ == [...]` test in any project relying on mixins catches reordering too." }
    ]}
  ],

  takeaways: [
    "**Inherit for substitutability**, not for code reuse. If a `Child` is not usable wherever a `Parent` is expected, you want composition.",
    "Every class has an **MRO** — a flat ordered list searched front to back. `__mro__` shows it, and `mro()` computes it.",
    "**C3 linearisation guarantees** a class precedes its parents, declared left-to-right order is preserved, and those rules hold consistently — otherwise the class definition raises `TypeError`.",
    "**`super()` means \"the next class in `type(self)`'s MRO\"**, not \"the parent\". The same line resolves differently depending on the instance, which is what makes classes composable.",
    "**Never call a parent by name.** `Base.__init__(self)` skips the MRO and silently produces half-initialised objects — the single most common multiple-inheritance bug.",
    "Cooperative initialisation needs all four rules: always call `super().__init__(...)`, keyword-only parameters, accept and forward `**kwargs`, never name a parent.",
    "`object.__init__` at the end of every MRO accepts no arguments, which is what turns an unconsumed keyword into a loud `TypeError` rather than a silent drop.",
    "**An MRO conflict is a design signal**, not an obstacle. Two branches disagree about ordering; composition removes the question rather than reordering to hide it.",
    "Safe mixins are named `...Mixin`, add no `__init__` where possible, document what they require of the host, sit to the left of the base class, and add one capability each.",
    "Defining `__eq__` sets `__hash__` to `None`. A mixin providing equality must restore `__hash__` explicitly or instances become unhashable."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`class D(B, C)` where both inherit from `A`. `B` has no `who()`, `C` and `A` do. What does `D().who()` return?",
        options: [
          "`A`'s — depth-first search goes up through `B` to `A` first",
          "`C`'s — C3 places `C` before `A`, so the shared ancestor is reached only after every class that inherits from it",
          "It raises `TypeError` for an ambiguous method",
          "`B`'s inherited copy of `A`'s method"
        ],
        answer: 1,
        why: "The MRO is `D, B, C, A, object`. C3 guarantees a shared ancestor appears after every class that inherits from it, so `C.who` is found before `A.who`. A naive depth-first search would have gone `D → B → A` and returned `A`'s — which is precisely the bug C3 was designed to prevent."
      },
      {
        stem: "A model mixin sets timestamps in `save()`, but they are always null. The model's `save()` calls `Model.save(self, *args, **kwargs)`. Why?",
        options: [
          "The mixin must be listed after the base class to take effect",
          "Naming the base class directly jumps past every class between it and the model in the MRO — including the mixin",
          "`save()` cannot be overridden by a mixin in Django",
          "The mixin needs an `__init__` that calls `super()`"
        ],
        answer: 1,
        why: "`Model.save(self, ...)` calls that implementation directly, skipping the MRO walk entirely — so any class between the model and `Model`, including the mixin, never runs. Nothing raises, because skipping a method is not an error: rows are written and only the missing data reveals it. `super().save(...)` walks the MRO of `type(self)` and is the only form that composes with classes the author never saw."
      },
      {
        stem: "In cooperative `**kwargs` initialisation, what catches a misspelled keyword like `cache_siz=256`?",
        options: [
          "Nothing — unconsumed keywords are silently discarded at the end of the chain",
          "`object.__init__` sits at the end of every MRO and accepts no arguments, so anything unconsumed reaches it and raises `TypeError`",
          "The first mixin in the MRO validates all keywords",
          "A type checker, but only at edit time"
        ],
        answer: 1,
        why: "Each class pulls out the keywords it understands and forwards the rest. Whatever nobody claimed arrives at `object.__init__`, which takes no arguments and raises `TypeError` naming the offender. That backstop is what makes the pattern safe — without it a typo would be silently ignored and the mixin would quietly use its default."
      },
      {
        stem: "Python refuses to create a class with `TypeError: Cannot create a consistent MRO`. What is the right response?",
        options: [
          "Reorder the base classes until the error disappears",
          "Treat it as a design signal — two branches disagree about ordering, and the usual fix is to make one capability a collaborator rather than a base",
          "Add an explicit `__mro_entries__` to resolve the ambiguity",
          "Use a metaclass to override the linearisation"
        ],
        answer: 1,
        why: "The error means no order satisfies C3's rules: one branch requires A before B and another requires the reverse. Reordering makes the message go away while leaving the underlying ambiguity for the next person. If the order genuinely matters the classes are not independent mixins; if it genuinely does not, they should not be in one linear chain. Composition removes the question entirely and makes both capabilities substitutable in tests."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does `super()` actually do?",
        strong: "It returns a proxy that dispatches to the next class in the MRO of `type(self)` — not to the parent class. For a single-inheritance chain those coincide, which is why the misconception survives. Under multiple inheritance the same `super()` call resolves differently depending on the instance it is called on.",
        answer: [
          { t: "p", text: "The demonstration is worth offering because it settles it in one example: `super().who()` inside `B` calls `A.who` for a `B()` and `C.who` for a `D()`, where `class D(B, C)`. Same line, different target." },
          { t: "p", text: "The practical consequence is the point: that dynamism is what lets a class be composed into hierarchies its author never anticipated. A hard-coded `A.who(self)` breaks the chain and skips whatever sits between." },
          { t: "p", text: "Naming the failure mode lands well — calling a parent by name produces half-initialised objects, silently, because skipping a method in the chain raises nothing." }
        ]
      },
      {
        level: "core",
        q: "What is the MRO and why does Python need C3 linearisation?",
        strong: "The MRO is the flat, ordered list of classes searched for an attribute. C3 produces it under three rules: a class precedes its parents, declared left-to-right order is preserved, and those hold consistently across the hierarchy. If no order satisfies all three, the class definition raises rather than picking one arbitrarily.",
        answer: [
          { t: "p", text: "The diamond is the motivating example, and it is worth stating what naive depth-first would get wrong: going `D → B → A` finds the shared ancestor before `C`, so an override in `C` is silently skipped." },
          { t: "p", text: "The guarantee that matters most is that a shared ancestor appears exactly once, after every class inheriting from it. That is what makes cooperative `super()` chains run each class exactly once." },
          { t: "p", text: "Mentioning that a conflict raises at class-definition time — rather than producing a surprising order — shows you see the error as a feature. Python refuses instead of guessing." }
        ]
      },
      {
        level: "advanced",
        q: "How do you make multiple inheritance work reliably?",
        strong: "Every class in the hierarchy has to cooperate: always call `super().__init__(**kwargs)`, use keyword-only parameters, accept and forward `**kwargs`, and never call a parent by name. Keep mixins stateless where possible and document what each requires of its host.",
        answer: [
          { t: "p", text: "The honest framing is that these rules are conventions the language does not enforce — which is exactly why mixed codebases break. One class that forgets to forward truncates the chain for everything after it." },
          { t: "p", text: "`object.__init__` as the backstop is a detail worth knowing: it accepts no arguments, so an unconsumed keyword raises rather than being silently dropped. That is what makes the `**kwargs` pattern safe rather than sloppy." },
          { t: "p", text: "The senior answer ends by questioning the premise. Most multiple inheritance in application code is code reuse in disguise, and composition gives you substitutable collaborators with no ordering rules for future contributors to learn. Deep hierarchies are a maintenance cost you choose." }
        ],
        weak: "Describing only the syntax of `super()` without the cooperative contract. Multiple inheritance fails at the level of hierarchy-wide discipline, not at the level of one call."
      }
    ]
  }
});

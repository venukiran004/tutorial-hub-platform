/* ============================================================================
   LESSON 8.6 — Metaclasses and __init_subclass__
   ========================================================================= */
EC.receiveLesson({
  id: "8.6",

  lede: "A class is an object, so something must have created it. That something is its metaclass, and by default it is `type`. Metaclasses have a reputation for being both powerful and unusable — the honest position is that **they are neither hard nor usually necessary**, because `__init_subclass__` and class decorators replaced almost every legitimate use.",

  objectives: [
    "Explain what happens when a `class` statement executes",
    "Use `__init_subclass__` for registration and validation across a hierarchy",
    "Write a metaclass, and read one in someone else's code",
    "Name the handful of cases where nothing simpler will do",
    "Diagnose a metaclass conflict in multiple inheritance"
  ],

  prerequisites: ["8.2", "8.5"],

  blocks: [

    { t: "h2", n: "01", text: "What a class statement does", id: "creation" },

    { t: "viz",
      title: "Instance, class, metaclass",
      caption: "An object is an instance of its class; a class is an instance of its metaclass. `type` is its own metaclass, which is where the chain stops. Everything a metaclass can do, it does at the moment a class statement finishes executing.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="Diagram showing an instance whose type is a class, whose type is a metaclass, whose type is type itself">
  <defs>
    <marker id="mc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="34" y="90" width="180" height="72" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="124" y="118" text-anchor="middle" class="s-mono" style="font-size:11px">order = Order()</text>
  <text x="124" y="140" text-anchor="middle" class="s-sub">an instance</text>

  <line x1="218" y1="126" x2="266" y2="126" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#mc)"/>
  <text x="242" y="116" text-anchor="middle" class="s-mono" style="font-size:9px">type()</text>

  <rect x="270" y="90" width="180" height="72" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="360" y="118" text-anchor="middle" class="s-mono" style="font-size:11px">Order</text>
  <text x="360" y="140" text-anchor="middle" class="s-sub">a class — also an object</text>

  <line x1="454" y1="126" x2="502" y2="126" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#mc)"/>
  <text x="478" y="116" text-anchor="middle" class="s-mono" style="font-size:9px">type()</text>

  <rect x="506" y="90" width="180" height="72" rx="9" class="s-fill-2 s-stroke" stroke-width="1.2"/>
  <text x="596" y="118" text-anchor="middle" class="s-mono" style="font-size:11px">type</text>
  <text x="596" y="140" text-anchor="middle" class="s-sub">the default metaclass</text>

  <line x1="690" y1="126" x2="738" y2="126" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#mc)"/>
  <text x="714" y="116" text-anchor="middle" class="s-mono" style="font-size:9px">type()</text>

  <rect x="742" y="90" width="140" height="72" rx="9" class="s-fill-2 s-stroke" stroke-width="1.2"/>
  <text x="812" y="118" text-anchor="middle" class="s-mono" style="font-size:11px">type</text>
  <text x="812" y="140" text-anchor="middle" class="s-sub">its own type</text>

  <text x="34" y="204" class="s-label">A class statement is a CALL</text>
  <text x="34" y="230" class="s-mono" style="font-size:11px">class Order(Base): x = 1</text>
  <text x="34" y="256" class="s-mono" style="font-size:11px">Order = type("Order", (Base,), {"x": 1})</text>
  <text x="470" y="230" class="s-sub">— the body executes into a namespace dict,</text>
  <text x="470" y="256" class="s-sub">then the metaclass is called with three arguments</text>
</svg>`
    },

    { t: "code", lang: "python", title: "creating a class by hand", code: `
# These two are equivalent
class Order:
    total = 0
    def describe(self): return f"Order({self.total})"


Order = type(
    "Order",                                   # name
    (),                                        # bases
    {"total": 0, "describe": lambda self: f"Order({self.total})"},
)

print(type(Order))                             # <class 'type'>
print(type(type))                              # <class 'type'>
`,
      out: `<class 'type'>
<class 'type'>`,
      caption: "`type` with three arguments creates a class; with one argument it reports an object's type. **A metaclass is simply a subclass of `type`** that intercepts that three-argument call."
    },

    { t: "h2", n: "02", text: "The simpler hooks first", id: "simpler" },

    { t: "code", lang: "python", title: "__init_subclass__ handles most of it", code: `
class Plugin:
    registry: dict[str, type["Plugin"]] = {}

    def __init_subclass__(cls, /, priority: int = 0, **kwargs) -> None:
        """Called on the PARENT when a subclass is created.

        Implicitly a classmethod -- no decorator needed. cls is the new
        subclass, not this class.
        """
        super().__init_subclass__(**kwargs)

        # Validate the subclass
        if not hasattr(cls, "name"):
            raise TypeError(f"{cls.__name__} must define a 'name' attribute")
        if cls.name in Plugin.registry:
            raise ValueError(f"duplicate plugin name: {cls.name}")

        cls.priority = priority
        Plugin.registry[cls.name] = cls


class CsvExporter(Plugin, priority=10):        # keyword args reach the hook
    name = "csv"


class Broken(Plugin):                          # TypeError, at class creation
    pass
`,
      out: `TypeError: Broken must define a 'name' attribute`,
      hl: [4, 10, 22],
      caption: "**The error fires when the class is defined**, not when someone instantiates it — so a plugin with a missing attribute fails at import, with the file and line in the traceback (Lesson 6.5)."
    },

    { t: "table",
      head: ["Need", "Reach for", "Not"],
      rows: [
        ["Register subclasses", "`__init_subclass__`", "A metaclass"],
        ["Validate that subclasses define something", "`__init_subclass__`", "A metaclass"],
        ["Give a descriptor its attribute name", "`__set_name__`", "A metaclass (Lesson 8.5)"],
        ["Add or rewrite attributes on one class", "A class decorator", "A metaclass"],
        ["Enforce abstract methods", "`abc.ABC`", "A metaclass of your own"],
        ["Change the namespace mapping during the class body", "**A metaclass** (`__prepare__`)", "—"],
        ["Control the class object itself — its name, bases, or type", "**A metaclass**", "—"],
        ["Customise `isinstance`/`issubclass` for the class", "**A metaclass**", "—"]
      ],
      caption: "**The first five cover almost everything metaclasses were once used for.** `__init_subclass__` arrived in 3.6 and quietly obsoleted the majority of them."
    },

    { t: "h2", n: "03", text: "Writing a metaclass", id: "writing" },

    { t: "code", lang: "python", title: "the three hooks", code: `
class Meta(type):

    @classmethod
    def __prepare__(mcls, name, bases, **kwargs):
        """Returns the mapping the class BODY executes into.

        The only reason this exists: returning something other than a
        plain dict. Enum uses it to detect duplicate members; an ORM
        might use an ordered structure with extra bookkeeping.
        """
        return {}

    def __new__(mcls, name, bases, namespace, **kwargs):
        """Creates the class object. Use this to CHANGE what is created --
        add to the namespace, alter the bases, rename it."""
        namespace["created_by"] = "Meta"
        cls = super().__new__(mcls, name, bases, namespace)
        return cls

    def __init__(cls, name, bases, namespace, **kwargs):
        """Runs after the class exists. Use this for side effects that
        do not change the class -- registration, logging."""
        super().__init__(name, bases, namespace)

    def __call__(cls, *args, **kwargs):
        """Runs when the CLASS is called -- i.e. when an instance is
        created. This is where a singleton would live."""
        return super().__call__(*args, **kwargs)


class Thing(metaclass=Meta):
    pass


print(Thing.created_by)
`,
      out: `Meta`,
      caption: "**`__new__` is on the metaclass, `__init__` is on the class being created** — `mcls` versus `cls` in the signatures. Getting them confused is the most common mistake when reading metaclass code."
    },

    { t: "callout", kind: "insight", title: "Metaclasses you already use", body: [
      { t: "dl", items: [
        ["`abc.ABCMeta`", "Collects `__abstractmethods__` during class creation and makes instantiation fail if any remain. It also customises `issubclass` so `register()` works — which genuinely needs a metaclass."],
        ["`enum.EnumMeta`", "Uses `__prepare__` to get a namespace that rejects duplicate names, then converts every member into an instance of the enum class. Also gives `Colour.RED` iteration and `len(Colour)` — behaviour on the *class*, which only a metaclass can provide."],
        ["`typing.Protocol`", "Uses a metaclass to make `isinstance` work with `@runtime_checkable` (Lesson 8.4)."],
        ["Django models, SQLAlchemy's declarative base", "Turn class-level field declarations into table metadata and instance descriptors. Both predate `__init_subclass__`; a modern equivalent would need far less."]
      ]},
      { t: "p", text: "**The pattern in all of them: behaviour on the class itself.** `len(Colour)`, `issubclass` with registration, iteration over a class — none of that is reachable from `__init_subclass__`, because a class's behaviour comes from *its* type." }
    ]},

    { t: "ladder",
      title: "Making every subclass register itself",
      rungs: [
        { level: "bad", label: "A metaclass",
          why: "It works and it is the heaviest possible tool. Anyone reading `Plugin` must find `PluginMeta` to understand the class, and any other base class with a different metaclass now conflicts — which surfaces as a confusing error far from here.",
          code: `class PluginMeta(type):
    registry = {}

    def __new__(mcls, name, bases, ns, **kw):
        cls = super().__new__(mcls, name, bases, ns)
        if bases:                       # skip the base class itself
            PluginMeta.registry[ns["name"]] = cls
        return cls


class Plugin(metaclass=PluginMeta):
    pass` },
        { level: "ok", label: "__init_subclass__",
          why: "Same behaviour, ordinary class, no metaclass to conflict with. The hook is visible in the base class where a reader is already looking, and it accepts keyword arguments from the subclass definition.",
          code: `class Plugin:
    registry: dict[str, type] = {}

    def __init_subclass__(cls, **kwargs) -> None:
        super().__init_subclass__(**kwargs)
        Plugin.registry[cls.name] = cls` },
        { level: "best", label: "A class decorator, when registration is a choice",
          why: "Opt-in and visible at each class rather than inherited invisibly. A subclass created for a test, or an abstract intermediate, is not silently registered — which with `__init_subclass__` requires an explicit skip.",
          code: `REGISTRY: dict[str, type] = {}


def register(cls: type) -> type:
    REGISTRY[cls.name] = cls
    return cls


@register
class CsvExporter(Plugin):
    name = "csv"


class AbstractExporter(Plugin):        # not registered -- nothing to skip
    ...`,
          note: "Use `__init_subclass__` when registration is a **rule** the base enforces on everyone, and a decorator when it is a **choice** each class makes. The decorator's visibility is worth a lot in a large codebase (Lesson 8.2)." }
      ]
    },

    { t: "h2", n: "04", text: "The conflict problem", id: "conflict" },

    { t: "code", lang: "python", title: "why metaclasses do not compose", code: `
class MetaA(type): pass
class MetaB(type): pass

class A(metaclass=MetaA): pass
class B(metaclass=MetaB): pass

class C(A, B): pass
`,
      out: `TypeError: metaclass conflict: the metaclass of a derived class must be
a (non-strict) subclass of the metaclasses of all its bases`,
      caption: "**A class has exactly one metaclass**, and it must be compatible with every base's. Two libraries that each use a metaclass cannot be combined without writing a third that inherits from both — which is why a metaclass in a public base class is a constraint you impose on every future user."
    },

    { t: "callout", kind: "trap", title: "Three more reasons to hesitate", body: [
      { t: "ul", items: [
        "**Debugging.** A stack trace during class creation runs through the import machinery, and a `pdb` session lands in `__new__` with a namespace dict rather than a class (Lesson 6.6).",
        "**Type checkers understand them poorly.** Attributes a metaclass injects are invisible to `mypy` unless you also write a stub, so the tooling silently stops helping.",
        "**Inheritance is implicit.** Every subclass, at any depth, gets the behaviour — including test doubles and abstract intermediates, which usually need an explicit exemption."
      ]},
      { t: "p", text: "**The rule of thumb that survives scrutiny:** if `__init_subclass__`, `__set_name__` or a class decorator can express it, use them. Reach for a metaclass when you need to control the class *object* — its namespace mapping during creation, its `isinstance` behaviour, or operations on the class itself." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Retire a metaclass — and find the part you cannot",
      difficulty: "expert",
      minutes: 34,
      body: [
        { t: "p", text: "This metaclass has been in a codebase since 2016 and now conflicts with an ABC a new dependency requires. Replace as much of it as possible with modern hooks, and identify precisely which behaviour genuinely needs a metaclass." },
        { t: "code", lang: "python", title: "the metaclass", numbered: false, code: `
class ModelMeta(type):
    registry = {}

    def __new__(mcls, name, bases, ns, **kw):
        # 1. collect declared fields
        fields = {k: v for k, v in ns.items() if isinstance(v, Field)}
        ns["_fields"] = fields

        # 2. give each field its name
        for field_name, field in fields.items():
            field.name = field_name

        # 3. default table name
        ns.setdefault("__table__", name.lower() + "s")

        cls = super().__new__(mcls, name, bases, ns)

        # 4. register concrete models
        if bases and not ns.get("__abstract__"):
            ModelMeta.registry[cls.__table__] = cls
        return cls

    # 5. len(Model) gives the field count
    def __len__(cls):
        return len(cls._fields)

    # 6. iterating a model class yields its fields
    def __iter__(cls):
        return iter(cls._fields.values())


class Model(metaclass=ModelMeta):
    __abstract__ = True`},
        { t: "p", text: "Six behaviours. Five have a simpler replacement." }
      ],
      requirements: [
        "Replace each of behaviours 1–4 with `__init_subclass__`, `__set_name__` or a class decorator, saying which and why.",
        "Identify the behaviours that genuinely require a metaclass, and explain what makes them different.",
        "Produce a version whose only metaclass content is the irreducible part.",
        "Make the ABC conflict go away for the parts that no longer need a metaclass.",
        "Preserve the existing public API — `Model.registry`, `len(User)`, `list(User)` must still work.",
        "Tests covering every behaviour, plus one proving the ABC now composes."
      ],
      hint: "Ask of each behaviour: does it act on the class's *contents*, or on the class *as an object*? The second group is the irreducible one.",
      solution: {
        lang: "python",
        title: "model.py",
        code: `from __future__ import annotations

from typing import Any, ClassVar


# =========================================================================
# THE ANALYSIS
# =========================================================================
#
# The deciding question for each behaviour: does it act on the class's
# CONTENTS, or on the class AS AN OBJECT?
#
#   1. collect fields          CONTENTS  -> __init_subclass__
#   2. name each field         CONTENTS  -> __set_name__ (the field's own job)
#   3. default __table__       CONTENTS  -> __init_subclass__
#   4. register the class      CONTENTS  -> __init_subclass__
#
#   5. len(Model)              THE CLASS -> METACLASS, irreducible
#   6. iter(Model)             THE CLASS -> METACLASS, irreducible
#
# Why 5 and 6 are different in kind: len(x) calls type(x).__len__. For
# an INSTANCE that is the class; for a CLASS it is the metaclass. Dunder
# methods are looked up on the type, never on the object -- so behaviour
# on a class object can ONLY come from its metaclass. No amount of
# __init_subclass__ can give a class a __len__, because __init_subclass__
# adds attributes to the class, and len() does not look there.


class Field:
    """__set_name__ replaces behaviour 2 entirely.

    Python calls it on every class attribute when the owner class is
    created, passing the attribute name. The metaclass loop that assigned
    field.name was reimplementing a language feature (Lesson 8.5).
    """

    def __set_name__(self, owner: type, name: str) -> None:
        self.name = name
        self._slot = f"_{name}"

    def __get__(self, obj: object | None, objtype: type | None = None) -> Any:
        if obj is None:
            return self
        return getattr(obj, self._slot, None)

    def __set__(self, obj: object, value: Any) -> None:
        setattr(obj, self._slot, value)


# =========================================================================
# THE IRREDUCIBLE METACLASS -- two methods, both about the class object
# =========================================================================

class ModelMeta(type):
    """Everything else moved to __init_subclass__. What remains is only
    what a metaclass can do: define behaviour ON the class object.

    Kept deliberately tiny, because a metaclass on a public base class
    is a constraint imposed on every future subclass -- any other base
    with a different metaclass will conflict.
    """

    def __len__(cls) -> int:
        return len(cls._fields)                # type: ignore[attr-defined]

    def __iter__(cls):
        return iter(cls._fields.values())      # type: ignore[attr-defined]

    def __repr__(cls) -> str:
        return f"<Model {cls.__name__}: {len(cls)} fields>"


class Model(metaclass=ModelMeta):
    __abstract__: ClassVar[bool] = True

    registry: ClassVar[dict[str, type["Model"]]] = {}
    _fields: ClassVar[dict[str, Field]] = {}

    def __init_subclass__(cls, /, table: str | None = None, **kwargs: Any) -> None:
        """Behaviours 1, 3 and 4 -- all about the class's CONTENTS.

        Implicitly a classmethod. cls is the NEW subclass. The
        super() call matters: without it, a sibling hook further up
        the MRO is silently skipped.
        """
        super().__init_subclass__(**kwargs)

        # 1. Collect fields, INCLUDING inherited ones. The original
        #    metaclass only looked at ns -- the new class's own
        #    namespace -- so a field defined on a parent was invisible
        #    to a child. That was a latent bug, not a feature.
        fields: dict[str, Field] = {}
        for klass in reversed(cls.__mro__):
            fields.update({
                k: v for k, v in vars(klass).items() if isinstance(v, Field)
            })
        cls._fields = fields

        # 2. Field names: nothing to do. __set_name__ already ran, before
        #    this hook, as part of class creation.

        # 3. Default table name, overridable by a class keyword:
        #        class User(Model, table="app_users")
        cls.__table__ = table or getattr(cls, "__table__", None) or f"{cls.__name__.lower()}s"

        # 4. Register concrete models only. __dict__, not getattr:
        #    getattr would find the parent's __abstract__ = True and
        #    skip every subclass.
        if not cls.__dict__.get("__abstract__", False):
            if cls.__table__ in Model.registry:
                raise ValueError(
                    f"table {cls.__table__!r} is already registered to "
                    f"{Model.registry[cls.__table__].__name__}"
                )
            Model.registry[cls.__table__] = cls


# =========================================================================
# USE -- and the ABC that now composes
# =========================================================================

class User(Model):
    id = Field()
    email = Field()


class Admin(User, table="admins"):
    """Inherits id and email, adds one. The original metaclass would
    have given this class _fields = {"level": ...} only."""
    level = Field()


class AbstractAudited(Model):
    __abstract__ = True                 # not registered
    created_at = Field()


# The conflict that started this: a new dependency requires an ABC.
import abc


class Serialisable(abc.ABC):
    @abc.abstractmethod
    def to_dict(self) -> dict[str, Any]: ...


class CombinedMeta(ModelMeta, abc.ABCMeta):
    """A class has exactly ONE metaclass, and it must be a subclass of
    every base's metaclass. With the old six-behaviour metaclass this
    was the only option and it was fragile.

    It is now trivial -- ModelMeta is two methods with no __new__ and no
    state, so combining is a class statement with an empty body. THAT is
    the practical payoff of shrinking the metaclass: it composes.
    """


class Account(Model, Serialisable, metaclass=CombinedMeta):
    id = Field()
    balance = Field()

    def to_dict(self) -> dict[str, Any]:
        return {name: getattr(self, name) for name in type(self)._fields}


# =========================================================================
# TESTS
# =========================================================================

import pytest


def test_fields_are_collected_including_inherited() -> None:
    """The bug the rewrite fixed: the metaclass read only the new class's
    own namespace, so Admin lost id and email."""
    assert set(User._fields) == {"id", "email"}
    assert set(Admin._fields) == {"id", "email", "level"}


def test_set_name_gives_each_field_its_name() -> None:
    """No metaclass loop needed -- Python calls __set_name__ on every
    class attribute at class creation."""
    assert User._fields["email"].name == "email"
    assert Admin._fields["level"].name == "level"


def test_table_name_defaults_and_can_be_overridden() -> None:
    assert User.__table__ == "users"
    assert Admin.__table__ == "admins"          # via the class keyword


def test_only_concrete_models_are_registered() -> None:
    assert Model.registry["users"] is User
    assert Model.registry["admins"] is Admin
    assert "abstractauditeds" not in Model.registry


def test_abstract_check_uses_the_class_dict_not_getattr() -> None:
    """getattr would find the parent's __abstract__ = True and skip
    every subclass -- silently registering nothing."""
    assert AbstractAudited.__dict__.get("__abstract__") is True
    assert User.__dict__.get("__abstract__") is None
    assert "users" in Model.registry


def test_duplicate_table_fails_at_class_creation() -> None:
    """At import, with the file and line -- not on first query."""
    with pytest.raises(ValueError, match="already registered"):
        class Duplicate(Model, table="users"):
            id = Field()


def test_class_level_len_and_iter_still_work() -> None:
    """The irreducible metaclass behaviour. len(x) calls type(x).__len__,
    and for a CLASS the type is the metaclass -- so this cannot be done
    with __init_subclass__ at all."""
    assert len(User) == 2
    assert len(Admin) == 3
    assert [f.name for f in User] == ["id", "email"]
    assert repr(User) == "<Model User: 2 fields>"


def test_len_cannot_come_from_a_class_attribute() -> None:
    """Proves the point: assigning __len__ to the class makes INSTANCES
    sized, not the class."""
    class NotAModel:
        __len__ = lambda self: 99

    assert len(NotAModel()) == 99

    with pytest.raises(TypeError, match="has no len"):
        len(NotAModel)


def test_it_now_composes_with_an_abc() -> None:
    """The conflict that prompted the rewrite. Possible only because
    ModelMeta shrank to two methods with no __new__ and no state."""
    account = Account()
    account.id = "a-1"
    account.balance = 100

    assert account.to_dict() == {"id": "a-1", "balance": 100}
    assert isinstance(account, Serialisable)
    assert len(Account) == 2


def test_incomplete_abc_subclass_still_fails() -> None:
    """Combining metaclasses must not weaken ABCMeta's enforcement."""
    class Incomplete(Model, Serialisable, metaclass=CombinedMeta):
        id = Field()

    with pytest.raises(TypeError, match="abstract"):
        Incomplete()`,
        notes: [
          { t: "p", text: "**The deciding question is whether a behaviour acts on the class's contents or on the class as an object.** Collecting fields, defaulting a name and registering are all about contents, and `__init_subclass__` sees all of them. `len()` and `iter()` on the class are behaviour *of* the class object, and dunder lookups go to the type — which for a class is its metaclass. No hook can substitute." },
          { t: "p", text: "**The rewrite fixed a real bug on the way.** The metaclass collected fields from `ns` — the new class's own namespace — so `Admin` lost `id` and `email`. Walking the MRO in `__init_subclass__` picks up inherited fields, which is what anyone would have assumed the original did." },
          { t: "p", text: "**`cls.__dict__.get(\"__abstract__\")` rather than `getattr` is the subtle correctness detail.** `getattr` walks the MRO, finds the base's `__abstract__ = True`, and concludes every subclass is abstract — so nothing registers, and the failure is silence rather than an error." },
          { t: "callout", kind: "insight", title: "Shrinking the metaclass is what made it composable", body: [
            { t: "p", text: "A class has exactly one metaclass, and it must be a subclass of every base's. That is why introducing an ABC broke everything — and why the fix, `class CombinedMeta(ModelMeta, ABCMeta)`, is a class statement with an empty body." },
            { t: "p", text: "That only works because `ModelMeta` no longer has a `__new__` doing five things. A metaclass with substantial `__new__` logic tends to conflict in ways that cannot be resolved by inheritance, since the two `__new__` implementations both want to control creation." }
          ]},
          { t: "p", text: "**`super().__init_subclass__(**kwargs)` is not optional.** Omit it and a sibling hook further up the MRO never runs — which in a codebase with several mixins produces a class that is missing behaviour with no error anywhere (Lesson 4.7)." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A platform team ships a base class with a metaclass that auto-registers subclasses, validates required attributes and injects a serialiser. It is elegant, it works, and it is used by forty services." },
      { t: "p", text: "**Then a team needs their model to also be a `Protocol` implementation with `abc.ABC`.** Metaclass conflict. The workaround is a combined metaclass, which needs both `__new__` implementations to cooperate — and they do not, because each assumes it controls the namespace." },
      { t: "p", text: "**The constraint had been invisible until it bit.** A metaclass on a public base class is imposed on every subclass forever, including ones written years later by people who never heard of it, combining it with libraries that did not exist when it was designed." },
      { t: "p", text: "**Moving the registration and validation to `__init_subclass__` removed the constraint entirely** — an ordinary class with a hook composes with anything. The remaining metaclass shrank to the one piece that genuinely needed it, and became small enough to combine with `ABCMeta` in a single empty class statement. **Prefer the tool that composes**; a metaclass is a decision you make on behalf of everyone downstream." }
    ]}
  ],

  takeaways: [
    "**A class statement is a call**: the body executes into a namespace, then the metaclass is invoked with name, bases and namespace. `type` is the default.",
    "**A metaclass is a subclass of `type`** that intercepts that call — `__prepare__` chooses the namespace mapping, `__new__` creates the class, `__init__` runs after, `__call__` runs on instantiation.",
    "**`__init_subclass__` replaced most metaclass uses.** It runs on the parent when a subclass is created, is implicitly a classmethod, and accepts keyword arguments from the class statement.",
    "**`__set_name__` gives class attributes their names**, so the metaclass loop that assigned field names was reimplementing a language feature.",
    "**A class decorator is right when the behaviour is a choice**; `__init_subclass__` when it is a rule the base enforces on every subclass.",
    "**Always call `super().__init_subclass__(**kwargs)`** — omitting it silently skips a sibling hook further up the MRO.",
    "**Use `cls.__dict__.get(...)` not `getattr` when checking a marker like `__abstract__`**, or the parent's value makes every subclass look abstract.",
    "**A metaclass is irreducible only for behaviour on the class object itself** — `len(Model)`, iterating a class, customised `isinstance` — because dunder lookups go to the type.",
    "**A class has exactly one metaclass**, and it must be compatible with every base's, so two libraries using metaclasses cannot be combined without a third.",
    "**A metaclass on a public base class is a constraint on everyone downstream**, imposed on subclasses written years later against libraries that did not exist.",
    "**Type checkers understand metaclasses poorly**, so attributes one injects are invisible to `mypy` without a stub.",
    "**`ABCMeta` and `EnumMeta` are the canonical legitimate uses** — both provide behaviour on the class, which nothing simpler can."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which of these genuinely requires a metaclass?",
        options: [
          "Registering every subclass in a dictionary",
          "Making `len(MyClass)` — on the class itself, not an instance — return a value",
          "Validating that subclasses define a required attribute",
          "Giving each declared field its attribute name"
        ],
        answer: 1,
        why: "Dunder methods are looked up on the *type* of the object. For an instance that is its class; for a class it is the metaclass. So `__len__` on a class can only come from its metaclass — assigning `__len__` as a class attribute makes instances sized instead. The other three are `__init_subclass__` and `__set_name__`, both of which act on the class's contents."
      },
      {
        stem: "Why does `class C(A, B)` fail when `A` and `B` have different metaclasses?",
        options: [
          "Multiple inheritance is not allowed with metaclasses",
          "A class has exactly one metaclass, and it must be a subclass of every base's — neither `MetaA` nor `MetaB` qualifies",
          "The MRO cannot be linearised",
          "Metaclasses are resolved before bases"
        ],
        answer: 1,
        why: "Python must pick one metaclass for the new class, and it must be compatible with all the bases. Two unrelated metaclasses have no common subclass, so you must write one inheriting from both — which only works if their `__new__` implementations cooperate. This is why a metaclass on a public base class is a constraint imposed on every future user."
      },
      {
        stem: "Why must `__init_subclass__` call `super().__init_subclass__(**kwargs)`?",
        options: [
          "To register the subclass with `type`",
          "So a hook defined further up the MRO still runs — omitting it silently skips sibling behaviour with no error",
          "Because the method is abstract in `object`",
          "To make the keyword arguments available to the subclass"
        ],
        answer: 1,
        why: "`__init_subclass__` participates in the MRO like any other method, so several bases can each define one. Without the `super()` call, the chain stops at yours and any mixin further along contributes nothing — producing a class that quietly lacks behaviour rather than failing. Passing `**kwargs` along is what lets each hook consume the arguments it recognises."
      },
      {
        stem: "A base class marks abstract models with `__abstract__ = True`. Why check `cls.__dict__.get(\"__abstract__\")` rather than `getattr(cls, \"__abstract__\")`?",
        options: [
          "`getattr` is slower on classes",
          "`getattr` walks the MRO and finds the base's `True`, so every subclass looks abstract and nothing gets registered",
          "`__dict__` access bypasses descriptors, which is required here",
          "They are equivalent; `__dict__` is only more explicit"
        ],
        answer: 1,
        why: "`getattr` follows inheritance, so a subclass that never set `__abstract__` inherits the base's `True` and is treated as abstract. The registry then stays empty and the failure is silence, not an error. `cls.__dict__` looks only at attributes defined directly on that class, which is what a per-class marker means."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "expert",
        q: "What is a metaclass, and when have you needed one?",
        strong: "The class of a class — it intercepts the call that a `class` statement compiles into. In practice I have rarely needed one, because `__init_subclass__`, `__set_name__` and class decorators cover registration, validation and attribute rewriting.",
        answer: [
          { t: "p", text: "Being able to say when one *is* required is what distinguishes the answer: behaviour on the class object itself — `len(MyClass)`, iterating a class, customised `isinstance` — because dunder lookups go to the type." },
          { t: "p", text: "Naming `ABCMeta` and `EnumMeta` as the canonical legitimate uses grounds it in code everyone has used, rather than in a hypothetical." },
          { t: "p", text: "The composition problem is the strongest practical point: a class has exactly one metaclass, so putting one on a public base class constrains every subclass written afterwards." }
        ]
      },
      {
        level: "advanced",
        q: "How would you make every subclass of a base register itself?",
        strong: "`__init_subclass__` on the base — it runs when a subclass is created, is implicitly a classmethod, and takes keyword arguments from the class statement. A class decorator if registration should be opt-in per class.",
        answer: [
          { t: "p", text: "The rule-versus-choice distinction is the judgement worth showing: inherited registration silently catches test doubles and abstract intermediates, which a decorator does not." },
          { t: "p", text: "Two implementation details signal real use: `super().__init_subclass__(**kwargs)` so sibling hooks still run, and `cls.__dict__.get` rather than `getattr` when checking an abstract marker." },
          { t: "p", text: "Failing at class creation rather than at first use is the operational benefit — the error carries the file and line, at import." }
        ]
      },
      {
        level: "expert",
        q: "You need a class from a library with a metaclass to also inherit from `abc.ABC`. What happens?",
        strong: "A metaclass conflict, because the derived class's metaclass must be a subclass of every base's. The fix is a combined metaclass inheriting from both — which works only if their creation logic does not collide.",
        answer: [
          { t: "p", text: "Explaining *why* it sometimes cannot be resolved shows depth: two metaclasses that each define a substantial `__new__` both assume they control the namespace." },
          { t: "p", text: "The design lesson is the transferable part — shrinking a metaclass to only what is irreducible makes it composable, often reducing the combined metaclass to an empty class statement." },
          { t: "p", text: "Framing it as a constraint imposed on downstream users, years later, against libraries that did not exist yet, is the argument that changes how people design base classes." }
        ]
      }
    ]
  }
});

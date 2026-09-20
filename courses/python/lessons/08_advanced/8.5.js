/* ============================================================================
   LESSON 8.5 — Descriptors
   ========================================================================= */
EC.receiveLesson({
  id: "8.5",

  lede: "A descriptor is any object defining `__get__`, `__set__` or `__delete__`, and it is the mechanism behind `property`, `classmethod`, `staticmethod`, `functools.cached_property`, every ORM field and — most surprisingly — **the fact that a plain function becomes a bound method**. Learn it once and a large amount of Python stops looking like special-case magic.",

  objectives: [
    "Explain attribute lookup precedence, including where data descriptors sit",
    "Distinguish data from non-data descriptors and predict the difference",
    "Use `__set_name__` and store state on the instance, not the descriptor",
    "Explain how `self` gets bound, in terms of the protocol",
    "Decide between a descriptor, a `property` and a plain attribute"
  ],

  prerequisites: ["4.6", "8.2"],

  blocks: [

    { t: "h2", n: "01", text: "Attribute lookup", id: "lookup" },

    {"kind": "steps", "title": "Attribute lookup, with descriptors", "caption": "The full order behind obj.x: data descriptors on the type win, then the instance dict, then non-data descriptors and plain class attributes. property is a data descriptor; a function is a non-data descriptor, which is why methods bind.", "items": [{"label": "type(obj).__mro__ has a data descriptor 'x'?", "desc": "__set__ or __delete__ defined — property, slots — call its __get__", "tone": "warn"}, {"label": "'x' in obj.__dict__?", "desc": "return the instance value", "tone": "good"}, {"label": "non-data descriptor or class attribute?", "desc": "functions bind here: func.__get__(obj, type) → bound method", "tone": "accent"}, {"label": "__getattr__(name) if defined", "desc": "else AttributeError", "tone": "crit"}], "t": "diagram", "id": "dg-8_5-01-0"},


    { t: "viz",
      title: "What `obj.x` actually does",
      caption: "The order is the whole lesson. A data descriptor on the class beats the instance dictionary; a non-data descriptor loses to it. That single distinction explains `property`, bound methods, and why `cached_property` can replace itself.",
      svg: `<svg viewBox="0 0 900 330" role="img" aria-label="Flowchart of attribute lookup order: data descriptor, instance dict, non-data descriptor, class attribute, then getattr">
  <defs>
    <marker id="lk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="290" y="16" width="320" height="40" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="450" y="41" text-anchor="middle" class="s-mono" style="font-size:12px;fill:var(--accent-ink)">obj.x</text>

  <line x1="450" y1="58" x2="450" y2="76" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#lk)"/>

  <rect x="200" y="80" width="500" height="42" rx="7" style="fill:none;stroke:var(--crit)" stroke-width="1.4"/>
  <text x="220" y="98" class="s-label" style="fill:var(--crit)">1. DATA descriptor on type(obj)?</text>
  <text x="220" y="115" class="s-sub">defines __set__ or __delete__ — e.g. property</text>
  <text x="690" y="107" text-anchor="end" class="s-mono" style="font-size:10px;fill:var(--crit)">→ __get__</text>

  <line x1="450" y1="124" x2="450" y2="140" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#lk)"/>

  <rect x="200" y="144" width="500" height="42" rx="7" style="fill:none;stroke:var(--border-strong)" stroke-width="1.3"/>
  <text x="220" y="162" class="s-label">2. obj.__dict__["x"]?</text>
  <text x="220" y="179" class="s-sub">the instance's own attribute</text>
  <text x="690" y="171" text-anchor="end" class="s-mono" style="font-size:10px">→ the value</text>

  <line x1="450" y1="188" x2="450" y2="204" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#lk)"/>

  <rect x="200" y="208" width="500" height="42" rx="7" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="220" y="226" class="s-label" style="fill:var(--good)">3. NON-DATA descriptor on type(obj)?</text>
  <text x="220" y="243" class="s-sub">only __get__ — e.g. a function, cached_property</text>
  <text x="690" y="235" text-anchor="end" class="s-mono" style="font-size:10px;fill:var(--good)">→ __get__</text>

  <line x1="450" y1="252" x2="450" y2="268" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#lk)"/>

  <rect x="200" y="272" width="500" height="42" rx="7" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="220" y="290" class="s-label">4. Plain class attribute, then __getattr__</text>
  <text x="220" y="307" class="s-sub">then AttributeError</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the precedence, demonstrated", code: `
class DataDesc:
    def __get__(self, obj, objtype=None): return "from data descriptor"
    def __set__(self, obj, value): pass          # having __set__ makes it DATA


class NonDataDesc:
    def __get__(self, obj, objtype=None): return "from non-data descriptor"


class Thing:
    a = DataDesc()
    b = NonDataDesc()


t = Thing()
t.__dict__["a"] = "from instance dict"
t.__dict__["b"] = "from instance dict"

print(t.a)          # the DATA descriptor wins over the instance dict
print(t.b)          # the instance dict wins over the NON-data descriptor
`,
      out: `from data descriptor
from instance dict`,
      hl: [17, 18],
      caption: "**That is the entire difference.** Defining `__set__` (or `__delete__`) promotes a descriptor above the instance dictionary — which is what makes a `property` impossible to shadow by assignment, and what lets `cached_property` overwrite itself."
    },

    { t: "callout", kind: "insight", title: "How `self` gets bound", body: [
      { t: "code", lang: "python", title: "a function is a non-data descriptor", numbered: false, code: `
class Service:
    def fetch(self, path): ...


# The function stored on the class:
print(Service.__dict__["fetch"])          # <function Service.fetch>

# Accessing it through an INSTANCE calls its __get__:
print(Service().fetch)                    # <bound method Service.fetch>

# Which is equivalent to:
print(Service.__dict__["fetch"].__get__(Service(), Service))

# And that is all a bound method is -- a partial application of self.`,
        out: `<function Service.fetch at 0x...>
<bound method Service.fetch of <Service object at 0x...>>
<bound method Service.fetch of <Service object at 0x...>>`},
      { t: "p", text: "There is no special case in the language for methods. `function.__get__` returns a `MethodType` binding the instance, and the ordinary lookup rules do the rest." },
      { t: "p", text: "This also explains the class-decorator failure from Lesson 8.2: replacing a method with an instance of your own class removes the descriptor, so nothing binds `self`. `functools.partial` in a `__get__` is the manual version of what functions do for free." }
    ]},

    { t: "h2", n: "02", text: "Writing one", id: "writing" },

    { t: "code", lang: "python", title: "the full protocol", code: `
class Field:
    def __set_name__(self, owner: type, name: str) -> None:
        """Called automatically when the OWNER CLASS is created, with the
        attribute name. This is how a descriptor learns what it is called
        without repeating the name in the constructor."""
        self._name = name
        self._private = f"_{name}"

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self                     # accessed on the CLASS
        return getattr(obj, self._private)

    def __set__(self, obj, value) -> None:
        setattr(obj, self._private, value)

    def __delete__(self, obj) -> None:
        delattr(obj, self._private)


class Product:
    price = Field()                          # __set_name__(Product, "price")
`,
      hl: [2, 10, 11],
      caption: "**`obj is None` means the attribute was accessed on the class, not an instance.** Returning `self` is the convention — it is what lets `Product.price` give you the descriptor for introspection instead of raising."
    },

    { t: "callout", kind: "trap", title: "Never store per-instance state on the descriptor", body: [
      { t: "code", lang: "python", title: "one descriptor, every instance", numbered: false, code: `
class Broken:
    def __set_name__(self, owner, name): self._name = name
    def __get__(self, obj, objtype=None): return self._value
    def __set__(self, obj, value): self._value = value      # WRONG


class Product:
    price = Broken()

a, b = Product(), Product()
a.price = 10
b.price = 20
print(a.price)                    # 20 -- they share one descriptor`,
        out: `20`},
      { t: "p", text: "**A descriptor is a class attribute: one object, shared by every instance.** Storing the value on `self` means every instance overwrites every other — the same failure as a mutable class attribute (Lesson 4.2)." },
      { t: "table",
        head: ["Storage", "Verdict"],
        rows: [
          ["`self._value` on the descriptor", "**Broken** — shared by all instances"],
          ["A `dict[instance, value]` on the descriptor", "**Leaks** — strong references keep every instance alive forever"],
          ["A `WeakKeyDictionary` on the descriptor", "Works, but requires hashable instances and adds indirection"],
          ["`obj.__dict__[self._private]`", "**Correct** — per instance, garbage collected normally, visible in `vars(obj)`"]
        ]
      },
      { t: "p", text: "The instance dictionary is nearly always the answer. It also means a class using `__slots__` must declare the private name — `__slots__ = (\"_price\",)`, not `(\"price\",)` (Lesson 8.8)." }
    ]},

    { t: "h2", n: "03", text: "The library descriptors, explained", id: "library" },

    { t: "table",
      head: ["Object", "Kind", "What its `__get__` returns"],
      rows: [
        ["A plain function", "Non-data", "A bound method — `self` partially applied"],
        ["`property`", "**Data**", "The result of calling the getter; `__set__` calls the setter or raises"],
        ["`classmethod`", "Non-data", "A method bound to the **class** rather than the instance"],
        ["`staticmethod`", "Non-data", "The underlying function, unbound"],
        ["`functools.cached_property`", "**Non-data**", "Computes once, then writes into `obj.__dict__` — so the second access never reaches it"],
        ["An ORM column", "Data", "The loaded value, often triggering lazy loading"]
      ],
      caption: "**`cached_property` is the clearest payoff of the precedence rule.** It is deliberately non-data, so after it writes the value into the instance dictionary, step 2 of the lookup wins and the descriptor is bypassed entirely — caching with zero ongoing overhead."
    },

    { t: "code", lang: "python", title: "why cached_property fails with __slots__", code: `
from functools import cached_property


class WithSlots:
    __slots__ = ("radius",)

    def __init__(self, radius: float) -> None:
        self.radius = radius

    @cached_property
    def area(self) -> float:
        return 3.14159 * self.radius ** 2


WithSlots(2).area
`,
      out: `TypeError: No '__dict__' attribute on 'WithSlots' instance to cache 'area'.`,
      caption: "The caching mechanism *is* the instance dictionary, and `__slots__` removes it. Add `\"__dict__\"` to the slots — which defeats most of the point — or use a plain `property` (Lesson 4.10)."
    },

    { t: "h2", n: "04", text: "When to use one", id: "when" },

    { t: "ladder",
      title: "Validating three fields on a class",
      rungs: [
        { level: "bad", label: "Validate in `__init__` only",
          why: "Later assignment bypasses every check, so an object that was valid at construction becomes invalid at line 40 with nothing to catch it.",
          code: `class Product:
    def __init__(self, price, weight, stock):
        if price < 0: raise ValueError("price must be >= 0")
        if weight < 0: raise ValueError("weight must be >= 0")
        if stock < 0: raise ValueError("stock must be >= 0")
        self.price, self.weight, self.stock = price, weight, stock

p = Product(10, 1, 5)
p.price = -50            # no check. Nothing stops this.` },
        { level: "ok", label: "A property per field",
          why: "Every assignment is validated, and a reader can see exactly what each field allows. But it is nine lines per field of nearly identical code, and adding a fourth field means copying the pattern again.",
          code: `class Product:
    @property
    def price(self) -> float:
        return self._price

    @price.setter
    def price(self, value: float) -> None:
        if value < 0:
            raise ValueError("price must be >= 0")
        self._price = value

    # ... the same nine lines for weight and stock` },
        { level: "best", label: "One descriptor, three uses",
          why: "The rule is written once and applied by declaration. Adding a field is one line, the constraint is visible at the top of the class, and `__set_name__` means the descriptor knows its own name for the error message.",
          code: `class NonNegative:
    def __set_name__(self, owner: type, name: str) -> None:
        self._name = name
        self._private = f"_{name}"

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self._private)

    def __set__(self, obj, value: float) -> None:
        if value < 0:
            raise ValueError(f"{self._name} must be >= 0, got {value}")
        setattr(obj, self._private, value)


class Product:
    price = NonNegative()
    weight = NonNegative()
    stock = NonNegative()`,
          note: "**The threshold is roughly three.** One or two validated fields: use `property`, which every Python programmer reads without effort. Three or more sharing a rule, or a rule you want reusable across classes: a descriptor earns its cost." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "The honest case against descriptors", body: [
      { t: "ul", items: [
        "**They are invisible at the call site.** `p.price = -1` looks like an assignment and runs arbitrary code, which is exactly the objection people raise about `property` — with a class the reader must find in another file.",
        "**They complicate debugging.** Stepping through an assignment lands in a `__set__` several frames from anything familiar (Lesson 6.6).",
        "**Type checkers need help.** A descriptor's `__get__` return type has to be annotated carefully, or the attribute's type is lost.",
        "**A dataclass with `__post_init__`, or Pydantic, covers most validation needs** with far less machinery (Lesson 4.10)."
      ]},
      { t: "p", text: "**Learn descriptors to understand the language; reach for them rarely.** The genuine cases are a reusable validation or conversion rule applied to several attributes, a lazily-loaded ORM-style field, and a per-attribute unit conversion — where the alternative is real duplication rather than one `property`." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A typed, validated field descriptor",
      difficulty: "expert",
      minutes: 34,
      body: [
        { t: "p", text: "Build `Field` — a reusable descriptor providing type checking, optional validation, defaults and read-only fields, with enough type annotation that `mypy` still knows what `product.price` is." },
        { t: "p", text: "Two requirements make this harder than it looks: it must work with `__slots__`, and `mypy` must infer `Decimal` from `price = Field(Decimal, ...)` rather than `Any`." }
      ],
      requirements: [
        "Type checking on assignment, with a clear message naming the attribute.",
        "An optional validator callable, and support for a default.",
        "A read-only mode that raises on assignment after the first set.",
        "Per-instance storage that does not leak and works under `__slots__`.",
        "`Product.price` (on the class) returns the descriptor for introspection.",
        "Generic typing so `mypy` infers the attribute's type at every use.",
        "**Explain what makes this a data descriptor and why that matters here.**"
      ],
      hint: "For the typing, the descriptor class needs a type parameter and two `__get__` overloads — one for `obj is None` and one for an instance. For `__slots__`, remember the descriptor cannot use `obj.__dict__`.",
      solution: {
        lang: "python",
        title: "fields.py",
        code: `from __future__ import annotations

from collections.abc import Callable
from typing import Any, overload


class Field[T]:
    """A reusable validated attribute.

    DATA DESCRIPTOR: it defines __set__, which places it ABOVE the
    instance dictionary in the lookup order. That is essential here --
    a non-data descriptor would be shadowed the moment anything wrote
    to the instance dict, and every validation would be bypassed from
    that point on. Being a data descriptor is what makes the guarantee
    hold rather than being advisory.
    """

    __slots__ = ("_type", "_validator", "_default", "_read_only", "_name", "_slot")

    def __init__(
        self,
        type_: type[T],
        *,
        validator: Callable[[T], bool] | None = None,
        default: T | None = None,
        read_only: bool = False,
        message: str | None = None,
    ) -> None:
        self._type = type_
        self._validator = validator
        self._default = default
        self._read_only = read_only
        self._message = message

    def __set_name__(self, owner: type, name: str) -> None:
        """Called when the OWNER class is created, with the attribute
        name. Without it, every field would have to repeat its own name:
        price = Field(Decimal, name="price").
        """
        self._name = name
        self._slot = f"_field_{name}"

    # Two overloads so mypy knows:
    #   Product.price      -> Field[Decimal]   (introspection)
    #   instance.price     -> Decimal          (the value)
    @overload
    def __get__(self, obj: None, objtype: type) -> "Field[T]": ...
    @overload
    def __get__(self, obj: object, objtype: type | None = ...) -> T: ...

    def __get__(self, obj: object | None, objtype: type | None = None) -> Any:
        if obj is None:
            return self                        # accessed on the class

        try:
            return getattr(obj, self._slot)
        except AttributeError:
            if self._default is not None:
                return self._default
            raise AttributeError(
                f"{type(obj).__name__}.{self._name} has not been set"
            ) from None

    def __set__(self, obj: object, value: T) -> None:
        if self._read_only and hasattr(obj, self._slot):
            raise AttributeError(
                f"{type(obj).__name__}.{self._name} is read-only"
            )

        # bool is a subclass of int, so isinstance(True, int) is True.
        # Reject it explicitly where an int was asked for -- a boolean
        # quantity is nearly always a bug (Lesson 2.4).
        if self._type is int and isinstance(value, bool):
            raise TypeError(f"{self._name} must be int, got bool")

        if not isinstance(value, self._type):
            raise TypeError(
                f"{self._name} must be {self._type.__name__}, "
                f"got {type(value).__name__}"
            )

        if self._validator is not None and not self._validator(value):
            raise ValueError(
                self._message or f"{self._name} failed validation: {value!r}"
            )

        # Storage via setattr on a DISTINCT name, not obj.__dict__.
        # setattr goes through the normal machinery, so it works with
        # __slots__ as long as the class declares the private name --
        # obj.__dict__[...] would raise on a slotted class.
        object.__setattr__(obj, self._slot, value)

    def __delete__(self, obj: object) -> None:
        if self._read_only:
            raise AttributeError(f"{self._name} is read-only")
        try:
            object.__delattr__(obj, self._slot)
        except AttributeError:
            raise AttributeError(f"{self._name} is not set") from None


# =========================================================================
# USE
# =========================================================================

from decimal import Decimal


class Product:
    # Every constraint visible in six lines, at the top of the class.
    sku = Field(str, validator=lambda s: len(s) >= 3, read_only=True,
                message="sku must be at least 3 characters")
    price = Field(Decimal, validator=lambda p: p >= 0,
                  message="price must not be negative")
    stock = Field(int, validator=lambda n: n >= 0, default=0)

    def __init__(self, sku: str, price: Decimal, stock: int = 0) -> None:
        self.sku = sku
        self.price = price
        self.stock = stock


class SlottedProduct:
    """Works under __slots__ -- but the slots must name the PRIVATE
    attributes the descriptor writes to, not the public ones. Declaring
    __slots__ = ("price",) would collide with the class attribute and
    raise ValueError at class creation."""

    __slots__ = ("_field_price", "_field_stock")

    price = Field(Decimal, validator=lambda p: p >= 0)
    stock = Field(int, default=0)


# =========================================================================
# TESTS
# =========================================================================

import pytest


def test_type_is_checked_on_every_assignment() -> None:
    """Not just in __init__ -- that is the whole reason for a descriptor
    rather than constructor validation."""
    p = Product("ABC", Decimal("10"))

    with pytest.raises(TypeError, match="price must be Decimal, got float"):
        p.price = 10.5

    with pytest.raises(TypeError, match="price must be Decimal, got str"):
        p.price = "10"


def test_validator_runs_with_a_useful_message() -> None:
    p = Product("ABC", Decimal("10"))

    with pytest.raises(ValueError, match="price must not be negative"):
        p.price = Decimal("-1")


def test_bool_is_rejected_where_int_is_required() -> None:
    """isinstance(True, int) is True, so without the explicit check a
    boolean would silently become a stock quantity of 1."""
    p = Product("ABC", Decimal("10"))

    with pytest.raises(TypeError, match="stock must be int, got bool"):
        p.stock = True


def test_read_only_after_first_set() -> None:
    p = Product("ABC", Decimal("10"))

    with pytest.raises(AttributeError, match="sku is read-only"):
        p.sku = "XYZ"


def test_instances_do_not_share_state() -> None:
    """THE descriptor bug: one descriptor object is shared by every
    instance, so storing the value on the descriptor makes every
    Product see the last one written."""
    a = Product("AAA", Decimal("10"))
    b = Product("BBB", Decimal("20"))

    assert (a.price, b.price) == (Decimal("10"), Decimal("20"))
    assert (a.sku, b.sku) == ("AAA", "BBB")


def test_data_descriptor_cannot_be_shadowed() -> None:
    """Because Field defines __set__, it sits ABOVE the instance dict in
    the lookup order. Writing directly to the instance dict does not
    bypass it -- which is what makes the validation a guarantee."""
    p = Product("ABC", Decimal("10"))
    p.__dict__["price"] = Decimal("-999")        # sneaking past the setter

    assert p.price == Decimal("10")              # descriptor still wins


def test_default_is_used_until_something_is_set() -> None:
    class Minimal:
        stock = Field(int, default=0)

    m = Minimal()
    assert m.stock == 0
    m.stock = 5
    assert m.stock == 5


def test_unset_field_without_a_default_raises_clearly() -> None:
    class Minimal:
        name = Field(str)

    with pytest.raises(AttributeError, match="has not been set"):
        Minimal().name


def test_class_access_returns_the_descriptor() -> None:
    """obj is None means "accessed on the class". Returning self is the
    convention that makes introspection possible."""
    assert isinstance(Product.price, Field)
    assert Product.price._type is Decimal


def test_it_works_with_slots() -> None:
    """object.__setattr__ on a distinct private name works under
    __slots__; obj.__dict__[...] would raise, because there is no dict."""
    p = SlottedProduct()
    p.price = Decimal("5")

    assert p.price == Decimal("5")
    assert not hasattr(p, "__dict__")

    with pytest.raises(AttributeError):
        p.other = 1                              # slots still enforced


def test_no_leak_when_instances_are_collected() -> None:
    """A dict[instance, value] on the descriptor would hold strong
    references and keep every Product alive forever. Instance-side
    storage is collected normally."""
    import gc
    import weakref

    p = Product("ABC", Decimal("10"))
    ref = weakref.ref(p)

    del p
    gc.collect()
    assert ref() is None`,
        notes: [
          { t: "p", text: "**Defining `__set__` is what makes the validation a guarantee rather than a suggestion.** As a data descriptor, `Field` sits above the instance dictionary in the lookup order, so even writing straight into `obj.__dict__` cannot bypass it — the test asserts exactly that. A non-data descriptor would be shadowed by the first such write and silently stop validating." },
          { t: "p", text: "**Storage goes on the instance under a distinct private name.** The three wrong answers are instructive: on the descriptor (shared by every instance), in a `dict` keyed by instance (a permanent leak, since the keys are strong references), or via `obj.__dict__` directly (raises under `__slots__`). `object.__setattr__` with a `_field_` prefix avoids all three." },
          { t: "p", text: "**The two `__get__` overloads are what keep the type.** Without them the checker cannot distinguish `Product.price` — which returns the descriptor — from `product.price`, which returns a `Decimal`, and the attribute's type degrades to `Any` at every use (Lesson 8.3)." },
          { t: "callout", kind: "trap", title: "`__slots__` must name the private attribute", body: [
            { t: "p", text: "`__slots__ = (\"price\",)` alongside `price = Field(...)` raises `ValueError: 'price' in __slots__ conflicts with class variable` at class creation — the slot descriptor and your descriptor want the same name." },
            { t: "p", text: "Declaring `_field_price` instead works, because that is where the value actually lives. It is a small detail that turns a confusing class-creation error into a working combination." }
          ]},
          { t: "p", text: "**The `bool` check is not pedantry.** `isinstance(True, int)` is `True`, so without it `product.stock = True` sets a quantity of 1 and passes every validator — a class of bug that survives review because the code looks obviously fine (Lesson 2.4)." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team writes a caching descriptor for expensive computed attributes on their model objects. It stores results in `self._cache`, a dictionary on the descriptor keyed by the instance. It works perfectly in tests." },
      { t: "p", text: "**In production, memory grows until the process is killed.** The descriptor is a class attribute — one object, living as long as the class — and its dictionary holds a strong reference to every model instance ever created. Nothing is ever collected." },
      { t: "p", text: "**The tests could not have caught it.** Each test created a handful of objects and finished; the leak needs a long-lived process and a stream of instances, which is exactly what a request handler is and a test is not." },
      { t: "p", text: "**Two fixes, and one is better.** A `WeakKeyDictionary` stops the descriptor keeping instances alive. But the real answer is the one `functools.cached_property` uses: store the value **on the instance**, so it lives and dies with the object and needs no bookkeeping at all. When a descriptor holds per-instance data, the instance should own it — anything else is a lifetime you have to manage by hand." }
    ]}
  ],

  takeaways: [
    "**A descriptor is any object defining `__get__`, `__set__` or `__delete__`**, and it is the machinery behind `property`, `classmethod`, `cached_property` and ORM fields.",
    "**Defining `__set__` or `__delete__` makes it a *data* descriptor**, which places it above the instance dictionary in the lookup order.",
    "**Lookup order is: data descriptor, instance dict, non-data descriptor, class attribute, `__getattr__`.** Almost every surprise follows from it.",
    "**A plain function is a non-data descriptor** — `function.__get__` returns a bound method, which is the whole of how `self` is passed.",
    "**`cached_property` is deliberately non-data**: it writes into the instance dictionary, which then wins the lookup, so caching costs nothing after the first access.",
    "**`cached_property` therefore fails under `__slots__`** — the cache *is* the instance dictionary.",
    "**`__set_name__` gives a descriptor its attribute name** when the owner class is created, so a field need not repeat its own name.",
    "**Never store per-instance state on the descriptor** — one object is shared by every instance, so they all overwrite each other.",
    "**A dict keyed by instance on the descriptor is a permanent leak**; strong references keep every instance alive for the life of the class.",
    "**Store on the instance under a private name.** With `__slots__`, the slot must declare that private name, not the public one.",
    "**Annotate `__get__` with two overloads** so a checker distinguishes class access (the descriptor) from instance access (the value).",
    "**The threshold is about three fields.** One or two validated attributes: use `property`. A rule shared across several attributes or classes: a descriptor earns its cost."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why can you not shadow a `property` by writing to an instance's `__dict__`?",
        options: [
          "Properties are stored in a separate namespace",
          "A `property` defines `__set__`, making it a data descriptor — and data descriptors are consulted before the instance dictionary",
          "The instance dictionary is read-only when a property exists",
          "Properties are resolved at class creation and cached"
        ],
        answer: 1,
        why: "Attribute lookup checks data descriptors on the type first, then the instance dictionary, then non-data descriptors. Because `property` defines `__set__`, an entry in `obj.__dict__` under the same name is simply never reached. That precedence is what makes property validation a guarantee rather than something a stray assignment can bypass."
      },
      {
        stem: "`functools.cached_property` fails on a class with `__slots__`. Why?",
        options: [
          "`__slots__` disables all descriptors",
          "It caches by writing the computed value into the instance's `__dict__`, which `__slots__` removes",
          "`cached_property` requires the class to be hashable",
          "Slotted classes cannot define properties"
        ],
        answer: 1,
        why: "`cached_property` is a *non-data* descriptor on purpose: after computing, it stores the result in `obj.__dict__`, so the next lookup finds it at step 2 and never reaches the descriptor again — caching with zero ongoing cost. `__slots__` eliminates the instance dictionary, so there is nowhere to write. Use a plain `property`, or add `\"__dict__\"` to the slots and lose most of the benefit."
      },
      {
        stem: "A descriptor stores values in `self._value`. Two instances of the owning class interfere with each other. Why?",
        options: [
          "`__set_name__` was not called",
          "The descriptor is a class attribute — one object shared by every instance — so all of them write to the same `_value`",
          "`__get__` is missing the `objtype` parameter",
          "The class needs `__slots__`"
        ],
        answer: 1,
        why: "A descriptor is created once, when the class body executes, exactly like any other class attribute. State on `self` is therefore state shared by every instance, which is the same failure mode as a mutable class attribute. Store the value on the instance under a private name; a dict keyed by instance also works but holds strong references and leaks."
      },
      {
        stem: "When is a descriptor the right tool rather than a `property`?",
        options: [
          "Whenever an attribute needs validation",
          "When the same rule applies to several attributes or across classes, so a `property` per field would be real duplication",
          "Whenever the class has `__slots__`",
          "When the attribute is computed rather than stored"
        ],
        answer: 1,
        why: "One or two validated fields are clearer as properties — every Python programmer reads them without effort. The descriptor earns its cost around the third field, or when the rule should be reusable across classes: the constraint is then declared in one line per field and defined once. Below that threshold it adds indirection a reader must chase into another file."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "expert",
        q: "How does `self` get passed to a method?",
        strong: "A function is a non-data descriptor. Accessing it through an instance calls `function.__get__`, which returns a bound method — `self` partially applied. There is no special case in the language for methods.",
        answer: [
          { t: "p", text: "This is the answer that shows the object model is understood rather than memorised, and it explains a lot of otherwise-arbitrary behaviour." },
          { t: "p", text: "It connects directly to a practical bug: a class-based decorator replaces the method with an instance that is not a descriptor, so nothing binds `self` and the call fails with a missing-argument error." },
          { t: "p", text: "Adding that `classmethod` and `staticmethod` are also descriptors — binding the class, or nothing at all — completes the picture in one sentence." }
        ]
      },
      {
        level: "expert",
        q: "What is the difference between a data and a non-data descriptor?",
        strong: "A data descriptor defines `__set__` or `__delete__` and is consulted *before* the instance dictionary. A non-data descriptor defines only `__get__` and loses to it. That precedence is the whole distinction.",
        answer: [
          { t: "p", text: "`cached_property` is the perfect illustration: it is non-data deliberately, so writing the value into the instance dict means subsequent lookups never reach it." },
          { t: "p", text: "The consequence for validation is the other half — being a data descriptor is what stops a stray `obj.__dict__` write bypassing your checks." },
          { t: "p", text: "Reciting the full order — data descriptor, instance dict, non-data descriptor, class attribute, `__getattr__` — makes every related surprise predictable rather than mysterious." }
        ]
      },
      {
        level: "advanced",
        q: "Where should a descriptor store per-instance data?",
        strong: "On the instance, under a distinct private name. The descriptor itself is a single shared object, so state on `self` is shared by every instance — and a dict keyed by instance holds strong references and leaks.",
        answer: [
          { t: "p", text: "The leak is worth describing concretely: a descriptor lives as long as the class, so its cache keeps every object ever created alive, and no test with a handful of short-lived instances will show it." },
          { t: "p", text: "`WeakKeyDictionary` as the mitigation, and instance storage as the actual fix, shows you know both and prefer the one with no bookkeeping." },
          { t: "p", text: "The `__slots__` interaction is a good closing detail — the slot must declare the private name, since the public one collides with the class attribute." }
        ]
      }
    ]
  }
});

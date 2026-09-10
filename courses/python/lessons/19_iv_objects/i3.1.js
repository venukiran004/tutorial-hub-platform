/* ============================================================================
   INTERVIEW: OBJECTS & INTERNALS i3.1 — Object-Oriented Programming
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i3.1",
 "lede": "**43 interview questions on object-oriented programming**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 43 questions on object-oriented programming without prompting",
  "State the trade-off behind each answer, not only the definition",
  "Recognise the follow-up each question is setting up",
  "Notice which answers you can recognise but not produce"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "viz",
   "title": "Where Python looks when you touch an attribute",
   "caption": "Instance, then class, then each base along the MRO. Most questions in this set are answerable by walking that chain out loud.",
   "svg": "<svg viewBox='0 0 880 220' role='img' aria-label='Attribute lookup order from instance dict through class to base classes'><g style='stroke-width:2'><rect x='40' y='50' width='200' height='48' rx='7' style='fill:var(--good);fill-opacity:.16;stroke:var(--good)'/><rect x='280' y='50' width='200' height='48' rx='7' style='fill:var(--accent);fill-opacity:.14;stroke:var(--accent)'/><rect x='520' y='50' width='200' height='48' rx='7' style='fill:var(--accent);fill-opacity:.14;stroke:var(--accent)'/><rect x='760' y='50' width='96' height='48' rx='7' style='fill:var(--crit);fill-opacity:.12;stroke:var(--crit)'/></g><text x='62' y='80' class='s-sub' style='fill:var(--good)'>instance __dict__</text><text x='302' y='80' class='s-sub' style='fill:var(--ink-2)'>its class</text><text x='542' y='80' class='s-sub' style='fill:var(--ink-2)'>bases, in MRO order</text><text x='776' y='80' class='s-sub' style='fill:var(--crit)'>AttributeError</text><g style='stroke:var(--ink-3);stroke-width:1.5'><line x1='244' y1='74' x2='276' y2='74' marker-end='url(#ob-a)'/><line x1='484' y1='74' x2='516' y2='74' marker-end='url(#ob-a)'/><line x1='724' y1='74' x2='756' y2='74' marker-end='url(#ob-a)'/></g><text x='40' y='134' class='s-sub' style='fill:var(--ink-3)'>Data descriptors on the class outrank the instance dict -- which is why a property cannot be shadowed by assignment.</text><text x='40' y='158' class='s-sub' style='fill:var(--ink-3)'>The MRO is computed once by C3 linearisation; super() follows it rather than jumping to a parent.</text><text x='40' y='190' class='s-sub' style='fill:var(--crit)'>Say the chain aloud and most questions here answer themselves, including the diamond-inheritance ones.</text><defs><marker id='ob-a' markerWidth='8' markerHeight='8' refX='6' refY='4' orient='auto'><path d='M0 0 L8 4 L0 8 z' style='fill:var(--ink-3)'/></marker></defs></svg>"
  },
  {
   "t": "callout",
   "kind": "note",
   "title": "How to use this set",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Answer out loud before revealing.** An answer you can only recognise is one you cannot give under pressure.",
      "**Say the trade-off, not just the definition.** Interviewers are listening for judgement, and the follow-up is where it shows.",
      "Coding problems live in the **Coding Practice** course — these are the ones you answer in conversation."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What are the four pillars of OOP? Explain with Python examples.",
   "terms": [
    "Encapsulation",
    "Abstraction",
    "Inheritance",
    "Polymorphism"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** The four pillars are **Encapsulation**, **Abstraction**, **Inheritance**, and **Polymorphism**."
    },
    {
     "t": "ul",
     "items": [
      "**Encapsulation**bundling data and methods together, restricting direct access to internal state.",
      "**Abstraction**hiding complex implementation details and exposing only the interface.",
      "**Inheritance**creating new classes from existing ones, reusing and extending behaviour.",
      "**Polymorphism**the same interface behaving differently depending on the underlying type."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from abc import ABC, abstractmethod\n\n# Abstraction + Encapsulation\nclass Shape(ABC):\n    @abstractmethod\n    def area(self) -> float: ...\n\n# Inheritance\nclass Rectangle(Shape):\n    def __init__(self, w: float, h: float):\n        self.__w = w          # encapsulated (name-mangled)\n        self.__h = h\n\n    def area(self) -> float:  # Polymorphism — same method, different logic\n        return self.__w * self.__h\n\nclass Circle(Shape):\n    def __init__(self, r: float):\n        self.__r = r\n\n    def area(self) -> float:\n        import math\n        return math.pi * self.__r ** 2\n\n# Polymorphism in action\nshapes: list[Shape] = [Rectangle(3, 4), Circle(5)]\nfor s in shapes:\n    print(s.area())   # each object responds differently",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Encapsulation protects `__w`, `__h`, `__r` from outside mutation. Abstraction hides how `area()` is computed. Inheritance lets `Rectangle` and `Circle` share the `Shape` contract. Polymorphism lets us loop over heterogeneous shapes with a uniform interface."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is `self`? Is it a keyword?",
   "body": [
    {
     "t": "p",
     "text": "**A:** `self` is **not** a keyword — it is simply the conventional name for the first parameter of instance methods, which Python automatically binds to the calling object. You could name it anything, but breaking this convention is strongly discouraged by PEP 8."
    },
    {
     "t": "p",
     "text": "When you call `obj.method()`, Python translates it to `ClassName.method(obj)`, passing the instance as the first argument."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Dog:\n    def __init__(self, name):\n        self.name = name          # self refers to the new instance\n\n    def speak(self):\n        return f\"{self.name} says Woof!\"\n\nd = Dog(\"Rex\")\nprint(d.speak())                  # Python does Dog.speak(d) internally\n\n# Proof that self is not a keyword — this works (but don't do it):\nclass Cat:\n    def __init__(this, name):     # 'this' instead of 'self'\n        this.name = name\n    def speak(this):\n        return f\"{this.name} says Meow!\"\n\nprint(Cat(\"Luna\").speak())        # Luna says Meow!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Key points: - `self` gives instance methods access to instance attributes and other methods. - It must be the first parameter in every instance method signature. - It is passed implicitly by Python; you never pass it explicitly when calling the method. - Class methods receive `cls` instead, and static methods receive neither."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Class vs instance variables — explain with shadowing example.",
   "terms": [
    "Class variables",
    "Instance variables",
    "write",
    "instance",
    "shadows",
    "Rules of thumb"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** **Class variables** are defined in the class body and shared by all instances. **Instance variables** are defined on `self` (usually inside `__init__`) and belong to one specific object. When you read an attribute, Python first looks at the instance `__dict__`, then the class `__dict__` (MRO chain). When you **write** to an attribute via `self`, it always creates/updates an **instance** variable, which **shadows** the class variable."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Config:\n    debug = False          # class variable — shared\n    items = []             # DANGER: mutable class variable\n\n    def __init__(self, name):\n        self.name = name   # instance variable\n\na = Config(\"A\")\nb = Config(\"B\")\n\n# Reading — both see class variable\nprint(a.debug, b.debug)   # False False\n\n# Shadowing — assignment creates an instance variable\na.debug = True\nprint(a.debug)             # True  (instance variable)\nprint(b.debug)             # False (still class variable)\nprint(Config.debug)        # False (class variable unchanged)\n\n# Mutable class variable trap — mutation affects everyone\na.items.append(\"x\")       # mutates the shared list IN-PLACE\nprint(b.items)             # ['x']  — b sees it too!\n\n# Fix: assign a new list to create an instance variable\na.items = [\"y\"]            # now a has its own list\nprint(b.items)             # ['x'] — class variable still has 'x'",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rules of thumb:** - Use class variables for constants or truly shared state. - Always initialise mutable attributes inside `__init__` on `self`. - Use `ClassName.var` to explicitly access/modify the class variable. - `vars(obj)` or `obj.__dict__` shows only instance attributes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "`@classmethod` vs `@staticmethod` vs instance method — when to use each?",
   "terms": [
    "When to use each",
    "Instance method",
    "@classmethod",
    "@staticmethod"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** Python has three kinds of methods that differ in what they receive as their first argument:"
    },
    {
     "t": "table",
     "head": [
      "Method Type",
      "First Arg",
      "Can Access Instance?",
      "Can Access Class?"
     ],
     "rows": [
      [
       "Instance method",
       "`self`",
       "Yes",
       "Yes (via `self.__class__`)"
      ],
      [
       "`@classmethod`",
       "`cls`",
       "No",
       "Yes"
      ],
      [
       "`@staticmethod`",
       "(nothing)",
       "No",
       "No"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Date:\n    def __init__(self, year, month, day):\n        self.year = year\n        self.month = month\n        self.day = day\n\n    # Instance method — operates on a specific instance\n    def display(self):\n        return f\"{self.year}-{self.month:02d}-{self.day:02d}\"\n\n    # Class method — factory; receives the class, not an instance\n    @classmethod\n    def from_string(cls, date_str: str):\n        y, m, d = map(int, date_str.split(\"-\"))\n        return cls(y, m, d)        # cls ensures subclass-friendly creation\n\n    # Static method — utility; no access to cls or self\n    @staticmethod\n    def is_leap(year: int) -> bool:\n        return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)\n\nd = Date.from_string(\"2025-06-15\")\nprint(d.display())                 # 2025-06-15\nprint(Date.is_leap(2024))         # True",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use each:** - **Instance method** — default choice; needs access to instance state. - **`@classmethod`** — alternative constructors (factories), or when you need the class itself (e.g., to be subclass-friendly). - **`@staticmethod`** — pure utility that logically belongs to the class but doesn't need `self` or `cls`. Could be a free function, but grouping it in the class improves organisation."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What are factory methods? Show an example with `@classmethod`.",
   "body": [
    {
     "t": "p",
     "text": "**A:** A **factory method** is an alternative constructor that creates instances in a different way than `__init__`. In Python, the idiomatic approach is to use `@classmethod` as a factory because it receives `cls`, making it subclass-safe — if a subclass inherits the factory, `cls` points to the subclass."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import json\n\nclass User:\n    def __init__(self, name: str, age: int):\n        self.name = name\n        self.age = age\n\n    @classmethod\n    def from_dict(cls, data: dict):\n        \"\"\"Factory: create User from a dictionary.\"\"\"\n        return cls(data[\"name\"], data[\"age\"])\n\n    @classmethod\n    def from_json(cls, json_str: str):\n        \"\"\"Factory: create User from a JSON string.\"\"\"\n        data = json.loads(json_str)\n        return cls(data[\"name\"], data[\"age\"])\n\n    @classmethod\n    def guest(cls):\n        \"\"\"Factory: create a default guest user.\"\"\"\n        return cls(\"Guest\", 0)\n\n    def __repr__(self):\n        return f\"User(name={self.name!r}, age={self.age})\"\n\n# Different ways to construct a User\nu1 = User(\"Alice\", 30)\nu2 = User.from_dict({\"name\": \"Bob\", \"age\": 25})\nu3 = User.from_json('{\"name\": \"Charlie\", \"age\": 28}')\nu4 = User.guest()\n\nprint(u1, u2, u3, u4)\n\n# Subclass-safe: cls is the subclass\nclass Admin(User):\n    pass\n\na = Admin.from_dict({\"name\": \"Root\", \"age\": 99})\nprint(type(a))   # <class 'Admin'> — not User!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Real-world examples: `dict.fromkeys()`, `datetime.datetime.now()`, `datetime.datetime.fromtimestamp()`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Explain `@property` — getter, setter, deleter with validation example.",
   "terms": [
    "Key points",
    "read-only"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** `@property` turns a method into a \"computed attribute\", letting you add logic (validation, caching, lazy loading) behind simple attribute-access syntax. It uses the descriptor protocol under the hood."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Temperature:\n    def __init__(self, celsius: float):\n        self.celsius = celsius       # triggers the setter\n\n    @property\n    def celsius(self) -> float:\n        \"\"\"Getter — called on attribute read.\"\"\"\n        return self._celsius\n\n    @celsius.setter\n    def celsius(self, value: float):\n        \"\"\"Setter — called on attribute write. Adds validation.\"\"\"\n        if value < -273.15:\n            raise ValueError(\"Temperature below absolute zero is impossible\")\n        self._celsius = value\n\n    @celsius.deleter\n    def celsius(self):\n        \"\"\"Deleter — called on `del obj.celsius`.\"\"\"\n        print(\"Resetting temperature\")\n        self._celsius = 0.0\n\n    @property\n    def fahrenheit(self) -> float:\n        \"\"\"Read-only computed property.\"\"\"\n        return self._celsius * 9 / 5 + 32\n\nt = Temperature(100)\nprint(t.celsius)          # 100   (getter)\nprint(t.fahrenheit)       # 212.0 (computed)\n\nt.celsius = 37            # setter with validation\nprint(t.fahrenheit)       # 98.6\n\ndel t.celsius              # deleter\nprint(t.celsius)           # 0.0\n\n# Validation in action:\n# t.celsius = -300         # ValueError!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key points:** - The backing attribute is conventionally named with a single underscore (`_celsius`). - If you define only a getter (no setter), the property is **read-only**. - Properties let you start with plain attributes and add logic later without changing the external API — a Pythonic advantage over Java-style getters/setters."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the difference between `__repr__` and `__str__`?",
   "terms": [
    "Audience",
    "Goal",
    "Fallback",
    "Called by",
    "Best practice"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** Both return string representations of an object, but they serve different audiences:"
    },
    {
     "t": "table",
     "head": [
      "",
      "`__repr__`",
      "`__str__`"
     ],
     "rows": [
      [
       "**Audience**",
       "Developers / debugging",
       "End users"
      ],
      [
       "**Goal**",
       "Unambiguous, ideally eval-able",
       "Readable, friendly"
      ],
      [
       "**Fallback**",
       "Used if `__str__` is not defined",
       "Falls back to `__repr__`"
      ],
      [
       "**Called by**",
       "`repr()`, interactive REPL, containers",
       "`str()`, `print()`, f-strings"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import datetime\n\nclass Point:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n\n    def __repr__(self):\n        return f\"Point({self.x!r}, {self.y!r})\"   # unambiguous, eval-able\n\n    def __str__(self):\n        return f\"({self.x}, {self.y})\"             # human-friendly\n\np = Point(3, 4)\nprint(repr(p))     # Point(3, 4)    — used in REPL, debugging\nprint(str(p))      # (3, 4)         — used in print()\nprint(f\"{p}\")      # (3, 4)         — __str__ via f-string\nprint(f\"{p!r}\")    # Point(3, 4)    — force __repr__ in f-string\n\n# In containers, __repr__ is always used:\nprint([p])         # [Point(3, 4)]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Best practice:** Always define `__repr__`. Define `__str__` only if the user-facing representation should differ. If you only define `__repr__`, `str()` and `print()` will fall back to it."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Explain operator overloading with `__add__`, `__mul__`, `__radd__`.",
   "terms": [
    "reflected",
    "How dispatch works"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** Python maps operators to dunder methods. When you write `a + b`, Python calls `a.__add__(b)`. If that returns `NotImplemented`, Python tries `b.__radd__(a)` (the **reflected** version). This lets custom types participate in operations with built-in types."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Vector:\n    def __init__(self, x, y):\n        self.x, self.y = x, y\n\n    def __repr__(self):\n        return f\"Vector({self.x}, {self.y})\"\n\n    def __add__(self, other):\n        if isinstance(other, Vector):\n            return Vector(self.x + other.x, self.y + other.y)\n        return NotImplemented         # let Python try __radd__ on other\n\n    def __mul__(self, scalar):\n        \"\"\"Vector * scalar\"\"\"\n        if isinstance(scalar, (int, float)):\n            return Vector(self.x * scalar, self.y * scalar)\n        return NotImplemented\n\n    def __rmul__(self, scalar):\n        \"\"\"scalar * Vector  — reflected multiply\"\"\"\n        return self.__mul__(scalar)   # multiplication is commutative\n\n    def __radd__(self, other):\n        \"\"\"Handles sum() which starts with 0 + Vector\"\"\"\n        if other == 0:\n            return self\n        return self.__add__(other)\n\nv1 = Vector(1, 2)\nv2 = Vector(3, 4)\n\nprint(v1 + v2)       # Vector(4, 6)      — __add__\nprint(v1 * 3)        # Vector(3, 6)      — __mul__\nprint(3 * v1)        # Vector(3, 6)      — __rmul__\nprint(sum([v1, v2])) # Vector(4, 6)      — __radd__ handles 0 + v1",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**How dispatch works:** `a + b` → try `type(a).__add__(a, b)` → if `NotImplemented`, try `type(b).__radd__(b, a)` → if still `NotImplemented`, raise `TypeError`."
    },
    {
     "t": "p",
     "text": "Common operator dunders: `__sub__`, `__truediv__`, `__floordiv__`, `__mod__`, `__pow__`, `__eq__`, `__lt__`, `__le__`, etc. Each has a reflected `__r*__` variant."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is `__call__`? When would you make a class callable?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Defining `__call__` makes instances callable like functions using `()`. This is useful when you need a callable with **state** — it bridges the gap between functions and objects."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Counter:\n    \"\"\"A callable that counts how many times it has been invoked.\"\"\"\n    def __init__(self):\n        self.count = 0\n\n    def __call__(self, *args, **kwargs):\n        self.count += 1\n        print(f\"Called {self.count} time(s) with args={args}\")\n        return self.count\n\ncounter = Counter()\ncounter(\"hello\")       # Called 1 time(s) with args=('hello',)\ncounter(1, 2, 3)       # Called 2 time(s) with args=(1, 2, 3)\nprint(callable(counter))  # True\n\n# Practical use case: decorator as a class\nclass Retry:\n    def __init__(self, max_retries=3):\n        self.max_retries = max_retries\n\n    def __call__(self, func):\n        def wrapper(*args, **kwargs):\n            for attempt in range(1, self.max_retries + 1):\n                try:\n                    return func(*args, **kwargs)\n                except Exception as e:\n                    print(f\"Attempt {attempt} failed: {e}\")\n                    if attempt == self.max_retries:\n                        raise\n        return wrapper\n\n@Retry(max_retries=2)\ndef unstable():\n    import random\n    if random.random() < 0.7:\n        raise ValueError(\"Boom\")\n    return \"OK\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Common use cases for `__call__`:** - Stateful decorators (as shown above). - Strategy/policy objects that behave like functions. - Functor-style objects (like PyTorch `nn.Module`'s forward pass). - Memoization / caching wrappers."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "How does name mangling work? (`_var`, `__var`, `__var__`)",
   "terms": [
    "Why name mangling exists",
    "not"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** Python uses naming conventions (not strict access modifiers) to signal the intended visibility of attributes:"
    },
    {
     "t": "table",
     "head": [
      "Convention",
      "Example",
      "Meaning"
     ],
     "rows": [
      [
       "`_var`",
       "`_helper`",
       "\"Protected\" — internal use, not enforced"
      ],
      [
       "`__var`",
       "`__secret`",
       "Name-mangled to `_ClassName__secret`"
      ],
      [
       "`__var__`",
       "`__init__`",
       "Dunder / magic — reserved by Python"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Account:\n    def __init__(self, owner, balance):\n        self.owner = owner         # public\n        self._id = id(self)        # \"protected\" by convention\n        self.__balance = balance   # name-mangled → _Account__balance\n\n    def get_balance(self):\n        return self.__balance      # works inside the class\n\na = Account(\"Alice\", 1000)\n\n# Public — accessible\nprint(a.owner)               # Alice\n\n# Protected — accessible but signals \"internal\"\nprint(a._id)                 # some id\n\n# Name-mangled — AttributeError if accessed as __balance\n# print(a.__balance)         # AttributeError!\nprint(a._Account__balance)   # 1000 — still accessible if you know the mangled name\n\n# Dunders — reserved by Python for protocols\nprint(a.__class__)           # <class 'Account'> — not mangled (has trailing __)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why name mangling exists:** It prevents accidental name collisions in inheritance hierarchies. If a subclass defines its own `__balance`, it won't clash with the parent's `__balance` because they mangle to different names (`_Parent__balance` vs `_Child__balance`). It is **not** security — determined users can always access mangled names."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Base:\n    def __init__(self):\n        self.__x = \"base\"     # _Base__x\n\nclass Child(Base):\n    def __init__(self):\n        super().__init__()\n        self.__x = \"child\"    # _Child__x — no collision!\n\nc = Child()\nprint(c._Base__x)             # \"base\"\nprint(c._Child__x)            # \"child\"",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Single vs multiple inheritance.",
   "terms": [
    "Single inheritance",
    "Multiple inheritance",
    "Diamond problem",
    "MRO",
    "Name collisions",
    "Complexity"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** **Single inheritance** means a class inherits from exactly one parent. **Multiple inheritance** means a class inherits from two or more parents. Python supports both."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Single inheritance\nclass Animal:\n    def speak(self):\n        return \"...\"\n\nclass Dog(Animal):\n    def speak(self):\n        return \"Woof!\"\n\n# Multiple inheritance\nclass Flyable:\n    def fly(self):\n        return \"Flying!\"\n\nclass Swimmable:\n    def swim(self):\n        return \"Swimming!\"\n\nclass Duck(Animal, Flyable, Swimmable):\n    def speak(self):\n        return \"Quack!\"\n\nd = Duck()\nprint(d.speak())   # Quack!\nprint(d.fly())     # Flying!\nprint(d.swim())    # Swimming!\nprint(Duck.__mro__)\n# (Duck, Animal, Flyable, Swimmable, object)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Challenges with multiple inheritance:** 1. **Diamond problem** — when two parents share a common ancestor, which path does Python follow? Solved by **MRO** (C3 Linearization). 2. **Name collisions** — if two parents define the same method, the one earlier in MRO wins. 3. **Complexity** — deep multiple inheritance trees become hard to reason about."
    },
    {
     "t": "p",
     "text": "**Best practice:** Prefer **composition over inheritance**. If you must use multiple inheritance, use **mixins** — small, focused classes that add a single capability and don't carry state of their own."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is MRO? Explain C3 Linearization with diamond problem example.",
   "terms": [
    "MRO (Method Resolution Order)",
    "C3 Linearization",
    "How C3 works (simplified)"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** **MRO (Method Resolution Order)** is the order in which Python searches classes when looking up a method. Python uses the **C3 Linearization** algorithm, which guarantees: 1. Children come before parents. 2. The order of bases in the class definition is preserved. 3. A class appears only once in the MRO."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class A:\n    def greet(self):\n        return \"A\"\n\nclass B(A):\n    def greet(self):\n        return \"B\"\n\nclass C(A):\n    def greet(self):\n        return \"C\"\n\nclass D(B, C):           # Diamond: D -> B -> C -> A\n    pass\n\nprint(D.__mro__)\n# (<class 'D'>, <class 'B'>, <class 'C'>, <class 'A'>, <class 'object'>)\n\nd = D()\nprint(d.greet())          # \"B\" — B comes before C in MRO",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**How C3 works (simplified):**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L(D) = D + merge(L(B), L(C), [B, C])\nL(B) = [B, A, object]\nL(C) = [C, A, object]\n\nmerge([B, A, object], [C, A, object], [B, C])\n → take B (head of first list, not in tail of any)  → [D, B]\n → take C (head of second list)                      → [D, B, C]\n → take A                                            → [D, B, C, A]\n → take object                                       → [D, B, C, A, object]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "If C3 cannot produce a consistent ordering, Python raises `TypeError` at class creation time. You can inspect the MRO with `ClassName.__mro__` or `ClassName.mro()`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How does `super()` work? Does it always call the parent?",
   "terms": [
    "not",
    "next class in the MRO",
    "Key insights"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** `super()` does **not** always call the direct parent — it calls the **next class in the MRO**. This is crucial in multiple inheritance where `super()` follows the MRO chain, enabling cooperative method calls."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class A:\n    def __init__(self):\n        print(\"A.__init__\")\n        super().__init__()\n\nclass B(A):\n    def __init__(self):\n        print(\"B.__init__\")\n        super().__init__()       # next in MRO, might not be A!\n\nclass C(A):\n    def __init__(self):\n        print(\"C.__init__\")\n        super().__init__()\n\nclass D(B, C):\n    def __init__(self):\n        print(\"D.__init__\")\n        super().__init__()\n\nD()\n# Output:\n# D.__init__\n# B.__init__\n# C.__init__     ← super() in B called C, not A!\n# A.__init__\n\nprint(D.__mro__)\n# D → B → C → A → object",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key insights:** - `super()` returns a proxy that delegates calls to the next class in the MRO. - In single inheritance, the MRO is linear, so `super()` always calls the parent. - In multiple inheritance, `super()` in `B` might call `C` (a sibling), not `A` (the parent). - For cooperative MI to work, **every class in the hierarchy must call `super()`**, including the base class (where it reaches `object`). - `super()` with no arguments (Python 3) is equivalent to `super(__class__, self)`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is cooperative multiple inheritance?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Cooperative multiple inheritance is a pattern where **every class in the hierarchy calls `super()`** so that all classes in the MRO get a chance to run their method. Without cooperation, some classes in the chain get skipped."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Base:\n    def setup(self, **kwargs):\n        print(f\"Base.setup\")\n        # Base absorbs remaining kwargs — end of chain\n\nclass LogMixin:\n    def setup(self, **kwargs):\n        print(f\"LogMixin.setup\")\n        super().setup(**kwargs)          # forward to next in MRO\n\nclass AuthMixin:\n    def setup(self, **kwargs):\n        print(f\"AuthMixin.setup\")\n        super().setup(**kwargs)          # forward to next in MRO\n\nclass App(LogMixin, AuthMixin, Base):\n    def setup(self, **kwargs):\n        print(f\"App.setup\")\n        super().setup(**kwargs)\n\napp = App()\napp.setup()\n# App.setup\n# LogMixin.setup\n# AuthMixin.setup\n# Base.setup      ← everyone ran!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rules for cooperative MI:** 1. Every class must call `super().method()` — even if it seems like the \"top\". 2. Use `**kwargs` to pass through arguments you don't consume, so classes further in the MRO can receive theirs. 3. The root class (often `object` or a custom base) terminates the chain by **not** calling `super()`. 4. Never hard-code a parent class name — always use `super()`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Using **kwargs for forwarding\nclass A:\n    def __init__(self, **kwargs):\n        print(f\"A: {kwargs}\")\n\nclass B(A):\n    def __init__(self, x=0, **kwargs):\n        self.x = x\n        super().__init__(**kwargs)       # pass remaining kwargs up\n\nclass C(A):\n    def __init__(self, y=0, **kwargs):\n        self.y = y\n        super().__init__(**kwargs)\n\nclass D(B, C):\n    def __init__(self, **kwargs):\n        super().__init__(**kwargs)\n\nd = D(x=1, y=2)    # B takes x, C takes y, A gets {}",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is the Mixin pattern? Rules for writing mixins?",
   "terms": [
    "mixin",
    "(or a cooperative one with",
    "No instance state of their own",
    "Name them with a Mixin suffix",
    "Call super()",
    "Place mixins first"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** A **mixin** is a small, focused class that provides a specific piece of reusable functionality to be \"mixed in\" to other classes via multiple inheritance. Mixins are not meant to be instantiated on their own."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import json\n\nclass JsonMixin:\n    \"\"\"Mixin: adds JSON serialization capability.\"\"\"\n    def to_json(self):\n        return json.dumps(self.__dict__, default=str)\n\n    @classmethod\n    def from_json(cls, json_str):\n        return cls(**json.loads(json_str))\n\nclass ReprMixin:\n    \"\"\"Mixin: adds a generic __repr__.\"\"\"\n    def __repr__(self):\n        attrs = \", \".join(f\"{k}={v!r}\" for k, v in self.__dict__.items())\n        return f\"{self.__class__.__name__}({attrs})\"\n\nclass User(JsonMixin, ReprMixin):\n    def __init__(self, name: str, age: int):\n        self.name = name\n        self.age = age\n\nu = User(\"Alice\", 30)\nprint(u)                    # User(name='Alice', age=30)\nprint(u.to_json())          # {\"name\": \"Alice\", \"age\": 30}\nu2 = User.from_json('{\"name\": \"Bob\", \"age\": 25}')\nprint(u2)                   # User(name='Bob', age=25)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rules for writing good mixins:** 1. **Single responsibility** — each mixin adds exactly one capability. 2. **No `__init__`** (or a cooperative one with `**kwargs`) — don't require constructor args. 3. **No instance state of their own** — rely on the host class's state. 4. **Name them with a `Mixin` suffix** — e.g., `JsonMixin`, `LogMixin`. 5. **Call `super()`** if overriding methods that might be in the MRO. 6. **Place mixins first** in the base list: `class Foo(MixinA, MixinB, Base)`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "`isinstance()` vs `type()` — why prefer `isinstance`?",
   "terms": [
    "exact",
    "or any of its subclasses",
    "When type() is appropriate",
    "not",
    "Note",
    "duck typing"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** `type(obj)` returns the **exact** class. `isinstance(obj, cls)` checks if `obj` is an instance of `cls` **or any of its subclasses**. This makes `isinstance` inheritance-aware and is almost always the correct choice."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Animal:\n    pass\n\nclass Dog(Animal):\n    pass\n\nd = Dog()\n\n# type() — exact match only\nprint(type(d) == Dog)       # True\nprint(type(d) == Animal)    # False  ← misses inheritance!\n\n# isinstance() — checks entire inheritance chain\nprint(isinstance(d, Dog))      # True\nprint(isinstance(d, Animal))   # True  ← inheritance-aware\nprint(isinstance(d, object))   # True\n\n# isinstance also accepts a tuple of types\nprint(isinstance(42, (int, float)))   # True\n\n# Real-world implication:\ndef process(animal):\n    if type(animal) == Animal:      # BAD — Dog won't match\n        print(\"Processing animal\")\n    if isinstance(animal, Animal):  # GOOD — Dog matches too\n        print(\"Processing animal\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When `type()` is appropriate:** - When you need to distinguish exact types (rare). - In metaclass programming or debugging. - When checking that something is **not** a subclass: `type(x) is int` (not `bool`, which is a subclass of `int`)."
    },
    {
     "t": "p",
     "text": "**Note:** In modern Python, prefer **duck typing** or `Protocol` over `isinstance` checks when possible."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What makes an object hashable? What's the relationship between `__hash__` and `__eq__`?",
   "terms": [
    "hashable",
    "Key rules",
    "not"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** An object is **hashable** if it has a `__hash__` method and its hash value never changes during its lifetime. Hashable objects can be used as dictionary keys and set members. Python has a critical invariant: **objects that compare equal must have the same hash**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Point:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n\n    def __eq__(self, other):\n        if not isinstance(other, Point):\n            return NotImplemented\n        return self.x == other.x and self.y == other.y\n\n    def __hash__(self):\n        return hash((self.x, self.y))    # must be consistent with __eq__\n\n    def __repr__(self):\n        return f\"Point({self.x}, {self.y})\"\n\np1 = Point(1, 2)\np2 = Point(1, 2)\n\nprint(p1 == p2)            # True\nprint(hash(p1) == hash(p2))  # True — required by the invariant\nprint({p1, p2})             # {Point(1, 2)} — deduplicated in set",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key rules:** 1. If you define `__eq__`, Python **automatically sets `__hash__` to `None`**, making the object unhashable. You must explicitly define `__hash__`. 2. `a == b` implies `hash(a) == hash(b)` (but not the reverse). 3. Mutable objects should generally **not** be hashable — if attributes used in `__eq__` change, the hash changes, breaking sets/dicts. 4. By default (no `__eq__`), objects use `id()` for both equality and hashing."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Without __hash__, defining __eq__ makes object unhashable:\nclass Bad:\n    def __eq__(self, other):\n        return True\n\n# {Bad()}  → TypeError: unhashable type: 'Bad'",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "How do you make a class iterable? (`__iter__` and `__next__`)",
   "terms": [
    "iterator protocol",
    "Shortcut"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** To make a class iterable, implement the **iterator protocol**: `__iter__` (returns the iterator object) and `__next__` (returns the next value or raises `StopIteration`). If the class is its own iterator, `__iter__` returns `self`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Countdown:\n    \"\"\"An iterable that counts down from n to 1.\"\"\"\n    def __init__(self, n):\n        self.n = n\n\n    def __iter__(self):\n        self.current = self.n    # reset state for each iteration\n        return self              # this object is its own iterator\n\n    def __next__(self):\n        if self.current <= 0:\n            raise StopIteration\n        val = self.current\n        self.current -= 1\n        return val\n\nfor num in Countdown(5):\n    print(num, end=\" \")    # 5 4 3 2 1\n\n# Works with list(), sum(), etc.\nprint(list(Countdown(3)))  # [3, 2, 1]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Better approach — separate iterator from iterable:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Range:\n    \"\"\"Iterable (can be iterated multiple times).\"\"\"\n    def __init__(self, start, end):\n        self.start = start\n        self.end = end\n\n    def __iter__(self):\n        return RangeIterator(self.start, self.end)  # new iterator each time\n\nclass RangeIterator:\n    \"\"\"Iterator (tracks position).\"\"\"\n    def __init__(self, current, end):\n        self.current = current\n        self.end = end\n\n    def __iter__(self):\n        return self\n\n    def __next__(self):\n        if self.current >= self.end:\n            raise StopIteration\n        val = self.current\n        self.current += 1\n        return val\n\nr = Range(1, 4)\nprint(list(r))   # [1, 2, 3]\nprint(list(r))   # [1, 2, 3] — works again (new iterator each time)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Shortcut:** Use a generator in `__iter__` to avoid writing a separate iterator class:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Range:\n    def __init__(self, start, end):\n        self.start, self.end = start, end\n\n    def __iter__(self):\n        current = self.start\n        while current < self.end:\n            yield current\n            current += 1",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Explain the container protocol (`__len__`, `__getitem__`, `__contains__`).",
   "body": [
    {
     "t": "p",
     "text": "**A:** The container protocol lets your class behave like a built-in container (list, dict, etc.):"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Triggered by",
      "Purpose"
     ],
     "rows": [
      [
       "`__len__`",
       "`len(obj)`",
       "Return number of items"
      ],
      [
       "`__getitem__`",
       "`obj[key]`",
       "Access by index/key"
      ],
      [
       "`__setitem__`",
       "`obj[key] = val`",
       "Set by index/key"
      ],
      [
       "`__delitem__`",
       "`del obj[key]`",
       "Delete by index/key"
      ],
      [
       "`__contains__`",
       "`item in obj`",
       "Membership test"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Deck:\n    SUITS = \"♠♥♦♣\"\n    RANKS = \"2 3 4 5 6 7 8 9 10 J Q K A\".split()\n\n    def __init__(self):\n        self._cards = [\n            f\"{r}{s}\" for s in self.SUITS for r in self.RANKS\n        ]\n\n    def __len__(self):\n        return len(self._cards)\n\n    def __getitem__(self, index):\n        return self._cards[index]       # supports slicing too!\n\n    def __contains__(self, card):\n        return card in self._cards\n\ndeck = Deck()\nprint(len(deck))           # 52\nprint(deck[0])             # 2♠\nprint(deck[-1])            # A♣\nprint(deck[:3])            # ['2♠', '3♠', '4♠']  — slicing works!\nprint(\"A♠\" in deck)        # True   — __contains__\n\n# Bonus: __getitem__ makes the object iterable (fallback protocol)\nfor card in deck[:5]:\n    print(card, end=\" \")   # 2♠ 3♠ 4♠ 5♠ 6♠",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Notes:** - If `__contains__` is not defined, `in` falls back to iterating via `__iter__` or `__getitem__`. - If `__iter__` is not defined, Python falls back to calling `__getitem__` with indices 0, 1, 2, ... until `IndexError`. - Implement `__len__` for truthiness: `bool(obj)` calls `__len__` if `__bool__` is not defined."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "How do context managers work? (`__enter__` / `__exit__`)",
   "body": [
    {
     "t": "p",
     "text": "**A:** A context manager implements the `__enter__` and `__exit__` methods and is used with the `with` statement. `__enter__` sets up the resource and its return value is bound to the `as` variable. `__exit__` handles cleanup and optionally suppresses exceptions."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class FileManager:\n    def __init__(self, filename, mode):\n        self.filename = filename\n        self.mode = mode\n        self.file = None\n\n    def __enter__(self):\n        self.file = open(self.filename, self.mode)\n        return self.file                     # bound to `as` variable\n\n    def __exit__(self, exc_type, exc_val, exc_tb):\n        if self.file:\n            self.file.close()\n        # Return False (or None) to propagate exceptions\n        # Return True to suppress them\n        return False\n\nwith FileManager(\"test.txt\", \"w\") as f:\n    f.write(\"Hello!\")\n# f is automatically closed here, even if an exception occurred\n\n# Practical: timing context manager\nimport time\n\nclass Timer:\n    def __enter__(self):\n        self.start = time.perf_counter()\n        return self\n\n    def __exit__(self, *args):\n        self.elapsed = time.perf_counter() - self.start\n        print(f\"Elapsed: {self.elapsed:.4f}s\")\n        return False\n\nwith Timer() as t:\n    sum(range(1_000_000))\n# Elapsed: 0.0312s\n\n# Simpler alternative using contextlib:\nfrom contextlib import contextmanager\n\n@contextmanager\ndef timer():\n    start = time.perf_counter()\n    yield                           # code inside `with` block runs here\n    elapsed = time.perf_counter() - start\n    print(f\"Elapsed: {elapsed:.4f}s\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**`__exit__` parameters:** `exc_type`, `exc_val`, `exc_tb` are `None` if no exception occurred. If an exception occurred, returning `True` suppresses it; returning `False` lets it propagate."
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "`__new__` vs `__init__` — when to use `__new__`?",
   "terms": [
    "creates",
    "initialises",
    "before",
    "instance creation"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** `__new__` **creates** the instance (allocates memory), while `__init__` **initialises** it (sets attributes). `__new__` is called **before** `__init__` and must return the instance. In most cases, you only need `__init__`. Override `__new__` when you need to control **instance creation** itself."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Normal:\n    def __init__(self, value):\n        self.value = value           # initialise — instance already exists\n\n# __new__ is needed for:\n# 1. Subclassing immutable types\nclass UpperStr(str):\n    def __new__(cls, value):\n        # str is immutable — must set value in __new__\n        instance = super().__new__(cls, value.upper())\n        return instance\n\ns = UpperStr(\"hello\")\nprint(s)             # HELLO\nprint(isinstance(s, str))  # True\n\n# 2. Singleton pattern\nclass Singleton:\n    _instance = None\n\n    def __new__(cls, *args, **kwargs):\n        if cls._instance is None:\n            cls._instance = super().__new__(cls)\n        return cls._instance\n\n    def __init__(self, value):\n        self.value = value\n\na = Singleton(1)\nb = Singleton(2)\nprint(a is b)        # True  — same instance\nprint(a.value)       # 2     — __init__ ran again on same instance",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use `__new__`:** - Subclassing **immutable** types (`str`, `int`, `tuple`, `frozenset`). - Implementing **Singleton** or **object pooling**. - **Metaclass** programming. - Controlling whether `__init__` runs (return a different type to skip it)."
    },
    {
     "t": "p",
     "text": "**Flow:** `cls.__new__(cls)` → creates instance → if instance is of type `cls` → `instance.__init__()` runs."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "Explain `__getattr__` vs `__getattribute__`.",
   "terms": [
    "every",
    "fails",
    "Pitfalls",
    "never"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** Both intercept attribute access, but at different levels:"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "When Called",
      "Use Case"
     ],
     "rows": [
      [
       "`__getattribute__`",
       "On **every** attribute access",
       "Low-level hook, rarely overridden"
      ],
      [
       "`__getattr__`",
       "Only when normal lookup **fails**",
       "Fallback for missing attributes"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Proxy:\n    def __init__(self, data: dict):\n        self._data = data\n\n    def __getattr__(self, name):\n        \"\"\"Called only when attribute is NOT found normally.\"\"\"\n        print(f\"__getattr__ called for '{name}'\")\n        if name in self._data:\n            return self._data[name]\n        raise AttributeError(f\"No attribute '{name}'\")\n\np = Proxy({\"x\": 10, \"y\": 20})\nprint(p._data)      # found normally — __getattr__ NOT called\nprint(p.x)          # __getattr__ called for 'x' → 10\n# print(p.z)        # AttributeError: No attribute 'z'",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Logged:\n    def __init__(self, x):\n        self.x = x\n\n    def __getattribute__(self, name):\n        \"\"\"Called on EVERY attribute access, including self.x in __init__.\"\"\"\n        print(f\"Accessing '{name}'\")\n        return super().__getattribute__(name)  # MUST call super to avoid recursion!\n\nobj = Logged(42)\nprint(obj.x)\n# Accessing 'x'\n# 42",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Pitfalls:** - In `__getattribute__`, **never** access `self.anything` directly — it causes infinite recursion. Always use `super().__getattribute__()` or `object.__getattribute__(self, name)`. - `__getattr__` is safe from recursion because it's only called as a fallback. - `__getattr__` is commonly used for delegation, lazy loading, and proxy patterns."
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "How does `__iadd__` (`+=`) work differently from `__add__`?",
   "terms": [
    "new",
    "in-place",
    "Comparison with built-in types",
    "Rule"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** `__add__` (`+`) creates and returns a **new** object. `__iadd__` (`+=`) is the **in-place** version — it modifies and returns `self` (for mutable types) or creates a new object (for immutable types). If `__iadd__` is not defined, `+=` falls back to `__add__`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class MutableList:\n    def __init__(self, items):\n        self.items = list(items)\n\n    def __add__(self, other):\n        \"\"\"a + b → returns NEW object.\"\"\"\n        return MutableList(self.items + other.items)\n\n    def __iadd__(self, other):\n        \"\"\"a += b → modifies a IN-PLACE, returns self.\"\"\"\n        self.items.extend(other.items)\n        return self                     # MUST return self\n\n    def __repr__(self):\n        return f\"MutableList({self.items})\"\n\na = MutableList([1, 2])\nb = MutableList([3, 4])\n\nc = a + b           # __add__ — new object\nprint(c)             # MutableList([1, 2, 3, 4])\nprint(a)             # MutableList([1, 2]) — unchanged\n\nold_id = id(a)\na += b               # __iadd__ — in-place\nprint(a)             # MutableList([1, 2, 3, 4])\nprint(id(a) == old_id)  # True — same object!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Comparison with built-in types:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# list (mutable) — += modifies in-place\nlst = [1, 2]\nold_id = id(lst)\nlst += [3]\nprint(id(lst) == old_id)  # True — same object\n\n# tuple (immutable) — += creates new object (no __iadd__)\ntup = (1, 2)\nold_id = id(tup)\ntup += (3,)\nprint(id(tup) == old_id)  # False — new object\n\n# str (immutable) — same as tuple\ns = \"hello\"\nold_id = id(s)\ns += \" world\"\nprint(id(s) == old_id)    # False — new object",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rule:** `x += y` → try `x = x.__iadd__(y)` → if `NotImplemented` or not defined → fall back to `x = x.__add__(y)`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What are descriptors? Data vs non-data descriptor.",
   "terms": [
    "descriptor",
    "owner class",
    "Data descriptor",
    "Non-data descriptor",
    "Lookup priority (for obj.attr)"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** A **descriptor** is any object that defines `__get__`, `__set__`, or `__delete__`. Descriptors control attribute access on the **owner class**. They power `@property`, `@classmethod`, `@staticmethod`, and method binding."
    },
    {
     "t": "table",
     "head": [
      "Type",
      "Methods Defined",
      "Priority"
     ],
     "rows": [
      [
       "**Data descriptor**",
       "`__get__` + `__set__` (and/or `__delete__`)",
       "Higher than instance `__dict__`"
      ],
      [
       "**Non-data descriptor**",
       "`__get__` only",
       "Lower than instance `__dict__`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Data descriptor — has both __get__ and __set__\nclass Validated:\n    def __init__(self, min_val, max_val):\n        self.min_val = min_val\n        self.max_val = max_val\n\n    def __set_name__(self, owner, name):\n        self.name = name                    # auto-called in Python 3.6+\n\n    def __get__(self, obj, objtype=None):\n        if obj is None:\n            return self                     # class-level access\n        return obj.__dict__.get(self.name, None)\n\n    def __set__(self, obj, value):\n        if not self.min_val <= value <= self.max_val:\n            raise ValueError(f\"{self.name} must be between {self.min_val} and {self.max_val}\")\n        obj.__dict__[self.name] = value\n\nclass Student:\n    age = Validated(0, 150)                 # descriptor instance\n    grade = Validated(0, 100)\n\ns = Student()\ns.age = 20        # __set__ with validation\ns.grade = 95\nprint(s.age)       # 20 — __get__\n# s.age = -1       # ValueError!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Lookup priority (for `obj.attr`):** 1. Data descriptor on the class → `__get__` 2. Instance `__dict__` 3. Non-data descriptor on the class → `__get__`"
    },
    {
     "t": "p",
     "text": "This explains why `@property` (data descriptor) overrides instance `__dict__`, but regular methods (non-data descriptors, only `__get__`) don't."
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is a metaclass? When would you use one?",
   "terms": [
    "metaclass",
    "class creation",
    "When to use metaclasses",
    "Framework code",
    "Class registration",
    "Validation"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** A **metaclass** is the \"class of a class.\" Just as an object is an instance of a class, a class is an instance of a metaclass. The default metaclass is `type`. By defining a custom metaclass, you can control **class creation** — modify class attributes, enforce rules, register classes, etc."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# type is the default metaclass\nprint(type(int))          # <class 'type'>\nprint(type(type))         # <class 'type'> — type is its own metaclass\n\n# Custom metaclass\nclass UpperAttrMeta(type):\n    \"\"\"Metaclass that uppercases all non-dunder attributes.\"\"\"\n    def __new__(mcs, name, bases, namespace):\n        uppercase_attrs = {}\n        for key, val in namespace.items():\n            if not key.startswith(\"__\"):\n                uppercase_attrs[key.upper()] = val\n            else:\n                uppercase_attrs[key] = val\n        return super().__new__(mcs, name, bases, uppercase_attrs)\n\nclass Config(metaclass=UpperAttrMeta):\n    host = \"localhost\"\n    port = 8080\n\nprint(Config.HOST)        # localhost  — attribute was uppercased\nprint(Config.PORT)        # 8080\n# print(Config.host)      # AttributeError — 'host' no longer exists",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use metaclasses:** - **Framework code** — ORMs (Django models), serialisation frameworks. - **Class registration** — auto-registering subclasses in a registry. - **Validation** — enforcing that subclasses implement certain methods. - **Singleton** enforcement at the class level."
    },
    {
     "t": "p",
     "text": "**Rule of thumb:** \"Metaclasses are deeper magic than 99% of users should ever worry about.\" — Tim Peters. Prefer `__init_subclass__`, decorators, or descriptors when possible."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Class registry with metaclass\nclass PluginMeta(type):\n    registry = {}\n    def __new__(mcs, name, bases, namespace):\n        cls = super().__new__(mcs, name, bases, namespace)\n        if bases:  # skip the base class itself\n            mcs.registry[name] = cls\n        return cls\n\nclass Plugin(metaclass=PluginMeta):\n    pass\n\nclass PDFPlugin(Plugin): pass\nclass CSVPlugin(Plugin): pass\n\nprint(PluginMeta.registry)  # {'PDFPlugin': <class 'PDFPlugin'>, ...}",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "Explain `__init_subclass__` and when to prefer it over metaclasses.",
   "terms": [
    "parent class",
    "Registration",
    "Validation",
    "Parameterised class creation",
    "Modifying the class namespace",
    "Deep framework magic"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** `__init_subclass__` is a hook (introduced in Python 3.6) that is called on the **parent class** whenever a new subclass is created. It's a simpler alternative to metaclasses for most use cases like validation, registration, and configuration."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Plugin:\n    _registry = {}\n\n    def __init_subclass__(cls, plugin_name=None, **kwargs):\n        super().__init_subclass__(**kwargs)\n        name = plugin_name or cls.__name__\n        Plugin._registry[name] = cls\n        print(f\"Registered plugin: {name}\")\n\nclass PDFPlugin(Plugin, plugin_name=\"pdf\"):\n    pass\n\nclass CSVPlugin(Plugin):         # uses class name as default\n    pass\n\nprint(Plugin._registry)\n# {'pdf': <class 'PDFPlugin'>, 'CSVPlugin': <class 'CSVPlugin'>}",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Validation: enforce that subclasses define a required attribute\nclass Serializable:\n    def __init_subclass__(cls, **kwargs):\n        super().__init_subclass__(**kwargs)\n        if not hasattr(cls, \"serializer_version\"):\n            raise TypeError(\n                f\"{cls.__name__} must define 'serializer_version'\"\n            )\n\nclass UserSerializer(Serializable):\n    serializer_version = 1         # OK\n\n# class BadSerializer(Serializable):  # TypeError!\n#     pass",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to prefer `__init_subclass__` over metaclasses:** - **Registration** of subclasses → `__init_subclass__` - **Validation** of subclass attributes → `__init_subclass__` - **Parameterised class creation** (keyword args in class definition) → `__init_subclass__` - **Modifying the class namespace** or controlling `__new__` → metaclass - **Deep framework magic** (ORMs, etc.) → metaclass"
    },
    {
     "t": "p",
     "text": "`__init_subclass__` is easier to understand, composes well with inheritance, and avoids metaclass conflicts."
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What are `__slots__`? Memory benefits and trade-offs.",
   "terms": [
    "Benefits",
    "Trade-offs"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** `__slots__` replaces the per-instance `__dict__` with a fixed set of attribute slots, reducing memory usage significantly (especially with millions of instances) and slightly speeding up attribute access."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\n\nclass WithDict:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n\nclass WithSlots:\n    __slots__ = (\"x\", \"y\")\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n\nd = WithDict(1, 2)\ns = WithSlots(1, 2)\n\nprint(sys.getsizeof(d) + sys.getsizeof(d.__dict__))  # ~152 bytes\nprint(sys.getsizeof(s))                                # ~56 bytes\n\n# No __dict__ means no dynamic attributes:\n# s.z = 3     # AttributeError: 'WithSlots' object has no attribute 'z'",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Benefits:** - ~40-60% memory reduction per instance. - Faster attribute access (direct offset instead of dict lookup). - Prevents accidental attribute creation (catches typos)."
    },
    {
     "t": "p",
     "text": "**Trade-offs:** - Cannot add attributes dynamically (unless you include `\"__dict__\"` in `__slots__`). - Cannot use `__dict__`-based serialization (e.g., `vars(obj)`). - Subclasses must also define `__slots__`, or they'll get `__dict__` back. - Multiple inheritance with different `__slots__` can be tricky. - Cannot use default values in `__slots__` (use `__init__`)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Slots + inheritance\nclass Base:\n    __slots__ = (\"x\",)\n\nclass Child(Base):\n    __slots__ = (\"y\",)          # only new attributes; x is inherited\n\nc = Child()\nc.x = 1\nc.y = 2\n# c.z = 3  # AttributeError",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "`@dataclass` — what does it auto-generate? Explain `frozen`, `slots`, `field()`.",
   "terms": [
    "Auto-generated methods",
    "field() for advanced defaults",
    "field() parameters"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** `@dataclass` (from `dataclasses` module) auto-generates boilerplate methods based on class annotations. It's the Pythonic way to create data-holding classes."
    },
    {
     "t": "p",
     "text": "**Auto-generated methods:**"
    },
    {
     "t": "table",
     "head": [
      "Parameter",
      "Generates"
     ],
     "rows": [
      [
       "`init=True`",
       "`__init__`"
      ],
      [
       "`repr=True`",
       "`__repr__`"
      ],
      [
       "`eq=True`",
       "`__eq__` (and sets `__hash__` to `None`)"
      ],
      [
       "`order=False`",
       "`__lt__`, `__le__`, `__gt__`, `__ge__`"
      ],
      [
       "`frozen=False`",
       "Makes instances immutable (`__setattr__`, `__delattr__`)"
      ],
      [
       "`slots=False` (3.10+)",
       "Adds `__slots__`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from dataclasses import dataclass, field\nfrom typing import ClassVar\n\n@dataclass(frozen=True, slots=True, order=True)\nclass Point:\n    x: float\n    y: float\n    label: str = \"origin\"           # default value\n\n    # ClassVar is excluded from __init__ and other methods\n    dimension: ClassVar[int] = 2\n\np1 = Point(1.0, 2.0)\np2 = Point(1.0, 2.0)\np3 = Point(3.0, 4.0, \"top-right\")\n\nprint(p1)                  # Point(x=1.0, y=2.0, label='origin')\nprint(p1 == p2)            # True  (auto __eq__)\nprint(p1 < p3)             # True  (auto __lt__, compares field by field)\nprint(hash(p1))            # works because frozen=True makes it hashable\n# p1.x = 5                 # FrozenInstanceError — immutable",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**`field()` for advanced defaults:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from dataclasses import dataclass, field\n\n@dataclass\nclass Student:\n    name: str\n    grades: list[int] = field(default_factory=list)    # mutable default\n    _id: int = field(init=False, repr=False)            # excluded from __init__\n    school: str = field(default=\"MIT\", compare=False)   # excluded from __eq__\n\n    def __post_init__(self):\n        self._id = id(self)\n\ns = Student(\"Alice\")\ns.grades.append(95)\nprint(s)    # Student(name='Alice', grades=[95], school='MIT')",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**`field()` parameters:** `default`, `default_factory`, `init`, `repr`, `compare`, `hash`, `metadata`, `kw_only` (3.10+)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "`__post_init__` in dataclasses — use cases.",
   "body": [
    {
     "t": "p",
     "text": "**A:** `__post_init__` is called automatically **after** the auto-generated `__init__` completes. It's the place for validation, computed fields, and any post-construction logic."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from dataclasses import dataclass, field\nimport math\n\n@dataclass\nclass Circle:\n    radius: float\n    area: float = field(init=False)         # computed, not in __init__\n\n    def __post_init__(self):\n        if self.radius <= 0:\n            raise ValueError(\"Radius must be positive\")\n        self.area = math.pi * self.radius ** 2\n\nc = Circle(5)\nprint(c)        # Circle(radius=5, area=78.5398...)\n# Circle(-1)    # ValueError!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use cases for `__post_init__`:** 1. **Validation** — check constraints after all fields are set. 2. **Computed fields** — derive values from other fields. 3. **Type coercion** — convert strings to proper types. 4. **Registering** the instance somewhere."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from dataclasses import dataclass, InitVar\n\n@dataclass\nclass User:\n    name: str\n    password: InitVar[str]        # passed to __init__ but NOT stored as field\n    password_hash: str = field(init=False)\n\n    def __post_init__(self, password: str):\n        import hashlib\n        self.password_hash = hashlib.sha256(password.encode()).hexdigest()\n\nu = User(\"Alice\", \"secret123\")\nprint(u)             # User(name='Alice', password_hash='...')\n# u.password         # AttributeError — InitVar is not stored",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`InitVar[T]` fields are passed to `__init__` and forwarded to `__post_init__`, but are **not** stored as instance attributes or included in `__repr__`, `__eq__`, etc. This is ideal for processing intermediate data."
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "ABC vs Protocol — nominal vs structural typing.",
   "terms": [
    "Typing style",
    "Runtime check",
    "Enforcement",
    "Module",
    "When to use which",
    "ABC"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** Both define interfaces, but they follow different type-checking philosophies:"
    },
    {
     "t": "table",
     "head": [
      "",
      "`ABC` (Abstract Base Class)",
      "`Protocol`"
     ],
     "rows": [
      [
       "**Typing style**",
       "Nominal — must explicitly inherit",
       "Structural — just implement the methods"
      ],
      [
       "**Runtime check**",
       "`isinstance()` works by default",
       "Needs `@runtime_checkable`"
      ],
      [
       "**Enforcement**",
       "`TypeError` if abstract methods not implemented",
       "Type checker only (mypy/pyright)"
      ],
      [
       "**Module**",
       "`abc`",
       "`typing`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from abc import ABC, abstractmethod\nfrom typing import Protocol, runtime_checkable\n\n# ABC — nominal typing: must inherit\nclass Drawable(ABC):\n    @abstractmethod\n    def draw(self) -> str: ...\n\nclass Circle(Drawable):          # explicit inheritance\n    def draw(self) -> str:\n        return \"Drawing circle\"\n\n# c = Drawable()                 # TypeError: Can't instantiate abstract class\nc = Circle()\nprint(isinstance(c, Drawable))   # True\n\n# Protocol — structural typing: just implement the method\n@runtime_checkable\nclass Renderable(Protocol):\n    def render(self) -> str: ...\n\nclass Button:                    # NO inheritance from Renderable\n    def render(self) -> str:\n        return \"Rendering button\"\n\nb = Button()\nprint(isinstance(b, Renderable))  # True — structural match!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use which:** - **ABC** — when you want to enforce a contract and raise errors at instantiation time. - **Protocol** — when you want duck typing with static type checker support, without requiring inheritance (more Pythonic). - **Protocol** is preferred in modern Python for loose coupling and better composition."
    }
   ]
  },
  {
   "t": "drill",
   "n": "31",
   "q": "`@abstractmethod` — can you instantiate an ABC?",
   "terms": [
    "cannot",
    "all",
    "ABCs"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** No, you **cannot** instantiate a class that has unimplemented abstract methods. Python raises `TypeError` at instantiation time (not at class definition time). A subclass must implement **all** abstract methods to be instantiable."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from abc import ABC, abstractmethod\n\nclass Shape(ABC):\n    @abstractmethod\n    def area(self) -> float:\n        \"\"\"Subclasses must implement this.\"\"\"\n        ...\n\n    @abstractmethod\n    def perimeter(self) -> float:\n        ...\n\n    def describe(self):\n        \"\"\"Concrete method — inherited as-is.\"\"\"\n        return f\"{self.__class__.__name__}: area={self.area():.2f}\"\n\n# shape = Shape()   # TypeError: Can't instantiate abstract class Shape\n                     # with abstract methods area, perimeter\n\nclass Circle(Shape):\n    def __init__(self, radius):\n        self.radius = radius\n\n    def area(self):\n        import math\n        return math.pi * self.radius ** 2\n\n    def perimeter(self):\n        import math\n        return 2 * math.pi * self.radius\n\nc = Circle(5)\nprint(c.describe())   # Circle: area=78.54\n\n# Partial implementation — still can't instantiate\nclass Incomplete(Shape):\n    def area(self):\n        return 0\n    # perimeter not implemented!\n\n# Incomplete()  # TypeError: Can't instantiate abstract class Incomplete\n                 # with abstract method perimeter",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**You can also make abstract properties, class methods, and static methods:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from abc import ABC, abstractmethod\n\nclass Base(ABC):\n    @property\n    @abstractmethod\n    def name(self) -> str: ...\n\n    @classmethod\n    @abstractmethod\n    def create(cls) -> \"Base\": ...\n\n    @staticmethod\n    @abstractmethod\n    def validate(value) -> bool: ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Note:** ABCs **can** have concrete methods with implementations. Abstract methods can also have a body that serves as a default implementation — subclasses can call it via `super()`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is `@runtime_checkable` Protocol?",
   "terms": [
    "static",
    "method/attribute existence",
    "Limitations of @runtime_checkable",
    "presence",
    "signatures"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** By default, `Protocol` classes only work with **static** type checkers (mypy, pyright). Adding `@runtime_checkable` enables `isinstance()` and `issubclass()` checks at runtime. However, runtime checks only verify **method/attribute existence**, not signatures or return types."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Protocol, runtime_checkable\n\n@runtime_checkable\nclass Closeable(Protocol):\n    def close(self) -> None: ...\n\nclass Connection:\n    def close(self) -> None:\n        print(\"Connection closed\")\n\nclass FileWrapper:\n    def close(self) -> None:\n        print(\"File closed\")\n\nclass NotCloseable:\n    pass\n\n# Runtime isinstance checks work:\nconn = Connection()\nprint(isinstance(conn, Closeable))          # True\nprint(isinstance(FileWrapper(), Closeable)) # True\nprint(isinstance(NotCloseable(), Closeable))# False\nprint(isinstance(open(__file__), Closeable))# True — file objects have .close()\n\n# Useful for generic processing:\ndef cleanup(resources: list):\n    for r in resources:\n        if isinstance(r, Closeable):\n            r.close()\n\ncleanup([Connection(), FileWrapper(), \"not closeable\"])",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Limitations of `@runtime_checkable`:** 1. Only checks **presence** of methods/attributes, not their **signatures**. 2. Does not verify return types or argument types. 3. Cannot check non-method protocol members reliably. 4. Slower than regular `isinstance()` — uses `__subclasshook__`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@runtime_checkable\nclass Adder(Protocol):\n    def add(self, x: int, y: int) -> int: ...\n\nclass Wrong:\n    def add(self):       # wrong signature, but passes isinstance!\n        pass\n\nprint(isinstance(Wrong(), Adder))   # True — only checks method name exists",
     "numbered": false
    },
    {
     "t": "p",
     "text": "For full correctness, rely on static type checkers (mypy/pyright) alongside `@runtime_checkable`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "33",
   "q": "How do you make a class immutable?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Python doesn't have a built-in \"immutable class\" keyword, but there are several strategies:"
    },
    {
     "t": "p",
     "text": "**Way 1: `@dataclass(frozen=True)` — recommended**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from dataclasses import dataclass\n\n@dataclass(frozen=True)\nclass Point:\n    x: float\n    y: float\n\np = Point(1, 2)\n# p.x = 5          # FrozenInstanceError\nprint(hash(p))     # hashable because it's frozen",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Way 2: Override `__setattr__` and `__delattr__`**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Immutable:\n    def __init__(self, x, y):\n        object.__setattr__(self, \"x\", x)   # bypass our __setattr__\n        object.__setattr__(self, \"y\", y)\n\n    def __setattr__(self, name, value):\n        raise AttributeError(\"Cannot modify immutable object\")\n\n    def __delattr__(self, name):\n        raise AttributeError(\"Cannot delete from immutable object\")\n\n    def __repr__(self):\n        return f\"Immutable(x={self.x}, y={self.y})\"\n\nobj = Immutable(1, 2)\n# obj.x = 5           # AttributeError\n# del obj.x            # AttributeError",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Way 3: `__slots__` + `frozen=True` for maximum efficiency**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from dataclasses import dataclass\n\n@dataclass(frozen=True, slots=True)    # Python 3.10+\nclass Config:\n    host: str\n    port: int\n    debug: bool = False\n\nc = Config(\"localhost\", 8080)\n# c.host = \"remote\"   # FrozenInstanceError",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Way 4: Named tuples (inherently immutable)**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import NamedTuple\n\nclass Color(NamedTuple):\n    r: int\n    g: int\n    b: int\n\nred = Color(255, 0, 0)\n# red.r = 128         # AttributeError — tuples are immutable",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "34",
   "q": "Explain method chaining — how to implement it.",
   "body": [
    {
     "t": "p",
     "text": "**A:** Method chaining is a technique where each method returns `self`, allowing multiple method calls to be chained in a single expression. It creates a fluent API."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class HTMLBuilder:\n    def __init__(self):\n        self._parts = []\n\n    def add_heading(self, text: str, level: int = 1):\n        self._parts.append(f\"<h{level}>{text}</h{level}>\")\n        return self         # KEY: return self for chaining\n\n    def add_paragraph(self, text: str):\n        self._parts.append(f\"<p>{text}</p>\")\n        return self\n\n    def add_image(self, src: str, alt: str = \"\"):\n        self._parts.append(f'<img src=\"{src}\" alt=\"{alt}\" />')\n        return self\n\n    def add_list(self, items: list[str]):\n        li = \"\".join(f\"<li>{item}</li>\" for item in items)\n        self._parts.append(f\"<ul>{li}</ul>\")\n        return self\n\n    def build(self) -> str:\n        return \"\\n\".join(self._parts)\n\n# Fluent interface via chaining\nhtml = (\n    HTMLBuilder()\n    .add_heading(\"Welcome\")\n    .add_paragraph(\"This is a demo.\")\n    .add_image(\"photo.jpg\", \"A photo\")\n    .add_list([\"Item 1\", \"Item 2\", \"Item 3\"])\n    .build()\n)\nprint(html)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Type hinting for chaining (using `Self`):**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Self     # Python 3.11+\n\nclass Chainable:\n    def step_a(self) -> Self:\n        print(\"Step A\")\n        return self\n\n    def step_b(self) -> Self:\n        print(\"Step B\")\n        return self",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Common examples of chaining in Python:** - Pandas: `df.dropna().groupby(\"col\").mean()` - SQLAlchemy: `session.query(User).filter(...).order_by(...).limit(10)` - String methods: `\" Hello World \".strip().lower().replace(\" \", \"_\")`"
    }
   ]
  },
  {
   "t": "drill",
   "n": "35",
   "q": "How would you implement a custom dict with dot notation access?",
   "body": [
    {
     "t": "p",
     "text": "**A:** You can create a dict subclass or wrapper that allows attribute-style access (`d.key`) in addition to bracket access (`d[\"key\"]`) by overriding `__getattr__`, `__setattr__`, and `__delattr__`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class DotDict(dict):\n    \"\"\"Dictionary with dot notation access.\"\"\"\n\n    def __getattr__(self, key):\n        try:\n            value = self[key]\n            # Recursively wrap nested dicts\n            if isinstance(value, dict) and not isinstance(value, DotDict):\n                value = DotDict(value)\n                self[key] = value\n            return value\n        except KeyError:\n            raise AttributeError(f\"No attribute '{key}'\")\n\n    def __setattr__(self, key, value):\n        self[key] = value\n\n    def __delattr__(self, key):\n        try:\n            del self[key]\n        except KeyError:\n            raise AttributeError(f\"No attribute '{key}'\")\n\n# Usage\nconfig = DotDict({\n    \"database\": {\n        \"host\": \"localhost\",\n        \"port\": 5432,\n    },\n    \"debug\": True,\n})\n\nprint(config.debug)             # True\nprint(config.database.host)     # localhost (nested dot access!)\nconfig.database.port = 3306     # set via dot notation\nprint(config[\"database\"][\"port\"])  # 3306 — bracket access still works\n\nconfig.new_key = \"value\"        # dynamic attribute creation\ndel config.new_key",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Using `__getattr__` only (wrapper approach):**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class AttrDict:\n    def __init__(self, data: dict):\n        self.__dict__[\"_data\"] = data\n\n    def __getattr__(self, key):\n        val = self._data[key]\n        return AttrDict(val) if isinstance(val, dict) else val\n\n    def __setattr__(self, key, value):\n        self._data[key] = value\n\n    def __repr__(self):\n        return repr(self._data)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Caveat:** Dot notation can clash with actual dict methods (`keys`, `values`, `items`, `get`, etc.). In the `dict` subclass approach, `config.keys` returns the dict method, not a key named \"keys\". Be mindful of name collisions."
    }
   ]
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is monkey patching? Is it good practice?",
   "terms": [
    "Monkey patching",
    "Is it good practice?",
    "Risks"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** **Monkey patching** is dynamically modifying a class or module at runtime — adding, replacing, or modifying methods/attributes after the class has been defined. Python allows this because classes and modules are mutable objects."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Calculator:\n    def add(self, a, b):\n        return a + b\n\n# Monkey patching — adding a new method at runtime\ndef multiply(self, a, b):\n    return a * b\n\nCalculator.multiply = multiply\n\ncalc = Calculator()\nprint(calc.add(2, 3))       # 5\nprint(calc.multiply(2, 3))  # 6\n\n# Monkey patching — replacing an existing method\noriginal_add = Calculator.add\n\ndef logged_add(self, a, b):\n    result = original_add(self, a, b)\n    print(f\"add({a}, {b}) = {result}\")\n    return result\n\nCalculator.add = logged_add\ncalc.add(2, 3)               # add(2, 3) = 5",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Monkey patching in testing (legitimate use):**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Patching for unit tests\nimport unittest.mock\n\nclass PaymentService:\n    def charge(self, amount):\n        # calls external API\n        pass\n\n# In tests:\nwith unittest.mock.patch.object(PaymentService, \"charge\", return_value=True):\n    service = PaymentService()\n    assert service.charge(100) == True    # no real API call",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Is it good practice?**"
    },
    {
     "t": "table",
     "head": [
      "Use Case",
      "Verdict"
     ],
     "rows": [
      [
       "Testing (mocking)",
       "✅ Acceptable and common"
      ],
      [
       "Hotfixing third-party bugs",
       "⚠️ Use as last resort"
      ],
      [
       "Adding features to third-party classes",
       "❌ Fragile, prefer composition"
      ],
      [
       "Production business logic",
       "❌ Hard to debug, maintain"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Risks:** Code becomes hard to debug (unexpected behaviour), breaks IDE support, can cause subtle bugs when libraries update, violates the principle of least surprise."
    }
   ]
  },
  {
   "t": "drill",
   "n": "37",
   "q": "Composition vs Inheritance — when to prefer which?",
   "terms": [
    "Inheritance",
    "Composition",
    "When to use each",
    "Rule of thumb"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** **Inheritance** models an \"is-a\" relationship (Dog *is-a* Animal). **Composition** models a \"has-a\" relationship (Car *has-a* Engine). The Gang of Four principle: \"Favour composition over inheritance.\""
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Inheritance approach — tight coupling\nclass Animal:\n    def eat(self):\n        return \"eating\"\n\nclass Dog(Animal):\n    def bark(self):\n        return \"woof\"\n\n# Problem: what if you need a RobotDog that barks but doesn't eat?\n# You'd have to override eat() to raise an error — breaks Liskov Substitution.",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Composition approach — loose coupling\nclass Engine:\n    def __init__(self, horsepower: int):\n        self.hp = horsepower\n\n    def start(self):\n        return f\"Engine ({self.hp}hp) started\"\n\nclass GPS:\n    def navigate(self, destination: str):\n        return f\"Navigating to {destination}\"\n\nclass Car:\n    def __init__(self, engine: Engine, gps: GPS = None):\n        self.engine = engine         # has-a Engine\n        self.gps = gps               # has-a GPS (optional)\n\n    def drive(self, destination: str):\n        msg = self.engine.start()\n        if self.gps:\n            msg += f\" | {self.gps.navigate(destination)}\"\n        return msg\n\ncar = Car(Engine(200), GPS())\nprint(car.drive(\"NYC\"))\n# Engine (200hp) started | Navigating to NYC\n\n# Easy to swap components:\nelectric = Car(Engine(300))    # no GPS — no problem",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use each:**"
    },
    {
     "t": "table",
     "head": [
      "Prefer **Inheritance**",
      "Prefer **Composition**"
     ],
     "rows": [
      [
       "True \"is-a\" relationship",
       "\"Has-a\" or \"uses-a\" relationship"
      ],
      [
       "Sharing interface (ABC/Protocol)",
       "Sharing behaviour/functionality"
      ],
      [
       "Small, stable hierarchies",
       "Complex or changing relationships"
      ],
      [
       "Template method pattern",
       "Strategy, observer, decorator patterns"
      ],
      [
       "Framework requires it (e.g., Django views)",
       "Default choice"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Rule of thumb:** If you're inheriting just to reuse code (not to model a true type hierarchy), use composition instead."
    }
   ]
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is duck typing? How does it relate to Protocols?",
   "terms": [
    "behaviour",
    "type",
    "Relationship",
    "Duck typing",
    "Protocol",
    "Contrast with nominal typing (ABC)"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** \"If it walks like a duck and quacks like a duck, it's a duck.\" In duck typing, an object's **behaviour** (methods/attributes it has) matters more than its **type** (class hierarchy). Python is inherently duck-typed — you don't need to inherit from an interface to use an object polymorphically."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Duck typing — no common base class needed\nclass Dog:\n    def speak(self):\n        return \"Woof!\"\n\nclass Cat:\n    def speak(self):\n        return \"Meow!\"\n\nclass Robot:\n    def speak(self):\n        return \"Beep boop!\"\n\ndef make_speak(thing):\n    \"\"\"Works with anything that has a speak() method.\"\"\"\n    print(thing.speak())     # doesn't check type — just calls .speak()\n\nmake_speak(Dog())     # Woof!\nmake_speak(Cat())     # Meow!\nmake_speak(Robot())   # Beep boop!  — Robot is not an Animal, but it works!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Protocols formalise duck typing for static type checkers:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Protocol, runtime_checkable\n\n@runtime_checkable\nclass Speaker(Protocol):\n    def speak(self) -> str: ...\n\ndef make_speak(thing: Speaker):    # type checker knows what's expected\n    print(thing.speak())\n\nmake_speak(Dog())     # ✅ mypy: Dog has .speak() → passes\nmake_speak(Robot())   # ✅ mypy: Robot has .speak() → passes\nmake_speak(\"hello\")   # ❌ mypy: str has no .speak() → error",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Relationship:** - **Duck typing** is the runtime philosophy — \"just call the method.\" - **Protocol** is the static typing formalization of duck typing — \"declare what methods are expected\" without requiring inheritance. - Together, they give you the flexibility of dynamic dispatch with the safety of static analysis."
    },
    {
     "t": "p",
     "text": "**Contrast with nominal typing (ABC):**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from abc import ABC, abstractmethod\n\nclass Speaker(ABC):\n    @abstractmethod\n    def speak(self) -> str: ...\n\n# Robot MUST inherit from Speaker to be accepted — breaks duck typing\nclass Robot(Speaker):        # forced inheritance\n    def speak(self) -> str:\n        return \"Beep\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Protocols are more Pythonic than ABCs when you want structural subtyping."
    }
   ]
  },
  {
   "t": "drill",
   "n": "39",
   "q": "How do you prevent a class from being subclassed?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Python offers several ways to make a class \"final\" (non-subclassable):"
    },
    {
     "t": "p",
     "text": "**Way 1: Using `__init_subclass__` (simplest)**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Final:\n    def __init_subclass__(cls, **kwargs):\n        raise TypeError(f\"Cannot subclass {Final.__name__}\")\n\nclass Attempt(Final):    # TypeError: Cannot subclass Final\n    pass",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Way 2: Using a metaclass**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class FinalMeta(type):\n    def __new__(mcs, name, bases, namespace):\n        for base in bases:\n            if isinstance(base, FinalMeta):\n                raise TypeError(f\"Cannot subclass {base.__name__}\")\n        return super().__new__(mcs, name, bases, namespace)\n\nclass Sealed(metaclass=FinalMeta):\n    pass\n\n# class Child(Sealed):   # TypeError: Cannot subclass Sealed\n#     pass",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Way 3: Using `typing.final` decorator (static only)**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import final\n\n@final\nclass Config:\n    host: str = \"localhost\"\n\n# class MyConfig(Config):   # mypy error: Cannot subclass final class\n#     pass",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Note: `@final` only works with static type checkers (mypy/pyright). It does NOT raise errors at runtime."
    },
    {
     "t": "p",
     "text": "**Way 4: Using `__init_subclass__` with an allowlist**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Base:\n    _allowed_subclasses = {\"Child\"}\n\n    def __init_subclass__(cls, **kwargs):\n        if cls.__name__ not in Base._allowed_subclasses:\n            raise TypeError(f\"{cls.__name__} is not allowed to subclass Base\")\n        super().__init_subclass__(**kwargs)\n\nclass Child(Base):       # OK — in the allowlist\n    pass\n\n# class Rogue(Base):     # TypeError — not in the allowlist\n#     pass",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Best practice:** Use `@final` for static checking + `__init_subclass__` for runtime enforcement if needed."
    }
   ]
  },
  {
   "t": "drill",
   "n": "40",
   "q": "(Bonus) What is `__class_getitem__` and how is it used for generic types?",
   "body": [
    {
     "t": "p",
     "text": "**A:** `__class_getitem__` is the dunder method that enables the `ClassName[Type]` syntax (subscripting a class). It is called when you use square brackets on the class itself (not an instance). This is how generic types like `list[int]`, `dict[str, int]`, and custom generics work."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import TypeVar, Generic\n\nT = TypeVar(\"T\")\n\nclass Stack(Generic[T]):\n    def __init__(self):\n        self._items: list[T] = []\n\n    def push(self, item: T):\n        self._items.append(item)\n\n    def pop(self) -> T:\n        return self._items.pop()\n\n    def __repr__(self):\n        return f\"Stack({self._items})\"\n\n# Usage with type hints\ns: Stack[int] = Stack()\ns.push(1)\ns.push(2)\nprint(s)    # Stack([1, 2])\n\n# Custom __class_getitem__ without Generic\nclass Matrix:\n    def __class_getitem__(cls, params):\n        rows, cols = params\n        print(f\"Creating Matrix type: {rows}x{cols}\")\n        return cls      # typically returns a parameterised type\n\nMatrix[3, 4]    # Creating Matrix type: 3x4",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**How it relates to the `[]` syntax:** - `list[int]` calls `list.__class_getitem__(int)` - It's purely for type hinting — doesn't change runtime behaviour in most cases. - `Generic[T]` provides a default `__class_getitem__` implementation."
    }
   ]
  },
  {
   "t": "drill",
   "n": "41",
   "q": "(Bonus) Explain `__del__` — destructor, pitfalls, and alternatives.",
   "terms": [
    "cannot predict when",
    "Pitfalls of __del__",
    "No guaranteed call order",
    "Circular references",
    "Exceptions are ignored",
    "Resurrection"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** `__del__` is called when an object is about to be garbage collected. It's Python's \"destructor,\" but unlike C++ destructors, you **cannot predict when** it will run (or if it will run at all)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Resource:\n    def __init__(self, name):\n        self.name = name\n        print(f\"Resource {name} acquired\")\n\n    def __del__(self):\n        print(f\"Resource {self.name} released\")\n\nr = Resource(\"DB\")          # Resource DB acquired\ndel r                       # Resource DB released (usually)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Pitfalls of `__del__`:** 1. **No guaranteed call order** — during interpreter shutdown, objects may be deleted in any order. 2. **Circular references** — objects in cycles may not have `__del__` called (prior to Python 3.4 with PEP 442). 3. **Exceptions are ignored** — if `__del__` raises, the error is printed to stderr but swallowed. 4. **Resurrection** — if `__del__` creates a new reference to `self`, the object isn't collected."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# BAD — relying on __del__ for cleanup\nclass Connection:\n    def __del__(self):\n        self.close()          # might not run!\n\n# GOOD — use context managers instead\nclass Connection:\n    def __enter__(self):\n        return self\n    def __exit__(self, *args):\n        self.close()          # guaranteed cleanup\n\nwith Connection() as conn:\n    pass                      # close() called reliably",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rule:** Use `__del__` only as a safety net. Always prefer context managers (`with` statement) or explicit `.close()` methods for resource cleanup."
    }
   ]
  },
  {
   "t": "drill",
   "n": "42",
   "q": "(Bonus) How does Python's garbage collection work with OOP? (Reference counting + cycle collector)",
   "terms": [
    "reference counting",
    "cyclic garbage collector",
    "Key concepts",
    "Cyclic GC",
    "Generations",
    "Weak references"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** Python uses **reference counting** as the primary GC mechanism, supplemented by a **cyclic garbage collector** for objects involved in reference cycles."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nimport gc\n\nclass Node:\n    def __init__(self, name):\n        self.name = name\n        self.ref = None\n\n    def __repr__(self):\n        return f\"Node({self.name})\"\n\n# Reference counting\na = Node(\"A\")\nprint(sys.getrefcount(a))   # 2 (a + getrefcount arg)\n\nb = a                        # refcount → 3\ndel b                        # refcount → 2\n\n# Circular reference — refcount alone can't handle this\nn1 = Node(\"1\")\nn2 = Node(\"2\")\nn1.ref = n2                  # n1 → n2\nn2.ref = n1                  # n2 → n1 (cycle!)\n\ndel n1, n2                   # refcounts drop to 1, not 0 — NOT collected!\n\n# Cyclic GC collects them\ngc.collect()                 # forces cycle detection and cleanup\n\n# Check GC stats\nprint(gc.get_stats())        # shows collections per generation",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key concepts:** - **Reference counting:** Each object has a count of references to it. When it reaches 0, memory is freed immediately. - **Cyclic GC:** Runs periodically to detect and collect groups of objects that reference each other but are unreachable from the program. - **Generations:** Objects are grouped into 3 generations (0, 1, 2). New objects start in gen 0. If they survive a GC pass, they're promoted. Older generations are scanned less frequently. - **Weak references** (`weakref`) don't increment the refcount, useful for caches and observer patterns."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import weakref\n\nclass Cache:\n    pass\n\nobj = Cache()\nweak = weakref.ref(obj)\nprint(weak())              # <Cache object>\ndel obj\nprint(weak())              # None — object was collected",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "43",
   "q": "(Bonus) What is `__prepare__` in metaclasses?",
   "body": [
    {
     "t": "p",
     "text": "**A:** `__prepare__` is a class method on a metaclass that returns the namespace (dict-like object) used to evaluate the class body. By default, it returns a regular `dict`, but you can return an `OrderedDict` or a custom mapping to control how the class namespace behaves during class creation."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class OrderedMeta(type):\n    @classmethod\n    def __prepare__(mcs, name, bases):\n        from collections import OrderedDict\n        return OrderedDict()          # class body uses OrderedDict\n\n    def __new__(mcs, name, bases, namespace):\n        cls = super().__new__(mcs, name, bases, dict(namespace))\n        cls._field_order = list(namespace.keys())\n        return cls\n\nclass Form(metaclass=OrderedMeta):\n    name = \"text\"\n    email = \"email\"\n    age = \"number\"\n\nprint(Form._field_order)\n# ['__module__', '__qualname__', 'name', 'email', 'age']\n# Fields appear in definition order (guaranteed in Python 3.7+ dicts anyway)",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Practical: prevent duplicate definitions\nclass NoDupDict(dict):\n    def __setitem__(self, key, value):\n        if key in self and key not in (\"__module__\", \"__qualname__\"):\n            raise ValueError(f\"Duplicate key: {key}\")\n        super().__setitem__(key, value)\n\nclass StrictMeta(type):\n    @classmethod\n    def __prepare__(mcs, name, bases):\n        return NoDupDict()\n\n    def __new__(mcs, name, bases, namespace):\n        return super().__new__(mcs, name, bases, dict(namespace))\n\nclass Config(metaclass=StrictMeta):\n    host = \"localhost\"\n    # host = \"remote\"     # ValueError: Duplicate key: host",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Note:** Since Python 3.7, regular `dict` preserves insertion order, making `__prepare__` less necessary for ordering. It's still useful for custom namespace behaviours like validation, logging attribute definitions, or preventing duplicates."
    }
   ]
  }
 ],
 "takeaways": []
});

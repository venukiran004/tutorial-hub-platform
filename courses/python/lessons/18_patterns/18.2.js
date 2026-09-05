/* ============================================================================
   DESIGN PATTERNS 18.2 — Creational Patterns
   ----------------------------------------------------------------------------
   Pattern and SOLID questions, gathered here from the interview sets so the
   subject lives in one place. Coding problems live in Coding Practice.
   ========================================================================= */
EC.receiveLesson({
 "id": "18.2",
 "lede": "**16 interview questions on creational patterns**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 16 questions on creational patterns without prompting",
  "Name the force each pattern resolves, not only its shape",
  "Say when the pattern is the wrong choice",
  "Give the Python-idiomatic form rather than the textbook one"
 ],
 "prerequisites": [
  "4.11",
  "4.12"
 ],
 "blocks": [
  {
   "t": "callout",
   "kind": "note",
   "title": "How to use this set",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Answer out loud before revealing.** An answer you can only recognise is one you cannot give under pressure.",
      "**Name the force the pattern resolves.** \"It decouples things\" is not an answer; \"it stops the conditional growing every time we add a payment provider\" is.",
      "**Be willing to say \"none of them\".** The strongest answer to a pattern question is often a function, a dict, or a generator."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "1",
   "q": "How do you implement a Factory in Python, and why is a registry dict preferred over if/elif?",
   "terms": [
    "Answer",
    "open for extension",
    "closed for modification",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Factory:\n    _registry = {\"email\": Email, \"sms\": SMS}\n    @classmethod\n    def create(cls, key):\n        return cls._registry[key]()       # O(1), data-driven\n    @classmethod\n    def register(cls, key, klass):\n        cls._registry[key] = klass        # extend without editing create()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "A registry is **open for extension** (new types register themselves) and **closed for modification** (you never touch `create`), satisfying the Open/Closed Principle. An `if/elif` chain must be edited for every new type."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The dict-registry factory is the idiomatic, extensible form."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Factory Method vs Abstract Factory — what's the difference?",
   "terms": [
    "Answer",
    "Factory Method",
    "one",
    "Abstract Factory",
    "family",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Factory Method:** creates **one** product chosen at runtime (e.g. a notification by channel).",
      "**Abstract Factory:** creates a **family** of related products that must stay consistent (e.g. all widgets of a \"dark theme\")."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class DarkTheme(UIFactory):\n    def button(self): return DarkButton()\n    def text_input(self): return DarkInput()   # whole family is consistent",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use Abstract Factory when products must match each other; use Factory Method for a single, independent product."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Show the Pythonic Builder pattern. Why return `self`?",
   "terms": [
    "Answer",
    "fluent interface",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Q:\n    def __init__(self): self.parts = []\n    def select(self, c): self.parts.append(c); return self\n    def build(self): return \" \".join(self.parts)\n\nQ().select(\"a\").select(\"b\").build()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Returning `self` from each step enables a **fluent interface** (method chaining), which reads top-to-bottom like a description of the object being built."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Builder shines when an object has many optional parts and a defined assembly order; the fluent style is the Python convention."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What are the ways to implement a Singleton, and which is best?",
   "terms": [
    "Answer",
    "Module",
    "Metaclass",
    "__new__ override",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Module**import-time caching makes a module a natural singleton (best/simplest).",
      "**Metaclass**`__call__` returns a cached instance; reusable across classes.",
      "**`__new__` override**class returns its one `_instance`."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Meta(type):\n    _i = {}\n    def __call__(cls, *a, **k):\n        if cls not in cls._i: cls._i[cls] = super().__call__(*a, **k)\n        return cls._i[cls]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Prefer a module or dependency injection. Singletons are global mutable state — they make testing and concurrency harder, so use sparingly."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Why are Singletons often considered an anti-pattern, and what's the alternative?",
   "terms": [
    "Answer",
    "dependency injection",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "They introduce hidden global state: implicit dependencies, hard-to-isolate tests (state leaks between tests), and tricky thread-safety. The alternative is **dependency injection** — create one instance at the composition root and pass it where needed."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "config = Config()           # created once, explicitly\nservice = UserService(config)   # injected, easy to mock in tests",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Make dependencies explicit instead of reaching into global singletons."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is the Prototype pattern and when do you use it?",
   "terms": [
    "Answer",
    "cloning",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "It creates new objects by **cloning** an existing configured one (via `copy.deepcopy`) instead of re-running expensive construction."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import copy\ntemplate = ServerConfig(\"web\", cpu=2, packages=[\"nginx\"])\nclone = copy.deepcopy(template); clone.name = \"web-1\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use it for many near-identical objects derived from templates; `deepcopy` avoids shared mutable state between copies."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "When would you use an Object Pool?",
   "terms": [
    "Answer",
    "expensive to create",
    "frequently reused",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "When objects are **expensive to create** and **frequently reused** — database connections, threads, large buffers. The pool hands out idle objects and reclaims them on release instead of constructing/destroying each time."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "conn = pool.acquire()\ntry: ...\nfinally: pool.release(conn)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Pools trade memory for reduced construction cost and bounded resource usage; make `acquire`/`release` thread-safe."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Implement Singleton in Python (3 ways: `__new__`, metaclass, module).",
   "body": [
    {
     "t": "p",
     "text": "**A:** A Singleton ensures only one instance of a class exists."
    },
    {
     "t": "p",
     "text": "**Way 1: Using `__new__`**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Singleton:\n    _instance = None\n\n    def __new__(cls, *args, **kwargs):\n        if cls._instance is None:\n            cls._instance = super().__new__(cls)\n        return cls._instance\n\n    def __init__(self, value=None):\n        self.value = value       # runs every time — may reset state\n\na = Singleton(1)\nb = Singleton(2)\nprint(a is b)         # True\nprint(a.value)        # 2 — __init__ ran twice",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Way 2: Using metaclass**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class SingletonMeta(type):\n    _instances = {}\n\n    def __call__(cls, *args, **kwargs):\n        if cls not in cls._instances:\n            instance = super().__call__(*args, **kwargs)\n            cls._instances[cls] = instance\n        return cls._instances[cls]\n\nclass Database(metaclass=SingletonMeta):\n    def __init__(self, url):\n        self.url = url\n        print(f\"Connecting to {url}\")    # only prints once\n\ndb1 = Database(\"postgres://localhost\")   # Connecting to postgres://localhost\ndb2 = Database(\"mysql://localhost\")      # no output — returns cached instance\nprint(db1 is db2)    # True\nprint(db1.url)       # postgres://localhost — __init__ did NOT run again",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Way 3: Module-level singleton (most Pythonic)**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# config.py — the module IS the singleton\nclass _Config:\n    def __init__(self):\n        self.debug = False\n        self.db_url = \"sqlite:///default.db\"\n\nconfig = _Config()    # single instance at module level\n\n# usage.py\n# from config import config\n# config.debug = True\n# All importers share the same `config` object.",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Recommendation:** The module approach is simplest and most Pythonic. Use the metaclass approach when you need inheritance support and guaranteed single instantiation."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Factory pattern in Python.",
   "body": [
    {
     "t": "p",
     "text": "**A:** The Factory pattern creates objects without exposing creation logic to the client. In Python, it's commonly implemented with functions, `@classmethod`, or a dedicated factory class."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from abc import ABC, abstractmethod\n\n# Product hierarchy\nclass Notification(ABC):\n    @abstractmethod\n    def send(self, message: str) -> str: ...\n\nclass EmailNotification(Notification):\n    def send(self, message):\n        return f\"Email: {message}\"\n\nclass SMSNotification(Notification):\n    def send(self, message):\n        return f\"SMS: {message}\"\n\nclass PushNotification(Notification):\n    def send(self, message):\n        return f\"Push: {message}\"\n\n# Factory function (simplest approach)\ndef create_notification(channel: str) -> Notification:\n    factories = {\n        \"email\": EmailNotification,\n        \"sms\": SMSNotification,\n        \"push\": PushNotification,\n    }\n    if channel not in factories:\n        raise ValueError(f\"Unknown channel: {channel}\")\n    return factories[channel]()\n\n# Usage\nnotif = create_notification(\"email\")\nprint(notif.send(\"Hello!\"))   # Email: Hello!\n\n# Registry-based factory with auto-registration\nclass NotificationFactory:\n    _registry: dict[str, type[Notification]] = {}\n\n    @classmethod\n    def register(cls, name: str):\n        def decorator(klass):\n            cls._registry[name] = klass\n            return klass\n        return decorator\n\n    @classmethod\n    def create(cls, name: str, **kwargs) -> Notification:\n        if name not in cls._registry:\n            raise ValueError(f\"Unknown: {name}\")\n        return cls._registry[name](**kwargs)\n\n@NotificationFactory.register(\"slack\")\nclass SlackNotification(Notification):\n    def send(self, message):\n        return f\"Slack: {message}\"\n\nprint(NotificationFactory.create(\"slack\").send(\"Hi\"))  # Slack: Hi",
     "numbered": false
    },
    {
     "t": "p",
     "text": "The registry-based approach is open/closed principle compliant — new notification types can register themselves without modifying the factory."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Builder pattern with method chaining.",
   "terms": [
    "method chaining",
    "Key principle"
   ],
   "body": [
    {
     "t": "p",
     "text": "**A:** The Builder pattern constructs complex objects step-by-step. In Python, **method chaining** (returning `self` from each method) makes it fluent and readable."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class QueryBuilder:\n    def __init__(self):\n        self._table = None\n        self._columns = [\"*\"]\n        self._conditions = []\n        self._order_by = None\n        self._limit = None\n\n    def table(self, name: str):\n        self._table = name\n        return self              # return self for chaining\n\n    def select(self, *columns: str):\n        self._columns = list(columns)\n        return self\n\n    def where(self, condition: str):\n        self._conditions.append(condition)\n        return self\n\n    def order(self, column: str, desc: bool = False):\n        direction = \"DESC\" if desc else \"ASC\"\n        self._order_by = f\"{column} {direction}\"\n        return self\n\n    def limit(self, n: int):\n        self._limit = n\n        return self\n\n    def build(self) -> str:\n        if not self._table:\n            raise ValueError(\"Table not specified\")\n        cols = \", \".join(self._columns)\n        query = f\"SELECT {cols} FROM {self._table}\"\n        if self._conditions:\n            query += \" WHERE \" + \" AND \".join(self._conditions)\n        if self._order_by:\n            query += f\" ORDER BY {self._order_by}\"\n        if self._limit is not None:\n            query += f\" LIMIT {self._limit}\"\n        return query\n\n# Fluent API with method chaining\nquery = (\n    QueryBuilder()\n    .table(\"users\")\n    .select(\"name\", \"email\", \"age\")\n    .where(\"age > 18\")\n    .where(\"active = true\")\n    .order(\"name\")\n    .limit(10)\n    .build()\n)\nprint(query)\n# SELECT name, email, age FROM users WHERE age > 18 AND active = true ORDER BY name ASC LIMIT 10",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key principle:** Every setter method returns `self` to enable chaining. The `build()` method validates and produces the final product."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Implement a thread-safe singleton with double-checked locking.",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\n\nclass Singleton:\n    _instance = None\n    _lock = threading.Lock()\n\n    def __new__(cls):\n        if cls._instance is None:            # fast path, no lock\n            with cls._lock:\n                if cls._instance is None:    # re-check under lock\n                    cls._instance = super().__new__(cls)\n        return cls._instance\n\nprint(Singleton() is Singleton())   # True",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The outer check avoids locking on the common path; the inner check (inside the lock) prevents two threads both creating an instance during the race."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the Singleton design pattern in Python?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class Singleton:\n    _instance = None\n\n    def __new__(cls):\n        if cls._instance is None:\n            cls._instance = super().__new__(cls)\n        return cls._instance",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Ensures only one instance of the class is created."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the Factory design pattern?",
   "body": [
    {
     "t": "p",
     "text": "A creational pattern where a factory function or class creates objects without specifying the exact class:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def create_shape(shape_type):\n    if shape_type == \"circle\":   return Circle()\n    if shape_type == \"square\":   return Square()",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is the Singleton pattern in Python?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class Singleton(type):\n    _instances = {}\n    def __call__(cls, *args, **kwargs):\n        if cls not in cls._instances:\n            cls._instances[cls] = super().__call__(*args, **kwargs)\n        return cls._instances[cls]\n\nclass Config(metaclass=Singleton):\n    pass",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Or use a module-level variable (Python modules are singletons by nature)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is the Factory pattern in Python?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class AnimalFactory:\n    @staticmethod\n    def create(animal_type: str):\n        animals = {\"dog\": Dog, \"cat\": Cat, \"bird\": Bird}\n        if animal_type not in animals:\n            raise ValueError(f\"Unknown animal: {animal_type}\")\n        return animals[animal_type]()\n\nanimal = AnimalFactory.create(\"dog\")",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Trace an Object Pool implementation: what does acquire/release print?",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class ObjectPool:\n    def __init__(self, factory, max_size=10):\n        self.factory, self.max_size, self.pool, self.created = factory, max_size, [], 0\n    def acquire(self):\n        if self.pool: return self.pool.pop()\n        self.created += 1\n        return self.factory()\n    def release(self, obj):\n        if len(self.pool) < self.max_size: self.pool.append(obj)\n\npool = ObjectPool(lambda: [0] * 1000, max_size=5)\nobjs = [pool.acquire() for _ in range(3)]\nprint(f\"Created: {pool.created}\")\nfor obj in objs: pool.release(obj)\nprint(f\"Pooled: {len(pool.pool)}\")\nobj = pool.acquire()\nprint(f\"Created after reuse: {pool.created}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Created: 3`, `Pooled: 3`, `Created after reuse: 3` **Explanation:** Released objects are reused on the next `acquire`, so the creation count doesn't increase."
    }
   ]
  }
 ],
 "takeaways": []
});

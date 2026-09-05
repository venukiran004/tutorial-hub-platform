/* ============================================================================
   INTERVIEW: ALGORITHMS & QUESTION BANKS i8.2 — Question Bank · Questions 1–100
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i8.2",
 "lede": "**93 interview questions on question bank**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 93 questions on question bank without prompting",
  "State the trade-off behind each answer, not only the definition",
  "Recognise the follow-up each question is setting up",
  "Notice which answers you can recognise but not produce"
 ],
 "prerequisites": [],
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
      "**Say the trade-off, not just the definition.** Interviewers are listening for judgement, and the follow-up is where it shows.",
      "Coding problems live in the **Coding Practice** course — these are the ones you answer in conversation."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What is the difference between a list, tuple, and set?",
   "body": [
    {
     "t": "table",
     "head": [
      "",
      "List",
      "Tuple",
      "Set"
     ],
     "rows": [
      [
       "Mutable",
       "Yes",
       "No",
       "Yes"
      ],
      [
       "Ordered",
       "Yes",
       "Yes",
       "No"
      ],
      [
       "Duplicates",
       "Yes",
       "Yes",
       "No"
      ],
      [
       "Indexable",
       "Yes",
       "Yes",
       "No"
      ]
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is a dictionary in Python? How is it implemented?",
   "body": [
    {
     "t": "p",
     "text": "A dict is a key-value mapping. Internally implemented as a hash table. Keys must be hashable. Average O(1) get/set/delete. As of Python 3.7+, dicts maintain insertion order."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What are Python's mutable and immutable types?",
   "terms": [
    "Immutable",
    "Mutable"
   ],
   "body": [
    {
     "t": "ul",
     "items": [
      "**Immutable:** int, float, str, tuple, frozenset, bytes. Cannot change in-place.",
      "**Mutable:** list, dict, set, bytearray. Can change in-place. Immutable objects are hashable (can be dict keys / set members)."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is a generator in Python?",
   "body": [
    {
     "t": "p",
     "text": "A generator is a function that uses `yield` to lazily produce values one at a time. Maintains state between calls. Memory efficient for large sequences — values are computed on demand."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def infinite_counter():\n    n = 0\n    while True:\n        yield n\n        n += 1",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What are list comprehensions and generator expressions?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "squares = [x**2 for x in range(10)]        # List comprehension — eager, list\nsquares_gen = (x**2 for x in range(10))    # Generator expression — lazy, generator",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Use generator expressions for large datasets to avoid loading all values into memory."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is a lambda function?",
   "body": [
    {
     "t": "p",
     "text": "An anonymous, single-expression function:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "double = lambda x: x * 2\nsorted(data, key=lambda x: x[\"age\"])",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Use for short, throwaway functions; prefer `def` for anything complex."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is a Python decorator and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "A decorator is a higher-order function that wraps another function to add behavior:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def my_decorator(func):\n    def wrapper(*args, **kwargs):\n        print(\"Before\")\n        result = func(*args, **kwargs)\n        print(\"After\")\n        return result\n    return wrapper\n\n@my_decorator\ndef say_hello():\n    print(\"Hello\")",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is `functools.wraps` and why use it with decorators?",
   "body": [
    {
     "t": "p",
     "text": "`@functools.wraps(func)` copies the wrapped function's metadata (`__name__`, `__doc__`) to the wrapper, so the decorator doesn't obscure the original function's identity when inspecting."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What are Python's built-in data structures and their time complexities?",
   "body": [
    {
     "t": "table",
     "head": [
      "Operation",
      "List",
      "Dict/Set",
      "Deque"
     ],
     "rows": [
      [
       "Access",
       "O(1)",
       "O(1) avg",
       "O(n)"
      ],
      [
       "Append",
       "O(1) amortized",
       "O(1) avg",
       "O(1)"
      ],
      [
       "Insert (front)",
       "O(n)",
       "—",
       "O(1)"
      ],
      [
       "Search",
       "O(n)",
       "O(1) avg",
       "O(n)"
      ]
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is the Global Interpreter Lock (GIL)?",
   "body": [
    {
     "t": "p",
     "text": "The GIL is a mutex in CPython that allows only one thread to execute Python bytecode at a time. Prevents true CPU-level parallelism in multi-threaded Python. Use multiprocessing for CPU-bound parallelism; threading still works well for I/O-bound tasks."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the difference between `deepcopy` and `copy`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`copy.copy()`: Shallow copy — new object but nested objects are references to originals.",
      "`copy.deepcopy()`: Deep copy — recursively copies all nested objects."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import copy\na = [[1, 2], [3, 4]]\nb = copy.copy(a)      # b[0] is a[0] → True\nc = copy.deepcopy(a)  # c[0] is a[0] → False",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "Explain Python's `with` statement and context managers.",
   "body": [
    {
     "t": "p",
     "text": "`with` automatically calls `__enter__` on entry and `__exit__` on exit (even if an exception occurs). Ensures resource cleanup (files, connections, locks):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with open(\"file.txt\") as f:\n    content = f.read()  # File auto-closed after block",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the difference between `staticmethod`, `classmethod`, and instance methods?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Instance method:** Takes `self`; operates on instance data.",
      "`@classmethod`: Takes `cls`; operates on class; can be called on class or instance.",
      "`@staticmethod`: Takes neither; utility function logically grouped in the class."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What are Python's string formatting methods?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "name, age = \"Alice\", 30\nf\"Name: {name}, Age: {age}\"        # f-string (fastest, Python 3.6+)\n\"Name: {}, Age: {}\".format(name, age)  # .format()\n\"Name: %s, Age: %d\" % (name, age)    # %-formatting (old)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is `__init__` vs `__new__` in Python?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`__new__`: Creates (allocates) the object. Class method; rarely overridden.",
      "`__init__`: Initializes the object's attributes after creation. The common constructor method."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What are Python's collection modules?",
   "body": [
    {
     "t": "p",
     "text": "`collections` module: `deque` (O(1) both ends), `defaultdict` (default value), `Counter` (element counts), `OrderedDict` (insertion order), `namedtuple` (tuple with named fields)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the difference between `range` and `xrange` in Python 2 vs 3?",
   "body": [
    {
     "t": "p",
     "text": "In Python 3, `range` is lazy (like Python 2's `xrange`). Python 2's `range` returned a list; `xrange` returned an iterator. Python 3 removed `xrange`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is Python's `None` type?",
   "body": [
    {
     "t": "p",
     "text": "`None` is the singleton null value in Python. It has its own type (`NoneType`). Test for None with `is None` (identity), not `== None`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is unpacking in Python?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a, b, c = [1, 2, 3]          # Basic unpacking\nfirst, *rest = [1, 2, 3, 4]  # Extended unpacking → rest = [2, 3, 4]\na, b = b, a                   # Swap without temp variable",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the `zip` function?",
   "body": [
    {
     "t": "p",
     "text": "`zip` combines multiple iterables element-wise into an iterator of tuples:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "names = [\"Alice\", \"Bob\"]\nscores = [95, 87]\nlist(zip(names, scores))  # [(\"Alice\", 95), (\"Bob\", 87)]\ndict(zip(names, scores))  # {\"Alice\": 95, \"Bob\": 87}",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Object-Oriented Programming (Q26–Q45)"
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What are the four pillars of OOP?",
   "terms": [
    "Encapsulation",
    "Inheritance",
    "Polymorphism",
    "Abstraction"
   ],
   "body": [
    {
     "t": "ol",
     "items": [
      "**Encapsulation:** Bundling data and methods, restricting direct access.",
      "**Inheritance:** Reusing parent class attributes/methods.",
      "**Polymorphism:** Same interface, different implementations.",
      "**Abstraction:** Hiding implementation details."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "How does Python handle encapsulation?",
   "body": [
    {
     "t": "p",
     "text": "By convention: `_attr` (protected, internal use), `__attr` (private — name mangled to `_ClassName__attr`). Python doesn't enforce private access but respects convention."
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is Python's MRO (Method Resolution Order)?",
   "body": [
    {
     "t": "p",
     "text": "MRO determines which method to call in the presence of multiple inheritance. Python uses C3 linearization. Inspect via `ClassName.__mro__`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is `super()` and when do you use it?",
   "body": [
    {
     "t": "p",
     "text": "`super()` returns a proxy to the parent class, enabling you to call overridden methods:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Dog(Animal):\n    def __init__(self):\n        super().__init__()  # Calls Animal.__init__",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Ensures correct MRO traversal in multiple inheritance scenarios."
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is an abstract class in Python?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from abc import ABC, abstractmethod\n\nclass Shape(ABC):\n    @abstractmethod\n    def area(self) -> float:\n        pass",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Abstract classes cannot be instantiated. Subclasses must implement all `@abstractmethod` methods."
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "What are dunder (magic) methods? Give examples.",
   "body": [
    {
     "t": "p",
     "text": "Special methods: `__init__`, `__str__`, `__repr__`, `__len__`, `__getitem__`, `__setitem__`, `__iter__`, `__next__`, `__enter__`, `__exit__`, `__add__`, `__eq__`. They enable operator overloading and protocol integration."
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is the difference between `__str__` and `__repr__`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`__repr__`: Unambiguous, developer-facing representation. `repr(obj)`. Should ideally allow `eval()` to recreate the object.",
      "`__str__`: Human-readable string. `str(obj)` / `print(obj)`. Falls back to `__repr__` if not defined."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is a dataclass in Python?",
   "body": [
    {
     "t": "p",
     "text": "`@dataclass` auto-generates `__init__`, `__repr__`, `__eq__` based on class-level type annotations. Reduces boilerplate:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from dataclasses import dataclass\n\n@dataclass\nclass Point:\n    x: float\n    y: float",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is composition vs. inheritance?",
   "terms": [
    "Inheritance",
    "Composition"
   ],
   "body": [
    {
     "t": "ul",
     "items": [
      "**Inheritance:** \"is-a\" relationship. Dog is-an Animal.",
      "**Composition:** \"has-a\" relationship. Car has-an Engine. Prefer composition for flexibility; inheritance creates tight coupling. \"Favor composition over inheritance.\""
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is a mixin in Python?",
   "body": [
    {
     "t": "p",
     "text": "A mixin is a class designed to be mixed into other classes via multiple inheritance to add reusable functionality without being a standalone class. Example: `JSONMixin` adding `to_json()` to any model."
    }
   ]
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is `__slots__`?",
   "body": [
    {
     "t": "p",
     "text": "`__slots__` restricts instance attributes to a predefined list, preventing `__dict__` creation. Reduces per-instance memory usage and can speed up attribute access:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Point:\n    __slots__ = [\"x\", \"y\"]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is the `property` decorator?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class Circle:\n    def __init__(self, radius):\n        self._radius = radius\n\n    @property\n    def area(self):\n        return 3.14 * self._radius ** 2\n\n    @area.setter  # Not defined here — makes it read-only",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Allows defining computed attributes that look like regular attributes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is method chaining?",
   "body": [
    {
     "t": "p",
     "text": "Returning `self` from methods allows chaining calls:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Builder:\n    def set_name(self, name): self.name = name; return self\n    def set_age(self, age):   self.age = age;  return self\n\nobj = Builder().set_name(\"Alice\").set_age(30)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is `__call__`?",
   "body": [
    {
     "t": "p",
     "text": "Defining `__call__` makes an object callable like a function:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Multiplier:\n    def __init__(self, factor):\n        self.factor = factor\n    def __call__(self, x):\n        return x * self.factor\n\ndouble = Multiplier(2)\ndouble(5)  # 10",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is `__getattr__` vs `__getattribute__`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`__getattr__`: Called only when normal attribute lookup fails. Used for dynamic attributes or proxy objects.",
      "`__getattribute__`: Called on every attribute access. Override carefully to avoid infinite recursion."
     ]
    },
    {
     "t": "disclose",
     "summary": "The same question, answered a second way",
     "body": [
      {
       "t": "ul",
       "items": [
        "`__getattr__`: Called ONLY when normal attribute lookup fails. Safe to define.",
        "`__getattribute__`: Called for EVERY attribute access. Easy to create infinite recursion."
       ]
      },
      {
       "t": "code",
       "lang": "python",
       "code": "class LazyLoader:\n    def __getattr__(self, name):\n        # Only called when attribute not found normally\n        module = importlib.import_module(name)\n        setattr(self, name, module)  # Cache it\n        return module",
       "numbered": false
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is a closure in Python?",
   "body": [
    {
     "t": "p",
     "text": "A closure is a function that captures variables from its enclosing scope:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def make_counter():\n    count = 0\n    def counter():\n        nonlocal count\n        count += 1\n        return count\n    return counter\n\nc = make_counter()\nc()  # 1\nc()  # 2",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is `map`, `filter`, and `reduce`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import reduce\nlist(map(lambda x: x**2, [1,2,3]))        # [1, 4, 9]\nlist(filter(lambda x: x > 1, [1,2,3]))    # [2, 3]\nreduce(lambda x, y: x + y, [1,2,3])       # 6",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is `functools.partial`?",
   "body": [
    {
     "t": "p",
     "text": "Creates a new function with some arguments pre-filled:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import partial\ndef power(base, exp): return base ** exp\nsquare = partial(power, exp=2)\nsquare(5)  # 25",
     "numbered": false
    },
    {
     "t": "disclose",
     "summary": "The same question, answered a second way",
     "body": [
      {
       "t": "p",
       "text": "Creates a new callable with some arguments pre-filled:"
      },
      {
       "t": "code",
       "lang": "python",
       "code": "from functools import partial\n\ndef power(base, exp):\n    return base ** exp\n\nsquare = partial(power, exp=2)\ncube = partial(power, exp=3)\nsquare(5)   # 25",
       "numbered": false
      },
      {
       "t": "p",
       "text": "Commonly used with `map/filter` and event handlers."
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is `itertools` and name five useful functions?",
   "body": [
    {
     "t": "p",
     "text": "`itertools` provides memory-efficient iterators: - `chain(*iterables)` — concatenate iterables - `islice(iterable, n)` — lazy slice - `product(a, b)` — Cartesian product - `groupby(iterable, key)` — group consecutive elements - `combinations(iterable, r)` / `permutations(iterable, r)` — combinatorics"
    }
   ]
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is `enumerate`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "for i, item in enumerate([\"a\", \"b\", \"c\"], start=1):\n    print(i, item)  # 1 a, 2 b, 3 c",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Returns an iterator of (index, value) tuples. More Pythonic than `range(len(...))`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is `sorted` vs `.sort()`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`sorted(iterable)`: Returns a new sorted list, works on any iterable.",
      "`list.sort()`: Sorts in-place, returns None, only works on lists. Both accept `key` and `reverse` parameters."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is a `namedtuple`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import namedtuple\nPoint = namedtuple(\"Point\", [\"x\", \"y\"])\np = Point(3, 4)\np.x, p.y  # Access by name",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Immutable, memory-efficient, self-documenting tuple."
    }
   ]
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What are `defaultdict` and `Counter` from `collections`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import defaultdict, Counter\n\ndd = defaultdict(list)\ndd[\"key\"].append(1)   # No KeyError — initializes with []\n\nc = Counter(\"hello\")  # Counter({'l': 2, 'h': 1, 'e': 1, 'o': 1})\nc.most_common(2)      # [('l', 2), ('h', 1)]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is `heapq` module used for?",
   "body": [
    {
     "t": "p",
     "text": "`heapq` provides a min-heap with `heappush`, `heappop`, `nlargest`, `nsmallest`. Used for priority queues, efficiently finding top-N elements."
    }
   ]
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is `lru_cache` and when should you use it?",
   "body": [
    {
     "t": "p",
     "text": "`@functools.lru_cache(maxsize=128)` memoizes a function's return value for given inputs. Ideal for pure functions with expensive computation called repeatedly with the same arguments."
    }
   ]
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is recursion and what is its Python-specific limitation?",
   "body": [
    {
     "t": "p",
     "text": "Recursion = function calling itself. Python has a default recursion limit of 1000 (`sys.getrecursionlimit()`). Can cause `RecursionError`. For deep recursion, use iteration or increase limit."
    }
   ]
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the `any()` and `all()` function?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "any([False, True, False])  # True — at least one truthy\nall([True, True, False])   # False — not all truthy\nany(x > 5 for x in data)  # Short-circuits with generator",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is `typing` module? Give examples.",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import List, Dict, Optional, Union, Tuple, Callable\n\ndef process(items: List[int]) -> Dict[str, int]: ...\ndef greet(name: Optional[str] = None) -> str: ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Type hints improve IDE support, static analysis (mypy), and documentation. Not enforced at runtime."
    }
   ]
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is `@dataclass(frozen=True)`?",
   "body": [
    {
     "t": "p",
     "text": "`frozen=True` creates an immutable dataclass (like a named tuple with type hints). Any attempt to modify attributes raises `FrozenInstanceError`. The object becomes hashable."
    }
   ]
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is `Protocol` in Python typing?",
   "body": [
    {
     "t": "p",
     "text": "`Protocol` enables structural subtyping (duck typing + type checking). An object satisfies a Protocol if it has the required methods/attributes, regardless of inheritance:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Protocol\n\nclass Drawable(Protocol):\n    def draw(self) -> None: ...",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Concurrency & Advanced (Q61–Q80)"
    }
   ]
  },
  {
   "t": "drill",
   "n": "51",
   "q": "What is the difference between threading, multiprocessing, and asyncio?",
   "body": [
    {
     "t": "table",
     "head": [
      "",
      "Threading",
      "Multiprocessing",
      "Asyncio"
     ],
     "rows": [
      [
       "Parallelism",
       "No (GIL)",
       "Yes",
       "No (single thread)"
      ],
      [
       "Best for",
       "I/O-bound",
       "CPU-bound",
       "I/O-bound (high concurrency)"
      ],
      [
       "Overhead",
       "Low",
       "High (process spawn)",
       "Very low"
      ]
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What is asyncio? Explain `async/await`.",
   "body": [
    {
     "t": "p",
     "text": "Asyncio provides an event loop for writing non-blocking I/O code without threads:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def fetch_data():\n    await asyncio.sleep(1)   # Non-blocking wait\n    return \"data\"\n\nasyncio.run(fetch_data())",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is a coroutine in Python?",
   "body": [
    {
     "t": "p",
     "text": "A coroutine is a function defined with `async def` that can be suspended at `await` points, yielding control back to the event loop. Unlike threads, coroutines are cooperative (not preemptive)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is `asyncio.gather`?",
   "body": [
    {
     "t": "p",
     "text": "Runs multiple coroutines concurrently and waits for all to complete:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "results = await asyncio.gather(\n    fetch_url(\"http://api1.com\"),\n    fetch_url(\"http://api2.com\"),\n    fetch_url(\"http://api3.com\"),\n)  # All three fire concurrently",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What is a thread-safe data structure?",
   "body": [
    {
     "t": "p",
     "text": "`queue.Queue` is thread-safe (uses internal locks). Lists and dicts have partially thread-safe operations (GIL protected individual operations) but not compound operations. Use `threading.Lock` for explicit synchronization."
    }
   ]
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is `multiprocessing.Pool`?",
   "body": [
    {
     "t": "p",
     "text": "A pool of worker processes. Distributes tasks across processes for CPU-bound parallel work:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from multiprocessing import Pool\n\nwith Pool(4) as p:\n    results = p.map(heavy_computation, data_list)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is a `ProcessPoolExecutor` and `ThreadPoolExecutor`?",
   "body": [
    {
     "t": "p",
     "text": "High-level interfaces from `concurrent.futures`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from concurrent.futures import ThreadPoolExecutor\n\nwith ThreadPoolExecutor(max_workers=10) as ex:\n    futures = [ex.submit(fetch, url) for url in urls]\n    results = [f.result() for f in futures]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is a race condition and how do you prevent it?",
   "body": [
    {
     "t": "p",
     "text": "A race condition occurs when two threads access shared data concurrently and the result depends on their scheduling order. Prevent with `threading.Lock`, `threading.RLock`, or when possible avoid shared mutable state."
    }
   ]
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is a deadlock?",
   "body": [
    {
     "t": "p",
     "text": "Deadlock: Two or more threads each waiting for a lock held by another — infinite waiting. Prevention: Always acquire locks in the same order; use `threading.RLock` for re-entrant locking; use timeouts."
    }
   ]
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is Python's `__future__` module?",
   "body": [
    {
     "t": "p",
     "text": "Allows importing features from future Python versions in the current version:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from __future__ import annotations  # Postponed annotation evaluation (PEP 563)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What are Python's exception handling best practices?",
   "body": [
    {
     "t": "ul",
     "items": [
      "Catch specific exceptions, not bare `except`.",
      "Use `finally` for cleanup (or `with`).",
      "Don't suppress exceptions silently: at minimum `logger.exception(e)`.",
      "Create custom exception classes for domain errors."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is the `contextlib` module?",
   "body": [
    {
     "t": "p",
     "text": "Utilities for creating context managers:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import contextmanager\n\n@contextmanager\ndef managed_resource():\n    print(\"setup\")\n    yield resource\n    print(\"teardown\")",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is `pickle` in Python?",
   "body": [
    {
     "t": "p",
     "text": "`pickle` serializes Python objects to bytes (pickling) and deserializes back (unpickling). Used for saving models, caching, inter-process communication. Warning: never unpickle untrusted data (security risk)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is `__all__` in a Python module?",
   "body": [
    {
     "t": "p",
     "text": "`__all__` defines the public API of a module — the names exported when `from module import *` is used:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "__all__ = [\"PublicClass\", \"public_function\"]  # private_func excluded",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is `sys.argv`?",
   "body": [
    {
     "t": "p",
     "text": "`sys.argv` is a list of command-line arguments passed to the script. `sys.argv[0]` is the script name. Use `argparse` for production-grade argument parsing."
    }
   ]
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is the `__name__ == \"__main__\"` idiom?",
   "body": [
    {
     "t": "p",
     "text": "Code inside this block only executes when the script is run directly, not when imported as a module. Enables dual-use scripts (importable as a module AND runnable directly)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is the `abc` module?",
   "body": [
    {
     "t": "p",
     "text": "`abc` (Abstract Base Classes) provides `ABC` base class and `@abstractmethod` decorator to define interfaces/abstract classes that subclasses must implement."
    }
   ]
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is `os` vs `pathlib`?",
   "body": [
    {
     "t": "p",
     "text": "Both handle file system operations. `pathlib.Path` is the modern OOP approach (Python 3.4+):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from pathlib import Path\np = Path(\"data\") / \"file.csv\"   # Cross-platform path joining\np.exists(), p.stem, p.suffix    # Attribute-based inspection",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Prefer `pathlib` over `os.path` in new code."
    }
   ]
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is the `logging` module and why is it better than `print`?",
   "body": [
    {
     "t": "p",
     "text": "`logging` provides levels (DEBUG, INFO, WARNING, ERROR, CRITICAL), configurable handlers/formatters, and proper propagation. Print statements are not controlled or filterable. Use `logging.getLogger(__name__)` in every module."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Testing, Performance & Best Practices (Q81–Q100)"
    }
   ]
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is `pytest` and how does it differ from `unittest`?",
   "body": [
    {
     "t": "p",
     "text": "`pytest` is more Pythonic: uses plain `assert`, auto-discovers tests, has powerful fixtures, plug-in ecosystem. `unittest` is Java-style with `TestCase` classes and `self.assert*` methods."
    }
   ]
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What are pytest fixtures?",
   "body": [
    {
     "t": "p",
     "text": "Fixtures provide reusable test dependencies:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@pytest.fixture\ndef db_connection():\n    conn = create_connection()\n    yield conn\n    conn.close()\n\ndef test_query(db_connection):\n    result = db_connection.query(\"...\")\n    assert result is not None",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is mocking in Python tests?",
   "body": [
    {
     "t": "p",
     "text": "`unittest.mock.Mock` / `patch` replaces real objects with controlled fakes during tests:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from unittest.mock import patch\n\n@patch(\"mymodule.requests.get\")\ndef test_api_call(mock_get):\n    mock_get.return_value.json.return_value = {\"status\": \"ok\"}\n    result = fetch_data()\n    assert result[\"status\"] == \"ok\"",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is Test-Driven Development (TDD)?",
   "body": [
    {
     "t": "p",
     "text": "Write a failing test → write minimal code to pass → refactor. Red → Green → Refactor cycle. Ensures code is always testable and requirements are explicit."
    }
   ]
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What are Python's profiling tools?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`cProfile`: Built-in deterministic profiler. `python -m cProfile script.py`",
      "`line_profiler`: Line-by-line profiling.",
      "`memory_profiler`: Memory usage per line.",
      "`py-spy`: Sampling profiler for live processes."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What are common Python performance bottlenecks?",
   "body": [
    {
     "t": "p",
     "text": "Global variable lookups (prefer local), attribute chaining in loops, Python loops over large arrays (use NumPy), creating many small objects, redundant computation in loops."
    }
   ]
  },
  {
   "t": "drill",
   "n": "76",
   "q": "What is a virtual environment and why use it?",
   "body": [
    {
     "t": "p",
     "text": "A virtualenv is an isolated Python environment with its own packages, preventing conflicts between projects. Create with `python -m venv venv`. For multi-project or multi-Python management: `pyenv`, `conda`, or `uv`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is type checking with mypy?",
   "body": [
    {
     "t": "p",
     "text": "`mypy` is a static type checker for Python. It reads type annotations and reports type errors without running the code. Catches bugs early, improves code quality without runtime overhead."
    }
   ]
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is the `__init__.py` file's role?",
   "body": [
    {
     "t": "p",
     "text": "Marks a directory as a Python package. Can be empty or contains package initialization code/imports. In Python 3.3+, not strictly required (namespace packages), but including it is still conventional."
    }
   ]
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is Poetry and how does it differ from pip?",
   "body": [
    {
     "t": "p",
     "text": "Poetry is a dependency and packaging tool. It handles: dependency resolution, lock file (`poetry.lock`), virtual env management, building and publishing packages. More opinionated and feature-rich than plain pip."
    }
   ]
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is PEP 8?",
   "body": [
    {
     "t": "p",
     "text": "PEP 8 is Python's official style guide: 4-space indentation, 79-char line limit, snake_case naming, blank lines between functions/classes, docstrings for public APIs. Enforced by `flake8`, `pylint`, `black` (formatter)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is the `walrus operator` (:=) in Python 3.8+?",
   "body": [
    {
     "t": "p",
     "text": "Assignment expressions — assign and return a value in one line:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "while chunk := file.read(8192):\n    process(chunk)\n\nif (n := len(data)) > 10:\n    print(f\"Too long: {n}\")",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What are structural pattern matching (match/case) in Python 3.10+?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "match command:\n    case \"quit\":        exit()\n    case \"hello\" | \"hi\": print(\"Hello!\")\n    case {\"action\": action, \"data\": data}: handle(action, data)\n    case _:             print(\"Unknown\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "More powerful than if/elif chains; supports destructuring."
    }
   ]
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is `__pycache__` and `.pyc` files?",
   "body": [
    {
     "t": "p",
     "text": "Python compiles source files to bytecode (`.pyc`) cached in `__pycache__`. On subsequent runs, Python loads bytecode directly (faster) if the source hasn't changed. Safe to delete (auto-regenerated)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is `importlib` and dynamic imports?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import importlib\nmodule = importlib.import_module(\"mypackage.mymodule\")\ncls = getattr(module, \"MyClass\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Useful for plugin architectures and dynamic loading."
    },
    {
     "t": "disclose",
     "summary": "The same question, answered a second way",
     "body": [
      {
       "t": "code",
       "lang": "python",
       "code": "import importlib\n\nmodule_name = \"json\"   # Could be user input\nmodule = importlib.import_module(module_name)\nmodule.dumps({\"key\": \"value\"})\n\n# Reload a module after source changes:\nimportlib.reload(module)",
       "numbered": false
      },
      {
       "t": "p",
       "text": "Used in plugin systems, test fixtures, and dynamic configuration."
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is `slots` and when does it save memory?",
   "body": [
    {
     "t": "p",
     "text": "Without `__slots__`, every instance has a `__dict__` (typically 200–400 bytes overhead). `__slots__` removes this dict, reducing per-instance memory. Significant for classes with millions of instances."
    }
   ]
  },
  {
   "t": "drill",
   "n": "86",
   "q": "How does Python's `sorted` achieve stability?",
   "body": [
    {
     "t": "p",
     "text": "Python uses Timsort — a stable, adaptive sorting algorithm derived from merge sort and insertion sort. Stable means equal elements maintain their original relative order."
    }
   ]
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the `functools.cache` decorator (Python 3.9+)?",
   "body": [
    {
     "t": "p",
     "text": "`@functools.cache` is `@lru_cache(maxsize=None)` — unbounded memoization. Simpler to write; use when the input space is finite and all cached values should be kept."
    }
   ]
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What are Python's `__enter__` and `__exit__` protocol methods?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class Timer:\n    def __enter__(self):\n        self.start = time.time()\n        return self\n\n    def __exit__(self, exc_type, exc_val, exc_tb):\n        self.elapsed = time.time() - self.start\n        return False  # Re-raise exceptions\n\nwith Timer() as t:\n    do_work()\nprint(t.elapsed)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is `Pydantic` and why is it popular in Python?",
   "body": [
    {
     "t": "p",
     "text": "Pydantic provides data validation and serialization using type annotations:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from pydantic import BaseModel, validator\n\nclass User(BaseModel):\n    name: str\n    age: int\n    email: str\n\nuser = User(name=\"Alice\", age=30, email=\"alice@example.com\")\nuser.model_dump()   # → dict\nuser.model_json()   # → JSON string",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Used extensively in FastAPI, LangChain, AI pipelines for validated data models."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Advanced Python Internals (Q101–Q120)"
    }
   ]
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the Python memory model and reference counting?",
   "body": [
    {
     "t": "p",
     "text": "Python uses reference counting as the primary garbage collection mechanism. Each object maintains a count of references pointing to it. When the count reaches 0, the object is deallocated:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nx = [1, 2, 3]\nprint(sys.getrefcount(x))  # Reference count (includes the getrefcount arg itself)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "The cyclic garbage collector handles reference cycles that reference counting misses."
    }
   ]
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is `__slots__` and when should you use it?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class Point:\n    __slots__ = (\"x\", \"y\")  # No __dict__ created\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Benefits: ~40% memory reduction per instance (no dict overhead), faster attribute access. Drawback: Cannot add arbitrary attributes, cannot use weak references without `__weakref__` in slots."
    }
   ]
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is the difference between `id()`, `is`, and `==`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`id(obj)`: Returns the memory address of the object.",
      "`is`: Tests identity (same object in memory) — uses `id()` comparison.",
      "`==`: Tests equality (uses `__eq__`)."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = [1, 2, 3]\nb = [1, 2, 3]\na == b    # True (equal values)\na is b    # False (different objects)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is interning in Python?",
   "body": [
    {
     "t": "p",
     "text": "Python caches small integers (-5 to 256) and short strings that look like identifiers. These objects are reused:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = 256; b = 256; a is b  # True (interned)\na = 257; b = 257; a is b  # False (not interned) — CPython implementation detail",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Never rely on interning for equality checks. Always use `==`."
    }
   ]
  }
 ],
 "takeaways": []
});

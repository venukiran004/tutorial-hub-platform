/* ============================================================================
   INTERVIEW: LANGUAGE DEPTH i2.1 — Decorators & Closures
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.1",
 "lede": "**19 interview questions on decorators & closures**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 19 questions on decorators & closures without prompting",
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
   "q": "What is a closure and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "A **closure** is a nested function that captures and remembers variables from its enclosing scope even after the outer function has finished executing."
    },
    {
     "t": "p",
     "text": "**Three requirements:** 1. A nested (inner) function exists. 2. The inner function references a free variable from the enclosing scope. 3. The outer function returns the inner function."
    },
    {
     "t": "p",
     "text": "**How it works internally:** - Python stores captured variables in **cell objects** (not direct copies). - The closure holds references to these cell objects via `func.__closure__`. - The cell object points to the **variable itself** (capture by reference), so if the variable changes, the closure sees the updated value."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def outer(x):\n    def inner():\n        return x       # x is a free variable\n    return inner\n\nfn = outer(10)\nprint(fn())                                # 10\nprint(fn.__closure__[0].cell_contents)     # 10\nprint(fn.__code__.co_freevars)             # ('x',)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key point:** If the outer variable is reassigned before the closure is called, the closure sees the new value — this is the root cause of the \"late binding\" gotcha in loops."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is a decorator? How is `@decorator` syntax desugared?",
   "body": [
    {
     "t": "p",
     "text": "A **decorator** is any callable that takes a function (or class) as input and returns a modified or wrapped version."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# This:\n@my_decorator\ndef func():\n    pass\n\n# Is syntactic sugar for:\nfunc = my_decorator(func)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "A decorator with arguments adds one more level:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# This:\n@my_decorator(arg)\ndef func():\n    pass\n\n# Desugars to:\nfunc = my_decorator(arg)(func)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "The standard decorator pattern:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import functools\n\ndef my_decorator(func):\n    @functools.wraps(func)\n    def wrapper(*args, **kwargs):\n        # pre-processing\n        result = func(*args, **kwargs)\n        # post-processing\n        return result\n    return wrapper",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Why do we need `functools.wraps`?",
   "body": [
    {
     "t": "p",
     "text": "Without `@functools.wraps`, the decorated function loses its original identity:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def deco(func):\n    def wrapper(*args, **kwargs):\n        return func(*args, **kwargs)\n    return wrapper\n\n@deco\ndef greet():\n    \"\"\"Say hello.\"\"\"\n    pass\n\nprint(greet.__name__)   # 'wrapper'  ← WRONG\nprint(greet.__doc__)    # None       ← WRONG",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`@functools.wraps(func)` copies these attributes from the original function to the wrapper:"
    },
    {
     "t": "table",
     "head": [
      "Attribute",
      "Purpose"
     ],
     "rows": [
      [
       "`__name__`",
       "Function name"
      ],
      [
       "`__doc__`",
       "Docstring"
      ],
      [
       "`__module__`",
       "Module where defined"
      ],
      [
       "`__qualname__`",
       "Qualified name"
      ],
      [
       "`__dict__`",
       "Function attributes"
      ],
      [
       "`__wrapped__`",
       "Reference to original (added by wraps)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "This matters for: - **Debugging** — tracebacks show the real function name - **Documentation** — `help()` shows correct docstrings - **Introspection** — tools like `inspect` work correctly - **Testing** — you can access the original via `func.__wrapped__`"
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "How to write a decorator with arguments?",
   "body": [
    {
     "t": "p",
     "text": "Use **three levels of nesting**: decorator factory → decorator → wrapper."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import functools\n\ndef repeat(n):                        # Level 1: factory (captures args)\n    def decorator(func):              # Level 2: actual decorator\n        @functools.wraps(func)\n        def wrapper(*args, **kwargs):  # Level 3: wrapper\n            for _ in range(n):\n                result = func(*args, **kwargs)\n            return result\n        return wrapper\n    return decorator\n\n@repeat(3)        # repeat(3) returns decorator, decorator wraps greet\ndef greet():\n    print(\"hi\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Step-by-step:** 1. `repeat(3)` → returns `decorator` with `n=3` in closure 2. `@decorator` applied to `greet` → `decorator(greet)` → returns `wrapper` 3. `greet` now points to `wrapper`"
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the difference between function-based and class-based decorators?",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "Function-based",
      "Class-based"
     ],
     "rows": [
      [
       "Structure",
       "Nested functions",
       "`__init__` + `__call__`"
      ],
      [
       "State",
       "Via closure variables or function attributes",
       "Via instance attributes"
      ],
      [
       "Readability",
       "Simpler for stateless decorators",
       "Cleaner for stateful decorators"
      ],
      [
       "Metadata",
       "`@functools.wraps(func)`",
       "`functools.update_wrapper(self, func)`"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Function-based:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def my_deco(func):\n    @functools.wraps(func)\n    def wrapper(*args, **kwargs):\n        return func(*args, **kwargs)\n    return wrapper",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Class-based:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class MyDeco:\n    def __init__(self, func):\n        functools.update_wrapper(self, func)\n        self.func = func\n        self.call_count = 0     # easy stateful tracking\n\n    def __call__(self, *args, **kwargs):\n        self.call_count += 1\n        return self.func(*args, **kwargs)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use class-based:** - When the decorator needs to maintain **complex state** across calls - When you want to expose **additional methods/attributes** on the decorated function - When the decorator needs to implement **protocols** (e.g., descriptor)"
    },
    {
     "t": "p",
     "text": "**Caveat:** Class-based decorators don't work as-is for decorating **methods** (because `self` binding breaks). You'd need to implement `__get__` (descriptor protocol) to handle this."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How does decorator stacking work? What's the execution order?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "@A\n@B\n@C\ndef func(): ...\n\n# Equivalent to:\nfunc = A(B(C(func)))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Decoration order:** Bottom-up (C first, then B, then A). **Execution order:** Top-down (A's wrapper runs first, calls B's wrapper, which calls C's wrapper, which calls original func)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def d1(func):\n    def wrapper():\n        print(\"d1 before\")\n        func()\n        print(\"d1 after\")\n    return wrapper\n\ndef d2(func):\n    def wrapper():\n        print(\"d2 before\")\n        func()\n        print(\"d2 after\")\n    return wrapper\n\n@d1\n@d2\ndef hello():\n    print(\"hello\")\n\nhello()\n# d1 before\n# d2 before\n# hello\n# d2 after\n# d1 after",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Think of it like **layers of an onion** — the outermost decorator wraps everything."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is `@property` and how does it use descriptors?",
   "body": [
    {
     "t": "p",
     "text": "`@property` turns a method into an attribute-style accessor. Internally, it's a **data descriptor** that implements `__get__`, `__set__`, and `__delete__`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Circle:\n    def __init__(self, r):\n        self._r = r\n\n    @property\n    def radius(self):          # getter (read)\n        return self._r\n\n    @radius.setter\n    def radius(self, value):   # setter (write)\n        if value < 0:\n            raise ValueError(\"Negative radius\")\n        self._r = value\n\n    @radius.deleter\n    def radius(self):          # deleter\n        del self._r\n\n    @property\n    def area(self):            # read-only computed property\n        return 3.14159 * self._r ** 2",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Under the hood**, `property` is roughly equivalent to:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class property:\n    def __init__(self, fget=None, fset=None, fdel=None):\n        self.fget = fget\n        self.fset = fset\n        self.fdel = fdel\n\n    def __get__(self, obj, objtype=None):\n        return self.fget(obj)\n\n    def __set__(self, obj, value):\n        self.fset(obj, value)\n\n    def setter(self, fset):\n        return type(self)(self.fget, fset, self.fdel)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "It uses the **descriptor protocol** — Python calls `__get__`/`__set__` automatically when you access/assign the attribute."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Difference between `@staticmethod` and `@classmethod`?",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "`@staticmethod`",
      "`@classmethod`"
     ],
     "rows": [
      [
       "First argument",
       "None",
       "`cls` (the class)"
      ],
      [
       "Access instance (`self`)?",
       "No",
       "No"
      ],
      [
       "Access class (`cls`)?",
       "No",
       "Yes"
      ],
      [
       "Inheritance-aware?",
       "No",
       "Yes — `cls` is the actual subclass"
      ],
      [
       "Use case",
       "Utility/helper functions",
       "Factory methods, alternative constructors"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Date:\n    def __init__(self, year, month, day):\n        self.year, self.month, self.day = year, month, day\n\n    @classmethod\n    def from_string(cls, date_str):\n        \"\"\"Factory method — works with subclasses too.\"\"\"\n        y, m, d = map(int, date_str.split(\"-\"))\n        return cls(y, m, d)          # cls, not Date — polymorphic\n\n    @staticmethod\n    def is_valid(date_str):\n        \"\"\"Pure utility — no access to class or instance.\"\"\"\n        try:\n            y, m, d = map(int, date_str.split(\"-\"))\n            return 1 <= m <= 12 and 1 <= d <= 31\n        except ValueError:\n            return False",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key distinction:** `@classmethod` receives `cls`, so it respects inheritance. If a subclass calls `Date.from_string(...)`, `cls` is the subclass — `@staticmethod` wouldn't know about the subclass."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is `@lru_cache` and how does it work internally?",
   "body": [
    {
     "t": "p",
     "text": "`@functools.lru_cache(maxsize=128)` is a memoization decorator that caches function results based on arguments."
    },
    {
     "t": "p",
     "text": "**How it works:** 1. Arguments are hashed to create a cache key (arguments must be **hashable**). 2. Results are stored in a **dictionary**. 3. When `maxsize` is reached, the **Least Recently Used** entry is evicted (using a doubly-linked list for O(1) eviction). 4. `maxsize=None` → unbounded cache (equivalent to `@functools.cache` in 3.9+)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import lru_cache\n\n@lru_cache(maxsize=128)\ndef fibonacci(n):\n    if n < 2:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\nprint(fibonacci(100))           # instant\nprint(fibonacci.cache_info())   # CacheInfo(hits=98, misses=101, ...)\nfibonacci.cache_clear()         # clear cache",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Caveats:** - All arguments must be **hashable** (no lists, dicts, sets). - Cache can grow large for unbounded caches — potential memory leak. - Not thread-safe for cache misses in Python < 3.9 (fixed in 3.9+). - `@lru_cache` on **methods** caches `self` as a key — can prevent garbage collection. Use `@functools.cached_property` for instance-level caching instead."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is `@singledispatch`? How is it different from method overloading?",
   "body": [
    {
     "t": "p",
     "text": "`@functools.singledispatch` implements **single-dispatch generic functions** — function overloading based on the **type of the first argument**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import singledispatch\n\n@singledispatch\ndef process(data):\n    raise TypeError(f\"Unsupported: {type(data)}\")\n\n@process.register(int)\ndef _(data):\n    return data * 2\n\n@process.register(str)\ndef _(data):\n    return data.upper()\n\nprocess(5)       # 10\nprocess(\"hi\")    # \"HI\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key differences from traditional overloading:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Method Overloading (Java/C++)",
      "`@singledispatch`"
     ],
     "rows": [
      [
       "Dispatch based on",
       "All argument types (compile-time)",
       "First argument type only (runtime)"
      ],
      [
       "Resolution time",
       "Compile-time (static)",
       "Runtime (dynamic)"
      ],
      [
       "Extensible?",
       "No (closed)",
       "Yes — register new types anytime"
      ],
      [
       "Works with inheritance?",
       "Yes",
       "Yes — dispatches to most specific registered type"
      ]
     ]
    },
    {
     "t": "p",
     "text": "For **method** dispatch based on `self`, use `@functools.singledispatchmethod` (Python 3.8+)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "How do closures capture variables? By reference or value?",
   "body": [
    {
     "t": "p",
     "text": "Python closures capture variables **by reference** (more precisely, by sharing the cell object that wraps the variable)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def outer():\n    x = 10\n    def inner():\n        return x\n    x = 20        # changed AFTER inner is defined\n    return inner\n\nprint(outer()())   # 20 — NOT 10!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "The closure doesn't copy `x`'s value at definition time; it holds a reference to the same cell object. When `inner()` is called, it looks up the **current** value of `x`."
    },
    {
     "t": "p",
     "text": "**This causes the classic loop gotcha:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "funcs = [lambda: i for i in range(5)]\nprint([f() for f in funcs])   # [4, 4, 4, 4, 4] — all share the same 'i'",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Fix — capture by value using default argument:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "funcs = [lambda i=i: i for i in range(5)]\nprint([f() for f in funcs])   # [0, 1, 2, 3, 4]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "How to create a decorator that works both with and without arguments?",
   "body": [
    {
     "t": "p",
     "text": "Use a sentinel pattern where `func` has a default value of `None`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import functools\n\ndef decorator(func=None, *, retries=3, verbose=False):\n    def actual_decorator(fn):\n        @functools.wraps(fn)\n        def wrapper(*args, **kwargs):\n            for attempt in range(retries):\n                try:\n                    if verbose:\n                        print(f\"Attempt {attempt + 1}\")\n                    return fn(*args, **kwargs)\n                except Exception:\n                    if attempt == retries - 1:\n                        raise\n        return wrapper\n\n    if func is not None:\n        # Called as @decorator (no parens)\n        return actual_decorator(func)\n    # Called as @decorator() or @decorator(retries=5)\n    return actual_decorator",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@decorator                      # works\ndef a(): ...\n\n@decorator()                    # works\ndef b(): ...\n\n@decorator(retries=5)           # works\ndef c(): ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**How it works:** - `@decorator` → `func` receives the function → returns `actual_decorator(func)` immediately - `@decorator()` → `func` is `None` → returns `actual_decorator` → Python then calls `actual_decorator(b)` - `@decorator(retries=5)` → `func` is `None`, `retries=5` → returns `actual_decorator`"
    },
    {
     "t": "p",
     "text": "The `*` before keyword arguments forces them to be keyword-only, preventing `@decorator(some_func)` from being misinterpreted."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is `@total_ordering`?",
   "body": [
    {
     "t": "p",
     "text": "`@functools.total_ordering` is a class decorator that auto-generates the missing rich comparison methods (`__lt__`, `__le__`, `__gt__`, `__ge__`) given `__eq__` and **one** of the ordering methods."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import total_ordering\n\n@total_ordering\nclass Priority:\n    def __init__(self, level):\n        self.level = level\n\n    def __eq__(self, other):\n        return self.level == other.level\n\n    def __lt__(self, other):\n        return self.level < other.level\n\n# Now all 6 comparisons work:\np1, p2 = Priority(1), Priority(2)\nprint(p1 < p2)    # True  (defined)\nprint(p1 <= p2)   # True  (auto-generated)\nprint(p1 > p2)    # False (auto-generated)\nprint(p1 >= p2)   # False (auto-generated)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Trade-off:** The auto-generated methods are **slower** than manually implemented ones because they use combinations of the provided methods. For performance-critical code, implement all comparisons manually."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "How to implement a retry decorator with exponential backoff?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import functools\nimport time\nimport random\n\ndef retry(max_retries=3, base_delay=1.0, backoff=2.0,\n          exceptions=(Exception,), jitter=True):\n    def decorator(func):\n        @functools.wraps(func)\n        def wrapper(*args, **kwargs):\n            delay = base_delay\n            for attempt in range(1, max_retries + 1):\n                try:\n                    return func(*args, **kwargs)\n                except exceptions as e:\n                    if attempt == max_retries:\n                        raise\n                    sleep = delay + (random.uniform(0, delay * 0.5) if jitter else 0)\n                    print(f\"Attempt {attempt} failed ({e}). \"\n                          f\"Retrying in {sleep:.2f}s...\")\n                    time.sleep(sleep)\n                    delay *= backoff      # exponential increase\n        return wrapper\n    return decorator",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Design decisions:** - **Exponential backoff** — delay doubles each time (1s → 2s → 4s → 8s) - **Jitter** — random offset prevents thundering herd when many clients retry simultaneously - **Exception whitelist** — only retry specific, retryable exceptions - **Max retries** — prevent infinite loops; re-raise on last failure"
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is the descriptor protocol and how do property decorators use it?",
   "body": [
    {
     "t": "p",
     "text": "The **descriptor protocol** defines how attribute access is customized. A descriptor is any object that implements `__get__`, `__set__`, and/or `__delete__`."
    },
    {
     "t": "table",
     "head": [
      "Type",
      "Methods",
      "Example"
     ],
     "rows": [
      [
       "**Non-data descriptor**",
       "`__get__` only",
       "`staticmethod`, `classmethod`, regular functions"
      ],
      [
       "**Data descriptor**",
       "`__get__` + `__set__` (and/or `__delete__`)",
       "`property`"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Lookup order (data descriptors win):** 1. Data descriptors on the class 2. Instance `__dict__` 3. Non-data descriptors on the class"
    },
    {
     "t": "p",
     "text": "**How `property` uses it:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class property:\n    \"\"\"Simplified implementation.\"\"\"\n    def __init__(self, fget=None, fset=None, fdel=None):\n        self.fget, self.fset, self.fdel = fget, fset, fdel\n\n    def __get__(self, obj, objtype=None):\n        if obj is None:\n            return self\n        return self.fget(obj)\n\n    def __set__(self, obj, value):\n        if self.fset is None:\n            raise AttributeError(\"can't set\")\n        self.fset(obj, value)\n\n    def __delete__(self, obj):\n        if self.fdel is None:\n            raise AttributeError(\"can't delete\")\n        self.fdel(obj)\n\n    def setter(self, fset):\n        return type(self)(self.fget, fset, self.fdel)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "When you do `obj.attr`, Python checks if `type(obj).attr` is a data descriptor (has `__set__`). If yes, it calls `descriptor.__get__(obj, type(obj))` instead of returning `obj.__dict__['attr']`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Can you decorate a class? Give an example.",
   "body": [
    {
     "t": "p",
     "text": "Yes. A class decorator takes a class, modifies or wraps it, and returns a class (or callable)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Example 1: Add methods/attributes\ndef add_timestamp(cls):\n    \"\"\"Add a created_at attribute to every instance.\"\"\"\n    import time\n    original_init = cls.__init__\n\n    def new_init(self, *args, **kwargs):\n        original_init(self, *args, **kwargs)\n        self.created_at = time.time()\n\n    cls.__init__ = new_init\n    return cls\n\n@add_timestamp\nclass User:\n    def __init__(self, name):\n        self.name = name\n\nu = User(\"Alice\")\nprint(u.created_at)   # 1717420800.123",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Example 2: Registry pattern\nregistry = {}\n\ndef register(cls):\n    registry[cls.__name__] = cls\n    return cls\n\n@register\nclass ModelA: ...\n\n@register\nclass ModelB: ...\n\n# registry == {'ModelA': <class 'ModelA'>, 'ModelB': <class 'ModelB'>}",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Example 3: Enforce interface\ndef require_methods(*methods):\n    def decorator(cls):\n        for method in methods:\n            if not callable(getattr(cls, method, None)):\n                raise TypeError(f\"{cls.__name__} must implement {method}()\")\n        return cls\n    return decorator\n\n@require_methods(\"save\", \"load\")\nclass MyModel:\n    def save(self): ...\n    def load(self): ...",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is `@contextmanager` decorator?",
   "body": [
    {
     "t": "p",
     "text": "`@contextlib.contextmanager` converts a **generator function** into a **context manager** (usable with `with` statement) without needing to write a class with `__enter__` and `__exit__`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import contextmanager\n\n@contextmanager\ndef open_file(path, mode):\n    f = open(path, mode)\n    try:\n        yield f           # value yielded is bound to 'as' variable\n    finally:\n        f.close()         # cleanup — always runs\n\nwith open_file(\"data.txt\", \"w\") as f:\n    f.write(\"hello\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**How it works:** 1. Code **before** `yield` → equivalent to `__enter__` 2. `yield value` → `value` is returned to `as` variable 3. Code **after** `yield` (in `finally`) → equivalent to `__exit__`"
    },
    {
     "t": "p",
     "text": "**Important:** - The generator must yield **exactly once**. - Exceptions inside the `with` block are re-raised at the `yield` point, so use `try/finally` or `try/except` around `yield`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "How to preserve type hints through decorators? (`ParamSpec`)",
   "body": [
    {
     "t": "p",
     "text": "Before Python 3.10, decorated functions lost their type signatures from the perspective of type checkers. `ParamSpec` (PEP 612) solves this."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Callable, ParamSpec, TypeVar\nimport functools\n\nP = ParamSpec(\"P\")       # captures parameter specification\nT = TypeVar(\"T\")         # captures return type\n\ndef logged(func: Callable[P, T]) -> Callable[P, T]:\n    @functools.wraps(func)\n    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:\n        print(f\"Calling {func.__name__}\")\n        return func(*args, **kwargs)\n    return wrapper\n\n@logged\ndef add(a: int, b: int) -> int:\n    return a + b\n\n# Type checker knows: add(a: int, b: int) -> int ← preserved!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Without `ParamSpec`**, the type checker would see `wrapper(*args: Any, **kwargs: Any) -> Any` and lose all type information."
    },
    {
     "t": "p",
     "text": "**For Python 3.8-3.9**, use `typing_extensions`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing_extensions import ParamSpec",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What are practical real-world uses of decorators?",
   "body": [
    {
     "t": "table",
     "head": [
      "Category",
      "Decorator",
      "Real-World Example"
     ],
     "rows": [
      [
       "**Web routing**",
       "`@app.route(\"/\")`",
       "Flask, FastAPI, Django"
      ],
      [
       "**Authentication**",
       "`@login_required`",
       "Django, Flask-Login"
      ],
      [
       "**Authorization**",
       "`@require_role(\"admin\")`",
       "Custom RBAC"
      ],
      [
       "**Caching**",
       "`@lru_cache`, `@cache`",
       "Expensive computations, API responses"
      ],
      [
       "**Logging**",
       "`@log_calls`",
       "Audit trails, debugging"
      ],
      [
       "**Timing**",
       "`@timer`",
       "Performance profiling"
      ],
      [
       "**Retry**",
       "`@retry(max=3)`",
       "Network calls, API requests"
      ],
      [
       "**Validation**",
       "`@validate_input`",
       "Input sanitization"
      ],
      [
       "**Rate limiting**",
       "`@rate_limit(100, 60)`",
       "API throttling"
      ],
      [
       "**Deprecation**",
       "`@deprecated(\"Use X\")`",
       "Library version management"
      ],
      [
       "**Singleton**",
       "`@singleton`",
       "Database connections, configs"
      ],
      [
       "**Testing**",
       "`@pytest.fixture`, `@mock.patch`",
       "Test setup and mocking"
      ],
      [
       "**Serialization**",
       "`@dataclass`",
       "Data models"
      ],
      [
       "**Threading**",
       "`@synchronized`",
       "Thread-safe operations"
      ],
      [
       "**Context management**",
       "`@contextmanager`",
       "Resource management"
      ],
      [
       "**Type checking**",
       "`@overload`, `@runtime_checkable`",
       "Static analysis"
      ],
      [
       "**Registration**",
       "`@register`",
       "Plugin systems, signal handlers"
      ],
      [
       "**Permissions**",
       "`@permission_required`",
       "Fine-grained access control"
      ],
      [
       "**Tracing**",
       "`@trace`",
       "Distributed tracing (OpenTelemetry)"
      ],
      [
       "**Error handling**",
       "`@handle_exceptions`",
       "Centralized error management"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Example: FastAPI combines multiple decorator concepts:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from fastapi import FastAPI, Depends\n\napp = FastAPI()\n\ndef verify_token(token: str):\n    if token != \"secret\":\n        raise HTTPException(401)\n\n@app.get(\"/users/{user_id}\")     # routing decorator\n@cache(expire=60)                # caching decorator\nasync def get_user(\n    user_id: int,\n    token: str = Depends(verify_token)   # dependency injection (decorator-like)\n):\n    return {\"user_id\": user_id}",
     "numbered": false
    }
   ]
  }
 ],
 "takeaways": []
});

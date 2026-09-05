/* ============================================================================
   INTERVIEW: LANGUAGE CORE i1.7 — Functions & Scope
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.7",
 "lede": "**20 interview questions on functions & scope**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 20 questions on functions & scope without prompting",
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
   "q": "What is the LEGB scope rule?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "LEGB defines the **order** Python uses to resolve variable names:"
    },
    {
     "t": "table",
     "head": [
      "Letter",
      "Scope",
      "Where"
     ],
     "rows": [
      [
       "**L**",
       "Local",
       "Inside the current function"
      ],
      [
       "**E**",
       "Enclosing",
       "Inside outer function(s) — for nested functions"
      ],
      [
       "**G**",
       "Global",
       "Module level (top of the `.py` file)"
      ],
      [
       "**B**",
       "Built-in",
       "Python's `builtins` module (`print`, `len`, `range`, etc.)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "Python searches **L → E → G → B** in order. The first match wins."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "x = \"global\"\n\ndef outer():\n    x = \"enclosing\"\n    \n    def inner():\n        x = \"local\"\n        print(x)     # \"local\" — found in L\n    \n    inner()\n    print(x)         # \"enclosing\" — found in E (from outer's perspective, L)\n\nouter()\nprint(x)             # \"global\" — found in G",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key points:** - Reading a variable follows LEGB lookup. - **Assigning** to a variable in a function makes it **local** (unless `global`/`nonlocal` is declared). - `global` keyword lets you modify a G-scope variable from inside a function. - `nonlocal` keyword lets you modify an E-scope variable from a nested function."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the difference between `*args` and `**kwargs`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`*args`",
      "`**kwargs`"
     ],
     "rows": [
      [
       "Collects",
       "Extra **positional** arguments",
       "Extra **keyword** arguments"
      ],
      [
       "Type",
       "`tuple`",
       "`dict`"
      ],
      [
       "Syntax in def",
       "`def f(*args)`",
       "`def f(**kwargs)`"
      ],
      [
       "Syntax in call",
       "`f(1, 2, 3)`",
       "`f(a=1, b=2)`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def demo(*args, **kwargs):\n    print(f\"args = {args}\")       # tuple\n    print(f\"kwargs = {kwargs}\")   # dict\n\ndemo(1, 2, 3, name=\"Alice\", age=30)\n# args = (1, 2, 3)\n# kwargs = {'name': 'Alice', 'age': 30}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Common use cases:** - Wrapper/decorator functions that forward all arguments - Functions that accept flexible input - `*args` for variable-length positional data (like `print()`) - `**kwargs` for optional configuration options"
    },
    {
     "t": "p",
     "text": "**Parameter order rule:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def func(regular, *args, keyword_only, **kwargs):\n    ...",
     "numbered": false
    },
    {
     "t": "disclose",
     "summary": "The same question, answered a second way",
     "body": [
      {
       "t": "ul",
       "items": [
        "`*args`: Collects extra positional arguments into a tuple.",
        "`**kwargs`: Collects extra keyword arguments into a dict."
       ]
      },
      {
       "t": "code",
       "lang": "python",
       "code": "def func(*args, **kwargs):\n    print(args)    # tuple\n    print(kwargs)  # dict",
       "numbered": false
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What are closures in Python?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A **closure** is a nested function that **captures and remembers** variables from its enclosing scope, even after the outer function has returned."
    },
    {
     "t": "p",
     "text": "**Three requirements:** 1. A nested (inner) function exists. 2. The inner function references variables from the outer function. 3. The outer function returns the inner function."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def make_multiplier(factor):\n    def multiply(x):\n        return x * factor    # 'factor' is captured from enclosing scope\n    return multiply\n\ndouble = make_multiplier(2)\ntriple = make_multiplier(3)\n\nprint(double(10))   # 20 — factor=2 is remembered\nprint(triple(10))   # 30 — factor=3 is remembered",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**How it works internally:** - Captured variables are stored in **cell objects**. - Accessible via `func.__closure__`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "print(double.__closure__[0].cell_contents)  # 2",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Important:** Closures capture variables **by reference**, not by value. This leads to the late-binding gotcha in loops."
    },
    {
     "t": "p",
     "text": "**Use cases:** Decorators, factory functions, callbacks, encapsulating state without classes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is the mutable default argument problem and how to fix it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**The problem:** Default parameter values are evaluated **once** at function definition time and reused across all calls. If the default is a mutable object (list, dict, set), mutations persist between calls."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# BUG\ndef add_item(item, items=[]):\n    items.append(item)\n    return items\n\nprint(add_item(\"a\"))  # ['a']\nprint(add_item(\"b\"))  # ['a', 'b']  ← unexpected! Expected ['b']\nprint(add_item(\"c\"))  # ['a', 'b', 'c']",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why?** The default list `[]` is created once. `items` points to the same list object on every call."
    },
    {
     "t": "p",
     "text": "**The fix — use `None` as sentinel:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def add_item(item, items=None):\n    if items is None:\n        items = []       # new list each call\n    items.append(item)\n    return items\n\nprint(add_item(\"a\"))  # ['a']\nprint(add_item(\"b\"))  # ['b'] ✓",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Interview tip:** You can verify the bug by checking `add_item.__defaults__`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def buggy(items=[]):\n    items.append(1)\n    return items\n\nbuggy()\nprint(buggy.__defaults__)  # ([1],) — the default has been mutated!",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Difference between `global` and `nonlocal` keywords?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`global`",
      "`nonlocal`"
     ],
     "rows": [
      [
       "**Target scope**",
       "Module (global) scope",
       "Nearest enclosing function scope"
      ],
      [
       "**Can reach global?**",
       "Yes",
       "No — only enclosing function scopes"
      ],
      [
       "**Used in**",
       "Any function",
       "Only nested functions"
      ],
      [
       "**Variable must exist?**",
       "No (creates it if needed)",
       "Yes (must exist in enclosing scope)"
      ],
      [
       "**Python version**",
       "All",
       "3.0+"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "g = \"global\"\n\ndef outer():\n    e = \"enclosing\"\n    \n    def inner():\n        global g\n        nonlocal e\n        g = \"modified_global\"\n        e = \"modified_enclosing\"\n    \n    inner()\n    print(f\"e = {e}\")   # modified_enclosing\n\nouter()\nprint(f\"g = {g}\")       # modified_global",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use:** - `global`: Rarely — accessing/modifying module-level state (counters, caches). Generally considered a code smell. - `nonlocal`: In closures when you need to mutate the enclosing variable (e.g., counter closures)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What are first-class functions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "In Python, functions are **first-class objects** (also called first-class citizens). This means functions:"
    },
    {
     "t": "ol",
     "items": [
      "**Can be assigned to variables:**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "greet = lambda name: f\"Hello, {name}\"",
     "numbered": false
    },
    {
     "t": "ol",
     "items": [
      "**Can be stored in data structures:**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "ops = [str.upper, str.lower, str.title]",
     "numbered": false
    },
    {
     "t": "ol",
     "items": [
      "**Can be passed as arguments to other functions:**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "sorted(names, key=str.lower)",
     "numbered": false
    },
    {
     "t": "ol",
     "items": [
      "**Can be returned from other functions:**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def make_adder(n):\n    return lambda x: x + n",
     "numbered": false
    },
    {
     "t": "ol",
     "items": [
      "**Have attributes** (`__name__`, `__doc__`, `__annotations__`, `__closure__`, etc.)"
     ]
    },
    {
     "t": "p",
     "text": "**Why it matters:** First-class functions enable higher-order functions, closures, decorators, and functional programming patterns."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is a higher-order function?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A function that either: - **Takes** one or more functions as arguments, or - **Returns** a function"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Takes a function as argument\ndef apply(func, values):\n    return [func(v) for v in values]\n\nprint(apply(str.upper, [\"hello\", \"world\"]))  # ['HELLO', 'WORLD']\n\n# Returns a function\ndef make_power(n):\n    return lambda x: x ** n\n\nsquare = make_power(2)\nprint(square(5))  # 25",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Built-in higher-order functions:** `map()`, `filter()`, `sorted()` (with `key`), `functools.reduce()`, `min()`/`max()` (with `key`)."
    },
    {
     "t": "p",
     "text": "**Decorators** are a common application — they are higher-order functions that take a function and return an enhanced version of it."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "How does Python handle recursion? (No tail call optimization)",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "Python supports recursion but has a **default recursion limit of 1000** (`sys.getrecursionlimit()`).",
      "Exceeding it raises `RecursionError`.",
      "Python **does not optimize tail recursion** (by design — Guido chose to preserve readable tracebacks)."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nprint(sys.getrecursionlimit())  # 1000\n\ndef factorial(n):\n    if n <= 1: return 1\n    return n * factorial(n - 1)\n\nfactorial(999)    # OK\n# factorial(5000) # RecursionError",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Practical implications:** - For deep recursion, convert to **iteration** (often using an explicit stack). - Use `sys.setrecursionlimit(N)` sparingly — large values can cause segfaults. - Use `@functools.lru_cache` to memoize and avoid redundant recursive calls (e.g., Fibonacci)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\n\nprint(fib(100))  # Instant — O(n) with memoization",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is `functools.lru_cache` and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`lru_cache` is a **decorator** that caches (memoizes) function return values based on the arguments. LRU = Least Recently Used — when the cache is full, the least recently used entry is evicted."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import lru_cache\n\n@lru_cache(maxsize=128)  # cache up to 128 unique argument combinations\ndef expensive(n):\n    print(f\"Computing {n}\")\n    return n ** 2\n\nexpensive(4)   # Computing 4 → 16\nexpensive(4)   # Cached → 16 (no print)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key details:** - `maxsize=None` → unlimited cache (use `@functools.cache` in Python 3.9+). - Arguments must be **hashable** (no lists or dicts as args). - `.cache_info()` returns hits, misses, maxsize, current size. - `.cache_clear()` empties the cache. - Thread-safe for lookups. - Best for **pure functions** (same input → same output, no side effects)."
    },
    {
     "t": "p",
     "text": "**Classic use case — Fibonacci:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@lru_cache(maxsize=None)\ndef fib(n):\n    return n if n <= 1 else fib(n-1) + fib(n-2)\n# Without cache: O(2^n). With cache: O(n).",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What are positional-only and keyword-only arguments?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Positional-only** (before `/`, Python 3.8+): Must be passed by position."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def func(a, b, /):\n    return a + b\n\nfunc(1, 2)       # OK\n# func(a=1, b=2) # TypeError",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Keyword-only** (after `*`): Must be passed by name."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def func(*, key, value):\n    return {key: value}\n\nfunc(key=\"name\", value=\"Alice\")  # OK\n# func(\"name\", \"Alice\")          # TypeError",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Combined:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def func(pos_only, /, normal, *, kw_only):\n    ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why use them?** - **Positional-only:** API flexibility — parameter names can change without breaking callers. Used extensively in built-ins (`len`, `range`, `print`). - **Keyword-only:** Force clarity — prevents accidental positional passing of boolean flags."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Good API design:\ndef connect(host, /, *, port=443, timeout=30):\n    ...\n\nconnect(\"db.example.com\", port=5432)  # Clear intent",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "How do type hints work? Are they enforced?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Type hints (PEP 484) are **annotations** that document expected types. They are stored in `func.__annotations__` and are **NOT enforced at runtime**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def add(a: int, b: int) -> int:\n    return a + b\n\nadd(\"hello\", \" world\")  # Runs fine! Returns \"hello world\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Purpose:** - Documentation for developers - IDE support (autocompletion, error highlighting) - Static analysis with tools like **mypy**, **pyright**, **pytype** - Used by frameworks (Pydantic, FastAPI) for runtime validation"
    },
    {
     "t": "p",
     "text": "**Common types from `typing` module:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import List, Dict, Optional, Union, Callable, Tuple\n\ndef process(\n    data: List[int],\n    config: Optional[Dict[str, str]] = None,\n    callback: Callable[[int], bool] = None\n) -> Union[str, None]:\n    ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Python 3.10+** syntax:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def process(data: list[int], value: str | None = None) -> str | None:\n    ...",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the late binding closure problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "When closures are created in a loop, they all capture the **same variable** (by reference), not its value at the time of creation. When the closures are finally called, they all see the variable's **final** value."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Problem\nfuncs = []\nfor i in range(5):\n    funcs.append(lambda: i)\n\nprint([f() for f in funcs])  # [4, 4, 4, 4, 4] — all see i=4",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Fixes:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Fix 1: Default argument captures current value\nfuncs = [lambda i=i: i for i in range(5)]\n# [0, 1, 2, 3, 4] ✓\n\n# Fix 2: Factory function (each call creates a new scope)\ndef make_func(val):\n    return lambda: val\nfuncs = [make_func(i) for i in range(5)]\n\n# Fix 3: functools.partial\nfrom functools import partial\nfuncs = [partial(lambda x: x, i) for i in range(5)]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why it happens:** Python closures use **late binding** — the value is looked up when the closure is **called**, not when it's **defined**. The loop variable `i` is a single binding that gets reassigned each iteration."
    },
    {
     "t": "disclose",
     "summary": "The same question, answered a second way",
     "body": [
      {
       "t": "p",
       "text": "When closures are created inside a loop, all closures share the **same** loop variable. Since the variable is captured by reference, they all see its **final value**."
      },
      {
       "t": "code",
       "lang": "python",
       "code": "# Problem:\ncallbacks = []\nfor i in range(5):\n    callbacks.append(lambda: i)\n\nprint([cb() for cb in callbacks])   # [4, 4, 4, 4, 4]",
       "numbered": false
      },
      {
       "t": "p",
       "text": "**Why?** There's only one `i` variable. All lambdas reference the same `i`, which equals 4 after the loop ends."
      },
      {
       "t": "p",
       "text": "**Three fixes:**"
      },
      {
       "t": "code",
       "lang": "python",
       "code": "# Fix 1: Default argument (early binding)\ncallbacks = [lambda i=i: i for i in range(5)]\n\n# Fix 2: Factory function (new scope per iteration)\ndef make_cb(val):\n    return lambda: val\ncallbacks = [make_cb(i) for i in range(5)]\n\n# Fix 3: functools.partial\nfrom functools import partial\ncallbacks = [partial(lambda x: x, i) for i in range(5)]",
       "numbered": false
      },
      {
       "t": "p",
       "text": "All produce `[0, 1, 2, 3, 4]`."
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is `functools.partial()` used for?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`functools.partial()` creates a **new function** with some arguments **pre-filled** (frozen). It's useful for adapting functions to APIs that expect fewer parameters."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import partial\n\ndef power(base, exponent):\n    return base ** exponent\n\nsquare = partial(power, exponent=2)\ncube = partial(power, exponent=3)\n\nprint(square(5))  # 25\nprint(cube(5))    # 125",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Common use cases:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 1. Simplifying callbacks\nimport json\npretty_dump = partial(json.dumps, indent=2, sort_keys=True)\n\n# 2. Creating specialized loggers\ndef log(level, message):\n    print(f\"[{level}] {message}\")\n\nwarn = partial(log, \"WARNING\")\nerror = partial(log, \"ERROR\")\n\nwarn(\"Disk space low\")   # [WARNING] Disk space low\nerror(\"Connection lost\")  # [ERROR] Connection lost\n\n# 3. key functions\nsorted(strings, key=partial(str.startswith, prefix=\"test\"))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Difference from lambda:** `partial` is more readable, preserves `__name__` and `__doc__` via `functools.update_wrapper`, and works better with pickling."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "How does Python resolve variable names? (Scope chain)",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Python resolves names using the **LEGB** chain:"
    },
    {
     "t": "ol",
     "items": [
      "**Local** → Variables defined in the current function body.",
      "**Enclosing** → Variables in any enclosing function (for nested functions), checked from innermost to outermost.",
      "**Global** → Variables at the module/file level.",
      "**Built-in** → Names in the `builtins` module."
     ]
    },
    {
     "t": "p",
     "text": "**Important rules:** - **Reading** a variable: Python walks up L → E → G → B. First match wins. - **Writing** (assignment): Creates a **local** variable by default. Use `global`/`nonlocal` to write to outer scopes. - Assignment anywhere in a function makes the name local for the **entire** function (not just after the assignment line). - Comprehensions (`[x for x in ...]`) have their **own scope** in Python 3 (but not in Python 2). - `class` bodies have their own scope, but it's **not** part of the LEGB chain for nested functions inside the class."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "x = \"global\"\n\ndef outer():\n    x = \"enclosing\"\n    \n    def inner():\n        # x is resolved from Enclosing scope\n        print(x)  # \"enclosing\"\n    \n    inner()\n\nouter()",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is `UnboundLocalError` and when does it occur?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`UnboundLocalError` occurs when you **read** a local variable before it has been **assigned** a value."
    },
    {
     "t": "p",
     "text": "Python determines variable scope at **compile time** (function definition), not at runtime. If a variable is assigned **anywhere** in a function, it's treated as local for the **entire** function."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "x = 10\n\ndef func():\n    print(x)   # UnboundLocalError!\n    x = 20     # This makes 'x' local to the entire function\n\nfunc()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why:** The `x = 20` line makes `x` local. When `print(x)` runs, local `x` hasn't been assigned yet."
    },
    {
     "t": "p",
     "text": "**Fixes:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Fix 1: Declare global\ndef func():\n    global x\n    print(x)\n    x = 20\n\n# Fix 2: Use a different name\ndef func():\n    print(x)        # reads global x\n    local_x = 20\n\n# Fix 3: For nested functions, use nonlocal\ndef outer():\n    x = 10\n    def inner():\n        nonlocal x\n        print(x)\n        x = 20\n    inner()",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What are function annotations and how to access them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Function annotations are optional metadata attached to parameters and return values. They are stored in `__annotations__` dict and have **no semantic meaning** to Python itself."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def process(data: list[int], threshold: float = 0.5) -> bool:\n    return max(data) > threshold\n\n# Access annotations\nprint(process.__annotations__)\n# {'data': list[int], 'threshold': <class 'float'>, 'return': <class 'bool'>}\n\n# Using typing.get_type_hints() (handles forward references)\nfrom typing import get_type_hints\nprint(get_type_hints(process))\n\n# Annotations can be ANY expression (not just types)\ndef foo(x: \"input value\", y: 42) -> \"output\":\n    return x + y\n\nprint(foo.__annotations__)\n# {'x': 'input value', 'y': 42, 'return': 'output'}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Best practice:** Use type hints (`int`, `str`, `list[int]`, `Optional[str]`) for annotations. Use tools like `mypy` for static type checking."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Difference between `map`/`filter` and list comprehension?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`map()`/`filter()`",
      "List Comprehension"
     ],
     "rows": [
      [
       "Returns",
       "Iterator (lazy)",
       "List (eager)"
      ],
      [
       "Readability",
       "Less Pythonic for complex logic",
       "More Pythonic"
      ],
      [
       "Lambda needed?",
       "Usually yes",
       "No"
      ],
      [
       "Performance",
       "Comparable (slightly faster for simple built-in funcs)",
       "Comparable (often faster for complex expressions)"
      ],
      [
       "Chaining",
       "`map(f, filter(g, data))` — harder to read",
       "`[f(x) for x in data if g(x)]` — clearer"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "numbers = [1, 2, 3, 4, 5, 6]\n\n# map + filter\nresult = list(map(lambda x: x**2, filter(lambda x: x % 2 == 0, numbers)))\n\n# List comprehension (preferred)\nresult = [x**2 for x in numbers if x % 2 == 0]\n\n# Both: [4, 16, 36]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to prefer `map()`/`filter()`:** - When applying a **named function** (not lambda): `map(str.upper, words)` is cleaner than `[w.upper() for w in words]` (debatable). - When you need **lazy evaluation** and don't want to materialize the full list."
    },
    {
     "t": "p",
     "text": "**General Python convention:** Prefer list comprehensions for clarity. Use `map`/`filter` when passing an existing named function and laziness is desired."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is the difference between `return` and `yield`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`return`",
      "`yield`"
     ],
     "rows": [
      [
       "Function type",
       "Regular function",
       "Generator function"
      ],
      [
       "Behavior",
       "Exits function, returns value",
       "Pauses function, yields value"
      ],
      [
       "State",
       "Lost after return",
       "**Preserved** between `next()` calls"
      ],
      [
       "Returns",
       "Single value",
       "Multiple values (lazily, one at a time)"
      ],
      [
       "Memory",
       "Entire result in memory",
       "Values generated on-the-fly"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# return — computes everything at once\ndef get_squares_list(n):\n    return [i**2 for i in range(n)]\n\n# yield — produces values lazily\ndef get_squares_gen(n):\n    for i in range(n):\n        yield i**2\n\n# Usage\ngen = get_squares_gen(5)\nprint(next(gen))  # 0\nprint(next(gen))  # 1\nprint(next(gen))  # 4\n\n# Iterate\nfor val in get_squares_gen(5):\n    print(val)  # 0, 1, 4, 9, 16",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use `yield`:** - Processing large datasets (file lines, DB rows) without loading all into memory. - Infinite sequences. - Pipelines / stream processing."
    },
    {
     "t": "p",
     "text": "**Key:** A function with `yield` returns a **generator object** — it doesn't execute the body until `next()` is called."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How do nested functions and closures relate to decorators?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Decorators are **built on** nested functions and closures. A decorator is a higher-order function that: 1. Takes a function as input. 2. Defines an inner (nested) function (the wrapper). 3. The wrapper forms a **closure** over the original function. 4. Returns the wrapper."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def my_decorator(func):           # Higher-order function\n    def wrapper(*args, **kwargs):  # Nested function\n        print(\"Before call\")\n        result = func(*args, **kwargs)  # Closure over 'func'\n        print(\"After call\")\n        return result\n    return wrapper                 # Returns inner function\n\n@my_decorator\ndef say_hello(name):\n    print(f\"Hello, {name}!\")\n\nsay_hello(\"Alice\")\n# Before call\n# Hello, Alice!\n# After call",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**The relationship:** - **Nested function:** `wrapper` is defined inside `my_decorator`. - **Closure:** `wrapper` captures `func` from the enclosing scope. - **Higher-order function:** `my_decorator` takes a function and returns a function. - **`@` syntax:** `@my_decorator` is syntactic sugar for `say_hello = my_decorator(say_hello)`."
    },
    {
     "t": "p",
     "text": "Without closures and nested functions, decorators would not be possible."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What are the best practices for function design?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "h4",
     "text": "1. Single Responsibility Principle"
    },
    {
     "t": "p",
     "text": "Each function should do **one thing** and do it well."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Bad: does too much\ndef process_and_save_and_email(data):\n    ...\n\n# Good: separate concerns\ndef process(data): ...\ndef save(result): ...\ndef send_email(result): ...",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "2. Keep Functions Small"
    },
    {
     "t": "p",
     "text": "Aim for **< 20 lines**. If a function is too long, extract helper functions."
    },
    {
     "t": "h4",
     "text": "3. Use Clear, Descriptive Names"
    },
    {
     "t": "p",
     "text": "Use verbs: `calculate_total()`, `validate_input()`, `fetch_user()`."
    },
    {
     "t": "h4",
     "text": "4. Limit Parameters (Max ~5)"
    },
    {
     "t": "p",
     "text": "Too many parameters → use a config dict, dataclass, or builder pattern."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Bad\ndef create_user(name, email, age, role, dept, manager, start_date): ...\n\n# Good\n@dataclass\nclass UserConfig:\n    name: str\n    email: str\n    age: int\n    ...\n\ndef create_user(config: UserConfig): ...",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "5. Avoid Mutable Default Arguments"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Bad\ndef f(items=[]): ...\n\n# Good\ndef f(items=None):\n    items = items or []",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "6. Use Type Hints and Docstrings"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def calculate_bmi(weight_kg: float, height_m: float) -> float:\n    \"\"\"Calculate BMI from weight and height.\"\"\"\n    return weight_kg / (height_m ** 2)",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "7. Return Early to Avoid Deep Nesting"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Bad\ndef process(data):\n    if data:\n        if validate(data):\n            if transform(data):\n                return result\n\n# Good (guard clauses)\ndef process(data):\n    if not data:\n        return None\n    if not validate(data):\n        raise ValueError(\"Invalid\")\n    return transform(data)",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "8. Prefer Pure Functions"
    },
    {
     "t": "p",
     "text": "Functions with no side effects are easier to test, debug, and reason about."
    },
    {
     "t": "h4",
     "text": "9. Don't Use `global` Unless Absolutely Necessary"
    },
    {
     "t": "p",
     "text": "Pass data through parameters and return values instead."
    },
    {
     "t": "h4",
     "text": "10. Use `*args`/`**kwargs` Sparingly"
    },
    {
     "t": "p",
     "text": "Only when you genuinely need flexible signatures (decorators, wrappers). Explicit parameters are clearer."
    }
   ]
  }
 ],
 "takeaways": []
});

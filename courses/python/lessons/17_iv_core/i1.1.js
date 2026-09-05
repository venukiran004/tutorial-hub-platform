/* ============================================================================
   INTERVIEW: LANGUAGE CORE i1.1 — Data Types & Variables
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.1",
 "lede": "**30 interview questions on data types & variables**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 30 questions on data types & variables without prompting",
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
   "q": "What are Python's key characteristics?",
   "body": [
    {
     "t": "p",
     "text": "Python is **interpreted** (executed line by line via bytecode), **dynamically typed** (types are checked at runtime, not compile time), **garbage-collected** (uses reference counting + cyclic GC), and supports **multiple paradigms** (procedural, object-oriented, functional). Everything in Python is an object, including functions, classes, and modules."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "x = 10          # no type declaration needed\nx = \"hello\"     # same variable, different type — dynamic typing",
     "numbered": false
    },
    {
     "t": "disclose",
     "summary": "The same question, answered a second way",
     "body": [
      {
       "t": "p",
       "text": "Interpreted, dynamically typed, garbage-collected, multi-paradigm (OOP + functional), high readability, extensive standard library, large ecosystem. Runs on CPython (reference), PyPy, Jython."
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the difference between list, tuple, and set?",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "`list`",
      "`tuple`",
      "`set`"
     ],
     "rows": [
      [
       "Mutable",
       "✅",
       "❌",
       "✅"
      ],
      [
       "Ordered",
       "✅",
       "✅",
       "❌"
      ],
      [
       "Duplicates",
       "✅",
       "✅",
       "❌"
      ],
      [
       "Indexable",
       "✅",
       "✅",
       "❌"
      ],
      [
       "Hashable",
       "❌",
       "✅ (if elements are)",
       "❌"
      ],
      [
       "Use case",
       "General collection",
       "Fixed data, dict keys",
       "Uniqueness, membership"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "lst = [1, 2, 2, 3]     # ordered, duplicates allowed\ntup = (1, 2, 2, 3)     # immutable ordered sequence\nst  = {1, 2, 2, 3}     # {1, 2, 3} — duplicates removed",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "How is `dict` implemented internally?",
   "body": [
    {
     "t": "p",
     "text": "Python `dict` is implemented as a **hash table**. Keys are hashed to find their bucket, giving **O(1) average** time for get/set/delete. Since Python 3.7+, dictionaries **preserve insertion order** as a language guarantee (CPython did this since 3.6 as an implementation detail)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "d = {\"b\": 2, \"a\": 1, \"c\": 3}\nprint(list(d.keys()))  # ['b', 'a', 'c'] — insertion order preserved",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Keys must be **hashable** (immutable types like `str`, `int`, `tuple` of hashables). Unhashable types like `list` or `dict` cannot be keys."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is the difference between `==` and `is`?",
   "body": [
    {
     "t": "p",
     "text": "`==` checks **value equality** (calls `__eq__`). `is` checks **identity** — whether two names reference the **exact same object** in memory (compares `id()` values)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = [1, 2, 3]\nb = [1, 2, 3]\nprint(a == b)    # True  — same values\nprint(a is b)    # False — different objects in memory\n\nc = a\nprint(a is c)    # True  — same object",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rule:** Always use `is` for `None` checks: `if x is None`."
    },
    {
     "t": "disclose",
     "summary": "The same question, answered a second way",
     "body": [
      {
       "t": "ul",
       "items": [
        "`==` compares values (calls `__eq__`).",
        "`is` compares identity (same object in memory — same `id()`)."
       ]
      },
      {
       "t": "code",
       "lang": "python",
       "code": "a = [1, 2]; b = [1, 2]\na == b  # True\na is b  # False",
       "numbered": false
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What are mutable and immutable types, and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "**Immutable:** `int`, `float`, `str`, `tuple`, `bytes`, `frozenset` — cannot be changed after creation. **Mutable:** `list`, `dict`, `set`, `bytearray` — can be modified in place."
    },
    {
     "t": "p",
     "text": "It matters because mutable objects shared across references can lead to unintended side effects. Immutable objects are safe to share and can be used as dictionary keys or set elements."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Mutable danger\na = [1, 2]\nb = a\nb.append(3)\nprint(a)  # [1, 2, 3] — a is affected because a and b share the same list",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How does Python manage memory?",
   "body": [
    {
     "t": "p",
     "text": "Python uses **reference counting** as the primary mechanism — each object tracks how many references point to it. When the count drops to zero, memory is freed immediately. For **cyclic references** (e.g., two objects referencing each other), Python employs a **cyclic garbage collector** (`gc` module) that periodically detects and collects unreachable cycles."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nx = [1, 2, 3]\nprint(sys.getrefcount(x))  # 2 (x + temporary ref from getrefcount call)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Additionally, Python uses **memory pools** (via `pymalloc`) for small objects to reduce overhead of frequent allocations."
    },
    {
     "t": "disclose",
     "summary": "The same question, answered a second way",
     "body": [
      {
       "t": "p",
       "text": "Python uses reference counting + cyclic garbage collector (for reference cycles). Objects are freed when reference count reaches zero. The `gc` module manages cyclic cleanup. Memory is managed in a private heap."
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is `None` and how should you test for it?",
   "body": [
    {
     "t": "p",
     "text": "`None` is Python's **singleton null object** of type `NoneType`. There is exactly one `None` object per interpreter. Functions without an explicit `return` statement return `None`. Always test with `is` (identity), not `==` (equality), because `==` can be overridden."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "x = None\nif x is None:        # ✅ correct\n    print(\"x is None\")\n\nif x == None:        # ❌ works but fragile (custom __eq__ could break it)\n    print(\"x is None\")",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Explain Python's truthiness rules.",
   "body": [
    {
     "t": "p",
     "text": "Every object has a boolean value. The following are **falsy**: `None`, `False`, `0`, `0.0`, `0j`, `\"\"`, `[]`, `()`, `{}`, `set()`, `b\"\"`, `range(0)`. Everything else is **truthy**."
    },
    {
     "t": "p",
     "text": "Python determines truthiness by calling `__bool__()`. If not defined, it falls back to `__len__()` (truthy if non-zero). If neither exists, the object is always truthy."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "if []:              # falsy — empty list\n    print(\"yes\")\nif [0]:             # truthy — non-empty list (even though element is 0)\n    print(\"yes\")    # prints\nif \"False\":         # truthy — non-empty string\n    print(\"yes\")    # prints",
     "numbered": false
    },
    {
     "t": "disclose",
     "summary": "The same question, answered a second way",
     "body": [
      {
       "t": "p",
       "text": "Falsy values: `None`, `False`, `0`, `0.0`, `\"\"`, `[]`, `{}`, `()`, `set()`. Everything else is truthy. Objects can define `__bool__` or `__len__` to control truthiness."
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is integer caching/interning?",
   "body": [
    {
     "t": "p",
     "text": "CPython pre-allocates integer objects for the range **[-5, 256]** at startup. Any variable assigned a value in this range points to the **same cached object**. This is a performance optimization since small integers are used very frequently. Outside this range, new objects are created (though the compiler may optimize within a single code block)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = 100\nb = 100\nprint(a is b)   # True — cached\n\na = 300\nb = 300\nprint(a is b)   # False in REPL (outside cache range)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Warning:** Never rely on `is` for integer comparison — always use `==`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is string interning?",
   "body": [
    {
     "t": "p",
     "text": "Python automatically interns strings that look like valid identifiers (containing only letters, digits, and underscores). Interned strings are stored once in memory, and all references point to the same object. This speeds up dictionary lookups and attribute access. You can manually intern strings using `sys.intern()`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\na = \"hello\"\nb = \"hello\"\nprint(a is b)          # True — auto-interned (identifier-like)\n\na = \"hello world\"\nb = \"hello world\"\nprint(a is b)          # Often False — space prevents auto-interning\n\na = sys.intern(\"hello world\")\nb = sys.intern(\"hello world\")\nprint(a is b)          # True — manually interned",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the difference between shallow copy and deep copy?",
   "body": [
    {
     "t": "p",
     "text": "A **shallow copy** creates a new outer container but the inner objects are still shared references. A **deep copy** (`copy.deepcopy`) recursively copies all nested objects, producing a fully independent clone."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import copy\noriginal = [[1, 2], [3, 4]]\n\nshallow = copy.copy(original)\nshallow[0].append(99)\nprint(original)  # [[1, 2, 99], [3, 4]] — inner list shared!\n\ndeep = copy.deepcopy(original)\ndeep[1].append(99)\nprint(original)  # [[1, 2, 99], [3, 4]] — unaffected by deep copy mutation",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Use shallow copy for flat structures. Use deep copy when dealing with nested mutable objects."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is type coercion in Python?",
   "body": [
    {
     "t": "p",
     "text": "Python performs **implicit type promotion** in arithmetic: `bool → int → float → complex`. It does **not** coerce between unrelated types (e.g., `str` and `int`) — you must convert explicitly."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "print(1 + 2.0)       # 3.0   — int promoted to float\nprint(True + 5)      # 6     — bool promoted to int\nprint(1 + 2j)        # (1+2j) — int promoted to complex\n\nprint(5 == \"5\")      # False — no coercion, different types\n# print(5 + \"5\")     # TypeError — no implicit str-int coercion",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How does Python handle integer overflow?",
   "body": [
    {
     "t": "p",
     "text": "**It doesn't** — Python integers have **arbitrary precision**. They automatically grow to accommodate any value, limited only by available memory. There is no fixed bit width and no overflow."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nx = 2 ** 1000   # perfectly valid, huge number\nprint(type(x))   # <class 'int'>\nprint(sys.maxsize)          # largest C ssize_t value (e.g., 9223372036854775807)\nprint(sys.maxsize + 1)      # still <class 'int'>, no overflow",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is the difference between `bytes` and `bytearray`?",
   "body": [
    {
     "t": "p",
     "text": "Both represent sequences of bytes (integers 0–255). `bytes` is **immutable**; `bytearray` is **mutable**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "b = b\"hello\"\n# b[0] = 72       # TypeError — bytes is immutable\n\nba = bytearray(b\"hello\")\nba[0] = 72         # OK — bytearray is mutable\nprint(ba)          # bytearray(b'Hello')\nba.extend(b\"!\")    # can append, extend, insert, etc.",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Use `bytes` for read-only data (network protocols, file content). Use `bytearray` when you need to modify binary data in place."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is `memoryview` and when should you use it?",
   "body": [
    {
     "t": "p",
     "text": "`memoryview` provides **zero-copy access** to the internal buffer of objects like `bytes`, `bytearray`, or `array.array`. Slicing a `memoryview` does not copy data — it creates a view into the same memory."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "data = bytearray(b\"Hello, World!\")\nmv = memoryview(data)\nchunk = mv[7:12]       # no copy — view into same buffer\nprint(chunk.tobytes())  # b'World'\nmv[0] = 104             # modifies original data in place\nprint(data)              # bytearray(b'hello, World!')",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use case:** Processing large binary data (images, network buffers, file I/O) where avoiding copies improves performance."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What are the numeric types in Python?",
   "body": [
    {
     "t": "p",
     "text": "Python has four built-in numeric types: `int` (arbitrary precision integers), `float` (IEEE 754 double precision, ~15–17 significant digits), `complex` (real + imaginary parts, both floats), and `bool` (subclass of `int`, with values `True`=1 and `False`=0)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "print(type(42))       # <class 'int'>\nprint(type(3.14))     # <class 'float'>\nprint(type(1+2j))     # <class 'complex'>\nprint(type(True))     # <class 'bool'>\nprint(isinstance(True, int))  # True",
     "numbered": false
    },
    {
     "t": "p",
     "text": "For exact decimal arithmetic, use `decimal.Decimal`. For rational numbers, use `fractions.Fraction`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How does floating point comparison work?",
   "body": [
    {
     "t": "p",
     "text": "Due to IEEE 754 representation, many decimal numbers cannot be stored exactly as floats. Direct `==` comparison often fails. Use `math.isclose()` for approximate comparison, or the `decimal` module for exact arithmetic."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import math\nfrom decimal import Decimal\n\n# Problem\nprint(0.1 + 0.2 == 0.3)                  # False\n\n# Solutions\nprint(math.isclose(0.1 + 0.2, 0.3))      # True (default rel_tol=1e-9)\nprint(abs(0.1 + 0.2 - 0.3) < 1e-9)       # True (manual epsilon)\nprint(Decimal('0.1') + Decimal('0.2') == Decimal('0.3'))  # True (exact)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is the `decimal` module and when should you use it?",
   "body": [
    {
     "t": "p",
     "text": "The `decimal` module provides arbitrary-precision decimal floating point. Unlike `float`, it represents decimal numbers exactly (when constructed from strings). Use it for **financial calculations**, **currency**, and any domain requiring exact decimal arithmetic."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from decimal import Decimal, getcontext\n\nprint(Decimal('0.1') + Decimal('0.2'))  # 0.3 (exact)\nprint(Decimal('1') / Decimal('3'))       # 0.3333333333333333333333333333\n\ngetcontext().prec = 50  # set precision to 50 digits\nprint(Decimal('1') / Decimal('7'))\n# 0.14285714285714285714285714285714285714285714285714",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Caution:** `Decimal(0.1)` captures the float's imprecision. Always use `Decimal('0.1')` (string constructor) for exact values."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the `fractions` module?",
   "body": [
    {
     "t": "p",
     "text": "The `fractions` module provides exact rational number arithmetic via the `Fraction` class. Fractions are stored as a numerator/denominator pair and are automatically reduced to lowest terms."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from fractions import Fraction\n\nprint(Fraction(1, 3) + Fraction(1, 6))   # 1/2\nprint(Fraction(1, 3) * 3)                 # 1\nprint(float(Fraction(1, 3)))              # 0.3333333333333333\n\n# From string (exact)\nprint(Fraction('0.1'))                     # 1/10\n# From float (captures imprecision)\nprint(Fraction(0.1))                       # 3602879701896397/36028797018963968",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use case:** Exact arithmetic where results should remain rational (e.g., proportions, ratios)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is operator overloading in Python?",
   "body": [
    {
     "t": "p",
     "text": "Operator overloading lets you define how operators work with custom objects by implementing **dunder (magic) methods**. For example, `+` calls `__add__`, `==` calls `__eq__`, `<` calls `__lt__`, `len()` calls `__len__`, etc."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Vector:\n    def __init__(self, x, y):\n        self.x, self.y = x, y\n    \n    def __add__(self, other):\n        return Vector(self.x + other.x, self.y + other.y)\n    \n    def __eq__(self, other):\n        return self.x == other.x and self.y == other.y\n    \n    def __repr__(self):\n        return f\"Vector({self.x}, {self.y})\"\n\nv1 = Vector(1, 2)\nv2 = Vector(3, 4)\nprint(v1 + v2)     # Vector(4, 6)\nprint(v1 == v2)    # False",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "How do augmented assignments work?",
   "body": [
    {
     "t": "p",
     "text": "Augmented assignments (`+=`, `-=`, `*=`, etc.) call the **in-place** dunder method (`__iadd__`, `__isub__`, etc.) if available. For **mutable** types, the object is modified in place. For **immutable** types, a new object is created and the variable is rebound."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Mutable — modified in place\nlst = [1, 2]\noriginal_id = id(lst)\nlst += [3]           # calls list.__iadd__\nprint(id(lst) == original_id)  # True — same object\n\n# Immutable — creates new object\ns = \"hello\"\noriginal_id = id(s)\ns += \" world\"        # creates new string, rebinds s\nprint(id(s) == original_id)   # False — different object",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is short-circuit evaluation?",
   "body": [
    {
     "t": "p",
     "text": "Python's `and` and `or` operators **short-circuit**: they stop evaluating as soon as the result is determined. `and` returns the first falsy value (or the last value if all truthy). `or` returns the first truthy value (or the last value if all falsy)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# `and` short-circuits on first falsy\nprint(0 and expensive_function())     # 0 — function never called\nprint(3 and 5)                         # 5 — both truthy, returns last\n\n# `or` short-circuits on first truthy\nprint(3 or expensive_function())      # 3 — function never called\nprint(0 or 5)                          # 5 — first falsy, returns second\n\n# Practical use: default values\nname = user_input or \"Anonymous\"",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What are bitwise operations and their use cases in Python?",
   "body": [
    {
     "t": "p",
     "text": "Bitwise operators (`&`, `|`, `^`, `~`, `<<`, `>>`) operate on the binary representation of integers. Common use cases include **flag manipulation**, **permissions**, **bitmasks**, **hashing**, and **low-level protocols**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Permission flags\nREAD    = 0b001   # 1\nWRITE   = 0b010   # 2\nEXECUTE = 0b100   # 4\n\nperms = READ | WRITE            # 0b011 = 3\nprint(perms & READ != 0)       # True — has read permission\nperms &= ~WRITE                 # remove write permission\nprint(bin(perms))                # 0b1 — only read remains\n\n# Check if power of 2\ndef is_power_of_2(n):\n    return n > 0 and (n & (n - 1)) == 0",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is the walrus operator (`:=`)?",
   "body": [
    {
     "t": "p",
     "text": "The walrus operator (`:=`), introduced in **Python 3.8** (PEP 572), allows **assignment inside expressions**. It assigns a value to a variable as part of a larger expression, reducing code duplication."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# without\nx=10\nif x==10: print(\"Hello\")\n\n#with walruns\nif x:=10: print(\"hello\")\n\n\n\n# Without walrus\nline = input()\nwhile line != \"quit\":\n    process(line)\n    line = input()\n\n# With walrus — cleaner\nwhile (line := input()) != \"quit\":\n    process(line)\n\n# In list comprehensions\ndata = [1, 5, 12, 3, 18, 7]\nresults = [y for x in data if (y := x * 2) > 10]\nprint(results)  # [24, 36, 14]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is the difference between `type()` and `isinstance()`?",
   "body": [
    {
     "t": "p",
     "text": "`type(x)` returns the **exact type** of `x`. `isinstance(x, T)` checks if `x` is an instance of `T` **or any subclass** of `T`. `isinstance` also accepts a tuple of types."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Animal: pass\nclass Dog(Animal): pass\n\nd = Dog()\nprint(type(d) == Animal)          # False — exact type is Dog\nprint(type(d) == Dog)             # True\nprint(isinstance(d, Animal))     # True  — Dog IS-A Animal\nprint(isinstance(d, (str, Dog))) # True  — matches Dog\n\n# Best practice: use isinstance() for type checking in production",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "What is duck typing?",
   "body": [
    {
     "t": "p",
     "text": "Duck typing is Python's philosophy: *\"If it walks like a duck and quacks like a duck, it's a duck.\"* Instead of checking an object's type, you check whether it **supports the required operations**. This enables polymorphism without inheritance."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Duck:\n    def quack(self): return \"Quack!\"\n\nclass Person:\n    def quack(self): return \"I'm quacking like a duck!\"\n\ndef make_it_quack(thing):\n    # No type check — just call the method\n    print(thing.quack())\n\nmake_it_quack(Duck())    # Quack!\nmake_it_quack(Person())  # I'm quacking like a duck!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**EAFP:** Python prefers \"Easier to Ask Forgiveness than Permission\" — try the operation and handle exceptions, rather than checking types upfront."
    },
    {
     "t": "disclose",
     "summary": "The same question, answered a second way",
     "body": [
      {
       "t": "p",
       "text": "Python checks for the presence of methods/attributes rather than type. If an object \"walks like a duck and quacks like a duck, it is a duck.\" Enables flexible interfaces without inheritance."
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "Explain Python's number hierarchy.",
   "body": [
    {
     "t": "p",
     "text": "The `numbers` module (PEP 3141) defines an abstract hierarchy: `Number` → `Complex` → `Real` → `Rational` → `Integral`. Python's built-in types register with this hierarchy: `int` is `Integral`, `float` is `Real`, `complex` is `Complex`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numbers\n\nprint(isinstance(42, numbers.Integral))    # True\nprint(isinstance(42, numbers.Real))        # True\nprint(isinstance(3.14, numbers.Real))      # True\nprint(isinstance(3.14, numbers.Integral))  # False\nprint(isinstance(1+2j, numbers.Complex))   # True\n\nfrom fractions import Fraction\nprint(isinstance(Fraction(1, 3), numbers.Rational))  # True",
     "numbered": false
    },
    {
     "t": "p",
     "text": "This hierarchy is useful for writing functions that accept \"any numeric type\" via `isinstance(x, numbers.Real)`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What are sentinel values and how to use them?",
   "body": [
    {
     "t": "p",
     "text": "A sentinel is a unique object used to distinguish \"no value provided\" from `None` (which might be a valid value). Create a sentinel with `object()` — guaranteed unique via identity check."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "_MISSING = object()\n\ndef get(d, key, default=_MISSING):\n    if key in d:\n        return d[key]\n    if default is _MISSING:\n        raise KeyError(key)\n    return default\n\ndata = {\"a\": None}\nprint(get(data, \"a\"))              # None — valid value\nprint(get(data, \"b\", None))       # None — explicit default\n# get(data, \"b\")                  # raises KeyError — no default provided",
     "numbered": false
    },
    {
     "t": "p",
     "text": "This pattern is used extensively in the standard library (e.g., `dataclasses.MISSING`, `inspect.Parameter.empty`)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "How does `hash()` work for immutable types?",
   "body": [
    {
     "t": "p",
     "text": "`hash()` returns an integer hash value for an object. Only **immutable** (and thus hashable) objects can be used as dict keys or set elements. Two objects that compare equal (`==`) must have the same hash. The converse is not required (hash collisions are allowed)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "print(hash(42))          # 42\nprint(hash(\"hello\"))     # some integer (varies across runs in Python 3.3+)\nprint(hash((1, 2, 3)))   # some integer\n\n# Mutable types are not hashable\n# hash([1, 2, 3])        # TypeError: unhashable type: 'list'\n# hash({\"a\": 1})         # TypeError: unhashable type: 'dict'\n\n# Custom hashable class\nclass Point:\n    def __init__(self, x, y):\n        self.x, self.y = x, y\n    def __eq__(self, other):\n        return self.x == other.x and self.y == other.y\n    def __hash__(self):\n        return hash((self.x, self.y))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Note:** Python 3.3+ uses hash randomization (`PYTHONHASHSEED`) for strings and bytes, so `hash(\"hello\")` varies across interpreter runs."
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is the `id()` function and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "`id()` returns the **unique identity** of an object — an integer guaranteed to be unique among simultaneously existing objects. In CPython, this is the **memory address** of the object's C struct. The `is` operator is equivalent to comparing `id()` values."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = [1, 2, 3]\nb = a\nc = [1, 2, 3]\n\nprint(id(a))          # e.g., 140234850261568\nprint(id(a) == id(b)) # True  — same object\nprint(id(a) == id(c)) # False — different objects\nprint(a is b)          # True  — equivalent to id comparison",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use cases:** - **Debugging**: verify whether two variables reference the same object. - **Understanding mutability**: check if an operation created a new object or modified in place. - **Avoiding infinite recursion**: track visited objects during traversal (e.g., `copy.deepcopy` uses `id()` internally)."
    }
   ]
  }
 ],
 "takeaways": []
});

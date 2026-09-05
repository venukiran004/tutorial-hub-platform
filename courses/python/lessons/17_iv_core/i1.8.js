/* ============================================================================
   INTERVIEW: LANGUAGE CORE i1.8 — Lambda, Map, Filter & Reduce
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.8",
 "lede": "**16 interview questions on lambda, map, filter & reduce**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 16 questions on lambda, map, filter & reduce without prompting",
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
   "q": "What is a lambda function? What are its limitations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "A **lambda** is an anonymous, inline function created with the `lambda` keyword. It takes any number of arguments but can contain only a **single expression**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Syntax\nlambda arguments: expression\n\n# Example\nsquare = lambda x: x ** 2\nprint(square(5))  # 25",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Limitations"
    },
    {
     "t": "table",
     "head": [
      "Limitation",
      "Explanation"
     ],
     "rows": [
      [
       "**Single expression only**",
       "Cannot contain statements (`if`/`for`/`while`/`try`/`=`/`raise`)"
      ],
      [
       "**No docstring**",
       "Cannot attach documentation"
      ],
      [
       "**No type annotations**",
       "Cannot use type hints"
      ],
      [
       "**Poor debugging**",
       "Stack trace shows `<lambda>` — no meaningful name"
      ],
      [
       "**No multi-line logic**",
       "Complex logic requires `def`"
      ],
      [
       "**PEP 8 discourages naming**",
       "`square = lambda x: x**2` → use `def square(x)` instead"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Cannot do this\n# bad = lambda x: x += 1         # SyntaxError (statement)\n# bad = lambda x: print(x); x+1  # SyntaxError (multiple expressions)\n\n# ✅ Ternary expressions are allowed\nclassify = lambda x: \"pos\" if x > 0 else \"neg\" if x < 0 else \"zero\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use**: Short, throwaway inline functions — as `key=` arguments, callbacks, or in `map()`/`filter()`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "When should you use `lambda` vs `def`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "table",
     "head": [
      "Use `lambda`",
      "Use `def`"
     ],
     "rows": [
      [
       "Short, single-expression logic",
       "Multi-line or complex logic"
      ],
      [
       "Inline — used once, not named",
       "Reusable, named function"
      ],
      [
       "`key=`, `sort()`, `map()`, `filter()`",
       "Needs docstring, type hints"
      ],
      [
       "Readability is not sacrificed",
       "Complex conditions or loops"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ✅ Good lambda use — inline sort key\nstudents = [(\"Alice\", 88), (\"Bob\", 75)]\nsorted(students, key=lambda s: s[1])\n\n# ❌ Bad lambda use — named assignment (PEP 8 violation)\nsquare = lambda x: x ** 2\n\n# ✅ Use def instead\ndef square(x):\n    \"\"\"Return the square of x.\"\"\"\n    return x ** 2",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**PEP 8 rule**: \"Always use a `def` statement instead of an assignment statement that binds a lambda expression directly to an identifier.\""
    },
    {
     "t": "p",
     "text": "**Key interview point**: Lambda is syntactic sugar for simple cases. `def` is always strictly more capable. Use lambda only for brevity in inline contexts."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "How does `map()` work? What does it return?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "`map(function, iterable)` applies `function` to **every item** in `iterable` and returns a **map object** (a lazy iterator)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "numbers = [1, 2, 3, 4]\nresult = map(lambda x: x ** 2, numbers)\n\nprint(type(result))   # <class 'map'>\nprint(list(result))   # [1, 4, 9, 16]\nprint(list(result))   # [] — exhausted!",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Key Properties"
    },
    {
     "t": "table",
     "head": [
      "Property",
      "Detail"
     ],
     "rows": [
      [
       "**Return type**",
       "Iterator (lazy — computes on demand)"
      ],
      [
       "**One-time use**",
       "Exhausted after full iteration"
      ],
      [
       "**Multiple iterables**",
       "`map(func, it1, it2)` — parallel application"
      ],
      [
       "**Stops at shortest**",
       "With multiple iterables, stops at shortest one"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Multiple iterables\nlist1 = [1, 2, 3]\nlist2 = [10, 20, 30]\nresult = list(map(lambda x, y: x + y, list1, list2))\nprint(result)  # [11, 22, 33]\n\n# With built-in function\nprint(list(map(int, [\"1\", \"2\", \"3\"])))  # [1, 2, 3]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Lazy evaluation** means `map()` is memory-efficient for large datasets — it doesn't create the entire result list upfront."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Difference between `map()` and list comprehension?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "Both transform every element of an iterable, but differ in syntax, readability, and capability:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "numbers = [1, 2, 3, 4, 5]\n\n# map()\nresult = list(map(lambda x: x ** 2, numbers))\n\n# List comprehension\nresult = [x ** 2 for x in numbers]",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Criteria",
      "`map()`",
      "List Comprehension"
     ],
     "rows": [
      [
       "**Return type**",
       "Iterator (lazy)",
       "List (eager)"
      ],
      [
       "**Readability**",
       "Worse with lambda, better with named func",
       "Generally more Pythonic"
      ],
      [
       "**Filtering**",
       "Needs separate `filter()`",
       "Built-in: `[x for x in ... if ...]`"
      ],
      [
       "**Nested loops**",
       "Not supported",
       "`[... for x in A for y in B]`"
      ],
      [
       "**Performance**",
       "Faster with C-implemented builtins",
       "Faster with lambda"
      ],
      [
       "**Memory**",
       "Lazy — good for large data",
       "Eager — creates full list"
      ],
      [
       "**Generator equivalent**",
       "Already lazy",
       "`(x**2 for x in numbers)`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# map() shines with existing functions\nlist(map(str.upper, words))       # Clean\n[w.upper() for w in words]        # Slightly verbose\n\n# Comprehension shines with complex transforms\n[x**2 for x in numbers if x > 0]  # Clean\nlist(map(lambda x: x**2, filter(lambda x: x > 0, numbers)))  # Messy",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Interview answer**: List comprehensions are more Pythonic and versatile. Use `map()` when applying an existing named function to an iterable. Prefer comprehensions when a lambda would be needed."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "How does `filter()` work? What does `filter(None, ...)` do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "`filter(function, iterable)` returns an iterator of items for which `function(item)` returns `True`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "numbers = [-2, -1, 0, 1, 2, 3]\npositives = list(filter(lambda x: x > 0, numbers))\nprint(positives)  # [1, 2, 3]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "`filter(None, iterable)`"
    },
    {
     "t": "p",
     "text": "When `function` is `None`, `filter` removes all **falsy** values:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "data = [0, 1, \"\", \"hello\", None, False, [], [1], {}, {\"a\": 1}]\ntruthy = list(filter(None, data))\nprint(truthy)  # [1, 'hello', [1], {'a': 1}]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Falsy values in Python**: `0`, `0.0`, `0j`, `\"\"`, `None`, `False`, `[]`, `()`, `{}`, `set()`, `frozenset()`, `range(0)`."
    },
    {
     "t": "h4",
     "text": "Equivalence"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# filter(None, iterable) is equivalent to:\n[item for item in iterable if item]\n\n# filter(func, iterable) is equivalent to:\n[item for item in iterable if func(item)]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Why was `reduce()` moved to `functools`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "In Python 2, `reduce()` was a built-in. Guido van Rossum moved it to `functools` in Python 3 for several reasons:"
    },
    {
     "t": "ol",
     "items": [
      "**Readability**`reduce()` is hard to read — requires mental simulation of the fold.",
      "**Debugging**No visibility into intermediate steps.",
      "**Misuse**Most `reduce()` calls have cleaner alternatives.",
      "**Better alternatives exist**"
     ]
    },
    {
     "t": "table",
     "head": [
      "`reduce()` Pattern",
      "Better Alternative"
     ],
     "rows": [
      [
       "Sum",
       "`sum(iterable)`"
      ],
      [
       "Product",
       "`math.prod(iterable)` (3.8+)"
      ],
      [
       "Max / Min",
       "`max()` / `min()`"
      ],
      [
       "Concatenation",
       "`\"\".join(strings)`"
      ],
      [
       "Flatten",
       "`itertools.chain.from_iterable()`"
      ],
      [
       "Boolean AND/OR",
       "`all()` / `any()`"
      ],
      [
       "Running results",
       "`itertools.accumulate()`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Guido's advice: \"Use reduce() only when you really need it\"\n\n# ❌ Unnecessary reduce\nfrom functools import reduce\ntotal = reduce(lambda a, b: a + b, [1, 2, 3, 4, 5])\n\n# ✅ Just use sum()\ntotal = sum([1, 2, 3, 4, 5])",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When reduce IS appropriate**: Custom aggregation with no built-in equivalent, e.g., composing functions, complex accumulation into a data structure."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the `operator` module and how to use it with `map`/`reduce`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "The `operator` module provides **function equivalents** of Python's operators (e.g., `+`, `*`, `[]`, `.attr`). These are C-implemented, making them faster than equivalent lambdas."
    },
    {
     "t": "h4",
     "text": "Common Functions"
    },
    {
     "t": "table",
     "head": [
      "Function",
      "Equivalent",
      "Example"
     ],
     "rows": [
      [
       "`operator.add(a, b)`",
       "`a + b`",
       "`reduce(operator.add, nums)`"
      ],
      [
       "`operator.mul(a, b)`",
       "`a * b`",
       "`reduce(operator.mul, nums)`"
      ],
      [
       "`operator.itemgetter(k)`",
       "`lambda x: x[k]`",
       "`sorted(data, key=itemgetter(1))`"
      ],
      [
       "`operator.attrgetter(a)`",
       "`lambda x: x.a`",
       "`sorted(objs, key=attrgetter(\"name\"))`"
      ],
      [
       "`operator.methodcaller(m)`",
       "`lambda x: x.m()`",
       "`map(methodcaller(\"upper\"), strs)`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import reduce\nimport operator\n\n# Sum with operator.add (cleaner than lambda)\nprint(reduce(operator.add, [1, 2, 3, 4, 5]))  # 15\n\n# Sort by dict key\ndata = [{\"name\": \"Bob\", \"age\": 25}, {\"name\": \"Alice\", \"age\": 30}]\nsorted_data = sorted(data, key=operator.itemgetter(\"name\"))\nprint(sorted_data[0][\"name\"])  # Alice\n\n# Call methods\nwords = [\"hello\", \"world\"]\nprint(list(map(operator.methodcaller(\"upper\"), words)))  # ['HELLO', 'WORLD']",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why prefer `operator` over lambda?** - Faster (C implementation) - More readable for common operations - Picklable (lambda is not) - Self-documenting"
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Explain the concept of higher-order functions with examples.",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "A **higher-order function** (HOF) is a function that either: 1. **Takes a function as an argument**, or 2. **Returns a function as its result** (or both)."
    },
    {
     "t": "h4",
     "text": "Python Built-in Higher-Order Functions"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 1. map() — takes a function argument\nresult = list(map(str.upper, [\"hello\", \"world\"]))\nprint(result)  # ['HELLO', 'WORLD']\n\n# 2. filter() — takes a function argument\nevens = list(filter(lambda x: x % 2 == 0, [1, 2, 3, 4]))\nprint(evens)  # [2, 4]\n\n# 3. sorted() — takes key function\ndata = [\"banana\", \"apple\", \"cherry\"]\nprint(sorted(data, key=len))  # ['apple', 'banana', 'cherry']\n\n# 4. reduce() — takes a function argument\nfrom functools import reduce\nprint(reduce(lambda a, b: a + b, [1, 2, 3]))  # 6",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Functions That Return Functions"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Decorator — takes function, returns function\ndef logger(func):\n    def wrapper(*args, **kwargs):\n        print(f\"Calling {func.__name__}\")\n        return func(*args, **kwargs)\n    return wrapper\n\n@logger\ndef add(a, b):\n    return a + b\n\nprint(add(2, 3))  # Calling add \\n 5\n\n# Factory function\ndef make_multiplier(n):\n    return lambda x: x * n\n\ndouble = make_multiplier(2)\ntriple = make_multiplier(3)\nprint(double(5))  # 10\nprint(triple(5))  # 15",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Why It Matters"
    },
    {
     "t": "p",
     "text": "Higher-order functions enable: - **Abstraction**: Separate \"what to do\" from \"how to iterate.\" - **Composition**: Build complex behavior from simple functions. - **Reusability**: Same HOF with different functions. - **Declarative style**: Describe the transformation, not the loop."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is currying in Python? How to implement with lambda?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "**Currying** transforms a function that takes multiple arguments into a sequence of functions, each taking one argument."
    },
    {
     "t": "p",
     "text": "f→f(x)(y)z"
    },
    {
     "t": "h4",
     "text": "With Lambda"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Regular function\ndef add(x, y):\n    return x + y\n\n# Curried with lambda\nadd_curried = lambda x: lambda y: x + y\n\nprint(add(3, 5))           # 8\nprint(add_curried(3)(5))    # 8\n\n# Partial application\nadd5 = add_curried(5)\nprint(add5(3))   # 8\nprint(add5(10))  # 15\n\n# Three arguments\nvolume = lambda l: lambda w: lambda h: l * w * h\nprint(volume(2)(3)(4))  # 24",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "With `functools.partial`"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import partial\n\ndef add(x, y):\n    return x + y\n\nadd5 = partial(add, 5)\nprint(add5(3))  # 8",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Generic Curry Decorator"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import wraps\nimport inspect\n\ndef curry(func):\n    \"\"\"Auto-curry a function.\"\"\"\n    @wraps(func)\n    def curried(*args, **kwargs):\n        sig = inspect.signature(func)\n        try:\n            sig.bind(*args, **kwargs)\n            return func(*args, **kwargs)\n        except TypeError:\n            return lambda *more_args, **more_kwargs: curried(\n                *args, *more_args, **kwargs, **more_kwargs\n            )\n    return curried\n\n@curry\ndef add(x, y, z):\n    return x + y + z\n\nprint(add(1)(2)(3))    # 6\nprint(add(1, 2)(3))    # 6\nprint(add(1)(2, 3))    # 6\nprint(add(1, 2, 3))    # 6",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key point**: Python doesn't natively support currying (unlike Haskell). You simulate it with nested lambdas or `functools.partial`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is the late binding problem with lambda in loops?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "When creating lambdas inside a loop, they capture the **variable** (by reference), not its **value** at the time of creation. When called later, they all use the variable's **final** value."
    },
    {
     "t": "h4",
     "text": "The Bug"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ All lambdas reference the SAME variable 'i'\nfuncs = [lambda x: x * i for i in range(5)]\n\n# When called, i = 4 (loop's final value)\nprint([f(10) for f in funcs])  # [40, 40, 40, 40, 40]\n# Expected: [0, 10, 20, 30, 40]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Why It Happens"
    },
    {
     "t": "ul",
     "items": [
      "Python closures capture **variables**, not **values**.",
      "The lambda body `x * i` references the variable `i`.",
      "By the time any lambda is called, the loop has finished and `i = 4`.",
      "All five lambdas see `i = 4` → all return `x * 4`."
     ]
    },
    {
     "t": "h4",
     "text": "Fixes"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ✅ Fix 1: Default argument (most common fix)\nfuncs = [lambda x, i=i: x * i for i in range(5)]\nprint([f(10) for f in funcs])  # [0, 10, 20, 30, 40]\n# Default args are evaluated at DEFINITION time, capturing the current value\n\n# ✅ Fix 2: Closure factory\ndef make_mult(i):\n    return lambda x: x * i\nfuncs = [make_mult(i) for i in range(5)]\n\n# ✅ Fix 3: functools.partial\nfrom functools import partial\ndef multiply(i, x):\n    return x * i\nfuncs = [partial(multiply, i) for i in range(5)]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**This is a classic Python interview question.** The same issue applies to `def` inside loops — it's not specific to `lambda`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "How does `functools.partial()` differ from `lambda`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "Both pre-fill arguments to create a new function, but they differ in key ways:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import partial\n\n# Same behavior\ndouble_lambda = lambda x: x * 2\ndouble_partial = partial(int.__mul__, 2)\n\n# More typical example\ndef power(base, exp):\n    return base ** exp\n\nsquare_lambda = lambda x: power(x, 2)\nsquare_partial = partial(power, exp=2)\n\nprint(square_lambda(5))   # 25\nprint(square_partial(5))  # 25",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Key Differences"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`partial`",
      "`lambda`"
     ],
     "rows": [
      [
       "**Introspection**",
       "`.func`, `.args`, `.keywords`",
       "None"
      ],
      [
       "**Picklable**",
       "Yes (serializable)",
       "No"
      ],
      [
       "**Use with multiprocessing**",
       "Works",
       "Fails (can't pickle lambda)"
      ],
      [
       "**Readability**",
       "Shows original func + frozen args",
       "Arbitrary expression"
      ],
      [
       "**Type**",
       "`functools.partial` object",
       "`function`"
      ],
      [
       "**Flexibility**",
       "Can only pre-fill args",
       "Any expression allowed"
      ],
      [
       "**Updates**",
       "Can modify via `.args`, `.keywords`",
       "Immutable"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import partial\n\ndef greet(greeting, name, punct=\"!\"):\n    return f\"{greeting}, {name}{punct}\"\n\n# partial — introspectable\nhi = partial(greet, \"Hi\", punct=\"~\")\nprint(hi.func)      # <function greet at ...>\nprint(hi.args)       # ('Hi',)\nprint(hi.keywords)   # {'punct': '~'}\nprint(hi(\"Alice\"))   # Hi, Alice~\n\n# lambda — opaque\nhi_lambda = lambda name: greet(\"Hi\", name, punct=\"~\")\n# No .func, .args, .keywords attributes",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to choose**: - Use `partial` when freezing arguments of an existing function (especially for `multiprocessing`, `map`, `sorted`). - Use `lambda` when you need an arbitrary expression, not just argument binding."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the difference between `map()`/`filter()` and generator expressions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "Both are **lazy** (produce items on demand), but differ in syntax and flexibility:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n\n# map + filter\nresult_func = map(lambda x: x**2, filter(lambda x: x % 2 == 0, numbers))\n\n# Generator expression\nresult_gen = (x**2 for x in numbers if x % 2 == 0)\n\n# Both produce the same values lazily\nprint(list(result_func))  # [4, 16, 36, 64, 100]\nprint(list(result_gen))   # [4, 16, 36, 64, 100]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Comparison"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`map()`/`filter()`",
      "Generator Expression"
     ],
     "rows": [
      [
       "**Syntax**",
       "Function-based",
       "Expression-based"
      ],
      [
       "**Lazy**",
       "Yes (iterator)",
       "Yes (generator)"
      ],
      [
       "**Readability**",
       "Worse with lambda",
       "More Pythonic"
      ],
      [
       "**Combining filter+map**",
       "Nested calls (inside-out)",
       "Single expression"
      ],
      [
       "**Nested loops**",
       "Not directly supported",
       "`(... for x in A for y in B)`"
      ],
      [
       "**With named functions**",
       "`map(func, data)` — clean",
       "`(func(x) for x in data)`"
      ],
      [
       "**send/throw/close**",
       "No",
       "Yes (generator protocol)"
      ],
      [
       "**Type**",
       "`map`/`filter` object",
       "`generator` object"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Generator is clearly better here\nresult = (x**2 for x in range(1_000_000) if x % 2 == 0)\n\n# vs. harder-to-read equivalent\nresult = map(lambda x: x**2, filter(lambda x: x % 2 == 0, range(1_000_000)))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Bottom line**: Generator expressions are generally preferred in Python. Use `map()`/`filter()` only with existing named functions for conciseness."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How to implement a simple pipeline using functional tools?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "A pipeline applies a series of transformations to data sequentially."
    },
    {
     "t": "h4",
     "text": "Using `map`/`filter`/`reduce`"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import reduce\n\ndata = [\"  Alice \", \" BOB  \", \"  charlie\", \"DIANA  \"]\n\n# Pipeline: strip → lowercase → filter length > 3 → join\nresult = reduce(\n    lambda acc, name: f\"{acc}, {name}\" if acc else name,\n    filter(\n        lambda name: len(name) > 3,\n        map(str.lower,\n            map(str.strip, data)\n        )\n    ),\n    \"\"\n)\nprint(result)  # alice, charlie, diana",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Custom Pipe Function"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import reduce\n\ndef pipe(data, *functions):\n    \"\"\"Apply functions left to right to data.\"\"\"\n    return reduce(lambda acc, func: func(acc), functions, data)\n\n# Usage\nnumbers = [1, -2, 3, -4, 5, -6, 7, -8, 9, -10]\n\nresult = pipe(\n    numbers,\n    lambda data: filter(lambda x: x > 0, data),   # Keep positives\n    lambda data: map(lambda x: x ** 2, data),      # Square them\n    list,                                            # Materialize\n    sum                                              # Sum them\n)\nprint(result)  # 165 (1+9+25+49+81)",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Class-Based Pipeline (Fluent API)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Pipeline:\n    def __init__(self, data):\n        self.data = data\n\n    def map(self, func):\n        self.data = list(map(func, self.data))\n        return self\n\n    def filter(self, func):\n        self.data = list(filter(func, self.data))\n        return self\n\n    def reduce(self, func, initial=None):\n        from functools import reduce\n        if initial is not None:\n            return reduce(func, self.data, initial)\n        return reduce(func, self.data)\n\n    def result(self):\n        return self.data\n\n# Fluent usage\nresult = (Pipeline([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])\n    .filter(lambda x: x % 2 == 0)\n    .map(lambda x: x ** 2)\n    .result()\n)\nprint(result)  # [4, 16, 36, 64, 100]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is `functools.singledispatch`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "`singledispatch` is a decorator that provides **function overloading** based on the type of the **first argument**. It's Python's way of implementing single-dispatch generic functions."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import singledispatch\n\n@singledispatch\ndef process(data):\n    \"\"\"Default handler — called when no specific type matches.\"\"\"\n    raise TypeError(f\"Unsupported type: {type(data)}\")\n\n@process.register(int)\ndef _(data):\n    return f\"Integer: doubled = {data * 2}\"\n\n@process.register(str)\ndef _(data):\n    return f\"String: uppercased = {data.upper()}\"\n\n@process.register(list)\ndef _(data):\n    return f\"List: reversed = {data[::-1]}\"\n\n@process.register(dict)\ndef _(data):\n    return f\"Dict: keys = {list(data.keys())}\"\n\n# Dispatch based on argument type\nprint(process(42))              # Integer: doubled = 84\nprint(process(\"hello\"))         # String: uppercased = HELLO\nprint(process([1, 2, 3]))       # List: reversed = [3, 2, 1]\nprint(process({\"a\": 1}))        # Dict: keys = ['a']\n# print(process(3.14))          # TypeError: Unsupported type: <class 'float'>",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "With Type Hints (Python 3.7+)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import singledispatch\n\n@singledispatch\ndef serialize(obj):\n    raise TypeError(f\"Cannot serialize {type(obj)}\")\n\n@serialize.register\ndef _(obj: int) -> str:\n    return f\"int:{obj}\"\n\n@serialize.register\ndef _(obj: str) -> str:\n    return f'str:\"{obj}\"'\n\n@serialize.register\ndef _(obj: list) -> str:\n    items = \", \".join(serialize(item) for item in obj)\n    return f\"[{items}]\"\n\nprint(serialize(42))              # int:42\nprint(serialize(\"hello\"))         # str:\"hello\"\nprint(serialize([1, \"two\", 3]))   # [int:1, str:\"two\", int:3]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Key Points"
    },
    {
     "t": "ul",
     "items": [
      "**Single dispatch**Overload based on the type of the **first** argument only.",
      "Use `@func.register(type)` to add implementations for specific types.",
      "The base function is the fallback / default handler.",
      "For method overloading in classes, use `singledispatchmethod` (Python 3.8+).",
      "Python doesn't support full multiple dispatch natively."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "Functional programming in Python vs truly functional languages — limitations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer**:"
    },
    {
     "t": "p",
     "text": "Python supports a **functional style** but is **not** a functional programming language. It's multi-paradigm (OOP, imperative, functional)."
    },
    {
     "t": "h4",
     "text": "What Python Has"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "Python Support"
     ],
     "rows": [
      [
       "First-class functions",
       "✅ Functions are objects"
      ],
      [
       "Higher-order functions",
       "✅ `map`, `filter`, `sorted`, decorators"
      ],
      [
       "Lambda expressions",
       "✅ Single-expression anonymous functions"
      ],
      [
       "Closures",
       "✅ Functions can capture enclosing scope"
      ],
      [
       "Immutable types",
       "✅ `tuple`, `frozenset`, `str`"
      ],
      [
       "`functools` module",
       "✅ `reduce`, `partial`, `lru_cache`, `singledispatch`"
      ],
      [
       "`itertools` module",
       "✅ Lazy iterators and combinators"
      ],
      [
       "List/dict/set comprehensions",
       "✅ Declarative data transformation"
      ],
      [
       "Generator expressions",
       "✅ Lazy evaluation"
      ]
     ]
    },
    {
     "t": "h4",
     "text": "What Python Lacks (vs Haskell, Erlang, Clojure)"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "Limitation in Python"
     ],
     "rows": [
      [
       "**Tail call optimization**",
       "❌ No TCO — deep recursion causes `RecursionError`"
      ],
      [
       "**Immutability by default**",
       "❌ Most data structures are mutable"
      ],
      [
       "**Pattern matching**",
       "⚠️ `match`/`case` added in 3.10, but limited vs Haskell"
      ],
      [
       "**Algebraic data types**",
       "❌ No native sum types / discriminated unions"
      ],
      [
       "**Pure functions**",
       "❌ No enforcement — side effects anywhere"
      ],
      [
       "**Lazy evaluation**",
       "⚠️ Only via generators/itertools — not language-wide"
      ],
      [
       "**Currying**",
       "❌ Not built-in — must use `partial` or nested lambda"
      ],
      [
       "**Function composition**",
       "❌ No native `compose` or `.` operator"
      ],
      [
       "**Type inference**",
       "⚠️ Dynamic typing — type hints are optional"
      ],
      [
       "**Monads**",
       "❌ No native monad support"
      ],
      [
       "**Referential transparency**",
       "❌ Not enforced — mutable state is common"
      ]
     ]
    },
    {
     "t": "h4",
     "text": "Practical Impact"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ No tail call optimization — this crashes for large n\ndef factorial(n, acc=1):\n    if n == 0:\n        return acc\n    return factorial(n - 1, n * acc)  # No TCO → stack overflow\n\n# factorial(10000)  # RecursionError!\n\n# ✅ Must use iterative approach\ndef factorial(n):\n    result = 1\n    for i in range(2, n + 1):\n        result *= i\n    return result\n\n# ❌ No built-in function composition\n# Haskell: (f . g . h) x\n# Python: must write manually\ndef compose(*funcs):\n    from functools import reduce\n    return reduce(lambda f, g: lambda x: f(g(x)), funcs)\n\ntransform = compose(str.upper, str.strip, lambda s: s.replace(\",\", \"\"))\nprint(transform(\"  hello, world  \"))  # HELLO WORLD",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Guido's Philosophy"
    },
    {
     "t": "p",
     "text": "\"Python is not and will never be a functional programming language. Use functional features where they make sense, but don't force a functional style on everything.\""
    },
    {
     "t": "h4",
     "text": "Summary"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Python",
      "Haskell/Erlang"
     ],
     "rows": [
      [
       "**Paradigm**",
       "Multi-paradigm",
       "Primarily functional"
      ],
      [
       "**Mutability**",
       "Default mutable",
       "Default immutable"
      ],
      [
       "**Side effects**",
       "Unrestricted",
       "Controlled (monads in Haskell)"
      ],
      [
       "**Recursion**",
       "Limited by stack",
       "TCO makes recursion safe"
      ],
      [
       "**Lambda**",
       "Single expression",
       "Full function body"
      ],
      [
       "**Type system**",
       "Dynamic, optional hints",
       "Static, strong inference"
      ],
      [
       "**FP features**",
       "Imported/added",
       "Core language features"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Best practice**: Use functional tools (`map`, `filter`, comprehensions, generators, `partial`) where they improve clarity. Fall back to imperative style for complex logic. Don't fight Python's nature."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Quick Revision Table",
   "body": [
    {
     "t": "table",
     "head": [
      "#",
      "Topic",
      "One-Line Answer"
     ],
     "rows": [
      [
       "Q1",
       "Lambda definition",
       "Anonymous single-expression function; no statements/docstring/annotations"
      ],
      [
       "Q2",
       "Lambda vs def",
       "Lambda for inline throwaway; def for named, reusable, complex functions"
      ],
      [
       "Q3",
       "map()",
       "Applies function to each item; returns lazy iterator"
      ],
      [
       "Q4",
       "map() vs comprehension",
       "Comprehension more Pythonic; map cleaner with named/built-in functions"
      ],
      [
       "Q5",
       "filter()",
       "Returns items where function is True; None removes falsy values"
      ],
      [
       "Q6",
       "reduce() moved",
       "Readability concerns; built-in alternatives exist for common cases"
      ],
      [
       "Q7",
       "operator module",
       "Function versions of operators; faster than lambda, picklable"
      ],
      [
       "Q8",
       "Higher-order functions",
       "Functions that take or return other functions"
      ],
      [
       "Q9",
       "Currying",
       "Transform f(x,y) → f(x)(y); use nested lambda or partial"
      ],
      [
       "Q10",
       "Late binding",
       "Lambda in loop captures variable, not value; fix with default arg"
      ],
      [
       "Q11",
       "partial vs lambda",
       "partial is introspectable, picklable; lambda is more flexible"
      ],
      [
       "Q12",
       "map/filter vs generators",
       "Both lazy; generators more Pythonic with filtering and nesting"
      ],
      [
       "Q13",
       "Pipelines",
       "Chain map/filter/reduce or build custom pipe function"
      ],
      [
       "Q14",
       "singledispatch",
       "Function overloading based on first argument's type"
      ],
      [
       "Q15",
       "Python vs FP langs",
       "Python supports FP style but lacks TCO, immutability, monads"
      ]
     ]
    }
   ]
  }
 ],
 "takeaways": []
});

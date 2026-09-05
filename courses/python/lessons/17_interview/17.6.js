/* ============================================================================
   INTERVIEW 17.6 — Control Flow
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "17.6",
 "lede": "**32 interview questions on control flow**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 32 questions on control flow without prompting",
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
   "q": "1. Using `range(len())` instead of `enumerate()`",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Anti-pattern\nfor i in range(len(items)):\n    print(i, items[i])\n\n# ✅ Pythonic\nfor i, item in enumerate(items):\n    print(i, item)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "2. Manual index for parallel iteration",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Anti-pattern\nfor i in range(min(len(names), len(ages))):\n    print(names[i], ages[i])\n\n# ✅ Pythonic\nfor name, age in zip(names, ages):\n    print(name, age)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "3. Modifying a list while iterating",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Bug-prone\nfor item in items:\n    if bad(item):\n        items.remove(item)   # skips elements!\n\n# ✅ Safe\nitems = [item for item in items if not bad(item)]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "4. Building string in loop with `+=`",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ O(n²) — creates new string each iteration\nresult = \"\"\nfor word in words:\n    result += word + \" \"\n\n# ✅ O(n) — join is optimized\nresult = \" \".join(words)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "5. Using `while` when `for` suffices",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Unnecessarily complex\ni = 0\nwhile i < len(items):\n    process(items[i])\n    i += 1\n\n# ✅ Simpler\nfor item in items:\n    process(item)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "6. Checking `len()` instead of truthiness",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Verbose\nif len(items) > 0:\n    process(items)\n\n# ✅ Pythonic (use truthiness of containers)\nif items:\n    process(items)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "7. Not using `any()`/`all()`",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Manual loop\nfound = False\nfor item in items:\n    if predicate(item):\n        found = True\n        break\n\n# ✅ Built-in\nfound = any(predicate(item) for item in items)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "8. Nested loops for flat operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Inefficient\nresult = []\nfor sublist in nested_list:\n    for item in sublist:\n        result.append(item)\n\n# ✅ Use itertools.chain or comprehension\nfrom itertools import chain\nresult = list(chain.from_iterable(nested_list))\n# or\nresult = [item for sublist in nested_list for item in sublist]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "9. Ignoring `break` in search loops",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Continues even after finding answer\nresult = None\nfor item in large_list:\n    if matches(item):\n        result = item     # keeps going unnecessarily!\n\n# ✅ Stop early\nfor item in large_list:\n    if matches(item):\n        result = item\n        break",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "10. Using exception for normal flow control",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Exceptions for expected conditions\nfor key in keys:\n    try:\n        value = d[key]\n        process(value)\n    except KeyError:\n        pass\n\n# ✅ Check first or use .get()\nfor key in keys:\n    if key in d:\n        process(d[key])\n# or\nfor key in keys:\n    value = d.get(key)\n    if value is not None:\n        process(value)",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q15. How to optimize loops in Python? (list comprehension, map, vectorization)"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Python loops are inherently slow due to interpreter overhead. Here are optimization strategies, from simple to advanced:"
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "1. Use list comprehensions (10–30% faster than equivalent loop)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Slow\nresult = []\nfor x in data:\n    if x > 0:\n        result.append(x ** 2)\n\n# ✅ Faster\nresult = [x ** 2 for x in data if x > 0]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Why faster? Comprehensions are optimized at the bytecode level — they use a specialized `LIST_APPEND` instruction instead of method lookup for `.append()`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "2. Use built-in functions (C-level loops)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Python loop\ntotal = 0\nfor x in numbers:\n    total += x\n\n# ✅ C-level loop\ntotal = sum(numbers)\n\n# Other fast built-ins: min(), max(), any(), all(), sorted(), map(), filter()",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "3. Use `map()` and `filter()` for simple transformations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# map() — applies function to each element\nsquared = list(map(lambda x: x**2, numbers))\n\n# filter() — filters elements\npositives = list(filter(lambda x: x > 0, numbers))\n\n# Comprehensions are usually preferred for readability,\n# but map() is faster when using an existing function (no lambda)\nresult = list(map(str, numbers))     # faster than [str(x) for x in numbers]\nresult = list(map(int, string_list)) # faster than [int(s) for s in string_list]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "4. Minimize work inside loops",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Repeated attribute lookup\nfor item in items:\n    result.append(item.strip().lower())\n\n# ✅ Cache method references (micro-optimization)\nappend = result.append\nstrip = str.strip\nlower = str.lower\nfor item in items:\n    append(lower(strip(item)))",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "5. Use sets for membership testing",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ O(n) membership in list\nfor item in data:\n    if item in large_list:     # O(n) each time\n        process(item)\n\n# ✅ O(1) membership in set\nlarge_set = set(large_list)\nfor item in data:\n    if item in large_set:      # O(1) each time\n        process(item)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "6. Use `collections` module",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter, defaultdict\n\n# ❌ Manual counting\ncounts = {}\nfor item in data:\n    counts[item] = counts.get(item, 0) + 1\n\n# ✅ Counter\ncounts = Counter(data)\n\n# ❌ Manual grouping\ngroups = {}\nfor item in data:\n    key = get_key(item)\n    if key not in groups:\n        groups[key] = []\n    groups[key].append(item)\n\n# ✅ defaultdict\ngroups = defaultdict(list)\nfor item in data:\n    groups[get_key(item)].append(item)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "7. NumPy vectorization (for numerical work — 10–100x faster)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\n# ❌ Python loop — very slow for large data\nresult = []\nfor i in range(1_000_000):\n    result.append(data[i] ** 2 + 2 * data[i] + 1)\n\n# ✅ NumPy — vectorized (no Python loop)\ndata = np.array(data)\nresult = data ** 2 + 2 * data + 1   # runs in C",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "8. Use `itertools` for complex iteration",
   "terms": [
    "Note",
    "profile"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from itertools import chain, product, combinations\n\n# Flatten nested lists\nflat = list(chain.from_iterable(nested))\n\n# Cartesian product (instead of nested loops)\nfor a, b in product(range(10), range(10)):\n    process(a, b)\n\n# Combinations\nfor a, b in combinations(items, 2):\n    compare(a, b)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Performance comparison (approximate):**"
    },
    {
     "t": "table",
     "head": [
      "Approach",
      "Relative Speed",
      "Use When"
     ],
     "rows": [
      [
       "NumPy vectorization",
       "1x (baseline — fastest)",
       "Numerical computation"
      ],
      [
       "C-level built-ins (`sum`, `map`)",
       "3–5x slower",
       "Simple aggregation/transformation"
      ],
      [
       "List comprehension",
       "5–8x slower",
       "Building new collections"
      ],
      [
       "Regular `for` loop",
       "8–15x slower",
       "Complex logic, side effects"
      ],
      [
       "`while` loop",
       "10–20x slower",
       "Condition-based iteration"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Note:** These are rough estimates. Always **profile** (`timeit`, `cProfile`) before optimizing. Premature optimization is the root of all evil — optimize only when loops are a proven bottleneck."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the difference between if-elif-else and match-case?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "`if-elif-else`",
      "`match-case` (3.10+)"
     ],
     "rows": [
      [
       "Available since",
       "Python 1.x",
       "Python 3.10+"
      ],
      [
       "Evaluation",
       "Evaluates boolean expressions sequentially",
       "Structural pattern matching against a subject"
      ],
      [
       "Pattern matching",
       "No — only boolean conditions",
       "Yes — destructures values, matches shapes"
      ],
      [
       "Variable binding",
       "Not built-in",
       "Captures parts of the matched structure"
      ],
      [
       "Guard clauses",
       "Part of condition itself",
       "Separate `if` guard after pattern"
      ],
      [
       "Fall-through",
       "No",
       "No (first match wins)"
      ],
      [
       "Complexity handling",
       "Verbose for structural matching",
       "Elegant for complex data structures"
      ],
      [
       "Use case",
       "General boolean logic",
       "Parsing commands, protocol handling, AST walking"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# if-elif: testing conditions\nif status == 200:\n    handle_ok()\nelif status == 404:\n    handle_not_found()\nelse:\n    handle_other()\n\n# match-case: structural matching (much more powerful)\nmatch response:\n    case {\"status\": 200, \"data\": data}:\n        process(data)\n    case {\"status\": 404, \"error\": msg}:\n        show_error(msg)\n    case {\"status\": code} if code >= 500:\n        retry()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key distinction:** `match-case` excels when you need to **destructure and bind** parts of a data structure simultaneously, something `if-elif` cannot do concisely."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "How does for-else work? When is else executed?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "The `else` block of a `for` loop executes **only when the loop completes normally** — that is, when it exhausts the iterable without encountering a `break`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# else RUNS — no break encountered\nfor n in [2, 4, 6]:\n    if n % 2 != 0:\n        print(\"Found odd\")\n        break\nelse:\n    print(\"All even\")  # ← executes\n\n# else DOES NOT RUN — break was hit\nfor n in [2, 3, 6]:\n    if n % 2 != 0:\n        print(\"Found odd\")  # ← executes\n        break\nelse:\n    print(\"All even\")       # ← skipped",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Scenario",
      "`else` executes?"
     ],
     "rows": [
      [
       "Loop completes all iterations",
       "✅ Yes"
      ],
      [
       "Loop exits via `break`",
       "❌ No"
      ],
      [
       "Loop body never runs (empty iterable)",
       "✅ Yes"
      ],
      [
       "Exception raised inside loop",
       "❌ No (exception propagates)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Common use case:** Searching for an item — `else` handles the \"not found\" case."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def find_prime_factor(n):\n    for i in range(2, n):\n        if n % i == 0:\n            return i       # found factor → break-like (return exits)\n    else:\n        return None        # no factor found → n is prime",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Mental model:** Think of `else` as `nobreak` — it runs when no `break` was triggered."
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is the difference between break, continue, and pass?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Statement",
      "Effect",
      "Scope"
     ],
     "rows": [
      [
       "`break`",
       "**Exits** the innermost loop entirely",
       "Affects only the innermost `for`/`while`"
      ],
      [
       "`continue`",
       "**Skips** the rest of the current iteration, jumps to the next",
       "Affects only the innermost `for`/`while`"
      ],
      [
       "`pass`",
       "**Does nothing** — a syntactic placeholder",
       "No effect on control flow at all"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "for i in range(5):\n    if i == 2:\n        break       # loop terminates at i=2\n    print(i)\n# Output: 0 1\n\nfor i in range(5):\n    if i == 2:\n        continue    # skips i=2, continues with i=3\n    print(i)\n# Output: 0 1 3 4\n\nfor i in range(5):\n    if i == 2:\n        pass        # does nothing, execution continues\n    print(i)\n# Output: 0 1 2 3 4",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Common mistakes:** - Using `pass` when you mean `continue`. - Expecting `break` to exit **all** nested loops (it only exits the innermost). - Forgetting that `break` prevents `else` from running on a loop."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "How does Python's for loop work internally? (Iteration protocol)",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Python's `for` loop is built on the **iteration protocol**, which consists of two dunder methods:"
    },
    {
     "t": "ol",
     "items": [
      "**`__iter__()`**Called on the iterable to obtain an iterator object.",
      "**`__next__()`**Called on the iterator to get the next value. Raises `StopIteration` when exhausted."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# This for loop:\nfor item in [10, 20, 30]:\n    print(item)\n\n# Is equivalent to:\n_iter = iter([10, 20, 30])   # calls list.__iter__() → returns list_iterator\nwhile True:\n    try:\n        item = next(_iter)    # calls iterator.__next__()\n    except StopIteration:\n        break\n    print(item)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Iterable vs Iterator:**"
    },
    {
     "t": "table",
     "head": [
      "Concept",
      "Has `__iter__`?",
      "Has `__next__`?",
      "Reusable?"
     ],
     "rows": [
      [
       "**Iterable** (list, str, dict)",
       "✅ Yes",
       "❌ No",
       "✅ Yes — creates new iterator each time"
      ],
      [
       "**Iterator** (file, generator)",
       "✅ Yes (returns self)",
       "✅ Yes",
       "❌ No — single pass, then exhausted"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "nums = [1, 2, 3]        # iterable\nit = iter(nums)          # iterator\n\nprint(next(it))  # 1\nprint(next(it))  # 2\nprint(next(it))  # 3\n# next(it) → StopIteration\n\n# But nums itself is still usable:\nfor n in nums:\n    print(n)     # works again — creates a new iterator",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is structural pattern matching (match/case)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Structural pattern matching (PEP 634, Python 3.10+) allows you to **match the structure and content** of data, not just equality. It combines: - Value comparison - Type checking - Destructuring / unpacking - Variable binding - Guard conditions"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Basic literal matching\nmatch status_code:\n    case 200:\n        return \"OK\"\n    case 404:\n        return \"Not Found\"\n\n# Structural matching — the real power\nmatch event:\n    case {\"type\": \"click\", \"position\": (x, y)}:\n        handle_click(x, y)\n    case {\"type\": \"key\", \"modifiers\": [*mods], \"char\": c}:\n        handle_key(c, mods)\n\n# Class pattern matching\nmatch shape:\n    case Circle(radius=r) if r > 0:\n        area = 3.14 * r ** 2\n    case Rectangle(width=w, height=h):\n        area = w * h",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Pattern types:**"
    },
    {
     "t": "table",
     "head": [
      "Pattern",
      "Example",
      "Matches"
     ],
     "rows": [
      [
       "Literal",
       "`case 42:`",
       "Exact value"
      ],
      [
       "Capture",
       "`case x:`",
       "Anything, binds to `x`"
      ],
      [
       "Wildcard",
       "`case _:`",
       "Anything, no binding"
      ],
      [
       "OR",
       "`case 1 \\| 2 \\| 3:`",
       "Any of the values"
      ],
      [
       "Sequence",
       "`case [a, b, *rest]:`",
       "Lists/tuples of that shape"
      ],
      [
       "Mapping",
       "`case {\"key\": val}:`",
       "Dicts with those keys"
      ],
      [
       "Class",
       "`case Point(x=0, y=y):`",
       "Objects of that class"
      ],
      [
       "Guard",
       "`case x if x > 0:`",
       "Pattern + condition"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Important:** `match-case` is **not** a switch statement — it does not support fall-through."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "Can you modify a collection while iterating over it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Lists — NO (generally unsafe).** Modifying a list during iteration causes skipped or repeated elements because the internal index shifts."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ BROKEN — skips elements\nnums = [1, 2, 3, 4, 5]\nfor n in nums:\n    if n % 2 == 0:\n        nums.remove(n)\nprint(nums)   # [1, 3, 5] — looks right but unreliable\n\nnums = [2, 4, 6, 8]\nfor n in nums:\n    if n % 2 == 0:\n        nums.remove(n)\nprint(nums)   # [4, 8] — WRONG! Expected empty list",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Safe alternatives:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 1. Iterate over a copy\nfor n in nums[:]:\n    if n % 2 == 0:\n        nums.remove(n)\n\n# 2. List comprehension (preferred)\nnums = [n for n in nums if n % 2 != 0]\n\n# 3. Reverse iteration for index-based removal\nfor i in range(len(nums) - 1, -1, -1):\n    if nums[i] % 2 == 0:\n        del nums[i]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Dicts — RuntimeError in Python 3.**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "d = {\"a\": 1, \"b\": 2, \"c\": 3}\nfor k in d:\n    if d[k] < 2:\n        del d[k]   # RuntimeError: dictionary changed size during iteration\n\n# Safe: iterate over a copy of keys\nfor k in list(d):\n    if d[k] < 2:\n        del d[k]\n\n# Or: dict comprehension\nd = {k: v for k, v in d.items() if v >= 2}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Sets — RuntimeError.** Same as dicts — cannot change size during iteration."
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is the difference between range() in Python 2 vs 3?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "Python 2 `range()`",
      "Python 2 `xrange()`",
      "Python 3 `range()`"
     ],
     "rows": [
      [
       "Returns",
       "`list`",
       "`xrange` object (lazy)",
       "`range` object (lazy)"
      ],
      [
       "Memory",
       "O(n)",
       "O(1)",
       "O(1)"
      ],
      [
       "Type",
       "`list`",
       "`xrange`",
       "`range`"
      ],
      [
       "Supports `len()`",
       "✅",
       "✅",
       "✅"
      ],
      [
       "Supports indexing",
       "✅",
       "✅",
       "✅"
      ],
      [
       "Supports slicing",
       "✅ (returns list)",
       "❌",
       "✅ (returns range)"
      ],
      [
       "`in` membership",
       "O(n)",
       "O(n)",
       "**O(1)** — arithmetic"
      ],
      [
       "`==` comparison",
       "Value comparison (list)",
       "Identity only",
       "**Value comparison**"
      ],
      [
       "Picklable",
       "✅",
       "❌",
       "✅"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Python 3\nr = range(0, 1_000_000)\nprint(type(r))         # <class 'range'>\nprint(500_000 in r)    # True — O(1), computed arithmetically\nprint(r == range(0, 1_000_000))  # True — value equality\nprint(r[::2])          # range(0, 1000000, 2) — returns a new range\n\nimport sys\nprint(sys.getsizeof(r))  # 48 bytes regardless of size",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Python 3's `range()` is essentially an improved version of Python 2's `xrange()`, with added features like O(1) membership testing, slicing, and equality comparison. Python 2's `range()` (which returns a list) has no equivalent in Python 3 — use `list(range(...))` if you need an actual list."
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "How does Python handle nested loop breaking?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`break` only exits the **innermost** enclosing loop. There is no built-in multi-level break."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# break only exits inner loop\nfor i in range(3):\n    for j in range(3):\n        if j == 1:\n            break          # exits inner loop only\n        print(f\"({i},{j})\")\n# Output: (0,0) (1,0) (2,0)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Strategies to break from nested loops:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 1. Flag variable\ndone = False\nfor i in range(10):\n    for j in range(10):\n        if some_condition(i, j):\n            done = True\n            break\n    if done:\n        break\n\n# 2. Extract into a function (preferred)\ndef search():\n    for i in range(10):\n        for j in range(10):\n            if some_condition(i, j):\n                return (i, j)\n    return None\n\n# 3. Exception (not recommended for normal flow)\nclass Found(Exception):\n    pass\n\ntry:\n    for i in range(10):\n        for j in range(10):\n            if some_condition(i, j):\n                raise Found(f\"{i}, {j}\")\nexcept Found as e:\n    print(e)\n\n# 4. itertools.product (flatten to single loop)\nfrom itertools import product\nfor i, j in product(range(10), range(10)):\n    if some_condition(i, j):\n        break\n\n# 5. for-else chain\nfor i in range(10):\n    for j in range(10):\n        if some_condition(i, j):\n            break\n    else:\n        continue    # only runs if inner loop didn't break\n    break           # runs if inner loop DID break",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Recommended approach:** Extract into a function and use `return`. It's the cleanest and most Pythonic."
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What are the performance implications of nested loops?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Nested loops multiply their iterations: `O(n × m)` for two loops, `O(n × m × p)` for three, etc."
    },
    {
     "t": "p",
     "text": "**Common performance pitfalls:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ O(n²) — checking membership in a list inside a loop\nfor item in list_a:         # O(n)\n    if item in list_b:      # O(m) for each check\n        results.append(item)\n# Total: O(n × m)\n\n# ✅ O(n + m) — convert to set first\nset_b = set(list_b)         # O(m) one-time cost\nfor item in list_a:         # O(n)\n    if item in set_b:       # O(1) for each check\n        results.append(item)\n# Total: O(n + m)\n\n# ✅ Even better — set intersection\nresults = list(set(list_a) & set(list_b))  # O(n + m)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Optimization strategies:**"
    },
    {
     "t": "table",
     "head": [
      "Strategy",
      "Technique",
      "Benefit"
     ],
     "rows": [
      [
       "Reduce inner loop work",
       "Pre-compute, cache lookups",
       "Lower constant factor"
      ],
      [
       "Use sets for membership",
       "`set()` for O(1) `in` checks",
       "O(n²) → O(n)"
      ],
      [
       "Break early",
       "`break` when answer found",
       "Avoid unnecessary iterations"
      ],
      [
       "Use built-ins",
       "`any()`, `all()`, `sum()`",
       "C-level loops, short-circuit"
      ],
      [
       "Vectorize",
       "NumPy operations",
       "Avoid Python loops entirely"
      ],
      [
       "Use comprehensions",
       "List/dict/set comprehensions",
       "~10-30% faster than equivalent loop"
      ],
      [
       "Algorithm change",
       "Sort + binary search, hash maps",
       "O(n²) → O(n log n) or O(n)"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ O(n²) — nested loop to find pair\nfor i in range(len(nums)):\n    for j in range(i+1, len(nums)):\n        if nums[i] + nums[j] == target:\n            return (i, j)\n\n# ✅ O(n) — hash map approach\nseen = {}\nfor i, num in enumerate(nums):\n    complement = target - num\n    if complement in seen:\n        return (seen[complement], i)\n    seen[num] = i",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "How does short-circuit evaluation work with and/or?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Python's `and` and `or` operators use **short-circuit evaluation** — they stop evaluating as soon as the result is determined, and return the **actual value** (not just `True`/`False`)."
    },
    {
     "t": "p",
     "text": "**Rules:**"
    },
    {
     "t": "table",
     "head": [
      "Operator",
      "Returns",
      "Short-circuits when"
     ],
     "rows": [
      [
       "`x and y`",
       "First falsy value, or last value if all truthy",
       "First operand is falsy"
      ],
      [
       "`x or y`",
       "First truthy value, or last value if all falsy",
       "First operand is truthy"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 'and' — returns first falsy, or last value\nprint(1 and 2 and 3)       # 3   (all truthy → last value)\nprint(1 and 0 and 3)       # 0   (first falsy)\nprint(1 and \"\" and 3)      # \"\"  (first falsy)\nprint([] and \"hello\")      # []  (first falsy)\n\n# 'or' — returns first truthy, or last value\nprint(0 or \"\" or \"hello\")  # \"hello\" (first truthy)\nprint(0 or \"\" or [])       # []      (all falsy → last value)\nprint(\"hi\" or \"bye\")       # \"hi\"    (first truthy)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Practical uses:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Default values (before walrus operator)\nname = user_input or \"Anonymous\"\n\n# Safe attribute access\nresult = obj and obj.method()\n\n# Guard against None/division by zero\nif x is not None and x > 0:    # x > 0 not evaluated if x is None\n    process(x)\n\nif denominator != 0 and numerator / denominator > threshold:\n    pass  # safe — division only happens if denominator ≠ 0",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**In conditional context:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Short-circuit prevents errors\ndata = None\nif data and len(data) > 0:    # len(data) never called since data is falsy\n    process(data)\n\n# But be careful with 0 and empty strings\ncount = 0\nif count or \"default\":        # returns \"default\" — may not be intended!\n    pass",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is the walrus operator and how is it used in loops?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "The **walrus operator** `:=` (PEP 572, Python 3.8+) is an **assignment expression** — it assigns a value to a variable **and** returns that value in a single expression."
    },
    {
     "t": "p",
     "text": "**Syntax:** `variable := expression`"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Without walrus — need separate assignment\ndata = input()\nwhile data != \"quit\":\n    process(data)\n    data = input()       # duplicate call\n\n# With walrus — cleaner\nwhile (data := input()) != \"quit\":\n    process(data)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Common loop patterns:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 1. Reading input until sentinel\nwhile (line := input(\">>> \")) != \"exit\":\n    print(f\"You said: {line}\")\n\n# 2. Reading file in chunks\nwith open(\"large.bin\", \"rb\") as f:\n    while (chunk := f.read(8192)):\n        process(chunk)\n\n# 3. Regex matching in loop\nimport re\nwhile (m := re.search(pattern, text)):\n    process(m.group())\n    text = text[m.end():]\n\n# 4. Filtering with reuse\nresults = [\n    cleaned\n    for raw in data\n    if (cleaned := clean(raw)) is not None\n]\n\n# 5. any()/all() with capture\nif any((match := item) > threshold for item in items):\n    print(f\"Found: {match}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rules and gotchas:** - Walrus operator has **very low precedence** — use parentheses. - Cannot be used at the top level of an expression statement (`x := 5` alone is a `SyntaxError`; use `x = 5`). - Cannot be used for augmented assignment (`x +:= 1` is invalid). - The variable leaks into the enclosing scope (like regular loop variables)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is the difference between iter(obj) and iter(callable, sentinel)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`iter()` has two forms:"
    },
    {
     "t": "p",
     "text": "**Form 1: `iter(iterable)`** — Standard iteration"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "it = iter([1, 2, 3])   # calls [1,2,3].__iter__()\nprint(next(it))  # 1\nprint(next(it))  # 2\nprint(next(it))  # 3",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Form 2: `iter(callable, sentinel)`** — Call-based iteration"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Calls callable() repeatedly until it returns sentinel\nimport random\nfor roll in iter(lambda: random.randint(1, 6), 6):\n    print(roll)   # prints rolls until a 6 is rolled (6 is NOT yielded)",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "`iter(iterable)`",
      "`iter(callable, sentinel)`"
     ],
     "rows": [
      [
       "Argument 1",
       "Object with `__iter__`",
       "Zero-argument callable"
      ],
      [
       "Argument 2",
       "None",
       "Sentinel (stop) value"
      ],
      [
       "Mechanism",
       "Calls `__iter__()` to get iterator",
       "Calls callable repeatedly"
      ],
      [
       "Stops when",
       "`StopIteration` raised by `__next__`",
       "Return value `== sentinel`"
      ],
      [
       "Sentinel yielded?",
       "N/A",
       "No — sentinel is NOT included"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Practical use cases for two-arg form:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 1. Read file in fixed blocks until EOF\nwith open(\"file.bin\", \"rb\") as f:\n    for block in iter(lambda: f.read(4096), b\"\"):\n        process(block)\n\n# 2. Consume a queue until a poison pill\nimport queue\nq = queue.Queue()\n# ... producer puts items, then puts None as signal ...\nfor item in iter(q.get, None):\n    process(item)\n\n# 3. Read lines until empty line\nimport sys\nfor line in iter(sys.stdin.readline, \"\\n\"):\n    process(line.strip())",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "31",
   "q": "How does enumerate() work internally?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`enumerate()` returns an **iterator** that yields `(index, element)` tuples. Internally, it's roughly equivalent to:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def my_enumerate(iterable, start=0):\n    n = start\n    for item in iterable:\n        yield n, item\n        n += 1",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Actual CPython implementation** is in C for performance, but the behavior is identical."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# enumerate returns an enumerate object (iterator)\ne = enumerate([\"a\", \"b\", \"c\"])\nprint(type(e))   # <class 'enumerate'>\n\nprint(next(e))   # (0, 'a')\nprint(next(e))   # (1, 'b')\nprint(next(e))   # (2, 'c')\n# next(e) → StopIteration",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key properties:** - **Lazy** — computes values on demand, O(1) memory overhead. - Works with **any iterable** (lists, generators, files, custom iterables). - `start` parameter offsets the counter but doesn't skip elements. - The returned object is an **iterator** (single-pass, not reusable)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Common usage patterns\nfruits = [\"apple\", \"banana\", \"cherry\"]\n\n# Standard\nfor i, fruit in enumerate(fruits):\n    print(f\"{i}: {fruit}\")\n\n# With start\nfor i, fruit in enumerate(fruits, 1):\n    print(f\"{i}. {fruit}\")\n\n# Creating indexed dict\nfruit_map = dict(enumerate(fruits))\n# {0: 'apple', 1: 'banana', 2: 'cherry'}\n\n# Finding index of matching element\nindices = [i for i, x in enumerate(data) if x > threshold]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What are the common loop anti-patterns to avoid?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    }
   ]
  }
 ],
 "takeaways": []
});

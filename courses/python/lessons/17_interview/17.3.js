/* ============================================================================
   INTERVIEW 17.3 — Lists
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "17.3",
 "lede": "**25 interview questions on lists**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 25 questions on lists without prompting",
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
   "q": "What is a list in Python? How is it implemented internally?",
   "body": [
    {
     "t": "p",
     "text": "A Python **list** is an ordered, mutable, dynamic-length sequence that can hold heterogeneous elements."
    },
    {
     "t": "h4",
     "text": "Internal Implementation (CPython)"
    },
    {
     "t": "p",
     "text": "Internally, a list is a **dynamic array of pointers** (C-level `PyObject *` references), not the objects themselves."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "PyListObject\n┌────────────────┐\n│ ob_refcnt      ││   Reference count\n│ ob_type        ││   → list type\n│ ob_size        ││   Number of elements currently in the list\n│ allocated      ││   Total slots allocated (≥ ob_size)\n│ **ob_item      ││──► [ ptr | ptr | ptr | ptr | ... | NULL | NULL ]\n└────────────────┘        │     │     │     │           ↑\n                          ▼     ▼     ▼     ▼     over-allocated slots\n                        obj0  obj1  obj2  obj3",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Over-Allocation Strategy"
    },
    {
     "t": "p",
     "text": "When `append()` causes the array to exceed capacity, Python **over-allocates** a larger block:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "new_allocated = (newsize >> 3) + (3 if newsize < 9 else 6) + newsize",
     "numbered": false
    },
    {
     "t": "p",
     "text": "This gives roughly **12.5% extra** for large lists, ensuring **amortized O(1)** appends. Growth pattern: `0 → 4 → 8 → 16 → 24 → 32 → 40 → 52 → 64 → 76 → ...`"
    },
    {
     "t": "h4",
     "text": "Key Implications"
    },
    {
     "t": "ul",
     "items": [
      "**Indexing is O(1)**Direct pointer arithmetic (`ob_item[i]`)",
      "**Append is amortized O(1)**Occasional O(n) resize",
      "**Insert/Delete at position is O(n)**Must shift elements",
      "**Memory overhead**Each element costs 8 bytes (pointer) + the object itself",
      "**Heterogeneous**Any Python object can be stored (all pointers are the same size)"
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Time complexity of list operations",
   "body": [
    {
     "t": "table",
     "head": [
      "Operation",
      "Average Case",
      "Worst Case",
      "Notes"
     ],
     "rows": [
      [
       "`a[i]` (index)",
       "O(1)",
       "O(1)",
       "Pointer arithmetic"
      ],
      [
       "`a[i] = x` (assign)",
       "O(1)",
       "O(1)",
       ""
      ],
      [
       "`a.append(x)`",
       "**O(1)** amortized",
       "O(n)",
       "O(n) only on resize"
      ],
      [
       "`a.insert(i, x)`",
       "**O(n)**",
       "O(n)",
       "Shifts elements right"
      ],
      [
       "`a.pop()`",
       "**O(1)**",
       "O(1)",
       "From end"
      ],
      [
       "`a.pop(i)`",
       "**O(n)**",
       "O(n)",
       "Shifts elements left"
      ],
      [
       "`a.remove(x)`",
       "**O(n)**",
       "O(n)",
       "Search + shift"
      ],
      [
       "`x in a`",
       "**O(n)**",
       "O(n)",
       "Linear scan"
      ],
      [
       "`a.index(x)`",
       "**O(n)**",
       "O(n)",
       "Linear scan"
      ],
      [
       "`a[i:j]` (slice)",
       "**O(k)**",
       "O(k)",
       "k = j - i"
      ],
      [
       "`a[i:j] = b`",
       "**O(k + n)**",
       "O(k + n)",
       ""
      ],
      [
       "`del a[i]`",
       "**O(n)**",
       "O(n)",
       "Shifts elements"
      ],
      [
       "`a.sort()`",
       "**O(n log n)**",
       "O(n log n)",
       "Timsort"
      ],
      [
       "`len(a)`",
       "**O(1)**",
       "O(1)",
       "Stored attribute"
      ],
      [
       "`min(a)` / `max(a)`",
       "**O(n)**",
       "O(n)",
       ""
      ],
      [
       "`a.extend(b)`",
       "**O(k)**",
       "O(k)",
       "k = len(b)"
      ],
      [
       "`a + b`",
       "**O(n + m)**",
       "O(n + m)",
       "Creates new list"
      ],
      [
       "`a.copy()`",
       "**O(n)**",
       "O(n)",
       "Shallow copy"
      ],
      [
       "`a.count(x)`",
       "**O(n)**",
       "O(n)",
       "Full scan"
      ],
      [
       "`a.reverse()`",
       "**O(n)**",
       "O(n)",
       "In-place swap"
      ]
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Difference between `append()` and `extend()`?",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "`append(x)`",
      "`extend(iterable)`"
     ],
     "rows": [
      [
       "**What it adds**",
       "The argument as a **single element**",
       "**Each element** from the iterable"
      ],
      [
       "**Argument type**",
       "Any object",
       "Must be iterable"
      ],
      [
       "**List growth**",
       "+1 element",
       "+k elements (k = len of iterable)"
      ],
      [
       "**Time**",
       "O(1) amortized",
       "O(k)"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = [1, 2, 3]\na.append([4, 5])     # [1, 2, 3, [4, 5]]   — nested list\na.extend([6, 7])     # [1, 2, 3, [4, 5], 6, 7]\n\n# extend is equivalent to:\nfor item in [6, 7]:\n    a.append(item)\n\n# += is the same as extend (in-place)\na += [8, 9]          # same as a.extend([8, 9])",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Interview tip**: `append` adds the object itself; `extend` iterates and adds individual elements. `extend` is faster than calling `append` in a loop because it's implemented in C."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "How does `sort()` work internally? (Timsort)",
   "body": [
    {
     "t": "p",
     "text": "Python's `sort()` uses **Timsort**, a hybrid sorting algorithm designed by Tim Peters in 2002."
    },
    {
     "t": "h4",
     "text": "Timsort Details"
    },
    {
     "t": "table",
     "head": [
      "Property",
      "Value"
     ],
     "rows": [
      [
       "**Algorithm**",
       "Hybrid: merge sort + insertion sort"
      ],
      [
       "**Best case**",
       "O(n) — already sorted or nearly sorted"
      ],
      [
       "**Average case**",
       "O(n log n)"
      ],
      [
       "**Worst case**",
       "O(n log n)"
      ],
      [
       "**Space**",
       "O(n) — auxiliary memory for merging"
      ],
      [
       "**Stable**",
       "✅ Yes — equal elements preserve relative order"
      ],
      [
       "**In-place**",
       "✅ Yes (modifies original list)"
      ]
     ]
    },
    {
     "t": "h4",
     "text": "How It Works"
    },
    {
     "t": "ol",
     "items": [
      "**Find natural runs**Scans the array for pre-existing sorted subsequences (\"runs\")",
      "**Minimum run length**If runs are too short, extends them to a minimum length (typically 32–64) using **binary insertion sort**",
      "**Merge runs**Merges runs using a modified **merge sort** with a **merge stack** that maintains invariants similar to a Fibonacci sequence"
     ]
    },
    {
     "t": "h4",
     "text": "Why Timsort?"
    },
    {
     "t": "ul",
     "items": [
      "Exploits **partially sorted data** (common in real-world data)",
      "On already-sorted data: O(n) — just one pass to confirm",
      "**Stable**crucial for multi-key sorting",
      "Used by: Python, Java (for objects), Android, Swift"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Stability example\ndata = [(\"B\", 2), (\"A\", 1), (\"C\", 2), (\"D\", 1)]\n\n# Stable sort by second element — first elements retain original order\nsorted(data, key=lambda x: x[1])\n# [('A', 1), ('D', 1), ('B', 2), ('C', 2)]\n# A before D (both have 1), B before C (both have 2)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the difference between `sort()` and `sorted()`?",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "`list.sort()`",
      "`sorted()`"
     ],
     "rows": [
      [
       "**Type**",
       "List method",
       "Built-in function"
      ],
      [
       "**In-place**",
       "✅ Yes",
       "❌ No — returns new list"
      ],
      [
       "**Returns**",
       "`None`",
       "New sorted list"
      ],
      [
       "**Works on**",
       "Lists only",
       "Any iterable (list, tuple, dict, generator, etc.)"
      ],
      [
       "**Original**",
       "Modified",
       "Unchanged"
      ],
      [
       "**Memory**",
       "O(1) extra",
       "O(n) — creates new list"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# sort() — in-place, returns None\na = [3, 1, 4]\nresult = a.sort()\nprint(result)  # None\nprint(a)       # [1, 3, 4]\n\n# sorted() — returns new list\na = [3, 1, 4]\nresult = sorted(a)\nprint(result)  # [1, 3, 4]\nprint(a)       # [3, 1, 4]  — unchanged\n\n# sorted() works on any iterable\nsorted(\"python\")        # ['h', 'n', 'o', 'p', 't', 'y']\nsorted({3, 1, 2})       # [1, 2, 3]\nsorted({\"b\": 2, \"a\": 1}) # ['a', 'b']  — sorts keys",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use which?** - Use `sort()` when you don't need the original order and want to save memory - Use `sorted()` when you need both the original and sorted versions, or when working with non-list iterables"
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How is `list` different from `array.array`?",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "`list`",
      "`array.array`"
     ],
     "rows": [
      [
       "**Elements**",
       "Heterogeneous (any Python object)",
       "Homogeneous (single type)"
      ],
      [
       "**Storage**",
       "Array of pointers to PyObjects",
       "Contiguous array of raw values"
      ],
      [
       "**Memory**",
       "Higher (~36 KB for 1000 ints)",
       "Lower (~4 KB for 1000 ints)"
      ],
      [
       "**Type safety**",
       "None",
       "Enforced by typecode"
      ],
      [
       "**Speed**",
       "Slower for numeric ops",
       "Faster for numeric I/O"
      ],
      [
       "**Flexibility**",
       "Full Python object support",
       "Numeric types only"
      ],
      [
       "**Use case**",
       "General purpose",
       "Memory-efficient numeric storage"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import array\nimport sys\n\nlst = list(range(1000))\narr = array.array('i', range(1000))   # 'i' = signed 32-bit int\n\nsys.getsizeof(lst)   # ~8056 bytes (pointers only, not counting int objects)\nsys.getsizeof(arr)   # ~4064 bytes (raw 4-byte ints)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use `array.array`:** - Storing large amounts of homogeneous numeric data - Interfacing with C code or binary I/O - When `numpy` is not available"
    },
    {
     "t": "p",
     "text": "**In practice**, most people use **`numpy.ndarray`** instead of `array.array` for numeric work — it's even more memory-efficient and vastly faster."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What happens when you do `list * n` with mutable elements?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# With immutable elements — SAFE\na = [0] * 5\na[0] = 99\nprint(a)  # [99, 0, 0, 0, 0]  — only first changed\n\n# With mutable elements — DANGEROUS\nb = [[]] * 3\nb[0].append(1)\nprint(b)  # [[1], [1], [1]]  — ALL changed!\n\n# Why?\nprint(b[0] is b[1] is b[2])  # True — same object!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Explanation**: `*` creates `n` references to the **same object**. For immutable types (int, str), this is fine because you can't modify them in-place — reassignment creates a new object. For mutable types (list, dict, set), all references point to the **same** mutable object."
    },
    {
     "t": "p",
     "text": "**Fix:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "b = [[] for _ in range(3)]    # each [] is a new list object\nb[0].append(1)\nprint(b)  # [[1], [], []]     — only first changed",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Why are mutable default arguments dangerous?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def append_to(item, lst=[]):\n    lst.append(item)\n    return lst\n\nprint(append_to(1))   # [1]\nprint(append_to(2))   # [1, 2]    ← BUG! Expected [2]\nprint(append_to(3))   # [1, 2, 3] ← BUG! Expected [3]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why this happens:** 1. Default argument values are evaluated **once** — at function **definition** time, not at call time 2. The empty list `[]` is created once and stored in `append_to.__defaults__` 3. Every call without an explicit `lst` argument uses the **same list object**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# You can see the default object:\nprint(append_to.__defaults__)  # ([1, 2, 3],)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Fix — use `None` sentinel:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def append_to(item, lst=None):\n    if lst is None:\n        lst = []\n    lst.append(item)\n    return lst\n\nprint(append_to(1))   # [1]\nprint(append_to(2))   # [2]  ✅",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**This is a common Python interview question** and one of Python's most well-known gotchas."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How to remove duplicates from a list while preserving order?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Method 1: `dict.fromkeys()` (Python 3.7+, fastest one-liner)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "unique = list(dict.fromkeys(a))\n# [3, 1, 4, 5, 9, 2, 6]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Dicts maintain insertion order in Python 3.7+. `fromkeys()` ignores duplicate keys."
    },
    {
     "t": "h4",
     "text": "Method 2: Seen-set pattern (explicit, works in any Python 3)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "seen = set()\nunique = []\nfor x in a:\n    if x not in seen:\n        seen.add(x)\n        unique.append(x)\n# [3, 1, 4, 5, 9, 2, 6]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Method 3: `set()` — does NOT preserve order"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "unique = list(set(a))\n# Order is arbitrary",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Performance"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Time",
      "Space",
      "Preserves Order"
     ],
     "rows": [
      [
       "`dict.fromkeys()`",
       "O(n)",
       "O(n)",
       "✅ Yes"
      ],
      [
       "Seen-set",
       "O(n)",
       "O(n)",
       "✅ Yes"
      ],
      [
       "`set()`",
       "O(n)",
       "O(n)",
       "❌ No"
      ],
      [
       "Nested loop",
       "O(n²)",
       "O(n)",
       "✅ Yes"
      ]
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is a list comprehension and when should you NOT use one?",
   "body": [
    {
     "t": "p",
     "text": "A **list comprehension** is a concise syntax for creating lists by transforming and/or filtering an iterable."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "[expression for item in iterable if condition]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "When to Use"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Transformation\nsquares = [x ** 2 for x in range(10)]\n\n# Filtering\nevens = [x for x in range(20) if x % 2 == 0]\n\n# Transformation + filtering\nresult = [x.upper() for x in words if len(x) > 3]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "When NOT to Use"
    },
    {
     "t": "p",
     "text": "**1. Side effects** — Don't use comprehensions for actions that don't produce a list:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Bad — side effect only, list is thrown away\n[print(x) for x in items]\n\n# ✅ Good\nfor x in items:\n    print(x)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**2. Too complex** — If readability suffers:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Hard to read\nresult = [transform(x) for group in data for x in group.items if x.valid and x.value > t]\n\n# ✅ Use a regular loop\nresult = []\nfor group in data:\n    for x in group.items:\n        if x.valid and x.value > t:\n            result.append(transform(x))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**3. When you don't need a list** — Use a generator expression:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Wasteful — creates a list just to sum it\ntotal = sum([x ** 2 for x in range(10_000_000)])  # ~80 MB list\n\n# ✅ Generator expression — O(1) memory\ntotal = sum(x ** 2 for x in range(10_000_000))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**4. When logic has state or complex branching** — Use a loop."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "How does list slicing work internally?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = [10, 20, 30, 40, 50]\nb = a[1:4]   # [20, 30, 40]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Internals"
    },
    {
     "t": "ol",
     "items": [
      "Python creates a **new list object**",
      "Copies the **pointers** (references) from the slice range into the new list",
      "Increments the **reference count** of each shared object"
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "a:  [ptr→10, ptr→20, ptr→30, ptr→40, ptr→50]\n                ↓        ↓        ↓\nb:            [ptr→20, ptr→30, ptr→40]  ← new list, shared objects",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Key Points"
    },
    {
     "t": "ul",
     "items": [
      "**Time**O(k) where k = slice length (number of pointers copied)",
      "**Space**O(k) — new list + new pointer array (but objects themselves are shared)",
      "**Shallow**Only pointers are copied, not the objects. Mutable objects are shared.",
      "**Independent**The new list is a separate object — appending to `b` doesn't affect `a`",
      "**But**Modifying a mutable element (e.g., `b[0].append(...)`) affects both (shared reference)"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Slice assignment is different — modifies in-place\na = [0, 1, 2, 3, 4]\na[1:3] = [10, 20, 30]   # a = [0, 10, 20, 30, 3, 4]  — in-place modification",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the difference between `del`, `remove`, and `pop`?",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "`del a[i]`",
      "`a.remove(x)`",
      "`a.pop([i])`"
     ],
     "rows": [
      [
       "**Removes by**",
       "Index",
       "Value",
       "Index"
      ],
      [
       "**Returns**",
       "Nothing",
       "Nothing (`None`)",
       "The removed element"
      ],
      [
       "**If not found**",
       "`IndexError`",
       "`ValueError`",
       "`IndexError`"
      ],
      [
       "**Multiple**",
       "Can delete slices: `del a[1:3]`",
       "Only first occurrence",
       "One at a time"
      ],
      [
       "**Time**",
       "O(n)",
       "O(n)",
       "O(1) for last, O(n) for others"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = [10, 20, 30, 20, 40]\n\n# del — by index, no return\ndel a[1]         # a = [10, 30, 20, 40]\n\n# remove — by value, first occurrence\na.remove(20)     # a = [10, 30, 40]\n\n# pop — by index, returns removed value\nval = a.pop(1)   # val = 30, a = [10, 40]\nval = a.pop()    # val = 40, a = [10]  — default: last element\n\n# del with slice\na = [1, 2, 3, 4, 5]\ndel a[1:3]       # a = [1, 4, 5]\n\n# del the entire list\ndel a            # a no longer exists",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How does Python handle list memory allocation?",
   "body": [
    {
     "t": "p",
     "text": "Python lists use a **dynamic array** with **over-allocation**."
    },
    {
     "t": "h4",
     "text": "Allocation Strategy"
    },
    {
     "t": "ol",
     "items": [
      "**Empty list**Allocates 0 slots initially",
      "**First append**Allocates for ~4 elements",
      "**When full**Allocates a new, larger array and copies all pointers"
     ]
    },
    {
     "t": "h4",
     "text": "Growth Formula (CPython)"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "new_allocated = (newsize >> 3) + (newsize < 9 ? 3 : 6) + newsize",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Current Size",
      "Allocated After Resize"
     ],
     "rows": [
      [
       "0",
       "4"
      ],
      [
       "4",
       "8"
      ],
      [
       "8",
       "16"
      ],
      [
       "16",
       "24"
      ],
      [
       "24",
       "32"
      ],
      [
       "32",
       "40"
      ],
      [
       "40",
       "52"
      ],
      [
       "52",
       "64"
      ]
     ]
    },
    {
     "t": "h4",
     "text": "Why Over-Allocate?"
    },
    {
     "t": "p",
     "text": "Without over-allocation, every `append` would require: 1. Allocating n+1 slots → O(n) memory allocation 2. Copying n pointers → O(n) copy 3. Total for n appends: O(n²)"
    },
    {
     "t": "p",
     "text": "With over-allocation: 1. Most appends just fill an existing slot → O(1) 2. Occasional resize: O(n) 3. Total for n appends: **O(n)** → amortized **O(1)** per append"
    },
    {
     "t": "h4",
     "text": "Memory"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\n\na = []\nprint(sys.getsizeof(a))  # 56 bytes (empty list overhead on 64-bit)\n\na.append(1)\nprint(sys.getsizeof(a))  # 88 bytes (56 + 4 slots × 8 bytes/pointer)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Can lists be dictionary keys? Why not?",
   "body": [
    {
     "t": "p",
     "text": "**No.** Lists cannot be dictionary keys or set members."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "d = {}\nd[[1, 2, 3]] = \"value\"\n# TypeError: unhashable type: 'list'",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Why Not?"
    },
    {
     "t": "ol",
     "items": [
      "Dictionary keys must be **hashable** (implement `__hash__()`)",
      "Hash must be **consistent**: `hash(x)` must always return the same value during `x`'s lifetime",
      "Lists are **mutable** — their contents can change, which would change their hash",
      "If the hash changes after insertion, the dictionary can't find the key anymore → **corruption**"
     ]
    },
    {
     "t": "h4",
     "text": "The Hash-Mutability Contract"
    },
    {
     "t": "p",
     "text": "Python enforces a rule: **mutable objects should not be hashable**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Lists are mutable → not hashable\nhash([1, 2, 3])    # TypeError\n\n# Tuples are immutable → hashable (if contents are hashable)\nhash((1, 2, 3))    # Works: e.g., 529344067295497451\n\n# But tuples containing mutable elements are not hashable\nhash((1, [2, 3]))  # TypeError: unhashable type: 'list'",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Workaround"
    },
    {
     "t": "p",
     "text": "Convert to a tuple:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "d = {}\nkey = tuple([1, 2, 3])\nd[key] = \"value\"       # Works",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How to implement a stack using list?",
   "body": [
    {
     "t": "p",
     "text": "A **stack** follows **LIFO** (Last In, First Out) ordering."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Stack:\n    def __init__(self):\n        self._items = []\n\n    def push(self, item):\n        \"\"\"Add to top — O(1) amortized\"\"\"\n        self._items.append(item)\n\n    def pop(self):\n        \"\"\"Remove and return top — O(1)\"\"\"\n        if self.is_empty():\n            raise IndexError(\"pop from empty stack\")\n        return self._items.pop()\n\n    def peek(self):\n        \"\"\"View top without removing — O(1)\"\"\"\n        if self.is_empty():\n            raise IndexError(\"peek at empty stack\")\n        return self._items[-1]\n\n    def is_empty(self):\n        return len(self._items) == 0\n\n    def size(self):\n        return len(self._items)\n\n    def __repr__(self):\n        return f\"Stack({self._items})\"",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s = Stack()\ns.push(1)\ns.push(2)\ns.push(3)\ns.peek()     # 3\ns.pop()      # 3\ns.pop()      # 2\ns.size()     # 1",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Why List Works Well for Stacks"
    },
    {
     "t": "ul",
     "items": [
      "`append()` → O(1) amortized (push)",
      "`pop()` → O(1) (pop from end)",
      "`[-1]` → O(1) (peek)"
     ]
    },
    {
     "t": "h4",
     "text": "When to Use `deque` Instead"
    },
    {
     "t": "p",
     "text": "For a **queue** (FIFO), use `collections.deque`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import deque\nq = deque()\nq.append(1)     # enqueue (right)\nq.popleft()     # dequeue (left) — O(1) vs list.pop(0) which is O(n)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the difference between shallow copy and deep copy of lists?",
   "body": [
    {
     "t": "h4",
     "text": "Shallow Copy"
    },
    {
     "t": "p",
     "text": "Creates a **new list** but the elements inside are **shared references** to the same objects."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import copy\n\noriginal = [[1, 2], [3, 4], [5, 6]]\n\n# Three ways to shallow copy:\ns1 = original.copy()\ns2 = original[:]\ns3 = list(original)\n\n# Modifying the outer list — independent\ns1.append([7, 8])\nprint(len(original))   # 3 — not affected\n\n# Modifying an inner list — SHARED\ns1[0][0] = 99\nprint(original[0])     # [99, 2] ← affected!",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Deep Copy"
    },
    {
     "t": "p",
     "text": "Creates a **new list** AND recursively copies **all nested objects**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "deep = copy.deepcopy(original)\n\ndeep[0][0] = 999\nprint(original[0])   # [99, 2] ← NOT affected",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Visual Comparison"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "SHALLOW COPY:\noriginal → [ptr_A, ptr_B, ptr_C]\nshallow  → [ptr_A, ptr_B, ptr_C]  ← different list, same inner objects\n                ↓       ↓       ↓\n             [1,2]   [3,4]   [5,6]  ← shared\n\nDEEP COPY:\noriginal → [ptr_A,  ptr_B,  ptr_C]\n               ↓        ↓        ↓\n            [1,2]    [3,4]    [5,6]\n\ndeep     → [ptr_A', ptr_B', ptr_C']  ← different list AND different inner objects\n               ↓        ↓        ↓\n            [1,2]    [3,4]    [5,6]  ← independent copies",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "When to Use Which"
    },
    {
     "t": "table",
     "head": [
      "Scenario",
      "Use"
     ],
     "rows": [
      [
       "Flat list (no nesting)",
       "Shallow copy (`.copy()`, `[:]`)"
      ],
      [
       "Nested mutable objects",
       "`copy.deepcopy()`"
      ],
      [
       "Read-only sharing",
       "No copy needed — just share"
      ]
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How to flatten a nested list?",
   "body": [
    {
     "t": "h4",
     "text": "Method 1: List Comprehension (one level)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "nested = [[1, 2], [3, 4], [5, 6]]\nflat = [x for sub in nested for x in sub]\n# [1, 2, 3, 4, 5, 6]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Method 2: `itertools.chain.from_iterable` (one level, lazy)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from itertools import chain\nflat = list(chain.from_iterable(nested))\n# [1, 2, 3, 4, 5, 6]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Method 3: Recursive (arbitrary depth)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def flatten(lst):\n    result = []\n    for item in lst:\n        if isinstance(item, list):\n            result.extend(flatten(item))\n        else:\n            result.append(item)\n    return result\n\nnested = [1, [2, [3, [4, [5]]]], 6]\nflatten(nested)   # [1, 2, 3, 4, 5, 6]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Method 4: Using a stack (iterative, avoids recursion limit)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def flatten_iterative(lst):\n    stack = list(reversed(lst))\n    result = []\n    while stack:\n        item = stack.pop()\n        if isinstance(item, list):\n            stack.extend(reversed(item))\n        else:\n            result.append(item)\n    return result",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Method 5: `sum()` (one level only, **slow — O(n²)**)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "flat = sum(nested, [])\n# Works but creates intermediate lists — avoid for large data",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Performance Comparison"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Depth",
      "Time",
      "Space"
     ],
     "rows": [
      [
       "List comprehension",
       "1 level",
       "O(n)",
       "O(n)"
      ],
      [
       "`chain.from_iterable`",
       "1 level",
       "O(n)",
       "O(1) lazy"
      ],
      [
       "Recursive",
       "Any depth",
       "O(n)",
       "O(d) call stack"
      ],
      [
       "Stack-based",
       "Any depth",
       "O(n)",
       "O(n)"
      ],
      [
       "`sum()`",
       "1 level",
       "O(n²)",
       "O(n)"
      ]
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is the performance difference between `list` and `deque`?",
   "body": [
    {
     "t": "table",
     "head": [
      "Operation",
      "`list`",
      "`collections.deque`"
     ],
     "rows": [
      [
       "`append(x)` (right)",
       "**O(1)** amortized",
       "**O(1)**"
      ],
      [
       "`pop()` (right)",
       "**O(1)**",
       "**O(1)**"
      ],
      [
       "`insert(0, x)` / `appendleft(x)`",
       "**O(n)** ❌",
       "**O(1)** ✅"
      ],
      [
       "`pop(0)` / `popleft()`",
       "**O(n)** ❌",
       "**O(1)** ✅"
      ],
      [
       "`a[i]` (random access)",
       "**O(1)** ✅",
       "**O(n)** ❌"
      ],
      [
       "`a[i] = x` (random assign)",
       "**O(1)** ✅",
       "**O(n)** ❌"
      ],
      [
       "Memory layout",
       "Contiguous array",
       "Doubly-linked blocks"
      ]
     ]
    },
    {
     "t": "h4",
     "text": "When to Use Which"
    },
    {
     "t": "table",
     "head": [
      "Use Case",
      "Recommendation"
     ],
     "rows": [
      [
       "Stack (LIFO)",
       "`list` — `append()`/`pop()` are O(1)"
      ],
      [
       "Queue (FIFO)",
       "`deque` — `append()`/`popleft()` are O(1)"
      ],
      [
       "Random access by index",
       "`list` — O(1) indexing"
      ],
      [
       "Frequent insert/delete at both ends",
       "`deque`"
      ],
      [
       "Sliding window",
       "`deque(maxlen=n)`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import deque\n\n# Queue\nq = deque()\nq.append(\"task1\")      # enqueue\nq.append(\"task2\")\nq.popleft()            # dequeue → \"task1\"  O(1)\n\n# vs list (slow queue)\nq = []\nq.append(\"task1\")\nq.pop(0)               # O(n) — shifts all elements",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How does `enumerate()` work and why use it over `range(len())`?",
   "body": [
    {
     "t": "h4",
     "text": "How It Works"
    },
    {
     "t": "p",
     "text": "`enumerate(iterable, start=0)` returns an **iterator of `(index, element)` tuples**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "list(enumerate([\"a\", \"b\", \"c\"]))\n# [(0, 'a'), (1, 'b'), (2, 'c')]\n\nlist(enumerate([\"a\", \"b\", \"c\"], start=1))\n# [(1, 'a'), (2, 'b'), (3, 'c')]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Why Not `range(len())`?"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "fruits = [\"apple\", \"banana\", \"cherry\"]\n\n# ❌ Unpythonic\nfor i in range(len(fruits)):\n    print(i, fruits[i])\n\n# ✅ Pythonic\nfor i, fruit in enumerate(fruits):\n    print(i, fruit)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Reasons to prefer `enumerate()`:** 1. **Readability**: Clearly expresses intent (\"I need both index and value\") 2. **Less error-prone**: No risk of off-by-one in indexing 3. **Works with any iterable**: Not just sequences with `len()` 4. **Slightly faster**: Avoids repeated `__getitem__` lookups 5. **Pythonic**: Follows Python's \"explicit is better than implicit\" philosophy"
    },
    {
     "t": "h4",
     "text": "Under the Hood"
    },
    {
     "t": "p",
     "text": "`enumerate` is roughly equivalent to:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def enumerate(iterable, start=0):\n    n = start\n    for item in iterable:\n        yield n, item\n        n += 1",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the difference between list and tuple? When to use which?",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "`list`",
      "`tuple`"
     ],
     "rows": [
      [
       "**Syntax**",
       "`[1, 2, 3]`",
       "`(1, 2, 3)`"
      ],
      [
       "**Mutable**",
       "✅ Yes",
       "❌ No"
      ],
      [
       "**Hashable**",
       "❌ No",
       "✅ Yes (if all elements are hashable)"
      ],
      [
       "**Memory**",
       "Higher",
       "Lower (~10-20% less)"
      ],
      [
       "**Speed**",
       "Slightly slower creation",
       "Slightly faster creation"
      ],
      [
       "**Dict keys**",
       "❌ No",
       "✅ Yes"
      ],
      [
       "**Set elements**",
       "❌ No",
       "✅ Yes"
      ],
      [
       "**Methods**",
       "11 methods",
       "Only `count()` and `index()`"
      ],
      [
       "**Use case**",
       "Mutable collection",
       "Immutable record / fixed data"
      ]
     ]
    },
    {
     "t": "h4",
     "text": "Memory Comparison"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nsys.getsizeof([1, 2, 3])   # 88 bytes\nsys.getsizeof((1, 2, 3))   # 64 bytes  — 27% less",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "When to Use Which"
    },
    {
     "t": "table",
     "head": [
      "Scenario",
      "Use"
     ],
     "rows": [
      [
       "Collection that changes (add/remove/modify)",
       "`list`"
      ],
      [
       "Fixed data (coordinates, RGB, database row)",
       "`tuple`"
      ],
      [
       "Dictionary keys",
       "`tuple`"
      ],
      [
       "Function returning multiple values",
       "`tuple`"
      ],
      [
       "Ensuring data won't be accidentally modified",
       "`tuple`"
      ],
      [
       "Need sorting, appending, etc.",
       "`list`"
      ],
      [
       "Iteration-only (read-only)",
       "Either; `tuple` is slightly faster"
      ]
     ]
    },
    {
     "t": "h4",
     "text": "Tuple Immutability Nuance"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Tuple itself is immutable\nt = (1, 2, 3)\n# t[0] = 99  # TypeError\n\n# But mutable ELEMENTS inside can change\nt = ([1, 2], [3, 4])\nt[0].append(99)      # Works! t = ([1, 2, 99], [3, 4])\n# The tuple's structure (which objects it points to) didn't change\n# but the inner list's content did",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "How to sort a list of dictionaries by a specific key?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "students = [\n    {\"name\": \"Charlie\", \"age\": 20, \"grade\": \"B\"},\n    {\"name\": \"Alice\", \"age\": 22, \"grade\": \"A\"},\n    {\"name\": \"Bob\", \"age\": 21, \"grade\": \"A\"},\n]\n\n# Method 1: lambda\nsorted(students, key=lambda s: s[\"age\"])\n# [Charlie(20), Bob(21), Alice(22)]\n\n# Method 2: operator.itemgetter (faster, more readable)\nfrom operator import itemgetter\nsorted(students, key=itemgetter(\"age\"))\n\n# Sort by multiple keys\nsorted(students, key=itemgetter(\"grade\", \"name\"))\n# [Alice(A), Bob(A), Charlie(B)]  — grade first, then name\n\n# Descending\nsorted(students, key=itemgetter(\"age\"), reverse=True)\n# [Alice(22), Bob(21), Charlie(20)]\n\n# Mixed ascending/descending (use negative for numeric)\nsorted(students, key=lambda s: (s[\"grade\"], -s[\"age\"]))\n# Within same grade: higher age first",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is `zip()` and how does it work with lists of different lengths?",
   "body": [
    {
     "t": "p",
     "text": "`zip()` combines multiple iterables element-wise into tuples."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "names  = [\"Alice\", \"Bob\", \"Charlie\"]\nages   = [30, 25, 35]\ncities = [\"NYC\", \"LA\", \"Chicago\"]\n\nlist(zip(names, ages, cities))\n# [('Alice', 30, 'NYC'), ('Bob', 25, 'LA'), ('Charlie', 35, 'Chicago')]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Different Lengths"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = [1, 2, 3, 4, 5]\nb = [10, 20, 30]\n\n# Default: truncates to shortest\nlist(zip(a, b))\n# [(1, 10), (2, 20), (3, 30)]  — 4 and 5 are dropped\n\n# zip_longest: pads with fillvalue\nfrom itertools import zip_longest\nlist(zip_longest(a, b, fillvalue=0))\n# [(1, 10), (2, 20), (3, 30), (4, 0), (5, 0)]\n\n# Python 3.10+: strict mode raises ValueError on different lengths\n# list(zip(a, b, strict=True))\n# ValueError: zip() has arguments with different lengths",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Common Patterns"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Unzip\npairs = [(\"a\", 1), (\"b\", 2), (\"c\", 3)]\nletters, numbers = zip(*pairs)\n# letters = ('a', 'b', 'c')\n# numbers = (1, 2, 3)\n\n# Dict from two lists\ndict(zip([\"a\", \"b\", \"c\"], [1, 2, 3]))\n# {'a': 1, 'b': 2, 'c': 3}\n\n# Transpose a matrix\nmatrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\ntransposed = [list(row) for row in zip(*matrix)]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "How to create a 2D list correctly without the `[[0]]*n` trap?",
   "body": [
    {
     "t": "h4",
     "text": "The Trap"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ WRONG\nmatrix = [[0] * 3] * 3\nmatrix[0][0] = 1\nprint(matrix)\n# [[1, 0, 0], [1, 0, 0], [1, 0, 0]]  — all rows changed!\n\n# Why? All 3 rows point to the SAME inner list\nid(matrix[0]) == id(matrix[1]) == id(matrix[2])  # True",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Correct Ways"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ✅ Method 1: List comprehension (recommended)\nmatrix = [[0] * 3 for _ in range(3)]\nmatrix[0][0] = 1\nprint(matrix)  # [[1, 0, 0], [0, 0, 0], [0, 0, 0]]\n\n# ✅ Method 2: Explicit loop\nmatrix = []\nfor _ in range(3):\n    matrix.append([0] * 3)\n\n# ✅ Method 3: Using a function\ndef create_matrix(rows, cols, default=0):\n    return [[default] * cols for _ in range(rows)]\n\nmatrix = create_matrix(3, 4)",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Why `[0] * 3` Inside Is Fine"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "row = [0] * 3  # [0, 0, 0]\nrow[0] = 99    # [99, 0, 0] — only first changed\n\n# Because 0 is immutable. Assigning row[0] = 99 creates a new reference,\n# it doesn't modify the integer 0.",
     "numbered": false
    },
    {
     "t": "p",
     "text": "The problem is only with **mutable** elements where `*` creates **shared references**."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is the walrus operator in list comprehensions?",
   "body": [
    {
     "t": "p",
     "text": "The **walrus operator** (`:=`), introduced in **Python 3.8**, allows **assignment within an expression**."
    },
    {
     "t": "h4",
     "text": "Syntax"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "variable := expression",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Use in List Comprehensions"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import math\n\n# Without walrus — calls sqrt twice or uses an intermediate step\nresults = [math.sqrt(x) for x in range(100) if math.sqrt(x) > 5]\n\n# With walrus — computes sqrt once, reuses the value\nresults = [y for x in range(100) if (y := math.sqrt(x)) > 5]",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "More Examples"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Filter and transform in one pass\ndata = [\"  hello  \", \"\", \"  world  \", \"   \", \"python\"]\ncleaned = [c for s in data if (c := s.strip())]\n# ['hello', 'world', 'python']  — empty strings filtered out\n\n# Process expensive computation once\nimport re\nlines = [\"error: file not found\", \"info: loaded\", \"error: timeout\"]\nerrors = [m.group() for line in lines if (m := re.match(r\"error: (.+)\", line))]\n# ['error: file not found', 'error: timeout']",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "When to Use"
    },
    {
     "t": "ul",
     "items": [
      "✅ When you need to **compute a value**, **test it**, and **use it** in the same comprehension",
      "✅ Avoids redundant computation",
      "❌ Don't overuse — can hurt readability"
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "How to efficiently check if an element exists in a large list?",
   "body": [
    {
     "t": "h4",
     "text": "The Problem"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "large_list = list(range(10_000_000))\n\n# ❌ Slow: O(n) linear scan\nif 9_999_999 in large_list:\n    print(\"Found\")\n# Takes ~0.1 seconds",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Solutions"
    }
   ]
  }
 ],
 "takeaways": []
});

/* ============================================================================
   INTERVIEW: OBJECTS & INTERNALS i3.4 — Predict the Output — Scenario Questions
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i3.4",
 "lede": "**49 interview questions on predict the output — scenario questions**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 49 questions on predict the output — scenario questions without prompting",
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
   "q": "Small-int cache + getrefcount",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\na = 42\nb = 42\nprint(a is b)\nprint(sys.getrefcount(42) > 2)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `True`, `True` **Explanation:** Python caches small integers (−5 to 256), so `a is b`. `sys.getrefcount(42)` is large because the cached `42` is referenced all over the interpreter (plus the call's temp ref)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Counting references with aliases",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\na = []\nb = a\nc = a\nprint(sys.getrefcount(a) - 1)  # subtract getrefcount's own ref\ndel b\nprint(sys.getrefcount(a) - 1)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `3`, `2` **Explanation:** `a`, `b`, `c` all reference the same list. After `del b`, two references remain (`a`, `c`)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "String interning of concatenations and joins",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "a = \"hello\"\nb = \"hello\"\nc = \"he\" + \"llo\"\nd = \"\".join([\"h\", \"e\", \"l\", \"l\", \"o\"])\nprint(a is b)\nprint(a is c)\nprint(a is d)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `True`, `True`, varies (often `False`; may be `True`) **Explanation:** Short literals and compile-time constant folds (`\"he\" + \"llo\"`) are interned. A runtime `join` result is usually a fresh, non-interned object."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Object sizes of empty containers",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nsizes = {\n    'int': sys.getsizeof(0),\n    'float': sys.getsizeof(0.0),\n    'str_empty': sys.getsizeof(''),\n    'str_a': sys.getsizeof('a'),\n    'list_empty': sys.getsizeof([]),\n    'dict_empty': sys.getsizeof({}),\n    'tuple_empty': sys.getsizeof(()),\n    'set_empty': sys.getsizeof(set()),\n}\nfor name, size in sizes.items():\n    print(f\"{name}: {size} bytes\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** (typical 64-bit) `int: 28`, `float: 24`, `str_empty: 49`, `str_a: 50`, `list_empty: 56`, `dict_empty: 64`, `tuple_empty: 40`, `set_empty: 216` **Explanation:** Every Python object carries header overhead. Tuples are leaner than lists; an empty set is surprisingly large because of its hash-table backing."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "`__slots__` vs regular instance — `__dict__`",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nclass SlottedPoint:\n    __slots__ = ['x', 'y']\n    def __init__(self, x, y):\n        self.x = x; self.y = y\n\nclass RegularPoint:\n    def __init__(self, x, y):\n        self.x = x; self.y = y\n\ns = SlottedPoint(1, 2)\nr = RegularPoint(1, 2)\nprint(hasattr(s, '__dict__'))\nprint(hasattr(r, '__dict__'))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `False`, `True` **Explanation:** `__slots__` removes the per-instance `__dict__`, saving memory. The real saving shows once you account for the missing `__dict__` (the bare `getsizeof` of the instance can look similar)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Adding an undeclared attribute to a slotted instance",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class SlottedPoint:\n    __slots__ = ['x', 'y']\n    def __init__(self, x, y):\n        self.x = x; self.y = y\n\ntry:\n    s = SlottedPoint(1, 2)\n    s.z = 3\nexcept AttributeError as e:\n    print(f\"Error: {e}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Error: 'SlottedPoint' object has no attribute 'z'` **Explanation:** `__slots__` restricts instances to the declared attribute names only."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Collecting a circular reference",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import gc\nclass Node:\n    def __init__(self, name):\n        self.name = name; self.ref = None\n\ngc.collect()\na = Node(\"A\"); b = Node(\"B\")\na.ref = b; b.ref = a   # cycle\ndel a; del b\ncollected = gc.collect()\nprint(f\"Collected: {collected}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Collected:` (some number ≥ 2) **Explanation:** Reference counting alone can't free the cycle; the generational GC detects and reclaims it."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Weakref before and after deletion",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import weakref\nclass Cache: pass\nobj = Cache()\nweak = weakref.ref(obj)\nprint(weak() is obj)\ndel obj\nprint(weak())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `True`, `None` **Explanation:** A weak reference doesn't keep the object alive; after `del`, calling the weakref returns `None`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "WeakValueDictionary auto-eviction",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import weakref\nclass Resource:\n    def __init__(self, name): self.name = name\n\ncache = weakref.WeakValueDictionary()\nr1 = Resource(\"DB\")\ncache[\"db\"] = r1\nprint(cache[\"db\"].name)\ndel r1\ntry:\n    print(cache[\"db\"])\nexcept KeyError:\n    print(\"Key removed (object collected)\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `DB`, `Key removed (object collected)` **Explanation:** Entries vanish once their value is garbage collected (no strong refs remain)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Generator vs list memory",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nlist_comp = [x * x for x in range(1000)]\ngen_exp = (x * x for x in range(1000))\nprint(f\"List: {sys.getsizeof(list_comp)} bytes\")\nprint(f\"Generator: {sys.getsizeof(gen_exp)} bytes\")\nprint(f\"Ratio: {sys.getsizeof(list_comp) / sys.getsizeof(gen_exp):.1f}x\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `List: ~8856 bytes`, `Generator: ~200 bytes`, `Ratio: ~44.3x` **Explanation:** Generators hold only current state (O(1)); the list materializes all elements (O(n))."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "String `+=` vs `join` timing",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from timeit import timeit\ndef concat_plus(n):\n    s = \"\"\n    for i in range(n): s += str(i)\n    return s\ndef concat_join(n):\n    return \"\".join(str(i) for i in range(n))\nt1 = timeit(lambda: concat_plus(1000), number=100)\nt2 = timeit(lambda: concat_join(1000), number=100)\nprint(f\"Join is faster: {t2 < t1}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** Times vary, but `Join is faster: True` **Explanation:** `join` is O(n) total; `+=` can be O(n²) because strings are immutable and copied each iteration."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "`lru_cache` hit/miss stats for fib(50)",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import lru_cache\n@lru_cache(maxsize=128)\ndef fib(n):\n    if n < 2: return n\n    return fib(n-1) + fib(n-2)\nfib(50)\ninfo = fib.cache_info()\nprint(f\"Hits: {info.hits}\")\nprint(f\"Misses: {info.misses}\")\nprint(f\"Size: {info.currsize}\")\nprint(f\"Result: {fib(50)}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Hits: 48`, `Misses: 51`, `Size: 51`, `Result: 12586269025` **Explanation:** 51 unique `n` values are computed (misses); the recursive overlaps hit the cache 48 times."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "`array.array` vs list memory",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys, array\nint_list = [1, 2, 3, 4, 5]\nint_array = array.array('i', [1, 2, 3, 4, 5])\nprint(f\"List: {sys.getsizeof(int_list)} bytes\")\nprint(f\"Array: {sys.getsizeof(int_array)} bytes\")\nint_array.append(6)\nprint(list(int_array))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `List: ~120 bytes`, `Array: ~84 bytes`, `[1, 2, 3, 4, 5, 6]` **Explanation:** `array.array` stores raw typed values with no per-element object overhead, unlike a list of int objects."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Membership testing: list vs set vs dict",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from timeit import timeit\ndata_list = list(range(10000))\ndata_set = set(data_list)\ndata_dict = {x: None for x in data_list}\nt_list = timeit(lambda: 9999 in data_list, number=10000)\nt_set = timeit(lambda: 9999 in data_set, number=10000)\nprint(f\"Set is faster than list: {t_set < t_list}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** Times vary, but `Set is faster than list: True` **Explanation:** Set/dict membership is O(1) hashing; list membership is O(n) linear scan."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "LazyProperty descriptor — compute once",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class LazyProperty:\n    def __init__(self, func):\n        self.func = func; self.name = func.__name__\n    def __get__(self, obj, objtype=None):\n        if obj is None: return self\n        value = self.func(obj)\n        setattr(obj, self.name, value)\n        return value\n\nclass DataProcessor:\n    def __init__(self, data): self.data = data\n    @LazyProperty\n    def processed(self):\n        print(\"Computing...\")\n        return [x ** 2 for x in self.data]\n\ndp = DataProcessor([1, 2, 3])\nprint(\"Before access\")\nprint(dp.processed)\nprint(dp.processed)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Before access\nComputing...\n[1, 4, 9]\n[1, 4, 9]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Explanation:** The descriptor computes once, then `setattr` shadows it with the cached value, so the second access skips computation."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "namedtuple vs dict vs tuple memory",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import namedtuple\nimport sys\nPoint_dict = {'x': 1, 'y': 2, 'z': 3}\nPoint_tuple = (1, 2, 3)\nPointNT = namedtuple('PointNT', 'x y z')\npoint_nt = PointNT(1, 2, 3)\nprint(f\"Dict: {sys.getsizeof(Point_dict)} bytes\")\nprint(f\"Tuple: {sys.getsizeof(Point_tuple)} bytes\")\nprint(f\"NamedTuple: {sys.getsizeof(point_nt)} bytes\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Dict: ~232 bytes`, `Tuple: 64 bytes`, `NamedTuple: 64 bytes` **Explanation:** A namedtuple is as small as a plain tuple — far smaller than a dict — while still giving named fields."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Chunked processing equivalence",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def chunked_processing(data, chunk_size=100):\n    for i in range(0, len(data), chunk_size):\n        chunk = data[i:i+chunk_size]\n        yield sum(chunk)\n\ndata = list(range(1000))\ntotal = sum(chunked_processing(data, 250))\nprint(total)\nprint(total == sum(data))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `499500`, `True` **Explanation:** Chunked processing bounds peak memory while producing the same aggregate."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Infinite generator + islice",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from itertools import islice\nimport sys\ndef fibonacci():\n    a, b = 0, 1\n    while True:\n        yield a\n        a, b = b, a + b\nfirst_10 = list(islice(fibonacci(), 10))\nprint(first_10)\ngen = fibonacci()\nprint(f\"Generator size: {sys.getsizeof(gen)} bytes\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]`, `Generator size: ~200 bytes` **Explanation:** The generator keeps only its current state — constant memory regardless of sequence length."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Dict comprehension vs dict(zip(...))",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from timeit import timeit\nkeys = list(range(100))\nt1 = timeit(lambda: {k: k*k for k in keys}, number=10000)\nt2 = timeit(lambda: dict(zip(keys, [k*k for k in keys])), number=10000)\nprint(f\"Dict comp: {t1:.4f}s\")\nprint(f\"Dict zip: {t2:.4f}s\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** Times vary; the dict comprehension is typically faster. **Explanation:** The comprehension avoids building an intermediate list and a zip iterator."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Generator pipeline filtering",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def process_lines(lines):\n    for line in lines:\n        yield line.strip().upper()\ndef filter_lines(lines, keyword):\n    for line in lines:\n        if keyword in line:\n            yield line\ndata = [\"  Hello World  \", \"  Python Rocks  \", \"  Hello Python  \", \"  Java World  \"]\npipeline = filter_lines(process_lines(iter(data)), \"PYTHON\")\nprint(list(pipeline))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `['PYTHON ROCKS', 'HELLO PYTHON']` **Explanation:** Items stream through both stages with no intermediate lists; `process_lines` upper-cases before `filter_lines` matches `\"PYTHON\"`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "`@dataclass(slots=True)` vs plain dataclass",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from dataclasses import dataclass\n@dataclass(slots=True)   # Python 3.10+\nclass OptimizedPoint:\n    x: float; y: float; z: float\n@dataclass\nclass RegularPoint:\n    x: float; y: float; z: float\no = OptimizedPoint(1.0, 2.0, 3.0)\nr = RegularPoint(1.0, 2.0, 3.0)\nprint(f\"Optimized has __dict__: {hasattr(o, '__dict__')}\")\nprint(f\"Regular has __dict__: {hasattr(r, '__dict__')}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Optimized has __dict__: False`, `Regular has __dict__: True` **Explanation:** `slots=True` generates `__slots__`, removing the per-instance `__dict__`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "Tuple vs list memory for same data",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\ndata = list(range(100))\nas_list = list(data)\nas_tuple = tuple(data)\nprint(sys.getsizeof(as_list) > sys.getsizeof(as_tuple))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `True` **Explanation:** A list over-allocates spare capacity for growth; a tuple allocates exactly what it needs."
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "`__slots__` inheritance across three levels",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class Base:\n    __slots__ = ['x']\nclass Child(Base):\n    __slots__ = ['y']\nclass GrandChild(Child):\n    __slots__ = ['z']\ng = GrandChild()\ng.x = 1; g.y = 2; g.z = 3\nprint(g.x, g.y, g.z)\ntry:\n    g.w = 4\nexcept AttributeError:\n    print(\"Cannot add 'w' — slots enforced\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `1 2 3`, `Cannot add 'w' — slots enforced` **Explanation:** Slots combine across the inheritance chain (`x`, `y`, `z`); each class declares only its new names, and no `__dict__` appears."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "LRU eviction ordering",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import lru_cache\n@lru_cache(maxsize=4)\ndef square(n):\n    print(f\"Computing {n}²\")\n    return n * n\nfor i in range(4):\n    square(i)\nprint(\"---\")\nsquare(0)   # cache hit\nsquare(4)   # miss, evicts LRU\nprint(\"---\")\nsquare(1)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Computing 0²\nComputing 1²\nComputing 2²\nComputing 3²\n---\n---\nComputing 1²",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Explanation:** With `maxsize=4`, accessing `square(0)` makes it most-recently-used; adding `square(4)` evicts the LRU entry (`1`), so `square(1)` must recompute."
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "`sys.intern` for long strings",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\na = sys.intern(\"hello world test\")\nb = sys.intern(\"hello world test\")\nprint(a is b)\nc = \"hello world test\"\nd = \"hello world test\"\nprint(c is d)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `True`, `True` (literal strings in the same code object are often auto-interned) **Explanation:** `sys.intern` guarantees deduplication; identical literals compiled together frequently share one object too."
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "Sparse matrix storage",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class MemoryEfficientMatrix:\n    def __init__(self, rows, cols, default=0):\n        self.rows, self.cols, self.default, self.data = rows, cols, default, {}\n    def __setitem__(self, key, value):\n        r, c = key\n        if value != self.default: self.data[(r, c)] = value\n        elif (r, c) in self.data: del self.data[(r, c)]\n    def __getitem__(self, key): return self.data.get(key, self.default)\n    def density(self): return len(self.data) / (self.rows * self.cols)\n\nm = MemoryEfficientMatrix(1000, 1000)\nm[0, 0] = 1; m[500, 500] = 2; m[999, 999] = 3\nprint(f\"Non-zero: {len(m.data)}\")\nprint(f\"Density: {m.density():.6f}\")\nprint(m[0, 0]); print(m[1, 1])",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Non-zero: 3`, `Density: 0.000003`, `1`, `0` **Explanation:** Only non-default cells are stored — massive savings for sparse data."
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "tracemalloc on a comprehension",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import tracemalloc\ntracemalloc.start()\nx = [i ** 2 for i in range(10000)]\nsnapshot = tracemalloc.take_snapshot()\ntop = snapshot.statistics('lineno')\nprint(f\"Number of blocks: {top[0].count}\")\ntracemalloc.stop()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** (varies) e.g. `Number of blocks: 1` for the list line, with a KB-scale size. **Explanation:** `tracemalloc` attributes allocations to source lines, exposing size and block count."
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "Flyweight shared instances",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class Flyweight:\n    _instances = {}\n    def __new__(cls, color):\n        if color not in cls._instances:\n            instance = super().__new__(cls)\n            instance.color = color\n            cls._instances[color] = instance\n        return cls._instances[color]\na = Flyweight(\"red\"); b = Flyweight(\"red\"); c = Flyweight(\"blue\")\nprint(a is b); print(a is c); print(len(Flyweight._instances))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `True`, `False`, `2` **Explanation:** The flyweight pattern returns one shared instance per value, cutting memory for many identical objects."
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "deque vs list for FIFO",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import deque\nfrom timeit import timeit\ndef list_ops():\n    lst = []\n    for i in range(10000): lst.append(i)\n    for _ in range(10000): lst.pop(0)\ndef deque_ops():\n    dq = deque()\n    for i in range(10000): dq.append(i)\n    for _ in range(10000): dq.popleft()\nt_list = timeit(list_ops, number=10)\nt_deque = timeit(deque_ops, number=10)\nprint(f\"Deque faster: {t_deque < t_list}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** Times vary, `Deque faster: True` **Explanation:** `list.pop(0)` is O(n) (shifts all elements); `deque.popleft()` is O(1)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "Generator vs list sum result",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from timeit import timeit\ndef with_list(): return sum([x * x for x in range(10000)])\ndef with_gen(): return sum(x * x for x in range(10000))\nprint(f\"Same result: {with_list() == with_gen()}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Same result: True` **Explanation:** For one-pass consumers like `sum()`, the generator avoids building the intermediate list but yields the same total."
    }
   ]
  },
  {
   "t": "drill",
   "n": "31",
   "q": "Dict overhead by key type",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nd1 = {i: i for i in range(100)}\nd2 = {str(i): i for i in range(100)}\nd3 = {(i, i): i for i in range(100)}\nprint(sys.getsizeof(d1), sys.getsizeof(d2), sys.getsizeof(d3))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** The dict structures are similar in size; total memory differs because str/tuple key objects are larger. **Explanation:** `getsizeof` on the dict counts the hash table, not the key/value objects it references."
    }
   ]
  },
  {
   "t": "drill",
   "n": "32",
   "q": "Descriptor cache keyed by id",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class CachedProperty:\n    def __init__(self, func): self.func, self.cache = func, {}\n    def __get__(self, obj, objtype=None):\n        if obj is None: return self\n        oid = id(obj)\n        if oid not in self.cache:\n            self.cache[oid] = self.func(obj)\n        return self.cache[oid]\n\nclass Data:\n    def __init__(self, values): self.values = values\n    @CachedProperty\n    def stats(self):\n        print(\"Computing stats...\")\n        return {'sum': sum(self.values), 'len': len(self.values)}\n\nd = Data([1, 2, 3, 4, 5])\nprint(d.stats); print(d.stats)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Computing stats...`, `{'sum': 15, 'len': 5}`, `{'sum': 15, 'len': 5}` **Explanation:** The descriptor computes once per instance id and returns the cached dict thereafter. (Note: keying on `id()` can collide if objects are freed and ids reused — prefer `functools.cached_property`.)"
    }
   ]
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Three ways to build a string",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import io\nfrom timeit import timeit\ndef build_plus(n):\n    s = \"\"\n    for i in range(n): s = s + str(i) + \",\"\n    return s\ndef build_list(n):\n    parts = [str(i) for i in range(n)]\n    return \",\".join(parts)\ndef build_io(n):\n    buf = io.StringIO()\n    for i in range(n):\n        buf.write(str(i)); buf.write(\",\")\n    return buf.getvalue()\nn = 1000\nprint(build_plus(n) == build_io(n))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `True` (all three produce the same string); list-join and StringIO are faster than `+`. **Explanation:** `+` rebuilds the string each iteration (O(n²)); `join` and `StringIO` are O(n)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "34",
   "q": "range vs list memory and membership",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nr = range(1000000)\nl = list(range(1000000))\nprint(f\"Range: {sys.getsizeof(r)} bytes\")\nprint(f\"List: {sys.getsizeof(l)} bytes\")\nprint(500000 in r)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Range: 48 bytes`, `List: ~8000056 bytes`, `True` **Explanation:** `range` is O(1) memory (stores start/stop/step) and tests membership in O(1) by arithmetic, not scanning."
    }
   ]
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Storage class with __slots__ holding a dict",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nclass DictStorage:\n    def __init__(self): self.data = {}\nclass SlotStorage:\n    __slots__ = ['_items']\n    def __init__(self): self._items = {}\nds = DictStorage(); ss = SlotStorage()\nprint(hasattr(ds, '__dict__'))\nprint(hasattr(ss, '__dict__'))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `True`, `False` **Explanation:** `__slots__` removes the instance `__dict__` even when the attribute it holds is itself a dict."
    }
   ]
  },
  {
   "t": "drill",
   "n": "36",
   "q": "Counter vs manual vs defaultdict",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter, defaultdict\nfrom timeit import timeit\ndata = list(range(100)) * 100\ndef count_manual():\n    c = {}\n    for x in data: c[x] = c.get(x, 0) + 1\n    return c\ndef count_counter(): return Counter(data)\ndef count_dd():\n    c = defaultdict(int)\n    for x in data: c[x] += 1\n    return dict(c)\nprint(count_counter() == count_manual() == count_dd())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `True` (same counts); `Counter` is typically fastest. **Explanation:** `Counter` is C-implemented for CPython, beating pure-Python counting loops."
    }
   ]
  },
  {
   "t": "drill",
   "n": "37",
   "q": "Int memory by magnitude",
   "terms": [
    "30, 2",
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nsmall = [sys.getsizeof(i) for i in [0, 1, 255, 256]]\nlarge = [sys.getsizeof(i) for i in [257, 10000, 2**30, 2**60]]\nprint(f\"Small ints: {small}\")\nprint(f\"Large ints: {large}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Small ints: [28, 28, 28, 28]`, `Large ints: [28, 28, 32, 32]` (varies) **Explanation:** Python ints are arbitrary precision; size grows in 4-byte digits as magnitude increases."
    }
   ]
  },
  {
   "t": "drill",
   "n": "38",
   "q": "Set intersection equals multiples of 6",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "s1 = set(range(0, 10000, 2))   # evens\ns2 = set(range(0, 10000, 3))   # multiples of 3\ns3 = set(range(0, 10000, 6))   # multiples of 6\nprint(f\"|s1| = {len(s1)}\")\nprint(f\"|s2| = {len(s2)}\")\nprint(f\"|s1 & s2| = {len(s1 & s2)}\")\nprint(f\"|s1 & s2| == |s3|: {s1 & s2 == s3}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `|s1| = 5000`, `|s2| = 3334`, `|s1 & s2| = 1667`, `|s1 & s2| == |s3|: True` **Explanation:** Numbers divisible by both 2 and 3 are exactly the multiples of 6. Set ops run in O(min(n, m))."
    }
   ]
  },
  {
   "t": "drill",
   "n": "39",
   "q": "Memoize decorator hit rate",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class Memoize:\n    def __init__(self, func):\n        self.func, self.cache, self.hits, self.misses = func, {}, 0, 0\n    def __call__(self, *args):\n        if args in self.cache:\n            self.hits += 1\n            return self.cache[args]\n        self.misses += 1\n        self.cache[args] = r = self.func(*args)\n        return r\n    def stats(self):\n        total = self.hits + self.misses\n        return f\"Hit rate: {self.hits/total*100:.1f}%\" if total else \"No calls\"\n\n@Memoize\ndef expensive(n): return sum(range(n))\nfor _ in range(5):\n    expensive(100); expensive(200); expensive(100)\nprint(expensive.stats())\nprint(f\"Cache size: {len(expensive.cache)}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Hit rate: 86.7%`, `Cache size: 2` **Explanation:** 15 calls, 2 unique args → 2 misses, 13 hits → 13/15 = 86.7%."
    }
   ]
  },
  {
   "t": "drill",
   "n": "40",
   "q": "for-loop vs map vs comprehension",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from timeit import timeit\ndata = list(range(10000))\ndef with_loop():\n    out = []\n    for x in data: out.append(x * 2)\n    return out\ndef with_map(): return list(map(lambda x: x * 2, data))\ndef with_comp(): return [x * 2 for x in data]\nprint(with_loop() == with_map() == with_comp())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `True`; the comprehension is usually fastest, then map, then the manual loop. **Explanation:** Comprehensions are optimized at the bytecode level; `map(lambda ...)` pays per-call overhead."
    }
   ]
  },
  {
   "t": "drill",
   "n": "41",
   "q": "Generator file parsing with comment skip",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def process(lines):\n    for line in lines:\n        if line.startswith('#'): continue\n        yield tuple(line.strip().split(','))\nlines = [\"# comment\", \"Alice,30,NYC\", \"Bob,25,LA\", \"# another\", \"Charlie,35,SF\"]\nrecords = list(process(iter(lines)))\nprint(records)\nprint(f\"Records: {len(records)}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `[('Alice', '30', 'NYC'), ('Bob', '25', 'LA'), ('Charlie', '35', 'SF')]`, `Records: 3` **Explanation:** The generator processes one line at a time — constant memory regardless of file size."
    }
   ]
  },
  {
   "t": "drill",
   "n": "42",
   "q": "Three dict-merge idioms",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "d1 = {'a': 1, 'b': 2}; d2 = {'b': 3, 'c': 4}; d3 = {'c': 5, 'd': 6}\nmerged1 = {**d1, **d2, **d3}\nmerged2 = d1 | d2 | d3\nfrom collections import ChainMap\nmerged3 = dict(ChainMap(d3, d2, d1))\nprint(merged1)\nprint(merged1 == merged2)\nprint(merged1 == merged3)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `{'a': 1, 'b': 3, 'c': 5, 'd': 6}`, `True`, `True` **Explanation:** Later dicts win in unpacking and `|`; `ChainMap` reverses the argument order to match."
    }
   ]
  },
  {
   "t": "drill",
   "n": "43",
   "q": "itemgetter vs lambda key",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from operator import itemgetter\nfrom timeit import timeit\ndata = [(3, 'c'), (1, 'a'), (2, 'b')] * 1000\nt1 = timeit(lambda: sorted(data, key=lambda x: x[0]), number=1000)\nt2 = timeit(lambda: sorted(data, key=itemgetter(0)), number=1000)\nprint(f\"Itemgetter faster: {t2 < t1}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Itemgetter faster: True` **Explanation:** `itemgetter` is C-implemented and avoids the per-comparison Python call a lambda incurs."
    }
   ]
  },
  {
   "t": "drill",
   "n": "44",
   "q": "Acyclic garbage needs no GC",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import gc\nclass LeakyCache:\n    def __init__(self): self.cache = {}\n    def add(self, key, value): self.cache[key] = value\ndef simulate():\n    caches = []\n    for i in range(100):\n        c = LeakyCache(); c.add(f\"key_{i}\", \"x\" * 1000)\n        caches.append(c)\n    return len(caches)\ncount = simulate()\ngc.collect()\nprint(f\"Created: {count}\")\nprint(f\"After GC collected: {gc.collect()}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Created: 100`, `After GC collected: 0` **Explanation:** No cycles exist, so refcounting frees everything when `caches` goes out of scope; the GC finds nothing."
    }
   ]
  },
  {
   "t": "drill",
   "n": "45",
   "q": "chain.from_iterable vs extend loop",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from itertools import chain\ndef flatten_bad(lists):\n    out = []\n    for lst in lists: out.extend(lst)\n    return out\ndef flatten_good(lists):\n    return list(chain.from_iterable(lists))\ndata = [[i] * 100 for i in range(100)]\nprint(flatten_bad(data) == flatten_good(data))\nprint(f\"Length: {len(flatten_good(data))}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `True`, `Length: 10000` **Explanation:** `chain.from_iterable` flattens lazily — more memory-efficient for large inputs while producing the same result."
    }
   ]
  },
  {
   "t": "drill",
   "n": "46",
   "q": "Local vs global access speed",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from timeit import timeit\nx = 42\ndef access_global():\n    total = 0\n    for _ in range(10000): total += x\n    return total\ndef access_local():\n    local_x = 42\n    total = 0\n    for _ in range(10000): total += local_x\n    return total\nt1 = timeit(access_global, number=1000)\nt2 = timeit(access_local, number=1000)\nprint(f\"Local faster: {t2 < t1}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** Times vary, `Local faster: True` **Explanation:** Locals use `LOAD_FAST` (array index); globals use `LOAD_GLOBAL` (dict lookup)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "47",
   "q": "EfficientRecord with __slots__",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class EfficientRecord:\n    __slots__ = ['id', 'name', 'value']\n    def __init__(self, id, name, value):\n        self.id, self.name, self.value = id, name, value\n    def __repr__(self):\n        return f\"Record({self.id}, {self.name}, {self.value})\"\nrecords = [EfficientRecord(i, f\"item_{i}\", i*10) for i in range(5)]\nprint(records[0]); print(records[-1])\ntry:\n    records[0].extra = \"test\"\nexcept AttributeError:\n    print(\"Cannot add extra attributes\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Record(0, item_0, 0)`, `Record(4, item_4, 40)`, `Cannot add extra attributes` **Explanation:** `__slots__` fixes the attribute set, lowering memory and blocking arbitrary attributes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "48",
   "q": "any/loop/in for membership",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from timeit import timeit\ndef check_loop(data, target):\n    for item in data:\n        if item == target: return True\n    return False\ndef check_any(data, target):\n    return any(item == target for item in data)\ndef check_in(data, target):\n    return target in data\ndata = list(range(10000))\nprint(check_loop(data, 5000), check_any(data, 5000), check_in(data, 5000))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `True True True`; `in` is typically fastest. **Explanation:** `in` on a list is C-optimized; `any()` carries generator overhead; the explicit loop is pure Python."
    }
   ]
  },
  {
   "t": "drill",
   "n": "49",
   "q": "Batch counting with a final partial batch",
   "terms": [
    "Answer",
    "Explanation"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def batch_insert(items, batch_size=100):\n    batches = 0\n    for i in range(0, len(items), batch_size):\n        batches += 1\n    return batches\nitems = list(range(1050))\nprint(f\"Items: {len(items)}\")\nprint(f\"Batches: {batch_insert(items, 100)}\")\nprint(f\"Last batch size: {len(items) % 100 or 100}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Answer:** `Items: 1050`, `Batches: 11`, `Last batch size: 50` **Explanation:** 1050 items in 100-sized batches → 10 full batches plus a final batch of 50 → 11 total."
    }
   ]
  }
 ],
 "takeaways": []
});

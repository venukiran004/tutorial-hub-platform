/* ============================================================================
   INTERVIEW: LANGUAGE DEPTH i2.7 — Collections Module
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.7",
 "lede": "**35 interview questions on collections module**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 35 questions on collections module without prompting",
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
   "q": "What is the `collections` module and why use it over built-in types?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`collections` provides **specialized container datatypes** that extend the built-in `dict`, `list`, `tuple`, and `set`. They make common patterns faster and cleaner."
    },
    {
     "t": "table",
     "head": [
      "Built-in pain point",
      "`collections` solution"
     ],
     "rows": [
      [
       "Manual frequency counting",
       "`Counter`"
      ],
      [
       "`KeyError` on missing keys",
       "`defaultdict`"
      ],
      [
       "O(n) inserts/pops at the front of a list",
       "`deque`"
      ],
      [
       "Index-only tuple access",
       "`namedtuple`"
      ],
      [
       "Searching across several dicts",
       "`ChainMap`"
      ],
      [
       "Order-sensitive dict + reordering methods",
       "`OrderedDict`"
      ],
      [
       "Safely subclassing a container",
       "`UserDict` / `UserList` / `UserString`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter, defaultdict, deque, namedtuple, ChainMap, OrderedDict",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Reach for `collections` whenever you find yourself writing boilerplate around dicts/lists — counting, grouping, queueing, or layering config."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is `Counter` and what are its most useful methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`Counter` is a `dict` subclass for counting hashable objects. Keys are elements, values are counts."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\n\nc = Counter(\"abracadabra\")\n# Counter({'a': 5, 'b': 2, 'r': 2, 'c': 1, 'd': 1})\n\nc.most_common(2)        # [('a', 5), ('b', 2)]\nc['a']                  # 5\nc['z']                  # 0  — missing keys return 0, NO KeyError\nlist(c.elements())[:3]  # ['a', 'a', 'a']  — repeats each key by its count\nc.total()               # 17 (Python 3.10+) — sum of all counts",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `most_common(n)` for top-k, `elements()` to expand back to items, `total()` (3.10+) for the grand total, and missing keys give `0` instead of raising."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Explain Counter arithmetic: `+`, `-`, `&`, `|`.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\n\nc1 = Counter('aabbccc')   # {'c': 3, 'a': 2, 'b': 2}\nc2 = Counter('abccdd')    # {'c': 2, 'd': 2, 'a': 1, 'b': 1}\n\nprint(c1 + c2)   # Counter({'c': 5, 'a': 3, 'b': 3, 'd': 2})  — add counts\nprint(c1 - c2)   # Counter({'a': 1, 'b': 1})                  — subtract, drop <= 0\nprint(c1 & c2)   # Counter({'c': 2, 'a': 1, 'b': 1})          — min of each\nprint(c1 | c2)   # Counter({'c': 3, 'a': 2, 'b': 2, 'd': 2})  — max of each",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Operator",
      "Meaning",
      "Negative/zero results"
     ],
     "rows": [
      [
       "`+`",
       "add counts",
       "dropped"
      ],
      [
       "`-`",
       "subtract counts",
       "dropped (≤ 0 removed)"
      ],
      [
       "`&`",
       "intersection (min)",
       "dropped"
      ],
      [
       "`\\|`",
       "union (max)",
       "dropped"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Binary operators automatically **discard non-positive** counts. To keep negatives, use `update()` / `subtract()` instead."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is the difference between `Counter.update()`/`subtract()` and the `+`/`-` operators?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "The operators create a **new** Counter and drop non-positive values. The methods mutate **in place** and `subtract()` allows negatives."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\n\nc = Counter({'a': 5, 'b': 3, 'c': 1})\nc.update({'a': 1, 'd': 4})     # ADDS counts (does not replace)\n# Counter({'a': 6, 'd': 4, 'b': 3, 'c': 1})\n\nc.subtract({'a': 2, 'b': 5})   # SUBTRACTS, keeps negatives\n# Counter({'a': 4, 'd': 4, 'c': 1, 'b': -2})",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `update()` adds (it does **not** overwrite like `dict.update`); `subtract()` keeps negative counts. Use them when you need mutation or want to preserve negatives."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Explain unary `+`, unary `-`, and `elements()` on a Counter.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\n\nc = Counter(a=4, b=2, c=0, d=-2)\n\nprint(+c)                  # Counter({'a': 4, 'b': 2})  — keep positive only\nprint(-c)                  # Counter({'d': 2})          — keep negative, negate\nprint(list(c.elements()))  # ['a', 'a', 'a', 'a', 'b', 'b']  — positive only",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Unary `+` strips zero/negative counts (a quick way to \"clean\" a Counter); `elements()` reconstructs the multiset, skipping non-positive counts."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How do you solve top-k frequent / anagram / \"can construct\" problems with Counter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\n\n# Top-k frequent elements\ndef top_k(nums, k):\n    return [v for v, _ in Counter(nums).most_common(k)]\ntop_k([1, 1, 1, 2, 2, 3], 2)        # [1, 2]\n\n# Anagram check — same character multiset\nCounter(\"listen\") == Counter(\"silent\")   # True\n\n# Can ransom_note be built from magazine?\ndef can_construct(note, mag):\n    return not (Counter(note) - Counter(mag))\ncan_construct(\"aa\", \"aab\")          # True\ncan_construct(\"aa\", \"ab\")           # False",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Counter equality is an O(n) anagram test; `Counter(a) - Counter(b)` being empty means `a` is a sub-multiset of `b`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is `defaultdict` and how does it avoid `KeyError`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`defaultdict` is a `dict` subclass that calls a **factory function** (no-args callable) to produce a default value for any missing key — at the moment it is accessed."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import defaultdict\n\ngroups = defaultdict(list)\nfor w in [\"apple\", \"avocado\", \"banana\"]:\n    groups[w[0]].append(w)       # no need to check/init the key\n# {'a': ['apple', 'avocado'], 'b': ['banana']}\n\ncounts = defaultdict(int)\nfor ch in \"hello\":\n    counts[ch] += 1              # int() -> 0 for new keys",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The factory is `list`, `int`, `set`, or any zero-arg callable. The default is inserted **on access**, so merely reading a missing key creates it."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "`defaultdict` vs `dict.setdefault()` — when use which?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# setdefault — default supplied at EVERY call site, always evaluated\nd = {}\nd.setdefault('k', []).append(1)\nd.setdefault('k', []).append(2)   # the [] is created then discarded each call\n\n# defaultdict — factory defined ONCE at construction\ndd = defaultdict(list)\ndd['k'].append(1)\ndd['k'].append(2)",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "",
      "`setdefault`",
      "`defaultdict`"
     ],
     "rows": [
      [
       "Default specified",
       "every call",
       "once, at creation"
      ],
      [
       "Works on plain dict",
       "yes",
       "needs `defaultdict`"
      ],
      [
       "Side effect on read",
       "no (read of missing key still raises)",
       "**yes** — reading inserts the default"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `defaultdict` for uniform defaults across a whole dict; use `setdefault` for a one-off default on an otherwise normal dict. Beware: reading a missing key on a `defaultdict` **creates** it."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is auto-vivification with `defaultdict`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A `defaultdict` whose factory returns another `defaultdict` builds arbitrarily deep nested structures on the fly."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import defaultdict\n\ndef tree():\n    return defaultdict(tree)\n\nt = tree()\nt['a']['b']['c'] = 'leaf'\nprint(t['a']['b']['c'])   # leaf\nprint('d' in t['a'])      # False — membership test does NOT create",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Recursive `defaultdict` (\"tree\") is great for nested config/JSON-like trees, but note that simply *indexing* deep paths materializes intermediate dicts."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What does the `default_factory` attribute control, and what if it's `None`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import defaultdict\n\ndd = defaultdict(int)\nprint(dd.default_factory)   # <class 'int'>\n\ndd.default_factory = list    # can be changed at runtime\ndd['x']                      # []\n\ndd.default_factory = None    # behaves like a plain dict again\ndd['y']                      # KeyError!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `default_factory` is the callable used for missing keys; setting it to `None` (the default for a plain `dict`) restores `KeyError` behaviour."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "How does `defaultdict` work internally (`__missing__`)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`dict.__getitem__` calls `__missing__(key)` when a key is absent. `defaultdict` overrides it to call the factory, store, and return the value."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class MyDefault(dict):\n    def __missing__(self, key):\n        self[key] = 0      # insert default\n        return 0\n\nd = MyDefault()\nd[\"x\"] += 1                # works without KeyError -> {'x': 1}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `__missing__` is the hook; `defaultdict` is essentially this pattern in C. Note `.get()` does **not** trigger `__missing__`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "Since dict is ordered in 3.7+, what does `OrderedDict` still offer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Regular `dict` preserves insertion order since 3.7, but `OrderedDict` adds:"
    },
    {
     "t": "ol",
     "items": [
      "`move_to_end(key, last=True/False)`",
      "`popitem(last=True/False)` — pop from either end",
      "**Order-sensitive equality**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import OrderedDict\n\n{'a': 1, 'b': 2} == {'b': 2, 'a': 1}                             # True (order ignored)\nOrderedDict(a=1, b=2) == OrderedDict(b=2, a=1)                   # False (order matters)\n\nod = OrderedDict([('a', 1), ('b', 2), ('c', 3)])\nod.move_to_end('a')          # -> b, c, a\nod.popitem(last=False)       # ('b', 2)  — FIFO pop",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `OrderedDict` when you need `move_to_end`, FIFO/LIFO `popitem`, or order to be part of `==`. Otherwise a plain dict suffices."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Implement an LRU cache with `OrderedDict`.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, maxsize):\n        self.cache = OrderedDict()\n        self.maxsize = maxsize\n\n    def get(self, key):\n        if key not in self.cache:\n            return None\n        self.cache.move_to_end(key)        # mark as most recently used\n        return self.cache[key]\n\n    def put(self, key, value):\n        if key in self.cache:\n            self.cache.move_to_end(key)\n        self.cache[key] = value\n        if len(self.cache) > self.maxsize:\n            self.cache.popitem(last=False)  # evict least recently used\n\nlru = LRUCache(3)\nlru.put('a', 1); lru.put('b', 2); lru.put('c', 3)\nlru.get('a')        # touches 'a'\nlru.put('d', 4)     # evicts 'b'\nlist(lru.cache.keys())   # ['c', 'a', 'd']",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `move_to_end` (recency) + `popitem(last=False)` (FIFO eviction) is the canonical LRU recipe. In production prefer `functools.lru_cache` for function memoization."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is `deque` and how does it differ from a `list`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`deque` (double-ended queue) gives **O(1)** appends and pops at **both** ends; a `list` is O(n) for front operations because it shifts every element."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import deque\n\ndq = deque([1, 2, 3])\ndq.append(4)        # right, O(1)\ndq.appendleft(0)    # left,  O(1)\ndq.pop()            # right, O(1)\ndq.popleft()        # left,  O(1)",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Operation",
      "`list`",
      "`deque`"
     ],
     "rows": [
      [
       "append/pop right",
       "O(1)*",
       "O(1)"
      ],
      [
       "append/pop **left**",
       "**O(n)**",
       "**O(1)**"
      ],
      [
       "random index `[i]`",
       "**O(1)**",
       "**O(n)**"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `deque` for queues/stacks/sliding windows (fast ends); use `list` when you need fast random indexing."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What does `maxlen` do on a deque?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A bounded deque discards items from the opposite end when full — a built-in circular buffer / sliding window."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import deque\n\ndq = deque([1, 2, 3], maxlen=3)\ndq.append(4)        # deque([2, 3, 4]) — 1 dropped from the left\ndq.appendleft(0)    # deque([0, 2, 3]) — 4 dropped from the right",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `maxlen` makes deque ideal for \"last N items\" trackers (recent history, moving averages, log tails) with no manual trimming."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What does `deque.rotate(n)` do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Rotates elements: positive `n` rotates right, negative `n` rotates left."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import deque\n\ndq = deque([1, 2, 3, 4, 5])\ndq.rotate(2)     # deque([4, 5, 1, 2, 3])\ndq.rotate(-2)    # deque([1, 2, 3, 4, 5])  — back to start",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `rotate` is O(k) and handy for round-robin / Josephus (\"hot potato\") style algorithms; `extendleft` reverses the order of the appended iterable."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Why is `deque` the right tool for BFS and sliding-window problems?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import deque\n\n# BFS — O(1) popleft from the frontier queue\ndef bfs(graph, start):\n    seen, q, order = {start}, deque([start]), []\n    while q:\n        node = q.popleft()\n        order.append(node)\n        for nb in graph.get(node, []):\n            if nb not in seen:\n                seen.add(nb); q.append(nb)\n    return order\n\n# Sliding window maximum — monotonic deque of indices, O(n)\ndef window_max(nums, k):\n    dq, out = deque(), []\n    for i, n in enumerate(nums):\n        while dq and nums[dq[-1]] <= n:\n            dq.pop()\n        dq.append(i)\n        if dq[0] <= i - k:\n            dq.popleft()\n        if i >= k - 1:\n            out.append(nums[dq[0]])\n    return out\n\nwindow_max([1, 3, -1, -3, 5, 3, 6, 7], 3)   # [3, 3, 5, 5, 6, 7]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** BFS needs O(1) FIFO (`popleft`); the monotonic-deque window keeps candidates sorted so each element is pushed/popped once → overall O(n)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is a `namedtuple` and why use one?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`namedtuple` creates a lightweight, immutable tuple subclass with **named fields** — readable attribute access with the memory footprint of a plain tuple."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import namedtuple\n\nPoint = namedtuple('Point', ['x', 'y'])\np = Point(3, 4)\np.x, p.y      # 3, 4\np[0]          # 3  — still index-accessible\nx, y = p      # unpacking works",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use it for small immutable records (coordinates, DB rows, return-multiple-values) where you want `.field` clarity without writing a class."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Explain `namedtuple` defaults and the helper methods `_fields`, `_make`, `_asdict`, `_replace`.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import namedtuple\n\nColor = namedtuple('Color', 'r g b', defaults=[0, 0, 0])  # defaults apply right-to-left\nColor()                 # Color(r=0, g=0, b=0)\nColor(255, 128)         # Color(r=255, g=128, b=0)\n\nColor._fields           # ('r', 'g', 'b')\nColor._make([1, 2, 3])  # Color(r=1, g=2, b=3)  — build from iterable (CSV/DB rows)\nc = Color(1, 2, 3)\nc._asdict()             # {'r': 1, 'g': 2, 'b': 3}  — dict for serialization\nc._replace(b=9)         # Color(r=1, g=2, b=9)  — NEW tuple (immutable)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `defaults` fill from the **right**; `_make` builds from iterables, `_asdict` serializes, `_replace` returns a modified copy (since the original is immutable)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "`namedtuple` vs `dataclass` — which to choose?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`namedtuple`",
      "`dataclass`"
     ],
     "rows": [
      [
       "Mutability",
       "Immutable",
       "Mutable (or `frozen=True`)"
      ],
      [
       "Memory",
       "Very small (no `__dict__`)",
       "Larger (`__dict__`)"
      ],
      [
       "Hashable",
       "Yes",
       "Only if `frozen=True`"
      ],
      [
       "Iterable / indexable / unpackable",
       "Yes",
       "No"
      ],
      [
       "Type hints",
       "No",
       "Built-in"
      ],
      [
       "Methods / inheritance",
       "Awkward",
       "Natural"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from dataclasses import dataclass\n\n@dataclass(frozen=True)\nclass Point:\n    x: int\n    y: int",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Pick `namedtuple` for tiny immutable, tuple-like records (hashable, unpackable, light). Pick `dataclass` when you want mutability, methods, type hints, or it will grow into a real class."
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is `ChainMap` and how does lookup work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`ChainMap` groups multiple mappings into one logical view. Lookups search the maps **in order** and return the first hit."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import ChainMap\n\ndefaults  = {'color': 'red', 'size': 10}\noverrides = {'color': 'blue'}\nconfig = ChainMap(overrides, defaults)\n\nconfig['color']   # 'blue'  — found in overrides first\nconfig['size']    # 10      — falls through to defaults",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** It is a **view**, not a copy — no merging cost, and changes to underlying dicts are reflected live. First map wins, modelling priority/override layering."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "How do writes behave on a `ChainMap`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "All mutations (set/update/delete) affect **only the first map**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import ChainMap\n\nparent = {'a': 1, 'b': 2}\nchild = ChainMap({}, parent)\nchild['c'] = 3\nchild['a'] = 10            # shadows parent's 'a' in the first map\n\nchild['a']     # 10\nparent['a']    # 1  — untouched\nchild.maps     # [{'c': 3, 'a': 10}, {'a': 1, 'b': 2}]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Writes go to `maps[0]`, so you can \"shadow\" lower layers without modifying them — perfect for scoped overrides. Deleting a key only present in a lower map raises `KeyError`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "How does `ChainMap` model scopes? Explain `new_child()` and `parents`.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import ChainMap\n\ng = {'x': 1, 'y': 2}                  # global\nl = {'y': 10, 'z': 30}                # local\nscope = ChainMap(l, g)\nscope['x'], scope['y']                # 1, 10  — local shadows global\n\ninner = scope.new_child({'y': 99})    # push a new scope on top\ninner['y']                            # 99\nback = inner.parents                  # drop the front map -> original scope",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `new_child()` enters a nested scope (prepends a fresh map); `parents` exits it. This mirrors LEGB-style name resolution and config layering (CLI > env > defaults)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "Why use `UserDict`/`UserList`/`UserString` instead of subclassing the built-ins directly?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Built-ins are implemented in C; their internal methods often bypass your overridden Python methods. `UserDict` etc. are pure-Python wrappers (data held in `.data`) that **always** route through your overrides."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class MyDict(dict):\n    def __setitem__(self, k, v):\n        print(\"set\", k)\n        super().__setitem__(k, v)\n\nd = MyDict(a=1)       # __setitem__ NOT called during __init__!\nd.update({'b': 2})    # may NOT call __setitem__ either\n\nfrom collections import UserDict\nclass LoudDict(UserDict):\n    def __setitem__(self, k, v):\n        print(\"set\", k)\n        super().__setitem__(k, v)\n\nLoudDict(a=1)         # \"set a\" — override IS honoured",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** If you override `__setitem__`/`__getitem__`/etc., use `UserDict`/`UserList`/`UserString` so all paths (init, update, slicing) respect your logic. The underlying data lives in `.data`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "Give a concrete `UserDict` / `UserList` / `UserString` example.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import UserDict, UserList, UserString\n\nclass IntValuesDict(UserDict):\n    def __setitem__(self, key, value):\n        if not isinstance(value, int):\n            raise TypeError(\"value must be int\")\n        super().__setitem__(key, value)\n\nclass SortedList(UserList):\n    def append(self, item):\n        super().append(item)\n        self.data.sort()\n\nclass CIString(UserString):\n    def __eq__(self, other):\n        return self.data.lower() == str(other).lower()\n    __hash__ = None\n\nd = IntValuesDict(); d['age'] = 30          # ok; d['x'] = 'a' -> TypeError\nsl = SortedList([3, 1]); sl.append(2)       # [1, 2, 3]\nCIString(\"Hi\") == \"hi\"                      # True",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Subclass `User*` when you need *validated*, *sorted*, or *custom-comparison* containers whose behaviour holds across every mutation path."
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "Summarize the time complexity of the main collection operations.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Operation",
      "`list`",
      "`dict`/`Counter`",
      "`set`",
      "`deque`"
     ],
     "rows": [
      [
       "append right",
       "O(1)*",
       "—",
       "—",
       "O(1)"
      ],
      [
       "append left",
       "O(n)",
       "—",
       "—",
       "**O(1)**"
      ],
      [
       "pop right",
       "O(1)",
       "—",
       "—",
       "O(1)"
      ],
      [
       "pop left",
       "O(n)",
       "—",
       "—",
       "**O(1)**"
      ],
      [
       "index `[i]`",
       "O(1)",
       "O(1) (by key)",
       "—",
       "**O(n)**"
      ],
      [
       "membership `in`",
       "O(n)",
       "O(1)",
       "O(1)",
       "O(n)"
      ],
      [
       "`most_common(k)`",
       "—",
       "O(n log k)",
       "—",
       "—"
      ]
     ]
    },
    {
     "t": "p",
     "text": "`*` amortized."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `deque` wins at the ends and loses at random access; `dict`/`set`/`Counter` give O(1) membership and key access. Match the structure to the dominant operation."
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "When would you choose each collection type? (Decision cheat-sheet)",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Need",
      "Use"
     ],
     "rows": [
      [
       "Count frequencies",
       "`Counter`"
      ],
      [
       "Group items by key",
       "`defaultdict(list)`"
      ],
      [
       "Auto-initialize missing keys",
       "`defaultdict`"
      ],
      [
       "FIFO queue / BFS",
       "`deque`"
      ],
      [
       "Sliding window / \"last N\"",
       "`deque(maxlen=k)`"
      ],
      [
       "Undo/redo, recent history",
       "`deque(maxlen=...)`"
      ],
      [
       "LRU cache",
       "`OrderedDict` (or `functools.lru_cache`)"
      ],
      [
       "Order-sensitive dict comparison",
       "`OrderedDict`"
      ],
      [
       "Named immutable record",
       "`namedtuple` (or `dataclass`)"
      ],
      [
       "Layered config / scopes",
       "`ChainMap`"
      ],
      [
       "Validated/custom container",
       "`UserDict` / `UserList` / `UserString`"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Choosing the right container often removes whole blocks of manual bookkeeping and improves asymptotic complexity for free."
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What are the most common Counter gotchas?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\n\nc = Counter(\"aab\")\nc['z']                  # 0 — missing keys return 0, but...\nprint('z' in c)         # False — and just reading c['z'] does NOT insert it\n                        # (Counter does NOT auto-insert like defaultdict)\n\n# Binary ops drop non-positive counts:\nCounter(a=1) - Counter(a=5)     # Counter()  — empty, NOT {'a': -4}\n\n# update() ADDS, it does not overwrite like dict.update:\nc2 = Counter(a=1); c2.update(a=5)   # Counter({'a': 6})",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Reading a missing Counter key returns `0` *without inserting*; binary `+`/`-`/`&`/`|` drop ≤0 counts; `update()` accumulates rather than replacing."
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What are the common `defaultdict` gotchas?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import defaultdict\n\ndd = defaultdict(list)\n_ = dd['missing']        # creates dd['missing'] = []  just by READING!\nprint(dict(dd))          # {'missing': []}  — surprise key\n\n# Safe read without creating:\ndd.get('other')          # None — .get() does NOT trigger the factory\n\n# Don't pass arguments to the factory — it must be zero-arg:\ndefaultdict(lambda: [0, 0, 0])['p']   # [0, 0, 0]  — wrap in a lambda",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Indexing a missing key on a `defaultdict` *inserts* it — use `.get()` to peek safely. The factory must take no arguments (use a `lambda` for parameterized defaults). Convert to `dict(dd)` before serializing/printing if you want a clean view."
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "Common `deque` and `OrderedDict` gotchas?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import deque, OrderedDict\n\n# deque random access / slicing is O(n) and slicing is unsupported:\ndq = deque([1, 2, 3, 4])\ndq[2]            # 3  — O(n)\n# dq[1:3]        # TypeError: sequence index must be integer (no slicing)\n\n# extendleft reverses the order of the input:\nd = deque([1, 2]); d.extendleft([3, 4])   # deque([4, 3, 1, 2])\n\n# OrderedDict equality is order-sensitive vs plain dict (asymmetric!):\nfrom collections import OrderedDict\nOrderedDict(a=1, b=2) == {'b': 2, 'a': 1}            # True  (vs plain dict)\nOrderedDict(a=1, b=2) == OrderedDict(b=2, a=1)       # False (vs OrderedDict)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `deque` has no slicing and O(n) indexing; `extendleft` reverses its argument; `OrderedDict` vs `OrderedDict` comparison considers order, but `OrderedDict` vs plain `dict` does not."
    }
   ]
  },
  {
   "t": "drill",
   "n": "31",
   "q": "Build a graph adjacency list and a Trie with `defaultdict`.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import defaultdict\n\nclass Graph:\n    def __init__(self):\n        self.adj = defaultdict(list)\n    def add_edge(self, u, v):\n        self.adj[u].append(v)\n        self.adj[v].append(u)        # undirected\n\nclass Trie:\n    def __init__(self):\n        self.children = defaultdict(Trie)   # auto-vivifying nodes\n        self.is_end = False\n    def insert(self, word):\n        node = self\n        for ch in word:\n            node = node.children[ch]\n        node.is_end = True\n    def search(self, word):\n        node = self\n        for ch in word:\n            if ch not in node.children:\n                return False\n            node = node.children[ch]\n        return node.is_end",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `defaultdict(list)` removes the \"init the list\" boilerplate for graphs; `defaultdict(Trie)` lets each node create children on demand — clean recursive structures."
    }
   ]
  },
  {
   "t": "drill",
   "n": "32",
   "q": "How do `Counter`, `namedtuple`, and `defaultdict` combine in a real analytics task?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import namedtuple, Counter, defaultdict\n\nRecord = namedtuple('Record', 'name department salary')\nemps = [\n    Record('Alice', 'Eng', 100_000),\n    Record('Bob',   'Sales', 80_000),\n    Record('Eve',   'Eng', 110_000),\n]\n\ndept_counts = Counter(e.department for e in emps)\n# Counter({'Eng': 2, 'Sales': 1})\n\nsalaries = defaultdict(list)\nfor e in emps:\n    salaries[e.department].append(e.salary)\navg = {d: sum(s) / len(s) for d, s in salaries.items()}\n# {'Eng': 105000.0, 'Sales': 80000.0}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `namedtuple` models rows readably, `Counter` tallies categories, and `defaultdict(list)` aggregates per group — a compact, idiomatic ETL pattern."
    }
   ]
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Implement a moving average and a \"recent requests\" counter with deque.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import deque\n\nclass MovingAverage:\n    def __init__(self, size):\n        self.window = deque(maxlen=size)\n    def next(self, val):\n        self.window.append(val)               # auto-evicts oldest\n        return sum(self.window) / len(self.window)\n\nma = MovingAverage(3)\nma.next(1); ma.next(10); ma.next(3)           # 1.0, 5.5, 4.666...\n\nclass RecentCounter:\n    def __init__(self, window=3000):\n        self.q = deque(); self.window = window\n    def ping(self, t):\n        self.q.append(t)\n        while self.q[0] < t - self.window:\n            self.q.popleft()\n        return len(self.q)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `deque(maxlen=k)` makes fixed-window averages trivial; an unbounded deque with `popleft` of expired items implements a sliding *time* window in amortized O(1)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "34",
   "q": "Is `Counter`/`deque`/`defaultdict` thread-safe? How do you make a thread-safe variant?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Individual `deque.append`/`pop`/`appendleft`/`popleft` are atomic (thread-safe). `Counter` and `defaultdict` operations like `c[k] += 1` are **not** atomic (read-modify-write race). For shared state, guard with a lock or use `queue.Queue`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\nfrom collections import Counter\n\nclass SafeCounter:\n    def __init__(self):\n        self._c = Counter()\n        self._lock = threading.Lock()\n    def add(self, key):\n        with self._lock:\n            self._c[key] += 1",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `deque`'s end operations are atomic, but `Counter`/`defaultdict` increments are not — wrap compound updates in a `Lock`, or use `queue.Queue` for producer/consumer pipelines."
    }
   ]
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Which `collections` helpers are deprecated or have a better alternative today?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "`OrderedDict` for plain ordering → use a normal `dict` (3.7+). Keep `OrderedDict` only for `move_to_end`, FIFO `popitem`, or order-sensitive equality.",
      "Hand-rolled LRU via `OrderedDict` → prefer `functools.lru_cache` / `functools.cache` for function memoization.",
      "`namedtuple` that needs methods/mutability → `dataclasses.dataclass` or `typing.NamedTuple` (typed namedtuple).",
      "ABCs once in `collections` (e.g. `Mapping`, `Sequence`) now live in `collections.abc`."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import NamedTuple\nclass Point(NamedTuple):       # typed namedtuple\n    x: int\n    y: int = 0",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Reach for the modern equivalents (`dict`, `functools.lru_cache`, `dataclass`/typed `NamedTuple`, `collections.abc`) unless you specifically need the extra `collections` features."
    }
   ]
  }
 ],
 "takeaways": []
});

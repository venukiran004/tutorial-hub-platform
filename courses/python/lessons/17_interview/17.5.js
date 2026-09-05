/* ============================================================================
   INTERVIEW 17.5 — Dictionaries
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "17.5",
 "lede": "**20 interview questions on dictionaries**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 20 questions on dictionaries without prompting",
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
   "q": "How is a dictionary implemented internally?",
   "body": [
    {
     "t": "p",
     "text": "Python's `dict` uses a **hash table** with **open addressing**."
    },
    {
     "t": "p",
     "text": "**Compact dict (Python 3.6+):**"
    },
    {
     "t": "table",
     "head": [
      "Component",
      "Purpose"
     ],
     "rows": [
      [
       "**Sparse index table**",
       "Small integer array; maps hash slots to entry indices"
      ],
      [
       "**Dense entries array**",
       "Stores `(hash, key, value)` tuples in **insertion order**"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Index Table (sparse)        Entries Array (dense, ordered)\n┌─────┐                    ┌──────┬───────┬───────┐\n│  1  │───────────────────►│ hash │ \"b\"   │  2    │  entry 0\n├─────┤                    ├──────┼───────┼───────┤\n│  0  │───────────────────►│ hash │ \"a\"   │  1    │  entry 1\n├─────┤                    ├──────┼───────┼───────┤\n│ -1  │  (empty)           │ hash │ \"c\"   │  3    │  entry 2\n├─────┤                    └──────┴───────┴───────┘\n│  2  │───────────────────►\n└─────┘",
     "numbered": false
    },
    {
     "t": "ul",
     "items": [
      "**Hash collision resolution:** Open addressing with perturbation-based probing — not separate chaining.",
      "**Load factor:** Table resizes when 2/3 full.",
      "**Benefit:** ~20-25% less memory than pre-3.6 implementation, and insertion order is preserved as a natural consequence of the dense array layout."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the time complexity of dict operations?",
   "body": [
    {
     "t": "table",
     "head": [
      "Operation",
      "Average",
      "Worst Case",
      "Notes"
     ],
     "rows": [
      [
       "`d[key]` (lookup)",
       "**O(1)**",
       "O(n)",
       "Hash collision degrades performance"
      ],
      [
       "`d[key] = val` (insert)",
       "**O(1)**",
       "O(n)",
       "Amortized due to resizing"
      ],
      [
       "`del d[key]`",
       "**O(1)**",
       "O(n)",
       ""
      ],
      [
       "`key in d`",
       "**O(1)**",
       "O(n)",
       "Same as lookup"
      ],
      [
       "`len(d)`",
       "**O(1)**",
       "O(1)",
       "Stored as attribute"
      ],
      [
       "`d.copy()`",
       "**O(n)**",
       "O(n)",
       "Shallow copy"
      ],
      [
       "Iteration",
       "**O(n)**",
       "O(n)",
       "Over dense entries array"
      ],
      [
       "`d.keys() & d2.keys()`",
       "**O(min(n,m))**",
       "O(n*m)",
       "Set intersection on views"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Worst case O(n)** requires pathological hash collisions — virtually impossible with Python's randomized hash (SipHash since 3.4)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Why must dict keys be hashable?",
   "body": [
    {
     "t": "p",
     "text": "Dictionaries locate keys using their **hash value** to compute an index into the hash table."
    },
    {
     "t": "p",
     "text": "**Requirements for a valid key:** 1. Must implement `__hash__()` — returns a stable integer. 2. Must implement `__eq__()` — used to resolve collisions and confirm matches. 3. **Hash-equality contract:** If `a == b`, then `hash(a) == hash(b)`. 4. Hash value must **never change** during the object's lifetime (i.e., the object must be effectively immutable)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Hashable types (valid keys)\nhash(\"hello\")               # ✅ str\nhash(42)                     # ✅ int\nhash((1, 2, 3))              # ✅ tuple (of hashables)\nhash(frozenset({1, 2}))      # ✅ frozenset\n\n# Unhashable types (invalid keys)\n# hash([1, 2])               # ❌ TypeError — list is mutable\n# hash({1, 2})               # ❌ TypeError — set is mutable\n# hash({\"a\": 1})             # ❌ TypeError — dict is mutable",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why mutable types aren't hashable by default:** If an object's value changes after insertion, its hash would change, making it impossible to locate in the hash table — the key would be \"lost.\""
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "How does Python handle hash collisions?",
   "body": [
    {
     "t": "p",
     "text": "Python uses **open addressing** with **perturbation-based probing** (not separate chaining used by Java's HashMap)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Simplified probing algorithm\nslot = hash(key) % table_size\n\nperturb = hash(key)\nwhile table[slot] is occupied:\n    slot = (5 * slot + perturb + 1) % table_size\n    perturb >>= 5  # Use progressively fewer bits of the full hash",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key properties:** - The perturbation variable ensures **all bits** of the hash influence the probe sequence, not just the low-order bits. - As `perturb` shifts right, the sequence degrades to a simple linear probe `(5*slot + 1) % size`, which guarantees visiting all slots. - Deleted entries are marked as **dummy** (tombstone) so probe sequences aren't broken. - The table is resized (typically doubled) when the **load factor exceeds 2/3**."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "When did dict become insertion-ordered?",
   "body": [
    {
     "t": "table",
     "head": [
      "Version",
      "Status"
     ],
     "rows": [
      [
       "**Python ≤ 3.5**",
       "Unordered — iteration order is arbitrary"
      ],
      [
       "**Python 3.6**",
       "**CPython implementation detail** — compact dict happens to preserve insertion order"
      ],
      [
       "**Python 3.7+**",
       "**Language specification** — insertion order is **guaranteed** across all implementations"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Python 3.7+\nd = {}\nd[\"b\"] = 2\nd[\"a\"] = 1\nd[\"c\"] = 3\nlist(d)        # ['b', 'a', 'c'] — guaranteed insertion order\nd.popitem()    # ('c', 3) — LIFO guaranteed",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Implication:** `OrderedDict` is still useful for order-sensitive equality and `move_to_end()`, but regular `dict` suffices for most ordering needs."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Difference between `dict.get()` and direct access?",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "`d[key]`",
      "`d.get(key, default)`"
     ],
     "rows": [
      [
       "Missing key",
       "Raises `KeyError`",
       "Returns `default` (None if omitted)"
      ],
      [
       "Triggers `__missing__`",
       "✅ Yes",
       "❌ No"
      ],
      [
       "Use case",
       "Key is expected to exist",
       "Key may or may not exist"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "d = {\"a\": 1}\n\n# Direct access — fail-fast\ntry:\n    val = d[\"b\"]\nexcept KeyError:\n    val = 0\n\n# get() — safe access\nval = d.get(\"b\", 0)      # 0, no exception\nval = d.get(\"b\")          # None\n\n# ⚠️ Subtle difference with defaultdict\nfrom collections import defaultdict\ndd = defaultdict(int)\ndd[\"a\"]            # 0 — key 'a' is now inserted via __missing__\ndd.get(\"b\", 99)    # 99 — key 'b' is NOT inserted\nprint(\"a\" in dd)   # True\nprint(\"b\" in dd)   # False",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is `defaultdict` and how does it work internally?",
   "body": [
    {
     "t": "p",
     "text": "`defaultdict` is a `dict` subclass from `collections` that overrides `__missing__()` to automatically create entries for missing keys."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import defaultdict\n\n# Internal mechanism (simplified)\nclass defaultdict(dict):\n    def __init__(self, default_factory=None, *args, **kwargs):\n        super().__init__(*args, **kwargs)\n        self.default_factory = default_factory\n\n    def __missing__(self, key):\n        if self.default_factory is None:\n            raise KeyError(key)\n        value = self.default_factory()  # Call factory with no args\n        self[key] = value               # Insert the default\n        return value",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Common patterns:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Counting\ncounts = defaultdict(int)\nfor x in data:\n    counts[x] += 1\n\n# Grouping\ngroups = defaultdict(list)\nfor k, v in pairs:\n    groups[k].append(v)\n\n# Nested dicts\ntree = defaultdict(lambda: defaultdict(int))\ntree[\"user\"][\"visits\"] += 1",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key detail:** Only `d[key]` triggers `__missing__`. Methods like `get()`, `__contains__` (`in`), and `setdefault()` do **not** trigger it."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "How to merge two dictionaries in Python 3.9+?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "d1 = {\"a\": 1, \"b\": 2}\nd2 = {\"b\": 99, \"c\": 3}\n\n# 1. | operator — creates NEW dict (Python 3.9+)\nmerged = d1 | d2\n# {'a': 1, 'b': 99, 'c': 3}  — d2 values win on conflict\n\n# 2. |= operator — in-place merge (Python 3.9+)\nd1 |= d2\n# d1 is now {'a': 1, 'b': 99, 'c': 3}\n\n# Older alternatives:\n# {**d1, **d2}        — Python 3.5+\n# d1.update(d2)       — all versions, in-place\n# dict(d1, **d2)      — only if d2 keys are strings",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Under the hood:** `dict.__or__` creates a new dict from the left operand, then calls `update()` with the right operand. `__ior__` calls `update()` in-place."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What happens if you modify a dict while iterating?",
   "body": [
    {
     "t": "p",
     "text": "**Adding or removing keys** during iteration raises `RuntimeError`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "d = {\"a\": 1, \"b\": 2, \"c\": 3}\n\n# ❌ RuntimeError: dictionary changed size during iteration\nfor key in d:\n    if d[key] < 3:\n        del d[key]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why?** The iterator checks an internal version counter (`ma_version_tag`). Any structural mutation (insert/delete) increments this counter, invalidating active iterators."
    },
    {
     "t": "p",
     "text": "**Modifying values is safe** (size doesn't change):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "for key in d:\n    d[key] *= 2  # ✅ OK — no size change",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Workarounds for deletion:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 1. Snapshot the keys\nfor key in list(d):\n    if d[key] < 3:\n        del d[key]\n\n# 2. Build a new dict\nd = {k: v for k, v in d.items() if v >= 3}",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is the difference between `dict` and `OrderedDict` now?",
   "body": [
    {
     "t": "p",
     "text": "Since Python 3.7, regular `dict` preserves insertion order. `OrderedDict` still differs in these ways:"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`dict`",
      "`OrderedDict`"
     ],
     "rows": [
      [
       "Insertion order",
       "✅ Guaranteed (3.7+)",
       "✅ Always"
      ],
      [
       "Equality comparison",
       "**Order-independent**",
       "**Order-dependent**"
      ],
      [
       "`move_to_end(key, last)`",
       "❌",
       "✅"
      ],
      [
       "`popitem(last=True/False)`",
       "Only LIFO",
       "LIFO or FIFO"
      ],
      [
       "Memory usage",
       "Lower",
       "~40% more overhead"
      ],
      [
       "`__reversed__`",
       "✅ (3.8+)",
       "✅ Always"
      ],
      [
       "`json.dumps` order",
       "Preserved",
       "Preserved"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import OrderedDict\n\n# Equality difference\n{\"a\": 1, \"b\": 2} == {\"b\": 2, \"a\": 1}                                          # True\nOrderedDict([(\"a\", 1), (\"b\", 2)]) == OrderedDict([(\"b\", 2), (\"a\", 1)])          # False\n\n# LRU cache pattern with OrderedDict\nclass LRUCache(OrderedDict):\n    def __init__(self, capacity):\n        super().__init__()\n        self.capacity = capacity\n\n    def get(self, key):\n        if key in self:\n            self.move_to_end(key)\n            return self[key]\n        return -1\n\n    def put(self, key, value):\n        if key in self:\n            self.move_to_end(key)\n        self[key] = value\n        if len(self) > self.capacity:\n            self.popitem(last=False)  # Remove oldest (FIFO)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "How does `dict.setdefault()` differ from `defaultdict`?",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "`setdefault()`",
      "`defaultdict`"
     ],
     "rows": [
      [
       "Type",
       "Method on any `dict`",
       "Separate class"
      ],
      [
       "When triggered",
       "Explicit call: `d.setdefault(k, v)`",
       "Automatic on `d[key]` access"
      ],
      [
       "Side effect",
       "Inserts `key: default` if missing",
       "Inserts `key: factory()` if missing"
      ],
      [
       "Default value",
       "Any object (passed as argument)",
       "Factory function (no args)"
      ],
      [
       "Overhead",
       "Per-call",
       "One-time setup"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# setdefault — explicit, per-call\nd = {}\nd.setdefault(\"key\", []).append(1)\nd.setdefault(\"key\", []).append(2)\nprint(d)  # {'key': [1, 2]}\n\n# defaultdict — automatic, class-wide\nfrom collections import defaultdict\nd = defaultdict(list)\nd[\"key\"].append(1)\nd[\"key\"].append(2)\nprint(d)  # defaultdict(<class 'list'>, {'key': [1, 2]})",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use which:** - `setdefault()`: Occasional missing-key handling; keep regular `dict` type. - `defaultdict`: Frequent missing-key pattern (counting, grouping); cleaner code."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What are dictionary view objects?",
   "body": [
    {
     "t": "p",
     "text": "`d.keys()`, `d.values()`, and `d.items()` return **view objects** — lightweight, dynamic windows into the dict's data."
    },
    {
     "t": "p",
     "text": "**Properties:** - **Dynamic:** Reflect changes to the underlying dict in real time. - **Lazy:** Don't create a copy — O(1) to create. - **Iterable:** Can be used in `for` loops. - **Set-like:** `keys()` and `items()` support set operations (`&`, `|`, `-`, `^`)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "d = {\"a\": 1, \"b\": 2}\nkv = d.keys()\nprint(kv)        # dict_keys(['a', 'b'])\n\nd[\"c\"] = 3\nprint(kv)        # dict_keys(['a', 'b', 'c'])  — reflects change\n\n# Set operations on views\nd1 = {\"a\": 1, \"b\": 2, \"c\": 3}\nd2 = {\"b\": 20, \"d\": 40}\nprint(d1.keys() & d2.keys())   # {'b'}\nprint(d1.keys() | d2.keys())   # {'a', 'b', 'c', 'd'}\nprint(d1.keys() - d2.keys())   # {'a', 'c'}\n\n# ⚠️ values() does NOT support set operations (values may not be hashable)\n# d1.values() & d2.values()  # TypeError",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How to implement a cache using dict? (LRU cache concept)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Simple memoization with dict\ndef fib(n, cache={}):\n    if n in cache:\n        return cache[n]\n    if n <= 1:\n        return n\n    cache[n] = fib(n-1) + fib(n-2)\n    return cache[n]\n\n# LRU Cache using OrderedDict\nfrom collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, capacity: int):\n        self.cache = OrderedDict()\n        self.capacity = capacity\n\n    def get(self, key):\n        if key not in self.cache:\n            return -1\n        self.cache.move_to_end(key)  # Mark as recently used\n        return self.cache[key]\n\n    def put(self, key, value):\n        if key in self.cache:\n            self.cache.move_to_end(key)\n        self.cache[key] = value\n        if len(self.cache) > self.capacity:\n            self.cache.popitem(last=False)  # Evict LRU (oldest)\n\nlru = LRUCache(3)\nlru.put(\"a\", 1)\nlru.put(\"b\", 2)\nlru.put(\"c\", 3)\nlru.get(\"a\")       # Moves \"a\" to end\nlru.put(\"d\", 4)    # Evicts \"b\" (least recently used)\nprint(lru.cache)    # OrderedDict([('c', 3), ('a', 1), ('d', 4)])\n\n# Production use: functools.lru_cache\nfrom functools import lru_cache\n\n@lru_cache(maxsize=128)\ndef expensive_function(n):\n    return n ** 2",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is the `__hash__` and `__eq__` contract for dict keys?",
   "body": [
    {
     "t": "p",
     "text": "**The contract:** 1. If `a == b` (i.e., `a.__eq__(b)` is `True`), then `hash(a) == hash(b)`. 2. The converse is NOT required — different objects can have the same hash (collision). 3. `__hash__` must return the **same value** for the lifetime of the object."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Employee:\n    def __init__(self, emp_id, name):\n        self.emp_id = emp_id\n        self.name = name\n\n    def __eq__(self, other):\n        return isinstance(other, Employee) and self.emp_id == other.emp_id\n\n    def __hash__(self):\n        return hash(self.emp_id)  # Based on the same field as __eq__\n\ne1 = Employee(1, \"Alice\")\ne2 = Employee(1, \"Alice Smith\")  # Same emp_id\n\nd = {e1: \"Engineering\"}\nprint(d[e2])  # \"Engineering\" — e1 == e2 and hash(e1) == hash(e2)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Violation consequences:** - If `__eq__` is defined without `__hash__`, the class becomes unhashable (Python sets `__hash__` to `None`). - If `hash(a) == hash(b)` but `a != b` → collision, resolved by probing (performance penalty, not an error). - If `a == b` but `hash(a) != hash(b)` → **broken contract** — key lookup silently fails."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How to sort a dict by its values?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "scores = {\"Alice\": 85, \"Bob\": 92, \"Carol\": 78, \"Dave\": 95}\n\n# Sort by value (ascending) — returns list of tuples\nsorted_items = sorted(scores.items(), key=lambda x: x[1])\n# [('Carol', 78), ('Alice', 85), ('Bob', 92), ('Dave', 95)]\n\n# Sort by value (descending) — create new ordered dict\nsorted_dict = dict(sorted(scores.items(), key=lambda x: x[1], reverse=True))\n# {'Dave': 95, 'Bob': 92, 'Alice': 85, 'Carol': 78}\n\n# Using operator.itemgetter (faster for large dicts)\nfrom operator import itemgetter\nsorted_dict = dict(sorted(scores.items(), key=itemgetter(1)))\n\n# Get key of max/min value\nmax(scores, key=scores.get)   # 'Dave'\nmin(scores, key=scores.get)   # 'Carol'",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Note:** The resulting `dict` preserves the sorted order (Python 3.7+), but it won't re-sort when new items are added."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the memory overhead of a dict?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\n\n# Empty dict\nsys.getsizeof({})       # 64 bytes (CPython 3.11+)\n\n# Small dict\nsys.getsizeof({\"a\": 1}) # 184 bytes\n\n# Memory components:\n# - PyObject header:     16 bytes (refcount + type pointer)\n# - Dict struct fields:  ~48 bytes (size, used, version, etc.)\n# - Sparse index table:  variable (1-8 bytes per slot × table_size)\n# - Dense entries array: 24 bytes per entry (hash + key + value pointers)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key facts:** - Dicts resize at 2/3 load factor, so there's always ~33% wasted index slots. - The compact dict (3.6+) is ~20-25% more memory-efficient than the old layout. - For very small fixed-structure objects, consider `__slots__`, `namedtuple`, or `dataclass` instead of dicts. - **Key-sharing dicts:** Instance `__dict__`s of objects of the same class share a single key table — significant memory savings for many instances."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How to handle missing keys gracefully?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "d = {\"a\": 1, \"b\": 2}\n\n# 1. get() — returns default, no side effect\nval = d.get(\"z\", 0)\n\n# 2. setdefault() — returns default AND inserts it\nval = d.setdefault(\"z\", 0)  # d now has 'z': 0\n\n# 3. defaultdict — automatic default on access\nfrom collections import defaultdict\ndd = defaultdict(int)\nval = dd[\"z\"]  # 0, key 'z' inserted\n\n# 4. try/except (EAFP)\ntry:\n    val = d[\"z\"]\nexcept KeyError:\n    val = 0\n\n# 5. Conditional check (LBYL)\nif \"z\" in d:\n    val = d[\"z\"]\nelse:\n    val = 0\n\n# 6. __missing__ — custom behavior in subclass\nclass SafeDict(dict):\n    def __missing__(self, key):\n        return f\"<{key} not found>\"\n\nsd = SafeDict(a=1)\nsd[\"z\"]  # '<z not found>'",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Best practice ranking:** 1. `get()` — for occasional missing keys, no side effects. 2. `defaultdict` — for systematic patterns (counting, grouping). 3. `setdefault()` — when you want to insert AND return. 4. `try/except` — when missing keys are truly exceptional."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is `dict.__missing__()` method?",
   "body": [
    {
     "t": "p",
     "text": "`__missing__` is a hook called by `__getitem__` when a key is not found. Regular `dict` does **not** define it — it raises `KeyError` directly."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# __missing__ is ONLY called via d[key], NOT via d.get() or 'key in d'\n\nclass CountingDict(dict):\n    \"\"\"Tracks how many times missing keys are accessed.\"\"\"\n\n    def __init__(self, *args, **kwargs):\n        super().__init__(*args, **kwargs)\n        self.miss_count = 0\n\n    def __missing__(self, key):\n        self.miss_count += 1\n        return None  # Return without inserting\n\nd = CountingDict(a=1, b=2)\nd[\"a\"]         # 1 — found, __missing__ not called\nd[\"z\"]         # None — __missing__ called\nd[\"y\"]         # None — __missing__ called\nd.get(\"w\", 0)  # 0 — __missing__ NOT called\nprint(d.miss_count)  # 2\n\n# defaultdict uses __missing__ internally:\n# When d[key] fails → __missing__(key) → calls default_factory() → inserts and returns",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key rules:** - Only triggered by `d[key]` (i.e., `__getitem__`). - NOT triggered by `get()`, `__contains__` (`in`), `setdefault()`, `pop()`, etc. - If `__missing__` raises an exception, that exception propagates instead of `KeyError`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Difference between dict comprehension and `dict()`?",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "Dict Comprehension",
      "`dict()` Constructor"
     ],
     "rows": [
      [
       "Syntax",
       "`{k: v for k, v in iterable}`",
       "`dict(iterable)` or `dict(**kwargs)`"
      ],
      [
       "Speed",
       "**Faster** (specialized bytecode)",
       "Slower (function call + name lookup)"
      ],
      [
       "Flexibility",
       "Conditions, transformations",
       "Limited — just pairs or kwargs"
      ],
      [
       "Readability",
       "Expressive for complex logic",
       "Simpler for basic conversion"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pairs = [(\"a\", 1), (\"b\", 2), (\"c\", 3)]\n\n# dict() — simple conversion\nd = dict(pairs)                          # {'a': 1, 'b': 2, 'c': 3}\n\n# Comprehension — same result, slightly faster\nd = {k: v for k, v in pairs}            # {'a': 1, 'b': 2, 'c': 3}\n\n# Comprehension advantage: filtering and transformation\nd = {k: v * 10 for k, v in pairs if v > 1}  # {'b': 20, 'c': 30}\n# Cannot do this with dict() alone\n\n# dict() advantage: keyword arguments (string keys only)\nd = dict(name=\"Alice\", age=30)           # {'name': 'Alice', 'age': 30}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Performance (CPython):**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import timeit\n\npairs = list(zip(range(1000), range(1000)))\n\ntimeit.timeit(lambda: dict(pairs), number=10000)            # ~0.45s\ntimeit.timeit(lambda: {k: v for k, v in pairs}, number=10000)  # ~0.35s\n# Comprehension is ~20-25% faster",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "How does Python's dict differ from Java's HashMap?",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "Python `dict`",
      "Java `HashMap`"
     ],
     "rows": [
      [
       "Collision resolution",
       "**Open addressing** (probing)",
       "**Separate chaining** (linked list → red-black tree at threshold 8)"
      ],
      [
       "Ordering",
       "**Insertion-ordered** (3.7+)",
       "Unordered (use `LinkedHashMap` for order)"
      ],
      [
       "Load factor threshold",
       "**2/3** (~0.67)",
       "**0.75** (default)"
      ],
      [
       "Resize strategy",
       "Double the size",
       "Double the size"
      ],
      [
       "Null keys",
       "`None` is a valid key",
       "One `null` key allowed"
      ],
      [
       "Key requirement",
       "`__hash__` + `__eq__`",
       "`hashCode()` + `equals()`"
      ],
      [
       "Thread safety",
       "Not thread-safe",
       "Not thread-safe (use `ConcurrentHashMap`)"
      ],
      [
       "Memory layout",
       "Compact (split index + entries)",
       "Node array + linked lists/trees"
      ],
      [
       "Empty size",
       "~64 bytes",
       "~128 bytes (48 + entry array)"
      ],
      [
       "Treeification",
       "N/A",
       "Converts bucket to red-black tree when chain length > 8"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Python's open addressing vs Java's separate chaining:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Python (Open Addressing):\n┌───┬───┬───┬───┬───┬───┬───┬───┐\n│ A │   │ B │ C │   │   │ D │   │  ← Single flat array\n└───┴───┴───┴───┴───┴───┴───┴───┘\n  Collision → probe next slot\n\nJava (Separate Chaining):\n┌───┐\n│ → │ A → E → null                  ← Linked list / tree per bucket\n├───┤\n│ → │ B → null\n├───┤\n│ → │ C → F → G → null\n└───┘",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Practical differences:** - Python's approach has better **cache locality** (fewer pointer chases). - Java's approach handles high load factors more gracefully (chains grow linearly). - Python's `dict` is faster for small to medium dicts; Java's `HashMap` scales better for very large maps with poor hash distribution due to treeification."
    }
   ]
  }
 ],
 "takeaways": []
});

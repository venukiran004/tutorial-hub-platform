/* ============================================================================
   INTERVIEW: LANGUAGE CORE i1.4 — Tuples, Sets & Frozensets
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.4",
 "lede": "**20 interview questions on tuples, sets & frozensets**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 20 questions on tuples, sets & frozensets without prompting",
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
   "q": "What is a tuple and how is it different from a list?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A **tuple** is an **immutable, ordered** sequence of elements. A **list** is a **mutable, ordered** sequence."
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "Tuple",
      "List"
     ],
     "rows": [
      [
       "Mutability",
       "Immutable",
       "Mutable"
      ],
      [
       "Syntax",
       "`(1, 2, 3)`",
       "`[1, 2, 3]`"
      ],
      [
       "Methods",
       "2 (`count`, `index`)",
       "11+ (`append`, `extend`, `insert`, `remove`, `pop`, `sort`, `reverse`, etc.)"
      ],
      [
       "Hashable",
       "Yes (if elements hashable)",
       "No"
      ],
      [
       "Memory",
       "Less (no over-allocation)",
       "More (over-allocates for dynamic resizing)"
      ],
      [
       "Speed",
       "Slightly faster creation/access",
       "Slightly slower"
      ],
      [
       "Dict key",
       "Yes",
       "No"
      ],
      [
       "Use case",
       "Fixed data, function returns, dict keys",
       "Dynamic collections that change"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nt = (1, 2, 3, 4, 5)\nl = [1, 2, 3, 4, 5]\nprint(sys.getsizeof(t))  # 80\nprint(sys.getsizeof(l))  # 120",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Tuples are used when data should not change — coordinates, database rows, config values. Lists are used when you need to add, remove, or modify elements."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Why are tuples immutable? What are the benefits?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Tuples are immutable by design. Benefits include:"
    },
    {
     "t": "ol",
     "items": [
      "**Hashability**Tuples can be used as dict keys and set elements.",
      "**Thread safety**Immutable objects are inherently thread-safe (no locks needed).",
      "**Memory efficiency**Python can optimize storage; tuples use less memory than lists.",
      "**Semantic clarity**Signals to other developers that the data is fixed.",
      "**Performance**Tuple creation is faster. Python caches small tuples for reuse.",
      "**Security**Prevents accidental modification of data that should remain constant."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Python caches small tuples\na = (1, 2, 3)\nb = (1, 2, 3)\nprint(a is b)  # True (may be True for small tuples due to interning)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Can a tuple contain mutable elements? What happens?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Yes, a tuple can contain mutable elements (like lists, dicts, sets). The tuple's immutability means you cannot change **which objects** the tuple holds, but you **can mutate the objects themselves**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "t = (1, [2, 3], {\"key\": \"value\"})\n\n# ❌ Cannot reassign tuple elements\n# t[1] = [4, 5]  → TypeError\n\n# ✅ Can mutate the mutable elements in place\nt[1].append(4)          # (1, [2, 3, 4], {\"key\": \"value\"})\nt[2][\"new\"] = \"data\"    # (1, [2, 3, 4], {\"key\": \"value\", \"new\": \"data\"})",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Important gotcha:** A tuple containing a mutable element is **NOT hashable**:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "t = (1, [2, 3])\n# hash(t)  → TypeError: unhashable type: 'list'\n# Cannot use as dict key or set element",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "How is a set implemented internally? (hash table)",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Python sets are implemented as **hash tables** (similar to dictionaries but without values)."
    },
    {
     "t": "p",
     "text": "**Internal mechanics:** 1. When you add an element, Python computes its **hash** using `hash()`. 2. The hash determines the **bucket** (slot) in the internal array. 3. If the bucket is empty, the element is placed there. 4. If there's a **collision** (another element has the same hash), Python uses **open addressing** (probing) to find the next available slot. 5. For lookup, Python hashes the element, checks the computed bucket, and probes if necessary."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Element → hash() → bucket index → store/lookup\n\n{1, 2, 3}:\n  hash(1) → slot 1 → store 1\n  hash(2) → slot 2 → store 2\n  hash(3) → slot 3 → store 3",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key implications:** - Elements must be **hashable** (implement `__hash__` and `__eq__`). - Average O(1) for add, remove, and membership testing. - No ordering guarantee (hash determines placement, not insertion order). - Memory overhead for the hash table (trades space for speed). - Load factor triggers **resizing** (rehashing all elements into a larger table)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the time complexity of set operations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
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
       "`x in s`",
       "**O(1)**",
       "O(n)",
       "Hash collision worst case"
      ],
      [
       "`s.add(x)`",
       "**O(1)**",
       "O(n)",
       "May trigger resize"
      ],
      [
       "`s.remove(x)`",
       "**O(1)**",
       "O(n)",
       "Hash collision worst case"
      ],
      [
       "`s.discard(x)`",
       "**O(1)**",
       "O(n)",
       "Same as remove"
      ],
      [
       "`s.pop()`",
       "**O(1)**",
       "O(n)",
       ""
      ],
      [
       "`len(s)`",
       "**O(1)**",
       "O(1)",
       "Cached internally"
      ],
      [
       "`s \\| t` (union)",
       "**O(len(s) + len(t))**",
       "—",
       "Iterates both sets"
      ],
      [
       "`s & t` (intersection)",
       "**O(min(len(s), len(t)))**",
       "—",
       "Iterates smaller set"
      ],
      [
       "`s - t` (difference)",
       "**O(len(s))**",
       "—",
       "Iterates first set"
      ],
      [
       "`s ^ t` (sym. diff.)",
       "**O(len(s) + len(t))**",
       "—",
       ""
      ],
      [
       "`s <= t` (subset)",
       "**O(len(s))**",
       "—",
       "Checks each element of s in t"
      ]
     ]
    },
    {
     "t": "p",
     "text": "The worst case O(n) for single-element operations occurs only with extreme hash collisions, which is rare with Python's hash functions."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Difference between `set.remove()` and `set.discard()`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "If element exists",
      "If element NOT found"
     ],
     "rows": [
      [
       "`remove(x)`",
       "Removes `x`",
       "Raises **KeyError**"
      ],
      [
       "`discard(x)`",
       "Removes `x`",
       "**Does nothing** (no error)"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s = {1, 2, 3}\n\ns.remove(2)     # {1, 3} — works fine\ns.discard(10)   # {1, 3} — no error\ns.remove(10)    # ❌ KeyError: 10",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use which:** - Use `remove()` when the element **should** exist — a missing element indicates a bug. - Use `discard()` when you want to remove if present, without caring if it's absent."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is a frozenset and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A **frozenset** is an **immutable** version of a set. It supports all set operations (union, intersection, etc.) but not mutation methods (add, remove, discard, etc.)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "fs = frozenset([1, 2, 3])\n# fs.add(4)  → AttributeError",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use cases:**"
    },
    {
     "t": "ol",
     "items": [
      "**Dict keys**Sets are unhashable, but frozensets are hashable."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "permissions = {frozenset([\"read\", \"write\"]): \"editor\"}",
     "numbered": false
    },
    {
     "t": "ol",
     "items": [
      "**Set of sets**You can't put sets inside sets, but you can use frozensets."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "groups = {frozenset([1, 2]), frozenset([3, 4])}",
     "numbered": false
    },
    {
     "t": "ol",
     "items": [
      "**Immutable default parameters**Avoid mutable default argument pitfall."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def func(allowed=frozenset({\"a\", \"b\", \"c\"})):\n    pass",
     "numbered": false
    },
    {
     "t": "ol",
     "items": [
      "**Caching / memoization** — When you need to use a set as a cache key.",
      "**Configuration constants** — A set of values that should never change."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "VALID_STATUSES = frozenset({\"active\", \"inactive\", \"pending\"})",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Why can't sets contain lists but can contain tuples?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Set elements must be **hashable** — they must implement `__hash__()` and `__eq__()`."
    },
    {
     "t": "ul",
     "items": [
      "**Lists are mutable** → If a list could be in a set and you modified it, the hash would change, and the set wouldn't be able to find it anymore. This would break the hash table invariant. So Python makes lists unhashable.",
      "**Tuples are immutable** → Their contents can't change, so their hash is stable. They're hashable (as long as all elements are also hashable)."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ✅ Tuples are hashable\ns = {(1, 2), (3, 4)}     # works\n\n# ❌ Lists are unhashable\n# s = {[1, 2], [3, 4]}   # TypeError: unhashable type: 'list'\n\n# ❌ Tuple containing list is NOT hashable\n# s = {(1, [2, 3])}      # TypeError: unhashable type: 'list'",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rule:** An object is hashable if it's immutable **and** all objects it contains are also hashable (recursively)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How to find unique elements in a list efficiently?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "nums = [4, 2, 3, 2, 1, 4, 3, 5]\n\n# Method 1: set() — O(n), does NOT preserve order\nunique1 = list(set(nums))              # [1, 2, 3, 4, 5] — order may vary\n\n# Method 2: dict.fromkeys() — O(n), preserves order (Python 3.7+)\nunique2 = list(dict.fromkeys(nums))    # [4, 2, 3, 1, 5] — insertion order\n\n# Method 3: seen set — O(n), preserves order, explicit\nseen = set()\nunique3 = []\nfor x in nums:\n    if x not in seen:\n        seen.add(x)\n        unique3.append(x)\n# [4, 2, 3, 1, 5]\n\n# Method 4: Using pandas (for DataFrames)\n# df['col'].unique()",
     "numbered": false
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
       "`set()`",
       "O(n)",
       "O(n)",
       "No"
      ],
      [
       "`dict.fromkeys()`",
       "O(n)",
       "O(n)",
       "Yes"
      ],
      [
       "`seen` set loop",
       "O(n)",
       "O(n)",
       "Yes"
      ]
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is a named tuple and when to use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A **named tuple** is a tuple subclass that gives names to each position, providing both attribute access and indexing."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# collections.namedtuple\nfrom collections import namedtuple\nPoint = namedtuple('Point', ['x', 'y'])\np = Point(3, 4)\nprint(p.x, p[0])  # 3 3\n\n# typing.NamedTuple (modern, preferred)\nfrom typing import NamedTuple\nclass Point(NamedTuple):\n    x: float\n    y: float",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use named tuples:**"
    },
    {
     "t": "ol",
     "items": [
      "**Lightweight data containers**When a full class is overkill but plain tuples lack clarity.",
      "**Replacing magic index access**`employee.name` is clearer than `employee[0]`.",
      "**Return values**Functions returning multiple values with meaning.",
      "**CSV/database rows**Representing records with named fields.",
      "**Immutable data objects**When you want a simple, immutable data holder.",
      "**Dict key**Named tuples are hashable and work as dict keys."
     ]
    },
    {
     "t": "p",
     "text": "**vs dataclass:** Use `dataclass` when you need mutability, methods, or complex behavior. Use `NamedTuple` for simple immutable records."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "How does tuple comparison work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Tuples are compared **lexicographically** — element by element from left to right."
    },
    {
     "t": "ol",
     "items": [
      "Compare the first elements. If they differ, the result is the comparison of those elements.",
      "If they're equal, move to the next elements.",
      "If all compared elements are equal but tuples have different lengths, the shorter tuple is \"less.\"",
      "If all elements are equal and lengths match, tuples are equal."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "(1, 2, 3) < (1, 2, 4)    # True  — first diff at index 2: 3 < 4\n(1, 3, 0) < (1, 2, 4)    # False — first diff at index 1: 3 > 2\n(1, 2) < (1, 2, 0)       # True  — prefix matches, shorter is less\n(1, 2, 3) == (1, 2, 3)   # True  — all equal",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Practical use — sorting by multiple criteria:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "students = [(\"Charlie\", 85), (\"Alice\", 92), (\"Bob\", 92)]\nstudents.sort()  # Sorts by name first, then by score\n# [('Alice', 92), ('Bob', 92), ('Charlie', 85)]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "Can you use a tuple as a dictionary key? Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Yes**, tuples can be dict keys because they are **hashable** (immutable with a consistent hash value)."
    },
    {
     "t": "p",
     "text": "**Requirements for dict keys:** 1. Must implement `__hash__()` — returns an integer. 2. Must implement `__eq__()` — for collision resolution. 3. Hash must remain constant throughout the object's lifetime."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Tuples with only hashable elements → hashable\ngrid = {(0, 0): \"start\", (5, 5): \"end\"}\nprint(grid[(0, 0)])  # \"start\"\n\n# Multi-dimensional lookup\ncache = {}\ncache[(3, \"relu\", 0.01)] = 0.95  # composite key\n\n# ⚠️ Tuple with mutable element → NOT hashable\n# d = {(1, [2, 3]): \"value\"}  → TypeError",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Lists cannot be dict keys because they're mutable — if the list changed after being used as a key, the hash would no longer match its bucket location."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the difference between `{}` and `set()`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = {}        # empty DICT, NOT a set\nb = set()     # empty SET\n\nprint(type(a))  # <class 'dict'>\nprint(type(b))  # <class 'set'>",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Syntax",
      "Result"
     ],
     "rows": [
      [
       "`{}`",
       "Empty dict"
      ],
      [
       "`{1, 2, 3}`",
       "Set with elements"
      ],
      [
       "`set()`",
       "Empty set"
      ],
      [
       "`{\"key\": \"val\"}`",
       "Dict with key-value pair"
      ]
     ]
    },
    {
     "t": "p",
     "text": "This is a historical design decision — `{}` was used for dicts before sets were added to Python (sets were added in Python 2.4, set literals in Python 2.7). The ambiguity exists only for the **empty** case."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "How do set operations (union, intersection) differ from methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Operator (`\\|`, `&`, `-`, `^`)",
      "Method (`.union()`, etc.)"
     ],
     "rows": [
      [
       "Right operand",
       "Must be a **set**",
       "Can be **any iterable**"
      ],
      [
       "Multiple args",
       "Chain: `a \\| b \\| c`",
       "Accepts multiple: `a.union(b, c)`"
      ],
      [
       "Readability",
       "More concise",
       "More explicit"
      ],
      [
       "Augmented (`\\|=`)",
       "Left must be set",
       "`.update()` accepts iterable"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = {1, 2, 3}\n\n# Method — accepts any iterable\na.union([4, 5], (6,), {7})        # {1, 2, 3, 4, 5, 6, 7}\na.intersection(range(2, 5))       # {2, 3}\n\n# Operator — requires set on both sides\n# a | [4, 5]   → TypeError\na | {4, 5}     # {1, 2, 3, 4, 5}  ✅",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use methods when working with non-set iterables. Use operators for concise set-to-set operations."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What are the use cases for frozenset in real-world code?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Dictionary keys for set-like keys:**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Caching results for different feature combinations\ncache = {}\nfeatures = frozenset([\"age\", \"income\", \"score\"])\ncache[features] = trained_model",
     "numbered": false
    },
    {
     "t": "ol",
     "items": [
      "**Set of sets (graph edges, combinations):**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "edges = {frozenset([1, 2]), frozenset([2, 3]), frozenset([1, 3])}\n# Undirected edges — frozenset({1,2}) == frozenset({2,1})",
     "numbered": false
    },
    {
     "t": "ol",
     "items": [
      "**Immutable configuration / constants:**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "ALLOWED_METHODS = frozenset({\"GET\", \"POST\", \"PUT\", \"DELETE\"})",
     "numbered": false
    },
    {
     "t": "ol",
     "items": [
      "**Safe default parameters:**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def process(valid_types=frozenset({\"int\", \"str\", \"float\"})):\n    # No mutable default argument bug\n    pass",
     "numbered": false
    },
    {
     "t": "ol",
     "items": [
      "**Database-like operations — composite keys:**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Group by combination of tags\ngroups = {}\nfor item in items:\n    key = frozenset(item.tags)\n    groups.setdefault(key, []).append(item)",
     "numbered": false
    },
    {
     "t": "ol",
     "items": [
      "**Memoization with set arguments:**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import lru_cache\n\n@lru_cache\ndef compute(items: frozenset):\n    return sum(items)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "How does Python hash tuples? What if tuple contains mutable?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Python computes tuple hashes using a **combination of the hashes of all elements**, processed through an algorithm based on the xxHash function (CPython 3.8+)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Simplified concept (not actual algorithm):\n# hash((a, b, c)) ≈ combine(hash(a), hash(b), hash(c))\n\nprint(hash((1, 2, 3)))        # deterministic within a session\nprint(hash((1, 2, 3)) == hash((1, 2, 3)))  # True — same content → same hash\nprint(hash((1, 2, 3)) != hash((1, 3, 2)))  # True — different order → different hash",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**If tuple contains a mutable element:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "t = (1, [2, 3])\n# hash(t)  → TypeError: unhashable type: 'list'",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Python raises `TypeError` because: 1. To hash the tuple, it must hash each element. 2. Lists don't have `__hash__` (it's set to `None` for mutable types). 3. Therefore the tuple itself becomes unhashable."
    },
    {
     "t": "p",
     "text": "**Rule:** A tuple is hashable ↔ all its elements are hashable (recursively)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "`typing.NamedTuple` vs `collections.namedtuple`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`collections.namedtuple`",
      "`typing.NamedTuple`"
     ],
     "rows": [
      [
       "Syntax",
       "Function call",
       "Class definition"
      ],
      [
       "Type annotations",
       "No",
       "Yes"
      ],
      [
       "Default values",
       "`defaults` parameter (3.6.1+)",
       "Direct assignment"
      ],
      [
       "Methods",
       "Can add via inheritance",
       "Natural class methods"
      ],
      [
       "IDE support",
       "Limited",
       "Better (class syntax)"
      ],
      [
       "Docstrings",
       "Manual",
       "Natural class docstring"
      ],
      [
       "Python version",
       "2.6+",
       "3.5+"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# collections.namedtuple\nfrom collections import namedtuple\nPoint = namedtuple('Point', ['x', 'y'], defaults=[0])\n# defaults apply to rightmost fields\n\n# typing.NamedTuple — preferred modern approach\nfrom typing import NamedTuple\n\nclass Point(NamedTuple):\n    \"\"\"A 2D point.\"\"\"\n    x: float\n    y: float = 0.0          # default value\n\n    @property\n    def magnitude(self) -> float:\n        return (self.x ** 2 + self.y ** 2) ** 0.5\n\np = Point(3.0, 4.0)\nprint(p.magnitude)  # 5.0",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Recommendation:** Use `typing.NamedTuple` for new code — it's more readable, supports type hints, and integrates better with modern Python tooling."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is tuple packing/unpacking? Extended unpacking?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Packing:** Multiple values are packed into a single tuple."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "t = 1, 2, 3            # packing → (1, 2, 3)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Unpacking:** Tuple values are assigned to individual variables."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a, b, c = (1, 2, 3)    # a=1, b=2, c=3\nx, y = y, x            # swap values",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Extended unpacking (PEP 3132, Python 3.0+):** Using `*` to capture multiple elements."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "first, *rest = [1, 2, 3, 4, 5]\n# first = 1, rest = [2, 3, 4, 5]\n\n*start, last = [1, 2, 3, 4, 5]\n# start = [1, 2, 3, 4], last = 5\n\nfirst, *middle, last = [1, 2, 3, 4, 5]\n# first = 1, middle = [2, 3, 4], last = 5\n\n# Edge case: starred variable can be empty list\na, *b = [1]\n# a = 1, b = []",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rules:** - Only **one** starred variable allowed per unpacking. - Starred variable always produces a **list**. - Total number of non-starred variables must not exceed the iterable length."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How to create a set of sets? (frozenset of frozensets)",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Regular sets are **unhashable** and cannot be elements of other sets. Use **frozensets** instead."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ❌ Set of sets — fails\n# s = {{1, 2}, {3, 4}}  → TypeError: unhashable type: 'set'\n\n# ✅ Set of frozensets\ns = {frozenset([1, 2]), frozenset([3, 4])}\nprint(s)  # {frozenset({1, 2}), frozenset({3, 4})}\n\n# ✅ Frozenset of frozensets\nfs = frozenset([frozenset([1, 2]), frozenset([3, 4])])\nprint(fs)  # frozenset({frozenset({1, 2}), frozenset({3, 4})})\n\n# Practical use: representing undirected graph edges\nedges = {frozenset([1, 2]), frozenset([2, 3]), frozenset([1, 3])}\n# frozenset({1, 2}) == frozenset({2, 1}), so edge direction doesn't matter\n\n# Check if edge exists\nprint(frozenset([2, 1]) in edges)  # True",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Performance comparison: tuple vs list (creation, access, memory)",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Metric",
      "Tuple",
      "List",
      "Winner"
     ],
     "rows": [
      [
       "Creation speed",
       "Faster (~5-10%)",
       "Slower",
       "Tuple"
      ],
      [
       "Element access",
       "Same (O(1))",
       "Same (O(1))",
       "Tie"
      ],
      [
       "Memory usage",
       "Less",
       "More (~40-60% more)",
       "Tuple"
      ],
      [
       "Iteration",
       "Slightly faster",
       "Slightly slower",
       "Tuple"
      ],
      [
       "Caching",
       "Python caches small tuples",
       "No caching",
       "Tuple"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nimport timeit\n\n# Memory comparison\nt = (1, 2, 3, 4, 5)\nl = [1, 2, 3, 4, 5]\nprint(f\"Tuple: {sys.getsizeof(t)} bytes\")   # 80\nprint(f\"List:  {sys.getsizeof(l)} bytes\")   # 120\n\n# Creation speed\ntuple_time = timeit.timeit(\"(1, 2, 3, 4, 5)\", number=10_000_000)\nlist_time = timeit.timeit(\"[1, 2, 3, 4, 5]\", number=10_000_000)\nprint(f\"Tuple creation: {tuple_time:.3f}s\")\nprint(f\"List creation:  {list_time:.3f}s\")\n\n# Tuple caching — Python reuses small constant tuples\na = (1, 2, 3)\nb = (1, 2, 3)\nprint(a is b)  # May be True (CPython optimization)\n\na = [1, 2, 3]\nb = [1, 2, 3]\nprint(a is b)  # Always False — lists are never cached",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why tuples are smaller:** - Lists over-allocate memory for potential future appends. - Lists store a pointer to the underlying array + size + capacity. - Tuples store only size + elements (no over-allocation needed since they're immutable)."
    },
    {
     "t": "p",
     "text": "**When to choose:** - Use **tuples** for fixed-size data, function returns, dict keys, constants. - Use **lists** when you need to add, remove, or modify elements."
    }
   ]
  }
 ],
 "takeaways": []
});

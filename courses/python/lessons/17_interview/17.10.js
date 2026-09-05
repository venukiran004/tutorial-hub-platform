/* ============================================================================
   INTERVIEW 17.10 — Generators & Iterators
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "17.10",
 "lede": "**20 interview questions on generators & iterators**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 20 questions on generators & iterators without prompting",
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
   "q": "What is the iteration protocol?",
   "body": [
    {
     "t": "p",
     "text": "The iteration protocol consists of two dunder methods:"
    },
    {
     "t": "ul",
     "items": [
      "**`__iter__()`**Returns an iterator object. Called by `iter()`.",
      "**`__next__()`**Returns the next value or raises `StopIteration`. Called by `next()`."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "nums = [10, 20, 30]\nit = iter(nums)           # calls nums.__iter__()\nprint(next(it))           # 10 — calls it.__next__()\nprint(next(it))           # 20\nprint(next(it))           # 30\n# next(it)                # StopIteration",
     "numbered": false
    },
    {
     "t": "p",
     "text": "A `for` loop is syntactic sugar that: 1. Calls `iter()` on the object to get an iterator 2. Calls `next()` repeatedly 3. Catches `StopIteration` to exit the loop"
    },
    {
     "t": "p",
     "text": "Any object that implements this protocol can be used in `for` loops, comprehensions, `map()`, `zip()`, unpacking, etc."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Difference between iterable and iterator?",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "Iterable",
      "Iterator"
     ],
     "rows": [
      [
       "Has `__iter__`",
       "Yes",
       "Yes"
      ],
      [
       "Has `__next__`",
       "No",
       "Yes"
      ],
      [
       "`iter()` returns",
       "A **new** iterator",
       "**Itself** (`self`)"
      ],
      [
       "Reusable",
       "Yes (creates fresh iterator each time)",
       "No (single-pass, exhausted after traversal)"
      ],
      [
       "Examples",
       "`list`, `str`, `dict`, `range`, `set`",
       "`list_iterator`, `generator`, `map`, `zip`, `file`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "lst = [1, 2, 3]             # iterable\nit = iter(lst)               # iterator\n\nprint(hasattr(lst, '__next__'))  # False — iterable, not iterator\nprint(hasattr(it, '__next__'))   # True  — iterator\n\n# Iterable can create multiple independent iterators\nit1, it2 = iter(lst), iter(lst)\nprint(next(it1))   # 1\nprint(next(it2))   # 1  — independent\n\n# Iterator returns itself from iter()\nprint(iter(it) is it)   # True",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key insight:** All iterators are iterables (they have `__iter__`), but not all iterables are iterators."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is a generator and how does it differ from a regular function?",
   "body": [
    {
     "t": "p",
     "text": "A **generator function** uses `yield` instead of `return`. When called, it returns a **generator object** (an iterator) without executing the body."
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "Regular Function",
      "Generator Function"
     ],
     "rows": [
      [
       "Keyword",
       "`return`",
       "`yield`"
      ],
      [
       "Calling it",
       "Executes body, returns value",
       "Returns generator object (no execution)"
      ],
      [
       "State",
       "Lost after return",
       "Preserved between `yield` calls"
      ],
      [
       "Memory",
       "Computes all at once",
       "Lazy (one value at a time)"
      ],
      [
       "Return type",
       "Any value",
       "Generator object (iterator)"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Regular function\ndef get_squares(n):\n    return [x**2 for x in range(n)]   # returns entire list\n\n# Generator function\ndef gen_squares(n):\n    for x in range(n):\n        yield x**2                     # yields one at a time\n\nresult = get_squares(5)     # [0, 1, 4, 9, 16] — all in memory\ngen = gen_squares(5)        # <generator object> — nothing computed yet\nprint(next(gen))            # 0 — computes only when asked",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is `yield` and how does it maintain state?",
   "body": [
    {
     "t": "p",
     "text": "`yield` **suspends** the function's execution and sends a value to the caller. When `next()` is called again, execution **resumes** exactly where it left off — all local variables, instruction pointer, and call stack are preserved."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def stateful():\n    print(\"Step 1\")\n    x = 10\n    yield x             # suspends here, x=10 is preserved\n\n    print(\"Step 2\")\n    x += 5\n    yield x             # suspends here, x=15 is preserved\n\n    print(\"Step 3\")\n    x += 5\n    yield x             # suspends here, x=20 is preserved\n\ng = stateful()\nprint(next(g))   # Step 1 → 10\nprint(next(g))   # Step 2 → 15\nprint(next(g))   # Step 3 → 20",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**How it works internally:** - Generator function creates a frame object with its own local scope - `yield` saves the frame state (locals, instruction pointer) - `next()` restores the frame and resumes execution - This is why generators are sometimes called \"resumable functions\""
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Difference between generator expression and list comprehension?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\n\n# List comprehension — eager, stores all values\nlist_comp = [x**2 for x in range(1_000_000)]\n\n# Generator expression — lazy, computes on demand\ngen_expr = (x**2 for x in range(1_000_000))\n\nprint(sys.getsizeof(list_comp))   # ~8,448,728 bytes\nprint(sys.getsizeof(gen_expr))    # ~200 bytes",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "List Comprehension `[...]`",
      "Generator Expression `(...)`"
     ],
     "rows": [
      [
       "Evaluation",
       "Eager (all values immediately)",
       "Lazy (one at a time)"
      ],
      [
       "Memory",
       "O(n)",
       "O(1)"
      ],
      [
       "Type",
       "`list`",
       "`generator`"
      ],
      [
       "Reusable",
       "Yes",
       "No (single-pass)"
      ],
      [
       "Indexable",
       "Yes (`lst[3]`)",
       "No"
      ],
      [
       "Has `len()`",
       "Yes",
       "No"
      ],
      [
       "Speed (single pass)",
       "Slightly faster (contiguous memory)",
       "Slightly slower"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**When to use generator expression:** - Large datasets that don't fit in memory - Only need single-pass iteration - Piping into `sum()`, `min()`, `max()`, `any()`, `all()`"
    },
    {
     "t": "p",
     "text": "**When to use list comprehension:** - Need random access or `len()` - Need to iterate multiple times - Small datasets"
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is `yield from` and when to use it?",
   "body": [
    {
     "t": "p",
     "text": "`yield from` (PEP 380, Python 3.3+) delegates iteration to a sub-generator or iterable. It replaces the pattern of looping over an iterable and yielding each item."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Without yield from\ndef chain_manual(*iterables):\n    for it in iterables:\n        for item in it:\n            yield item\n\n# With yield from — cleaner and more efficient\ndef chain(*iterables):\n    for it in iterables:\n        yield from it\n\nprint(list(chain([1, 2], [3, 4])))   # [1, 2, 3, 4]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key benefits:** 1. **Cleaner syntax** — eliminates nested `for` loops 2. **Passes `send()` and `throw()` through** to sub-generator 3. **Captures sub-generator's return value**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def sub():\n    yield 1\n    yield 2\n    return \"done\"\n\ndef main():\n    result = yield from sub()    # captures return value\n    print(f\"Sub returned: {result}\")\n    yield 3\n\nprint(list(main()))\n# Sub returned: done\n# [1, 2, 3]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use cases:** Recursive generators (tree traversal, flattening), composing generators, coroutine delegation."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "How does `send()` work with generators?",
   "body": [
    {
     "t": "p",
     "text": "`send(value)` resumes the generator and sends a value that becomes the result of the current `yield` expression. This enables **two-way communication**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def running_total():\n    total = 0\n    while True:\n        value = yield total     # yield sends total OUT, receives value IN\n        total += value\n\nrt = running_total()\nnext(rt)               # prime the generator (must call next/send(None) first)\nprint(rt.send(10))     # 10\nprint(rt.send(20))     # 30\nprint(rt.send(5))      # 35",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rules:** 1. Must **prime** the generator with `next(gen)` or `gen.send(None)` before sending values 2. `send(None)` is equivalent to `next(gen)` 3. The sent value becomes the result of the `yield` expression where the generator is paused 4. The generator then runs until the next `yield`, which sends back the next value"
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is the generator pipeline pattern?",
   "body": [
    {
     "t": "p",
     "text": "A generator pipeline chains multiple generators where each stage lazily processes data from the previous stage. Data flows through the pipeline **one item at a time**, not in bulk."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def read_lines(path):\n    with open(path) as f:\n        for line in f:\n            yield line.strip()\n\ndef filter_nonempty(lines):\n    for line in lines:\n        if line:\n            yield line\n\ndef to_uppercase(lines):\n    for line in lines:\n        yield line.upper()\n\n# Pipeline: read → filter → transform\nlines = read_lines('data.txt')\nnon_empty = filter_nonempty(lines)\nupper = to_uppercase(non_empty)\n\nfor line in upper:    # data flows lazily through all stages\n    print(line)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Benefits:** - **Memory efficient** — only one item in memory at a time (regardless of file size) - **Composable** — easy to add/remove/reorder stages - **Lazy** — no work happens until the pipeline is consumed - Used heavily in data processing, ETL, log analysis"
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How do generators save memory compared to lists?",
   "body": [
    {
     "t": "p",
     "text": "Generators use **lazy evaluation** — they compute and yield one value at a time instead of storing all values in memory."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\n\n# List stores ALL 1 million values\nbig_list = [x**2 for x in range(1_000_000)]\nprint(sys.getsizeof(big_list))    # ~8,448,728 bytes (~8 MB)\n\n# Generator stores only the computation state\nbig_gen = (x**2 for x in range(1_000_000))\nprint(sys.getsizeof(big_gen))     # ~200 bytes (constant!)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**How:** - Generator only stores: frame object, instruction pointer, local variables - This is a **fixed, constant** amount of memory regardless of sequence length - Each call to `next()` computes exactly one value, uses it, then discards it"
    },
    {
     "t": "p",
     "text": "**When it matters most:** - Processing multi-GB files line by line - Streaming data from network/API - Infinite sequences - Pipeline processing where intermediate results aren't needed"
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What happens when a generator is exhausted?",
   "body": [
    {
     "t": "p",
     "text": "When a generator has no more values to yield, calling `next()` raises `StopIteration`. The generator cannot be restarted."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def simple():\n    yield 1\n    yield 2\n\ng = simple()\nprint(next(g))   # 1\nprint(next(g))   # 2\n\ntry:\n    next(g)\nexcept StopIteration:\n    print(\"Generator exhausted!\")\n\n# Cannot restart — must create a new one\nprint(list(g))           # [] — still exhausted\ng2 = simple()            # create fresh generator\nprint(list(g2))          # [1, 2]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**If the generator has a `return` statement:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def gen_with_return():\n    yield 1\n    return \"finished\"\n\ng = gen_with_return()\nnext(g)   # 1\ntry:\n    next(g)\nexcept StopIteration as e:\n    print(e.value)   # \"finished\" — return value is in StopIteration.value",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key points:** - `for` loops catch `StopIteration` automatically - Exhausted generators return `[]` when passed to `list()` - `next(gen, default)` returns `default` instead of raising the exception"
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is `itertools` and name 5 most useful functions?",
   "body": [
    {
     "t": "p",
     "text": "`itertools` is a standard library module providing memory-efficient tools for working with iterators. All functions return iterators (lazy evaluation)."
    },
    {
     "t": "p",
     "text": "**Top 5 most useful:**"
    },
    {
     "t": "table",
     "head": [
      "Function",
      "Purpose",
      "Example"
     ],
     "rows": [
      [
       "`chain(*iterables)`",
       "Concatenate iterables",
       "`chain([1,2], [3,4])` → `1,2,3,4`"
      ],
      [
       "`islice(it, start, stop)`",
       "Slice any iterator",
       "`islice(count(), 5)` → `0,1,2,3,4`"
      ],
      [
       "`groupby(it, key)`",
       "Group consecutive elements",
       "Group records by category"
      ],
      [
       "`product(*its)`",
       "Cartesian product",
       "`product([1,2], [3,4])` → all pairs"
      ],
      [
       "`combinations(it, r)`",
       "All r-length subsets",
       "`combinations('ABC', 2)` → AB, AC, BC"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Honorable mentions:** `zip_longest`, `accumulate`, `permutations`, `cycle`, `tee`, `filterfalse`"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from itertools import chain, islice, groupby, product, combinations\n\n# chain: flatten multiple lists\nprint(list(chain([1, 2], [3, 4])))          # [1, 2, 3, 4]\n\n# islice: first 5 squares\nprint(list(islice((x**2 for x in range(100)), 5)))  # [0, 1, 4, 9, 16]\n\n# combinations: choose 2 from 4\nprint(list(combinations(\"ABCD\", 2)))\n# [('A','B'), ('A','C'), ('A','D'), ('B','C'), ('B','D'), ('C','D')]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "How does `groupby()` work? (Requires sorted input)",
   "body": [
    {
     "t": "p",
     "text": "`groupby(iterable, key)` groups **consecutive** elements with the same key. It does NOT sort — input **must be pre-sorted** by the key for correct grouping."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from itertools import groupby\n\n# Correct: sorted input\ndata = [(\"fruit\", \"apple\"), (\"fruit\", \"banana\"), (\"veg\", \"carrot\"), (\"veg\", \"pea\")]\nfor key, group in groupby(data, lambda x: x[0]):\n    print(key, list(group))\n# fruit [('fruit', 'apple'), ('fruit', 'banana')]\n# veg   [('veg', 'carrot'), ('veg', 'pea')]",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# WRONG: unsorted input splits groups\ndata = [(\"fruit\", \"apple\"), (\"veg\", \"carrot\"), (\"fruit\", \"banana\")]\nfor key, group in groupby(data, lambda x: x[0]):\n    print(key, list(group))\n# fruit [('fruit', 'apple')]\n# veg   [('veg', 'carrot')]\n# fruit [('fruit', 'banana')]    ← split! Not merged!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Fix:** Always sort by key first:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "data.sort(key=lambda x: x[0])",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Caveats:** - The `group` iterator is invalidated when you advance to the next group — consume it (e.g., `list(group)`) before moving on - Only groups **consecutive** equal elements — not a SQL-style GROUP BY"
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is `chain()` and `chain.from_iterable()`?",
   "body": [
    {
     "t": "p",
     "text": "Both concatenate multiple iterables into one, but differ in how they accept arguments."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from itertools import chain\n\n# chain(*iterables) — takes multiple arguments\nresult = list(chain([1, 2], [3, 4], [5, 6]))\nprint(result)   # [1, 2, 3, 4, 5, 6]\n\n# chain.from_iterable(iterable_of_iterables) — takes ONE iterable of iterables\nnested = [[1, 2], [3, 4], [5, 6]]\nresult = list(chain.from_iterable(nested))\nprint(result)   # [1, 2, 3, 4, 5, 6]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use `from_iterable`:** - When you have a dynamically generated collection of iterables - When the iterables come from a generator (can't unpack with `*`) - Flattening one level of nesting"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Flatten generator of lists — can't use * here\ndef generate_lists():\n    yield [1, 2]\n    yield [3, 4]\n    yield [5, 6]\n\nprint(list(chain.from_iterable(generate_lists())))\n# [1, 2, 3, 4, 5, 6]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "How to create an infinite iterator?",
   "body": [
    {
     "t": "p",
     "text": "**Using `itertools`:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from itertools import count, cycle, repeat\n\n# count: infinite arithmetic sequence\nfor i in count(10, 5):       # 10, 15, 20, 25, ...\n    if i > 30: break\n    print(i, end=\" \")        # 10 15 20 25 30\n\n# cycle: repeat a sequence forever\n# for c in cycle(\"RGB\"):     # R, G, B, R, G, B, ...\n\n# repeat: same element forever (or n times)\n# for x in repeat(42):       # 42, 42, 42, ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Using a generator function:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def naturals(start=1):\n    n = start\n    while True:\n        yield n\n        n += 1\n\ndef fibonacci():\n    a, b = 0, 1\n    while True:\n        yield a\n        a, b = b, a + b",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Always use `islice` or a `break` to consume finite portions:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from itertools import islice\nprint(list(islice(fibonacci(), 10)))\n# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is the difference between `iter(obj)` and `iter(callable, sentinel)`?",
   "body": [
    {
     "t": "p",
     "text": "**One-argument form:** `iter(obj)` - Calls `obj.__iter__()` to get an iterator - Standard usage for iterables"
    },
    {
     "t": "p",
     "text": "**Two-argument form:** `iter(callable, sentinel)` - Calls `callable()` repeatedly until it returns `sentinel` - `sentinel` value is NOT included in output - `callable` must be a zero-argument callable"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# One-argument\nit = iter([1, 2, 3])\nprint(list(it))          # [1, 2, 3]\n\n# Two-argument: read until sentinel\nimport random\nrandom.seed(0)\nrolls = iter(lambda: random.randint(1, 6), 6)\nprint(list(rolls))       # rolls until 6 appears (6 not included)\n\n# Practical: read file in chunks until empty bytes\n# blocks = iter(lambda: f.read(4096), b'')",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "How to make a class both iterable and iterator?",
   "body": [
    {
     "t": "p",
     "text": "A class is both when `__iter__` returns `self` and it implements `__next__`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Countdown:\n    def __init__(self, start):\n        self.current = start\n\n    def __iter__(self):\n        return self           # returns self → is both iterable and iterator\n\n    def __next__(self):\n        if self.current <= 0:\n            raise StopIteration\n        val = self.current\n        self.current -= 1\n        return val\n\ncd = Countdown(3)\nfor x in cd:\n    print(x)       # 3, 2, 1\n\n# But it's single-pass!\nprint(list(cd))    # [] — exhausted",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**For reusable iteration, separate the iterable from the iterator:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class CountdownIterable:\n    def __init__(self, start):\n        self.start = start\n\n    def __iter__(self):\n        return CountdownIterator(self.start)    # NEW iterator each time\n\nclass CountdownIterator:\n    def __init__(self, current):\n        self.current = current\n\n    def __iter__(self):\n        return self\n\n    def __next__(self):\n        if self.current <= 0:\n            raise StopIteration\n        val = self.current\n        self.current -= 1\n        return val\n\ncd = CountdownIterable(3)\nprint(list(cd))   # [3, 2, 1]\nprint(list(cd))   # [3, 2, 1] — reusable!",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is `tee()` and what are its caveats?",
   "body": [
    {
     "t": "p",
     "text": "`tee(iterable, n=2)` creates `n` independent iterators from a single iterable."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from itertools import tee\n\ndata = iter(range(5))\na, b = tee(data, 2)\n\nprint(list(a))   # [0, 1, 2, 3, 4]\nprint(list(b))   # [0, 1, 2, 3, 4]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Caveats:**"
    },
    {
     "t": "ol",
     "items": [
      "**Memory:** `tee` internally buffers values. If one iterator advances far ahead of others, all intermediate values are stored in memory. For large iterables, this can be as expensive as `list()`.",
      "**Original iterator:** Do NOT use the original iterator after calling `tee` — it may cause data loss.",
      "**Not thread-safe:** Cannot safely use teed iterators across threads."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Memory issue example:\ndata = iter(range(1_000_000))\na, b = tee(data)\nlist(a)    # consumes all of a → tee buffers ALL 1M values for b\n# Now b has 1M values buffered — might as well have used list()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use:** When you need to make a small number of passes over a moderate-sized iterator. For large data, consider materializing with `list()` or restructuring the algorithm."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "When should you NOT use generators?",
   "body": [
    {
     "t": "p",
     "text": "Generators are not always the right choice:"
    },
    {
     "t": "ol",
     "items": [
      "**Need random access**Can't index `gen[5]`; use list",
      "**Need `len()`**Generators don't support `len()`",
      "**Need multiple passes**Generators are single-use; recreating them may re-execute expensive operations",
      "**Need to slice**Can't use `gen[2:5]`; need `islice()` which consumes",
      "**Small data**Overhead of generator protocol may be slower than a list for small collections",
      "**Need to sort or reverse**These require all data in memory anyway",
      "**Debugging**Generators are harder to inspect (can't `print` all values without consuming)",
      "**Concurrent access**Generators are not thread-safe"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# BAD: Using generator when you need len and indexing\ndata_gen = (x**2 for x in range(10))\n# len(data_gen)        # TypeError\n# data_gen[3]          # TypeError\n\n# GOOD: Use list when random access is needed\ndata_list = [x**2 for x in range(10)]\nprint(len(data_list))  # 10\nprint(data_list[3])    # 9",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How do generators relate to coroutines and async/await?",
   "body": [
    {
     "t": "p",
     "text": "Generators are the historical foundation for Python's coroutines:"
    },
    {
     "t": "p",
     "text": "**Evolution:** 1. **Python 2.2:** Simple generators with `yield` (PEP 255) 2. **Python 2.5:** Generator-based coroutines with `send()`, `throw()`, `close()` (PEP 342) 3. **Python 3.3:** `yield from` for delegation (PEP 380) 4. **Python 3.4:** `asyncio` with `@asyncio.coroutine` + `yield from` 5. **Python 3.5:** Native coroutines with `async def` + `await` (PEP 492)"
    },
    {
     "t": "p",
     "text": "**Generators as coroutines (old style):**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def old_coroutine():\n    while True:\n        value = yield         # receives sent value\n        print(f\"Got: {value}\")\n\nc = old_coroutine()\nnext(c)              # prime\nc.send(\"hello\")      # Got: hello",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Modern async coroutines (current style):**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def modern_coroutine():\n    data = await fetch_data()    # suspends, resumes when ready\n    return data",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key differences:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "Generator",
      "Async Coroutine"
     ],
     "rows": [
      [
       "Keyword",
       "`yield`",
       "`async def` + `await`"
      ],
      [
       "Purpose",
       "Lazy iteration",
       "Concurrent I/O"
      ],
      [
       "Protocol",
       "`__next__`, `send`",
       "`__await__`"
      ],
      [
       "Loop",
       "`for` loop",
       "`asyncio.run()`"
      ]
     ]
    },
    {
     "t": "p",
     "text": "Generators produce data lazily; coroutines manage concurrent execution. They share the same suspension mechanism but serve different purposes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is `StopIteration` and how does it work with `return` in generators?",
   "body": [
    {
     "t": "p",
     "text": "`StopIteration` is the exception that signals an iterator has no more values. It is the standard way to end iteration."
    },
    {
     "t": "p",
     "text": "**Normal behavior:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def gen():\n    yield 1\n    yield 2\n    # implicit return None → StopIteration(value=None)\n\ng = gen()\nnext(g)   # 1\nnext(g)   # 2\n# next(g) → StopIteration",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**With explicit `return`:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def gen_return():\n    yield 1\n    return \"all done\"    # StopIteration.value = \"all done\"\n\ng = gen_return()\nnext(g)   # 1\n\ntry:\n    next(g)\nexcept StopIteration as e:\n    print(e.value)   # \"all done\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**How `for` loop handles it:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "for x in gen_return():\n    print(x)   # 1\n# for loop catches StopIteration silently — return value is lost",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**`yield from` captures the return value:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def sub():\n    yield 1\n    yield 2\n    return 42\n\ndef main():\n    result = yield from sub()    # result = 42\n    print(f\"Sub returned: {result}\")\n    yield result\n\nprint(list(main()))\n# Sub returned: 42\n# [1, 2, 42]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Important edge case (PEP 479, Python 3.7+):** Raising `StopIteration` inside a generator is converted to `RuntimeError` to prevent silent bugs:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def bad_gen():\n    raise StopIteration    # RuntimeError in Python 3.7+\n\n# Use return instead to properly terminate a generator\ndef good_gen():\n    return                 # correct way to stop",
     "numbered": false
    }
   ]
  }
 ],
 "takeaways": []
});

/* ============================================================================
   INTERVIEW: ALGORITHMS & QUESTION BANKS i8.3 — Question Bank · Questions 101–191
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i8.3",
 "lede": "**88 interview questions on question bank**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 88 questions on question bank without prompting",
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
   "q": "What is `__new__` vs `__init__`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`__new__`: Creates the instance (allocates memory); called first.",
      "`__init__`: Initializes the instance; called after `__new__`."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Singleton:\n    _instance = None\n    def __new__(cls, *args, **kwargs):\n        if not cls._instance:\n            cls._instance = super().__new__(cls)\n        return cls._instance",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What are Python descriptors?",
   "body": [
    {
     "t": "p",
     "text": "Objects that define `__get__`, `__set__`, or `__delete__` methods, controlling attribute access on other objects:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Validator:\n    def __set_name__(self, owner, name):\n        self.name = name\n    def __get__(self, obj, objtype=None):\n        return obj.__dict__.get(self.name)\n    def __set__(self, obj, value):\n        if not isinstance(value, int):\n            raise TypeError(f\"{self.name} must be int\")\n        obj.__dict__[self.name] = value\n\nclass Foo:\n    bar = Validator()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Properties, classmethods, and staticmethods are all implemented as descriptors."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is `__missing__` in dict subclasses?",
   "body": [
    {
     "t": "p",
     "text": "Called when a key is not found in a `dict` subclass:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class DefaultDict(dict):\n    def __missing__(self, key):\n        self[key] = 0\n        return 0\n\nd = DefaultDict()\nd[\"x\"] += 1  # Works without KeyError",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`collections.defaultdict` uses this mechanism internally."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is the `__call__` method?",
   "body": [
    {
     "t": "p",
     "text": "Makes instances callable like functions:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Multiplier:\n    def __init__(self, factor):\n        self.factor = factor\n    def __call__(self, x):\n        return x * self.factor\n\ntriple = Multiplier(3)\ntriple(5)   # 15",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Useful for stateful callables: caches, rate limiters, partial function equivalents."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is `__enter__` and `__exit__` for context managers?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class Timer:\n    def __enter__(self):\n        self.start = time.time()\n        return self\n    def __exit__(self, exc_type, exc_val, exc_tb):\n        self.elapsed = time.time() - self.start\n        return False  # Don't suppress exceptions\n\nwith Timer() as t:\n    expensive_operation()\nprint(f\"Took {t.elapsed:.3f}s\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`__exit__` receives exception info. Return `True` to suppress exceptions."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is `functools.lru_cache` and how does it work internally?",
   "body": [
    {
     "t": "p",
     "text": "Memoizes function calls — caches results keyed by arguments in an LRU (Least Recently Used) dict:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import lru_cache\n\n@lru_cache(maxsize=128)\ndef fib(n):\n    if n < 2: return n\n    return fib(n-1) + fib(n-2)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`maxsize=None` (or `@cache`) = unlimited cache. Cache must be cleared for unhashable args (lists, dicts don't work)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is `itertools.chain` and `itertools.product`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from itertools import chain, product\n\n# Chain: iterate over multiple iterables as one\nlist(chain([1,2], [3,4], [5]))  # [1, 2, 3, 4, 5]\n\n# Product: Cartesian product\nlist(product(\"AB\", [1,2]))  # [('A',1),('A',2),('B',1),('B',2)]\n\n# Equivalent to nested for loops:\n# [(a,b) for a in \"AB\" for b in [1,2]]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is `collections.Counter` and its most useful methods?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\n\ncounts = Counter(\"abracadabra\")\ncounts.most_common(3)          # [('a', 5), ('b', 2), ('r', 2)]\ncounts + Counter(\"abc\")        # Combine counters\ncounts.subtract(\"ab\")          # Subtract counts",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Counter supports `+`, `-`, `&` (intersection), `|` (union) for combining."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is Python's `heapq` module?",
   "body": [
    {
     "t": "p",
     "text": "Min-heap operations on regular Python lists:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import heapq\n\nheap = []\nheapq.heappush(heap, 5)\nheapq.heappush(heap, 1)\nheapq.heappush(heap, 3)\nheapq.heappop(heap)         # 1 (min)\nheapq.nlargest(2, heap)     # [5, 3]\nheapq.heapify([3,1,4,1,5])  # O(n) in-place heap construction",
     "numbered": false
    },
    {
     "t": "p",
     "text": "For max-heap: negate all values."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is `bisect` and when is it useful?",
   "body": [
    {
     "t": "p",
     "text": "Binary search on sorted lists — O(log n) insertion and lookup:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import bisect\n\nsorted_data = [1, 3, 5, 7, 9]\nbisect.insort(sorted_data, 4)   # [1, 3, 4, 5, 7, 9]\nbisect.bisect_left(sorted_data, 5)   # 3 (index)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Useful for maintaining sorted order during repeated insertions."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is Python's `abc` module and abstract classes?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from abc import ABC, abstractmethod\n\nclass Shape(ABC):\n    @abstractmethod\n    def area(self) -> float: ...\n\n    @abstractmethod\n    def perimeter(self) -> float: ...\n\n    def describe(self):   # Concrete method with default\n        return f\"Area: {self.area()}\"\n\nclass Circle(Shape):\n    def __init__(self, r): self.r = r\n    def area(self): return 3.14159 * self.r**2\n    def perimeter(self): return 2 * 3.14159 * self.r",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Instantiating `Shape()` raises `TypeError`. Forces subclasses to implement abstract methods."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is `typing.Protocol` and structural subtyping?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Protocol\n\nclass Drawable(Protocol):\n    def draw(self) -> None: ...\n\nclass Circle:\n    def draw(self) -> None: print(\"○\")\n\nclass Square:\n    def draw(self) -> None: print(\"□\")\n\ndef render(obj: Drawable) -> None:  # No inheritance needed!\n    obj.draw()\n\nrender(Circle())   # Works — duck typing + type checking",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Unlike ABC, Protocol uses structural subtyping — any class with `draw()` satisfies it."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is `__class_getitem__` and generic classes?",
   "body": [
    {
     "t": "p",
     "text": "Enables `MyClass[T]` syntax for generic classes:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Generic, TypeVar\n\nT = TypeVar(\"T\")\n\nclass Stack(Generic[T]):\n    def __init__(self): self._items: list[T] = []\n    def push(self, item: T) -> None: self._items.append(item)\n    def pop(self) -> T: return self._items.pop()\n\nstack: Stack[int] = Stack()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`Generic[T]` implements `__class_getitem__` automatically."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is `sys.getsizeof` and how do you measure memory usage of Python objects?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nsys.getsizeof([1, 2, 3])   # 88 bytes (list structure only, not elements)\n\n# For deep memory usage:\nimport tracemalloc\ntracemalloc.start()\n# ... code to measure ...\nsnapshot = tracemalloc.take_snapshot()\nstats = snapshot.statistics(\"lineno\")",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Concurrency, Asyncio & Performance (Q121–Q145)"
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is asyncio's event loop?",
   "body": [
    {
     "t": "p",
     "text": "A single-threaded loop that manages and schedules coroutines. It runs one coroutine at a time but can switch between them at `await` points. I/O operations release control back to the loop rather than blocking:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "loop = asyncio.get_event_loop()\nloop.run_until_complete(main())\n# Modern: asyncio.run(main())",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is `asyncio.gather` vs `asyncio.wait`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# gather: run all tasks, return results in order\nresults = await asyncio.gather(task1(), task2(), task3())\n\n# wait: more control — first completed, first cancelled\ndone, pending = await asyncio.wait([t1, t2], return_when=asyncio.FIRST_COMPLETED)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`gather` propagates exceptions immediately; `wait` lets you handle each task individually."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is an asyncio `Queue` and how is it used for producer-consumer?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def producer(q: asyncio.Queue):\n    for i in range(5):\n        await q.put(i)\n        await asyncio.sleep(0.1)\n    await q.put(None)  # Sentinel\n\nasync def consumer(q: asyncio.Queue):\n    while (item := await q.get()) is not None:\n        print(f\"Processing {item}\")\n        q.task_done()\n\nasync def main():\n    q = asyncio.Queue(maxsize=10)\n    await asyncio.gather(producer(q), consumer(q))",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is `asyncio.Semaphore` and why use it?",
   "body": [
    {
     "t": "p",
     "text": "Limits concurrent access to a resource (e.g., limit concurrent HTTP requests):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "sem = asyncio.Semaphore(10)  # Max 10 concurrent\n\nasync def fetch_with_limit(url: str):\n    async with sem:\n        async with aiohttp.ClientSession() as session:\n            async with session.get(url) as resp:\n                return await resp.text()",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is `asyncio.TaskGroup` (Python 3.11+)?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "async def main():\n    async with asyncio.TaskGroup() as tg:\n        t1 = tg.create_task(task1())\n        t2 = tg.create_task(task2())\n    # All tasks complete (or exception propagates) when block exits\n    print(t1.result(), t2.result())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Structured concurrency — all tasks are cleaned up on exit, even on exceptions. Preferred over `gather` in modern Python."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the difference between `threading.Lock` and `asyncio.Lock`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`threading.Lock`: OS-level mutex for threads. Blocks the thread.",
      "`asyncio.Lock`: Coroutine-based. Uses `await` to yield control instead of blocking the thread. Never use `threading.Lock` inside async code and vice versa."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is `concurrent.futures.ProcessPoolExecutor`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from concurrent.futures import ProcessPoolExecutor\nimport os\n\ndef cpu_task(n):\n    return sum(range(n))\n\nwith ProcessPoolExecutor(max_workers=os.cpu_count()) as exe:\n    futures = [exe.submit(cpu_task, 10**7) for _ in range(8)]\n    results = [f.result() for f in futures]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Each worker is a separate process with its own GIL. True parallelism for CPU-bound tasks."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is `multiprocessing.shared_memory`?",
   "body": [
    {
     "t": "p",
     "text": "Zero-copy memory sharing between processes:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from multiprocessing import shared_memory\nimport numpy as np\n\nshm = shared_memory.SharedMemory(create=True, size=1024)\narr = np.ndarray((100,), dtype=np.float64, buffer=shm.buf)\narr[:] = range(100)\n# Other process can attach: existing_shm = shared_memory.SharedMemory(name=shm.name)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is `uvloop` and when should you use it?",
   "body": [
    {
     "t": "p",
     "text": "A drop-in replacement for asyncio's event loop, built on libuv (the same engine as Node.js). 2-4× faster than default asyncio for I/O-heavy applications:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import uvloop\nuvloop.install()  # Sets uvloop as the default event loop policy\nasyncio.run(main())",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is Cython and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "Superset of Python that compiles to C. Type annotations enable C-speed numeric computation:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# example.pyx\ndef sum_c(double[:] arr):\n    cdef int n = arr.shape[0]\n    cdef double total = 0\n    for i in range(n):\n        total += arr[i]\n    return total",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Used in pandas, scikit-learn, SciPy internals for performance-critical paths."
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is Numba and when is it better than Cython?",
   "body": [
    {
     "t": "p",
     "text": "JIT-compiles Python functions to native machine code at runtime using LLVM:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from numba import njit\n\n@njit(parallel=True)\ndef fast_sum(arr):\n    total = 0.0\n    for x in arr:\n        total += x\n    return total",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Easier than Cython (no separate compile step), great for numerical loops. Poor support for non-numeric types."
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "What is `mmap` in Python and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "Memory-mapped files: map a file directly into virtual address space, enabling file access like array access without reading the whole file:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import mmap\nwith open(\"large_file.bin\", \"r+b\") as f:\n    mm = mmap.mmap(f.fileno(), 0)\n    mm[100:200]   # Random access without loading entire file\n    mm.close()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Used for large datasets too big to fit in RAM."
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is `pickle` and its security concern?",
   "body": [
    {
     "t": "p",
     "text": "Python's native serialization protocol — converts any Python object to bytes:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import pickle\nserialized = pickle.dumps(my_object)\nrestored = pickle.loads(serialized)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Security risk:** `pickle.loads` can execute arbitrary code — never unpickle data from untrusted sources. Use JSON or msgpack for untrusted data."
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is `__reduce__` for custom pickle serialization?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class MyClass:\n    def __reduce__(self):\n        return (MyClass, (self.arg1, self.arg2))\n    # (callable, args_tuple) that recreates the object",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Also: `__getstate__` / `__setstate__` for custom state serialization."
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is the `struct` module and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "Pack/unpack C structs for binary data processing:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import struct\npacked = struct.pack(\">IH\", 1234, 56)  # big-endian: unsigned int, unsigned short\nstruct.unpack(\">IH\", packed)           # (1234, 56)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Used for binary file formats, network protocols, embedded systems communication."
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is `contextlib.contextmanager` decorator?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import contextmanager\n\n@contextmanager\ndef temp_file(suffix=\".tmp\"):\n    path = tempfile.mktemp(suffix=suffix)\n    try:\n        yield path\n    finally:\n        if os.path.exists(path):\n            os.remove(path)\n\nwith temp_file(\".json\") as path:\n    write_data(path)\n    process(path)\n# File automatically deleted",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is `contextlib.suppress`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import suppress\n\nwith suppress(FileNotFoundError, PermissionError):\n    os.remove(\"maybe_exists.txt\")\n# No try/except needed",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Useful for cleanup code where certain errors are expected and acceptable."
    }
   ]
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is `contextlib.ExitStack`?",
   "body": [
    {
     "t": "p",
     "text": "Dynamically manage a variable number of context managers:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import ExitStack\n\nwith ExitStack() as stack:\n    files = [stack.enter_context(open(f)) for f in file_list]\n    # All files are properly closed on exit, even on exception",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is the `dis` module and how does it help understand Python performance?",
   "body": [
    {
     "t": "p",
     "text": "Disassembles Python bytecode for analysis:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import dis\ndis.dis(lambda x: x * 2 + 1)\n# Shows LOAD_FAST, BINARY_OP, LOAD_CONST, etc.",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Helps understand why certain code patterns are faster (e.g., local vars faster than globals, list comps faster than loops)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is `__future__` in Python?",
   "body": [
    {
     "t": "p",
     "text": "Enables language features from future Python versions:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from __future__ import annotations  # Postponed evaluation of annotations (PEP 563)\n# All annotations are treated as strings until explicitly evaluated\ndef foo(x: MyClass) -> MyClass: ...  # No circular import issues",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is Python's `weakref` module?",
   "body": [
    {
     "t": "p",
     "text": "Creates weak references to objects that don't prevent garbage collection:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import weakref\nclass Cache:\n    def __init__(self): self.store = weakref.WeakValueDictionary()\n    def set(self, key, value): self.store[key] = value\n    def get(self, key): return self.store.get(key)  # Returns None if collected",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Prevents memory leaks in caches/registries holding references to objects."
    }
   ]
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is `__init_subclass__` in Python?",
   "body": [
    {
     "t": "p",
     "text": "Called when a class is subclassed — enables metaprogramming without metaclasses:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class PluginBase:\n    _registry = {}\n    def __init_subclass__(cls, plugin_name=None, **kwargs):\n        super().__init_subclass__(**kwargs)\n        if plugin_name:\n            PluginBase._registry[plugin_name] = cls\n\nclass MyPlugin(PluginBase, plugin_name=\"my_plugin\"):\n    pass\n\nPluginBase._registry[\"my_plugin\"]  # <class 'MyPlugin'>",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What are Python dataclasses with `field()` and `__post_init__`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from dataclasses import dataclass, field\n\n@dataclass\nclass Config:\n    name: str\n    values: list = field(default_factory=list)   # Mutable default\n    _validated: bool = field(default=False, repr=False, init=False)\n\n    def __post_init__(self):\n        if not self.name:\n            raise ValueError(\"name is required\")\n        self._validated = True",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is `__set_name__` in descriptors?",
   "body": [
    {
     "t": "p",
     "text": "Called when a descriptor is assigned to a class attribute, passing the owning class and attribute name — eliminates the need to manually pass the attribute name:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class TypedField:\n    def __set_name__(self, owner, name):\n        self.name = name   # Automatically gets the attribute name\n    def __set__(self, obj, value):\n        if not isinstance(value, int):\n            raise TypeError(f\"{self.name} must be int\")\n        obj.__dict__[self.name] = value",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is `typing.ParamSpec` and `typing.Concatenate`?",
   "body": [
    {
     "t": "p",
     "text": "Enable precise typing of decorators that preserve the signature of the wrapped function:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import ParamSpec, Callable, TypeVar\n\nP = ParamSpec(\"P\")\nT = TypeVar(\"T\")\n\ndef log_calls(func: Callable[P, T]) -> Callable[P, T]:\n    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:\n        print(f\"Calling {func.__name__}\")\n        return func(*args, **kwargs)\n    return wrapper",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Testing, Design Patterns & Best Practices (Q146–Q165)"
    }
   ]
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is property-based testing with Hypothesis?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from hypothesis import given, strategies as st\n\n@given(st.lists(st.integers()))\ndef test_sort_preserves_length(lst):\n    assert len(sorted(lst)) == len(lst)\n\n@given(st.integers(), st.integers())\ndef test_addition_commutative(a, b):\n    assert a + b == b + a",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Generates hundreds of test cases automatically, finds edge cases humans miss."
    }
   ]
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is pytest's `monkeypatch` fixture?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def test_api_call(monkeypatch):\n    def mock_get(url, **kwargs):\n        return MockResponse(json_data={\"result\": \"ok\"}, status_code=200)\n\n    monkeypatch.setattr(requests, \"get\", mock_get)\n    result = my_api_function()\n    assert result == \"ok\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Temporarily replaces attributes/functions for the duration of a test."
    }
   ]
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is `pytest.raises` and when is it used?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def test_division_by_zero():\n    with pytest.raises(ZeroDivisionError, match=\"division by zero\"):\n        result = 1 / 0\n\ndef test_value_error():\n    with pytest.raises(ValueError) as exc_info:\n        validate_age(-1)\n    assert \"must be positive\" in str(exc_info.value)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What are pytest fixtures with scope?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "@pytest.fixture(scope=\"session\")       # One setup for entire test session\ndef db_connection():\n    conn = create_connection()\n    yield conn\n    conn.close()\n\n@pytest.fixture(scope=\"function\")      # Default: fresh for each test\ndef temp_dir(tmp_path):\n    return tmp_path / \"test_data\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Scopes: `function`, `class`, `module`, `package`, `session`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is `unittest.mock.patch` vs `pytest.monkeypatch`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`unittest.mock.patch`: Decorator/context manager from stdlib. More powerful (return values, side effects, call assertions).",
      "`pytest.monkeypatch`: Simpler fixture-based replacement. Automatically restores state. Use `patch` for complex mocking; `monkeypatch` for simple attribute replacement."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is Python's `__repr__` vs `__str__`?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`__repr__`: Developer-facing, unambiguous representation. Used in REPL and `repr()`. Should ideally be `eval(repr(obj)) == obj`.",
      "`__str__`: User-facing, readable string. Used in `print()` and `str()`. Implement `__repr__` first — if `__str__` is missing, Python falls back to `__repr__`."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What are Python's comparison dunder methods and `functools.total_ordering`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import total_ordering\n\n@total_ordering\nclass Temperature:\n    def __init__(self, celsius): self.celsius = celsius\n    def __eq__(self, other): return self.celsius == other.celsius\n    def __lt__(self, other): return self.celsius < other.celsius\n    # total_ordering fills in: >, >=, <= automatically",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is `os.walk` vs `pathlib.Path.rglob`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# os.walk: yields (dirpath, dirnames, filenames) tuples\nfor root, dirs, files in os.walk(\"src/\"):\n    for f in files:\n        print(os.path.join(root, f))\n\n# pathlib: cleaner, modern\nfor path in Path(\"src/\").rglob(\"*.py\"):\n    print(path)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`pathlib` is preferred for new code — more readable, cross-platform."
    }
   ]
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is Python's `__all__` in modules?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# mymodule.py\n__all__ = [\"PublicClass\", \"public_function\"]  # Only these are exported with *\n\ndef public_function(): ...\ndef _private_function(): ...    # Not in __all__\nclass PublicClass: ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Controls what `from module import *` imports. Does NOT prevent explicit imports."
    }
   ]
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is a namespace package (PEP 420)?",
   "body": [
    {
     "t": "p",
     "text": "Packages that span multiple directories without requiring `__init__.py`. Enables: distributed packages, extending third-party namespaces:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "company/    # No __init__.py needed\n    team_a/\n        feature/\n    team_b/\n        feature/",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Both can be imported as `company.team_a.feature` from different install locations."
    }
   ]
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is `sys.path` manipulation and why should you avoid it?",
   "body": [
    {
     "t": "p",
     "text": "`sys.path` is the module search path list. Modifying it at runtime can cause import confusion, module shadowing, and makes code not portable. Prefer virtual environments, proper package installation, or `PYTHONPATH` env var."
    }
   ]
  },
  {
   "t": "drill",
   "n": "51",
   "q": "What is a Python virtual environment and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "Creates an isolated Python environment with its own packages:"
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "python -m venv myenv\nsource myenv/bin/activate   # Linux/Mac\nmyenv\\Scripts\\activate      # Windows\npip install requests",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Internally: creates a copy/symlink of Python binary, separate `site-packages`, `pyvenv.cfg` configuration."
    }
   ]
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What is `pyproject.toml` and modern Python packaging?",
   "body": [
    {
     "t": "p",
     "text": "The modern standard (PEP 517/518) for project configuration:"
    },
    {
     "t": "code",
     "lang": "toml",
     "code": "[build-system]\nrequires = [\"hatchling\"]\nbuild-backend = \"hatchling.build\"\n\n[project]\nname = \"mypackage\"\nversion = \"1.0.0\"\ndependencies = [\"requests>=2.28\", \"pydantic>=2.0\"]\n\n[project.scripts]\nmycli = \"mypackage.cli:main\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Replaces `setup.py`, `setup.cfg`. Build backends: hatchling, flit, setuptools, maturin."
    }
   ]
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What are Python type narrowing techniques?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Union\n\ndef process(value: Union[str, int]) -> str:\n    if isinstance(value, str):       # Narrowed to str in this branch\n        return value.upper()\n    else:                            # Narrowed to int here\n        return str(value * 2)\n\n# TypeGuard for custom narrowing:\nfrom typing import TypeGuard\n\ndef is_list_of_str(val: list) -> TypeGuard[list[str]]:\n    return all(isinstance(x, str) for x in val)",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Python for Data Science & AI (Q166–Q200)"
    }
   ]
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is Python's `array` module vs NumPy arrays?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`array.array`: Typed array, homogeneous C-type data, lower memory than list. No vectorized ops.",
      "NumPy: Full ND-array with vectorized operations, broadcasting, BLAS integration. Use `array` for simple typed sequences without NumPy; NumPy for all scientific computing."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What is `__array_ufunc__` in NumPy integration?",
   "body": [
    {
     "t": "p",
     "text": "Allows custom objects to handle NumPy universal functions:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class MyArray:\n    def __array_ufunc__(self, ufunc, method, *inputs, **kwargs):\n        inputs = [i.data if isinstance(i, MyArray) else i for i in inputs]\n        return MyArray(ufunc(*inputs, **kwargs))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Used by pandas, CuPy, PyTorch to intercept NumPy operations."
    }
   ]
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is Python's `struct.pack` format string and binary protocol handling?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import struct\n# Format: endianness + type codes\n# > = big-endian, < = little-endian\n# I = unsigned int (4 bytes), H = unsigned short (2 bytes), f = float (4 bytes)\nheader = struct.pack(\">IHf\", message_id, version, value)\nm_id, ver, val = struct.unpack(\">IHf\", header)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Used in network protocol parsers, binary file readers."
    }
   ]
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is `asyncio.to_thread` and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "Run a blocking (synchronous) function in a thread pool without blocking the event loop:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def main():\n    # Run blocking I/O in thread without blocking event loop\n    result = await asyncio.to_thread(blocking_db_call, query)\n    return result",
     "numbered": false
    },
    {
     "t": "p",
     "text": "For libraries that don't have async APIs (older DB drivers, synchronous ML models)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is `logging.getLogger` vs print for production code?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import logging\n\nlogger = logging.getLogger(__name__)\n\nlogger.info(\"Processing batch %d\", batch_id)\nlogger.error(\"Failed to process: %s\", error, exc_info=True)\n\n# Configure once at startup:\nlogging.basicConfig(level=logging.INFO, format=\"%(asctime)s %(name)s %(levelname)s %(message)s\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Logging enables: severity filtering, log routing, structured output, without code changes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is structured logging with `structlog`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import structlog\n\nlog = structlog.get_logger()\nlog.info(\"request.completed\", user_id=user.id, duration_ms=150, status=200)\n# Outputs: {\"event\": \"request.completed\", \"user_id\": 42, \"duration_ms\": 150, \"status\": 200}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Structured logs are parseable by ELK/CloudWatch/Datadog — far more useful in production than string messages."
    }
   ]
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is Python's `traceback` module?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import traceback\n\ntry:\n    risky_operation()\nexcept Exception:\n    # Get traceback as string\n    tb_str = traceback.format_exc()\n    logger.error(\"Unexpected error:\\n%s\", tb_str)\n    # Or extract specific info:\n    tb = traceback.extract_tb(sys.exc_info()[2])\n    for frame in tb:\n        print(f\"{frame.filename}:{frame.lineno} in {frame.name}\")",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What is Python's `subprocess` module and the `subprocess.run` vs `Popen`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import subprocess\n\n# Simple one-shot: blocks until complete\nresult = subprocess.run([\"git\", \"log\", \"--oneline\", \"-n\", \"5\"], capture_output=True, text=True)\nprint(result.stdout)\n\n# Streaming output: Popen\nwith subprocess.Popen([\"tail\", \"-f\", \"log.txt\"], stdout=subprocess.PIPE, text=True) as proc:\n    for line in proc.stdout:\n        process(line)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is Python's `pathlib` and why is it preferred over `os.path`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from pathlib import Path\n\np = Path(\"/data/files/report.csv\")\np.parent          # /data/files\np.stem            # report\np.suffix          # .csv\np.with_suffix(\".json\")   # /data/files/report.json\n(p.parent / \"backups\" / p.name).mkdir(parents=True, exist_ok=True)\np.read_text()\np.write_bytes(b\"data\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Object-oriented, readable, cross-platform (handles / vs \\ automatically)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is `io.StringIO` and `io.BytesIO`?",
   "body": [
    {
     "t": "p",
     "text": "In-memory file-like objects — avoid creating actual files for intermediate data:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import io\n\n# Use StringIO as a file for CSV output\noutput = io.StringIO()\nwriter = csv.writer(output)\nwriter.writerows(data)\ncsv_string = output.getvalue()\n\n# Use BytesIO for image/binary processing\nimg_bytes = io.BytesIO()\npil_image.save(img_bytes, format=\"PNG\")\nimg_bytes.seek(0)\nupload_to_s3(img_bytes)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is `json.loads` vs `json.load` and `json.dumps` vs `json.dump`?",
   "terms": [
    "string",
    "file object"
   ],
   "body": [
    {
     "t": "ul",
     "items": [
      "`loads(s)`: Parse JSON from **string**.",
      "`load(fp)`: Parse JSON from **file object**.",
      "`dumps(obj)`: Serialize to **string**.",
      "`dump(obj, fp)`: Serialize to **file object**."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "data = json.loads('{\"key\": \"value\"}')   # From string\njson.dump(data, open(\"out.json\", \"w\"), indent=2, ensure_ascii=False)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What are Python's `@property`, `@getter`, `@property.setter`, `@property.deleter`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class Circle:\n    def __init__(self, radius): self._radius = radius\n\n    @property\n    def radius(self): return self._radius\n\n    @radius.setter\n    def radius(self, value):\n        if value < 0: raise ValueError(\"Radius cannot be negative\")\n        self._radius = value\n\n    @property\n    def area(self): return 3.14159 * self._radius ** 2  # Read-only",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is `__format__` and custom format specifications?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class Money:\n    def __init__(self, amount, currency=\"USD\"):\n        self.amount = amount\n        self.currency = currency\n\n    def __format__(self, format_spec):\n        if format_spec == \"f\":\n            return f\"{self.currency} {self.amount:.2f}\"\n        return f\"{self.amount}\"\n\nm = Money(42.5, \"EUR\")\nf\"{m:f}\"   # \"EUR 42.50\"",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is `zlib`/`gzip`/`lzma` compression in Python?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import gzip\n# Write compressed\nwith gzip.open(\"data.json.gz\", \"wt\", encoding=\"utf-8\") as f:\n    json.dump(large_dict, f)\n\n# Read compressed\nwith gzip.open(\"data.json.gz\", \"rt\") as f:\n    data = json.load(f)\n\n# In-memory compression\nimport zlib\ncompressed = zlib.compress(data_bytes, level=6)  # level 1-9\noriginal = zlib.decompress(compressed)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is Python's `re` module and key regex patterns for data science?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import re\n\n# Extract IP addresses\nips = re.findall(r\"\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b\", log_text)\n\n# Parse timestamps\npattern = re.compile(r\"(\\d{4}-\\d{2}-\\d{2})\\s(\\d{2}:\\d{2}:\\d{2})\")\nmatch = pattern.search(log_line)\ndate, time = match.group(1), match.group(2)\n\n# Non-greedy, lookahead, named groups\nmatch = re.search(r\"(?P<year>\\d{4})-(?P<month>\\d{2})\", text)\nmatch.group(\"year\")  # \"2024\"",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is Python's `enum` module?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from enum import Enum, auto, Flag\n\nclass Color(Enum):\n    RED = auto()    # 1\n    GREEN = auto()  # 2\n    BLUE = auto()   # 3\n\n    def is_primary(self):\n        return self in (Color.RED, Color.GREEN, Color.BLUE)\n\nclass Permission(Flag):\n    READ = auto()\n    WRITE = auto()\n    EXECUTE = auto()\n    ALL = READ | WRITE | EXECUTE\n\nperm = Permission.READ | Permission.WRITE\nPermission.WRITE in perm  # True",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is Python's `datetime` and `zoneinfo` (Python 3.9+)?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from datetime import datetime, timezone\nfrom zoneinfo import ZoneInfo\n\n# Timezone-aware datetime\nnow_utc = datetime.now(timezone.utc)\nnow_tokyo = now_utc.astimezone(ZoneInfo(\"Asia/Tokyo\"))\nnow_nyc = now_utc.astimezone(ZoneInfo(\"America/New_York\"))\n\n# Parse ISO 8601\ndt = datetime.fromisoformat(\"2024-01-15T10:30:00+05:30\")",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What are `match` statements (PEP 634) and structural pattern matching?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def handle_command(command: dict):\n    match command:\n        case {\"action\": \"create\", \"name\": name}:\n            create(name)\n        case {\"action\": \"delete\", \"id\": int(id_)} if id_ > 0:\n            delete(id_)\n        case {\"action\": action}:\n            raise ValueError(f\"Unknown action: {action}\")\n        case _:\n            raise ValueError(\"Invalid command format\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Works with: literals, class patterns, sequence patterns, mapping patterns, guards."
    }
   ]
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is Python's `__init__.py` and lazy imports?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# package/__init__.py\n# Lazy import: only import when attribute is accessed\ndef __getattr__(name):\n    if name == \"heavy_module\":\n        import package.heavy_module as m\n        globals()[name] = m\n        return m\n    raise AttributeError(f\"module has no attribute {name}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Reduces package import time — defers heavy imports until actually needed."
    }
   ]
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is `typing.TypeVar` with bounds and constraints?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import TypeVar\n\n# Bounded: T must be a subtype of int\nT = TypeVar(\"T\", bound=int)\n\n# Constrained: T must be exactly int or str (no subtype)\nS = TypeVar(\"S\", int, str)\n\ndef first_item(items: list[T]) -> T:\n    return items[0]\n\nfirst_item([1, 2, 3])     # T = int, return type int\nfirst_item([\"a\", \"b\"])    # Type error with bounded TypeVar",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is `typing.Literal`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Literal\n\ndef set_direction(direction: Literal[\"north\", \"south\", \"east\", \"west\"]) -> None: ...\n\n# Narrower than str — prevents invalid values at type-check time\nset_direction(\"north\")   # OK\nset_direction(\"up\")      # Type error in mypy/pyright",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is `typing.TypedDict` for typed dictionaries?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import TypedDict, Required, NotRequired\n\nclass UserProfile(TypedDict):\n    id: Required[int]\n    name: Required[str]\n    email: NotRequired[str]    # Optional field\n\ndef process_user(user: UserProfile) -> None:\n    print(user[\"name\"])        # Type-safe access\n\nprocess_user({\"id\": 1, \"name\": \"Alice\"})  # Valid",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "76",
   "q": "What is `typing.Annotated`?",
   "body": [
    {
     "t": "p",
     "text": "Attach arbitrary metadata to type hints (used by Pydantic, FastAPI, LangGraph for validation/injection):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Annotated\nfrom pydantic import Field\n\nclass Model(BaseModel):\n    age: Annotated[int, Field(ge=0, le=150)]   # 0 ≤ age ≤ 150\n    name: Annotated[str, Field(min_length=1)]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is Python's `__debug__` flag and `assert`?",
   "body": [
    {
     "t": "p",
     "text": "`assert` statements are compiled out when Python runs with `-O` optimization flag (when `__debug__ == False`):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def process(arr: list):\n    assert len(arr) > 0, \"Array must not be empty\"  # Removed in -O mode\n    return arr[0]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Never use `assert` for production data validation — use explicit `if/raise` instead."
    }
   ]
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is `sys.argv` vs `argparse` vs `click`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# argparse: stdlib, verbose but powerful\nimport argparse\nparser = argparse.ArgumentParser()\nparser.add_argument(\"--lr\", type=float, default=0.001)\nargs = parser.parse_args()\n\n# click: decorator-based, much cleaner\nimport click\n@click.command()\n@click.option(\"--lr\", default=0.001, help=\"Learning rate\")\ndef train(lr: float):\n    ...",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is Python's `__file__` and package path resolution?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from pathlib import Path\n\n# Get the directory of the current script\nBASE_DIR = Path(__file__).parent\n\n# Load a file relative to the package\nconfig_path = BASE_DIR / \"config\" / \"default.yaml\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Essential for loading resources in packages that can be installed anywhere."
    }
   ]
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is `sys.exit` vs `raise SystemExit`?",
   "body": [
    {
     "t": "p",
     "text": "`sys.exit(code)` is equivalent to `raise SystemExit(code)`. Both trigger `finally` blocks and context manager `__exit__`. Exit code 0 = success, non-zero = error. `atexit` handlers run before exit."
    }
   ]
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is Python's `inspect` module?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import inspect\n\ndef add(a: int, b: int) -> int: return a + b\n\nsig = inspect.signature(add)\nparams = sig.parameters          # OrderedDict of parameters\nsrc = inspect.getsource(add)     # Source code as string\ninspect.isfunction(add)          # True\ninspect.iscoroutinefunction(add) # False",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Used by frameworks (FastAPI, LangChain) to introspect function signatures for automatic dependency injection."
    }
   ]
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is Python's `ast` module?",
   "body": [
    {
     "t": "p",
     "text": "Parse and manipulate Python source code as an Abstract Syntax Tree:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import ast\n\ntree = ast.parse(\"x = 1 + 2\")\nprint(ast.dump(tree, indent=2))\n\n# Code analysis: find all function calls\nclass CallVisitor(ast.NodeVisitor):\n    def visit_Call(self, node):\n        if isinstance(node.func, ast.Name):\n            print(f\"Call: {node.func.id}\")\n        self.generic_visit(node)\n\nCallVisitor().visit(tree)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Used in linters (flake8, pylint), type checkers, code transformers."
    }
   ]
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is `copy.copy()` vs `copy.deepcopy()`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import copy\n\noriginal = [[1, 2], [3, 4]]\nshallow = copy.copy(original)        # Copies outer list, shares inner refs\ndeep = copy.deepcopy(original)       # Copies everything recursively\n\nshallow[0].append(99)\nprint(original)   # [[1, 2, 99], [3, 4]] — shallow copy affected original!\ndeep[0].append(99)\nprint(original)   # [[1, 2, 99], [3, 4]] — deep copy is independent",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is `pickle` vs `json` vs `msgpack` vs `parquet` for data serialization?",
   "body": [
    {
     "t": "table",
     "head": [
      "Format",
      "Speed",
      "Size",
      "Human-readable",
      "Languages",
      "Best for"
     ],
     "rows": [
      [
       "pickle",
       "Fast",
       "Medium",
       "No",
       "Python only",
       "Python objects"
      ],
      [
       "json",
       "Medium",
       "Large",
       "Yes",
       "Universal",
       "APIs, config"
      ],
      [
       "msgpack",
       "Very fast",
       "Small",
       "No",
       "Universal",
       "High-perf IPC"
      ],
      [
       "parquet",
       "Medium",
       "Very small",
       "No",
       "Universal",
       "Columnar analytics"
      ]
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is Python's `with` statement and multiple context managers?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Multiple on one line (Python 3.10+)\nwith open(\"in.txt\") as fin, open(\"out.txt\", \"w\") as fout:\n    fout.write(fin.read().upper())\n\n# Parenthesized (Python 3.10+)\nwith (\n    open(\"file1.txt\") as f1,\n    open(\"file2.txt\") as f2,\n    lock\n):\n    ...",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is PEP 8 and which tools enforce it?",
   "body": [
    {
     "t": "p",
     "text": "Python's official style guide: 4-space indent, max 79/99 line length, snake_case for functions/variables, PascalCase for classes, UPPER_CASE for constants. Tools: - `flake8` / `ruff`: Linting. - `black`: Opinionated auto-formatter. - `isort` / `ruff`: Import sorting. - `mypy` / `pyright`: Type checking."
    }
   ]
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is a Python project's typical folder structure?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "myproject/\n├── src/\n│   └── mypackage/\n│       ├── __init__.py\n│       ├── core.py\n│       └── utils.py\n├── tests/\n│   ├── __init__.py\n│   ├── test_core.py\n│   └── conftest.py\n├── docs/\n├── pyproject.toml\n├── README.md\n└── .github/workflows/ci.yml",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`src/` layout prevents accidentally importing from the dev directory instead of the installed package."
    }
   ]
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What are Python's best practices for writing production-grade code?",
   "body": [
    {
     "t": "ul",
     "items": [
      "Type annotations everywhere + `mypy --strict`.",
      "Pydantic for all data validation at boundaries.",
      "Logging over print; structured logs in production.",
      "`pathlib` for all path operations.",
      "Async I/O for all network/disk operations.",
      "`pytest` with fixtures, `hypothesis` for property tests.",
      "`black + ruff + isort` in pre-commit hooks.",
      "`pyproject.toml` with pinned dependencies.",
      "Explicit error handling — no bare `except:`.",
      "Document with docstrings (Google or NumPy style)."
     ]
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "*Last Updated: April 2026* *Topic: Python Interview Questions*"
    }
   ]
  }
 ],
 "takeaways": []
});

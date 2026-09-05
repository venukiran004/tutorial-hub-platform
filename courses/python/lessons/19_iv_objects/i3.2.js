/* ============================================================================
   INTERVIEW: OBJECTS & INTERNALS i3.2 — Concurrency: Asyncio, Threading & Multiprocessing
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i3.2",
 "lede": "**41 interview questions on concurrency: asyncio, threading & multiprocessing**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 41 questions on concurrency: asyncio, threading & multiprocessing without prompting",
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
   "q": "What is the difference between concurrency and parallelism?",
   "terms": [
    "Answer",
    "Concurrency",
    "Parallelism",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Concurrency** is *dealing with* many tasks at once by interleaving them — they make progress in overlapping time periods, even on a single core.",
      "**Parallelism** is *doing* many tasks at the same instant on multiple cores."
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Threading        -> concurrency (GIL blocks parallel bytecode)\nAsyncio          -> concurrency (single thread, cooperative)\nMultiprocessing  -> parallelism (separate processes on separate cores)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** All parallelism is concurrency, but not all concurrency is parallel. In CPython, only `multiprocessing` (or C extensions) gives true CPU parallelism."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the GIL and why does it exist?",
   "terms": [
    "Answer",
    "Global Interpreter Lock",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "The **Global Interpreter Lock** is a mutex in CPython that lets **only one thread execute Python bytecode at a time**. It exists because CPython's memory management (reference counting) is not thread-safe; the GIL makes single-threaded code fast and simple."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nprint(sys.getswitchinterval())   # 0.005 — GIL handoff interval (5 ms)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The GIL simplifies CPython internals at the cost of multi-core Python bytecode parallelism. It is a CPython implementation detail (Jython/IronPython have none)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "How does the GIL affect CPU-bound vs I/O-bound threads?",
   "terms": [
    "Answer",
    "CPU-bound + threads",
    "I/O-bound + threads",
    "releases the GIL",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**CPU-bound + threads:** no speedup — threads fight over the GIL and effectively run serially.",
      "**I/O-bound + threads:** big speedup — a thread **releases the GIL** while waiting on `sleep`, sockets, or disk, letting others run."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import time\nfrom concurrent.futures import ThreadPoolExecutor\n\ndef cpu(n): \n    return sum(i*i for i in range(n))\n\ndef io(s): \n    time.sleep(s); return s\n\n# 4 CPU tasks via threads -> ~ same wall time as running them one by one\n# 4 I/O tasks via threads -> ~ 1x the duration of a single task (overlap)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Threads help I/O-bound work (GIL released during waits) but not CPU-bound work (GIL serializes bytecode). For CPU work, use processes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "When should you use threading vs multiprocessing vs asyncio?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Workload",
      "Use"
     ],
     "rows": [
      [
       "I/O-bound, modest concurrency",
       "`threading` / `ThreadPoolExecutor`"
      ],
      [
       "I/O-bound, thousands of connections",
       "`asyncio`"
      ],
      [
       "CPU-bound",
       "`multiprocessing` / `ProcessPoolExecutor`"
      ],
      [
       "CPU-bound with NumPy/Pandas",
       "often already parallel (releases GIL)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Threads for blocking I/O, processes for CPU parallelism, asyncio for massive lightweight I/O concurrency. Match the model to whether the bottleneck is I/O or CPU."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is a race condition? Show one and fix it.",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A race condition is when the result depends on the unpredictable interleaving of threads accessing shared mutable state. `counter += 1` is read-modify-write (multiple bytecodes), so updates get lost."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\n\ncounter = 0\nlock = threading.Lock()\n\ndef bump():\n    global counter\n    for _ in range(100_000):\n        with lock:               # serialize the critical section\n            counter += 1\n\nts = [threading.Thread(target=bump) for _ in range(5)]\nfor t in ts: t.start()\nfor t in ts: t.join()\nprint(counter)                   # 500000 (without the lock: usually less)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Any non-atomic update to shared state needs synchronization (a `Lock`) or you'll silently lose updates."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is the difference between `Lock` and `RLock`?",
   "terms": [
    "Answer",
    "same",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A `Lock` can be acquired once; if the **same** thread tries to acquire it again it deadlocks. An `RLock` (reentrant lock) can be re-acquired by the owning thread (it tracks ownership and a recursion count)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\n\nlock = threading.Lock()\nlock.acquire()\n# lock.acquire()   # DEADLOCK — same thread blocks on itself\n\nrlock = threading.RLock()\nrlock.acquire(); rlock.acquire()   # fine — must release twice\nrlock.release(); rlock.release()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `RLock` when a lock-holding method calls another method that needs the same lock (e.g., `transfer` calling `deposit`)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Compare Event, Semaphore, Condition, and Barrier.",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Primitive",
      "Use"
     ],
     "rows": [
      [
       "`Event`",
       "broadcast a one-shot flag to many waiters (`set`/`wait`)"
      ],
      [
       "`Semaphore(n)`",
       "allow at most `n` concurrent holders"
      ],
      [
       "`Condition`",
       "wait until a predicate becomes true (`wait`/`notify`)"
      ],
      [
       "`Barrier(n)`",
       "make `n` threads rendezvous before any continues"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\nevent = threading.Event()       # event.wait() blocks until event.set()\nsem = threading.Semaphore(2)    # with sem: at most 2 inside\nbarrier = threading.Barrier(3)  # barrier.wait() until 3 arrive",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `Event` for signaling, `Semaphore` for limiting concurrency, `Condition` for predicate-based waiting (producer/consumer), `Barrier` for phase synchronization."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Why is `queue.Queue` preferred for communicating between threads?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`queue.Queue` is thread-safe internally (locks handled for you), so you avoid manual locking and many race conditions. It's the backbone of the producer/consumer pattern."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\nfrom queue import Queue\n\ndef producer(q):\n    for i in range(5): q.put(i)\n    q.put(None)                  # sentinel\n\ndef consumer(q, out):\n    while (item := q.get()) is not None:\n        out.append(item)\n\nq, out = Queue(), []\nthreading.Thread(target=producer, args=(q,)).start()\nc = threading.Thread(target=consumer, args=(q, out)); c.start(); c.join()\nprint(out)                       # [0, 1, 2, 3, 4]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Prefer passing data through a `Queue` over sharing mutable objects with manual locks. `task_done()`/`join()` let producers wait for all items to be processed."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How does `multiprocessing` bypass the GIL? What's the catch?",
   "terms": [
    "Answer",
    "own",
    "pickled",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Each process has its **own** Python interpreter and GIL, so processes run bytecode on different cores in parallel. The catch: no shared memory by default — arguments and results are **pickled** across the process boundary, and process startup is expensive."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from concurrent.futures import ProcessPoolExecutor\n\ndef heavy(chunk):\n    return sum(x*x for x in chunk)\n\nif __name__ == \"__main__\":\n    with ProcessPoolExecutor() as ex:\n        print(sum(ex.map(heavy, [range(1000) for _ in range(8)])))",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Processes give true parallelism but at the cost of memory, IPC/pickling overhead, and the `if __name__ == \"__main__\":` requirement. Use only when computation dominates that overhead."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Why is `if __name__ == \"__main__\":` required with multiprocessing?",
   "terms": [
    "Answer",
    "spawn",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "On Windows and macOS the default start method is **spawn**: a new process re-imports your module to recreate the target. Without the guard, module-level code that starts processes runs again on import — causing infinite recursive process creation."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from multiprocessing import Process\n\ndef work(): ...\n\nif __name__ == \"__main__\":       # guard prevents re-execution on import\n    Process(target=work).start()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Guard the entry point so the re-import done by `spawn` doesn't relaunch your process-spawning code."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "How do you share state between processes?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Since memory isn't shared, use explicit shared objects:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from multiprocessing import Value, Array, Queue, Manager\n\ncounter = Value('i', 0)             # shared int (with .get_lock())\narr = Array('d', [1.0, 2.0])        # shared array\nq = Queue()                         # cross-process message queue\nmgr = Manager(); shared = mgr.dict()  # proxy dict/list",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `Value`/`Array` for simple shared scalars/arrays, `Queue`/`Pipe` for messages, and `Manager` for higher-level shared `dict`/`list` proxies (slower, via a server process)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is `concurrent.futures` and why prefer it?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "It provides a single high-level API — `ThreadPoolExecutor` and `ProcessPoolExecutor` — over both concurrency models. You submit work and get `Future` objects, with automatic pool management."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from concurrent.futures import ThreadPoolExecutor\n\nwith ThreadPoolExecutor(max_workers=4) as ex:\n    results = list(ex.map(str.upper, [\"a\", \"b\", \"c\"]))\nprint(results)                   # ['A', 'B', 'C']",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Prefer `concurrent.futures` over raw `Thread`/`Process` for pool work — you can switch threads↔processes by changing one class name."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is a `Future`? What does `.result()` do with exceptions?",
   "terms": [
    "Answer",
    "re-raises",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A `Future` represents a computation that may not be finished yet. `.result()` blocks until done and **re-raises** any exception the worker raised; you can also pass a timeout."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from concurrent.futures import ThreadPoolExecutor\n\ndef boom(): raise ValueError(\"nope\")\n\nwith ThreadPoolExecutor() as ex:\n    fut = ex.submit(boom)\n    print(fut.done())            # likely False then True\n    try:\n        fut.result()\n    except ValueError as e:\n        print(\"caught:\", e)      # caught: nope",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Exceptions in workers are captured and surfaced when you call `.result()` (or via `.exception()`). They don't crash the pool silently."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Difference between `executor.map` and `submit` + `as_completed`?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from concurrent.futures import ThreadPoolExecutor, as_completed\n\nwith ThreadPoolExecutor() as ex:\n    # map: results in INPUT order, re-raises first exception on iteration\n    ordered = list(ex.map(lambda n: n*n, range(5)))\n\n    # submit + as_completed: results in COMPLETION order, per-task errors\n    futs = [ex.submit(lambda n: n*n, i) for i in range(5)]\n    for f in as_completed(futs):\n        print(f.result())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `map` for ordered results and simplicity; use `submit`/`as_completed` when you want results as soon as they finish or need to handle each task's exception independently."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How do you set a timeout or cancel a task in `concurrent.futures`?",
   "terms": [
    "Answer",
    "Key takeaway",
    "not"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from concurrent.futures import ThreadPoolExecutor, TimeoutError\nimport time\n\nwith ThreadPoolExecutor() as ex:\n    fut = ex.submit(lambda: (time.sleep(1), \"done\")[1])\n    try:\n        fut.result(timeout=0.01)\n    except TimeoutError:\n        print(\"timed out\")\n    print(fut.cancel())          # False — can't cancel a running task",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `result(timeout=...)` raises `TimeoutError` but does **not** stop the worker; `cancel()` only works if the task hasn't started running yet."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is asyncio and how does the event loop work?",
   "terms": [
    "Answer",
    "event loop",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`asyncio` is single-threaded cooperative concurrency. An **event loop** runs coroutines; at each `await`, the running coroutine suspends and the loop schedules another ready task. There's no preemption — tasks yield voluntarily."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def main():\n    await asyncio.sleep(1)       # yields control to the loop\n    print(\"done\")\n\nasyncio.run(main())              # builds a loop, runs main, closes the loop",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** One thread, many coroutines cooperating via `await`. Excellent for high-volume I/O without thread overhead — but a blocking call freezes everything."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the difference between a coroutine, a Task, and a Future in asyncio?",
   "terms": [
    "Answer",
    "Coroutine",
    "Task",
    "Future",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Coroutine**the object from calling an `async def` function; does nothing until awaited/scheduled.",
      "**Task**a coroutine wrapped and scheduled to run concurrently (`asyncio.create_task`).",
      "**Future**a low-level awaitable representing an eventual result; Tasks are a Future subclass."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def work(): \n    return 42\n\nasync def main():\n    coro = work()                       # coroutine (not running yet)\n    task = asyncio.create_task(coro)    # scheduled to run\n    print(await task)                   # 42\n\nasyncio.run(main())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Calling a coroutine doesn't run it; wrap it in a Task (or `gather`) to make it run concurrently."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What does `await` actually do?",
   "terms": [
    "Answer",
    "yielding control to the event loop",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`await` suspends the current coroutine until the awaited awaitable completes, **yielding control to the event loop** so other tasks can run in the meantime."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def main():\n    result = await asyncio.sleep(1, result=\"hi\")   # suspend ~1s, loop runs others\n    print(result)                                  # hi\n\nasyncio.run(main())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `await` is the cooperative yield point. You can only use it inside `async def`. Without `await`s, async code can't interleave."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How do you run multiple coroutines concurrently with `gather`?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def work(n):\n    await asyncio.sleep(1)\n    return n\n\nasync def main():\n    results = await asyncio.gather(work(1), work(2), work(3))\n    print(results)               # [1, 2, 3] after ~1s (not 3s)\n\nasyncio.run(main())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`gather(..., return_exceptions=True)` returns exceptions as results instead of propagating the first failure."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `gather` schedules all coroutines concurrently and returns results in argument order; total time ≈ the slowest one, not the sum."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is `asyncio.TaskGroup` and why prefer it over `gather` (3.11+)?",
   "terms": [
    "Answer",
    "structured concurrency",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`TaskGroup` provides **structured concurrency**: all tasks created inside the `async with` block are awaited at exit, and if any task fails, the rest are cancelled and errors surface as an `ExceptionGroup`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def main():\n    async with asyncio.TaskGroup() as tg:\n        t1 = tg.create_task(asyncio.sleep(1, result=\"a\"))\n        t2 = tg.create_task(asyncio.sleep(1, result=\"b\"))\n    print(t1.result(), t2.result())   # a b\n\nasyncio.run(main())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `TaskGroup` gives cleaner lifecycle and error handling (auto-cancel siblings on failure) than `gather`. Prefer it for new code on Python 3.11+."
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "How do you implement timeouts in asyncio?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def slow():\n    await asyncio.sleep(10)\n\nasync def main():\n    try:\n        await asyncio.wait_for(slow(), timeout=1)     # all versions\n    except asyncio.TimeoutError:\n        print(\"timeout\")\n\n    try:\n        async with asyncio.timeout(1):                # Python 3.11+\n            await slow()\n    except asyncio.TimeoutError:\n        print(\"timeout again\")\n\nasyncio.run(main())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `asyncio.wait_for` (wraps a single awaitable) or the `asyncio.timeout()` context manager (3.11+) to cancel work that overruns. The cancelled coroutine receives `CancelledError`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "How do you limit concurrency in asyncio?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Use `asyncio.Semaphore` to cap how many coroutines run the guarded section simultaneously — essential to avoid exhausting sockets/file handles."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nsem = asyncio.Semaphore(5)\n\nasync def fetch(url):\n    async with sem:                  # at most 5 concurrent\n        await asyncio.sleep(0.5)\n        return url\n\nasync def main():\n    await asyncio.gather(*(fetch(f\"u{i}\") for i in range(100)))\n\nasyncio.run(main())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `gather`-ing thousands of tasks without bounds can crash; a `Semaphore` keeps in-flight work to a safe limit."
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What are async generators and async iterators?",
   "terms": [
    "Answer",
    "async generator",
    "async iterator",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "An **async generator** is an `async def` with `yield`, iterated via `async for`. An **async iterator** implements `__aiter__`/`__anext__`, raising `StopAsyncIteration` to stop."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def gen(n):\n    for i in range(n):\n        await asyncio.sleep(0.05)\n        yield i\n\nasync def main():\n    print([x async for x in gen(3)])     # [0, 1, 2]\n\nasyncio.run(main())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Async generators let you stream data with `await` between items (e.g., paginated APIs, chunked downloads), consumed with `async for`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What happens if you run blocking code inside an async function?",
   "terms": [
    "Answer",
    "stalls the entire event loop",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A blocking call (e.g., `time.sleep`, a sync DB driver, heavy CPU) **stalls the entire event loop** — every other task is frozen until it returns."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio, time\n\nasync def bad():\n    time.sleep(5)                # BLOCKS the whole loop\n\nasync def good():\n    await asyncio.to_thread(time.sleep, 5)   # offload to a worker thread",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Never block the loop. Offload blocking I/O with `asyncio.to_thread` (or `loop.run_in_executor`), and CPU-bound work to a `ProcessPoolExecutor`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "How do you mix asyncio with CPU-bound work?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Run the CPU work in a process pool via `run_in_executor`, awaiting the result so the loop stays responsive."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\nfrom concurrent.futures import ProcessPoolExecutor\n\ndef crunch(n):\n    return sum(i*i for i in range(n))\n\nasync def main():\n    loop = asyncio.get_running_loop()\n    with ProcessPoolExecutor() as pool:\n        result = await loop.run_in_executor(pool, crunch, 10_000_000)\n    print(result)\n\nasyncio.run(main())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** asyncio doesn't help CPU-bound work by itself; pair it with a `ProcessPoolExecutor` for parallel computation while keeping the loop free."
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "What is a deadlock and how do you avoid it?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A deadlock occurs when threads wait on each other's locks forever — classically when two threads acquire two locks in opposite orders."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\na, b = threading.Lock(), threading.Lock()\n# T1: with a: with b: ...\n# T2: with b: with a: ...   <- circular wait -> deadlock",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Prevent deadlock by always acquiring locks in a consistent global order, using timeouts on `acquire()`, holding locks briefly, or avoiding nested locks altogether."
    },
    {
     "t": "disclose",
     "summary": "The same question, answered a second way",
     "body": [
      {
       "t": "p",
       "text": "**Answer:**"
      },
      {
       "t": "p",
       "text": "A **deadlock** happens when two transactions each hold a lock the other needs, so neither can proceed. The database detects it and kills one transaction (which you must retry)."
      },
      {
       "t": "p",
       "text": "**Avoid it by:** - Acquiring locks in a **consistent order** across the codebase. - Keeping transactions **short**. - Using lower isolation levels where safe. - Adding retry logic for the victim transaction."
      },
      {
       "t": "p",
       "text": "**Key takeaway:** Deadlocks come from inconsistent lock ordering and long transactions — order access consistently, keep transactions short, and retry the loser."
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is a daemon thread and when should you use one?",
   "terms": [
    "Answer",
    "killed automatically",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A daemon thread runs in the background and is **killed automatically** when the main program exits — the interpreter won't wait for it."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading, time\n\ndef monitor():\n    while True:\n        time.sleep(1)\n\nthreading.Thread(target=monitor, daemon=True).start()\n# main can exit without joining; the daemon dies with it",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use daemon threads for fire-and-forget background work (monitors, heartbeats). Don't use them for work that must finish cleanly — they're terminated abruptly and skip `finally` blocks."
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "How are exceptions handled across threads, processes, and asyncio?",
   "terms": [
    "Answer",
    "Raw threading.Thread",
    "not",
    "concurrent.futures",
    "asyncio",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Raw `threading.Thread`:** an exception in `run` is printed but **not** propagated to the parent; capture it manually (e.g., store in a shared object).",
      "**`concurrent.futures`:** captured in the `Future`, re-raised on `.result()`.",
      "**asyncio:** propagates when you `await` the task; with `gather` the first exception propagates (unless `return_exceptions=True`); `TaskGroup` raises an `ExceptionGroup`."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\nerr = []\ndef run():\n    try:\n        1 / 0\n    except Exception as e:\n        err.append(e)            # threads must capture their own errors\nt = threading.Thread(target=run); t.start(); t.join()\nprint(err)                       # [ZeroDivisionError(...)]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Only the executor/asyncio layers surface worker exceptions automatically; bare threads silently swallow them, so capture explicitly."
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is the producer/consumer pattern and how is it done sync vs async?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A producer pushes items to a queue; consumers pull and process them, decoupling rates. A `None` sentinel signals completion."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Threads:\nfrom queue import Queue\n# producer: q.put(item)...; q.put(None)\n# consumer: while (x := q.get()) is not None: process(x)\n\n# Asyncio:\nimport asyncio\nasync def producer(q):\n    for i in range(5): await q.put(i)\n    await q.put(None)\nasync def consumer(q):\n    while (x := await q.get()) is not None:\n        print(x)\nasync def main():\n    q = asyncio.Queue()\n    await asyncio.gather(producer(q), consumer(q))\nasyncio.run(main())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `queue.Queue` for threads and `asyncio.Queue` for coroutines — both are safe for their model and naturally throttle via `maxsize`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What does `maxsize` on a queue do, and how does backpressure work?",
   "terms": [
    "Answer",
    "backpressure",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A bounded queue blocks `put()` when full (and `get()` when empty), so a fast producer is throttled to the consumer's pace — this is **backpressure**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from queue import Queue\nq = Queue(maxsize=3)\nq.put(1); q.put(2); q.put(3)\n# q.put(4)  -> blocks until a consumer get()s, or raises queue.Full with timeout",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Bounded queues prevent unbounded memory growth by forcing producers to wait — a simple, effective flow-control mechanism."
    }
   ]
  },
  {
   "t": "drill",
   "n": "31",
   "q": "Are operations on built-in collections thread-safe?",
   "terms": [
    "Answer",
    "compound",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Some single operations are effectively atomic thanks to the GIL (`list.append`, `dict[key] = v`, `deque.append`/`popleft`), but **compound** operations are not (`counter += 1`, check-then-act, `if k in d: d[k] += 1`)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\nd = {}\nlock = threading.Lock()\n# NOT safe: if k not in d: d[k] = 0   (two threads can both pass the check)\nwith lock:\n    d.setdefault('k', 0)\n    d['k'] += 1",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Don't rely on the GIL for correctness of multi-step updates — guard them with a lock or use `queue.Queue`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "32",
   "q": "How do you cancel a coroutine/task in asyncio?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Call `task.cancel()`, which raises `CancelledError` inside the coroutine at its next `await`. You can clean up in a `try/finally` or catch `CancelledError`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def worker():\n    try:\n        await asyncio.sleep(10)\n    except asyncio.CancelledError:\n        print(\"cleaning up\")\n        raise                       # re-raise to honour cancellation\n\nasync def main():\n    t = asyncio.create_task(worker())\n    await asyncio.sleep(0.1)\n    t.cancel()\n    try:\n        await t\n    except asyncio.CancelledError:\n        print(\"cancelled\")\n\nasyncio.run(main())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Cancellation is cooperative — it surfaces as `CancelledError` at an `await`. Clean up in `finally`/`except` and generally re-raise so the cancellation propagates."
    }
   ]
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is \"coroutine was never awaited\" and how do you fix it?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Calling an `async def` creates a coroutine object but doesn't run it. If you never `await` or schedule it, Python warns and the body never executes."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def task():\n    print(\"ran\")\n\n# task()                       # RuntimeWarning: coroutine never awaited (nothing prints)\n\nasync def main():\n    await task()               # correct: prints \"ran\"\n    # or: asyncio.create_task(task())  to run concurrently\n\nasyncio.run(main())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Always `await` a coroutine or wrap it in `create_task`/`gather`. The warning means you called an async function like a normal one."
    }
   ]
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What are the main pitfalls of each concurrency model? (summary)",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Model",
      "Top pitfalls"
     ],
     "rows": [
      [
       "threading",
       "races on shared state, deadlocks, expecting CPU speedup (GIL)"
      ],
      [
       "multiprocessing",
       "pickling errors, missing `__main__` guard, IPC/startup overhead"
      ],
      [
       "asyncio",
       "blocking the loop, un-awaited coroutines, unbounded `gather`, swallowed task errors"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Threads → synchronize shared state and order locks; processes → keep args picklable and guard the entry point; asyncio → never block the loop, bound concurrency, and always await/inspect tasks."
    }
   ]
  },
  {
   "t": "drill",
   "n": "35",
   "q": "How do you implement a read-write lock, and why use one?",
   "terms": [
    "Answer",
    "many readers",
    "writer exclusive",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A read-write lock lets **many readers** access shared data concurrently but gives a **writer exclusive** access. It improves throughput on read-heavy workloads where plain mutual exclusion would needlessly serialize readers."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\n\nclass ReadWriteLock:\n    def __init__(self):\n        self.readers = 0\n        self.lock = threading.Lock()         # guards the reader count\n        self.write_lock = threading.Lock()   # held during writes / while any reader active\n    def acquire_read(self):\n        with self.lock:\n            self.readers += 1\n            if self.readers == 1:            # first reader blocks writers\n                self.write_lock.acquire()\n    def release_read(self):\n        with self.lock:\n            self.readers -= 1\n            if self.readers == 0:            # last reader frees writers\n                self.write_lock.release()\n    def acquire_write(self):\n        self.write_lock.acquire()\n    def release_write(self):\n        self.write_lock.release()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The first reader acquires the write lock and the last reader releases it, so readers share access while writers wait. This simple version can starve writers under constant reads."
    }
   ]
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is a `CountDownLatch` and how does it differ from a `Barrier`?",
   "terms": [
    "Answer",
    "latch",
    "barrier",
    "reusable",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A **latch** is a one-shot gate initialized to N: callers `count_down()`, and `wait()` unblocks once the count hits 0. A **barrier** makes N threads rendezvous and is **reusable**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\n\nclass CountDownLatch:\n    def __init__(self, count):\n        self.count = count\n        self.lock = threading.Lock()\n        self.event = threading.Event()\n    def count_down(self):\n        with self.lock:\n            self.count -= 1\n            if self.count <= 0:\n                self.event.set()\n    def wait(self):\n        self.event.wait()",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "",
      "`CountDownLatch`",
      "`Barrier`"
     ],
     "rows": [
      [
       "Reusable",
       "No (one-shot)",
       "Yes (cyclic)"
      ],
      [
       "Who waits",
       "one/many waiters for N events",
       "the N participants wait on each other"
      ],
      [
       "Typical use",
       "\"wait until all workers finish\"",
       "\"all threads start phase 2 together\""
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use a latch when one (or more) threads must wait for a fixed number of events; use a barrier when a group of threads must repeatedly synchronize at phase boundaries."
    }
   ]
  },
  {
   "t": "drill",
   "n": "37",
   "q": "How do you ensure an initializer runs exactly once across threads?",
   "terms": [
    "Answer",
    "double-checked locking",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Use **double-checked locking**: a fast lock-free check, then a re-check under the lock so only the first thread runs the initializer."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\n\nclass Once:\n    def __init__(self):\n        self._done = False\n        self._lock = threading.Lock()\n        self._result = None\n    def do(self, func):\n        if self._done:                  # fast path, no lock\n            return self._result\n        with self._lock:\n            if not self._done:          # re-check under lock\n                self._result = func()\n                self._done = True\n        return self._result",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The outer check avoids locking once initialized; the inner check prevents two threads both running `func()` during the race. This is the same pattern behind the thread-safe singleton and lazy per-key initialization."
    }
   ]
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What are debouncing and throttling, and how do they differ?",
   "terms": [
    "Answer",
    "Debounce",
    "last",
    "Throttle",
    "at once",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Debounce**collapse a burst of calls into one: only the **last** call within a quiet window fires (cancel the pending timer on each new call).",
      "**Throttle**cap how many run **at once** (or per period), e.g. via a semaphore."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\n\nclass Debouncer:\n    def __init__(self, delay):\n        self.delay = delay; self.timer = None; self.lock = threading.Lock()\n    def call(self, func, *args):\n        with self.lock:\n            if self.timer: self.timer.cancel()\n            self.timer = threading.Timer(self.delay, func, args)\n            self.timer.start()\n# 5 rapid calls -> only the final one executes.",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Debounce waits for activity to settle (search-as-you-type, autosave); throttle/rate-limit bounds resource usage (a `Semaphore` for concurrency, a token count per period for rate)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "39",
   "q": "How do you build a Future/promise from scratch?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Back it with an `Event`: producer calls `set_result`/`set_exception` and signals the event; `result()` blocks on the event then returns or re-raises."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\n\nclass Future:\n    def __init__(self):\n        self._result = None; self._exception = None\n        self._done = threading.Event()\n    def set_result(self, r): self._result = r; self._done.set()\n    def set_exception(self, e): self._exception = e; self._done.set()\n    def result(self, timeout=None):\n        self._done.wait(timeout)\n        if self._exception: raise self._exception\n        return self._result",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** A future decouples producing a value from consuming it; the `Event` provides the wait/notify, and storing the exception lets it propagate to whoever calls `result()` — exactly how `concurrent.futures.Future` behaves."
    }
   ]
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What does `Thread.join(timeout)` do, and can it stop the thread?",
   "terms": [
    "Answer",
    "not",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`join(timeout)` waits up to `timeout` seconds for the thread to finish, then returns regardless. It does **not** stop or kill the thread — check `is_alive()` afterward to detect a timeout; the thread keeps running in the background."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading, time\n\ndef run_with_timeout(func, timeout):\n    result, error = [None], [None]\n    def wrapper():\n        try: result[0] = func()\n        except Exception as e: error[0] = e\n    t = threading.Thread(target=wrapper)\n    t.start(); t.join(timeout=timeout)\n    if t.is_alive():\n        return None, \"timeout\"     # thread still running!\n    return (None, str(error[0])) if error[0] else (result[0], None)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Python has no safe way to forcibly kill a thread; `join(timeout)` only bounds your *wait*. For real cancellation use cooperative flags/events, or run the work in a process you can terminate."
    }
   ]
  },
  {
   "t": "drill",
   "n": "41",
   "q": "How does a bounded queue provide backpressure, and how do priority/LIFO queues differ?",
   "terms": [
    "Answer",
    "backpressure",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A bounded `Queue(maxsize=n)` blocks `put()` when full (and `get()` when empty), throttling a fast producer to the consumer's pace — that is **backpressure**. `PriorityQueue` pops the smallest item first; `LifoQueue` is a stack."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from queue import Queue, PriorityQueue, LifoQueue\nq = Queue(maxsize=3); q.put(1); q.put(2); q.put(3)\n# q.put(4, timeout=0.01) -> raises queue.Full\n\npq = PriorityQueue()\npq.put((3, \"low\")); pq.put((1, \"high\"))\npq.get()                       # (1, 'high') — lowest value first",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Bound queues to prevent unbounded memory growth (flow control); choose `Queue` (FIFO), `LifoQueue` (stack), or `PriorityQueue` (min-heap) for the ordering you need. `task_done()`/`join()` let a producer wait for all items to be processed."
    }
   ]
  }
 ],
 "takeaways": []
});

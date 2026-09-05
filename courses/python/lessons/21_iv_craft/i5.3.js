/* ============================================================================
   INTERVIEW: CRAFT & TOOLING i5.3 — Testing & Debugging
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i5.3",
 "lede": "**24 interview questions on testing & debugging**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 24 questions on testing & debugging without prompting",
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
   "q": "What is the difference between `unittest` and `pytest`?",
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
      "Aspect",
      "`unittest`",
      "`pytest`"
     ],
     "rows": [
      [
       "Style",
       "xUnit, class-based (`TestCase`)",
       "plain functions (classes optional)"
      ],
      [
       "Assertions",
       "`self.assertEqual(a, b)` methods",
       "plain `assert a == b` (rich introspection)"
      ],
      [
       "Setup/teardown",
       "`setUp`/`tearDown` methods",
       "fixtures via dependency injection"
      ],
      [
       "Parametrization",
       "`subTest` (manual loop)",
       "`@pytest.mark.parametrize` (first-class)"
      ],
      [
       "Discovery",
       "`test*` methods in `TestCase`",
       "`test_*` functions in `test_*.py`"
      ],
      [
       "Ecosystem",
       "stdlib only",
       "huge plugin ecosystem (cov, mock, xdist)"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# unittest\nclass T(unittest.TestCase):\n    def test_add(self):\n        self.assertEqual(1 + 1, 2)\n\n# pytest\ndef test_add():\n    assert 1 + 1 == 2",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `unittest` is built in and good for stdlib-only environments. `pytest` is the de-facto standard: less boilerplate, better failure messages, fixtures, and plugins. It can also run existing `unittest` test cases."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Explain the test pyramid.",
   "terms": [
    "Answer",
    "many unit tests",
    "fewer integration tests",
    "very few end-to-end tests",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "The test pyramid prescribes a healthy ratio of test types: **many unit tests** (fast, isolated, one function), **fewer integration tests** (several components + I/O like DB/files), and **very few end-to-end tests** (the whole system through its UI/API)."
    },
    {
     "t": "p",
     "text": "The rationale: unit tests are cheap, fast, and localize bugs precisely; E2E tests are slow, brittle, and tell you *something* broke but not *where*. An inverted pyramid (mostly E2E) gives slow, flaky suites that nobody trusts."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Push test coverage down to the cheapest level that can verify the behaviour. Use E2E sparingly for critical user journeys."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is a fixture in pytest, and how does scope work?",
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
     "text": "A fixture is a function decorated with `@pytest.fixture` that provides setup (and optional teardown) data/objects to tests via dependency injection — a test simply names the fixture as a parameter. Code before `yield` is setup; after `yield` is teardown."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@pytest.fixture\ndef db():\n    conn = connect(\":memory:\")\n    yield conn          # test runs here\n    conn.close()        # teardown\n\ndef test_users(db):     # receives the connection\n    assert db.execute(\"SELECT 1\").fetchone() == (1,)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`scope` controls reuse: `function` (default, per test), `class`, `module`, `package`, `session` (once for the whole run — use for expensive resources like an HTTP client)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Fixtures replace `setUp`/`tearDown` with composable, reusable, dependency-injected setup. Put shared fixtures in `conftest.py` so they're auto-discovered without imports."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What are the different kinds of test doubles?",
   "terms": [
    "Answer",
    "Dummy",
    "Stub",
    "Spy",
    "Mock",
    "Fake"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Dummy**passed to satisfy a signature but never used.",
      "**Stub**returns canned values for the calls the test makes.",
      "**Spy**a stub that also records how it was called.",
      "**Mock**pre-programmed with expectations and *verifies* interactions (e.g. `assert_called_once_with`).",
      "**Fake**a real, working, lightweight implementation (in-memory DB/cache)."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "fake_cache = {}                      # Fake: real behaviour, lightweight\nstub = Mock(); stub.get.return_value = 42   # Stub: canned answer\nmock = Mock(); mock.save(1); mock.save.assert_called_once_with(1)  # Mock: verify",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Stubs answer queries; mocks verify commands/interactions; fakes provide real (but simple) logic. Choose the least powerful double that does the job — over-mocking couples tests to implementation."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the difference between `Mock` and `MagicMock`?",
   "terms": [
    "Answer",
    "magic (dunder) methods",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`Mock` auto-creates attributes/methods on access and records calls. `MagicMock` is a `Mock` subclass that additionally implements the **magic (dunder) methods** — `__len__`, `__getitem__`, `__iter__`, `__enter__`/`__exit__`, etc. — so it can stand in for objects used with `len()`, indexing, iteration, or `with` blocks."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "m = Mock()\n# len(m)  → TypeError (no __len__)\nmm = MagicMock()\nmm.__len__.return_value = 3\nassert len(mm) == 3                 # works",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `MagicMock` when the code under test uses dunder operations on the double (context managers, containers); `Mock` otherwise. `patch()` uses `MagicMock` by default."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How does `patch` work, and what's the \"patch where it's used\" rule?",
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
     "text": "`unittest.mock.patch` temporarily replaces a name in a namespace with a mock and restores it afterwards. The critical rule: **patch the name in the module where it is *looked up*, not where it is defined.**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# mymodule.py\nimport requests\ndef fetch(): return requests.get(\"http://x\").json()\n\n# test — patch the reference inside mymodule, not requests itself\n@patch(\"mymodule.requests.get\")\ndef test_fetch(mock_get):\n    mock_get.return_value.json.return_value = {\"ok\": True}\n    assert fetch() == {\"ok\": True}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "If `mymodule` did `from requests import get`, you'd patch `mymodule.get` instead."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Patch at the lookup site. Use `patch` as a decorator (mock injected as arg), context manager, or `patch.object` for a specific attribute. The `pytest-mock` `mocker` fixture handles teardown automatically."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What does code coverage measure, and is 100% coverage enough?",
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
     "text": "Coverage measures which lines (line coverage) or which decision branches (branch coverage) were *executed* by the tests. It exposes untested code paths."
    },
    {
     "t": "p",
     "text": "It is **not** sufficient: executing a line doesn't mean you *asserted* its result. You can have 100% line coverage with zero meaningful assertions. Branch coverage is stronger because it requires both sides of each `if` to run."
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "pytest --cov=myapp --cov-branch --cov-report=term-missing --cov-fail-under=80",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use coverage as a guide to find untested code, not as a goal in itself. High coverage with strong assertions is valuable; high coverage alone is a vanity metric."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is parametrized testing and why use it?",
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
     "text": "Parametrization runs the same test logic against multiple input/expected pairs, each reported as a separate test case — so one failure doesn't mask the others and you avoid copy-pasting test bodies."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@pytest.mark.parametrize(\"n, expected\", [(0, 1), (1, 1), (5, 120)])\ndef test_factorial(n, expected):\n    assert factorial(n) == expected",
     "numbered": false
    },
    {
     "t": "p",
     "text": "The `unittest` equivalent is `with self.subTest(...)` inside a loop."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Parametrization keeps tests DRY and gives precise per-case failure reporting. Stack multiple `parametrize` decorators for a Cartesian product of inputs."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is property-based testing? How does it differ from example-based testing?",
   "terms": [
    "Answer",
    "Property-based testing",
    "shrinks",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Example-based tests check specific input→output pairs you choose by hand. **Property-based testing** (e.g. Hypothesis) asserts *invariants* that should hold for *all* inputs, then generates many random cases and **shrinks** any failure to a minimal reproducer."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@given(st.lists(st.integers()))\ndef test_sort_idempotent(xs):\n    assert sorted(sorted(xs)) == sorted(xs)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Good properties: round-trip (`decode(encode(x)) == x`), idempotence, ordering invariants, equivalence with a slow reference implementation."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Property-based testing finds edge cases (empty inputs, huge values, unicode) that humans forget, and shrinking gives a tiny counterexample. Use it alongside, not instead of, targeted example tests."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "How do you test code that raises exceptions?",
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
     "code": "# pytest\nwith pytest.raises(ValueError, match=\"empty\"):   # match = regex on the message\n    parse(\"\")\n\nwith pytest.raises(KeyError) as info:             # inspect the exception\n    d[\"missing\"]\nassert \"missing\" in str(info.value)\n\n# unittest\nwith self.assertRaises(ValueError):\n    parse(\"\")\nwith self.assertRaisesRegex(ValueError, \"empty\"):\n    parse(\"\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Assert both the exception *type* and (often) its *message* via `match`/`assertRaisesRegex`. Capture the exception object when you need to inspect attributes. Don't wrap the call in a bare `try/except` in tests — the context managers fail the test if no exception is raised."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "How do you test functions that depend on the current time or randomness?",
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
     "text": "Make the dependency injectable or patch it so tests are deterministic."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Patch time\nwith patch(\"mymodule.time.time\", return_value=1_000_000.0):\n    assert is_expired(token)\n\n# Patch randomness / seed it\nwith patch(\"random.randint\", return_value=4):\n    assert roll_die() == 4\n# or: random.seed(0) at the start of the test\n\n# Freeze time with a library\n# from freezegun import freeze_time\n# @freeze_time(\"2026-01-01\"): ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Non-determinism causes flaky tests. Inject the clock/RNG as a parameter (best), or patch it. Never let a test depend on the real wall clock or unseeded randomness."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What's the difference between `pytest.approx` and `assertAlmostEqual`?",
   "terms": [
    "Answer",
    "relative",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Both compare floats with tolerance to avoid floating-point equality pitfalls. `assertAlmostEqual(a, b, places=7)` rounds the difference to N decimal places. `pytest.approx` uses **relative** tolerance by default (better across magnitudes) and works inside plain `assert`, including on sequences/dicts."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "self.assertAlmostEqual(0.1 + 0.2, 0.3, places=7)         # unittest\nassert 0.1 + 0.2 == pytest.approx(0.3)                   # pytest, relative\nassert [0.1 + 0.2] == pytest.approx([0.3])               # works on collections",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Never compare floats with `==`. Use `pytest.approx` (relative tolerance, collection-aware) or `assertAlmostEqual` (fixed decimal places)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How do you debug a Python program interactively?",
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
     "text": "Insert `breakpoint()` (Python 3.7+) where you want to stop; it launches `pdb` (or whatever `PYTHONBREAKPOINT` points to). Core commands: `n` (next/step over), `s` (step into), `c` (continue), `p expr` (print), `w` (stack trace), `u`/`d` (move frames), `l` (list source), `q` (quit)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def f(x):\n    breakpoint()        # execution pauses here\n    return x * 2",
     "numbered": false
    },
    {
     "t": "p",
     "text": "You can also set conditional breakpoints (`b 42, x > 10`), drop into a full shell (`interact`), or run post-mortem after a crash (`pdb.post_mortem()` / `python -m pdb script.py`)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Prefer `breakpoint()` over `import pdb; pdb.set_trace()` — it's shorter and globally controllable via `PYTHONBREAKPOINT` (`=0` disables all breakpoints in production)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is post-mortem debugging?",
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
     "text": "Post-mortem debugging inspects program state *after* an exception, at the point where it was raised — without re-running. You get the failing frame's locals and the full stack."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import pdb\ntry:\n    risky()\nexcept Exception:\n    pdb.post_mortem()         # debugger opens at the crash site\n\n# Auto post-mortem on any uncaught exception:\n#   python -m pdb script.py\n# Or install a global hook via sys.excepthook.",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Post-mortem is invaluable for crashes that are hard to reproduce — you examine the exact state that caused the failure instead of guessing or adding prints and re-running."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How do you debug code running on a remote server?",
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
     "text": "Use `debugpy` to open a debug port the server process listens on, then attach from your local IDE (VS Code) over the network."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import debugpy\ndebugpy.listen((\"0.0.0.0\", 5678))\ndebugpy.wait_for_client()     # block until the IDE attaches\ndebugpy.breakpoint()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "VS Code uses an \"attach\" launch config with `connect: {host, port}` and `pathMappings` to map remote paths to your local workspace."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `debugpy` enables full IDE debugging (breakpoints, variable inspection, stepping) for remote/containerized processes. Map local↔remote paths so breakpoints resolve correctly."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "When should you use logging instead of print for debugging?",
   "terms": [
    "Answer",
    "levels",
    "timestamps",
    "module names",
    "output routing",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Use `logging` for anything beyond throwaway one-liners. It provides **levels** (DEBUG/INFO/WARNING/ERROR/CRITICAL) you can filter without touching call sites, automatic **timestamps**, **module names**, and **output routing** (console + file + remote). `print` has none of this and pollutes stdout."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "logger.debug(\"x=%s\", x)      # lazy formatting; emitted only if DEBUG enabled\nlogger.exception(\"failed\")   # ERROR + full traceback, inside an except block",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `print` is for quick local poking; `logging` is for code you keep. Flip one config line (`level=DEBUG`) to surface diagnostics, and `logger.exception()` captures tracebacks automatically."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How do you find performance bottlenecks in Python?",
   "terms": [
    "Answer",
    "timeit",
    "cProfile",
    "line_profiler",
    "memory_profiler / tracemalloc",
    "py-spy"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Profile — never guess. Tools, from coarse to fine:"
    },
    {
     "t": "ul",
     "items": [
      "**`timeit`**micro-benchmark a small snippet.",
      "**`cProfile`**function-level CPU profile (`ncalls`, `tottime`, `cumtime`). `python -m cProfile -s cumulative script.py`.",
      "**`line_profiler`**per-line timing of a hot function.",
      "**`memory_profiler` / `tracemalloc`**memory usage and allocation sites.",
      "**`py-spy`**sampling profiler that attaches to a running process with no code change (great for production, produces flamegraphs)."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** \"Profile first, optimize second.\" Find the proven hotspot, then apply the right fix (better data structure, vectorization, caching). Optimizing un-profiled code wastes effort and adds complexity."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Why is `pickle.loads()` on untrusted data dangerous, and what are safe alternatives?",
   "terms": [
    "Answer",
    "safetensors",
    "yaml.safe_load",
    "numpy native",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`pickle` executes arbitrary Python during deserialization via the `__reduce__` protocol. A crafted payload can run `os.system(...)`, open a reverse shell, or delete files the moment it's unpickled — no further action needed."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Exploit:\n    def __reduce__(self):\n        return (os.system, (\"malicious command\",))\n# pickle.loads(pickle.dumps(Exploit()))  ← runs the command",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Safe alternatives: **JSON / msgspec / msgpack / protobuf** for data, **safetensors** for ML weights, **`yaml.safe_load`** (never `yaml.load`), **numpy native** (`.npy`) for arrays."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Never unpickle data from any untrusted source (uploads, network, shared storage). Treat pickle as code execution, and use a non-executing format for anything crossing a trust boundary."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How do you prevent SQL injection and command injection in Python?",
   "terms": [
    "Answer",
    "SQL injection",
    "Command injection",
    "list of arguments",
    "Code injection",
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
      "**SQL injection:** use parameterized queries — pass values as parameters so the driver escapes them; never build queries with f-strings/concatenation of user input."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "cursor.execute(\"SELECT * FROM users WHERE name = ?\", (user_input,))   # safe\n# f\"... WHERE name = '{user_input}'\"                                   # vulnerable",
     "numbered": false
    },
    {
     "t": "ul",
     "items": [
      "**Command injection:** call subprocess with a **list of arguments** and `shell=False` (the default); never `shell=True` with user input."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "subprocess.run([\"grep\", user_input, \"file.txt\"])   # safe",
     "numbered": false
    },
    {
     "t": "ul",
     "items": [
      "**Code injection:** never `eval`/`exec` user input; use `ast.literal_eval` for literals."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Keep untrusted data out of the *structure* of a command/query. Parameterize SQL, pass argument lists to subprocess, and avoid dynamic code execution entirely."
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
       "t": "ul",
       "items": [
        "**SQL**never build queries with f-strings; pass parameters and let the driver bind/escape them:"
       ]
      },
      {
       "t": "code",
       "lang": "python",
       "code": "cur.execute(\"SELECT * FROM users WHERE email = %s\", (email,))   # ✅",
       "numbered": false
      },
      {
       "t": "ul",
       "items": [
        "**Command**never `shell=True` with user input (or `os.system`/`eval`/`exec`); pass a list of args:"
       ]
      },
      {
       "t": "code",
       "lang": "python",
       "code": "subprocess.run([\"ping\", \"-c\", \"1\", host], check=True)           # ✅",
       "numbered": false
      },
      {
       "t": "p",
       "text": "Both follow one rule: **keep attacker DATA from being interpreted as CODE**."
      },
      {
       "t": "p",
       "text": "**Key takeaway:** Parameterize SQL and use list-form subprocess (no shell); never interpolate user input into an interpreter."
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the OWASP Top 10 and how does it apply to Python?",
   "terms": [
    "Answer",
    "injection",
    "insecure deserialization",
    "broken authentication",
    "sensitive data exposure",
    "SSRF"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "The OWASP Top 10 is the industry list of the most critical web-application security risks. In Python terms: **injection** (SQL/command/`eval`), **insecure deserialization** (`pickle.load`), **broken authentication** (weak JWT, hardcoded creds), **sensitive data exposure** (logging secrets), **SSRF** (unvalidated URLs in `requests`), **security misconfiguration** (`DEBUG=True` in prod), **XSS** (disabled Jinja2 auto-escaping), and **broken access control** (missing auth checks)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Most categories map to concrete Python anti-patterns. Defences: parameterize queries, never unpickle untrusted data, store secrets in env vars/secret managers, validate all external input, disable debug mode in production, and scan dependencies with `pip-audit`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "How do you manage secrets securely in a Python application?",
   "terms": [
    "Answer",
    "Never hardcode",
    "Environment variables",
    "env + python-dotenv",
    "pydantic-settings",
    "Secret managers"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Never hardcode** secrets in source or committed config.",
      "**Environment variables** for simple cases (`os.environ[\"API_KEY\"]` — fails fast if absent).",
      "**`.env` + python-dotenv** for local dev, with `.env` in `.gitignore`.",
      "**`pydantic-settings`** for typed, validated config loading.",
      "**Secret managers** in production (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager); rotate regularly and use short-lived tokens.",
      "**`secrets` module** to *generate* tokens (`secrets.token_urlsafe(32)`), never the `random` module.",
      "**Scan** for leaks with tools like `detect-secrets` (pre-commit) and `pip-audit`."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Keep secrets out of code and version control; load them from the environment or a secret manager, apply least privilege, and rotate them."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What's the difference between hashing for checksums and hashing for passwords?",
   "terms": [
    "Answer",
    "integrity/checksums",
    "Password hashing",
    "bcrypt",
    "scrypt",
    "Argon2"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Fast hashes (SHA-256) are designed for **integrity/checksums** — they're intentionally fast, which makes them *bad* for passwords because attackers can brute-force billions per second. **Password hashing** needs deliberately slow, salted algorithms — **bcrypt**, **scrypt**, or **Argon2** — that resist brute force and rainbow tables."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "hashlib.sha256(b\"data\").hexdigest()                    # checksum — fine\nbcrypt.hashpw(b\"password\", bcrypt.gensalt())           # password — correct",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Never use MD5/SHA-1 for security, and use `hmac.compare_digest` for timing-safe comparisons."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use SHA-256 for integrity, a slow salted KDF (bcrypt/Argon2) for passwords. Speed is a feature for checksums and a vulnerability for password storage."
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "How do you keep tests fast, isolated, and non-flaky?",
   "terms": [
    "Answer",
    "Isolated",
    "Fast",
    "Non-flaky",
    "Deterministic ordering",
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
      "**Isolated:** no shared mutable state between tests; build fresh fixtures per test; never depend on test execution order.",
      "**Fast:** mock slow I/O (network, DB) in unit tests; reserve real I/O for a small integration layer; use `session`-scoped fixtures for unavoidable expensive setup.",
      "**Non-flaky:** remove non-determinism — patch/seed the clock and RNG, avoid `sleep`-based timing (poll with timeouts instead), and don't rely on external services.",
      "**Deterministic ordering:** never assert on dict/set iteration order or unsorted query results."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Flaky tests erode trust in the whole suite. Eliminate shared state, external dependencies, and non-determinism, and keep the bulk of tests at the fast unit level."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How would you debug intermittent / hard-to-reproduce failures?",
   "terms": [
    "Answer",
    "Add structured logging",
    "Increase observability",
    "Install a global post-mortem hook",
    "Check for non-determinism",
    "Reproduce under stress"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Add structured logging** with correlation IDs to capture the state leading up to the failure across runs.",
      "**Increase observability**log inputs, key branch decisions, and timing.",
      "**Install a global post-mortem hook** (`sys.excepthook` → `pdb.post_mortem`) or capture full tracebacks to a file.",
      "**Check for non-determinism**threading/async race conditions, unseeded randomness, dict ordering, time dependence, uninitialized state.",
      "**Reproduce under stress**run the test many times (`pytest -p no:randomly --count=100` with `pytest-repeat`), enable asyncio debug mode, or run under `faulthandler`.",
      "**Use `py-spy`** to sample a hung/slow production process without stopping it."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Intermittent bugs are usually concurrency, ordering, or environment dependence. Maximize observability (logging + post-mortem), then hunt the source of non-determinism rather than adding random retries."
    }
   ]
  }
 ],
 "takeaways": []
});

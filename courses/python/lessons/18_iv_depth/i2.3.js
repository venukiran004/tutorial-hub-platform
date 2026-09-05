/* ============================================================================
   INTERVIEW: LANGUAGE DEPTH i2.3 — Exception Handling
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.3",
 "lede": "**30 interview questions on exception handling**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 30 questions on exception handling without prompting",
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
   "q": "What is the difference between `except Exception` and bare `except:`?",
   "body": [
    {
     "t": "p",
     "text": "**Bare `except:`** is equivalent to `except BaseException:` — it catches **everything**, including `SystemExit`, `KeyboardInterrupt`, and `GeneratorExit`. This means pressing Ctrl+C won't stop your program, and `sys.exit()` won't work."
    },
    {
     "t": "p",
     "text": "**`except Exception:`** only catches \"normal\" exceptions. `SystemExit`, `KeyboardInterrupt`, and `GeneratorExit` are subclasses of `BaseException` but **not** `Exception`, so they bypass it."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# BAD — bare except catches Ctrl+C and sys.exit()\ntry:\n    work()\nexcept:\n    pass\n\n# GOOD — lets KeyboardInterrupt and SystemExit propagate\ntry:\n    work()\nexcept Exception:\n    pass\n\n# BEST — catch only what you expect\ntry:\n    work()\nexcept (ValueError, IOError) as e:\n    handle(e)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rule:** Never use bare `except:` in production code. At minimum, use `except Exception`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Explain the execution order of try/except/else/finally.",
   "body": [
    {
     "t": "table",
     "head": [
      "Block",
      "When it runs"
     ],
     "rows": [
      [
       "`try`",
       "Always — runs until an exception or completion"
      ],
      [
       "`except`",
       "Only if an exception occurs in `try` and matches"
      ],
      [
       "`else`",
       "Only if `try` completes with NO exception"
      ],
      [
       "`finally`",
       "**Always** — exception or not, return or not"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def demo(x):\n    try:\n        result = 10 / x\n    except ZeroDivisionError:\n        print(\"except\")\n        return \"from except\"\n    else:\n        print(\"else\")\n        return \"from else\"\n    finally:\n        print(\"finally\")    # Always runs, even before return\n\nprint(demo(2))    # else → finally → \"from else\"\nprint(demo(0))    # except → finally → \"from except\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Key detail: `finally` runs **before** the return value is delivered to the caller, but **after** the return value is evaluated."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "How do you create custom exceptions? What are best practices?",
   "body": [
    {
     "t": "p",
     "text": "Subclass `Exception` (not `BaseException`). Add meaningful attributes and override `__init__` to call `super().__init__()`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class ServiceError(Exception):\n    \"\"\"Base exception for service layer.\"\"\"\n\nclass UserNotFoundError(ServiceError):\n    def __init__(self, user_id):\n        self.user_id = user_id\n        super().__init__(f\"User {user_id} not found\")\n\nclass RateLimitError(ServiceError):\n    def __init__(self, endpoint, retry_after):\n        self.endpoint = endpoint\n        self.retry_after = retry_after\n        super().__init__(\n            f\"Rate limited on {endpoint}. Retry after {retry_after}s\"\n        )",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Best practices:** 1. Create a base exception for your package/module. 2. Use a clear hierarchy (e.g., `AppError → DatabaseError → ConnectionError`). 3. Add useful attributes (`user_id`, `status_code`, etc.) instead of just a message string. 4. Always call `super().__init__()` so `str(e)` and `repr(e)` work properly. 5. Keep exception classes in a dedicated module (e.g., `exceptions.py`). 6. Make exceptions picklable if they'll cross process boundaries."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is exception chaining? Explain `raise ... from`.",
   "body": [
    {
     "t": "p",
     "text": "Exception chaining links a new exception to the original cause. Python supports two forms:"
    },
    {
     "t": "p",
     "text": "**Implicit chaining** — when an exception occurs inside an `except` block, Python sets `__context__`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "try:\n    int(\"abc\")\nexcept ValueError:\n    raise RuntimeError(\"Conversion failed\")\n# Message: \"During handling of the above exception, another exception occurred\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Explicit chaining** (`from`) — sets `__cause__` to clearly indicate the root cause:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "try:\n    config = load_file(\"config.json\")\nexcept FileNotFoundError as e:\n    raise ConfigError(\"Missing config\") from e\n# Message: \"The above exception was the direct cause of the following exception\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Suppressing the chain** (`from None`) — hides the original exception:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "try:\n    port = int(value)\nexcept ValueError:\n    raise ValueError(f\"Invalid port: {value!r}\") from None\n# Only the new exception is shown — no chaining",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Attribute",
      "Set by",
      "Meaning"
     ],
     "rows": [
      [
       "`__cause__`",
       "`raise X from Y`",
       "Explicit cause"
      ],
      [
       "`__context__`",
       "Automatic",
       "Previous exception during handling"
      ],
      [
       "`__suppress_context__`",
       "`from` sets to `True`",
       "Controls traceback display"
      ]
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is EAFP vs LBYL? Which does Python prefer?",
   "body": [
    {
     "t": "p",
     "text": "**LBYL (Look Before You Leap):** Check preconditions before performing an operation. **EAFP (Easier to Ask Forgiveness than Permission):** Attempt the operation and handle exceptions."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# LBYL\nif key in dictionary:\n    value = dictionary[key]\n\n# EAFP (Pythonic)\ntry:\n    value = dictionary[key]\nexcept KeyError:\n    value = default",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Python strongly prefers EAFP** because: 1. **No race conditions** — LBYL checks can become stale (TOCTOU bug). 2. **Faster happy path** — no redundant pre-check when operation usually succeeds. 3. **Handles all failure modes** — a single `except` catches any way the operation can fail. 4. **Duck typing** — EAFP naturally works with any object supporting the operation."
    },
    {
     "t": "p",
     "text": "LBYL is preferred when: - The check is much cheaper than exception handling. - Failure is the common case (exceptions are expensive). - You need to validate multiple conditions upfront (e.g., form validation)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What are ExceptionGroups? How does `except*` work? (Python 3.11+)",
   "body": [
    {
     "t": "p",
     "text": "`ExceptionGroup` bundles multiple unrelated exceptions that occurred simultaneously (e.g., concurrent tasks). `except*` handles subsets of a group by type."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "try:\n    raise ExceptionGroup(\"errors\", [\n        ValueError(\"v1\"),\n        TypeError(\"t1\"),\n        ValueError(\"v2\"),\n    ])\nexcept* ValueError as eg:\n    # eg is an ExceptionGroup containing [ValueError(\"v1\"), ValueError(\"v2\")]\n    print(f\"Handled {len(eg.exceptions)} ValueErrors\")\nexcept* TypeError as eg:\n    # eg is an ExceptionGroup containing [TypeError(\"t1\")]\n    print(f\"Handled {len(eg.exceptions)} TypeErrors\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key differences from regular `except`:** - Multiple `except*` blocks can match from the same group. - Each receives a sub-group, not a single exception. - Cannot mix `except` and `except*` in the same `try`. - Unmatched exceptions propagate as a new `ExceptionGroup`."
    },
    {
     "t": "p",
     "text": "**Practical use:** `asyncio.TaskGroup` raises `ExceptionGroup` when multiple tasks fail."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "How do you handle exceptions in decorators?",
   "body": [
    {
     "t": "p",
     "text": "A decorator can wrap the decorated function in try/except to add cross-cutting error handling:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import functools\nimport logging\n\nlogger = logging.getLogger(__name__)\n\ndef log_exceptions(func):\n    \"\"\"Log exceptions and re-raise.\"\"\"\n    @functools.wraps(func)\n    def wrapper(*args, **kwargs):\n        try:\n            return func(*args, **kwargs)\n        except Exception as e:\n            logger.exception(f\"{func.__name__} failed: {e}\")\n            raise\n    return wrapper\n\ndef convert_exceptions(from_exc, to_exc):\n    \"\"\"Convert one exception type to another.\"\"\"\n    def decorator(func):\n        @functools.wraps(func)\n        def wrapper(*args, **kwargs):\n            try:\n                return func(*args, **kwargs)\n            except from_exc as e:\n                raise to_exc(str(e)) from e\n        return wrapper\n    return decorator\n\n@log_exceptions\ndef fetch_data():\n    raise ConnectionError(\"timeout\")\n\n@convert_exceptions(KeyError, ValueError)\ndef get_config(key):\n    config = {}\n    return config[key]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Important:** Always use `@functools.wraps(func)` to preserve the original function's name, docstring, and signature."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What happens if `finally` has a `return` statement?",
   "body": [
    {
     "t": "p",
     "text": "The `finally` block's `return` **silently overrides** any return value from `try` or `except`. It also **suppresses** any exception that was being propagated."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def example1():\n    try:\n        return \"try\"\n    finally:\n        return \"finally\"\n\nprint(example1())  # \"finally\" — try's return is discarded\n\ndef example2():\n    try:\n        raise ValueError(\"error\")\n    finally:\n        return \"finally\"\n\nprint(example2())  # \"finally\" — ValueError is silently suppressed!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "This is a well-known Python gotcha. **Never put `return` in `finally`** — it causes: - Silent loss of return values. - Silent suppression of exceptions (bugs become invisible). - Python emits a `SyntaxWarning` in 3.12+ for this pattern."
    },
    {
     "t": "p",
     "text": "Use `finally` only for cleanup (closing files, releasing locks, etc.)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How do you re-raise an exception?",
   "body": [
    {
     "t": "p",
     "text": "Three ways, with different behaviors:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 1. Bare raise — re-raises the SAME exception with ORIGINAL traceback\ntry:\n    risky()\nexcept ValueError as e:\n    log(e)\n    raise           # Preserves original traceback — PREFERRED\n\n# 2. raise e — re-raises but RESETS the traceback to this line\ntry:\n    risky()\nexcept ValueError as e:\n    log(e)\n    raise e         # Traceback starts here, not at original raise\n\n# 3. raise new from original — new exception chained to original\ntry:\n    risky()\nexcept ValueError as e:\n    raise RuntimeError(\"Wrapped error\") from e",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Always prefer bare `raise`** unless you intentionally want to transform the exception. It preserves the complete call stack for debugging."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What are the best practices for exception handling?",
   "body": [
    {
     "t": "ol",
     "items": [
      "**Catch specific exceptions**never bare `except:`, prefer named types.",
      "**Keep try blocks small**only wrap the risky operation.",
      "**Use `else`**put success logic outside `try` to avoid accidental catches.",
      "**Don't silence exceptions**at minimum, log them.",
      "**Use `finally` for cleanup**or better, use context managers.",
      "**Re-raise with bare `raise`**preserves the original traceback.",
      "**Use custom exceptions**give your domain meaningful error types.",
      "**Chain exceptions**use `raise X from Y` to preserve root cause.",
      "**Document raised exceptions**use `Raises:` section in docstrings.",
      "**Never return in `finally`**it silently suppresses exceptions."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the difference between `raise` and `raise e`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def inner():\n    raise ValueError(\"original\")\n\n# Using bare raise\ndef handler_a():\n    try:\n        inner()\n    except ValueError:\n        raise              # traceback shows inner() as origin\n\n# Using raise e\ndef handler_b():\n    try:\n        inner()\n    except ValueError as e:\n        raise e            # traceback shows THIS line as origin",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**`raise`** (no argument): Re-raises the current exception preserving the original traceback. The error appears to come from the original `raise` site."
    },
    {
     "t": "p",
     "text": "**`raise e`**: Creates a new traceback starting from this line. The original traceback is lost. Useful only when you intentionally want to hide internal details (rare)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "How does exception handling work with generators?",
   "body": [
    {
     "t": "p",
     "text": "Generators support three exception-related methods:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def pipeline():\n    while True:\n        try:\n            value = yield\n            print(f\"Processing: {value}\")\n        except ValueError as e:\n            print(f\"Skipping bad value: {e}\")\n\ngen = pipeline()\nnext(gen)                    # Prime\ngen.send(1)                  # Processing: 1\ngen.throw(ValueError, \"bad\") # Skipping bad value: bad\ngen.send(2)                  # Processing: 2\ngen.close()                  # Injects GeneratorExit",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Behavior"
     ],
     "rows": [
      [
       "`gen.throw(exc_type)`",
       "Raises exception AT the yield point; generator can catch and continue"
      ],
      [
       "`gen.close()`",
       "Injects `GeneratorExit` at the yield point; generator should not yield after this"
      ],
      [
       "`next(gen)` on exhausted generator",
       "Raises `StopIteration`"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Critical rule (PEP 479):** A `StopIteration` raised inside a generator is automatically converted to `RuntimeError`. Use `return` instead of `raise StopIteration`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# BAD (Python 3.7+)\ndef gen():\n    raise StopIteration  # RuntimeError!\n\n# GOOD\ndef gen():\n    return  # Properly signals exhaustion",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How do you suppress exceptions cleanly?",
   "body": [
    {
     "t": "p",
     "text": "Use `contextlib.suppress` for cleaner code when you intentionally want to ignore specific exceptions:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import suppress\nimport os\n\n# Instead of try/except/pass\nwith suppress(FileNotFoundError):\n    os.remove(\"temp.txt\")\n\nwith suppress(KeyError, IndexError):\n    value = data[\"key\"][5]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When NOT to suppress:** - Don't suppress broad exceptions (`Exception`). - Don't suppress errors you don't understand. - If you need to do something on failure, use `try/except` instead."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "How do context managers interact with exceptions?",
   "body": [
    {
     "t": "p",
     "text": "A context manager's `__exit__` method receives exception info and can suppress or propagate:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Transaction:\n    def __enter__(self):\n        print(\"BEGIN\")\n        return self\n\n    def __exit__(self, exc_type, exc_val, exc_tb):\n        if exc_type:\n            print(f\"ROLLBACK due to {exc_type.__name__}: {exc_val}\")\n            return False   # Propagate exception\n        print(\"COMMIT\")\n        return False\n\nwith Transaction():\n    raise ValueError(\"bad data\")\n# Output: BEGIN → ROLLBACK due to ValueError: bad data → ValueError propagates",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "`__exit__` return value",
      "Effect"
     ],
     "rows": [
      [
       "`True` (truthy)",
       "Exception is **suppressed** — execution continues after `with`"
      ],
      [
       "`False` / `None`",
       "Exception **propagates** normally"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Using `@contextmanager` decorator:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import contextmanager\n\n@contextmanager\ndef managed_resource():\n    print(\"Acquire\")\n    try:\n        yield \"resource\"\n    except Exception:\n        print(\"Error — cleanup\")\n        raise        # Re-raise to propagate\n    else:\n        print(\"Success — cleanup\")\n    finally:\n        print(\"Always cleanup\")",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is `sys.exc_info()` and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "`sys.exc_info()` returns `(type, value, traceback)` of the current exception. Primarily used in Python 2 compatibility code or when you need the traceback object."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nimport traceback\n\ntry:\n    1 / 0\nexcept:\n    exc_type, exc_value, exc_tb = sys.exc_info()\n    print(f\"Type: {exc_type}\")          # <class 'ZeroDivisionError'>\n    print(f\"Value: {exc_value}\")        # division by zero\n    traceback.print_tb(exc_tb)          # Traceback details",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Modern Python** (3.x): Prefer using `as e` and `e.__traceback__`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "try:\n    1 / 0\nexcept ZeroDivisionError as e:\n    tb_str = \"\".join(traceback.format_exception(type(e), e, e.__traceback__))",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "How do you handle exceptions in async/await code?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nasync def fetch(url):\n    if \"bad\" in url:\n        raise ConnectionError(f\"Failed: {url}\")\n    return f\"data from {url}\"\n\nasync def main():\n    # Single task\n    try:\n        result = await fetch(\"http://bad.example.com\")\n    except ConnectionError as e:\n        print(f\"Caught: {e}\")\n\n    # Multiple tasks — TaskGroup (Python 3.11+)\n    try:\n        async with asyncio.TaskGroup() as tg:\n            t1 = tg.create_task(fetch(\"http://good.com\"))\n            t2 = tg.create_task(fetch(\"http://bad.com\"))\n    except* ConnectionError as eg:\n        for e in eg.exceptions:\n            print(f\"Connection error: {e}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key points:** - `await` propagates exceptions normally — use regular `try/except`. - `asyncio.TaskGroup` (3.11+) raises `ExceptionGroup` when tasks fail. - `asyncio.gather(return_exceptions=True)` returns exceptions as results instead of raising."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What happens when an exception occurs in `__init__`?",
   "body": [
    {
     "t": "p",
     "text": "If `__init__` raises, the object is partially constructed. `__del__` may or may not be called depending on whether `__init__` set up enough state."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Resource:\n    def __init__(self, name):\n        self.name = name\n        self.connection = connect()     # If this raises...\n        self.file = open(\"data.txt\")    # ...this never runs\n\n    def __del__(self):\n        self.file.close()               # AttributeError: 'Resource' has no attribute 'file'",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Solution:** Use context managers or handle cleanup in `__init__`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Resource:\n    def __init__(self, name):\n        self.name = name\n        self.connection = None\n        self.file = None\n        try:\n            self.connection = connect()\n            self.file = open(\"data.txt\")\n        except:\n            self.close()\n            raise\n\n    def close(self):\n        if self.file:\n            self.file.close()\n        if self.connection:\n            self.connection.close()",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "How do you test that code raises exceptions?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pytest\n\n# pytest — preferred\ndef test_division_by_zero():\n    with pytest.raises(ZeroDivisionError):\n        1 / 0\n\ndef test_exception_message():\n    with pytest.raises(ValueError, match=r\"invalid literal\"):\n        int(\"abc\")\n\ndef test_exception_attributes():\n    with pytest.raises(ValueError) as exc_info:\n        raise ValueError(\"test\", 42)\n    assert exc_info.value.args == (\"test\", 42)\n\n# unittest\nimport unittest\n\nclass TestErrors(unittest.TestCase):\n    def test_raises(self):\n        with self.assertRaises(ZeroDivisionError):\n            1 / 0\n\n    def test_message(self):\n        with self.assertRaisesRegex(ValueError, r\"invalid\"):\n            int(\"abc\")",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the difference between `sys.exit()`, `exit()`, and `os._exit()`?",
   "body": [
    {
     "t": "table",
     "head": [
      "Function",
      "Raises",
      "`finally` runs?",
      "Catchable?",
      "Use case"
     ],
     "rows": [
      [
       "`sys.exit(code)`",
       "`SystemExit`",
       "Yes",
       "Yes (`except SystemExit`)",
       "Normal program termination"
      ],
      [
       "`exit()` / `quit()`",
       "`SystemExit`",
       "Yes",
       "Yes",
       "Interactive interpreter only"
      ],
      [
       "`os._exit(code)`",
       "Nothing",
       "**No**",
       "**No**",
       "Child process after `fork()`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\n\ntry:\n    sys.exit(1)\nexcept SystemExit as e:\n    print(f\"Caught SystemExit with code {e.code}\")\n    # Program continues!\n\n# os._exit(1) — immediate termination, no cleanup",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key insight:** `sys.exit()` is just `raise SystemExit(code)`. Since `SystemExit` inherits from `BaseException` (not `Exception`), `except Exception` won't catch it, but bare `except:` will — another reason to avoid bare except."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "How do you implement a retry decorator with exception handling?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import functools\nimport time\nimport logging\n\nlogger = logging.getLogger(__name__)\n\ndef retry(max_attempts=3, delay=1.0, backoff=2.0, \n          exceptions=(Exception,), on_failure=None):\n    def decorator(func):\n        @functools.wraps(func)\n        def wrapper(*args, **kwargs):\n            last_exc = None\n            for attempt in range(1, max_attempts + 1):\n                try:\n                    return func(*args, **kwargs)\n                except exceptions as e:\n                    last_exc = e\n                    if attempt == max_attempts:\n                        logger.error(\n                            f\"{func.__name__} failed after {max_attempts} \"\n                            f\"attempts: {e}\"\n                        )\n                        if on_failure:\n                            return on_failure(e)\n                        raise\n                    wait = delay * (backoff ** (attempt - 1))\n                    logger.warning(\n                        f\"{func.__name__} attempt {attempt}/{max_attempts} \"\n                        f\"failed: {e}. Retrying in {wait:.1f}s\"\n                    )\n                    time.sleep(wait)\n        return wrapper\n    return decorator\n\n@retry(max_attempts=3, delay=0.5, exceptions=(ConnectionError, TimeoutError))\ndef call_api(endpoint):\n    import random\n    if random.random() < 0.7:\n        raise ConnectionError(\"Server busy\")\n    return {\"status\": \"ok\"}",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is `warnings.warn()` vs `raise`? When to use each?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import warnings\n\n# warnings.warn — non-fatal, program continues\ndef old_function():\n    warnings.warn(\n        \"old_function() is deprecated, use new_function()\",\n        DeprecationWarning,\n        stacklevel=2\n    )\n    return new_function()\n\n# raise — fatal, must be caught or program crashes\ndef validate(x):\n    if x < 0:\n        raise ValueError(\"x must be non-negative\")",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "`warnings.warn()`",
      "`raise`"
     ],
     "rows": [
      [
       "Continues execution?",
       "Yes",
       "No (unless caught)"
      ],
      [
       "Can be silenced?",
       "Yes (`warnings.filterwarnings`)",
       "Only by catching"
      ],
      [
       "Use case",
       "Deprecations, potential issues",
       "Errors, invalid state"
      ],
      [
       "Testing",
       "`pytest.warns(DeprecationWarning)`",
       "`pytest.raises(ValueError)`"
      ]
     ]
    },
    {
     "t": "p",
     "text": "Warnings inherit from `Warning` (a subclass of `Exception`), but they are not raised as exceptions by default. Use `warnings.filterwarnings(\"error\")` to convert warnings to exceptions during testing."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "How do you handle exceptions in multi-threading?",
   "body": [
    {
     "t": "p",
     "text": "Exceptions in threads don't propagate to the main thread. You must handle them explicitly:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import threading\nimport concurrent.futures\n\n# Method 1: Handle inside the thread\ndef worker():\n    try:\n        risky_operation()\n    except Exception as e:\n        logging.error(f\"Thread failed: {e}\")\n\n# Method 2: Use concurrent.futures (preferred)\nwith concurrent.futures.ThreadPoolExecutor() as executor:\n    futures = [executor.submit(risky_operation, arg) for arg in args]\n    \n    for future in concurrent.futures.as_completed(futures):\n        try:\n            result = future.result()   # Re-raises any exception from the thread\n        except Exception as e:\n            print(f\"Task failed: {e}\")\n\n# Method 3: threading.excepthook (Python 3.8+)\ndef handle_thread_exception(args):\n    print(f\"Thread {args.thread.name} failed: {args.exc_value}\")\n\nthreading.excepthook = handle_thread_exception",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key point:** `concurrent.futures` is the cleanest way — `future.result()` re-raises the exception in the calling thread."
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is `assert` and should you use it for error handling?",
   "body": [
    {
     "t": "p",
     "text": "`assert` is a debugging aid, **not** error handling. Assertions are removed when Python runs with `-O` (optimize) flag."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# CORRECT use — debugging invariants\ndef binary_search(arr, target):\n    assert sorted(arr) == arr, \"Array must be sorted\"  # Development check\n    ...\n\n# WRONG use — input validation\ndef set_age(age):\n    assert age >= 0, \"Age must be positive\"   # REMOVED with python -O!\n    self.age = age\n\n# CORRECT — use raise for validation\ndef set_age(age):\n    if age < 0:\n        raise ValueError(\"Age must be non-negative\")\n    self.age = age",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rules:** - Use `assert` for conditions that should **never** be false if the code is correct. - Never use `assert` for data validation, user input, or security checks. - `assert` raises `AssertionError` — don't catch it in production. - Running `python -O script.py` strips all `assert` statements."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How do you get the full traceback as a string?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import traceback\n\ndef failing():\n    return 1 / 0\n\n# Method 1: Inside except block\ntry:\n    failing()\nexcept Exception:\n    tb_string = traceback.format_exc()\n    print(tb_string)\n\n# Method 2: From exception object\ntry:\n    failing()\nexcept Exception as e:\n    tb_string = \"\".join(\n        traceback.format_exception(type(e), e, e.__traceback__)\n    )\n    print(tb_string)\n\n# Method 3: Python 3.10+ simplified\ntry:\n    failing()\nexcept Exception as e:\n    tb_string = \"\".join(traceback.format_exception(e))\n    print(tb_string)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Common use case:** Logging full tracebacks:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import logging\nlogger = logging.getLogger(__name__)\n\ntry:\n    failing()\nexcept Exception:\n    logger.exception(\"Operation failed\")  # Automatically includes traceback",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What are `BaseExceptionGroup` vs `ExceptionGroup`? (Python 3.11+)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# ExceptionGroup — can only contain Exception subclasses\neg = ExceptionGroup(\"errors\", [\n    ValueError(\"v1\"),\n    TypeError(\"t1\"),\n])\n\n# BaseExceptionGroup — can contain ANY BaseException subclass\nbeg = BaseExceptionGroup(\"errors\", [\n    KeyboardInterrupt(),\n    SystemExit(1),\n])",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Class",
      "Contains",
      "Caught by"
     ],
     "rows": [
      [
       "`ExceptionGroup`",
       "`Exception` subclasses only",
       "`except Exception` or `except* X`"
      ],
      [
       "`BaseExceptionGroup`",
       "Any `BaseException` subclass",
       "`except BaseException` or `except* X`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ExceptionGroup auto-selects the right type\neg = BaseExceptionGroup(\"mixed\", [\n    ValueError(\"v\"),\n    KeyboardInterrupt(),\n])\n# If all exceptions are Exception subclasses → returns ExceptionGroup\n# If any is BaseException (not Exception) → returns BaseExceptionGroup\n\nmatch, rest = eg.split(ValueError)\nprint(type(match))  # ExceptionGroup (only contains ValueError)\nprint(type(rest))   # BaseExceptionGroup (contains KeyboardInterrupt)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "How do you make exceptions picklable for multiprocessing?",
   "body": [
    {
     "t": "p",
     "text": "Default exceptions are picklable, but custom exceptions with extra `__init__` parameters need care:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import pickle\n\nclass CustomError(Exception):\n    def __init__(self, code, message):\n        self.code = code\n        self.message = message\n        super().__init__(code, message)   # Pass ALL args to super\n\n# This works because args are passed to super().__init__\ne = CustomError(404, \"Not Found\")\npickled = pickle.dumps(e)\nrestored = pickle.loads(pickled)\nprint(restored.code, restored.message)   # 404 Not Found\n\n# BAD — not picklable if super() doesn't receive all args\nclass BadError(Exception):\n    def __init__(self, code, message):\n        self.code = code\n        self.message = message\n        super().__init__(message)  # Missing 'code' → pickle fails",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rule:** Always pass all constructor arguments to `super().__init__()` to ensure picklability."
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "Explain `UnicodeDecodeError` and `UnicodeEncodeError`. How do you handle them?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# UnicodeDecodeError — bytes → str fails\ntry:\n    b\"\\xff\\xfe\".decode(\"utf-8\")\nexcept UnicodeDecodeError as e:\n    print(f\"Encoding: {e.encoding}\")    # utf-8\n    print(f\"Reason: {e.reason}\")        # invalid start byte\n    print(f\"Position: {e.start}-{e.end}\")\n\n# Handling strategies\ntext = b\"\\xff\\xfehello\".decode(\"utf-8\", errors=\"replace\")   # Replaces bad bytes with ?\ntext = b\"\\xff\\xfehello\".decode(\"utf-8\", errors=\"ignore\")    # Skips bad bytes\ntext = b\"\\xff\\xfehello\".decode(\"utf-8\", errors=\"backslashreplace\")  # \\\\xff\\\\xfe\n\n# UnicodeEncodeError — str → bytes fails\ntry:\n    \"café ☕\".encode(\"ascii\")\nexcept UnicodeEncodeError:\n    result = \"café ☕\".encode(\"utf-8\")   # Use UTF-8 instead",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Best practice:** Always specify encoding explicitly when opening files:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with open(\"data.txt\", encoding=\"utf-8\") as f:\n    content = f.read()",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is `NotImplementedError` vs `NotImplemented`?",
   "body": [
    {
     "t": "p",
     "text": "They are completely unrelated despite the similar names:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# NotImplementedError — an EXCEPTION for abstract methods\nclass Shape:\n    def area(self):\n        raise NotImplementedError(\"Subclasses must implement area()\")\n\n# NotImplemented — a CONSTANT (sentinel value) for binary operators\nclass Vector:\n    def __eq__(self, other):\n        if not isinstance(other, Vector):\n            return NotImplemented   # NOT raise! Tells Python to try other.__eq__\n        return self.x == other.x and self.y == other.y",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "",
      "`NotImplementedError`",
      "`NotImplemented`"
     ],
     "rows": [
      [
       "Type",
       "Exception class",
       "Singleton constant"
      ],
      [
       "Usage",
       "`raise NotImplementedError(...)`",
       "`return NotImplemented`"
      ],
      [
       "Purpose",
       "Mark abstract methods",
       "Signal binary operator fallback"
      ],
      [
       "Is an exception?",
       "Yes",
       "No (returning it from `__bool__` raises TypeError)"
      ]
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "How do you handle `RecursionError`?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\n\n# Check/set limit\nprint(sys.getrecursionlimit())      # Default: 1000\nsys.setrecursionlimit(5000)         # Increase if needed\n\n# Catch RecursionError\ndef factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\ntry:\n    factorial(10000)\nexcept RecursionError:\n    print(\"Stack overflow — use iterative approach\")\n\n# Better: use iteration\ndef factorial_iter(n):\n    result = 1\n    for i in range(2, n + 1):\n        result *= i\n    return result\n\n# Or use @functools.lru_cache for memoized recursion\nfrom functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`RecursionError` is a subclass of `RuntimeError`. In production, prefer iterative solutions over increasing the recursion limit."
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "How do you use `add_note()` on exceptions? (Python 3.11+)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Adding context to exceptions as they propagate\ndef process_batch(items):\n    for i, item in enumerate(items):\n        try:\n            validate(item)\n        except ValueError as e:\n            e.add_note(f\"Error occurred in item {i}: {item!r}\")\n            e.add_note(f\"Batch size: {len(items)}\")\n            raise\n\ntry:\n    process_batch([\"good\", \"bad\", \"ugly\"])\nexcept ValueError as e:\n    print(e)\n    print(\"Notes:\", e.__notes__)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use cases:** - Adding context as exceptions propagate through layers. - Enriching third-party exceptions without wrapping them. - Notes appear in the traceback output automatically."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Notes appear in tracebacks\ntry:\n    err = ValueError(\"original\")\n    err.add_note(\"Added by middleware\")\n    err.add_note(\"Request ID: abc-123\")\n    raise err\nexcept ValueError:\n    import traceback\n    traceback.print_exc()\n# Output includes:\n# ValueError: original\n# Added by middleware\n# Request ID: abc-123",
     "numbered": false
    }
   ]
  }
 ],
 "takeaways": []
});

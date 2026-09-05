/* ============================================================================
   INTERVIEW 17.20 — Best Practices
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "17.20",
 "lede": "**35 interview questions on best practices**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 35 questions on best practices without prompting",
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
   "q": "What is PEP 8 and why does it matter?",
   "terms": [
    "Answer",
    "consistency",
    "tooling",
    "community standard",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "PEP 8 is Python's official style guide — conventions for indentation, line length, imports, whitespace, blank lines, and naming. It matters because: (1) **consistency** makes code easier to read and review across a team; (2) **tooling** (`ruff`, `flake8`, `black`) enforces it automatically; (3) it's the **community standard** — nearly all open-source Python follows it; (4) it removes bike-shedding over style."
    },
    {
     "t": "p",
     "text": "Key rules: 4-space indentation, `snake_case` for functions/variables, `PascalCase` for classes, 79-char lines (88 with Black)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** PEP 8 is the shared baseline that linters/formatters enforce so style stops being a discussion."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What does \"Pythonic\" mean? Give examples.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "\"Pythonic\" code leverages Python's idioms and philosophy (`import this`)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "for i, x in enumerate(items): ...   # not  for i in range(len(items))\nif x: ...                            # not  if x == True\nwith open(p) as f: ...               # not  manual open/close\nsquares = [x**2 for x in data]       # not  map(lambda...)\na, b = b, a                          # swap via unpacking",
     "numbered": false
    },
    {
     "t": "p",
     "text": "It also means preferring EAFP (`try/except`) over precondition checks, using generators for large data, and `''.join()` over `+=`."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Pythonic = readable, idiomatic code that uses the language's built-in patterns."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Explain EAFP vs LBYL and why Python prefers EAFP.",
   "terms": [
    "Answer",
    "LBYL",
    "EAFP",
    "faster",
    "avoids TOCTOU race conditions",
    "duck typing"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**LBYL** (Look Before You Leap): check preconditions first — `if key in d: d[key]`.",
      "**EAFP** (Easier to Ask Forgiveness): try it, catch failure — `try: d[key] except KeyError`."
     ]
    },
    {
     "t": "p",
     "text": "Python prefers EAFP because: (1) it's **faster** when failures are rare (no exception overhead in the success path); (2) it **avoids TOCTOU race conditions** (a file can be deleted between `os.path.exists()` and `open()`); (3) it works with **duck typing** — you don't inspect the type, you just attempt the operation. LBYL is fine when the check is cheap and failure is the common case."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Try-and-handle is faster, race-free, and duck-typing-friendly; check-first only when failure is expected."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What are the most common Python anti-patterns?",
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
     "text": "(1) Mutable default arguments (`def f(x=[])` — shared across calls); (2) bare `except:` (swallows `SystemExit`/`KeyboardInterrupt`); (3) `type()` instead of `isinstance()`; (4) string `+=` in loops (O(n²) — use `join`); (5) not using `with` for resources; (6) `from module import *`; (7) deep nested if/else (use guard clauses); (8) magic numbers/strings; (9) ignoring return values (`list.sort()` returns `None`); (10) mutating a list while iterating over it."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Most anti-patterns stem from mutability surprises, over-broad exception handling, and ignoring built-in idioms."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Why are mutable default arguments dangerous?",
   "terms": [
    "Answer",
    "once",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Default argument values are evaluated **once**, at function-definition time — not on each call. A mutable default (list/dict/set) is therefore shared across all calls that don't supply the argument, so mutations persist."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def add(item, lst=[]):    # ❌ one list, reused forever\n    lst.append(item); return lst\nadd(1); add(2)            # [1], then [1, 2]\n\ndef add(item, lst=None):  # ✅ fresh each call\n    if lst is None: lst = []\n    lst.append(item); return lst",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `None` as the sentinel and create the mutable default inside the function."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Explain the late-binding closure gotcha in loops.",
   "terms": [
    "Answer",
    "reference",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Closures capture variables by **reference**, not by value. A lambda created in a loop references the loop variable, which holds its *final* value by the time the lambda runs."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "funcs = [lambda: i for i in range(3)]\n[f() for f in funcs]                 # [2, 2, 2] — not [0, 1, 2]\n\nfuncs = [lambda i=i: i for i in range(3)]   # ✅ bind via default arg\n[f() for f in funcs]                 # [0, 1, 2]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Capture the current value with a default argument (`i=i`) to freeze it per iteration."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "When should you use `is` vs `==`?",
   "terms": [
    "Answer",
    "value equality",
    "identity",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`==` tests **value equality** (calls `__eq__`); `is` tests **identity** (same object in memory). Use `is` only for singletons — `None`, `True`, `False`. Never use `is` for value comparison: small-int caching and interning make `256 is 256` `True` but `257 is 257` possibly `False`, which is an implementation detail."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "if x is None: ...        # ✅\nif x == None: ...        # ❌ works but wrong; could trigger __eq__",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `is` for `None`/identity; `==` for values."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "How should you handle exceptions well?",
   "terms": [
    "Answer",
    "specific",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Catch **specific** exceptions, never bare `except:`. Don't silently swallow errors — log and handle, or re-raise. Use `else` for the success path and `finally` for cleanup. Build a custom exception hierarchy so callers can handle errors at the right granularity, and prefer context managers for guaranteed cleanup."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "try:\n    data = load(path)\nexcept FileNotFoundError:\n    logger.warning(\"missing, using defaults\"); data = defaults()\nexcept ValueError:\n    raise                # can't handle → propagate",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Specific catches, no silent failures, `else/finally` for structure, custom hierarchy for clarity."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What are docstrings and what conventions apply?",
   "terms": [
    "Answer",
    "Google",
    "NumPy",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Docstrings are string literals as the first statement of a module/class/function; `help()` and tools (Sphinx, pdoc) extract them. PEP 257 sets the rules: imperative one-line summary ending in a period, blank line, then details. Popular formats: **Google**, **NumPy**, reST. Document params, returns, and raises; add `>>>` doctests. Don't restate the signature or document obvious getters."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Write concise, format-consistent docstrings that explain what/why, with examples — not implementation details."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "How do you structure a production Python project?",
   "terms": [
    "Answer",
    "src layout",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Use the **src layout**: `src/package/` for code, `tests/` for tests, `pyproject.toml` for metadata and tool config. Load configuration from environment variables (12-factor), expose a clean public API via `__init__.py`, separate concerns (models/services/api/utils), put shared fixtures in `conftest.py`, commit a lock file for reproducible installs, add pre-commit hooks, and run a CI pipeline with lint + type check + tests."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** src layout + pyproject.toml + env config + separated concerns + lock file + CI."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What standard library modules should every Python developer know?",
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
     "text": "`os`/`sys` (system), `pathlib` (paths — prefer over `os.path`), `datetime`/ `zoneinfo` (time), `json`/`csv` (serialization), `collections` (Counter, defaultdict, deque, namedtuple), `functools` (lru_cache, partial, reduce, wraps), `itertools` (lazy combinators), `contextlib` (context managers), `logging`, `subprocess`, `hashlib`/`secrets`, `sqlite3`, `typing`, `dataclasses`, `unittest.mock`. They cover the vast majority of day-to-day needs with zero dependencies."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Reach for the stdlib first — it covers most needs without adding dependencies."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "When would you use the standard library vs a third-party package?",
   "terms": [
    "Answer",
    "Stdlib",
    "Third-party",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Stdlib** when you want zero dependencies (simpler deployment, smaller attack surface), the task is simple (`json`, `csv`, `sqlite3`, `argparse`), or portability matters. **Third-party** when the stdlib is too limited (`requests`/`httpx` over `urllib`, `pandas` over `csv`, `click`/`typer` over `argparse`), for performance, or when it's the community standard (`pytest` over `unittest`, `pydantic` for validation)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Default to stdlib; upgrade to third-party when limitation, performance, or ecosystem demands it."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How do you correctly handle datetimes and timezones?",
   "terms": [
    "Answer",
    "timezone-aware",
    "UTC",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Always use **timezone-aware** datetimes: `datetime.now(timezone.utc)`, never the naive `datetime.now()`. Store in **UTC**, convert to local only for display via `zoneinfo.ZoneInfo(\"Asia/Kolkata\")` (3.9+). Comparing naive and aware datetimes raises `TypeError`. In databases, store UTC ISO 8601 strings or Unix timestamps."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from datetime import datetime, timezone\nutc = datetime.now(timezone.utc)              # store this\nlocal = utc.astimezone(ZoneInfo(\"Asia/Kolkata\"))  # display this",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Aware + UTC for storage, convert at the edges; never mix naive and aware."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "How do you prevent SQL injection in Python?",
   "terms": [
    "Answer",
    "parameterized queries",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Use **parameterized queries** with placeholders — let the driver handle escaping."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "cursor.execute(\"SELECT * FROM users WHERE id = ?\", (user_id,))   # ✅\n# cursor.execute(f\"... WHERE id = {user_id}\")                     # ❌ injection",
     "numbered": false
    },
    {
     "t": "p",
     "text": "This applies to `sqlite3`, `psycopg2`, `mysql-connector`, and all DB-API 2.0 drivers. ORMs like SQLAlchemy parameterize by default."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Never string-format user input into SQL; always use placeholders."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What's the difference between `subprocess.run()` and `subprocess.Popen()`?",
   "terms": [
    "Answer",
    "waits",
    "list",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`run()` is the high-level API: it runs a command, **waits** for completion, and returns a `CompletedProcess` with `stdout`, `stderr`, `returncode`. Use it for simple \"run and get result.\" `Popen()` is low-level: it starts the process and returns immediately, letting you stream output, pipe between processes, and manage lifecycle. Prefer `run()` unless you need `Popen`'s flexibility. Always use the **list** form (`[\"cmd\", \"arg\"]`) to avoid shell injection."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `run()` for simple synchronous calls; `Popen()` for streaming/piping/long-running processes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Why use `secrets` instead of `random` for security?",
   "terms": [
    "Answer",
    "unsafe",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "The `random` module is a pseudo-random generator seeded predictably — fine for simulations, **unsafe** for security because outputs can be predicted. `secrets` uses the OS's cryptographically secure source, suitable for tokens, passwords, and session keys."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import secrets\nsecrets.token_urlsafe(32)      # secure API key / token",
     "numbered": false
    },
    {
     "t": "p",
     "text": "For password storage use bcrypt/argon2 (or `pbkdf2_hmac` with high iterations), and `hmac.compare_digest` for timing-safe comparison."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `secrets` for anything security-sensitive; `random` only for non-security randomness."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is Ruff and why has it replaced multiple tools?",
   "terms": [
    "Answer",
    "Rust",
    "10–100× faster",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Ruff is a Python linter and formatter written in **Rust**. It replaces flake8, isort, pyflakes, pycodestyle, pydocstyle, autoflake, and Black in a single tool that's **10–100× faster** (compiled vs Python). It supports 800+ rules across many plugin families and auto-fixes most violations, configured entirely in `pyproject.toml`. It's the de-facto standard for modern Python projects."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** One fast Rust tool that lints + formats, replacing the whole legacy stack."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is mypy strict mode and how do you adopt it?",
   "terms": [
    "Answer",
    "gradually",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`mypy --strict` turns on all strict flags: requires annotations on every function, disallows bare `Any` generics, checks untyped bodies, forbids implicit `Optional`, and more. Adopt **gradually**: start with `check_untyped_defs`/`warn_return_any`, then `disallow_untyped_defs` + `no_implicit_optional`, then full `strict`. Use per-module overrides to relax rules for tests and migrations."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Strict mode catches the most bugs; ramp up incrementally and relax for tests."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is `pyproject.toml` and why is it preferred over `setup.py`?",
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
     "text": "`pyproject.toml` (PEP 518/621) is the standardized single config file. It replaces `setup.py`, `setup.cfg`, and per-tool configs (`.flake8`, `mypy.ini`, `tox.ini`) with one declarative TOML file that every tool reads. Benefits: declarative (no arbitrary code execution), standardized, and centralized. `setup.py` is legacy and risky because it runs arbitrary Python on install."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** One declarative file for metadata + all tool config; `setup.py` is legacy and unsafe."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Compare pip+requirements.txt, Poetry, and uv.",
   "terms": [
    "Answer",
    "pip + requirements.txt",
    "Poetry",
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
      "**pip + requirements.txt**universal, simple, no lockfile by default. Good for scripts, Docker images, minimal setups (add pip-tools for locking).",
      "**Poetry**lockfile (`poetry.lock`), automatic venv management, dependency resolution, and PyPI publishing. Good for applications and libraries.",
      "**uv**ultra-fast (Rust, by the Ruff team) — 10–100× faster installs/resolves; does venv + pip-compile + pip-sync in one tool. Great for CI speed and large dep trees."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** pip for simple cases, Poetry for full project management, uv when speed matters."
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What's the difference between `^1.2.3` and `~1.2.3` in Poetry?",
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
     "t": "ul",
     "items": [
      "`^1.2.3` (caret, default): `>=1.2.3, <2.0.0` — allows minor + patch updates.",
      "`~1.2.3` (tilde): `>=1.2.3, <1.3.0` — allows only patch updates.",
      "Special case: `^0.2.3` = `>=0.2.3, <0.3.0` (0.x treated as unstable)."
     ]
    },
    {
     "t": "p",
     "text": "Caret is more permissive and is Poetry's default."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Caret allows non-breaking (minor+patch) updates; tilde allows only patches."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "When should you commit `poetry.lock` / a lock file?",
   "terms": [
    "Answer",
    "all",
    "Don't commit it for libraries",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Lock files pin **all** dependencies (direct + transitive) with exact versions and hashes, guaranteeing identical environments everywhere. **Commit it for applications** (APIs/services) for reproducibility across dev, CI, and production. **Don't commit it for libraries** — let consumers resolve their own dependency tree against their other packages."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Lock files in apps (reproducibility), not in libraries (flexibility for consumers)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is `py.typed` / PEP 561?",
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
     "text": "`py.typed` is an empty marker file placed in a package to declare it ships inline type information (PEP 561). Without it, mypy ignores the package's annotations when other projects import it. Libraries should include `py.typed` and list it as package data in `pyproject.toml`."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `py.typed` tells type checkers your library's annotations are real and should be used."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "Why use pre-commit hooks, and what would you put in them?",
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
     "text": "Pre-commit runs quality checks automatically before each `git commit`, catching issues before they reach the repo (and keeping CI green). Typical hooks: `ruff`/`ruff-format` (lint + format), `mypy` (types), and standard hygiene hooks (`trailing-whitespace`, `end-of-file-fixer`, `check-yaml`/`-toml`/`-json`, `detect-private-key`, `no-commit-to-branch main`)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Pre-commit enforces lint/format/type/secret checks locally, before code is committed."
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "How does pytest improve on unittest?",
   "terms": [
    "Answer",
    "fixtures",
    "parametrize",
    "markers"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "pytest uses plain `assert` (no `self.assertEqual` boilerplate), has powerful **fixtures** (composable setup/teardown via `yield`, with scopes), **parametrize** for data-driven tests, **markers** (skip/xfail/custom), rich failure introspection, and a huge plugin ecosystem (`pytest-cov`, `pytest-asyncio`). It also runs existing `unittest` test cases."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@pytest.mark.parametrize(\"n,exp\", [(2, 4), (3, 9)])\ndef test_square(n, exp):\n    assert n**2 == exp",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** pytest is less boilerplate, with fixtures, parametrization, and a strong plugin ecosystem."
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "How do you set up a modern Python project from scratch?",
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
     "lang": "bash",
     "code": "poetry new --src my-project && cd my-project\npoetry add fastapi uvicorn pydantic\npoetry add --group dev ruff mypy pytest pre-commit\n# configure [tool.ruff], [tool.mypy], [tool.pytest.ini_options] in pyproject.toml\npre-commit install\n# add a Makefile: make lint / format / typecheck / test / check\n# add CI: ruff check, ruff format --check, mypy, pytest",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Poetry/uv + src layout + Ruff + mypy + pytest + pre-commit + CI, all configured via pyproject.toml."
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is the difference between shallow and deep copy?",
   "terms": [
    "Answer",
    "shallow",
    "shares",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`copy.copy` makes a **shallow** copy — a new outer object that **shares** the inner objects. `copy.deepcopy` recursively copies everything into a fully independent clone (handles cycles, costs more). Mutating a nested element through a shallow copy affects the original."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import copy\norig = [[1, 2]]\nsh = copy.copy(orig); dp = copy.deepcopy(orig)\norig[0].append(9)\nprint(sh, dp)   # [[1, 2, 9]]  [[1, 2]]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Shallow shares inner objects; deep duplicates the whole structure."
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is the `with` statement / context manager protocol, and why use it?",
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
     "text": "A context manager implements `__enter__` and `__exit__`; `with` guarantees `__exit__` runs even on exceptions, making it ideal for resource cleanup (files, locks, connections). `contextlib.@contextmanager` builds one from a generator."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import contextmanager\n@contextmanager\ndef opened(path):\n    f = open(path)\n    try: yield f\n    finally: f.close()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `with` ensures deterministic cleanup, exception-safe — always prefer it over manual open/close."
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What does `functools.wraps` do and why is it important in decorators?",
   "terms": [
    "Answer",
    "k): return func(a",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "When you wrap a function, the wrapper replaces the original's metadata (`__name__`, `__doc__`, `__module__`, signature). `@functools.wraps(func)` copies that metadata onto the wrapper, so introspection, debugging, and documentation tools still see the original function's identity."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from functools import wraps\ndef deco(func):\n    @wraps(func)\n    def wrapper(*a, **k): return func(*a, **k)\n    return wrapper",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `@wraps` preserves the wrapped function's identity/metadata — always use it in decorators."
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What's the difference between `==` for dicts and merging strategies, and how do you merge dicts cleanly?",
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
     "text": "Modern Python offers concise merges where later keys win:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "merged = {**d1, **d2}        # unpacking (3.5+)\nmerged = d1 | d2             # union operator (3.9+)\nd1 |= d2                     # in-place update (3.9+)\nfrom collections import ChainMap\nview = ChainMap(d2, d1)      # layered view, no copy (first dict wins)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`{**d1, **d2}` and `d1 | d2` produce a new dict; `ChainMap` is a lazy view over the originals."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `|`/`{**a, **b}` for a merged copy, `ChainMap` for a layered no-copy view."
    }
   ]
  },
  {
   "t": "drill",
   "n": "31",
   "q": "Which Ruff rules would you enable for a production project?",
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
     "text": "`E, W, F` (style + pyflakes), `I` (imports), `N` (naming), `UP` (pyupgrade), `B` (bugbear — likely bugs), `A` (builtin shadowing), `C4` (comprehensions), `SIM` (simplify), `S` (security/bandit), `T20` (no print), `RUF` (ruff-specific). Ignore `E501` (line length handled by the formatter); allow `S101` (assert) and `T20` (print) in tests via per-file-ignores, and `F401` in `__init__.py`."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Enable a broad, bug-and-security-focused rule set, then relax sensibly per file (tests, `__init__.py`)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "32",
   "q": "When would you use `unittest.mock.patch` vs dependency injection?",
   "terms": [
    "Answer",
    "Dependency injection",
    "where the object is used",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`patch` temporarily replaces an object that existing code imports directly — handy for legacy code or deeply embedded dependencies. **Dependency injection** (passing the dependency as a parameter, e.g. `def fetch(client=requests)`) is the cleaner design: tests just pass a mock, no patching needed. Prefer DI for new code (more testable, explicit); reach for `patch` when you can't change the call site. The key rule with `patch`: always patch **where the object is used**, not where it's defined — `@patch(\"mymodule.requests.get\")`, not `@patch(\"requests.get\")`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@patch(\"mymodule.requests.get\")          # patch at the usage site\ndef test_fetch(mock_get):\n    mock_get.return_value.json.return_value = {\"ok\": True}\n    assert mymodule.fetch() == {\"ok\": True}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** DI for new, testable code; `patch` (at the usage site) for code you can't restructure."
    }
   ]
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is `uv` and how does it compare to pip?",
   "terms": [
    "Answer",
    "10–100× faster",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`uv` is an ultra-fast package manager written in Rust by the Ruff team. It's **10–100× faster** than pip for installs and resolution, and folds in pip, pip-tools (`compile`/`sync`), and virtualenv creation. It follows PEP 621. Use it when CI/CD speed matters, dependency trees are large, or you want one tool for venv + compile + sync. It does not (yet) publish to PyPI — use Poetry/Hatch for that."
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "uv venv; uv pip install -r requirements.txt\nuv pip compile requirements.in -o requirements.txt\nuv pip sync requirements.txt",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** uv is a Rust-fast drop-in for pip/pip-tools/venv; great for CI speed."
    }
   ]
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is the difference between `subprocess.run()` list form and `shell=True`?",
   "terms": [
    "Answer",
    "list form",
    "no shell injection",
    "user input dangerous",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "The **list form** (`subprocess.run([\"ls\", \"-la\"])`) passes arguments directly to the OS without a shell, so there's **no shell injection** risk and no quoting headaches. `shell=True` runs the command through the shell, enabling pipes/globbing/`&&` but making **user input dangerous** (injection). Prefer the list form; only use `shell=True` for trusted, fixed commands that genuinely need shell features. Set `check=True`, `capture_output=True`, `text=True`, and a `timeout` for robustness. Never use `os.system()`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "subprocess.run([\"ls\", \"-la\"], check=True, capture_output=True, text=True, timeout=30)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** List form is safe and preferred; `shell=True` only for trusted, fixed commands."
    }
   ]
  },
  {
   "t": "drill",
   "n": "35",
   "q": "How do pytest fixtures and their scopes work?",
   "terms": [
    "Answer",
    "Scope",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A fixture is a function decorated with `@pytest.fixture`; tests request it by naming it as a parameter. Code before `yield` is setup, code after `yield` is teardown. **Scope** controls reuse: `function` (default, fresh per test), `class`, `module`, `session` (once per run — good for expensive resources like DB connections). Shared fixtures go in `conftest.py` and are auto-discovered by tests in that directory tree."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@pytest.fixture(scope=\"module\")\ndef db():\n    conn = connect(); yield conn; conn.close()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Fixtures provide setup/teardown via `yield`; scope decides how often they're recreated."
    }
   ]
  }
 ],
 "takeaways": []
});

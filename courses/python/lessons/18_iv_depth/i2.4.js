/* ============================================================================
   INTERVIEW: LANGUAGE DEPTH i2.4 — File I/O & Context Managers
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.4",
 "lede": "**22 interview questions on file i/o & context managers**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 22 questions on file i/o & context managers without prompting",
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
   "q": "1. Comma-separated (Python 3.1+):",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "with open(\"in.txt\") as src, open(\"out.txt\", \"w\") as dst:\n    dst.write(src.read())",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "2. Parenthesized (Python 3.10+):",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "with (\n    open(\"in.txt\") as src,\n    open(\"out.txt\", \"w\") as dst,\n):\n    dst.write(src.read())",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "3. Using `ExitStack` (dynamic/variable number):",
   "terms": [
    "original",
    "lost",
    "Best practice",
    "Class-based",
    "Generator-based",
    "Use case"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import ExitStack\n\nwith ExitStack() as stack:\n    files = [stack.enter_context(open(f)) for f in file_list]",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q14. What happens if `__exit__` raises an exception?"
    },
    {
     "t": "p",
     "text": "**A:** If `__exit__` raises an exception: - The **original** exception (if any) from the `with` body is **lost** (replaced). - The new exception from `__exit__` propagates."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Broken:\n    def __enter__(self):\n        return self\n    def __exit__(self, *args):\n        raise RuntimeError(\"exit failed\")\n\ntry:\n    with Broken():\n        raise ValueError(\"original\")\nexcept RuntimeError as e:\n    print(e)    # \"exit failed\" — original ValueError is lost",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Best practice:** Wrap cleanup in `__exit__` with `try/except` to avoid masking the original error."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q15. How do you write a custom context manager that suppresses exceptions?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "p",
     "text": "**Class-based:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Suppress:\n    def __init__(self, *exceptions):\n        self.exceptions = exceptions\n    \n    def __enter__(self):\n        return self\n    \n    def __exit__(self, exc_type, exc_val, exc_tb):\n        return exc_type is not None and issubclass(exc_type, self.exceptions)\n\nwith Suppress(ZeroDivisionError):\n    1 / 0\nprint(\"Continues!\")    # Runs fine",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Generator-based:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import contextmanager\n\n@contextmanager\ndef suppress(*exceptions):\n    try:\n        yield\n    except exceptions:\n        pass",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Or just use `contextlib.suppress(*exceptions)` from the standard library."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q16. What is `contextlib.suppress`? Give a use case."
    },
    {
     "t": "p",
     "text": "**A:** `suppress` is a context manager that silences specified exceptions."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import suppress\nimport os\n\n# Instead of:\ntry:\n    os.remove(\"temp.txt\")\nexcept FileNotFoundError:\n    pass\n\n# Use:\nwith suppress(FileNotFoundError):\n    os.remove(\"temp.txt\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use case:** Ignoring expected, harmless errors — like deleting a file that may not exist, or accessing a dict key that may be missing."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q17. What is `contextlib.redirect_stdout`?"
    },
    {
     "t": "p",
     "text": "**A:** It temporarily redirects `sys.stdout` to another file-like object."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import redirect_stdout\nimport io\n\n# Capture print output\nbuffer = io.StringIO()\nwith redirect_stdout(buffer):\n    print(\"captured\")\n\noutput = buffer.getvalue()    # \"captured\\n\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use case:** Capturing output of functions that print directly, for testing or logging."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q18. What is `contextlib.nullcontext`?"
    },
    {
     "t": "p",
     "text": "**A:** A no-op context manager that does nothing. Useful as a **stand-in** when a context manager is optional."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import nullcontext\nimport threading\n\ndef process(data, lock=None):\n    with lock or nullcontext():\n        return sum(data)\n\n# Without locking:\nprocess([1, 2, 3])\n\n# With locking:\nprocess([1, 2, 3], lock=threading.Lock())",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q19. How do you read and write JSON files?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import json\n\n# Write\ndata = {\"users\": [{\"name\": \"Alice\", \"age\": 30}]}\nwith open(\"data.json\", \"w\") as f:\n    json.dump(data, f, indent=2)\n\n# Read\nwith open(\"data.json\") as f:\n    loaded = json.load(f)\n\nprint(loaded[\"users\"][0][\"name\"])   # Alice",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Common pitfalls:** - `json.dump`/`json.load` work with **files**. - `json.dumps`/`json.loads` work with **strings**. - Non-serializable types need a custom encoder. - JSON keys must be strings; integer keys are converted to strings."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q20. What is the difference between `json.dump` and `json.dumps`?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "table",
     "head": [
      "Function",
      "Input → Output",
      "I/O Type"
     ],
     "rows": [
      [
       "`json.dumps(obj)`",
       "Python object → JSON `str`",
       "In-memory string"
      ],
      [
       "`json.dump(obj, fp)`",
       "Python object → file",
       "Writes to file object"
      ],
      [
       "`json.loads(s)`",
       "JSON `str` → Python object",
       "In-memory string"
      ],
      [
       "`json.load(fp)`",
       "File → Python object",
       "Reads from file object"
      ]
     ]
    },
    {
     "t": "p",
     "text": "The `s` suffix stands for **\"string\"**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# dumps → string\ns = json.dumps({\"a\": 1})       # '{\"a\": 1}'\n\n# dump → file\nwith open(\"out.json\", \"w\") as f:\n    json.dump({\"a\": 1}, f)",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q21. What are `NamedTemporaryFile` and `TemporaryDirectory`?"
    },
    {
     "t": "p",
     "text": "**A:** From the `tempfile` module:"
    },
    {
     "t": "p",
     "text": "**`NamedTemporaryFile`:** Creates a temporary file with a visible name on the filesystem."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import tempfile\n\nwith tempfile.NamedTemporaryFile(mode=\"w\", suffix=\".csv\", delete=True) as f:\n    f.write(\"data\")\n    print(f.name)    # /tmp/tmp_xyz.csv\n# File is auto-deleted when closed (delete=True is default)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**`TemporaryDirectory`:** Creates a temporary directory."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with tempfile.TemporaryDirectory() as tmpdir:\n    path = Path(tmpdir) / \"file.txt\"\n    path.write_text(\"hello\")\n# Entire directory tree is auto-deleted",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use case:** Testing, intermediate file processing, avoiding manual cleanup."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q22. What is `r+` mode? How does it differ from `w+`?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "table",
     "head": [
      "Mode",
      "File Must Exist",
      "Truncates",
      "Initial Position"
     ],
     "rows": [
      [
       "`r+`",
       "Yes",
       "No",
       "Beginning"
      ],
      [
       "`w+`",
       "No (creates if missing)",
       "Yes",
       "Beginning (file is empty)"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# r+ — read and write without truncating\nwith open(\"data.txt\", \"r+\") as f:\n    content = f.read()           # Read existing content\n    f.write(\"appended text\")     # Write at current position\n\n# w+ — creates/truncates, then allows reading\nwith open(\"data.txt\", \"w+\") as f:\n    f.write(\"new content\")\n    f.seek(0)\n    print(f.read())              # \"new content\"",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q23. How do you copy a file in Python?"
    },
    {
     "t": "p",
     "text": "**A:** Multiple approaches:"
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "1. `shutil` (recommended):",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import shutil\n\nshutil.copy(\"src.txt\", \"dst.txt\")        # Copies file + permissions\nshutil.copy2(\"src.txt\", \"dst.txt\")       # Also copies metadata (timestamps)\nshutil.copyfile(\"src.txt\", \"dst.txt\")    # Only copies content",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "2. Manual (for fine-grained control):",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "with open(\"src.txt\", \"rb\") as src, open(\"dst.txt\", \"wb\") as dst:\n    while chunk := src.read(8192):\n        dst.write(chunk)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "3. `pathlib` (small files):",
   "terms": [
    "universal newline translation",
    "When needed",
    "I/O-bound async operations",
    "Generator-based",
    "not specified",
    "This causes cross-platform bugs"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from pathlib import Path\nPath(\"dst.txt\").write_bytes(Path(\"src.txt\").read_bytes())",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q24. What is the purpose of `newline=\"\"` when opening CSV files?"
    },
    {
     "t": "p",
     "text": "**A:** The `newline=\"\"` parameter prevents Python's **universal newline translation** from interfering with the CSV module's own newline handling."
    },
    {
     "t": "p",
     "text": "Without it, on Windows: - Python translates `\\r\\n` → `\\n` when reading. - The CSV module may then mishandle row boundaries. - When writing, you may get double newlines (`\\r\\r\\n`)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Correct\nwith open(\"data.csv\", \"w\", newline=\"\") as f:\n    writer = csv.writer(f)\n    writer.writerow([\"a\", \"b\"])\n\n# Incorrect — may produce blank rows between data rows on Windows\nwith open(\"data.csv\", \"w\") as f:\n    writer = csv.writer(f)\n    writer.writerow([\"a\", \"b\"])",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q25. What are async context managers? When do you need them?"
    },
    {
     "t": "p",
     "text": "**A:** Async context managers implement `__aenter__` and `__aexit__` (both `async` methods) and are used with `async with`."
    },
    {
     "t": "p",
     "text": "**When needed:** When setup/teardown involves **I/O-bound async operations** — database connections, HTTP sessions, async file I/O, async locks."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import asyncio\n\nclass AsyncResource:\n    async def __aenter__(self):\n        await asyncio.sleep(0.1)    # Async setup\n        return self\n    \n    async def __aexit__(self, *args):\n        await asyncio.sleep(0.1)    # Async teardown\n\nasync def main():\n    async with AsyncResource() as res:\n        print(\"Using resource\")\n\nasyncio.run(main())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Generator-based:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import asynccontextmanager\n\n@asynccontextmanager\nasync def async_db():\n    conn = await connect_db()\n    try:\n        yield conn\n    finally:\n        await conn.close()",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q26. What is `encoding` parameter in `open()`? What happens if you don't specify it?"
    },
    {
     "t": "p",
     "text": "**A:** The `encoding` parameter specifies the character encoding used to convert between bytes (on disk) and strings (in memory)."
    },
    {
     "t": "p",
     "text": "If **not specified**, Python uses `locale.getpreferredencoding()`: - Linux/macOS: Usually `utf-8` - Windows: Varies (e.g., `cp1252`, `cp936`)"
    },
    {
     "t": "p",
     "text": "**This causes cross-platform bugs:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# BAD — encoding is platform-dependent\nwith open(\"data.txt\") as f:\n    data = f.read()\n\n# GOOD — explicit encoding\nwith open(\"data.txt\", encoding=\"utf-8\") as f:\n    data = f.read()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Python 3.15+ (PEP 686):** UTF-8 will become the default. Until then, always specify `encoding=\"utf-8\"`."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q27. How do you handle file not found errors gracefully?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from pathlib import Path\n\n# Approach 1: EAFP (Easier to Ask Forgiveness than Permission) — Pythonic\ntry:\n    with open(\"config.json\") as f:\n        config = json.load(f)\nexcept FileNotFoundError:\n    config = {}       # Default config\n\n# Approach 2: LBYL (Look Before You Leap)\npath = Path(\"config.json\")\nif path.exists():\n    config = json.loads(path.read_text())\nelse:\n    config = {}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**EAFP is preferred** in Python because: - It avoids race conditions (file could be deleted between check and open). - It's more Pythonic. - It's faster in the common case (file exists)."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q28. What does `f.flush()` do? How is it different from `f.close()`?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "ul",
     "items": [
      "**`flush()`** forces the internal buffer to be written to the OS. The file remains open.",
      "**`close()`** flushes the buffer **and** releases the file handle. The file can no longer be used."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with open(\"log.txt\", \"w\") as f:\n    f.write(\"Important log entry\")\n    f.flush()               # Ensures data reaches disk immediately\n    # File is still open for more writes\n    f.write(\" - more data\")\n# close() is called automatically by the context manager",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use case for `flush()`:** Real-time logging where you want data to be visible immediately without closing the file."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "1. Lazy import (move inside function):",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# a.py\ndef func_a():\n    from b import func_b     # Imported at call time, not import time\n    return func_b()",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "2. Import the module, not the name:",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# a.py\nimport b\ndef func_a():\n    return b.func_b()        # Resolved at call time",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "3. Restructure — extract common code:",
   "terms": [
    "Bonus — For type hints only",
    "list of directory paths",
    "Import resolution order",
    "Built-in modules",
    "sys.path",
    "Modifying sys.path"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# common.py\ndef shared_func(): ...\n\n# a.py\nfrom common import shared_func\n\n# b.py\nfrom common import shared_func",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Bonus — For type hints only:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from __future__ import annotations\nfrom typing import TYPE_CHECKING\n\nif TYPE_CHECKING:\n    from b import ClassB     # Only for type checkers, not runtime",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q7. What is `sys.path`? How does Python resolve imports?"
    },
    {
     "t": "p",
     "text": "**A:** `sys.path` is a **list of directory paths** where Python looks for modules."
    },
    {
     "t": "p",
     "text": "**Import resolution order:** 1. `sys.modules` — cache of already-imported modules. 2. **Built-in modules** — `sys`, `os`, `math`, etc. 3. **`sys.path`** directories, in order: - Script's directory (or `\"\"` for interactive). - `PYTHONPATH` environment variable. - Installation defaults (`site-packages`, etc.)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nprint(sys.path)\n# ['', '/usr/lib/python3.12', '/usr/lib/python3.12/lib-dynload',\n#  '/home/user/.local/lib/python3.12/site-packages', ...]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Modifying `sys.path`** (not recommended in production):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "sys.path.insert(0, \"/custom/path\")",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q8. How does Python's import system work internally?"
    },
    {
     "t": "p",
     "text": "**A:** When you write `import foo`:"
    },
    {
     "t": "ol",
     "items": [
      "**Check `sys.modules`**if `foo` is already cached, return it immediately.",
      "**Find the module**use `sys.meta_path` finders: - `BuiltinImporter` — for built-in modules. - `FrozenImporter` — for frozen modules. - `PathFinder` — searches `sys.path` directories.",
      "**Load the module**the finder returns a **spec** (`ModuleSpec`), which has a **loader**.",
      "**Create module object**`types.ModuleType`.",
      "**Execute module code**top-level statements run once.",
      "**Cache in `sys.modules`**future imports use the cache."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import importlib.util\n\nspec = importlib.util.find_spec(\"json\")\nprint(spec.origin)      # /usr/lib/python3.12/json/__init__.py\nprint(spec.loader)      # <_frozen_importlib_external.SourceFileLoader>",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q9. How do you dynamically import a module using `importlib`?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import importlib\n\n# Basic dynamic import\nmod = importlib.import_module(\"json\")\ndata = mod.loads('{\"a\": 1}')\n\n# Import submodule\nsub = importlib.import_module(\"os.path\")\nprint(sub.exists(\"/tmp\"))\n\n# Relative import\nutil = importlib.import_module(\".utils\", package=\"mypackage\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use cases:** - Plugin systems — load modules by name at runtime. - Configuration-driven imports. - Optional dependencies."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Plugin loader\ndef load_plugin(name):\n    try:\n        mod = importlib.import_module(f\"plugins.{name}\")\n        return mod.Plugin()\n    except (ImportError, AttributeError):\n        return None",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Check if module exists without importing:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "spec = importlib.util.find_spec(\"numpy\")\nif spec:\n    print(\"numpy is available\")",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q10. What are virtual environments? Why are they important?"
    },
    {
     "t": "p",
     "text": "**A:** A virtual environment is an **isolated Python environment** with its own installed packages, separate from the global Python installation."
    },
    {
     "t": "p",
     "text": "**Why they matter:** 1. **Dependency isolation** — Project A needs `requests==2.28`, Project B needs `requests==2.31` — no conflict. 2. **Reproducibility** — Pin exact versions for consistent deployments. 3. **Clean global environment** — Don't pollute system Python. 4. **Permission safety** — Install packages without admin/root."
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "# Create\npython -m venv .venv\n\n# Activate (Windows)\n.venv\\Scripts\\activate\n\n# Activate (Linux/macOS)\nsource .venv/bin/activate\n\n# Install packages (isolated)\npip install requests==2.31.0\n\n# Deactivate\ndeactivate",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q11. What is the difference between `pip freeze` and `pip install -r requirements.txt`?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "ul",
     "items": [
      "**`pip freeze`**outputs all installed packages and their exact versions to stdout."
     ]
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "pip freeze > requirements.txt\n# Output: requests==2.31.0, numpy==1.26.2, ...",
     "numbered": false
    },
    {
     "t": "ul",
     "items": [
      "**`pip install -r requirements.txt`**installs all packages listed in the file."
     ]
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "pip install -r requirements.txt",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key points:** - `pip freeze` includes ALL packages (including transitive dependencies). - For cleaner files, manually curate `requirements.txt` with only direct dependencies. - Use `pip-compile` (from `pip-tools`) or `uv pip compile` for proper lock files."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q12. What is the difference between `Poetry` and `pip`?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "pip",
      "Poetry"
     ],
     "rows": [
      [
       "Lock file",
       "❌ Manual (`pip freeze`)",
       "✅ Automatic (`poetry.lock`)"
      ],
      [
       "Dependency resolution",
       "Basic",
       "Advanced (SAT solver)"
      ],
      [
       "Virtual env",
       "Manual (`python -m venv`)",
       "Built-in"
      ],
      [
       "Config file",
       "`requirements.txt`",
       "`pyproject.toml`"
      ],
      [
       "Dev dependencies",
       "Separate files",
       "`--group dev`"
      ],
      [
       "Publish to PyPI",
       "Needs `twine`",
       "Built-in `poetry publish`"
      ],
      [
       "Reproducibility",
       "❌ Without lock",
       "✅ Lock file"
      ],
      [
       "Scripts",
       "❌",
       "`poetry run`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "# Poetry workflow\npoetry init                      # Create pyproject.toml\npoetry add requests              # Add dependency\npoetry add pytest --group dev    # Dev dependency\npoetry install                   # Install all from lock file\npoetry run python main.py        # Run in venv",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q13. What are `.pyc` files and `__pycache__`?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "ul",
     "items": [
      "**`.pyc` files**compiled Python bytecode. Python compiles `.py` files to bytecode for faster startup.",
      "**`__pycache__/`**directory where `.pyc` files are stored."
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "mypackage/\n    __pycache__/\n        utils.cpython-312.pyc     # Compiled for Python 3.12\n    utils.py",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key facts:** - `.pyc` files speed up **import time** (skip compilation), not **execution time**. - Automatically regenerated when source `.py` file changes. - Include Python version in filename for compatibility. - Safe to delete — Python recreates them."
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "# Prevent .pyc creation\npython -B script.py\n# or\nexport PYTHONDONTWRITEBYTECODE=1",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q14. What are namespace packages?"
    },
    {
     "t": "p",
     "text": "**A:** Namespace packages (PEP 420, Python 3.3+) are packages **without** `__init__.py`. They allow a single logical package to span **multiple directories**."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "# Directory 1:\nlib1/company/web/app.py         # No __init__.py anywhere\n\n# Directory 2:\nlib2/company/data/pipeline.py   # No __init__.py anywhere",
     "numbered": false
    },
    {
     "t": "p",
     "text": "If both `lib1/` and `lib2/` are on `sys.path`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from company.web import app\nfrom company.data import pipeline\n# Both work — namespace merges directories",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Regular vs namespace packages:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "Regular",
      "Namespace"
     ],
     "rows": [
      [
       "`__init__.py`",
       "Required",
       "Absent"
      ],
      [
       "Single directory",
       "✅",
       "Can span multiple"
      ],
      [
       "`__file__`",
       "Set",
       "Not set"
      ],
      [
       "Use case",
       "Normal packages",
       "Distributed packages, plugins"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Best practice:** Use regular packages (with `__init__.py`) unless you specifically need namespace packages."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q15. What is `__main__.py` in a package?"
    },
    {
     "t": "p",
     "text": "**A:** `__main__.py` is executed when a package is run with `python -m package_name`."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "mypackage/\n    __init__.py\n    __main__.py     # Entry point\n    core.py",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# mypackage/__main__.py\nfrom .core import run\n\nif __name__ == \"__main__\":\n    run()",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "python -m mypackage       # Executes __main__.py",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use case:** Making packages directly executable (like `python -m json.tool`, `python -m http.server`)."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q16. What happens when you import a module twice?"
    },
    {
     "t": "p",
     "text": "**A:** The module is **executed only once**. The second import retrieves it from `sys.modules` cache."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# counter.py\ncount = 0\ncount += 1\nprint(f\"Executed! count = {count}\")",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import counter      # Prints: Executed! count = 1\nimport counter      # No output — uses cache\nprint(counter.count) # 1",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Force re-execution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import importlib\nimportlib.reload(counter)    # Re-executes module code",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`reload()` updates the module object **in place**, but other modules that already imported names won't see changes."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q17. How do you check if a module is installed without importing it?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import importlib.util\n\nspec = importlib.util.find_spec(\"numpy\")\nif spec is not None:\n    print(\"numpy is installed\")\nelse:\n    print(\"numpy is NOT installed\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Alternative — try/except:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "try:\n    import numpy\n    HAS_NUMPY = True\nexcept ImportError:\n    HAS_NUMPY = False",
     "numbered": false
    },
    {
     "t": "p",
     "text": "The `find_spec` approach is better because it doesn't execute the module's code."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q18. What is `PYTHONPATH`? How does it relate to `sys.path`?"
    },
    {
     "t": "p",
     "text": "**A:** `PYTHONPATH` is an **environment variable** containing a list of directories. These directories are added to `sys.path` at startup, allowing Python to find modules in custom locations."
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "# Set PYTHONPATH\n# Linux/macOS:\nexport PYTHONPATH=\"/my/libs:/other/libs\"\n\n# Windows:\nset PYTHONPATH=C:\\my\\libs;C:\\other\\libs",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\n# /my/libs and /other/libs are now in sys.path",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Order of `sys.path` construction:** 1. Script directory (or `\"\"`) 2. **`PYTHONPATH`** directories 3. Installation defaults"
    },
    {
     "t": "p",
     "text": "**In production:** Prefer proper packaging over `PYTHONPATH` hacks."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q19. What is the difference between `import foo` and `from foo import bar`?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "`import foo`",
      "`from foo import bar`"
     ],
     "rows": [
      [
       "Namespace",
       "`foo.bar`",
       "`bar` directly"
      ],
      [
       "What's bound",
       "Module object `foo`",
       "Name `bar` only"
      ],
      [
       "Memory",
       "Same (full module is loaded either way)",
       "Same (full module is loaded either way)"
      ],
      [
       "Updates",
       "`foo.bar` reflects changes",
       "`bar` is a snapshot (for immutables)"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# import foo\nimport math\nprint(math.pi)         # Access via module\n\n# from foo import bar\nfrom math import pi\nprint(pi)              # Direct access\n\n# Gotcha with mutable vs immutable\nfrom config import DEBUG    # DEBUG = True\n# If config.DEBUG changes later, our local DEBUG won't update\n\nimport config\n# config.DEBUG always reflects current value",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Both forms execute the entire module** — `from foo import bar` doesn't skip loading the rest of `foo`."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q20. How do you create a distributable Python package?"
    },
    {
     "t": "p",
     "text": "**A:** Modern approach using `pyproject.toml`:"
    },
    {
     "t": "p",
     "text": "**Project structure:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "mypackage/\n    pyproject.toml\n    README.md\n    src/\n        mypackage/\n            __init__.py\n            core.py",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**`pyproject.toml`:**"
    },
    {
     "t": "code",
     "lang": "toml",
     "code": "[project]\nname = \"mypackage\"\nversion = \"1.0.0\"\ndescription = \"My awesome package\"\nrequires-python = \">=3.10\"\ndependencies = [\"requests>=2.28\"]\n\n[build-system]\nrequires = [\"setuptools>=68.0\"]\nbuild-backend = \"setuptools.build_meta\"\n\n[tool.setuptools.packages.find]\nwhere = [\"src\"]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Build and publish:**"
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "# Build\npython -m build                   # Creates dist/*.whl and dist/*.tar.gz\n\n# Upload to PyPI\npython -m twine upload dist/*\n\n# Or with Poetry:\npoetry build\npoetry publish",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q21. What is `importlib.reload()`? When should you use it?"
    },
    {
     "t": "p",
     "text": "**A:** `importlib.reload()` re-executes a previously imported module's code, updating the module object **in place**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import importlib\nimport my_module\n\n# After editing my_module.py:\nimportlib.reload(my_module)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use:** - Interactive development (REPL, Jupyter notebooks). - Long-running processes that need to pick up config changes."
    },
    {
     "t": "p",
     "text": "**Caveats:** - `from my_module import func` — `func` still points to the old version. - `import my_module` then `my_module.func` — reflects the reloaded version. - Class instances created before reload still use old class definitions. - **Not safe for production** — restart the process instead."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q22. What is the difference between `venv` and `virtualenv`?"
    },
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`venv`",
      "`virtualenv`"
     ],
     "rows": [
      [
       "Built-in",
       "✅ (Python 3.3+)",
       "❌ (pip install)"
      ],
      [
       "Speed",
       "Slower",
       "Faster"
      ],
      [
       "Python versions",
       "Current only",
       "Can target other versions"
      ],
      [
       "Features",
       "Basic",
       "More options (seed packages, etc.)"
      ],
      [
       "Recommendation",
       "Default choice",
       "When extra features needed"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "# venv (built-in)\npython -m venv .venv\n\n# virtualenv (third-party)\npip install virtualenv\nvirtualenv .venv",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**For most use cases, `venv` is sufficient.** Use `virtualenv` if you need to create envs for different Python versions or need faster creation."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q23. How does `from __future__ import annotations` affect imports?"
    },
    {
     "t": "p",
     "text": "**A:** It makes **all annotations** (type hints) lazy — they become strings evaluated only by type checkers, not at runtime."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from __future__ import annotations\n\nclass Tree:\n    def __init__(self, children: list[Tree]):    # No NameError!\n        self.children = children",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Without it, `list[Tree]` would fail because `Tree` isn't fully defined yet."
    },
    {
     "t": "p",
     "text": "**Impact on circular imports:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from __future__ import annotations\nfrom typing import TYPE_CHECKING\n\nif TYPE_CHECKING:\n    from other_module import OtherClass    # Only for type checkers\n\ndef process(obj: OtherClass) -> None:      # String annotation, no runtime import\n    pass",
     "numbered": false
    },
    {
     "t": "p",
     "text": "This breaks the circular dependency at runtime while keeping type safety."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q24. What are entry points in Python packages?"
    },
    {
     "t": "p",
     "text": "**A:** Entry points define CLI commands or plugin hooks that are installed with the package."
    },
    {
     "t": "code",
     "lang": "toml",
     "code": "# pyproject.toml\n[project.scripts]\nmyapp = \"mypackage.cli:main\"          # CLI command\n\n[project.gui-scripts]\nmyapp-gui = \"mypackage.gui:main\"      # GUI command\n\n[project.entry-points.\"myapp.plugins\"]\ncsv = \"mypackage.plugins.csv:CsvPlugin\"\njson = \"mypackage.plugins.json:JsonPlugin\"",
     "numbered": false
    },
    {
     "t": "p",
     "text": "After `pip install mypackage`:"
    },
    {
     "t": "code",
     "lang": "bash",
     "code": "myapp --help        # Runs mypackage.cli:main()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Plugin discovery:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from importlib.metadata import entry_points\n\nplugins = entry_points(group=\"myapp.plugins\")\nfor ep in plugins:\n    plugin_class = ep.load()\n    plugin = plugin_class()",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What are the different file modes in Python? Explain `r`, `w`, `a`, and `x`.",
   "body": [
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "table",
     "head": [
      "Mode",
      "Behavior"
     ],
     "rows": [
      [
       "`r`",
       "**Read only.** File must exist; raises `FileNotFoundError` otherwise. Default mode."
      ],
      [
       "`w`",
       "**Write only.** Creates the file if it doesn't exist. **Truncates** (empties) the file if it does exist."
      ],
      [
       "`a`",
       "**Append only.** Creates the file if it doesn't exist. Writes always go to the **end** of the file; existing content is preserved."
      ],
      [
       "`x`",
       "**Exclusive create.** Creates a new file for writing. Raises `FileExistsError` if the file already exists."
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 'x' prevents accidental overwrites\ntry:\n    with open(\"config.txt\", \"x\") as f:\n        f.write(\"new config\")\nexcept FileExistsError:\n    print(\"Config already exists — not overwritten!\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key difference:** `w` is destructive (truncates), `a` is additive (appends), `x` is safe-create (fails if exists)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is a context manager? Why should we use one?",
   "body": [
    {
     "t": "p",
     "text": "**A:** A context manager is an object that defines setup and teardown actions for a `with` statement. It implements the **context manager protocol** — two methods: `__enter__()` and `__exit__()`."
    },
    {
     "t": "p",
     "text": "**Why use them:** 1. **Guaranteed cleanup** — resources are released even if exceptions occur. 2. **No resource leaks** — files, connections, locks are always closed/released. 3. **Cleaner code** — no need for explicit `try/finally` blocks."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Without context manager — risky\nf = open(\"data.txt\")\ntry:\n    data = f.read()\nfinally:\n    f.close()\n\n# With context manager — clean and safe\nwith open(\"data.txt\") as f:\n    data = f.read()",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "How do `__enter__` and `__exit__` work? What does `__exit__` return?",
   "body": [
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "ul",
     "items": [
      "**`__enter__(self)`**Called when entering the `with` block. Its return value is bound to the variable after `as`.",
      "**`__exit__(self, exc_type, exc_val, exc_tb)`**Called when exiting the `with` block (whether normally or due to an exception)."
     ]
    },
    {
     "t": "p",
     "text": "**Parameters of `__exit__`:** - `exc_type`: Exception class (or `None` if no exception). - `exc_val`: Exception instance (or `None`). - `exc_tb`: Traceback object (or `None`)."
    },
    {
     "t": "p",
     "text": "**Return value of `__exit__`:** - If `__exit__` returns a **truthy** value (`True`), the exception is **suppressed** — it does not propagate. - If it returns **falsy** (`False`, `None`), the exception **propagates** normally."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class SafeBlock:\n    def __enter__(self):\n        return self\n    \n    def __exit__(self, exc_type, exc_val, exc_tb):\n        if exc_type is ValueError:\n            print(f\"Suppressed: {exc_val}\")\n            return True        # Suppress ValueError\n        return False           # Let other exceptions propagate\n\nwith SafeBlock():\n    raise ValueError(\"handled\")    # Suppressed\nprint(\"Continues!\")                 # Prints normally",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How does the `@contextmanager` decorator work?",
   "body": [
    {
     "t": "p",
     "text": "**A:** It's from `contextlib` and converts a **generator function** (with exactly one `yield`) into a context manager, without writing a class."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import contextmanager\n\n@contextmanager\ndef managed_resource():\n    print(\"Setup\")          # __enter__ logic\n    resource = acquire()\n    try:\n        yield resource      # Value bound to `as` variable\n    finally:\n        print(\"Teardown\")  # __exit__ logic (always runs)\n        release(resource)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**How it works internally:** 1. Code **before** `yield` runs when entering the `with` block (equivalent to `__enter__`). 2. The yielded value is returned to the caller (bound to `as`). 3. Code **after** `yield` runs when exiting the block (equivalent to `__exit__`). 4. If an exception occurs in the `with` body, it is thrown into the generator at the `yield` point. 5. Use `try/finally` to ensure cleanup runs even on exceptions."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is `pathlib`? Why prefer it over `os.path`?",
   "body": [
    {
     "t": "p",
     "text": "**A:** `pathlib` (introduced in Python 3.4) provides an **object-oriented** interface for filesystem paths."
    },
    {
     "t": "p",
     "text": "**Why prefer `pathlib`:**"
    },
    {
     "t": "table",
     "head": [
      "Advantage",
      "Example"
     ],
     "rows": [
      [
       "OOP interface",
       "`Path(\"a\") / \"b\" / \"c\"` vs `os.path.join(\"a\", \"b\", \"c\")`"
      ],
      [
       "Readable",
       "`p.stem`, `p.suffix` vs `os.path.splitext(p)`"
      ],
      [
       "Built-in I/O",
       "`p.read_text()`, `p.write_text()`"
      ],
      [
       "Cross-platform",
       "Handles `/` and `\\` transparently"
      ],
      [
       "Method chaining",
       "`p.parent.parent / \"other\"`"
      ],
      [
       "Glob built-in",
       "`p.rglob(\"*.py\")`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from pathlib import Path\n\np = Path(\"/home/user/project/data.csv\")\nprint(p.stem)        # data\nprint(p.suffix)      # .csv\nprint(p.parent)      # /home/user/project\n\n# Read file in one line\ncontent = Path(\"config.json\").read_text(encoding=\"utf-8\")\n\n# Create nested directories\nPath(\"output/reports/2025\").mkdir(parents=True, exist_ok=True)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How do you serialize and deserialize JSON in Python?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Use the `json` module:"
    },
    {
     "t": "table",
     "head": [
      "Function",
      "Direction",
      "I/O"
     ],
     "rows": [
      [
       "`json.dumps(obj)`",
       "Python → JSON string",
       "In-memory"
      ],
      [
       "`json.loads(s)`",
       "JSON string → Python",
       "In-memory"
      ],
      [
       "`json.dump(obj, f)`",
       "Python → JSON file",
       "File"
      ],
      [
       "`json.load(f)`",
       "JSON file → Python",
       "File"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import json\n\n# Serialize\ndata = {\"name\": \"Alice\", \"scores\": [90, 85, 92]}\njson_string = json.dumps(data, indent=2)\n\n# Deserialize\nobj = json.loads(json_string)\n\n# File I/O\nwith open(\"data.json\", \"w\") as f:\n    json.dump(data, f, indent=2)\n\nwith open(\"data.json\") as f:\n    loaded = json.load(f)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Non-serializable types** (like `datetime`, custom classes) require a custom `JSONEncoder`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from datetime import datetime\n\nclass CustomEncoder(json.JSONEncoder):\n    def default(self, obj):\n        if isinstance(obj, datetime):\n            return obj.isoformat()\n        return super().default(obj)\n\njson.dumps({\"time\": datetime.now()}, cls=CustomEncoder)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "How do you read large files efficiently in Python?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Never use `f.read()` or `f.readlines()` for large files — they load everything into memory."
    },
    {
     "t": "p",
     "text": "**Method 1: Iterate line by line** (most common)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with open(\"huge.log\") as f:\n    for line in f:                 # Reads one line at a time\n        process(line)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Method 2: Read fixed-size chunks**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with open(\"huge.bin\", \"rb\") as f:\n    while chunk := f.read(8192):   # 8KB chunks\n        process(chunk)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Method 3: Memory-mapped files** (for random access)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import mmap\n\nwith open(\"huge.bin\", \"r+b\") as f:\n    mm = mmap.mmap(f.fileno(), 0)\n    # Access like bytes — OS handles paging\n    print(mm[100:200])\n    mm.close()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Method 4: Generator pipeline**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def read_chunks(path, size=65536):\n    with open(path, \"rb\") as f:\n        while chunk := f.read(size):\n            yield chunk",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the difference between text mode and binary mode?",
   "body": [
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Text Mode (`\"r\"`, `\"w\"`)",
      "Binary Mode (`\"rb\"`, `\"wb\"`)"
     ],
     "rows": [
      [
       "Data type",
       "`str`",
       "`bytes`"
      ],
      [
       "Newlines",
       "Translated (`\\r\\n` → `\\n` on Windows)",
       "No translation, raw bytes"
      ],
      [
       "Encoding",
       "Applied (default: platform-dependent)",
       "No encoding applied"
      ],
      [
       "Use cases",
       "`.txt`, `.csv`, `.json`, `.py`",
       "Images, PDFs, `.zip`, executables"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Text mode\nwith open(\"file.txt\", \"r\") as f:\n    data = f.read()          # type: str\n\n# Binary mode\nwith open(\"image.png\", \"rb\") as f:\n    data = f.read()          # type: bytes",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Important:** Always open non-text files in binary mode to avoid data corruption from newline translation."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What do `seek()` and `tell()` do?",
   "body": [
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "ul",
     "items": [
      "**`tell()`** returns the current position (byte offset) in the file.",
      "**`seek(offset, whence)`** moves the file cursor to a specific position."
     ]
    },
    {
     "t": "table",
     "head": [
      "`whence`",
      "Value",
      "Meaning"
     ],
     "rows": [
      [
       "`os.SEEK_SET`",
       "0",
       "From beginning of file (default)"
      ],
      [
       "`os.SEEK_CUR`",
       "1",
       "From current position"
      ],
      [
       "`os.SEEK_END`",
       "2",
       "From end of file"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with open(\"data.txt\", \"rb\") as f:\n    f.seek(0, 2)               # Jump to end\n    file_size = f.tell()       # Get file size\n    f.seek(0)                  # Jump back to beginning\n    first_10 = f.read(10)     # Read first 10 bytes",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Caveat:** In **text mode**, only `seek(0)` and `seek(tell_value)` are reliably portable. For arbitrary seeking, use binary mode."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is `ExitStack` and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "**A:** `ExitStack` from `contextlib` is a context manager that manages a **dynamic** collection of other context managers and cleanup callbacks."
    },
    {
     "t": "p",
     "text": "**Use cases:** 1. Opening a **variable number** of resources (e.g., list of files). 2. Conditionally entering context managers. 3. Registering **cleanup callbacks**."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import ExitStack\n\nfilenames = [\"a.txt\", \"b.txt\", \"c.txt\"]\n\nwith ExitStack() as stack:\n    files = [stack.enter_context(open(fn, \"w\")) for fn in filenames]\n    for i, f in enumerate(files):\n        f.write(f\"File {i}\\n\")\n# All files are closed when the block exits",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Cleanup callbacks (LIFO order):**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with ExitStack() as stack:\n    stack.callback(print, \"third\")\n    stack.callback(print, \"second\")\n    stack.callback(print, \"first\")\n# Prints: first, second, third (LIFO order)",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the difference between `read()`, `readline()`, and `readlines()`?",
   "body": [
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Returns",
      "Memory",
      "Use Case"
     ],
     "rows": [
      [
       "`read()`",
       "Entire file as one `str`",
       "High (full file in memory)",
       "Small files"
      ],
      [
       "`read(n)`",
       "At most `n` characters",
       "Low",
       "Chunked reading"
      ],
      [
       "`readline()`",
       "Next single line (including `\\n`)",
       "Low",
       "Processing one line at a time"
      ],
      [
       "`readlines()`",
       "List of all lines",
       "High (full file in memory)",
       "When you need all lines as a list"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with open(\"data.txt\") as f:\n    # Best for large files — iterate directly\n    for line in f:          # Uses readline() internally, memory-efficient\n        print(line.strip())",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "How do you handle CSV files in Python?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Use the `csv` module:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import csv\n\n# Reading as lists\nwith open(\"data.csv\", newline=\"\") as f:\n    reader = csv.reader(f)\n    header = next(reader)\n    for row in reader:\n        print(row)            # ['Alice', '30', 'NYC']\n\n# Reading as dictionaries\nwith open(\"data.csv\", newline=\"\") as f:\n    for row in csv.DictReader(f):\n        print(row[\"Name\"])    # Alice\n\n# Writing\nwith open(\"out.csv\", \"w\", newline=\"\") as f:\n    writer = csv.writer(f)\n    writer.writerow([\"Name\", \"Age\"])\n    writer.writerows([[\"Alice\", 30], [\"Bob\", 25]])",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Always open CSV files with `newline=\"\"` to prevent double newlines on Windows."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "Can the `with` statement handle multiple context managers?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Yes, in three ways:"
    }
   ]
  }
 ],
 "takeaways": []
});

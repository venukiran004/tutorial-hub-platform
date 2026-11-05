/* ============================================================================
   INTERVIEW: LANGUAGE DEPTH i2.4 — File I/O & Context Managers
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.4",
 "lede": "**28 interview questions on file i/o & context managers**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 28 questions on file i/o & context managers without prompting",
  "State the trade-off behind each answer, not only the definition",
  "Recognise the follow-up each question is setting up",
  "Notice which answers you can recognise but not produce"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "kind": "steps",
   "title": "What `with` guarantees",
   "caption": "`__exit__` runs on the way out whatever happens — normal end, `return`, or exception. Returning a truthy value from it **suppresses** the exception, which is the question people miss.",
   "items": [
    {
     "label": "__enter__()",
     "desc": "its return value is what as binds",
     "tone": "accent",
     "code": "on entry"
    },
    {
     "label": "the body",
     "desc": "may return, break or raise",
     "tone": "good",
     "code": "your code"
    },
    {
     "label": "__exit__(exc_type, exc, tb)",
     "desc": "always called — this is the guarantee you are buying",
     "tone": "warn",
     "code": "on exit"
    },
    {
     "label": "return True to suppress",
     "desc": "falsy (or None) re-raises; truthy swallows the exception",
     "tone": "crit",
     "code": "the subtlety"
    }
   ],
   "t": "diagram",
   "id": "dg-i2_4-top-0"
  },
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
      "Behaviour"
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
   "n": "2",
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
   "n": "3",
   "q": "How do `__enter__` and `__exit__` work? What does `__exit__` return?",
   "body": [
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "ul",
     "items": [
      "**`__enter__(self)`:** Called when entering the `with` block. Its return value is bound to the variable after `as`.",
      "**`__exit__(self, exc_type, exc_val, exc_tb)`:** Called when exiting the `with` block (whether normally or due to an exception)."
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
   "n": "4",
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
   "n": "5",
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
   "n": "6",
   "q": "How do you serialise and deserialize JSON in Python?",
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
   "n": "7",
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
   "n": "8",
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
   "n": "9",
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
   "n": "10",
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
   "n": "11",
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
   "n": "12",
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
   "n": "13",
   "q": "How do you copy a file in Python?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Multiple approaches:"
    },
    {
     "t": "p",
     "text": "**1. Comma-separated (Python 3.1+)**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with open(\"in.txt\") as src, open(\"out.txt\", \"w\") as dst:\n    dst.write(src.read())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**2. Parenthesized (Python 3.10+)**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with (\n    open(\"in.txt\") as src,\n    open(\"out.txt\", \"w\") as dst,\n):\n    dst.write(src.read())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**3. Using `ExitStack` (dynamic/variable number)**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import ExitStack\n\nwith ExitStack() as stack:\n    files = [stack.enter_context(open(f)) for f in file_list]",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What happens if `__exit__` raises an exception?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How do you write a custom context manager that suppresses exceptions?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is `contextlib.suppress`? Give a use case.",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is `contextlib.redirect_stdout`?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is `contextlib.nullcontext`?",
   "body": [
    {
     "t": "p",
     "text": "**A:** A no-op context manager that does nothing. Useful as a **stand-in** when a context manager is optional."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from contextlib import nullcontext\nimport threading\n\ndef process(data, lock=None):\n    with lock or nullcontext():\n        return sum(data)\n\n# Without locking:\nprocess([1, 2, 3])\n\n# With locking:\nprocess([1, 2, 3], lock=threading.Lock())",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How do you read and write JSON files?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the difference between `json.dump` and `json.dumps`?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What are `NamedTemporaryFile` and `TemporaryDirectory`?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is `r+` mode? How does it differ from `w+`?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Can the `with` statement handle multiple context managers?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Yes, in three ways:"
    },
    {
     "t": "p",
     "text": "**1. `shutil` (recommended)**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import shutil\n\nshutil.copy(\"src.txt\", \"dst.txt\")        # Copies file + permissions\nshutil.copy2(\"src.txt\", \"dst.txt\")       # Also copies metadata (timestamps)\nshutil.copyfile(\"src.txt\", \"dst.txt\")    # Only copies content",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**2. Manual (for fine-grained control)**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with open(\"src.txt\", \"rb\") as src, open(\"dst.txt\", \"wb\") as dst:\n    while chunk := src.read(8192):\n        dst.write(chunk)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**3. `pathlib` (small files)**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from pathlib import Path\nPath(\"dst.txt\").write_bytes(Path(\"src.txt\").read_bytes())",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is the purpose of `newline=\"\"` when opening CSV files?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What are async context managers? When do you need them?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "What is `encoding` parameter in `open()`? What happens if you don't specify it?",
   "body": [
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
     "text": "**Python 3.15+ (PEP 686):** UTF-8 is the default. On earlier versions, always specify `encoding=\"utf-8\"`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "How do you handle file not found errors gracefully?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What does `f.flush()` do? How is it different from `f.close()`?",
   "body": [
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
  }
 ],
 "takeaways": []
});

/* ============================================================================
   INTERVIEW: LANGUAGE DEPTH i2.5 — Modules & Packages
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.5",
 "lede": "**24 interview questions on modules & packages**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 24 questions on modules & packages without prompting",
  "State the trade-off behind each answer, not only the definition",
  "Recognise the follow-up each question is setting up",
  "Notice which answers you can recognise but not produce"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "kind": "steps",
   "title": "How an import is resolved",
   "caption": "Most of these questions come back to this order. The first entry of `sys.path` is the script's own directory, which is why a local `random.py` shadows the standard library — the classic import bug.",
   "items": [
    {
     "label": "sys.modules",
     "desc": "already imported? return it — so a module body runs ONCE",
     "tone": "good",
     "code": "cache"
    },
    {
     "label": "sys.path, in order",
     "desc": "the script’s directory first, then PYTHONPATH, then site-packages",
     "tone": "accent",
     "code": "search"
    },
    {
     "label": "execute the module body",
     "desc": "top to bottom, once; this is where a circular import bites",
     "tone": "warn",
     "code": "run"
    },
    {
     "label": "bind the name locally",
     "desc": "import x.y binds x; from x import y binds y",
     "tone": "teal",
     "code": "bind"
    }
   ],
   "t": "diagram",
   "id": "dg-i2_5-top-0"
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
   "q": "What is the difference between a module and a package?",
   "body": [
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Module",
      "Package"
     ],
     "rows": [
      [
       "Definition",
       "A single `.py` file",
       "A directory containing modules + `__init__.py`"
      ],
      [
       "Contains",
       "Functions, classes, variables",
       "Modules and sub-packages"
      ],
      [
       "Import",
       "`import utils`",
       "`import mypackage.utils`"
      ],
      [
       "`__file__`",
       "Points to the `.py` file",
       "Points to `__init__.py`"
      ],
      [
       "`__path__`",
       "Not present",
       "List of directories for the package"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Module: utils.py\ndef greet():\n    return \"Hello\"\n\n# Package: mypackage/\n#   __init__.py\n#   utils.py\n#   models.py",
     "numbered": false
    },
    {
     "t": "p",
     "text": "A **module** is any `.py` file. A **package** is a directory of modules unified under a namespace by `__init__.py`."
    },
    {
     "t": "disclose",
     "summary": "The same question, answered a second way",
     "body": [
      {
       "t": "ul",
       "items": [
        "**Module:** A single `.py` file.",
        "**Package:** A directory containing an `__init__.py` file (and potentially subpackages/modules). Modern Python also supports namespace packages (no `__init__.py`)."
       ]
      }
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the purpose of `__init__.py`?",
   "body": [
    {
     "t": "p",
     "text": "**A:** `__init__.py` serves multiple purposes:"
    },
    {
     "t": "ol",
     "items": [
      "**Marks a directory as a package:** without it (before Python 3.3), Python wouldn't recognise the directory as a package.",
      "**Runs initialisation code** when the package is first imported.",
      "**Defines the package's public API** by importing and exposing selected names.",
      "**Controls `import *` behaviour** via `__all__`."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# mypackage/__init__.py\nfrom .core import Engine\nfrom .utils import helper\n\n__version__ = \"2.0.0\"\n__all__ = [\"Engine\", \"helper\"]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Now users can do:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from mypackage import Engine, helper    # Clean API",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is `__all__`? How does it affect star imports?",
   "body": [
    {
     "t": "p",
     "text": "**A:** `__all__` is a list of strings that defines which names are exported when `from module import *` is used."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# math_tools.py\n__all__ = [\"add\", \"subtract\"]\n\ndef add(a, b): return a + b\ndef subtract(a, b): return a - b\ndef _internal(): return \"private\"\ndef multiply(a, b): return a * b    # Not in __all__",
     "numbered": false
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from math_tools import *\nadd(1, 2)           # ✅ Works\nsubtract(3, 1)      # ✅ Works\nmultiply(2, 3)      # ❌ NameError — not in __all__\n_internal()          # ❌ NameError — not in __all__",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Without `__all__`:** `import *` imports all names that don't start with `_`."
    },
    {
     "t": "p",
     "text": "**With `__all__`:** Only names listed in `__all__` are imported, regardless of naming."
    },
    {
     "t": "p",
     "text": "`__all__` does NOT prevent direct imports: `from math_tools import multiply` still works."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What does `if __name__ == \"__main__\"` do?",
   "body": [
    {
     "t": "p",
     "text": "**A:** It checks whether the current file is being run **directly** (as a script) or being **imported** as a module."
    },
    {
     "t": "ul",
     "items": [
      "**Run directly:** `__name__` == `\"__main__\"`",
      "**Imported:** `__name__` == module name (e.g., `\"utils\"`)"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# utils.py\ndef process():\n    return \"processed\"\n\nif __name__ == \"__main__\":\n    # This block ONLY runs when: python utils.py\n    # It does NOT run when: import utils\n    print(process())",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use cases:** 1. Module-level tests or demos. 2. CLI entry points. 3. Preventing side effects when importing."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the difference between absolute and relative imports?",
   "body": [
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "p",
     "text": "**Absolute import** — uses the full path from the project root:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from mypackage.sub.module import func    # Clear and explicit",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Relative import** — uses dots relative to the current module:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from . import sibling           # Same package\nfrom .sibling import func       # Same package, specific name\nfrom .. import parent_module    # Parent package\nfrom ...grandparent import x    # Two levels up",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "Absolute",
      "Relative"
     ],
     "rows": [
      [
       "Clarity",
       "✅ Very clear",
       "⚠️ Context-dependent"
      ],
      [
       "Refactoring",
       "⚠️ Must update paths",
       "✅ Moves with package"
      ],
      [
       "Top-level scripts",
       "✅ Works",
       "❌ Doesn't work"
      ],
      [
       "PEP 8 recommendation",
       "✅ Preferred",
       "Acceptable for intra-package"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Relative imports only work inside packages** — attempting them in a directly-run script causes `ImportError`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What are circular imports? How do you fix them?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Circular imports occur when **two modules depend on each other** at import time."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# a.py\nfrom b import func_b     # Triggers import of b.py\ndef func_a(): ...\n\n# b.py\nfrom a import func_a     # Triggers import of a.py — CIRCULAR!\ndef func_b(): ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Three fixes:**"
    },
    {
     "t": "p",
     "text": "**1. Lazy import (move inside function)**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# a.py\ndef func_a():\n    from b import func_b     # Imported at call time, not import time\n    return func_b()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**2. Import the module, not the name**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# a.py\nimport b\ndef func_a():\n    return b.func_b()        # Resolved at call time",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**3. Restructure — extract common code**"
    },
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is `sys.path`? How does Python resolve imports?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "How does Python's import system work internally?",
   "body": [
    {
     "t": "p",
     "text": "**A:** When you write `import foo`:"
    },
    {
     "t": "ol",
     "items": [
      "**Check `sys.modules`:** if `foo` is already cached, return it immediately.",
      "**Find the module:** use `sys.meta_path` finders: - `BuiltinImporter` — for built-in modules. - `FrozenImporter` — for frozen modules. - `PathFinder` — searches `sys.path` directories.",
      "**Load the module:** the finder returns a **spec** (`ModuleSpec`), which has a **loader**.",
      "**Create module object:** `types.ModuleType`.",
      "**Execute module code:** top-level statements run once.",
      "**Cache in `sys.modules`:** future imports use the cache."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import importlib.util\n\nspec = importlib.util.find_spec(\"json\")\nprint(spec.origin)      # /usr/lib/python3.12/json/__init__.py\nprint(spec.loader)      # <_frozen_importlib_external.SourceFileLoader>",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How do you dynamically import a module using `importlib`?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What are virtual environments? Why are they important?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the difference between `pip freeze` and `pip install -r requirements.txt`?",
   "body": [
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "ul",
     "items": [
      "**`pip freeze`:** outputs all installed packages and their exact versions to stdout."
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
      "**`pip install -r requirements.txt`:** installs all packages listed in the file."
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the difference between `Poetry` and `pip`?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What are `.pyc` files and `__pycache__`?",
   "body": [
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "ul",
     "items": [
      "**`.pyc` files:** compiled Python bytecode. Python compiles `.py` files to bytecode for faster startup.",
      "**`__pycache__/`:** directory where `.pyc` files are stored."
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What are namespace packages?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is `__main__.py` in a package?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What happens when you import a module twice?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How do you check if a module is installed without importing it?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is `PYTHONPATH`? How does it relate to `sys.path`?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the difference between `import foo` and `from foo import bar`?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "How do you create a distributable Python package?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is `importlib.reload()`? When should you use it?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is the difference between `venv` and `virtualenv`?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "How does `from __future__ import annotations` affect imports?",
   "body": [
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
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What are entry points in Python packages?",
   "body": [
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
  }
 ],
 "takeaways": []
});

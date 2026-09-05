/* ============================================================================
   INTERVIEW: LANGUAGE DEPTH i2.5 — Modules & Packages
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.5",
 "lede": "**6 interview questions on modules & packages**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 6 questions on modules & packages without prompting",
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
      "**Marks a directory as a package**without it (before Python 3.3), Python wouldn't recognize the directory as a package.",
      "**Runs initialization code** when the package is first imported.",
      "**Defines the package's public API** by importing and exposing selected names.",
      "**Controls `import *` behavior** via `__all__`."
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
    }
   ]
  }
 ],
 "takeaways": []
});

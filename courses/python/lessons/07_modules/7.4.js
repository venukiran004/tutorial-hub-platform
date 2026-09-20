/* ============================================================================
   LESSON 7.4 — Modules and the Import System
   ========================================================================= */
EC.receiveLesson({
  id: "7.4",

  lede: "`import` looks like a declaration and is actually four operations: find a file, execute it top to bottom, cache the result, and bind a name. **Almost every confusing import error follows from the execution step** — a module that is halfway through running, or one that ran a second time under a different name, or the wrong file found first.",

  objectives: [
    "Describe what `import` does in order, including the `sys.modules` cache",
    "Explain how `sys.path` is built and why `python x.py` and `python -m x` differ",
    "Choose absolute imports, and use explicit relative imports correctly",
    "Diagnose a circular import from the error message and fix it structurally",
    "Recognise import side effects and the shadowing that breaks a whole environment"
  ],

  prerequisites: ["7.1"],

  blocks: [

    { t: "h2", n: "01", text: "What import actually does", id: "what" },

    {"kind": "steps", "title": "What import actually does", "caption": "A module is executed exactly once and cached in sys.modules; every later import anywhere in the process returns the same module object. That cache is also what makes circular imports fail halfway.", "items": [{"label": "sys.modules['pkg.mod'] cached?", "desc": "yes → bind the name and stop", "tone": "good"}, {"label": "find it: sys.path, finders, loaders", "desc": "a .py, a package directory, a compiled extension", "tone": "accent"}, {"label": "create the module object and register it", "desc": "in sys.modules before executing — so cycles see a partial module", "tone": "warn"}, {"label": "execute the module body top to bottom", "desc": "def and class statements run; side effects happen here", "tone": "violet"}], "t": "diagram", "id": "dg-7_4-01-0"},


    { t: "viz",
      title: "The four steps, and where each failure comes from",
      caption: "The cache is the step people forget. A module executes exactly once per process, so import-time side effects happen once — and a module imported under two different names is two independent copies with separate state.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram of the import process: cache check, find the file on sys.path, execute the module, then bind the name">
  <defs>
    <marker id="im" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="14" y="34" width="196" height="92" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="112" y="60" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">1. CHECK sys.modules</text>
  <text x="112" y="84" text-anchor="middle" class="s-sub">already imported?</text>
  <text x="112" y="104" text-anchor="middle" class="s-sub">bind the name and stop</text>

  <line x1="214" y1="80" x2="248" y2="80" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#im)"/>

  <rect x="252" y="34" width="196" height="92" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="350" y="60" text-anchor="middle" class="s-label">2. FIND</text>
  <text x="350" y="84" text-anchor="middle" class="s-sub">walk sys.path in order</text>
  <text x="350" y="104" text-anchor="middle" class="s-sub">first match wins</text>

  <line x1="452" y1="80" x2="486" y2="80" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#im)"/>

  <rect x="490" y="34" width="196" height="92" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="588" y="60" text-anchor="middle" class="s-label">3. EXECUTE</text>
  <text x="588" y="84" text-anchor="middle" class="s-sub">run the file top to bottom</text>
  <text x="588" y="104" text-anchor="middle" class="s-sub">ONCE, in a new namespace</text>

  <line x1="690" y1="80" x2="724" y2="80" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#im)"/>

  <rect x="728" y="34" width="158" height="92" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="807" y="60" text-anchor="middle" class="s-label">4. BIND</text>
  <text x="807" y="84" text-anchor="middle" class="s-sub">add the name to</text>
  <text x="807" y="104" text-anchor="middle" class="s-sub">the local namespace</text>

  <line x1="14" y1="156" x2="886" y2="156" class="s-stroke" stroke-width="1" stroke-dasharray="4 4"/>

  <text x="14" y="184" class="s-label">FAILURES BY STEP</text>

  <text x="14" y="212" class="s-sub" style="fill:var(--crit)">2 —</text>
  <text x="54" y="212" class="s-sub">ModuleNotFoundError, or the WRONG file found first (a local random.py shadows the stdlib)</text>

  <text x="14" y="238" class="s-sub" style="fill:var(--crit)">3 —</text>
  <text x="54" y="238" class="s-sub">any exception in the module body; circular imports, where a partially-executed module is visible</text>

  <text x="14" y="264" class="s-sub" style="fill:var(--crit)">1 —</text>
  <text x="54" y="264" class="s-sub">the same file imported under two names becomes two modules with two copies of every global</text>

  <text x="14" y="290" class="s-sub" style="fill:var(--good)">3 —</text>
  <text x="54" y="290" class="s-sub">also where import-time side effects run: a database connection in a module body opens on import</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the cache is observable", code: `
import sys

import json
print(json in sys.modules.values())          # False -- keyed by NAME
print("json" in sys.modules)                 # True
print(sys.modules["json"] is json)           # True

# A module body runs exactly once per process
# config.py:
#   print("config module executing")
#   SETTINGS = load_from_disk()

import config          # prints once
import config          # prints nothing -- served from the cache
from config import SETTINGS
`,
      out: `False
True
True`,
      caption: "**`SETTINGS` is computed once**, at first import, in whatever order imports happen to occur. That is convenient for a constant and a serious problem for anything that touches the network or the clock."
    },

    { t: "callout", kind: "trap", title: "Import-time side effects run at the worst moment", body: [
      { t: "code", lang: "python", title: "what this costs", numbered: false, code: `
# db.py
import psycopg

CONNECTION = psycopg.connect(os.environ["DATABASE_URL"])   # AT IMPORT`},
      { t: "ul", items: [
        "**Importing anything that imports `db` opens a connection** — including a test collector, a linter that imports for type information, and `python -c \"import db\"`.",
        "**It fails at import time**, so the traceback comes from the import machinery and names a line the reader was not thinking about.",
        "**It cannot be configured after the fact.** The environment variable must be right before the first import, which is before `main()` has had a chance to load anything.",
        "**Tests cannot avoid it.** Importing the module under test connects to a database, so there is no unit test — only integration tests."
      ]},
      { t: "code", lang: "python", title: "defer it", numbered: false, code: `
# db.py
_connection = None

def get_connection():
    global _connection
    if _connection is None:
        _connection = psycopg.connect(os.environ["DATABASE_URL"])
    return _connection`},
      { t: "p", text: "**A module body should define things, not do things.** Constants, classes, functions — yes. Connections, file reads, HTTP calls, `logging.basicConfig` (Lesson 6.4) — no." }
    ]},

    { t: "h2", n: "02", text: "sys.path, and the two ways to run a program", id: "syspath" },

    { t: "code", lang: "python", title: "where the first entry comes from", code: `
import sys
print(sys.path)
`,
      out: `# python app/main.py     -- the SCRIPT's directory
['/project/app', '/usr/lib/python312.zip', '/usr/lib/python3.12', ...]

# python -m app.main     -- the CURRENT WORKING DIRECTORY
['/project', '/usr/lib/python312.zip', '/usr/lib/python3.12', ...]

# python -c "..." or an interactive REPL -- cwd as ''
['', '/usr/lib/python312.zip', ...]`,
      caption: "This single difference causes most \"it works when I run it one way\" confusion. With `python app/main.py`, `/project` is **not** on the path, so `import app.models` fails — while `python -m app.main` puts `/project` first and it works."
    },

    { t: "table",
      head: ["", "`python app/main.py`", "`python -m app.main`"],
      rows: [
        ["First `sys.path` entry", "`/project/app` — the script's directory", "`/project` — the working directory"],
        ["Package-relative imports", "Fail — the script is not in a package", "Work"],
        ["`__name__` in the file", "`\"__main__\"`", "`\"__main__\"`"],
        ["`__package__`", "`\"\"`", "`\"app\"`"],
        ["Runs `app/__init__.py` first", "No", "**Yes**"],
        ["Use for", "A standalone single-file script", "**Anything inside a package**"]
      ],
      caption: "**Use `python -m` for anything in a package.** It is also what console entry points effectively do, so running your code the same way in development and production removes a whole class of surprise (Lesson 7.7)."
    },

    { t: "callout", kind: "trap", title: "Shadowing: the file that breaks the environment", body: [
      { t: "code", lang: "python", title: "a plausible filename, an impossible error", numbered: false, code: `
# You create /project/random.py to hold some helpers.
# Then, anywhere in the project:

import random
random.randint(1, 10)
# AttributeError: module 'random' has no attribute 'randint'

# Or, more alarmingly, a dependency fails deep inside itself,
# because IT imported random and got yours.`},
      { t: "p", text: "`sys.path` is searched **in order**, and the script's directory or the working directory is first — ahead of the standard library. Any local file named `random.py`, `types.py`, `email.py`, `json.py`, `logging.py`, `queue.py`, `select.py`, `socket.py`, `string.py`, `test.py` or `token.py` wins." },
      { t: "p", text: "**Diagnose it with `print(module.__file__)`.** If the path is not where you expect, you have found it. `python -v` also prints every file the import system loads." },
      { t: "p", text: "The related trap: a stray `__pycache__` or `.pyc` left after you delete a `.py` file. Modern Python ignores an orphaned `.pyc` in `__pycache__`, but a legacy `.pyc` beside the source is still importable, so `git clean -xfd` is a reasonable step when imports behave impossibly." }
    ]},

    { t: "h2", n: "03", text: "Absolute and relative imports", id: "relative" },

    { t: "code", lang: "python", title: "prefer absolute", code: `
myapp/
  __init__.py
  models/
    __init__.py
    order.py
    customer.py
  services/
    __init__.py
    billing.py

# In myapp/services/billing.py:

from myapp.models.order import Order          # ABSOLUTE -- preferred
from ..models.order import Order              # explicit relative -- works
from models.order import Order                # WRONG: implicit relative,
                                              # removed in Python 3
`,
      caption: "**Absolute imports say where something comes from** without the reader counting dots, and they survive a file being moved. PEP 8 recommends them; explicit relative imports are acceptable inside a package where the depth is stable."
    },

    { t: "ul", items: [
      "**A relative import only works inside a package.** In a file run as `python file.py`, `__package__` is empty and any `from .` raises `ImportError: attempted relative import with no known parent package`.",
      "**`from . import x` and `from .x import y` differ.** The first binds the submodule; the second binds a name from inside it and requires that name to exist at that moment — which matters during circular imports.",
      "**Never go up more than one level.** `from ...core.utils import x` means the package layout is fighting you."
    ]},

    { t: "h2", n: "04", text: "Circular imports", id: "circular" },

    {"kind": "cycle", "title": "A circular import", "caption": "a imports b at the top; b imports a at the top; when b runs, a is in sys.modules but half-executed, so from a import thing fails with ImportError. Move the import inside the function, or move the shared thing to a third module.", "nodes": [{"label": "a.py starts", "sub": "registered, not finished", "tone": "accent"}, {"label": "import b", "sub": "b starts executing", "tone": "warn"}, {"label": "from a import thing", "sub": "a is only half done", "tone": "crit"}, {"label": "ImportError", "sub": "cannot import name 'thing'", "tone": "crit"}], "t": "diagram", "id": "dg-7_4-04-1"},


    { t: "p", text: "Two modules importing each other is not automatically an error — Python handles it whenever the *names* are needed later rather than at module execution time. It fails when one module needs something from the other **while that other is still executing**." },

    { t: "code", lang: "python", title: "the failure, step by step", code: `
# order.py
from customer import Customer          # line 1

class Order:
    def owner(self) -> Customer: ...


# customer.py
from order import Order                # line 1

class Customer:
    def orders(self) -> list[Order]: ...
`,
      out: `$ python -c "import order"

ImportError: cannot import name 'Customer' from partially initialized
module 'customer' (most likely due to a circular import)

# What happened:
#   1. import order          -> sys.modules["order"] = <empty module>
#   2. order.py line 1       -> import customer
#   3. sys.modules["customer"] = <empty module>; run customer.py
#   4. customer.py line 1    -> import order
#   5. "order" IS in sys.modules -- returns the EMPTY module from step 1
#   6. "from order import Order" -> Order does not exist yet. Boom.`,
      hl: [5, 6],
      caption: "**Step 5 is the key.** The cache returns a module object that exists but has not finished executing, so the names defined below the import statement are not there yet. The error message names this exactly: *partially initialized module*."
    },

    { t: "ladder",
      title: "Breaking a circular import",
      rungs: [
        { level: "bad", label: "Move the import inside the function",
          why: "It works, because the import now happens after both modules have finished executing. But it hides the dependency from anyone reading the header, costs a `sys.modules` lookup on every call, and turns an import error into a runtime error that appears only on the code path that calls it.",
          code: `# customer.py
class Customer:
    def orders(self):
        from order import Order        # deferred
        return [Order(...)]` },
        { level: "ok", label: "Import the module, not the name",
          why: "`import order` binds the module object, and `order.Order` is resolved at call time rather than import time — so the partially-initialised module is fine, because nothing is read from it yet. Honest about the dependency and still a cycle.",
          code: `# customer.py
import order                            # not "from order import Order"

class Customer:
    def orders(self) -> list["order.Order"]:
        return [order.Order(...)]` },
        { level: "best", label: "Remove the cycle",
          why: "A circular import is usually a design signal: two modules that each need the other are one concept split in the wrong place, or they are both missing a shared layer. Extracting the shared piece makes the dependency a tree again, which is also easier to test and to reason about.",
          code: `# models.py -- both types live together, since they reference each other
from dataclasses import dataclass

@dataclass
class Customer:
    id: str

@dataclass
class Order:
    id: str
    customer: Customer


# OR: the shared abstraction moves down a layer
# core/protocols.py
from typing import Protocol

class HasOrders(Protocol):
    def orders(self) -> list["Order"]: ...`,
          note: "If the cycle exists **only for type annotations**, there is a clean fix that keeps the code acyclic at runtime — the next block." }
      ]
    },

    { t: "code", lang: "python", title: "TYPE_CHECKING: imports that exist only for the type checker", code: `
from __future__ import annotations         # annotations are strings

from typing import TYPE_CHECKING

if TYPE_CHECKING:                          # False at runtime, True for mypy
    from myapp.models.order import Order


class Customer:
    def orders(self) -> list[Order]:       # a string at runtime -- fine
        ...
`,
      caption: "`TYPE_CHECKING` is `False` when the program runs, so the import never executes and the cycle does not exist at runtime. It **requires** either `from __future__ import annotations` or quoted annotations, otherwise evaluating the annotation raises `NameError`."
    },

    { t: "h2", n: "05", text: "Two more things worth knowing", id: "more" },

    { t: "tabs", items: [
      { label: "Dynamic import", blocks: [
        { t: "code", lang: "python", title: "importlib, not __import__", numbered: false, code: `
import importlib

# Load a module whose name is known only at runtime -- plugins, backends
module = importlib.import_module(f"myapp.backends.{name}")
backend = module.Backend()

# Reload during development (never in production -- old objects survive)
importlib.reload(module)

# Check availability without importing
if importlib.util.find_spec("orjson") is not None:
    import orjson`},
        { t: "p", text: "**Validate `name` against an allowlist.** `import_module` with user input executes arbitrary module code, which makes it a code-execution vector as surely as `eval`." }
      ]},
      { label: "Namespace packages", blocks: [
        { t: "code", lang: "python", title: "a directory with no __init__.py", numbered: false, code: `
myapp/
  plugins/                # no __init__.py -- a namespace package
    a.py

# Portions of the same namespace package can live in different
# directories, even different installed distributions:
#   site-packages/myapp/plugins/vendor_x.py
#   ./myapp/plugins/local.py
# Both are importable as myapp.plugins.*`},
        { t: "p", text: "Useful for plugin systems where separate distributions contribute to one namespace. Everywhere else it is a hazard: a missing `__init__.py` silently creates a namespace package instead of raising, so a typo in a directory name produces a package that imports and contains nothing." },
        { t: "p", text: "**Include `__init__.py` in regular packages**, even when empty. It makes the package explicit and stops test collectors guessing." }
      ]}
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Untangle a project that will not import",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "A colleague's project runs when started one way and fails another, and a new test file broke imports across the whole suite. There are four separate import problems." },
        { t: "code", lang: "python", title: "the layout and the errors", numbered: false, code: `
shop/
  __init__.py            # from shop.api import app
  api.py                 # from shop.services import checkout
  services.py            # from shop.models import Order
  models.py              # from shop.services import price_for
  email.py               # helpers for sending mail
  run.py                 # python run.py

$ python run.py
ImportError: cannot import name 'price_for' from partially
initialized module 'shop.services'

$ python -m shop.run
ModuleNotFoundError: No module named 'shop'

$ pytest
...
  File "/usr/lib/python3.12/smtplib.py", line 50, in <module>
    import email.utils
ImportError: cannot import name 'utils' from 'shop.email'`},
        { t: "p", text: "Diagnose each, then produce a layout that works under `python -m`, under `pytest` and when installed." }
      ],
      requirements: [
        "Explain the circular import precisely — which module was mid-execution and why.",
        "Explain why `python -m shop.run` cannot find `shop`, and fix it.",
        "Explain the `smtplib` failure, which is not obviously your code's fault.",
        "Identify the fourth problem, in `shop/__init__.py`.",
        "Restructure so imports are acyclic, and say what the cycle indicated about the design.",
        "Give the one-line command that proves the layout imports cleanly from any directory."
      ],
      hint: "For the `smtplib` error, ask what `import email.utils` finds when `shop/` is the first entry on `sys.path`. The answer explains why the failure appeared the moment someone ran pytest from a different directory.",
      solution: {
        lang: "python",
        title: "shop/ — diagnosis and fix",
        code: `# =========================================================================
# PROBLEM 1 -- the circular import
# =========================================================================
#
#   services.py:  from shop.models import Order
#   models.py:    from shop.services import price_for
#
# Execution order when anything imports shop.services first:
#
#   1. sys.modules["shop.services"] = <empty module>, body starts
#   2. line 1 -> import shop.models
#   3. sys.modules["shop.models"] = <empty module>, body starts
#   4. line 1 -> from shop.services import price_for
#   5. "shop.services" IS in sys.modules -> returns the EMPTY module
#   6. price_for is defined BELOW line 1 in services.py, so it does not
#      exist yet -> ImportError: partially initialized module
#
# The error names the module that was mid-execution, not the one that
# failed to import. Reading it the right way round is half the diagnosis.
#
# WHAT THE CYCLE MEANT
#
# models.py needed pricing, and services.py needed the model. That is
# one concept split across two files: pricing IS part of the domain.
# Either the price rule belongs on the model, or both belong in a layer
# below the services. It is a design signal, not an import inconvenience.


# ---- shop/models.py -- no imports from services -------------------------

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class Order:
    id: str
    quantity: int
    unit_price: Decimal

    @property
    def price(self) -> Decimal:
        """The pricing rule moved ONTO the model.

        This is the fix that removes the cycle rather than working
        around it: models.py now imports nothing from the package, so
        it can be imported first by anything.
        """
        return self.unit_price * self.quantity


# ---- shop/services.py -- depends on models, one direction ---------------

from shop.models import Order


def checkout(order: Order) -> Decimal:
    return order.price


# =========================================================================
# PROBLEM 2 -- python -m shop.run cannot find shop
# =========================================================================
#
# "python -m" puts the CURRENT WORKING DIRECTORY first on sys.path. It
# was being run from inside shop/, so sys.path[0] was /project/shop and
# the package /project/shop was not visible -- only its contents were.
#
# Two fixes, in order of preference:
#
#   1. Run from the project root: cd /project && python -m shop.run
#   2. Better: make the package installable and install it in editable
#      mode, so it is importable from anywhere (Lesson 7.7):
#
#        pip install -e .
#
# The second is what removes the whole class of problem: sys.path no
# longer depends on which directory anyone happened to be standing in.
#
# Note "python run.py" and "python -m shop.run" also differ in what
# sys.path[0] is -- the script's directory versus the cwd. A project
# that only works from one directory is a project with a packaging gap.


# =========================================================================
# PROBLEM 3 -- shop/email.py shadows the stdlib email package
# =========================================================================
#
#   File "/usr/lib/python3.12/smtplib.py", line 50, in <module>
#       import email.utils
#   ImportError: cannot import name 'utils' from 'shop.email'
#
# When sys.path[0] is /project/shop -- which is exactly what "python
# run.py" produces -- an absolute "import email" from ANYWHERE, including
# from inside the standard library, finds shop/email.py first.
#
# The traceback blames smtplib, which is why this wastes an afternoon.
#
# FIX: rename it. shop/mailer.py, or shop/notifications.py.
#
# The same hazard applies to: types.py, json.py, logging.py, random.py,
# queue.py, select.py, socket.py, string.py, test.py, token.py, io.py,
# copy.py, time.py, code.py, abc.py, enum.py, secrets.py.
#
# DIAGNOSING IT:  python -c "import email; print(email.__file__)"
# If that prints a path inside your project, you have found it.


# =========================================================================
# PROBLEM 4 -- shop/__init__.py imports the application
# =========================================================================
#
#   # shop/__init__.py
#   from shop.api import app
#
# This makes "import shop.models" -- or any import of anything in the
# package -- execute api.py, which imports services, which imports the
# world. Consequences:
#
#   - a unit test for models.py starts a web framework
#   - a circular import anywhere becomes a circular import EVERYWHERE,
#     because every import now runs the whole graph
#   - import time grows until the CLI takes two seconds to print --help
#
# FIX: keep __init__.py empty, or limit it to a version string and a
# deliberately small public surface (Lesson 7.5).

# shop/__init__.py
__version__ = "1.4.0"


# =========================================================================
# THE RESULTING LAYOUT
# =========================================================================
#
#   project/
#     pyproject.toml
#     src/
#       shop/
#         __init__.py      # version only
#         models.py        # imports nothing from shop
#         services.py      # imports shop.models
#         mailer.py        # renamed from email.py
#         api.py           # imports shop.services
#         __main__.py      # python -m shop
#     tests/
#
# Dependencies now form a tree:  api -> services -> models
#
# src/ layout is the other half of the fix: with the package under src/,
# the project root is NOT on sys.path, so an accidental "import shop"
# resolves to the INSTALLED package rather than the source directory.
# Tests then exercise what users will actually get (Lesson 7.7).


# =========================================================================
# THE PROOF
# =========================================================================
#
#   $ pip install -e .
#   $ cd /tmp && python -c "import shop.api"
#
# Running from /tmp is the point: it removes the project directory from
# sys.path entirely, so anything that only worked because of an
# accidental path entry fails loudly.
#
# In CI, the stronger version:
#
#   $ python -X importtime -c "import shop" 2>&1 | tail -5
#
# -X importtime prints what each import cost. A package whose __init__
# pulls in the world shows up immediately as hundreds of milliseconds
# before your own code runs.


# =========================================================================
# TESTS
# =========================================================================

import subprocess
import sys
from pathlib import Path


def test_models_imports_without_the_rest_of_the_package() -> None:
    """If this needs a web framework installed, the layering is broken."""
    result = subprocess.run(
        [sys.executable, "-c", "import shop.models"],
        capture_output=True, cwd="/tmp",
    )
    assert result.returncode == 0, result.stderr.decode()


def test_no_module_shadows_the_standard_library() -> None:
    """Catches the email.py class of bug before it reaches anyone."""
    stdlib = set(sys.stdlib_module_names)
    package = Path(__file__).parent

    offenders = {
        p.stem for p in package.glob("*.py")
        if p.stem in stdlib and p.stem != "__init__"
    }
    assert not offenders, f"these shadow stdlib modules: {sorted(offenders)}"


def test_import_graph_is_acyclic() -> None:
    """Importing each module first, in a fresh interpreter, exposes a
    cycle that only fails in one direction -- which is how cycles hide."""
    for module in ("shop.models", "shop.services", "shop.api", "shop.mailer"):
        result = subprocess.run(
            [sys.executable, "-c", f"import {module}"],
            capture_output=True, cwd="/tmp",
        )
        assert result.returncode == 0, f"{module}: {result.stderr.decode()}"


if __name__ == "__main__":
    test_no_module_shadows_the_standard_library()
    print("no stdlib shadowing")`,
        notes: [
          { t: "p", text: "**Read the circular-import message the right way round.** \"cannot import name X from partially initialized module M\" means *M was already running* — so the cycle started somewhere above, and M is the module whose body has not reached the definition of X yet. People instinctively investigate M's importer; the useful question is what began importing M." },
          { t: "p", text: "**The `smtplib` traceback is the memorable one.** A file called `email.py` in a directory that lands on `sys.path` breaks an absolute import made by the standard library itself, so the error blames code you have never opened. `python -c \"import email; print(email.__file__)\"` settles it in one line." },
          { t: "p", text: "**Fixing the cycle by moving the price rule onto the model is the real answer.** A function-level import or an `import shop.services` would both make the error go away and leave two modules that genuinely need each other. The cycle was telling the truth: pricing is part of the domain, not a service on top of it." },
          { t: "callout", kind: "insight", title: "Why `src/` layout prevents a whole category", body: [
            { t: "p", text: "With the package at the project root, running anything from that directory puts your source on `sys.path` by accident. Tests then pass against the source tree while the installed package is missing a file that was never added to the build." },
            { t: "p", text: "Under `src/`, the only way to import the package is to install it — so tests exercise exactly what users get, and `cd /tmp && python -c \"import shop\"` becomes a meaningful smoke test rather than a formality." }
          ]},
          { t: "p", text: "**The stdlib-shadowing test is worth copying into any project.** `sys.stdlib_module_names` is a frozenset of every standard library module name, so the check is four lines and catches a bug whose traceback points somewhere else entirely." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A data team's CLI starts taking eleven seconds to print `--help`. Nothing about the CLI changed. Users start assuming it has hung and pressing Ctrl-C, then filing tickets about commands that \"never run\"." },
      { t: "p", text: "**`python -X importtime` showed the cost was all in imports**, before `main()` ran a single line. The package's `__init__.py` had accumulated convenience re-exports over two years, and one of them reached a module that imported `pandas`, `torch` and a database driver." },
      { t: "p", text: "**Every command paid for every dependency**, because `import mypkg.anything` executes `mypkg/__init__.py` first. A command that only formatted a date was loading a deep learning framework to do it." },
      { t: "p", text: "**Emptying `__init__.py` took the CLI back to 200 ms.** The convenience it provided — `from mypkg import Thing` rather than `from mypkg.things import Thing` — cost eleven seconds on every invocation. A package's `__init__` runs before anything else in that package, so whatever it imports is a tax on every single use (Lesson 7.5)." }
    ]}
  ],

  takeaways: [
    "**`import` finds, executes, caches and binds.** The execution step is where nearly every confusing error comes from.",
    "**A module body runs exactly once per process**, so import-time side effects — connections, file reads, `basicConfig` — happen at an unpredictable moment and cannot be reconfigured.",
    "**A module body should define things, not do things.** Defer anything with an effect into a function.",
    "**`python x.py` puts the script's directory on `sys.path`; `python -m x` puts the working directory.** That single difference explains most \"works one way\" confusion.",
    "**Use `python -m` for anything inside a package** — it sets `__package__`, runs `__init__.py`, and matches how installed entry points behave.",
    "**`sys.path` is searched in order and your directory is first**, so a local `email.py` or `random.py` shadows the standard library — sometimes breaking a dependency deep inside itself.",
    "**Diagnose shadowing with `module.__file__`.** If the path is inside your project, that is the bug.",
    "**Prefer absolute imports.** They survive files being moved and say where a name comes from without counting dots.",
    "**A circular import fails when one module needs a name from another that is still executing** — the error says \"partially initialized module\", and names the module that was already running.",
    "**Importing the module rather than the name defers the lookup** and often breaks a cycle; but a cycle usually indicates two modules that are really one concept.",
    "**`if TYPE_CHECKING:` imports do not exist at runtime**, which removes cycles that exist only for annotations — it needs `from __future__ import annotations` or quoted types.",
    "**A package's `__init__.py` runs before anything else in that package**, so every import it makes is a tax on every use of the package."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`ImportError: cannot import name 'price_for' from partially initialized module 'shop.services'`. What does this tell you?",
        options: [
          "`shop.services` does not define `price_for` at all",
          "`shop.services` was already executing when something imported it again, and `price_for` is defined below the line that started the cycle",
          "The file has a syntax error before that definition",
          "`shop.services` was imported under two different names"
        ],
        answer: 1,
        why: "The cache returns the module object as soon as execution begins, so a re-entrant import gets a real module that is only partly populated. Names defined below the import statement that triggered the cycle do not exist yet. The useful question is not what `shop.services` looks like — it is what started importing it, because that is where the cycle begins."
      },
      {
        stem: "`python run.py` works but `python -m shop.run` says `No module named 'shop'`. Why?",
        options: [
          "`-m` does not support packages",
          "`-m` puts the current working directory on `sys.path` rather than the script's directory, and the command was run from inside `shop/`",
          "`run.py` is missing a `__main__` guard",
          "`shop/__init__.py` is empty"
        ],
        answer: 1,
        why: "`python x.py` prepends the *script's* directory; `python -m` prepends the *working* directory. Run from inside `shop/`, the path contains `/project/shop`, so the package's contents are importable but the package itself is not. Running from the project root fixes it, and installing with `pip install -e .` removes the dependence on which directory you happen to be in."
      },
      {
        stem: "A traceback shows `smtplib.py` failing at `import email.utils` with `cannot import name 'utils' from 'shop.email'`. What happened?",
        options: [
          "The standard library installation is corrupted",
          "A local `shop/email.py` is earlier on `sys.path` than the stdlib, so an absolute `import email` from inside the standard library finds your file",
          "`smtplib` requires a package that is not installed",
          "The virtual environment is not active"
        ],
        answer: 1,
        why: "`sys.path` is searched in order and your directory is first, so shadowing affects everyone's absolute imports — including the standard library's own. That is why the traceback blames a file you have never opened. Confirm with `python -c \"import email; print(email.__file__)\"`, and rename the offender; `sys.stdlib_module_names` makes a four-line test that prevents recurrence."
      },
      {
        stem: "Why should a package's `__init__.py` usually stay empty?",
        options: [
          "Python does not execute it anyway",
          "It runs before anything else in the package, so every import it makes is paid on every use — a CLI can spend seconds loading dependencies before `main()` starts",
          "Re-exports break type checkers",
          "It prevents the package from being installed"
        ],
        answer: 1,
        why: "`import mypkg.anything` executes `mypkg/__init__.py` first. Convenience re-exports accumulate, one of them eventually reaches a heavy dependency, and then a command that formats a date loads a deep learning framework to do it. The same mechanism turns one circular import into a package-wide one, since every import now runs the whole graph."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What actually happens when you write `import foo`?",
        strong: "Python checks `sys.modules`; if it is not there, it searches `sys.path` in order, executes the file top to bottom in a fresh namespace, stores it in the cache, and binds the name locally. The execution happens exactly once per process.",
        answer: [
          { t: "p", text: "The cache is the part worth emphasising, because it explains import-time side effects: a connection opened in a module body opens once, at whatever moment something first imported it, and cannot be reconfigured afterwards." },
          { t: "p", text: "\"Searched in order, first match wins\" leads naturally to shadowing — a local `random.py` beating the standard library, sometimes breaking a dependency deep inside itself." },
          { t: "p", text: "The practical conclusion is the one to land on: a module body should define things, not do things." }
        ]
      },
      {
        level: "advanced",
        q: "How do you fix a circular import?",
        strong: "First understand it: one module needs a name from another that is still executing, which is why the error says \"partially initialized\". The tactical fixes are importing the module rather than the name, or deferring the import into a function. The real fix is usually to remove the cycle.",
        answer: [
          { t: "p", text: "Treating the cycle as a design signal is what separates a good answer: two modules that each need the other are generally one concept split in the wrong place, or both missing a layer beneath them." },
          { t: "p", text: "`if TYPE_CHECKING:` deserves a mention because a large share of real cycles exist only for annotations, and that import genuinely does not exist at runtime." },
          { t: "p", text: "Being honest about the cost of the function-level import — hidden dependency, and an import error that only surfaces on one code path — shows you know why it is a workaround rather than a solution." }
        ]
      },
      {
        level: "core",
        q: "What is the difference between `python script.py` and `python -m package.script`?",
        strong: "`sys.path[0]`. The first is the script's directory, the second is the working directory. `-m` also sets `__package__` and runs the package's `__init__.py`, so relative imports work.",
        answer: [
          { t: "p", text: "Connecting it to a symptom makes it concrete: a project that only imports when run from one directory is a project with a packaging gap, and `pip install -e .` is the fix rather than adjusting `sys.path`." },
          { t: "p", text: "The `src/` layout point extends it well — with the package under `src/`, the source tree cannot land on `sys.path` by accident, so tests exercise the installed package rather than the working directory." },
          { t: "p", text: "Never manipulating `sys.path` at runtime is worth stating as a rule: it works on the machine where it was written and breaks everywhere else." }
        ]
      }
    ]
  }
});

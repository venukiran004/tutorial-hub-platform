/* ============================================================================
   LESSON 7.5 — Packages, __init__.py and __main__
   ========================================================================= */
EC.receiveLesson({
  id: "7.5",

  lede: "A package is a directory Python treats as one importable unit, and its `__init__.py` is the only file guaranteed to run when anyone touches any part of it. **That makes it the most powerful and most abused file in a project** — it defines your public surface, and everything it imports is a cost paid by every user of every module inside.",

  objectives: [
    "Decide what belongs in `__init__.py` and what belongs nowhere near it",
    "Control a package's public surface with `__all__` and naming conventions",
    "Explain what `if __name__ == \"__main__\"` actually tests",
    "Make a package runnable with `__main__.py` and with a console entry point",
    "Choose between src layout and flat layout, with reasons"
  ],

  prerequisites: ["7.4"],

  blocks: [

    { t: "h2", n: "01", text: "What a package is", id: "package" },

    { t: "code", lang: "python", title: "structure and what it means", code: `
myapp/                       # a package -- importable as "myapp"
  __init__.py                # runs on ANY import of anything inside
  models.py                  # myapp.models
  services/                  # a subpackage
    __init__.py              # runs on any import of myapp.services.*
    billing.py               # myapp.services.billing
  _internal.py               # convention: private, not part of the API
  __main__.py                # runs on "python -m myapp"

# import myapp.services.billing executes, in order:
#   myapp/__init__.py
#   myapp/services/__init__.py
#   myapp/services/billing.py
`,
      caption: "**Every `__init__.py` on the path to a module runs first.** Three levels of package means three files execute before the one you asked for — which is why a heavy import at the top of a package is a tax on everything below it (Lesson 7.4)."
    },

    { t: "callout", kind: "tradeoff", title: "What belongs in `__init__.py`", body: [
      { t: "table",
        head: ["Content", "Verdict", "Why"],
        rows: [
          ["Nothing (empty file)", "**Good default**", "Zero cost, no surprises, always correct"],
          ["`__version__ = \"1.2.0\"`", "**Fine**", "One string, no imports"],
          ["A handful of re-exports for a **library**", "**Good**", "`from mylib import Client` is a real convenience for users"],
          ["Re-exports for an **application**", "Questionable", "Nobody imports your app from outside; you pay the cost for no benefit"],
          ["Imports that reach a heavy dependency", "**Bad**", "Every command, test and script pays for it"],
          ["Configuration loading, connections, `basicConfig`", "**Bad**", "Import-time side effects at an unpredictable moment"],
          ["Class or function definitions", "**Bad**", "Unfindable — nobody greps `__init__.py` for a class"]
        ]
      },
      { t: "p", text: "**The distinction is library versus application.** A library's `__init__` is its front door and a curated surface is worth the import cost. An application's package is imported only by itself, so re-exports add cost and an extra name for every object." }
    ]},

    { t: "h2", n: "02", text: "The public surface", id: "surface" },

    { t: "code", lang: "python", title: "three levels of \"public\"", code: `
# mylib/__init__.py
"""A small HTTP client.

    >>> from mylib import Client
    >>> Client("https://api.example").get("/health")
"""

from mylib.client import Client
from mylib.errors import ApiError, RateLimited

__version__ = "2.1.0"

# The curated surface. Also what "from mylib import *" exports, and
# what a documentation tool treats as the API.
__all__ = ["Client", "ApiError", "RateLimited", "__version__"]
`,
      caption: "`__all__` is a promise, not an enforcement — everything else is still reachable. Its value is that it is **explicit**: a reader knows what is supported, and a type checker or linter can flag an import of something outside it."
    },

    { t: "dl", items: [
      ["`name`", "Public. Documented, tested, and covered by your compatibility promise."],
      ["`_name`", "By convention private. Importable, but you may change it without notice. Use it liberally — an internal helper marked `_` is one you can refactor freely."],
      ["`__name`", "Name-mangled **inside a class only** (Lesson 4.4). It means nothing at module level, so `__helper` in a module is just a confusing name."],
      ["Not in `__all__`", "Not part of the star-import surface and not part of the documented API, even if the name has no underscore."]
    ]},

    { t: "callout", kind: "insight", title: "Lazy re-exports: the convenience without the cost", body: [
      { t: "code", lang: "python", title: "module-level __getattr__ (PEP 562, 3.7+)", numbered: false, code: `
# mylib/__init__.py
__all__ = ["Client", "AsyncClient"]


def __getattr__(name: str):
    """Called ONLY when a normal lookup on the module fails, so the
    submodule is imported the first time someone actually uses it."""
    if name == "Client":
        from mylib.client import Client
        return Client
    if name == "AsyncClient":
        from mylib.async_client import AsyncClient    # pulls in anyio
        return AsyncClient
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__():
    return sorted(__all__)          # keeps tab-completion working`},
      { t: "p", text: "`from mylib import Client` still works, and `anyio` is never imported unless someone asks for `AsyncClient`. This is how `numpy`, `scipy` and several large libraries keep import time flat as they grow." },
      { t: "p", text: "**The cost is honesty about tooling**: some type checkers need a matching `if TYPE_CHECKING:` block of real imports to see the names. Worth it for a library with heavy optional pieces; unnecessary for a small one." }
    ]},

    { t: "h2", n: "03", text: "__main__, and what the guard really tests", id: "main" },

    { t: "viz",
      title: "`__name__` is set by how the file was reached",
      caption: "Python sets `__name__` to the module's import name — except for the file it was told to run, which is always `\"__main__\"`. The guard is not asking \"am I a script\"; it is asking \"was I the entry point of this process\".",
      svg: `<svg viewBox="0 0 900 260" role="img" aria-label="Diagram showing __name__ set to __main__ for the entry file and to the dotted module path for imported files">
  <rect x="14" y="30" width="418" height="92" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="34" y="56" class="s-label" style="fill:var(--accent-ink)">RUN DIRECTLY</text>
  <text x="34" y="82" class="s-mono" style="font-size:11px">$ python myapp/cli.py</text>
  <text x="34" y="106" class="s-mono" style="font-size:11px">__name__ == "__main__"</text>

  <rect x="468" y="30" width="418" height="92" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="488" y="56" class="s-label">IMPORTED</text>
  <text x="488" y="82" class="s-mono" style="font-size:11px">&gt;&gt;&gt; import myapp.cli</text>
  <text x="488" y="106" class="s-mono" style="font-size:11px">__name__ == "myapp.cli"</text>

  <line x1="14" y1="146" x2="886" y2="146" class="s-stroke" stroke-width="1"/>

  <text x="14" y="176" class="s-label">THE SUBTLE ONE</text>
  <text x="14" y="202" class="s-mono" style="font-size:11px">$ python -m myapp.cli</text>
  <text x="300" y="202" class="s-sub">runs the file as "__main__" — AND myapp/cli.py is</text>
  <text x="300" y="222" class="s-sub">also importable as myapp.cli, so the module can exist</text>
  <text x="300" y="242" class="s-sub">TWICE in one process, with two copies of every global</text>

  <rect x="14" y="188" width="270" height="62" rx="7" style="fill:none;stroke:var(--crit)" stroke-width="1.3" stroke-dasharray="4 3"/>
</svg>`
    },

    { t: "code", lang: "python", title: "the guard, and what goes under it", code: `
# myapp/cli.py

def main(argv: list[str] | None = None) -> int:
    """The real entry point. Takes argv so it is TESTABLE -- a main()
    that reads sys.argv directly can only be tested by monkeypatching."""
    args = parse_args(argv)
    ...
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main(sys.argv[1:]))
`,
      caption: "**Keep the guard to two lines.** Logic inside it cannot be imported, cannot be tested, and cannot be reused. Everything real belongs in `main()`, which returns an exit code rather than calling `sys.exit` itself (Lesson 5.12)."
    },

    { t: "callout", kind: "trap", title: "The double-import problem", body: [
      { t: "code", lang: "python", title: "one file, two module objects", numbered: false, code: `
# myapp/worker.py
JOBS = []

def register(job):
    JOBS.append(job)

if __name__ == "__main__":
    from myapp.worker import JOBS as imported_jobs      # imports it AGAIN

    register("a")
    print(len(JOBS), len(imported_jobs))`,
        out: `1 0`},
      { t: "p", text: "Running `python -m myapp.worker` puts the file in `sys.modules` as `\"__main__\"`. The subsequent `import myapp.worker` finds no entry under that name, so it **executes the file a second time** — producing a separate module object with its own `JOBS` list." },
      { t: "p", text: "Consequences that bite in production: registries populate twice or not at all, `isinstance` fails because the same class exists as two distinct objects, and module-level state diverges silently." },
      { t: "p", text: "**The fix is structural.** Put the runnable part in `__main__.py` and never import the module that is being run as `__main__`." }
    ]},

    { t: "code", lang: "python", title: "__main__.py — a runnable package", code: `
# myapp/__main__.py
"""Runs on: python -m myapp

Keep this file to a call. The logic lives in myapp.cli, which is
importable, testable, and never the entry point itself.
"""
import sys

from myapp.cli import main

sys.exit(main(sys.argv[1:]))
`,
      out: `$ python -m myapp --help
usage: myapp [-h] {import,report} ...`,
      caption: "`python -m myapp` also works for a directory or a zip file containing `__main__.py`, which is how a whole application ships as a single executable zipapp."
    },

    { t: "table",
      head: ["Way to run", "Command", "Use when"],
      rows: [
        ["`__main__.py`", "`python -m myapp`", "Always available, no install step, good for development and CI"],
        ["Console entry point", "`myapp` (after install)", "**What users should get** — declared in `pyproject.toml`, on PATH"],
        ["A script file", "`python scripts/run.py`", "A one-off outside the package"],
        ["`python -c`", "`python -c \"from myapp import main; main()\"`", "Debugging only"]
      ],
      caption: "Declare both: `[project.scripts] myapp = \"myapp.cli:main\"` gives the installed command, and `__main__.py` means the package still runs from a checkout without installing (Lesson 7.7)."
    },

    { t: "h2", n: "04", text: "Project layout", id: "layout" },

    {"kind": "tree", "title": "The src layout", "caption": "The package lives under src/, so tests import the installed package rather than the working directory by accident. pyproject.toml at the root describes how to build and install it.", "root": {"label": "myproject/", "tone": "accent", "children": [{"label": "pyproject.toml", "tone": "good"}, {"label": "src/", "children": [{"label": "myproject/", "tone": "warn", "children": [{"label": "__init__.py"}, {"label": "core.py"}, {"label": "cli.py"}]}]}, {"label": "tests/", "children": [{"label": "test_core.py"}]}, {"label": "README.md"}]}, "t": "diagram", "id": "dg-7_5-04-0"},


    { t: "tabs", items: [
      { label: "src layout (recommended)", blocks: [
        { t: "code", lang: "python", title: "the package is not importable by accident", numbered: false, code: `
project/
  pyproject.toml
  src/
    myapp/
      __init__.py
      cli.py
      models.py
  tests/
    test_models.py
  README.md`},
        { t: "ul", items: [
          "**The project root is not on `sys.path`**, so `import myapp` only works if the package is installed — usually with `pip install -e .`.",
          "**Tests therefore exercise the installed package**, catching a file you forgot to include in the build before your users do.",
          "**No accidental shadowing** of the package by the working directory.",
          "The cost is one command: you must install before running anything."
        ]}
      ]},
      { label: "flat layout", blocks: [
        { t: "code", lang: "python", title: "simpler, with one real hazard", numbered: false, code: `
project/
  pyproject.toml
  myapp/
    __init__.py
    cli.py
  tests/
    test_models.py`},
        { t: "ul", items: [
          "Works immediately from a checkout with no install step — genuinely convenient for a small script or a teaching example.",
          "**But `import myapp` picks up the source directory**, so tests never verify what packaging produces.",
          "The classic failure: a module missing from the wheel because it was never added to the package configuration. Every local test passes; the installed package raises `ModuleNotFoundError`.",
          "Use it for scripts and small internal tools; use `src/` for anything published or deployed."
        ]}
      ]}
    ]},

    { t: "callout", kind: "note", title: "Tests belong outside the package", body: [
      { t: "p", text: "Putting `tests/` inside `myapp/` ships your tests to users, adds their imports to the package, and lets a test accidentally become part of the public surface. Keep them as a sibling of `src/`." },
      { t: "p", text: "The exception is a library that wants users to be able to run its test suite after installation — rare, and a deliberate choice rather than a default." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Design a package's public surface",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "You are packaging an internal HTTP client as a library four teams will depend on. It has a synchronous client, an async client that needs `anyio`, an exception hierarchy, and a `_signing` module full of internal helpers." },
        { t: "p", text: "The requirement that shapes everything: **importing the package must not import `anyio`** unless someone actually uses the async client — and `import mylib` must stay under 50 ms." }
      ],
      requirements: [
        "Design the layout, including where the version string lives.",
        "Curate the public surface with `__all__`, and mark internals clearly.",
        "Make `AsyncClient` importable as `from mylib import AsyncClient` without importing `anyio` at package import.",
        "Make the package runnable as `python -m mylib` and as an installed `mylib` command.",
        "Ensure `main()` is testable without spawning a process.",
        "Write a test that fails if a heavy dependency creeps into the import path.",
        "Explain what you would do differently if this were an application rather than a library."
      ],
      hint: "Module-level `__getattr__` is the mechanism for the lazy re-export. For the import-cost test, look at what is in `sys.modules` after importing your package in a fresh interpreter.",
      solution: {
        lang: "python",
        title: "mylib/",
        code: `# =========================================================================
# LAYOUT
# =========================================================================
#
#   project/
#     pyproject.toml
#     src/
#       mylib/
#         __init__.py          # curated surface, lazy async re-export
#         __main__.py          # python -m mylib
#         client.py            # Client -- stdlib + httpx only
#         async_client.py      # AsyncClient -- imports anyio (HEAVY)
#         errors.py            # the exception hierarchy
#         cli.py               # main(argv) -- testable
#         _signing.py          # internal; underscore says so
#     tests/
#
# src/ layout because this is published: tests then import the INSTALLED
# package, so a module missing from the wheel fails in CI rather than in
# a consumer's deployment (Lesson 7.4).


# =========================================================================
# src/mylib/__init__.py
# =========================================================================

"""A small HTTP client for internal services.

    >>> from mylib import Client
    >>> Client("https://api.internal").get("/health")

The async client is available as mylib.AsyncClient and imports anyio
only when first accessed.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

# Cheap imports only. errors.py and client.py pull in nothing beyond
# the stdlib and httpx.
from mylib.client import Client
from mylib.errors import (
    ApiError,
    ConfigurationError,
    RateLimited,
    RetryableError,
    Unauthorised,
)

__version__ = "1.0.0"

__all__ = [
    "Client",
    "AsyncClient",
    "ApiError",
    "ConfigurationError",
    "RateLimited",
    "RetryableError",
    "Unauthorised",
    "__version__",
]

# A type checker cannot follow __getattr__, so give it a real import
# that never executes at runtime (Lesson 7.4).
if TYPE_CHECKING:
    from mylib.async_client import AsyncClient


def __getattr__(name: str) -> object:
    """PEP 562: called only when a normal module attribute lookup fails.

    This is what keeps anyio out of the import path. "from mylib import
    Client" touches nothing heavy; "from mylib import AsyncClient"
    imports async_client at that moment, and Python caches the result
    on the module so the lookup happens once.
    """
    if name == "AsyncClient":
        from mylib.async_client import AsyncClient

        globals()["AsyncClient"] = AsyncClient      # cache it
        return AsyncClient

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> list[str]:
    """Without this, tab-completion and dir() would not show AsyncClient."""
    return sorted(__all__)


# =========================================================================
# src/mylib/cli.py -- the logic, importable and testable
# =========================================================================

import argparse
import sys
from collections.abc import Sequence


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="mylib")
    parser.add_argument("--version", action="version", version=__version__)
    parser.add_argument("path")
    parser.add_argument("--base-url", required=True)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Takes argv rather than reading sys.argv, and RETURNS an exit code
    rather than calling sys.exit.

    Both choices exist so a test can call main(["--base-url", "...",
    "/health"]) directly -- no subprocess, no monkeypatching sys.argv,
    and no SystemExit to catch.
    """
    args = build_parser().parse_args(argv)

    try:
        body = Client(args.base_url).get(args.path)
    except ApiError as err:
        print(f"error: {err}", file=sys.stderr)
        return 1

    print(body)
    return 0


# =========================================================================
# src/mylib/__main__.py -- runs on "python -m mylib"
# =========================================================================

# import sys
# from mylib.cli import main
#
# sys.exit(main(sys.argv[1:]))
#
# Two lines. Nothing lives here, because nothing in __main__.py can be
# imported or tested -- and importing mylib.cli from a file running as
# __main__ would be the double-import trap if the logic were here.


# =========================================================================
# pyproject.toml (the relevant part)
# =========================================================================
#
#   [project]
#   name = "mylib"
#   dynamic = ["version"]
#
#   [project.optional-dependencies]
#   async = ["anyio>=4"]          # heavy dep is OPTIONAL, matching the
#                                 # lazy import: pip install mylib[async]
#
#   [project.scripts]
#   mylib = "mylib.cli:main"      # the installed command
#
#   [tool.setuptools.dynamic]
#   version = {attr = "mylib.__version__"}   # ONE source of truth
#
# Both entry points are declared: [project.scripts] gives users a real
# command on PATH, and __main__.py means the package still runs from a
# checkout without installing.


# =========================================================================
# TESTS
# =========================================================================

import subprocess
import sys

import pytest


HEAVY = {"anyio", "sniffio", "trio"}


def test_importing_the_package_does_not_import_anyio() -> None:
    """THE requirement, as an executable check.

    Runs in a FRESH interpreter: doing this in-process would pass
    trivially once any other test has already imported anyio.
    """
    code = (
        "import sys; import mylib; "
        "print(','.join(sorted(set(sys.modules) & "
        f"{HEAVY!r})))"
    )
    result = subprocess.run(
        [sys.executable, "-c", code], capture_output=True, text=True, cwd="/tmp"
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "", f"heavy imports leaked: {result.stdout}"


def test_async_client_is_still_importable_by_name() -> None:
    """Laziness must be invisible to the caller."""
    from mylib import AsyncClient

    assert AsyncClient.__name__ == "AsyncClient"


def test_async_client_appears_in_dir() -> None:
    """Without __dir__, a lazily-exported name is missing from
    tab-completion -- a real usability regression."""
    import mylib

    assert "AsyncClient" in dir(mylib)


def test_unknown_attribute_still_raises_attribute_error() -> None:
    """A __getattr__ that raises the wrong type breaks hasattr() and
    every library that probes for optional attributes."""
    import mylib

    with pytest.raises(AttributeError):
        mylib.NoSuchThing


def test_import_time_stays_under_budget() -> None:
    """A regression here is invisible until a CLI takes two seconds to
    print --help (Lesson 7.4)."""
    result = subprocess.run(
        [sys.executable, "-X", "importtime", "-c", "import mylib"],
        capture_output=True, text=True, cwd="/tmp",
    )
    # Last line is the cumulative time for the top-level import, in us
    total_us = int(result.stderr.strip().splitlines()[-1].split("|")[1])
    assert total_us < 50_000, f"import took {total_us / 1000:.0f} ms"


def test_main_is_callable_without_a_subprocess() -> None:
    """Possible only because main() takes argv and returns a code."""
    assert main(["--base-url", "https://example.test", "/health"]) == 0


def test_public_surface_is_what_all_says() -> None:
    """Catches a re-export added to __init__ but never documented."""
    import mylib

    exported = {n for n in dir(mylib) if not n.startswith("_")}
    assert exported <= set(mylib.__all__)


# =========================================================================
# IF THIS WERE AN APPLICATION RATHER THAN A LIBRARY
# =========================================================================
#
#   - __init__.py would be EMPTY except for __version__. Re-exports exist
#     for external consumers, and an application has none -- so they add
#     import cost and a second name for every object, for no benefit.
#
#   - No lazy __getattr__. It is machinery that pays off when many
#     consumers import your package for many different reasons; inside
#     one application, import what you need where you need it.
#
#   - No __all__. Nothing outside the application imports from it, so
#     there is no surface to curate and it would just drift out of date.
#
#   - Still keep: src/ layout, main(argv) returning an exit code, the
#     two-line __main__.py, and the import-time test. Those are about
#     testability and startup cost, which applications care about more
#     than libraries do.`,
        notes: [
          { t: "p", text: "**The lazy `__getattr__` must cache into `globals()`.** Without that line the import machinery runs `__getattr__` on every single access — cheap after the first `sys.modules` hit, but a function call and a dict lookup on a path that is supposed to feel like an ordinary attribute. Writing the resolved object into the module's namespace makes the second access a normal lookup that never reaches `__getattr__` again." },
          { t: "p", text: "**`__dir__` is not optional when you use `__getattr__`.** A name that works but does not appear in `dir()` or tab-completion is a usability regression that people report as \"the async client is missing\"." },
          { t: "p", text: "**The import test must run in a fresh interpreter.** Checking `sys.modules` in-process passes trivially the moment any other test has imported `anyio` — the assertion would be about test ordering rather than about your package. `subprocess` with `cwd=\"/tmp\"` also proves the installed package is being imported rather than the source tree." },
          { t: "callout", kind: "insight", title: "Why `main(argv)` returning an int matters", body: [
            { t: "p", text: "A `main()` that reads `sys.argv` and calls `sys.exit` can only be tested by monkeypatching a global and catching `SystemExit`. Both are possible and both make the test about the test harness rather than about the behaviour." },
            { t: "p", text: "Taking `argv` and returning a code makes the entry point an ordinary function: `assert main([\"--base-url\", ...]) == 0`. The two lines that translate that into a process exit live in `__main__.py`, where nothing needs testing." }
          ]},
          { t: "p", text: "**Declaring `anyio` as an optional dependency mirrors the lazy import.** If the code can run without it, the package should not require it — `pip install mylib[async]` makes the relationship explicit, and someone installing the sync client does not pull in a dependency they will never execute." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A shared internal library adds a convenient re-export: `from mylib import metrics` in `__init__.py`, so callers can write `mylib.metrics.count(...)`. The metrics module imports a vendor SDK, which imports `grpc`." },
      { t: "p", text: "**Every service that depends on the library gains 900 ms of startup time**, including a Lambda function where cold-start latency is the product. Nobody connects the two, because the change was one import line in a file nobody reviews carefully." },
      { t: "p", text: "**It surfaced as a deployment failure, not a performance one.** A batch job with a 30-second startup probe began failing intermittently under load, and the investigation took two days before `python -X importtime` pointed at a package `__init__` that was pulling in a gRPC stack to expose a counter." },
      { t: "p", text: "**Two rules came out of it.** A package `__init__` may import only from the package's own cheap modules, enforced by an import-time budget test in CI. And convenience re-exports go through a lazy `__getattr__`, so the cost is paid by the callers who use the feature rather than by everyone who imports the package." }
    ]}
  ],

  takeaways: [
    "**Every `__init__.py` on the path to a module executes first**, so a heavy import in a package's `__init__` is a tax on every module inside it.",
    "**Empty is the right default for `__init__.py`.** A curated set of re-exports is worth it for a library's front door and rarely worth it inside an application.",
    "**`__all__` declares the supported surface** — it controls `import *`, guides documentation tools, and lets a linter flag an import of something unsupported.",
    "**A leading underscore is the real privacy mechanism at module level.** Double underscores mangle only inside classes.",
    "**Module-level `__getattr__` (PEP 562) gives lazy re-exports** — the convenience of `from pkg import Thing` without importing `Thing`'s dependencies at package import. Cache into `globals()` and add `__dir__`.",
    "**`__name__ == \"__main__\"` tests whether this file was the process entry point**, not whether it is a script.",
    "**Keep the guard to two lines** — logic under it cannot be imported, tested or reused.",
    "**`main(argv)` returning an exit code is testable**; a `main()` that reads `sys.argv` and calls `sys.exit` can only be tested by monkeypatching and catching `SystemExit`.",
    "**Running a module as `__main__` and also importing it creates two module objects** with separate globals — registries break and `isinstance` fails. Put the runnable part in `__main__.py`.",
    "**Declare both entry points**: `[project.scripts]` for the installed command, `__main__.py` so the package still runs from a checkout.",
    "**Use `src/` layout for anything published or deployed.** The project root is not on `sys.path`, so tests exercise the installed package and catch files missing from the build.",
    "**Tests belong outside the package** — inside, they ship to users and add their imports to your distribution."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Adding `from myapp.metrics import count` to `myapp/__init__.py` slows every service using the package. Why?",
        options: [
          "`__init__.py` is executed on every attribute access",
          "`__init__.py` runs on any import of anything inside the package, so its imports are paid by every consumer — including ones that never use metrics",
          "Re-exports disable the module cache",
          "The import is executed once per thread"
        ],
        answer: 1,
        why: "`import myapp.models` executes `myapp/__init__.py` first, so whatever it imports is loaded before the module you actually wanted. A single convenience re-export can pull in a vendor SDK and a gRPC stack, which is why an import-time budget test belongs in CI. A lazy `__getattr__` keeps the convenience and moves the cost to the callers who use it."
      },
      {
        stem: "What does `if __name__ == \"__main__\":` actually test?",
        options: [
          "Whether the file is a script rather than a module",
          "Whether this file was the entry point of the process — Python sets `__name__` to `\"__main__\"` for the file it was told to run and to the dotted path otherwise",
          "Whether the file is being run interactively",
          "Whether the module has been imported before"
        ],
        answer: 1,
        why: "Every module gets a `__name__`; it equals its import path except for the one file the interpreter was launched with. That is why `python -m myapp.worker` sets `__name__` to `\"__main__\"` while a later `import myapp.worker` finds no cache entry under that name and executes the file a second time — two module objects, two copies of every global."
      },
      {
        stem: "Why write `def main(argv=None) -> int` rather than having `main()` read `sys.argv` and call `sys.exit`?",
        options: [
          "`sys.argv` is unavailable in installed packages",
          "It makes `main` an ordinary function a test can call directly, instead of one that needs monkeypatching and a `SystemExit` to catch",
          "Returning an int is required by `[project.scripts]`",
          "It avoids importing `sys`"
        ],
        answer: 1,
        why: "`assert main([\"--base-url\", \"...\", \"/health\"]) == 0` is a plain unit test with no subprocess and no global patched. The two lines that turn a return value into a process exit belong in `__main__.py` or in the console-script wrapper, where there is nothing left to test."
      },
      {
        stem: "What does `src/` layout buy you over keeping the package at the project root?",
        options: [
          "Faster imports",
          "The project root is not on `sys.path`, so `import myapp` requires an install and tests therefore exercise the packaged code rather than the source tree",
          "It is required by `pyproject.toml`",
          "It allows multiple packages per project"
        ],
        answer: 1,
        why: "With a flat layout, running anything from the project directory puts your source on `sys.path` by accident, so a module missing from the wheel passes every local test and fails on install. Under `src/`, the only way to import the package is to install it — usually `pip install -e .` — which also removes the risk of the working directory shadowing the package."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What goes in `__init__.py`?",
        strong: "Ideally nothing, plus a version string. For a library, a small curated set of re-exports with `__all__` — that is the front door. For an application, keep it empty: nothing outside imports it, so re-exports are cost with no benefit.",
        answer: [
          { t: "p", text: "The reason is the mechanism: `__init__.py` executes on any import of anything inside the package, so everything it imports is paid by every consumer of every module." },
          { t: "p", text: "The library-versus-application distinction is what makes this a judgement rather than a rule, and it is the part most answers miss." },
          { t: "p", text: "Module-level `__getattr__` for lazy re-exports is the detail that shows depth — it keeps `from pkg import Thing` working without importing `Thing`'s dependencies, which is how large libraries keep import time flat." }
        ]
      },
      {
        level: "core",
        q: "Why `python -m mypackage` rather than `python mypackage/cli.py`?",
        strong: "`-m` puts the working directory on `sys.path` instead of the script's directory, sets `__package__` so relative imports work, and runs the package's `__init__.py` — which is how an installed entry point behaves too.",
        answer: [
          { t: "p", text: "Running code the same way in development and in production is the practical benefit: a project that only imports when run from one directory has a packaging gap." },
          { t: "p", text: "The double-import trap is worth raising unprompted — a module run as `__main__` and also imported exists twice, with separate globals, so registries break and `isinstance` fails against what looks like the same class." },
          { t: "p", text: "Declaring both `[project.scripts]` and a `__main__.py` covers users and contributors at once, and costs four lines." }
        ]
      },
      {
        level: "advanced",
        q: "How do you keep a library's import time low as it grows?",
        strong: "Nothing heavy in `__init__.py`, lazy re-exports through module-level `__getattr__`, heavy dependencies declared as optional extras, and an import-time budget test in CI so a regression fails a build rather than a deployment.",
        answer: [
          { t: "p", text: "`python -X importtime` is the tool to name — it attributes cost per import, which turns \"the CLI feels slow\" into a specific line in a specific file." },
          { t: "p", text: "Tying the lazy import to an optional dependency shows the design is coherent: if the code runs without `anyio`, the package should not require it, and `pip install mylib[async]` makes the relationship explicit." },
          { t: "p", text: "The test running in a fresh subprocess is the detail that makes it real — an in-process check passes trivially once any other test has imported the heavy module." }
        ]
      }
    ]
  }
});

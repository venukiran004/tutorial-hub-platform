/* ============================================================================
   LESSON 7.7 — pyproject.toml and Publishable Projects
   ========================================================================= */
EC.receiveLesson({
  id: "7.7",

  lede: "`pyproject.toml` replaced `setup.py`, `setup.cfg`, `requirements.txt` and half a dozen tool-specific config files with one declarative document. **Declarative is the important word**: `setup.py` was a program that had to be executed to learn a package's dependencies, which is why installing anything could run arbitrary code before you saw a single file.",

  objectives: [
    "Write a complete `[project]` table with the metadata that matters",
    "Choose a build backend and configure `src` layout correctly",
    "Distinguish extras, dependency groups and runtime dependencies",
    "Build an sdist and a wheel, and say what belongs in each",
    "Publish safely with trusted publishing rather than a long-lived token"
  ],

  prerequisites: ["7.5", "7.6"],

  blocks: [

    { t: "h2", n: "01", text: "The whole file", id: "file" },

    { t: "code", lang: "toml", title: "pyproject.toml", code: `
[build-system]
requires = ["hatchling>=1.24"]
build-backend = "hatchling.build"

[project]
name = "acme-billing"                 # the name on the index; hyphens fine
dynamic = ["version"]                 # read from code -- see below
description = "Invoice generation and reconciliation for Acme services."
readme = "README.md"
requires-python = ">=3.11,<3.14"
license = "MIT"
authors = [{ name = "Platform Team", email = "platform@acme.example" }]
keywords = ["billing", "invoicing"]

classifiers = [
    "Development Status :: 5 - Production/Stable",
    "Intended Audience :: Developers",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Typing :: Typed",
]

dependencies = [
    "httpx>=0.27,<0.29",
    "pydantic>=2.6,<3",
]

[project.optional-dependencies]
postgres = ["psycopg[binary]>=3.1,<4"]
cli = ["rich>=13,<14", "typer>=0.12,<0.13"]
all = ["acme-billing[postgres,cli]"]        # extras can compose

[dependency-groups]                          # PEP 735 -- NOT shipped
dev = ["pytest~=8.0", "mypy~=1.10", "ruff"]

[project.scripts]
acme-billing = "acme_billing.cli:main"       # module:callable

[project.urls]
Homepage = "https://github.com/acme/billing"
Changelog = "https://github.com/acme/billing/blob/main/CHANGELOG.md"

[tool.hatch.version]
path = "src/acme_billing/__init__.py"        # ONE source of truth

[tool.hatch.build.targets.wheel]
packages = ["src/acme_billing"]
`,
      hl: [1, 2, 3, 7, 32, 36, 39],
      caption: "**`[build-system]` is the only mandatory table.** It tells `pip` what to install in an isolated environment before it can even ask your project what its dependencies are — which is why it lists its own requirements separately."
    },

    { t: "dl", items: [
      ["`name` versus the import name", "`acme-billing` on the index, `acme_billing` in code. The index normalises hyphens, underscores and case; the import name is whatever directory you ship. Keep them corresponding or people will not find your package."],
      ["`requires-python`", "**Bound it on both sides.** Without an upper bound, `pip` will happily install into a Python released after your code was written and fail at runtime instead of at install time."],
      ["`dynamic = [\"version\"]`", "Says the backend computes it. The alternative is `version = \"1.4.0\"` written twice — here and in `__init__.py` — which drifts apart the first time someone is in a hurry."],
      ["`classifiers`", "Free-text metadata the index displays and filters on. `Typing :: Typed` and the Python version list are the two that users actually check."],
      ["`license`", "As of PEP 639, a plain SPDX expression string. Older projects use a `{ text = ... }` table, which still works."]
    ]},

    { t: "h2", n: "02", text: "Three kinds of dependency", id: "deps" },

    { t: "table",
      head: ["Table", "Installed when", "Shipped in metadata?", "For"],
      rows: [
        ["`[project] dependencies`", "Always", "Yes", "What the code needs to run"],
        ["`[project.optional-dependencies]` (extras)", "`pip install pkg[postgres]`", "Yes", "Optional **features** your users choose"],
        ["`[dependency-groups]`", "`uv sync`, `pip install --group dev`", "**No**", "Tools for developing the project"]
      ],
      caption: "The distinction people get wrong is extras versus groups. **An extra is part of your public interface** — a user can request it. A dependency group never leaves your repository, which is where `pytest` and `ruff` belong."
    },

    { t: "callout", kind: "trap", title: "Test tools declared as an extra ship to users", body: [
      { t: "code", lang: "toml", title: "the common mistake", numbered: false, code: `
# WRONG -- "dev" becomes a documented, installable feature of your
# package, and its metadata travels in the wheel forever.
[project.optional-dependencies]
dev = ["pytest", "mypy", "ruff", "black"]

# RIGHT -- a dependency group. Local to the repository.
[dependency-groups]
dev = ["pytest~=8.0", "mypy~=1.10", "ruff"]`},
      { t: "p", text: "Before PEP 735 there was no alternative, so a `dev` extra was standard practice and you will see it everywhere. It is now a legacy pattern: the metadata is published, `pip install yourpkg[dev]` works for anyone, and a security scanner reports your linter as part of your supply chain." },
      { t: "p", text: "Groups are supported by `uv`, `pdm` and recent `pip`. If you must support older tooling, keep the `dev` extra and add a comment saying why." }
    ]},

    { t: "h2", n: "03", text: "Build backends", id: "backends" },

    { t: "table",
      head: ["Backend", "Choose when", "Notes"],
      rows: [
        ["**hatchling**", "Default choice for a new pure-Python project", "Fast, sensible defaults, good version handling, no legacy surface"],
        ["**setuptools**", "You need C extensions, or you are migrating an old project", "The only one with deep extension-building support; requires more configuration"],
        ["**flit-core**", "A single-module package with no build steps", "Minimal and opinionated"],
        ["**pdm-backend**, **poetry-core**", "You already use that tool", "Fine; just do not mix them"],
        ["**maturin**", "A Rust extension", "The standard for PyO3 projects"],
        ["**scikit-build-core**", "A CMake-based C++ extension", "Replaces the setuptools + CMake dance"]
      ],
      caption: "**The backend is an implementation detail your users never see.** A wheel built by hatchling and one built by setuptools are indistinguishable to `pip`, so choose for your own convenience."
    },

    { t: "code", lang: "toml", title: "the src-layout incantation, per backend", code: `
# hatchling
[tool.hatch.build.targets.wheel]
packages = ["src/acme_billing"]

# setuptools -- automatic discovery finds src/ layout on its own
[tool.setuptools.packages.find]
where = ["src"]

# flit -- infers it from the module name, no configuration needed
[tool.flit.module]
name = "acme_billing"
`,
      caption: "This is the one piece of configuration `src` layout costs you (Lesson 7.5). Get it wrong and the wheel builds successfully containing nothing — which is why the verification step below matters more than it sounds."
    },

    { t: "h2", n: "04", text: "Building", id: "building" },

    {"kind": "flow", "title": "From source to a published package", "caption": "The build backend named in pyproject.toml turns the source tree into an sdist and a wheel; twine or uv uploads them; pip resolves and installs the wheel on the other side.", "cols": 4, "nodes": [{"id": "src", "label": "source tree", "sub": "pyproject.toml, src/"}, {"id": "build", "label": "python -m build", "sub": "the backend: hatchling, setuptools", "tone": "accent"}, {"id": "dist", "label": "dist/*.whl, *.tar.gz", "sub": "wheel and sdist", "tone": "good"}, {"id": "pypi", "label": "PyPI", "sub": "twine upload / uv publish", "tone": "warn"}], "edges": [["src", "build"], ["build", "dist"], ["dist", "pypi"]], "t": "diagram", "id": "dg-7_7-04-0"},



    { t: "viz",
      title: "sdist and wheel are different artefacts",
      caption: "An sdist is your source, packaged. A wheel is the installed layout, pre-built. pip prefers the wheel because installing it is an unzip — no build step, no compiler, no arbitrary code execution.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram comparing a source distribution containing sources and tests with a wheel containing only the installable package">
  <rect x="14" y="26" width="418" height="248" rx="9" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="34" y="52" class="s-label">SDIST — acme_billing-1.4.0.tar.gz</text>

  <g class="s-mono" style="font-size:10px">
    <text x="34" y="82">src/acme_billing/*.py</text>
    <text x="34" y="102">tests/</text>
    <text x="34" y="122">pyproject.toml</text>
    <text x="34" y="142">README.md, LICENSE</text>
    <text x="34" y="162">CHANGELOG.md</text>
  </g>

  <text x="34" y="196" class="s-sub">Installing it RUNS THE BACKEND to build</text>
  <text x="34" y="216" class="s-sub">a wheel first — needs a toolchain.</text>
  <text x="34" y="246" class="s-sub">For: reproducing a build, auditing,</text>
  <text x="34" y="266" class="s-sub">distributions that compile from source.</text>

  <rect x="468" y="26" width="418" height="248" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="488" y="52" class="s-label" style="fill:var(--accent-ink)">WHEEL — acme_billing-1.4.0-py3-none-any.whl</text>

  <g class="s-mono" style="font-size:10px">
    <text x="488" y="82">acme_billing/*.py</text>
    <text x="488" y="102">acme_billing/py.typed</text>
    <text x="488" y="122">acme_billing-1.4.0.dist-info/METADATA</text>
    <text x="488" y="142">acme_billing-1.4.0.dist-info/RECORD</text>
    <text x="488" y="162">acme_billing-1.4.0.dist-info/entry_points.txt</text>
  </g>

  <text x="488" y="196" class="s-sub" style="fill:var(--good)">Installing it is an UNZIP. No build,</text>
  <text x="488" y="216" class="s-sub" style="fill:var(--good)">no compiler, no code executed.</text>
  <text x="488" y="246" class="s-sub">Note: no src/, no tests/. The layout is</text>
  <text x="488" y="266" class="s-sub">what site-packages will contain.</text>
</svg>`
    },

    { t: "code", lang: "bash", title: "build, then verify before you publish", code: `
python -m pip install build twine
python -m build                      # produces dist/*.tar.gz and dist/*.whl

# 1. Is the metadata valid and the README renderable?
twine check dist/*

# 2. What is ACTUALLY in the wheel? The step people skip.
python -m zipfile --list dist/*.whl

# 3. Does it install and import in a clean environment?
python -m venv /tmp/verify
/tmp/verify/bin/pip install dist/*.whl
cd /tmp && /tmp/verify/bin/python -c "import acme_billing; print(acme_billing.__version__)"
/tmp/verify/bin/acme-billing --help          # the entry point works
`,
      out: `Checking dist/acme_billing-1.4.0-py3-none-any.whl: PASSED
Checking dist/acme_billing-1.4.0.tar.gz: PASSED

acme_billing/__init__.py
acme_billing/cli.py
acme_billing/py.typed
acme_billing-1.4.0.dist-info/METADATA
...
1.4.0`,
      caption: "**`cd /tmp` is doing real work in step 3.** Without it, the import might succeed because the source tree is on `sys.path`, and you learn nothing about the wheel (Lesson 7.4)."
    },

    { t: "callout", kind: "trap", title: "Files that are not `.py` are not included by default", body: [
      { t: "code", lang: "toml", title: "data files, templates, and py.typed", numbered: false, code: `
# The wheel contains .py files. Everything else must be declared.

# hatchling
[tool.hatch.build.targets.wheel]
packages = ["src/acme_billing"]
artifacts = ["src/acme_billing/templates/*.html"]

# setuptools
[tool.setuptools.package-data]
acme_billing = ["py.typed", "templates/*.html", "schema/*.json"]`},
      { t: "p", text: "The symptom is always the same and always confusing: **it works from a checkout and raises `FileNotFoundError` when installed**, because the template you load with a relative path was never in the wheel." },
      { t: "p", text: "**`py.typed` is the one people forget.** Without that empty marker file inside the package, type checkers ignore your annotations entirely and every user sees your library as untyped — annotations you wrote and shipped, invisible (Lesson 8.3)." },
      { t: "p", text: "Load package data with `importlib.resources.files(\"acme_billing\") / \"templates\"`, never with a path relative to `__file__` — the latter breaks inside a zipapp or a frozen build." }
    ]},

    { t: "h2", n: "05", text: "Publishing", id: "publishing" },

    { t: "ladder",
      title: "Getting a release onto an index",
      rungs: [
        { level: "bad", label: "Upload from a laptop with a stored token",
          why: "The token is long-lived, has upload rights to every project on the account, and lives in a file or shell history. Anyone who gets it can publish a release with your name on it, and the artefact came from an environment nobody can inspect.",
          code: `# ~/.pypirc
[pypi]
username = __token__
password = pypi-AgEIcHlwaS5vcmc...      # never expires

twine upload dist/*` },
        { level: "ok", label: "A project-scoped token in CI",
          why: "Scoped to one project and stored as a secret rather than on a laptop, so the blast radius is smaller and the build is reproducible. Still a long-lived credential that a compromised workflow can exfiltrate.",
          code: `# .github/workflows/release.yml
- run: python -m build
- run: twine upload dist/*
  env:
    TWINE_USERNAME: __token__
    TWINE_PASSWORD: \${{ secrets.PYPI_TOKEN }}` },
        { level: "best", label: "Trusted publishing (OIDC)",
          why: "No stored credential exists. PyPI verifies a short-lived identity token proving the build came from a specific workflow in a specific repository, and issues an upload token valid for minutes. There is nothing to leak, rotate, or steal.",
          code: `# Configure once on PyPI: repo, workflow file, and environment name.

name: release
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: pypi
    permissions:
      id-token: write            # the ONLY permission needed
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pipx run build
      - uses: pypa/gh-action-pypi-publish@release/v1
        # no username, no password, no secret`,
          note: "Publish to TestPyPI first with the same workflow and `repository-url: https://test.pypi.org/legacy/`. A version number on the real index can never be reused, so a mistake there is permanent." }
      ]
    },

    { t: "callout", kind: "warn", title: "Version numbers are immutable", body: [
      { t: "ul", items: [
        "**A released version can never be replaced.** You may delete a release, but the number is burned — nobody can ever upload `1.4.0` again, so a mistake means shipping `1.4.1`.",
        "**Deleting a release breaks anyone who pinned it.** Yank instead (`pip` skips a yanked version unless it is pinned exactly), which leaves existing lockfiles working while stopping new installs.",
        "**Names are permanent too.** Register the name early if it matters.",
        "**Follow semantic versioning and mean it**: patch for fixes, minor for additions, major for anything that breaks a caller. Your users' upper bounds depend on you being honest about the third case (Lesson 7.6)."
      ]},
      { t: "p", text: "Keep the version in exactly one place — a `__version__` in the package read by the backend, or a tag read by a plugin like `hatch-vcs`. Two copies drift, and the one in the metadata is the one users see." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Package a project that half-works",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "This package installs, and then fails for users in four different ways that all pass local testing. Diagnose from the symptoms and produce a `pyproject.toml` plus a release workflow that cannot ship the same problems again." },
        { t: "code", lang: "toml", title: "pyproject.toml — as found", numbered: false, code: `
[build-system]
requires = ["setuptools"]
build-backend = "setuptools.build_meta"

[project]
name = "reportkit"
version = "0.4.0"
dependencies = ["pandas", "jinja2"]

[project.optional-dependencies]
dev = ["pytest", "mypy"]`},
        { t: "code", lang: "bash", title: "the four bug reports", numbered: false, code: `
1. "ModuleNotFoundError: No module named 'reportkit'" after pip install

2. "FileNotFoundError: templates/invoice.html" when calling render()

3. "mypy says reportkit is missing library stubs" -- but it IS annotated

4. "reportkit 0.4.0 broke my build" -- pandas 3.0 landed and the code
   uses an API removed in it`},
        { t: "p", text: "The project uses `src/` layout, ships Jinja templates, is fully annotated, and its version is also hard-coded in `src/reportkit/__init__.py`." }
      ],
      requirements: [
        "Explain each of the four failures and its root cause.",
        "Write a complete `pyproject.toml` fixing all four, with a single source of truth for the version.",
        "Move the development tools out of the published metadata.",
        "Add the verification steps that would have caught bugs 1, 2 and 3 before release.",
        "Write a release workflow using trusted publishing.",
        "Explain what `python -m zipfile --list dist/*.whl` would have shown for bugs 1 and 2."
      ],
      hint: "Three of the four are the same class of problem: the wheel does not contain what the developer assumed. The fourth is about what the metadata promises rather than what it contains.",
      solution: {
        lang: "toml",
        title: "pyproject.toml + release.yml",
        code: `# =========================================================================
# DIAGNOSIS
# =========================================================================
#
# BUG 1 -- ModuleNotFoundError after install
#   src/ layout with no package discovery configuration. setuptools looked
#   for packages at the project root, found none, and built an EMPTY wheel.
#   It succeeded, uploaded, and installed. Locally everything worked
#   because the source tree was on sys.path (Lesson 7.4).
#
# BUG 2 -- FileNotFoundError for a template
#   A wheel contains .py files. Everything else must be declared. The
#   templates directory was never in the artefact -- and the code loaded
#   it with a path relative to __file__, which works from a checkout and
#   not from site-packages.
#
# BUG 3 -- "missing library stubs" despite annotations
#   No py.typed marker. PEP 561: a type checker ignores a package's
#   inline annotations unless that empty file is present INSIDE the
#   installed package. The annotations shipped; nothing reads them.
#
# BUG 4 -- pandas 3.0 broke consumers
#   "pandas" with no bound. pip resolves to the newest release, so a
#   major version published after this code was written installs happily
#   and fails at runtime. Every direct dependency needs an upper bound.
#
# WHAT zipfile --list WOULD HAVE SHOWN
#
#   $ python -m zipfile --list dist/reportkit-0.4.0-py3-none-any.whl
#   reportkit-0.4.0.dist-info/METADATA
#   reportkit-0.4.0.dist-info/RECORD
#   reportkit-0.4.0.dist-info/WHEEL
#
#   No reportkit/ directory at all -- bug 1, visible in one command
#   before anything was published. With bug 1 fixed but not bug 2, the
#   listing shows the .py files and no templates/*.html.


# =========================================================================
# THE FIXED FILE
# =========================================================================

[build-system]
requires = ["hatchling>=1.24"]
build-backend = "hatchling.build"
# hatchling rather than setuptools: src/ layout needs one line instead of
# a discovery table, and data files are declared where you would look.

[project]
name = "reportkit"
dynamic = ["version"]                 # BUG: version was duplicated
description = "Invoice and statement rendering for Acme reports."
readme = "README.md"
requires-python = ">=3.11,<3.14"      # bounded on BOTH sides
license = "MIT"
authors = [{ name = "Platform Team", email = "platform@acme.example" }]

classifiers = [
    "Development Status :: 4 - Beta",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Programming Language :: Python :: 3.13",
    "Typing :: Typed",                # matches the py.typed marker
]

dependencies = [
    "pandas>=2.2,<3",                 # FIX 4: upper bound
    "jinja2>=3.1,<4",
]

[project.optional-dependencies]
# Genuine optional FEATURES only -- things a user might ask for.
excel = ["openpyxl>=3.1,<4"]

[dependency-groups]
# PEP 735: development tools, never published in metadata.
dev = ["pytest~=8.0", "mypy~=1.10", "ruff", "build", "twine"]

[project.urls]
Homepage = "https://github.com/acme/reportkit"
Changelog = "https://github.com/acme/reportkit/blob/main/CHANGELOG.md"

[tool.hatch.version]
path = "src/reportkit/__init__.py"    # ONE source of truth for the version

[tool.hatch.build.targets.wheel]
packages = ["src/reportkit"]          # FIX 1: the empty-wheel bug

[tool.hatch.build.targets.wheel.force-include]
"src/reportkit/templates" = "reportkit/templates"   # FIX 2

# FIX 3 lives on disk, not in this file: create an EMPTY file at
#   src/reportkit/py.typed
# Non-.py files still need declaring, so it is covered by the
# force-include above only if it sits under templates/. It does not,
# so hatchling needs it listed:
[tool.hatch.build.targets.wheel.shared-data]
# (for hatchling, py.typed inside the package directory is included
#  automatically as package data; for setuptools it must appear in
#  [tool.setuptools.package-data].)

[tool.hatch.build.targets.sdist]
include = ["src/", "tests/", "README.md", "LICENSE", "CHANGELOG.md"]


# =========================================================================
# THE CODE CHANGE THAT GOES WITH FIX 2
# =========================================================================
#
#   # WRONG -- breaks in a zipapp, and depends on file layout
#   TEMPLATES = Path(__file__).parent / "templates"
#
#   # RIGHT -- works from a wheel, a zip, or a frozen build
#   from importlib.resources import files
#
#   def render(name: str, **context) -> str:
#       template = files("reportkit").joinpath(f"templates/{name}")
#       return Template(template.read_text(encoding="utf-8")).render(**context)
#
# Declaring the file in the wheel and loading it correctly are two
# separate fixes. Doing only one leaves the bug.


# =========================================================================
# VERIFICATION -- run before every release, in CI
# =========================================================================
#
#   python -m build
#
#   # Would have caught bugs 1 and 2 outright:
#   python -m zipfile --list dist/*.whl | grep -q "reportkit/__init__.py"
#   python -m zipfile --list dist/*.whl | grep -q "reportkit/templates/"
#   python -m zipfile --list dist/*.whl | grep -q "reportkit/py.typed"
#
#   twine check dist/*
#
#   # The real test: a clean environment, run from ELSEWHERE
#   python -m venv /tmp/verify
#   /tmp/verify/bin/pip install "dist/reportkit-*.whl"
#   cd /tmp && /tmp/verify/bin/python -c "
#   import reportkit
#   print(reportkit.__version__)
#   print(reportkit.render('invoice.html', total=10))   # bug 2
#   "
#
#   # And bug 3, which no import test can detect:
#   cd /tmp && /tmp/verify/bin/python -m mypy -c "
#   import reportkit
#   reportkit.render(1)          # must be a type ERROR, not 'no stubs'
#   "
#
# "cd /tmp" is the load-bearing part of all of these: from the project
# directory the source tree is on sys.path and every check passes
# regardless of what the wheel contains.


# =========================================================================
# .github/workflows/release.yml
# =========================================================================
#
#   name: release
#   on:
#     release:
#       types: [published]
#
#   jobs:
#     build:
#       runs-on: ubuntu-latest
#       steps:
#         - uses: actions/checkout@v4
#         - uses: actions/setup-python@v5
#           with: { python-version: "3.12" }
#         - run: pipx run build
#
#         - name: The wheel must contain what we think it contains
#           run: |
#             python -m zipfile --list dist/*.whl > listing.txt
#             grep -q "reportkit/__init__.py" listing.txt
#             grep -q "reportkit/templates/invoice.html" listing.txt
#             grep -q "reportkit/py.typed" listing.txt
#             pipx run twine check dist/*
#
#         - name: Install from the wheel and smoke-test it
#           run: |
#             python -m venv /tmp/v
#             /tmp/v/bin/pip install dist/*.whl
#             cd /tmp && /tmp/v/bin/python -c "import reportkit; reportkit.render('invoice.html', total=1)"
#
#         - uses: actions/upload-artifact@v4
#           with: { name: dist, path: dist/ }
#
#     publish:
#       needs: build
#       runs-on: ubuntu-latest
#       environment: pypi
#       permissions:
#         id-token: write        # trusted publishing -- the ONLY permission
#       steps:
#         - uses: actions/download-artifact@v4
#           with: { name: dist, path: dist/ }
#         - uses: pypa/gh-action-pypi-publish@release/v1
#           # no username, no password, no long-lived secret anywhere
#
# The build and publish jobs are separate so the artefact is verified
# before any credential is involved, and the publish job holds no
# permission except issuing an OIDC identity token.`,
        notes: [
          { t: "p", text: "**Three of the four bugs are one bug: nobody looked inside the wheel.** `python -m zipfile --list dist/*.whl` takes a second and would have shown an empty package, missing templates and a missing `py.typed` marker before anything was published. It belongs in CI as three `grep` lines." },
          { t: "p", text: "**`cd /tmp` is what makes the verification real.** Run from the project directory, the source tree is on `sys.path`, so `import reportkit` succeeds no matter what the wheel contains and every check is theatre. This is the same property `src/` layout provides during development (Lesson 7.5)." },
          { t: "p", text: "**Bug 2 needs two fixes, not one.** Declaring the templates in the wheel is necessary and insufficient — code loading them via `Path(__file__).parent` still assumes a filesystem layout. `importlib.resources.files()` works from a wheel, a zipapp or a frozen build, and it is the same amount of typing." },
          { t: "callout", kind: "insight", title: "`py.typed` is the highest ratio of impact to effort in packaging", body: [
            { t: "p", text: "It is an empty file. Without it, PEP 561 says a type checker must ignore your inline annotations entirely — so every hour spent annotating the library produces exactly nothing for users, and they see \"missing library stubs\"." },
            { t: "p", text: "It also has to be *in the wheel*, which means declaring it as package data. Creating the file and forgetting the declaration produces the identical symptom, which is why the CI check greps the built artefact rather than the source tree." }
          ]},
          { t: "p", text: "**Separating build from publish is a supply-chain control, not tidiness.** The job holding the publishing identity downloads a verified artefact and does nothing else — it never runs project code, so a compromised dependency in the test suite cannot reach the credential. With trusted publishing there is no long-lived credential to reach in the first place." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team publishes an internal library used by nine services. Version 2.0.0 changes a function's return type from a list to a generator — a reasonable improvement, released as a major version, documented in the changelog." },
      { t: "p", text: "**Seven services break in production within two hours.** Their `pyproject.toml` files all say `internal-lib>=1.4`, with no upper bound, so the next `pip install` in each deployment pipeline pulled 2.0.0 and the code that did `len(result)` failed." },
      { t: "p", text: "**Semantic versioning worked exactly as designed and prevented nothing**, because the consumers never expressed an upper bound. A major version bump is a signal, and a signal only helps someone who is listening for it." },
      { t: "p", text: "**Two fixes, on two sides.** Consumers add `<3` to every direct dependency, and lockfiles mean an upgrade happens when someone runs the command rather than when the calendar turns (Lesson 7.6). Publishers keep a deprecation period — ship the new behaviour behind a flag in a minor release, warn for a cycle, then change the default — because being technically correct about the version number is cold comfort during an incident." }
    ]}
  ],

  takeaways: [
    "**`[build-system]` is the only mandatory table**, and it exists so `pip` can install the backend in isolation before asking your project anything.",
    "**`pyproject.toml` is declarative**, unlike `setup.py`, which had to be executed to reveal a package's dependencies — the source of a whole class of supply-chain risk.",
    "**Bound `requires-python` on both sides.** Without an upper bound, pip installs into a Python your code has never run on and fails at runtime instead of at install.",
    "**Extras are a public feature; dependency groups are private tooling.** A `dev` extra publishes your linter as part of your package's metadata.",
    "**The backend is your choice and invisible to users** — hatchling for new pure-Python projects, setuptools for C extensions, maturin for Rust.",
    "**`src` layout needs one line of backend configuration.** Get it wrong and the build succeeds with an empty wheel.",
    "**A wheel contains only `.py` files unless you declare otherwise.** Templates, schemas and `py.typed` must be listed as package data.",
    "**`py.typed` is an empty file that makes every annotation you wrote visible.** Without it, type checkers ignore your library entirely.",
    "**Load package data with `importlib.resources.files()`**, not a path relative to `__file__`, so it works from a wheel or a zipapp.",
    "**Inspect the artefact before publishing**: `python -m zipfile --list dist/*.whl`, then install into a clean environment and import from a different directory.",
    "**Use trusted publishing (OIDC)** so no long-lived upload token exists to leak, and keep build and publish as separate jobs.",
    "**A published version number can never be reused.** Yank rather than delete, so existing lockfiles keep working while new installs skip it."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A package installs successfully but `import reportkit` raises `ModuleNotFoundError`. The project uses `src/` layout. What happened?",
        options: [
          "`src/` layout is not supported by wheels",
          "The backend was not told where the package lives, so it built an empty wheel — and local testing passed because the source tree was on `sys.path`",
          "The package name and import name differ",
          "`__init__.py` is missing"
        ],
        answer: 1,
        why: "With `src/` layout the backend needs one line — `packages = [\"src/reportkit\"]` for hatchling, or `where = [\"src\"]` for setuptools. Without it, discovery finds nothing at the project root and produces a wheel containing only metadata. The build succeeds, so nothing fails until a user installs it. `python -m zipfile --list dist/*.whl` shows the empty package in one command."
      },
      {
        stem: "A fully annotated library gets \"missing library stubs\" from users' type checkers. Why?",
        options: [
          "The annotations use syntax their Python version does not support",
          "There is no `py.typed` marker inside the installed package, so PEP 561 requires checkers to ignore the inline annotations",
          "Annotations are stripped from wheels",
          "The `Typing :: Typed` classifier is missing"
        ],
        answer: 1,
        why: "PEP 561 makes inline annotations opt-in through an empty `py.typed` file inside the package. Without it, every hour spent annotating produces nothing for users. The file must also reach the wheel, which means declaring it as package data — creating it and forgetting the declaration gives the identical symptom, so the CI check should grep the built artefact."
      },
      {
        stem: "Why put `pytest` and `mypy` in `[dependency-groups]` rather than a `dev` extra?",
        options: [
          "Extras cannot contain more than one package",
          "An extra is published metadata — anyone can `pip install yourpkg[dev]`, and security scanners see your linter as part of your supply chain",
          "Dependency groups install faster",
          "Extras are deprecated"
        ],
        answer: 1,
        why: "Extras are part of your public interface: a user can request them, and the metadata travels in the wheel permanently. Dependency groups (PEP 735) never leave the repository, which is exactly right for tools that only contributors need. The `dev` extra was standard practice before groups existed, so it appears in plenty of projects — it is legacy, not a pattern to copy."
      },
      {
        stem: "What does trusted publishing (OIDC) give you over a project-scoped API token in CI?",
        options: [
          "Faster uploads",
          "No long-lived credential exists — the index verifies a short-lived identity token proving the build came from a specific workflow, so there is nothing to leak or rotate",
          "It allows reusing version numbers",
          "It signs the artefacts cryptographically"
        ],
        answer: 1,
        why: "A stored token is a secret that can be exfiltrated by any code running in the workflow, and it usually outlives everyone's memory of creating it. With OIDC, the workflow proves its identity and receives an upload token valid for minutes. Combined with separate build and publish jobs, the job holding the identity never executes project code at all."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What replaced `setup.py`, and why?",
        strong: "`pyproject.toml`. The key change is that it is declarative — `setup.py` was a Python program that had to be executed to discover a package's dependencies, so installing anything ran arbitrary code before you could inspect it.",
        answer: [
          { t: "p", text: "`[build-system]` is the part worth explaining: it exists so pip can install the backend in an isolated environment first, which is what makes the rest of the file readable without executing anything." },
          { t: "p", text: "The consolidation matters too — one file replacing `setup.cfg`, `MANIFEST.in`, `requirements.txt` and most tool config, so a reader has one place to look." },
          { t: "p", text: "Knowing the backend is pluggable and invisible to users shows the model is understood: a wheel from hatchling and one from setuptools are indistinguishable to pip." }
        ]
      },
      {
        level: "advanced",
        q: "How do you verify a package before publishing?",
        strong: "Build it, list the contents of the wheel, `twine check` the metadata, then install it into a clean virtual environment and import it **from a different directory** so the source tree is not on `sys.path`.",
        answer: [
          { t: "p", text: "The `cd /tmp` detail is the one that shows real experience — verification run from the project directory passes regardless of what the wheel contains." },
          { t: "p", text: "`python -m zipfile --list` catches the whole family of missing-content bugs: an empty package from misconfigured discovery, missing templates, a missing `py.typed`." },
          { t: "p", text: "Making these CI steps rather than a personal checklist is the point — they are a few `grep` lines, and a released version number can never be reused." }
        ]
      },
      {
        level: "core",
        q: "How should a library version its dependencies and itself?",
        strong: "Widest supported ranges for its own dependencies, with upper bounds where a break is known. Semantic versioning for itself, one source of truth for the number, and a deprecation period before changing behaviour.",
        answer: [
          { t: "p", text: "The point that semver only helps consumers who set upper bounds is the mature observation — a major bump is a signal, and a signal helps nobody who is not listening." },
          { t: "p", text: "Immutability of published versions is the operational fact people learn the hard way: yank rather than delete, so existing lockfiles keep working while new installs skip the bad release." },
          { t: "p", text: "The publisher-side courtesy — ship behind a flag, warn for a cycle, then change the default — is what separates a library people trust from one they pin and never upgrade." }
        ]
      }
    ]
  }
});

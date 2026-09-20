/* ============================================================================
   LESSON 7.6 — Virtual Environments and Dependency Management
   ========================================================================= */
EC.receiveLesson({
  id: "7.6",

  lede: "Python installs packages into one shared directory per interpreter, and two projects that need different versions of the same library cannot both be satisfied. A virtual environment is the fix, and it is far simpler than it looks: **a directory, a copy of the interpreter, and a `PATH` entry**. Everything above that — pinning, lockfiles, hashes — exists to answer one question: will this install produce the same thing tomorrow?",

  objectives: [
    "Explain what a virtual environment actually is and what activation does",
    "Distinguish direct dependencies from the transitive graph, and pin each correctly",
    "Choose between a requirements file, a lockfile and hash-pinned installs",
    "Read version specifiers precisely, including what `~=` and `>=` permit",
    "Diagnose the environment problems that produce \"it works on my machine\""
  ],

  prerequisites: ["7.4"],

  blocks: [

    { t: "h2", n: "01", text: "What a virtual environment is", id: "venv" },

    { t: "code", lang: "bash", title: "three commands, and what they leave behind", code: `
python -m venv .venv

# What was created:
.venv/
  pyvenv.cfg              # points at the base interpreter -- THE whole trick
  bin/python              # symlink (or a small copy on Windows: Scripts/)
  bin/pip
  lib/python3.12/site-packages/    # empty except pip and setuptools

source .venv/bin/activate          # Linux / macOS
.venv\\Scripts\\activate             # Windows

# What activate did -- that is all:
#   PATH="/project/.venv/bin:$PATH"
#   VIRTUAL_ENV=/project/.venv
#   (changed the shell prompt)
`,
      caption: "**Activation only edits `PATH`.** The interpreter itself finds its environment by reading `pyvenv.cfg` next to the executable — which is why `.venv/bin/python script.py` works perfectly without activating anything."
    },

    { t: "callout", kind: "insight", title: "You never actually need to activate", body: [
      { t: "code", lang: "bash", title: "explicit is safer in scripts and CI", numbered: false, code: `
# These are equivalent, and the second cannot be run against the wrong env
source .venv/bin/activate && pip install -r requirements.txt
.venv/bin/pip install -r requirements.txt

# In a Makefile, a CI job, or a systemd unit -- always the explicit form
.venv/bin/python -m pytest
.venv/bin/python -m myapp`},
      { t: "p", text: "Activation is a convenience for an interactive shell. In anything automated, the explicit path removes a whole class of failure where a step ran outside the environment because activation did not persist between shell invocations." },
      { t: "p", text: "**`python -m pip` rather than `pip`** is the other habit worth forming: it guarantees pip installs into the interpreter you just named, rather than whichever `pip` happens to be first on `PATH`." }
    ]},

    { t: "callout", kind: "trap", title: "The four ways people break their environment", body: [
      { t: "table",
        head: ["Mistake", "What happens"],
        rows: [
          ["`sudo pip install`", "Installs into the **system** Python, which the operating system also uses. On some distributions this has bricked `apt`. Modern pip refuses with an `externally-managed-environment` error, for good reason."],
          ["`pip install` with no environment active", "Installs into your user site-packages, where it silently affects every project on the machine and is invisible in any requirements file."],
          ["Committing `.venv/`", "Hundreds of megabytes of platform-specific binaries in git, and it does not work on anyone else's machine anyway. Add it to `.gitignore`."],
          ["Setting `PYTHONPATH` to fix an import", "Works on the machine where it was set and nowhere else. The fix is `pip install -e .` (Lesson 7.5)."]
        ]
      },
      { t: "p", text: "**One environment per project, created in the project directory, never committed.** That single rule prevents all four." }
    ]},

    { t: "h2", n: "02", text: "Direct versus transitive", id: "graph" },

    {"kind": "tree", "title": "Direct versus transitive dependencies", "caption": "You declare the direct ones; the resolver pulls in their dependencies. A lock file records every resolved version so two installs on two machines are identical.", "root": {"label": "your project", "tone": "accent", "children": [{"label": "requests  (direct)", "tone": "good", "children": [{"label": "urllib3"}, {"label": "certifi"}, {"label": "charset-normalizer"}]}, {"label": "pandas  (direct)", "tone": "good", "children": [{"label": "numpy"}, {"label": "python-dateutil", "children": [{"label": "six"}]}]}]}, "t": "diagram", "id": "dg-7_6-02-0"},


    { t: "viz",
      title: "Two different lists, for two different jobs",
      caption: "You choose your direct dependencies; the resolver chooses everything underneath. Recording only the first gives a build that can change without you; recording only the second loses the distinction between what you asked for and what came along.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram distinguishing three declared direct dependencies from the larger transitive graph installed beneath them">
  <rect x="14" y="26" width="410" height="250" rx="9" style="fill:none;stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="34" y="52" class="s-label" style="fill:var(--accent-ink)">DIRECT — you wrote these down</text>

  <rect x="34" y="66" width="150" height="34" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.2"/>
  <text x="109" y="88" text-anchor="middle" class="s-mono" style="font-size:10px">fastapi</text>
  <rect x="200" y="66" width="150" height="34" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.2"/>
  <text x="275" y="88" text-anchor="middle" class="s-mono" style="font-size:10px">httpx</text>
  <rect x="34" y="112" width="150" height="34" rx="6" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.2"/>
  <text x="109" y="134" text-anchor="middle" class="s-mono" style="font-size:10px">pydantic</text>

  <text x="34" y="182" class="s-sub">Go in pyproject.toml with a RANGE:</text>
  <text x="34" y="204" class="s-mono" style="font-size:10px">fastapi&gt;=0.110,&lt;0.120</text>
  <text x="34" y="228" class="s-sub">Answers: what does this project need?</text>
  <text x="34" y="252" class="s-sub">Reviewed by humans. Changes deliberately.</text>

  <rect x="452" y="26" width="434" height="250" rx="9" style="fill:none;stroke:var(--border-strong)" stroke-width="1.3"/>
  <text x="472" y="52" class="s-label">TRANSITIVE — the resolver chose these</text>

  <g class="s-mono" style="font-size:9px">
    <rect x="472" y="66" width="96" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="520" y="83" text-anchor="middle">starlette</text>
    <rect x="576" y="66" width="96" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="624" y="83" text-anchor="middle">anyio</text>
    <rect x="680" y="66" width="96" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="728" y="83" text-anchor="middle">sniffio</text>
    <rect x="784" y="66" width="88" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="828" y="83" text-anchor="middle">idna</text>

    <rect x="472" y="100" width="96" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="520" y="117" text-anchor="middle">httpcore</text>
    <rect x="576" y="100" width="96" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="624" y="117" text-anchor="middle">h11</text>
    <rect x="680" y="100" width="96" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="728" y="117" text-anchor="middle">certifi</text>
    <rect x="784" y="100" width="88" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="828" y="117" text-anchor="middle">typing-ext</text>

    <rect x="472" y="134" width="96" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="520" y="151" text-anchor="middle">pydantic-core</text>
    <rect x="576" y="134" width="96" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="624" y="151" text-anchor="middle">annotated</text>
    <rect x="680" y="134" width="192" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="776" y="151" text-anchor="middle">... 30 more</text>
  </g>

  <text x="472" y="182" class="s-sub">Go in a LOCKFILE, pinned exactly:</text>
  <text x="472" y="204" class="s-mono" style="font-size:10px">anyio==4.4.0 --hash=sha256:...</text>
  <text x="472" y="228" class="s-sub">Answers: what exactly is installed?</text>
  <text x="472" y="252" class="s-sub">Generated by a tool. Committed. Never hand-edited.</text>
</svg>`
    },

    { t: "table",
      head: ["File", "Contains", "Written by", "Committed?"],
      rows: [
        ["`pyproject.toml`", "Direct dependencies, as **ranges**", "You", "Yes"],
        ["`requirements.txt` (as a lock)", "The **entire** resolved graph, pinned with `==`", "A tool (`pip-compile`, `uv`)", "Yes"],
        ["`uv.lock` / `poetry.lock`", "The full graph plus hashes and platform markers", "The tool", "Yes"],
        ["`constraints.txt`", "Upper bounds applied to whatever is being installed", "You, rarely", "Yes"],
        ["`.venv/`", "The installed environment", "The tool", "**No**"]
      ],
      caption: "**`pip freeze > requirements.txt` conflates the two.** It records everything installed, including things you installed once and forgot, with no distinction between what you need and what came along — and it captures your machine's resolution rather than a reproducible one."
    },

    { t: "h2", n: "03", text: "Version specifiers, precisely", id: "specifiers" },

    { t: "table",
      head: ["Specifier", "Allows", "Use for"],
      rows: [
        ["`==2.31.0`", "Exactly that version", "Lockfiles. Never in a library's dependencies"],
        ["`>=2.31`", "That and anything newer, **including 3.0**", "Rarely correct on its own — the next major will break you"],
        ["`>=2.31,<3`", "The rest of the 2.x line", "**The right default** for a direct dependency"],
        ["`~=2.31.0`", "`>=2.31.0,<2.32.0` — patch releases only", "A dependency you distrust"],
        ["`~=2.31`", "`>=2.31,<3.0` — minor and patch", "Equivalent to the recommended default, more compactly"],
        ["`!=2.31.2`", "Everything except that release", "Excluding one known-broken version"],
        ["`==2.31.*`", "Any patch of 2.31", "Same as `~=2.31.0`"]
      ],
      caption: "**`~=` truncates the last component you specify.** `~=2.31` allows minor upgrades; `~=2.31.0` does not. That one extra `.0` changes the meaning entirely, and it is the specifier people most often get backwards."
    },

    { t: "callout", kind: "tradeoff", title: "How tightly to pin", body: [
      { t: "table",
        head: ["", "Application", "Library"],
        rows: [
          ["Direct dependencies", "Range in `pyproject.toml`", "**Widest range you actually support**"],
          ["Transitive graph", "**Pinned exactly in a lockfile**", "Not pinned at all"],
          ["Upper bounds", "Yes — `<3` on everything", "Only where you know a break exists"],
          ["Why", "You control the deployment; reproducibility wins", "Your users have their own constraints; over-pinning makes you uninstallable"]
        ]
      },
      { t: "p", text: "**A library that pins `requests==2.31.0` is a library that cannot coexist** with anything else pinning a different patch. Libraries declare compatibility; applications decide installations." },
      { t: "p", text: "The exception both ways: an application still needs upper bounds on direct dependencies, or a `pip install` six months from now resolves to a major version that did not exist when you wrote the code." }
    ]},

    { t: "h2", n: "04", text: "Reproducible installs", id: "reproducible" },

    { t: "code", lang: "bash", title: "the pip-tools workflow", code: `
# You maintain requirements.in -- direct dependencies only, with ranges
cat requirements.in
#   fastapi>=0.110,<0.120
#   httpx~=0.27
#   pydantic>=2.6,<3

# The tool resolves the FULL graph and pins it, with hashes
pip-compile --generate-hashes requirements.in -o requirements.txt

# Every environment installs from the generated file
pip install --require-hashes -r requirements.txt

# Upgrading is a deliberate, reviewable act
pip-compile --upgrade-package httpx requirements.in
git diff requirements.txt              # exactly what changed, and why
`,
      out: `# requirements.txt (generated -- do not edit)
anyio==4.4.0 \\
    --hash=sha256:c1b2d8f7e...
    # via httpx, starlette
fastapi==0.115.0 \\
    --hash=sha256:9f4a3b21c...
    # via -r requirements.in`,
      caption: "The `# via` comments are the useful part: they say **why** each package is present, so a security advisory about `anyio` immediately tells you which of your direct dependencies pulled it in."
    },

    { t: "callout", kind: "insight", title: "Hashes are the difference between pinned and reproducible", body: [
      { t: "p", text: "`fastapi==0.115.0` fixes the version number. It does not fix the *artefact*: a package index can serve a different file under the same version — through a compromise, a mirror, or a maintainer re-uploading. `--require-hashes` makes pip verify the bytes it downloaded." },
      { t: "ul", items: [
        "**It also fails closed on anything unpinned.** With `--require-hashes`, every requirement must have a hash, so a dependency added without regenerating the file is an error rather than a silent install.",
        "**It defeats a dependency-confusion attack**: a malicious package uploaded to a public index under your internal package's name has a different hash and is rejected.",
        "**The cost is a step in the workflow** — adding a dependency means regenerating, which is exactly the review point you want."
      ]},
      { t: "p", text: "For a service that handles money or personal data, treat hash pinning as the baseline rather than an enhancement (Lesson 14.7)." }
    ]},

    { t: "ladder",
      title: "Managing a project's dependencies",
      rungs: [
        { level: "bad", label: "pip install, then pip freeze",
          why: "Records the state of one machine at one moment — including packages installed for an experiment months ago. Direct and transitive dependencies are indistinguishable, so nobody can tell what is safe to remove, and a fresh resolve on another platform produces a different set.",
          code: `pip install fastapi httpx
pip freeze > requirements.txt

# requirements.txt
#   anyio==4.4.0
#   black==24.1.0          <- a dev tool, now a production dependency
#   fastapi==0.115.0
#   ... 40 lines, no structure` },
        { level: "ok", label: "Hand-written ranges",
          why: "Readable, and the intent is clear. But nothing is pinned, so two installs a week apart give different builds — and a transitive package can release a broken version that reaches production without a single commit in your repository.",
          code: `# requirements.txt
fastapi>=0.110,<0.120
httpx~=0.27
pydantic>=2.6,<3

# requirements-dev.txt
-r requirements.txt
pytest~=8.0
ruff` },
        { level: "best", label: "Declared ranges plus a generated lock",
          why: "Two files with two jobs. `pyproject.toml` says what the project needs and is reviewed by humans; the lock says exactly what gets installed, is generated by a tool, and changes only when someone regenerates it. Upgrades become a reviewable diff.",
          code: `# pyproject.toml -- direct dependencies, ranges
[project]
dependencies = [
    "fastapi>=0.110,<0.120",
    "httpx~=0.27",
]

[dependency-groups]
dev = ["pytest~=8.0", "ruff", "mypy"]

# Generated and committed:
#   uv lock                     -> uv.lock (full graph, hashes, markers)
#   uv sync                     -> environment matches the lock exactly
#   uv sync --frozen            -> CI: fail if the lock is stale`,
          note: "`uv` is a drop-in replacement written in Rust that resolves and installs one to two orders of magnitude faster than pip. `uv pip install` and `uv venv` mirror the commands you already know, so adoption is incremental." }
      ]
    },

    { t: "code", lang: "bash", title: "the same workflow in three tools", code: `
# --- venv + pip (always available, no install needed) ---
python -m venv .venv
.venv/bin/pip install -r requirements.txt

# --- uv (fast; the current default choice for new projects) ---
uv venv                          # creates .venv
uv add fastapi                   # updates pyproject.toml AND uv.lock
uv sync                          # environment := lockfile
uv run pytest                    # runs in the environment, no activation

# --- poetry (mature, opinionated, own resolver) ---
poetry add fastapi
poetry install
poetry run pytest
`,
      caption: "All three do the same three things: create an isolated environment, resolve a dependency graph, and record the result. **Pick one per project and put the commands in the README** — the cost of mixing them is an environment nobody can reproduce."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make an unreproducible project reproducible",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "A service deploys from this repository. A build last Tuesday produced a working image; a rebuild of the identical commit on Thursday produced one that crashes on startup. Nothing in git changed." },
        { t: "code", lang: "bash", title: "what is in the repo", numbered: false, code: `
# requirements.txt  (generated with pip freeze, 14 months ago)
requests>=2.0
flask
pandas==1.5.3
black==22.3.0
pytest
-e git+https://github.com/team/internal-lib.git#egg=internal-lib

# Dockerfile
FROM python:3
RUN pip install -r requirements.txt
COPY . /app
CMD ["python", "/app/run.py"]

# README
#   pip install -r requirements.txt
#   python run.py`},
        { t: "p", text: "Find every source of non-determinism, then produce a setup where the same commit always builds the same image." }
      ],
      requirements: [
        "List every reason two builds of the same commit can differ — there are at least seven.",
        "Separate direct dependencies from the transitive graph, and development tools from runtime ones.",
        "Produce a lockfile-based workflow with hashes.",
        "Fix the Dockerfile, including its layer caching, which is currently defeated.",
        "Explain the specific danger of the git dependency and replace it.",
        "Give the CI check that fails when someone edits dependencies without regenerating the lock."
      ],
      hint: "Start with `FROM python:3` and work down. Then ask what `flask` with no bound resolves to today versus fourteen months ago — and what `-e git+...#egg=` points at when the branch moves.",
      solution: {
        lang: "bash",
        title: "reproducible.md",
        code: `# =========================================================================
# EVERY SOURCE OF NON-DETERMINISM
# =========================================================================
#
# 1. FROM python:3
#    Floating tag. Resolves to whatever the latest Python 3 is on the day
#    of the build -- a MINOR VERSION change between Tuesday and Thursday,
#    which is almost certainly the crash. Also changes the base OS.
#
# 2. flask  (no version at all)
#    Resolves to the newest release at build time. Flask 3.0 removed
#    several APIs that Flask 2.x had.
#
# 3. requests>=2.0
#    An unbounded lower bound. Permits requests 3.0 whenever it ships.
#
# 4. No transitive pins
#    pandas==1.5.3 is pinned; numpy, which pandas requires, is not. A
#    numpy release that pandas 1.5.3 cannot work with lands silently.
#
# 5. No hashes
#    Nothing verifies the downloaded artefact. A compromised mirror or a
#    re-uploaded release changes the bytes without changing the version.
#
# 6. -e git+https://...#egg=internal-lib
#    Points at the DEFAULT BRANCH, not a commit. Whatever was merged
#    between Tuesday and Thursday is now in production. It also needs git
#    and network access to a private host at build time, and -e (editable)
#    inside a container is meaningless.
#
# 7. black and pytest in the runtime requirements
#    Development tools shipped to production: a larger image, a larger
#    attack surface, and a rebuild triggered by a linter release.
#
# 8. COPY . /app AFTER pip install, with requirements.txt copied as part
#    of it -- so ANY source change invalidates the dependency layer and
#    reinstalls everything. Slow, and more chances to resolve differently.
#
# 9. python /app/run.py rather than an installed entry point -- so
#    sys.path[0] is /app and the project's own modules can shadow
#    stdlib ones (Lesson 7.4).


# =========================================================================
# THE FIX -- 1. declare direct dependencies with ranges
# =========================================================================

# pyproject.toml
#
#   [project]
#   name = "billing-service"
#   requires-python = ">=3.12,<3.13"     # an explicit, narrow band
#   dependencies = [
#       "flask>=3.0,<4",                 # bounded on BOTH sides
#       "requests>=2.31,<3",
#       "pandas>=2.2,<3",
#       "internal-lib==4.2.1",           # a real version from our index
#   ]
#
#   [dependency-groups]
#   dev = ["pytest~=8.0", "black~=24.0", "ruff", "mypy"]
#
#   [project.scripts]
#   billing = "billing.cli:main"         # a real entry point (Lesson 7.5)
#
# Every direct dependency has an upper bound. Without one, a build in
# six months resolves to a major version that did not exist when this
# code was written and was never tested against it.


# =========================================================================
# 2. generate a lock with hashes, and commit it
# =========================================================================

uv lock                       # -> uv.lock: full graph, hashes, markers
# or, with pip-tools:
pip-compile --generate-hashes --output-file=requirements.txt pyproject.toml
pip-compile --generate-hashes --extra=dev --output-file=requirements-dev.txt pyproject.toml

# The lock is generated, committed, and NEVER hand-edited. It answers
# "what exactly is installed"; pyproject.toml answers "what do we need".


# =========================================================================
# 3. the internal library: a version, not a branch
# =========================================================================
#
# The git dependency is the most dangerous line in the original file. It
# means:
#
#   - production tracks a branch, so an unreviewed merge deploys itself
#   - there is no version to roll back TO
#   - the build needs git and credentials for a private host
#   - no hash can be recorded, so --require-hashes is impossible
#
# Publish internal-lib to a private index (devpi, Artifactory, CodeArtifact,
# GitLab's registry) and depend on "internal-lib==4.2.1" like anything
# else. If that is genuinely not possible today, pin the exact commit as
# an interim measure -- it is at least deterministic:
#
#   internal-lib @ git+https://github.com/team/internal-lib.git@a3f91c2
#
# but treat it as debt, not a destination.


# =========================================================================
# 4. the Dockerfile
# =========================================================================

# syntax=docker/dockerfile:1

# Pinned by DIGEST, not by tag. A tag can be moved; a digest cannot.
FROM python:3.12.6-slim@sha256:2a7c8f... AS base

ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1 \\
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies FIRST, in their own layer. Only these two files are
# copied, so editing application source does not invalidate the layer
# and the install is cached across builds.
COPY pyproject.toml uv.lock ./
RUN pip install --no-cache-dir uv==0.4.18 \\
 && uv sync --frozen --no-dev --no-install-project

# --frozen: fail if uv.lock does not match pyproject.toml, rather than
#           silently re-resolving. This is what makes the build honest.
# --no-dev: pytest, black and ruff never enter the image.

# NOW the source, in a later layer
COPY src/ ./src/
RUN uv sync --frozen --no-dev            # installs the project itself

USER 1000                                 # not root
CMD ["billing"]                            # the entry point, not a path


# =========================================================================
# 5. CI: fail when the lock is stale
# =========================================================================

# .github/workflows/ci.yml
#
#   - name: Dependencies are locked and current
#     run: |
#       uv lock --check          # non-zero if pyproject and lock disagree
#
#   - name: Install exactly what is locked
#     run: uv sync --frozen
#
#   - name: Test
#     run: uv run pytest
#
# "uv lock --check" is the rule that makes the whole system hold: someone
# adding a dependency to pyproject.toml without regenerating the lock
# gets a red build, not a surprise in production.
#
# With pip-tools the equivalent is to regenerate in CI and diff:
#
#   pip-compile --generate-hashes -q -o /tmp/req.txt pyproject.toml
#   diff -u requirements.txt /tmp/req.txt


# =========================================================================
# 6. the README, which is also part of the fix
# =========================================================================
#
#   ## Setup
#       uv sync            # creates .venv and installs from the lock
#       uv run pytest
#
#   ## Adding a dependency
#       uv add httpx       # updates pyproject.toml AND uv.lock
#       git add pyproject.toml uv.lock
#
#   Do not run "pip install" in this project. It writes into the
#   environment without touching the lock, which is exactly how the
#   Tuesday/Thursday problem happens.
#
# One tool, documented. Mixing pip and uv, or conda and pip, produces an
# environment nobody can reproduce -- each tool records only its own half.


# =========================================================================
# VERIFICATION
# =========================================================================
#
#   docker build -t app:a . && docker build -t app:b .
#   docker inspect --format '{{.Id}}' app:a app:b     # identical
#
#   # And the real test -- build the same commit next month:
#   git stash && git checkout <commit> && docker build .`,
        notes: [
          { t: "p", text: "**`FROM python:3` is the single biggest cause here.** It floats across minor versions, so a Tuesday build and a Thursday build can be on different Python releases with different stdlib behaviour — and nothing in the repository records which one you got. Pinning by digest rather than by tag closes the remaining gap, because a tag can be repointed at a new image." },
          { t: "p", text: "**The git dependency deploys unreviewed merges.** `#egg=` with no ref tracks the default branch, so anything merged into the internal library between two builds is in production without a commit in this repository. It also blocks hash pinning entirely, which is why it must be replaced rather than patched." },
          { t: "p", text: "**The Dockerfile's layer order was silently costing every build.** `COPY . /app` before the install means any source edit invalidates the dependency layer, so every build re-resolves and re-downloads — more time, and more opportunities to get a different answer. Copying only the manifest and lock first is a two-line change that makes dependency installation cached and stable." },
          { t: "callout", kind: "insight", title: "`--frozen` is the flag that makes this real", body: [
            { t: "p", text: "Without it, `uv sync` will happily re-resolve when the lock does not match `pyproject.toml` — which means a stale lock produces a working build with different packages, and nobody finds out." },
            { t: "p", text: "With `--frozen` in the image build and `uv lock --check` in CI, the only way to change what gets installed is to regenerate the lock and commit it. The diff is then reviewable, and \"nothing changed\" is a claim git can verify." }
          ]},
          { t: "p", text: "**Development tools in the runtime image are a security question, not a size one.** `black`, `pytest` and their transitive graphs are code running with your service's credentials in your production network. `--no-dev` removes them; the smaller image is a bonus." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's CI has been green for months. On a Monday, every build starts failing in a test that touches date parsing. Nobody has changed the code, the test, or any pinned dependency." },
      { t: "p", text: "**A transitive dependency released a new version over the weekend.** The project pinned its direct dependencies and left the rest to the resolver, so a library three levels down — one nobody on the team had heard of — changed a default and broke an assumption." },
      { t: "p", text: "**The debugging cost was the real damage.** With nothing to diff, the first day went on the theory that it was a flaky test. `pip list` on a passing container from Friday against a failing one from Monday found it in ten minutes — once someone thought to compare the environments rather than the code." },
      { t: "p", text: "**A lockfile makes this a non-event.** The Monday build installs Friday's exact graph, the upgrade happens when someone runs the regeneration command, and the diff names the package and the version. The point of locking is not that dependencies never break you — it is that they break you **when you choose**, with a reviewable change to point at." }
    ]}
  ],

  takeaways: [
    "**A virtual environment is a directory, an interpreter link and a `pyvenv.cfg`.** Activation only prepends to `PATH`, so `.venv/bin/python` works without activating.",
    "**Use the explicit path in anything automated** — `.venv/bin/python -m pytest` cannot accidentally run against the wrong environment.",
    "**`python -m pip` beats `pip`**: it installs into the interpreter you named rather than whichever `pip` is first on `PATH`.",
    "**Never `sudo pip install`**, never install without an environment, never commit `.venv/`, and never fix an import with `PYTHONPATH` — use `pip install -e .`.",
    "**Direct dependencies and the transitive graph are two lists with two jobs**: ranges you wrote in `pyproject.toml`, and an exact resolution generated into a lockfile.",
    "**`pip freeze` conflates them.** It records one machine's state, including dev tools and forgotten experiments, with no indication of why anything is present.",
    "**`~=2.31` allows minor upgrades; `~=2.31.0` allows only patches.** The specifier truncates the last component you wrote.",
    "**Applications pin tightly; libraries pin loosely.** A library pinning an exact version cannot coexist with anything else — but every direct dependency still needs an upper bound.",
    "**Hashes turn pinned into reproducible.** `--require-hashes` verifies the bytes, fails on anything unpinned, and defeats dependency-confusion attacks.",
    "**Pin container base images by digest, not tag.** `FROM python:3` floats across minor versions, which is a build that changes with the calendar.",
    "**A git dependency without a pinned ref deploys whatever was merged.** Publish to a private index and depend on a version.",
    "**Add a CI check that the lock matches the manifest** — `uv lock --check` or a regenerate-and-diff — so dependency changes are always a reviewable commit."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does `source .venv/bin/activate` actually do?",
        options: [
          "Rewrites `sys.path` inside the interpreter",
          "Prepends `.venv/bin` to `PATH` and sets `VIRTUAL_ENV` — the interpreter finds its environment from `pyvenv.cfg` next to the executable",
          "Copies the standard library into the environment",
          "Starts a subshell isolated from the parent"
        ],
        answer: 1,
        why: "Activation is a shell convenience, nothing more. The isolation comes from the interpreter reading `pyvenv.cfg` beside its own executable, which is why `.venv/bin/python script.py` behaves identically without activating. In CI, Makefiles and service units, use the explicit path — activation does not persist between separate shell invocations, which is a common source of steps silently running outside the environment."
      },
      {
        stem: "Two builds of the identical commit produce different images. `requirements.txt` pins `pandas==1.5.3`. What is the most likely cause?",
        options: [
          "The pin is being ignored by pip",
          "Unpinned transitive dependencies and a floating base image — `FROM python:3` and packages like numpy that nothing constrains",
          "Docker layer caching corrupted the image",
          "`pandas` publishes different wheels per build"
        ],
        answer: 1,
        why: "Pinning direct dependencies leaves the rest of the graph to the resolver, so a release from a package three levels down lands with no commit in your repository. `FROM python:3` compounds it by floating across minor Python versions and base OS changes. A lockfile with hashes plus a digest-pinned base image makes the same commit produce the same image whenever it is built."
      },
      {
        stem: "Why should a library declare `requests>=2.31,<3` rather than `requests==2.31.0`?",
        options: [
          "Exact pins are not supported in `pyproject.toml`",
          "An exact pin makes the library uninstallable alongside anything requiring a different patch — libraries declare compatibility, applications decide installations",
          "Ranges install faster",
          "`==` prevents security updates from being applied at all"
        ],
        answer: 1,
        why: "Your users have their own dependency graphs. A library pinning an exact version forces a conflict with any other package that pinned differently, and there is no resolution short of forking one of them. Declare the widest range you actually support and let the application's lockfile decide the exact version — which is precisely why applications lock and libraries do not."
      },
      {
        stem: "What does `--require-hashes` add over pinning every version with `==`?",
        options: [
          "It makes installs faster by skipping metadata checks",
          "It verifies the downloaded bytes, so a re-uploaded or substituted artefact under the same version number is rejected — and it fails on any unpinned requirement",
          "It resolves conflicts automatically",
          "It records which direct dependency pulled in each package"
        ],
        answer: 1,
        why: "A version number names a release; a hash names a file. Indexes can serve different bytes under the same version through compromise, mirroring or re-upload, and a dependency-confusion attack relies on exactly that. Hash checking also fails closed: every requirement must carry a hash, so adding a dependency without regenerating the file is an error rather than a silent install."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is a virtual environment and why do you need one?",
        strong: "A directory containing a link to an interpreter, a `pyvenv.cfg` pointing at the base install, and its own `site-packages`. It exists because Python installs into one shared directory per interpreter, so two projects needing different versions of a library cannot both be satisfied.",
        answer: [
          { t: "p", text: "Knowing that activation only edits `PATH` is the detail that separates understanding from ritual — and it leads to the practical habit of using `.venv/bin/python` explicitly in CI and service units." },
          { t: "p", text: "The failure modes are worth naming: `sudo pip` into the system Python, installing with nothing active, committing `.venv/`, and patching `PYTHONPATH` instead of installing the project." },
          { t: "p", text: "One environment per project, in the project directory, never committed, is the rule that prevents all of them." }
        ]
      },
      {
        level: "advanced",
        q: "How do you make a deployment reproducible?",
        strong: "Two files with two jobs: ranges for direct dependencies in `pyproject.toml`, and a generated lockfile pinning the whole graph with hashes. Then a digest-pinned base image, `--frozen` installs, and a CI check that the lock matches the manifest.",
        answer: [
          { t: "p", text: "The direct-versus-transitive distinction is the core idea, and the reason `pip freeze` is not a lockfile — it records one machine's state with no indication of what was asked for." },
          { t: "p", text: "Hashes as the step beyond pinning shows security awareness: a version names a release, a hash names a file, and dependency confusion relies on that gap." },
          { t: "p", text: "The CI check is what makes the system hold rather than decay — without `uv lock --check` or an equivalent, the lock silently drifts out of date and reproducibility becomes a story people tell." }
        ]
      },
      {
        level: "core",
        q: "Should a library pin its dependencies?",
        strong: "No — declare the widest range you actually support, with upper bounds where you know a break exists. Pinning exactly makes your library conflict with anything else that pinned differently, and there is no resolution short of forking.",
        answer: [
          { t: "p", text: "The application/library split is the whole answer, and stating the reason — your users have their own graphs and their own lockfile — shows it is understood rather than memorised." },
          { t: "p", text: "The nuance worth adding is that applications still need upper bounds on direct dependencies, or an install six months later resolves to a major version nobody tested against." },
          { t: "p", text: "Being specific about `~=2.31` versus `~=2.31.0` is a small thing that demonstrates you have read the specification rather than copied a pattern." }
        ]
      }
    ]
  }
});

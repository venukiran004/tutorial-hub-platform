/* ============================================================================
   LESSON 1.3 — A Professional Local Setup
   ========================================================================= */
EC.receiveLesson({
  id: "1.3",

  lede: "A virtual environment is not a Python feature you switch on. It is **a directory with a copy of the interpreter and its own `site-packages`**, plus a `PATH` trick. Once you see the mechanism, the rules stop being ritual — you will know what activation actually does, why your editor sometimes disagrees with your terminal, and why deleting `.venv` is always safe.",

  objectives: [
    "Explain what a virtual environment physically is, and what `activate` changes",
    "Create and manage environments with both `venv` and `uv`, and say when each fits",
    "Configure VS Code so the editor, terminal, linter and debugger all agree on one interpreter",
    "Run Jupyter against a project environment rather than a stray global kernel",
    "Diagnose an environment problem from first principles instead of deleting things at random"
  ],

  prerequisites: ["1.1", "1.2"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "What a virtual environment actually is", id: "what-is-a-venv" },

    {"kind": "layers", "title": "Where a virtual environment sits", "caption": "An environment is a directory with its own site-packages and a python that points at the base interpreter. Activating it only edits PATH; nothing is copied or compiled.", "items": [{"label": "your project", "sub": "code, tests, pyproject.toml"}, {"label": ".venv/lib/site-packages", "sub": "this project's dependencies", "tone": "accent"}, {"label": ".venv/bin/python → base interpreter", "sub": "a symlink plus pyvenv.cfg", "tone": "good"}, {"label": "the base Python install", "sub": "never pip install here", "tone": "warn"}], "t": "diagram", "id": "dg-1_3-01-0"},



    { t: "p", text: "The name suggests something elaborate — a container, a sandbox, a runtime feature. It is none of those. Create one and look inside:" },

    { t: "code", lang: "bash", title: "terminal", code: `
$ python -m venv .venv
$ find .venv -maxdepth 2 | head -12`,
      out: `.venv
.venv/bin
.venv/bin/python          -> symlink to the real interpreter
.venv/bin/python3
.venv/bin/pip
.venv/bin/activate
.venv/lib
.venv/lib/python3.12
.venv/lib/python3.12/site-packages    <- the whole point
.venv/include
.venv/pyvenv.cfg          <- points back at the base interpreter`
    },

    { t: "p", text: "That is the entire mechanism. A `bin/` directory with a link to an interpreter, an empty `site-packages`, and a small config file naming the Python it was built from. No isolation of the filesystem, no process boundary, no magic." },

    { t: "viz",
      title: "How the same command finds different packages",
      caption: "Activation prepends the environment's bin directory to PATH. The interpreter then reads pyvenv.cfg, sets sys.prefix to the environment, and searches the environment's site-packages first. Nothing else changes.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram: how PATH and sys.prefix route a python command to a virtual environment's site-packages">
  <defs>
    <marker id="a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="24" class="s-sub" style="font-weight:700;letter-spacing:.08em">WITHOUT ACTIVATION</text>
  <rect x="20" y="38" width="120" height="34" rx="7" class="s-fill s-stroke" stroke-width="1"/>
  <text x="80" y="59" text-anchor="middle" class="s-mono">$ python</text>
  <line x1="140" y1="55" x2="196" y2="55" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a2)"/>
  <text x="168" y="47" text-anchor="middle" class="s-sub">PATH</text>
  <rect x="202" y="38" width="188" height="34" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="296" y="59" text-anchor="middle" class="s-mono">/usr/local/bin/python</text>
  <line x1="390" y1="55" x2="446" y2="55" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a2)"/>
  <rect x="452" y="38" width="300" height="34" rx="7" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="602" y="59" text-anchor="middle" class="s-mono">/usr/local/lib/python3.12/site-packages</text>

  <line x1="20" y1="96" x2="880" y2="96" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="126" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--accent-ink)">AFTER source .venv/bin/activate</text>
  <rect x="20" y="140" width="120" height="34" rx="7" class="s-fill s-stroke" stroke-width="1"/>
  <text x="80" y="161" text-anchor="middle" class="s-mono">$ python</text>
  <line x1="140" y1="157" x2="196" y2="157" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#a2)"/>
  <text x="168" y="149" text-anchor="middle" class="s-sub" style="fill:var(--accent-ink)">PATH</text>
  <rect x="202" y="140" width="188" height="34" rx="7" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="296" y="161" text-anchor="middle" class="s-mono">.venv/bin/python</text>
  <line x1="390" y1="157" x2="446" y2="157" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#a2)"/>
  <rect x="452" y="140" width="300" height="34" rx="7" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="602" y="161" text-anchor="middle" class="s-mono">.venv/lib/python3.12/site-packages</text>

  <rect x="202" y="196" width="550" height="80" rx="9" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="216" y="217" class="s-sub" style="fill:var(--ink-2);font-weight:600">activate does exactly three things:</text>
  <text x="216" y="235" class="s-sub">1.  prepends .venv/bin to PATH        2.  sets VIRTUAL_ENV</text>
  <text x="216" y="251" class="s-sub">3.  edits your shell prompt</text>
  <text x="216" y="269" class="s-sub" style="fill:var(--warn)">It does not change Python itself. Running .venv/bin/python directly works identically.</text>
</svg>`
    },

    { t: "callout", kind: "insight", title: "The consequence worth internalising", body: [
      { t: "p", text: "Because activation is only a `PATH` edit, **`.venv/bin/python script.py` behaves exactly like activating and running `python script.py`**. The interpreter finds its environment from its own location and `pyvenv.cfg`, not from a shell variable." },
      { t: "p", text: "This is why editors, IDEs, cron jobs, systemd units and Docker `CMD` lines never activate anything — they invoke the environment's interpreter by absolute path. Activation is a convenience for humans typing in a terminal. Nothing else needs it." },
      { t: "p", text: "It also means `.venv` is completely disposable. It contains no state you authored — only installed packages, all of which are reproducible from your lockfile. Deleting it is always safe, and recreating it is the correct first move for any environment problem you cannot diagnose in two minutes." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Creating and using one", id: "creating" },

    { t: "tabs", items: [
      { label: "venv (stdlib)", blocks: [
        { t: "code", lang: "bash", title: "terminal", code: `
# Create. Name it .venv — tooling looks for that name by convention.
$ python -m venv .venv

# Activate (macOS / Linux)
$ source .venv/bin/activate

# Activate (Windows PowerShell)
> .venv\\Scripts\\Activate.ps1

# Confirm before installing anything
(.venv) $ python -c "import sys; print(sys.prefix != sys.base_prefix)"
True

(.venv) $ python -m pip install httpx
(.venv) $ deactivate`},
        { t: "p", text: "Always available, zero to install, works everywhere. The downside is speed: `pip` resolves and downloads serially, and a large dependency set can take minutes." }
      ]},
      { label: "uv (recommended)", blocks: [
        { t: "code", lang: "bash", title: "terminal", code: `
# One-off install of uv itself
$ curl -LsSf https://astral.sh/uv/install.sh | sh

# Create an environment, pinning the interpreter version.
# uv downloads that Python if you do not have it.
$ uv venv --python 3.12

# Install into it. No activation required.
$ uv pip install httpx

# Run something in the environment
$ uv run python script.py

# Full project workflow: writes pyproject.toml AND a lockfile
$ uv init
$ uv add httpx
$ uv sync`},
        { t: "p", text: "`uv` is a drop-in replacement for `venv` and `pip`, written in Rust, typically 10–100× faster at resolution and install. It also manages interpreter versions, so it replaces `pyenv` too. For new projects in 2025 this is the sensible default; the commands mirror pip closely enough that switching costs nothing." }
      ]},
      { label: "conda", blocks: [
        { t: "code", lang: "bash", title: "terminal", code: `
$ conda create -n myproject python=3.12
$ conda activate myproject
$ conda install numpy pandas

# Mixing in pip: install conda packages FIRST, pip last,
# and never conda-install anything afterwards.
$ pip install some-pure-python-package`},
        { t: "callout", kind: "warn", title: "Use conda only when you need it", body: [
          { t: "p", text: "Conda solves a real problem: shipping non-Python binaries — CUDA toolkits, MKL, GDAL, compilers — that pip historically could not. If your stack needs those, conda is the right tool." },
          { t: "p", text: "It is a parallel packaging universe, though, and mixing `conda install` and `pip install` in one environment is a well-known way to produce an environment that cannot be reproduced or repaired. If you must mix, install everything from conda first and treat pip as a final, additive layer." }
        ]}
      ]}
    ]},

    { t: "callout", kind: "good", title: "Conventions that pay for themselves", body: [
      { t: "ul", items: [
        "**Name it `.venv`, in the project root.** VS Code, PyCharm, `uv` and most CI actions auto-detect that path. A creatively named environment is one you have to configure everywhere.",
        "**One environment per project.** They are cheap — a few hundred megabytes at most and disposable. A shared environment means every project's dependency conflicts become every other project's problem.",
        "**Add `.venv/` to `.gitignore`.** It contains platform-specific binaries and is never portable. What you commit is the lockfile that lets anyone rebuild it.",
        "**Never edit anything inside it.** Fixing a bug by patching a file in `site-packages` produces a change that exists only on your machine and vanishes on the next install."
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Making your editor agree with your terminal", id: "vscode",
      sub: "The most common source of \"it runs in the terminal but the editor shows errors\"." },

    { t: "p", text: "VS Code does not read your shell's `PATH`. It has its own notion of the selected interpreter, and every Python feature — IntelliSense, the linter, the debugger, the test runner — follows that setting rather than your terminal. When the two disagree, you get red squiggles under imports that work perfectly when you run the file." },

    { t: "p", text: "Fix it once per project by committing the setting, so every contributor gets the same behaviour:" },

    { t: "code", lang: "json", title: ".vscode/settings.json", code: `{
  "python.defaultInterpreterPath": "\${workspaceFolder}/.venv/bin/python",

  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "python.testing.pytestArgs": ["tests"],

  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    }
  },

  "python.analysis.typeCheckingMode": "basic",
  "files.exclude": {
    "**/__pycache__": true,
    "**/.pytest_cache": true,
    "**/.ruff_cache": true
  }
}`,
      caption: "On Windows the interpreter path is `${workspaceFolder}/.venv/Scripts/python.exe`. Commit this file — an editor config that lives only on your machine is a config the next contributor has to rediscover."
    },

    { t: "dl", items: [
      ["Extensions worth having", "**Python** and **Pylance** (Microsoft) for language support, and **Ruff** (Astral) for linting and formatting. That is genuinely all most projects need."],
      ["`typeCheckingMode: basic`", "Turns on real type checking in the editor without the noise of `strict` on an untyped codebase. It catches undefined names and obvious type errors as you type — the exact class of bug Lesson 1.1 showed Python defers to runtime."],
      ["Format on save", "Removes formatting from code review permanently. Ruff formats in milliseconds, so there is no latency cost. Lesson 14.4 covers enforcing the same thing in CI."]
    ]},

    { t: "callout", kind: "trap", title: "When the editor still disagrees", body: [
      { t: "p", text: "Two situations defeat the setting above, and both look like a broken editor:" },
      { t: "ol", items: [
        "**The environment was created after the window opened.** VS Code caches the interpreter list. Run *Python: Select Interpreter* from the command palette and pick `.venv` explicitly, or reload the window.",
        "**You opened a parent folder rather than the project.** `${workspaceFolder}` then resolves somewhere with no `.venv`. Open the folder containing `pyproject.toml`, or set up a multi-root workspace."
      ]},
      { t: "p", text: "The definitive check is to compare what each side thinks it is running. In the VS Code terminal, `python -c \"import sys; print(sys.executable)\"`; in an editor window, hover the Python version in the status bar. If those two strings differ, you have found your bug — it was never the code." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Jupyter, without the stray kernels", id: "jupyter" },

    { t: "p", text: "Jupyter has its own indirection: a *kernel* is a registered interpreter, and the list of kernels is global to your user account. So a notebook can quietly run against an interpreter that has nothing to do with the project directory it lives in — which is why a notebook works for you and fails for a colleague who cloned the same repository." },

    { t: "code", lang: "bash", title: "terminal — bind a kernel to this project", code: `
# Inside the project environment
(.venv) $ python -m pip install ipykernel

# Register THIS environment as a named kernel
(.venv) $ python -m ipykernel install --user \\
      --name myproject --display-name "Python (myproject)"

# See every kernel currently registered
$ jupyter kernelspec list
Available kernels:
  myproject    /home/dev/.local/share/jupyter/kernels/myproject
  python3      /usr/lib/python3/dist-packages/ipykernel

# Remove one that points at a deleted environment
$ jupyter kernelspec uninstall old-project`,
      caption: "Kernel registrations outlive the environments they point at. A kernel whose interpreter no longer exists fails with a confusing startup error — `kernelspec list` and `uninstall` are how you clean up."
    },

    { t: "callout", kind: "insight", title: "The notebook rule that prevents most notebook pain", body: [
      { t: "p", text: "Put this in the first cell of any notebook you intend to keep:" },
      { t: "code", lang: "python", title: "cell 1", numbered: false, code: `
import sys
print(sys.executable)`},
      { t: "p", text: "It costs one line and it answers, permanently, the question \"why does this notebook see a different set of packages than my terminal\". Lesson 15.4 covers the rest of professional notebook practice — output stripping, reproducibility, and graduating code out of notebooks into modules." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "The REPL is a tool, not a toy", id: "repl" },

    { t: "p", text: "The interactive interpreter is where you should be answering small questions — what does this method return, what shape is this data, does this regex match. Reaching for it is faster than writing a script, and far faster than guessing." },

    { t: "table",
      head: ["In the REPL", "Does"],
      rows: [
        ["`help(obj)`", "Prints the docstring and signature. Works on anything, including your own code."],
        ["`dir(obj)`", "Lists attributes and methods. Add `[m for m in dir(obj) if not m.startswith('_')]` for the public surface."],
        ["`_`", "The result of the last expression. `_` after a long computation saves retyping it."],
        ["`breakpoint()`", "Drops into the debugger from inside a running script. Covered properly in Lesson 6.6."],
        ["`python -i script.py`", "Runs a script, then leaves you in a REPL with all its variables still alive. Excellent for inspecting state after a failure."]
      ]
    },

    { t: "p", text: "The standard REPL is fine. **IPython** (`pip install ipython`) is a strict improvement for interactive work: syntax highlighting, real tab completion, `?` for docs and `??` for source, `%timeit` for quick benchmarks, and shell commands with `!`. It costs one install and saves time from the first session." },

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Reproduce a project from nothing",
      difficulty: "foundation",
      minutes: 25,
      body: [
        { t: "p", text: "The real test of a setup is not that it works — it is that someone else can recreate it. This exercise is that test, performed on yourself." },
        { t: "p", text: "Build a small project, capture its environment, then destroy the environment and rebuild it from what you captured. If any step requires knowledge that is not written down, your setup is not reproducible." }
      ],
      requirements: [
        "Create a project directory with a `.venv`, and install `httpx` and `pytest` into it.",
        "Write a `main.py` that imports `httpx`, prints its version, and prints `sys.executable`.",
        "Capture the exact installed versions into a file that another machine could install from.",
        "Write a `.gitignore` that excludes the environment and the caches, but not the captured versions.",
        "**Delete `.venv` entirely.** Confirm `python main.py` now fails.",
        "Rebuild the environment from your captured file alone, and confirm `main.py` runs and reports the same `httpx` version.",
        "Write down, in a `README.md`, the exact commands a new contributor would run. Then follow your own instructions literally and see whether they work."
      ],
      hint: "`python -m pip freeze` writes every installed package with an exact version. Note what it includes that you did not ask for, and think about why that matters for the difference between *direct* and *transitive* dependencies.",
      solution: {
        lang: "bash",
        title: "the full sequence",
        code: `# --- build --------------------------------------------------------------
$ mkdir demo && cd demo
$ python -m venv .venv
$ source .venv/bin/activate
(.venv) $ python -m pip install httpx pytest

$ cat > main.py <<'PY'
import sys

import httpx

print("interpreter:", sys.executable)
print("httpx      :", httpx.__version__)
PY

# --- capture ------------------------------------------------------------
(.venv) $ python -m pip freeze > requirements.txt

$ cat > .gitignore <<'GI'
.venv/
__pycache__/
*.py[cod]
.pytest_cache/
.ruff_cache/
GI

# --- destroy ------------------------------------------------------------
(.venv) $ deactivate
$ rm -rf .venv
$ python main.py
ModuleNotFoundError: No module named 'httpx'

# --- rebuild ------------------------------------------------------------
$ python -m venv .venv
$ source .venv/bin/activate
(.venv) $ python -m pip install -r requirements.txt
(.venv) $ python main.py
interpreter: /home/dev/demo/.venv/bin/python
httpx      : 0.27.0`,
        notes: [
          { t: "p", text: "**The point of the exercise is what you noticed in `requirements.txt`.** You installed two packages. The file lists eight or more — `anyio`, `certifi`, `h11`, `httpcore`, `idna`, `sniffio`, and pytest's dependencies. Those are *transitive* dependencies, pulled in by the two you asked for." },
          { t: "callout", kind: "tradeoff", title: "Why `pip freeze` is not the professional answer", body: [
            { t: "p", text: "`pip freeze` flattens direct and transitive dependencies into one undifferentiated list. That creates two real problems: nobody reading the file can tell which packages your code actually imports, and upgrading becomes guesswork because you cannot tell what is safe to change." },
            { t: "p", text: "The modern separation is: **`pyproject.toml` declares what you depend on**, with loose constraints (`httpx>=0.27`), and **a lockfile records the exact resolved tree** for reproducibility. `uv` produces both:" },
            { t: "code", lang: "bash", title: "terminal", numbered: false, code: `
$ uv init && uv add httpx pytest    # writes pyproject.toml
$ uv sync                           # writes + applies uv.lock`},
            { t: "p", text: "Commit both. Lesson 7.6 covers dependency management properly, including what a lockfile guarantees and what it does not." }
          ]},
          { t: "p", text: "**If your README did not work when you followed it literally**, that is the most valuable result the exercise can produce. Almost every project's setup instructions are missing a step that the author had already done months earlier and forgot was a step." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A new engineer joins and cannot get the project running. Imports fail in VS Code but the tests pass when they run `pytest` in the terminal. They have already reinstalled Python twice." },
      { t: "p", text: "**The diagnosis takes two commands.** Compare `sys.executable` as reported by the VS Code terminal with the interpreter shown in the editor's status bar. They will differ — the terminal inherited the activated `.venv`, while the editor fell back to a global interpreter because the workspace has no committed `python.defaultInterpreterPath` and they opened a parent folder." },
      { t: "p", text: "**The durable fix is not for that engineer.** It is committing `.vscode/settings.json` with the interpreter path, and a README whose setup section has actually been followed from scratch by someone other than its author. Onboarding failures are almost never the newcomer's fault; they are missing configuration that the team has been carrying in its head." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "A virtual environment is **a directory**: a link to an interpreter, its own `site-packages`, and a `pyvenv.cfg`. There is no magic to debug.",
    "`activate` only edits `PATH`, sets `VIRTUAL_ENV` and changes your prompt. **`.venv/bin/python` works identically without it** — which is why editors, cron, systemd and Docker never activate anything.",
    "`.venv` is disposable. It holds nothing you wrote, so deleting and rebuilding it is the right first move for any environment problem you cannot explain quickly.",
    "Name it `.venv` in the project root, one per project, git-ignored. The convention is what makes auto-detection work everywhere.",
    "**`uv` is the sensible default for new projects** — same commands as pip, far faster, and it manages interpreter versions too. `venv` + `pip` remain the universally available fallback.",
    "VS Code follows its own interpreter setting, not your shell. Commit `python.defaultInterpreterPath` so the whole team gets one consistent environment.",
    "Jupyter kernels are registered globally and outlive their environments. Bind a kernel per project, and print `sys.executable` in cell one.",
    "`pip freeze` mixes direct and transitive dependencies. Declare intent in `pyproject.toml`, pin reality in a lockfile — covered fully in Lesson 7.6."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A cron job runs `/srv/app/.venv/bin/python /srv/app/job.py`. It never calls `activate`. Will it use the virtual environment's packages?",
        options: [
          "No — without activation, `VIRTUAL_ENV` is unset and it falls back to the global interpreter",
          "Yes — the interpreter locates its environment from its own path and `pyvenv.cfg`, independently of any shell variable",
          "Only if `PYTHONPATH` is set to the environment's site-packages",
          "Only for pure-Python packages; compiled extensions require activation"
        ],
        answer: 1,
        why: "This is the practical payoff of understanding what activation does. `activate` is a convenience for interactive shells — it prepends to `PATH` so that typing `python` finds the right binary. When you name the binary by absolute path, that convenience is unnecessary: the interpreter reads `pyvenv.cfg` beside itself, sets `sys.prefix` to the environment, and searches its `site-packages`. This is exactly why every Dockerfile, systemd unit and cron entry invokes the interpreter directly."
      },
      {
        stem: "Imports show as unresolved in VS Code, but the same file runs correctly from the integrated terminal. What is the cause?",
        options: [
          "The language server needs the packages installed globally as well",
          "The editor's selected interpreter differs from the one active in the terminal",
          "The virtual environment was created with the wrong Python version",
          "`__init__.py` files are missing from the package directories"
        ],
        answer: 1,
        why: "VS Code's Python features — IntelliSense, linting, the debugger — follow the interpreter chosen in the editor, which is a separate setting from whatever your terminal's `PATH` happens to point at. The definitive check is comparing `sys.executable` from the terminal against the interpreter in the status bar. Committing `python.defaultInterpreterPath` in `.vscode/settings.json` prevents the whole class of problem for everyone on the team."
      },
      {
        stem: "You run `pip freeze > requirements.txt` after installing only `httpx`, and the file contains eight packages. Why, and what does that cost you?",
        options: [
          "pip includes its own dependencies; the extras can be safely deleted by hand",
          "They are httpx's transitive dependencies — the cost is that the file no longer distinguishes what you chose from what was pulled in",
          "The environment was not clean, so unrelated packages leaked in",
          "`freeze` lists everything available on PyPI that matches your Python version"
        ],
        answer: 1,
        why: "`httpx` depends on `httpcore`, `anyio`, `certifi`, `idna`, `h11` and `sniffio`, and `pip freeze` reports the flattened result. Nothing is wrong — but the file has lost the distinction between *what your code imports* and *what happened to be required*. That matters when upgrading: you cannot tell which pins are yours to change. The fix is declaring direct dependencies in `pyproject.toml` and letting a lockfile record the resolved tree."
      },
      {
        stem: "A colleague suggests fixing a library bug by editing the file directly in `.venv/lib/python3.12/site-packages/`. What is wrong with this?",
        options: [
          "Nothing, provided the change is documented in the README",
          "The change exists only on that machine and disappears on the next install or rebuild",
          "Files in site-packages are read-only and the edit will fail",
          "It works but requires clearing `__pycache__` afterwards to take effect"
        ],
        answer: 1,
        why: "The edit is invisible to version control, absent from every colleague's machine and from CI, and is destroyed the moment anyone reinstalls or rebuilds the environment — which the previous question established is the standard response to any environment problem. The legitimate options are: pin to a fixed version and open an upstream issue, apply a documented patch as part of the build, vendor the code deliberately, or monkeypatch at runtime in your own source where it is visible and reviewable."
      }
    ]
  },

  /* ==================================================================== */
  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is a virtual environment and why do we use them?",
        strong: "A directory containing a link to an interpreter and its own `site-packages`, so each project's dependencies are isolated. Without one, every project shares a single global set of packages, and two projects needing different versions of the same library cannot both work.",
        answer: [
          { t: "p", text: "The definition is table stakes. What distinguishes a good answer is describing the mechanism rather than the metaphor — that it is a directory and a `PATH` edit, not a sandbox or a container." },
          { t: "p", text: "A strong follow-through: explain that activation is purely a shell convenience, which is why production deployments invoke `.venv/bin/python` directly and never activate anything. That one observation demonstrates you have deployed Python, not just developed it locally." }
        ],
        weak: "Describing it as \"like a container\" or \"a sandbox\". Both imply isolation guarantees that do not exist — a venv shares the filesystem, the network and the OS entirely, and gives you no security boundary whatsoever."
      },
      {
        level: "core",
        q: "How do you make sure another engineer can reproduce your environment exactly?",
        strong: "Pin the interpreter version and the dependency tree, and commit both. `pyproject.toml` declares direct dependencies with loose constraints; a lockfile records every resolved version including transitive ones. The environment itself is never committed — it is rebuilt from the lockfile.",
        answer: [
          { t: "p", text: "Interviewers are checking whether you understand the difference between *declaring* and *locking*, which is the crux of reproducible builds." },
          { t: "p", text: "Strong answers name the interpreter as part of the environment — `requires-python` in `pyproject.toml`, an explicit version in CI and in the Dockerfile. Most people pin their packages and then let the Python version float, which is exactly how a build that worked yesterday breaks today." },
          { t: "p", text: "The honest caveat, if you want to show depth: a lockfile pins Python packages, not the C libraries they link against. Truly reproducible builds need the container image pinned too — which is the real reason Docker earned its place in Python deployment." }
        ]
      },
      {
        level: "advanced",
        q: "Walk me through debugging \"the package is installed but the import fails\" without touching the code.",
        strong: "Establish which interpreter is running with `sys.executable`, check whether it is in a venv with `sys.prefix != sys.base_prefix`, confirm where pip installed with `python -m pip show <pkg>`, and inspect `sys.path` if those all agree. The fault is almost always that pip and python were different installations.",
        answer: [
          { t: "p", text: "This question rewards a *procedure* rather than a list of guesses. Narrate it as narrowing: which interpreter → which environment → where did the package land → what does the search path contain." },
          { t: "p", text: "Mentioning the less common causes shows range: a local file or directory shadowing the package name (a `random.py` in your project makes `import random` find yours), a stale `__pycache__` from Lesson 1.1, or a namespace-package layout with a missing directory." },
          { t: "p", text: "Close on prevention rather than cure — `python -m pip` as the default install form, a committed editor interpreter setting, and a `.venv` per project — because the interviewer is really asking whether you fix incidents or fix causes." }
        ]
      }
    ]
  }
});

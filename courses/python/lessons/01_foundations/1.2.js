/* ============================================================================
   LESSON 1.2 — The Python Ecosystem and Which Python You Are Running
   ========================================================================= */
EC.receiveLesson({
  id: "1.2",

  lede: "\"It works on my machine\" is almost never a mystery. It is usually a different interpreter, a different version, or a different set of installed packages — and on most developer laptops there are **three or four Pythons installed at once**. This lesson makes you the person who can answer *which Python is this* in ten seconds.",

  objectives: [
    "Determine exactly which interpreter, version and environment a command is using",
    "Read a Python version number and know what its support status is",
    "Choose a Python version for a new project, and justify the choice",
    "Explain why the system Python must not be used for your own work",
    "Describe what the standard library gives you and where PyPI takes over"
  ],

  prerequisites: ["1.1"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The first question: which Python?", id: "which-python" },

    { t: "p", text: "A typical developer machine has several Python installations that know nothing about each other: one shipped with the operating system, one installed from python.org or Homebrew, one inside every virtual environment, and possibly one bundled with an IDE or a Conda distribution. Typing `python` picks whichever appears first on your `PATH`, and that is easy to change without noticing." },

    { t: "p", text: "So the diagnostic habit worth building on day one is: never assume. Ask." },

    { t: "code", lang: "python", title: "which_python.py — run this when anything looks wrong", code: `
import sys
import sysconfig

print("executable :", sys.executable)
print("version    :", sys.version.split()[0])
print("version_info:", tuple(sys.version_info))
print("implementation:", sys.implementation.name)
print("in a venv  :", sys.prefix != sys.base_prefix)
print("base prefix:", sys.base_prefix)
print("site-packages:", sysconfig.get_paths()["purelib"])
`,
      out: `executable : /home/dev/project/.venv/bin/python
version    : 3.12.4
version_info: (3, 12, 4, 'final', 0)
implementation: cpython
in a venv  : True
base prefix: /usr/local
site-packages: /home/dev/project/.venv/lib/python3.12/site-packages`
    },

    { t: "dl", items: [
      ["`sys.executable`", "The absolute path of the running interpreter. This is the authoritative answer — everything else is inference."],
      ["`sys.prefix != sys.base_prefix`", "The reliable virtual-environment test. `sys.prefix` points at the environment; `sys.base_prefix` at the interpreter it was built from. When they differ, you are in a venv."],
      ["`sys.version_info`", "A comparable tuple. Use this for version checks, never string comparison — `\"3.9\" > \"3.10\"` is `True` as strings and wrong as versions."],
      ["site-packages path", "Where `pip install` puts things for *this* interpreter. Two Pythons means two of these, which is the entire mechanism behind \"but I installed it!\""]
    ]},

    { t: "callout", kind: "trap", title: "The `pip` that is not your `python`'s pip", body: [
      { t: "p", text: "This is the single most common environment failure, and it is invisible: `python` resolves to one interpreter while `pip` is a script belonging to a **different** one. You install a package, the import fails, and nothing in the error hints at the cause." },
      { t: "code", lang: "bash", title: "terminal", numbered: false, code: `
$ which python
/usr/local/bin/python          # 3.12

$ which pip
/usr/bin/pip                   # belongs to system Python 3.9

$ pip install httpx            # installs into 3.9's site-packages
$ python -c "import httpx"     # 3.12 looks in its own — not found
ModuleNotFoundError: No module named 'httpx'`},
      { t: "p", text: "**The fix is a habit, not a command.** Always invoke pip through the interpreter you mean, so the two can never disagree:" },
      { t: "code", lang: "bash", title: "terminal", numbered: false, code: `
$ python -m pip install httpx`,
        caption: "`python -m pip` runs pip *inside* the interpreter you just named. Whatever `python` means at that moment, pip installs there. Make this your default form and an entire category of bug disappears." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Reading a version number", id: "versions",
      sub: "What 3.12.4 tells you, and which part you actually care about." },

    { t: "viz",
      title: "Python version numbering and support lifecycle",
      caption: "The middle number is the one that matters. A new minor version arrives every October and receives five years of support: roughly two years of bug fixes, then three of security fixes only.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="Diagram: Python version number anatomy and the five-year support lifecycle">
  <text x="180" y="52" text-anchor="middle" style="font-family:var(--mono);font-size:38px;font-weight:600;fill:var(--ink)">3.12.4</text>

  <line x1="120" y1="66" x2="120" y2="92" style="stroke:var(--border-strong)" stroke-width="1"/>
  <text x="120" y="108" text-anchor="middle" class="s-sub">major</text>
  <text x="120" y="122" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">effectively frozen</text>

  <line x1="176" y1="66" x2="176" y2="92" style="stroke:var(--accent)" stroke-width="1.5"/>
  <text x="176" y="108" text-anchor="middle" class="s-label" style="fill:var(--accent-ink);font-size:11px">minor — the one that matters</text>
  <text x="176" y="122" text-anchor="middle" class="s-sub">new syntax, new stdlib, new bytecode</text>

  <line x1="238" y1="66" x2="238" y2="92" style="stroke:var(--border-strong)" stroke-width="1"/>
  <text x="252" y="108" text-anchor="middle" class="s-sub">micro</text>
  <text x="252" y="122" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">bug &amp; security fixes only</text>

  <text x="460" y="52" class="s-sub" style="font-weight:700;letter-spacing:.08em">SUPPORT LIFECYCLE OF ONE MINOR VERSION</text>

  <rect x="460" y="66" width="150" height="26" rx="5" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <text x="535" y="83" text-anchor="middle" class="s-sub" style="fill:var(--good)">~2 yrs · bug fixes</text>

  <rect x="614" y="66" width="230" height="26" rx="5" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
  <text x="729" y="83" text-anchor="middle" class="s-sub" style="fill:var(--warn)">~3 yrs · security fixes only</text>

  <line x1="460" y1="104" x2="844" y2="104" style="stroke:var(--border)" stroke-width="1"/>
  <text x="460" y="120" class="s-sub">release</text>
  <text x="610" y="120" text-anchor="middle" class="s-sub">+2 yrs</text>
  <text x="844" y="120" text-anchor="end" class="s-sub" style="fill:var(--crit)">end of life</text>

  <text x="460" y="150" class="s-sub" style="font-weight:700;letter-spacing:.08em">WHAT EACH BUMP CAN BREAK</text>
  <rect x="460" y="162" width="384" height="70" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="474" y="182" class="s-sub"><tspan style="fill:var(--ink-2);font-weight:600">minor (3.11 → 3.12)</tspan>  removed stdlib, changed bytecode,</text>
  <text x="474" y="196" class="s-sub">  C extensions must be rebuilt, deprecations become errors</text>
  <text x="474" y="216" class="s-sub"><tspan style="fill:var(--ink-2);font-weight:600">micro (3.12.3 → 3.12.4)</tspan>  safe. Upgrade freely and often.</text>
</svg>`
    },

    { t: "p", text: "Two practical consequences follow from that picture." },

    { t: "ol", items: [
      "**Micro upgrades are free.** `3.12.3 → 3.12.4` contains only bug and security fixes. There is no reason to be behind on these, and staying behind is how known CVEs end up in your image.",
      "**Minor upgrades are a project.** `3.11 → 3.12` can remove standard-library modules, turn deprecation warnings into errors, and requires every compiled dependency to have a matching wheel. Budget it, test it, and do it deliberately — but do not skip three of them and face the accumulated cost at once."
    ]},

    { t: "callout", kind: "tradeoff", title: "Which version should a new project use?", body: [
      { t: "p", text: "The default answer is **one minor version behind the newest**. On the day 3.13 ships, start new work on 3.12." },
      { t: "p", text: "The reason is not caution about Python itself — the releases are well tested. It is the ecosystem. Compiled packages (NumPy, pandas, psycopg, pydantic-core, anything with a Rust or C extension) need to publish wheels built against each new interpreter. That takes weeks to months. Adopt on release day and you will find yourself compiling from source, or pinned to an old version of the one library you needed most." },
      { t: "p", text: "**Choose the newest version instead when** a specific feature genuinely changes your design — a real performance improvement in 3.11+, `TaskGroup` for structured concurrency, or the newer generics syntax — *and* you have verified your dependency set has wheels for it. **Choose an older version when** a platform forces you: some managed runtimes and GPU images lag well behind." }
    ]},

    { t: "code", lang: "python", title: "Version gates, done correctly", code: `
import sys

# Correct: tuple comparison, element by element.
if sys.version_info >= (3, 12):
    from typing import override
else:
    from typing_extensions import override

# Wrong, and it fails silently on exactly the version you care about:
#   if sys.version[:4] >= "3.9":   -> "3.10"[:4] is "3.10", "3.10" < "3.9"
#   Lexicographic string comparison puts 3.10 *before* 3.9.
`,
      caption: "The string-comparison bug is real and shipped widely during the 3.9 → 3.10 transition. Compare tuples; never compare version strings."
    },

    /* ================================================================== */
    { t: "h2", n: "03", text: "The implementations, revisited", id: "implementations",
      sub: "Lesson 1.1 introduced these. Here is when you would actually reach for one." },

    {"kind": "compare", "title": "The implementations", "caption": "Same language, different runtimes. The standard library is shared; the execution engine and the extension-module story are not.", "columns": [{"title": "CPython", "tone": "accent", "items": ["the reference implementation", "bytecode interpreter in C", "C extensions (NumPy) work", "what 'python' means"]}, {"title": "PyPy", "tone": "good", "items": ["JIT compiler", "often 4–10× faster pure Python", "C extensions slower or absent", "niche in production"]}, {"title": "Others", "tone": "warn", "items": ["MicroPython — microcontrollers", "GraalPy, Jython — JVM hosts", "Cython — Python → C", "Pyodide — the browser"]}], "t": "diagram", "id": "dg-1_2-03-0"},




    { t: "table",
      head: ["Runtime", "Reach for it when", "What it costs you"],
      rows: [
        ["**CPython**", "Always, unless you have a measured reason not to. Every library targets it.", "Pure-Python compute is the slowest of these options."],
        ["**PyPy**", "A long-running, CPU-bound, pure-Python workload — a simulation, a parser, a batch transform. The JIT can give large speedups on hot loops with no code change.", "Slower startup and higher memory; C-extension support is real but imperfect. Useless for short-lived processes."],
        ["**Anaconda / conda**", "Scientific stacks with heavy native dependencies (CUDA, MKL, GDAL) where conda's binary packaging solves what pip cannot.", "A parallel packaging universe. Mixing conda and pip in one environment is a well-known source of broken installs."],
        ["**Free-threaded CPython**", "Experimental. Genuine thread parallelism for CPU-bound Python without multiprocessing.", "Single-thread performance penalty; limited extension support. Track it, do not deploy it yet."]
      ],
      caption: "The honest default is CPython at one version behind latest. Everything else on this table needs a measurement behind it."
    },

    /* ================================================================== */
    { t: "h2", n: "04", text: "Never use the system Python", id: "system-python" },

    { t: "p", text: "Linux distributions and macOS ship a Python that the operating system itself depends on. Package managers, system utilities and parts of the desktop are written in it." },

    { t: "callout", kind: "trap", title: "Why `sudo pip install` is genuinely dangerous", body: [
      { t: "p", text: "Installing into the system interpreter can upgrade a library the operating system pinned to a specific version. The failure is not a Python error — it is `apt` refusing to run, or a system tool crashing on boot, with no obvious connection to what you did." },
      { t: "p", text: "Modern Python protects you from this. Since PEP 668, a system-managed interpreter refuses the install:" },
      { t: "code", lang: "bash", title: "terminal", numbered: false, code: `
$ pip install requests
error: externally-managed-environment

× This environment is externally managed
╰─> To install Python packages system-wide, try apt install
    python3-requests. If you wish to install a non-Debian-packaged
    Python package, create a virtual environment instead.`},
      { t: "p", text: "**This message is correct and you should obey it.** The recommended workaround you will find online — `--break-system-packages` — is named accurately. Create a virtual environment instead; Lesson 1.3 covers exactly how." }
    ]},

    { t: "p", text: "The rule that follows is simple and absolute: **the system Python runs the system. You install your own, and you work inside virtual environments.**" },

    /* ================================================================== */
    { t: "h2", n: "05", text: "Standard library, PyPI, and the cost of a dependency", id: "ecosystem" },

    { t: "p", text: "Python's reputation for \"batteries included\" is earned — the standard library covers JSON, CSV, HTTP clients and servers, SQLite, compression, cryptographic hashing, dates, subprocesses, threading and async, testing, and argument parsing. A large amount of professional Python needs nothing else." },

    { t: "p", text: "PyPI hosts several hundred thousand packages beyond that. The engineering question is not *does a package exist* — one always does — but *should this be a dependency*." },

    { t: "table",
      head: ["Need", "Standard library", "Reach for a package when"],
      rows: [
        ["HTTP requests", "`urllib.request`", "Almost always — `httpx` or `requests` for connection pooling, retries and sane timeouts"],
        ["Dates and times", "`datetime`, `zoneinfo`", "Rarely. `zoneinfo` made most date libraries unnecessary"],
        ["Config / validation", "`configparser`, `dataclasses`", "At any API or file boundary — `pydantic` earns its place there"],
        ["Testing", "`unittest`", "Effectively always — `pytest` is the ecosystem standard"],
        ["CLI parsing", "`argparse`", "Only for large multi-command tools — `typer`, `click`"],
        ["Numeric work", "— (none)", "Immediately. `numpy` is not optional for array maths"]
      ]
    },

    { t: "callout", kind: "insight", title: "Every dependency is a permanent liability", body: [
      { t: "p", text: "Adding a package takes seconds. Keeping it costs you, for as long as the project lives: security advisories to triage, an upgrade to perform every time you move Python version, an install to wait for in every CI run, and code that breaks if the maintainer walks away." },
      { t: "p", text: "Before adding one, ask four questions: *Is it in the standard library already? Is this package maintained — commits in the last year, issues answered? How many dependencies does it drag in? Could I write the 30 lines I actually need?* The `left-pad` and `colors.js` incidents in the JavaScript ecosystem were not exotic — they were the ordinary consequence of treating dependencies as free." },
      { t: "p", text: "This is not an argument against dependencies. `requests`, `pytest` and `numpy` are worth far more than they cost. It is an argument for the cost being *considered* rather than invisible. Lesson 14.7 covers scanning and pinning them properly." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Write your environment doctor",
      difficulty: "foundation",
      minutes: 20,
      body: [
        { t: "p", text: "Every engineer eventually writes a small script that answers \"what is my environment actually doing\" — and then reuses it for years. Write yours now, while the questions are fresh." },
        { t: "p", text: "It should be diagnostic: it does not just print facts, it flags the situations that cause problems." }
      ],
      requirements: [
        "Print the interpreter path, version, and implementation name.",
        "Report whether you are inside a virtual environment, using the `sys.prefix` test rather than checking environment variables.",
        "**Warn** if the interpreter is not in a virtual environment — that is the state in which mistakes happen.",
        "**Warn** if the running Python is older than 3.9.",
        "Verify that `pip` belongs to this same interpreter, and warn if it does not.",
        "Exit with a non-zero status if any warning was raised, so it can be used in CI."
      ],
      hint: "For the pip check, `importlib.util.find_spec(\"pip\")` tells you whether *this* interpreter can import pip. To find where a `pip` command would come from instead, `shutil.which(\"pip\")` gives you the path that would run.",
      solution: {
        lang: "python",
        title: "envdoctor.py",
        code: `"""Report the current Python environment and flag common misconfigurations."""

from __future__ import annotations

import importlib.util
import shutil
import sys
import sysconfig
from pathlib import Path

MIN_VERSION = (3, 9)

warnings: list[str] = []


def warn(message: str) -> None:
    warnings.append(message)


def in_virtualenv() -> bool:
    """True when running inside a venv.

    sys.prefix points at the active environment; sys.base_prefix at the
    interpreter it was created from. They differ only inside a venv. This is
    more reliable than checking VIRTUAL_ENV, which is set by the activate
    script and is therefore absent when the venv's python is invoked directly.
    """
    return sys.prefix != sys.base_prefix


def pip_belongs_here() -> tuple[bool, str]:
    """Check that a bare 'pip' command would target this interpreter."""
    if importlib.util.find_spec("pip") is None:
        return False, "this interpreter has no pip installed"

    pip_path = shutil.which("pip")
    if pip_path is None:
        return True, "no pip on PATH — use 'python -m pip'"

    # A matching pip lives beside the interpreter, in the same bin/Scripts dir.
    if Path(pip_path).parent != Path(sys.executable).parent:
        return False, f"PATH pip is {pip_path}, not beside {sys.executable}"

    return True, pip_path


def main() -> int:
    version = ".".join(str(p) for p in sys.version_info[:3])

    print("Python environment")
    print("-" * 60)
    print(f"  executable    {sys.executable}")
    print(f"  version       {version}")
    print(f"  implementation{sys.implementation.name:>15}")
    print(f"  site-packages {sysconfig.get_paths()['purelib']}")

    venv = in_virtualenv()
    print(f"  virtualenv    {'yes -> ' + sys.prefix if venv else 'NO'}")
    if not venv:
        warn("Not inside a virtual environment. Installs will go to the "
             "interpreter itself and may be shared or refused.")

    if sys.version_info < MIN_VERSION:
        want = ".".join(str(p) for p in MIN_VERSION)
        warn(f"Python {version} is older than the {want} minimum.")

    ok, detail = pip_belongs_here()
    print(f"  pip           {detail}")
    if not ok:
        warn(f"pip mismatch: {detail}. Always install with 'python -m pip'.")

    print("-" * 60)
    if warnings:
        print(f"{len(warnings)} warning(s):")
        for w in warnings:
            print(f"  ! {w}")
        return 1

    print("Environment looks healthy.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())`,
        notes: [
          { t: "p", text: "**Three details worth taking away from the solution.**" },
          { t: "ul", items: [
            "The venv check uses `sys.prefix != sys.base_prefix`, not `os.environ.get(\"VIRTUAL_ENV\")`. The environment variable is set by the `activate` script — so running `.venv/bin/python script.py` directly, which is completely normal and what most tooling does, leaves it unset. The prefix test is always right.",
            "`raise SystemExit(main())` is the idiomatic way to return an exit code from a script. It is cleaner than `sys.exit()` scattered through the body, and it keeps `main()` a normal, testable function that returns an int.",
            "Comparing `Path(pip_path).parent` to `Path(sys.executable).parent` is the actual test for \"is this the right pip\" — a matching pip always lives in the same `bin/` or `Scripts/` directory as its interpreter."
          ]},
          { t: "p", text: "Keep this script. Paste it into any container, CI runner or colleague's machine where something behaves unexpectedly, and it will usually identify the problem before you have finished reading the stack trace." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A CI pipeline that has been green for months starts failing on a dependency install, with no change to the lockfile. The error mentions compiling from source and a missing C compiler." },
      { t: "p", text: "**What happened, most likely?** The workflow pinned Python loosely — something like `python-version: \"3.x\"` — and a new minor version was released. The runner picked it up, and one dependency has no prebuilt wheel for that version yet, so pip fell back to building from source in an image with no toolchain." },
      { t: "p", text: "**The fix and the lesson.** Pin the interpreter exactly (`python-version: \"3.12\"`) in CI, in your Dockerfile, and in `pyproject.toml`'s `requires-python`. An unpinned interpreter means your build depends on the calendar — the same class of problem as an unpinned dependency, and easier to overlook because Python does not feel like a dependency." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "`sys.executable` is the only authoritative answer to \"which Python is this\". Everything else is inference.",
    "**`python -m pip install` should be your default form.** It makes it impossible for pip and your interpreter to be different installations.",
    "`sys.prefix != sys.base_prefix` is the reliable virtual-environment test — `VIRTUAL_ENV` is unset whenever the venv's interpreter is invoked directly.",
    "Compare versions with `sys.version_info` tuples. String comparison sorts `\"3.10\"` before `\"3.9\"`, and that bug shipped widely.",
    "**Micro upgrades are free; minor upgrades are a project.** Stay current on the former, plan the latter, and never skip three at once.",
    "Default to **one minor version behind the newest** for new projects — the constraint is compiled-wheel availability, not Python's own stability.",
    "The system Python runs the operating system. `externally-managed-environment` is correct; obey it rather than overriding it.",
    "Every dependency is a permanent liability — advisories, upgrades, CI time and abandonment risk. Add them deliberately, not reflexively."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You run `pip install httpx`, it reports success, and then `python -c \"import httpx\"` raises `ModuleNotFoundError`. What is the most likely cause?",
        options: [
          "The package installed but needs the shell restarted before it can be imported",
          "`pip` and `python` resolve to two different interpreters, so the install went to a different site-packages directory",
          "`httpx` is not compatible with your Python version and pip silently skipped it",
          "The package needs to be added to `sys.path` manually after installation"
        ],
        answer: 1,
        why: "Each interpreter has its own site-packages. When the `pip` on your PATH belongs to a different installation than the `python` on your PATH, the install genuinely succeeds — into somewhere your interpreter never looks. `python -m pip install` eliminates this permanently by running pip inside the interpreter you just named. Incompatibility would produce a loud error, not a silent skip."
      },
      {
        stem: "Which expression correctly tests that you are running at least Python 3.10?",
        lang: "python",
        code: `# A
sys.version >= "3.10"
# B
sys.version_info >= (3, 10)
# C
float(sys.version[:4]) >= 3.10
# D
sys.version_info.minor >= 10`,
        options: [
          "A — the version string compares naturally",
          "B — tuple comparison, element by element",
          "C — converting to a float makes the comparison numeric",
          "D — checking the minor number directly is the most precise"
        ],
        answer: 1,
        why: "Only B is correct. A compares strings, so `\"3.9\" > \"3.10\"` — the bug that shipped widely during the 3.9→3.10 transition. C is worse: `float(\"3.10\")` is `3.1`, which is less than `3.10` as a number. D ignores the major version, so it would wrongly pass on a hypothetical Python 4.0.9 and wrongly *fail* nothing — but it is still an incomplete test. Tuple comparison handles every element in the right order."
      },
      {
        stem: "Your Linux system refuses `pip install requests` with `error: externally-managed-environment`. What is the correct response?",
        options: [
          "Re-run with `--break-system-packages`, which is what the flag is for",
          "Use `sudo` so pip has permission to write to the system directory",
          "Create a virtual environment and install into that",
          "Uninstall the system Python and install a clean one from python.org"
        ],
        answer: 2,
        why: "The error is a safety feature (PEP 668), not an obstacle. The system interpreter is a dependency of the operating system, and upgrading a library inside it can break package managers and system tools in ways that look unrelated. `--break-system-packages` is named honestly. `sudo` makes the damage possible rather than preventing it. Removing the system Python would break the OS outright. A virtual environment is the intended answer."
      },
      {
        stem: "A team is starting a new service the week Python 3.14 is released. What is the sensible default choice of version, and why?",
        options: [
          "3.14 — start on the newest so the project stays current for longest",
          "3.13 — one behind, because compiled dependencies need time to publish wheels for a new interpreter",
          "The oldest version still receiving security fixes, for maximum stability",
          "Whatever version is already installed on the deployment host"
        ],
        answer: 1,
        why: "The constraint is the ecosystem, not Python itself. Packages with C or Rust extensions — NumPy, pandas, psycopg, pydantic-core — must build and publish wheels against each new interpreter, which takes weeks to months. Adopting on release day means compiling from source or pinning to old versions. The oldest supported version wastes years of improvements, and inheriting the host's version is how you end up on an end-of-life interpreter nobody chose."
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
        q: "A colleague says a package is installed but their script cannot import it. How do you debug it?",
        strong: "Find out which interpreter is running and which interpreter pip installed into. `python -c \"import sys; print(sys.executable)\"` and `python -m pip show <package>` answer both. In almost every case the two are different installations, and `python -m pip` is the permanent fix.",
        answer: [
          { t: "p", text: "This is a practical screening question — the interviewer wants to see whether you debug by inspection or by guessing." },
          { t: "p", text: "A strong answer names the mechanism, not just the command: every interpreter has its own `site-packages`, so \"installed\" is always relative to *which* Python. Mentioning `sys.prefix != sys.base_prefix` to check for an unactivated virtual environment shows you know the second most common cause." },
          { t: "p", text: "If you want to demonstrate seniority, add the preventative: this class of bug is why teams standardise on `python -m pip` and on a project-local `.venv`, and why CI pins the interpreter version explicitly." }
        ],
        weak: "Suggesting reinstalling the package, restarting the terminal, or adding directories to `sys.path`. All three occasionally appear to work, none of them identify the cause, and the last one leaves a permanent mess behind."
      },
      {
        level: "core",
        q: "What is the difference between the Python language and CPython?",
        strong: "The language is a specification — grammar and semantics. CPython is the reference implementation written in C, and it is what almost everyone runs. Properties like the GIL, reference counting and bytecode belong to CPython, not to the language; PyPy implements the same language with a JIT and different internals.",
        answer: [
          { t: "p", text: "The follow-up is usually *\"so why does that distinction matter in practice?\"*" },
          { t: "p", text: "Answer with a consequence, not a definition. The clearest one: when someone proposes solving a CPU-bound bottleneck with threads, the reason it will not work is a CPython implementation detail, not a law of the language — and that framing is what opens up the real options, from multiprocessing to PyPy to moving the hot path into NumPy." }
        ]
      },
      {
        level: "advanced",
        q: "How would you decide when to upgrade a production service from Python 3.11 to 3.12?",
        strong: "Treat it as a project with a checklist: confirm every dependency publishes wheels for 3.12, run the suite with deprecation warnings turned into errors, check the release notes for removed stdlib modules, then roll out behind the same gradual deployment you would use for any change.",
        answer: [
          { t: "p", text: "The interviewer is testing whether you have actually done this, so specifics matter more than principles." },
          { t: "p", text: "Strong answers mention: running `pytest -W error::DeprecationWarning` on the current version *first*, because that surfaces most of the breakage before you switch anything; checking that compiled dependencies have wheels rather than falling back to source builds; and benchmarking, since 3.11 and 3.12 brought real performance gains that are worth measuring rather than assuming." },
          { t: "p", text: "The judgement point to close on: the cost of upgrading grows superlinearly with how far behind you are, because deprecations accumulate and dependency support windows close. Upgrading one version a year is routine maintenance. Upgrading three at once is a migration project with its own risk profile." }
        ],
        weak: "\"Upgrade when we need a new feature.\" That reasoning is how a service ends up on an end-of-life interpreter receiving no security fixes, at which point the upgrade is both urgent and expensive."
      }
    ]
  }
});

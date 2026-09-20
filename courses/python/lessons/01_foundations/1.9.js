/* ============================================================================
   LESSON 1.9 — Input, Output and Reading a Traceback
   ========================================================================= */
EC.receiveLesson({
  id: "1.9",

  lede: "Reading a traceback is the highest-leverage skill in this module and the one almost nobody is taught. Most people scan for red text and guess. A traceback is a **precise, ordered account of how the program reached the failure** — and read correctly it usually names the bug in under ten seconds. This lesson covers that, plus the output mechanics that decide whether your logs exist at all when a container dies.",

  objectives: [
    "Read a traceback in the correct order and identify the line that actually failed",
    "Interpret a chained traceback and say which of the two errors is the real cause",
    "Use `print()` fully — `sep`, `end`, `file`, `flush` — and know when it is the wrong tool",
    "Explain why output disappears when a process is killed, and prevent it",
    "Drop into a debugger at the point of failure instead of adding print statements"
  ],

  prerequisites: ["1.1", "1.6"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "Reading a traceback", id: "traceback" },

    {"kind": "steps", "title": "Reading a traceback, bottom up", "caption": "The last line is the exception; the frame just above it is where it was raised; the frames above that are the callers. Read the bottom first, then walk up until you reach your own code.", "items": [{"label": "Traceback (most recent call last):", "desc": "the header — frames follow, outermost first"}, {"label": "File \"app.py\", line 12, in main", "desc": "your code: the caller"}, {"label": "File \"lib.py\", line 40, in parse", "desc": "the callee, where it actually raised", "tone": "warn"}, {"label": "ValueError: invalid literal for int()", "desc": "the exception type and message — read this first", "tone": "crit"}], "t": "diagram", "id": "dg-1_9-01-0"},




    { t: "p", text: "Here is a failure from a small program. Before reading the explanation, decide which line contains the bug." },

    { t: "code", lang: "text", title: "the traceback", numbered: false, code: `
Traceback (most recent call last):
  File "/app/main.py", line 42, in <module>
    report = build_report(orders)
             ^^^^^^^^^^^^^^^^^^^^
  File "/app/reporting.py", line 18, in build_report
    return summarise(filter_valid(rows))
                     ^^^^^^^^^^^^^^^^^^
  File "/app/reporting.py", line 9, in filter_valid
    return [r for r in rows if r["status"] == "paid"]
                               ~~^^^^^^^^^^
KeyError: 'status'`},

    { t: "viz",
      title: "How to read it",
      caption: "The frames are printed oldest-call-first, so the code that failed is at the bottom, immediately above the error. Read the last frame first — then walk upward only if you need to know how you got there.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram: a traceback read from the bottom upwards, with the failing frame nearest the error line">
  <defs>
    <marker id="a5" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--accent)"/>
    </marker>
  </defs>

  <text x="20" y="22" class="s-sub" style="font-weight:700;letter-spacing:.08em">THE STACK, AS PRINTED</text>

  <rect x="20" y="36" width="470" height="34" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="34" y="58" class="s-mono" style="font-size:10.5px">Traceback (most recent call last):</text>
  <text x="510" y="58" class="s-sub">a header, not a frame</text>

  <rect x="20" y="76" width="470" height="42" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="34" y="94" class="s-mono" style="font-size:10.5px">main.py:42  in &lt;module&gt;</text>
  <text x="34" y="110" class="s-mono" style="font-size:10px;fill:var(--ink-3)">build_report(orders)</text>
  <text x="510" y="101" class="s-sub">where it started</text>

  <rect x="20" y="124" width="470" height="42" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="34" y="142" class="s-mono" style="font-size:10.5px">reporting.py:18  in build_report</text>
  <text x="34" y="158" class="s-mono" style="font-size:10px;fill:var(--ink-3)">summarise(filter_valid(rows))</text>
  <text x="510" y="149" class="s-sub">an intermediate call</text>

  <rect x="20" y="172" width="470" height="44" rx="6" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.5"/>
  <text x="34" y="190" class="s-mono" style="font-size:10.5px;fill:var(--accent-ink)">reporting.py:9  in filter_valid</text>
  <text x="34" y="207" class="s-mono" style="font-size:10px;fill:var(--accent-ink)">r["status"] == "paid"</text>
  <text x="510" y="197" class="s-sub" style="fill:var(--accent-ink);font-weight:600">START HERE — this line ran and failed</text>

  <rect x="20" y="222" width="470" height="30" rx="6" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="34" y="242" class="s-mono" style="font-size:10.5px;fill:var(--crit)">KeyError: 'status'</text>
  <text x="510" y="242" class="s-sub" style="fill:var(--crit)">what went wrong</text>

  <path d="M700 240 L700 200" style="stroke:var(--accent);fill:none" stroke-width="2" marker-end="url(#a5)"/>
  <path d="M700 190 L700 150" style="stroke:var(--accent);fill:none" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#a5)"/>
  <text x="714" y="220" class="s-sub" style="fill:var(--accent-ink);font-weight:600">read up</text>
  <text x="714" y="170" class="s-sub">only if needed</text>

  <text x="20" y="278" class="s-sub" style="fill:var(--ink-2)">Your own files matter most. Frames inside site-packages are usually passing through, not causing.</text>
</svg>`
    },

    { t: "p", text: "So: a dictionary in `rows` has no `status` key. The bug is not in `main.py` and not in `build_report` — those frames only describe the route. And the `~~^^` markers under the failing line (Python 3.11+) point at the exact sub-expression, which matters when a line contains several things that could fail." },

    { t: "dl", items: [
      ["Read bottom-up", "The last frame is where execution actually was. Everything above it is how it got there."],
      ["Find your own code", "In a stack full of framework frames, the deepest file you wrote is nearly always where the fix belongs."],
      ["Read the error type and message together", "`KeyError: 'status'` names both the failure mode and the specific value. `TypeError: 'NoneType' object is not subscriptable` means something returned `None` — usually a function that fell off the end (Lesson 1.5)."],
      ["Use the carets", "Python 3.11+ underlines the failing sub-expression, which disambiguates `a[i] + b[j]` immediately."]
    ]},

    { t: "callout", kind: "trap", title: "The most misread traceback: chained exceptions", body: [
      { t: "p", text: "When an exception is raised while another is being handled, Python prints **both**, joined by a sentence that tells you how they relate. Which one is the real cause depends entirely on that sentence." },
      { t: "code", lang: "text", title: "read the connector", numbered: false, code: `
  File "/app/config.py", line 12, in load
    return int(raw_port)
ValueError: invalid literal for int() with base 10: 'eighty'

The above exception was the direct cause of the following exception:

  File "/app/main.py", line 7, in <module>
    settings = load()
ConfigError: could not load configuration`},
      { t: "table",
        head: ["Connector", "Means", "Which to fix"],
        rows: [
          ["*\"was the direct cause of\"*", "The code deliberately re-raised with `raise ... from exc`", "**The first (top) one.** The second is a wrapper adding context."],
          ["*\"During handling ... another exception occurred\"*", "A second error happened **inside the `except` block** — accidentally", "Usually **the second (bottom) one**: your error handler is itself broken."]
        ]
      },
      { t: "p", text: "The second case is the one that wastes afternoons. A handler that tries to log the failure and crashes on a missing variable will bury the original error above a completely unrelated `NameError`. Lesson 6.3 covers raising these deliberately." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "print(), completely", id: "print" },

    { t: "code", lang: "python", title: "the four keyword arguments", code: `
import sys

print("a", "b", "c")                    # sep defaults to a space
print("a", "b", "c", sep="")            # abc
print("2024", "01", "15", sep="-")      # 2024-01-15

print("no newline", end="")             # end defaults to "\\n"
print(" -- continued")

print("this is a problem", file=sys.stderr)   # goes to stderr, not stdout

print("flushed immediately", flush=True)
`,
      out: `a b c
abc
2024-01-15
no newline -- continued
this is a problem
flushed immediately`
    },

    { t: "callout", kind: "insight", title: "stdout and stderr are different streams for a reason", body: [
      { t: "p", text: "`stdout` carries a program's **results**. `stderr` carries **diagnostics**. Keeping them separate is what lets a command be composed:" },
      { t: "code", lang: "bash", title: "why it matters", numbered: false, code: `
# Results into a file, progress messages still visible on the terminal
$ python report.py > report.csv
processing 1000 rows...        # this was printed to stderr

# Discard diagnostics, keep results
$ python report.py 2>/dev/null > report.csv`},
      { t: "p", text: "A script that prints progress to `stdout` corrupts its own output the moment anyone redirects it. **Anything that is not the program's actual output belongs on `stderr`** — which is also where the `logging` module sends records by default (Lesson 6.4)." }
    ]},

    { t: "callout", kind: "trap", title: "Why your logs vanish when the container dies", body: [
      { t: "p", text: "`stdout` is **block-buffered when it is not a terminal**. Interactively you see every line immediately; piped to a file or captured by Docker, Python accumulates roughly 8KB before writing anything. If the process is killed — OOM, `SIGKILL`, a crash — that buffer is lost, and the output describing what went wrong disappears with it." },
      { t: "code", lang: "python", title: "the demonstration", numbered: false, code: `
import os
import time

print("starting up")          # buffered when piped
time.sleep(1)
os._exit(1)                   # abrupt exit -- buffer never flushed`,
        caption: "Run this in a terminal and you see `starting up`. Run `python x.py > out.txt` and `out.txt` is empty."
      },
      { t: "p", text: "**Three fixes, in order of preference for production:**" },
      { t: "code", lang: "bash", title: "pick one and apply it everywhere", numbered: false, code: `
# 1. Environment variable -- the right choice in a Dockerfile
ENV PYTHONUNBUFFERED=1

# 2. Command-line flag -- same effect, per invocation
$ python -u app.py`},
      { t: "code", lang: "python", title: "3. per-call, for the one line that matters", numbered: false, code: `
print("checkpoint reached", flush=True)`},
      { t: "p", text: "`PYTHONUNBUFFERED=1` belongs in essentially every Python Dockerfile. Note that `stderr` is line-buffered rather than block-buffered, which is a second reason diagnostics belong there — they survive more failures." }
    ]},

    { t: "callout", kind: "tradeoff", title: "When print() stops being the right tool", body: [
      { t: "p", text: "`print` is correct for CLI output that a user reads, and for throwaway exploration in a REPL. It is the wrong tool for anything a *program* will read." },
      { t: "table",
        head: ["Need", "Use"],
        rows: [
          ["Program output a human or another command consumes", "`print()` to stdout"],
          ["Diagnostics during development", "`print(..., file=sys.stderr)` — then delete it"],
          ["Anything you might want in production", "`logging` — levels, timestamps, structure, and it can be turned off without editing code"],
          ["Inspecting state at a specific point", "`breakpoint()` — inspect everything, not just what you thought to print"]
        ]
      },
      { t: "p", text: "The practical distinction: a `print` you would be embarrassed to ship should be a `breakpoint()`, and a `print` you *want* to ship should be a log record. Lesson 6.4 covers logging properly." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "input() and reading stdin", id: "input" },

    { t: "code", lang: "python", title: "input always returns a string", code: `
age_raw = input("Age: ")        # "30" -- never an int
print(type(age_raw))

# So every numeric input needs parsing, with the errors Lesson 1.8 covered:
try:
    age = int(age_raw.strip())
except ValueError:
    print(f"not a whole number: {age_raw!r}", file=sys.stderr)
    raise SystemExit(1)
`,
      caption: "`input()` strips the trailing newline but nothing else, so leading and trailing spaces survive — which is why `.strip()` before parsing is routine."
    },

    { t: "code", lang: "python", title: "reading piped input", code: `
import sys

# input() raises EOFError at end of input. For piped data, iterate stdin:
for line in sys.stdin:
    print(line.rstrip().upper())

# Works with: $ cat names.txt | python shout.py
# Streams line by line, so a 10GB file uses constant memory.
`,
      caption: "Iterating `sys.stdin` is lazy — it does not read the whole stream first. `sys.stdin.read()` does, and will exhaust memory on a large pipe."
    },

    /* ================================================================== */
    { t: "h2", n: "04", text: "breakpoint()", id: "breakpoint",
      sub: "The alternative to adding print statements and re-running." },

    { t: "p", text: "Adding a `print`, re-running, discovering you needed a different variable, and repeating is a slow loop. `breakpoint()` stops execution and gives you a REPL with every local in scope." },

    { t: "code", lang: "python", title: "drop into the debugger", code: `
def filter_valid(rows):
    breakpoint()          # execution pauses here
    return [r for r in rows if r["status"] == "paid"]
`,
      caption: "Built in since Python 3.7. Setting `PYTHONBREAKPOINT=0` disables every call without editing code, which makes a forgotten one harmless in production — though a linter should catch it first."
    },

    { t: "table",
      head: ["Command", "Does"],
      rows: [
        ["`p expr` / `pp expr`", "Print an expression; `pp` pretty-prints it"],
        ["`l`", "Show source around the current line"],
        ["`n`", "Next line, stepping over calls"],
        ["`s`", "Step into the call on this line"],
        ["`c`", "Continue until the next breakpoint or the end"],
        ["`w`", "Where — print the current stack"],
        ["`u` / `d`", "Move up or down a stack frame to inspect a caller's locals"],
        ["`q`", "Quit"]
      ]
    },

    { t: "callout", kind: "insight", title: "The technique worth knowing today", body: [
      { t: "p", text: "You do not need to place a breakpoint in advance to debug a crash. **Post-mortem debugging** drops you into the frame where the exception occurred, with all of its locals still alive:" },
      { t: "code", lang: "bash", title: "terminal", numbered: false, code: `
$ python -m pdb -c continue app.py`,
        caption: "Runs normally; on an unhandled exception, opens pdb at the point of failure instead of exiting."},
      { t: "p", text: "Or interactively, after a script fails: `python -i app.py` leaves you in a REPL with the module's state intact, and `import pdb; pdb.pm()` opens the post-mortem debugger on the last traceback." },
      { t: "p", text: "This turns \"reproduce it with more prints\" into \"inspect the actual failure\", which is a categorical improvement. Lesson 6.6 covers debugging in depth." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Diagnose four failures from their tracebacks alone",
      difficulty: "foundation",
      minutes: 25,
      body: [
        { t: "p", text: "Debugging is pattern recognition, and the patterns are learnable. For each traceback below, answer three questions **without running any code**: which line is the bug, what is the underlying cause, and what is the fix." },
        { t: "p", text: "Write your answers down before revealing the solution. The gap between your reasoning and the explanation is where the learning is." }
      ],
      requirements: [
        "**A.** `TypeError: 'NoneType' object is not subscriptable` in a line reading `config[\"port\"]`, where `config = load_config(path)`.",
        "**B.** `KeyError: 0` raised from a line reading `record[0]`, where `record` came from `csv.DictReader`.",
        "**C.** A traceback ending in `NameError: name 'logger' is not defined`, preceded by *\"During handling of the above exception, another exception occurred\"*.",
        "**D.** `RecursionError: maximum recursion depth exceeded` with the same two frames repeating, in a class that defines `__getattr__`.",
        "For each: name the line, the cause, and the fix. For C, state which of the two exceptions you would fix first and why."
      ],
      hint: "For A, ask what makes a function return `None` (Lesson 1.5). For B, ask what a `DictReader` row actually is. For C, the connector sentence tells you which error is the accident. For D, ask what happens when `__getattr__` looks up an attribute on `self`.",
      solution: {
        lang: "python",
        title: "diagnoses.py",
        code: `# =====================================================================
# A. TypeError: 'NoneType' object is not subscriptable
# =====================================================================
# CAUSE  load_config() returned None. A function returns None when it has
#        no return statement on the path taken -- typically a guard clause
#        that returns early, or a search loop that finds nothing.
#
# The bug is NOT on the line that raised. That line correctly reports that
# it was handed None. The bug is in load_config.

def load_config(path):
    if not path.exists():
        return                       # <- returns None implicitly
    return json.loads(path.read_text())


# FIX  Decide what "missing" means and make it explicit in the signature.
def load_config(path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"no config at {path}")   # fail loudly
    return json.loads(path.read_text())

# Or, if absence is legitimate, say so and force the caller to handle it:
def load_config(path) -> dict | None: ...


# =====================================================================
# B. KeyError: 0  from  record[0]
# =====================================================================
# CAUSE  csv.DictReader yields dicts keyed by COLUMN NAME, not lists.
#        record[0] asks for the key 0, which does not exist.
#        The error type is the clue: a list raises IndexError, a dict
#        raises KeyError. Getting KeyError means the object is a mapping.
#
# FIX
#   record["order_id"]              # DictReader
#   record[0]                       # only with csv.reader, which yields lists

# The general lesson: the EXCEPTION TYPE tells you what kind of object you
# actually have, which is often more useful than the message.


# =====================================================================
# C. NameError: 'logger' -- "During handling ... another exception occurred"
# =====================================================================
# CAUSE  That connector means the second error happened INSIDE an except
#        block. The handler itself is broken:

try:
    process(order)
except ValueError:
    logger.error("bad order")        # logger was never imported -> NameError
    raise

# Two exceptions are now in play, and the NameError is the one that
# surfaced -- burying the ValueError that actually explains the failure.
#
# FIX FIRST: the handler (import logging; logger = logging.getLogger(__name__)).
# Until it works you cannot see the real error.
#
# Contrast with "was the direct cause of", which means a DELIBERATE
# 'raise ... from exc'. There, the FIRST exception is the real cause and
# the second is a wrapper adding context.


# =====================================================================
# D. RecursionError in a class with __getattr__
# =====================================================================
# CAUSE  __getattr__ is called when normal attribute lookup FAILS. Looking
#        up self._data inside it triggers __getattr__ again if _data is not
#        yet set -- which is exactly the case during __init__, or after
#        unpickling.

class Config:
    def __init__(self, data):
        self._data = data

    def __getattr__(self, name):
        return self._data[name]      # self._data missing -> __getattr__ -> loop


# FIX  Reach past the descriptor protocol with the instance dict, so the
#      lookup cannot recurse.
class Config:
    def __init__(self, data):
        self._data = data

    def __getattr__(self, name):
        try:
            return object.__getattribute__(self, "_data")[name]
        except KeyError:
            raise AttributeError(name) from None

# Raising AttributeError (not KeyError) matters: hasattr() and getattr()
# with a default rely on AttributeError to signal "no such attribute".`,
        notes: [
          { t: "p", text: "**The transferable pattern is that the error type is data.** `KeyError` versus `IndexError` tells you whether you are holding a mapping or a sequence. `AttributeError` tells you the object is not what you assumed. `TypeError: 'NoneType' ...` almost always means a function returned `None` on a path you did not consider." },
          { t: "p", text: "**Case A is the most common Python error in existence**, and the important habit is that the traceback's last line is where the problem *surfaced*, not where it was *created*. The fix is one or two frames up, in whatever produced the `None`." },
          { t: "p", text: "**Case C is the one that costs the most time**, because the visible error is unrelated to the actual failure. Learning to read the connector sentence — \"during handling\" means your handler is broken; \"direct cause\" means the wrapper is intentional — turns a confusing traceback into an ordered one." },
          { t: "callout", kind: "insight", title: "Case D generalises", body: [
            { t: "p", text: "Any dunder method that touches the thing it implements will recurse: `__getattr__` reading an attribute, `__eq__` comparing with `==`, `__repr__` formatting `self`. The `RecursionError` with two repeating frames is the signature." },
            { t: "p", text: "Note also that `__getattr__` must raise `AttributeError` — not `KeyError` — when the name is absent, because `hasattr()` and `getattr(obj, name, default)` are built on catching `AttributeError`. Returning the wrong exception type breaks both silently. Lesson 4.9 covers the dunder protocols in full." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A batch job runs nightly in Kubernetes. It has started failing intermittently, and the pod logs show only the startup banner — nothing about the failure, no traceback. The exit code indicates the process was killed." },
      { t: "p", text: "**Two things are happening, and both are in this lesson.** The pod is being OOM-killed with `SIGKILL`, which the process cannot catch or handle. And `stdout` is block-buffered because it is a pipe, not a terminal — so everything the job printed after the banner was sitting in an 8KB buffer that died with the process." },
      { t: "p", text: "**The immediate fix is one line:** `ENV PYTHONUNBUFFERED=1` in the Dockerfile. The logs then survive the kill, and they will show how far the job got — which is what identifies the memory growth." },
      { t: "p", text: "**The general point:** absent logs are evidence, not an absence of evidence. \"The logs stop at the banner\" told you the process died abruptly *and* that output was buffered. Both facts were available before anyone looked at memory graphs." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**Read tracebacks bottom-up.** The last frame is where execution actually was; everything above it is the route. In Python 3.11+ the `^^^` carets name the exact failing sub-expression.",
    "In a stack full of framework frames, the deepest file *you wrote* is nearly always where the fix belongs.",
    "**The connector sentence decides which chained exception matters.** *\"Direct cause\"* means a deliberate `raise ... from` — fix the first. *\"During handling\"* means your `except` block is itself broken — fix the second.",
    "The exception type is information: `KeyError` means a mapping, `IndexError` a sequence, `TypeError: 'NoneType' ...` a function that returned `None` on an unconsidered path.",
    "`print()` takes `sep`, `end`, `file` and `flush`. Diagnostics belong on **`stderr`**, so redirecting a program's real output does not mix the two.",
    "**`stdout` is block-buffered when it is not a terminal.** A killed process loses whatever was buffered — set `PYTHONUNBUFFERED=1` in every Python container image.",
    "`input()` always returns a string, stripped of its newline but not of surrounding whitespace. Iterate `sys.stdin` for piped data; `.read()` loads it all into memory.",
    "**`breakpoint()` beats adding print statements** — you inspect everything in scope rather than only what you thought to print. `python -m pdb -c continue app.py` opens the debugger at an unhandled exception."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A traceback shows five frames. Which one most likely contains the bug?",
        options: [
          "The first frame, since it is where execution began",
          "The last frame before the error line — that is where execution actually was when it failed",
          "The frame with the longest file path, which indicates third-party code",
          "Whichever frame appears most often"
        ],
        answer: 1,
        why: "Frames print oldest-call-first, so the deepest — nearest the error — is where the failing line ran. The refinement worth adding: when the last frames are inside site-packages, the library is usually reporting your mistake rather than making one, so the deepest file *you wrote* is where the fix belongs. The first frame is just your entry point."
      },
      {
        stem: "A traceback contains \"During handling of the above exception, another exception occurred\". What does this tell you?",
        options: [
          "The first exception was deliberately wrapped with `raise ... from`",
          "A second exception was raised inside an `except` block — the error handler is itself broken",
          "Two threads failed at the same time",
          "The exception was re-raised after being logged, which is normal"
        ],
        answer: 1,
        why: "This wording appears when Python is handling one exception and a *new*, unrelated one is raised inside the handler — a `NameError` for an unimported logger, for instance. The visible error is then an accident of the handler, burying the real failure above it. Fix the handler first; you cannot see the actual cause until it works. The deliberate form produces the different sentence \"was the direct cause of\", where the *first* exception is the real one."
      },
      {
        stem: "A containerised Python job is OOM-killed. The logs show only the startup line, though the code prints progress throughout. Why?",
        options: [
          "`SIGKILL` causes Python to discard log records before writing them",
          "`stdout` is block-buffered when piped, and the buffered output died with the process",
          "The container's log driver drops messages under memory pressure",
          "`print()` is disabled once the container exceeds its memory limit"
        ],
        answer: 1,
        why: "When `stdout` is not a terminal, Python buffers roughly 8KB before writing. A `SIGKILL` cannot be caught or handled, so nothing is flushed and the buffer is lost with the process. The fix is `PYTHONUNBUFFERED=1` in the image, which is why it belongs in essentially every Python Dockerfile. Note that `stderr` is line-buffered, a second reason diagnostics survive better there."
      },
      {
        stem: "`TypeError: 'NoneType' object is not subscriptable` on the line `settings[\"timeout\"]`. Where is the bug?",
        options: [
          "On that line — the key `\"timeout\"` does not exist",
          "In whatever produced `settings`, which returned `None` on the path taken",
          "In the dictionary's type annotation, which is missing",
          "It is a `TypeError`, so the wrong type of key was used"
        ],
        answer: 1,
        why: "The line reporting the error is where the problem surfaced, not where it was created — `settings` is `None`, so subscripting it is impossible. Something upstream returned `None`, most often a function with a bare `return` in a guard clause or a search loop that fell off the end without finding anything. A missing key would raise `KeyError`, and the error type distinguishes the two immediately."
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
        q: "Walk me through how you read a Python traceback.",
        strong: "Bottom-up. The last frame is where execution was when it failed, and the error type plus message names the failure. Then I scan upward for the deepest file I wrote, because when the bottom frames are library code the library is usually reporting my mistake rather than making one.",
        answer: [
          { t: "p", text: "This is a screening question and it is genuinely diagnostic — a surprising number of candidates describe reading top-down, which is the order the frames are printed but the opposite of the order that helps." },
          { t: "p", text: "Two things strengthen the answer. First, treating the exception *type* as data: `KeyError` versus `IndexError` tells you whether you are holding a mapping or a sequence, before you read the message. Second, mentioning the 3.11+ caret markers, which underline the failing sub-expression and remove the ambiguity on a line like `a[i] + b[j]`." },
          { t: "p", text: "If there is room, describe the chained-exception rule — \"during handling\" means the handler is broken, \"direct cause\" means the wrapping was intentional. That is the traceback pattern that most often sends people in the wrong direction." }
        ]
      },
      {
        level: "core",
        q: "A container is killed and the logs are empty. What do you check?",
        strong: "Buffering first. `stdout` is block-buffered when it is not a terminal, so a `SIGKILL` discards whatever had not reached 8KB. Setting `PYTHONUNBUFFERED=1` makes the logs survive, and then they usually show how far the process got — which points at the real cause.",
        answer: [
          { t: "p", text: "The interviewer is looking for whether you can reason about absent evidence rather than only present evidence." },
          { t: "p", text: "The framing that lands: missing logs are themselves a signal. Output stopping abruptly at the banner tells you both that the process died without unwinding *and* that output was buffered — two facts available before anyone opens a memory graph." },
          { t: "p", text: "Worth adding that `stderr` is line-buffered rather than block-buffered, which is a practical argument for sending diagnostics there, and that `logging` writes to `stderr` by default — so a service using `logging` rather than `print` would have lost less." }
        ]
      },
      {
        level: "advanced",
        q: "How do you debug something that only fails in production?",
        strong: "Reproduce the conditions rather than the code path: same data shape, same concurrency, same resource limits. Make the failure legible first — structured logs with a correlation ID, unbuffered output — then narrow with evidence rather than guesses.",
        answer: [
          { t: "p", text: "This is a judgement question. Naming specific tools helps, but the reasoning order matters more." },
          { t: "p", text: "A strong sequence: confirm you can *see* the failure (buffering, log levels, whether the error is even reaching your aggregator); capture the state around it (structured logging, exception tracking with local variables, `py-spy` for a live stack dump without restarting); then form one hypothesis and test it, rather than changing three things at once." },
          { t: "p", text: "The observations that mark experience: production-only failures are usually about data, concurrency or limits rather than logic — and the fix should include making the *next* one easier to see. An incident that ends without improving observability will be repeated. Lessons 14.3 and 14.9 cover this in depth." }
        ],
        weak: "\"Add print statements and redeploy.\" Each cycle costs a deployment, only reveals what you thought to print in advance, and the prints then either ship or get forgotten."
      }
    ]
  }
});

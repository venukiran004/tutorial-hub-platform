/* ============================================================================
   LESSON 6.1 — Exceptions and the Exception Hierarchy
   ========================================================================= */
EC.receiveLesson({
  id: "6.1",

  lede: "An exception is not an error message. It is a second return channel: a value that travels back up the call stack, discarding frames until something claims it. Which handler claims it is decided entirely by the class hierarchy — which makes **the built-in exception tree an API you write code against**, not trivia. And because that tree deliberately puts `KeyboardInterrupt` outside `Exception`, `except Exception` is a decision about where your boundaries are, not a default.",

  objectives: [
    "Trace an exception through the call stack and name the frame where propagation stops",
    "Place any built-in exception in the hierarchy and predict which `except` clause catches it",
    "Explain why `SystemExit` and `KeyboardInterrupt` sit outside `Exception`, and what breaks when you ignore that",
    "Choose between catching narrowly, catching at a boundary, and not catching at all",
    "Diagnose a handler that catches too much and one that catches too little"
  ],

  prerequisites: ["1.9", "3.1"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "What raising actually does", id: "raising" },

    {"kind": "layers", "title": "raise unwinds the stack until a handler matches", "caption": "Each frame is checked for a try/except that matches the exception's type; frames without one are discarded on the way up. If nothing matches, the interpreter prints the traceback and exits.", "taper": true, "items": [{"label": "parse()  raises ValueError", "sub": "no handler here", "tone": "crit"}, {"label": "load()  no matching except", "sub": "frame discarded", "tone": "warn"}, {"label": "main()  except ValueError:", "sub": "caught here — execution continues after the try", "tone": "good"}, {"label": "the interpreter", "sub": "would print the traceback if nothing had caught it"}], "t": "diagram", "id": "dg-6_1-01-0"},


    { t: "p", text: "`raise` does two things. It creates (or takes) an exception **instance**, and it abandons the current expression. Python then walks back up the call stack looking for a `try` whose `except` matches. Every frame it passes is discarded — its local variables are gone — until a handler claims the exception or the stack runs out." },

    { t: "code", lang: "python", title: "three frames, one handler", code: `
def parse_row(row: dict) -> int:
    return int(row["quantity"])          # raises KeyError if absent


def process_batch(rows: list[dict]) -> int:
    return sum(parse_row(r) for r in rows)


def main() -> None:
    rows = [{"quantity": "2"}, {"qty": "3"}]
    try:
        total = process_batch(rows)
    except KeyError as exc:
        print(f"missing column: {exc.args[0]!r}")
    else:
        print(f"total {total}")


main()
`,
      out: `missing column: 'quantity'`,
      caption: "`parse_row` raised. Neither `parse_row` nor `process_batch` had a handler, so both frames were unwound and destroyed. `main` had one, so propagation stopped there and execution continued after the `try` statement — not after the `raise`."
    },

    { t: "viz",
      title: "Propagation is a search for a handler, upwards",
      caption: "Python does not resume where the exception was raised. It unwinds — every frame between the raise and the handler is destroyed, along with everything in it. That is why cleanup has to be attached to the frame that owns the resource (Lesson 6.2), and why a traceback lists exactly those discarded frames.",
      svg: `<svg viewBox="0 0 900 330" role="img" aria-label="Diagram: a KeyError raised in the innermost frame propagating up through two frames without handlers to a matching except clause in main">
  <defs>
    <marker id="e61a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--crit)"/>
    </marker>
  </defs>

  <text x="20" y="22" class="s-sub" style="font-weight:700;letter-spacing:.08em">CALL STACK — OUTERMOST AT THE TOP</text>

  <rect x="20" y="36" width="470" height="52" rx="7" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1.5"/>
  <text x="34" y="56" class="s-mono" style="font-size:10.5px">main()</text>
  <text x="34" y="76" class="s-mono" style="font-size:10px">try: ... except KeyError as exc:</text>
  <text x="510" y="60" class="s-sub" style="fill:var(--good);font-weight:600">MATCH — propagation stops</text>
  <text x="510" y="78" class="s-sub">execution resumes after the try statement</text>

  <rect x="20" y="106" width="470" height="52" rx="7" class="s-fill-2 s-stroke" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="34" y="126" class="s-mono" style="font-size:10.5px">process_batch(rows)</text>
  <text x="34" y="146" class="s-mono" style="font-size:10px;fill:var(--ink-3)">no try -- frame discarded, locals gone</text>
  <text x="510" y="136" class="s-sub">appears in the traceback, cannot handle</text>

  <rect x="20" y="176" width="470" height="52" rx="7" class="s-fill-2 s-stroke" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="34" y="196" class="s-mono" style="font-size:10.5px">parse_row(row)</text>
  <text x="34" y="216" class="s-mono" style="font-size:10px;fill:var(--ink-3)">no try -- frame discarded, locals gone</text>
  <text x="510" y="206" class="s-sub">where the failing line lives</text>

  <rect x="20" y="246" width="470" height="34" rx="7" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1.5"/>
  <text x="34" y="268" class="s-mono" style="font-size:10.5px;fill:var(--crit)">raise KeyError('quantity')</text>
  <text x="510" y="268" class="s-sub" style="fill:var(--crit)">an instance is created here</text>

  <path d="M700 258 L700 200" style="stroke:var(--crit);fill:none" stroke-width="2" marker-end="url(#e61a)"/>
  <path d="M700 190 L700 130" style="stroke:var(--crit);fill:none" stroke-width="2" marker-end="url(#e61a)"/>
  <path d="M700 120 L700 70" style="stroke:var(--crit);fill:none" stroke-width="2" marker-end="url(#e61a)"/>
  <text x="716" y="160" class="s-sub" style="fill:var(--crit);font-weight:600">unwind</text>

  <text x="20" y="308" class="s-sub" style="fill:var(--ink-2)">No handler anywhere? sys.excepthook prints the traceback to stderr and the process exits with status 1.</text>
</svg>`
    },

    { t: "dl", items: [
      ["Raise", "Build an exception instance and start propagation. `raise KeyError(\"x\")` and `raise KeyError` are both legal — the second instantiates for you with no arguments."],
      ["Propagate / unwind", "Walk up the stack, destroying frames, until a matching `except` is found. Each destroyed frame is one entry in the traceback (Lesson 1.9)."],
      ["Handle", "The first matching `except` clause runs. Execution then continues **after the whole `try` statement**, not after the line that raised."],
      ["Unhandled", "The stack runs out. `sys.excepthook` prints the traceback to `stderr` and the interpreter exits with status 1 — which is what makes a failing script fail a CI step."]
    ]},

    { t: "callout", kind: "mental", title: "Every function has two exits", body: [
      { t: "p", text: "A signature documents one of them. `def charge(order: Order) -> Receipt` says what comes back on success and says nothing about the `PaymentDeclined` that can come back instead — even though the caller must handle both to be correct." },
      { t: "p", text: "This is why exceptions are part of your public interface. Changing which exception a function raises is a breaking change as surely as changing its return type, and no type checker will catch it: `mypy` does not track raises. A docstring and a deliberate hierarchy (Lesson 6.3) are how the second exit gets documented." },
      { t: "p", text: "The corollary is a design rule: **raise for conditions the caller cannot see coming, return for outcomes the caller is asking about.** A missing key in a lookup helper is a question — `dict.get` returns `None`. A malformed payment amount is not a question, and it raises." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "The hierarchy is an API", id: "hierarchy",
      sub: "An except clause is an isinstance check, so every base class in the tree is a catch group somebody designed for you." },

    {"kind": "tree", "title": "The hierarchy is an API", "caption": "Catching a class catches every subclass. except Exception catches almost everything; except BaseException also catches KeyboardInterrupt and SystemExit, which is almost never what you want.", "root": {"label": "BaseException", "tone": "crit", "children": [{"label": "SystemExit"}, {"label": "KeyboardInterrupt"}, {"label": "Exception", "tone": "accent", "children": [{"label": "ValueError", "tone": "good", "children": [{"label": "UnicodeError"}]}, {"label": "LookupError", "children": [{"label": "KeyError"}, {"label": "IndexError"}]}, {"label": "OSError", "tone": "warn", "children": [{"label": "FileNotFoundError"}]}]}]}, "t": "diagram", "id": "dg-6_1-02-1"},


    { t: "viz",
      title: "The part of the built-in tree you actually use",
      caption: "The split at the top is the load-bearing one: `SystemExit`, `KeyboardInterrupt` and `GeneratorExit` are siblings of `Exception`, not children, precisely so that `except Exception` cannot swallow a shutdown request. Everything below `Exception` is a failure your code might sensibly recover from.",
      svg: `<svg viewBox="0 0 900 340" role="img" aria-label="Diagram: the built-in exception hierarchy from BaseException down through Exception to LookupError, OSError, ValueError, TypeError, ArithmeticError and RuntimeError with their common subclasses">
  <text x="20" y="20" class="s-sub" style="font-weight:700;letter-spacing:.08em">BUILT-IN EXCEPTION TREE</text>

  <rect x="355" y="32" width="190" height="30" rx="7" class="s-fill s-stroke" stroke-width="1.2"/>
  <text x="450" y="52" text-anchor="middle" class="s-mono" style="font-size:11px">BaseException</text>

  <path d="M450 62 L450 80 M100 80 L680 80 M100 80 L100 98 M272 80 L272 98 M445 80 L445 98 M680 80 L680 98" style="stroke:var(--border-strong);fill:none" stroke-width="1.2"/>

  <rect x="30" y="98" width="140" height="28" rx="6" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1.2"/>
  <text x="100" y="117" text-anchor="middle" class="s-mono" style="font-size:9.5px">SystemExit</text>

  <rect x="185" y="98" width="175" height="28" rx="6" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1.2"/>
  <text x="272" y="117" text-anchor="middle" class="s-mono" style="font-size:9.5px">KeyboardInterrupt</text>

  <rect x="375" y="98" width="140" height="28" rx="6" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1.2"/>
  <text x="445" y="117" text-anchor="middle" class="s-mono" style="font-size:9.5px">GeneratorExit</text>

  <rect x="600" y="98" width="160" height="28" rx="6" style="fill:var(--accent-soft);stroke:var(--accent)" stroke-width="1.6"/>
  <text x="680" y="117" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent-ink)">Exception</text>

  <text x="30" y="143" class="s-sub" style="fill:var(--warn)">not errors — instructions to stop. Never caught by except Exception.</text>
  <text x="600" y="143" class="s-sub" style="fill:var(--accent-ink)">everything else</text>

  <path d="M680 126 L680 156 M75 156 L825 156 M75 156 L75 172 M225 156 L225 172 M375 156 L375 172 M525 156 L525 172 M675 156 L675 172 M825 156 L825 172" style="stroke:var(--border-strong);fill:none" stroke-width="1.2"/>

  <rect x="20" y="172" width="110" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="75" y="190" text-anchor="middle" class="s-mono" style="font-size:9.5px">LookupError</text>
  <text x="20" y="216" class="s-mono" style="font-size:9px">KeyError</text>
  <text x="20" y="230" class="s-mono" style="font-size:9px">IndexError</text>

  <rect x="170" y="172" width="110" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="225" y="190" text-anchor="middle" class="s-mono" style="font-size:9.5px">OSError</text>
  <text x="170" y="216" class="s-mono" style="font-size:9px">FileNotFoundError</text>
  <text x="170" y="230" class="s-mono" style="font-size:9px">PermissionError</text>
  <text x="170" y="244" class="s-mono" style="font-size:9px">TimeoutError</text>
  <text x="170" y="258" class="s-mono" style="font-size:9px">ConnectionError</text>

  <rect x="320" y="172" width="110" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="375" y="190" text-anchor="middle" class="s-mono" style="font-size:9.5px">ValueError</text>
  <text x="320" y="216" class="s-mono" style="font-size:9px">UnicodeDecodeError</text>

  <rect x="470" y="172" width="110" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="525" y="190" text-anchor="middle" class="s-mono" style="font-size:9.5px">TypeError</text>
  <text x="470" y="216" class="s-sub" style="font-size:9px">no subclass worth catching</text>

  <rect x="620" y="172" width="110" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="675" y="190" text-anchor="middle" class="s-mono" style="font-size:9.5px">ArithmeticError</text>
  <text x="620" y="216" class="s-mono" style="font-size:9px">ZeroDivisionError</text>
  <text x="620" y="230" class="s-mono" style="font-size:9px">OverflowError</text>

  <rect x="770" y="172" width="110" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="825" y="190" text-anchor="middle" class="s-mono" style="font-size:9.5px">RuntimeError</text>
  <text x="770" y="216" class="s-mono" style="font-size:9px">RecursionError</text>

  <text x="20" y="292" class="s-sub" style="fill:var(--ink-2)">Also direct children of Exception: AttributeError, NameError, ImportError (and ModuleNotFoundError), StopIteration, AssertionError.</text>
  <text x="20" y="312" class="s-sub" style="fill:var(--ink-2)">Catching a base catches every descendant. That is the whole mechanism.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "catching a base class catches the family", code: `
from pathlib import Path

data = {"a": 1}
items = [10, 20]

# One clause for both, because KeyError and IndexError share a base:
for get in (lambda: data["b"], lambda: items[7]):
    try:
        get()
    except LookupError as exc:
        print(f"{type(exc).__name__}: {exc}")

# Filesystem and network failures share OSError:
try:
    Path("/etc/shadow").read_text()
except PermissionError:
    print("no permission")            # a subclass of OSError
except OSError as exc:
    print(f"other os error: {exc.errno}")
`,
      out: `KeyError: 'b'
IndexError: list index out of range
no permission`,
      caption: "The narrower clause must come first — clauses are tested in order, and `except OSError` above `except PermissionError` would make the second unreachable."
    },

    { t: "table",
      head: ["Base class", "Catches", "Use it when"],
      rows: [
        ["`LookupError`", "`KeyError`, `IndexError`", "You are indexing data of unknown shape and either failure means the same thing"],
        ["`OSError`", "`FileNotFoundError`, `PermissionError`, `TimeoutError`, `ConnectionError`, `IsADirectoryError` and the rest", "Any I/O boundary: files, sockets, subprocesses"],
        ["`ArithmeticError`", "`ZeroDivisionError`, `OverflowError`, `FloatingPointError`", "Rarely — usually you want `ZeroDivisionError` alone"],
        ["`ValueError`", "`UnicodeDecodeError`, and most parsing and conversion failures", "Handling untrusted input (Lesson 1.8)"],
        ["`Exception`", "Everything except `SystemExit`, `KeyboardInterrupt`, `GeneratorExit`", "**Only at a boundary** — see section 04"],
        ["`BaseException`", "Literally everything", "Almost never: instrumentation that re-raises immediately, and nothing else"]
      ]
    },

    { t: "callout", kind: "insight", title: "The tree changed, in your favour", body: [
      { t: "ul", items: [
        "**`IOError`, `EnvironmentError`, `WindowsError` and `socket.error` are all aliases of `OSError`** since Python 3.3. Code catching `IOError` still works, but writing it today signals you learned Python 2.",
        "**`socket.timeout` became an alias of the built-in `TimeoutError`** in 3.10, and `asyncio.TimeoutError` in 3.11. One `except TimeoutError` now covers sockets, `asyncio.wait_for` and `subprocess.run(timeout=...)`. Third-party clients still define their own — `httpx.TimeoutException` is not a `TimeoutError` — which is exactly why boundaries translate exceptions (Lesson 6.3).",
        "**`ModuleNotFoundError`** (3.6+) subclasses `ImportError`, so optional-dependency handling can distinguish *not installed* from *installed but broken*.",
        "**`ExceptionGroup`** (3.11+) carries several unrelated exceptions at once, which is what concurrent code needs. It subclasses `Exception`, so a boundary's `except Exception` catches the whole group as one object."
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Which clause wins, and what happens to the name", id: "matching" },

    { t: "code", lang: "python", title: "first match wins, top to bottom", code: `
def classify(fn):
    try:
        fn()
    except ZeroDivisionError:
        return "zero division"
    except ArithmeticError:
        return "other arithmetic"       # reachable: OverflowError lands here
    except (ValueError, TypeError) as exc:
        return f"bad input: {type(exc).__name__}"


print(classify(lambda: 1 / 0))
print(classify(lambda: int("x")))
print(classify(lambda: None + 1))
`,
      out: `zero division
bad input: ValueError
bad input: TypeError`,
      caption: "A tuple of classes in one clause is right when the handling is identical. Use separate clauses when the handling differs — resist catching a tuple and then branching on `type(exc)` inside the handler."
    },

    { t: "callout", kind: "trap", title: "The exception name is deleted when the block ends", body: [
      { t: "p", text: "`except ValueError as exc` binds `exc` for the duration of the block and then **deletes it** — Python compiles an implicit `del exc` into a `finally`. Referencing it afterwards raises `NameError`, which surprises everyone exactly once." },
      { t: "code", lang: "python", title: "the surprise, and the fix", numbered: false, code: `
error = None
try:
    int("nope")
except ValueError as exc:
    print(exc)                 # fine, inside the block
    error = exc                # keep it deliberately

print(exc)                     # NameError: name 'exc' is not defined
print(error)                   # works -- your own name, not the clause's`,
        out: `invalid literal for int() with base 10: 'nope'
Traceback (most recent call last):
  File "/app/x.py", line 8, in <module>
    print(exc)
NameError: name 'exc' is not defined`},
      { t: "p", text: "**Why it works this way:** the exception references its traceback, the traceback references every frame, and each frame references its locals — including `exc`. That is a reference cycle keeping whole call stacks alive. Deleting the name at the end of the block breaks it. Assigning to your own variable opts you back into holding that memory, which is fine for the few lines it takes to log or re-raise." }
    ]},

    { t: "code", lang: "python", title: "what you can read off an exception instance", code: `
try:
    {"order": 1}["customer"]
except KeyError as exc:
    print(type(exc).__name__)     # the class -- often the most useful fact
    print(exc.args)               # the constructor arguments, as a tuple
    print(str(exc))               # the message; for KeyError, just the key
    print(repr(exc))
    print(exc.__traceback__ is not None)
`,
      out: `KeyError
('customer',)
customer
KeyError('customer')
True`,
      caption: "`str(exc)` on a `KeyError` is the bare key with no explanation — one reason a log line must include the class name and your own context, never only `str(exc)` (Lesson 6.4)."
    },

    /* ================================================================== */
    { t: "h2", n: "04", text: "Catching Exception is a decision", id: "breadth" },

    { t: "p", text: "There are three places where a broad `except Exception` is correct, and they share one property: **the code has somewhere sensible to put the failure.**" },

    { t: "ol", items: [
      "**A process boundary.** A request handler, a queue consumer's per-message loop, a CLI's `main`. One failed request must not kill the worker — so you catch, log with the traceback, return a 500 or dead-letter the message, and continue.",
      "**An isolation boundary.** You are calling code you do not control: a plugin, a user-supplied callback, a metrics hook. Its failure must not become your failure.",
      "**A retry or instrumentation boundary**, where you catch, do one specific thing, and **re-raise** — a counter, a compensating write, a circuit breaker (Lesson 6.5)."
    ]},

    { t: "p", text: "Anywhere else, a broad catch converts a loud bug into a quiet wrong answer. The test is blunt: if the handler cannot say what it will *do* about the failure, it should not exist." },

    { t: "ladder",
      title: "Handling one flaky HTTP call, three ways",
      rungs: [
        { level: "bad", label: "Catch everything, return a lie", why: "silences bugs, corrupts data",
          code: `
def fetch_rate(currency: str) -> float:
    try:
        response = httpx.get(f"https://fx.example.com/{currency}", timeout=2)
        return response.json()["rate"]
    except Exception:
        return 1.0            # "sensible default"
`,
          note: "A typo in the URL, a renamed JSON field, a schema change and a genuine network timeout all produce the same silent 1.0. Every downstream figure is now wrong and nothing is logged anywhere. This is worse than an outage, because an outage is visible."
        },
        { level: "ok", label: "Catch the class of failure you expect", why: "loud on bugs, quiet on transients",
          code: `
def fetch_rate(currency: str) -> float:
    try:
        response = httpx.get(f"https://fx.example.com/{currency}", timeout=2)
        response.raise_for_status()
        return response.json()["rate"]
    except httpx.HTTPError as exc:
        logger.warning("fx lookup failed for %s: %s", currency, exc)
        raise
`,
          note: "Only transport and status failures are caught. A KeyError from a changed payload now propagates as the bug it is. The log line adds the currency, which str(exc) would never have told you."
        },
        { level: "best", label: "Translate at the boundary, decide at the top", why: "callers can act on the type",
          code: `
class RateUnavailable(Exception):
    """The FX rate could not be obtained. Retrying may succeed."""


def fetch_rate(currency: str) -> Decimal:
    try:
        response = httpx.get(f"https://fx.example.com/{currency}", timeout=2)
        response.raise_for_status()
        return Decimal(str(response.json()["rate"]))
    except httpx.HTTPError as exc:
        raise RateUnavailable(currency) from exc


# ... and once, at the process boundary:
def handle_message(msg: Message) -> None:
    try:
        convert(msg)
    except RateUnavailable as exc:
        logger.warning("deferring %s: %s", msg.id, exc)
        msg.retry_later()
    except Exception:
        logger.exception("unhandled failure on %s", msg.id)   # traceback included
        msg.dead_letter()
`,
          note: "Two catches, two different actions, and the broad one only where a decision actually exists. logger.exception records the traceback, so the dead-lettered message is diagnosable -- the difference between an alert you can act on and one you can only acknowledge."
        }
      ]
    },

    { t: "callout", kind: "trap", title: "A bare except: swallows Ctrl-C and shutdown", body: [
      { t: "p", text: "`except:` with no class catches `BaseException` — including `KeyboardInterrupt` and `SystemExit`. In a loop, the effect is that your program cannot be stopped." },
      { t: "code", lang: "python", title: "an unkillable worker", numbered: false, code: `
while True:
    try:
        poll_and_process()
    except:                  # BaseException -- catches SIGINT and sys.exit()
        continue             # Ctrl-C is discarded; the loop runs forever
`},
      { t: "p", text: "**The mechanism:** `sys.exit()` raises `SystemExit` and Ctrl-C raises `KeyboardInterrupt`, both deriving from `BaseException` rather than `Exception` **specifically so that ordinary error handling does not intercept them.** A bare `except:` throws that design away. `except Exception:` — the one-word fix — keeps the escape hatch open." },
      { t: "p", text: "Linters flag this as `E722` / `BLE001`. Turn the rule on and leave it on; the only defensible bare `except:` re-raises immediately." }
    ]},

    { t: "table",
      head: ["You want to...", "Write"],
      rows: [
        ["Handle one known failure", "`except FileNotFoundError:`"],
        ["Handle two failures identically", "`except (ValueError, TypeError):`"],
        ["Handle a family of I/O failures", "`except OSError:`"],
        ["Keep a worker alive across bad messages", "`except Exception:` — at the loop boundary only, with `logger.exception`"],
        ["Add behaviour to every failure, then get out of the way", "`except Exception: ...` followed by a bare `raise`"],
        ["Ignore a failure you have genuinely reasoned about", "`contextlib.suppress(FileNotFoundError)` — narrow, and visible in the code"],
        ["Stop on Ctrl-C", "Never catch `KeyboardInterrupt` in a loop; let it out"]
      ]
    },

    { t: "callout", kind: "insight", title: "Exception groups, in one minute", body: [
      { t: "p", text: "When ten tasks run concurrently, three can fail for three different reasons. A single exception cannot express that, so 3.11 added `ExceptionGroup` and the `except*` clause, which filters a group by type." },
      { t: "code", lang: "python", title: "except* handles by type, not by first match", numbered: false, code: `
try:
    async with asyncio.TaskGroup() as tg:      # raises ExceptionGroup
        tg.create_task(fetch("a"))
        tg.create_task(fetch("b"))
except* TimeoutError as eg:
    logger.warning("%d timed out", len(eg.exceptions))
except* PermissionError as eg:
    logger.error("%d denied", len(eg.exceptions))`},
      { t: "p", text: "Unlike `except`, **every matching `except*` clause runs** — a group containing both a timeout and a permission error triggers both handlers. Plain `except Exception` still catches the whole group as one object, which is usually what a boundary handler wants. Lesson 11.6 covers the concurrency side." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Predict the handler, then fix the worker",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "Two halves. First, work out which clause claims each exception — on paper, because the hierarchy is what you are learning, not the syntax. Then repair a worker loop that has three of this lesson's mistakes at once." },
        { t: "code", lang: "python", title: "part 1 — which clause runs?", code: `
def handle(fn):
    try:
        fn()
    except LookupError:
        return "A: LookupError"
    except OSError:
        return "B: OSError"
    except ValueError:
        return "C: ValueError"
    except Exception:
        return "D: Exception"
    return "E: no exception"


# Predict the result of each call:
handle(lambda: {"a": 1}["b"])
handle(lambda: open("/nonexistent/path"))
handle(lambda: int("twelve"))
handle(lambda: "abc".encode("ascii").decode("utf-16"))
handle(lambda: sys.exit(3))
handle(lambda: [1, 2][5])
`},
        { t: "code", lang: "python", title: "part 2 — repair this worker", code: `
def run_worker(queue):
    while True:
        try:
            message = queue.poll(timeout=5)
            if message is None:
                continue
            process(message)
            queue.ack(message)
        except:
            print("something went wrong")
`}
      ],
      requirements: [
        "**Part 1:** give the letter for all six calls, and for any that surprise you, name the base class that explains it.",
        "**Part 2:** the loop must exit on Ctrl-C and on `SystemExit`, promptly and with the right exit status.",
        "A transient failure (`ConnectionError`, `TimeoutError`) is logged at WARNING and the message goes back to the queue for redelivery — not acked.",
        "A message that can never succeed (`ValueError` from a malformed payload) is dead-lettered, not retried forever.",
        "Any other exception is logged **with its traceback**, then dead-lettered — and the worker keeps running.",
        "`queue.ack` runs only when `process` succeeded. No `print` anywhere.",
        "State in a comment why the broad clause is defensible in this particular place."
      ],
      hint: "For part 1, ask what `UnicodeDecodeError` and `FileNotFoundError` inherit from — and remember clauses are tested in order. For part 2, the clause ordering is the whole design: narrowest first, `Exception` last, and nothing catching `BaseException`.",
      solution: {
        lang: "python",
        title: "worker.py",
        code: `# =====================================================================
# PART 1 -- answers
# =====================================================================
# {"a": 1}["b"]                 -> A   KeyError is a LookupError
# open("/nonexistent/path")     -> B   FileNotFoundError is an OSError
# int("twelve")                 -> C   ValueError, directly
# "abc".encode().decode("utf-16")
#                               -> C   UnicodeDecodeError subclasses
#                                      ValueError. This is the one that
#                                      surprises people: a decoding failure
#                                      is a value problem, not an OS problem.
# sys.exit(3)                   -> none of them. SystemExit derives from
#                                      BaseException, so it passes through
#                                      every clause here and exits the
#                                      process with status 3.
# [1, 2][5]                     -> A   IndexError is a LookupError
#
# Two of the six are decided by a base class you did not name, and one by
# not being an Exception at all.


# =====================================================================
# PART 2 -- the repaired worker
# =====================================================================
import logging

logger = logging.getLogger(__name__)

TRANSIENT = (ConnectionError, TimeoutError)      # both OSError subclasses


def run_worker(queue) -> None:
    """Consume messages until interrupted. One bad message never stops us."""
    while True:
        message = None
        try:
            message = queue.poll(timeout=5)
            if message is None:
                continue                          # idle poll, not a failure
            process(message)

        except TRANSIENT as exc:
            # The dependency is unhappy; the message is probably fine.
            # Do NOT ack -- redelivery is the retry mechanism.
            logger.warning(
                "transient failure on %s: %s", getattr(message, "id", "-"), exc
            )
            if message is not None:
                queue.nack(message)

        except ValueError as exc:
            # Malformed payload. Redelivery cannot help: the same bytes will
            # fail the same way forever, and a poison message can block a
            # partition indefinitely.
            logger.error("unprocessable %s: %s", message.id, exc)
            queue.dead_letter(message)

        except Exception:
            # Defensible here and nowhere else: this is the process
            # boundary. One unknown bug must not take the consumer down,
            # and we have somewhere to put the failure (the dead-letter
            # queue) and somewhere to report it (an ERROR with a
            # traceback). logger.exception attaches exc_info -- without it
            # we would know that something failed and nothing about where.
            logger.exception("unhandled failure on %s", getattr(message, "id", "-"))
            if message is not None:
                queue.dead_letter(message)

        else:
            # Only reached when process() returned normally, which is the
            # only state in which acking is honest.
            queue.ack(message)


# KeyboardInterrupt and SystemExit are caught nowhere above, so Ctrl-C
# unwinds out of run_worker and out of main. Cleanup on the way out is
# finally's job (Lesson 6.2), not an except clause's:
def main() -> None:
    queue = connect()
    try:
        run_worker(queue)
    finally:
        queue.close()          # runs on success, on error, and on Ctrl-C`,
        notes: [
          { t: "p", text: "**The clause order is the design.** Transient before `ValueError` before `Exception`, narrowest first, because the first match wins. Reversing any pair silently disables a handler — at runtime, with no warning from any tool." },
          { t: "p", text: "**`ack` lives in `else`, not at the end of `try`.** Inside the `try` it would be within the protected region, so a `ConnectionError` raised by `ack` itself would be handled as though `process` had failed, and a message that was already processed would be redelivered. The `else` clause exists to keep the success path out of the protected region (Lesson 6.2)." },
          { t: "p", text: "**Transient and permanent failures get opposite treatment**, and telling them apart is the actual engineering. Redelivering a malformed payload creates a poison message that can consume a partition forever; dead-lettering a network blip throws away good work. The exception type is the signal, which is why translating third-party errors into your own retryable and terminal classes (Lesson 6.3) pays for itself." },
          { t: "callout", kind: "insight", title: "Why nothing catches BaseException", body: [
            { t: "p", text: "During a rolling deploy the orchestrator sends `SIGTERM` and waits — 30 seconds by default in Kubernetes — before `SIGKILL`. A worker whose signal handler raises `SystemExit` shuts down cleanly inside that window, finishing the message in flight. A worker that catches `BaseException` and continues ignores the request, burns the grace period, gets `SIGKILL`ed, and loses whatever it was doing." },
            { t: "p", text: "That is also why the `finally` in `main` matters more than it looks: it is the one thing that still runs while `KeyboardInterrupt` or `SystemExit` is propagating." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A payments team's queue consumer starts failing its deploys. Every rollout stalls: pods sit in `Terminating` for the full 30-second grace period, then die, and each deploy loses a handful of in-flight payments that have to be reconciled by hand. Nothing in the logs explains it — the last line from each pod is a cheerful `something went wrong`." },
      { t: "p", text: "**The mechanism is one character.** The consumer's loop used `except:` rather than `except Exception:`. The service installs a `SIGTERM` handler that calls `sys.exit(0)` for graceful shutdown, which raises `SystemExit` — a `BaseException`. The bare clause caught it, printed `something went wrong`, and went back to polling. The shutdown request was not lost or delayed; it was *handled*, as though it were an error." },
      { t: "p", text: "**The fix is `except Exception:`**, plus `logger.exception` in place of the `print` so the next surprise arrives with a traceback attached. The reconciliation backlog stopped that afternoon." },
      { t: "p", text: "**The general point:** the split between `BaseException` and `Exception` is not taxonomy for its own sake. It is a contract that says *these three are not errors, they are instructions* — and the language relies on you not intercepting them. Every linter ships a rule for this because the failure it prevents is invisible until the day it costs money." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**An exception is a second return channel.** It travels up the stack destroying frames until a matching handler claims it — so cleanup must be attached to the frame that owns the resource, not to the caller.",
    "Execution resumes **after the whole `try` statement**, never after the line that raised. Nothing between the `raise` and the handler runs.",
    "An `except` clause is an `isinstance` check, which makes every base class a catch group: `LookupError` covers `KeyError` and `IndexError`, `OSError` covers the entire filesystem-and-network family.",
    "**`SystemExit`, `KeyboardInterrupt` and `GeneratorExit` derive from `BaseException`, not `Exception`** — deliberately, so ordinary error handling cannot swallow a shutdown request.",
    "**A bare `except:` catches `BaseException`** and makes a loop unstoppable: Ctrl-C and `sys.exit()` are discarded. `except Exception:` is the one-word fix, and linters enforce it as `E722`.",
    "Clauses are tested top to bottom and the first match wins, so a broad clause above a narrow one silently turns the narrow one into dead code.",
    "`except ... as exc` deletes `exc` when the block ends, breaking the exception → traceback → frame → locals reference cycle. Bind your own name if you need it afterwards.",
    "**`except Exception` is correct only where the code has somewhere to put the failure**: a process boundary, an isolation boundary, or a catch that re-raises. Elsewhere it turns a loud bug into a quiet wrong answer.",
    "Log broad catches with `logger.exception`, not `str(exc)` — the class and traceback carry the diagnosis, and `str(KeyError('customer'))` is one word.",
    "`socket.timeout`, `asyncio.TimeoutError`, `IOError` and `EnvironmentError` are now aliases of built-ins, but third-party clients still define their own — which is why boundaries translate exception types.",
    "**Which exception a function raises is part of its public API**, and no type checker enforces it. Document it and design it (Lesson 6.3)."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A worker loop uses `except:` with no exception class. What is the practical consequence?",
        options: [
          "It behaves identically to `except Exception:` but is less readable",
          "It catches `BaseException`, so Ctrl-C and `sys.exit()` are swallowed and the loop cannot be stopped",
          "It catches only exceptions defined in the standard library",
          "It re-raises anything it cannot handle"
        ],
        answer: 1,
        why: "A bare `except:` matches `BaseException`, which includes `KeyboardInterrupt` and `SystemExit`. Those derive from `BaseException` rather than `Exception` precisely so error handling does not intercept them, so the bare form defeats the design: Ctrl-C is discarded locally, and a `SIGTERM` handler calling `sys.exit()` is discarded in production, costing you the graceful-shutdown window. It is therefore not equivalent to `except Exception:` — that difference is the whole point — and nothing about it re-raises or limits itself to stdlib types."
      },
      {
        stem: "Which single `except` clause catches both a missing dictionary key and an out-of-range list index?",
        options: [
          "`except ValueError:`",
          "`except LookupError:`",
          "`except IndexError:`",
          "`except RuntimeError:`"
        ],
        answer: 1,
        why: "`KeyError` and `IndexError` both derive from `LookupError`, and an `except` clause is an `isinstance` check against the named class and all its descendants. `IndexError` alone misses the `KeyError`; `ValueError` is the base for parsing and conversion failures such as `UnicodeDecodeError`, not for lookups; `RuntimeError` is an unrelated branch whose main descendant is `RecursionError`. Knowing the intermediate bases is what lets you write one clause instead of a tuple of two."
      },
      {
        stem: "A `try` statement lists `except Exception:` first and `except ValueError:` second. What happens when a `ValueError` is raised?",
        options: [
          "Both handlers run, in order",
          "The `ValueError` handler runs, because it is more specific",
          "The `Exception` handler runs, and the `ValueError` clause can never execute",
          "Python raises a `SyntaxError` for the unreachable clause"
        ],
        answer: 2,
        why: "Clauses are tested top to bottom and the first match wins — there is no specificity ranking as in some other languages — so the broad clause claims the `ValueError` and the clause below it is dead code for every exception. Only one clause ever runs per exception, so \"both\" is wrong (that is `except*` behaviour with exception groups). Python does not diagnose the unreachable clause either: it is valid syntax and raises nothing, which is why linters check clause ordering for you."
      },
      {
        stem: "Why does `except ValueError as exc:` leave `exc` undefined after the block ends?",
        options: [
          "Because `as` bindings are block-scoped, like a variable in a comprehension",
          "Because the exception object is garbage-collected the moment the block exits",
          "Because Python compiles in an implicit `del exc` to break the exception → traceback → frame → locals reference cycle",
          "Because only the last raised exception is kept, in `sys.last_value`"
        ],
        answer: 2,
        why: "The exception references its traceback, the traceback references every frame, and each frame references its locals — which include `exc` itself. That cycle would keep whole call stacks alive, so the clause is compiled with an implicit `del exc` in a `finally`. The name is an ordinary function-scoped local, not a block-scoped one, which is exactly why the deletion has to be explicit; and the object is not collected at all if you bound it to another name first, which is the standard workaround. `sys.last_value` is set only for unhandled exceptions in the REPL."
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
        q: "Why should you not write `except Exception` everywhere?",
        strong: "Because a broad catch converts a loud bug into a quiet wrong answer. It is right where the code has somewhere to put the failure — a request handler, a queue loop, a plugin call — and where it can log with the traceback and take a decision. In the middle of business logic there is no decision to take, so the exception should propagate.",
        answer: [
          { t: "p", text: "The answer that lands names the *condition* rather than a rule: a broad handler is legitimate when there is a boundary and an action. \"Never catch broadly\" is as wrong as catching everywhere — every long-running process needs exactly one broad handler at its loop." },
          { t: "p", text: "Strengthen it with the failure mode. A `return 1.0` fallback in an FX lookup treats a renamed JSON field, a typo'd URL and a genuine timeout as the same event, and every downstream number is then wrong with nothing logged. An outage is visible; a silent wrong answer is not." },
          { t: "p", text: "If there is room, contrast `logger.exception` with `logger.error(str(exc))`. Broad catches are only defensible when the diagnostic survives, and `str(KeyError('customer'))` is the single word `customer`." }
        ],
        weak: "\"You should always catch specific exceptions.\" It sounds right and stops before the interesting part, which is where the boundaries go and what the handler does when it gets there."
      },
      {
        level: "core",
        q: "What is the difference between `BaseException` and `Exception`, and why does it exist?",
        strong: "`SystemExit`, `KeyboardInterrupt` and `GeneratorExit` derive from `BaseException` so that `except Exception` cannot catch them. They are not errors, they are instructions to stop. That split is what makes Ctrl-C and graceful shutdown reliable inside code that is full of error handling.",
        answer: [
          { t: "p", text: "The concrete consequence is the part to volunteer: a bare `except:` catches `BaseException`, so a poll loop written that way ignores `SIGTERM`, burns the whole termination grace period and is `SIGKILL`ed with work in flight." },
          { t: "p", text: "A good follow-up to pre-empt: what if you *do* need to run something on the way out? That is `finally`'s job, or a context manager — both still run while a `BaseException` propagates, without intercepting it." },
          { t: "p", text: "The one legitimate `BaseException` catch is instrumentation that re-raises immediately: count every outcome including interrupts, then a bare `raise`. Naming that exception to the rule shows you hold it as a mechanism rather than a superstition." }
        ]
      },
      {
        level: "advanced",
        q: "How do you decide what a library function should raise?",
        strong: "By asking what the caller could do differently. Distinguish failures that suggest different actions — retry, fix the input, give up — and give each its own class under one package base. Anything a caller would handle identically does not need a separate class.",
        answer: [
          { t: "p", text: "The framing that separates senior answers: exceptions are part of the signature. Changing which exception you raise is a breaking change for consumers, and no type checker will catch it — so the set of exception types is an interface decision, not an implementation detail." },
          { t: "p", text: "Two practical rules worth stating. Never let a third-party exception escape your module's surface: a caller of your payments client should not have to `import httpx` to handle a failure. And prefer raising over returning `None`, because `None` propagates silently into the next line and surfaces as `TypeError: 'NoneType' object is not subscriptable` three frames away (Lesson 1.9)." },
          { t: "p", text: "Mentioning the retryable-versus-terminal axis lands well, because that is the distinction real callers branch on — and it maps directly onto a queue's redeliver-versus-dead-letter decision. Lesson 6.3 covers designing the hierarchy, Lesson 6.5 the strategy." }
        ]
      },
      {
        level: "advanced",
        q: "What is `ExceptionGroup` for, and how is `except*` different from `except`?",
        strong: "It carries several unrelated failures at once, which is what concurrent code produces — ten tasks can fail for three different reasons. `except*` filters a group by type, and unlike `except`, every matching clause runs rather than only the first.",
        answer: [
          { t: "p", text: "The motivation is the useful half of the answer: before 3.11 a `TaskGroup`-shaped API had to pick one exception to raise and discard the rest, or wrap them in something no `except` clause could usefully match." },
          { t: "p", text: "Worth adding that `ExceptionGroup` subclasses `Exception`, so a boundary handler's `except Exception` still catches the whole group as one object — normally what you want at a process boundary, since it logs and dead-letters regardless of how many things went wrong." },
          { t: "p", text: "The honest caveat: outside `asyncio.TaskGroup` and the libraries that adopted it, you will rarely raise groups yourself. Knowing why they exist matters more than the syntax. Lesson 11.6 covers the concurrency context." }
        ]
      }
    ]
  }
});

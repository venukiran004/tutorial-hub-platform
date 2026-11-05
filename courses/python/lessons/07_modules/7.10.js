/* ============================================================================
   LESSON 7.10 — Building Command-Line Tools
   ========================================================================= */
EC.receiveLesson({
  id: "7.10",

  lede: "A command-line tool is a program whose callers are other programs: a shell script, a CI step, a cron job, the next command in a pipe. **None of those callers read your output the way a person does — they read the exit code, they read stdout as data, and they ignore stderr.** A tool that prints an error to stdout and exits 0 has told every one of them that it succeeded. This lesson is the contract a well-behaved tool keeps, and `argparse` is the smallest part of it.",

  objectives: [
    "State the three channels of a CLI's contract — exit code, stdout, stderr — and what belongs on each",
    "Build an `argparse` interface with subcommands, typed arguments, choices and stdin as `-`",
    "Structure a tool as `main(argv) -> int` so it can be tested without a subprocess",
    "Return the conventional exit codes, and handle a closed pipe and Ctrl-C without a traceback",
    "Choose between `argparse`, Click and Typer, and ship the tool as an entry point"
  ],

  prerequisites: ["7.5", "7.7"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The contract is three channels", id: "contract" },

    { t: "p", text: "Every process has the same three outputs, and the conventions for them are older than Python. **stdout carries the result**, the thing a pipe passes to the next command. **stderr carries messages for a human** — progress, warnings, errors — and is not captured by `|`. **The exit code carries success or failure**: zero is success, anything else is not, and a shell's `&&`, `set -e` and every CI system act on it without reading a word you printed." },

    {"t": "diagram", "kind": "flow", "title": "What each caller reads", "caption": "**A pipe reads only stdout, and a CI step decides only on the exit code.** So a warning on stdout corrupts the data the next command parses, and an error that exits 0 is a success as far as automation can tell. Keeping the channels separate is not tidiness; it is the interface.", "cols": 3, "nodes": [
      {"id": "in", "label": "argv + stdin", "sub": "what you are asked to do", "tone": "accent"},
      {"id": "p", "label": "your tool", "sub": "main(argv) -> int", "tone": "violet"},
      {"id": "out", "label": "stdout", "sub": "data, for the next program", "tone": "good"},
      {"id": "err", "label": "stderr", "sub": "messages, for a person", "tone": "warn"},
      {"id": "code", "label": "exit code", "sub": "0 or not, for automation", "tone": "crit"}
    ], "edges": [["in", "p"], ["p", "out"], ["p", "err"], ["p", "code"]]},

    { t: "table",
      head: ["Exit code", "Meaning", "Who returns it"],
      rows: [
        ["`0`", "Success", "You, when the work was done"],
        ["`1`", "The work failed", "You: a missing file, bad data, an upstream error"],
        ["`2`", "The command line was wrong", "`argparse`, automatically, on a usage error"],
        ["`130`", "Interrupted by Ctrl-C", "You, catching `KeyboardInterrupt` (128 + signal 2)"]
      ],
      caption: "Keep `2` for usage errors and you get it for free: `argparse` exits with it, which lets a wrapper script tell \"you called me wrong\" from \"the job failed\"." },

    /* ================================================================== */
    { t: "h2", n: "02", text: "A real tool, in one file", id: "tool" },

    { t: "p", text: "Here is `orders-report`, a small tool that totals an orders CSV per region. It is short enough to read in one sitting and has every property that matters: subcommands, typed arguments, a choice that `argparse` validates, stdin as `-`, data on stdout, messages on stderr, and a `main` that *returns* its exit code instead of calling `sys.exit` from deep inside." },

    { t: "code", lang: "python", title: "report.py", code: `"""orders-report: summarise an orders CSV."""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import TextIO


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="orders-report", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    summary = sub.add_parser("summary", help="totals per region")
    summary.add_argument("path", type=Path, help="CSV file, or - for stdin")
    summary.add_argument("--format", choices=["table", "json"], default="table")
    summary.add_argument("--min-total", type=Decimal, default=Decimal("0"))
    return parser


def summarise(rows: TextIO, min_total: Decimal) -> dict[str, Decimal]:
    totals: dict[str, Decimal] = defaultdict(Decimal)
    for line_no, row in enumerate(csv.DictReader(rows), start=2):
        try:
            total = Decimal(row["total"])
        except (InvalidOperation, KeyError) as exc:
            raise ValueError(f"line {line_no}: bad total {row.get('total')!r}") from exc
        if total >= min_total:
            totals[row["region"]] += total
    return dict(totals)


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if str(args.path) == "-":
            totals = summarise(sys.stdin, args.min_total)
        else:
            with args.path.open(encoding="utf-8", newline="") as f:
                totals = summarise(f, args.min_total)
    except FileNotFoundError:
        print(f"orders-report: no such file: {args.path}", file=sys.stderr)
        return 1
    except ValueError as exc:
        print(f"orders-report: {exc}", file=sys.stderr)
        return 1

    if args.format == "json":
        json.dump({k: str(v) for k, v in sorted(totals.items())}, sys.stdout)
        print()
    else:
        for region, total in sorted(totals.items()):
            print(f"{region:<6}{total:>10}")
    return 0


if __name__ == "__main__":
    sys.exit(main())` },

    { t: "p", text: "Run against a three-row file, each invocation shows a different part of the contract. Note which channel each line arrives on, and the exit code `argparse` chose for the bad `--format` without a line of your code:" },

    { t: "code", lang: "text", title: "six invocations", numbered: false, code: `$ orders-report summary orders.csv                    -> exit 0
eu         65.49
us        120.00

$ orders-report summary orders.csv --format json      -> exit 0
{"eu": "65.49", "us": "120.00"}

$ cat orders.csv | orders-report summary - --min-total 20   -> exit 0
eu         49.99
us        120.00

$ orders-report summary missing.csv                    -> exit 1
stderr: orders-report: no such file: missing.csv

$ orders-report summary orders.csv --format xml        -> exit 2
stderr: orders-report summary: error: argument --format: invalid choice: 'xml' (choose from 'table', 'json')

$ printf 'order_id,region,total\\n1,eu,abc\\n' | orders-report summary -   -> exit 1
stderr: orders-report: line 2: bad total 'abc'` },

    { t: "dl", items: [
      ["`type=`", "Converts and validates in one step. `type=Path` and `type=Decimal` mean the rest of the code never sees a string, and a value that does not convert is a usage error with exit code 2."],
      ["`choices=`", "A closed set the parser enforces and lists in `--help`. For an enum, `choices=list(Format)` with `type=Format` (Lesson 4.13)."],
      ["Subparsers", "One verb per job — `summary`, later `export` — each with its own arguments and help. `required=True` makes a bare `orders-report` a usage error rather than a silent no-op."],
      ["`-` for stdin", "The convention that lets a tool sit in the middle of a pipe. Checking for it explicitly keeps file and stream handling in one place."]
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Errors: the right channel and the right code", id: "errors" },

    { t: "p", text: "The most common CLI bug is not in parsing. It is a broad `except` that prints the error — to stdout — and lets the function return normally, so the process exits 0. Here is what the caller sees:" },

    { t: "code", lang: "python", title: "bad_tool.py, and the program that calls it", code: `
import json
import sys

def main() -> None:
    try:
        rows = json.load(open(sys.argv[1]))
    except Exception as exc:
        print(f"error: {exc}")          # to stdout, and the process still exits 0
        return
    print(json.dumps({"count": len(rows)}))

main()

# ---- the caller --------------------------------------------------------
# r = subprocess.run([sys.executable, "bad_tool.py", "missing.json"], ...)
# print("exit code:", r.returncode)
# json.loads(r.stdout)
`,
      out: `exit code: 0
JSONDecodeError: Expecting value: line 1 column 1 (char 0)` },

    { t: "callout", kind: "trap", title: "An error on stdout with exit code 0 is a success", body: [
      { t: "p", text: "To automation, this run succeeded: CI moves to the next step, `&&` runs the next command, and the consumer tries to parse `error: [Errno 2] ...` as JSON. **The failure surfaces one program later, as a parse error that names the wrong tool.**" },
      { t: "p", text: "**Every error path ends in two things: a message on stderr and a non-zero return from `main`.** Catch the specific exceptions you can explain to the user, as `report.py` does with `FileNotFoundError` and `ValueError`. Let anything else propagate — an unexpected traceback exits 1, which is the honest answer." }
    ]},

    { t: "ladder", title: "Handling a failure inside a CLI", rungs: [
      { level: "bad", label: "Print and carry on", why: "exit 0 on failure", code: `except Exception as exc:
    print(f"error: {exc}")`, note: "Wrong channel and wrong exit code. Every caller believes it worked." },
      { level: "ok", label: "sys.exit from deep inside", why: "right code, hard to test", code: `def summarise(path):
    if not path.exists():
        sys.exit(f"no such file: {path}")   # stderr, exit 1`, note: "`sys.exit(str)` prints to stderr and exits 1, so the contract is kept — but `SystemExit` from a helper makes the helper impossible to reuse or test without catching it." },
      { level: "best", label: "Raise inside, translate once in main", why: "one place decides", code: `def main(argv=None) -> int:
    try:
        run(args)
    except FileNotFoundError as exc:
        print(f"tool: {exc.filename}: not found", file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())`, note: "Helpers raise ordinary exceptions; `main` is the single place that turns them into a message and a code. Tests call `main([...])` and assert on the integer." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Living in a pipe", id: "pipes" },

    { t: "p", text: "A tool used in a pipe meets two events that interactive programs never do. When the reader exits early — `| head -5` — the next write to stdout raises `BrokenPipeError`. When the user presses Ctrl-C, `KeyboardInterrupt` arrives wherever the program happens to be. Neither deserves a traceback." },

    { t: "code", lang: "python", title: "the two handlers every filter needs", code: `
import os
import sys


def main(argv: list[str] | None = None) -> int:
    try:
        for line in sys.stdin:
            print(transform(line), end="")
        sys.stdout.flush()                  # surface a broken pipe here, not at exit
    except BrokenPipeError:
        # the reader went away. Point stdout at devnull so the interpreter's
        # own flush at shutdown cannot raise the same error a second time.
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        return 1
    except KeyboardInterrupt:
        return 130                          # 128 + SIGINT, the shell convention
    return 0
`,
      caption: "The `dup2` line is the pattern from the Python documentation. Without it, catching `BrokenPipeError` is not enough: Python flushes stdout again during shutdown and prints `Exception ignored ... BrokenPipeError` anyway." },

    { t: "callout", kind: "insight", title: "Why print() is fine for data", body: [
      { t: "p", text: "Use `print()` for stdout data and `print(..., file=sys.stderr)` or `logging` for messages. Logging's default handler already writes to stderr, so the rule from Lesson 6.4 — configure logging once, at the entry point — fits a CLI exactly: `main` configures it, and a `--verbose` flag sets the level." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Testing it, shipping it, and other parsers", id: "shipping" },

    { t: "p", text: "Because `main` takes `argv` and returns an integer, a test needs no subprocess. pytest's `capsys` fixture captures both streams, so the test can assert on all three channels of the contract at once — Lesson 9.2 covers pytest itself:" },

    { t: "code", lang: "python", title: "test_report.py", code: `
import json

from report import main


def test_json_summary(tmp_path, capsys):
    csv_file = tmp_path / "orders.csv"
    csv_file.write_text("order_id,region,total\\n1,eu,10.00\\n2,eu,5.50\\n", encoding="utf-8")

    assert main(["summary", str(csv_file), "--format", "json"]) == 0
    out, err = capsys.readouterr()
    assert json.loads(out) == {"eu": "15.50"}
    assert err == ""


def test_missing_file_is_exit_1_on_stderr(capsys):
    assert main(["summary", "nope.csv"]) == 1
    out, err = capsys.readouterr()
    assert out == "" and "no such file" in err
`,
      out: `..                                                                       [100%]
2 passed in 0.09s` },

    { t: "p", text: "To ship it, declare an entry point in `pyproject.toml` (Lesson 7.7). Installing the package then creates an `orders-report` executable on the user's `PATH` — on every platform, including the `.exe` wrapper Windows needs — that imports your module and calls the function you named:" },

    { t: "code", lang: "toml", title: "pyproject.toml", code: `[project.scripts]
orders-report = "orders_report.cli:main"` },

    { t: "callout", kind: "tradeoff", title: "argparse, Click or Typer", body: [
      { t: "p", text: "**`argparse` is in the standard library**, which matters for a tool that must run anywhere with no installation step, and it is enough for most internal tools. **Click** builds the parser from decorators, composes large command trees well and has excellent testing helpers. **Typer** builds on Click and derives the interface from type hints, so `def summary(path: Path, format: Format = Format.TABLE)` *is* the definition." },
      { t: "p", text: "The contract does not change with the library: data to stdout, messages to stderr, a meaningful exit code. Pick Typer or Click for a tool with many commands that will be maintained for years; pick `argparse` when a dependency is a cost." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Write a pipe-safe filter",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Write `dedupe`: it reads lines from the files given, or from stdin when there are none or a file is `-`, and prints each distinct line once, in first-seen order. It is meant to sit in the middle of pipes, so it must behave correctly when one input is missing and when its reader goes away." }
      ],
      requirements: [
        "`-i/--ignore-case` treats lines that differ only in case as the same, printing the first spelling seen",
        "`-c/--count` prefixes each line with how many times it occurred",
        "A missing file is reported on stderr and the others are still processed; the exit code is then 1",
        "Handle `BrokenPipeError` without a traceback, and return 130 on Ctrl-C",
        "Structure it as `main(argv) -> int` and test both the counting and the missing-file behaviour without a subprocess"
      ],
      hint: "Collect errors in a list while a generator yields lines from each source in turn; print them, and choose the exit code, only after the output is complete. That is what lets one bad file fail the run without hiding the good output.",
      solution: {
        lang: "python",
        title: "dedupe.py",
        code: `"""dedupe: print each distinct line once, in first-seen order."""
from __future__ import annotations

import argparse
import os
import sys
from collections import Counter
from collections.abc import Iterable, Iterator
from pathlib import Path


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="dedupe", description=__doc__)
    p.add_argument("files", nargs="*", default=["-"], help="files to read; - or none for stdin")
    p.add_argument("-i", "--ignore-case", action="store_true")
    p.add_argument("-c", "--count", action="store_true", help="prefix each line with its count")
    return p


def lines(sources: Iterable[str], errors: list[str]) -> Iterator[str]:
    for src in sources:
        if src == "-":
            yield from sys.stdin
            continue
        try:
            with Path(src).open(encoding="utf-8") as f:
                yield from f
        except OSError as exc:                 # report, keep going, fail at the end
            errors.append(f"dedupe: {src}: {exc.strerror}")


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    errors: list[str] = []
    counts: Counter[str] = Counter()
    shown: dict[str, str] = {}
    try:
        for raw in lines(args.files, errors):
            line = raw.rstrip("\\n")
            key = line.casefold() if args.ignore_case else line
            counts[key] += 1
            shown.setdefault(key, line)
        for key, line in shown.items():
            print(f"{counts[key]:>4} {line}" if args.count else line)
        sys.stdout.flush()
    except BrokenPipeError:
        # the reader went away (| head). Point stdout at devnull so the
        # interpreter's own flush at exit cannot raise a second time.
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        return 1
    except KeyboardInterrupt:
        return 130                              # the shell convention: 128 + SIGINT
    for e in errors:
        print(e, file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())


# ---- tests (pytest) ----------------------------------------------------
# def test_first_seen_order_and_counts(tmp_path, capsys):
#     f = tmp_path / "in.txt"
#     f.write_text("eu\\nUS\\neu\\nus\\n", encoding="utf-8")
#     assert main(["-c", "-i", str(f)]) == 0
#     assert capsys.readouterr().out == "   2 eu\\n   2 US\\n"
#
# def test_missing_file_still_prints_the_rest(tmp_path, capsys):
#     f = tmp_path / "in.txt"
#     f.write_text("a\\n", encoding="utf-8")
#     assert main([str(f), str(tmp_path / "nope.txt")]) == 1
#     out, err = capsys.readouterr()
#     assert out == "a\\n" and "nope.txt" in err`,
        out: `$ dedupe a.txt                -> exit 0
eu
US
us
ap
$ dedupe -c -i a.txt          -> exit 0
   2 eu
   2 US
   1 ap
$ dedupe a.txt missing.txt    -> exit 1
eu
US
us
ap
stderr: dedupe: missing.txt: No such file or directory
$ pytest -q test_dedupe.py
2 passed in 0.14s`,
        notes: [
          { t: "p", text: "**Errors are collected, not raised, because a filter's output is partial by nature.** Stopping at the first missing file would throw away the lines already read from the good ones; reporting at the end gives the user everything that could be produced *and* a non-zero exit code that says it was incomplete." },
          { t: "p", text: "**`shown` is a dict because dicts preserve insertion order** (Lesson 2.3) — it is simultaneously the membership test and the first-seen ordering, so there is no separate list to keep in step with a set." },
          { t: "p", text: "**`main` returns rather than exits**, so the tests call it with a list and assert on an integer. `sys.exit(main())` appears exactly once, under the `__main__` guard, which is the only place the process boundary is real." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A nightly data job ran `inventory-export --format json | load-to-warehouse`. One morning the warehouse was empty and the loader's log said `JSONDecodeError: Expecting value: line 1 column 1`. The export tool had been upgraded the previous day." },
      { t: "p", text: "**The new version printed a deprecation notice to stdout** — `Note: --format json will become the default in 3.0` — on the first line, ahead of the JSON. Interactively it looked helpful. In the pipe it was the first line of the data. And because the loader's failure did not propagate through the shell pipeline, the job's exit status was the last command's, so the scheduler marked the run successful." },
      { t: "p", text: "**Two fixes, one per layer.** The tool moved every message to stderr and gained a test asserting that `--format json` output parses as JSON with nothing before it. The job script gained `set -o pipefail`, so a failure anywhere in the pipe fails the run. Either alone would have turned an empty warehouse into a red build." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**A CLI's callers are programs**: they read the exit code, read stdout as data, and ignore stderr.",
    "**stdout is for the result, stderr is for messages, and the exit code is the verdict** — 0 for success, 1 for a failed job, 2 for a usage error, 130 for Ctrl-C.",
    "**An error printed to stdout with exit code 0 is a success** to every script and CI system that runs the tool.",
    "**Write `main(argv) -> int` and call `sys.exit(main())` once**, under the `__main__` guard; helpers raise, and `main` translates.",
    "**`argparse` validates for you**: `type=` converts, `choices=` restricts, subparsers give one verb per job, and a usage error exits 2 automatically.",
    "**Accept `-` for stdin** so the tool can sit in the middle of a pipe.",
    "**Handle `BrokenPipeError` and `KeyboardInterrupt` explicitly**; redirect stdout to devnull after a broken pipe so the shutdown flush cannot fail again.",
    "**Test through `main([...])` with `capsys`**, asserting on all three channels — no subprocess needed.",
    "**Ship it with `[project.scripts]`**, which creates a working executable on every platform.",
    "**The library is the small decision**: `argparse` when a dependency is a cost, Click or Typer for large, long-lived command trees."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A tool catches every exception, prints `error: ...` and returns normally. A CI step runs it. What does CI conclude when the input file is missing?",
        options: [
          "That the step succeeded, because the process exited with status 0",
          "That the step failed, because the word \"error\" appeared in the output",
          "That the step failed, because an exception was raised and logged",
          "It depends on whether the output went to stdout or stderr"
        ],
        answer: 0,
        why: "CI decides on the exit code alone, and returning normally from `main` exits 0. CI does not scan output for words like \"error\". The exception was caught, so it never reached the interpreter. Which stream the message went to affects pipes and logs, not the verdict — only a non-zero exit code fails the step."
      },
      {
        stem: "What exit code does `argparse` use when the user passes an invalid choice, and why does it matter?",
        options: [
          "1 — every failure is the same to a shell",
          "2 — a usage error, distinct from the job itself failing",
          "0 — it prints help, so it succeeded",
          "It raises an exception and leaves the code to you"
        ],
        answer: 1,
        why: "`argparse` calls `parser.error`, which prints the usage line and message to stderr and exits with status 2, the long-standing convention for command-line misuse. Exiting 0 would hide the mistake, and 1 would blur it with runtime failures. It exits via `SystemExit` rather than leaving an ordinary exception for you to handle."
      },
      {
        stem: "Why structure a CLI as `def main(argv=None) -> int` with `sys.exit(main())` under the `__main__` guard?",
        options: [
          "It makes the tool start faster, because nothing runs at import time",
          "Tests can call `main([...])` and check the returned code directly",
          "`argparse` requires it, since `parse_args` needs an explicit list to read",
          "It is needed for Windows support, where `sys.argv` is not populated"
        ],
        answer: 1,
        why: "Passing `argv` explicitly and returning an integer makes the whole interface callable from a test, with the process boundary confined to one line. Startup time is unaffected. `argparse` reads `sys.argv` by default and requires nothing of the sort. Windows executables come from the entry point, not from this structure."
      },
      {
        stem: "A filter is used as `dedupe big.txt | head -3`. What happens if it does not handle `BrokenPipeError`?",
        options: [
          "Nothing — the operating system silently discards whatever is written after `head` exits",
          "`head` fails and reports an error",
          "The tool blocks until `head` reads the rest of the output, so the pipeline hangs",
          "The next write raises `BrokenPipeError` and prints a traceback"
        ],
        answer: 3,
        why: "After the reader closes the pipe, writing to it raises `BrokenPipeError` in Python, and an unhandled one prints a traceback — noise for the user and a non-zero status. The output is not silently discarded in Python, `head` has already exited successfully, and nothing waits for it. Catching the error and redirecting stdout to devnull ends the tool quietly."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What makes a command-line tool well-behaved?",
        strong: "It keeps the three-channel contract: the result on stdout so it can be piped, messages on stderr, and an exit code that tells automation whether it worked — 0, 1 for failure, 2 for misuse. It accepts stdin, has generated help, and fails with a clear message rather than a traceback for errors the user can fix.",
        answer: [
          { t: "p", text: "Lead with the channels and the exit code; that is the part that breaks pipelines and CI. Help text and argument parsing are expected, so mentioning them first sounds like a feature list." },
          { t: "p", text: "A concrete failure lands well: a warning printed to stdout corrupting JSON that the next command parses." }
        ],
        weak: "\"It uses argparse and has good help text.\" The parser is the easiest part; the contract is what other programs rely on."
      },
      {
        level: "advanced",
        q: "How do you test a CLI?",
        strong: "Make `main(argv) -> int` the entry point and test it directly: pass an argument list, assert on the returned code, and capture stdout and stderr with `capsys`. Keep a small number of end-to-end tests that run the installed entry point in a subprocess, to catch packaging mistakes.",
        answer: [
          { t: "p", text: "The structural point is the one interviewers look for: the process boundary should be one line, so almost every test is an ordinary function call." },
          { t: "p", text: "Then show the test asserts all three channels — the integer, the parsed stdout, and an empty or specific stderr — because each one is part of the interface." }
        ]
      },
      {
        level: "expert",
        q: "A job runs tool-a | tool-b and reports success, but tool-a failed. Why, and how do you fix it?",
        strong: "A shell pipeline's exit status is the last command's, so tool-a's failure is invisible unless the script sets `pipefail`. Fix it in the script with `set -o pipefail`, and in the tools by keeping errors on stderr with a non-zero exit, so whichever process fails, the pipeline fails.",
        answer: [
          { t: "p", text: "This tests whether you know the shell semantics, not just Python. Naming `pipefail` is the key fact." },
          { t: "p", text: "The complete answer adds the tool-side half: if tool-a also printed its error to stdout, tool-b may have \"succeeded\" on garbage input. Both layers must be correct for the failure to surface." }
        ]
      }
    ]
  }
});

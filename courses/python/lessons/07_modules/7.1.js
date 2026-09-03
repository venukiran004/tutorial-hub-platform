/* ============================================================================
   LESSON 7.1 — File I/O and pathlib
   ========================================================================= */
EC.receiveLesson({
  id: "7.1",

  lede: "Two file bugs reach production more often than all the others combined: a path built by string concatenation that works on your machine and breaks in the container, and a config file that a crash truncated to zero bytes. Both have the same root cause — **`open()` and paths look simpler than they are.** A path is a structured object, and text mode is a codec, not a passthrough.",

  objectives: [
    "Build paths with `pathlib` operators that stay correct on every platform",
    "Explain what text mode does to the bytes on disk, and choose an `encoding` deliberately",
    "Predict which `open()` mode truncates, appends or refuses, and pick the one you meant",
    "Stream a file larger than memory without loading it",
    "Write a file so that a crash mid-write cannot leave a half-written file behind"
  ],

  prerequisites: ["1.6", "1.9"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "A path is not a string", id: "paths-are-objects" },

    { t: "p", text: "Filesystem paths have structure: a root, a sequence of components, a stem and a suffix. Treat one as a string and you take responsibility for that structure yourself — separators, duplicates, trailing slashes, platform differences. You will get it wrong, and the wrongness usually only appears on the other operating system." },

    { t: "code", lang: "python", title: "four ways string paths go wrong", code: `
base = "/srv/app/data"
name = "orders.csv"

base + "/" + name              # "/srv/app/data/orders.csv"  -- works, barely

# 1. a trailing separator you did not control
base = "/srv/app/data/"
base + "/" + name              # "/srv/app/data//orders.csv"

# 2. the wrong separator for the platform
"data" + "\\\\" + name           # fine on Windows, a FILENAME on Linux

# 3. splitting the extension by hand
name[:-4] + ".json"            # breaks on "orders.tar.gz" and on "orders"

# 4. no idea whether the result is a file, a directory, or nonexistent
`,
      caption: "Every one of these is a real incident shape. The third is the one that silently produces wrong filenames rather than raising."
    },

    { t: "p", text: "`pathlib.Path` models the structure instead. The `/` operator joins components using the correct separator for the running platform, and the object exposes the parts you would otherwise parse out with string slicing." },

    { t: "code", lang: "python", title: "pathlib, the parts worth memorising", code: `
from pathlib import Path

p = Path("/srv/app/data") / "2024-06" / "orders.tar.gz"

print(p)                 # the joined path, correct separators
print(p.name)            # last component, with suffix
print(p.stem)            # last component, one suffix removed
print(p.suffix)          # the final suffix only
print(p.suffixes)        # all of them
print(p.parent)          # everything above
print(p.parts)           # the components as a tuple

print(p.with_suffix(".json"))    # replace the final suffix
print(p.with_name("audit.csv"))  # replace the whole final component
`,
      out: `/srv/app/data/2024-06/orders.tar.gz
orders.tar.gz
orders.tar
.gz
['.tar', '.gz']
/srv/app/data/2024-06
('/', 'srv', 'app', 'data', '2024-06', 'orders.tar.gz')
/srv/app/data/2024-06/orders.json
/srv/app/data/2024-06/audit.csv`,
      caption: "Note `suffix` versus `suffixes`. `with_suffix` replaces only the last one, which is why `orders.tar.gz` becomes `orders.json` and not `orders.tar.json`."
    },

    { t: "table",
      head: ["Task", "The `pathlib` form", "What it saves you"],
      rows: [
        ["Join", "`base / \"sub\" / \"f.txt\"`", "Correct separator, no doubled slashes"],
        ["Absolute, symlinks resolved", "`p.resolve()`", "`os.path.abspath` does not resolve symlinks or `..`"],
        ["Does it exist, and what is it", "`p.exists()`, `p.is_file()`, `p.is_dir()`", "One call instead of `os.path.isfile(str(p))`"],
        ["Create a directory tree", "`p.mkdir(parents=True, exist_ok=True)`", "No `FileExistsError` race on the second run"],
        ["Read or write small text", "`p.read_text(encoding=\"utf-8\")`, `p.write_text(...)`", "Opens, reads, closes — no `with` needed"],
        ["List a directory", "`p.iterdir()`", "Yields `Path` objects, not bare strings"],
        ["Find files by pattern", "`p.glob(\"*.csv\")`, `p.rglob(\"*.csv\")`", "`rglob` recurses; both are lazy generators"],
        ["Delete", "`p.unlink(missing_ok=True)`", "Idempotent cleanup with no `try/except`"],
        ["Size and mtime", "`p.stat().st_size`, `p.stat().st_mtime`", "One syscall, several answers"],
        ["Interoperate with old APIs", "`str(p)` or just pass `p`", "Anything taking `os.PathLike` accepts a `Path` directly"]
      ],
      caption: "`pathlib` has been the recommended interface since Python 3.6, and every stdlib function that takes a filename accepts a `Path`. New code has no reason to import `os.path`."
    },

    { t: "callout", kind: "trap", title: "An absolute right-hand operand throws away the left", body: [
      { t: "p", text: "The `/` operator is not string concatenation, and it has one behaviour that surprises everybody exactly once:" },
      { t: "code", lang: "python", title: "the surprise", numbered: false, code: `
from pathlib import Path

uploads = Path("/srv/app/uploads")

print(uploads / "invoice.pdf")     # /srv/app/uploads/invoice.pdf
print(uploads / "/etc/passwd")     # /etc/passwd   <- the base vanished
`},
      { t: "p", text: "This follows the POSIX rule that joining onto an absolute path replaces everything before it. It is consistent, and it is a **path traversal vulnerability** the moment the right-hand side comes from a user: an upload named `/etc/passwd`, or `../../etc/passwd`, escapes the directory you thought you were confined to." },
      { t: "p", text: "The fix is to resolve and then check containment — never to sanitise by stripping characters:" },
      { t: "code", lang: "python", title: "the containment check", numbered: false, code: `
def safe_join(root: Path, user_supplied: str) -> Path:
    """Return root/user_supplied, or raise if it escapes root."""
    root = root.resolve()
    candidate = (root / user_supplied).resolve()
    if not candidate.is_relative_to(root):      # 3.9+
        raise ValueError(f"path escapes {root}: {user_supplied!r}")
    return candidate


safe_join(Path("/srv/app/uploads"), "invoice.pdf")     # ok
safe_join(Path("/srv/app/uploads"), "../../etc/passwd")
`,
        out: `ValueError: path escapes /srv/app/uploads: '../../etc/passwd'`},
      { t: "p", text: "`resolve()` before comparing is the load-bearing part. Comparing the unresolved strings passes for `../../etc/passwd` because the `..` components are still literal text at that point." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "What text mode actually does", id: "text-mode",
      sub: "A file on disk contains bytes. A Python `str` contains code points. Something has to convert." },

    { t: "p", text: "`open(path)` gives you a text file object, and reading from it yields `str`. But there are no `str` objects on a disk — only bytes. Text mode is a codec plus a newline translator wrapped around a byte stream, and both of those layers can fail or corrupt." },

    { t: "viz",
      title: "The three layers between disk and your string",
      caption: "Text mode is a stack: raw bytes, a decoder that turns them into code points, and a newline translator. Binary mode gives you the bottom layer only. Every text-file bug lives in the middle layer — a decoder given the wrong encoding.",
      svg: `<svg viewBox="0 0 900 320" role="img" aria-label="Diagram: the byte stream, decoder and newline translation layers of a Python text file object">
  <defs>
    <marker id="f1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
    <marker id="f1a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--crit)"/>
    </marker>
  </defs>

  <text x="20" y="22" class="s-sub" style="font-weight:700;letter-spacing:.08em">READING open(path, encoding="utf-8")</text>

  <rect x="20" y="38" width="170" height="52" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="105" y="60" text-anchor="middle" class="s-label">bytes on disk</text>
  <text x="105" y="78" text-anchor="middle" class="s-mono" style="font-size:11px">63 61 66 c3 a9 0d 0a</text>

  <line x1="190" y1="64" x2="256" y2="64" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#f1)"/>

  <rect x="262" y="38" width="180" height="52" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="352" y="60" text-anchor="middle" class="s-label">decoder</text>
  <text x="352" y="78" text-anchor="middle" class="s-sub">utf-8 -&gt; code points</text>

  <line x1="442" y1="64" x2="508" y2="64" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#f1)"/>

  <rect x="514" y="38" width="180" height="52" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="604" y="60" text-anchor="middle" class="s-label">newline translation</text>
  <text x="604" y="78" text-anchor="middle" class="s-sub">CRLF or CR -&gt; LF</text>

  <line x1="694" y1="64" x2="760" y2="64" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#f1)"/>

  <rect x="766" y="38" width="114" height="52" rx="8" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <text x="823" y="60" text-anchor="middle" class="s-label">str</text>
  <text x="823" y="78" text-anchor="middle" class="s-mono" style="font-size:11px">"café\\n"</text>

  <line x1="20" y1="112" x2="880" y2="112" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="140" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--crit)">SAME BYTES, WRONG ENCODING</text>

  <rect x="20" y="156" width="170" height="52" rx="8" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="105" y="178" text-anchor="middle" class="s-label">bytes on disk</text>
  <text x="105" y="196" text-anchor="middle" class="s-mono" style="font-size:11px">63 61 66 c3 a9 0d 0a</text>

  <line x1="190" y1="182" x2="256" y2="182" style="stroke:var(--crit)" stroke-width="1.5" marker-end="url(#f1a)"/>

  <rect x="262" y="156" width="180" height="52" rx="8" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="352" y="178" text-anchor="middle" class="s-label">decoder</text>
  <text x="352" y="196" text-anchor="middle" class="s-sub">cp1252 -&gt; code points</text>

  <line x1="442" y1="182" x2="508" y2="182" style="stroke:var(--crit)" stroke-width="1.5" marker-end="url(#f1a)"/>

  <rect x="514" y="156" width="366" height="52" rx="8" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="697" y="178" text-anchor="middle" class="s-mono">"cafÃ©\\n"</text>
  <text x="697" y="196" text-anchor="middle" class="s-sub">no exception — cp1252 has a character for every byte</text>

  <rect x="20" y="234" width="860" height="70" rx="9" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="256" class="s-sub" style="fill:var(--ink-2);font-weight:600">Why this class of bug is so hard to find:</text>
  <text x="36" y="275" class="s-sub">utf-8 REJECTS invalid bytes, so a wrong guess raises UnicodeDecodeError and you find it immediately.</text>
  <text x="36" y="292" class="s-sub" style="fill:var(--warn)">Single-byte encodings accept everything, so a wrong guess corrupts silently and reaches the database.</text>
</svg>`
    },

    { t: "table",
      head: ["Mode", "If the file exists", "If it does not", "Position"],
      rows: [
        ["`\"r\"` (default)", "Reads", "`FileNotFoundError`", "Start"],
        ["`\"w\"`", "**Truncates to zero bytes immediately**", "Creates", "Start"],
        ["`\"a\"`", "Keeps content", "Creates", "End; every write appends"],
        ["`\"x\"`", "`FileExistsError`", "Creates", "Start"],
        ["`\"r+\"`", "Reads and writes, no truncation", "`FileNotFoundError`", "Start"],
        ["`\"w+\"`", "Truncates, then reads and writes", "Creates", "Start"]
      ],
      caption: "Add `\"b\"` for binary — `\"rb\"`, `\"wb\"`. Binary mode gives you `bytes`, performs no decoding and no newline translation, and rejects the `encoding` argument. Use `\"x\"` whenever creating a file that must not already exist: it is an atomic check-and-create, unlike `if not p.exists()` followed by a write."
    },

    { t: "code", lang: "python", title: "the shapes you will actually write", code: `
from pathlib import Path

log = Path("/var/log/app/requests.log")

# Small text file, read whole: no context manager needed
config_text = Path("config.toml").read_text(encoding="utf-8")

# Large text file, line by line: lazy, constant memory
with log.open(encoding="utf-8") as f:
    for line in f:
        handle(line.rstrip("\\n"))

# Binary, in fixed chunks
with log.open("rb") as f:
    while chunk := f.read(64 * 1024):
        digest.update(chunk)

# Append a line, flushing on close
with log.open("a", encoding="utf-8") as f:
    f.write("deploy finished\\n")
`,
      hl: [10, 11, 15],
      caption: "`for line in f` is the important one. It reads a buffer at a time and yields lines from it, so an 8 GB log costs a few kilobytes of memory. `f.readlines()` and `f.read()` on the same file cost 8 GB and get your process killed by the OOM reaper."
    },

    { t: "callout", kind: "good", title: "Always use `with`, and know what it guarantees", body: [
      { t: "p", text: "`with open(...) as f:` closes the file when the block exits, including when it exits by exception. Without it, the file stays open until the object is garbage collected — which in CPython is usually immediate, and in PyPy or under a reference cycle is not." },
      { t: "p", text: "The practical consequence of a missing `close()` on a **write** is worse than a leaked descriptor: buffered data has not reached the disk yet. A reader that opens the file before your buffer flushes sees a truncated file, and there is no error anywhere to point at. Lesson 5.8 covers the context-manager protocol itself." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Encoding is not optional", id: "encoding" },

    { t: "p", text: "Until Python 3.15, `open()` without an `encoding` argument uses `locale.getencoding()` — whatever the operating system says the local default is. That is UTF-8 on modern Linux and macOS, and it is **cp1252** on a Western Windows install and **cp932** on a Japanese one." },

    { t: "p", text: "So the same code reads the same file differently on two machines. This is the mechanism behind the single most common cross-platform Python bug." },

    { t: "code", lang: "python", title: "the failure, on a Windows developer machine", code: `
from pathlib import Path

# The file was written as UTF-8 by a Linux service.
rows = Path("customers.csv").read_text()          # no encoding argument
`,
      out: `Traceback (most recent call last):
  File "load.py", line 4, in <module>
    rows = Path("customers.csv").read_text()
  File "C:\\Python312\\Lib\\pathlib.py", line 1027, in read_text
    return f.read()
           ^^^^^^^^
UnicodeDecodeError: 'charmap' codec can't decode byte 0x9d in position 3411:
character maps to <undefined>`,
      caption: "Note the codec name in the error: `charmap`, not `utf-8`. Any traceback naming `charmap` or `cp1252` is telling you the encoding was inferred rather than specified."
    },

    { t: "callout", kind: "trap", title: "The silent version is the dangerous one", body: [
      { t: "p", text: "The traceback above is the *good* outcome — the failure is loud and local. Swap the direction and nothing raises at all:" },
      { t: "code", lang: "python", title: "mojibake, with no exception", numbered: false, code: `
data = "café — 12.50 EUR"

# Written on Windows without an encoding: becomes cp1252 bytes
Path("out.txt").write_text(data)

# Read on Linux without an encoding: decoded as utf-8
Path("out.txt").read_text()
`,
        out: `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe9 in position 3`},
      { t: "p", text: "And the reverse — UTF-8 bytes read as cp1252 — produces no error whatsoever, because a single-byte encoding has a character for all 256 byte values. `café` becomes `cafÃ©`, the write succeeds, the row lands in the database, and you discover it months later in a customer complaint. **Corruption without an exception is the reason this rule is absolute.**" },
      { t: "p", text: "Three defences, in order of preference:" },
      { t: "ol", items: [
        "**Pass `encoding=\"utf-8\"` on every text `open()`, `read_text()` and `write_text()`.** It is nine characters and it removes the entire class of bug.",
        "**Turn on UTF-8 mode** for a whole process with `PYTHONUTF8=1` or `python -X utf8`. Useful for code you did not write; not a substitute for being explicit in code you did.",
        "**Enable the warning in development**: `python -X warn_default_encoding` makes every implicit-encoding call emit an `EncodingWarning`, which is how you find the ones already in your codebase."
      ]}
    ]},

    { t: "dl", items: [
      ["`encoding=\"utf-8\"`", "The correct default for anything you control. Rejects invalid byte sequences, so mistakes surface as exceptions rather than as corrupted text."],
      ["`encoding=\"utf-8-sig\"`", "UTF-8 that strips a leading byte-order mark when reading. Use it for CSVs exported from Excel, which prefix `EF BB BF` — with plain `utf-8` your first column name becomes `\\ufeffid` and every dictionary lookup on it fails."],
      ["`errors=\"strict\"`", "The default. Raises `UnicodeDecodeError` on invalid bytes. Keep it for data you must not silently damage."],
      ["`errors=\"replace\"`", "Substitutes U+FFFD for undecodable bytes. Appropriate for log-scraping and diagnostics, where finishing matters more than fidelity."],
      ["`errors=\"surrogateescape\"`", "Round-trips undecodable bytes through reserved code points, so read-then-write preserves them exactly. This is what the stdlib uses for filenames on POSIX, where a filename is bytes and need not be valid UTF-8."],
      ["`newline=\"\"`", "Disables newline translation on read and write while staying in text mode. Required by the `csv` module (Lesson 7.2) because embedded newlines inside quoted fields must survive intact."]
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Writing without losing the old file", id: "atomic-writes" },

    { t: "p", text: "`open(path, \"w\")` truncates the file **before** your first write. Between that truncation and a successful flush, the file on disk is shorter than it was and does not contain the data it used to. If the process is killed, the disk is full, or the serialiser raises halfway through, the old content is gone and the new content never arrived." },

    { t: "code", lang: "python", title: "how a config file becomes zero bytes", code: `
import json
from pathlib import Path

def save(path: Path, config: dict) -> None:
    with path.open("w", encoding="utf-8") as f:      # truncates NOW
        json.dump(config, f, indent=2)               # may raise HERE


save(Path("settings.json"), {"retries": 3, "cutoff": object()})
`,
      out: `TypeError: Object of type object is not JSON serializable`,
      hl: [5, 6],
      caption: "`json.dump` writes incrementally, so the file already holds a partial object when the `TypeError` fires. `settings.json` is now invalid JSON, the previous valid configuration is unrecoverable, and the service will not start."
    },

    { t: "p", text: "The fix is the pattern every database, package manager and text editor uses: **write somewhere else, then rename over the target.** `os.replace()` is atomic — after it returns, readers see either the complete old file or the complete new one, never a mixture and never nothing." },

    { t: "viz",
      title: "Truncate-in-place versus write-and-replace",
      caption: "os.replace() maps to a single rename syscall, which the filesystem performs atomically. The temporary file must live in the same directory as the target: rename is only atomic within one filesystem, and /tmp is frequently a different mount.",
      svg: `<svg viewBox="0 0 900 340" role="img" aria-label="Diagram comparing a truncating write, which leaves a partial file after a crash, with a write to a temporary file followed by an atomic rename">
  <defs>
    <marker id="f2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="22" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--crit)">open(path, "w") — THREE STATES, ONE OF THEM BAD</text>

  <rect x="20" y="36" width="180" height="46" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <text x="110" y="55" text-anchor="middle" class="s-mono">settings.json</text>
  <text x="110" y="72" text-anchor="middle" class="s-sub">valid, 1.2 KB</text>

  <line x1="200" y1="59" x2="256" y2="59" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#f2)"/>
  <text x="228" y="50" text-anchor="middle" class="s-sub">open</text>

  <rect x="262" y="36" width="180" height="46" rx="8" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="352" y="55" text-anchor="middle" class="s-mono">settings.json</text>
  <text x="352" y="72" text-anchor="middle" class="s-sub" style="fill:var(--crit)">0 bytes</text>

  <line x1="442" y1="59" x2="498" y2="59" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#f2)"/>
  <text x="470" y="50" text-anchor="middle" class="s-sub">write</text>

  <rect x="504" y="36" width="180" height="46" rx="8" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="594" y="55" text-anchor="middle" class="s-mono">settings.json</text>
  <text x="594" y="72" text-anchor="middle" class="s-sub" style="fill:var(--crit)">partial, invalid</text>

  <line x1="684" y1="59" x2="740" y2="59" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#f2)"/>

  <rect x="746" y="36" width="134" height="46" rx="8" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <text x="813" y="55" text-anchor="middle" class="s-mono">valid again</text>
  <text x="813" y="72" text-anchor="middle" class="s-sub">if nothing failed</text>

  <text x="20" y="106" class="s-sub" style="fill:var(--crit)">A crash, a raise, or a full disk anywhere in the middle two states is unrecoverable.</text>

  <line x1="20" y1="124" x2="880" y2="124" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="20" y="152" class="s-sub" style="font-weight:700;letter-spacing:.08em;fill:var(--good)">WRITE TO A SIBLING, THEN os.replace()</text>

  <rect x="20" y="166" width="180" height="46" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <text x="110" y="185" text-anchor="middle" class="s-mono">settings.json</text>
  <text x="110" y="202" text-anchor="middle" class="s-sub">valid, untouched</text>

  <rect x="20" y="222" width="180" height="46" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="110" y="241" text-anchor="middle" class="s-mono">.settings.json.tmp</text>
  <text x="110" y="258" text-anchor="middle" class="s-sub">being written</text>

  <line x1="200" y1="245" x2="286" y2="245" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#f2)"/>
  <text x="243" y="236" text-anchor="middle" class="s-sub">flush + fsync</text>

  <rect x="292" y="222" width="180" height="46" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="382" y="241" text-anchor="middle" class="s-mono">.settings.json.tmp</text>
  <text x="382" y="258" text-anchor="middle" class="s-sub">complete on disk</text>

  <line x1="472" y1="245" x2="558" y2="245" style="stroke:var(--good)" stroke-width="1.8" marker-end="url(#f2)"/>
  <text x="515" y="236" text-anchor="middle" class="s-sub" style="fill:var(--good)">os.replace</text>

  <rect x="564" y="222" width="316" height="46" rx="8" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <text x="722" y="241" text-anchor="middle" class="s-mono">settings.json</text>
  <text x="722" y="258" text-anchor="middle" class="s-sub">one atomic rename — no intermediate state</text>

  <text x="20" y="296" class="s-sub" style="fill:var(--ink-2)">A crash before the rename leaves the old file intact and a stray .tmp to clean up.</text>
  <text x="20" y="314" class="s-sub" style="fill:var(--ink-2)">A crash after the rename leaves the new file complete. There is no third outcome.</text>
</svg>`
    },

    { t: "ladder",
      title: "Persisting a config file",
      rungs: [
        { level: "bad", label: "Truncate and hope", why: "no old file to fall back to",
          code: `def save(path, config):
    with open(path, "w") as f:
        json.dump(config, f)`,
          note: "Truncates before it has the data it needs. Also missing an encoding, so the same file is written differently on Windows and Linux. This is the version in most codebases." },
        { level: "ok", label: "Serialise first, then write", why: "removes the serialiser as a failure point",
          code: `def save(path: Path, config: dict) -> None:
    text = json.dumps(config, indent=2)   # can raise before we touch disk
    path.write_text(text, encoding="utf-8")`,
          note: "A genuine improvement: a `TypeError` from an unserialisable value now fires before the file is opened, so the old file survives the common case. It still leaves a partial file if the process dies during the write, or the disk fills." },
        { level: "best", label: "Write a sibling, fsync, replace", why: "no observable intermediate state",
          code: `import json, os, tempfile
from pathlib import Path

def save(path: Path, config: dict) -> None:
    """Replace path with config, atomically."""
    text = json.dumps(config, indent=2)
    fd, tmp = tempfile.mkstemp(
        dir=path.parent, prefix=path.name, suffix=".tmp"
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())      # bytes are on the platter, not in a buffer
        os.replace(tmp, path)         # atomic rename
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise`,
          note: "`tempfile.mkstemp(dir=path.parent)` puts the temporary file on the same filesystem, which is what makes the rename atomic rather than a copy. `os.fsync` is what makes the guarantee survive a power loss rather than only a process crash. `except BaseException` rather than `except Exception` so that a `KeyboardInterrupt` still cleans up its temporary file." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "When atomic writes are worth the code", body: [
      { t: "p", text: "`os.fsync` forces a disk flush, which costs milliseconds and defeats the OS write cache. Doing it per record in a hot loop will destroy your throughput, and you would use a database instead." },
      { t: "p", text: "The rule that actually applies: **atomicity is for files that something else reads independently of you.** Configuration, state files, exported reports, cache manifests, model artifacts — anything where a reader arriving at the wrong moment causes an incident." },
      { t: "p", text: "Append-only logs need none of this. Appends do not truncate, and a partial final line is a well-understood, recoverable condition that every log consumer already handles." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A state file that survives being killed",
      difficulty: "foundation",
      minutes: 30,
      body: [
        { t: "p", text: "Build the persistence layer for a small job runner: it keeps a JSON file recording which jobs have completed, updates it after each job, and must be correct when the process is killed mid-write. Then prove it by killing the process mid-write." },
        { t: "p", text: "The proof is the exercise. Writing an atomic save is easy; convincing yourself that the naive version really does corrupt data is what makes you write the atomic one next time." }
      ],
      requirements: [
        "Write `load_state(path)` returning a `dict`, and treating a missing file as empty state — but **not** treating a corrupt file as empty.",
        "Write `save_state(path, state)` that replaces the file atomically: serialise first, write to a temporary file in the same directory, `flush`, `fsync`, then `os.replace`.",
        "Pass `encoding=\"utf-8\"` everywhere, and include at least one non-ASCII value in your state so a wrong encoding actually shows up.",
        "Write a `naive_save` that uses `open(path, \"w\")` directly, for comparison.",
        "Write a driver that saves a large state (a few thousand keys) in a loop. Run it, and kill it with Ctrl+C during the loop. Then try to load the file.",
        "Do that twice — once with `naive_save`, once with `save_state` — and record what each leaves behind.",
        "Use `pathlib` throughout. No string concatenation and no `os.path`."
      ],
      hint: "To make the crash window wide enough to hit reliably, write a genuinely large payload — `{f\"job-{i}\": ...}` for 200,000 keys — so the write takes long enough that Ctrl+C lands inside it. For the corrupt-file requirement, ask yourself what `load_state` should do when `json.loads` raises: silently returning `{}` would make the runner re-run every completed job.",
      solution: {
        lang: "python",
        title: "state.py",
        code: `import json
import os
import tempfile
from pathlib import Path


class StateCorrupt(RuntimeError):
    """The state file exists but could not be parsed."""


def load_state(path: Path) -> dict:
    """Return the persisted state. Missing file means no state yet."""
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return {}
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        # Deliberately NOT returning {}. A corrupt file is an operator
        # decision, not something to paper over by re-running every job.
        raise StateCorrupt(f"{path} is not valid JSON: {exc}") from exc


def save_state(path: Path, state: dict) -> None:
    """Atomically replace path with state."""
    text = json.dumps(state, indent=2, ensure_ascii=False)

    fd, tmp_name = tempfile.mkstemp(
        dir=path.parent, prefix=f".{path.name}.", suffix=".tmp"
    )
    tmp = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


def naive_save(path: Path, state: dict) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


# ---- the driver ---------------------------------------------------------
if __name__ == "__main__":
    import sys

    save = naive_save if "--naive" in sys.argv else save_state
    path = Path("state.json")

    state = {"runner": "café-batch", "jobs": {}}
    for i in range(200_000):
        state["jobs"][f"job-{i}"] = {"status": "done", "attempt": 1}
        if i % 5_000 == 0:
            save(path, state)
            print(f"saved {i} jobs", flush=True)`,
        out: `# --- naive, killed mid-write -------------------------------------------
$ python state.py --naive
saved 0 jobs
saved 5000 jobs
saved 10000 jobs
^CTraceback (most recent call last):
KeyboardInterrupt

$ python -c "import state, pathlib; state.load_state(pathlib.Path('state.json'))"
state.StateCorrupt: state.json is not valid JSON: Unterminated string
    starting at: line 27891 column 5 (char 613402)

$ ls -l state.json
-rw-r--r--  1 dev  dev  613402 state.json     <- truncated mid-object

# --- atomic, killed mid-write ------------------------------------------
$ python state.py
saved 0 jobs
saved 5000 jobs
saved 10000 jobs
^CKeyboardInterrupt

$ python -c "import state, pathlib; print(len(state.load_state(pathlib.Path('state.json'))['jobs']))"
10001                                          <- the last COMPLETE save

$ ls -a
.  ..  state.json  state.py                    <- no orphaned .tmp`,
        notes: [
          { t: "p", text: "**The atomic version did not save more data — it saved less.** It lost the in-progress write entirely and rolled back to the last complete save. That is the correct behaviour and it is worth stating plainly: atomicity buys you *a valid file*, not *the most recent data*. A runner that re-runs 5,000 idempotent jobs is fine; a runner that cannot parse its own state file is an incident." },
          { t: "callout", kind: "insight", title: "Why the temp file is a hidden sibling", body: [
            { t: "p", text: "`dir=path.parent` is the requirement — rename is only atomic within a single filesystem, and `/tmp` is a separate mount (often `tmpfs`) on most Linux distributions and in most containers. Put the temporary file in `/tmp` and `os.replace` degrades to a copy-then-delete, which reintroduces exactly the partial-file window you were removing." },
            { t: "p", text: "`prefix=f\".{path.name}.\"` is a smaller thing that saves real support time. Directory scanners, file watchers and glob patterns like `*.json` skip dotfiles, so an orphaned temporary left by a hard kill will not be picked up as real data by something else." }
          ]},
          { t: "p", text: "**`except BaseException` rather than `except Exception`** is deliberate. `KeyboardInterrupt` and `SystemExit` derive from `BaseException`, not `Exception` (Lesson 6.1), and this function's entire purpose is to behave correctly when the process is being torn down. Catching only `Exception` would leave the temporary file behind on exactly the interruption this exercise tests." },
          { t: "p", text: "**`ensure_ascii=False`** keeps `café` as one character rather than expanding it to `caf\\u00e9`. Both are valid JSON and both round-trip, but only one is readable when an operator opens the file at 3am — and with `encoding=\"utf-8\"` on the write there is no reason to escape it." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A nightly ETL job exports a 400 MB CSV to a shared volume. A downstream service polls that directory and loads any new file. Once or twice a week, the downstream service reports a parse error on the last row; a rerun of the same file always succeeds." },
      { t: "p", text: "**The mechanism is a race, not a bug in either program.** The exporter opens the target path directly and streams rows into it. The poller sees the file appear the instant it is created — while it is still being written — and reads whatever has been flushed so far. The last row is therefore half a row. A rerun succeeds because by then the file is complete." },
      { t: "p", text: "**The fix is the pattern from this lesson, applied to the visibility of the file rather than its contents.** Write to `export.csv.tmp` in the same directory, `fsync`, then `os.replace` it to `export.csv`. The poller cannot observe the file until it is whole, because the name only exists after the rename." },
      { t: "p", text: "The tempting fixes are both worse. Making the poller retry on parse failure hides a corruption bug behind a timer and will eventually accept a genuinely truncated export. Making the poller wait for the file size to stop changing is a heuristic that fails on any pause in the exporter — and a 400 MB write over a network filesystem pauses often." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**Build paths with `pathlib`, never with string concatenation.** The `/` operator picks the platform separator, and `.stem`, `.suffix` and `.with_suffix()` replace the string slicing that silently produces wrong filenames.",
    "`Path(\"/a\") / \"/b\"` is `/b`. An absolute right-hand operand discards the base — which makes it a path-traversal vulnerability. Defend with `resolve()` then `is_relative_to()`.",
    "Text mode is a decoder plus a newline translator over a byte stream. Binary mode is the byte stream alone, and rejects `encoding`.",
    "**Pass `encoding=\"utf-8\"` on every text open.** The default is the OS locale, so identical code reads identical files differently on Linux and Windows.",
    "UTF-8 rejects invalid bytes and fails loudly; single-byte encodings accept every byte and corrupt silently. The silent direction is the one that reaches your database.",
    "`\"w\"` truncates the file the moment it opens, before you have written anything. A failure after that point destroys the old content and produces no new content.",
    "**Atomic write = serialise to a string, write a temporary file in the same directory, `flush`, `fsync`, `os.replace`.** Readers then see the whole old file or the whole new one, never a mixture.",
    "The temporary file must be a sibling of the target. `os.replace` is only atomic within one filesystem, and `/tmp` is usually a different mount.",
    "`for line in f` streams with constant memory; `f.read()` and `f.readlines()` load the whole file. On a multi-gigabyte log that difference is the OOM killer.",
    "Use `\"x\"` mode when a file must not already exist — it is an atomic create, unlike checking `exists()` and then writing."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "An upload handler runs `dest = Path(\"/srv/uploads\") / filename` where `filename` comes from the request. What does a request with `filename = \"/etc/cron.d/backdoor\"` produce?",
        options: [
          "`/srv/uploads/etc/cron.d/backdoor` — the leading slash is stripped on join",
          "`/etc/cron.d/backdoor` — an absolute right-hand operand replaces the base entirely",
          "A `ValueError`, because `pathlib` rejects absolute components in a join",
          "`/srv/uploads//etc/cron.d/backdoor`, which the OS normalises harmlessly"
        ],
        answer: 1,
        why: "`pathlib` follows the POSIX join rule: an absolute path on the right discards everything to its left, so the base directory vanishes and the handler writes wherever the attacker names. It is not stripped and no exception is raised — the operation is perfectly well-defined, just not what the author intended. Stripping leading slashes is not a fix either, because `../../etc/cron.d/backdoor` escapes just as effectively. The defence is `resolve()` on the joined path followed by `is_relative_to(root)`."
      },
      {
        stem: "A service writes UTF-8 files on Linux. A Windows developer reads them with `Path(p).read_text()` and gets `UnicodeDecodeError: 'charmap' codec`. Which statement is correct?",
        options: [
          "The files are corrupt and must be re-exported from the service",
          "The default encoding is the OS locale — cp1252 on that machine — so the fix is `encoding=\"utf-8\"` at the call site",
          "`read_text` cannot handle non-ASCII and `open()` must be used instead",
          "Windows requires `newline=\"\"` to decode files written on Linux"
        ],
        answer: 1,
        why: "`charmap` in the traceback is the tell: that is the cp1252 codec, chosen because no `encoding` argument was passed and `locale.getencoding()` returned the Windows ANSI code page. The files are fine — they are valid UTF-8, and the same code works on a machine whose locale happens to be UTF-8, which is why this only breaks for some of the team. `read_text` handles any encoding you name. `newline=\"\"` controls newline translation, a separate layer that has nothing to do with decoding bytes into code points."
      },
      {
        stem: "`save()` does `with open(path, \"w\") as f: json.dump(obj, f)` and `json.dump` raises `TypeError` on a non-serialisable value. What is on disk afterwards?",
        options: [
          "The original file, because the failed write is rolled back when the exception propagates",
          "A partial, invalid file — `\"w\"` truncated it at open and `json.dump` had already written some of the object",
          "An empty file, because nothing is flushed until `close()` succeeds",
          "Nothing — the file is deleted when the context manager exits with an exception"
        ],
        answer: 1,
        why: "There is no rollback: `\"w\"` truncates at open, and `json.dump` writes incrementally as it walks the object, so whatever it emitted before hitting the bad value is already in the buffer and gets flushed by the context manager on the way out. The `with` block guarantees the file is *closed*, not that the write is undone, and it never deletes anything. The cheap improvement is `json.dumps` first so serialisation fails before the file is touched; the complete fix is writing a sibling temporary file and `os.replace`."
      },
      {
        stem: "An atomic-write helper writes to `tempfile.mkstemp()` with no `dir` argument, then calls `os.replace(tmp, target)`. On a Linux container this sometimes leaves a partial target file. Why?",
        options: [
          "`os.replace` is not atomic; only `os.rename` is",
          "`mkstemp` defaults to `/tmp`, a different filesystem, so `replace` falls back to copy-then-delete and reintroduces a partial-write window",
          "The file needs `os.fsync` on the containing directory as well, which `replace` does not do",
          "`mkstemp` returns a file descriptor that must be closed before `replace` can be atomic"
        ],
        answer: 1,
        why: "Atomic rename is a filesystem operation, and it can only be atomic when source and destination are on the same filesystem. `/tmp` is typically `tmpfs` or a separate mount, so crossing that boundary makes Python copy the bytes and then unlink — during which the destination is observably partial. Passing `dir=target.parent` makes the temporary file a sibling and restores atomicity. `os.replace` and `os.rename` are equally atomic (`replace` differs only in overwriting an existing destination on Windows), and while an `fsync` on the directory does matter for durability across a power loss, it is not what produces a partial file here."
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
        q: "Why use `pathlib` rather than string concatenation or `os.path`?",
        strong: "Because a path has structure, and `pathlib` models it. The `/` operator uses the right separator for the platform, `.stem`, `.suffix` and `.with_suffix()` replace error-prone string slicing, and the object carries its own filesystem operations. Every stdlib function that accepts a filename accepts a `Path`, so there is no interoperability cost.",
        answer: [
          { t: "p", text: "The weak version of this answer is \"it's cleaner\". Reach for a concrete failure instead: `name[:-4] + \".json\"` gives the wrong answer for `orders.tar.gz` and for a file with no extension at all, and it does so without raising." },
          { t: "p", text: "If you want to show more range, name the one behaviour that catches people — `Path(\"/srv/uploads\") / user_input` where `user_input` is absolute produces the user's path, not yours. Knowing that `pathlib` inherits the POSIX join rule, and that the defence is `resolve()` plus `is_relative_to()`, marks you out as someone who has handled uploads rather than only tutorials." }
        ]
      },
      {
        level: "core",
        q: "Should you pass `encoding` to `open()`? Why?",
        strong: "Always, and `utf-8` unless you have a specific reason otherwise. Without it, Python uses the OS locale encoding, so the same code reads the same file differently on Linux and Windows. That makes it a class of bug that passes CI on one platform and corrupts data on another.",
        answer: [
          { t: "p", text: "The point that separates a good answer from a complete one is the **asymmetry of failure**. UTF-8 rejects invalid byte sequences, so guessing wrong in that direction raises `UnicodeDecodeError` and you fix it in minutes. A single-byte encoding like cp1252 has a character for all 256 byte values, so guessing wrong in that direction never raises — it just writes mojibake into your database and surfaces as a customer complaint months later." },
          { t: "p", text: "Worth adding: `python -X warn_default_encoding` turns every implicit-encoding call into an `EncodingWarning`, which is how you audit an existing codebase rather than grepping for `open(`. Mentioning a detection strategy rather than only a rule shows you have had to fix this at scale." }
        ],
        weak: "Saying \"it defaults to UTF-8 so it does not matter\". That is true on modern Linux and macOS and false on Windows, which is precisely why the bug exists — it works for most of the team."
      },
      {
        level: "advanced",
        q: "How do you write a file so a reader never sees it half-written?",
        strong: "Serialise fully in memory, write to a temporary file in the same directory as the target, `flush` and `fsync` it, then `os.replace` it onto the target. Rename within one filesystem is atomic, so a reader sees either the complete old file or the complete new one. A crash before the rename leaves the old file intact.",
        answer: [
          { t: "p", text: "Narrate it as removing failure windows one at a time. Serialising first removes the serialiser as a failure point. Writing a sibling means the target is never truncated. `fsync` means the guarantee survives power loss and not merely a process crash. `os.replace` means there is no moment at which the target name resolves to incomplete data." },
          { t: "p", text: "The detail interviewers listen for is **same directory**. If you say `/tmp` you have described a copy, not a rename, and the partial-write window is back. That one word is the difference between having implemented this and having read about it." },
          { t: "p", text: "The strongest close is stating what you have *not* bought: atomicity guarantees a valid file, not the newest data. A crash mid-write rolls back to the previous complete version, and your caller has to be able to live with that — which is why this pattern suits config, state and export files, and why anything needing durable incremental writes belongs in a database instead." }
        ]
      },
      {
        level: "advanced",
        q: "A 6 GB log file needs to be scanned for error lines. Walk me through it.",
        strong: "Open it in text mode with an explicit encoding and iterate the file object directly — `for line in f` reads a buffer at a time and yields lines from it, so memory stays flat regardless of file size. Never `read()` or `readlines()`. If the file may contain undecodable bytes, `errors=\"replace\"` keeps the scan running rather than aborting on one bad line.",
        answer: [
          { t: "p", text: "The mechanical answer is short, so spend the time on the reasoning: iteration is lazy because the file object is an iterator whose `__next__` pulls from an internal buffer, and that is a property of the object rather than something the `for` loop arranges. Lesson 5.6 covers the protocol." },
          { t: "p", text: "Two judgement calls are worth volunteering. First, `errors=\"replace\"` on log scanning is a deliberate trade — you accept a corrupted character to avoid aborting a 6 GB scan on one truncated write, which is the opposite of the choice you would make when loading customer records. Second, if you need to count or aggregate rather than transform, streaming a generator expression into `sum()` or a `Counter` keeps memory flat too, whereas building an intermediate list quietly reintroduces the problem you just solved." },
          { t: "p", text: "If the interviewer pushes on speed rather than memory, the honest answer is that a single Python process is bounded by per-line interpreter overhead: reading in larger binary chunks and splitting, or handing the scan to `grep` via `subprocess` (Lesson 7.8), both beat it comfortably. Knowing when not to do it in Python is a strength, not an admission." }
        ]
      }
    ]
  }
});

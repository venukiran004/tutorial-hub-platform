/* ============================================================================
   LESSON 1.6 — Strings and Text
   ========================================================================= */
EC.receiveLesson({
  id: "1.6",

  lede: "Text looks like the simplest data type and is the one that most often breaks in production. The reason is a single distinction that Python 3 made explicit and many developers still blur: **`str` is a sequence of characters; `bytes` is a sequence of numbers.** Files, sockets and databases speak bytes. Your program speaks text. Getting the conversion right — and doing it at the boundary rather than in the middle — is most of what text handling is.",

  objectives: [
    "Explain the difference between `str` and `bytes`, and where the conversion belongs",
    "Diagnose a `UnicodeDecodeError` and fix its cause rather than suppressing it",
    "Use f-strings fluently, including format specifications for alignment, precision and debugging",
    "Choose the right string method for a task, and know which ones do not do what their name suggests",
    "Explain why building strings with `+=` in a loop is quadratic, and what to do instead"
  ],

  prerequisites: ["1.4"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "str and bytes are different types", id: "str-vs-bytes" },

    {"kind": "flow", "title": "str and bytes: encode one way, decode the other", "caption": "Text is a sequence of code points; bytes are a sequence of integers 0–255. The only bridge is an encoding, and UTF-8 is the one to name explicitly.", "cols": 3, "nodes": [{"id": "s", "label": "str", "sub": "'héllo' · code points", "tone": "accent"}, {"id": "enc", "label": "UTF-8", "sub": ".encode() → · ← .decode()", "tone": "good"}, {"id": "b", "label": "bytes", "sub": "b'h\\xc3\\xa9llo' · 6 bytes", "tone": "warn"}], "edges": [["s", "enc", "encode"], ["enc", "b"], ["b", "enc", "decode"], ["enc", "s"]], "t": "diagram", "id": "dg-1_6-01-0"},



    { t: "p", text: "A `str` holds Unicode code points — the abstract idea of characters. A `bytes` holds integers 0–255. There is no automatic conversion between them, and that refusal is deliberate: Python 2 allowed it, and the resulting class of bug was severe enough to justify a breaking language change." },

    { t: "code", lang: "python", title: "the two types", code: `
text = "café"
data = text.encode("utf-8")

print(type(text), len(text))      # 4 characters
print(type(data), len(data))      # 5 bytes -- é needs two
print(data)

print(data.decode("utf-8") == text)

# No implicit conversion, in either direction:
# text + data   -> TypeError: can only concatenate str (not "bytes") to str
`,
      out: `<class 'str'> 4
<class 'bytes'> 5
b'caf\\xc3\\xa9'
True`
    },

    { t: "p", text: "Note `len()` disagreeing. `\"café\"` is four characters and five bytes, because `é` encodes to two bytes in UTF-8. If you have ever seen a database field truncate mid-character, or a length validation that passes locally and fails for a user with an accent in their name, that disagreement is the cause." },

    { t: "viz",
      title: "The encoding boundary",
      caption: "Everything outside your program is bytes. Everything inside should be str. Decode as data arrives, encode as it leaves, and keep the middle free of encoding concerns entirely — this shape is sometimes called the Unicode sandwich.",
      svg: `<svg viewBox="0 0 900 260" role="img" aria-label="Diagram: bytes decode into text at the input boundary and encode back to bytes at the output boundary">
  <defs>
    <marker id="a4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <rect x="20" y="60" width="150" height="90" rx="9" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="95" y="88" text-anchor="middle" class="s-label">Outside</text>
  <text x="95" y="108" text-anchor="middle" class="s-sub">files · sockets · stdin</text>
  <text x="95" y="122" text-anchor="middle" class="s-sub">databases · APIs</text>
  <text x="95" y="140" text-anchor="middle" class="s-mono" style="fill:var(--warn)">bytes</text>

  <line x1="170" y1="105" x2="246" y2="105" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a4)"/>
  <text x="208" y="96" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">.decode()</text>

  <rect x="252" y="40" width="396" height="130" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1.5"/>
  <text x="450" y="68" text-anchor="middle" class="s-label" style="fill:var(--accent-ink)">Your program</text>
  <text x="450" y="92" text-anchor="middle" class="s-mono" style="fill:var(--accent-ink)">str, always</text>
  <text x="450" y="118" text-anchor="middle" class="s-sub">slicing · comparison · formatting · validation</text>
  <text x="450" y="136" text-anchor="middle" class="s-sub">no encode/decode anywhere in here</text>
  <text x="450" y="158" text-anchor="middle" class="s-sub" style="fill:var(--ink-2)">len() counts characters, and means it</text>

  <line x1="654" y1="105" x2="730" y2="105" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a4)"/>
  <text x="692" y="96" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">.encode()</text>

  <rect x="736" y="60" width="144" height="90" rx="9" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="808" y="88" text-anchor="middle" class="s-label">Outside</text>
  <text x="808" y="108" text-anchor="middle" class="s-sub">responses · files</text>
  <text x="808" y="122" text-anchor="middle" class="s-sub">queues · logs</text>
  <text x="808" y="140" text-anchor="middle" class="s-mono" style="fill:var(--warn)">bytes</text>

  <rect x="20" y="192" width="860" height="52" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <text x="36" y="213" class="s-sub" style="fill:var(--crit);font-weight:600">The bug this shape prevents:</text>
  <text x="36" y="232" class="s-sub">decoding late (or twice) means bytes flow into logic that assumes text — len() lies, slicing splits characters, comparisons fail.</text>
</svg>`
    },

    { t: "callout", kind: "trap", title: "UnicodeDecodeError, and the wrong way to silence it", body: [
      { t: "p", text: "This is the most common text error in production, and it always means the same thing: **you decoded with the wrong encoding.**" },
      { t: "code", lang: "python", title: "the error", numbered: false, code: `
data = "café".encode("utf-8")
data.decode("ascii")`,
        out: `UnicodeDecodeError: 'ascii' codec can't decode byte 0xc3 in
position 3: ordinal not in range(128)`},
      { t: "p", text: "The tempting fix is to make the error go away:" },
      { t: "code", lang: "python", title: "what these actually do", numbered: false, code: `
data.decode("ascii", errors="ignore")    # 'caf'  -- silently deletes data
data.decode("ascii", errors="replace")   # 'caf__' -- silently corrupts it
data.decode("utf-8")                     # 'café' -- correct`},
      { t: "p", text: "`errors=\"ignore\"` and `errors=\"replace\"` do not fix anything. They convert a loud failure into silent data loss, which surfaces later as a corrupted record nobody can trace. **They are legitimate only when you have decided that lossy text is acceptable** — a search index, a log line — and never on data you will store or return." },
      { t: "p", text: "The real fix is to know the encoding. If the source does not tell you, UTF-8 is the correct assumption for anything modern; `chardet` or `charset-normalizer` can guess for legacy files, and the guess should be verified, not trusted." }
    ]},

    { t: "callout", kind: "insight", title: "The Windows default that breaks CI", body: [
      { t: "p", text: "`open(path)` without `encoding=` uses a platform-dependent default. On most Linux systems that is UTF-8; on Windows it has historically been the ANSI code page. So the same code reads a file correctly on a developer's Mac and raises `UnicodeDecodeError` on a Windows runner — or worse, reads it wrongly without error." },
      { t: "code", lang: "python", title: "always be explicit", numbered: false, code: `
# Fragile: behaviour depends on the machine
with open("data.csv") as f:
    ...

# Correct: same behaviour everywhere
with open("data.csv", encoding="utf-8") as f:
    ...`,
        hl: [6, 7]},
      { t: "p", text: "Python 3.15 will make UTF-8 the default, and Python 3.10+ can warn about the omission via `-X warn_default_encoding`. Until then, **pass `encoding=` to every `open()` call that handles text.** Lesson 7.1 covers file handling in full." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "f-strings", id: "f-strings",
      sub: "The default way to build strings, and more capable than most people use." },

    { t: "code", lang: "python", title: "beyond simple interpolation", code: `
name = "Ada"
score = 0.87241
count = 1234567
items = ["a", "b"]

print(f"{name} scored {score:.1%}")          # percentage, 1 decimal
print(f"{count:,}")                          # thousands separators
print(f"{score:>10.3f}|")                    # right-align in 10 columns
print(f"{name:*^12}|")                       # centre, pad with *
print(f"{score=}")                           # debug form: prints expression
print(f"{len(items)=}")                      # works on any expression
`,
      out: `Ada scored 87.2%
1,234,567
     0.872|
****Ada*****|
score=0.87241
len(items)=2`
    },

    { t: "table",
      head: ["Spec", "Effect", "Use for"],
      rows: [
        ["`:.2f`", "Fixed-point, 2 decimals", "Displaying money (after Decimal arithmetic — Lesson 1.5)"],
        ["`:,`", "Thousands separators", "Any large number a human reads"],
        ["`:>8` `:<8` `:^8`", "Right / left / centre align in width 8", "Aligned table output in logs and CLIs"],
        ["`:.1%`", "Percentage with 1 decimal", "Rates, accuracy, progress"],
        ["`:e`", "Scientific notation", "Very large or small magnitudes"],
        ["`:x` `:b` `:o`", "Hex / binary / octal", "Flags, masks, low-level debugging"],
        ["`{x=}`", "Prints `x=<value>`", "Debug printing — replaces most `print(\"x:\", x)`"],
        ["`!r`", "Uses `repr()` instead of `str()`", "Logs and errors, where quoting matters"]
      ]
    },

    { t: "callout", kind: "good", title: "`!r` in error messages", body: [
      { t: "code", lang: "python", title: "why it matters", numbered: false, code: `
value = "  42  "

print(f"could not parse {value}")     # could not parse   42
print(f"could not parse {value!r}")   # could not parse '  42  '`},
      { t: "p", text: "The first message hides the leading and trailing whitespace that is the actual cause. The second shows it. **Use `!r` in every log line and exception message that includes a value** — it is the difference between a five-minute fix and an hour of confusion, and it costs two characters." }
    ]},

    { t: "callout", kind: "warn", title: "Never f-string into SQL, shell, or HTML", body: [
      { t: "code", lang: "python", title: "the vulnerability", numbered: false, code: `
# SQL injection. If user_id is "1 OR 1=1", this returns every row.
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# Correct: parameterised. The driver sends value and query separately.
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))`,
        hl: [2, 5]},
      { t: "p", text: "The rule generalises: any time a string crosses into another language — SQL, a shell command, HTML, LDAP, a regex — interpolation is an injection vulnerability. Use the parameterisation the target provides. Lessons 13.3 and 12.8 cover this properly." },
      { t: "p", text: "One more: f-strings are evaluated eagerly, so `logger.debug(f\"processing {expensive()}\")` runs `expensive()` even when debug logging is off. Logging has its own deferred form — Lesson 6.4." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "The methods worth knowing", id: "methods" },

    {"kind": "cells", "title": "Indexing and slicing a string", "caption": "Positive indices count from 0 at the left; negative indices count from −1 at the right. s[1:4] takes indices 1, 2 and 3 — the stop is excluded.", "items": ["P", "y", "t", "h", "o", "n"], "highlight": [1, 2, 3], "label": "s = 'Python'   s[1:4] == 'yth'   s[-1] == 'n'", "t": "diagram", "id": "dg-1_6-03-1"},



    { t: "p", text: "Strings are immutable, so **every method returns a new string** and none modify in place. `text.upper()` on its own line does nothing at all — a mistake that survives review surprisingly often." },

    { t: "tabs", items: [
      { label: "Splitting & joining", blocks: [
        { t: "code", lang: "python", title: "split, join, partition", code: `
line = "  alice,bob , carol  "

print(line.split(","))              # keeps whitespace
print([p.strip() for p in line.split(",")])

# split() with no argument splits on ANY whitespace run and drops empties
print("a  b\\tc\\nd".split())

# maxsplit: stop after n splits -- useful for "key: value with: colons"
header = "Content-Type: text/html; charset=utf-8"
key, value = header.split(":", 1)
print(key, "|", value.strip())

# partition always returns 3 parts, even when the separator is absent
print("no-separator-here".partition(":"))
`,
          out: `['  alice', 'bob ', ' carol  ']
['alice', 'bob', 'carol']
['a', 'b', 'c', 'd']
Content-Type | text/html; charset=utf-8
('no-separator-here', '', '')`},
        { t: "p", text: "`split(sep, 1)` is the right tool for headers and `key=value` lines — it stops at the first separator instead of shattering the value. `partition` is the safer choice when the separator may be missing, because it never raises and never returns a short list." }
      ]},
      { label: "Stripping", blocks: [
        { t: "code", lang: "python", title: "the method whose name misleads everyone", code: `
print("  hello  ".strip())          # 'hello' -- whitespace, as expected

# The argument is a SET OF CHARACTERS to remove, not a prefix or suffix.
print("example.com".strip("moc."))  # 'example' -- ate the 'com' AND the dot
print("mississippi".strip("mip"))   # 'ssiss'  -- surprising, and correct

# What people usually want:
print("example.com".removesuffix(".com"))     # 'example'
print("www.example.com".removeprefix("www.")) # 'example.com'
`,
          out: `hello
example
ssiss
example
example.com`},
        { t: "callout", kind: "trap", title: "strip() is not removeprefix()", body: [
          { t: "p", text: "`strip(chars)` removes **any** of those characters, repeatedly, from both ends. It is a character set, not a substring. `\"filename.png\".strip(\".png\")` gives `\"filenam\"` — it removed the trailing `e` too, because `e`… is not in the set, but `n` and `g` and `p` are, and it kept going." },
          { t: "p", text: "Use `removeprefix` and `removesuffix` (Python 3.9+) when you mean a literal substring. They exist precisely because this bug was so common." }
        ]}
      ]},
      { label: "Testing & searching", blocks: [
        { t: "code", lang: "python", title: "checks and finds", code: `
path = "report-2024.csv"

print(path.startswith("report"))
print(path.endswith((".csv", ".tsv")))   # tuple: any of these

print(path.find("2024"))       # index, or -1 if absent
print(path.index("2024"))      # index, or raises ValueError
print("2024" in path)          # the idiomatic membership test

print("Hello".casefold() == "HELLO".casefold())   # correct case-insensitive
`,
          out: `True
True
7
7
True
True`},
        { t: "p", text: "Use `in` for \"is it present\"; use `find`/`index` only when you need the position. Prefer `casefold()` over `lower()` for case-insensitive comparison — it handles cases `lower()` misses, such as German `ß` versus `ss`." }
      ]},
      { label: "Cleaning & transforming", blocks: [
        { t: "code", lang: "python", title: "replace, case, padding", code: `
messy = "  Order   #1234  \\n"

print(messy.strip().replace("  ", " "))
print(" ".join(messy.split()))         # collapse ALL whitespace runs

print("order id".title())              # 'Order Id' -- often not what you want
print("order id".capitalize())         # 'Order id'

print("7".zfill(3))                    # '007'
print(f"{7:03d}")                      # '007' -- usually clearer
`,
          out: `Order # 1234
Order #1234
Order Id
Order id
007
007`},
        { t: "p", text: "`\" \".join(text.split())` is the idiomatic way to normalise all runs of whitespace — including tabs and newlines — into single spaces. `replace(\"  \", \" \")` only handles exactly two, and leaves three as two." }
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Building strings", id: "building",
      sub: "Where immutability has a performance consequence you can measure." },

    { t: "p", text: "Because strings are immutable, `s += x` cannot extend `s`. It must allocate a new string and copy everything accumulated so far. In a loop of *n* items, that is *n* allocations copying an average of *n*/2 characters — quadratic work for a linear task." },

    { t: "ladder",
      title: "Assembling a report from 100,000 rows",
      rungs: [
        { level: "bad", label: "Concatenate in a loop", why: "O(n squared) copying",
          code: `out = ""
for row in rows:
    out += f"{row['id']},{row['name']}\\n"`,
          note: "Each iteration copies the entire accumulated string. At 100,000 rows this is measurably slow and allocates gigabytes of short-lived strings. It is the single most common Python performance mistake." },

        { level: "ok", label: "Collect and join", why: "linear, one allocation",
          code: `parts = []
for row in rows:
    parts.append(f"{row['id']},{row['name']}\\n")
out = "".join(parts)`,
          note: "`join` walks the list once to compute the total length, allocates exactly one buffer, then fills it. Linear time, one allocation. This is the standard fix and it is usually where you should stop." },

        { level: "best", label: "Stream it", why: "constant memory",
          code: `def render_rows(rows: Iterable[dict]) -> Iterator[str]:
    for row in rows:
        yield f"{row['id']},{row['name']}\\n"


with open("report.csv", "w", encoding="utf-8") as f:
    f.writelines(render_rows(rows))`,
          note: "The join version still holds the entire output in memory. For a large report the better question is whether the whole string needs to exist at all — a generator writes each line as it is produced, in constant memory, and works identically for a 100-row file or a 100-million-row one. Generators are Lesson 5.7." }
      ]
    },

    { t: "callout", kind: "insight", title: "The caveat, stated honestly", body: [
      { t: "p", text: "CPython has an optimisation that can extend a string in place when it can prove exactly one reference to it exists. That sometimes makes the naive loop appear fast, which is why the myth persists." },
      { t: "p", text: "It is an implementation detail with no guarantee, it does not apply on PyPy, and it stops applying the moment anything else holds a reference — including a debugger or a profiler. **Do not design around it.** And for three or four fragments, `+` is clearer than `join` and the difference is irrelevant; the rule is about loops with unbounded iteration counts." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A log parser that survives real input",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Parse a web server access log into structured records. The exercise is not the parsing — it is handling the things real log files do that clean examples never show: inconsistent whitespace, missing fields, non-ASCII paths, and the occasional line that is simply malformed." },
        { t: "p", text: "Assume the file may be large enough that you should not read it all into memory." }
      ],
      requirements: [
        "Read the file with an explicit encoding, streaming line by line rather than with `.read()`.",
        "Parse each line into `ip`, `method`, `path`, `status`, `bytes_sent`. Fields are space-separated; the path may contain percent-encoded non-ASCII.",
        "Split so that extra internal whitespace does not corrupt the fields.",
        "Handle `-` in the `bytes_sent` field, which means zero.",
        "Skip malformed lines but **count them**, and report the count at the end rather than failing silently.",
        "Produce a summary: total requests, count per status class (2xx, 3xx, 4xx, 5xx), and total bytes — assembled without concatenating in a loop.",
        "Every value included in an error message must use `!r`."
      ],
      hint: "`line.split()` with no argument collapses any run of whitespace and drops empty fields, which is exactly what inconsistent spacing needs. For the summary, build a list and `join` once — or write directly to a file with a generator.",
      solution: {
        lang: "python",
        title: "parse_access_log.py",
        code: `"""Parse a web access log into structured records, tolerating real input."""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class Entry:
    ip: str
    method: str
    path: str
    status: int
    bytes_sent: int

    @property
    def status_class(self) -> str:
        return f"{self.status // 100}xx"


class MalformedLine(ValueError):
    """Raised when a log line cannot be parsed."""


def parse_line(line: str) -> Entry:
    # split() with no argument collapses runs of whitespace and drops
    # empties, so inconsistent spacing in the source does not shift fields.
    parts = line.split()
    if len(parts) < 5:
        raise MalformedLine(f"expected 5+ fields, got {len(parts)}: {line!r}")

    ip, method, path, status_raw, bytes_raw = parts[:5]

    if not status_raw.isdigit():
        raise MalformedLine(f"status not numeric: {status_raw!r}")

    # A literal '-' means no body was sent.
    bytes_sent = 0 if bytes_raw == "-" else bytes_raw
    if bytes_sent != 0 and not str(bytes_sent).isdigit():
        raise MalformedLine(f"bytes not numeric: {bytes_raw!r}")

    return Entry(
        ip=ip,
        method=method.upper(),
        path=path,
        status=int(status_raw),
        bytes_sent=int(bytes_sent),
    )


def read_entries(path: Path) -> Iterator[tuple[Entry | None, str | None]]:
    """Yield (entry, error). Exactly one of the two is None."""
    # encoding is explicit: the default is platform-dependent and paths in
    # a real log are frequently non-ASCII.
    with path.open(encoding="utf-8", errors="strict") as handle:
        for raw in handle:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            try:
                yield parse_line(line), None
            except MalformedLine as exc:
                yield None, str(exc)


def summarise(path: Path) -> str:
    by_class: Counter[str] = Counter()
    total_bytes = 0
    ok = 0
    bad: list[str] = []

    for entry, error in read_entries(path):
        if entry is None:
            bad.append(error or "unknown")
            continue
        ok += 1
        by_class[entry.status_class] += 1
        total_bytes += entry.bytes_sent

    # Assemble once with join rather than += in a loop.
    lines = [
        f"parsed   {ok:,} requests",
        f"skipped  {len(bad):,} malformed lines",
        f"bytes    {total_bytes:,}",
        "",
        "by status class:",
    ]
    lines += [
        f"  {cls}  {count:>8,}" for cls, count in sorted(by_class.items())
    ]
    if bad:
        lines += ["", "first malformed lines:"]
        lines += [f"  {msg}" for msg in bad[:5]]

    return "\\n".join(lines)


if __name__ == "__main__":
    print(summarise(Path("access.log")))`,
        notes: [
          { t: "p", text: "**The decisions that make this production-shaped rather than example-shaped:**" },
          { t: "ul", items: [
            "**`split()` with no argument.** It collapses any whitespace run and drops empty fields — precisely the behaviour that survives inconsistent spacing. `split(\" \")` would produce empty strings between doubled spaces and shift every subsequent field.",
            "**`errors=\"strict\"` stated explicitly.** It is the default, but writing it declares the intent: a genuinely undecodable log file should fail loudly, not silently drop characters from URLs you may need for a security investigation.",
            "**Malformed lines are counted and sampled, not swallowed.** A parser that skips silently will happily report zero traffic for a day when the log format changed. Reporting the count and the first few messages turns an invisible failure into a visible one.",
            "**Errors carry `!r`.** `status not numeric: '2O0'` immediately shows the letter O where a zero belongs. Without `!r`, that message reads `status not numeric: 2O0` and you stare at it."
          ]},
          { t: "callout", kind: "tradeoff", title: "Why not a regex?", body: [
            { t: "p", text: "The standard combined log format is usually parsed with a regex, and for the full format — with its bracketed timestamps and quoted request lines — that is the right tool. `split()` works here because the fields are unquoted and whitespace-separated." },
            { t: "p", text: "The trade-off is real: a regex handles quoted fields containing spaces, which `split()` cannot, but it is markedly slower per line and much harder to debug when the format drifts. At a few million lines a day the difference matters. Lesson 5.11 covers regex, including when a simpler tool wins." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A signup form rejects a user named `José` with a database error about value length. The column is `VARCHAR(50)` and the name is four characters. The validation in Python passed." },
      { t: "p", text: "**What happened:** Python validated `len(name) <= 50`, counting *characters*. The database column, depending on its type and charset, may count *bytes* — and the failure appears only for users whose names encode to more bytes than characters. It is a bug that is invisible to every developer testing with ASCII names, which is why it reaches production." },
      { t: "p", text: "**The general lesson:** `len()` on a `str` counts characters, and that is almost always what you want inside your program. But any limit enforced *outside* — a database column, a protocol field, an SMS segment, a filesystem name — may be counting bytes. When a length constraint crosses a boundary, check which unit the other side uses, and validate in that unit: `len(name.encode(\"utf-8\")) <= 50`." },
      { t: "p", text: "There is a third unit, for completeness: what a *user* perceives as one character can be several code points — an emoji with a skin-tone modifier, or an accented letter written as base plus combining mark. `len()` counts code points, not perceived characters. Rarely relevant, occasionally decisive." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**`str` is characters, `bytes` is numbers, and Python never converts between them implicitly.** That refusal prevents a whole family of Python 2 bugs.",
    "Decode at input, encode at output, keep `str` everywhere in between. Encoding concerns belong at the boundary, not scattered through your logic.",
    "`UnicodeDecodeError` means the wrong encoding, not bad data. `errors=\"ignore\"` and `\"replace\"` convert a loud failure into silent corruption — use them only where lossy text is an accepted decision.",
    "**Always pass `encoding=` to `open()`.** The default is platform-dependent, which is why text code passes on macOS and fails on a Windows runner.",
    "f-strings do far more than interpolate: `:,` `:.2f` `:>10` `:.1%` for formatting, `{x=}` for debugging, and **`!r` in every log and error message** so whitespace and quoting are visible.",
    "Never f-string a value into SQL, a shell command or HTML. Use the target's parameterisation — interpolation there is an injection vulnerability.",
    "Strings are immutable, so every method returns a new string. `text.strip()` on its own line does nothing.",
    "`strip(chars)` removes a **character set** from both ends, not a substring. Use `removeprefix` / `removesuffix` when you mean a literal.",
    "Building a string with `+=` in a loop is quadratic. Collect into a list and `join` once — or stream with a generator if the whole result need not exist at all.",
    "`len()` counts characters. Databases, protocols and filesystems often count bytes. When a limit crosses a boundary, validate in the unit that boundary uses."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does `\"filename.png\".strip(\".png\")` return?",
        options: [
          "`'filename'` — the suffix is removed",
          "`'filenam'` — strip removes any of the characters `.`, `p`, `n`, `g` from both ends, including the trailing `e`… ",
          "`'filename.png'` — strip only removes whitespace",
          "`'file'` — every matching character is removed throughout the string"
        ],
        answer: 1,
        why: "`strip` takes a *set of characters* and removes any of them repeatedly from both ends. It strips `g`, `n`, `p`, `.` — then reaches `e`, which is not in the set, and stops. So the result is `'filenam'`, not `'filename'` and not `'file'`. This is why `removesuffix(\".png\")` was added in Python 3.9: it removes a literal substring, which is what people almost always mean. Note that `strip` only works from the ends, so option D is wrong on a second count."
      },
      {
        stem: "`len(\"café\")` is 4 but `len(\"café\".encode(\"utf-8\"))` is 5. Which statement explains this correctly?",
        options: [
          "The string contains an invisible character that encoding exposes",
          "`str` counts characters; UTF-8 encodes `é` as two bytes, so the byte length is larger",
          "`encode` appends a null terminator byte",
          "UTF-8 always uses two bytes per character, so the counts diverge for any string"
        ],
        answer: 1,
        why: "UTF-8 is variable-width: ASCII characters take one byte, `é` takes two, many CJK characters take three, and most emoji take four. So byte length is greater than or equal to character length, and they differ exactly when non-ASCII is present. This is the mechanism behind the `VARCHAR(50)` scenario — Python validated characters, the database counted bytes, and only users with accented names hit the limit."
      },
      {
        stem: "Which is the correct way to include a user-supplied `user_id` in a SQL query?",
        lang: "python",
        code: `# A
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
# B
cursor.execute("SELECT * FROM users WHERE id = " + str(user_id))
# C
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
# D
cursor.execute("SELECT * FROM users WHERE id = %s" % user_id)`,
        options: [
          "A — f-strings are the modern approach and handle escaping",
          "C — the value is passed separately so the driver can parameterise it",
          "B — explicit `str()` conversion prevents type confusion",
          "D — `%` formatting is the documented DB-API style"
        ],
        answer: 1,
        why: "Only C parameterises. A, B and D all build one string before the driver sees it, so a `user_id` of `\"1 OR 1=1\"` becomes part of the query — classic SQL injection. D is especially deceptive because `%s` appears in it, but `%` formatting happens in Python before `execute` is called; the placeholder must reach the driver intact, with the values in a separate argument. The `%s` in C is the driver's placeholder, not Python string formatting."
      },
      {
        stem: "Why is building a large string with `s += chunk` in a loop slow?",
        options: [
          "The `+=` operator is unoptimised compared to `+`",
          "Strings are immutable, so each `+=` allocates a new string and copies everything accumulated so far — O(n²) total",
          "Python re-encodes the string to UTF-8 on every concatenation",
          "The garbage collector runs after each concatenation"
        ],
        answer: 1,
        why: "Immutability means the existing string cannot be extended, so each iteration allocates a fresh string and copies all previous content into it. Over n iterations that averages n/2 characters copied each time — quadratic work for a linear task. `\"\".join(parts)` computes the total length once, allocates a single buffer and fills it, which is linear. CPython does have an in-place optimisation that sometimes hides this, but it is an unguaranteed implementation detail that vanishes as soon as a second reference exists."
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
        q: "What is the difference between str and bytes, and when do you convert?",
        strong: "`str` is a sequence of Unicode code points; `bytes` is a sequence of integers 0–255. Convert at the boundaries — decode as data arrives from a file, socket or database, encode as it leaves — and keep everything in between as `str`. Python 3 refuses implicit conversion deliberately, because Python 2's willingness to do it was a major bug source.",
        answer: [
          { t: "p", text: "The pattern has a name worth using: the Unicode sandwich — bytes on the outside, text in the middle. Naming it signals you have internalised the shape rather than memorised two type names." },
          { t: "p", text: "A strong follow-through is explaining *why* late decoding hurts: once bytes leak into your logic, `len()` reports the wrong number, slicing can split a character in half, and comparisons against text silently fail. The failures are quiet, which is what makes them expensive." }
        ]
      },
      {
        level: "core",
        q: "You get a UnicodeDecodeError reading a file. How do you fix it?",
        strong: "Find the actual encoding rather than suppressing the error. Check whether the source documents one, try UTF-8 first, and use `charset-normalizer` to detect it for legacy files. `errors=\"ignore\"` and `\"replace\"` do not fix anything — they turn a loud failure into silent data loss.",
        answer: [
          { t: "p", text: "The interviewer is testing whether you treat an exception as information or as an obstacle. Anyone can make this error disappear; the question is what disappears with it." },
          { t: "p", text: "Strong answers name where the mismatch usually comes from: a file exported from Excel as `cp1252`, a legacy system emitting `latin-1`, or an `open()` call with no `encoding=` running on a Windows machine with a non-UTF-8 default." },
          { t: "p", text: "It is worth stating the one case where lossy decoding is legitimate — a best-effort search index or a log line, where imperfect text beats a crashed pipeline. Showing you know when the shortcut is acceptable is stronger than treating it as always forbidden." }
        ],
        weak: "Reaching immediately for `errors=\"ignore\"`. It produces code that appears to work while quietly deleting characters, and the corruption is discovered much later by someone who cannot trace it back."
      },
      {
        level: "advanced",
        q: "A validation of `len(name) <= 50` passes in Python but the database rejects the insert. Why?",
        strong: "Python's `len()` counts characters. The database column may count bytes, and a non-ASCII name encodes to more bytes than characters. Validate in the unit the constraint is expressed in — `len(name.encode(\"utf-8\")) <= 50` if the limit is bytes.",
        answer: [
          { t: "p", text: "This question separates people who have shipped internationalised software from people who have not, because it is invisible when every test fixture is ASCII." },
          { t: "p", text: "The strongest answers point out that there are three plausible units, not two: bytes, code points, and user-perceived characters (grapheme clusters). An emoji with a skin-tone modifier is one perceived character, two code points and eight UTF-8 bytes. Which one your validation should use depends entirely on what the constraint is protecting." },
          { t: "p", text: "Close on the general principle: **the unit of a limit is part of its specification.** When a constraint crosses a system boundary, confirm the unit rather than assuming it matches yours — and add a non-ASCII fixture to the test suite, because that is what makes the bug visible before a user finds it." }
        ]
      }
    ]
  }
});

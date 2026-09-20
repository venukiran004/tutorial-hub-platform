/* ============================================================================
   LESSON 7.2 — CSV, JSON and Structured Text
   ========================================================================= */
EC.receiveLesson({
  id: "7.2",

  lede: "The stdlib readers are correct. The data loss happens on either side of them. **A CSV has exactly one type — text — and JSON has six, none of which are `datetime`, `Decimal`, `set` or `tuple`.** Every quiet corruption in this lesson comes from a value that survived a round trip in a different shape than it went in.",

  objectives: [
    "Explain why splitting a line on commas is wrong, and what the `csv` module does instead",
    "Predict which Python types survive a JSON round trip unchanged, and which come back different",
    "Coerce a CSV row into typed values at the boundary, rejecting bad rows rather than propagating them",
    "Stream a multi-gigabyte dataset with JSON Lines instead of loading one JSON array",
    "Diagnose a corrupted export from the shape of the surviving data"
  ],

  prerequisites: ["7.1", "2.9"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "Why `line.split(\",\")` is wrong", id: "why-csv-module" },

    { t: "p", text: "CSV looks like a format you can parse in one line, and it is not. A field may be quoted, a quoted field may contain a comma, a quoted field may contain a newline, and a quoted field may contain a quote — escaped by doubling it." },

    { t: "code", lang: "python", title: "a perfectly ordinary CSV", code: `
raw = '''order_id,customer,notes,total
1001,"Acme, Inc.",,49.99
1002,"O""Brien Ltd","urgent
call before dispatch",120.00
'''

for line in raw.splitlines()[1:]:
    print(line.split(","))
`,
      out: `['1001', '"Acme', ' Inc."', '', '49.99']
['1002', '"O""Brien Ltd"', '"urgent']
['call before dispatch"', '120.00']`,
      caption: "Three separate failures in two rows: the comma inside `Acme, Inc.` split one field into two, the doubled quote was never unescaped, and the embedded newline turned one record into two. Row 2 has three fields, row 3 has two, and neither has the four the header promised."
    },

    { t: "code", lang: "python", title: "the same data, read properly", code: `
import csv
import io

reader = csv.DictReader(io.StringIO(raw))
for row in reader:
    print(row)
`,
      out: `{'order_id': '1001', 'customer': 'Acme, Inc.', 'notes': '', 'total': '49.99'}
{'order_id': '1002', 'customer': 'O"Brien Ltd', 'notes': 'urgent\\ncall before dispatch', 'total': '120.00'}`,
      caption: "Two records, four fields each, quotes unescaped and the embedded newline preserved inside the field where it belongs. `DictReader` consumed the first line as `fieldnames` automatically."
    },

    { t: "callout", kind: "trap", title: "`newline=\"\"` is not optional, and it is not about line endings you can see", body: [
      { t: "p", text: "Every example in the `csv` documentation opens files with `newline=\"\"`. It looks like a style detail. It is a correctness requirement, and the reason is the layering from Lesson 7.1." },
      { t: "p", text: "Text mode translates line endings. On read it converts `\\r\\n` and `\\r` to `\\n`; on write it converts `\\n` to whatever the platform uses. The `csv` module handles line endings itself, because it must distinguish a newline **inside a quoted field** from a newline that **ends a record**. Two layers translating independently is one translation too many." },
      { t: "code", lang: "python", title: "the observable damage", numbered: false, code: `
import csv
from pathlib import Path

rows = [["id", "note"], ["1", "line one\\nline two"]]

# WRONG: no newline=""
with Path("bad.csv").open("w", encoding="utf-8") as f:
    csv.writer(f).writerows(rows)

# On Windows every record separator becomes \\r\\r\\n -- a blank line
# between every row, and readers that trust the file see empty records.
print(repr(Path("bad.csv").read_bytes()))
`,
        out: `b'id,note\\r\\r\\n1,"line one\\r\\r\\nline two"\\r\\r\\n'`},
      { t: "p", text: "The correct form, on every platform, for both reading and writing:" },
      { t: "code", lang: "python", title: "the correct form", numbered: false, code: `
with path.open("r", encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        ...

with path.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["id", "note"])
    writer.writeheader()
    writer.writerows(rows)
`},
      { t: "p", text: "`newline=\"\"` disables translation without leaving text mode, so decoding still happens and `csv` sees the bytes' real line endings. It is four characters and it prevents a bug that only manifests on other people's operating systems." }
    ]},

    { t: "table",
      head: ["Reader/writer detail", "What it does", "When you need it"],
      rows: [
        ["`csv.DictReader(f)`", "Yields `dict` per row, keys from the first line", "Almost always — positional indices rot when a column is inserted"],
        ["`fieldnames=[...]`", "Supplies the header yourself", "Headerless files, or files whose header is wrong"],
        ["`restkey`, `restval`", "Where extra fields go; what missing fields become", "Ragged files — without `restval`, short rows give `None`, not `\"\"`"],
        ["`csv.DictWriter(..., extrasaction=\"raise\")`", "Errors on a dict key not in `fieldnames`", "Default, and correct — `\"ignore\"` silently drops columns"],
        ["`delimiter=\"\\t\"`", "TSV instead of CSV", "Data containing commas; still needs quoting for tabs"],
        ["`quoting=csv.QUOTE_MINIMAL`", "Quote only when required", "Default. `QUOTE_ALL` for consumers that treat bare values as numbers"],
        ["`csv.Sniffer().sniff(sample)`", "Guesses delimiter and quoting", "Unknown third-party exports — verify the guess, never trust it"],
        ["`encoding=\"utf-8-sig\"`", "Strips a leading byte-order mark", "Anything exported from Excel, or your first column name is `\\ufeffid`"]
      ],
      caption: "`csv.field_size_limit()` is the other one worth knowing: the default caps a single field at 128 KB and raises `_csv.Error: field larger than field limit` on anything bigger — typically a file where a stray quote has merged the rest of the document into one field."
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "Everything out of a CSV is a string", id: "csv-typing",
      sub: "The format has no types. You supply them, at the boundary, or you find out later." },

    { t: "p", text: "`DictReader` gives you `{\"total\": \"49.99\"}`, not `{\"total\": 49.99}`. Sorting on it sorts lexicographically — `\"100\"` before `\"99\"`. Summing it concatenates. Comparing it to a number raises `TypeError`. The conversion has to happen somewhere, and the only maintainable place is immediately on read." },

    { t: "ladder",
      title: "Turning a CSV row into typed data",
      rungs: [
        { level: "bad", label: "Convert at the point of use", why: "the same coercion, scattered",
          code: `for row in csv.DictReader(f):
    if float(row["total"]) > 100:
        flag(row)
    total += float(row["total"])
    when = datetime.fromisoformat(row["placed_at"])`,
          note: "`float(row[\"total\"])` appears twice here and will appear eleven more times in the module. Each occurrence is an independent chance to forget the conversion, and an independent place for `ValueError` on a blank field to surface with no context about which row or column caused it." },
        { level: "ok", label: "One parse function", why: "one place to fix, still fragile",
          code: `def parse(row: dict[str, str]) -> dict:
    return {
        "order_id": int(row["order_id"]),
        "total": float(row["total"]),
        "placed_at": datetime.fromisoformat(row["placed_at"]),
    }

orders = [parse(r) for r in csv.DictReader(f)]`,
          note: "Coercion now lives in one function, which is the important move. Two problems remain: `float` for money loses cents to binary rounding, and one bad row anywhere in a million-row file aborts the whole import with a `ValueError` that does not say which row." },
        { level: "best", label: "Typed, located, and survivable", why: "bad rows are data, not crashes",
          code: `from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation

@dataclass(frozen=True, slots=True)
class Order:
    order_id: int
    total: Decimal
    placed_at: datetime

def parse_order(row: dict[str, str], line: int) -> Order:
    """Build an Order, naming the line and column on failure."""
    try:
        return Order(
            order_id=int(row["order_id"]),
            total=Decimal(row["total"]),
            placed_at=datetime.fromisoformat(row["placed_at"]),
        )
    except (KeyError, ValueError, InvalidOperation) as exc:
        raise ValueError(f"line {line}: {exc}") from exc

good: list[Order] = []
bad: list[str] = []
for line, row in enumerate(csv.DictReader(f), start=2):
    try:
        good.append(parse_order(row, line))
    except ValueError as exc:
        bad.append(str(exc))`,
          note: "Three deliberate choices. `Decimal(row[\"total\"])` parses the decimal string exactly, so 49.99 stays 49.99 rather than becoming 49.990000000000002. `start=2` makes the reported line number match what the operator sees in their spreadsheet, because line 1 was the header. And separating `good` from `bad` means a 1.2-million-row import reports 40 rejected rows instead of dying on row 900,000 — which is the difference between a data-quality report and an outage." }
      ]
    },

    { t: "callout", kind: "trap", title: "Four coercions that do the wrong thing quietly", body: [
      { t: "code", lang: "python", title: "each of these is a production bug", numbered: false, code: `
# 1. Booleans. Every non-empty string is truthy.
bool("False")            # True
bool("0")                # True
# correct: row["active"].strip().lower() in {"true", "1", "yes"}

# 2. Money as float. Binary floating point has no exact 0.01.
sum(float(x) for x in ["0.1", "0.2", "0.3"])   # 0.6000000000000001
sum(Decimal(x) for x in ["0.1", "0.2", "0.3"]) # Decimal("0.6")

# 3. Empty versus missing. A CSV cannot express None.
float("")                # ValueError, on every blank optional column
# correct: Decimal(v) if (v := row["total"].strip()) else None

# 4. Leading zeros are data, not decoration.
int("00071")             # 71 -- and the account number is now wrong
`,
        out: `True
True
0.6000000000000001
Decimal('0.6')
ValueError: could not convert string to float: ''
71`},
      { t: "p", text: "The third is the one that reaches production most often, because blank cells are rare in test fixtures and common in real exports. The fourth is the one that does the most damage: postcodes, account numbers, product SKUs and phone numbers look numeric and are not. **If you would never do arithmetic on it, keep it a string.**" },
      { t: "p", text: "`Decimal` is covered in Lesson 1.5, and validating a boundary declaratively rather than by hand is what Pydantic exists for (Lesson 12.3). For a CSV importer of any size, a schema is less code than the coercions above." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "JSON's type map, and what falls off it", id: "json-types" },

    {"kind": "matrix", "title": "JSON's type map", "caption": "JSON has six types; Python has more. Everything that is not in the table needs a default= encoder on the way out and a conversion on the way in — datetimes, Decimals, sets and dataclasses included.", "rows": ["dict", "list / tuple", "str", "int / float", "True / False", "None", "datetime, Decimal, set, dataclass"], "cols": ["JSON"], "cells": [[{"text": "object", "tone": "good"}], [{"text": "array (tuple → list)", "tone": "good"}], [{"text": "string", "tone": "good"}], [{"text": "number", "tone": "good"}], [{"text": "true / false", "tone": "good"}], [{"text": "null", "tone": "good"}], [{"text": "TypeError — needs default=", "tone": "crit"}]], "t": "diagram", "id": "dg-7_2-03-0"},



    { t: "p", text: "JSON has six types: object, array, string, number, boolean and null. Python has hundreds. The mapping is therefore *onto*, not one-to-one, and several Python types map to the same JSON type — which means the return trip cannot restore what you started with." },

    { t: "viz",
      title: "What a JSON round trip preserves, and what it flattens",
      caption: "Types on the left that share an arrow head cannot be told apart on the way back. The four at the bottom do not encode at all — json.dumps raises TypeError, which is the good case, because a value that raises is a value you fix rather than a value you lose.",
      svg: `<svg viewBox="0 0 900 380" role="img" aria-label="Diagram mapping Python types through JSON and back, showing which types are flattened and which raise TypeError">
  <defs>
    <marker id="j1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
    <marker id="j2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--warn)"/>
    </marker>
  </defs>

  <text x="20" y="20" class="s-sub" style="font-weight:700;letter-spacing:.08em">PYTHON IN</text>
  <text x="352" y="20" class="s-sub" style="font-weight:700;letter-spacing:.08em">JSON</text>
  <text x="600" y="20" class="s-sub" style="font-weight:700;letter-spacing:.08em">PYTHON BACK OUT</text>

  <rect x="20" y="32" width="110" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="75" y="49" text-anchor="middle" class="s-mono">dict</text>
  <rect x="20" y="64" width="110" height="26" rx="6" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
  <text x="75" y="81" text-anchor="middle" class="s-mono">list</text>
  <rect x="20" y="96" width="110" height="26" rx="6" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
  <text x="75" y="113" text-anchor="middle" class="s-mono">tuple</text>
  <rect x="20" y="128" width="110" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="75" y="145" text-anchor="middle" class="s-mono">str</text>
  <rect x="20" y="160" width="110" height="26" rx="6" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
  <text x="75" y="177" text-anchor="middle" class="s-mono">int</text>
  <rect x="20" y="192" width="110" height="26" rx="6" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
  <text x="75" y="209" text-anchor="middle" class="s-mono">float</text>
  <rect x="20" y="224" width="110" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="75" y="241" text-anchor="middle" class="s-mono">bool</text>
  <rect x="20" y="256" width="110" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="75" y="273" text-anchor="middle" class="s-mono">None</text>

  <rect x="292" y="32" width="120" height="26" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="352" y="49" text-anchor="middle" class="s-mono">object</text>
  <rect x="292" y="80" width="120" height="26" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="352" y="97" text-anchor="middle" class="s-mono">array</text>
  <rect x="292" y="128" width="120" height="26" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="352" y="145" text-anchor="middle" class="s-mono">string</text>
  <rect x="292" y="176" width="120" height="26" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="352" y="193" text-anchor="middle" class="s-mono">number</text>
  <rect x="292" y="224" width="120" height="26" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="352" y="241" text-anchor="middle" class="s-mono">true / false</text>
  <rect x="292" y="256" width="120" height="26" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <text x="352" y="273" text-anchor="middle" class="s-mono">null</text>

  <line x1="130" y1="45" x2="288" y2="45" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#j1)"/>
  <line x1="130" y1="77" x2="288" y2="91" style="stroke:var(--warn)" stroke-width="1.4" marker-end="url(#j2)"/>
  <line x1="130" y1="109" x2="288" y2="95" style="stroke:var(--warn)" stroke-width="1.4" marker-end="url(#j2)"/>
  <line x1="130" y1="141" x2="288" y2="141" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#j1)"/>
  <line x1="130" y1="173" x2="288" y2="187" style="stroke:var(--warn)" stroke-width="1.4" marker-end="url(#j2)"/>
  <line x1="130" y1="205" x2="288" y2="191" style="stroke:var(--warn)" stroke-width="1.4" marker-end="url(#j2)"/>
  <line x1="130" y1="237" x2="288" y2="237" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#j1)"/>
  <line x1="130" y1="269" x2="288" y2="269" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#j1)"/>

  <line x1="412" y1="45" x2="576" y2="45" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#j1)"/>
  <line x1="412" y1="93" x2="576" y2="93" style="stroke:var(--warn)" stroke-width="1.4" marker-end="url(#j2)"/>
  <line x1="412" y1="141" x2="576" y2="141" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#j1)"/>
  <line x1="412" y1="189" x2="576" y2="189" style="stroke:var(--warn)" stroke-width="1.4" marker-end="url(#j2)"/>
  <line x1="412" y1="237" x2="576" y2="237" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#j1)"/>
  <line x1="412" y1="269" x2="576" y2="269" style="stroke:var(--border-strong)" stroke-width="1.3" marker-end="url(#j1)"/>

  <rect x="582" y="32" width="298" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="596" y="49" class="s-mono">dict  — but every key is now a str</text>
  <rect x="582" y="80" width="298" height="26" rx="6" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
  <text x="596" y="97" class="s-mono">list  — a tuple never comes back</text>
  <rect x="582" y="128" width="298" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="596" y="145" class="s-mono">str</text>
  <rect x="582" y="176" width="298" height="26" rx="6" style="fill:var(--warn-soft);stroke:var(--warn-line)" stroke-width="1"/>
  <text x="596" y="193" class="s-mono">int or float — by literal shape</text>
  <rect x="582" y="224" width="298" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="596" y="241" class="s-mono">bool</text>
  <rect x="582" y="256" width="298" height="26" rx="6" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="596" y="273" class="s-mono">None</text>

  <rect x="20" y="304" width="860" height="62" rx="9" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="36" y="326" class="s-sub" style="fill:var(--crit);font-weight:600">NO MAPPING AT ALL — json.dumps raises TypeError:</text>
  <text x="36" y="345" class="s-mono">set    frozenset    bytes    Decimal    datetime    date    UUID    complex    your classes</text>
  <text x="36" y="360" class="s-sub" style="fill:var(--ink-2)">Supply a default= hook to encode them, and an object_hook to decode them. Only one of those is usually written.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the round trips that do not round-trip", code: `
import json

original = {
    1: "int key",
    "coords": (51.5, -0.12),
    "tags": {"eu", "priority"},
}

print(json.dumps({k: v for k, v in original.items() if k != "tags"}))
`,
      out: `{"1": "int key", "coords": [51.5, -0.12]}`,
      caption: "The integer key silently became the string `\"1\"`, and the tuple silently became a list. Neither raised. The set was excluded here because it does not encode at all."
    },

    { t: "code", lang: "python", title: "and what the asymmetry costs", code: `
import json

# 1. Integer keys collide with string keys.
json.loads(json.dumps({1: "a", "1": "b"}))

# 2. A tuple used as a coordinate pair comes back mutable and unhashable-safe,
#    so code that did {coords: label} now raises.
kind = type(json.loads(json.dumps({"c": (1, 2)}))["c"])
print(kind)

# 3. A set raises -- loudly, which is the outcome you want.
json.dumps({"tags": {"eu"}})
`,
      out: `{'1': 'b'}
<class 'list'>
TypeError: Object of type set is not JSON serializable`,
      hl: [4, 13],
      caption: "Case 1 is data loss with no warning: two distinct keys became one, last-write-wins. Case 3 is the same category of problem reported as an exception. **A `TypeError` from `json.dumps` is a feature** — it is the encoder refusing to guess."
    },

    { t: "callout", kind: "trap", title: "The `json` module emits invalid JSON by default", body: [
      { t: "p", text: "`NaN`, `Infinity` and `-Infinity` are not in the JSON specification. Python's encoder writes them anyway, as bare literals, because its own decoder accepts them:" },
      { t: "code", lang: "python", title: "valid Python, invalid JSON", numbered: false, code: `
import json

json.dumps({"score": float("nan"), "cap": float("inf")})
`,
        out: `'{"score": NaN, "cap": Infinity}'`},
      { t: "p", text: "Python reads that back correctly, so the problem is invisible until a consumer that follows the specification touches it. `JSON.parse` in a browser throws `SyntaxError`. Go's `encoding/json` errors. PostgreSQL's `jsonb` rejects the document. Most JSON schema validators reject it. **The file is only readable by the language that wrote it.**" },
      { t: "p", text: "Where do NaNs come from? Not from you typing them. They come from pandas, where a missing value in a numeric column *is* `NaN` (Lesson 15.2), and from a division that produced no result. So the path is: read a CSV with a blank cell into a DataFrame, `to_dict()`, `json.dumps`, ship it to a JavaScript front end, and the whole payload fails to parse." },
      { t: "p", text: "The defence is one argument:" },
      { t: "code", lang: "python", title: "fail at the encoder, not at the consumer", numbered: false, code: `
json.dumps(payload, allow_nan=False)
`,
        out: `ValueError: Out of range float values are not JSON compliant`},
      { t: "p", text: "Now the failure happens in your process, with your stack trace, before the payload leaves the building. Set it on every boundary that emits JSON to something you do not control." }
    ]},

    { t: "code", lang: "python", title: "encoding the types JSON does not have", code: `
import json
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from uuid import UUID


def encode_extra(obj: object) -> str:
    """Called only for values the standard encoder cannot handle."""
    if isinstance(obj, datetime | date):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return str(obj)          # str, NOT float -- keeps the exact value
    if isinstance(obj, UUID | Path):
        return str(obj)
    raise TypeError(f"cannot serialise {type(obj).__name__}")


payload = {
    "id": UUID("6f1c8e60-1d3f-4a2b-9f3c-77b0a3d5e001"),
    "amount": Decimal("49.99"),
    "created_at": datetime(2024, 6, 1, 9, 30),
}

print(json.dumps(payload, default=encode_extra, allow_nan=False))
`,
      out: `{"id": "6f1c8e60-1d3f-4a2b-9f3c-77b0a3d5e001", "amount": "49.99", "created_at": "2024-06-01T09:30:00"}`,
      hl: [12, 17],
      caption: "`default=` is called only for values the encoder gives up on, so it costs nothing on ordinary data. The `raise TypeError` at the end is essential — without it the function returns `None` for unknown types and every unrecognised object silently becomes `null`."
    },

    { t: "callout", kind: "insight", title: "The return half is the half nobody writes", body: [
      { t: "p", text: "`default=` converts `Decimal(\"49.99\")` to the string `\"49.99\"`. `json.loads` has no way to know that string was ever a `Decimal`, so it hands you back a `str` and your arithmetic raises `TypeError` three functions later." },
      { t: "p", text: "**JSON encoding is lossy unless the decoder shares the encoder's conventions.** You have two honest options:" },
      { t: "ul", items: [
        "**Write an `object_hook`** that reconstructs types by key name or by a type tag — workable, and exactly the hand-rolled schema that libraries exist to replace.",
        "**Declare the schema once** and let a validator do both directions. Pydantic (Lesson 12.3) turns `\"2024-06-01T09:30:00\"` back into a `datetime` and `\"49.99\"` back into a `Decimal` because the model says what the field is. For anything crossing a service boundary this is the answer."
      ]},
      { t: "p", text: "What you must not do is encode with `default=str` and decode with nothing, then treat the result as if it had types. That is the shape of every \"why is this field a string in production\" bug." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Streaming: JSON Lines", id: "ndjson" },

    { t: "p", text: "`json.load(f)` builds the entire document as Python objects before returning. There is no partial parse and no streaming mode, because a JSON array is only valid once its closing bracket has been read. A 4 GB array of records therefore costs you 4 GB of file plus the considerably larger in-memory object graph — a dict of five short keys costs roughly 400 bytes, so ten million of them is 4 GB of RAM before you have processed anything." },

    { t: "p", text: "**JSON Lines** — one complete JSON object per line, no enclosing array, no commas between records — removes the problem without a new library. Every line is independently parseable, so the file streams." },

    { t: "tabs", items: [
      { label: "One big array", blocks: [
        { t: "code", lang: "python", title: "orders.json — does not stream", code: `
import json
from pathlib import Path

# Writing: the whole list must exist in memory first
Path("orders.json").write_text(
    json.dumps([o.as_dict() for o in orders]), encoding="utf-8"
)

# Reading: peak memory is the entire object graph
with Path("orders.json").open(encoding="utf-8") as f:
    for order in json.load(f):
        process(order)
`},
        { t: "p", text: "Fine below a few tens of megabytes, and it is the right choice for a config file or an API response, where the document is a single object rather than a stream of records. Above that it is a memory cliff with no gradual warning." }
      ]},
      { label: "JSON Lines", blocks: [
        { t: "code", lang: "python", title: "orders.jsonl — constant memory", code: `
import json
from pathlib import Path

# Writing: one record at a time, nothing accumulates
with Path("orders.jsonl").open("w", encoding="utf-8") as f:
    for order in orders:
        f.write(json.dumps(order.as_dict(), allow_nan=False) + "\\n")

# Reading: one record at a time, and a bad line is one bad record
with Path("orders.jsonl").open(encoding="utf-8") as f:
    for lineno, line in enumerate(f, start=1):
        if not line.strip():
            continue
        try:
            process(json.loads(line))
        except json.JSONDecodeError as exc:
            log.warning("line %d unparseable: %s", lineno, exc)
`,
          hl: [7, 17]},
        { t: "p", text: "Two properties you get for free and would otherwise have to build. **Appending is trivial** — open in `\"a\"` mode and write a line, with no need to rewrite a closing bracket. And **a truncated file is still 99.99% usable**, because the damage is confined to the final line rather than invalidating the entire document." }
      ]},
      { label: "When you are handed an array", blocks: [
        { t: "code", lang: "bash", title: "terminal", code: `
# Convert an existing array to JSON Lines without loading it
$ jq -c '.[]' orders.json > orders.jsonl

# Or, in Python, with an incremental parser
$ pip install ijson`},
        { t: "code", lang: "python", title: "streaming an array you cannot change", code: `
import ijson

with open("orders.json", "rb") as f:
    for order in ijson.items(f, "item"):    # "item" = each array element
        process(order)
`},
        { t: "p", text: "`ijson` is a genuine incremental parser and it is the right tool when the format is not yours to choose. It is roughly an order of magnitude slower than `json.load` per record, which is an easy trade against not being able to load the file at all." }
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A CSV importer that reports instead of crashing",
      difficulty: "core",
      minutes: 32,
      body: [
        { t: "p", text: "Convert a messy orders CSV into typed JSON Lines. The input is a realistic export: an Excel byte-order mark, quoted fields containing commas and newlines, blank optional cells, a monetary column, a leading-zero account number, and a handful of rows that are genuinely bad." },
        { t: "p", text: "The output is two files — the valid records as JSON Lines, and a rejection report naming the spreadsheet line and the reason for each row you refused. An importer that dies on row 900,000 is unusable; an importer that silently skips 40 rows is worse." }
      ],
      requirements: [
        "Read the CSV with `csv.DictReader`, `encoding=\"utf-8-sig\"` and `newline=\"\"`. Explain in a comment why each of those two arguments is there.",
        "Coerce each row into a frozen dataclass: `order_id: int`, `account: str`, `total: Decimal`, `placed_at: datetime`, `notes: str | None`.",
        "Keep `account` as a string — the fixture has `00071` and it must survive as `00071`.",
        "A blank `total` is invalid; a blank `notes` becomes `None`. Do not let either produce a crash.",
        "Write valid records to `orders.jsonl`, one JSON object per line, streaming — never build a list of all records.",
        "Serialise `Decimal` as a string and `datetime` with `isoformat()`, via a `default=` hook that raises `TypeError` on anything it does not recognise. Pass `allow_nan=False`.",
        "Write rejects to `rejects.csv` with the original line number, the offending column and the reason.",
        "Print a summary: rows read, accepted, rejected. Exit non-zero if the rejection rate exceeds 1%."
      ],
      hint: "Line numbers are the part everyone gets wrong. `enumerate(reader, start=2)` gives the spreadsheet row, because the header consumed line 1 — but only for files with no embedded newlines. `reader.line_num` is the authoritative count of physical lines consumed so far, which is what an operator needs when a quoted field spans three lines. Use `reader.line_num`, and check what it reports for the multi-line row in your fixture.",
      solution: {
        lang: "python",
        title: "import_orders.py",
        code: `import csv
import json
import sys
from dataclasses import asdict, dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path


@dataclass(frozen=True, slots=True)
class Order:
    order_id: int
    account: str
    total: Decimal
    placed_at: datetime
    notes: str | None


class RowError(ValueError):
    """One row failed validation. Carries the column that failed."""

    def __init__(self, column: str, reason: str) -> None:
        super().__init__(f"{column}: {reason}")
        self.column = column
        self.reason = reason


def parse_row(row: dict[str, str]) -> Order:
    def required(name: str) -> str:
        value = (row.get(name) or "").strip()
        if not value:
            raise RowError(name, "required value is blank")
        return value

    try:
        order_id = int(required("order_id"))
    except ValueError as exc:
        raise RowError("order_id", str(exc)) from exc

    try:
        total = Decimal(required("total"))
    except InvalidOperation as exc:
        raise RowError("total", f"not a decimal: {row.get('total')!r}") from exc
    if total < 0:
        raise RowError("total", f"negative: {total}")

    try:
        placed_at = datetime.fromisoformat(required("placed_at"))
    except ValueError as exc:
        raise RowError("placed_at", str(exc)) from exc

    notes = (row.get("notes") or "").strip() or None

    # account is NOT coerced: 00071 is an identifier, not a number.
    return Order(
        order_id=order_id,
        account=required("account"),
        total=total,
        placed_at=placed_at,
        notes=notes,
    )


def encode_extra(obj: object) -> str:
    if isinstance(obj, Decimal):
        return str(obj)                 # exact; float() would not be
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"cannot serialise {type(obj).__name__}")


def run(src: Path, out: Path, rejects: Path) -> int:
    read = accepted = 0
    bad: list[tuple[int, str, str]] = []

    # utf-8-sig strips the BOM Excel writes; without it the first
    # fieldname is "\\ufefforder_id" and every lookup on it fails.
    # newline="" stops text mode translating line endings, which would
    # corrupt the newlines inside quoted fields.
    with (
        src.open(encoding="utf-8-sig", newline="") as f_in,
        out.open("w", encoding="utf-8") as f_out,
    ):
        reader = csv.DictReader(f_in)
        for row in reader:
            read += 1
            line = reader.line_num          # physical line, multi-line safe
            try:
                order = parse_row(row)
            except RowError as exc:
                bad.append((line, exc.column, exc.reason))
                continue
            f_out.write(
                json.dumps(asdict(order), default=encode_extra, allow_nan=False)
                + "\\n"
            )
            accepted += 1

    with rejects.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["line", "column", "reason"])
        w.writerows(bad)

    rate = len(bad) / read if read else 0.0
    print(f"read {read}  accepted {accepted}  rejected {len(bad)}  ({rate:.2%})")
    return 1 if rate > 0.01 else 0


if __name__ == "__main__":
    sys.exit(
        run(Path("orders.csv"), Path("orders.jsonl"), Path("rejects.csv"))
    )`,
        out: `$ python import_orders.py
read 6  accepted 3  rejected 3  (50.00%)
$ echo $?
1

$ cat orders.jsonl
{"order_id": 1001, "account": "00071", "total": "49.99", "placed_at": "2024-06-01T09:30:00", "notes": null}
{"order_id": 1002, "account": "00318", "total": "120.00", "placed_at": "2024-06-01T11:02:14", "notes": "urgent\\ncall before dispatch"}
{"order_id": 1004, "account": "01920", "total": "0.00", "placed_at": "2024-06-02T08:00:00", "notes": "Acme, Inc. — replacement"}

$ cat rejects.csv
line,column,reason
5,total,required value is blank
6,placed_at,Invalid isoformat string: '01/06/2024'
7,total,negative: -12.50`,
        notes: [
          { t: "p", text: "**`reader.line_num` rather than `enumerate`** is the detail the hint was pointing at. `enumerate(reader, start=2)` counts *records*, so once a quoted field contains two newlines every subsequent number is wrong — and it is wrong by a growing amount, which is worse than being wrong by a constant. `line_num` is the reader's count of physical lines consumed, which is what the operator sees in their spreadsheet. Getting this right is the difference between a rejection report someone can act on and one they stop trusting." },
          { t: "callout", kind: "insight", title: "Why `RowError` carries a column", body: [
            { t: "p", text: "A rejection report saying \"line 6 failed\" makes the operator open the file and guess. One saying \"line 6, column `placed_at`, Invalid isoformat string: `01/06/2024`\" tells them the export is using British date format and needs one setting changed upstream." },
            { t: "p", text: "That is the reason for a custom exception type here rather than a bare `ValueError` with a formatted message: the structured fields survive to the CSV writer, so the report has columns you can group and count by. Lesson 6.3 covers building exceptions that carry data instead of only text." }
          ]},
          { t: "p", text: "**`Decimal` all the way through, and `str` on the way out.** `Decimal(\"49.99\")` parses the decimal string exactly; `float(\"49.99\")` is already 49.990000000000002 before you have done anything with it. Serialising it as a JSON string rather than a number is deliberate: a JSON number is a float to almost every consumer, so writing `49.99` unquoted hands the precision problem to whoever reads the file. A string forces the reader to make an explicit decision, which is what you want at a boundary." },
          { t: "p", text: "**The 1% threshold with a non-zero exit** turns this into something a scheduler can act on. Three rejected rows out of a million is a data-quality ticket; 500,000 rejected rows means the upstream export changed format and a pipeline that reported success would keep loading a half-empty table every night. Streaming the good rows out as you go, rather than accumulating a list, is what makes the same script work unchanged on a 40 GB input." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A daily reconciliation job compares order totals from an internal service against a partner's CSV. Every day the totals disagree by a few pence across a few hundred thousand rows. The engineer who wrote it added a tolerance of one penny per row, and the job has been green for a year." },
      { t: "p", text: "**The mechanism is `float`, and the tolerance is hiding it.** The importer coerced `total` with `float(row[\"total\"])`. Binary floating point cannot represent 0.01 exactly, so each value is off by a fraction of a penny and the errors accumulate across the sum — Lesson 1.5 covers why. The per-row tolerance passes because each individual row is nearly right; the aggregate is wrong by pounds and nobody is comparing aggregates." },
      { t: "p", text: "**How it was found:** a partner queried a £3 discrepancy on a monthly invoice. Reconstructing the month from the JSON Lines archive with `Decimal` instead of `float` reproduced the partner's number exactly." },
      { t: "p", text: "**The fix is two lines and one deletion.** Parse with `Decimal(row[\"total\"])`, serialise with `str()` rather than as a bare JSON number, and remove the tolerance entirely — with exact decimal arithmetic the comparison is either equal or a genuine discrepancy. The tolerance was not a workaround for floating point; it was the thing preventing anyone from noticing floating point." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**Never split a CSV line on commas.** Quoted fields legitimately contain commas, doubled quotes and newlines; the `csv` module handles all three and hand-rolled parsing handles none.",
    "Open CSV files with `newline=\"\"` on both read and write. Text mode's newline translation and the `csv` module's own record handling are two layers doing the same job, and together they corrupt embedded newlines.",
    "Use `encoding=\"utf-8-sig\"` for anything from Excel, or the byte-order mark makes your first column name `\\ufeffid` and every lookup on it fails.",
    "**Every CSV value is a `str`.** Coerce once, at the boundary, into a typed object — not repeatedly at each point of use.",
    "`bool(\"False\")` is `True`, `float(\"\")` raises, and `int(\"00071\")` is `71`. If you would never do arithmetic on a value, keep it a string.",
    "**JSON's type map is lossy in one direction**: `tuple` returns as `list`, integer dict keys return as strings, and two keys `1` and `\"1\"` collide into one. None of that raises.",
    "`set`, `bytes`, `Decimal`, `datetime` and `UUID` do not encode at all. The `TypeError` is a feature — supply `default=`, and make it raise on unknown types rather than returning `None`.",
    "`json.dumps` writes `NaN` and `Infinity`, which are not valid JSON. Browsers, Go and PostgreSQL all reject them. Pass `allow_nan=False` on every boundary you do not control.",
    "**Encoding without matching decoding is data loss deferred.** If `Decimal` goes out as a string, something must turn it back — an `object_hook`, or a schema (Lesson 12.3).",
    "`json.load` has no streaming mode, because an array is only valid at its closing bracket. **JSON Lines streams, appends cheaply, and confines truncation damage to one record.**",
    "An importer should reject rows and report them with line numbers, not crash on row 900,000. Use `reader.line_num`, not `enumerate` — records and physical lines diverge as soon as a field contains a newline."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A CSV writer opened without `newline=\"\"` produces a file with a blank line between every row when run on Windows. Why?",
        options: [
          "The `csv` module writes `\\n` and Windows requires `\\r\\n`, so a translation is missing",
          "The `csv` module writes `\\r\\n` itself, and text mode then translates the `\\n` again, producing `\\r\\r\\n`",
          "`DictWriter.writeheader()` emits a trailing newline that must be suppressed",
          "The file needs `encoding=\"utf-8-sig\"`; the BOM is being read as a blank line"
        ],
        answer: 1,
        why: "The `csv` module manages record separators itself — it must, because it has to distinguish a newline inside a quoted field from one that ends a record. It writes `\\r\\n`, then text mode's newline translation converts the `\\n` in that pair to `\\r\\n` as well, giving `\\r\\r\\n`. Nothing is missing; two layers are both doing the job. `newline=\"\"` switches off the text-mode layer while keeping the decoder, which is why it is required for reading too. The BOM is a separate concern and appears once at the start of a file, not between rows."
      },
      {
        stem: "`data = {1: \"a\", \"1\": \"b\"}` is written with `json.dumps` and read back with `json.loads`. What comes back?",
        options: [
          "`{1: \"a\", \"1\": \"b\"}` — keys round-trip because JSON preserves the original types",
          "`{\"1\": \"b\"}` — the integer key was encoded as the string `\"1\"`, colliding with the existing one",
          "A `TypeError`, because JSON object keys must be strings and `1` is not",
          "`{\"1\": \"a\"}` — the first value wins when keys collide"
        ],
        answer: 1,
        why: "JSON object keys are strings only, so the encoder converts `1` to `\"1\"` rather than raising — that conversion is documented behaviour, not an error. The output text therefore contains the key `\"1\"` twice, and the decoder builds the dict by assigning each pair in order, so the later value overwrites the earlier one: last write wins, giving `{\"1\": \"b\"}`. This is silent data loss with no warning anywhere, which is why non-string dict keys should be converted deliberately before encoding rather than left to the encoder."
      },
      {
        stem: "A Python service sends a JSON payload built from a pandas DataFrame. The browser reports `SyntaxError: Unexpected token N in JSON`. The same payload parses fine in a Python test. What is happening?",
        options: [
          "The response is missing a `Content-Type` header so the browser is parsing it as text",
          "A missing numeric value became `NaN`, which Python's encoder emits as a bare literal and which is not valid JSON",
          "The payload exceeds the browser's maximum JSON document size",
          "The encoding is cp1252 and the browser expects UTF-8"
        ],
        answer: 1,
        why: "The token `N` names it exactly: `NaN`. A blank cell in a numeric pandas column is `NaN`, and Python's `json` encoder writes `NaN`, `Infinity` and `-Infinity` as bare literals even though the JSON specification has no such values. Its own decoder accepts them, so every Python-side test passes and the bug is invisible until a spec-compliant parser sees it — the browser, Go, or PostgreSQL's `jsonb`. `allow_nan=False` moves the failure into your process where you can fix it. An encoding mismatch would corrupt characters rather than produce the token `N`, and size limits raise a different error."
      },
      {
        stem: "A CSV importer coerces an `account` column with `int(row[\"account\"])` because it always looks numeric. What breaks?",
        options: [
          "Nothing, provided every account number fits in a 64-bit integer",
          "Accounts with leading zeros lose them — `00071` becomes `71` — and no exception is raised",
          "`int()` raises `ValueError` on leading zeros, so the import fails fast",
          "The values are fine but sort incorrectly, because integers sort numerically"
        ],
        answer: 1,
        why: "`int(\"00071\")` is `71`: leading zeros are legal in a decimal string literal passed to `int()` and are simply discarded. Nothing raises, so the wrong account number is written to the database and only surfaces when a lookup fails or a payment is misapplied. Python 3 integers are arbitrary precision, so width is not the issue. The rule to carry: identifiers that happen to be made of digits — account numbers, postcodes, SKUs, phone numbers — are strings, and the test is whether you would ever do arithmetic on them."
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
        q: "Why would you use the `csv` module rather than `split(\",\")`?",
        strong: "Because CSV is a quoted format, not a delimited one. A field may contain a comma, a newline, or a quote escaped by doubling — all inside quotes. `split(\",\")` breaks on all three, and it breaks by producing rows with the wrong number of fields rather than by raising, so the corruption propagates.",
        answer: [
          { t: "p", text: "Lead with the concrete failure rather than the principle. `1002,\"Acme, Inc.\",49.99` becomes four fields instead of three, and nothing complains. That is more convincing than any statement about robustness." },
          { t: "p", text: "The follow-up that separates experience from reading is `newline=\"\"`. If you can explain that the `csv` module manages record separators itself, and that leaving text mode's newline translation switched on gives you two layers doing the same job, you have plainly written a CSV importer that ran on both Linux and Windows." },
          { t: "p", text: "One more worth having ready: `DictReader` over positional indexing, because `row[3]` silently becomes the wrong column the day someone inserts a field upstream, whereas `row[\"total\"]` raises a `KeyError` you can see." }
        ]
      },
      {
        level: "core",
        q: "What does not survive a JSON round trip in Python?",
        strong: "Tuples come back as lists. Non-string dict keys come back as strings, so `1` and `\"1\"` collide. `set`, `bytes`, `Decimal`, `datetime` and `UUID` do not encode at all and raise `TypeError`. And Python emits `NaN` and `Infinity`, which are not valid JSON and are rejected by every spec-compliant consumer.",
        answer: [
          { t: "p", text: "The structural insight to state is that the mapping is many-to-one: `tuple` and `list` both become `array`, `int` and `float` both become `number`, so the decoder cannot possibly restore the distinction. This is not a gap in the `json` module — it is what the format is." },
          { t: "p", text: "Then split the losses into two piles, because they need different responses. The **silent** ones — tuple, integer keys — need discipline before encoding. The **loud** ones — `Decimal`, `datetime`, `set` — need a `default=` hook, and the `TypeError` is doing you a favour by making the decision explicit." },
          { t: "p", text: "The strongest close is naming the half that gets forgotten: writing a `default=` hook without a matching decoder just relocates the loss. `Decimal` goes out as a string and comes back a string, and the `TypeError` shows up three functions downstream. Either write the `object_hook` or use a schema library that owns both directions." }
        ],
        weak: "Answering \"JSON only supports basic types\" and stopping. It is true and it predicts none of the specific failures, which is what the question is actually probing for."
      },
      {
        level: "advanced",
        q: "You need to export 50 million records for another team to process. What format, and why?",
        strong: "JSON Lines — one JSON object per line. It streams on both write and read at constant memory, appends without rewriting the document, is trivially splittable for parallel consumers, and a truncated file loses one record rather than becoming unparseable. A single JSON array does none of that, because it is only valid once the closing bracket arrives.",
        answer: [
          { t: "p", text: "Frame it around the memory cliff. `json.load` has no streaming mode by construction, so a 4 GB array costs 4 GB of file plus a much larger object graph — a five-key dict is roughly 400 bytes, so ten million of them exceed the RAM of most workers before any processing starts." },
          { t: "p", text: "Then the operational properties, which are what actually decide it in a real team: appending a record is `open(\"a\")` and one `write`; splitting the file across ten consumers is `split -l`; and a job killed mid-export leaves a file whose last line is bad and whose other 49,999,999 records load fine. Those are three separate incidents you have just designed out." },
          { t: "p", text: "Be ready to argue against yourself, because a good interviewer will push. If the consumer is a data warehouse and the records are columnar and homogeneous, **Parquet** beats JSON Lines decisively on size, scan speed and typing — it carries a schema, so `Decimal` and `datetime` stay themselves. JSON Lines wins on heterogeneous or nested records, on being readable with `head` and `grep`, and on needing no dependency at either end. Naming the case where your answer is wrong is what makes the answer credible." }
        ]
      },
      {
        level: "advanced",
        q: "A nightly CSV import has been reporting success for a year, but the totals it produces are slightly wrong. Where do you look?",
        strong: "At the type coercions. `float` on a monetary column, because binary floating point has no exact 0.01 and the error accumulates across a sum. Then at silently swallowed rows — a bare `except` around the parse, or a per-row tolerance in a comparison — because a year of green runs usually means something is suppressing the signal rather than nothing being wrong.",
        answer: [
          { t: "p", text: "This is a diagnosis question, so narrate the narrowing. The totals are wrong but the job succeeds, which means either the values are subtly wrong or some rows are missing. Both live at the same place: the coercion between the string a CSV holds and the typed value the rest of the system uses." },
          { t: "p", text: "The specific mechanism to name is `float` for money: each value is off by a fraction of a penny, so a per-row tolerance passes every row while the aggregate drifts by pounds. Point out that the tolerance is not a workaround for the problem — it is the thing preventing anyone from detecting it. That inversion is the insight the question is looking for." },
          { t: "p", text: "Close on what you would change so it cannot recur: `Decimal` from the boundary inwards, exact comparison with no tolerance, an explicit rejection count in the job's output, and a non-zero exit when the rejection rate crosses a threshold. A job that can only report success has no way to tell you it is broken." }
        ],
        weak: "Going straight to the database or the reporting layer. The values were wrong before they arrived, and every hour spent downstream of the importer is an hour spent looking at correctly stored bad data."
      }
    ]
  }
});

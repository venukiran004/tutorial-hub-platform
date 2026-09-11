/* ============================================================================
   LESSON 5.2 — Encoding, Line Endings and Files That Break
   ========================================================================= */
EC.receiveLesson({
  id: "5.2",

  lede: "**A file is bytes. Text is an interpretation of those bytes, and the interpretation is a decision — usually one the writer made and did not record.** Mojibake, an invisible byte-order mark that renames your first column, and an Excel export that turned every long identifier into scientific notation are all the same failure: the reader assumed something the writer did not do.",

  objectives: [
    "Explain what an encoding is and why UTF-8 is not a safe default assumption",
    "Recognise mojibake and identify which encoding produced it",
    "Detect and strip a byte-order mark",
    "Handle line-ending differences and embedded newlines",
    "Diagnose the specific ways Excel corrupts data on export"
  ],

  prerequisites: ["5.1"],

  blocks: [

    { t: "h2", n: "01", text: "Bytes, text and the mapping between them", id: "encoding" },

    { t: "p", text: "An encoding is a table from characters to byte sequences. **ASCII covers 128 characters in one byte each and every common encoding agrees on those** — which is why encoding bugs hide until the first accented name, currency symbol or em-dash arrives." },

    { t: "dl", items: [
      ["Encoding", "A mapping from characters to bytes. The same bytes decoded with a different encoding give different characters, or an error."],
      ["UTF-8", "Variable-width: ASCII in one byte, most European characters in two, CJK in three, emoji in four. The correct default for anything new."],
      ["Latin-1 / cp1252", "One byte per character, 256 characters. Latin-1 is ISO-8859-1; cp1252 is Windows' near-identical variant with curly quotes and the euro sign in the gaps. Older exports and most `.csv` from Windows Excel."],
      ["Mojibake", "Text decoded with the wrong encoding: `\"café\"` in UTF-8 read as Latin-1 shows `\"cafÃ©\"`. The pattern of garbage identifies the mismatch."],
      ["BOM", "Byte-order mark: the bytes `EF BB BF` at the start of a UTF-8 file. Invisible in most editors, and it becomes part of the first column's name."],
      ["`errors=`", "What to do with bytes that do not decode: `\"strict\"` raises, `\"replace\"` inserts `�`, `\"ignore\"` drops them. Only `strict` tells you something is wrong."]
    ]},

    { t: "viz",
      title: "The same four bytes, two readings",
      caption: "\"café\" encoded as UTF-8 is five bytes. Read those bytes as Latin-1 and the two-byte é becomes two one-byte characters: Ã and ©. The pattern — an accented letter becoming Ã plus a symbol — is the signature of UTF-8 read as Latin-1.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="The bytes of cafe in UTF-8 decoded correctly, and the same bytes decoded as Latin-1 producing mojibake">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">bytes on disk</text>
  <g stroke-width="1.5" style="font-family:var(--mono,monospace)">
    <rect x="30" y="38" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="86" y="38" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="142" y="38" width="56" height="30" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line)"/>
    <rect x="198" y="38" width="56" height="30" style="fill:var(--warn);fill-opacity:.18;stroke:var(--warn)"/>
    <rect x="254" y="38" width="56" height="30" style="fill:var(--warn);fill-opacity:.18;stroke:var(--warn)"/>
  </g>
  <text x="44" y="58" class="s-sub" style="fill:var(--ink-2)">63</text>
  <text x="100" y="58" class="s-sub" style="fill:var(--ink-2)">61</text>
  <text x="156" y="58" class="s-sub" style="fill:var(--ink-2)">66</text>
  <text x="212" y="58" class="s-sub" style="fill:var(--ink-2)">C3</text>
  <text x="268" y="58" class="s-sub" style="fill:var(--ink-2)">A9</text>
  <text x="330" y="58" class="s-sub" style="fill:var(--ink-3)">← five bytes; the last two are one character in UTF-8</text>

  <text x="30" y="118" class="s-label" style="fill:var(--good)">decoded as UTF-8</text>
  <g stroke-width="1.5">
    <rect x="30" y="130" width="56" height="30" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
    <rect x="86" y="130" width="56" height="30" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
    <rect x="142" y="130" width="56" height="30" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
    <rect x="198" y="130" width="112" height="30" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
  </g>
  <text x="52" y="150" class="s-sub" style="fill:var(--ink-2)">c</text>
  <text x="108" y="150" class="s-sub" style="fill:var(--ink-2)">a</text>
  <text x="164" y="150" class="s-sub" style="fill:var(--ink-2)">f</text>
  <text x="248" y="150" class="s-sub" style="fill:var(--ink-2)">é</text>
  <text x="330" y="150" class="s-sub" style="fill:var(--good)">"café" — 4 characters</text>

  <text x="30" y="204" class="s-label" style="fill:var(--crit)">decoded as Latin-1</text>
  <g stroke-width="1.5">
    <rect x="30" y="216" width="56" height="30" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
    <rect x="86" y="216" width="56" height="30" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
    <rect x="142" y="216" width="56" height="30" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
    <rect x="198" y="216" width="56" height="30" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)"/>
    <rect x="254" y="216" width="56" height="30" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)"/>
  </g>
  <text x="52" y="236" class="s-sub" style="fill:var(--ink-2)">c</text>
  <text x="108" y="236" class="s-sub" style="fill:var(--ink-2)">a</text>
  <text x="164" y="236" class="s-sub" style="fill:var(--ink-2)">f</text>
  <text x="220" y="236" class="s-sub" style="fill:var(--ink-2)">Ã</text>
  <text x="276" y="236" class="s-sub" style="fill:var(--ink-2)">©</text>
  <text x="330" y="236" class="s-sub" style="fill:var(--crit)">"cafÃ©" — 5 characters, no error raised</text>
</svg>`
    },

    { t: "code", lang: "python", title: "seeing the bytes, and reading them deliberately", code: `
import pandas as pd
import io

# TEXT IS BYTES PLUS AN ENCODING. The same string, three ways:
"café".encode("utf-8")        # b'caf\\xc3\\xa9'   -- 5 bytes
"café".encode("latin-1")      # b'caf\\xe9'        -- 4 bytes
"café".encode("cp1252")       # b'caf\\xe9'        -- same as latin-1 here
#
# ASCII characters are identical in all three. Everything above 127
# differs. A file of English names looks fine in any encoding until
# the first Zoë or Müller.

# DECODING WITH THE WRONG TABLE -- no error, wrong text:
b"caf\\xc3\\xa9".decode("latin-1")     # 'cafÃ©'  -- MOJIBAKE
b"caf\\xe9".decode("utf-8")           # UnicodeDecodeError -- 0xE9 alone is
                                      # not valid UTF-8
#
# ASYMMETRY: UTF-8 bytes decode "successfully" as Latin-1 (every byte
# is a valid Latin-1 character), producing garbage. Latin-1 bytes
# usually FAIL to decode as UTF-8. So a UnicodeDecodeError means "this
# is probably not UTF-8"; silence does not mean it is.

# THE SIGNATURES, for diagnosis by eye:
#   é -> Ã©      UTF-8 read as Latin-1/cp1252
#   é -> \\ufffd  bytes that could not be decoded, errors="replace"
#   é -> ?       errors="replace" in an ASCII-only output
#   ’ -> â€™     UTF-8 curly apostrophe read as cp1252 (three chars)
#   – -> â€"     UTF-8 en-dash read as cp1252
#   £ -> Â£      UTF-8 pound read as Latin-1
#
# "Ã" followed by a symbol, or "â€" followed by something, is UTF-8
# read as a single-byte encoding. Almost always.

# read_csv: encoding= IS THE ARGUMENT.
# pd.read_csv(f)                            # utf-8 (the default)
# pd.read_csv(f, encoding="cp1252")         # Windows Excel exports
# pd.read_csv(f, encoding="latin-1")        # older systems, mainframes
# pd.read_csv(f, encoding="utf-16")         # some SQL Server exports

# WHEN YOU DO NOT KNOW: look at the bytes.
def sniff(path, n=2000):
    with open(path, "rb") as fh:
        head = fh.read(n)
    result = {"bom_utf8": head.startswith(b"\\xef\\xbb\\xbf"),
              "bom_utf16": head[:2] in (b"\\xff\\xfe", b"\\xfe\\xff")}
    for enc in ("utf-8", "cp1252", "latin-1"):
        try:
            head.decode(enc)
            result[enc] = "decodes"
        except UnicodeDecodeError as e:
            result[enc] = f"fails at byte {e.start}"
    result["high_bytes"] = sum(b > 127 for b in head)
    return result
#
# A file that decodes as UTF-8 AND has high bytes is almost certainly
# UTF-8 -- random Latin-1 bytes rarely form valid UTF-8 sequences. A
# file that fails UTF-8 and decodes as cp1252 is cp1252 (or Latin-1;
# they differ only in 32 characters, and cp1252 is the safer guess
# because it is a superset).

# charset_normalizer / chardet FOR A STATISTICAL GUESS:
# from charset_normalizer import from_bytes
# from_bytes(head).best().encoding
#
# Useful for a batch of unknown files. Wrong often enough on short
# files that a human check on the first accented value is still worth
# doing.

# errors= -- and why "strict" is the only honest one for a pipeline:
b"caf\\xe9".decode("utf-8", errors="replace")     # 'caf\\ufffd'  U+FFFD
b"caf\\xe9".decode("utf-8", errors="ignore")      # 'caf'        SILENTLY SHORTER
#
# "ignore" deletes bytes. A name becomes a different name. An ID
# loses a character. In a pipeline, errors="strict" (the default)
# raises at the first bad byte and tells you where -- which is what
# you want, because the alternative is finding out in a join six
# steps later.
#
# pd.read_csv(f, encoding_errors="replace")   # pandas exposes it too
#
# The one legitimate use of "replace": a one-off exploratory read of a
# file you cannot get re-exported, where seeing 95% of the text
# correctly beats seeing none.

# FIXING MOJIBAKE THAT IS ALREADY IN THE DATA -- the round trip:
bad = "cafÃ©"                                     # UTF-8 read as Latin-1
bad.encode("latin-1").decode("utf-8")             # 'café'
#
# Re-encode with the WRONG table you decoded with, then decode with
# the RIGHT one. This works when the corruption was a single
# mis-decode and every character survived the first table. It fails
# (with an error, usefully) when it was not.

def fix_mojibake(s, wrong="latin-1", right="utf-8"):
    try:
        return s.encode(wrong).decode(right)
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s                                  # not mojibake; leave it

# On a Series, only rows that LOOK like mojibake:
# mask = df["name"].str.contains("Ã|â€", regex=True, na=False)
# df.loc[mask, "name"] = df.loc[mask, "name"].map(fix_mojibake)
`,
      hl: [14, 20, 38, 84],
      caption: "**UTF-8 bytes decode \"successfully\" as Latin-1, producing garbage; Latin-1 bytes usually fail to decode as UTF-8.** A `UnicodeDecodeError` means \"probably not UTF-8\"; silence does not mean it is."
    },

    { t: "callout", kind: "trap", title: "errors=\"ignore\" deletes data", body: [
      { t: "p", text: "It drops every byte that does not decode. `\"Müller\"` in Latin-1 read as UTF-8 with `ignore` becomes `\"Mller\"` — a different name, with no marker that anything was removed." },
      { t: "p", text: "**`errors=\"replace\"` at least leaves a `�` you can count. `errors=\"strict\"` raises and tells you the byte offset.** In a pipeline, strict is the only setting that cannot silently corrupt." },
      { t: "p", text: "The moment you reach for `ignore` to make an error go away, the file's encoding is wrong and that is the thing to fix." }
    ]},

    { t: "h2", n: "02", text: "The byte-order mark", id: "bom" },

    { t: "p", text: "**Windows tools — Excel, Notepad, PowerShell — often write UTF-8 with three invisible bytes at the front.** They are not displayed by editors, they are not whitespace, and `read_csv` makes them part of the first column's name." },

    { t: "code", lang: "python", title: "the invisible bytes that rename your first column", code: `
# WHAT A BOM LOOKS LIKE:
content = "\\ufeffid,name\\n1,ada\\n"       # U+FEFF at the start
content.encode("utf-8")[:6]              # b'\\xef\\xbb\\xbfid'

df = pd.read_csv(io.StringIO(content))
df.columns.tolist()                      # ['\\ufeffid', 'name']
#
# The first column is named "\\ufeffid". It PRINTS as "id". It is not
# "id".
df["id"]                                 # KeyError: 'id'
#
# This is the bug that produces "KeyError on a column I can see in
# the output". Hours have been lost to it.

# THE DIAGNOSIS:
[repr(c) for c in df.columns]            # ["'\\ufeffid'", "'name'"]
df.columns[0] == "id"                    # False
len(df.columns[0])                       # 3, not 2

# THE FIX AT READ TIME:
df = pd.read_csv(io.StringIO(content), encoding="utf-8-sig")
df.columns.tolist()                      # ['id', 'name']
#
# "utf-8-sig" strips a BOM if present and behaves as utf-8 if not.
# It is safe to use as the default for any file that might come from
# Windows -- which is any file.

# THE FIX AFTER THE FACT:
df.columns = df.columns.str.replace("\\ufeff", "", regex=False)
# or
df.columns = [c.lstrip("\\ufeff") for c in df.columns]

# A BOM IN THE MIDDLE OF A FILE -- from concatenating files that each
# had one. It arrives as a character in a data cell:
mid = "id,name\\n1,ada\\n\\ufeffid,name\\n2,bea\\n"
pd.read_csv(io.StringIO(mid))
#     id name
# 0    1  ada
# 1  \\ufeffid name        <- a header row, with a BOM, as data
# 2    2  bea
#
# cat a.csv b.csv > all.csv on Windows-written files does this. The
# fix is to strip the BOM from each file before concatenating, or to
# concatenate with pandas rather than the shell.

# UTF-16 HAS A BOM BY DESIGN, and pandas needs it to know the byte
# order. encoding="utf-16" reads it and strips it. Some SQL Server
# and PowerShell exports are UTF-16; the tell is that the file is
# twice the size you expect and every other byte is 00.
with open("maybe16.csv", "rb") as fh:
    head = fh.read(4)
head[:2] in (b"\\xff\\xfe", b"\\xfe\\xff")    # UTF-16 BOM
b"\\x00" in head                             # null bytes: probably UTF-16

# WRITING: DO NOT ADD ONE, unless Excel is the consumer.
df.to_csv("out.csv", index=False, encoding="utf-8")          # no BOM
df.to_csv("for_excel.csv", index=False, encoding="utf-8-sig")  # with BOM
#
# Excel opening a UTF-8 file WITHOUT a BOM assumes the system code
# page and shows mojibake. With the BOM it reads correctly. So the
# BOM is a courtesy to Excel and a hazard to everything else. Write
# it only when Excel is the destination.
`,
      hl: [6, 10, 22, 60],
      caption: "**The first column is named `\"\\ufeffid\"`. It prints as `\"id\"`. It is not `\"id\"`.** This is the bug behind \"KeyError on a column I can see in the output\", and `encoding=\"utf-8-sig\"` removes it at read time."
    },

    { t: "h2", n: "03", text: "Line endings and embedded newlines", id: "newlines" },

    { t: "code", lang: "python", title: "CRLF, LF, and the field that contains a line break", code: `
# THREE CONVENTIONS:
#   \\n      LF     Unix, macOS, the web
#   \\r\\n    CRLF   Windows, and the CSV RFC
#   \\r      CR     classic Mac OS -- rare now, but exports exist
#
# pandas HANDLES ALL THREE ON READ. Line endings are almost never
# the cause of a read failure. They are the cause of:
#   - a trailing "\\r" on the last column's values when a file is read
#     in a way that only splits on "\\n"
#   - a git diff that shows every line changed
#   - a file that doubles its line count when opened in text mode on
#     Windows with newline="" missing

# THE TRAILING \\r, from reading a CRLF file with the wrong tool:
lines = b"id,name\\r\\n1,ada\\r\\n".decode().split("\\n")
lines                        # ['id,name\\r', '1,ada\\r', '']
#
# Every last field ends in "\\r". "ada\\r" != "ada". Joins fail, groupbys
# split. pandas does not do this; hand-rolled parsing does.
# splitlines() instead of split("\\n") handles all three conventions.

# EMBEDDED NEWLINES -- a field that legitimately contains one:
multi = 'id,note\\n1,"first line\\nsecond line"\\n2,"one line"\\n'
pd.read_csv(io.StringIO(multi))
#    id                    note
# 0   1  first line\\nsecond line
# 1   2                one line
#
# Two DATA rows from three FILE lines. pandas counts quoted newlines
# correctly. Anything that counts lines to count rows -- wc -l, a
# quick sanity check, a chunker that splits on newlines -- gets it
# wrong on this file.

# THE FAILURE: a field with a newline and NO quotes.
broken = "id,note\\n1,first line\\nsecond line\\n2,one line\\n"
pd.read_csv(io.StringIO(broken), on_bad_lines="warn")
#
# "second line" becomes a row with one field. Depending on the
# column count it is padded with NaN or flagged as a bad line. The
# writer failed to quote; there is no reader setting that repairs
# that reliably. The fix is upstream.

# A FIELD-COUNT CHECK catches both the unquoted newline and the
# unquoted comma:
def check_field_counts(path, sep=",", expected=None):
    import csv
    counts = {}
    with open(path, newline="", encoding="utf-8") as fh:
        for i, row in enumerate(csv.reader(fh, delimiter=sep)):
            counts[len(row)] = counts.get(len(row), 0) + 1
    return counts
#
# {3: 10000} is a clean file. {3: 9994, 2: 3, 4: 3} is six broken
# rows, and their line numbers are worth logging.

# WRITING: lineterminator= for a specific target.
# df.to_csv("unix.csv", index=False, lineterminator="\\n")
# df.to_csv("windows.csv", index=False, lineterminator="\\r\\n")
#
# The default is os.linesep. A file written on Windows and committed
# to git gets CRLF; a colleague on macOS sees every line as changed.
# Pin "\\n" for anything that lives in a repository.

# newline="" WHEN OPENING FOR THE csv MODULE -- not pandas, but the
# same file. Without it, on Windows, the csv module writes "\\r\\r\\n"
# and every row is followed by a blank one.
import csv
with open("out.csv", "w", newline="", encoding="utf-8") as fh:
    csv.writer(fh).writerow(["id", "name"])
`,
      hl: [15, 25, 34, 50],
      caption: "**Two data rows from three file lines.** Quoted newlines are handled by pandas and broken by anything that counts lines — `wc -l`, a sanity check, a chunker that splits on `\\n`."
    },

    { t: "h2", n: "04", text: "What Excel does to data", id: "excel" },

    { t: "p", text: "**Excel is not a data tool; it is a presentation tool that saves what it displays.** Every transformation it applies on open is applied to the file on save, and none of them raises. A CSV that has been opened and re-saved in Excel is a different file." },

    { t: "table",
      head: ["What Excel does", "Input", "Output", "Why it matters"],
      rows: [
        ["Strips leading zeros", "`007412`", "`7412`", "Identifiers corrupted; joins fail"],
        ["Scientific notation on long numbers", "`1234567890123456`", "`1.23457E+15`", "Precision lost beyond 15 digits; card and account numbers destroyed"],
        ["Interprets as dates", "`1/2`, `MAR1`, `SEPT2`", "`01-Feb`, `1-Mar`, `02-Sep`", "Gene names and product codes became dates — well documented in genomics"],
        ["Reformats dates", "`2026-03-01`", "`01/03/2026` (locale)", "ISO becomes ambiguous; the format changes with the user's locale"],
        ["Trims trailing spaces", "`\"ada \"`", "`\"ada\"`", "Usually welcome, occasionally a key"],
        ["Converts encoding", "UTF-8", "System code page, or UTF-8 with BOM", "Accented characters corrupted unless the BOM is present"],
        ["Truncates text", "> 32,767 characters", "32,767 characters", "Long JSON or notes fields silently cut"],
        ["Applies the 15-digit limit", "`0.1234567890123456789`", "`0.123456789012346`", "Floats rounded on display and on save"]
      ],
      caption: "**None of these raises, and all of them survive a save.** If a partner opens your CSV in Excel before sending it back, assume every column has been through this table."
    },

    { t: "code", lang: "python", title: "detecting Excel damage after the fact", code: `
# THE TELLS, and a check for each:

def excel_damage_report(df):
    """Heuristics for columns that have been through Excel."""
    findings = {}
    for col in df.columns:
        s = df[col]
        if s.dtype != object and not str(s.dtype).startswith("string"):
            continue
        s = s.dropna().astype(str)
        if not len(s):
            continue

        # SCIENTIFIC NOTATION in a text column -- a long number was
        # displayed as 1.23E+15 and saved that way.
        sci = s.str.fullmatch(r"\\d\\.\\d+E\\+\\d+").sum()

        # DATE-LIKE VALUES in a column that is not a date -- "01-Feb",
        # "1-Mar" where a code like "1/2" or "MAR1" was.
        datey = s.str.fullmatch(r"\\d{1,2}-[A-Z][a-z]{2}").sum()

        # LEADING-ZERO LOSS is invisible in the damaged file. Compare
        # length distribution: identifiers usually have a FIXED width,
        # and stripped zeros produce a spread of shorter lengths.
        lengths = s.str.len()
        width_spread = lengths.nunique() if lengths.nunique() > 1 else 0

        # TRUNCATION at the Excel cell limit.
        truncated = (lengths == 32767).sum()

        found = {k: int(v) for k, v in
                 {"scientific": sci, "date_like": datey,
                  "truncated": truncated}.items() if v}
        if width_spread > 3 and s.str.isdigit().mean() > 0.9:
            found["numeric_with_varying_width"] = int(width_spread)
        if found:
            findings[col] = found
    return findings

# THE 15-DIGIT LIMIT, demonstrated:
card = 1234567890123456          # 16 digits
float(card)                      # 1234567890123456.0 -- fine in Python
# In Excel: 1234567890123450 -- the last digit becomes 0 on entry.
# Saved as CSV: 1.23457E+15. Read back: 1234570000000000. Every
# digit past the sixth is gone.

# THE DEFENCE IS NOT TO LET EXCEL TOUCH IT. Failing that:
#   - ask for the export as .xlsx and read that directly, which at
#     least preserves cell types where the user set them
#   - pd.read_excel(f, dtype=str) reads every cell as displayed text,
#     which is lossy but does not make it worse
#   - ask for identifiers with a prefix ("ID-007412") so Excel treats
#     them as text
#   - ask for a Parquet or JSON export instead

# READING .xlsx DIRECTLY:
# pd.read_excel("export.xlsx", sheet_name="Data", dtype={"account_id": str})
# pd.read_excel("export.xlsx", sheet_name=None)      # dict of every sheet
#
# The same dtype discipline as read_csv applies. read_excel additionally
# returns dates as datetime when Excel stored them as dates -- which is
# good -- and returns "01-Feb" as a datetime when Excel CONVERTED a
# code to a date, which is the corruption, now typed.

# THE GENOMICS CASE, because it is the canonical example:
# Gene symbols SEPT2, MARCH1, DEC1 were converted to dates in a
# large fraction of published supplementary spreadsheets. In 2020
# the genes were RENAMED (SEPTIN2, MARCHF1, DELEC1) because fixing
# Excel was not an option. That is the scale of the problem.
`,
      hl: [16, 38, 46, 60],
      caption: "**Gene symbols were renamed in 2020 because Excel kept turning them into dates and fixing Excel was not an option.** That is the scale of the problem, and it applies to every product code that looks like a month."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Three partner files, three encodings, one loader",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "Three partners send the same schema as CSV. One is UTF-8 with a BOM from Windows Excel, one is cp1252 from an older system, one is UTF-16 from SQL Server. The current loader hard-codes `encoding=\"utf-8\"` and fails on two of them; when it was patched with `errors=\"ignore\"`, names started arriving with letters missing." },
        { t: "p", text: "Write a loader that reads all three correctly, refuses to guess when it cannot tell, and reports what it detected." }
      ],
      requirements: [
        "Detect the encoding from the bytes: BOMs first, then decode attempts.",
        "Strip a BOM so column names are clean.",
        "Never use `errors=\"ignore\"`; a file that cannot be decoded is an error.",
        "Report the detected encoding and whether the file had a BOM.",
        "Detect and report likely mojibake in the loaded text.",
        "Include tests that construct all three files as bytes."
      ],
      hint: "UTF-16 has a BOM and null bytes. UTF-8 with a BOM has three specific bytes. What is left is UTF-8 or cp1252, and only one of those will fail to decode the other's high bytes.",
      solution: {
        lang: "python",
        title: "encoding_loader.py",
        code: `import pandas as pd
import io


# =========================================================================
# DETECTION -- from the bytes, in order of certainty
# =========================================================================

UTF8_BOM = b"\\xef\\xbb\\xbf"
UTF16_LE_BOM = b"\\xff\\xfe"
UTF16_BE_BOM = b"\\xfe\\xff"


def detect_encoding(head: bytes):
    """Return (encoding, has_bom, reason).

    Order matters. A BOM is definitive. Null bytes almost always mean
    UTF-16 even without a BOM. After that, UTF-8 is tried FIRST
    because valid UTF-8 with high bytes is very unlikely to be
    anything else -- whereas any bytes at all decode as cp1252.
    """
    if head.startswith(UTF8_BOM):
        return "utf-8-sig", True, "UTF-8 BOM"
    if head.startswith(UTF16_LE_BOM) or head.startswith(UTF16_BE_BOM):
        return "utf-16", True, "UTF-16 BOM"

    # UTF-16 without a BOM: every other byte is 0x00 for ASCII text.
    if len(head) >= 4 and head.count(b"\\x00") > len(head) * 0.2:
        return "utf-16", False, "null bytes suggest UTF-16"

    high = sum(b > 127 for b in head)
    if high == 0:
        # Pure ASCII: every encoding agrees. Call it utf-8.
        return "utf-8", False, "ASCII only"

    try:
        head.decode("utf-8")
        return "utf-8", False, f"{high} high bytes, valid UTF-8"
    except UnicodeDecodeError as e:
        pass

    # Not UTF-8. cp1252 is a superset of latin-1 for printable
    # characters, so it is the safer of the two single-byte guesses.
    try:
        head.decode("cp1252")
        return "cp1252", False, f"{high} high bytes, not UTF-8, decodes as cp1252"
    except UnicodeDecodeError:
        # cp1252 has five undefined bytes (0x81, 0x8D, 0x8F, 0x90, 0x9D).
        # latin-1 defines every byte. If cp1252 fails, latin-1 will not.
        return "latin-1", False, f"{high} high bytes, not UTF-8 or cp1252"


# =========================================================================
# MOJIBAKE DETECTION -- after loading
# =========================================================================

MOJIBAKE = r"Ã[\\x80-\\xbf©®±²³µ¶·¹º»¼½¾¿]|â€|Â[£¥§©«®°±²³´µ¶·¸¹º»¼½¾¿]"


def mojibake_report(df):
    """Rows per text column matching UTF-8-as-single-byte signatures."""
    out = {}
    for col in df.columns:
        s = df[col]
        if s.dtype == object or str(s.dtype).startswith("string"):
            hits = s.astype("string").str.contains(MOJIBAKE, regex=True, na=False)
            if hits.any():
                out[col] = {"rows": int(hits.sum()),
                            "example": str(s[hits].iloc[0])}
    return out


# =========================================================================
# THE LOADER
# =========================================================================

def load(source, *, sample_bytes=4096, **read_kwargs):
    """Read a CSV of unknown encoding. Raises rather than guessing
    silently; never drops bytes."""
    if isinstance(source, (bytes, bytearray)):
        data = bytes(source)
    else:
        with open(source, "rb") as fh:
            data = fh.read()

    encoding, has_bom, reason = detect_encoding(data[:sample_bytes])

    # STRICT DECODE OF THE WHOLE FILE. If the sample decoded and the
    # rest does not, that is a real finding (a corrupted file, or two
    # files concatenated) and it must not be papered over.
    try:
        text = data.decode(encoding)
    except UnicodeDecodeError as e:
        raise ValueError(
            f"detected {encoding} ({reason}) but byte {e.start} does not "
            f"decode: {data[max(0, e.start-10):e.start+10]!r}. "
            "The file may be corrupted or mixed-encoding."
        ) from e

    # A BOM in the MIDDLE means concatenated files. Report it.
    inner_boms = text.count("\\ufeff")
    text = text.replace("\\ufeff", "")

    df = pd.read_csv(io.StringIO(text), **read_kwargs)

    report = {
        "encoding": encoding,
        "bom": has_bom,
        "reason": reason,
        "inner_boms_removed": inner_boms,
        "rows": len(df),
        "mojibake": mojibake_report(df),
    }
    if report["mojibake"]:
        # Loaded fine, but the TEXT was already wrong before we got
        # it: a previous tool mis-decoded and saved. Not our error to
        # fix silently; it is the partner's to re-export.
        report["warning"] = (
            "mojibake found: the file was mis-decoded upstream before "
            "being saved. Ask for a re-export rather than repairing."
        )
    return df, report


# =========================================================================
# WHY NOT errors="ignore"
# =========================================================================
#
# The patched loader read cp1252 bytes as UTF-8 with errors="ignore".
# Every byte above 127 that is not valid UTF-8 was DELETED:
#     b"M\\xfcller".decode("utf-8", errors="ignore") -> "Mller"
# "Müller" became "Mller". A name. In a customer table. With nothing
# to say it happened.
#
# The strict decode here would have raised at byte 1 with the bytes
# shown, and the detector would have chosen cp1252 anyway.


# =========================================================================
# TESTS -- each file constructed as bytes
# =========================================================================

CSV_TEXT = "id,name,city\\n001,Zoë Müller,Zürich\\n002,José,São Paulo\\n"


def _utf8_bom():
    return UTF8_BOM + CSV_TEXT.encode("utf-8")

def _cp1252():
    return CSV_TEXT.encode("cp1252")

def _utf16():
    return CSV_TEXT.encode("utf-16")          # includes a BOM


def test_utf8_bom_detected_and_stripped():
    df, rep = load(_utf8_bom(), dtype=str)
    assert rep["encoding"] == "utf-8-sig" and rep["bom"]
    assert df.columns[0] == "id"              # not "\\ufeffid"
    assert df["name"].iloc[0] == "Zoë Müller"


def test_cp1252_detected():
    df, rep = load(_cp1252(), dtype=str)
    assert rep["encoding"] == "cp1252"
    assert df["name"].iloc[0] == "Zoë Müller"
    assert df["city"].iloc[1] == "São Paulo"


def test_utf16_detected():
    df, rep = load(_utf16(), dtype=str)
    assert rep["encoding"] == "utf-16" and rep["bom"]
    assert df["name"].iloc[1] == "José"


def test_all_three_give_identical_frames():
    a, _ = load(_utf8_bom(), dtype=str)
    b, _ = load(_cp1252(), dtype=str)
    c, _ = load(_utf16(), dtype=str)
    pd.testing.assert_frame_equal(a, b)
    pd.testing.assert_frame_equal(a, c)


def test_ascii_only_is_utf8():
    df, rep = load(b"id,name\\n1,ada\\n", dtype=str)
    assert rep["encoding"] == "utf-8" and "ASCII" in rep["reason"]


def test_ignore_would_have_deleted_letters():
    """The patched loader's behaviour, shown."""
    assert b"M\\xfcller".decode("utf-8", errors="ignore") == "Mller"


def test_corrupted_file_raises_with_offset():
    data = CSV_TEXT.encode("utf-8") + b"\\xff\\xfe garbage \\xc3"
    try:
        load(data, dtype=str)
        assert False, "should have raised"
    except ValueError as e:
        assert "does not decode" in str(e)


def test_concatenated_files_inner_bom_reported():
    data = _utf8_bom() + _utf8_bom()
    df, rep = load(data, dtype=str, on_bad_lines="skip")
    assert rep["inner_boms_removed"] == 1


def test_mojibake_is_reported_not_repaired():
    """A file that was mis-decoded upstream and saved as UTF-8."""
    already_wrong = "id,name\\n1,ZoÃ« MÃ¼ller\\n".encode("utf-8")
    df, rep = load(already_wrong, dtype=str)
    assert rep["encoding"] == "utf-8"          # it IS valid UTF-8
    assert "name" in rep["mojibake"]
    assert "warning" in rep
    assert df["name"].iloc[0] == "ZoÃ« MÃ¼ller"   # untouched


def test_column_names_clean_in_every_encoding():
    for data in (_utf8_bom(), _cp1252(), _utf16()):
        df, _ = load(data, dtype=str)
        assert list(df.columns) == ["id", "name", "city"]`,
        notes: [
          { t: "p", text: "**Detection runs in order of certainty.** A BOM is definitive; null bytes almost always mean UTF-16; and after that UTF-8 is tried first, because valid UTF-8 with high bytes is very unlikely to be anything else — whereas any bytes at all decode as cp1252." },
          { t: "callout", kind: "trap", title: "\"Müller\" became \"Mller\"", body: [
            { t: "p", text: "The patched loader read cp1252 bytes as UTF-8 with `errors=\"ignore\"`, which deletes every byte that does not decode. **A customer's name changed, in the customer table, with nothing to say it happened.**" },
            { t: "p", text: "The strict decode would have raised at byte 1 with the bytes shown — and the detector would have chosen cp1252 anyway." }
          ]},
          { t: "p", text: "**The whole file is decoded strictly, not just the sample.** A sample that decodes and a tail that does not is a real finding — a corrupted transfer, or two files concatenated — and the error names the byte offset and shows the bytes around it." },
          { t: "p", text: "**Mojibake is reported, not repaired.** A file that arrives as valid UTF-8 containing `\"ZoÃ«\"` was mis-decoded and saved by a previous tool. The round-trip repair usually works, but silently applying it hides that the partner's export is broken — and it fails on the characters that did not survive the first mis-decode." },
          { t: "p", text: "**The three-encodings-one-frame test is the contract.** Whatever bytes arrive, the same schema produces the same frame with the same column names — which is what the original loader, hard-coded to one encoding, could never promise." },
          { t: "p", text: "**An inner BOM means concatenated files**, and it is counted rather than silently removed. `cat a.csv b.csv` on Windows-written files produces exactly this, with the second header row as data." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`df[\"id\"]` raises `KeyError` but `df.columns` prints `['id', 'name']`. What is going on?",
          options: [
            "A pandas display bug",
            "The first column name starts with an invisible byte-order mark — it is `\"\\ufeffid\"`, three characters, not `\"id\"`",
            "The column is the index",
            "The name has a trailing space"
          ],
          answer: 1,
          why: "Windows tools write UTF-8 with a BOM, and `read_csv` makes it part of the first header. `repr(df.columns[0])` shows it; `len()` is 3. `encoding=\"utf-8-sig\"` strips it at read time and is safe as a default for any file that might have come from Windows."
        }
      ]
    }
  ],

  takeaways: [
    "**A file is bytes; text is an interpretation, and the encoding is the interpretation the writer used** — usually unrecorded.",
    "**All common encodings agree on ASCII**, which is why encoding bugs hide until the first accented name.",
    "**UTF-8 bytes decode as Latin-1 without error, producing mojibake; Latin-1 bytes usually fail as UTF-8** — an error means \"not UTF-8\", silence proves nothing.",
    "**`Ã` followed by a symbol, or `â€`, is UTF-8 read as a single-byte encoding** — almost always.",
    "**`errors=\"ignore\"` deletes bytes and changes names**; `\"replace\"` leaves a countable `�`; only `\"strict\"` cannot silently corrupt.",
    "**Mojibake already in the data can be round-tripped**: encode with the wrong table, decode with the right one — when every character survived.",
    "**A BOM becomes part of the first column's name**; it prints invisibly and makes `df[\"id\"]` a `KeyError`.",
    "**`encoding=\"utf-8-sig\"` strips a BOM if present and is plain UTF-8 otherwise** — a safe default.",
    "**Write a BOM only when Excel is the consumer**; it is a courtesy to Excel and a hazard to everything else.",
    "**pandas handles CRLF, LF and quoted embedded newlines** — hand-rolled line splitting is what breaks on them.",
    "**Excel strips leading zeros, applies a 15-digit limit, turns codes into dates and converts encoding on save** — none of it raises.",
    "**Gene symbols were renamed because Excel kept converting them to dates** — assume every column in an Excel-touched file has been through that table."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A column shows `\"cafÃ©\"` where `\"café\"` was expected. What happened?",
        options: [
          "The file is corrupted",
          "UTF-8 bytes were decoded as Latin-1 or cp1252 — the two-byte é became two one-byte characters",
          "The font does not support accents",
          "The file is UTF-16"
        ],
        answer: 1,
        why: "`Ã` followed by a symbol is the signature. The bytes were fine; the reader used the wrong table. Re-read with `encoding=\"utf-8\"`, or if the mojibake was saved upstream, `s.encode(\"latin-1\").decode(\"utf-8\")` round-trips it — but report that the source is mis-exporting."
      },
      {
        stem: "Why is `errors=\"ignore\"` dangerous in a data pipeline?",
        options: [
          "It is slow",
          "It deletes every byte that fails to decode, so names and identifiers silently lose characters",
          "It only works with UTF-8",
          "It raises on the first bad byte"
        ],
        answer: 1,
        why: "`\"Müller\"` in cp1252 read as UTF-8 with ignore becomes `\"Mller\"` — a different name, with no marker. `\"strict\"` raises with the byte offset, which is what you want: the encoding is wrong and that is the thing to fix."
      },
      {
        stem: "A 16-digit card number passed through Excel and came back as `1.23457E+15`. What was lost?",
        options: [
          "Nothing — it is the same number in scientific notation",
          "Every digit past the sixth; Excel displays long numbers in scientific notation and saves what it displays, and its 15-digit limit had already zeroed the last digit",
          "Only the formatting",
          "The leading zero"
        ],
        answer: 1,
        why: "Excel saves the displayed form. Reading `1.23457E+15` back gives `1234570000000000`. The defence is not to let Excel touch identifiers: prefix them so they are text, request `.xlsx` and read with `dtype=str`, or ask for a non-Excel export."
      },
      {
        stem: "A file is twice the size you expect and every other byte is `00`. What is it?",
        options: [
          "Compressed",
          "UTF-16 — ASCII characters take two bytes, one of them zero; read with `encoding=\"utf-16\"`",
          "Binary",
          "Corrupted"
        ],
        answer: 1,
        why: "Some SQL Server and PowerShell exports are UTF-16. The BOM at the start tells the decoder the byte order, and `encoding=\"utf-16\"` reads and strips it. Reading it as UTF-8 either fails or produces a file of null characters between every letter."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "A colleague says their CSV \"has an encoding problem\". What would you look at?",
        strong: "The bytes, not the text. `open(f, \"rb\").read(2000)` — check for a BOM, count bytes above 127, count null bytes, then try decoding as UTF-8. If it decodes with high bytes present, it is UTF-8. If it fails, it is almost certainly cp1252. Null bytes mean UTF-16. And I would ask what the text looks like: `Ã©` is UTF-8 read as Latin-1; `�` is bytes that could not be decoded.",
        answer: [
          { t: "p", text: "Going to the bytes rather than trying encodings until one \"works\" is the difference between diagnosis and guessing." }
        ]
      },
      {
        level: "advanced",
        q: "Why should `errors=\"ignore\"` never appear in a pipeline?",
        strong: "Because it deletes data without a trace. Every byte that fails to decode is dropped, so `\"Müller\"` becomes `\"Mller\"` and nothing records it. `\"replace\"` at least leaves a `�` you can count. `\"strict\"` raises with the byte offset, which is the honest outcome — the encoding is wrong, and reaching for `ignore` is choosing to corrupt rather than to find out.",
        answer: [
          { t: "p", text: "Naming a concrete corruption — a customer's name changing — is what makes this land with someone who sees `ignore` as a harmless fix." }
        ]
      },
      {
        level: "advanced",
        q: "What does opening a CSV in Excel and saving it do to the data?",
        strong: "It applies every display transformation to the file. Leading zeros are stripped, numbers over 15 digits are rounded and long ones become scientific notation, anything that looks like a date becomes one — `MAR1`, `1/2`, `SEPT2` — ISO dates are rewritten in the user's locale, and the encoding becomes the system code page unless a BOM was present. None of it raises. Gene symbols were renamed in 2020 because this could not be fixed on Excel's side.",
        answer: [
          { t: "p", text: "The gene-renaming example is the credibility anchor — it shows the problem is real at scale, not a pedant's complaint." }
        ]
      }
    ]
  }
});

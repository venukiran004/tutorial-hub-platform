/* ============================================================================
   LESSON 5.1 — CSV and the Parsing Decisions
   ========================================================================= */
EC.receiveLesson({
  id: "5.1",

  lede: "**A CSV file contains no types. Every column arrives as text, and `read_csv` guesses what each one meant.** The guesses are usually right, which is what makes the wrong ones dangerous: a postcode that becomes a float, an account number that loses its leading zero, a date parsed month-first because the first row was ambiguous.",

  objectives: [
    "Explain what `read_csv` infers and where inference goes wrong",
    "Pin types with `dtype=` and parse dates with `parse_dates=` explicitly",
    "Handle thousands separators, decimal commas and custom missing markers",
    "Read a file larger than memory in chunks",
    "Write a CSV that round-trips without inventing an index column"
  ],

  prerequisites: ["3.3", "3.4"],

  blocks: [

    { t: "h2", n: "01", text: "What the parser decides for you", id: "inference" },

    { t: "p", text: "`read_csv` reads every field as a string and then, for each column, tries integer, then float, then leaves it as object. **That inference happens per column, per file, on whatever values the file happens to contain** — so the same column can arrive as `int64` on Monday and `float64` on Tuesday because one row was blank." },

    { t: "dl", items: [
      ["Type inference", "The parser's per-column guess: all-digit fields become `int64`, digits with a point become `float64`, anything else becomes `object`. One blank cell turns an integer column into float."],
      ["`dtype=`", "A dict of column → type that **overrides inference**. The only way to get the same types from the same file every time."],
      ["`parse_dates=`", "Which columns to convert to datetime. Without it, dates are strings. With it and without `date_format=`, the format is guessed."],
      ["`na_values=`", "Extra strings to treat as missing, on top of the default list (`\"\"`, `\"NA\"`, `\"null\"`, `\"NaN\"`, `\"#N/A\"` and about a dozen more)."],
      ["`thousands=` / `decimal=`", "The characters used as digit grouping and decimal point. `\"1,234.56\"` is a string until you say `thousands=\",\"`; `\"1.234,56\"` needs both arguments."],
      ["`chunksize=`", "Return an iterator of frames of that many rows instead of one frame. The way to process a file larger than memory."]
    ]},

    { t: "viz",
      title: "Three columns that look like numbers and are not",
      caption: "The parser sees digits and infers a number. The leading zero, the grouping comma and the decimal comma each carry meaning that a numeric dtype destroys.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="Three CSV fields — a postcode with a leading zero, a thousands-grouped amount and a decimal-comma price — shown with what inference produces and what was meant">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">in the file</text>
  <text x="330" y="26" class="s-label" style="fill:var(--crit)">read_csv infers</text>
  <text x="600" y="26" class="s-label" style="fill:var(--good)">what was meant</text>

  <g style="font-family:var(--mono,monospace)">
    <rect x="30" y="44" width="240" height="30" rx="4" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line);stroke-width:1.5"/>
    <text x="44" y="64" class="s-sub" style="fill:var(--ink-2)">account_id = 007412</text>
    <rect x="330" y="44" width="220" height="30" rx="4" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit);stroke-width:1.5"/>
    <text x="344" y="64" class="s-sub" style="fill:var(--crit)">int64: 7412</text>
    <rect x="600" y="44" width="240" height="30" rx="4" style="fill:var(--good);fill-opacity:.12;stroke:var(--good);stroke-width:1.5"/>
    <text x="614" y="64" class="s-sub" style="fill:var(--good)">str: "007412"  dtype={"account_id": str}</text>

    <rect x="30" y="100" width="240" height="30" rx="4" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line);stroke-width:1.5"/>
    <text x="44" y="120" class="s-sub" style="fill:var(--ink-2)">amount = "1,234.56"</text>
    <rect x="330" y="100" width="220" height="30" rx="4" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit);stroke-width:1.5"/>
    <text x="344" y="120" class="s-sub" style="fill:var(--crit)">object: "1,234.56" (a string)</text>
    <rect x="600" y="100" width="240" height="30" rx="4" style="fill:var(--good);fill-opacity:.12;stroke:var(--good);stroke-width:1.5"/>
    <text x="614" y="120" class="s-sub" style="fill:var(--good)">float: 1234.56   thousands=","</text>

    <rect x="30" y="156" width="240" height="30" rx="4" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line);stroke-width:1.5"/>
    <text x="44" y="176" class="s-sub" style="fill:var(--ink-2)">price = 12,50   (EU export)</text>
    <rect x="330" y="156" width="220" height="30" rx="4" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit);stroke-width:1.5"/>
    <text x="344" y="176" class="s-sub" style="fill:var(--crit)">object — or 1250 if , is the sep</text>
    <rect x="600" y="156" width="240" height="30" rx="4" style="fill:var(--good);fill-opacity:.12;stroke:var(--good);stroke-width:1.5"/>
    <text x="614" y="176" class="s-sub" style="fill:var(--good)">float: 12.50   decimal=","  sep=";"</text>
  </g>

  <line x1="30" y1="212" x2="850" y2="212" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="238" class="s-sub" style="fill:var(--ink-3)">None of these raises. The first silently corrupts an identifier; the second leaves arithmetic broken until someone tries it;</text>
  <text x="30" y="260" class="s-sub" style="fill:var(--ink-3)">the third can multiply every price by 100 if the separator is also a comma. A dtype schema is what makes the file mean the same thing every time.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the guesses, and how to replace them with decisions", code: `
import pandas as pd
import numpy as np
import io

raw = io.StringIO("""account_id,postcode,amount,signup,active,score
007412,01234,"1,234.56",03/04/2026,yes,7
007413,02345,"987.00",04/04/2026,no,
007414,,"12.50",13/04/2026,yes,9
""")

df = pd.read_csv(raw)
df.dtypes
# account_id      int64      <- leading zeros GONE: 7412
# postcode      float64      <- 1234.0, 2345.0, NaN -- and the zero gone
# amount         object      <- the comma stopped it being a number
# signup         object      <- dates are strings until you say otherwise
# active         object      <- "yes"/"no" are not booleans
# score         float64      <- ONE blank made an int column float

df["account_id"].iloc[0]      # 7412 -- the identifier is corrupted
df["postcode"].iloc[0]        # 1234.0 -- also corrupted, and now a float

# THE FIX IS A SCHEMA, stated once:
raw.seek(0)
df = pd.read_csv(
    raw,
    dtype={
        "account_id": str,          # identifiers are TEXT, always
        "postcode": str,
        "score": "Int64",           # nullable int: stays int with a blank
    },
    thousands=",",                  # "1,234.56" -> 1234.56
    parse_dates=["signup"],
    date_format="%d/%m/%Y",         # 03/04 is 3 April, not 4 March
    true_values=["yes"], false_values=["no"],
)
df.dtypes
# account_id              object   ("007412" preserved)
# postcode                object   ("01234" preserved; blank is NaN)
# amount                 float64
# signup          datetime64[ns]
# active                    bool
# score                    Int64

# WHY IDENTIFIERS ARE STRINGS: they are not quantities. You never add
# two account numbers. Reading them as int loses leading zeros, and
# reading a long one as int can overflow or lose precision as float.
# dtype=str for every ID column is a rule worth applying without
# thinking about it.

# THE DATE GUESS, spelled out:
pd.read_csv(io.StringIO("d\\n03/04/2026\\n13/04/2026"), parse_dates=["d"])
# pandas 2.x: infers a single format from the first non-null value.
# "03/04/2026" is ambiguous -> it picks month-first (US) -> 13/04 does
# not fit -> either a warning and object dtype, or a wrong parse.
# date_format= removes the guess. dayfirst=True is a weaker hint.

# na_values: EVERY SOURCE HAS ITS OWN SENTINELS.
raw2 = io.StringIO("v\\n5\\n-999\\nN/A\\n.\\nnull\\n")
pd.read_csv(raw2)["v"].tolist()
# ['5', '-999', nan, '.', nan]   <- "N/A" and "null" are in the default
#                                    list; "-999" and "." are not
raw2.seek(0)
pd.read_csv(raw2, na_values=["-999", "."])["v"].tolist()
# [5.0, nan, nan, nan, nan]
#
# PER-COLUMN na_values when -999 is missing in one column and a real
# value in another:
# pd.read_csv(f, na_values={"temp": ["-999"], "code": ["N/A"]})

# keep_default_na=False TURNS OFF THE DEFAULT LIST -- for a column
# where "NA" is a real value (a country code, a name):
# pd.read_csv(f, keep_default_na=False, na_values=[""])
#
# Without this, a customer called "Null" or a region coded "NA"
# (Namibia, North America) becomes missing. It happens.

# usecols: READ ONLY WHAT YOU NEED. Fewer columns, less memory, faster.
# pd.read_csv(f, usecols=["account_id", "amount", "signup"])
#
# On a 200-column export where you need 5, this is a 40x memory
# reduction before any dtype work.
`,
      hl: [12, 23, 45, 66],
      caption: "**One blank cell turns an integer column into `float64`.** The same file with the same schema produces different dtypes on different days — `dtype=` is the only thing that makes it stable."
    },

    { t: "callout", kind: "trap", title: "Identifiers are text", body: [
      { t: "p", text: "An account number, a postcode, a product code, a phone number — none of these is a quantity, and reading one as a number loses leading zeros, may overflow, and turns `\"007412\"` into `7412` with no error." },
      { t: "p", text: "**`dtype={\"id_col\": str}` for every identifier column, every time.** It is the single most common CSV fix and the easiest to forget, because the corrupted value still looks like a valid ID." },
      { t: "p", text: "The failure surfaces later as a join that matches nothing, because the lookup table kept its zeros and the fact table did not." }
    ]},

    { t: "h2", n: "02", text: "Delimiters, quoting and the rows that break", id: "delimiters" },

    { t: "p", text: "**\"Comma-separated\" is a convention, not a rule.** European exports use semicolons because the decimal is a comma; log exports use tabs or pipes; and a field containing the delimiter has to be quoted, which is where malformed files come from." },

    { t: "code", lang: "python", title: "separators, quotes and what to do with a bad line", code: `
# THE SEPARATOR:
# pd.read_csv(f, sep=";")            # European
# pd.read_csv(f, sep="\\t")           # TSV
# pd.read_csv(f, sep="|")
# pd.read_csv(f, sep=None, engine="python")     # SNIFF it
#
# sep=None asks the Python engine to detect the delimiter from the
# first lines. Slower, and occasionally wrong, but it is the right
# call when files arrive from many sources.

# DECIMAL COMMA WITH SEMICOLON SEPARATOR -- the EU pattern:
eu = io.StringIO("id;price;qty\\n1;12,50;3\\n2;1.234,00;1\\n")
pd.read_csv(eu, sep=";", decimal=",", thousands=".")
#    id    price  qty
# 0   1    12.50    3
# 1   2  1234.00    1
#
# thousands="." and decimal="," together. Get one without the other
# and 1.234,00 becomes 1.234 (float) or stays a string.

# QUOTING: a field containing the separator or a newline must be
# quoted, and a quote inside a quoted field is doubled.
q = io.StringIO('id,note\\n1,"Hello, world"\\n2,"She said ""hi"""\\n3,"line\\nbreak"\\n')
pd.read_csv(q)
#    id            note
# 0   1    Hello, world
# 1   2  She said "hi"
# 2   3     line\\nbreak         <- an embedded newline, handled
#
# pandas handles all three correctly BY DEFAULT. The files that break
# are the ones written WITHOUT proper quoting -- a field with a comma
# and no quotes shifts every subsequent column right by one.

# A BAD LINE:
bad = io.StringIO("id,a,b\\n1,x,y\\n2,x,y,EXTRA\\n3,x,y\\n")
try:
    pd.read_csv(bad)
except pd.errors.ParserError as e:
    print(e)      # Expected 3 fields in line 3, saw 4

# THREE RESPONSES, in order of preference:
bad.seek(0)
pd.read_csv(bad, on_bad_lines="warn")      # skip it, say so, continue
bad.seek(0)
pd.read_csv(bad, on_bad_lines="skip")      # skip it silently
#
# And the honest one: COUNT them.
bad.seek(0)
skipped = []
def keep_bad(line):
    skipped.append(line)
    return None                            # drop the row
pd.read_csv(bad, on_bad_lines=keep_bad, engine="python")
len(skipped)                               # 1 -- reported, not lost
#
# on_bad_lines="skip" on a file with 3% malformed rows silently
# discards 3% of the data. That number belongs in the pipeline's
# output.

# TOO FEW FIELDS is NOT an error -- it is padded with NaN:
short = io.StringIO("id,a,b\\n1,x,y\\n2,x\\n")
pd.read_csv(short)
#    id  a    b
# 0   1  x    y
# 1   2  x  NaN        <- no complaint
#
# So a row that lost its last field looks like a row with a missing
# value. A field count check after loading is the only way to know.

# HEADER PROBLEMS:
# pd.read_csv(f, header=None, names=["a", "b", "c"])   # no header row
# pd.read_csv(f, skiprows=3)                            # preamble lines
# pd.read_csv(f, header=2)                              # header on line 3
# pd.read_csv(f, skipfooter=1, engine="python")         # a totals row
#
# Excel exports routinely have a title row, a blank row, then the
# header. skiprows=2 or header=2. And a "Total" row at the bottom
# that becomes a data row with the sum of every column unless you
# skip it.

# ENCODING: see 5.2. The short version:
# pd.read_csv(f, encoding="utf-8")           # the default, and usually right
# pd.read_csv(f, encoding="latin-1")         # older Windows exports
# pd.read_csv(f, encoding="utf-8-sig")       # strips a BOM

# ENGINE: "c" is the default and fast. "python" is slower and handles
# sep=None, skipfooter and callable on_bad_lines. "pyarrow" is
# multi-threaded and much faster on large files, with fewer options:
# pd.read_csv(f, engine="pyarrow", dtype_backend="pyarrow")
`,
      hl: [13, 33, 47, 58],
      caption: "**Too many fields raises; too few is silently padded with NaN.** A row that lost its last field is indistinguishable from a row with a missing value, and only a field-count check after loading can tell."
    },

    { t: "h2", n: "03", text: "Files larger than memory", id: "chunks" },

    { t: "code", lang: "python", title: "chunked reading, and what it can and cannot compute", code: `
# chunksize= RETURNS AN ITERATOR. Nothing is read until you iterate.
# reader = pd.read_csv("huge.csv", chunksize=500_000, dtype=SCHEMA)
# for chunk in reader:
#     process(chunk)
#
# Peak memory is one chunk plus your accumulators, regardless of
# file size.

# WHAT COMPOSES ACROSS CHUNKS: anything you can accumulate.
def total_by_region(path, chunksize=500_000):
    totals = {}
    counts = {}
    for chunk in pd.read_csv(path, chunksize=chunksize,
                             usecols=["region", "amount"],
                             dtype={"region": "category"}):
        s = chunk.groupby("region", observed=True)["amount"].agg(["sum", "count"])
        for region, row in s.iterrows():
            totals[region] = totals.get(region, 0.0) + row["sum"]
            counts[region] = counts.get(region, 0) + row["count"]
    return pd.DataFrame({"total": totals, "count": counts})
#
# Sums, counts, min, max, and anything built from them (mean = sum /
# count) compose. So do per-key groupbys where the key set fits in
# memory.

# WHAT DOES NOT: median, quantiles, nunique, anything needing all the
# values at once. For those:
#   - approximate (t-digest for quantiles, HyperLogLog for nunique)
#   - or two passes: first pass to find the key set, second to collect
#   - or convert to Parquet once and let a columnar engine do it
#
# A mean of per-chunk medians is NOT the median. Same trap as the
# VWAP in 2.4.

# FILTERING TO A SUBSET THAT FITS -- the common real case:
def rows_for(path, region, chunksize=500_000):
    parts = [c[c["region"] == region]
             for c in pd.read_csv(path, chunksize=chunksize)]
    return pd.concat(parts, ignore_index=True)
#
# Reads the whole file once, keeps only the matching rows. If the
# subset is 2% of the file, memory is 2% plus one chunk.

# dtype= MATTERS MORE IN CHUNKS, not less: inference happens PER
# CHUNK. A column that is all-integer in chunk 1 and has a blank in
# chunk 2 is int64 then float64, and concatenating them upcasts --
# or, for a string column that looks numeric in one chunk only,
# produces mixed types. Pass the schema.

# iterator=True WITH get_chunk() for manual control:
# reader = pd.read_csv(path, iterator=True)
# header_chunk = reader.get_chunk(1000)     # look at the first thousand
# ...decide on a schema...
# rest = reader.get_chunk(10**9)

# nrows= FOR A QUICK LOOK before committing to the whole file:
# sample = pd.read_csv(path, nrows=10_000)
# sample.dtypes; sample.memory_usage(deep=True).sum() * (file_rows / 10_000)
#
# Reading 10,000 rows and scaling the memory figure is the fastest
# way to know whether the whole thing fits.

# THE HONEST ALTERNATIVE: a 30 GB CSV that is read more than once
# should be Parquet (see 5.4). Convert it once, in chunks, and every
# subsequent read is column-pruned and predicate-pushed.
# for i, chunk in enumerate(pd.read_csv(path, chunksize=1_000_000, dtype=SCHEMA)):
#     chunk.to_parquet(f"out/part-{i:04d}.parquet")
`,
      hl: [10, 24, 40, 60],
      caption: "**Type inference happens per chunk.** A column that is integer in chunk 1 and has a blank in chunk 2 is `int64` then `float64`, and the concatenation upcasts — or, for a string that looks numeric in one chunk, produces mixed types."
    },

    { t: "h2", n: "04", text: "Writing", id: "write" },

    { t: "code", lang: "python", title: "to_csv, and the index that keeps coming back", code: `
df = pd.DataFrame({"id": ["007", "008"], "v": [1.5, np.nan]})

# THE DEFAULT WRITES THE INDEX AS AN UNNAMED FIRST COLUMN:
print(df.to_csv())
# ,id,v
# 0,007,1.5
# 1,008,
#
# Reading that back gives a column called "Unnamed: 0". The single
# most common cause of that column is a to_csv without index=False.

print(df.to_csv(index=False))
# id,v
# 007,1.5
# 008,
#
# index=False unless the index carries meaning. If it does, name it
# (df.index.name = "row_id") so it round-trips as a real column.

# MISSING VALUES WRITE AS EMPTY. na_rep= changes that:
df.to_csv(index=False, na_rep="NULL")       # for a database loader

# FLOAT FORMATTING -- to avoid 0.30000000000000004:
pd.DataFrame({"x": [0.1 + 0.2]}).to_csv(index=False)        # 0.30000000000000004
pd.DataFrame({"x": [0.1 + 0.2]}).to_csv(index=False, float_format="%.6f")   # 0.300000

# DATES: to_csv writes ISO 8601 by default, which is what you want.
# date_format= if a downstream system insists on something else.

# THE ROUND TRIP IS LOSSY. What survives a to_csv / read_csv cycle:
#   - values (with float rounding at the 15th digit)
# What does NOT:
#   - dtypes (everything is re-inferred)
#   - the index (unless named and re-set)
#   - categoricals (become object)
#   - timezone (aware datetimes write as strings with offset, read
#     back as object unless parse_dates and utc=True)
#   - leading zeros, if the reader does not get dtype=str
#
# A CSV is an interchange format, not a storage format. For storage
# between two runs of YOUR code, Parquet keeps all of the above.

# LINE ENDINGS: to_csv uses the OS default ("\\r\\n" on Windows). A
# file that will be read on Linux, or diffed in git, wants "\\n":
df.to_csv("out.csv", index=False, lineterminator="\\n")

# COMPRESSION IS INFERRED FROM THE EXTENSION, both ways:
# df.to_csv("out.csv.gz", index=False)
# pd.read_csv("out.csv.gz")
#
# gzip typically shrinks a CSV 5-10x. It is free to write and free to
# read, and it is the difference between a file that transfers in a
# minute and one that takes ten.
`,
      hl: [4, 11, 27, 43],
      caption: "**A CSV round trip keeps the values and loses everything else** — dtypes, index, categoricals, timezone, leading zeros. It is an interchange format, not a storage format."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A loader that reads the same file the same way every time",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "A daily CSV export arrives from a partner. Its columns are stable but its contents are not: some days have blanks in the integer columns, some days the dates are `dd/mm/yyyy` and others `yyyy-mm-dd`, and one day it arrived with an extra trailing comma on 200 rows." },
        { t: "p", text: "Write the loader. It must produce identical dtypes every day, report what it could not parse, and refuse to continue when the file is not what it claims to be." }
      ],
      requirements: [
        "A dtype schema applied at read time, with identifiers as text.",
        "Date parsing that handles both formats without guessing.",
        "Malformed rows counted and reported, not silently skipped.",
        "A schema check: the columns present must be exactly the columns expected.",
        "A validation summary (rows, nulls per column, parse failures).",
        "Include tests for each failure mode."
      ],
      hint: "Read dates as strings and parse them yourself with two explicit formats. The parser's guess is the thing you are removing.",
      solution: {
        lang: "python",
        title: "partner_loader.py",
        code: `import pandas as pd
import numpy as np
import io


# =========================================================================
# THE SCHEMA -- one place, version-controlled
# =========================================================================

SCHEMA = {
    "order_id":     str,          # identifier: never a number
    "customer_id":  str,
    "postcode":     str,
    "quantity":     "Int64",      # nullable: a blank does not make it float
    "unit_price":   float,
    "status":       "category",
}
DATE_COLS = ["order_date", "ship_date"]
DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y"]      # accepted, in order of trust
EXPECTED = list(SCHEMA) + DATE_COLS

NA_MARKERS = ["", "NA", "N/A", "null", "NULL", "-", "--", "?"]


# =========================================================================
# DATE PARSING WITHOUT A GUESS
# =========================================================================

def parse_dates_strict(s, formats=DATE_FORMATS):
    """Try each explicit format; a value matching none stays NaT.

    The parser's own inference picks ONE format from the first value
    and applies it to the whole column. A file that mixes formats, or
    changes format between days, breaks that. Trying each format
    explicitly handles both without ever guessing day-vs-month.
    """
    s = s.astype("string").str.strip()
    out = pd.Series(pd.NaT, index=s.index, dtype="datetime64[ns]")
    remaining = s.notna() & (s != "")

    for fmt in formats:
        if not remaining.any():
            break
        parsed = pd.to_datetime(s[remaining], format=fmt, errors="coerce")
        hit = parsed.notna()
        out[parsed.index[hit]] = parsed[hit]
        remaining = remaining & ~out.notna()

    return out, remaining          # remaining = non-empty and unparsed


# =========================================================================
# THE LOADER
# =========================================================================

class SchemaError(ValueError):
    pass


def load(source, *, max_bad_rows=0.01):
    """Load a partner export with fixed types and a validation report."""
    bad_lines = []

    def record_bad(line):
        bad_lines.append(line)
        return None                  # drop the row; we counted it

    df = pd.read_csv(
        source,
        dtype=SCHEMA,
        na_values=NA_MARKERS,
        keep_default_na=False,       # OUR list only -- "NA" is in it, but
                                     # this is explicit rather than inherited
        on_bad_lines=record_bad,
        engine="python",             # required for a callable
        skipinitialspace=True,
    )

    # --- SCHEMA CHECK: exactly the expected columns, any order ---------
    got, want = set(df.columns), set(EXPECTED)
    if got != want:
        raise SchemaError(
            f"columns differ: missing={sorted(want - got)}, "
            f"unexpected={sorted(got - want)}"
        )
    df = df[EXPECTED]                # canonical order

    # --- DATES ----------------------------------------------------------
    date_failures = {}
    for col in DATE_COLS:
        parsed, unparsed = parse_dates_strict(df[col])
        date_failures[col] = int(unparsed.sum())
        df[col] = parsed

    # --- MALFORMED ROWS ---------------------------------------------------
    n_bad = len(bad_lines)
    n_total = len(df) + n_bad
    bad_rate = n_bad / n_total if n_total else 0.0
    if bad_rate > max_bad_rows:
        raise ValueError(
            f"{n_bad} of {n_total} rows malformed ({bad_rate:.1%}); "
            f"first: {bad_lines[0][:80] if bad_lines else ''}"
        )

    # --- REPORT -----------------------------------------------------------
    report = {
        "rows": len(df),
        "malformed_rows": n_bad,
        "malformed_rate": round(bad_rate, 4),
        "nulls": {c: int(df[c].isna().sum()) for c in df.columns},
        "unparsed_dates": date_failures,
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
    }
    return df, report


# =========================================================================
# WHY EACH CHOICE
# =========================================================================
#
# dtype=SCHEMA         the same types every day, blanks or not
# "Int64" not int      a blank in quantity does not float the column
# str for identifiers  leading zeros survive; joins match
# keep_default_na=F    the default list is inherited behaviour; ours is
#                      a decision someone can read
# dates as str first   the parser's format guess is removed entirely
# callable bad_lines   skipped rows are COUNTED and the first is shown
# max_bad_rows         a threshold, because 3 bad rows in a million is
#                      noise and 3,000 is a broken export
# column set check     an added or renamed column fails at load, not
#                      three transformations later as a KeyError


# =========================================================================
# TESTS
# =========================================================================

GOOD = """order_id,customer_id,postcode,quantity,unit_price,status,order_date,ship_date
000123,C0042,01234,2,9.99,shipped,2026-03-01,03/03/2026
000124,C0043,,,12.50,pending,01/03/2026,
000125,C0044,SW1A 1AA,1,0.99,shipped,2026-03-02,2026-03-04
"""


def test_identifiers_keep_leading_zeros():
    df, _ = load(io.StringIO(GOOD))
    assert df["order_id"].iloc[0] == "000123"
    assert df["postcode"].iloc[0] == "01234"


def test_blank_quantity_does_not_float_the_column():
    df, rep = load(io.StringIO(GOOD))
    assert str(df["quantity"].dtype) == "Int64"
    assert rep["nulls"]["quantity"] == 1


def test_both_date_formats_parse():
    df, rep = load(io.StringIO(GOOD))
    assert df["order_date"].iloc[0] == pd.Timestamp("2026-03-01")
    assert df["order_date"].iloc[1] == pd.Timestamp("2026-03-01")   # 01/03
    assert df["ship_date"].iloc[0] == pd.Timestamp("2026-03-03")    # 03/03, not 3 March->March 3
    assert rep["unparsed_dates"] == {"order_date": 0, "ship_date": 0}


def test_ambiguous_date_is_day_first():
    """03/03 is unambiguous; 05/03 must be 5 March, not 3 May."""
    text = GOOD.replace("03/03/2026", "05/03/2026")
    df, _ = load(io.StringIO(text))
    assert df["ship_date"].iloc[0] == pd.Timestamp("2026-03-05")


def test_garbage_date_is_nat_and_counted():
    text = GOOD.replace("2026-03-01,03/03/2026", "2026-03-01,soon")
    df, rep = load(io.StringIO(text))
    assert pd.isna(df["ship_date"].iloc[0])
    assert rep["unparsed_dates"]["ship_date"] == 1


def test_dtypes_are_identical_with_and_without_blanks():
    full = GOOD.replace(",,,12.50", ",3,12.50")     # fill the blank
    a, _ = load(io.StringIO(GOOD))
    b, _ = load(io.StringIO(full))
    assert a.dtypes.equals(b.dtypes)


def test_malformed_rows_are_counted_not_lost():
    text = GOOD + "000126,C0045,X,1,1.00,shipped,2026-03-05,2026-03-06,EXTRA\\n"
    df, rep = load(io.StringIO(text), max_bad_rows=0.5)
    assert rep["malformed_rows"] == 1
    assert len(df) == 3


def test_too_many_malformed_rows_raises():
    text = GOOD + "x,x,x,x,x,x,x,x,EXTRA\\n" * 3
    try:
        load(io.StringIO(text), max_bad_rows=0.1)
        assert False, "should have raised"
    except ValueError as e:
        assert "malformed" in str(e)


def test_missing_column_raises_at_load():
    text = GOOD.replace("ship_date", "shipped_on")
    try:
        load(io.StringIO(text))
        assert False, "should have raised"
    except SchemaError as e:
        assert "ship_date" in str(e) and "shipped_on" in str(e)


def test_extra_column_raises_at_load():
    lines = GOOD.splitlines()
    lines[0] += ",surprise"
    lines[1:] = [l + ",1" for l in lines[1:]]
    try:
        load(io.StringIO("\\n".join(lines) + "\\n"))
        assert False, "should have raised"
    except SchemaError as e:
        assert "surprise" in str(e)


def test_na_markers():
    text = GOOD.replace("C0043", "N/A").replace("pending", "-")
    df, rep = load(io.StringIO(text))
    assert pd.isna(df["customer_id"].iloc[1])
    assert pd.isna(df["status"].iloc[1])


def test_column_order_is_canonical():
    cols = GOOD.splitlines()[0].split(",")
    shuffled = ",".join(reversed(cols))
    rows = [",".join(reversed(l.split(","))) for l in GOOD.splitlines()[1:]]
    text = shuffled + "\\n" + "\\n".join(rows) + "\\n"
    df, _ = load(io.StringIO(text))
    assert list(df.columns) == EXPECTED`,
        notes: [
          { t: "p", text: "**Dates are read as strings and parsed with two explicit formats.** The parser's own inference picks one format from the first value and applies it everywhere, so a column that changes format between days breaks it — trying each stated format handles both without ever guessing day against month." },
          { t: "callout", kind: "insight", title: "The dtype test is the one that matters", body: [
            { t: "p", text: "`test_dtypes_are_identical_with_and_without_blanks` loads the same file twice, once with a blank quantity and once without, and asserts the dtypes match. **Without the schema they would not** — the blank version has `float64` where the full one has `int64`." },
            { t: "p", text: "That test encodes the whole reason the loader exists." }
          ]},
          { t: "p", text: "**Malformed rows are counted, shown, and thresholded.** Three bad rows in a million is noise; three thousand is a broken export. `on_bad_lines=\"skip\"` cannot tell the difference, and a callable that records each line can." },
          { t: "p", text: "**The column-set check fails at load, not three steps later.** An added, renamed or dropped column becomes a `SchemaError` naming exactly what differs — instead of a `KeyError` in a transformation that has no idea the file changed." },
          { t: "p", text: "**`keep_default_na=False` with an explicit list** turns inherited behaviour into a stated decision. The default list is fine until a customer is called Null or a region is coded NA, and then it is a silent data loss nobody can find." },
          { t: "p", text: "**The report is part of the output.** Row count, nulls per column, unparsed dates and malformed rows are what the next person needs to know whether today's file was normal — and they are cheap to compute at the one point where the raw file is in hand." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A CSV column of account numbers like `007412` is read with default settings. What happens?",
          options: [
            "It is kept as a string",
            "It is inferred as int64 and becomes 7412 — the leading zeros are gone with no error",
            "read_csv raises a warning",
            "It becomes object dtype"
          ],
          answer: 1,
          why: "All-digit fields are inferred as integers. The identifier is silently corrupted, and the failure surfaces later as a join that matches nothing because the lookup table kept its zeros. `dtype={\"account_id\": str}` — identifiers are text, always."
        }
      ]
    }
  ],

  takeaways: [
    "**A CSV has no types; `read_csv` infers them per column from the values present** — so the same file can produce different dtypes on different days.",
    "**Identifiers are text**: `dtype=str` for every ID, postcode and code column, or leading zeros vanish silently.",
    "**One blank cell turns an integer column into `float64`**; `\"Int64\"` in the schema keeps it an integer.",
    "**`parse_dates` without `date_format` guesses the format from the first value** — and an ambiguous first value picks month-first.",
    "**Every source has its own missing markers**; `na_values=` adds them, `keep_default_na=False` makes the list explicit.",
    "**`thousands=` and `decimal=` decode grouped and European numbers** — without them the column is a string or wrong by 100×.",
    "**Too many fields raises; too few is padded with NaN** — a row that lost its last field looks like a missing value.",
    "**`on_bad_lines=\"skip\"` discards rows silently**; a callable counts them and shows the first.",
    "**`usecols=` reads only what you need** — a 40× memory reduction before any dtype work on a wide export.",
    "**`chunksize=` gives an iterator; sums and counts compose across chunks, medians and nunique do not.**",
    "**Type inference happens per chunk**, so a schema matters more in chunked reads, not less.",
    "**`to_csv(index=False)` unless the index is meaningful** — the default writes it, and it comes back as `Unnamed: 0`.",
    "**A CSV round trip keeps values and loses dtypes, index, categoricals and timezone** — it is an interchange format, not a storage format."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`pd.read_csv(f, parse_dates=[\"d\"])` on a column starting `03/04/2026`. What format does it use?",
        options: [
          "Day-first, as most of the world writes",
          "It infers one format from the first value — ambiguous, so it picks month-first — and applies it to every row, misparsing or failing on 13/04",
          "ISO 8601",
          "It asks"
        ],
        answer: 1,
        why: "pandas 2.x infers a single format from the first non-null value. `03/04` fits both conventions, and the guess is month-first. Rows that do not fit the guess produce a warning, `NaT`, or a wrong date. `date_format=\"%d/%m/%Y\"` removes the guess entirely."
      },
      {
        stem: "Which aggregation cannot be computed correctly across chunks by combining per-chunk results?",
        options: [
          "Sum",
          "Median — it needs all the values at once; a mean of per-chunk medians is not the median",
          "Count",
          "Max"
        ],
        answer: 1,
        why: "Sums, counts, extrema and anything built from them compose. Medians, quantiles and distinct counts do not — they need approximate sketches, two passes, or a columnar engine. This is the same trap as averaging per-chunk VWAPs."
      },
      {
        stem: "A file with 3% malformed rows is read with `on_bad_lines=\"skip\"`. What is the problem?",
        options: [
          "It raises",
          "3% of the data is discarded with no record that it happened",
          "The bad rows are padded with NaN",
          "It is slower"
        ],
        answer: 1,
        why: "Skipping is correct; silence is not. A callable `on_bad_lines` records each dropped line, so the count goes into the pipeline's report and a threshold can distinguish noise from a broken export. Three bad rows in a million and three thousand mean different things."
      },
      {
        stem: "What survives a `to_csv` / `read_csv` round trip?",
        options: [
          "Everything",
          "The values only — dtypes are re-inferred, the index becomes a column, categoricals become object, timezones become strings",
          "Values and dtypes",
          "Values and the index"
        ],
        answer: 1,
        why: "CSV carries no metadata. For storage between runs of your own code, Parquet keeps dtypes, categoricals, timezone and the index. CSV is for handing data to something that cannot read anything else."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does `read_csv` decide for you, and which decisions should you take back?",
        strong: "It infers every column's type from the values present, guesses date formats from the first value, and applies a default list of missing markers. I take back the types with a `dtype=` schema — identifiers as text, nullable integers where blanks occur — state the date format explicitly, and pass my own `na_values`. That makes the same file produce the same frame every day, which inference does not.",
        answer: [
          { t: "p", text: "The \"same file, same frame, every day\" framing is what turns a list of arguments into a principle." }
        ]
      },
      {
        level: "advanced",
        q: "How would you process a 40 GB CSV on a 16 GB machine?",
        strong: "Chunked reading with a fixed schema, accumulating sums and counts per key so the answer is chunk-size-invariant — medians and distinct counts do not compose, so those need a sketch or two passes. `usecols=` to drop columns I do not need. And honestly: if the file is read more than once, convert it to Parquet in chunks the first time, and every subsequent read is column-pruned and predicate-pushed.",
        answer: [
          { t: "p", text: "Saying \"convert it\" rather than only \"chunk it\" shows you think about the second read, which is where the real cost is." }
        ]
      },
      {
        level: "advanced",
        q: "A join between two CSV-sourced tables matches nothing. What would you check?",
        strong: "The key dtypes first. If one side was read with inference and the other with `dtype=str`, an identifier is `7412` on one and `\"007412\"` on the other — nothing matches and nothing raises. Then whitespace and case on string keys, and whether one file's missing markers left a sentinel in the key column. A `dtype` schema shared by both loaders is the fix that prevents the whole class.",
        answer: [
          { t: "p", text: "Leading with the leading-zero corruption is right — it is the most common cause and the least visible." }
        ]
      }
    ]
  }
});

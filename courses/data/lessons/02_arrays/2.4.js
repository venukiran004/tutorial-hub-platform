/* ============================================================================
   LESSON 2.4 — Structured Arrays, Records and Masks
   ========================================================================= */
EC.receiveLesson({
  id: "2.4",

  lede: "**A structured array gives you named, differently-typed fields in one contiguous buffer — a table without pandas.** It is the right answer surprisingly rarely, and knowing exactly when saves you from both reaching for a DataFrame you do not need and reaching for a structured array you will regret.",

  objectives: [
    "Define a compound dtype and access fields by name",
    "Explain how a structured array is laid out in memory",
    "State when a structured array beats a DataFrame and when it does not",
    "Use masked arrays, and know why pandas chose a different approach",
    "Read binary files with a fixed record layout"
  ],

  prerequisites: ["1.1", "1.3"],

  blocks: [

    { t: "h2", n: "01", text: "A row type, not a column type", id: "structured" },

    { t: "p", text: "Ordinary NumPy requires every element to share one dtype. **A structured array relaxes that by making the element itself a compound thing** — a fixed-size record with named fields, laid out one after another." },

    { t: "dl", items: [
      ["Structured array", "An array whose dtype is a **compound dtype**: a sequence of named fields, each with its own type and byte offset within the record."],
      ["Compound dtype", "Written as `np.dtype([(\"name\", \"U10\"), (\"age\", \"i4\")])` or the shorthand `\"U10, i4\"`. It describes one record's layout."],
      ["Field access", "`a[\"age\"]` returns a **view** of that field across every record — strided, not contiguous, because the other fields sit between the values."],
      ["Record array", "`np.rec.array` — the same thing with attribute access (`a.age`). Slower per access, and the convenience rarely pays."],
      ["Itemsize", "Bytes per record, which is the sum of the field sizes plus any padding the alignment rules insert."],
      ["Masked array", "`np.ma` — an array paired with a boolean mask marking invalid elements. NumPy's answer to missing data, and largely superseded."]
    ]},

    { t: "viz",
      title: "Row-major records against column-major arrays",
      caption: "A structured array interleaves fields within each record; a DataFrame keeps each column contiguous. That single difference decides which operations are fast.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="A structured array with interleaved fields per record, against a DataFrame with each column stored contiguously">
  <text x="30" y="26" class="s-label" style="fill:var(--warn)">structured array — one buffer, records side by side</text>
  <g stroke-width="1.5">
    <rect x="30" y="40" width="70" height="28" style="fill:var(--accent);fill-opacity:.20;stroke:var(--accent)"/>
    <rect x="100" y="40" width="40" height="28" style="fill:var(--good);fill-opacity:.20;stroke:var(--good)"/>
    <rect x="140" y="40" width="50" height="28" style="fill:var(--warn);fill-opacity:.20;stroke:var(--warn)"/>
    <rect x="190" y="40" width="70" height="28" style="fill:var(--accent);fill-opacity:.20;stroke:var(--accent)"/>
    <rect x="260" y="40" width="40" height="28" style="fill:var(--good);fill-opacity:.20;stroke:var(--good)"/>
    <rect x="300" y="40" width="50" height="28" style="fill:var(--warn);fill-opacity:.20;stroke:var(--warn)"/>
    <rect x="350" y="40" width="70" height="28" style="fill:var(--accent);fill-opacity:.20;stroke:var(--accent)"/>
    <rect x="420" y="40" width="40" height="28" style="fill:var(--good);fill-opacity:.20;stroke:var(--good)"/>
    <rect x="460" y="40" width="50" height="28" style="fill:var(--warn);fill-opacity:.20;stroke:var(--warn)"/>
  </g>
  <text x="46" y="58" class="s-sub" style="fill:var(--ink-2)">name</text>
  <text x="108" y="58" class="s-sub" style="fill:var(--ink-2)">age</text>
  <text x="148" y="58" class="s-sub" style="fill:var(--ink-2)">score</text>
  <text x="206" y="58" class="s-sub" style="fill:var(--ink-2)">name</text>
  <text x="268" y="58" class="s-sub" style="fill:var(--ink-2)">age</text>
  <text x="308" y="58" class="s-sub" style="fill:var(--ink-2)">score</text>
  <text x="30" y="90" class="s-sub" style="fill:var(--ink-3)">← one record, 24 bytes →</text>
  <text x="540" y="58" class="s-sub" style="fill:var(--ink-3)">reading one RECORD: one cache line</text>
  <text x="540" y="80" class="s-sub" style="fill:var(--crit)">reading one FIELD: stride 24, every</text>
  <text x="540" y="100" class="s-sub" style="fill:var(--crit)">cache line touched for 4 useful bytes</text>

  <line x1="30" y1="126" x2="850" y2="126" style="stroke:var(--line);stroke-dasharray:3 3"/>

  <text x="30" y="156" class="s-label" style="fill:var(--good)">DataFrame — one buffer per column</text>
  <g stroke-width="1.5" style="fill:var(--accent);fill-opacity:.20;stroke:var(--accent)">
    <rect x="30" y="170" width="70" height="24"/><rect x="100" y="170" width="70" height="24"/><rect x="170" y="170" width="70" height="24"/>
  </g>
  <text x="252" y="187" class="s-sub" style="fill:var(--ink-3)">name column, contiguous</text>
  <g stroke-width="1.5" style="fill:var(--good);fill-opacity:.20;stroke:var(--good)">
    <rect x="30" y="198" width="40" height="24"/><rect x="70" y="198" width="40" height="24"/><rect x="110" y="198" width="40" height="24"/>
  </g>
  <text x="252" y="215" class="s-sub" style="fill:var(--ink-3)">age column, contiguous</text>
  <g stroke-width="1.5" style="fill:var(--warn);fill-opacity:.20;stroke:var(--warn)">
    <rect x="30" y="226" width="50" height="24"/><rect x="80" y="226" width="50" height="24"/><rect x="130" y="226" width="50" height="24"/>
  </g>
  <text x="252" y="243" class="s-sub" style="fill:var(--ink-3)">score column, contiguous</text>
  <text x="540" y="200" class="s-sub" style="fill:var(--good)">reading one FIELD: sequential, SIMD-friendly</text>
  <text x="540" y="222" class="s-sub" style="fill:var(--ink-3)">reading one RECORD: three separate places</text>
</svg>`
    },

    { t: "code", lang: "python", title: "defining and using a compound dtype", code: `
import numpy as np

dt = np.dtype([("name", "U10"), ("age", "i4"), ("score", "f8")])

people = np.array([
    ("ada", 36, 91.5),
    ("grace", 45, 88.0),
    ("katherine", 52, 95.25),
], dtype=dt)

people.dtype.names            # ('name', 'age', 'score')
people.itemsize               # 52 bytes = 40 (U10) + 4 (i4) + 8 (f8)
people.shape                  # (3,) -- THREE elements, not (3, 3)
#
# The array is one-dimensional. Each element is a whole record.

# ACCESS BY FIELD gives a view across every record:
people["age"]                 # array([36, 45, 52], dtype=int32)
people["age"].strides         # (52,) -- one full record apart
people["age"].base is not None        # True -- a strided view

# ACCESS BY POSITION gives one record:
people[0]                     # ('ada', 36, 91.5) -- a np.void
people[0]["name"]             # 'ada'
people[0]["age"] = 37         # writes through to the array

# VECTORISED OPERATIONS WORK PER FIELD:
people["score"].mean()        # 91.58
people[people["age"] > 40]    # boolean mask over records
people[np.argsort(people["score"])]           # sort records by a field
np.sort(people, order=["age", "score"])       # multi-key, built in

# ADDING A FIELD MEANS REBUILDING -- the layout is fixed:
import numpy.lib.recfunctions as rfn
bigger = rfn.append_fields(people, "grade", ["A", "B", "A"], usemask=False)
bigger.dtype.names            # ('name','age','score','grade')
#
# This ALLOCATES A NEW ARRAY and copies everything. A DataFrame adds a
# column by appending one buffer -- which is why structured arrays are
# poor for exploratory work where the schema changes constantly.

# ALIGNMENT AND PADDING -- itemsize is not always the sum you expect:
packed = np.dtype([("a", "i1"), ("b", "i8")])
aligned = np.dtype([("a", "i1"), ("b", "i8")], align=True)
packed.itemsize               # 9 -- fields packed tight
aligned.itemsize              # 16 -- 7 bytes of padding after 'a'
#
# align=True MATCHES C STRUCT LAYOUT. If you are reading a binary file
# written by a C program, the padding is real and getting it wrong
# shifts every field after the first one.

# THE FIELD-ACCESS COST, which is the thing to understand:
n = 1_000_000
s = np.zeros(n, dtype=[("x", "f8"), ("y", "f8"), ("z", "f8")])
flat = np.zeros(n)

# %timeit s["x"].sum()        -> ~1.8 ms   stride 24, poor cache use
# %timeit flat.sum()          -> ~0.5 ms   contiguous
#
# Roughly 3x slower to reduce one field, because every cache line
# pulled in carries two fields you did not want. That is the price of
# the row-major layout, and it is exactly why columnar formats exist.
`,
      hl: [13, 18, 33, 55],
      caption: "**Adding a field allocates a new array and copies everything.** The record layout is fixed at creation, which is why structured arrays suit stable schemas and not exploratory work."
    },

    { t: "h2", n: "02", text: "When to use one", id: "when" },

    { t: "table",
      head: ["Situation", "Structured array", "DataFrame", "Why"],
      rows: [
        ["Reading a fixed binary format", "**Yes**", "No", "The dtype *is* the file spec — one `np.fromfile` and you are done"],
        ["Interfacing with C or a memmap", "**Yes**", "No", "Layout is guaranteed and shareable without a copy"],
        ["Passing rows to a C extension", "**Yes**", "No", "One contiguous buffer with a known record shape"],
        ["Exploratory analysis", "No", "**Yes**", "Adding a column copies everything; there is no groupby, join or plotting"],
        ["Column-heavy aggregation", "No", "**Yes**", "Strided field access is roughly 3× slower than contiguous"],
        ["Missing values", "No", "**Yes**", "Structured arrays have no null representation at all"],
        ["A few thousand heterogeneous rows", "Maybe", "**Yes**", "The overhead pandas adds is irrelevant at that size"]
      ],
      caption: "**The honest summary: reach for a structured array when the layout is the point.** Binary formats, C interop and memory maps — everywhere else, a DataFrame or a dict of arrays is better."
    },

    { t: "code", lang: "python", title: "the case where it is clearly right", code: `
# A FIXED-WIDTH BINARY RECORD FORMAT -- market data, sensor logs,
# game replays, scientific instruments. The spec says:
#
#   uint64  timestamp_ns
#   char[8] symbol
#   float64 price
#   uint32  quantity
#   uint8   side
#   (3 bytes padding to a 32-byte record)

tick_dtype = np.dtype([
    ("timestamp", "u8"),
    ("symbol", "S8"),          # S = BYTES, not str -- no decoding cost
    ("price", "f8"),
    ("quantity", "u4"),
    ("side", "u1"),
    ("_pad", "V3"),            # V = raw void bytes, explicitly reserved
])
tick_dtype.itemsize           # 32 -- matches the spec exactly

# READING THE WHOLE FILE IS ONE CALL:
# ticks = np.fromfile("ticks.bin", dtype=tick_dtype)
#
# No parsing, no per-record Python object, no type inference. A 2 GB
# file of 64 million ticks loads at disk speed.

# AND IT MEMORY-MAPS, so a file larger than RAM is still workable:
# ticks = np.memmap("ticks.bin", dtype=tick_dtype, mode="r")
# ticks["price"][:1000].mean()          # only those pages are read
#
# THIS IS THE CASE NOTHING ELSE DOES WELL. pandas would need to parse;
# a list of objects would need 64 million allocations.

# S vs U MATTERS A LOT HERE:
np.dtype("S8").itemsize       # 8 -- one byte per character
np.dtype("U8").itemsize       # 32 -- four bytes per character (UTF-32)
#
# For ASCII identifiers, S is a quarter of the size. The cost is that
# you get bytes back and must decode when you need text:
sym = np.array([b"AAPL"], dtype="S8")
sym[0].decode()               # 'AAPL'
sym == b"AAPL"                # comparison works on bytes directly

# WRITING BACK OUT IS EQUALLY DIRECT:
# ticks.tofile("out.bin")     # raw bytes, no header
np.save("ticks.npy", np.zeros(3, dtype=tick_dtype))   # keeps the dtype
np.load("ticks.npy").dtype.names                      # names survive

# CONVERTING TO A DATAFRAME IS ONE CALL when you want pandas:
# import pandas as pd
# df = pd.DataFrame(ticks)     # each field becomes a column
#
# THIS IS THE USUAL PATTERN: structured array to READ the file at full
# speed, then hand off to pandas for the analysis. Neither tool has to
# do the other's job.
`,
      hl: [21, 28, 36, 52],
      caption: "**Read with a structured array, analyse with pandas.** `np.fromfile` with a matching dtype loads a binary file at disk speed, and `pd.DataFrame(arr)` converts it in one call."
    },

    { t: "h2", n: "03", text: "Masked arrays", id: "masked" },

    { t: "p", text: "**A masked array pairs data with a boolean array marking invalid entries.** It is NumPy's answer to missing values, it predates pandas, and pandas deliberately went a different way — which is worth understanding before you reach for it." },

    { t: "code", lang: "python", title: "what masking does, and why it lost", code: `
import numpy.ma as ma

readings = ma.masked_array([1.0, 2.0, -999.0, 4.0],
                           mask=[False, False, True, False])

readings.mean()               # 2.33 -- the mask is respected
readings.sum()                # 7.0
readings + 10                 # the masked position stays masked
readings.count()              # 3 -- non-masked count
readings.filled(np.nan)       # back to a plain array with nan

# MASKING BY CONDITION, which is the common entry point:
raw = np.array([1.0, 2.0, -999.0, 4.0])
clean = ma.masked_values(raw, -999.0)          # mask a sentinel
clean = ma.masked_where(raw < 0, raw)          # mask by predicate
clean = ma.masked_invalid(np.array([1.0, np.nan, 3.0]))   # mask nan/inf

# THE GENUINE ADVANTAGE OVER nan: IT WORKS ON INTEGERS.
counts = ma.masked_array([1, 2, -1, 4], mask=[0, 0, 1, 0])
counts.dtype                  # int64 -- STILL AN INTEGER
counts.mean()                 # 2.33
#
# A plain array cannot do this: putting nan in an integer column
# forces float64, losing exactness above 2**53. Masking keeps the
# dtype and marks validity separately -- which is precisely the design
# pandas later adopted for its nullable dtypes.

# THE REASONS IT LOST:
#
# 1. SPEED. Every operation checks and propagates the mask in Python-
#    level wrapper code rather than in the ufunc loop.
big = np.random.default_rng(0).normal(size=1_000_000)
mbig = ma.masked_array(big, mask=big > 2)
# %timeit big.sum()           -> ~0.5 ms
# %timeit mbig.sum()          -> ~8 ms  -- roughly 15x slower
#
# 2. INTEROP. Most libraries accept a masked array and silently drop
#    the mask, giving you the raw underlying values -- including the
#    -999 sentinels you thought you had handled:
raw_back = np.asarray(clean)          # mask GONE, sentinel back
raw_back.max()                        # 4.0 here, but the -999 survives
                                      # in the buffer and reappears in
                                      # anything that calls asarray
#
# THIS IS THE DANGEROUS ONE. sklearn, scipy and most plotting code
# call np.asarray on input. The mask does not survive the boundary,
# and nothing warns.
#
# 3. TWO ARRAYS TO KEEP TOGETHER. Slicing, saving and passing around a
#    masked array means carrying the mask, and every round trip
#    through a format that does not understand it loses the mask.

# WHEN IT IS STILL THE RIGHT TOOL:
#   - integer data with genuine missing values, staying inside NumPy
#   - image processing, where a mask is a region of interest and the
#     underlying values must be preserved rather than replaced
#   - anything already built on it (older scientific code, netCDF)
#
# OTHERWISE: use nan in a float array for numeric data, or a pandas
# nullable dtype when the data is tabular.

# THE MODERN EQUIVALENT, for comparison:
# pd.array([1, 2, None, 4], dtype="Int64")
# ...same idea -- values plus a validity mask -- but integrated into
# every operation rather than bolted on, and it survives a round trip
# through Parquet.
`,
      hl: [21, 33, 42, 55],
      caption: "**Most libraries call `np.asarray` on their input and the mask does not survive.** The sentinel values you thought you had handled are still in the buffer, and nothing warns you."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Read a binary tick file that will not fit in memory",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "You are given a 40 GB binary file of market ticks in a fixed 32-byte record format, and a machine with 16 GB of RAM. You need per-symbol daily statistics." },
        { t: "code", lang: "python", numbered: false, title: "the record spec", code: `
# Record layout, little-endian, 32 bytes, no header:
#
#   offset  type      field
#        0  uint64    timestamp_ns   nanoseconds since epoch, UTC
#        8  char[8]   symbol         ASCII, space padded
#       16  float64   price
#       24  uint32    quantity
#       28  uint8     side           0 = buy, 1 = sell
#       29  3 bytes   padding
#
# Known problems in the data:
#   - some records have price = 0.0     (a feed error, not a real trade)
#   - some have quantity = 0            (a cancellation, not a trade)
#   - the file is NOT sorted by timestamp across symbols`},
        { t: "p", text: "Build the reader and the aggregation. It must work in bounded memory, validate the file, and report what it excluded." }
      ],
      requirements: [
        "Define a dtype matching the spec exactly, verified by itemsize.",
        "Process in bounded memory regardless of file size.",
        "Compute per-symbol count, volume, VWAP, high and low.",
        "Exclude invalid records and report how many.",
        "Verify the file size is a whole number of records.",
        "Include tests using a generated file."
      ],
      hint: "VWAP is a weighted mean, and a weighted mean cannot be computed from per-chunk means. Think about what has to accumulate.",
      solution: {
        lang: "python",
        title: "read_ticks.py",
        code: `import numpy as np
import os
from collections import defaultdict


# =========================================================================
# THE DTYPE IS THE SPEC
# =========================================================================
#
# Written field by field from the offset table. The explicit padding
# field is not decoration: without it the dtype would be 29 bytes and
# every record after the first would be read from the wrong offset --
# producing plausible garbage rather than an error.

TICK = np.dtype([
    ("timestamp", "<u8"),      # < = little-endian, stated explicitly
    ("symbol", "S8"),          # bytes, not str: no decode, 8 bytes not 32
    ("price", "<f8"),
    ("quantity", "<u4"),
    ("side", "u1"),
    ("_pad", "V3"),
])

assert TICK.itemsize == 32, f"dtype is {TICK.itemsize} bytes, spec says 32"

# BYTE ORDER IS EXPLICIT. Native order differs between architectures,
# and a file written on x86 read on a big-endian machine gives
# timestamps in the year 500 million with no error.


# =========================================================================
# READING IN BOUNDED MEMORY
# =========================================================================

def read_chunks(path, chunk_records=1_000_000):
    """Yield arrays of at most chunk_records ticks.

    1,000,000 x 32 bytes = 32 MB per chunk. The peak memory is that,
    plus the accumulators, regardless of whether the file is 1 GB or
    1 TB.
    """
    size = os.path.getsize(path)

    # A TRUNCATED FILE IS THE COMMON FAILURE. Checking it up front
    # turns a silent misalignment into a clear error.
    if size % TICK.itemsize:
        raise ValueError(
            f"{path} is {size} bytes, not a whole number of "
            f"{TICK.itemsize}-byte records "
            f"({size % TICK.itemsize} bytes left over) -- truncated file?"
        )

    total = size // TICK.itemsize
    with open(path, "rb") as fh:
        read = 0
        while read < total:
            want = min(chunk_records, total - read)
            block = np.fromfile(fh, dtype=TICK, count=want)
            if len(block) == 0:
                break
            read += len(block)
            yield block


# =========================================================================
# THE AGGREGATION
# =========================================================================

def aggregate(path, chunk_records=1_000_000):
    """Per-symbol statistics over a file of any size.

    VWAP = sum(price x quantity) / sum(quantity).

    THIS IS WHY WE ACCUMULATE SUMS, NOT MEANS. A weighted mean cannot
    be reconstructed from per-chunk weighted means unless you also
    carry each chunk's total weight -- and at that point you are
    carrying the sums anyway. Averaging chunk VWAPs is a real and
    common bug: it weights a chunk with 10 ticks the same as one with
    a million.
    """
    acc = defaultdict(lambda: {
        "count": 0, "quantity": 0, "notional": 0.0,
        "high": -np.inf, "low": np.inf,
        "first_ts": np.iinfo(np.uint64).max, "last_ts": 0,
    })

    stats = {"records": 0, "zero_price": 0, "zero_quantity": 0,
             "kept": 0, "chunks": 0}

    for block in read_chunks(path, chunk_records):
        stats["chunks"] += 1
        stats["records"] += len(block)

        # VALIDITY, counted separately so the report distinguishes
        # a feed error from a cancellation.
        bad_price = block["price"] <= 0
        bad_qty = block["quantity"] == 0
        stats["zero_price"] += int(bad_price.sum())
        stats["zero_quantity"] += int(bad_qty.sum())

        good = block[~(bad_price | bad_qty)]
        stats["kept"] += len(good)
        if not len(good):
            continue

        # GROUP WITHIN THE CHUNK using unique + bincount, so the
        # per-chunk work is vectorised and only the small per-symbol
        # merge happens in Python.
        symbols, inverse = np.unique(good["symbol"], return_inverse=True)
        qty = good["quantity"].astype(np.float64)
        notional = good["price"] * qty

        counts = np.bincount(inverse)
        qty_sum = np.bincount(inverse, weights=qty)
        not_sum = np.bincount(inverse, weights=notional)

        for i, sym in enumerate(symbols):
            a = acc[sym]
            a["count"] += int(counts[i])
            a["quantity"] += float(qty_sum[i])
            a["notional"] += float(not_sum[i])

            here = good[inverse == i]
            a["high"] = max(a["high"], float(here["price"].max()))
            a["low"] = min(a["low"], float(here["price"].min()))
            a["first_ts"] = min(a["first_ts"], int(here["timestamp"].min()))
            a["last_ts"] = max(a["last_ts"], int(here["timestamp"].max()))

    out = {}
    for sym, a in acc.items():
        out[sym.decode().strip()] = {
            "count": a["count"],
            "quantity": a["quantity"],
            "vwap": a["notional"] / a["quantity"] if a["quantity"] else np.nan,
            "high": a["high"],
            "low": a["low"],
            "first_ts": a["first_ts"],
            "last_ts": a["last_ts"],
        }

    stats["symbols"] = len(out)
    stats["excluded"] = stats["records"] - stats["kept"]
    stats["excluded_pct"] = (
        round(100 * stats["excluded"] / stats["records"], 3)
        if stats["records"] else 0.0
    )
    return out, stats


# =========================================================================
# NOTES ON THE CHOICES
# =========================================================================
#
# WHY notional ACCUMULATES IN float64:
#   price x quantity summed over 64 million ticks reaches 10**12 or
#   more. float64 holds that with ~4 decimal places to spare; float32
#   would lose pounds. bincount already accumulates in float64, and
#   the running total is a Python float, which is also float64.
#
# WHY NOT MEMMAP THE WHOLE FILE?
#   np.memmap works and is tidier to write. But any operation that
#   materialises -- a boolean mask over 1.25 billion records -- pulls
#   the whole thing in. Explicit chunking makes the memory ceiling
#   visible in the code rather than emergent from access patterns.
#
# WHY unique+bincount RATHER THAN A DICT LOOP?
#   A Python loop over 64 million records is minutes per gigabyte.
#   unique+bincount does the grouping in C and leaves only the
#   per-symbol merge -- a few thousand iterations total -- in Python.
#
# WHY S8 RATHER THAN U8?
#   8 bytes against 32, and no decoding. Symbols are ASCII by spec.
#   We decode once, at the end, for the output keys.


# =========================================================================
# TESTS
# =========================================================================

def _write_file(path, records):
    arr = np.zeros(len(records), dtype=TICK)
    for i, (ts, sym, px, qty, side) in enumerate(records):
        arr[i] = (ts, sym, px, qty, side, b"\\x00\\x00\\x00")
    arr.tofile(path)
    return path


def test_dtype_matches_the_spec():
    assert TICK.itemsize == 32
    assert TICK.fields["price"][1] == 16          # offset
    assert TICK.fields["quantity"][1] == 24
    assert TICK.fields["side"][1] == 28


def test_vwap_is_volume_weighted_not_a_mean_of_means(tmp="t1.bin"):
    """The bug this design exists to prevent."""
    _write_file(tmp, [
        (1, b"AAA", 10.0, 1, 0),
        (2, b"AAA", 20.0, 99, 0),
    ])
    out, _ = aggregate(tmp, chunk_records=1)      # one record per chunk

    # Plain mean would be 15.0. Volume weighted is 19.9.
    assert abs(out["AAA"]["vwap"] - 19.9) < 1e-9
    os.remove(tmp)


def test_chunk_size_does_not_change_the_answer(tmp="t2.bin"):
    rng = np.random.default_rng(0)
    recs = [(int(i), b"AAA" if i % 2 else b"BBB",
             float(rng.uniform(10, 20)), int(rng.integers(1, 100)), 0)
            for i in range(1000)]
    _write_file(tmp, recs)

    a, _ = aggregate(tmp, chunk_records=1000)
    b, _ = aggregate(tmp, chunk_records=7)

    for sym in a:
        assert abs(a[sym]["vwap"] - b[sym]["vwap"]) < 1e-9
        assert a[sym]["count"] == b[sym]["count"]
        assert a[sym]["high"] == b[sym]["high"]
    os.remove(tmp)


def test_invalid_records_are_excluded_and_counted(tmp="t3.bin"):
    _write_file(tmp, [
        (1, b"AAA", 10.0, 5, 0),
        (2, b"AAA", 0.0, 5, 0),        # feed error
        (3, b"AAA", 12.0, 0, 0),       # cancellation
    ])
    out, stats = aggregate(tmp)

    assert out["AAA"]["count"] == 1
    assert stats["zero_price"] == 1
    assert stats["zero_quantity"] == 1
    assert stats["excluded"] == 2
    os.remove(tmp)


def test_truncated_file_raises(tmp="t4.bin"):
    _write_file(tmp, [(1, b"AAA", 10.0, 5, 0)])
    with open(tmp, "ab") as fh:
        fh.write(b"\\x00" * 7)          # a partial record

    try:
        list(read_chunks(tmp))
        assert False, "should have raised"
    except ValueError as e:
        assert "truncated" in str(e)
    os.remove(tmp)


def test_high_and_low_span_chunks(tmp="t5.bin"):
    """A per-chunk max is not the file max unless it is merged."""
    _write_file(tmp, [
        (1, b"AAA", 5.0, 1, 0),
        (2, b"AAA", 50.0, 1, 0),
        (3, b"AAA", 25.0, 1, 0),
    ])
    out, _ = aggregate(tmp, chunk_records=1)

    assert out["AAA"]["high"] == 50.0
    assert out["AAA"]["low"] == 5.0
    os.remove(tmp)


def test_symbol_padding_is_stripped(tmp="t6.bin"):
    _write_file(tmp, [(1, b"AAA     ", 10.0, 1, 0)])
    out, _ = aggregate(tmp)

    assert "AAA" in out
    os.remove(tmp)


def test_empty_file(tmp="t7.bin"):
    open(tmp, "wb").close()
    out, stats = aggregate(tmp)

    assert out == {}
    assert stats["records"] == 0
    os.remove(tmp)


def test_all_records_invalid(tmp="t8.bin"):
    _write_file(tmp, [(1, b"AAA", 0.0, 0, 0)])
    out, stats = aggregate(tmp)

    assert out == {}
    assert stats["excluded_pct"] == 100.0
    os.remove(tmp)`,
        notes: [
          { t: "p", text: "**The explicit padding field is load-bearing.** Without it the dtype is 29 bytes, and every record after the first is read from the wrong offset — producing plausible-looking garbage rather than an error." },
          { t: "callout", kind: "trap", title: "A weighted mean cannot be averaged", body: [
            { t: "p", text: "VWAP is `sum(price × quantity) / sum(quantity)`. Averaging per-chunk VWAPs weights a chunk with 10 ticks the same as one with a million, and the answer is silently wrong." },
            { t: "p", text: "**That is why the accumulators carry sums, not means.** The `chunk_records=1` test makes this concrete: with one record per chunk, a mean-of-means implementation gives 15.0 where the correct answer is 19.9." }
          ]},
          { t: "p", text: "**Byte order is stated explicitly.** Native order differs between architectures, and a file written on x86 read on a big-endian machine yields timestamps in the year 500 million with no error at all." },
          { t: "p", text: "**Checking the file size up front turns a silent misalignment into a clear message.** A truncated download is the common failure, and without the check the final partial record shifts nothing — `fromfile` just returns fewer records than expected." },
          { t: "p", text: "**`unique` plus `bincount` keeps the grouping in C.** A Python loop over 64 million records is minutes per gigabyte; this leaves only the per-symbol merge — a few thousand iterations — in the interpreter." },
          { t: "p", text: "**`S8` rather than `U8` is a 4× saving with no downside here.** Symbols are ASCII by spec, comparison works directly on bytes, and the single decode happens once at the end when building the output keys." }
        ]
      }
    },

    { t: "callout", kind: "tradeoff", title: "Structured array or DataFrame", body: [
      { t: "p", text: "**Use a structured array when the memory layout is the point**: a binary file format, a C extension boundary, a memory-mapped file too large for RAM. In those cases the dtype *is* the specification, and nothing else reads the data as directly." },
      { t: "p", text: "**Use a DataFrame everywhere else.** Adding a column to a structured array copies the whole thing, field access is roughly three times slower than contiguous, there is no missing-value representation, and none of groupby, join, resample or plotting exists." },
      { t: "p", text: "**The usual pattern is both**: read with `np.fromfile` at disk speed, then `pd.DataFrame(arr)` for the analysis. Neither tool has to do the other's job." }
    ]}
  ],

  takeaways: [
    "**A structured array's dtype is a compound record** — named fields, each with its own type and byte offset.",
    "**The array is one-dimensional**: three records of three fields have shape `(3,)`, not `(3, 3)`.",
    "**Field access returns a strided view**, so reducing one field is roughly 3× slower than the same reduction on a contiguous array.",
    "**Adding a field allocates a new array and copies everything** — the layout is fixed at creation.",
    "**`align=True` inserts padding to match C struct layout**, and getting it wrong shifts every field after the first.",
    "**`S` is one byte per character and `U` is four** — for ASCII identifiers that is a 4× difference.",
    "**State byte order explicitly** in a file dtype; native order differs between architectures and the failure is silent.",
    "**Reach for a structured array when the layout is the point**: binary formats, C interop, memory maps.",
    "**Read with a structured array, analyse with pandas** — `pd.DataFrame(arr)` converts in one call.",
    "**Masked arrays keep the dtype**, which is their real advantage over `nan` — integers stay integers.",
    "**Most libraries call `np.asarray` and the mask does not survive**, exposing the sentinel values you thought you had handled.",
    "**Masked arrays are roughly 15× slower** because the mask propagates in wrapper code rather than inside the ufunc loop."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A structured array holds three records of three fields each. What is its shape?",
        options: [
          "(3, 3)",
          "(3,) — each element is a whole record",
          "(9,)",
          "(3, 1)"
        ],
        answer: 1,
        why: "The compound dtype makes the record the element, so the array is one-dimensional with three elements. `arr[\"age\"]` returns a strided view across all records, and `arr[0]` returns one complete record as a `np.void`."
      },
      {
        stem: "Your binary record spec says 32 bytes but your dtype's itemsize is 29. What happens if you read the file anyway?",
        options: [
          "NumPy raises a size mismatch error",
          "Every record after the first is read from the wrong offset, producing plausible garbage",
          "The last three bytes of each record are dropped harmlessly",
          "The file is read correctly but slowly"
        ],
        answer: 1,
        why: "`fromfile` walks the buffer in itemsize steps, so a 3-byte shortfall accumulates and each successive record is misaligned. Nothing errors — you get valid-looking numbers. Declaring the padding explicitly and asserting `itemsize` against the spec is what prevents it."
      },
      {
        stem: "You pass a masked array to a scikit-learn estimator. What happens to the mask?",
        options: [
          "It is respected as missing data",
          "It is silently dropped by `np.asarray`, exposing the underlying sentinel values",
          "It raises a TypeError",
          "The masked rows are removed"
        ],
        answer: 1,
        why: "Most libraries call `np.asarray` on their input, which returns the raw buffer and discards the mask. The −999 sentinels you thought you had handled are still there and flow into the model as real numbers, with no warning at the boundary."
      },
      {
        stem: "You compute VWAP per chunk while streaming a large file, then average the chunk VWAPs. What is wrong?",
        options: [
          "Nothing — averages compose",
          "A weighted mean cannot be averaged: a chunk with 10 ticks would count as much as one with a million",
          "Floating point error accumulates",
          "The chunks must be equal sized"
        ],
        answer: 1,
        why: "VWAP is `sum(price × quantity) / sum(quantity)`, and reconstructing it needs both sums, not the ratio. Accumulate the numerator and denominator separately — then the answer is identical regardless of chunk size, which is exactly the property to test for."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "When would you use a NumPy structured array rather than a DataFrame?",
        strong: "When the memory layout is the point — reading a fixed binary format, interfacing with C, or memory-mapping a file too large for RAM. The dtype is the file specification, so one `fromfile` call loads it at disk speed. For anything analytical a DataFrame wins: adding a column to a structured array copies everything, field access is strided and slower, and there is no missing-value representation at all.",
        answer: [
          { t: "p", text: "Naming the layout as the deciding factor, rather than treating it as a lightweight DataFrame, is the answer being looked for." },
          { t: "p", text: "The hybrid pattern — read with NumPy, analyse with pandas — shows you have actually built one of these." }
        ]
      },
      {
        level: "advanced",
        q: "How would you aggregate a 40 GB binary file on a 16 GB machine?",
        strong: "Stream it in fixed-size chunks with a dtype matching the record spec, and accumulate sums rather than per-chunk statistics — so a weighted mean like VWAP stays correct. I would verify the file size is a whole number of records up front, since a truncated download otherwise misaligns silently, and test that the chunk size does not change the answer.",
        answer: [
          { t: "p", text: "The sums-not-means point is the substantive one and catches a bug people genuinely ship." },
          { t: "p", text: "The chunk-size-invariance test is a good thing to name: it is the property that proves the accumulation is correct." }
        ]
      },
      {
        level: "advanced",
        q: "Why did pandas not adopt NumPy's masked arrays for missing data?",
        strong: "Speed and interoperability. Mask propagation happens in wrapper code rather than inside the ufunc loop, so operations are an order of magnitude slower, and any library calling `np.asarray` silently drops the mask and exposes the raw buffer. pandas used `NaN` initially and later built nullable dtypes — the same values-plus-validity idea, but integrated into every operation and able to survive a round trip through Parquet.",
        answer: [
          { t: "p", text: "Recognising that nullable dtypes *are* the masked-array idea done properly shows you understand the design lineage rather than just the API." },
          { t: "p", text: "The `asarray` boundary problem is the practical detail that makes the answer concrete." }
        ]
      }
    ]
  }
});

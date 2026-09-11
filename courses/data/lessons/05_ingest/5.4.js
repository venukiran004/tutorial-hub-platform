/* ============================================================================
   LESSON 5.4 — Parquet, Arrow and Columnar Formats
   ========================================================================= */
EC.receiveLesson({
  id: "5.4",

  lede: "**A CSV stores rows; Parquet stores columns. Reading one column from a CSV reads the whole file; reading one column from Parquet reads one column.** That single difference — plus types that survive, compression that works, and statistics that let the reader skip most of the file — is why a 30 GB CSV becomes a 3 GB Parquet file that answers most questions in a tenth of the time.",

  objectives: [
    "Explain what columnar storage is and why it changes read cost",
    "Describe what a row group is and how predicate pushdown uses it",
    "Read only the columns and rows you need from a Parquet file",
    "Choose a compression codec and understand what it costs",
    "Partition a dataset so that common queries touch few files"
  ],

  prerequisites: ["3.3", "5.1"],

  blocks: [

    { t: "h2", n: "01", text: "Rows against columns", id: "columnar" },

    { t: "p", text: "A row-oriented file stores record 1's fields, then record 2's, and so on. **To read one column you must read every byte of every row and discard most of it.** A columnar file stores all of column A, then all of column B — so a query on two columns of fifty reads two fiftieths of the file." },

    { t: "dl", items: [
      ["Columnar storage", "All values of one column stored contiguously, then the next column. Reading a subset of columns reads a subset of the file."],
      ["Parquet", "The standard columnar file format. Typed, compressed, with per-chunk statistics, and readable by pandas, Spark, DuckDB, and every warehouse."],
      ["Arrow", "The in-memory columnar format Parquet decodes into. Zero-copy between libraries; the dtype backend pandas can now use natively."],
      ["Row group", "A horizontal slice of the file — typically 64 MB to 1 GB of rows — stored as a unit with **its own min/max statistics per column**."],
      ["Predicate pushdown", "Using the row-group statistics to skip chunks that cannot match a filter. A filter on `date > 2026-03-01` skips every row group whose max date is earlier, without reading it."],
      ["Partitioning", "Splitting a dataset into directories by a column's value — `year=2026/month=03/` — so a filter on that column touches only those directories."]
    ]},

    { t: "viz",
      title: "Reading two columns of five",
      caption: "Row layout: every byte is read and three fifths discarded. Column layout: the reader seeks to the two columns it needs and reads nothing else. On a 50-column file the difference is 25×.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="A row-oriented file where a two-column read touches every block, against a column-oriented file where it touches two contiguous blocks">
  <text x="30" y="26" class="s-label" style="fill:var(--crit)">row-oriented (CSV) — SELECT a, d</text>
  <g stroke-width="1.5">
    <rect x="30" y="40" width="40" height="28" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="70" y="40" width="40" height="28" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="110" y="40" width="40" height="28" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="150" y="40" width="40" height="28" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="190" y="40" width="40" height="28" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="230" y="40" width="40" height="28" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="270" y="40" width="40" height="28" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="310" y="40" width="40" height="28" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="350" y="40" width="40" height="28" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="390" y="40" width="40" height="28" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="430" y="40" width="40" height="28" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="470" y="40" width="40" height="28" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="510" y="40" width="40" height="28" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="550" y="40" width="40" height="28" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="590" y="40" width="40" height="28" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
  </g>
  <text x="44" y="59" class="s-sub" style="fill:var(--ink-2)">a</text><text x="84" y="59" class="s-sub" style="fill:var(--ink-3)">b</text><text x="124" y="59" class="s-sub" style="fill:var(--ink-3)">c</text><text x="164" y="59" class="s-sub" style="fill:var(--ink-2)">d</text><text x="204" y="59" class="s-sub" style="fill:var(--ink-3)">e</text>
  <text x="244" y="59" class="s-sub" style="fill:var(--ink-2)">a</text><text x="284" y="59" class="s-sub" style="fill:var(--ink-3)">b</text><text x="324" y="59" class="s-sub" style="fill:var(--ink-3)">c</text><text x="364" y="59" class="s-sub" style="fill:var(--ink-2)">d</text><text x="404" y="59" class="s-sub" style="fill:var(--ink-3)">e</text>
  <text x="444" y="59" class="s-sub" style="fill:var(--ink-2)">a</text><text x="484" y="59" class="s-sub" style="fill:var(--ink-3)">b</text><text x="524" y="59" class="s-sub" style="fill:var(--ink-3)">c</text><text x="564" y="59" class="s-sub" style="fill:var(--ink-2)">d</text><text x="604" y="59" class="s-sub" style="fill:var(--ink-3)">e</text>
  <rect x="30" y="76" width="600" height="6" style="fill:var(--crit);fill-opacity:.5"/>
  <text x="30" y="100" class="s-sub" style="fill:var(--crit)">bytes read: all of them — the reader cannot find "a" without passing "b", "c" and "e"</text>

  <text x="30" y="156" class="s-label" style="fill:var(--good)">column-oriented (Parquet) — SELECT a, d</text>
  <g stroke-width="1.5">
    <rect x="30" y="170" width="120" height="28" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="150" y="170" width="120" height="28" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="270" y="170" width="120" height="28" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
    <rect x="390" y="170" width="120" height="28" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="510" y="170" width="120" height="28" style="fill:var(--ink-4);fill-opacity:.10;stroke:var(--line)"/>
  </g>
  <text x="80" y="189" class="s-sub" style="fill:var(--ink-2)">a a a</text>
  <text x="200" y="189" class="s-sub" style="fill:var(--ink-3)">b b b</text>
  <text x="320" y="189" class="s-sub" style="fill:var(--ink-3)">c c c</text>
  <text x="440" y="189" class="s-sub" style="fill:var(--ink-2)">d d d</text>
  <text x="560" y="189" class="s-sub" style="fill:var(--ink-3)">e e e</text>
  <rect x="30" y="206" width="120" height="6" style="fill:var(--good);fill-opacity:.6"/>
  <rect x="390" y="206" width="120" height="6" style="fill:var(--good);fill-opacity:.6"/>
  <text x="30" y="230" class="s-sub" style="fill:var(--good)">bytes read: two fifths — and each column compresses far better, because similar values sit together</text>

  <line x1="30" y1="252" x2="850" y2="252" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="278" class="s-sub" style="fill:var(--ink-3)">The file also stores each column's min and max per row group. A filter on "d &gt; 100" skips every row group whose max is below 100 — without reading it.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the measured difference", code: `
import pandas as pd
import numpy as np
import os

rng = np.random.default_rng(0)
n = 5_000_000
df = pd.DataFrame({
    "id": np.arange(n),
    "ts": pd.date_range("2026-01-01", periods=n, freq="s"),
    "region": rng.choice(["north", "south", "east", "west"], n),
    "status": rng.choice(["ok", "warn", "fail"], n, p=[.9, .08, .02]),
    "value": rng.normal(100, 15, n),
    "count": rng.poisson(3, n),
})
for i in range(20):                        # a realistic wide frame
    df[f"feature_{i}"] = rng.normal(size=n)

df.to_csv("data.csv", index=False)
df.to_parquet("data.parquet")

os.path.getsize("data.csv") / 1e6          # ~2,600 MB
os.path.getsize("data.parquet") / 1e6      # ~700 MB   -- 3.7x smaller

# READING EVERYTHING:
# %timeit pd.read_csv("data.csv")                 -> ~35 s
# %timeit pd.read_parquet("data.parquet")         -> ~1.5 s     20x

# READING TWO COLUMNS OF 26:
# %timeit pd.read_csv("data.csv", usecols=["region", "value"])   -> ~18 s
# %timeit pd.read_parquet("data.parquet", columns=["region", "value"])  -> ~0.12 s
#
# usecols on CSV still PARSES every byte; it just discards columns
# after parsing. Parquet does not read the other 24 columns at all.
# 150x.

# THE DTYPES CAME BACK EXACTLY:
back = pd.read_parquet("data.parquet")
back.dtypes.equals(df.dtypes)              # True
#
# ts is datetime64, not a string. region is object (or category if it
# was). id is int64, not float64 because of a blank. No re-inference,
# no schema to pass, no leading zeros to protect.

# CATEGORICALS AND TIMEZONES SURVIVE:
df["region"] = df["region"].astype("category")
df["ts"] = df["ts"].dt.tz_localize("UTC")
df.to_parquet("typed.parquet")
pd.read_parquet("typed.parquet").dtypes
# region                  category
# ts          datetime64[ns, UTC]
#
# A CSV round trip loses both (see 5.1). This is the storage format
# for anything your own code will read again.

# WHY IT COMPRESSES BETTER: a column of four region names, stored
# together, is a dictionary of four strings plus a stream of 2-bit
# codes. The same column in a CSV is the full string, five to eight
# bytes, on every row.
os.path.getsize("typed.parquet") / 1e6     # smaller still with category
`,
      hl: [25, 30, 40, 51],
      caption: "**`usecols` on CSV still parses every byte and discards columns afterwards.** Parquet never reads the other 24 columns. Two columns of 26: 18 seconds against 0.12."
    },

    { t: "h2", n: "02", text: "Row groups, statistics and pushdown", id: "pushdown" },

    { t: "p", text: "**A Parquet file is divided horizontally into row groups, and each row group records the min and max of every column.** A reader with a filter compares the filter to those statistics first and skips any row group that cannot contain a match — so a query on a date range reads only the row groups covering that range." },

    { t: "code", lang: "python", title: "filters, row groups, and what the reader skipped", code: `
import pyarrow.parquet as pq

# FILTERS PUSH DOWN. The reader consults row-group statistics and
# skips groups that cannot match.
pd.read_parquet("data.parquet",
                columns=["ts", "value"],
                filters=[("status", "==", "fail")])
#
# Two things happened: only two columns were decoded (plus status, to
# evaluate the filter), and only rows matching were returned. And if
# the data were SORTED by status, whole row groups would be skipped.

# THE FILTER SYNTAX: a list of (column, op, value) tuples, ANDed.
# A list of lists is OR of ANDs.
filters = [("region", "in", ["north", "south"]), ("value", ">", 120)]
filters_or = [[("region", "==", "north")], [("value", ">", 130)]]

# LOOKING AT THE ROW GROUPS:
meta = pq.read_metadata("data.parquet")
meta.num_row_groups                        # e.g. 5 -- pandas default ~1M rows each
meta.row_group(0).num_rows

# THE STATISTICS THAT MAKE SKIPPING POSSIBLE:
rg = meta.row_group(0)
col = rg.column(1)                         # the "ts" column chunk
col.statistics.min, col.statistics.max    # earliest and latest ts in group 0
#
# For a filter ts > "2026-02-01", the reader checks each group's max.
# Groups whose max ts is before Feb 1 are skipped entirely -- not
# decompressed, not read from disk.

# WHY SORTING MATTERS FOR PUSHDOWN: statistics are only useful if
# they are NARROW. In our file ts is sorted, so each row group covers
# a distinct time span and a date filter skips most groups. region is
# random, so every row group contains all four regions -- min="east",
# max="west" -- and a region filter skips NOTHING. It still applies
# the filter after reading; it just cannot avoid the read.
#
# SORT BY THE COLUMN YOU FILTER ON MOST before writing:
df.sort_values("region").to_parquet("by_region.parquet")
# Now each row group is mostly one region, and a region filter skips
# most of the file.

# ROW GROUP SIZE IS A DIAL:
df.to_parquet("small_groups.parquet", row_group_size=100_000)
#
#   SMALLER row groups: finer statistics, more skipping, more metadata
#   LARGER row groups: better compression, fewer seeks
#
# 100k-1M rows is the usual range. pyarrow defaults to 1M (or 64 MB).
# For a file you filter heavily, smaller. For one you scan whole,
# larger.

# READING ONE ROW GROUP AT A TIME -- the Parquet form of chunking:
pf = pq.ParquetFile("data.parquet")
for i in range(pf.num_row_groups):
    chunk = pf.read_row_group(i, columns=["region", "value"]).to_pandas()
    # process(chunk)
#
# Bounded memory, and each chunk comes with its own statistics.

# WHAT PUSHDOWN CANNOT DO: filter on a computed expression. A filter
# on "value * 2 > 200" is not a column comparison and cannot use
# statistics. Rewrite it as ("value", ">", 100). Nor can it filter on
# a string prefix, a regex, or a function -- those are applied after
# reading.

# READING THE SCHEMA WITHOUT READING THE DATA:
pq.read_schema("data.parquet")
#
# Column names and types, from the footer, in milliseconds. The way
# to inspect a 50 GB file.
`,
      hl: [5, 22, 33, 60],
      caption: "**Statistics only help when they are narrow.** A random `region` column has min \"east\" and max \"west\" in every row group, so a region filter skips nothing — sort by the column you filter on most before writing."
    },

    { t: "callout", kind: "insight", title: "Pushdown is a property of the data, not the format", body: [
      { t: "p", text: "Parquet always stores min/max per row group. Whether a filter can use them depends on whether the filtered column's values are **clustered** within row groups — sorted, or partitioned, or naturally arriving in order." },
      { t: "p", text: "A file written in arrival order has narrow timestamp statistics (dates arrive in order) and useless region statistics (regions are mixed). **A date filter skips most of the file; a region filter reads all of it.**" },
      { t: "p", text: "Sorting by the most-filtered column before writing is the single cheapest thing you can do to a Parquet file. Partitioning by it (next section) is the next step." }
    ]},

    { t: "h2", n: "03", text: "Compression and partitioning", id: "layout" },

    { t: "code", lang: "python", title: "codecs, partitioned datasets, and the small-files problem", code: `
# COMPRESSION CODECS: the default is snappy. The alternatives trade
# size for speed.
for codec in ("snappy", "gzip", "zstd", "brotli", None):
    df.to_parquet(f"c_{codec}.parquet", compression=codec)
    print(codec, round(os.path.getsize(f"c_{codec}.parquet") / 1e6))
#
#   snappy   700 MB   fast to write, fast to read     -- the default
#   zstd     520 MB   slightly slower, much smaller   -- the usual choice now
#   gzip     480 MB   slow to write, slow to read
#   brotli   470 MB   slowest to write
#   None    1400 MB   no compression; only for a scratch file
#
# zstd is the modern answer: close to gzip's size at close to snappy's
# speed. snappy if the file is written once and read constantly by
# something latency-sensitive.

# DICTIONARY ENCODING is separate from compression and on by default:
# a column with few distinct values is stored as a dictionary plus
# integer codes. That is why a category column shrinks so much. It is
# automatic; you do not configure it.

# PARTITIONING: a dataset as a DIRECTORY, split by column value.
df.to_parquet("sales/", partition_cols=["region"])
#
# sales/
#   region=east/part-0.parquet
#   region=north/part-0.parquet
#   region=south/part-0.parquet
#   region=west/part-0.parquet
#
# The region column is NOT stored inside the files -- it is in the
# directory name. A filter on region reads only that directory:
pd.read_parquet("sales/", filters=[("region", "==", "north")])
#
# This is pushdown at the FILESYSTEM level. The other three quarters
# of the data are not opened.

# PARTITION BY TIME -- the common real case:
df["year"] = df["ts"].dt.year
df["month"] = df["ts"].dt.month
df.to_parquet("events/", partition_cols=["year", "month"])
#
# events/year=2026/month=1/..., events/year=2026/month=2/...
# A query for March reads one directory. A daily job appends one new
# directory and never rewrites old ones.

# THE SMALL-FILES PROBLEM -- the way partitioning goes wrong:
# df.to_parquet("bad/", partition_cols=["region", "status", "count"])
#
# 4 regions x 3 statuses x ~15 counts = 180 directories, many with a
# few hundred rows. Each file has fixed overhead (footer, metadata,
# row-group headers) and each is a separate open/seek/close. A
# thousand 50 KB files read SLOWER than one 50 MB file.
#
# RULES OF THUMB:
#   - partition on 1-2 columns, low cardinality, that appear in
#     most WHERE clauses (date, region, tenant)
#   - target files of 100 MB - 1 GB
#   - never partition on a high-cardinality column (user_id, order_id)
#   - if a partition is tiny, coarsen it (month, not day)

# APPENDING TO A PARTITIONED DATASET:
new_rows.to_parquet("events/", partition_cols=["year", "month"])
#
# Writes new part files into the matching directories. It does NOT
# merge with existing files, so repeated appends produce many small
# files per partition. Periodic compaction -- read a partition, write
# it back as one file -- is part of maintaining any append-only
# dataset.

# pyarrow.dataset FOR MORE CONTROL over a directory of files:
import pyarrow.dataset as ds
dataset = ds.dataset("events/", format="parquet", partitioning="hive")
dataset.schema
table = dataset.to_table(columns=["value"],
                         filter=(ds.field("month") == 3) & (ds.field("value") > 120))
table.to_pandas()
#
# The dataset API sees every file, applies partition and row-group
# pruning, and reads in parallel. It is what read_parquet uses on a
# directory, exposed.

# ARROW AS THE IN-MEMORY FORMAT -- skipping the pandas conversion:
pd.read_parquet("data.parquet", dtype_backend="pyarrow")
#
# Columns stay as Arrow arrays: string columns are Arrow strings (see
# 3.3, 4.5), no object dtype, no per-value Python objects. For a frame
# read from Parquet and mostly filtered and aggregated, this is faster
# and smaller than the NumPy backend.
`,
      hl: [3, 24, 47, 57],
      caption: "**A thousand 50 KB files read slower than one 50 MB file.** Partition on one or two low-cardinality columns that appear in most filters, and target files of 100 MB to 1 GB."
    },

    { t: "table",
      head: ["Format", "Layout", "Types", "Compression", "Streamable", "Use for"],
      rows: [
        ["CSV", "Row", "None — re-inferred every read", "External only (gzip)", "Yes", "Interchange with systems that read nothing else"],
        ["JSON Lines", "Row", "JSON's five types", "External only", "Yes", "Event feeds, nested records, logs"],
        ["Parquet", "**Column**", "Full — survive round trip", "**Built in, per column**", "By row group", "**Storage and analytics** — the default for anything read twice"],
        ["Arrow / Feather", "Column", "Full", "Optional", "By batch", "Fast local scratch; zero-copy between processes"],
        ["ORC", "Column", "Full", "Built in", "By stripe", "Hive ecosystems; otherwise Parquet"],
        ["Pickle", "Object graph", "Anything Python", "Optional", "No", "**Never for data at rest** — executes code on load, version-fragile"]
      ],
      caption: "**Pickle executes code when loaded and breaks across library versions.** It is a serialisation for a running process, not a storage format, and `pd.read_pickle` on a file you did not write is a security decision."
    },

    { t: "p", text: "You will meet one older binary store. **HDF5**, through `pd.HDFStore` and `to_hdf`, is a hierarchical container with fast appends and a `where=` query on indexed columns — good on a single machine with a single writer, awkward across languages and object stores, and displaced by Parquet for anything that leaves the laptop. If a pipeline still writes `.h5`, the conversion is one `read_hdf` and one `to_parquet`, and the row-group statistics you gain are the reason to do it." },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Convert a CSV archive into a dataset that answers questions quickly",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "Three years of daily CSV exports — about 1,100 files, 40 GB total — are queried by analysts who mostly ask for one region over a date range, or one metric across all regions for a month. Every query currently reads every file." },
        { t: "p", text: "Design and build the conversion to a partitioned Parquet dataset, in bounded memory, with a layout that makes both query shapes fast — and prove it with a read that touches only the files it needs." }
      ],
      requirements: [
        "Convert in bounded memory; no file larger than a chunk in RAM at once.",
        "Choose a partition scheme and justify it against both query shapes.",
        "Sort within partitions for pushdown on the second filter column.",
        "Apply a dtype schema so types are fixed at conversion.",
        "Show the files a filtered read opens, and that it is a small fraction.",
        "Include tests on a generated miniature archive."
      ],
      hint: "One query filters on region and date; the other on date and reads all regions. Only one of those columns should be a directory. Which one, and what does sorting do for the other?",
      solution: {
        lang: "python",
        title: "convert_archive.py",
        code: `import pandas as pd
import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
import pyarrow.dataset as ds
import os
import glob


# =========================================================================
# THE LAYOUT DECISION
# =========================================================================
#
# Query A: one region, a date range        WHERE region = ? AND date BETWEEN
# Query B: all regions, one month           WHERE date BETWEEN
#
# PARTITION BY MONTH, SORT BY REGION WITHIN EACH FILE.
#
#   - Both queries filter on date. A month directory means both read
#     only the months they need -- 1 to a few directories of 36.
#   - Query A additionally filters on region. Within a month's file,
#     rows sorted by region cluster each region into contiguous row
#     groups, so the region filter skips most row groups via
#     statistics. Query B reads the whole month file, which is what
#     it needs anyway.
#
# WHY NOT PARTITION BY REGION TOO?
#   month x region = 36 x 4 = 144 directories. Fine for cardinality,
#   but Query B then opens 4 files per month instead of 1, and each is
#   a quarter the size -- more seeks for the same bytes. And any new
#   region means a schema of directories changes. Sorting gives Query
#   A nearly the same benefit without the cost to Query B.
#
# WHY NOT PARTITION BY DAY?
#   1,100 directories, each ~36 MB. Under the 100 MB target; Query B
#   opens 30 files for a month. Month is the right grain.

SCHEMA = {
    "id": "int64",
    "region": "category",
    "metric": "float64",
    "count": "int32",
    "note": "string",
}


def convert(csv_glob, out_dir, *, row_group_size=200_000):
    """CSV archive -> month-partitioned, region-sorted Parquet."""
    files = sorted(glob.glob(csv_glob))
    stats = {"files_in": len(files), "rows": 0, "partitions": set()}

    # GROUP FILES BY MONTH so each partition is written ONCE, as one
    # file, rather than appended to daily (which makes 30 small files
    # per month -- the small-files problem).
    by_month = {}
    for f in files:
        # filename convention: export_2026-03-14.csv
        day = pd.Timestamp(os.path.basename(f)[7:17])
        by_month.setdefault(day.to_period("M"), []).append(f)

    for month, month_files in sorted(by_month.items()):
        parts = []
        for f in month_files:
            # ONE DAY AT A TIME IN MEMORY. ~36 MB CSV -> ~10 MB frame.
            part = pd.read_csv(f, dtype=SCHEMA, parse_dates=["date"],
                               date_format="%Y-%m-%d")
            parts.append(part)
        month_df = pd.concat(parts, ignore_index=True)
        del parts

        # SORT BY REGION, THEN DATE. Region is the second filter
        # column; sorting clusters it into row groups so statistics
        # are narrow. Date second so within a region the dates are
        # ordered too.
        month_df = month_df.sort_values(["region", "date"], kind="stable")

        # PARTITION COLUMNS as directory names. year/month are derived,
        # not stored twice.
        month_df["year"] = month_df["date"].dt.year.astype("int16")
        month_df["month"] = month_df["date"].dt.month.astype("int8")

        table = pa.Table.from_pandas(month_df, preserve_index=False)
        pq.write_to_dataset(
            table, root_path=out_dir,
            partition_cols=["year", "month"],
            compression="zstd",
            row_group_size=row_group_size,
            existing_data_behavior="overwrite_or_ignore",
        )
        stats["rows"] += len(month_df)
        stats["partitions"].add(str(month))
        del month_df, table

    stats["partitions"] = len(stats["partitions"])
    return stats


# =========================================================================
# PROVING THE READ TOUCHES FEW FILES
# =========================================================================

def files_touched(out_dir, filter_expr):
    """Which fragments (files) a filtered scan would read."""
    dataset = ds.dataset(out_dir, format="parquet", partitioning="hive")
    frags = list(dataset.get_fragments(filter=filter_expr))
    total = len(list(dataset.get_fragments()))
    return {"files_read": len(frags), "files_total": total,
            "paths": [os.path.relpath(fr.path, out_dir) for fr in frags[:5]]}


def query_a(out_dir, region, start, end):
    """One region, a date range."""
    start, end = pd.Timestamp(start), pd.Timestamp(end)
    months = pd.period_range(start, end, freq="M")
    f = ((ds.field("year").isin([int(m.year) for m in months]))
         & (ds.field("month").isin([int(m.month) for m in months]))
         & (ds.field("region") == region)
         & (ds.field("date") >= pa.scalar(start))
         & (ds.field("date") <= pa.scalar(end)))
    dataset = ds.dataset(out_dir, format="parquet", partitioning="hive")
    return dataset.to_table(filter=f, columns=["date", "metric", "count"]).to_pandas()


def query_b(out_dir, year, month):
    """All regions, one month."""
    f = (ds.field("year") == year) & (ds.field("month") == month)
    dataset = ds.dataset(out_dir, format="parquet", partitioning="hive")
    return dataset.to_table(filter=f).to_pandas()


# =========================================================================
# TESTS -- on a generated miniature archive
# =========================================================================

def _make_archive(root, days=90, rows_per_day=2000, seed=0):
    rng = np.random.default_rng(seed)
    os.makedirs(root, exist_ok=True)
    for d in pd.date_range("2026-01-01", periods=days):
        pd.DataFrame({
            "id": np.arange(rows_per_day),
            "date": d.strftime("%Y-%m-%d"),
            "region": rng.choice(["north", "south", "east", "west"], rows_per_day),
            "metric": rng.normal(100, 10, rows_per_day),
            "count": rng.poisson(3, rows_per_day),
            "note": "x",
        }).to_csv(f"{root}/export_{d.strftime('%Y-%m-%d')}.csv", index=False)


def test_conversion_preserves_rows(tmp="t_arch"):
    _make_archive(f"{tmp}/csv")
    stats = convert(f"{tmp}/csv/*.csv", f"{tmp}/pq")

    assert stats["files_in"] == 90
    assert stats["rows"] == 90 * 2000
    assert stats["partitions"] == 3               # Jan, Feb, Mar


def test_one_file_per_month(tmp="t_arch"):
    files = glob.glob(f"{tmp}/pq/**/*.parquet", recursive=True)
    assert len(files) == 3                        # not 90


def test_dtypes_survive(tmp="t_arch"):
    back = pd.read_parquet(f"{tmp}/pq")
    assert str(back["region"].dtype) == "category"
    assert back["count"].dtype == np.int32
    assert back["date"].dtype == "datetime64[ns]"


def test_query_b_touches_one_file(tmp="t_arch"):
    touched = files_touched(f"{tmp}/pq",
                            (ds.field("year") == 2026) & (ds.field("month") == 2))
    assert touched["files_read"] == 1
    assert touched["files_total"] == 3


def test_query_a_touches_only_its_months(tmp="t_arch"):
    touched = files_touched(f"{tmp}/pq",
                            (ds.field("month").isin([1, 2])) & (ds.field("region") == "north"))
    assert touched["files_read"] == 2


def test_region_is_clustered_in_row_groups(tmp="t_arch"):
    """Sorting by region makes row-group statistics narrow."""
    f = glob.glob(f"{tmp}/pq/year=2026/month=1/*.parquet")[0]
    meta = pq.read_metadata(f)
    region_idx = [i for i, n in enumerate(meta.schema.names) if n == "region"][0]
    spans = []
    for i in range(meta.num_row_groups):
        st = meta.row_group(i).column(region_idx).statistics
        spans.append((st.min, st.max))
    # At least one row group holds a SINGLE region (min == max).
    assert any(lo == hi for lo, hi in spans)


def test_query_a_result_is_correct(tmp="t_arch"):
    out = query_a(f"{tmp}/pq", "north", "2026-01-10", "2026-01-20")
    assert out["date"].min() >= pd.Timestamp("2026-01-10")
    assert out["date"].max() <= pd.Timestamp("2026-01-20")
    assert len(out) > 0


def test_query_b_has_all_regions(tmp="t_arch"):
    out = query_b(f"{tmp}/pq", 2026, 2)
    assert set(out["region"].astype(str)) == {"north", "south", "east", "west"}
    assert len(out) == 28 * 2000


def test_reconciles_to_csv(tmp="t_arch"):
    csv_total = sum(pd.read_csv(f)["count"].sum()
                    for f in glob.glob(f"{tmp}/csv/*.csv"))
    pq_total = pd.read_parquet(f"{tmp}/pq", columns=["count"])["count"].sum()
    assert csv_total == pq_total`,
        notes: [
          { t: "p", text: "**Partition by the column both queries filter on; sort by the column only one of them filters on.** Month directories serve both query shapes; sorting by region within each file clusters it into row groups so the region filter skips most of the month via statistics — without the cost to Query B of opening four files per month." },
          { t: "callout", kind: "insight", title: "One file per month, not thirty", body: [
            { t: "p", text: "Converting day by day and appending would produce 30 small files per partition — the small-files problem. **Grouping the CSVs by month and writing each partition once** produces one ~300 MB file, in the target range, and the test asserts exactly three files for ninety days." },
            { t: "p", text: "Memory stays bounded at one month's frame — ~300 MB of CSV as ~90 MB of typed columns — because each month is processed and released before the next." }
          ]},
          { t: "p", text: "**The row-group statistics test is the proof that sorting worked.** After sorting by region, at least one row group has `min == max` — a single region — which is what lets a region filter skip it. Unsorted, every group would span \"east\" to \"west\" and nothing would be skipped." },
          { t: "p", text: "**`files_touched` makes pushdown visible.** `get_fragments(filter=...)` lists the files a scan would open; Query B opens one of three, and the assertion is the only way to know the layout does what the design claims." },
          { t: "p", text: "**Types are fixed at conversion and never re-inferred.** The dtype schema is applied once at `read_csv`; every subsequent `read_parquet` gets category, int32 and datetime back exactly, with no leading zeros to protect and no blanks to float a column." },
          { t: "p", text: "**The reconciliation is against the source, not against the Parquet file's own claims.** Summing `count` across all CSVs and comparing to the dataset catches any day that was skipped, double-written, or truncated during conversion." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A Parquet file is written in arrival order. A filter on `ts > March` is fast but a filter on `region == \"north\"` reads the whole file. Why?",
          options: [
            "String filters cannot be pushed down",
            "Timestamps arrive in order so each row group covers a narrow range; regions are mixed so every row group's min–max spans all of them and none can be skipped",
            "The region column is not compressed",
            "Row groups only store statistics for the first column"
          ],
          answer: 1,
          why: "Pushdown depends on the data being clustered, not on the format. Statistics are always stored; they only help when they are narrow. Sorting by region before writing — or partitioning on it — is what makes the second filter fast."
        }
      ]
    }
  ],

  takeaways: [
    "**Columnar storage means reading a subset of columns reads a subset of the file** — CSV `usecols` still parses every byte.",
    "**Parquet types survive a round trip**: datetime, category, timezone, nullable integers — no re-inference and no schema to pass.",
    "**A row group is a horizontal slice with its own min/max per column**; a filter skips any group that cannot match.",
    "**Pushdown only helps when statistics are narrow** — sort by the column you filter on most before writing.",
    "**A filter on a computed expression cannot use statistics**; rewrite `value * 2 > 200` as `value > 100`.",
    "**`zstd` is the modern default codec**: close to gzip's size at close to snappy's speed.",
    "**Dictionary encoding is automatic** and is why a low-cardinality column shrinks so much.",
    "**Partitioning puts a column's value in the directory name**, so a filter on it never opens the other directories.",
    "**Partition on one or two low-cardinality columns that appear in most filters**; never on an identifier.",
    "**A thousand 50 KB files read slower than one 50 MB file** — target 100 MB to 1 GB per file and compact append-only partitions periodically.",
    "**`pq.read_schema` reads the footer in milliseconds** — the way to inspect a 50 GB file.",
    "**Pickle executes code on load and breaks across versions** — never a storage format for data at rest."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Reading two columns of 26 takes 18 s from CSV with `usecols` and 0.12 s from Parquet. Why the gap?",
        options: [
          "Parquet is cached",
          "CSV `usecols` parses every byte of every row and discards 24 columns afterwards; Parquet seeks to the two columns and never reads the rest",
          "The Parquet file is smaller",
          "pandas uses multiple threads for Parquet"
        ],
        answer: 1,
        why: "Row-oriented files cannot locate one column without passing through the others. The 150× difference is the columnar layout, before compression or threading are considered."
      },
      {
        stem: "What is the small-files problem?",
        options: [
          "Files under 1 KB cannot be compressed",
          "Over-partitioning produces thousands of tiny files, each with fixed overhead and a separate open/seek — reading them is slower than reading one large file",
          "Parquet cannot store fewer than 1,000 rows",
          "Small files lose their statistics"
        ],
        answer: 1,
        why: "Partitioning on three columns, or appending daily without compaction, produces this. Partition on one or two low-cardinality columns, target 100 MB–1 GB per file, and compact append-only partitions periodically."
      },
      {
        stem: "Which layout serves both \"one region over a date range\" and \"all regions for a month\"?",
        options: [
          "Partition by region and month",
          "Partition by month, sort by region within each file — both queries prune by month, and the region filter skips row groups via statistics without splitting the month into four files",
          "Partition by day",
          "One file, sorted by date"
        ],
        answer: 1,
        why: "Partitioning on both would make the all-regions query open four files per month for the same bytes. Sorting gives the region filter most of the pushdown benefit at no cost to the other query shape."
      },
      {
        stem: "Why is pickle unsuitable for storing data at rest?",
        options: [
          "It is too slow",
          "Loading a pickle executes arbitrary code, and the format breaks across library versions",
          "It cannot store DataFrames",
          "It does not compress"
        ],
        answer: 1,
        why: "A pickle from an untrusted source is a security decision, and one from last year's pandas may not load in this year's. It is a serialisation for a running process. Parquet stores the same frame with types intact and is readable by everything."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why is Parquet faster than CSV for analytics?",
        strong: "Three reasons that compound. It is columnar, so a query reading a few columns reads a few columns rather than parsing every byte. It stores types, so nothing is re-inferred on read. And each row group carries min/max statistics per column, so a filter skips chunks that cannot match. Compression is a fourth — similar values stored together compress far better — and it is typically three to five times smaller on disk.",
        answer: [
          { t: "p", text: "Ordering the reasons — layout, types, statistics, compression — shows you understand which one dominates for which query." }
        ]
      },
      {
        level: "advanced",
        q: "A Parquet filter on one column is fast and on another is slow. What would you check?",
        strong: "Whether the slow column's values are clustered within row groups. Statistics are always stored, but if every row group spans the column's full range — a region column in arrival order, say — nothing can be skipped. I would look at `read_metadata` for that column's min/max per row group, and if they all overlap, sort by that column before writing or partition on it.",
        answer: [
          { t: "p", text: "Going to the row-group metadata rather than guessing is the diagnostic step interviewers want to hear." }
        ]
      },
      {
        level: "advanced",
        q: "How would you design the partition scheme for a dataset with several common query patterns?",
        strong: "Partition on the column that appears in nearly every filter and has low cardinality — usually a date grain, chosen so files land between 100 MB and 1 GB. Sort within each partition by the next most common filter column, which gives it row-group pushdown without multiplying files. Never partition on an identifier, and if a scheme produces thousands of small files, coarsen it. Then prove it: list the fragments a filtered scan opens and assert it is a small fraction.",
        answer: [
          { t: "p", text: "The file-size target and the \"prove it\" step are what distinguish design from opinion." }
        ]
      }
    ]
  }
});

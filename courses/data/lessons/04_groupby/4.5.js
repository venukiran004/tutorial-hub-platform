/* ============================================================================
   LESSON 4.5 — String Operations at Scale
   ========================================================================= */
EC.receiveLesson({
  id: "4.5",

  lede: "**The `.str` accessor vectorises string operations, but on the default `object` dtype it is still a Python loop underneath.** The same `.str.contains` runs 30× faster on an Arrow-backed string column — and regex extraction, normalisation and the missing-value behaviour of every method are where the real bugs live.",

  objectives: [
    "Use the `.str` accessor for cleaning, matching and extraction",
    "Explain why the same operation is 30× faster on one dtype than another",
    "Extract structured fields from text with regex groups",
    "Normalise strings so that joins and groupbys match what they should",
    "Handle missing values correctly through every string method"
  ],

  prerequisites: ["3.3", "3.4"],

  blocks: [

    { t: "h2", n: "01", text: "The accessor and what it costs", id: "accessor" },

    { t: "p", text: "`s.str.upper()` applies `upper` to every element and returns a new Series. **On `object` dtype it does that with a Python loop; on `string[pyarrow]` it does it in compiled Arrow code.** Same source, same result, an order of magnitude apart." },

    { t: "dl", items: [
      ["`.str` accessor", "The namespace for vectorised string methods on a Series: `.str.lower()`, `.str.contains()`, `.str.extract()`. Only available on string-like columns."],
      ["`object` dtype", "Pointers to Python `str` objects. Every `.str` method loops in Python, one call per element."],
      ["`string[pyarrow]`", "Arrow-backed variable-length strings. `.str` methods run in C, and missing values are consistently `pd.NA`."],
      ["`na=`", "What a method returns for a missing input. `contains` returns `NaN` by default, which then **raises** when used as a boolean mask."],
      ["Regex group", "A parenthesised part of a pattern. `.str.extract` returns one column per group; named groups `(?P<name>...)` become column names."],
      ["Normalisation", "Reducing variants to a canonical form — case, whitespace, accents, punctuation — so that equal things compare equal."]
    ]},

    { t: "code", lang: "python", title: "the methods, and the dtype that decides their speed", code: `
import pandas as pd
import numpy as np

s = pd.Series(["  Alice Smith ", "bob JONES", None, "Carol-Ann Lee", ""])

# THE BASICS -- every method returns a new Series, aligned:
s.str.strip()                 # whitespace off both ends
s.str.lower()
s.str.title()                 # "Bob Jones"
s.str.len()                   # 14, 9, NaN, 13, 0  -- None -> NaN
s.str.replace("-", " ")       # literal by default in pandas 2.x
s.str.split()                 # lists: ["Alice", "Smith"], ...
s.str.split(expand=True)      # a DataFrame, one column per part
s.str[:3]                     # slicing works: "  A", "bob", NaN, "Car", ""
s.str.startswith("b")
s.str.cat(sep=", ")           # join all into one string, skipping NaN

# MISSING VALUES PASS THROUGH -- with one exception that bites:
s.str.upper()                 # None stays NaN. Fine.
s.str.contains("a")           # [True, False, NaN, True, False]
#
# That NaN is a problem the moment you index with it:
try:
    s[s.str.contains("a")]
except ValueError as e:
    print("cannot mask with NA")      # on object dtype: "Cannot mask with
                                      # non-boolean array containing NA"
s[s.str.contains("a", na=False)]      # decide: missing does not match
#
# na=False is not a default because "does a missing name contain 'a'"
# has no answer. But every filter on .str.contains needs it, and
# forgetting produces a ValueError on the first row with a gap.

# THE DTYPE COMPARISON, measured:
n = 1_000_000
words = np.random.default_rng(0).choice(["alpha", "beta", "gamma", "delta"], n)
obj = pd.Series(words, dtype=object)
arrow = pd.Series(words, dtype="string[pyarrow]")

# %timeit obj.str.upper()                     -> ~180 ms
# %timeit arrow.str.upper()                   -> ~6 ms       30x
# %timeit obj.str.contains("mm")              -> ~250 ms
# %timeit arrow.str.contains("mm")            -> ~9 ms
# %timeit obj.str.len()                       -> ~90 ms
# %timeit arrow.str.len()                     -> ~2 ms
#
# The object version calls Python's str.upper a million times. The
# Arrow version calls a compiled kernel once. Everything in this
# lesson applies to both; only the speed differs.

# CONVERTING IS ONE LINE, and worth doing at read time (see 3.3):
obj.astype("string[pyarrow]")
# pd.read_csv(..., dtype_backend="pyarrow")

# THE OTHER BEHAVIOUR DIFFERENCE: missing is pd.NA, consistently.
arrow_na = pd.Series(["a", None], dtype="string[pyarrow]")
arrow_na.str.contains("a")    # [True, <NA>] -- NA, not NaN
arrow_na.str.contains("a", na=False)      # [True, False]
#
# Same na= requirement. On the string dtype, comparisons ALSO
# propagate NA (see 3.4), so (arrow_na == "a") has an NA too.

# WHEN .str IS NOT AVAILABLE:
pd.Series([1, 2, 3]).str            # AttributeError: Can only use .str
                                    # accessor with string values
#
# A column of numbers read from a CSV with mixed content is object
# dtype and .str works; a column of ints does not. .astype(str) first
# if you genuinely want "123" as text -- and note that turns NaN into
# the STRING "nan":
pd.Series([1.0, np.nan]).astype(str).tolist()          # ['1.0', 'nan']
pd.Series([1.0, np.nan]).astype("string").tolist()     # ['1.0', <NA>]
#
# astype(str) is the wrong call on a column with missing values.
# astype("string") keeps them missing.
`,
      hl: [21, 25, 38, 66],
      caption: "**`.astype(str)` turns `NaN` into the string `\"nan\"`.** It then matches nothing, joins with nothing, and shows up as a category called `nan` in every report — `.astype(\"string\")` keeps missing values missing."
    },

    { t: "callout", kind: "trap", title: "na= is not optional on a filter", body: [
      { t: "p", text: "`s.str.contains(\"x\")` returns `NaN` for a missing input, and a boolean mask containing `NaN` raises `ValueError` when used to index. The filter works in development on clean data and fails in production on the first row with a gap." },
      { t: "p", text: "**`na=False` says a missing value does not match; `na=True` says it does.** Neither is the default because the question has no general answer — but every filter needs one of them." },
      { t: "p", text: "This is the string-method version of the `NaN > 5` problem in 3.4: a comparison against nothing has no boolean answer, and the accessor refuses to guess." }
    ]},

    { t: "h2", n: "02", text: "Extraction with regex", id: "regex" },

    { t: "p", text: "**`.str.extract` turns a pattern with groups into columns.** It is the tool for pulling a postcode out of an address, a product code out of a description, or a number and its unit out of \"3.5 kg\" — and its return shape depends on how many groups the pattern has." },

    { t: "viz",
      title: "One pattern, one column per group",
      caption: "A named group in the pattern becomes a named column in the result. Rows that do not match get NaN in every column — which is the row count check.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="An input string matched against a regex with three named groups, producing a three-column row">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">input</text>
  <rect x="30" y="38" width="280" height="30" rx="4" style="fill:var(--ink-4);fill-opacity:.08;stroke:var(--line);stroke-width:1.5"/>
  <text x="44" y="58" class="s-sub" style="fill:var(--ink-2)">"SKU-4821-XL  Red cotton shirt"</text>

  <text x="30" y="106" class="s-label" style="fill:var(--ink-2)">pattern</text>
  <text x="30" y="132" class="s-sub" style="fill:var(--ink-2)">r"SKU-</text>
  <rect x="86" y="116" width="118" height="24" rx="3" style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent);stroke-width:1.5"/>
  <text x="92" y="132" class="s-sub" style="fill:var(--accent)">(?P&lt;id&gt;\\d+)</text>
  <text x="208" y="132" class="s-sub" style="fill:var(--ink-2)">-</text>
  <rect x="220" y="116" width="150" height="24" rx="3" style="fill:var(--good);fill-opacity:.2;stroke:var(--good);stroke-width:1.5"/>
  <text x="226" y="132" class="s-sub" style="fill:var(--good)">(?P&lt;size&gt;[A-Z]+)</text>
  <text x="374" y="132" class="s-sub" style="fill:var(--ink-2)">\\s+</text>
  <rect x="406" y="116" width="130" height="24" rx="3" style="fill:var(--warn);fill-opacity:.2;stroke:var(--warn);stroke-width:1.5"/>
  <text x="412" y="132" class="s-sub" style="fill:var(--warn)">(?P&lt;desc&gt;.+)</text>
  <text x="540" y="132" class="s-sub" style="fill:var(--ink-2)">"</text>

  <g style="stroke:var(--ink-3);stroke-width:1.5">
    <line x1="145" y1="142" x2="145" y2="180" marker-end="url(#re-a)"/>
    <line x1="295" y1="142" x2="295" y2="180" marker-end="url(#re-a)"/>
    <line x1="471" y1="142" x2="471" y2="180" marker-end="url(#re-a)"/>
  </g>

  <text x="30" y="200" class="s-label" style="fill:var(--ink-2)">result</text>
  <g stroke-width="1.5">
    <rect x="90" y="186" width="110" height="30" style="fill:var(--accent);fill-opacity:.18;stroke:var(--accent)"/>
    <rect x="240" y="186" width="110" height="30" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
    <rect x="416" y="186" width="200" height="30" style="fill:var(--warn);fill-opacity:.18;stroke:var(--warn)"/>
  </g>
  <text x="100" y="206" class="s-sub" style="fill:var(--ink-2)">id = "4821"</text>
  <text x="250" y="206" class="s-sub" style="fill:var(--ink-2)">size = "XL"</text>
  <text x="426" y="206" class="s-sub" style="fill:var(--ink-2)">desc = "Red cotton shirt"</text>
  <text x="640" y="206" class="s-sub" style="fill:var(--ink-3)">← all strings; cast id after</text>

  <defs><marker id="re-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/></marker></defs>
</svg>`
    },

    { t: "code", lang: "python", title: "extract, findall, and the shape each returns", code: `
products = pd.Series([
    "SKU-4821-XL  Red cotton shirt",
    "SKU-77-S Blue jeans",
    "Green hat",                          # no SKU
    "SKU-9-M  ",
])

# extract WITH NAMED GROUPS -> a DataFrame with those column names:
parts = products.str.extract(r"SKU-(?P<id>\\d+)-(?P<size>[A-Z]+)\\s*(?P<desc>.*)")
parts
#      id size               desc
# 0  4821   XL   Red cotton shirt
# 1    77    S         Blue jeans
# 2   NaN  NaN                NaN     <- no match: NaN across the row
# 3     9    M                        <- empty desc, not NaN
#
# EVERY GROUP COMES BACK AS A STRING. id is "4821", not 4821:
parts["id"] = pd.to_numeric(parts["id"])      # cast after extracting

# THE NO-MATCH ROW IS YOUR COVERAGE CHECK:
parts["id"].isna().sum()                      # 1 -- one product without a SKU
parts["id"].isna().mean()                     # the fraction to report

# ONE UNNAMED GROUP -> a DataFrame with column 0 (expand=True default):
products.str.extract(r"SKU-(\\d+)")           # DataFrame, one column
products.str.extract(r"SKU-(\\d+)", expand=False)   # a Series
#
# The return type changes with expand=. Code that does
# .str.extract(...)["id"] breaks if the pattern has no named group;
# code that does .str.extract(..., expand=False).astype(int) breaks
# if it has two. Name the groups and keep expand=True.

# extractall -- EVERY MATCH, not just the first, as a MultiIndex:
tags = pd.Series(["#sale #new", "#new", "none"])
tags.str.extractall(r"#(\\w+)")
#          0
#   match
# 0 0     sale
#   1      new
# 1 0      new
#
# (original_index, match_number). Row 2 with no match is ABSENT, not
# NaN -- a different convention from extract.

# findall -- every match as a LIST per row:
tags.str.findall(r"#(\\w+)")                  # [["sale","new"], ["new"], []]
tags.str.findall(r"#(\\w+)").str.len()        # 2, 1, 0 -- count of matches
#
# Lists in a column are object dtype. explode() to get one row per
# match (see 3.5).

# contains, match, fullmatch -- THREE DIFFERENT QUESTIONS:
codes = pd.Series(["AB12", "AB123", "XAB12", "ab12"])
codes.str.contains(r"AB\\d{2}")               # T T T F -- anywhere in the string
codes.str.match(r"AB\\d{2}")                  # T T F F -- at the START
codes.str.fullmatch(r"AB\\d{2}")              # T F F F -- the WHOLE string
#
# Validating an identifier format means fullmatch. match lets "AB123"
# through; contains lets "XAB12" through. Both are silent.

codes.str.contains(r"ab\\d{2}", case=False)   # case-insensitive
codes.str.contains("AB", regex=False)         # literal, faster, no escaping

# REPLACE WITH GROUPS -- reformat in one call:
phones = pd.Series(["555-0100", "5550101", "(555) 0102"])
digits = phones.str.replace(r"\\D", "", regex=True)         # strip non-digits
digits.str.replace(r"(\\d{3})(\\d{4})", r"\\1-\\2", regex=True)   # 555-0100
#
# regex=True is REQUIRED in pandas 2.x for a pattern. Without it the
# pattern is treated as a literal string, and r"\\D" replaces nothing.

# split WITH A LIMIT AND expand -- for "key: value" style fields:
kv = pd.Series(["name: Alice Smith", "age: 30", "note: a: b"])
kv.str.split(": ", n=1, expand=True)         # n=1: split ONCE, at the first
#        0            1
# 0   name  Alice Smith
# 1    age           30
# 2   note         a: b       <- the second ": " is preserved
`,
      hl: [16, 23, 47, 62],
      caption: "**`contains` matches anywhere, `match` matches at the start, `fullmatch` matches the whole string.** Validating an identifier format is `fullmatch`; the other two let malformed values through silently."
    },

    { t: "h2", n: "03", text: "Normalisation: making equal things equal", id: "normalise" },

    { t: "p", text: "**A join or groupby matches on exact bytes.** `\"Acme Ltd\"`, `\"ACME LTD\"`, `\"Acme Ltd.\"` and `\"Acme  Ltd\"` are four groups, and the one with a non-breaking space is a fifth that looks identical on screen. Normalisation is the step that makes the data agree with the reader." },

    { t: "code", lang: "python", title: "a normalisation function, layer by layer", code: `
import unicodedata

names = pd.Series([
    "Acme Ltd", "ACME LTD", "Acme Ltd.", "Acme  Ltd",
    "Acme\\u00a0Ltd",                     # non-breaking space
    "Ácme Ltd",                          # accent
    " acme ltd ",
    None,
])

names.nunique()                          # 7 -- seven "different" companies

def normalise(s):
    """Reduce string variants to one canonical form.

    Each step is a decision about what counts as 'the same'. The
    order matters: strip accents before lowercasing, collapse
    whitespace after replacing the exotic kinds.
    """
    s = s.astype("string")               # NOT astype(str) -- keeps NA

    # 1. UNICODE: decompose accented characters and drop the accents.
    #    NFKD splits "Á" into "A" + combining acute; the encode/decode
    #    round trip discards the combining mark. It also folds
    #    look-alikes: fullwidth digits, ligatures, the non-breaking
    #    space (which becomes a plain space under NFKC/NFKD).
    s = s.map(lambda x: unicodedata.normalize("NFKD", x)
                                   .encode("ascii", "ignore")
                                   .decode("ascii")
              if pd.notna(x) else x)

    # 2. CASE.
    s = s.str.casefold()                 # stronger than lower(): handles ß etc.

    # 3. PUNCTUATION -- a decision. "Ltd." and "Ltd" are the same
    #    company; "3.5" and "35" are not. Here we drop trailing dots
    #    and commas only.
    s = s.str.replace(r"[.,]+(?=\\s|$)", "", regex=True)

    # 4. WHITESPACE: collapse runs, strip ends.
    s = s.str.replace(r"\\s+", " ", regex=True).str.strip()

    # 5. EMPTY BECOMES MISSING. "" after stripping is not a name.
    s = s.mask(s == "", pd.NA)
    return s

normalise(names).nunique()               # 1
normalise(names).tolist()
# ['acme ltd', 'acme ltd', 'acme ltd', 'acme ltd', 'acme ltd',
#  'acme ltd', 'acme ltd', <NA>]

# WHY THE .map FOR UNICODE: pandas has .str.normalize("NFKD"), but
# the encode/decode to drop the marks is not vectorised in the
# accessor. On Arrow strings, .str.normalize is fast and the lambda
# is the slow part -- acceptable for a few hundred thousand rows,
# and a reason to normalise ONCE at ingestion rather than per query.

# WHAT NORMALISATION IS NOT: it is not deduplication. "Acme Ltd" and
# "Acme Limited" survive it as two values. That needs a lookup table
# or fuzzy matching (see 6.4), which are decisions of a different
# kind -- ones that can be wrong.

# KEEP THE ORIGINAL. Normalise into a NEW column used for matching;
# display the original. Lowercased, de-accented names are for joining
# on, not for putting in a letter.
df = pd.DataFrame({"company": names})
df["company_key"] = normalise(df["company"])
df.groupby("company_key", dropna=False).size()

# THE PARTIAL CASES: a key that normalises to the same string is a
# MATCH; a display name is whichever original the business prefers.
canonical = (df.dropna(subset=["company_key"])
               .groupby("company_key")["company"]
               .agg(lambda g: g.value_counts().index[0]))   # most common spelling
`,
      hl: [18, 24, 47, 60],
      caption: "**Normalise into a new column used for matching and keep the original for display.** Lowercased, de-accented names are for joining on, not for putting in a letter."
    },

    { t: "ladder",
      title: "Filtering a million-row description column for a keyword",
      rungs: [
        { level: "bad", label: "apply with a Python function", code: `mask = df["desc"].apply(lambda x: "refund" in x.lower() if x else False)`,
          note: "**A Python call per row, plus a manual None check.** Correct, ~1 s per million rows, and the `if x` guard silently treats an empty string the same as missing." },
        { level: "ok", label: ".str.contains on object dtype", code: `mask = df["desc"].str.contains("refund", case=False, na=False)`,
          note: "**Vectorised in form, still a loop underneath**: ~250 ms per million on `object` dtype. `na=False` is stated, `case=False` avoids a separate `.lower()` pass. Fine until the frame is large." },
        { level: "best", label: "Arrow strings, converted once at read", code: `df = pd.read_csv(path, dtype_backend="pyarrow")     # once
mask = df["desc"].str.contains("refund", case=False, na=False)   # ~9 ms`,
          note: "**Same line, 30× faster**, because the kernel is compiled. The conversion happens once at ingestion, and every subsequent string operation on the frame benefits — which is the argument for choosing the dtype at read time rather than per query." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Parse a free-text address column into fields you can join on",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A customer table has one `address` column of free text. You need a UK postcode, an outward code (the first half, for regional grouping), a house number where one exists, and a flag for addresses that could not be parsed — so that a join to a postcode lookup table works and the failures are countable." },
        { t: "code", lang: "python", numbered: false, title: "what the column looks like", code: `
# "12 High Street, Cambridge, CB2 1TN"
# "Flat 3, 45a Mill Road  cambridge cb1 2az"
# "The Old Rectory, Grantchester CB3 9ND"
# "SW1A 1AA"
# "12 High Street, Cambridge, CB21TN"        <- no space in postcode
# "unknown"
# ""
# None`}
      ],
      requirements: [
        "Extract the postcode with a regex that handles missing spaces and lowercase.",
        "Normalise the postcode to canonical form (upper, single space before the last three characters).",
        "Derive the outward code.",
        "Extract a leading house number, including \"45a\".",
        "Report parse coverage and list failures.",
        "Include tests for every example above."
      ],
      hint: "A UK postcode's inward code is always exactly three characters: a digit and two letters. Anchor on that, and the outward code is whatever precedes it.",
      solution: {
        lang: "python",
        title: "parse_address.py",
        code: `import pandas as pd
import numpy as np


# =========================================================================
# THE POSTCODE PATTERN
# =========================================================================
#
# UK postcode structure:  OUTWARD  INWARD
#   outward: 1-2 letters, 1-2 digits, optional trailing letter
#            ("CB2", "CB21", "SW1A", "W1")
#   inward:  exactly one digit, then two letters ("1TN", "2AZ")
#
# The inward code is the anchor: it is always 3 characters and always
# digit-letter-letter, and it is always at the END of the postcode.
# Matching it first and working backwards is more robust than
# matching the outward code forwards, because the outward code has
# several shapes.
#
# The optional \\s* between the halves is what handles "CB21TN".

POSTCODE = (
    r"(?P<outward>[A-Za-z]{1,2}\\d[A-Za-z\\d]?)"     # CB2, CB21, SW1A
    r"\\s*"
    r"(?P<inward>\\d[A-Za-z]{2})"                     # 1TN
    r"\\b"
)

HOUSE = r"^\\s*(?:flat\\s+\\w+,?\\s*)?(?P<house>\\d+[A-Za-z]?)\\b"


def parse_addresses(addr):
    """Structured fields from free-text UK addresses.

    Returns a DataFrame aligned to addr's index, plus a coverage
    report. Failures are flagged, not dropped.
    """
    s = addr.astype("string").str.strip()

    out = pd.DataFrame(index=addr.index)
    out["address"] = addr

    # --- POSTCODE ----------------------------------------------------
    # extract takes the FIRST match. An address has one postcode, at
    # the end; the pattern's \\b keeps it from matching inside a word.
    pc = s.str.extract(POSTCODE, flags=0)

    # Canonical form: upper case, single space, outward + inward.
    out["outward"] = pc["outward"].str.upper()
    out["inward"] = pc["inward"].str.upper()
    out["postcode"] = out["outward"] + " " + out["inward"]

    # --- HOUSE NUMBER ------------------------------------------------
    # Only at the START of the address, optionally after "Flat N,".
    # "12 High Street" -> 12; "45a Mill Road" -> 45a;
    # "The Old Rectory" -> none. A number later in the string is a
    # street number or part of the postcode, not the house.
    out["house"] = s.str.extract(HOUSE, flags=2)["house"]     # 2 = IGNORECASE

    # --- FLAGS -------------------------------------------------------
    out["has_postcode"] = out["postcode"].notna()
    out["empty"] = s.isna() | (s == "")

    report = {
        "rows": len(out),
        "empty": int(out["empty"].sum()),
        "with_postcode": int(out["has_postcode"].sum()),
        "with_house": int(out["house"].notna().sum()),
        "postcode_coverage": round(
            float(out.loc[~out["empty"], "has_postcode"].mean()), 4)
            if (~out["empty"]).any() else 0.0,
        "unparsed_examples": (
            out.loc[~out["empty"] & ~out["has_postcode"], "address"]
               .head(10).tolist()
        ),
    }
    return out, report


# =========================================================================
# THE DECISIONS
# =========================================================================
#
# 1. astype("string"), NOT astype(str). The latter turns None into
#    the string "None" and NaN into "nan", both of which then look
#    like addresses with no postcode rather than missing addresses.
#
# 2. THE POSTCODE IS NORMALISED, THE ADDRESS IS NOT. The postcode
#    is a join key and must be canonical. The address is display
#    text and stays as it arrived.
#
# 3. A FAILED PARSE IS A ROW WITH NaN, NOT A DROPPED ROW. The
#    coverage report says how many; the examples say why. Dropping
#    the failures would make the join look cleaner and the customer
#    count smaller, silently.
#
# 4. THE OUTWARD CODE IS ITS OWN COLUMN because it is the join key
#    for anything regional. "CB2 1TN" and "CB2 1TP" share a district;
#    grouping on the full postcode would separate them.


# =========================================================================
# TESTS
# =========================================================================

EXAMPLES = pd.Series([
    "12 High Street, Cambridge, CB2 1TN",
    "Flat 3, 45a Mill Road  cambridge cb1 2az",
    "The Old Rectory, Grantchester CB3 9ND",
    "SW1A 1AA",
    "12 High Street, Cambridge, CB21TN",
    "unknown",
    "",
    None,
])


def test_standard_postcode():
    out, _ = parse_addresses(EXAMPLES)
    assert out.loc[0, "postcode"] == "CB2 1TN"
    assert out.loc[0, "outward"] == "CB2"


def test_lowercase_and_double_space():
    out, _ = parse_addresses(EXAMPLES)
    assert out.loc[1, "postcode"] == "CB1 2AZ"


def test_no_space_in_postcode():
    """CB21TN must normalise to CB2 1TN, not CB21 TN."""
    out, _ = parse_addresses(EXAMPLES)
    assert out.loc[4, "postcode"] == "CB2 1TN"
    assert out.loc[4, "outward"] == "CB2"


def test_four_character_outward():
    out, _ = parse_addresses(EXAMPLES)
    assert out.loc[3, "postcode"] == "SW1A 1AA"
    assert out.loc[3, "outward"] == "SW1A"


def test_house_numbers():
    out, _ = parse_addresses(EXAMPLES)
    assert out.loc[0, "house"] == "12"
    assert out.loc[1, "house"] == "45a"           # after "Flat 3,"
    assert pd.isna(out.loc[2, "house"])           # The Old Rectory


def test_house_number_is_not_the_postcode_digit():
    out, _ = parse_addresses(pd.Series(["SW1A 1AA"]))
    assert pd.isna(out.loc[0, "house"])


def test_unparsed_is_flagged_not_dropped():
    out, rep = parse_addresses(EXAMPLES)

    assert len(out) == len(EXAMPLES)
    assert not out.loc[5, "has_postcode"]
    assert "unknown" in rep["unparsed_examples"]


def test_empty_and_none_are_empty_not_unparsed():
    out, rep = parse_addresses(EXAMPLES)

    assert out.loc[6, "empty"] and out.loc[7, "empty"]
    assert rep["empty"] == 2
    assert "" not in rep["unparsed_examples"]


def test_coverage_excludes_empty_rows():
    _, rep = parse_addresses(EXAMPLES)
    # 6 non-empty; 5 with a postcode
    assert rep["postcode_coverage"] == round(5 / 6, 4)


def test_original_address_is_untouched():
    out, _ = parse_addresses(EXAMPLES)
    assert out.loc[1, "address"] == EXAMPLES[1]


def test_astype_str_would_have_invented_addresses():
    """The trap the string dtype avoids."""
    bad = EXAMPLES.astype(str)
    assert bad[7] == "None"
    good = EXAMPLES.astype("string")
    assert pd.isna(good[7])


def test_outward_groups_neighbouring_postcodes():
    out, _ = parse_addresses(pd.Series(["a CB2 1TN", "b CB2 1TP", "c CB3 9ND"]))
    assert out.groupby("outward").size().to_dict() == {"CB2": 2, "CB3": 1}


def test_join_to_lookup_works_on_canonical_form():
    lookup = pd.DataFrame({"postcode": ["CB2 1TN", "CB1 2AZ"],
                           "region": ["east", "east"]})
    out, _ = parse_addresses(EXAMPLES)
    joined = out.merge(lookup, on="postcode", how="left")

    assert joined["region"].notna().sum() == 3     # rows 0, 1 and 4`,
        notes: [
          { t: "p", text: "**The inward code is the anchor.** It is always exactly three characters — digit, letter, letter — at the end of the postcode, so matching it and working backwards is more robust than matching the outward code forwards, which has several shapes." },
          { t: "callout", kind: "trap", title: "astype(str) invents addresses", body: [
            { t: "p", text: "`None` becomes the string `\"None\"` and `NaN` becomes `\"nan\"`. Both then look like **addresses without a postcode** rather than missing addresses, and the parse-failure count is wrong in a way that blames the parser." },
            { t: "p", text: "`astype(\"string\")` keeps them missing. The test that checks `bad[7] == \"None\"` documents exactly what the wrong call does." }
          ]},
          { t: "p", text: "**The postcode is normalised and the address is not.** The postcode is a join key and must be canonical; the address is display text and stays as it arrived. Normalising the address would produce lowercased, de-accented text that is wrong to print on an envelope." },
          { t: "p", text: "**A failed parse is a row with NaN, not a dropped row.** The coverage report says how many failed and shows examples of why. Dropping them would make the join cleaner and the customer count smaller, and nobody would know." },
          { t: "p", text: "**The house-number pattern is anchored to the start.** A number anywhere else in the string is a street number, a flat number, or the digit in the postcode — the `SW1A 1AA` test checks that the postcode's digit is not taken as a house." },
          { t: "p", text: "**The outward code is its own column because it is the regional join key.** `CB2 1TN` and `CB2 1TP` share a district; grouping on the full postcode would separate neighbours that should be together." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`df[df.name.str.contains(\"smith\")]` raises `ValueError` in production but not in tests. Why?",
          options: [
            "The regex is invalid",
            "Production data has a missing name — `contains` returns NaN for it, and a mask containing NaN cannot be used to index",
            "The column is categorical",
            "The test data is sorted"
          ],
          answer: 1,
          why: "Every `.str` predicate returns a missing value for a missing input, and pandas refuses to treat that as True or False. `na=False` says a missing name does not match. The test fixture was clean, which is why the failure waited for real data."
        }
      ]
    }
  ],

  takeaways: [
    "**`.str` methods on `object` dtype are a Python loop underneath**; on `string[pyarrow]` they run compiled, 30× faster for the same line.",
    "**Convert to Arrow strings once at read time** and every string operation on the frame benefits.",
    "**`.str.contains` returns NaN for a missing input**, and a mask with NaN raises on indexing — `na=False` is required on every filter.",
    "**`.astype(str)` turns NaN into the string `\"nan\"`**; `.astype(\"string\")` keeps missing values missing.",
    "**`.str.extract` returns one column per group, named after named groups**, and every column is a string — cast numbers afterwards.",
    "**A row with no match gets NaN across every extracted column**, which is the coverage check.",
    "**`extractall` omits non-matching rows entirely; `extract` gives them NaN** — two conventions for the same absence.",
    "**`contains` matches anywhere, `match` at the start, `fullmatch` the whole string** — validation needs `fullmatch`.",
    "**`regex=True` is required for a pattern in `.str.replace`** — without it `r\"\\D\"` is a literal and replaces nothing.",
    "**Normalise into a new column used for matching; keep the original for display.**",
    "**Unicode normalisation (NFKD) folds accents, ligatures and the non-breaking space** that looks identical on screen and joins with nothing.",
    "**Normalisation is not deduplication**: \"Acme Ltd\" and \"Acme Limited\" survive it as two values."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is `s.str.upper()` 30× faster on `string[pyarrow]` than on `object` dtype?",
        options: [
          "Arrow strings are shorter",
          "The object version calls Python's `str.upper` once per element; the Arrow version calls one compiled kernel over the whole array",
          "Arrow caches results",
          "Object dtype does extra validation"
        ],
        answer: 1,
        why: "The accessor is vectorised in form on both dtypes, but only the Arrow backend has a compiled implementation. On `object` the per-element Python call dominates. The conversion is one line and is best done at read time so every later operation benefits."
      },
      {
        stem: "You validate identifiers with `codes.str.match(r\"AB\\d{2}\")` and `\"AB123\"` passes. Why?",
        options: [
          "The regex needs a `+`",
          "`match` anchors only at the start — `fullmatch` anchors both ends and would reject the extra digit",
          "`\\d{2}` matches three digits",
          "match is case-insensitive"
        ],
        answer: 1,
        why: "`match` asks \"does the string begin with this pattern\"; `contains` asks \"does it appear anywhere\"; only `fullmatch` asks \"is the whole string exactly this\". Format validation is the third question, and the other two let malformed values through silently."
      },
      {
        stem: "`\"Acme Ltd\"` and `\"Acme\\u00a0Ltd\"` appear as two groups in a groupby. What is the difference?",
        options: [
          "Trailing whitespace",
          "A non-breaking space in the second — visually identical, different bytes, and Unicode normalisation (NFKD/NFKC) folds it to a plain space",
          "Different capitalisation",
          "One has a trailing period"
        ],
        answer: 1,
        why: "Groupby matches exact bytes. Look-alike characters — non-breaking spaces, fullwidth digits, ligatures, accented forms — need Unicode normalisation before case folding and whitespace collapsing. Do it once at ingestion into a separate key column."
      },
      {
        stem: "`.str.extract` on a pattern with three named groups returns what?",
        options: [
          "A Series of tuples",
          "A DataFrame with three string columns named after the groups, with NaN across a row that did not match",
          "A list per row",
          "A MultiIndex Series"
        ],
        answer: 1,
        why: "Named groups become column names; every extracted value is a string regardless of what it looks like, so numeric fields need `pd.to_numeric` afterwards. The all-NaN rows are the parse failures — count them, report them, and do not drop them."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "A string filter works in tests and raises in production. What is the likely cause?",
        strong: "A missing value. `.str.contains` returns NaN for a missing input, and pandas refuses to use a mask containing NaN — it raises rather than guessing. `na=False` states that a missing value does not match. The test fixture had no gaps, which is why the failure waited for real data.",
        answer: [
          { t: "p", text: "Connecting this to the general `NaN > x` behaviour in comparisons shows you see the pattern rather than the instance." }
        ]
      },
      {
        level: "advanced",
        q: "String operations are the bottleneck in a pipeline. What would you change?",
        strong: "The dtype. On `object` columns every `.str` method is a Python loop; on `string[pyarrow]` the same method is a compiled kernel, typically 30× faster. I would convert at read time with `dtype_backend=\"pyarrow\"` so the whole frame benefits, rather than converting per query. Then I would look for `.apply(lambda)` on strings, which is the same loop written by hand, and for regex where a literal would do.",
        answer: [
          { t: "p", text: "Leading with the dtype rather than with micro-optimisations is the right order of magnitude." }
        ]
      },
      {
        level: "advanced",
        q: "How would you make company names from three source systems join correctly?",
        strong: "Build a normalised key column and join on that, keeping the originals for display. The key goes through Unicode NFKD to fold accents and look-alike characters, case folding, a stated punctuation rule, and whitespace collapsing — in that order. Then report what did not match. Normalisation gets \"ACME LTD.\" and \"Acme Ltd\" together; it does not get \"Acme Limited\", which needs a lookup table or fuzzy matching and is a decision that can be wrong.",
        answer: [
          { t: "p", text: "Separating normalisation from fuzzy matching — one is deterministic, the other is a judgement — is the distinction that shows you have done this on real data." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 3.3 — dtypes, Memory and Categoricals
   ========================================================================= */
EC.receiveLesson({
  id: "3.3",

  lede: "**A column of ten distinct strings repeated a million times costs about 65 MB in pandas and about 1 MB as a categorical.** Object dtype stores a pointer to a separate Python string object per row — so the memory a frame reports and the memory it actually occupies are two different numbers.",

  objectives: [
    "Measure a frame's true memory use, including the object columns",
    "Explain what `object` dtype costs and why `.str` methods are slow",
    "Convert to `category` and know when it makes things worse",
    "Choose between NumPy dtypes, nullable dtypes and Arrow-backed dtypes",
    "Apply a dtype schema at read time rather than converting afterwards"
  ],

  prerequisites: ["3.1", "1.1"],

  blocks: [

    { t: "h2", n: "01", text: "Measuring what a frame actually costs", id: "measure" },

    { t: "p", text: "**`df.memory_usage()` lies by default about object columns** — it reports 8 bytes per row for the pointer and ignores the strings those pointers lead to. On a text-heavy frame the real figure is routinely ten times larger." },

    { t: "dl", items: [
      ["`object` dtype", "A column of pointers to Python objects, usually `str`. Each pointer is 8 bytes; each string is a separate heap object of 50+ bytes."],
      ["`memory_usage(deep=True)`", "Follows the pointers and counts the referenced objects. The only figure worth quoting for a frame with text."],
      ["`category`", "Stores each distinct value once in a `categories` array, plus a small integer code per row. Memory falls with the number of distinct values, not the row count."],
      ["Cardinality", "The number of distinct values in a column. Low cardinality relative to row count is exactly the condition `category` exploits."],
      ["Nullable dtypes", "`Int64`, `boolean`, `Float64` — capital letters. They carry a separate mask, so an integer column can hold missing values without becoming float."],
      ["Arrow-backed dtypes", "`dtype=\"string[pyarrow]\"` and friends. Variable-length storage with no per-value Python object, and much faster string operations."]
    ]},

    { t: "viz",
      title: "One string column, three representations",
      caption: "Object dtype pays for a Python object per row. Categorical pays once per distinct value. Arrow pays once per character, with no object at all.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Object dtype pointers to string objects, categorical codes plus a small category array, and Arrow contiguous bytes with offsets">
  <text x="30" y="26" class="s-label" style="fill:var(--crit)">object — 1,000,000 rows, 10 distinct values</text>
  <g stroke-width="1.5">
    <rect x="30" y="38" width="44" height="26" style="fill:var(--crit);fill-opacity:.14;stroke:var(--crit)"/>
    <rect x="74" y="38" width="44" height="26" style="fill:var(--crit);fill-opacity:.14;stroke:var(--crit)"/>
    <rect x="118" y="38" width="44" height="26" style="fill:var(--crit);fill-opacity:.14;stroke:var(--crit)"/>
    <rect x="162" y="38" width="44" height="26" style="fill:var(--crit);fill-opacity:.14;stroke:var(--crit)"/>
  </g>
  <text x="212" y="56" class="s-sub" style="fill:var(--ink-3)">… 1M pointers, 8 MB</text>
  <g style="stroke:var(--crit);stroke-width:1.2">
    <line x1="52" y1="64" x2="80" y2="92" marker-end="url(#dt-c)"/>
    <line x1="96" y1="64" x2="180" y2="92" marker-end="url(#dt-c)"/>
    <line x1="140" y1="64" x2="280" y2="92" marker-end="url(#dt-c)"/>
    <line x1="184" y1="64" x2="380" y2="92" marker-end="url(#dt-c)"/>
  </g>
  <g stroke-width="1.5" style="fill:var(--crit);fill-opacity:.22;stroke:var(--crit)">
    <rect x="50" y="94" width="70" height="22" rx="3"/>
    <rect x="150" y="94" width="70" height="22" rx="3"/>
    <rect x="250" y="94" width="70" height="22" rx="3"/>
    <rect x="350" y="94" width="70" height="22" rx="3"/>
  </g>
  <text x="440" y="110" class="s-sub" style="fill:var(--crit)">1M str objects, ~57 MB — total ≈ 65 MB</text>

  <text x="30" y="160" class="s-label" style="fill:var(--good)">category</text>
  <g stroke-width="1.5">
    <rect x="30" y="172" width="24" height="22" style="fill:var(--good);fill-opacity:.28;stroke:var(--good)"/>
    <rect x="54" y="172" width="24" height="22" style="fill:var(--good);fill-opacity:.28;stroke:var(--good)"/>
    <rect x="78" y="172" width="24" height="22" style="fill:var(--good);fill-opacity:.28;stroke:var(--good)"/>
    <rect x="102" y="172" width="24" height="22" style="fill:var(--good);fill-opacity:.28;stroke:var(--good)"/>
  </g>
  <text x="136" y="188" class="s-sub" style="fill:var(--ink-3)">… 1M int8 codes, 1 MB</text>
  <g stroke-width="1.5" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)">
    <rect x="430" y="172" width="60" height="22" rx="3"/>
    <rect x="492" y="172" width="60" height="22" rx="3"/>
    <rect x="554" y="172" width="60" height="22" rx="3"/>
  </g>
  <text x="626" y="188" class="s-sub" style="fill:var(--good)">10 strings, once — total ≈ 1 MB</text>

  <text x="30" y="240" class="s-label" style="fill:var(--accent)">string[pyarrow]</text>
  <rect x="30" y="252" width="320" height="24" style="fill:var(--accent);fill-opacity:.20;stroke:var(--accent);stroke-width:1.5"/>
  <text x="44" y="269" class="s-sub" style="fill:var(--ink-2)">northsouthnortheast… contiguous bytes + offsets</text>
  <text x="370" y="269" class="s-sub" style="fill:var(--accent)">no Python objects — ~6 MB, and .str runs in C</text>

  <defs><marker id="dt-c" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 z" style="fill:var(--crit)"/></marker></defs>
</svg>`
    },

    { t: "code", lang: "python", title: "the real number, and where it goes", code: `
import pandas as pd
import numpy as np

rng = np.random.default_rng(0)
n = 1_000_000

df = pd.DataFrame({
    "user_id": rng.integers(1, 500_000, n),
    "region": rng.choice(["north", "south", "east", "west",
                          "central", "northeast", "southwest",
                          "northwest", "southeast", "midlands"], n),
    "status": rng.choice(["active", "churned", "trial"], n),
    "amount": rng.normal(500, 200, n),
    "is_paid": rng.random(n) > 0.5,
})

# THE DEFAULT REPORT UNDERSTATES BADLY:
df.memory_usage().sum() / 1e6            # ~40 MB -- pointers only
df.memory_usage(deep=True).sum() / 1e6   # ~155 MB -- the truth

# PER COLUMN, deep, is where the decisions get made:
(df.memory_usage(deep=True) / 1e6).round(1)
# Index      0.0
# user_id    8.0     int64
# region    64.8     object  <- 8 MB of pointers + 57 MB of strings
# status    56.0     object
# amount     8.0     float64
# is_paid    1.0     bool
#
# TWO STRING COLUMNS ARE 78% OF THE FRAME, and both have fewer than
# a dozen distinct values.

df.info(memory_usage="deep")             # the same thing, formatted

# CONVERTING THE OBVIOUS CANDIDATES:
small = df.copy()
small["region"] = small["region"].astype("category")
small["status"] = small["status"].astype("category")
small["user_id"] = pd.to_numeric(small["user_id"], downcast="unsigned")
small["amount"] = small["amount"].astype(np.float32)

small.memory_usage(deep=True).sum() / 1e6     # ~11 MB
1 - 11 / 155                                  # 93% smaller

# WHAT THE CATEGORY ACTUALLY STORES:
c = small["region"]
c.cat.categories                # Index(['central','east',...]) -- 10
c.cat.codes.dtype               # int8 -- ONE BYTE per row
c.cat.codes.head().tolist()     # [3, 0, 7, 1, 5]
#
# The codes dtype scales with cardinality: int8 up to 127 categories,
# then int16, then int32. Memory is n_rows x code_size, plus the
# categories stored once.

# THE CARDINALITY RULE, stated properly:
def category_worthwhile(s, threshold=0.5):
    """Categorical helps when distinct values are few relative to rows."""
    if s.dtype != object:
        return False, "not an object column"
    ratio = s.nunique() / len(s)
    if ratio > threshold:
        return False, f"{ratio:.0%} distinct -- category will not help"
    before = s.memory_usage(deep=True)
    after = s.astype("category").memory_usage(deep=True)
    return after < before, f"{before/1e6:.1f} MB -> {after/1e6:.1f} MB"

category_worthwhile(df["region"])          # (True, '64.8 MB -> 1.0 MB')

# WHEN CATEGORY MAKES IT WORSE -- a genuinely unique column:
ids = pd.Series([f"order-{i}" for i in range(n)])
ids.memory_usage(deep=True) / 1e6                   # ~63 MB
ids.astype("category").memory_usage(deep=True) / 1e6  # ~71 MB -- BIGGER
#
# Every value is distinct, so the categories array holds all n strings
# AND you now pay for a 4-byte code per row on top. Categorical is a
# compression scheme, and it fails on incompressible data.
`,
      hl: [19, 30, 47, 71],
      caption: "**`memory_usage()` without `deep=True` reports 40 MB for a frame that occupies 155 MB.** The difference is entirely the strings the object columns point at."
    },

    { t: "callout", kind: "trap", title: "Categorical on a unique column makes it larger", body: [
      { t: "p", text: "A column of one million distinct order IDs goes from 63 MB to 71 MB when converted, because the categories array holds every string *and* you add a 4-byte code per row." },
      { t: "p", text: "**Categorical is a compression scheme.** Like every compression scheme it has an expansion case, and a high-cardinality identifier is precisely it." },
      { t: "p", text: "**Check the ratio before converting**, or simply measure `memory_usage(deep=True)` before and after — the conversion is cheap enough to test and the answer is unambiguous." }
    ]},

    { t: "h2", n: "02", text: "The three string representations", id: "strings" },

    { t: "p", text: "pandas now offers three ways to hold text, and the default is the worst of them. **Choosing deliberately affects memory, speed and how missing values behave** — all three, not just one." },

    { t: "table",
      head: ["dtype", "Storage", "Missing value", "`.str` speed", "Use when"],
      rows: [
        ["`object`", "Pointers to Python `str`", "`None` **or** `np.nan`, inconsistently", "Slow — a Python loop", "Legacy, or genuinely mixed types"],
        ["`category`", "Codes + distinct values", "`NaN`, not a category", "Fast on the categories, then mapped", "Low cardinality, repeated values"],
        ["`string` (Arrow)", "Contiguous bytes + offsets", "`pd.NA`, consistently", "Fast — vectorised in C", "**Any text column**, as the default choice"]
      ],
      caption: "**`object` is the default only for historical reasons.** For a new pipeline, `string[pyarrow]` for text and `category` for repeated labels covers nearly every case."
    },

    { t: "code", lang: "python", title: "why the string dtype is worth the conversion", code: `
text = pd.Series(rng.choice(["alpha", "beta", "gamma", "delta"], 500_000))

obj = text.astype(object)
arrow = text.astype("string[pyarrow]")
cat = text.astype("category")

obj.memory_usage(deep=True) / 1e6         # ~33 MB
arrow.memory_usage(deep=True) / 1e6       # ~3 MB
cat.memory_usage(deep=True) / 1e6         # ~0.5 MB

# STRING OPERATIONS -- the gap is large:
# %timeit obj.str.upper()                 -> ~180 ms  (Python loop)
# %timeit arrow.str.upper()               -> ~12 ms   (C, vectorised)
# %timeit cat.str.upper()                 -> ~2 ms    (4 values, mapped)
#
# The categorical wins because .str on a categorical operates on the
# CATEGORIES and then remaps the codes -- four operations, not 500,000.

# MISSING VALUES BEHAVE DIFFERENTLY, and this is the part that bites:
o = pd.Series(["a", None, "c"], dtype=object)
s = pd.Series(["a", None, "c"], dtype="string")

o[1]                          # None
s[1]                          # <NA>

o.str.upper()[1]              # None -- propagates as None
s.str.upper()[1]              # <NA>

(o == "a").tolist()           # [True, False, False] -- None compared False
(s == "a").tolist()           # [True, <NA>, False] -- NA propagates
#
# THE SECOND IS CORRECT. "Is this unknown value equal to 'a'?" has no
# answer, and pd.NA says so rather than guessing False.
#
# BUT A MASK CONTAINING <NA> RAISES WHEN YOU INDEX WITH IT:
try:
    s[s == "a"]
except ValueError as e:
    print("Cannot mask with non-boolean array containing NA")

s[(s == "a").fillna(False)]   # state the intent explicitly

# NULLABLE INTEGERS -- the other half of the same story:
plain = pd.Series([1, 2, None])
plain.dtype                   # float64 -- INTEGERS SILENTLY BECAME FLOAT
plain[0]                      # 1.0

nullable = pd.Series([1, 2, None], dtype="Int64")     # capital I
nullable.dtype                # Int64
nullable[0]                   # 1 -- still an integer
nullable[2] is pd.NA          # True
#
# THE FLOAT CONVERSION IS NOT HARMLESS. float64 represents integers
# exactly only up to 2**53. An int64 ID above that loses precision:
big = pd.Series([9007199254740993, None])
big[0]                        # 9007199254740992.0 -- OFF BY ONE
pd.Series([9007199254740993, None], dtype="Int64")[0]   # exact
#
# Snowflake IDs, Twitter IDs and many database sequences exceed 2**53.
# A nullable integer column is not a nicety there; it is correctness.

# CONVERTING A WHOLE FRAME:
df.convert_dtypes()           # picks nullable dtypes automatically
df.convert_dtypes(dtype_backend="pyarrow")            # Arrow-backed
#
# convert_dtypes is a good starting point and not a final answer -- it
# will not choose category for you, because it cannot know your
# cardinality intentions.
`,
      hl: [16, 32, 46, 57],
      caption: "**A `None` in an integer column silently converts it to `float64`**, and `float64` represents integers exactly only up to 2⁵³ — which many database ID sequences exceed."
    },

    { t: "h2", n: "03", text: "Categoricals beyond memory", id: "beyond" },

    { t: "p", text: "**Categorical is not only a memory optimisation — it carries an ordering and a fixed value set**, and both change how the rest of pandas treats the column." },

    { t: "code", lang: "python", title: "ordering, unused categories and the groupby surprise", code: `
sizes = pd.Series(["small", "large", "medium", "small"])

# UNORDERED BY DEFAULT -- comparisons raise, which is correct:
c = sizes.astype("category")
try:
    c < "medium"
except TypeError:
    print("Unordered Categoricals can only compare equality")

# ORDERED CATEGORICAL -- sorting and comparison follow YOUR order:
order = pd.CategoricalDtype(["small", "medium", "large"], ordered=True)
c = sizes.astype(order)

c.sort_values().tolist()      # ['small','small','medium','large']
(c < "large").tolist()        # [True, False, True, True]
c.max()                       # 'large'
#
# Without this, sorting is ALPHABETICAL: large, medium, small -- which
# is wrong in a way that looks fine on a chart axis.

# THE GROUPBY SURPRISE -- unused categories still appear:
df2 = pd.DataFrame({
    "size": pd.Series(["small", "small", "large"], dtype=order),
    "n": [1, 2, 3],
})
df2.groupby("size", observed=False)["n"].sum()
# small     3
# medium    0     <- NO ROWS, but the category exists
# large     3
#
df2.groupby("size", observed=True)["n"].sum()      # only what is present
#
# observed=False is the pandas 2.x default and produces rows for
# combinations that never occurred. On TWO categorical keys this is
# a cartesian product: 100 x 100 categories gives 10,000 rows from a
# frame with 50. It is the most common cause of a groupby that
# unexpectedly explodes.

# FILTERING DOES NOT DROP CATEGORIES -- deliberately:
sub = df2[df2["size"] == "small"]
sub["size"].cat.categories                 # still all three
sub["size"].cat.remove_unused_categories() # explicit cleanup

# COMBINING CATEGORICALS WITH DIFFERENT CATEGORIES falls back:
a = pd.Series(["x", "y"], dtype="category")
b = pd.Series(["y", "z"], dtype="category")
pd.concat([a, b]).dtype       # object -- the memory saving is gone
#
# Give both the SAME dtype and it survives:
shared = pd.CategoricalDtype(["x", "y", "z"])
pd.concat([a.astype(shared), b.astype(shared)]).dtype     # category

# ADDING A VALUE THAT IS NOT A CATEGORY GIVES NaN, not an error:
s = pd.Series(["x", "y"], dtype="category")
s.iloc[0] = "z"               # TypeError in recent pandas
s = s.cat.add_categories(["z"])
s.iloc[0] = "z"               # now fine
#
# THIS IS A FEATURE: a fixed category set is a schema constraint, and
# it catches a typo that an object column would accept silently.
`,
      hl: [18, 30, 41, 55],
      caption: "**`observed=False` produces a row for every category combination, including ones that never occurred.** On two categorical keys that is a cartesian product, and the single most common cause of a `groupby` that explodes."
    },

    { t: "p", text: "Two converters for a frame that arrived as `object` everywhere — a JSON payload, a scraped table, a `read_csv` with `dtype=str`. **`infer_objects()`** looks at each object column and, where every value is already a Python int, float or bool, gives it the proper NumPy dtype; it never parses strings. **`convert_dtypes()`** goes further and chooses the nullable extension types — `Int64`, `string`, `boolean` — so a column of integers with a gap stays integer. Neither turns `\"12\"` into 12; that is `pd.to_numeric`." },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A dtype optimiser that reports what it changed and why",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Write a utility that takes a frame straight from `read_csv` and returns an optimised copy plus a report. It has to be safe to run unattended in a pipeline, which means it must never change a value, only a representation." },
        { t: "p", text: "Then produce a dtype schema from the result, so subsequent loads can be typed at read time instead of converted afterwards." }
      ],
      requirements: [
        "Downcast integers and floats only where the round trip is exact.",
        "Convert object columns to category only where it actually saves memory.",
        "Never convert a column whose values would change.",
        "Report per-column before and after, with the reason for each decision.",
        "Emit a `dtype=` dict usable by `read_csv`.",
        "Include tests, including one proving values are unchanged."
      ],
      hint: "A float column of whole numbers looks like an integer candidate. Think about what happens if it contains NaN, and what happens next month if it does not today.",
      solution: {
        lang: "python",
        title: "optimise_dtypes.py",
        code: `import pandas as pd
import numpy as np


# =========================================================================
# THE PRINCIPLE
# =========================================================================
#
# This function may change a column's REPRESENTATION. It must never
# change a VALUE. Every conversion is therefore checked by round trip
# rather than by reasoning about ranges, because the reasoning is
# where the mistakes live.


def _roundtrips(s, dtype):
    """True if converting to dtype and back preserves every value."""
    try:
        converted = s.astype(dtype)
    except (ValueError, TypeError, OverflowError):
        return False

    back = converted.astype(s.dtype)
    both_na = s.isna() & back.isna()
    equal = (s == back) | both_na
    return bool(equal.all())


def optimise(df, *, category_max_ratio=0.5, float32_ok=True,
             protect=()):
    """Return a memory-optimised copy plus a per-column report.

    protect  column names that must keep their dtype -- currency,
             identifiers, anything a downstream system parses strictly
    """
    out = df.copy()
    report = {}
    before_total = df.memory_usage(deep=True).sum()

    for col in df.columns:
        s = df[col]
        before = s.memory_usage(deep=True)

        if col in protect:
            report[col] = {"from": str(s.dtype), "to": str(s.dtype),
                           "saved": 0, "why": "protected by caller"}
            continue

        new, why = _choose(s, category_max_ratio, float32_ok)

        if new is None:
            report[col] = {"from": str(s.dtype), "to": str(s.dtype),
                           "saved": 0, "why": why}
            continue

        out[col] = s.astype(new)
        after = out[col].memory_usage(deep=True)

        # REFUSE A CONVERSION THAT DOES NOT PAY. Categorical on a
        # high-cardinality column is the case this catches.
        if after >= before:
            out[col] = s
            report[col] = {"from": str(s.dtype), "to": str(s.dtype),
                           "saved": 0,
                           "why": f"{why}, but it grew -- reverted"}
            continue

        report[col] = {
            "from": str(s.dtype),
            "to": str(new),
            "before_mb": round(before / 1e6, 3),
            "after_mb": round(after / 1e6, 3),
            "saved": int(before - after),
            "why": why,
        }

    after_total = out.memory_usage(deep=True).sum()
    summary = {
        "before_mb": round(before_total / 1e6, 2),
        "after_mb": round(after_total / 1e6, 2),
        "reduction": round(1 - after_total / before_total, 4),
        "columns": report,
    }
    return out, summary


def _choose(s, category_max_ratio, float32_ok):
    """Pick a dtype for one column, with the reason."""

    if s.isna().all():
        return None, "all missing -- nothing to infer from"

    # --- BOOLEAN ------------------------------------------------------
    if s.dtype == bool:
        return None, "already minimal"

    # --- INTEGER ------------------------------------------------------
    if pd.api.types.is_integer_dtype(s):
        for dt in ("int8", "int16", "int32", "int64"):
            if _roundtrips(s, dt):
                if np.dtype(dt).itemsize < s.dtype.itemsize:
                    return dt, f"range fits {dt}"
                return None, "already narrowest"
        return None, "needs full width"

    # --- FLOAT --------------------------------------------------------
    if pd.api.types.is_float_dtype(s):
        # A FLOAT COLUMN OF WHOLE NUMBERS IS *NOT* AN INTEGER COLUMN.
        # It is almost always a float column that read_csv widened
        # because of a NaN, or an integer column that will acquire a
        # NaN next month. Converting to int64 makes the next load
        # fail; converting to Int64 (nullable) is the safe version.
        if not s.isna().any() and (s % 1 == 0).all():
            for dt in ("Int8", "Int16", "Int32", "Int64"):
                if _roundtrips(s, dt):
                    return dt, f"whole numbers -- nullable {dt} keeps room for NA"

        if float32_ok and _roundtrips(s, "float32"):
            return "float32", "float32 round trip is exact"
        return None, "float64 precision is required"

    # --- OBJECT -------------------------------------------------------
    if s.dtype == object:
        non_null = s.dropna()
        if not len(non_null):
            return None, "no values"

        if not non_null.map(type).eq(str).all():
            kinds = sorted({type(v).__name__ for v in non_null.head(100)})
            return None, f"mixed types {kinds} -- leave as object"

        ratio = s.nunique(dropna=True) / len(s)
        if ratio <= category_max_ratio:
            return "category", f"{ratio:.1%} distinct -- category compresses"
        return "string[pyarrow]", (
            f"{ratio:.1%} distinct -- too varied for category, "
            "Arrow strings still beat object"
        )

    return None, "no rule for this dtype"


# =========================================================================
# EMITTING A SCHEMA FOR read_csv
# =========================================================================

def schema_from(df):
    """A dtype= dict for read_csv, so the next load never allocates
    the object columns at all.

    NOTE: read_csv cannot produce a 'category' with a FIXED category
    list this way -- it infers the categories from the file. If the
    category set is a contract, apply a CategoricalDtype after loading
    instead, so an unexpected value becomes NaN rather than a new
    silent category.
    """
    out = {}
    for col, dt in df.dtypes.items():
        out[col] = "category" if str(dt) == "category" else str(dt)
    return out


# =========================================================================
# USING IT
# =========================================================================

rng = np.random.default_rng(0)
n = 200_000
raw = pd.DataFrame({
    "order_id": np.arange(n),
    "customer": rng.integers(1, 5000, n),
    "region": rng.choice(["north", "south", "east", "west"], n),
    "sku": [f"sku-{i}" for i in range(n)],           # unique -- no category
    "quantity": rng.integers(1, 9, n).astype(float), # whole floats
    "price": rng.normal(50, 10, n),
    "total_paid": (rng.normal(50, 10, n) * 100).round() / 100,
})

opt, rep = optimise(raw, protect=("total_paid",))

rep["reduction"]                          # ~0.75
rep["columns"]["region"]["to"]            # 'category'
rep["columns"]["sku"]["why"]              # too varied -> Arrow strings
rep["columns"]["quantity"]["to"]          # 'Int8'
rep["columns"]["total_paid"]["why"]       # 'protected by caller'


# =========================================================================
# TESTS
# =========================================================================

def _fixture():
    return pd.DataFrame({
        "small_int": [1, 2, 3, 4],
        "big_int": [2**40, 1, 2, 3],
        "whole_float": [1.0, 2.0, 3.0, 4.0],
        "real_float": [1.5, 2.25, 3.125, 4.0],
        "precise": [0.1234567890123, 1.0, 2.0, 3.0],
        "low_card": ["a", "b", "a", "b"],
        "high_card": ["p", "q", "r", "s"],
        "mixed": [1, "two", 3.0, None],
    })


def test_no_value_changes():
    """The property that makes this safe to run unattended."""
    df = _fixture()
    opt, _ = optimise(df)

    for col in df.columns:
        original = df[col]
        new = opt[col].astype(original.dtype)
        both_na = original.isna() & new.isna()
        assert ((original == new) | both_na).all(), col


def test_small_int_is_downcast():
    opt, rep = optimise(_fixture())

    assert rep["columns"]["small_int"]["to"] == "int8"


def test_large_int_is_not_downcast():
    opt, rep = optimise(_fixture())

    assert opt["big_int"].dtype == np.int64


def test_whole_floats_become_nullable_not_plain_int():
    """Plain int would break the next load if a NaN ever appears."""
    opt, rep = optimise(_fixture())

    assert str(opt["whole_float"].dtype).startswith("Int")
    assert opt["whole_float"].isna().sum() == 0

    with_na = opt["whole_float"].copy()
    with_na.iloc[0] = pd.NA                # still works -- would not on int8
    assert with_na.isna().sum() == 1


def test_precision_sensitive_float_is_left_alone():
    opt, rep = optimise(_fixture())

    assert opt["precise"].dtype == np.float64
    assert "precision" in rep["columns"]["precise"]["why"]


def test_low_cardinality_becomes_category():
    opt, rep = optimise(_fixture())

    assert str(opt["low_card"].dtype) == "category"


def test_unique_column_is_not_made_a_category():
    """Categorical on unique values makes the column bigger."""
    df = pd.DataFrame({"id": [f"order-{i}" for i in range(50_000)]})
    opt, rep = optimise(df)

    assert str(opt["id"].dtype) != "category"
    assert opt["id"].memory_usage(deep=True) <= df["id"].memory_usage(deep=True)


def test_mixed_type_column_is_left_alone():
    opt, rep = optimise(_fixture())

    assert opt["mixed"].dtype == object
    assert "mixed types" in rep["columns"]["mixed"]["why"]


def test_protected_columns_are_untouched():
    df = _fixture()
    opt, rep = optimise(df, protect=("small_int",))

    assert opt["small_int"].dtype == df["small_int"].dtype
    assert rep["columns"]["small_int"]["why"] == "protected by caller"


def test_schema_round_trips():
    opt, _ = optimise(_fixture())
    schema = schema_from(opt)

    assert schema["low_card"] == "category"
    assert set(schema) == set(opt.columns)


def test_all_missing_column_is_safe():
    df = pd.DataFrame({"empty": [None, None, None]})
    opt, rep = optimise(df)

    assert "all missing" in rep["columns"]["empty"]["why"]`,
        notes: [
          { t: "p", text: "**Every conversion is verified by round trip, not by reasoning about ranges.** The reasoning is exactly where mistakes live — a range check that looks right for today's data is the mechanism behind silent integer overflow." },
          { t: "callout", kind: "insight", title: "A float column of whole numbers is not an integer column", body: [
            { t: "p", text: "It is almost always a column `read_csv` widened because of a single `NaN`, or one that will acquire a `NaN` next month. **Converting it to `int64` makes the next load fail**; converting to nullable `Int64` keeps the memory saving and the room for missing values." },
            { t: "p", text: "This is the difference between an optimiser that runs unattended for a year and one that breaks on the first month with an incomplete record." }
          ]},
          { t: "p", text: "**The optimiser reverts any conversion that did not pay.** Categorical on a high-cardinality column grows the data, and measuring after the fact is more reliable than predicting from a cardinality ratio alone." },
          { t: "p", text: "**`protect=` exists because some columns are not the optimiser's business.** Currency and identifiers have correctness requirements that no memory measurement can see, and a pipeline utility that cannot be told to leave a column alone will eventually be run on one it should have." },
          { t: "p", text: "**`read_csv` cannot pin a category's value set.** It infers the categories from the file, so an unexpected value silently becomes a new category — apply a `CategoricalDtype` after loading when the set is a contract, and it becomes `NaN` instead." },
          { t: "p", text: "**Mixed-type object columns are left alone and reported.** Guessing a dtype for a column that holds integers, strings and `None` would change values; naming the types found is more useful than a conversion nobody asked for." }
        ]
      }
    },

    { t: "callout", kind: "production", title: "In production", body: [
      { t: "p", text: "**Type at read time, not afterwards.** `read_csv(path, dtype=schema)` never allocates the object columns; converting after the fact means peak memory is the *unoptimised* size, which is precisely the number you were trying to avoid." },
      { t: "p", text: "**A dtype schema is a contract worth version-controlling.** It documents what each column is, fails loudly when the source changes shape, and makes the memory characteristics of a job predictable rather than emergent." },
      { t: "p", text: "**Measure with `deep=True` or do not quote the number.** A frame reporting 40 MB and occupying 155 MB is the normal case for anything with text in it, and capacity planning built on the shallow figure is planning for a different program." }
    ]}
  ],

  takeaways: [
    "**`memory_usage()` counts 8 bytes per row for object columns and ignores the strings** — only `deep=True` gives the real figure.",
    "**A million rows of ten distinct strings costs about 65 MB as object and about 1 MB as category.**",
    "**Categorical stores each distinct value once plus a small integer code per row**, so memory scales with cardinality rather than row count.",
    "**Categorical on a unique column makes it larger** — it is a compression scheme, and identifiers are its expansion case.",
    "**`string[pyarrow]` is the right default for text**: no Python objects, consistent `pd.NA`, and `.str` methods that run in C.",
    "**A `None` in an integer column silently converts it to `float64`**, which represents integers exactly only up to 2⁵³.",
    "**Nullable dtypes use capital letters** — `Int64`, `boolean`, `Float64` — and carry a mask so integers stay integers.",
    "**A `pd.NA` in a boolean mask raises on indexing**; `.fillna(False)` states the intent explicitly.",
    "**An unordered categorical refuses `<` comparisons**, and sorting an unordered one is alphabetical — which looks fine on a chart axis and is wrong.",
    "**`observed=False` in `groupby` produces rows for combinations that never occurred**, a cartesian product on two categorical keys.",
    "**Concatenating categoricals with different category sets falls back to object**, silently discarding the saving.",
    "**Type at read time with a `dtype=` schema** — converting afterwards means peak memory was the unoptimised size anyway."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`df.memory_usage().sum()` reports 40 MB but the process holds 155 MB. Why?",
        options: [
          "pandas has overhead per frame",
          "Object columns are counted as 8 bytes per row for the pointer, excluding the string objects they point at",
          "The index is not counted",
          "Memory is fragmented"
        ],
        answer: 1,
        why: "`deep=True` follows the pointers and counts the referenced Python objects. On text-heavy frames the shallow figure is routinely a quarter of the truth, so capacity planning built on it is planning for a different program."
      },
      {
        stem: "Converting a column of one million distinct order IDs to `category` does what to memory?",
        options: [
          "Halves it",
          "Increases it — the categories array holds every string and you add a code per row on top",
          "Leaves it unchanged",
          "Reduces it by 90%"
        ],
        answer: 1,
        why: "Categorical compresses by storing each distinct value once, so it saves nothing when every value is distinct and costs an extra 4 bytes per row for the code. Measure `memory_usage(deep=True)` before and after rather than converting on principle."
      },
      {
        stem: "`pd.Series([1, 2, None])` has what dtype, and why does it matter?",
        options: [
          "int64, with None treated as 0",
          "float64 — and float64 represents integers exactly only up to 2⁵³, so large IDs lose precision",
          "object",
          "Int64"
        ],
        answer: 1,
        why: "NumPy integers cannot hold a missing value, so pandas widens to float. Snowflake and Twitter-style IDs exceed 2⁵³, and `9007199254740993` silently becomes `...992`. `dtype=\"Int64\"` — capital I — keeps them exact."
      },
      {
        stem: "A `groupby` on two categorical columns returns 10,000 rows from a 50-row frame. What happened?",
        options: [
          "The join duplicated rows",
          "`observed=False` produces a row for every category combination, including ones that never occurred",
          "The categories were unordered",
          "An index was not reset"
        ],
        answer: 1,
        why: "With 100 categories in each column that is a 100×100 cartesian product. `observed=True` restricts the result to combinations actually present — this is the most common cause of a groupby that unexpectedly explodes on categorical keys."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "A DataFrame is using far more memory than expected. How would you investigate?",
        strong: "Start with `memory_usage(deep=True)` per column — the default understates object columns badly, since it counts only the 8-byte pointer. Usually one or two text columns dominate. Then check cardinality: low-cardinality text becomes `category` for a huge saving, high-cardinality text becomes `string[pyarrow]`, and numeric columns downcast where the round trip is exact.",
        answer: [
          { t: "p", text: "Leading with the measurement rather than with the fix is the right order, and the `deep=True` detail is the specific thing being probed." },
          { t: "p", text: "Adding that you would type at read time rather than convert afterwards shows you know peak memory is the number that matters." }
        ]
      },
      {
        level: "advanced",
        q: "When does converting to `category` make things worse?",
        strong: "When cardinality is high relative to row count. It stores every distinct value once plus a code per row, so on a unique identifier column you keep all the strings and add 4 bytes per row on top. It also falls back to object when concatenating frames whose category sets differ, and `observed=False` in groupby produces a cartesian product over categories that never occurred.",
        answer: [
          { t: "p", text: "Naming three distinct failure modes rather than one shows you have used it at scale." },
          { t: "p", text: "The groupby explosion is the one people hit in production and rarely anticipate, so it lands well." }
        ]
      },
      {
        level: "advanced",
        q: "Why do nullable integer dtypes exist?",
        strong: "Because NumPy integers cannot represent missing values, so a single `None` widens the column to `float64`. That is fine for small numbers and wrong for large ones — `float64` is exact only up to 2⁵³, and many database ID sequences exceed it. `Int64` carries a separate mask, so the values stay integers and missingness is explicit as `pd.NA`.",
        answer: [
          { t: "p", text: "The 2⁵³ precision limit turns this from a tidiness preference into a correctness argument, which is what makes the answer memorable." },
          { t: "p", text: "Mentioning that `pd.NA` propagates through comparisons — and that a mask containing it raises on indexing — shows you have actually used the dtype rather than read about it." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 7.7 — Mixed and Messy Variables
   ========================================================================= */
EC.receiveLesson({
  id: "7.7",

  lede: "**A column that holds \"A21\", \"3 bed flat\", \"£1,250/month\" and \"n/a\" is not one variable. It is two or three variables and a missing-value convention, typed into one field because the form had one box.** Every one of those tokens carries information that a model can use — once it is pulled apart into the numeric part, the categorical part and the flag for which rows had which. Left as a string, the column is either dropped or treated as a thousand-value category, and both lose the signal.",

  objectives: [
    "Recognise a mixed column and enumerate the sub-variables it contains",
    "Extract numeric and categorical parts with regex, and handle the rows that match no pattern",
    "Parse units, currencies and ranges into a single consistent numeric scale",
    "Turn the pattern each row matched into a feature in its own right",
    "Build the extraction as a transformer that reports its coverage and is safe to run unattended"
  ],

  prerequisites: ["4.5", "7.1"],

  blocks: [

    { t: "h2", n: "01", text: "One field, several variables", id: "mixed" },

    { t: "p", text: "A mixed variable is a column whose values follow more than one format — **letters and digits in one token, a number with a unit, a range, a category with an amount, or free text that sometimes contains a structured value**. The tell is that `to_numeric` fails on most rows and `nunique` is close to the row count." },

    { t: "dl", items: [
      ["Mixed variable", "A single column whose values combine two or more kinds of information — `\"A21\"` is a letter-code and a number; `\"3 bed flat\"` is a count and a category."],
      ["Sub-variable", "One of the pieces a mixed column decomposes into: the numeric part, the categorical part, the unit, the pattern the row matched."],
      ["Pattern indicator", "A categorical feature recording *which format* the row was in. Rows written as `\"n/a\"` versus `\"0\"` versus blank often differ in outcome, and the format is the only evidence."],
      ["Unit normalisation", "Converting values with mixed units — `\"1.2 GB\"`, `\"800 MB\"` — to one base unit before comparing or modelling."],
      ["Parse coverage", "The fraction of rows the extraction handled. A parser that silently sends unmatched rows to NaN has a coverage number, and it belongs in the report."],
      ["Capture group", "A parenthesised part of a regex. `.str.extract` returns one column per group; named groups `(?P<n>...)` name the columns."]
    ]},

    { t: "viz",
      title: "Decomposing a property-listing column",
      caption: "Every value in the raw column is a string, and most are unique. After extraction there are four typed features — a count, a category, a currency amount, a period — plus a fifth recording which pattern each row followed. The rows that matched nothing are a finding, not a failure.",
      svg: `<svg viewBox="0 0 880 320" role="img" aria-label="A raw mixed column of property listing strings on the left, arrows to four extracted typed columns and a pattern indicator on the right, with unmatched rows flagged">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">raw: "description"</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="30" y="56" class="s-sub" style="fill:var(--ink-2)">"3 bed flat, £1,250/month"</text>
    <text x="30" y="80" class="s-sub" style="fill:var(--ink-2)">"2-bed house £1500 pcm"</text>
    <text x="30" y="104" class="s-sub" style="fill:var(--ink-2)">"Studio, 950 pm"</text>
    <text x="30" y="128" class="s-sub" style="fill:var(--ink-2)">"4 bed detached, POA"</text>
    <text x="30" y="152" class="s-sub" style="fill:var(--ink-2)">"n/a"</text>
    <text x="30" y="176" class="s-sub" style="fill:var(--ink-2)">"1 bed, £4,000 per year"</text>
  </g>
  <text x="30" y="210" class="s-sub" style="fill:var(--ink-3)">nunique ≈ nrows; to_numeric fails on all</text>

  <line x1="290" y1="115" x2="360" y2="115" style="stroke:var(--ink-3);stroke-width:1.5" marker-end="url(#mx-a)"/>
  <text x="296" y="106" class="s-sub" style="fill:var(--ink-3)">extract</text>

  <g style="font-family:var(--mono,monospace)">
    <text x="380" y="30" class="s-sub" style="fill:var(--ink-3)">beds  type      amount  period  pattern</text>
    <text x="380" y="56" class="s-sub" style="fill:var(--good)">3     flat      1250    month   full</text>
    <text x="380" y="80" class="s-sub" style="fill:var(--good)">2     house     1500    month   full</text>
    <text x="380" y="104" class="s-sub" style="fill:var(--good)">0     studio     950    month   studio</text>
    <text x="380" y="128" class="s-sub" style="fill:var(--warn)">4     detached   NaN    NaN     poa</text>
    <text x="380" y="152" class="s-sub" style="fill:var(--crit)">NaN   NaN        NaN    NaN     unmatched</text>
    <text x="380" y="176" class="s-sub" style="fill:var(--good)">1     NaN        4000    year    full</text>
  </g>
  <text x="380" y="210" class="s-sub" style="fill:var(--ink-3)">amount normalised to £/month next: 4000/12 = 333</text>
  <text x="380" y="230" class="s-sub" style="fill:var(--ink-3)">"POA" is a pattern, and a strong feature: price on application</text>
  <text x="380" y="250" class="s-sub" style="fill:var(--ink-3)">"unmatched" is reported, not silently NaN</text>

  <line x1="30" y1="272" x2="850" y2="272" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="298" class="s-sub" style="fill:var(--ink-3)">Five typed features from one string column. The "pattern" column is often the most predictive of them: how a listing was written says something about who wrote it.</text>

  <defs><marker id="mx-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/></marker></defs>
</svg>`
    },

    { t: "code", lang: "python", title: "recognising a mixed column and taking it apart", code: `
import pandas as pd
import numpy as np
import re

cabin = pd.Series(["A21", "B45", "C123", "A2", "n/a", "", "D7 D9", "E101", None, "F"])

# THE TELLS:
pd.to_numeric(cabin, errors="coerce").notna().mean()      # 0.0 -- nothing parses
cabin.nunique() / cabin.notna().sum()                      # ~0.9 -- almost all unique
cabin.str.len().describe()                                 # short, varied
#
# A high-cardinality string column that is not free text is almost
# always a mixed variable. Treating it as a category gives one level
# per row; dropping it loses the deck letter, which is the signal.

# DECOMPOSE WITH NAMED GROUPS:
parts = cabin.str.extract(r"^(?P<deck>[A-Z])(?P<number>\\d+)?$")
parts
#   deck number
# 0    A     21
# 1    B     45
# 2    C    123
# 3    A      2
# 4  NaN    NaN      <- "n/a": no match
# 5  NaN    NaN      <- "": no match
# 6  NaN    NaN      <- "D7 D9": two cabins; the pattern wants one
# 7    E    101
# 8  NaN    NaN      <- None
# 9    F    NaN      <- deck with no number: the ? made number optional
#
# EVERY EXTRACTED COLUMN IS A STRING. Cast the numeric part:
parts["number"] = pd.to_numeric(parts["number"])

# THE PATTERN INDICATOR: which format was each row?
def pattern_of(s):
    if pd.isna(s) or s.strip() == "":
        return "blank"
    if s.strip().lower() in {"n/a", "na", "none", "unknown", "-"}:
        return "explicit_na"
    if re.fullmatch(r"[A-Z]\\d+", s):
        return "deck_number"
    if re.fullmatch(r"[A-Z]", s):
        return "deck_only"
    if re.fullmatch(r"[A-Z]\\d+( [A-Z]\\d+)+", s):
        return "multi_cabin"
    return "other"

cabin.map(pattern_of).value_counts()
# deck_number    5
# blank          1
# explicit_na    1
# multi_cabin    1
# deck_only      1
# (None counts as blank)
#
# THIS COLUMN IS A FEATURE. On the dataset this is drawn from,
# passengers with a recorded cabin survived at twice the rate of
# those with a blank -- not because of the deck, but because having
# a cabin recorded means a first-class ticket. "blank" vs "recorded"
# is the strongest signal in the column, and a parser that only
# extracts deck and number throws it away.

# MULTI-VALUE ROWS -- decide, do not drop:
multi = cabin.str.extractall(r"(?P<deck>[A-Z])(?P<number>\\d+)")
multi
#         deck number
#   match
# 0 0        A     21
# ...
# 6 0        D      7      <- row 6, first cabin
#   1        D      9      <- row 6, second cabin
#
# extractall gives every match. Then a decision: first cabin? count
# of cabins? all decks joined? Here: take the first, and record the
# count as a feature.
first = multi.groupby(level=0).first()
n_cabins = multi.groupby(level=0).size().rename("n_cabins")

# ASSEMBLE:
out = pd.DataFrame({
    "deck": first["deck"].reindex(cabin.index),
    "cabin_no": pd.to_numeric(first["number"].reindex(cabin.index)),
    "n_cabins": n_cabins.reindex(cabin.index).fillna(0).astype(int),
    "cabin_pattern": cabin.map(pattern_of),
})
out
#   deck  cabin_no  n_cabins cabin_pattern
# 0    A      21.0         1   deck_number
# 4  NaN       NaN         0   explicit_na
# 6    D       7.0         2   multi_cabin
# 9    F       NaN         1     deck_only
#
# Four typed features. deck is a category (7.1); cabin_no is numeric
# (and on a ship, even/odd is port/starboard -- a further feature if
# the domain says so); n_cabins is a count; cabin_pattern encodes the
# recording convention, which is the strongest of the four.
`,
      hl: [9, 24, 40, 62],
      caption: "**\"blank\" against \"recorded\" is the strongest signal in the column** — a recorded cabin means a first-class ticket. A parser that only extracts deck and number throws the pattern away."
    },

    { t: "callout", kind: "insight", title: "The format is a feature", body: [
      { t: "p", text: "Rows written as `\"n/a\"`, rows left blank, rows with a value and rows with two values did not arrive that way by accident. **Each format is the trace of a different process** — a different form, a different operator, a different source system — and processes correlate with outcomes." },
      { t: "p", text: "Record the pattern each row matched as a categorical feature *before* extracting anything from it. It costs one column, and it is frequently the most predictive column the extraction produces." }
    ]},

    { t: "h2", n: "02", text: "Units, currencies and ranges", id: "units" },

    { t: "p", text: "**A number with a unit is two variables — the magnitude and the scale — and they must be recombined onto one base unit before the column is numeric.** `\"1.2 GB\"` and `\"800 MB\"` are not comparable as extracted; they are once both are bytes. The same applies to currencies, time periods and ranges." },

    { t: "code", lang: "python", title: "normalising to a base unit, and what to do with a range", code: `
sizes = pd.Series(["1.2 GB", "800MB", "3,400 KB", "2 gb", "0.5TB", "unknown", "1.5 G", ""])

# THE PATTERN: a number, optional space, a unit token.
m = sizes.str.strip().str.extract(
    r"^(?P<value>[\\d,]+(?:\\.\\d+)?)\\s*(?P<unit>[A-Za-z]+)?$")
m["value"] = pd.to_numeric(m["value"].str.replace(",", ""), errors="coerce")
m["unit"] = m["unit"].str.upper().str.strip()

# THE UNIT TABLE -- a lookup, with the aliases the data actually uses:
TO_BYTES = {"B": 1, "KB": 1e3, "K": 1e3, "MB": 1e6, "M": 1e6,
            "GB": 1e9, "G": 1e9, "TB": 1e12, "T": 1e12}
m["multiplier"] = m["unit"].map(TO_BYTES)
m["bytes"] = m["value"] * m["multiplier"]
m
#     value unit  multiplier         bytes
# 0     1.2   GB       1e+09   1.200000e+09
# 1   800.0   MB       1e+06   8.000000e+08
# 2  3400.0   KB       1e+03   3.400000e+06
# 3     2.0   GB       1e+09   2.000000e+09     <- "gb" upper-cased
# 4     0.5   TB       1e+12   5.000000e+11
# 5     NaN  NaN         NaN            NaN     <- "unknown"
# 6     1.5    G       1e+09   1.500000e+09     <- alias
# 7     NaN  NaN         NaN            NaN     <- blank
#
# UNRECOGNISED UNIT -> multiplier NaN -> bytes NaN. Report them:
unknown_units = m.loc[m["unit"].notna() & m["multiplier"].isna(), "unit"].unique()
#
# A unit you did not anticipate ("GiB", "Gbit") is a finding. The
# alternative -- a default multiplier of 1 -- silently makes 1.2 GiB
# into 1.2 bytes, which is a number and is wrong.

# A NUMBER WITH NO UNIT: a decision. Here, unit NaN with value
# present. Is it bytes? The most common unit? Say which:
m.loc[m["value"].notna() & m["unit"].isna(), "unit"]           # none here
# Log it. Do not guess silently.

# CURRENCY -- the same shape, with a rate table that has a DATE:
prices = pd.Series(["£1,250", "$1,600", "1.100 €", "EUR 950", "1200"])
p = prices.str.extract(r"^(?P<cur1>[£$€]|[A-Z]{3})?\\s*(?P<val>[\\d.,]+)\\s*(?P<cur2>[£$€]|[A-Z]{3})?$")
p["currency"] = p["cur1"].fillna(p["cur2"]).map({"£": "GBP", "$": "USD", "€": "EUR"}).fillna(p["cur1"].fillna(p["cur2"]))
#
# "1.100 €" IS EUROPEAN FORMAT: 1100, not 1.1. The decimal-vs-
# thousands ambiguity (see 5.1) has to be resolved by currency or by
# convention:
def parse_amount(s, european=False):
    s = s.replace(" ", "")
    if european:
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", "")
    return float(s)
p["amount"] = [parse_amount(v, european=(c == "EUR")) for v, c in zip(p["val"], p["currency"])]
#
# RATES ARE DATED. Converting to GBP needs the rate on the row's
# date, not today's. A rate table keyed by (currency, month) and an
# as-of join (2.2) -- not a constant.

# PERIODS -- "per month", "pcm", "pa", "/wk" -> one base period:
PER_MONTH = {"month": 1, "pcm": 1, "pm": 1, "mo": 1,
             "year": 1 / 12, "pa": 1 / 12, "annum": 1 / 12,
             "week": 52 / 12, "wk": 52 / 12, "pw": 52 / 12}
rent = pd.Series(["£1,250/month", "1500 pcm", "£4,000 per year", "300 pw", "POA"])
r = rent.str.extract(r"(?P<val>[\\d,]+)\\s*(?:/|per\\s+)?(?P<per>month|pcm|pm|year|pa|annum|week|wk|pw)?", flags=re.I)
r["val"] = pd.to_numeric(r["val"].str.replace(",", ""), errors="coerce")
r["per_month"] = r["val"] * r["per"].str.lower().map(PER_MONTH)
r["is_poa"] = rent.str.upper().str.contains("POA", na=False).astype(int)
#
# "POA" -- price on application -- is a category, not a missing
# price, and on a listings dataset it predicts the price band
# better than most numeric features. Flag it.

# RANGES -- "3-5 years", "£20k-£30k": TWO numbers, and a decision.
exp_ = pd.Series(["3-5 years", "10+ years", "1 year", "less than 1", "5"])
rg = exp_.str.extract(r"(?P<lo>\\d+)\\s*(?:-|to)\\s*(?P<hi>\\d+)|(?P<open>\\d+)\\+|(?P<single>\\d+)")
rg = rg.apply(pd.to_numeric)
rg["low"] = rg["lo"].fillna(rg["open"]).fillna(rg["single"])
rg["high"] = rg["hi"].fillna(rg["single"])                  # open-ended: high stays NaN
rg["mid"] = rg[["low", "high"]].mean(axis=1)
rg["is_range"] = rg["lo"].notna().astype(int)
rg["is_open"] = rg["open"].notna().astype(int)
#
# Keep low, high AND mid: a model may want the floor ("at least 10")
# more than the midpoint. And "less than 1" matched nothing -- it is
# the row the report should show.
`,
      hl: [12, 22, 40, 68],
      caption: "**A default multiplier of 1 silently makes 1.2 GiB into 1.2 bytes.** An unrecognised unit is a finding to report, not a case to default — the number it produces is a number, and it is wrong."
    },

    { t: "h2", n: "03", text: "Free text with structure inside", id: "freetext" },

    { t: "code", lang: "python", title: "pulling structured fields out of a notes column", code: `
notes = pd.Series([
    "Customer called re invoice INV-20261 overdue 14 days, promised payment Fri",
    "Refund issued £45.00 - damaged on arrival",
    "no answer x3",
    "Upgraded to Pro plan (was Basic). Ref: T-8812",
    "",
    "INV-20388 disputed, escalated to L2",
])

# A NOTES COLUMN IS NOT ONE FEATURE. It is several structured fields
# that happen to be embedded in prose, plus the prose. Pull out what
# has a pattern; leave the rest for 7.10.
feat = pd.DataFrame(index=notes.index)
feat["invoice_ref"] = notes.str.extract(r"\\b(INV-\\d+)\\b")[0]
feat["ticket_ref"]  = notes.str.extract(r"\\b(T-\\d+)\\b")[0]
feat["amount_gbp"]  = pd.to_numeric(notes.str.extract(r"£\\s?([\\d,]+(?:\\.\\d{2})?)")[0].str.replace(",", ""))
feat["days_overdue"] = pd.to_numeric(notes.str.extract(r"overdue\\s+(\\d+)\\s+days?")[0])
feat["attempts"]    = pd.to_numeric(notes.str.extract(r"\\bx(\\d+)\\b")[0])
feat["mentions_refund"]  = notes.str.contains(r"\\brefund", case=False, na=False).astype(int)
feat["mentions_dispute"] = notes.str.contains(r"\\bdisput", case=False, na=False).astype(int)
feat["mentions_escalat"] = notes.str.contains(r"\\bescalat", case=False, na=False).astype(int)
feat["has_invoice"] = feat["invoice_ref"].notna().astype(int)
feat["is_empty"]    = (notes.str.strip() == "").astype(int)
feat["n_words"]     = notes.str.split().str.len().fillna(0).astype(int)
feat
#   invoice_ref ticket_ref  amount_gbp  days_overdue  attempts  mentions_refund ...
# 0   INV-20261        NaN         NaN          14.0       NaN                0
# 1         NaN        NaN        45.0           NaN       NaN                1
# 2         NaN        NaN         NaN           NaN       3.0                0
# 3         NaN     T-8812         NaN           NaN       NaN                0
# 4         NaN        NaN         NaN           NaN       NaN                0
# 5   INV-20388        NaN         NaN           NaN       NaN                0
#
# Eleven features from one column, and the invoice_ref is now a JOIN
# KEY to the invoices table -- which is where the real features live.

# KEYWORD FLAGS vs BAG OF WORDS: a handful of domain-chosen keywords
# ("refund", "dispute", "escalate") are more interpretable and less
# prone to overfitting than a full vocabulary. For a few hundred
# rows they are the right tool; for a hundred thousand, TF-IDF
# (7.10) will find the words you did not think of.

# THE PARSE REPORT -- every extraction is a pattern, and every
# pattern has a hit rate:
coverage = {c: round(feat[c].notna().mean(), 3) for c in ["invoice_ref", "ticket_ref", "amount_gbp", "days_overdue", "attempts"]}
coverage
# {'invoice_ref': 0.33, 'ticket_ref': 0.17, 'amount_gbp': 0.17, ...}
#
# Low coverage is expected for optional fields. A coverage that
# DROPS between runs -- invoice_ref from 33% to 5% -- means the
# format changed upstream ("INV-" became "INV/"), and every
# downstream join is now empty. The parse report is what catches it.

# WHAT NOT TO EXTRACT: things the regex would get wrong more often
# than right. Names, addresses, dates in prose ("promised payment
# Fri") -- a date parser on that produces a wrong date with high
# confidence. Leave them for a real NER model or a person.
`,
      hl: [10, 30, 36, 47],
      caption: "**The invoice reference is now a join key to the invoices table** — which is where the real features live. A notes column is several structured fields embedded in prose, plus the prose."
    },

    { t: "table",
      head: ["Shape", "Example", "Extract", "Also keep"],
      rows: [
        ["Letter-code + number", "`\"A21\"`, `\"SKU-4821-XL\"`", "The code (category), the number (numeric)", "Pattern matched; count if multi-valued"],
        ["Count + category", "`\"3 bed flat\"`", "The count (numeric), the type (category)", "`studio` → 0 beds, as a rule"],
        ["Number + unit", "`\"1.2 GB\"`, `\"800 MB\"`", "Value × multiplier → base unit", "The unit itself; unrecognised units as a finding"],
        ["Currency + amount", "`\"£1,250\"`, `\"1.100 €\"`", "Amount in a base currency via a **dated** rate", "Currency; locale for decimal convention"],
        ["Amount + period", "`\"£4,000 per year\"`", "Amount per base period", "`POA` / `TBC` as a category"],
        ["Range", "`\"3-5 years\"`, `\"10+\"`", "Low, high, midpoint", "`is_range`, `is_open_ended`"],
        ["Sentinel in a numeric column", "`\"n/a\"`, `\"-\"`, `\"unknown\"`", "NaN", "**Which sentinel** — they differ"],
        ["Prose with embedded fields", "Notes, comments", "Refs (join keys), amounts, counts, keyword flags", "Length; emptiness; the rest for 7.10"]
      ],
      caption: "**Every row of this table has an \"also keep\".** The pattern, the unit, the sentinel, the range-ness — the format is a variable, and it is often the most predictive one."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A property-listing parser that reports what it could not parse",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "A listings feed has a single `description` column holding bedrooms, property type, price, price period and sometimes nothing useful. Build the transformer that turns it into typed features: bedrooms (with studio as 0), type, monthly price in one currency, a POA flag, the pattern each row matched, and a coverage report. It must be fit-free (no leakage possible), must never guess a unit, and must be tested on every format in the sample plus a format it has never seen." },
        { t: "code", lang: "python", numbered: false, title: "the sample", code: `
"3 bed flat, £1,250/month"
"2-bed house £1500 pcm"
"Studio, 950 pm"
"4 bed detached, POA"
"n/a"
"1 bed, £4,000 per year"
"Three bedroom semi, £1.2k pcm"
"2 bed maisonette £350 pw"
"Room in shared house, £600pcm bills inc"
""`}
      ],
      requirements: [
        "Bedrooms as an integer, studio → 0, spelled-out numbers handled, missing → NaN.",
        "Property type as a category from a controlled list, else `other`.",
        "Monthly price: weekly × 52/12, yearly / 12, `£1.2k` → 1200; POA → NaN with a flag.",
        "A `pattern` column naming the format matched, including `unmatched` and `blank`.",
        "A coverage report per extracted field, and a list of unmatched examples.",
        "Tests for every sample row and for an unseen format (`\"5 bed, €2.000/mo\"`)."
      ],
      hint: "Split the problem: bedrooms, type, and price are three independent extractions. The pattern column is derived from which of the three succeeded.",
      solution: {
        lang: "python",
        title: "listing_parser.py",
        code: `import pandas as pd
import numpy as np
import re


WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6}
TYPES = ["flat", "apartment", "house", "detached", "semi", "terrace", "terraced",
         "maisonette", "bungalow", "studio", "room"]
TYPE_CANON = {"apartment": "flat", "terraced": "terrace", "semi": "semi"}
PER_MONTH = {"month": 1.0, "pcm": 1.0, "pm": 1.0, "mo": 1.0, "monthly": 1.0,
             "year": 1 / 12, "pa": 1 / 12, "annum": 1 / 12, "yearly": 1 / 12,
             "week": 52 / 12, "wk": 52 / 12, "pw": 52 / 12, "weekly": 52 / 12}
SENTINELS = {"n/a", "na", "none", "-", "unknown", "tbc"}


# =========================================================================
# THREE INDEPENDENT EXTRACTIONS
# =========================================================================

def _beds(s):
    """Integer bedrooms. Studio -> 0. Spelled numbers handled."""
    if re.search(r"\\bstudio\\b", s, re.I):
        return 0
    m = re.search(r"\\b(\\d+|one|two|three|four|five|six)[\\s-]*(?:bed|bedroom)", s, re.I)
    if not m:
        return np.nan
    tok = m.group(1).lower()
    return int(WORDS.get(tok, tok)) if tok.isdigit() or tok in WORDS else np.nan


def _type(s):
    for t in TYPES:
        if re.search(rf"\\b{t}\\b", s, re.I):
            return TYPE_CANON.get(t, t)
    return "other"


def _price(s):
    """(monthly_gbp, is_poa, unit_seen). NEVER guesses an unrecognised
    period or currency: returns NaN and names what it saw."""
    if re.search(r"\\bPOA\\b", s, re.I):
        return np.nan, 1, "poa"
    m = re.search(
        r"(?P<cur>[£$€])?\\s*(?P<val>\\d[\\d,]*(?:\\.\\d+)?)\\s*(?P<k>k)?\\s*"
        r"(?:/|per\\s+)?\\s*(?P<per>month|pcm|pm|mo|monthly|year|pa|annum|yearly|week|wk|pw|weekly)?\\b",
        s, re.I)
    if not m:
        return np.nan, 0, "none"
    cur = m.group("cur") or "£"
    if cur != "£":
        return np.nan, 0, f"currency:{cur}"                 # do not guess a rate
    val = float(m.group("val").replace(",", ""))
    if m.group("k"):
        val *= 1000
    per = (m.group("per") or "").lower()
    if not per:
        return np.nan, 0, "period:missing"                  # do not guess pcm
    mult = PER_MONTH.get(per)
    if mult is None:
        return np.nan, 0, f"period:{per}"
    return round(val * mult, 2), 0, per


# =========================================================================
# THE TRANSFORMER -- fit-free, so nothing can leak
# =========================================================================

def parse_listings(desc):
    s = desc.astype("string").fillna("").str.strip()
    out = pd.DataFrame(index=desc.index)
    out["beds"] = s.map(_beds).astype("Int64")
    out["type"] = s.map(_type)
    price = s.map(_price)
    out["price_month"] = [p[0] for p in price]
    out["is_poa"] = [p[1] for p in price]
    out["price_unit"] = [p[2] for p in price]

    def pattern(row_s, b, t, pu):
        if row_s == "":
            return "blank"
        if row_s.lower() in SENTINELS:
            return "sentinel"
        has_b = not pd.isna(b); has_t = t != "other"; has_p = pu not in ("none",)
        if has_b and has_t and pu not in ("none", "poa") and not pu.startswith(("currency", "period")):
            return "full"
        if pu == "poa":
            return "poa"
        if pu.startswith("currency") or pu.startswith("period"):
            return "price_unparsed"
        if has_b or has_t:
            return "partial"
        return "unmatched"
    out["pattern"] = [pattern(a, b, t, pu) for a, b, t, pu in
                      zip(s, out["beds"], out["type"], out["price_unit"])]
    return out


def coverage_report(parsed, desc):
    n = len(parsed)
    rep = {
        "rows": n,
        "beds": round(float(parsed["beds"].notna().mean()), 3),
        "type": round(float((parsed["type"] != "other").mean()), 3),
        "price_month": round(float(parsed["price_month"].notna().mean()), 3),
        "patterns": parsed["pattern"].value_counts().to_dict(),
        "unparsed_price_reasons": parsed.loc[parsed["pattern"] == "price_unparsed", "price_unit"]
                                        .value_counts().to_dict(),
        "unmatched_examples": desc[parsed["pattern"].isin(["unmatched", "price_unparsed"])].head(5).tolist(),
    }
    return rep


# =========================================================================
# TESTS
# =========================================================================

SAMPLE = pd.Series([
    "3 bed flat, £1,250/month",
    "2-bed house £1500 pcm",
    "Studio, 950 pm",
    "4 bed detached, POA",
    "n/a",
    "1 bed, £4,000 per year",
    "Three bedroom semi, £1.2k pcm",
    "2 bed maisonette £350 pw",
    "Room in shared house, £600pcm bills inc",
    "",
])


def test_bedrooms():
    p = parse_listings(SAMPLE)
    assert p["beds"].tolist()[:4] == [3, 2, 0, 4]
    assert p.loc[6, "beds"] == 3                        # "Three"
    assert pd.isna(p.loc[4, "beds"]) and pd.isna(p.loc[9, "beds"])


def test_types():
    p = parse_listings(SAMPLE)
    assert p["type"].tolist()[:4] == ["flat", "house", "studio", "detached"]
    assert p.loc[6, "type"] == "semi"
    assert p.loc[7, "type"] == "maisonette"
    assert p.loc[8, "type"] == "room"                   # "room" before "house"
    assert p.loc[4, "type"] == "other"


def test_prices_normalised_to_month():
    p = parse_listings(SAMPLE)
    assert p.loc[0, "price_month"] == 1250.0
    assert p.loc[1, "price_month"] == 1500.0
    assert p.loc[2, "price_month"] == 950.0
    assert abs(p.loc[5, "price_month"] - 4000 / 12) < 0.01
    assert p.loc[6, "price_month"] == 1200.0            # £1.2k
    assert abs(p.loc[7, "price_month"] - 350 * 52 / 12) < 0.01
    assert p.loc[8, "price_month"] == 600.0             # "£600pcm" no space


def test_poa_is_flagged_not_nan_silently():
    p = parse_listings(SAMPLE)
    assert p.loc[3, "is_poa"] == 1 and pd.isna(p.loc[3, "price_month"])
    assert p.loc[3, "pattern"] == "poa"
    assert p["is_poa"].sum() == 1


def test_patterns():
    p = parse_listings(SAMPLE)
    assert p.loc[0, "pattern"] == "full"
    assert p.loc[4, "pattern"] == "sentinel"
    assert p.loc[9, "pattern"] == "blank"


def test_unseen_format_does_not_guess():
    """Euro price with European decimal and an unknown period token."""
    p = parse_listings(pd.Series(["5 bed, €2.000/mo"]))
    assert p.loc[0, "beds"] == 5
    assert pd.isna(p.loc[0, "price_month"])              # currency not converted
    assert p.loc[0, "price_unit"] == "currency:€"
    assert p.loc[0, "pattern"] == "price_unparsed"


def test_missing_period_is_not_assumed_monthly():
    p = parse_listings(pd.Series(["2 bed flat £900"]))
    assert pd.isna(p.loc[0, "price_month"])
    assert p.loc[0, "price_unit"] == "period:missing"


def test_coverage_report_names_the_failures():
    desc = pd.concat([SAMPLE, pd.Series(["5 bed, €2.000/mo"])], ignore_index=True)
    rep = coverage_report(parse_listings(desc), desc)
    assert rep["price_month"] < 1.0
    assert "currency:€" in rep["unparsed_price_reasons"]
    assert any("€" in e for e in rep["unmatched_examples"])


def test_fit_free_and_row_independent():
    """Parsing a row does not depend on the other rows -> no leakage."""
    a = parse_listings(SAMPLE.iloc[[0]]).iloc[0]
    b = parse_listings(SAMPLE).iloc[0]
    assert a["price_month"] == b["price_month"] and a["beds"] == b["beds"]`,
        notes: [
          { t: "p", text: "**Three independent extractions, then a pattern derived from which succeeded.** Bedrooms, type and price are separate regexes with separate failure modes, and `pattern` records the combination — `full`, `partial`, `poa`, `price_unparsed`, `sentinel`, `blank` — which is a feature in its own right." },
          { t: "callout", kind: "trap", title: "\"£900\" with no period is not monthly", body: [
            { t: "p", text: "Assuming `pcm` when the period is missing would be right most of the time and silently wrong by a factor of 4 or 12 the rest. **The parser returns NaN and names the reason — `period:missing` — so the coverage report shows how often it happens** and someone can decide whether the feed's convention justifies a default." },
            { t: "p", text: "The same rule for currency: `€2.000` is not converted, because a rate is dated and a guessed rate is a wrong number that looks like a price." }
          ]},
          { t: "p", text: "**`Studio` maps to zero bedrooms as a rule, and `Three` maps to 3 through a word table.** Both are domain decisions written into the parser; neither is something a regex on digits would find." },
          { t: "p", text: "**Type matching is ordered so `room` beats `house` in `\"Room in shared house\"`.** The controlled list is checked in sequence and the first hit wins, which makes the order a decision — and the test that pins row 8 to `room` is what preserves it." },
          { t: "p", text: "**The parser is fit-free, and the last test proves it**: parsing one row alone gives the same result as parsing it in the batch. No vocabulary, no quantile, no statistic — so there is nothing to leak and nothing to refit." },
          { t: "p", text: "**The coverage report lists unparsed reasons and examples.** A drop in `price_month` coverage from 0.8 to 0.3 between runs, with `currency:€` climbing the reasons list, is the feed changing under you — visible in the report, invisible in a column of NaN." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A size column holds `\"1.2 GB\"`, `\"800 MB\"` and `\"1.5 GiB\"`. Your unit table knows GB and MB. What should happen to the GiB row?",
          options: [
            "Treat it as GB",
            "Multiplier NaN → value NaN, and the unit reported as unrecognised — a default of 1 would make it 1.5 bytes, a number that is silently wrong",
            "Drop the row",
            "Use the median of the column"
          ],
          answer: 1,
          why: "An unrecognised unit is a finding, not a case to default. GiB is 1.074 GB, which someone can add to the table once they know it appears; a guessed multiplier produces a plausible number with no marker that it was guessed."
        }
      ]
    }
  ],

  takeaways: [
    "**A mixed column is several variables typed into one box** — the tell is `to_numeric` failing on most rows and cardinality near the row count.",
    "**Decompose with named capture groups**; every extracted column is a string until cast.",
    "**Record which pattern each row matched before extracting anything.** The format is a feature, and often the strongest one.",
    "**Blank, `\"n/a\"` and `\"-\"` are different sentinels from different processes** — keep which one, not just that one occurred.",
    "**Multi-valued rows are a decision, not a failure**: first value, count, or all — and the count is usually a feature.",
    "**A number with a unit is two variables**; recombine onto one base unit via a lookup table with the aliases the data actually uses.",
    "**An unrecognised unit is NaN plus a report line, never a default multiplier** — the default produces a number that is wrong.",
    "**Currency conversion needs a dated rate**, and `1.100 €` is European notation: decimal convention follows the currency.",
    "**`POA`, `TBC`, `on request` are categories, not missing prices** — flag them.",
    "**A range is low, high and midpoint, plus `is_range` and `is_open`** — a model may want the floor more than the middle.",
    "**A notes column contains join keys**; an invoice reference extracted from prose links to the table where the real features live.",
    "**Do not extract what the regex would get wrong more often than right** — names, addresses, dates in prose belong to NER or a person.",
    "**A parser has a coverage number per field, and a drop between runs means the feed's format changed** — the report is what catches it."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A cabin column holds `\"A21\"`, `\"B45\"`, blanks and `\"n/a\"`. After extracting deck and number, what has been lost?",
        options: [
          "Nothing",
          "The recording convention — blank versus `n/a` versus recorded — which on this data predicts the outcome better than the deck itself",
          "The cabin number's parity",
          "The deck letter's order"
        ],
        answer: 1,
        why: "A recorded cabin means a first-class ticket; a blank means it was not recorded. That distinction is the strongest signal in the column and it lives in the format, not the content. A pattern-matched indicator keeps it; a parser that only extracts fields throws it away."
      },
      {
        stem: "A rent column has `\"£1,250/month\"`, `\"350 pw\"` and `\"£4,000 per year\"`. What is the base representation?",
        options: [
          "Keep the strings as a category",
          "One numeric column on a single period — pounds per month — with weekly × 52/12 and yearly / 12, plus the original period as a feature",
          "Three separate columns by period",
          "The raw number, ignoring the period"
        ],
        answer: 1,
        why: "Values on different periods are not comparable until normalised, and ignoring the period makes a weekly rent look like a monthly one. The period token itself is worth keeping: listings quoted weekly are a different market segment from those quoted yearly."
      },
      {
        stem: "Why should a parser never assume a missing unit is the most common one?",
        options: [
          "It slows parsing",
          "The assumption is right most of the time and silently wrong by a large factor the rest — NaN with a named reason lets the coverage report show how often it happens and someone decide",
          "Regexes cannot express defaults",
          "It always is the most common one"
        ],
        answer: 1,
        why: "A guessed default produces a plausible number with no marker that it was guessed. Returning NaN and `period:missing` costs nothing and makes the frequency visible; if the feed's convention justifies a default, that becomes a documented rule rather than a silent one."
      },
      {
        stem: "Which of these should a regex-based parser NOT try to extract from a free-text notes column?",
        options: [
          "Invoice references like `INV-20261`",
          "Dates written in prose such as 'promised payment Fri' — a date parser produces a wrong date with high confidence",
          "Amounts like `£45.00`",
          "Keyword flags for 'refund' or 'dispute'"
        ],
        answer: 1,
        why: "References, amounts and keywords have patterns a regex can match reliably. Dates in prose, names and addresses do not: the parser will produce a confident, wrong value more often than a missing one. Those belong to a real NER model or a person, and a parser that knows its limits reports coverage honestly."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you handle a column like 'A21', 'B45', 'n/a', blank?",
        strong: "Recognise it as two variables and a recording convention. Extract the letter as a category and the number as numeric, with named capture groups. Then record which pattern each row matched — recorded, blank, explicit n/a, multi-valued — as its own categorical feature, because on most datasets the fact that a value was recorded predicts the outcome better than the value. And handle multi-valued rows deliberately: first value plus a count, rather than a silent NaN.",
        answer: [
          { t: "p", text: "Leading with 'the format is a feature' is what separates this from a regex answer." }
        ]
      },
      {
        level: "advanced",
        q: "A column mixes units and currencies. What is your approach?",
        strong: "Split into magnitude and scale, then recombine onto one base unit through a lookup table containing the aliases the data actually uses — GB and G and gb. An unrecognised unit is NaN and a line in the report, never a default multiplier, because a default gives a plausible number that is wrong. For currency the rate is dated, so it is an as-of join to a rate table, not a constant; and the decimal convention follows the currency, since '1.100 €' is eleven hundred. Then a coverage report per field, so a format change upstream is visible.",
        answer: [
          { t: "p", text: "The dated-rate point and the refusal to default are the two details that show production experience." }
        ]
      },
      {
        level: "advanced",
        q: "What would you extract from a free-text notes column, and what would you leave?",
        strong: "Anything with a reliable pattern: references — which become join keys to the tables where the real features live — amounts, counts, and a handful of domain-chosen keyword flags. Plus length and emptiness. I would leave names, addresses and dates written in prose, because a regex gets those wrong with high confidence, and hand the residual text to TF-IDF or an embedding model if the volume justifies it. And every extraction has a coverage rate that I would track between runs.",
        answer: [
          { t: "p", text: "\"References become join keys\" is the insight that turns a text-cleaning task into a data-modelling one." }
        ]
      }
    ]
  }
});

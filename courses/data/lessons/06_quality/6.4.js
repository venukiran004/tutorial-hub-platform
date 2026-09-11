/* ============================================================================
   LESSON 6.4 — Duplicates: Exact, Fuzzy and Semantic
   ========================================================================= */
EC.receiveLesson({
  id: "6.4",

  lede: "**`drop_duplicates()` finds rows that are byte-for-byte identical. Almost no real duplicate is.** \"J. Smith, 12 High St\" and \"John Smith, 12 High Street\" are the same customer; two orders with the same items thirty seconds apart are probably a double-submit; two records with different IDs and identical everything else are one entity the source system split. Each needs a different detector, and each detector can be wrong in a different direction.",

  objectives: [
    "Distinguish exact, fuzzy and semantic duplicates and pick the detector for each",
    "Compare strings with edit distance and token similarity, and choose a threshold",
    "Scale pairwise comparison with blocking so it does not become O(n²)",
    "Resolve a cluster of duplicates into one survivor without losing information",
    "Measure a deduplication's precision and recall rather than trusting its count"
  ],

  prerequisites: ["3.7", "4.5"],

  blocks: [

    { t: "h2", n: "01", text: "Three kinds of the same thing", id: "kinds" },

    { t: "p", text: "A duplicate is two records that refer to one real-world entity. **The question is how they differ, because that decides how you find them** — and \"not at all\" is the rare case." },

    { t: "dl", items: [
      ["Exact duplicate", "Identical on every column, or on the columns that define identity. Found by `duplicated()`. Usually a retry, a double-load, or a join that multiplied."],
      ["Fuzzy duplicate", "The same entity with surface differences: case, whitespace, abbreviation, a typo, a transposed digit. Found by normalising and then comparing with a similarity measure."],
      ["Semantic duplicate", "The same entity with genuinely different values: a maiden name and a married name, an old address and a new one, two email addresses. Found only with domain rules or a second identifier."],
      ["Edit distance", "The minimum number of single-character edits to turn one string into another. `\"Smith\"` → `\"Smyth\"` is 1. Levenshtein is the standard form."],
      ["Blocking", "Comparing only pairs that share a cheap key — same postcode, same first three letters — so the number of comparisons is far below n²."],
      ["Survivorship", "The rule for which record, or which field from which record, survives when a cluster is merged."]
    ]},

    { t: "viz",
      title: "Same customer, three ways",
      caption: "Exact: found by hashing. Fuzzy: found by normalising then measuring distance. Semantic: not findable from these fields alone — it needs a shared identifier or a rule that knows names change.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="Three pairs of customer records showing exact, fuzzy and semantic duplication with the detector for each">
  <text x="30" y="26" class="s-label" style="fill:var(--good)">exact</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="30" y="52" class="s-sub" style="fill:var(--ink-2)">John Smith | 12 High St | SW1A 1AA</text>
    <text x="30" y="72" class="s-sub" style="fill:var(--ink-2)">John Smith | 12 High St | SW1A 1AA</text>
  </g>
  <text x="30" y="100" class="s-sub" style="fill:var(--good)">duplicated(): hash the row, match the hash</text>
  <text x="30" y="118" class="s-sub" style="fill:var(--ink-3)">cause: retry, double-load, join multiplied</text>

  <text x="320" y="26" class="s-label" style="fill:var(--warn)">fuzzy</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="320" y="52" class="s-sub" style="fill:var(--ink-2)">John Smith  | 12 High St     | SW1A 1AA</text>
    <text x="320" y="72" class="s-sub" style="fill:var(--ink-2)">J. SMITH    | 12 High Street | sw1a1aa</text>
  </g>
  <text x="320" y="100" class="s-sub" style="fill:var(--warn)">normalise, then edit distance / token overlap</text>
  <text x="320" y="118" class="s-sub" style="fill:var(--ink-3)">cause: two forms, two typists, two systems</text>

  <text x="610" y="26" class="s-label" style="fill:var(--crit)">semantic</text>
  <g style="font-family:var(--mono,monospace)">
    <text x="610" y="52" class="s-sub" style="fill:var(--ink-2)">Jane Doe   | 12 High St | SW1A 1AA</text>
    <text x="610" y="72" class="s-sub" style="fill:var(--ink-2)">Jane Smith | 4 Mill Rd  | CB1 2AZ</text>
  </g>
  <text x="610" y="100" class="s-sub" style="fill:var(--crit)">no string measure finds this</text>
  <text x="610" y="118" class="s-sub" style="fill:var(--ink-3)">needs: a shared id, DOB + email, a rule</text>

  <line x1="30" y1="146" x2="850" y2="146" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="172" class="s-sub" style="fill:var(--ink-3)">Each detector errs differently. Exact matching misses almost everything real (low recall).</text>
  <text x="30" y="194" class="s-sub" style="fill:var(--ink-3)">Fuzzy matching with a loose threshold merges different people who share a common name (low precision).</text>
  <text x="30" y="216" class="s-sub" style="fill:var(--ink-3)">Semantic matching on a rule — same DOB and email — is precise and finds only what the rule anticipated.</text>
  <text x="30" y="250" class="s-sub" style="fill:var(--ink-3)">Which error is worse depends on what happens next: merging two real customers is usually worse than leaving one split.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "exact duplicates, done carefully", code: `
import pandas as pd
import numpy as np

customers = pd.DataFrame({
    "id":       [1, 2, 3, 4, 5, 6, 7],
    "name":     ["John Smith", "John Smith", "J. SMITH", "Jane Doe", "jane doe ", "Bob Lee", "Bob Lee"],
    "email":    ["js@x.com", "js@x.com", "JS@X.COM", "jd@x.com", "jd@x.com", "bl@x.com", "bob.lee@x.com"],
    "postcode": ["SW1A 1AA", "SW1A 1AA", "sw1a1aa", "CB1 2AZ", "CB1 2AZ", "M1 1AA", "M1 1AA"],
    "updated":  pd.to_datetime(["2026-01-01", "2026-02-01", "2026-03-01", "2026-01-15",
                                "2026-02-15", "2026-01-20", "2026-03-20"]),
})

# EXACT ON EVERY COLUMN -- almost never fires, because id and updated differ:
customers.duplicated().sum()                          # 0

# EXACT ON THE IDENTITY COLUMNS -- the columns that DEFINE the entity:
identity = ["name", "email", "postcode"]
customers.duplicated(subset=identity, keep=False)     # rows 0 and 1 only
#
# Rows 0 and 1: same name, email, postcode, different id. The source
# system created two accounts. That IS a duplicate, and subset= is
# what finds it. Rows 2, 4 and 6 are the same people again with
# surface differences -- exact matching does not see them.

# NORMALISE BEFORE EXACT MATCHING -- this is where most of the fuzzy
# cases become exact ones:
def norm_key(df):
    return pd.DataFrame({
        "name":     df["name"].str.lower().str.replace(r"[^a-z ]", "", regex=True)
                              .str.replace(r"\\s+", " ", regex=True).str.strip(),
        "email":    df["email"].str.lower().str.strip(),
        "postcode": df["postcode"].str.upper().str.replace(r"\\s", "", regex=True),
    })

keys = norm_key(customers)
keys.duplicated(keep=False)
# rows 0, 1 (john smith / js@x.com / SW1A1AA)
# rows 3, 4 (jane doe / jd@x.com / CB12AZ)
#
# Row 2 ("j smith") and row 6 (different email) are still separate.
# Normalisation closes the case-and-whitespace gap. It does not close
# the abbreviation gap or the two-emails gap. Those need the next
# section.

# GROUPING THE DUPLICATES, not just flagging them:
customers["dup_group"] = keys.apply(tuple, axis=1).pipe(pd.factorize)[0]
customers.groupby("dup_group").filter(lambda g: len(g) > 1)
#
# factorize gives every distinct key an integer, so rows sharing a
# key share a group id. filter keeps groups of size > 1. Now each
# cluster can be inspected as a unit.

# THE THING TO CHECK BEFORE DROPPING ANYTHING:
cluster = customers[customers["dup_group"] == 0]
cluster
#    id        name     email  postcode    updated
# 0   1  John Smith  js@x.com  SW1A 1AA 2026-01-01
# 1   2  John Smith  js@x.com  SW1A 1AA 2026-02-01
#
# Two ids. Which survives? Every ORDER references one of them. Dropping
# id 1 orphans its orders. This is not a drop; it is a MERGE, and the
# orders table needs an id mapping (see section 3).

# HASH-BASED DEDUP AT SCALE -- when the frame is too wide to compare
# column by column:
row_hash = pd.util.hash_pandas_object(keys, index=False)
row_hash.duplicated(keep=False).sum()
#
# hash_pandas_object gives a 64-bit hash per row. Fast, memory-light,
# and the collision probability at millions of rows is negligible.
# Same result as duplicated(subset=); useful when the subset is the
# whole frame and the frame is large.

# THE CLASSIC EXACT-DUP CAUSE, worth ruling out first: a join.
# orders.merge(customers, on="customer_id") with customers containing
# ids 1 AND 2 for the same person does not create duplicate customers;
# it creates duplicate ORDERS. Deduplicate the lookup table before
# joining, not the result after.
`,
      hl: [16, 27, 46, 66],
      caption: "**Two ids for one person is a merge, not a drop.** Every order references one of them, and deleting id 1 orphans its orders — the orders table needs an id mapping before anything is removed."
    },

    { t: "h2", n: "02", text: "Fuzzy matching", id: "fuzzy" },

    { t: "p", text: "**After normalisation, the remaining differences are abbreviations, typos and transpositions.** A similarity measure turns \"how different are these two strings\" into a number, and a threshold turns the number into a decision. The measure and the threshold are both choices, and both can be wrong." },

    { t: "code", lang: "python", title: "similarity measures, thresholds, and what each one gets wrong", code: `
# rapidfuzz is the fast, maintained library. fuzzywuzzy is its
# predecessor; the API is the same.
from rapidfuzz import fuzz, distance, process

a, b = "john smith", "jon smith"

# LEVENSHTEIN DISTANCE: single-character edits.
distance.Levenshtein.distance(a, b)               # 1  (delete "h")
distance.Levenshtein.normalized_similarity(a, b)  # 0.9  (1 - 1/10)
#
# Good for typos and short strings. Bad for reordering: "smith john"
# is 10 edits from "john smith", which is every character.

# TOKEN-BASED: split into words, compare as sets.
fuzz.token_sort_ratio("john smith", "smith john")        # 100 -- order ignored
fuzz.token_set_ratio("john smith", "mr john smith esq")  # 100 -- subset ignored
#
# token_sort: sort the words, then compare. Handles "surname, first".
# token_set: intersection scored separately. Handles extra words --
# titles, middle names, "Ltd". It is also the most permissive, which
# means the most false positives.

# JARO-WINKLER: weights matching prefixes. Built for names.
distance.JaroWinkler.similarity("smith", "smyth")        # 0.89
distance.JaroWinkler.similarity("smith", "htims")        # 0.47 -- same letters,
                                                         # wrong order

# THE STANDARD SET, and what each is for:
#   Levenshtein          typos, short codes, IDs
#   token_sort_ratio     names with parts in different orders
#   token_set_ratio      names with extra or missing parts
#   JaroWinkler          person names; forgiving on the tail
#   partial_ratio        one string is a substring of the other

# THE THRESHOLD IS THE DECISION. No number is right for everything:
pairs = [
    ("john smith", "jon smith"),        # typo: same person
    ("john smith", "john smyth"),       # typo: same person, probably
    ("john smith", "joan smith"),       # DIFFERENT person, one letter
    ("john smith", "john smithson"),    # different person, prefix
    ("acme ltd", "acme limited"),       # same company
    ("acme ltd", "acne ltd"),           # different company, one letter
]
for x, y in pairs:
    print(f"{x:14} {y:16} lev={fuzz.ratio(x, y):3}  "
          f"tsort={fuzz.token_sort_ratio(x, y):3}  "
          f"jw={distance.JaroWinkler.similarity(x, y):.2f}")
# john smith     jon smith        lev= 95  tsort= 95  jw=0.97
# john smith     john smyth       lev= 90  tsort= 90  jw=0.95
# john smith     joan smith       lev= 90  tsort= 90  jw=0.95   <- same score
# john smith     john smithson    lev= 87  tsort= 87  jw=0.96      as a real
# acme ltd       acme limited     lev= 80  tsort= 80  jw=0.92      match
# acme ltd       acne ltd         lev= 88  tsort= 88  jw=0.93
#
# "john smyth" (same person) and "joan smith" (different person) score
# IDENTICALLY. A one-letter change in a first name is a different
# person; in a surname it is a typo. No string measure knows that.
# "acme limited" (same) scores LOWER than "acne ltd" (different).
#
# THE STRING MEASURE IS EVIDENCE, NOT A VERDICT. Combine it with
# other fields, and calibrate the threshold on labelled pairs.

# ABBREVIATION HANDLING -- a lookup, not a distance:
ABBREV = {"ltd": "limited", "st": "street", "rd": "road", "&": "and",
          "co": "company", "inc": "incorporated"}
def expand(s):
    return " ".join(ABBREV.get(w, w) for w in s.lower().split())
fuzz.ratio(expand("acme ltd"), expand("acme limited"))       # 100
#
# Now "acme ltd" matches "acme limited" exactly, and "acne ltd" still
# scores 88. The abbreviation table did what no threshold could.

# MULTI-FIELD SCORING -- the realistic form:
def pair_score(r1, r2):
    """Weighted evidence across fields. Each field votes."""
    name = fuzz.token_sort_ratio(r1["name"], r2["name"]) / 100
    email = 1.0 if r1["email"] == r2["email"] else 0.0
    post = 1.0 if r1["postcode"] == r2["postcode"] else 0.0
    # An exact email match is near-conclusive; a name match alone is
    # weak; postcode narrows. The weights are a judgement, tuned on
    # labelled pairs.
    return 0.35 * name + 0.45 * email + 0.20 * post

# process.extract FOR "find the best matches for this string in a list":
choices = ["john smith", "jon smith", "joan smith", "jane doe"]
process.extract("john smyth", choices, scorer=fuzz.token_sort_ratio, limit=3)
# [('john smith', 90, 0), ('jon smith', 84, 1), ('joan smith', 80, 2)]
#
# Returns (match, score, index). The right tool for matching a new
# record against a known list. NOT the right tool for deduplicating
# the list against itself at scale -- that is the next section.
`,
      hl: [40, 50, 62, 74],
      caption: "**\"john smyth\" (same person, typo) and \"joan smith\" (different person) score identically.** No string measure knows that a one-letter change in a first name is a different person and in a surname is a typo — the measure is evidence, not a verdict."
    },

    { t: "callout", kind: "trap", title: "A threshold that merges two real people", body: [
      { t: "p", text: "At `ratio >= 90`, \"joan smith\" merges into \"john smith\". Their orders combine, their addresses conflict, and one of them starts receiving the other's invoices. **A false merge is a data corruption that propagates**; a missed duplicate is an inefficiency that sits still." },
      { t: "p", text: "**Bias the threshold toward precision.** Require agreement on more than one field — a name similarity *and* a matching postcode or email — before treating two records as one. And measure precision on a labelled sample before running at scale." },
      { t: "p", text: "The asymmetry is the design principle: merging is hard to undo, leaving split is not." }
    ]},

    { t: "h2", n: "03", text: "Scaling and resolving", id: "scale" },

    { t: "p", text: "**Comparing every record to every other is n² — a million customers is 500 billion pairs.** Blocking restricts comparison to pairs that share a cheap key, and turns the problem into many small ones. Then a cluster of matches has to become one record, and the rule for how is the part that decides what survives." },

    { t: "code", lang: "python", title: "blocking, clustering and survivorship", code: `
import itertools

rng = np.random.default_rng(0)

# BLOCKING: only compare within a block. The block key must be cheap,
# and must be SHARED by true duplicates -- a typo in the block key
# separates a pair forever.
def block_key(df):
    """Postcode district + first letter of surname. Cheap, and most
    typos are in the parts this ignores."""
    district = df["postcode"].str.upper().str.replace(r"\\s", "", regex=True).str[:3]
    surname_initial = df["name"].str.lower().str.split().str[-1].str[0]
    return district + "|" + surname_initial

def candidate_pairs(df, key_fn, max_block=500):
    """Every within-block pair, as (i, j) index tuples."""
    keys = key_fn(df)
    pairs = []
    for key, idx in df.groupby(keys).groups.items():
        idx = list(idx)
        if len(idx) > max_block:
            # A block this large is a key that is not selective enough
            # -- a common surname in a dense postcode. Log it; do not
            # silently do 125,000 comparisons.
            print(f"block {key!r} has {len(idx)} rows; skipping")
            continue
        pairs.extend(itertools.combinations(idx, 2))
    return pairs

# THE ARITHMETIC: 1M rows, ~50k blocks of ~20 -> 50k x 190 = 9.5M
# comparisons, against 500 billion. That is the whole point.

# MULTIPLE BLOCKING PASSES catch pairs a single key splits:
#   pass 1: postcode district + surname initial
#   pass 2: email domain + first name
#   pass 3: phone number
# A pair need only agree on ONE block key to be compared. The union
# of the passes is the candidate set.

# SCORING THE CANDIDATES:
def score_pairs(df, pairs, threshold=0.8):
    rows = df.to_dict("records")
    out = []
    for i, j in pairs:
        s = pair_score(rows[i], rows[j])          # from section 2
        if s >= threshold:
            out.append((i, j, s))
    return pd.DataFrame(out, columns=["i", "j", "score"])

# CLUSTERING: matches are pairs; a duplicate group is a connected
# component. If A~B and B~C, then A, B, C are one cluster even if A
# and C were never compared (they may be in different blocks).
def clusters(n, matches):
    """Union-find over matched pairs -> cluster id per row."""
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for i, j in zip(matches["i"], matches["j"]):
        parent[find(i)] = find(j)
    roots = [find(i) for i in range(n)]
    return pd.Series(pd.factorize(roots)[0], name="cluster")
#
# TRANSITIVITY IS A RISK: A~B (0.85), B~C (0.85), but A and C are
# clearly different. One weak link chains three people into one. On
# real data this produces a "cluster" of 400 John Smiths. Cap the
# cluster size, and inspect anything above a handful.

# SURVIVORSHIP: one record from a cluster. Three common rules:
def survive(cluster_df):
    """Field-by-field: most recent non-null, with a source priority
    for conflicts. Returns one row."""
    c = cluster_df.sort_values("updated", ascending=False)
    out = {}
    for col in c.columns:
        if col in ("cluster",):
            continue
        # RULE 1: most recently updated non-null value wins.
        vals = c[col].dropna()
        out[col] = vals.iloc[0] if len(vals) else np.nan
    # RULE 2: the surviving id is the OLDEST, so external references
    # (orders, tickets) to the original account keep working.
    out["id"] = int(c["id"].min())
    out["merged_ids"] = sorted(c["id"].tolist())
    out["n_merged"] = len(c)
    return pd.Series(out)
#
# ALTERNATIVES:
#   "golden record"     a source priority per field: CRM wins for
#                       name, billing wins for address
#   "most complete"     the row with the fewest nulls, whole
#   "most recent"       the row with the latest timestamp, whole
#
# Field-by-field is usually best -- it takes the phone from the row
# that has one and the address from the row updated last -- and it is
# the hardest to explain. Whichever rule: WRITE IT DOWN, and keep
# merged_ids so the merge can be traced and reversed.

# THE ID MAPPING every downstream table needs:
def id_map(df, cluster_col="cluster"):
    """old_id -> surviving_id, for every merged row."""
    surv = df.groupby(cluster_col)["id"].min().rename("new_id")
    m = df[["id", cluster_col]].merge(surv, left_on=cluster_col, right_index=True)
    return m[m["id"] != m["new_id"]].set_index("id")["new_id"]
#
# orders["customer_id"] = orders["customer_id"].replace(id_map(customers))
# Without this, merging customers orphans their orders. The mapping
# IS the deliverable; the deduplicated table is a by-product.
`,
      hl: [8, 27, 50, 72],
      caption: "**One weak link chains three people into one cluster.** A~B at 0.85 and B~C at 0.85 make A, B and C one group even when A and C are clearly different — cap the cluster size and inspect anything above a handful."
    },

    { t: "table",
      head: ["Measure", "Sensitive to", "Blind to", "Use for"],
      rows: [
        ["Exact (after normalisation)", "Anything not normalised away", "Every typo and abbreviation", "First pass; retries and double-loads"],
        ["Levenshtein", "Character edits", "Word order; length", "Codes, IDs, short fields, typos"],
        ["token_sort_ratio", "Word content", "Extra or missing words", "Names in varying order"],
        ["token_set_ratio", "Shared words", "Almost everything else — most permissive", "Names with titles, suffixes, extra parts"],
        ["Jaro-Winkler", "Prefix agreement", "Suffix differences", "Person names, short strings"],
        ["Phonetic (Soundex, Metaphone)", "How it sounds", "How it is spelled", "Names heard and typed: \"Smith\"/\"Smyth\"/\"Smythe\""],
        ["Multi-field weighted score", "Agreement across fields", "Fields you did not include", "**The realistic form** — a name alone is never enough"]
      ],
      caption: "**A name alone is never enough.** The multi-field score is the realistic detector; every single-field measure on the list is a component of it, not a substitute."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Deduplicate a customer table, and prove the merge is safe",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "A customer table of 40,000 rows has accumulated duplicates from three sources over five years. Orders reference customer ids. Build the deduplication: normalise, block, score across fields, cluster, choose survivors, and produce the id mapping — then measure precision and recall on a labelled sample and show that no order is orphaned." },
        { t: "p", text: "Generate the data with planted duplicates so the truth is known." }
      ],
      requirements: [
        "Normalisation and at least two blocking passes.",
        "A multi-field score with a stated threshold and a stated reason for it.",
        "Clustering with a size cap and a report of oversized clusters.",
        "Field-level survivorship that keeps the oldest id and records merged ids.",
        "An id mapping applied to orders, with an assertion that no order is orphaned.",
        "Precision and recall against the planted truth; a test that a loose threshold merges different people."
      ],
      hint: "Generate n true customers, then create duplicates by corrupting copies — typos, case, abbreviations, a changed email. Keep the true id on every row so precision and recall are computable.",
      solution: {
        lang: "python",
        title: "dedup_customers.py",
        code: `import pandas as pd
import numpy as np
import itertools
from rapidfuzz import fuzz


# =========================================================================
# GENERATE: true customers, then corrupted copies with known truth
# =========================================================================

FIRST = ["john", "jane", "bob", "alice", "carol", "dave", "eve", "frank",
         "grace", "heidi", "ivan", "judy", "mallory", "oscar", "peggy", "trent"]
LAST = ["smith", "jones", "taylor", "brown", "wilson", "evans", "thomas",
        "roberts", "johnson", "lewis", "walker", "robinson", "wood", "hall"]
STREETS = ["high st", "mill rd", "church ln", "station rd", "park ave"]
DISTRICTS = ["SW1A", "CB1", "M1", "LS2", "EH1", "BS1", "G1", "NE1"]


def generate(n_true=2000, dup_rate=0.25, seed=0):
    rng = np.random.default_rng(seed)
    rows = []
    for t in range(n_true):
        first, last = rng.choice(FIRST), rng.choice(LAST)
        rows.append({
            "true_id": t,
            "name": f"{first} {last}",
            "email": f"{first}.{last}{t}@x.com",
            "street": f"{rng.integers(1, 200)} {rng.choice(STREETS)}",
            "postcode": f"{rng.choice(DISTRICTS)} {rng.integers(1, 9)}AA",
            "updated": pd.Timestamp("2021-01-01") + pd.Timedelta(days=int(rng.integers(0, 1800))),
        })
    base = pd.DataFrame(rows)

    # CORRUPTED COPIES
    dups = []
    for _, r in base.sample(frac=dup_rate, random_state=seed).iterrows():
        d = r.copy()
        kind = rng.choice(["case", "typo", "abbrev", "email", "initial"])
        if kind == "case":
            d["name"] = d["name"].upper(); d["postcode"] = d["postcode"].lower().replace(" ", "")
        elif kind == "typo":
            nm = list(d["name"]); i = rng.integers(0, len(nm))
            nm[i] = rng.choice(list("abcdefghijklmnopqrstuvwxyz")); d["name"] = "".join(nm)
        elif kind == "abbrev":
            d["street"] = d["street"].replace(" st", " street").replace(" rd", " road")
        elif kind == "email":
            d["email"] = d["email"].replace("@x.com", "@y.com")
        elif kind == "initial":
            f, l = d["name"].split(); d["name"] = f"{f[0]}. {l}"
        d["updated"] = d["updated"] + pd.Timedelta(days=int(rng.integers(1, 400)))
        dups.append(d)

    df = pd.concat([base, pd.DataFrame(dups)], ignore_index=True)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    df["id"] = np.arange(1, len(df) + 1)
    return df


# =========================================================================
# NORMALISE
# =========================================================================

ABBREV = {"st": "street", "rd": "road", "ln": "lane", "ave": "avenue"}

def normalise(df):
    out = df.copy()
    out["name_n"] = (out["name"].str.lower().str.replace(r"[^a-z ]", "", regex=True)
                        .str.replace(r"\\s+", " ", regex=True).str.strip())
    out["email_n"] = out["email"].str.lower().str.strip()
    out["post_n"] = out["postcode"].str.upper().str.replace(r"\\s", "", regex=True)
    out["street_n"] = out["street"].str.lower().map(
        lambda s: " ".join(ABBREV.get(w, w) for w in s.split()))
    out["surname"] = out["name_n"].str.split().str[-1]
    return out


# =========================================================================
# BLOCK, SCORE, CLUSTER
# =========================================================================

def candidate_pairs(df, max_block=300):
    keys = [
        df["post_n"].str[:3] + "|" + df["surname"].str[0],      # pass 1
        df["email_n"].str.split("@").str[0].str[:4],             # pass 2
        df["street_n"] + "|" + df["post_n"].str[:2],             # pass 3
    ]
    pairs, oversized = set(), []
    for k in keys:
        for key, idx in df.groupby(k).groups.items():
            idx = list(idx)
            if len(idx) > max_block:
                oversized.append((key, len(idx))); continue
            pairs.update(itertools.combinations(sorted(idx), 2))
    return sorted(pairs), oversized


def pair_score(a, b):
    """Weighted evidence. Email exact is near-decisive; name similarity
    alone is weak; address agreement narrows."""
    name = fuzz.token_sort_ratio(a["name_n"], b["name_n"]) / 100
    # initial form: "j smith" vs "john smith" -> partial credit via
    # surname match plus first-initial match
    if name < 0.8 and a["surname"] == b["surname"]:
        fa, fb = a["name_n"].split()[0], b["name_n"].split()[0]
        if fa[0] == fb[0]:
            name = max(name, 0.75)
    email = 1.0 if a["email_n"] == b["email_n"] else (
        0.6 if a["email_n"].split("@")[0] == b["email_n"].split("@")[0] else 0.0)
    post = 1.0 if a["post_n"] == b["post_n"] else 0.0
    street = fuzz.ratio(a["street_n"], b["street_n"]) / 100
    return 0.30 * name + 0.35 * email + 0.15 * post + 0.20 * street


# THRESHOLD 0.80: chosen so that a name typo with matching email and
# address (~0.95) passes, an initialised name with matching address
# and local-part (~0.85) passes, and two different people who share a
# surname and postcode district but nothing else (~0.55) do not.
# Tuned on the labelled sample below; the number is a claim, and the
# precision/recall figures are its evidence.
THRESHOLD = 0.80


def score_pairs(df, pairs, threshold=THRESHOLD):
    rows = df.to_dict("records")
    out = [(i, j, s) for i, j in pairs if (s := pair_score(rows[i], rows[j])) >= threshold]
    return pd.DataFrame(out, columns=["i", "j", "score"])


def cluster(n, matches, max_size=6):
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for i, j in zip(matches["i"], matches["j"]):
        parent[find(i)] = find(j)
    ids = pd.Series(pd.factorize([find(i) for i in range(n)])[0])
    sizes = ids.value_counts()
    too_big = sizes[sizes > max_size]
    # OVERSIZED CLUSTERS ARE UNMERGED, and reported. A chain of weak
    # links is more likely than six copies of one person.
    ids = ids.where(~ids.isin(too_big.index), other=-1)
    ids[ids == -1] = np.arange(ids.max() + 1, ids.max() + 1 + (ids == -1).sum())
    return ids, too_big


# =========================================================================
# SURVIVE AND MAP
# =========================================================================

def survivors(df, cluster_ids):
    df = df.assign(cluster=cluster_ids.values)
    def one(g):
        g = g.sort_values("updated", ascending=False)
        out = {c: (g[c].dropna().iloc[0] if g[c].notna().any() else np.nan)
               for c in ["name", "email", "street", "postcode", "updated"]}
        out["id"] = int(g["id"].min())                 # oldest id survives
        out["merged_ids"] = sorted(g["id"].tolist())
        out["n_merged"] = len(g)
        return pd.Series(out)
    surv = df.groupby("cluster").apply(one).reset_index(drop=True)
    mapping = (df[["id", "cluster"]]
               .merge(df.groupby("cluster")["id"].min().rename("new_id"),
                      left_on="cluster", right_index=True))
    mapping = mapping[mapping["id"] != mapping["new_id"]].set_index("id")["new_id"]
    return surv, mapping


def dedupe(raw, threshold=THRESHOLD):
    df = normalise(raw)
    pairs, oversized = candidate_pairs(df)
    matches = score_pairs(df, pairs, threshold)
    ids, too_big = cluster(len(df), matches)
    surv, mapping = survivors(df, ids)
    report = {"rows_in": len(raw), "candidate_pairs": len(pairs),
              "matches": len(matches), "rows_out": len(surv),
              "merged": int(mapping.shape[0]),
              "oversized_blocks": oversized, "oversized_clusters": too_big.to_dict()}
    return surv, mapping, ids, report


# =========================================================================
# EVALUATE AGAINST THE PLANTED TRUTH
# =========================================================================

def precision_recall(df, cluster_ids):
    """Pairwise: of pairs we put together, how many are truly the same
    (precision); of truly-same pairs, how many did we put together
    (recall)."""
    t = df["true_id"].values; c = cluster_ids.values
    n = len(df)
    tp = fp = fn = 0
    for i in range(n):
        same_true = (t[i + 1:] == t[i]); same_pred = (c[i + 1:] == c[i])
        tp += int((same_true & same_pred).sum())
        fp += int((~same_true & same_pred).sum())
        fn += int((same_true & ~same_pred).sum())
    p = tp / (tp + fp) if tp + fp else 1.0
    r = tp / (tp + fn) if tp + fn else 1.0
    return {"precision": round(p, 4), "recall": round(r, 4), "tp": tp, "fp": fp, "fn": fn}


# =========================================================================
# TESTS
# =========================================================================

def test_precision_is_high_at_the_chosen_threshold():
    raw = generate()
    _, _, ids, _ = dedupe(raw)
    pr = precision_recall(raw, ids)
    assert pr["precision"] >= 0.98, pr        # false merges are the costly error


def test_recall_is_reasonable():
    raw = generate()
    _, _, ids, _ = dedupe(raw)
    pr = precision_recall(raw, ids)
    assert pr["recall"] >= 0.80, pr           # the email-changed copies are hard


def test_loose_threshold_merges_different_people():
    """Why the threshold is not 0.6."""
    raw = generate()
    _, _, ids, _ = dedupe(raw, threshold=0.55)
    pr = precision_recall(raw, ids)
    assert pr["precision"] < 0.95, pr
    assert pr["fp"] > 0


def test_exact_matching_alone_has_low_recall():
    raw = normalise(generate())
    exact = pd.factorize(raw[["name_n", "email_n", "post_n"]].apply(tuple, axis=1))[0]
    pr = precision_recall(raw, pd.Series(exact))
    assert pr["precision"] == 1.0
    assert pr["recall"] < 0.4                 # most planted dups are not exact


def test_no_order_is_orphaned():
    raw = generate()
    rng = np.random.default_rng(1)
    orders = pd.DataFrame({"order_id": range(5000),
                           "customer_id": rng.choice(raw["id"], 5000)})
    surv, mapping, _, _ = dedupe(raw)
    orders["customer_id"] = orders["customer_id"].replace(mapping)
    assert orders["customer_id"].isin(surv["id"]).all()


def test_oldest_id_survives():
    raw = generate()
    surv, mapping, _, _ = dedupe(raw)
    for new_id, old_ids in zip(surv["id"], surv["merged_ids"]):
        assert new_id == min(old_ids)


def test_merged_ids_are_recorded():
    raw = generate()
    surv, _, _, _ = dedupe(raw)
    assert (surv["n_merged"] == surv["merged_ids"].map(len)).all()
    assert surv["n_merged"].max() >= 2


def test_oversized_clusters_are_not_merged():
    raw = generate()
    # plant a chain: 10 near-identical rows
    chain = pd.DataFrame([{"true_id": 99999, "name": f"chain person{i}",
                           "email": "chain@x.com", "street": "1 high st",
                           "postcode": "SW1A 1AA", "updated": pd.Timestamp("2025-01-01")}
                          for i in range(10)])
    raw2 = pd.concat([raw, chain], ignore_index=True)
    raw2["id"] = np.arange(1, len(raw2) + 1)
    _, _, ids, rep = dedupe(raw2)
    assert rep["oversized_clusters"]          # reported
    chain_ids = ids[raw2["email"] == "chain@x.com"]
    assert chain_ids.nunique() == 10          # left unmerged


def test_blocking_reduces_comparisons_by_orders_of_magnitude():
    raw = normalise(generate())
    pairs, _ = candidate_pairs(raw)
    n = len(raw)
    assert len(pairs) < 0.02 * n * (n - 1) / 2


def test_normalisation_makes_case_variants_exact():
    raw = normalise(pd.DataFrame({
        "name": ["John Smith", "JOHN  SMITH"], "email": ["a@x.com", "A@X.COM"],
        "street": ["1 high st", "1 High Street"], "postcode": ["SW1A 1AA", "sw1a1aa"],
        "updated": pd.to_datetime(["2025-01-01", "2025-01-02"]),
    }))
    assert raw["name_n"].nunique() == 1 and raw["email_n"].nunique() == 1
    assert raw["post_n"].nunique() == 1 and raw["street_n"].nunique() == 1`,
        notes: [
          { t: "p", text: "**Precision is the constraint and recall is the goal.** The threshold is chosen so that false merges are under 2%, because merging two real customers corrupts orders, addresses and invoices in a way that is hard to undo — while a missed duplicate sits still. The loose-threshold test shows what 0.55 costs." },
          { t: "callout", kind: "insight", title: "Exact matching has perfect precision and 40% recall", body: [
            { t: "p", text: "After normalisation, exact matching finds the case and whitespace variants and nothing else — **most planted duplicates are typos, initials, abbreviations and changed emails, none of which exact matching sees.** The test that asserts recall under 0.4 for exact matching is the argument for the rest of the pipeline." },
            { t: "p", text: "Normalisation is not wasted: it is what turns a third of the fuzzy cases into exact ones before any scoring happens." }
          ]},
          { t: "p", text: "**Three blocking passes, because each key splits some true pairs.** A typo in the surname breaks pass 1; a changed email domain does not break pass 2, which keys on the local part; a moved customer breaks pass 3. A pair need only survive one pass to be compared." },
          { t: "p", text: "**The oversized-cluster cap leaves the chain unmerged and reports it.** Ten near-identical rows sharing an email are more likely a test account, a shared mailbox or a chain of weak links than ten copies of one person — and merging them would be the costly error." },
          { t: "p", text: "**The id mapping is the deliverable.** The deduplicated table is a by-product; without the `old_id → new_id` mapping applied to orders, every merge orphans the orders that referenced the losing id. The test asserts no order points at a vanished customer." },
          { t: "p", text: "**The oldest id survives** so that external references — orders, tickets, links in emails — keep resolving. Field-level survivorship takes the most recent non-null value per column, so the merged record has the newest address and the phone number from whichever row had one." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "\"john smyth\" and \"joan smith\" both score 90 against \"john smith\". What does that tell you?",
          options: [
            "Both are duplicates",
            "A string similarity score is evidence, not a verdict — one is a typo in a surname, the other is a different first name, and no measure knows which; other fields must decide",
            "The threshold should be 95",
            "Levenshtein is the wrong measure"
          ],
          answer: 1,
          why: "A one-letter change means different things in different positions, and every string measure is blind to that. A multi-field score — name similarity plus email, postcode or date of birth — is the realistic detector, and the threshold is calibrated on labelled pairs with precision as the constraint."
        }
      ]
    }
  ],

  takeaways: [
    "**A duplicate is two records for one entity; how they differ decides the detector.** Byte-identical is the rare case.",
    "**`duplicated(subset=identity)` finds exact duplicates on the columns that define identity** — and `keep=False` shows every copy.",
    "**Normalise first**: case, whitespace, punctuation and abbreviations turn a third of fuzzy cases into exact ones.",
    "**Two ids for one person is a merge, not a drop** — every order references one of them, and the id mapping is the deliverable.",
    "**Levenshtein for typos, token-sort for reordered names, token-set for extra words, Jaro-Winkler for person names** — each blind to something.",
    "**A string score is evidence, not a verdict.** \"john smyth\" and \"joan smith\" score identically against \"john smith\".",
    "**Abbreviations are a lookup, not a distance** — \"acme ltd\" and \"acme limited\" need a table, not a threshold.",
    "**A multi-field weighted score is the realistic detector**; an exact email match is near-decisive, a name alone never is.",
    "**Bias toward precision.** A false merge propagates; a missed duplicate sits still.",
    "**Blocking turns n² into many small problems**; use several passes because each key splits some true pairs.",
    "**Clusters are connected components, and one weak link chains strangers together** — cap the size and inspect the rest.",
    "**Survivorship is a rule, written down**: oldest id, most recent non-null per field, `merged_ids` kept so it can be reversed.",
    "**Measure precision and recall on labelled pairs** before trusting a deduplication's count."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is comparing every customer to every other infeasible at a million rows?",
        options: [
          "Memory",
          "It is n² — 500 billion pairs — so blocking restricts comparison to pairs sharing a cheap key, cutting it to millions",
          "pandas has no pairwise function",
          "Strings are slow to compare"
        ],
        answer: 1,
        why: "Blocking on postcode district plus surname initial gives ~50,000 blocks of ~20 rows: 9.5 million comparisons instead of 500 billion. Since a typo in the block key separates a true pair forever, several passes on different keys are used and their candidate sets united."
      },
      {
        stem: "After merging duplicate customers, orders start failing to join. What was missed?",
        options: [
          "The orders needed deduplicating too",
          "The id mapping — every order referencing a losing id now points at a customer that no longer exists",
          "The survivor should have been the newest",
          "Blocking was too aggressive"
        ],
        answer: 1,
        why: "Deduplication produces two outputs: the merged table and the `old_id → surviving_id` mapping. The second must be applied to every table that references the key, and keeping the oldest id as survivor minimises how many references change at all."
      },
      {
        stem: "A~B scores 0.85 and B~C scores 0.85, but A and C are clearly different people. What happens under naive clustering?",
        options: [
          "A and C are kept separate",
          "All three become one cluster — connected components are transitive, and one weak link chains them",
          "B is dropped",
          "The scores are averaged"
        ],
        answer: 1,
        why: "Clustering by connected components does not require A and C to have been compared. On real data this produces a cluster of hundreds of John Smiths through a chain of borderline matches. A cluster-size cap, with oversized clusters left unmerged and reported, is the guard."
      },
      {
        stem: "Which error is worse in customer deduplication, and how does it shape the threshold?",
        options: [
          "Missing a duplicate — it wastes storage",
          "A false merge — it combines two real people's orders and addresses and is hard to undo, so the threshold is set for precision and requires agreement on more than one field",
          "They are equally bad",
          "Neither matters at scale"
        ],
        answer: 1,
        why: "A missed duplicate is an inefficiency that sits still; a false merge is a corruption that propagates into every downstream table. That asymmetry is the design principle: calibrate on labelled pairs, constrain precision first, and accept lower recall."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you find duplicate customers in a table?",
        strong: "In stages. Normalise first — case, whitespace, punctuation, abbreviations — and dedupe exactly on the identity columns; that catches retries and double-loads. Then block on a cheap key so comparison is not n², and score candidate pairs across several fields — name similarity plus exact email or postcode — because a name alone never decides. Cluster the matches, cap cluster size, choose survivors by a written rule, and produce the id mapping for every table that references the key.",
        answer: [
          { t: "p", text: "The staged answer, ending with the id mapping, shows you have done this on a table that other tables depend on." }
        ]
      },
      {
        level: "advanced",
        q: "How do you choose a fuzzy-matching threshold?",
        strong: "On labelled pairs, with precision as the constraint. A false merge combines two real customers and is hard to undo; a missed duplicate sits still. So I label a few hundred candidate pairs, sweep the threshold, and pick the highest recall that keeps precision above a target — and I require agreement on more than one field, since a single string score cannot tell a surname typo from a different first name.",
        answer: [
          { t: "p", text: "The asymmetry argument — merge is worse than miss — is the reasoning; the labelled sweep is the method." }
        ]
      },
      {
        level: "advanced",
        q: "What can go wrong when merging a cluster of duplicates?",
        strong: "Three things. Transitivity: A matches B and B matches C, so A, B and C merge even if A and C are different people — a cluster-size cap catches the chains. Survivorship: taking one whole row loses the phone number that only the other row had, so field-by-field with a recency rule is better, and the rule has to be written down. And references: the losing id is in the orders table, and without a mapping those orders are orphaned. Keep `merged_ids` so the merge can be traced and reversed.",
        answer: [
          { t: "p", text: "Naming reversibility — keeping the merged ids — is what distinguishes someone who has had to undo a bad merge." }
        ]
      }
    ]
  }
});

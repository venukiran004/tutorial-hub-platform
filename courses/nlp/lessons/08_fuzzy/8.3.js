/* ============================================================================
   LESSON 8.3 — Jaccard and Cosine Similarity
   Word Jaccard scores the typo pair at exactly 0.0000 where edit distance
   scored 0.8000 — each family fails precisely where the other succeeds
   (§04) (n83.py).
   ========================================================================= */
EC.receiveLesson({
  id: "8.3",

  lede: "**Word-level Jaccard scores \"John Smith\" against \"Jon Smyth\" at exactly 0.0000 — and edit distance scored the same pair at 0.8000.** On the reordered pair, edit distance gave 0.0909 and Jaccard gives 0.3333. The two families fail on precisely disjoint cases, which is the single most useful fact in fuzzy matching: you are not choosing the better metric, you are choosing which failure you will have. This lesson covers set and vector methods and the character n-gram trick that gets most of both.",

  objectives: [
    "Compute Jaccard similarity over token sets",
    "Show that set methods are order-invariant by construction",
    "Demonstrate the complementary failure of the two families",
    "Use character n-grams to handle typos and reordering together",
    "Explain when cosine similarity is preferable to Jaccard"
  ],

  prerequisites: ["8.2", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "Jaccard", id: "jaccard" },

    {"kind": "trace", "title": "A perfect 1.0000 on the reordering and a flat 0.0000 on the typos", "caption": "**Order disappears at the tokenisation step — a set has no order, so the metric cannot be sensitive to it** — which is why `'John Smith'`/`'Smith John'` is **1.0000** and the three-word reorderings are too. Then the exact mirror of 8.1's failure: **`'John Smith'`/`'Jon Smyth'` scores 0.0000, because not one token is shared.** And the comma row shows the brittleness of word tokens: **`'Smith, John'` scores only 0.3333, because `'Smith,'` is a different token from `'Smith'`.**", "left": "pair", "codeW": 210, "vars": ["word Jaccard"], "steps": [{"code": "'John Smith' / 'Smith John'", "state": ["1.0000"], "tone": "good"}, {"code": "'Acme Corp Ltd' / 'Ltd Acme Corp'", "state": ["1.0000"], "tone": "good"}, {"code": "'John Smith' / 'Smith, John'", "state": ["0.3333"], "changed": [0], "tone": "warn", "note": "the comma"}, {"code": "'John Smith' / 'Jon Smyth'", "state": ["0.0000"], "changed": [0], "tone": "crit", "note": "no shared token"}], "t": "diagram", "id": "dg-8_3-01-0"},

    { t: "math", tex: "J(A, B) = \\frac{|A \\cap B|}{|A \\cup B|}" },

    { t: "p", text: "Tokenise both strings into **sets** and divide the intersection by the union. Order disappears at the tokenisation step — a set has no order, so the metric cannot be sensitive to it." },

    { t: "out", text:
"word-level Jaccard\n\n  'John Smith' / 'Smith John'                       1.0000\n  'John Smith' / 'Smith, John'                      0.3333\n  'John Smith' / 'Jon Smyth'                        0.0000\n  'Acme Corp Ltd' / 'Ltd Acme Corp'                 1.0000\n  'red hot chili peppers' / 'chili peppers red hot' 1.0000" },

    { t: "callout", kind: "insight", title: "Reordering is now free — and typos are fatal",
      body: [{ t: "p", text: "Three reordered pairs score a perfect **1.0000**, which is exactly what edit distance could not do. But `\"John Smith\"` against `\"Jon Smyth\"` collapses to **0.0000** — not low, *zero*, because no token is shared. A single character changed inside each word makes the tokens entirely different objects, and a set method has no notion of partial token similarity. Note also `\"Smith, John\"` at only 0.3333: the comma attaches to the token, so `\"smith,\"` and `\"smith\"` are different members. Set methods are exquisitely sensitive to tokenisation, which is why punctuation stripping is not optional." }] },

    { t: "h2", n: "02", text: "The complementary failure", id: "complementary" },

    {"kind": "trace", "title": "The two metrics are each near-zero on exactly the pair the other handles", "caption": "This is the clearest table in the module. **Edit similarity scores the typo pair 0.8000 and the reordered pair 0.0909. Word Jaccard scores the typo pair 0.0000 and the reordered pair 0.3333.** Neither is a weak version of the other — **they fail on disjoint inputs**, which is why §03's character n-grams exist and why 8.5's `token_sort_ratio` exists: **both are attempts to be good at both columns at once.**", "left": "pair", "codeW": 190, "vars": ["edit similarity", "word Jaccard"], "steps": [{"code": "'John Smith' / 'Jon Smyth'", "state": ["0.8000", "0.0000"], "tone": "crit"}, {"code": "'John Smith' / 'Smith, John'", "state": ["0.0909", "0.3333"], "changed": [0, 1], "tone": "crit", "note": "reversed"}], "t": "diagram", "id": "dg-8_3-02-1"},

    { t: "out", text:
"pair                            edit sim    word Jaccard\n'John Smith' / 'Jon Smyth'       0.8000       0.0000\n'John Smith' / 'Smith, John'     0.0909       0.3333" },

    { t: "callout", kind: "crit", title: "Each family's best case is the other's worst",
      body: [{ t: "p", text: "The typo pair: edit distance **0.8000**, Jaccard **0.0000**. The reordered pair: edit distance **0.0909**, Jaccard **0.3333**. There is no threshold on either metric that classifies both correctly, and no amount of tuning changes that, because the failures are structural. This is why production entity resolution computes **several scores per pair** and combines them — either with a weighted rule or with a trained classifier taking all the scores as features. Choosing one metric means choosing which kind of true match you will systematically miss." }] },

    { t: "h2", n: "03", text: "Character n-grams", id: "ngrams" },

    {"kind": "trace", "title": "Every pair gets a non-zero score, and no pair gets a perfect one", "caption": "**A single typo destroys only the few n-grams that span it**, so the typo pair rises from 0.0000 to **0.1538** — and the reorderings fall from 1.0000 to between 0.4167 and 0.7273, because reordering breaks the n-grams at the joins. **That is the trade: n-grams are the only representation here that scores every one of these pairs sensibly, and the price is that nothing scores 1.0.** Choosing `n` is real: **2 is tolerant and collides, 4 or 5 is discriminating and brittle, 3 is the usual default for names.**", "left": "pair", "codeW": 190, "vars": ["word Jaccard", "3-gram Jaccard"], "steps": [{"code": "'John Smith' / 'Smith John'", "state": ["1.0000", "0.4545"], "tone": "warn"}, {"code": "'John Smith' / 'Smith, John'", "state": ["0.3333", "0.4167"], "changed": [0, 1], "tone": "good", "note": "improved"}, {"code": "'John Smith' / 'Jon Smyth'", "state": ["0.0000", "0.1538"], "changed": [0, 1], "tone": "good", "note": "no longer zero"}, {"code": "'red hot chili...' reordered", "state": ["1.0000", "0.7273"], "changed": [0, 1], "tone": "warn"}], "t": "diagram", "id": "dg-8_3-03-2"},

    { t: "p", text: "The problem with word-level sets is that a token is atomic — change one character and it is a different token. Tokenise into overlapping **character n-grams** instead, and a single typo destroys only the few n-grams that span it." },

    { t: "out", text:
"'John Smith' as 3-grams:\n  {'joh', 'ohn', 'hn ', 'n s', ' sm', 'smi', 'mit', 'ith'}\n\nchanging 'John' to 'Jon' breaks only the n-grams containing the missing 'h'" },

    { t: "out", text:
"pair                                              word Jaccard   3-gram Jaccard\n'John Smith' / 'Smith John'                          1.0000          0.4545\n'John Smith' / 'Smith, John'                         0.3333          0.4167\n'John Smith' / 'Jon Smyth'                           0.0000          0.1538\n'Acme Corp Ltd' / 'Ltd Acme Corp'                    1.0000          0.5714\n'red hot chili peppers' / 'chili peppers red hot'    1.0000          0.7273" },

    { t: "callout", kind: "insight", title: "Both problems handled, neither perfectly",
      body: [{ t: "p", text: "The typo pair rises from **0.0000 to 0.1538** — no longer a total failure — while reordered pairs stay high at 0.4545 to 0.7273. That is why character n-grams are the workhorse of entity resolution: one representation that degrades gracefully under both kinds of error. Note the honest cost: reordered pairs fell from a perfect 1.0000 to around 0.5, because n-grams spanning word boundaries are destroyed by reordering. You have traded a perfect score on one failure mode for a usable score on both, and the absolute numbers are now lower across the board, so thresholds must be recalibrated." }] },

    { t: "p", text: "Choosing `n` is a real trade. `n = 2` is very tolerant and produces many collisions between unrelated strings; `n = 4` or `5` is discriminating but brittle to typos. **`n = 3` is the usual default** for names, and the right value depends on your field lengths — short fields need small `n` simply to produce enough n-grams to compare." },

    { t: "h2", n: "04", text: "Cosine similarity", id: "cosine" },

    {"kind": "trace", "title": "Five differences, and the one that decides it is weighting", "caption": "**Jaccard treats tokens as present or absent; cosine works on counts or weights, so a token appearing three times contributes more than one appearing once — and the vectors can carry TF-IDF weights rather than raw presence.** Which is the row that matters for 8.4: **all tokens equal against any weighting**, because real record data is full of tokens that are present and uninformative. The length row is the other practical difference: **Jaccard penalises different sizes through the union; cosine normalises it away.**", "left": "property", "codeW": 150, "vars": ["Jaccard", "cosine"], "steps": [{"code": "input", "state": ["sets - presence only", "vectors - counts or weights"], "tone": "good"}, {"code": "repeated tokens", "state": ["ignored", "counted"], "changed": [0, 1], "tone": "good"}, {"code": "weighting", "state": ["all tokens equal", "any, including TF-IDF"], "changed": [0, 1], "tone": "violet"}, {"code": "length sensitivity", "state": ["penalised via the union", "normalised away"], "changed": [0, 1], "tone": "good"}, {"code": "best for", "state": ["short fields", "longer text, weighted tokens"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-8_3-04-3"},

    { t: "math", tex: "\\cos(a, b) = \\frac{a \\cdot b}{\\|a\\|\\,\\|b\\|}" },

    { t: "p", text: "Jaccard treats tokens as present or absent. Cosine works on **counts** or weights, so a token appearing three times contributes more than one appearing once, and the vectors can carry TF-IDF weights rather than raw presence." },

    { t: "table",
      head: ["", "Jaccard", "Cosine"],
      rows: [
        ["Input", "Sets — presence only", "Vectors — counts or weights"],
        ["Repeated tokens", "Ignored", "Counted"],
        ["Weighting", "All tokens equal", "Any weighting, including TF-IDF"],
        ["Length sensitivity", "Penalises different sizes via the union", "Normalised away by the denominator"],
        ["Best for", "Short fields, presence semantics", "Longer text, weighted tokens"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Length normalisation cuts both ways",
      body: [{ t: "p", text: "Cosine divides by both vector norms, so a short string and a long string containing it can score highly — `\"Acme\"` against `\"Acme Corporation Limited of London\"` is far more similar under cosine than under Jaccard, where the union is large and the intersection small. Whether that is correct depends entirely on your data. For matching a search query against a document it is exactly right. For deciding whether two **records** describe the same entity it is usually wrong, because the extra tokens carry real distinguishing information. Jaccard's length sensitivity is a feature in record linkage." }] },

    { t: "h2", n: "05", text: "Choosing a tokenisation", id: "tokenisation" },

    { t: "diagram", kind: "compare", title: "The two failure surfaces",
      columns: [
        { title: "Word tokens", tone: "teal", items: [
          "Perfect on pure reordering (1.0000)",
          "Total failure on typos (0.0000)",
          "Sensitive to punctuation and case",
          "Few tokens, so cheap to index",
          "Good when the vocabulary is controlled"
        ] },
        { title: "Character n-grams", tone: "good", items: [
          "Good on reordering (0.45 to 0.73)",
          "Degrades gracefully on typos (0.1538)",
          "Robust to punctuation and spacing",
          "Many more tokens, costlier to index",
          "The default for entity resolution"
        ] }
      ] },

    { t: "callout", kind: "insight", title: "Normalisation is where most of the gain is",
      body: [{ t: "p", text: "Before choosing between metrics, normalise: lowercase, strip punctuation, collapse whitespace, expand or remove known suffixes such as *Ltd*, *Inc*, *Corporation*. `\"Smith, John\"` scoring 0.3333 rather than 1.0000 against `\"John Smith\"` is **entirely** a punctuation artefact — stripping the comma fixes it completely and costs nothing. Teams routinely reach for a more sophisticated metric when the actual problem is that their tokens carry trailing commas. Do the cheap normalisation first and re-measure before concluding a metric is inadequate." }] },

    { t: "code", lang: "python", title: "MinHash and LSH: Jaccard without the pairwise comparison",
      code: `from datasketch import MinHash, MinHashLSH

# THE PROBLEM: exact Jaccard over a million documents is 500 billion pairs.
# MinHash replaces each set with a fixed-length signature whose agreement rate
# ESTIMATES Jaccard, and LSH finds the candidate pairs without comparing all of them.

def signature(text, num_perm=128):
    m = MinHash(num_perm=num_perm)
    for shingle in {text[i:i + 5] for i in range(len(text) - 4)}:   # 5-char shingles
        m.update(shingle.encode("utf8"))
    return m

m1, m2 = signature(doc1), signature(doc2)
m1.jaccard(m2)                 # the ESTIMATE; error is about 1/sqrt(num_perm)
# 128 permutations -> roughly +/- 0.09. For a 0.8 threshold that is fine; for
# distinguishing 0.78 from 0.82 it is not, and num_perm has to go up.

lsh = MinHashLSH(threshold=0.8, num_perm=128)
for doc_id, text in corpus.items():
    lsh.insert(doc_id, signature(text))

lsh.query(signature(new_doc))  # candidates above ~0.8, in sub-linear time

# THE THRESHOLD IS NOT A FILTER, it is where the band/row split is tuned to put
# the S-curve. Pairs slightly below it are sometimes returned and pairs slightly
# above are sometimes missed -- so re-score the candidates exactly if it matters.`,
      caption: "**The signature agreement estimates Jaccard, with an error of roughly one over the square root of the permutation count** — so 128 permutations give about plus or minus 0.09, which is fine for a 0.8 cut-off and useless for telling 0.78 from 0.82. The threshold passed to LSH tunes where the probability curve rises, not a hard filter: pairs just under it sometimes come back and pairs just over it are sometimes missed." },
    { t: "p", text: "**The shingle size is the other decision, and it is the one that decides what \u201csimilar\u201d means.** Character shingles of four or five catch near-duplicate text through typos and reformatting; word shingles catch reuse of phrasing and ignore spelling. For near-duplicate detection at corpus scale this pair — MinHash for the signature, LSH for the lookup — is the standard answer, and the exact re-score on the shortlist is what makes it precise." },

    { t: "callout", kind: "trap", title: "Word-level Jaccard on misspelled names",

      body: [

        { t: "p", text: "Word-level Jaccard counts exact shared tokens, so a single typo in each word gives zero similarity." },

        { t: "p", text: "Use character n-grams for names, which tolerate typos." }

      ] },


    { t: "exercise", kind: "Challenge", title: "Measure both families", difficulty: "core", minutes: 30,
      requirements: [
        "Compute word Jaccard and 3-gram Jaccard on 50 known-match pairs from your data and compare the distributions.",
        "Strip punctuation and lowercase, then re-measure. Record how much of the gain came from normalisation alone.",
        "Sweep n from 2 to 5 and find where typo tolerance and discrimination balance for your field lengths.",
        "Find a pair where word Jaccard and edit similarity disagree strongly, and decide which is right.",
        "Compare Jaccard and cosine on a pair where one string contains the other, and decide which behaviour you want."
      ],
      hint: "Pad strings with a space before taking character n-grams, so the first and last characters get their own grams. Normalise (lowercase, strip accents and punctuation) before measuring any family.",
      solution: {
        lang: "python", title: "jaccard_families.py",
        code: `import re, math, collections, unicodedata

"""A small labelled set of record pairs: 1 = same entity, 0 = different. Written to include each failure family."""
PAIRS = [
    ("John Smith", "Jon Smith", 1), ("John Smith", "Smith, John", 1), ("Catherine Jones", "Katherine Jones", 1),
    ("Robert Brown", "Bob Brown", 1), ("Acme Corporation Limited", "Acme Corp Ltd", 1), ("IBM", "International Business Machines", 1),
    ("Jose Garcia", "José García", 1), ("Mary-Ann Lee", "Mary Ann Lee", 1), ("William O'Neil", "William ONeil", 1),
    ("Dr. Sarah Kim", "Sarah Kim", 1), ("Microsoft Corp.", "Microsoft Corporation", 1), ("Steven Wright", "Stephen Wright", 1),
    ("McDonald's", "McDonalds", 1), ("New York Times Co", "The New York Times Company", 1), ("Li Wei", "Wei Li", 1),
    ("John Smith", "Jane Smith", 0), ("Beta Corporation Limited", "Acme Corporation Limited", 0), ("Mark Johnson", "Mark Jonson Ltd", 0),
    ("Apple Inc", "Applebee's Inc", 0), ("Anna Taylor", "Hannah Taylor", 0), ("Global Tech Solutions", "Global Tech Services", 0),
    ("Peter Parker", "Peter Porter", 0), ("Smith & Sons", "Smithson", 0), ("Delta Airlines", "Delta Faucets", 0),
    ("Chris Evans", "Chris Evans Jr", 0), ("North Bank", "Bank North", 0), ("Michael Lee", "Michelle Lee", 0),
    ("Oracle Corp", "Oracle Consulting Group", 0), ("Sam Brown", "Samantha Brown", 0), ("United Foods", "United Woods", 0),
]

def words(s): return set(s.split())
def grams(s, n=3): s = f" {s} "; return {s[i:i + n] for i in range(len(s) - n + 1)}
def jac(a, b): return len(a & b) / len(a | b) if a | b else 1.0
def norm(s): return re.sub(r"[^\\w\\s]", "", unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()).strip()
matches = [(a, b) for a, b, y in PAIRS if y]; non = [(a, b) for a, b, y in PAIRS if not y]

# 1-2. Word and 3-gram Jaccard on matches, raw and normalised.
mean = lambda xs: sum(xs) / len(xs)
for label, f in (("raw", lambda s: s), ("normalised", norm)):
    w = mean([jac(words(f(a)), words(f(b))) for a, b in matches]); g = mean([jac(grams(f(a)), grams(f(b))) for a, b in matches])
    print(f"{label:10} mean on true matches: word Jaccard {w:.3f}, 3-gram Jaccard {g:.3f}")

# 3. n from 2 to 5: separation between matches and non-matches.
print("\\n n   mean match   mean non-match   gap")
for n in (2, 3, 4, 5):
    m = mean([jac(grams(norm(a), n), grams(norm(b), n)) for a, b in matches]); x = mean([jac(grams(norm(a), n), grams(norm(b), n)) for a, b in non])
    print(f" {n}   {m:10.3f}   {x:14.3f}   {m - x:.3f}")

# 4. Word Jaccard against edit similarity.
def lev(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1): cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb))
        prev = cur
    return 1 - prev[-1] / max(len(a), len(b))
rows = sorted(((abs(jac(words(norm(a)), words(norm(b))) - lev(norm(a), norm(b))), a, b, y) for a, b, y in PAIRS), reverse=True)[:3]
for d, a, b, y in rows:
    print(f"\\n{a!r} / {b!r} (truth: {'match' if y else 'different'}): word Jaccard {jac(words(norm(a)), words(norm(b))):.3f}, edit {lev(norm(a), norm(b)):.3f}")

# 5. Containment: Jaccard against cosine on token counts.
def cos(a, b):
    ca, cb = collections.Counter(a.split()), collections.Counter(b.split())
    return sum(ca[t] * cb[t] for t in ca) / math.sqrt(sum(v * v for v in ca.values()) * sum(v * v for v in cb.values()))
for a, b in (("acme", "acme corporation limited"), ("chris evans", "chris evans jr")):
    print(f"\\ncontainment {a!r} in {b!r}: Jaccard {jac(words(a), words(b)):.3f}, cosine {cos(a, b):.3f}")
`,
        out: `raw        mean on true matches: word Jaccard 0.330, 3-gram Jaccard 0.525
normalised mean on true matches: word Jaccard 0.552, 3-gram Jaccard 0.642

 n   mean match   mean non-match   gap
 2        0.732            0.595   0.138
 3        0.642            0.477   0.165
 4        0.573            0.389   0.184
 5        0.510            0.307   0.203

'North Bank' / 'Bank North' (truth: different): word Jaccard 1.000, edit 0.000

'John Smith' / 'Smith, John' (truth: match): word Jaccard 1.000, edit 0.000

'Smith & Sons' / 'Smithson' (truth: different): word Jaccard 0.000, edit 0.727

containment 'acme' in 'acme corporation limited': Jaccard 0.333, cosine 0.577

containment 'chris evans' in 'chris evans jr': Jaccard 0.667, cosine 0.816`,
        notes: [
          { t: "p", text: "Normalisation alone lifted mean word Jaccard on true matches from 0.33 to 0.55 and 3-gram Jaccard from 0.53 to 0.64. Accents, apostrophes and case were doing more damage than any choice of metric, so normalise before tuning anything else." },
          { t: "p", text: "Longer n-grams widened the gap between matches and non-matches, from 0.14 at n = 2 to 0.20 at n = 5, but lowered the absolute scores, so typos cost more. With short name fields, 3 or 4 is the usual compromise. Choose n from the gap on your own pairs, not from a default." },
          { t: "p", text: "The two families disagree completely on reorderings. 'John Smith'/'Smith, John' (a match) and 'North Bank'/'Bank North' (different banks) both get word Jaccard 1.0 and edit similarity 0.0. No metric can tell them apart, because the evidence that distinguishes them is not in the strings. That is a case for a reference table or a human, not a better threshold. For containment, cosine rates 'acme' in 'acme corporation limited' at 0.58 against Jaccard's 0.33. Cosine is kinder to a short name inside a long one, which is right for abbreviations and wrong for 'Chris Evans' against 'Chris Evans Jr'." },
          { t: "p", text: "The 30 labelled pairs stand in for 'your data'. They were written to include each failure family, so treat the accuracies as a demonstration of the method, not as a benchmark." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: a matcher that failed on every typo",
      body: [
        { t: "p", text: "**Symptom.** A word-level Jaccard matcher scored 'Jon Smyth' and 'John Smith' as completely different." },
        { t: "p", text: "**Mechanism.** Word-level Jaccard counts shared tokens, and the misspellings meant no tokens were shared exactly." },
        { t: "p", text: "**Fix.** Character n-grams are used for names, which tolerate typos, and the two families are combined for different kinds of difference." }
      ] }
  ],

  takeaways: [
    "Jaccard is intersection over union of token sets; order vanishes at tokenisation, so the metric cannot be order-sensitive.",
    "Word Jaccard scores pure reordering at a perfect 1.0000 — exactly what edit distance cannot do.",
    "It scores 'John Smith' against 'Jon Smyth' at 0.0000, because a changed character makes an entirely different token.",
    "The two families fail on disjoint cases: 0.8000 vs 0.0000 on the typo pair, 0.0909 vs 0.3333 on the reordered pair.",
    "No threshold classifies both correctly, which is why production systems combine several scores per pair.",
    "Character 3-grams lift the typo pair from 0.0000 to 0.1538 while keeping reordered pairs at 0.45 to 0.73.",
    "That graceful degradation under both error types is why n-grams are the entity-resolution default.",
    "n = 3 is the usual choice; smaller is more tolerant and more collision-prone, larger is discriminating and brittle.",
    "Cosine uses counts or weights and normalises length away, which helps query-document matching and usually hurts record linkage.",
    "'Smith, John' scoring 0.3333 is entirely a punctuation artefact — normalise before blaming the metric."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why does word Jaccard score 'John Smith' vs 'Jon Smyth' at exactly 0.0000?",
      options: ["The strings are too short", "Changed words share no set member", "Punctuation was not stripped", "The union of sets is empty"],
      answer: 1,
      why: "'john' and 'jon' are different objects, as are 'smith' and 'smyth', so the intersection is empty. Edit distance scored the same pair 0.8000. The failure is structural: a set method cannot express that two tokens are nearly the same, which is exactly what character n-grams fix." },
    { stem: "What do character n-grams buy over word tokens?",
      options: ["Faster indexing of records", "Tolerance to typos and reordering", "Exact matching on whole words", "Independence from the language"],
      answer: 1,
      why: "A typo destroys only the few n-grams spanning it rather than a whole token. The cost is that reordered pairs fall from a perfect 1.0000 to around 0.5, because n-grams crossing word boundaries are lost, and every absolute score is lower — so thresholds must be recalibrated." },
    { stem: "'Smith, John' scores 0.3333 against 'John Smith' on word Jaccard. Why?",
      options: ["The word order differs", "The comma sticks to 'smith,'", "Jaccard penalises two-token strings", "Case sensitivity"],
      answer: 1,
      why: "Order is irrelevant to Jaccard by construction, so it cannot be the cause. Stripping punctuation takes this pair to 1.0000 and costs nothing. Teams often reach for a more sophisticated metric when the real problem is trailing commas — normalise and re-measure first." },
    { stem: "When would you prefer cosine over Jaccard?",
      options: ["Always, as it is more principled", "When weights and length matter", "On short fields", "When word order matters"],
      answer: 1,
      why: "Cosine divides by both norms, so a short string and a long one containing it score highly. That is right for matching a query against a document and usually wrong for deciding whether two records describe the same entity, where the extra tokens carry distinguishing information. Jaccard's length sensitivity is a feature there." }
  ] },

  interview: { title: "Interview", sub: "Set and vector similarity", questions: [
    { level: "Core", q: "When would you use Jaccard rather than edit distance?",
      strong: "When token order can vary — but know that it fails completely on typos.",
      answer: [{ t: "p", text: "Whenever the fields are multi-token and order can vary — names given as 'Surname, Forename' in one system and 'Forename Surname' in another, company names with the legal suffix in different positions, addresses with varying component order. Jaccard is intersection over union of token sets, and order disappears at the tokenisation step, so it's order-invariant by construction rather than by tolerance. I measured three reordered pairs scoring a perfect 1.0000. But I'd immediately flag the complementary failure, because it's total: 'John Smith' against 'Jon Smyth' scores exactly 0.0000 on word Jaccard, where edit distance scored it 0.8000. No token is shared, and a set has no notion of two members being nearly the same. So the two families fail on disjoint cases — 0.8000 versus 0.0000 on the typo pair, 0.0909 versus 0.3333 on the reordered pair — and there's no threshold on either that gets both right. That's why I wouldn't pick one. Production entity resolution computes several scores per pair and combines them, either with weighted rules or a classifier taking the scores as features." }] },
    { level: "Senior", q: "How do you handle both typos and reordering in one metric?",
      strong: "Character n-grams — and do the normalisation first, which is where most of the gain is.",
      answer: [{ t: "p", text: "Character n-grams, typically trigrams. Instead of splitting into words, split into overlapping character sequences, so a single typo destroys only the few n-grams spanning it rather than an entire token. I measured the effect: the typo pair went from 0.0000 on word Jaccard to 0.1538 on 3-grams, while reordered pairs stayed usable at 0.45 to 0.73. It degrades gracefully under both error types, which is why it's the entity-resolution default. The honest cost is that reordered pairs fall from a perfect 1.0000 to around 0.5, because n-grams crossing word boundaries are destroyed, and every absolute score is lower, so thresholds need recalibrating from scratch. Before any of that though, I'd do the normalisation, because that's where most of the easy gain is. 'Smith, John' scored only 0.3333 against 'John Smith' on word Jaccard, and that was entirely because the comma attached to the token — stripping punctuation takes it to 1.0000 and costs nothing. Lowercase, strip punctuation, collapse whitespace, standardise legal suffixes like Ltd and Limited. I've seen teams reach for embeddings when the actual problem was trailing commas, so I'd always normalise and re-measure before concluding a metric is inadequate." }] },
    { level: "Senior", q: "How would you combine several similarity scores into one decision?",
      strong: "As features to a classifier if you have labels, weighted rules if you do not — and keep a review band.",
      answer: [{ t: "p", text: "If I have labelled pairs, I would treat the scores as features and train a classifier — logistic regression or gradient boosting on edit similarity, Jaro-Winkler, token Jaccard, n-gram Jaccard and TF-IDF cosine, one feature per field. That learns the weighting from data rather than from my guesses, and logistic regression in particular stays inspectable, so you can see which score is driving a decision. The labelled set has to include hard negatives — pairs drawn from the same blocking bucket rather than sampled at random, since random non-matches are trivially separable and would make any model look excellent. If I have no labels, weighted rules, with the weights set from what each metric is good at rather than tuned: require agreement from at least two families, since they fail on disjoint cases — I measured 0.8000 against 0.0000 on a typo pair and 0.0909 against 0.3333 on a reordered pair, so a pair scoring high on either family alone is weaker evidence than a pair scoring moderately on both. Either way I would output three outcomes rather than two: auto-match above a high threshold, reject below a low one, and route the band between to human review, because that band is where both error types live. And the review decisions become the labelled data for the classifier, so the rule-based version is a reasonable first step toward the learned one."}] }
  ] }
});

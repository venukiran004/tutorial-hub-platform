/* ============================================================================
   LESSON 8.2 — Jaro-Winkler Similarity
   Jaro and Jaro-Winkler implemented from scratch; the canonical values
   reproduce (MARTHA/MARHTA 0.9444 → 0.9611), and a full reversal still
   scores 0.5000 (§05) (n81.py).
   ========================================================================= */
EC.receiveLesson({
  id: "8.2",

  lede: "**`abcd` and `dcba` — a complete reversal with not one character in the same place — score 0.5000 on Jaro.** That is not a bug. Jaro counts characters that appear within a sliding window regardless of order, so a reversal of four characters still finds matches. It is the property that makes Jaro tolerant of the small displacements typing produces, and the property you must understand before trusting it on short strings. This lesson implements Jaro and Jaro-Winkler and reproduces the canonical values exactly.",

  objectives: [
    "Compute Jaro similarity from matches, lengths and transpositions",
    "Explain the matching window and what it tolerates",
    "Apply the Winkler prefix bonus and justify it for names",
    "Reproduce the canonical benchmark values",
    "Recognise where Jaro's order-tolerance becomes a liability"
  ],

  prerequisites: ["8.1"],

  blocks: [

    { t: "h2", n: "01", text: "The formula", id: "formula" },

    {"kind": "trace", "title": "Three terms, and the window is what makes it not an edit distance", "caption": "**`m` counts characters appearing in both strings *within a window* of `max(|s1|,|s2|)/2 − 1` positions, each matched only once** — which is the structural difference from 8.1: **Jaro never computes a sequence of edits, it counts coincidences inside a tolerance.** The three terms are then readable: **what fraction of the first string matched, what fraction of the second matched, and what fraction of the matches were in the right order.** Range: **0 means no shared characters, 1 means identical.**", "left": "term", "codeW": 150, "vars": ["what it is"], "steps": [{"code": "m / |s1|", "state": ["fraction of s1 that matched"], "tone": "good"}, {"code": "m / |s2|", "state": ["fraction of s2 that matched"], "changed": [0], "tone": "good"}, {"code": "(m - t) / m", "state": ["fraction of matches in order"], "changed": [0], "tone": "good"}, {"code": "the window", "state": ["max(|s1|,|s2|)/2 - 1 positions"], "changed": [0], "tone": "violet", "note": "coincidences, not edits"}], "t": "diagram", "id": "dg-8_2-01-0"},

    { t: "math", tex: "\\text{Jaro} = \\frac{1}{3}\\left(\\frac{m}{|s_1|} + \\frac{m}{|s_2|} + \\frac{m - t}{m}\\right)" },

    { t: "dl", items: [
      ["`m` — matches", "Characters that appear in both strings **within a window** of `max(|s1|,|s2|)/2 − 1` positions. Each character can only be matched once."],
      ["`t` — transpositions", "Among the matched characters, how many are out of order, divided by two."],
      ["The three terms", "What fraction of the first string matched, what fraction of the second matched, and what fraction of the matches were in the right order."],
      ["Range", "0 means no shared characters at all; 1 means identical."]
    ] },

    { t: "callout", kind: "insight", title: "The window is what makes it different from edit distance",
      body: [{ t: "p", text: "Edit distance requires characters to line up through a sequence of operations. Jaro just asks: is this character present *nearby* in the other string? For two 6-character strings the window is `6/2 − 1 = 2`, so a character can be displaced by up to two positions and still count as a match. That tolerance is deliberate — typing errors displace characters slightly rather than rewriting them — and it is why Jaro was designed for census and name matching rather than for general string comparison." }] },

    { t: "h2", n: "02", text: "The canonical values", id: "canonical" },

    {"kind": "trace", "title": "Both literature examples reproduce, and one pair gets no bonus at all", "caption": "**`MARTHA`/`MARHTA` at 0.9444 and `DIXON`/`DICKSONX` at 0.7667 are the two examples used throughout the literature, and both reproduce exactly.** The row to stop on is `JELLYFISH`/`SMELLYFISH`: **0.8963 before the bonus and 0.8963 after — no Winkler bonus at all, because the first characters differ.** **The bonus is strictly a prefix bonus**, so a leading character difference forfeits it entirely however similar the rest is. And `abcd`/`dcba` at **0.5000** is §05's liability in one number.", "left": "pair", "codeW": 170, "vars": ["Jaro", "Jaro-Winkler", "prefix"], "steps": [{"code": "'MARTHA' / 'MARHTA'", "state": ["0.9444", "0.9611", "3"], "tone": "good"}, {"code": "'DIXON' / 'DICKSONX'", "state": ["0.7667", "0.8133", "2"], "changed": [0, 1, 2], "tone": "good"}, {"code": "'JELLYFISH' / 'SMELLYFISH'", "state": ["0.8963", "0.8963", "0"], "changed": [0, 1, 2], "tone": "crit", "note": "no bonus"}, {"code": "'Jon' / 'John'", "state": ["0.9167", "0.9333", "2"], "changed": [0, 1, 2], "tone": "good"}, {"code": "'abcd' / 'dcba'", "state": ["0.5000", "0.5000", "0"], "changed": [0, 1, 2], "tone": "crit"}], "t": "diagram", "id": "dg-8_2-02-1"},

    { t: "out", text:
"pair                          Jaro       Jaro-Winkler   common prefix\n'MARTHA' / 'MARHTA'          0.9444        0.9611            3\n'DIXON' / 'DICKSONX'         0.7667        0.8133            2\n'JELLYFISH' / 'SMELLYFISH'   0.8963        0.8963            0\n'Jon' / 'John'               0.9167        0.9333            2\n'Smith' / 'Smyth'            0.8667        0.8933            2\n'abcd' / 'dcba'              0.5000        0.5000            0" },

    { t: "p", text: "`MARTHA`/`MARHTA` and `DIXON`/`DICKSONX` are the two examples used throughout the literature, and both reproduce exactly. Note `JELLYFISH`/`SMELLYFISH` gets **no** Winkler bonus at all, because the first characters differ — the bonus is strictly a prefix bonus." },

    { t: "h2", n: "03", text: "The Winkler bonus", id: "winkler" },

    {"kind": "trace", "title": "The lowest-scoring pair gains the most, by design", "caption": "**`DIXON`/`DICKSONX` gains 0.0466 — the largest bonus of the three — because it started lowest.** That is the `(1 − Jaro)` term: **the bonus scales with how much room is left, so a pair already at 0.95 can gain at most 0.05 × 0.4, while a pair at 0.7 can gain much more.** Which means the Winkler bonus **helps borderline pairs across a threshold and barely moves pairs that were already clearly matching** — a deliberate design, not a side effect.", "left": "pair", "codeW": 170, "vars": ["Jaro", "bonus gained", "final"], "steps": [{"code": "'Jon' / 'John'", "state": ["0.9167", "+0.0166", "0.9333"], "tone": "good"}, {"code": "'Smith' / 'Smyth'", "state": ["0.8667", "+0.0266", "0.8933"], "changed": [0, 1, 2], "tone": "good"}, {"code": "'DIXON' / 'DICKSONX'", "state": ["0.7667", "+0.0466", "0.8133"], "changed": [0, 1, 2], "tone": "violet", "note": "lowest start, biggest gain"}], "t": "diagram", "id": "dg-8_2-03-2"},

    { t: "math", tex: "\\text{Jaro-Winkler} = \\text{Jaro} + \\ell \\cdot p \\cdot (1 - \\text{Jaro})" },

    { t: "p", text: "Where `ℓ` is the length of the common prefix capped at 4, and `p` is a scaling factor, conventionally 0.1. The `(1 − Jaro)` term means the bonus scales with how much room is left — a pair already at 0.95 can gain at most 0.05 × 0.4, while a pair at 0.7 can gain much more." },

    { t: "callout", kind: "insight", title: "Why a prefix bonus, and why cap it at four",
      body: [{ t: "p", text: "Winkler's observation came from census data: **people get the beginnings of names right**. Misspellings, mishearings and OCR errors cluster toward the end of a word, so agreement on the first few characters is unusually strong evidence of a match. Capping `ℓ` at 4 stops the bonus dominating on long strings — without it, two unrelated 30-character company names sharing a long common prefix would be pushed arbitrarily high. And `p = 0.1` with a cap of 4 bounds the maximum bonus at `0.4 × (1 − Jaro)`, so the score can never exceed 1." }] },

    { t: "out", text:
"the bonus in action\n\n  'Jon'/'John'      Jaro 0.9167 + 2 x 0.1 x (1 - 0.9167) = 0.9333\n  'Smith'/'Smyth'   Jaro 0.8667 + 2 x 0.1 x (1 - 0.8667) = 0.8933\n  'DIXON'/'DICKSONX' Jaro 0.7667 + 2 x 0.1 x (1 - 0.7667) = 0.8133" },

    { t: "p", text: "`DIXON`/`DICKSONX` gains the most — **0.0466** — because it started lowest. That is the `(1 − Jaro)` term doing its job: the bonus helps borderline pairs across a threshold, and barely moves pairs that were already clearly matching." },

    { t: "h2", n: "04", text: "Implementing it", id: "implementation" },

    {"kind": "flow", "title": "One `break` is the difference between a correct implementation and an inflated one", "caption": "**Each character in `s2` can only be consumed once — so the `break` after a match is essential, or repeated letters would match many times and inflate the score.** The rest of the implementation is two passes: **find matches inside the window with a flag array per string, then walk the matched positions in order and count how many are out of place, halving the result.** And the Winkler wrapper is six lines: **count the common prefix capped at 4, then `j + prefix · p · (1 − j)` with `p = 0.1`.**", "cols": 3, "nodes": [{"id": "w", "label": "Pass 1: match inside the window", "sub": "two flag arrays", "tone": "good"}, {"id": "b", "label": "break after each match", "sub": "consume each s2 char ONCE", "tone": "crit"}, {"id": "t", "label": "Pass 2: count out-of-order matches", "sub": "then halve", "tone": "good"}, {"id": "j", "label": "Combine the three terms", "sub": "divide by 3", "tone": "good"}, {"id": "p", "label": "Winkler: prefix capped at 4, p = 0.1", "sub": "six more lines", "tone": "accent"}], "edges": [["w", "b"], ["b", "t"], ["t", "j"], ["j", "p"]], "t": "diagram", "id": "dg-8_2-04-3"},

    { t: "code", lang: "python", title: "Jaro", code:
"def jaro(s1, s2):\n    if s1 == s2:\n        return 1.0\n    l1, l2 = len(s1), len(s2)\n    if l1 == 0 or l2 == 0:\n        return 0.0\n\n    window = max(max(l1, l2) // 2 - 1, 0)\n    f1, f2 = [False] * l1, [False] * l2\n    matches = 0\n\n    for i in range(l1):                          # find matches within the window\n        for j in range(max(0, i - window), min(i + window + 1, l2)):\n            if not f2[j] and s1[i] == s2[j]:\n                f1[i] = f2[j] = True\n                matches += 1\n                break\n    if matches == 0:\n        return 0.0\n\n    k = trans = 0                                # count transpositions\n    for i in range(l1):\n        if f1[i]:\n            while not f2[k]:\n                k += 1\n            if s1[i] != s2[k]:\n                trans += 1\n            k += 1\n    trans //= 2\n\n    return (matches/l1 + matches/l2 + (matches - trans)/matches) / 3",
      caption: "The `break` after a match is essential — each character in `s2` can only be consumed once, or repeated letters would match many times and inflate the score." },

    { t: "code", lang: "python", title: "And the Winkler bonus", code:
"def jaro_winkler(s1, s2, p=0.1, max_prefix=4):\n    j = jaro(s1, s2)\n    prefix = 0\n    for c1, c2 in zip(s1, s2):\n        if c1 == c2 and prefix < max_prefix:\n            prefix += 1\n        else:\n            break\n    return j + prefix * p * (1 - j)" },

    { t: "h2", n: "05", text: "Where the order-tolerance becomes a liability", id: "liability" },

    { t: "callout", kind: "crit", title: "A full reversal scores 0.5000",
      body: [{ t: "p", text: "`abcd` and `dcba` share no character in the same position, yet Jaro returns **0.5000**. With a window of `4/2 − 1 = 1`, `b` and `c` are each within one position of their counterpart, so they match; `a` and `d` do not. Two matches out of four in each string, and the transposition term applies. The consequence is that **Jaro has a high floor on short strings** — it will rarely return a value near 0 for two strings drawn from the same alphabet, so a threshold of 0.5 is nearly meaningless on 4-character fields. Choose thresholds by measuring your own non-matching pairs, not by intuition about what 0.5 ought to mean." }] },

    { t: "diagram", kind: "compare", title: "When to use which edit-family metric",
      columns: [
        { title: "Levenshtein / Damerau", tone: "teal", items: [
          "An interpretable count of edits",
          "Handles insertions and deletions cleanly",
          "Good for long strings and addresses",
          "No built-in prefix assumption",
          "Cost O(m x n) per pair"
        ] },
        { title: "Jaro-Winkler", tone: "good", items: [
          "Designed for personal names",
          "Tolerates small displacements",
          "Prefix bonus matches how names misspell",
          "Already normalised to [0,1]",
          "High floor on short strings"
        ] }
      ] },

    { t: "callout", kind: "tradeoff", title: "Jaro-Winkler for names, edit distance for everything else",
      body: [{ t: "p", text: "Jaro-Winkler's two design choices — a matching window and a prefix bonus — both encode assumptions about **personal names** specifically: that errors are small displacements and that beginnings are reliable. On names it outperforms raw edit distance and it is the default in most record-linkage systems for that reason. On addresses, product codes or free text those assumptions are weaker, and the prefix bonus can actively mislead — two unrelated addresses both starting *\"12 \"* get a bonus for nothing. Match the metric's assumptions to your field, and use different metrics for different columns of the same record." }] },

    { t: "code", lang: "python", title: "And the two libraries that ship it",
      code: 'import jellyfish\n\njellyfish.jaro_similarity("MARTHA", "MARHTA")          # 0.9444\njellyfish.jaro_winkler_similarity("MARTHA", "MARHTA")  # 0.9611\njellyfish.soundex("Smith"), jellyfish.soundex("Smyth") # both S530\njellyfish.metaphone("Smith")\n\nfrom rapidfuzz.distance import JaroWinkler\nJaroWinkler.similarity("MARTHA", "MARHTA")             # the same, in C++',
      caption: "The same two numbers as the hand implementation — and `soundex` gives `Smith` and `Smyth` one key." },
    { t: "p", text: "`jellyfish` is the one to reach for when you want the phonetic functions as well, because **`soundex(\"Smith\")` and `soundex(\"Smyth\")` are both `S530`, which is 8.5’s phonetic blocking key in one call.** `rapidfuzz.distance.JaroWinkler` is the same metric with C++ internals, and it takes a `score_cutoff` — **so a comparison that cannot beat your threshold is abandoned early rather than computed in full**, which matters when the thing you are doing is millions of comparisons." },
    { t: "exercise", kind: "Challenge", title: "Implement and calibrate", difficulty: "core", minutes: 30,
      requirements: [
        "Implement Jaro and reproduce 0.9444 for MARTHA/MARHTA before adding the Winkler bonus.",
        "Remove the `break` after a match and find a pair whose score inflates.",
        "Compute the window size for strings of length 3, 6 and 20, and find the shortest string where the window is 0.",
        "Score 100 known non-matching pairs from your data and plot the distribution to choose a threshold.",
        "Find a pair where the prefix bonus pushes a non-match above your threshold."
      ],
      hint: "Each character of the second string may be matched once. Mark it as used and `break` out of the inner loop as soon as a match is found, or repeated characters are counted several times.",
      solution: {
        lang: "python", title: "jaro_winkler.py",
        code: `

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

def jaro(a, b, use_break=True):
    if a == b: return 1.0
    w = max(max(len(a), len(b)) // 2 - 1, 0)
    ma, mb = [False] * len(a), [False] * len(b); m = 0
    for i, ca in enumerate(a):
        for j in range(max(0, i - w), min(len(b), i + w + 1)):
            if (not mb[j] or not use_break) and b[j] == ca:
                ma[i] = mb[j] = True; m += 1
                if use_break: break
    if not m: return 0.0
    sa = [c for c, f in zip(a, ma) if f]; sb = [c for c, f in zip(b, mb) if f]
    t = sum(x != y for x, y in zip(sa, sb)) / 2
    return (m / len(a) + m / len(b) + (m - t) / m) / 3

def jw(a, b, p=0.1):
    j = jaro(a, b); l = 0
    for x, y in zip(a[:4], b[:4]):
        if x != y: break
        l += 1
    return j + l * p * (1 - j)

# 1. MARTHA / MARHTA before and after the Winkler bonus.
print(f"Jaro(MARTHA, MARHTA) = {jaro('MARTHA', 'MARHTA'):.4f}; Jaro-Winkler = {jw('MARTHA', 'MARHTA'):.4f}")

# 2. Without the break, one character can match several times.
for a, b in (("AAAB", "ABBB"), ("aaaa", "a")):
    print(f"{a}/{b}: with break {jaro(a, b):.4f}, without {min(jaro(a, b, use_break=False), 9):.4f}")

# 3. Window sizes.
for n in (3, 4, 6, 20): print(f"length {n:2}: window {max(n // 2 - 1, 0)}")
print("strings of length 3 or less have window 0: only exact positions can match")

# 4. Non-match score distribution and a threshold.
non = sorted(jw(a.lower(), b.lower()) for a, b, y in PAIRS if not y)
yes = sorted(jw(a.lower(), b.lower()) for a, b, y in PAIRS if y)
print(f"\\nnon-matches: min {non[0]:.3f} median {non[len(non) // 2]:.3f} max {non[-1]:.3f}")
print(f"matches:     min {yes[0]:.3f} median {yes[len(yes) // 2]:.3f} max {yes[-1]:.3f}")

# 5. The prefix bonus pushing a non-match over a 0.9 threshold.
for a, b, y in PAIRS:
    j, w_ = jaro(a.lower(), b.lower()), jw(a.lower(), b.lower())
    if not y and j < 0.9 <= w_: print(f"prefix bonus crosses 0.9: {a!r} / {b!r}  Jaro {j:.3f} -> JW {w_:.3f}")
`,
        out: `Jaro(MARTHA, MARHTA) = 0.9444; Jaro-Winkler = 0.9611
AAAB/ABBB: with break 0.6667, without 0.9583
aaaa/a: with break 0.7500, without 1.1667
length  3: window 0
length  4: window 1
length  6: window 2
length 20: window 9
strings of length 3 or less have window 0: only exact positions can match

non-matches: min 0.533 median 0.918 max 0.967
matches:     min 0.524 median 0.915 max 0.986
prefix bonus crosses 0.9: 'Mark Johnson' / 'Mark Jonson Ltd'  Jaro 0.883 -> JW 0.930
prefix bonus crosses 0.9: 'Apple Inc' / "Applebee's Inc"  Jaro 0.881 -> JW 0.929
prefix bonus crosses 0.9: 'Peter Parker' / 'Peter Porter'  Jaro 0.889 -> JW 0.933
prefix bonus crosses 0.9: 'Smith & Sons' / 'Smithson'  Jaro 0.889 -> JW 0.933
prefix bonus crosses 0.9: 'Michael Lee' / 'Michelle Lee'  Jaro 0.864 -> JW 0.918`,
        notes: [
          { t: "p", text: "MARTHA/MARHTA reproduces 0.9444 before the Winkler bonus and 0.9611 after it. Removing the `break` let one character match repeatedly: AAAB/ABBB rose from 0.67 to 0.96, and aaaa/a reached 1.17, an impossible similarity above 1. Without that one line the bug is obvious only on repetitive strings." },
          { t: "p", text: "The window is max(len)/2 − 1, so strings of length 3 or less have a window of 0 and only exact positions can match. Short codes and initials get no transposition tolerance at all." },
          { t: "p", text: "On these pairs Jaro-Winkler separates almost nothing: non-matches have median 0.918 and matches 0.915. The prefix bonus is the reason. Five different-entity pairs that share a prefix ('Peter Parker'/'Peter Porter', 'Michael'/'Michelle Lee') were pushed over a 0.9 threshold by it. Jaro-Winkler suits short fields where the start is reliable, such as surnames in a census. It is a poor fit for company names that share common prefixes." },
          { t: "p", text: "The 30 labelled pairs stand in for 'your data'. They were written to include each failure family, so treat the accuracies as a demonstration of the method, not as a benchmark." }
        ]
      } }
  ],

  takeaways: [
    "Jaro combines three terms: the fraction of each string that matched, and the fraction of matches in the correct order.",
    "Matches are counted within a window of max(len)/2 − 1 positions, so characters displaced slightly still count.",
    "Each character can be matched only once — omitting the break after a match inflates scores on repeated letters.",
    "Canonical values reproduce exactly: MARTHA/MARHTA 0.9444, DIXON/DICKSONX 0.7667.",
    "The Winkler bonus is ℓ · p · (1 − Jaro) with ℓ capped at 4 and p = 0.1, so the maximum bonus is 0.4 × (1 − Jaro).",
    "The (1 − Jaro) factor means the bonus helps borderline pairs most — DIXON/DICKSONX gained 0.0466 while JELLYFISH/SMELLYFISH gained nothing.",
    "The bonus exists because people get the beginnings of names right; errors cluster toward the end.",
    "A full reversal, abcd/dcba, still scores 0.5000 — Jaro has a high floor on short strings.",
    "Choose thresholds by measuring your own non-matching pairs, never by intuition about what a score should mean.",
    "Jaro-Winkler encodes assumptions specific to personal names; use edit distance for addresses and codes."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why does 'abcd' vs 'dcba' score 0.5000 rather than near 0?",
      options: ["A bug in the implementation", "In-window matches ignore order", "Both strings share a length", "The transposition term dominates"],
      answer: 1,
      why: "The window is max(4,4)/2 − 1 = 1, so a character displaced by one position still matches. Two of four match in each string. The practical consequence is that Jaro has a high floor on short strings, so a threshold of 0.5 means very little on a 4-character field — calibrate against your own non-matching pairs." },
    { stem: "Why is the Winkler prefix bonus capped at four characters?",
      options: ["For computational efficiency", "So it cannot dominate long strings", "Names are usually four letters", "To keep the score below 1"],
      answer: 1,
      why: "With p = 0.1 and a cap of 4, the maximum bonus is 0.4 × (1 − Jaro), which also guarantees the score stays at or below 1. Without the cap, two unrelated 30-character company names sharing a long common prefix would receive an unbounded boost for something that carries little evidence." },
    { stem: "Why does the bonus include a (1 − Jaro) factor?",
      options: ["To normalise for the prefix length", "The bonus shrinks near a perfect score", "To make the metric symmetric", "To handle empty strings safely"],
      answer: 1,
      why: "DIXON/DICKSONX started at 0.7667 and gained 0.0466; a pair already at 0.95 can gain at most 0.05 × 0.4. The bonus is designed to push genuine but imperfect matches across a threshold rather than to inflate scores that were already clear." },
    { stem: "When is Jaro-Winkler the wrong choice?",
      options: ["On short strings only", "On fields that are not names", "When the lengths differ", "On any data with typos"],
      answer: 1,
      why: "Both design choices assume errors are small displacements and that beginnings are reliable, which holds for names and less so elsewhere. On addresses the prefix bonus actively misleads — two unrelated addresses starting '12 ' get a bonus for nothing. Use different metrics for different columns of the same record." }
  ] },

  interview: { title: "Interview", sub: "Jaro-Winkler", questions: [
    { level: "Core", q: "How does Jaro-Winkler differ from Levenshtein?",
      strong: "It counts matches within a window rather than edits in sequence, and adds a prefix bonus.",
      answer: [{ t: "p", text: "Levenshtein counts the edits needed to transform one string into another, so characters have to line up through a sequence of operations. Jaro asks a different question: for each character, does it appear nearby in the other string — within a window of roughly half the longer length? Then it combines three terms: the fraction of the first string that matched, the fraction of the second that matched, and the fraction of matches that were in the right order. Winkler adds a bonus proportional to the common prefix length, capped at four characters, scaled by how much room is left below 1. The design assumptions are specifically about personal names, which is where it came from — census record linkage. The window tolerates the small displacements that typing produces, and the prefix bonus encodes the observation that people get the beginnings of names right while errors cluster toward the end. On names it outperforms raw edit distance, which is why it's the default in most record-linkage systems. One property worth knowing: it has a high floor on short strings. I measured 'abcd' against 'dcba' — a complete reversal with no character in place — scoring 0.5000, because the window lets displaced characters still match. So a threshold of 0.5 is nearly meaningless on short fields, and you have to calibrate against your own non-matching pairs." }] },
    { level: "Senior", q: "How would you choose a similarity threshold?",
      strong: "Empirically, from labelled pairs, and by the relative cost of the two error types.",
      answer: [{ t: "p", text: "Never by intuition about what a score ought to mean, because the scales aren't intuitive. Jaro returns 0.5000 for a complete reversal of a four-character string, so 0.5 doesn't mean 'half similar' in any useful sense, and the floor moves with string length. I'd label a sample of pairs — both matches and non-matches, and crucially non-matches that are hard, drawn from the same blocking bucket rather than sampled at random, since random non-matches are trivially easy and would make any threshold look good. Then plot the score distributions for both classes and look at the overlap. Where they separate cleanly you can pick almost anything in the gap; where they overlap you're choosing between false positives and false negatives, and that's a business decision, not a statistical one. In entity resolution the two errors have very asymmetric costs: wrongly merging two customers can expose one person's data to another, which is far worse than failing to merge and holding a duplicate. So I'd usually set the threshold conservatively and add a review band — above the high threshold auto-merge, below the low threshold reject, and between them route to a human. And I'd report precision and recall separately at the chosen threshold rather than a single accuracy number, because the class imbalance is extreme and accuracy is dominated by the non-matches." }] },
    { level: "Senior", q: "You are matching names across two systems and recall is too low. Where do you look?",
      strong: "Normalisation and blocking before the metric — both cap recall before scoring runs.",
      answer: [{ t: "p", text: "I would look at normalisation and blocking before touching the similarity metric, because both cap recall before any score is computed. On normalisation: I measured 'Smith, John' scoring 0.3333 against 'John Smith' on word Jaccard purely because a comma attached to the token, and that goes to 1.0000 with one line of punctuation stripping. Honorifics, middle initials, accented characters and inconsistent case all do the same thing, and each one silently pushes true matches below threshold. On blocking: a pair that never lands in a common block can never be matched no matter how good the scorer is, so I would take known duplicates and measure what fraction share a block. That number is the ceiling on recall, and if it is 80% then a perfect metric still gives 80%. Only after those would I look at the metric, and then the question is whether the failures are typos or reorderings, because those need different families — I measured edit distance at 0.8000 and word Jaccard at 0.0000 on a typo pair, with the ordering flipped on a reordered pair. Jaro-Winkler is a good default for personal names specifically, since its matching window and prefix bonus encode how names actually misspell, but if the failures are reorderings its prefix bonus will not help and I would need token sorting or character n-grams." }] }
  ] }
});

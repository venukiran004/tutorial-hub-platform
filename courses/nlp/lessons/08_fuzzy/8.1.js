/* ============================================================================
   LESSON 8.1 — Levenshtein and Damerau-Levenshtein
   Mirrors 04_Fuzzy_Matching.md · §1-2. Both implemented from scratch, the
   full kitten→sitting matrix reproduced, and the reordering failure measured
   at 0.0909 for the same person (§06) (scratchpad/nlp/n81.py).
   ========================================================================= */
EC.receiveLesson({
  id: "8.1",

  lede: "**\"John Smith\" and \"Smith, John\" — the same person — score 0.0909 on edit-distance similarity. \"John Smith\" and \"Jon Smyth\" — possibly different people — score 0.8000.** Edit distance compares characters in order, so a reordering costs more than a misspelling. Picking the wrong similarity family is the most common mistake in record matching, and this lesson establishes the first family precisely: what Levenshtein measures, how to compute it, and exactly where it stops working.",

  objectives: [
    "Define edit distance and compute the full dynamic-programming matrix",
    "Implement Levenshtein in two rows instead of a full matrix",
    "Explain why Damerau-Levenshtein adds transposition and when it matters",
    "Convert a distance into a similarity score",
    "Identify the reordering failure that motivates set-based methods"
  ],

  prerequisites: ["7.8", "2.4"],

  blocks: [

    { t: "h2", n: "01", text: "The question all of this answers", id: "question" },

    { t: "out", text:
"Two records say\n\n    \"Jon Smith, 12 High St\"\n    \"John Smyth, 12 High Street\"\n\nAre they the same person?" },

    { t: "p", text: "There is no exact match to look up, so you need a **score** between 0 and 1 and a **threshold** above which you call it a match. Everything in this module is either a way to compute that score or a way to choose that threshold." },

    { t: "table",
      head: ["Family", "Compares", "Good at", "Blind to"],
      rows: [
        ["Edit distance — Levenshtein, Damerau, Jaro-Winkler", "Characters, in order", "Typos, misspellings, OCR errors", "Reordered words"],
        ["Set / vector — Jaccard, cosine, TF-IDF", "Tokens, order ignored", "Reordered words, extra words", "Typos inside a word"]
      ] },

    { t: "callout", kind: "crit", title: "Picking the wrong family is the usual mistake",
      body: [{ t: "p", text: "`\"Jon Smith\"` against `\"John Smyth\"` is a job for edit distance — same order, characters altered. `\"Smith, John\"` against `\"John Smith\"` is a job for a set method — same tokens, different order. Neither family handles both well, and choosing one and tuning its threshold will never fix a failure that belongs to the other. Lesson 8.3 measures both on the same pairs and shows each winning exactly where the other loses." }] },

    { t: "h2", n: "02", text: "Levenshtein distance", id: "levenshtein" },

    { t: "p", text: "The minimum number of single-character edits — insert, delete or substitute — to turn one string into another. It is a **distance**: 0 means identical, larger means further apart." },

    { t: "math", tex: "d[i][j] = \\min \\begin{cases} d[i-1][j] + 1 & \\text{delete} \\\\ d[i][j-1] + 1 & \\text{insert} \\\\ d[i-1][j-1] + \\text{cost} & \\text{substitute} \\end{cases}" },

    { t: "p", text: "with `d[i][0] = i` and `d[0][j] = j` — turning a string into an empty one costs one delete per character — and `cost = 0` if the characters match, 1 otherwise." },

    { t: "h2", n: "03", text: "The matrix, filled", id: "matrix" },

    { t: "out", text:
"kitten -> sitting\n\n            \"\"    s    i    t    t    i    n    g\n   \"\"       0    1    2    3    4    5    6    7\n   k        1    1    2    3    4    5    6    7\n   i        2    2    1    2    3    4    5    6\n   t        3    3    2    1    2    3    4    5\n   t        4    4    3    2    1    2    3    4\n   e        5    5    4    3    2    2    3    4\n   n        6    6    5    4    3    3    2    3\n\n  answer: 3 (bottom right)" },

    { t: "out", text:
"checking one cell by hand — row 'k', column 's'\n\n  above     d[0][1] + 1 = 1 + 1 = 2\n  left      d[1][0] + 1 = 1 + 1 = 2\n  diagonal  d[0][0] + cost = 0 + 1 = 1     ('k' != 's', so cost = 1)\n  minimum   -> 1                            matrix says 1" },

    { t: "p", text: "The three edits the matrix found: `kitten → sitten` (substitute k→s), `sitten → sittin` (substitute e→i), `sittin → sitting` (insert g). Every cell is the best of three neighbours, and the bottom-right cell is the answer for the whole pair." },

    { t: "h2", n: "04", text: "Implementing it", id: "implementation" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n81.py — two rows, not a full matrix", code:
"def levenshtein(a, b):\n    \"\"\"Two rows instead of the full matrix: O(min(m, n)) memory.\"\"\"\n    prev = list(range(len(b) + 1))          # the \"\" row: 0, 1, 2, ...\n    for i, ca in enumerate(a, 1):\n        cur = [i]                           # the \"\" column\n        for j, cb in enumerate(b, 1):\n            cur.append(min(\n                prev[j] + 1,                # delete\n                cur[j - 1] + 1,             # insert\n                prev[j - 1] + (ca != cb),   # substitute; True is 1\n            ))\n        prev = cur\n    return prev[-1]",
      caption: "Each row depends only on the previous one, so the full matrix is never needed — memory drops from O(m·n) to O(min(m,n)). Time stays O(m·n)." },

    { t: "out", text:
"levenshtein('kitten', 'sitting') = 3    reference 3    ok\nlevenshtein('flaw',   'lawn')    = 2    reference 2    ok\nlevenshtein('',       'abc')     = 3    reference 3    ok" },

    { t: "callout", kind: "insight", title: "O(m·n) is why blocking exists",
      body: [{ t: "p", text: "Every comparison costs the product of the two string lengths. That is fine for one pair and ruinous at scale: comparing a million records pairwise is 5 × 10¹¹ comparisons, which lesson 8.5 computes at roughly **15 years** at ten thousand per second. The response is not a faster edit-distance implementation — it is to **not compare most pairs at all**, which is what blocking does. Recognising that the algorithm's cost forces an architectural decision is the important part." }] },

    { t: "h2", n: "05", text: "Damerau-Levenshtein", id: "damerau" },

    { t: "p", text: "Levenshtein has three operations. Damerau adds a fourth: **transposition** of two adjacent characters, at a cost of 1." },

    { t: "out", text:
"pair                  Levenshtein    Damerau    why\n'ca' / 'ac'                2            1        one transposition\n'teh' / 'the'              2            1        the classic typo\n'Smith' / 'Smtih'          2            1        adjacent swap\n'kitten' / 'sitting'       3            3        no transposition here" },

    { t: "callout", kind: "insight", title: "Keyboard typos are overwhelmingly transpositions",
      body: [{ t: "p", text: "To Levenshtein, swapping two adjacent letters is **two** substitutions — it has no concept of a swap. To Damerau it is one edit. That matters because transposition is one of the most common human typing errors: `teh` for `the`, `Smtih` for `Smith`. If your data comes from human typing, Damerau's extra operation matches the actual error distribution, and using plain Levenshtein systematically over-penalises exactly the mistakes people make most. If your data comes from OCR, substitutions dominate instead and the distinction matters less." }] },

    { t: "code", lang: "python", title: "The transposition case", code:
"# inside the usual double loop, after computing d[i][j] the normal way:\nif i > 1 and j > 1 and a[i-1] == b[j-2] and a[i-2] == b[j-1]:\n    d[i][j] = min(d[i][j], d[i-2][j-2] + 1)      # transposition",
      caption: "This is *optimal string alignment* — it forbids editing a substring twice. True Damerau-Levenshtein allows it and is more complex; the OSA variant is what almost every library implements." },

    { t: "h2", n: "06", text: "From distance to similarity", id: "similarity" },

    { t: "math", tex: "\\text{similarity} = 1 - \\frac{\\text{distance}}{\\max(|a|, |b|)}" },

    { t: "p", text: "Dividing by the longer length bounds the result in [0, 1] and makes scores comparable across strings of different lengths — a distance of 2 means something very different on a 4-character string than on a 40-character one." },

    { t: "out", text:
"pair                                     Levenshtein    similarity\n'John Smith' / 'Smith, John'                 10            0.0909\n'John Smith' / 'Jon Smyth'                    2            0.8000\n'Acme Corp Ltd' / 'Ltd Acme Corp'             8            0.3846" },

    { t: "callout", kind: "crit", title: "The same person scores 0.0909 and the typo pair scores 0.8000",
      body: [{ t: "p", text: "`\"John Smith\"` and `\"Smith, John\"` are certainly the same person and score **0.0909** — below almost any threshold you would set. `\"John Smith\"` and `\"Jon Smyth\"` might well be different people and score **0.8000**. Reordering moves every character, so edit distance sees a near-total rewrite; a misspelling moves two. There is no threshold that fixes this, because the ordering is wrong rather than the scale. Reordered company names — `\"Acme Corp Ltd\"` against `\"Ltd Acme Corp\"` at 0.3846 — fail the same way, and in real corporate data that reordering is common." }] },

    { t: "exercise", title: "Implement and probe",
      tasks: [
        "Implement Levenshtein with two rows and verify all three reference values.",
        "Print the full matrix for a pair of your own and check one cell by hand.",
        "Add the transposition case and find a pair where Damerau and Levenshtein differ by 1.",
        "Take 20 real pairs from your data and find the threshold that separates matches from non-matches.",
        "Find a pair in your data that is a true match but scores below 0.3 on edit similarity, and identify why."
      ] }
  ],

  takeaways: [
    "Fuzzy matching needs a score in [0,1] and a threshold; everything else is how to compute one or choose the other.",
    "Two families: edit distance compares characters in order and handles typos; set methods compare tokens and handle reordering.",
    "Choosing the wrong family cannot be fixed by tuning the threshold — the failure belongs to the other family.",
    "Levenshtein is the minimum insert/delete/substitute edits, computed by dynamic programming; kitten→sitting is 3.",
    "Two rows suffice instead of the full matrix — O(min(m,n)) memory, still O(m·n) time.",
    "That quadratic cost per pair is why blocking exists: a million records pairwise is 5e11 comparisons.",
    "Damerau adds transposition at cost 1, so 'teh'/'the' is 1 edit rather than Levenshtein's 2.",
    "Transpositions are among the most common human typing errors, so Damerau matches the real error distribution for typed data.",
    "Normalise by the longer string to get a similarity in [0,1] comparable across lengths.",
    "'John Smith'/'Smith, John' scores 0.0909 while 'John Smith'/'Jon Smyth' scores 0.8000 — reordering breaks edit distance completely."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why does 'John Smith' vs 'Smith, John' score only 0.0909?",
      options: ["The comma adds distance", "Edit distance compares characters in order, so reordering moves nearly every character and looks like a near-total rewrite", "The strings are different lengths", "The threshold is wrong"],
      answer: 1,
      why: "A misspelling moves two characters; a reordering moves almost all of them. No threshold fixes this, because the problem is that the family is wrong — this pair needs a set or vector method, which ignores order by construction." },
    { stem: "Why implement Levenshtein with two rows?",
      options: ["It is faster", "Each row depends only on the previous one, so memory drops from O(m·n) to O(min(m,n)) while time stays O(m·n)", "It handles transpositions", "It avoids recursion"],
      answer: 1,
      why: "The recurrence looks only at the cell above, the cell to the left, and the diagonal — all within the current and previous rows. Time is unchanged, which is the cost that actually matters: comparing a million records pairwise is 5e11 comparisons, which is why blocking rather than a faster implementation is the answer at scale." },
    { stem: "What does Damerau-Levenshtein add, and when does it matter?",
      options: ["Case insensitivity", "Transposition of adjacent characters at cost 1 — which matters because transpositions are among the most common human typing errors", "Word-level edits", "A normalised score"],
      answer: 1,
      why: "Levenshtein has no concept of a swap, so 'teh' to 'the' costs 2 substitutions; Damerau costs 1. For human-typed data that matches the real error distribution, and plain Levenshtein systematically over-penalises the most common mistake. For OCR data, where substitutions dominate, the distinction matters less." },
    { stem: "Why normalise edit distance by the longer string's length?",
      options: ["To make it symmetric", "To bound it in [0,1] and make scores comparable across strings of different lengths", "To handle empty strings", "To speed up computation"],
      answer: 1,
      why: "A raw distance of 2 means something very different on a 4-character string than on a 40-character one. Dividing by the maximum length gives a similarity you can threshold consistently across a dataset with varied field lengths, which a raw distance cannot support." }
  ] },

  interview: { title: "Interview", sub: "Edit distance", questions: [
    { level: "Core", q: "How does Levenshtein distance work?",
      strong: "Dynamic programming over a matrix where each cell is the best of three neighbours.",
      answer: [{ t: "p", text: "It's the minimum number of single-character insertions, deletions or substitutions to turn one string into another, computed by dynamic programming. Build a matrix where cell i,j is the distance between the first i characters of one string and the first j of the other. The first row and column are just 0, 1, 2 and so on, since turning a string into an empty one costs one delete per character. Then each interior cell is the minimum of three options: the cell above plus one for a delete, the cell to the left plus one for an insert, and the diagonal plus zero or one depending on whether the characters match. The bottom-right cell is the answer — kitten to sitting is 3, which you can verify by hand. In practice you don't build the whole matrix: each row only depends on the previous one, so two rows give O of min m n memory while time stays O of m times n. That time complexity is the thing that actually shapes system design, because comparing a million records pairwise is about 5 times 10 to the 11 comparisons, roughly 15 years at ten thousand per second. The answer isn't a faster implementation, it's blocking — not comparing most pairs at all." }] },
    { level: "Senior", q: "When is edit distance the wrong tool?",
      strong: "Whenever tokens can be reordered — it scores the same person at 0.09.",
      answer: [{ t: "p", text: "Whenever word order can vary, which in record matching is constantly. I measured this: 'John Smith' against 'Smith, John' — definitely the same person — scores 0.0909 on normalised edit similarity, while 'John Smith' against 'Jon Smyth' — possibly different people — scores 0.8000. The ordering is exactly backwards, and no threshold fixes it because the problem isn't calibration, it's that the metric compares characters in sequence. A misspelling moves two characters; a reordering moves nearly all of them, so edit distance sees a near-total rewrite. The same thing happens with company names — 'Acme Corp Ltd' against 'Ltd Acme Corp' scores 0.3846 — and that reordering is common in real corporate registries. So the rule I'd apply is: if the fields are single tokens or fixed-order strings, like a postcode or a product code, edit distance is right and handles the OCR and typing errors you actually get. If the fields are multi-token and order can vary — names, addresses, company names — you need a set or vector method, or better, several scores combined. The families fail on disjoint cases, so combining them is what production systems do." }] },
    { level: "Senior", q: "Levenshtein or Damerau-Levenshtein?",
      strong: "Damerau if the data is human-typed; the distinction is small but systematic.",
      answer: [{ t: "p", text: "It depends on where the errors come from. Damerau adds one operation — transposing two adjacent characters at cost 1 — and that specifically matches how people mistype. To plain Levenshtein, swapping two letters is two substitutions, because it has no concept of a swap, so 'teh' to 'the' costs 2 and 'Smtih' to 'Smith' costs 2. Damerau costs 1 for both. Since transposition is one of the commonest human typing errors, using plain Levenshtein systematically over-penalises exactly the mistake people make most, which pushes genuine matches below threshold. For OCR data the calculus changes — OCR errors are dominated by substitution, an l read as a 1 or an rn read as an m, so transposition is rarer and the distinction matters less. One implementation note worth knowing: almost every library implements optimal string alignment rather than true Damerau-Levenshtein. OSA forbids editing a substring more than once, which makes it not a true metric — it can violate the triangle inequality — but it's much simpler and the difference essentially never shows up on short fields like names. If you're using it as a metric in something that assumes metric properties, that's worth checking." }] }
  ] }
});

/* ============================================================================
   LESSON 8.5 — RapidFuzz and Entity Resolution
   Mirrors 04_Fuzzy_Matching.md · §7-8. Every scorer is run and broken:
   token_set_ratio gives 100 for "Smith" vs "Smith Smith Smith", partial_ratio
   gives 100 for "cat" vs "category". Blocking arithmetic computed at 5e11
   pairs for 1M records (scratchpad/nlp/n83.py).
   ========================================================================= */
EC.receiveLesson({
  id: "8.5",

  lede: "**`token_set_ratio(\"Smith\", \"Smith Smith Smith\")` returns 100. `partial_ratio(\"cat\", \"category\")` returns 100.** Both scorers are behaving exactly as documented, and both answers are wrong for record matching. Every scorer in the library fixes one failure by introducing another, which makes choosing among them the real skill. This final lesson covers the library, the blocking arithmetic that makes matching possible at all, and how the pieces assemble into an entity-resolution system.",

  objectives: [
    "Choose among RapidFuzz's five scorers and predict each one's failure",
    "Compute why all-pairs comparison is impossible and what blocking costs",
    "Evaluate blocking keys as recall decisions made before any scoring",
    "Assemble a full entity-resolution pipeline",
    "Set thresholds from the asymmetric cost of the two error types"
  ],

  prerequisites: ["8.4", "8.1"],

  blocks: [

    { t: "h2", n: "01", text: "The library", id: "library" },

    { t: "p", text: "FuzzyWuzzy and RapidFuzz are **libraries, not algorithms** — they wrap edit distance in ready-made scorers returning 0 to 100. RapidFuzz is the modern replacement: the same API, C++ internals, 10–100x faster, and MIT rather than GPL licensed. Use RapidFuzz in new work." },

    { t: "out", text:
"\"New York Mets\" against \"the Mets of New York\"\n\n  ratio               48.5\n  partial_ratio       76.2\n  token_sort_ratio    78.8\n  token_set_ratio    100.0\n  WRatio              85.5" },

    { t: "table",
      head: ["Scorer", "What it does", "Fixes", "Introduces"],
      rows: [
        ["`ratio`", "Edit similarity over the whole string", "—", "Fails on any reordering"],
        ["`partial_ratio`", "Best score against any substring of the longer string", "Length mismatch", "A short substring scores 100"],
        ["`token_sort_ratio`", "Sorts words alphabetically, then `ratio`", "Reordering", "Still character-sensitive within words"],
        ["`token_set_ratio`", "Compares shared tokens against the leftovers", "Extra words", "Repetition becomes invisible"],
        ["`WRatio`", "Tries several and takes the best, with length penalties", "Most single failures", "Unpredictable which one fired"]
      ] },

    { t: "h2", n: "02", text: "Token sorting solves lesson 8.1's failure", id: "tokensort" },

    { t: "out", text:
"\"New York Mets\" / \"Mets New York\"\n\n  ratio              61.5      reference says ~54\n  token_sort_ratio  100.0      reference says 100\n\n  because sorting normalises both to \"mets new york\"" },

    { t: "callout", kind: "warn", title: "`ratio` gives 61.5 where the reference says ~54",
      body: [{ t: "p", text: "A genuine implementation difference rather than an error. FuzzyWuzzy's `ratio` was built on Python's `difflib.SequenceMatcher`, which uses a longest-matching-block algorithm; RapidFuzz's uses **indel distance** — Levenshtein without substitutions. They give different numbers on the same input. The reference's `~` acknowledges approximation, but the gap matters if you are migrating: **a threshold tuned on FuzzyWuzzy will not transfer to RapidFuzz unchanged**. Re-calibrate after switching libraries, exactly as you would after switching models." }] },

    { t: "out", text:
"the reordered name pair from lesson 8.1\n\n  'John Smith' / 'Smith, John'\n\n  ratio              48\n  partial_ratio      67\n  token_sort_ratio   95\n  token_set_ratio    95" },

    { t: "p", text: "Lesson 8.1 measured this pair at **0.0909** on normalised edit distance — effectively unmatchable. `token_sort_ratio` scores it **95**. The library has not invented anything; it sorts the tokens before comparing, which is the set-method insight from lesson 8.3 applied as a preprocessing step to an edit metric. That combination is why these scorers are the practical default." },

    { t: "h2", n: "03", text: "Breaking each scorer", id: "breaking" },

    { t: "out", text:
"pair                                ratio  partial  tok_sort  tok_set\n'John Smith' / 'Smith, John'          48      67        95       95\n'John Smith' / 'Jon Smyth'            84      78        84       84\n'Acme Ltd' / 'Acme Limited'           80      86        80       80\n'Smith' / 'Smith Smith Smith'         45     100        45      100\n'cat' / 'category'                    55     100        55       55" },

    { t: "callout", kind: "crit", title: "Two scorers return a perfect 100 on non-matches",
      body: [{ t: "p", text: "`token_set_ratio(\"Smith\", \"Smith Smith Smith\")` = **100**, because the *shared token set* is identical — a set cannot see repetition, so the strings are indistinguishable to it. `partial_ratio(\"cat\", \"category\")` = **100**, because `cat` appears exactly as a substring, and `partial_ratio` asks only whether the shorter string appears somewhere in the longer one. Both are documented behaviour and both are catastrophic in record matching: any short field will partial-match half your database, and any repeated token defeats the set scorer. **Choosing a scorer means choosing which false positives you will generate**, and `WRatio` — which picks the best of several — inherits every one of these failures while making it harder to know which fired." }] },

    { t: "h2", n: "04", text: "Why blocking is not optional", id: "blocking" },

    { t: "out", text:
"records        all pairs              at 10,000 pairs/sec\n1,000                499,500          50 seconds\n10,000            49,995,000          1.4 hours\n100,000        4,999,950,000          139 hours\n1,000,000    499,999,500,000          13,889 hours = 1.6 years" },

    { t: "callout", kind: "crit", title: "A million records is 5 × 10¹¹ pairs",
      body: [{ t: "p", text: "Pairwise comparison is `n(n−1)/2`, so ten times the records is a **hundred** times the work. At a million records that is nearly two years of continuous computation for one pass, and no amount of optimising the scorer changes the exponent. The only answer is to **not compare most pairs**: partition records into blocks and compare only within them. Blocking on the first letter alone cuts a million records from 5 × 10¹¹ pairs to about 1.9 × 10¹⁰ — a 26x reduction from one line of code, and real systems block on several keys and take the union." }] },

    { t: "table",
      head: ["Blocking key", "Strength", "What it misses"],
      rows: [
        ["Exact first letter", "Trivial, ~26x reduction", "A typo in the **first** character"],
        ["Sorted-token first letter", "Handles reordering", "Still misses a leading typo"],
        ["Phonetic (Soundex, Metaphone)", "Smith and Smyth block together", "Language-specific and noisy"],
        ["Character n-gram overlap", "Robust to typos anywhere", "More expensive to index"],
        ["Embedding ANN", "Semantic; handles abbreviations", "Needs a model, and is approximate"]
      ] },

    { t: "callout", kind: "crit", title: "A blocking key is a recall decision made before any scoring",
      body: [{ t: "p", text: "This is the most important idea in the module. **A pair that never lands in a common block can never be matched**, no matter how good your similarity function is. All the work in lessons 8.1 to 8.4 operates only on pairs that blocking has already selected, so the blocking key sets a hard ceiling on recall that no scorer can raise. It follows that blocking recall should be measured explicitly — take known duplicates and check what fraction share a block — and that you should use **several keys and union the candidates**, because each key's blind spot is different." }] },

    { t: "h2", n: "05", text: "The full pipeline", id: "pipeline" },

    { t: "diagram", kind: "flow", title: "Entity resolution, assembled", cols: 3,
      nodes: [
        { id: "n", text: "Normalise: lowercase, strip punctuation, expand suffixes", tone: "accent" },
        { id: "b", text: "Block on several keys, union the candidates", tone: "teal" },
        { id: "s", text: "Score each candidate pair with SEVERAL metrics", tone: "violet" },
        { id: "c", text: "Combine: weighted rule or trained classifier", tone: "violet" },
        { id: "t", text: "Threshold into match / review / reject", tone: "good" },
        { id: "g", text: "Cluster transitively into entities", tone: "good" }
      ],
      edges: [["n","b"],["b","s"],["s","c"],["c","t"],["t","g"]] },

    { t: "dl", items: [
      ["Normalise first", "Lessons 8.3 and 8.4 both found normalisation outperforming metric changes — punctuation cost 0.6667 of Jaccard, and legal suffixes inverted a TF-IDF ranking entirely."],
      ["Block on several keys", "Each key has a different blind spot; the union recovers pairs any single key would drop."],
      ["Score with several metrics", "Lesson 8.3 showed the families fail on disjoint cases — 0.8000 against 0.0000 on typos, 0.0909 against 0.3333 on reordering."],
      ["Three outcomes, not two", "Auto-match above a high threshold, reject below a low one, and route the band between to human review."],
      ["Cluster carefully", "If A matches B and B matches C, is A the same as C? Transitive closure merges aggressively and one bad link can collapse two large entities into one."]
    ] },

    { t: "callout", kind: "tradeoff", title: "The two errors are not equally expensive",
      body: [{ t: "p", text: "A **false negative** leaves a duplicate record: annoying, correctable later, and often invisible. A **false positive** merges two real people: it exposes one person's data to another, corrupts both histories, and is far harder to undo than to prevent — the merged record has no record of what it used to be unless you designed for that. So thresholds should be conservative, merges should be reversible by storing provenance on every link, and the review band exists precisely because the middle of the distribution is where both errors live. Report precision and recall separately, never accuracy, because the class imbalance is extreme and accuracy is entirely dominated by the non-matches." }] },

    { t: "h2", n: "06", text: "Choosing, in one table", id: "choosing" },

    { t: "table",
      head: ["Situation", "Use"],
      rows: [
        ["Single-token fields, typos and OCR", "Levenshtein or Damerau (8.1)"],
        ["Personal names", "Jaro-Winkler (8.2)"],
        ["Multi-token fields, order varies", "`token_sort_ratio`, or Jaccard (8.3)"],
        ["Typos *and* reordering together", "Character n-grams (8.3)"],
        ["Names with common boilerplate", "TF-IDF over n-grams, after stripping suffixes (8.4)"],
        ["No shared characters at all", "Alias table first; embeddings for the long tail (8.4)"],
        ["Anything at scale", "Block first, then any of the above (8.5)"]
      ] },

    { t: "exercise", title: "Build the system",
      tasks: [
        "Run all five scorers on 20 pairs from your data and find one where each is wrong.",
        "Compute all-pairs comparisons for your record count and decide whether blocking is optional.",
        "Take known duplicates and measure what fraction share a block under each candidate key.",
        "Combine three similarity scores into one decision and compare it against the best single score.",
        "Find a transitive chain in your data where A matches B and B matches C but A and C are different entities."
      ] }
  ],

  takeaways: [
    "RapidFuzz replaces FuzzyWuzzy: same API, C++ internals, 10-100x faster, MIT rather than GPL licensed.",
    "Each scorer fixes one failure and introduces another — choosing one is choosing which false positives you will generate.",
    "`token_sort_ratio` scores the reordered name pair at 95 where lesson 8.1's edit similarity gave 0.0909.",
    "`ratio` returned 61.5 where the reference says ~54 — RapidFuzz uses indel distance, FuzzyWuzzy used difflib, so thresholds do not transfer between libraries.",
    "`token_set_ratio('Smith', 'Smith Smith Smith')` = 100, because a set cannot see repetition.",
    "`partial_ratio('cat', 'category')` = 100, because any short string contained in a long one matches perfectly.",
    "A million records is 499,999,500,000 pairs — about 1.6 years at 10,000 comparisons per second.",
    "Blocking on the first letter alone gives a 26x reduction; real systems block on several keys and union.",
    "A blocking key is a recall decision made before any scoring — a pair not sharing a block can never be matched, whatever the scorer.",
    "False positives merge two real people and are much harder to undo than false negatives, so thresholds should be conservative with a human review band."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why does token_set_ratio('Smith', 'Smith Smith Smith') return 100?",
      options: ["A bug in RapidFuzz", "It compares shared token sets, and a set cannot represent repetition — both reduce to {smith}", "The strings are normalised to lowercase", "The threshold is applied incorrectly"],
      answer: 1,
      why: "It is documented behaviour and catastrophic for record matching, because any repeated token defeats the scorer. Similarly partial_ratio('cat','category') returns 100 because 'cat' is a substring. Choosing a scorer means choosing which false positives you accept, and WRatio inherits all of them while obscuring which fired." },
    { stem: "Why is blocking mandatory rather than an optimisation?",
      options: ["It improves accuracy", "All-pairs comparison is n(n−1)/2 — a million records is 5e11 pairs, about 1.6 years at 10,000 per second", "It reduces false positives", "Libraries require it"],
      answer: 1,
      why: "Ten times the records is a hundred times the work, and no scorer optimisation changes the exponent. The only answer is to not compare most pairs. Blocking on the first letter alone cuts a million records by roughly 26x, from one line of code." },
    { stem: "What does choosing a blocking key actually decide?",
      options: ["Computational cost only", "The ceiling on recall — a pair that never shares a block can never be matched regardless of the scorer", "Which similarity metric to use", "The threshold"],
      answer: 1,
      why: "All the scoring work operates only on pairs blocking has already selected. That makes the blocking key a recall decision taken before any similarity is computed, so blocking recall should be measured explicitly against known duplicates, and several keys should be used with their candidates unioned." },
    { stem: "Why should an entity-resolution system have three outcomes rather than two?",
      options: ["To improve throughput", "Because false positives merge two real people and are far harder to undo than false negatives, so the uncertain band belongs with a human", "To simplify the threshold", "To handle missing data"],
      answer: 1,
      why: "A false negative leaves a correctable duplicate. A false positive exposes one person's data to another and corrupts both histories, often irreversibly unless provenance was stored. Auto-match above a high threshold, reject below a low one, and review between — and report precision and recall separately, since accuracy is dominated by the non-matches." }
  ] },

  interview: { title: "Interview", sub: "Entity resolution", questions: [
    { level: "Core", q: "How would you deduplicate a million customer records?",
      strong: "Normalise, block on several keys, score with several metrics, threshold with a review band.",
      answer: [{ t: "p", text: "Five stages. Normalise first — lowercase, strip punctuation, standardise abbreviations and legal suffixes — because that's where most of the easy gain is. I measured 'Smith, John' scoring 0.3333 against 'John Smith' purely because of a trailing comma, and a TF-IDF matcher ranking a different company above an abbreviation of the same one purely because of shared boilerplate. Then block, which is mandatory rather than an optimisation: a million records is about 500 billion pairs, roughly 1.6 years at ten thousand comparisons per second. Blocking partitions records so you only compare within blocks, and I'd use several keys — a sorted-token prefix, a phonetic key so Smith and Smyth block together, character n-gram overlap — and union the candidates, because each key has a different blind spot. Then score each candidate pair with several metrics, not one, because the families fail on disjoint cases: on a typo pair edit distance gave 0.80 and word Jaccard gave 0.00, and on a reordered pair those flipped to 0.09 and 0.33. Then combine the scores, with a weighted rule or a trained classifier. Then threshold into three outcomes — auto-match, reject, and a review band for the middle — and finally cluster, carefully, because transitive closure can merge two large entities through one bad link." }] },
    { level: "Senior", q: "Which RapidFuzz scorer would you use?",
      strong: "Several — each fixes one failure and introduces another, and two return 100 on clear non-matches.",
      answer: [{ t: "p", text: "I'd use more than one, because each scorer fixes a specific failure by introducing a different one, and I can name the failures. `ratio` is plain edit similarity and collapses on any reordering. `token_sort_ratio` sorts the words first, which fixes that — it scored a reordered name pair at 95 where raw edit similarity gave 0.09 — but it's still character-sensitive within words. `token_set_ratio` compares shared tokens against leftovers so extra words barely hurt, and it returns 100 for 'Smith' against 'Smith Smith Smith', because a set cannot see repetition. `partial_ratio` matches a short string against any substring, and returns 100 for 'cat' against 'category', so any short field will partial-match half your database. `WRatio` tries several and takes the best, which means it inherits every one of those failures while making it harder to know which one fired — I'd avoid it when I need to explain a decision. So my approach is to compute three or four and combine them, either with weighted rules or by feeding them as features to a classifier trained on labelled pairs. One migration note: `ratio` gave me 61.5 where the reference documented around 54, because RapidFuzz uses indel distance while FuzzyWuzzy used difflib's algorithm. Thresholds don't transfer between the libraries — recalibrate after switching." }] },
    { level: "Senior", q: "How do you evaluate an entity-resolution system?",
      strong: "Precision and recall separately, and blocking recall separately from scoring.",
      answer: [{ t: "p", text: "Never on accuracy, because the class imbalance is extreme — the overwhelming majority of pairs are non-matches, so a system that matches nothing scores near-perfect accuracy. Precision and recall reported separately, and ideally the full precision-recall curve so the threshold choice is visible. The part people miss is measuring blocking recall separately from scoring. A pair that never lands in a common block can never be matched regardless of how good your similarity function is, so blocking sets a hard ceiling on recall that no scorer can raise. I'd take a labelled set of known duplicates and measure what fraction share a block under each candidate key — that number is your maximum achievable recall, and if it's 80% then a perfect scorer still gives you 80%. Teams routinely tune scorers while a weak blocking key caps them, which is the same shape of error as tuning a reader while a weak retriever caps a QA system. I'd also weight the evaluation by the asymmetric cost: a false negative leaves a duplicate record, correctable later, while a false positive merges two real people, exposes one person's data to another and corrupts both histories in a way that's often irreversible. So I'd report precision at high-recall operating points and separately the precision in the auto-merge band, since that's where errors are unrecoverable, and I'd make sure every merge stores provenance so it can be undone." }] }
  ] }
});

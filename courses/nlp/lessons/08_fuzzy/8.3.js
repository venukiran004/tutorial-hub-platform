/* ============================================================================
   LESSON 8.3 — Jaccard and Cosine Similarity
   Mirrors 04_Fuzzy_Matching.md · §4-5. Word Jaccard scores the typo pair at
   exactly 0.0000 where edit distance scored 0.8000 — each family fails
   precisely where the other succeeds (§04) (scratchpad/nlp/n83.py).
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

    { t: "math", tex: "J(A, B) = \\frac{|A \\cap B|}{|A \\cup B|}" },

    { t: "p", text: "Tokenise both strings into **sets** and divide the intersection by the union. Order disappears at the tokenisation step — a set has no order, so the metric cannot be sensitive to it." },

    { t: "out", text:
"word-level Jaccard\n\n  'John Smith' / 'Smith John'                       1.0000\n  'John Smith' / 'Smith, John'                      0.3333\n  'John Smith' / 'Jon Smyth'                        0.0000\n  'Acme Corp Ltd' / 'Ltd Acme Corp'                 1.0000\n  'red hot chili peppers' / 'chili peppers red hot' 1.0000" },

    { t: "callout", kind: "insight", title: "Reordering is now free — and typos are fatal",
      body: [{ t: "p", text: "Three reordered pairs score a perfect **1.0000**, which is exactly what edit distance could not do. But `\"John Smith\"` against `\"Jon Smyth\"` collapses to **0.0000** — not low, *zero*, because no token is shared. A single character changed inside each word makes the tokens entirely different objects, and a set method has no notion of partial token similarity. Note also `\"Smith, John\"` at only 0.3333: the comma attaches to the token, so `\"smith,\"` and `\"smith\"` are different members. Set methods are exquisitely sensitive to tokenisation, which is why punctuation stripping is not optional." }] },

    { t: "h2", n: "02", text: "The complementary failure", id: "complementary" },

    { t: "out", text:
"pair                            edit sim    word Jaccard\n'John Smith' / 'Jon Smyth'       0.8000       0.0000\n'John Smith' / 'Smith, John'     0.0909       0.3333" },

    { t: "callout", kind: "crit", title: "Each family's best case is the other's worst",
      body: [{ t: "p", text: "The typo pair: edit distance **0.8000**, Jaccard **0.0000**. The reordered pair: edit distance **0.0909**, Jaccard **0.3333**. There is no threshold on either metric that classifies both correctly, and no amount of tuning changes that, because the failures are structural. This is why production entity resolution computes **several scores per pair** and combines them — either with a weighted rule or with a trained classifier taking all the scores as features. Choosing one metric means choosing which kind of true match you will systematically miss." }] },

    { t: "h2", n: "03", text: "Character n-grams", id: "ngrams" },

    { t: "p", text: "The problem with word-level sets is that a token is atomic — change one character and it is a different token. Tokenise into overlapping **character n-grams** instead, and a single typo destroys only the few n-grams that span it." },

    { t: "out", text:
"'John Smith' as 3-grams:\n  {'joh', 'ohn', 'hn ', 'n s', ' sm', 'smi', 'mit', 'ith'}\n\nchanging 'John' to 'Jon' breaks only the n-grams containing the missing 'h'" },

    { t: "out", text:
"pair                                              word Jaccard   3-gram Jaccard\n'John Smith' / 'Smith John'                          1.0000          0.4545\n'John Smith' / 'Smith, John'                         0.3333          0.4167\n'John Smith' / 'Jon Smyth'                           0.0000          0.1538\n'Acme Corp Ltd' / 'Ltd Acme Corp'                    1.0000          0.5714\n'red hot chili peppers' / 'chili peppers red hot'    1.0000          0.7273" },

    { t: "callout", kind: "insight", title: "Both problems handled, neither perfectly",
      body: [{ t: "p", text: "The typo pair rises from **0.0000 to 0.1538** — no longer a total failure — while reordered pairs stay high at 0.4545 to 0.7273. That is why character n-grams are the workhorse of entity resolution: one representation that degrades gracefully under both kinds of error. Note the honest cost: reordered pairs fell from a perfect 1.0000 to around 0.5, because n-grams spanning word boundaries are destroyed by reordering. You have traded a perfect score on one failure mode for a usable score on both, and the absolute numbers are now lower across the board, so thresholds must be recalibrated." }] },

    { t: "p", text: "Choosing `n` is a real trade. `n = 2` is very tolerant and produces many collisions between unrelated strings; `n = 4` or `5` is discriminating but brittle to typos. **`n = 3` is the usual default** for names, and the right value depends on your field lengths — short fields need small `n` simply to produce enough n-grams to compare." },

    { t: "h2", n: "04", text: "Cosine similarity", id: "cosine" },

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

    { t: "exercise", title: "Measure both families",
      tasks: [
        "Compute word Jaccard and 3-gram Jaccard on 50 known-match pairs from your data and compare the distributions.",
        "Strip punctuation and lowercase, then re-measure. Record how much of the gain came from normalisation alone.",
        "Sweep n from 2 to 5 and find where typo tolerance and discrimination balance for your field lengths.",
        "Find a pair where word Jaccard and edit similarity disagree strongly, and decide which is right.",
        "Compare Jaccard and cosine on a pair where one string contains the other, and decide which behaviour you want."
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
      options: ["The strings are too short", "No token is shared — a changed character makes an entirely different set member, and sets have no notion of partial similarity", "Punctuation was not stripped", "The union is empty"],
      answer: 1,
      why: "'john' and 'jon' are different objects, as are 'smith' and 'smyth', so the intersection is empty. Edit distance scored the same pair 0.8000. The failure is structural: a set method cannot express that two tokens are nearly the same, which is exactly what character n-grams fix." },
    { stem: "What do character n-grams buy over word tokens?",
      options: ["Faster indexing", "Graceful degradation under both typos and reordering — the typo pair rose from 0.0000 to 0.1538 while reordered pairs stayed at 0.45 to 0.73", "Exact matching", "Language independence"],
      answer: 1,
      why: "A typo destroys only the few n-grams spanning it rather than a whole token. The cost is that reordered pairs fall from a perfect 1.0000 to around 0.5, because n-grams crossing word boundaries are lost, and every absolute score is lower — so thresholds must be recalibrated." },
    { stem: "'Smith, John' scores 0.3333 against 'John Smith' on word Jaccard. Why?",
      options: ["The word order differs", "The comma attaches to the token, so 'smith,' and 'smith' are different set members — a punctuation artefact", "Jaccard penalises two-token strings", "Case sensitivity"],
      answer: 1,
      why: "Order is irrelevant to Jaccard by construction, so it cannot be the cause. Stripping punctuation takes this pair to 1.0000 and costs nothing. Teams often reach for a more sophisticated metric when the real problem is trailing commas — normalise and re-measure first." },
    { stem: "When would you prefer cosine over Jaccard?",
      options: ["Always, it is more principled", "When token counts or weights matter and length normalisation is desirable — query-document matching rather than record linkage", "On short fields", "When order matters"],
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

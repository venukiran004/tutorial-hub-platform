/* ============================================================================
   LESSON 8.4 — TF-IDF for Matching
   Mirrors 04_Fuzzy_Matching.md · §6. TF-IDF over character n-grams ranks
   "Beta Corporation Limited" ABOVE "Acme Corp Ltd" when matching "Acme
   Corporation Limited" — exactly backwards (§04) (scratchpad/nlp/n83.py).
   ========================================================================= */
EC.receiveLesson({
  id: "8.4",

  lede: "**Matching \"Acme Corporation Limited\" against a corpus of company names, TF-IDF ranked \"Beta Corporation Limited\" at 0.6615 and \"Acme Corp Ltd\" at 0.4017.** A different company scored higher than an abbreviation of the same one. The shared boilerplate — *Corporation Limited* — outweighed the only token that identifies the business. This lesson covers why TF-IDF is the right instinct for matching, and why this particular failure happens anyway.",

  objectives: [
    "Apply idf weighting to matching and explain what it corrects",
    "Compute idf values and relate them to document frequency",
    "Reproduce a failure where shared boilerplate dominates the identifying token",
    "Explain why character n-grams and word tokens behave differently here",
    "Design a matching pipeline that handles corporate suffixes"
  ],

  prerequisites: ["8.3", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "Why weight tokens at all", id: "why" },

    { t: "p", text: "Jaccard and plain cosine treat every token as equally informative. In real record data that is badly wrong: *Limited*, *Corporation*, *Street*, *Road* appear everywhere and tell you almost nothing, while *Acme* or an unusual surname is nearly decisive. TF-IDF is the standard correction — down-weight tokens that appear in many records, up-weight the rare ones." },

    { t: "math", tex: "\\text{tfidf}(t, d) = \\text{tf}(t, d) \\cdot \\log\\!\\frac{N}{\\text{df}(t)}" },

    { t: "out", text:
"idf over a 7-name corpus of company names\n\n  token          idf\n  limited       1.1335      appears in almost every name\n  corporation   1.4700\n  acme          1.6931\n  beta          2.3863      appears in one name only\n  delta         2.3863\n  gamma         2.3863\n  holdings      2.3863\n  industries    2.3863\n  ltd           2.3863" },

    { t: "callout", kind: "insight", title: "idf encodes exactly the right prior for matching",
      body: [{ t: "p", text: "*limited* gets **1.1335** and *beta* gets **2.3863** — more than twice the weight. That is precisely the intuition you want: two records sharing *Limited* is almost no evidence, and two records sharing *Beta* is strong evidence. It is the same mechanism lesson 1.4 measured on TF-IDF for retrieval, and lesson 3.2 saw in PMI collocations — a contrastive statistic separates what a text is *about* from how much ordinary language it contains. For record matching it is the difference between matching on the company and matching on the legal suffix." }] },

    { t: "h2", n: "02", text: "Matching in practice", id: "practice" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n83.py — TF-IDF over character n-grams", code:
"from sklearn.feature_extraction.text import TfidfVectorizer\nfrom sklearn.metrics.pairwise import cosine_similarity\n\nv = TfidfVectorizer(analyzer=\"char_wb\", ngram_range=(3, 3))\nX = v.fit_transform(corpus)\nS = cosine_similarity(X)",
      caption: "`char_wb` builds character n-grams **within word boundaries**, so n-grams never span two words — it combines n-gram typo tolerance with word structure." },

    { t: "out", text:
"similarity of 'Acme Corporation Limited' to each name\n\n  Acme Corporation Limited        1.0000\n  Beta Corporation Limited        0.6615\n  Delta Corporation Limited       0.6281\n  Epsilon Corporation Limited     0.6029\n  Acme Corp Ltd                   0.4017\n  Acme Holdings Limited           0.3853\n  Gamma Industries Limited        0.1416" },

    { t: "callout", kind: "crit", title: "Three different companies rank above the same company abbreviated",
      body: [{ t: "p", text: "*Beta*, *Delta* and *Epsilon Corporation Limited* all score above **0.60**, while *Acme Corp Ltd* — almost certainly the same business — scores **0.4017**. The ranking is exactly backwards for entity resolution. The cause is that *Corporation Limited* is 20 of the 24 characters, so the n-grams it contributes dominate the vector even after idf weighting, while *Acme Corp Ltd* shares only the *Acme* n-grams and abbreviates everything else. **idf down-weights common tokens; it does not down-weight them to zero**, and when the boilerplate is most of the string, what remains is still enough to swamp the signal." }] },

    { t: "callout", kind: "insight", title: "Note that 'Gamma Industries Limited' scores lowest",
      body: [{ t: "p", text: "At **0.1416** it is correctly ranked last — it shares only *Limited*, whereas the others share *Corporation Limited* too. So the method is working as designed; it is ordering by shared surface content, and shared surface content simply is not the same thing as being the same entity when names contain long shared suffixes. Recognising that the metric is doing its job correctly while producing the wrong answer is the important part — it tells you to fix the **input**, not the metric." }] },

    { t: "h2", n: "03", text: "The fix is normalisation, not a better metric", id: "fix" },

    { t: "dl", items: [
      ["Strip legal suffixes", "Remove or standardise *Ltd*, *Limited*, *Inc*, *LLC*, *plc*, *GmbH*, *Corporation*, *Co*. This single step turns the example above into *Acme* against *Beta*, which ranks correctly and trivially."],
      ["Standardise abbreviations", "Map *Corp* to *Corporation*, *St* to *Street*. Otherwise *Acme Corp Ltd* and *Acme Corporation Limited* share far fewer n-grams than they should."],
      ["Weight fields separately", "Compare the company name and the legal form as **separate fields** with separate thresholds, rather than concatenating them into one string."],
      ["Fit idf on your corpus", "idf computed on a generic corpus will not know that *Limited* is ubiquitous in yours. Fit the vectoriser on the actual data you will match against."]
    ] },

    { t: "callout", kind: "tradeoff", title: "Domain normalisation beats metric sophistication",
      body: [{ t: "p", text: "This is the same conclusion lesson 8.3 reached about punctuation, and it generalises. A twenty-line list of legal-suffix substitutions will improve a company-matching system more than switching from Jaccard to TF-IDF to embeddings ever will, because it removes the confounding signal rather than trying to weight around it. The suffix list is domain knowledge that no general-purpose metric contains and no amount of training data will reliably infer — and it is cheap to write, easy to inspect, and easy to correct when wrong." }] },

    { t: "h2", n: "04", text: "Why TF-IDF is still the right default", id: "default" },

    { t: "table",
      head: ["Property", "Why it matters for matching"],
      rows: [
        ["Down-weights common tokens", "Legal suffixes, street types and honorifics stop dominating"],
        ["Works on character n-grams", "Combines idf weighting with typo tolerance from lesson 8.3"],
        ["Produces sparse vectors", "Inverted indexes make candidate retrieval sublinear"],
        ["Deterministic and inspectable", "You can print the idf of any token and explain a score"],
        ["No training required", "Fit on the corpus you are matching; no labels needed"]
      ] },

    { t: "callout", kind: "insight", title: "Sparsity is what makes it scale",
      body: [{ t: "p", text: "TF-IDF vectors are sparse, so you can build an inverted index from token to records and retrieve only records sharing at least one token — usually at least one *rare* token. That turns the quadratic all-pairs problem lesson 8.5 costs at 5 × 10¹¹ comparisons into a sublinear lookup, and it is why TF-IDF remains the backbone of large-scale entity resolution despite dense embeddings being available. A dense embedding needs an approximate nearest-neighbour index and gives up exactness; a sparse index is exact and explains itself." }] },

    { t: "h2", n: "05", text: "When to reach for embeddings instead", id: "embeddings" },

    { t: "diagram", kind: "compare", title: "Surface matching against semantic matching",
      columns: [
        { title: "TF-IDF n-grams", tone: "good", items: [
          "Catches typos and abbreviations sharing characters",
          "Deterministic, inspectable, explainable",
          "Sparse index, exact retrieval",
          "No training, no labels",
          "Blind to synonyms with no shared characters"
        ] },
        { title: "Embeddings", tone: "violet", items: [
          "Catches 'IBM' and 'International Business Machines'",
          "Handles translation and transliteration",
          "Needs an ANN index, approximate",
          "Needs a model, ideally domain-tuned",
          "Hard to explain a particular score"
        ] }
      ] },

    { t: "p", text: "The dividing question is whether your true matches **share characters**. Typos, abbreviations and reorderings do, and TF-IDF over n-grams handles them. *IBM* and *International Business Machines* do not, and no surface method will ever connect them — that needs either an embedding or, more reliably, an alias table. In practice a lookup table of known aliases outperforms an embedding for the specific entities you care about, and the embedding is for the long tail." },

    { t: "exercise", title: "Build a matcher",
      tasks: [
        "Fit a TF-IDF vectoriser on your own records and print the ten lowest-idf tokens. Consider whether each should be stripped.",
        "Reproduce the boilerplate failure, then strip legal suffixes and re-measure the same pairs.",
        "Compare `char_wb` against `char` n-grams and note which handles multi-word names better.",
        "Build an inverted index over rare tokens and measure how many candidates it retrieves per query.",
        "Find a true match in your data that shares no characters, and decide whether an alias table or an embedding is the right fix."
      ] }
  ],

  takeaways: [
    "TF-IDF down-weights tokens appearing in many records, which is exactly the right prior for matching — sharing 'Limited' is no evidence, sharing 'Beta' is strong evidence.",
    "Measured idf: 'limited' 1.1335 against 'beta' 2.3863, more than twice the weight.",
    "But matching 'Acme Corporation Limited', TF-IDF ranked 'Beta Corporation Limited' at 0.6615 above 'Acme Corp Ltd' at 0.4017.",
    "The cause is that 'Corporation Limited' is 20 of 24 characters — idf reduces common tokens' weight but does not eliminate it.",
    "'Gamma Industries Limited' correctly ranked last at 0.1416, so the metric is working as designed while producing the wrong answer.",
    "That distinction matters: it tells you to fix the input, not the metric.",
    "Stripping legal suffixes turns the failing example into 'Acme' against 'Beta', which ranks correctly and trivially.",
    "`char_wb` builds n-grams within word boundaries, combining typo tolerance with word structure.",
    "Sparsity is what makes TF-IDF scale — an inverted index on rare tokens turns the quadratic all-pairs problem into a sublinear lookup.",
    "Surface methods cannot connect 'IBM' to 'International Business Machines'; that needs an alias table or an embedding."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why did 'Beta Corporation Limited' outrank 'Acme Corp Ltd' when matching 'Acme Corporation Limited'?",
      options: ["A bug in the vectoriser", "'Corporation Limited' is 20 of 24 characters, so its n-grams dominate the vector even after idf weighting", "Beta is alphabetically closer", "The idf was computed on the wrong corpus"],
      answer: 1,
      why: "idf down-weights common tokens; it does not reduce them to zero. When the shared boilerplate is most of the string, what remains still swamps the single identifying token — while 'Acme Corp Ltd' shares only the 'Acme' n-grams and abbreviates everything else. The metric is working correctly and giving the wrong answer." },
    { stem: "'Gamma Industries Limited' ranked lowest at 0.1416. What does that tell you?",
      options: ["The metric is broken", "The metric is working as designed — it orders by shared surface content, which is simply not the same as being the same entity", "Gamma is an outlier", "Industries has a high idf"],
      answer: 1,
      why: "It shares only 'Limited' where the others share 'Corporation Limited' too, so ranking it last is correct behaviour. Recognising that a metric can be functioning exactly as specified while producing a useless answer is what tells you to fix the input rather than swap the metric." },
    { stem: "What is the highest-return fix for the boilerplate problem?",
      options: ["Switch to embeddings", "Strip or standardise legal suffixes before matching, which turns the comparison into 'Acme' against 'Beta'", "Increase the n-gram size", "Use a higher threshold"],
      answer: 1,
      why: "A twenty-line substitution list removes the confounding signal rather than trying to weight around it, and it encodes domain knowledge no general metric contains. It is the same conclusion lesson 8.3 reached about punctuation: cheap normalisation beats metric sophistication, and it is inspectable and correctable." },
    { stem: "Why does TF-IDF remain the backbone of large-scale entity resolution?",
      options: ["It is more accurate than embeddings", "Its vectors are sparse, so an inverted index on rare tokens makes candidate retrieval sublinear and exact", "It requires no normalisation", "It handles synonyms"],
      answer: 1,
      why: "Comparing a million records pairwise is about 5e11 comparisons. A sparse index retrieves only records sharing a rare token, which is exact and explains itself, where a dense embedding needs an approximate nearest-neighbour index and gives up exactness. It also needs no training and no labels." }
  ] },

  interview: { title: "Interview", sub: "Weighted matching", questions: [
    { level: "Core", q: "Why use TF-IDF for record matching rather than plain Jaccard?",
      strong: "Because tokens are not equally informative — sharing 'Limited' is nearly no evidence.",
      answer: [{ t: "p", text: "Because Jaccard treats every token as equally informative and in real record data that's badly wrong. Legal suffixes like Limited and Inc, street types like Road and Street, honorifics — these appear in a large fraction of records and carry almost no identifying information, while an unusual company name or surname is nearly decisive. TF-IDF encodes exactly that: down-weight tokens appearing in many records, up-weight rare ones. I measured it on a small corpus of company names and 'limited' came out at idf 1.1335 while 'beta' got 2.3863, more than twice the weight. It's the same contrastive-statistic idea as idf in retrieval or PMI in collocation finding — separating what a record is about from how much boilerplate it contains. The other practical reason is scale. TF-IDF vectors are sparse, so you can build an inverted index from token to records and retrieve only candidates sharing a rare token. That turns an all-pairs problem — about 5 times 10 to the 11 comparisons for a million records — into a sublinear lookup that's exact and explainable, which is why it's still the backbone of large-scale entity resolution even with dense embeddings available." }] },
    { level: "Senior", q: "Your company-name matcher ranks different companies above abbreviations of the same one. What is happening?",
      strong: "Shared boilerplate dominates; the fix is normalisation, not a better metric.",
      answer: [{ t: "p", text: "The shared boilerplate is outweighing the identifying token. I reproduced this exactly: matching 'Acme Corporation Limited', TF-IDF over character n-grams ranked 'Beta Corporation Limited' at 0.6615 and 'Acme Corp Ltd' at 0.4017 — a different company above an abbreviation of the same one. The cause is that 'Corporation Limited' is 20 of the 24 characters, so its n-grams dominate the vector, and idf reduces common tokens' weight without eliminating it. Meanwhile 'Acme Corp Ltd' shares only the 'Acme' n-grams and abbreviates everything else, so it has less surface overlap despite being the same business. The important diagnostic point is that the metric was working exactly as specified — it ordered by shared surface content, and 'Gamma Industries Limited', which shares only 'Limited', correctly ranked last. A metric functioning correctly while producing the wrong answer tells you to fix the input, not swap the metric. So: strip or standardise legal suffixes before matching, which turns this comparison into 'Acme' against 'Beta' and makes it trivial. Map abbreviations — Corp to Corporation, St to Street. And ideally compare the name and the legal form as separate fields with separate thresholds rather than concatenating them. Twenty lines of substitution rules will beat any metric upgrade here." }] },
    { level: "Senior", q: "When would you use embeddings instead of TF-IDF for matching?",
      strong: "Only when true matches share no characters — and prefer an alias table where you can.",
      answer: [{ t: "p", text: "The dividing question is whether your true matches share characters at the surface. Typos, abbreviations, reorderings and punctuation differences all do, and TF-IDF over character n-grams handles them while staying deterministic, inspectable and exactly indexable. So for the bulk of record matching I'd stay there. Embeddings earn their place where there's no surface overlap at all: 'IBM' and 'International Business Machines', or a company name transliterated between scripts, or a product described in two different vocabularies. No surface method will ever connect those, because there's nothing to connect. But I'd reach for an alias table first for the entities I actually care about, because a curated lookup outperforms an embedding on exactly the cases that matter and it's auditable — when it's wrong you can see why and fix that row. The embedding is for the long tail you can't enumerate. And I'd be clear about what embeddings cost: you need an ANN index, so retrieval becomes approximate; you need a model, ideally domain-tuned, since general sentence encoders are mediocre on entity names; and when a particular pair scores oddly you can't explain it, which matters a great deal if merging two records has legal or privacy consequences. In practice the strongest systems use TF-IDF for candidate generation and add embedding similarity as one feature among several in the scoring model." }] }
  ] }
});

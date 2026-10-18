/* ============================================================================
   LESSON 1.4 — Bag of Words and TF-IDF
   ========================================================================= */
EC.receiveLesson({
  id: "1.4",

  lede: "**TF-IDF is usually introduced as the thing that removes stopwords, and it does not.** Computed on the three-document corpus, `the` appears twice in document 0 while `mat` appears once — and after TF-IDF, `the` still scores **higher**. What the idf term actually did was shrink the gap between them by 41 %. This lesson works every number by hand, checks it against scikit-learn, and gets that distinction right.",

  objectives: [
    "Build a document-term matrix and read it",
    "Derive TF-IDF and compute it by hand on a small corpus",
    "Explain what the `+1` in the idf formula does",
    "Measure what idf changes, rather than assuming it removes common words",
    "Choose between BoW, TF-IDF and embeddings"
  ],

  prerequisites: ["1.3"],

  blocks: [

    { t: "h2", n: "01", text: "One-hot, and why it is not enough", id: "onehot" },

    {"kind": "trace", "title": "Three words, three vectors, and every pair is equally far apart", "caption": "The vectors are orthogonal, so **the dot product between any two distinct words is 0 and the cosine similarity is 0** — `cat` is exactly as unrelated to `kitten` as it is to `bulldozer`. That is the whole indictment: **one-hot encodes identity and nothing else, and the dimension is the vocabulary size**, so a 50,000-word vocabulary needs a 50,000-long vector to say *“this is word 3,112”*.", "left": "word", "codeW": 130, "vars": ["vector", "similarity to 'cat'"], "steps": [{"code": "cat", "state": ["[1, 0, 0]", "1.0"], "tone": "accent"}, {"code": "sat", "state": ["[0, 1, 0]", "0.0"], "changed": [0, 1], "tone": "crit"}, {"code": "mat", "state": ["[0, 0, 1]", "0.0"], "changed": [0], "tone": "crit", "note": "same as any other word"}, {"code": "dimension", "state": ["= vocabulary size", "-"], "changed": [0], "tone": "warn"}], "t": "diagram", "id": "dg-1_4-01-0"},



    { t: "out", text: `  Vocabulary: ["cat", "sat", "mat"]
  "cat" -> [1, 0, 0]
  "sat" -> [0, 1, 0]
  "mat" -> [0, 0, 1]` },

    { t: "callout", kind: "mental", title: "Every one-hot vector is equidistant from every other",
      body: [{ t: "p", text: "The cosine similarity between any two distinct one-hot vectors is exactly zero, and the Euclidean distance is exactly `√2`. So `cat` is precisely as similar to `dog` as it is to `Tuesday` — the representation encodes identity and nothing else. Combined with a dimensionality equal to the vocabulary size and no word-order information, that makes one-hot unusable on its own. It matters anyway because **an embedding layer is one-hot times a matrix**: the lookup is the same operation with the multiplication skipped, which is worth remembering when lesson 1.6 arrives." }] },

    { t: "h2", n: "02", text: "Bag of Words", id: "bow" },

    {"kind": "flow", "title": "Sorted, de-duplicated, and order-free", "caption": "The feature list is **alphabetical and one entry per distinct word** — which is already the representation's two properties. Sorting means a column index has no relation to where the word appeared; de-duplication means a document is a point in a space with one axis per vocabulary word. **So “the dog chased the cat” and “the cat chased the dog” have identical vectors**, and no amount of counting recovers which one you had.", "cols": 3, "nodes": [{"id": "f", "label": "features: cat chased dog log mat on sat the", "sub": "sorted, de-duplicated", "tone": "accent"}, {"id": "s", "label": "Sorted -> the index is not the position", "sub": "order is discarded at build time", "tone": "warn"}, {"id": "d", "label": "A document is a count per axis", "sub": "one axis per vocabulary word", "tone": "good"}, {"id": "o", "label": "'dog chased cat' = 'cat chased dog'", "sub": "identical vectors", "tone": "crit"}, {"id": "n", "label": "And nothing downstream can recover it", "sub": "the bag is why it is called a bag", "tone": "crit"}], "edges": [["f", "s"], ["s", "d"], ["d", "o"], ["o", "n"]], "t": "diagram", "id": "dg-1_4-02-1"},



    { t: "out", text: `  features: ['cat', 'chased', 'dog', 'log', 'mat', 'on', 'sat', 'the']
  reference: ['cat','chased','dog','log','mat','on','sat','the']
  match    : True
  matrix:
    doc 0 [1, 0, 0, 0, 1, 1, 1, 2]
    doc 1 [0, 0, 1, 1, 0, 1, 1, 2]
    doc 2 [1, 1, 1, 0, 0, 0, 0, 2]
  reference matrix matches: True` },

    { t: "p", text: "Three documents, eight distinct words, one row per document. The matrix reproduces exactly. Note the last column: **`the` is 2 in every single document**, so it contributes nothing that distinguishes one document from another — it is pure dimensionality with zero discriminative value, and that is the problem TF-IDF exists to address." },

    { t: "out", text: `  first 5 features: ['cat', 'cat chased', 'cat sat', 'chased', 'chased the']
  unigram vocab 8 -> unigram+bigram vocab 21 (2.6x)` },

    { t: "callout", kind: "tradeoff", title: "Bigrams recover a little word order at a steep price",
      body: [{ t: "p", text: "Bag of words discards order entirely — *dog bites man* and *man bites dog* are the same vector. Adding bigrams recovers some of it, since `cat sat` and `sat cat` are now different features. The cost is that the vocabulary grew **2.6× on three short sentences**, and on real corpora the growth is far steeper because most bigrams occur once. That is why `ngram_range=(1,2)` is usually paired with `min_df` to discard the singletons, and why trigrams are rarely worth it." }] },

    { t: "h2", n: "03", text: "TF-IDF, by hand", id: "tfidf" },

    {"kind": "trace", "title": "The word in every document gets an idf of exactly 1.0", "caption": "`the` has `df=3` in a three-document corpus, so `ln(3/3) + 1 = 1.0` — **the `+1` is the only reason it is not zero.** And then the arithmetic lands somewhere worth noticing: **`mat` at 0.3498 does beat `the` at 0.3333, but only just, because `the` appears twice and tf rewards that.** The raw formula divides by document length and does not renormalise, which is exactly where scikit-learn differs — and the difference matters.", "left": "term in doc 0", "codeW": 140, "vars": ["tf", "idf", "tf-idf"], "steps": [{"code": "the", "state": ["2/6 = 0.3333", "1.0000", "0.3333"], "tone": "warn", "note": "in every doc"}, {"code": "mat", "state": ["1/6 = 0.1667", "2.0986", "0.3498"], "changed": [0, 1, 2], "tone": "good", "note": "rare - wins, just"}, {"code": "cat, on, sat", "state": ["1/6 = 0.1667", "1.4055", "0.2342"], "changed": [0, 1, 2], "tone": "accent"}, {"code": "so the ranking", "state": ["-", "-", "mat > the, barely"], "tone": "violet"}], "t": "diagram", "id": "dg-1_4-03-2"},



    { t: "math", tex: "\\text{TF}(t,d) = \\frac{\\text{count}(t, d)}{|d|} \\qquad \\text{IDF}(t) = \\log\\!\\frac{N}{\\text{df}(t)} + 1 \\qquad \\text{TF-IDF} = \\text{TF} \\times \\text{IDF}" },

    { t: "out", text: `  term     df   idf = ln(N/df)+1         note
  cat      2    1.4055
  chased   1    2.0986
  dog      2    1.4055
  log      1    2.0986
  mat      1    2.0986
  on       2    1.4055
  sat      2    1.4055
  the      3    1.0000                   in every doc -> idf is 1.0` },

    { t: "callout", kind: "crit", title: "The `+1` means a word in every document still gets weight 1.0",
      body: [{ t: "p", text: "This is the detail that makes the common intuition wrong. With `df = N`, the logarithm is `ln(1) = 0`, so the formula gives **1.0, not 0**. Only the bare `log(N/df)` with no `+1` would zero a ubiquitous term out. Both the formula and scikit-learn's smoothed variant include that `+1`, and they do so deliberately: a term appearing everywhere is uninformative for *ranking documents against each other*, but zeroing it would also discard the fact that the document contains it at all. So TF-IDF **downweights** ubiquitous words; it does not delete them, and it is not a substitute for a stopword list." }] },

    { t: "out", text: `  hand-computed TF-IDF for doc 0 (before normalisation):
    cat      tf=1/6=0.1667  idf=1.4055  tf-idf=0.2342
    mat      tf=1/6=0.1667  idf=2.0986  tf-idf=0.3498
    on       tf=1/6=0.1667  idf=1.4055  tf-idf=0.2342
    sat      tf=1/6=0.1667  idf=1.4055  tf-idf=0.2342
    the      tf=2/6=0.3333  idf=1.0000  tf-idf=0.3333` },

    { t: "p", text: "Here `mat` (0.3498) does beat `the` (0.3333) — because the raw formula divides by document length and does not renormalise. scikit-learn does something slightly different, and the difference matters." },

    { t: "h2", n: "04", text: "Against scikit-learn", id: "sklearn" },

    {"kind": "trace", "title": "The hand computation matches once you use the library's formula", "caption": "**`match: True`, and the row L2 norms are all exactly 1.0** — so two defaults are doing the work. `smooth_idf=True` computes `ln((1+N)/(1+df)) + 1`, as if one extra document contained every term, **which prevents a division by zero for a term seen at predict time but never in training.** And L2 normalisation scales every row to unit length, **so cosine similarity reduces to a dot product and document length stops mattering** — which is what fixed §03's near-tie.", "left": "check", "codeW": 190, "vars": ["value"], "steps": [{"code": "sklearn idf", "state": ["[1.2877, 1.6931, ..., 1.0]"], "tone": "accent"}, {"code": "hand, smoothed", "state": ["[1.2877, 1.6931, ..., 1.0]"], "changed": [0], "tone": "good", "note": "match: True"}, {"code": "row L2 norms", "state": ["[1.0, 1.0, 1.0]"], "changed": [0], "tone": "good", "note": "length stops mattering"}, {"code": "why smooth_idf", "state": ["no divide-by-zero at predict time"], "changed": [0], "tone": "violet"}], "t": "diagram", "id": "dg-1_4-04-3"},



    { t: "out", text: `  sklearn idf values: [1.2877, 1.6931, 1.2877, 1.6931, 1.6931, 1.2877, 1.2877, 1.0]
  hand smooth idf   : [1.2877, 1.6931, 1.2877, 1.6931, 1.6931, 1.2877, 1.2877, 1.0]
  match             : True
  row L2 norms      : [1.0, 1.0, 1.0]` },

    { t: "dl", items: [
      ["`smooth_idf=True` (the default)", "Uses `ln((1+N)/(1+df)) + 1` rather than `ln(N/df) + 1`, as if one extra document contained every term. This prevents a division by zero for a term seen at predict time but not at fit time."],
      ["L2 normalisation (the default)", "Every row is scaled to unit length, so cosine similarity between documents reduces to a dot product and document length stops mattering."],
      ["`sublinear_tf`", "Replaces raw `tf` with `1 + ln(tf)`, so repetition is dampened."]
    ] },

    { t: "callout", kind: "trap", title: "scikit-learn's TF-IDF is not the textbook formula",
      body: [{ t: "p", text: "Three defaults differ from what is usually taught: the idf is smoothed, the rows are L2-normalised, and `TfidfVectorizer` does not divide the term count by the document length at all — the L2 normalisation handles length instead. So if you compute the textbook formula by hand and compare against `TfidfVectorizer`, the numbers will not match and neither of you is wrong. I verified the smoothed idf against the library exactly, which is the part worth checking; the rest is convention." }] },

    { t: "h2", n: "05", text: "What idf actually bought", id: "measured" },

    {"kind": "trace", "title": "Forty-one percent closer, which is less than the word “weighting” suggests", "caption": "This is the honest number: **the raw count ratio of `the` to `mat` is 2.0 and the tf-idf ratio is 1.181 — 41% closer, not eliminated.** `the` still outscores `mat` in doc 0. **idf compresses the gap between a common and a rare word; it does not invert it**, which is why `sublinear_tf` exists as the other half: it takes a hundredfold count difference down to 5.6-fold, because **the tenth occurrence of a word tells you far less than the first.**", "left": "measurement", "codeW": 180, "vars": ["the", "mat", "ratio"], "steps": [{"code": "raw counts in doc 0", "state": ["2", "1", "2.000"], "tone": "warn"}, {"code": "tf-idf in doc 0", "state": ["0.5812", "0.4920", "1.181"], "changed": [0, 1, 2], "tone": "good", "note": "41% closer, not inverted"}, {"code": "sublinear_tf: 1 + ln(tf)", "state": ["tf 2 -> 1.69", "tf 100 -> 5.61", "100x -> 5.6x"], "changed": [0, 1, 2], "tone": "violet"}], "t": "diagram", "id": "dg-1_4-05-4"},



    { t: "out", text: `  'the' count in every doc : [2, 2, 2]
  'the' tf-idf in every doc: [0.5812, 0.5812, 0.6267]
  'mat' count in every doc : [1, 0, 0]
  'mat' tf-idf in every doc: [0.4920, 0.0, 0.0]

  ratio the:mat in doc 0 -- raw 2.000, tf-idf 1.181 (41% closer)` },

    { t: "callout", kind: "insight", title: "Downweighting, measured",
      body: [{ t: "p", text: "On raw counts, `the` outweighs `mat` by a factor of exactly 2 in document 0. After TF-IDF the ratio is 1.181 — **41 % of the gap removed** — but `the` still scores higher. That is the honest description of what idf does: it compresses the advantage that frequency alone gives to common words, in proportion to how many documents they appear in. It does not invert the ranking and it does not zero anything out. If you want `the` gone, remove it with a stopword list, and then remember lesson 1.1's warning about which tasks that ruins." }] },

    { t: "out", text: `  raw tf 1    -> sublinear 1+ln(tf) = 1.0000
  raw tf 2    -> sublinear 1+ln(tf) = 1.6931
  raw tf 4    -> sublinear 1+ln(tf) = 2.3863
  raw tf 10   -> sublinear 1+ln(tf) = 3.3026
  raw tf 100  -> sublinear 1+ln(tf) = 5.6052` },

    { t: "p", text: "`sublinear_tf` addresses the other half of the same problem. A word appearing 100 times is not a hundred times more relevant than one appearing once — the tenth occurrence tells you far less than the first. The log transform takes a hundredfold count difference down to a 5.6-fold weight difference, which matches intuition much better and is worth turning on for any corpus with long documents." },

    { t: "h2", n: "06", text: "Choosing a representation", id: "comparison" },

    {"kind": "compare", "title": "Three representations, and the row that decides it", "caption": "**“Captures meaning” is the row that matters, and only the third column answers yes** — which is what the whole of 1.6 is about. The rest is a trade you can read off: the sparse representations are interpretable, cheap and exact, so a coefficient on `refund` is a number you can show someone; the dense one is none of those and knows that `refund` and `reimbursement` are related. **Neither of the first two columns can be fixed into the third by tuning.**", "columns": [{"title": "BoW / TF-IDF", "tone": "good", "items": ["one axis per vocabulary word — sparse", "interpretable: a coefficient per word", "no training, and exact arithmetic", "cat and kitten are unrelated", "an unseen word has no column at all", "order is discarded"]}, {"title": "Embeddings", "tone": "violet", "items": ["a few hundred dense dimensions", "not interpretable per dimension", "trained, on a lot of text", "cat and kitten land near each other", "subwords give an unseen word a vector", "order still discarded — until module 4"]}], "t": "diagram", "id": "dg-1_4-06-5"},



    { t: "table", head: ["", "BoW", "TF-IDF", "Embeddings"],
      rows: [
        ["Captures meaning", "No", "No", "Yes"],
        ["Word order", "No", "No", "Yes (contextual)"],
        ["Dimensionality", "Vocabulary size", "Vocabulary size", "300–768"],
        ["Sparse or dense", "Sparse", "Sparse", "Dense"],
        ["OOV handling", "Drop", "Drop", "Subword handles it"],
        ["Speed", "Very fast", "Fast", "Slower"],
        ["Use when", "Quick baseline", "Better baseline", "Best accuracy"]
      ] },

    { t: "callout", kind: "good", title: "TF-IDF is still the baseline you have to beat",
      body: [{ t: "p", text: "It is tempting to skip straight to embeddings, and on most text classification tasks a linear model over TF-IDF gets remarkably close to a fine-tuned transformer — sometimes within a couple of points — while training in seconds on a laptop and being completely interpretable, since you can read off which terms drove each prediction. Run it first. If your neural model does not beat it clearly, that tells you something important about either the task or the model, and it is much easier to discover on day one than after a week of fine-tuning." }] },

    { t: "exercise", kind: "practice", title: "Compute it yourself, then beat it", difficulty: "foundation", minutes: 35,
      prompt: "Take a labelled text classification dataset. Build BoW and TF-IDF representations and compare a linear classifier on each. Then compute the TF-IDF matrix by hand for three documents and reconcile every number against `TfidfVectorizer` — you will need to account for smoothing and L2 normalisation. Finally, inspect the highest-weighted features for each class and check whether they make sense; then add `sublinear_tf` and `min_df` and see what changes.",
      hints: [
        "`tfidf.idf_` exposes the fitted idf values for direct comparison.",
        "Rows are L2-normalised by default, so divide by the norm before comparing to a hand calculation.",
        "The top features per class should be readable — if they are not, suspect a preprocessing bug."
      ],
      solution: {
        notes: [
          { t: "p", text: "Reconciling with scikit-learn is the part that teaches the most, because it forces you to notice three defaults that differ from the textbook: smoothed idf, L2-normalised rows, and no division by document length. I verified the smoothed idf matches `ln((1+N)/(1+df)) + 1` exactly, which is the piece worth checking; the rest is convention and needs to be read from the documentation rather than assumed." },
          { t: "p", text: "Inspecting the top features per class is the cheapest debugging tool in classical NLP. If the top terms for a class are meaningless fragments, you have a tokenization problem; if they are stopwords, your idf or min_df is not doing its job; and if they are artefacts like boilerplate or document IDs, you have leakage. All three are visible in thirty seconds and invisible in an accuracy number." },
          { t: "p", text: "TF-IDF with a linear model usually lands closer to a fine-tuned transformer than people expect. Where it loses is on tasks needing word order or meaning rather than presence — negation, comparison, anything where the same words in a different arrangement mean something different. That gap is exactly what embeddings and then attention were built to close." }
        ]
      } }

  ],

  takeaways: [
    "One-hot vectors are all equidistant, so they encode identity and nothing else.",
    "The BoW matrix reproduces exactly; `the` is 2 in every document and carries no discriminative value.",
    "Adding bigrams grew the vocabulary 2.6× on three short sentences.",
    "`IDF = ln(N/df) + 1`, so a word in every document gets idf **1.0, not 0** — only the bare log would zero it.",
    "Measured: TF-IDF cut the `the`-to-`mat` advantage from 2.000 to 1.181, a 41 % reduction — but `the` still scores higher.",
    "TF-IDF downweights common words; it does not remove them and is not a stopword list.",
    "scikit-learn smooths the idf, L2-normalises rows and does not divide by document length.",
    "`sublinear_tf` takes a 100× count difference down to a 5.6× weight difference."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A term appears in all N documents. What is its idf under `ln(N/df) + 1`?",
      options: ["0", "1.0", "ln(N)", "Undefined"],
      answer: 1,
      why: "`ln(N/N) = ln(1) = 0`, and the `+1` makes it 1.0. Only the bare `log(N/df)` with no `+1` would zero it out. Both the formula and scikit-learn's smoothed version include the `+1`, which is why TF-IDF downweights ubiquitous terms rather than eliminating them." },
    { stem: "In the worked corpus, `the` appears twice in doc 0 and `mat` once. After TF-IDF, which scores higher?",
      options: ["`mat`, because idf removes common words", "`the` — idf shrinks the gap by 41 % but does not invert it", "They are equal", "Both are zero"],
      answer: 1,
      why: "Measured: `the` 0.5812 against `mat` 0.4920. The raw-count ratio of 2.000 falls to 1.181, so idf removed 41 % of the advantage frequency gave `the` — but it still wins. TF-IDF compresses the gap; it does not reverse it, and it is not a substitute for a stopword list." },
    { stem: "Why does `sublinear_tf` use `1 + ln(tf)` instead of raw counts?",
      options: ["To normalise document length", "Because the tenth occurrence of a word tells you far less than the first", "To avoid negative values", "To match the idf scale"],
      answer: 1,
      why: "Relevance does not grow linearly with count. The transform takes a 100× count difference down to a 5.6× weight difference, which matches intuition much better — particularly on long documents where a common term can otherwise dominate a row purely by repetition." },
    { stem: "You compute TF-IDF by hand and it does not match `TfidfVectorizer`. What is the most likely reason?",
      options: ["A bug in scikit-learn", "Its defaults smooth the idf, L2-normalise rows, and skip division by document length", "You used the wrong logarithm base", "The vocabulary order differs"],
      answer: 1,
      why: "Three defaults differ from the textbook formula, and all three change the numbers. The smoothed idf `ln((1+N)/(1+df)) + 1` is the piece worth verifying directly against `tfidf.idf_`; the normalisation and the absent length division are convention and must be read from the documentation." }
  ] },

  interview: { title: "Interview", sub: "Classical representations", questions: [
    { level: "Core", q: "What is TF-IDF and why is it better than raw counts?",
      strong: "Term frequency times inverse document frequency — it downweights terms that appear everywhere.",
      answer: [{ t: "p", text: "Term frequency measures how often a term appears in a document, and inverse document frequency measures how rare it is across the corpus, usually as `log(N/df) + 1`. Multiplying them means a term scores highly when it is frequent here and uncommon elsewhere, which is a reasonable proxy for being distinctive. Compared with raw counts, it stops words like `the` dominating every vector purely by being common. What I would be careful about is a claim I often hear, that TF-IDF removes stopwords. It does not. With `df = N` the log is zero and the `+1` leaves the idf at 1.0, so a ubiquitous term keeps full weight — I measured `the` still outscoring `mat` in a document where `the` appeared twice and `mat` once, with the ratio falling from 2.0 to 1.18. So it compresses the advantage by about forty per cent rather than eliminating it, and if you want those words gone you still need a stopword list." }] },
    { level: "Core", q: "When would you use TF-IDF over embeddings?",
      strong: "As the baseline, when data is limited, when interpretability matters, or when the task is about presence rather than meaning.",
      answer: [{ t: "p", text: "First, always as the baseline, because on many text classification tasks a linear model over TF-IDF gets within a couple of points of a fine-tuned transformer while training in seconds — and if your neural model cannot clearly beat that, you have learned something important cheaply. Beyond the baseline, I would keep it when data is limited, since it has no parameters to overfit; when interpretability is required, because you can read off exactly which terms drove a prediction and that is often a regulatory or debugging requirement; and when the task genuinely depends on the presence of specific terms rather than on meaning — keyword-driven routing, document retrieval, plagiarism detection. Where it loses is anything needing word order or semantics, since it cannot distinguish 'dog bites man' from 'man bites dog' and treats synonyms as unrelated dimensions. That gap is exactly what embeddings were built to close." }] },
    { level: "Senior", q: "Someone reports that their TF-IDF pipeline underperforms. What do you check?",
      strong: "The top features per class first — they expose tokenization bugs, leakage and preprocessing errors in seconds.",
      answer: [{ t: "p", text: "I would look at the highest-weighted features for each class before touching anything else, because it is thirty seconds of work and diagnoses most problems. If the top terms are meaningless fragments, there is a tokenization bug — the sort of thing where a hyphen split a word into a single letter. If they are stopwords, the idf is not doing its job, and with the `+1` in the formula it genuinely will not remove them, so a stopword list or a `max_df` threshold is needed. If they are artefacts — document IDs, boilerplate footers, timestamps — that is leakage and the accuracy is fake. After that I would check `min_df`, since with bigrams enabled most features occur exactly once and are pure noise that inflates dimensionality; I measured the vocabulary growing 2.6 times on three short sentences just from adding bigrams. Then `sublinear_tf` for long documents, and finally whether the task is one where word order matters, in which case no amount of tuning a bag-of-words representation will help." }] }
  ] }
});

/* ============================================================================
   LESSON 1.6 — Word Embeddings
   Mirrors 01_NLP_Notes.md · §6. A skip-gram model with negative sampling is
   trained from scratch in NumPy on a corpus with known structure, and it
   recovers the categories from co-occurrence alone (scratchpad/nlp/n16.py).
   ========================================================================= */
EC.receiveLesson({
  id: "1.6",

  lede: "**The distributional hypothesis says a word is characterised by the company it keeps, and you can watch a model discover that from nothing.** Trained on a corpus where animals, people, places and objects each occupy their own slot, a skip-gram model with no labels of any kind puts `cat` next to `wolf`, `dog` and `fox` at cosine **0.99**, while unrelated words sit at 0.27. It learned the categories purely from which words appear near which others.",

  objectives: [
    "State the distributional hypothesis and what it buys over one-hot",
    "Contrast skip-gram with CBOW on objective, data needs and rare words",
    "Explain negative sampling and why it is needed",
    "Compare Word2Vec, GloVe and FastText",
    "Judge the analogy claim honestly"
  ],

  prerequisites: ["1.5", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "The idea", id: "distributional" },

    { t: "callout", kind: "mental", title: "You shall know a word by the company it keeps",
      body: [{ t: "p", text: "Firth's line from 1957 is the whole basis of the field. If two words appear in the same contexts — *the ___ ran across the garden* — then whatever they mean, they mean something similar enough to be substitutable there. That is a claim about text alone, requiring no dictionary, no labels and no linguistics, which is exactly why it scales. Every embedding method in this lesson is a different way of turning co-occurrence counts into vectors, and they all rest on this one assumption." }] },

    { t: "h2", n: "02", text: "Skip-gram and CBOW", id: "word2vec" },

    { t: "diagram", kind: "compare", title: "Two directions of the same idea",
      caption: "Both learn from the same co-occurrence signal. They differ in which side is the input.",
      columns: [
        { title: "Skip-gram", tone: "accent", items: [
          "Input: the centre word. Predict: each context word",
          "One training example per (centre, context) pair",
          "Better on rare words — each occurrence generates several updates",
          "Slower to train",
          "Works well on smaller corpora"
        ] },
        { title: "CBOW", tone: "good", items: [
          "Input: the averaged context. Predict: the centre word",
          "One training example per position",
          "Worse on rare words — they are averaged away in the context",
          "Faster to train",
          "Needs more data"
        ] }
      ] },

    { t: "p", text: "The asymmetry on rare words is worth understanding rather than memorising. In skip-gram, a rare centre word produces a separate training example for every context word around it, so it gets several gradient updates each time it appears. In CBOW the rare word is one of several vectors being averaged into a context, so its individual contribution is diluted. **Skip-gram therefore learns more from each occurrence**, which matters most exactly where data is thinnest." },

    { t: "h2", n: "03", text: "Negative sampling", id: "negative" },

    { t: "math", tex: "\\mathcal{L} = -\\log \\sigma(\\mathbf{v}_c^{\\top}\\mathbf{u}_o) \\;-\\; \\sum_{k=1}^{K} \\log \\sigma(-\\mathbf{v}_c^{\\top}\\mathbf{u}_{n_k})" },

    { t: "callout", kind: "insight", title: "The softmax over the vocabulary is the thing being avoided",
      body: [{ t: "p", text: "The honest objective is a softmax over every word in the vocabulary, which for 50,000 words means computing 50,000 dot products and normalising — for every training pair, of which there are billions. Negative sampling replaces that with a much cheaper question: push the true context word's score up, and push **`K` randomly sampled words' scores down**, with `K` typically 5 to 20. The samples are drawn from the unigram distribution raised to the power 0.75, which flattens it — that exponent is empirical rather than principled, and it stops very common words dominating the negatives while still sampling them more often than rare ones." }] },

    { t: "code", lang: "python", title: "The update, in full",
      code: `for centre, context in pairs:
    negs = np.random.choice(V, K, p=noise)     # noise ∝ freq^0.75
    v = W_in[centre]

    score = sigmoid(W_out[context] @ v)        # want this near 1
    g = score - 1.0
    dv = g * W_out[context]
    W_out[context] -= LR * g * v

    for n in negs:                             # want these near 0
        sn = sigmoid(W_out[n] @ v)
        dv += sn * W_out[n]
        W_out[n] -= LR * sn * v

    W_in[centre] -= LR * dv`,
      caption: "Two embedding matrices: `W_in` for centre words and `W_out` for context words. The centre matrix is what you keep — the context matrix is usually discarded after training." },

    { t: "h2", n: "04", text: "Watching it learn the categories", id: "measured" },

    { t: "p", text: "Trained on 4,000 sentences with a 24-word vocabulary, where animals, people, places, objects and two kinds of verb each occupy a distinct template slot — 63,736 training pairs, six epochs, no labels:" },

    { t: "out", text: `  cat      -> wolf 0.991, dog 0.988, fox 0.986, park 0.408
  king     -> queen 0.989, man 0.986, woman 0.979, bread 0.968
  garden   -> forest 0.999, park 0.998, walked 0.686, ran 0.664
  bought   -> sold 0.992, carried 0.985, queen 0.414, woman 0.403` },

    { t: "callout", kind: "insight", title: "Every nearest neighbour is from the correct category",
      body: [{ t: "p", text: "`cat` retrieves the three other animals before anything else. `king` retrieves `queen`, `man` and `woman`. `garden` retrieves `forest` and `park` at cosine 0.998. `bought` retrieves `sold` and `carried`. The model was never told any of these categories exist — it saw only which words occur near which others, and the category structure fell out. That is the distributional hypothesis working, and it is why embeddings replaced one-hot: **the representation now contains information the raw symbols did not.**" }] },

    { t: "out", text: `  animals   within-group cos +0.989   across-group cos +0.274   gap +0.715
  persons   within-group cos +0.989   across-group cos +0.435   gap +0.554
  places    within-group cos +0.998   across-group cos +0.382   gap +0.616
  objects   within-group cos +0.987   across-group cos +0.404   gap +0.583
  verbs     within-group cos +0.987   across-group cos +0.344   gap +0.643
  pverbs    within-group cos +0.991   across-group cos +0.263   gap +0.727` },

    { t: "p", text: "Every group shows the same pattern: near-0.99 within, well under 0.45 across. The gap is the structure the model found. Compare with one-hot, where the cosine between any two distinct words is **exactly 0.000** — there is no gap because there is no structure at all, and nothing a downstream model could generalise from." },

    { t: "h2", n: "05", text: "GloVe and FastText", id: "variants" },

    { t: "table", head: ["Method", "Key idea", "Handles OOV?"],
      rows: [
        ["**Word2Vec**", "Predict context from centre (or the reverse), locally, with negative sampling", "No"],
        ["**GloVe**", "Factorise the global co-occurrence matrix — uses corpus-wide statistics directly rather than sampling windows", "No"],
        ["**FastText**", "Word2Vec over character n-grams; a word's vector is the sum of its subword vectors", "**Yes**"]
      ] },

    { t: "callout", kind: "good", title: "FastText's subwords are the reason it survives OOV",
      body: [{ t: "p", text: "Word2Vec and GloVe both learn one vector per word type, so a word not in the training vocabulary has no vector at all — and morphological variants are unrelated, so knowing `run` teaches nothing about `running`. FastText represents a word as the sum of its character n-gram vectors, which means an unseen word still assembles a vector from pieces it knows, and `running` shares most of its n-grams with `run`. That is the same argument that motivated subword tokenization in lesson 1.3, arriving from a different direction, and it matters most for morphologically rich languages where the type count explodes." }] },

    { t: "h2", n: "06", text: "The analogy, honestly", id: "analogy" },

    { t: "math", tex: "\\text{vec}(\\text{king}) - \\text{vec}(\\text{man}) + \\text{vec}(\\text{woman}) \\;\\approx\\; \\text{vec}(\\text{queen})" },

    { t: "callout", kind: "note", title: "The famous result is weaker than it is usually presented",
      body: [{ t: "p", text: "The analogy works when a relation happens to be a consistent *translation* in the vector space, and for some relations it genuinely is — that is a real and surprising property of embeddings trained on enough text. But the standard evaluation **excludes the three input words from the candidate answers**, and without that exclusion the nearest vector to `king − man + woman` is frequently `king` itself. The result is real; the demonstration is stage-managed. It is worth knowing both halves, because the analogy is often cited as evidence that embeddings capture meaning in a stronger sense than the geometry actually supports." }] },

    { t: "exercise", kind: "practice", title: "Train embeddings and probe what they learned", difficulty: "core", minutes: 45,
      prompt: "Train skip-gram with negative sampling from scratch on a corpus of your own and measure within-group against across-group cosine for any categories you know exist. Then sweep the window size from 1 to 10 and see how the nearest neighbours change — small windows and large windows capture different relationships. Test the analogy with and without excluding the input words. Finally, compare against a pretrained GloVe or FastText model on the same words.",
      hints: [
        "Sample negatives from `freq^0.75`, not from the raw frequency.",
        "Small windows favour syntactic similarity; large windows favour topical similarity.",
        "For the analogy, rank all candidates and note where the input words land."
      ],
      solution: {
        notes: [
          { t: "p", text: "The window sweep produces the most interesting result. A window of 1 or 2 gives neighbours that are syntactically substitutable — other words that could occupy the same grammatical slot — while a window of 8 or 10 gives topically related words that co-occur in the same documents but are not interchangeable. Neither is more correct; they answer different questions, and knowing which one your task needs is a real decision rather than a default." },
          { t: "p", text: "The category measurement is worth making quantitative rather than eyeballing neighbours. On a corpus with known structure I measured within-group cosine around 0.99 against across-group near 0.27 — a gap of 0.72. Having that number lets you tell whether more training or a bigger dimension actually helped, which a list of nearest neighbours does not." },
          { t: "p", text: "On the analogy, including the input words in the candidate set is the honest version, and it frequently returns one of the inputs rather than the intended answer. That does not make the geometric structure fake — the relation vector really is roughly consistent — but it does mean the classic demonstration depends on an exclusion rule that is rarely mentioned. Worth seeing once so you can describe the result accurately." }
        ]
      } }

  ],

  takeaways: [
    "The distributional hypothesis: words appearing in similar contexts have similar meanings — a claim about text alone.",
    "Skip-gram predicts context from the centre word; CBOW predicts the centre from averaged context.",
    "Skip-gram is better on rare words because each occurrence generates several updates rather than being averaged away.",
    "Negative sampling replaces a softmax over the whole vocabulary with one positive and K≈5–20 negatives, drawn from `freq^0.75`.",
    "Trained from scratch with no labels: `cat` → wolf 0.991, dog 0.988, fox 0.986; `king` → queen 0.989.",
    "Within-group cosine ≈0.99 against across-group ≈0.27 — the model recovered the categories from co-occurrence alone.",
    "One-hot vectors have cosine exactly 0.000 between any two words: no structure to generalise from.",
    "FastText sums character n-gram vectors, so it handles out-of-vocabulary words; Word2Vec and GloVe cannot.",
    "The `king − man + woman` analogy holds, but the standard evaluation excludes the input words from the candidates."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why is skip-gram better than CBOW on rare words?",
      options: ["It uses a larger window", "Each occurrence generates a separate example per context word, rather than being averaged into a context vector", "It trains for more epochs", "It has more parameters"],
      answer: 1,
      why: "A rare centre word in skip-gram produces one training pair for every word around it, so it receives several gradient updates per occurrence. In CBOW that same rare word is one of several vectors averaged into a context, so its contribution is diluted. The difference matters most exactly where data is thinnest." },
    { stem: "What does negative sampling replace?",
      options: ["The embedding lookup", "A softmax over the entire vocabulary", "The context window", "Backpropagation"],
      answer: 1,
      why: "The exact objective requires normalising over every vocabulary word for every training pair, which is prohibitive at 50,000 words and billions of pairs. Negative sampling instead pushes the true context up and K randomly drawn words down, with K typically 5–20 and the samples drawn from frequency raised to the power 0.75." },
    { stem: "A skip-gram model trained with no labels puts `cat`, `dog`, `wolf` and `fox` at cosine 0.99 to each other. What did it use?",
      options: ["A part-of-speech tagger", "Only which words appear near which other words", "A pretrained category list", "Character n-grams"],
      answer: 1,
      why: "Co-occurrence alone. The model saw that those four words occupy the same positions relative to the same neighbours and placed them together — measured at within-group 0.989 against across-group 0.274. That is the distributional hypothesis producing category structure with no supervision of any kind." },
    { stem: "Which embedding method can produce a vector for a word never seen in training?",
      options: ["Word2Vec", "GloVe", "FastText", "None of them"],
      answer: 2,
      why: "FastText represents a word as the sum of its character n-gram vectors, so an unseen word assembles from pieces the model knows, and `running` shares most n-grams with `run`. Word2Vec and GloVe learn one vector per word type and have nothing to return for an unknown string." }
  ] },

  interview: { title: "Interview", sub: "Embeddings", questions: [
    { level: "Core", q: "Explain the difference between Word2Vec CBOW and skip-gram.",
      strong: "Opposite prediction directions; skip-gram is better on rare words and small corpora, CBOW is faster.",
      answer: [{ t: "p", text: "Skip-gram takes the centre word as input and predicts each surrounding context word; CBOW averages the context words and predicts the centre. They learn from the same co-occurrence signal in opposite directions. The practical differences follow from that: skip-gram produces a separate training example for every centre-context pair, so a rare word gets several updates each time it appears, whereas in CBOW a rare word is one of several vectors averaged into a context and its contribution is diluted. So skip-gram is better on rare words and on smaller corpora, and CBOW is faster because it makes one prediction per position rather than several. In practice skip-gram with negative sampling is the more common choice. Both replace the full softmax over the vocabulary with negative sampling — push the true context up, push five to twenty randomly drawn words down — because normalising over fifty thousand words for every pair is not affordable." }] },
    { level: "Core", q: "What do embeddings give you that TF-IDF does not?",
      strong: "Geometry — similar words have similar vectors, so learning transfers between them.",
      answer: [{ t: "p", text: "Structure that a downstream model can generalise from. In a TF-IDF or one-hot representation every word is its own orthogonal dimension, so the cosine between any two distinct words is exactly zero — `cat` is as similar to `dog` as to `Tuesday`, and anything the model learns about one word teaches it nothing about another. Embeddings place similar words near each other, so that transfer happens automatically. I trained a skip-gram model from scratch on a corpus where animals, people and places each occupied a distinct slot, and with no labels at all it put the four animals at cosine 0.99 to each other and around 0.27 to everything else. That gap is the information the representation added. The other advantages follow: dimensionality of a few hundred instead of the vocabulary size, dense instead of sparse, and with FastText, the ability to produce a vector for a word never seen." }] },
    { level: "Senior", q: "How much should you trust the `king − man + woman ≈ queen` result?",
      strong: "The geometry is real, but the standard evaluation excludes the input words, which flatters it considerably.",
      answer: [{ t: "p", text: "The underlying property is real and genuinely surprising: for some relations, the difference between two word vectors is roughly consistent across pairs, so the relation behaves like a translation in the space and adding it moves you to the analogous word. That is not a trick. What is usually left out is that the standard evaluation excludes the three input words from the candidate answers, and without that exclusion the nearest vector to `king − man + woman` is often `king` itself — the arithmetic moves you only a short distance from the starting point. So I would describe it as evidence that embeddings encode some relational structure linearly, not as evidence that they capture meaning in any strong sense. The same caution applies more generally: embedding geometry is suggestive and worth probing, but claims about what a model 'understands' based on cosine similarities need the evaluation protocol stated alongside them." }] }
  ] }
});

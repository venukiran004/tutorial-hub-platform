/* ============================================================================
   LESSON 1.5 — N-grams and Classical Language Models
   Mirrors 01_NLP_Notes.md · §5. The reference's BigramLM is run; add-1
   smoothing is measured and found to give 61.5% of the probability mass to
   events never observed (scratchpad/nlp/n15.py).
   ========================================================================= */
EC.receiveLesson({
  id: "1.5",

  lede: "**A classical language model is a counting exercise with one fatal problem, and almost everything written about them is about the fix.** Count how often each word follows each context, divide, and you have probabilities. Then the first unseen bigram in your test set makes the whole sentence probability zero and the log-likelihood negative infinity. Add-one smoothing solves that — and, measured on the reference's own model, hands **61.5 % of the probability mass to events that were never observed at all**.",

  objectives: [
    "Generate n-grams and compute maximum-likelihood conditional probabilities",
    "Explain why unsmoothed n-gram models fail on held-out text",
    "Apply add-one smoothing and measure what it costs",
    "Compute perplexity and interpret it as an effective branching factor",
    "State the three structural limits of n-gram models"
  ],

  prerequisites: ["1.4"],

  blocks: [

    { t: "h2", n: "01", text: "N-grams", id: "ngrams" },

    { t: "out", text: `  1-grams (6): [('the',), ('cat',), ('sat',)]
  2-grams (5): [('the', 'cat'), ('cat', 'sat'), ('sat', 'on')]
  3-grams (4): [('the', 'cat', 'sat'), ('cat', 'sat', 'on'), ('sat', 'on', 'the')]
  a sentence of 6 tokens yields 5 bigrams and 4 trigrams

  bigram counts: {('the','cat'): 1, ('cat','sat'): 1, ('sat','on'): 1,
                  ('on','the'): 1, ('the','mat'): 1}
  P('mat' | 'the') = count('the mat')/count('the') = 1/2 = 0.5
  P('cat' | 'the') = 1/2 = 0.5` },

    { t: "p", text: "A sequence of `T` tokens yields `T − n + 1` n-grams. The conditional probability is a ratio of counts, and the reference's worked value reproduces: `the` is followed by `cat` once and `mat` once, so each has probability 0.5 and the two sum to 1." },

    { t: "math", tex: "P(w_1, \\dots, w_T) \\approx \\prod_{t=1}^{T} P(w_t \\mid w_{t-n+1}, \\dots, w_{t-1})" },

    { t: "callout", kind: "mental", title: "The Markov assumption is the whole model",
      body: [{ t: "p", text: "A bigram model assumes the next word depends only on the one before it — that `P(mat | the cat sat on the)` equals `P(mat | the)`. That is obviously false about language, and it is what makes the model tractable: instead of needing a count for every possible sentence, you need one for every pair. Increasing `n` weakens the assumption and strengthens the model, and the next section shows why you cannot simply keep increasing it." }] },

    { t: "h2", n: "02", text: "Why unsmoothed models break", id: "zeros" },

    { t: "out", text: `  MLE  P(sat     | cat ) = 0.6667
  MLE  P(chased  | cat ) = 0.3333
  MLE  P(flew    | cat ) = 0.0000` },

    { t: "callout", kind: "crit", title: "One zero destroys the entire sentence",
      body: [{ t: "p", text: "Sentence probability is a **product** of conditional probabilities, so a single unseen bigram makes the whole thing exactly zero — and the log-probability, which is what you actually compute with, becomes negative infinity. It is not that the model thinks the sentence is unlikely; it thinks the sentence is impossible. And since a held-out set essentially always contains bigrams the training set did not, an unsmoothed n-gram model assigns probability zero to almost every real sentence it is tested on. Perplexity is then infinite and the model cannot be evaluated at all." }] },

    { t: "h2", n: "03", text: "Add-one smoothing, and what it costs", id: "smoothing" },

    { t: "math", tex: "P_{\\text{add-1}}(w \\mid c) = \\frac{\\text{count}(c, w) + 1}{\\text{count}(c) + |V|}" },

    { t: "code", lang: "python", title: "The reference's implementation",
      code: `def prob(self, word, context):
    """P(word | context) with add-1 smoothing."""
    vocab_size = len(self.unigram_counts)
    numerator = self.bigram_counts[context][word] + 1
    denominator = self.unigram_counts[context] + vocab_size
    return numerator / denominator`,
      caption: "Adding 1 to every count — including counts that are zero — means nothing is impossible. The `+|V|` in the denominator keeps it a valid distribution." },

    { t: "out", text: `  add-1 P(sat     | cat ) = (2+1)/(3+10) = 0.2308
  add-1 P(chased  | cat ) = (1+1)/(3+10) = 0.1538
  add-1 P(flew    | cat ) = (0+1)/(3+10) = 0.0769

    MLE gives the seen continuations 1.000 of the mass
    add-1 gives them only 0.385 - the rest went to events never observed` },

    { t: "callout", kind: "warn", title: "61.5 % of the probability went to things that never happened",
      body: [{ t: "p", text: "This is the measured cost of Laplace smoothing and the reason nobody uses it in production. Before smoothing, the two continuations actually observed after `cat` held all the probability. After, they hold **0.385** — the remaining 61.5 % is spread across every word in the vocabulary that has never followed `cat`, including `flew`, `the` and `cat` itself. The model has gone from overconfident to badly underconfident, and the effect worsens as the vocabulary grows, because `|V|` in the denominator grows with it. Real systems use add-`k` with `k` well below 1, or Kneser-Ney, which estimates how likely a word is to appear in a *novel* context rather than treating all unseen events alike." }] },

    { t: "h2", n: "04", text: "Perplexity", id: "perplexity" },

    { t: "math", tex: "\\text{PP} = 2^{H} \\quad \\text{where} \\quad H = -\\frac{1}{N}\\sum_{i} \\log_2 P(w_i \\mid w_{i-1})" },

    { t: "out", text: `  on the TRAINING sentences : 4.93
  on held-out sentences     : 6.58
  the vocabulary here is 10, so uniform guessing would be 10` },

    { t: "callout", kind: "insight", title: "Perplexity is an effective branching factor",
      body: [{ t: "p", text: "A perplexity of 4.93 means the model is as uncertain, on average, as if it were choosing uniformly among about five words at each step. Uniform guessing over this ten-word vocabulary would give exactly 10, so the model has roughly halved the uncertainty. Read that way, perplexity becomes interpretable rather than an arbitrary score: **it is the size of the set the model has effectively narrowed the next word down to.** The gap between 4.93 on training and 6.58 held out is the generalisation gap, and it is the number to watch — a model whose training perplexity keeps falling while held-out perplexity rises is memorising." }] },

    { t: "table", head: ["Model", "Typical perplexity"],
      rows: [
        ["Unigram", "~1000"],
        ["Bigram", "~200"],
        ["Trigram", "~80"],
        ["BERT", "5–30"],
        ["GPT-4", "3–10"]
      ] },

    { t: "p", text: "Those figures are for English on comparable corpora, and the trend is the point: a trigram model narrows the next word to about 80 candidates, while a modern model narrows it to under 10. Perplexities are only comparable across models that share a vocabulary and tokenization — a model with a larger vocabulary faces a harder prediction problem, so its perplexity is not directly comparable to one with a smaller one." },

    { t: "h2", n: "05", text: "The sparsity wall", id: "sparsity" },

    { t: "out", text: `  vocabulary 50,000 -> 1-gram space = 5.00e+04 possible n-grams
  vocabulary 50,000 -> 2-gram space = 2.50e+09 possible n-grams
  vocabulary 50,000 -> 3-gram space = 1.25e+14 possible n-grams
  vocabulary 50,000 -> 4-gram space = 6.25e+18 possible n-grams` },

    { t: "callout", kind: "crit", title: "Storage grows exponentially and data does not",
      body: [{ t: "p", text: "With a 50,000-word vocabulary there are **1.25 × 10¹⁴ possible trigrams** — more than a hundred trillion. The largest text corpora contain on the order of 10¹² tokens, so even in the best case you observe a vanishingly small fraction of the space, and almost every trigram you meet at test time is one you have never seen. That is why increasing `n` stops helping: the model gets more expressive and the counts get sparser at exactly the same rate. Every classical language model is therefore mostly a smoothing scheme, and the reason neural models won is that they **share statistical strength across similar contexts** — `the cat sat` informs `the dog sat` — which a count-based model structurally cannot do." }] },

    { t: "dl", items: [
      ["Fixed context window", "A bigram model cannot see past one word. Long-range agreement — a verb matching a subject six words back — is invisible to it."],
      ["Sparsity", "Most n-grams are never observed, so the model is mostly smoothing."],
      ["No semantic sharing", "`good` and `great` are unrelated symbols. Seeing one teaches the model nothing about the other."],
      ["Exponential storage", "The table grows as `|V|^n`, so each extra word of context multiplies the space by the vocabulary size."]
    ] },

    { t: "exercise", kind: "practice", title: "Build the model and find its limits", difficulty: "core", minutes: 35,
      prompt: "Implement a bigram language model with maximum-likelihood and add-one estimation. Train on a corpus of a few thousand sentences and compute held-out perplexity for both — the unsmoothed version should be infinite, and you should be able to say exactly which bigram caused it. Then sweep add-`k` from 1 down to 0.01 and plot held-out perplexity against `k`. Finally, extend to trigrams and measure what fraction of test trigrams were seen in training.",
      hints: [
        "Log-space accumulation is essential; a product of thousands of probabilities underflows.",
        "The best `k` is usually far below 1 — often around 0.01 for a reasonable vocabulary.",
        "The seen-trigram fraction is the sparsity wall made concrete."
      ],
      solution: {
        notes: [
          { t: "p", text: "The add-`k` sweep has a clear minimum well below 1, which is the empirical version of the over-smoothing result measured in this lesson: at `k = 1` the seen continuations kept only 38.5 % of the mass, and the smaller `k` gets, the more the model trusts what it actually observed. Going too small brings back near-zero probabilities for unseen events, so there is a genuine optimum, and finding it on your own data takes ten minutes." },
          { t: "p", text: "The seen-trigram fraction is the number that ends the discussion about going to higher `n`. On a modest corpus it is often below half, meaning most of what your model does at test time is apply the smoothing rule rather than use any evidence. That is the sparsity wall, and it is why the field moved to models that share strength across similar contexts instead of counting each one separately." },
          { t: "p", text: "Identifying the specific bigram that produced infinite perplexity is worth doing once, because it makes the failure concrete rather than theoretical. It is almost always an ordinary, unremarkable word pair that simply did not occur in your training text — which is the point. The problem is not exotic inputs, it is that language has a very long tail and any finite corpus misses most of it." }
        ]
      } }

  ],

  takeaways: [
    "An n-gram model applies the Markov assumption: the next word depends only on the previous `n−1`.",
    "MLE probabilities are ratios of counts — the reference's `P('mat'|'the') = 1/2 = 0.5` reproduces exactly.",
    "One unseen bigram makes the sentence probability zero and the log-probability negative infinity.",
    "Add-one smoothing removes the zeros and gave the observed continuations only 0.385 of the mass — 61.5 % went to events never seen.",
    "Use add-`k` with `k` well below 1, or Kneser-Ney, which models how likely a word is in a *novel* context.",
    "Perplexity is an effective branching factor: 4.93 means as uncertain as choosing among five words.",
    "Measured 4.93 on training against 6.58 held out — that gap is the generalisation signal.",
    "A 50,000-word vocabulary has 1.25e+14 possible trigrams, so counts are irreducibly sparse."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does an unsmoothed n-gram model fail on held-out text?",
      options: ["It overfits the training vocabulary", "A single unseen n-gram makes the whole sentence probability zero and the log-probability −∞", "It runs out of memory", "The counts become too large"],
      answer: 1,
      why: "Sentence probability is a product of conditionals, so one zero factor zeroes everything. The model does not think the sentence is unlikely — it thinks it is impossible. Since held-out text always contains unseen n-grams, perplexity is infinite and the model cannot be evaluated at all." },
    { stem: "After add-one smoothing on the reference's model, how much probability mass do the actually-observed continuations retain?",
      options: ["All of it", "0.385 — the other 61.5 % went to unseen events", "0.95", "It depends on the corpus size only"],
      answer: 1,
      why: "Measured directly: before smoothing the two continuations seen after `cat` held all the mass; after, they hold 0.385. The rest is spread over every vocabulary word that never followed `cat`. This over-smoothing worsens as the vocabulary grows, which is why production systems use add-`k` with small `k`, or Kneser-Ney." },
    { stem: "A model has perplexity 80. What does that mean?",
      options: ["It is 80 % accurate", "It is as uncertain as choosing uniformly among about 80 words at each step", "It needs 80 training epochs", "Its vocabulary is 80 words"],
      answer: 1,
      why: "Perplexity is an effective branching factor — the size of the set the model has narrowed the next word down to. That reading makes it interpretable: uniform guessing over the vocabulary gives the vocabulary size, so any lower value is the reduction in uncertainty the model achieved." },
    { stem: "Why does increasing `n` beyond trigrams stop helping?",
      options: ["The maths breaks down", "The n-gram space grows as `|V|^n` while the data does not, so counts become irreducibly sparse", "Memory is the only limit", "Longer n-grams are less informative"],
      answer: 1,
      why: "At a 50,000-word vocabulary there are 1.25e+14 possible trigrams and the largest corpora hold around 10¹² tokens, so you observe a vanishing fraction. The model gets more expressive and the counts get sparser at the same rate, which means most predictions come from the smoothing rule rather than from evidence." }
  ] },

  interview: { title: "Interview", sub: "Language models", questions: [
    { level: "Core", q: "Explain perplexity.",
      strong: "Two to the power of the cross-entropy — an effective branching factor over the next word.",
      answer: [{ t: "p", text: "It is two to the power of the average negative log-probability the model assigns to the actual next words, which makes it interpretable as an effective branching factor: a perplexity of 80 means the model is as uncertain as if it were choosing uniformly among 80 candidates at each step. Lower is better, and the reference point is the vocabulary size, since uniform guessing gives exactly that — on a model I ran with a ten-word vocabulary, perplexity was 4.93, so it had roughly halved the uncertainty. Two caveats matter in practice. Perplexities are only comparable between models sharing a vocabulary and tokenization, because a larger vocabulary is a harder prediction problem. And an unsmoothed n-gram model has infinite perplexity on any realistic held-out set, since one unseen n-gram zeroes the probability, which is why smoothing is not optional." }] },
    { level: "Core", q: "Why do n-gram language models need smoothing, and what does it cost?",
      strong: "Unseen n-grams give zero probability; smoothing removes the zeros but over-distributes mass to unseen events.",
      answer: [{ t: "p", text: "Sentence probability is a product of conditionals, so any n-gram not seen in training makes the entire sentence impossible rather than merely unlikely, and the log-probability goes to negative infinity. Since language has a very long tail, held-out text always contains such n-grams, so without smoothing the model cannot be evaluated at all. Add-one smoothing fixes that by pretending every possible continuation was seen once. The cost is severe and measurable: on a small model I ran, the continuations actually observed after a given word went from holding all the probability mass to holding only 0.385 — sixty-one per cent went to events never observed. And it gets worse as the vocabulary grows, because the vocabulary size sits in the denominator. So in practice you use add-`k` with `k` well below one, or Kneser-Ney, which asks how likely a word is to appear in a novel context rather than treating all unseen events as equally plausible." }] },
    { level: "Senior", q: "Why did neural language models replace n-gram models?",
      strong: "Because counts cannot share statistical strength across similar contexts, and the n-gram space is irreducibly sparse.",
      answer: [{ t: "p", text: "Two reasons, and the second is the deeper one. The surface reason is sparsity: with a fifty-thousand-word vocabulary there are 1.25 times ten to the fourteen possible trigrams, and the largest corpora have around ten to the twelve tokens, so you observe a vanishing fraction and most test-time predictions come from the smoothing rule rather than from evidence. Increasing `n` makes the model more expressive and the counts sparser at exactly the same rate, so it stops helping. The deeper reason is that a count-based model cannot generalise across similar contexts. Seeing `the cat sat` tells it nothing whatsoever about `the dog sat`, because `cat` and `dog` are unrelated symbols — and by the same token `good` and `great` share nothing. A neural model represents words as vectors, so similar words have similar representations and evidence about one transfers to the other automatically. That sharing is what lets a neural model use a long context without the table exploding, and it is the same property that made embeddings valuable in the first place." }] }
  ] }
});

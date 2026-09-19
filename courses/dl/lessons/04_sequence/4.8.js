/* ============================================================================
   LESSON 4.8 — Word Embeddings
   ========================================================================= */
EC.receiveLesson({
  id: "4.8",

  lede: "**A one-hot word is a 56-dimensional vector with a single 1, and the cosine between any two of them is exactly zero — the representation knows that 'paris' and 'rome' are different and nothing else.** An embedding replaces it with a dense vector learned from the company a word keeps, and on a 12,000-sentence corpus generated from templates, skip-gram with negative sampling trained from nothing puts 'paris' next to 'lima', 'tokyo' and 'berlin', 'france' next to 'italy', 'spain' and 'germany', and solves king − man + woman = queen. This lesson builds the count-based and the predictive versions, compares them, explains what CBOW, GloVe, fastText and ELMo change, and ends with tokenisation: word, character, and a byte-pair encoder trained in twenty lines.",

  objectives: [
    "Explain why one-hot vectors carry no similarity and how the distributional hypothesis provides it",
    "Build count-based embeddings from a PPMI co-occurrence matrix with SVD",
    "Implement skip-gram with negative sampling, train it, and test neighbours and analogies",
    "Distinguish CBOW, skip-gram, GloVe, fastText and contextual embeddings (ELMo) by their objectives",
    "Compare word, character and subword tokenisation and implement byte-pair encoding"
  ],

  prerequisites: ["4.5", "2.2"],

  blocks: [

    { t: "h2", n: "01", text: "From one-hot to distributed", id: "onehot" },

    { t: "code", lang: "text", title: "A generated corpus with structure to find (executed)",
      code: `templates:  "{cap} is the capital of {c}", "{c} has its capital {cap}", "the {m} and the {f} ate {food}", "the {f} {verb} {food}", …
12,000 sentences, 58,846 tokens, vocabulary 56
most common: the 7,525   capital 3,555   in 2,418   is 2,350   of 2,350

one-hot: every word is a 56-dim vector with one 1;  cosine between any two distinct words = 0`,
      caption: "The corpus is small enough to read and structured enough to test: eight countries with capitals, six male/female pairs, foods and verbs. Whatever the embeddings recover, they recover from co-occurrence alone — nobody told the model that 'paris' and 'rome' are the same kind of thing." },

    { t: "p", text: "The distributional hypothesis (Firth, 1957): you shall know a word by the company it keeps. Every embedding method is a way of compressing a word's context statistics into a dense vector so that words with similar contexts get similar vectors. The oldest way is to count:" },

    { t: "code", lang: "text", title: "Count-based: PPMI co-occurrence + SVD to 16 dimensions (executed)",
      code: `co-occurrence matrix X[w, c] over a ±2 window, then PPMI = max(0, log P(w, c) / (P(w) P(c))), then SVD, keep 16 dimensions
nearest to 'paris':  rome, cairo, berlin  (4k-sentence run)  /  tokyo, madrid, rome  (12k run)
nearest to 'king':   actor, father, prince`,
      caption: "Positive pointwise mutual information asks how much more often two words co-occur than chance; SVD compresses the sparse matrix into dense factors. Capitals cluster with capitals and male nouns with male nouns before any neural network is involved — Levy & Goldberg (2014) showed skip-gram is implicitly factorising a shifted PMI matrix, which is why the two families give similar geometry." },

    { t: "h2", n: "02", text: "Skip-gram with negative sampling, from nothing", id: "skipgram" },

    { t: "p", text: "word2vec's skip-gram predicts each context word from the centre word. The full softmax over the vocabulary is expensive; negative sampling replaces it with a binary task — is this (centre, context) pair real or drawn from a noise distribution? — which needs only K noise words per positive pair:" },

    { t: "code", lang: "python", title: "The whole model (executed)",
      code: `Win, Wout = nn.Embedding(V, D), nn.Embedding(V, D)              # a vector per word as centre, another as context
pairs = [(centre, context) for every sentence, every position, every offset in ±2]    # 163,384 pairs
noise = counts ** 0.75 / sum                                       # unigram^0.75: flattens the frequent words a little

for centre, context in batches:
    c, o = Win(centre), Wout(context)
    neg = Wout(multinomial(noise, K=5))                             # 5 noise contexts per pair
    loss = −( logσ(c·o) + Σ_k logσ(−c·neg_k) )                      # real pair up, noise pairs down

10 epochs, 19 s;  loss 2.05 -> 1.58
nearest to 'paris':  lima, tokyo, berlin     'france':  italy, spain, germany     'king':  uncle, father, actor     'bread':  rice, fish, soup`,
      caption: "Two embedding tables because a word's behaviour as a centre and as a context differ; the input table is the one you keep. The loss is a logistic regression on dot products — a word's vector moves toward the vectors of its real contexts and away from random ones, which after a few epochs places words with the same contexts together." },

    { t: "code", lang: "text", title: "Analogies by vector arithmetic (executed)",
      code: `king − man + woman     ->  queen, princess, actress        (the gender direction)
paris − france + italy ->  madrid, tokyo, rome             (rome is third)
berlin − germany + japan -> rome, lima, nairobi            (tokyo not in the top three)

all 56 capital-of analogies (a − country + other country == other capital?):  skip-gram 9 correct,  PPMI-SVD 13 correct`,
      caption: "The gender analogy works cleanly because the templates put male and female nouns in identical slots. The capital analogies mostly fail on this corpus: countries and capitals appear in the *same* sentences, so their vectors are near each other rather than related by a consistent offset — the famous Paris − France + Italy = Rome needs a corpus where capitals and countries have distinct contexts. An honest small-corpus result: neighbours are reliable, offsets are not." },

    { t: "dl", items: [
      ["Skip-gram", "Predict context from centre. Each occurrence of a word generates 2·window training pairs, so rare words get many updates; the default for small corpora."],
      ["CBOW", "Predict the centre word from the *average* of its context vectors. One update per position, faster, smoother on frequent words; loses which context word was where."],
      ["GloVe", "Count first, then fit: minimise Σ f(X_ij) (w_i·w̃_j + b_i + b̃_j − log X_ij)² over the co-occurrence matrix, with f down-weighting rare pairs. A global objective on counts that lands in the same geometry as skip-gram."],
      ["fastText", "A word's vector is the sum of its character n-gram vectors: '<nairobi>' → <na, nai, air, iro, rob, obi, bi>. Morphology is shared ('walk', 'walked', 'walking') and an unseen word still gets a vector from its n-grams."],
      ["Contextual: ELMo, then BERT", "Every method above gives one vector per word type. ELMo runs a bidirectional LSTM language model and takes its hidden states, so 'bank' in 'river bank' and 'bank loan' get different vectors — the representation depends on the sentence. BERT does the same with a transformer (module 5 and the NLP course), and contextual embeddings replaced static ones for almost every task."],
      ["Using them", "Load pretrained vectors into nn.Embedding (freeze or fine-tune), or train the embedding layer from scratch as part of the task model, as 4.5's sentiment classifier did. Pretrained vectors matter most when the task corpus is small."]
    ] },

    { t: "h2", n: "03", text: "Tokenisation: word, character, subword", id: "tokens" },

    { t: "p", text: "Before any embedding there is the question of what a token is. Words give a large vocabulary and an out-of-vocabulary problem; characters give a tiny vocabulary and sequences five times longer; subwords are the compromise every modern model uses. Byte-pair encoding learns the subwords by repeatedly merging the most frequent adjacent pair:" },

    { t: "code", lang: "python", title: "BPE in twenty lines (executed)",
      code: `def bpe_train(words, merges):
    vocab = Counter(" ".join(list(w)) + " </w>" for w in words)         # each word as a sequence of characters + end marker
    for _ in range(merges):
        pair_counts = count every adjacent symbol pair across the vocabulary, weighted by word frequency
        best = most frequent pair; rules.append(best)
        vocab = merge that pair everywhere
    return rules

first 10 merges on the corpus:  e</w>  s</w>  th  the</w>  n</w>  al  d</w>  it  ap  ital
'capital'    -> ['capital</w>']                       (frequent: became one token)
'princess'   -> ['p', 'ri', 'nc', 'e', 's', 's</w>']
'nairobi'    -> ['n', 'ai', 'r', 'o', 'b', 'i', '</w>']
'unseenword' -> ['u', 'n', 's', 'e', 'e', 'n', 'w', 'o', 'r', 'd</w>']   -- never seen, still encodable`,
      caption: "Frequent words become single tokens, rare words are spelled out from pieces, and nothing is ever out of vocabulary. GPT uses byte-level BPE (merges over bytes, so any string is encodable), BERT uses WordPiece (merges chosen by likelihood gain), and SentencePiece works on raw text without pre-splitting on spaces. The vocabulary size — 30k to 100k — is a hyperparameter trading sequence length against embedding-table size." },

    { t: "table", head: ["Granularity", "Vocabulary", "Sequence length", "Out-of-vocabulary", "Used by"],
      rows: [
        ["Word", "50k–500k, still incomplete", "Short", "Yes — the OOV token", "word2vec, GloVe, early NMT"],
        ["Character", "~100", "5× longer", "Never", "Char-RNNs, some speech and code models"],
        ["Subword (BPE, WordPiece, SentencePiece)", "30k–100k", "1.3–1.5× word", "Never", "Every transformer since 2017"],
        ["Bytes", "256", "Longest", "Never", "ByT5, byte-level BPE's fallback"]
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why does negative sampling make skip-gram tractable?",
          options: [
            "It reduces the embedding dimension",
            "The full softmax over the vocabulary costs O(V) per pair; negative sampling turns each pair into a binary classification against K = 5 sampled noise words, costing O(K) — a logistic regression on dot products that still pulls real contexts together and pushes random ones apart",
            "It removes rare words from training",
            "It caches the softmax denominator"
          ],
          answer: 1,
          why: "On a 56-word vocabulary the saving is small; on 100k words it is the difference between hours and weeks. The unigram^0.75 noise distribution slightly favours rarer words as negatives, which Mikolov et al. found empirically better than the raw unigram."
        },
        {
          stem: "king − man + woman = queen worked, but paris − france + italy = rome only reached third place and 9 of 56 capital analogies were correct. Why the difference?",
          options: [
            "Capitals need larger vectors",
            "Male and female nouns fill identical template slots, so they differ by a consistent direction; countries and capitals appear in the same sentences, so their vectors are close together rather than separated by a consistent offset — the analogy needs contexts that distinguish the two roles, which this corpus lacks",
            "The model was not trained long enough",
            "Analogies only work with GloVe"
          ],
          answer: 1,
          why: "Vector arithmetic works when the relation is a near-constant offset across pairs. Nearest neighbours were right for every category; the offset structure is the more demanding property and depends on the corpus's contexts, which is why published analogy results use billions of tokens."
        },
        {
          stem: "What does byte-pair encoding guarantee that a word vocabulary cannot?",
          options: [
            "Shorter sequences",
            "That every string can be encoded: a word not seen in training is decomposed into subword pieces down to single characters ('unseenword' → u, n, s, e, e, n, w, o, r, d</w>), so there is no out-of-vocabulary token, while frequent words still become single tokens ('capital' → capital</w>)",
            "That tokens align with morphemes",
            "A smaller embedding table than characters"
          ],
          answer: 1,
          why: "The merge rules are learned from frequency, so common words are cheap and rare ones are spelled out; the base alphabet (or bytes) is the fallback. It is the tokeniser of GPT-2 onward and, in WordPiece form, of BERT."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Embeddings three ways and a tokeniser",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** Generate a templated corpus (countries and capitals, male/female pairs, foods and verbs; 12,000 sentences). Build the ±2-window co-occurrence matrix, convert to PPMI, take a 16-dimensional SVD, and report the three nearest neighbours of 'paris' and 'king'." },
        { t: "p", text: "**(b)** Implement skip-gram with negative sampling (two nn.Embedding tables, D = 32, K = 5, unigram^0.75 noise) and train for 10 epochs with Adam. Report the nearest neighbours of 'paris', 'france', 'king' and 'bread', the top three for king − man + woman and paris − france + italy, and the number of the 56 capital analogies solved by each method." },
        { t: "p", text: "**(c)** Implement BPE training (40 merges) and encoding; print the first ten merges and the encodings of 'princess', 'capital', 'nairobi' and a word not in the corpus." }
      ],
      requirements: [
        "(a) two neighbour lists.",
        "(b) four neighbour lists, two analogy lists, two analogy counts.",
        "(c) ten merges and four encodings."
      ],
      hint: "(a) PPMI = max(0, log(X_ij · N / (X_i· X_·j))). (b) The loss for one pair is −log σ(c·o) − Σ_k log σ(−c·n_k); exclude a, b, c themselves when ranking analogy candidates. (c) Represent each word as space-separated symbols ending in </w>; a merge is a string replace of 'a b' by 'ab'.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) PPMI-SVD:  'paris' -> tokyo, madrid, rome;   'king' -> actor, father, prince

# (b) skip-gram (10 epochs, 19 s, loss 2.05 -> 1.58):
#     'paris' -> lima, tokyo, berlin;  'france' -> italy, spain, germany;  'king' -> uncle, father, actor;  'bread' -> rice, fish, soup
#     king − man + woman -> queen, princess, actress;   paris − france + italy -> madrid, tokyo, rome
#     capital analogies solved: skip-gram 9 of 56, PPMI-SVD 13 of 56   -- neighbours reliable, offsets not, on a corpus this small

# (c) first merges: e</w> s</w> th the</w> n</w> al d</w> it ap ital
#     'princess' -> p ri nc e s s</w>    'capital' -> capital</w>    'nairobi' -> n ai r o b i </w>    'unseenword' -> u n s e e n w o r d</w>`,
        notes: [
          { t: "p", text: "(a) and (b) land in the same neighbourhoods from different objectives, which is Levy & Goldberg's equivalence seen on a toy." },
          { t: "p", text: "(b)'s analogy count is the result to keep: what the method can and cannot recover from a corpus is a property of the corpus." },
          { t: "p", text: "(c) is the tokeniser every modern model starts from, in its entirety." }
        ]
      }
    }
  ],

  takeaways: [
    "One-hot vectors have zero cosine between every pair of words; embeddings replace them with dense vectors learned from context, following the distributional hypothesis.",
    "Count-based embeddings — PPMI co-occurrence and SVD — already cluster capitals with capitals and male nouns with male nouns; skip-gram is implicitly factorising a shifted PMI matrix, so the two families share their geometry.",
    "Skip-gram with negative sampling is a logistic regression on dot products with K noise words per real pair; trained from nothing in 19 s it gave 'france' → italy, spain, germany and king − man + woman = queen.",
    "Analogy offsets need contexts that separate the two roles: capital-of analogies scored 9 of 56 (SVD 13) because countries and capitals share sentences on this corpus; neighbours were right throughout.",
    "CBOW averages contexts to predict the centre; GloVe fits log co-occurrence counts; fastText sums character n-grams and handles unseen words; ELMo and BERT make the vector depend on the sentence, which replaced static embeddings.",
    "Tokenisation: words leave gaps, characters make long sequences, subwords are the compromise; BPE learned in twenty lines turns 'capital' into one token and 'unseenword' into ten pieces with nothing out of vocabulary."
  ],

  quiz: {
    title: "Word Embeddings — Knowledge Check",
    questions: [
      {
        stem: "What are word embeddings and what problem do they solve?",
        options: [
          "Compressed one-hot vectors with the same information",
          "Dense low-dimensional vectors, learned from the contexts words occur in, in which similar words are close — solving one-hot's total absence of similarity (cosine 0 for every pair) and giving downstream models a representation in which 'paris' and 'rome' share most of their features",
          "Hash codes for words",
          "Vectors of word frequencies"
        ],
        answer: 1,
        why: "The embedding is the first layer of every text model, either learned with the task (4.5) or pretrained on a large corpus and transferred. Its geometry — neighbours, clusters, sometimes offsets — is what the measurements in this lesson probe."
      },
      {
        stem: "How do skip-gram and CBOW differ?",
        options: [
          "Skip-gram uses characters, CBOW uses words",
          "Skip-gram predicts each context word from the centre word (many training pairs per position, good for rare words); CBOW predicts the centre word from the average of its context vectors (one update per position, faster, better on frequent words)",
          "CBOW is contextual, skip-gram is static",
          "They are the same model with different learning rates"
        ],
        answer: 1,
        why: "Both are word2vec; the choice is a speed–quality trade that depends on corpus size. Negative sampling and hierarchical softmax are the two ways either is made tractable."
      },
      {
        stem: "What can fastText do that word2vec cannot?",
        options: [
          "Train faster",
          "Produce a vector for a word never seen in training, and share information across morphological variants, because a word's vector is the sum of its character n-gram vectors — '<nairobi>' is <na, nai, air, iro, rob, obi, bi>",
          "Learn contextual embeddings",
          "Handle multiple languages"
        ],
        answer: 1,
        why: "Subword information is what makes fastText robust to typos, inflection and rare words; it is the static-embedding analogue of subword tokenisation."
      },
      {
        stem: "Why did contextual embeddings replace static ones?",
        options: [
          "They are smaller",
          "A static embedding gives one vector per word type, so 'bank' has a single vector however it is used; ELMo and BERT compute the vector from the whole sentence, so different senses and roles get different vectors, and the representation carries the disambiguation downstream tasks need",
          "Static embeddings cannot be fine-tuned",
          "Contextual embeddings do not need training"
        ],
        answer: 1,
        why: "Polysemy is the visible reason; the deeper one is that a contextual model is a full language model whose representations encode syntax and semantics, which transfers to nearly every task (module 5 and the NLP course)."
      },
      {
        stem: "Which statement about tokenisation is correct?",
        options: [
          "Character-level models have an out-of-vocabulary problem",
          "Word-level vocabularies are large and still incomplete; character-level vocabularies are tiny but make sequences several times longer; subword methods like BPE learn merges from frequency so that common words are single tokens and rare ones are spelled from pieces, with no OOV",
          "BPE requires a fixed word list",
          "Subword tokens always align with morphemes"
        ],
        answer: 1,
        why: "The BPE run showed 'capital' as one token and 'unseenword' as ten characters, both encodable. Vocabulary size is then a hyperparameter of the model rather than a property of the language."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Word Embeddings",
    sub: "The distributional idea, count against predict, skip-gram's mechanics and results, the family, and tokenisation.",
    questions: [
      {
        level: "Core",
        q: "Explain word2vec and what its vectors capture.",
        strong: "word2vec learns a dense vector per word from the distributional hypothesis: words with similar contexts should have similar vectors. Skip-gram predicts each context word within a window from the centre word; CBOW predicts the centre from the averaged context. The full softmax over the vocabulary is too expensive, so negative sampling turns each (centre, context) pair into a binary task against K sampled noise words — a logistic regression on the dot product, with real pairs pushed up and noise pairs down. I trained it from nothing on a 12,000-sentence templated corpus: two embedding tables, D = 32, K = 5, ten epochs in 19 seconds. The neighbours were right for every category — 'france' → italy, spain, germany; 'bread' → rice, fish, soup — and king − man + woman gave queen. What the vectors capture is context similarity, which on real corpora correlates with meaning and syntactic role; what they do not capture is sense — one vector per word type — which is why contextual models replaced them. And the analogy arithmetic depends on the corpus: only 9 of 56 capital-of analogies worked here, because countries and capitals share sentences and so sit near each other rather than at a consistent offset.",
        answer: [
          { t: "p", text: "The objective and negative sampling, the executed run and results, what is and is not captured, and the analogy caveat." }
        ]
      },
      {
        level: "Core",
        q: "Count-based or prediction-based embeddings — what is the difference?",
        strong: "Count-based methods build the word–context co-occurrence matrix explicitly, reweight it — PPMI, the positive part of log P(w, c)/(P(w)P(c)) — and factorise it with SVD to get dense vectors. Prediction-based methods like skip-gram never form the matrix; they learn vectors by predicting contexts from a stream of pairs. Levy and Goldberg showed the two are closer than they look: skip-gram with negative sampling implicitly factorises a shifted PMI matrix, and on my corpus the two gave the same neighbourhoods — 'king' near actor, father, prince either way — and the count method solved slightly more analogies (13 against 9). GloVe sits between them: it fits log co-occurrence counts with a weighted least-squares objective, so it is count-based in its data and prediction-like in its optimisation. Practically, predictive methods scale to corpora too large to hold a matrix for and handle streaming data; count methods are fast and interpretable at moderate scale.",
        answer: [
          { t: "p", text: "Both mechanisms, the equivalence result with executed evidence, GloVe's position, and the practical split." }
        ]
      },
      {
        level: "Core",
        q: "How does byte-pair encoding work and why do modern models use it?",
        strong: "Start with each word as its sequence of characters plus an end-of-word marker, count every adjacent pair of symbols across the corpus weighted by word frequency, merge the most frequent pair into a new symbol, and repeat for a fixed number of merges; the ordered merge list is the tokeniser. To encode a new word, apply the merges in order. On my corpus the first merges were e</w>, s</w>, th, the</w>; 'capital' became a single token, 'princess' six pieces, and 'unseenword' — never in the corpus — ten characters, still encodable. That is the reason for its use: a vocabulary of 30k–100k subwords covers any string with no out-of-vocabulary token, keeps frequent words cheap, and lets the model share pieces across rare and morphologically related words. GPT uses byte-level BPE so that arbitrary bytes are the fallback; BERT's WordPiece chooses merges by likelihood gain; SentencePiece applies the idea to raw text without pre-splitting on spaces. The vocabulary size trades sequence length against embedding-table size and is tuned per model.",
        answer: [
          { t: "p", text: "The algorithm, the executed merges and encodings, the reasons, and the three variants." }
        ]
      }
    ]
  }
});

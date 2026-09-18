/* ============================================================================
   LESSON 11.5 — Text with Classical Models
   ========================================================================= */
EC.receiveLesson({
  id: "11.5",

  lede: "**Before a transformer sees a word, a linear model on TF-IDF has usually already solved the problem, in half a second, with weights you can read.** Tokenising, stemming and lemmatising are compared on nine words — the Porter stemmer turns 'studies' into 'studi' and 'was' into 'wa', the lemmatiser needs a part of speech to turn 'better' into 'good'. TF-IDF is worked on three sentences with scikit-learn's smoothed idf and L2 norm, so that 'the' with tf 2 ends at 0.650 and 'cat' with tf 1 at 0.428, and 'cats' and 'cat' have cosine zero. On four newsgroups a linear SVM on TF-IDF scores 88.4 % test accuracy in 0.5 s, complement Naive Bayes 89.1 %, and a hashing vectoriser with 4,096 buckets loses six points to collisions; the heaviest SVM weights per class are 'graphics, image, file', 'hockey, team, game', 'space, orbit, nasa' and 'clinton, government, people'. BM25's length normalisation and saturation are shown on a 23-word and a 5,942-word document, and LDA with four topics recovers the four groups without a label — imperfectly, with the politics group absorbing the generic discussion words of the others.",

  objectives: [
    "Tokenise, stem and lemmatise, and choose between them",
    "Compute bag-of-words and TF-IDF by hand with scikit-learn's exact smoothing and normalisation, and explain the hashing trick",
    "Fit Naive Bayes and linear models on text, read their weights, and tune the vectoriser without leaking",
    "Retrieve with cosine similarity and BM25 and explain what BM25's two parameters do",
    "Fit a topic model with LDA and read its output critically"
  ],

  prerequisites: ["3.2", "4.5", "5.3"],

  blocks: [

    { t: "h2", n: "01", text: "Tokens, stems and lemmas", id: "tokens" },

    { t: "code", lang: "text", title: "Nine words through the Porter stemmer and the WordNet lemmatiser (executed)",
      code: `word           Porter stem    lemma (as noun)   lemma as verb / adjective
running        run            running           run / running
runs           run            run               run / runs
ran            ran            ran               run / ran            <- the lemmatiser needs the part of speech; the stemmer never knows it
better         better         better            better / good        <- 'good' only when told it is an adjective
studies        studi          study             study / studies
studying       studi          studying          study / studying
mice           mice           mouse             mice / mice          <- a dictionary knows irregular plurals; a stemmer does not
organisation   organis        organisation      organisation / organisation
was            wa             wa                be / was

a stem is a string operation: fast, no dictionary, produces non-words, and 'organ' stems to 'organ' while 'organisation' stems to 'organis'`,
      caption: "Tokenising splits text into units — words by regular expression here, subwords in modern systems; stemming chops suffixes by rule; lemmatising maps to a dictionary form and needs the part of speech to do it well. For a linear classifier on TF-IDF the choice barely matters (the vectoriser's own lowercasing and token pattern do most of the work); for retrieval and small corpora, where 'cats' must match 'cat', it matters, and character n-grams are the alternative that needs no linguistics." },

    { t: "h2", n: "02", text: "Bag of words and TF-IDF, worked", id: "tfidf" },

    { t: "code", lang: "text", title: "Three sentences (executed; scikit-learn's formulas)",
      code: `d1 'the cat sat on the mat'   d2 'the dog sat on the log'   d3 'cats and dogs'
counts:    and cat cats dog dogs log mat on sat the
   d1       0   1   0    0   0    0   1   1   1   2
   d2       0   0   0    1   0    1   0   1   1   2
   d3       1   0   1    0   1    0   0   0   0   0

idf (smoothed): ln((1 + N)/(1 + df)) + 1        N = 3
   'the' in 2 docs:  ln(4/3) + 1 = 1.2877        'cat' in 1 doc:  ln(4/2) + 1 = 1.6931
   (the textbook ln(N/df) would give 0.4055 and 1.0986; the smoothing keeps every idf positive and adds one so that no term vanishes)

d1 raw tf·idf:  cat 1.693  mat 1.693  on 1.288  sat 1.288  the 2·1.288 = 2.575      L2 norm 3.9601
d1 as returned:  cat 0.428  mat 0.428  on 0.325  sat 0.325  the 0.650                <- the common word is down-weighted, not removed

cosine(d1, d2) = 0.6344      cosine(d1, d3) = 0.0000   -- 'cats' is not 'cat': the case for stemming or character n-grams`,
      caption: "TF-IDF is term frequency times a rarity weight, then a unit-length row so that long documents do not dominate. `sublinear_tf` replaces tf by 1 + ln(tf) so that a word repeated ten times does not count ten times; `min_df` drops terms seen in fewer than n documents; `max_df` drops terms seen in more than a fraction; `ngram_range` adds word pairs. The hashing trick replaces the vocabulary with a hash of each token into a fixed number of buckets — no fitting, no vocabulary to store, streams and multi-machine training possible — at the cost of collisions." },

    { t: "h2", n: "03", text: "Naive Bayes and linear models on four newsgroups", id: "models" },

    { t: "code", lang: "python", title: "2,242 training and 1,492 test documents; headers, footers and quotes removed (executed)",
      code: `#  pipeline                                                     test accuracy   macro-F1   fit + predict
#  CountVectorizer + MultinomialNB                                  0.8405        0.8392       0.6 s
#  TfidfVectorizer + MultinomialNB                                  0.8693        0.8656       0.6 s
#  TfidfVectorizer + ComplementNB                                   0.8914        0.8890       0.5 s     <- the best here
#  TfidfVectorizer + LogisticRegression(C = 10)                     0.8680        0.8660       1.5 s
#  TfidfVectorizer + LinearSVC                                      0.8840        0.8824       0.5 s
#  + sublinear_tf, min_df 2, 1-2 grams                              0.8760        0.8742       1.4 s
#  + stop_words = 'english'                                         0.8894        0.8879       0.5 s
#  char_wb 3-5-grams + LinearSVC                                    0.8794        0.8770       6.9 s
#  HashingVectorizer(2^18) + TfidfTransformer + LinearSVC           0.8773        0.8759       0.6 s
#  HashingVectorizer(2^12) -- many collisions                       0.8271        0.8246       0.5 s

vocabulary 28,969 terms; the five heaviest SVM weights per class:
   comp.graphics: graphics, image, file, computer, 3d      rec.sport.hockey: hockey, team, game, games, nhl
   sci.space:     space, orbit, nasa, launch, moon         talk.politics.misc: clinton, government, people, drugs, tax
Naive Bayes, largest log-ratio P(w | hockey) / P(w | space): hockey, season, nhl, pts, flyers, pittsburgh`,
      caption: "Multinomial Naive Bayes models each class as a bag of word probabilities with Laplace smoothing and multiplies them; it is the fastest baseline and the one that works with almost no data. Complement NB corrects its bias toward classes with more words and wins here. The linear SVM on TF-IDF is the workhorse: 88 % in half a second with weights that name the classes. The vectoriser's options move the score by a point or two either way; 262,144 hash buckets cost a point, 4,096 cost six. Fine-tuned transformers are reported to add a few points on tasks of this kind at orders of magnitude more compute (not run here), and are the right next step only when the points matter." },

    { t: "code", lang: "python", title: "Tuning without leaking (executed)",
      code: `# the vectoriser is a fitted transformer: its vocabulary and idf come from the training data. Fit it inside the pipeline, inside each fold.
TfidfVectorizer().fit(train + test) then LinearSVC on train:  test accuracy 0.8840  -- identical to the pipeline here; on a small corpus the idf leak is not
GridSearchCV(make_pipeline(TfidfVectorizer(sublinear_tf=True), LinearSVC()),
             {"tfidfvectorizer__min_df": [1, 2, 5], "tfidfvectorizer__ngram_range": [(1, 1), (1, 2)], "linearsvc__C": [0.1, 1, 10]}, cv=StratifiedKFold(5, shuffle=True))
# best: min_df 1, unigrams, C = 1;  CV accuracy 0.8956;  test 0.8840`,
      caption: "The grid's cross-validated 0.896 against the test 0.884 is the ordinary optimism of selecting on the folds (10.3's leak 10 in miniature); the settings it chose are the defaults. On text the defaults are good and the big levers are the data (the newsgroup headers, signatures and quoted replies were removed here because they are shortcuts that inflate every score) and the model family." },

    { t: "h2", n: "04", text: "Retrieval: cosine on TF-IDF and BM25", id: "retrieval" },

    { t: "p", text: "Ranking documents against a query is the other classical text problem. Cosine similarity on TF-IDF vectors treats the query as a tiny document and ranks by angle. BM25 is the retrieval community's refinement: score = Σ over query terms of idf(t) × tf(t, d)(k₁ + 1) / (tf(t, d) + k₁(1 − b + b·|d|/avgdl)). The k₁ term saturates term frequency — the tenth occurrence adds far less than the first, and the contribution can never exceed (k₁ + 1)·idf — and b controls how much a long document is penalised for being long." },

    { t: "code", lang: "python", title: "Two queries against the 2,242 training documents (executed; own BM25, k₁ 1.5, b 0.75)",
      code: `query 'space shuttle launch':   cosine top 5: space × 5;   BM25 top 5: space × 5;   the two top-10 lists share 4 documents
query 'goalie save playoff':    cosine top 5: graphics, hockey, hockey, hockey, space;   BM25 top 5: hockey × 4, graphics;   share 6

length normalisation and saturation: the term 'launch'
   in a 23-word document (1 occurrence):      BM25 contribution 5.529
   in a 5,942-word document (99 occurrences): 6.199        <- 99 occurrences buy 12 % more than one, because tf saturates and length is penalised`,
      caption: "Both rank sensibly; they disagree on the details because cosine rewards a document that is *about nothing but* the query terms (short, concentrated) while BM25 rewards containing the terms with a bounded credit for repetition and a penalty for length. BM25 remains the default first stage of retrieval systems, dense embeddings the second, and the two are usually combined." },

    { t: "h2", n: "05", text: "Topics: LDA", id: "lda" },

    { t: "p", text: "Latent Dirichlet allocation is a generative model: each document is a mixture of K topics, each topic a distribution over words, and each word in a document is drawn by picking a topic from the document's mixture and a word from that topic. Fitting it (variational inference or Gibbs sampling) recovers the topics and each document's mixture from the word counts alone. It runs on counts, not TF-IDF, and it needs stop words removed and rare and ubiquitous terms pruned, or the topics are 'the, and, of'." },

    { t: "code", lang: "python", title: "Four topics on the four newsgroups, no labels used (executed; stop words removed, min_df 5, max_df 0.5, 30 iterations)",
      code: `topic 0: think, people, don, just, like, know, mr, president
topic 1: image, edu, graphics, file, software, jpeg, files, data
topic 2: team, 10, game, 25, hockey, 55, 11, play
topic 3: space, nasa, launch, earth, orbit, satellite, shuttle, data

dominant topic by true class:      topic 0   topic 1   topic 2   topic 3
   comp.graphics                       80       488         1        15
   rec.sport.hockey                    290        15       293         2
   talk.politics.misc                  448         9         4         4
   sci.space                           286        55         2       250
(9.2 s; perplexity 2,117)`,
      caption: "LDA found graphics, hockey, space and politics without being told they existed — and topic 0 is as much 'people arguing in the first person' as it is politics, which is why half the hockey and space posts land there. A topic model is a lens, not a classifier: K is a choice, judged by held-out perplexity, by coherence scores and above all by reading the topics; and it would have found four topics in a corpus with two or six." },

    { t: "ladder",
      title: "A text classifier for a support-ticket queue",
      rungs: [
        { level: "bad", label: "A fine-tuned transformer as the first move", code: `model = AutoModelForSequenceClassification.from_pretrained("bert-base"); trainer.train(...)`,
          note: "**Hours of GPU time and a model nobody can inspect, before anyone knows whether the labels are consistent or whether 88 % is already enough.**" },
        { level: "ok", label: "TF-IDF + linear SVM in a pipeline, cross-validated", code: `make_pipeline(TfidfVectorizer(sublinear_tf=True), LinearSVC()); cross_val_score(...)      # 0.884 in 0.5 s`,
          note: "The right baseline, honest about leakage, with readable weights that reveal label problems ('clinton' as the politics signal says the classifier is learning the era). Missing the retrieval side and the check of what the model has actually learned." },
        { level: "best", label: "The linear baseline as the yardstick, error analysis on its weights and mistakes, BM25 for the search box, and a transformer only where the measured gap justifies it", code: `baseline = TfidfVectorizer + LinearSVC (0.884); ComplementNB as the tiny-data fallback (0.891 here)
inspect coef_ per class; read the misclassified tickets; fix the labels first
BM25 index for 'similar tickets'; a transformer trial only if the gap on the business metric pays for the cost`,
          note: "Every later model is judged against a number that took half a second, and the weights are the first diagnostic of the data." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "In the three-sentence example 'the' appears twice in d1 and ends with weight 0.650, above 'cat' at 0.428, although 'cat' is rarer. Why is TF-IDF not zeroing the common word?",
          options: [
            "Because 'the' is not in the stop list",
            "Because scikit-learn's smoothed idf, ln((1 + N)/(1 + df)) + 1, is 1.288 for a word in two of three documents — still positive, and the '+ 1' means no term's weight is zero — so a term counted twice at idf 1.29 outweighs one counted once at idf 1.69",
            "Because the L2 norm inflates the largest entry",
            "Because df is computed over tokens rather than documents"
          ],
          answer: 1,
          why: "The textbook idf ln(N/df) would give 'the' 0.41, a quarter of 'cat'; the smoothed form used by scikit-learn is gentler, which is why stop-word removal and max_df still exist as options. On the newsgroups, removing English stop words moved the SVM from 0.884 to 0.889."
        },
        {
          stem: "A hashing vectoriser with 2¹² buckets scored 0.827 against 0.877 for 2¹⁸ and 0.884 for a real vocabulary of 28,969 terms. What is the trade?",
          options: [
            "Hashing always loses accuracy",
            "Hashing needs no fitted vocabulary — it works on streams, across machines and with unbounded vocabularies — at the cost of collisions, which are negligible when the buckets far outnumber the terms (2¹⁸ = 262,144 for 29,000 terms) and destructive when they do not (4,096)",
            "The hash function is not deterministic",
            "The idf cannot be computed for hashed features"
          ],
          answer: 1,
          why: "With 4,096 buckets for 29,000 terms every bucket holds about seven unrelated words and the classifier cannot separate them. The tf-idf weighting still applies (TfidfTransformer on the hashed counts); what is lost is the ability to read the weights back as words."
        },
        {
          stem: "The linear SVM's heaviest weight for the politics group is 'clinton'. What does that tell you about the model, and what should you do?",
          options: [
            "The model is correct — politics is about Clinton",
            "The model has learned the corpus's era rather than the concept of politics: it will fail on political text from another year. The weights are the diagnostic; the remedy is more diverse data or features that generalise (topics, embeddings), and at minimum a test set from a different period",
            "Remove 'clinton' from the vocabulary",
            "Increase C"
          ],
          answer: 1,
          why: "Readable weights are the classical model's great advantage: they show what was learned, and here they show a shortcut of the kind 9.3 found in the image classifier. Deleting the word hides the symptom; the class will simply be carried by the next most era-specific term."
        },
        {
          stem: "Why does BM25 give a document containing 'launch' 99 times only 12 % more credit than a short document containing it once?",
          options: [
            "Because idf is small for 'launch'",
            "Because term frequency saturates — the contribution is bounded by (k₁ + 1)·idf and the 99th occurrence adds almost nothing — and because the 5,942-word document is penalised for its length through b; a document is not more about launches for repeating the word",
            "Because BM25 ignores term frequency",
            "Because the long document is truncated"
          ],
          answer: 1,
          why: "Raw TF-IDF cosine has neither property in the same form: tf grows linearly (sublinear_tf helps) and the L2 norm penalises length differently. BM25's two parameters, k₁ for saturation and b for length, are what made it the standard for lexical retrieval."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "TF-IDF by hand, Naive Bayes by hand, and the vocabulary dial",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Four documents: 'red apple pie', 'apple juice', 'red red wine', 'apple pie'. Compute scikit-learn's smoothed idf for each term, the raw TF-IDF vector of d3, its L2 norm and the normalised vector, and check against `TfidfVectorizer`." },
        { t: "p", text: "**(b)** Training sentences: 'great match tonight' and 'team wins final' (sport); 'stock market falls', 'bank rates rise' and 'market rally lifts stocks' (finance). With Laplace smoothing, classify 'market wins tonight' by multinomial Naive Bayes, showing every P(word | class), and confirm with `MultinomialNB`." },
        { t: "p", text: "**(c)** On the four newsgroups with a linear SVM, vary `min_df` over 1, 2, 5, 10 and `max_df` over 1.0, 0.5, 0.1, and report the vocabulary size and test accuracy for each setting." }
      ],
      requirements: [
        "(a) five idfs, the raw and normalised vectors, the check.",
        "(b) the two log-probabilities with their terms and the verdict.",
        "(c) a seven-row table."
      ],
      hint: "(a) idf = ln((1 + N)/(1 + df)) + 1. (b) P(w | c) = (count + 1)/(total words in c + |V|). (c) Watch the vocabulary shrink faster than the accuracy falls, until it does not.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) df: apple 3, juice 1, pie 2, red 2, wine 1
#     idf: apple ln(5/4)+1 = 1.2231;  juice ln(5/2)+1 = 1.9163;  pie 1.5108;  red 1.5108;  wine 1.9163
#     d3 'red red wine' raw: red 2 × 1.5108 = 3.0217, wine 1.9163;  norm √(3.0217² + 1.9163²) = 3.5781
#     normalised: red 0.8445, wine 0.5356 = TfidfVectorizer's row;  'red' carries 71.3 % of d3's squared length

# (b) |V| = 15; word totals sport 6, finance 10; priors 2/5 and 3/5
#     sport:   ln(2/5) + ln P(market|sport) + ln P(wins|sport) + ln P(tonight|sport)
#              P(market|sport) = (0+1)/(6+15) = 0.0476;  P(wins|sport) = (1+1)/21 = 0.0952;  P(tonight|sport) = 0.0952     -> log P = −8.6636
#     finance: P(market|finance) = (2+1)/(10+15) = 0.1200;  P(wins|finance) = 1/25 = 0.0400;  P(tonight|finance) = 0.0400   -> log P = −9.0688
#     -> sport, by 0.405 in log-odds = P(sport) 0.60;  MultinomialNB: sport 0.60, finance 0.40. Smoothing is what keeps the unseen 'market' from zeroing sport.

# (c) min_df, max_df    vocabulary    test accuracy
#      1, 1.0            28,969          0.8840
#      2, 1.0            14,446          0.8767
#      5, 1.0             6,333          0.8693
#     10, 1.0             3,530          0.8572
#      2, 0.5            14,437          0.8780
#      2, 0.1            14,336          0.8760
#     20, 0.1             1,760          0.8237
#     -- min_df 2 halves the vocabulary for 0.7 points; max_df barely changes anything (few terms are in more than a tenth of the posts);
#        the rare terms carry real signal on this corpus, and a vocabulary of 1,760 costs six points`,
        notes: [
          { t: "p", text: "(a) is the exact arithmetic scikit-learn performs, which is not the textbook's; knowing the difference explains why a common word keeps a weight." },
          { t: "p", text: "(b) is the multinomial model as a product of smoothed word probabilities, the reason it works with five sentences." },
          { t: "p", text: "(c) is the vocabulary as a memory-versus-accuracy dial, with the surprise that rare words matter more than frequent ones here." }
        ]
      }
    }
  ],

  takeaways: [
    "Tokenise by rule, stem by string surgery (fast, non-words: 'studi', 'wa'), lemmatise by dictionary with a part of speech ('better' → 'good' only as an adjective); for a TF-IDF classifier the choice is minor, for matching 'cats' to 'cat' it is not, and character n-grams are the linguistics-free alternative.",
    "TF-IDF is counts × a rarity weight × a unit norm; scikit-learn's idf is ln((1 + N)/(1 + df)) + 1, so a common word is down-weighted, not removed (0.650 for 'the' against 0.428 for 'cat'); sublinear_tf, min_df, max_df and n-grams are the dials, and the hashing trick trades a vocabulary for collisions (0.877 at 2¹⁸ buckets, 0.827 at 2¹²).",
    "On four newsgroups a linear SVM on TF-IDF reached 0.884 in 0.5 s and complement Naive Bayes 0.891; the weights name the classes and expose shortcuts ('clinton'); the vectoriser is fitted inside the pipeline and inside each fold, and the grid's defaults won.",
    "Retrieval ranks by cosine on TF-IDF or by BM25, whose k₁ saturates term frequency (99 occurrences earned 12 % more than one) and whose b penalises length; BM25 is the first stage of modern search, dense embeddings the second.",
    "LDA recovers topics from counts without labels — graphics, hockey, space and a 'people arguing' topic that swallowed half of two groups — and K is a choice judged by perplexity, coherence and reading.",
    "The classical pipeline is the yardstick and the first diagnostic; a transformer is the next step only when the measured gap on the business metric pays for a thousand-fold cost."
  ],

  quiz: {
    title: "Text with Classical Models — Knowledge Check",
    questions: [
      {
        stem: "Why does multinomial Naive Bayes work with five training sentences when a linear SVM would not?",
        options: [
          "Because it does not use the words",
          "Because it estimates one smoothed probability per word per class, which needs almost no data, and combines them by a product — its independence assumption is false and its probabilities are miscalibrated, but the argmax is often right; Laplace smoothing kept an unseen word from zeroing a class in the worked example",
          "Because it uses TF-IDF",
          "Because it has no hyperparameters"
        ],
        answer: 1,
        why: "Naive Bayes is a high-bias, low-variance model: counts plus smoothing, no optimisation. It loses to a linear model once there are a few thousand documents (0.869 against 0.884 here) and wins on the first few hundred; complement NB, which counts the words of all other classes, fixes its bias toward wordy classes and won outright on this corpus."
      },
      {
        stem: "A TF-IDF vectoriser is fitted on the entire corpus before the train/test split. What leaks, and how much does it matter?",
        options: [
          "Nothing leaks — idf has no labels",
          "The vocabulary and the idf weights are computed with the test documents' word statistics, so the test set has shaped the features; it involves no labels and its effect is small on a large corpus (identical accuracy in the executed check) but can be material on a small one, and it is the same discipline as every other fitted transformer: fit on train, inside the fold",
          "The class priors leak",
          "The test labels leak through max_df"
        ],
        answer: 1,
        why: "The rule is not about this leak's size but about not having to reason about it: the vectoriser is a fitted step of the pipeline, and the pipeline is what cross-validation refits. The executed grid did exactly that and found the defaults best."
      },
      {
        stem: "For a search box over support tickets, why prefer BM25 to cosine on TF-IDF?",
        options: [
          "BM25 uses embeddings",
          "BM25 saturates term frequency (a term's credit is bounded by (k₁ + 1)·idf) and normalises length by a tunable b, so a long ticket that repeats a word does not dominate and a short ticket is not favoured for being short; on the executed queries both ranked sensibly but BM25's top 5 for 'goalie save playoff' were four hockey posts to cosine's three",
          "BM25 does not need a vocabulary",
          "Cosine cannot rank more than one query term"
        ],
        answer: 1,
        why: "Cosine on unit-normalised TF-IDF rewards concentration — a document about nothing but the query — and grows linearly with repetition unless sublinear_tf is set. BM25's two parameters encode decades of retrieval evaluation and remain the lexical baseline that dense retrievers are combined with rather than replace."
      },
      {
        stem: "LDA with K = 4 put 290 of 600 hockey posts and 286 of 593 space posts in the 'politics' topic. Is the model wrong?",
        options: [
          "Yes — LDA should recover the classes",
          "No — LDA models word co-occurrence, not the labels: topic 0 is 'first-person argument' (think, people, don, just, know), a real pattern shared across groups; a topic model is a lens on the corpus, and K, the stop list and the pruning are choices judged by coherence and reading, not by agreement with labels it never saw",
          "Yes — K should have been 3",
          "No — the posts were mislabelled"
        ],
        answer: 1,
        why: "The executed result is typical: three clean topical clusters and one discourse cluster. Treating a topic model as a classifier is the mistake; using it to discover that half the corpus is argument rather than content is the point."
      },
      {
        stem: "When is a fine-tuned transformer worth its cost over a TF-IDF linear model?",
        options: [
          "Always — it is state of the art",
          "When the measured gap matters: the linear model gives a number in half a second (0.884 here) and readable weights; a transformer typically adds several points at a thousand times the training cost and no inspectable weights, which pays when the task depends on word order, paraphrase or context (sentiment with negation, entailment, short ambiguous text) and the points translate into a business outcome",
          "Never for classification",
          "Only when the corpus is small"
        ],
        answer: 1,
        why: "The classical pipeline is the yardstick that makes the transformer's gain a measured quantity rather than an assumption, and its weights are the first check on the labels. On bag-of-words-friendly tasks — topic classification, spam, routing — the gap is small; on meaning-dependent tasks it is large, and that is where the cost is justified."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Text with Classical Models",
    sub: "Representations, the classical classifiers, retrieval and topics.",
    questions: [
      {
        level: "Core",
        q: "Explain TF-IDF and why it is normalised.",
        strong: "Each document becomes a vector over the vocabulary; the entry for a term is its count in the document times an inverse document frequency that down-weights terms found in many documents — scikit-learn's is ln((1 + N)/(1 + df)) + 1, smoothed so that nothing is zero — and the row is then scaled to unit length so that long documents do not dominate distances. Worked on three sentences: 'the', in two of three documents with count two, ends at 0.650, and 'cat', in one document with count one, at 0.428 — common words are damped, not removed, which is why stop-word lists and max_df still exist. The unit norm is what makes cosine similarity a dot product and what stops a 6,000-word post from outscoring a 20-word one merely by size; sublinear tf, 1 + ln(count), does the same for repetition within a document. On four newsgroups the representation plus a linear SVM reached 88 % in half a second, with weights that read as the class names.",
        answer: [
          { t: "p", text: "Counts, the smoothed idf with the worked numbers, the norm and what it prevents, sublinear tf, and the executed result." }
        ]
      },
      {
        level: "Core",
        q: "How does multinomial Naive Bayes classify text, and where does it fail?",
        strong: "It models each class as a bag of word probabilities: P(w | c) is the smoothed share of the class's words that are w, and a document's score for a class is the log prior plus the sum of the log word probabilities. On five training sentences I classified 'market wins tonight' by hand: P(market | sport) = (0 + 1)/(6 + 15) with Laplace smoothing — the unseen word does not zero the class — against P(market | finance) = 3/25, and sport won by 0.4 in log-odds, which scikit-learn reproduced. It fails in two ways: the independence assumption makes its probabilities badly calibrated, so use its argmax and not its confidence; and its class scores are biased toward classes with more total words, which complement Naive Bayes corrects — on the newsgroups complement NB reached 0.891, multinomial 0.869. It remains the fastest baseline and the one that works with tiny data.",
        answer: [
          { t: "p", text: "The model with the hand-worked example, the two failure modes with the complement fix, and its place as a baseline." }
        ]
      },
      {
        level: "Senior",
        q: "What are the hashing trick's advantages and costs for text features?",
        strong: "Instead of building a vocabulary and mapping each token to a column, hash the token into one of 2ⁿ buckets and count there. No fitting step, so no vocabulary to store or synchronise, features for new words appear automatically, and the transform is stateless — which makes it the right choice for streams, online learning with partial_fit, and training across machines. The costs: collisions, which are negligible when buckets far outnumber terms (2¹⁸ buckets for 29,000 terms cost 0.7 points against a true vocabulary) and destructive when they do not (2¹² buckets cost six points), and the loss of interpretability, because a bucket is not a word and the classifier's weights can no longer be read back — though a debugging pass can hash a candidate word list to find which bucket a heavy weight belongs to. The idf weighting still applies through a TfidfTransformer on the hashed counts.",
        answer: [
          { t: "p", text: "Mechanism, the three advantages, the executed collision costs, and the interpretability loss." }
        ]
      },
      {
        level: "Senior",
        q: "Explain BM25 and how it differs from cosine similarity on TF-IDF.",
        strong: "BM25 scores a document for a query as a sum over query terms of idf times a saturating function of the term's count, tf·(k₁ + 1)/(tf + k₁(1 − b + b·|d|/avgdl)). Two properties come from the two parameters: k₁ saturates term frequency so that a term's contribution is bounded by (k₁ + 1)·idf — executed, 'launch' 99 times in a 6,000-word post earned 12 % more than once in a 23-word one — and b interpolates between no length normalisation and full normalisation by the document's length relative to the average. Cosine on TF-IDF instead rewards concentration: a short document consisting of the query terms is a perfect match, and repetition counts linearly unless sublinear tf is used. On the newsgroups both rank the obvious queries the same and diverge on the details — BM25 found four hockey posts in its top five for a hockey query where cosine found three. BM25 is the standard lexical first stage; dense retrievers handle paraphrase and are usually combined with it rather than substituted.",
        answer: [
          { t: "p", text: "The formula and what k₁ and b do with the executed example, the contrast with cosine, and BM25's role in a modern stack." }
        ]
      },
      {
        level: "Staff",
        q: "A team wants to classify a million customer messages into forty intents. Walk me through your approach and where a transformer enters.",
        strong: "Start with the data: sample and read messages, check the labels for consistency, because at forty intents the boundaries are the first problem and no model fixes an inconsistent label set. Then the classical baseline within an hour: a TF-IDF vectoriser with unigrams and bigrams and sublinear tf, a linear SVM or logistic regression one-versus-rest, stratified cross-validation with the vectoriser inside the pipeline, and per-class precision and recall — on four newsgroups this pipeline scores 88 % in half a second, and at a million messages it still trains in minutes. Read the weights per class: they reveal leaked identifiers, era-specific terms and intents that are lexically indistinguishable, which is a label-design finding. Add complement Naive Bayes as the fallback for intents with few examples, and a hashing vectoriser if the pipeline must run online. For the search side — 'similar messages' — a BM25 index. Now the gap: the classical model's per-class errors show which intents depend on meaning rather than vocabulary — negation, paraphrase, short ambiguous messages — and that is where a fine-tuned transformer is trialled, on those classes, measured against the baseline on the same folds and on the business metric of correct routing, with its serving cost (11.1) in the comparison. If it wins by enough on those classes, a two-stage system: the linear model for the easy majority, the transformer for the hard minority; if not, the baseline ships. The classical model is never wasted — it is the yardstick, the label audit and the fallback.",
        answer: [
          { t: "p", text: "Label audit, the fast baseline with the executed benchmark, weight inspection as diagnosis, NB and hashing as fallbacks, BM25 for search, and the transformer trialled where the errors say meaning matters." }
        ]
      }
    ]
  }
});

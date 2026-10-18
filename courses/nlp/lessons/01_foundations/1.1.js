/* ============================================================================
   LESSON 1.1 — The NLP Pipeline
   Every pipeline stage is run on one sentence and its cost measured
   (scratchpad/nlp/n11.py).
   ========================================================================= */
EC.receiveLesson({
  id: "1.1",

  lede: "**Every stage of an NLP pipeline throws something away, and the question is always whether you needed it.** Lowercasing loses the difference between *Apple* and *apple*. Stopword removal is worse: it turns *\"this movie is not good\"* and *\"this movie is good\"* into **the same two words**. This lesson runs the classical pipeline on one sentence, measures what each step destroys, and explains why modern models skip most of it.",

  objectives: [
    "Name the stages of the classical NLP pipeline and what each one does",
    "Measure what a preprocessing stage discards",
    "Distinguish understanding tasks from generation tasks",
    "Explain why transformer pipelines skip most classical preprocessing",
    "Place the field's eras and the shift they represent"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "The vocabulary", id: "definitions" },

    {"kind": "layers", "title": "Nine terms, and the one number that dates the whole list", "caption": "Every term above the line is a decision about **what a token is and how many of them there are**; every term below it is a decision about **how a token becomes a number**. The perplexity row is the one that shows how far the field moved: **a good trigram model sits near 80 and a modern LLM near 3–10**, which is the same metric reporting an order-of-magnitude different world.", "items": [{"label": "Corpus, token, tokenization", "sub": "what the atomic unit is", "tone": "accent", "side": "the split"}, {"label": "Stemming, lemmatisation, stopwords", "sub": "which distinctions you throw away", "tone": "accent", "side": "the squeeze"}, {"label": "Bag of Words, TF-IDF", "sub": "counts, then counts weighted by rarity", "tone": "good", "side": "sparse"}, {"label": "Word embedding", "sub": "a dense vector where near means similar", "tone": "violet", "side": "dense"}, {"label": "n-gram, perplexity", "sub": "the model, and how surprised it is", "tone": "teal", "side": "80 -> 3-10"}], "t": "diagram", "id": "dg-1_1-01-0"},









    { t: "dl", items: [
      ["Corpus / token", "A body of text / the atomic unit you split it into — word, subword or character."],
      ["Tokenization", "Splitting text into tokens. Subword schemes like BPE and WordPiece handle rare words."],
      ["Stemming vs lemmatisation", "Crude suffix-chopping (`studies → studi`) against dictionary lookup (`studies → study`)."],
      ["Stopwords", "Very common words — *the*, *is*, *and* — often removed, but **not** for sentiment or question answering."],
      ["Bag of Words", "A document as word counts, ignoring order."],
      ["TF-IDF", "Frequency in the document × rarity across the corpus — highlights distinctive terms."],
      ["n-gram", "A sequence of n consecutive tokens. The basis of classical language models."],
      ["Perplexity", "How surprised a language model is. Lower is better — a good trigram model sits near 80, a modern LLM near 3–10."],
      ["Word embedding", "A dense vector capturing meaning, so similar words land near each other."]
    ] },

    { t: "h2", n: "02", text: "The pipeline, run", id: "pipeline" },

    { t: "diagram", kind: "steps", title: "Raw text to a decision",
      caption: "Six stages. Modern transformer pipelines keep the first, second and fourth, and skip the rest.",
      items: [
        { label: "Preprocessing", sub: "lowercase, strip noise, fix encoding", tone: "accent" },
        { label: "Tokenization", sub: "split into words, subwords or characters", tone: "accent" },
        { label: "Normalisation", sub: "stem, lemmatise, drop stopwords", tone: "warn" },
        { label: "Vectorisation", sub: "BoW, TF-IDF, embeddings", tone: "teal" },
        { label: "Model", sub: "classification, NER, generation", tone: "good" },
        { label: "Post-processing", sub: "decode, format, filter, validate", tone: "violet" }
      ] },

    { t: "out", text: `  raw            : "  The CEO of OpenAI didn't visit NYC's offices in 2024 -- he e-mailed instead!  "
  strip          : "The CEO of OpenAI didn't visit NYC's offices in 2024 -- he e-mailed instead!"
  lowercase      : "the ceo of openai didn't visit nyc's offices in 2024 -- he e-mailed instead!"
  tokenize       : ['the', 'ceo', 'of', 'openai', "didn't", 'visit', "nyc's", 'offices', 'in', '2024', 'he', 'e', 'mailed', 'instead']
  stopwords out  : ['ceo', 'openai', "didn't", 'visit', "nyc's", 'offices', '2024', 'e', 'mailed']
  14 tokens -> 9 after stopword removal (36% discarded)` },

    { t: "h2", n: "03", text: "What each stage destroyed", id: "cost" },

    {"kind": "trace", "title": "Four tokens, four different fates, from one regex", "caption": "The pattern is a single character class and it draws four different lines. **`didn't` survives whole because the apostrophe is inside the class; `e-mailed` is split in two because the hyphen is not.** Neither outcome was chosen — both fell out of one decision about which characters count as word characters. Which is the lesson: **preprocessing destroys information you did not decide to destroy**, and the only way to know what it did is to print it.", "left": "input", "codeW": 150, "vars": ["what came out", "what was lost"], "steps": [{"code": "\"didn't\"", "state": ["[\"didn't\"]", "nothing"], "tone": "good", "note": "apostrophe is inside the class"}, {"code": "'e-mailed'", "state": ["['e', 'mailed']", "one word became two"], "changed": [0, 1], "tone": "crit", "note": "hyphen is not"}, {"code": "\"NYC's\"", "state": ["[\"nyc's\"]", "the capitals"], "changed": [0, 1], "tone": "warn"}, {"code": "'2024'", "state": ["['2024']", "nothing"], "changed": [0, 1], "tone": "good"}, {"code": "'--' and '!'", "state": ["gone entirely", "both"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-1_1-03-1"},









    { t: "out", text: `  lowercasing lost the CEO/ceo distinction, and 'NYC' -> 'nyc'
  "didn't"   -> ["didn't"]   (one token: the apostrophe is inside the class)
  'e-mailed' -> ['e', 'mailed']   (the hyphen SPLIT it into two)
  "NYC's"    -> ["nyc's"]   (the possessive rides along)
  '2024' survived; '--' and '!' are gone entirely` },

    { t: "callout", kind: "trap", title: "A regex tokenizer makes decisions you did not think about",
      body: [{ t: "p", text: "`[a-z0-9']+` keeps the apostrophe, so `didn't` survives as one token — good. But the same rule has no opinion about hyphens, so **`e-mailed` becomes `e` and `mailed`**, and now your vocabulary contains a meaningless single letter. `NYC's` keeps its possessive, which may or may not be what you want. Every character class is a policy, and the policy applies to text you have not seen yet. This is the fundamental reason subword tokenizers took over: they *learn* the splits from the corpus instead of asserting them." }] },

    { t: "h2", n: "04", text: "Stopword removal is not free", id: "stopwords" },

    {"kind": "trace", "title": "Two opposite sentences, one identical output", "caption": "This is the measurement that decides the question, and it is not a matter of degree: **“this movie is not good” and “this movie is good” both reduce to `movie good`.** The stopword list contains *not*, so the one word carrying the sentiment is the one removed — **and the classifier downstream cannot recover it, because the two inputs are now the same string.** The question-answering row loses *who* and *of*, which is most of the question's structure.", "left": "task and input", "codeW": 230, "vars": ["after stopword removal"], "steps": [{"code": "sentiment: 'this movie is not good'", "state": ["movie good"], "tone": "crit"}, {"code": "sentiment: 'this movie is good'", "state": ["movie good"], "tone": "crit", "note": "identical"}, {"code": "QA: 'who is the ceo of openai'", "state": ["ceo openai"], "changed": [0], "tone": "crit", "note": "the question is gone"}], "t": "diagram", "id": "dg-1_1-04-2"},









    { t: "out", text: `  sentiment          'this movie is not good'
                     -> 'movie good'
  sentiment          'this movie is good'
                     -> 'movie good'
  question answering 'who is the ceo of openai'
                     -> 'ceo openai'` },

    { t: "callout", kind: "crit", title: "The two sentiment examples became identical",
      body: [{ t: "p", text: "`not` is on virtually every standard stopword list, including NLTK's. Remove it and a negative review and a positive review reduce to the same two words — the model cannot possibly separate them, and no amount of capacity downstream recovers the distinction. The same applies to question answering: `who`, `what`, `where` and `when` are all stopwords, and they are precisely the part of the question that determines what answer is wanted. **Stopword removal is a technique for tasks where only topic matters** — document retrieval, topic modelling — and it is actively destructive for sentiment, QA, negation-sensitive extraction and anything involving function words." }] },

    { t: "h2", n: "05", text: "What the normalisation buys", id: "vocabulary" },

    {"kind": "trace", "title": "Fifteen types to ten, and what survives tells you the rest", "caption": "**A 33% smaller vocabulary from one `.lower()` call** — and that is the whole argument for preprocessing: fewer parameters to learn and more examples per type, which mattered enormously when the model was a linear classifier over sparse counts. **Read what survives, though: `cat` and `cats` are still two types, and `sat` and `sitting` are still two.** Case was the cheap half; morphology is what stemming and lemmatisation are for.", "left": "stage", "codeW": 190, "vars": ["types", "still distinct"], "steps": [{"code": "raw whitespace split", "state": ["15", "A / a, The / the, CAT / cat"], "tone": "crit"}, {"code": "after lowercasing", "state": ["10  (33% smaller)", "cat / cats, sat / sitting"], "changed": [0, 1], "tone": "good"}, {"code": "what is left to collapse", "state": ["-", "morphology, not case"], "tone": "violet"}], "t": "diagram", "id": "dg-1_1-05-3"},









    { t: "out", text: `  raw whitespace split : 15 types
    ['A', 'CAT', 'Cats', 'Mat', 'Sat', 'The', 'a', 'cat', 'is', 'mat', 'mats', 'on', 'sat', 'sitting', 'the']
  after lowercasing    : 10 types  (33% smaller)
    ['a', 'cat', 'cats', 'is', 'mat', 'mats', 'on', 'sat', 'sitting', 'the']` },

    { t: "p", text: "Across four short sentences, lowercasing collapses 15 distinct types to 10. That is the whole argument for preprocessing: **a smaller vocabulary means fewer parameters to learn and more examples per type**, which mattered enormously when the model was a linear classifier over sparse counts. Note what survives — `cat` and `cats`, `sat` and `sitting` are still separate, which is what stemming and lemmatisation go after in the next lesson." },

    { t: "h2", n: "06", text: "Understanding and generation", id: "taxonomy" },

    { t: "diagram", kind: "compare", title: "The task taxonomy",
      caption: "The combined tasks are combined because they understand first and then generate.",
      columns: [
        { title: "Understanding · NLU", tone: "accent", items: [
          "Text classification",
          "Sentiment analysis",
          "Named entity recognition",
          "POS tagging and dependency parsing",
          "Coreference and relation extraction",
          "Textual entailment"
        ] },
        { title: "Generation · NLG", tone: "good", items: [
          "Summarisation",
          "Machine translation",
          "Text generation",
          "Paraphrasing",
          "Dialogue systems",
          "Data-to-text and code generation"
        ] }
      ] },

    { t: "out", text: `  NLU  (8 tasks): text classification, sentiment analysis, NER, POS tagging, ...
  NLG  (7 tasks): summarization, machine translation, text generation, paraphrasing, ...
  both (3 tasks): question answering, conversational AI, information extraction` },

    { t: "p", text: "Question answering, conversational AI and information extraction sit in both columns because they require the model to understand an input and then produce a new output — which is exactly the encoder-decoder shape module 4 derives." },

    { t: "h2", n: "07", text: "Why the pipeline shrank", id: "evolution" },

    {"kind": "timeline", "title": "Six eras, and the pipeline got shorter as the model got bigger", "caption": "The bars are eras rather than durations, and the trend is the point: **every stage of hand-built preprocessing in this lesson was invented for the era where the model was a linear classifier over sparse counts.** Rule-based meant regexes and CFG parsers; statistical meant Naive Bayes, SVM, CRF and HMM; then Word2Vec and GloVe, then ELMo, then BERT and T5, then GPT-4 and Claude. **As the model absorbed more of the work, the pipeline in front of it shrank** — so most of what this lesson measures is now a decision you make about the input rather than a step you must run.", "span": 80, "tick": 10, "unit": "years, 1950 to 2030", "lanes": [{"label": "rule-based", "bars": [[0, 40, "regexes, parsers", "crit"]]}, {"label": "statistical ML", "bars": [[40, 60, "Naive Bayes, SVM", "warn"]]}, {"label": "shallow neural", "bars": [[63, 67, "W2V", "accent"]]}, {"label": "deep neural", "bars": [[67, 68, "", "accent"]]}, {"label": "transformers", "bars": [[68, 72, "BERT", "good"]]}, {"label": "LLMs", "bars": [[72, 80, "GPT-4", "good"]]}], "t": "diagram", "id": "dg-1_1-07-4"},









    { t: "table", head: ["Era", "Approach", "Examples"],
      rows: [
        ["1950s–1990s", "Rule-based and symbolic", "Regular expressions, CFG parsers"],
        ["1990s–2010s", "Statistical machine learning", "Naive Bayes, SVM, CRF, HMM"],
        ["2013–2017", "Neural, shallow", "Word2Vec, GloVe, FastText"],
        ["2017–2018", "Neural, deep", "ELMo — contextual embeddings"],
        ["2018–2022", "Transformers", "BERT, GPT-2, T5, RoBERTa"],
        ["2022–present", "Large language models", "GPT-4, Claude, Gemini, Llama"]
      ] },

    { t: "callout", kind: "insight", title: "The shift is from feature engineering to representation learning",
      body: [{ t: "p", text: "Every stage in the classical pipeline exists to help a weak model — a linear classifier over sparse counts cannot learn that `cats` and `cat` are related, so you stem them together. A transformer trained on enough text learns that relationship from data, so the stage becomes not merely unnecessary but harmful, since it destroys information the model could have used. That is why a modern pipeline is *tokenize, embed, model*: three stages instead of six, with the subword tokenizer learned from the corpus rather than hand-written. Understanding the classical stages still matters, both because you will meet them in existing systems and because each one names a genuine property of language that the model now has to learn on its own." }] },

    { t: "exercise", kind: "practice", title: "Measure your own pipeline", difficulty: "foundation", minutes: 30,
      prompt: "Take a few hundred documents from any text source. Run them through each pipeline stage in turn and record the vocabulary size after each — raw, lowercased, punctuation stripped, stopwords removed, stemmed. Plot the curve. Then pick a task with a known answer, such as sentiment on labelled reviews, and train the same simple classifier on the output of each stage to see where accuracy peaks. Finally, find three documents where stopword removal changes the meaning.",
      hints: [
        "Vocabulary size falls fastest at lowercasing and stemming.",
        "Accuracy often peaks before the most aggressive normalisation, not after.",
        "Negation, questions and comparatives are where stopword removal breaks things."
      ],
      solution: {
        notes: [
          { t: "p", text: "The vocabulary curve falls steeply at first and then flattens, which is the practical argument for the early stages and against the late ones — you get most of the compression from lowercasing and punctuation, and stemming adds relatively little while destroying more. Where the accuracy curve peaks is dataset-dependent and worth knowing for your own data rather than assuming." },
          { t: "p", text: "The three broken documents are the exercise's real point. Negation is the easy one — I measured 'this movie is not good' and 'this movie is good' collapsing to the identical 'movie good'. Questions are the second: remove `who`, `what` and `where` and a question loses the thing that specifies what kind of answer it wants. Comparatives are the third, since `more`, `less`, `than` and `most` are all stopwords and all carry the comparison." }
        ]
      } }

  ],

  takeaways: [
    "The classical pipeline is preprocess, tokenize, normalise, vectorise, model, post-process.",
    "Every stage discards information — the question is whether your task needed it.",
    "Stopword removal made 'this movie is not good' and 'this movie is good' identical.",
    "`not`, `who`, `what` and `where` are standard stopwords and are exactly what sentiment and QA depend on.",
    "A regex tokenizer encodes policies you did not think about: `e-mailed` split into `e` and `mailed`.",
    "Lowercasing cut a 15-type vocabulary to 10 — the compression that mattered for weak models.",
    "The field moved from feature engineering to representation learning, which is why modern pipelines are three stages."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why is stopword removal dangerous for sentiment analysis?",
      options: ["It makes the vocabulary too small", "`not` is a standard stopword, so negated and non-negated sentences become identical", "It slows down training", "It breaks the tokenizer"],
      answer: 1,
      why: "Measured directly: 'this movie is not good' and 'this movie is good' both reduce to 'movie good' after standard stopword removal. The distinction is destroyed before the model sees the text, so no amount of downstream capacity can recover it. The same applies to question words in QA." },
    { stem: "A regex tokenizer using `[a-z0-9']+` processes 'e-mailed'. What does it produce?",
      options: ["['e-mailed']", "['e', 'mailed']", "['email']", "['e-mail', 'ed']"],
      answer: 1,
      why: "The hyphen is not in the character class, so it acts as a separator and the word splits into a meaningless single letter and a fragment. Every character class is a policy applied to text you have not seen yet — which is the argument for learned subword tokenizers over hand-written rules." },
    { stem: "Why do modern transformer pipelines skip most classical preprocessing?",
      options: ["It is too slow", "The model learns those relationships from data, so preprocessing only destroys information", "The libraries no longer support it", "Transformers require raw text"],
      answer: 1,
      why: "Classical stages exist to help a weak model: a linear classifier over sparse counts cannot learn that `cats` relates to `cat`, so you stem them together. A transformer trained on enough text learns that from data, which makes the stage harmful rather than merely redundant — it removes signal the model would have used." },
    { stem: "Which task belongs to both understanding and generation?",
      options: ["Named entity recognition", "Machine translation", "Question answering", "POS tagging"],
      answer: 2,
      why: "Question answering must understand the question and then produce an answer, which is why it sits in both columns alongside conversational AI and information extraction. NER and POS tagging are pure understanding; translation is generation conditioned on an input, which is the encoder-decoder shape." }
  ] },

  interview: { title: "Interview", sub: "NLP fundamentals", questions: [
    { level: "Core", q: "What is the standard NLP pipeline?",
      strong: "Preprocess, tokenize, normalise, vectorise, model, post-process — and modern pipelines skip most of it.",
      answer: [{ t: "p", text: "Classically: preprocessing to lowercase and strip noise, tokenization to split into units, normalisation through stemming, lemmatisation and stopword removal, vectorisation into bag of words, TF-IDF or embeddings, then the model, then post-processing to decode and validate. What I would add is that modern transformer pipelines skip most of the middle. They tokenize into subwords with a learned scheme and feed that straight to the model, because the normalisation stages exist to help a weak model — a linear classifier over counts cannot learn that `cats` and `cat` are related, so you stem them together, whereas a transformer learns that from data. Once the model can learn it, removing the information is actively harmful. So the classical stages are worth knowing because you meet them in existing systems and because each names a real property of language, but I would not add them to a new pipeline without a reason." }] },
    { level: "Core", q: "When would you not remove stopwords?",
      strong: "Sentiment, question answering, negation-sensitive extraction — anywhere function words carry meaning.",
      answer: [{ t: "p", text: "Whenever the function words carry the signal, which is more often than people assume. The clearest case is sentiment: `not` appears on essentially every standard stopword list, and I have measured 'this movie is not good' and 'this movie is good' collapsing to the identical 'movie good' after removal. The negative and positive review become the same input. Question answering is the second: `who`, `what`, `where` and `when` are stopwords and they are exactly the part specifying what kind of answer is wanted. Comparatives are a third, since `more`, `less` and `than` all go. Stopword removal is a technique for tasks where only topic matters — document retrieval, topic modelling — where the common words genuinely are noise. For anything that depends on the relationship between content words rather than just their presence, it destroys the task." }] },
    { level: "Senior", q: "How has NLP changed since 2013, and what does that mean for how you build?",
      strong: "From feature engineering to representation learning; build on pretrained models and keep preprocessing minimal.",
      answer: [{ t: "p", text: "The single shift is from feature engineering to representation learning. Up to about 2013 the work was designing features — n-grams, TF-IDF weights, hand-written patterns — and feeding them to a statistical model. Word2Vec and GloVe made representations learnable but still static, one vector per word type regardless of context. ELMo made them contextual, transformers made contextual representations cheap to pretrain at scale, and from 2018 the default became taking a pretrained model and adapting it. Practically that changes three things about how I build. Preprocessing should be minimal, because each classical stage destroys information the model could have used. The first question on any new task is which pretrained model covers it, not which architecture to design. And the effort moves to data, evaluation and the adaptation strategy, because that is where the remaining variance is. What has not changed is that you still need to know what the classical stages were for, since every one of them names a property of language the model now has to learn on its own." }] }
  ] }
});

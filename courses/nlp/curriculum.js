/* ============================================================================
   NLP AND TRANSFORMERS — CURRICULUM
   ----------------------------------------------------------------------------
   The course mirrors the reference folder tutorial-hub/06_NLP_and_Transformers
   file for file and section for section, in the reference's own order,
   rewritten in this site's voice. Nothing is added to the topic list and
   nothing in the reference is left out:

     LEARN track (one module per reference file or per run of that file's
     sections; each file's interview section is folded into the interview
     block of the lesson it belongs to)

       M1  01_NLP_Notes.md                §1–8   → 1.1–1.8
       M2  01_NLP_Notes.md                §9–16  → 2.1–2.8
       M3  01_NLP_Notes.md                §17–26 → 3.1–3.8, §27 → interview blocks
       M4  02_Transformers_InDepth.md     §1–11  → 4.1–4.10
       M5  02_Transformers_InDepth.md     §12–25 → 5.1–5.12, §21 → interview blocks
       M6  02a + 02b + 02c worked examples        → 6.1–6.7
       M7  03_Multimodal_AI.md            §1–11  → 7.1–7.8, §12 → interview blocks
       M8  04_Fuzzy_Matching.md           §1–8   → 8.1–8.5

     PRACTICE track (Sample_Programs/Part_08, imported by
       .build/import-banks.py: the NLP programs run with their output)

     INTERVIEW track (Interview_Questions/06_NLP_Interview.md: 100 questions
       across five sections, imported)

   Every formula in the learn track is carried through on numbers and every
   program is the reference's own, run on this machine; the printed output
   beneath a program is what it printed. Where a program could not run here —
   a missing model download, a service that is not local — the lesson says so.
   ========================================================================= */
(function () {
  EC.defineCourse({
    id: "nlp",
    title: "NLP and Transformers",
    short: "NLP",
    blurb: "Classical NLP from the pipeline to the task catalogue, the transformer derived from the dot product and then traced twice on real numbers, the modern stack from GQA to Mamba, multimodal models and fuzzy matching — then the programs and the interview bank.",

    trackLabels: { learn: "NLP and Transformers", practice: "Practice", interview: "Interview" },
    trackBlurbs: {
      learn: "The reference notes, section by section — every matrix worked on a number, every program run.",
      practice: "The reference's NLP programs with their output, answers folded away.",
      interview: "One hundred questions across NLP, transformers, applications and HuggingFace, answers hidden until you ask."
    },

    published: ["1.1", "i1.1", "i1.2", "i1.3", "i1.4", "i1.5", "p1.1", "p1.2"],

    modules: [

      /* ================================================================
         M1 · 01_NLP_Notes.md §1–8
         ================================================================ */
      {
        id: "foundations",
        short: "M1",
        dir: "01_foundations",
        phase: "Phase 1 · Classical NLP",
        title: "Text, Tokens and Vectors",
        blurb: "The NLP pipeline and what each stage costs, preprocessing decisions that change the answer, tokenization from whitespace to BPE with the merges computed by hand, bag of words and TF-IDF worked on a corpus you can check, n-gram language models with their smoothing, word embeddings and the geometry that makes them useful, named entity recognition and the tagging schemes, then part-of-speech tags and dependency parses.",
        outcome: "You can turn raw text into a representation a model can use, and say what every step threw away.",
        source: "01_NLP_Notes.md",
        lessons: [
          { id: "1.1", title: "The NLP Pipeline", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "What natural language processing is, the stages from raw text to a decision, where each stage can fail, and why modern pipelines skip most of the classical steps.",
            keywords: ["nlp", "pipeline", "corpus", "document", "token", "vocabulary", "ambiguity"] },
          { id: "1.2", title: "Text Preprocessing", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "Lowercasing, punctuation, stop words, stemming and lemmatisation — each with what it gains and what it destroys, and the tasks where each is wrong.",
            keywords: ["preprocessing", "lowercase", "stopwords", "stemming", "lemmatization", "normalization", "regex"] },
          { id: "1.3", title: "Tokenization In Depth", difficulty: "core", minutes: 36, tier: "must",
            summary: "Word, character and subword tokenization; BPE merges computed by hand on a small corpus; WordPiece and SentencePiece; and why the vocabulary size is the decision that matters.",
            keywords: ["tokenization", "bpe", "wordpiece", "sentencepiece", "subword", "vocabulary", "oov"] },
          { id: "1.4", title: "Bag of Words and TF-IDF", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "The document-term matrix, why raw counts mislead, and TF-IDF derived and computed on a corpus small enough to verify every number.",
            keywords: ["bag of words", "tf-idf", "document term matrix", "sparse", "idf", "count vectorizer"] },
          { id: "1.5", title: "N-grams and Classical Language Models", difficulty: "core", minutes: 32, tier: "must",
            summary: "The Markov assumption, maximum-likelihood n-gram probabilities, why unseen n-grams break everything, and the smoothing that fixes it — with perplexity as the judge.",
            keywords: ["n-gram", "markov", "language model", "smoothing", "laplace", "backoff", "perplexity"] },
          { id: "1.6", title: "Word Embeddings", difficulty: "core", minutes: 36, tier: "must",
            summary: "Word2Vec's CBOW and skip-gram objectives, negative sampling, GloVe's co-occurrence factorisation and FastText's subwords — and the geometry that makes the analogy work.",
            keywords: ["word2vec", "cbow", "skip-gram", "glove", "fasttext", "negative sampling", "analogy", "cosine"] },
          { id: "1.7", title: "Named Entity Recognition", difficulty: "core", minutes: 32, tier: "must",
            summary: "The entity types, BIO and BIOES tagging schemes, the rule-based, CRF and neural approaches, and the span-level evaluation that a token-level score hides.",
            keywords: ["ner", "bio", "bioes", "entity", "crf", "span", "gazetteer"] },
          { id: "1.8", title: "POS Tagging and Dependency Parsing", difficulty: "core", minutes: 30, tier: "should",
            summary: "The universal tag set, why tagging is ambiguous, dependency relations and the parse tree, and what a parse buys you that a bag of words cannot.",
            keywords: ["pos tagging", "dependency parsing", "universal tags", "head", "arc", "treebank", "constituency"] }
        ]
      },

      /* ================================================================
         M2 · 01_NLP_Notes.md §9–16
         ================================================================ */
      {
        id: "tasks",
        short: "M2",
        dir: "02_tasks",
        phase: "Phase 1 · Classical NLP",
        title: "The Task Catalogue",
        blurb: "The eight tasks the classical field is built around — classification and the sentiment special case, topic models and what they actually find, similarity and semantic search, sequence labelling, the two kinds of summarisation, machine translation before and after neural models, and question answering — each with the metric that judges it and the baseline it must beat.",
        outcome: "You can pick the right formulation for a language problem, and name the metric and baseline before you build anything.",
        source: "01_NLP_Notes.md",
        lessons: [
          { id: "2.1", title: "Text Classification", difficulty: "core", minutes: 32, tier: "must",
            summary: "The formulation, Naive Bayes worked by hand, linear models on TF-IDF, and the neural approaches — with the class imbalance that decides which metric you can trust.",
            keywords: ["classification", "naive bayes", "logistic regression", "tf-idf", "imbalance", "macro f1"] },
          { id: "2.2", title: "Sentiment Analysis", difficulty: "core", minutes: 28, tier: "must",
            summary: "Lexicon methods and where they fail, aspect-based sentiment, and the hard cases — negation, sarcasm, comparatives — that every approach still gets wrong.",
            keywords: ["sentiment", "polarity", "lexicon", "vader", "aspect based", "negation", "sarcasm"] },
          { id: "2.3", title: "Topic Modelling", difficulty: "core", minutes: 32, tier: "should",
            summary: "LDA's generative story, what a topic actually is, how to choose the number of topics, coherence as an evaluation, and NMF as the simpler alternative.",
            keywords: ["topic modeling", "lda", "dirichlet", "nmf", "coherence", "perplexity", "unsupervised"] },
          { id: "2.4", title: "Text Similarity and Semantic Search", difficulty: "core", minutes: 32, tier: "must",
            summary: "Lexical against semantic similarity, sentence embeddings, cosine as the default and its assumptions, and the vector index that makes search over millions feasible.",
            keywords: ["similarity", "cosine", "sentence embeddings", "semantic search", "faiss", "ann", "bi-encoder"] },
          { id: "2.5", title: "Sequence Labelling", difficulty: "core", minutes: 28, tier: "should",
            summary: "The tasks that assign a label per token, the CRF that models transitions between them, and Viterbi decoding — with the constraints a CRF enforces that a softmax cannot.",
            keywords: ["sequence labeling", "crf", "viterbi", "transition", "chunking", "bio", "token classification"] },
          { id: "2.6", title: "Text Summarisation", difficulty: "core", minutes: 30, tier: "should",
            summary: "Extractive scoring and selection against abstractive generation, the ROUGE family and what it misses, and the factuality problem that abstractive methods introduced.",
            keywords: ["summarization", "extractive", "abstractive", "rouge", "textrank", "factuality", "hallucination"] },
          { id: "2.7", title: "Machine Translation", difficulty: "core", minutes: 30, tier: "should",
            summary: "Rule-based, statistical and neural translation; the alignment problem that attention solved; BLEU and its well-known limits; and why translation drove the transformer.",
            keywords: ["machine translation", "smt", "nmt", "alignment", "bleu", "seq2seq", "parallel corpus"] },
          { id: "2.8", title: "Question Answering", difficulty: "core", minutes: 30, tier: "should",
            summary: "Extractive QA as span prediction, open-domain QA as retrieve-then-read, generative QA, and the exact-match and F1 metrics that judge them.",
            keywords: ["question answering", "squad", "span", "extractive", "open domain", "retriever", "reader", "exact match"] }
        ]
      },

      /* ================================================================
         M3 · 01_NLP_Notes.md §17–26
         ================================================================ */
      {
        id: "tooling",
        short: "M3",
        dir: "03_tooling",
        phase: "Phase 1 · Classical NLP",
        title: "Tooling, Evaluation and Production",
        blurb: "The libraries the field actually uses — spaCy's pipeline model, NLTK's teaching toolkit, HuggingFace's abstractions — then the metrics that judge every task, the shape of a production pipeline, contextual embeddings as the bridge to transformers, and the four tasks the reference closes on: coreference, relation extraction, inference and augmentation.",
        outcome: "You can build an NLP pipeline that ships, and defend every metric on its dashboard.",
        source: "01_NLP_Notes.md",
        lessons: [
          { id: "3.1", title: "NLP with spaCy", difficulty: "core", minutes: 30, tier: "must",
            summary: "The Doc, Token and Span objects, the pipeline components and how to add one, the matcher, and why spaCy is the production default.",
            keywords: ["spacy", "doc", "token", "span", "pipeline", "matcher", "nlp object"] },
          { id: "3.2", title: "NLP with NLTK", difficulty: "foundation", minutes: 26, tier: "should",
            summary: "Corpora, tokenizers, stemmers and the WordNet interface — what NLTK is good for, and the boundary where you should reach for something else.",
            keywords: ["nltk", "corpus", "wordnet", "punkt", "stemmer", "concordance", "collocations"] },
          { id: "3.3", title: "HuggingFace Transformers for NLP", difficulty: "core", minutes: 34, tier: "must",
            summary: "The pipeline abstraction, AutoTokenizer and AutoModel, what the tokenizer returns and why, fine-tuning with the Trainer, and the datasets library.",
            keywords: ["huggingface", "transformers", "pipeline", "autotokenizer", "automodel", "trainer", "datasets"] },
          { id: "3.4", title: "NLP Evaluation Metrics", difficulty: "core", minutes: 32, tier: "must",
            summary: "Accuracy, precision, recall and F1 with their averaging choices; BLEU, ROUGE and METEOR; perplexity; BERTScore — each computed, with what it cannot see.",
            keywords: ["metrics", "f1", "macro", "micro", "bleu", "rouge", "meteor", "perplexity", "bertscore"] },
          { id: "3.5", title: "Production NLP Pipelines", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Batching and caching, model serving, latency budgets, monitoring for drift in text distributions, and the preprocessing that must match between training and serving.",
            keywords: ["production", "serving", "batching", "caching", "latency", "drift", "skew", "monitoring"] },
          { id: "3.6", title: "Contextual Embeddings and ELMo", difficulty: "core", minutes: 28, tier: "should",
            summary: "Why one vector per word type is wrong, ELMo's bidirectional language model, and the shift from static to contextual representations that made transformers inevitable.",
            keywords: ["contextual embeddings", "elmo", "polysemy", "bilm", "static embeddings", "context"] },
          { id: "3.7", title: "Coreference Resolution and Relation Extraction", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Mentions, clusters and the mention-pair model; relation extraction as classification over entity pairs; distant supervision and the noise it introduces.",
            keywords: ["coreference", "mention", "cluster", "anaphora", "relation extraction", "distant supervision", "triple"] },
          { id: "3.8", title: "Natural Language Inference and Text Augmentation", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Entailment, contradiction and neutral as a task and as a tool; then the augmentation methods — synonym replacement, back-translation, EDA — and when each is safe.",
            keywords: ["nli", "entailment", "contradiction", "snli", "augmentation", "back translation", "eda", "synonym"] }
        ]
      },

      /* ================================================================
         M4 · 02_Transformers_InDepth.md §1–11
         ================================================================ */
      {
        id: "transformer",
        short: "M4",
        dir: "04_transformer",
        phase: "Phase 2 · The transformer",
        title: "The Transformer, Derived",
        blurb: "The architecture built from the bottom: why recurrence had to go, embeddings and position, scaled dot-product attention derived from the dot product with every shape named, multi-head as a partition rather than an addition, the masks that make a decoder causal and a cross-attention possible, the feed-forward network that does most of the computing, the blocks assembled, tokenization and position in depth, and the parameter count computed exactly.",
        outcome: "You can derive attention from scratch, draw every shape in a transformer block, and compute its parameter count without looking anything up.",
        source: "02_Transformers_InDepth.md",
        lessons: [
          { id: "4.1", title: "Why Transformers, and the Shape of One", difficulty: "core", minutes: 28, tier: "must",
            summary: "The three costs of recurrence, which of them attention alone solved, and the encoder-decoder diagram with every component named before any of it is derived.",
            keywords: ["transformer", "recurrence", "parallel", "encoder", "decoder", "attention is all you need"] },
          { id: "4.2", title: "Input Embeddings and Positional Encoding", difficulty: "core", minutes: 30, tier: "must",
            summary: "Token embeddings, the √d_model scaling and why it is there, and sinusoidal positional encoding computed on real positions — plus the permutation argument that makes it necessary.",
            keywords: ["embedding", "positional encoding", "sinusoidal", "scaling", "permutation", "d_model"] },
          { id: "4.3", title: "Self-Attention, Derived in Full", difficulty: "core", minutes: 38, tier: "must",
            summary: "Query, key and value as projections, the dot product as similarity, why the √d_k division is not optional, the softmax, and the weighted sum — every shape at every step.",
            keywords: ["self-attention", "query", "key", "value", "scaled dot product", "softmax", "sqrt dk"] },
          { id: "4.4", title: "Multi-Head Attention", difficulty: "core", minutes: 30, tier: "must",
            summary: "Several attentions in parallel on partitioned projections, the concatenation and output projection, and why the parameter count does not change with head count.",
            keywords: ["multi-head", "heads", "d_k", "concat", "w_o", "partition", "subspace"] },
          { id: "4.5", title: "Masked and Cross-Attention", difficulty: "core", minutes: 32, tier: "must",
            summary: "The causal mask as −inf before the softmax, padding masks and why they differ, and cross-attention with queries from the decoder and keys and values from the encoder.",
            keywords: ["causal mask", "look-ahead", "padding mask", "cross-attention", "encoder-decoder attention", "triu"] },
          { id: "4.6", title: "The Feed-Forward Network, Residuals and Norm", difficulty: "core", minutes: 30, tier: "must",
            summary: "The position-wise FFN with its 4× expansion, GELU and SwiGLU, the residual connection, and LayerNorm against RMSNorm with pre-norm and post-norm placement.",
            keywords: ["ffn", "position-wise", "gelu", "swiglu", "residual", "layernorm", "rmsnorm", "pre-norm"] },
          { id: "4.7", title: "Encoder and Decoder Blocks", difficulty: "core", minutes: 28, tier: "must",
            summary: "The two sub-layers of an encoder block and the three of a decoder block, assembled and stacked, with the shapes that let them repeat.",
            keywords: ["encoder block", "decoder block", "sublayer", "stack", "residual stream", "n layers"] },
          { id: "4.8", title: "Tokenization Deep Dive", difficulty: "core", minutes: 32, tier: "must",
            summary: "BPE, WordPiece and SentencePiece compared on the same text, special tokens, the vocabulary-size trade-off, and the tokenizer decisions that surface as model behaviour.",
            keywords: ["bpe", "wordpiece", "sentencepiece", "unigram", "special tokens", "vocabulary size", "fertility"] },
          { id: "4.9", title: "Positional Encoding Deep Dive", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Sinusoidal, learned, relative, RoPE and ALiBi — what each encodes, how each extrapolates beyond the training length, and why RoPE became the default.",
            keywords: ["rope", "alibi", "relative position", "learned position", "extrapolation", "rotation", "interpolation"] },
          { id: "4.10", title: "Parameter Count", difficulty: "core", minutes: 26, tier: "must",
            summary: "Every weight in a transformer counted — embeddings, attention projections, the FFN, norms — with the formula checked against a real model's reported size.",
            keywords: ["parameter count", "formula", "embedding", "projection", "ffn", "tied weights", "model size"] }
        ]
      },

      /* ================================================================
         M5 · 02_Transformers_InDepth.md §12–25
         ================================================================ */
      {
        id: "modern",
        short: "M5",
        dir: "05_modern",
        phase: "Phase 2 · The transformer",
        title: "The Modern Stack",
        blurb: "What the field did to the 2017 design: the three families and their objectives, the attention optimisations from Flash to GQA, the inference tricks that make serving affordable, scaling laws and what emerges, the whole thing built in PyTorch, HuggingFace in practice, vision transformers, a prompt traced from text to response, multimodal transformers, mixture of experts, state space models, and the long-context and distributed-training techniques.",
        outcome: "You can explain any component of a current large model — why it exists, what it costs, and what it replaced.",
        source: "02_Transformers_InDepth.md",
        lessons: [
          { id: "5.1", title: "BERT, GPT and T5", difficulty: "core", minutes: 34, tier: "must",
            summary: "Encoder-only, decoder-only and encoder-decoder — the masking, the pretraining objective and the tasks each suits, and why decoder-only won at scale.",
            keywords: ["bert", "gpt", "t5", "mlm", "causal lm", "span corruption", "encoder-only", "decoder-only"] },
          { id: "5.2", title: "Attention Optimisations", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Flash Attention's tiling and why it is exact rather than an approximation, sparse and linear attention, and MQA, GQA and MLA with the KV-cache arithmetic.",
            keywords: ["flash attention", "tiling", "sparse attention", "linear attention", "mqa", "gqa", "mla", "kv cache"] },
          { id: "5.3", title: "Inference Optimisations", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "The KV cache and its memory cost, speculative decoding, continuous batching and PagedAttention, quantisation for serving, and why generation is memory-bound.",
            keywords: ["kv cache", "speculative decoding", "vllm", "paged attention", "continuous batching", "quantization", "memory bound"] },
          { id: "5.4", title: "Scaling Laws and Emergent Abilities", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "The power-law relationship between loss, parameters and data, Chinchilla's correction to the compute allocation, and what is and is not meant by emergence.",
            keywords: ["scaling laws", "chinchilla", "compute optimal", "power law", "emergence", "tokens per parameter"] },
          { id: "5.5", title: "A Transformer from Scratch in PyTorch", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "The reference's implementation assembled and run — attention, the block, the stack, the masks and the training step — with the output it printed.",
            keywords: ["pytorch", "from scratch", "nn.module", "implementation", "forward", "mask", "training loop"] },
          { id: "5.6", title: "HuggingFace in Practice", difficulty: "core", minutes: 30, tier: "must",
            summary: "Loading a model and tokenizer, what the tokenizer's output dictionary contains, generation parameters, and fine-tuning with the Trainer API.",
            keywords: ["huggingface", "from_pretrained", "generate", "attention_mask", "trainer", "peft", "fine-tuning"] },
          { id: "5.7", title: "Vision Transformers", difficulty: "core", minutes: 28, tier: "should",
            summary: "Patches as tokens, the class token and position embeddings, the data requirement that made ViT lose to CNNs at small scale, and what changed with more data.",
            keywords: ["vit", "patch embedding", "class token", "image classification", "inductive bias", "data hungry"] },
          { id: "5.8", title: "A Prompt, Traced End to End", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Everything between the text you type and the text that comes back — tokenization, the forward pass, the logits, sampling, the KV cache and the loop that repeats it.",
            keywords: ["prompt", "generation", "logits", "sampling", "temperature", "top-p", "kv cache", "autoregressive"] },
          { id: "5.9", title: "Multimodal Transformers", difficulty: "advanced", minutes: 26, tier: "should",
            summary: "How images, audio and text become one token sequence, the fusion strategies, and the projection layer that joins a vision encoder to a language model.",
            keywords: ["multimodal", "fusion", "projection", "vision encoder", "cross-attention", "token sequence"] },
          { id: "5.10", title: "Mixture of Experts", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Replacing the FFN with routed experts, the gating network, why total and active parameters diverge, and the load-balancing loss that stops a router collapsing.",
            keywords: ["moe", "expert", "router", "gating", "top-k", "load balancing", "sparse", "active parameters"] },
          { id: "5.11", title: "State Space Models: Mamba and S4", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "The recurrence that is also a convolution, selective state spaces, linear scaling in sequence length, and the trade against attention's content-based retrieval.",
            keywords: ["mamba", "s4", "state space", "ssm", "selective", "linear scaling", "recurrence", "convolution"] },
          { id: "5.12", title: "Long Context and Training at Scale", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Ring attention, Infini-Attention and position interpolation; then the training recipe — AdamW, warmup, data and tensor parallelism, ZeRO and the checkpointing that must survive it.",
            keywords: ["long context", "ring attention", "infini-attention", "interpolation", "zero", "fsdp", "tensor parallel", "adamw"] }
        ]
      },

      /* ================================================================
         M6 · 02a + 02b + 02c
         ================================================================ */
      {
        id: "worked",
        short: "M6",
        dir: "06_worked",
        phase: "Phase 3 · Worked end to end",
        title: "Every Number, Twice",
        blurb: "The reference's three worked examples, reproduced. A decoder-only forward pass where a four-dimensional toy model is carried from tokens to a next-word probability with every matrix printed; the cheatsheet that explains each component as what, when-and-why, and how; then the full encoder-decoder traced on one translation — sinusoidal position by hand, encoder self-attention, causal masking, cross-attention, teacher forcing and the loss.",
        outcome: "You have seen every matrix in a transformer with real numbers in it, and can reproduce them in NumPy.",
        source: "02a_Transformer_Worked_Example.md + 02b + 02c",
        lessons: [
          { id: "6.1", title: "The Toy Model: Tokenize, Embed, Position", difficulty: "core", minutes: 30, tier: "must",
            summary: "A four-dimensional model small enough to print: the vocabulary, the embedding lookup, and sinusoidal position added — with every number the reference gives, checked.",
            keywords: ["toy model", "d_model", "embedding lookup", "positional encoding", "worked example", "numpy"] },
          { id: "6.2", title: "Self-Attention on Real Numbers", difficulty: "core", minutes: 38, tier: "must",
            summary: "Q, K and V computed from the actual weight matrices, the score matrix, the scaling, the softmax and the weighted sum — plus where the projections come from and what they are for.",
            keywords: ["attention", "q k v", "score matrix", "softmax", "weighted sum", "projection", "worked"] },
          { id: "6.3", title: "Residual, Norm, FFN and the LM Head", difficulty: "core", minutes: 34, tier: "must",
            summary: "The rest of the block on the same numbers — both residual-and-norm steps, the feed-forward network, the language-model head, the softmax over the vocabulary, and the autoregressive loop.",
            keywords: ["residual", "layernorm", "ffn", "lm head", "logits", "softmax", "autoregression", "greedy"] },
          { id: "6.4", title: "The Whole Stack: What, When-Why, How", difficulty: "core", minutes: 36, tier: "should",
            summary: "The reference's cheatsheet in one lesson — every component from tokenization to interpretability given a plain-words purpose, the situation that calls for it, and its mechanism.",
            keywords: ["cheatsheet", "overview", "swiglu", "rmsnorm", "rope", "moe", "interpretability", "recap"] },
          { id: "6.5", title: "The Encoder, Traced", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Reading 'I love AI' — the embeddings, sinusoidal position computed by hand, encoder self-attention with every matrix printed, and the encoder output the decoder will attend to.",
            keywords: ["encoder", "trace", "translation", "self-attention", "sinusoidal", "memory", "worked"] },
          { id: "6.6", title: "The Decoder, Cross-Attention and the Loss", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Writing the German — causal masking on the decoder's self-attention, cross-attention with Q from the decoder and K and V from the encoder, teacher forcing, and the cross-entropy that training minimises.",
            keywords: ["decoder", "causal mask", "cross-attention", "teacher forcing", "cross-entropy", "loss", "trace"] },
          { id: "6.7", title: "Inference, and the Complete Trace", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "The greedy decoding loop with no teacher, the runnable NumPy that reproduces every matrix in the lesson, and the whole pipeline laid out in one table.",
            keywords: ["inference", "greedy decoding", "numpy", "reproduce", "complete trace", "pipeline", "recap"] }
        ]
      },

      /* ================================================================
         M7 · 03_Multimodal_AI.md
         ================================================================ */
      {
        id: "multimodal",
        short: "M7",
        dir: "07_multimodal",
        phase: "Phase 4 · Beyond text",
        title: "Multimodal AI",
        blurb: "What happens when the token sequence is not only text: the fusion strategies, CLIP's contrastive objective and the shared embedding space it produces, vision-language models and how a vision encoder is joined to a language model, image generation, audio and video, multimodal retrieval, document understanding, and the metrics that judge any of it.",
        outcome: "You can explain how an image becomes something a language model can attend to, and evaluate a multimodal system honestly.",
        source: "03_Multimodal_AI.md",
        lessons: [
          { id: "7.1", title: "Multimodal Fundamentals", difficulty: "core", minutes: 26, tier: "must",
            summary: "What a modality is, early, late and intermediate fusion, the alignment problem, and why a shared representation space is the thing everything else is built on.",
            keywords: ["multimodal", "modality", "fusion", "early fusion", "late fusion", "alignment", "shared space"] },
          { id: "7.2", title: "CLIP and Contrastive Learning", difficulty: "core", minutes: 34, tier: "must",
            summary: "The contrastive objective over image-text pairs, the temperature, the symmetric loss, and zero-shot classification as a consequence rather than a feature.",
            keywords: ["clip", "contrastive", "infonce", "temperature", "image encoder", "text encoder", "zero-shot"] },
          { id: "7.3", title: "Vision-Language Models", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Joining a frozen vision encoder to a language model — the projection, cross-attention and Q-Former approaches — and what each architecture makes easy.",
            keywords: ["vlm", "llava", "blip", "q-former", "projection", "frozen encoder", "visual instruction"] },
          { id: "7.4", title: "Image Generation", difficulty: "core", minutes: 30, tier: "should",
            summary: "Diffusion's forward and reverse processes, latent diffusion, how text conditions generation through cross-attention, and classifier-free guidance.",
            keywords: ["diffusion", "latent diffusion", "denoising", "unet", "cross-attention", "cfg", "stable diffusion"] },
          { id: "7.5", title: "Audio, Speech and Video", difficulty: "core", minutes: 30, tier: "should",
            summary: "Audio as a spectrogram or as discrete codec tokens, speech models in the multimodal frame, and the temporal sampling that makes video tractable at all.",
            keywords: ["audio", "spectrogram", "codec tokens", "whisper", "video", "temporal sampling", "frames"] },
          { id: "7.6", title: "Multimodal Embeddings and RAG", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "One index over several modalities, cross-modal retrieval, and the multimodal RAG pipeline with the failure modes that text-only RAG does not have.",
            keywords: ["multimodal embeddings", "cross-modal retrieval", "rag", "vector index", "reranking", "grounding"] },
          { id: "7.7", title: "Document Understanding", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "Layout as a modality, OCR against layout-aware models, table and form extraction, and the practical pipeline for a page that is part text and part picture.",
            keywords: ["document understanding", "layoutlm", "ocr", "donut", "table extraction", "bounding box", "form"] },
          { id: "7.8", title: "Multimodal Evaluation", difficulty: "advanced", minutes: 26, tier: "should",
            summary: "Retrieval recall at k, captioning metrics and what they miss, FID and CLIPScore for generation, hallucination measurement, and the human evaluation none of them replaces.",
            keywords: ["evaluation", "recall at k", "cider", "fid", "clipscore", "hallucination", "human eval"] }
        ]
      },

      /* ================================================================
         M8 · 04_Fuzzy_Matching.md
         ================================================================ */
      {
        id: "fuzzy",
        short: "M8",
        dir: "08_fuzzy",
        phase: "Phase 4 · Beyond text",
        title: "Fuzzy Matching and Entity Resolution",
        blurb: "The methods that answer one question — are these two strings the same thing? — computed by hand and then at scale. Edit distance and its transposition-aware variant, Jaro-Winkler's prefix weighting, set and vector similarity, TF-IDF for matching, the libraries that make it fast, and the blocking that makes entity resolution possible on millions of records.",
        outcome: "You can choose a string-similarity measure from the shape of your data and defend it, and build a resolution pipeline that scales.",
        source: "04_Fuzzy_Matching.md",
        lessons: [
          { id: "8.1", title: "Levenshtein and Damerau-Levenshtein", difficulty: "core", minutes: 32, tier: "must",
            summary: "The edit-distance dynamic program filled in by hand, the three operations, the normalised ratio, and the transposition that Damerau adds for typed text.",
            keywords: ["levenshtein", "edit distance", "dynamic programming", "damerau", "transposition", "normalized"] },
          { id: "8.2", title: "Jaro-Winkler Similarity", difficulty: "core", minutes: 28, tier: "should",
            summary: "The matching window, transpositions and the Jaro formula computed step by step, then Winkler's prefix bonus and why it suits names specifically.",
            keywords: ["jaro", "winkler", "prefix", "matching window", "transposition", "names", "record linkage"] },
          { id: "8.3", title: "Jaccard and Cosine Similarity", difficulty: "core", minutes: 28, tier: "must",
            summary: "Set overlap on character n-grams and shingles, cosine on vectors, the difference between them, and which shape of data each suits.",
            keywords: ["jaccard", "cosine", "shingles", "n-gram", "set similarity", "minhash", "vector"] },
          { id: "8.4", title: "TF-IDF for Matching", difficulty: "core", minutes: 28, tier: "should",
            summary: "Character n-gram TF-IDF for fuzzy matching at scale, why it beats edit distance on large candidate sets, and the sparse matrix product that does the work.",
            keywords: ["tf-idf", "character ngram", "sparse", "matrix product", "candidate generation", "scale"] },
          { id: "8.5", title: "RapidFuzz and Entity Resolution", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "The library's scorers and when each applies, then the full resolution pipeline — normalisation, blocking, scoring, clustering — and the threshold that decides precision against recall.",
            keywords: ["rapidfuzz", "fuzzywuzzy", "entity resolution", "blocking", "deduplication", "clustering", "threshold"] }
        ]
      },

      {
        id: "nlp_programs", short: "P1", dir: "01_nlp_programs", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "NLP and Text Processing Programs",
        blurb: "The reference's NLP programs — preprocessing, TF-IDF and BPE from scratch, BLEU and ROUGE, RoPE, a KV cache, beam search and the retrieval patterns — each run, with what it printed.",
        outcome: "You can write the code for any standard NLP operation from memory, and you have seen what it prints.",
        source: "Sample_Programs/Part_08_NLP_and_Text_Processing.md",
        lessons: [
          { id: "p1.1", title: "NLP and Text Processing Programs · 1", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 programs with hidden answers.",
            keywords: ["text", "processing", "programs"] },
          { id: "p1.2", title: "NLP and Text Processing Programs · 2", difficulty: "core", minutes: 30, tier: "should",
            summary: "15 programs with hidden answers.",
            keywords: ["text", "processing", "programs"] }
        ]
      },
      {
        id: "iv_nlp", short: "I1", dir: "01_iv_nlp", track: "interview", numPrefix: "I",
        phase: "Interview \u00b7 Question banks",
        title: "NLP and Transformers Interview Bank",
        blurb: "One hundred questions across NLP fundamentals, advanced NLP and transformers, the transformer internals, applications and production, and HuggingFace in practice.",
        outcome: "You can answer an NLP or transformer interview question with the formula, the shape and the reason.",
        source: "Interview_Questions/06_NLP_Interview.md",
        lessons: [
          { id: "i1.1", title: "Section 1: NLP Fundamentals", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from nlp and transformers interview bank.",
            keywords: ["transformers", "interview", "bank"] },
          { id: "i1.2", title: "Section 2: Advanced NLP & Transformers", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from nlp and transformers interview bank.",
            keywords: ["transformers", "interview", "bank"] },
          { id: "i1.3", title: "Section 3: Transformers Deep Dive", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from nlp and transformers interview bank.",
            keywords: ["transformers", "interview", "bank"] },
          { id: "i1.4", title: "Section 4: NLP Applications & Production", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from nlp and transformers interview bank.",
            keywords: ["transformers", "interview", "bank"] },
          { id: "i1.5", title: "Section 5: HuggingFace & Practical", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from nlp and transformers interview bank.",
            keywords: ["transformers", "interview", "bank"] }
        ]
      }
    ]
  });
})();

/* ============================================================================
   PRACTICE P9.2 — NLP and Neural Networks · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/09_NLP_and_Neural_Networks.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p9.2",
 "lede": "**25 scenarios** from NLP and Neural Networks. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each scenario out loud before revealing the answer",
  "Give the mechanism, not the slogan — the formula, the failure mode, the fix",
  "Recognise the pattern behind the question so the next variant is easy",
  "Mark the ones you got wrong and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "drill",
   "n": "26",
   "q": "What is the difference between character-level, word-level, and subword-level models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Character:** Smallest vocabulary, handles any text, but sequences very long",
      "**Word:** Natural units, but large vocabulary and OOV problem",
      "**Subword:** Balance — small vocabulary, handles OOV, moderate sequence length"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Modern NLP: subword (BPE, WordPiece). Character-level: useful for morphologically rich languages or noisy text (typos)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is Part-of-Speech (POS) tagging?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Assigning grammatical categories (noun, verb, adjective, etc.) to each word."
    },
    {
     "t": "p",
     "text": "**Example:** \"The/DET cat/NOUN sat/VERB on/ADP the/DET mat/NOUN\""
    },
    {
     "t": "p",
     "text": "**Methods:** Rule-based, HMM, CRF, BiLSTM, BERT."
    },
    {
     "t": "p",
     "text": "**Explanation:** Foundational NLP task. Helps disambiguation (\"bank\" = river bank vs financial bank). Modern models do POS implicitly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is dependency parsing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Analyzing grammatical structure by finding relationships between words (head-dependent pairs)."
    },
    {
     "t": "p",
     "text": "**Example:** \"The cat sat on the mat\" → sat is root, cat→sat (nsubj), mat→sat (obl)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Captures syntactic structure. Used for relation extraction, question answering, information extraction. spaCy provides fast dependency parsing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is word sense disambiguation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Determining which meaning of a word is used in context."
    },
    {
     "t": "p",
     "text": "**Example:** \"bank\":"
    },
    {
     "t": "ul",
     "items": [
      "\"River bank\" → geographical feature",
      "\"Bank account\" → financial institution"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Context determines meaning. BERT-style models handle this implicitly through contextual embeddings (same word, different vectors in different contexts)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is the difference between rule-based and ML-based NLP?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Rule-based:** Hand-crafted patterns and rules (regex, grammars). Precise for known patterns, brittle for variations.",
      "**ML-based:** Learn patterns from data. More flexible, handle variations, need labeled data."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Production systems often combine both: ML for broad coverage, rules for critical patterns (phone numbers, emails, specific formats)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is information extraction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Extracting structured information from unstructured text:"
    },
    {
     "t": "ol",
     "items": [
      "**NER:** Entity identification",
      "**Relation extraction:** Relationships between entities",
      "**Event extraction:** What happened, when, where, to whom",
      "**Coreference resolution:** \"he\" refers to \"John\""
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Transforms text into structured data (knowledge base entries, database records). Pipeline: NER → relation extraction → knowledge graph."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "How do you handle multi-language NLP?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Language detection first (langdetect, fasttext)",
      "Language-specific models/preprocessing",
      "Multilingual models: mBERT, XLM-R (100+ languages)",
      "Machine translation → process in target language"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Multilingual models: train once, deploy for many languages. Zero-shot cross-lingual transfer: fine-tune on English, test on other languages."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is text normalization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Standardizing text variations:"
    },
    {
     "t": "ol",
     "items": [
      "Lowercasing: \"Apple\" → \"apple\"",
      "Unicode normalization: \"café\" → \"cafe\"",
      "Contractions: \"don't\" → \"do not\"",
      "Number normalization: \"1st\" → \"first\"",
      "Abbreviation expansion: \"NYC\" → \"New York City\""
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces vocabulary and variation. Domain-specific: medical abbreviations, social media slang. Too aggressive normalization loses information."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is the cosine similarity for text comparison?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** cosine(A, B) = (A · B) / (||A|| × ||B||). Measures angle between vectors, not magnitude."
    },
    {
     "t": "ul",
     "items": [
      "Range: [-1, 1] (for TF-IDF: [0, 1])",
      "1 = identical direction, 0 = orthogonal, -1 = opposite"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Preferred over Euclidean for text because it's magnitude-invariant — a document twice as long has similar cosine but very different Euclidean distance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is N-gram language modeling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Probabilities of word sequences using conditional probability: P(w_n | w_{n-1}, ..., w_{n-N+1})."
    },
    {
     "t": "ul",
     "items": [
      "Unigram: P(word) independent",
      "Bigram: P(word | previous_word)",
      "Trigram: P(word | two_previous_words)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Simple, interpretable. Limited context window. Smoothing needed for unseen n-grams (Laplace, Kneser-Ney). Replaced by neural language models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is perplexity in language modeling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Measures how well a language model predicts text. Lower = better."
    },
    {
     "t": "p",
     "text": "**Formula:** PP = exp(-1/N × Σ log P(w_i))"
    },
    {
     "t": "p",
     "text": "**Interpretation:** Perplexity = 100 means the model is as confused as choosing uniformly from 100 words."
    },
    {
     "t": "p",
     "text": "**Explanation:** Used to compare language models. Not directly comparable across different tokenizations/vocabularies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is the SpaCy vs NLTK comparison?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**NLTK:** Academic, educational, many algorithms, slower, more flexibility",
      "**SpaCy:** Production-ready, fast, opinionated (one algorithm per task), pre-trained pipelines"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Use spaCy for production NLP pipelines (NER, POS, parsing). NLTK for learning and experimentation. Hugging Face Transformers for state-of-the-art models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is document similarity search?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Finding documents most similar to a query or reference document."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "TF-IDF + cosine similarity",
      "BM25 (improved TF-IDF for information retrieval)",
      "Dense retrieval (BERT-based embeddings + ANN search)",
      "Hybrid: BM25 + dense retrieval"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** BM25 is the standard baseline. Dense retrieval captures semantics. Production: embed documents offline, ANN search at query time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is text augmentation for NLP?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Synonym replacement (WordNet or embedding similarity)",
      "Random insertion/deletion/swap",
      "Back-translation (English → French → English)",
      "Contextual augmentation (use BERT to fill masked words)",
      "Paraphrasing with LLMs"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Increases training data diversity. Back-translation most reliable. Be careful: augmentation shouldn't change label."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the BM25 scoring function?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Best Matching 25 — TF-IDF variant with:"
    },
    {
     "t": "ol",
     "items": [
      "Term frequency saturation (diminishing returns for repeated words)",
      "Document length normalization",
      "IDF weighting"
     ]
    },
    {
     "t": "p",
     "text": "**Formula includes k1, b parameters controlling saturation and length normalization."
    },
    {
     "t": "p",
     "text": "**Explanation:** Default scoring in Elasticsearch, Solr. Strong baseline for search. Often used as first-stage retrieval before neural re-ranking."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is the difference between semantic similarity and lexical similarity?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Lexical:** Based on exact word/character overlap (\"buy car\" vs \"buy car\" = high)",
      "**Semantic:** Based on meaning (\"buy car\" vs \"purchase automobile\" = high)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** BLEU, ROUGE measure lexical overlap. BERTScore measures semantic similarity. Semantic similarity captures paraphrases and synonyms."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "How do you handle noisy text data (social media, OCR, etc.)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Spell correction (SymSpell, pyspellchecker)",
      "Custom normalization rules (slang dictionary)",
      "Character-level or subword models (robust to misspellings)",
      "Data augmentation with noise injection",
      "Pre-training on similar noisy data"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** \"Luv dis movie sooo much!!!\" → standard models struggle. Character-level models and pre-training on Twitter data help."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is Regular Expression (regex) usage in NLP?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Pattern matching for extracting structured information from text:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import re\n# Extract dates\ndates = re.findall(r'\\d{1,2}/\\d{1,2}/\\d{2,4}', text)\n# Extract emails\nemails = re.findall(r'[\\w.+-]+@[\\w-]+\\.[\\w.-]+', text)\n# Extract phone numbers\nphones = re.findall(r'\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}', text)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Essential for data extraction, preprocessing, and validation. Rule-based NLP for well-defined patterns. Use named groups for clarity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is the difference between extractive and abstractive question answering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Extractive:** Find answer span in given context (BERT-based: SQuAD-style)",
      "**Abstractive:** Generate answer text, possibly not in the context (GPT, T5)",
      "**Retrieval-augmented:** Retrieve relevant documents, then extract/generate answer (RAG)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Extractive: faithful but limited to context. Abstractive: flexible but may hallucinate. RAG combines retrieval quality with generation flexibility."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is the Jaccard similarity for text?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** |A ∩ B| / |A ∪ B| — intersection over union of word sets."
    },
    {
     "t": "p",
     "text": "**Example:** A = {the, cat, sat}, B = {the, dog, sat} → Jaccard = 2/4 = 0.5"
    },
    {
     "t": "p",
     "text": "**Explanation:** Simple but ignores word frequency and order. Useful for near-duplicate detection. MinHash provides efficient approximation for large-scale."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is cross-encoder vs bi-encoder for text matching?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Bi-encoder:** Encode query and document separately, compare embeddings (fast, independent)",
      "**Cross-encoder:** Encode query-document pair jointly (more accurate, but can't pre-compute)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Bi-encoder: pre-compute document embeddings, real-time query embedding + ANN. Cross-encoder: re-rank top candidates from bi-encoder. Two-stage pipeline is common."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is active learning for text annotation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Select the most informative unlabeled samples for human annotation, rather than random selection."
    },
    {
     "t": "p",
     "text": "**Strategies:**"
    },
    {
     "t": "ol",
     "items": [
      "Uncertainty sampling (model is least confident)",
      "Query by committee (models disagree)",
      "Diversity sampling (maximize coverage)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces annotation cost by 50-80%. Iterative: model trains → selects → human labels → retrain. Critical for NLP where labeling is expensive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is the difference between keyword extraction and keyphrase extraction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Keyword:** Single important words (\"machine\", \"learning\")",
      "**Keyphrase:** Multi-word expressions (\"machine learning\", \"natural language processing\")"
     ]
    },
    {
     "t": "p",
     "text": "**Methods:** TF-IDF, TextRank, YAKE, KeyBERT."
    },
    {
     "t": "p",
     "text": "**Explanation:** Keyphrases are more informative. KeyBERT uses BERT embeddings to find phrases most similar to the document embedding."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "How do you build a text classification pipeline from scratch?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.pipeline import Pipeline\nfrom sklearn.feature_extraction.text import TfidfVectorizer\nfrom sklearn.linear_model import LogisticRegression\n\npipe = Pipeline([\n    ('tfidf', TfidfVectorizer(\n        max_features=10000, ngram_range=(1,2),\n        min_df=5, max_df=0.95\n    )),\n    ('clf', LogisticRegression(max_iter=1000))\n])\npipe.fit(X_train, y_train)\nprint(pipe.score(X_test, y_test))"
    },
    {
     "t": "p",
     "text": "**Explanation:** Strong baseline. Often achieves 85-95% of BERT performance with 100x less compute. Add: cross-validation, hyperparameter tuning, error analysis."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What are the key considerations when deploying NLP models in production?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Latency:** Tokenization + inference time (BERT is slow, distilled models faster)",
      "**Model size:** BERT-base = 440MB, DistilBERT = 260MB",
      "**Preprocessing consistency:** Same tokenizer in train and serve",
      "**Edge cases:** Empty text, very long text, unsupported languages",
      "**Monitoring:** Drift in text distribution, new vocabulary",
      "**Updates:** Retrain as language evolves"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Distillation, quantization, ONNX export for production speed. Cache frequent predictions. Batch inference for offline tasks."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

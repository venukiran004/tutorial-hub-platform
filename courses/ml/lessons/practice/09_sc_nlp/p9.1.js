/* ============================================================================
   PRACTICE P9.1 — NLP and Neural Networks · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/09_NLP_and_Neural_Networks.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p9.1",
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
   "n": "1",
   "q": "What is the difference between tokenization, stemming, and lemmatization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Tokenization:** Splitting text into units (words, subwords, characters)",
      "**Stemming:** Reducing to root form by rule-based suffix removal (\"running\" → \"run\", \"better\" → \"bet\")",
      "**Lemmatization:** Reducing to dictionary base form using linguistic rules (\"better\" → \"good\", \"running\" → \"run\")"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Lemmatization is more accurate but slower. Stemming is faster but can produce non-words. Both reduce vocabulary for simpler models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is TF-IDF and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**TF (Term Frequency):** How often word appears in a document",
      "**IDF (Inverse Document Frequency):** log(total_docs / docs_containing_word) — penalizes common words",
      "**TF-IDF:** TF × IDF — high for distinctive words in a document"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** \"the\" has high TF but low IDF (appears everywhere). \"quantum\" has lower TF but high IDF (rare). TF-IDF captures word importance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is the bag-of-words (BoW) limitation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Loses word order (\"dog bites man\" = \"man bites dog\")",
      "High dimensionality (vocabulary size)",
      "Sparse vectors",
      "No semantic understanding (\"happy\" and \"joyful\" are unrelated)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** BoW is simple baseline. N-grams partially capture order. Word embeddings capture semantics. Transformers overcome all limitations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What are word embeddings and why are they better than BoW?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Dense vector representations where semantically similar words are close in vector space."
    },
    {
     "t": "p",
     "text": "**Properties:**"
    },
    {
     "t": "ul",
     "items": [
      "\"king\" - \"man\" + \"woman\" ≈ \"queen\"",
      "Similar words have high cosine similarity",
      "Fixed-size dense vectors (100-300 dimensions)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Capture semantic and syntactic relationships. Pre-trained (Word2Vec, GloVe, FastText) or learned end-to-end. Dramatically improve NLP model performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the difference between Word2Vec and GloVe?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Word2Vec:** Predictive model (Skip-gram: predict context from word. CBOW: predict word from context). Learns from local windows.",
      "**GloVe:** Count-based model — factorizes global co-occurrence matrix. Captures global statistics."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Both produce similar quality embeddings. Word2Vec: local context windows. GloVe: global corpus statistics. FastText extends Word2Vec with subword (character n-gram) embeddings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is the advantage of FastText over Word2Vec?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** FastText represents words as sum of character n-gram embeddings, enabling:"
    },
    {
     "t": "ol",
     "items": [
      "Handle out-of-vocabulary (OOV) words",
      "Better representations for rare words",
      "Morphological understanding (\"unhappy\" shares subwords with \"happy\")"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Word2Vec assigns one vector per word — OOV words get nothing. FastText: even unseen words have representations based on character n-grams."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "How do you handle text preprocessing for NLP?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import re\ntext = text.lower()                          # Lowercase\ntext = re.sub(r'[^a-zA-Z\\s]', '', text)    # Remove punctuation\ntext = re.sub(r'\\s+', ' ', text).strip()    # Normalize whitespace\n# Tokenize\ntokens = text.split()\n# Remove stopwords\ntokens = [t for t in tokens if t not in stop_words]\n# Lemmatize\ntokens = [lemmatizer.lemmatize(t) for t in tokens]"
    },
    {
     "t": "p",
     "text": "**Explanation:** Preprocessing depends on task. Sentiment analysis: keep punctuation (!?), negation (\"not\"). Deep learning: often minimal preprocessing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "When should you NOT remove stop words?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Sentiment analysis (\"not good\" → removing \"not\" changes meaning)",
      "Phrase detection (\"United States\" needs both words)",
      "Deep learning models (handle context themselves)",
      "Question answering (\"what\", \"who\", \"how\" are stop words but critical)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Stop word removal is a heuristic from IR era. Modern models (BERT, transformers) work better with full text."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is text classification and what are the common approaches?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Traditional ML:** TF-IDF + Logistic Regression/SVM/Naive Bayes",
      "**Deep Learning:** CNN/LSTM/Transformer on word embeddings",
      "**Transfer Learning:** Fine-tune BERT/RoBERTa",
      "**Zero-shot:** GPT/LLM with prompting"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** TF-IDF + Logistic Regression is a strong baseline. Fine-tuned BERT is state-of-the-art for most tasks. Choose based on data size and compute budget."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Why is Naive Bayes effective for text classification despite its strong independence assumption?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Despite assuming feature independence (words are independent given class), Naive Bayes works because:"
    },
    {
     "t": "ol",
     "items": [
      "Classification only needs relative probabilities (ranking)",
      "High dimensionality makes independence a reasonable approximation",
      "Very robust to irrelevant features",
      "Handles small datasets well"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Naive Bayes often outperforms complex models on small text datasets. Fast training and prediction. Good first baseline."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the difference between Multinomial and Bernoulli Naive Bayes for text?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Multinomial:** Uses word counts/frequencies. Works with TF-IDF. Better for longer documents.",
      "**Bernoulli:** Uses binary presence/absence. Considers absence of words. Better for short texts."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Multinomial: \"word appearing 5 times is different from 1 time.\" Bernoulli: \"word present or not.\" Multinomial handles document length better."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is sentiment analysis and what are its challenges?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Determining emotional tone (positive/negative/neutral) from text."
    },
    {
     "t": "p",
     "text": "**Challenges:**"
    },
    {
     "t": "ol",
     "items": [
      "Sarcasm/irony (\"Oh great, another delay!\")",
      "Negation (\"not bad\" = positive)",
      "Domain-specific sentiment (\"sick\" = positive in slang)",
      "Comparative sentiment (\"better than X but worse than Y\")",
      "Aspect-level sentiment (food: positive, service: negative)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Lexicon-based (dictionary of sentiment words) or ML-based. Modern: fine-tuned transformers. Aspect-based sentiment analysis is more granular."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is Named Entity Recognition (NER)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Identifying and classifying named entities in text: persons, organizations, locations, dates, quantities, etc."
    },
    {
     "t": "p",
     "text": "**Example:** \"[Google]_ORG announced at [I/O]_EVENT that [Sundar Pichai]_PERSON will present [June 15]_DATE.\""
    },
    {
     "t": "p",
     "text": "**Explanation:** Approaches: rule-based, CRF (Conditional Random Fields), BiLSTM-CRF, fine-tuned BERT. spaCy provides pre-trained NER models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is text similarity and how do you measure it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Cosine similarity on TF-IDF:** Simple, no semantics",
      "**Word Mover's Distance:** Based on word embedding distances",
      "**Sentence embeddings:** SBERT (Sentence-BERT) cosine similarity",
      "**Edit distance:** Character-level similarity (Levenshtein)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** TF-IDF: \"buy car\" and \"purchase automobile\" = dissimilar. Sentence embeddings: similar because semantically equivalent."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is the difference between word-level and subword tokenization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Word-level:** \"unhappiness\" → [\"unhappiness\"] — OOV problem for rare words",
      "**Subword:** \"unhappiness\" → [\"un\", \"happi\", \"ness\"] — handles any word, smaller vocabulary",
      "**Methods:** BPE (Byte Pair Encoding), WordPiece, SentencePiece"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Modern models (BERT, GPT) use subword tokenization. Balances vocabulary size with morphological coverage. No OOV problem."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is topic modeling and how does LDA work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Discovering abstract topics from a collection of documents."
    },
    {
     "t": "p",
     "text": "**LDA (Latent Dirichlet Allocation):**"
    },
    {
     "t": "ul",
     "items": [
      "Each document = mixture of topics",
      "Each topic = distribution over words",
      "Generative model: document → topics → words"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unsupervised. Learn: topic-word distributions and document-topic distributions. Hyperparameters: number of topics, alpha (document-topic density), beta (topic-word density)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How do you evaluate topic models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Coherence score:** Semantic similarity of top words in each topic (higher = more interpretable)",
      "**Perplexity:** How well model predicts held-out documents (lower = better fit)",
      "**Human evaluation:** Do topics make sense to domain experts?"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Coherence and perplexity can disagree. Coherence better correlates with human judgment. Try different topic counts, pick highest coherence."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is text summarization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Extractive:** Select important sentences from original text (TextRank, BERT-based selection)",
      "**Abstractive:** Generate new sentences that capture key information (Seq2Seq, T5, BART, GPT)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Extractive: guaranteed faithful, but may sound choppy. Abstractive: more fluent but may hallucinate. Modern systems increasingly abstractive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the sequence-to-sequence (Seq2Seq) model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Encoder-decoder architecture: encoder reads input sequence → hidden state → decoder generates output sequence."
    },
    {
     "t": "p",
     "text": "**Applications:** Translation, summarization, question answering."
    },
    {
     "t": "p",
     "text": "**Explanation:** Encoder: input → context vector. Decoder: context vector → output. Attention mechanism improves by allowing decoder to focus on specific input parts."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is attention mechanism in NLP?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Allows model to dynamically focus on relevant parts of the input when generating each output token."
    },
    {
     "t": "p",
     "text": "**Formula:** Attention(Q, K, V) = softmax(QK^T / √d) × V"
    },
    {
     "t": "p",
     "text": "**Explanation:** Without attention: entire input compressed to single vector (bottleneck). With attention: decoder selects relevant input positions for each output step. Foundation of Transformers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is the Transformer architecture?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Self-attention-based architecture replacing RNNs. Processes all tokens in parallel."
    },
    {
     "t": "p",
     "text": "**Components:** Multi-head self-attention, feed-forward layers, positional encoding, layer normalization."
    },
    {
     "t": "p",
     "text": "**Explanation:** No recurrence → parallelizable, efficient. Self-attention captures long-range dependencies. Base of BERT, GPT, T5, and all modern NLP."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is BERT and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Bidirectional Encoder Representations from Transformers. Pre-trained on:"
    },
    {
     "t": "ol",
     "items": [
      "Masked Language Model (MLM): predict masked words",
      "Next Sentence Prediction (NSP): predict if sentence B follows A"
     ]
    },
    {
     "t": "p",
     "text": "**Usage:** Fine-tune on downstream tasks (classification, NER, QA)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Bidirectional: considers context from both left and right (unlike GPT which is left-to-right). State-of-the-art for understanding tasks. Not for text generation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is the difference between BERT and GPT?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**BERT:** Encoder-only, bidirectional, good for understanding (classification, NER, QA)",
      "**GPT:** Decoder-only, left-to-right, good for generation (text completion, summarization)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** BERT sees full context for each token. GPT sees only previous tokens (autoregressive). GPT-3/4 is massive and can do few-shot learning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How do you fine-tune BERT for text classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from transformers import BertForSequenceClassification, Trainer\n\nmodel = BertForSequenceClassification.from_pretrained(\n    'bert-base-uncased', num_labels=3\n)\ntrainer = Trainer(\n    model=model,\n    train_dataset=train_dataset,\n    eval_dataset=eval_dataset,\n    args=training_args\n)\ntrainer.train()"
    },
    {
     "t": "p",
     "text": "**Explanation:** Add classification head on [CLS] token embedding. Fine-tune all layers with small learning rate (2e-5). Few epochs (2-4) sufficient. Dramatically better than training from scratch."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is transfer learning in NLP?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Pre-train large language model on massive text corpus (unsupervised), then fine-tune on specific task with smaller labeled dataset."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Pre-train: BERT on Wikipedia/BookCorpus (millions of texts)\nFine-tune: Your sentiment dataset (1000 labeled examples)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Pre-training learns general language understanding. Fine-tuning adapts to specific task. Enables high performance with limited labeled data."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

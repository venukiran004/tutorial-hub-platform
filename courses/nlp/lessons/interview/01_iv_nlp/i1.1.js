/* ============================================================================
   INTERVIEW I1.1 — Section 1: NLP Fundamentals
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/06_NLP_and_Transformers/Interview_Questions/06_NLP_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.1",
 "lede": "**20 questions** from NLP and Transformers Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the reference answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Section 1: NLP Fundamentals",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What is the standard NLP pipeline?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Raw Text → Tokenization → Lowercasing/Normalization → Stop-word Removal\n→ Stemming/Lemmatization → Feature Extraction → Model → Post-processing"
    },
    {
     "t": "p",
     "text": "Modern pipelines skip many of these steps — Transformer-based models operate on raw subword tokens and learn their own representations end-to-end."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Stemming vs Lemmatization — when do you use which?",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "Stemming",
      "Lemmatization"
     ],
     "rows": [
      [
       "Method",
       "Rule-based suffix stripping",
       "Dictionary/morphological lookup"
      ],
      [
       "Output",
       "May not be a valid word (\"studies\" → \"studi\")",
       "Always a valid lemma (\"studies\" → \"study\")"
      ],
      [
       "Speed",
       "Very fast",
       "Slower (needs POS tag)"
      ],
      [
       "Accuracy",
       "Lower",
       "Higher"
      ],
      [
       "Use case",
       "Search engines, IR",
       "Text classification, chatbots"
      ],
      [
       "Libraries",
       "Porter, Snowball (NLTK)",
       "WordNet (NLTK), spaCy"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is TF-IDF and why is it better than raw Bag of Words?",
   "body": [
    {
     "t": "p",
     "text": "**TF-IDF** = Term Frequency × Inverse Document Frequency"
    },
    {
     "t": "math",
     "tex": "\\text{TF-IDF}(t, d) = \\text{TF}(t, d) \\times \\log\\frac{N}{\\text{DF}(t)}"
    },
    {
     "t": "ul",
     "items": [
      "**TF(t, d):** How often term \\(t\\) appears in document \\(d\\) (local importance)",
      "**IDF(t):** Penalizes common terms that appear in many documents (global importance)",
      "**Why better than BoW:** BoW treats \"the\" and \"quantum\" equally. TF-IDF downweights frequent/common words and highlights discriminative terms."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Explain the difference between Word2Vec CBOW and Skip-gram.",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "CBOW",
      "Skip-gram"
     ],
     "rows": [
      [
       "Input",
       "Context words",
       "Center word"
      ],
      [
       "Output",
       "Predicts center word",
       "Predicts context words"
      ],
      [
       "Speed",
       "Faster (one prediction)",
       "Slower (multiple predictions)"
      ],
      [
       "Rare words",
       "Worse",
       "Better (more updates per word)"
      ],
      [
       "Data size",
       "Better for large datasets",
       "Better for small datasets"
      ],
      [
       "Training",
       "Smooths over context",
       "Each context pair is a sample"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the \"distributional hypothesis\" in NLP?",
   "body": [
    {
     "t": "p",
     "text": "\"Words that occur in similar contexts tend to have similar meanings\" (Harris, 1954). This is the theoretical foundation for all embedding methods — Word2Vec, GloVe, FastText, and even contextual embeddings. If \"cat\" and \"dog\" appear near \"pet,\" \"feed,\" \"vet,\" they get similar vector representations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How does GloVe differ from Word2Vec?",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "Word2Vec",
      "GloVe"
     ],
     "rows": [
      [
       "Method",
       "Predictive (neural)",
       "Count-based (matrix factorization)"
      ],
      [
       "Objective",
       "Predict context/center word",
       "Minimize co-occurrence reconstruction error"
      ],
      [
       "Training",
       "Local context windows",
       "Global co-occurrence matrix"
      ],
      [
       "Math",
       "\\(\\max P(w_c \\mid w_t)\\)",
       "\\(\\min \\sum_{ij} f(X_{ij})(w_i^T \\tilde{w}_j + b_i + \\tilde{b}_j - \\log X_{ij})^2\\)"
      ],
      [
       "Analogy task",
       "Good",
       "Slightly better (captures global stats)"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is subword tokenization and why is it used?",
   "body": [
    {
     "t": "p",
     "text": "Subword tokenization (BPE, WordPiece, SentencePiece) splits words into smaller units:"
    },
    {
     "t": "ul",
     "items": [
      "\"unhappiness\" → [\"un\", \"happiness\"] or [\"un\", \"hap\", \"pi\", \"ness\"]",
      "**Why:** Handles OOV (out-of-vocabulary) words, reduces vocabulary size, shares morphological information",
      "**BPE:** Merges most frequent character pairs iteratively",
      "**WordPiece:** Similar but maximizes likelihood of training data (used by BERT)",
      "**SentencePiece:** Language-agnostic, treats input as raw Unicode (used by T5, LLaMA)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What are the key differences between NER approaches?",
   "body": [
    {
     "t": "table",
     "head": [
      "Approach",
      "Method",
      "Example"
     ],
     "rows": [
      [
       "**Rule-based**",
       "Regex, gazetteers",
       "Custom patterns for dates, phone numbers"
      ],
      [
       "**Statistical (CRF)**",
       "Sequence labeling with features",
       "BiLSTM-CRF"
      ],
      [
       "**Transformer-based**",
       "Fine-tune BERT with token classification head",
       "HuggingFace `AutoModelForTokenClassification`"
      ],
      [
       "**Few-shot/LLM**",
       "Prompt LLM with examples",
       "GPT-4 with structured output"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**BIO tagging:** B-PER (begin person), I-PER (inside person), O (outside entity)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is perplexity and why is it used?",
   "body": [
    {
     "t": "math",
     "tex": "\\text{Perplexity} = 2^{H(p)} = 2^{-\\frac{1}{N}\\sum_{i=1}^{N}\\log_2 p(w_i)}"
    },
    {
     "t": "ul",
     "items": [
      "Measures how \"surprised\" the model is by test data",
      "Lower perplexity = better language model",
      "A perplexity of \\(k\\) means the model is as uncertain as choosing uniformly among \\(k\\) words",
      "**Use:** Comparing language models (GPT-2: ~20 perplexity on WikiText)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Explain BLEU score for machine translation.",
   "body": [
    {
     "t": "math",
     "tex": "\\text{BLEU} = \\text{BP} \\cdot \\exp\\left(\\sum_{n=1}^{N} w_n \\log p_n\\right)"
    },
    {
     "t": "ul",
     "items": [
      "\\(p_n\\) = modified n-gram precision (clipped to reference count)",
      "BP = brevity penalty (penalizes short translations)",
      "Typically BLEU-4 (up to 4-grams) with uniform weights \\(w_n = 1/4\\)",
      "**Limitation:** Only measures precision, not recall; doesn't handle synonyms; poor correlation with human judgment for single sentences"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is attention in the context of seq2seq models?",
   "body": [
    {
     "t": "p",
     "text": "In vanilla seq2seq, the encoder compresses the entire input into a single fixed-size vector — information bottleneck. Attention lets the decoder look back at ALL encoder hidden states and compute a weighted sum:"
    },
    {
     "t": "math",
     "tex": "\\alpha_{ij} = \\frac{\\exp(e_{ij})}{\\sum_k \\exp(e_{ik})}, \\quad c_i = \\sum_j \\alpha_{ij} h_j"
    },
    {
     "t": "ul",
     "items": [
      "\\(e_{ij}\\) = alignment score between decoder state \\(i\\) and encoder state \\(j\\)",
      "\\(\\alpha_{ij}\\) = attention weight (softmax normalized)",
      "\\(c_i\\) = context vector (weighted sum of encoder states)"
     ]
    },
    {
     "t": "p",
     "text": "**Types:** Bahdanau (additive), Luong (multiplicative/dot-product)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What are positional encodings and why are they needed?",
   "body": [
    {
     "t": "p",
     "text": "Transformers process all tokens in parallel (no recurrence), so they have no inherent notion of word order. Positional encodings inject position information:"
    },
    {
     "t": "p",
     "text": "**Sinusoidal (original):**"
    },
    {
     "t": "math",
     "tex": "PE_{(pos, 2i)} = \\sin\\left(\\frac{pos}{10000^{2i/d}}\\right), \\quad PE_{(pos, 2i+1)} = \\cos\\left(\\frac{pos}{10000^{2i/d}}\\right)"
    },
    {
     "t": "p",
     "text": "**Modern alternatives:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Key Idea",
      "Used By"
     ],
     "rows": [
      [
       "**RoPE**",
       "Rotary embeddings in complex space",
       "LLaMA, Mistral"
      ],
      [
       "**ALiBi**",
       "Linear bias added to attention scores",
       "BLOOM, MPT"
      ],
      [
       "**Learned**",
       "Trainable embedding per position",
       "GPT-2, BERT"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Why does the scaled dot-product attention divide by \\(\\sqrt{d_k}\\)?",
   "body": [
    {
     "t": "math",
     "tex": "\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V"
    },
    {
     "t": "p",
     "text": "Without scaling, when \\(d_k\\) is large, dot products grow large in magnitude → softmax becomes very peaked (near one-hot) → gradients become tiny (vanishing). Dividing by \\(\\sqrt{d_k}\\) keeps the variance of dot products at ~1, ensuring softmax produces well-distributed attention weights."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Explain multi-head attention.",
   "body": [
    {
     "t": "p",
     "text": "Instead of one attention function, run \\(h\\) parallel attention heads with different learned projections:"
    },
    {
     "t": "math",
     "tex": "\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, ..., \\text{head}_h)W^O"
    },
    {
     "t": "math",
     "tex": "\\text{head}_i = \\text{Attention}(QW_i^Q, KW_i^K, VW_i^V)"
    },
    {
     "t": "ul",
     "items": [
      "Each head can attend to different aspects (syntax, semantics, coreference)",
      "\\(d_k = d_{model}/h\\) per head — total compute is same as single-head",
      "BERT-base: 12 heads × 64 dims = 768. GPT-3: 96 heads × 128 dims = 12288"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What are the types of Transformer models (encoder-only, decoder-only, encoder-decoder)? How does each work and what is each best for?",
   "body": [
    {
     "t": "table",
     "head": [
      "Architecture",
      "Attention Type",
      "Pre-training",
      "Best For",
      "Examples"
     ],
     "rows": [
      [
       "**Encoder-only**",
       "Bidirectional (full)",
       "MLM (masked language model)",
       "Classification, NER, embeddings, retrieval",
       "BERT, RoBERTa, DeBERTa, E5/BGE embedders"
      ],
      [
       "**Decoder-only**",
       "Causal (left-to-right)",
       "Next-token prediction",
       "Text generation, chat, reasoning, code",
       "GPT-4, LLaMA, Mistral, Claude, Gemini"
      ],
      [
       "**Encoder-Decoder**",
       "Enc: bidirectional, Dec: causal + cross-attn",
       "Span corruption / denoising",
       "Translation, summarization, seq-to-seq",
       "T5, FLAN-T5, BART, mBART"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**How each works (the key difference is the attention mask):**"
    },
    {
     "t": "ul",
     "items": [
      "**Encoder-only — bidirectional, understanding models.** Every token attends to *all* tokens (left and right), so each output embedding is a context-aware representation of the whole input. Trained by **masking ~15% of tokens and predicting them** (MLM) — this requires seeing both sides, which is why it can't generate left-to-right. You read the input *once* in parallel; there's no autoregressive loop. → Best when you need to *understand or score* a fixed input: sentiment/intent classification, NER, sentence embeddings for **semantic search / RAG retrieval**, re-rankers (cross-encoders). Not for free-form generation."
     ]
    },
    {
     "t": "ul",
     "items": [
      "**Decoder-only — causal, generative models.** A **causal mask** lets position \\(i\\) attend only to positions \\(\\leq i\\), so the model never \"sees the future.\" Trained by **next-token prediction**; at inference it generates **autoregressively** (feed output back in, one token at a time). This single objective scales beautifully and gives in-context/few-shot learning, which is why all modern LLMs (GPT, LLaMA, Claude) are decoder-only. → Best for anything *open-ended*: chat, instruction following, reasoning, code generation, agents, summarization-by-prompting."
     ]
    },
    {
     "t": "ul",
     "items": [
      "**Encoder-decoder — bidirectional read + autoregressive write.** The encoder builds a full bidirectional representation of the *source*; the decoder generates the *target* autoregressively while **cross-attending** to the encoder output. Trained by denoising / span corruption (T5). → Best for **transduction** tasks with a clear input→output mapping where the input should be fully understood before writing: machine translation, summarization, grammar correction, T5-style \"text-to-text.\""
     ]
    },
    {
     "t": "p",
     "text": "**Which to pick:** understand/classify/embed a fixed text → **encoder-only**; generate/chat/reason → **decoder-only** (the default for general-purpose LLMs); strict source→target transduction → **encoder-decoder**. Deeper mechanics, training objectives, and worked examples: [02_Transformers_InDepth.md §12](../02_Transformers_InDepth.md#12-types-bert-gpt-t5)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is BERT's pre-training objective?",
   "body": [
    {
     "t": "p",
     "text": "BERT uses two objectives:"
    },
    {
     "t": "ol",
     "items": [
      "**MLM (Masked Language Model):** Randomly mask 15% of tokens → predict them. Of the 15%: 80% replaced with [MASK], 10% random token, 10% unchanged.",
      "**NSP (Next Sentence Prediction):** Given sentence A and B, predict if B is the actual next sentence. (Later shown to be less useful — RoBERTa drops it.)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How does GPT differ from BERT fundamentally?",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "BERT",
      "GPT"
     ],
     "rows": [
      [
       "Architecture",
       "Encoder-only",
       "Decoder-only"
      ],
      [
       "Attention",
       "Bidirectional",
       "Causal (left-to-right only)"
      ],
      [
       "Pre-training",
       "MLM + NSP",
       "Next-token prediction"
      ],
      [
       "Fine-tuning",
       "Add task-specific head",
       "Few-shot / prompt-based"
      ],
      [
       "Strength",
       "Understanding / classification",
       "Generation / reasoning"
      ],
      [
       "Token visibility",
       "Sees all tokens",
       "Only sees past tokens"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is the difference between fine-tuning and feature extraction?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Fine-tuning:** Update ALL (or most) model weights on task-specific data. Higher performance but needs more data and compute. Risk of catastrophic forgetting.",
      "**Feature extraction (frozen):** Freeze pretrained weights, only train a classification head on top. Faster, needs less data, but may underperform on domain-specific tasks.",
      "**Middle ground:** Freeze bottom layers, fine-tune top layers (gradual unfreezing / discriminative learning rates)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the vanishing gradient problem in RNNs and how do LSTMs solve it?",
   "body": [
    {
     "t": "p",
     "text": "**Problem:** During backpropagation through time (BPTT), gradients are multiplied by the weight matrix at each step. If the largest eigenvalue < 1, gradients shrink exponentially → model can't learn long-range dependencies."
    },
    {
     "t": "p",
     "text": "**LSTM solution:** Cell state \\(C_t\\) acts as a \"conveyor belt\" — information flows through with only element-wise operations (no matrix multiply). Gates (forget, input, output) control what to add/remove:"
    },
    {
     "t": "math",
     "tex": "f_t = \\sigma(W_f[h_{t-1}, x_t] + b_f)"
    },
    {
     "t": "math",
     "tex": "C_t = f_t \\odot C_{t-1} + i_t \\odot \\tilde{C}_t"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is beam search and how does it differ from greedy decoding?",
   "body": [
    {
     "t": "table",
     "head": [
      "Method",
      "Strategy",
      "Pros",
      "Cons"
     ],
     "rows": [
      [
       "**Greedy**",
       "Pick highest-prob token at each step",
       "Fast",
       "Misses globally optimal sequence"
      ],
      [
       "**Beam search**",
       "Keep top-\\(k\\) candidates at each step",
       "Better quality",
       "\\(k\\times\\) slower, repetitive text"
      ],
      [
       "**Sampling**",
       "Sample from probability distribution",
       "Diverse, creative",
       "May be incoherent"
      ],
      [
       "**Top-k**",
       "Sample from top-\\(k\\) tokens only",
       "Controlled diversity",
       "\\(k\\) is a hyperparameter"
      ],
      [
       "**Top-p (nucleus)**",
       "Sample from smallest set with cumulative prob ≥ \\(p\\)",
       "Adaptive vocabulary size",
       "Still needs temperature tuning"
      ]
     ]
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

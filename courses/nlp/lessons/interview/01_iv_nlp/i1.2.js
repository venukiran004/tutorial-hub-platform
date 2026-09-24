/* ============================================================================
   INTERVIEW I1.2 — Section 2: Advanced NLP & Transformers
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/06_NLP_and_Transformers/Interview_Questions/06_NLP_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.2",
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
   "text": "Section 2: Advanced NLP & Transformers",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is the KV-cache in Transformer inference?",
   "body": [
    {
     "t": "p",
     "text": "During autoregressive generation, at step \\(t\\), the keys and values for tokens \\(1\\) to \\(t-1\\) don't change. The KV-cache stores previously computed K and V matrices so they're not recomputed:"
    },
    {
     "t": "ul",
     "items": [
      "**Without cache:** \\(O(t^2)\\) per token → \\(O(n^3)\\) total for \\(n\\) tokens",
      "**With cache:** \\(O(t)\\) per token → \\(O(n^2)\\) total",
      "**Memory cost:** 2 × num_layers × \\(d_{model}\\) × seq_len × batch_size × sizeof(dtype)",
      "For LLaMA-70B, KV-cache for 4K context ≈ 2.5 GB per request"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "Explain Flash Attention.",
   "body": [
    {
     "t": "p",
     "text": "Standard attention: compute full \\(N \\times N\\) attention matrix in HBM (slow GPU memory). Flash Attention tiles the computation — loads blocks of Q, K, V into SRAM (fast on-chip memory), computes local attention, and accumulates results:"
    },
    {
     "t": "ul",
     "items": [
      "**IO complexity:** \\(O(N^2 d / M)\\) vs \\(O(N^2)\\) HBM accesses (where \\(M\\) = SRAM size)",
      "**Result:** 2-4× faster, exact (not approximate), enables longer sequences",
      "**Flash Attention 2:** Better parallelism across sequence length dimension",
      "**Flash Attention 3:** FP8 support, async prefetching"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What are GQA, MQA, and MHA?",
   "body": [
    {
     "t": "table",
     "head": [
      "Method",
      "Keys/Values per head",
      "Models",
      "Memory"
     ],
     "rows": [
      [
       "**MHA** (Multi-Head)",
       "Each head has its own K, V",
       "BERT, GPT-3",
       "Highest"
      ],
      [
       "**MQA** (Multi-Query)",
       "All heads share ONE K, V",
       "PaLM, Falcon",
       "Lowest (~1/h of MHA)"
      ],
      [
       "**GQA** (Grouped-Query)",
       "Groups of heads share K, V",
       "LLaMA 2 70B, Mistral",
       "Middle ground"
      ]
     ]
    },
    {
     "t": "p",
     "text": "GQA with \\(g\\) groups: \\(g=1\\) is MQA, \\(g=h\\) is MHA. LLaMA 2 70B uses \\(g=8\\) for 64 heads."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is speculative decoding?",
   "body": [
    {
     "t": "p",
     "text": "Use a small \"draft\" model to generate \\(k\\) tokens quickly, then verify all \\(k\\) in parallel with the large model. If the large model agrees, accept all \\(k\\) tokens in one step:"
    },
    {
     "t": "ul",
     "items": [
      "**Speedup:** 2-3× with no quality loss (mathematically equivalent to sampling from large model)",
      "**Rejection:** If draft token \\(i\\) is rejected, resample from adjusted distribution and discard tokens \\(i+1\\) to \\(k\\)",
      "**Requirement:** Draft model must be much faster (e.g., 7B draft for 70B target)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is PagedAttention (vLLM)?",
   "body": [
    {
     "t": "p",
     "text": "KV-cache memory is wasted due to fragmentation (pre-allocated for max_seq_len). PagedAttention borrows OS virtual memory concepts:"
    },
    {
     "t": "ul",
     "items": [
      "Divide KV-cache into fixed-size \"pages\" (blocks)",
      "Allocate pages on demand as sequence grows",
      "Non-contiguous physical memory mapped via page table",
      "**Result:** Near-zero waste, 2-4× higher throughput, enables continuous batching"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "26",
   "q": "Explain RoPE (Rotary Position Embedding).",
   "body": [
    {
     "t": "p",
     "text": "RoPE encodes position by rotating the query and key vectors in 2D subspaces:"
    },
    {
     "t": "math",
     "tex": "f(x, m) = x \\cdot e^{im\\theta}"
    },
    {
     "t": "ul",
     "items": [
      "Position \\(m\\) rotates each pair of dimensions by angle \\(m\\theta_i\\)",
      "The dot product \\(q \\cdot k\\) naturally depends on relative position \\(m - n\\)",
      "**Advantages:** Relative position awareness, extrapolates to longer sequences (with NTK-aware scaling), no separate positional embedding to add",
      "**Used by:** LLaMA, Mistral, Qwen, Gemma"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is BPE tokenization and how does it work step by step?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Step 1: Start with character-level vocabulary + end-of-word token\n        \"low\" → ['l', 'o', 'w', '</w>']\n        \nStep 2: Count all adjacent character pairs in corpus\n        ('l', 'o'): 5, ('o', 'w'): 7, ('w', '</w>'): 9, ...\n\nStep 3: Merge the most frequent pair into a new token\n        ('w', '</w>') → 'w</w>'\n\nStep 4: Repeat steps 2-3 for desired vocabulary size (e.g., 32K, 50K)\n\nResult: Common words are single tokens, rare words are subword pieces\n        \"unhappiness\" → [\"un\", \"happiness\"] (2 tokens)\n        \"electroencephalogram\" → [\"electro\", \"ence\", \"phal\", \"ogram\"] (4 tokens)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "How do you handle class imbalance in text classification?",
   "body": [
    {
     "t": "table",
     "head": [
      "Strategy",
      "Method"
     ],
     "rows": [
      [
       "**Data-level**",
       "Oversampling minority (back-translation, paraphrasing), undersampling majority"
      ],
      [
       "**Loss-level**",
       "Weighted cross-entropy, focal loss (\\(\\gamma\\)=2), class-balanced loss"
      ],
      [
       "**Architecture**",
       "Ensemble of models trained on balanced subsets"
      ],
      [
       "**Threshold**",
       "Adjust decision threshold using precision-recall curve"
      ],
      [
       "**Augmentation**",
       "Synonym replacement, random insertion/swap/deletion, LLM-generated examples"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is the difference between static and contextual embeddings?",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "Static (Word2Vec, GloVe)",
      "Contextual (BERT, GPT)"
     ],
     "rows": [
      [
       "Representation",
       "One vector per word",
       "Different vector per context"
      ],
      [
       "Polysemy",
       "Can't handle (\"bank\" = one vector)",
       "Handles naturally (\"river bank\" ≠ \"bank account\")"
      ],
      [
       "Training",
       "Unsupervised co-occurrence",
       "Self-supervised (MLM or LM)"
      ],
      [
       "Dimension",
       "100-300",
       "768-4096+"
      ],
      [
       "Compute",
       "Lookup table",
       "Full forward pass"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "How does BERT handle multiple sentences / sentence pairs?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Input: [CLS] Sentence A [SEP] Sentence B [SEP]\n\nToken embeddings:      E_[CLS]  E_w1  E_w2  E_[SEP]  E_w3  E_w4  E_[SEP]\nSegment embeddings:    E_A      E_A   E_A   E_A      E_B   E_B   E_B\nPosition embeddings:   E_0      E_1   E_2   E_3      E_4   E_5   E_6\n\nFinal input = Token + Segment + Position (element-wise sum)"
    },
    {
     "t": "p",
     "text": "Tasks using sentence pairs: NLI, paraphrase detection, question answering, semantic similarity"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is knowledge distillation for NLP models?",
   "body": [
    {
     "t": "p",
     "text": "Train a smaller \"student\" model to mimic a larger \"teacher\" model:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = \\alpha \\cdot \\mathcal{L}_{CE}(y, \\hat{y}_{student}) + (1-\\alpha) \\cdot T^2 \\cdot \\text{KL}(\\sigma(\\frac{z_t}{T}) \\| \\sigma(\\frac{z_s}{T}))"
    },
    {
     "t": "ul",
     "items": [
      "\\(T\\) = temperature (typically 2-10, softens probabilities)",
      "**DistilBERT:** 6 layers (vs BERT's 12), 97% performance, 60% faster, 40% smaller",
      "**TinyBERT:** Also distills attention matrices and hidden states",
      "**Use case:** Production deployment where latency matters"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "Explain the Transformer feed-forward network (FFN).",
   "body": [
    {
     "t": "p",
     "text": "Each Transformer layer has an FFN applied independently to each position:"
    },
    {
     "t": "math",
     "tex": "\\text{FFN}(x) = \\text{GELU}(xW_1 + b_1)W_2 + b_2"
    },
    {
     "t": "ul",
     "items": [
      "\\(W_1 \\in \\mathbb{R}^{d_{model} \\times d_{ff}}\\), \\(W_2 \\in \\mathbb{R}^{d_{ff} \\times d_{model}}\\)",
      "Typically \\(d_{ff} = 4 \\times d_{model}\\) (BERT: 768→3072→768)",
      "Acts as a \"memory\" — stores factual associations (recent research shows FFN layers store knowledge)",
      "**SwiGLU** (used in LLaMA): \\(\\text{SwiGLU}(x) = (\\text{Swish}(xW_1) \\odot xV)W_2\\) — better than GELU"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is Layer Normalization and why is it preferred over Batch Norm in NLP?",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "Batch Norm",
      "Layer Norm"
     ],
     "rows": [
      [
       "Normalizes across",
       "Batch dimension",
       "Feature dimension"
      ],
      [
       "Dependency",
       "Needs batch statistics",
       "Independent per sample"
      ],
      [
       "Variable length",
       "Problematic (padding)",
       "Works naturally"
      ],
      [
       "Inference",
       "Needs running mean/var",
       "Same as training"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Pre-Norm vs Post-Norm:**"
    },
    {
     "t": "ul",
     "items": [
      "Post-Norm (original): \\(x + \\text{Sublayer}(\\text{LN}(x))\\) — harder to train deep models",
      "Pre-Norm (GPT-2+): \\(\\text{LN}(x + \\text{Sublayer}(x))\\) — more stable, used in all modern LLMs"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What are the common NLP evaluation metrics beyond accuracy?",
   "body": [
    {
     "t": "table",
     "head": [
      "Metric",
      "Use Case",
      "Formula"
     ],
     "rows": [
      [
       "**BLEU**",
       "Translation",
       "Modified n-gram precision"
      ],
      [
       "**ROUGE-L**",
       "Summarization",
       "Longest common subsequence F1"
      ],
      [
       "**METEOR**",
       "Translation",
       "Considers synonyms, stems"
      ],
      [
       "**BERTScore**",
       "Any generation",
       "Cosine similarity of BERT embeddings"
      ],
      [
       "**Perplexity**",
       "Language model quality",
       "\\(2^{H(p)}\\)"
      ],
      [
       "**F1 (token-level)**",
       "NER, QA",
       "Token-overlap F1 between pred and gold"
      ],
      [
       "**Exact Match**",
       "QA",
       "Prediction exactly matches answer"
      ],
      [
       "**SacreBLEU**",
       "Translation (standardized)",
       "Standardized BLEU with fixed tokenization"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "How does T5 unify all NLP tasks?",
   "body": [
    {
     "t": "p",
     "text": "T5 (Text-to-Text Transfer Transformer) converts every NLP task to text-to-text format:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Translation:     \"translate English to French: The house is wonderful.\" → \"La maison est merveilleuse.\"\nSummarization:   \"summarize: <long article>\" → \"<summary>\"\nClassification:  \"sst2 sentence: This movie was great\" → \"positive\"\nQA:              \"question: What is the capital? context: ...\" → \"Paris\"\nNER:             \"ner: John went to Paris\" → \"John: PER, Paris: LOC\""
    },
    {
     "t": "p",
     "text": "**Pre-training:** Span corruption (mask random spans, predict them). Encoder-decoder architecture."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is the difference between RoBERTa and BERT?",
   "body": [
    {
     "t": "table",
     "head": [
      "Change",
      "BERT",
      "RoBERTa"
     ],
     "rows": [
      [
       "NSP objective",
       "Yes",
       "Removed (no improvement)"
      ],
      [
       "Training data",
       "16GB (BookCorpus + Wikipedia)",
       "160GB (+ CC News, Stories, Web)"
      ],
      [
       "Batch size",
       "256",
       "8K"
      ],
      [
       "Training steps",
       "1M",
       "500K (more data, larger batch)"
      ],
      [
       "Masking",
       "Static (same mask each epoch)",
       "Dynamic (new mask each epoch)"
      ],
      [
       "Result",
       "—",
       "+2-4% on most benchmarks"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "How do you build a production NLP pipeline?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "DATA PIPELINE:\n  Raw Text → Language Detection → Encoding Normalization (UTF-8)\n  → PII Redaction → Deduplication → Quality Filtering\n\nMODEL PIPELINE:\n  Text → Tokenizer → Model → Post-processing → Response\n  \nSERVING:\n  HuggingFace Pipeline → ONNX export → TensorRT optimization\n  → Triton Inference Server → Load Balancer → API\n\nMONITORING:\n  - Token distribution shift (embedding drift)\n  - Latency p50/p95/p99\n  - Error rate by input language\n  - Output quality sampling"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is cross-lingual transfer and how do multilingual models work?",
   "body": [
    {
     "t": "p",
     "text": "Multilingual models (mBERT, XLM-R) are trained on text from 100+ languages simultaneously. They develop a shared representation space where similar concepts across languages are close:"
    },
    {
     "t": "ul",
     "items": [
      "**Zero-shot transfer:** Fine-tune on English NER, evaluate on German — works surprisingly well",
      "**Why it works:** Shared subwords, similar sentence structures, and attention patterns that generalize",
      "**XLM-R:** 100 languages, 270M params, trained with MLM only (no parallel data needed)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is coreference resolution?",
   "body": [
    {
     "t": "p",
     "text": "Identifying all mentions in text that refer to the same entity:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "\"Alice went to the store. She bought milk. The woman then drove home.\"\n ───── ─────────────── ──── ──────────\n   └─────────────────┴──────┴─── All refer to \"Alice\""
    },
    {
     "t": "ul",
     "items": [
      "**Approaches:** Mention-pair models, mention-ranking models, span-based (Lee et al.), LLM-based",
      "**Metrics:** MUC, B³, CEAF, CoNLL average",
      "**Modern:** SpanBERT + higher-order inference achieves near-human performance"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the difference between extractive and abstractive summarization?",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "Extractive",
      "Abstractive"
     ],
     "rows": [
      [
       "Method",
       "Select important sentences from source",
       "Generate new sentences"
      ],
      [
       "Model",
       "TextRank, BERT + sentence scoring",
       "T5, BART, Pegasus"
      ],
      [
       "Faithfulness",
       "Always faithful (copies source)",
       "May hallucinate"
      ],
      [
       "Fluency",
       "May be choppy",
       "More natural"
      ],
      [
       "Evaluation",
       "ROUGE overlap",
       "ROUGE + BERTScore + faithfulness"
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

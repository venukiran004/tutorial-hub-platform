/* ============================================================================
   INTERVIEW I1.3 — Section 3: Transformers Deep Dive
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/06_NLP_and_Transformers/Interview_Questions/06_NLP_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.3",
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
   "text": "Section 3: Transformers Deep Dive",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "41",
   "q": "How do you calculate the number of parameters in a Transformer?",
   "body": [
    {
     "t": "p",
     "text": "For a standard Transformer with \\(L\\) layers, \\(d\\) model dimension, \\(h\\) heads, vocab size \\(V\\):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Embedding:        V × d\nPer layer:\n  - Attention:    4 × d² (Q, K, V projections + output)\n  - FFN:          2 × d × 4d = 8d²\n  - LayerNorm:    2 × 2d (two norms, each with scale+bias)\nTotal per layer:  ≈ 12d²\nAll layers:       12 × L × d²\nOutput head:      d × V (often tied with embedding)\n\nGPT-3 175B: L=96, d=12288, h=96, V=50257\n  Embedding:  50257 × 12288 ≈ 617M\n  Layers:     96 × 12 × 12288² ≈ 174B\n  Total:      ≈ 175B"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the difference between pre-training, fine-tuning, and prompting?",
   "body": [
    {
     "t": "table",
     "head": [
      "Stage",
      "Data",
      "Parameters Updated",
      "Cost"
     ],
     "rows": [
      [
       "**Pre-training**",
       "Trillions of tokens (web crawl)",
       "All",
       "$1M–$100M+"
      ],
      [
       "**Fine-tuning**",
       "Task-specific (1K–100K examples)",
       "All or subset (LoRA)",
       "$10–$10K"
      ],
      [
       "**Prompting**",
       "Zero/few examples in prompt",
       "None",
       "$0.001/query"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Trend:** As models get larger, prompting becomes more effective → less need for fine-tuning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "Explain the Mixture of Experts (MoE) architecture.",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Input → Router (gating network) → selects top-k experts\n                                          ↓\n    ┌──────────┬──────────┬──────────┬──────────┐\n    │ Expert 1 │ Expert 2 │ Expert 3 │ Expert N │   (each = FFN)\n    └──────────┴──────────┴──────────┴──────────┘\n                      ↓\n              Weighted sum of selected experts' outputs"
    },
    {
     "t": "ul",
     "items": [
      "**Sparse activation:** Only top-\\(k\\) experts (typically \\(k=2\\)) are activated per token",
      "**Total params:** 8× more than dense equivalent, but same compute (same FLOPs)",
      "**Examples:** Mixtral 8×7B (46.7B total, 12.9B active), Switch Transformer, GPT-4 (rumored)",
      "**Challenge:** Load balancing — auxiliary loss to prevent all tokens routing to same expert"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is the difference between causal and bidirectional attention masks?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "BIDIRECTIONAL (BERT):           CAUSAL (GPT):\n  T1 T2 T3 T4                    T1 T2 T3 T4\nT1 √  √  √  √                 T1 √  ×  ×  ×\nT2 √  √  √  √                 T2 √  √  ×  ×\nT3 √  √  √  √                 T3 √  √  √  ×\nT4 √  √  √  √                 T4 √  √  √  √\n\nPREFIX-LM (T5 encoder):        CAUSAL achieves this by setting\n  Like bidirectional but         masked positions to -∞ before\n  only for the prefix            softmax → attention weight = 0"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is the scaling law for LLMs?",
   "body": [
    {
     "t": "p",
     "text": "Kaplan et al. (2020) and Chinchilla (Hoffmann et al., 2022):"
    },
    {
     "t": "math",
     "tex": "L(N, D) \\propto \\frac{1}{N^{0.076}} + \\frac{1}{D^{0.095}}"
    },
    {
     "t": "ul",
     "items": [
      "\\(N\\) = number of parameters, \\(D\\) = number of training tokens",
      "**Chinchilla-optimal:** \\(D \\approx 20N\\) (train on 20 tokens per parameter)",
      "GPT-3 (175B) trained on 300B tokens → **undertrained** by Chinchilla standards (should be 3.5T)",
      "LLaMA-2 70B trained on 2T tokens → **overtrained** (inference-efficient)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "How does DeBERTa improve over BERT?",
   "body": [
    {
     "t": "ol",
     "items": [
      "**Disentangled attention:** Separate content and position embeddings, compute attention as sum of content-to-content, content-to-position, and position-to-content scores",
      "**Enhanced mask decoder:** Absolute position added only in the final decoding layer (not input)",
      "**Result:** Surpassed human performance on SuperGLUE, state-of-the-art among encoder models"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is continuous batching in LLM serving?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "STATIC BATCHING:\n  Request 1: ████████████████████ (done)\n  Request 2: ████████████████████████████ (done)\n  Request 3: ████████████████ (done, but waited for longest)\n  ← All requests wait for longest to finish →\n\nCONTINUOUS BATCHING (vLLM, TGI):\n  Request 1: ████████ (done → slot freed)\n  Request 4: ··········████████ (starts immediately in freed slot)\n  Request 2: ████████████████ (done)\n  Request 3: ████████████ (done)\n  ← New requests start as old ones finish →"
    },
    {
     "t": "ul",
     "items": [
      "**Result:** 2-5× throughput improvement",
      "**Implementation:** Iteration-level scheduling, not request-level"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is prefix caching / prompt caching?",
   "body": [
    {
     "t": "p",
     "text": "If multiple requests share the same system prompt or prefix:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Request 1: [System prompt] + \"What is Python?\"    → cache system prompt KV\nRequest 2: [System prompt] + \"What is Java?\"      → reuse cached KV, only compute new tokens\nRequest 3: [System prompt] + \"What is Rust?\"      → reuse cached KV"
    },
    {
     "t": "ul",
     "items": [
      "Saves redundant computation for shared prefixes",
      "Implemented in vLLM (automatic prefix caching), SGLang (RadixAttention)",
      "**Benefit:** 2-10× TTFT (time to first token) reduction for shared-prefix workloads"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is RMSNorm and why is it used instead of LayerNorm?",
   "body": [
    {
     "t": "math",
     "tex": "\\text{RMSNorm}(x) = \\frac{x}{\\text{RMS}(x)} \\cdot \\gamma, \\quad \\text{RMS}(x) = \\sqrt{\\frac{1}{n}\\sum_{i=1}^n x_i^2}"
    },
    {
     "t": "ul",
     "items": [
      "Removes the mean-centering step from LayerNorm (only re-scales, no re-centering)",
      "~10-15% faster than LayerNorm with equivalent performance",
      "Used in: LLaMA, Mistral, Qwen, Gemma"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is the difference between BERT's [CLS] token and mean pooling for embeddings?",
   "body": [
    {
     "t": "table",
     "head": [
      "Method",
      "Description",
      "When Better"
     ],
     "rows": [
      [
       "**[CLS] token**",
       "Use the output of the [CLS] position",
       "After fine-tuning on sentence tasks"
      ],
      [
       "**Mean pooling**",
       "Average all token embeddings",
       "Out-of-the-box BERT (no fine-tuning)"
      ],
      [
       "**Max pooling**",
       "Element-wise max across tokens",
       "Rare, less common"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Best practice:** For semantic similarity, use a model fine-tuned with contrastive loss (Sentence-BERT / E5 / BGE) with mean pooling."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "51",
   "q": "What is the Mamba / State Space Model (SSM) architecture?",
   "body": [
    {
     "t": "p",
     "text": "Alternative to Transformers that processes sequences in \\(O(n)\\) instead of \\(O(n^2)\\):"
    },
    {
     "t": "ul",
     "items": [
      "**Core idea:** Model sequence as a continuous-time dynamical system discretized for computation",
      "**Selection mechanism:** Input-dependent parameters (unlike fixed convolution kernels)",
      "**Advantages:** Linear time and memory, natural for very long sequences (100K+)",
      "**Disadvantages:** No random-access attention (can't \"look up\" specific tokens), slightly worse on retrieval tasks",
      "**Hybrid approaches:** Jamba (Mamba + Attention layers interleaved)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What is instruction tuning?",
   "body": [
    {
     "t": "p",
     "text": "Fine-tuning a pre-trained LLM on (instruction, response) pairs to make it follow human instructions:"
    },
    {
     "t": "ul",
     "items": [
      "**Data:** \"Summarize this article: ...\" → \"summary\", \"Write a Python function that...\" → \"code\"",
      "**Scale:** FLAN (1.8K tasks, 473 datasets), Alpaca (52K GPT-generated), Open-Orca",
      "**Effect:** Transforms a next-word predictor into a helpful assistant",
      "**Self-Instruct:** Use the model itself to generate instruction-response pairs"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is RLHF and how does it work?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Step 1: SFT (Supervised Fine-Tuning)\n  Pre-trained LLM → fine-tune on (prompt, good_response) pairs\n\nStep 2: Reward Model Training\n  Human ranks multiple responses → train reward model to predict ranking\n\nStep 3: PPO (Proximal Policy Optimization)\n  RL optimizes: maximize reward while staying close to SFT policy (KL penalty)\n  \n  Loss = E[reward(response)] - β × KL(π_RL || π_SFT)"
    },
    {
     "t": "ul",
     "items": [
      "**Alternatives:** DPO (Direct Preference Optimization) — no reward model needed, simpler",
      "**ORPO:** Odds Ratio Preference Optimization — single-stage, even simpler"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is LoRA and how does it reduce fine-tuning cost?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Original weight: W (d × d, frozen)\nLoRA adapters:   A (d × r) and B (r × d), where r << d\n\nForward pass:    y = Wx + BAx\n\nTrainable params: 2 × d × r  (vs d² for full fine-tuning)\nExample: d=4096, r=16 → 131K vs 16.7M parameters (128× reduction)"
    },
    {
     "t": "ul",
     "items": [
      "**QLoRA:** Quantize base model to 4-bit + LoRA → fine-tune 70B model on single 48GB GPU",
      "**Rank \\(r\\):** Typically 8-64. Higher = more capacity but more memory",
      "**Alpha (\\(\\alpha\\)):** Scaling factor, typically \\(\\alpha = 2r\\)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What are the key differences between ROUGE variants?",
   "body": [
    {
     "t": "table",
     "head": [
      "Metric",
      "Measures",
      "Formula"
     ],
     "rows": [
      [
       "**ROUGE-1**",
       "Unigram overlap",
       "\\(\\frac{|unigrams_{pred} \\cap unigrams_{ref}|}{|unigrams_{ref}|}\\)"
      ],
      [
       "**ROUGE-2**",
       "Bigram overlap",
       "Same, with bigrams"
      ],
      [
       "**ROUGE-L**",
       "Longest Common Subsequence",
       "LCS-based F-measure"
      ],
      [
       "**ROUGE-Lsum**",
       "Per-sentence ROUGE-L averaged",
       "Better for multi-sentence"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "How does Sentence-BERT create sentence embeddings?",
   "body": [
    {
     "t": "p",
     "text": "Standard BERT requires cross-encoding (pass both sentences together) — \\(O(n^2)\\) for \\(n\\) sentences. Sentence-BERT:"
    },
    {
     "t": "ol",
     "items": [
      "Encode each sentence independently through BERT",
      "Apply mean pooling over token outputs",
      "Train with contrastive loss (cosine similarity + triplet loss)",
      "At inference: embed once, compare with cosine similarity → \\(O(n)\\)"
     ]
    },
    {
     "t": "p",
     "text": "**Applications:** Semantic search, clustering, duplicate detection, RAG retrieval"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is Retrieval-Augmented Generation (RAG)?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Query → Embed query → Search vector DB → Retrieve top-k chunks\n                                               ↓\n                                    Augment prompt with retrieved context\n                                               ↓\n                                    LLM generates grounded response"
    },
    {
     "t": "ul",
     "items": [
      "**Why:** LLMs have knowledge cutoffs and hallucinate. RAG provides up-to-date, verifiable facts.",
      "**Components:** Document chunking, embedding model, vector store (Pinecone, ChromaDB), retriever, reranker",
      "**Advanced:** HyDE (hypothetical document embedding), multi-query retrieval, graph RAG"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is the difference between sparse and dense retrieval?",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "Sparse (BM25/TF-IDF)",
      "Dense (Embedding)"
     ],
     "rows": [
      [
       "Representation",
       "Sparse term-frequency vector",
       "Dense neural embedding"
      ],
      [
       "Matching",
       "Exact keyword match",
       "Semantic similarity"
      ],
      [
       "OOV handling",
       "Can't handle synonyms",
       "Captures meaning"
      ],
      [
       "Efficiency",
       "Inverted index, very fast",
       "ANN index (HNSW, IVF)"
      ],
      [
       "Training",
       "No training needed",
       "Needs contrastive training"
      ],
      [
       "Best for",
       "Exact term queries, legal",
       "Semantic queries, QA"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Hybrid:** Combine BM25 + dense retrieval with Reciprocal Rank Fusion (RRF)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "Explain the Transformer training instabilities and how to fix them.",
   "body": [
    {
     "t": "table",
     "head": [
      "Issue",
      "Cause",
      "Fix"
     ],
     "rows": [
      [
       "**Loss spikes**",
       "Learning rate too high, bad data batch",
       "LR warmup, gradient clipping, data filtering"
      ],
      [
       "**NaN loss**",
       "Overflow in FP16 attention logits",
       "Mixed precision (BF16), loss scaling"
      ],
      [
       "**Slow convergence**",
       "Poor initialization",
       "GPT-style init (scale residual by \\(1/\\sqrt{2N}\\))"
      ],
      [
       "**Training collapse**",
       "MoE load imbalance",
       "Auxiliary load-balancing loss"
      ],
      [
       "**Forgetting**",
       "Catastrophic forgetting in fine-tuning",
       "Low LR, EWC, LoRA, replay buffer"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "How do you evaluate an LLM beyond perplexity?",
   "body": [
    {
     "t": "table",
     "head": [
      "Benchmark",
      "What It Tests",
      "Format"
     ],
     "rows": [
      [
       "**MMLU**",
       "World knowledge (57 subjects)",
       "Multiple choice"
      ],
      [
       "**HumanEval**",
       "Code generation",
       "Pass@k"
      ],
      [
       "**GSM8K**",
       "Math reasoning (grade school)",
       "CoT + answer"
      ],
      [
       "**TruthfulQA**",
       "Truthfulness (avoids common misconceptions)",
       "MC + generation"
      ],
      [
       "**MT-Bench**",
       "Multi-turn conversation quality",
       "LLM-as-judge (GPT-4)"
      ],
      [
       "**HELM**",
       "Holistic evaluation (42 scenarios)",
       "Multiple metrics"
      ],
      [
       "**Arena ELO**",
       "Human preference (Chatbot Arena)",
       "Pairwise comparison"
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

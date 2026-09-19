/* ============================================================================
   PRACTICE P5.1 — Transformers and Attention · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/04_Transformers_and_Attention.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p5.1",
 "lede": "**25 scenarios** from Transformers and Attention. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "What is the Transformer architecture?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A neural network based entirely on self-attention mechanisms, without recurrence or convolutions:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: [Multi-Head Self-Attention → Add&Norm → FFN → Add&Norm] × N\nDecoder: [Masked Self-Attention → Add&Norm → Cross-Attention → Add&Norm → FFN → Add&Norm] × N"
    },
    {
     "t": "p",
     "text": "**Key innovation:** Self-attention allows every position to attend to every other position in parallel. O(1) sequential operations vs O(n) for RNNs."
    },
    {
     "t": "p",
     "text": "**Explanation:** \"Attention Is All You Need\" (2017). Revolutionized NLP and now dominates vision, audio, and multi-modal tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is self-attention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Each token computes attention over ALL tokens in the same sequence:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Q = X · W_Q  (queries)\nK = X · W_K  (keys)\nV = X · W_V  (values)\nAttention(Q,K,V) = softmax(Q · K^T / √d_k) · V"
    },
    {
     "t": "p",
     "text": "**Explanation:** For \"The cat sat on the mat\" — \"sat\" attends to \"cat\" (subject), \"mat\" (location), weighted by relevance. Unlike RNN where information must flow sequentially, self-attention connects all positions directly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Why is the dot product scaled by √d_k?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For large d_k, dot products grow large in magnitude → softmax produces extremely peaked distributions → vanishing gradients."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "If q, k ~ N(0,1) with d_k dimensions:\nE[q·k] = 0, Var[q·k] = d_k\nAfter scaling: Var[q·k/√d_k] = 1"
    },
    {
     "t": "p",
     "text": "**Explanation:** Scaling keeps the variance of dot products to 1, ensuring softmax produces a well-distributed attention pattern rather than near-one-hot."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is multi-head attention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Run multiple attention operations in parallel with different learned projections:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "MultiHead(Q,K,V) = Concat(head_1, ..., head_h) · W_O\nwhere head_i = Attention(Q·W_Qi, K·W_Ki, V·W_Vi)"
    },
    {
     "t": "p",
     "text": "**Why:** Different heads learn to attend to different types of relationships: syntactic, semantic, positional, etc."
    },
    {
     "t": "p",
     "text": "**Typical:** 8 or 16 heads. Each head has d_model/h dimensions."
    },
    {
     "t": "p",
     "text": "**Explanation:** Single attention can only focus on one pattern. Multi-head captures multiple relationships simultaneously. Head 1 might learn syntax, Head 2 semantics, Head 3 coreference."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is positional encoding?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Since Transformers have no recurrence/convolution, position information must be explicitly added:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "PE(pos, 2i) = sin(pos / 10000^(2i/d_model))\nPE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))"
    },
    {
     "t": "p",
     "text": "**Types:** Sinusoidal (fixed), learned, rotary (RoPE), relative (T5)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without positional encoding, \"cat chased dog\" = \"dog chased cat\" (permutation invariant). Sinusoidal encoding can generalize to unseen sequence lengths. RoPE (used in LLaMA, GPT-NeoX) encodes relative positions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is the difference between encoder-only, decoder-only, and encoder-decoder Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Encoder-only (BERT):** Bidirectional. Good for understanding (classification, NER). Can't generate.",
      "**Decoder-only (GPT):** Unidirectional (causal mask). Good for generation. Can also do classification.",
      "**Encoder-decoder (T5, BART):** Full architecture. Good for seq2seq (translation, summarization)."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GPT dominates current landscape (scaled decoder-only is extremely versatile). BERT still used for embedding and classification. T5 for structured seq2seq."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the causal mask in decoder self-attention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Prevents attending to future positions during autoregressive generation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Mask = [[1, 0, 0, 0],\n        [1, 1, 0, 0],\n        [1, 1, 1, 0],\n        [1, 1, 1, 1]]"
    },
    {
     "t": "p",
     "text": "Position i can only attend to positions ≤ i."
    },
    {
     "t": "p",
     "text": "**Explanation:** During generation, token at position 3 shouldn't see positions 4, 5, ... (they don't exist yet). Mask sets future attention scores to -∞ before softmax → zero attention weight."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is cross-attention in the decoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Decoder attends to encoder's output:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Q = decoder_hidden_state    (from decoder)\nK = encoder_output          (from encoder)\nV = encoder_output          (from encoder)"
    },
    {
     "t": "p",
     "text": "**Explanation:** This is how the decoder \"reads\" the input. For translation: decoder generating French word attends to relevant English words from encoder. Without cross-attention, decoder has no access to input."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is the Feed-Forward Network (FFN) in Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Two linear layers with activation between:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "FFN(x) = W₂ · GELU(W₁ · x + b₁) + b₂\n# W₁: d_model → d_ff (typically 4× d_model)\n# W₂: d_ff → d_model"
    },
    {
     "t": "p",
     "text": "**Explanation:** Applied position-wise (independently at each position). Acts as a \"memory\" — stores factual knowledge. Larger FFN = more knowledge capacity. MoE (Mixture of Experts) uses multiple FFNs and routes each token to relevant expert."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is Layer Normalization in Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Normalizes across the feature dimension (not batch dimension like batch norm):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "LayerNorm(x) = γ × (x - μ) / √(σ² + ε) + β\nwhere μ, σ computed across features for each token independently"
    },
    {
     "t": "p",
     "text": "**Pre-norm vs Post-norm:**"
    },
    {
     "t": "ul",
     "items": [
      "Post-norm (original): `x + Sublayer(LayerNorm(x))` — harder to train deep models",
      "Pre-norm (GPT-2+): `LayerNorm(x + Sublayer(x))` — more stable training"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Layer norm is independent of batch size (works with batch size 1). Pre-norm is now standard for large models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is BERT?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Bidirectional Encoder Representations from Transformers."
    },
    {
     "t": "p",
     "text": "**Pre-training tasks:**"
    },
    {
     "t": "ol",
     "items": [
      "**MLM:** Mask 15% of tokens, predict them from context",
      "**NSP:** Predict if two sentences follow each other"
     ]
    },
    {
     "t": "p",
     "text": "**Architecture:** 12 layers, 768 hidden, 12 heads (BERT-base). 110M parameters."
    },
    {
     "t": "p",
     "text": "**Explanation:** Bidirectional context → \"bank\" gets different representation based on \"river\" vs \"money.\" Fine-tune for classification, NER, QA by adding task-specific head."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is GPT?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generative Pre-trained Transformer. Decoder-only, autoregressive."
    },
    {
     "t": "p",
     "text": "**Pre-training:** Next token prediction on massive text corpus."
    },
    {
     "t": "p",
     "text": "**Scaling:** GPT-1 (117M) → GPT-2 (1.5B) → GPT-3 (175B) → GPT-4 (rumored 1.8T MoE)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Showed that scaling language models dramatically improves capabilities. Few-shot learning emerges at scale. Foundation of ChatGPT, GitHub Copilot. Decoder-only is simpler and scales better."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the difference between BERT and GPT?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
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
       "Context",
       "Bidirectional",
       "Left-to-right"
      ],
      [
       "Pre-training",
       "Masked LM",
       "Next token prediction"
      ],
      [
       "Best for",
       "Understanding (classification)",
       "Generation (text completion)"
      ],
      [
       "Fine-tuning",
       "Add classification head",
       "Prompt-based"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** BERT sees full context → better for understanding. GPT generates left-to-right → natural for generation. GPT-3+ can do classification via prompting without fine-tuning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is T5 (Text-To-Text Transfer Transformer)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Frames every NLP task as text-to-text:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Classification: \"classify: This movie is great\" → \"positive\"\nTranslation: \"translate English to French: Hello\" → \"Bonjour\"\nSummarization: \"summarize: [long text]\" → \"[summary]\""
    },
    {
     "t": "p",
     "text": "**Explanation:** Unified framework — same model, same training procedure for all tasks. Encoder-decoder architecture. Showed that text-to-text is a powerful universal interface. Inspired the prompting paradigm."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is the KV-cache in autoregressive generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Cache key and value tensors from previous tokens to avoid recomputing them:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Without cache: each new token recomputes K,V for ALL previous tokens\nWith cache: only compute K,V for new token, concatenate with cached K,V"
    },
    {
     "t": "p",
     "text": "**Speedup:** O(1) per token instead of O(n). Essential for efficient generation."
    },
    {
     "t": "p",
     "text": "**Explanation:** During generation, previous tokens' K,V don't change. Caching avoids redundant computation. Memory cost: cache grows with sequence length × layers × heads."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is Rotary Positional Encoding (RoPE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Encodes relative position through rotation of query and key vectors:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Apply rotation matrix R(θ·m) to position m:\nq_rotated = R(θ·m) · q\nk_rotated = R(θ·n) · k\nq_rotated · k_rotated depends on (m-n), i.e., relative position"
    },
    {
     "t": "p",
     "text": "**Explanation:** Decays attention naturally with distance. Generalizes to longer sequences than seen in training (with some degradation). Used in LLaMA, GPT-NeoX, PaLM. Superior to absolute positional embeddings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is Flash Attention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** IO-aware implementation of attention that reduces memory reads/writes:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: O(N²) memory for attention matrix\nFlash Attention: O(N) memory — computes attention in tiles, never materializes full N×N matrix"
    },
    {
     "t": "p",
     "text": "**Speedup:** 2-4× faster, enables longer sequences. No approximation — exact same computation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Bottleneck is memory bandwidth, not FLOPs. Flash Attention fuses operations, uses tiling and recomputation to minimize GPU memory transfers. Essential for training large models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is Multi-Query Attention (MQA)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Share key and value heads across all query heads:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: h query heads, h key heads, h value heads\nMQA: h query heads, 1 key head, 1 value head\nGQA: h query heads, g key/value groups (between MQA and MHA)"
    },
    {
     "t": "p",
     "text": "**Benefit:** Much smaller KV-cache → faster inference, larger batch sizes."
    },
    {
     "t": "p",
     "text": "**Trade-off:** Slight quality drop, significant speed improvement."
    },
    {
     "t": "p",
     "text": "**Explanation:** KV-cache is the memory bottleneck during generation. MQA/GQA reduce KV-cache by h/1 or h/g. Used in PaLM, LLaMA 2, Falcon."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is Mixture of Experts (MoE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Replace single FFN with multiple \"expert\" FFNs and a gating network:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Router/Gate selects top-k experts per token\ngate_scores = softmax(W_gate · x)  # [num_experts]\ntop_k = select_top_k(gate_scores, k=2)\noutput = Σ gate_score_i × expert_i(x)  # weighted sum of selected experts"
    },
    {
     "t": "p",
     "text": "**Explanation:** Each token processed by only k experts (e.g., 2 out of 64). Total parameters huge but computation per token is small. Mixtral 8×7B: 47B params but only uses 13B per token."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the context window limitation and how is it addressed?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Transformers have fixed maximum sequence length due to O(n²) attention:"
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "**Sparse attention:** Attend only to subset (Longformer, BigBird)",
      "**Linear attention:** O(n) approximation",
      "**Sliding window:** Local attention with global tokens",
      "**Rope + interpolation:** Extend context via position interpolation (YaRN, NTK-aware)",
      "**Ring attention:** Distribute long sequences across devices"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GPT-4 Turbo: 128K tokens. Claude: 200K tokens. Achieved through RoPE scaling and architectural innovations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is the difference between pre-training, fine-tuning, and prompting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Pre-training:** Learn from massive unlabeled data. Expensive. Done once.",
      "**Fine-tuning:** Adapt to specific task with labeled data. Moderate cost.",
      "**Prompting:** Use model as-is with carefully crafted input. Zero/few-shot. No training."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Shift: pre-train → fine-tune → prompt. Each subsequent step requires less data and compute. Prompting works for large models; smaller models need fine-tuning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is LoRA (Low-Rank Adaptation)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fine-tune by adding low-rank matrices instead of updating all weights:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "W' = W + ΔW = W + BA\nwhere B: d×r, A: r×d, r << d (rank r=8-64 typically)"
    },
    {
     "t": "p",
     "text": "**Benefits:**"
    },
    {
     "t": "ol",
     "items": [
      "Train only r × (d_in + d_out) params instead of d_in × d_out",
      "Original weights frozen → can maintain multiple adapters",
      "Merge at inference time (no extra latency)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** 10,000× fewer trainable parameters for LLMs. QLoRA: combine with 4-bit quantization for even more efficiency. Standard for fine-tuning large models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is instruction tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fine-tune a pre-trained LM on instruction-response pairs:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: \"Summarize the following article: [article text]\"\nOutput: \"[concise summary]\""
    },
    {
     "t": "p",
     "text": "**Effect:** Model learns to follow instructions rather than just continue text."
    },
    {
     "t": "p",
     "text": "**Examples:** FLAN-T5, InstructGPT, Alpaca."
    },
    {
     "t": "p",
     "text": "**Explanation:** Bridges gap between pre-training (text completion) and utility (following user instructions). Combined with RLHF for alignment (helpful, harmless, honest)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is RLHF (Reinforcement Learning from Human Feedback)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Collect human preferences: given two model outputs, which is better?\n2. Train reward model on preference data\n3. Fine-tune LM using PPO to maximize reward model's score"
    },
    {
     "t": "p",
     "text": "**Explanation:** Aligns model behavior with human preferences. Key component of ChatGPT's training. Alternatives: DPO (Direct Preference Optimization) — simpler, no reward model needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is tokenization in Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Converting text to tokens (integers):"
    },
    {
     "t": "ul",
     "items": [
      "**BPE (Byte Pair Encoding):** Merge most frequent character pairs iteratively. GPT uses this.",
      "**WordPiece:** Similar to BPE. BERT uses this.",
      "**SentencePiece:** Language-agnostic BPE/unigram. T5, LLaMA use this."
     ]
    },
    {
     "t": "p",
     "text": "**Example:** \"unhappiness\" → [\"un\", \"happiness\"] or [\"un\", \"happ\", \"iness\"]"
    },
    {
     "t": "p",
     "text": "**Explanation:** Subword tokenization handles any word (no OOV). Vocabulary size: 32K-100K typical. Affects sequence length, efficiency, and multilingual capability."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

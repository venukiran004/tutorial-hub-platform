/* ============================================================================
   PRACTICE P5.2 — Transformers and Attention · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/04_Transformers_and_Attention.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p5.2",
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
   "n": "26",
   "q": "What is the attention complexity problem and solutions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Standard attention: O(n²) in time and memory for sequence length n."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Complexity",
      "Approach"
     ],
     "rows": [
      [
       "Sparse (Longformer)",
       "O(n×w)",
       "Window + global tokens"
      ],
      [
       "Linear (Performer)",
       "O(n×d)",
       "Kernel approximation"
      ],
      [
       "Flash Attention",
       "O(n²) time, O(n) mem",
       "IO-aware implementation"
      ],
      [
       "State Space (Mamba)",
       "O(n)",
       "Recurrence-like formulation"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For n=100K, O(n²) is 10B operations. Sparse/linear attention reduces this significantly. Mamba achieves linear scaling with comparable quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is a Vision Transformer (ViT)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Apply Transformer to images by treating image patches as tokens:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Image (224×224) → 16×16 patches → 196 patch tokens → Linear projection → Transformer"
    },
    {
     "t": "p",
     "text": "**Process:** Each 16×16 patch = one token. Add position embedding. Prepend [CLS] token. Standard Transformer encoder."
    },
    {
     "t": "p",
     "text": "**Explanation:** ViT showed Transformers can match/beat CNNs on vision tasks when pre-trained on large data. Requires more data than CNNs (less inductive bias). DeiT, Swin Transformer improve data efficiency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is the Swin Transformer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Hierarchical vision Transformer with shifted windows:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Stage 1: 56×56, 96 channels (small patches)\nStage 2: 28×28, 192 channels (merge patches)\nStage 3: 14×14, 384 channels\nStage 4: 7×7, 768 channels"
    },
    {
     "t": "p",
     "text": "**Key:** Window attention (local, efficient) + shifted windows (cross-window connections)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Creates hierarchical features like CNNs. Linear complexity in image size. Can be used as backbone for detection, segmentation. State-of-the-art on many vision benchmarks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is CLIP (Contrastive Language-Image Pre-training)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Jointly trains image and text encoders to align visual and textual representations:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Image encoder: image → image_embedding\nText encoder: \"a photo of a cat\" → text_embedding\nTraining: maximize cosine similarity for matching pairs, minimize for non-matching"
    },
    {
     "t": "p",
     "text": "**Zero-shot classification:** Compute similarity between image embedding and text embeddings of all class names."
    },
    {
     "t": "p",
     "text": "**Explanation:** 400M image-text pairs. Learns open-vocabulary visual concepts. Foundation for text-to-image models (Stable Diffusion), visual search, zero-shot classification."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is Whisper?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Transformer-based speech recognition model:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Audio → Mel spectrogram → Encoder (Transformer) → Decoder (Transformer) → Text"
    },
    {
     "t": "p",
     "text": "**Pre-training:** 680K hours of multilingual audio. Multitask: transcription, translation, language ID."
    },
    {
     "t": "p",
     "text": "**Explanation:** Robust to noise, accents, domains. Multilingual. Large-scale supervised pre-training rather than self-supervised. Shows scaling works for speech too."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is the difference between dense and sparse Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Dense:** All parameters active for every input. Standard Transformer.",
      "**Sparse:** Only subset of parameters active per input. Mixture of Experts."
     ]
    },
    {
     "t": "p",
     "text": "**Advantage of sparse:** More total parameters (knowledge capacity) with same compute budget."
    },
    {
     "t": "p",
     "text": "**Challenge:** Load balancing (ensuring all experts are used), communication overhead."
    },
    {
     "t": "p",
     "text": "**Explanation:** Sparse MoE is how models scale to trillions of parameters efficiently. GPT-4 is reportedly a sparse MoE model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is speculative decoding?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Speed up inference by using a small \"draft\" model to propose multiple tokens, verified by the large model in parallel:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Draft model generates k tokens quickly\n2. Large model verifies all k tokens in one forward pass\n3. Accept matching tokens, reject and regenerate from first mismatch"
    },
    {
     "t": "p",
     "text": "**Speedup:** 2-3× faster generation with same output quality."
    },
    {
     "t": "p",
     "text": "**Explanation:** Large model forward pass cost is similar for 1 token or k tokens (parallelism). Draft model is much faster. Only reject when draft disagrees with large model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is prefix tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Prepend learnable continuous vectors (prefix) to key and value in each attention layer:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "K' = [prefix_k; K]    # Prepend learned prefix to keys\nV' = [prefix_v; V]    # Prepend learned prefix to values\nAttention(Q, K', V')   # Attend to prefix + actual input"
    },
    {
     "t": "p",
     "text": "**Explanation:** Freeze all model weights, only train prefix parameters. ~0.1% trainable parameters. Different prefixes for different tasks. Similar to LoRA in spirit — parameter-efficient fine-tuning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is the difference between absolute and relative positional encoding?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Absolute:** Position-dependent embedding added to each token: PE(pos)",
      "**Relative:** Encodes distance between tokens: PE(pos_i - pos_j) in attention"
     ]
    },
    {
     "t": "p",
     "text": "**Absolute:** Simple, limited generalization to longer sequences."
    },
    {
     "t": "p",
     "text": "**Relative:** Better generalization, captures \"how far apart\" rather than \"where.\""
    },
    {
     "t": "p",
     "text": "**Explanation:** T5 uses relative bias. ALiBi adds linear bias based on distance. RoPE encodes relative position in rotation. Relative methods generalize better to unseen lengths."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is ALiBi (Attention with Linear Biases)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Add linear decreasing bias to attention scores based on distance:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "attention_score = q·k - m × |i-j|\nwhere m is head-specific slope, |i-j| is distance between positions"
    },
    {
     "t": "p",
     "text": "**No positional embeddings needed.** Naturally decays attention with distance."
    },
    {
     "t": "p",
     "text": "**Explanation:** Simple, effective, extrapolates to longer sequences than training. Used in BLOOM, MPT. Each head has different slope m → different attention spans."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is Grouped Query Attention (GQA)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Compromise between Multi-Head Attention (MHA) and Multi-Query Attention (MQA):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "MHA: 32 query heads, 32 KV heads\nGQA: 32 query heads, 8 KV groups (4 query heads share each KV head)\nMQA: 32 query heads, 1 KV head"
    },
    {
     "t": "p",
     "text": "**Explanation:** GQA balances quality (closer to MHA) and efficiency (closer to MQA). Used in LLaMA 2 (70B). Each group of query heads shares one KV head. Minimal quality loss, significant speedup."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is the sliding window attention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Each token attends only to w nearest tokens:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Token 5 attends to tokens [5-w, ..., 5+w] (window size w)"
    },
    {
     "t": "p",
     "text": "**Stacking:** With L layers of window w, effective receptive field is L×w."
    },
    {
     "t": "p",
     "text": "**Explanation:** O(n×w) instead of O(n²). Combined with global tokens (attend to all positions) for tasks needing long-range connections. Mistral uses sliding window attention."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What are State Space Models (SSMs)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Linear recurrence that processes sequences in O(n) time:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "h_t = A·h_{t-1} + B·x_t\ny_t = C·h_t + D·x_t"
    },
    {
     "t": "p",
     "text": "**Key insight:** Can be computed as convolution (parallel training) or recurrence (efficient inference)."
    },
    {
     "t": "p",
     "text": "**Mamba:** Selective SSM with input-dependent gates. Linear time complexity. Competitive with Transformers."
    },
    {
     "t": "p",
     "text": "**Explanation:** SSMs address Transformer's O(n²) limitation. Mamba is the leading SSM architecture, showing Transformers may not be the final answer for sequence modeling."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is the difference between causal and bidirectional attention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Causal (unidirectional):** Token can only attend to previous tokens. Used in decoder/generation.",
      "**Bidirectional:** Token can attend to all tokens. Used in encoder/understanding."
     ]
    },
    {
     "t": "p",
     "text": "**Causal mask:** Upper triangle of attention matrix set to -∞."
    },
    {
     "t": "p",
     "text": "**Explanation:** Causal: necessary for autoregressive generation (can't see future tokens). Bidirectional: better for understanding (uses all context). PaLM uses causal; BERT uses bidirectional."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "How do you handle very long documents with Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Chunking:** Split document into chunks, process each independently",
      "**Hierarchical:** Chunk-level then document-level attention",
      "**Retrieval-augmented:** Retrieve relevant chunks, attend only to those",
      "**Long-context models:** Longformer, BigBird (sparse attention)",
      "**Extended context:** RoPE scaling for 100K+ tokens"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** RAG (Retrieval-Augmented Generation) is often more practical than extending context: retrieve relevant passages instead of processing entire document."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is the difference between pre-training objectives?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Objective",
      "Model",
      "Description"
     ],
     "rows": [
      [
       "Next Token Prediction",
       "GPT",
       "Predict next token autoregressively"
      ],
      [
       "Masked Language Model",
       "BERT",
       "Predict randomly masked tokens"
      ],
      [
       "Span Corruption",
       "T5",
       "Predict corrupted spans"
      ],
      [
       "Denoising",
       "BART",
       "Reconstruct corrupted text"
      ],
      [
       "Contrastive",
       "CLIP",
       "Align paired representations"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Pre-training objective determines what the model learns. Next token prediction captures generation ability. MLM captures bidirectional understanding. Contrastive captures cross-modal alignment."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is model parallelism for large Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Data parallelism:** Same model on multiple GPUs, different data batches",
      "**Tensor parallelism:** Split individual layers across GPUs (e.g., split attention heads)",
      "**Pipeline parallelism:** Different layers on different GPUs",
      "**ZeRO:** Shard optimizer states, gradients, parameters across GPUs"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GPT-3 (175B params) requires ~350GB in FP16 — doesn't fit on one GPU. Combine all parallelism strategies. Megatron-LM, DeepSpeed, FSDP implement these."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is the role of temperature in Transformer generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "P(token) = softmax(logits / temperature)"
    },
    {
     "t": "ul",
     "items": [
      "**T < 1:** Sharper distribution → more deterministic, less creative",
      "**T = 1:** Original distribution",
      "**T > 1:** Flatter distribution → more random, more creative",
      "**T → 0:** Greedy (always pick highest probability)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Temperature controls randomness-quality trade-off. T=0.7-0.8 is common for balanced output. T=0 for factual questions. T=1.0+ for creative writing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is top-p (nucleus) sampling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Sample from the smallest set of tokens whose cumulative probability exceeds p:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Sort tokens by probability\nFind smallest k such that Σᵢ₌₁ᵏ P(token_i) ≥ p\nSample from these k tokens"
    },
    {
     "t": "p",
     "text": "**Example:** p=0.9 means consider tokens making up 90% of probability mass."
    },
    {
     "t": "p",
     "text": "**Explanation:** Adapts vocabulary size dynamically. Confident predictions → few tokens considered. Uncertain → many tokens. Better than fixed top-k. Common: top-p=0.9, temperature=0.7."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is the difference between encoder and decoder attention patterns?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder:\n[1, 1, 1, 1]   ← each position sees all positions\n[1, 1, 1, 1]\n[1, 1, 1, 1]\n[1, 1, 1, 1]\n\nDecoder (causal):\n[1, 0, 0, 0]   ← each position sees only previous\n[1, 1, 0, 0]\n[1, 1, 1, 0]\n[1, 1, 1, 1]"
    },
    {
     "t": "p",
     "text": "**Explanation:** Encoder uses full attention for understanding. Decoder uses causal mask for generation. Cross-attention: decoder queries attend to all encoder outputs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is quantization of Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reduce numerical precision of weights/activations:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "FP32 → FP16: 2× smaller, minimal quality loss\nFP16 → INT8: 2× smaller again, slight quality loss\nINT8 → INT4: 2× smaller, noticeable quality impact"
    },
    {
     "t": "p",
     "text": "**Methods:** Post-training quantization (PTQ), quantization-aware training (QAT), GPTQ, AWQ."
    },
    {
     "t": "p",
     "text": "**Explanation:** 70B model in FP16 = 140GB. In INT4 = 35GB (fits on single GPU). Quality degradation manageable. Essential for deployment. QLoRA = quantized base + LoRA adapters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the attention sink phenomenon?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** First token(s) receive disproportionately high attention regardless of content."
    },
    {
     "t": "p",
     "text": "**Cause:** Softmax must allocate attention somewhere. First token acts as \"dump\" for unused attention."
    },
    {
     "t": "p",
     "text": "**Implication:** In streaming/sliding window, removing initial tokens degrades performance."
    },
    {
     "t": "p",
     "text": "**Solution:** StreamingLLM — keep initial tokens as attention sinks + recent window."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is Constitutional AI (CAI)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Self-supervised alignment using principles (constitution):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Model generates response\n2. Model critiques own response using constitutional principles\n3. Model revises response based on critique\n4. Train on revised responses"
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces need for human feedback. Constitution: set of rules (be helpful, harmless, honest). Model learns to self-correct. Used by Anthropic for Claude."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is chain-of-thought prompting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Include reasoning steps in the prompt to elicit step-by-step reasoning:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: \"What is 15% of 80?\" → \"12\"\nCoT: \"What is 15% of 80? Let's think step by step.\" → \"15% = 0.15. 0.15 × 80 = 12\""
    },
    {
     "t": "p",
     "text": "**Explanation:** Dramatically improves performance on reasoning tasks (math, logic, multi-step). Works best with large models (>100B). Zero-shot CoT: \"Let's think step by step.\" Few-shot CoT: provide examples with reasoning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is the scaling law for Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Performance improves predictably with scale:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss ∝ (C/C₀)^(-α)  where C = compute (FLOPs)"
    },
    {
     "t": "p",
     "text": "**Chinchilla scaling:** For compute-optimal training, scale data and model equally. A 70B model needs ~1.4T tokens."
    },
    {
     "t": "p",
     "text": "**Explanation:** Kaplan et al. and Hoffmann et al. showed performance is a power law in compute, data, and parameters. Guides decisions: given fixed compute budget, what model size and data size? Many current models are undertrained relative to Chinchilla optimal."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

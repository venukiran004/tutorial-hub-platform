/* ============================================================================
   INTERVIEW I1.4 — Transformers
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/00_Interview_Bank/01_DL_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.4",
 "lede": "**20 questions** from Deep Learning Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Transformers",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "51",
   "q": "Fully derive the Transformer architecture (Vaswani et al. 2017).",
   "body": [
    {
     "t": "p",
     "text": "The Transformer processes a sequence \\(\\mathbf{X}\\in\\mathbb{R}^{T\\times d_{model}}\\) through stacked blocks, each containing:"
    },
    {
     "t": "p",
     "text": "**Layer structure:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input Embeddings + Positional Encoding\n    ↓\n[Multi-Head Self-Attention → Add & Norm] × N\n    ↓\n[Position-wise FFN → Add & Norm] × N\n    ↓\nOutput Projection"
    },
    {
     "t": "p",
     "text": "For encoder (N=6 in original), \\(d_{model}=512\\), \\(d_{ff}=2048\\), \\(h=8\\) heads."
    },
    {
     "t": "p",
     "text": "**Position-wise FFN:**"
    },
    {
     "t": "math",
     "tex": "\\text{FFN}(\\mathbf{x}) = \\max(0, \\mathbf{x}\\mathbf{W}_1+\\mathbf{b}_1)\\mathbf{W}_2+\\mathbf{b}_2"
    },
    {
     "t": "p",
     "text": "\\(\\mathbf{W}_1\\in\\mathbb{R}^{d_{model}\\times d_{ff}}\\), \\(\\mathbf{W}_2\\in\\mathbb{R}^{d_{ff}\\times d_{model}}\\)."
    },
    {
     "t": "p",
     "text": "**Layer Normalisation (Pre-LN variant):**"
    },
    {
     "t": "math",
     "tex": "\\text{LayerNorm}(\\mathbf{x}) = \\gamma\\frac{\\mathbf{x}-\\mu}{\\sigma+\\epsilon} + \\beta"
    },
    {
     "t": "p",
     "text": "where \\(\\mu, \\sigma\\) computed over the \\(d_{model}\\) feature dimension (not batch)."
    },
    {
     "t": "p",
     "text": "**Residual connections:** \\(\\text{output} = \\text{LayerNorm}(\\mathbf{x} + \\text{Sublayer}(\\mathbf{x}))\\)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "Derive scaled dot-product self-attention completely.",
   "body": [
    {
     "t": "p",
     "text": "**Inputs:** Token representations \\(\\mathbf{X}\\in\\mathbb{R}^{T\\times d_{model}}\\)"
    },
    {
     "t": "p",
     "text": "**Projections:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{Q} = \\mathbf{X}\\mathbf{W}^Q, \\quad \\mathbf{K} = \\mathbf{X}\\mathbf{W}^K, \\quad \\mathbf{V} = \\mathbf{X}\\mathbf{W}^V"
    },
    {
     "t": "p",
     "text": "where \\(\\mathbf{W}^Q,\\mathbf{W}^K\\in\\mathbb{R}^{d_{model}\\times d_k}\\), \\(\\mathbf{W}^V\\in\\mathbb{R}^{d_{model}\\times d_v}\\)."
    },
    {
     "t": "p",
     "text": "**Attention function:**"
    },
    {
     "t": "math",
     "tex": "\\text{Attention}(\\mathbf{Q},\\mathbf{K},\\mathbf{V}) = \\text{softmax}\\left(\\frac{\\mathbf{Q}\\mathbf{K}^T}{\\sqrt{d_k}}\\right)\\mathbf{V}"
    },
    {
     "t": "p",
     "text": "**Element-wise:** \\(a_{ij} = \\text{softmax}\\left(\\frac{\\mathbf{q}_i^T\\mathbf{k}_j}{\\sqrt{d_k}}\\right)\\), output \\(\\mathbf{o}_i = \\sum_j a_{ij}\\mathbf{v}_j\\)"
    },
    {
     "t": "p",
     "text": "**Complexity:** \\(O(T^2d)\\) memory and time — quadratic in sequence length."
    },
    {
     "t": "p",
     "text": "**Why \\(\\sqrt{d_k}\\) scaling?** If \\(\\mathbf{q}_i,\\mathbf{k}_j\\sim\\mathcal{N}(0,1)\\), then \\(\\mathbf{q}_i^T\\mathbf{k}_j\\sim\\mathcal{N}(0,d_k)\\). Without scaling: \\(d_k=64\\) → std = 8 → softmax input has large magnitude → gradients vanish. With \\(1/\\sqrt{d_k}\\) scaling: \\(\\text{Var}=1\\) → softmax is well-conditioned."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "Multi-head attention — derive and explain what multiple heads learn.",
   "body": [
    {
     "t": "math",
     "tex": "\\text{MultiHead}(\\mathbf{Q},\\mathbf{K},\\mathbf{V}) = \\text{Concat}(\\text{head}_1,\\ldots,\\text{head}_h)\\mathbf{W}^O"
    },
    {
     "t": "math",
     "tex": "\\text{head}_i = \\text{Attention}(\\mathbf{Q}\\mathbf{W}_i^Q, \\mathbf{K}\\mathbf{W}_i^K, \\mathbf{V}\\mathbf{W}_i^V)"
    },
    {
     "t": "p",
     "text": "\\(\\mathbf{W}_i^Q,\\mathbf{W}_i^K\\in\\mathbb{R}^{d_{model}\\times d_k}\\), \\(d_k = d_{model}/h\\), \\(\\mathbf{W}^O\\in\\mathbb{R}^{hd_v\\times d_{model}}\\)."
    },
    {
     "t": "p",
     "text": "**Why multiple heads?** Each head projects to a different subspace, allowing the model to attend to:"
    },
    {
     "t": "ul",
     "items": [
      "Head 1: Syntactic dependencies (subject-verb)",
      "Head 2: Coreference (pronouns)",
      "Head 3: Local context",
      "Head \\(h\\): Long-range structure (Voita et al., 2019)"
     ]
    },
    {
     "t": "p",
     "text": "**Total parameters per self-attention block:**"
    },
    {
     "t": "math",
     "tex": "4\\cdot d_{model}^2 \\quad (Q,K,V,O \\text{ projections})"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "Positional encoding — derive the sinusoidal scheme.",
   "body": [
    {
     "t": "p",
     "text": "Transformer has no notion of token order — a permutation of tokens gives the same attention scores. Positional encodings inject position information."
    },
    {
     "t": "p",
     "text": "**Sinusoidal (learned components):**"
    },
    {
     "t": "math",
     "tex": "PE_{(pos,2i)} = \\sin\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right)"
    },
    {
     "t": "math",
     "tex": "PE_{(pos,2i+1)} = \\cos\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right)"
    },
    {
     "t": "p",
     "text": "**Properties:**"
    },
    {
     "t": "ol",
     "items": [
      "Offset by \\(T\\) is a fixed linear transformation: \\(PE_{pos+T}\\) can be expressed as \\(\\mathbf{M}_T \\cdot PE_{pos}\\) for a rotation matrix \\(\\mathbf{M}_T\\)",
      "Allows model to attend to relative positions: \\(\\mathbf{q}_{pos}^T\\mathbf{k}_{pos+j}\\) depends on \\(j\\)",
      "Generalises to longer sequences than seen in training"
     ]
    },
    {
     "t": "p",
     "text": "**RoPE (Rotary Position Embedding, LLaMA):** Applies rotation to Q/K as a function of position:"
    },
    {
     "t": "math",
     "tex": "\\mathbf{q}_m^T\\mathbf{k}_n = \\mathbf{q}_m^T(\\mathbf{R}_m^T\\mathbf{R}_n)\\mathbf{k}_n"
    },
    {
     "t": "p",
     "text": "Encodes relative position \\(m-n\\) directly into attention scores."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "Layer Norm vs Batch Norm in Transformers — why LN is preferred.",
   "body": [
    {
     "t": "p",
     "text": "**Batch Norm:** Normalise across the batch dimension for each feature:"
    },
    {
     "t": "math",
     "tex": "\\hat{x}_{bi} = \\frac{x_{bi} - \\mu_i}{\\sigma_i}, \\quad \\mu_i=\\frac{1}{B}\\sum_b x_{bi}"
    },
    {
     "t": "p",
     "text": "**Layer Norm:** Normalise across the feature dimension for each sample:"
    },
    {
     "t": "math",
     "tex": "\\hat{x}_{bi} = \\frac{x_{bi} - \\mu_b}{\\sigma_b}, \\quad \\mu_b=\\frac{1}{d}\\sum_i x_{bi}"
    },
    {
     "t": "p",
     "text": "**Why LN for Transformers?**"
    },
    {
     "t": "ul",
     "items": [
      "Variable-length sequences: BN statistics are unstable with padding",
      "Small batch sizes in NLP: BN estimates are noisy",
      "LN is independent of batch → works at inference with single sample"
     ]
    },
    {
     "t": "p",
     "text": "**Pre-LN vs Post-LN:**"
    },
    {
     "t": "ul",
     "items": [
      "Post-LN (original): \\(x + \\text{SubLayer}(\\text{LN}(x))\\) — better final performance but training unstable without warmup",
      "Pre-LN: \\(\\text{LN}(x + \\text{SubLayer}(x))\\) — more stable training, used in LLaMA, GPT-3"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "Encoder-only, decoder-only, encoder-decoder — attention masks.",
   "body": [
    {
     "t": "p",
     "text": "**Encoder (BERT):** Full (bidirectional) self-attention:"
    },
    {
     "t": "math",
     "tex": "\\mathbf{M}_{ij} = 0 \\quad \\forall i,j \\quad \\text{(no masking)}"
    },
    {
     "t": "p",
     "text": "**Decoder (GPT):** Causal (autoregressive) masking — token \\(i\\) can only attend to positions \\(\\leq i\\):"
    },
    {
     "t": "math",
     "tex": "\\mathbf{M}_{ij} = -\\infty \\text{ if } j > i, \\text{ else } 0"
    },
    {
     "t": "p",
     "text": "**Encoder-decoder (T5, BART):**"
    },
    {
     "t": "ul",
     "items": [
      "Encoder self-attention: full",
      "Decoder self-attention: causal",
      "Cross-attention: decoder queries attend to all encoder key-values"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "BERT — derive the masked language model objective.",
   "body": [
    {
     "t": "p",
     "text": "**Input:** Token sequence \\([CLS], x_1,\\ldots,x_T, [SEP]\\)"
    },
    {
     "t": "p",
     "text": "**Masking procedure** (15% of tokens):"
    },
    {
     "t": "ul",
     "items": [
      "80%: replace with [MASK]",
      "10%: replace with random token",
      "10%: keep original (prevents model from not learning non-masked tokens)"
     ]
    },
    {
     "t": "p",
     "text": "**Objective:**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}_{MLM} = -\\sum_{i\\in\\mathcal{M}}\\log P(x_i|\\tilde{\\mathbf{x}};\\boldsymbol\\theta)"
    },
    {
     "t": "p",
     "text": "**NSP objective (original BERT, now deprecated):**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}_{NSP} = -\\log P(\\text{IsNext}|[CLS]\\text{ embedding})"
    },
    {
     "t": "p",
     "text": "**RoBERTa improvements:**"
    },
    {
     "t": "ul",
     "items": [
      "Remove NSP (hurts cross-sentence tasks)",
      "Dynamic masking (new mask each epoch)",
      "Larger batch size, more data → state-of-art with same architecture"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "Derive how GPT differs from BERT architecturally.",
   "body": [
    {
     "t": "p",
     "text": "**GPT:** Decoder-only, causal LM"
    },
    {
     "t": "math",
     "tex": "P(x_1,\\ldots,x_T) = \\prod_{t=1}^T P(x_t|x_1,\\ldots,x_{t-1})"
    },
    {
     "t": "p",
     "text": "Causal mask ensures each token only attends to previous tokens:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "mask = torch.tril(torch.ones(T, T))\nattn_scores = attn_scores.masked_fill(mask == 0, -1e9)"
    },
    {
     "t": "p",
     "text": "**BERT:** Encoder-only, MLM + NSP Bidirectional — sees all tokens at once. Cannot generate autoregressively."
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "BERT",
      "GPT"
     ],
     "rows": [
      [
       "Attention",
       "Bidirectional",
       "Causal"
      ],
      [
       "Pre-training",
       "MLM (discriminative)",
       "CLM (generative)"
      ],
      [
       "Fine-tuning",
       "Add task head",
       "Prompt or fine-tune"
      ],
      [
       "Strengths",
       "Classification, NLU",
       "Generation, few-shot"
      ],
      [
       "Context",
       "\\([CLS]\\) aggregate",
       "Last token"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "Fine-tuning transformers — PEFT methods derivation.",
   "body": [
    {
     "t": "p",
     "text": "**Full fine-tuning:** Update all \\(W\\) parameters. Expensive. Catastrophic forgetting risk."
    },
    {
     "t": "p",
     "text": "**LoRA (Low-Rank Adaptation):**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{W}' = \\mathbf{W}_0 + \\Delta\\mathbf{W} = \\mathbf{W}_0 + \\mathbf{B}\\mathbf{A}"
    },
    {
     "t": "p",
     "text": "\\(\\mathbf{A}\\in\\mathbb{R}^{r\\times d_{in}}\\), \\(\\mathbf{B}\\in\\mathbb{R}^{d_{out}\\times r}\\), \\(r\\ll\\min(d_{in},d_{out})\\)"
    },
    {
     "t": "p",
     "text": "Trainable params: \\(r(d_{in}+d_{out})\\) vs \\(d_{in}d_{out}\\). Rank \\(r=8\\) → \\(\\sim800\\times\\) reduction."
    },
    {
     "t": "p",
     "text": "Initialisation: \\(\\mathbf{B}=0\\) → \\(\\Delta\\mathbf{W}=0\\) at start. \\(\\mathbf{A}\\sim\\mathcal{N}(0,\\sigma^2)\\)."
    },
    {
     "t": "p",
     "text": "**Adapter:** Insert small \\((\\text{down-proj} \\to \\text{ReLU} \\to \\text{up-proj})\\) modules between layers."
    },
    {
     "t": "p",
     "text": "**Prompt tuning:** Prepend \\(k\\) soft \"virtual tokens\" to input; only train their embeddings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "Flash Attention — IO-aware algorithm for O(n) memory.",
   "body": [
    {
     "t": "p",
     "text": "**Standard attention memory:** \\(O(T^2)\\) — must materialise full \\(T\\times T\\) attention matrix."
    },
    {
     "t": "p",
     "text": "**Flash Attention (Dao et al. 2022):** Key insight: Compute attention tile-by-tile using **online softmax** — never materialise the full \\(T\\times T\\) matrix."
    },
    {
     "t": "math",
     "tex": "\\text{For each block } (i,j): \\text{compute partial } e^{x_{ij}-m}, \\text{ update running max } m, \\text{ running sum } \\ell"
    },
    {
     "t": "p",
     "text": "Memory: \\(O(T\\cdot d)\\) (no \\(T\\times T\\) matrix). Speed: 2–4× faster due to reduced HBM reads/writes."
    },
    {
     "t": "p",
     "text": "**Online softmax recurrence:**"
    },
    {
     "t": "math",
     "tex": "m_j = \\max(m_{j-1}, \\max_k A_{ik}) \\quad \\ell_j = e^{m_{j-1}-m_j}\\ell_{j-1} + \\sum_k e^{A_{ik}-m_j}"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "Sparse attention — Longformer, BigBird, linear attention.",
   "body": [
    {
     "t": "p",
     "text": "**Computational bottleneck:** Standard self-attention \\(O(T^2d)\\). For \\(T=16384\\): 268M attention elements."
    },
    {
     "t": "p",
     "text": "**Longformer:**"
    },
    {
     "t": "ul",
     "items": [
      "Local window attention (each token attends to \\(w\\) neighbours): \\(O(Tw)\\)",
      "Global tokens (CLS, task-specific): attend to all — task-specific grounding",
      "Total: \\(O(T\\cdot w + g\\cdot T)\\) where \\(g\\) = global tokens"
     ]
    },
    {
     "t": "p",
     "text": "**Linear Attention (Katharopoulos et al.):**"
    },
    {
     "t": "math",
     "tex": "\\text{Attention}(Q,K,V) = \\frac{\\phi(Q)\\phi(K)^TV}{\\phi(Q)\\phi(K)^T\\mathbf{1}}"
    },
    {
     "t": "p",
     "text": "Decompose \\(\\phi(K)^TV\\) as prefix sum → \\(O(T\\cdot d^2)\\) total instead of \\(O(T^2\\cdot d)\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "KV Cache — size calculation for autoregressive inference.",
   "body": [
    {
     "t": "p",
     "text": "For each transformer layer, KV cache stores:"
    },
    {
     "t": "math",
     "tex": "K_\\text{cache},V_\\text{cache}\\in\\mathbb{R}^{T\\times h\\times d_k}"
    },
    {
     "t": "p",
     "text": "**Memory per token per layer:**"
    },
    {
     "t": "math",
     "tex": "2 \\times h \\times d_k \\times \\text{bytes} = 2 \\times 32 \\times 128 \\times 2\\text{B} = 16384\\text{ bytes} \\approx 16\\text{KB}"
    },
    {
     "t": "p",
     "text": "For LLaMA-70B (80 layers, 8 heads GQA, \\(d_k=128\\), bfloat16):"
    },
    {
     "t": "math",
     "tex": "\\text{KV per token} = 80 \\times 2 \\times 8 \\times 128 \\times 2\\text{B} = 327\\text{KB}"
    },
    {
     "t": "p",
     "text": "For \\(T=4096\\) context: \\(\\approx 1.3\\text{GB}\\). Multi-GPU deployment requires KV management."
    },
    {
     "t": "p",
     "text": "**Grouped Query Attention (GQA):** \\(G\\) query groups share one KV head:"
    },
    {
     "t": "math",
     "tex": "\\text{KV size} \\to \\frac{1}{h/G}\\text{ reduction}"
    },
    {
     "t": "p",
     "text": "LLaMA 2 uses \\(G=8\\) (8 KV heads for 32 query heads) → \\(4\\times\\) KV memory reduction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "Tensor parallelism vs pipeline parallelism for LLM training.",
   "body": [
    {
     "t": "p",
     "text": "**Data parallelism:** Each GPU holds a copy of the model; data is sharded. Gradient synchronization via all-reduce: \\(O(W)\\) communication."
    },
    {
     "t": "p",
     "text": "**Tensor parallelism (Megatron-LM):** Shard individual weight matrices:"
    },
    {
     "t": "math",
     "tex": "\\mathbf{W}_{MLP} = [\\mathbf{W}_1 | \\mathbf{W}_2]"
    },
    {
     "t": "p",
     "text": "Each GPU computes part of the matrix multiply. Communication: all-reduce per layer."
    },
    {
     "t": "p",
     "text": "**Pipeline parallelism:** Assign consecutive transformer layers to different GPUs. Mini-batch split into \\(m\\) micro-batches; pipeline parallelism fills idle stages. **Bubble time** (wasted): \\(\\frac{p-1}{m+p-1}\\) where \\(p\\) = pipeline stages."
    },
    {
     "t": "p",
     "text": "**ZeRO (DeepSpeed):** Partition states (optimizer, gradients, params) across GPUs."
    },
    {
     "t": "ul",
     "items": [
      "Stage 1: Optimizer state partitioned → \\(4\\times\\) memory reduction",
      "Stage 2: + Gradient partition → \\(8\\times\\)",
      "Stage 3: + Parameter partition → \\(N_{gpu}\\times\\)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "Gradient checkpointing — memory-speed tradeoff.",
   "body": [
    {
     "t": "p",
     "text": "Standard: Store all activations for backward pass → \\(O(L)\\) memory for \\(L\\) layers."
    },
    {
     "t": "p",
     "text": "**Checkpointing:** Store only activations at checkpoint layers (every \\(k\\) layers); recompute the rest during backward."
    },
    {
     "t": "p",
     "text": "Memory: \\(O(\\sqrt{L})\\) (optimal checkpoint spacing = \\(\\sqrt{L}\\) layers). Speed overhead: +33% FLOPs (each segment recomputed once)."
    },
    {
     "t": "p",
     "text": "**Implementation:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from torch.utils.checkpoint import checkpoint\noutput = checkpoint(layer_fn, *inputs)  # Recomputes layer_fn during backward"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "Mixed precision training — BF16 vs FP16 vs FP32.",
   "body": [
    {
     "t": "table",
     "head": [
      "Format",
      "Exponent bits",
      "Mantissa bits",
      "Dynamic range",
      "Overflow risk"
     ],
     "rows": [
      [
       "FP32",
       "8",
       "23",
       "\\(\\pm 3.4\\times10^{38}\\)",
       "No"
      ],
      [
       "FP16",
       "5",
       "10",
       "\\(\\pm 65504\\)",
       "Yes (loss scale needed)"
      ],
      [
       "BF16",
       "8",
       "7",
       "Same as FP32",
       "No"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Loss scaling** (FP16): Multiply loss by scale \\(S\\) before backward; divide gradients by \\(S\\) before optimizer step. Prevents underflow in gradients."
    },
    {
     "t": "p",
     "text": "**BF16 preferred** for LLM training (same exponent range as FP32 → no overflow; less mantissa precision but sufficient for ML)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "Knowledge distillation for Transformers — loss formulation.",
   "body": [
    {
     "t": "p",
     "text": "**Soft target loss (Hinton et al.):**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}_{KD} = (1-\\alpha)\\mathcal{L}_{CE}(y, \\sigma(\\mathbf{z}_s)) + \\alpha T^2\\mathcal{L}_{KL}(\\sigma(\\mathbf{z}_t/T)||\\sigma(\\mathbf{z}_s/T))"
    },
    {
     "t": "p",
     "text": "\\(T\\) = temperature (softens distributions), \\(\\alpha\\) = weight."
    },
    {
     "t": "p",
     "text": "**Why \\(T^2\\) scaling?** The soft targets' gradients are \\(\\sim 1/T^2\\); multiplying by \\(T^2\\) normalises."
    },
    {
     "t": "p",
     "text": "**DistilBERT:** Adds hidden state loss + attention matrix loss:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = \\mathcal{L}_{MLM} + \\mathcal{L}_{cos}(\\mathbf{h}_s, \\mathbf{h}_t) + \\mathcal{L}_{attn}"
    },
    {
     "t": "p",
     "text": "Achieves 97% of BERT performance with 40% fewer parameters and 60% faster inference."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is Parameter-Efficient Fine-Tuning (PEFT)?",
   "body": [
    {
     "t": "p",
     "text": "Fine-tuning only a small number of additional parameters instead of the full model. Methods: LoRA, Prefix Tuning, Prompt Tuning, Adapter layers. Reduces GPU memory and training time dramatically."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is LoRA (Low-Rank Adaptation)?",
   "body": [
    {
     "t": "p",
     "text": "LoRA freezes pre-trained weights and adds low-rank decomposition matrices (A·B) to attention layers. Only A and B are trained. Rank r << d means far fewer parameters. At inference, ΔW = A·B merges back into original weights."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is Reinforcement Learning from Human Feedback (RLHF)?",
   "body": [
    {
     "t": "p",
     "text": "A fine-tuning pipeline: (1) Supervised Fine-Tuning on demonstrations; (2) Train a Reward Model on human preference rankings; (3) Optimize with PPO to maximize reward while penalizing KL divergence from the SFT model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is the context window and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "Context window = maximum number of tokens the model can process at once. Larger windows (GPT-4: 128K, Claude: 200K) enable longer documents, multi-turn conversations, and in-context learning with more examples."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

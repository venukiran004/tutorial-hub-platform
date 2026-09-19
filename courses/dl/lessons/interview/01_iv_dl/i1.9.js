/* ============================================================================
   INTERVIEW I1.9 — Production Deep Learning · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/00_Interview_Bank/01_DL_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.9",
 "lede": "**25 questions** from Deep Learning Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Production Deep Learning · 1",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "161",
   "q": "What is model pruning?",
   "body": [
    {
     "t": "p",
     "text": "Remove redundant weights (weight pruning) or entire filters/heads (structured pruning):"
    },
    {
     "t": "ul",
     "items": [
      "**Magnitude pruning:** Remove weights with smallest |w|.",
      "**Structured pruning:** Remove entire neurons/heads → actual speedup without specialized hardware.",
      "After pruning, typically fine-tune to recover accuracy."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "162",
   "q": "What is INT8 quantization-aware training (QAT)?",
   "body": [
    {
     "t": "p",
     "text": "Simulate quantization effects during training by inserting fake quantization ops. The model learns to be robust to quantization before it's applied:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model = torch.quantization.prepare_qat(model)\n# Train with fake quantized weights\nmodel = torch.quantization.convert(model)  # Convert to actual INT8"
    },
    {
     "t": "p",
     "text": "Better accuracy than post-training quantization (PTQ)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "163",
   "q": "What is ONNX and why is it used?",
   "body": [
    {
     "t": "p",
     "text": "Open Neural Network Exchange: an open format for representing ML models. Export from PyTorch/TensorFlow, run with ONNX Runtime for optimized inference across platforms:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "torch.onnx.export(model, dummy_input, \"model.onnx\", opset_version=17)\nimport onnxruntime as ort\nsess = ort.InferenceSession(\"model.onnx\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "164",
   "q": "What is TensorRT and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "NVIDIA's high-performance inference optimizer. Converts PyTorch/ONNX models to TRT engines:"
    },
    {
     "t": "ul",
     "items": [
      "Graph optimization (layer fusion, kernel autotuning).",
      "Precision calibration (INT8/FP16).",
      "2–10× latency reduction on NVIDIA GPUs vs vanilla PyTorch."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "165",
   "q": "What is FlashAttention?",
   "body": [
    {
     "t": "p",
     "text": "A hardware-aware exact attention algorithm that avoids materializing the full N×N attention matrix:"
    },
    {
     "t": "ul",
     "items": [
      "Tiles computation to fit in GPU SRAM (fast memory).",
      "IO complexity: O(N²/B) vs O(N²) for standard attention.",
      "Enables 2-4× speedup and much lower memory usage for long sequences."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "166",
   "q": "What is Grouped Query Attention (GQA)?",
   "body": [
    {
     "t": "p",
     "text": "Intermediate between MHA (Multi-Head Attention) and MQA (Multi-Query Attention):"
    },
    {
     "t": "ul",
     "items": [
      "Divide query heads into G groups.",
      "Each group shares one K/V head.",
      "GQA balances quality (vs MQA) and memory efficiency (vs MHA)."
     ]
    },
    {
     "t": "p",
     "text": "Used in LLaMA 3, Gemma."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "167",
   "q": "What is KV Cache and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "During autoregressive generation, Keys and Values from all previous tokens are cached:"
    },
    {
     "t": "ul",
     "items": [
      "Avoids recomputing attention for previously generated tokens.",
      "Memory grows linearly with sequence length.",
      "For 7B LLM: KV cache for 4K tokens can be several GB per request."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "168",
   "q": "What is continuous batching in LLM serving?",
   "body": [
    {
     "t": "p",
     "text": "Traditional static batching waits for all sequences in a batch to finish (padded to max length). Continuous batching (iteration-level scheduling) dynamically adds/removes sequences at each decoding step:"
    },
    {
     "t": "ul",
     "items": [
      "In-flight batching: New requests join when existing ones finish.",
      "Maximizes GPU utilization (10-20× throughput vs static batching)."
     ]
    },
    {
     "t": "p",
     "text": "Implemented in vLLM, TensorRT-LLM."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "169",
   "q": "What is PagedAttention in vLLM?",
   "body": [
    {
     "t": "p",
     "text": "Inspired by OS virtual memory paging. KV cache is divided into fixed-size blocks (pages) that need not be contiguous. Eliminates memory fragmentation and enables memory sharing across beam search sequences. Core innovation in vLLM."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "170",
   "q": "What is speculative decoding?",
   "body": [
    {
     "t": "p",
     "text": "Use a small fast draft model to generate K tokens speculatively. A large verifier model checks all K tokens in one forward pass. Accept correct tokens, reject others:"
    },
    {
     "t": "ul",
     "items": [
      "Draft model is ~10× faster.",
      "Net result: 2-3× speedup with identical output distribution."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "171",
   "q": "What is tensor parallelism in multi-GPU training?",
   "body": [
    {
     "t": "p",
     "text": "Split individual weight matrices across multiple GPUs:"
    },
    {
     "t": "ul",
     "items": [
      "Column parallel: Split columns of \\(W_1\\) across GPUs.",
      "Row parallel: Split rows of \\(W_2\\) across GPUs."
     ]
    },
    {
     "t": "p",
     "text": "Used in Megatron-LM for 100B+ model training. Requires fast NVLink bandwidth."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "172",
   "q": "What is pipeline parallelism?",
   "body": [
    {
     "t": "p",
     "text": "Split the model's layers across multiple GPUs. Each GPU processes one stage of the pipeline. Micro-batching reduces pipeline bubbles. Used alongside data parallelism in large-scale training (GPipe, PipeDream)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "173",
   "q": "What is ZeRO (Zero Redundancy Optimizer)?",
   "body": [
    {
     "t": "p",
     "text": "DeepSpeed's memory optimization — partitions optimizer states, gradients, and parameters across GPUs (ZeRO-1, 2, 3):"
    },
    {
     "t": "ul",
     "items": [
      "ZeRO-1: Partition optimizer states.",
      "ZeRO-2: + Gradient partitioning.",
      "ZeRO-3: + Parameter partitioning."
     ]
    },
    {
     "t": "p",
     "text": "ZeRO-3 enables training 1T+ parameter models on commodity GPUs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "174",
   "q": "What is Flash Decoding?",
   "body": [
    {
     "t": "p",
     "text": "Optimizes the decoding phase of attention (when KV cache is long). Parallelizes across sequence length dimension (not batch) for attention computation. 8× speedup for long context decoding."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "175",
   "q": "What is AWQ (Activation-aware Weight Quantization)?",
   "body": [
    {
     "t": "p",
     "text": "Quantize weights to INT4 while preserving the precision of salient weights (identified by activation magnitude). Better accuracy than naive INT4 quantization:"
    },
    {
     "t": "ul",
     "items": [
      "~2× memory reduction vs INT8.",
      "<1% accuracy loss on most tasks.",
      "LLM AWQ: widely used for deploying 7B-70B models on consumer hardware."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "176",
   "q": "What is LoRA and how does it enable parameter-efficient fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "Low-Rank Adaptation: freeze pretrained weights, add trainable low-rank matrices to attention:"
    },
    {
     "t": "math",
     "tex": "W = W_0 + BA, \\quad B \\in \\mathbb{R}^{d \\times r}, A \\in \\mathbb{R}^{r \\times k}"
    },
    {
     "t": "ul",
     "items": [
      "Typical \\(r=4-64\\) ≪ \\(d\\) (full rank).",
      "Only ~1-2% of parameters are trained.",
      "Can be merged into \\(W_0\\) at inference (no overhead)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "177",
   "q": "What is QLoRA?",
   "body": [
    {
     "t": "p",
     "text": "4-bit quantized base model (NF4 quantization) + LoRA adapters in float16. Enables fine-tuning 65B parameter models on a single A100 GPU. Key innovations: NF4 (Normal Float 4), double quantization, paged optimizers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "178",
   "q": "What is DPO (Direct Preference Optimization)?",
   "body": [
    {
     "t": "p",
     "text": "An alternative to RLHF that directly fine-tunes the LLM using human preference data (chosen vs rejected responses) without training a separate reward model:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}_{DPO} = -\\mathbb{E}\\left[\\log\\sigma\\left(\\beta\\log\\frac{\\pi_\\theta(y_w|x)}{\\pi_{ref}(y_w|x)} - \\beta\\log\\frac{\\pi_\\theta(y_l|x)}{\\pi_{ref}(y_l|x)}\\right)\\right]"
    },
    {
     "t": "p",
     "text": "Simpler and more stable than PPO-based RLHF."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "179",
   "q": "What is RLHF (Reinforcement Learning from Human Feedback)?",
   "body": [
    {
     "t": "ol",
     "items": [
      "**SFT:** Fine-tune LLM on high-quality demonstrations.",
      "**Reward model:** Train on human comparisons of outputs.",
      "**PPO:** Fine-tune LLM with RL to maximize reward model score while staying close to SFT model (KL penalty)."
     ]
    },
    {
     "t": "p",
     "text": "Used in ChatGPT, Claude, Gemini. Expensive but powerful alignment technique."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "180",
   "q": "What is Constitutional AI (CAI)?",
   "body": [
    {
     "t": "p",
     "text": "Anthropic's technique: model critiques its own outputs using a set of principles (\"constitution\"), revises them, and trains on revised outputs with AI-generated feedback. Reduces need for human labelers for harmlessness training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "181",
   "q": "What is the context length limitation of Transformers and solutions?",
   "body": [
    {
     "t": "p",
     "text": "Attention is O(N²) in sequence length (quadratic). Solutions:"
    },
    {
     "t": "ul",
     "items": [
      "Sparse attention (Longformer, BigBird): O(N).",
      "Long context fine-tuning with positional interpolation (LLaMA 2 → 4K to 32K).",
      "RoPE positional extension (NTK-aware scaling).",
      "Mamba / state space models: O(N)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "182",
   "q": "What is instruction tuning?",
   "body": [
    {
     "t": "p",
     "text": "Supervised fine-tuning on diverse instruction-following examples:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "input: \"Translate to French: Hello world\"\noutput: \"Bonjour le monde\""
    },
    {
     "t": "p",
     "text": "Dramatically improves zero-shot generalization to new instructions. FLAN, Alpaca, LLaMA-Instruct are examples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "183",
   "q": "What is chain-of-thought prompting and how does it affect model training?",
   "body": [
    {
     "t": "p",
     "text": "Prompting the model to produce intermediate reasoning steps before the final answer. Significantly improves performance on math/logic tasks. During training: include step-by-step reasoning in fine-tuning data (OpenAI's scratchpad, Gemini Flash thinking)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "184",
   "q": "What is emergent behavior in LLMs?",
   "body": [
    {
     "t": "p",
     "text": "Capabilities that appear suddenly at certain model scales without explicit training for those capabilities (few-shot learning, chain-of-thought, code generation). Predicted by scaling laws but the emergence threshold is difficult to predict for specific abilities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "185",
   "q": "What are scaling laws for neural language models?",
   "body": [
    {
     "t": "p",
     "text": "Chinchilla (Hoffmann et al.) establishes compute-optimal training:"
    },
    {
     "t": "ul",
     "items": [
      "Model parameters \\(N\\) and training tokens \\(D\\) should scale proportionally.",
      "For 1 FLOP budget \\(C\\): \\(N_{opt} \\propto C^{0.5}\\), \\(D_{opt} \\propto C^{0.5}\\).",
      "Rule of thumb: Train on ~20 tokens per parameter."
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

/* ============================================================================
   PRACTICE P10.2 — Compression, Deployment and Production · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/09_Compression_Deployment_and_Production.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p10.2",
 "lede": "**25 scenarios** from Compression, Deployment and Production. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "What is sparse inference and what hardware supports it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Execute only non-zero operations in pruned models."
    },
    {
     "t": "p",
     "text": "**Hardware support:**"
    },
    {
     "t": "ol",
     "items": [
      "**NVIDIA Ampere (A100):** 2:4 structured sparsity (50% sparsity, ~2× speedup)",
      "**Intel (AMX):** Sparse matrix acceleration",
      "**Cerebras:** Supports arbitrary sparsity patterns"
     ]
    },
    {
     "t": "p",
     "text": "**Software:** cuSPARSE, SparseRT, DeepSparse (Neural Magic)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without hardware support, sparse matrices stored in CSR/CSC format have overhead that negates pruning benefits. Structured sparsity (2:4) is the compromise."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is model distillation for language models specifically?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**DistilBERT:** 6 layers distilled from 12-layer BERT (40% smaller, 60% faster, 97% performance)",
      "**TinyBERT:** Also distill attention weights and hidden states",
      "**MiniLM:** Distill self-attention relation knowledge",
      "**For GPT-style:** Distill next-token predictions from larger LM"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Language model distillation is highly effective because soft probabilities from teacher carry rich linguistic knowledge. Much cheaper than training small model from scratch."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is model pruning during training vs after training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Post-training:** Train full model, then prune and optionally fine-tune",
      "**During training (gradual pruning):** Progressively increase sparsity during training"
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Sparsity schedule:\nEpoch 0-10: 0% sparse (warmup)\nEpoch 10-40: 0% → 90% (gradual pruning)\nEpoch 40-50: 90% (fine-tune)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Gradual pruning allows model to adapt to increasing sparsity. Generally better accuracy than one-shot post-training pruning at same sparsity level."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is the role of operator fusion in inference optimization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combine multiple sequential operations into a single GPU kernel."
    },
    {
     "t": "p",
     "text": "**Before fusion:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Conv → Memory Write → Memory Read → BN → Memory Write → Memory Read → ReLU"
    },
    {
     "t": "p",
     "text": "**After fusion:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Conv-BN-ReLU (single kernel, no intermediate memory transfers)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Memory bandwidth is often the bottleneck, not computation. Fusion eliminates redundant memory reads/writes. TensorRT automatically applies this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is the torch.compile approach in PyTorch 2.0?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\n\nmodel = MyModel()\ncompiled_model = torch.compile(model)  # One-line optimization!\n\n# Or with options:\ncompiled_model = torch.compile(model, mode=\"reduce-overhead\")\n# modes: \"default\", \"reduce-overhead\", \"max-autotune\""
    },
    {
     "t": "p",
     "text": "**How it works:**"
    },
    {
     "t": "ol",
     "items": [
      "TorchDynamo captures computation graph",
      "TorchInductor generates optimized code (Triton for GPU)",
      "Automatic operator fusion, memory planning"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** 30-200% speedup with zero code changes. Gradually replacing manual optimization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is activation checkpointing (gradient checkpointing)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Trade compute for memory during training: don't store all intermediate activations, recompute them during backward pass."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from torch.utils.checkpoint import checkpoint\n\nclass Model(nn.Module):\n    def forward(self, x):\n        # Checkpoint segments to save memory\n        x = checkpoint(self.block1, x)\n        x = checkpoint(self.block2, x)\n        return self.block3(x)"
    },
    {
     "t": "p",
     "text": "**Trade-off:** ~30% more compute, ~60-70% less memory → allows larger batch sizes or models."
    },
    {
     "t": "p",
     "text": "**Explanation:** Critical for training very large models that wouldn't fit in GPU memory otherwise."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is Triton Inference Server?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** NVIDIA's production inference server:"
    },
    {
     "t": "ol",
     "items": [
      "**Multi-framework:** TensorRT, PyTorch, TensorFlow, ONNX models",
      "**Dynamic batching:** Automatically batch concurrent requests",
      "**Concurrent execution:** Run multiple models on same GPU",
      "**Model versioning:** A/B testing, gradual rollout",
      "**Ensemble pipelines:** Chain preprocessing → model → postprocessing"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Industry standard for GPU-based model serving. Handles the operational complexity of production inference."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is weight quantization vs activation quantization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Weight quantization:** Quantize model parameters (can be done offline, well-studied)",
      "**Activation quantization:** Quantize intermediate feature maps (harder — values change per input)"
     ]
    },
    {
     "t": "p",
     "text": "**Challenges with activation quantization:**"
    },
    {
     "t": "ol",
     "items": [
      "Dynamic range varies across inputs",
      "Outliers in activations cause large quantization error",
      "Need calibration or dynamic quantization"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Full INT8 inference needs both weight AND activation quantization. Weight-only quantization saves memory but not compute."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is the difference between static and dynamic quantization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Static:** Quantization parameters (scale, zero-point) fixed after calibration. Fastest inference.",
      "**Dynamic:** Quantization parameters computed at runtime from actual activation values. More accurate, slight overhead."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# PyTorch dynamic quantization\nmodel_quantized = torch.quantization.quantize_dynamic(\n    model, {torch.nn.Linear}, dtype=torch.qint8\n)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Dynamic is easier to apply (no calibration data needed). Static is faster. Dynamic works well for RNNs/Transformers where activation ranges vary significantly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is the impact of model size on inference cost?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Model Size → Memory Bandwidth → Latency\n100M params × 4 bytes = 400MB (FP32)\n100M params × 2 bytes = 200MB (FP16)\n100M params × 1 byte  = 100MB (INT8)\n\nGPU memory bandwidth: ~2TB/s (A100)\nTime to load model: 400MB / 2TB/s = 0.2ms (FP32)"
    },
    {
     "t": "p",
     "text": "**Explanation:** For small batch sizes, inference is memory-bandwidth bound (loading weights dominates). Quantization directly reduces this bottleneck. For large batches, inference becomes compute-bound."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is model sparsity and how does it differ from pruning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Pruning:** Process of removing weights (creating sparsity)",
      "**Sparsity:** Property of having many zero weights"
     ]
    },
    {
     "t": "p",
     "text": "**Types of sparsity:**"
    },
    {
     "t": "ol",
     "items": [
      "**Fine-grained:** Individual zeros (e.g., 90% of weights = 0)",
      "**Block sparsity:** Blocks of zeros (e.g., 4×4 blocks)",
      "**Structured (N:M):** N zeros in every M consecutive elements (e.g., 2:4)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** N:M sparsity is hardware-friendly — NVIDIA A100 has native 2:4 support with ~2× speedup."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is the post-training quantization workflow?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Step 1: Prepare model\nmodel.eval()\nmodel.qconfig = torch.quantization.get_default_qconfig('fbgemm')\n\n# Step 2: Insert observers\nmodel_prepared = torch.quantization.prepare(model)\n\n# Step 3: Calibrate with representative data\nwith torch.no_grad():\n    for data in calibration_loader:\n        model_prepared(data)\n\n# Step 4: Convert to quantized model\nmodel_quantized = torch.quantization.convert(model_prepared)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Observers collect activation statistics during calibration. Conversion replaces FP32 ops with INT8 ops using collected statistics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is the trade-off between accuracy and latency in compressed models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Compression Level vs Accuracy:\nNo compression:     100% accuracy, 100% latency\nLight (INT8):       99.5% accuracy, 40% latency\nMedium (pruned+Q):  98% accuracy, 25% latency\nHeavy (INT4):       95% accuracy, 15% latency\nExtreme (binary):   85% accuracy, 5% latency"
    },
    {
     "t": "p",
     "text": "**Explanation:** Choose compression level based on application requirements. Safety-critical (medical): preserve accuracy. Consumer app: optimize latency. Usually INT8 offers best accuracy-latency trade-off."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is model caching and how does it help inference?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**KV-cache (LLMs):** Cache key-value pairs from previous tokens to avoid recomputation",
      "**Feature caching:** Cache intermediate features for similar inputs",
      "**Prediction caching:** Cache model outputs for repeated queries",
      "**Embedding caching:** Pre-compute and cache embeddings for known entities"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** KV-cache is essential for autoregressive LLMs — without it, each new token requires reprocessing all previous tokens (O(n²) → O(n))."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the CoreML framework for Apple devices?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Convert PyTorch model to CoreML\nimport coremltools as ct\n\ntraced_model = torch.jit.trace(model, example_input)\nmlmodel = ct.convert(\n    traced_model,\n    inputs=[ct.TensorType(name=\"input\", shape=(1, 3, 224, 224))],\n    compute_precision=ct.precision.FLOAT16\n)\nmlmodel.save(\"model.mlpackage\")"
    },
    {
     "t": "p",
     "text": "**Features:** Neural Engine acceleration, on-device privacy, INT8/FP16 support."
    },
    {
     "t": "p",
     "text": "**Explanation:** CoreML leverages Apple's Neural Engine (dedicated AI chip) — significantly faster than CPU inference on Apple devices."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is Flash Attention and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Memory-efficient attention algorithm that avoids materializing the full N×N attention matrix."
    },
    {
     "t": "p",
     "text": "**Standard attention:** O(N²) memory (store full attention matrix)"
    },
    {
     "t": "p",
     "text": "**Flash Attention:** O(N) memory (tile-based computation, no full matrix)"
    },
    {
     "t": "p",
     "text": "**Speed:** 2-4× faster on GPU by reducing memory IO"
    },
    {
     "t": "p",
     "text": "**Explanation:** Enables longer context windows (32K, 128K tokens) that would be impossible with standard attention due to memory limits."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is speculative decoding for LLM inference?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use a small \"draft\" model to generate candidate tokens, verify with large model in parallel."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Draft model generates K tokens quickly\n2. Large model verifies all K tokens in single forward pass\n3. Accept verified tokens, reject and regenerate from divergence point"
    },
    {
     "t": "p",
     "text": "**Speedup:** 2-3× faster with no quality loss (same output distribution)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Large model's forward pass cost is similar for 1 token or K tokens (due to batching). Verification is \"free\" compared to sequential generation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is the difference between model serving on CPU vs GPU?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "CPU",
      "GPU"
     ],
     "rows": [
      [
       "Throughput",
       "Lower",
       "Higher (parallel)"
      ],
      [
       "Latency (batch=1)",
       "Often lower",
       "Higher (kernel launch overhead)"
      ],
      [
       "Cost",
       "Cheaper per instance",
       "Higher but better throughput/$"
      ],
      [
       "Quantization",
       "INT8 well-supported",
       "INT8, FP16, INT4"
      ],
      [
       "Best for",
       "Small models, batch=1",
       "Large models, batched"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For simple models with batch=1, CPU can be faster and cheaper. As model size and batch size grow, GPU advantage increases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is the role of batching strategies in inference?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Static batching:** Fixed batch size, wait until batch is full",
      "**Dynamic batching:** Collect requests for time window, process together",
      "**Continuous batching (LLMs):** Add new requests as previous ones finish generating",
      "**Client-side batching:** Client groups multiple requests"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Continuous batching is critical for LLMs — different requests finish at different times. Without it, GPU waits for longest sequence to finish."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is pruning + quantization combined?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Apply both techniques for multiplicative compression:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Original: 100M params × 4 bytes = 400MB\nPruned 80%: 20M params × 4 bytes = 80MB\nQuantized INT8: 20M params × 1 byte = 20MB\nTotal: 20× compression"
    },
    {
     "t": "p",
     "text": "**Pipeline:** Train → Prune → Fine-tune → Quantize → Deploy"
    },
    {
     "t": "p",
     "text": "**Explanation:** Deep Compression (Han et al.) showed pruning + quantization + Huffman coding achieves 35-49× compression without accuracy loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is model A/B testing in production?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Traffic splitting:** Route X% traffic to model A, (100-X)% to model B",
      "**Metrics:** Compare business metrics (not just accuracy)",
      "**Statistical significance:** Ensure enough samples for reliable comparison",
      "**Canary deployment:** Start with 1% traffic, gradually increase",
      "**Shadow mode:** Run new model in parallel, compare outputs without serving"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Never deploy new model to 100% traffic immediately. Gradual rollout catches issues before they affect all users."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the impact of activation functions on quantization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**ReLU:** Easy to quantize — output range [0, max], no negative values to waste bits on",
      "**SiLU/GELU:** Harder — small negative values near zero require careful precision",
      "**Sigmoid/Tanh:** Output range [0,1] or [-1,1] — bounded but need precision near saturation"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unbounded activations (ReLU) need dynamic range handling. Smooth activations (GELU) may lose subtle features. Choose activation with quantization in mind."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is model distillation for object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Unique challenges for detection distillation:"
    },
    {
     "t": "ol",
     "items": [
      "**Feature distillation:** Match intermediate features in backbone/neck",
      "**Region distillation:** Distill knowledge from teacher's region proposals",
      "**Relation distillation:** Transfer relationship between detections",
      "**Foreground focus:** Weight distillation loss by objectness score"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Detection is harder to distill than classification because spatial information matters. Teacher can guide student on WHERE to look, not just WHAT."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is the role of model profiling before optimization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# PyTorch profiler\nwith torch.profiler.profile(\n    activities=[torch.profiler.ProfilerActivity.CPU,\n                torch.profiler.ProfilerActivity.CUDA],\n    with_stack=True\n) as prof:\n    model(input_data)\n\nprint(prof.key_averages().table(sort_by=\"cuda_time_total\", row_limit=10))"
    },
    {
     "t": "p",
     "text": "**What to look for:**"
    },
    {
     "t": "ol",
     "items": [
      "Which layers consume most time?",
      "Memory bottlenecks vs compute bottlenecks?",
      "Data transfer overhead?"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Profile BEFORE optimizing. Optimize the bottleneck, not the easiest part. 90% of time may be in one layer."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is the future of model compression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Hardware-software co-design:** Hardware designed for sparse/quantized models",
      "**Foundation model distillation:** Distill massive pre-trained models for specific tasks",
      "**Automated compression:** NAS for compression strategies per layer",
      "**1-bit models (BitNet):** Binary weights with competitive accuracy",
      "**Mixture of Experts:** Sparse activation — only use fraction of model per input"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** The trend is toward larger pre-trained models + efficient deployment. Compression bridges the gap between training-scale and deployment-scale."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

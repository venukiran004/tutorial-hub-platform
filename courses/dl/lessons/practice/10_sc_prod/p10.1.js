/* ============================================================================
   PRACTICE P10.1 — Compression, Deployment and Production · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/09_Compression_Deployment_and_Production.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p10.1",
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
   "n": "1",
   "q": "What is model compression and why is it important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reducing model size and computational cost while maintaining performance."
    },
    {
     "t": "p",
     "text": "**Why:**"
    },
    {
     "t": "ol",
     "items": [
      "Deploy on edge devices (mobile, IoT) with limited memory/compute",
      "Reduce inference latency for real-time applications",
      "Lower cloud serving costs (fewer GPUs needed)",
      "Reduce energy consumption (green AI)"
     ]
    },
    {
     "t": "p",
     "text": "**Techniques:** Pruning, quantization, knowledge distillation, architecture search."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is weight pruning and what are the main approaches?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Remove unnecessary weights from a neural network."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Unstructured pruning:** Remove individual weights (sparse matrices)",
      "**Structured pruning:** Remove entire neurons, channels, or layers",
      "**Magnitude-based:** Remove weights with smallest absolute values",
      "**Movement pruning:** Remove weights moving toward zero during training"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unstructured can achieve higher sparsity but needs special hardware. Structured gives real speedup on standard hardware."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is the Lottery Ticket Hypothesis?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Dense networks contain sparse subnetworks (\"winning tickets\") that, when trained in isolation from the same initialization, can match the full network's performance."
    },
    {
     "t": "p",
     "text": "**Process:**"
    },
    {
     "t": "ol",
     "items": [
      "Train dense network",
      "Prune smallest magnitude weights",
      "Reset remaining weights to their INITIAL values",
      "Retrain pruned network"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Found by Frankle & Carlin (2019). Suggests overparameterization is needed to find good subnetworks, not for capacity. Later work showed it's even harder than initially claimed for very large models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is quantization in deep learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reducing numerical precision of weights/activations."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "FP32 (32-bit float) → FP16 → INT8 → INT4 → Binary (1-bit)"
    },
    {
     "t": "p",
     "text": "**Types:**"
    },
    {
     "t": "ol",
     "items": [
      "**Post-training quantization (PTQ):** Quantize after training (easy, some accuracy loss)",
      "**Quantization-aware training (QAT):** Simulate quantization during training (better accuracy)",
      "**Dynamic quantization:** Quantize weights statically, activations dynamically at runtime"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** INT8 gives ~4× speedup and 4× memory reduction with <1% accuracy loss for many models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is knowledge distillation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train a small \"student\" model to mimic a large \"teacher\" model."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss = α * CE(y_student, y_true) + (1-α) * KL(softmax(z_teacher/T), softmax(z_student/T))"
    },
    {
     "t": "p",
     "text": "**Key insight:** Teacher's soft probabilities contain more information than hard labels — e.g., \"this 7 looks a bit like a 1\" (dark knowledge)."
    },
    {
     "t": "p",
     "text": "**Temperature T:** Higher T → softer distribution → more information transfer."
    },
    {
     "t": "p",
     "text": "**Explanation:** Student can achieve near-teacher performance with fraction of parameters. Works because soft labels regularize and provide richer gradients."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is the difference between model distillation and data distillation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Model distillation:** Compress model (large → small) using same data",
      "**Data distillation (dataset distillation):** Compress dataset (large → small synthetic dataset that trains equivalent model)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Data distillation creates a tiny synthetic dataset such that training any model on it produces similar results to training on the full dataset. Useful for privacy, efficient retraining."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is TensorRT and how does it optimize inference?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** NVIDIA's inference optimization framework:"
    },
    {
     "t": "ol",
     "items": [
      "**Layer fusion:** Combine Conv + BN + ReLU into single kernel",
      "**Precision calibration:** Automatic FP32 → INT8/FP16 conversion",
      "**Kernel auto-tuning:** Select fastest GPU kernel per operation",
      "**Dynamic tensor memory:** Minimize memory allocation",
      "**Multi-stream execution:** Parallel execution of independent operations"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** TensorRT can achieve 2-5× speedup over framework-native inference. Essential for production GPU deployment."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is ONNX and why is it important for deployment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Open Neural Network Exchange — standard format for ML models."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Export PyTorch model to ONNX\ntorch.onnx.export(model, dummy_input, \"model.onnx\",\n                  input_names=['input'], output_names=['output'],\n                  dynamic_axes={'input': {0: 'batch_size'}})"
    },
    {
     "t": "p",
     "text": "**Benefits:**"
    },
    {
     "t": "ol",
     "items": [
      "Framework interoperability (train in PyTorch, deploy with TensorRT/OpenVINO)",
      "Hardware-specific optimization via runtime (ONNX Runtime)",
      "Standardized model representation"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ONNX Runtime provides cross-platform optimized inference — CPU, GPU, mobile."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is structured vs unstructured pruning trade-offs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Unstructured",
      "Structured"
     ],
     "rows": [
      [
       "Sparsity achievable",
       "Very high (95%+)",
       "Moderate (50-80%)"
      ],
      [
       "Accuracy retention",
       "Better at same sparsity",
       "More accuracy loss"
      ],
      [
       "Hardware speedup",
       "Needs sparse hardware",
       "Works on standard hardware"
      ],
      [
       "Implementation",
       "Sparse matrix operations",
       "Standard dense operations"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unstructured: 95% sparse but can't use standard GEMM. Structured: remove entire filters → smaller dense model → real speedup."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is mixed-precision training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use FP16 for most operations, FP32 for critical ones."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# PyTorch automatic mixed precision\nfrom torch.cuda.amp import autocast, GradScaler\n\nscaler = GradScaler()\nfor data, target in loader:\n    with autocast():\n        output = model(data)\n        loss = criterion(output, target)\n    scaler.scale(loss).backward()\n    scaler.step(optimizer)\n    scaler.update()"
    },
    {
     "t": "p",
     "text": "**Benefits:** ~2× speedup, ~50% memory reduction on modern GPUs."
    },
    {
     "t": "p",
     "text": "**Key:** Loss scaling prevents FP16 underflow in gradients."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is neural architecture search (NAS) for efficient models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Automatically find optimal architectures under constraints."
    },
    {
     "t": "p",
     "text": "**Efficient NAS approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**EfficientNet:** Compound scaling (width, depth, resolution)",
      "**MobileNet:** Depthwise separable convolutions",
      "**Once-for-all (OFA):** Single supernet, extract sub-networks for different devices",
      "**Hardware-aware NAS:** Include latency/energy in optimization objective"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** NAS found MobileNetV3, EfficientNet that outperform hand-designed architectures under same compute budget."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is model serving and what are the key considerations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Latency:** p50, p95, p99 response times",
      "**Throughput:** Requests per second",
      "**Batching:** Dynamic batching for GPU efficiency",
      "**Scaling:** Horizontal (more instances) vs vertical (bigger GPU)",
      "**Model versioning:** A/B testing, canary deployments",
      "**Monitoring:** Input drift, prediction quality, resource usage"
     ]
    },
    {
     "t": "p",
     "text": "**Tools:** TensorFlow Serving, Triton Inference Server, BentoML, Seldon Core."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is model quantization calibration?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Finding optimal scale/zero-point for quantizing each layer."
    },
    {
     "t": "p",
     "text": "**Process:**"
    },
    {
     "t": "ol",
     "items": [
      "Run representative calibration data through model",
      "Collect activation statistics (min, max, percentiles)",
      "Choose quantization parameters that minimize error"
     ]
    },
    {
     "t": "p",
     "text": "**Calibration methods:**"
    },
    {
     "t": "ul",
     "items": [
      "MinMax: Use observed min/max (sensitive to outliers)",
      "Percentile: Use 99.99th percentile (robust)",
      "Entropy: Minimize KL divergence between FP32 and quantized distributions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Bad calibration → significant accuracy loss. ~100-1000 calibration samples usually sufficient."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is depthwise separable convolution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Factorize standard convolution into cheaper operations:"
    },
    {
     "t": "ol",
     "items": [
      "**Depthwise:** Apply single filter per input channel (spatial filtering)",
      "**Pointwise:** 1×1 convolution to combine channels"
     ]
    },
    {
     "t": "p",
     "text": "**Computation:**"
    },
    {
     "t": "ul",
     "items": [
      "Standard: `K² × C_in × C_out × H × W`",
      "Depthwise separable: `K² × C_in × H × W + C_in × C_out × H × W`",
      "Reduction: ~1/K² + 1/C_out ≈ 8-9× fewer operations for 3×3 conv"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Used in MobileNet, Xception. Tiny accuracy loss, massive compute savings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is weight sharing in model compression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multiple weights share the same value — stored as index + codebook."
    },
    {
     "t": "p",
     "text": "**Process:**"
    },
    {
     "t": "ol",
     "items": [
      "Cluster weights using k-means (e.g., k=16)",
      "Replace each weight with cluster centroid index (4 bits for k=16)",
      "Store codebook of k centroid values"
     ]
    },
    {
     "t": "p",
     "text": "**Combined with pruning:** Prune → quantize → Huffman encode = Deep Compression pipeline."
    },
    {
     "t": "p",
     "text": "**Explanation:** Han et al. \"Deep Compression\" achieved 35-49× compression on AlexNet/VGG with no accuracy loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the teacher-free knowledge distillation approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Distill knowledge without a separate teacher model:"
    },
    {
     "t": "ol",
     "items": [
      "**Self-distillation:** Use deeper layers to teach shallower ones",
      "**Born-again networks:** Train student with same architecture, using teacher's soft labels",
      "**Data augmentation distillation:** Use augmented views as implicit teacher",
      "**Label smoothing:** Approximate soft labels without teacher"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Teacher-free methods are simpler to implement and can still improve student performance over standard training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is edge AI and what are the key challenges?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Running AI models directly on edge devices (phones, IoT, embedded systems)."
    },
    {
     "t": "p",
     "text": "**Challenges:**"
    },
    {
     "t": "ol",
     "items": [
      "**Memory:** Models must fit in MB, not GB",
      "**Compute:** No GPU, limited CPU",
      "**Power:** Battery constraints",
      "**Latency:** Must respond in milliseconds",
      "**Updates:** Over-the-air model updates"
     ]
    },
    {
     "t": "p",
     "text": "**Frameworks:** TensorFlow Lite, PyTorch Mobile, ONNX Runtime Mobile, CoreML (Apple)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is channel pruning and how does it achieve real speedup?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Remove entire convolutional filters (output channels)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Identify least important filters by L1 norm\nimportance = torch.norm(conv.weight.data, p=1, dim=[1,2,3])\nprune_indices = importance.argsort()[:num_prune]\n# Remove these filters → reduces output channels\n# Also removes corresponding input channels in next layer"
    },
    {
     "t": "p",
     "text": "**Explanation:** Removing filter in layer L reduces:"
    },
    {
     "t": "ul",
     "items": [
      "Output channels of layer L",
      "Input channels of layer L+1"
     ]
    },
    {
     "t": "p",
     "text": "Real speedup because resulting model is a standard (smaller) dense network."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the effect of batch size on inference latency?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Batch=1:** Lowest latency per request but GPU underutilized",
      "**Large batch:** Higher throughput but higher latency per request",
      "**Optimal:** Depends on SLA and hardware"
     ]
    },
    {
     "t": "p",
     "text": "**Dynamic batching:** Collect requests for short window, batch together."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Latency vs Throughput trade-off:\nBatch 1: 5ms latency, 200 req/s\nBatch 32: 20ms latency, 3200 req/s\nBatch 64: 35ms latency, 3600 req/s"
    },
    {
     "t": "p",
     "text": "**Explanation:** GPUs are designed for parallelism — higher batch = better GPU utilization. Balance against latency requirements."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is neural network compilation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Transform high-level model into optimized low-level code for specific hardware."
    },
    {
     "t": "p",
     "text": "**Compilers:**"
    },
    {
     "t": "ol",
     "items": [
      "**TVM:** Cross-hardware optimization (CPU, GPU, mobile, accelerators)",
      "**XLA (Accelerated Linear Algebra):** Google's compiler for TensorFlow/JAX",
      "**Glow:** Facebook's compiler for neural networks",
      "**torch.compile (Inductor):** PyTorch's new compiler"
     ]
    },
    {
     "t": "p",
     "text": "**Optimizations:** Operator fusion, memory planning, layout optimization, vectorization."
    },
    {
     "t": "p",
     "text": "**Explanation:** Can achieve 2-5× speedup by generating hardware-specific optimized code instead of framework-interpreted execution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is INT4 quantization and when does it work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Represent weights using only 4 bits (16 possible values)."
    },
    {
     "t": "p",
     "text": "**Techniques:**"
    },
    {
     "t": "ol",
     "items": [
      "**GPTQ:** Post-training quantization for large language models",
      "**AWQ:** Activation-aware weight quantization",
      "**QLoRA:** 4-bit base model + LoRA fine-tuning adapters"
     ]
    },
    {
     "t": "p",
     "text": "**Trade-offs:** More aggressive than INT8 — some accuracy loss, but 8× memory reduction vs FP32."
    },
    {
     "t": "p",
     "text": "**Explanation:** Critical for running large language models on consumer GPUs. 70B parameter model: FP16 = 140GB, INT4 = 35GB."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is model parallelism vs data parallelism for serving?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Data parallelism:** Same model on multiple GPUs, different input batches. Scale throughput.",
      "**Model parallelism:** Split model across GPUs (for models too large for single GPU).",
      "— **Pipeline parallelism:** Different layers on different GPUs",
      "— **Tensor parallelism:** Split individual layers across GPUs"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For serving: data parallelism is simpler and preferred. Model parallelism only when model doesn't fit on single GPU (LLMs)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is progressive knowledge distillation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Instead of distilling from one large teacher, use a chain of intermediate-sized models:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Teacher (large) → Assistant (medium) → Student (small)"
    },
    {
     "t": "p",
     "text": "**Why:** Large teacher-student gap can make distillation ineffective. Intermediate models bridge the gap."
    },
    {
     "t": "p",
     "text": "**Explanation:** Like a teaching chain: professor teaches TA, TA teaches student. Each step has smaller capacity gap, easier knowledge transfer."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is feature distillation vs logit distillation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Logit distillation:** Match teacher and student output probabilities (Hinton's method)",
      "**Feature distillation (FitNets):** Match intermediate layer representations",
      "**Attention distillation:** Match attention maps between teacher and student"
     ]
    },
    {
     "t": "p",
     "text": "**Comparison:** Feature distillation provides richer supervision but requires architecture alignment between layers."
    },
    {
     "t": "p",
     "text": "**Explanation:** Combining both often works best — logits teach \"what to predict\", features teach \"how to represent\"."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "How do you benchmark model inference performance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport time\n\nmodel.eval()\ndummy_input = torch.randn(1, 3, 224, 224).cuda()\n\n# Warmup\nfor _ in range(10):\n    model(dummy_input)\ntorch.cuda.synchronize()\n\n# Benchmark\ntimes = []\nfor _ in range(100):\n    start = time.perf_counter()\n    model(dummy_input)\n    torch.cuda.synchronize()  # Wait for GPU\n    times.append(time.perf_counter() - start)\n\nprint(f\"Mean: {np.mean(times)*1000:.2f}ms\")\nprint(f\"P95: {np.percentile(times, 95)*1000:.2f}ms\")"
    },
    {
     "t": "p",
     "text": "**Explanation:** Warmup avoids cold-start effects. `cuda.synchronize()` ensures GPU work is done. Report p95/p99, not just mean."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

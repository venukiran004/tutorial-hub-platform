/* ============================================================================
   PRACTICE P10.4 — Compression, Deployment and Production · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/09_Compression_Deployment_and_Production.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p10.4",
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
   "n": "76",
   "q": "What is automated data augmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "AutoAugment:\n1. Define augmentation operations: rotate, translate, shear, color, etc.\n2. Each policy = sequence of (operation, probability, magnitude)\n3. Search for best policy using RL\n\nRandAugment (simpler):\n1. N random augmentations from predefined set\n2. Each with magnitude M\n3. Only 2 hyperparameters: N, M\n\nTrivialAugment:\n1. Apply ONE random augmentation with random magnitude\n2. Zero hyperparameters!\n3. Competitive with AutoAugment"
    },
    {
     "t": "p",
     "text": "**Explanation:** AutoAugment found policies humans wouldn't design. RandAugment and TrivialAugment achieve similar results with MUCH less search cost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is the NAS-Bench benchmark?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Pre-computed benchmarks for NAS research:\n\nNAS-Bench-101: 423K unique architectures on CIFAR-10\n   - Every architecture trained 3× to completion\n   - Stored: accuracy, training time, parameters\n\nNAS-Bench-201: 15,625 architectures on CIFAR-10/100, ImageNet-16\n\nNAS-Bench-301: Surrogate benchmark for DARTS search space\n\nUsage: Evaluate NAS algorithms by looking up results instead of training\n   → Fair comparison, reproducible, fast"
    },
    {
     "t": "p",
     "text": "**Explanation:** Without benchmarks, comparing NAS algorithms was impossible — different search spaces, budgets, hardware. NAS-Bench enables apples-to-apples comparison."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is progressive NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Progressive NAS (PNAS):\nInstead of searching full architecture at once:\n\n1. Start with simple cells (1 operation)\n2. Expand by adding one operation/connection at a time\n3. Evaluate expanded candidates\n4. Keep top-K performers\n5. Expand again\n6. Repeat until desired complexity\n\nLike breadth-first search through architecture space."
    },
    {
     "t": "p",
     "text": "**Explanation:** Progressive approach is more efficient than searching full space — prune bad directions early. Guided search rather than random exploration."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is the lottery ticket hypothesis applied to NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Connection to NAS:\n1. Dense supernet contains many sparse sub-networks\n2. Some sub-networks are \"winning tickets\" (good performance when trained)\n3. NAS is essentially searching for winning tickets in architecture space\n\nImplications:\n- Overparameterized supernet → better sub-networks found\n- Random pruning of supernet can work surprisingly well\n- The search space itself is more important than search algorithm"
    },
    {
     "t": "p",
     "text": "**Explanation:** Just as pruning finds good subnetworks in weight space, NAS finds good subnetworks in architecture space. Both suggest overparameterization is key to finding good solutions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is AutoML for model deployment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Post-training AutoML:\n1. Auto Quantization: Find optimal per-layer quantization config\n2. Auto Pruning: Determine per-layer sparsity ratios\n3. Auto Compilation: Find optimal compiler settings per hardware\n4. Auto Batching: Find optimal batch size for latency/throughput\n\nPipeline:\nTrained model → Auto quantize → Auto prune → Auto compile → Deploy\n\nTools: TVM AutoTuning, ONNX Runtime auto-optimization"
    },
    {
     "t": "p",
     "text": "**Explanation:** Deployment optimization is as important as model design. Different hardware needs different optimization strategies — automate this selection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is the difference between weight-sharing and weight-inheritance in NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Weight sharing:** All sub-networks use SAME shared parameters",
      "— Fast, but coupling between sub-networks",
      "— Used in ENAS, DARTS, one-shot NAS",
      "**Weight inheritance:** Selected architecture COPIES weights from parent, then trains independently",
      "— Better final quality, but more expensive",
      "— Used in network morphism (Net2Net), progressive growing"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Weight sharing is approximate — inherited weights may not be optimal for specific sub-network. Fine-tuning after selection bridges the gap."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is the operator importance analysis in NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Which operations matter most in search space?\n\nAnalysis methods:\n1. Ablation: Remove each operation, measure accuracy drop\n2. Selection frequency: How often NAS selects each operation\n3. Architecture statistics: Analyze top-K architectures\n\nTypical findings:\n- Skip connections: Almost always selected (residual learning)\n- Sep Conv 3×3: Most frequently used operation\n- Pooling: Rarely selected at higher resolution\n- Dense Conv: Selected for early layers"
    },
    {
     "t": "p",
     "text": "**Explanation:** Understanding which operations matter guides search space design and can simplify future NAS by removing irrelevant operations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is differentiable HPO?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Make hyperparameters differentiable:\n\nStandard: Learning rate = fixed value, tuned via search\nDifferentiable: Learning rate = learnable parameter, optimized by gradient\n\nExample: Meta-gradient for learning rate\n1. Forward: compute loss with current LR\n2. Backward: compute d(val_loss)/d(LR) through computation graph\n3. Update LR using meta-gradient\n\nApplies to: LR, weight decay, dropout rate, augmentation magnitude"
    },
    {
     "t": "p",
     "text": "**Explanation:** Differentiable HPO treats hyperparameters as parameters optimized on validation set. Enables continuous optimization instead of discrete search."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is Neural Architecture Search for language models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Search dimensions for LMs:\n1. Number of attention heads\n2. Hidden dimension per head\n3. FFN expansion ratio\n4. Number of layers\n5. Attention pattern (full, sparse, local+global)\n\nSearched LMs:\n- Evolved Transformer: Found via evolution, outperforms vanilla Transformer\n- Primer: Co-designed Transformer with NAS — found squared ReLU, MDHA\n\nConstraint: Must scale — architecture found at small scale must work at large"
    },
    {
     "t": "p",
     "text": "**Explanation:** LM NAS is challenging because training is expensive and scaling behavior is unpredictable. Most LLMs still use vanilla Transformer with minor modifications."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is the morphism-based NAS approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Net2Net morphisms: Transform one architecture into another while preserving function\n\nNet2Wider: Add neurons/channels (initialize new weights to preserve output)\nNet2Deeper: Add layers (initialize as identity function)\nNet2Net+NAS: Start simple, grow via morphisms, evaluate at each step\n\nAdvantages:\n1. No training from scratch — inherit trained weights\n2. Continuous growth — efficient exploration\n3. Warm start — faster convergence"
    },
    {
     "t": "p",
     "text": "**Explanation:** Morphisms avoid the expensive restart problem. Each candidate starts from a trained parent — much faster evaluation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is the fair evaluation problem in NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Common issues in NAS papers:**"
    },
    {
     "t": "ol",
     "items": [
      "Different search spaces not comparable",
      "Different training protocols (epochs, augmentation, regularization)",
      "Search cost not reported accurately",
      "Cherry-picked results (best of N runs)",
      "Unfair baselines (NAS with tricks vs baseline without)"
     ]
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "ul",
     "items": [
      "NAS-Bench: Standardized evaluation",
      "Same training pipeline for all architectures",
      "Report mean ± std over multiple runs",
      "Include search cost in total cost"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Many NAS papers showed improvements that disappeared under fair comparison — the training pipeline mattered more than the architecture."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is mixed-precision NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Search for optimal precision per layer:\n\nLayer 1: FP32 (sensitive to quantization)\nLayer 2: FP16 (moderate sensitivity)\nLayer 3: INT8 (robust to quantization)\nLayer 4: INT4 (very robust)\n\nSearch:\n1. Profile quantization sensitivity per layer\n2. Assign precision to minimize accuracy loss under latency budget\n3. Constraint: total model size ≤ budget\n\nResult: Different layers get different precisions — optimal trade-off"
    },
    {
     "t": "p",
     "text": "**Explanation:** Not all layers are equally sensitive. First/last layers often need higher precision. Middle layers can be aggressively quantized."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is the role of knowledge distillation in NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Combine NAS + Distillation:\n\n1. NAS finds student architecture\n2. Distill from pre-trained teacher\n3. Better than NAS alone (student benefits from teacher knowledge)\n\nOr:\n1. Teacher-guided NAS: Use teacher's features to guide search\n2. Architecture + distillation co-optimization\n3. Task-aware KD: Different layers distilled differently"
    },
    {
     "t": "p",
     "text": "**Explanation:** NAS finds the architecture, distillation trains it more effectively. The combination often exceeds either technique alone."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is AutoML for time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Time Series AutoML challenges:\n1. Temporal ordering must be preserved (no random shuffling)\n2. Feature engineering: lags, rolling stats, seasonal decomposition\n3. Model selection: ARIMA, Prophet, DeepAR, Temporal Fusion Transformer\n4. Evaluation: Walk-forward validation (expanding window)\n\nTools:\n- AutoTS: Automated time series model selection\n- PyCaret Time Series: Automated pipeline\n- AutoGluon-TimeSeries: Multi-model ensembling"
    },
    {
     "t": "p",
     "text": "**Explanation:** Time series AutoML must handle temporal dependencies — can't use standard cross-validation. Walk-forward validation simulates production scenario."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the connection between NAS and pruning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "NAS: Start from nothing → build architecture (additive)\nPruning: Start from large model → remove parts (subtractive)\n\nBoth find efficient architectures!\n\nDense model (pruning target) ←→ Supernet (NAS search space)\nPruned model ←→ Selected sub-network\n\nConnection: Pruning is NAS within the subspace of a pre-trained model\nNAS generalizes pruning to arbitrary starting points"
    },
    {
     "t": "p",
     "text": "**Explanation:** Sparse-to-dense (NAS) vs dense-to-sparse (pruning) can find similar architectures. Which is better depends on compute budget and constraints."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is multi-trial vs one-shot NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Multi-trial:** Each architecture trained independently from scratch",
      "— Accurate evaluation",
      "— Extremely expensive (thousands of GPU-hours)",
      "— Original NAS, AmoebaNet",
      "**One-shot:** All architectures share weights in single supernet",
      "— Approximate evaluation",
      "— Efficient (single training)",
      "— ENAS, DARTS, OFA"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Multi-trial gives ground truth performance. One-shot trades accuracy for efficiency. One-shot dominates in practice due to cost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is the role of predictor models in NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Architecture → Encoding → Predictor → Predicted accuracy\n\nEncoding methods:\n1. Adjacency matrix + operation vector\n2. Path-based encoding\n3. Graph neural network on architecture graph\n\nPredictor types:\n1. MLP/Random Forest on features\n2. GNN on architecture graph\n3. Gaussian Process (with uncertainty)\n4. Ensemble for robust predictions\n\nActive learning:\n1. Train predictor on 100 evaluated architectures\n2. Use predictor to find promising candidates\n3. Evaluate top candidates\n4. Update predictor → repeat"
    },
    {
     "t": "p",
     "text": "**Explanation:** Predictors enable evaluating millions of architectures cheaply. Active learning strategy focuses expensive evaluations on the most informative architectures."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is constrained NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Find best architecture subject to constraints:\n\nmaximize accuracy(arch)\nsubject to:\n   latency(arch) ≤ 10ms\n   params(arch) ≤ 5M\n   FLOPs(arch) ≤ 600M\n   memory(arch) ≤ 200MB\n\nMethods:\n1. Penalty: loss = CE_loss + λ × max(0, latency - budget)\n2. Filtering: Discard architectures violating constraints\n3. Constrained BO: Bayesian optimization with constraints\n4. Multi-objective: Find Pareto front, filter by constraints"
    },
    {
     "t": "p",
     "text": "**Explanation:** Real deployment has hard constraints (model must fit on device, must meet latency SLA). Unconstrained NAS produces impractical models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is AutoML for graphs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Search for GNN architecture:\n1. Aggregation function: sum, mean, max, attention\n2. Number of message passing layers\n3. Hidden dimensions per layer\n4. Readout function for graph-level tasks\n5. Skip connection pattern\n6. Normalization type\n\nAutoGL, GraphNAS: Automated GNN design\n\nAdditional search: Hyperparameters (LR, dropout) + architecture jointly"
    },
    {
     "t": "p",
     "text": "**Explanation:** GNN architecture design is complex — aggregation, depth (over-smoothing), readout all matter. AutoML can find non-obvious combinations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is the training-free NAS approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Score architectures without training AT ALL:\n\nMethods:\n1. Synflow: Prune score based on parameter saliency at initialization\n2. GradNorm: Gradient magnitude at initialization\n3. NASWOT: Score based on linear regions at initialization\n4. Zen-Score: Expressivity score from Gaussian complexity\n\nProcess: Score architecture → rank → select top → train only top candidates\n\nResult: NAS in seconds-minutes instead of GPU-days"
    },
    {
     "t": "p",
     "text": "**Explanation:** Training-free proxies correlate with trained accuracy (Kendall τ ~0.5-0.8). Not perfect, but excellent for pruning search space. Train only top 1% of candidates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is cross-modal NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Design architectures for multi-modal learning:\n1. Image encoder architecture\n2. Text encoder architecture  \n3. Fusion architecture (how to combine modalities)\n4. Task-specific heads\n\nSearch space includes:\n- Per-modality encoder design\n- Fusion strategy (early, late, cross-attention)\n- Where to fuse (which layer)\n- How many cross-attention layers"
    },
    {
     "t": "p",
     "text": "**Explanation:** Jointly searching encoder + fusion architecture is more powerful than designing them separately. MUFIN, AutoMM explore this space."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is the relationship between NAS and foundation models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Pre-foundation model era:\n   NAS per task → optimal architecture per task\n\nFoundation model era:\n   One architecture for everything → scaling + pre-training dominates\n\nNAS role shifts:\n1. Design efficient variants of foundation architectures\n2. Find optimal sub-networks for deployment (OFA approach)\n3. Design efficient attention patterns\n4. Hardware-specific architecture optimization\n5. Compression: find architecture within distilled model"
    },
    {
     "t": "p",
     "text": "**Explanation:** NAS for finding novel architectures is less important now (Transformer dominates). NAS for deployment optimization remains critical."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is AutoML for federated learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Challenges:\n1. Data is distributed (can't centralize for standard AutoML)\n2. Non-IID data across clients\n3. Communication cost of architecture search\n4. Privacy constraints\n\nFederated NAS approaches:\n1. FedNAS: Clients search locally, share architecture (not data)\n2. Global supernet: Server distributes supernet, clients sample sub-networks\n3. Personalized: Different architectures per client based on local data"
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard AutoML assumes centralized data. Federated AutoML must operate under privacy constraints while finding good architectures for heterogeneous data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the scalability challenge of NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Search on: CIFAR-10 (small, fast)\nDeploy on: ImageNet (large, slow) or larger\n\nScalability gaps:\n1. Architecture transfer: Cell optimal on CIFAR ≠ optimal on ImageNet\n2. Training dynamics differ at scale\n3. Regularization needs change with scale\n4. Hardware constraints change\n\nSolutions:\n1. Proxy tasks with calibrated correlation to target\n2. NAS directly on target dataset (expensive but accurate)\n3. Scaling laws to predict large-scale from small-scale\n4. Progressive search at increasing scales"
    },
    {
     "t": "p",
     "text": "**Explanation:** The proxy-target gap is a fundamental challenge. Some architectural choices that matter at small scale don't matter at large scale, and vice versa."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "What is the future of NAS and AutoML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Hardware-software co-design:** Joint design of architecture + hardware accelerator",
      "**LLM-guided NAS:** Use LLMs to propose and evaluate architectures",
      "**AutoML 2.0:** Fully automated ML pipeline including problem formulation",
      "**Domain-specific AutoML:** Biology, chemistry, physics — specialized search spaces",
      "**Efficient foundation models:** NAS for Transformer-efficient variants",
      "**Democratization:** Make state-of-the-art ML accessible to non-experts",
      "**Sustainability:** Energy-efficient architecture search and deployment"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** The goal is making ML automatic, efficient, and accessible. While perfect automation isn't here yet, AutoML closes the gap between expert and non-expert ML practitioners."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

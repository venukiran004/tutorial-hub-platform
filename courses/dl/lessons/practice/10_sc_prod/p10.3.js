/* ============================================================================
   PRACTICE P10.3 — Compression, Deployment and Production · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/09_Compression_Deployment_and_Production.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p10.3",
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
   "n": "51",
   "q": "What is Neural Architecture Search (NAS)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Automatically find optimal neural network architecture for a given task."
    },
    {
     "t": "p",
     "text": "**Components:**"
    },
    {
     "t": "ol",
     "items": [
      "**Search space:** What architectures are possible (layers, connections, operations)",
      "**Search strategy:** How to explore (RL, evolution, gradient, random)",
      "**Performance estimation:** How to evaluate each candidate (train fully, proxy, predictor)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** NAS found EfficientNet, NASNet, MobileNetV3 — architectures that outperform human designs under same compute."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What are the main NAS search strategies?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Strategy",
      "How",
      "Pros/Cons"
     ],
     "rows": [
      [
       "Random Search",
       "Sample random architectures",
       "Surprisingly competitive baseline"
      ],
      [
       "Reinforcement Learning",
       "Controller network generates architectures, reward = accuracy",
       "Flexible, expensive"
      ],
      [
       "Evolutionary",
       "Mutate/crossover architectures, select fittest",
       "Embarrassingly parallel"
      ],
      [
       "Gradient-based (DARTS)",
       "Continuous relaxation, differentiate through architecture",
       "Fast, may collapse"
      ],
      [
       "One-shot (supernet)",
       "Train single supernet, evaluate sub-networks",
       "Efficient"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Original NAS (Zoph 2017) used RL — 800 GPUs for 28 days. DARTS: single GPU, few hours. Progress in efficiency is dramatic."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "How does DARTS (Differentiable Architecture Search) work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard NAS: Discrete choice of operations → not differentiable\nDARTS: Continuous relaxation\n\nInstead of choosing ONE operation per edge:\n   output = operation_k(x)\n\nUse weighted mixture of ALL operations:\n   output = Σ α_k × operation_k(x)\n   α = softmax(architecture parameters)\n\nJoint optimization:\n1. Update weights w on training data\n2. Update architecture α on validation data\n3. After search: discretize — pick argmax α per edge"
    },
    {
     "t": "p",
     "text": "**Explanation:** DARTS makes NAS differentiable — use gradient descent for architecture search. Orders of magnitude faster than RL/evolution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is the cell-based search space?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Network = Stack of cells (repeated pattern)\nCell = Directed Acyclic Graph (DAG) of operations\n\nTwo cell types:\n1. Normal cell: preserves spatial resolution\n2. Reduction cell: reduces spatial resolution (stride 2)\n\nNetwork architecture:\n[Normal] → [Normal] → [Reduction] → [Normal] → [Normal] → [Reduction] → ...\n\nSearch: Find optimal cell structure (operations + connections)\nBenefit: Search space is much smaller than full network search"
    },
    {
     "t": "p",
     "text": "**Explanation:** Cell-based search transferred well: search on small dataset (CIFAR), transfer cell to large dataset (ImageNet). Makes NAS practical."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What is the supernet (one-shot) approach to NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Define supernet containing ALL candidate operations\n2. Train supernet with weight sharing (path dropout)\n3. Evaluate sub-networks by sampling from supernet\n4. Select best sub-network based on evaluation\n\nKey insight: Sub-networks share weights with supernet\n   → No need to train each architecture from scratch\n   → Evaluate thousands of architectures quickly"
    },
    {
     "t": "p",
     "text": "**Models:** Once-for-All (OFA), BigNAS, FairNAS."
    },
    {
     "t": "p",
     "text": "**Explanation:** Supernet training: randomly activate different paths each iteration. At evaluation: inherit weights from supernet. Major speedup vs training each candidate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is hardware-aware NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard NAS: Optimize accuracy only\nHardware-aware: Optimize accuracy AND latency/FLOPs/energy\n\nMulti-objective:\n   max accuracy(arch)\n   s.t. latency(arch) ≤ budget\n\nLatency models:\n1. Lookup table: Pre-measure each operation on target hardware\n2. Predictor: Neural network that predicts latency from architecture\n3. Direct measurement: Run on actual device"
    },
    {
     "t": "p",
     "text": "**Examples:** MNASNet, FBNet, ProxylessNAS — find architectures optimized for specific phones/GPUs."
    },
    {
     "t": "p",
     "text": "**Explanation:** Same architecture has very different latency on CPU vs GPU vs mobile NPU. Hardware-aware NAS finds architecture-hardware co-design."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is EfficientNet and how was it designed?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Compound Scaling:\n   depth = α^φ    (number of layers)\n   width = β^φ    (channels per layer)  \n   resolution = γ^φ (input image size)\n   where α·β²·γ² ≈ 2\n\nStep 1: NAS finds baseline EfficientNet-B0\nStep 2: Compound scale to get B1-B7\n\nB0: 5.3M params, 77.1% top-1\nB4: 19M params, 82.9% top-1\nB7: 66M params, 84.3% top-1 (SOTA at time)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Previous approaches scaled only one dimension (deeper OR wider OR higher resolution). Compound scaling optimizes all three together — more efficient."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is the search cost problem in NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Method               GPU-days    Cost Estimate\nZoph NAS (2017):     22,400      ~$500K\nAmoebaNet (2017):    3,150       ~$70K\nENAS (2018):         0.5         ~$15\nDARTS (2019):        1           ~$25\nRandom Search:       0.5-1       ~$15-25"
    },
    {
     "t": "p",
     "text": "**Why expensive:** Each architecture must be evaluated by training → evaluating takes hours/days."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Weight sharing (supernet)",
      "Performance predictors (predict accuracy from architecture encoding)",
      "Proxy tasks (fewer epochs, smaller dataset, fewer channels)",
      "Zero-cost proxies (evaluate architecture without training)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** The field went from impractical ($500K) to accessible ($25) in 2 years."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What are zero-cost NAS proxies?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Estimate architecture quality without any training."
    },
    {
     "t": "p",
     "text": "**Methods:**"
    },
    {
     "t": "ol",
     "items": [
      "**#Params:** Simple count of parameters (surprisingly correlated with accuracy)",
      "**Jacobian score:** Sensitivity of output to input at initialization",
      "**NASWOT (Neural Architecture Search Without Training):** Score based on initial activation overlap",
      "**ZenNAS:** Zen-Score from Gaussian complexity"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Evaluate in milliseconds vs hours. Not as accurate as full training but useful for pruning search space. Combine zero-cost + partial training for efficiency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is the difference between micro and macro search in NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Micro search:** Find cell structure (operations within a building block), stack fixed number",
      "— Smaller search space, transferable cells",
      "— Most common approach (NASNet, DARTS)",
      "**Macro search:** Find entire network structure (how many layers, how to connect)",
      "— Larger search space, more flexible",
      "— Can find novel architectures (skip patterns, branching)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Micro is more efficient (search on small, transfer to large). Macro is more expressive but harder."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What is AutoML beyond NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "AutoML pipeline:\n1. Data preprocessing: Missing values, encoding, normalization\n2. Feature engineering: Feature selection, extraction, creation\n3. Algorithm selection: Which model type to use\n4. Hyperparameter optimization: Learning rate, regularization, etc.\n5. Architecture search (NAS): Neural network design\n6. Ensemble construction: Combine multiple models\n7. Post-processing: Calibration, thresholding\n\nTools: AutoGluon, Auto-sklearn, H2O AutoML, Google AutoML"
    },
    {
     "t": "p",
     "text": "**Explanation:** NAS is a component of AutoML. Full AutoML automates the entire ML pipeline from data to deployment."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is hyperparameter optimization (HPO)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "How",
      "Best For"
     ],
     "rows": [
      [
       "Grid Search",
       "Try all combinations",
       "Small spaces, few HPs"
      ],
      [
       "Random Search",
       "Random combinations",
       "Better than grid for many HPs"
      ],
      [
       "Bayesian Optimization",
       "Build surrogate model, sample promising",
       "Expensive evaluations"
      ],
      [
       "Hyperband",
       "Early stopping of bad configs",
       "Fast rough exploration"
      ],
      [
       "BOHB (BO + Hyperband)",
       "Combine both",
       "Best of both worlds"
      ],
      [
       "Population-Based Training",
       "Evolve HPs during training",
       "Dynamic schedules"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Random search is 60× more efficient than grid search for most problems (Bergstra & Bengio 2012). Bayesian is best when evaluations are expensive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "How does Bayesian Optimization work for HPO?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Evaluate f(x) at a few random hyperparameter configs\n2. Fit surrogate model (Gaussian Process) to observations\n3. Compute acquisition function:\n   - Expected Improvement (EI): Balance exploit vs explore\n   - Upper Confidence Bound (UCB): More exploration\n4. Maximize acquisition function → next config to try\n5. Evaluate f(x_next), update surrogate\n6. Repeat\n\nKey advantage: Intelligent exploration — doesn't waste time on bad regions.\nTypically 3-10× more efficient than random search."
    },
    {
     "t": "p",
     "text": "**Explanation:** GP models uncertainty → explore uncertain regions (might be good) AND exploit known good regions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is Hyperband and how does it differ from random search?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Hyperband = Random Search + Successive Halving\n\nSuccessive Halving:\n1. Start N random configurations with small budget (few epochs)\n2. Keep top 1/η (e.g., top 1/3)\n3. Give survivors more budget (more epochs)\n4. Repeat until 1 survivor trained fully\n\nExample (η=3):\nRound 1: 81 configs × 1 epoch    → keep top 27\nRound 2: 27 configs × 3 epochs   → keep top 9\nRound 3: 9 configs × 9 epochs    → keep top 3\nRound 4: 3 configs × 27 epochs   → keep top 1\nRound 5: 1 config × 81 epochs    → final result"
    },
    {
     "t": "p",
     "text": "**Explanation:** Hyperband explores MORE configs by giving less budget to poor performers. Efficient when good configs are identifiable early."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is neural predictor for NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Train a neural network to predict architecture performance:\n\nInput: Architecture encoding (adjacency matrix + operation list)\nOutput: Predicted accuracy\n\nTraining data: (architecture, true accuracy) pairs from evaluated architectures\n\nSearch:\n1. Evaluate small set of random architectures (100-500)\n2. Train predictor\n3. Use predictor to score many candidate architectures cheaply\n4. Evaluate top predictions\n5. Update predictor with new data\n6. Repeat"
    },
    {
     "t": "p",
     "text": "**Explanation:** Forward pass of predictor (milliseconds) vs training a network (hours). Enables evaluating millions of candidates cheaply."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is Once-for-All (OFA) NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Train single OFA supernet that supports ALL sub-networks\n   - Different depths (2-5 layers per stage)\n   - Different widths (channels per layer)\n   - Different kernel sizes (3, 5, 7)\n   - Different input resolutions\n\n2. At deployment: Search for best sub-network under device constraints\n   - No training needed!\n   - Find architecture in seconds via predictor\n\nResult: One training → deploy on any device (phone, GPU, edge)"
    },
    {
     "t": "p",
     "text": "**Explanation:** OFA decouples training and search. Train once → deploy everywhere. Achieves ImageNet accuracy within 1% of EfficientNet at 1/1300th of NAS search cost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is the weight sharing problem in one-shot NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Issue:** Shared weights between sub-networks may not be optimal for any individual sub-network."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Problem:\n- Layer A is shared between sub-net 1 and sub-net 2\n- Optimal weight for sub-net 1 ≠ optimal weight for sub-net 2\n- Shared weight is compromise → neither is optimal\n\nSolutions:\n1. Progressive shrinking (OFA): Gradually reduce supernet\n2. Few-shot NAS: K separate supernets instead of one\n3. Sandwich sampling: Train smallest + largest + random sub-networks\n4. Post-search fine-tuning: Fine-tune selected architecture independently"
    },
    {
     "t": "p",
     "text": "**Explanation:** Weight sharing is approximate — selected architecture performance may differ from actual standalone performance. Fine-tuning after selection helps."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is feature engineering automation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Auto Feature Engineering:\n1. Generate candidates:\n   - Polynomial: x1², x1×x2\n   - Aggregation: mean(group_by), count(group_by)\n   - Time: lag, rolling mean, diff\n   - Text: TF-IDF, embeddings\n   - Categorical: target encoding, frequency\n\n2. Select best features:\n   - Mutual information\n   - Feature importance from tree models\n   - Forward/backward selection\n   - L1 regularization\n\nTools: Featuretools (automated), tsfresh (time series), AutoFeat"
    },
    {
     "t": "p",
     "text": "**Explanation:** Feature engineering often matters more than model choice. Automation generates and selects features systematically."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is the role of transfer learning in NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Transfer NAS knowledge:\n1. Task transfer: Search on CIFAR-10, transfer cell to ImageNet\n   (Most common — cell-based NAS designed for this)\n\n2. Predictor transfer: Train accuracy predictor on task A, fine-tune for task B\n\n3. Search transfer: Use search trajectory from task A to warm-start task B\n\n4. Weight transfer: Initialize searched architecture with pre-trained weights"
    },
    {
     "t": "p",
     "text": "**Explanation:** NAS on large datasets is expensive. Transfer from small proxy tasks makes it practical. But proxy-target gap can lead to suboptimal architectures."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is the search space design problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** **The search space determines NAS quality more than the search algorithm.**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Bad search space: {Linear, Conv3×3}\n   → Can't find attention-based models\n\nGood search space: {Conv3×3, Conv5×5, DilatedConv, Attention, Skip}\n   → More expressive but harder to search\n\nDesign principles:\n1. Include diverse operations\n2. Allow skip connections\n3. Enable various connectivity patterns\n4. Keep manageable size (<10^15 architectures)\n5. Include known good building blocks"
    },
    {
     "t": "p",
     "text": "**Explanation:** NAS can only find architectures within the search space. Human expertise in search space design is critical — ironic for \"automated\" design."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is Population-Based Training (PBT)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Initialize population of models with random hyperparameters\n2. Train all models in parallel for fixed interval\n3. Evaluate all models\n4. For each model:\n   - If performing well: continue (exploit)\n   - If performing poorly: \n     a. Copy weights from a better model (exploit)\n     b. Perturb hyperparameters (explore: ×0.8 or ×1.2)\n5. Resume training\n6. Repeat\n\nResult: Discovers HP schedules (not just fixed HPs)"
    },
    {
     "t": "p",
     "text": "**Explanation:** PBT finds dynamic schedules (e.g., decrease LR at epoch 30, increase augmentation at epoch 50) — something static HPO can't discover."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is the multi-objective NAS problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Objectives (often conflicting):\n1. Accuracy ↑\n2. Latency ↓ (or FLOPs)\n3. Model size ↓\n4. Energy consumption ↓\n5. Fairness ↑\n\nPareto front = set of architectures where improving one objective \n               requires worsening another\n\nSolution approaches:\n- Weighted sum: max(α × accuracy - β × latency)\n- Pareto optimization: Find Pareto front, let user choose\n- Constrained: max accuracy s.t. latency < budget"
    },
    {
     "t": "p",
     "text": "**Explanation:** Single-objective NAS ignores practical constraints. Multi-objective provides menu of architectures for different deployment scenarios."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is the role of early stopping in NAS?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Evaluating each architecture fully (e.g., 200 epochs) is expensive.\nEarly stopping strategies:\n\n1. Reduced epochs: Train 10-20 epochs instead of 200\n   Quick but ranking may not correlate with full training\n\n2. Learning curve extrapolation: Predict final accuracy from partial curve\n   Uses parametric model or neural predictor\n\n3. Performance threshold: Stop if accuracy < threshold at epoch K\n\n4. Successive halving (Hyperband): Eliminate bottom performers progressively"
    },
    {
     "t": "p",
     "text": "**Explanation:** 80% of NAS cost is in architecture evaluation. Good early stopping reduces total cost 10-50× while maintaining quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is the difference between AutoML for tabular vs image vs NLP?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Tabular",
      "Image",
      "NLP"
     ],
     "rows": [
      [
       "Key challenge",
       "Feature engineering",
       "Architecture design",
       "Pre-trained model selection"
      ],
      [
       "Search focus",
       "Algorithm + features",
       "CNN/ViT architecture",
       "Fine-tuning config"
      ],
      [
       "Best approach",
       "Ensemble of XGBoost, LightGBM, NN",
       "NAS or scale pre-trained",
       "Transfer + PEFT"
      ],
      [
       "Data size",
       "Often small",
       "Medium-large",
       "Pre-training: huge"
      ],
      [
       "Tools",
       "AutoGluon, Auto-sklearn",
       "EfficientNet NAS",
       "HF AutoTrain"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** AutoML strategy differs by domain. Tabular: ensemble diversity. Vision: architecture design. NLP: pre-trained model + adaptation strategy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is the ENAS (Efficient NAS) approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "ENAS key idea: Share parameters among all candidate architectures\n\n1. Define supergraph (DAG of all possible operations)\n2. Controller (RNN) samples sub-graph (specific architecture)\n3. Evaluate sampled architecture using shared weights\n4. Update controller with REINFORCE (reward = validation accuracy)\n5. Update shared weights with gradient descent\n6. Repeat\n\nResult: 1000× cheaper than original NAS (0.5 GPU-day vs 500)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Weight sharing is the key insight — don't train each architecture from scratch. ENAS was first to demonstrate this, enabling practical NAS."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

/* ============================================================================
   PRACTICE P11.2 — Advanced and Edge Cases · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/10_Advanced_Edge_Cases.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p11.2",
 "lede": "**25 scenarios** from Advanced and Edge Cases. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "What is the difference between teacher forcing and scheduled sampling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Teacher forcing (training):\n   Input: \"translate: Hello\" → \"Bonjour\" (use ground truth for each step)\n   Step 1: <BOS> → predict \"Bon\" (correct!)\n   Step 2: \"Bon\" (ground truth) → predict \"jour\" (correct!)\n\nProblem: Exposure bias — model never sees its own mistakes during training\n   At inference, one wrong token → cascade of errors\n\nScheduled sampling:\n   With probability p, use ground truth. With (1-p), use model's own prediction.\n   p starts at 1.0, gradually decreases to 0.0 during training.\n   \n   → Model learns to recover from its own mistakes"
    },
    {
     "t": "p",
     "text": "**Explanation:** Teacher forcing trains faster but creates train-test discrepancy. Scheduled sampling bridges the gap. Modern autoregressive models mostly use teacher forcing + careful decoding strategies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is the effect of padding strategies in CNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Valid (no padding): Output shrinks → lose border information\n   Input: 32×32, kernel: 3×3 → Output: 30×30\n\n2. Same (zero padding): Output same size → border has artificial zeros\n   Input: 32×32, kernel: 3×3, pad: 1 → Output: 32×32\n\n3. Reflect padding: Mirror border pixels → more natural borders\n   [1,2,3] with pad=2 → [3,2,1,2,3,2,1]\n\n4. Circular padding: Wrap around → for periodic signals\n   [1,2,3] with pad=2 → [2,3,1,2,3,1,2]\n\nImpact: Border effects matter for dense prediction (segmentation)\n   Use reflect padding for better border quality in image processing"
    },
    {
     "t": "p",
     "text": "**Explanation:** Zero padding creates an edge artifact — model can learn to detect image borders from zeros. Reflect padding avoids this but is slightly slower."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is the knowledge distillation temperature and how does it affect learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Distillation with temperature T:\n   soft_labels = softmax(logits / T)\n\nT = 1: Standard softmax (sharp, high confidence)\n   [0.01, 0.01, 0.97, 0.01] → hard to learn from\n\nT = 5: Softer distribution\n   [0.15, 0.10, 0.55, 0.20] → reveals inter-class relationships\n\nT = 20: Very soft\n   [0.22, 0.21, 0.35, 0.22] → almost uniform, too soft\n\nOptimal T: Typically 3-10\n   Balance between:\n   - Too low: student can't learn from soft labels (looks like hard)\n   - Too high: all classes look equal (meaningless signal)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Higher T reveals \"dark knowledge\" — the teacher's opinion about which wrong classes are most similar. \"This 7 looks like a 1 more than a 3\" is valuable information."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is the implicit bias of gradient descent?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Gradient descent doesn't just minimize loss — it has preferences:\n\n1. SGD → favors solutions with small norm (implicit L2 regularization)\n2. Flat minima → preferred over sharp minima by SGD with noise\n3. Linear networks → GD finds minimum nuclear norm solution\n4. Deep networks → GD favors simpler solutions (lower complexity)\n\nWhy it matters:\n   Overparameterized models should overfit (more params than data)\n   But they generalize well because GD is biased toward simple solutions!\n\nConnection to generalization:\n   Max-margin → SVM finds simplest separator\n   SGD on overparameterized NNs → finds simplest interpolating function"
    },
    {
     "t": "p",
     "text": "**Explanation:** This is why large neural networks generalize — gradient descent's implicit bias acts as regularization, preferring simpler solutions among many that fit the data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is the problem of attention head redundancy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Observation: Many attention heads learn similar patterns\n   In BERT-base (12 heads × 12 layers):\n   - Some heads learn syntax (subject-verb)\n   - Some learn position (attend to previous/next)\n   - Many heads are redundant (removing them doesn't hurt)\n\nStudies show:\n   - ~30-40% of BERT heads can be pruned with minimal accuracy loss\n   - Some heads are consistently important across tasks\n   - Others are task-specific\n\nImplication:\n   - Models are overparameterized in attention (by design)\n   - Head pruning is effective for compression\n   - Multi-head attention may be searching for useful patterns"
    },
    {
     "t": "p",
     "text": "**Explanation:** Why have many heads if some are redundant? During training, all heads try different patterns. After training, only some are useful. Pruning removes the rest."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is the gradient flow in different architectures?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Plain deep network:\n   ∂L/∂w₁ = ∏ᵢ (∂fᵢ/∂fᵢ₋₁) × ∂L/∂output\n   If each factor < 1 → vanishing. If > 1 → exploding.\n\nResNet:\n   ∂L/∂w₁ = ∂L/∂output × (1 + ∂F/∂x)\n   The \"1\" ensures gradient is at least 1 → no vanishing\n\nDenseNet:\n   All previous gradients flow directly → strongest gradient flow\n   But: memory expensive (store all previous features)\n\nTransformer:\n   Multi-head attention: Direct path from any token to any other\n   Each layer has residual → gradient flows through all paths\n   \nGradient flow quality: DenseNet > ResNet > VGG/Plain"
    },
    {
     "t": "p",
     "text": "**Explanation:** Architecture design is largely about ensuring healthy gradient flow. Residual connections are the single most important architectural innovation after backpropagation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What happens when you use batch normalization with batch size 1?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Batch Normalization:\n   μ = mean(batch), σ = std(batch)\n   \nWith batch=1:\n   μ = x itself, σ = 0\n   BN(x) = (x - x) / 0 = 0/0 = NaN!\n\nSolutions:\n1. Use Instance Normalization (normalize each sample independently across spatial dims)\n2. Use Group Normalization (normalize across channel groups)\n3. Use Layer Normalization (normalize across all features)\n4. Use running stats in eval mode (works for batch=1)\n\nFor training with batch=1: GroupNorm or LayerNorm are safe choices."
    },
    {
     "t": "p",
     "text": "**Explanation:** BN assumes batch size > 1. This matters for: inference with batch=1, fine-tuning with limited memory, and some architectures (GANs often use Instance Norm)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is the effect of input normalization on training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Without normalization:\n   Feature 1: range [0, 1]\n   Feature 2: range [0, 1000000]\n   → Feature 2 dominates gradients → oscillating, slow training\n\nWith normalization (zero mean, unit variance):\n   Feature 1: range [-2, 2]\n   Feature 2: range [-2, 2]\n   → Equal contribution → smooth optimization\n\nFor images:\n   Raw pixels [0, 255] → divid by 255 → [0, 1]\n   → subtract mean, divide by std (ImageNet stats)\n   \nFor text (embeddings):\n   LayerNorm handles this internally\n\nImpact: 2-10× faster convergence with proper normalization"
    },
    {
     "t": "p",
     "text": "**Explanation:** Different scales create elongated loss landscape → gradient descent oscillates. Normalization creates circular contours → direct path to minimum."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is the problem with softmax for large output spaces?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Large vocabulary (V = 50000):\n   Softmax: exp(z_i) / Σ_j exp(z_j) for j=1..50000\n   \nProblems:\n1. Computing Σ exp(z_j) over 50K classes is expensive\n2. Full output layer: 50K × hidden_dim parameters\n3. Most classes are irrelevant for each input\n\nApproximations:\n1. Hierarchical softmax: O(log V) instead of O(V)\n2. Negative sampling: Only compute for positive + K negatives\n3. Sampled softmax: Estimate normalizer from random subset\n4. Adaptive softmax: Cluster classes by frequency, different capacity per cluster\n\nModern LLMs: Full softmax is used because GPU parallelism makes it fast enough"
    },
    {
     "t": "p",
     "text": "**Explanation:** For very large output spaces (millions), full softmax is prohibitive. For typical LLM vocab (32K-128K), GPU parallelism makes it manageable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is the impact of data augmentation during fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Pre-training: Heavy augmentation (model hasn't learned anything yet)\nFine-tuning: Light augmentation (model already has good features)\n\nWhy light? Heavy augmentation can:\n1. Destroy information specific to target task\n2. Create distribution too different from target\n3. Slow convergence (constantly different inputs)\n\nRecommended for fine-tuning:\n√ Random crop, horizontal flip (mild)\n× Strong color distortion, rotation (may hurt)\n× CutMix, Mixup (can confuse fine-grained differences)\n\nException: When target dataset is tiny (< 1000 samples)\n   → Use more augmentation to prevent overfitting"
    },
    {
     "t": "p",
     "text": "**Explanation:** Augmentation policy should match dataset size and domain. What works for pre-training may not work for fine-tuning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is the difference between early stopping and model averaging?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Early stopping: Save model at best validation metric, stop training\n   → One model, risk of early termination\n\nModel averaging: Average weights from multiple checkpoints\n   Stochastic Weight Averaging (SWA):\n   w_avg = (w₁ + w₂ + ... + wₙ) / n (from last N checkpoints)\n   \n   Exponential Moving Average (EMA):\n   w_ema = α × w_ema + (1-α) × w_current (α = 0.999 typically)\n\nEMA advantages:\n1. Smoother: Averages out SGD noise\n2. Better generalization: Tends to flat minima\n3. Always improving (no need to time early stopping)\n4. Used in: DALL-E, Stable Diffusion, modern classifiers"
    },
    {
     "t": "p",
     "text": "**Explanation:** EMA is strictly better than early stopping — it's like an ensemble of models across training time. Always use EMA for competitive models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is the implicit regularization from data augmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Augmentation = Explicit regularization encoding prior knowledge:\n\nRandom crop: Model should be invariant to position\n   → Learns position-invariant features\n\nRandom flip: Model should treat left/right equally\n   → Learns symmetric features (DON'T use for text or asymmetric tasks!)\n\nColor jitter: Model should be invariant to lighting\n   → Learns shape-based features over color-based\n\nMixup: Decision boundary should be smooth\n   → Linear interpolation between classes → smoother boundaries\n\nEach augmentation = a constraint on what the model should learn\nBad augmentation = wrong constraint → worse performance"
    },
    {
     "t": "p",
     "text": "**Explanation:** Choose augmentations based on what invariances your task ACTUALLY has. Medical imaging: don't flip left-right (organs are asymmetric). Rotation: only if useful for your task."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is the stability-plasticity dilemma?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Stability: Retain old knowledge (don't forget)\nPlasticity: Adapt to new information (keep learning)\n\nToo stable → Can't learn new tasks (frozen)\nToo plastic → Forgets old tasks (catastrophic forgetting)\n\nBiological analogy:\n   Children: High plasticity, low stability (learn fast, forget easily)\n   Adults: Low plasticity, high stability (preserve knowledge, harder to learn)\n\nDL solutions:\n1. Complementary learning systems: Fast (hippocampus) + slow (cortex)\n2. Progressive networks: Add capacity for new tasks\n3. Elastic Weight Consolidation: Regularize important weights\n4. Replay: Mix old and new data\n\nTrade-off: Controlled by regularization strength, learning rate, replay ratio"
    },
    {
     "t": "p",
     "text": "**Explanation:** No perfect solution exists — every method makes a trade-off. The right balance depends on how much the task distribution changes over time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is the problem of feature co-adaptation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Co-adaptation: Neurons that always fire together lose independence\n   → Each neuron only works in combination with specific others\n   → If one neuron fails, all dependent neurons fail\n   → Model is fragile, doesn't generalize\n\nDropout addresses this directly:\n   Random neuron removal → each neuron must be useful independently\n   → Breaks co-adaptation\n   → Each neuron learns more robust features\n\nOther methods:\n1. Decorrelation loss: Penalize correlation between features\n2. Batch normalization: Changes activations each batch\n3. Data augmentation: Different inputs prevent fixed co-activation"
    },
    {
     "t": "p",
     "text": "**Explanation:** Co-adaptation is a form of overfitting at the neuron level. The model relies on coincidental relationships between neurons rather than individually meaningful features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the challenge of reproducibility in deep learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Non-determinism sources:\n1. Random weight initialization\n2. Data shuffling order\n3. Dropout randomness\n4. GPU non-deterministic operations (cuDNN)\n5. Multi-threaded data loading\n6. Floating-point non-associativity\n\nReproducibility checklist:\n✓ Set all random seeds: torch.manual_seed(), random.seed(), np.random.seed()\n✓ torch.backends.cudnn.deterministic = True\n✓ torch.backends.cudnn.benchmark = False\n✓ Use deterministic algorithms: torch.use_deterministic_algorithms(True)\n✓ Pin data versions (DVC)\n✓ Pin package versions\n✓ Record hardware (GPU type affects results)\n\nCost: Deterministic mode can be 10-30% slower"
    },
    {
     "t": "p",
     "text": "**Explanation:** Perfect reproducibility is hard on GPUs. Accept small variations (±0.1% accuracy) as normal. Focus on reproducibility of significant findings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is the neural tangent kernel perspective?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Key insight: Infinitely wide neural networks are equivalent to kernel methods!\n\nNeural Tangent Kernel (NTK):\n   K(x, x') = <∇_θ f(x, θ₀), ∇_θ f(x', θ₀)>\n\nAs width → ∞:\n   1. Kernel K stays constant during training\n   2. Training dynamics become linear\n   3. Model converges to global minimum\n   4. Equivalent to kernel regression with NTK\n\nPractical implications:\n   Wide networks → easier to train (closer to convex optimization)\n   Finite width → richer learning dynamics (can learn features)\n   Real networks: somewhere in between"
    },
    {
     "t": "p",
     "text": "**Explanation:** NTK theory explains why overparameterized networks converge — they behave like convex optimization. But feature learning (finite width) is what makes DL powerful."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the role of skip connections beyond ResNet?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Skip connection variants:\n1. Addition (ResNet): y = F(x) + x\n2. Concatenation (DenseNet): y = [F(x), x]\n3. Gating (Highway): y = T(x) × F(x) + (1-T(x)) × x\n4. SE attention: y = σ(FC(GAP(F(x)))) × F(x) + x\n5. Pre-norm residual: y = x + F(LayerNorm(x))\n\nBeyond gradient flow:\n   Skip connections create an implicit ensemble of shallow networks:\n   \n   ResNet with n blocks → 2ⁿ paths through network\n   Most gradient flows through SHORTER paths\n   → ResNet is actually an ensemble of many shallow networks"
    },
    {
     "t": "p",
     "text": "**Explanation:** Veit et al. showed ResNets behave as exponential ensembles of shallow networks. This explains their robustness — removing a few layers doesn't catastrophically hurt performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is the information bottleneck theory in deep learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Information Bottleneck:\n   Input X → Hidden Z → Output Y\n\nOptimal Z minimizes:\n   I(X; Z) - β × I(Z; Y)\n   \n   Compress: Minimize I(X; Z) (forget irrelevant input details)\n   Preserve: Maximize I(Z; Y) (keep info relevant to output)\n\nObservation in DNNs:\n   Phase 1 (fitting): Both I(X;Z) and I(Z;Y) increase → learning\n   Phase 2 (compression): I(X;Z) decreases, I(Z;Y) stays → generalization\n\nControversial: Some argue compression isn't universal\n   (depends on activation function and how info is measured)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Deep networks learn to compress irrelevant input information while preserving task-relevant signal. This compression correlates with generalization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is the scaling law for neural networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Power law: Performance = a × Resource^(-α) + c\n\nResources: Parameters (N), Data (D), Compute (C)\n\nKaplan scaling (GPT-3 era):\n   L(N) ~ N^(-0.076)  (loss vs model size)\n   L(D) ~ D^(-0.095)  (loss vs data size)\n\nChinchilla scaling (DeepMind):\n   Optimal: D ≈ 20 × N  (tokens ≈ 20× parameters)\n   GPT-3 (175B, 300B tokens) → undertrained\n   Chinchilla (70B, 1.4T tokens) → better performance at 4× less compute\n\nImplications:\n   1. Can predict performance before training\n   2. Can plan optimal allocation of compute\n   3. Bigger is predictably better (no qualitative change)\n   4. But: \"emergent abilities\" appear at certain scales"
    },
    {
     "t": "p",
     "text": "**Explanation:** Scaling laws enable planning trillion-dollar training runs. They predict that doubling compute gives predictable (but diminishing) improvement."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is the lottery ticket hypothesis for Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Findings in Transformers:\n1. BERT contains sparse subnetworks matching full performance\n   - 40-60% weights removable without accuracy loss\n   - Key attention heads identified by lottery ticket analysis\n\n2. Attention heads are the \"tickets\":\n   - Some heads consistently important across tasks (universal)\n   - Some heads important only for specific tasks (specialized)\n\n3. Layer-wise observations:\n   - Middle layers are most prunable\n   - First and last layers need higher density\n   - Embedding layer: hard to prune (each word needs representation)\n\nPractical implication: Structured pruning of attention heads\n   is more practical than weight-level pruning for deployment"
    },
    {
     "t": "p",
     "text": "**Explanation:** Lottery tickets in Transformers concentrate in attention — specific head-layer combinations are \"winning tickets\" for specific tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is the difference between model calibration and accuracy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Accurate but miscalibrated:\n   Model says \"95% confidence it's a cat\" but it's only right 70% of the time\n   → Overconfident predictions\n\nWell-calibrated:\n   When model says P=0.8, it's correct 80% of the time\n   When model says P=0.6, it's correct 60% of the time\n\nCalibration methods:\n1. Temperature scaling: z_calibrated = z / T (tune T on val set)\n2. Platt scaling: sigmoid(a × z + b) (logistic regression on logits)\n3. Isotonic regression: Non-parametric calibration\n4. Label smoothing: Implicit calibration during training\n\nMetric: Expected Calibration Error (ECE)\n   ECE = Σ |acc(bin) - conf(bin)| × n(bin)/N\n\nWhy it matters: Medical diagnosis with 95% confidence should be right 95% of the time!"
    },
    {
     "t": "p",
     "text": "**Explanation:** Modern neural networks are typically overconfident. Post-hoc calibration (temperature scaling) is cheap and very effective. Always calibrate before deploying for risk-sensitive applications."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the effect of weight initialization scale?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Too small init:\n   Activations → 0 with depth → vanishing gradients → learning stops\n\nToo large init:\n   Activations → ±∞ with depth → exploding gradients → NaN\n\nJust right (He init for ReLU):\n   Var(h_l) ≈ Var(h_{l-1}) for all layers → stable activations\n\nExperiment:\n   Layer 1 output std: 1.0\n   ...\n   Layer 50 output std: ???\n\n   Too small (0.01): 1.0 → 0.0 (layer 50)\n   Too large (1.0): 1.0 → inf (layer 50)\n   He init: 1.0 → 1.0 (layer 50) ← stable!\n\nModern practice:\n   Most frameworks use correct initialization by default\n   But: custom layers need manual init attention"
    },
    {
     "t": "p",
     "text": "**Explanation:** Initialization is solved for standard architectures but remains important for custom layers, unusual activations, or training from scratch."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is the connection between attention and kernel methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Softmax attention:\n   A(Q, K, V) = softmax(QK^T / √d) V\n\nKernel interpretation:\n   softmax(q_i^T k_j / √d) ≈ κ(q_i, k_j) / Σ_j κ(q_i, k_j)\n   where κ is a kernel function (softmax kernel)\n\nLinear attention (replace softmax with φ):\n   A(Q, K, V) = φ(Q) (φ(K)^T V)\n   Compute φ(K)^T V first: O(n × d²) instead of O(n² × d)\n\nRandom Feature Attention:\n   φ(x) = exp(-||x||²/2) × [cos(w^T x), sin(w^T x)]\n   Approximates softmax kernel with random features\n\nImplication: Attention = soft, learnable, non-parametric kernel\n   → Explaining why Transformers are so flexible"
    },
    {
     "t": "p",
     "text": "**Explanation:** The kernel interpretation explains linear attention alternatives and connects Transformers to classical kernel theory, providing theoretical grounding for their success."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is the most common mistake when building deep learning systems?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Top mistakes (in order of frequency):\n\n1. Not having a baseline: Can't tell if your model is actually good\n   Always start with: simple model → random baseline → state-of-the-art\n\n2. Data leakage: Information from test set leaks into training\n   → Inflated metrics, model fails in production\n\n3. Not shuffling data: Ordering biases present in data\n   → Model learns order, not patterns\n\n4. Wrong evaluation metric: Accuracy on imbalanced data\n   → 99% accuracy with 99% class 0 is useless\n\n5. Not checking data quality: Garbage in, garbage out\n   → Always visualize data before training\n\n6. Overcomplicating: Using BERT for simple text classification\n   → Start simple, add complexity only when justified\n\n7. Training too long: Overfitting to training set\n   → Always use validation set and early stopping\n\n8. Not reproducible: Can't recreate results\n   → Set seeds, version everything, log everything"
    },
    {
     "t": "p",
     "text": "**Explanation:** Most DL failures are engineering failures, not modeling failures. Get the basics right before optimizing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "If you could give one piece of advice for deep learning practice, what would it be?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** **Understand your data deeply before building any model.**"
    },
    {
     "t": "p",
     "text": "The most important aspects of successful deep learning:"
    },
    {
     "t": "ol",
     "items": [
      "**Data understanding:** What are the patterns? What are the edge cases? What's missing?",
      "**Simple baselines:** Always know how a simple model performs",
      "**Iterative development:** Start simple, add complexity incrementally",
      "**Systematic debugging:** Check data → check preprocessing → check model → check training",
      "**Reproducibility:** If you can't reproduce it, you don't understand it"
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "The best DL practitioners spend:\n   60% on data (collection, cleaning, understanding, augmentation)\n   20% on experiment design (evaluation, metrics, comparison)\n   10% on model architecture\n   10% on hyperparameter tuning"
    },
    {
     "t": "p",
     "text": "**Explanation:** The difference between a good and great DL engineer is not knowledge of the latest architecture — it's the discipline to understand data, evaluate rigorously, and build incrementally. The fanciest model on bad data loses to the simplest model on good data. Every time."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

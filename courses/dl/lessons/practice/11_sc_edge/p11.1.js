/* ============================================================================
   PRACTICE P11.1 — Advanced and Edge Cases · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/10_Advanced_Edge_Cases.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p11.1",
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
   "n": "1",
   "q": "Why do neural networks need non-linear activation functions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Without non-linearity, any depth of linear layers collapses to a single linear transformation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "f(x) = W₃(W₂(W₁x)) = (W₃W₂W₁)x = Wx"
    },
    {
     "t": "p",
     "text": "Non-linearity allows learning arbitrary functions (universal approximation theorem)."
    },
    {
     "t": "p",
     "text": "**Edge case:** A 100-layer network with only linear activations has the same representational power as a 1-layer network."
    },
    {
     "t": "p",
     "text": "**Explanation:** ReLU, GELU, SiLU introduce non-linearity cheaply. The choice of activation matters — dead ReLU problem (neurons outputting zero permanently) vs smooth GELU (no dead neurons)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What happens when you train a very deep network without residual connections?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Vanishing gradients:** Gradient shrinks exponentially with depth → early layers don't learn",
      "**Degradation:** Deeper networks perform WORSE than shallower ones (not just overfitting)",
      "**Optimization difficulty:** Loss landscape becomes very rough"
     ]
    },
    {
     "t": "p",
     "text": "**ResNet solution:** Skip connections provide \"gradient highways\":"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "y = F(x) + x  (residual connection)\ndy/dx = dF/dx + 1  (gradient is at least 1)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Without residuals, training >20 layers is extremely difficult. With residuals, 100+ layers work fine."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is the dying ReLU problem and how do you detect it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Neurons that always output zero (negative pre-activation) → permanent death."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Detection: Check neuron activation rates\ndef check_dead_neurons(model, data_loader):\n    activation_counts = {}\n    hooks = []\n    \n    def hook_fn(name):\n        def hook(module, input, output):\n            active = (output > 0).float().mean(dim=0)\n            if name not in activation_counts:\n                activation_counts[name] = active\n            else:\n                activation_counts[name] += active\n        return hook\n    \n    # Register hooks on ReLU layers\n    for name, module in model.named_modules():\n        if isinstance(module, nn.ReLU):\n            hooks.append(module.register_forward_hook(hook_fn(name)))\n    \n    # Run data through model\n    for data, _ in data_loader:\n        model(data)\n    \n    # Check for dead neurons (activation rate < 1%)\n    for name, counts in activation_counts.items():\n        dead = (counts < 0.01 * len(data_loader)).sum()\n        print(f\"{name}: {dead} dead neurons\")"
    },
    {
     "t": "p",
     "text": "**Explanation:** Causes: large learning rate, large negative bias, poor initialization. Solutions: Leaky ReLU, ELU, GELU, careful initialization (He init for ReLU)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What happens when batch size is too large vs too small?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Too Small (1-8)",
      "Optimal (32-256)",
      "Too Large (4096+)"
     ],
     "rows": [
      [
       "Gradient noise",
       "Very high",
       "Moderate",
       "Very low"
      ],
      [
       "Generalization",
       "Often good",
       "Good",
       "Can be worse (sharp minima)"
      ],
      [
       "Training speed",
       "Slow (no parallelism)",
       "Balanced",
       "Fast per epoch, may need more epochs"
      ],
      [
       "Memory",
       "Low",
       "Moderate",
       "High"
      ],
      [
       "Learning rate",
       "Must be small",
       "Standard",
       "Must be large (linear scaling)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Large batch → sharp minima → worse generalization (Keskar et al.). Warmup + linear LR scaling partially mitigates this. Small batch noise acts as regularization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the effect of learning rate on training dynamics?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "LR too small: \n  → Very slow convergence\n  → Can get stuck in bad local minima\n  \nLR too large:\n  → Loss oscillates or diverges\n  → Overshoots good minima\n  → May cause NaN (numerical overflow)\n\nLR sweet spot:\n  → Fast convergence\n  → Good generalization\n\nLR schedules:\n1. Warmup: Start small, increase → prevents instability\n2. Cosine decay: Gradual decrease → better final convergence\n3. Step decay: Reduce by factor at milestones\n4. One-cycle: Warmup → high → cooldown → excellent results"
    },
    {
     "t": "p",
     "text": "**Explanation:** Learning rate is THE most important hyperparameter. LR finder (Smith 2017): sweep LR, plot loss vs LR, use value just before loss starts increasing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What causes NaN loss during training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Common causes:**"
    },
    {
     "t": "ol",
     "items": [
      "Learning rate too high → gradient explosion → overflow",
      "Log of zero: `log(0) = -inf` → NaN",
      "Division by zero in normalization",
      "Unstable attention: `exp(large_number) = inf`",
      "Mixed precision: FP16 overflow (values > 65504)"
     ]
    },
    {
     "t": "p",
     "text": "**Debugging:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Detect NaN\nfor name, param in model.named_parameters():\n    if torch.isnan(param.grad).any():\n        print(f\"NaN gradient in {name}\")\n\n# Prevent\ntorch.autograd.set_detect_anomaly(True)  # Detect exact operation"
    },
    {
     "t": "p",
     "text": "**Solutions:** Gradient clipping, lower LR, loss scaling (for FP16), add epsilon to denominators."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the difference between He and Xavier initialization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Xavier (Glorot): Var(w) = 2 / (fan_in + fan_out)\n   Best for: tanh, sigmoid (symmetric activations)\n\nHe (Kaiming): Var(w) = 2 / fan_in\n   Best for: ReLU (accounts for half of neurons being dead)\n\nWrong initialization:\n   Xavier + ReLU → variance shrinks with depth → vanishing activations\n   He + tanh → variance may explode (too large init)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Initialization maintains activation variance across layers. Wrong init → either vanishing or exploding activations from the very first forward pass."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What happens when you forget `model.eval()` during inference?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# These behave differently in train vs eval mode:\n\n1. BatchNorm:\n   Train: Uses batch statistics (μ_batch, σ_batch)\n   Eval: Uses running statistics (μ_running, σ_running)\n   Impact: Predictions depend on other samples in batch!\n\n2. Dropout:\n   Train: Randomly zeros neurons (with p probability)\n   Eval: Uses all neurons (scaled by 1-p)\n   Impact: Predictions are random! Different each time!\n\n# Correct inference\nmodel.eval()\nwith torch.no_grad():  # Also important for memory\n    output = model(input)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Forgetting `eval()` is a very common bug. Predictions will be noisy (dropout) and batch-dependent (BN). Always set eval mode for inference."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is the gradient accumulation technique?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Simulate large batch size with limited GPU memory\naccumulation_steps = 4  # Effective batch = actual batch × 4\n\noptimizer.zero_grad()\nfor i, (data, target) in enumerate(loader):\n    loss = model(data).compute_loss(target)\n    loss = loss / accumulation_steps  # Normalize\n    loss.backward()  # Accumulate gradients\n    \n    if (i + 1) % accumulation_steps == 0:\n        optimizer.step()  # Update weights\n        optimizer.zero_grad()  # Reset gradients"
    },
    {
     "t": "p",
     "text": "**Explanation:** If you need batch=32 but GPU fits batch=8: accumulate over 4 steps. Mathematically equivalent to large batch. Training is ~4× slower but uses 4× less memory."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is the label smoothing technique?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Hard labels: [0, 0, 1, 0, 0]  (one-hot)\nSoft labels: [0.02, 0.02, 0.92, 0.02, 0.02]  (smoothed, ε=0.1)\n\nFormula: y_smooth = (1 - ε) × y_hard + ε / K\nwhere K = number of classes, ε = smoothing factor\n\nEffect:\n1. Prevents model from being overconfident\n2. Regularization effect\n3. Better calibrated probabilities\n4. Improves generalization (especially with noisy labels)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Hard labels force model to output extreme probabilities → overconfident. Soft labels encourage model to maintain uncertainty → better generalization and calibration."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is gradient clipping and when is it necessary?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Method 1: Clip by norm (most common)\ntorch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)\n\n# Method 2: Clip by value\ntorch.nn.utils.clip_grad_value_(model.parameters(), clip_value=0.5)"
    },
    {
     "t": "p",
     "text": "**When necessary:**"
    },
    {
     "t": "ol",
     "items": [
      "RNNs/LSTMs (long sequences → gradient explosion)",
      "Transformers (attention can produce large gradients)",
      "Large learning rates",
      "Unstable training (loss spikes)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Gradient clipping preserves gradient direction but limits magnitude. Clip by norm is preferred — preserves relative gradient magnitudes across parameters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the effect of weight decay on different layer types?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Weight decay: L2 penalty on weights → pushes toward zero\n\nApply to:\n√ Conv weights, Linear weights\n× BatchNorm parameters (γ, β)\n× Bias terms\n× Embedding layers (sometimes)\n\nWhy not BN/bias:\n- BN affine parameters compensate for normalization → decay harms\n- Bias decay biases predictions toward zero → undesirable\n\nPyTorch implementation:\nparams_decay = [p for n, p in model.named_parameters()\n                if 'bn' not in n and 'bias' not in n]\nparams_no_decay = [p for n, p in model.named_parameters()\n                   if 'bn' in n or 'bias' in n]\noptimizer = Adam([\n    {'params': params_decay, 'weight_decay': 0.01},\n    {'params': params_no_decay, 'weight_decay': 0.0}\n])"
    },
    {
     "t": "p",
     "text": "**Explanation:** AdamW properly decouples weight decay from gradient update (unlike Adam with L2). This distinction matters — AdamW gives better results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the double descent phenomenon?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Classical: Error decreases, then increases (overfitting) with model size\n   ↑ Error\n   |    ___\n   |   /   \\    (U-shaped: underfitting → optimal → overfitting)\n   |  /     \\___\n   +--------→ Model size\n\nDouble descent: Error decreases, increases, then decreases AGAIN\n   ↑ Error\n   |    ___\n   |   /   \\\n   |  /     \\    _______________\n   |           \\/               (second descent)\n   +--------→ Model size\n                ↑ interpolation threshold"
    },
    {
     "t": "p",
     "text": "**Explanation:** At the interpolation threshold (model just fits training data), test error peaks. Beyond it (overparameterized), error decreases again. This explains why huge models generalize well despite overfitting theory."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is the lottery ticket hypothesis and its implications?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Dense network → Train → Prune 90% → Reset to INITIAL weights → Retrain\nResult: Pruned network matches full network performance!\n\nKey findings:\n1. Dense networks contain sparse \"winning tickets\"\n2. These tickets can match full network accuracy at 10-20% size\n3. Random re-initialization fails (init matters!)\n4. Iterative pruning works better than one-shot\n\nPractical implication:\n- We don't need large models for inference\n- But we need large models for TRAINING (to find good subnetworks)\n- Pruning after training is effective"
    },
    {
     "t": "p",
     "text": "**Explanation:** Why do overparameterized models work? They make it easier to FIND good sparse solutions during training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What happens when you use the wrong loss function?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Common mismatches:\n1. MSE for classification → Treats classes as ordinal → bad\n   Use: CrossEntropy\n\n2. CrossEntropy for regression → Discretizes continuous output → bad\n   Use: MSE, L1, Huber\n\n3. BCE without sigmoid → Model already applies sigmoid → double sigmoid → bad\n   Use: BCEWithLogitsLoss (includes sigmoid) or BCE after sigmoid\n\n4. CrossEntropy with soft labels → CE expects hard labels → warnings\n   Use: KLDivLoss for soft targets\n\n5. L2 loss for image generation → Blurry images → bad\n   Use: Perceptual loss + adversarial loss"
    },
    {
     "t": "p",
     "text": "**Explanation:** Loss function must match: task type, output activation, label format. Mismatches can silently produce bad results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the mode collapse problem in GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generator produces only a few types of outputs, ignoring diverse modes of data distribution."
    },
    {
     "t": "p",
     "text": "**Example:** Generator learns to produce only one face that fools discriminator, ignoring all other possible faces."
    },
    {
     "t": "p",
     "text": "**Causes:**"
    },
    {
     "t": "ol",
     "items": [
      "Discriminator too strong → generator finds one safe output",
      "Loss doesn't penalize lack of diversity"
     ]
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Wasserstein loss (WGAN) — smoother gradients",
      "Spectral normalization — stabilize discriminator",
      "Mini-batch discrimination — discriminator sees diversity",
      "Diversity-promoting losses"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Mode collapse is the fundamental GAN training challenge. Diffusion models largely avoid this issue."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the difference between L1 and L2 loss for regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L1 (MAE): |y - ŷ|\n   - Robust to outliers (linear penalty)\n   - Produces median of distribution\n   - Not differentiable at zero\n\nL2 (MSE): (y - ŷ)²\n   - Sensitive to outliers (quadratic penalty)\n   - Produces mean of distribution\n   - Smooth gradient everywhere\n\nHuber loss: L1 if |error| > δ, L2 otherwise\n   - Best of both: smooth near zero, robust far from zero\n\nFor images:\n   L2 → blurry (averages multiple possibilities)\n   L1 → slightly sharper\n   Perceptual loss → sharpest (uses VGG features)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Choose based on outlier sensitivity and what distribution statistic you want (mean vs median)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is the effect of dropout at different positions in a network?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "After input layer: Feature noise → data augmentation effect\nBetween hidden layers: Ensemble regularization\nAfter attention: Prevents attention from being too focused\nBefore final layer: Strongest regularization (most parameters here)\nDuring fine-tuning: Only on new layers (freeze + dropout on classifier)\n\nPractical tips:\n1. Apply dropout BEFORE activation (standard)\n2. Don't apply to skip connections directly (blocks gradient flow)\n3. Higher dropout for larger layers (p=0.5 for FC, p=0.1 for Conv)\n4. Reduce dropout when using BN (they serve similar purposes)\n5. Spatial dropout for Conv (drop entire feature maps, not pixels)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Dropout in different positions has different effects. Too much dropout → underfitting. Combine with other regularization carefully."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the Grokking phenomenon?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Training curve:\nPhase 1 (fast): Model memorizes training data → 100% train accuracy\nPhase 2 (plateau): Validation accuracy stays at random (50%)\nPhase 3 (grokking): Suddenly, validation accuracy jumps to 100%!\n   This can happen LONG after training accuracy is perfect\n   (sometimes 10-100× longer!)\n\nWhen observed:\n- Small algorithmic datasets (modular arithmetic, group operations)\n- Weight decay appears to help trigger grokking\n- Larger datasets → grokking happens faster"
    },
    {
     "t": "p",
     "text": "**Explanation:** The model memorizes first, then eventually learns the generalizable algorithm. Shows that training much longer (even after apparent convergence) can suddenly improve generalization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the impact of data ordering on training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Bad ordering effects:\n1. All class A samples first, then class B → catastrophic forgetting\n2. Easy samples first = curriculum learning (can be good)\n3. Same mini-batch composition every epoch → memorization patterns\n\nBest practices:\n1. Shuffle data every epoch\n2. Stratified batches (each batch has balanced classes)\n3. For sequences: bucket by length (reduce padding waste)\n4. For multi-task: mix tasks within batches\n\nExample (bad):\n   Epoch 1 batch 1 always = samples 1-32 → model overfits to this combination\n   \nFix:\n   DataLoader(shuffle=True) → different batch composition each epoch"
    },
    {
     "t": "p",
     "text": "**Explanation:** Shuffling prevents the model from learning batch-specific patterns. Stratified sampling ensures each batch is representative."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is neural network pruning at initialization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Methods for pruning BEFORE training:\n1. SNIP: Single-shot Network Pruning using connection sensitivity\n   Score = |∂L/∂(mask_j)| × |w_j| evaluated at initialization\n   Prune low-score connections\n\n2. GraSP: Gradient Signal Preservation\n   Preserve gradient flow through the network\n\n3. SynFlow: Iterative, data-free pruning\n   Score based on parameter saliency without any data\n\nQuestion: Can we skip training the full network entirely?\nAnswer: Partially — pruning at init can find 80-90% sparse networks\n   that train to reasonable accuracy, but not as good as pruning\n   after training (lottery ticket)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Pruning before training would save massive compute. Current methods work moderately well but can't match post-training pruning quality yet."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is the checkerboard artifact in transposed convolutions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Cause: Uneven overlap when transposed conv stride > 1\n\nExample (stride=2, kernel=3):\nPosition: 0 1 2 3 4  (output)\nCovered:  2 1 2 1 2  (how many kernel elements contribute)\n\nNon-uniform coverage → different positions have different magnitude → checkerboard\n\nSolutions:\n1. Resize + Conv: Upsample (bilinear) then convolve (no overlap issues)\n2. Pixel shuffle: Reshape channels to spatial dims\n3. Choose kernel size divisible by stride (kernel=4, stride=2)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Very visible in generated images. Modern generators use resize+conv or pixel shuffle. Check for checkerboard patterns in GAN/VAE outputs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is the spectral normalization technique?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Constrain the Lipschitz constant of each layer:\n\nSpectral norm: σ(W) = largest singular value of W\nSpectral normalization: W_SN = W / σ(W)\n\nEffect: Each layer has Lipschitz constant ≤ 1\n   → Bounded gradient → stable training\n\nUsed in:\n1. GAN discriminator: Prevents mode collapse\n2. Normalizing flows: Ensures invertibility\n3. Robustness: Limits sensitivity to input perturbations\n\nPyTorch:\n   torch.nn.utils.spectral_norm(nn.Linear(in, out))"
    },
    {
     "t": "p",
     "text": "**Explanation:** Spectral normalization is the key to stable GAN training. SNGAN showed it's sufficient for high-quality image generation without other tricks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is the problem of representation collapse in self-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Collapse: Model learns to map ALL inputs to the same representation\n   f(x₁) ≈ f(x₂) ≈ ... ≈ f(xₙ) = constant\n\nWhy it's a valid minimum:\n   Contrastive loss: make augmented views similar\n   Trivial solution: make EVERYTHING similar (zero contrastive loss!)\n\nPrevention:\n1. Negative pairs (SimCLR): Push different images apart\n2. Momentum encoder (MoCo): Slowly updated reference\n3. Stop-gradient (BYOL, SimSiam): Asymmetric architecture\n4. Centering + sharpening (DINO): Normalize teacher outputs\n5. Variance regularization (VICReg): Maintain feature variance"
    },
    {
     "t": "p",
     "text": "**Explanation:** Collapse prevention is the central challenge of self-supervised learning. BYOL surprised everyone by working without negatives — stop-gradient is the key mechanism."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is the impact of floating-point precision on training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "FP32 (32-bit): Standard training. Range: ±3.4×10³⁸\nFP16 (16-bit): Faster, less memory. Range: ±65504\nBF16 (brain float): Same range as FP32, less precision\n   BF16 has 8 exp bits (like FP32) vs FP16's 5 exp bits\n   → BF16 handles large values better\n\nCommon issues:\n1. FP16 overflow: values > 65504 → inf → NaN\n   Fix: Loss scaling (multiply loss by 1024, divide gradients by 1024)\n2. FP16 underflow: small gradients → 0 → no learning\n   Fix: Loss scaling (amplify small gradients above FP16 minimum)\n3. BF16: Less precision → slight accuracy loss on some tasks\n   But: More robust than FP16 (no overflow for most models)"
    },
    {
     "t": "p",
     "text": "**Explanation:** BF16 is increasingly preferred over FP16 — same dynamic range as FP32 avoids overflow issues. Modern GPUs (A100, H100) support BF16 natively."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

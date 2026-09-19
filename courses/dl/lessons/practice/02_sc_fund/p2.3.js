/* ============================================================================
   PRACTICE P2.3 — Fundamentals and Optimisation · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/01_Fundamentals_and_Optimization.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p2.3",
 "lede": "**25 scenarios** from Fundamentals and Optimisation. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "Why is regularization essential in deep learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Deep networks have millions of parameters → can memorize training data perfectly. Regularization prevents overfitting by constraining model complexity."
    },
    {
     "t": "p",
     "text": "**Evidence:** Deep networks achieve 0% training error even on random labels (Zhang et al., 2017). Without regularization, generalization is not guaranteed."
    },
    {
     "t": "p",
     "text": "**Explanation:** DL regularization differs from traditional ML: dropout, batch norm, data augmentation are more important than L1/L2 penalties."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "How does dropout work mathematically?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Training: h' = h × m / (1-p), where m ~ Bernoulli(1-p)\nTesting:  h' = h  (use all neurons, weights already scaled)"
    },
    {
     "t": "p",
     "text": "**Interpretation:** Ensemble of 2ⁿ sub-networks (n = number of neurons). Each training step trains a different sub-network. Test = average all sub-networks."
    },
    {
     "t": "p",
     "text": "**Explanation:** Prevents co-adaptation of neurons. Forces redundant representations. p=0.5 for hidden layers, p=0.1-0.2 for input. Place after activation function."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is the difference between dropout and DropConnect?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Dropout:** Zero out neuron outputs (activations). Mask on h.",
      "**DropConnect:** Zero out individual weights. Mask on W."
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Dropout: y = (W × (h ⊙ m))\nDropConnect: y = ((W ⊙ M) × h)"
    },
    {
     "t": "p",
     "text": "**Explanation:** DropConnect is more general (dropout is a special case). More granular regularization. Higher computational cost. Less commonly used in practice."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is spatial dropout for CNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Drop entire CHANNELS (feature maps) instead of individual pixels:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard dropout: random pixels within each feature map\nSpatial dropout: entire feature map either kept or dropped"
    },
    {
     "t": "p",
     "text": "**Why:** Adjacent pixels in feature maps are highly correlated. Dropping individual pixels is ineffective. Dropping entire channels removes specific feature detection."
    },
    {
     "t": "p",
     "text": "**Explanation:** Used in CNNs where spatial structure makes standard dropout less effective."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "How does weight decay differ from L2 regularization in Adam?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L2 regularization: L_total = L + λ||w||²\n→ gradient: g + 2λw      (added to gradient BEFORE adaptive scaling)\n\nWeight decay: w = w - η(g + λw)\n→ decay: subtract λw from weights AFTER adaptive scaling"
    },
    {
     "t": "p",
     "text": "**Difference:** In Adam, adaptive scaling means L2 ≠ weight decay. Infrequently updated parameters get large adaptive learning rate → L2 is scaled too."
    },
    {
     "t": "p",
     "text": "**Solution:** AdamW decouples weight decay from gradient adaptation. Use AdamW, not Adam with L2."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is Stochastic Depth?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Randomly skip (drop) entire residual blocks during training:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "During training: output = input + p × residual_block(input)\np ~ Bernoulli (probability of keeping block)\nDuring test: output = input + p_keep × residual_block(input)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Deep networks have redundant layers. Randomly skipping layers: (1) regularizes, (2) speeds up training, (3) simulates training ensemble of networks of different depths. Linear decay: drop more at deeper layers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is Cutout / Random Erasing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Randomly mask rectangular regions of input images:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Cutout: zero out random square patch\nmask = torch.ones_like(image)\ncx, cy = random coords\nmask[cy:cy+size, cx:cx+size] = 0\nimage = image * mask"
    },
    {
     "t": "p",
     "text": "**Explanation:** Forces model to use all parts of image, not just most discriminative. Simple but effective. Improves robustness to occlusion. CutMix is better (replaces with another image's patch instead of zeros)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is Mixup?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train on convex combinations of pairs of examples:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "x_mix = λ × x_i + (1-λ) × x_j\ny_mix = λ × y_i + (1-λ) × y_j\nλ ~ Beta(α, α), typically α=0.2-0.4"
    },
    {
     "t": "p",
     "text": "**Effects:** Regularization, smoother decision boundaries, better calibration, reduced overconfident predictions."
    },
    {
     "t": "p",
     "text": "**Explanation:** Linear interpolation between samples and labels. Prevents memorization. Improves calibration (confidence matches accuracy). Simple to implement, significant gains."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is gradient clipping and when to use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Clip by norm (preserves direction)\ntorch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)\n\n# Clip by value (may change direction)\ntorch.nn.utils.clip_grad_value_(model.parameters(), clip_value=0.5)"
    },
    {
     "t": "p",
     "text": "**When:** RNN training, transformer training, loss spikes, unstable training."
    },
    {
     "t": "p",
     "text": "**Explanation:** Clip by norm is preferred (preserves gradient direction. Only scales magnitude). Prevents exploding gradients from destabilizing training. Standard in transformer training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "Compare SGD, Adam, AdamW, and LAMB optimizers.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Optimizer",
      "Key Feature",
      "Best For"
     ],
     "rows": [
      [
       "SGD+Momentum",
       "Simple, good generalization",
       "CNN training with tuning"
      ],
      [
       "Adam",
       "Adaptive LR, fast convergence",
       "Quick prototyping"
      ],
      [
       "AdamW",
       "Decoupled weight decay",
       "Transformer training"
      ],
      [
       "LAMB",
       "Layer-wise adaptive (LARS+Adam)",
       "Large batch training"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** AdamW is default for transformers. SGD+Momentum often generalizes better for CNNs with proper LR schedule. LAMB enables batch sizes of 32K+ without quality loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What is the learning rate finder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Systematically find good learning rate:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Gradually increase LR from very small to very large\nfor batch in dataloader:\n    loss = model(batch)\n    loss.backward()\n    optimizer.step()\n    scheduler.step()  # LR increases exponentially\n\n# Plot loss vs LR → pick LR just before loss starts increasing"
    },
    {
     "t": "p",
     "text": "**Explanation:** Best LR is typically one order of magnitude below where loss starts diverging. Fast way to find initial LR. Implemented in fastai, PyTorch Lightning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is cosine annealing with warm restarts (SGDR)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "lr(t) = lr_min + ½(lr_max - lr_min)(1 + cos(π × t_curr / T_i))\nAfter T_i epochs: restart with new cycle\nT_{i+1} = T_i × T_mult (each restart period can increase)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Periodic LR restarts help escape local minima. Cosine decay within each cycle. Snapshot ensemble: save model at each restart → ensemble. Often outperforms fixed schedules."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is Exponential Moving Average (EMA) of model weights?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Maintain EMA of weights alongside training\nema_weights = decay × ema_weights + (1-decay) × current_weights\n# decay = 0.999 or 0.9999"
    },
    {
     "t": "p",
     "text": "**Use at test time:** EMA model is smoother, often better generalization."
    },
    {
     "t": "p",
     "text": "**Explanation:** Training weights oscillate around optimal. EMA averages out oscillations. Common in: StyleGAN, diffusion models, self-supervised learning (BYOL teacher). Easy improvement with no training cost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is Stochastic Weight Averaging (SWA)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Train normally until near convergence\n2. Continue with cyclical or constant LR\n3. Average weights periodically: SWA_model = avg(model_t1, model_t2, ...)\n4. Update batch norm statistics on SWA model"
    },
    {
     "t": "p",
     "text": "**Benefit:** Finds wider optima → better generalization. Free accuracy improvement."
    },
    {
     "t": "p",
     "text": "**Explanation:** Different training checkpoints capture different aspects of the loss landscape. Averaging produces a model in a flatter loss region. ~0.5-1% accuracy improvement typical."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is the SAM (Sharpness-Aware Minimization) optimizer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Finds parameters in flat loss regions (better generalization):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Compute gradient g at current weights w\n2. Take step to worst neighbor: w + ε × g/||g||\n3. Compute gradient at worst neighbor\n4. Update original weights using this gradient"
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard optimizers find any minimum (sharp or flat). Sharp minima generalize poorly. SAM actively seeks flat minima. Consistent ~0.5-2% accuracy improvement. 2× compute cost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is the relationship between batch size and learning rate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Linear scaling rule: when batch size increases by k, increase LR by k:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Batch 256, LR 0.1 → Batch 1024, LR 0.4"
    },
    {
     "t": "p",
     "text": "**With warmup:** Gradually increase LR over first few epochs."
    },
    {
     "t": "p",
     "text": "**Limitations:** Breaks for very large batches. LARS/LAMB handle per-layer scaling better."
    },
    {
     "t": "p",
     "text": "**Explanation:** Larger batch → more accurate gradient estimate → can take larger steps. Maintains similar optimization dynamics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is label smoothing and why does it help?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Hard target: [0, 0, 1, 0]  (100% confidence in class 2)\nSoft target: [0.025, 0.025, 0.925, 0.025]  (ε=0.1, K=4 classes)\n\ny_smooth = (1-ε) × y_onehot + ε/K"
    },
    {
     "t": "p",
     "text": "**Benefits:**"
    },
    {
     "t": "ol",
     "items": [
      "Prevents overconfidence → better calibration",
      "Regularization effect → better generalization",
      "Penalizes logit gaps → smoother features"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Model can't drive logits to ±∞. Forces maintaining small probabilities for incorrect classes. Standard in transformer training (ε=0.1)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is spectral normalization as regularization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Normalize weight matrices by their spectral norm:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "W_normalized = W / σ(W)\nσ(W) = max singular value of W"
    },
    {
     "t": "p",
     "text": "**Effect:** Constrains Lipschitz constant of network to 1."
    },
    {
     "t": "p",
     "text": "**Explanation:** Controls how much output changes per unit input change. Stabilizes training. Originally for GANs but applicable to any network. Power iteration method estimates σ efficiently."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is the effect of depth on optimization difficulty?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Shallow (2-3 layers): Easy to optimize, limited expressiveness\nMedium (10-20 layers): Good balance, manageable gradients\nDeep (50+ layers): Very hard without skip connections\nVery deep (100+ layers): Requires ResNet-style architecture"
    },
    {
     "t": "p",
     "text": "**Explanation:** Deeper = more vanishing gradient risk, harder optimization landscape, more local minima. Skip connections, batch norm, proper initialization solve many issues."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is noise injection as regularization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Add noise to various parts of the model during training:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input noise: data augmentation (images, audio)\nWeight noise: add Gaussian noise to weights\nGradient noise: add noise to gradients → SGD with noise\nActivation noise: dropout (extreme: set to zero)\nLabel noise: label smoothing"
    },
    {
     "t": "p",
     "text": "**Explanation:** Noise prevents model from memorizing exact patterns. Makes model robust to perturbations. Different injection points regularize different aspects."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is the R-Drop regularization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Force model to produce consistent outputs despite dropout randomness:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "# Forward pass twice with different dropout masks\noutput1 = model(x)  # dropout mask 1\noutput2 = model(x)  # dropout mask 2\nloss = CE(output1, y) + CE(output2, y) + KL(output1 || output2)"
    },
    {
     "t": "p",
     "text": "**Explanation:** If predictions change significantly with different dropout masks, model is uncertain. KL term forces consistency → more robust predictions. Simple, no extra hyperparameters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is the difference between first-order and second-order optimizers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**First-order (SGD, Adam):** Use gradient (first derivative). Fast, low memory.",
      "**Second-order (Newton's method, K-FAC):** Use Hessian (second derivative). Better step direction, expensive."
     ]
    },
    {
     "t": "p",
     "text": "**Practical:** First-order dominates DL (Hessian is too large: n² for n parameters). Adam approximates second-order information via running averages."
    },
    {
     "t": "p",
     "text": "**Explanation:** K-FAC approximates Hessian as Kronecker product → tractable for DL. Sophia optimizer uses diagonal Hessian for LLM training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is the Nesterov momentum?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard momentum: v = β×v + ∇L(w)      → w' = w - η×v\nNesterov momentum: v = β×v + ∇L(w - η×β×v) → w' = w - η×v"
    },
    {
     "t": "p",
     "text": "**Difference:** Nesterov looks ahead — computes gradient at anticipated position, not current position."
    },
    {
     "t": "p",
     "text": "**Explanation:** Better convergence for convex problems. Can prevent overshooting. Slightly faster convergence in practice. Used in SGD with Nesterov=True."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is the warm-up schedule and why is it important for large models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Steps 1 → warmup_steps: LR = step/warmup_steps × peak_LR\nSteps warmup_steps → end: LR follows decay (cosine, linear)"
    },
    {
     "t": "p",
     "text": "**Why important for large models:**"
    },
    {
     "t": "ol",
     "items": [
      "Random classification head produces large initial gradients",
      "Adam moments are uninitialized (biased early estimates)",
      "Large batch training needs warmup to avoid divergence"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard: 1-10% of total steps for warmup. Transformers require warmup (training fails without it). Not needed for simple models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is the LARS optimizer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Layer-wise Adaptive Rate Scaling:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "For each layer l:\n    lr_l = η × ||w_l|| / ||∇L_l + λw_l||"
    },
    {
     "t": "p",
     "text": "**Key insight:** Different layers have very different gradient/weight ratios. Apply different learning rates per layer."
    },
    {
     "t": "p",
     "text": "**Explanation:** Enables training with batch sizes of 32K+. Without LARS, large batches → poor convergence. Normalized gradient step per layer maintains stable training."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

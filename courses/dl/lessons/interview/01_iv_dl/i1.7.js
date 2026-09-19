/* ============================================================================
   INTERVIEW I1.7 — Training Techniques & Regularization
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/00_Interview_Bank/01_DL_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.7",
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
   "text": "Training Techniques & Regularization",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "121",
   "q": "What is weight initialization and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "Poor initialization → vanishing/exploding gradients before training starts."
    },
    {
     "t": "ul",
     "items": [
      "**Xavier/Glorot:** Keeps variance stable for tanh/sigmoid. \\(\\text{Var}(w) = \\frac{2}{n_{in}+n_{out}}\\)",
      "**He/Kaiming:** For ReLU. \\(\\text{Var}(w) = \\frac{2}{n_{in}}\\)",
      "**Orthogonal init:** For RNNs."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "122",
   "q": "What is Layer Normalization vs Batch Normalization?",
   "body": [
    {
     "t": "table",
     "head": [
      "",
      "BatchNorm",
      "LayerNorm"
     ],
     "rows": [
      [
       "Normalizes over",
       "Batch dimension",
       "Feature dimension"
      ],
      [
       "Training/inference",
       "Different behavior",
       "Same behavior"
      ],
      [
       "Works with",
       "CNNs",
       "Transformers, RNNs"
      ],
      [
       "Batch size",
       "Needs large batches",
       "Works with batch size 1"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "123",
   "q": "What is Group Normalization and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "Divides channels into groups and normalizes within each group independently. Works well with small batch sizes (e.g., object detection where batch size = 1-2):"
    },
    {
     "t": "math",
     "tex": "\\hat{x}_i = \\frac{x_i - \\mu_G}{\\sqrt{\\sigma_G^2 + \\epsilon}}"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "124",
   "q": "What is spectral normalization in GANs?",
   "body": [
    {
     "t": "p",
     "text": "Constrains the Lipschitz constant of the discriminator by normalizing each weight matrix by its spectral norm (largest singular value). Stabilizes GAN training without needing gradient penalty."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "125",
   "q": "What is the difference between dropout and DropBlock?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Dropout:** Randomly zeroes individual activations. Ineffective for CNNs (nearby units carry same info).",
      "**DropBlock:** Drops contiguous spatial regions (blocks) of feature maps. More effective regularization for CNNs."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "126",
   "q": "What is label smoothing and what does it do?",
   "body": [
    {
     "t": "p",
     "text": "Replace hard one-hot labels with soft targets: \\(y' = (1-\\epsilon) \\cdot y + \\epsilon/K\\). Prevents the model from becoming overconfident. Improves calibration. Commonly \\(\\epsilon=0.1\\). Hurts performance if used before knowledge distillation (teacher producing soft labels already)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "127",
   "q": "What is mixup training?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "lam = np.random.beta(alpha, alpha)\nx_mix = lam * x1 + (1 - lam) * x2\ny_mix = lam * y1 + (1 - lam) * y2\n# Train on mixed samples and labels"
    },
    {
     "t": "p",
     "text": "Reduces overconfidence and improves robustness to adversarial examples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "128",
   "q": "What is CutMix augmentation?",
   "body": [
    {
     "t": "p",
     "text": "Cut a rectangular region from one image and paste it into another. Mix labels proportionally to pixel area from each image. More effective than Mixup for vision tasks — preserves spatial information."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "129",
   "q": "What is stochastic depth?",
   "body": [
    {
     "t": "p",
     "text": "During training, randomly skip entire layers with probability \\(p_l\\). At inference, scale layer output by \\((1-p_l)\\). Trains very deep networks (1000+ layers) effectively. Different from dropout: entire layers are dropped."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "130",
   "q": "What is the difference between fine-tuning and feature extraction in transfer learning?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Feature extraction:** Freeze pretrained weights, train only the new head.",
      "**Fine-tuning:** Unfreeze all (or some) pretrained layers and train with a small learning rate.",
      "**Discriminative fine-tuning:** Different learning rates per layer (lower for earlier layers)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "131",
   "q": "What is catastrophic forgetting in neural networks?",
   "body": [
    {
     "t": "p",
     "text": "When fine-tuned on new data, the model's performance on original training data degrades significantly. Solutions: EWC (Elastic Weight Consolidation), progressive networks, learning without forgetting, LoRA for LLM fine-tuning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "132",
   "q": "What is knowledge distillation in deep learning?",
   "body": [
    {
     "t": "p",
     "text": "Train a small student network to mimic large teacher's output:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = \\alpha \\cdot \\mathcal{L}_{hard} + (1-\\alpha) \\cdot T^2 \\cdot KL(q_{student}^T \\| q_{teacher}^T)"
    },
    {
     "t": "p",
     "text": "\\(T\\) = temperature (softer probability distributions). Student often achieves near-teacher performance at much lower cost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "133",
   "q": "What is adversarial training?",
   "body": [
    {
     "t": "p",
     "text": "Include adversarially perturbed examples during training to improve robustness:"
    },
    {
     "t": "math",
     "tex": "\\min_\\theta \\mathbb{E}_{(x,y)} \\left[ \\max_{\\|\\delta\\| \\leq \\epsilon} \\mathcal{L}(f_\\theta(x+\\delta), y) \\right]"
    },
    {
     "t": "p",
     "text": "PGD adversarial training is the gold standard but 3-10× slower than standard training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "134",
   "q": "What is implicit regularization in deep learning?",
   "body": [
    {
     "t": "p",
     "text": "Properties of the optimizer (especially SGD) that implicitly regularize the model even without explicit regularization terms:"
    },
    {
     "t": "ul",
     "items": [
      "SGD finds minimum-norm solutions in over-parameterized settings.",
      "Large learning rates prefer flatter minima."
     ]
    },
    {
     "t": "p",
     "text": "These effects are still not completely understood theoretically."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "135",
   "q": "What is neural tangent kernel (NTK)?",
   "body": [
    {
     "t": "p",
     "text": "In the infinite-width limit, neural networks trained with gradient descent behave like kernel regression with the NTK. Provides theoretical grounding for: convergence analysis, generalization bounds, and understanding why over-parameterized networks generalize well."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "136",
   "q": "What is curriculum learning?",
   "body": [
    {
     "t": "p",
     "text": "Train the model on examples ordered from easy to hard (mimicking how humans learn). Benefits: faster convergence, better final accuracy for hard tasks. Self-paced learning automates difficulty scoring from model confidence."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "137",
   "q": "What is test-time augmentation (TTA)?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Average predictions over multiple augmented versions at inference\npreds = []\nfor _ in range(10):\n    augmented = augment(test_image)\n    preds.append(model(augmented))\nfinal_pred = torch.stack(preds).mean(0)"
    },
    {
     "t": "p",
     "text": "Reduces prediction variance, especially useful in competitions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "138",
   "q": "What is warm-up learning rate scheduling?",
   "body": [
    {
     "t": "p",
     "text": "Start with a very small LR, linearly increase to target LR over first N steps. Prevents early training instability (large model divergence with random weights + large LR). Standard for Transformer training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "139",
   "q": "What is gradient accumulation and why use it?",
   "body": [
    {
     "t": "p",
     "text": "Accumulate gradients over multiple mini-batches before updating weights — effectively simulates a larger batch size:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "optimizer.zero_grad()\nfor i, (x, y) in enumerate(loader):\n    loss = model(x, y) / accumulation_steps\n    loss.backward()\n    if (i + 1) % accumulation_steps == 0:\n        optimizer.step()\n        optimizer.zero_grad()"
    },
    {
     "t": "p",
     "text": "Enables large-batch training on limited GPU memory."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "140",
   "q": "What is automatic mixed precision (AMP) training?",
   "body": [
    {
     "t": "p",
     "text": "Use float16 (or bfloat16) for forward pass and gradient computation, float32 for optimizer state:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "scaler = torch.cuda.amp.GradScaler()\nwith torch.autocast(device_type=\"cuda\"):\n    output = model(input)\n    loss = criterion(output, target)\nscaler.scale(loss).backward()\nscaler.step(optimizer)\nscaler.update()"
    },
    {
     "t": "p",
     "text": "~2× speedup on modern GPUs with minimal accuracy loss."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

/* ============================================================================
   PRACTICE P2.2 — Fundamentals and Optimisation · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/01_Fundamentals_and_Optimization.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p2.2",
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
   "n": "26",
   "q": "What is a computational graph?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** DAG representing mathematical operations. Each node is an operation or variable. Edges represent data flow."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "z = Wx + b → a = ReLU(z) → L = loss(a, y)"
    },
    {
     "t": "p",
     "text": "**Explanation:** PyTorch builds dynamic computational graphs (define-by-run). TensorFlow 2.0+ uses eager execution by default. The graph enables automatic differentiation: compute gradients by traversing the graph backward."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is the difference between static and dynamic computational graphs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Static (TF 1.x):** Define graph first, then execute. Harder to debug, easier to optimize.",
      "**Dynamic (PyTorch, TF Eager):** Build graph on-the-fly during execution. Easier to debug, flexible control flow."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Dynamic graphs allow Python control flow (if/else, loops) naturally. Static graphs can be compiled and optimized. TorchScript/ONNX bridge the gap by converting dynamic to static for deployment."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is the purpose of the validation set in deep learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Monitor overfitting (training vs validation loss)",
      "Early stopping criterion",
      "Hyperparameter tuning (select best configuration)",
      "Model selection (choose best architecture)"
     ]
    },
    {
     "t": "p",
     "text": "**Important:** Never tune on test set. Validation set performance guides decisions; test set gives final unbiased evaluation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Typical split: 70% train, 15% validation, 15% test. For large datasets: 98/1/1 is common."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is data augmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Creating new training samples by applying transformations to existing data:"
    },
    {
     "t": "p",
     "text": "**Images:** Rotation, flip, crop, color jitter, cutout, mixup, CutMix"
    },
    {
     "t": "p",
     "text": "**Text:** Synonym replacement, back-translation, random insertion/deletion"
    },
    {
     "t": "p",
     "text": "**Audio:** Time stretching, pitch shifting, adding noise"
    },
    {
     "t": "p",
     "text": "**Explanation:** Cheapest way to increase effective training data. Reduces overfitting. Must be semantically valid (don't flip digits 6→9)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is the difference between training mode and evaluation mode?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Certain layers behave differently:"
    },
    {
     "t": "ul",
     "items": [
      "**Dropout:** Active in training (randomly zeros neurons), inactive in eval (uses all neurons)",
      "**Batch Norm:** Uses batch statistics in training, running statistics in eval"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model.train()   # Training mode\nmodel.eval()    # Evaluation mode\nwith torch.no_grad():  # Also disable gradient computation for efficiency\n    output = model(input)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Forgetting `model.eval()` at inference time is a common bug — gives inconsistent/wrong predictions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is gradient accumulation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Accumulate gradients over multiple mini-batches before performing a weight update, effectively simulating a larger batch size."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "optimizer.zero_grad()\nfor i, (x, y) in enumerate(loader):\n    loss = model(x, y) / accumulation_steps\n    loss.backward()\n    if (i + 1) % accumulation_steps == 0:\n        optimizer.step()\n        optimizer.zero_grad()"
    },
    {
     "t": "p",
     "text": "**Explanation:** Use when GPU memory can't fit desired batch size. 4 accumulation steps with batch 32 ≈ batch 128. Important for training large models on limited hardware."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is mixed precision training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use FP16 (16-bit float) for forward/backward pass and FP32 (32-bit) for weight updates."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "scaler = torch.cuda.amp.GradScaler()\nwith torch.cuda.amp.autocast():\n    output = model(input)\n    loss = criterion(output, target)\nscaler.scale(loss).backward()\nscaler.step(optimizer)\nscaler.update()"
    },
    {
     "t": "p",
     "text": "**Benefits:** ~2× speedup, ~50% less memory. Enables larger batch sizes."
    },
    {
     "t": "p",
     "text": "**Explanation:** FP16 has limited range → loss scaling prevents underflow. Modern GPUs (Tensor Cores) natively accelerate FP16 operations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is transfer learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use a model pre-trained on a large dataset as starting point for a new task."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Feature extraction:** Freeze pre-trained layers, train only new classification head",
      "**Fine-tuning:** Unfreeze some/all pre-trained layers, train with lower learning rate"
     ]
    },
    {
     "t": "p",
     "text": "**When useful:** Limited training data for target task; source and target tasks share similar low-level features."
    },
    {
     "t": "p",
     "text": "**Explanation:** ImageNet pre-trained models transfer well to medical imaging, satellite imagery, etc. BERT transfers well to any NLP task."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is curriculum learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train on easy examples first, gradually introduce harder examples."
    },
    {
     "t": "p",
     "text": "**Example:** Language model: short sentences → long sentences. Image classification: clear images → noisy images."
    },
    {
     "t": "p",
     "text": "**Explanation:** Mimics how humans learn. Can speed up convergence and find better optima. Requires a difficulty metric (loss, confidence, human annotation)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is the difference between generative and discriminative models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Discriminative:** Learn P(y|x) — decision boundary. Examples: CNN classifiers, logistic regression.",
      "**Generative:** Learn P(x) or P(x|y) — data distribution. Examples: GANs, VAEs, diffusion models."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Discriminative: \"Given this image, what class?\" Generative: \"Generate an image of this class.\" Generative models can also classify (via Bayes' rule) but are primarily used for data generation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is knowledge distillation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train a smaller \"student\" model to mimic a larger \"teacher\" model's outputs."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L = α·CE(y, student_pred) + (1-α)·KL(teacher_soft, student_soft)"
    },
    {
     "t": "p",
     "text": "**Soft targets:** Teacher's probability distribution (with temperature scaling) contains more information than hard labels."
    },
    {
     "t": "p",
     "text": "**Explanation:** Student learns \"dark knowledge\" — e.g., teacher says \"cat\" but also reveals it's somewhat like a \"dog.\" This inter-class relationship information helps the student generalize better."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is the difference between model compression techniques?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Pruning:** Remove unimportant weights/neurons (structured or unstructured)",
      "**Quantization:** Reduce precision (FP32 → INT8). 4× smaller, faster inference.",
      "**Distillation:** Train smaller model to mimic larger one",
      "**Architecture search:** Find efficient architectures (MobileNet, EfficientNet)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Often combined: distill → prune → quantize. Target: edge devices, mobile, real-time applications."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is the relationship between depth and width in neural networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Depth (more layers):** Better at learning hierarchical features, more parameter efficient for complex functions.",
      "**Width (more neurons per layer):** Better at memorization, easier to optimize."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Very deep networks may be hard to train (vanishing gradients, solved by residual connections). Very wide networks may overfit. Modern trend: deep AND wide with proper regularization (ResNet, GPT)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is a skip/residual connection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Short-circuit that adds input directly to output: `y = F(x) + x`"
    },
    {
     "t": "p",
     "text": "**Why it works:**"
    },
    {
     "t": "ol",
     "items": [
      "Gradient can flow directly through skip connection (mitigates vanishing gradient)",
      "Network learns residual (difference) rather than full mapping",
      "Easier to learn identity mapping when needed"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Enabled training of 100+ layer networks (ResNet). Used everywhere: transformers, U-Net, DenseNet. One of the most important innovations in deep learning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the difference between pre-training and fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Pre-training:** Train on large, general dataset (ImageNet, Wikipedia) — learns general features",
      "**Fine-tuning:** Adapt pre-trained model to specific task with smaller dataset"
     ]
    },
    {
     "t": "p",
     "text": "**Best practices for fine-tuning:**"
    },
    {
     "t": "ol",
     "items": [
      "Lower learning rate (10-100× smaller than pre-training)",
      "Freeze early layers initially",
      "Gradually unfreeze layers (discriminative fine-tuning)",
      "Use small batch size"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Foundation model paradigm: pre-train once, fine-tune many times."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is label smoothing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Instead of hard targets [0, 0, 1, 0], use soft targets [0.033, 0.033, 0.9, 0.033]:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "y_smooth = (1 - ε)·y_hard + ε/K"
    },
    {
     "t": "p",
     "text": "where ε = smoothing factor (typically 0.1), K = number of classes."
    },
    {
     "t": "p",
     "text": "**Explanation:** Prevents model from becoming overconfident. Improves generalization and calibration. Forces model to maintain non-zero probability for incorrect classes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the difference between a loss function and a metric?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Loss function:** Must be differentiable. Used for optimization (backprop). Computed on batches.",
      "**Metric:** Can be non-differentiable. Used for evaluation. Computed on entire dataset."
     ]
    },
    {
     "t": "p",
     "text": "**Example:** AUC-ROC is a metric (not differentiable → can't use as loss). Cross-entropy is a loss function."
    },
    {
     "t": "p",
     "text": "**Explanation:** Sometimes use a surrogate loss that approximates the target metric. F1 score can't be directly optimized — use cross-entropy loss and tune threshold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is multi-task learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Training one model on multiple related tasks simultaneously."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "shared_features = encoder(input)\noutput_1 = head_1(shared_features)  # Task 1 (e.g., detection)\noutput_2 = head_2(shared_features)  # Task 2 (e.g., segmentation)\nloss = λ₁·loss_1 + λ₂·loss_2"
    },
    {
     "t": "p",
     "text": "**Benefits:** Shared representation, regularization effect, data efficiency."
    },
    {
     "t": "p",
     "text": "**Explanation:** Works when tasks share underlying features. Challenge: balancing task losses. Can hurt if tasks conflict."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is the lottery ticket hypothesis?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Dense neural networks contain sparse sub-networks (\"winning tickets\") that, when trained in isolation with the same initialization, can match the full network's performance."
    },
    {
     "t": "p",
     "text": "**Implication:** Most parameters are unnecessary. The right initialization + architecture matters."
    },
    {
     "t": "p",
     "text": "**Explanation:** Pruning after training finds these sub-networks. Suggests we over-parameterize networks to make optimization easier, then can safely remove redundancy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is the difference between online and offline data augmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Offline:** Generate augmented data before training, store on disk. Increases dataset size.",
      "**Online:** Apply random augmentations on-the-fly during training. Doesn't increase storage."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Online is standard in deep learning (via data loaders). Different augmentation applied at each epoch. More diverse training without storage overhead."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is learning rate warmup?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Start with very small learning rate, linearly increase to target LR over first few epochs/steps."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "warmup_steps = 1000\nif step < warmup_steps:\n    lr = target_lr * (step / warmup_steps)"
    },
    {
     "t": "p",
     "text": "**Why:** At the start, weights are random → large gradients. High LR + large gradients = unstable training."
    },
    {
     "t": "p",
     "text": "**Explanation:** Especially important for: Adam optimizer, large batch sizes, transformers. Allows the optimizer statistics to stabilize before using the full learning rate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the cosine annealing learning rate schedule?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "lr = lr_min + 0.5 * (lr_max - lr_min) * (1 + cos(π * t / T))"
    },
    {
     "t": "p",
     "text": "Starts high, smoothly decreases following a cosine curve."
    },
    {
     "t": "p",
     "text": "**Explanation:** Smooth decay without discrete drops (unlike step decay). Popular variant: cosine with warm restarts (SGDR) — periodically reset LR to high value. Allows escaping local minima."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is gradient checkpointing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Trade compute for memory: recompute intermediate activations during backward pass instead of storing them all."
    },
    {
     "t": "p",
     "text": "**Benefit:** Dramatically reduces memory usage (can train 4× larger models)."
    },
    {
     "t": "p",
     "text": "**Cost:** ~30% slower training due to recomputation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard backprop stores all activations. Gradient checkpointing stores only at checkpoint layers, recomputes between checkpoints. Essential for training large models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is the difference between a deep and shallow network?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Shallow (1-2 hidden layers):** Can approximate any function, but may need exponentially many neurons",
      "**Deep (many layers):** More parameter-efficient, learns hierarchical features, but harder to train"
     ]
    },
    {
     "t": "p",
     "text": "**Practical rule:** Start shallow, increase depth if needed. Use residual connections for deep networks."
    },
    {
     "t": "p",
     "text": "**Explanation:** Depth provides exponential gains in representational efficiency — composing simple functions is more efficient than one massive function."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "When should you NOT use deep learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Small data:** <1000 samples — traditional ML often wins",
      "**Tabular data:** XGBoost/LightGBM usually better",
      "**Interpretability required:** Linear models, decision trees more explainable",
      "**Limited compute:** DL is resource-intensive",
      "**Simple patterns:** Logistic regression suffices for linearly separable data",
      "**Real-time inference on edge:** Complex DL may be too slow"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Deep learning shines on unstructured data (images, text, audio) with large datasets. For structured/tabular data, tree-based models remain competitive."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

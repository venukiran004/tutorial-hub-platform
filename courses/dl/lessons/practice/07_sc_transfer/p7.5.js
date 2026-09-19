/* ============================================================================
   PRACTICE P7.5 — Transfer, Self-Supervised and Meta-Learning · 5
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/06_Transfer_SelfSupervised_MetaLearning.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p7.5",
 "lede": "**25 scenarios** from Transfer, Self-Supervised and Meta-Learning. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "n": "101",
   "q": "What is multi-task learning (MTL) in deep learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Training a single model to perform multiple related tasks simultaneously."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Shared Backbone → Task 1 Head (classification)\n                → Task 2 Head (segmentation)\n                → Task 3 Head (depth estimation)"
    },
    {
     "t": "p",
     "text": "**Benefits:**"
    },
    {
     "t": "ol",
     "items": [
      "Shared features reduce total parameters",
      "Inductive bias from related tasks improves generalization",
      "Regularization — prevents overfitting to single task",
      "Efficient inference — one forward pass for multiple outputs"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Works best when tasks share low/mid-level features (edges, textures) but differ in high-level output."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "102",
   "q": "What is hard parameter sharing vs soft parameter sharing in MTL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Hard sharing:** Tasks share a common backbone, separate task-specific heads.",
      "— Simpler, fewer parameters, risk of negative transfer",
      "**Soft sharing:** Each task has its own model, but parameters are regularized to be similar.",
      "— More flexible, higher parameter count",
      "— Cross-stitch networks: learn linear combinations of task features"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Hard sharing is standard (simpler). Soft sharing when tasks are less related. Cross-stitch lets model learn how much to share per layer."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "103",
   "q": "What is negative transfer in multi-task learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When learning one task hurts performance on another task."
    },
    {
     "t": "p",
     "text": "**Causes:**"
    },
    {
     "t": "ol",
     "items": [
      "Tasks are unrelated or conflicting",
      "Gradients from different tasks interfere",
      "Capacity limited — tasks compete for model capacity"
     ]
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Gradient surgery (PCGrad): Project conflicting gradients",
      "Task weighting: Uncertainty weighting, GradNorm",
      "Task grouping: Only share between compatible tasks",
      "Task routing: Different paths through network per task"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Detection + classification share well. Depth estimation + semantic segmentation may conflict on certain features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "104",
   "q": "How do you balance task losses in multi-task learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Method 1: Uncertainty weighting (Kendall et al.)\n# Learn task uncertainties σ_i\nloss = (1/(2*σ1²)) * loss_task1 + (1/(2*σ2²)) * loss_task2 + log(σ1) + log(σ2)\n\n# Method 2: GradNorm\n# Balance gradient magnitudes across tasks\ngrad_norms = [torch.norm(grads[i]) for i in range(n_tasks)]\ntarget_grad = mean(grad_norms) * (loss_ratios[i] ** α)\n# Adjust task weights to match target gradients\n\n# Method 3: Fixed weights (simplest)\nloss = 1.0 * loss_cls + 0.5 * loss_seg + 0.2 * loss_depth"
    },
    {
     "t": "p",
     "text": "**Explanation:** Uncertainty weighting is most popular — automatically learns appropriate weights based on task difficulty/uncertainty."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "105",
   "q": "What is task-incremental learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Add new tasks to model without forgetting old tasks (continual/lifelong learning)."
    },
    {
     "t": "p",
     "text": "**Challenge:** Catastrophic forgetting — training on new task degrades old task performance."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**EWC:** Penalize changes to important weights",
      "**PackNet:** Prune + assign freed weights to new tasks",
      "**Progressive Nets:** Add new columns for new tasks, freeze old",
      "**Replay:** Mix old task data when training new task"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Practical: production model needs new capabilities without retraining from scratch."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "106",
   "q": "What is auxiliary task learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Add tasks that aren't needed at inference but help learn better representations."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Primary task: Object detection\nAuxiliary tasks: Depth prediction, surface normal estimation\n\nAt training: Optimize all losses jointly\nAt inference: Only use detection head (discard auxiliary heads)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Auxiliary tasks provide additional supervision signals for shared features. Choose auxiliaries that require the same features your primary task needs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "107",
   "q": "What is meta-learning (\"learning to learn\")?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Algorithms that improve their learning ability with experience across tasks."
    },
    {
     "t": "p",
     "text": "**Goal:** After training on many tasks, adapt to new tasks with few examples."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Meta-training: Learn from many tasks\nMeta-testing: Apply to new unseen tasks\n\nEpisode format:\n- Support set: K examples per class (learn from)\n- Query set: Evaluate on these (test)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Regular ML: learn from data. Meta-learning: learn how to learn from data. Critical for few-shot learning scenarios."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "108",
   "q": "How does MAML (Model-Agnostic Meta-Learning) work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Outer loop (meta-update):\n  For each task T_i:\n    1. Copy model parameters: θ' = θ\n    2. Inner loop: Take K gradient steps on support set of T_i\n       θ' = θ - α∇L(T_i_support, θ)\n    3. Evaluate θ' on query set of T_i\n  4. Meta-gradient: Update θ using query losses from all tasks\n     θ = θ - β∇Σ_i L(T_i_query, θ'_i)"
    },
    {
     "t": "p",
     "text": "**Key insight:** Learn initialization θ that adapts quickly (in few gradient steps) to any new task."
    },
    {
     "t": "p",
     "text": "**Explanation:** MAML is model-agnostic — works with any differentiable model. The inner loop simulates \"what would happen if I fine-tuned on this task?\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "109",
   "q": "What are Prototypical Networks for few-shot learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "For N-way K-shot:\n1. Compute class prototypes = mean of support set embeddings per class\n   c_k = (1/K) Σ f(x_i) for x_i in class k\n\n2. Classify query by distance to prototypes:\n   p(y=k|x) = softmax(-d(f(x), c_k))\n   d = Euclidean distance"
    },
    {
     "t": "p",
     "text": "**Explanation:** Simple and effective. No inner loop optimization (unlike MAML). Just learn a good embedding space where class means are discriminative. Scales to many classes easily."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "110",
   "q": "What is the difference between metric-based, optimization-based, and model-based meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Approach",
      "How",
      "Examples"
     ],
     "rows": [
      [
       "Metric-based",
       "Learn similarity/distance function",
       "Siamese, Prototypical, Matching Networks"
      ],
      [
       "Optimization-based",
       "Learn good initialization for fast adaptation",
       "MAML, Reptile, Meta-SGD"
      ],
      [
       "Model-based",
       "Learn model that reads support set and makes predictions",
       "SNAIL, MetaNet"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Metric: embed and compare. Optimization: initialize and fine-tune. Model-based: feed support set as input → output predictions. Each has different inductive biases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "111",
   "q": "What is curriculum learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train model on examples ordered from easy to hard, like human learning."
    },
    {
     "t": "p",
     "text": "**Implementation:**"
    },
    {
     "t": "ol",
     "items": [
      "Define difficulty metric (loss value, data complexity, human annotation)",
      "Start with easy examples",
      "Gradually introduce harder examples"
     ]
    },
    {
     "t": "p",
     "text": "**Benefits:**"
    },
    {
     "t": "ol",
     "items": [
      "Faster convergence",
      "Better generalization",
      "More stable training"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Like teaching: start with addition before calculus. Self-paced learning: model itself decides what's easy/hard based on current loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "112",
   "q": "What is the difference between few-shot, zero-shot, and one-shot learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Setting",
      "Labeled Examples",
      "Example"
     ],
     "rows": [
      [
       "Zero-shot",
       "0 per class",
       "Classify using descriptions only"
      ],
      [
       "One-shot",
       "1 per class",
       "Face verification (one photo per person)"
      ],
      [
       "Few-shot",
       "2-10 per class",
       "New product classification"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Zero-shot requires:** Side information (attributes, text descriptions, class embeddings)"
    },
    {
     "t": "p",
     "text": "**Explanation:** CLIP enables zero-shot via text descriptions. One-shot is hardest among few-shot settings — needs strong inductive bias."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "113",
   "q": "What is transfer learning vs multi-task learning vs meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Transfer Learning: Train on task A → Apply to task B\n   Pre-train ImageNet → Fine-tune on X-rays\n   Sequential: A then B\n\nMulti-Task Learning: Train on tasks A, B, C simultaneously\n   Single model, multiple heads, joint training\n   Concurrent: A, B, C together\n\nMeta-Learning: Train on tasks T1...TN → Adapt quickly to new task T_new\n   Learn to learn from many tasks → rapid adaptation\n   Learn to adapt: train on many, test on new"
    },
    {
     "t": "p",
     "text": "**Explanation:** Transfer: source→target. MTL: simultaneous tasks. Meta: learn adaptation mechanism itself."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "114",
   "q": "What is Reptile meta-learning algorithm?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Reptile: Simplified MAML (no second-order gradients)\nfor iteration in range(meta_iterations):\n    # Sample task\n    task = sample_task()\n    \n    # Save initial params\n    old_params = model.parameters().clone()\n    \n    # Train K steps on task\n    for step in range(K):\n        loss = compute_loss(task.support, model)\n        loss.backward()\n        optimizer.step()\n    \n    # Meta-update: move toward task-adapted params\n    for p, old_p in zip(model.parameters(), old_params):\n        p.data = old_p + ε * (p.data - old_p)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Reptile is simpler than MAML (no second derivatives). Move initial params toward adapted params. Converges to similar solutions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "115",
   "q": "What is task-aware vs task-agnostic multi-task learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Task-aware:** Model knows which task to perform (task ID provided)",
      "— Separate heads selected based on input task",
      "**Task-agnostic:** Model automatically determines what task to perform",
      "— Unified head, learns from input format/context"
     ]
    },
    {
     "t": "p",
     "text": "**Example:**"
    },
    {
     "t": "ul",
     "items": [
      "Task-aware: \"This is a segmentation input\" → use segmentation head",
      "Task-agnostic: \"Describe this image\" / \"Segment this image\" — model infers task from instruction"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Modern foundation models (GPT-4V) are task-agnostic — determine task from natural language instructions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "116",
   "q": "What is multi-modal multi-task learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combine multiple modalities (text + image + audio) AND multiple tasks."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Example: Video understanding\nModalities: Video frames + Audio + Subtitles\nTasks: Action recognition + Captioning + Speaker identification + Emotion detection\n\nShared encoder → modality fusion → task-specific decoders"
    },
    {
     "t": "p",
     "text": "**Explanation:** Real-world problems are inherently multi-modal and multi-task. Humans naturally combine modalities for understanding."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "117",
   "q": "What is the Pareto front in multi-task optimization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Set of solutions where improving one task necessarily worsens another."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "                 Task B Loss\n                   ↑\n                   |  × (bad at both)\n                   | ×\n                   |× ← Pareto front\n                   |  ×\n                   |    ×\n                   +--------→ Task A Loss"
    },
    {
     "t": "p",
     "text": "**Multi-objective optimization:** Find the best trade-off between tasks."
    },
    {
     "t": "p",
     "text": "**MGDA:** Multiple Gradient Descent Algorithm — finds Pareto-optimal update direction."
    },
    {
     "t": "p",
     "text": "**Explanation:** Stakeholders choose point on Pareto front based on task priorities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "118",
   "q": "What is task-specific adapter layers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Frozen backbone → Adapter (small trainable module) → Task output\n\nAdapter module:\nx → LayerNorm → Down-project (d→r) → Activation → Up-project (r→d) → + x\n\nParameters: 2 × d × r (r << d)"
    },
    {
     "t": "p",
     "text": "**Benefits:** Share backbone across tasks, only train lightweight adapters (~2-5% of parameters)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Each task gets its own adapter. At inference, load backbone + task adapter. Multiple tasks share same backbone weights — memory efficient."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "119",
   "q": "What is the difference between homogeneous and heterogeneous multi-task learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Homogeneous:** All tasks have same type (e.g., all classification)",
      "— English sentiment + French sentiment + German sentiment",
      "**Heterogeneous:** Tasks have different types",
      "— Classification + regression + generation",
      "— Different loss functions, different output formats"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Heterogeneous MTL is harder due to different loss scales and output structures. Need careful task balancing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "120",
   "q": "What is learning with task-specific attention in MTL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "MTAN (Multi-Task Attention Network):\n1. Shared encoder produces features\n2. Each task has attention module that selects relevant features\n   a_k = sigmoid(W_k * features)  # task-k attention mask\n   task_k_features = a_k ⊙ features  # element-wise\n3. Task-specific decoder processes attended features"
    },
    {
     "t": "p",
     "text": "**Explanation:** Different tasks need different features from shared encoder. Attention learns what to use per task — reduces negative transfer."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "121",
   "q": "What is domain randomization as a meta-learning approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train on many randomized simulated environments → transfer to real world."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Sim-to-Real Transfer:\n1. Randomize: lighting, texture, physics, camera, object shapes in simulation\n2. Model learns features invariant to these variations\n3. Real world becomes \"just another variation\"\n\nExample (robotic grasping):\n- Random colors, random lighting, random object sizes\n- Robot learns to grasp regardless of visual variations"
    },
    {
     "t": "p",
     "text": "**Explanation:** Domain randomization treats each random configuration as a different \"task\" — the model meta-learns to handle variation. Key for sim-to-real transfer."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "122",
   "q": "What is task augmentation for meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Create more meta-training tasks by:"
    },
    {
     "t": "ol",
     "items": [
      "**Label permutation:** Relabel classes randomly for new tasks",
      "**Feature subsetting:** Use different feature subsets per task",
      "**Data augmentation per task:** Different augmentations create different tasks",
      "**Problem transformation:** Turn classification into ranking, etc."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Meta-learning needs many diverse tasks. Limited tasks → overfitting at meta-level. Task augmentation increases task diversity cheaply."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "123",
   "q": "What is the Multi-Gate Mixture-of-Experts (MMoE) for MTL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input → Expert 1 → e₁\n      → Expert 2 → e₂\n      → Expert 3 → e₃\n\nTask A gate: g_A = softmax(W_A × input) → weighted sum of experts for task A\nTask B gate: g_B = softmax(W_B × input) → weighted sum of experts for task B\n\nOutput_A = Σ g_A_i × e_i\nOutput_B = Σ g_B_i × e_i"
    },
    {
     "t": "p",
     "text": "**Explanation:** Each task has its own gating network that learns which experts to use. Tasks can share or specialize experts dynamically. Used at Google for recommendation systems."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "124",
   "q": "What is contrastive meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combine contrastive learning with meta-learning:"
    },
    {
     "t": "ol",
     "items": [
      "**Task-level contrastive:** Pull same-task representations together, push different-task apart",
      "**Class-level contrastive:** Within each task, apply contrastive learning for class discrimination"
     ]
    },
    {
     "t": "p",
     "text": "**Benefits:** More robust embeddings for few-shot classification."
    },
    {
     "t": "p",
     "text": "**Explanation:** Regular meta-learning can overfit to meta-training tasks. Contrastive regularization gives more generalizable representations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "125",
   "q": "What is the cross-task knowledge transfer mechanism?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Task A features → Cross-task attention → Enriched Task B features\n\nCross-task attention:\nQ = Task B features\nK, V = Task A features\nOutput = softmax(QK^T/√d) × V + Task B features\n\nTask B uses relevant information from Task A's representation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Tasks can provide complementary information. Object detection features help segmentation. Depth features help 3D detection. Cross-attention enables selective transfer."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

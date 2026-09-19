/* ============================================================================
   PRACTICE P7.6 — Transfer, Self-Supervised and Meta-Learning · 6
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/06_Transfer_SelfSupervised_MetaLearning.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p7.6",
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
   "n": "126",
   "q": "What is task scheduling in multi-task learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Decide which task to train on at each iteration."
    },
    {
     "t": "p",
     "text": "**Strategies:**"
    },
    {
     "t": "ol",
     "items": [
      "**Round-robin:** Alternate between tasks equally",
      "**Proportional:** Sample tasks proportional to dataset size",
      "**Uncertainty-based:** Focus on tasks with highest uncertainty",
      "**Curriculum:** Start with easier tasks, add harder ones gradually",
      "**Bandit-based:** Treat task selection as multi-armed bandit problem"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Random is often okay, but smart scheduling can improve training efficiency and final performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "127",
   "q": "What is task-aware batch normalization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class TaskAwareBN(nn.Module):\n    def __init__(self, num_features, num_tasks):\n        super().__init__()\n        # Separate BN stats per task\n        self.bns = nn.ModuleList([\n            nn.BatchNorm2d(num_features) for _ in range(num_tasks)\n        ])\n    \n    def forward(self, x, task_id):\n        return self.bns[task_id](x)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Different tasks may have different feature distributions. Shared conv weights + task-specific BN is an effective lightweight approach to task specialization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "128",
   "q": "What is the difference between episodic and non-episodic meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Episodic:** Sample tasks, create episodes (support + query sets), train on episodes",
      "— Mimics test-time scenario during training",
      "— Standard for few-shot classification",
      "**Non-episodic:** Train normally on all data, evaluate in few-shot manner",
      "— Simpler training procedure",
      "— Recent work shows competitive with episodic"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Episodic training ensures training distribution matches evaluation. But good representations (non-episodic) can also work for few-shot with simple classifiers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "129",
   "q": "What is model-based meta-learning (Neural Process)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Neural Process:\n1. Encode context (support) points: (x_i, y_i) → r_i\n2. Aggregate: r = aggregate(r_1, ..., r_K) (mean, attention)\n3. Decode: Given r and new x*, predict y*\n\nLike a neural Gaussian Process:\n- Uncertainty quantification built in\n- Handles variable context set size\n- Single forward pass at test time (no gradient steps)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Unlike MAML (optimization-based), neural processes directly learn the mapping from support set to prediction function. Faster at test time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "130",
   "q": "What is the task relatedness estimation for MTL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** How to determine if two tasks should be trained together?"
    },
    {
     "t": "p",
     "text": "**Methods:**"
    },
    {
     "t": "ol",
     "items": [
      "**Task affinity:** Train task A, evaluate on task B's validation — positive score = related",
      "**Gradient angle:** Compute angle between task gradients — small angle = compatible",
      "**Feature similarity (CKA):** Compare learned representations across tasks",
      "**Task2Vec:** Embed tasks based on Fisher information → cluster similar tasks"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Don't blindly combine tasks. Measure relatedness first. Group compatible tasks together. Separate conflicting tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "131",
   "q": "What is the role of shared representations in MTL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Layer 1 (shared): Low-level features (edges, textures) — universal\nLayer 2 (shared): Mid-level features (parts, shapes) — mostly shared\nLayer 3 (partially shared): High-level features — task-dependent\nLayer 4 (task-specific): Task heads — separate\n\n\"Split point\" determines where sharing ends.\nToo much sharing → negative transfer (task interference)\nToo little sharing → reduced benefit (no knowledge transfer)"
    },
    {
     "t": "p",
     "text": "**Explanation:** The optimal split point is task/dataset dependent. Deeper sharing works for closely related tasks. Shallow sharing for loosely related tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "132",
   "q": "What is pre-training as implicit meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Large-scale pre-training (ImageNet, CLIP) can be viewed as meta-learning:"
    },
    {
     "t": "ul",
     "items": [
      "Pre-training = meta-training (learn general features from many examples/classes)",
      "Fine-tuning = meta-testing (adapt to new task with limited data)"
     ]
    },
    {
     "t": "p",
     "text": "**Connection:**"
    },
    {
     "t": "ul",
     "items": [
      "MAML learns initialization that adapts quickly",
      "Pre-training learns features that transfer well",
      "Both achieve few-shot adaptation"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** This perspective explains why pre-trained models excel at few-shot learning without explicit meta-learning algorithms."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "133",
   "q": "What is multi-task reinforcement learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Agent learns multiple tasks in the same or different environments."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Shared policy:** One policy for all tasks (with task conditioning)",
      "**Distillation:** Train specialists, distill into generalist",
      "**Hindsight:** Relabel trajectories for different tasks (HER - Hindsight Experience Replay)",
      "**Universal value function:** V(s, g) — state + goal parameterized"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Generalist agents (Gato) can play games, control robots, and chat — multi-task across modalities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "134",
   "q": "What is in-context learning as meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** LLMs perform meta-learning via in-context examples (no weight updates)."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Prompt: \"cat → chat, dog → chien, house → ?\"\nLLM output: \"maison\"\n\nThe LLM \"learned\" English→French translation from 2 examples in context."
    },
    {
     "t": "p",
     "text": "**Explanation:** Transformer attention mechanism can implement gradient descent-like updates internally. In-context learning is implicit meta-learning — the model learned to learn from examples during pre-training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "135",
   "q": "What is the challenge of catastrophic forgetting in continual meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Meta-learner must adapt to new task distributions without forgetting how to adapt to old ones."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Phase 1: Meta-train on image tasks → good at adapting to image tasks\nPhase 2: Meta-train on text tasks → good at text but forgets how to adapt to images"
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Replay meta-episodes from old task distributions",
      "Regularize meta-parameters toward old values",
      "Progressive expansion of meta-learner"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Double level of forgetting: model forgets tasks AND forgets how to learn tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "136",
   "q": "What is learning to optimize (L2O)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use meta-learning to learn an optimization algorithm itself."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Instead of: SGD, Adam (hand-designed)\nL2O: Neural network that outputs parameter updates\n\nLSTM optimizer:\nInput: gradients, past updates\nOutput: parameter update Δθ\n\nMeta-train: Learn optimizer across many optimization problems\nMeta-test: Apply learned optimizer to new optimization problem"
    },
    {
     "t": "p",
     "text": "**Explanation:** Learned optimizers can outperform hand-designed ones for specific problem classes. But hard to generalize to very different problems."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "137",
   "q": "What is label propagation for few-shot learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Build graph connecting query and support examples\n2. Edge weights based on feature similarity\n3. Propagate labels from support (known) to query (unknown)\n\nAlgorithm:\n1. Compute similarity matrix W between all examples\n2. Normalize: S = D^(-1/2) W D^(-1/2)\n3. Propagate: Y_query = (I - αS)^(-1) × Y_support"
    },
    {
     "t": "p",
     "text": "**Explanation:** Transductive few-shot learning — uses query set structure for better classification. Works well combined with learned embeddings from meta-training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "138",
   "q": "What is task distillation in MTL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Instead of sharing a backbone, distill knowledge between task-specific models."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Step 1: Train separate models for each task\nStep 2: Use each model as teacher for others\n   Task A teacher → helps Task B student (cross-task distillation)\n   Task B teacher → helps Task A student"
    },
    {
     "t": "p",
     "text": "**Explanation:** Avoids negative transfer from shared parameters. Each model benefits from other tasks' knowledge without parameter interference. More expensive but often better when tasks conflict."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "139",
   "q": "What is the role of hyperparameter meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn optimal hyperparameters across tasks rather than tuning per task."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Meta-SGD:** Learn per-parameter learning rates",
      "**Meta-dropout:** Learn optimal dropout rates",
      "**BOHB:** Bayesian optimization + HyperBand for meta-hyperparameter search",
      "**AutoML-Zero:** Evolve entire learning algorithms"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** If you've tuned hyperparameters for 100 similar tasks, you should have learned something about good hyperparameters for the 101st task."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "140",
   "q": "What is the difference between task-specific and task-shared losses?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Task-specific loss: Each task has its own loss function\n   L_cls = CrossEntropy, L_reg = MSE, L_seg = Dice\n\nTask-shared loss: Additional loss that encourages interaction\n   L_consistency: Predictions from different tasks should be consistent\n   Example: Depth edges should align with segmentation boundaries\n   \nTotal: L = Σ L_task_i + λ × L_consistency"
    },
    {
     "t": "p",
     "text": "**Explanation:** Consistency losses encode domain knowledge about task relationships. Depth discontinuities occur at object boundaries — enforcing this improves both tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "141",
   "q": "What is Neural Architecture Search for MTL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Automatically find the optimal sharing structure."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Search space:\n- Which layers to share\n- Which tasks to group\n- Where to branch off task-specific paths\n- Whether to use cross-task connections\n\nMethods:\n1. NDDR-CNN: Learn soft sharing between all layer pairs\n2. AutoMTL: Search for branching architecture\n3. MTL-NAS: Use differentiable NAS for task routing"
    },
    {
     "t": "p",
     "text": "**Explanation:** Manual architecture design for MTL is suboptimal. NAS can find sharing patterns humans wouldn't consider."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "142",
   "q": "What is the difference between inner and outer optimization in meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Outer optimization (meta-level):\n   Objective: Good performance AFTER adaptation\n   Updates: Meta-parameters θ\n   Data: Many tasks\n   Optimizer: Adam (typically)\n\nInner optimization (task-level):\n   Objective: Adapt to specific task\n   Updates: Task-specific parameters θ'\n   Data: Support set of one task\n   Optimizer: SGD (few steps)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Bilevel optimization. Outer loop learns θ that makes inner loop effective. The inner loop tests θ on each task. The outer loop improves θ based on inner loop results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "143",
   "q": "What is multi-task learning for autonomous driving?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Single backbone (shared perception):\n├── Object Detection (cars, pedestrians, cyclists)\n├── Lane Detection (lane lines, road boundaries)\n├── Semantic Segmentation (road, sidewalk, buildings)\n├── Depth Estimation (distance to objects)\n├── Traffic Sign Recognition\n└── Free Space Detection\n\nAll tasks from single camera input in one forward pass."
    },
    {
     "t": "p",
     "text": "**Explanation:** MTL is essential for autonomous driving — multiple perception tasks share visual features. Single model is more efficient than N separate models for real-time processing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "144",
   "q": "What is task interpolation in meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Create new tasks by interpolating between existing task specifications."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Task 1: Classify animals\nTask 2: Classify vehicles\n\nInterpolated task: Classify \"animal-like vehicles\" or mixed categories\nUsing feature-space interpolation of task embeddings."
    },
    {
     "t": "p",
     "text": "**Explanation:** Expands task distribution for meta-training. Similar to Mixup but at task level. Helps meta-learner generalize to broader task space."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "145",
   "q": "What is the difference between transductive and inductive few-shot learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Inductive:** Classify each query example independently",
      "— Standard: embed, compare to prototypes",
      "**Transductive:** Use all query examples together",
      "— Leverage structure among query examples",
      "— Label propagation, clustering on query set"
     ]
    },
    {
     "t": "p",
     "text": "**Transductive advantage:** Uses unlabeled test data distribution. Can refine prototypes using query statistics."
    },
    {
     "t": "p",
     "text": "**Explanation:** Transductive is more powerful but requires batch of queries at once. Inductive works for single query."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "146",
   "q": "What is the role of episodic memory in continual learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Episodic memory stores representative examples from past tasks:\n\nNew task arrives:\n1. Train on new task data + replay from memory\n2. Select important examples to store (coreset selection)\n3. Update memory buffer\n\nSelection strategies:\n- Random sampling from each task\n- Reservoir sampling (equal probability)\n- Gradient-based (examples with most influence)\n- k-center (maximize coverage)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Memory-based methods are simple and effective. Trade-off: memory budget vs forgetting. Even small memory (50 examples/class) significantly reduces forgetting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "147",
   "q": "What is multi-task self-supervised pre-training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Pre-train with multiple self-supervised objectives:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Objectives for vision:\n1. Contrastive learning (SimCLR, MoCo)\n2. Masked image modeling (MAE)\n3. Rotation prediction\n4. Jigsaw puzzle solving\n5. Colorization\n\nCombined pre-training learns more robust features than any single objective."
    },
    {
     "t": "p",
     "text": "**Explanation:** Different self-supervised tasks capture different aspects: contrastive captures semantic similarity, masked prediction captures local structure, rotation captures global shape."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "148",
   "q": "What is the evaluation protocol for few-shot learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard protocol:\n1. Split classes: base (training) / novel (testing)\n2. Pre-train on base classes (optional)\n3. Meta-train: sample N-way K-shot episodes from base classes\n4. Meta-test: sample episodes from NOVEL classes\n\nReport: Mean accuracy ± 95% confidence interval over 600+ episodes\n\nCommon benchmarks:\n- miniImageNet: 5-way 1-shot (~50%), 5-way 5-shot (~70%)\n- tieredImageNet: Larger, more diverse\n- CUB-200: Fine-grained bird classification"
    },
    {
     "t": "p",
     "text": "**Explanation:** Base and novel classes must not overlap. Confidence interval is essential — high variance across episodes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "149",
   "q": "What is task-aware dynamic architecture?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Architecture changes based on the task at hand."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input → Router (predicts task) → Select path through network\n   Path A: Conv3×3 → Conv3×3 → FC (for texture tasks)\n   Path B: Conv5×5 → Conv7×7 → FC (for shape tasks)\n   Path C: Dilated Conv → FC (for global context tasks)\n\nDyNet: TaskRouter selects which modules to activate"
    },
    {
     "t": "p",
     "text": "**Explanation:** Different tasks require different computational paths. Dynamic routing avoids negative transfer while maintaining single model. Similar to Mixture of Experts."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "150",
   "q": "What are the current frontiers in multi-task and meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Foundation models as meta-learners:** GPT-4, CLIP perform in-context learning",
      "**Automated MTL architecture design:** NAS for optimal sharing patterns",
      "**Continual meta-learning:** Adapt to evolving task distributions",
      "**Efficient meta-learning:** Reduce computational cost of bilevel optimization",
      "**Large-scale MTL:** Hundreds of tasks simultaneously (Google's multi-task models)",
      "**Cross-modal MTL:** Share knowledge across vision, language, audio",
      "**Theory:** Understanding when/why MTL and meta-learning work"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** The line between MTL, meta-learning, and foundation models is blurring. Large pre-trained models are implicit multi-task meta-learners."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

/* ============================================================================
   PRACTICE P7.1 — Transfer, Self-Supervised and Meta-Learning · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/06_Transfer_SelfSupervised_MetaLearning.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p7.1",
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
   "n": "1",
   "q": "What is transfer learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Leveraging knowledge from one task/domain to improve performance on another:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Source task: Large dataset, general domain (ImageNet, Wikipedia)\nTarget task: Smaller dataset, specific domain (medical images, legal text)\nTransfer: Pre-trained features → adapt to target"
    },
    {
     "t": "p",
     "text": "**Explanation:** Low-level features (edges, textures, basic syntax) are universal. High-level features are task-specific. Transfer saves training time and data requirements."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What are the three transfer learning strategies?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Feature extraction:** Freeze pre-trained model, train only new classification head",
      "**Fine-tuning:** Unfreeze some/all layers, train with lower learning rate",
      "**Domain adaptation:** Align source and target distributions without target labels"
     ]
    },
    {
     "t": "p",
     "text": "**When to use each:**"
    },
    {
     "t": "ul",
     "items": [
      "Feature extraction: very small target data, similar domains",
      "Fine-tuning: moderate target data, related domains",
      "Domain adaptation: no target labels available"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "How do you decide which layers to freeze during fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Strategy: Start from the end, progressively unfreeze\nPhase 1: Freeze all, train classification head only\nPhase 2: Unfreeze last block, train with low LR\nPhase 3: Unfreeze more blocks as needed"
    },
    {
     "t": "p",
     "text": "**Rule of thumb:**"
    },
    {
     "t": "ul",
     "items": [
      "Similar domain → freeze more (features transfer well)",
      "Different domain → freeze less (need to adapt features)",
      "Small data → freeze more (prevent overfitting)",
      "Large data → freeze less (can learn domain-specific features)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is discriminative fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use different learning rates for different layers:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "optimizer = torch.optim.Adam([\n    {'params': model.layer1.parameters(), 'lr': 1e-5},   # Early layers: low LR\n    {'params': model.layer2.parameters(), 'lr': 3e-5},\n    {'params': model.layer3.parameters(), 'lr': 1e-4},\n    {'params': model.classifier.parameters(), 'lr': 3e-4},  # New layers: high LR\n])"
    },
    {
     "t": "p",
     "text": "**Explanation:** Early layers have good general features → change slowly. Later layers need more adaptation → change faster. Introduced in ULMFiT for NLP."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is ULMFiT?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Universal Language Model Fine-tuning:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Pre-train LM on large corpus (WikiText)\n2. Fine-tune LM on task-specific corpus (target domain)\n3. Train classifier with discriminative fine-tuning + gradual unfreezing"
    },
    {
     "t": "p",
     "text": "**Innovations:** Discriminative fine-tuning, slanted triangular learning rates, gradual unfreezing."
    },
    {
     "t": "p",
     "text": "**Explanation:** First to demonstrate effective transfer learning for NLP (2018). Showed pre-training + fine-tuning works for text just as for images. Preceded BERT/GPT."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How does transfer learning differ between vision and NLP?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Vision",
      "NLP"
     ],
     "rows": [
      [
       "Pre-training",
       "ImageNet classification",
       "Language modeling (next token)"
      ],
      [
       "Model",
       "ResNet, ViT",
       "BERT, GPT"
      ],
      [
       "Transfer",
       "Feature maps",
       "Contextualized embeddings"
      ],
      [
       "Fine-tune",
       "Classification head",
       "Task head + some layers"
      ],
      [
       "Data efficiency",
       "100-1000s images",
       "100-1000s examples"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Same principle, different implementations. Vision transfers spatial features. NLP transfers linguistic knowledge. Both dramatically reduce target data requirements."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is domain shift and how does it affect transfer learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Difference in data distribution between source and target:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Types:\n1. Covariate shift: P(X) differs, P(Y|X) same\n2. Label shift: P(Y) differs\n3. Concept shift: P(Y|X) differs (meaning changes)"
    },
    {
     "t": "p",
     "text": "**Impact:** Greater domain shift → worse transfer. Medical X-rays → natural photos = large shift. Medical X-rays → CT scans = smaller shift."
    },
    {
     "t": "p",
     "text": "**Explanation:** Measure shift: compare feature distributions. If large: need more fine-tuning or domain adaptation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is negative transfer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When transfer learning HURTS performance (worse than training from scratch)."
    },
    {
     "t": "p",
     "text": "**Causes:**"
    },
    {
     "t": "ol",
     "items": [
      "Source and target domains too different",
      "Source model too specialized",
      "Destructive fine-tuning (overwrite useful features)"
     ]
    },
    {
     "t": "p",
     "text": "**Detection:** Compare fine-tuned model vs training from scratch."
    },
    {
     "t": "p",
     "text": "**Prevention:** Freeze layers gradually, monitor validation performance, use domain similarity metrics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is few-shot learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn new classes from very few examples (1-5):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "N-way K-shot: classify among N new classes, K examples each\nSupport set: {K examples per class}\nQuery set: {new example to classify}"
    },
    {
     "t": "p",
     "text": "**Methods:** Prototypical networks, MAML, matching networks, Siamese networks."
    },
    {
     "t": "p",
     "text": "**Explanation:** Humans recognize new objects from 1-2 examples. Few-shot learning mimics this. Meta-learning: \"learn to learn\" from many such tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is zero-shot learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Classify objects of classes never seen during training:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Training classes: cat, dog, horse\nTest class: zebra (never seen)\nBridge: class attributes or text descriptions\n\"zebra\" has attributes: striped, hooved, equine → relate to horse"
    },
    {
     "t": "p",
     "text": "**Modern approach:** CLIP — align image and text embeddings. Classify by text description."
    },
    {
     "t": "p",
     "text": "**Explanation:** Requires semantic relationship between known and unknown classes. CLIP enables zero-shot classification via language descriptions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learning to learn — optimize the learning algorithm itself:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Outer loop: optimize across many tasks\nInner loop: adapt to specific task with few examples\n\nMAML: learn initialization θ that adapts quickly\nθ' = θ - α∇L_task(θ)    (inner: adapt to task)\nθ = θ - β∇Σ L_task(θ')  (outer: optimize adaptation)"
    },
    {
     "t": "p",
     "text": "**Explanation:** After meta-training, model can adapt to new tasks with 1-5 gradient steps. Effective for few-shot classification, reinforcement learning, hyperparameter optimization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is Prototypical Networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Few-shot classification by computing class prototypes:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Embed support examples: eᵢ = f(xᵢ)\n2. Compute class prototype: cₖ = mean(embeddings of class k)\n3. Classify query: nearest prototype in embedding space"
    },
    {
     "t": "p",
     "text": "**Explanation:** Simple and effective. Learns metric space where same-class examples cluster. Distance-based classification. Works well for 1-shot and 5-shot settings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is Siamese network?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Twin networks sharing weights that learn similarity:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "embeddings_1 = network(input_1)\nembeddings_2 = network(input_2)\nsimilarity = distance(embeddings_1, embeddings_2)"
    },
    {
     "t": "p",
     "text": "**Training:** Contrastive loss: same class → close, different class → far."
    },
    {
     "t": "p",
     "text": "**Applications:** Face verification (same person?), signature verification, one-shot learning."
    },
    {
     "t": "p",
     "text": "**Explanation:** Learns embedding space where similar items are close. Weights shared between branches. Triplet loss: anchor, positive, negative."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is contrastive loss?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L = (1-y) × ½ D² + y × ½ max(0, margin - D)²"
    },
    {
     "t": "p",
     "text": "y=0: same class → minimize distance D y=1: different class → push apart (at least margin)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Learns embedding space where same-class examples are close, different-class examples are far. Foundation for many metric learning approaches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is triplet loss?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L = max(0, d(anchor, positive) - d(anchor, negative) + margin)"
    },
    {
     "t": "p",
     "text": "**Triplet:** (anchor, positive from same class, negative from different class)"
    },
    {
     "t": "p",
     "text": "**Goal:** Positive closer to anchor than negative by at least margin."
    },
    {
     "t": "p",
     "text": "**Hard mining:** Use hardest negatives (most similar to anchor from different class)."
    },
    {
     "t": "p",
     "text": "**Explanation:** More informative than contrastive loss (considers relative distances). Hard negative mining essential for good performance. Used in FaceNet."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the difference between inductive and transductive transfer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Inductive:** Learn model that generalizes to unseen data (standard ML)",
      "**Transductive:** Make predictions only for specific test data (can use test data structure)"
     ]
    },
    {
     "t": "p",
     "text": "**Few-shot:**"
    },
    {
     "t": "ul",
     "items": [
      "Inductive: train model → predict on any query",
      "Transductive: see all query examples → predict jointly (can use query-query relationships)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Transductive methods can be better (use test data structure) but less flexible (need all test data at once)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is LoRA and how does it enable efficient fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Original weight: W ∈ ℝ^(d×k)\nLoRA: W' = W + ΔW = W + B·A\nwhere B ∈ ℝ^(d×r), A ∈ ℝ^(r×k), r << min(d,k)"
    },
    {
     "t": "p",
     "text": "**Training:** Freeze W, only train A, B."
    },
    {
     "t": "p",
     "text": "**Parameters:** d×k → r×(d+k). For d=k=4096, r=8: 32M → 65K parameters."
    },
    {
     "t": "p",
     "text": "**Explanation:** Low-rank update captures task-specific adjustments. Merge W+BA at deployment (no latency cost). Multiple LoRA adapters for different tasks on same base model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is QLoRA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combine quantization with LoRA:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Quantize base model to 4-bit (NF4 data type)\n2. Add LoRA adapters (small, FP16)\n3. Train only LoRA adapters\n4. Gradients computed in FP16, weights stored in 4-bit"
    },
    {
     "t": "p",
     "text": "**Benefit:** Fine-tune 65B model on single 48GB GPU (normally needs ~130GB)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Paged optimizers handle memory spikes. 4-bit NormalFloat (NF4) is information-theoretically optimal for normally distributed weights. Quality matches full fine-tuning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is adapter tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Insert small trainable modules (adapters) between frozen pre-trained layers:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Frozen Layer → Adapter (small MLP: down-project → nonlinearity → up-project) → Next Layer"
    },
    {
     "t": "p",
     "text": "**Parameters:** ~0.5-2% of original model."
    },
    {
     "t": "p",
     "text": "**Explanation:** Similar to LoRA but applies to full hidden state, not just attention weights. Can have task-specific adapters loaded on demand. AdapterHub: library of adapters for BERT."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is prompt tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn continuous prompt embeddings prepended to input:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: model(\"Classify: I love this movie\")\nPrompt tuning: model([p1, p2, ..., pk, \"I love this movie\"])\nwhere p1...pk are learned continuous vectors"
    },
    {
     "t": "p",
     "text": "**Freeze model, only train k prompt vectors.** Parameters: k × d_model."
    },
    {
     "t": "p",
     "text": "**Explanation:** At scale (>10B params), prompt tuning matches fine-tuning performance. Much smaller (task-specific just k vectors vs full model). Different prompts for different tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is the difference between hard and soft prompts?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Hard prompts:** Discrete text tokens designed manually or via search (\"Classify the sentiment:\")",
      "**Soft prompts:** Continuous vectors learned through backpropagation (not real words)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Hard prompts: interpretable, no training. Soft prompts: optimized, not human-readable. Soft prompts are more effective but require training data. Hard prompts work in zero-shot."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is self-supervised pre-training for vision?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Contrastive: SimCLR, MoCo — different augmentations of same image → similar embeddings\nDINO/DINOv2: self-distillation — student matches teacher (EMA of student)\nMAE: mask patches → reconstruct masked patches\nBEiT: predict visual tokens of masked patches"
    },
    {
     "t": "p",
     "text": "**Explanation:** No labels needed! Learn from data structure. Self-supervised ViT (DINOv2) matches/beats supervised ImageNet pre-training for transfer. Data-efficient and scalable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is SimCLR?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Contrastive learning framework:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Two random augmentations of same image → positive pair\n2. All other images in batch → negative pairs\n3. Encoder → projection head → contrastive loss (NT-Xent)"
    },
    {
     "t": "p",
     "text": "**Key ingredients:** Strong augmentations, large batch size, projection head (discard after pre-training)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Learns representations by pulling positive pairs close and pushing negatives apart. Requires large batches (4096+). MoCo avoids this with momentum encoder and memory bank."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is knowledge distillation for fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use larger teacher model to guide fine-tuning of smaller student:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L = α × L_task(student, labels) + (1-α) × L_distill(student, teacher)"
    },
    {
     "t": "p",
     "text": "**During fine-tuning:** Teacher provides soft labels/features. Student learns from both labels and teacher's knowledge."
    },
    {
     "t": "p",
     "text": "**Explanation:** Teacher may be fine-tuned on same task. Student gets both task labels and teacher's rich knowledge. Better than training student alone."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "How do you evaluate transfer learning effectiveness?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Linear probing:** Freeze encoder, train linear classifier on top. Measures feature quality.",
      "**Fine-tuning accuracy:** Full fine-tuning on target. Measures overall transferability.",
      "**Sample efficiency:** Performance vs number of target examples (learning curves).",
      "**Comparison:** vs training from scratch on same target data."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Good pre-training shows: higher accuracy with fewer target samples, faster convergence, better linear probe results."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

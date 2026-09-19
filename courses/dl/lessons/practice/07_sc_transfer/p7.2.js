/* ============================================================================
   PRACTICE P7.2 — Transfer, Self-Supervised and Meta-Learning · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/06_Transfer_SelfSupervised_MetaLearning.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p7.2",
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
   "n": "26",
   "q": "What is cross-domain transfer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Transfer between significantly different domains:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Close: ImageNet → CUB-200 (natural images → bird images)\nFar: ImageNet → X-ray images\nVery far: NLP → Vision (cross-modal)"
    },
    {
     "t": "p",
     "text": "**Challenges:** Feature distributions differ significantly. Low-level features may not transfer."
    },
    {
     "t": "p",
     "text": "**Solutions:** Progressive fine-tuning (first close domain, then target), domain-specific architectures."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is the lottery ticket hypothesis for transfer learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Pre-trained models contain sparse sub-networks that transfer particularly well:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Pre-train large model\n2. Identify important weights (lottery tickets)\n3. These sparse networks transfer better than dense models"
    },
    {
     "t": "p",
     "text": "**Explanation:** Sparse winning tickets from pre-training are also good initializations for target tasks. Suggests common structure across tasks captured by specific weight paths."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is multi-task pre-training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Pre-train on multiple tasks simultaneously:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "T5 approach: train on many NLP tasks formatted as text-to-text\nVision: train on classification + detection + segmentation jointly"
    },
    {
     "t": "p",
     "text": "**Benefit:** More robust representations. Model learns task-general features."
    },
    {
     "t": "p",
     "text": "**Explanation:** Multi-task pre-training > single-task pre-training for transfer. ExT5, mT5 extended this to many tasks and languages. But task balancing is important."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is catastrophic forgetting in fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Model loses pre-trained knowledge when fine-tuned on new task:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Before fine-tuning: good at general tasks\nAfter fine-tuning: good at specific task, bad at general tasks"
    },
    {
     "t": "p",
     "text": "**Prevention:**"
    },
    {
     "t": "ol",
     "items": [
      "Low learning rate for pre-trained layers",
      "L2 regularization toward pre-trained weights",
      "EWC (Elastic Weight Consolidation)",
      "Replay: mix pre-training data with fine-tuning data"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Fine-tuning overwrites pre-trained features. Critical when model needs to maintain multiple capabilities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is progressive fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fine-tune in stages, gradually adapting to target domain:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Stage 1: Pre-trained model → fine-tune on intermediate domain\nStage 2: Intermediate model → fine-tune on target domain\nExample: ImageNet → Medical general → Radiology specific"
    },
    {
     "t": "p",
     "text": "**Explanation:** Bridging large domain gaps with intermediate steps. Each step is a smaller domain shift. More stable than direct transfer across large gaps."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is the difference between pre-trained and foundation models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Pre-trained model:** Trained on specific task (ImageNet classification). Good starting point for transfer.",
      "**Foundation model:** Trained on broad data. Capable of many tasks without task-specific training. GPT-4, Claude, CLIP, SAM."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Foundation models are a paradigm shift: one model → many tasks. Pre-trained models still need task-specific fine-tuning. Foundation models can work zero-shot."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is PEFT (Parameter-Efficient Fine-Tuning)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Umbrella term for methods that fine-tune with minimal parameters:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Methods:\n1. LoRA: low-rank weight updates\n2. Adapters: small modules between layers\n3. Prefix tuning: learnable prefix for attention\n4. Prompt tuning: learnable input embeddings\n5. BitFit: tune only bias terms\n6. IA3: learned scaling vectors"
    },
    {
     "t": "p",
     "text": "**Explanation:** Full fine-tuning: 100% parameters. PEFT: 0.01-2% parameters. Essential for large models (7B+ params). Store small adapters instead of full model copies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is the optimal strategy for fine-tuning with limited data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Start with largest available pre-trained model\n2. Freeze entire model, train classification head (linear probing)\n3. If insufficient: unfreeze last layer, fine-tune with low LR\n4. Gradually unfreeze more layers\n5. Use heavy data augmentation\n6. Apply dropout and weight decay\n7. Use early stopping"
    },
    {
     "t": "p",
     "text": "**Explanation:** With 10 labeled examples: feature extraction. With 100: fine-tune last layers. With 1000: fine-tune more layers. With 10000+: fine-tune everything."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is model soups for transfer learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Average weights of multiple fine-tuned models:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model_soup = average_weights([model_1, model_2, ..., model_k])\n# Where each model is fine-tuned with different hyperparameters"
    },
    {
     "t": "p",
     "text": "**Benefit:** Better accuracy and robustness than any single model. No extra inference cost."
    },
    {
     "t": "p",
     "text": "**Explanation:** Different hyperparameter configurations converge to different solutions. Averaging in weight space produces better solutions than any individual. Greedy soup: only add models that improve validation performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is the role of learning rate warmup in fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Steps 1-500: LR linearly increases from 0 to target_lr\nSteps 500+: LR follows decay schedule (cosine, linear)"
    },
    {
     "t": "p",
     "text": "**Why:** Pre-trained weights are good. Large initial gradients from random classification head can damage them. Warmup allows adaptation before large updates."
    },
    {
     "t": "p",
     "text": "**Explanation:** Especially important when: using Adam (adaptive momentum needs time), large batch sizes, training from pre-trained weights."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is data-efficient transfer learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Maximize performance with minimal target data:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Techniques:\n1. Strong pre-training (larger pre-trained model)\n2. Aggressive data augmentation (RandAugment, AutoAugment)\n3. Mixup / CutMix\n4. PEFT methods (prevent overfitting with few params)\n5. Semi-supervised learning (use unlabeled target data)\n6. Self-training (pseudo-labels)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Combine all techniques for best results. Pre-training quality is the biggest single factor."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is cross-lingual transfer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Transfer model from one language to another:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Train on English (abundant data) → apply to Hindi (limited data)\nMultilingual models: mBERT, XLM-R trained on 100+ languages"
    },
    {
     "t": "p",
     "text": "**Why it works:** Languages share syntactic/semantic structures. Multilingual models learn language-universal representations."
    },
    {
     "t": "p",
     "text": "**Explanation:** XLM-R: competitive on low-resource languages despite never seeing task-specific data. Cross-lingual zero-shot: train on English task data → evaluate on other languages."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is test-time training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Continue adapting model for each test example:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "For each test sample:\n1. Self-supervised update on test sample (e.g., rotation prediction)\n2. Make prediction with updated model\n3. Reset or continue"
    },
    {
     "t": "p",
     "text": "**Explanation:** Adapts to test distribution in real-time. Helps with distribution shift. Not always stable — can degrade on in-distribution data. TPT (Test-Time Prompt Tuning) does this for CLIP."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is BitFit?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fine-tune ONLY bias terms (freeze all other parameters):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Trainable: bias terms in all layers\nFrozen: weight matrices, layer norms, embeddings\nParameters: ~0.1% of total"
    },
    {
     "t": "p",
     "text": "**Result:** Surprisingly competitive with full fine-tuning, especially on smaller datasets."
    },
    {
     "t": "p",
     "text": "**Explanation:** Bias terms are a tiny fraction but significantly affect feature selection. Biases shift activation distributions → change which features are emphasized."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the difference between fine-tuning and in-context learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Fine-tuning:** Update model weights on task data. Permanent change.",
      "**In-context learning (ICL):** Provide examples in the prompt. No weight updates."
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "ICL: \"Positive: I love this → positive. Negative: terrible → negative. \nClassify: amazing movie →\""
    },
    {
     "t": "p",
     "text": "**Explanation:** ICL only works with large models (>few billion params). ICL is more flexible (no training) but less reliable. Fine-tuning is more expensive but more consistent."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is probing in transfer learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Analyze what pre-trained models learn by training simple classifiers on frozen representations:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Layer 1 features → linear probe → can predict POS tags?\nLayer 6 features → linear probe → can predict syntax?\nLayer 12 features → linear probe → can predict semantics?"
    },
    {
     "t": "p",
     "text": "**Explanation:** Lower layers: surface features (word identity, POS). Middle: syntactic structure. Upper: semantic meaning. Probing reveals what each layer encodes without changing the model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the difference between pre-training data and fine-tuning data quality requirements?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Pre-training:** Massive scale (TB of text/millions of images). Noise tolerated. Diversity important.",
      "**Fine-tuning:** Small (100-10K examples). Quality critical. Noise hurts significantly."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Pre-training averages out noise at scale. Fine-tuning has fewer samples → each sample matters more. Label noise in fine-tuning data directly degrades performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is the impact of model size on transfer learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Larger pre-trained models:\n1. Transfer better to downstream tasks\n2. Need fewer fine-tuning examples\n3. In-context learning emerges (>1B params)\n4. Few-shot abilities improve with scale"
    },
    {
     "t": "p",
     "text": "**But:** Diminishing returns. 10× bigger ≠ 10× better transfer."
    },
    {
     "t": "p",
     "text": "**Explanation:** Scaling laws apply to transfer: compute-optimal pre-training transfers best. But deployment cost of large models is high. PEFT methods mitigate this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is CLIP-guided fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use CLIP's text-image alignment for zero-shot or fine-tuned classification:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Zero-shot: Compare image embedding with text embeddings of class names\nFine-tuning: Linear probe on CLIP features with labeled data"
    },
    {
     "t": "p",
     "text": "**CoOp:** Learn continuous prompt vectors for CLIP (domain-specific)."
    },
    {
     "t": "p",
     "text": "**Explanation:** CLIP provides excellent visual features. Fine-tuning CLIP for specific domains (medical, satellite) dramatically improves accuracy while maintaining fluent language understanding."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is model merging?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combine multiple fine-tuned models without additional training:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Methods:\n1. Weight averaging: avg(model_1_weights, model_2_weights)\n2. Task arithmetic: base + (task_A - base) + (task_B - base)\n3. TIES merging: handle sign conflicts in task vectors\n4. DARE: randomly drop deltas, rescale"
    },
    {
     "t": "p",
     "text": "**Explanation:** Create multi-task model by merging task-specific fine-tuned models. No extra training. Task arithmetic adds/subtracts task capabilities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is continual pre-training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Continue pre-training on domain-specific data before fine-tuning:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "General LM → continue pre-training on medical texts → fine-tune on medical QA"
    },
    {
     "t": "p",
     "text": "**Benefit:** Adapts vocabulary and representations to target domain."
    },
    {
     "t": "p",
     "text": "**Example:** BiomedCLIP (continue CLIP on biomedical data), CodeLLaMA (continue LLaMA on code)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Bridges domain gap between general pre-training and specific fine-tuning. Use the target domain's unlabeled data for continued pre-training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "When does fine-tuning fail?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Insufficient fine-tuning data:** Overfits quickly",
      "**Too high learning rate:** Destroys pre-trained features",
      "**Task mismatch:** Pre-trained on very different task",
      "**Distribution mismatch:** Target domain too different",
      "**Label noise:** Amplified with small data"
     ]
    },
    {
     "t": "p",
     "text": "**Debug:** Compare with linear probing (if linear probe works but fine-tuning doesn't → optimization issue)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is the difference between full fine-tuning and head-only training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Head-only:** Freeze backbone, train only classification head. Fast. Risk: backbone features may not align.",
      "**Full fine-tuning:** Update all parameters. Slow. Risk: overfitting, catastrophic forgetting."
     ]
    },
    {
     "t": "p",
     "text": "**Middle ground:** Fine-tune last N layers. LoRA for parameter-efficient full-model adaptation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Head-only: minutes. Full fine-tuning: hours/days. Performance gap narrows with better pre-training (DINOv2, CLIP)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is the role of batch size in fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Small batch (8-16):** More gradient noise → better generalization. Less memory.",
      "**Large batch (64-256):** Smoother gradients → faster convergence. More memory."
     ]
    },
    {
     "t": "p",
     "text": "**For fine-tuning:** Small batch sizes often work better (regularization effect)."
    },
    {
     "t": "p",
     "text": "**Practical:** Use gradient accumulation if small batch fits in memory but you want large effective batch."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is the current best practice for transfer learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Choose largest pre-trained model that fits your deployment budget\n2. Start with linear probing to evaluate features\n3. If needed, fine-tune with LoRA/QLoRA (parameter-efficient)\n4. Use learning rate warmup + cosine decay\n5. Apply data augmentation aggressively\n6. Monitor for catastrophic forgetting\n7. Evaluate on held-out test set, not validation set used for tuning\n8. Consider model merging if you need multiple capabilities"
    },
    {
     "t": "p",
     "text": "**Explanation:** The field has converged on PEFT methods for most fine-tuning. Full fine-tuning only when you have significant data and compute. Foundation models + prompt engineering for quick experiments."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

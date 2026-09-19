/* ============================================================================
   PRACTICE P7.4 — Transfer, Self-Supervised and Meta-Learning · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/06_Transfer_SelfSupervised_MetaLearning.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p7.4",
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
   "n": "76",
   "q": "How does self-supervised learning scale?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "More data → better representations (log-linear improvement)\nLarger models → better representations\nMore compute → better representations\n\nScaling behaviors:\n- GPT: loss follows power law with compute, data, parameters\n- Vision: similar scaling patterns with MAE, DINO\n- Key: self-supervised methods scale better than supervised (no label bottleneck)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Supervised learning is bottlenecked by labels. Self-supervised uses ALL data. Internet-scale data enables foundation models. This is why GPT-4, Claude, LLaMA are all self-supervised pretrained."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is the linear probing evaluation protocol?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Pretrain encoder (self-supervised)\n2. Freeze encoder weights\n3. Train ONLY a linear classifier on top\n4. Evaluate classification accuracy"
    },
    {
     "t": "p",
     "text": "**Why:** Tests quality of learned representations. If a linear layer can classify well → encoder learned meaningful features."
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard evaluation for self-supervised methods. If representation is good, linear probe should work well. Full fine-tuning usually performs better but doesn't evaluate representation quality alone."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is negative sampling and its challenges?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "For each positive pair, need negative examples:\n- SimCLR: other images in batch (need large batch: 4096-8192)\n- MoCo: queue of recent representations (65536 negatives)\nChallenge: false negatives — randomly sampled \"negative\" may actually be same class"
    },
    {
     "t": "p",
     "text": "**False negative problem:** Two dog images treated as negative → pushes apart representations that should be similar."
    },
    {
     "t": "p",
     "text": "**Solutions:** Use large batches (reduces false negative impact), hard negative mining, supervised contrastive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is the difference between representation learning and feature engineering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Feature engineering:** Human designs features (SIFT, HOG, TF-IDF)",
      "**Representation learning:** Model learns features automatically"
     ]
    },
    {
     "t": "p",
     "text": "**Self-supervised:** Best of both worlds — learns features from data structure without labels."
    },
    {
     "t": "p",
     "text": "**Explanation:** Feature engineering requires domain expertise, doesn't scale. Representation learning scales with data and compute. Self-supervised representations often outperform hand-crafted features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is CPC (Contrastive Predictive Coding)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn representations by predicting future context:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Encode: x_t → z_t for each timestep\n2. Context: c_t = summarize z_1, ..., z_t (autoregressive)\n3. Predict: future z_{t+k} from c_t\n4. Contrastive: distinguish true future from random negatives"
    },
    {
     "t": "p",
     "text": "**Works for:** Audio, text, images, video, RL states."
    },
    {
     "t": "p",
     "text": "**Explanation:** Early influential self-supervised method. Idea: if model can predict future representations, it has learned meaningful abstractions. Inspired many subsequent methods."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is the relationship between self-supervised learning and transfer learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Self-supervised pretraining → transfer to downstream tasks\n\nStep 1: Pretrain on large unlabeled dataset (ImageNet, internet text)\nStep 2: Fine-tune on small labeled dataset (medical images, legal text)"
    },
    {
     "t": "p",
     "text": "**Self-supervised models transfer better than supervised because they learn more general features.**"
    },
    {
     "t": "p",
     "text": "**Explanation:** Supervised pretraining learns task-specific features. Self-supervised learns general-purpose representations. Wider applicability. BERT, GPT, CLIP all demonstrate superior transfer."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is DINOv2?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Improved self-supervised vision model:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Improvements over DINO:\n1. Curated training data pipeline (automatic dataset curation)\n2. iBOT-style masked image modeling combined with DINO distillation\n3. Larger models (ViT-G, 1B parameters)\n4. Better data augmentation\n5. KoLeo regularization for uniform embedding space"
    },
    {
     "t": "p",
     "text": "**Result:** General-purpose visual features. Works out-of-the-box for: depth estimation, segmentation, classification, retrieval."
    },
    {
     "t": "p",
     "text": "**Explanation:** Best open-source self-supervised vision model. No fine-tuning needed for many tasks. Competes with CLIP without text supervision."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is the role of projection heads in contrastive learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder → representation h → Projection head → z\nContrastive loss applied to z\nDownstream tasks use h (discard projection head)\n\nProjection head: MLP with 2-3 layers"
    },
    {
     "t": "p",
     "text": "**Why discard?** h retains more information than z. Projection head removes information not useful for contrastive task but useful for downstream."
    },
    {
     "t": "p",
     "text": "**Explanation:** Discovered by SimCLR. Task-specific information (augmentation invariances) is removed in z. h keeps everything. 10-15% improvement from using projection head."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "How does self-supervised learning handle domain-specific data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Domain-specific SSL:\n1. Medical imaging: mask patches of X-rays/CTs\n2. Satellite imagery: temporal contrastive (same location, different times)\n3. Molecular: mask atoms/bonds in molecule graphs\n4. Code: masked token prediction, contrastive over function pairs"
    },
    {
     "t": "p",
     "text": "**Explanation:** Same principles apply. Design pretext task meaningful for domain. Medical: learn anatomy from structure. Satellite: temporal changes indicate land use. Domain-specific augmentations are critical."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is knowledge distillation vs self-supervised distillation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Knowledge distillation: teacher is SUPERVISED model → student learns from teacher\nSelf-supervised distillation: teacher is EMA of student → no labels"
    },
    {
     "t": "p",
     "text": "**Self-supervised distillation (DINO):** Student and teacher are same architecture. Teacher = exponential moving average of student. No external supervision."
    },
    {
     "t": "p",
     "text": "**Explanation:** Knowledge distillation requires a good supervised teacher. Self-supervised distillation bootstraps from itself. DINO shows this can produce excellent representations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is the relationship between self-supervised learning and foundation models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Self-supervised learning ENABLES foundation models:\n- GPT-4: next token prediction on internet text\n- CLIP: image-text contrastive on internet data\n- DALL-E: image generation from text descriptions\n- LLaMA: next token prediction\n- SAM: prompted segmentation, pretrained self-supervised"
    },
    {
     "t": "p",
     "text": "**Explanation:** Foundation model = large model pretrained on broad data, adapted to many tasks. Self-supervised learning is how you pretrain without labels. Without SSL, we'd need billions of labels. Foundation models wouldn't exist."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is masked feature prediction vs masked pixel prediction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Pixel prediction (MAE): predict raw RGB values\n    L = ||x_masked - x̂_masked||²\nFeature prediction (I-JEPA, data2vec): predict latent representations\n    L = ||f(x_masked) - f̂(x_masked)||²"
    },
    {
     "t": "p",
     "text": "**Feature prediction advantages:** Captures semantics, ignores low-level noise. More sample efficient."
    },
    {
     "t": "p",
     "text": "**Pixel prediction advantages:** Simpler. Good for generation. Works well at scale."
    },
    {
     "t": "p",
     "text": "**Explanation:** Debate ongoing. Both work well. Feature prediction may be more principled (predict meaning, not appearance)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "How do you evaluate self-supervised representations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard evaluations:\n1. Linear probing: freeze encoder, train linear classifier\n2. Fine-tuning: update all weights on downstream task\n3. k-NN evaluation: use k-nearest neighbors in embedding space\n4. Transfer learning: evaluate on diverse downstream datasets\n5. Semi-supervised: fine-tune with limited labels (1%, 10%)\n6. Zero-shot: CLIP-style zero-shot classification"
    },
    {
     "t": "p",
     "text": "**Explanation:** Multiple evaluations needed because each measures different aspects. Linear probe: representation quality. k-NN: embedding structure. Transfer: generalization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is SwAV (Swapping Assignments between Views)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Online clustering approach:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Two augmented views of same image\n2. Compute cluster assignments for each view\n3. Predict cluster assignment of one view from other view\n4. Sinkhorn-Knopp normalization prevents collapse (equipartition constraint)"
    },
    {
     "t": "p",
     "text": "**No negative pairs.** Optimal transport ensures balanced cluster usage."
    },
    {
     "t": "p",
     "text": "**Explanation:** Combines contrastive and clustering. Sinkhorn constraint: each cluster used equally often (prevents all samples mapping to one cluster). Multi-crop: use small crops too (cheaper, more views)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the pretraining-finetuning paradigm?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Stage 1: Pretraining (self-supervised, large data, expensive)\n    BERT: 16 TPUs × 4 days\n    GPT-3: millions of dollars\nStage 2: Fine-tuning (supervised, small data, cheap)\n    Task-specific: hours on single GPU"
    },
    {
     "t": "p",
     "text": "**Why it works:** Pretraining learns general features. Fine-tuning adapts to specific task. Transfer of learned representations."
    },
    {
     "t": "p",
     "text": "**Explanation:** Dominant paradigm in modern AI. Pretrain once → fine-tune many times for different tasks. Amortizes compute cost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What are emergent properties of self-supervised models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Properties not explicitly trained but emerge:\n1. DINO attention → unsupervised object segmentation\n2. GPT → in-context learning, chain-of-thought reasoning\n3. CLIP → zero-shot classification, image-text retrieval\n4. Large models → few-shot learning capability"
    },
    {
     "t": "p",
     "text": "**Explanation:** Simple training objective + scale → complex capabilities. Masked prediction → understanding. Contrastive alignment → zero-shot transfer. Not fully understood why emergence happens."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is the role of batch normalization in self-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Problem: BN can cause information leakage in multi-view methods\n- BN statistics computed across batch\n- Different views of same image share BN stats\n- Model can solve pretext task using BN stats (shortcut)\n\nSolution: \n- Shuffle BN (MoCo): shuffle samples across GPUs before BN\n- Replace with LayerNorm or GroupNorm\n- Use separate BN for each view"
    },
    {
     "t": "p",
     "text": "**Explanation:** BN leakage is a subtle but important issue. Can make self-supervised training appear to work while actually learning shortcuts. Modern methods largely use LayerNorm (especially ViTs)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is the next token prediction objective and why is it so effective?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "P(x_t | x_1, ..., x_{t-1})\n\nWhy it works so well:\n1. Forces learning: syntax, semantics, facts, reasoning\n2. Compresses knowledge: predicting next word requires understanding context\n3. Scalable: any text corpus, no labels needed\n4. Universal: captures all of language structure\n5. Compute-efficient: every token provides a training signal"
    },
    {
     "t": "p",
     "text": "**Explanation:** Simple objective, incredible results. To predict next word accurately, model must understand: grammar, world knowledge, logical reasoning, style, intent. Compression = understanding."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is VQ-VAE and its role in self-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Vector Quantized VAE: learn discrete codebook for data\n1. Encoder: x → z_e (continuous)\n2. Quantize: z_q = nearest codebook vector\n3. Decoder: z_q → x̂\n\nCodebook provides discrete visual \"tokens\"\nUsed in: BEiT (visual tokenizer), DALL-E (image tokens for generation)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Bridges continuous and discrete representations. Discrete tokens enable: BERT-style masked prediction for images, autoregressive generation. Foundation for visual tokenizers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is the difference between autoregressive and masked language modeling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Autoregressive (GPT):    P(x_t | x_<t)     left-to-right only\nMasked LM (BERT):        P(x_mask | x_\\mask) bidirectional context\n\nAutoregressive: better for generation\nMasked LM: better for understanding/encoding"
    },
    {
     "t": "p",
     "text": "**XLNet:** Combines both — permutation language modeling."
    },
    {
     "t": "p",
     "text": "**Explanation:** Autoregressive naturally generates text. Masked LM sees full context but can't generate naturally. T5: text-to-text, encoder-decoder unifying both. Modern trend: autoregressive dominates (GPT-4, LLaMA)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "How does ELECTRA differ from BERT?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "BERT: mask tokens → predict original\nELECTRA: \n1. Small generator: fills in masked tokens\n2. Discriminator: for EACH token, predict if original or replaced"
    },
    {
     "t": "p",
     "text": "**ELECTRA advantage:** Every token position gets a training signal (not just 15% masked)."
    },
    {
     "t": "p",
     "text": "**Explanation:** More compute-efficient than BERT. Same performance with less compute. Discriminator sees all tokens. Better sample efficiency. Good for resource-constrained settings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is self-supervised learning for video?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Video-specific pretext tasks:\n1. Frame order prediction (shuffle frames → predict order)\n2. Temporal contrastive (same video clip = positive pair)\n3. Speed prediction (1x vs 2x vs 4x playback)\n4. Future frame prediction\n5. Video-audio correspondence (does audio match video?)\n6. Masked video modeling (mask space-time tubes)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Video provides temporal structure as free supervision. Motion, causality, object permanence — all available without labels. Video pretraining → action recognition, tracking."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is the information bottleneck in self-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Good representation: retains task-relevant information, discards noise\nI(X; Z) should be small (compression) but I(Y; Z) should be large (prediction)\n\nSelf-supervised learning naturally creates information bottleneck:\n- Masking forces learning important features (can't memorize everything)\n- Contrastive loss retains shared information between views\n- Augmentation invariance removes irrelevant details"
    },
    {
     "t": "p",
     "text": "**Explanation:** Theoretical framework explaining why SSL works. Learning to predict despite limited information forces extracting meaningful features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the SimMIM method?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Simple masked image modeling:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Random masking with large patches (32×32)\n2. Linear prediction head (not complex decoder like MAE)\n3. L1 loss on raw pixel values\n4. Works with various architectures (ViT, Swin)"
    },
    {
     "t": "p",
     "text": "**Simpler than MAE:** No asymmetric encoder-decoder. Direct prediction from masked image."
    },
    {
     "t": "p",
     "text": "**Explanation:** Shows that masked image modeling can be extremely simple and still work well. Challenges the need for complex decoder architecture."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "What is the future of self-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Trends:\n1. Unification: single SSL method for all modalities (data2vec direction)\n2. Joint-embedding predictive: predict in latent space (I-JEPA, V-JEPA)\n3. Scaling: larger models, more data → emergent capabilities\n4. Efficiency: better sample/compute efficiency\n5. Multi-modal: integrate more modalities (text, image, audio, video)\n6. World models: SSL for learning physics/causality\n7. Active learning: agents that self-supervise through interaction"
    },
    {
     "t": "p",
     "text": "**Explanation:** SSL is THE dominant learning paradigm. Future: unified architectures learning world models from multi-modal sensory data. Moving from pattern matching to understanding."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

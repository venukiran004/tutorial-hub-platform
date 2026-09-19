/* ============================================================================
   PRACTICE P7.3 — Transfer, Self-Supervised and Meta-Learning · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/06_Transfer_SelfSupervised_MetaLearning.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p7.3",
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
   "n": "51",
   "q": "What is self-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn representations from unlabeled data by creating supervised tasks from the data itself:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: unlabeled data\nPretext task: predict part of data from other parts\nLearned: useful representations for downstream tasks"
    },
    {
     "t": "p",
     "text": "**Explanation:** Labels are expensive. Self-supervised learning eliminates labeling need. Foundation of: BERT (NLP), SimCLR (vision), wav2vec (audio). Now dominant paradigm for foundation models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What are contrastive learning methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn by contrasting similar (positive) and dissimilar (negative) pairs:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Core idea:\n- Positive pair: two views of same image (different augmentations)\n- Negative pairs: views from different images\n- Loss: pull positives together, push negatives apart\n\nInfoNCE loss:\nL = -log[exp(sim(z_i, z_j)/τ) / Σ_k exp(sim(z_i, z_k)/τ)]"
    },
    {
     "t": "p",
     "text": "**Explanation:** SimCLR, MoCo, CLIP use contrastive learning. Quality depends on: augmentations, number of negatives, temperature τ."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is SimCLR?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Simple framework for contrastive representation learning:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Take image x\n2. Create two augmented views: x_i, x_j\n3. Encode both: h_i = f(x_i), h_j = f(x_j)\n4. Project: z_i = g(h_i), z_j = g(h_j)\n5. Contrastive loss on (z_i, z_j)\n6. Discard projection head g, use encoder f for downstream"
    },
    {
     "t": "p",
     "text": "**Key findings:** Stronger augmentations help. Large batch size matters (more negatives). Projection head improves representation quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is MoCo (Momentum Contrast)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Contrastive learning with momentum-updated encoder:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Query encoder: f_q(x) — updated by gradient descent\nKey encoder: f_k(x) — momentum update: θ_k ← m×θ_k + (1-m)×θ_q\n\nQueue of keys: stores recent key representations (large negative set)"
    },
    {
     "t": "p",
     "text": "**Advantage over SimCLR:** Doesn't need enormous batch sizes. Queue provides large negative set efficiently."
    },
    {
     "t": "p",
     "text": "**Explanation:** Momentum update keeps key encoder consistent, preventing sudden representation changes. m=0.999 typical."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What is BYOL (Bootstrap Your Own Latent)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Self-supervised learning WITHOUT negative pairs:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Online network: encoder → projector → predictor → q\nTarget network: encoder → projector → z  (momentum updated)\nLoss: ||q - z||²  (predict target from online)"
    },
    {
     "t": "p",
     "text": "**Key insight:** No negatives needed. Momentum target prevents collapse."
    },
    {
     "t": "p",
     "text": "**Explanation:** Challenged assumption that negatives are essential. Simpler than contrastive methods. Performance comparable to SimCLR/MoCo. The predictor head + momentum combination prevents trivial (collapsed) solutions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is DINO (Self-Distillation with No Labels)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Self-supervised vision transformer training:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Student network: sees local crops (small patches)\nTeacher network: sees global crops (large patches) — momentum updated\nLoss: cross-entropy between student and teacher outputs"
    },
    {
     "t": "p",
     "text": "**Key results:** Learns semantic segmentation without labels. Attention maps highlight objects. Strong k-NN classifier without fine-tuning."
    },
    {
     "t": "p",
     "text": "**Explanation:** Local-to-global correspondence learning. Student must infer global context from local patches. Foundation for DINOv2 (strong general-purpose vision features)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is masked image modeling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** BERT-style pretraining for images:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Divide image into patches\n2. Randomly mask ~75% of patches\n3. Predict masked patches from visible ones"
    },
    {
     "t": "p",
     "text": "**MAE (Masked Autoencoder):**"
    },
    {
     "t": "ul",
     "items": [
      "Encoder: only processes visible patches (efficient)",
      "Decoder: reconstructs masked patches"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unlike contrastive methods, no negatives or augmentation engineering needed. Very scalable. High masking ratio forces learning meaningful representations (can't copy from nearby patches)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is BEiT?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** BERT pre-training for image transformers:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Tokenize image patches using discrete VAE (dVAE)\n2. Mask random patches\n3. Predict visual tokens (discrete labels) for masked patches"
    },
    {
     "t": "p",
     "text": "**Difference from MAE:** Predicts discrete tokens (like BERT) vs. pixel values (like MAE)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Visual tokenizer converts continuous patches to discrete codes. Predicting tokens may be easier/better than predicting raw pixels. BEiT v2 improves with better visual tokenizer."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is CLIP (Contrastive Language-Image Pre-training)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn joint vision-language representations:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Image encoder: f(image) → image_embedding\nText encoder: g(text) → text_embedding\nTraining: align matching image-text pairs, separate non-matching\n\nContrastive loss on N×N similarity matrix:\ncorrect pairs on diagonal, others are negatives"
    },
    {
     "t": "p",
     "text": "**Zero-shot classification:** Encode class names as text → compare image embedding to all class embeddings."
    },
    {
     "t": "p",
     "text": "**Explanation:** 400M image-text pairs from internet. Learns general visual concepts. Zero-shot transfer to many tasks without fine-tuning. Revolutionary for multimodal AI."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is the difference between generative and contrastive self-supervised methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "Generative (MAE, GPT)",
      "Contrastive (SimCLR, CLIP)"
     ],
     "rows": [
      [
       "Task",
       "Reconstruct/predict data",
       "Distinguish positive from negative"
      ],
      [
       "Need negatives",
       "No",
       "Yes (or tricks to avoid)"
      ],
      [
       "Output",
       "Data reconstruction",
       "Representation similarity"
      ],
      [
       "Augmentation",
       "Less critical",
       "Very important"
      ],
      [
       "Scaling",
       "Scales well",
       "Batch size matters"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Both effective. Generative: simpler, scales better. Contrastive: better for some downstream tasks, more augmentation-dependent."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What is VICReg?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Variance-Invariance-Covariance Regularization:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Three loss terms:\n1. Invariance: MSE between representations of augmented views\n2. Variance: prevent collapse — maintain variance across batch\n3. Covariance: decorrelate features — reduce redundancy"
    },
    {
     "t": "p",
     "text": "**No negatives needed.** Explicit regularization prevents collapse."
    },
    {
     "t": "p",
     "text": "**Explanation:** Explicit anti-collapse mechanism (variance term) instead of implicit (momentum, stop-gradient). Each term has clear interpretation. Competitive with BYOL, SimCLR."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is the pretext task concept?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Self-designed task to learn useful features without labels:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Image pretext tasks:\n- Jigsaw puzzle (predict patch arrangement)\n- Rotation prediction (0°, 90°, 180°, 270°)\n- Colorization (predict color from grayscale)\n- Inpainting (fill masked regions)\n\nText pretext tasks:\n- Masked language modeling (BERT)\n- Next sentence prediction\n- Next token prediction (GPT)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Good pretext task forces learning semantically meaningful features. Modern approach: masked modeling or contrastive (found to be best pretext tasks)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is the collapse problem in self-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Network maps all inputs to same representation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Trivial solution: f(x) = constant for all x\n→ Loss is zero (all representations identical)\n→ Representation is useless"
    },
    {
     "t": "p",
     "text": "**Prevention methods:**"
    },
    {
     "t": "ol",
     "items": [
      "Negative pairs (contrastive learning)",
      "Momentum encoder (BYOL, DINO)",
      "Variance regularization (VICReg)",
      "Asymmetric architecture (predictor head)",
      "Stop-gradient on one branch"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Without prevention, self-supervised learning finds trivial constant mapping. All methods are essentially different ways to prevent this collapse."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "How does GPT-style pretraining work as self-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Predict next token from previous context:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: \"The cat sat on the\"\nTarget: \"mat\"\nLoss: cross-entropy over vocabulary\n\nP(xₜ | x₁, x₂, ..., x_{t-1}) — autoregressive"
    },
    {
     "t": "p",
     "text": "**Explanation:** Purely self-supervised — data is its own label. Scales with data and compute (scaling laws). Learns: grammar, facts, reasoning, code. Foundation of GPT-1/2/3/4, LLaMA, etc. No labeled data needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is BERT-style masked language modeling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Input: \"The [MASK] sat on the mat\"\n2. Predict masked word: \"cat\"\n3. Masking strategy:\n   - 80%: replace with [MASK]\n   - 10%: replace with random word\n   - 10%: keep original\n4. Mask 15% of tokens"
    },
    {
     "t": "p",
     "text": "**Explanation:** Bidirectional (sees context from both sides), unlike GPT (left-to-right only). Better for understanding tasks. Worse for generation. The 80/10/10 strategy prevents model from ignoring [MASK] tokens at fine-tuning (since [MASK] doesn't appear then)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is wav2vec 2.0?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Self-supervised speech representation learning:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Feature encoder: raw audio → latent representations\n2. Quantization: discretize representations into codes\n3. Masking: mask parts of latent sequence\n4. Contrastive task: identify correct quantized code for masked positions"
    },
    {
     "t": "p",
     "text": "**Result:** Learn speech representations from unlabeled audio → fine-tune with small labeled data for ASR."
    },
    {
     "t": "p",
     "text": "**Explanation:** Same masked prediction idea applied to audio. Dramatically reduces labeled data need for speech recognition. 10 min labeled data → competitive ASR."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is data2vec?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Unified self-supervised framework for text, speech, and vision:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Teacher (EMA): encode full input → get target representations\nStudent: encode masked input → predict teacher representations\nLoss: MSE between student output and teacher targets\n\nSame framework works for:\n- Text (mask tokens)\n- Speech (mask audio frames)  \n- Vision (mask patches)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Predicts latent representations (not discrete tokens or pixels). Modality-agnostic framework. EMA teacher provides stable targets. Shows self-supervised learning unified across modalities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is the role of augmentations in contrastive learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Strong augmentations → better representations\nWeak augmentations → poor representations\n\nCommon image augmentations (SimCLR):\n- Random resized crop (MOST important)\n- Color jitter (brightness, contrast, saturation, hue)\n- Gaussian blur\n- Random horizontal flip\n- Color dropping (grayscale)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Augmentations define what the model should be invariant to. Random crop: spatial invariance. Color jitter: color invariance. If augmentation is too weak, model learns shortcut features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is the difference between self-supervised and semi-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Self-supervised:** ALL data is unlabeled. Create labels from data itself.",
      "**Semi-supervised:** Mix of labeled + unlabeled data. Use unlabeled to improve labeled performance."
     ]
    },
    {
     "t": "p",
     "text": "**Pipeline:** Often combined: self-supervised pretraining → semi-supervised fine-tuning."
    },
    {
     "t": "p",
     "text": "**Explanation:** Self-supervised: BERT/GPT pretraining. Semi-supervised: pseudo-labeling, consistency regularization. In practice: pretrain self-supervised on massive unlabeled data → fine-tune with few labels = best results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is SimSiam?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Simple Siamese network without negatives, momentum, or large batches:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Two augmented views → shared encoder → projector\nOne branch has predictor head (asymmetry)\nStop-gradient on one branch (prevents collapse)\nLoss: cosine similarity between branches"
    },
    {
     "t": "p",
     "text": "**Key insight:** Stop-gradient alone prevents collapse. No momentum encoder needed."
    },
    {
     "t": "p",
     "text": "**Explanation:** Simplest self-supervised method. Shows that negative pairs, momentum encoder, and large batches are NOT necessary. Stop-gradient creates an implicit moving average."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is Barlow Twins?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reduce redundancy between embedding dimensions:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Cross-correlation matrix C between embeddings of two views:\nC_ij = correlation between dimension i and j\n\nLoss: make C close to identity matrix\n- Diagonal = 1 (invariance: same input → same feature)\n- Off-diagonal = 0 (reduce redundancy between features)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Inspired by neuroscience (Barlow's redundancy reduction). No negatives needed. Each feature captures unique information. Simple and effective."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "How does self-supervised learning benefit few-shot learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Without pretraining: need 1000s of labels\nWith self-supervised pretraining: need ~10-100 labels for same performance\n\nPipeline:\n1. Pretrain on millions of unlabeled images (self-supervised)\n2. Fine-tune on 10-100 labeled examples\n→ Strong performance despite few labels"
    },
    {
     "t": "p",
     "text": "**Explanation:** Self-supervised learning captures general features (edges, textures, objects). These transfer to downstream tasks. Like human perception — learn visual understanding from experience, then quickly learn new concepts."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is teacher-student framework in self-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Teacher: provides target representations (EMA updated or frozen)\nStudent: learns to match teacher representations for masked/augmented inputs\n\nTeacher update: θ_T ← m×θ_T + (1-m)×θ_S  (momentum)\nStudent update: θ_S ← θ_S - lr×∇L  (gradient descent)"
    },
    {
     "t": "p",
     "text": "**Used in:** BYOL, DINO, data2vec, EMA-based methods."
    },
    {
     "t": "p",
     "text": "**Explanation:** Teacher provides stable targets. Student tries to match. Asymmetry between teacher and student is key to preventing collapse. Teacher is typically \"better\" than student due to averaging."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is I-JEPA (Image-based Joint-Embedding Predictive Architecture)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Predict abstract representations of image regions:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Mask large portion of image\n2. Context encoder: process visible patches\n3. Predictor: predict REPRESENTATIONS of masked patches (not pixels)\n4. Target encoder: (EMA) provides target representations"
    },
    {
     "t": "p",
     "text": "**Key difference from MAE:** Predicts in representation space (abstract), not pixel space."
    },
    {
     "t": "p",
     "text": "**Explanation:** Pixel prediction wastes capacity on low-level details. Representation prediction focuses on semantic content. More sample-efficient. Yann LeCun's preferred approach."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is multimodal self-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn from multiple modalities without labels:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Vision-Language: CLIP (align images and text)\nAudio-Visual: AV-HuBERT (match audio and visual speech)\nVideo-Text: VideoCLIP (align videos and descriptions)"
    },
    {
     "t": "p",
     "text": "**Correspondence as supervision:** Naturally co-occurring modalities provide free supervision."
    },
    {
     "t": "p",
     "text": "**Explanation:** An image and its caption are naturally paired (positive). Different image-caption = negative. This alignment signal replaces human labels. Enables zero-shot transfer."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

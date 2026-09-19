/* ============================================================================
   PRACTICE P9.4 — NLP and Neural Networks · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/09_NLP_and_Neural_Networks.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p9.4",
 "lede": "**25 scenarios** from NLP and Neural Networks. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "What is mixed precision training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use FP16 (half precision) for forward/backward pass and FP32 for weight updates. 2× memory savings, faster compute."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "scaler = torch.cuda.amp.GradScaler()\nwith torch.cuda.amp.autocast():\n    output = model(input)\n    loss = criterion(output, target)\nscaler.scale(loss).backward()\nscaler.step(optimizer)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Modern GPUs have dedicated FP16 hardware (Tensor Cores). Loss scaling prevents underflow. Minimal accuracy impact."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is knowledge distillation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Training a small \"student\" model to mimic a large \"teacher\" model's outputs (soft labels/ logits)."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Student loss = α × CrossEntropy(student, true_labels) + \n               (1-α) × KL_Divergence(student_logits/T, teacher_logits/T)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Teacher's soft probabilities contain richer information than hard labels (dark knowledge). DistilBERT: 40% smaller, 60% faster, 97% of BERT's performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is the difference between epoch, iteration, and batch?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Epoch:** One complete pass through entire training dataset",
      "**Batch (mini-batch):** Subset of data processed together (e.g., 32 samples)",
      "**Iteration:** One batch forward + backward pass"
     ]
    },
    {
     "t": "p",
     "text": "**Example:** 1000 samples, batch=100 → 10 iterations per epoch."
    },
    {
     "t": "p",
     "text": "**Explanation:** Typically train 10-100+ epochs. Monitor validation metrics per epoch. Too many epochs → overfitting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is weight decay and how does it differ from L2 regularization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Both penalize large weights but differ in implementation with adaptive optimizers:"
    },
    {
     "t": "ul",
     "items": [
      "**L2 regularization:** Adds λ||w||² to loss (gradient: 2λw added to gradient)",
      "**Weight decay:** Directly shrinks weights: w = w - lr×decay×w (independent of gradient)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** With SGD: equivalent. With Adam: L2 regularization is incorrect because adaptive lr scales the penalty. AdamW implements proper weight decay."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is a learning rate warmup?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Start with very low learning rate, gradually increase to target lr over first few hundred/thousand steps."
    },
    {
     "t": "p",
     "text": "**Explanation:** Prevents early instability when moving statistics (Adam) are inaccurate. Common: linear warmup for 5-10% of training. Then decay (cosine, linear). Essential for Transformers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is the difference between online learning and batch learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Batch:** Train on entire dataset at once, retrain periodically",
      "**Online:** Update model with each new data point, continuous learning"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Online: adaptable, handles drift, memory-efficient. Batch: more stable, thorough optimization. SGD enables online learning naturally. Production: mini-batch + periodic retraining."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is the effect of batch size on training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Small batch (16-32):** Noisy gradients → regularization effect, better generalization, slower",
      "**Large batch (256-4096):** Smoother gradients → faster computation, may generalize worse"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Large batch: need learning rate scaling (linear scaling rule). Large batch may converge to sharp minima (poor generalization). Small batch finds flatter minima."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What are embeddings in neural networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learnable dense vector representations for discrete entities (words, categories, users, items)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "embedding = nn.Embedding(num_categories=1000, embedding_dim=64)\n# Input: category index → Output: 64-dim vector"
    },
    {
     "t": "p",
     "text": "**Explanation:** Replace one-hot encoding (sparse, high-dim) with dense, low-dim learned representations. Captures similarity — similar entities have similar embeddings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is the attention mechanism intuitively?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Weighted sum of values, where weights are determined by compatibility between query and keys."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Attention(Q, K, V) = softmax(QK^T / √d_k) V"
    },
    {
     "t": "p",
     "text": "**Intuition:** \"Given what I'm looking for (Q), how relevant is each piece of information (K)? Weight the content (V) accordingly.\""
    },
    {
     "t": "p",
     "text": "**Explanation:** Self-attention: Q, K, V all come from same input. Cross-attention: Q from one source, K/V from another. Multi-head: multiple attention patterns in parallel."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is the difference between self-attention and cross-attention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Self-attention:** Q, K, V from same sequence — each token attends to all other tokens in same sequence",
      "**Cross-attention:** Q from one sequence, K/V from another — decoder attends to encoder outputs"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Self-attention in BERT: each word relates to all other words. Cross-attention in translation: output word attends to input words."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is layer normalization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Normalizes across features for each sample (not across batch like batch norm)."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "LN(x) = γ × (x - μ_features) / σ_features + β"
    },
    {
     "t": "p",
     "text": "**Explanation:** Batch norm depends on batch statistics → problematic for small batches and RNNs/Transformers. Layer norm: independent of batch → used in Transformers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the difference between parametric and non-parametric models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Parametric:** Fixed number of parameters regardless of data size (linear regression, neural nets)",
      "**Non-parametric:** Parameters grow with data (KNN, kernel SVM, decision trees)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Parametric: compact model, may underfit complex data. Non-parametric: flexible, may overfit, memory grows with data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is curriculum learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train on easy examples first, gradually introduce harder examples. Mimics human learning curriculum."
    },
    {
     "t": "p",
     "text": "**Explanation:** Can improve convergence speed and final performance. Difficulty can be: loss value, prediction confidence, data complexity. Self-paced learning: model selects its own curriculum."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is the lottery ticket hypothesis?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Dense neural networks contain sparse subnetworks (\"winning tickets\") that can achieve comparable performance when trained in isolation from the same initialization."
    },
    {
     "t": "p",
     "text": "**Explanation:** Implication: most parameters are unnecessary. Pruning can find these winning tickets. Challenges: finding tickets is expensive (train, prune, rewind, retrain)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is model pruning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Removing unnecessary weights/neurons/layers to create smaller, faster models."
    },
    {
     "t": "p",
     "text": "**Types:**"
    },
    {
     "t": "ol",
     "items": [
      "**Unstructured:** Remove individual weights (sparse matrices)",
      "**Structured:** Remove entire neurons/channels/heads (actual speedup)",
      "**Magnitude pruning:** Remove smallest weights"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** 90%+ pruning often possible with minimal accuracy loss. Combine with fine-tuning after pruning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is quantization for model deployment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reducing numerical precision of weights/activations: FP32 → INT8 or even INT4."
    },
    {
     "t": "p",
     "text": "**Benefits:** 2-4× memory reduction, 2-4× faster inference, minimal accuracy loss."
    },
    {
     "t": "p",
     "text": "**Explanation:** Post-training quantization: quantize after training. Quantization-aware training: simulate quantization during training (better quality). ONNX, TensorRT support quantization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is the difference between generative and discriminative models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Discriminative:** Learn P(y|x) — decision boundary (Logistic Regression, SVM, Neural Nets for classification)",
      "**Generative:** Learn P(x,y) or P(x) — data distribution (Naive Bayes, GMM, GANs, VAEs)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Discriminative: directly model classification boundary. Generative: model how data is generated, can also classify via Bayes' rule."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is the label smoothing technique?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Replace hard labels [0, 1] with soft labels [ε/K, 1 - ε + ε/K] where ε is typically 0.1 and K is the number of classes."
    },
    {
     "t": "p",
     "text": "**Explanation:** Prevents model from being overconfident. Regularization effect. The model can't achieve zero loss → reduces overfitting. Standard in modern image classification and NLP."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is gradient accumulation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Accumulate gradients over multiple mini-batches before updating weights. Simulates larger batch size with limited GPU memory."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "optimizer.zero_grad()\nfor i, (x, y) in enumerate(dataloader):\n    loss = model(x, y) / accumulation_steps\n    loss.backward()\n    if (i + 1) % accumulation_steps == 0:\n        optimizer.step()\n        optimizer.zero_grad()"
    },
    {
     "t": "p",
     "text": "**Explanation:** 4 batches of 32 with accumulation = effective batch size 128. Essential when model is too large for large batches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is the difference between parameters and FLOPs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Parameters:** Number of learnable weights (determines model size on disk/memory)",
      "**FLOPs:** Floating-point operations per inference (determines compute cost/speed)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** More parameters ≠ more FLOPs. Attention is O(n²d) FLOPs but O(d²) parameters. MobileNet: fewer FLOPs than VGG but complex architecture."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is the multi-task learning approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Training one model on multiple related tasks simultaneously. Shared representation + task-specific heads."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "             → Task Head A (classification)\nShared Backbone\n             → Task Head B (regression)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Benefits: shared features, regularization effect, data efficiency. Works when tasks are related. Hard task can help easy task and vice versa."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is contrastive learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn representations by pulling similar samples together and pushing dissimilar samples apart in embedding space."
    },
    {
     "t": "p",
     "text": "**Loss:** contrastive_loss = -log(exp(sim(z_i, z_j)/τ) / Σ exp(sim(z_i, z_k)/τ))"
    },
    {
     "t": "p",
     "text": "**Explanation:** SimCLR, MoCo for images. CLIP for image-text. Creates data augmentations, treats augmented versions of same sample as positives, others as negatives."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is the teacher forcing technique?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** During training of sequence-to-sequence models, use ground truth previous token as input to decoder instead of model's own prediction."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without: errors accumulate (exposure bias). With: stable training but mismatch with inference (no ground truth available). Scheduled sampling: gradually shift from teacher forcing to model predictions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the Transformer encoder vs decoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Encoder:** Bidirectional self-attention, sees full input. Used for understanding (BERT).",
      "**Decoder:** Causal (masked) self-attention, sees only past tokens. Used for generation (GPT).",
      "**Encoder-Decoder:** Encoder processes input, decoder generates output with cross-attention (T5, BART)."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Encoder: classification, NER, semantic search. Decoder: text generation. Encoder-decoder: translation, summarization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "How do you debug a neural network that isn't learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Check basics:** Data loading correct? Labels right? Loss function appropriate?",
      "**Overfit one batch:** If it can't memorize 1 batch, architecture/code is wrong",
      "**Learning rate:** Try 1e-3 (default), or use lr finder",
      "**Gradients:** Check for vanishing/exploding (print gradient norms)",
      "**Data:** Visualize inputs and labels, check preprocessing",
      "**Simplify:** Start with simple model, gradually add complexity",
      "**Baseline:** Compare to known working implementation"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Most training failures are bugs in data loading, preprocessing, or loss computation — not architecture issues. Always overfit one batch first."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

/* ============================================================================
   PRACTICE P2.4 — Fundamentals and Optimisation · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/01_Fundamentals_and_Optimization.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p2.4",
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
   "n": "76",
   "q": "What is gradient accumulation and when is it useful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "for i, batch in enumerate(loader):\n    loss = model(batch) / accum_steps  # Scale loss\n    loss.backward()                     # Accumulate gradients\n    if (i + 1) % accum_steps == 0:\n        optimizer.step()                # Update weights\n        optimizer.zero_grad()           # Reset gradients"
    },
    {
     "t": "p",
     "text": "**When useful:** GPU memory too small for desired batch size. 4 accumulation steps × batch 8 = effective batch 32."
    },
    {
     "t": "p",
     "text": "**Explanation:** Mathematically equivalent to larger batch size (for most purposes). Slight difference due to batch norm (uses physical batch stats). Use gradient accumulation for stable mixed-precision training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is the poly learning rate schedule?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "lr = base_lr × (1 - iter/max_iter)^power"
    },
    {
     "t": "p",
     "text": "Typically power=0.9 or 0.99."
    },
    {
     "t": "p",
     "text": "**Usage:** Popular in semantic segmentation (DeepLab). Smooth polynomial decay."
    },
    {
     "t": "p",
     "text": "**Explanation:** Similar to cosine but different curve shape. Power controls decay speed. Higher power → slower initial decay, faster final decay."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is the one-cycle learning rate policy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Phase 1 (30%): LR increases from LR/25 to max_LR\nPhase 2 (70%): LR decreases from max_LR to LR/25\nMomentum: opposite direction (high→low→high)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Super-convergence — trains faster with higher accuracy. Found by Leslie Smith. Large LR in middle acts as regularizer. fastai implements this. Train for fewer epochs at higher LR."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is progressive resizing as regularization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Start training with small images, increase resolution during training:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Epoch 1-30: 128×128 (fast, coarse features)\nEpoch 31-60: 224×224 (finer features)\nEpoch 61-80: 384×384 (fine details)"
    },
    {
     "t": "p",
     "text": "**Regularization effect:** Different resolutions = different views of data. Low resolution → forces learning of coarse, generalizable features."
    },
    {
     "t": "p",
     "text": "**Explanation:** Also faster training (small images → fast computation). Act as data augmentation. Popular in EfficientNet, competition settings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is the difference between loss landscape flatness and generalization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Sharp minimum:** Small weight perturbation → large loss increase → poor generalization",
      "**Flat minimum:** Weight perturbation → small loss change → good generalization"
     ]
    },
    {
     "t": "p",
     "text": "**SAM optimizer:** Explicitly seeks flat minima."
    },
    {
     "t": "p",
     "text": "**SWA:** Weight averaging finds flat regions."
    },
    {
     "t": "p",
     "text": "**Explanation:** Flat minima are more robust to: distribution shift, weight quantization, noise. Sharp minima are overfit to specific training data patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is Layer-wise Learning Rate Decay (LLRD)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Apply geometrically decreasing learning rates from top to bottom layers:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "lr_layer = base_lr × decay^(num_layers - layer_idx)\n# Layer 12 (top): base_lr × 1.0\n# Layer 11: base_lr × 0.95\n# Layer 10: base_lr × 0.95²"
    },
    {
     "t": "p",
     "text": "**Explanation:** Early layers (general features) need less change. Later layers (task-specific) need more adaptation. Standard for fine-tuning BERT and similar models. Decay factor: 0.8-0.95."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is the effect of optimizer state when resuming training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Must save AND load optimizer state, not just model weights:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "checkpoint = {\n    'model': model.state_dict(),\n    'optimizer': optimizer.state_dict(),\n    'scheduler': scheduler.state_dict(),\n    'epoch': epoch,\n    'scaler': scaler.state_dict()  # for mixed precision\n}\ntorch.save(checkpoint, 'checkpoint.pt')"
    },
    {
     "t": "p",
     "text": "**Explanation:** Adam has momentum and variance buffers per parameter. Resetting these = sudden large step changes. Must also restore LR scheduler state."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is the Lookahead optimizer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Fast weights: updated by inner optimizer (SGD/Adam) for k steps\nSlow weights: updated as interpolation toward fast weights\nslow = slow + α × (fast - slow)      every k steps"
    },
    {
     "t": "p",
     "text": "**Explanation:** Fast weights explore, slow weights stabilize. Reduces variance of inner optimizer. Can wrap any optimizer. Typically k=5-10, α=0.5-0.8. Marginal improvement in most cases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is regularization through early stopping?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Stop training when validation performance stops improving:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "Early stopping = implicit regularization:\n- Beginning: model learns general patterns\n- Middle: model learns useful details\n- Late: model memorizes training noise → overfitting"
    },
    {
     "t": "p",
     "text": "**Easy to implement:** Monitor val loss, save best model, stop after patience epochs."
    },
    {
     "t": "p",
     "text": "**Explanation:** Equivalent to L2 regularization in some cases (Goodfellow et al.). No hyperparameter to tune (except patience). Always use it."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is the Noam learning rate schedule?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Used in original Transformer paper:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "lr = d_model^(-0.5) × min(step^(-0.5), step × warmup^(-1.5))"
    },
    {
     "t": "p",
     "text": "**Behavior:** Linear warmup → inverse square root decay."
    },
    {
     "t": "p",
     "text": "**Explanation:** Warmup: LR increases linearly for warmup_steps. Then decreases proportionally to 1/√step. No explicit max LR or decay steps. Still used in some transformer training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is the difference between implicit and explicit regularization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Explicit: intentionally added to prevent overfitting\n- L1/L2, dropout, weight decay, data augmentation\n\nImplicit: emerge naturally from training process\n- SGD noise, early stopping, batch norm (mild), architecture (skip connections)"
    },
    {
     "t": "p",
     "text": "**Explanation:** SGD's gradient noise is a powerful implicit regularizer. Larger learning rate = more noise = more regularization. This partly explains why SGD generalizes better than exact gradient descent."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is DropPath?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Randomly drop entire residual paths (not individual neurons):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "if training and random() < drop_path_rate:\n    return identity(x)  # skip entire block\nelse:\n    return x + block(x)  # normal residual"
    },
    {
     "t": "p",
     "text": "**Explanation:** Per-sample (each sample may skip different blocks). Regularizes deep transformers. Drop rate increases for deeper layers. Used in DeiT, Swin Transformer, ConvNeXt."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is knowledge distillation as regularization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Teacher's soft labels provide regularization signal:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "student_loss = α × CE(student, hard_labels) + (1-α) × KL(student, teacher_soft)"
    },
    {
     "t": "p",
     "text": "**Why regularization:** Teacher's soft labels encode inter-class relationships (dog is more similar to cat than car). This smooth target distribution prevents overconfident predictions."
    },
    {
     "t": "p",
     "text": "**Explanation:** Even when teacher and student are same-sized, distillation can improve student. Self-distillation: train model, then distill into copy of itself → often improves."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is the Ranger optimizer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combines RAdam (Rectified Adam) + Lookahead:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "RAdam: automatically adjusts adaptive learning rate variance\n+ Lookahead: slow-fast weight averaging\n= Ranger: more stable convergence"
    },
    {
     "t": "p",
     "text": "**Explanation:** RAdam provides warmup-free training by rectifying Adam's variance. Lookahead adds stability. Popular in Kaggle competitions. Less common in research (AdamW with warmup dominates)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "How does batch size affect generalization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Small batch (32-128): More gradient noise → explores more → wider minima → better generalization\nLarge batch (1024+): Less noise → converges faster → sharper minima → may generalize worse"
    },
    {
     "t": "p",
     "text": "**Fix large batch generalization:** Linear scaling rule, warmup, LARS/LAMB, SWA."
    },
    {
     "t": "p",
     "text": "**Explanation:** Sharp minimum debate is ongoing. Some work shows large batch can match small batch with proper tuning. But small batch is more forgiving of hyperparameter choices."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is gradient noise injection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Explicitly add noise to gradients during training:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "g_noisy = g + N(0, σ²/(1+t)^γ)"
    },
    {
     "t": "p",
     "text": "**Benefit:** Helps explore loss landscape. Can escape local minima. Acts as regularizer."
    },
    {
     "t": "p",
     "text": "**Explanation:** SGD already has natural gradient noise (from mini-batch sampling). Additional noise can help for deterministic-gradient methods. Used in certain RL and optimization settings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is the relationship between data augmentation and regularization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Data augmentation is the most effective regularizer for deep learning:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Without augmentation: model sees same images → memorizes\nWith augmentation: model sees different views → learns invariances"
    },
    {
     "t": "p",
     "text": "**Stronger augmentation = stronger regularization:** AutoAugment, RandAugment, TrivialAugment find optimal policies."
    },
    {
     "t": "p",
     "text": "**Explanation:** Unlike L2/dropout which reduce model capacity, augmentation increases effective data diversity. An entire 30-layer model can memorize 50K images but not millions of augmented versions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is the impact of initialization on optimization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Bad init → training fails (vanishing/exploding gradients)\nXavier/Glorot: Var(W) = 2/(fan_in + fan_out)  → for sigmoid/tanh\nHe/Kaiming: Var(W) = 2/fan_in                  → for ReLU\nFixUp: zero-initialize residual branches → deep training without normalization"
    },
    {
     "t": "p",
     "text": "**Explanation:** Initialization determines: starting point in loss landscape, initial gradient magnitudes, whether training can begin at all. Modern networks are less sensitive due to batch norm, skip connections."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is R-Drop and how is it different from standard dropout regularization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard dropout: just random masking (different outputs each forward pass)\nR-Drop: explicitly minimize difference between two forward passes\nLoss = CE_1 + CE_2 + α × KL(p_1 || p_2)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard dropout: inconsistency is a side effect. R-Drop: consistency is explicitly enforced. Forces model to be robust to dropout randomness. Extra forward pass but significant gains."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "How do you diagnose whether your model is underfitting or overfitting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Underfitting: train loss high AND val loss high\n→ More capacity, train longer, reduce regularization\n\nOverfitting: train loss low BUT val loss high\n→ More data, more regularization, simpler model\n\nGood fit: train loss low AND val loss low (gap is small)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Plot training AND validation curves together. Divergence = overfitting. Neither decreasing = underfitting. Use gap between them as guide for regularization strength."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is the Lookahead optimizer strategy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Algorithm:\n1. Copy current slow weights → fast weights\n2. Run inner optimizer (e.g., Adam) on fast weights for k steps\n3. Update slow weights: slow = slow + α(fast - slow)\n4. Reset fast weights = slow weights\n5. Repeat"
    },
    {
     "t": "p",
     "text": "**Explanation:** Slow weights provide stable reference. Fast weights explore. Interpolation keeps best of both. Like SWA but during training, not post-hoc. Reduces sensitivity to hyperparameters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is Automatic Mixed Precision (AMP)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "scaler = torch.cuda.amp.GradScaler()\nfor batch in loader:\n    with torch.cuda.amp.autocast():  # FP16 forward pass\n        output = model(batch)\n        loss = criterion(output)\n    scaler.scale(loss).backward()    # Scaled FP16 gradients\n    scaler.step(optimizer)           # Unscale + FP32 update\n    scaler.update()                  # Adjust scaling factor"
    },
    {
     "t": "p",
     "text": "**Explanation:** FP16 is faster and uses less memory. But FP16 has limited range → small gradients underflow. Loss scaling: multiply loss by large factor → gradients are representable in FP16. Unscale before weight update."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is the LION optimizer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Algorithm:\nupdate = sign(β₁ × m + (1-β₁) × g)    # Sign of momentum + gradient\nw = w - η × (update + λ × w)             # Weight decay\nm = β₂ × m + (1-β₂) × g                 # Update momentum"
    },
    {
     "t": "p",
     "text": "**Key:** Uses sign function → update magnitude is always 1. Much simpler than Adam."
    },
    {
     "t": "p",
     "text": "**Explanation:** Found by program search (AutoML for optimizers). Less memory than Adam (no second moment). Competitive or better, especially for vision transformers. Requires different hyperparameters than Adam."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the difference between deterministic and stochastic training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Deterministic: reproducible results\ntorch.manual_seed(42)\ntorch.backends.cudnn.deterministic = True\ntorch.backends.cudnn.benchmark = False\n\nStochastic: random elements (dropout, data shuffling, augmentation)"
    },
    {
     "t": "p",
     "text": "**Trade-off:** Deterministic is slower (can't use fastest CUDA algorithms). Useful for debugging. Research papers should report mean ± std over multiple seeds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "How do you combine multiple regularization techniques effectively?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Recommended stack:\n1. Data augmentation (always, primary regularizer)\n2. Weight decay (0.01-0.1 for AdamW)\n3. Dropout (0.1-0.5, higher for larger models)\n4. Label smoothing (0.1)\n5. Stochastic depth (for deep models)\n6. Early stopping (always)\n\nAvoid doubling up: if strong augmentation → reduce dropout\nMonitor: if reducing regularization improves training loss but hurts val → just right"
    },
    {
     "t": "p",
     "text": "**Explanation:** Regularizers interact. Too much → underfitting. Start with standard amounts, tune based on validation curves. Different regularizers address different aspects."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

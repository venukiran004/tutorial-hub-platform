/* ============================================================================
   PRACTICE P3.2 — CNNs and Computer Vision · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/02_CNNs_and_Computer_Vision.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.2",
 "lede": "**25 scenarios** from CNNs and Computer Vision. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "What is the channel attention mechanism in CNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learns to weight channels (features) by their importance:"
    },
    {
     "t": "p",
     "text": "**Squeeze-and-Excitation (SE) block:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Squeeze: global average pooling per channel\nz = global_avg_pool(x)          # [B, C, H, W] → [B, C]\n# Excitation: FC → ReLU → FC → Sigmoid\ns = sigmoid(fc2(relu(fc1(z))))  # [B, C]\n# Scale: channel-wise multiplication\nout = x * s.view(B, C, 1, 1)   # [B, C, H, W]"
    },
    {
     "t": "p",
     "text": "**Explanation:** Not all feature maps are equally important. SE blocks let the network learn to amplify useful channels and suppress less useful ones. Adds minimal computation overhead."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is the difference between object detection and image classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Classification:** \"What is in this image?\" → Single label",
      "**Detection:** \"What objects are where?\" → Multiple bounding boxes + labels"
     ]
    },
    {
     "t": "p",
     "text": "**Detection approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "Two-stage: Region proposal → classify (Faster R-CNN)",
      "One-stage: Single pass (YOLO, SSD, RetinaNet)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Detection is harder: multiple objects, varying scales, background vs foreground. Requires both classification (what) and regression (where) heads."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "How does YOLO work conceptually?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Divides image into S×S grid. Each cell predicts B bounding boxes and class probabilities:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Each cell predicts:\n- B bounding boxes (x, y, w, h, confidence)\n- C class probabilities\nTotal: S×S × (B×5 + C) predictions in one pass"
    },
    {
     "t": "p",
     "text": "**Explanation:** Single forward pass → very fast (real-time). Processes entire image at once (global context). Trade-off: may struggle with small objects or many objects in one cell. YOLOv8 is the current state-of-the-art version."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is anchor-based vs anchor-free object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Anchor-based (Faster R-CNN, YOLOv3):** Pre-defined reference boxes at various scales/ratios. Model predicts offsets from anchors.",
      "**Anchor-free (FCOS, CenterNet):** Directly predict object center and size. No need to tune anchors."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Anchor-free is simpler, fewer hyperparameters. Performance is now comparable. Anchor-based dominated earlier but anchor-free is gaining popularity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is Non-Maximum Suppression (NMS)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Post-processing to remove duplicate detections:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Sort detections by confidence score\n2. Take highest-confidence detection\n3. Remove all remaining detections with IoU > threshold (e.g., 0.5)\n4. Repeat until no detections left"
    },
    {
     "t": "p",
     "text": "**Explanation:** Object detectors produce many overlapping boxes for the same object. NMS keeps only the best one. Variants: Soft-NMS (reduce scores instead of removing), DIoU-NMS (distance-aware)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is Intersection over Union (IoU)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "IoU = Area of Overlap / Area of Union"
    },
    {
     "t": "p",
     "text": "**Values:** 0 (no overlap) to 1 (perfect match)"
    },
    {
     "t": "p",
     "text": "**Uses:** Evaluate detections (IoU > 0.5 = correct), NMS threshold, anchor matching."
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard metric for bounding box quality. AP@0.5 means detections with IoU > 0.5 are considered correct. COCO uses AP@0.5:0.95 (averaged over IoU thresholds)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is semantic segmentation vs instance segmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Semantic:** Classify every pixel (all cats get same label, no distinction between instances)",
      "**Instance:** Detect and segment each object separately (cat_1, cat_2 are distinct)",
      "**Panoptic:** Both — things (instances) + stuff (background classes)"
     ]
    },
    {
     "t": "p",
     "text": "**Models:** FCN, U-Net (semantic). Mask R-CNN (instance). Panoptic FPN (panoptic)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is the Dice loss and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Dice = 2|A ∩ B| / (|A| + |B|)\nDice Loss = 1 - Dice"
    },
    {
     "t": "p",
     "text": "**When used:** Medical image segmentation where classes are highly imbalanced (tumor vs background)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Unlike cross-entropy, Dice loss directly optimizes overlap. Less sensitive to class imbalance. Often combined: `Loss = CE + Dice` for stable training + overlap optimization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is the Focal Loss?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Modified cross-entropy that down-weights easy examples:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "FL(p) = -α(1-p)^γ × log(p)"
    },
    {
     "t": "p",
     "text": "When γ=0: standard cross-entropy. When γ=2 (typical): easy examples (p→1) contribute negligibly."
    },
    {
     "t": "p",
     "text": "**Explanation:** Addresses class imbalance in detection (vast majority of anchors are background). Developed for RetinaNet. Focuses training on hard, misclassified examples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is the difference between region-based and grid-based detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Region-based (R-CNN family):** First generate region proposals, then classify each",
      "**Grid-based (YOLO, SSD):** Divide image into grid, predict directly"
     ]
    },
    {
     "t": "p",
     "text": "**Trade-off:**"
    },
    {
     "t": "ul",
     "items": [
      "Region-based: More accurate, slower",
      "Grid-based: Faster, slightly less accurate"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Faster R-CNN: 5 FPS. YOLOv5: 140+ FPS. For real-time applications, grid-based is necessary. Modern architectures blur this distinction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "How does transfer learning work specifically for CNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Load pre-trained model\nmodel = torchvision.models.resnet50(pretrained=True)\n\n# Freeze early layers (general features)\nfor param in model.parameters():\n    param.requires_grad = False\n\n# Replace final classification layer\nmodel.fc = nn.Linear(2048, num_classes)\n\n# Optionally unfreeze later layers for fine-tuning\nfor param in model.layer4.parameters():\n    param.requires_grad = True"
    },
    {
     "t": "p",
     "text": "**Explanation:** Early layers (edges, textures) transfer universally. Later layers (domain-specific features) may need fine-tuning. Use lower learning rate for pre-trained layers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is style transfer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Apply artistic style of one image to the content of another:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss = α × content_loss + β × style_loss\ncontent_loss = MSE(features_generated, features_content)\nstyle_loss = MSE(gram_generated, gram_style)"
    },
    {
     "t": "p",
     "text": "**Gram matrix:** Captures correlations between feature maps (style information)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Content captured by feature map activations. Style captured by feature correlations (Gram matrix). Optimize input image to minimize both losses."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is image super-resolution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reconstruct high-resolution image from low-resolution input."
    },
    {
     "t": "p",
     "text": "**Architectures:**"
    },
    {
     "t": "ol",
     "items": [
      "**SRCNN:** Direct mapping low→high resolution",
      "**SRGAN:** Uses adversarial training for realistic textures",
      "**ESRGAN:** Enhanced SRGAN with better perceptual quality"
     ]
    },
    {
     "t": "p",
     "text": "**Losses:** Pixel loss (MSE) + perceptual loss (feature-based) + adversarial loss."
    },
    {
     "t": "p",
     "text": "**Explanation:** Pixel loss produces blurry results. Perceptual + adversarial loss produces sharp, realistic results. Trade-off: PSNR vs visual quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is the difference between causal and correlation in CNN feature interpretation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "CNN may learn background correlations: \"grass background → cow\"",
      "Grad-CAM shows which regions the model focuses on",
      "Doesn't prove the model understands the concept"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** CNNs are pattern matchers, not concept understanders. A model might correctly classify X-rays by learning hospital watermarks (shortcut learning). Always validate what features are actually used."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is Neural Architecture Search (NAS)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Automatically search for optimal neural network architecture:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Search space: {operations, connections, layers}\nSearch strategy: reinforcement learning, evolutionary, gradient-based (DARTS)\nPerformance estimation: train and evaluate each candidate"
    },
    {
     "t": "p",
     "text": "**Results:** NASNet, EfficientNet, AmoebaNet — architectures found by NAS outperform hand-designed ones."
    },
    {
     "t": "p",
     "text": "**Explanation:** Computationally expensive (1000s of GPU hours). Weight sharing (ENAS, DARTS) reduces cost dramatically. Found architectures have non-intuitive designs that work better than human-designed ones."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "How do you handle varying input sizes in CNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Resize:** Standardize all inputs (common, may lose aspect ratio)",
      "**Pad:** Add padding to match fixed size",
      "**Spatial Pyramid Pooling (SPP):** Pool at multiple scales to fixed output",
      "**Fully Convolutional:** Remove FC layers, use GAP",
      "**Adaptive pooling:** `nn.AdaptiveAvgPool2d((1,1))` — fixed output regardless of input"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Most architectures use fixed input (224×224, 416×416). Adaptive pooling or FCN design handles variable sizes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the difference between a 2D and 3D convolution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**2D Conv:** Filter slides over height × width. For images. Output: spatial feature map.",
      "**3D Conv:** Filter slides over height × width × depth/time. For video, volumetric data."
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "2D: kernel shape [C_in, C_out, kH, kW]\n3D: kernel shape [C_in, C_out, kD, kH, kW]"
    },
    {
     "t": "p",
     "text": "**Explanation:** 3D convolutions capture temporal patterns in video or spatial patterns in 3D volumes (CT scans). Much more computationally expensive. Alternative for video: 2D conv + temporal modeling (LSTM, attention)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is test-time augmentation (TTA)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** At inference, apply augmentations to input, predict on each, and average:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "predictions = []\nfor aug in [original, hflip, vflip, rot90, rot180, rot270]:\n    augmented = aug(image)\n    pred = model(augmented)\n    pred = reverse_aug(pred)  # Reverse spatial augmentation\n    predictions.append(pred)\nresult = average(predictions)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Typically improves accuracy by 1-3%. More robust predictions. Cost: N forward passes instead of 1. Common for competitions and critical applications."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is a class activation map (CAM)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Visualization of which regions the model uses for classification:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "CAM = Σ wk × fk  (weighted sum of feature maps from last conv layer)"
    },
    {
     "t": "p",
     "text": "where wk are weights from GAP → classification layer, fk are feature maps."
    },
    {
     "t": "p",
     "text": "**Explanation:** Requires GAP before classification. Grad-CAM generalizes this to any layer using gradients. Useful for: model debugging, interpretability, weakly-supervised localization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is the role of the classification head in CNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Maps feature representation to class predictions:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Feature maps → Global Average Pooling → FC layer → Softmax → Probabilities\n           or → Flatten → FC → FC → Softmax (older approach)"
    },
    {
     "t": "p",
     "text": "**Modern approach:** GAP + single FC layer. Fewer parameters, less overfitting."
    },
    {
     "t": "p",
     "text": "**Explanation:** GAP averages spatial information → single vector per channel. FC maps channels to classes. Replace only this head for transfer learning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is CutMix data augmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Replace a rectangular region of one image with a patch from another, mix labels proportionally:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "λ ~ Beta(α, α)\nx_new = M × x_A + (1-M) × x_B  (M is binary mask)\ny_new = λ × y_A + (1-λ) × y_B  (λ = proportion of area)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Better than Cutout (information lost) and Mixup (unnatural images). Forces model to focus on partial objects. Significantly improves accuracy and robustness."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the difference between global max pooling and global average pooling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Global Max Pooling:** Takes maximum value across entire spatial dimension per channel. Captures strongest activation.",
      "**Global Average Pooling:** Takes mean value. Smoother, considers all activations."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GAP is more common because: (1) less prone to overfitting, (2) considers all spatial positions, (3) enables CAM visualization. GMP can miss distributed patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is progressive resizing in training CNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Start training with small images, gradually increase resolution:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Epochs 1-30: 128×128\nEpochs 31-60: 192×192\nEpochs 61-90: 256×256\nFinal: 384×384"
    },
    {
     "t": "p",
     "text": "**Benefits:** Faster initial training (small images), better generalization, acts as data augmentation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Used in EfficientNet training, competition winning strategies. Model first learns coarse features, then fine-grained details. Must adjust learning rate when changing resolution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "How do you debug a CNN that isn't converging?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Verify data pipeline:** Display images + labels, check normalization",
      "**Overfit on 1 batch:** If it can't → architecture/optimization bug",
      "**Check learning rate:** Too high (loss oscillates) or too low (no progress)",
      "**Gradient analysis:** Are gradients flowing? Zero gradients = dead layers",
      "**Loss function:** Correct for task? Watch for NaN/inf",
      "**Baseline:** Compare with known-good architecture on same data"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Systematic debugging: data → model → optimization → hyperparameters. Always overfit small data first."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is the impact of input normalization on CNN training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ImageNet normalization (standard for pre-trained models)\ntransform = transforms.Normalize(\n    mean=[0.485, 0.456, 0.406],  # ImageNet means\n    std=[0.229, 0.224, 0.225]    # ImageNet stds\n)"
    },
    {
     "t": "p",
     "text": "**Why critical:**"
    },
    {
     "t": "ol",
     "items": [
      "Pre-trained models expect specific normalization — wrong values = garbage features",
      "Normalizing to zero mean, unit variance helps gradient flow",
      "Different channels may have different scales"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Always match normalization with pre-training. For training from scratch, compute dataset-specific statistics. Forgetting normalization is a common bug."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

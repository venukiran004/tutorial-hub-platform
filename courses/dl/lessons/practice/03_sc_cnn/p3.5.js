/* ============================================================================
   PRACTICE P3.5 — CNNs and Computer Vision · 5
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/02_CNNs_and_Computer_Vision.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.5",
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
   "n": "101",
   "q": "What is the difference between image classification, object detection, and instance segmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Task",
      "Output",
      "Granularity"
     ],
     "rows": [
      [
       "Classification",
       "Single label per image",
       "\"This is a cat\""
      ],
      [
       "Object Detection",
       "Bounding boxes + labels",
       "\"Cat at (x,y,w,h)\""
      ],
      [
       "Semantic Segmentation",
       "Label per pixel",
       "\"These pixels are cat\""
      ],
      [
       "Instance Segmentation",
       "Label per pixel, per instance",
       "\"These pixels are cat #1, those are cat #2\""
      ],
      [
       "Panoptic Segmentation",
       "Semantic + Instance combined",
       "Both \"stuff\" (sky) and \"things\" (cats)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Increasing granularity requires more complex models and annotations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "102",
   "q": "How does YOLO (You Only Look Once) work for object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Divide image into S×S grid\n2. Each cell predicts B bounding boxes + confidence scores\n3. Each cell also predicts C class probabilities\n4. Single forward pass → all detections simultaneously\n\nOutput tensor: S × S × (B × 5 + C)\n5 = (x, y, w, h, confidence)"
    },
    {
     "t": "p",
     "text": "**Evolution:** YOLOv1 → ... → YOLOv8 → YOLO11"
    },
    {
     "t": "p",
     "text": "**Key strengths:** Real-time (>30 FPS), single-stage (no region proposal), end-to-end trainable."
    },
    {
     "t": "p",
     "text": "**Explanation:** Two-stage detectors (Faster R-CNN) are more accurate but slower. YOLO trades some accuracy for speed — ideal for real-time applications."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "103",
   "q": "What is Feature Pyramid Network (FPN) and why is it important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "FPN builds multi-scale feature maps:\n\nInput → [Conv1] → [Conv2] → [Conv3] → [Conv4] → [Conv5]\n                                                      ↓\n             ← Upsample + Lateral ← Upsample ← [P5]\n        [P2] ← [P3] ← [P4] ←"
    },
    {
     "t": "p",
     "text": "**Why:** Small objects need high-resolution features (early layers). Large objects need semantic features (deep layers). FPN combines both."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without FPN, detectors struggle with multi-scale objects. FPN is now standard in most detection architectures."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "104",
   "q": "What is Non-Maximum Suppression (NMS) in object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Sort all detection boxes by confidence score\n2. Pick highest confidence box → add to final detections\n3. Remove all boxes with IoU > threshold (e.g., 0.5) with picked box\n4. Repeat until no boxes remain\n\nSoft-NMS: Instead of removing, reduce confidence of overlapping boxes"
    },
    {
     "t": "p",
     "text": "**Explanation:** Without NMS, multiple overlapping boxes detected for same object. NMS keeps only the best one. Soft-NMS is more gentle — useful when objects genuinely overlap."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "105",
   "q": "What is the difference between anchor-based and anchor-free detectors?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Anchor-based (Faster R-CNN, SSD, YOLOv3):** Pre-define anchor boxes of various sizes/ratios. Model predicts offsets from anchors.",
      "**Anchor-free (FCOS, CenterNet, YOLOv8):** Directly predict object center/corners. No anchor hyperparameters."
     ]
    },
    {
     "t": "p",
     "text": "**Anchor-free advantages:** Simpler, fewer hyperparameters, no anchor-target matching. Performance now competitive or better."
    },
    {
     "t": "p",
     "text": "**Explanation:** Anchor-free is the current trend. Eliminates tedious anchor design and matching strategy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "106",
   "q": "How does semantic segmentation work with FCN (Fully Convolutional Network)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Encoder: Extract features (ResNet backbone)\n2. Decoder: Upsample to original resolution\n3. Output: H × W × C (probability per pixel per class)\n\nEncoder: 224×224 → 112×112 → 56×56 → 28×28 → 14×14 → 7×7\nDecoder: 7×7 → 14×14 → 28×28 → 56×56 → 112×112 → 224×224"
    },
    {
     "t": "p",
     "text": "**Loss:** Cross-entropy per pixel, often with class weighting for imbalanced classes."
    },
    {
     "t": "p",
     "text": "**Explanation:** FCN replaced fully connected layers with 1×1 convolutions, enabling pixel-level prediction at any resolution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "107",
   "q": "What is the U-Net architecture and why is it popular for medical imaging?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "U-Net structure:\nEncoder (contracting):  64→128→256→512→1024\n  ↓ skip connections (concatenation) ↓\nDecoder (expanding):    1024→512→256→128→64\n\nSkip connections preserve spatial details lost during downsampling."
    },
    {
     "t": "p",
     "text": "**Why popular for medical:**"
    },
    {
     "t": "ol",
     "items": [
      "Works well with small datasets (data augmentation heavy)",
      "Precise boundaries via skip connections",
      "Symmetric architecture is easy to understand/modify"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** U-Net set the standard for biomedical segmentation. Variants: Attention U-Net, U-Net++, nnU-Net (self-configuring)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "108",
   "q": "What is image generation with Stable Diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Forward process: Image → Add noise gradually → Pure noise\nReverse process: Pure noise → Remove noise gradually → Image\n\nKey innovation (Latent Diffusion):\n1. Encode image to latent space (VAE encoder)\n2. Apply diffusion in latent space (cheaper than pixel space)\n3. Decode generated latent back to image (VAE decoder)\n4. Text conditioning via CLIP text encoder + cross-attention"
    },
    {
     "t": "p",
     "text": "**Explanation:** Diffusion models produce higher quality images than GANs with more stable training. Latent space makes it practical for high-resolution images."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "109",
   "q": "What is optical flow estimation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Predict per-pixel motion between consecutive video frames."
    },
    {
     "t": "p",
     "text": "**Deep learning approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**FlowNet:** CNN that directly predicts flow from image pairs",
      "**RAFT:** Recurrent All-Pairs Field Transforms — iteratively refines flow estimate",
      "**PWC-Net:** Pyramid, Warping, Cost volume based approach"
     ]
    },
    {
     "t": "p",
     "text": "**Applications:** Video stabilization, action recognition, autonomous driving, video interpolation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Optical flow is fundamental for video understanding — captures \"what moved where\" between frames."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "110",
   "q": "What is the Vision Transformer (ViT) approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Split image into patches (e.g., 16×16 pixels)\n2. Flatten patches → linear projection → patch embeddings\n3. Add position embeddings\n4. Prepend [CLS] token\n5. Standard Transformer encoder\n6. [CLS] output → classification head\n\nImage 224×224, patch 16×16 → 196 patches (like 196 \"tokens\")"
    },
    {
     "t": "p",
     "text": "**Explanation:** ViT showed pure Transformers compete with CNNs on vision tasks when pre-trained on large datasets. Now dominant for vision. CNNs still better for small datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "111",
   "q": "What is the difference between one-stage and two-stage object detectors?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Two-stage (Faster R-CNN):**",
      "— Region Proposal Network (RPN) → candidate regions",
      "— Classify and refine each region",
      "— More accurate, slower",
      "**One-stage (YOLO, SSD, RetinaNet):**",
      "— Directly predict classes and boxes from feature map",
      "— Faster, slightly less accurate",
      "— RetinaNet's focal loss closed the accuracy gap"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Focal loss was the key — addresses class imbalance (most anchors are background) that hurt one-stage detectors."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "112",
   "q": "What is data augmentation for computer vision?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Geometric:**"
    },
    {
     "t": "ul",
     "items": [
      "Random crop, flip, rotation, scaling, shearing"
     ]
    },
    {
     "t": "p",
     "text": "**Photometric:**"
    },
    {
     "t": "ul",
     "items": [
      "Color jitter, brightness, contrast, saturation"
     ]
    },
    {
     "t": "p",
     "text": "**Advanced:**"
    },
    {
     "t": "ul",
     "items": [
      "Mixup: Blend two images and labels linearly",
      "CutMix: Cut patch from one image, paste on another",
      "RandAugment: Random combination of augmentations",
      "AutoAugment: Learned augmentation policy via NAS"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Data augmentation is often more effective than architectural innovations for small-medium datasets. CutMix outperforms Cutout and Mixup on ImageNet."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "113",
   "q": "What is the Intersection over Union (IoU) metric?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "IoU = Area of Intersection / Area of Union\n\n       ┌──────┐\n       │  A   │\n    ┌──┼──┐   │\n    │  │XX│   │  XX = Intersection\n    │  └──┼───┘\n    │  B      │\n       └──────┘\n\nIoU = XX / (A + B - XX)\n\nIoU thresholds:\n  > 0.5: correct detection (PASCAL VOC)\n  > 0.5:0.95 in steps of 0.05 (COCO mAP)"
    },
    {
     "t": "p",
     "text": "**Explanation:** IoU is THE metric for evaluating detection and segmentation. Higher threshold = stricter matching requirement."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "114",
   "q": "What is image super-resolution using deep learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Upscale low-resolution images to high-resolution."
    },
    {
     "t": "p",
     "text": "**Models:**"
    },
    {
     "t": "ol",
     "items": [
      "**SRCNN:** First DL-based SR (3 conv layers)",
      "**EDSR:** Enhanced Deep SR (deeper, no BN)",
      "**ESRGAN:** GAN-based for perceptually realistic results",
      "**Real-ESRGAN:** Handle real-world degradation"
     ]
    },
    {
     "t": "p",
     "text": "**Loss functions:**"
    },
    {
     "t": "ul",
     "items": [
      "Pixel loss (L1/L2): Sharp but blurry",
      "Perceptual loss (VGG features): More realistic",
      "Adversarial loss (GAN): Most realistic but may hallucinate"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Trade-off: pixel loss gives highest PSNR, perceptual/adversarial gives best visual quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "115",
   "q": "What is pose estimation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Detect human body keypoints (joints) from images/video."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Top-down:** Detect person → estimate pose per person (more accurate)",
      "**Bottom-up:** Detect all keypoints → group into persons (faster for crowds)"
     ]
    },
    {
     "t": "p",
     "text": "**Models:** OpenPose (bottom-up), HRNet (top-down), MediaPipe (real-time), ViTPose (transformer-based)."
    },
    {
     "t": "p",
     "text": "**Output:** 17-25 keypoints with (x, y, confidence) per person."
    },
    {
     "t": "p",
     "text": "**Explanation:** Applications: sports analytics, sign language, fitness apps, AR/VR, action recognition."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "116",
   "q": "What is the difference between depth estimation approaches?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Monocular depth:** Single image → depth map (ill-posed, learned from data)",
      "— MiDaS, DPT, Depth Anything",
      "**Stereo depth:** Two cameras → depth via disparity calculation",
      "**Multi-view:** Multiple images → 3D reconstruction (SfM, MVS)",
      "**LiDAR/ToF:** Active sensors → direct depth measurement"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Monocular is convenient (any camera works) but less accurate. DL has made monocular depth surprisingly good for many applications."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "117",
   "q": "What is Neural Style Transfer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Apply artistic style of one image to content of another."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss = α × Content_Loss + β × Style_Loss\n\nContent_Loss: MSE between feature maps of content and output\nStyle_Loss: MSE between Gram matrices of style and output\n\nGram matrix captures texture/correlation between features\nG = F^T × F (feature_maps × feature_maps^T)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Optimization-based (original Gatys): slow. Feed-forward networks (Johnson): real-time. AdaIN: arbitrary style transfer with single forward pass."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "118",
   "q": "What is visual question answering (VQA)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Given image + natural language question → answer."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Image: [photo of a kitchen]\nQuestion: \"How many chairs are there?\"\nAnswer: \"3\""
    },
    {
     "t": "p",
     "text": "**Architecture:**"
    },
    {
     "t": "ol",
     "items": [
      "Image encoder (ViT/CNN) → visual features",
      "Text encoder (BERT/GPT) → question features",
      "Multimodal fusion → answer prediction"
     ]
    },
    {
     "t": "p",
     "text": "**Modern:** LLaVA, GPT-4V — large multimodal models handle VQA natively."
    },
    {
     "t": "p",
     "text": "**Explanation:** VQA requires both visual understanding and language reasoning — a key multimodal AI task."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "119",
   "q": "What is the difference between 2D and 3D convolutions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "2D Conv: Kernel slides over H × W → spatial features\n   Input: (C, H, W), Kernel: (C, kH, kW)\n\n3D Conv: Kernel slides over H × W × D (or T) → spatiotemporal features\n   Input: (C, D, H, W), Kernel: (C, kD, kH, kW)"
    },
    {
     "t": "p",
     "text": "**3D Conv applications:**"
    },
    {
     "t": "ol",
     "items": [
      "Video understanding (temporal dimension)",
      "Medical imaging (3D CT/MRI volumes)",
      "Point cloud processing"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** 3D convolutions are expensive (~kD× more computation than 2D). Pseudo-3D: factorize into 2D spatial + 1D temporal convolutions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "120",
   "q": "What is the mAP (mean Average Precision) metric for object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. For each class, compute Precision-Recall curve\n2. Compute AP = area under PR curve (interpolated)\n3. mAP = mean of AP across all classes\n\nCOCO mAP: Average over IoU thresholds 0.5:0.05:0.95\nPASCAL VOC mAP: Single IoU threshold of 0.5\n\nmAP@0.5: Lenient (rough localization ok)\nmAP@0.75: Strict (precise localization needed)\nmAP@[0.5:0.95]: Comprehensive (standard COCO metric)"
    },
    {
     "t": "p",
     "text": "**Explanation:** mAP captures both detection and localization quality. Higher IoU threshold requires more precise bounding boxes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "121",
   "q": "What is image captioning with deep learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Image → CNN Encoder → Feature vector → RNN/Transformer Decoder → Caption\n\nModern approach:\nImage → ViT → Cross-attention with text decoder → \"A cat sitting on a mat\""
    },
    {
     "t": "p",
     "text": "**Training:** Paired image-caption datasets (COCO Captions, Flickr30k)."
    },
    {
     "t": "p",
     "text": "**Evaluation:** BLEU, METEOR, CIDEr, SPICE metrics."
    },
    {
     "t": "p",
     "text": "**Explanation:** Encoder-decoder architecture. Attention mechanism allows decoder to focus on relevant image regions. GPT-4V/Gemini now do this natively."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "122",
   "q": "What is face recognition and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Face Detection: Locate faces in image (MTCNN, RetinaFace)\n2. Face Alignment: Normalize face orientation\n3. Feature Extraction: CNN → 128/512-dim embedding (FaceNet, ArcFace)\n4. Matching: Compare embedding similarity\n\nFace Verification: \"Is this person A?\" (1:1 comparison)\nFace Identification: \"Who is this?\" (1:N comparison)"
    },
    {
     "t": "p",
     "text": "**Loss functions:** Triplet loss, ArcFace (additive angular margin), CosFace."
    },
    {
     "t": "p",
     "text": "**Explanation:** ArcFace uses angular margin in embedding space — forces inter-class separation and intra-class compactness."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "123",
   "q": "What is the role of attention mechanisms in computer vision?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Channel attention (SE-Net):** Learn which channels are important",
      "**Spatial attention (CBAM):** Learn which spatial locations are important",
      "**Self-attention (ViT):** Learn relationships between all patch pairs",
      "**Cross-attention:** Relate image features to text queries (CLIP, BLIP)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Attention helps model focus on relevant regions. SE-Net: squeeze (global pool) + excitation (channel weights). ViT: full self-attention over image patches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "124",
   "q": "What is contrastive learning for vision (SimCLR, MoCo)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "SimCLR:\n1. Augment image twice → two views\n2. Encode both views → embeddings\n3. Pull same-image embeddings together\n4. Push different-image embeddings apart\n5. No labels needed!\n\nKey components:\n- Strong augmentation (crop, color, blur)\n- Large batch size (4096+)\n- MLP projection head\n- NT-Xent loss"
    },
    {
     "t": "p",
     "text": "**Explanation:** Self-supervised pre-training for vision. Learns representations by contrasting augmented views. MoCo uses momentum encoder for larger effective batch. DINO adds self-distillation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "125",
   "q": "What is the difference between semantic and instance segmentation loss functions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Semantic:** Cross-entropy loss per pixel (standard classification)",
      "— Weighted CE for class imbalance",
      "— Dice loss for overlap optimization",
      "— Focal loss for hard pixels",
      "**Instance:** Mask prediction + classification + box regression",
      "— Mask R-CNN: binary mask loss per instance",
      "— Loss = L_cls + L_box + L_mask"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Semantic treats each pixel independently. Instance needs to associate pixels with object instances — requires detection + segmentation."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

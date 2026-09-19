/* ============================================================================
   PRACTICE P3.3 — CNNs and Computer Vision · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/02_CNNs_and_Computer_Vision.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.3",
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
   "n": "51",
   "q": "What are the main object detection paradigms?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Two-stage:** Generate proposals → classify each (R-CNN family)",
      "**One-stage:** Direct prediction from feature maps (YOLO, SSD, RetinaNet)",
      "**Anchor-free:** Predict center + size directly (FCOS, CenterNet)",
      "**Transformer-based:** DETR — set prediction with attention"
     ]
    },
    {
     "t": "p",
     "text": "**Trade-off:** Two-stage: higher accuracy, slower. One-stage: faster, competitive accuracy. Transformer: end-to-end, no NMS needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "How does Faster R-CNN work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Backbone CNN extracts feature maps\n2. Region Proposal Network (RPN): generates ~2000 proposals (anchors + offsets)\n3. RoI Pooling: extract fixed-size features for each proposal\n4. Classification head: object class + refined bounding box"
    },
    {
     "t": "p",
     "text": "**RPN:** Slides over feature map, predicts objectness + box regression at each position with multiple anchor scales/ratios."
    },
    {
     "t": "p",
     "text": "**Explanation:** Two-stage: RPN proposes, classifier decides. Still competitive. Foundation for Mask R-CNN, Cascade R-CNN."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is RoI Pooling vs RoI Align?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**RoI Pooling:** Quantizes (rounds) coordinates → misalignment artifacts",
      "**RoI Align:** Uses bilinear interpolation → exact alignment"
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "RoI Pooling: quantize region → divide into grid → max pool\nRoI Align: no quantization → sample with blinear interpolation → pool"
    },
    {
     "t": "p",
     "text": "**Explanation:** RoI Align (Mask R-CNN) eliminates misalignment errors that degrade mask quality. Essential for pixel-level tasks (segmentation). Up to 50% improvement for masks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is the Feature Pyramid Network (FPN) and why is it important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Bottom-up: C2→C3→C4→C5 (standard backbone, decreasing resolution)\nTop-down: P5→P4→P3→P2 (upsample + lateral connections from Ci)"
    },
    {
     "t": "p",
     "text": "**Why:** Objects appear at different scales. Small objects detected in high-res P2; large objects in P5."
    },
    {
     "t": "p",
     "text": "**Explanation:** Each pyramid level handles different object sizes. 1×1 lateral connections merge semantic (top) with spatial (bottom) information. Standard in modern detectors."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "How does YOLO v5/v8 differ from original YOLO?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "YOLO v1 (2015): Single grid, limited objects per cell\nYOLO v5 (2020): CSPDarknet backbone, mosaic augmentation, anchor-based\nYOLO v8 (2023): Anchor-free, decoupled head, improved backbone"
    },
    {
     "t": "p",
     "text": "**Improvements:** Multi-scale detection, better backbone, augmentation (mosaic, mixup), dynamic anchor assignment, decoupled classification/regression heads."
    },
    {
     "t": "p",
     "text": "**Explanation:** Same philosophy (single-pass, fast) but dramatically improved accuracy. YOLOv8 competitive with two-stage detectors at real-time speeds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is DETR (DEtection TRansformer)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** End-to-end object detection with Transformers:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. CNN backbone → feature maps\n2. Transformer encoder: self-attention on features\n3. Transformer decoder: N learned object queries attend to features\n4. N parallel predictions (no NMS needed!)"
    },
    {
     "t": "p",
     "text": "**Key:** Bipartite matching loss — optimally assign predictions to ground truth."
    },
    {
     "t": "p",
     "text": "**Explanation:** Eliminates anchors, NMS, and most hand-designed components. Simpler architecture. Slower convergence than R-CNN. DINO-DETR and RT-DETR improve speed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is the bipartite matching loss in DETR?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Find optimal 1-to-1 assignment between predictions and ground truth:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Cost = λ_cls × class_cost + λ_box × L1_cost + λ_giou × GIoU_cost\nAssignment: Hungarian algorithm finds minimum cost matching\nLoss: compute class + box loss only on matched pairs"
    },
    {
     "t": "p",
     "text": "**Explanation:** No duplicate detections (1-to-1 matching). Unmatched predictions are trained as \"no object.\" Eliminates need for NMS post-processing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is Mask R-CNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Extends Faster R-CNN with an instance segmentation branch:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Faster R-CNN: box + class per region\nMask R-CNN: box + class + pixel mask per region"
    },
    {
     "t": "p",
     "text": "**Architecture:** Add parallel mask prediction branch (small FCN) on RoI-aligned features."
    },
    {
     "t": "p",
     "text": "**Key insight:** Decouple mask and class prediction — predict binary mask for each class."
    },
    {
     "t": "p",
     "text": "**Explanation:** Dominant instance segmentation approach. Uses RoI Align (not RoI Pool) for precise masks. Multi-task: detection + segmentation simultaneously."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is semantic segmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Classify every pixel in the image:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: H×W×3 image\nOutput: H×W label map (each pixel gets a class)"
    },
    {
     "t": "p",
     "text": "**Models:** FCN, U-Net, DeepLab, SegFormer"
    },
    {
     "t": "p",
     "text": "**Loss:** Pixel-wise cross-entropy + Dice loss (for imbalanced classes)."
    },
    {
     "t": "p",
     "text": "**Explanation:** No instance distinction (\"sky\" is one region, not individual sky objects). Applications: autonomous driving, medical imaging, satellite analysis."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "How does DeepLab work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Key components:\n1. Atrous (dilated) convolutions: increase receptive field without downsampling\n2. ASPP (Atrous Spatial Pyramid Pooling): multiple dilation rates in parallel\n3. Encoder-decoder structure (DeepLab v3+)\n4. CRF post-processing (v1/v2) → removed in v3+"
    },
    {
     "t": "p",
     "text": "**ASPP:** Captures multi-scale context by applying dilated convolutions at rates [6, 12, 18] + global pooling."
    },
    {
     "t": "p",
     "text": "**Explanation:** Maintains resolution while capturing large context. State-of-the-art before transformer-based segmentation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What is panoptic segmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Unifies semantic and instance segmentation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "\"Things\" (countable): cars, people → instance segmentation (each gets unique ID)\n\"Stuff\" (uncountable): sky, road → semantic segmentation (just class labels)"
    },
    {
     "t": "p",
     "text": "**Metric:** Panoptic Quality (PQ) = Segmentation Quality × Recognition Quality."
    },
    {
     "t": "p",
     "text": "**Explanation:** Complete scene understanding. Every pixel labeled with class AND instance ID (for things). Panoptic FPN, MaskFormer, Mask2Former are leading approaches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is the difference between anchor-based and anchor-free detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Anchor-based (Faster R-CNN, YOLO v3):** Pre-defined reference boxes at various scales/ratios. Predict offsets.",
      "**Anchor-free (FCOS, CenterNet):** Predict center point + distances to box edges directly."
     ]
    },
    {
     "t": "p",
     "text": "**Anchor-free advantages:** No anchor hyperparameter tuning, simpler design, no anchor-GT matching."
    },
    {
     "t": "p",
     "text": "**Explanation:** FCOS: per-pixel prediction of center-ness + box regression. CenterNet: detect object center as keypoint, regress properties. Modern trend favors anchor-free."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is Non-Maximum Suppression (NMS) and its variants?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard NMS:\n1. Sort by confidence\n2. Select top detection\n3. Remove all boxes with IoU > threshold\n4. Repeat\n\nVariants:\n- Soft-NMS: reduce score instead of removing (less aggressive)\n- DIoU-NMS: consider center distance, not just IoU\n- Matrix NMS: parallel implementation (faster)"
    },
    {
     "t": "p",
     "text": "**Explanation:** NMS removes duplicate detections. Not needed in DETR (set-based prediction). Soft-NMS improves recall for overlapping objects."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is the difference between 2D and 3D object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**2D:** Predict bounding box in image plane (x, y, w, h)",
      "**3D:** Predict 3D bounding box in world coordinates (x, y, z, l, w, h, yaw)"
     ]
    },
    {
     "t": "p",
     "text": "**3D inputs:** LiDAR point clouds, stereo images, monocular depth estimation."
    },
    {
     "t": "p",
     "text": "**Models:** PointPillars, VoxelNet (LiDAR); FCOS3D, MonoDETR (camera)."
    },
    {
     "t": "p",
     "text": "**Explanation:** 3D detection essential for autonomous driving. LiDAR-based more accurate but expensive. Camera-based cheaper but less precise depth."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is data augmentation for object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: flip, rotate, scale, crop, color jitter\nDetection-specific:\n1. Mosaic: combine 4 images into one (YOLO v4/v5)\n2. Mixup: blend images and labels\n3. Random erasing: remove patches\n4. Copy-paste: paste object instances randomly"
    },
    {
     "t": "p",
     "text": "**Importance:** Must transform BOTH image AND bounding boxes/masks."
    },
    {
     "t": "p",
     "text": "**Explanation:** Mosaic particularly effective — single training image contains objects at varied scales and contexts. Copy-paste augmentation for instance segmentation showed significant gains."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is the COCO evaluation metric?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "AP (Average Precision): area under precision-recall curve\nAP@0.5: IoU threshold = 0.5\nAP@0.75: IoU threshold = 0.75 (strict)\nAP@[0.5:0.95]: averaged over IoU thresholds from 0.5 to 0.95\nAP_small: objects < 32×32 pixels\nAP_medium: 32-96 pixels\nAP_large: > 96×96 pixels"
    },
    {
     "t": "p",
     "text": "**Explanation:** AP@[0.5:0.95] is the primary COCO metric. More comprehensive than single IoU threshold. Small object detection remains challenging."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "How does point cloud processing work for 3D detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Approaches:\n1. PointNet: directly process raw points (MLP on each point → global pooling)\n2. Voxelization: convert to 3D grid → 3D convolutions\n3. Pillarization: convert to vertical pillars → 2D convolutions\n4. Point-Voxel fusion: combine both approaches"
    },
    {
     "t": "p",
     "text": "**Explanation:** Point clouds are unordered, irregular (unlike images). PointNet: permutation invariant. Voxel: standard convolutions but sparse. Pillars (PointPillars): efficient BEV processing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is SegFormer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Transformer-based semantic segmentation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Hierarchical Transformer encoder (multi-scale features)\n2. Lightweight MLP decoder (not heavy as U-Net decoder)"
    },
    {
     "t": "p",
     "text": "**Key:** Mix-FFN (depthwise conv in FFN for local context), no positional encoding needed."
    },
    {
     "t": "p",
     "text": "**Explanation:** Simpler than DeepLab but higher accuracy. No need for dilated convolutions, ASPP, or CRF. Efficient and scalable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is the Segment Anything Model (SAM)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Foundation model for segmentation that can segment ANY object:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: image + prompt (point, box, text)\nOutput: segmentation mask"
    },
    {
     "t": "p",
     "text": "**Architecture:** Heavy image encoder (ViT) + lightweight mask decoder + prompt encoder."
    },
    {
     "t": "p",
     "text": "**Training:** 11M images, 1.1B masks. Self-supervised data generation pipeline."
    },
    {
     "t": "p",
     "text": "**Explanation:** Zero-shot segmentation — works on any image without training. Promptable: click a point → segment that object. Foundation model paradigm for vision."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is image matting vs segmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Segmentation:** Binary or categorical — sharp boundaries. Pixel is either foreground or background.",
      "**Matting:** Continuous alpha values [0, 1] — soft boundaries. Captures semi-transparent regions (hair, glass, smoke)."
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Composited image: I = α × F + (1-α) × B\nMatting estimates: α (alpha matte)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Matting is harder — needs to estimate transparency. Essential for video editing, virtual backgrounds. Deep matting networks predict alpha directly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is knowledge distillation for object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Teacher (large model, accurate) → Student (small model, fast)\nDistill:\n1. Classification logits\n2. Feature map representations\n3. Relation between features\n4. Bounding box regression"
    },
    {
     "t": "p",
     "text": "**Explanation:** Student learns from teacher's \"soft\" knowledge (probability distributions, feature maps) not just hard labels. Produces compact detectors for edge/mobile deployment. 2-3× speedup with <2% accuracy drop."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is the difference between top-down and bottom-up instance segmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Top-down (Mask R-CNN):** Detect boxes first → segment each box. Depends on detection quality.",
      "**Bottom-up:** Predict per-pixel embeddings → group into instances via clustering. No detection needed."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Top-down: dominant approach, but misses objects not detected. Bottom-up: can handle overlapping objects, but grouping is challenging. Panoptic models combine both."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is multi-scale testing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Run detector on image at multiple scales, merge detections:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "scales = [0.5, 0.75, 1.0, 1.25, 1.5]\nall_detections = []\nfor scale in scales:\n    resized = resize(image, scale)\n    detections = model(resized)\n    detections = scale_back(detections)\n    all_detections.extend(detections)\nfinal = nms(all_detections)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Improves detection of objects at extreme scales (very small, very large). 2-3× slower but 1-3% AP improvement. Used in competitions, not in real-time applications."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is PointRend?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Render segmentation masks at high resolution by iteratively refining uncertain points:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Start with coarse prediction\n2. Identify points with uncertain predictions (edge regions)\n3. Sample features at those points\n4. Predict refined labels at those points\n5. Repeat (subdivide)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Like adaptive rendering in graphics — focus computation on boundaries where it matters. Much higher resolution masks without proportionally more computation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is the cascade detection approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multiple detection stages with increasing IoU thresholds:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Stage 1: IoU threshold 0.5 → proposals\nStage 2: IoU threshold 0.6 → refined proposals\nStage 3: IoU threshold 0.7 → final detections"
    },
    {
     "t": "p",
     "text": "**Explanation:** Cascade R-CNN progressively refines detections. Each stage specializes in higher-quality matches. Significant AP improvement at high IoU thresholds (AP@0.75, AP@0.9)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

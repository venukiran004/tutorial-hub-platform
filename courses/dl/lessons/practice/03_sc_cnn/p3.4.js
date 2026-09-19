/* ============================================================================
   PRACTICE P3.4 — CNNs and Computer Vision · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/02_CNNs_and_Computer_Vision.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.4",
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
   "n": "76",
   "q": "What is the difference between class-agnostic and class-specific detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Class-agnostic:** Single \"object\" class. Detect all objects regardless of class.",
      "**Class-specific:** Separate detection per class. Independent box/mask prediction per class."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Class-agnostic is simpler, more generalizable. Used in SAM, open-vocabulary detection. Class-specific is standard for fixed-category benchmarks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is weakly-supervised object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train detector with only image-level labels (no bounding box annotations):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Label: \"cat\" present in image (but no box)\nMethod: Multiple Instance Learning (MIL) — image as bag of proposals"
    },
    {
     "t": "p",
     "text": "**Explanation:** Bounding box annotation is expensive. Learn to localize from class labels. Much cheaper annotation. Quality gap vs fully supervised: ~20% AP. Useful when annotation budget is limited."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is domain adaptation for detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Adapt detector from source domain (labeled) to target domain (unlabeled):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Source: annotated urban driving data (city A, clear weather)\nTarget: no labels (city B, rainy weather)"
    },
    {
     "t": "p",
     "text": "**Methods:** Adversarial feature alignment, style transfer, teacher-student."
    },
    {
     "t": "p",
     "text": "**Explanation:** Domain gap causes significant performance drop. Sim-to-real (simulation→real world) is common. Nighttime, weather, and geographic differences all cause domain shift."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is oriented object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Detect objects with rotated bounding boxes (not axis-aligned):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: (x, y, w, h) — axis-aligned rectangle\nOriented: (x, y, w, h, θ) — rotated rectangle"
    },
    {
     "t": "p",
     "text": "**Applications:** Aerial/satellite imagery, text detection, medical imaging."
    },
    {
     "t": "p",
     "text": "**Explanation:** Axis-aligned boxes waste space and overlap for non-axis-aligned objects. Oriented detection is harder (angle regression) but gives tighter fits."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is open-vocabulary object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Detect objects of ANY class described in natural language, not just pre-defined categories:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Traditional: detect 80 COCO classes (fixed)\nOpen-vocabulary: detect \"purple striped umbrella\" (any description)"
    },
    {
     "t": "p",
     "text": "**Method:** CLIP-based: align visual features with text features. Ground with text prompt."
    },
    {
     "t": "p",
     "text": "**Explanation:** GLIP, Grounding DINO, OWLv2. Much more flexible than closed-set detection. Foundation models + language-vision alignment enable this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is video object segmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Segment and track objects across video frames:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Semi-supervised: given mask in first frame → propagate\nUnsupervised: automatically identify and track salient objects"
    },
    {
     "t": "p",
     "text": "**Challenges:** Occlusion, appearance change, fast motion, re-identification."
    },
    {
     "t": "p",
     "text": "**Methods:** Propagation-based, matching-based (memory networks), online fine-tuning."
    },
    {
     "t": "p",
     "text": "**Explanation:** Applications: video editing, surveillance, autonomous driving. SAM 2 extends SAM to video with memory mechanism."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is the loss function for bounding box regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L1 Loss: |pred - gt|                        (simple, outlier sensitive)\nSmooth L1: 0.5x² if |x|<1, |x|-0.5 otherwise (standard, robust)\nIoU Loss: 1 - IoU(pred, gt)                 (directly optimizes IoU)\nGIoU: 1 - GIoU (handles non-overlapping boxes)\nDIoU: 1 - DIoU (considers center distance)\nCIoU: 1 - CIoU (+ aspect ratio penalty)"
    },
    {
     "t": "p",
     "text": "**Explanation:** IoU-based losses directly optimize the evaluation metric. CIoU is most comprehensive. Standard choice: GIoU or CIoU loss for box regression."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is the concept of objectness in detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Probability that a region contains ANY object (regardless of class):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "RPN objectness: is this proposal an object or background?\nBinary: object vs no-object (class-agnostic)"
    },
    {
     "t": "p",
     "text": "**Explanation:** First filter: is something here? Then classify: what is it? Two-stage approach. Objectness score filters out most background, reducing classification burden."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "How do you handle small object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Higher resolution input:** More pixels for small objects",
      "**FPN/multi-scale:** Use high-resolution feature maps for small objects",
      "**Tiling:** Divide image into overlapping tiles, detect per tile",
      "**Super-resolution:** Upscale regions before detection",
      "**Data augmentation:** Oversample images with small objects",
      "**Anchor design:** Include small anchors"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Small objects have few pixels → weak features. Most detection failures are on small objects. AP_small is typically 15-20 points lower than AP_large."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is the difference between single-label and multi-label detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Single-label:** Each object belongs to exactly one class (standard detection)",
      "**Multi-label:** Each object can have multiple labels (attributes + class)"
     ]
    },
    {
     "t": "p",
     "text": "**Example:** Single: \"car.\" Multi: \"car, red, parked, SUV.\""
    },
    {
     "t": "p",
     "text": "**Explanation:** Multi-label uses sigmoid (independent per class) instead of softmax (mutually exclusive). Multi-label is more common in real applications but less studied."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is few-shot object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Detect novel object categories with very few examples (1-10):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Base training: learn on many categories with many examples\nFew-shot: adapt to new categories with k examples (k=1,5,10)"
    },
    {
     "t": "p",
     "text": "**Methods:** Meta-learning, metric learning, fine-tuning-based."
    },
    {
     "t": "p",
     "text": "**Explanation:** Practical: new product detection, rare species. Base detector provides general features. Few-shot adaptation adds specific class knowledge."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the BEV (Bird's Eye View) representation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Transform 3D scene to top-down 2D representation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Camera images → project features to BEV plane\nLiDAR points → project to BEV directly"
    },
    {
     "t": "p",
     "text": "**Advantages:** Natural for driving (ego-car plans in BEV). Multiple cameras fused to single BEV. Unified representation for detection, prediction, planning."
    },
    {
     "t": "p",
     "text": "**Explanation:** BEVFormer uses spatial cross-attention to lift camera features to BEV. Standard approach in autonomous driving."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is active learning for object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Model selects which unlabeled images would be most valuable to annotate:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Acquisition strategies:\n1. Uncertainty: images where model is least confident\n2. Diversity: images most different from training data\n3. Expected model improvement: images that would most change the model"
    },
    {
     "t": "p",
     "text": "**Explanation:** Detection annotation is expensive (box-level). Active learning reduces annotation cost by 30-60%. Select informative images → annotate → retrain → repeat."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is test-time augmentation for detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Apply augmentations at test time, merge predictions\npredictions = []\nfor aug in [original, hflip, scale_0.8, scale_1.2]:\n    augmented = aug(image)\n    pred = model(augmented)\n    pred = reverse_aug(pred)  # Reverse box coordinates\n    predictions.append(pred)\nmerged = weighted_box_fusion(predictions)"
    },
    {
     "t": "p",
     "text": "**WBF (Weighted Box Fusion):** Better than NMS for merging. Averages coordinates weighted by confidence."
    },
    {
     "t": "p",
     "text": "**Explanation:** 1-3% AP improvement. Multiple forward passes. Used in competitions and critical applications."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the anchor-free CenterNet approach?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Predict heatmap of object centers (one per class)\n2. At each detected center, predict:\n   - Offset (sub-pixel refinement)\n   - Width and height\n   - Optional: depth, 3D pose, etc.\n3. Extract peaks from heatmap → detections"
    },
    {
     "t": "p",
     "text": "**No anchors, no NMS.** Simple and elegant."
    },
    {
     "t": "p",
     "text": "**Explanation:** Keypoint-based detection. Same architecture can predict 2D boxes, 3D boxes, human pose. Fast and versatile."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is real-time instance segmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Instance segmentation fast enough for real-time applications (>30 fps):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "YOLACT: prototype masks × per-instance coefficients → instance mask\nSOLOv2: predict per-pixel category + instance kernel"
    },
    {
     "t": "p",
     "text": "**vs Mask R-CNN:** Accurate but slow (~5 fps). YOLACT/SOLOv2: 30+ fps with good quality."
    },
    {
     "t": "p",
     "text": "**Explanation:** Real-time segmentation needed for robotics, autonomous driving, AR. Trade-off between mask quality and speed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is contrastive learning for detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn representations by contrasting positive and negative pairs:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Positive: same object in different views → pull together\nNegative: different objects → push apart\nPre-train backbone → fine-tune for detection"
    },
    {
     "t": "p",
     "text": "**Methods:** MoCo, SimCLR, DINO pre-training → detection fine-tuning."
    },
    {
     "t": "p",
     "text": "**Explanation:** Self-supervised pre-training can match or exceed supervised ImageNet pre-training for detection. Especially valuable when labeled data is limited."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is the relationship between detection and tracking?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Detection: locate objects in single frame (no temporal info)\nTracking: maintain object identity across frames (temporal continuity)\nTracking-by-detection: detect per frame → associate detections across frames"
    },
    {
     "t": "p",
     "text": "**Association methods:** IoU matching, appearance features (ReID), Kalman filter prediction."
    },
    {
     "t": "p",
     "text": "**Explanation:** SORT: simple IoU + Kalman filter. DeepSORT: adds appearance features. ByteTrack: uses low-confidence detections too."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is label assignment in one-stage detectors?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Determine which predictions are responsible for which ground truth objects:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Fixed: based on IoU with anchors (threshold-based)\nDynamic: OTA (Optimal Transport Assignment), SimOTA (YOLO v8)"
    },
    {
     "t": "p",
     "text": "**Dynamic advantages:** Adapts to object difficulty. Easy objects: fewer positive anchors. Hard objects: more positive anchors."
    },
    {
     "t": "p",
     "text": "**Explanation:** Label assignment significantly affects training quality. Dynamic assignment is now standard. ATSS, OTA, SimOTA are popular strategies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is depth estimation and its role in detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Predict depth (distance) for each pixel from a single image:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Monocular depth: single image → depth map\nStereo depth: two images → depth map (triangulation)"
    },
    {
     "t": "p",
     "text": "**Role:** Enables 3D detection from camera-only setup. Depth provides z-coordinate for 3D boxes."
    },
    {
     "t": "p",
     "text": "**Models:** MiDaS, DPT, Depth Anything (monocular). RAFT-Stereo (stereo)."
    },
    {
     "t": "p",
     "text": "**Explanation:** LiDAR gives direct depth but is expensive. Monocular depth is cheaper but less accurate. Pseudo-LiDAR: monocular depth → 3D points → use LiDAR detector."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is the difference between offline and online detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Offline:** Process each image/frame independently. No temporal information.",
      "**Online:** Process frames sequentially, use temporal context (previous frames, tracking)."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Online detection can use temporal smoothing (reduce false positives), anticipate motion, maintain tracks. Offline is simpler but ignores temporal cues. Video object detection uses temporal aggregation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is occupancy prediction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Predict 3D occupancy grid of the scene:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: camera/LiDAR data\nOutput: 3D voxel grid — each voxel labeled as (occupied, class) or free"
    },
    {
     "t": "p",
     "text": "**Advantage:** Represents arbitrary shapes (no bounding box limitation)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Emerging in autonomous driving: objects + environment represented as dense 3D grid. Handles irregular shapes, partial observations. More complete scene understanding than box-based detection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "How do you evaluate segmentation quality?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "mIoU: mean Intersection over Union across classes\nDice: 2|P∩G|/(|P|+|G|) — similar to F1\nPixel accuracy: % correct pixels (misleading with imbalance)\nBoundary F1: evaluate boundary quality specifically\nAP (instances): detection-style metric for instance segmentation\nPQ: Panoptic Quality for panoptic segmentation"
    },
    {
     "t": "p",
     "text": "**Explanation:** mIoU is standard for semantic segmentation. AP for instance segmentation. PQ for panoptic. Pixel accuracy is misleading (labeling everything as \"background\" gives high accuracy)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is interactive segmentation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** User provides guidance (clicks, scribbles, boxes) to segment objects:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Positive click: \"this is the object\"\nNegative click: \"this is NOT the object\"\nModel refines mask with each interaction"
    },
    {
     "t": "p",
     "text": "**Models:** SAM, RITM, SimpleClick."
    },
    {
     "t": "p",
     "text": "**Explanation:** Combines human intelligence with model capability. User corrects model mistakes iteratively. Much faster than manual annotation. Key for building training datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "What is the future of object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Foundation models:** SAM, Grounding DINO — detect anything via prompts",
      "**Open-vocabulary:** No fixed categories",
      "**3D understanding:** BEV, occupancy, scene graphs",
      "**Multimodal:** Language + vision detection",
      "**Edge deployment:** Efficient models for mobile/embedded",
      "**Self-supervised:** Reduce annotation dependency"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Moving from closed-set (80 COCO classes) to open-set (any object described in language). Foundation models shifting paradigm from task-specific to general-purpose perception."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

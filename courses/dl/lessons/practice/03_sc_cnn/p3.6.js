/* ============================================================================
   PRACTICE P3.6 — CNNs and Computer Vision · 6
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/02_CNNs_and_Computer_Vision.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.6",
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
   "n": "126",
   "q": "What is video classification with deep learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**2D CNN + temporal pooling:** Extract frame features, aggregate",
      "**3D CNN (C3D, I3D):** 3D convolutions over spatial + temporal",
      "**Two-stream:** Spatial stream (RGB) + temporal stream (optical flow)",
      "**Video Transformers (ViViT, TimeSformer):** Attention over space-time patches",
      "**SlowFast:** Two pathways at different temporal resolutions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Trade-off: 3D models capture temporal dynamics but are expensive. 2D+aggregation is efficient but misses fine-grained motion."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "127",
   "q": "What is the CLIP model and why is it significant?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "CLIP (Contrastive Language-Image Pre-training):\n1. Image encoder → image embedding\n2. Text encoder → text embedding\n3. Contrastive learning: match image-text pairs\n\nZero-shot classification:\n- Encode: \"a photo of a cat\", \"a photo of a dog\"\n- Encode test image\n- Classify by closest text embedding"
    },
    {
     "t": "p",
     "text": "**Significance:** No task-specific training needed. Open-vocabulary recognition. Foundation for DALL-E, Stable Diffusion text conditioning."
    },
    {
     "t": "p",
     "text": "**Explanation:** CLIP bridges vision and language — any text can describe what to detect/classify."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "128",
   "q": "What is the difference between pooling strategies in CNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Max Pooling: Take maximum value in window\n   → Captures strongest activation, translation invariant\n\nAverage Pooling: Take mean value in window\n   → Smoother, preserves more information\n\nGlobal Average Pooling (GAP): Average entire feature map to single value\n   → Replaces FC layers, reduces parameters, prevents overfitting\n\nAdaptive Pooling: Auto-adjust pool size for target output size\n   → torch.nn.AdaptiveAvgPool2d((1, 1))"
    },
    {
     "t": "p",
     "text": "**Explanation:** GAP is preferred over FC layers for classification — fewer params, better generalization. Strided convolutions are also used instead of explicit pooling."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "129",
   "q": "What is the role of batch normalization in vision models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "BN(x) = γ * (x - μ_batch) / √(σ²_batch + ε) + β\n\nDuring training: μ, σ² computed from current batch\nDuring inference: use running mean/variance from training"
    },
    {
     "t": "p",
     "text": "**Benefits:**"
    },
    {
     "t": "ol",
     "items": [
      "Stabilizes training (normalizes internal representations)",
      "Allows higher learning rates",
      "Acts as regularization (batch statistics add noise)"
     ]
    },
    {
     "t": "p",
     "text": "**Issues:** Small batch sizes → noisy statistics. Alternative: Layer Norm, Group Norm, Instance Norm."
    },
    {
     "t": "p",
     "text": "**Explanation:** GroupNorm better for detection (small batch due to high-res images). InstanceNorm for style transfer. LayerNorm for Transformers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "130",
   "q": "What is the Segment Anything Model (SAM)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "SAM (Meta AI):\n1. Image Encoder: ViT → image embeddings (runs once per image)\n2. Prompt Encoder: Point, box, text, or mask → prompt embeddings\n3. Mask Decoder: Combines image + prompt → segmentation mask\n\nPrompts: click a point, draw a box, or describe in text"
    },
    {
     "t": "p",
     "text": "**Significance:** Foundation model for segmentation — segment ANY object with simple prompts. Zero-shot to new domains."
    },
    {
     "t": "p",
     "text": "**Explanation:** Trained on 11M images, 1.1B masks (SA-1B dataset). Represents shift toward foundation models for vision tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "131",
   "q": "What is the role of data augmentation in preventing overfitting for vision models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Without augmentation: Model sees exact same images → memorizes\nWith augmentation: Model sees varied versions → learns invariances\n\nExample training pipeline:\ntransforms.Compose([\n    transforms.RandomResizedCrop(224),\n    transforms.RandomHorizontalFlip(),\n    transforms.ColorJitter(0.4, 0.4, 0.4, 0.1),\n    transforms.RandomGrayscale(p=0.2),\n    transforms.GaussianBlur(kernel_size=23),\n    transforms.ToTensor(),\n    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])\n])"
    },
    {
     "t": "p",
     "text": "**Explanation:** The right augmentation depends on the task. Don't flip medical images where left/right matters. Don't color jitter for color-based classification."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "132",
   "q": "What is the difference between upsampling methods in decoder networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Bilinear interpolation:** Fixed, smooth upsampling",
      "**Nearest neighbor:** Copy values, blocky but simple",
      "**Transposed convolution (deconv):** Learnable, can produce checkerboard artifacts",
      "**Pixel shuffle (sub-pixel conv):** Rearrange channels to spatial resolution — artifact-free",
      "**Upsampling + Conv:** Resize then convolve — avoids checkerboard"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Transposed conv is popular but can cause checkerboard patterns. Bilinear + conv or pixel shuffle are more stable alternatives."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "133",
   "q": "What is the EfficientNet family of models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Compound Scaling:\n- Width (channels per layer)\n- Depth (number of layers)\n- Resolution (input image size)\n\nEfficientNet scales all three simultaneously with fixed ratio:\ndepth = α^φ, width = β^φ, resolution = γ^φ\nwhere α·β²·γ² ≈ 2\n\nB0 → B1 → B2 → ... → B7 (increasing scale)\nB0: 5.3M params, 77% ImageNet\nB7: 66M params, 84.3% ImageNet"
    },
    {
     "t": "p",
     "text": "**Explanation:** Rather than just making models deeper or wider, compound scaling optimizes all dimensions together — more efficient use of parameters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "134",
   "q": "What is the role of deformable convolutions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard Conv: Fixed grid sampling\nDeformable Conv: Learned offset for each sampling position\n\nStandard: sample at fixed positions around center\nDeformable: sample at learned positions (can adapt to object shape)\n\nStandard grid:     Deformable grid:\n□ □ □              □  □   □\n□ □ □              □   □  □\n□ □ □                □ □ □"
    },
    {
     "t": "p",
     "text": "**Explanation:** Deformable convolutions adapt receptive field to object shape — better for non-rigid objects, varying scales. Used in DCN-based detectors."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "135",
   "q": "What is multi-scale testing (test-time augmentation) for vision?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def tta_predict(model, image, scales=[0.5, 1.0, 1.5]):\n    predictions = []\n    for scale in scales:\n        resized = resize(image, scale)\n        pred = model(resized)\n        pred_original = resize_back(pred, original_size)\n        predictions.append(pred_original)\n        \n        # Also add flipped version\n        flipped = flip(resized)\n        pred_flip = model(flipped)\n        pred_flip = unflip(resize_back(pred_flip, original_size))\n        predictions.append(pred_flip)\n    \n    return average(predictions)"
    },
    {
     "t": "p",
     "text": "**Explanation:** TTA improves accuracy by 1-3% at the cost of N× inference time. Used in competitions and when accuracy matters more than speed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "136",
   "q": "What is the difference between ResNet and DenseNet connectivity patterns?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "ResNet: Skip connection (addition)\n   x → [Conv → BN → ReLU → Conv → BN] → (+x) → ReLU\n   \nDenseNet: Dense connection (concatenation)\n   x₁ → [Conv] → x₂\n   [x₁, x₂] → [Conv] → x₃\n   [x₁, x₂, x₃] → [Conv] → x₄\n   Each layer receives all previous feature maps"
    },
    {
     "t": "p",
     "text": "**DenseNet advantages:** Feature reuse, strong gradient flow, fewer parameters."
    },
    {
     "t": "p",
     "text": "**DenseNet disadvantage:** High memory usage (storing all intermediate features)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "137",
   "q": "What is the panoptic segmentation task?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Combines semantic + instance segmentation:\n- \"Things\" (countable objects): Cars, people → instance segmentation\n- \"Stuff\" (amorphous regions): Sky, road, grass → semantic segmentation\n\nPanoptic Quality (PQ) = SQ × RQ\nSQ: Segmentation Quality (average IoU of matched segments)\nRQ: Recognition Quality (F1 of matched vs unmatched segments)"
    },
    {
     "t": "p",
     "text": "**Models:** Panoptic FPN, MaskFormer, Mask2Former."
    },
    {
     "t": "p",
     "text": "**Explanation:** Provides complete scene understanding — every pixel is labeled with semantic class AND instance ID."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "138",
   "q": "What is the role of feature visualization for understanding CNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Activation maximization:** Generate input that maximally activates a neuron",
      "**Grad-CAM:** Gradient-weighted class activation maps show where model looks",
      "**Feature maps:** Visualize intermediate layer outputs",
      "**Filters:** Visualize first-layer conv filters (edge detectors, color blobs)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** CNN layers learn hierarchical features: edges → textures → parts → objects. Grad-CAM helps debug — if model focuses on wrong region, it learned a shortcut."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "139",
   "q": "What is the anchor-free detection approach of CenterNet?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Predict heatmap of object centers (keypoint detection)\n2. For each center peak, predict:\n   - Width and height\n   - Offset for sub-pixel accuracy\n3. No anchor boxes, no NMS (peaks are by definition non-overlapping)\n\nOutput: Heatmap (H/4 × W/4 × C) + Size (H/4 × W/4 × 2) + Offset (H/4 × W/4 × 2)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Elegantly simple — detection as keypoint estimation. No anchor hyperparameters, no NMS post-processing. Extends to 3D detection, pose estimation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "140",
   "q": "What is the Swin Transformer for vision?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Key innovations:\n1. Shifted Window attention: Limit attention to local windows (efficient)\n2. Window shifting: Shift window positions between layers (cross-window connections)\n3. Hierarchical: Merge patches at each stage (like CNN pooling)\n4. Linear complexity: O(n) instead of ViT's O(n²) for attention\n\nStage 1: 56×56, dim=96\nStage 2: 28×28, dim=192  (merge 2×2 patches)\nStage 3: 14×14, dim=384\nStage 4: 7×7, dim=768"
    },
    {
     "t": "p",
     "text": "**Explanation:** Swin Transformer provides hierarchical features (like CNN) with transformer attention — ideal for dense prediction tasks (detection, segmentation)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "141",
   "q": "What is GAN-based image-to-image translation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Pix2Pix:** Paired training data. Input-output image pairs."
    },
    {
     "t": "p",
     "text": "**CycleGAN:** Unpaired training data. Cycle consistency loss."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "CycleGAN loss:\nG: A→B, F: B→A\nCycle: F(G(a)) ≈ a and G(F(b)) ≈ b\nNo paired data needed!"
    },
    {
     "t": "p",
     "text": "**Applications:** Photo → painting, horse → zebra, day → night, sketch → photo."
    },
    {
     "t": "p",
     "text": "**Explanation:** CycleGAN is groundbreaking for unpaired translation — just needs collections of images from each domain, not matched pairs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "142",
   "q": "What is knowledge distillation specifically for vision models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Vision distillation\nteacher = ResNet152(pretrained=True)  # Large, accurate\nstudent = ResNet18()  # Small, efficient\n\n# Distillation loss\nT = 4  # temperature\nteacher_logits = teacher(images) / T\nstudent_logits = student(images) / T\n\nloss = α * CE(student_logits * T, labels) + \\\n       (1-α) * KL(softmax(teacher_logits), softmax(student_logits)) * T²"
    },
    {
     "t": "p",
     "text": "**Additional:** Feature distillation — match intermediate feature maps."
    },
    {
     "t": "p",
     "text": "**Explanation:** DeiT (Data-efficient Image Transformer) uses distillation from CNN teacher to help ViT train on smaller datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "143",
   "q": "What is few-shot learning for visual recognition?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "N-way K-shot classification:\n- N classes, K examples per class (K = 1 or 5 typically)\n\nApproaches:\n1. Metric learning: Learn similarity function (Siamese, Prototypical Networks)\n2. Meta-learning: MAML — learn initialization that adapts in few gradient steps\n3. Transfer: Pre-train on large dataset, fine-tune on few examples\n4. Foundation models: CLIP zero-shot or few-shot with prompts"
    },
    {
     "t": "p",
     "text": "**Explanation:** Real-world: new product categories appear frequently, can't collect thousands of examples for each. Few-shot handles this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "144",
   "q": "What is the difference between image restoration tasks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Task",
      "Input",
      "Output",
      "Models"
     ],
     "rows": [
      [
       "Denoising",
       "Noisy image",
       "Clean image",
       "DnCNN, NAFNet"
      ],
      [
       "Deblurring",
       "Blurry image",
       "Sharp image",
       "DeblurGAN, Restormer"
      ],
      [
       "Inpainting",
       "Image with holes",
       "Complete image",
       "LaMa, SD-Inpainting"
      ],
      [
       "Super-resolution",
       "Low-res",
       "High-res",
       "ESRGAN, Real-ESRGAN"
      ],
      [
       "Dehazing",
       "Hazy image",
       "Clear image",
       "DehazeNet, AOD-Net"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** All are ill-posed inverse problems — multiple solutions exist. DL learns priors from data to choose most plausible solution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "145",
   "q": "What is 3D object detection from point clouds?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: 3D point cloud from LiDAR (x, y, z, intensity per point)\nOutput: 3D bounding boxes (x, y, z, w, h, l, θ)\n\nApproaches:\n1. Point-based (PointNet++): Process raw points directly\n2. Voxel-based (VoxelNet): Convert points to 3D voxel grid, apply 3D CNN\n3. Pillar-based (PointPillars): Project to 2D pillars, efficient\n4. BEV (Bird's Eye View): Project to top-down view, apply 2D detection"
    },
    {
     "t": "p",
     "text": "**Explanation:** Critical for autonomous driving. LiDAR provides accurate depth. Camera + LiDAR fusion (BEVFusion) combines RGB appearance with 3D geometry."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "146",
   "q": "What is the role of the loss function in object detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Total Detection Loss = L_classification + L_regression + L_objectness\n\nClassification: Cross-entropy or Focal loss\nRegression (box): L1, Smooth-L1, IoU loss, GIoU, DIoU, CIoU\nObjectness: Binary CE (is this an object?)\n\nCIoU loss combines:\n- Overlap (IoU)\n- Center distance\n- Aspect ratio consistency"
    },
    {
     "t": "p",
     "text": "**Explanation:** IoU-based losses (GIoU, CIoU) directly optimize for the evaluation metric, unlike L1/L2 which optimize coordinate distances."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "147",
   "q": "What is neural radiance fields (NeRF)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "NeRF: 3D scene representation as a continuous function\nInput: 3D position (x,y,z) + viewing direction (θ,φ)\nOutput: Color (r,g,b) + density (σ)\n\nRendering:\n1. Cast ray through each pixel\n2. Sample points along ray\n3. Query MLP at each point → (color, density)\n4. Volume rendering: composite colors weighted by density\n\nTraining: Only needs posed 2D images → learns 3D representation"
    },
    {
     "t": "p",
     "text": "**Explanation:** NeRF synthesizes novel viewpoints from 2D photos. Applications: virtual tours, AR, movie VFX. 3D Gaussian Splatting is newer, faster alternative."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "148",
   "q": "What is the difference between model-centric and data-centric approaches in CV?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Model-centric:** Fix data, improve models (better architecture, more parameters)",
      "**Data-centric:** Fix model, improve data quality",
      "— Better annotations, cleaner labels, targeted augmentation",
      "— Identify and fix labeling errors",
      "— Collect more data for underperforming categories"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Andrew Ng advocates data-centric AI. In practice, improving data quality often yields more gains than model improvements. A good model on bad data loses to an okay model on good data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "149",
   "q": "What is the difference between CNN and ViT for feature extraction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "CNN",
      "ViT"
     ],
     "rows": [
      [
       "Inductive bias",
       "Locality, translation equivariance",
       "None (learns from data)"
      ],
      [
       "Receptive field",
       "Gradually increases with depth",
       "Global from first layer"
      ],
      [
       "Data efficiency",
       "Better with limited data",
       "Needs large pre-training dataset"
      ],
      [
       "Feature hierarchy",
       "Natural (pooling stages)",
       "Flat (same resolution)"
      ],
      [
       "Texture vs shape",
       "Biased toward texture",
       "Learns more shape-based features"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Hybrid models (ConvNeXt, CoAtNet) combine CNN inductive biases with Transformer flexibility — often best of both worlds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "150",
   "q": "What are the current trends in computer vision?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Foundation models:** SAM, CLIP, DINOv2 — general-purpose vision models",
      "**Vision-Language models:** GPT-4V, LLaVA, Gemini — unified vision-language understanding",
      "**Diffusion models:** Image/video generation and editing",
      "**3D vision:** NeRF, 3D Gaussian Splatting, point cloud transformers",
      "**Video understanding:** Long-form video, temporal reasoning",
      "**Efficient vision:** Mobile deployment, edge AI",
      "**Embodied AI:** Robot perception, manipulation from vision"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** CV is shifting from task-specific models to foundation models + task-specific prompting/fine-tuning.  The convergence of vision and language is the dominant trend."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

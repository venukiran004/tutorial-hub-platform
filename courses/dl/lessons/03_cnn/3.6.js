/* ============================================================================
   LESSON 3.6 — Object Detection
   ========================================================================= */
EC.receiveLesson({
  id: "3.6",

  lede: "**Detection adds one thing to classification — *where* — and that one thing brings a metric (IoU), a post-processing step (NMS), an evaluation protocol (mAP), a sampling problem (1.6 % of anchors are positive) and two families of architectures that solve the sampling problem differently.** Every piece is built here from nothing: IoU on four boxes, NMS matching torchvision's, average precision computed step by step over six detections, 576 anchors matched to two objects, focal loss taking the easy negatives from 85 % of the loss to 4 %, a single-object detector trained on synthetic shapes (mean IoU 0.72 with L1, 0.81 with L1 + GIoU), and DETR's Hungarian matching on a cost matrix you can read.",

  objectives: [
    "Compute IoU and NMS by hand, and know the soft and class-aware variants",
    "Generate anchors, match them to ground truth, and write the box-regression targets",
    "Compute average precision from a ranked list of detections and the COCO mAP over IoU thresholds",
    "Explain why focal loss and hard-negative mining exist, with the anchor-imbalance numbers",
    "Place the two-stage (R-CNN → Faster R-CNN, RoI Align, FPN) and one-stage (YOLO, SSD, RetinaNet) families and DETR, and train a minimal detector with L1 and GIoU losses"
  ],

  prerequisites: ["3.4", "1.3"],

  blocks: [

    { t: "h2", n: "01", text: "IoU", id: "iou" },

    { t: "code", lang: "text", title: "Intersection over union on numbers (executed)",
      code: `A = [10, 10, 50, 50]   B = [30, 30, 70, 70]      (x1, y1, x2, y2)
intersection = [30, 30, 50, 50] = 20 × 20 = 400
union        = 1600 + 1600 − 400 = 2800
IoU          = 400 / 2800 = 0.1429             torchvision.ops.box_iou: 0.1429

A vs C = [10, 10, 40, 60]:  0.6316       A vs itself: 1.0       A vs [60, 60, 80, 80]: 0.0 (no overlap)`,
      caption: "IoU is scale-invariant and bounded in [0, 1], which is why it is the standard for 'is this the same object'. Its weakness as a *loss* is that it is zero, with zero gradient, whenever boxes do not overlap — GIoU below adds a term that fixes that." },

    { t: "h2", n: "02", text: "Non-maximum suppression", id: "nms" },

    { t: "code", lang: "python", title: "NMS by hand, and torchvision's (executed)",
      code: `def nms(boxes, scores, thr):
    order = argsort(-scores); keep = []
    while order:
        i = order[0]; keep.append(i)
        order = [j for j in order[1:] if iou(boxes[i], boxes[j]) < thr]    # drop everything that overlaps the winner
    return keep

six boxes, scores [0.9, 0.85, 0.6, 0.95, 0.7, 0.5], IoU threshold 0.5:
  kept: [3, 0, 5]  (scores 0.95, 0.9, 0.5)          torchvision.ops.nms: [3, 0, 5]
  box 1 (IoU 0.82 with box 0) suppressed; box 5 (IoU 0.14 with box 0) survives
soft-NMS (Gaussian, σ = 0.5): decays overlapping scores instead of deleting -> [(3, 0.95), (0, 0.9), (5, 0.48), (2, 0.21), (4, 0.18), (1, 0.08)]
batched (per-class) NMS with box 2 labelled a different class: [3, 0, 2, 5]   -- suppression only within a class`,
      caption: "A detector proposes many overlapping boxes for each object; NMS keeps the highest-scoring one per cluster. Soft-NMS (Bodla et al., 2017) helps when two real objects overlap heavily — a deleted box is gone, a decayed one can still be recovered at a lower threshold. Class-aware NMS suppresses only within a class, so a person and the bicycle they are on both survive." },

    { t: "h2", n: "03", text: "Anchors and matching", id: "anchors" },

    { t: "p", text: "A dense detector cannot regress a box from nothing at every position; it starts from a set of reference boxes — anchors — of several sizes and aspect ratios at every cell of a feature map, and predicts for each an objectness/class score and four offsets:" },

    { t: "code", lang: "text", title: "Anchors on an 8 × 8 feature map at stride 16 (executed)",
      code: `3 sizes (32, 64, 128) × 3 aspect ratios (0.5, 1, 2) at 64 positions = 576 anchors on a 128 × 128 image
first three (centre 8, 8):  [−3.3, −14.6, 19.3, 30.6]  [−8, −8, 24, 24]  [−14.6, −3.3, 30.6, 19.3]

matching to two ground-truth boxes:  9 positive anchors (IoU ≥ 0.5),  544 negative (< 0.4),  23 ignored (between)
  best anchor IoU per object: 0.761, 0.488            positives are 1.6 % of anchors
regression targets for the best anchor of object 0:  tx = −0.094  ty = −0.016  tw = −0.065  th = 0.090
  (t_x = (g_x − a_x)/a_w,  t_y likewise,  t_w = log(g_w/a_w),  t_h = log(g_h/a_h):  offsets relative to the anchor, log-scale for size)`,
      caption: "Nine anchors out of 576 are positives; the rest are background. That 60:1 ratio — 1000:1 in a real detector with 100k anchors — is the central difficulty of one-stage detection. The log parameterisation of width and height keeps the regression targets in a small range and the predicted boxes positive." },

    { t: "dl", items: [
      ["Anchor-based", "Faster R-CNN's RPN, SSD, YOLOv2–v5, RetinaNet: predictions are offsets from reference boxes; hyperparameters are the sizes and ratios, which must match the dataset's objects."],
      ["Anchor-free", "FCOS, CenterNet, YOLOX/v8: each feature-map location predicts whether it is inside an object and the distances to the box's four sides (or a centre heatmap and a size). No anchor design; matching by centre-ness or by a learned assignment (SimOTA, TAL)."],
      ["Ignored region", "Anchors with IoU between the negative and positive thresholds are excluded from the classification loss; forcing them to be background would teach the detector to reject near-misses."]
    ] },

    { t: "h2", n: "04", text: "Average precision, computed", id: "map" },

    { t: "p", text: "Detection is evaluated per class by ranking every detection across the dataset by score, walking down the list marking each as a true positive (IoU ≥ threshold with an unmatched ground-truth box) or a false positive, and integrating precision over recall:" },

    { t: "code", lang: "text", title: "Three ground-truth boxes, six detections, AP at IoU 0.5 (executed)",
      code: `score   image   TP?    recall   precision
0.95    0       yes    0.333    1.000
0.90    0       yes    0.667    1.000
0.80    0       no     0.667    0.667        <- a false positive lowers precision, recall stays
0.70    1       yes    1.000    0.750
0.60    1       no     1.000    0.600        <- a second box on an already-matched object counts as FP
0.30    0       no     1.000    0.500        <- a duplicate of the first object: FP

AP@0.5 = 0.9167   (area under the interpolated precision–recall curve: precision held at its maximum to the right)
AP@0.75 = 0.9167          COCO AP@[.5:.95] (mean over thresholds 0.5, 0.55, …, 0.95) = 0.6528`,
      caption: "Interpolation makes precision monotone non-increasing in recall (each point takes the best precision at any higher recall) before the area is taken. Mean AP averages over classes. COCO's headline metric averages over ten IoU thresholds, rewarding tight boxes — here the fourth detection's IoU of 0.78 stops counting above 0.75 and the metric falls from 0.92 to 0.65." },

    { t: "table", head: ["Metric", "Definition", "Use"],
      rows: [
        ["AP@0.5 (PASCAL VOC)", "AP with IoU ≥ 0.5 counting as a hit", "Lenient; localisation barely matters"],
        ["AP@[.5:.95] (COCO)", "Mean AP over IoU thresholds 0.5 to 0.95 in steps of 0.05", "The standard; rewards precise boxes"],
        ["AP_S / AP_M / AP_L", "COCO AP restricted to small (< 32²), medium, large objects", "Where FPN and resolution matter"],
        ["AR@k", "Average recall with at most k detections per image", "Proposal quality (RPN), recall-critical uses"]
      ] },

    { t: "h2", n: "05", text: "The imbalance and focal loss", id: "focal" },

    { t: "code", lang: "text", title: "10,000 anchors, 100 positives; the model gives p = 0.05 to negatives and 0.4 to positives (executed)",
      code: `cross-entropy:   negatives 507.8  vs positives 91.6    -> negatives are 85 % of the loss
focal, γ = 2:    negatives   1.27 vs positives 33.0    -> negatives are  4 %
focal, γ = 2, α = 0.25 on positives / 0.75 on negatives:   negatives 10 %`,
      caption: "Each easy negative contributes little, but there are 9,900 of them. Focal loss (Lin et al., 2017, lesson 1.3) multiplies each term by (1 − pₜ)^γ, which silences the confidently-classified background and lets the hundred positives and the hard negatives drive the gradient. RetinaNet showed this alone made a one-stage detector match two-stage accuracy. The older answer is hard-negative mining: keep only the highest-loss negatives at a fixed ratio (SSD uses 3:1)." },

    { t: "h2", n: "06", text: "The families", id: "families" },

    { t: "dl", items: [
      ["R-CNN (2014)", "External region proposals (selective search, ~2,000 per image), each warped and classified by a CNN separately. Accurate and impossibly slow — 47 s per image."],
      ["Fast R-CNN (2015)", "One CNN pass over the whole image; proposals are cropped from the feature map by RoI pooling and classified by a shared head. Proposals still external."],
      ["Faster R-CNN (2015)", "The Region Proposal Network: a small conv head on the feature map predicts objectness and offsets for anchors, replacing selective search. Two stages — propose, then classify and refine — end to end. RoI Align (Mask R-CNN) replaces RoI pooling's quantised cropping with bilinear sampling, fixing misalignment that mattered for masks."],
      ["FPN (2017)", "A top-down pathway with lateral connections builds a pyramid of feature maps at strides 4–64 that are all semantically strong; small objects are detected on the high-resolution levels. Standard in both families."],
      ["YOLO (2016→)", "One stage: divide the image into a grid, each cell predicts boxes and classes directly. v1 had no anchors; v2–v5 added anchors, BatchNorm, multi-scale training, PANet necks; v8 and YOLOX are anchor-free with decoupled heads. Speed is the design goal."],
      ["SSD, RetinaNet", "Multi-scale anchors on a pyramid; SSD with hard-negative mining, RetinaNet with focal loss and an FPN. RetinaNet is the one-stage reference architecture."],
      ["DETR (2020)", "A transformer decoder with N learned object queries attends to the image features and outputs N (class, box) predictions in parallel; training matches predictions to objects one-to-one by the Hungarian algorithm, so there are no anchors and no NMS. Slow to converge originally; Deformable DETR and DINO fixed that."]
    ] },

    { t: "code", lang: "text", title: "DETR's bipartite matching on a toy example (executed)",
      code: `4 queries, 2 objects.  cost(query, object) = −p(class) + 5·L1(box) + 2·(1 − IoU)
              object 0   object 1
query 0        0.10      12.30
query 1       11.80       0.12
query 2        7.10       7.20
query 3        9.61       7.48
Hungarian assignment (scipy.optimize.linear_sum_assignment): query 0 → object 0, query 1 → object 1
queries 2 and 3 are unmatched and are trained to predict "no object"`,
      caption: "Because each object is assigned to exactly one query, the model learns not to produce duplicates and NMS becomes unnecessary. The matching cost mirrors the training loss (class probability, L1 on box coordinates, GIoU), which is also the loss combination measured on the small detector below." },

    { t: "table", head: ["", "Two-stage (Faster R-CNN)", "One-stage (RetinaNet / YOLO)", "Set prediction (DETR)"],
      rows: [
        ["Proposals", "RPN, then refine", "Dense anchors or points", "Learned queries"],
        ["Imbalance handling", "RPN sampling (256 anchors, 1:1) + RoI sampling", "Focal loss / hard-negative mining", "One-to-one matching"],
        ["Post-processing", "NMS", "NMS", "None"],
        ["Speed", "Slower", "Fast (YOLO: real time)", "Depends; slow original training"],
        ["Strength", "Accuracy, small objects with FPN", "Speed–accuracy trade-off", "Simplicity, no hand-designed components"]
      ] },

    { t: "h2", n: "07", text: "A minimal detector, trained", id: "minimal" },

    { t: "code", lang: "text", title: "Single-object localisation on synthetic 48 × 48 images (a square or a disc at a random place and size), 3,000 training images, 8 epochs (executed)",
      code: `head: box (cx, cy, w, h) through a sigmoid, plus a 2-class score;  classification accuracy 1.000 in every run

box loss                            mean IoU    IoU ≥ 0.5    IoU ≥ 0.75
smooth-L1 (×10)                     0.717       88.0 %       51.8 %
GIoU only                           0.780       90.0 %       72.8 %
L1 ×5 + GIoU ×2 (DETR's weights)    0.806       92.2 %       77.2 %      (class accuracy 0.668 here: the box terms dominated the shared features in 8 epochs)

first attempt, box as raw (x1, y1, x2, y2) through a sigmoid, GIoU loss:  mean IoU 0.000
  -- a predicted box with x2 < x1 has zero area and zero IoU gradient; the parameterisation must guarantee a valid box`,
      caption: "L1 on coordinates penalises every corner equally whether the box is large or small; GIoU (Rezatofighi et al., 2019) optimises the overlap itself and adds an enclosing-box term so non-overlapping boxes still get a gradient — it raised the tight-box rate from 52 % to 73 %. The failed first attempt is the practical lesson: IoU-based losses need a box parameterisation that cannot produce an inverted box, which is why detectors predict centre and size." },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "In the AP computation, the detection with score 0.60 on image 1 was marked a false positive although its IoU with the object was high. Why?",
          options: [
            "Its score was below 0.7",
            "The object had already been matched by the 0.70 detection; each ground-truth box may be claimed once, so a second detection of the same object is a duplicate and counts as a false positive — which is what NMS exists to prevent",
            "Image 1 has no ground truth",
            "The IoU threshold was 0.75"
          ],
          answer: 1,
          why: "The protocol matches greedily in score order and forbids double-claiming. Duplicates therefore cost precision at every recall level after them, and the measured AP of 0.9167 rather than 1.0 is the price of the three false positives."
        },
        {
          stem: "Why did the GIoU loss give mean IoU 0.000 with raw (x1, y1, x2, y2) outputs and 0.780 with (cx, cy, w, h)?",
          options: [
            "GIoU only works with centre coordinates by definition",
            "With raw corners a random initial prediction often has x2 < x1 or y2 < y1 — an inverted box of zero area, whose IoU and GIoU gradients vanish — so the network never leaves that state; a centre-and-size parameterisation through a sigmoid always yields a valid box",
            "The learning rate was too low for the first attempt",
            "The sigmoid saturated"
          ],
          answer: 1,
          why: "Overlap-based losses are only informative for boxes that could overlap. Every practical detector predicts offsets from an anchor or a centre with a log or sigmoid size for exactly this reason; the failed run makes the reason concrete."
        },
        {
          stem: "What does DETR's one-to-one matching replace, and what does it require?",
          options: [
            "It replaces the backbone; it requires a transformer encoder",
            "It replaces anchors and NMS: each object is assigned to exactly one of N queries by the Hungarian algorithm on a cost combining class probability, L1 and GIoU, so the network learns not to duplicate; it requires N to exceed the maximum object count and a matching step at every training iteration",
            "It replaces the loss function; it requires focal loss",
            "It replaces the FPN; it requires a single scale"
          ],
          answer: 1,
          why: "The toy cost matrix shows the assignment: the two queries whose predictions are close to the objects are matched, the other two are trained toward 'no object'. The set-prediction view removes every hand-designed component of the anchor pipeline at the cost of harder optimisation."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "IoU, NMS, mAP and a detector from nothing",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Implement iou(a, b) and nms(boxes, scores, thr) and check both against torchvision.ops on the six boxes of section 02. Add a Gaussian soft-NMS." },
        { t: "p", text: "**(b)** Implement average precision with all-point interpolation and compute AP@0.5, AP@0.75 and the COCO-style mean over thresholds for the six detections and three ground-truth boxes of section 04." },
        { t: "p", text: "**(c)** Generate 3,000 synthetic 48 × 48 images with one square or disc each. Train a small CNN with a (cx, cy, w, h) sigmoid box head and a 2-class head for 8 epochs under three box losses — smooth-L1, GIoU, and 5·L1 + 2·GIoU — and report mean IoU and the fractions at IoU ≥ 0.5 and ≥ 0.75 on 500 held-out images." }
      ],
      requirements: [
        "(a) matching keep-lists and the soft-NMS scores.",
        "(b) three AP values.",
        "(c) a 3 × 3 table."
      ],
      hint: "(b) After computing precision and recall at each detection, prepend (0, 0) and append recall 1; run backwards making precision the running maximum; sum precision × Δrecall where recall changes. (c) Convert (cx, cy, w, h) to corners before computing IoU; GIoU needs the enclosing box's area.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) nms by hand [3, 0, 5] == torchvision [3, 0, 5];  soft-NMS: (3, 0.95) (0, 0.90) (5, 0.48) (2, 0.21) (4, 0.18) (1, 0.08)

# (b) AP@0.5 = 0.9167   AP@0.75 = 0.9167   AP@[.5:.95] = 0.6528

# (c) box loss                        mean IoU   ≥ 0.5    ≥ 0.75
#     smooth-L1 (×10)                 0.717      88.0 %   51.8 %
#     GIoU only                       0.780      90.0 %   72.8 %
#     L1 ×5 + GIoU ×2                 0.806      92.2 %   77.2 %   (class accuracy fell to 0.668 -- the box terms need re-weighting or more epochs)`,
        notes: [
          { t: "p", text: "(a) and (b) are the evaluation stack every detector is judged by; writing them once makes the numbers in papers legible." },
          { t: "p", text: "(c) is a detector reduced to its two heads. The loss comparison — and the class-accuracy drop under DETR's weights — is a real multi-task balancing problem in miniature." }
        ]
      }
    }
  ],

  takeaways: [
    "IoU = intersection / union (0.1429 for the worked pair); NMS keeps the highest-scoring box per overlapping cluster ([3, 0, 5], matching torchvision); soft-NMS decays instead of deleting; class-aware NMS suppresses within a class only.",
    "Anchors are reference boxes at every feature-map cell (576 on an 8 × 8 map with 3 sizes × 3 ratios); matching by IoU gave 9 positives, 544 negatives and 23 ignored — 1.6 % positive — and the regression targets are offsets relative to the anchor with log-scaled size.",
    "AP ranks all detections by score, marks each TP or FP (each ground-truth box claimable once), interpolates precision to be monotone, and integrates over recall: 0.9167 at IoU 0.5 here, 0.6528 averaged over COCO's ten thresholds.",
    "The positive–negative imbalance is the one-stage problem: cross-entropy put 85 % of the loss on 9,900 easy negatives, focal loss with γ = 2 put 4 % there. Two-stage detectors solve it by sampling proposals; DETR by one-to-one matching.",
    "Two-stage (Faster R-CNN with RPN, RoI Align, FPN) is the accuracy reference; one-stage (YOLO, SSD, RetinaNet) the speed reference; DETR replaces anchors and NMS with learned queries and Hungarian matching on a cost of class, L1 and GIoU.",
    "On a synthetic single-object task, GIoU raised the tight-box rate from 52 % to 73 % over smooth-L1 and L1 + GIoU to 77 %; with raw corner outputs GIoU failed completely (mean IoU 0.000) because inverted boxes have no gradient — predict centre and size."
  ],

  quiz: {
    title: "Object Detection — Knowledge Check",
    questions: [
      {
        stem: "What is the difference between object detection and image classification in what the network must output?",
        options: [
          "Detection outputs a segmentation mask",
          "Classification outputs one label per image; detection outputs a variable number of (box, class, score) triples, which forces a fixed-size prediction scheme (anchors, grid cells or queries), a matching rule to assign targets, and post-processing (NMS) or a matching loss to remove duplicates",
          "Detection outputs only boxes, without classes",
          "There is no difference in the output; only the loss differs"
        ],
        answer: 1,
        why: "The variable-size output is the root of every detection-specific component. Anchors and grids make it fixed-size and dense; DETR makes it fixed-size with N queries and a set loss."
      },
      {
        stem: "What problem does RoI Align fix relative to RoI pooling?",
        options: [
          "Speed",
          "Quantisation: RoI pooling snaps proposal coordinates and bin boundaries to the feature-map grid, misaligning the crop by up to a stride's worth of pixels; RoI Align samples each bin at exact fractional positions with bilinear interpolation, which mattered little for boxes and a great deal for Mask R-CNN's pixel-accurate masks",
          "Class imbalance",
          "The number of proposals"
        ],
        answer: 1,
        why: "A stride-16 feature map rounds a proposal edge by up to eight input pixels. Boxes tolerate that; masks do not, and RoI Align's introduction in Mask R-CNN lifted mask AP substantially and box AP slightly."
      },
      {
        stem: "Why does an FPN help small objects?",
        options: [
          "It increases the input resolution",
          "It produces high-resolution feature maps (stride 4 or 8) that are also semantically strong, by adding a top-down pathway that carries deep features back up and merges them laterally with shallow ones; small objects are detected on those levels, where a stride-32 map would have them at a fraction of a cell",
          "It adds more anchors per cell",
          "It uses dilated convolutions"
        ],
        answer: 1,
        why: "Shallow maps have the resolution but weak features; deep maps the reverse. The pyramid gives every level both, and COCO's AP_S is where the gain shows."
      },
      {
        stem: "Which statement about YOLO's design is correct?",
        options: [
          "It uses region proposals from a separate network",
          "It is a one-stage detector: the image is divided into a grid and each cell (with anchors in v2–v5, anchor-free in v8/YOLOX) directly predicts boxes, objectness and classes in a single pass, trading some accuracy on small objects for real-time speed",
          "It requires no post-processing",
          "It cannot detect multiple objects per image"
        ],
        answer: 1,
        why: "Single pass, dense prediction, NMS afterwards. Later versions added FPN/PANet necks, multi-scale training and decoupled heads; the one-stage principle is what has stayed."
      },
      {
        stem: "How does COCO's AP@[.5:.95] differ from PASCAL's AP@0.5, and what did the toy example show?",
        options: [
          "It uses a different interpolation only",
          "It averages AP over IoU thresholds from 0.5 to 0.95, so detections must be tightly localised to score at the higher thresholds; the toy example fell from 0.9167 at 0.5 to 0.6528 averaged, because a box at IoU 0.78 stops counting above 0.75",
          "It counts small objects double",
          "It is always higher"
        ],
        answer: 1,
        why: "The stricter metric is why localisation losses (GIoU, DIoU) and RoI Align matter in modern detectors: they move boxes from 'roughly right' to 'tight', which the average over thresholds rewards."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Object Detection",
    sub: "IoU and NMS, anchors and imbalance, mAP, the families, and DETR.",
    questions: [
      {
        level: "Core",
        q: "What are IoU and NMS, and how are they used?",
        strong: "IoU is intersection area over union area of two boxes — for [10, 10, 50, 50] and [30, 30, 70, 70] the intersection is 400, the union 2,800, IoU 0.143 — bounded in [0, 1] and scale-invariant, which is why it defines both a positive match at training time (anchor IoU ≥ 0.5 with a ground-truth box) and a true positive at evaluation. Non-maximum suppression handles the fact that a dense detector proposes many overlapping boxes per object: sort by score, keep the best, remove every box whose IoU with it exceeds a threshold, repeat. On six boxes with a 0.5 threshold it kept [3, 0, 5], matching torchvision; a box at IoU 0.82 with a kept box was removed and one at 0.14 survived. Two variants matter in practice: soft-NMS decays overlapping scores by a Gaussian of IoU instead of deleting, so two genuinely overlapping objects can both survive; and class-aware NMS suppresses only within a class. DETR removes NMS altogether by training with one-to-one matching.",
        answer: [
          { t: "p", text: "Both definitions with the executed numbers, the two roles of IoU, the variants, and the DETR alternative." }
        ]
      },
      {
        level: "Core",
        q: "Explain how mAP is computed.",
        strong: "Per class, take every detection in the dataset and rank by score. Walk down the list: a detection is a true positive if its IoU with an as-yet-unmatched ground-truth box of that class exceeds the threshold, otherwise a false positive — a second detection of an already-matched object is a duplicate and counts as false. Cumulative TP over the number of ground-truth boxes gives recall; cumulative TP over detections so far gives precision. Make precision monotone by replacing each value with the maximum at any higher recall, then integrate precision over recall. On three ground-truth boxes and six detections the sequence was TP, TP, FP, TP, FP, FP; precision went 1.0, 1.0, 0.67, 0.75, 0.6, 0.5 as recall reached 1.0; AP@0.5 = 0.9167. Mean AP averages over classes. COCO's metric averages over IoU thresholds from 0.5 to 0.95 — 0.6528 for the same detections, because one box at IoU 0.78 stops counting above 0.75 — which is what makes tight localisation worth optimising.",
        answer: [
          { t: "p", text: "The ranking, matching and duplicate rule, the interpolation, the executed sequence, and the COCO extension." }
        ]
      },
      {
        level: "Core",
        q: "Compare two-stage and one-stage detectors.",
        strong: "A two-stage detector — Faster R-CNN — first proposes regions with a Region Proposal Network that scores and refines anchors, then crops each proposal from the feature map with RoI Align and classifies and refines it with a shared head. The two stages let it sample a balanced set of anchors and proposals for training, and it is the accuracy reference, especially with a Feature Pyramid Network for small objects. A one-stage detector — YOLO, SSD, RetinaNet — predicts classes and boxes densely at every anchor or grid cell in a single pass, which is faster (YOLO runs in real time) but leaves it facing the imbalance directly: with 100 positives among 10,000 anchors, cross-entropy put 85 % of the loss on easy negatives in my measurement. SSD answered with hard-negative mining at 3:1; RetinaNet with focal loss, which took the negatives' share to 4 % and closed the accuracy gap. Modern one-stage detectors are anchor-free with learned assignment. DETR is a third design: N learned queries and a Hungarian matching loss, no anchors, no NMS, at the cost of harder training. Choose two-stage for accuracy on hard, small-object data; one-stage for speed; DETR-family for simplicity and when the training budget allows.",
        answer: [
          { t: "p", text: "Both mechanisms, the imbalance with numbers and its two answers, DETR, and the choice." }
        ]
      },
      {
        level: "Advanced",
        q: "Which loss would you use for box regression, and why?",
        strong: "A combination of L1 on the box coordinates and a GIoU term, which is DETR's and most modern detectors' recipe. L1 (or smooth-L1) gives a well-scaled gradient everywhere but penalises every coordinate equally regardless of box size and does not directly optimise the overlap the metric rewards. IoU-based losses optimise the overlap itself, but IoU has zero gradient when boxes do not overlap; GIoU subtracts the fraction of the smallest enclosing box that is empty, so non-overlapping boxes are pushed together. On a synthetic single-object task with a (cx, cy, w, h) sigmoid head, smooth-L1 gave mean IoU 0.717 with 52 % of boxes at IoU ≥ 0.75; GIoU alone 0.780 and 73 %; 5·L1 + 2·GIoU 0.806 and 77 %. Two cautions from the same experiment: an IoU loss needs a parameterisation that cannot produce an inverted box — with raw corner outputs GIoU sat at 0.000 because zero-area boxes have no gradient — and the combined loss's weight dominated the shared features so much that classification accuracy fell to 0.668 in eight epochs, so the terms must be balanced against the classification loss and given enough training.",
        answer: [
          { t: "p", text: "The recipe, each term's failure mode, the executed comparison, and the two cautions the experiment produced." }
        ]
      }
    ]
  }
});

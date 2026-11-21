/* ============================================================================
   LESSON 2.7 — Object Detection, IoU and NMS
   Every IoU, the NMS sweep, the COCO metric and the AP calculation are
   executed in d27.py against torchvision.ops.
   ========================================================================= */
EC.receiveLesson({
  id: "2.7",

  lede: "**Detection asks two questions at once — what is in this image, and where — and the second one changes everything.** A classifier emits one label. A detector emits a variable number of boxes, each with a class and a confidence, which means it needs a way to measure how good a box is (IoU), a way to remove the duplicates it inevitably produces (NMS), and a metric that copes with a variable-length answer (mAP). This lesson computes all three rather than describing them.",

  objectives: [
    "Compute IoU and explain why 50 % overlap does not give IoU 0.5",
    "Contrast two-stage and one-stage detectors on the speed/accuracy trade-off",
    "Apply non-maximum suppression and choose its threshold",
    "Distinguish mAP@0.5 from mAP@0.5:0.95 and say what each rewards",
    "Compute average precision from a ranked list of detections"
  ],

  prerequisites: ["2.6", "2.3"],

  blocks: [

    { t: "h2", n: "01", text: "Intersection over Union", id: "iou" },

    { t: "math", tex: "\\text{IoU} = \\frac{\\text{Area of Overlap}}{\\text{Area of Union}}" },

    { t: "p", text: "One box fixed at `(0, 0, 10, 10)`, computed by hand and checked against `torchvision.ops.box_iou`:" },

    { t: "out", text: `  identical           inter= 100.0 union= 100.0  IoU=1.0000  torchvision=1.0000  match=True
  half overlap        inter=  50.0 union= 150.0  IoU=0.3333  torchvision=0.3333  match=True
  corner quarter      inter=  25.0 union= 175.0  IoU=0.1429  torchvision=0.1429  match=True
  touching, no area   inter=   0.0 union= 200.0  IoU=0.0000  torchvision=0.0000  match=True
  disjoint            inter=   0.0 union= 200.0  IoU=0.0000  torchvision=0.0000  match=True` },

    { t: "callout", kind: "trap", title: "Half the box overlapping is IoU 0.33, not 0.5",
      body: [{ t: "p", text: "Two boxes sharing exactly half their area have intersection 50 and union 150, giving 0.333. The union grows as the intersection shrinks, so IoU falls off much faster than intuition suggests — which is why 0.5 is considered a *lenient* threshold rather than a middling one. A pair of boxes at IoU 0.5 overlap by about two thirds of each box's area. Keep this in mind when reading a detector's failure cases: boxes that look close often score much lower than expected." }] },

    { t: "diagram", kind: "matrix", title: "IoU across the overlap range",
      caption: "Note how quickly the value drops. A quarter-area corner overlap scores 0.14 — barely above disjoint.",
      cols: ["Overlap", "Intersection", "Union", "IoU"],
      rows: ["Identical", "Half", "Corner quarter", "Touching", "Disjoint"],
      cells: [
        ["100 %", "100", "100", "1.000"],
        ["50 %", "50", "150", "0.333"],
        ["25 %", "25", "175", "0.143"],
        ["0 %", "0", "200", "0.000"],
        ["0 %", "0", "200", "0.000"]
      ] },

    { t: "h2", n: "02", text: "Two-stage and one-stage", id: "families" },

    { t: "diagram", kind: "compare", title: "The two families",
      caption: "The split is whether region proposal is a separate stage. Everything else — the speed gap, the small-object gap — follows from that.",
      columns: [
        { title: "Two-stage · Faster R-CNN", tone: "accent", items: [
          "Stage 1: a Region Proposal Network suggests candidate boxes",
          "Stage 2: classify and refine each proposal",
          "Higher accuracy, especially on small objects",
          "~6 FPS"
        ] },
        { title: "One-stage · YOLO, SSD", tone: "good", items: [
          "An S×S grid; each cell predicts boxes, confidence and classes",
          "One forward pass, no proposal stage",
          "Real-time; the gap on accuracy has largely closed",
          "~170 FPS (YOLOv8, V100, 53.9 mAP on COCO)"
        ] }
      ] },

    { t: "out", text: `  Faster R-CNN (two-stage)   ~   6 FPS   propose, then classify
  YOLOv8 (one-stage)         ~ 170 FPS   one forward pass
  28x the throughput; two-stage keeps an edge on small objects` },

    { t: "dl", items: [
      ["Feature Pyramid Network", "Detect at several scales by merging deep semantic features with shallow high-resolution ones. In YOLOv5/v8 and most modern detectors."],
      ["Anchor-based", "Predict offsets from a fixed set of prior box shapes. Needs the priors tuned to your object aspect ratios."],
      ["Anchor-free", "CenterNet predicts object centres; FCOS predicts box edges per pixel. No priors to tune."],
      ["SSD", "Predicts at every scale of the backbone's feature maps rather than one merged pyramid."]
    ] },

    { t: "h2", n: "03", text: "Non-maximum suppression", id: "nms" },

    { t: "p", text: "A detector fires at many nearby positions for one object, so raw output is full of near-duplicates. NMS keeps the highest-scoring box and discards anything overlapping it above a threshold, then repeats." },

    { t: "diagram", kind: "steps", title: "The NMS loop",
      caption: "Greedy: highest confidence wins, and everything it overlaps is suppressed before the next round.",
      items: [
        { label: "Sort", sub: "all boxes by confidence, descending", tone: "accent" },
        { label: "Take the top box", sub: "keep it", tone: "good" },
        { label: "Suppress", sub: "discard every remaining box with IoU > threshold against it", tone: "warn" },
        { label: "Repeat", sub: "until no boxes remain", tone: "violet" }
      ] },

    { t: "p", text: "Five raw detections — three clustered on one object, two on another:" },

    { t: "out", text: `  raw detections: 5
  IoU of box0 with box1: 0.8647
  IoU of box0 with box3: 0.0000
  NMS @ IoU 0.30 keeps 2 boxes: indices [0, 3]
  NMS @ IoU 0.50 keeps 2 boxes: indices [0, 3]
  NMS @ IoU 0.70 keeps 2 boxes: indices [0, 3]
  NMS @ IoU 0.95 keeps 5 boxes: indices [0, 3, 1, 2, 4]` },

    { t: "p", text: "At 0.3, 0.5 and 0.7 the algorithm correctly collapses five boxes to two — one per object. At 0.95 nothing is suppressed, because even the near-duplicates only reach IoU 0.86, and all five survive." },

    { t: "callout", kind: "tradeoff", title: "The threshold is a duplicates-versus-misses dial",
      body: [{ t: "p", text: "Raise it and you keep duplicate boxes on the same object. Lower it and you start suppressing genuinely distinct objects that happen to overlap — a crowd of people, a shelf of products, cars in traffic. There is no threshold that is right for both, which is why 0.5 is the common default and why crowded-scene detection is its own research problem. Soft-NMS is the usual refinement: instead of deleting an overlapping box it *decays* that box's score in proportion to the overlap, so a real object hidden behind another can still survive with a reduced confidence." }] },

    { t: "h2", n: "04", text: "mAP, and why COCO is strict", id: "map" },

    {"kind": "trace", "title": "Why COCO's mAP is stricter than Pascal's", "caption": "Pascal VOC declares a detection correct at IoU ≥ 0.5 and averages over classes. COCO averages over **ten IoU thresholds** from 0.50 to 0.95, so a box that is roughly right scores at the loose end and nothing at the strict end — which is why the same detector's COCO mAP is far below its Pascal number, and why the two are not comparable.", "left": "metric", "codeW": 200, "vars": ["IoU thresholds", "what it rewards"], "steps": [{"code": "Pascal VOC mAP", "state": ["0.50 only", "finding the object"], "tone": "accent"}, {"code": "COCO mAP (the headline)", "state": ["0.50:0.05:0.95, averaged", "finding it and locating it precisely"], "changed": [0], "tone": "good"}, {"code": "COCO AP50", "state": ["0.50", "comparable to Pascal"], "tone": "accent"}, {"code": "COCO AP75", "state": ["0.75", "tight localisation"], "tone": "warn"}, {"code": "so the same detector", "state": ["scores far lower on COCO", "the numbers are not comparable"], "tone": "crit"}], "t": "diagram", "id": "dg-2_7-04-0"},









    { t: "p", text: "A detection counts as correct if its IoU with a ground-truth box clears a threshold. Which threshold you pick changes the answer a great deal. One prediction at IoU 0.89:" },

    { t: "out", text: `  a prediction with IoU 0.8908 against ground truth
  COCO thresholds : [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]
  counted as a hit: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0]
  mAP@0.5       : 1.00  (a single lenient threshold)
  mAP@0.5:0.95  : 0.80  (averaged over all ten)` },

    { t: "p", text: "**The same prediction scores 1.00 under PASCAL VOC's metric and 0.80 under COCO's.** Averaging over ten thresholds rewards tight localisation, which mAP@0.5 is indifferent to — under the lenient metric a sloppy box and a perfect one are worth exactly the same. Always check which metric a reported number uses before comparing two detectors." },

    { t: "h2", n: "05", text: "Average precision from a ranked list", id: "ap" },

    {"kind": "steps", "title": "Average precision from a ranked list, step by step", "caption": "AP is not an average of precisions at fixed recalls — it is the area under the precision–recall curve traced by walking the **ranked detections**. Each true positive moves recall right and lifts precision; each false positive lowers precision without moving recall. That is why ranking quality, not just counting, is what AP measures.", "items": [{"label": "Sort every detection by confidence", "desc": "across the whole dataset, not per image", "code": "1", "tone": "accent"}, {"label": "Match each to a ground-truth box by IoU", "desc": "one ground truth can be matched once", "code": "2", "tone": "accent"}, {"label": "Walk the list, recomputing precision and recall", "desc": "a TP moves recall; an FP only hurts precision", "code": "3", "tone": "good"}, {"label": "Take the running maximum of precision", "desc": "the interpolation step, so the curve is monotone", "code": "4", "tone": "good"}, {"label": "Integrate: that area is AP", "desc": "per class", "code": "5", "tone": "violet"}, {"label": "Average over classes, then over IoUs", "desc": "mAP; COCO does both", "code": "6", "tone": "teal"}], "t": "diagram", "id": "dg-2_7-05-1"},









    { t: "p", text: "Sort detections by confidence, walk down the list accumulating true and false positives, and read off precision and recall at each step. Five predictions against three ground truths:" },

    { t: "out", text: `  rank  TP?  recall  precision
   1    1    0.333   1.000
   2    0    0.333   0.500
   3    1    0.667   0.667
   4    1    1.000   0.750
   5    0    1.000   0.600
  AP (interpolated) = 0.8333` },

    { t: "p", text: "Recall only ever rises; precision jumps about as false positives arrive. AP is the area under this curve, using the interpolated form where each point takes the maximum precision at any recall at or above it — which is why the dip at rank 2 does not reduce the score. **mAP** is this averaged across classes, and COCO's headline number averages across classes *and* the ten IoU thresholds." },

    { t: "callout", kind: "insight", title: "Ranking is what AP measures",
      body: [{ t: "p", text: "AP depends only on the *order* of the detections, not the absolute confidence values. A detector whose scores are all between 0.4 and 0.45 gets the same AP as one spanning 0.05 to 0.99, provided they rank the same boxes in the same order. That has a practical consequence: improving your model's calibration will not move mAP at all, while making it rank one true positive above one false positive will. If you need well-calibrated confidences — for a threshold in production, say — mAP is not the metric that will tell you whether you have them." }] },

    { t: "exercise", kind: "practice", title: "Build the detection post-processing yourself", difficulty: "advanced", minutes: 40,
      prompt: "Implement IoU and greedy NMS from scratch and verify both against `torchvision.ops.box_iou` and `torchvision.ops.nms` on random box sets. Then implement AP: given predictions with confidences and ground-truth boxes, match predictions to ground truths greedily by confidence at a given IoU threshold, build the precision-recall curve and integrate it. Compute AP at IoU 0.5 and averaged over 0.5:0.95 for a synthetic set where you control the localisation quality, and confirm the strict metric falls as you jitter the boxes while the lenient one does not.",
      requirements: [
        "Implement IoU and greedy NMS and verify them against torchvision",
        "Implement AP by matching predictions to ground truth by confidence",
        "Compute AP at IoU 0.5 and averaged over 0.5:0.95 on a synthetic set",
        "Jitter boxes and confirm the strict metric falls while the lenient one does not"
      ],
      hints: [
        "Clamp the intersection width and height at zero, or disjoint boxes give negative area.",
        "In AP, each ground truth can only be matched once — a second prediction on the same object is a false positive.",
        "Jitter the predicted boxes by a few pixels and plot both metrics against the jitter magnitude."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import torch
from torchvision.ops import box_iou, nms

def iou(a, b):                                   # a: (N,4), b: (M,4), xyxy
    x1 = torch.max(a[:, None, 0], b[None, :, 0]); y1 = torch.max(a[:, None, 1], b[None, :, 1])
    x2 = torch.min(a[:, None, 2], b[None, :, 2]); y2 = torch.min(a[:, None, 3], b[None, :, 3])
    inter = (x2 - x1).clamp(min=0) * (y2 - y1).clamp(min=0)   # the clamp is the classic bug
    area = lambda r: (r[:, 2] - r[:, 0]) * (r[:, 3] - r[:, 1])
    return inter / (area(a)[:, None] + area(b)[None, :] - inter)

def greedy_nms(boxes, scores, thr):
    order, keep = scores.argsort(descending=True), []
    while order.numel():
        i = order[0]; keep.append(i.item())
        order = order[1:][iou(boxes[i:i+1], boxes[order[1:]])[0] <= thr]
    return torch.tensor(keep)

def rand_boxes(n, g):
    xy = torch.rand(n, 2, generator=g) * 400; wh = torch.rand(n, 2, generator=g) * 60 + 60
    return torch.cat([xy, xy + wh], 1)

g = torch.Generator().manual_seed(0)
b1, b2 = rand_boxes(200, g), rand_boxes(150, g)
print("IoU max abs diff vs torchvision:", f"{(iou(b1, b2) - box_iou(b1, b2)).abs().max():.1e}")
scores = torch.rand(200, generator=g)
print("NMS identical to torchvision:", torch.equal(greedy_nms(b1, scores, 0.5), nms(b1, scores, 0.5)))

def average_precision(preds, scores, gts, thr):
    order = scores.argsort(descending=True); used = torch.zeros(len(gts), dtype=torch.bool); tp = []
    ious = iou(preds, gts)
    for i in order:
        j = ious[i].clone(); j[used] = -1
        best = j.argmax()
        hit = j[best] >= thr
        if hit: used[best] = True
        tp.append(float(hit))
    tp = torch.tensor(tp); ctp = tp.cumsum(0)
    prec, rec = ctp / torch.arange(1, len(tp) + 1), ctp / len(gts)
    prec = torch.flip(torch.cummax(torch.flip(prec, [0]), 0).values, [0])   # monotone envelope
    rec = torch.cat([torch.zeros(1), rec])
    return float(((rec[1:] - rec[:-1]) * prec).sum())

gts = rand_boxes(100, g)
print("\\njitter(px)  AP@0.5  AP@0.5:0.95")
for jit in [0, 2, 4, 8, 12, 16, 24]:
    preds = gts + torch.randn(gts.shape, generator=g) * jit
    sc = torch.rand(100, generator=g)
    ap50 = average_precision(preds, sc, gts, 0.5)
    apc = sum(average_precision(preds, sc, gts, t) for t in torch.arange(0.5, 0.96, 0.05)) / 10
    print(f"{jit:>10}  {ap50:6.3f}  {apc:11.3f}")`,
        out: `IoU max abs diff vs torchvision: 0.0e+00
NMS identical to torchvision: True

jitter(px)  AP@0.5  AP@0.5:0.95
         0   1.000        1.000
         2   1.000        0.879
         4   1.000        0.723
         8   1.000        0.495
        12   0.927        0.297
        16   0.542        0.159
        24   0.266        0.049`,
       
        notes: [
          { t: "p", text: "The clamping is the classic bug: without `max(0, x2 - x1)` two disjoint boxes produce a negative intersection and an IoU that can come out positive or even greater than one. It only shows up on non-overlapping pairs, which are exactly the cases people skip when testing by hand." },
          { t: "p", text: "The jitter experiment is the point of the exercise. mAP@0.5 stays flat as you perturb boxes by a few pixels and then falls off a cliff when they cross the threshold, while mAP@0.5:0.95 degrades smoothly from the first pixel of error. That is why COCO's metric is the one people optimise against — it gives a gradient of feedback on localisation quality where the single-threshold metric gives a step function. It also explains why a model can look excellent on the VOC metric and mediocre on COCO without anything having changed." },
          { t: "p", text: "For matching, greedy assignment by descending confidence with each ground truth consumable once is what the COCO evaluator does. Getting this wrong — allowing two predictions to claim the same object — inflates AP substantially and is a common source of a too-good-to-be-true offline number." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: a detector that reported each object three times",
      body: [
        { t: "p", text: "**Symptom.** A detection service returned several overlapping boxes for each object, and a counting feature over-counted badly." },
        { t: "p", text: "**Mechanism.** Non-maximum suppression had been disabled during a refactor, so every anchor that fired on an object produced a box." },
        { t: "p", text: "**Fix.** NMS is part of the exported model's post-processing, and a test counts boxes on images with a known number of objects." }
      ] }
  ],

  takeaways: [
    "IoU = intersection / union; boxes sharing half their area score 0.333, not 0.5.",
    "Two-stage detectors propose then classify (~6 FPS, better on small objects); one-stage predicts in a single pass (~170 FPS).",
    "NMS keeps the top-scoring box and suppresses everything overlapping it above a threshold, greedily.",
    "The NMS threshold trades duplicate boxes against suppressed neighbours; Soft-NMS decays scores instead of deleting.",
    "The same prediction at IoU 0.89 scores 1.00 on mAP@0.5 and 0.80 on mAP@0.5:0.95.",
    "AP is the area under the interpolated precision-recall curve and depends only on ranking, not on calibration."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Two boxes overlap by exactly half their area. What is the IoU?",
      options: ["0.5", "0.333", "0.25", "0.667"],
      answer: 1,
      why: "Intersection is 50 and union is 150, giving 0.333. The union grows as overlap shrinks, so IoU falls faster than intuition expects — which is why 0.5 is a lenient threshold corresponding to roughly two thirds of each box overlapping." },
    { stem: "What does non-maximum suppression do?",
      options: ["Removes low-confidence detections", "Keeps the top box; drops overlapping ones", "Merges overlaps into one average box", "Normalises the confidence scores"],
      answer: 1,
      why: "It is greedy and iterative: sort by confidence, keep the top box, suppress everything with IoU above threshold against it, repeat. In the measured example it correctly reduced five raw detections to two objects at thresholds of 0.3, 0.5 and 0.7 — and kept all five at 0.95, since the duplicates only reached IoU 0.86." },
    { stem: "Why is mAP@0.5:0.95 lower than mAP@0.5 for the same detector?",
      options: ["It uses a different dataset", "It averages stricter IoU thresholds", "It excludes small objects", "It is computed per class only"],
      answer: 1,
      why: "A prediction at IoU 0.89 counts as a hit at eight of the ten COCO thresholds and misses at 0.90 and 0.95, giving 0.80 against the lenient metric's 1.00. Averaging over thresholds rewards tight boxes, where the single-threshold metric treats a sloppy box and a perfect one identically." },
    { stem: "You improve your detector's confidence calibration but mAP does not change. Why?",
      options: ["The improvement was too small", "AP depends only on the ranking", "Calibration only affects recall", "mAP is computed before calibration"],
      answer: 1,
      why: "The precision-recall curve is built by walking down detections in confidence order, so only the ordering matters. Rescaling all confidences leaves AP untouched. If you need trustworthy confidence values — to set a production threshold, for instance — you need a calibration metric, because mAP will not reflect them." }
  ] },

  interview: { title: "Interview", sub: "Detection questions", questions: [
    { level: "Core", q: "Walk me through what a detector outputs and how you turn it into final predictions.",
      strong: "Many boxes with scores; filter by confidence, then NMS per class, then threshold for the application.",
      answer: [{ t: "p", text: "The raw output is a large, fixed number of candidate boxes, each with coordinates, an objectness or confidence score and class probabilities — thousands of them, most on background. First I drop everything below a low confidence floor, which removes the bulk cheaply. Then non-maximum suppression, applied per class: sort by confidence, keep the top box, discard anything with IoU above about 0.5 against it, repeat. That collapses the cluster of boxes a detector always fires on a single object down to one. Finally there is an application-level confidence threshold, which is a precision-recall decision rather than a modelling one — a safety system wants recall, a system that auto-publishes results wants precision." }] },
    { level: "Core", q: "What is the difference between one-stage and two-stage detectors?",
      strong: "Whether region proposal is a separate step; two-stage is more accurate on small objects, one-stage is far faster.",
      answer: [{ t: "p", text: "Two-stage detectors like Faster R-CNN run a region proposal network first to suggest candidate boxes, then classify and refine each one. That second pass over a modest number of proposals is what gives the accuracy, particularly on small objects, and it costs throughput — around 6 FPS. One-stage detectors like YOLO and SSD divide the image into a grid and predict boxes, confidences and classes directly in a single forward pass, reaching something like 170 FPS for YOLOv8. The accuracy gap that justified two-stage detectors has largely closed with feature pyramids and better training recipes, so for most production work I would now start with a modern one-stage model and only reach for two-stage if small-object recall turned out to be the binding constraint." }] },
    { level: "Senior", q: "Your detector scores well offline but misses objects in crowded scenes. What is happening?",
      strong: "Probably NMS suppressing genuinely distinct overlapping objects; consider Soft-NMS or a crowd-aware approach.",
      answer: [{ t: "p", text: "The first thing I would check is NMS, because it is the one stage that deliberately deletes correct answers. When two real objects genuinely overlap — people in a crowd, cars in traffic — their boxes can exceed the IoU threshold, and the greedy algorithm removes the lower-scoring one even though it is a true positive. Raising the threshold fixes that but reintroduces duplicate boxes everywhere else, so there is no single value that works. Soft-NMS is the standard answer: decay the overlapping box's score in proportion to the overlap rather than deleting it, so a genuinely occluded object survives at reduced confidence. I would also check whether the offline evaluation set actually contains crowded scenes — if it does not, the metric cannot see this failure at all, and the real fix is to the evaluation set before it is to the model." }] }
  ] }
});

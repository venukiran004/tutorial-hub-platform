/* ============================================================================
   LESSON 3.7 — Segmentation and Grad-CAM
   ========================================================================= */
EC.receiveLesson({
  id: "3.7",

  lede: "**Segmentation is classification at every pixel, which sounds like a detail and changes everything: the output is an image, the decoder has to rebuild the resolution the encoder threw away, 92 % of the pixels are background so accuracy is the wrong metric, and the losses that work are the ones that measure overlap.** A U-Net built here reaches a mean IoU of 0.980 on synthetic shapes; the same encoder–decoder without its skip connections reaches 0.771. Then the map of the field — FCN, DeepLab's atrous pyramid, Mask R-CNN, panoptic, SegFormer, SAM — and the second half: what a classifier looked at. CAM and Grad-CAM are implemented with hooks, agree to correlation 1.000 on a GAP-headed network, put 26 % of their heat on a digit covering 16 % of the image, and pass the randomisation sanity check that any explanation method must.",

  objectives: [
    "Define semantic, instance and panoptic segmentation and the metrics (pixel accuracy, IoU, mIoU, Dice) with their failure modes",
    "Build a U-Net, train it with cross-entropy, Dice and their sum, and show what the skip connections are worth",
    "Place FCN, U-Net, DeepLab (ASPP), Mask R-CNN, SegFormer and SAM in the design space",
    "Implement CAM and Grad-CAM with forward hooks and explain when they coincide",
    "Read a saliency map critically: coarseness, wrong predictions, and the randomisation sanity check"
  ],

  prerequisites: ["3.6", "3.1"],

  blocks: [

    { t: "h2", n: "01", text: "The task and the metrics", id: "task" },

    { t: "dl", items: [
      ["Semantic segmentation", "Every pixel gets a class label; two adjacent cars are one 'car' region. Output: an H × W × K map of logits."],
      ["Instance segmentation", "Each object gets its own mask; two cars are two masks. Output: a set of (box, class, mask) — detection plus a mask head (Mask R-CNN)."],
      ["Panoptic segmentation", "Both at once: 'stuff' classes (road, sky) labelled semantically, 'thing' classes (cars, people) as instances, every pixel assigned exactly once. Metric: panoptic quality, PQ = segmentation quality × recognition quality."],
      ["Matting", "Not a label per pixel but an opacity α ∈ [0, 1] per pixel — hair, glass, motion blur — for compositing; a regression problem with a trimap as input."]
    ] },

    { t: "code", lang: "text", title: "Synthetic data: squares and discs on a noisy background (executed)",
      code: `1,500 training / 300 test images, 64 × 64, one to three objects each
pixel fractions:  background 0.920   square 0.045   disc 0.035
a model predicting 'background' everywhere has pixel accuracy 0.920   -- the reason IoU and Dice exist`,
      caption: "Pixel accuracy is dominated by the majority class. Per-class IoU (intersection over union of predicted and true pixels) and Dice (2|P ∩ G| / (|P| + |G|)) are computed separately per class and averaged — mIoU — so the 3.5 % of pixels that are discs count as much as the background. Dice = 2·IoU/(1 + IoU), so the two rank models identically; Dice is the loss, IoU the reported metric." },

    { t: "h2", n: "02", text: "U-Net, built and ablated", id: "unet" },

    { t: "p", text: "The encoder is a classifier's convolutional stack: resolution halves, channels double, three times. The decoder reverses it with transposed convolutions (3.1). The skip connections copy each encoder stage's feature map across to the decoder stage at the same resolution and concatenate it, so the decoder has the fine spatial detail the encoder's bottleneck lost:" },

    { t: "code", lang: "python", title: "U-Net in twelve lines",
      code: `class UNet(nn.Module):
    def __init__(self, c=16, classes=3):
        block = lambda i, o: nn.Sequential(conv3(i, o), BN, ReLU, conv3(o, o), BN, ReLU)
        self.e1, self.e2, self.e3, self.bott = block(1, c), block(c, 2c), block(2c, 4c), block(4c, 8c)
        self.u3, self.d3 = nn.ConvTranspose2d(8c, 4c, 2, 2), block(8c, 4c)      # 8c in: 4c upsampled + 4c skipped
        self.u2, self.d2 = nn.ConvTranspose2d(4c, 2c, 2, 2), block(4c, 2c)
        self.u1, self.d1 = nn.ConvTranspose2d(2c, c, 2, 2),  block(2c, c)
        self.out = nn.Conv2d(c, classes, 1)                                       # 1×1: per-pixel classifier
    def forward(self, x):
        e1 = self.e1(x); e2 = self.e2(pool(e1)); e3 = self.e3(pool(e2)); b = self.bott(pool(e3))
        d3 = self.d3(cat[self.u3(b), e3]); d2 = self.d2(cat[self.u2(d3), e2]); d1 = self.d1(cat[self.u1(d2), e1])
        return self.out(d1)                                                       # (B, classes, H, W)`,
      caption: "482,483 parameters at c = 16. The output has the input's resolution and one channel per class; cross-entropy is applied per pixel. The 1 × 1 output convolution is the classifier of 3.1 applied at every position." },

    { t: "code", lang: "text", title: "Six epochs, Adam 3e-3, batch 16 (executed)",
      code: `                                   pixel acc   IoU (bg, square, disc)     mIoU     Dice (square, disc)
U-Net, cross-entropy               0.9988      1.000  0.977  0.962         0.980    0.989  0.981
U-Net, Dice loss                   0.9985      1.000  0.975  0.955         0.977    0.988  0.977
U-Net, CE + Dice                   0.9987      1.000  0.976  0.960         0.979    0.988  0.980
encoder–decoder, no skips, CE      0.9806      0.993  0.677  0.644         0.771    0.807  0.783

exercise: inverse-frequency class weights in CE  mIoU 0.960;  nearest-upsample + conv decoder instead of transposed conv  mIoU 0.967
boundary band (5 × 5 dilate minus erode, 9.4 % of pixels): accuracy inside the band 0.9935, away from it 0.9993`,
      caption: "Read the pixel-accuracy column against the mIoU column: the no-skip network has 98.1 % pixel accuracy and a disc IoU of 0.64 — it finds the objects and cannot draw their edges, because its decoder works from a 8 × 8 bottleneck alone. The skips are worth 21 points of mIoU. The three losses tie on this easy data; Dice earns its place when a class is rare enough that cross-entropy ignores it, which 3.5 % is not quite." },

    { t: "dl", items: [
      ["Cross-entropy per pixel", "The default; each pixel a classification. Under heavy imbalance, weight the classes or add Dice."],
      ["Dice loss", "1 − 2Σ p·g / (Σ p + Σ g) on the soft probabilities per class, averaged. Directly optimises overlap; scale-free, so a small object counts as much as a large one. Usual medical-imaging default, often summed with CE."],
      ["Focal loss", "The detection loss (3.6, 1.3) applied per pixel: down-weights the easy background pixels."],
      ["Boundary losses", "Weight pixels near edges more, or penalise the distance between predicted and true contours — for the case where the error is all at the boundaries, which is where it usually is."]
    ] },

    { t: "h2", n: "03", text: "The architectures", id: "archs" },

    { t: "dl", items: [
      ["FCN (2015)", "A classifier with its dense layers turned into 1 × 1 convolutions, so it outputs a coarse class map, upsampled by transposed convolutions; FCN-8s adds skips from the stride-8 and stride-16 maps. The founding design; the coarse upsampling limits boundary quality."],
      ["U-Net (2015)", "Symmetric encoder–decoder with concatenation skips at every level. The default for medical and any small-data segmentation; the measured 0.980 vs 0.771 is its argument."],
      ["DeepLab (v1–v3+)", "Keep resolution instead of rebuilding it: dilated convolutions in the backbone (output stride 8 or 16), then an Atrous Spatial Pyramid Pooling head — parallel 3 × 3 convolutions at rates 6, 12, 18 plus image-level pooling, concatenated and projected. Measured: 2.2 M parameters at 256 channels; the rate-18 branch sees a 37 × 37 field on the feature map. v3+ adds a light decoder with one skip. Earlier versions used a CRF for boundaries."],
      ["Mask R-CNN (2017)", "Faster R-CNN with a third head that predicts a 28 × 28 binary mask per RoI, made possible by RoI Align (3.6). Instance segmentation by detection; masks are class-specific and predicted only inside boxes."],
      ["Panoptic FPN, Panoptic-DeepLab", "A semantic branch for stuff and an instance branch for things, merged with a rule that resolves overlaps; PQ as the metric."],
      ["SegFormer (2021)", "A hierarchical transformer encoder (Mix Transformer) with a light all-MLP decoder; no positional encodings (they break at other resolutions). Strong and simple; module 5 covers the attention it is built from."],
      ["Segment Anything (2023)", "A ViT image encoder run once, a prompt encoder (points, boxes, text), and a mask decoder that produces masks for any prompt — trained on a billion masks. Zero-shot segmentation of anything you can point at; class labels come from elsewhere."],
      ["PointRend", "Treats segmentation as rendering: refines the coarse mask by re-predicting only the uncertain points near boundaries at higher resolution, a cheap way to sharp edges."],
      ["Top-down vs bottom-up instance", "Top-down (Mask R-CNN): detect, then mask inside the box. Bottom-up: predict pixel embeddings or affinities and cluster into instances. Top-down dominates; bottom-up handles heavy overlap and crowds better."]
    ] },

    { t: "h2", n: "04", text: "CAM and Grad-CAM", id: "gradcam" },

    { t: "p", text: "Which part of the image did a classifier use? With a global-average-pool head the answer is arithmetic: the class score is Σ_c w_c · mean(A_c), so the map Σ_c w_c · A_c(x, y) — the last feature maps weighted by the class's linear weights — is the class-activation map (Zhou et al., 2016). Grad-CAM (Selvaraju et al., 2017) generalises it to any architecture by replacing w_c with the gradient of the class score with respect to A_c, averaged over positions:" },

    { t: "code", lang: "python", title: "Both, with a forward hook on the last convolutional block (executed)",
      code: `hook = cnn.f.register_forward_hook(lambda m, i, o: feats.__setitem__("A", o))     # A: (1, C, 7, 7)

def cam(x, cls):                                            # GAP + linear head only
    cnn(x); A = feats["A"][0]; w = cnn.head.weight[cls]
    return relu((w[:, None, None] * A).sum(0))

def gradcam(x, cls):                                        # any architecture
    out = cnn(x); A = feats["A"]; A.retain_grad(); out[0, cls].backward()
    w = A.grad[0].mean((1, 2))                              # α_c = spatial mean of ∂score/∂A_c
    return relu((w[:, None, None] * A[0]).sum(0))

digit CNN (10k images, 2 epochs): test accuracy 0.9751
on 200 test digits: fraction of heat on the digit's own pixels  0.259 (CAM)  0.259 (Grad-CAM);  the digit covers 0.157 of the image
correlation between the CAM and Grad-CAM maps: 1.000        -- with a GAP + linear head, Grad-CAM reduces exactly to CAM
map resolution: 7 × 7 on a 28 × 28 input                    -- the last feature map's size; coarse by construction`,
      caption: "For a GAP-headed network ∂score/∂A_c is w_c / (H·W) at every position, so Grad-CAM's weights are CAM's up to a constant — the measured correlation of 1.000 is the derivation checked. The heat is 1.6× concentrated on the digit relative to its area, which is meaningful and not dramatic: a 7 × 7 map bilinearly upsampled cannot outline a stroke. Grad-CAM's resolution is the last feature map's, and on a ResNet at 224 px that is 7 × 7 too." },

    { t: "code", lang: "text", title: "Reading the maps critically (executed)",
      code: `wrong predictions -- heat on the digit's pixels for the predicted and the true class, and the correlation of the two maps:
  image 18:   true 3, predicted 5    0.35 / 0.33    maps correlate 0.33
  image 151:  true 9, predicted 8    0.31 / 0.30    0.66
  image 184:  true 8, predicted 3    0.24 / 0.39    0.01      <- the true class looks somewhere else entirely
  image 195:  true 3, predicted 7    0.12 / 0.16    0.80      <- both classes look at the same (wrong) region
  image 247:  true 4, predicted 6    0.26 / 0.24    0.94

sanity check (Adebayo et al., 2018), 50 digits:
  correlation of the CAM with the CAM from a random-head model on the same image: 0.26   (the map changes when the weights change: pass)
  correlation of the CAM with the CAM of a different image for the same class: 0.19          (the map is about this input, not a class template)`,
      caption: "A saliency map explains a prediction, not the truth: for image 195 the network looked in the same place for '3' and '7' and chose wrong; for 184 the two classes' evidence is in different places. The randomisation test is the one every explanation method must pass — if the map barely changes when the classifier's weights are randomised, it is showing you edges in the input, not the model's reasoning." },

    { t: "dl", items: [
      ["Guided backprop, saliency maps", "Gradient of the class score with respect to the input pixels, optionally with negative gradients zeroed at each ReLU. High resolution, and exactly the methods that failed the randomisation test — they act as edge detectors."],
      ["Grad-CAM++ and Score-CAM", "Refinements of the weighting: Grad-CAM++ uses second-order terms for multiple instances; Score-CAM weights channels by the score change when each map masks the input, needing no gradients."],
      ["Occlusion and integrated gradients", "Model-agnostic: slide a mask over the input and record the score drop (occlusion); or integrate the gradient along a path from a baseline (integrated gradients, with axioms). Both slower, both finer than Grad-CAM. The ML course's SHAP is the same family."],
      ["What they cannot tell you", "Why the region mattered, whether the feature is causal, or whether a different region would have sufficed. Evidence for debugging (the model reads the watermark; the model ignores the tumour) rather than proof."]
    ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The no-skip encoder–decoder scored 98.1 % pixel accuracy and 0.771 mIoU; the U-Net 99.9 % and 0.980. Why is the first number misleading and what did the skips buy?",
          options: [
            "Pixel accuracy is always misleading; the skips buy speed",
            "Background is 92 % of pixels, so 98 % accuracy is compatible with badly drawn objects (disc IoU 0.64); the skips carry high-resolution encoder features to the decoder so it can locate edges the 8 × 8 bottleneck lost, lifting the object classes' IoU to 0.96–0.98",
            "The first network was under-trained",
            "The skips add parameters, which is where the gain came from"
          ],
          answer: 1,
          why: "The no-skip model has 90 % of the U-Net's parameters and 79 % of its mIoU; the missing piece is spatial detail, not capacity. mIoU weights each class equally, which is why it exposes the failure that pixel accuracy hides."
        },
        {
          stem: "Grad-CAM and CAM produced identical maps (correlation 1.000) on the digit network. When would they differ?",
          options: [
            "Never; they are the same method",
            "When the head is not global-average-pool + linear: CAM needs that structure to read the class weights directly, while Grad-CAM's channel weights are the spatially averaged gradients of the score, which exist for any architecture — with a GAP head those gradients equal the linear weights up to a constant, hence the identity",
            "When the image is larger",
            "When the model is wrong"
          ],
          answer: 1,
          why: "Grad-CAM was introduced precisely to lift CAM's architectural requirement. On a VGG with dense layers or a network with a different head the two are not both defined, and Grad-CAM is the one that applies."
        },
        {
          stem: "Why is the randomisation sanity check important for a saliency method?",
          options: [
            "To measure the method's speed",
            "Because a map that stays the same after the model's weights are randomised cannot be explaining the model — it is responding to the input alone, like an edge detector; several popular methods failed this test, and an explanation used for debugging must pass it",
            "To check the input normalisation",
            "It is a regularisation technique"
          ],
          answer: 1,
          why: "Adebayo et al. showed guided backprop and some others were nearly invariant to weight randomisation. The check costs one forward pass with a randomised head and is the minimum due diligence before a heat map is shown to anyone."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Dice by hand, class weights, an upsampling decoder, and boundary accuracy",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** For prediction P = [[1, 1, 0, 0], [1, 0, 0, 0]] and ground truth G = [[1, 1, 1, 0], [0, 0, 0, 0]], compute Dice and IoU by hand and verify Dice = 2·IoU/(1 + IoU)." },
        { t: "p", text: "**(b)** Train the U-Net with inverse-frequency class weights in the cross-entropy and report mIoU against the unweighted run." },
        { t: "p", text: "**(c)** Replace the transposed convolutions with nearest-neighbour upsampling followed by a 3 × 3 convolution and retrain; report mIoU and the parameter count." },
        { t: "p", text: "**(d)** Define a boundary band as (5 × 5 dilation − 5 × 5 erosion) of the foreground mask and report the trained U-Net's pixel accuracy inside the band and away from it." }
      ],
      requirements: [
        "(a) Dice, IoU and the identity check.",
        "(b) one mIoU.",
        "(c) one mIoU and a parameter count.",
        "(d) the band's pixel fraction and two accuracies."
      ],
      hint: "(a) |P| = 3, |G| = 3. (b) weights ∝ 1/frequency, normalised to sum to the class count. (d) Dilation is max-pooling with stride 1; erosion is −max-pool(−x).",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) |P| = 3, |G| = 3, |P ∩ G| = 2:  Dice = 2·2/(3+3) = 0.667;  IoU = 2/4 = 0.500;  2·IoU/(1+IoU) = 0.667  ✓

# (b) inverse-frequency class weights [0.06, 1.28, 1.66]:  pixel acc 0.9968   IoU [0.998, 0.975, 0.908]   mIoU 0.960
#     -- worse than unweighted (0.980): the weights over-correct on a problem where the rare classes were already learned

# (c) nearest-upsample + 3×3 conv decoder:  pixel acc 0.9980   mIoU 0.967   536,243 params  (transposed-conv U-Net: 0.980, 482,483 params)

# (d) boundary band = 9.4 % of pixels;  accuracy overall 0.9988, inside the band 0.9935, away from it 0.9993
#     -- 55 % of the remaining errors sit in the 9 % of pixels at object edges`,
        notes: [
          { t: "p", text: "(a) is the identity that lets you report IoU while training on Dice." },
          { t: "p", text: "(b) and (c) are the two most common U-Net modifications; the results say what each is worth on data where the plain recipe already works." },
          { t: "p", text: "(d) is where segmentation error lives — the band — and the number to watch when comparing decoders." }
        ]
      }
    }
  ],

  takeaways: [
    "Semantic segmentation labels every pixel, instance segmentation masks every object, panoptic does both; pixel accuracy is dominated by the background (92 % here), so per-class IoU and Dice, averaged, are the metrics, with Dice = 2·IoU/(1 + IoU).",
    "A U-Net — encoder, decoder with transposed convolutions, concatenation skips at every level — reached mIoU 0.980 in six epochs; the same encoder–decoder without skips 0.771, at 98 % pixel accuracy: the skips carry the edges.",
    "Cross-entropy, Dice and their sum tied (0.977–0.980) on this data; Dice matters for rare classes, focal and boundary losses for hard pixels; ASPP keeps resolution with dilated convolutions (rates 6/12/18, a 37 × 37 field, 2.2 M parameters at 256 channels) instead of rebuilding it.",
    "The lineage: FCN (dense → 1 × 1, coarse upsampling), U-Net, DeepLab (atrous + ASPP), Mask R-CNN (detection + a mask head via RoI Align), panoptic methods, SegFormer (transformer encoder, MLP decoder), Segment Anything (promptable masks), PointRend (boundary refinement).",
    "CAM = Σ_c w_c·A_c for a GAP + linear head; Grad-CAM replaces w_c with the spatially averaged gradient and works for any architecture; on a GAP network they coincide (correlation 1.000). The map is the last feature map's resolution (7 × 7) and concentrated heat 1.6× on the digit relative to its area.",
    "Read maps critically: on wrong predictions the predicted and true classes sometimes look at the same region (correlation 0.80) and sometimes at different ones (0.01); a method must change its map when the weights are randomised, or it is an edge detector."
  ],

  quiz: {
    title: "Segmentation and Grad-CAM — Knowledge Check",
    questions: [
      {
        stem: "What is the difference between semantic and instance segmentation, and which architecture family does each?",
        options: [
          "They are the same task with different metrics",
          "Semantic assigns a class to each pixel with no notion of separate objects (FCN, U-Net, DeepLab, SegFormer: dense per-pixel classifiers); instance produces one mask per object (Mask R-CNN: detection with a mask head, or bottom-up clustering of pixel embeddings); panoptic combines them so every pixel is assigned once",
          "Semantic uses boxes and instance uses masks",
          "Instance segmentation is semantic segmentation at higher resolution"
        ],
        answer: 1,
        why: "The output structures differ — a fixed-size class map against a variable-size set of masks — which is the same distinction as classification against detection (3.6), and it determines the architecture."
      },
      {
        stem: "Why does DeepLab use dilated convolutions instead of pooling in its backbone?",
        options: [
          "Dilated convolutions are faster",
          "Pooling discards resolution that a decoder must rebuild; dilation grows the receptive field (rate 18: a 37 × 37 field from 3 × 3 weights) while keeping the feature map at stride 8 or 16, so the head predicts at higher resolution — ASPP then mixes several rates for context at multiple scales",
          "Dilation adds parameters, increasing capacity",
          "Pooling is incompatible with BatchNorm"
        ],
        answer: 1,
        why: "It is 3.1's dilation argument applied to dense prediction: field without downsampling. The cost is compute on larger feature maps, which is why output stride 16 is the usual compromise and v3+ adds a light decoder."
      },
      {
        stem: "Which loss would you add when one class occupies 0.5 % of the pixels and the model ignores it?",
        options: [
          "MSE on the class map",
          "Dice (or a class-weighted or focal cross-entropy): Dice measures overlap per class independently of its area, so a rare class's poor overlap costs as much as a common class's, where per-pixel cross-entropy is dominated by the abundant pixels — in the experiment at 3.5 % the losses tied, and the gap opens as the class gets rarer",
          "A larger batch size",
          "Label smoothing"
        ],
        answer: 1,
        why: "Dice's scale invariance is the point; summing CE + Dice keeps CE's per-pixel gradient and adds the overlap objective, which is the common medical-imaging recipe."
      },
      {
        stem: "Grad-CAM produced a 7 × 7 map for a 28 × 28 input. Why, and what follows?",
        options: [
          "Because the input was downsampled before the network",
          "Because the map lives on the last convolutional feature map, whose resolution is the input's divided by the network's output stride (4 here, 32 for a ResNet at 224 px); it can localise a region, not an edge, and finer methods (occlusion, integrated gradients, Score-CAM at earlier layers) are needed for pixel-level attribution",
          "Because Grad-CAM averages over 4 × 4 blocks",
          "Because of the ReLU"
        ],
        answer: 1,
        why: "The measured heat concentration — 26 % on a digit covering 16 % — is what a 7 × 7 map upsampled bilinearly can express. Choosing an earlier layer trades semantic specificity for resolution."
      },
      {
        stem: "What does RoI Align contribute to Mask R-CNN specifically?",
        options: [
          "Faster proposal generation",
          "Pixel-accurate cropping: RoI pooling's quantisation misaligns the crop by up to a stride's worth of pixels, which barely affects a box but shifts a 28 × 28 mask relative to the object; RoI Align's bilinear sampling at exact positions is what made mask prediction inside boxes accurate",
          "Class-specific masks",
          "Multi-scale features"
        ],
        answer: 1,
        why: "The mask head is small; the alignment was the enabling change, and the paper's ablation shows mask AP rising substantially with RoI Align while box AP barely moves."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Segmentation and Grad-CAM",
    sub: "Metrics and losses, U-Net's skips, the architecture map, CAM against Grad-CAM, and reading saliency honestly.",
    questions: [
      {
        level: "Core",
        q: "Explain the U-Net architecture and why the skip connections matter.",
        strong: "A U-Net is a symmetric encoder–decoder for per-pixel prediction. The encoder is a classifier's stack — two 3 × 3 conv-BN-ReLU per stage, max-pool between stages, channels doubling as resolution halves — down to a bottleneck; the decoder mirrors it with transposed convolutions (or upsample-then-convolve) back to the input resolution, and a 1 × 1 convolution classifies every pixel. The skip connections copy each encoder stage's feature map to the decoder stage at the same resolution and concatenate it, so the decoder combines the deep, semantic but coarse features from below with the shallow, precise ones from the side. I measured what that is worth: on synthetic shapes with three classes, a U-Net at c = 16 reached mIoU 0.980 in six epochs, and the identical encoder–decoder without the skips reached 0.771 — at 98.1 % pixel accuracy, which shows it found the objects and could not draw their edges from an 8 × 8 bottleneck. The design's other property is that it trains on little data, which made it the medical-imaging default; the losses it is trained with are per-pixel cross-entropy, Dice, or their sum, which tied here and diverge when a class is rare.",
        answer: [
          { t: "p", text: "Encoder, decoder, the skips' role, the executed ablation, and the losses." }
        ]
      },
      {
        level: "Core",
        q: "Why is pixel accuracy a poor segmentation metric, and what do you report instead?",
        strong: "Because the background dominates: in my synthetic data 92 % of pixels are background, so a model that predicts background everywhere scores 92 %, and the no-skip network scored 98.1 % while segmenting discs at IoU 0.64. Report per-class IoU — intersection over union of predicted and true pixels for that class across the test set — and its mean over classes, mIoU, which gives the 3.5 % disc class the same weight as the background. Dice, 2|P ∩ G|/(|P| + |G|), is the same information (Dice = 2·IoU/(1 + IoU), checked by hand in the exercise) and is the usual training loss because it is differentiable on soft probabilities and scale-free. For instance segmentation report mask AP as in detection; for panoptic, PQ. And since segmentation error lives at boundaries, an accuracy restricted to a band around object edges tells you what the whole-image number hides.",
        answer: [
          { t: "p", text: "The imbalance argument with numbers, IoU and mIoU, Dice and its identity, and the task-specific metrics." }
        ]
      },
      {
        level: "Core",
        q: "How does Grad-CAM work, and how does it relate to CAM?",
        strong: "CAM applies to a network whose head is global average pooling followed by a linear layer: the class score is Σ_c w_c · mean(A_c), so the map Σ_c w_c · A_c(x, y) over the last feature maps shows where the evidence for the class was. Grad-CAM removes the architectural requirement by weighting each channel with the spatial mean of ∂score/∂A_c instead of w_c, then applying a ReLU, so it works for any network where you can hook the last convolutional output. For a GAP head the gradient of the score with respect to A_c is w_c/(H·W) everywhere, so Grad-CAM's weights are CAM's up to a constant; I implemented both with a forward hook on a digit classifier and the maps correlated at 1.000. Two limits worth stating: the map has the last feature map's resolution — 7 × 7 for a 28 px input, or a ResNet at 224 — so it localises regions, not edges (26 % of the heat fell on a digit covering 16 % of the image); and it explains the prediction, not the truth — on wrong predictions the maps for the predicted and true classes sometimes coincided and sometimes did not. Any saliency method should pass the randomisation test: its map must change when the model's weights are randomised, or it is an edge detector.",
        answer: [
          { t: "p", text: "CAM, the Grad-CAM generalisation, the executed identity, the resolution and interpretation limits, and the sanity check." }
        ]
      },
      {
        level: "Advanced",
        q: "How do Segment Anything and SegFormer change the picture?",
        strong: "SegFormer replaces the convolutional encoder with a hierarchical transformer (the Mix Transformer) that produces multi-scale features like an FPN, and replaces the heavy decoder with a light all-MLP head that fuses those scales; it drops positional encodings, which broke when the test resolution differed from training, in favour of a convolution inside the feed-forward block. It is competitive with DeepLab at a fraction of the decoder cost and is the usual transformer baseline for semantic segmentation. Segment Anything changes the task: a ViT image encoder is run once per image, a prompt encoder takes points, boxes or masks, and a light mask decoder returns valid masks for the prompt — trained on a billion masks, it segments objects it has never seen a label for, interactively, in real time after the one-off encoding. It does not know class names; pair it with a detector or a text model for that. Together they mark the field's shift from task-specific decoders to general encoders plus small heads, which is the same shift module 5 traces in the transformer story.",
        answer: [
          { t: "p", text: "Both architectures' designs, what each changed, their limits, and the trend they represent." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 3.5 — Transfer Learning for Vision
   ========================================================================= */
EC.receiveLesson({
  id: "3.5",

  lede: "**A network trained on one dataset carries knowledge to another only when the two share what the early layers learned — and the amount transferred is a measurement, not a promise.** An ImageNet ResNet-18 fine-tuned on 2,000 CIFAR-10 images reaches 74 % where the same network from scratch reaches 43 %: the canonical result. A digit classifier transferred to clothing gains 0.2 points with full fine-tuning and *loses* seventeen as a frozen feature extractor, because edges and strokes learned from digits are not the features clothing needs. This lesson runs the three strategies, the freezing depth, discriminative learning rates, linear-probe-then-fine-tune, a deliberately useless source (negative transfer), mixup and cutmix, and a probe of which layer's features transfer — and reads each honestly.",

  objectives: [
    "State the three transfer strategies and run each on two source–target pairs with opposite outcomes",
    "Decide which layers to freeze from a depth sweep, and set discriminative learning rates",
    "Measure domain shift and negative transfer, and explain why feature extraction can lose to training from scratch",
    "Apply mixup and cutmix on a small target set and read what they did",
    "Probe a pretrained backbone layer by layer and at several input sizes to find which features transfer"
  ],

  prerequisites: ["3.4", "1.7"],

  blocks: [

    { t: "h2", n: "01", text: "Three strategies, two experiments", id: "strategies" },

    { t: "dl", items: [
      ["Feature extraction", "Freeze the pretrained backbone, train only a new head on its features. Cheapest; works when the source features already separate the target classes."],
      ["Fine-tuning", "Initialise from the pretrained weights and train everything, usually at a lower learning rate than from scratch so the features are adjusted rather than destroyed."],
      ["Partial fine-tuning", "Freeze the early layers (generic edges and textures), train the later ones and the head. Between the two in cost and risk; the depth to freeze is the hyperparameter."],
      ["Discriminative learning rates (ULMFiT)", "A different rate per layer group, smallest for the earliest layers: the parts most worth keeping move least."],
      ["Linear probe then fine-tune (LP-FT)", "Train the head first with the backbone frozen, then unfreeze; a random head's large early gradients otherwise distort the pretrained features (Kumar et al., 2022)."]
    ] },

    { t: "code", lang: "text", title: "Experiment B: ImageNet-pretrained ResNet-18 → CIFAR-10, 2,000 training images upsampled to 64 px, 5 epochs (executed)",
      code: `from scratch                              0.4295    (105 s)
feature extraction (frozen backbone)      0.5475    ( 38 s)
fine-tune all, lr 0.01                    0.7435    (156 s)
fine-tune, discriminative lr (0.001 / 0.005 / 0.02)   0.7250    (146 s)`,
      caption: "The result transfer learning is known for: with 2,000 labels, ImageNet features are worth 31 points over training from scratch, and adjusting them (fine-tuning) is worth 20 more than freezing them. ImageNet and CIFAR share the world — objects, textures, lighting — so the early and middle layers transfer; the head and the late layers need to move. Discriminative rates did not help here in five epochs; they matter more when there are more epochs to over-fit in." },

    { t: "code", lang: "text", title: "Experiment A: a digit CNN (MNIST, 98.9 %) → FashionMNIST with 2,000 labels, 15 epochs, 2 seeds (executed)",
      code: `from scratch                                          0.8547 ± 0.0011
feature extraction (conv frozen, head trained)        0.6820 ± 0.0028      -- seventeen points BELOW scratch
fine-tune all, lr 0.05                                0.8565 ± 0.0023      -- +0.2
fine-tune all, lr 0.01                                0.8377 ± 0.0025      -- a lower rate is worse: the features must change
fine-tune, discriminative lr (0.002/0.01/0.02/0.05)   0.8490 ± 0.0006
linear probe then fine-tune                           0.8390 ± 0.0024

domain shift in the source's feature space: distance between domain means / within-domain spread = 1.07;  feature norm 6.9 (MNIST) vs 9.9 (Fashion)`,
      caption: "Digits and clothing share little beyond 'grey shapes on black': the frozen digit features cannot separate shirts from coats (0.68), and the pretrained weights are barely better than random as a starting point (+0.2 at the full learning rate; at a gentler rate they are a handicap). The shift measurement says the same — the two domains sit a full spread apart in the source's feature space. Transfer is a property of the *pair*, and a source that looks similar can transfer nothing." },

    { t: "h2", n: "02", text: "Which layers to freeze", id: "freeze" },

    { t: "code", lang: "text", title: "Freezing by depth, MNIST → Fashion, 2,000 labels, remaining layers fine-tuned at 0.01 (executed)",
      code: `frozen: nothing                     0.8403
frozen: stage 1                     0.8313
frozen: stages 1–2                  0.7623
frozen: stages 1–3 (head only)      0.6228

probe on ImageNet ResNet-18's frozen features at each stage, CIFAR-10 at 64 px (exercise):
  after layer1 (64-d)   0.4945       after layer2 (128-d)   0.6315       after layer3 (256-d)   0.7375       after layer4 (512-d)   0.6585
  and layer4 at 32 / 64 / 128 px input:   0.5495 / 0.6585 / 0.7980`,
      caption: "On the mismatched pair every frozen stage costs accuracy — even the first, whose edge detectors one would expect to be universal — because digit strokes and clothing textures want different first-layer filters. On the matched pair the probe tells a subtler story: layer3's features transfer better than layer4's at 64 px (0.74 vs 0.66), because the last stage of an ImageNet network is specific to ImageNet's classes and to 224-px objects; feed it 128-px images and layer4 recovers to 0.80. The right layer to cut at depends on domain distance *and* on scale." },

    { t: "table", head: ["Target data", "Domain distance", "Strategy", "Evidence here"],
      rows: [
        ["Small, similar", "Small", "Feature extraction or LP-FT; a probe on layer3–4 features", "CIFAR probe 0.55–0.80 by input size; linear probe with 100 labels: 0.47"],
        ["Small, different", "Large", "Fine-tune everything at a full rate, or train from scratch — freezing hurts", "Fashion: frozen 0.68 vs scratch 0.85; full fine-tune 0.857"],
        ["Large, similar", "Small", "Fine-tune with a warm-up and a lower rate for early layers", "CIFAR fine-tune 0.74 vs frozen 0.55"],
        ["Large, different", "Large", "Pretrained initialisation may still speed convergence; measure against scratch", "Fashion +0.2 at best"]
      ] },

    { t: "h2", n: "03", text: "Negative transfer, and the regularisers", id: "negative" },

    { t: "code", lang: "text", title: "A source that was trained on shuffled MNIST labels (executed)",
      code: `fine-tune all at 0.01 from the garbage source     0.8060     (from the real source: 0.8377;  from scratch at 0.05: 0.8547)
feature extraction from the garbage source        0.5787     (from the real source: 0.6820)`,
      caption: "A network that memorised random labels learned filters that are worse than random for the target — three points below the real source under fine-tuning, ten as a feature extractor. That is negative transfer: the initialisation is inside a basin the target task must climb out of. The remedy is the same as always — compare with training from scratch, and treat 'pretrained' as a hypothesis." },

    { t: "code", lang: "text", title: "Mixup and cutmix on the small target from scratch, 2,000 labels, 15 epochs (executed)",
      code: `plain          0.8547 ± 0.0011
mixup α = 0.4  0.8516 ± 0.0030
cutmix         0.8379 ± 0.0009`,
      caption: "Neither helped in fifteen epochs on 28-px greyscale clothing; cutmix cost two points, because pasting a quarter of a coat onto a shoe produces images the test set never contains and the network spends capacity on them. Their published gains (a point on ImageNet, more on CIFAR with long schedules) come with hundreds of epochs and natural images; on a short run of a small dataset they are a dose to measure, exactly as in 1.7." },

    { t: "dl", items: [
      ["CutMix", "Cut a rectangle from one image, paste it into another, mix the labels by area. Keeps the pixels realistic (unlike mixup's blends) and teaches localisation; the standard augmentation for ImageNet-scale ResNet training."],
      ["Catastrophic forgetting", "Fine-tuning on the target erases the source task: the ResNet fine-tuned on CIFAR no longer classifies ImageNet. Usually irrelevant; when the source capability must be kept, see 7.3 (EWC) and 7.1 (adapters)."],
      ["Vision vs NLP transfer (Practice 06 §6)", "Vision transfers features (edges → textures → parts) from supervised ImageNet or self-supervised pretraining (7.2) and fine-tunes with SGD; NLP transfers a whole language model and fine-tunes with small learning rates and warm-up, often only adapters (7.1). The vision recipe is more robust to learning-rate choice; the NLP recipe is more sensitive to forgetting."],
      ["Test-time and the resolution rule", "Fine-tune at the resolution you will serve at, or expect the mismatch of 3.4; the probe's 0.55 → 0.80 across 32 → 128 px is the same effect on pretrained features."]
    ] },

    { t: "ladder",
      title: "Transferring a backbone to a new task",
      rungs: [
        { level: "bad", label: "Freeze the pretrained backbone because it is pretrained", code: `for p in backbone.parameters(): p.requires_grad = False;  train(head)      # Fashion: 0.68, seventeen points below scratch`,
          note: "**Correct only when the source features already separate the target classes. On a mismatched pair it is the worst option on the table.**" },
        { level: "ok", label: "Fine-tune everything at a reduced rate, compare with scratch", code: `finetune(all, lr=0.1 × scratch_lr);  baseline = train_from_scratch()`,
          note: "CIFAR: 0.74 vs 0.43. Fashion: 0.838 vs 0.855 — the comparison is what tells you which pair you have." },
        { level: "best", label: "Probe first, then choose depth and rates from the probe; measure augmentation and resolution", code: `probe_acc = logistic_regression(frozen_features(layer_k), labels) for k in 1..4
if probe high: LP-FT or partial fine-tune from the best layer;  else: full fine-tune at the scratch rate, or scratch
serve at the fine-tuning resolution`,
          note: "The probe (0.49 / 0.63 / 0.74 / 0.66 by layer at 64 px) costs one forward pass per image and a logistic regression, and it answers the freezing question before any fine-tuning run." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Feature extraction from the digit CNN scored 0.68 on clothing, seventeen points below training from scratch. Why can a pretrained backbone be worse than a random one?",
          options: [
            "Because the digit network was under-trained",
            "Because frozen features are only as good as their fit to the target: digit strokes are the wrong basis for clothing textures, and a frozen backbone cannot change them, whereas a random backbone trained from scratch learns the right ones — transfer depends on the source–target pair, measured here as a domain shift of 1.07 spreads",
            "Because the head was too small",
            "Because feature extraction always underperforms"
          ],
          answer: 1,
          why: "The same strategy gave 0.55 vs 0.43 from scratch on ImageNet → CIFAR, where the domains share what the early layers learn. Freezing is a bet that the source features suffice; on the wrong pair the bet loses."
        },
        {
          stem: "Fine-tuning the digit network at lr 0.01 (0.838) was worse than at 0.05 (0.857), the opposite of the usual advice to fine-tune gently. What does it mean?",
          options: [
            "The usual advice is wrong",
            "Gentle fine-tuning preserves source features; when the source features are wrong for the target they must be overwritten, and a low rate leaves the network stuck near a poor initialisation — the learning rate should be chosen by how much of the source is worth keeping, which the probe and the scratch baseline reveal",
            "The seeds were unlucky",
            "The network was too small for 0.01"
          ],
          answer: 1,
          why: "On ImageNet → CIFAR the gentle rate (0.01) was right because the features were worth keeping. The rate is not a constant of fine-tuning; it is the dial between preserving and replacing, and the domain distance sets it."
        },
        {
          stem: "The layer-wise probe on ImageNet features gave 0.49, 0.63, 0.74, 0.66 for layers 1–4 at 64 px, and layer4 rose to 0.80 at 128 px. What do the two facts show?",
          options: [
            "Layer4 is broken",
            "Later layers are more task- and scale-specific: at 64 px the objects are half the size ImageNet features expect, so layer3's more generic features probe better than layer4's; at 128 px layer4's features match their training scale and win — the cut point for freezing depends on both domain and resolution",
            "Probing is unreliable",
            "Earlier layers always transfer best"
          ],
          answer: 1,
          why: "Yosinski et al. (2014) showed transferability falls with depth; the probe reproduces that and adds the resolution axis from 3.4. Both are measured in seconds with a logistic regression on frozen features."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Probe a pretrained backbone: by input size, by layer, by label count",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Load torchvision's ImageNet-pretrained ResNet-18. For 2,000 CIFAR-10 training and 2,000 test images, extract the globally pooled layer4 features at input sizes 32, 64 and 128 px and fit a logistic regression on them; report test accuracy at each size." },
        { t: "p", text: "**(b)** At 64 px, repeat with the pooled features after layer1, layer2, layer3 and layer4." },
        { t: "p", text: "**(c)** With layer4 features at 64 px, fit the probe on 100, 300, 1,000 and 2,000 labelled images and report the test accuracy of each." }
      ],
      requirements: [
        "(a) three accuracies with feature dimensions.",
        "(b) four accuracies.",
        "(c) four accuracies."
      ],
      hint: "Normalise with ImageNet's mean and std and resize bilinearly before the backbone; run the stem then the stages in order and pool with adaptive_avg_pool2d(·, 1). LogisticRegression(max_iter=3000) is enough.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) linear probe on frozen layer4 features:  32 px 0.5495    64 px 0.6585    128 px 0.7980     (512-d; 7 / 17 / 55 s)

# (b) by stage at 64 px:  layer1 (64-d) 0.4945   layer2 (128-d) 0.6315   layer3 (256-d) 0.7375   layer4 (512-d) 0.6585

# (c) layer4, 64 px:  100 labels 0.4695   300 0.5860   1,000 0.6305   2,000 0.6585`,
        notes: [
          { t: "p", text: "(a) is the resolution rule on pretrained features: the closer the input scale to the source's, the better the frozen features." },
          { t: "p", text: "(b) is Yosinski's depth result reproduced in a minute — and the reason partial fine-tuning cuts where it cuts." },
          { t: "p", text: "(c) is the label-efficiency curve that makes transfer valuable: 100 labels already give 0.47, above the 0.43 that 2,000 labels gave from scratch." }
        ]
      }
    }
  ],

  takeaways: [
    "Three strategies — freeze and train a head, fine-tune everything, fine-tune partially — plus discriminative rates and LP-FT; which is right depends on the source–target pair and is decided by measurement against a from-scratch baseline.",
    "ImageNet → CIFAR-10 with 2,000 labels: scratch 0.43, frozen features 0.55, full fine-tuning 0.74 — the canonical gain, because the domains share what the early and middle layers learn.",
    "MNIST → FashionMNIST with 2,000 labels: scratch 0.855, frozen features 0.682, full fine-tuning at the scratch rate 0.857 and at a gentle rate 0.838 — a source that looks similar transferred nothing, and freezing cost seventeen points; the measured domain shift was 1.07 spreads.",
    "Freezing depth: on the mismatched pair every frozen stage hurt (0.840 → 0.831 → 0.762 → 0.623); on the matched pair the layer probe peaked at layer3 (0.74) at 64 px and layer4 recovered to 0.80 at 128 px — transferability falls with depth and depends on scale.",
    "A source trained on shuffled labels transferred negatively (0.806 vs 0.838 fine-tuned; 0.579 vs 0.682 frozen); mixup (−0.3) and cutmix (−1.7) did not help a 15-epoch run on 28-px clothing.",
    "A linear probe on frozen features — one forward pass and a logistic regression — answers the freezing question in seconds and gives 0.47 with 100 labels where scratch gave 0.43 with 2,000."
  ],

  quiz: {
    title: "Transfer Learning for Vision — Knowledge Check",
    questions: [
      {
        stem: "What are the three transfer-learning strategies and how do you choose among them?",
        options: [
          "Data augmentation, dropout and early stopping",
          "Feature extraction (freeze the backbone, train a head), full fine-tuning (train everything from the pretrained weights, usually at a lower rate), and partial fine-tuning (freeze early layers); choose by how far the target domain is from the source and how much target data there is — measured by a linear probe and a from-scratch baseline rather than assumed",
          "Pretrain, fine-tune, distil",
          "Freeze, unfreeze, retrain"
        ],
        answer: 1,
        why: "The two executed experiments gave opposite rankings: on ImageNet → CIFAR freezing beat scratch by 12 points and fine-tuning by 31; on MNIST → Fashion freezing lost to scratch by 17. Only the measurement distinguishes the cases."
      },
      {
        stem: "Why do early layers transfer better than late layers?",
        options: [
          "Because they have fewer parameters",
          "Because early layers learn generic features — edges, colour blobs, textures — shared by most natural-image tasks, while late layers learn features specific to the source classes and scale; the layer probe showed 0.74 at layer3 against 0.66 at layer4 for 64-px CIFAR, with layer4 recovering only when the input matched its training scale",
          "Because they are trained longer",
          "They do not; late layers transfer best"
        ],
        answer: 1,
        why: "Yosinski et al. quantified the generality-to-specificity gradient; the probe reproduces it. It is why partial fine-tuning freezes from the front, and why the cut point moves with domain distance."
      },
      {
        stem: "What is negative transfer and how do you detect it?",
        options: [
          "When the target accuracy is below 50 %",
          "When starting from the pretrained weights gives a worse result than a random initialisation would — the source has placed the network in a basin the target must climb out of; detected by always running the from-scratch baseline, as when a shuffled-label source gave 0.806 against 0.838 from the real source",
          "When the source and target have different numbers of classes",
          "When fine-tuning diverges"
        ],
        answer: 1,
        why: "Transfer's cost is a forgone random start; the comparison is the only way to know whether the pretrained start paid for itself. The digit → clothing pair was nearly neutral under fine-tuning and strongly negative under freezing."
      },
      {
        stem: "Why train the head before unfreezing the backbone (LP-FT)?",
        options: [
          "To save time",
          "A randomly initialised head produces large, uninformative gradients in the first steps that flow into the pretrained features and distort them; fitting the head first (a linear probe) means the backbone, when unfrozen, receives gradients from a head that already makes sense — it improves robustness to distribution shift in the published result, and on the mismatched pair here was neutral",
          "Because the backbone cannot be trained with a random head",
          "To reduce the number of parameters"
        ],
        answer: 1,
        why: "Kumar et al. (2022) showed the effect is largest out of distribution; in-distribution and on a mismatched pair the gain is small, which is what was measured (0.839 vs 0.838). The mechanism — protecting good features from a bad head's gradients — is the same as discriminative learning rates."
      },
      {
        stem: "CutMix cost 1.7 points on the 15-epoch clothing run. What is the right conclusion?",
        options: [
          "CutMix is harmful in general",
          "On a short run with small greyscale images, pasted rectangles produce implausible inputs that cost capacity; CutMix's gains are documented on natural images with long schedules, so it is a dose to be measured per setting, like every regulariser in 1.7",
          "The α parameter was wrong",
          "It should be replaced by mixup, which helped"
        ],
        answer: 1,
        why: "Mixup did not help either (−0.3). The setting decides; the honest report is the measurement with its conditions, not a rule."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Transfer Learning for Vision",
    sub: "Strategies, the matched and mismatched pairs, freezing depth, learning rates, negative transfer, and probing.",
    questions: [
      {
        level: "Core",
        q: "How does transfer learning work for vision and when does it help?",
        strong: "A network trained on a large source dataset has learned a feature hierarchy — edges and colour in the early layers, textures and parts in the middle, class-specific features at the end — and a target task that shares that hierarchy can reuse it. Three ways: freeze the backbone and train a head on its features; fine-tune everything from the pretrained weights, usually at a lower learning rate; or freeze the early layers and fine-tune the rest. Whether it helps is a property of the pair. ImageNet-pretrained ResNet-18 on 2,000 CIFAR-10 images: 0.43 from scratch, 0.55 with frozen features, 0.74 fine-tuned — 31 points, because the domains share the early and middle layers. A digit classifier transferred to FashionMNIST with 2,000 labels: 0.855 from scratch, 0.682 frozen, 0.857 fine-tuned — nothing gained and seventeen points lost by freezing, because strokes and clothing textures need different features, and the two domains sat a full spread apart in the source's feature space. So it helps when the source features already separate the target classes or are a short adjustment away, and the from-scratch baseline is what tells you which case you are in.",
        answer: [
          { t: "p", text: "The hierarchy, the three strategies, both executed experiments with their opposite outcomes, and the rule." }
        ]
      },
      {
        level: "Core",
        q: "How do you decide which layers to freeze and what learning rate to use?",
        strong: "From measurements, in this order. First a linear probe: extract frozen features after each stage and fit a logistic regression; on ImageNet features for 64-px CIFAR that gave 0.49, 0.63, 0.74, 0.66 for layers 1–4, so layer3 features were the most transferable at that scale and layer4 became best (0.80) only at 128 px — the cut point depends on domain distance and on resolution. Then a freezing sweep confirms it: on the mismatched digit → clothing pair every frozen stage cost accuracy (0.840 → 0.831 → 0.762 → 0.623), so nothing should be frozen there. The learning rate follows the same logic: it is the dial between preserving and replacing the source features. On the matched pair a gentle rate (0.01) fine-tuned well; on the mismatched pair the gentle rate was worse than the scratch rate (0.838 vs 0.857) because the features had to be overwritten. Discriminative rates — smallest for the earliest layers — and linear-probe-then-fine-tune both protect good early features from a random head's gradients; they were neutral in these short runs and matter more with long schedules and out-of-distribution evaluation.",
        answer: [
          { t: "p", text: "Probe, sweep, and the learning rate as preserve-versus-replace, with the executed numbers for both pairs." }
        ]
      },
      {
        level: "Advanced",
        q: "What is domain shift, how would you measure it, and what does it do to transfer?",
        strong: "Domain shift is a difference between the source and target input distributions that the source model was not trained to handle — different image statistics, object scales, textures, acquisition. One cheap measurement is in the source model's own feature space: embed both domains and compare the distance between their means with the within-domain spread; for MNIST against FashionMNIST that ratio was 1.07 — the domains are as far apart as either is wide — with feature norms of 6.9 and 9.9. A more direct one is the linear probe: if frozen source features separate the target classes, the shift is small in the ways that matter. What shift does to transfer is visible in the table: the frozen digit features scored 0.68 on clothing against 0.85 from scratch, while frozen ImageNet features scored 0.55 on CIFAR against 0.43 from scratch. Large shift means freeze nothing and fine-tune at a full rate or train from scratch; small shift means the source can be kept and gently adjusted. The pathological end is negative transfer, where the source initialisation is worse than random — a shuffled-label source fine-tuned to 0.806 against 0.838 — detectable only by running the scratch baseline.",
        answer: [
          { t: "p", text: "The definition, two measurements with executed values, the consequences on both pairs, and negative transfer." }
        ]
      }
    ]
  }
});

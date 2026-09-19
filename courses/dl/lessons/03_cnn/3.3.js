/* ============================================================================
   LESSON 3.3 — The Architectures and Why Each Existed
   ========================================================================= */
EC.receiveLesson({
  id: "3.3",

  lede: "**Every famous convolutional architecture is the answer to a problem the previous one had, and the problems are visible in two numbers per network: parameters and FLOPs.** VGG-16 has 138 million parameters, 124 million of them in three dense layers; GoogLeNet answered with 6.6 million. ResNet answered a different problem — the degradation of plain deep stacks, reproduced here: 33 plain layers train to 0.812 where 17 reach 0.966, and the same 33 layers with skip connections reach 0.922. Then the efficient line: bottlenecks at 16.8× fewer parameters per block, depthwise-separable blocks, squeeze-and-excitation at 8,464 parameters per 256 channels, and compound scaling. Each block is built, counted and, where it matters, trained.",

  objectives: [
    "Read the lineage from AlexNet to ConvNeXt as parameters, depth and FLOPs measured on the same input",
    "Reproduce the degradation problem and show that a skip connection fixes it, with the gradient-ratio explanation",
    "Build the ResNet basic and bottleneck blocks, the projection shortcut, and explain why the residual stream needs normalisation or scaling",
    "Count an Inception module with and without 1 × 1 reductions, an SE block, a CBAM block, a DenseNet block and an inverted residual",
    "Explain EfficientNet's compound scaling and place each architecture in the accuracy–cost trade-off"
  ],

  prerequisites: ["3.2", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "The lineage, in numbers", id: "lineage" },

    { t: "code", lang: "text", title: "torchvision constructors, random weights, one 224 × 224 image on this CPU (executed)",
      code: `                          year   params      conv layers   GFLOPs   CPU forward
AlexNet                   2012    61.1 M         5           1.43      42 ms
VGG-16                    2014   138.4 M        13          30.94     228 ms     (14.7 M conv, 123.6 M fully connected = 89 %)
GoogLeNet / Inception-v1  2014     6.6 M        57           3.00     143 ms
ResNet-18                 2015    11.7 M        20           3.63      69 ms
ResNet-50                 2015    25.6 M        53           8.18     103 ms
DenseNet-121              2017     8.0 M       120           5.67     168 ms
MobileNet-v2              2018     3.5 M        52           0.60      76 ms
EfficientNet-B0           2019     5.3 M        81           0.77      55 ms
ConvNeXt-T                2022    28.6 M        22           0.64     144 ms`,
      caption: "Three trends. Depth: 5 layers to 120. Parameters: up to VGG, then down by an order of magnitude as 1 × 1 reductions, global pooling and separable convolutions arrived. FLOPs: VGG's 31 G against MobileNet's 0.6 G for comparable-or-better accuracy. The CPU times do not track FLOPs — DenseNet and ConvNeXt are slow here because many small operations cost latency that FLOPs do not count, which is lesson 11.2's point." },

    { t: "dl", items: [
      ["LeNet-5 (1998)", "Two convolutions, two subsampling layers, dense layers; 60k parameters; digits. The blueprint: conv → pool → conv → pool → dense."],
      ["AlexNet (2012)", "LeNet scaled to 224 × 224 and eight layers, with ReLU, dropout, data augmentation and two GPUs (its grouped convolutions were a hardware workaround). Halved the ImageNet error and started the field."],
      ["VGG (2014)", "The insight that two 3 × 3 convolutions see what one 5 × 5 sees with fewer parameters and an extra non-linearity; so use only 3 × 3, and go to 16–19 layers. Simple, huge (89 % of it in dense layers), and still the default feature extractor for style transfer and perceptual losses."],
      ["GoogLeNet / Inception (2014)", "Parallel 1 × 1, 3 × 3, 5 × 5 and pooled branches concatenated, with 1 × 1 reductions before the expensive branches; global average pooling instead of dense layers; auxiliary classifiers for gradient at depth. 6.6 M parameters, 22 layers."],
      ["ResNet (2015)", "The skip connection: each block learns a residual F(x) added to its input. Made 50, 101, 152 layers trainable; the bottleneck block kept them affordable. The architecture every later one is measured against."],
      ["DenseNet (2017)", "Every layer receives the concatenation of all earlier layers' outputs in its block. Extreme feature reuse at few parameters, at a memory and latency cost."],
      ["MobileNet, EfficientNet (2017–19)", "Depthwise-separable convolutions, inverted residuals, SE blocks, and a scaling rule; accuracy per FLOP as the objective."],
      ["ConvNeXt (2022)", "A ResNet modernised with transformer-era choices — 7 × 7 depthwise kernels, LayerNorm, GELU, fewer activations — matching vision transformers with convolutions alone."]
    ] },

    { t: "h2", n: "02", text: "The degradation problem, reproduced", id: "degradation" },

    { t: "p", text: "Before ResNet, making a network deeper eventually made it *worse on the training set* — not overfitting, which would show as better training and worse test, but a failure to optimise. He et al. (2016) showed 56 plain layers training worse than 20. Here it is with 3 × 3 blocks of 16 channels with BatchNorm, on 10,000 MNIST images:" },

    { t: "code", lang: "text", title: "Plain against residual stacks, SGD 0.05, 3 epochs (executed)",
      code: `conv layers    plain                       residual
   5           train 0.933  test 0.936      train 0.887  test 0.900
  17           train 0.966  test 0.960      train 0.964  test 0.955
  33           train 0.812  test 0.804      train 0.922  test 0.892       <- plain: deeper is worse on the TRAINING set

gradient norm of the first block's weights against the last block's, at initialisation, 16 blocks:
  plain      first 2.5e+01   last 1.8e-01   ratio 135
  residual   first 2.1e+00   last 4.2e-01   ratio 5`,
      caption: "The plain 33-layer network trains to 0.812, fifteen points below the plain 17-layer one, on the same data with the same optimiser — the degradation. The residual version recovers to 0.922. The gradient ratio shows why: through 16 plain blocks the gradient is distorted 135-fold between the last block and the first even with BatchNorm; through 16 residual blocks the identity path keeps it within a factor of 5." },

    { t: "p", text: "The skip connection's argument: a block computes y = x + F(x). If the best thing a layer can do is nothing, a plain block must learn the identity through two convolutions — hard for gradient descent — while a residual block learns F = 0, which is easy. And in the backward pass ∂y/∂x = I + ∂F/∂x: the identity term carries the gradient straight through, however badly ∂F/∂x behaves. Deep networks became trainable because the gradient stopped having to pass through every layer." },

    { t: "code", lang: "text", title: "The residual stream needs a scale — without BatchNorm, 16 blocks (executed)",
      code: `residual, scale 1.0, no BN:   activation std after 16 blocks at init 982.8   train 0.095  test 0.098    -- dead
residual, scale 0.25:         activation std 3.62                              train 0.931  test 0.923
residual, scale 0.10:         activation std 1.68                              train 0.919  test 0.916
plain, no BN, He init:        activation std after 16 blocks 0.08 (shrinking); train 0.110               -- dead the other way`,
      caption: "Each He-initialised branch adds a unit-variance term to the stream, so the variance doubles per block and the activations reach std 983 by block 16; the network never trains. Scaling the branch by 0.25 fixes it. Real ResNets fix it with BatchNorm inside the branch and, in the best recipes, by initialising the last BatchNorm's γ to zero so every block starts as the identity; Fixup and ReZero are the normalisation-free versions of the same idea. Lesson 1.6's thirty-layer plain network is the other failure: no identity path and a shrinking signal." },

    { t: "h2", n: "03", text: "The blocks", id: "blocks" },

    { t: "code", lang: "python", title: "BasicBlock with a projection shortcut (exercise, executed)",
      code: `class BasicBlock(nn.Module):
    def __init__(self, cin, cout, stride=1):
        super().__init__()
        self.c1 = nn.Conv2d(cin, cout, 3, stride, 1, bias=False); self.b1 = nn.BatchNorm2d(cout)
        self.c2 = nn.Conv2d(cout, cout, 3, 1, 1, bias=False);     self.b2 = nn.BatchNorm2d(cout)
        self.shortcut = nn.Identity() if (stride == 1 and cin == cout) else \\
                        nn.Sequential(nn.Conv2d(cin, cout, 1, stride, bias=False), nn.BatchNorm2d(cout))
    def forward(self, x):
        return F.relu(self.b2(self.c2(F.relu(self.b1(self.c1(x))))) + self.shortcut(x))

64 → 64,  stride 1:  (64, 56, 56) → (64, 56, 56)    73,984 params    identity shortcut
64 → 128, stride 2:  (64, 56, 56) → (128, 28, 28)  230,144 params    1×1 projection shortcut
ResNet-18 assembled from it: 11,689,512 parameters -- torchvision's resnet18: 11,689,512
  per stage: 0.15 M, 0.53 M, 2.10 M, 8.39 M          -- 72 % in the last stage (3.2's rule)`,
      caption: "When the block changes resolution or width the shortcut cannot be the identity; a 1 × 1 convolution with the same stride projects x to the right shape. No bias in the convolutions because BatchNorm's β replaces it. The assembled network matches torchvision's count exactly." },

    { t: "code", lang: "text", title: "Block variants, counted (executed)",
      code: `ResNet basic block at 256 channels (two 3×3)                      1,180,672 params
ResNet bottleneck (1×1 → 64, 3×3 at 64, 1×1 → 256)                   70,400 params    16.8× fewer  -- ResNet-50/101/152
Inception module (192 in), naive 1×1 / 3×3 / 5×5 branches           387,296
Inception with 1×1 reductions and a pooled branch                    163,696          -> 256 output channels
Squeeze-and-Excitation on 256 channels, r = 16                         8,464           (on ResNet-50: +2.53 M, +9.9 %)
CBAM (channel + spatial attention) on 256 channels                     8,563           spatial map (1, 14, 14)
DenseNet block, 64 in, growth 32, 6 layers                            -> layer i sees 64 + 32i channels; 256 out (concatenation)
MobileNet-v2 inverted residual at 64 (expand ×6 → 384, depthwise 3×3, project)   54,272   vs basic block at 64: 73,984`,
      caption: "The bottleneck's 1 × 1 convolutions are the whole story of ResNet-50's affordability: the expensive 3 × 3 runs at a quarter of the width. Inception's 1 × 1 reductions do the same job in parallel branches. SE and CBAM are cheap (a per-channel gate computed from the global pool, plus for CBAM a 7 × 7 convolution over the mean and max maps) and worth about a point on ImageNet. The inverted residual expands before the cheap depthwise convolution and projects back, keeping the residual stream narrow." },

    { t: "dl", items: [
      ["Pre-activation block (ResNet-v2)", "BN → ReLU → conv, twice, then add; the identity path is completely clean of non-linearities. Same parameter count, slightly better at 100+ layers."],
      ["Squeeze-and-Excitation", "Global-pool each channel (squeeze), two small dense layers with a bottleneck of C/r and a sigmoid (excitation), multiply each channel by its gate. Channel attention: the network learns which feature maps matter for this input. Measured gates on random input sat between 0.42 and 0.58; trained ones spread toward 0 and 1."],
      ["CBAM", "SE's channel gate (from both mean and max pooling) followed by a spatial gate: a 7 × 7 convolution over the channel-mean and channel-max maps gives one attention map over positions."],
      ["Stochastic depth", "Drop whole residual blocks during training (1.7); essential for ResNets beyond 100 layers and for vision transformers."],
      ["Group convolution and ResNeXt", "Split the bottleneck's 3 × 3 into 32 groups — cardinality — for the same cost and better accuracy than widening."]
    ] },

    { t: "h2", n: "04", text: "Compound scaling", id: "scaling" },

    { t: "p", text: "Given a good small network, how should it be made larger? Deeper, wider, or at higher resolution? EfficientNet (Tan & Le, 2019) answered: all three together, in fixed proportions found by a small search — depth × 1.2^φ, width × 1.1^φ, resolution × 1.15^φ — so that the FLOPs double for each unit of φ:" },

    { t: "code", lang: "text", title: "Compound scaling from B0 (executed arithmetic)",
      code: `α = 1.2, β = 1.1, γ = 1.15:  α·β²·γ² = 1.92 ≈ 2   (FLOPs ∝ depth · width² · resolution²)

φ = 0   depth ×1.00   width ×1.00   resolution ×1.00  (224 px)    FLOPs ×1      -- B0
φ = 1   depth ×1.20   width ×1.10   resolution ×1.15  (258 px)    FLOPs ×2
φ = 3   depth ×1.73   width ×1.33   resolution ×1.52  (341 px)    FLOPs ×7
φ = 7   depth ×3.58   width ×1.95   resolution ×2.66  (596 px)    FLOPs ×96     -- B7`,
      caption: "Scaling one dimension alone saturates: a very deep narrow network wastes its depth, a very wide shallow one cannot compose features, a high-resolution network needs more depth to cover the larger field. The B0 base network was itself found by neural architecture search (11.3) with the MobileNet-v2 block plus SE." },

    { t: "table", head: ["You need", "Reach for", "Because"],
      rows: [
        ["A strong default backbone", "ResNet-50 (or ConvNeXt-T)", "25 M parameters, 8 GFLOPs, pretrained weights everywhere, every downstream tool supports it"],
        ["Accuracy per FLOP, GPU inference", "EfficientNet-B0…B4", "SE + inverted residual + compound scaling; 0.77 GFLOPs at B0"],
        ["Mobile or edge CPU", "MobileNet-v2/v3", "Depthwise-separable throughout; 0.6 GFLOPs and few parameters; latency-aware design"],
        ["Few parameters, feature reuse", "DenseNet", "8 M parameters at ResNet-50 accuracy; slower per FLOP because of concatenations"],
        ["Perceptual losses, style transfer", "VGG-16 features", "Its plain 3 × 3 feature hierarchy is what those losses were tuned on"],
        ["A hundred-plus layers", "Pre-activation ResNet with stochastic depth", "Clean identity path and block dropout keep it trainable"]
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The plain 33-layer network trained to 0.812 and the plain 17-layer to 0.966 on the same data. Why is this not overfitting?",
          options: [
            "It is overfitting; the deeper model has more parameters",
            "Overfitting would show higher training accuracy and lower test accuracy; here the deeper network is worse on the training set itself, which is an optimisation failure — the degradation problem — and the residual version of the same 33 layers trains to 0.922",
            "The deeper network needed more epochs and would have caught up",
            "The learning rate was wrong for depth"
          ],
          answer: 1,
          why: "Degradation is diagnosed on the training curve. The gradient ratio of 135 between first and last block in the plain stack, against 5 with skips, is the mechanism: the identity path gives the gradient a route that does not pass through every layer."
        },
        {
          stem: "Sixteen residual blocks without BatchNorm produced activations with std 983 and did not train; scaling each branch by 0.25 gave std 3.6 and 0.923. What is going on?",
          options: [
            "The skip connection is harmful without BatchNorm",
            "Each He-initialised branch adds unit variance to the stream, so the variance doubles per block and the scale explodes; the branch must be down-weighted — by a scale, by zero-initialising the last BatchNorm γ so blocks start as the identity, or by Fixup/ReZero-style initialisation",
            "The learning rate was too high",
            "Sixteen blocks is too deep for any network"
          ],
          answer: 1,
          why: "Residual addition accumulates variance; normalisation inside the branch is what keeps the stream bounded in a standard ResNet. The measured std sequence — 983 unscaled, 3.6 at 0.25, 1.7 at 0.1 — is the arithmetic of adding sixteen independent terms."
        },
        {
          stem: "Why does a bottleneck block at 256 channels need 16.8× fewer parameters than a basic block?",
          options: [
            "Because it has fewer layers",
            "Because its 1 × 1 convolutions reduce 256 channels to 64 before the 3 × 3 and restore them after, so the expensive 3 × 3 runs at a quarter of the width (64·64·9 instead of 256·256·9); the 1 × 1s themselves are cheap",
            "Because it uses depthwise convolutions",
            "Because it drops the BatchNorm layers"
          ],
          answer: 1,
          why: "70,400 against 1,180,672 parameters for the same input and output width. This is what makes ResNet-50 (bottlenecks) cost 8 GFLOPs where a basic-block network of similar depth would cost several times more — and the same trick under a different name is Inception's reduction."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "The block, the network, and the overhead of attention",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** Implement BasicBlock(cin, cout, stride) with a 1 × 1 projection shortcut whenever the shape changes. Check the output shapes and parameter counts for 64 → 64 stride 1, 64 → 128 stride 2 and 128 → 256 stride 2 on a 56 × 56 input." },
        { t: "p", text: "**(b)** Assemble ResNet-18 from it (7 × 7 stride-2 stem with BatchNorm, ReLU and a 3 × 3 stride-2 max-pool; stages of two blocks at 64, 128, 256, 512 channels; global pool; linear to 1,000). Compare the parameter count with torchvision.models.resnet18() and report the count per stage." },
        { t: "p", text: "**(c)** Compute by formula the parameters SE blocks with r = 16 would add to every bottleneck of ResNet-50 (3, 4, 6, 3 blocks at 256, 512, 1024, 2048 output channels) and express it as a fraction of ResNet-50." }
      ],
      requirements: [
        "(a) three rows of shape, parameters and shortcut type.",
        "(b) two equal totals and four per-stage counts.",
        "(c) one parameter count and one percentage."
      ],
      hint: "(a) The projection has stride equal to the block's stride so the two paths agree in resolution. (b) The first block of stages 2–4 has stride 2. (c) An SE block on C channels has C·(C/r) + C/r + (C/r)·C + C parameters.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) 64→64  s1: (64,56,56) → (64,56,56)     73,984 params   identity
#     64→128 s2: (64,56,56) → (128,28,28)   230,144 params   1×1 projection
#     128→256 s2: (128,56,56) → (256,28,28) 919,040 params   1×1 projection

# (b) ResNet-18 from the block: 11,689,512 params;  torchvision resnet18: 11,689,512;  output (1, 1000)
#     stage 1 (64): 0.15 M   stage 2 (128): 0.53 M   stage 3 (256): 2.10 M   stage 4 (512): 8.39 M

# (c) SE (r=16) on every bottleneck of ResNet-50: +2.53 M params on 25.6 M  (+9.9 %)`,
        notes: [
          { t: "p", text: "(a) is the one piece of ResNet that is easy to get wrong: the projection must match both channels and stride." },
          { t: "p", text: "(b) matching torchvision to the parameter proves the block, the stem and the stage plan are all right; the per-stage counts are 3.2's rule again." },
          { t: "p", text: "(c) is why SE is described as cheap: a tenth more parameters, a fraction of a per cent more FLOPs, about a point of ImageNet accuracy." }
        ]
      }
    }
  ],

  takeaways: [
    "The lineage in numbers: AlexNet 61 M parameters and 1.4 GFLOPs; VGG-16 138 M (89 % in dense layers) and 31 GFLOPs; GoogLeNet 6.6 M; ResNet-50 25.6 M and 8.2 GFLOPs; MobileNet-v2 3.5 M and 0.6 GFLOPs; EfficientNet-B0 5.3 M and 0.77 GFLOPs. CPU latency does not track FLOPs.",
    "Degradation: a plain 33-layer stack trained to 0.812 where 17 layers reached 0.966 — worse on the training set, an optimisation failure. Skip connections took the 33-layer network to 0.922; the first-to-last gradient ratio was 135 plain and 5 residual.",
    "y = x + F(x): a block can be the identity by learning F = 0, and ∂y/∂x = I + ∂F/∂x carries the gradient through. Without normalisation the residual stream's variance doubles per block (std 983 after 16); scale the branch or zero-init the last BN γ.",
    "A bottleneck block is 16.8× smaller than a basic block at 256 channels because its 1 × 1s run the 3 × 3 at a quarter width; Inception's 1 × 1 reductions cut a module from 387k to 164k parameters; a BasicBlock-built ResNet-18 matched torchvision at 11,689,512.",
    "SE (8,464 params per 256 channels; +9.9 % on ResNet-50) and CBAM gate channels and positions from global statistics; DenseNet concatenates rather than adds; the inverted residual expands, filters depthwise, and projects back (54k vs 74k for a basic block at 64).",
    "Compound scaling grows depth, width and resolution together (×1.2, ×1.1, ×1.15 per φ, FLOPs ×2); B7 is 3.6× deeper, 2× wider and at 596 px for 96× the FLOPs of B0."
  ],

  quiz: {
    title: "The Architectures — Knowledge Check",
    questions: [
      {
        stem: "Why did VGG replace 5 × 5 and 7 × 7 kernels with stacks of 3 × 3?",
        options: [
          "Because 3 × 3 kernels are faster on GPUs",
          "Because two stacked 3 × 3 convolutions have the same 5 × 5 receptive field with 18 weights per channel pair instead of 25 and an extra non-linearity between them; three 3 × 3s replace a 7 × 7 with 27 weights instead of 49",
          "Because larger kernels cannot be trained",
          "Because 3 × 3 is required for 'same' padding"
        ],
        answer: 1,
        why: "Receptive field grows by (k − 1) per layer (3.1), so depth substitutes for kernel size at lower cost and greater expressiveness. Every architecture after VGG kept the 3 × 3 (until ConvNeXt's 7 × 7 depthwise, which is cheap for a different reason)."
      },
      {
        stem: "What problem did Inception's 1 × 1 reductions solve?",
        options: [
          "Vanishing gradients",
          "The cost of wide parallel branches: a 5 × 5 convolution on 192 input channels is expensive, so a 1 × 1 first reduces the channels (192 → 16) and the 5 × 5 runs on those; the module fell from 387k to 164k parameters while adding a pooled branch",
          "The need for dense layers",
          "Overfitting in the branches"
        ],
        answer: 1,
        why: "Concatenating branches makes the channel count grow at every module; without reductions the next module's branches would be even more expensive. The same 1 × 1 reduction is ResNet's bottleneck."
      },
      {
        stem: "How does DenseNet differ from ResNet, and what is the trade-off?",
        options: [
          "DenseNet has no skip connections",
          "ResNet adds each block's output to its input (channels fixed); DenseNet concatenates every earlier layer's output to the input of each layer (channels grow by the growth rate per layer, 64 → 256 over six layers at growth 32). Fewer parameters and strong feature reuse, at the cost of memory for the concatenations and slower per-FLOP latency (168 ms against ResNet-50's 103 ms here)",
          "DenseNet uses depthwise convolutions",
          "DenseNet is shallower"
        ],
        answer: 1,
        why: "8 M parameters at ResNet-50-level accuracy is DenseNet's appeal; the concatenation memory and the many small convolutions are why it is rarely the deployment choice, which the measured latency illustrates."
      },
      {
        stem: "What does a squeeze-and-excitation block compute?",
        options: [
          "A spatial attention map",
          "A per-channel gate: global-average-pool each channel to one number (squeeze), pass the C-vector through two dense layers with a C/r bottleneck and a sigmoid (excitation), and multiply each channel by its gate — channel attention at 8,464 parameters per 256 channels",
          "A residual branch",
          "A normalisation of the channels"
        ],
        answer: 1,
        why: "The gate lets the network emphasise the feature maps relevant to the current input. It adds a tenth to ResNet-50's parameters and almost nothing to its FLOPs, and appears in every EfficientNet block."
      },
      {
        stem: "Why scale depth, width and resolution together rather than one at a time?",
        options: [
          "Because scaling one at a time is not supported by the framework",
          "Because each alone saturates: extra depth on a narrow network or extra width on a shallow one adds little, and higher resolution needs more depth to cover its larger field; EfficientNet's fixed ratios (1.2, 1.1, 1.15 per φ) keep the three balanced so FLOPs double per step and accuracy keeps rising",
          "Because resolution cannot be changed after training",
          "To keep the parameter count constant"
        ],
        answer: 1,
        why: "The compound coefficient is the single dial that lets one recipe produce B0 through B7 at 1× to 96× the compute; the balance was found empirically and generalised across the family."
      }
    ]
  },

  interview: {
    title: "Interview Questions — The Architectures",
    sub: "The lineage as problems and answers, ResNet's mechanism with evidence, the blocks counted, and scaling.",
    questions: [
      {
        level: "Core",
        q: "What is ResNet and why was it revolutionary?",
        strong: "ResNet made each block compute y = x + F(x): the layers learn a residual on top of an identity connection. It was revolutionary because before it, plain networks got worse on the training set beyond a certain depth — the degradation problem, an optimisation failure rather than overfitting. I reproduced it: stacks of 3 × 3 blocks with BatchNorm on MNIST trained to 0.966 at 17 layers and 0.812 at 33; the same 33 layers with skip connections trained to 0.922. Two mechanisms. Forward, a block can be the identity by learning F = 0, which is easy, where a plain block must learn the identity through two convolutions. Backward, ∂y/∂x = I + ∂F/∂x, so the gradient has a route that bypasses every layer: measured at initialisation, the first-to-last block gradient ratio was 135 in the plain stack and 5 in the residual one. That made 50, 101 and 152 layers trainable and won ImageNet 2015; the bottleneck block (1 × 1 down, 3 × 3, 1 × 1 up — 16.8× fewer parameters than two 3 × 3s at 256 channels) made them affordable. One caveat: the residual stream's variance doubles per block without normalisation (std 983 after 16 He-initialised blocks, and the network did not train), so BatchNorm in the branch or a zero-initialised last γ is part of the recipe.",
        answer: [
          { t: "p", text: "The block, the degradation problem with executed numbers, both mechanisms with the gradient ratio, the bottleneck, and the variance caveat." }
        ]
      },
      {
        level: "Core",
        q: "Explain the Inception module and its contribution.",
        strong: "An Inception module runs several operations on the same input in parallel — 1 × 1, 3 × 3 and 5 × 5 convolutions and a max-pool — and concatenates their outputs, so the network chooses its kernel size per layer rather than having it fixed. The naive version is expensive: with 192 input channels the three convolution branches alone are 387k parameters, and concatenation makes every module's input wider than the last. The contribution was the 1 × 1 reduction: a 1 × 1 convolution shrinks the channels before the 3 × 3 and 5 × 5 branches (192 → 96 and 192 → 16), and the module drops to 164k parameters with a pooled branch added. GoogLeNet stacked nine of these to 22 layers with 6.6 million parameters — twenty times fewer than VGG-16 — by also replacing the dense layers with global average pooling, and used auxiliary classifiers on intermediate layers to inject gradient at depth, which ResNet's skips later made unnecessary. Its descendants (Inception-v3, v4, Xception) factorised the convolutions further, and Xception's extreme case — every channel its own spatial filter — is the depthwise-separable convolution.",
        answer: [
          { t: "p", text: "The module, the cost problem with counts, the 1 × 1 reduction, GAP and auxiliary heads, and the line to Xception." }
        ]
      },
      {
        level: "Core",
        q: "How would you choose a backbone for a new vision task?",
        strong: "By the constraint that binds. If it is accuracy with ordinary compute and I want pretrained weights and tooling, ResNet-50 — 25.6 M parameters, 8 GFLOPs, supported everywhere — or ConvNeXt-T for a few points more at similar cost. If it is accuracy per FLOP on a GPU, an EfficientNet: B0 at 0.77 GFLOPs from SE blocks, inverted residuals and compound scaling, and a larger φ if the budget allows. If it is a phone or an edge CPU, MobileNet-v2 or v3: 0.6 GFLOPs, 3.5 M parameters, depthwise-separable throughout and designed against measured latency. If parameters are the constraint, DenseNet at 8 M — remembering that its many concatenations cost latency FLOPs do not show (168 ms against ResNet-50's 103 ms on this CPU). VGG survives for perceptual losses and style transfer because those were tuned on its features. And whatever I pick, I measure latency on the target hardware rather than trusting FLOPs, since the lineage table shows the two disagree.",
        answer: [
          { t: "p", text: "A choice per constraint with the executed numbers, and the latency-not-FLOPs rule." }
        ]
      },
      {
        level: "Advanced",
        q: "What are SE blocks and CBAM, and why are they cheap?",
        strong: "Both are attention modules that rescale a feature map using statistics of the map itself. Squeeze-and-Excitation global-average-pools each channel to one number, passes the resulting C-vector through two dense layers with a bottleneck of C/r and a sigmoid, and multiplies each channel by its gate — channel attention. On 256 channels with r = 16 it is 8,464 parameters, and added to every bottleneck of ResNet-50 it is 2.53 M, a tenth of the network, with negligible FLOPs because it acts on pooled vectors; it is worth about a point on ImageNet and is in every EfficientNet block. CBAM adds a spatial gate after the channel gate: it concatenates the channel-mean and channel-max maps into two planes and applies a 7 × 7 convolution with a sigmoid to get one attention map over positions — 8,563 parameters at 256 channels, almost all of them the same channel MLP. They are cheap because the expensive tensors are only multiplied, never convolved; the learned part sees only a C-vector or a two-channel map.",
        answer: [
          { t: "p", text: "Both mechanisms, the executed parameter counts and overhead, the accuracy benefit, and why the cost is small." }
        ]
      }
    ]
  }
});

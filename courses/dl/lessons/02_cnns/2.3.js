/* ============================================================================
   LESSON 2.3 — Famous Architectures: LeNet to ConvNeXt
   Mirrors 02_CNNs.md · §4. Parameter counts are read from torchvision rather
   than copied from the table, and the residual gradient claim is measured on a
   20-block stack (scratchpad/dl/d23.py, torch 2.10 + torchvision).
   ========================================================================= */
EC.receiveLesson({
  id: "2.3",

  lede: "**Twenty years of CNN architecture is a short list of ideas, each fixing what the previous generation could not do.** AlexNet showed depth worked on GPUs. VGG showed 3×3 stacks beat wide kernels. GoogLeNet made networks cheap. ResNet made them deep — and is still the default. EfficientNet made scaling principled, and ConvNeXt showed that a ResNet modernised with transformer-era design choices matches a vision transformer. This lesson reads the parameter counts from torchvision rather than from a table, and measures the claim ResNet rests on: that a skip connection keeps the gradient alive.",

  objectives: [
    "Place the major architectures in order and name each one's contribution",
    "Explain the residual block and measure what it does to gradient flow",
    "Describe the bottleneck block and why deep ResNets use it",
    "State what compound scaling changes about making a model bigger",
    "Say what ConvNeXt changed and what it demonstrated"
  ],

  prerequisites: ["2.2", "1.8"],

  blocks: [

    { t: "h2", n: "01", text: "The line of descent", id: "evolution" },

    { t: "table", head: ["Year", "Architecture", "The idea", "Top-5 error", "Params"],
      rows: [
        ["1998", "LeNet-5", "That a CNN works at all", "—", "60 K"],
        ["2012", "AlexNet", "GPUs, ReLU, dropout — depth becomes trainable", "16.4 %", "61 M"],
        ["2014", "VGGNet", "Nothing but 3×3, stacked deep", "7.3 %", "138 M"],
        ["2014", "GoogLeNet", "Inception modules and 1×1 bottlenecks", "6.7 %", "13 M"],
        ["2015", "**ResNet**", "Skip connections — 152 layers train", "3.6 %", "25.6 M"],
        ["2017", "DenseNet", "Every layer sees every earlier layer", "—", "8 M"],
        ["2017", "MobileNet", "Depthwise separable convolutions", "—", "3.5 M"],
        ["2019", "EfficientNet", "Scale depth, width and resolution together", "—", "5.3 M"],
        ["2022", "ConvNeXt", "A ResNet with transformer-era design", "—", "28.6 M"]
      ],
      caption: "Parameter counts read from `torchvision` rather than transcribed. Note GoogLeNet: the reference's table says 6.8 M, and torchvision's implementation reports 13.0 M because it includes the two auxiliary classifiers used during training." },

    { t: "out", text: `  alexnet              61,100,840
  vgg16               138,357,544
  googlenet            13,004,888
  resnet18             11,689,512
  resnet50             25,557,032
  densenet121           7,978,856
  mobilenet_v2          3,504,872
  efficientnet_b0       5,288,548
  convnext_tiny        28,589,128` },

    { t: "callout", kind: "insight", title: "The parameter count stops rising in 2014",
      body: [{ t: "p", text: "VGG is the peak at 138 million, and everything after it is smaller while being better: GoogLeNet at 13 M, ResNet-50 at 25.6 M, EfficientNet-B0 at 5.3 M. The field stopped buying accuracy with parameters and started buying it with structure — bottlenecks, skip connections, separable convolutions. That inflection is the story of this lesson." }] },

    { t: "h2", n: "02", text: "Where VGG's parameters went", id: "vgg" },

    { t: "out", text: `  convolutional features :   14,714,688  (10.6%)
  fully connected head   :  123,642,856  (89.4%)` },

    { t: "p", text: "**Eighty-nine per cent of VGG16 is the classifier head**, not the convolutions that do the work. Three fully connected layers on a flattened 7×7×512 map cost 124 million parameters, which is where the overfitting lived and why VGG needed such heavy regularisation. Lesson 2.2's global average pooling is precisely the fix, and it is why no architecture after 2015 ends this way." },

    { t: "h2", n: "03", text: "The residual block", id: "residual" },

    { t: "p", text: "Instead of asking a block to compute the mapping you want, ask it to compute the *difference* from the input and add the input back. If the best thing a block can do is nothing, it can now do nothing by driving its weights to zero — which is far easier than learning to reproduce its input exactly." },

    { t: "math", tex: "H(x) = F(x) + x \\qquad\\Longrightarrow\\qquad \\frac{\\partial H}{\\partial x} = 1 + \\frac{\\partial F}{\\partial x}" },

    { t: "diagram", kind: "flow", title: "One residual block",
      caption: "The addition is the whole idea. Everything else — two 3×3 convolutions, batch norm, the ReLU placement — is the detail around it.",
      cols: 3,
      nodes: [
        { id: "x", label: "x", sub: "input", tone: "accent" },
        { id: "f", label: "Conv-BN-ReLU-Conv-BN", sub: "F(x), the residual", tone: "good" },
        { id: "a", label: "+", sub: "F(x) + x", tone: "violet" },
        { id: "r", label: "ReLU", sub: "output" }
      ],
      edges: [["x", "f"], ["f", "a"], ["x", "a", "identity"], ["a", "r"]] },

    { t: "h2", n: "04", text: "The gradient highway, measured", id: "gradient" },

    { t: "p", text: "The claim is that `∂H/∂x = 1 + ∂F/∂x` gives every layer a direct path to the loss, so gradients do not decay with depth. Twenty blocks, identical except for the addition, with the gradient norm read at the first and last:" },

    { t: "out", text: `  plain     20 blocks: grad norm at block 1 = 3.294e+00, at block 20 = 2.628e-01, ratio 1.25e+01
  residual  20 blocks: grad norm at block 1 = 3.325e+00, at block 20 = 2.767e+00, ratio 1.20e+00` },

    { t: "p", text: "The plain stack's gradient is **12.5× larger at the first block than the last** — signal decaying as it propagates. The residual stack's ratio is **1.20**, essentially flat. That gap at twenty layers is why 152 became possible, and it is the entire justification for the architecture." },

    { t: "out", text: `  with the last BatchNorm's gamma zeroed, x + F(x) - x = 0.0e+00  (exactly the identity)` },

    { t: "callout", kind: "insight", title: "The identity is free, which is the subtler point",
      body: [{ t: "p", text: "Zero the final batch-norm scale and the block is *exactly* the identity — not approximately. That means adding layers to a ResNet can never make it worse in principle, because the new layers can switch themselves off. This is why initialising the last BatchNorm's gamma to zero is a standard trick: the network starts as a shallow one and recruits depth as training finds a use for it. A plain stack has no such option; every layer must learn to pass its input through, and twenty of them doing that imperfectly is the degradation problem ResNet was named for." }] },

    { t: "h2", n: "05", text: "The bottleneck", id: "bottleneck" },

    { t: "p", text: "At 256 channels, two 3×3 convolutions are expensive. The bottleneck squeezes with a 1×1, does the spatial work cheaply, and expands back." },

    { t: "out", text: `  basic      3x3 256->256, 3x3 256->256 : 1,180,160 parameters
  bottleneck 1x1 256->64, 3x3 64->64, 1x1 64->256 : 70,016 parameters
  ratio 16.86x` },

    { t: "p", text: "**Nearly seventeen times fewer parameters for the same input and output shape.** The reference quotes 4× on FLOPs, which is the more commonly cited figure; on parameters the saving is larger still because the expensive 3×3 now operates on 64 channels rather than 256, and its cost goes as the square of the channel count. This is what lets ResNet-50 and above be deep without being enormous — ResNet-50 is 25.6 M against VGG's 138 M." },

    { t: "h2", n: "06", text: "Compound scaling and ConvNeXt", id: "modern" },

    { t: "p", text: "EfficientNet's observation is that there are three ways to make a network bigger — more channels, more layers, larger input — and that scaling one alone hits diminishing returns quickly. Scaling all three in a fixed ratio does better for the same budget." },

    { t: "math", tex: "d = \\alpha^{\\varphi}, \\quad w = \\beta^{\\varphi}, \\quad r = \\gamma^{\\varphi} \\qquad \\text{subject to}\\quad \\alpha\\beta^2\\gamma^2 \\approx 2" },

    { t: "p", text: "The constraint keeps the FLOP cost doubling per unit of `φ`, so one knob moves the whole model along a sensible curve. B0 to B7 is the same architecture at different `φ`: 5.3 M parameters to 66 M." },

    { t: "dl", items: [
      ["ConvNeXt: patchify stem", "A 4×4 non-overlapping convolution replaces ResNet's 7×7 plus max pool — the vision transformer's patch embedding, in convolution form."],
      ["Inverted bottleneck", "Expand then shrink (96 → 384 → 96) rather than shrink then expand. The transformer feed-forward block's shape."],
      ["7×7 depthwise convolutions", "A large kernel, made affordable by being depthwise, and placed late in the block where the channel count is low."],
      ["LayerNorm instead of BatchNorm", "No batch-statistics dependence, so it behaves identically at any batch size (lesson 1.8)."],
      ["One activation, one norm per block", "GELU, used sparingly — again matching the transformer block rather than the classic conv-norm-act repetition."]
    ] },

    { t: "callout", kind: "note", title: "What ConvNeXt actually demonstrated",
      body: [{ t: "p", text: "ConvNeXt-T reaches 82.1 % top-1 against Swin-T's 81.3 % with no attention anywhere. The result was not that convolutions beat transformers — it was that much of the transformers' reported advantage came from **training recipes and design choices** (better augmentation, longer schedules, LayerNorm, GELU, large kernels) rather than from self-attention itself. Applying those to a ResNet closed the gap. That is a useful reminder whenever a new architecture is reported alongside a new training recipe." }] },

    { t: "exercise", kind: "practice", title: "Measure the degradation problem", difficulty: "advanced", minutes: 28,
      prompt: "Build plain and residual stacks at depths 10, 20, 40 and 60 with identical blocks, and for each record the gradient norm at the first and last block. Plot the ratio against depth for both. Then train both a 20-layer plain net and a 20-layer residual net on a small dataset and compare training loss — not validation, training — to see the degradation problem itself. Finally, zero the last BatchNorm gamma in each residual block and confirm the untrained network is exactly the identity.",
      hints: [
        "Keep the blocks identical so the only difference is the addition.",
        "Degradation shows in *training* loss, which is what makes it distinct from overfitting.",
        "For the identity check, compare input and output element-wise rather than eyeballing."
      ],
      solution: {
        notes: [
          { t: "p", text: "The ratio-against-depth plot is the point: the plain network's gradient decay compounds with depth while the residual network's stays near 1 regardless. At twenty blocks I measured 12.5× against 1.20×, and the gap widens as you go deeper — which is exactly why plain networks stopped improving past about twenty layers while ResNets kept going to 152." },
          { t: "p", text: "Comparing *training* loss is what makes the degradation problem visible as something other than overfitting. A deeper plain network reaching a worse training loss than a shallower one is not a generalisation failure — it is an optimisation failure, and it is strange until you realise the deeper network cannot easily represent the shallower one. The residual formulation can, by setting F(x) to zero, which is the whole insight." }
        ]
      } }

  ],

  takeaways: [
    "Parameter counts peak at VGG's 138 M and fall afterwards — structure replaced size from 2014 on.",
    "89.4 % of VGG16's parameters are in the fully connected head, which global average pooling removed.",
    "`H(x) = F(x) + x` gives `∂H/∂x = 1 + ∂F/∂x`, a direct path from every layer to the loss.",
    "Measured over 20 blocks: the plain stack's gradient decays 12.5×, the residual stack's 1.20×.",
    "Zeroing the last BatchNorm gamma makes a residual block exactly the identity, so depth can never hurt in principle.",
    "The bottleneck cuts a 256-channel block from 1,180,160 to 70,016 parameters — a factor of 16.9."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What problem do residual connections solve?",
      options: ["Overfitting in deep networks", "Gradient decay and the degradation problem, so depth becomes trainable", "The high parameter count of VGG", "Slow inference"],
      answer: 1,
      why: "The measured gradient ratio over 20 blocks is 12.5× for a plain stack against 1.20× for a residual one. Degradation is an *optimisation* failure — a deeper plain network reaching worse training loss than a shallower one — and the skip connection fixes it by making the identity trivially representable." },
    { stem: "Where are most of VGG16's 138 million parameters?",
      options: ["In the convolutional backbone", "In the fully connected classifier head", "Evenly spread", "In the batch norm layers"],
      answer: 1,
      why: "The measured split is 14.7 M in features against 123.6 M in the classifier — 89.4 % in three fully connected layers on a flattened feature map. That is exactly what global average pooling replaced, and why the architectures after VGG are smaller despite being better." },
    { stem: "A bottleneck block replaces two 3×3 convolutions at 256 channels. Why is it so much cheaper?",
      options: ["It has fewer layers", "The 3×3 operates on 64 channels instead of 256, and cost goes as the square of channel count", "1×1 convolutions are free", "It skips the batch norm"],
      answer: 1,
      why: "A 3×3 convolution's parameters go as `k²·C_in·C_out`, so quartering the channels cuts that term by sixteen. The 1×1 layers that squeeze and expand are cheap by comparison, and the measured total falls from 1,180,160 to 70,016." },
    { stem: "What did ConvNeXt demonstrate?",
      options: ["That attention is unnecessary for vision", "That much of the transformer advantage came from design choices and training recipes rather than attention itself", "That CNNs scale better than transformers", "That larger kernels always help"],
      answer: 1,
      why: "ConvNeXt-T reaches 82.1 % against Swin-T's 81.3 % using no attention at all — by adopting the patchify stem, inverted bottleneck, LayerNorm, GELU and modern training schedules. The lesson is about attributing gains correctly when an architecture arrives with a new recipe attached." }
  ] },

  interview: { title: "Interview", sub: "Architecture questions", questions: [
    { level: "Core", q: "Explain how a residual connection works and why it helps.",
      strong: "`H(x) = F(x) + x` makes the derivative `1 + ∂F/∂x`, so gradients reach early layers and the identity is free.",
      answer: [{ t: "p", text: "The block learns the difference from its input rather than the whole mapping, and the input is added back. Differentiating gives `1 + ∂F/∂x`, so there is always a path with derivative one from any layer to the loss — I have measured that as a gradient ratio of 1.20 between the first and last of twenty blocks, against 12.5 for the same stack without the addition. The second benefit is as important: zeroing the block's final batch-norm scale makes it exactly the identity, so adding depth cannot make the network worse in principle. That is what fixes the degradation problem, which was a deeper plain network reaching a *worse training* loss than a shallower one — an optimisation failure, not overfitting." }] },
    { level: "Core", q: "Why did parameter counts fall after VGG while accuracy improved?",
      strong: "Structure replaced size: bottlenecks, 1×1 convolutions, global average pooling and separable convolutions.",
      answer: [{ t: "p", text: "VGG's 138 million was mostly wasted — I have measured 89.4 % of it sitting in the fully connected head, which is where its overfitting came from. Global average pooling removed that in one stroke. In the backbone, 1×1 bottlenecks let the expensive 3×3 operate on a quarter of the channels, cutting a 256-channel block from 1.18 M parameters to 70 K. Depthwise separable convolutions went further for mobile models. So GoogLeNet at 13 M and ResNet-50 at 25.6 M both beat VGG comfortably, and EfficientNet-B0 does it at 5.3 M." }] },
    { level: "Senior", q: "You need an image classifier for a new product. Which architecture do you start with?",
      strong: "A pretrained ResNet-50 or EfficientNet, chosen on the deployment constraint — and I would not design one.",
      answer: [{ t: "p", text: "I would start from pretrained weights rather than an architecture choice, because transfer learning dominates architecture selection for almost any realistic dataset size. Given that, ResNet-50 is the sensible default: it is well understood, every framework has good weights for it, and at 25.6 M parameters it runs comfortably on a server. If the constraint is a phone or a latency budget, MobileNet at 3.5 M or EfficientNet-B0 at 5.3 M give most of the accuracy at a fraction of the cost. ConvNeXt or a vision transformer is worth trying if accuracy is the only thing that matters and there is plenty of data, but both are hungrier for data and training recipe than a ResNet. What I would not do is design a novel architecture — the returns are in the data, the augmentation and the fine-tuning strategy, and a bespoke backbone is how you spend three weeks matching a baseline." }] }
  ] }
});

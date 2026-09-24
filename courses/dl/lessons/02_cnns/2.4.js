/* ============================================================================
   LESSON 2.4 — Key Architectural Innovations
   Mirrors 02_CNNs.md · §5. Every count is measured in scratchpad/dl/d24.py,
   including a check of the reference's own depthwise example (exact).
   ========================================================================= */
EC.receiveLesson({
  id: "2.4",

  lede: "**Four ideas account for most of the difference between a 2014 network and a modern one.** The 1×1 convolution changes channel count for almost nothing. The residual connection, which lesson 2.3 measured, makes depth trainable. The depthwise separable convolution factors a convolution into two cheap ones and cuts cost by roughly `k²`. And squeeze-and-excitation lets the network decide which channels matter for *this* image, at a cost of about one per cent. This lesson takes each apart and measures it.",

  objectives: [
    "Explain what a 1×1 convolution does and why it costs so little",
    "Factor a standard convolution into depthwise and pointwise steps and derive the saving",
    "Apply the ratio formula `1/C_out + 1/k²` and verify it against measurement",
    "Describe squeeze-and-excitation as squeeze, excite, scale",
    "Judge when each innovation is worth using"
  ],

  prerequisites: ["2.3", "2.1"],

  blocks: [

    { t: "h2", n: "01", text: "The 1×1 convolution", id: "pointwise" },

    { t: "p", text: "A 1×1 kernel sees one pixel. It cannot detect an edge, a corner or anything spatial at all. What it does instead is take the vector of `C_in` channel values at each position and project it to `C_out` values — a fully connected layer applied identically at every pixel." },

    { t: "diagram", kind: "cells", title: "1×1 convolution: a per-pixel channel mixer",
      caption: "Spatial size is untouched. The 256-vector at each of the 28×28 positions is projected to 64 dimensions by the same matrix.",
      items: [
        { label: "256 × 28 × 28", sub: "input", tone: "accent" },
        { label: "1×1 × 256 × 64", sub: "16,448 params", tone: "violet" },
        { label: "64 × 28 × 28", sub: "output", tone: "good" }
      ] },

    { t: "out", text: `  Conv2d(256, 64, 1) : 16,448 parameters
  Conv2d(256, 64, 3) : 147,520 parameters  (9x)
  shape (256, 28, 28) -> (64, 28, 28)  (spatial size untouched, channels mixed)` },

    { t: "p", text: "Nine times cheaper than the 3×3 doing the same channel change, because the parameter count is `k²·C_in·C_out` and `k²` is 1. That cheapness is what makes it a *bottleneck* — put one before an expensive 3×3 and the 3×3 now works on a quarter of the channels, which lesson 2.3 measured as a 16.9× saving on a full ResNet block." },

    { t: "dl", items: [
      ["Dimensionality reduction", "256 → 64 before a 3×3, the ResNet bottleneck and the GoogLeNet Inception module."],
      ["Cross-channel combination", "Mix information across feature maps without touching the spatial arrangement."],
      ["Extra non-linearity, cheaply", "A ReLU after a 1×1 adds depth for `C_in × C_out` parameters rather than `9 C_in C_out`."],
      ["Channel expansion", "The inverted bottleneck runs the other way — 96 → 384 — in MobileNetV2 and ConvNeXt."]
    ] },

    { t: "h2", n: "02", text: "Depthwise separable convolutions", id: "separable" },

    { t: "p", text: "A standard convolution does two jobs at once: it filters spatially *and* it combines channels. Depthwise separable convolution splits them into two steps, each cheap." },

    { t: "diagram", kind: "steps", title: "One convolution, factored into two",
      caption: "The depthwise step filters each channel independently — no mixing. The pointwise 1×1 then does all the mixing, with no spatial extent.",
      items: [
        { label: "Depthwise", sub: "one k×k filter per channel · k²·C_in params", tone: "accent" },
        { label: "Pointwise", sub: "1×1 across channels · C_in·C_out params", tone: "violet" },
        { label: "Same output shape", sub: "at a fraction of the cost", tone: "good" }
      ] },

    { t: "p", text: "The depthwise step really is per-channel. Giving channels 0, 1 and 2 distinct gains of 1, 2 and 3, and feeding in centre values 1, 2 and 3:" },

    { t: "out", text: `  input centres per channel  : [1.0, 2.0, 3.0]
  each channel x its own gain: [1.0, 4.0, 9.0]
  depthwise weight shape (3, 1, 3, 3) - 1 filter per channel, no mixing` },

    { t: "p", text: "Each channel is multiplied by its own filter and nothing else — the weight tensor's second dimension is 1, not `C_in`. That missing factor is the whole saving." },

    { t: "math", tex: "\\frac{\\text{separable}}{\\text{standard}} = \\frac{k^2 C_{in} + C_{in}C_{out}}{k^2 C_{in} C_{out}} = \\frac{1}{C_{out}} + \\frac{1}{k^2}" },

    { t: "callout", kind: "trap", title: "The reference writes this ratio upside down",
      body: [{ t: "p", text: "`02_CNNs.md` gives the saving as `C_out/(k²) + 1`, which would grow with the channel count rather than shrink. The correct ratio is `1/C_out + 1/k²` — and the reference's own worked example confirms it: 8,768 / 73,728 = 0.1189, and 1/128 + 1/9 = 0.1189 exactly. Since `C_out` is usually large, the `1/k²` term dominates, which is where the familiar 'about 9× cheaper for a 3×3' comes from." }] },

    { t: "out", text: `  standard  3^2 x 64 x 128          = 73,728   (reference: 73,728)
  separable 3^2 x 64 + 64 x 128     = 8,768    (reference: 8,768)
  saving 8.41x  (reference: 8.4x)
  ratio formula 1/Cout + 1/k^2 = 1/128 + 1/9 = 0.1189
  measured                                   = 0.1189` },

    { t: "p", text: "At a larger size the saving is bigger still, because `1/C_out` shrinks:" },

    { t: "out", text: `  standard      Conv2d(128, 256, 3) : 295,168
  depthwise+1x1 groups=128, then 1x1 : 34,304
  saving 88.4%, a factor of 8.6
  theory: 1/Cout + 1/k^2 = 1/256 + 1/9 = 0.1150 ; measured ratio = 0.1162` },

    { t: "callout", kind: "tradeoff", title: "Cheap in parameters is not always fast in wall-clock",
      body: [{ t: "p", text: "Depthwise convolutions have a low arithmetic intensity — few operations per byte of memory traffic — so they are memory-bound on a GPU and often reach a small fraction of peak throughput. An 8.6× parameter saving can translate to a much smaller latency saving on a big accelerator, while on a phone's CPU it delivers closer to the full benefit. This is why MobileNet is a mobile architecture rather than a universally better one, and why you should measure latency on the target device rather than trusting FLOP counts." }] },

    { t: "h2", n: "03", text: "Squeeze-and-excitation", id: "se" },

    { t: "p", text: "Every convolution so far weights its channels identically for every image. Squeeze-and-excitation lets the network look at the whole feature map and decide, per image, which channels to turn up." },

    { t: "diagram", kind: "flow", title: "Squeeze, excite, scale",
      caption: "The bottleneck at C/r keeps the cost negligible. The sigmoid means every gate lands in (0, 1), so channels are attenuated or passed, never inverted.",
      cols: 3,
      nodes: [
        { id: "f", label: "C × H × W", sub: "feature map", tone: "accent" },
        { id: "s", label: "Global avg pool", sub: "squeeze → C × 1 × 1", tone: "teal" },
        { id: "e", label: "FC → ReLU → FC → Sigmoid", sub: "excite → C gates", tone: "violet" },
        { id: "m", label: "×", sub: "scale, broadcast over H×W", tone: "good" },
        { id: "o", label: "C × H × W", sub: "re-weighted, same shape" }
      ],
      edges: [["f", "s"], ["s", "e"], ["e", "m"], ["f", "m", "original"], ["m", "o"]] },

    { t: "code", lang: "python", title: "The whole block",
      code: `class SE(nn.Module):
    def __init__(self, c, r=16):
        super().__init__()
        self.fc = nn.Sequential(nn.Linear(c, c // r), nn.ReLU(),
                                nn.Linear(c // r, c), nn.Sigmoid())

    def forward(self, x):
        s = x.mean((2, 3))               # squeeze: (N,C,H,W) -> (N,C)
        w = self.fc(s)                   # excite:  (N,C) gates in (0,1)
        return x * w[:, :, None, None]   # scale:   broadcast over H and W`,
      caption: "The squeeze is global average pooling — the same operation lesson 2.2 used to replace VGG's classifier head, here used to summarise rather than to classify." },

    { t: "out", text: `  SE block on 256 channels, r=16 : 8,464 parameters
  the 3x3 conv it sits after     : 590,080
  SE adds 1.43% to the block

  squeeze output shape: (1, 256, 14, 14) -> (1, 256)
  gate range: 0.430 to 0.565  (sigmoid, so always in (0,1))
  gates are per-channel, shared across all 14x14 positions
  output = input * gate, shape unchanged: (1, 256, 14, 14)` },

    { t: "callout", kind: "insight", title: "One and a half per cent for a consistent accuracy gain",
      body: [{ t: "p", text: "The reduction ratio `r = 16` is what makes this so cheap: the two fully connected layers go 256 → 16 → 256 rather than 256 → 256, so the cost is `2C²/r` instead of `C²`. At 8,464 parameters against the 590,080 of the convolution it follows, SE is a **1.43 % surcharge** — and it won the final ImageNet competition in 2017. It is in EfficientNet's every MBConv block, which is part of how B0 reaches ResNet-50 accuracy at 5.3 M parameters against 25.6 M." }] },

    { t: "p", text: "**CBAM** extends the idea with a second stage. Where SE asks *which channels* matter, CBAM adds a spatial map asking *which positions* matter — pooling across channels to get an `H × W` attention map, and multiplying by that too. Channel attention then spatial attention, applied in sequence." },

    { t: "h2", n: "04", text: "Choosing among them", id: "choosing" },

    { t: "table", head: ["Innovation", "Costs", "Use it when"],
      rows: [
        ["1×1 convolution", "`C_in · C_out`, ~9× under a 3×3", "Almost always — changing channel count is what it is for"],
        ["Residual connection", "Nothing", "Any network deeper than about ten layers"],
        ["Depthwise separable", "~`1/k²` of standard", "Parameter or mobile-latency constrained; measure on device"],
        ["Squeeze-and-excitation", "`2C²/r`, ~1.4 % of a block", "Accuracy matters and a small latency cost is acceptable"]
      ] },

    { t: "exercise", kind: "practice", title: "Build and measure all four", difficulty: "intermediate", minutes: 30,
      prompt: "Take one convolutional block at 256 channels and produce four variants: plain, bottlenecked with 1×1s, depthwise separable, and with an SE module attached. For each, record parameter count, forward-pass latency on your machine, and output shape. Then verify the `1/C_out + 1/k²` ratio holds across at least four (C_out, k) pairs. Finally, feed a batch through an SE block and inspect the gate values — do different images produce different gates?",
      hints: [
        "Use `groups=C_in` for the depthwise step.",
        "Time with `torch.cuda.synchronize()` if you are on a GPU, or the parameter saving will look like a latency saving that isn't there.",
        "Compare gates for two very different images to see whether the block is actually input-dependent."
      ],
      solution: {
        notes: [
          { t: "p", text: "The parameter counts follow the formulas closely — small discrepancies are biases, which the formulas ignore. The latency comparison is the interesting one: on a GPU the depthwise variant will usually not be anything like 8× faster despite having 8× fewer parameters, because it is memory-bound rather than compute-bound. That gap between FLOPs and wall-clock is the single most common way people mispredict the cost of an architecture." },
          { t: "p", text: "For the gates: an untrained SE block produces gates clustered near 0.5 and barely input-dependent, because the second FC layer is near zero and the sigmoid is near its centre — I measured a range of 0.430 to 0.565. After training the spread widens considerably and becomes genuinely image-dependent, which is the whole point. If you only ever look at an untrained block you might conclude SE does nothing." }
        ]
      } }

  ],

  takeaways: [
    "A 1×1 convolution is a per-pixel channel projection: 16,448 parameters against a 3×3's 147,520 for the same 256→64 change.",
    "Depthwise separable splits filtering from channel mixing; the cost ratio is `1/C_out + 1/k²`.",
    "The reference writes that ratio inverted; its own example (8,768 / 73,728 = 0.1189 = 1/128 + 1/9) confirms the correct form.",
    "Measured at 128→256, k=3: 295,168 parameters fall to 34,304 — an 88.4 % saving.",
    "Depthwise convolutions are memory-bound, so parameter savings overstate GPU latency savings — measure on the target device.",
    "SE is squeeze (global average pool), excite (FC-ReLU-FC-sigmoid), scale (broadcast multiply), for 1.43 % of a block's parameters."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What does a 1×1 convolution do?",
      options: ["Blurs the feature map", "Projects the channel vector at each position, leaving spatial size unchanged", "Reduces spatial resolution", "Adds padding"],
      answer: 1,
      why: "It is a fully connected layer applied identically at every pixel: `(256, 28, 28)` becomes `(64, 28, 28)`. It cannot see any spatial structure — its value is changing channel count for `C_in·C_out` parameters, nine times less than a 3×3 doing the same job." },
    { stem: "A depthwise separable convolution replaces a standard one with C_out = 256 and k = 3. Roughly what fraction of the parameters remain?",
      options: ["About half", "About 1/9 — the `1/k²` term dominates `1/C_out + 1/k²`", "About 1/256", "About 1/81"],
      answer: 1,
      why: "`1/256 + 1/9 = 0.115`, and the measured ratio was 0.1162 (the difference is biases). Because C_out is large, `1/C_out` contributes little and the `1/k²` term sets the scale — hence the familiar 'about 9× cheaper' for a 3×3 kernel." },
    { stem: "What is the 'squeeze' in squeeze-and-excitation?",
      options: ["The channel reduction by ratio r", "Global average pooling, turning C×H×W into C×1×1", "The sigmoid", "The bottleneck 1×1 convolution"],
      answer: 1,
      why: "The squeeze collapses each channel's entire spatial map into one number, giving the excitation network a global view of what the whole image contains. The reduction by `r` happens afterwards, inside the excitation FC layers, and is what keeps the block at around 1.4 % of the cost of the convolution it follows." },
    { stem: "Your depthwise separable model has 8× fewer parameters but runs barely faster on your GPU. Why?",
      options: ["A bug in the implementation", "Depthwise convolutions are memory-bound, so they reach a small fraction of peak throughput", "Parameters do not affect speed at all", "The batch size is too large"],
      answer: 1,
      why: "Depthwise convolutions do very little arithmetic per byte of memory traffic, so on a large accelerator they are limited by bandwidth rather than compute and cannot exploit its peak FLOPs. The full benefit appears on mobile CPUs, which is what the architecture was designed for — a good reason to measure latency on the target device rather than counting FLOPs." }
  ] },

  interview: { title: "Interview", sub: "Efficient architecture questions", questions: [
    { level: "Core", q: "Why are 1×1 convolutions so widely used?",
      strong: "They change channel count with no spatial cost, which enables bottlenecks, and they add non-linearity cheaply.",
      answer: [{ t: "p", text: "A 1×1 is a per-pixel linear projection across channels. It costs `C_in × C_out` rather than `9 C_in C_out` for a 3×3, so it is the cheapest way to change channel count — for a 256→64 change I measured 16,448 parameters against 147,520. That cheapness is what makes the bottleneck pattern work: squeeze to 64 with a 1×1, do the expensive spatial work there, expand back. The full ResNet block goes from 1.18 M parameters to 70 K that way. It is also the pointwise half of a depthwise separable convolution, so it is in essentially every efficient architecture." }] },
    { level: "Senior", q: "Derive the saving from a depthwise separable convolution.",
      strong: "`(k²C_in + C_in C_out) / (k²C_in C_out) = 1/C_out + 1/k²`, dominated by `1/k²`.",
      answer: [{ t: "p", text: "A standard convolution costs `k² C_in C_out`. Factoring it, the depthwise step gives each input channel its own `k×k` filter, so `k² C_in`, and the pointwise 1×1 mixes channels for `C_in C_out`. Dividing the sum by the original and cancelling `C_in` leaves `1/C_out + 1/k²`. Since C_out is typically in the hundreds, the second term dominates and the saving is roughly `k²` — about 9× for a 3×3. I have checked this: at 128→256 with k=3, theory says 0.1150 and measurement gives 0.1162, the gap being bias terms the formula ignores. The caveat I would add is that this is a parameter and FLOP saving, not necessarily a latency saving, because depthwise convolutions are memory-bound on GPUs." }] },
    { level: "Senior", q: "When would you add squeeze-and-excitation to a network?",
      strong: "Almost always when accuracy matters — it costs about 1.4 % of a block and reliably helps.",
      answer: [{ t: "p", text: "SE gives the network per-image, per-channel gating: it pools each channel to a scalar, runs a small bottlenecked MLP, and rescales. The cost is `2C²/r` — at C=256 and r=16 that is 8,464 parameters against the 590,080 of the convolution it follows, so under one and a half per cent. For that it gives a consistent accuracy gain, which is why it is in every EfficientNet MBConv block. I would hesitate only under a hard latency budget, because the global pool is a synchronisation point that breaks the pipelining of a convolutional stack and can cost more wall-clock than its FLOPs suggest. If I needed spatial selectivity as well as channel selectivity, CBAM adds a second stage that pools across channels to produce an H×W map." }] }
  ] }
});

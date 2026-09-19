/* ============================================================================
   LESSON 3.1 — The Convolution Operation
   ========================================================================= */
EC.receiveLesson({
  id: "3.1",

  lede: "**A convolution slides one small set of weights across an input and computes a weighted sum at every position — the same nine numbers reused at every pixel — and everything a convolutional network can do follows from that sharing.** A 3 × 3 kernel on a 5 × 5 image is nine multiplications at each of nine positions, done here by hand and matched to the framework. From there: the output-size formula checked on seven settings, the receptive field derived and then measured by gradient (the formula says 22, the measurement says 21, and the reason is instructive), 1 × 1 convolutions as per-pixel linear layers, depthwise-separable convolutions at 8.2× fewer parameters, dilation that reaches 31 pixels with 36 weights, and the transposed convolution whose uneven overlap (4, 2, 4, 2 …) is the checkerboard artefact.",

  objectives: [
    "Compute a cross-correlation by hand, explain the flip that separates it from true convolution, and state why the distinction does not matter for learning",
    "Apply the output-size formula with stride and padding, and derive and measure the receptive field of a stack",
    "Count parameters and FLOPs for standard, 1 × 1, depthwise-separable and grouped convolutions",
    "Explain dilation and transposed convolution, including the checkerboard artefact and its fix",
    "Extend the operation to 1-D and 3-D and state translation equivariance with a check"
  ],

  prerequisites: ["2.2"],

  blocks: [

    { t: "h2", n: "01", text: "The operation, by hand", id: "byhand" },

    { t: "code", lang: "text", title: "A 5 × 5 input and a 3 × 3 Sobel-x kernel (executed)",
      code: `input                       kernel               output (valid, 3 × 3)
1 2 0 3 1                   1  0 −1              −1  −3   2
0 1 2 1 0                   2  0 −2               3  −3  −3
3 0 1 2 2                   1  0 −1               5  −1  −6
1 1 0 0 3
2 0 1 1 0

top-left output = Σ (top-left 3×3 window ⊙ kernel)
               = 1·1 + 2·0 + 0·(−1) + 0·2 + 1·0 + 2·(−2) + 3·1 + 0·0 + 1·(−1) = −1
F.conv2d agrees: True`,
      caption: "Each output entry is the dot product of the kernel with the window under it; the kernel then moves one pixel and repeats. The Sobel-x kernel responds to horizontal intensity change — a vertical edge — which is why its output is large where the input changes left to right and small where it does not." },

    { t: "p", text: "Strictly this is *cross-correlation*: true convolution flips the kernel first. With the flipped kernel the top-left entry is +1 rather than −1. Every framework computes cross-correlation and calls it convolution, and for a learned kernel it makes no difference — the network would simply learn the flipped weights. It matters only when you load a kernel from signal-processing tables." },

    { t: "dl", items: [
      ["Kernel / filter", "The small weight tensor, shape (out_channels, in_channels, k, k). One kernel produces one output channel; it looks at all input channels at once."],
      ["Feature map", "One output channel: the kernel's response at every position. A layer with 64 kernels produces 64 feature maps."],
      ["Stride", "How far the kernel moves between positions. Stride 2 halves the output size and quarters the compute."],
      ["Padding", "Zeros added around the input so the kernel can be centred on edge pixels. 'Same' padding (p = (k − 1)/2 for odd k, stride 1) keeps the size."],
      ["Weight sharing", "The same kernel at every position. A 3 × 3 kernel on a 224 × 224 image is 9 weights, not 224² × 9; that sharing is the parameter economy and the translation equivariance."]
    ] },

    { t: "h2", n: "02", text: "Output size and receptive field", id: "size" },

    { t: "code", lang: "text", title: "Output size = ⌊(n + 2p − k) / s⌋ + 1 (executed against torch)",
      code: `n=32   k=3  p=0  s=1   ->  30        (valid)
n=32   k=3  p=1  s=1   ->  32        (same)
n=32   k=5  p=2  s=1   ->  32        (same)
n=32   k=3  p=1  s=2   ->  16
n=224  k=7  p=3  s=2   -> 112        (ResNet's stem)
n=28   k=4  p=0  s=2   ->  13
n=7    k=3  p=1  s=2   ->   4`,
      caption: "The floor is where off-by-one errors live: 28 with a 4 × 4 kernel at stride 2 gives 13, not 14, because the last window does not fit. Check the formula against the framework's shape before wiring a linear layer to a flattened feature map." },

    { t: "p", text: "The **receptive field** of an output unit is the region of the input that can affect it. It grows with every layer: r_out = r_in + (k − 1)·j_in, where j is the cumulative stride ('jump') and j_out = j_in · s. Derived for a six-layer stack and then measured by asking which input pixels receive gradient from one output pixel:" },

    { t: "code", lang: "text", title: "Receptive field, derived and measured (executed)",
      code: `layer            field   jump
conv3×3 s1         3      1
conv3×3 s1         5      1
maxpool2 s2        6      2
conv3×3 s1        10      2
conv3×3 s2        14      4
conv3×3 s1        22      4

measured by gradient: one output pixel depends on a 21 × 21 input patch (formula: 22)
   -- with constant weights the max-pool passes gradient to one element of each 2 × 2 window, so one row and column
      of the field receive none; the same stack with average pooling measures exactly 22
effective receptive field: the central half of the patch holds 55 % of the gradient mass`,
      caption: "The theoretical field is 22 and the measurement 21 — a lesson in what a gradient-based check measures (the pixels that *do* affect the output for these weights) versus what the formula counts (the pixels that *can*). The effective receptive field (Luo et al., 2016) is smaller still: influence is concentrated in the centre, because a pixel at the edge of the field reaches the output through one path and a central pixel through many." },

    { t: "callout", kind: "info", title: "Why the receptive field matters",
      body: "A classifier's last-layer units should see the whole object; a segmentation network's units must see enough context to decide a pixel's class; a detector's anchors must match the field of the layer they sit on (3.6). VGG-16's field after its fifth pooling stage is 212 pixels on a 224 input at stride 32 (exercise) — the whole image, seen from a 7 × 7 grid. Dilation (below) is the tool for growing the field without pooling or extra weights."
    },

    { t: "h2", n: "03", text: "1 × 1, depthwise-separable, grouped", id: "variants" },

    { t: "code", lang: "text", title: "64 → 128 channels on a 32 × 32 map (executed)",
      code: `standard 3×3              params 73,856    FLOPs 151.0 M
1×1                       params  8,320    FLOPs  16.8 M     -- a per-pixel linear layer across channels
depthwise 3×3 + 1×1       params  8,960    FLOPs  18.0 M     -- 8.2× fewer than standard
grouped 3×3, 4 groups     params 18,560                       -- each output group sees a quarter of the input channels

1×1 conv output == nn.Linear applied to each pixel's 64-vector:  True
a standard 3×3 bank has 128 × 64 = 8,192 spatial filters; the separable one has 64, mixed by a 128 × 64 matrix`,
      caption: "A 1 × 1 convolution mixes channels without looking at neighbours — the same linear map at every pixel — used to change channel count cheaply (bottlenecks, 3.3) and as the pointwise half of a separable convolution. Depthwise-separable (MobileNet, Xception) factors the standard convolution into a spatial filter per channel and a channel mix; it cannot represent every standard kernel bank, and empirically loses little." },

    { t: "table", head: ["Convolution", "Parameters", "What it can do", "Where"],
      rows: [
        ["Standard k×k, C_in → C_out", "C_out · C_in · k²", "Any spatial-and-channel filter", "Everywhere until 2017"],
        ["1 × 1", "C_out · C_in", "Channel mixing only; changes width cheaply", "Inception, ResNet bottlenecks, SE"],
        ["Depthwise k×k", "C_in · k²", "One spatial filter per channel, no mixing", "MobileNet, EfficientNet, ConvNeXt"],
        ["Depthwise + pointwise", "C_in · k² + C_out · C_in", "Separable approximation of standard; 8× cheaper here", "Mobile and efficient networks"],
        ["Grouped k×k, g groups", "C_out · C_in · k² / g", "Mixing within groups only", "AlexNet (two GPUs), ResNeXt"],
        ["Dilated k×k, rate d", "C_out · C_in · k²", "Field (k − 1)d + 1 at the same cost", "DeepLab, WaveNet, TCNs"]
      ] },

    { t: "h2", n: "04", text: "Dilated convolution", id: "dilated" },

    { t: "code", lang: "text", title: "Field of a 3 × 3 kernel with dilation d = (k − 1)·d + 1 (executed)",
      code: `dilation 1:   3 × 3 field     from 9 weights
dilation 2:   5 × 5
dilation 4:   9 × 9
dilation 8:  17 × 17
a stack of four 3×3 convs with dilations 1, 2, 4, 8:  receptive field 31 px with 36 weights per channel
   (four plain 3×3 convs: 9 px)`,
      caption: "Dilation inserts gaps between the kernel's taps: the same nine weights sample a wider area. Stacking exponentially growing rates gives a field that grows exponentially with depth at linear cost — the design of WaveNet's audio stack and of DeepLab's atrous pyramid (3.7). The price is gridding: with a single large rate the taps miss pixels between them, which is why the rates are stacked or mixed." },

    { t: "h2", n: "05", text: "Transposed convolution", id: "transposed" },

    { t: "p", text: "A transposed convolution goes the other way — from a small map to a large one — and is the learned upsampling in segmentation decoders and generators. Mechanically it places a copy of the kernel, scaled by the input value, at each input position, with the copies spaced by the stride, and sums the overlaps. Its output size is (n − 1)·s − 2p + k, and it is exactly the gradient of the corresponding convolution:" },

    { t: "code", lang: "text", title: "Transposed convolution and the checkerboard (executed)",
      code: `4×4 input, kernel 4, stride 2, padding 1 -> 8×8      formula (n−1)s − 2p + k = 8
conv_transpose2d(y, W) == ∂/∂x ⟨conv(x, W), y⟩:  True    -- it is the backward pass of a convolution

overlap counts per output pixel (a ones kernel applied to a ones input), interior rows:
  kernel 3, stride 2:   4 2 4 2 4 / 2 1 2 1 2 / 4 2 4 2 4     <- uneven: some pixels get four kernel copies, some one
  kernel 4, stride 2:   4 4 4 4 4 / 4 4 4 4 4 / 4 4 4 4 4     even
  kernel 2, stride 2:   1 1 1 1 1 / 1 1 1 1 1 / 1 1 1 1 1     even (no overlap)
alternative: nearest-neighbour upsample ×2 then a 3×3 convolution -> 8×8, no overlap unevenness`,
      caption: "When the kernel size is not a multiple of the stride, the number of kernel copies landing on each output pixel alternates — 4, 2, 4, 2 — and the output carries a periodic pattern whatever the weights: the checkerboard artefact (Odena et al., 2016). Use k divisible by s (4 with stride 2), or resize-then-convolve, which is what most modern decoders do." },

    { t: "h2", n: "06", text: "1-D, 3-D, and equivariance", id: "dims" },

    { t: "code", lang: "text", title: "The same operation in other dimensions (executed)",
      code: `Conv1d on (batch 8, channels 3, length 100), k=5, padding 2:  output (8, 16, 100),  params 256 = 16·3·5 + 16
Conv3d on (batch 2, channels 1, depth 16, 32, 32), k=3:          output (2, 8, 16, 32, 32),  params 224 = 8·1·27 + 8

translation equivariance:  conv(shift(x)) == shift(conv(x)):  True`,
      caption: "1-D convolution slides along time — audio (10.1), time series, and the temporal convolutional networks of 4.4; 3-D slides through volumes or video frames. Equivariance is the property that makes all of them work: shift the input and the feature map shifts with it, so a pattern learned at one position is detected at every position. Pooling (3.2) turns equivariance into approximate *invariance*." },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A 28 × 28 input, 4 × 4 kernel, stride 2, no padding. What is the output size, and why is it not 14?",
          options: [
            "14, because 28/2 = 14",
            "13: ⌊(28 − 4)/2⌋ + 1 = 13 — the last window would start at position 26 and need pixels 26–29, which do not exist, so it is dropped by the floor",
            "12, because the kernel removes two pixels each side",
            "It depends on the padding mode"
          ],
          answer: 1,
          why: "The formula's floor is the count of complete windows. Halving intuitions hold only when (n − k) is divisible by s, which is why 'same' designs use odd kernels with p = (k − 1)/2 and let strides work on even sizes."
        },
        {
          stem: "The receptive field formula gave 22 pixels and the gradient measurement 21. Which is wrong?",
          options: [
            "The formula",
            "Neither: the formula counts the pixels that can affect the output; the measurement counts those that do for the given weights, and a max-pool with constant inputs routes gradient to one element per window, dropping one row and column — with average pooling the measurement is exactly 22",
            "The measurement, because gradients are approximate",
            "Both; the true value is 21.5"
          ],
          answer: 1,
          why: "A gradient-based receptive-field check reports the support of the gradient, which max operations sparsify. The formula is the architectural bound; the effective field (55 % of the mass in the central half) is the practical one."
        },
        {
          stem: "Why does a transposed convolution with kernel 3 and stride 2 produce a checkerboard even before training?",
          options: [
            "Because the weights are random",
            "Because the kernel copies placed every two pixels overlap unevenly when the kernel width is not a multiple of the stride — measured overlap counts alternate 4, 2, 4, 2 — so some output pixels sum more contributions than their neighbours regardless of the weights",
            "Because of zero padding",
            "It does not; the artefact comes from training"
          ],
          answer: 1,
          why: "The pattern is structural. Kernel 4 with stride 2 overlaps evenly (all 4s) and kernel 2 with stride 2 does not overlap at all; either choice, or upsample-then-convolve, removes it."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Convolution with loops, separable by hand, and VGG's receptive field",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Implement conv2d with explicit loops over output positions, handling a batch, multiple input and output channels, stride and padding (use einsum for the per-window dot product). Compare shapes and values with F.conv2d for (stride, padding) = (1, 0), (1, 1), (2, 1), (3, 2) on a (2, 3, 9, 9) input with five 3 × 3 kernels." },
        { t: "p", text: "**(b)** Implement a depthwise-separable convolution from your conv2d — one 3 × 3 filter per channel, then a 1 × 1 mix — and compare with F.conv2d(groups=C) followed by a 1 × 1." },
        { t: "p", text: "**(c)** Compute the receptive field and output stride of VGG-16's convolutional stack (2, 2, 3, 3, 3 convolutions of 3 × 3 at stride 1, each block followed by a 2 × 2 pool at stride 2) after each pooling stage." }
      ],
      requirements: [
        "(a) four rows of shape and max difference.",
        "(b) one max difference.",
        "(c) five (field, stride) pairs and the final map size on a 224 input."
      ],
      hint: "(a) Pad first with F.pad, then the window for output (i, j) starts at (i·s, j·s). (c) Apply r ← r + (k − 1)·j and j ← j·s in order; a pool is a layer with k = s = 2.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) stride 1 padding 0: (2, 5, 7, 7)  max |diff| 3.8e-06
#     stride 1 padding 1: (2, 5, 9, 9)  3.8e-06
#     stride 2 padding 1: (2, 5, 5, 5)  2.9e-06
#     stride 3 padding 2: (2, 5, 4, 4)  1.9e-06

# (b) depthwise-separable by hand vs torch: max |diff| 1.9e-06

# (c) VGG-16 after pooling stages 1–5 (field, stride): (6, 2), (16, 4), (44, 8), (100, 16), (212, 32)
#     final: 212 px field on a 224 input, output stride 32 -> a 7 × 7 map`,
        notes: [
          { t: "p", text: "(a) is slow — a Python loop per output position — and that is the point of 3.2's im2col, which turns the same computation into one matrix product." },
          { t: "p", text: "(b) shows the factorisation is two ordinary convolutions; the parameter saving is in what each one is allowed to see." },
          { t: "p", text: "(c) is why VGG's last convolutional units see the whole image, and why a 224 input produces the 7 × 7 × 512 tensor its classifier flattens." }
        ]
      }
    }
  ],

  takeaways: [
    "A convolution is a dot product of a small kernel with the window under it, repeated at every position with the same weights; frameworks compute cross-correlation (no kernel flip), which is immaterial for learned kernels. Weight sharing gives the parameter economy and translation equivariance (verified).",
    "Output size is ⌊(n + 2p − k)/s⌋ + 1 (28 → 13 with k = 4, s = 2); 'same' padding is p = (k − 1)/2 at stride 1. The receptive field grows by (k − 1)·jump per layer; the gradient measurement (21) fell one short of the formula (22) because max-pooling routes gradient sparsely, and the effective field concentrates 55 % of its mass in the central half.",
    "For 64 → 128 channels: standard 3 × 3 is 73,856 parameters and 151 MFLOPs per 32 × 32 map; 1 × 1 is a per-pixel linear layer (8,320); depthwise-separable is 8,960 (8.2× fewer); grouped with 4 groups is 18,560.",
    "Dilation d gives a field of (k − 1)d + 1 from the same weights; rates 1, 2, 4, 8 stacked reach 31 pixels with 36 weights where plain 3 × 3s reach 9.",
    "Transposed convolution is the backward of a convolution (verified), outputs (n − 1)s − 2p + k, and produces a checkerboard whenever k is not a multiple of s (overlap counts 4, 2, 4, 2); use k = 4 with s = 2 or resize-then-convolve.",
    "The same operation runs in 1-D (audio, series: 256 params for 3 → 16 channels, k = 5) and 3-D (volumes, video); VGG-16's field is 212 px at stride 32 on a 224 input."
  ],

  quiz: {
    title: "The Convolution Operation — Knowledge Check",
    questions: [
      {
        stem: "Why does a convolutional layer have so many fewer parameters than a fully connected layer on the same input?",
        options: [
          "Because it uses smaller numbers",
          "Because one kernel's weights are shared across every position: a 3 × 3 kernel is 9 weights wherever the image is 224 × 224, whereas a dense layer assigns a separate weight to every input pixel for every unit — the sharing also makes the layer equivariant to translation",
          "Because convolution ignores most of the image",
          "Because it has no bias"
        ],
        answer: 1,
        why: "Lesson 1.1 showed 92 % of an MLP's parameters in its first layer because of the input dimension; convolution removes that dependence entirely. The measured equivariance — conv(shift x) = shift(conv x) — is the same sharing seen from the output side."
      },
      {
        stem: "What does a 1 × 1 convolution compute, and what is it for?",
        options: [
          "It copies the input",
          "A linear map applied to each pixel's channel vector independently (verified equal to nn.Linear per pixel): it mixes channels without spatial context, and is used to change the channel count cheaply — bottlenecks, the pointwise half of a separable convolution, attention gates",
          "A spatial blur",
          "A pooling operation"
        ],
        answer: 1,
        why: "At 8,320 parameters against 73,856 for a 3 × 3, it is the cheap way to widen or narrow a network. Inception and ResNet bottlenecks use it to reduce channels before an expensive 3 × 3 and restore them after."
      },
      {
        stem: "How does a depthwise-separable convolution achieve its saving, and what does it give up?",
        options: [
          "By using a smaller kernel; nothing",
          "By factoring the standard convolution into one spatial filter per input channel (C·k² weights) and a 1 × 1 channel mix (C_out·C_in): 8,960 against 73,856 here. It gives up the ability to have a different spatial filter for every (input, output) channel pair — 64 shared filters instead of 8,192",
          "By skipping half the pixels; resolution",
          "By quantising the weights; precision"
        ],
        answer: 1,
        why: "The factorisation assumes spatial and channel structure can be handled separately; empirically that assumption costs little accuracy and buys the efficiency of MobileNet and EfficientNet. The exercise shows it is literally two convolutions in sequence."
      },
      {
        stem: "Why stack dilated convolutions with rates 1, 2, 4, 8 rather than use a single rate 8?",
        options: [
          "Because rate 8 is not supported",
          "Because a single large rate samples the input on a sparse grid and misses the pixels between taps (gridding), while the stack covers every pixel and still reaches a 31-pixel field with 36 weights — exponential field growth at linear cost",
          "Because rate 1 is required for the first layer",
          "For numerical stability"
        ],
        answer: 1,
        why: "WaveNet and TCNs use exactly this doubling to see thousands of audio samples with a handful of layers; DeepLab's atrous pyramid applies several rates in parallel for the same reason."
      },
      {
        stem: "A decoder upsamples with ConvTranspose2d(kernel_size=3, stride=2) and the outputs show a regular grid pattern before training has done anything. What is it and how do you remove it?",
        options: [
          "Dead ReLUs; use leaky ReLU",
          "The checkerboard artefact: kernel copies spaced by the stride overlap unevenly (counts 4, 2, 4, 2) when k is not a multiple of s; use kernel 4 with stride 2 (even overlap) or nearest/bilinear upsampling followed by an ordinary convolution",
          "A padding error; set padding to 0",
          "Vanishing gradients"
        ],
        answer: 1,
        why: "The measured overlap map shows the pattern is a property of the operation, present with any weights. Modern segmentation and generative decoders mostly use resize-then-convolve for this reason."
      }
    ]
  },

  interview: {
    title: "Interview Questions — The Convolution Operation",
    sub: "The operation on numbers, sizes and fields, the variants and their costs, dilation, transposed convolution.",
    questions: [
      {
        level: "Core",
        q: "Explain the convolution operation in a CNN and work an example.",
        strong: "A kernel — a small weight tensor, say 3 × 3 — is placed at each position of the input; the output at that position is the sum of the element-wise product of the kernel and the window beneath it. On a 5 × 5 input with a Sobel-x kernel [[1, 0, −1], [2, 0, −2], [1, 0, −1]], the top-left output is 1·1 + 0 + 0 + 0 + 0 + 2·(−2) + 3·1 + 0 + 1·(−1) = −1, and the full 3 × 3 output matches F.conv2d exactly. The same nine weights are used at every position, which gives the two properties that matter: parameter economy — 9 weights for the whole image rather than one per pixel — and translation equivariance, shifting the input shifts the output, which I verified. Frameworks compute cross-correlation rather than true convolution, which flips the kernel; for learned kernels the difference is immaterial. A layer has one kernel per output channel, each looking at all input channels; stride sets how far the kernel moves and padding lets it be centred on edge pixels.",
        answer: [
          { t: "p", text: "The definition, the executed example, sharing and equivariance, the flip, and the layer's structure." }
        ]
      },
      {
        level: "Core",
        q: "How do you compute the output size and the receptive field?",
        strong: "Output size is ⌊(n + 2p − k)/s⌋ + 1: a 224 input with a 7 × 7 kernel, padding 3 and stride 2 gives 112, and 28 with k = 4 at stride 2 gives 13, not 14, because the floor drops the incomplete window. The receptive field is accumulated layer by layer: r ← r + (k − 1)·j and j ← j·s, where j is the cumulative stride. For VGG-16 that gives 6, 16, 44, 100, 212 pixels after its five pooling stages at strides 2 to 32 — its last units see the whole 224 image. I checked the formula by gradient: for a six-layer stack the formula said 22 and the gradient support was 21 × 21, because with constant weights a max-pool passes gradient to one element per window; with average pooling the measurement was exactly 22. The effective receptive field is smaller than either — 55 % of the gradient mass sat in the central half — because central pixels reach the output through many paths and edge pixels through one.",
        answer: [
          { t: "p", text: "Both formulas with executed values, the gradient check and its discrepancy explained, and the effective field." }
        ]
      },
      {
        level: "Core",
        q: "Compare standard, 1 × 1, depthwise-separable and grouped convolutions.",
        strong: "For 64 → 128 channels on a 32 × 32 map: a standard 3 × 3 has 128·64·9 = 73,856 parameters and 151 MFLOPs. A 1 × 1 has 8,320 — it is a linear layer applied to each pixel's channel vector, verified equal to nn.Linear per pixel — and mixes channels with no spatial context; it is how bottlenecks change width cheaply. A depthwise-separable convolution factors the standard one into a 3 × 3 filter per input channel (64·9) and a 1 × 1 mix (128·64): 8,960 parameters, 8.2× fewer, at the cost of having 64 shared spatial filters instead of 8,192 — MobileNet's and EfficientNet's building block, and empirically a small accuracy price. A grouped convolution with g groups splits channels into g independent convolutions, dividing parameters by g (18,560 at g = 4); depthwise is the g = C_in extreme, ResNeXt uses g = 32. Dilation belongs in the same table: the same 3 × 3 weights with taps spread by rate d see a (2d + 1)-pixel field at no extra cost.",
        answer: [
          { t: "p", text: "Each variant's mechanism and executed parameter count, what it trades, and where it is used." }
        ]
      },
      {
        level: "Advanced",
        q: "What is a transposed convolution, what goes wrong with it, and what is the alternative?",
        strong: "It maps a small feature map to a larger one — learned upsampling — and it is precisely the backward pass of a convolution: conv_transpose2d(y, W) equals the gradient of ⟨conv(x, W), y⟩ with respect to x, which I verified numerically. Mechanically it places a copy of the kernel scaled by each input value at positions spaced by the stride and sums the overlaps; the output size is (n − 1)s − 2p + k, so a 4 × 4 input with kernel 4, stride 2, padding 1 gives 8 × 8. What goes wrong is uneven overlap: with kernel 3 and stride 2 the number of kernel copies touching each output pixel alternates 4, 2, 4, 2 across the map, so a periodic pattern is imprinted before any training — the checkerboard artefact. Kernel 4 with stride 2 overlaps evenly (every pixel gets 4) and kernel 2 with stride 2 does not overlap at all; the more common fix is nearest or bilinear resizing followed by an ordinary 3 × 3 convolution, which has no overlap structure and is what most current segmentation decoders and generators use.",
        answer: [
          { t: "p", text: "The definition and the gradient identity, the size formula, the executed overlap counts, and the two fixes." }
        ]
      }
    ]
  }
});

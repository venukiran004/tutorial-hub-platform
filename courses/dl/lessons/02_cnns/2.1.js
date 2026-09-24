/* ============================================================================
   LESSON 2.1 — The Convolution Operation
   Mirrors 02_CNNs.md · §1. Every number is recomputed rather than copied, which
   is how the reference's worked 5x5 example turned out to be wrong — see the
   callout in section 02 (scratchpad/dl/d21.py, torch 2.10).
   ========================================================================= */
EC.receiveLesson({
  id: "2.1",

  lede: "**A convolution is a small grid of weights dragged across a bigger grid of numbers, multiplying and adding as it goes.** That is the whole operation. What makes it matter is not the arithmetic but two consequences of reusing the same weights everywhere: a layer that would need 33 million parameters as a fully connected one needs 74 thousand, and a feature learned in one corner of an image is detected in every other corner for free. This lesson computes the operation by hand, checks the output-size formula against PyTorch on four shapes, measures the parameter saving, and demonstrates translation equivariance to zero error.",

  objectives: [
    "Compute a convolution by hand and say what each term is",
    "Apply the output-size formula and predict a layer's spatial dimensions",
    "Count a convolution's parameters and compare against a fully connected layer",
    "Explain why deep learning's \"convolution\" is really cross-correlation, and why nobody minds",
    "Name the three properties that make CNNs work on images"
  ],

  prerequisites: ["1.1", "1.11"],

  blocks: [

    { t: "h2", n: "01", text: "The operation", id: "operation" },

    { t: "p", text: "At every position, line the kernel up with a patch of the input, multiply element by element, and add the results into a single output number. Slide by the stride and repeat. The output is a **feature map**: one number per position, saying how strongly that patch matched the pattern the kernel encodes." },

    { t: "math", tex: "\\text{Output}(i, j) = \\sum_{m}\\sum_{n} \\text{Input}(i+m,\\, j+n) \\cdot \\text{Kernel}(m, n) + b" },

    { t: "code", lang: "python", title: "d21.py — the operation, written out",
      code: `out = np.zeros((3, 3), dtype=np.float32)
for i in range(3):
    for j in range(3):
        out[i, j] = (inp[i:i + 3, j:j + 3] * ker).sum()`,
      caption: "Two loops over output positions, an element-wise product and a sum. Everything else in a convolution layer is bookkeeping around this." },

    { t: "h2", n: "02", text: "The reference's example, recomputed", id: "worked" },

    { t: "p", text: "The reference works a 5×5 input against a 3×3 kernel, both alternating ones and zeros. Running it gives a different answer from the one printed." },

    { t: "out", text: `  output:
 [[5 0 5]
 [0 5 0]
 [5 0 5]]
  reference says [[4,3,4],[2,4,3],[4,3,4]] -> False
  position (0,0): 1*1 + 0*0 + 1*1 + 0*0 + 1*1 + 0*0 + 1*1 + 0*0 + 1*1 = 5` },

    { t: "callout", kind: "warn", title: "The reference's arithmetic is wrong here",
      body: [{ t: "p", text: "The reference spells the first position out as `1·1 + 0·0 + 1·1 + 0·0 + 1·1 + 0·0 + 1·1 + 0·0 + 1·1` and then writes `= 4`. Those terms are five ones and four zeros, so the sum is **5**. The whole output matrix is wrong for the same reason — with this input and this kernel every position is either 5 or 0, never 4, 3 or 2. The operation the reference describes is correct; only the numbers printed beside it are not, which is exactly the sort of thing that survives in written material until somebody runs it." }] },

    { t: "diagram", kind: "matrix", title: "What the correct output actually is",
      caption: "The alternating input and the plus-shaped kernel either line up completely (all five ones meet ones) or not at all. There is no middle value available.",
      cols: ["j=0", "j=1", "j=2"],
      rows: ["i=0", "i=1", "i=2"],
      cells: [
        [{ text: "5", tone: "good" }, { text: "0", tone: "crit" }, { text: "5", tone: "good" }],
        [{ text: "0", tone: "crit" }, { text: "5", tone: "good" }, { text: "0", tone: "crit" }],
        [{ text: "5", tone: "good" }, { text: "0", tone: "crit" }, { text: "5", tone: "good" }]
      ] },

    { t: "h2", n: "03", text: "It is cross-correlation, not convolution", id: "cross-correlation" },

    { t: "p", text: "Mathematical convolution flips the kernel 180° before sliding it. Deep learning does not, and calls the result convolution anyway. Since the kernel is **learned**, a network that would benefit from the flipped version simply learns the flipped version — so the distinction has no consequence for training, and every framework implements the unflipped operation under the name `Conv2d`." },

    { t: "out", text: `cross-correlation (what Conv2d does):
 [[366 411 456]
 [591 636 681]
 [816 861 906]]
true convolution (kernel flipped):
 [[174 219 264]
 [399 444 489]
 [624 669 714]]
differ: True` },

    { t: "callout", kind: "note", title: "Why it takes an asymmetric example to see it",
      body: [{ t: "p", text: "The reference's own 5×5 input is unchanged by a 180° rotation, and so is its kernel — so flipping changes nothing and the difference is invisible. Demonstrating it needs an input that is not symmetric, which is why the numbers above run 0 to 24 rather than reusing the reference's grid. Worth knowing when you try to reproduce this: a symmetric test case will convince you the two operations are the same." }] },

    { t: "h2", n: "04", text: "Output size", id: "output-size" },

    { t: "math", tex: "n_{out} = \\left\\lfloor \\frac{n_{in} + 2p - k}{s} \\right\\rfloor + 1" },

    { t: "out", text: `  in= 32 k=3 p=1 s=1 -> formula  32, Conv2d  32  OK  (same)
  in= 32 k=3 p=0 s=1 -> formula  30, Conv2d  30  OK  (shrinks)
  in= 32 k=3 p=1 s=2 -> formula  16, Conv2d  16  OK  (downsample)
  in=224 k=7 p=3 s=2 -> formula 112, Conv2d 112  OK  (ResNet stem)` },

    { t: "table", head: ["Want", "Set", "Why"],
      rows: [
        ["Same spatial size", "`padding = k // 2`, `stride = 1`", "The standard 3×3 with padding 1. Lets you stack layers without the map shrinking away"],
        ["Halve the size", "`stride = 2`", "How modern CNNs downsample; ResNet does this rather than pooling in later stages"],
        ["Shrink by `k-1`", "`padding = 0`", "\"Valid\" convolution. Loses a border every layer, which adds up in deep stacks"],
        ["ResNet's stem", "`k=7, p=3, s=2`", "224 → 112 in one layer, with a wide receptive field before anything else happens"]
      ] },

    { t: "callout", kind: "trap", title: "The floor is where off-by-ones live",
      body: [{ t: "p", text: "With a stride above 1 the division rarely comes out exactly, and the floor silently discards the remainder — an input of 33 with `k=3, p=1, s=2` gives 17, and the last row and column of the input contribute to nothing. Nothing warns you. If your feature map is one smaller than you expected, or a skip connection will not add because the shapes differ by one, this is almost always why." }] },

    { t: "h2", n: "05", text: "Why the parameter count is the point", id: "parameters" },

    { t: "math", tex: "\\text{Params} = (k \\times k \\times C_{in} + 1) \\times C_{out}" },

    { t: "out", text: `  Conv2d(64, 128, 3) : formula 73,856   actual 73,856
  Linear(64x64x64 -> 128) : formula 33,554,560   actual 33,554,560
  ratio: 454x more parameters in the fully connected layer` },

    { t: "p", text: "The same 64-channel, 64×64 input into 128 outputs: **73,856 parameters as a convolution, 33.5 million as a fully connected layer** — 454 times more. And the convolution's count does not depend on the image size at all. Feed it 224×224 instead of 64×64 and it is still 73,856, because the kernel is reused at every position rather than having its own weights there." },

    { t: "callout", kind: "insight", title: "Weight sharing is the whole economy",
      body: [{ t: "p", text: "A fully connected layer learns a separate weight for \"edge at pixel (12, 40)\" and another for \"edge at pixel (13, 40)\", and neither helps the other. A convolution learns \"edge\" once and applies it everywhere. That is simultaneously why it needs so few parameters, why it generalises from less data, and why it finds the feature wherever the object happens to be — three benefits from one decision." }] },

    { t: "h2", n: "06", text: "Translation equivariance, measured", id: "equivariance" },

    { t: "p", text: "The claim is that shifting the input shifts the output identically. That is testable: convolve a shifted image, and separately shift the convolution of the original, and compare." },

    { t: "out", text: `  conv(shift(x)) vs shift(conv(x)) : max difference 0.000e+00
  the same feature is detected wherever the pattern moves` },

    { t: "callout", kind: "note", title: "Equivariance, not invariance",
      body: [{ t: "p", text: "The output *moves with* the input — that is equivariance. Invariance would mean the output does not change at all, which a convolution does not give you and which you often do not want: a segmentation model needs to know where the object is. Invariance comes later, from pooling and from global average pooling at the end (lesson 2.2), which is exactly where the spatial information is deliberately thrown away." }] },

    { t: "diagram", kind: "layers", title: "Three properties, one after the other",
      caption: "The hierarchy is not designed in; it emerges because each layer sees a larger patch of the original image than the one before it. Lesson 2.2 makes that receptive field precise.",
      items: [
        { label: "Local connectivity", sub: "each output sees a small patch — edges and textures", tone: "accent" },
        { label: "Weight sharing", sub: "one kernel everywhere — 454x fewer parameters, equivariance", tone: "good" },
        { label: "Hierarchy", sub: "edges, then corners, then parts, then objects", tone: "violet" }
      ] },

    { t: "exercise", kind: "practice", title: "Predict every shape in a stack", difficulty: "core", minutes: 22,
      prompt: "Write out a six-layer CNN on 224×224×3 input with a mix of kernel sizes, strides and paddings. Before running anything, compute the spatial size and parameter count of every layer by hand. Then build it in PyTorch and print each layer's output shape and parameter count to check. Deliberately include one layer with an odd input size and stride 2 so you meet the floor. Finally, replace the last convolution with a Linear layer over the flattened map and compare the parameter counts.",
      hints: [
        "`(n + 2p - k) // s + 1`, applied layer by layer.",
        "A forward hook, or just printing the shape after each layer, is enough to check.",
        "The Linear comparison is the 454× figure on your own architecture."
      ],
      solution: {
        notes: [
          { t: "p", text: "Doing this by hand once is worth more than reading the formula ten times, because the failure it prevents is concrete: a mismatch deep in a stack shows up as a shape error in a layer that is not the one at fault, and tracing it backwards is tedious. Getting fluent with the arithmetic means you predict it instead." },
          { t: "p", text: "The odd-input case is the one to dwell on. An input of 33 with stride 2 produces 17 and quietly drops the last row and column — no error, no warning. In a network with skip connections that is how you end up with two branches differing by one pixel, and the addition failing several layers later." }
        ]
      } }

  ],

  takeaways: [
    "A convolution multiplies a kernel with a patch and sums — two loops and an element-wise product.",
    "The reference's worked example prints 4 where the arithmetic gives 5; the correct output is all 5s and 0s.",
    "`n_out = floor((n_in + 2p - k) / s) + 1`, verified against Conv2d on four shapes including ResNet's 224 → 112 stem.",
    "`(k·k·C_in + 1)·C_out` — 73,856 parameters against 33.5 million fully connected, a 454× saving.",
    "The parameter count does not depend on the image size, because the kernel is reused rather than duplicated.",
    "Conv2d is cross-correlation; the kernel is learned, so the missing flip changes nothing."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Input 32×32, kernel 3, padding 1, stride 2. What is the output size?",
      options: ["32", "30", "16", "15"],
      answer: 2,
      why: "`floor((32 + 2 - 3) / 2) + 1 = floor(15.5) + 1 = 16`, which the executed run confirms against Conv2d. The floor is doing real work here — the division is not exact, and the remainder is silently discarded." },
    { stem: "Conv2d(64, 128, 3) has 73,856 parameters on a 64×64 input. How many on a 224×224 input?",
      options: ["73,856", "About 900,000", "It scales with the area, so roughly 12× more", "It depends on the stride"],
      answer: 0,
      why: "Exactly the same. `(k·k·C_in + 1)·C_out` contains no spatial term, because the kernel is applied at every position rather than having separate weights per position. That independence from input size is what weight sharing buys, and it is why a fully connected equivalent needed 454× more." },
    { stem: "Why does it not matter that Conv2d implements cross-correlation rather than true convolution?",
      options: ["The two are mathematically identical", "The kernel is learned, so the network learns the flipped version if that is what helps", "Frameworks flip it internally", "It only matters for symmetric kernels"],
      answer: 1,
      why: "They are genuinely different operations — the executed comparison on an asymmetric input gives 366 against 174 in the first position. But nothing about training depends on which convention is used, because the weights are free parameters: whatever kernel would be optimal under one convention, its flip is optimal under the other." },
    { stem: "You shift an input image by five pixels. What happens to a convolution's output?",
      options: ["It is unchanged — convolutions are translation invariant", "It shifts by the same five pixels", "It changes unpredictably", "It shifts by five divided by the stride"],
      answer: 1,
      why: "The output moves with the input, which is equivariance, and the executed check measures the difference at exactly 0.000e+00. Invariance — the output not changing at all — is a different property, and it comes from pooling rather than from the convolution itself." }
  ] },

  interview: { title: "Interview", sub: "Convolution questions", questions: [
    { level: "Core", q: "Why use a convolution instead of a fully connected layer on images?",
      strong: "Weight sharing: far fewer parameters, independent of image size, and the feature is found wherever it appears.",
      answer: [{ t: "p", text: "Three things follow from reusing one kernel across the whole input. Parameters collapse — I have measured 73,856 for a Conv2d(64, 128, 3) against 33.5 million for the fully connected equivalent on a 64×64 input, a factor of 454. The count does not grow with image size, because there are no per-position weights. And the same feature detector applies everywhere, so an edge learned in one corner is detected in the other, which is both a generalisation benefit and the reason CNNs need less data. A fully connected layer has to learn \"edge at pixel 12,40\" separately from \"edge at pixel 13,40\", and neither helps the other." }] },
    { level: "Core", q: "Give the output-size formula and use it on ResNet's first layer.",
      strong: "`floor((n + 2p - k)/s) + 1`; with 224, k=7, p=3, s=2 that is 112.",
      answer: [{ t: "p", text: "`n_out = floor((n_in + 2p - k)/s) + 1`. ResNet's stem takes 224 input with a 7×7 kernel, padding 3, stride 2: `(224 + 6 - 7)/2 + 1` = `111.5` floored to 111, plus 1, so 112. I have checked that against Conv2d along with three other cases. The detail worth flagging is the floor — with an odd input and stride 2 it silently drops the last row and column, which is a common source of a shape mismatch that surfaces several layers later in a skip connection rather than where it was caused." }] },
    { level: "Senior", q: "What does a convolution give you, and what does it not?",
      strong: "Equivariance to translation, not invariance — and nothing at all for rotation or scale.",
      answer: [{ t: "p", text: "It gives translation equivariance: shift the input and the feature map shifts identically, which I have verified to exactly zero difference. That is not invariance, and the distinction matters for design. Invariance would mean the output is unchanged by the shift, which you get from pooling and from global average pooling at the end — and which you actively do not want in a segmentation or detection model, where position is the answer. What a convolution gives you for free about rotation and scale is nothing: a rotated object produces different activations, which is why augmentation exists and why architectures that need genuine rotation invariance have to build it in explicitly. It is worth being precise about this in an interview, because \"CNNs are translation invariant\" is a very common thing to say and it is the wrong word." }] }
  ] }
});

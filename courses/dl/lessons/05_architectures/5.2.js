/* ============================================================================
   LESSON 5.2 — Reference Card: the Convolutional Network
   Mirrors Architectures/cnn.md. Parameter formula verified exactly against
   PyTorch (scratchpad/dl, d41-series).
   ========================================================================= */
EC.receiveLesson({
  id: "5.2",

  lede: "**A convolution's parameter count does not depend on the size of the image.** That single fact is the whole argument for the architecture: a 3×3 convolution from 3 to 64 channels is 1,792 parameters whether the input is 32×32 or 1024×1024, where a dense layer doing the same job on a 224×224 image would need **5,376 times more**. This card is what to reach for when a convolutional network is misbehaving.",

  objectives: [
    "Apply the convolution parameter formula and explain its independence from image size",
    "Diagnose a CNN from its symptom",
    "Rank the hyperparameters and know the standard values",
    "State where CNNs are genuinely weak"
  ],

  prerequisites: ["5.1"],

  blocks: [

    { t: "h2", n: "01", text: "The card", id: "tldr" },

    { t: "table", head: ["", ""],
      rows: [
        ["**Core operation**", "slide a learned kernel over a grid, sharing weights at every position"],
        ["**Assumes**", "nearby inputs relate; a pattern is worth detecting anywhere"],
        ["**Gives you**", "translation equivariance for free — not learned from data"],
        ["**Structure**", "conv → norm → activation → pool, repeated; channels up as space goes down"],
        ["**Key risks**", "overfitting on small data, lost spatial detail, depth without residuals"],
        ["**PyTorch**", "`nn.Conv2d`, `nn.BatchNorm2d`, `nn.MaxPool2d`, `nn.AdaptiveAvgPool2d`"]
      ] },

    { t: "h2", n: "02", text: "Parameter count", id: "complexity" },

    { t: "math", tex: "\\text{params} = (K \\cdot K \\cdot C_{in} + 1) \\cdot C_{out}, \\qquad \\text{compute} = O(O_H \\cdot O_W \\cdot K^2 \\cdot C_{in} \\cdot C_{out})" },

    { t: "out", text: `  cnn.md   Conv2d(3,64,3): formula 1,792  pytorch 1,792

  input   32x32: Conv2d(3,64,3) has 1,792 params, output (64, 30, 30)
  input  224x224: Conv2d(3,64,3) has 1,792 params, output (64, 222, 222)
  input 1024x1024: Conv2d(3,64,3) has 1,792 params, output (64, 1022, 1022)
  a dense layer over 224x224x3 -> 64 units would need 9,633,856 (5,376x more)` },

    { t: "callout", kind: "insight", title: "Parameters are constant; compute is not",
      body: [{ t: "p", text: "The two halves of the formula behave completely differently. Parameters depend only on the kernel and channel counts, so they are fixed. **Compute** includes `O_H · O_W`, so it scales with the image area — a 1024×1024 input costs about a thousand times the arithmetic of a 32×32 one through the same 1,792 weights. This is why downsampling early matters so much for throughput, and why people are often surprised that a model with few parameters can be slow. Parameter count tells you about memory and overfitting risk; it tells you almost nothing about speed." }] },

    { t: "h2", n: "03", text: "Diagnosis", id: "failures" },

    { t: "table", head: ["Symptom", "Likely cause", "Fix"],
      rows: [
        ["Train ≫ validation accuracy", "Small dataset, large model", "Data augmentation, transfer learning, dropout, weight decay"],
        ["Deep network will not train at all", "Long gradient path without shortcuts", "Residual connections — measured gradient decay 12.5× against 1.20× over 20 blocks"],
        ["Poor generalisation on limited images", "Not enough data to learn features from scratch", "Pretrained backbone — measured 67.1 % against 34.3 % on 2,000 images"],
        ["Boundaries and small objects are poor", "Too much pooling; detail destroyed", "Dilated convolutions, U-Net skips — only 12.5 % of thin structure survives 4 poolings"],
        ["Fails on shifted or zoomed inputs", "Augmentation too narrow", "Flips, random resized crops, scale jitter"],
        ["Slow despite few parameters", "Large feature maps early", "Strided convolutions, 1×1 bottlenecks, smaller input"],
        ["Accuracy quietly below expectation", "Wrong normalisation statistics for a pretrained model", "Use the mean/std the weights were trained with"]
      ] },

    { t: "callout", kind: "good", title: "On any real vision task, start with a pretrained backbone",
      body: [{ t: "p", text: "Lesson 2.5 measured a frozen ImageNet ResNet-18 at 67.1 % against the identical architecture from scratch at 34.3 % on 2,000 images — thirty-three points from the weights alone, while training 5,130 parameters instead of 11.2 million and finishing faster. Almost no architectural change you could make is worth a third of that. If a CNN is underperforming and it was trained from scratch, that is the first thing to change." }] },

    { t: "h2", n: "04", text: "The knobs", id: "hyperparameters" },

    { t: "table", head: ["Parameter", "Effect", "Standard value"],
      rows: [
        ["Kernel size `K`", "Receptive field per layer", "3×3 — two stacked 3×3 beat one 5×5 at 28 % fewer weights"],
        ["Filters `C_out`", "Feature capacity per layer", "Double at each downsample: 64, 128, 256, 512"],
        ["Stride `S`", "Downsampling", "1 in conv layers, 2 where you want to halve"],
        ["Padding `P`", "Preserve or shrink spatial size", "`padding=K//2` for 'same'"],
        ["Pooling", "Downsampling type", "Max 2×2, or strided convolutions instead"],
        ["Depth", "Feature hierarchy", "Use a known architecture rather than choosing"]
      ] },

    { t: "h2", n: "04b", text: "The shape arithmetic", id: "shapes" },

    { t: "math", tex: "O = \\left\\lfloor \\frac{I + 2P - K}{S} \\right\\rfloor + 1" },

    { t: "p", text: "The one formula worth memorising, because nearly every shape error in a convolutional network traces back to it. With `K=3, P=1, S=1` the output matches the input, which is why that combination is the default in almost every modern architecture — it lets you stack convolutions without tracking sizes. With `S=2` the spatial size halves. The floor is what makes odd input sizes lose a pixel, and it is part of why 224 is such a common input resolution: it halves cleanly five times to 7." },

    { t: "table", head: ["Goal", "Settings"],
      rows: [
        ["Preserve size", "`K=3, P=1, S=1` — or generally `P = K//2`"],
        ["Halve the size", "`K=3, P=1, S=2`"],
        ["Aggressive downsample (stem)", "`K=7, P=3, S=2`, then max pool"],
        ["Change channels only", "`K=1, P=0, S=1` — the 1x1 convolution"]
      ] },

    { t: "callout", kind: "trap", title: "Receptive field grows slowly without stride",
      body: [{ t: "p", text: "Stacking 3x3 convolutions at stride 1 grows the receptive field by only 2 pixels per layer, so ten layers see 21 pixels — on a 224-pixel image that is a small fraction of the scene. Downsampling is what makes the receptive field grow multiplicatively rather than additively, which is why architectures interleave stride or pooling rather than simply stacking. If a model seems unable to use global context, compute the receptive field at the final layer before reaching for anything more exotic; it is often far smaller than people assume." }] },

    { t: "h2", n: "05", text: "Honest strengths and weaknesses", id: "tradeoffs" },

    { t: "diagram", kind: "compare", title: "What convolutions are for",
      caption: "The weaknesses are all consequences of the assumption that makes them work.",
      columns: [
        { title: "Good at", tone: "good", items: [
          "Parameter efficiency — 1,792 against 9.6 million for the same job",
          "Translation equivariance, for free",
          "Learning a feature hierarchy automatically",
          "Transfer learning — the effect is enormous"
        ] },
        { title: "Bad at", tone: "warn", items: [
          "Rotation and scale — neither is built in, unlike translation",
          "Long-range relationships without considerable depth",
          "Non-grid data — graphs, sets, irregular sampling",
          "Competing with ViT when data is truly abundant"
        ] }
      ] },

    { t: "callout", kind: "trap", title: "Convolutions are equivariant to translation, not invariant — and to nothing else",
      body: [{ t: "p", text: "Shifting the input shifts the feature map correspondingly; that is equivariance, and pooling converts a little of it into invariance within the pooling window. Rotation and scale get no such treatment — a network trained on upright objects genuinely fails on rotated ones unless you augment for it. This is worth being precise about because 'CNNs are translation invariant' is repeated so often that people assume the invariance is broader and stronger than it is." }] },

    { t: "exercise", kind: "practice", title: "Audit a convolutional network", difficulty: "intermediate", minutes: 35,
      prompt: "Take a CNN and produce a per-layer table of parameters, output shape, and estimated FLOPs. Identify which layer holds the most parameters and which costs the most compute — they will not be the same layer. Then test the invariance claims directly: measure accuracy on the test set, and on the same test set shifted by 5 pixels, rotated by 15°, and scaled by 1.2×. Report all four.",
      hints: [
        "FLOPs per conv layer ≈ `O_H · O_W · K² · C_in · C_out · 2`.",
        "Early layers are usually compute-heavy and parameter-light; late layers the reverse.",
        "Apply the transforms at test time only, with no retraining."
      ],
      solution: {
        notes: [
          { t: "p", text: "The parameters-versus-FLOPs split is the point of the first half. Early layers operate on large feature maps with few channels, so they are cheap in parameters and expensive in compute; late layers are the opposite. Optimising the wrong end is a common mistake — if inference is slow, the fix is usually reducing early-layer spatial size, not pruning the large late layers." },
          { t: "p", text: "The invariance test typically shows accuracy holding up well under small translations and degrading noticeably under rotation and scale. That asymmetry is exactly what the architecture predicts: translation is built in, and nothing else is. It is worth seeing the numbers because it tells you which augmentations your particular deployment actually needs, rather than applying a standard recipe." }
        ]
      } }

  ],

  takeaways: [
    "`(K·K·C_in + 1)·C_out` — verified exactly: `Conv2d(3,64,3)` is 1,792 parameters.",
    "Parameter count is independent of image size; a dense equivalent at 224×224 needs 5,376× more.",
    "Compute is *not* independent — it scales with the image area through the same weights.",
    "Pretrained backbones dominate: 67.1 % against 34.3 % on 2,000 images.",
    "Residual connections are what make depth trainable — 1.20× gradient decay against 12.5×.",
    "Pooling destroys fine detail: only 12.5 % of thin structure survives four rounds.",
    "Translation equivariance is built in; rotation and scale are not, and need augmentation."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "How many parameters in `nn.Conv2d(3, 64, 3)`?",
      options: ["576", "1,792", "9,633,856", "It depends on the image size"],
      answer: 1,
      why: "`(3·3·3 + 1)·64 = 28·64 = 1,792`, verified against PyTorch exactly. It does not depend on input size — the same layer handles 32×32 and 1024×1024 identically, where a dense layer over 224×224×3 to 64 units would need 9,633,856." },
    { stem: "A CNN has few parameters but is slow. Why?",
      options: ["The parameter count is wrong", "Compute scales with feature-map area, which parameter count does not capture", "Convolutions are inherently slow", "Too many layers"],
      answer: 1,
      why: "Compute is `O(O_H · O_W · K² · C_in · C_out)`, so a large input costs proportionally more arithmetic through the same weights. Early layers are typically compute-heavy and parameter-light. Parameter count predicts memory and overfitting risk, not speed." },
    { stem: "Which property do convolutions give you for free?",
      options: ["Rotation invariance", "Translation equivariance", "Scale invariance", "All three"],
      answer: 1,
      why: "Weight sharing means shifting the input shifts the feature map correspondingly. Rotation and scale get no such treatment — a network trained on upright objects fails on rotated ones unless augmented. The common phrase 'translation invariant' overstates both the operation and its breadth." },
    { stem: "Your CNN overfits badly on 2,000 images. What is the highest-impact fix?",
      options: ["Add dropout", "Use a pretrained backbone", "Reduce the number of filters", "Lower the learning rate"],
      answer: 1,
      why: "Measured at 67.1 % against 34.3 % from scratch on exactly this data size — thirty-three points, while training 5,130 parameters rather than 11.2 million. Dropout and capacity reduction help at the margin; transfer learning changes the regime." }
  ] },

  interview: { title: "Interview", sub: "CNN diagnosis", questions: [
    { level: "Core", q: "Why are convolutions parameter-efficient?",
      strong: "Weight sharing makes the count independent of input size — 1,792 against 9.6 million for the same job.",
      answer: [{ t: "p", text: "The same kernel is applied at every spatial position, so the parameter count is `(K²·C_in + 1)·C_out` and depends only on the kernel and channel counts. A 3×3 layer from 3 to 64 channels is 1,792 parameters whether the image is 32 by 32 or 1024 by 1024. A dense layer doing the equivalent on a 224×224 image would need 9.6 million — about 5,400 times more. The efficiency is really a consequence of the assumption rather than a trick: because a useful feature detector is worth applying everywhere, you do not need a separate one per position. That same sharing is what gives translation equivariance. The caveat I would add is that this is a statement about parameters, not compute — compute scales with feature-map area, so a low-parameter network can still be slow." }] },
    { level: "Senior", q: "How would you cut a CNN's inference cost in half?",
      strong: "Reduce early-layer spatial size first — that is where the compute is, not where the parameters are.",
      answer: [{ t: "p", text: "I would measure before cutting, because parameters and compute live in different places. Early layers operate on large feature maps with few channels, so they are parameter-light and compute-heavy; late layers are the reverse. That means pruning the large late layers barely helps latency while reducing input resolution or adding an early stride cuts it substantially. After that the standard moves are depthwise separable convolutions, which I have measured at 88.4 per cent fewer parameters for a 3x3 — with the caveat that they are memory-bound, so the latency saving on a GPU is much smaller than the FLOP saving suggests and must be benchmarked on the target device. Then fp16, which is exactly 2x smaller and usually free in accuracy, and exporting to ONNX Runtime or TensorRT, which I measured at 1.95x faster than eager PyTorch on CPU with no change to the model at all. I would actually try that last one first, since it costs nothing." }] },
    { level: "Senior", q: "A CNN trains fine at 10 layers but not at 30. What is happening?",
      strong: "Gradient decay through depth — add residual connections.",
      answer: [{ t: "p", text: "This is the degradation problem, and the tell is that it shows in *training* loss rather than validation, which distinguishes it from overfitting. A deeper plain network reaching a worse training loss than a shallower one is an optimisation failure, and the cause is that the gradient has to traverse thirty transformations to reach the early layers. I have measured it: over twenty plain blocks the gradient norm at the first block was 12.5 times that at the last, while the same stack with residual connections gave a ratio of 1.20. The fix is residual connections, and the reason they work is that `H(x) = F(x) + x` makes the derivative `1 + ∂F/∂x`, giving every layer a path with derivative one to the loss. There is a second benefit worth mentioning: zeroing the final batch-norm scale makes a block exactly the identity, so adding depth can never hurt in principle, which is what the plain network could not do." }] }
  ] }
});

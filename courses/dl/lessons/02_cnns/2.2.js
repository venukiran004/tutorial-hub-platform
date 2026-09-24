/* ============================================================================
   LESSON 2.2 — Pooling and the Anatomy of a CNN
   Mirrors 02_CNNs.md · §2 (Pooling Layers) and §3 (CNN Architecture Anatomy,
   including the receptive field). The reference's max-pool example checks out;
   its average-pool example does not — see section 01
   (scratchpad/dl/d22.py, torch 2.10).
   ========================================================================= */
EC.receiveLesson({
  id: "2.2",

  lede: "**Pooling throws information away on purpose, and the whole architecture is organised around doing that at the right rate.** Spatial size falls, channel count rises, and by the end a 224×224 image is 512 numbers with no spatial extent at all. The two decisions worth understanding are why modern networks end with global average pooling instead of a flatten — 49× fewer parameters, measured — and why they use stacks of 3×3 kernels instead of bigger ones, which is the receptive-field argument that explains VGG and everything after it.",

  objectives: [
    "Compute max and average pooling by hand and say what each preserves",
    "Explain what translation invariance pooling actually provides, and its limit",
    "Justify global average pooling with its parameter count",
    "Compute the receptive field of a stack, with and without stride",
    "Explain why two 3×3 convolutions beat one 5×5"
  ],

  prerequisites: ["2.1"],

  blocks: [

    { t: "h2", n: "01", text: "Max against average", id: "pooling" },

    { t: "p", text: "Both slide a window and summarise it with one number. **Max** keeps the strongest response, which suits feature detection — you care whether the edge was there, not what the average was around it. **Average** keeps the overall level, which is smoother and loses peaks." },

    { t: "out", text: `  max pool 2x2 s=2:
 [[5. 4.]
 [3. 4.]]
  reference says [[5,4],[3,4]] -> True
  avg pool 2x2 s=2:
 [[2.75 1.75]
 [1.25 2.5 ]]` },

    { t: "callout", kind: "warn", title: "The reference's average-pool numbers are wrong",
      body: [{ t: "p", text: "Its max-pool output `[[5,4],[3,4]]` is correct. Its average-pool output is printed as `[[2.5, 2.5], [2.0, 2.5]]`, but the four windows are `[1,3,5,2]`, `[2,4,1,0]`, `[1,0,3,1]` and `[3,2,1,4]`, whose means are **2.75, 1.75, 1.25 and 2.50**. Only the last one matches. The same lesson as 2.1's worked example: the operation is described correctly and the numbers beside it were never run." }] },

    { t: "diagram", kind: "matrix", title: "The four windows, computed",
      caption: "Max keeps the peak of each window; average keeps its level. The two disagree most where one large value sits among small ones — the top-left window, 5 against a mean of 2.75.",
      cols: ["window", "max", "mean"],
      rows: ["top-left [1,3,5,2]", "top-right [2,4,1,0]", "bottom-left [1,0,3,1]", "bottom-right [3,2,1,4]"],
      cells: [
        ["1 3 5 2", { text: "5", tone: "good" }, { text: "2.75", tone: "accent" }],
        ["2 4 1 0", { text: "4", tone: "good" }, { text: "1.75", tone: "accent" }],
        ["1 0 3 1", { text: "3", tone: "good" }, { text: "1.25", tone: "accent" }],
        ["3 2 1 4", { text: "4", tone: "good" }, { text: "2.50", tone: "accent" }]
      ] },

    { t: "h2", n: "02", text: "How much invariance pooling actually gives", id: "invariance" },

    { t: "p", text: "Pooling is usually described as providing translation invariance. It does, but only within a window — and that limit is easy to measure by shifting a single activation and checking whether the pooled output changes." },

    { t: "out", text: `  shift (0,0): pooled output identical = True
  shift (0,1): pooled output identical = False
  shift (1,0): pooled output identical = False
  shift (1,1): pooled output identical = False
  identical for 1 of 4 sub-window shifts -- invariance only inside the window` },

    { t: "callout", kind: "trap", title: "\"A degree of\" is doing a lot of work",
      body: [{ t: "p", text: "A 2×2 max pool is invariant to a shift that keeps the peak inside the same window, and not otherwise — here three of the four one-pixel shifts moved the activation across a window boundary and changed the output. So pooling buys tolerance measured in single pixels per layer, not real robustness to an object moving. What gives a classifier genuine position independence is the **global** average pool at the end, which has no windows left to cross. Augmentation is what handles anything larger (lesson 2.6)." }] },

    { t: "h2", n: "03", text: "Global average pooling", id: "gap" },

    { t: "p", text: "The classic ending was to flatten the final feature map and feed it to a fully connected layer. Modern networks average each channel down to a single number instead — one value per channel, no spatial extent, and no parameters at all." },

    { t: "out", text: `  flatten 512x7x7 -> FC(25088, 1000) : 25,089,000  (actual 25,089,000)
  GAP -> 512 -> FC(512, 1000)              : 513,000  (actual 513,000)
  saving: 24,576,000 parameters, a factor of 49
  GAP shape: (2, 512, 7, 7) -> (2, 512, 1, 1) -> flatten (2, 512)
  GAP has parameters: 0` },

    { t: "p", text: "**Twenty-four and a half million parameters removed from a single layer.** In the original VGG those fully connected layers were most of the network's weights, and almost all of its overfitting. Replacing them costs nothing — global average pooling has no parameters to learn — and it also frees the network from a fixed input size, since averaging works on any spatial extent." },

    { t: "diagram", kind: "compare", title: "Two ways to end a network",
      caption: "ResNet, GoogLeNet and EfficientNet all take the right-hand column. The left is mostly of historical interest, and of interest when you meet an old checkpoint that will only accept one input size.",
      columns: [
        { title: "Flatten + FC", tone: "warn", items: ["25,089,000 parameters", "Input size fixed by the flatten", "Most of the network's overfitting", "Keeps spatial detail the classifier rarely needs"] },
        { title: "Global average pool", tone: "good", items: ["513,000 parameters, a 49x saving", "Any input size works", "Acts as regularisation", "One number per channel: \"how much of this feature, anywhere\""] }
      ] },

    { t: "h2", n: "04", text: "The shape of a CNN", id: "anatomy" },

    { t: "p", text: "The design rule is one sentence: **as spatial dimensions fall, channel count rises.** Each halving of height and width is matched by a doubling of channels, so the amount of information per layer stays roughly constant while what it represents becomes more abstract." },

    { t: "out", text: `  input                (3, 224, 224)
  after MaxPool2d          (64, 112, 112)
  after MaxPool2d          (128, 56, 56)
  after MaxPool2d          (256, 28, 28)
  after MaxPool2d          (512, 14, 14)
  after AdaptiveAvgPool2d  (512, 1, 1)
  after Flatten            (512,)
  backbone parameters: 1,552,896` },

    { t: "dl", items: [
      ["Double channels when you halve space", "224→112 goes with 3→64, then 112→56 with 64→128. Keeps the computation per stage roughly level."],
      ["3×3 convolutions throughout", "Section 05 is the argument. Larger kernels are almost never worth it."],
      ["BatchNorm after every conv, before the activation", "Lesson 1.8. The convolution then needs no bias, since BatchNorm has its own shift."],
      ["Dropout in the head, not the backbone", "Dropping individual pixels of a feature map achieves little, because neighbours are correlated and carry the same information. DropBlock drops contiguous regions instead."],
      ["Global average pool, then a small head", "Section 03. The backbone above is 1.55 M parameters; a flatten-and-FC ending would have added sixteen times that."]
    ] },

    { t: "h2", n: "05", text: "The receptive field", id: "receptive-field" },

    { t: "p", text: "The receptive field is how much of the original image influences one output value. It grows with depth, and the rate is what the architecture is really choosing." },

    { t: "math", tex: "\\text{RF}(l) = \\text{RF}(l-1) + (k_l - 1)\\prod_{i<l} s_i" },

    { t: "out", text: `  1 layer(s) of 3x3, stride 1 -> receptive field 3x3
  2 layer(s) of 3x3, stride 1 -> receptive field 5x5
  3 layer(s) of 3x3, stride 1 -> receptive field 7x7
  5 layer(s) of 3x3, stride 1 -> receptive field 11x11` },

    { t: "p", text: "Two stacked 3×3 convolutions see a 5×5 patch. Three see 7×7. That equivalence is the basis of the most consequential design decision in CNN history." },

    { t: "out", text: `    two 3x3 : 2 x (3^2 x 64^2) = 73,728 weights
    one 5x5 : 5^2 x 64^2       = 102,400 weights
    the pair uses 28% fewer, and has two non-linearities rather than one` },

    { t: "callout", kind: "insight", title: "Why every modern CNN is built from 3×3",
      body: [{ t: "p", text: "Two 3×3 convolutions and one 5×5 see exactly the same region, but the pair uses **28 % fewer weights** and applies **two** non-linearities instead of one — so it is cheaper and strictly more expressive. The same argument scales: three 3×3s beat one 7×7 by more. VGG's contribution was to take this seriously and use nothing but 3×3 throughout, and essentially every architecture since has agreed. The exception is the stem, where a single large kernel on the raw image is still common — ResNet's 7×7." }] },

    { t: "out", text: `    kernels 3,3,3,3 strides 1,2,1,2 -> receptive fields [3, 5, 9, 13]` },

    { t: "p", text: "Stride compounds. The same four 3×3 layers reach 13×13 rather than 9×9 once two of them have stride 2, because every later layer's steps are measured in a coarser grid. This is why downsampling early is how networks reach a receptive field covering the whole image without needing hundreds of layers." },

    { t: "callout", kind: "tradeoff", title: "A receptive field smaller than the object is a design bug",
      body: [{ t: "p", text: "If a network must recognise something 100 pixels across and its deepest units only see 40, no amount of training fixes it — the information is not in the unit's input. Computing the receptive field of your final layer is a five-minute check that occasionally explains a stubborn accuracy ceiling. The counterpart matters too: a field far larger than the object means each unit is averaging over mostly irrelevant context, which is one reason detection architectures make predictions at several depths rather than only the last (lesson 2.7)." }] },

    { t: "exercise", kind: "practice", title: "Compute the field, then change it", difficulty: "core", minutes: 24,
      prompt: "Take the five-stage backbone from section 04 and compute the receptive field at the end of each stage using the formula. Then verify it empirically: feed a zero image, set one pixel of the final feature map's gradient to 1, backpropagate to the input, and measure the size of the non-zero region. Compare with your arithmetic. Then replace all 3×3 kernels with 5×5, recompute both the receptive field and the parameter count, and say what you gained and lost.",
      hints: [
        "`RF += (k-1) * product of strides so far` — track the running stride product separately.",
        "`x.requires_grad_(True)` then `out[0,0,i,j].backward()`; the non-zero region of `x.grad` is the receptive field.",
        "Pooling layers count too — a 2×2 pool with stride 2 has k=2, s=2."
      ],
      solution: {
        notes: [
          { t: "p", text: "The gradient trick is the satisfying part, because it measures the receptive field rather than computing it: whatever the input gradient is non-zero over is exactly what influenced that output. It also catches mistakes the formula hides, like forgetting that pooling layers contribute — a 2×2 pool adds to the field and multiplies the stride product, and leaving it out understates the answer badly in a deep stack." },
          { t: "p", text: "Swapping to 5×5 grows the field faster and costs far more: parameters go up by about 2.8× per layer for the same channel counts, and you lose a non-linearity at every substitution. The comparison makes the VGG argument concrete rather than received — the pair of 3×3s is not a convention, it is strictly better on both axes that matter." }
        ]
      } }

  ],

  takeaways: [
    "Max pooling keeps the peak, average keeps the level; the reference's average-pool example prints the wrong four numbers.",
    "Pooling's translation invariance is only within a window — three of four one-pixel shifts changed the output.",
    "Global average pooling replaced 25,089,000 parameters with 513,000, a 49× saving, and has none of its own.",
    "The design rule is channels up as space down: 224→112→56→28→14, 3→64→128→256→512.",
    "`RF(l) = RF(l-1) + (k-1)·∏s`; stacks of 3×3 give 3, 5, 7, 11 and stride compounds it to 13.",
    "Two 3×3 match one 5×5's field with 28 % fewer weights and two non-linearities — the reason VGG used only 3×3."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why do modern CNNs end with global average pooling rather than flatten plus a fully connected layer?",
      options: ["It is faster at inference", "It removes tens of millions of parameters and frees the input size", "It preserves more spatial detail", "It adds a non-linearity"],
      answer: 1,
      why: "The measured comparison is 25,089,000 parameters against 513,000 — a 49× saving on one layer, with GAP itself having none. It also removes the fixed input size that a flatten imposes, since averaging works on any spatial extent. It preserves *less* spatial detail, deliberately." },
    { stem: "Two stacked 3×3 convolutions versus one 5×5 — what do you gain?",
      options: ["A larger receptive field", "The same receptive field with 28 % fewer weights and an extra non-linearity", "Fewer layers to train", "Better translation invariance"],
      answer: 1,
      why: "The receptive fields are identical at 5×5. The measured weight counts are 73,728 against 102,400, and the pair applies two activations rather than one — cheaper and strictly more expressive, which is why VGG used nothing but 3×3." },
    { stem: "A 2×2 max pool is applied and the input shifts by one pixel. What happens to the output?",
      options: ["It never changes — pooling is translation invariant", "It changes unless the peak stays inside the same window", "It shifts by one pixel", "It changes only for average pooling"],
      answer: 1,
      why: "The executed check shifted a single activation four ways and the pooled output was identical in only one. Invariance holds within a window and stops at its boundary, so pooling buys tolerance of a pixel or two per layer — not robustness to an object moving across the image." },
    { stem: "Four 3×3 layers with strides 1, 2, 1, 2. What is the final receptive field?",
      options: ["9×9", "11×11", "13×13", "15×15"],
      answer: 2,
      why: "`RF += (k-1)·∏s` gives 3, 5, 9, 13 — the executed run confirms it. Each stride-2 layer doubles the step size for everything after it, so the field grows much faster than the 9×9 that four stride-1 layers would reach." }
  ] },

  interview: { title: "Interview", sub: "Pooling and architecture questions", questions: [
    { level: "Core", q: "What does pooling do for you?",
      strong: "Shrinks the map, gives a pixel or two of shift tolerance, and cuts the parameters in whatever follows.",
      answer: [{ t: "p", text: "It summarises a window into one number — max for the strongest response, average for the overall level — which reduces spatial size and therefore the cost of everything downstream. The invariance claim needs care: it holds only within a window. I have measured that by shifting one activation by a pixel in four directions and the pooled output was unchanged in only one of them. So pooling buys a pixel or two of tolerance per layer, and genuine position independence comes from the global average pool at the end, where there are no window boundaries left to cross." }] },
    { level: "Core", q: "Why is 3×3 the standard kernel size?",
      strong: "Two 3×3 match one 5×5's receptive field with 28 % fewer weights and an extra non-linearity.",
      answer: [{ t: "p", text: "Stacking is strictly better on both axes. Two 3×3 layers see the same 5×5 region as one 5×5 layer, but I have counted 73,728 weights against 102,400 — 28 % fewer — and the pair applies two activations rather than one, so it is also more expressive. The argument compounds: three 3×3s against one 7×7 is a bigger win again. VGG's real contribution was taking this seriously and using nothing else, and every architecture since has broadly agreed. The surviving exception is the stem, where a single wide kernel on the raw image is still common." }] },
    { level: "Senior", q: "Your CNN plateaus on a task involving large objects. What would you check?",
      strong: "The receptive field of the final layer — if it is smaller than the object, no training can fix it.",
      answer: [{ t: "p", text: "I would compute it before touching anything else, with `RF += (k-1)·∏s` layer by layer, remembering that pooling layers count. If the deepest units see 40 pixels and the object is 100 across, the information simply is not in their input and the ceiling is structural. The fixes are then architectural rather than hyperparameter: add depth, downsample earlier so the stride product compounds, or use dilated convolutions to widen the field without adding parameters. I would also verify the arithmetic empirically by backpropagating from a single output unit to the input and measuring the non-zero region, because the formula is easy to get wrong in a network with mixed strides. The opposite failure is worth naming too — a field far larger than the object means every unit is averaging over mostly irrelevant context, which is why detection architectures predict from several depths rather than only the last." }] }
  ] }
});

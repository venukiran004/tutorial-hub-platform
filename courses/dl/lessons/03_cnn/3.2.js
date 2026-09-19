/* ============================================================================
   LESSON 3.2 — Pooling, Anatomy and a CNN from Scratch
   ========================================================================= */
EC.receiveLesson({
  id: "3.2",

  lede: "**Pooling throws away position on purpose, and the network is better for it: shift an image by one pixel and the raw feature map changes by 57 %, the 4 × 4-pooled map by 20 %, the globally pooled vector by 0 %.** That is equivariance turned into invariance, and it is why a classifier ends in global average pooling — which also cuts the classifier head from 25 million parameters to half a million. The second half of this lesson writes a convolutional network in NumPy: convolution as a single matrix product through im2col (13× faster than loops), max-pooling with its argmax gradient, global pooling, a gradient check at 2 × 10⁻⁸, and a training run that reaches 90 % on MNIST in three epochs.",

  objectives: [
    "Compute max, average and global pooling by hand with their gradients, and measure how pooling converts equivariance into invariance",
    "Count parameters and FLOPs layer by layer for a small CNN and say where each lives",
    "Implement convolution as im2col followed by one matrix multiply, and time it against loops and against torch",
    "Write the backward pass of convolution (via col2im), max-pooling and global-average-pool + linear, and gradient-check the assembled network",
    "Train the NumPy CNN on MNIST and compare with the same architecture in PyTorch"
  ],

  prerequisites: ["3.1", "2.1"],

  blocks: [

    { t: "h2", n: "01", text: "Pooling", id: "pooling" },

    { t: "code", lang: "text", title: "2 × 2 pooling with stride 2 on a 4 × 4 map (executed)",
      code: `input          max pool       avg pool
1 3 2 0        4  5           2.50  2.00
4 2 1 5        6  8           2.25  3.50
0 6 3 1
2 1 8 2        global average 2.5625     global max 8

max-pool gradient: 1 at each window's argmax, 0 elsewhere
0 0 0 0
1 0 0 1
0 1 0 0
0 0 1 0`,
      caption: "Max-pooling keeps the strongest response in each window and routes the gradient only to it — three of every four inputs receive nothing, which is what made the receptive-field measurement in 3.1 come out one pixel short. Average pooling spreads the gradient evenly (¼ to each). Neither has parameters." },

    { t: "code", lang: "text", title: "Equivariance becomes invariance (executed)",
      code: `a 4 × 4 square in a 16 × 16 image, shifted by one pixel; ReLU(conv) features, then average-pooled:
  pooled to 16 × 16 (no pooling)   relative change 0.573
  pooled to  4 × 4                 relative change 0.198
  pooled to  1 × 1 (global)        relative change 0.000`,
      caption: "Convolution is equivariant: the feature map moves with the input, so as a vector it changes a lot. Pooling summarises a neighbourhood, so a small shift inside the neighbourhood changes nothing; global pooling makes the representation exactly translation-invariant. A classifier wants invariance ('is there a cat'); a detector or segmenter wants to keep position and pools less (3.6, 3.7)." },

    { t: "dl", items: [
      ["Max vs average", "Max selects the strongest detection and is the default inside the network; average keeps a smoother summary and is the default for the global pool at the end. Global max pooling exists and is more sensitive to a single strong activation."],
      ["Pooling vs strided convolution", "A stride-2 convolution also halves resolution, with learned weights and no argmax; modern designs (ResNet after its stem, all-convolutional nets) mostly use it, keeping one max-pool at the start. The two are interchangeable in shape arithmetic."],
      ["Global average pooling (GAP)", "Average every channel over its whole map to one number. Lin et al. (2013): replaces the flatten-and-linear head, makes the network accept any input size, and forces each channel to be a class-evidence map — the basis of CAM (3.7)."],
      ["Adaptive pooling", "nn.AdaptiveAvgPool2d(output_size) chooses the window so that any input reaches a fixed size; GAP is the (1, 1) case."]
    ] },

    { t: "code", lang: "text", title: "The classifier head on VGG's 512 × 7 × 7 map, 1,000 classes (executed)",
      code: `flatten + linear     25,089,000 parameters
GAP + linear            513,000 parameters     (49× fewer)   -- and it accepts any input size`,
      caption: "VGG-16's three dense layers hold 124 million of its 138 million parameters; ResNet ended the practice with a global pool and one linear layer. The exercise trains both heads on the NumPy network — the GAP head wins there too, at 3.5× fewer parameters." },

    { t: "h2", n: "02", text: "Anatomy of a small CNN", id: "anatomy" },

    { t: "code", lang: "text", title: "Three convolutions, two pools, GAP, linear — on 28 × 28 (executed)",
      code: `layer   in → out                      params      forward FLOPs
c1      (1, 28, 28) → (16, 28, 28)       160          0.2 M     then ReLU, max-pool → 14 × 14
c2      (16, 14, 14) → (32, 14, 14)    4,640          1.8 M     then ReLU, max-pool → 7 × 7
c3      (32, 7, 7) → (64, 7, 7)       18,496          1.8 M     then ReLU
fc      GAP → (64,) → (10,)              650

total 23,946 parameters, 3.8 MFLOPs per image
  -- 47 % of the compute is in c2, 77 % of the parameters are in c3`,
      caption: "The pattern of every convolutional classifier: resolution halves and channels double at each stage, so the FLOPs per layer stay roughly constant (c2 and c3 both 1.8 M) while the parameters concentrate in the deep, wide, low-resolution layers. FLOPs per conv = 2 · C_out · C_in · k² · H_out · W_out; parameters = C_out · C_in · k² + C_out." },

    { t: "h2", n: "03", text: "Convolution as one matrix multiply: im2col", id: "im2col" },

    { t: "p", text: "A loop over output positions is slow in any interpreted language. im2col rearranges the input so that every kernel-sized window becomes a column of a matrix; the convolution is then a single matrix product between the flattened kernels and that matrix, which is what BLAS and GPUs are built for:" },

    { t: "code", lang: "python", title: "im2col and the convolution (executed)",
      code: `def im2col(x, k, stride=1, padding=0):                      # x: (B, C, H, W)
    xp = np.pad(x, ((0,0), (0,0), (padding,)*2, (padding,)*2))
    Ho = (H + 2p - k)//stride + 1; Wo = ...
    cols = np.zeros((B, C, k, k, Ho, Wo))
    for i in range(k):
        for j in range(k):
            cols[:, :, i, j] = xp[:, :, i : i + stride*Ho : stride, j : j + stride*Wo : stride]   # k² slices, not Ho·Wo
    return cols.reshape(B, C*k*k, Ho*Wo)

def conv_im2col(x, w, b):
    cols = im2col(x, k, stride, padding)                       # (B, C·k², Ho·Wo)
    out = w.reshape(O, -1) @ cols + b[:, None]                 # (O, C·k²) @ (B, C·k², Ho·Wo) -> (B, O, Ho·Wo)
    return out.reshape(B, O, Ho, Wo)

batch 8, 3 → 16 channels, 28 × 28, k = 3:  cols shape (8, 27, 784);  W is (16, 27);  max |diff| vs torch 7.6e-06
  im2col + matmul   3.4 ms        Python loops over positions   45.8 ms   (13× slower)
  batch 256:  im2col 23.4 ms      torch conv2d 4.3 ms          (torch is 5× faster still: fused kernels, no column copy)`,
      caption: "The loop is over the k² kernel offsets, not over the Ho · Wo positions, so it runs nine times instead of 784. The cost is memory: the column matrix is k² times the input. cuDNN uses im2col for some sizes and Winograd or FFT algorithms for others; the matrix-product view is also why a convolution's backward is two matrix products, exactly like a linear layer's (1.4)." },

    { t: "h2", n: "04", text: "The backward passes", id: "backward" },

    { t: "code", lang: "python", title: "Conv backward through the column matrix; max-pool and GAP backward",
      code: `class Conv:
    def forward(self, x):   self.x = x; out, self.cols = conv_im2col(x, self.W, self.b); return out
    def backward(self, dout):                                         # dout: (B, O, Ho, Wo)
        d = dout.reshape(B, O, -1)                                    # (B, O, Ho·Wo)
        self.dW = einsum("bop,bcp->oc", d, self.cols).reshape(W.shape)  # δ paired with the columns: like xᵀδ
        self.db = d.sum((0, 2))
        dcols = einsum("oc,bop->bcp", self.W.reshape(O, -1), d)       # back through W: like δWᵀ
        return col2im(dcols, self.x.shape)                            # scatter-add the columns back into the image

class MaxPool2:
    def forward(self, x):   xr = x.reshape(B, C, H//2, 2, W//2, 2); self.out = xr.max((3, 5)); self.mask = xr == out[..., None, :, None]; return out
    def backward(self, d):  return (self.mask * d[:, :, :, None, :, None]).reshape(B, C, H, W)      # gradient to the argmax

class GAPLinear:
    def forward(self, x):   self.g = x.mean((2, 3)); return self.g @ self.W + self.b
    def backward(self, d):  self.dW = self.g.T @ d; self.db = d.sum(0); return broadcast(d @ self.W.T / (H·W), x.shape)`,
      caption: "col2im is im2col's transpose: each column's gradient is added back to the input positions it came from (overlapping windows sum). With the column matrix in hand, the convolution's two gradients are the same two products as a linear layer's — which is the whole reason for the reshaping." },

    { t: "code", lang: "text", title: "Gradient check and MNIST (executed)",
      code: `conv(1→8) - ReLU - pool - conv(8→16) - ReLU - pool - conv(16→32) - ReLU - GAP - linear(32→10):  6,218 parameters
gradient check, 226 sampled parameters, float64:  worst |analytic − numeric| = 2.3e-08

6,000 MNIST images, SGD 0.05 with momentum, batch 32:
  NumPy CNN     epoch 1  0.6281     epoch 2  0.9029     epoch 3  0.9026     (53 s)
  PyTorch, same architecture and optimiser
                epoch 1  0.4922     epoch 2  0.8751     epoch 3  0.9277     ( 9 s)`,
      caption: "The two runs differ in their random draws and land within three points of each other after three epochs on a tenth of the data; PyTorch is six times faster because its convolution is fused and its pooling does not materialise a mask. The check at 2 × 10⁻⁸ — slightly worse than the MLP's 10⁻¹¹ because max-pool ties make the function non-smooth at a few points — is what says the backward passes are right." },

    { t: "h2", n: "05", text: "The standard blueprint", id: "blueprint" },

    { t: "table", head: ["Stage", "What", "Why"],
      rows: [
        ["Stem", "A first convolution, often larger (7 × 7 stride 2 in ResNet) with one max-pool", "Reduce resolution early so the expensive layers run on smaller maps"],
        ["Stages", "Blocks of conv-norm-activation; resolution halves and channels double between stages", "Constant FLOPs per stage; growing receptive field; the features go from edges to parts to objects"],
        ["Downsampling", "Max-pool 2 × 2 or a stride-2 convolution at each stage boundary", "Invariance and compute; strided conv is learned, pooling is not"],
        ["Head", "Global average pool then one linear layer", "49× fewer parameters than flatten; any input size; class-evidence maps"],
        ["Normalisation and activation", "BatchNorm after each conv (1.6), ReLU or SiLU (1.2)", "Trainability at depth; 3.3 adds the skip connection that completes the recipe"]
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Shifting the input by one pixel changed the unpooled features by 57 %, the 4 × 4-pooled features by 20 % and the globally pooled features by 0 %. What does that show?",
          options: [
            "That convolution is not translation-equivariant",
            "That convolution is equivariant (the map moves, so the vector changes) and pooling converts that into invariance by summarising neighbourhoods — the coarser the pool, the less a small shift matters, until global pooling removes position entirely",
            "That pooling destroys the features",
            "That the shift was too small"
          ],
          answer: 1,
          why: "Equivariance is what lets one kernel detect a pattern anywhere; invariance is what a classifier needs at its output. The measurement shows the two are the same property seen before and after pooling, and why detectors pool less than classifiers."
        },
        {
          stem: "Why does im2col make convolution fast even though it copies the input k² times?",
          options: [
            "Because copying is free",
            "Because it converts the convolution into one large matrix multiply, which BLAS executes near hardware peak, and its own loop runs over the k² kernel offsets (9) rather than the Ho · Wo positions (784) — measured 13× faster than position loops",
            "Because it reduces the number of multiplications",
            "Because it uses integer arithmetic"
          ],
          answer: 1,
          why: "The FLOP count is identical; what changes is how many times Python (or any scalar loop) intervenes and how well the arithmetic vectorises. The memory cost is the k²-fold column matrix, which is why libraries also use Winograd and FFT variants."
        },
        {
          stem: "Where do the parameters and the compute of a convolutional classifier concentrate, and why?",
          options: [
            "Both in the first layer",
            "Compute is roughly constant per stage because resolution halves as channels double (c2 and c3 both 1.8 MFLOPs), while parameters concentrate in the deep wide layers (77 % in c3) because parameters scale with C_in · C_out and not with resolution",
            "Both in the classifier head",
            "Parameters in the first layer, compute in the last"
          ],
          answer: 1,
          why: "FLOPs = 2 · C_out · C_in · k² · H · W and parameters = C_out · C_in · k²; halving H and W while doubling C keeps the first constant and quadruples the second. It is why pruning and quantisation (11.1) target late layers and why a flatten head was so expensive."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Average pooling's backward, the head comparison, and im2col at scale",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Implement 2 × 2 average pooling with a backward pass (each input receives a quarter of its window's gradient) and check both against torch on a (2, 3, 8, 8) input." },
        { t: "p", text: "**(b)** Replace the NumPy network's GAP + linear head with flatten + linear (32 · 7 · 7 → 10) and train both for three epochs on 6,000 MNIST images; report parameter counts and test accuracy per epoch." },
        { t: "p", text: "**(c)** Time im2col + matmul against F.conv2d at batch 8, 64 and 256 on 3 → 16 channels, 28 × 28." }
      ],
      requirements: [
        "(a) a forward equality and a backward max difference.",
        "(b) two parameter counts and two rows of three accuracies.",
        "(c) three timing pairs."
      ],
      hint: "(a) np.repeat along both spatial axes then divide by 4. (b) Only the last layer changes; its input is the (B, 32, 7, 7) map. (c) Time a single call each; torch's first call may include one-off setup, so call it once before timing.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) avg pool by hand: forward matches torch True;  backward max |diff| 0.0

# (b) GAP + linear       6,218 params    test acc [0.6281, 0.9029, 0.9026]   (29 s)
#     flatten + linear  21,578 params    test acc [0.8330, 0.8448, 0.8469]   (37 s)
#     -- the flatten head starts faster (more parameters to fit with) and finishes lower; the GAP head generalises better

# (c) batch   8:  im2col+matmul  0.3 ms   torch conv2d 1.8 ms     (torch's per-call overhead dominates at tiny batch)
#     batch  64:                 6.2 ms                1.4 ms     4×
#     batch 256:                23.4 ms                4.3 ms     5×`,
        notes: [
          { t: "p", text: "(a) is the other pooling gradient: dense and uniform, where max-pooling's is sparse and routed." },
          { t: "p", text: "(b) reproduces the argument for GAP on a network small enough to see it: fewer parameters and a better final score." },
          { t: "p", text: "(c) is the honest scaling: im2col in NumPy is the right idea, and a fused library kernel is still several times faster." }
        ]
      }
    }
  ],

  takeaways: [
    "Max-pooling keeps each window's maximum and routes the gradient only to it; average pooling keeps the mean and spreads the gradient by ¼. Neither has parameters; both halve resolution.",
    "Pooling converts equivariance into invariance: a one-pixel shift changed unpooled features by 57 %, 4 × 4-pooled by 20 %, globally pooled by 0 %. Classifiers want invariance and end in GAP; detectors and segmenters pool less.",
    "GAP + linear replaces flatten + linear at 49× fewer parameters on VGG's 512 × 7 × 7 map (513k vs 25M), accepts any input size, and on the NumPy network beat the flatten head (0.903 vs 0.847) with 3.5× fewer parameters.",
    "In a convolutional classifier FLOPs stay roughly constant per stage (resolution halves, channels double) and parameters concentrate in the deep wide layers: 47 % of the compute in c2, 77 % of the parameters in c3.",
    "im2col turns convolution into one matrix product: 13× faster than position loops, within 5× of torch's fused kernel; with the column matrix, the convolution's backward is the same two products as a linear layer's, and col2im scatter-adds the input gradient.",
    "A NumPy CNN — conv, ReLU, max-pool, GAP, linear, 6,218 parameters — passed a gradient check at 2 × 10⁻⁸ and reached 90.3 % on MNIST in three epochs on 6,000 images; PyTorch's identical architecture reached 92.8 % six times faster."
  ],

  quiz: {
    title: "Pooling, Anatomy and a CNN from Scratch — Knowledge Check",
    questions: [
      {
        stem: "What is the difference between translation equivariance and translation invariance, and which layers provide each?",
        options: [
          "They are synonyms",
          "Equivariance: shift the input and the output shifts the same way — convolution. Invariance: shift the input and the output does not change — produced by pooling, exactly so for global pooling (0 % change measured) and approximately for local pooling",
          "Convolution is invariant and pooling is equivariant",
          "Only fully connected layers are invariant"
        ],
        answer: 1,
        why: "A kernel detects a pattern wherever it is (equivariance); a classifier must answer the same whatever position it was in (invariance). The measured 57 % → 20 % → 0 % is the transition from one to the other through pooling."
      },
      {
        stem: "Why did the NumPy CNN's gradient check give 2 × 10⁻⁸ where the MLP's gave 10⁻¹¹?",
        options: [
          "Because convolution gradients are approximate",
          "Because max-pooling makes the function piecewise: at parameters where two entries in a window tie, the argmax switches and the finite difference straddles a kink — the analytic gradient is still correct almost everywhere, and 10⁻⁸ is a pass",
          "Because im2col loses precision",
          "Because the check used float32"
        ],
        answer: 1,
        why: "A finite-difference check assumes smoothness within ±ε; ReLU and max have kinks. On sampled parameters most avoid them, and the worst case is slightly worse than the smooth MLP. A relative error of order one on a whole tensor would indicate a real bug."
      },
      {
        stem: "A network must classify images of varying size without resizing them. Which head allows this?",
        options: [
          "Flatten + linear, with padding",
          "Global average pooling + linear: the pool averages each channel over whatever spatial extent it has, so the linear layer always receives a C-dimensional vector; a flatten head fixes H · W at construction",
          "Max-pooling with a fixed kernel",
          "No convolutional network can"
        ],
        answer: 1,
        why: "Fully convolutional networks (3.7) rely on the same property for dense prediction. The receptive field and the training resolution still matter for accuracy, but the shapes work."
      },
      {
        stem: "In the conv backward, ∂L/∂W = einsum('bop,bcp->oc', d, cols). What is this in linear-layer terms?",
        options: [
          "The bias gradient",
          "xᵀδ: the layer's input (the column matrix, one column per output position) paired with the output gradient, summed over batch and positions — the same product as a linear layer's weight gradient once the windows are columns",
          "The input gradient",
          "A regularisation term"
        ],
        answer: 1,
        why: "im2col makes a convolution a linear layer over windows, so 1.4's two products apply: cols paired with δ for the weights, δ sent back through Wᵀ for the columns, then col2im to scatter the column gradients into the image."
      },
      {
        stem: "Why do modern architectures often replace max-pooling with stride-2 convolutions?",
        options: [
          "Because max-pooling is slower",
          "Because a strided convolution downsamples with learned weights and passes gradient to every input rather than to one per window, at the cost of a few parameters; the shape arithmetic is identical, so the choice is about learnability, and ResNet keeps one max-pool only in its stem",
          "Because pooling cannot be used with BatchNorm",
          "Because strided convolutions are invariant"
        ],
        answer: 1,
        why: "Springenberg et al.'s all-convolutional net showed pooling was not essential; the sparse gradient of max-pooling (three quarters of inputs get none) is one reason learned downsampling can train better. Both remain in use."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Pooling, Anatomy and a CNN from Scratch",
    sub: "Pooling and invariance, the head, where parameters live, im2col and the backward passes.",
    questions: [
      {
        level: "Core",
        q: "What does pooling do and why is it used?",
        strong: "It summarises each small window of a feature map by one number — the maximum or the mean — and usually halves the resolution. Three things follow. Compute: the next layers run on a quarter of the pixels, which is how a network keeps its FLOPs per stage constant while doubling channels. Receptive field: after a stride-2 pool every later kernel covers twice as many input pixels. And invariance: convolution is equivariant, so a one-pixel shift moved the raw features by 57 % in my measurement; pooled to 4 × 4 the change was 20 %, and global average pooling gave 0 % — the representation became translation-invariant, which is what a classifier's output needs. Max-pooling keeps the strongest detection and routes its gradient only to the argmax; average pooling keeps a smoother summary with a uniform gradient. Global average pooling at the end replaces the flatten-and-linear head — 513,000 parameters against 25 million on VGG's last map — and lets the network accept any input size. Modern designs often use stride-2 convolutions instead of pooling inside the network, since the downsampling is then learned, but the head still pools.",
        answer: [
          { t: "p", text: "The operation, its three effects with the executed invariance numbers, max against average, the GAP head, and the strided-conv alternative." }
        ]
      },
      {
        level: "Advanced",
        q: "How would you implement convolution efficiently without a framework?",
        strong: "With im2col: rearrange the input so that every kernel-sized window becomes a column of a matrix of shape (C·k², H_out·W_out), then the convolution is one matrix product between the flattened kernels (O, C·k²) and that matrix. The rearrangement loops over the k² kernel offsets — nine iterations for a 3 × 3 — each a strided slice of the padded input, rather than over the H_out·W_out positions; on a batch of 8 at 28 × 28 that was 3.4 ms against 45.8 ms for position loops, matching torch to 10⁻⁵. The cost is memory, k² copies of the input. The backward becomes two matrix products, exactly as for a linear layer: the weight gradient is the column matrix paired with the output gradient, and the input gradient is the output gradient sent through the transposed kernel matrix and then scattered back into the image by col2im, which adds overlapping windows. I built a full network this way — conv, ReLU, max-pool with an argmax mask, global pooling, linear — gradient-checked it at 2 × 10⁻⁸, and trained it to 90 % on MNIST in three epochs. A library is still five times faster, because its kernels are fused and avoid the column copy; cuDNN also uses Winograd and FFT algorithms for kernel sizes where they win.",
        answer: [
          { t: "p", text: "im2col with the executed timing, the backward as two products plus col2im, the assembled network's check and accuracy, and the honest comparison with a library." }
        ]
      },
      {
        level: "Core",
        q: "Describe the anatomy of a convolutional classifier and where its parameters and compute live.",
        strong: "A stem — a first convolution, often 7 × 7 at stride 2 with a max-pool — reduces resolution early; then stages of conv–norm–activation blocks in which resolution halves and channels double at each boundary; then a global average pool and one linear layer. The arithmetic explains the design. FLOPs per convolution are 2·C_out·C_in·k²·H·W, so halving H and W while doubling C keeps the compute per stage roughly constant: in a three-conv network on 28 × 28, c2 and c3 both cost 1.8 MFLOPs. Parameters are C_out·C_in·k², independent of resolution, so they concentrate in the deep wide layers: 77 % of that network's 23,946 parameters were in c3. The flatten head was the exception that broke the pattern — 124 million of VGG-16's 138 million parameters — which is why GAP replaced it. Knowing where the parameters are tells you where to prune and quantise; knowing where the compute is tells you what a resolution change costs.",
        answer: [
          { t: "p", text: "The blueprint, the two formulas, the executed distribution, and what it is used for." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 4.4 — The Encoder Block
   Mirrors rnn-lstm-gru-transformer-guide.md · §5.6. Parameter split and
   activation stability through depth measured (scratchpad/dl/d41.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.4",

  lede: "**Four components, and the two everyone talks about are the smaller half.** An encoder block is multi-head attention, a position-wise feed-forward network, two residual connections and two LayerNorms — and measuring where the parameters actually sit gives a result most people guess wrong: **the feed-forward network is 67 % of the block.** Attention gets the attention; the FFN does most of the computing.",

  objectives: [
    "Name the four components of an encoder block and what each contributes",
    "Measure the parameter split between attention and the feed-forward network",
    "Explain why the FFN is position-wise and why it expands then contracts",
    "Distinguish post-norm from pre-norm and say which to use",
    "Show that activations stay stable through stacked blocks"
  ],

  prerequisites: ["4.3"],

  blocks: [

    { t: "h2", n: "01", text: "The block", id: "block" },

    { t: "diagram", kind: "flow", title: "One encoder block",
      caption: "Two sub-layers, each wrapped in a residual connection and a LayerNorm. Input and output shapes are identical, so blocks stack.",
      cols: 3,
      nodes: [
        { id: "x", label: "x", sub: "T × d_model", tone: "accent" },
        { id: "a", label: "Multi-head attention", sub: "mixes across positions", tone: "violet" },
        { id: "n1", label: "Add & Norm", sub: "x + attn(x), LayerNorm", tone: "teal" },
        { id: "f", label: "Feed-forward", sub: "transforms within a position", tone: "good" },
        { id: "n2", label: "Add & Norm", sub: "h + ffn(h), LayerNorm", tone: "teal" },
        { id: "o", label: "output", sub: "T × d_model", tone: "accent" }
      ],
      edges: [["x", "a"], ["a", "n1"], ["x", "n1", "residual"], ["n1", "f"], ["f", "n2"], ["n1", "n2", "residual"], ["n2", "o"]] },

    { t: "math", tex: "\\begin{aligned} h &= \\text{LayerNorm}(x + \\text{MultiHead}(x,x,x)) \\\\ y &= \\text{LayerNorm}(h + \\text{FFN}(h)) \\end{aligned}" },

    { t: "h2", n: "02", text: "Where the parameters are", id: "parameters" },

    { t: "out", text: `  self_attn  1,050,624  ( 33.3%)
  linear1    1,050,624  ( 33.3%)
  linear2    1,049,088  ( 33.3%)
  norm1          1,024  (  0.0%)
  norm2          1,024  (  0.0%)
  TOTAL      3,152,384` },

    { t: "callout", kind: "insight", title: "Two thirds of a transformer is the feed-forward network",
      body: [{ t: "p", text: "At the standard configuration — `d_model = 512`, `d_ff = 2048` — the FFN's two linear layers hold **67 %** of the block's parameters against attention's 33 %. Scaled up to a large language model, the same ratio means most of the weights in the model are in position-wise MLPs, not in attention. This is worth internalising for two reasons. It reframes what a transformer is: a stack of per-token MLPs with an attention mechanism routing information between them. And it explains where efficiency work goes — mixture-of-experts replaces the FFN, not the attention, because that is where the parameters are." }] },

    { t: "h2", n: "03", text: "The feed-forward network", id: "ffn" },

    { t: "math", tex: "\\text{FFN}(x) = \\max(0,\\, xW_1 + b_1)W_2 + b_2, \\qquad d_{ff} = 4 \\times d_{model}" },

    { t: "p", text: "Two linear layers with a non-linearity between them, expanding from `d_model` to `4 × d_model` and back. Two properties matter:" },

    { t: "dl", items: [
      ["Position-wise", "The same weights are applied independently to every position, with no mixing across the sequence. All cross-position communication happens in attention; the FFN only transforms."],
      ["Expand then contract", "The 4× inner width gives room for the non-linearity to separate features before projecting back. It is the inverted bottleneck from lesson 2.4 — ConvNeXt borrowed this shape from the transformer, not the other way round."]
    ] },

    { t: "callout", kind: "mental", title: "Attention routes, the FFN thinks",
      body: [{ t: "p", text: "Lesson 4.2 measured that attention's output is always a convex combination of its values — it can select and blend but never produce anything outside their hull. The FFN is the only part of the block that applies a non-linearity, so it is the only part that can move a representation somewhere new. Reading the block as *gather what is relevant, then process it* makes the division of labour clear, and it explains why interpretability work often finds factual knowledge stored in FFN weights rather than in attention." }] },

    { t: "h2", n: "04", text: "Residuals and LayerNorm", id: "norm" },

    { t: "out", text: `  after block 1: mean -0.0000, std 1.0000, max|x| 4.32
  after block 3: mean -0.0000, std 1.0000, max|x| 4.42
  after block 6: mean -0.0000, std 1.0000, max|x| 4.18` },

    { t: "p", text: "Mean 0 and standard deviation exactly 1 after every block, with the maximum magnitude barely moving across six blocks. **LayerNorm normalises each token independently**, across its `d_model` features, so it has no dependence on batch composition or sequence length — unlike batch norm, which is why transformers use it. The residual connections are the same idea as lesson 2.3's skip connections, giving the gradient a path with derivative 1 through a 96-layer stack." },

    { t: "callout", kind: "trap", title: "Post-norm is what the paper describes and not what you should build",
      body: [{ t: "p", text: "The original places LayerNorm *after* the residual addition — `LayerNorm(x + Sublayer(x))` — which means the residual path is itself normalised at every block, so it is not a clean identity path. Deep post-norm transformers need a learning-rate warmup to train at all, and without one they diverge in the first few hundred steps. **Pre-norm** — `x + Sublayer(LayerNorm(x))` — leaves the residual path untouched from input to output, trains stably without warmup, and is what GPT-2 onwards and essentially every modern model use. PyTorch's `TransformerEncoderLayer` defaults to post-norm for fidelity to the paper; pass `norm_first=True`." }] },

    { t: "code", lang: "python", title: "The block in PyTorch",
      code: `layer = nn.TransformerEncoderLayer(
    d_model=512, nhead=8, dim_feedforward=2048,
    dropout=0.1, batch_first=True,
    norm_first=True)            # pre-norm — do not leave this at the default

encoder = nn.TransformerEncoder(layer, num_layers=6)`,
      caption: "`nn.TransformerEncoder` deep-copies the layer, so the six blocks have independent weights — they are not shared." },

    { t: "exercise", kind: "practice", title: "Dissect and stress the block", difficulty: "advanced", minutes: 40,
      prompt: "Build an encoder block from `nn.MultiheadAttention` and two `nn.Linear` layers, and verify it matches `nn.TransformerEncoderLayer` given identical weights. Compute the parameter split between attention and FFN at `d_ff` = 2×, 4× and 8× `d_model`. Then stack 12 blocks and record activation mean, std and max through the stack for post-norm and pre-norm, with and without learning-rate warmup, and compare training stability. Finally, remove the residual connections and observe what happens.",
      hints: [
        "PyTorch defaults to post-norm; `norm_first=True` gives pre-norm.",
        "Track gradient norms at the first and last block, as in lesson 2.3.",
        "Without residuals a deep stack will not train at all — that is the expected result."
      ],
      solution: {
        notes: [
          { t: "p", text: "The post-norm versus pre-norm comparison is the practically valuable one. Post-norm without warmup typically diverges within a few hundred steps at any reasonable learning rate, because the residual path is normalised at every block so gradients reaching early layers are attenuated; pre-norm trains stably from step one. This is exactly why the original paper's schedule includes a warmup term that looks arbitrary until you know it is compensating for the normalisation placement." },
          { t: "p", text: "Removing the residuals breaks a deep stack completely, for the reason lesson 2.3 measured on ResNet: the gradient has no path with derivative 1 and decays through depth. Six blocks might limp along; twelve will not train. The residual is not an optimisation nicety here, it is what makes depth possible at all." },
          { t: "p", text: "On the `d_ff` sweep, the FFN's share rises from 50 % at 2× to 80 % at 8×, with 67 % at the standard 4×. Worth knowing when you are budgeting a model: widening the FFN is the cheapest way to add parameters, and widening `d_model` is the expensive way because attention scales with its square." }
        ]
      } }

  ],

  takeaways: [
    "An encoder block is multi-head attention and a position-wise FFN, each wrapped in a residual and a LayerNorm.",
    "Measured split at d_model=512, d_ff=2048: attention 33 %, FFN 67 %, norms effectively 0 %.",
    "The FFN is position-wise — all cross-position mixing happens in attention.",
    "It expands to 4× and contracts, the same inverted-bottleneck shape ConvNeXt borrowed.",
    "Attention can only interpolate; the FFN's non-linearity is what transforms.",
    "Activations stay at mean 0, std 1.0000 through six blocks — LayerNorm normalises each token independently.",
    "Use pre-norm (`norm_first=True`); post-norm is the paper's design and needs warmup to train."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Which part of an encoder block holds the most parameters?",
      options: ["Multi-head attention", "The feed-forward network, at about 67 %", "The LayerNorms", "They are evenly split"],
      answer: 1,
      why: "Measured at the standard d_model=512, d_ff=2048: attention 33 %, the two FFN linear layers 67 %, LayerNorms effectively zero. Most of a transformer's weights are position-wise MLPs, which is why mixture-of-experts replaces the FFN rather than the attention." },
    { stem: "What does 'position-wise' mean for the feed-forward network?",
      options: ["It encodes position information", "The same weights are applied independently at each position, with no cross-position mixing", "It processes positions sequentially", "It varies by position"],
      answer: 1,
      why: "The FFN sees one token's vector at a time and never looks across the sequence. All communication between positions happens in attention. The useful reading is that attention routes information and the FFN transforms it — and since attention output is confined to the convex hull of its values, the FFN is the only part that can produce something new." },
    { stem: "Why do modern transformers use pre-norm instead of the paper's post-norm?",
      options: ["It is faster", "Pre-norm leaves the residual path unnormalised, so deep stacks train stably without warmup", "It uses fewer parameters", "Post-norm does not support multi-head attention"],
      answer: 1,
      why: "Post-norm applies LayerNorm after the residual addition, so the identity path is normalised at every block and gradients reaching early layers are attenuated — deep post-norm models diverge without a learning-rate warmup. Pre-norm keeps a clean identity path from input to output. PyTorch defaults to post-norm; pass `norm_first=True`." },
    { stem: "Why LayerNorm rather than BatchNorm in a transformer?",
      options: ["It is more accurate", "It normalises each token across its features, so it does not depend on batch composition or sequence length", "It has fewer parameters", "BatchNorm cannot handle attention"],
      answer: 1,
      why: "LayerNorm operates within a single token's feature vector, giving identical behaviour at any batch size and any sequence length, and requiring no running statistics. BatchNorm normalises across the batch, which is ill-defined when sequences have different lengths and unstable at small batch sizes." }
  ] },

  interview: { title: "Interview", sub: "Encoder internals", questions: [
    { level: "Core", q: "Walk me through a transformer encoder block.",
      strong: "Multi-head attention, then a position-wise FFN, each with a residual and a LayerNorm.",
      answer: [{ t: "p", text: "Two sub-layers. First multi-head self-attention, which mixes information across positions. Then a position-wise feed-forward network — two linear layers with a non-linearity, expanding to four times `d_model` and back — applied independently at every position. Each sub-layer is wrapped in a residual connection and a LayerNorm, and because input and output shapes are identical the blocks stack. The division of labour is the thing to understand: attention is the only part that moves information between positions, and the FFN is the only part that applies a non-linearity, so attention routes and the FFN transforms. That matters because attention output is always a convex combination of its values and so cannot produce anything outside their span. One detail I would flag: most of the parameters are in the FFN, about two thirds at standard settings, not in attention." }] },
    { level: "Senior", q: "What is the difference between pre-norm and post-norm, and which would you use?",
      strong: "Pre-norm keeps the residual path clean and trains without warmup; use it.",
      answer: [{ t: "p", text: "Post-norm, which is what the original paper specifies, computes `LayerNorm(x + Sublayer(x))` — so the residual path itself gets normalised at every block and is not a clean identity from input to output. That attenuates gradients reaching early layers, and deep post-norm transformers diverge in the first few hundred steps unless you use a learning-rate warmup, which is exactly why the paper's schedule has one. Pre-norm computes `x + Sublayer(LayerNorm(x))`, leaving an unbroken identity path all the way through the stack, which is the same argument as ResNet's skip connection. It trains stably without warmup and is what GPT-2 onwards and essentially every modern model use. Worth knowing that PyTorch's `TransformerEncoderLayer` defaults to post-norm for fidelity to the paper, so you have to pass `norm_first=True` — and people who do not are often puzzled by training instability that has a one-argument fix." }] },
    { level: "Senior", q: "If you needed to add capacity to a transformer, where would you add it?",
      strong: "Widen the FFN or add layers before widening `d_model`, since attention scales with its square.",
      answer: [{ t: "p", text: "It depends what is binding, but the cost structures differ a lot. Widening `d_ff` is the cheapest way to add parameters — it is already two thirds of each block, it scales linearly, and it does not touch the attention cost at all. Widening `d_model` is the expensive option because the attention projections scale with its square and the FFN scales with it too, so everything grows. Adding layers scales everything linearly and also adds sequential depth, which costs latency. If I had a lot of parameters to add and inference cost mattered, mixture-of-experts on the FFN is the option worth considering, precisely because the FFN is where the parameters already are — you can multiply total parameters several-fold while only activating a couple of experts per token. What I would not do first is add heads, since that does not change the parameter count at all; it reallocates `d_model` into more, narrower subspaces, which is a different kind of decision." }] }
  ] }
});

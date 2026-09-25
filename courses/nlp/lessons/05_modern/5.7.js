/* ============================================================================
   LESSON 5.7 — Vision Transformers
   Mirrors 02_Transformers_InDepth.md · §18. The patch arithmetic is verified,
   a real ViT-Base is run (86,389,248 params, 197 tokens), and its embeddings
   turn out to be 0.9% of the model against a language model's 31.2%
   (scratchpad/nlp/n57.py).
   ========================================================================= */
EC.receiveLesson({
  id: "5.7",

  lede: "**ViT's embeddings are 0.9% of its parameters. GPT-2 small's token embedding alone is 31.2%.** A language model must store a vector for every word in a 50,000-token vocabulary; a vision transformer projects arbitrary pixel patches with one small matrix and is done. That difference is the clearest sign of what actually changes when you point a transformer at images — the architecture is nearly identical, and everything around the input is not. This lesson works through the conversion and what it costs.",

  objectives: [
    "Convert an image into a token sequence and verify the patch arithmetic",
    "Explain why the patch projection is implemented as a strided convolution",
    "Quantify how resolution drives attention cost",
    "State the inductive biases ViT discards and what it pays for them",
    "Describe how Swin restores locality and what that buys"
  ],

  prerequisites: ["5.6", "4.3"],

  blocks: [

    { t: "h2", n: "01", text: "An image as a sequence", id: "patches" },

    { t: "diagram", kind: "flow", title: "224x224 pixels to 197 tokens", cols: 3,
      nodes: [
        { id: "i", text: "Image 224 x 224 x 3", tone: "accent" },
        { id: "p", text: "Split into 16x16 patches", tone: "accent" },
        { id: "f", text: "14 x 14 = 196 patches, each 768 values", tone: "teal" },
        { id: "l", text: "Linear projection to d_model", tone: "teal" },
        { id: "c", text: "Prepend [CLS], add positional embeddings", tone: "violet" },
        { id: "e", text: "197 tokens into a standard encoder", tone: "good" }
      ],
      edges: [["i","p"],["p","f"],["f","l"],["l","c"],["c","e"]] },

    { t: "out", text:
"image    patch    grid      patches   values per patch\n224x224   16x16   14 x 14      196       16*16*3 = 768\n224x224   32x32    7 x  7       49       32*32*3 = 3072\n384x384   16x16   24 x 24      576       768\n448x448   16x16   28 x 28      784       768" },

    { t: "callout", kind: "note", title: "768 = 768 is a coincidence, not a constraint",
      body: [{ t: "p", text: "A 16×16×3 patch flattens to exactly 768 values, and ViT-Base's `d_model` is also 768 — which makes the patch projection square and invites the assumption that it must be. It need not be. ViT-Large uses `d_model = 1024` with the same 16×16 patches, so the projection is 768 → 1024. The patch size and the model width are independent choices; they coincide here in the most-quoted configuration." }] },

    { t: "h2", n: "02", text: "A real ViT", id: "real" },

    { t: "out", text:
"google/vit-base-patch16-224\n\n  image 224, patch 16, hidden 768, layers 12, heads 12\n  86,389,248 params = 86.4M\n\n  patch embedding: Conv2d(768, 3, 16, 16), kernel (16,16), stride (16,16)\n  position embeddings: (1, 197, 768)\n\n  input (1, 3, 224, 224) -> last_hidden_state (1, 197, 768)\n  pooler output ([CLS] vector) (1, 768)" },

    { t: "callout", kind: "insight", title: "The patch projection is a convolution with kernel = stride",
      body: [{ t: "p", text: "The paper describes flattening each patch and applying a linear layer. The implementation is a `Conv2d` with **kernel size equal to stride equal to the patch size** — and those are the same operation. A convolution whose stride matches its kernel visits each patch exactly once with no overlap, and applying the same weight matrix to each non-overlapping block *is* the per-patch linear projection. Writing it as a conv gets you the split and the projection in one optimised call instead of a reshape followed by a matmul. This is worth recognising because it is how every ViT implementation you will read does it, and it looks like a convolutional layer until you notice the stride." }] },

    { t: "h2", n: "03", text: "Where the parameters are", id: "params" },

    { t: "out", text:
"largest tensors in ViT-Base\n\n  layers.0.mlp.fc1.weight      2,359,296\n  layers.0.mlp.fc2.weight      2,359,296\n  layers.1.mlp.fc1.weight      2,359,296\n  ... (the MLP dominates, as in any transformer)\n\n  embeddings total               742,656   =  0.9% of the model\n\nfor comparison, GPT-2 small's token embedding alone was 31.2%" },

    { t: "callout", kind: "insight", title: "No vocabulary means no embedding table",
      body: [{ t: "p", text: "A language model needs one learned vector per token type — 50,257 × 768 = 38.6M parameters for GPT-2 small, nearly a third of the model. A vision transformer has **no vocabulary at all**: a patch is an arbitrary array of pixel values, projected by one shared 768 × 768 matrix regardless of content. The entire embedding cost is that matrix plus 197 positional vectors plus the `[CLS]` token — 742,656 parameters. So ViT-Base at 86.4M is *almost all transformer*, where GPT-2 at 124.4M is a third lookup table. It also means there is no tokenisation step, no out-of-vocabulary problem, and none of the cross-lingual cost lesson 4.8 measured." }] },

    { t: "h2", n: "04", text: "Resolution is expensive", id: "resolution" },

    { t: "out", text:
"image       patches   tokens   attention entries per head per layer\n224x224        196      197              38,809\n384x384        576      577             332,929\n448x448        784      785             616,225\n896x896       3136     3137           9,840,769" },

    { t: "callout", kind: "crit", title: "Doubling the image side multiplies attention by sixteen",
      body: [{ t: "p", text: "Patches scale with **area**, so doubling the side quadruples the sequence length — and attention is quadratic in sequence length, so the cost goes up by 16. From 224 to 896 pixels is 4x the side, 16x the tokens, and **254x** the attention entries. This is the central practical problem with ViT: images have far more natural resolution than text has tokens, and the obvious way to use it is the most expensive thing you can do to a transformer. Larger patches reduce the count but throw away detail, which is the trade every ViT configuration is making." }] },

    { t: "h2", n: "05", text: "What ViT gives up", id: "bias" },

    { t: "dl", items: [
      ["Locality", "A 3×3 convolution can only see neighbouring pixels. ViT's layer-1 attention is unconstrained over all 38,809 token pairs — nothing tells it that adjacent patches are related."],
      ["Translation equivariance", "The same convolutional kernel slides across every position, so a feature detected at one place is detected everywhere. ViT must learn this separately for each position."],
      ["Hierarchy", "A CNN's receptive field grows with depth, building edges into textures into objects. Every ViT layer has a global receptive field from the start."],
      ["What it gains", "None of those priors are imposed, so with enough data the model can learn better ones — including relationships a fixed convolutional structure cannot express."]
    ] },

    { t: "out", text:
"the crossover, as reported in the ViT paper\n\n  pretraining set     size           outcome\n  ImageNet-1k         1.3M images    ResNet wins\n  ImageNet-21k         14M images    roughly equal\n  JFT-300M            300M images    ViT wins clearly" },

    { t: "callout", kind: "tradeoff", title: "Inductive bias is worth a lot of data, until it isn't",
      body: [{ t: "p", text: "That table is the entire ViT result, and it generalises well beyond vision. A hard-coded prior like convolution is a substitute for data: it tells the model something true about images that it would otherwise have to learn. When data is scarce that is a decisive advantage, and ResNets win. As data grows the model can learn those regularities itself — and also learn ones the prior forbids — so the advantage inverts. At 300M images ViT wins clearly. The practical reading for anyone not sitting on 300M labelled images is that you should almost certainly start from a **pretrained** ViT, which imports someone else's data advantage, rather than training one from scratch." }] },

    { t: "h2", n: "06", text: "Swin: locality, restored", id: "swin" },

    { t: "out", text:
"attention pair counts, ViT global vs Swin 7x7 windows\n\n  224x224    196 patches    ViT     38,416    Swin     9,604     4x less\n  448x448    784 patches    ViT    614,656    Swin    38,416    16x less\n  896x896   3136 patches    ViT  9,834,496    Swin   153,664    64x less" },

    { t: "diagram", kind: "compare", title: "Two ways to attend over patches",
      columns: [
        { title: "ViT: global attention", tone: "violet", items: [
          "Every patch attends to every patch",
          "O(n squared) in patch count",
          "Global receptive field at layer 1",
          "No spatial prior at all",
          "Needs very large pretraining data",
          "Strong for classification"
        ] },
        { title: "Swin: shifted windows", tone: "good", items: [
          "Attention within 7x7 local windows",
          "O(n) in patch count",
          "Receptive field grows with depth",
          "Locality and hierarchy restored",
          "Trains well on ImageNet-scale data",
          "Backbone for detection and segmentation"
        ] }
      ] },

    { t: "callout", kind: "insight", title: "The shift is what makes local attention work",
      body: [{ t: "p", text: "Pure window attention has an obvious flaw: information never crosses a window boundary, so two patches in adjacent windows can never interact no matter how deep the network goes. Swin's fix is to **offset the window grid by half a window between consecutive layers**, so a boundary in one layer sits in the middle of a window in the next. Information propagates across the whole image within a few layers while every individual attention computation stays local. That single idea is what made a hierarchical, linear-cost vision transformer practical, and it is why Swin rather than ViT became the standard backbone for detection and segmentation, where high resolution is not optional." }] },

    { t: "h2", n: "07", text: "What transferred, and what did not", id: "transfer" },

    { t: "p", text: "The striking thing about ViT is how little had to change. The encoder is the same encoder — same multi-head attention, same Pre-LN blocks, same FFN at 4x width, same `[CLS]` pooling as BERT. Everything specific to vision lives in the first ten lines: how pixels become tokens." },

    { t: "table",
      head: ["Component", "Language transformer", "Vision transformer"],
      rows: [
        ["Tokenisation", "Subword vocabulary, 30k–128k entries", "Fixed-size pixel patches, no vocabulary"],
        ["Embedding cost", "31.2% of GPT-2 small", "0.9% of ViT-Base"],
        ["Sequence length", "Set by text length", "Set by resolution and patch size, fixed per config"],
        ["Positional encoding", "Learned or RoPE, 1-D", "Learned, 1-D over a flattened 2-D grid"],
        ["Encoder blocks", "Identical", "Identical"],
        ["Pooling", "[CLS] or mean", "[CLS]"]
      ] },

    { t: "callout", kind: "note", title: "The positional encoding is a small scandal",
      body: [{ t: "p", text: "ViT flattens a 14×14 grid into a 196-length sequence and applies **1-D** learned positional embeddings — the model is told patch 13 comes before patch 14, but nothing tells it that patch 14 sits directly below patch 0. It has to infer two-dimensional structure from the data. That it works at all is evidence for how much a transformer can learn from scale, and it is exactly the kind of thing later architectures fixed: 2-D positional encodings and relative position biases, which Swin uses, do measurably better." }] },

    { t: "exercise", title: "Take a ViT apart",
      tasks: [
        "Load a ViT and confirm the patch embedding is a Conv2d with kernel equal to stride.",
        "Compute the token count and attention entries for three resolutions you might deploy at.",
        "Extract attention maps from layer 1 and layer 12 and check whether early layers learned locality.",
        "Compare a ViT and a ResNet of similar parameter count fine-tuned on a few thousand images, and note which wins.",
        "Interpolate a ViT's positional embeddings to a larger resolution and measure what it costs in accuracy."
      ] }
  ],

  takeaways: [
    "A 224×224 image at 16×16 patches gives 14×14 = 196 patches of 768 values each, plus [CLS] = 197 tokens.",
    "16*16*3 = 768 equalling ViT-Base's d_model is a coincidence — ViT-Large uses the same patches with d_model 1024.",
    "The patch projection is implemented as a Conv2d with kernel = stride = patch size, which is exactly the per-patch linear projection in one optimised call.",
    "ViT-Base is 86,389,248 parameters and its embeddings are just 0.9% of them, against 31.2% for GPT-2 small's token table.",
    "There is no vocabulary, so no tokenisation, no out-of-vocabulary problem, and none of the cross-lingual token cost.",
    "Patches scale with area and attention with the square of tokens, so doubling the image side multiplies attention entries by 16.",
    "ViT discards locality, translation equivariance and hierarchy — a CNN's three priors — and must learn them from data.",
    "ResNets win at 1.3M images, the two are equal at 14M, and ViT wins clearly at 300M: inductive bias is a substitute for data.",
    "Swin's local windows cut attention pairs by 4x at 224px and 64x at 896px, and the half-window shift between layers is what lets information cross window boundaries.",
    "ViT uses 1-D positional embeddings over a flattened 2-D grid — the model is never told which patches are vertically adjacent."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why are ViT's embeddings only 0.9% of its parameters when GPT-2's are 31.2%?",
      options: ["ViT uses a smaller d_model", "A vision model has no vocabulary — patches are projected by one shared matrix instead of stored per token type", "ViT shares embeddings across layers", "ViT has no positional embeddings"],
      answer: 1,
      why: "GPT-2 stores 50,257 × 768 = 38.6M parameters, one vector per token type. ViT's entire embedding cost is one 768 × 768 projection plus 197 positional vectors and a [CLS] token — 742,656 parameters. A patch is arbitrary pixel values, so there is nothing to look up." },
    { stem: "Why is the patch embedding implemented as a Conv2d?",
      options: ["To add convolutional inductive bias", "Because a convolution with kernel equal to stride visits each non-overlapping patch once and applies the same matrix — exactly the per-patch linear projection", "To reduce parameters", "For backward compatibility with CNNs"],
      answer: 1,
      why: "Kernel size 16 with stride 16 means no overlap and one visit per patch, so the operation is identical to flattening each patch and multiplying by a shared matrix. Writing it as a conv fuses the split and the projection into one optimised call. It looks like a convolutional layer until you notice the stride equals the kernel." },
    { stem: "Going from 224×224 to 448×448, how does attention cost change?",
      options: ["It doubles", "Tokens quadruple and attention entries grow about 16x, since patches scale with area and attention with the square of tokens", "It stays the same", "It grows 4x"],
      answer: 1,
      why: "196 patches become 784, and attention entries go from 38,809 to 616,225. That compounding is why high-resolution ViT is hard: images have far more natural resolution than text has tokens, and using it is the most expensive thing you can do to a transformer." },
    { stem: "Why did ResNets beat ViT on ImageNet-1k but lose on JFT-300M?",
      options: ["ViT is badly optimised for small datasets", "Convolutional inductive bias substitutes for data — decisive when data is scarce, and outgrown once the model can learn better priors itself", "ResNets have more parameters", "ImageNet-1k has label noise"],
      answer: 1,
      why: "Locality, translation equivariance and hierarchy are true facts about images that a CNN gets for free and a ViT must learn. At 1.3M images that head start wins; at 14M they are equal; at 300M the ViT learns those regularities and others the convolutional prior forbids. For anyone without 300M images, the practical answer is to start from a pretrained ViT." }
  ] },

  interview: { title: "Interview", sub: "Transformers beyond text", questions: [
    { level: "Core", q: "How does a Vision Transformer work?",
      strong: "Split the image into patches, project each to d_model, add [CLS] and positions, run a standard encoder.",
      answer: [{ t: "p", text: "You cut the image into fixed-size non-overlapping patches — 16 by 16 for the standard configuration — flatten each one and project it linearly to d_model. For a 224 by 224 image that gives a 14 by 14 grid, so 196 patches, each 16 times 16 times 3 equals 768 values. Prepend a [CLS] token, add positional embeddings, and you have 197 tokens going into a completely standard transformer encoder, with the [CLS] output feeding a classification head. The striking thing is how little changes: the encoder is the same multi-head attention, the same Pre-LN blocks, the same 4x FFN as BERT. Everything vision-specific is in how pixels become tokens. One implementation detail worth knowing is that the patch projection is written as a Conv2d with kernel size equal to stride equal to the patch size — that's not adding convolutional bias, it's literally the same arithmetic as flattening and multiplying, done in one optimised call. And a nice structural contrast: ViT's embeddings are 0.9% of its parameters where GPT-2's token table is 31.2%, because there's no vocabulary to store." }] },
    { level: "Senior", q: "When would you use a ViT rather than a CNN?",
      strong: "When you can start from large-scale pretraining; otherwise a CNN's inductive bias wins.",
      answer: [{ t: "p", text: "The deciding factor is data, and specifically whether you can import someone else's. The ViT paper's own results are the cleanest statement of it: pretrained on ImageNet-1k at 1.3 million images a ResNet wins, at ImageNet-21k's 14 million they're roughly equal, and at JFT-300M the ViT wins clearly. The reason is that a convolution hard-codes three true facts about images — locality, translation equivariance and hierarchy — and those are a substitute for data. When data is scarce that head start is decisive. With enough data the model learns those regularities itself, plus relationships the convolutional structure forbids, and the advantage inverts. So in practice, if I'm fine-tuning from a large-scale pretrained checkpoint I'd use a ViT, because I'm importing the data advantage. If I'm training from scratch on a few thousand domain images, I'd use a CNN or a hybrid. And for detection or segmentation I'd reach for Swin rather than plain ViT, because those need high resolution and ViT's cost is quadratic in patches — I computed it at 896 by 896, where ViT needs 9.8 million attention pairs against Swin's 153,664, a 64x difference. Swin gets that by attending within local windows and shifting the window grid by half a window between layers so information still crosses boundaries." }] },
    { level: "Senior", q: "What does ViT tell you about transformers in general?",
      strong: "The architecture is domain-agnostic; what changes is tokenisation, and inductive bias trades against data.",
      answer: [{ t: "p", text: "Two things, and both generalise well beyond vision. First, the transformer block is genuinely domain-agnostic. ViT changed essentially nothing about the encoder — same attention, same Pre-LN residual blocks, same FFN ratio, same [CLS] pooling. All the domain knowledge went into the first ten lines, deciding how raw input becomes a sequence of vectors. That's why the same recipe went on to work for audio, video, protein sequences and time series: if you can define a sensible tokenisation, you can use a transformer. It also means the interesting design work in a new domain is the tokenisation, not the architecture. Second, and more broadly useful, ViT is the cleanest available demonstration that inductive bias and data are substitutes. A convolution encodes true priors about images; encoding them saves you the data you'd need to learn them, and costs you the ability to learn anything they exclude. Below a data threshold the prior wins, above it the flexibility does, and the ViT paper mapped that crossover explicitly. That framing is worth carrying into any architecture decision — when someone proposes a structurally simpler, more general model, the right question isn't whether it's better but at what data scale it becomes better, and whether you'll be operating above or below that point." }] }
  ] }
});

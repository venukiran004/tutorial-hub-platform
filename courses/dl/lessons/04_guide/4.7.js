/* ============================================================================
   LESSON 4.7 — Comparing the Four Architectures
   Mirrors rnn-lstm-gru-transformer-guide.md · §7. Parameter counts measured
   against the reference's formulas (scratchpad/dl/d41.py, d313.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.7",

  lede: "**Four architectures, one decision.** ANN, RNN, LSTM/GRU and transformer each assume something different about their input, and the assumption is the whole story — a dense network assumes features are unordered, a convolution assumes neighbours relate, a recurrence assumes the past matters, and attention assumes nothing at all and makes you pay for it in data. This lesson puts the costs side by side and turns them into a decision procedure.",

  objectives: [
    "Match each architecture to the structural assumption it encodes",
    "Compare parameter counts and verify against the reference's formulas",
    "Relate inductive bias to how much data an architecture needs",
    "Choose an architecture from the shape of the problem"
  ],

  prerequisites: ["4.6"],

  blocks: [

    { t: "h2", n: "01", text: "What each one assumes", id: "assumptions" },

    { t: "dl", items: [
      ["ANN (dense)", "Inputs are a fixed-size unordered feature vector. Shuffle the columns consistently and nothing changes. Tabular data."],
      ["CNN", "Nearby inputs relate, and a pattern is worth detecting wherever it occurs. Images, spectrograms, local time series."],
      ["RNN / LSTM / GRU", "Order matters and the past should be summarised into a running state. Streaming, and sequences with local dependencies."],
      ["Transformer", "Any position may relate to any other, and the model should learn which. Almost no structural assumption — hence data-hungry."]
    ] },

    { t: "callout", kind: "mental", title: "Inductive bias is a data budget",
      body: [{ t: "p", text: "A strong assumption baked into the architecture is knowledge the model does not have to learn from examples. A CNN is given translation equivariance for free, so it can learn from thousands of images rather than millions. A transformer assumes nothing about structure, so it must *discover* that adjacent words relate and that order matters — which it can do, given enough data, and often better than the assumption you would have imposed. That is the whole trade: **weaker assumptions need more data and reward it with a higher ceiling.** It is why ViT loses to a ResNet on small datasets and wins on very large ones, and why nobody trains a transformer from scratch on 2,000 examples." }] },

    { t: "h2", n: "02", text: "Parameter cost", id: "parameters" },

    { t: "out", text: `  RNN :    98,816
  GRU :   296,448
  LSTM:   395,264
  Transformer encoder layer (d=256, ff=1024):   789,760
  reference formula LSTM 4h(h+d) = 393,216` },

    { t: "p", text: "At `input=128, hidden=256` the ratios are the ones module 3 established: GRU is exactly 3× an RNN, LSTM exactly 4×. The reference's `4h(h+d) = 393,216` differs from PyTorch's 395,264 by 2,048, which is the two redundant bias vectors PyTorch keeps for CuDNN compatibility. **A single transformer layer costs about twice an LSTM** — and models use six or more of them, so the comparison is not really per-layer." },

    { t: "table", head: ["Aspect", "RNN / LSTM / GRU", "Transformer"],
      rows: [
        ["Computation", "Sequential — O(n) steps", "Parallel — O(1) depth"],
        ["Long-range path", "O(n) hops, decaying", "O(1), direct"],
        ["Memory", "O(1) state", "O(n²) attention matrix"],
        ["Training speed", "Capped by sequence length", "Bounded by hardware"],
        ["Inference (generation)", "O(1) state per step", "KV cache grows with context"],
        ["Position", "Implicit in the recurrence", "Must be injected"],
        ["Inductive bias", "Sequential, local", "None — data-hungry"],
        ["Pretrained models", "Few", "Effectively all of them"]
      ] },

    { t: "h2", n: "03", text: "Choosing", id: "choosing" },

    { t: "diagram", kind: "tree", title: "A decision procedure",
      caption: "Most paths end at 'use something pretrained'. Training a sequence model from scratch is now the exception.",
      root: { label: "What is the input?", children: [
        { label: "Tabular", children: [
          { label: "Gradient boosting first, ANN second", tone: "good" }
        ] },
        { label: "Images", children: [
          { label: "Pretrained CNN; ViT if data is vast", tone: "good" }
        ] },
        { label: "Text", children: [
          { label: "Pretrained transformer, always", tone: "good" }
        ] },
        { label: "Streaming / very long", children: [
          { label: "LSTM or GRU — O(1) state", tone: "accent" }
        ] }
      ] } },

    { t: "callout", kind: "trap", title: "For tabular data, try gradient boosting before a neural network",
      body: [{ t: "p", text: "It is easy to reach for a dense network on tabular data because this is a deep learning course. On most tabular problems, gradient-boosted trees — XGBoost, LightGBM, CatBoost — match or beat neural networks while training in seconds, handling missing values and mixed types natively, and requiring almost no tuning. Neural networks become competitive when there are high-cardinality categorical features that benefit from learned embeddings, when you need to fuse tabular data with text or images in one model, or at very large scale. Lesson 4.8 builds the ANN because you should know how; it is not usually the right first choice." }] },

    { t: "table", head: ["Use recurrence when", "Use a transformer when"],
      rows: [
        ["Streaming — one token at a time, bounded state", "Any NLP task, essentially always"],
        ["Sequences long enough that O(n²) is prohibitive", "Pretrained weights exist — which for text they do"],
        ["Edge devices with a hard memory budget", "Parallel hardware is available"],
        ["Simple time series with short dependencies", "Long-range dependencies matter"],
        ["No pretrained model covers your domain", "Vision with a large dataset (ViT)"]
      ] },

    { t: "h2", n: "04", text: "The honest summary", id: "summary" },

    { t: "callout", kind: "insight", title: "The architecture choice matters less than it used to",
      body: [{ t: "p", text: "For most applied problems in 2026 the decision is not *which architecture* but *which pretrained model, and how do I adapt it*. Lesson 2.5 measured this for vision: a frozen ImageNet backbone reached 67.1 % where the same architecture from scratch reached 34.3 %, and the architecture was identical in both cases. The same holds more strongly for text. Understanding these four architectures is still worth the effort — it is what lets you read a paper, debug a model that is not learning, and recognise when your problem genuinely falls outside the pretrained mainstream. But treating the choice as the main lever is a good way to spend three weeks matching a baseline you could have had on day one." }] },

    { t: "exercise", kind: "practice", title: "Compare all four on one problem", difficulty: "intermediate", minutes: 45,
      prompt: "Take one sequence classification task and implement four models with matched parameter budgets: a dense network on pooled embeddings, a CNN with 1-D convolutions, an LSTM, and a small transformer encoder. Train each on 500, 5,000 and 50,000 examples and plot accuracy against dataset size for all four. Then add a fifth: a pretrained transformer, fine-tuned. Record training time as well as accuracy.",
      hints: [
        "Match parameter counts, not layer counts, or you are comparing capacity.",
        "The curves' relative order should change as data grows — that is the point.",
        "Include the pretrained model's accuracy at 500 examples specifically."
      ],
      solution: {
        notes: [
          { t: "p", text: "The expected pattern is that the from-scratch transformer is worst at 500 examples and best at 50,000, because it has the least built-in structure and the most to learn. The LSTM and CNN, which encode sequential and local assumptions respectively, do better when data is scarce. Seeing the curves cross is the clearest demonstration of inductive bias as a data budget that I know of — it turns an abstract idea into a picture." },
          { t: "p", text: "The pretrained model is the result that reframes everything. It will likely beat all four from-scratch models at 500 examples by a wide margin, and possibly at 50,000 too, while taking less time to fine-tune than any of them took to train. Lesson 2.5 measured the vision equivalent at +32.8 points. Running this once is worth more than any amount of being told that transfer learning dominates architecture choice." },
          { t: "p", text: "Record wall-clock alongside accuracy, because it changes the practical conclusion. The transformer trains faster per epoch than the LSTM at any real sequence length due to parallelism, so even where their accuracies are comparable the iteration speed differs — and iteration speed is usually what determines how good your final model is, since it sets how many ideas you can try." }
        ]
      } }

  ],

  takeaways: [
    "Each architecture encodes an assumption: unordered features, local structure, sequential state, or nothing at all.",
    "Inductive bias is a data budget — weaker assumptions need more data and reward it with a higher ceiling.",
    "Measured at input=128, hidden=256: RNN 98,816, GRU 296,448, LSTM 395,264, one transformer layer 789,760.",
    "The reference's `4h(h+d)` formula is 2,048 short of PyTorch's count — the two redundant bias vectors.",
    "Recurrence for streaming, bounded memory and very long sequences; transformers for essentially everything else.",
    "Try gradient-boosted trees before a neural network on tabular data.",
    "The choice that matters most is usually which pretrained model, not which architecture."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why are transformers described as data-hungry?",
      options: ["They have more parameters", "They encode almost no structural assumption, so relationships must be learned from data", "They train slowly", "They need large batches"],
      answer: 1,
      why: "A CNN is given translation equivariance for free; a transformer must discover from examples that adjacent tokens relate and that order matters. Weaker assumptions mean more to learn, which needs more data — and rewards it with a higher ceiling, which is why ViT loses to a ResNet on small datasets and wins on very large ones." },
    { stem: "How many parameters does an LSTM have relative to a vanilla RNN at the same sizes?",
      options: ["The same", "3×", "Exactly 4×", "8×"],
      answer: 2,
      why: "Four gates each need their own input and recurrent matrices: measured 395,264 against 98,816 at input=128, hidden=256. GRU sits at exactly 3× with its three gates. A single transformer layer at comparable width costs about twice the LSTM." },
    { stem: "For a tabular classification problem with 10,000 rows, what would you try first?",
      options: ["A deep neural network", "Gradient-boosted trees", "An LSTM", "A transformer"],
      answer: 1,
      why: "On most tabular problems XGBoost or LightGBM match or beat neural networks, train in seconds, handle missing values and mixed types natively, and need little tuning. Neural networks become competitive with high-cardinality categoricals that benefit from embeddings, or when fusing tabular data with text or images." },
    { stem: "When is a recurrent model still clearly the right choice?",
      options: ["For all NLP tasks", "Streaming inference with bounded memory, and sequences long enough that O(n²) attention is prohibitive", "When the dataset is large", "When pretrained models are available"],
      answer: 1,
      why: "An LSTM carries a fixed-size state however long the stream runs, while a transformer's attention is quadratic and its KV cache grows with context — 369 MB per sequence at 10,000 tokens for a modest model. For real-time processing under a memory budget, recurrence still wins." }
  ] },

  interview: { title: "Interview", sub: "Architecture selection", questions: [
    { level: "Core", q: "How would you choose between these architectures for a new problem?",
      strong: "By the structure of the input and the amount of data — and first by asking what pretrained model exists.",
      answer: [{ t: "p", text: "I would start by asking what pretrained model covers the problem, because for text the answer is always a transformer and fine-tuning it will beat anything I train from scratch. Failing that, I would match the architecture to the input's structure: dense networks for unordered tabular features, though I would try gradient-boosted trees first and usually keep them; convolutions where locality and translation invariance hold, which is images and spectrograms; recurrence where I need streaming or bounded memory; and transformers where any position may relate to any other and I have the data to learn those relations. The data volume is the second axis, because architectures with weaker assumptions need more examples — a transformer from scratch on a few thousand rows will lose to an LSTM, and win comfortably at a few million." }] },
    { level: "Senior", q: "Explain inductive bias and why it matters practically.",
      strong: "Built-in assumptions are knowledge the model needn't learn — they trade ceiling for data efficiency.",
      answer: [{ t: "p", text: "Inductive bias is what an architecture assumes before seeing any data. A convolution assumes that nearby inputs relate and that a pattern is worth detecting wherever it appears, so translation equivariance is free rather than learned. A recurrence assumes order matters and history should be summarised into a running state. Self-attention assumes essentially nothing. Practically this is a data budget: a strong assumption is knowledge you do not have to pay examples for, so a CNN learns from thousands of images where a vision transformer needs millions. The flip side is that a correct-but-restrictive assumption caps you — attention can learn relationships a convolution structurally cannot express, which is why transformers overtake CNNs at scale. So the practical question is always whether I have enough data to let the model discover the structure, or whether I should hand it the structure for free. And if there is a pretrained model, that changes the calculation entirely, since someone else already paid the data cost." }] },
    { level: "Senior", q: "Your team wants to build a custom architecture for a new problem. How would you respond?",
      strong: "Establish a pretrained baseline first; custom architecture is rarely where the returns are.",
      answer: [{ t: "p", text: "I would want a pretrained baseline established before any architecture work starts, because it sets the bar and very often clears it. I have measured the vision version of this: a frozen ImageNet ResNet-18 with a new head reached 67.1 % on a small dataset where the same architecture trained from scratch reached 34.3 % — identical architecture, thirty-three points of difference from the weights alone. That is a larger effect than almost any architectural change would produce. After that baseline I would look at the data, the augmentation and the fine-tuning strategy, which is where returns usually are. I would support a custom architecture when there is a concrete structural reason the standard ones fail — an unusual input modality, a hard latency or memory constraint, a symmetry worth building in — and I would want that stated as a specific hypothesis with a measurement attached, not as a general feeling that our problem is special. The failure mode I have seen is spending three weeks building something bespoke that ends up matching the baseline." }] }
  ] }
});

/* ============================================================================
   LESSON 4.2 — Self-Attention: Query, Key, Value
   Mirrors rnn-lstm-gru-transformer-guide.md · §5.3. The reference's worked
   softmax is checked (it is rounded) and the convex-hull property of
   attention output is measured (scratchpad/dl/d41.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "**Self-attention asks one question of every token: which other tokens should I be looking at?** In *\"the animal didn't cross the street because it was too tired\"*, resolving *it* means finding *animal* — eight positions back, with no syntactic signal linking them. Self-attention answers by projecting each token three ways and letting every position score every other. This lesson builds it, checks it against PyTorch, and finds a property of the output that explains why the rest of the block exists.",

  objectives: [
    "Explain what the query, key and value projections each represent",
    "Compute scaled dot-product attention by hand",
    "Show that attention output is a convex combination of the values",
    "Explain why self-attention needs the feed-forward network that follows it"
  ],

  prerequisites: ["4.1", "3.8"],

  blocks: [

    { t: "h2", n: "01", text: "Three projections", id: "qkv" },

    { t: "dl", items: [
      ["Query — `Q = X W_Q`", "What this token is looking for. *it* queries for a singular noun it could refer to."],
      ["Key — `K = X W_K`", "What this token offers for matching. *animal* advertises itself as a singular animate noun."],
      ["Value — `V = X W_V`", "What this token contributes once selected. Separate from the key, so a token can be easy to find and carry something different."]
    ] },

    { t: "callout", kind: "mental", title: "Why key and value are separate",
      body: [{ t: "p", text: "It would be simpler to score against the token's own representation and return that same representation. Splitting them means *what makes a token findable* and *what it contributes when found* are learned independently — a token can be matched on grammatical features while contributing semantic content. This is the same separation a database index has from the row it points at, and it is what makes the query/key/value naming a real analogy rather than decoration." }] },

    { t: "math", tex: "\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left(\\frac{QK^{T}}{\\sqrt{d_k}}\\right)V" },

    { t: "h2", n: "02", text: "Running it", id: "worked" },

    { t: "code", lang: "python", title: "Self-attention in four lines",
      code: `Q, K, V = x @ Wq, x @ Wk, x @ Wv        # (T, d) each
scores = Q @ K.T / math.sqrt(d)          # (T, T) — every pair
A = scores.softmax(-1)                   # rows sum to 1
out = A @ V                              # (T, d) — contextualised`,
      caption: "`scores` is `T × T`: position i, j holds how much token i should attend to token j. This matrix is the O(n²) cost from lesson 4.1." },

    { t: "out", text: `  Q,K,V shapes: (3, 4) each
  'I   ' attends: I=0.351, love=0.320, AI=0.329
  'love' attends: I=0.375, love=0.323, AI=0.302
  'AI  ' attends: I=0.379, love=0.301, AI=0.320
  each row sums to 1: [1.0, 1.0, 1.0]
  output (3, 4) - same shape as input, but contextualised` },

    { t: "p", text: "With random projections the weights are near-uniform, which is the correct starting point — an untrained model has no reason to prefer any position. Training is what makes them selective. Note the output has the **same shape as the input**, which is what lets blocks stack." },

    { t: "callout", kind: "note", title: "The reference's worked softmax is rounded",
      body: [{ t: "p", text: "The guide takes scores `[1.2, 3.5, 2.8]` to weights `[0.05, 0.62, 0.33]`. The exact softmax is **`[0.0628, 0.6262, 0.3110]`** — the first and third are rounded somewhat loosely so the three display values sum to 1.00. The illustration's point stands entirely (a token attending mostly to itself, secondarily to a related token), but if you are checking your own implementation against those numbers you will see a discrepancy that is in the reference rather than your code." }] },

    { t: "h2", n: "03", text: "A property of the output", id: "convex" },

    { t: "out", text: `  V rows min/max per dim: [0.397, -0.370, 0.203, -0.603] / [1.601, -0.028, 0.629, -0.203]
  output min/max per dim: [0.807, -0.161, 0.338, -0.370] / [0.833, -0.154, 0.347, -0.361]
  every output inside the range of V: True` },

    { t: "callout", kind: "insight", title: "Attention can only interpolate, never extrapolate",
      body: [{ t: "p", text: "The attention weights are non-negative and sum to 1, so the output is a **convex combination** of the value vectors — it must lie within their hull, which the measurement confirms on every dimension. That means self-attention is a purely *selective* operation: it chooses and blends information that is already present, and it cannot produce anything outside the span of what it was given. This is exactly why an attention layer is never used alone. The feed-forward network that follows it applies a non-linearity per position, which can move representations outside that hull, and the residual connection adds the original input back in. Attention routes; the FFN transforms. Seeing the constraint measured makes the block's structure feel inevitable rather than arbitrary." }] },

    { t: "h2", n: "04", text: "What the T × T matrix costs", id: "cost" },

    { t: "diagram", kind: "matrix", title: "Every position scores every position",
      caption: "For T tokens this is T² scores per head. It is both the source of attention's power and its memory wall.",
      cols: ["I", "love", "AI"],
      rows: ["I", "love", "AI"],
      cells: [
        ["0.351", "0.320", "0.329"],
        ["0.375", "0.323", "0.302"],
        ["0.379", "0.301", "0.320"]
      ] },

    { t: "p", text: "Every row sums to 1 and every entry is a genuine comparison between two positions — which is what gives the O(1) path length. Lesson 3.13 measured what that costs: **34.36 GB for a single 32,768-token sequence at 8 heads in fp32**. Power and cost are the same fact." },

    { t: "exercise", kind: "practice", title: "Implement and probe self-attention", difficulty: "intermediate", minutes: 35,
      prompt: "Implement scaled dot-product self-attention and verify against `F.scaled_dot_product_attention`. Confirm the rows of the attention matrix sum to 1 and that the output lies within the convex hull of V on every dimension. Then set `W_Q = W_K = I` and feed in orthogonal one-hot-like embeddings — what do the attention weights become, and why? Finally, scale the embeddings up by a factor of 10 and observe what happens to the attention distribution.",
      hints: [
        "For the hull check, compare element-wise against V's per-dimension min and max.",
        "With identity projections and orthogonal inputs, each token's best match is itself.",
        "Scaling the embeddings scales the scores, which is the same effect as removing the √d_k division."
      ],
      solution: {
        notes: [
          { t: "p", text: "The hull check should pass on every dimension, because softmax weights are non-negative and sum to one by construction. It is worth doing because it changes how you read the architecture: an attention layer cannot create a representation that is not already a blend of its inputs, so the position-wise feed-forward network is not an optional extra for capacity — it is the only part of the block that can move a representation somewhere new." },
          { t: "p", text: "The scaling experiment reproduces the saturation problem from lesson 3.8 from the other direction. Multiplying embeddings by 10 multiplies the scores by 100, and the softmax collapses to nearly one-hot with almost no gradient. This is why input embeddings in the original transformer are multiplied by √d_model before positional encoding is added, and why LayerNorm at the block boundary matters — both keep the magnitudes entering attention in a range where the softmax stays soft." },
          { t: "p", text: "With identity projections and orthogonal inputs each token matches itself most strongly and everything else equally, which makes concrete that attention is a similarity computation in the projected space. The learned projections exist to make similarity mean something task-relevant rather than raw embedding overlap — two tokens can be far apart as embeddings and close as query and key." }
        ]
      } }

  ],

  takeaways: [
    "Query is what a token seeks, key is what it advertises, value is what it contributes — key and value separate on purpose.",
    "`softmax(QKᵀ/√d_k)V`: scores every pair, normalises per row, returns a weighted blend of values.",
    "Output has the same shape as input, which is what lets blocks stack.",
    "The reference's worked softmax `[0.05, 0.62, 0.33]` is rounded; exact is `[0.0628, 0.6262, 0.3110]`.",
    "Attention output is a convex combination of V — verified inside the hull on every dimension.",
    "So attention can only interpolate; the feed-forward network is what moves representations outside that hull.",
    "The T×T score matrix gives O(1) path length and costs O(n²) memory — the same fact twice."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why are keys and values separate projections rather than one?",
      options: ["For numerical stability", "So what makes a token findable is learned independently of what it contributes", "To reduce parameters", "To allow different dimensions"],
      answer: 1,
      why: "A token can be matched on one basis — grammatical features, say — and contribute something else entirely once selected. It is the same separation a database index has from the row it points to, and collapsing them would force retrieval criteria and retrieved content to be the same vector." },
    { stem: "Can self-attention produce an output vector outside the range of its value vectors?",
      options: ["Yes, through the softmax", "No — the output is a convex combination of V, verified within the hull on every dimension", "Yes, if scores are negative", "Only with multiple heads"],
      answer: 1,
      why: "Attention weights are non-negative and sum to 1, so the output is a weighted average and must lie inside the values' convex hull. This is why an attention layer is never used alone: the position-wise feed-forward network that follows is the only part of the block that can move a representation outside that hull." },
    { stem: "What is the shape of the attention score matrix for T tokens?",
      options: ["T × d", "T × T, per head", "d × d", "1 × T"],
      answer: 1,
      why: "Every position scores every other, giving T² entries per head. That is what produces a path of length 1 between any two positions, and equally what makes memory quadratic — 34.36 GB for one 32,768-token sequence at 8 heads in fp32, as measured in lesson 3.13." },
    { stem: "You multiply your input embeddings by 10 and attention stops learning. Why?",
      options: ["Gradient explosion in the value projection", "Scores scale by 100, saturating the softmax to near one-hot with negligible gradient", "The softmax overflows", "The keys and queries become orthogonal"],
      answer: 1,
      why: "Scores are dot products of the projections, so scaling inputs by 10 scales scores by 100. A saturated softmax has near-zero gradient, so the attention weights cannot be learned — the same failure the √d_k division exists to prevent, arriving by a different route." }
  ] },

  interview: { title: "Interview", sub: "Self-attention", questions: [
    { level: "Core", q: "Explain self-attention in terms of queries, keys and values.",
      strong: "Each token projects three ways; queries score against keys, the softmax weights values.",
      answer: [{ t: "p", text: "Each token is projected into three vectors by learned matrices. The query represents what that token is looking for, the key what it advertises to others, and the value what it contributes when selected. You take the dot product of every query with every key to get a T by T score matrix, divide by the square root of the key dimension to keep the softmax from saturating, softmax each row so the weights sum to one, and use those weights to average the values. The output is one vector per position, same shape as the input, now containing information drawn from wherever in the sequence was relevant. The separation of key from value is the part worth calling out — it means a token can be findable on one basis and contribute something different once found, like a database index and the row behind it." }] },
    { level: "Senior", q: "Why does a transformer block need a feed-forward network after attention?",
      strong: "Attention output is a convex combination of values, so it can only interpolate — the FFN is what transforms.",
      answer: [{ t: "p", text: "Because attention alone cannot produce anything new. The weights are non-negative and sum to one, so the output is a convex combination of the value vectors and must lie inside their hull — I have verified that on every dimension. Attention is a routing operation: it decides which information goes where and blends it, but the blend is always within the span of what was already there. The position-wise feed-forward network applies a non-linearity independently at each position, which is the only part of the block that can move a representation outside that hull, and it is also where most of the block's parameters live — about two thirds in a standard configuration. So the useful way to read the block is attention for mixing across positions, FFN for transforming within a position, and the residual connections keeping both as refinements of the input rather than replacements." }] },
    { level: "Senior", q: "What is the computational profile of self-attention and when does it become a problem?",
      strong: "O(n²) in time and memory for the score matrix; memory binds first, at a few thousand tokens.",
      answer: [{ t: "p", text: "The score matrix is T by T per head, so both time and memory are quadratic in sequence length. Memory is what binds in practice — I have computed 34 GB for a single 32,768-token sequence at eight heads in fp32, at batch size one. That becomes limiting somewhere in the low thousands of tokens on typical hardware, which is why the original models had 512-token context windows. The whole long-context research programme is about not materialising that matrix: FlashAttention computes it in tiles that stay in on-chip SRAM and never writes the full matrix to memory, which is exact and just a better implementation; sparse attention restricts which pairs are computed; and linear attention families approximate the softmax so the computation can be reassociated into O(n). Worth knowing that FlashAttention is the one that is not an approximation, which is why it became the default rather than a trade-off you opt into." }] }
  ] }
});

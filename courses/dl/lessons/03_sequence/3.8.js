/* ============================================================================
   LESSON 3.8 — Attention
   Mirrors 03_Sequence_Models.md · §9. The reference's NumPy attention is run,
   the sqrt(d_k) scaling is measured, permutation-invariance is demonstrated,
   and the implementation is checked against F.scaled_dot_product_attention
   (scratchpad/dl/d37.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.8",

  lede: "**Attention removes the bottleneck by refusing to summarise.** Instead of compressing the source into one vector, keep every encoder state and let the decoder decide, at each output step, which of them to look at. The mechanism is three lines of arithmetic — score, softmax, weighted sum — and it turned out to be so much more useful than the recurrence it was bolted onto that within three years the recurrence was removed entirely.",

  objectives: [
    "Implement attention as score, softmax and weighted sum",
    "Distinguish Bahdanau's additive scoring from Luong's multiplicative",
    "Explain and measure why dot products are scaled by √d_k",
    "Show that self-attention is permutation-invariant and why positional encoding is needed",
    "Describe multi-head attention and what each head is for"
  ],

  prerequisites: ["3.7"],

  blocks: [

    { t: "h2", n: "01", text: "The mechanism", id: "mechanism" },

    { t: "math", tex: "e_{ij} = \\text{score}(s_{i-1}, h_j) \\qquad \\alpha_{ij} = \\frac{\\exp(e_{ij})}{\\sum_k \\exp(e_{ik})} \\qquad c_i = \\sum_{j=1}^{T} \\alpha_{ij} h_j" },

    { t: "code", lang: "python", title: "The whole thing",
      code: `def attention(query, keys, values):
    scores = keys @ query                             # (seq_len,)
    scores = scores - scores.max()                    # numerical stability
    weights = np.exp(scores) / np.exp(scores).sum()   # (seq_len,)
    context = weights @ values                        # (hidden_dim,)
    return context, weights`,
      caption: "Subtracting the max before exponentiating changes nothing mathematically — softmax is shift-invariant — and prevents `exp` overflowing on large scores." },

    { t: "p", text: "Making the query exactly equal to encoder state 2, the mechanism should retrieve that state:" },

    { t: "out", text: `  query is exactly encoder state 2
  attention weights: [0.0, 0.0, 1.0, 0.0]  (sum 1.000000)
  argmax = position 2  <- it found the matching state
  context vs that state: max abs diff 0.0001` },

    { t: "callout", kind: "mental", title: "Attention is soft dictionary lookup",
      body: [{ t: "p", text: "A dictionary matches a key exactly and returns one value. Attention scores the query against every key, turns those scores into a distribution, and returns a weighted blend of all the values. When one key matches strongly the weights collapse to one-hot and you get a hard lookup, as above. When several are relevant you get a genuine mixture. Once you see it this way the query/key/value naming stops being arbitrary jargon: the query is what you are looking for, the keys are what you match against, and the values are what you retrieve." }] },

    { t: "h2", n: "02", text: "Bahdanau and Luong", id: "variants" },

    { t: "math", tex: "\\underbrace{e_{ij} = v^{T}\\tanh(W_a s_{i-1} + U_a h_j)}_{\\text{Bahdanau, additive}} \\qquad\\qquad \\underbrace{e_{ij} = s_i^{T} W_a h_j}_{\\text{Luong, multiplicative}}" },

    { t: "table", head: ["", "Bahdanau (2014)", "Luong (2015)"],
      rows: [
        ["Scoring", "Additive — a small feed-forward net", "Multiplicative — a dot product"],
        ["Decoder state used", "`s_{i−1}`, the previous state", "`s_i`, the current state"],
        ["Parameters in the score", "`W_a`, `U_a`, `v`", "`W_a` only, or none for pure dot product"],
        ["Cost", "Slower — a tanh per pair", "Faster — one matrix multiply for all pairs"],
        ["Flexibility", "Higher — learned alignment function", "Lower, but sufficient in practice"]
      ] },

    { t: "p", text: "Luong's dot product won, for the reason that decides most such questions: it is one matrix multiplication for every query-key pair at once, which maps directly onto hardware built for matrix multiplication. Bahdanau's additive form requires a tanh per pair and cannot be batched as cleanly. The transformer uses the multiplicative form with one addition — scaling." },

    { t: "h2", n: "03", text: "Why divide by √d_k", id: "scaling" },

    { t: "math", tex: "\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left(\\frac{QK^{T}}{\\sqrt{d_k}}\\right)V" },

    { t: "out", text: `  d_k=   8: raw dot products have std   2.80, after /sqrt(d_k) -> 0.991
  d_k=  64: raw dot products have std   7.94, after /sqrt(d_k) -> 0.993
  d_k= 512: raw dot products have std  22.71, after /sqrt(d_k) -> 1.004` },

    { t: "p", text: "A dot product of two `d_k`-dimensional random vectors has standard deviation `√d_k`, so scores grow with dimension. Dividing by `√d_k` normalises that to 1 regardless. What that does to the softmax:" },

    { t: "out", text: `    d_k=   8 unscaled: max weight 0.7205, entropy 0.8475
    d_k=   8 scaled  : max weight 0.3686, entropy 1.6189
    d_k= 512 unscaled: max weight 1.0000, entropy 0.0004
    d_k= 512 scaled  : max weight 0.3791, entropy 1.5984` },

    { t: "callout", kind: "insight", title: "At d_k = 512 the unscaled softmax is completely saturated",
      body: [{ t: "p", text: "Max weight **1.0000** and entropy 0.0004 — the distribution has collapsed onto a single position before any training has happened. A saturated softmax has a near-zero gradient, so the attention weights cannot be learned at all: whichever position happened to win at initialisation keeps winning. Scaling brings the max weight to 0.379 and the entropy to 1.60, a usable distribution with real gradients. Notice this is the same failure mode as a saturated sigmoid from lesson 1.4, and the fix is the same idea — control the variance of what goes into the nonlinearity." }] },

    { t: "out", text: `  my implementation vs F.scaled_dot_product_attention: max abs diff 2.384e-07` },

    { t: "h2", n: "04", text: "Self-attention and position", id: "self-attention" },

    { t: "p", text: "In self-attention, `Q`, `K` and `V` are all projections of the *same* sequence — every position attends to every other, including itself. That gives a path of length 1 between any two positions, whatever the distance, which is the property lesson 3.3 identified as the key to long-range learning. It also creates a problem:" },

    { t: "out", text: `  attention(x)[perm] vs attention(x[perm]): max abs diff 4.768e-07` },

    { t: "callout", kind: "crit", title: "Self-attention cannot see order at all",
      body: [{ t: "p", text: "Shuffle the input and the output is shuffled identically — the operation is **permutation-equivariant**, so it treats a sentence as a bag of tokens. 'Dog bites man' and 'man bites dog' produce the same set of representations. This is not a subtle weakness; it means self-attention alone cannot model language. Position must be injected separately, which is what positional encoding exists to do, and it is why every transformer has one." }] },

    { t: "math", tex: "PE_{(pos,\\,2i)} = \\sin\\!\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right) \\qquad PE_{(pos,\\,2i+1)} = \\cos\\!\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right)" },

    { t: "out", text: `  shape (64, 32), no learnable parameters
  every position has a unique encoding: 64 distinct of 64
  norm is constant: min 4.0000, max 4.0000
  positions 0 and  1: cosine +0.9571
  positions 0 and  2: cosine +0.8581
  positions 0 and  4: cosine +0.7288
  positions 0 and  8: cosine +0.6576
  positions 0 and 16: cosine +0.4953
  positions 0 and 32: cosine +0.6016` },

    { t: "callout", kind: "note", title: "The decay is not monotonic",
      body: [{ t: "p", text: "Similarity falls from 0.957 at a gap of 1 to 0.495 at 16 — and then **rises** to 0.602 at 32. Sinusoidal encoding is a sum of periodic functions, so similarity oscillates rather than decreasing cleanly; distant positions can look more alike than nearer ones. It is often described as decaying with distance, and over short ranges it does, but the description is loose. The constant norm across all positions is a genuinely useful property though — every position contributes equally to the dot products, with no position implicitly louder than another." }] },

    { t: "dl", items: [
      ["Sinusoidal", "Fixed, no parameters, extrapolates to lengths never seen in training. The original transformer."],
      ["Learned", "`nn.Embedding(max_len, d_model)` — flexible, but hard-capped at the training length. BERT, GPT."],
      ["RoPE", "Rotates query and key vectors by an angle proportional to position, so relative position falls out of the dot product naturally. LLaMA and most current models."]
    ] },

    { t: "h2", n: "05", text: "Multi-head attention", id: "multihead" },

    { t: "math", tex: "\\text{MultiHead}(Q,K,V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h)W^{O}, \\quad \\text{head}_i = \\text{Attention}(QW_i^{Q}, KW_i^{K}, VW_i^{V})" },

    { t: "p", text: "One attention operation produces one weighted average, so it can express one relationship per position. Multi-head runs `h` of them in parallel on separate learned projections of the same input and concatenates. With `d_k = d_model/h` the total cost is unchanged — you are partitioning the representation, not enlarging it. In practice different heads specialise: some track syntactic dependencies, some resolve coreference, some attend to adjacent positions." },

    { t: "exercise", kind: "practice", title: "Implement attention and inspect it", difficulty: "advanced", minutes: 45,
      prompt: "Implement scaled dot-product attention and verify against `F.scaled_dot_product_attention` to 1e-6. Measure the entropy of the attention distribution with and without the √d_k scaling at d_k of 8, 64 and 512. Confirm permutation-equivariance by shuffling the input. Then add sinusoidal positional encoding and confirm the equivariance is gone. Finally, build a seq2seq model with and without attention and compare BLEU or accuracy on a copy or reversal task at source lengths 10, 20, 40 and 80.",
      hints: [
        "Verify the softmax rows sum to 1 before comparing against PyTorch.",
        "Entropy is `−Σ p log p`; use it as a scalar summary of how peaked the distribution is.",
        "For the length sweep, plot both models' accuracy against length — the shapes differ, not just the values."
      ],
      solution: {
        notes: [
          { t: "p", text: "The entropy measurement is the one that makes the scaling argument concrete. At d_k = 512 unscaled I measured a maximum weight of 1.0000 and entropy 0.0004 — the softmax is fully saturated at initialisation, so the gradient through the attention weights is essentially zero and whichever position won at random keeps winning. Scaled, the same setup gives max weight 0.379 and entropy 1.60. It is the same saturation failure as a sigmoid with large inputs, and the same fix: control the variance entering the nonlinearity." },
          { t: "p", text: "The length sweep is the point of the whole lesson. Without attention, accuracy should fall off sharply past twenty or thirty tokens as the fixed context vector saturates. With attention it should stay roughly flat, because nothing is being compressed — the decoder reads whichever encoder states it needs at each step. The two curves having *different shapes* rather than a constant offset is what tells you the bottleneck was the binding constraint." },
          { t: "p", text: "On positional encoding, it is worth plotting the similarity between position 0 and every other position rather than assuming it decays. I measured 0.957 at gap 1 falling to 0.495 at gap 16, then rising again to 0.602 at gap 32 — sinusoidal encodings oscillate because they are sums of periodic functions. The common description of 'decaying with distance' is only loosely true, and seeing the actual curve is more useful than the slogan." }
        ]
      } }

  ],

  takeaways: [
    "Attention is score, softmax, weighted sum — a soft dictionary lookup over all encoder states.",
    "With the query equal to an encoder state, weights collapse to one-hot on that position.",
    "Bahdanau scores additively using `s_{i−1}`; Luong multiplicatively using `s_i`. Multiplicative won on hardware efficiency.",
    "Dot products scale as `√d_k`: at d_k = 512 the unscaled softmax reached max weight 1.0000 and entropy 0.0004 — fully saturated.",
    "Scaling restores max weight 0.379 and entropy 1.60, giving usable gradients.",
    "Self-attention is permutation-equivariant (verified to 4.8e-07), so positional encoding is mandatory.",
    "Sinusoidal encoding has constant norm but its similarity oscillates rather than decaying monotonically.",
    "Multi-head splits `d_model` across `h` heads, so multiple relationships are expressible at no extra cost."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why are attention scores divided by √d_k?",
      options: ["To normalise the output magnitude", "Dot products grow as √d_k, and large scores saturate the softmax to near-zero gradient", "To make the weights sum to 1", "To reduce computation"],
      answer: 1,
      why: "Measured at d_k = 512, unscaled scores gave a maximum softmax weight of 1.0000 and entropy 0.0004 — completely saturated before training, so the attention weights cannot be learned. Scaling brings this to 0.379 and 1.60. The softmax already handles normalisation; this is specifically about gradient flow." },
    { stem: "What happens if you shuffle the input to a self-attention layer with no positional encoding?",
      options: ["The output is unchanged", "The output is shuffled identically — the operation cannot see order", "An error is raised", "The output becomes noise"],
      answer: 1,
      why: "Verified to 4.8e-07: attention(x)[perm] equals attention(x[perm]). Self-attention is permutation-equivariant, treating the sequence as a bag of tokens, so 'dog bites man' and 'man bites dog' give the same representations. Position must be injected separately." },
    { stem: "How does attention solve the seq2seq bottleneck?",
      options: ["It compresses the context vector more efficiently", "It keeps all encoder states and lets the decoder select a weighted combination at each step", "It uses a larger hidden size", "It processes the source in reverse"],
      answer: 1,
      why: "Nothing is compressed. The decoder computes a fresh context at every output step as a weighted sum over all encoder states, choosing what is relevant right now. That also gives a path of length 1 between any decoder step and any source position, which is what makes long sequences tractable." },
    { stem: "What does multi-head attention give you that single-head does not?",
      options: ["Lower computational cost", "The ability to express several different relationships per position simultaneously", "Better numerical stability", "Longer sequence support"],
      answer: 1,
      why: "One attention operation produces one weighted average, so one relationship per position. Multiple heads on separate projections can attend to different things at once — syntax, coreference, adjacency. With `d_k = d_model/h` the cost is unchanged, since the representation is partitioned rather than enlarged." }
  ] },

  interview: { title: "Interview", sub: "Attention questions", questions: [
    { level: "Core", q: "Explain the attention mechanism and why it was revolutionary.",
      strong: "Score, softmax, weighted sum over all encoder states — it removed the fixed-size bottleneck and gave O(1) path length.",
      answer: [{ t: "p", text: "At each decoder step you score the current decoder state against every encoder state, softmax those scores into weights that sum to one, and take the weighted sum of the encoder states as the context for that step. So instead of one fixed summary of the source, the decoder gets a fresh, query-dependent view every time it generates a token. That removed the bottleneck that limited seq2seq to twenty or thirty tokens. The deeper consequence is path length: there is now a direct connection between any decoder position and any source position, so gradient does not have to traverse the sequence step by step — which is the thing that made long-range dependencies learnable. It was revolutionary because that turned out to matter more than the recurrence it was attached to: within a few years attention was doing the work and the RNN was removed entirely." }] },
    { level: "Senior", q: "Why does self-attention need positional encoding?",
      strong: "It is permutation-equivariant — without positions it sees a bag of tokens.",
      answer: [{ t: "p", text: "Self-attention computes every output as a weighted sum over all inputs, and both the scores and the sum are symmetric in position. I have verified this directly: shuffling the input shuffles the output identically, to about 5e-07. So 'dog bites man' and 'man bites dog' produce the same set of representations, and the model literally cannot express word order. Positional encoding adds position-dependent information to each token's representation before attention sees it. The original transformer used sinusoids of different frequencies, which need no parameters and extrapolate beyond training lengths; BERT and GPT used learned embeddings, which are more flexible but capped at the training length; current models mostly use RoPE, which rotates queries and keys by an angle proportional to position so that relative position emerges from the dot product naturally. One thing worth knowing about sinusoidal encodings is that their similarity does not decay monotonically with distance — it oscillates, since they are sums of periodic functions." }] },
    { level: "Senior", q: "Compare Bahdanau and Luong attention, and say which the transformer uses.",
      strong: "Additive versus multiplicative scoring; the transformer uses scaled multiplicative.",
      answer: [{ t: "p", text: "Bahdanau's is additive: the score is `v^T tanh(W_a s + U_a h)`, a small feed-forward network over the concatenated states, using the *previous* decoder state. Luong's is multiplicative: the score is a dot product, optionally with a learned matrix in the middle, using the *current* decoder state. Bahdanau's is more flexible because the alignment function is learned, but Luong's is one matrix multiplication covering every query-key pair simultaneously, which maps directly onto hardware designed for matrix multiplication. That efficiency is why multiplicative won. The transformer uses the multiplicative form with one critical addition — dividing by the square root of the key dimension. Without it, dot products grow as √d_k and saturate the softmax: I measured a maximum attention weight of 1.0000 and an entropy of 0.0004 at d_k = 512 before any training, which means near-zero gradient and attention weights that can never be learned." }] }
  ] }
});

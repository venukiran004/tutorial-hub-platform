/* ============================================================================
   LESSON 4.7 — Encoder and Decoder Blocks
   Mirrors 02_Transformers_InDepth.md · §8. The reference's EncoderBlock and
   DecoderBlock are run, the parameter split measured, and the residual
   stream traced through a 12-block stack (scratchpad/nlp/n47.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.7",

  lede: "**A decoder block costs exactly 1.33x an encoder block, and the difference is one entire cross-attention module — 1,050,624 parameters.** That is the whole structural distinction between the two halves of a transformer: the decoder has a third sublayer that reads the encoder. Everything else about them is the same, including the property that makes the architecture work at all — input shape equals output shape, so blocks stack to any depth without a single dimension changing.",

  objectives: [
    "Assemble an encoder block and a decoder block from the parts built in 4.3 to 4.6",
    "Explain why shape preservation is what makes stacking possible",
    "Measure the parameter split within a block and between the two block types",
    "Trace the residual stream's magnitude through a deep stack",
    "Verify that decoder self-attention is masked and cross-attention is not"
  ],

  prerequisites: ["4.6", "4.5"],

  blocks: [

    { t: "h2", n: "01", text: "The encoder block", id: "encoder" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n47.py — the reference's EncoderBlock", code:
"class EncoderBlock(nn.Module):\n    def __init__(self, d_model, n_heads, d_ff, dropout=0.1):\n        super().__init__()\n        self.attention = MultiHeadAttention(d_model, n_heads, dropout)\n        self.ffn = nn.Sequential(\n            nn.Linear(d_model, d_ff), nn.GELU(), nn.Dropout(dropout),\n            nn.Linear(d_ff, d_model), nn.Dropout(dropout))\n        self.norm1 = nn.LayerNorm(d_model)\n        self.norm2 = nn.LayerNorm(d_model)\n\n    def forward(self, x, src_mask=None):\n        # Pre-LN: normalise inside the branch, leave the residual clean\n        normed = self.norm1(x)\n        attn_out, _ = self.attention(normed, normed, normed, src_mask)\n        x = x + attn_out                    # residual\n        x = x + self.ffn(self.norm2(x))     # residual\n        return x",
      caption: "Two sublayers, each `x = x + SubLayer(LN(x))`. This is the Pre-LN form from lesson 4.6 — note the residual `x` is never itself normalised." },

    { t: "p", text: "Two sublayers and two norms. Attention mixes information across positions; the FFN transforms each position on its own. Both are wrapped in a residual connection, which is what makes the block a *modification* of its input rather than a replacement." },

    { t: "h2", n: "02", text: "The decoder block", id: "decoder" },

    { t: "code", lang: "python", title: "Three sublayers instead of two", code:
"class DecoderBlock(nn.Module):\n    def __init__(self, d_model, n_heads, d_ff, dropout=0.1):\n        super().__init__()\n        self.self_attn  = MultiHeadAttention(d_model, n_heads, dropout)\n        self.cross_attn = MultiHeadAttention(d_model, n_heads, dropout)\n        self.ffn = nn.Sequential(\n            nn.Linear(d_model, d_ff), nn.GELU(), nn.Dropout(dropout),\n            nn.Linear(d_ff, d_model), nn.Dropout(dropout))\n        self.norm1 = nn.LayerNorm(d_model)\n        self.norm2 = nn.LayerNorm(d_model)\n        self.norm3 = nn.LayerNorm(d_model)\n\n    def forward(self, x, encoder_out, src_mask=None, tgt_mask=None):\n        normed = self.norm1(x)\n        x = x + self.self_attn(normed, normed, normed, tgt_mask)[0]\n\n        normed = self.norm2(x)\n        x = x + self.cross_attn(normed, encoder_out, encoder_out, src_mask)[0]\n\n        x = x + self.ffn(self.norm3(x))\n        return x",
      caption: "Read the cross-attention call carefully: queries from `normed` (the decoder), keys and values from `encoder_out`. Two different masks are in play — `tgt_mask` is causal, `src_mask` only hides padding." },

    { t: "diagram", kind: "compare", title: "Two sublayers against three",
      columns: [
        { title: "Encoder block", tone: "teal", items: [
          "1. Bidirectional self-attention",
          "2. Feed-forward network",
          "Two LayerNorms",
          "Mask only hides padding",
          "3,152,384 parameters",
          "Sees the whole source at once"
        ] },
        { title: "Decoder block", tone: "violet", items: [
          "1. Masked self-attention",
          "2. Cross-attention to the encoder",
          "3. Feed-forward network",
          "Three LayerNorms",
          "4,204,032 parameters - 1.33x",
          "Sees only its own past, plus all source"
        ] }
      ] },

    { t: "h2", n: "03", text: "Shapes", id: "shapes" },

    { t: "out", text:
"encoder:  in (2, 12, 512)                      -> out (2, 12, 512)\ndecoder:  in (2, 7, 512) + encoder (2, 12, 512) -> out (2, 7, 512)" },

    { t: "callout", kind: "insight", title: "Shape preservation is the architectural trick",
      body: [{ t: "p", text: "A block takes `(batch, seq, d_model)` and returns `(batch, seq, d_model)`. Nothing changes width, nothing changes length. That is why you can stack 6 blocks or 96 with no code change and no dimension bookkeeping — depth becomes a single hyperparameter. It is also why the residual connection is even possible: `x + SubLayer(x)` requires both terms to have the same shape. The whole design hangs on this, and it is the reason a transformer looks like one module repeated rather than a pipeline of differently-shaped stages." }] },

    { t: "p", text: "Note the decoder output has **7** positions, not 12. The sequence length follows the *target*; the source only ever enters through cross-attention's keys and values. That is what lets a transformer translate a 12-word sentence into a 7-word one." },

    { t: "h2", n: "04", text: "Where the parameters are", id: "params" },

    { t: "out", text:
"d_model 512, 8 heads, d_ff 2048\n\nencoder block   3,152,384 total\n  attention     1,050,624   33.3%\n  FFN           2,099,712   66.6%\n  LayerNorms        2,048    0.06%\n\ndecoder block   4,204,032 total   1.33x the encoder\n  the extra is one whole cross-attention module: 1,050,624" },

    { t: "callout", kind: "insight", title: "The norms are 0.06% of the block",
      body: [{ t: "p", text: "Two LayerNorms hold **2,048** parameters against the block's 3.15 million — six hundredths of one percent. They are among the most consequential parameters in the model, as lesson 4.6 measured with the 780,000x gradient difference between Pre-LN and Post-LN, and they cost essentially nothing. This is a useful thing to know when quantising or pruning: norms are not where the memory is, and they are exactly the wrong place to economise. Keep them in full precision." }] },

    { t: "h2", n: "05", text: "The residual stream", id: "stream" },

    { t: "p", text: "A useful way to read a stack: the residual connection creates a single vector per position that runs from the input to the output, and every sublayer *reads* from it and *adds* to it. Nothing replaces it. In a Pre-LN model nothing rescales it either, so its magnitude accumulates." },

    { t: "out", text:
"12 blocks, d_model 512, untrained\n\nblock    RMS       growth\ninput    0.9975    1.00x\n0        1.0222    1.02x\n3        1.0929    1.10x\n6        1.1607    1.16x\n9        1.2361    1.24x\n11       1.2899    1.29x" },

    { t: "callout", kind: "note", title: "What this does and does not show",
      body: [{ t: "p", text: "The stream grows monotonically — 1.29x over 12 blocks — which is the Pre-LN trade lesson 4.6 flagged: the residual path is never normalised, so it accumulates. But the per-block *relative* contribution stayed essentially flat here, between 0.1988 and 0.2206 with no clear downward trend across the twelve blocks. So at this depth with untrained weights, later blocks are not yet being drowned out. The dramatic version of this effect — where deep layers contribute proportionally less because the stream they write into is already huge — needs far more depth and trained weights to appear, and it is what motivates techniques like scaling the residual branch by `1/sqrt(2N)` at initialisation." }] },

    { t: "h2", n: "06", text: "The two masks behave differently", id: "masks" },

    { t: "out", text:
"decoder with a 7-token target and a 12-token source\n\nself-attention weights   (1, 8, 7, 7)\n  upper-triangle max 0.00e+00        exactly zero, as required\n\ncross-attention weights  (1, 8, 7, 12)\n  rows sum to 1 over the 12 SOURCE positions:\n  [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]" },

    { t: "callout", kind: "insight", title: "Square against rectangular",
      body: [{ t: "p", text: "Self-attention is `(7, 7)` — square, and causally masked so the upper triangle is exactly 0.0, not merely small. Cross-attention is `(7, 12)` — **rectangular**, target by source, and not masked at all, because the whole source already exists. Each decoder row distributes its full attention mass across the 12 source positions. That rectangular matrix is the alignment matrix: visualise it and you can read which source token produced which output token, which is the single most useful debugging artefact an encoder-decoder model gives you." }] },

    { t: "h2", n: "07", text: "Stacking", id: "stacking" },

    { t: "diagram", kind: "flow", title: "N blocks, and what connects them", cols: 3,
      nodes: [
        { id: "e", text: "Embeddings plus position", tone: "accent" },
        { id: "b", text: "Encoder block x N, shape preserved", tone: "teal" },
        { id: "m", text: "Encoder output: K and V for every decoder block", tone: "teal" },
        { id: "t", text: "Target embeddings plus position", tone: "accent" },
        { id: "d", text: "Decoder block x N, each reading the same K and V", tone: "violet" },
        { id: "o", text: "Linear to vocabulary, then softmax", tone: "good" }
      ],
      edges: [["e","b"],["b","m"],["t","d"],["m","d"],["d","o"]] },

    { t: "dl", items: [
      ["One encoder output, reused", "The encoder runs once. Its final output feeds cross-attention in *every* decoder block — not layer 1 to layer 1. There is no layer-to-layer pairing between the stacks."],
      ["Blocks do not share weights", "Each of the N blocks has its own parameters. Weight-sharing variants exist (ALBERT ties all layers) and trade quality for memory."],
      ["The final norm", "A Pre-LN stack needs one more LayerNorm after the last block, because the output of that block has never been normalised. It is easy to omit and the model trains badly without it."],
      ["Depth against width", "6 blocks at d_model 512 in the original; modern models go much deeper and wider. Scaling laws, in lesson 5.4, say how to trade them."]
    ] },

    { t: "callout", kind: "trap", title: "The missing final norm",
      body: [{ t: "p", text: "In Post-LN every block ends with a normalisation, so the stack output is normalised by construction. In Pre-LN it is not — the last thing that happens is a residual addition. Every real Pre-LN implementation therefore applies a final `LayerNorm` after the loop, and if you write the stack yourself it is the single easiest thing to leave out. The symptom is a model that trains, slowly and badly, with a loss that plateaus higher than it should. Check for it before you check anything else." }] },

    { t: "exercise", title: "Build and instrument a stack",
      tasks: [
        "Assemble an encoder block from your own MultiHeadAttention and confirm input and output shapes match exactly.",
        "Count parameters per sublayer and reproduce the 33/67 attention-to-FFN split.",
        "Stack 24 blocks and plot residual-stream RMS against depth. Compare Pre-LN with Post-LN.",
        "Measure each block's relative contribution and see whether a downward trend appears at greater depth than 12.",
        "Build a decoder block, feed it a 5-token target and a 20-token source, and assert the cross-attention weights are (5, 20) with rows summing to 1."
      ] }
  ],

  takeaways: [
    "An encoder block has two sublayers, a decoder block three — the extra is cross-attention, costing 1,050,624 parameters.",
    "A decoder block is 4,204,032 parameters against an encoder's 3,152,384 — exactly 1.33x.",
    "Blocks are shape-preserving: (batch, seq, d_model) in and out, which is what makes depth a single hyperparameter and residuals possible.",
    "The decoder's output length follows the target, not the source — 7 out from a 12-token source.",
    "Within a block: FFN 66.6%, attention 33.3%, LayerNorms 0.06%. Norms are decisive and nearly free, so never economise on them.",
    "The Pre-LN residual stream grew monotonically 1.00x to 1.29x over 12 blocks because nothing rescales it.",
    "Per-block relative contribution stayed flat at 0.1988-0.2206 across those 12 untrained blocks — the drowning-out effect needs more depth and trained weights.",
    "Decoder self-attention is square and causally masked, with an upper triangle of exactly 0.0; cross-attention is rectangular (target × source) and unmasked.",
    "The encoder runs once and every decoder block reads the same output — there is no layer-to-layer pairing.",
    "A Pre-LN stack needs a final LayerNorm after the last block; omitting it is a common and quiet bug."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why must a transformer block preserve its input shape?",
      options: ["To save memory", "So blocks stack to any depth unchanged, and so the residual addition x + SubLayer(x) is even defined", "Because attention requires square matrices", "To keep the vocabulary aligned"],
      answer: 1,
      why: "A block maps (batch, seq, d_model) to the same shape. That makes depth a single hyperparameter you can change without touching any other dimension, and it is a hard requirement for the residual connection, which adds the input to the sublayer output and therefore needs both to match." },
    { stem: "What exactly does a decoder block have that an encoder block does not?",
      options: ["A larger FFN", "A cross-attention sublayer with its own 1,050,624 parameters, plus the third LayerNorm", "More heads", "A causal mask only"],
      answer: 1,
      why: "The decoder's 4,204,032 parameters against the encoder's 3,152,384 is exactly one extra multi-head attention module. The causal masking of self-attention is a behavioural difference that costs nothing, but cross-attention is a whole additional sublayer — which is why the ratio is 1.33x." },
    { stem: "How do the two attention matrices in a decoder block differ in shape?",
      options: ["They are both square", "Self-attention is (target × target) and masked; cross-attention is (target × source) and unmasked", "Cross-attention is square, self-attention is not", "They have identical shapes"],
      answer: 1,
      why: "Measured with a 7-token target and 12-token source: self-attention came out (1, 8, 7, 7) with an upper-triangle maximum of exactly 0.0, and cross-attention (1, 8, 7, 12) with each row summing to 1 over the source. The rectangular one is the alignment matrix, the most useful debugging artefact in an encoder-decoder model." },
    { stem: "What did tracing the residual stream through 12 Pre-LN blocks show?",
      options: ["It stayed constant", "The magnitude grew monotonically to 1.29x, while each block's relative contribution stayed flat around 0.20", "It shrank with depth", "It grew then collapsed"],
      answer: 1,
      why: "Nothing rescales the residual path in Pre-LN, so magnitude accumulates. But relative contributions ranged only 0.1988 to 0.2206 with no clear trend, so at this depth with untrained weights later blocks are not yet being drowned out — that effect needs far more depth, and motivates scaling the residual branch at initialisation." }
  ] },

  interview: { title: "Interview", sub: "Block structure", questions: [
    { level: "Core", q: "Describe what happens inside one transformer block.",
      strong: "Two sublayers in the encoder, three in the decoder, each wrapped in a residual and a norm, shape preserved throughout.",
      answer: [{ t: "p", text: "An encoder block has two sublayers. First multi-head self-attention, which lets every position read every other position — that's the mixing step. Then a position-wise feed-forward network, which transforms each position independently. Each sublayer is wrapped as x equals x plus SubLayer of LayerNorm of x, in the modern Pre-LN form, so the residual path stays a clean identity. A decoder block adds a third sublayer between those two: cross-attention, with queries from the decoder and keys and values from the encoder output, and its self-attention is causally masked. The property that matters most is that the block preserves shape — batch by sequence by d_model in and out — which is what makes depth a single hyperparameter and makes the residual addition possible at all. On cost, a decoder block is exactly 1.33 times an encoder block, because the extra cross-attention module is a full multi-head attention: about 1.05 million parameters on top of 3.15 million. Within a block the split is roughly two-thirds FFN, one-third attention, and the LayerNorms are 0.06% — decisive but nearly free." }] },
    { level: "Senior", q: "What is the residual stream and why is it a useful way to think about a transformer?",
      strong: "One vector per position running the length of the model that each sublayer reads from and adds to.",
      answer: [{ t: "p", text: "Because of the residual connections, each position has a single vector that runs unbroken from the embedding to the final output, and every sublayer reads from it and writes an additive update back into it. Nothing ever replaces it. That reframing is useful for a few reasons. It explains why layers can be dropped or reordered with less damage than you'd expect — each one is contributing an increment, not a transformation the next one depends on exactly. It's the basis of most mechanistic interpretability work, where you ask which heads write which directions into the stream and which later components read them. And it makes the Pre-LN trade concrete: since nothing normalises the stream, its magnitude accumulates. I measured 1.29x growth over 12 blocks. The consequence people cite is that later layers contribute proportionally less because they're writing into something already large — though I should be precise, because when I measured per-block relative contribution across those 12 untrained blocks it stayed flat, between 0.1988 and 0.2206. The drowning-out effect needs much greater depth and trained weights before it shows, and it's what motivates scaling residual branches by one over root 2N at initialisation." }] },
    { level: "Senior", q: "You are implementing a Pre-LN transformer from scratch. What is easy to get wrong?",
      strong: "The final LayerNorm after the stack, and the direction of the cross-attention arguments.",
      answer: [{ t: "p", text: "Three things, in rough order of how quietly they fail. First, the final LayerNorm. In Post-LN every block ends with a norm so the stack output is normalised by construction; in Pre-LN the last operation is a residual addition, so you need one more LayerNorm after the loop. Leave it out and the model still trains — just slowly, to a worse plateau — which makes it hard to attribute. I'd check that before anything else. Second, the cross-attention argument order. Queries come from the decoder, keys and values from the encoder output, and it's easy to write them the other way round. The shapes often still work, because both are d_model wide, so you get a model that trains to mediocre quality rather than an exception. A good assertion is that the cross-attention weight matrix should be target length by source length and rectangular — if it comes out square when your lengths differ, you've swapped them. Third, the masks. There are two, they're different, and they're easy to conflate: the target mask is causal and must make the upper triangle exactly zero, while the source mask only hides padding and cross-attention should not be causally masked at all. I'd write an explicit test asserting the upper triangle of decoder self-attention is 0.0 and that cross-attention rows sum to one over the source positions." }] }
  ] }
});

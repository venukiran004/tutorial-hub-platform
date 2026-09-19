/* ============================================================================
   LESSON 5.2 — The Transformer Block
   ========================================================================= */
EC.receiveLesson({
  id: "5.2",

  lede: "**A transformer block is attention, a feed-forward network, two residual connections and two normalisations, and the whole architecture is that block repeated — so every choice is about one of five things: how position gets in, where the norm goes, what the feed-forward does, how the decoder stays causal, and how decoding avoids recomputing the past.** Sinusoidal, RoPE and ALiBi positions are computed and their invariances checked (RoPE's dot product depends only on the offset, to four decimals); pre-norm and post-norm are compared at 24 blocks (gradient at the input 646 against 5 × 10⁻⁴); the block's parameters are counted (the FFN is two thirds); generation without a KV cache is timed (T² work); and a small transformer is trained on the date task of 4.6 and on the sentiment corpus of 4.5 — with the honest finding that on 10,000 examples the attention-LSTM learns the translation faster.",

  objectives: [
    "Compute sinusoidal positional encodings and explain their relative-offset property; implement RoPE and ALiBi and verify what each makes invariant",
    "Write the block with pre-norm and post-norm and measure the gradient at depth for each",
    "Count a block's parameters and explain the feed-forward network's role and size",
    "Explain the encoder, the causal decoder, the KV cache and why generation without it is quadratic",
    "Train a small transformer on a seq2seq task and a classification task and compare with the recurrent models of module 4"
  ],

  prerequisites: ["5.1", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "Position", id: "position" },

    { t: "p", text: "Attention is a set operation (5.1), so position must be added to the input. The original transformer adds a fixed vector per position built from sines and cosines at geometrically spaced frequencies:" },

    { t: "code", lang: "text", title: "Sinusoidal encoding, d = 16 (executed)",
      code: `PE[pos, 2i] = sin(pos / 10000^(2i/d)),   PE[pos, 2i+1] = cos(pos / 10000^(2i/d))
position 0:  [0, 1, 0, 1, 0, 1, …]                       position 1:  [0.84, 0.54, 0.31, 0.95, 0.10, 1.00, 0.03, 1.00, …]

dot products: pe[10]·pe[11] = 7.49    pe[10]·pe[20] = 3.65    pe[10]·pe[40] = 2.70      nearby positions are more similar
              pe[30]·pe[31] = 7.49                                                       the pattern is the same at every absolute position
a fixed offset k is a linear map of the encoding (a rotation in each sin/cos pair), so relative position is recoverable by a linear layer`,
      caption: "Each pair of dimensions is a clock hand at a different frequency; low dimensions turn fast, high ones slowly, so the vector is unique per position and moving by k positions rotates every hand by a fixed angle — which is how a linear attention weight can express 'k tokens back'. It is fixed, so it extrapolates in principle to positions beyond training, though in practice not well." },

    { t: "code", lang: "text", title: "RoPE and ALiBi (executed)",
      code: `RoPE (rotary): rotate q and k themselves by their positions before the dot product
  q at position 5 · k at position 2      = −4.2207
  q at position 105 · k at position 102  = −4.2208          -- the score depends only on the offset (3)

ALiBi: add −m·|i − j| to the causal scores, one slope m per head; head 0 with m = 0.5:
   0   −0.5  −1   −1.5  −2   −2.5
   0    0   −0.5  −1   −1.5  −2
   …                                                         -- a linear recency bias, no learned positions at all`,
      caption: "Learned absolute embeddings (BERT, GPT-2) are a table of position vectors and cannot extrapolate past the training length. RoPE (Su et al., 2021) puts the position into the query–key product as a rotation, so attention scores are a function of relative distance by construction — the choice of LLaMA and most current models. ALiBi (Press et al., 2022) needs no vectors: a penalty proportional to distance, with slopes fixed per head, and it extrapolates to longer sequences than it was trained on. Relative-position biases (T5, Swin) are learned tables indexed by offset." },

    { t: "h2", n: "02", text: "The block", id: "block" },

    { t: "code", lang: "python", title: "Pre-norm and post-norm (executed on 24 blocks)",
      code: `class Block(nn.Module):
    def forward(self, x, mask=None):
        if self.pre_norm:                                            # GPT-2 onward, LLaMA, ViT
            h = self.norm1(x);  x = x + self.attn(h, h, h, mask)
            return x + self.ffn(self.norm2(x))
        else:                                                        # the original Transformer, BERT
            x = self.norm1(x + self.attn(x, x, x, mask))
            return self.norm2(x + self.ffn(x))

ffn = Linear(d, 4d) -> GELU -> Linear(4d, d)

d = 64, 4 heads, FFN 256:  attention 16,640 (4d²) + FFN 33,088 (8d²) + LayerNorms 256 = 49,984 per block   -- the FFN is two thirds

24 blocks at initialisation:
  pre-norm    output std 1.89    gradient norm at the input 6.5e+02
  post-norm   output std 1.00    gradient norm at the input 4.7e-04`,
      caption: "Post-norm normalises the residual stream after each addition, which keeps the output at unit scale but puts a LayerNorm on the gradient path at every block — the gradient reaching the input of 24 blocks is 5 × 10⁻⁴. Pre-norm normalises the *input* of each sub-layer and leaves the residual stream untouched, so the identity path is clean (3.3's argument) and the gradient arrives (646 — large, because the stream's scale grows with depth, which a final LayerNorm handles). Post-norm needs warm-up and careful initialisation; pre-norm trains at depth without them, which is why it became the default." },

    { t: "dl", items: [
      ["Multi-head self-attention", "The 5.1 layer: 4d² parameters. Mixes information across positions."],
      ["Feed-forward network", "Linear(d, 4d), GELU, Linear(4d, d), applied to every position independently: 8d² parameters, two thirds of the block. It is where per-token computation and, per the interpretability work, most factual memory live. Variants: SwiGLU (a gated FFN, LLaMA), and the mixture-of-experts FFN (5.3)."],
      ["Residual connections", "Around each sub-layer, so the block can be the identity and gradients pass through — the ResNet mechanism applied twice per block."],
      ["LayerNorm", "Per token over d (1.6): no batch dependence, no running statistics; RMSNorm (LLaMA) drops the mean subtraction. Pre- or post-, as above."],
      ["Dropout", "On attention weights, on sub-layer outputs, on embeddings; 0.1 in the original. Large language models often use none."],
      ["Embedding scale", "Token embeddings are multiplied by √d before the positions are added, so the two are on the same scale; the output projection is often tied to the input embedding matrix."]
    ] },

    { t: "h2", n: "03", text: "Encoder, decoder, cache", id: "encdec" },

    { t: "code", lang: "text", title: "The three attention uses in nn.Transformer",
      code: `encoder layer:   self-attention (no mask; key padding only)  ->  FFN                                        x N
decoder layer:   causal self-attention  ->  cross-attention (Q from decoder, K/V from encoder memory)  ->  FFN    x N
output:          Linear(d, vocab) on every decoder position; loss = cross-entropy against the next target token

training: the whole target is fed at once (teacher forcing) with the causal mask; every position predicts the next token in one pass
inference: one token at a time, each appended to the input`,
      caption: "Training is parallel over the target because the causal mask does the job teacher forcing did step by step in 4.6. Inference is sequential, and without a cache each new token means re-running the decoder on the whole prefix:" },

    { t: "code", lang: "text", title: "Generation without a KV cache, one decoder layer, d = 64 (executed)",
      code: `generate  16 tokens:   33.6 ms    (136 position-steps of work)
generate  64 tokens:  125.7 ms    (2,080)
generate 256 tokens:  592.7 ms    (32,896)            -- Σ t = T(T+1)/2: quadratic in the length

with a KV cache: each step feeds only the new token and attends to the stored keys and values of the prefix -- T position-steps in total`,
      caption: "The keys and values of every previous token at every layer do not change when a token is appended, so they are computed once and cached. The cache is what makes decoding linear in length and what fills GPU memory at inference (5.3 computes its size). Without it, the 256-token generation did 240× the necessary work." },

    { t: "h2", n: "04", text: "Two tasks from module 4, with a transformer", id: "tasks" },

    { t: "code", lang: "text", title: "Date translation (the task of 4.6): 2-layer encoder–decoder, d 64, 4 heads, 242k parameters (executed)",
      code: `6 epochs, peak lr 1e-3, one-cycle with warm-up:        exact match 0.314
20 epochs, peak lr 1e-3:  by epoch  1: 0.000   4: 0.236   8: 0.804   12: 0.908   16: 0.920   20: 0.920      (584 s)
20 epochs, peak lr 3e-4:                 0.000      0.050      0.228       0.298       0.334       0.332

the GRU seq2seq with Luong attention (4.6, 84k parameters):  0.999 after 6 epochs (63 s)`,
      caption: "On 10,000 training pairs the recurrent model with attention learned the task in six epochs; the transformer needed twenty to reach 0.92 and was sensitive to the learning rate (0.33 at 3e-4). A transformer has no built-in notion of order or locality (5.1's permutation result) and must learn both from data; on a small, monotonic-alignment task the recurrence's inductive bias is worth a great deal. The transformer's advantages — parallel training, unlimited reach — pay off at scale, and 5.3's ViT-against-CNN result is the same story on images." },

    { t: "code", lang: "text", title: "Sentiment (the corpus of 4.5), all four families, 8 epochs (executed)",
      code: `ANN on averaged embeddings (with a hidden layer)     test acc 0.930    on negated sentences 0.936
vanilla RNN                                          1.000             1.000
LSTM                                                 1.000             1.000
transformer encoder, 2 layers, masked mean pooling   1.000             1.000`,
      caption: "The reference's sentiment project completed: the transformer encoder ties with the recurrent models. The ANN here has a hidden layer, so unlike 4.5's linear bag of words it can represent 'not' × adjective and reaches 0.93; the 7 % it still misses are the distractor clauses, where only order says which adjective governs." },

    { t: "code", lang: "python", title: "The transformer classifier",
      code: `class TransformerClf(nn.Module):
    def __init__(self, d=32, h=4):
        self.emb = nn.Embedding(V, d, padding_idx=0); self.pos = nn.Parameter(torch.randn(32, d) * 0.02)
        self.enc = nn.TransformerEncoder(nn.TransformerEncoderLayer(d, h, 64, dropout=0.1, batch_first=True, norm_first=True), 2)
        self.out = nn.Linear(d, 2)
    def forward(self, ids, lens):
        kpm = ids == 0                                                     # key padding mask
        h = self.enc(self.emb(ids) + self.pos[:ids.shape[1]], src_key_padding_mask=kpm)
        m = (~kpm).float()[:, :, None]
        return self.out((h * m).sum(1) / m.sum(1))                        # masked mean over valid tokens`,
      caption: "Embedding plus learned positions, a stack of pre-norm encoder layers with the padding mask, masked mean pooling, a linear head. BERT uses a [CLS] token instead of pooling; either works. This is the encoder of every text classifier since 2018, at a hundredth of the size." },

    { t: "table", head: ["Choice", "Original (2017)", "Modern decoder-only (LLaMA-style)", "Why"],
      rows: [
        ["Position", "Sinusoidal, added to embeddings", "RoPE in the attention", "Relative by construction; extrapolates better"],
        ["Norm", "Post-norm LayerNorm", "Pre-norm RMSNorm", "Gradient at depth; no warm-up dependence"],
        ["FFN", "ReLU, 4d", "SwiGLU, ~2.7d × 2", "Gated FFN trains better per parameter"],
        ["Attention", "MHA", "GQA + Flash Attention", "KV-cache size; memory-bound decoding (5.3)"],
        ["Bias terms", "Yes", "Mostly none", "No measured loss; fewer parameters"],
        ["Dropout", "0.1", "0", "Large models do not over-fit their corpora"]
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "RoPE gave the same query–key score for positions (5, 2) and (105, 102) to four decimals. Why does that matter?",
          options: [
            "It shows RoPE ignores position",
            "It shows the score depends only on the relative offset (3 in both cases), not the absolute positions — the rotations of q and k by their own positions cancel except for the difference — so attention learns relations like 'three tokens back' that hold anywhere in the sequence, including beyond the training length",
            "It is a floating-point coincidence",
            "It shows the keys were not rotated"
          ],
          answer: 1,
          why: "Absolute learned embeddings cannot express that; sinusoidal ones can only through a learned linear map. RoPE builds relativity into the dot product, which is why it replaced both in most current models."
        },
        {
          stem: "At 24 blocks, the post-norm stack's input gradient was 5 × 10⁻⁴ and the pre-norm stack's 646. What does this say about training deep transformers?",
          options: [
            "Pre-norm explodes and post-norm is safer",
            "Post-norm puts a LayerNorm on the residual path after every block, attenuating the gradient at depth (the 3.3 degradation problem in another form) and requiring warm-up and careful initialisation; pre-norm keeps the identity path clean so gradients reach the input, at the cost of a residual stream that grows with depth — handled by a final norm — which is why pre-norm became the default for deep models",
            "The two are equivalent after training",
            "The difference is due to dropout"
          ],
          answer: 1,
          why: "Xiong et al. (2020) analysed exactly this: post-norm's expected gradient at initialisation shrinks with depth, pre-norm's does not. The original transformer was post-norm and needed its warm-up schedule; GPT-2 switched."
        },
        {
          stem: "The attention-GRU learned date translation to 0.999 in 6 epochs; the transformer needed 20 epochs for 0.92. What is the right conclusion?",
          options: [
            "Transformers are worse at translation",
            "On 10,000 examples of a monotonic-alignment task, the recurrence's built-in order and locality are an advantage the transformer must learn from data; the transformer's strengths — parallel training and unlimited reach — show at scale, where the recurrent model's sequential training and vanishing gradients become the limit",
            "The transformer needed more heads",
            "The learning rate was wrong"
          ],
          answer: 1,
          why: "The same inductive-bias trade appears with ViT against a CNN on 20,000 images (5.3). Both measurements are honest small-data results; neither contradicts what happens at a hundred million examples."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Positions checked, the block measured, the cache timed, the tasks run",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "**(a)** Implement sinusoidal encodings for d = 16 and report pe[10]·pe[11], pe[10]·pe[20], pe[10]·pe[40] and pe[30]·pe[31]. Implement RoPE and show that the score for positions (5, 2) equals that for (105, 102). Print ALiBi's head-0 bias matrix for 6 positions with slope 0.5." },
        { t: "p", text: "**(b)** Write a block with a pre_norm flag; count its parameters at d = 64, 4 heads, FFN 256; stack 24 blocks of each kind at initialisation and report the output std and the gradient norm at the input." },
        { t: "p", text: "**(c)** Time greedy generation of 16, 64 and 256 tokens through one decoder layer without a cache and compute the position-steps of work." },
        { t: "p", text: "**(d)** Train a 2-layer transformer encoder–decoder on the date task for 20 epochs at peak lr 1e-3 and 3e-4 (one-cycle, warm-up 10 %), reporting exact match every four epochs; and a 2-layer transformer encoder classifier on the sentiment corpus alongside an ANN, RNN and LSTM." }
      ],
      requirements: [
        "(a) four dot products, one equality, one matrix.",
        "(b) a parameter breakdown and two (std, gradient) pairs.",
        "(c) three timings.",
        "(d) two accuracy curves and a four-row table."
      ],
      hint: "(a) RoPE: rotate each (even, odd) pair of q and of k by pos·θᵢ with θᵢ = 10000^(−2i/d), then take the dot product. (d) nn.Transformer with norm_first=True, batch_first=True; pass tgt_mask = generate_square_subsequent_mask and both key-padding masks; scale embeddings by √d.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) pe[10]·pe[11] 7.49   pe[10]·pe[20] 3.65   pe[10]·pe[40] 2.70   pe[30]·pe[31] 7.49
#     RoPE: (5, 2) -> −4.2207   (105, 102) -> −4.2208
#     ALiBi head 0 (m = 0.5): row i has −0.5·(i − j) for j ≤ i, e.g. row 0: [0, −0.5, −1, −1.5, −2, −2.5] masked to the causal part

# (b) attention 16,640 + FFN 33,088 + norms 256 = 49,984;  24 blocks: pre-norm std 1.89, grad 6.5e+02;  post-norm std 1.00, grad 4.7e-04

# (c) 16 tokens 33.6 ms;  64 tokens 125.7 ms;  256 tokens 592.7 ms  (136 / 2,080 / 32,896 position-steps)

# (d) date translation, transformer (242k params): lr 1e-3: 0.000, 0.236, 0.804, 0.908, 0.920, 0.920 at epochs 1, 4, 8, 12, 16, 20;  lr 3e-4: 0.000 … 0.332
#     sentiment: ANN 0.930 (negated 0.936), RNN 1.000, LSTM 1.000, transformer 1.000`,
        notes: [
          { t: "p", text: "(a) makes the three position schemes concrete; RoPE's invariance is the one to remember." },
          { t: "p", text: "(b) is the pre-norm argument as a measurement, and the parameter count that says where a transformer's capacity lives." },
          { t: "p", text: "(c) is why every serving system has a KV cache; (d) is the honest small-data comparison with module 4." }
        ]
      }
    }
  ],

  takeaways: [
    "Position enters by addition (sinusoidal: fixed clocks at geometric frequencies, relative offsets are rotations; learned tables), by rotation inside the dot product (RoPE: the score for (5, 2) equals that for (105, 102)), or as a distance penalty (ALiBi).",
    "The block: pre-norm → attention → residual → pre-norm → FFN → residual; parameters 4d² + 8d² + norms, the FFN two thirds. At 24 blocks pre-norm's input gradient was 646 and post-norm's 5 × 10⁻⁴ — pre-norm keeps the identity path clean and is the modern default.",
    "The encoder uses unmasked self-attention; the decoder uses causal self-attention then cross-attention to the encoder; training is parallel over the target via the causal mask, and the output projects every position to the vocabulary.",
    "Decoding is sequential and, without a KV cache, quadratic: 256 tokens cost 32,896 position-steps and 593 ms through one layer where a cache needs 256. The cache stores every layer's keys and values for the prefix.",
    "On 10,000 date pairs the attention-GRU reached 0.999 in 6 epochs; the transformer reached 0.92 in 20 at lr 1e-3 (0.33 at 3e-4) — recurrence's inductive bias wins small; the transformer's parallelism and reach win at scale. On the sentiment corpus all sequence models tie at 1.000; an ANN with a hidden layer reaches 0.93.",
    "Modern decoders differ from the 2017 block in five places: RoPE, pre-norm RMSNorm, gated FFN (SwiGLU), GQA with Flash Attention, no biases or dropout."
  ],

  quiz: {
    title: "The Transformer Block — Knowledge Check",
    questions: [
      {
        stem: "Why are the token embeddings multiplied by √d before positional encodings are added?",
        options: [
          "To normalise the vocabulary size",
          "Because the embedding table's entries are initialised small (variance ~1/d) while the sinusoidal encodings have entries in [−1, 1]; scaling the embeddings by √d puts the two on the same magnitude so the position does not swamp the token content",
          "To compensate for the attention's √d_k",
          "It is required by LayerNorm"
        ],
        answer: 1,
        why: "A detail from the original paper that matters when positions are added rather than rotated in: the sum must keep both signals legible. Models with learned positions and tied embeddings keep the convention for the same reason."
      },
      {
        stem: "What does the feed-forward network in a transformer block do, and why is it two thirds of the parameters?",
        options: [
          "It mixes information between positions",
          "It applies the same two-layer MLP (d → 4d → d) to every position independently — the per-token computation that attention's mixing feeds — and its 8d² parameters against attention's 4d² make it the larger part; interpretability work finds it stores much of a model's factual knowledge, and MoE (5.3) scales it",
          "It replaces the residual connection",
          "It computes the positional encodings"
        ],
        answer: 1,
        why: "Attention moves information; the FFN transforms it. The 4× expansion was empirical and has been refined to gated variants; the 2:1 ratio to attention is why the FFN is the lever for adding capacity."
      },
      {
        stem: "How does the causal mask make decoder training parallel?",
        options: [
          "It splits the batch across devices",
          "With the mask, position t's attention sees only positions ≤ t, so feeding the whole target sequence in one pass gives every position a prediction of its next token that depended only on its past — the same computation as decoding step by step, done for all steps at once",
          "It removes the need for a decoder",
          "It caches the keys and values"
        ],
        answer: 1,
        why: "Teacher forcing in 4.6 walked the decoder one step at a time; the mask lets the transformer do all T steps as one matrix operation. Inference remains sequential, which is where the KV cache comes in."
      },
      {
        stem: "Why is pre-norm preferred for deep transformers, and what is its one drawback?",
        options: [
          "It is faster; it uses more memory",
          "It keeps the residual path free of normalisation so gradients reach early layers (646 vs 5 × 10⁻⁴ at 24 blocks) and it trains without the warm-up post-norm needs; the drawback is a residual stream whose scale grows with depth, handled by a final LayerNorm and occasionally by scaled residuals",
          "It removes the need for LayerNorm entirely",
          "It has no drawback"
        ],
        answer: 1,
        why: "The measured output std of 1.89 at 24 blocks is the growth; in very deep models it motivates variants like DeepNorm. Post-norm's better-conditioned output scale was not worth its gradient problem."
      },
      {
        stem: "Which positional scheme would you choose for a model that must handle sequences longer than any seen in training?",
        options: [
          "Learned absolute embeddings",
          "RoPE or ALiBi: RoPE makes scores depend on relative offset by construction and, with frequency scaling tricks, extends past the training length; ALiBi's linear distance penalty extrapolates directly with no position vectors; learned absolute embeddings have no entries for unseen positions and sinusoidal ones degrade",
          "Sinusoidal, because it is fixed",
          "No positional encoding"
        ],
        answer: 1,
        why: "Extrapolation was the stated motivation for ALiBi and a main reason for RoPE's adoption; the executed offset-invariance is the property that makes it possible."
      }
    ]
  },

  interview: {
    title: "Interview Questions — The Transformer Block",
    sub: "Positions, the block and its norms, encoder against decoder, the cache, and the comparison with recurrence.",
    questions: [
      {
        level: "Core",
        q: "Describe the transformer block and explain each component's purpose.",
        strong: "A block has two sub-layers with a residual connection and a normalisation around each. The first is multi-head self-attention (5.1), which moves information between positions: 4d² parameters. The second is a position-wise feed-forward network, Linear(d, 4d) → GELU → Linear(4d, d), the same MLP applied to every token independently, which transforms what attention gathered — 8d² parameters, two thirds of the block, and where much of a model's stored knowledge lives. The residual connections around each let the block be an identity and carry gradients through depth, the ResNet argument applied twice. LayerNorm (per token, no batch statistics) stabilises the scale; where it goes matters: post-norm, after each addition, attenuates the gradient at depth — 5 × 10⁻⁴ at the input of 24 blocks in my measurement — and needs warm-up; pre-norm, before each sub-layer, leaves the identity path clean (gradient 646) and is the modern default. Position must be added because attention is a set operation: sinusoidal or learned vectors summed to the embeddings, or RoPE rotating queries and keys so the score depends only on the offset. Stack N blocks, add an embedding and a head, and that is the architecture; encoder and decoder differ only in the mask and in the decoder's extra cross-attention.",
        answer: [
          { t: "p", text: "Both sub-layers with parameter counts, residuals, the norm placement with measured gradients, positions, and how the stack becomes a model." }
        ]
      },
      {
        level: "Core",
        q: "What is the KV cache and why does generation need it?",
        strong: "A decoder generates one token at a time, and each new token attends to every previous one at every layer. The keys and values of the previous tokens do not change when a token is appended — they depend only on those tokens and the weights — so recomputing them is waste. Without a cache, generating T tokens re-runs the decoder on prefixes of length 1, 2, …, T: I timed one layer at 34 ms for 16 tokens, 126 ms for 64 and 593 ms for 256 — work proportional to T(T+1)/2, 32,896 position-steps for 256 tokens against the 256 that are necessary. The KV cache stores each layer's keys and values for the prefix; each step then processes the single new token, computes its query, key and value, appends the key and value, and attends over the cache. Decoding becomes linear in T, and the cache — 2 · layers · heads · d_head · T entries per sequence — becomes the memory that limits how many sequences can be served at once, which is why multi-query and grouped-query attention exist (5.3).",
        answer: [
          { t: "p", text: "Why keys and values are reusable, the executed quadratic timings, what the cache stores, and its consequence for serving." }
        ]
      },
      {
        level: "Advanced",
        q: "You trained a small transformer and a recurrent model on the same 10,000 examples and the recurrent model won. Explain, and say when the transformer wins.",
        strong: "On the date-translation task an attention-augmented GRU with 84k parameters reached 99.9 % exact match in six epochs; a 2-layer transformer encoder–decoder with 242k parameters reached 31 % in six epochs and 92 % in twenty at the best learning rate — and 33 % at a slightly lower one. The transformer has no built-in notion of order or locality: attention treats its input as a set, positions are added as vectors, and the model must learn from data that the year follows the month and that adjacent characters relate. The recurrence and the monotonic attention of the GRU model encode those priors structurally, which on a small, monotonic-alignment task is worth a great deal. The transformer's strengths are elsewhere: training is parallel over the sequence rather than sequential, so it scales to corpora and models the recurrent model cannot train on; attention reaches any distance in one step, so long dependencies cost nothing (the recurrent gradient through fifty steps was 10⁻¹⁵ in 4.2); and the weak prior stops constraining once the data can teach the regularities. The same trade appeared with a ViT against a CNN on 20,000 images (5.3): the prior wins small, the data wins large. In practice: use the transformer whenever pretraining is available or the data are large; use a recurrent or convolutional model for small data, streaming, and on-device constraints.",
        answer: [
          { t: "p", text: "The executed comparison, the inductive-bias explanation, the transformer's three advantages with the course's numbers, and the practical rule." }
        ]
      }
    ]
  }
});

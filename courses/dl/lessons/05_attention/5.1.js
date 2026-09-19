/* ============================================================================
   LESSON 5.1 — Self-Attention from Scratch
   ========================================================================= */
EC.receiveLesson({
  id: "5.1",

  lede: "**Self-attention is a weighted average of value vectors where the weights come from how well each query matches each key — three matrix products and a softmax, and the whole transformer is built from it.** On four tokens with d = 4 every number is worked by hand and matched to torch. The √d in the denominator is not a convention: the variance of a dot product of unit-variance vectors is d, and without the scale a 32-way softmax puts 0.97 of its mass on one key at d = 512 and 0.13 with it. Multi-head attention is implemented from the raw projection matrices and matches nn.MultiheadAttention to the last bit; masks are built for causality and padding; and the cost is measured — an 8,192-token sequence needs a 268 MB attention matrix and 950 ms on this CPU, growing as n².",

  objectives: [
    "Compute queries, keys, values, scaled scores, softmax weights and the output by hand and check them against torch",
    "Derive why the scores are divided by √d_k from the variance of a dot product, and show the saturation it prevents",
    "Implement multi-head attention from the projection matrices and reproduce nn.MultiheadAttention exactly",
    "Build causal and padding masks and explain the all-masked-row NaN",
    "State cross-attention's shapes, measure the O(n²) cost, and show permutation equivariance"
  ],

  prerequisites: ["4.6", "2.2"],

  blocks: [

    { t: "h2", n: "01", text: "Attention on four tokens", id: "numbers" },

    { t: "code", lang: "text", title: "Q, K, V, scores, weights, output (executed)",
      code: `X (4 tokens × d 4)          Q = X Wq                 K = X Wk
1 0 1 0                     0.5 0   0.5 0            0.5 0   0.5 0
0 2 0 2                     0   1   0   1            0   1   0   1
1 1 1 1                     0.5 0.5 0.5 0.5          0.5 0.5 0.5 0.5
0 0 1 1                     0   0   0.5 0.5          0.5 0   0   0.5          V = X (Wv = I)

scores = Q Kᵀ / √4            attention = softmax(scores, rows)     output = attention · V
0.25  0     0.25  0.125       0.273 0.213 0.273 0.241              0.546 0.699 0.787 0.940
0     1     0.5   0.25        0.150 0.409 0.248 0.193              0.398 1.065 0.591 1.258
0.25  0.5   0.5   0.25        0.219 0.281 0.281 0.219              0.500 0.843 0.719 1.062
0.125 0.25  0.25  0.125       0.234 0.266 0.266 0.234              0.500 0.797 0.734 1.031
rows of the attention matrix sum to 1
token 0's output = 0.27·v₀ + 0.21·v₁ + 0.27·v₂ + 0.24·v₃          F.scaled_dot_product_attention agrees: True`,
      caption: "Each token asks a question (its query), every token offers a label (its key) and a payload (its value); the answer is the payloads averaged by how well the labels match the question. Token 1's query matches its own key best (score 1.0) and it takes 41 % of its output from its own value. Nothing here is recurrent: every row is computed at once, from the whole sequence." },

    { t: "dl", items: [
      ["Query, key, value", "Three linear projections of the same input (self-attention) or of two inputs (cross-attention). Wq, Wk, Wv are the learned parameters; the attention weights themselves are computed, not learned."],
      ["Scores and weights", "score_ij = q_i·k_j / √d_k; weights are a softmax over j for each i, so every row is a distribution over the sequence."],
      ["Output", "out_i = Σ_j weight_ij · v_j: a convex combination of values. The output dimension is the value dimension."],
      ["What it can express", "Any token can attend to any other in one step — a dependency of length 500 costs no more than one of length 1. This is the property RNNs lacked (4.2) and the reason for the transformer."]
    ] },

    { t: "h2", n: "02", text: "Why √d_k", id: "scale" },

    { t: "code", lang: "text", title: "The variance of a dot product, and what the softmax does with it (executed, 10,000 samples)",
      code: `for q, k with unit-variance components:  var(q·k) = d
  d = 4     var(q·k) =   4.0     var(q·k / √d) = 0.99
  d = 64    var(q·k) =  64.1     var(q·k / √d) = 1.00
  d = 512   var(q·k) = 503.9     var(q·k / √d) = 0.98

softmax over 32 random scores, largest weight:
  d = 4     unscaled 0.907   scaled 0.196
  d = 64    unscaled 0.904   scaled 0.153
  d = 512   unscaled 0.966   scaled 0.134`,
      caption: "A dot product sums d terms of unit variance, so its variance is d and its standard deviation √d. Unscaled scores at d = 512 have standard deviation 22, and a softmax over numbers that spread is a one-hot: 97 % on one key, gradient nearly zero everywhere (1.2's saturation). Dividing by √d_k makes the scores unit-variance whatever the head size, so the softmax stays soft and trainable." },

    { t: "h2", n: "03", text: "Multi-head attention, from the matrices", id: "mha" },

    { t: "code", lang: "python", title: "Multi-head attention by hand, matched to nn.MultiheadAttention (executed)",
      code: `def mha_hand(x, mask=None):                              # x: (B, T, d_model);  h heads of size dh = d_model / h
    Q = (x @ Wq.T).view(B, T, h, dh).transpose(1, 2)     # (B, h, T, dh): every head gets its own slice of the projection
    K = (x @ Wk.T).view(B, T, h, dh).transpose(1, 2)
    V = (x @ Wv.T).view(B, T, h, dh).transpose(1, 2)
    s = Q @ K.transpose(-1, -2) / math.sqrt(dh)          # (B, h, T, T)
    if mask is not None: s = s.masked_fill(mask, float("-inf"))
    A = F.softmax(s, -1)
    o = (A @ V).transpose(1, 2).reshape(B, T, d_model)   # concatenate the heads
    return o @ Wo.T, A                                   # output projection

d_model 16, 4 heads of 4:  by hand vs nn.MultiheadAttention  max |diff| 0.0e+00;  attention maps agree
parameters: in_proj 768 (3·d²) + out_proj 256 (d²) = 1,024 = 4·d_model²  -- independent of the number of heads

head 0, sequence 0 (rows = queries, columns = keys):
0.10 0.15 0.15 0.35 0.15 0.10
0.12 0.12 0.15 0.40 0.12 0.08
0.07 0.23 0.14 0.22 0.18 0.17
0.40 0.07 0.12 0.06 0.15 0.18
…`,
      caption: "Heads do not add parameters: the d_model-wide projection is split into h slices, each attends independently with its own dh-dimensional queries and keys, and the outputs are concatenated and projected. Different heads learn different relations — one attends to the previous token, one to matching brackets, one to the subject of the verb. Eight heads of 64 is the original setting (d_model 512)." },

    { t: "h2", n: "04", text: "Masks", id: "masks" },

    { t: "code", lang: "text", title: "Causal and padding masks (executed)",
      code: `causal mask: −inf above the diagonal, so row t attends only to positions ≤ t
1.00 0    0    0    0    0
0.49 0.51 0    0    0    0
0.16 0.52 0.31 0    0    0
0.61 0.11 0.19 0.10 0    0
0.19 0.18 0.17 0.23 0.24 0
0.13 0.22 0.21 0.23 0.12 0.10          strictly upper triangle all zero: True

padding mask: sequence 1 has length 3 of 6 -> attention to keys 3, 4, 5 is exactly 0: True;  torch's key_padding_mask agrees: True
an all-masked row (a padded query with no valid keys) is NaN in the softmax -- mask the queries too, or fill with 0`,
      caption: "−inf before the softmax is exp(−inf) = 0 after it, so masked keys receive no weight and the remaining weights renormalise. The causal mask is what makes a decoder autoregressive — training on the whole target in parallel while each position sees only its past. The padding mask keeps padded keys from stealing attention mass; masked *queries* still produce outputs, which must be ignored downstream." },

    { t: "code", lang: "text", title: "Cross-attention and the cost (executed)",
      code: `cross-attention: queries from the decoder (T_q = 5), keys and values from the encoder (T_k = 9):
  output (B, 5, 16), attention (B, heads, 5, 9)  -- the attention matrix is rectangular; each decoder position reads the whole source

one attention layer, d 64, one head, batch 1, this CPU:
  n =   128   matrix 128 × 128        0.1 MB       1.5 ms
  n =   512   matrix 512 × 512        1.0 MB       3.2 ms
  n = 2,048   matrix 2048 × 2048     16.8 MB      33.0 ms
  n = 8,192   matrix 8192 × 8192    268.4 MB     951.5 ms        (the projections are ~100 MFLOP, negligible)

permute the tokens: the outputs permute identically (max |diff| 5 × 10⁻⁸) -- attention has no notion of order`,
      caption: "Time and memory grow with n², which is the transformer's limit on context length and the motivation for Flash Attention, sparse patterns and state-space models (5.3). The permutation result is the other structural fact: attention treats its input as a set. Order is supplied by positional encodings, which is where the next lesson starts." },

    { t: "dl", items: [
      ["Self-attention", "Q, K, V all from the same sequence. The encoder's layers and a decoder's first sub-layer."],
      ["Cross-attention", "Q from one sequence (the decoder), K and V from another (the encoder output). The decoder's second sub-layer; also image-to-text and any conditioning."],
      ["Masked self-attention", "Self-attention with the causal mask. The decoder's first sub-layer and the whole of a GPT-style model."],
      ["Attention as soft dictionary lookup", "Keys index, values are retrieved, the query is the lookup, and the softmax makes the lookup differentiable. Bahdanau's 2015 attention (4.6) was the same idea with an RNN state as the query."]
    ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why are attention scores divided by √d_k?",
          options: [
            "To keep the scores positive",
            "Because a dot product of two unit-variance d-dimensional vectors has variance d (measured 503.9 at d = 512); without the scale the softmax over such scores is nearly one-hot (0.97 on one key) and saturates, and dividing by √d_k restores unit variance (0.98) and a soft, trainable distribution (0.13)",
            "To normalise for the number of heads",
            "Because the values have dimension d_k"
          ],
          answer: 1,
          why: "The scale is the σ of the scores. It is d_k (the key dimension per head), not d_model, because each head's dot product sums d_k terms. The same saturation argument applies to any softmax over large-magnitude logits (1.2)."
        },
        {
          stem: "Multi-head attention with 4 heads had exactly the same parameter count as with 1 head. Why, and what do the heads buy?",
          options: [
            "Heads share their weights",
            "The projections are d_model × d_model whatever h is; the heads are slices of the projected vectors that attend independently, so the parameter count is 4·d_model² regardless — what heads buy is several different attention patterns per layer at the same cost, each with lower-dimensional queries and keys",
            "The out-projection is removed for multi-head",
            "It is a coincidence of d_model = 16"
          ],
          answer: 1,
          why: "Splitting the projection into h parts and running h softmaxes costs nothing extra in weights and little in compute; it costs each head resolution (d_model/h dimensions). The measured identity with torch confirms the arithmetic."
        },
        {
          stem: "What happens if a padded query position has every key masked, and how is it handled?",
          options: [
            "It attends uniformly",
            "The softmax over a row of −inf is 0/0 = NaN, which propagates through the network; the fix is to also ignore padded query positions (mask them or overwrite their outputs), or to leave one key unmasked for padded rows",
            "PyTorch skips the row",
            "It attends to itself"
          ],
          answer: 1,
          why: "The padding mask is applied to keys, but a padded query row has no unmasked keys if the mask is symmetric. The NaN is silent until the loss is computed; the lesson's masking used only keys and noted the guard."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Attention by hand, heads matched to torch, masks, and the cost curve",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** With the four-token X and the given Wq, Wk (Wv = I), compute Q, K, the scaled scores, the softmax weights and the output by hand and confirm with F.scaled_dot_product_attention." },
        { t: "p", text: "**(b)** Sample 10,000 pairs of unit-variance vectors at d = 4, 64, 512 and report var(q·k) and var(q·k/√d); report the largest softmax weight over 32 random scores with and without scaling." },
        { t: "p", text: "**(c)** Implement multi-head attention from nn.MultiheadAttention's in_proj_weight and out_proj.weight and match its output and attention maps; add a causal mask and a key-padding mask and verify their effects." },
        { t: "p", text: "**(d)** Time a single attention layer (d = 64) at n = 128, 512, 2048, 8192 and compute the attention matrix's memory at each size." }
      ],
      requirements: [
        "(a) the four matrices and the agreement check.",
        "(b) six variances and six maximum weights.",
        "(c) a maximum difference and two mask checks.",
        "(d) four (memory, time) pairs."
      ],
      hint: "(c) in_proj_weight stacks Wq, Wk, Wv along dim 0; reshape to (B, T, h, dh) and transpose to (B, h, T, dh) before the batched matmul. The key-padding mask broadcasts over heads and query positions.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) scores row 1 = [0, 1, 0.5, 0.25] -> weights [0.150, 0.409, 0.248, 0.193] -> output [0.398, 1.065, 0.591, 1.258];  torch agrees: True

# (b) var(q·k): 4.0 / 64.1 / 503.9 at d = 4 / 64 / 512;  scaled: 0.99 / 1.00 / 0.98
#     max softmax weight over 32 scores: unscaled 0.907 / 0.904 / 0.966;  scaled 0.196 / 0.153 / 0.134

# (c) by hand vs nn.MultiheadAttention: max |diff| 0.0;  attention maps agree
#     causal: strictly upper triangle zero True;  padding: weight on padded keys 0 True, matches key_padding_mask True

# (d) n=128: 0.1 MB, 1.5 ms;  512: 1.0 MB, 3.2 ms;  2048: 16.8 MB, 33 ms;  8192: 268 MB, 952 ms`,
        notes: [
          { t: "p", text: "(a) is the mechanism on numbers small enough to check; every transformer forward pass is this, batched." },
          { t: "p", text: "(b) turns the √d_k from a convention into a measurement." },
          { t: "p", text: "(c) is the implementation you will recognise inside every library; (d) is the reason context length is the transformer's budget." }
        ]
      }
    }
  ],

  takeaways: [
    "Attention: Q = XWq, K = XWk, V = XWv; weights = softmax(QKᵀ/√d_k) row-wise; output = weights·V — a convex combination of values with weights from query–key similarity. Token 1 took 41 % of its output from its own value in the worked example; torch agrees exactly.",
    "The √d_k scale makes the scores unit-variance: var(q·k) = d (503.9 measured at 512), and an unscaled 32-way softmax puts 0.97 on one key where the scaled one puts 0.13. Without it the softmax saturates.",
    "Multi-head attention slices the d_model projections into h heads that attend independently and concatenates them; the parameter count is 4·d_model² whatever h; the by-hand version matched nn.MultiheadAttention to 0.0.",
    "Masks are −inf before the softmax: the causal mask makes a decoder autoregressive (strictly upper triangle zero), the key-padding mask zeroes attention to padding, and an all-masked row is NaN.",
    "Cross-attention takes queries from one sequence and keys/values from another ((B, heads, 5, 9) for a 5-token decoder over a 9-token encoder); attention is permutation-equivariant, so order comes only from positional encodings.",
    "Cost is n²: 268 MB and 952 ms for one 8,192-token layer on this CPU against 1 MB and 3 ms at 512 — the constraint behind Flash Attention, sparse attention and state-space models."
  ],

  quiz: {
    title: "Self-Attention from Scratch — Knowledge Check",
    questions: [
      {
        stem: "What is self-attention, in one sentence with the mechanism?",
        options: [
          "A recurrent update of a hidden state",
          "Each position projects its input to a query, key and value; its output is the softmax-weighted average of all positions' values, with weights given by the scaled dot product of its query with every key — so any token can read any other in one step",
          "A convolution over the sequence with a learned kernel",
          "A lookup in a fixed embedding table"
        ],
        answer: 1,
        why: "Three projections, one softmax, one weighted sum. The worked example is the mechanism on numbers, and the permutation test shows it treats its input as a set."
      },
      {
        stem: "What distinguishes the encoder's attention from the decoder's in an encoder–decoder transformer?",
        options: [
          "The encoder has more heads",
          "The encoder uses unmasked self-attention over the source; the decoder uses causal (masked) self-attention over the target so each position sees only its past, plus cross-attention whose queries come from the decoder and whose keys and values come from the encoder output",
          "The decoder has no attention",
          "The encoder uses cross-attention to the target"
        ],
        answer: 1,
        why: "Three uses of one operation, distinguished by where Q, K, V come from and which mask is applied. GPT-style models keep only the masked self-attention; BERT-style models keep only the unmasked encoder."
      },
      {
        stem: "Why is attention's cost quadratic in sequence length, and which part of the layer is responsible?",
        options: [
          "The linear projections, which are applied to every token",
          "The n × n score matrix: every query is compared with every key and the softmax and value-averaging touch every entry — 67 M entries and 268 MB at n = 8,192 — while the projections are linear in n and were about 100 MFLOP at that length",
          "The softmax normalisation",
          "The positional encodings"
        ],
        answer: 1,
        why: "The measured times grew ~30× from 2,048 to 8,192 tokens (33 ms to 952 ms), faster than the 16× the matrix size predicts because of memory traffic. Flash Attention avoids materialising the matrix; sparse and linear attention change what is computed."
      },
      {
        stem: "How does a key-padding mask differ from a causal mask?",
        options: [
          "They are the same mask applied at different layers",
          "A causal mask is a fixed T × T pattern hiding future positions from every query; a key-padding mask is per-sequence, hiding the padded key positions of that sequence from all queries — both are −inf before the softmax and are typically combined",
          "The padding mask hides queries, the causal mask hides keys",
          "Only the causal mask uses −inf"
        ],
        answer: 1,
        why: "Causal depends on position only; padding depends on the batch's lengths. In the executed run the padded keys of the length-3 sequence received exactly zero weight, and the two masks are added together in a decoder over padded batches."
      },
      {
        stem: "Attention gave the same output, permuted, when the tokens were permuted. Why does this matter?",
        options: [
          "It means attention cannot process sequences",
          "It shows attention has no built-in notion of order — it computes over a set — so any use of word order must come from positional information added to the inputs (sinusoidal, learned, RoPE, ALiBi), which is why positional encodings are part of every transformer",
          "It is a numerical artefact",
          "It means attention is translation-equivariant like convolution"
        ],
        answer: 1,
        why: "Convolution and recurrence encode order structurally; attention does not. The property is also a strength — sets, graphs (module 9) and unordered features can use attention directly."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Self-Attention",
    sub: "The mechanism on numbers, the √d_k derivation, heads, masks, cross-attention, and the cost.",
    questions: [
      {
        level: "Core",
        q: "Explain scaled dot-product attention and work a small example.",
        strong: "Each token's input vector is projected three ways: a query — what it is looking for — a key — what it offers to be matched on — and a value — what it contributes. The score between token i and token j is q_i·k_j divided by √d_k; a softmax over j turns each query's scores into a distribution over the sequence; and the output for token i is the values averaged by those weights. On four tokens with d = 4, using Wq and Wk that are scaled permutations and Wv = I, the second token's scores were [0, 1, 0.5, 0.25], its weights [0.150, 0.409, 0.248, 0.193], and its output the values combined with those weights — [0.398, 1.065, 0.591, 1.258], matching F.scaled_dot_product_attention. Two properties define it: any token can read any other in a single step, which is the long-range dependency an RNN carried through a chain of states, and the computation is a set operation — permute the tokens and the outputs permute identically — so order must be added through positional encodings.",
        answer: [
          { t: "p", text: "The three projections and the softmax-weighted average, the executed numbers, and the two structural properties." }
        ]
      },
      {
        level: "Core",
        q: "Why divide by √d_k?",
        strong: "Because the softmax's input scale sets its sharpness, and the dot product's scale grows with dimension. If q and k have unit-variance components, q·k is a sum of d products each of variance 1, so its variance is d and its standard deviation √d — I measured var(q·k) = 503.9 at d = 512. Scores with standard deviation 22 fed to a softmax give a near one-hot: over 32 random scores the largest weight was 0.97, and a saturated softmax has near-zero gradients everywhere, so the attention pattern cannot be learned. Dividing by √d_k returns the scores to unit variance (0.98 measured) and the largest weight to 0.13, a soft distribution with gradient to every key. It is d_k per head, not d_model, because each head's dot product sums d_k terms.",
        answer: [
          { t: "p", text: "The variance derivation, the executed variances and softmax maxima, and the gradient consequence." }
        ]
      },
      {
        level: "Core",
        q: "What is multi-head attention and why use multiple heads?",
        strong: "Split the d_model-dimensional queries, keys and values into h slices of d_model/h, run scaled dot-product attention independently on each slice, concatenate the h outputs and apply an output projection. I implemented it from nn.MultiheadAttention's raw in_proj and out_proj weights and matched torch's output and attention maps exactly. The parameter count is 4·d_model² — three input projections and one output — regardless of h, so heads are free in weights; what they buy is several attention patterns per layer, each in a lower-dimensional space: one head can attend to the previous token, another to a syntactic dependency, another to a coreferent, and the concatenation lets the layer use all of them. The cost is resolution per head — d_model/h dimensions for each query–key comparison — which is why very small heads underperform and why 64 dimensions per head has been the standard from the original paper to today's large models.",
        answer: [
          { t: "p", text: "The split-attend-concatenate mechanism, the executed match, the free parameter count, and what heads buy and cost." }
        ]
      },
      {
        level: "Advanced",
        q: "How do masks work in attention, and what are the two kinds?",
        strong: "A mask sets selected scores to −inf before the softmax, which makes their weight exactly zero and renormalises the rest. The causal mask is a fixed upper-triangular pattern: position t may attend to positions ≤ t only, which is what lets a decoder be trained on a whole target sequence in parallel while each output depends only on earlier tokens — I verified the strictly upper triangle of the attention map is zero. The key-padding mask is per sequence: keys at padded positions are hidden from every query so that padding cannot absorb attention mass; the padded keys of a length-3 sequence received exactly zero weight, matching torch's key_padding_mask. The two are combined in a decoder over a padded batch. One trap: a padded query row with all its keys masked is a softmax over −inf only — NaN — so padded query positions must be masked or ignored downstream. Cross-attention masks the encoder's padding from the decoder's queries the same way.",
        answer: [
          { t: "p", text: "The −inf mechanism, the causal and padding masks with the executed checks, their combination, and the NaN trap." }
        ]
      }
    ]
  }
});

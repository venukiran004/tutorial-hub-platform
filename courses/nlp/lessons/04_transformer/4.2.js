/* ============================================================================
   LESSON 4.2 — Input Embeddings and Positional Encoding
   Mirrors 02_Transformers_InDepth.md · §3. The sinusoidal construction is
   built and probed — constant norm, unique per position, and the rotation
   property verified. The reference's sqrt(d_model) rationale does not hold
   as stated (§06). Deep dive in 4.9 (scratchpad/nlp/n42b.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "**`PE[pos + 7]` is the same rotation of `PE[pos]` at position 0, 10 and 50 — to four decimal places.** That is not a coincidence of the numbers; it is the entire reason the sinusoidal construction was chosen. Because shifting by a fixed offset is a fixed rotation regardless of where you start, a model can learn \"attend seven tokens back\" as one operation rather than memorising it separately at every position. This lesson builds the encoding, verifies that property, and checks the reference's justification for the `sqrt(d_model)` scaling — which turns out not to say what it means to say.",

  objectives: [
    "Construct sinusoidal positional encoding and read its frequency structure",
    "Verify that every position gets a unique vector and that similarity decays with distance",
    "Demonstrate the relative-position rotation property",
    "Contrast sinusoidal with learned positional embeddings",
    "Check the sqrt(d_model) scaling rationale against measured magnitudes"
  ],

  prerequisites: ["4.1", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "Why position must be added at all", id: "why" },

    { t: "math", tex: "\\text{Input} = \\text{TokenEmbedding}(x) + \\text{PositionalEncoding}(pos)" },

    { t: "p", text: "Lesson 4.3 shows that attention is permutation-equivariant — shuffle the input rows and the output rows shuffle identically. The mechanism genuinely cannot distinguish *the cat sat* from *sat cat the*. Since order carries most of the meaning in language, positional information has to enter somewhere, and the transformer puts it in the input by **addition**." },

    { t: "callout", kind: "insight", title: "Addition, not concatenation",
      body: [{ t: "p", text: "Concatenating a position vector would be the obvious choice and it is not what happens: position is summed into the same `d_model` dimensions the token content occupies. That seems destructive — the two signals now share every coordinate — but it works because `d_model` is large and the network can learn projections that read them apart. The practical payoff is that no dimensions are spent on position, so the whole width stays available for content, and the block's shapes are unchanged." }] },

    { t: "h2", n: "02", text: "The construction", id: "construction" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n42b.py — sinusoidal positional encoding", code:
"def sinusoidal(max_len, d_model):\n    pe = torch.zeros(max_len, d_model)\n    position = torch.arange(0, max_len).unsqueeze(1).float()\n    div_term = torch.exp(torch.arange(0, d_model, 2).float() *\n                         -(math.log(10000.0) / d_model))\n    pe[:, 0::2] = torch.sin(position * div_term)   # even dimensions\n    pe[:, 1::2] = torch.cos(position * div_term)   # odd dimensions\n    return pe",
      caption: "`div_term` is computed in log space then exponentiated, which is numerically safer than raising 10000 to a negative power directly." },

    { t: "math", tex: "PE_{(pos,\\,2i)} = \\sin\\!\\left(\\frac{pos}{10000^{2i/d}}\\right), \\qquad PE_{(pos,\\,2i+1)} = \\cos\\!\\left(\\frac{pos}{10000^{2i/d}}\\right)" },

    { t: "out", text:
"shape (200, 512)   every value in [-1.0000, 1.0000]\n\nposition 0, first 8 dims: [0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0]\nposition 1, first 8 dims: [0.8415, 0.5403, 0.8219, 0.5697, 0.8020, 0.5974, 0.7819, 0.6234]" },

    { t: "p", text: "Each **pair** of dimensions `(2i, 2i+1)` holds the sine and cosine of the same frequency. At position 0 every sine is 0 and every cosine is 1, which is why the first row alternates. The pairing is what makes the rotation property in section 04 possible." },

    { t: "h2", n: "03", text: "A geometric range of wavelengths", id: "wavelengths" },

    { t: "out", text:
"dim pair    frequency      wavelength (positions)\n0           1.000e+00               6.28\n1           9.647e-01               6.51\n32          3.162e-01              19.87\n64          1.000e-01              62.83\n128         1.000e-02             628.32\n255         1.037e-04           60611.48" },

    { t: "callout", kind: "mental", title: "A binary clock in continuous form",
      body: [{ t: "p", text: "Wavelengths run geometrically from `2π` to `10000 · 2π`. The low dimensions oscillate every few positions and encode *fine* position; the high dimensions barely move across thousands of positions and encode *coarse* position. It is the same idea as a binary representation of an integer, where the low bit flips every step and the high bit flips once — except continuous and redundant, so that small changes in position produce small changes in the vector. The geometric spacing is what gives the encoding resolution at every scale simultaneously." }] },

    { t: "h2", n: "04", text: "Three properties worth verifying", id: "properties" },

    { t: "out", text:
"uniqueness\n  max off-diagonal cosine over 200 positions: 0.973055\n  no two positions collide\n\nnorm\n  |PE[10]| = 16.0000        |PE[4999]| = 16.0000\n  constant at sqrt(d_model / 2) for every position\n\nsimilarity decays with distance — cos(PE[0], PE[k])\n  k=1     0.9731\n  k=2     0.9052\n  k=5     0.7406\n  k=10    0.6789\n  k=20    0.6155\n  k=50    0.5121\n  k=100   0.4373\n  k=199   0.3374" },

    { t: "p", text: "Every position gets a distinct vector, all of them have the same magnitude — so no position is intrinsically louder than another — and the dot product between two position vectors decays smoothly with their separation. That last property is the useful one: it means attention scores can pick up distance information directly from the positional component." },

    { t: "h2", n: "05", text: "The rotation property", id: "rotation" },

    { t: "p", text: "The paper's stated motivation is that `PE[pos+k]` is a *linear function* of `PE[pos]` for any fixed offset `k`. Within one frequency pair that linear function is a plane rotation by `ω·k`. Checking it at three different starting positions with `k = 7`:" },

    { t: "out", text:
"one frequency pair, k = 7\n\n  pos 0   -> pos 7    actual (0.0006,  1.0000)   rotation predicts (0.0006,  1.0000)\n  pos 10  -> pos 17   actual (0.4325, -0.9016)   rotation predicts (0.4325, -0.9016)\n  pos 50  -> pos 57   actual (0.7850,  0.6195)   rotation predicts (0.7850,  0.6195)" },

    { t: "callout", kind: "insight", title: "The same rotation works everywhere",
      body: [{ t: "p", text: "One matrix — the rotation by `ω·k` — maps position `pos` to `pos+k` no matter what `pos` is. So a head that wants to implement \"attend seven tokens back\" needs to learn **one** transformation, not a separate rule for every absolute position. That is a genuine inductive bias toward relative position, built into the input rather than the architecture. It is also the seed of rotary positional embeddings (RoPE), which lesson 4.9 covers: RoPE applies exactly this rotation to the queries and keys inside every attention layer instead of adding a vector once at the input." }] },

    { t: "h2", n: "06", text: "The scaling factor", id: "scaling" },

    { t: "p", text: "The reference multiplies the token embedding by `sqrt(d_model)` before adding position, and justifies it by saying that otherwise the positional encoding would dominate the embeddings. That is measurable." },

    { t: "out", text:
"nn.Embedding default init, N(0,1): std 1.0008\n\n  token RMS   0.9963\n  PE RMS      0.7071\n  ratio       1.4089        <- embeddings already LARGER than PE\n\nafter multiplying by sqrt(512) = 22.6274\n\n  token RMS  22.5426\n  ratio      31.8800" },

    { t: "callout", kind: "warn", title: "The stated reason is backwards",
      body: [{ t: "p", text: "Unscaled, the token embedding is already **1.41x** the positional encoding in RMS — comparable to it, certainly not dominated by it. So \"PE would dominate\" does not hold at this initialisation. What the scaling actually does is the opposite of the framing: it pushes the ratio to **31.88x**, deliberately making position a *small perturbation* on a much larger content signal. That is a real design choice — in the original paper the embedding matrix is tied to the output projection, so its scale interacts with the softmax over the vocabulary — but the mechanism is \"make position quiet\", not \"rescue the embeddings\"." }] },

    { t: "h2", n: "07", text: "What real models do", id: "real" },

    { t: "out", text:
"                     token std   positional std   ratio\nbert-base-uncased      0.0427          0.0161       2.66\ngpt2                   0.1437          0.1227       1.17\n\nboth use LEARNED positional embeddings and no sqrt(d_model) scaling" },

    { t: "callout", kind: "note", title: "Neither of the two most-taught models does what the reference describes",
      body: [{ t: "p", text: "BERT and GPT-2 both replace the sinusoidal formula with a **learned** lookup table — one trainable vector per position, no different in kind from the token embedding table — and neither applies any scaling. They rely on the LayerNorm immediately after the sum to fix the scale instead. The learned vectors also come out *smaller* than the token vectors on their own, at ratios of 2.66 and 1.17, so the problem the scaling was meant to solve does not arise. Treat `sqrt(d_model)` as a detail of the original architecture, and check what your model actually does before reproducing it." }] },

    { t: "diagram", kind: "compare", title: "Sinusoidal against learned",
      columns: [
        { title: "Sinusoidal", tone: "teal", items: [
          "Fixed formula, zero parameters",
          "Defined for any position, no table limit",
          "Constant norm at every position",
          "Built-in relative-position rotation",
          "Original Transformer",
          "In principle extrapolates beyond training"
        ] },
        { title: "Learned table", tone: "accent", items: [
          "One trainable vector per position",
          "max_position_embeddings rows, hard limit",
          "Norms vary; the model decides",
          "No structure unless it learns one",
          "BERT, GPT-2, RoBERTa",
          "Cannot extrapolate at all - no row exists"
        ] }
      ] },

    { t: "callout", kind: "trap", title: "Sinusoidal extrapolation is a theoretical property, not a practical one",
      body: [{ t: "p", text: "The formula computes happily at position 4999 — `|PE[4999]| = 16.0000`, identical to `|PE[10]|` — where a learned table simply has no row 4999 and raises an index error. That is the standard argument for the sinusoidal form. But a model *trained* only on short sequences degrades badly when run on long ones regardless, because the attention patterns above it never saw those positional vectors and have no reason to handle them well. Well-defined input is not the same as useful behaviour. Lesson 4.9 covers what actually works for length extrapolation — ALiBi, RoPE with scaling, and position interpolation." }] },

    { t: "exercise", title: "Probe the encoding",
      tasks: [
        "Build the encoding and plot it as a heatmap of position against dimension. Identify the fast and slow dimensions visually.",
        "Verify the rotation property at five different positions for three different offsets.",
        "Confirm the norm is constant across positions, and derive why it equals sqrt(d_model / 2).",
        "Extract a real model's learned positional embeddings and compute the same similarity-versus-distance curve. Compare its shape with the sinusoidal one.",
        "Replace sinusoidal with learned embeddings in a small model, train both, and compare validation loss at the training length and beyond it."
      ] }
  ],

  takeaways: [
    "Attention is permutation-equivariant, so position must be injected into the input; the transformer adds it rather than concatenating.",
    "Each dimension pair (2i, 2i+1) holds sine and cosine of one frequency; wavelengths run geometrically from 6.28 to 60,611 positions.",
    "Low dimensions encode fine position, high dimensions coarse — a continuous, redundant analogue of a binary counter.",
    "Every position is unique (max off-diagonal cosine 0.973055) and every position vector has the same norm, 16.0000 at d_model 512.",
    "Cosine similarity decays smoothly with distance, 0.9731 at k=1 down to 0.3374 at k=199, so attention can read distance from position alone.",
    "PE[pos+k] is the same rotation of PE[pos] at every pos — verified at positions 0, 10 and 50 — which is the inductive bias toward relative position and the seed of RoPE.",
    "The reference's sqrt(d_model) rationale is backwards: unscaled, embeddings are 1.41x the PE, and scaling pushes that to 31.88x, making position quiet.",
    "BERT and GPT-2 both use learned positional tables with no scaling, at token-to-position ratios of 2.66 and 1.17.",
    "Sinusoidal encoding is defined at any position, but a model trained short still degrades when run long — well-defined input is not useful behaviour."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why is positional information added to the token embedding rather than concatenated?",
      options: ["Addition is faster", "So no dimensions are spent on position — the full width stays available for content and block shapes are unchanged", "Concatenation would break the softmax", "Because position has the same units as content"],
      answer: 1,
      why: "Concatenation would reserve part of d_model for position permanently. Summing into the same coordinates seems destructive, but d_model is large enough that the network learns projections reading the two signals apart, and the architecture's shapes stay uniform throughout the stack." },
    { stem: "What property makes the sinusoidal form useful for relative position?",
      options: ["Its values are bounded in [-1, 1]", "PE[pos+k] is the same fixed rotation of PE[pos] regardless of pos, so 'k tokens back' is one learnable transformation", "Every position has a unique vector", "It requires no parameters"],
      answer: 1,
      why: "Verified at positions 0, 10 and 50 with k=7: the rotation by omega times k predicted the actual values to four decimal places in every case. A head implementing 'attend seven back' learns one transformation rather than a separate rule per absolute position. RoPE takes this further by applying the rotation inside attention." },
    { stem: "Does the reference's justification for the sqrt(d_model) multiplier hold?",
      options: ["Yes, PE would dominate without it", "No — unscaled, embeddings are already 1.41x the PE in RMS; scaling pushes it to 31.88x, making position a small perturbation", "No, the multiplier has no effect", "Only for learned embeddings"],
      answer: 1,
      why: "Measured token RMS 0.9963 against PE RMS 0.7071 at standard initialisation. The scaling is a real design choice — the embedding matrix is tied to the output projection in the original paper — but its effect is to make position quiet relative to content, which is the reverse of the stated rationale." },
    { stem: "Can a model with sinusoidal encoding handle sequences longer than it was trained on?",
      options: ["Yes, the formula guarantees it", "The encoding is defined at any position, but the model above it degrades anyway because those positional patterns were never trained", "No, the formula is undefined past max_len", "Only with a learned table"],
      answer: 1,
      why: "|PE[4999]| = 16.0000, identical to |PE[10]| — the input is perfectly well formed, unlike a learned table which has no row at all. But the attention layers above never saw those vectors and have no reason to behave sensibly on them. Length extrapolation needs ALiBi, RoPE scaling or position interpolation." }
  ] },

  interview: { title: "Interview", sub: "Positional encoding", questions: [
    { level: "Core", q: "Why does a transformer need positional encoding?",
      strong: "Because attention is permutation-equivariant and cannot distinguish word order at all.",
      answer: [{ t: "p", text: "Because self-attention treats its input as a set, not a sequence. Nothing in projecting to Q, K and V, scoring, softmaxing and blending refers to position — shuffle the input rows and the output rows shuffle identically. So the mechanism genuinely cannot tell 'the cat sat' from 'sat cat the', and since word order carries most of the meaning in language, position has to be injected somewhere. The transformer adds it to the input embedding rather than concatenating, which is worth understanding: summing means the two signals share every coordinate, which looks destructive, but d_model is large enough that the network learns projections that separate them, and it means no width is spent permanently on position. The original paper uses sinusoids of geometrically spaced frequencies — low dimensions oscillating every few positions for fine resolution, high dimensions barely moving across thousands for coarse. The key property is that shifting by a fixed offset is a fixed rotation regardless of starting position, which I verified at positions 0, 10 and 50 — so 'attend k tokens back' is one transformation to learn rather than one per position." }] },
    { level: "Senior", q: "Sinusoidal or learned positional embeddings?",
      strong: "In practice learned for fixed-length work, but modern models use neither — they use RoPE or ALiBi.",
      answer: [{ t: "p", text: "The textbook trade is that sinusoidal costs no parameters and is defined at any position, while a learned table has a hard row limit but can fit whatever the data needs. Empirically they perform about the same within the training length, which is why BERT and GPT-2 both chose learned tables despite the extrapolation argument. But I'd push back on the framing, because the sinusoidal extrapolation advantage is mostly theoretical. The formula computes fine at position 4999 — I checked, the norm is exactly 16.0000, the same as at position 10 — whereas a learned table raises an index error. That sounds decisive. In practice a model trained only on 512-token sequences degrades badly at 4096 anyway, because the attention layers above never saw those positional vectors and have no reason to behave sensibly on them. Well-defined input isn't useful behaviour. The real answer today is that modern models use neither: RoPE rotates the queries and keys inside every attention layer, which is the same rotation property applied where it's actually used rather than added once at the input, and ALiBi adds a distance-proportional bias to the scores. Both handle relative position more directly and extrapolate better." }] },
    { level: "Senior", q: "Should you multiply token embeddings by sqrt(d_model)?",
      strong: "Only if you are reproducing the original architecture — check what your model does, because the usual explanation is wrong.",
      answer: [{ t: "p", text: "Only if you're reproducing the original architecture, and I'd be careful about the reason given for it. The standard explanation is that without scaling the positional encoding would dominate the token embeddings. I measured that at standard initialisation and it's backwards: token embeddings come out at RMS 0.9963 against the positional encoding's 0.7071, so they're already 1.41 times larger, not dominated. What the scaling actually does is push that ratio to 31.88, making position a deliberately small perturbation on a much larger content signal. That's a real choice with a real motivation — in the original paper the embedding matrix is tied to the output projection, so the embedding scale interacts with the vocabulary softmax — but it isn't rescuing the embeddings from being drowned. And in practice most models don't do it. BERT and GPT-2 both skip the scaling entirely and rely on the LayerNorm right after the embedding sum to fix the scale, with learned positional vectors that come out smaller than the token vectors anyway, at ratios of 2.66 and 1.17. So my answer is: match whatever your checkpoint was trained with, because getting it wrong silently changes every representation, and don't add it to a new architecture on the strength of the usual explanation." }] }
  ] }
});

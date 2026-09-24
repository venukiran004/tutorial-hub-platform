/* ============================================================================
   LESSON 4.3 — Multi-Head Attention and Positional Encoding
   Mirrors rnn-lstm-gru-transformer-guide.md · §5.4, §5.5. Head-count
   parameter invariance measured (scratchpad/dl/d41.py); PE properties from
   d37.py.
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "**One attention operation gives each token one weighted average — one relationship.** But *it* in a sentence may need to resolve a pronoun, track the subject of the clause, and register the adjacent verb, all at once. Multi-head attention runs several attentions in parallel on different projections of the same input, and it costs nothing extra because the heads partition the representation rather than duplicating it. This lesson measures that, and then handles the problem lesson 3.8 flagged: attention cannot see order.",

  objectives: [
    "Explain what multiple heads buy and verify the parameter count is unchanged",
    "Choose a head count and relate it to `d_k`",
    "Contrast sinusoidal, learned and rotary positional encodings",
    "State what each positional scheme can and cannot extrapolate to"
  ],

  prerequisites: ["4.2"],

  blocks: [

    { t: "h2", n: "01", text: "Several attentions at once", id: "multihead" },

    { t: "math", tex: "\\text{MultiHead}(Q,K,V) = \\text{Concat}(\\text{head}_1,\\dots,\\text{head}_h)W^{O}, \\quad \\text{head}_i = \\text{Attention}(QW_i^{Q}, KW_i^{K}, VW_i^{V})" },

    { t: "out", text: `   1 heads, d_k=512: 1,048,576 parameters
   8 heads, d_k= 64: 1,048,576 parameters
  16 heads, d_k= 32: 1,048,576 parameters` },

    { t: "callout", kind: "insight", title: "Identical parameter counts — heads partition, they do not add",
      body: [{ t: "p", text: "Because `d_k = d_model / h`, the four projection matrices are always `d_model × d_model` in total however many heads you slice them into. One head at 512 dimensions and sixteen heads at 32 dimensions each cost exactly **1,048,576 parameters**. So multi-head attention is free: you are reorganising the same weights into independent subspaces rather than buying more. The trade is expressive breadth against per-head resolution — sixteen heads can track sixteen relationships but each has only 32 dimensions in which to represent similarity." }] },

    { t: "diagram", kind: "compare", title: "One head or eight",
      caption: "Same parameters, same FLOPs. The difference is how many distinct relationships the layer can represent at once.",
      columns: [
        { title: "1 head, d_k = 512", tone: "warn", items: [
          "One weighted average per token",
          "One relationship per position",
          "512 dimensions of similarity resolution",
          "Averaging forces competing relationships to blend"
        ] },
        { title: "8 heads, d_k = 64", tone: "good", items: [
          "Eight independent weighted averages",
          "Eight relationships, concatenated then mixed by W_O",
          "64 dimensions each",
          "Heads specialise: syntax, coreference, adjacency"
        ] }
      ] },

    { t: "p", text: "The standard choice is 8 heads at `d_model = 512`, or 12 at 768 for BERT-base — in both cases `d_k = 64`. That value recurs across model scales because it is roughly the smallest dimension in which dot-product similarity remains discriminative; going much lower makes heads noisy, going much higher wastes the opportunity to specialise." },

    { t: "callout", kind: "note", title: "Head specialisation is real but looser than the textbook story",
      body: [{ t: "p", text: "Probing studies do find heads that track syntactic dependencies, heads that attend to the previous token, and heads that resolve coreference. But they also find that many heads can be pruned with almost no loss — in some analyses the majority — and that specialisation is neither as clean nor as consistent across training runs as the usual 'head 1 learns syntax, head 2 learns semantics' illustration suggests. Treat the illustration as a way to understand *why* multiple heads help, not as a description of what any particular trained model contains." }] },

    { t: "h2", n: "02", text: "Position", id: "position" },

    { t: "p", text: "Lesson 3.8 verified that self-attention is permutation-equivariant to 4.8e-07 — shuffle the input and the output shuffles identically. Without position information a transformer reads a sentence as a bag of tokens. Something must be added." },

    { t: "math", tex: "PE_{(pos,\\,2i)} = \\sin\\!\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right) \\qquad PE_{(pos,\\,2i+1)} = \\cos\\!\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right)" },

    { t: "out", text: `  shape (64, 32), no learnable parameters
  every position has a unique encoding: 64 distinct of 64
  norm is constant: min 4.0000, max 4.0000
  positions 0 and  1: cosine +0.9571
  positions 0 and  2: cosine +0.8581
  positions 0 and  8: cosine +0.6576
  positions 0 and 16: cosine +0.4953
  positions 0 and 32: cosine +0.6016` },

    { t: "p", text: "Each dimension is a sinusoid at a different wavelength, from short to very long, so a position is encoded the way a binary number encodes an integer — different digits flipping at different rates. Every position gets a distinct vector, and the **norm is identical across positions**, so no position is implicitly louder than another in the dot products." },

    { t: "callout", kind: "trap", title: "It does not decay monotonically with distance",
      body: [{ t: "p", text: "Similarity falls from 0.957 at a gap of 1 to 0.495 at 16, then **rises to 0.602 at 32**. Sinusoidal encodings are sums of periodic functions, so their similarity oscillates — distant positions can look more alike than nearer ones. The property is widely described as smooth decay with distance, and over short ranges it is; as a general claim it is false, and the measurement shows where. If you need a clean relative-distance signal, that is what RoPE provides and this does not." }] },

    { t: "table", head: ["Scheme", "Parameters", "Beyond training length", "Used by"],
      rows: [
        ["Sinusoidal", "None", "Defined at any position, though quality degrades", "Original transformer"],
        ["Learned absolute", "`max_len × d_model`", "**Impossible** — no embedding exists", "BERT, GPT-2"],
        ["RoPE", "None", "Extends reasonably; extendable further by interpolation", "LLaMA, most current models"],
        ["ALiBi", "None", "Extrapolates well by design", "BLOOM, some long-context models"]
      ] },

    { t: "callout", kind: "insight", title: "RoPE encodes relative position through rotation",
      body: [{ t: "p", text: "Instead of adding a position vector, RoPE *rotates* each query and key by an angle proportional to its position. Because a dot product between two rotated vectors depends only on the difference of their angles, the attention score between positions i and j automatically depends on `i − j` rather than on i and j separately — relative position falls out of the arithmetic rather than being learned. That is why it became standard: it gives genuine relative-position behaviour with no parameters, and it degrades gracefully past the training length, which learned absolute embeddings cannot do at all since there is simply no vector for position 5,000 if you trained to 4,096." }] },

    { t: "code", lang: "python", title: "Sinusoidal, and where it goes",
      code: `def positional_encoding(max_len, d_model):
    pos = torch.arange(max_len)[:, None].float()
    i = torch.arange(0, d_model, 2).float()
    div = torch.exp(-math.log(10000.0) * i / d_model)
    pe = torch.zeros(max_len, d_model)
    pe[:, 0::2] = torch.sin(pos * div)
    pe[:, 1::2] = torch.cos(pos * div)
    return pe

x = embedding(tokens) * math.sqrt(d_model)     # scale up FIRST
x = x + pe[:x.size(1)]                          # then add position`,
      caption: "The `√d_model` scaling matters: embeddings are initialised small, and without it the positional signal would dominate the token identity at the first layer." },

    { t: "exercise", kind: "practice", title: "Probe heads and positions", difficulty: "advanced", minutes: 40,
      prompt: "Confirm that `nn.MultiheadAttention` has the same parameter count at 1, 4, 8 and 16 heads for fixed `d_model`. Then take a small pretrained transformer, extract the attention matrices from one layer, and plot each head's pattern on a real sentence — identify any head that consistently attends to the previous token or to the sentence start. Separately, generate sinusoidal encodings and plot cosine similarity between position 0 and all others; confirm it oscillates. Finally, train a tiny transformer with and without positional encoding on a task where order matters, such as deciding whether a sequence is sorted.",
      hints: [
        "Attention weights are available via `need_weights=True`, or by hooking the module.",
        "Previous-token heads show as a bright subdiagonal; attention-sink heads as a bright first column.",
        "For the order task, without positional encoding accuracy should sit at chance."
      ],
      solution: {
        notes: [
          { t: "p", text: "The sorted-or-not task is the cleanest demonstration that positional encoding is mandatory rather than helpful. Without it the model is at chance and stays there, because sortedness is purely a property of order and self-attention genuinely cannot represent order — I verified the permutation-equivariance at 4.8e-07 in lesson 3.8. It is not a capacity problem, and no amount of training or width fixes it." },
          { t: "p", text: "In the head patterns you will likely find a previous-token head and an attention-sink head that puts most of its weight on the first token regardless of content. The sink is worth recognising: it is not a broken head, it is the model using position 0 as a place to dump attention mass when a head has nothing useful to attend to — softmax forces the weights to sum to 1, so there must be somewhere for them to go. This is why some recent architectures add a dedicated no-op token." },
          { t: "p", text: "The similarity plot should show clear oscillation rather than monotone decay — I measured 0.495 at a gap of 16 and 0.602 at 32. Seeing the actual curve is worth more than the usual slogan about decaying with distance, and it explains why relative schemes like RoPE and ALiBi were introduced: they give the distance-dependence people assumed sinusoids already provided." }
        ]
      } }

  ],

  takeaways: [
    "Heads partition `d_model` rather than adding to it: 1, 8 and 16 heads all cost 1,048,576 parameters.",
    "`d_k = d_model/h` is typically 64 across model scales — small enough to specialise, large enough to discriminate.",
    "Head specialisation is real but looser than the textbook story; many heads prune away with little loss.",
    "Self-attention is permutation-equivariant, so positional information must be added explicitly.",
    "Sinusoidal encoding gives every position a unique vector of constant norm and needs no parameters.",
    "Its similarity oscillates rather than decaying: 0.495 at gap 16, rising to 0.602 at gap 32.",
    "Learned absolute embeddings cannot extend past the training length at all; RoPE rotates queries and keys so relative position emerges from the dot product."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "How does the parameter count change going from 1 head to 16 at fixed `d_model`?",
      options: ["It increases 16×", "It is unchanged — heads partition the same projection matrices", "It decreases", "It increases by the number of heads squared"],
      answer: 1,
      why: "Measured identical at 1,048,576 for 1, 8 and 16 heads, because `d_k = d_model/h` keeps the total projection size constant. Multi-head attention reorganises the same weights into independent subspaces rather than buying more, trading per-head resolution for the number of relationships expressible at once." },
    { stem: "Why does a transformer need positional encoding?",
      options: ["To normalise activations", "Self-attention is permutation-equivariant and cannot represent order", "To reduce the parameter count", "To prevent attention saturation"],
      answer: 1,
      why: "Verified to 4.8e-07: shuffling the input shuffles the output identically. Without position information the model reads a sentence as a bag of tokens, so 'dog bites man' and 'man bites dog' are indistinguishable. No amount of capacity or training fixes this — it requires adding position explicitly." },
    { stem: "What is true of sinusoidal positional encoding's similarity between positions?",
      options: ["It decays monotonically with distance", "It oscillates — 0.495 at gap 16 but 0.602 at gap 32", "It is constant", "It increases with distance"],
      answer: 1,
      why: "Sinusoids are periodic, so their similarity oscillates and distant positions can look more alike than nearer ones. The 'decays with distance' description holds over short ranges only. Genuine relative-distance behaviour is what RoPE and ALiBi provide." },
    { stem: "Which positional scheme cannot handle sequences longer than those seen in training?",
      options: ["Sinusoidal", "Learned absolute embeddings", "RoPE", "ALiBi"],
      answer: 1,
      why: "A learned scheme is an `nn.Embedding(max_len, d_model)` lookup — there is simply no row for position 5,000 if you trained to 4,096. Sinusoidal is defined at any position, RoPE extends reasonably and can be stretched by interpolation, and ALiBi is designed to extrapolate." }
  ] },

  interview: { title: "Interview", sub: "Multi-head and position", questions: [
    { level: "Core", q: "What does multi-head attention give you over single-head?",
      strong: "Several relationships per position at identical cost, since heads partition `d_model`.",
      answer: [{ t: "p", text: "A single attention operation produces one weighted average per token, so it can represent one relationship — and if a token needs to track two different things, averaging forces them to blend. Multiple heads run independent attentions on separate projections of the same input and concatenate the results, so several relationships coexist. The part people find surprising is that it is free: because `d_k = d_model/h`, the projection matrices total `d_model × d_model` regardless of head count, and I have measured identical parameter counts at 1, 8 and 16 heads. The real trade is expressive breadth against per-head resolution — sixteen heads each get only 32 dimensions in which to compute similarity. I would add that the usual story of heads cleanly specialising into syntax and semantics is looser than presented; probing does find previous-token and coreference heads, but many heads can be pruned with little loss." }] },
    { level: "Senior", q: "How would you choose the number of attention heads?",
      strong: "Keep d_k around 64 and derive the head count from d_model — it is a partition, not extra capacity.",
      answer: [{ t: "p", text: "I would fix `d_k` near 64 and let the head count follow from `d_model`, which is what the standard configurations do — 8 heads at 512, 12 at 768, both giving `d_k = 64`. The reason that value recurs is that it is roughly the smallest dimension in which dot-product similarity stays discriminative; below about 32 the heads get noisy, and much above 64 you are spending representation width on resolution you do not need instead of on more relationships. The thing to be clear about is that head count is not a capacity knob: because `d_k = d_model/h`, the projection matrices total `d_model × d_model` regardless, and I have measured identical parameter counts at 1, 8 and 16 heads. So it is purely a question of how to partition a fixed budget between breadth and per-head resolution. I would also not expect a large effect from tuning it — probing work finds many heads can be pruned with little loss, which suggests the architecture is fairly insensitive to the exact number once it is in a reasonable range." }] },
    { level: "Senior", q: "Compare positional encoding schemes.",
      strong: "Sinusoidal is parameter-free and extends; learned is flexible but capped; RoPE gives relative position for free.",
      answer: [{ t: "p", text: "Sinusoidal uses fixed sinusoids at different wavelengths. It has no parameters, gives every position a unique vector of constant norm, and is defined at any position, though quality degrades well past training length. One thing worth knowing is that its similarity does not decay monotonically with distance — I measured 0.495 at a gap of 16 rising to 0.602 at 32, because they are periodic functions. Learned absolute embeddings are a lookup table, more flexible but hard-capped: there is no vector for a position beyond the table, so BERT and GPT-2 simply cannot process longer inputs. RoPE is what most current models use — it rotates queries and keys by an angle proportional to position, so the dot product between two positions depends only on their difference and relative position falls out of the arithmetic with no parameters. It also extends beyond training length and can be stretched further by interpolating the frequencies, which is how context windows get extended after pretraining. ALiBi takes a different route, adding a distance-proportional penalty to the scores, and extrapolates best of all by design." }] }
  ] }
});

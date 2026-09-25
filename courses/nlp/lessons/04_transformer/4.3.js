/* ============================================================================
   LESSON 4.3 — Multi-Head Attention
   Mirrors 02_Transformers_InDepth.md · §5. The reference's implementation is
   run, the parameter count is shown to be independent of head count, and the
   "heads learn different things" claim is probed on a real BERT — finding a
   previous-token head and a [SEP] sink (scratchpad/nlp/n43.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "**Going from 1 head to 64 changes the parameter count by exactly zero.** Multi-head attention is a reshape, not extra capacity — `h × d_k = d_model` always, so the projections are `4 × d_model²` whatever `h` is. What the split buys is *independent* attention patterns, and they are real: probing BERT, layer 3 head 5 turned out to be a clean previous-token head, sending 0.7165 of its weight one position back. But the tidy story of one head per linguistic relationship does not survive contact with the data, as the rest of this lesson shows.",

  objectives: [
    "Write multi-head attention and trace every reshape",
    "Show that head count does not change the parameter count",
    "Explain what splitting into heads actually buys",
    "Probe a trained model's heads and identify an interpretable one",
    "Recognise attention sinks and why they complicate head interpretation"
  ],

  prerequisites: ["4.2"],

  blocks: [

    { t: "h2", n: "01", text: "The definition", id: "definition" },

    { t: "math", tex: "\\text{MultiHead}(Q,K,V) = \\text{Concat}(\\text{head}_1, \\ldots, \\text{head}_h)\\,W^{O}, \\qquad \\text{head}_i = \\text{Attention}(QW_i^{Q}, KW_i^{K}, VW_i^{V})" },

    { t: "p", text: "Run attention `h` times on different learned projections of the same input, concatenate the results, and pass them through one more linear layer. In practice nobody implements `h` separate projections — one `d_model × d_model` matrix per role is projected and then *reshaped* into heads, which is mathematically identical and far faster." },

    { t: "h2", n: "02", text: "The implementation", id: "implementation" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n43.py — the reference's MultiHeadAttention", code:
"class MultiHeadAttention(nn.Module):\n    def __init__(self, d_model, n_heads, dropout=0.1):\n        super().__init__()\n        assert d_model % n_heads == 0\n        self.d_k = d_model // n_heads\n        self.n_heads = n_heads\n        self.W_Q = nn.Linear(d_model, d_model)\n        self.W_K = nn.Linear(d_model, d_model)\n        self.W_V = nn.Linear(d_model, d_model)\n        self.W_O = nn.Linear(d_model, d_model)\n        self.dropout = nn.Dropout(dropout)\n\n    def forward(self, Q, K, V, mask=None):\n        B = Q.size(0)\n        # (B, seq, d_model) -> (B, n_heads, seq, d_k)\n        Q = self.W_Q(Q).view(B, -1, self.n_heads, self.d_k).transpose(1, 2)\n        K = self.W_K(K).view(B, -1, self.n_heads, self.d_k).transpose(1, 2)\n        V = self.W_V(V).view(B, -1, self.n_heads, self.d_k).transpose(1, 2)\n\n        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)\n        if mask is not None:\n            scores = scores.masked_fill(mask == 0, float('-inf'))\n        weights = self.dropout(torch.softmax(scores, dim=-1))\n\n        context = torch.matmul(weights, V)          # (B, n_heads, seq, d_k)\n        context = context.transpose(1, 2).contiguous() \\\n                         .view(B, -1, self.n_heads * self.d_k)\n        return self.W_O(context), weights",
      caption: "The `.contiguous()` before `.view()` is required, not decorative — `transpose` returns a non-contiguous view and `view` refuses to operate on one." },

    { t: "out", text:
"input   (2, 10, 512)\noutput  (2, 10, 512)      weights (2, 8, 10, 10)\n\nevery attention row sums to 1: max deviation 2.38e-07\n\nparameters 1,050,624\n  4 x 512 x 512 = 1,048,576 weights, plus 4 x 512 = 2,048 biases" },

    { t: "p", text: "The weights tensor is `(batch, heads, seq, seq)` — one complete attention map per head, which is exactly what makes head-level interpretation possible. The reference quotes 1,048,576 parameters; that is the weight count, and `nn.Linear` adds 2,048 bias terms on top." },

    { t: "diagram", kind: "flow", title: "The reshape, step by step", cols: 3,
      nodes: [
        { id: "x", text: "X: (B, seq, 512)", tone: "accent" },
        { id: "p", text: "W_Q, W_K, W_V: still (B, seq, 512)", tone: "accent" },
        { id: "v", text: "view: (B, seq, 8, 64)", tone: "violet" },
        { id: "t", text: "transpose: (B, 8, seq, 64)", tone: "violet" },
        { id: "a", text: "attention per head, in parallel", tone: "teal" },
        { id: "c", text: "transpose and view back: (B, seq, 512)", tone: "teal" },
        { id: "o", text: "W_O: (B, seq, 512)", tone: "good" }
      ],
      edges: [["x","p"],["p","v"],["v","t"],["t","a"],["a","c"],["c","o"]] },

    { t: "h2", n: "03", text: "Heads are free", id: "free" },

    { t: "out", text:
"d_model = 512\n\nh      d_k    Q/K/V each    W_O        total\n1      512    262,144       262,144    1,048,576\n2      256    262,144       262,144    1,048,576\n4      128    262,144       262,144    1,048,576\n8       64    262,144       262,144    1,048,576\n16      32    262,144       262,144    1,048,576\n64       8    262,144       262,144    1,048,576" },

    { t: "callout", kind: "insight", title: "The head count is a partition, not an addition",
      body: [{ t: "p", text: "Because `h × d_k = d_model` by construction, the projection matrices are `d_model × d_model` no matter how you slice them. Eight heads of 64 dimensions and one head of 512 use **identical** parameter counts and nearly identical arithmetic. So multi-head attention is not more expressive in the capacity sense — the extra structure comes entirely from computing `h` *separate* softmaxes instead of one. A single head must produce one attention distribution, which is one answer to \"what is relevant here\". Eight heads produce eight, and `W_O` learns how to combine them. The constraint is what creates the diversity." }] },

    { t: "callout", kind: "tradeoff", title: "But d_k shrinks as h grows",
      body: [{ t: "p", text: "At `h = 64` each head has `d_k = 8`. A query-key comparison in 8 dimensions is a much blunter instrument than one in 64 — there is simply less room to encode what a token is looking for, and the scores become noisier. That is the real cost of more heads, and it is why 8 to 16 is the usual range for `d_model = 512` to `1024` rather than 64. Empirically, many trained heads turn out to be prunable with little loss, which suggests the useful number is lower than the configured one." }] },

    { t: "h2", n: "04", text: "Do heads really specialise?", id: "specialise" },

    { t: "p", text: "The reference claims head 1 learns syntax, head 2 semantics, head 3 proximity, head 4 coreference. That is a testable claim, so I ran a sentence with a centre-embedded clause through `bert-base-uncased` with `output_attentions=True` and summarised every head." },

    { t: "out", text:
"\"The cat that the dog chased sat on the mat quietly.\"\n['[CLS]','the','cat','that','the','dog','chased','sat','on','the','mat','quietly','.','[SEP]']\n\nlayer 4, all 12 heads\nhead   offset    entropy   ->[CLS]   ->[SEP]   self\n0      5.64      1.4482    0.0196    0.5157    0.0846\n1      4.36      2.1780    0.0175    0.2083    0.1119\n2      4.79      1.6884    0.0829    0.5097    0.0832\n3      5.86      0.7883    0.0160    0.7180    0.2173\n5      3.64      0.9155    0.0251    0.4348    0.0889\n9      5.29      1.8671    0.1040    0.4210    0.1168\n10     2.07      1.6155    0.0591    0.3588    0.0893\n11     4.36      1.0731    0.0425    0.5324    0.0906" },

    { t: "callout", kind: "crit", title: "Most of layer 4 is pointing at [SEP]",
      body: [{ t: "p", text: "Head 3 sends **71.8%** of its attention mass to the `[SEP]` token. Most other heads in the layer send 35–53%. `[SEP]` carries no content — it is a structural marker — so these heads are not attending to anything meaningful. This is the **attention sink**: when a head has nothing it wants to attend to for a given token, softmax still forces its weights to sum to 1, so the mass has to go somewhere, and models learn to dump it on a semantically empty position. Tracing further, head 0 at layer 11 sends **86.4%** to `[SEP]`. Any interpretation of \"what this head does\" has to account for the sink first, and the neat one-relationship-per-head story does not." }] },

    { t: "h2", n: "05", text: "A head that does something legible", id: "legible" },

    { t: "p", text: "Sinks are the common case, but genuinely interpretable heads do exist. Searching all 144 heads for the one with the highest average weight on the immediately preceding token found a clean example." },

    { t: "out", text:
"strongest previous-token head: layer 3, head 5, mean weight 0.7165\n\nwhere each token looks\n  the        -> [CLS]      0.856\n  cat        -> [CLS]      0.663\n  that       -> cat        0.967\n  the        -> that       0.959\n  dog        -> the        0.621\n  chased     -> dog        0.732\n  sat        -> chased     0.941\n  on         -> sat        0.984" },

    { t: "callout", kind: "insight", title: "An induction-style head, found empirically",
      body: [{ t: "p", text: "From *that* onward, every token attends to the one immediately before it, at weights between 0.62 and 0.98. This head is implementing \"look at the previous token\" as a reusable primitive — one of the building blocks the mechanistic-interpretability literature identifies, and a component of the induction circuits that let models copy repeated patterns. Note it is a *positional* relationship, not a semantic one, and note also that the first two tokens fall back to `[CLS]`, because there is no meaningful previous token for them. Even the clean head has a sink." }] },

    { t: "out", text:
"layer 4: 66 head pairs, cosine between flattened attention maps\n  mean 0.7132   min 0.4511   max 0.9004" },

    { t: "p", text: "So heads are genuinely different from one another — a mean pairwise cosine of 0.71 with some pairs as low as 0.45 — but they are also substantially correlated, and no pair is independent. The honest summary is that the split produces real diversity without producing the clean division of labour the diagram in every tutorial implies." },

    { t: "h2", n: "06", text: "Depth changes the behaviour more than head index", id: "depth" },

    { t: "out", text:
"head 0, traced through all 12 layers\nlayer  offset    entropy   ->[CLS]   ->[SEP]   self\n0      0.93      2.5284    0.0595    0.0760    0.0815\n1     -2.07      1.9673    0.3225    0.1293    0.0423\n2     -0.07      0.0220    0.1401    0.0730    0.0713\n3      1.71      1.2052    0.3051    0.4018    0.1824\n4      5.64      1.4482    0.0196    0.5157    0.0846\n6      4.79      0.7493    0.0046    0.7441    0.0946\n9      6.07      1.1729    0.0108    0.5936    0.1893\n11     6.50      0.5773    0.0428    0.8644    0.0970" },

    { t: "callout", kind: "insight", title: "Layer 2 head 0 has entropy 0.0220",
      body: [{ t: "p", text: "Out of a possible 2.64 at 14 tokens, that is essentially a deterministic pointer — it attends to one position and nothing else, with a mean offset of −0.07, meaning roughly to itself. Early layers do this kind of sharp, local, positional work; later layers drift toward the `[SEP]` sink, from 7.6% at layer 0 to 86.4% at layer 11. This echoes what lesson 3.6 measured about sense separation peaking mid-stack: the interesting representational work happens in the middle, and the top layers specialise toward the pretraining objective." }] },

    { t: "exercise", title: "Probe your own model's heads",
      tasks: [
        "Run a sentence through a model with `output_attentions=True` and compute the [SEP] mass for all heads. Rank them.",
        "Search all heads for the strongest previous-token, next-token and self-attention behaviours.",
        "Compute the pairwise cosine between heads in one layer and find the most and least similar pair.",
        "Zero out a single head's output and measure the change in the model's predictions. Find a head that can be removed for free.",
        "Repeat the previous-token search on a decoder-only model and compare what you find against BERT."
      ] }
  ],

  takeaways: [
    "Multi-head attention costs 4 × d_model² parameters regardless of the head count — 1 head and 64 heads are identical in size.",
    "Splitting into heads is a reshape; the gain comes from computing h separate softmaxes, not from extra capacity.",
    "More heads means smaller d_k — at h = 64 each head compares queries and keys in 8 dimensions, which is a blunt instrument.",
    "The weights tensor is (batch, heads, seq, seq), one full map per head, which is what makes head-level interpretation possible.",
    "Most of BERT's layer-4 heads send 35-72% of their attention to [SEP] — the attention sink, where softmax's sum-to-one forces idle mass somewhere.",
    "Layer 11 head 0 sends 86.4% to [SEP]; sink behaviour grows with depth from 7.6% at layer 0.",
    "Layer 3 head 5 is a clean previous-token head at mean weight 0.7165, with individual weights up to 0.984.",
    "Pairwise head cosines at layer 4 average 0.7132 — genuinely different maps, but correlated, not the clean one-relationship-per-head story.",
    "Layer 2 head 0 has entropy 0.0220, a nearly deterministic pointer; early layers are sharp and positional, late layers drift to the sink."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "How does going from 8 heads to 16 change the parameter count?",
      options: ["It doubles", "Not at all — h × d_k = d_model, so the projections stay d_model × d_model", "It halves", "It grows by d_model"],
      answer: 1,
      why: "At d_model = 512, every head count from 1 to 64 gives exactly 1,048,576 projection weights. The head split partitions the same matrices rather than adding new ones. What changes is d_k per head, which shrinks as h grows — at h = 64 each head compares in only 8 dimensions." },
    { stem: "What does splitting attention into heads actually buy?",
      options: ["More parameters", "h independent softmax distributions instead of one, so the layer can express several notions of relevance at once", "Faster computation", "Lower memory use"],
      answer: 1,
      why: "A single head must commit to one attention distribution — one answer to what is relevant for this token. Eight heads produce eight, and W_O learns to combine them. The capacity is identical; the structural constraint of separate normalisations is what creates the diversity." },
    { stem: "Why do so many BERT heads send most of their attention to [SEP]?",
      options: ["[SEP] carries sentence-level meaning", "Softmax forces weights to sum to 1, so a head with nothing to attend to must dump the mass somewhere — the attention sink", "A tokenisation bug", "[SEP] is the highest-magnitude embedding"],
      answer: 1,
      why: "Layer 4 heads sent 35-72% there and layer 11 head 0 sent 86.4%. [SEP] is a structural marker with no content, which makes it a convenient place to put idle mass. Any claim about what a head does has to account for the sink first — it is the reason the tidy one-relationship-per-head picture does not survive measurement." },
    { stem: "What is layer 3 head 5 doing?",
      options: ["Coreference resolution", "Attending to the immediately preceding token, at mean weight 0.7165", "Attending to [CLS]", "Nothing interpretable"],
      answer: 1,
      why: "From the third token onward every position attends to the one before it, with individual weights from 0.621 to 0.984. It implements 'look at the previous token' as a reusable positional primitive — a building block of the induction circuits that let models copy repeated patterns. The first two tokens fall back to [CLS], having no meaningful predecessor." }
  ] },

  interview: { title: "Interview", sub: "Multi-head attention", questions: [
    { level: "Core", q: "Why use multiple attention heads rather than one?",
      strong: "To get several independent notions of relevance for the same parameter budget.",
      answer: [{ t: "p", text: "Because one head can only produce one attention distribution — one answer to the question 'what is relevant to this token'. Splitting into h heads gives you h separate softmaxes, so the layer can simultaneously attend to a syntactic dependency, a nearby token and something semantically related, and the output projection learns how to combine them. The point people often miss is that this is free in parameters. Since h times d_k equals d_model by construction, the projection matrices are d_model by d_model whatever h is — I checked it from 1 head to 64 and got exactly 1,048,576 projection weights every time. So it isn't extra capacity; it's the same capacity partitioned, and the separate normalisation is what creates the diversity. The cost is that d_k shrinks as h grows: at 64 heads each one compares queries and keys in 8 dimensions, which is a much blunter instrument. That's why 8 to 16 heads is typical rather than 64, and why a lot of trained heads turn out to be prunable with almost no loss." }] },
    { level: "Senior", q: "Do attention heads specialise the way the diagrams suggest?",
      strong: "Partly — some heads are cleanly interpretable, but most are dominated by attention sinks.",
      answer: [{ t: "p", text: "Partly, and less tidily than the standard diagram implies. Interpretable heads genuinely exist: I searched all 144 heads of bert-base for previous-token behaviour and found layer 3 head 5 sending 0.7165 of its weight one position back, with individual weights up to 0.984 — a clean positional primitive, and one of the components that make up induction circuits. But when I summarised every head in a middle layer, the dominant pattern wasn't linguistic specialisation, it was the attention sink: most heads sent 35 to 72 percent of their mass to [SEP], and one head at layer 11 sent 86.4 percent. [SEP] has no content. What's happening is that softmax forces the weights to sum to one, so a head with nothing it wants to attend to for a given token still has to put the mass somewhere, and models learn to dump it on a semantically empty position. So before claiming a head does coreference or syntax, you have to account for how much of its behaviour is just sink. The pairwise cosine between heads in one layer averaged 0.71, with the most distinct pair at 0.45 — genuinely different maps, but correlated, not the clean division of labour. I'd treat head interpretation as a real research technique with real findings, and treat the four-heads-four-relationships diagram as a teaching simplification." }] },
    { level: "Senior", q: "How would you decide how many heads to use?",
      strong: "Keep d_k around 64, then validate empirically — and check for prunable heads.",
      answer: [{ t: "p", text: "I'd start from d_k rather than from h, because d_k is what actually determines whether a head can discriminate. The convention of d_k around 64 is well established and worth following: it's large enough that a query-key dot product is meaningful, and it's the value the original paper used with 8 heads at d_model 512. So pick h as d_model over 64 and validate from there. Since the parameter count doesn't change with h, the sweep is cheap — you're comparing configurations of identical size, which makes it a clean experiment. What I'd actually watch for is the failure mode at each end. Too few heads and the layer can only express one notion of relevance per layer, which shows up as worse performance on tasks needing several simultaneous relationships. Too many and d_k gets small enough that scores become noisy — at 64 heads on d_model 512 you're comparing in 8 dimensions. I'd also run a head-pruning analysis on the trained model: zero each head's contribution in turn and measure the change in validation loss. The literature consistently finds many heads can be removed with little or no degradation, and if a large fraction of yours are prunable that's evidence the head count is higher than useful — which matters for inference cost, since pruned heads are real savings." }] }
  ] }
});

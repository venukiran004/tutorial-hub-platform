/* ============================================================================
   LESSON 6.4 — The Whole Stack: What, When-Why, How
   Mirrors 02b_Transformer_Cheatsheet_Explained.md. Its §15 worked example is
   a SECOND independent trace with different weights — it reproduces to every
   digit (§06), and the antisymmetry found in 6.3 reappears, confirming it is
   structural (scratchpad/nlp/n61.py).
   ========================================================================= */
EC.receiveLesson({
  id: "6.4",

  lede: "**A second worked example, different weight matrices, and the logits are antisymmetric again: +0.5136/−0.5136, +0.4141/−0.4141, −1.8880/+1.8880.** Lesson 6.3 derived why — LayerNorm forces the hidden state to sum to zero and this vocabulary's embeddings pair to `[1,1,1,1]` — and here that prediction is confirmed on weights chosen independently. This lesson uses the reference's *what / when-why / how* frame to walk the whole stack, then verifies its second trace end to end.",

  objectives: [
    "Give the what, when-why and how for each component of the stack",
    "Compare three different weight choices on the same sentence",
    "Verify a second independent worked example digit by digit",
    "Confirm the antisymmetry prediction from lesson 6.3 on new weights",
    "State where every weight matrix in a transformer comes from"
  ],

  prerequisites: ["6.3"],

  blocks: [

    { t: "h2", n: "01", text: "The frame", id: "frame" },

    { t: "p", text: "The reference teaches each component three ways: **what it is** in one line, **when and why** you need it in plain words, and **how** it works as formula or mechanics. That ordering is deliberate — the *why* is what most explanations skip, and it is what makes the *how* memorable." },

    { t: "table",
      head: ["Component", "What", "When & why", "How"],
      rows: [
        ["Tokenisation", "Text to integer ids", "Networks need numbers; word-level has huge vocabularies and no OOV handling", "Subword merges — BPE, WordPiece, SentencePiece"],
        ["Embeddings", "Ids to vectors", "Ids are arbitrary labels with no notion of similarity", "A learned lookup table, equivalent to a one-hot matmul"],
        ["Positional encoding", "Inject order", "Attention is permutation-equivariant and cannot tell 'dog bites man' from 'man bites dog'", "Sinusoidal, learned, or rotary applied to Q and K"],
        ["Self-attention", "Each token mixes in context", "Fixed-size RNN state forgets; attention connects any two positions in one step", "softmax(QKᵀ/√d_k)V"],
        ["Multi-head", "Several attention patterns at once", "One head produces one notion of relevance", "Reshape into h heads, attend, concatenate, project by W_O"],
        ["Masking", "Hide the future", "Training is parallel, so a position must not see its own answer", "Add −∞ above the diagonal before softmax"],
        ["FFN", "Transform each token alone", "Attention only mixes; something must transform", "ReLU/GELU sandwich, d_model → d_ff → d_model"],
        ["Residual", "Add the input back", "Deep stacks need an unobstructed gradient path", "x = x + SubLayer(x)"],
        ["LayerNorm", "Rescale per token", "Keeps activations stable across dozens of layers", "Subtract mean, divide by standard deviation, scale and shift"]
      ] },

    { t: "h2", n: "02", text: "Where the weights come from", id: "weights" },

    { t: "callout", kind: "insight", title: "Every matrix is learned — none is designed",
      body: [{ t: "p", text: "This is the question the reference stops to answer, and it is worth repeating because the toy examples in this module can mislead. The lifecycle of every weight matrix is: **shape** fixed by the architecture, **values** initialised randomly, **updated** by gradient descent on next-token loss over trillions of tokens. Nobody programs `W_Q` to find subjects. The subject-verb attention pattern in lesson 6.2 emerged in that example because the matrices were hand-picked to be readable — in a real model the identical pattern emerges because it lowered the loss. The toy 0/1 matrices are a pedagogical device, and real ones are dense floats with no visible structure." }] },

    { t: "table",
      head: ["Matrix", "Role", "Shape", "Origin"],
      rows: [
        ["W_Q", "Builds the query — what I am looking for", "d_model × d_k", "Learned"],
        ["W_K", "Builds the key — what I advertise", "d_model × d_k", "Learned"],
        ["W_V", "Builds the value — what I hand over", "d_model × d_v", "Learned"],
        ["W_O", "Mixes the heads back to d_model", "d_model × d_model", "Learned"],
        ["W₁, W₂", "The FFN's two layers", "d_model × d_ff, d_ff × d_model", "Learned"],
        ["E", "Token embedding table", "vocab × d_model", "Learned"],
        ["PE", "Positional encoding", "max_len × d_model", "Fixed formula, or learned"]
      ] },

    { t: "h2", n: "03", text: "The same sentence, three weight choices", id: "three" },

    { t: "out", text:
"where \"sat\" puts its attention\n\n  setup                              the     cat     sat\n  identity (6.1)                    0.244   0.246   0.510\n  real W_Q, W_K (6.2)               0.265   0.515   0.220\n  cheatsheet weights (this lesson)  0.238   0.661   0.101" },

    { t: "callout", kind: "crit", title: "Same sentence, same formula, completely different behaviour",
      body: [{ t: "p", text: "Three weight choices produce three genuinely different readings. With identity projections *sat* attends mostly to **itself** at 0.510 — self-similarity, as lesson 6.2 showed is forced when `Q = K`. With the first real projection pair it attends to **cat** at 0.515. With the cheatsheet's matrices it attends to *cat* at **0.661**, more strongly still, and drops to 0.101 on itself. Nothing about the architecture changed between these. **The weights are the model.** That is the single most important thing the toy examples teach, and it is why the previous section matters: those numbers come from training, not from design." }] },

    { t: "h2", n: "04", text: "The second trace: Q, K, V", id: "qkv" },

    { t: "code", lang: "python", title: "The reference's own reproduction script, run unmodified", code:
"E = np.array([[1,0,1,0],[0,1,1,0],[1,1,0,0],[0,0,1,1],[1,0,0,1],[0,1,0,1]],float)\nids = [0,1,2]                                   # \"the cat sat\"\nPE = np.array([[np.sin(p),np.cos(p),np.sin(p/100),np.cos(p/100)] for p in range(3)])\nX  = E[ids] + PE\n\nWQ = np.array([[1,0,1,0],[0,1,0,1],[1,0,0,1],[0,1,1,0]],float)\nWK = np.array([[1,0,0,1],[0,1,1,0],[0,1,0,1],[1,0,1,0]],float)\nQ, K, V = X@WQ, X@WK, X                         # W_V = I, so V = X\n\nS = (Q@K.T) / np.sqrt(4)\nS += np.triu(np.ones((3,3)),1) * -1e9           # causal mask\nA = np.exp(S - S.max(1,keepdims=True)); A /= A.sum(1,keepdims=True)",
      caption: "Note the mask uses `-1e9` rather than `-inf`. Lesson 4.5 measured that anything below about `-1e4` underflows to exactly zero in float32, so the two are equivalent here." },

    { t: "out", text:
"Q                                    K\n[2.000, 2.000, 2.000, 2.000]        [2.000, 2.000, 2.000, 2.000]\n[1.851, 2.540, 1.841, 2.550]        [1.841, 2.550, 2.540, 1.851]\n[1.929, 1.584, 2.909, 0.604]        [2.909, 0.604, 1.584, 1.929]\n\nall six rows match the reference exactly" },

    { t: "p", text: "Look at the *cat* rows: `Q` is `[1.851, 2.540, 1.841, 2.550]` and `K` is `[1.841, 2.550, 2.540, 1.851]` — the same four numbers in a different order. `W_K` is a permutation of `W_Q`, which is the minimal way to make queries and keys genuinely different while keeping the arithmetic readable." },

    { t: "h2", n: "05", text: "Scores through to attention", id: "scores" },

    { t: "out", text:
"raw scores Q K^T\n  [16.000, 17.567, 14.052]\n  [17.567, 19.287, 14.757]\n  [14.052, 16.099, 12.341]\n\nscaled by sqrt(4) = 2\n  [ 8.000,  8.783,  7.026]\n  [ 8.783,  9.644,  7.378]\n  [ 7.026,  8.050,  6.170]\n\nmasked and softmaxed\n  [1.000, 0.000, 0.000]\n  [0.297, 0.703, 0.000]\n  [0.238, 0.661, 0.101]\n\nevery value matches the reference" },

    { t: "callout", kind: "insight", title: "Watch the softmax by hand on the last row",
      body: [{ t: "p", text: "Scores `[7.026, 8.050, 6.170]`. Subtract the row maximum, 8.050, to get `[−1.024, 0.000, −1.880]` — this subtraction changes nothing mathematically, since softmax is shift-invariant, and it is what stops `exp` overflowing in a real implementation. Exponentiate to `[0.359, 1.000, 0.153]`, sum to 1.512, divide to get `[0.238, 0.661, 0.101]`. That max-subtraction is the same trick that, generalised to running statistics over blocks, becomes the online softmax behind FlashAttention and ring attention in lessons 5.2 and 5.12." }] },

    { t: "h2", n: "06", text: "The rest of the block", id: "rest" },

    { t: "out", text:
"Z = A V, the \"sat\" row\n  [0.987, 1.315, 0.908, 1.000]\n\nO = Z W_O     (sat)  [1.895, 2.223, 2.315, 1.987]\nX + O         (sat)  [3.804, 2.807, 2.335, 2.987]\nLayerNorm     (sat)  [1.548, -0.333, -1.222, 0.007]\n\nblock output  (sat)  [1.408, -0.994, -0.894, 0.480]\n\nlogits  [0.514, -1.888, 0.414, -0.414, 1.888, -0.514]\n\n  the    0.1492      reference 0.149\n  cat    0.0135      reference 0.014\n  sat    0.1351      reference 0.135\n  on     0.0590      reference 0.059\n  mat    0.5898      reference 0.590\n  <eos>  0.0534      reference 0.053" },

    { t: "callout", kind: "insight", title: "Every digit, including the final distribution",
      body: [{ t: "p", text: "This second walkthrough — different weight matrices, a different `W_O`, a real 4→8→4 FFN rather than an identity one — reproduces **exactly**, right down to *mat* at 0.590. Combined with lesson 6.1's verification of the first trace, that is two complete independent hand-computed transformers from this reference, both correct. It is worth weighing against lesson 4.3, where a shorter worked example from the same source had two of three output rows wrong. The lesson is not that references are unreliable; it is that verification is cheap and its results are not predictable in advance." }] },

    { t: "h2", n: "07", text: "The antisymmetry, confirmed", id: "antisymmetry" },

    { t: "out", text:
"logit(the)   +0.5136  +  logit(<eos>)  -0.5136  =  0.000000\nlogit(sat)   +0.4141  +  logit(on)     -0.4141  =  0.000000\nlogit(cat)   -1.8880  +  logit(mat)    +1.8880  =  0.000000\n\nsum(h) = 0.000000" },

    { t: "callout", kind: "crit", title: "A prediction that held on independent weights",
      body: [{ t: "p", text: "Lesson 6.3 derived this from two facts — LayerNorm subtracts the mean so `sum(h) = 0`, and the vocabulary's embeddings pair to `[1,1,1,1]` — and predicted it must hold **for any input and any weights**. Here it does, on completely different matrices producing completely different logit values. That is how you tell a derived property from a coincidence: it survives changing everything the derivation did not depend on. Note what it implies about this toy model: `p(mat)` and `p(cat)` are forced to be reciprocally related, so the vocabulary itself constrains what the model can express. Real vocabularies have no such structure, which is why real logits show no such symmetry." }] },

    { t: "h2", n: "08", text: "What the stack looks like assembled", id: "assembled" },

    { t: "diagram", kind: "flow", title: "One decoder block, every piece named", cols: 3,
      nodes: [
        { id: "t", text: "Tokenise, embed, add position", tone: "accent" },
        { id: "n1", text: "LayerNorm", tone: "teal" },
        { id: "a", text: "Masked multi-head self-attention", tone: "violet" },
        { id: "r1", text: "Residual: x + attention", tone: "teal" },
        { id: "n2", text: "LayerNorm", tone: "teal" },
        { id: "f", text: "FFN: d_model to d_ff to d_model", tone: "violet" },
        { id: "r2", text: "Residual: x + FFN", tone: "teal" },
        { id: "h", text: "Final norm, LM head, softmax", tone: "good" }
      ],
      edges: [["t","n1"],["n1","a"],["a","r1"],["r1","n2"],["n2","f"],["f","r2"],["r2","h"]] },

    { t: "exercise", title: "Run both traces",
      tasks: [
        "Run the reference's NumPy script unmodified and confirm it prints mat at 0.59.",
        "Change W_K to equal W_Q and see how the attention pattern collapses toward self-attention.",
        "Replace the mask value -1e9 with -10 and measure how much weight leaks to the future.",
        "Break the vocabulary's complementary pairing and confirm the logit antisymmetry disappears.",
        "For each component in the section 01 table, write the when-and-why in your own words without looking."
      ] }
  ],

  takeaways: [
    "The reference's frame — what it is, when and why you need it, how it works — puts the motivation before the mechanics, which is what most explanations skip.",
    "Every weight matrix is learned: shape fixed by architecture, values random at init, updated by gradient descent. None is designed.",
    "The toy 0/1 matrices are pedagogy; real ones are dense floats with no visible structure, and the same attention patterns emerge because they lowered the loss.",
    "Three weight choices put 'sat's attention at 0.510 on itself, 0.515 on 'cat', and 0.661 on 'cat' — same sentence, same formula. The weights are the model.",
    "The cheatsheet's trace reproduces exactly at every step, ending at mat 0.5898 against a published 0.590.",
    "That makes two complete independent hand-computed transformers from this reference verified correct — against a shorter example in lesson 4.3 that had two wrong rows.",
    "Subtracting the row maximum before exponentiating is shift-invariant and prevents overflow; generalised to running statistics it becomes the online softmax behind FlashAttention.",
    "The logit antisymmetry predicted in 6.3 held on entirely different weights — a derived property, not a coincidence.",
    "That antisymmetry means the toy vocabulary itself constrains what the model can express; real vocabularies have no such structure."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Where do a transformer's weight matrices come from?",
      options: ["They are hand-designed for each task", "Shape is fixed by the architecture, values start random, and gradient descent on next-token loss sets them", "They are derived from the vocabulary", "W_Q and W_K are fixed; only the FFN is learned"],
      answer: 1,
      why: "Nobody programs W_Q to find subjects. The subject-verb attention pattern in the toy examples appears because the matrices were hand-picked to be readable; in a real model the same pattern emerges because it lowered the loss. Real matrices are dense floats with no visible structure." },
    { stem: "The same sentence gave 'sat' weights of 0.510 on itself, then 0.515 on 'cat', then 0.661 on 'cat'. What changed?",
      options: ["The sentence", "Only the weight matrices — the architecture and formula were identical throughout", "The positional encoding", "The number of heads"],
      answer: 1,
      why: "Identity projections force self-similarity because Q = K makes a token's highest score its own squared norm. Two different real projection pairs then produce two different linguistic readings. Nothing structural differs between the three — which is the clearest demonstration that the weights are the model." },
    { stem: "Why subtract the row maximum before exponentiating in softmax?",
      options: ["It changes the distribution to be better calibrated", "Softmax is shift-invariant, so it changes nothing mathematically while preventing exp from overflowing", "It applies the causal mask", "It normalises the scale of the logits"],
      answer: 1,
      why: "Scores [7.026, 8.050, 6.170] become [-1.024, 0.000, -1.880], exponentiate safely, and give the same weights. Generalised from a single row-max to running statistics carried across blocks, this becomes the online softmax that makes FlashAttention and ring attention possible without materialising the full matrix." },
    { stem: "The logit antisymmetry reappeared on completely different weights. Why does that matter?",
      options: ["It shows the weights were badly chosen", "It confirms the property is derived — from LayerNorm's zero-sum output and the vocabulary's paired embeddings — rather than coincidental", "It proves the trace is wrong", "It means the model is undertrained"],
      answer: 1,
      why: "Lesson 6.3 predicted it must hold for any input and any weights, from two structural facts. Surviving a change to everything the derivation did not depend on is exactly how a derived property is distinguished from a coincidence. It also means this toy vocabulary constrains what the model can express — real vocabularies do not." }
  ] },

  interview: { title: "Interview", sub: "The stack as a whole", questions: [
    { level: "Core", q: "Explain the transformer stack to someone who has read the formulas but does not feel they understand it.",
      strong: "Lead with why each piece exists, not what it computes.",
      answer: [{ t: "p", text: "I'd go component by component and put the motivation first, because the formulas are usually the part people already have. Tokenisation exists because networks need numbers, and subwords specifically because word-level vocabularies are enormous and can't handle unseen words. Embeddings exist because token ids are arbitrary labels with no notion of similarity. Positional encoding exists because attention is permutation-equivariant — it genuinely cannot distinguish 'dog bites man' from 'man bites dog', which is provable in two lines. Self-attention exists because an RNN's fixed-size state forgets, and attention connects any two positions in one step regardless of distance. Multi-head exists because one head can only produce one notion of relevance. Masking exists because training is parallel and a position must not see its own answer. The FFN exists because attention only mixes information between tokens; something has to transform it. Residuals exist because deep stacks need an unobstructed gradient path — I've measured about 780,000 times more gradient reaching the first block with pre-norm than post-norm. And normalisation keeps activations stable across dozens of layers. Once someone has the why for each, the how is much easier to retain, because each formula is now the answer to a question rather than a thing to memorise." }] },
    { level: "Senior", q: "Someone shows you a hand-worked transformer example. How much do you trust it?",
      strong: "Not at all until recomputed — and I have data on both outcomes.",
      answer: [{ t: "p", text: "I verify, because the outcomes genuinely vary and you can't predict which you'll get. I've now recomputed three worked examples from the same reference source. Two were completely correct — one a single-head trace with identity projections, one a fuller trace with real Q, K, V matrices and a proper FFN, both reproducing every value through to the final probability distribution, mat at 0.590. The third, a shorter attention example, had two of three output rows wrong: the arithmetic through softmax was right and the final weighted sums weren't. I only found it by recomputing and cross-checking against PyTorch's scaled_dot_product_attention, which agreed with my version to 1.67e-16. So my position is that hand-worked examples are extremely valuable and should always be verified, and that's cheap — twenty lines of NumPy. There's a second payoff beyond catching errors, which is that recomputation surfaces structure the prose misses. Working these traces I noticed the logits came out in exactly cancelling pairs, derived why from LayerNorm's zero-mean output combined with the toy vocabulary's complementary embeddings, and then confirmed the prediction held on a completely different set of weights. That's the kind of understanding you only get from the numbers." }] },
    { level: "Senior", q: "A toy example shows an attention head cleanly finding a sentence's subject. What should a learner take from that?",
      strong: "The mechanism, not the pattern — the weights were chosen to make it visible.",
      answer: [{ t: "p", text: "They should take away the mechanism and be careful about the pattern. The mechanism is real and important: because W_Q and W_K are different matrices, a token's query can look for something other than a copy of itself, and that's what makes structural relationships expressible at all. I can show the contrast directly — with identity projections the word 'sat' put 51% of its attention on itself, which is just self-similarity since a vector's dot product with itself is its squared norm. With genuinely different projections it put 51.5% on 'cat', its subject, and with a third set of weights 66.1%. What they should not take away is that this particular pattern was discovered. Those toy matrices were hand-picked so the attention pattern would be human-readable — in one case W_K was literally W_Q with two dimensions swapped. In a real model the matrices are dense floats produced only by gradient descent, and an equivalent pattern emerges because it lowered next-token loss, not because anyone designed it. The honest framing is that the toy shows what the mechanism can express; training is what determines what it does express. And when you go looking in real models, what you find is messier — I probed all 144 heads of BERT and found one clean previous-token head at weight 0.716, while most heads were dominated by attention sinks sending up to 86% of their mass to a structural token with no content." }] }
  ] }
});

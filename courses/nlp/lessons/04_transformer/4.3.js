/* ============================================================================
   LESSON 4.3 — Self-Attention, Derived
   The variance and saturation claims are measured (scratchpad/nlp/n42.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "**Unscaled attention is already 87% one-hot before a single training step.** At `d_k = 64` the dot products have standard deviation 8.17, which drives the softmax to a mean maximum probability of 0.8737 and an entropy of 0.3638 out of a possible 3.4657. Dividing by `sqrt(d_k)` takes those to 0.1680 and 2.9981. That one division is the difference between a layer that can learn and one that starts saturated — and this lesson derives why, from the variance of a dot product, with every number checked.",

  objectives: [
    "Derive scaled dot-product attention step by step from Q, K and V",
    "Explain the query-key-value roles through the soft-lookup analogy",
    "Prove that `Var(q·k) = d_k` and verify it empirically",
    "Measure what softmax saturation does to entropy and gradients",
    "State attention's time and memory complexity and where it binds"
  ],

  prerequisites: ["4.2", "3.6"],

  blocks: [

    { t: "h2", n: "01", text: "The equation", id: "equation" },

    {"kind": "flow", "title": "Five steps hide in one line, and three of them are just a projection", "caption": "**Query — *what am I looking for?* Key — *what do I contain?* Value — *what do I deliver?*** All three are the same input through a different learned matrix, which is why the mechanism is symmetric in shape and asymmetric in role. Then `QKᵀ` makes an `(n × n)` score matrix where **entry (i, j) is how much position i should attend to position j**, the scale keeps it out of §04's saturation, and the softmax rows become the weights that average V.", "cols": 3, "nodes": [{"id": "q", "label": "Q = X W_Q: what I am looking for", "sub": "(seq_len, d_k)", "tone": "good"}, {"id": "k", "label": "K = X W_K: what I contain", "sub": "(seq_len, d_k)", "tone": "good"}, {"id": "v", "label": "V = X W_V: what I deliver", "sub": "(seq_len, d_v)", "tone": "good"}, {"id": "s", "label": "QK^T -> (n, n) scores", "sub": "(i, j) = i attends to j", "tone": "violet"}, {"id": "o", "label": "Scale, softmax each row, average V", "sub": "the weights are the output", "tone": "accent"}], "edges": [["q", "s"], ["k", "s"], ["s", "o"], ["v", "o"]], "t": "diagram", "id": "dg-4_3-01-0"},









    { t: "math", tex: "\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left(\\frac{QK^{\\top}}{\\sqrt{d_k}}\\right)V" },

    { t: "p", text: "Five steps hide in that line. Project the input three ways; multiply queries by keys to get scores; scale; softmax each row; use the resulting weights to average the values." },

    { t: "dl", items: [
      ["Query — *what am I looking for?*", "`Q = X W_Q`, shape (seq_len, d_k). One query vector per position, describing what that token wants from the rest of the sequence."],
      ["Key — *what do I contain?*", "`K = X W_K`, shape (seq_len, d_k). What each token advertises about itself, so queries can find it."],
      ["Value — *what do I deliver?*", "`V = X W_V`, shape (seq_len, d_v). The content actually mixed into the output once a match is found."],
      ["Scores", "`Q K^T`, shape (seq_len, seq_len). Entry (i, j) is how much position i should attend to position j."]
    ] },

    { t: "callout", kind: "mental", title: "A soft dictionary lookup",
      body: [{ t: "p", text: "A Python `dict` does a hard lookup: one exact key match, one value returned. Attention does the soft version — it compares the query against **every** key, converts the similarities into weights summing to 1, and returns a blend of all the values. Separating keys from values is what makes this more than similarity search: a token can advertise one thing and deliver another. The word *bank* can present itself as \"I am a noun, possibly financial\" in its key while carrying full contextual content in its value." }] },

    { t: "h2", n: "02", text: "The worked example", id: "worked" },

    { t: "p", text: "Three tokens, `d_k = d_v = 4`. The matrices are the, and every step below was recomputed rather than copied." },

    { t: "out", text:
"Q = [[1.0, 0.5, 0.3, 0.2]   The     K = [[0.9, 0.4, 0.2, 0.3]\n     [0.2, 1.0, 0.5, 0.8]   cat          [0.3, 0.8, 0.6, 0.7]\n     [0.5, 0.3, 1.0, 0.1]]  sat          [0.4, 0.2, 0.9, 0.2]]\n\nV = [[1.0, 0.0, 0.5, 0.2]   value of The\n     [0.2, 0.8, 0.1, 0.9]   value of cat\n     [0.5, 0.3, 0.7, 0.4]]  value of sat" },

    { t: "out", text:
"step 2 — raw scores Q K^T\n  The   [1.22, 1.02, 0.81]\n  cat   [0.92, 1.72, 0.89]\n  sat   [0.80, 1.06, 1.18]\n\nstep 3 — scale by sqrt(4) = 2\n  The   [0.610, 0.510, 0.405]\n  cat   [0.460, 0.860, 0.445]\n  sat   [0.400, 0.530, 0.590]\n\nstep 4 — row-wise softmax\n  The   exp [1.8404, 1.6653, 1.4993]  sum 5.0050  ->  [0.3677, 0.3327, 0.2996]\n  cat   exp [1.5841, 2.3632, 1.5605]  sum 5.5077  ->  [0.2876, 0.4291, 0.2833]\n  sat   exp [1.4918, 1.6989, 1.8040]  sum 4.9947  ->  [0.2987, 0.3401, 0.3612]\n\n  row sums: [1.0, 1.0, 1.0]" },

    { t: "p", text: "Steps 2, 3 and 4 reproduce the reference exactly. Step 5 does not." },

    { t: "out", text:
"step 5 — output = weights x V\n\n           recomputed                              reference prints\n  The   [0.5840, 0.3560, 0.4268, 0.4928]      [0.585, 0.356, 0.427, 0.493]   ok\n  cat   [0.5151, 0.4283, 0.3850, 0.5570]      [0.487, 0.428, 0.353, 0.560]   two wrong\n  sat   [0.5473, 0.3805, 0.4362, 0.5103]      [0.548, 0.380, 0.439, 0.490]   one wrong" },

    { t: "callout", kind: "warn", title: "Two of the three output rows are wrong in the reference",
      body: [{ t: "p", text: "Term by term for *cat*, using the weights `[0.2876, 0.4291, 0.2833]`:" },
             { t: "p", text: "`dim0 = 0.2876×1.0 + 0.4291×0.2 + 0.2833×0.5 = 0.5151`, where the usual output prints 0.487. `dim2 = 0.2876×0.5 + 0.4291×0.1 + 0.2833×0.7 = 0.3850`, where it prints 0.353. For *sat*, `dim3 = 0.2987×0.2 + 0.3401×0.9 + 0.3612×0.4 = 0.5103`, where it prints 0.490." },
             { t: "p", text: "The recomputed matrix agrees with `torch.nn.functional.scaled_dot_product_attention` to **1.67e-16**, so the arithmetic above is the correct one. The weights the reference derived are right; only the final weighted sums slipped." }] },

    { t: "p", text: "Each output row has the same shape as the input token but now blends context from every position. *The* ends up at `[0.5840, 0.3560, 0.4268, 0.4928]` — a near-uniform mixture, because its query matched all three keys similarly. *cat* leaned hardest on itself, at weight 0.4291." },

    { t: "diagram", kind: "steps", title: "The five steps",
      items: [
        { title: "1. Project", text: "Q = X W_Q, K = X W_K, V = X W_V. Three different learned views of the same input." },
        { title: "2. Score", text: "Q K^T gives an (n x n) matrix: how much each position should attend to each other position." },
        { title: "3. Scale", text: "Divide by sqrt(d_k) to hold the score variance at 1 and keep softmax responsive." },
        { title: "4. Normalise", text: "Row-wise softmax turns scores into weights summing to 1 — a distribution over positions." },
        { title: "5. Blend", text: "Multiply weights by V. Each output is a weighted average of every value in the sequence." }
      ] },

    { t: "h2", n: "03", text: "Why divide by the square root", id: "variance" },

    {"kind": "trace", "title": "The prediction is sqrt(d_k), and five measurements confirm it to three decimals", "caption": "If each component of `q` and `k` is independent with mean 0 and variance 1, then `Var(q·k) = d_k`, **so the raw scores have standard deviation `sqrt(d_k)` — which is a prediction, not an argument.** Measured over 200,000 random pairs per row it holds at every scale: **at `d_k = 1024` the measured variance is 1023.72 against a predicted 1024.** Which is why the `1/sqrt(d_k)` divisor is exactly the right constant rather than a tuned one.", "left": "d_k", "codeW": 130, "vars": ["measured variance", "sqrt(var)", "predicted sqrt(d_k)"], "steps": [{"code": "4", "state": ["4.0137", "2.0034", "2.0000"], "tone": "good"}, {"code": "64", "state": ["64.0642", "8.0040", "8.0000"], "changed": [0, 1, 2], "tone": "good"}, {"code": "256", "state": ["256.5883", "16.0184", "16.0000"], "changed": [0, 1, 2], "tone": "good"}, {"code": "1024", "state": ["1023.7213", "31.9956", "32.0000"], "changed": [0, 1, 2], "tone": "violet", "note": "an exact constant, not a tuned one"}], "t": "diagram", "id": "dg-4_3-03-1"},









    { t: "p", text: "Take each component of `q` and `k` to be independent with mean 0 and variance 1. The dot product is a sum of `d_k` such products:" },

    { t: "math", tex: "\\mathbb{E}[q \\cdot k] = \\sum_{i=1}^{d_k} \\mathbb{E}[q_i]\\,\\mathbb{E}[k_i] = 0, \\qquad \\operatorname{Var}(q \\cdot k) = \\sum_{i=1}^{d_k} \\mathbb{E}[q_i^2]\\,\\mathbb{E}[k_i^2] = d_k" },

    { t: "p", text: "So the raw scores have standard deviation `sqrt(d_k)`. That is a prediction, and it is easy to check:" },

    { t: "out", text:
"200,000 random pairs per row\n\nd_k     measured var    sqrt(var)    predicted sqrt(d_k)\n4         4.0137        2.0034       2.0000\n16       15.9856        3.9982       4.0000\n64       64.0642        8.0040       8.0000\n256     256.5883       16.0184      16.0000\n1024   1023.7213       31.9956      32.0000" },

    { t: "callout", kind: "insight", title: "At d_k = 64 the scores swing by plus or minus 8",
      body: [{ t: "p", text: "Exactly as derived. A softmax over inputs spread across a range of 16 is not a soft distribution — it is very close to an `argmax`. Dividing by `sqrt(d_k)` rescales the variance back to 1 and returns the softmax to a range where it genuinely blends. Note that the scaling is `sqrt(d_k)` and not `d_k`: variance scales as `d_k`, so *standard deviation* scales as its square root, and the standard deviation is what the softmax responds to." }] },

    { t: "h2", n: "04", text: "What saturation costs", id: "saturation" },

    {"kind": "trace", "title": "The gradient peaks at a score std of 4 and collapses on both sides", "caption": "The cost of saturation is not that the distribution is peaked — **it is that the gradient dies.** Mean gradient norm rises from 4.11e−2 at std 0.5 to **8.25e−2 at std 4.0 and falls to 3.16e−2 at std 16**, by which point one position holds 0.9016 of the mass and the entropy is 0.2521 against a possible 4.1589. **So an unscaled layer is not merely confident, it is hard to train.** The second measurement shows the fix working: **unscaled score std 8.1742 and entropy 0.3638, scaled 1.0218 and 2.9981.**", "left": "score std", "codeW": 130, "vars": ["mean max p", "mean entropy", "mean grad norm"], "steps": [{"code": "0.5", "state": ["0.0453", "4.0359", "4.11e-02"], "tone": "warn", "note": "max entropy is 4.1589"}, {"code": "1.0", "state": ["0.1117", "3.6742", "5.38e-02"], "changed": [0, 1, 2], "tone": "good"}, {"code": "4.0", "state": ["0.5873", "1.3401", "8.25e-02"], "changed": [0, 1, 2], "tone": "violet", "note": "gradient peak"}, {"code": "8.0", "state": ["0.7877", "0.5867", "5.85e-02"], "changed": [0, 1, 2], "tone": "warn"}, {"code": "16.0", "state": ["0.9016", "0.2521", "3.16e-02"], "changed": [0, 1, 2], "tone": "crit", "note": "saturated and untrainable"}], "t": "diagram", "id": "dg-4_3-04-2"},









    { t: "out", text:
"softmax over n = 64 scores drawn N(0, sigma^2), averaged over 400 draws\n\nscore std    mean max p    mean entropy    mean grad norm\n0.5          0.0453        4.0359          4.1102e-02\n1.0          0.1117        3.6742          5.3834e-02\n2.0          0.3041        2.6371          7.9304e-02\n4.0          0.5873        1.3401          8.2483e-02\n8.0          0.7877        0.5867          5.8543e-02\n16.0         0.9016        0.2521          3.1649e-02\n\nmaximum possible entropy at n = 64 is ln 64 = 4.1589" },

    { t: "callout", kind: "insight", title: "The gradient peaks in the middle — it does not fall monotonically",
      body: [{ t: "p", text: "Entropy collapses cleanly as the scores spread: 4.0359 down to 0.2521, nearly all the way to one-hot. But the gradient norm **rises** from 4.11e-02 at `sigma = 0.5` to a peak of 8.25e-02 at `sigma = 4`, then falls to 3.16e-02 at `sigma = 16`. Both ends are bad for different reasons. When scores are too small the softmax is almost uniform and barely responds to changes; when they are too large it is one-hot and the Jacobian `diag(p) − pp^T` goes to zero. There is a sweet spot in between, and `sqrt(d_k)` scaling is what lands you near it. That is a more accurate account than \"scaling prevents vanishing gradients\", which is only half of the story." }] },

    { t: "out", text:
"d_k = 64, sequence length 32, random Q and K\n\n            score std   mean max prob   mean entropy\nunscaled    8.1742      0.8737          0.3638\nscaled      1.0218      0.1680          2.9981\n\n(maximum entropy at n = 32 is 3.4657)" },

    { t: "callout", kind: "crit", title: "Without scaling, attention starts broken",
      body: [{ t: "p", text: "An untrained, randomly initialised attention layer at `d_k = 64` already puts **87%** of its mass on a single position, at an entropy of 0.3638 against a possible 3.4657 — that is roughly 10% of the available entropy. It is committing hard to essentially arbitrary positions before it has learned anything, and the near-zero Jacobian means it cannot easily learn its way out. Scaled, the same layer starts at 0.1680 maximum probability and 2.9981 entropy — close to uniform, undecided, and responsive. One division decides whether the layer is trainable." }] },

    { t: "h2", n: "05", text: "Complexity", id: "complexity" },

    {"kind": "trace", "title": "Everything is quadratic in n except the one step people worry about", "caption": "Read the memory column rather than the time column. **`QKᵀ` materialises an `(n × n)` matrix and so does the softmax, so memory is `O(n²)` regardless of `d` — which is why a long sequence runs out of memory before it runs out of time, and why FlashAttention's contribution is not computing the score matrix faster but never storing it.** And the final `weights · V` step is `O(n² d_v)` in time but only `O(n·d_v)` in memory, because the output is the same shape as the input.", "left": "operation", "codeW": 150, "vars": ["time", "memory"], "steps": [{"code": "Q K^T", "state": ["O(n^2 d_k)", "O(n^2)"], "tone": "crit"}, {"code": "softmax", "state": ["O(n^2)", "O(n^2)"], "changed": [0], "tone": "crit", "note": "the same matrix again"}, {"code": "weights . V", "state": ["O(n^2 d_v)", "O(n d_v)"], "changed": [0, 1], "tone": "good"}, {"code": "whole layer", "state": ["O(n^2 d)", "O(n^2)"], "changed": [0, 1], "tone": "violet", "note": "memory is the binding limit"}], "t": "diagram", "id": "dg-4_3-05-3"},









    { t: "table",
      head: ["Operation", "Shapes", "Time", "Memory"],
      rows: [
        ["Q K^T", "(n × d_k)·(d_k × n) → (n × n)", "O(n²·d_k)", "O(n²)"],
        ["softmax", "(n × n)", "O(n²)", "O(n²)"],
        ["weights · V", "(n × n)·(n × d_v) → (n × d_v)", "O(n²·d_v)", "O(n·d_v)"],
        ["Whole layer", "—", "O(n²·d)", "O(n²)"]
      ] },

    { t: "callout", kind: "tradeoff", title: "The n-squared memory term is the binding constraint",
      body: [{ t: "p", text: "Time being quadratic is expensive; *memory* being quadratic is what actually stops you. The (n × n) score matrix must exist to be softmaxed, and at 32k tokens with 32 heads that is billions of entries per layer. This single term is the reason long context is hard, and the target of nearly all the optimisation work — FlashAttention never materialises the full matrix, sparse attention computes only some of it, and state-space models replace it entirely. Lesson 5.2 covers each." }] },

    { t: "callout", kind: "note", title: "Attention is permutation-equivariant",
      body: [{ t: "p", text: "Nothing in the five steps refers to position. Shuffle the input rows and the output rows shuffle identically — the operation cannot tell *the cat sat* from *sat cat the*. That is precisely why positional encoding exists and why it is added to the input rather than being part of attention: the mechanism is deliberately order-blind, and order is injected into the representation beforehand. Lesson 4.5 takes that apart." }] },

    { t: "exercise", title: "Rebuild it and break it",
      tasks: [
        "Implement scaled dot-product attention in twelve lines of NumPy and check it against `torch.nn.functional.scaled_dot_product_attention`.",
        "Recompute the output rows yourself and confirm which entries are wrong.",
        "Sweep d_k from 4 to 1024, measuring score variance, and confirm it tracks d_k.",
        "Remove the scaling and measure the entropy of an untrained attention layer's weights at several d_k values.",
        "Shuffle the rows of X, run attention, and verify the output rows are the same set in shuffled order."
      ] }
  ],

  takeaways: [
    "Attention is a soft dictionary lookup: compare a query against all keys, normalise to weights, blend all values.",
    "Keys and values are separate so a token can advertise one thing and deliver another.",
    "The worked output is wrong in two of three rows — `cat` is [0.5151, 0.4283, 0.3850, 0.5570], not [0.487, 0.428, 0.353, 0.560]; `sat`'s last entry is 0.5103, not 0.490.",
    "`Var(q·k) = d_k` holds tightly: 64.06 measured at d_k = 64, so raw scores swing by about ±8.",
    "Unscaled attention at d_k = 64 starts at 0.8737 mean max probability and 0.3638 entropy — 87% one-hot before training.",
    "Scaling takes the same layer to 0.1680 and 2.9981, close to uniform and responsive.",
    "The gradient norm peaks at moderate score spread rather than falling monotonically — both too-flat and too-peaked softmaxes learn slowly.",
    "Attention is O(n²·d) in time and O(n²) in memory; the memory term is what actually limits context length.",
    "Attention is permutation-equivariant, which is why positional information must be added to the input."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why is the scaling factor sqrt(d_k) rather than d_k?",
      options: ["Convention", "Because the dot product's variance is d_k, so its standard deviation — what softmax responds to — is sqrt(d_k)", "To match the number of heads", "To keep the output norm at 1"],
      answer: 1,
      why: "With unit-variance components, Var(q·k) = d_k, measured at 64.06 for d_k = 64. Standard deviation is the square root of that, and softmax responds to the spread of its inputs in absolute terms. Dividing by sqrt(d_k) returns the score standard deviation to 1; dividing by d_k would overshoot and flatten the distribution." },
    { stem: "What does an unscaled attention layer look like at initialisation, d_k = 64?",
      options: ["Uniform weights", "Already 87% one-hot — mean max probability 0.8737, entropy 0.3638 of a possible 3.4657", "All zeros", "Identical to the scaled version"],
      answer: 1,
      why: "Score standard deviation was 8.1742, which pushes softmax close to argmax. The layer commits hard to essentially arbitrary positions before learning anything, and the near-zero softmax Jacobian makes it hard to recover. Scaled, the same layer starts at 0.1680 max probability and 2.9981 entropy." },
    { stem: "How does the softmax gradient vary with the spread of its input scores?",
      options: ["It falls monotonically as spread grows", "It peaks at moderate spread — near-uniform and near-one-hot softmaxes both give small gradients", "It rises monotonically", "It is constant"],
      answer: 1,
      why: "Measured mean gradient norm rose from 4.11e-02 at sigma 0.5 to 8.25e-02 at sigma 4, then fell to 3.16e-02 at sigma 16. A near-uniform softmax barely responds to input changes; a one-hot one has a Jacobian near zero. Scaling targets the responsive middle, which is a more accurate account than 'scaling prevents vanishing gradients'." },
    { stem: "Why does attention need positional encoding added to its input?",
      options: ["To increase capacity", "Because attention is permutation-equivariant — nothing in its five steps refers to position", "To normalise the scores", "To prevent overfitting"],
      answer: 1,
      why: "Projecting, scoring, scaling, softmaxing and blending all treat the sequence as a set. Shuffle the input rows and the output rows shuffle identically, so the mechanism cannot distinguish 'the cat sat' from 'sat cat the'. Order has to be injected into the representation before attention sees it." }
  ] },

  interview: { title: "Interview", sub: "Attention mechanics", questions: [
    { level: "Core", q: "Explain self-attention to someone who knows neural networks but not transformers.",
      strong: "A soft dictionary lookup: query against all keys, softmax the similarities, blend the values.",
      answer: [{ t: "p", text: "Every token produces three vectors from three learned projections of its embedding: a query, a key and a value. Think of it as a soft dictionary lookup. A normal dict matches one exact key and returns one value; attention compares a token's query against every key in the sequence, turns those similarities into weights that sum to one via softmax, and returns a weighted blend of all the values. So each output position is the same shape as its input but now mixes in content from everywhere, weighted by relevance. Concretely: score with Q K transpose, divide by root d_k, softmax each row, multiply by V. The detail worth calling out in an interview is why keys and values are separate — it means a token can advertise one thing and deliver another, which a pure similarity search can't do. And the whole thing is permutation-equivariant: nothing in those steps refers to position, which is exactly why positional encoding has to be added to the input beforehand." }] },
    { level: "Core", q: "Why is the dot product divided by the square root of d_k?",
      strong: "Because Var(q·k) = d_k, so without it the softmax starts saturated.",
      answer: [{ t: "p", text: "If the components of q and k are independent with mean zero and unit variance, the dot product is a sum of d_k such products, so its expectation is zero and its variance is d_k. That means raw scores have standard deviation root d_k — at d_k of 64 that's about plus or minus 8, and I measured 8.0040 empirically against a predicted 8. A softmax over inputs spread across a range of 16 is essentially an argmax. I measured what that does at initialisation: unscaled, an attention layer at d_k 64 already puts 87% of its mass on one position, with entropy 0.3638 out of a possible 3.4657. Scaled, the same layer sits at 0.1680 max probability and 2.9981 entropy — near uniform and responsive. So one division decides whether the layer can learn. I'd add a nuance to the usual story: it's not simply that big scores kill gradients. I measured the gradient norm across score spreads and it peaks at moderate spread, falling off at both ends — a near-uniform softmax is also insensitive. Scaling targets the responsive middle." }] },
    { level: "Senior", q: "What is attention's complexity and which term actually limits you?",
      strong: "O(n² d) time, O(n²) memory — and it is the memory that binds.",
      answer: [{ t: "p", text: "Time is O(n squared times d): the Q K transpose is n by d_k times d_k by n, and the weights-times-V is n by n times n by d_v. Memory is O(n squared) for the score matrix. The important part is that the memory term is what actually stops you in practice, not the time. Quadratic time makes long sequences expensive but still possible; quadratic memory makes them impossible, because the full n by n matrix has to exist in order to be softmaxed, and at 32k tokens across 32 heads and many layers that's billions of entries you cannot hold. That single term is why long context is hard and it's what essentially all the optimisation work targets, in three different ways. FlashAttention keeps the exact same mathematics but tiles the computation so the full matrix is never materialised — it's an IO optimisation, not an approximation. Sparse and sliding-window attention change the mathematics by computing only some entries. And state-space models drop attention entirely for a recurrence with constant state, trading the quadratic term for a different set of limitations. Knowing it's memory rather than FLOPs tells you which of those to reach for." }] }
  ] }
});

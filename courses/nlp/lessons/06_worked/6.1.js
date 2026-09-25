/* ============================================================================
   LESSON 6.1 — The Toy Model: Tokenize, Embed, Position
   Mirrors 02a_Transformer_Worked_Example.md · §0-③. Every number in the
   reference's setup recomputed — and unlike the worked attention example in
   4.3, this one is correct throughout (scratchpad/nlp/n61.py).
   ========================================================================= */
EC.receiveLesson({
  id: "6.1",

  lede: "**This module checks every number in the reference's hand-computed transformer, and all of them are right.** That is worth saying plainly, because lesson 4.3 found two wrong rows in a different worked example from the same source. Here — six words, four dimensions, one head, one layer — the arithmetic holds from tokenisation through to a 47.51% prediction of *mat*. This lesson covers the setup and the first three steps, with the values you can check on paper.",

  objectives: [
    "State the toy model's configuration and how it maps to a real one",
    "Perform the embedding lookup and understand what it is not doing",
    "Compute sinusoidal positional encoding at d = 4 by hand",
    "Explain why position is added rather than concatenated",
    "Recognise which simplifications are pedagogical and which are real"
  ],

  prerequisites: ["5.12", "4.2"],

  blocks: [

    { t: "h2", n: "01", text: "The toy model", id: "setup" },

    { t: "table",
      head: ["Component", "Toy value", "Real GPT-3"],
      rows: [
        ["Vocabulary size", "6 words", "50,257"],
        ["Embedding dim `d_model`", "4", "12,288"],
        ["Attention heads", "1", "96"],
        ["Transformer layers", "1", "96"],
        ["FFN hidden size", "4", "49,152"]
      ] },

    { t: "out", text:
"the vocabulary — six words, each with a 4-number embedding\n\n  ID  word     embedding\n   0  the      [1, 0, 1, 0]\n   1  cat      [0, 1, 1, 0]\n   2  sat      [1, 1, 0, 0]\n   3  on       [0, 0, 1, 1]\n   4  mat      [1, 0, 0, 1]\n   5  <eos>    [0, 1, 0, 1]" },

    { t: "p", text: "That table is the token embedding matrix `E`, shape 6×4. In a real model these numbers are learned; here they are chosen to keep the arithmetic followable. The task is to predict what follows *\"the cat sat\"*." },

    { t: "callout", kind: "note", title: "Two simplifications, and what stays real",
      body: [{ t: "p", text: "The reference makes exactly two concessions. **The attention projections are the identity**, so `Q = K = V = X` — the token vectors themselves act as queries, keys and values. **The FFN uses identity weights with a bias**, rather than large learned matrices. Everything else — the scaling by `sqrt(d_k)`, the causal mask, the softmax, both residuals, both LayerNorms, weight tying at the output — is exactly what a real transformer does. Lesson 6.2 works the version with genuine `W_Q`, `W_K`, `W_V`, so the simplification is temporary rather than a permanent hand-wave." }] },

    { t: "h2", n: "02", text: "Tokenise", id: "tokenise" },

    { t: "out", text:
"\"the cat sat\"  ->  [\"the\", \"cat\", \"sat\"]  ->  [0, 1, 2]" },

    { t: "p", text: "One word, one token — a real tokenizer uses subwords, as lesson 4.8 measured in detail, but nothing downstream cares. The stack receives integers and never sees the text again. Whatever the tokenizer decides is the model's entire view of the input." },

    { t: "h2", n: "03", text: "Embedding lookup", id: "embed" },

    { t: "out", text:
"ID 0 \"the\"  ->  E[0] = [1, 0, 1, 0]\nID 1 \"cat\"  ->  E[1] = [0, 1, 1, 0]\nID 2 \"sat\"  ->  E[2] = [1, 1, 0, 0]" },

    { t: "callout", kind: "insight", title: "A lookup is a matrix multiply in disguise",
      body: [{ t: "p", text: "Selecting row `i` of `E` is identical to multiplying a one-hot vector by `E`. That equivalence is not a curiosity — it is why the embedding table can be trained by ordinary backpropagation, and why **weight tying** at the output in lesson 6.3 works: the same matrix maps one-hot to vector on the way in and vector to logits on the way out. Implementations use a gather because it is far faster than multiplying by a mostly-zero matrix, but the mathematics is a linear layer." }] },

    { t: "p", text: "These vectors carry identity but no order — the model at this point cannot distinguish *\"the cat sat\"* from *\"sat cat the\"*, exactly as lesson 4.9 proved for attention in general." },

    { t: "h2", n: "04", text: "Positional encoding", id: "position" },

    { t: "math", tex: "PE_{(pos,\\,2i)} = \\sin\\!\\left(\\frac{pos}{10000^{2i/d}}\\right), \\qquad PE_{(pos,\\,2i+1)} = \\cos\\!\\left(\\frac{pos}{10000^{2i/d}}\\right)" },

    { t: "p", text: "At `d = 4` there are two frequency pairs, so the four dimensions are `[sin(pos), cos(pos), sin(pos/100), cos(pos/100)]` — one fast pair and one slow pair, the miniature version of the geometric spectrum from lesson 4.2." },

    { t: "out", text:
"pos 0:  [0.0000,  1.0000, 0.0000, 1.0000]\npos 1:  [0.8415,  0.5403, 0.0100, 1.0000]\npos 2:  [0.9093, -0.4161, 0.0200, 0.9998]\n\nreference: [0.00,1.00,0.00,1.00] / [0.84,0.54,0.01,1.00] / [0.91,-0.42,0.02,1.00]\nreproduces exactly" },

    { t: "callout", kind: "insight", title: "Watch the two pairs move at different rates",
      body: [{ t: "p", text: "From position 0 to 2 the **fast** pair swings from `[0.00, 1.00]` to `[0.91, -0.42]` — the cosine has changed sign. The **slow** pair moves from `[0.00, 1.00]` to `[0.02, 0.9998]`, barely at all. With only three positions the slow pair is nearly useless, which is precisely the point: it is there to distinguish position 5 from position 500, not position 0 from position 2. A real model with `d_model = 768` has 384 such pairs spanning wavelengths from 6.28 to over 60,000 positions." }] },

    { t: "h2", n: "05", text: "The layer input", id: "input" },

    { t: "out", text:
"z0 = E[the] + PE(0) = [1,0,1,0] + [0.00, 1.00,0.00,1.00] = [1.0000, 1.0000, 1.0000, 1.0000]\nz1 = E[cat] + PE(1) = [0,1,1,0] + [0.84, 0.54,0.01,1.00] = [0.8415, 1.5403, 1.0100, 1.0000]\nz2 = E[sat] + PE(2) = [1,1,0,0] + [0.91,-0.42,0.02,1.00] = [1.9093, 0.5839, 0.0200, 0.9998]\n\n       X = | 1.0000   1.0000   1.0000   1.0000 |   the  (position 0)\n           | 0.8415   1.5403   1.0100   1.0000 |   cat  (position 1)\n           | 1.9093   0.5839   0.0200   0.9998 |   sat  (position 2)\n\n                                    shape (3 tokens x 4 dims)" },

    { t: "callout", kind: "trap", title: "Addition looks lossy and is not",
      body: [{ t: "p", text: "Summing content and position into the same four numbers seems to destroy both — `z0` is now `[1, 1, 1, 1]`, which is not obviously *the* at position 0. The objection is reasonable and the answer is that the network never needs to recover them separately; it only needs *some* linear projection that responds to whichever it cares about, and with enough dimensions such projections exist. At `d = 4` this is genuinely cramped and the toy model is working harder than a real one would. At 768 dimensions there is ample room, which is why concatenation — which would spend a fixed fraction of the width on position forever — was not worth it." }] },

    { t: "h2", n: "06", text: "The journey ahead", id: "journey" },

    { t: "diagram", kind: "steps", title: "What the remaining lessons compute",
      items: [
        { title: "6.2 — Self-attention", text: "Q K^T, scale by root d_k, causal mask, softmax, blend the values. Both with identity projections and with real learned W_Q, W_K, W_V." },
        { title: "6.3 — Residual, norm, FFN, head", text: "Add the input back, normalise to mean 0 and variance 1, transform each token alone, normalise again, project to the vocabulary and softmax." },
        { title: "6.4 to 6.7 — Encoder-decoder", text: "The same machinery applied to translation, including cross-attention, the training loss and autoregressive inference." }
      ] },

    { t: "exercise", title: "Check the setup by hand",
      tasks: [
        "Compute PE(3) and PE(4) with a calculator and confirm the fast pair has completed more than a full cycle by position 7.",
        "Verify that PE(pos+1) is the same rotation of PE(pos) at two different starting positions, as lesson 4.2 established.",
        "Compute X for a different three-word sentence from the same vocabulary.",
        "Write the embedding lookup as an explicit one-hot matrix multiply and confirm it gives the same rows.",
        "Work out at which position the slow pair's first component first exceeds 0.5."
      ] }
  ],

  takeaways: [
    "The toy model is 6 words, d_model 4, 1 head, 1 layer — against GPT-3's 50,257 / 12,288 / 96 / 96.",
    "Two simplifications only: identity attention projections and an identity FFN. Scaling, masking, softmax, residuals, norms and weight tying are all real.",
    "An embedding lookup is exactly a one-hot matrix multiply, which is why it trains by backpropagation and why output weight tying works.",
    "At d = 4 the positional encoding has one fast pair and one slow pair: [sin(pos), cos(pos), sin(pos/100), cos(pos/100)].",
    "From position 0 to 2 the fast pair's cosine flips sign while the slow pair moves from 1.0000 to 0.9998 — the slow pair exists for distant positions, not adjacent ones.",
    "Every value in the reference's setup reproduces exactly, unlike the worked attention example checked in lesson 4.3.",
    "X is (3 tokens × 4 dims), with z0 = [1, 1, 1, 1] and z2 = [1.9093, 0.5839, 0.0200, 0.9998].",
    "Adding position into the content dimensions looks lossy but is not, because the network needs projections that respond to each, not a way to separate them."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Which parts of the toy model are simplified, and which are real?",
      options: ["Everything is simplified", "Only the attention projections (identity) and the FFN weights — scaling, masking, softmax, residuals, norms and weight tying are all genuine", "Only the vocabulary size", "The softmax is approximated"],
      answer: 1,
      why: "Setting Q = K = V = X and using identity FFN weights keeps the arithmetic hand-checkable. Everything else is exactly what a real transformer computes, and lesson 6.2 works the version with genuine learned W_Q, W_K and W_V so even the first simplification is temporary." },
    { stem: "Why is an embedding lookup equivalent to a matrix multiply?",
      options: ["It is not — lookup is faster", "Selecting row i of E is identical to multiplying a one-hot vector by E, which is why it trains by backpropagation and why output weight tying works", "Because the embeddings are orthogonal", "Because d_model is small"],
      answer: 1,
      why: "The gather is an implementation optimisation over multiplying by a mostly-zero matrix, but mathematically it is a linear layer. That equivalence is what lets the same matrix map one-hot to vector on the way in and vector to logits on the way out — weight tying, which lesson 6.3 uses." },
    { stem: "At d = 4, what does the slow frequency pair contribute over three positions?",
      options: ["Most of the positional signal", "Almost nothing — it moves from 1.0000 to 0.9998, because it exists to distinguish distant positions rather than adjacent ones", "It distinguishes the first from the last token", "It encodes the token identity"],
      answer: 1,
      why: "The fast pair's cosine flips from 1.00 to -0.42 across the same three positions while the slow pair barely moves. Geometric frequency spacing gives resolution at every scale simultaneously — the slow dimensions separate position 5 from position 500, not position 0 from position 2." },
    { stem: "Why is positional information added to the embedding rather than concatenated?",
      options: ["Addition is more accurate", "Concatenation would permanently spend a fixed fraction of d_model on position; addition keeps the full width for content and the network learns projections that respond to each", "Concatenation breaks the residual connection", "The dimensions must match the vocabulary"],
      answer: 1,
      why: "Summing looks lossy — z0 becomes [1,1,1,1] — but the network never needs to separate the two signals, only to have projections sensitive to whichever matters. At d = 4 that is genuinely cramped; at 768 there is ample room, which is why the field settled on addition." }
  ] },

  interview: { title: "Interview", sub: "Model inputs", questions: [
    { level: "Core", q: "What happens between raw text and the first transformer block?",
      strong: "Tokenise to ids, look up embeddings, add positional encoding.",
      answer: [{ t: "p", text: "Three steps. Tokenisation turns text into integer ids using a subword vocabulary — after this point the model never sees characters again, so whatever the tokenizer decides is the model's entire view of the input. Then an embedding lookup maps each id to a learned vector, which is mathematically a one-hot times the embedding matrix, implemented as a gather for speed. That equivalence matters because it's why the same matrix can be reused at the output as the LM head, which is weight tying. Then positional encoding is added — added, not concatenated — because attention is permutation-equivariant and would otherwise treat the sequence as a set. On the toy model I worked through, 'the cat sat' becomes ids [0,1,2], those index three 4-dimensional vectors, and sinusoidal position vectors are summed in, giving a 3 by 4 matrix X that is the layer input. The thing people find counterintuitive is the addition: summing content and position into the same dimensions looks like it destroys both. It doesn't, because the network only needs projections that respond to each signal, not a way to recover them separately, and at realistic widths there's plenty of room." }] },
    { level: "Senior", q: "Why work through a toy model by hand when you can just read the code?",
      strong: "Because it makes every claim checkable, and errors in published explanations are common.",
      answer: [{ t: "p", text: "Because it converts explanations into claims you can falsify. Code tells you what an implementation does; hand-computing tells you whether what it does matches what the explanation says it does, and those diverge more than you'd expect. In this course I checked a worked attention example from a reference document and found two of three output rows wrong — the arithmetic through softmax was right and the final weighted sums weren't. I only found it because I recomputed rather than read. Then I checked this second, longer worked example from the same source and every number was correct through to the final probability. Both facts are useful: one tells you to verify, the other tells you this particular walkthrough can be trusted. There's a second reason, which is that hand-computation surfaces structure the prose misses. Working the toy model's logits I noticed they came out perfectly antisymmetric — the plus 0.4264 and end-of-sequence minus 0.4264, and so on for all three pairs — which turns out to be a provable consequence of LayerNorm forcing the hidden state's sum to zero combined with a vocabulary whose embeddings pair up to all-ones. That's not in the reference, and I'd never have seen it from reading." }] },
    { level: "Senior", q: "A model's first layer receives embeddings plus positions. What could go wrong before any attention runs?",
      strong: "Tokenisation mismatch, positional table overflow, and scale imbalance between the two signals.",
      answer: [{ t: "p", text: "Three things, all of which I've seen produce silent degradation rather than errors. First, tokenisation mismatch between training and serving — if the tokenizer version or the preprocessing differs, the ids index a vocabulary that means something else. I measured a case where a missing lowercase call was completely invisible on an uncased checkpoint and split one input from 2 tokens into 7 on a cased one, with no exception anywhere. Tokenizer and checkpoint have to be versioned together. Second, positional capacity: a learned positional table has no row past max_len, so a longer sequence either raises an index error or, worse, gets silently truncated somewhere upstream. Sinusoidal encoding computes fine at any position but the layers above it were never trained on those values, so it degrades rather than failing loudly. Third, scale imbalance. The relative magnitude of the token embedding and the positional signal determines which one dominates the first layer's input, and it varies a lot by model. Tracing GPT-2 I found the positional embedding's RMS was actually twice the token embedding's for the first few positions — the opposite of what the standard sqrt(d_model) scaling story predicts. If you're implementing from a paper, check what your actual checkpoint does rather than what the formula says, because getting it wrong changes every representation without any error." }] }
  ] }
});

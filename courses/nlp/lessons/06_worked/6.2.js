/* ============================================================================
   LESSON 6.2 — Self-Attention on Real Numbers
   Mirrors 02a_Transformer_Worked_Example.md · §④ and §④½. Both versions are
   recomputed: with identity projections "sat" attends to itself at 0.510;
   with genuine W_Q, W_K it attends to "cat" at 0.5149 (scratchpad/nlp/n61.py).
   ========================================================================= */
EC.receiveLesson({
  id: "6.2",

  lede: "**With identity projections, `sat` puts 51.0% of its attention on itself. With genuine `W_Q` and `W_K`, it puts 51.5% on `cat` — its own subject.** Same sentence, same embeddings, same formula. The only change is that queries and keys are now produced by *different* matrices, and that single change turns a token that was staring at itself into one that found the noun it belongs to. This lesson computes both versions by hand and shows exactly where the difference enters.",

  objectives: [
    "Compute attention scores, scaling, masking, softmax and the value blend by hand",
    "Verify the causal mask makes future weights exactly zero",
    "Project X into genuinely different Q, K and V",
    "Show why W_Q ≠ W_K is what creates linguistic structure",
    "Explain the role of the output projection W_O"
  ],

  prerequisites: ["6.1", "4.3"],

  blocks: [

    { t: "h2", n: "01", text: "Version one: identity projections", id: "identity" },

    { t: "p", text: "Start with `Q = K = V = X`, so a token's query, key and value are all just the token's own vector. This keeps the arithmetic minimal while every other step stays real." },

    { t: "out", text:
"step 4a — raw scores Q K^T\n\n              the     cat     sat\n  the   [   4.0000  4.3917  3.5129 ]\n  cat   [   4.3917  5.1006  3.5259 ]\n  sat   [   3.5129  3.5259  4.9863 ]\n\nreference: 4.00 4.39 3.51 / 4.39 5.10 3.52 / 3.51 3.52 4.98" },

    { t: "p", text: "Entry `[i][j]` is how relevant token `j` is to token `i` — rows are the token doing the looking, columns the token being looked at. The matrix is symmetric here precisely *because* `Q = K`; that symmetry is an artefact of the simplification and disappears in section 04." },

    { t: "out", text:
"step 4b — scale by sqrt(d_k) = sqrt(4) = 2\n\n  the   [ 2.0000  2.1959  1.7565 ]\n  cat   [ 2.1959  2.5503  1.7629 ]\n  sat   [ 1.7565  1.7629  2.4932 ]\n\nstep 4c — causal mask: future cells to -inf\n\n  the   [ 2.0000    -inf    -inf  ]\n  cat   [ 2.1959  2.5503    -inf  ]\n  sat   [ 1.7565  1.7629  2.4932 ]" },

    { t: "out", text:
"step 4d — softmax each row\n\n  the   [ 1.0000  0.0000  0.0000 ]\n  cat   [ 0.4123  0.5877  0.0000 ]\n  sat   [ 0.2442  0.2458  0.5101 ]\n\nreference: 1.000/0/0 · 0.412/0.588/0 · 0.244/0.246/0.510  — reproduces exactly" },

    { t: "callout", kind: "insight", title: "The first row is forced, and that is informative",
      body: [{ t: "p", text: "*the* is the first token, so after masking it has exactly one option and its weight is **1.0000** by necessity — not because the model decided anything. This is worth noticing whenever you inspect attention maps: early positions have few choices, so their distributions look confident for structural reasons rather than semantic ones. It is the same caution as the attention sinks in lesson 4.4, where apparent confidence turned out to be mass with nowhere else to go." }] },

    { t: "out", text:
"step 4e — blend the values\n\n  attn_sat = 0.2442 * z_the + 0.2458 * z_cat + 0.5101 * z_sat\n\n    dim0: 0.2442*1.0000 + 0.2458*0.8415 + 0.5101*1.9093 = 1.4248\n    dim1: 0.2442*1.0000 + 0.2458*1.5403 + 0.5101*0.5839 = 0.9205\n    dim2: 0.2442*1.0000 + 0.2458*1.0100 + 0.5101*0.0200 = 0.5026\n    dim3: 0.2442*1.0000 + 0.2458*1.0000 + 0.5101*0.9998 = 0.9999\n\n  attn_sat = [1.4248, 0.9205, 0.5026, 0.9999]\n  reference: [1.42, 0.92, 0.50, 1.00]" },

    { t: "callout", kind: "trap", title: "With Q = K, a token mostly attends to itself",
      body: [{ t: "p", text: "*sat* gave **0.5101** to itself and roughly a quarter each to the others. That is not a discovered relationship — it is arithmetic. When `Q = K`, the score of token `i` against token `j` is `z_i · z_j`, and a vector's dot product with itself is its squared norm, which is the largest entry in its row unless some other vector is both longer and well aligned. **Self-attention with identity projections is mostly self-similarity.** That is precisely the limitation the next section removes." }] },

    { t: "h2", n: "02", text: "Why three matrices", id: "why" },

    { t: "table",
      head: ["Vector", "Question it answers", "Search-engine analogy"],
      rows: [
        ["Query `q`", "What am I looking for?", "The text you type into the search box"],
        ["Key `k`", "What do I offer, so others can find me?", "The indexed terms of a page"],
        ["Value `v`", "What do I hand over if attended to?", "The page content you actually read"]
      ] },

    { t: "out", text:
"three genuinely different matrices\n\n         W_Q            W_K            W_V\n       | 1  0 |       | 0  1 |       | 0  0 |\n       | 0  1 |       | 1  0 |       | 0  0 |\n       | 0  0 |       | 0  0 |       | 1  0 |\n       | 0  0 |       | 0  0 |       | 0  1 |\n\n  reads dims 0,1   reads dims 0,1   reads dims 2,3\n  in order         SWAPPED          (the 'content')" },

    { t: "h2", n: "03", text: "Version two: real projections", id: "real" },

    { t: "out", text:
"        Q (queries)          K (keys)             V (values)\n  the [ 1.0000  1.0000 ]  [ 1.0000  1.0000 ]  [ 1.0000  1.0000 ]\n  cat [ 0.8415  1.5403 ]  [ 1.5403  0.8415 ]  [ 1.0100  1.0000 ]\n  sat [ 1.9093  0.5839 ]  [ 0.5839  1.9093 ]  [ 0.0200  0.9998 ]" },

    { t: "p", text: "Same token, three different vectors — `q_sat ≠ k_sat ≠ v_sat`. Note `d_k` is now **2**, not 4, because the head projects down." },

    { t: "out", text:
"scores for the 'sat' query\n\n  score(sat -> the) = [1.9093, 0.5839] . [1.0000, 1.0000] = 2.4932\n  score(sat -> cat) = [1.9093, 0.5839] . [1.5403, 0.8415] = 3.4322   highest\n  score(sat -> sat) = [1.9093, 0.5839] . [0.5839, 1.9093] = 2.2297\n\n  scaled by sqrt(2) = 1.4142:  [1.7630, 2.4270, 1.5766]\n  exp:                         [5.8297, 11.3245, 4.8386]   sum 21.9927\n  weights:                     [0.2651, 0.5149, 0.2200]\n\nreference: 2.49 / 3.43 / 2.22, weights [0.266, 0.516, 0.219]" },

    { t: "callout", kind: "crit", title: "The verb found its subject, and only because the matrices differ",
      body: [{ t: "p", text: "*sat* now puts **51.49%** of its attention on *cat* — the noun it is the verb of — 26.5% on *the* and only 22.0% on itself. Compare the identity version, where the same token gave 51.0% to itself and the two others a quarter each. The entire difference is that `W_K` **swaps dimensions 0 and 1** while `W_Q` leaves them in order, so a query's dimension 0 meets a key's dimension 1. That asymmetry is what lets a token look for something *other than a copy of itself*. In a real model these matrices are learned, and this subject-verb link is exactly the kind of structure training discovers — lesson 4.4 found a clean previous-token head in BERT the same way." }] },

    { t: "h2", n: "04", text: "Blending values, not keys", id: "values" },

    { t: "out", text:
"out_sat = 0.2651 * v_the + 0.5149 * v_cat + 0.2200 * v_sat\n\n  dim0: 0.2651*1.0000 + 0.5149*1.0100 + 0.2200*0.0200 = 0.7895\n  dim1: 0.2651*1.0000 + 0.5149*1.0000 + 0.2200*0.9998 = 1.0000\n\n  out_sat = [0.7895, 1.0000]\n  reference: [0.79, 1.00]" },

    { t: "callout", kind: "insight", title: "The separation of keys from values is the point",
      body: [{ t: "p", text: "The blend uses `V` — not `X` and not `K`. That separation is what makes attention more than similarity search: a token advertises one thing in its key and delivers a different thing in its value. Here `W_V` reads dimensions **2 and 3** while `W_K` reads **0 and 1**, so the features used to *find* a token are disjoint from the features it *contributes*. In a real model that means a word can be findable by its grammatical role while contributing its semantic content, which a single shared representation could not do." }] },

    { t: "h2", n: "05", text: "The output projection", id: "wo" },

    { t: "out", text:
"the head produced a d_k = 2 vector, but the residual stream is d_model = 4\n\n              | 1  0  1  0 |\n  [0.7895, 1.0000]  x  | 0  1  0  1 |  = [0.7895, 1.0000, 0.7895, 1.0000]\n\n  reference: [0.79, 1.00, 0.79, 1.00]" },

    { t: "p", text: "`W_O` maps the head's output back to `d_model` so it can be added to the residual stream. With one head that looks like bookkeeping; with many heads it is where their separate conclusions are mixed — as lesson 4.4 showed, each head produces an independent view and `W_O` learns how to combine them." },

    { t: "diagram", kind: "flow", title: "One head, start to finish", cols: 3,
      nodes: [
        { id: "x", text: "X: 3 tokens x 4 dims", tone: "accent" },
        { id: "p", text: "W_Q, W_K, W_V: three different 4x2 matrices", tone: "violet" },
        { id: "s", text: "Q K^T: 3x3 scores", tone: "violet" },
        { id: "m", text: "Scale by sqrt(2), mask the future", tone: "teal" },
        { id: "w", text: "Softmax: rows sum to 1", tone: "teal" },
        { id: "b", text: "Blend V: 3 tokens x 2 dims", tone: "good" },
        { id: "o", text: "W_O back to 4 dims", tone: "good" }
      ],
      edges: [["x","p"],["p","s"],["s","m"],["m","w"],["w","b"],["b","o"]] },

    { t: "exercise", title: "Compute both versions",
      tasks: [
        "Reproduce the identity-projection weights for all three rows and confirm the masked entries are exactly 0.",
        "Compute the 'cat' row under real projections and see whether it also attends to a linguistically sensible token.",
        "Swap W_Q and W_K and recompute. Explain why the attention pattern changes.",
        "Set W_K = W_Q and verify that self-attention reverts to self-similarity.",
        "Change W_V to read dimensions 0 and 1 instead of 2 and 3, and describe what the head now contributes."
      ] }
  ],

  takeaways: [
    "With identity projections the score matrix is symmetric, because Q = K makes score[i][j] = z_i · z_j.",
    "That makes a token attend mostly to itself: 'sat' gave 0.5101 to itself, since a vector's dot product with itself is its squared norm.",
    "The causal mask makes future weights exactly 0, and the first token's weight of 1.0000 is forced rather than chosen.",
    "Every number in the reference's identity walkthrough reproduces: weights [0.244, 0.246, 0.510] and attn_sat [1.42, 0.92, 0.50, 1.00].",
    "With genuine W_Q and W_K — differing only by swapping two dimensions — 'sat' puts 51.49% on 'cat', its subject, and only 22.0% on itself.",
    "That asymmetry is the whole mechanism: it lets a token look for something other than a copy of itself.",
    "The blend uses V, not K or X, so a token can advertise one thing and deliver another — here W_K reads dims 0,1 and W_V reads dims 2,3.",
    "W_O maps the head's d_k output back to d_model; with many heads it is where their separate views are combined.",
    "The real version reproduces exactly too: weights [0.266, 0.516, 0.219] and out_sat [0.79, 1.00]."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why does a token attend mostly to itself when Q = K = X?",
      options: ["A bug in the masking", "score[i][j] = z_i · z_j, and a vector's dot product with itself is its squared norm — usually the largest entry in the row", "The softmax saturates", "Positional encoding dominates"],
      answer: 1,
      why: "'sat' gave 0.5101 to itself under identity projections. It is arithmetic, not a discovered relationship: self-attention with shared projections is mostly self-similarity. It also makes the score matrix symmetric, which is an artefact that vanishes once Q and K come from different matrices." },
    { stem: "What changed to make 'sat' attend to 'cat' at 51.49%?",
      options: ["A different softmax temperature", "W_K swaps dimensions 0 and 1 while W_Q leaves them in order, so a query's dim 0 meets a key's dim 1", "The causal mask was removed", "The values were rescaled"],
      answer: 1,
      why: "Same sentence, same embeddings, same formula — only the projections differ, and they differ by a transposition. That asymmetry is what lets a token look for something other than a copy of itself, and it is why the subject-verb link emerges. In a real model the matrices are learned and this is the structure training discovers." },
    { stem: "Why does the output blend use V rather than K or X?",
      options: ["V is normalised", "So a token can advertise one thing in its key and deliver a different thing in its value — here W_K reads dims 0,1 and W_V reads dims 2,3", "K is already consumed by the softmax", "It makes no difference"],
      answer: 1,
      why: "The separation is what makes attention more than similarity search. The features that make a token findable are disjoint from the features it contributes, so a word can be located by its grammatical role while delivering its semantic content — something a single shared representation cannot do." },
    { stem: "The first token's attention weight is 1.0000. What does that tell you?",
      options: ["The model is very confident about it", "Nothing — after causal masking it has exactly one option, so the weight is structurally forced", "It is an attention sink", "The mask was applied incorrectly"],
      answer: 1,
      why: "Early positions have few choices, so their distributions look confident for structural reasons rather than semantic ones. This is the same caution as the attention sinks in lesson 4.4, where a head sending 86.4% of its mass to one token turned out to be mass with nowhere else to go." }
  ] },

  interview: { title: "Interview", sub: "Attention mechanics, concretely", questions: [
    { level: "Core", q: "Why does attention need three separate projection matrices?",
      strong: "So a token can look for something other than itself, and advertise something other than it delivers.",
      answer: [{ t: "p", text: "Two distinct reasons, and I can demonstrate both on a worked example. First, why Q and K must differ. If you set them equal, the score between tokens i and j is just the dot product of their vectors, and a vector's dot product with itself is its squared norm — so every token attends mostly to itself. I computed this: with identity projections, the word 'sat' put 51% of its attention on itself. Switching to genuinely different W_Q and W_K, differing only by swapping two dimensions, the same token put 51.5% on 'cat' — its own subject — and only 22% on itself. That asymmetry is what lets a query look for something other than a copy of itself, and it's how linguistic structure like subject-verb linking emerges. Second, why V is separate from K. The output blends the values, not the keys, so a token can advertise one set of features to be findable and contribute a different set once attended to. In the example W_K read dimensions 0 and 1 while W_V read 2 and 3 — completely disjoint. In a real model that means a word can be located by its grammatical role while delivering its semantic content, which one shared representation can't do." }] },
    { level: "Senior", q: "You are looking at an attention map and one head is highly confident. What do you check?",
      strong: "Whether the confidence is structural — few available positions, or a sink — before reading it as meaning.",
      answer: [{ t: "p", text: "I'd check whether the confidence is forced before reading anything into it, because several mechanisms produce high weights for structural reasons. The first is position: under a causal mask, the first token has exactly one option, so its weight is 1.0 by necessity, and early positions generally look confident because they have few choices. In the toy example I worked, the first row was [1.000, 0, 0] and that says nothing about the model. The second is attention sinks. I measured BERT heads sending up to 86.4% of their mass to [SEP], a token with no content — softmax forces the weights to sum to one, so a head with nothing it wants to attend to has to dump the mass somewhere, and models learn to use a semantically empty position. A head that looks like it has found something important may just have found somewhere to park. The third is what the projections are doing: if queries and keys are similar, apparent self-attention is really self-similarity rather than a learned relationship. So before claiming a head does coreference or syntax, I'd check the distribution against a baseline of what masking and sinks alone would produce, and look at whether the pattern holds across many inputs rather than one striking example." }] },
    { level: "Senior", q: "How would you verify an attention implementation is correct?",
      strong: "Assert the invariants — rows sum to 1, masked entries are exactly 0 — then check against a hand-computed example.",
      answer: [{ t: "p", text: "I'd start with invariants that must hold regardless of the weights, because they catch structural bugs cheaply. Every attention row must sum to exactly 1 after softmax — I check that to floating-point tolerance. Under causal masking the upper triangle must be exactly 0.0, not merely small; I've measured that a fill value of minus 10 rather than minus infinity leaks about 4.5e-06 of the weight, which is small but is precisely the information the mask exists to hide. And the output shape must match the input shape, since the block has to be stackable. Then a hand-computed example, which is what catches the subtle errors. A three-token, four-dimensional case can be worked on paper end to end, and comparing against it pins down off-by-one errors in the mask, transposition mistakes in Q K transpose, and whether you're blending V or accidentally K. I'd also check against PyTorch's scaled_dot_product_attention as a reference implementation — when I did that on a worked example from a reference document, agreement was to 1.67e-16, which told me my arithmetic was right and the document's published output was wrong in two of three rows. Finally, a shuffle test: with positional encoding removed, permuting the input rows should permute the output rows identically, which verifies you haven't accidentally introduced position-dependence." }] }
  ] }
});

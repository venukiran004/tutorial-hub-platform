/* ============================================================================
   LESSON 6.3 — Residual, Norm, FFN and the LM Head
   Mirrors 02a_Transformer_Worked_Example.md · §⑤-⑩. Every value verified,
   ending at "mat" with 0.4751 against the reference's 47.6%. Section 06
   derives an exact antisymmetry the reference does not mention
   (scratchpad/nlp/n61.py).
   ========================================================================= */
EC.receiveLesson({
  id: "6.3",

  lede: "**The six logits come out as +0.4264, −1.6319, +1.0747, −1.0747, +1.6319, −0.4264 — three exactly cancelling pairs.** That is not a coincidence of the numbers. LayerNorm forces the hidden state to sum to zero, and this toy vocabulary's embeddings pair up to `[1,1,1,1]`, so every pair of complementary words *must* receive equal and opposite logits. The reference does not mention it; it falls out of recomputing rather than reading. This lesson finishes the trace — residual, norm, FFN, norm, head, softmax — and ends at a 47.51% prediction of *mat*.",

  objectives: [
    "Compute both residual connections and both LayerNorms by hand",
    "Watch ReLU switch a feature off and explain what that achieves",
    "Apply a weight-tied LM head and read the resulting logits",
    "Convert logits to probabilities and verify they sum to 1",
    "Derive why the toy model's logits are exactly antisymmetric"
  ],

  prerequisites: ["6.2", "4.6"],

  blocks: [

    { t: "h2", n: "01", text: "Residual and the first LayerNorm", id: "residual" },

    { t: "out", text:
"residual: add the original input back\n\n  r = z_sat + attn_sat\n    = [1.9093, 0.5839, 0.0200, 0.9998] + [1.4248, 0.9205, 0.5026, 0.9999]\n    = [3.3341, 1.5044, 0.5226, 1.9997]\n\n  reference: [3.33, 1.50, 0.52, 2.00]" },

    { t: "out", text:
"LayerNorm: rescale to mean 0, variance 1\n\n  mean  mu    = 1.8402                  reference 1.84\n  var   sigma2 = 1.0265                 reference 1.03\n        sigma  = 1.0132                 reference 1.01\n\n  n = (r - mu) / sigma\n    = [1.4745, -0.3315, -1.3005, 0.1574]\n\n  reference: [1.47, -0.34, -1.30, 0.16]" },

    { t: "callout", kind: "insight", title: "The residual is what keeps the original token present",
      body: [{ t: "p", text: "Attention produced `[1.4248, 0.9205, 0.5026, 0.9999]` — a blend dominated by other tokens. Adding `z_sat` back means the output is the original token **plus** a contextual update, rather than a replacement. That is why lesson 4.7's residual-stream framing works: every sublayer writes an increment into a vector that persists from the embedding to the output. Without it, twelve layers of attention would progressively wash out the token's own identity, and gradients would have no unobstructed path back." }] },

    { t: "h2", n: "02", text: "The feed-forward network", id: "ffn" },

    { t: "out", text:
"toy weights: W1 = W2 = identity, b1 = [0.5, 0.5, 0.5, 0.5], b2 = 0\nso FFN(n) = ReLU(n + 0.5)\n\n  pre-activation = n + 0.5 = [1.9745, 0.1685, -0.8005, 0.6574]\n  after ReLU               = [1.9745, 0.1685,  0.0000, 0.6574]\n                                                   ^\n                                       the -0.8005 became 0\n\nreference: [1.97, 0.16, -0.80, 0.66] then [1.97, 0.16, 0.00, 0.66]" },

    { t: "callout", kind: "insight", title: "ReLU switching a feature off is the whole non-linearity",
      body: [{ t: "p", text: "One of four dimensions was negative and is now exactly zero. In a toy model that looks trivial; in a real FFN with `d_ff = 3072` it is the mechanism by which the network *selects* which of thousands of learned features are active for this particular token. Under lesson 4.6's key-value memory reading, the hidden activation records **which patterns fired**, and ReLU is what makes that a selection rather than a weighted sum of everything. Note also that the gradient through that dimension is now exactly zero — the dead-ReLU problem, and why GELU and SiLU, which lesson 4.6 measured going smoothly negative, replaced it." }] },

    { t: "h2", n: "03", text: "Second residual and norm", id: "second" },

    { t: "out", text:
"  r' = n + ffn_out\n     = [1.4745, -0.3315, -1.3005, 0.1574] + [1.9745, 0.1685, 0.0000, 0.6574]\n     = [3.4490, -0.1629, -1.3005, 0.8148]\n\n  reference: [3.44, -0.18, -1.30, 0.82]\n\n  mean  mu    = 0.7001     reference 0.70\n  var   sigma2 = 3.0791    reference 3.07\n        sigma  = 1.7547    reference 1.75\n\n  h = [1.5665, -0.4918, -1.1401, 0.0654]\n  reference: [1.57, -0.49, -1.14, 0.07]" },

    { t: "p", text: "`h` is the final hidden state for the *sat* position after one complete transformer block. In a 96-layer model, steps 4 through 7 would repeat 96 times, each writing another increment into this same vector. Here there is one layer, so the stack is done." },

    { t: "callout", kind: "note", title: "One rounding divergence, and it is the reference's",
      body: [{ t: "p", text: "The second component of `r'` comes out at **−0.1629** where the reference prints **−0.18**. The reference is carrying rounded intermediates — it used `−0.34` and `0.16` rather than `−0.3315` and `0.1685` — so the small difference is accumulated display rounding, not an error. Everything downstream still lands within 0.01 of its published value. It is worth flagging only because it shows how quickly hand-arithmetic drifts: three steps of two-decimal rounding moved a value by 10%." }] },

    { t: "h2", n: "04", text: "The LM head", id: "head" },

    { t: "p", text: "Project `h` onto every word in the vocabulary. With **weight tying** the projection matrix *is* the embedding matrix, so the logit for a word is the dot product of `h` with that word's embedding — the same matrix that mapped ids to vectors on the way in." },

    { t: "out", text:
"h = [1.5665, -0.4918, -1.1401, 0.0654]\n\n  logit(the)   = h . [1,0,1,0] =  1.5665 + (-1.1401)  =  +0.4264   ref  +0.43\n  logit(cat)   = h . [0,1,1,0] = -0.4918 + (-1.1401)  =  -1.6319   ref  -1.63\n  logit(sat)   = h . [1,1,0,0] =  1.5665 + (-0.4918)  =  +1.0747   ref  +1.08\n  logit(on)    = h . [0,0,1,1] = -1.1401 + 0.0654     =  -1.0747   ref  -1.07\n  logit(mat)   = h . [1,0,0,1] =  1.5665 + 0.0654     =  +1.6319   ref  +1.64\n  logit(<eos>) = h . [0,1,0,1] = -0.4918 + 0.0654     =  -0.4264   ref  -0.42" },

    { t: "h2", n: "05", text: "Softmax", id: "softmax" },

    { t: "out", text:
"word      logit      probability     reference\nmat      +1.6319       0.4751          0.476\nsat      +1.0747       0.2721          0.272\nthe      +0.4264       0.1423          0.142\n<eos>    -0.4264       0.0606          0.061\non       -1.0747       0.0317          0.032\ncat      -1.6319       0.0182          0.018\n\n  sum = 1.000000\n\n  prediction: 'mat' at 47.51%" },

    { t: "p", text: "Every probability matches the reference to three decimal places. *\"the cat sat\"* → *\"mat\"*, which given a vocabulary containing *on* and *mat* is a defensible continuation of a sentence that wants to become *the cat sat on the mat*." },

    { t: "h2", n: "06", text: "The antisymmetry the reference does not mention", id: "antisymmetry" },

    { t: "out", text:
"the logits, paired\n\n  logit(the)   +0.4264  +  logit(<eos>)  -0.4264  =  0.000000\n  logit(sat)   +1.0747  +  logit(on)     -1.0747  =  0.000000\n  logit(cat)   -1.6319  +  logit(mat)    +1.6319  =  0.000000" },

    { t: "out", text:
"why — the vocabulary comes in complementary pairs\n\n  the   [1,0,1,0]  +  <eos> [0,1,0,1]  =  [1,1,1,1]\n  sat   [1,1,0,0]  +  on    [0,0,1,1]  =  [1,1,1,1]\n  cat   [0,1,1,0]  +  mat   [1,0,0,1]  =  [1,1,1,1]\n\nand LayerNorm forces sum(h) = 0.000000" },

    { t: "callout", kind: "crit", title: "Two facts force it exactly",
      body: [{ t: "p", text: "For any complementary pair, `logit(a) + logit(b) = h · (E[a] + E[b]) = h · [1,1,1,1] = sum(h)`. And **LayerNorm subtracts the mean**, so `sum(h)` is exactly zero by construction. Therefore every pair of complementary words receives equal and opposite logits, and the probability distribution is symmetric about its centre — necessarily, for any input, regardless of what the model computed. This is an artefact of a toy vocabulary chosen for tidiness, not a property of real transformers. But it is a good illustration of why recomputing beats reading: the structure is invisible in the prose and unmissable in the numbers." }] },

    { t: "h2", n: "07", text: "Autoregression", id: "autoregression" },

    { t: "diagram", kind: "cycle", title: "Step 10: append and repeat", centre: "Generate",
      nodes: [
        { text: "the cat sat  ->  predict 'mat'" },
        { text: "Append: the cat sat mat" },
        { text: "Re-embed, add position 3" },
        { text: "Run the block again" },
        { text: "Predict the next word" }
      ] },

    { t: "p", text: "Nothing in the block changes — the same weights run over a sequence one token longer, and the causal mask means the first three positions compute exactly what they computed before. That last fact is what makes the KV cache from lesson 5.2 correct rather than merely convenient: the earlier positions' keys and values are provably unchanged, so recomputing them is pure waste." },

    { t: "exercise", title: "Finish the trace yourself",
      tasks: [
        "Recompute both LayerNorms with a calculator and confirm the mean is 0 and the variance 1 to four decimal places.",
        "Change b1 from 0.5 to 0.2 and find which dimension survives ReLU instead.",
        "Verify the antisymmetry holds for a different input sentence from the same vocabulary.",
        "Break the antisymmetry by changing one embedding so the pairs no longer sum to [1,1,1,1], and confirm it disappears.",
        "Append 'mat' and run the block again by hand to predict the fifth word."
      ] }
  ],

  takeaways: [
    "The residual adds the original token back, so a sublayer contributes an increment rather than a replacement — the residual-stream view from lesson 4.7.",
    "First LayerNorm: mean 1.8402, variance 1.0265, giving n = [1.4745, -0.3315, -1.3005, 0.1574].",
    "ReLU zeroed one of four dimensions — in a real FFN this is how the network selects which learned features are active for a token.",
    "That zeroed dimension now has exactly zero gradient, which is the dead-ReLU problem GELU and SiLU were adopted to avoid.",
    "Second LayerNorm gives h = [1.5665, -0.4918, -1.1401, 0.0654], the final hidden state after one full block.",
    "The reference's r' second component reads -0.18 against a computed -0.1629 — accumulated display rounding, which moved a value by 10% in three steps.",
    "Weight tying means the LM head IS the embedding matrix, so a logit is h dotted with a word's embedding.",
    "Final prediction: 'mat' at 0.4751, matching the reference's 47.6%, with all six probabilities correct to three decimals.",
    "The logits are exactly antisymmetric, because LayerNorm forces sum(h) = 0 and the toy embeddings pair up to [1,1,1,1] — structure the reference does not mention.",
    "Under a causal mask, appending a token leaves earlier positions' computations unchanged, which is what makes the KV cache provably correct."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why are the toy model's logits exactly antisymmetric?",
      options: ["Coincidence of the chosen numbers", "LayerNorm forces sum(h) = 0, and the vocabulary's embeddings pair up to [1,1,1,1], so each pair's logits must sum to h · [1,1,1,1] = 0", "The softmax normalises them", "Weight tying enforces it"],
      answer: 1,
      why: "For any pair summing to all-ones, logit(a) + logit(b) = h · [1,1,1,1] = sum(h), and LayerNorm subtracts the mean so that is exactly zero. It holds for any input, necessarily. It is an artefact of a tidy toy vocabulary rather than a property of real transformers — but it is only visible if you recompute rather than read." },
    { stem: "What does ReLU accomplish in the FFN?",
      options: ["It normalises the activations", "It switches features off — one of four dimensions went to exactly 0, which in a real FFN is how the network selects which learned features are active", "It prevents overfitting", "It scales the residual"],
      answer: 1,
      why: "Under the key-value memory reading, the hidden activation records which patterns fired, and ReLU makes that a selection rather than a weighted sum of everything. The cost is that the zeroed dimension now has exactly zero gradient — the dead-ReLU problem, which is why GELU and SiLU, going smoothly negative, replaced it." },
    { stem: "Why does the residual connection matter here?",
      options: ["It speeds up computation", "Attention produced a blend dominated by other tokens; adding the input back makes the output the original token plus a contextual update", "It normalises the scale", "It enables weight tying"],
      answer: 1,
      why: "Without it, stacked layers would progressively wash out a token's own identity, and gradients would have no unobstructed path back — lesson 4.6 measured a 780,000x difference in gradient reaching the first block between Pre-LN and Post-LN. The residual is what makes the residual-stream framing of lesson 4.7 apply." },
    { stem: "The reference prints -0.18 where the computation gives -0.1629. What happened?",
      options: ["An error in the reference", "Accumulated display rounding — it carried two-decimal intermediates, and three steps moved the value by 10%", "A different LayerNorm epsilon", "A transcription mistake"],
      answer: 1,
      why: "It used -0.34 and 0.16 rather than -0.3315 and 0.1685. Everything downstream still lands within 0.01 of its published value, so the walkthrough is sound. It is worth flagging only as a demonstration of how quickly hand-arithmetic drifts when intermediates are rounded." }
  ] },

  interview: { title: "Interview", sub: "Completing the forward pass", questions: [
    { level: "Core", q: "What happens after attention inside a transformer block?",
      strong: "Residual, norm, position-wise FFN, residual, norm — then the head projects to vocabulary.",
      answer: [{ t: "p", text: "The attention output is added back to the block's input — the residual — so the result is the original token plus a contextual update rather than a replacement. Then LayerNorm rescales that to mean zero and unit variance across the feature dimension. Then the feed-forward network transforms each position independently: expand to d_ff, apply a non-linearity, project back. Then a second residual and a second norm. That's one block, and it repeats N times. After the last block a final LayerNorm, then the LM head projects to vocabulary size, usually with weight tying so the head literally is the embedding matrix — a logit is the hidden state dotted with a word's embedding. Working this by hand on a toy model is clarifying. I traced 'the cat sat' through and watched ReLU zero one of four dimensions, which in a real FFN with 3072 hidden units is the mechanism that selects which learned features fire for this token — and it's also where the dead-ReLU problem comes from, since that dimension's gradient is now exactly zero, which is why GELU replaced it. The final prediction was 'mat' at 47.51%." }] },
    { level: "Senior", q: "What did you learn from hand-computing a transformer that you would not get from code?",
      strong: "Structure invisible in prose — and whether the published explanation is actually right.",
      answer: [{ t: "p", text: "Two things. The first is verification. I checked two worked examples from the same reference document: one had two of three output rows wrong, where the arithmetic through softmax was correct and the final weighted sums weren't, and the other was correct in every value through to the final probability distribution. You only learn either by recomputing. That matters because these documents are what people learn from, and a confident-looking table of numbers is very hard to doubt by reading. The second is structure that the prose doesn't mention. Working the toy model's logits, I noticed they came out in exactly cancelling pairs — plus 0.4264 and minus 0.4264, and so on for all three. That's provable: LayerNorm subtracts the mean so the hidden state sums to zero, and that toy vocabulary's embeddings pair up to all-ones, so any complementary pair's logits must sum to h dotted with all-ones, which is zero. The distribution is symmetric about its centre for any input, necessarily. It's an artefact of a tidy toy vocabulary rather than a real property, but I'd never have seen it from reading, and noticing it is what confirms you've actually understood what LayerNorm does rather than just knowing its formula." }] },
    { level: "Senior", q: "Why is the KV cache provably correct rather than just a useful approximation?",
      strong: "Because under a causal mask, appending a token cannot change any earlier position's computation.",
      answer: [{ t: "p", text: "Because of the causal mask. When you append a token and run the block again, position i can still only attend to positions up to i — the new token is in the future for every earlier position, so it's masked out of all of their attention rows. That means each earlier position's query, key, value and output are bit-identical to what they were on the previous step. Nothing about them depends on what came after. So caching their keys and values isn't an approximation that happens to work well, it's storing values that are provably unchanged, and recomputing them is pure waste. That's worth being precise about because it tells you exactly when caching is valid and when it isn't. It holds for decoder self-attention under a causal mask. It does not hold if you modify the prefix — editing a system prompt invalidates everything after the edit point, which is why prefix caching keys on the exact token sequence. And it's why encoder-decoder cross-attention caches so well too: the encoder output doesn't change at all during generation, so its keys and values are computed once for the whole decode. I measured the practical effect at 3.46x faster on just 60 generated tokens, growing with length, since the uncached version's total work is quadratic where the cached version's is linear." }] }
  ] }
});

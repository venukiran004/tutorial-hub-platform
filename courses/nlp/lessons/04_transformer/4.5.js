/* ============================================================================
   LESSON 4.5 — Masked and Cross-Attention
   Mirrors 02_Transformers_InDepth.md · §6. The masked-softmax example is
   verified, the training/inference asymmetry is measured at 74.2x, and
   exposure bias is shown on GPT-2 (scratchpad/nlp/n44.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.5",

  lede: "**The same model, the same 128 tokens: one training pass took 2.12 ms and generating them took 157.21 ms — 74.2x slower.** Nothing about the architecture changed. Training scores all 128 next-token predictions in a single parallel pass because the causal mask makes that safe; generation cannot, because token *t+1* does not exist until token *t* has been produced. That asymmetry is created by one triangular matrix, and it is the root cause of nearly every LLM serving optimisation you will ever read about.",

  objectives: [
    "Apply a causal mask and verify that masked positions receive exactly zero weight",
    "Explain why masking makes parallel training equivalent to sequential inference",
    "Measure the cost gap between a training pass and free-running generation",
    "Describe exposure bias and see it in a real model's probabilities",
    "Distinguish cross-attention from self-attention by where Q, K and V come from"
  ],

  prerequisites: ["4.4"],

  blocks: [

    { t: "h2", n: "01", text: "The causal mask", id: "mask" },

    { t: "p", text: "A decoder must not see the future. Position `i` may attend only to positions up to and including `i`, which is a lower-triangular pattern." },

    { t: "code", lang: "python", title: "scratchpad/nlp/n44.py — the mask", code:
"def create_causal_mask(seq_len):\n    \"\"\"Lower triangular mask for autoregressive decoding.\"\"\"\n    return torch.tril(torch.ones(seq_len, seq_len)).unsqueeze(0).unsqueeze(0)\n\n# applied inside attention, before the softmax\nscores = scores.masked_fill(mask == 0, float('-inf'))",
      caption: "The two `unsqueeze` calls add batch and head dimensions so the mask broadcasts across both." },

    { t: "out", text:
"tril(ones(5,5))\n  token 0 sees 1 of 5: [1, 0, 0, 0, 0]\n  token 1 sees 2 of 5: [1, 1, 0, 0, 0]\n  token 2 sees 3 of 5: [1, 1, 1, 0, 0]\n  token 3 sees 4 of 5: [1, 1, 1, 1, 0]\n  token 4 sees 5 of 5: [1, 1, 1, 1, 1]" },

    { t: "h2", n: "02", text: "What masking does to the softmax", id: "softmax" },

    { t: "p", text: "The reference works one row: token *sat* attending to `[The, cat, sat, future]` with scaled scores `[0.40, 0.53, 0.59, 0.95]`. Recomputed:" },

    { t: "out", text:
"after the causal mask   [0.40, 0.53, 0.59, -inf]\nexponentials            [1.4918, 1.6989, 1.8040, 0.0]\nsum                     4.9947\nweights                 [0.2987, 0.3401, 0.3612, 0.0000]\n\nreference says          [0.299, 0.340, 0.361, 0.000]   reproduces exactly\n\nwithout the mask        [0.1968, 0.2241, 0.2380, 0.3411]" },

    { t: "callout", kind: "crit", title: "The future token would have taken the largest share",
      body: [{ t: "p", text: "Unmasked, position 3 receives **34.11%** of the attention — more than any real token in the row. The model would be predicting *sat* partly by looking at what comes after *sat*, which at training time is the answer it is being asked for. It would score beautifully on the training objective and be useless at generation, because at inference that position does not exist yet. The mask is what makes teacher-forced parallel training measure the same thing that sequential inference will do." }] },

    { t: "h2", n: "03", text: "Why negative infinity and not a large negative number", id: "neginf" },

    { t: "out", text:
"scores [2.0, 1.0, 0.5], masking the third\n\nfill     weights                            masked weight\n-inf     [0.731059, 0.268941, 0.000000]     0.000e+00\n-1e9     [0.731059, 0.268941, 0.000000]     0.000e+00\n-1e4     [0.731059, 0.268941, 0.000000]     0.000e+00\n-10      [0.731055, 0.268940, 0.000004]     4.492e-06" },

    { t: "p", text: "In float32, anything below roughly `-1e4` underflows to exactly zero after the exponential, so `-inf` and `-1e9` are equivalent. A merely *large* negative number like `-10` is not: it leaks `4.49e-06` of the weight to a position the model must not see. Small, but it is a leak of exactly the information the mask exists to hide, and it compounds across layers." },

    { t: "callout", kind: "warn", title: "In float16 this becomes a real bug",
      body: [{ t: "p", text: "`-1e9` is outside float16's range and overflows to `-inf`, which happens to be the behaviour you wanted. But masking with float16's finite minimum, `-65504`, returned **`[nan, nan, nan]`** in my test — the intermediate arithmetic overflows and poisons the whole row. NaNs then propagate through every subsequent layer and the loss becomes NaN with no indication of where it started. If you write your own attention and run it in mixed precision, use `torch.finfo(dtype).min` rather than a hard-coded constant, and check for NaNs immediately after the softmax while you still know which operation produced them." }] },

    { t: "h2", n: "04", text: "Autoregression is the chain rule", id: "autoregressive" },

    { t: "math", tex: "p(x_1, x_2, \\ldots, x_n) = \\prod_{t=1}^{n} p(x_t \\mid x_1, \\ldots, x_{t-1})" },

    { t: "p", text: "Any joint distribution factorises this way — it is an identity, not an assumption. An autoregressive model learns each conditional, and maximising the log-likelihood of the sequence is exactly minimising next-token cross-entropy. `p(\"the cat sat\") = p(\"the\") · p(\"cat\" | \"the\") · p(\"sat\" | \"the\", \"cat\")`." },

    { t: "h2", n: "05", text: "The asymmetry, measured", id: "asymmetry" },

    { t: "out", text:
"one transformer layer, d_model 256, 8 heads, T = 128\n\ntraining   : ONE forward pass over all 128 positions      2.12 ms\ngeneration : 128 sequential passes, no KV cache         157.21 ms\n\n74.2x slower, same model, same sequence" },

    { t: "diagram", kind: "compare", title: "Same weights, two regimes",
      columns: [
        { title: "Training, teacher forced", tone: "good", items: [
          "Whole gold sequence in at once",
          "Causal mask blocks the future",
          "All n predictions in ONE pass",
          "O(1) sequential steps",
          "Conditions on CORRECT prefixes",
          "Compute-bound: big matmuls"
        ] },
        { title: "Inference, free running", tone: "warn", items: [
          "Only the prompt to start",
          "Append each token, feed back",
          "One pass per generated token",
          "O(n) sequential steps",
          "Conditions on its OWN outputs",
          "Memory-bandwidth-bound"
        ] }
      ] },

    { t: "callout", kind: "insight", title: "This is why every serving optimisation exists",
      body: [{ t: "p", text: "Decoding is sequential and each step needs a full model pass, so the bottleneck is not arithmetic — it is moving the weights from memory to the compute units, once per token, to do a tiny amount of work. Decode is **memory-bandwidth-bound**. Every major serving technique follows directly: the **KV cache** stops you recomputing keys and values for the whole prefix at each step; **speculative decoding** drafts several tokens cheaply and verifies them in one parallel pass, converting sequential steps into batch work; **continuous batching** fills the idle bandwidth with other requests. Lesson 5.3 covers all three. The 74.2x above is the un-optimised baseline they are all attacking." }] },

    { t: "h2", n: "06", text: "Exposure bias", id: "exposure" },

    { t: "p", text: "Training always conditions on a correct prefix. Inference conditions on whatever the model produced, mistakes included. The gap between those two regimes is exposure bias, and it is visible in a real model." },

    { t: "out", text:
"prompt: \"The capital of France is Paris. The capital of Germany is\"\n\ngpt2 greedy continuation:\n  \" Berlin. The capital of the United States is Washington. The capital of\n   the United Kingdom is London. The capital of the United\"" },

    { t: "out", text:
"probability gpt2 assigns to a DIFFERENT gold continuation, scored\nwith teacher forcing\n\n  step 0   ' Berlin'    p=0.2667\n  step 1   '.'          p=0.8150\n  step 2   ' The'       p=0.3570\n  step 3   ' capital'   p=0.8242\n  step 4   ' of'        p=0.9911\n  step 5   ' Italy'     p=0.0836\n  step 6   ' is'        p=0.9586\n  step 7   ' Rome'      p=0.4107\n  step 8   '.'          p=0.9276\n\n  mean 0.6488   min 0.0836" },

    { t: "callout", kind: "insight", title: "Teacher forcing scores a prefix the model would never have written",
      body: [{ t: "p", text: "Left to itself the model went to *the United States*, not *Italy*. Teacher forcing nevertheless hands it ` Italy` as step 5 and asks for the next token — and the model assigns that gold token only **0.0836**. At every subsequent step it is conditioning on a prefix it disagrees with, yet the loss is computed as though that prefix were its own. At inference nothing corrects it: an early low-probability choice becomes the context for everything after, and errors compound. That is exposure bias. The mitigations are scheduled sampling (mix in the model's own predictions during training), sequence-level or RL fine-tuning (optimise the whole output, not each token against a gold prefix), and better decoding, which lesson 5.8 traces end to end." }] },

    { t: "h2", n: "07", text: "Four ways to model a sequence", id: "families" },

    { t: "table",
      head: ["Family", "How it generates", "Strength", "Weakness"],
      rows: [
        ["Autoregressive (GPT, LLaMA)", "Left to right, one token per step", "Best generation quality", "Sequential — O(n) passes"],
        ["Bidirectional / MLM (BERT)", "Fills masked positions, sees both sides", "Excellent encoder", "Cannot generate"],
        ["Non-autoregressive (NAR MT)", "Emits every token in parallel", "Very fast", "Weaker — no left context while deciding"],
        ["Diffusion / masked-diffusion LM", "Iteratively denoises the whole sequence", "Parallel-ish, improving fast", "Quality still behind AR"]
      ] },

    { t: "h2", n: "08", text: "Cross-attention", id: "cross" },

    { t: "p", text: "Self-attention derives Q, K and V from the same sequence. Cross-attention does not — and that single change is the entire encoder-decoder connection." },

    { t: "diagram", kind: "flow", title: "Where the three inputs come from", cols: 3,
      nodes: [
        { id: "s", text: "Source: Le chat", tone: "accent" },
        { id: "e", text: "Encoder", tone: "teal" },
        { id: "kv", text: "K and V from the encoder output", tone: "teal" },
        { id: "d", text: "Decoder state so far", tone: "violet" },
        { id: "q", text: "Q from the decoder", tone: "violet" },
        { id: "o", text: "Blend of source values, weighted by relevance", tone: "good" }
      ],
      edges: [["s","e"],["e","kv"],["d","q"],["q","o"],["kv","o"]] },

    { t: "dl", items: [
      ["Q from the decoder", "What the position currently being generated is looking for in the source."],
      ["K and V from the encoder", "What each source token advertises, and what it delivers. Computed once for the whole source."],
      ["Not masked", "The decoder may attend to the entire source — all of it already exists. Only *self*-attention in the decoder is causally masked."],
      ["Shape", "(target_len × source_len) rather than square. This is the alignment matrix, and it is what you visualise to see which source word produced which output word."]
    ] },

    { t: "callout", kind: "insight", title: "K and V are computed once, then reused for every output token",
      body: [{ t: "p", text: "The encoder runs once per input. Its output becomes the keys and values for every decoder step, so cross-attention costs one projection of the source up front and then only the query projection per generated token. This is the same structural idea as the KV cache in a decoder-only model — the expensive, reusable part is computed once and held. It is also why encoder-decoder models remain strong for translation and summarisation: the source is fully encoded bidirectionally before a single output token is produced." }] },

    { t: "exercise", title: "Verify the masking and the gap",
      tasks: [
        "Apply a causal mask and assert that every masked weight is exactly 0.0, not merely small.",
        "Mask with -10, -1e4 and -inf in float32, then repeat in float16, and record which combinations leak or produce NaN.",
        "Time a single teacher-forced pass against naive token-by-token generation for the same sequence, and compute your own ratio.",
        "Add a KV cache to the generation loop and re-measure. Compare the improvement against the 74.2x baseline.",
        "Score a gold continuation token by token with teacher forcing and mark every step where the model's own argmax differs from the gold token."
      ] }
  ],

  takeaways: [
    "The causal mask is lower-triangular: position i attends only to positions up to i.",
    "The reference's masked-softmax example reproduces exactly — [0.2987, 0.3401, 0.3612, 0.0000].",
    "Unmasked, the future position would have taken 34.11% of the weight, the largest share in the row.",
    "In float32, -1e4 and below underflow to exactly zero; -10 leaks 4.49e-06 of the weight.",
    "In float16, masking with the finite minimum -65504 returned [nan, nan, nan] — use `torch.finfo(dtype).min`.",
    "Autoregression is the chain rule of probability, so next-token cross-entropy is exactly sequence log-likelihood.",
    "Training took 2.12 ms and free-running generation 157.21 ms for the same 128 tokens — 74.2x, and that gap is why KV caching, speculative decoding and continuous batching exist.",
    "Decode is memory-bandwidth-bound, not compute-bound, because each sequential step moves all the weights to do very little work.",
    "Exposure bias: gpt2 assigned only 0.0836 to a gold token it would never have chosen, then kept being scored on a prefix it disagreed with.",
    "Cross-attention takes Q from the decoder and K, V from the encoder, is not causally masked, and produces a (target × source) alignment matrix."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "What does the causal mask make possible?",
      options: ["Faster inference", "Computing all n next-token predictions in one parallel training pass without any position seeing its own answer", "Longer context", "Lower memory use"],
      answer: 1,
      why: "Without it, position i would attend to position i+1 — the very token it is being asked to predict. In the worked row the future position took 34.11% of the weight, the largest share. The mask is what makes teacher-forced parallel training measure the same quantity that sequential inference will later compute." },
    { stem: "Why was generation 74.2x slower than training on the same sequence?",
      options: ["Generation uses a bigger model", "Training is one parallel pass over all positions; generation needs one full pass per token because token t+1 depends on token t existing", "Dropout is enabled", "The mask is recomputed"],
      answer: 1,
      why: "2.12 ms against 157.21 ms for 128 tokens, identical weights. The dependency is inherent to autoregression, not to the architecture. Because each step moves all the weights to do a tiny amount of work, decode is memory-bandwidth-bound — which is the root cause of KV caching, speculative decoding and continuous batching." },
    { stem: "Why mask with -inf rather than a large negative number?",
      options: ["It is faster", "Because a merely large value leaks weight — -10 left 4.49e-06 on a position the model must not see", "It uses less memory", "There is no difference"],
      answer: 1,
      why: "In float32 anything below about -1e4 underflows to exactly zero after exp, so -inf and -1e9 agree. -10 does not, and the leak is of precisely the information the mask exists to hide. In float16 there is a further trap: masking with the finite minimum -65504 produced NaN, so use torch.finfo(dtype).min." },
    { stem: "What is exposure bias?",
      options: ["Overfitting to frequent tokens", "Training always conditions on correct prefixes while inference conditions on the model's own output, so early errors compound", "Bias in the training corpus", "Attention leaking to future tokens"],
      answer: 1,
      why: "Scoring a gold continuation, gpt2 assigned just 0.0836 to a token it would never have generated, then continued to be scored on a prefix it disagreed with. At inference nothing supplies the correction. Mitigations are scheduled sampling, sequence-level or RL fine-tuning, and better decoding strategies." }
  ] },

  interview: { title: "Interview", sub: "Masking and autoregression", questions: [
    { level: "Core", q: "What is the causal mask and why is it needed?",
      strong: "A lower-triangular mask that stops a position attending to its own future, making parallel training valid.",
      answer: [{ t: "p", text: "It's a lower-triangular mask applied to the attention scores before the softmax, setting everything above the diagonal to negative infinity so position i can only attend to positions up to i. The reason it's needed is subtle and worth stating precisely: it isn't about inference, it's about making training valid. At inference the future genuinely doesn't exist, so nothing could leak. At training you feed the whole gold sequence at once for parallelism, and without the mask position i would attend to position i+1 — the exact token it's being asked to predict. I worked an example where the future position took 34.11% of the attention, the largest share in the row. The model would score wonderfully on the training objective by copying the answer and be useless at generation. So the mask is what makes teacher-forced parallel training measure the same thing sequential inference will do. One implementation detail: mask with negative infinity or the dtype's minimum, not just a large negative number — I measured -10 leaking 4.49e-06 of the weight, and in float16 a hard-coded -65504 produced NaN." }] },
    { level: "Core", q: "What is the difference between self-attention and cross-attention?",
      strong: "Where Q, K and V come from — cross-attention takes Q from the decoder and K, V from the encoder.",
      answer: [{ t: "p", text: "Purely where the three inputs come from. In self-attention, Q, K and V are all projections of the same sequence, so each token attends to its own context. In cross-attention the queries come from the decoder — what the position being generated is looking for — while the keys and values come from the encoder output, representing what the source contains. That's the only place the two stacks meet in an encoder-decoder model. Two consequences follow. First, the attention matrix is target length by source length rather than square, which makes it an alignment matrix — visualise it and you see which source word produced which output word, which is genuinely useful for debugging a translation model. Second, cross-attention is not causally masked, because the whole source already exists; only the decoder's self-attention is masked. There's also a nice efficiency property: the encoder runs once and its keys and values are reused for every decoder step, so you pay the source projection once. That's structurally the same idea as a KV cache." }] },
    { level: "Senior", q: "Why is LLM decoding slow, and what do you do about it?",
      strong: "It is sequential and memory-bandwidth-bound; KV cache, speculative decoding and continuous batching each attack that.",
      answer: [{ t: "p", text: "It's slow for a structural reason rather than an implementation one: autoregression means token t+1 can't start until token t exists, so you need a full model forward pass per generated token. I measured the un-optimised gap — one teacher-forced training pass over 128 tokens took 2.12 ms, and generating the same 128 tokens one at a time took 157.21 ms, 74 times slower with identical weights. The key insight for optimisation is what the bottleneck actually is. Each decode step does a tiny amount of arithmetic — one token's worth — but has to stream every weight in the model from memory to do it. So decode is memory-bandwidth-bound, not compute-bound, and that tells you which fixes work. KV caching is the first and biggest: the keys and values for the prefix don't change, so cache them instead of recomputing attention over the whole context every step. Speculative decoding attacks the sequential dependency itself — a small draft model proposes several tokens, the large model verifies them all in one parallel pass, and you get multiple tokens per expensive pass when the draft is right. Continuous batching attacks utilisation: since you're bandwidth-bound, the compute units are idle, so interleave other requests to fill them. Quantisation helps here more than people expect too, because halving the weight bytes directly halves the thing you're bottlenecked on." }] }
  ] }
});

/* ============================================================================
   LESSON 4.10 — Parameter Count
   Mirrors 02_Transformers_InDepth.md · §11. The reference's GPT-2 arithmetic
   is exact for weights; the 82,944 gap against the real checkpoint is
   accounted for precisely by the biases (scratchpad/nlp/n410.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.10",

  lede: "**The reference's GPT-2 total comes to 124,356,864 and the actual checkpoint holds 124,439,808 — a gap of exactly 82,944, which is precisely the bias vectors.** Predicting that number to the digit is the point of this lesson. If you can derive a model's parameter count from its configuration you can size a GPU before renting one, spot a misconfigured architecture from its total alone, and understand why doubling width costs four times as much as you might expect.",

  objectives: [
    "Derive a transformer's parameter count from its configuration",
    "Account for every term, including the biases and norms most formulas omit",
    "Apply and justify the `12·L·d²` rule of thumb",
    "Explain why width costs quadratically and depth only linearly",
    "Judge when the embedding matrix dominates the budget"
  ],

  prerequisites: ["4.9", "4.7"],

  blocks: [

    { t: "h2", n: "01", text: "GPT-2 small, term by term", id: "gpt2" },

    { t: "out", text:
"config: d_model 768, heads 12, d_ff 3072, layers 12, vocab 50257, max_pos 1024\n\nper block\n  W_Q, W_K, W_V   3 x (768 x 768)    1,769,472\n  W_O                 768 x 768         589,824\n  attention total                     2,359,296\n\n  W1  768 x 3072                      2,359,296\n  W2  3072 x 768                      2,359,296\n  FFN total                           4,718,592\n\n  2 LayerNorms  2 x (768 + 768)           3,072\n\n  per block                           7,080,960\n  x 12 blocks                        84,971,520\n\nembeddings\n  token     50257 x 768              38,597,376\n  position   1024 x 768                 786,432\nfinal LayerNorm                           1,536\n\nTOTAL                             124,356,864" },

    { t: "p", text: "Every line reproduces the reference exactly. Note that the attention block is `4·d²` — three projections plus the output — and the FFN is `2·d·d_ff`, which at `d_ff = 4d` is `8·d²`. Twice the attention, as lesson 4.6 established." },

    { t: "h2", n: "02", text: "Against the real checkpoint", id: "actual" },

    { t: "out", text:
"transformers GPT2Model total   124,439,808\nthe arithmetic above           124,356,864\ndifference                          82,944" },

    { t: "callout", kind: "insight", title: "The gap is the biases, exactly",
      body: [{ t: "p", text: "Per block, attention carries `3d + d = 3,072` bias terms (one for the fused QKV projection, one for the output) and the FFN carries `d_ff + d = 3,840`. That is 6,912 per block, times 12 blocks, is **82,944** — the discrepancy to the unit. Most parameter formulas quote weights only, which is fine for the 0.07% it represents here, but it is worth knowing the omission is deliberate rather than an error. Some architectures remove biases entirely: LLaMA has none in its linear layers, which simplifies the arithmetic and costs nothing in quality." }] },

    { t: "out", text:
"actual breakdown, largest first\n\n  wte.weight (token embedding)      38,597,376\n  blocks.mlp.c_fc.weight            28,311,552\n  blocks.mlp.c_proj.weight          28,311,552\n  blocks.attn.c_attn.weight         21,233,664\n  blocks.attn.c_proj.weight          7,077,888\n  wpe.weight (position)                786,432\n  blocks.mlp.c_fc.bias                  36,864\n  blocks.attn.c_attn.bias               27,648\n  blocks.ln_1.weight / bias          9,216 each\n  blocks.attn.c_proj.bias                9,216\n  blocks.ln_2.weight / bias          9,216 each\n  blocks.mlp.c_proj.bias                 9,216\n  ln_f.weight / bias                   768 each\n  SUM                              124,439,808" },

    { t: "p", text: "The two MLP matrices together hold 56.6M — **45%** of the entire model — against attention's 28.3M. And the single largest tensor is the token embedding at 38.6M, which is not a computation layer at all. Where the parameters are is not where most of the explanation goes." },

    { t: "h2", n: "03", text: "The rule of thumb", id: "rule" },

    { t: "math", tex: "\\text{params}_{\\text{non-embedding}} \\approx 12 \\cdot L \\cdot d_{\\text{model}}^2" },

    { t: "out", text:
"12 x 12 x 768^2                      = 84,934,656\nactual non-embedding (blocks + ln_f) = 85,056,000\nratio                                  1.0014" },

    { t: "callout", kind: "insight", title: "Accurate to 0.14%, and easy to derive",
      body: [{ t: "p", text: "The rule is not a fitted approximation, it is the exact leading term. Attention is `4d²` — `W_Q`, `W_K`, `W_V`, `W_O`, each `d × d`. The FFN with the standard `d_ff = 4d` is `d × 4d + 4d × d = 8d²`. Together `12d²` per layer, times `L` layers. Everything it omits — biases at `O(d)` and LayerNorms at `O(d)` — is one order smaller, which is why the ratio comes out at 1.0014. You can do this arithmetic in your head from a model card, and it is the fastest sanity check there is on a configuration." }] },

    { t: "diagram", kind: "cells", title: "Where 12 d-squared comes from",
      items: [
        { label: "W_Q", value: "d²", tone: "accent" },
        { label: "W_K", value: "d²", tone: "accent" },
        { label: "W_V", value: "d²", tone: "accent" },
        { label: "W_O", value: "d²", tone: "accent" },
        { label: "W_1", value: "4d²", tone: "violet" },
        { label: "W_2", value: "4d²", tone: "violet" }
      ] },

    { t: "h2", n: "04", text: "Width costs quadratically, depth linearly", id: "scaling" },

    { t: "callout", kind: "crit", title: "Doubling d_model quadruples the parameters per layer",
      body: [{ t: "p", text: "Because the count is `12·L·d²`, `d` enters squared and `L` only linearly. Double the depth and you double the parameters; double the width and you **quadruple** them. That asymmetry shapes every architecture decision downstream — it is why models grow deep faster than they grow wide, why width is usually chosen first and held, and why a seemingly modest change from `d_model = 4096` to `8192` is a four-times parameter increase per layer, not a doubling. It also drives the compute cost: attention and FFN FLOPs scale with `d²` too." }] },

    { t: "table",
      head: ["Change", "Parameter effect", "Typical use"],
      rows: [
        ["Double layers L", "2x", "Cheap capacity; risks training instability at depth"],
        ["Double width d_model", "4x", "Expensive; also widens every activation and the KV cache"],
        ["Double d_ff only", "1.67x of the block", "Targeted FFN capacity, common in MoE designs"],
        ["Double heads, d_model fixed", "No change", "A reshape — see lesson 4.4"]
      ] },

    { t: "h2", n: "05", text: "When embeddings dominate", id: "embeddings" },

    { t: "out", text:
"model           d_model  layers  non-embedding    embedding      embed share\nGPT-2 small       768      12        84,934,656    38,597,376       31.2%\nGPT-2 medium     1024      24       301,989,888    51,463,168       14.6%\nGPT-2 large      1280      36       707,788,800    64,328,960        8.3%\nGPT-2 xl         1600      48     1,474,560,000    80,411,200        5.2%\nLLaMA-2 7B       4096      32     6,442,450,944   131,072,000        2.0%\nLLaMA-3 8B       4096      32     6,442,450,944   525,336,576        7.5%" },

    { t: "callout", kind: "insight", title: "The share falls with scale — then LLaMA-3 reversed it",
      body: [{ t: "p", text: "Embeddings are **31.2%** of GPT-2 small and only **2.0%** of LLaMA-2 7B, because `vocab × d` grows linearly in width while the body grows quadratically. That is the usual story. Then LLaMA-3 took the vocabulary from 32,000 to 128,256 at the *same* `d_model` and pushed the share back up to **7.5%** — 525M parameters spent on the embedding table alone. It was a deliberate trade: a larger vocabulary means fewer tokens per sequence, which as lesson 4.8 measured is worth a great deal for non-English text and for context efficiency. Note also that both LLaMA models **tie** the input embedding to the output projection, so that 525M is paid once rather than twice." }] },

    { t: "p", text: "The practical consequence is that at small scale, decisions about vocabulary size are architecture decisions with real weight, while at large scale they are close to free. A 30k-vocabulary model and a 128k one differ by a third of GPT-2 small and by a rounding error at 70B." },

    { t: "h2", n: "06", text: "What the count does not tell you", id: "limits" },

    { t: "dl", items: [
      ["Memory at inference", "Parameters times bytes per parameter — 2 for fp16, 1 for int8 — plus activations and the KV cache, which grows with batch and sequence and often dominates at long context."],
      ["Memory at training", "Roughly 4x the parameter memory before activations: weights, gradients, and two Adam moments. A 7B model in fp16 is about 14GB of weights and around 56GB before you store a single activation."],
      ["Compute", "Forward FLOPs are roughly `2 × params` per token, backward about twice that, so training is near `6 × params` per token. That is the number to use for a training budget."],
      ["Capability", "Parameter count correlates with capability only within an architecture family, and even then data and training compute matter more. A well-trained 7B beats a badly-trained 70B routinely."]
    ] },

    { t: "callout", kind: "tradeoff", title: "Parameters are the wrong headline number",
      body: [{ t: "p", text: "Chinchilla's finding was that most large models of its era were substantially *under-trained* for their size — the compute would have been better spent on more tokens through a smaller model. Since then the trend has run toward smaller models trained far longer, because inference cost scales with parameters and is paid on every request forever, while training cost is paid once. So when you see a parameter count, the useful follow-up question is how many tokens it saw, not how big it is." }] },

    { t: "exercise", title: "Predict before you measure",
      tasks: [
        "Take a model card's configuration, compute 12·L·d² plus embeddings, then load the model and compare. Aim to be within 1%.",
        "Account for the residual exactly, as this lesson did for GPT-2's 82,944 biases.",
        "Compute the parameter count for the same budget spent on twice the depth against twice the width, and note the difference.",
        "Work out the embedding share for three models at different scales and find where it crosses 10%.",
        "Estimate training memory for a 7B model in fp16 with Adam, then check it against a real configuration."
      ] }
  ],

  takeaways: [
    "The reference's GPT-2 arithmetic is exact for weights: 124,356,864 against the checkpoint's 124,439,808.",
    "The 82,944 gap is precisely the bias vectors — 3,072 attention plus 3,840 FFN per block, times 12 blocks.",
    "Attention is 4d² per layer, the FFN with d_ff = 4d is 8d², so 12d² per layer in total.",
    "The 12·L·d² rule matched actual non-embedding parameters to a ratio of 1.0014 — it is the exact leading term, not a fit.",
    "The two MLP matrices hold 45% of GPT-2 small; the single largest tensor is the token embedding at 38.6M.",
    "Doubling depth doubles parameters; doubling width quadruples them, which is why models grow deep faster than wide.",
    "Head count does not change the parameter count at all — it is a reshape.",
    "Embedding share falls from 31.2% at GPT-2 small to 2.0% at LLaMA-2 7B, then rises to 7.5% at LLaMA-3 8B on its 128,256 vocabulary.",
    "Training memory is roughly 4x parameter memory before activations; training compute is about 6 × params per token.",
    "Parameter count is a poor headline — how many tokens a model saw usually matters more."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why did the reference's total differ from the checkpoint by 82,944?",
      options: ["A rounding error", "It counts weights only — the biases are 3,072 attention plus 3,840 FFN per block, across 12 blocks", "The checkpoint includes optimiser state", "The vocabulary size differs"],
      answer: 1,
      why: "6,912 bias parameters per block times 12 blocks is exactly 82,944. Most parameter formulas quote weights only, which here is a 0.07% omission. Some architectures drop biases altogether — LLaMA has none in its linear layers — which makes the arithmetic exact." },
    { stem: "Where does the 12·L·d² rule come from?",
      options: ["Empirical fitting", "Attention is 4d² (four d×d projections) and the FFN at d_ff = 4d is 8d², totalling 12d² per layer", "It counts the embedding matrix", "It approximates the LayerNorms"],
      answer: 1,
      why: "It is the exact leading term, not an approximation. Everything omitted — biases and LayerNorms, both O(d) — is one order smaller, which is why it matched actual non-embedding parameters at a ratio of 1.0014 for GPT-2 small." },
    { stem: "You double d_model. What happens to parameters per layer?",
      options: ["They double", "They quadruple, because the count is proportional to d²", "They stay the same", "They grow by 12d"],
      answer: 1,
      why: "d enters squared and L only linearly. That asymmetry is why architectures tend to grow deeper faster than wider, and why moving d_model from 4096 to 8192 is a four-times increase per layer rather than a doubling. It widens every activation and the KV cache too." },
    { stem: "Why did LLaMA-3's embedding share rise to 7.5% when LLaMA-2's was 2.0%?",
      options: ["It is a larger model", "It kept d_model at 4096 but took the vocabulary from 32,000 to 128,256", "It untied the embeddings", "It added positional embeddings"],
      answer: 1,
      why: "Embedding cost is vocab × d, so quadrupling the vocabulary at fixed width quadrupled that term to 525M while the body was unchanged. It was a deliberate trade — a larger vocabulary means fewer tokens per sequence, which matters a great deal for non-English text and context efficiency." }
  ] },

  interview: { title: "Interview", sub: "Model sizing", questions: [
    { level: "Core", q: "How do you estimate a transformer's parameter count from its config?",
      strong: "12·L·d² for the body, plus vocab × d for embeddings.",
      answer: [{ t: "p", text: "The body is 12 times layers times d_model squared. That's not a fitted approximation, it's the exact leading term: attention is four d-by-d projections for Q, K, V and the output, so 4d squared, and the feed-forward network with the standard d_ff of 4d is d by 4d plus 4d by d, so 8d squared. Twelve d squared per layer. Then add the embeddings, vocab times d_model, and positional embeddings if the model uses a learned table. I checked this on GPT-2 small: the rule gives 84,934,656 against an actual non-embedding count of 85,056,000, a ratio of 1.0014. Everything it omits is one order smaller — biases and LayerNorms are both O(d). If you want the exact figure you add those back: for GPT-2 the biases are 3,072 in attention and 3,840 in the FFN per block, which across 12 blocks is 82,944, and that accounts for the difference between the weights-only total of 124,356,864 and the checkpoint's 124,439,808 to the unit. Worth knowing that some architectures drop biases entirely — LLaMA has none in its linear layers — which makes the arithmetic clean." }] },
    { level: "Senior", q: "You have a fixed parameter budget. Deeper or wider?",
      strong: "Depth is cheaper per parameter, but the real constraints are the KV cache and training stability.",
      answer: [{ t: "p", text: "The arithmetic first: since the count is 12 L d squared, depth is linear and width is quadratic, so a fixed budget buys much more depth than width. Doubling d_model quadruples parameters per layer. But parameter count isn't the whole decision. Width has costs the parameter count hides — it widens every activation, so activation memory during training grows with it, and it widens the KV cache, which at long context and large batch is often the binding memory constraint at inference rather than the weights. Depth has its own costs: it's sequential, so it doesn't parallelise across layers and it adds latency per token in a way width doesn't, and deep stacks are harder to train, which is why Pre-LN and careful residual scaling matter more as you go deeper. Empirically the scaling-laws work found performance fairly insensitive to the aspect ratio across a broad middle range, so extreme choices in either direction are worse than something conventional. In practice I'd take the width from a similar published model at my scale, since that's a well-explored space, and spend any remaining budget on depth — and I'd hold back a lot of that budget for training tokens, because since Chinchilla the evidence is that most models are under-trained for their size, and inference cost is paid on every request forever while training is paid once." }] },
    { level: "Senior", q: "How much GPU memory do you need to train a 7B model?",
      strong: "About 4x the parameter memory before activations — roughly 56GB in fp16 with Adam.",
      answer: [{ t: "p", text: "Start from the weights: 7 billion parameters at 2 bytes in fp16 is about 14GB. Then gradients, same size, 14GB. Then the optimiser: Adam keeps two moments per parameter, and they're typically held in fp32 for stability, so that's another 56GB in the naive case, or 28GB if kept in fp16. Mixed-precision training usually also keeps an fp32 master copy of the weights, another 28GB. So depending on the exact recipe you're somewhere between 56 and 112GB before a single activation is stored — and activations are substantial, scaling with batch size, sequence length and depth, though gradient checkpointing trades compute to cut them dramatically. So a 7B model doesn't fit on a single 80GB card for full fine-tuning in most configurations. The ways out are the standard ones: ZeRO or FSDP to shard optimiser state, gradients and parameters across devices; gradient checkpointing for activations; and parameter-efficient methods like LoRA, which train a small number of low-rank adapters and leave the base weights frozen, dropping optimiser state to almost nothing. For compute rather than memory, the rule is about 6 FLOPs per parameter per token for training — 2 forward and roughly 4 backward — which is what I'd use to turn a token budget into a GPU-hour estimate." }] }
  ] }
});

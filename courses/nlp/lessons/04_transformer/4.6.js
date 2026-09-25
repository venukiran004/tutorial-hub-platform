/* ============================================================================
   LESSON 4.6 — Feed-Forward Network and Normalisation
   Mirrors 02_Transformers_InDepth.md · §7. Both worked norm examples
   reproduce; the SwiGLU 2/3 budget rule is verified to 0.9999; RMSNorm's
   speed claim did NOT reproduce on CPU; Pre-LN vs Post-LN gradient flow
   differs by ~780,000x (scratchpad/nlp/n45.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.6",

  lede: "**Post-LN gradients reached the first of 24 blocks at 1.918e-07. Pre-LN reached it at 1.495e-01 — about 780,000 times larger.** Same depth, same width, same data; the only difference is whether the normalisation sits inside the residual branch or after the addition. That one placement decision is why the original transformer needed learning-rate warmup to train at all and why every model since GPT-2 moved the layer norm. This lesson covers the two-thirds of each block that is not attention: the feed-forward network, its activations, and the normalisation around it.",

  objectives: [
    "Explain what the position-wise FFN does that attention does not",
    "Compute LayerNorm and RMSNorm by hand and verify against PyTorch",
    "Derive SwiGLU's two-thirds rule and check it against LLaMA's actual dimensions",
    "Measure the gradient difference between Pre-LN and Post-LN",
    "Judge normalisation speed claims against your own hardware"
  ],

  prerequisites: ["4.5", "4.1"],

  blocks: [

    { t: "h2", n: "01", text: "The position-wise FFN", id: "ffn" },

    { t: "math", tex: "\\text{FFN}(x) = \\text{GELU}(xW_1 + b_1)\\,W_2 + b_2" },

    { t: "p", text: "Applied independently and identically to every position — hence *position-wise*. It has no idea other tokens exist. That division of labour is the point: attention **mixes** information between tokens, the FFN **transforms** each token on its own, and a block alternates between the two." },

    { t: "out", text:
"d_model -> d_ff -> d_model     512 -> 2048 -> 512\n\n  x    (512,)\n  W1   (512, 2048)     expand\n  W2   (2048, 512)     project back\n\n  parameters = 2 x 512 x 2048 = 2,097,152 per layer\n  about two-thirds of all non-embedding parameters" },

    { t: "callout", kind: "mental", title: "The FFN as key-value memory",
      body: [{ t: "p", text: "A productive way to read it: the rows of `W_1` act as **keys** that detect patterns in the token's representation, the hidden activation records *which* patterns fired, and the columns of `W_2` are the **values** written back into the residual stream. Under that reading, pretraining stores facts in these weights — the association from *Paris* to *France* lives in a set of `W_1` rows that fire and `W_2` columns that respond. It is consistent with the finding from lesson 4.1 that the FFN holds twice the parameters of the attention block: attention decides what to look at, the FFN holds what is known." }] },

    { t: "h2", n: "02", text: "Activations", id: "activations" },

    { t: "out", text:
"x       ReLU      GELU      GELU-tanh   SiLU\n-3.0    0.0000    -0.0041   -0.0036     -0.1423\n-2.0    0.0000    -0.0455   -0.0454     -0.2384\n-1.0    0.0000    -0.1587   -0.1588     -0.2689\n-0.5    0.0000    -0.1543   -0.1543     -0.1888\n 0.0    0.0000     0.0000    0.0000      0.0000\n 0.5    0.5000     0.3457    0.3457      0.3112\n 1.0    1.0000     0.8413    0.8412      0.7311\n 2.0    2.0000     1.9545    1.9546      1.7616\n 3.0    3.0000     2.9959    2.9964      2.8577\n\nmax |GELU exact - tanh approximation| = 4.13e-04" },

    { t: "math", tex: "\\text{GELU}(x) = x\\,\\Phi(x) = x \\cdot \\tfrac{1}{2}\\left[1 + \\operatorname{erf}\\!\\left(\\tfrac{x}{\\sqrt{2}}\\right)\\right]" },

    { t: "p", text: "GELU weights the input by the probability that a standard normal falls below it — a smooth gate rather than ReLU's hard cutoff. Note that GELU and SiLU go *negative* for small negative inputs and return toward zero further out; they do not hard-zero, so the gradient never dies completely the way ReLU's does. The tanh approximation agrees with the exact form to 4.13e-04, which is why it is used without concern." },

    { t: "h2", n: "03", text: "SwiGLU and the two-thirds rule", id: "swiglu" },

    { t: "math", tex: "\\text{FFN}_{\\text{SwiGLU}}(x) = \\big(\\text{Swish}(xW_1) \\odot (xW_3)\\big) W_2" },

    { t: "p", text: "A gated linear unit splits the up-projection into two branches and multiplies them elementwise, one acting as a learned gate. That is three weight matrices instead of two, so to keep the budget fixed `d_ff` shrinks by a factor of two-thirds. The reference states the rule; here is whether it actually balances." },

    { t: "out", text:
"d_model 512    standard  d_ff 2048    params   2,097,152\n               SwiGLU    d_ff 1365    params   2,096,640    0.9998x\n\nd_model 4096   standard  d_ff 16384   params 134,217,728\n               SwiGLU    d_ff 10922   params 134,209,536    0.9999x" },

    { t: "callout", kind: "insight", title: "Why LLaMA's hidden size is 11008",
      body: [{ t: "p", text: "The rule balances to within 0.02%. And it explains a number that looks arbitrary: LLaMA-7B has `d_model = 4096` and an FFN hidden size of **11008**. Compute `(8/3) × 4096 = 10922.7`, then round up to a multiple of 256 for hardware alignment and you get exactly **11008** — which is 43 × 256. The odd-looking dimension is two-thirds of four times the model width, rounded for tensor cores. The payoff is roughly 1–2% better perplexity for the same parameter count and FLOPs, which is why LLaMA, PaLM and Mistral all use it." }] },

    { t: "h2", n: "04", text: "LayerNorm", id: "layernorm" },

    { t: "math", tex: "\\mu = \\frac{1}{d}\\sum_{i=1}^{d} x_i, \\quad \\sigma^2 = \\frac{1}{d}\\sum_{i=1}^{d}(x_i - \\mu)^2, \\quad \\text{LN}(x) = \\gamma \\odot \\frac{x - \\mu}{\\sqrt{\\sigma^2 + \\epsilon}} + \\beta" },

    { t: "p", text: "Normalisation runs **across the feature dimension, per token** — not across the batch. That independence from batch statistics is what makes it safe with variable sequence lengths and at batch size 1, which BatchNorm is not." },

    { t: "out", text:
"x = [2, 4, 4, 4, 5, 5, 7, 9],  d = 8\n\n  mu    = 5.0000                  reference says 5\n  var   = 4.0000   sigma = 2.0000  reference says 4 and 2\n  x_hat = [-1.5, -0.5, -0.5, -0.5, 0.0, 0.0, 1.0, 2.0]\n\n  reference: [-1.5, -0.5, -0.5, -0.5, 0, 0, 1.0, 2.0]   reproduces exactly\n  resulting mean 0.00e+00, variance 1.0000\n  nn.LayerNorm agrees to four decimal places" },

    { t: "h2", n: "05", text: "RMSNorm", id: "rmsnorm" },

    { t: "math", tex: "\\text{RMSNorm}(x) = \\gamma \\odot \\frac{x}{\\sqrt{\\frac{1}{d}\\sum_i x_i^2 + \\epsilon}}" },

    { t: "out", text:
"same x = [2, 4, 4, 4, 5, 5, 7, 9]\n\n  mean of squares = 29.0000          reference: 232/8 = 29\n  RMS = sqrt(29)  = 5.3852           reference says 5.385\n  out = [0.3714, 0.7428, 0.7428, 0.7428, 0.9285, 0.9285, 1.2999, 1.6713]\n\n  reference: [0.371, 0.743, 0.743, 0.743, 0.928, 0.928, 1.300, 1.671]  exact\n\n  output mean = 0.9285, NOT 0" },

    { t: "callout", kind: "insight", title: "RMSNorm does not centre, and that turns out not to matter",
      body: [{ t: "p", text: "Drop the mean subtraction and the `beta` shift, and normalise by root-mean-square alone. The output mean is **0.9285** rather than 0 — the vector is rescaled but not recentred. The empirical finding that made RMSNorm standard is that re-centring contributes essentially nothing to training stability; the *rescaling* is what matters. So you get half the parameters (`gamma` only, no `beta`) and one fewer reduction pass over the vector, at equal quality. Every recent LLM — LLaMA, Mistral, Gemma, Qwen — uses it." }] },

    { t: "out", text:
"d = 4096, batch 64 x 512, torch 2.10 CPU, 4 threads\n\n  LayerNorm (ATen fused)          43.80 ms\n  RMSNorm, naive composed ops    114.32 ms    +161.0%\n  RMSNorm, nn.RMSNorm             114.73 ms    +161.9%\n\n  parameters: LayerNorm 8,192 (gamma + beta)\n              RMSNorm   4,096 (gamma only)" },

    { t: "callout", kind: "warn", title: "The 10-15% speed claim did not reproduce here",
      body: [{ t: "p", text: "RMSNorm was **2.6x slower** than LayerNorm on this setup, and using PyTorch's own `nn.RMSNorm` rather than a hand-composed version changed nothing. The reason is not the mathematics — RMSNorm genuinely does less arithmetic — but that ATen's `LayerNorm` CPU kernel is heavily optimised while its `RMSNorm` path is not. The reference's figure comes from GPU training of large models with custom fused kernels, where the saved reduction is real. The lesson generalises: **an operator's theoretical cost and its measured cost are different things**, and which one you get depends on whether somebody wrote a good kernel for your backend. The parameter saving, by contrast, is exactly half and holds everywhere." }] },

    { t: "h2", n: "06", text: "Pre-LN against Post-LN", id: "preln" },

    { t: "out", text:
"ORIGINAL (Post-LN)                   MODERN (Pre-LN)\n  x -> SubLayer -> Add(x) -> LN        x -> LN -> SubLayer -> Add(x)\n\n  x = LN(x + SubLayer(x))              x = x + SubLayer(LN(x))" },

    { t: "p", text: "In Pre-LN the residual path is never normalised — it is a clean identity from the input all the way to the output. In Post-LN every residual addition passes through a normalisation on its way up the stack. Twenty-four blocks of that makes a measurable difference." },

    { t: "out", text:
"24 blocks, d = 128, identical initialisation and input\n\nPost-LN   grad norm at block 0   1.918e-07\n          grad norm at block 23  1.045e-06\n          first six: 1.92e-07 1.95e-07 2.00e-07 1.99e-07 2.05e-07 2.12e-07\n\nPre-LN    grad norm at block 0   1.495e-01\n          grad norm at block 23  1.410e-01\n          first six: 1.50e-01 1.45e-01 1.48e-01 1.48e-01 1.47e-01 1.51e-01" },

    { t: "callout", kind: "crit", title: "Roughly 780,000x more gradient reaches the bottom",
      body: [{ t: "p", text: "Post-LN delivers **1.918e-07** to the first block; Pre-LN delivers **1.495e-01**. Pre-LN is also essentially *flat* across depth — 0.150 at the bottom, 0.141 at the top, a ratio of 0.9 — because the unobstructed residual path carries gradient straight through. Post-LN's profile is not merely smaller but structurally different: the normalisation sits on the trunk, and every block attenuates what passes through it. This is exactly why the original transformer needed a learning-rate warmup schedule — the early updates with a cold optimiser and attenuated gradients would otherwise diverge — and why deep Post-LN stacks were notoriously unstable. Pre-LN needs no warmup, which is why GPT-2 onward, LLaMA and ViT all use it." }] },

    { t: "diagram", kind: "compare", title: "Where the normalisation sits",
      columns: [
        { title: "Post-LN, the original", tone: "warn", items: [
          "x = LN(x + SubLayer(x))",
          "Normalisation on the residual trunk",
          "Gradient at block 0: 1.918e-07",
          "Needs learning-rate warmup",
          "Deep stacks can diverge",
          "Original Transformer, BERT"
        ] },
        { title: "Pre-LN, the modern default", tone: "good", items: [
          "x = x + SubLayer(LN(x))",
          "Residual path is a clean identity",
          "Gradient at block 0: 1.495e-01",
          "No warmup required",
          "Flat gradient profile with depth",
          "GPT-2 onward, LLaMA, ViT"
        ] }
      ] },

    { t: "callout", kind: "note", title: "Pre-LN is not strictly better",
      body: [{ t: "p", text: "The trade is real: because the residual stream is never normalised, its magnitude *grows* with depth in a Pre-LN model, and the relative contribution of later blocks shrinks. Some work finds Post-LN reaches slightly better final quality when you can afford to tune the warmup carefully. The reason Pre-LN won is not that it produces better models but that it produces models that train reliably without a schedule you have to get right — which at scale, where a diverged run costs weeks, matters more. Hybrids exist, and some recent models normalise in both places." }] },

    { t: "exercise", title: "Measure the block yourself",
      tasks: [
        "Compute LayerNorm and RMSNorm by hand on a vector and check both against PyTorch, including the eps term.",
        "Benchmark LayerNorm against nn.RMSNorm on your hardware and backend, and record which is faster.",
        "Compute the SwiGLU d_ff for a model you use and check it against the published hidden size.",
        "Build 24-block Pre-LN and Post-LN stacks, backpropagate, and plot the gradient norm against depth.",
        "Track the residual stream's magnitude layer by layer in a Pre-LN model and confirm it grows with depth."
      ] }
  ],

  takeaways: [
    "The FFN is position-wise — attention mixes tokens, the FFN transforms each one alone; it holds about two-thirds of non-embedding parameters.",
    "Read it as key-value memory: W_1 rows detect patterns, W_2 columns write values back, and pretrained facts live there.",
    "GELU and SiLU go negative for small negative inputs rather than hard-zeroing; the GELU tanh approximation agrees to 4.13e-04.",
    "SwiGLU's two-thirds rule balances the budget to 0.9998-0.9999 of a standard FFN.",
    "LLaMA-7B's 11008 is (8/3) x 4096 = 10922.7 rounded up to a multiple of 256 — 43 x 256.",
    "Both the LayerNorm and RMSNorm worked examples reproduce exactly; RMSNorm's output mean is 0.9285, not 0, because it rescales without recentring.",
    "RMSNorm was 2.6x SLOWER than LayerNorm on torch 2.10 CPU even using nn.RMSNorm — the 10-15% claim is a GPU fused-kernel result. The half-parameter saving is universal.",
    "Post-LN delivered 1.918e-07 of gradient to the first of 24 blocks; Pre-LN delivered 1.495e-01, roughly 780,000x more.",
    "Pre-LN's gradient profile is flat with depth (ratio 0.9 top to bottom) because the residual path is an unobstructed identity.",
    "Pre-LN won for reliability without warmup, not because it produces strictly better models."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "What does the position-wise FFN do that attention does not?",
      options: ["It mixes information between tokens", "It transforms each token independently, with no access to any other position", "It normalises the activations", "It computes attention weights"],
      answer: 1,
      why: "A block alternates between the two roles: attention mixes across positions, the FFN transforms each position alone. The FFN is where most parameters sit — roughly two-thirds of the non-embedding total — and under the key-value memory reading it is where pretrained factual associations are stored." },
    { stem: "Why is LLaMA-7B's FFN hidden size 11008?",
      options: ["An arbitrary choice", "It is (8/3) x 4096 = 10922.7 rounded up to a multiple of 256 for hardware alignment", "It is 4 x d_model minus overhead", "It matches the vocabulary size"],
      answer: 1,
      why: "SwiGLU uses three weight matrices instead of two, so d_ff shrinks by two-thirds to hold the parameter budget fixed — verified at 0.9999 of a standard FFN. (8/3) x 4096 is 10922.7, and rounding up to a 256 multiple gives 11008, which is 43 x 256." },
    { stem: "What did benchmarking RMSNorm against LayerNorm on CPU show?",
      options: ["RMSNorm was 10-15% faster as claimed", "RMSNorm was 2.6x slower, because ATen's LayerNorm kernel is optimised and its RMSNorm path is not", "They were identical", "RMSNorm failed to run"],
      answer: 1,
      why: "43.80 ms against 114.73 ms, and using nn.RMSNorm rather than composed ops changed nothing. RMSNorm genuinely does less arithmetic; whether that becomes speed depends on whether someone wrote a good kernel for your backend. The parameter saving — exactly half, gamma only — holds everywhere." },
    { stem: "Why did Pre-LN replace Post-LN?",
      options: ["It produces better final quality", "Because the residual path stays an unobstructed identity, so gradients reach early layers — 1.495e-01 against 1.918e-07 — and no warmup is needed", "It uses fewer parameters", "It is faster"],
      answer: 1,
      why: "Post-LN puts normalisation on the residual trunk, so every block attenuates what passes through. Pre-LN's gradient profile is flat with depth, ratio 0.9 top to bottom. Some work finds Post-LN reaches slightly better quality with carefully tuned warmup — Pre-LN won on reliability, which matters more when a diverged run costs weeks." }
  ] },

  interview: { title: "Interview", sub: "FFN and normalisation", questions: [
    { level: "Core", q: "Why does a transformer block need a feed-forward network at all?",
      strong: "Attention only mixes and reweights; the FFN provides the per-token non-linear transformation.",
      answer: [{ t: "p", text: "Because attention on its own is close to a weighted average — it mixes and reweights information across positions, but the mixing itself is linear once the weights are fixed, and it does nothing to transform a token's representation in isolation. The FFN provides that: two linear layers with a non-linearity between them, applied identically and independently at every position. So the block alternates roles — attention decides what each token should look at, the FFN processes what it found. The useful mental model is key-value memory: the rows of the first matrix act as pattern detectors, the hidden activation records which fired, and the columns of the second write values back into the residual stream. Under that reading, pretrained facts live in FFN weights rather than in attention, which is consistent with where the parameters are — the FFN holds about two-thirds of the non-embedding total, roughly 2.1M against 1.05M per block at the original configuration. When people talk about editing facts in a model, the FFN layers are what they're editing." }] },
    { level: "Senior", q: "What is the difference between Pre-LN and Post-LN, and which would you use?",
      strong: "Pre-LN keeps the residual path clean so gradients reach the bottom; use it unless you have a reason not to.",
      answer: [{ t: "p", text: "Post-LN, the original, normalises after the residual addition: x becomes LN of x plus SubLayer of x. Pre-LN moves the norm inside the branch: x becomes x plus SubLayer of LN of x. The consequence is that in Pre-LN the residual path is a clean identity from input to output, never passing through a normalisation, whereas in Post-LN every block attenuates what flows along the trunk. I measured it on 24 blocks with matched initialisation: gradient norm reaching the first block was 1.918e-07 for Post-LN and 1.495e-01 for Pre-LN, roughly 780,000 times larger. Pre-LN's profile is also flat with depth — 0.150 at the bottom against 0.141 at the top — while Post-LN's is uniformly tiny. That's exactly why the original transformer needed learning-rate warmup and why deep Post-LN stacks were unstable. I'd default to Pre-LN, which is what GPT-2 onward, LLaMA and ViT all do. But I'd be honest that it isn't strictly better: because the residual stream is never normalised its magnitude grows with depth, later blocks contribute proportionally less, and some work finds Post-LN reaching slightly better final quality when the warmup is tuned well. Pre-LN won on reliability rather than peak quality, and at scale reliability is worth more." }] },
    { level: "Senior", q: "A paper claims a 15% speedup from a new normalisation layer. How do you evaluate that?",
      strong: "Reproduce it on your hardware and backend — theoretical op count and measured time diverge routinely.",
      answer: [{ t: "p", text: "I'd reproduce it before believing it, because an operator's arithmetic cost and its wall-clock cost are different quantities and the gap is whether someone wrote a good kernel for your backend. I have a concrete case: RMSNorm does strictly less work than LayerNorm — no mean, no beta, one fewer reduction — and the literature reports 10 to 15 percent savings. On torch 2.10 CPU I measured it 2.6 times slower, 114.73 ms against 43.80 ms, and switching from a hand-composed implementation to PyTorch's own nn.RMSNorm changed nothing. ATen's LayerNorm CPU kernel is heavily optimised and the RMSNorm path isn't. So the reported speedup is real on the hardware and kernels it was measured on, and absent on mine. The questions I'd ask of any such claim: what hardware and precision, what batch and dimension shapes, is it a fused kernel or composed ops, and is it measured in isolation or end to end in a training step where it may be a rounding error against the matmuls. I'd also separate claims that are hardware-dependent from ones that aren't — RMSNorm's halving of parameters, gamma only instead of gamma and beta, is exact and holds everywhere, so if memory is my constraint I'd adopt it regardless of the speed result." }] }
  ] }
});

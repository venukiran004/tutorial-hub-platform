/* ============================================================================
   LESSON 4.1 — Why Transformers
   Mirrors 02_Transformers_InDepth.md · §1-2. The sequential bottleneck is
   benchmarked against attention: it wins at short lengths and LOSES at 512
   (scratchpad/nlp/n41.py). Embeddings move to 4.2.
   ========================================================================= */
EC.receiveLesson({
  id: "4.1",

  lede: "**At 512 tokens, attention was 25% slower than the LSTM it replaced.** 63.36 ms against 47.79 ms on CPU, and attention only won below about 256 tokens. That is not an argument against transformers — it is the start of understanding what they actually bought, which is not raw FLOPs. Attention trades *more* arithmetic for arithmetic that has no sequential dependency, and the win shows up in training parallelism and gradient path length rather than in a single forward pass. This lesson measures both sides honestly.",

  objectives: [
    "State precisely which RNN limitation attention removes, and which it does not",
    "Measure the crossover where attention's quadratic cost overtakes recurrence",
    "Explain why constant path length matters for gradients",
    "Read the original paper's configuration and its parameter split",
    "Place the architecture in the timeline of what branched from it"
  ],

  prerequisites: ["3.6", "3.3"],

  blocks: [

    { t: "h2", n: "01", text: "What was wrong with recurrence", id: "rnn" },

    { t: "table",
      head: ["RNN problem", "Transformer answer"],
      rows: [
        ["Sequential processing along time", "All positions attend in parallel"],
        ["Vanishing gradients over long spans", "Direct connection between any two positions"],
        ["Fixed-size hidden state bottleneck", "Every token can read every other token"],
        ["Poor GPU utilisation", "The whole computation is matrix multiplies"]
      ] },

    { t: "p", text: "The third row is the one people underrate. An RNN compresses everything it has read into one fixed-size vector, so information about token 5 must survive being overwritten 500 times to reach token 505. Attention has no such compression — token 505 reads token 5 directly." },

    { t: "h2", n: "02", text: "Timing both", id: "timing" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n41.py — LSTM against attention, same width", code:
"import torch, torch.nn as nn\n\nD, B = 256, 16\nrnn  = nn.LSTM(D, D, batch_first=True).eval()\nattn = nn.MultiheadAttention(D, 8, batch_first=True).eval()\n\nfor T in [32, 64, 128, 256, 512]:\n    x = torch.randn(B, T, D)\n    with torch.no_grad():\n        r = bench(lambda: rnn(x))\n        a = bench(lambda: attn(x, x, x, need_weights=False))\n    print(T, r, a, r / a)",
      caption: "Forward pass only, four CPU threads, timed after warm-up. Both modules are the same width so the comparison is like for like." },

    { t: "out", text:
"seq len   LSTM ms    attention ms   ratio\n32        3.21       1.75           1.84x\n64        7.05       4.51           1.56x\n128      12.76      10.26           1.24x\n256      24.01      22.62           1.06x\n512      47.79      63.36           0.75x" },

    { t: "callout", kind: "warn", title: "The reference's \"10-100x faster\" is about training on GPUs, not this",
      body: [{ t: "p", text: "Attention's advantage *shrinks* with sequence length here and reverses by 512. That is exactly what the complexities predict: the LSTM is **O(T)** in sequential steps but each step is cheap, while attention is **O(T²)** in arithmetic but perfectly parallel. On a CPU forward pass there is little parallelism to exploit, so the quadratic term simply wins. The paper's speedup is a *training* claim on GPUs, where the RNN's sequential dependency leaves the hardware idle between steps and the transformer's matrix multiplies saturate it. Both statements are true; they measure different things, and conflating them is how people end up surprised that a transformer is slow on long inputs." }] },

    { t: "h2", n: "03", text: "Path length", id: "path" },

    { t: "p", text: "The durable advantage is structural rather than temporal. Count the steps a gradient must traverse to connect two positions:" },

    { t: "out", text:
"T=10     RNN:    9 steps of gradient path   attention: 1 step\nT=100    RNN:   99 steps                    attention: 1 step\nT=512    RNN:  511 steps                    attention: 1 step\nT=4096   RNN: 4095 steps                    attention: 1 step" },

    { t: "callout", kind: "insight", title: "Constant path length is the real win",
      body: [{ t: "p", text: "Every step an RNN's gradient passes through multiplies it by a Jacobian, and a product of 511 such factors either vanishes or explodes — the problem gating mitigates but does not remove. Attention connects any two positions in **one** step regardless of distance, so that product never forms along the time axis. This is why a transformer can learn a dependency spanning hundreds of tokens that an LSTM cannot, and it holds no matter what the wall clock says. When you hear that attention \"solved\" long-range dependencies, this is the mechanism." }] },

    { t: "diagram", kind: "compare", title: "What each architecture costs",
      columns: [
        { title: "Recurrence", tone: "warn", items: [
          "O(T) sequential steps, cannot parallelise",
          "O(T) arithmetic in the sequence length",
          "Path between positions: up to T-1",
          "Fixed hidden state is a bottleneck",
          "Memory constant in T",
          "Faster per forward pass at long T"
        ] },
        { title: "Self-attention", tone: "good", items: [
          "1 parallel step per layer",
          "O(T squared) arithmetic and memory",
          "Path between positions: always 1",
          "Every token reads every token",
          "Memory quadratic in T",
          "Wins on training throughput, not FLOPs"
        ] }
      ] },

    { t: "h2", n: "04", text: "The architecture", id: "architecture" },

    { t: "diagram", kind: "flow", title: "Encoder-decoder, as the paper defined it", cols: 3,
      nodes: [
        { id: "s", text: "Source tokens", tone: "accent" },
        { id: "e", text: "Encoder x N: self-attention then FFN", tone: "teal" },
        { id: "r", text: "Contextualised representations", tone: "teal" },
        { id: "t", text: "Target tokens so far", tone: "accent" },
        { id: "d", text: "Decoder x N: masked self-attn, cross-attn, FFN", tone: "violet" },
        { id: "o", text: "Next-token probabilities", tone: "good" }
      ],
      edges: [["s","e"],["e","r"],["t","d"],["r","d"],["d","o"]] },

    { t: "dl", items: [
      ["Encoder block", "Multi-head self-attention, then a feed-forward network, each wrapped in a residual connection and layer normalisation."],
      ["Decoder block", "The same, plus a cross-attention sublayer between them that reads the encoder output — three sublayers rather than two."],
      ["Masked self-attention", "The decoder's first sublayer, prevented from attending to future positions so training can be parallel while inference stays autoregressive."],
      ["Cross-attention", "Queries from the decoder, keys and values from the encoder. This is the only place the two stacks meet."]
    ] },

    { t: "out", text:
"the original paper's configuration\n\n  d_model   512     embedding dimension\n  n_heads     8     attention heads\n  d_ff     2048     FFN inner dimension, 4 x d_model\n  N           6     encoder layers = decoder layers\n  d_k = d_v  64     d_model / n_heads" },

    { t: "h2", n: "05", text: "Where the parameters actually are", id: "params" },

    { t: "out", text:
"per encoder block, at the paper's configuration\n\n  attention (4 projections of 512x512)   1,050,624 params\n  FFN (512->2048->512)                    2,099,712 params\n\n  the FFN is 2.00x the attention block" },

    { t: "callout", kind: "insight", title: "Two-thirds of a block is the feed-forward network",
      body: [{ t: "p", text: "Attention gets all the attention, and it holds a third of the parameters. The FFN — two linear layers with a non-linearity between them, applied identically at every position — holds twice as many. That ratio is fixed by `d_ff = 4 x d_model`, a convention from the original paper that nearly every model since has kept. It matters practically: when you are budgeting memory or choosing what to quantise, the FFN is the larger target, and much of the recent efficiency work (mixture of experts in particular, which lesson 5.10 covers) is about making those specific parameters cheaper to use." }] },

    { t: "h2", n: "06", text: "The timeline", id: "timeline" },

    { t: "diagram", kind: "timeline", title: "From one paper to everything", span: [2017, 2024], tick: 1,
      lanes: [
        { label: "Encoder-only", tone: "teal", bars: [[2018, 2020, "BERT, RoBERTa", "teal"]] },
        { label: "Decoder-only", tone: "violet", bars: [[2018, 2024, "GPT-1 through GPT-4o, LLaMA, Claude", "violet"]] },
        { label: "Encoder-decoder", tone: "accent", bars: [[2019, 2021, "T5, BART", "accent"]] },
        { label: "Beyond text", tone: "good", bars: [[2020, 2024, "ViT, multimodal, Gemini", "good"]] }
      ] },

    { t: "p", text: "The striking thing is the convergence. Three architectural families branched immediately from the 2017 paper, and by 2023 the decoder-only line had absorbed most of the attention and most of the funding — not because encoder-only models are worse at what they do, but because next-token prediction turned out to be a training objective that scales without needing labelled data. Lesson 5.1 covers what each family is still genuinely better at." },

    { t: "exercise", title: "Measure the crossover yourself",
      tasks: [
        "Reproduce the LSTM-against-attention benchmark on your hardware and find the sequence length where they cross.",
        "Re-run it on a GPU if you have one and see how far the crossover moves.",
        "Time the backward pass as well as the forward. The gap should widen in attention's favour — explain why.",
        "Compute the FFN-to-attention parameter ratio for a model you use and confirm it is close to 2.",
        "Measure the embedding and positional-encoding magnitudes in a model of your choice and check whether it scales at all."
      ] }
  ],

  takeaways: [
    "Attention beat an LSTM by 1.84x at 32 tokens and lost by 25% at 512 — its arithmetic is quadratic in sequence length.",
    "The paper's 10-100x is a GPU training claim: recurrence leaves hardware idle between sequential steps, attention saturates it.",
    "The durable advantage is path length — 1 step between any two positions against up to T-1 — which removes vanishing gradients along the time axis.",
    "Original configuration: d_model 512, 8 heads, d_ff 2048, 6 layers, d_k = d_v = 64.",
    "The FFN holds 2.00x the parameters of the attention block; two-thirds of each block is not attention."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why was attention slower than the LSTM at 512 tokens?",
      options: ["A benchmarking error", "Attention's arithmetic is quadratic in sequence length, and a CPU forward pass offers little parallelism to offset it", "The LSTM had fewer parameters", "MultiheadAttention is unoptimised"],
      answer: 1,
      why: "63.36 ms against 47.79 ms, with attention's advantage shrinking monotonically from 1.84x at T=32. The LSTM is O(T) sequential steps of cheap work; attention is O(T squared) arithmetic done in parallel. The paper's speedup claim is about GPU training, where the RNN's sequential dependency leaves hardware idle — a different measurement." },
    { stem: "What is the structural advantage attention has regardless of wall clock?",
      options: ["Fewer parameters", "Constant path length — any two positions are one step apart, so no long product of Jacobians forms", "Lower memory use", "Better initialisation"],
      answer: 1,
      why: "At 4,096 tokens an RNN gradient traverses 4,095 steps, each multiplying by a Jacobian, and that product vanishes or explodes. Attention connects any pair in one step, so the product never forms along the time axis. This is what actually lets transformers learn dependencies an LSTM cannot." },
    { stem: "Where are most of a transformer block's parameters?",
      options: ["In the attention projections", "In the feed-forward network, at 2.00x the attention block", "In the layer norms", "Split evenly"],
      answer: 1,
      why: "At the paper's configuration, attention holds 1,050,624 parameters per encoder block and the FFN holds 2,099,712. The ratio follows from d_ff = 4 x d_model, a convention nearly every later model kept. It matters when budgeting memory or choosing what to quantise." }
  ] },

  interview: { title: "Interview", sub: "Transformer motivation", questions: [
    { level: "Core", q: "Why did transformers replace RNNs?",
      strong: "Training parallelism and constant path length — not fewer FLOPs.",
      answer: [{ t: "p", text: "Two reasons, and it's worth being precise because the usual answer — 'they're faster' — is only true in a specific sense. The first is training parallelism. An RNN processes tokens sequentially, so on a GPU the hardware sits idle between steps and you can't use the parallelism you're paying for. Attention computes every position at once as matrix multiplies, which saturates the hardware, and that's what made it practical to train much larger models on much more text. But it's not fewer FLOPs — attention is quadratic in sequence length where recurrence is linear. I benchmarked both on CPU and attention won by 1.84x at 32 tokens, then lost by 25% at 512, because on a CPU forward pass there's little parallelism to exploit and the quadratic term simply dominates. The second reason is the durable one: path length. In an RNN a gradient connecting two positions traverses up to T-1 steps, each multiplying by a Jacobian, and at 4,096 tokens that product vanishes or explodes — gating mitigates it but doesn't remove it. Attention connects any two positions in one step, so the product never forms along the time axis. That's what actually lets a transformer learn long-range dependencies, and it holds regardless of the wall clock." }] },
    { level: "Core", q: "Walk through the original encoder-decoder architecture.",
      strong: "Encoder blocks of self-attention plus FFN; decoder adds masked self-attention and cross-attention.",
      answer: [{ t: "p", text: "The encoder takes source tokens, embeds them, adds positional information, and passes them through N identical blocks. Each block is multi-head self-attention followed by a position-wise feed-forward network, with a residual connection and layer normalisation around each sublayer. The output is one contextualised vector per source token. The decoder has N blocks with three sublayers rather than two: masked self-attention over the target tokens generated so far, then cross-attention where the queries come from the decoder and the keys and values from the encoder output — that's the only place the two stacks meet — then the feed-forward network. The masking is what lets training be parallel while inference stays autoregressive: you feed the whole target sequence at once and the mask prevents each position seeing its own future. The original configuration was d_model 512, 8 heads, d_ff 2048, 6 layers each side, d_k and d_v of 64. One detail worth knowing is where the parameters sit: the FFN holds twice as many as the attention block, about 2.1M against 1.05M per encoder block, because d_ff is four times d_model. Most of a transformer is not attention." }] },
    { level: "Senior", q: "Someone says a transformer is always faster than an LSTM. How do you respond?",
      strong: "Ask which measurement — it's a training-throughput claim, and it reverses on long sequences.",
      answer: [{ t: "p", text: "I'd ask what's being measured, because the claim is true for training throughput on a GPU and false in general. Attention is O(T squared) in arithmetic and memory where recurrence is O(T); what attention buys is that all of that work is parallel, whereas an RNN's is inherently sequential. So on a GPU during training, where the batch and sequence dimensions can saturate the hardware, transformers win enormously. On a single CPU forward pass they may not: I measured PyTorch's MultiheadAttention against an LSTM at matched width and attention led 1.84x at 32 tokens, 1.24x at 128, essentially tied at 256, and lost by 25% at 512. The advantage shrank monotonically with length, exactly as the complexities predict. This matters practically in two places. Long-context inference is where the quadratic memory term becomes the binding constraint, which is why there's a whole literature on FlashAttention, sliding windows and linear attention. And autoregressive generation is the case people find most surprising — decoding is sequential regardless of architecture, so a transformer generates one token at a time just like an RNN, and it recomputes or caches attention over the whole prefix each step. That's why KV caching exists and why state-space models like Mamba are interesting again: constant per-token state during generation is a real advantage there." }] }
  ] }
});

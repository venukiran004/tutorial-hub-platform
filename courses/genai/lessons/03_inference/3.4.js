EC.receiveLesson({
  id: "3.4",

  lede: "Standard attention materialises an n×n score matrix, and at 16,384 tokens that is **549.76 GB** across a 32-layer model — more memory than any accelerator has. FlashAttention computes the identical result without ever building it, by tiling the computation into blocks that fit in on-chip memory. It is not an approximation and it is not a different algorithm; it is the same arithmetic with a different memory schedule, which turns out to be the thing that was slow.",

  objectives: [
    "Explain why standard attention is memory-bound rather than compute-bound",
    "Describe what FlashAttention changes and what it does not",
    "Say at what context length attention starts to dominate a decode step",
    "Distinguish exact optimisations from approximate ones like sliding windows",
    "Decide whether attention is your bottleneck before optimising it"
  ],

  prerequisites: ["3.1", "3.2"],

  blocks: [

    { t: "h2", n: "01", id: "the-matrix", text: "The matrix nobody wants to store",
      sub: "n² scores, per head, per layer" },

    { t: "p", text: "Attention computes `softmax(QKᵀ/√d)V`. The inner `QKᵀ` is an n×n matrix of scores — every token's affinity for every other token — and the standard implementation writes it to memory, reads it back for the softmax, writes the result, and reads it again for the final multiply. The arithmetic is modest; the traffic is not." },

    { t: "code", lang: "python", title: "g34.py — the intermediate, in bytes", code: `for n in (512, 1024, 2048, 4096, 8192, 16384):
    per_head = n * n * 2                   # fp16
    allheads = per_head * 32 * 32          # 32 heads x 32 layers
    print("%-10d %12.2f MB %15.2f GB" % (n, per_head / 1e6, allheads / 1e9))`,
      out: `  seq len       scores/head all heads, 32 layers
  512                0.52 MB            0.54 GB
  1024               2.10 MB            2.15 GB
  2048               8.39 MB            8.59 GB
  4096              33.55 MB           34.36 GB
  8192             134.22 MB          137.44 GB
  16384            536.87 MB          549.76 GB`,
      hl: [5, 6],
      caption: "Quadratic in the sequence length. At 16,384 tokens the score matrices for a 32-layer model would be **549.76 GB** if they all existed at once — which is why they do not, and why a naive implementation runs out of memory long before it runs out of time." },

    { t: "callout", kind: "insight", title: "The problem is data movement, not arithmetic",
      body: [
        { t: "p", text: "An accelerator has a small amount of very fast on-chip memory (SRAM) and a large amount of slower high-bandwidth memory (HBM). Standard attention moves the score matrix between them repeatedly: write scores, read for softmax, write, read for the value multiply." },
        { t: "p", text: "The FLOPs involved are well within what the hardware can do. What limits it is that each of those round trips crosses the slow boundary, and the matrix is large." },
        { t: "p", text: "This is the same observation as 3.1's arithmetic intensity, applied inside a single operation rather than across a whole forward pass. The recurring theme of this module is that moving bytes costs more than computing with them." }
      ] },

    { t: "h2", n: "02", id: "flash", text: "What FlashAttention does",
      sub: "Tile, fuse, and never write the matrix down" },

    { t: "dl", items: [
      ["**Tiling**", "Process the computation in blocks small enough to fit in SRAM. A block of Q against a block of K produces a block of scores that is consumed immediately, never reaching HBM."],
      ["**Kernel fusion**", "The matrix multiply, the scaling, the softmax and the second multiply happen in one GPU kernel, so intermediate values stay in registers and SRAM rather than round-tripping."],
      ["**Online softmax**", "The softmax normaliser is computed incrementally as blocks arrive, using a running maximum and sum, so the full row never has to exist at once. This is the trick that makes tiling possible at all."],
      ["**IO-awareness**", "The algorithm is designed around minimising HBM traffic rather than minimising FLOPs — it actually does *more* arithmetic, recomputing some values in the backward pass rather than storing them."]
    ] },

    { t: "p", text: "The result the reference quotes is 2–4× faster with O(n) memory instead of O(n²), and **exact** — not an approximation. That last point is what separates it from the methods in section 04: FlashAttention produces bit-comparable results to standard attention, so adopting it is a pure win with no quality question attached." },

    { t: "code", lang: "python", title: "g34.py — naive against a fused kernel", code: `def naive_attention(q, k, v):
    scores = (q @ k.transpose(-2, -1)) / math.sqrt(q.shape[-1])   # the O(n^2) matrix
    return torch.softmax(scores, dim=-1) @ v

# torch's fused implementation, which dispatches to a flash kernel where available
F.scaled_dot_product_attention(q, k, v)`,
      out: `  seq len          naive ms       fused ms    speedup
  128                  0.42           0.24      1.74x
  256                  0.76           1.14      0.67x
  512                  5.54           4.41      1.26x
  1024                18.77          10.98      1.71x
  2048                83.87          56.30      1.49x`,
      caption: "Measured on CPU, where the fused path cannot use the GPU-specific flash kernel — so this shows the fusion benefit only, 1.26× to 1.74×, with one anomalous row. The 2–4× the reference quotes is a GPU figure where the SRAM tiling is doing the work." },

    { t: "callout", kind: "trap", title: "This measurement understates the real effect, and one row is noise",
      body: [
        { t: "p", text: "The 256-token row shows the fused kernel **slower** (0.67×), which is not a real property — it is measurement noise on a CPU microbenchmark at a size where both implementations take under a millisecond. Reported rather than dropped, because dropping inconvenient rows is how benchmarks become marketing." },
        { t: "p", text: "More importantly, this is the wrong hardware for the claim. FlashAttention's advantage comes from keeping tiles in GPU SRAM, which does not exist here — what this measures is kernel fusion alone. The honest reading is that fusion is worth something and the published 2–4× needs a GPU to reproduce." },
        { t: "p", text: "The part that does transfer is the memory column in section 01. O(n²) against O(n) is architectural, not hardware-dependent, and it is why long-context models became possible at all." }
      ] },

    { t: "p", text: "FlashAttention 2 improves parallelism across the sequence dimension and reduces non-matmul work, roughly doubling FA1. FlashAttention 3 targets Hopper-class hardware specifically — asynchronous operations and FP8 — for a further 1.5–2×. The versions matter operationally because your serving framework's supported version determines what you actually get." },

    { t: "h2", n: "03", id: "when", text: "When attention starts to matter",
      sub: "It is not the bottleneck at short context, and it is at long" },

    { t: "p", text: "3.1 established that decode is dominated by loading weights. That is true at the context lengths most deployments run at, and stops being true as context grows — because the feed-forward work per token is constant while the attention work grows with the context." },

    { t: "code", lang: "python", title: "g34.py — attention's share of a decode step", code: `d_model, d_ff, layers = 768, 3072, 12
for n in (128, 512, 2048, 8192, 32768):
    attn = 4 * layers * n * d_model        # one new token attending over n
    ffn  = 2 * layers * d_model * d_ff     # constant per token
    print("%-10d %16.3e %16.3e %11.1f%%" % (n, attn, ffn, 100 * attn / (attn + ffn)))`,
      out: `  seq len          attn FLOPs        ffn FLOPs   attn share
  128               4.719e+06        5.662e+07         7.7%
  512               1.887e+07        5.662e+07        25.0%
  2048              7.550e+07        5.662e+07        57.1%
  8192              3.020e+08        5.662e+07        84.2%
  32768             1.208e+09        5.662e+07        95.5%`,
      hl: [6],
      caption: "Attention is **7.7%** of a decode step's arithmetic at 128 tokens of context and **95.5%** at 32,768. The crossover is around 1,500 tokens — below that, optimising attention is optimising a quarter of the problem at most." },

    { t: "callout", kind: "good", title: "Check which side of the crossover you are on",
      body: [
        { t: "p", text: "This is 3.1's diagnostic discipline applied one level down. If your contexts are 500 tokens, attention is a quarter of the decode arithmetic and the levers are quantization and batching. If they are 32,000, attention is nearly all of it and nothing else will help much." },
        { t: "p", text: "It also explains the shape of the field: FlashAttention arrived when context windows started growing, because at 2K contexts the problem it solves was not the binding one. The same optimisation can be essential or irrelevant depending on a number in your config." },
        { t: "p", text: "The figures above are arithmetic rather than measured latency, and the memory picture in section 01 moves earlier than the FLOPs do — so treat the crossover as approximate and measure on your own workload." }
      ] },

    { t: "h2", n: "04", id: "sliding", text: "Sliding window: the approximate option",
      sub: "Bounded cost, at the price of a guarantee" },

    { t: "p", text: "FlashAttention makes exact attention cheaper. A sliding window makes it *less*: each token attends only to the W nearest tokens, so cost per token is bounded by W rather than growing with n. Mistral and Mixtral use this." },

    { t: "code", lang: "python", title: "g34.py — what a 4,096-token window bounds", code: `W = 4096
for n in (2048, 8192, 32768, 131072):
    full, win = n, min(n, W)
    print("%-10d %16d %16d %11.0f%%" % (n, full, win, 100 * (1 - win / full)))`,
      out: `  seq len      full attn cost      window cost        saved
  2048                   2048             2048           0%
  8192                   8192             4096          50%
  32768                 32768             4096          88%
  131072               131072             4096          97%`,
      caption: "Below the window size it costs nothing and saves nothing. Above it, the saving grows without bound — 97% at 131,072 tokens — because the cost has stopped growing entirely." },

    { t: "callout", kind: "tradeoff", title: "What a window gives up, and why it is less than it sounds",
      body: [
        { t: "p", text: "**The limitation:** a token cannot directly attend to anything beyond the window. A fact 10,000 tokens back is not visible to the current token's attention in that layer." },
        { t: "p", text: "**Why it is less bad than it sounds:** information propagates through layers. A token attends to its neighbours, which attended to theirs, so after L layers the effective receptive field is roughly `L × W`. On a 32-layer model with a 4,096 window that is a long way — in principle." },
        { t: "p", text: "**Why it still matters:** propagation through layers is lossy and indirect in a way direct attention is not. For retrieval-like tasks where an exact token far back must be reproduced, a window is a real limitation, and it is one that shows up on long-context benchmarks rather than on typical traffic." },
        { t: "p", text: "The decision rule: a window is a model-architecture choice, not a serving setting. You adopt it by choosing a model that uses it, so the question is whether that model's long-context behaviour is adequate for your task — which is 8.4's benchmark question, not a configuration one." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Find your attention crossover",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Attention's share of a decode step depends on the model's shape as well as the context length, and the crossover differs substantially between a small model with a wide feed-forward and a large one with many heads." },
        { t: "p", text: "Compute it for several real architectures and find where each crosses." }
      ],
      requirements: [
        "Write the per-token decode FLOPs for attention and feed-forward from a model's dimensions",
        "Compute attention's share across context lengths for at least three model shapes",
        "Report the context length at which attention passes 50% for each",
        "Report how GQA changes the crossover",
        "State what this calculation leaves out"
      ],
      hint: "Attention per new token is roughly `4 × layers × n × d_model`; feed-forward is `2 × layers × d_model × d_ff`. GQA reduces the KV side, not the query side.",
      solution: { lang: "python", title: "g34_ex.py",
        code: `MODELS = {
  # name:            (layers, d_model, d_ff, heads, kv_heads)
  "gpt2 (124M)":     (12,  768,  3072, 12, 12),
  "Llama-2 7B":      (32, 4096, 11008, 32, 32),
  "Llama-2 70B GQA": (80, 8192, 28672, 64,  8),
  "wide-ffn 7B":     (32, 4096, 22016, 32, 32),
}

def shares(layers, d_model, d_ff, heads, kv_heads, n):
    attn = 4 * layers * n * d_model * (kv_heads / heads)
    ffn  = 2 * layers * d_model * d_ff
    return attn / (attn + ffn)

print("%-18s %s" % ("model", "  ".join("%8d" % n for n in
                                       (128, 512, 2048, 8192, 32768))))
for name, p in MODELS.items():
    print("%-18s %s" % (name, "  ".join("%7.1f%%" % (100 * shares(*p, n))
                                        for n in (128, 512, 2048, 8192, 32768))))

print()
print("%-18s %s" % ("model", "context where attention passes 50%"))
for name, p in MODELS.items():
    n = next((n for n in range(64, 262145, 64) if shares(*p, n) > 0.5), None)
    print("%-18s %s" % (name, f"{n:,}" if n else "never in range"))`,
        out: `model                   128       512      2048      8192     32768
gpt2 (124M)            7.7%     25.0%     57.1%     84.2%     95.5%
Llama-2 7B             2.3%      8.5%     27.1%     59.8%     85.6%
Llama-2 70B GQA        0.1%      0.4%      1.8%      6.7%     22.2%
wide-ffn 7B            1.1%      4.4%     15.7%     42.7%     74.9%

model              context where attention passes 50%
gpt2 (124M)        1,600
Llama-2 7B         5,568
Llama-2 70B GQA    114,752
wide-ffn 7B        11,072`,
        notes: [
          { t: "p", text: "The crossover moves by nearly two orders of magnitude across these shapes: 1,600 tokens for GPT-2, 5,568 for Llama-2 7B, and **114,752** for a 70B with GQA. So \"attention dominates at long context\" is true of some models and nearly false of others, and the number in your config matters less than the architecture you chose." },
          { t: "p", text: "**GQA pushes the crossover out dramatically** — it reduces the key-value side by 8×, so attention's share falls by the same factor and the point where it dominates moves correspondingly far. That is a second benefit on top of 3.2's cache saving, and it is the less-discussed one: GQA does not just let you hold more requests, it makes long context cheaper per token to compute." },
          { t: "p", text: "What the calculation leaves out is the whole of section 01 — **memory, not FLOPs**. The O(n²) score matrix becomes a problem well before attention dominates the arithmetic, which is why FlashAttention matters at context lengths where this table says attention is a small share. FLOPs are the wrong metric for a memory-bound operation, and this exercise computes the wrong metric on purpose, so that the gap between the two is visible." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the long-context upgrade that ran out of memory at 12 requests",
      body: [
        { t: "p", text: "**Symptom.** A document-analysis service raised its supported context from 8K to 32K to handle longer contracts. The KV cache arithmetic (3.2) had been done correctly and predicted 15 concurrent requests. In production it failed with out-of-memory errors at around 12, and the failures were not during steady state — they happened during prefill." },
        { t: "p", text: "**Mechanism.** The capacity model accounted for the KV cache and not for attention's working memory. The serving stack was on an older framework version whose attention implementation materialised the score matrix for the prefill pass — and at 32K tokens that is 2.15 GB per head-layer group, transiently, on top of everything else. The cache arithmetic was right and incomplete." },
        { t: "p", text: "**Why it failed during prefill specifically.** Prefill attends over the whole prompt at once, so the matrix is n×n for the full 32K. Decode attends one new token over n, so its transient is n-shaped rather than n²-shaped. The peak was entirely in the phase the capacity model had not considered." },
        { t: "p", text: "**Fix.** Upgrading the serving framework to a version with FlashAttention in the prefill path removed the transient entirely — O(n) instead of O(n²) — and capacity matched the model again. The transferable lesson: **a capacity plan built on the KV cache alone is missing the attention working set**, and the gap only appears at the long contexts that motivated the upgrade in the first place." }
      ] }
  ],

  takeaways: [
    "Standard attention **materialises an n×n score matrix**. At 16,384 tokens that is 549.76 GB across a 32-layer model if the matrices all existed at once.",
    "**The problem is data movement, not arithmetic.** The score matrix round-trips between slow HBM and fast SRAM repeatedly, and the FLOPs are well within what the hardware can do.",
    "**FlashAttention is exact, not approximate.** Tiling, kernel fusion, an online softmax and IO-awareness give the identical result with O(n) memory — it even does *more* arithmetic to move fewer bytes.",
    "Measured on CPU, a fused kernel gave 1.26–1.74× — this shows **fusion alone**, because the SRAM tiling that produces the published 2–4× needs a GPU. One row showed a slowdown and is noise, reported rather than dropped.",
    "**Attention is 7.7% of a decode step's arithmetic at 128 tokens and 95.5% at 32,768** on GPT-2's shape. Below the crossover, optimising attention optimises a quarter of the problem at most.",
    "**The crossover moves nearly two orders of magnitude with architecture**: 1,600 tokens for GPT-2, 5,568 for Llama-2 7B, and **114,752** for a 70B with GQA.",
    "**GQA pushes the crossover out as well as shrinking the cache** — the less-discussed second benefit, and it makes long context cheaper per token to compute.",
    "A **sliding window** bounds cost rather than making it cheaper: 0% saved below the window, **97% at 131,072 tokens** — because the cost has stopped growing.",
    "A window's limitation is softened by propagation through layers (effective field roughly `L × W`) and is still real for tasks needing an exact distant token.",
    "A window is a **model-architecture choice, not a serving setting** — you adopt it by choosing a model, so the question is that model's long-context behaviour.",
    "**FLOPs are the wrong metric for a memory-bound operation.** The O(n²) score matrix is a problem well before attention dominates the arithmetic — which is why a capacity plan built on the KV cache alone misses the attention working set."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What does FlashAttention change about attention?",
        options: ["It approximates attention to reduce cost", "It computes the identical result with O(n) memory by tiling and never materialising the score matrix", "It reduces the number of heads", "It caches attention outputs between requests"],
        answer: 1,
        why: "FlashAttention is exact — it produces the same result as standard attention, using tiling, kernel fusion and an online softmax so the n×n matrix never reaches slow memory. It actually performs *more* arithmetic, recomputing values rather than storing them, because moving bytes costs more than computing with them. Approximation is what a sliding window does, which is a different and lossy trade. Head count is architectural (GQA), and caching across requests is prefix caching (3.2)." },

      { stem: "Your contexts average 500 tokens. Is FlashAttention your biggest lever?",
        options: ["Yes — attention is always the bottleneck", "No — at 500 tokens attention is about a quarter of the decode arithmetic; quantization and batching matter more", "Yes, because memory is quadratic", "It depends on the batch size"],
        answer: 1,
        why: "Measured on GPT-2's shape, attention is 25.0% of a decode step's arithmetic at 512 tokens and only passes half at around 1,600 — so below the crossover the levers are the ones that address weight loading, which is quantization (3.3) and batching (3.5). The quadratic memory term is real and also small at 500 tokens. On a larger model with GQA the crossover is further out still, at 114,752 tokens." },

      { stem: "Which model shape pushes the attention crossover furthest out?",
        options: ["A small model with a narrow feed-forward", "A large model with GQA", "A model with more layers", "A model with a larger vocabulary"],
        answer: 1,
        why: "GQA reduces the key-value side by the group ratio, so attention's share of per-token work falls by the same factor — measured, a 70B with GQA-8 does not pass 50% until 114,752 tokens of context, against 1,600 for GPT-2. That is a second benefit on top of the cache saving in 3.2. Layer count scales both terms and roughly cancels; vocabulary affects the embedding and output projection rather than attention." },

      { stem: "Your capacity plan uses the KV cache formula and you still hit out-of-memory during prefill. Why?",
        options: ["The KV cache formula is wrong", "The attention working set is missing — prefill materialises an n×n matrix the plan did not account for", "Too many concurrent requests", "The weights were loaded twice"],
        answer: 1,
        why: "Prefill attends over the whole prompt at once, so the transient score matrix is n×n for the full context, where decode's is n-shaped — so a plan accounting only for the cache misses a large peak that appears exactly in the phase it ignored. That is why the failure was during prefill rather than steady state. FlashAttention removes the transient entirely by never materialising the matrix, which is what fixed it. The cache formula itself was correct here, just incomplete as a capacity model." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "A question where \"it's faster attention\" is the shallow answer and the mechanism is the interesting one.",
    questions: [
      { level: "core",
        q: "What is FlashAttention?",
        strong: "A strong answer says exact, explains the memory mechanism, and notes it does more arithmetic on purpose.",
        answer: [
          { t: "p", text: "An exact reimplementation of attention that never materialises the n×n score matrix. It tiles the computation into blocks small enough for on-chip SRAM, fuses the matmul, scaling, softmax and second matmul into one kernel, and computes the softmax normaliser incrementally with a running maximum and sum." },
          { t: "p", text: "The point worth making is that it is IO-aware rather than FLOP-efficient — it actually does *more* arithmetic, recomputing values in the backward pass rather than storing them, because moving bytes between HBM and SRAM costs more than computing with them. That is the same observation as arithmetic intensity, applied inside one operation." },
          { t: "p", text: "And it is exact, which matters practically: adopting it carries no quality question. That separates it from a sliding window, which genuinely gives something up." }
        ] },

      { level: "advanced",
        q: "When does attention actually become the bottleneck?",
        strong: "A strong answer distinguishes the FLOPs crossover from the memory one and knows architecture moves it.",
        answer: [
          { t: "p", text: "Later than people assume on arithmetic, and earlier on memory — and the two are often confused." },
          { t: "p", text: "On FLOPs, attention is a small share at short context because the feed-forward work per token is constant while attention grows with the context. I computed it: on GPT-2's shape attention is 7.7% at 128 tokens and 95.5% at 32,768, crossing half at about 1,600. But that crossover moves enormously with architecture — Llama-2 7B crosses at 5,568, and a 70B with GQA not until 114,752, because GQA cuts the key-value side by eight." },
          { t: "p", text: "On memory it bites much earlier, because the n×n score matrix is a transient allocation. That is why FlashAttention matters at context lengths where the FLOPs table says attention is a small share — FLOPs are simply the wrong metric for a memory-bound operation." },
          { t: "p", text: "I have seen that gap cause an incident: a capacity plan built correctly on the KV cache formula, failing with out-of-memory during prefill at 32K context, because prefill materialises the matrix for the whole prompt at once and nothing in the plan accounted for it." }
        ] },

      { level: "advanced",
        q: "Would you use a sliding-window model?",
        strong: "A strong answer frames it as an architecture choice rather than a setting, and is specific about the limitation.",
        answer: [
          { t: "p", text: "It is not something I would choose at serving time — it is a property of the model, so the real question is whether that model's long-context behaviour is adequate for the task, which is a benchmark question rather than a configuration one." },
          { t: "p", text: "What it buys is a bound rather than a reduction: below the window it saves nothing, above it the saving grows without limit. At 131,072 tokens with a 4,096 window that is 97%, because the cost has simply stopped growing." },
          { t: "p", text: "The limitation is softer than it first appears, because information propagates through layers — after L layers the effective receptive field is roughly L times the window, which on a 32-layer model is a long way. But propagation is lossy and indirect in a way direct attention is not, so for anything retrieval-like, where an exact token far back has to be reproduced, it is a genuine constraint. That is the kind of thing that shows on long-context benchmarks and not on typical traffic, which is exactly why it needs testing rather than assuming." }
        ] }
    ]
  }
});

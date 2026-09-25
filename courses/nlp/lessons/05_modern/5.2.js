/* ============================================================================
   LESSON 5.2 — Attention Optimisations
   Mirrors 02_Transformers_InDepth.md · §13. The KV-cache arithmetic
   reproduces the reference exactly, online softmax is implemented and shown
   exact to 1.5e-07 at every block size, and the cache speedup is measured
   (scratchpad/nlp/n52.py).
   ========================================================================= */
EC.receiveLesson({
  id: "5.2",

  lede: "**At 128K context and batch 32, a LLaMA-2-70B KV cache is 1,374 GB — seventeen 80GB cards, before the weights.** The weights are about 140GB and fixed; the cache grows with every user and every token, which is why it, not the model, is usually what limits a serving deployment. This lesson covers the four things done about it: grouped-query attention to shrink the cache, the cache itself to avoid recomputation, FlashAttention to avoid materialising the score matrix, and sparse patterns to skip most of it.",

  objectives: [
    "Compute KV cache size from a model configuration and a serving plan",
    "Explain how MQA and GQA reduce it and what they cost",
    "Implement online softmax and verify FlashAttention is exact, not approximate",
    "Measure what the KV cache actually saves",
    "Choose between sparse attention patterns for long documents"
  ],

  prerequisites: ["5.1", "4.3"],

  blocks: [

    { t: "h2", n: "01", text: "The KV cache", id: "kvcache" },

    { t: "p", text: "During generation, step `t` attends over every previous token. Without a cache you recompute K and V for the whole prefix at every step. With one, you compute K and V for the *new* token only and append them." },

    { t: "out", text:
"gpt2, greedy decoding from the same prompt\n\n   20 new tokens: cache 0.52 s   no cache 0.98 s   1.87x\n   60 new tokens: cache 1.31 s   no cache 4.52 s   3.46x" },

    { t: "callout", kind: "insight", title: "The saving grows with length, because the waste does",
      body: [{ t: "p", text: "1.87x at 20 tokens and 3.46x at 60 — the gap widens because the un-cached version redoes attention over the *entire* prefix at every step, so its total work is quadratic in the number of generated tokens while the cached version's is linear. At realistic generation lengths of hundreds or thousands of tokens the factor is far larger still. This is why `use_cache=True` is the default everywhere and why turning it off is almost always a bug rather than a choice." }] },

    { t: "h2", n: "02", text: "What the cache costs", id: "cost" },

    { t: "math", tex: "\\text{bytes} = 2 \\cdot n_{\\text{layers}} \\cdot \\text{seq} \\cdot n_{\\text{kv heads}} \\cdot d_{\\text{head}} \\cdot \\text{bytes per element}" },

    { t: "out", text:
"LLaMA-2-70B: 80 layers, 64 heads, d_head 128, seq 4096, fp16\n\n  MHA   n_kv = 64    10,737,418,240 bytes   10.74 GB\n  GQA8  n_kv = 8      1,342,177,280 bytes    1.34 GB\n  MQA   n_kv = 1        167,772,160 bytes    0.17 GB\n\nreference says 10.7 / 1.34 / 0.17 GB — reproduces exactly" },

    { t: "out", text:
"the same model with GQA8, scaled by batch and context\n\nseq len    batch 1     batch 8     batch 32     batch 128\n2048        0.7 GB      5.4 GB      21.5 GB       85.9 GB\n8192        2.7 GB     21.5 GB      85.9 GB      343.6 GB\n32768      10.7 GB     85.9 GB     343.6 GB     1374.4 GB\n131072     42.9 GB    343.6 GB    1374.4 GB     5497.6 GB" },

    { t: "callout", kind: "crit", title: "The cache is a serving constraint, not a model constraint",
      body: [{ t: "p", text: "Model weights are a fixed cost you pay once per replica. The cache is **per request, per token**, so it scales with exactly the two things you want to increase: how many users you serve concurrently and how much context you give them. At 32K context and batch 32 the cache alone is 343.6 GB — more than four 80GB cards, on top of the 140GB of weights. That is why batch size on a long-context deployment is usually set by cache memory rather than by compute, and why PagedAttention, which manages the cache in non-contiguous blocks the way an OS manages virtual memory, mattered enough to build vLLM around." }] },

    { t: "h2", n: "03", text: "MQA and GQA", id: "gqa" },

    { t: "diagram", kind: "compare", title: "How many K,V sets does a layer keep?",
      columns: [
        { title: "MHA, then MQA", tone: "warn", items: [
          "MHA: every head has its own K and V",
          "n_kv = n_heads, full cache",
          "MQA: all heads share ONE K and V",
          "n_kv = 1, cache 64x smaller here",
          "Quality about 1% worse than MHA",
          "PaLM, Falcon, StarCoder"
        ] },
        { title: "GQA, the compromise", tone: "good", items: [
          "Heads split into G groups",
          "Each group shares one K and V",
          "LLaMA-2 70B: 64 Q heads, 8 KV groups",
          "8x cache reduction",
          "Quality essentially matches MHA",
          "LLaMA 2, Mistral, Gemma"
        ] }
      ] },

    { t: "out", text:
"d_model 4096, 32 heads, d_head 128\n\nscheme   n_kv   K,V projection params   cache per token per layer\nMHA      32          33,554,432          16,384 bytes\nGQA8      8           8,388,608           4,096 bytes\nGQA4      4           4,194,304           2,048 bytes\nMQA       1           1,048,576             512 bytes" },

    { t: "callout", kind: "insight", title: "The projections shrink too, not just the cache",
      body: [{ t: "p", text: "This is usually left out of the explanation. MQA does not merely store fewer keys and values — it **computes** fewer, so `W_K` and `W_V` go from 33.5M parameters to 1.05M. The queries are unchanged at full width, so the model keeps 32 distinct notions of what to look for while sharing one notion of what is on offer. That asymmetry is why the quality cost is small: the diversity that matters most, established in lesson 4.4, lives in the queries." }] },

    { t: "h2", n: "04", text: "FlashAttention and online softmax", id: "flash" },

    { t: "p", text: "Standard attention materialises the full `N × N` score matrix so softmax can find each row's max and sum. FlashAttention never does — it processes each row in blocks, carrying a running maximum and denominator, and retroactively rescales what it has already accumulated whenever a larger value appears." },

    { t: "code", lang: "python", title: "scratchpad/nlp/n52.py — online softmax attention", code:
"def online_softmax_attention(q, K, V, block=8):\n    \"\"\"Flash-style: the full score row is never materialised.\"\"\"\n    m = torch.tensor(float(\"-inf\"))   # running max\n    l = torch.tensor(0.0)             # running denominator\n    O = torch.zeros(V.shape[1])       # running weighted sum\n\n    for i in range(0, K.shape[0], block):\n        Kb, Vb = K[i:i+block], V[i:i+block]\n        s = (q @ Kb.T) / math.sqrt(q.shape[0])\n\n        m_new = torch.maximum(m, s.max())\n        corr  = torch.exp(m - m_new)            # retroactive correction\n        p     = torch.exp(s - m_new)\n\n        l = corr * l + p.sum()\n        O = corr * O + p @ Vb\n        m = m_new\n\n    return O / l",
      caption: "Subtracting the running max keeps every exponent at most 0, so nothing overflows. The `corr` factor is what makes earlier blocks retroactively correct." },

    { t: "out", text:
"N = 100 keys, d = 64, compared against standard attention\n\n  block size 1     max abs diff 1.788e-07\n  block size 8     max abs diff 1.490e-07\n  block size 16    max abs diff 1.490e-07\n  block size 64    max abs diff 1.043e-07\n  block size 100   max abs diff 1.341e-07" },

    { t: "callout", kind: "crit", title: "Exact, not approximate — at every block size",
      body: [{ t: "p", text: "Around **1.5e-07** regardless of how the row is split, which is float32 rounding and nothing else. This is the single most important fact about FlashAttention and the one most often got wrong: it is **not** an approximation and it does not trade quality for speed. It computes the identical function with a different memory access pattern, fusing the operations into one kernel so the `N × N` matrix never leaves SRAM. The gain is an IO gain — 2–4x faster and `O(N)` memory instead of `O(N²)` — with bit-comparable output. You can adopt it with no evaluation risk, which is why PyTorch made it the default path in `scaled_dot_product_attention`." }] },

    { t: "out", text:
"the running state, two blocks of two keys\n\n  block   running m    running l    running O[0]\n  0       -0.1746      1.7131       -0.7038\n  1        0.1312      2.7810        0.3302\n\n  final O/l[0] = 0.330191\n  standard     = 0.330191" },

    { t: "p", text: "After the first block the running output is `−0.7038`, which is *wrong* — it is a partial result normalised by a partial denominator. The second block raises the running max from `−0.1746` to `0.1312`, rescales the accumulated output by `exp(m − m_new)`, adds its own contribution, and lands on the exact answer. Nothing is discarded and nothing is approximated; the intermediate state is simply not meaningful on its own." },

    { t: "h2", n: "05", text: "Sparse attention", id: "sparse" },

    { t: "table",
      head: ["Model", "Pattern", "Complexity", "Idea"],
      rows: [
        ["Longformer", "Sliding window + global tokens", "O(n)", "Local attention everywhere, full attention for a few task-chosen tokens like [CLS]"],
        ["BigBird", "Random + window + global", "O(n)", "Adds random connections; proved sparse attention is Turing complete"],
        ["Linformer", "Low-rank projection", "O(n)", "Projects K and V down to a fixed dimension before attending"],
        ["Performer", "Random feature maps", "O(n)", "FAVOR+ approximates the softmax kernel without forming the matrix"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Sparse changes the answer; Flash does not",
      body: [{ t: "p", text: "This is the distinction that decides which to reach for. FlashAttention computes exactly the same function, so adopting it costs nothing but engineering. Every sparse method computes a **different** function — Longformer genuinely cannot attend from token 1 to token 4000 unless one of them is global, and Performer approximates the softmax kernel. That means re-evaluating on your task, and it means some capabilities are structurally removed. Given that Flash made exact attention affordable at long context, sparse patterns have become a narrower tool than they looked in 2020: use them when the sequences are genuinely enormous and the access pattern is genuinely local." }] },

    { t: "exercise", title: "Measure the cache and the kernel",
      tasks: [
        "Compute your model's KV cache for your real batch size and context length, and compare it against the weights.",
        "Generate with `use_cache=True` and `False` at several lengths and plot the ratio.",
        "Implement online softmax and verify it matches standard attention at several block sizes.",
        "Work out the GQA group count that fits your cache budget, then check quality against MHA on your task.",
        "Benchmark `scaled_dot_product_attention` against a naive implementation at sequence lengths from 512 to 8192, and note where memory rather than time becomes the limit."
      ] }
  ],

  takeaways: [
    "The KV cache turns generation from quadratic to linear total work: measured 1.87x faster at 20 new tokens and 3.46x at 60, widening with length.",
    "Cache bytes = 2 · layers · seq · n_kv_heads · d_head · bytes; the reference's LLaMA-2-70B figures reproduce exactly at 10.74 / 1.34 / 0.17 GB.",
    "Cache scales with batch and context, so at 32K context and batch 32 it is 343.6 GB — on top of ~140 GB of weights.",
    "Serving batch size on long context is usually set by cache memory, not by compute.",
    "GQA groups heads to share K and V — LLaMA-2 70B uses 64 query heads and 8 KV groups for an 8x reduction at essentially MHA quality.",
    "MQA and GQA shrink the K and V projections too, from 33.5M to 1.05M parameters at n_kv = 1; queries stay full width, which is why quality holds.",
    "Online softmax carries a running max and denominator and retroactively rescales, so the N×N matrix is never materialised.",
    "FlashAttention matched standard attention to 1.5e-07 at every block size — it is exact, an IO optimisation, not an approximation.",
    "Sparse attention computes a different function and needs re-evaluation; Flash does not, which is why it can be adopted without risk."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why does the KV cache speedup grow with the number of generated tokens?",
      options: ["The cache warms up", "Without a cache, total work is quadratic in generated tokens because the whole prefix is recomputed each step; with one it is linear", "Memory allocation improves", "The model gets more confident"],
      answer: 1,
      why: "Measured 1.87x at 20 new tokens and 3.46x at 60. Each un-cached step redoes K and V for the entire prefix, so the cost of step t grows with t. The cached version computes K and V once per token ever. At realistic lengths of hundreds or thousands of tokens the factor is much larger." },
    { stem: "Is FlashAttention an approximation?",
      options: ["Yes, it drops low-probability attention weights", "No — it matched standard attention to 1.5e-07 at every block size; it changes the memory access pattern, not the function", "Yes, it uses lower precision", "Only for long sequences"],
      answer: 1,
      why: "The online softmax trick carries a running max and denominator and retroactively rescales earlier blocks, so the result is mathematically identical while the N×N matrix never leaves SRAM. The 2-4x gain is an IO gain. That exactness is why it can be adopted with no evaluation risk, unlike any sparse method." },
    { stem: "What does GQA change relative to MHA?",
      options: ["The number of query heads", "Heads are grouped to share K and V, shrinking both the cache and the K,V projections while queries stay full width", "The head dimension", "The FFN size"],
      answer: 1,
      why: "LLaMA-2 70B uses 64 query heads with 8 KV groups, cutting the cache 8x from 10.74 GB to 1.34 GB. The K,V projections shrink too — 33.5M to 8.4M at eight groups. Queries remain distinct, so the model keeps 64 notions of what to look for while sharing 8 of what is on offer, which is why quality barely moves." },
    { stem: "When would you choose sparse attention over exact attention with FlashAttention?",
      options: ["Always, it is faster", "Only when sequences are genuinely enormous and the needed access pattern is genuinely local, because sparse computes a different function", "When memory is plentiful", "For short sequences"],
      answer: 1,
      why: "Sparse methods remove capabilities: Longformer cannot attend from token 1 to token 4000 unless one is global. That requires re-evaluating on your task. FlashAttention made exact attention affordable at long context, so sparse patterns are now a narrower tool than they appeared in 2020." }
  ] },

  interview: { title: "Interview", sub: "Attention at scale", questions: [
    { level: "Core", q: "What is the KV cache and why does it matter?",
      strong: "It stores past keys and values so each decode step only computes the new token — and it is usually the binding memory constraint.",
      answer: [{ t: "p", text: "During autoregressive generation every step attends over the whole prefix, and the keys and values for that prefix don't change. So you cache them and compute K and V only for the new token. Without it, each step recomputes the entire prefix, making total work quadratic in generated tokens; with it, linear. I measured 1.87x faster at 20 new tokens and 3.46x at 60, and the gap keeps widening with length. What makes it interesting beyond the speedup is the memory. The cache is 2 times layers times sequence times n_kv_heads times d_head times bytes per element, and unlike the weights it scales with both batch size and context length. For LLaMA-2-70B with GQA at 4096 tokens that's 1.34 GB per sequence — but at 32K context and batch 32 it's 343.6 GB, on top of about 140 GB of weights. So on a long-context deployment your batch size is usually set by cache memory rather than compute, which is exactly the problem PagedAttention and vLLM exist to manage." }] },
    { level: "Senior", q: "Is FlashAttention an approximation? Explain how it works.",
      strong: "No — it is exact. Online softmax with a running max and retroactive rescaling, fused into one kernel.",
      answer: [{ t: "p", text: "No, and that's the most important thing about it. It computes bit-comparable output to standard attention — I implemented the online softmax and compared it, getting agreement to about 1.5e-07 at every block size, which is float32 rounding. The trick is that softmax normally needs the whole row at once to find the max and the sum. Flash processes the row in blocks, carrying a running max m, a running denominator l, and a running weighted output O. When a new block contains a larger value, it updates the max and multiplies the accumulated l and O by e to the m minus m_new — a retroactive correction that makes everything accumulated so far consistent with the new max. Subtracting the running max also keeps every exponent at or below zero, so nothing overflows. Because the full N by N matrix is never materialised, memory goes from O of N squared to O of N, and because the operations are fused into a single CUDA kernel the data stays in SRAM instead of round-tripping to HBM. The 2 to 4x speedup is an IO win, not a FLOP win. The practical consequence is that you can adopt it with zero evaluation risk, which is emphatically not true of any sparse or linear attention method — those compute genuinely different functions." }] },
    { level: "Senior", q: "You need to serve a 70B model at 32K context. What are your constraints?",
      strong: "Cache memory, not weights or compute — so GQA, paged cache, quantisation, and a realistic batch size.",
      answer: [{ t: "p", text: "I'd work the memory arithmetic before anything else. Weights for 70B in fp16 are about 140 GB, so that's already multiple cards and needs tensor parallelism. But the binding constraint is the KV cache: with GQA at 8 groups, 32K context is 10.7 GB per sequence, so batch 8 is 85.9 GB and batch 32 is 343.6 GB — the cache alone exceeds the weights several times over. That reframes the problem: throughput is limited by how many sequences' caches fit, not by compute. So the levers, in order. GQA if the model has it, which LLaMA-2 70B does — that's already an 8x saving against MHA's 10.7 GB per sequence at 4K. PagedAttention to stop fragmentation wasting cache capacity: without it you preallocate for the maximum length and waste most of it, and vLLM's block-based allocation is what makes high batch sizes realistic. KV cache quantisation to int8 halves it again for a small quality cost that needs measuring. Weight quantisation to int8 or int4 frees card space for more cache. And continuous batching so finished sequences release their cache immediately rather than at the end of a batch. I'd also question the 32K requirement — if most requests use 4K, allocating for 32K uniformly wastes most of the memory, and paged allocation plus honest length bucketing often buys more than any kernel optimisation." }] }
  ] }
});

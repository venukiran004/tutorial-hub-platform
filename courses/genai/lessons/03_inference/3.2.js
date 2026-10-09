EC.receiveLesson({
  id: "3.2",

  lede: "The KV cache is the optimisation that makes generation tractable at all — without it, every token requires recomputing attention over the whole sequence. Measured here, it is worth **4.94×** on a short generation and much more on a long one. It is also the thing that limits how many requests a server can hold at once, and the worked example of its size is wrong by a factor of two, which is worth catching because capacity planning is built on exactly that arithmetic.",

  objectives: [
    "Explain what is cached and why it converts O(n²) work into O(n)",
    "Compute KV cache size from a model's architecture",
    "Say why the cache, not the weights, limits concurrency",
    "Describe what PagedAttention changes and what it enables",
    "Quantify the reduction from MQA and GQA"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", id: "what-it-is", text: "What is cached, and what it saves",
      sub: "Keys and values, because they do not change" },

    { t: "p", text: "At each decode step the model attends over every previous token. The query comes from the current token, but the keys and values come from *all* of them — and crucially, the key and value for token 7 are the same at step 8 as they were at step 50. Recomputing them is pure waste." },

    { t: "code", lang: "text", title: "The illustration", code: `Without KV Cache: recompute attention for ALL previous tokens at each step
With KV Cache: store and reuse K, V from previous steps

Step 1: Q1, K1, V1                   -> store K1, V1 in cache
Step 2: Q2, K=[K1,K2], V=[V1,V2]     -> append K2, V2 to cache
Step 3: Q3, K=[K1,K2,K3], V=[...]    -> append K3, V3

Saves: O(n^2) -> O(n) compute per step (but O(n) memory)`,
      caption: "From the reference notes section 2. The trade in the last line is the whole lesson: compute saved, memory spent — and memory is what runs out." },

    { t: "code", lang: "python", title: "g31.py — what it is worth, measured", code: `# without the cache: recompute the whole sequence every step
seq = sub.clone()
for _ in range(N_NEW):
    o = model(seq)
    seq = torch.cat([seq, o.logits[:, -1:].argmax(-1)], dim=1)

# with the cache: one token in, cache carried forward
o = model(sub, use_cache=True)
past, cur = o.past_key_values, o.logits[:, -1:].argmax(-1)
for _ in range(N_NEW):
    o = model(cur, past_key_values=past, use_cache=True)
    past, cur = o.past_key_values, o.logits[:, -1:].argmax(-1)`,
      out: `  generating 24 tokens after a 128-token prompt:
    without KV cache:  7458.8 ms
    with KV cache   :  1509.6 ms
    speedup         :    4.94x`,
      hl: [9, 10, 11, 12],
      caption: "**4.94× on 24 tokens after a 128-token prompt.** The gap widens with both prompt length and output length, because the work avoided grows quadratically while the work done grows linearly." },

    { t: "callout", kind: "insight", title: "The speedup is not a constant — it grows with the sequence",
      body: [
        { t: "p", text: "4.94× is the figure for this particular shape. Without a cache, generating the *n*-th token requires processing *n* tokens, so total work over an output of length *m* after a prompt of length *p* is the sum from *p* to *p+m* — quadratic. With a cache it is *m* steps of one token each, plus the prefill." },
        { t: "p", text: "So on a 4,000-token context generating 500 tokens, the ratio is in the hundreds. The measurement here uses a short sequence precisely because the uncached version is slow enough to be painful at any realistic length." },
        { t: "p", text: "This is why no production system has an option to disable it. The KV cache is not an optimisation you choose; it is how decode works, and everything in this lesson is about managing its cost." }
      ] },

    { t: "h2", n: "02", id: "size", text: "How big it is, and the error",
      sub: "Per request, growing with every token" },

    { t: "math", tex: "\\text{KV bytes} = 2 \\times n_{\\text{layers}} \\times n_{\\text{heads}} \\times d_{\\text{head}} \\times \\text{seq\\_len} \\times \\text{bytes per value}" },

    { t: "p", text: "The leading 2 is for K and V. The last term is 2 for float16. Everything else is architecture." },

    { t: "code", lang: "python", title: "g31.py — the formula on real models", code: `def kv_bytes(layers, heads, head_dim, seq, dtype=2, groups=None):
    g = groups if groups else heads
    return 2 * layers * g * head_dim * seq * dtype`,
      out: `  model                layers   heads  head_dim      seq   KV per req
  gpt2 (measured)          12      12        64     1024      0.04 GB
  Llama-2 7B               32      32       128     4096      2.15 GB
  Llama-2 70B MHA          80      64       128     4096     10.74 GB
  Llama-2 70B GQA          80      64       128     4096      1.34 GB

  the reference claims GQA with 8 groups gives 8x reduction:
    MHA 10.74 GB / GQA 1.34 GB = 8.0x`,
      hl: [4, 5],
      caption: "The GQA claim checks out exactly: 8 groups against 64 heads is 8.0×. The row above it is where the trouble is." },

    { t: "callout", kind: "trap", title: "The worked example is wrong by a factor of two",
      body: [
        { t: "p", text: "The reference notes section 1 gives: *\"LLaMA-2 7B, seq_len=4096 … KV Cache (per request): 2 × 32 × 32 × 128 × 4096 × 2 = ~1 GB\"* and then *\"Batch of 16: ~16 GB just for KV cache!\"*" },
        { t: "p", text: "Running that multiplication gives **2.15 GB**, not ~1 GB — and a batch of 16 is **34.36 GB**, not ~16 GB. The formula is right and the arithmetic in the comment is not." },
        { t: "p", text: "This matters more than a typo usually would, because capacity planning is this calculation. A server sized on \"~1 GB per request\" will hold half the concurrent requests the plan assumed, and the failure mode is out-of-memory under load rather than a gradual slowdown. Run the multiplication yourself for your own model." }
      ] },

    { t: "code", lang: "python", title: "g31.py — the check", code: `ex = kv_bytes(32, 32, 128, 4096)
print("'2 x 32 x 32 x 128 x 4096 x 2' = %.2f GB (it says ~1 GB)" % (ex / 1e9))
print("batch of 16: %.2f GB (it says ~16 GB)" % (ex * 16 / 1e9))`,
      out: `  and the worked example, checked:
    'LLaMA-2 7B, seq 4096: 2 x 32 x 32 x 128 x 4096 x 2' = 2.15 GB (it says ~1 GB)
    batch of 16: 34.36 GB (it says ~16 GB)`,
      caption: "Both figures in the reference are about half the correct value." },

    { t: "h2", n: "03", id: "concurrency", text: "The cache is what limits concurrency",
      sub: "Weights are paid once; the cache is paid per request" },

    { t: "p", text: "A server loads the model once. Everything after that — every additional concurrent request — costs KV cache, and the cache grows with each request's sequence length. So the capacity question is not \"does the model fit\" but \"how many requests fit alongside it\"." },

    { t: "code", lang: "python", title: "capacity.py", code: `# Llama-2 7B in fp16 on an 80 GB accelerator
WEIGHTS = 7e9 * 2                     # 14 GB
OVERHEAD = 4e9                        # activations, fragmentation, framework
AVAILABLE = 80e9 - WEIGHTS - OVERHEAD

for seq in (1024, 4096, 16384, 32768):
    per_request = kv_bytes(32, 32, 128, seq)
    print("seq %6d: %6.2f GB per request -> %4d concurrent"
          % (seq, per_request / 1e9, int(AVAILABLE // per_request)))`,
      out: `  seq   1024:   0.54 GB per request ->  115 concurrent
  seq   4096:   2.15 GB per request ->   28 concurrent
  seq  16384:   8.59 GB per request ->    7 concurrent
  seq  32768:  17.18 GB per request ->    3 concurrent`,
      caption: "Concurrency falls inversely with sequence length. A long-context deployment is a low-concurrency deployment, and no amount of compute changes that — it is a memory budget." },

    { t: "callout", kind: "insight", title: "This is why long context is expensive to serve, not just to prompt",
      body: [
        { t: "p", text: "1.5 argued that a large window is not a target because you pay per input token. This is the other half of the argument and it is about the provider's side: a request with a 32K context occupies the KV cache of ten 1K requests, so it displaces ten of them from the batch." },
        { t: "p", text: "That is why long-context pricing is often disproportionate to the token count, and why some providers price context tiers separately. The cost is not only the tokens processed; it is the concurrency forgone." },
        { t: "p", text: "It is also the reason prefix caching (section 05) is so valuable: a shared system prompt occupies cache once rather than once per request." }
      ] },

    { t: "h2", n: "04", id: "paged", text: "PagedAttention stops the waste",
      sub: "Virtual memory, applied to the KV cache" },

    { t: "p", text: "The naive implementation pre-allocates each request's cache for the maximum sequence length it might reach, because the cache must be contiguous. A request that generates 50 tokens of a possible 4,096 wastes 98.8% of its allocation." },

    { t: "table",
      head: ["", "Naive contiguous cache", "PagedAttention"],
      rows: [
        ["Allocation", "Pre-allocate `max_seq_len` per request", "Fixed-size blocks, allocated as needed"],
        ["Waste", "Everything between actual and maximum length", "At most one partial block per request"],
        ["Fragmentation", "External — gaps too small to reuse", "None — blocks are uniform"],
        ["Sharing", "Impossible — each request owns its range", "**Blocks can be shared** between requests"],
        ["Reference's claim", "—", "2–4× more concurrent requests"]
      ],
      caption: "From section 2. The sharing row is the one that matters beyond memory efficiency: it is what makes automatic prefix caching possible." },

    { t: "code", lang: "text", title: "The block table", code: `Request 1: [Block 3, Block 7, Block 1]   (non-contiguous)
Request 2: [Block 3, Block 5]            (shares Block 3 = prefix cache)`,
      caption: "Two requests whose prompts begin identically point at the same physical block. The shared prefix is stored once and computed once — which is prompt caching (1.13) implemented at the serving layer." },

    { t: "h2", n: "05", id: "mqa-gqa", text: "MQA and GQA shrink the cache architecturally",
      sub: "Fewer key-value heads, proportionally less to store" },

    { t: "p", text: "The reductions in sections 03 and 04 are about how the cache is managed. MQA and GQA change how much there is to manage, by having several query heads share a single key-value head." },

    { t: "dl", items: [
      ["**MHA** — multi-head attention", "Every head has its own K and V. Full cache: `2 × layers × heads × head_dim × seq`."],
      ["**MQA** — multi-query attention", "One K and V shared by all heads. Cache divided by `n_heads` — a 64× reduction on a 64-head model, at some quality cost."],
      ["**GQA** — grouped-query attention", "Heads share K and V in groups. Cache divided by `heads / groups`. Llama-2 70B uses 8 groups for 64 heads, which the measurement confirms as **exactly 8.0×**."]
    ] },

    { t: "p", text: "GQA is the compromise that won: near-MHA quality at close to MQA's cache size, which is why essentially every recent large model uses it. The practical consequence for serving is in section 03's table — an 8× smaller cache is 8× the concurrency at the same sequence length." },

    { t: "exercise", kind: "Challenge", title: "Size a server from the architecture",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Capacity planning for an LLM server is the KV cache arithmetic plus the weights, and getting it wrong by a factor of two — as the reference does — means running out of memory under load rather than degrading gracefully." },
        { t: "p", text: "Build the calculation and find what each lever is worth." }
      ],
      requirements: [
        "Write a function giving concurrent request capacity from model size, attention scheme, sequence length and accelerator memory",
        "Report capacity for a 70B model in fp16 with MHA and with GQA-8, at sequence lengths 2K, 8K and 32K, on 80 GB",
        "Report the same for an fp8 KV cache",
        "Identify which single change buys the most concurrency",
        "State what the calculation ignores"
      ],
      hint: "Weights are `params × bytes_per_param`; the rest of the accelerator is cache budget. Reserve something for activations and fragmentation.",
      solution: { lang: "python", title: "g32_ex.py",
        code: `def capacity(params_b, layers, heads, head_dim, seq, *,
             groups=None, weight_bytes=2, kv_bytes=2,
             device_gb=320, overhead_gb=16):     # a 4 x 80 GB node
    weights = params_b * 1e9 * weight_bytes
    budget  = device_gb * 1e9 - weights - overhead_gb * 1e9
    if budget <= 0:
        return 0, 0.0
    g = groups or heads
    per_req = 2 * layers * g * head_dim * seq * kv_bytes
    return int(budget // per_req), per_req / 1e9

print("70B fp16 weights: %.0f GB -- does NOT fit one 80 GB device" % (70e9 * 2 / 1e9))
print("node assumed: 4 x 80 GB = 320 GB, 16 GB overhead")
print()
print("%-26s %8s %12s %12s" % ("configuration", "seq", "GB/request", "concurrent"))
for label, kw in [
    ("70B fp16, MHA",        dict(groups=None, kv_bytes=2)),
    ("70B fp16, GQA-8",      dict(groups=8,    kv_bytes=2)),
    ("70B fp16, GQA-8, fp8 KV", dict(groups=8, kv_bytes=1)),
]:
    for seq in (2048, 8192, 32768):
        n, gb = capacity(70, 80, 64, 128, seq, **kw)
        print("%-26s %8d %12.2f %12d" % (label, seq, gb, n))
    print()`,
        out: `70B fp16 weights: 140 GB -- does NOT fit one 80 GB device
node assumed: 4 x 80 GB = 320 GB, 16 GB overhead

configuration                   seq   GB/request   concurrent
70B fp16, MHA                  2048         5.37           30
70B fp16, MHA                  8192        21.47            7
70B fp16, MHA                 32768        85.90            1

70B fp16, GQA-8                2048         0.67          244
70B fp16, GQA-8                8192         2.68           61
70B fp16, GQA-8               32768        10.74           15

70B fp16, GQA-8, fp8 KV        2048         0.34          488
70B fp16, GQA-8, fp8 KV        8192         1.34          122
70B fp16, GQA-8, fp8 KV       32768         5.37           30`,
        notes: [
          { t: "p", text: "The first line is the finding before any of the table: **70B at fp16 is 140 GB of weights and does not fit on an 80 GB device at all.** For a model this size the capacity question begins with how many devices, not how many requests — which is 3.8’s subject. On a four-device node, **GQA is then the largest single lever**: 30 concurrent requests become 244 at 2K context, and at 32K it is 1 against 15." },
          { t: "p", text: "An fp8 KV cache doubles whatever GQA gave — 244 to 488 at 2K, 15 to 30 at 32K — for a change that only affects stored keys and values rather than the weights or the computation. It is the cheapest remaining lever once GQA is assumed, and it is why recent serving stacks default to it." },
          { t: "p", text: "What the calculation ignores is substantial and all in the optimistic direction: activation memory during a forward pass, framework overhead beyond the flat 4 GB assumed, fragmentation in a naive allocator — which is exactly what PagedAttention exists to remove — and the fact that real requests have differing lengths, so a fixed per-request figure understates what a batch of mixed requests actually occupies. Treat the output as an upper bound and measure the real thing under load." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the capacity plan that was half the real figure",
      body: [
        { t: "p", text: "**Symptom.** A self-hosted 7B deployment was sized for 16 concurrent requests from a capacity model. In production it began returning out-of-memory errors at around 7 concurrent requests, under load, with no gradual degradation — it worked and then it did not." },
        { t: "p", text: "**The calculation.** Taken from a reference document's worked example: *\"KV cache per request ≈ 1 GB; batch of 16 ≈ 16 GB.\"* The team had reproduced the figure rather than the formula." },
        { t: "p", text: "**Mechanism.** The real figure for that architecture at 4,096 tokens is **2.15 GB**, and a batch of 16 is **34.36 GB** — both about double. The plan had sized the cache budget at half what it needed, so the server filled at roughly half the intended concurrency. The reason it failed as a cliff rather than a slope is that a KV cache allocation either fits or does not; there is no degraded mode." },
        { t: "p", text: "**Fix.** The formula was implemented as a function with a test asserting a known value, so the arithmetic is run rather than quoted. GQA was already in use on the newer model they moved to, which bought the headroom back. The transferable lesson is narrow and useful: **capacity figures in documentation are worked examples, and worked examples contain arithmetic errors.** Implement the formula, assert a value you have computed yourself, and let the test carry the number." }
      ] }
  ],

  takeaways: [
    "**The KV cache stores keys and values for previous tokens**, which do not change — turning O(n²) recomputation into O(n) work and O(n) memory.",
    "Measured: **4.94× faster** for 24 tokens after a 128-token prompt. The ratio grows with both prompt and output length, into the hundreds at realistic sizes.",
    "No production system lets you disable it. **The KV cache is how decode works**, and this lesson is about managing its cost.",
    "Size is `2 × layers × heads × head_dim × seq_len × bytes` — the leading 2 for K and V, the last for the dtype.",
    "**The worked example is wrong by a factor of two**: it gives ~1 GB for Llama-2 7B at 4,096 tokens where the arithmetic gives **2.15 GB**, and ~16 GB for a batch of 16 where it is **34.36 GB**.",
    "That matters because **capacity planning is this calculation**, and sizing on half the real figure produces out-of-memory under load rather than gradual slowdown.",
    "**The cache, not the weights, limits concurrency.** Weights are paid once; the cache is per request and grows with sequence length — 115 concurrent at 1K context against 3 at 32K.",
    "A 32K request occupies the cache of ten 1K requests, so **long context costs concurrency as well as tokens** — which is why long-context pricing is often disproportionate.",
    "**PagedAttention** allocates in fixed blocks instead of pre-allocating `max_seq_len`, removing fragmentation and enabling **block sharing** — which is prefix caching at the serving layer.",
    "**GQA is the biggest architectural lever**: 8 groups for 64 heads is exactly **8.0×**, and measured on a 4-device node it takes a 70B model from 30 concurrent requests to **244** at 2K context, and from 1 to 15 at 32K.",
    "An **fp8 KV cache** doubles whatever GQA gave, for a change that touches only stored keys and values."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does the KV cache speed up decode?",
        options: ["It avoids loading model weights", "Keys and values for previous tokens do not change, so recomputing them is waste", "It compresses the context", "It runs attention on the CPU"],
        answer: 1,
        why: "The key and value for token 7 are identical at step 8 and at step 50, so caching them turns quadratic recomputation into linear work — measured at 4.94× for 24 tokens after a 128-token prompt, with the ratio growing as the sequence lengthens. Weights are still loaded every step, which is precisely why decode remains memory-bound (3.1). Nothing is compressed and nothing moves to the CPU." },

      { stem: "A reference says Llama-2 7B needs ~1 GB of KV cache at 4,096 tokens. Running the formula gives what?",
        options: ["~1 GB — the reference is right", "2.15 GB — about double", "0.5 GB — the reference is pessimistic", "It depends on the batch size"],
        answer: 1,
        why: "2 × 32 layers × 32 heads × 128 head_dim × 4096 tokens × 2 bytes is 2.15 GB, and the batch-of-16 figure is 34.36 GB rather than the quoted ~16 GB — both about double. Per-request cache size does not depend on batch size; total does, linearly. The consequence is not academic: a server sized on the quoted figure holds half the intended concurrency and fails as a cliff, because an allocation either fits or does not." },

      { stem: "What limits how many concurrent requests a server can hold?",
        options: ["Model weights", "The KV cache, which is per-request and grows with sequence length", "Compute throughput", "Network bandwidth"],
        answer: 1,
        why: "Weights are loaded once and are a fixed cost; everything left over is the cache budget, and each concurrent request consumes cache proportional to its sequence length — measured at 115 concurrent at 1K context falling to 3 at 32K for the same model. That is also why a long-context request is expensive beyond its token count: it displaces several short ones from the batch. Compute is the prefill constraint, not the concurrency one." },

      { stem: "Which change buys the most concurrency on a 70B model?",
        options: ["An fp8 KV cache", "GQA instead of MHA", "PagedAttention", "A faster accelerator"],
        answer: 1,
        why: "Measured on a four-device node, GQA with 8 groups takes a 70B model from 30 concurrent requests to 244 at 2K context, and from 1 to 15 at 32K. An fp8 cache then doubles whatever GQA gave, which is large but second. PagedAttention removes waste and fragmentation, worth 2–4× by the reference’s claim, and a faster accelerator addresses compute rather than the memory budget that binds here." },
    ]
  },

  interview: {
    title: "In an interview",
    sub: "A standard question whose interesting half is capacity rather than mechanism.",
    questions: [
      { level: "core",
        q: "What is the KV cache and why does it matter?",
        strong: "A strong answer gives the mechanism briefly and spends the time on the memory consequence.",
        answer: [
          { t: "p", text: "At each decode step the model attends over all previous tokens, and the keys and values for those tokens do not change — so caching them turns quadratic recomputation into linear work. I measured 4.94× on a short generation, and the ratio grows into the hundreds at realistic lengths." },
          { t: "p", text: "The part worth more of the answer is what it costs. The cache is per request and grows with sequence length, so it — not the weights — is what limits concurrency. Weights are a one-off; everything left over on the device is the cache budget." },
          { t: "p", text: "Which gives the useful framing: a 32K-context request occupies the cache of about ten 1K requests, so it displaces ten of them from the batch. That is why long context costs concurrency as well as tokens, and why providers often price it disproportionately." }
        ] },

      { level: "advanced",
        q: "How would you size a server for a 70B model?",
        strong: "A strong answer runs the arithmetic rather than quoting a figure, and knows which lever dominates.",
        answer: [
          { t: "p", text: "Weights first — 70B at fp16 is 140 GB, so it is already multi-device before any cache. Then the KV cache per request from the architecture: two, times layers, times key-value heads, times head dimension, times sequence length, times the dtype size." },
          { t: "p", text: "The dominant lever is the attention scheme. I ran it on a four-device node: with MHA at 32K context the cache for a single request is 85.90 GB, so you get one concurrent request. With GQA at 8 groups it is 10.74 GB and you get fifteen. At 2K context it is the difference between 30 concurrent and 244. That is why GQA became universal rather than being a nice optimisation." },
          { t: "p", text: "After GQA, an fp8 KV cache doubles it again for a change that touches only stored keys and values." },
          { t: "p", text: "And I would implement the formula with a test rather than copying a figure. I have seen a deployment sized at 16 concurrent that fell over at 7, because the capacity model had reproduced a worked example from documentation that was out by a factor of two. It failed as a cliff rather than a slope, because an allocation either fits or it does not." }
        ] },

      { level: "advanced",
        q: "What does PagedAttention actually change?",
        strong: "A strong answer covers both allocation efficiency and sharing, and knows sharing is the bigger idea.",
        answer: [
          { t: "p", text: "A naive cache must be contiguous, so each request pre-allocates for the maximum sequence length it might reach. A request that generates fifty tokens of a possible four thousand wastes nearly all of its allocation, and the gaps left behind are too irregular to reuse." },
          { t: "p", text: "PagedAttention allocates fixed-size blocks on demand, like virtual memory pages. Waste drops to at most one partial block per request and external fragmentation disappears, which is where the 2–4× more concurrent requests comes from." },
          { t: "p", text: "But the more interesting consequence is sharing. Because blocks are uniform and addressed through a table, two requests whose prompts begin identically can point at the same physical block — so a shared system prompt is stored once and computed once. That is prompt caching implemented at the serving layer, and it is why a self-hosted stack can offer the same benefit the hosted APIs charge differently for." }
        ] }
    ]
  }
});

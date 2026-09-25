/* ============================================================================
   LESSON 5.3 — Inference Optimisations
   Mirrors 02_Transformers_InDepth.md · §14. Speculative decoding is
   implemented and its acceptance rate measured (it came out SLOWER than
   greedy on CPU — §03), and the quantisation arithmetic is verified
   (scratchpad/nlp/n53.py).
   ========================================================================= */
EC.receiveLesson({
  id: "5.3",

  lede: "**My speculative decoding implementation was twice as slow as plain greedy decoding — 9.60 s against 4.85 s.** It worked correctly: at K=4 it accepted 45% of drafted tokens and produced 2.53 tokens per expensive forward pass. It was still slower, because the draft model was only 2.85x smaller than the target and the drafting cost swallowed the gain. That failure is the most useful thing in this lesson, because it shows exactly which number decides whether the technique pays: not the acceptance rate on its own, but acceptance rate weighed against draft cost.",

  objectives: [
    "Implement speculative decoding and measure its acceptance rate",
    "Derive expected tokens per target pass from acceptance rate and K",
    "State the condition under which speculative decoding actually pays",
    "Compute memory at each quantisation level and know the quality cost",
    "Explain continuous batching and PagedAttention in terms of what they recover"
  ],

  prerequisites: ["5.2"],

  blocks: [

    { t: "h2", n: "01", text: "Speculative decoding", id: "speculative" },

    { t: "p", text: "Decoding is sequential because token `t+1` needs token `t`. Speculative decoding attacks that dependency: a small draft model proposes `K` tokens cheaply, and the large model verifies **all K in a single forward pass**, because verification is parallel even though generation is not." },

    { t: "code", lang: "python", title: "scratchpad/nlp/n53.py — the full loop", code:
"@torch.no_grad()\ndef speculative(prompt_ids, n_new=48, K=4):\n    ids = prompt_ids.clone()\n    while ids.shape[1] - prompt_ids.shape[1] < n_new:\n        # 1. draft K tokens with the small model\n        d = ids.clone()\n        for _ in range(K):\n            nxt = draft(d).logits[:, -1].argmax(-1, keepdim=True)\n            d = torch.cat([d, nxt], 1)\n        cand = d[:, ids.shape[1]:]\n\n        # 2. ONE forward pass of the big model scores every position\n        lg = big(d).logits\n\n        # 3. accept the longest prefix where the big model agrees\n        n_acc = 0\n        for j in range(K):\n            if lg[0, ids.shape[1] - 1 + j].argmax().item() == cand[0, j].item():\n                n_acc += 1\n            else:\n                break\n\n        if n_acc == K:\n            ids = torch.cat([ids, cand], 1)\n        else:\n            # the big model's own token replaces the first rejection\n            corrected = lg[0, ids.shape[1] - 1 + n_acc].argmax().view(1, 1)\n            ids = torch.cat([ids, cand[:, :n_acc], corrected], 1)\n    return ids",
      caption: "Step 3 is what makes it lossless: on a rejection you take the **target** model's token, so the output distribution is exactly the target's. Even zero accepted tokens still yields one correct token per pass." },

    { t: "h2", n: "02", text: "What it actually did", id: "measured" },

    { t: "out", text:
"target gpt2-medium (354,823,168)   draft gpt2 (124,439,808)\n48 new tokens, greedy\n\n  K=2   12.36 s   proposed  56   accepted 34 (61%)   19 passes -> 1.71 tok/pass\n  K=4    9.60 s   proposed  76   accepted 34 (45%)   19 passes -> 2.53 tok/pass\n  K=8   15.04 s   proposed 120   accepted 38 (32%)   15 passes -> 3.47 tok/pass\n\n  plain greedy on gpt2-medium: 4.85 s, 48 passes" },

    { t: "callout", kind: "crit", title: "It worked, and it was still slower",
      body: [{ t: "p", text: "Every part behaved as designed. Acceptance **fell** with K — 61%, 45%, 32% — because each additional drafted token must survive all the earlier ones being right. Tokens per expensive pass **rose** — 1.71, 2.53, 3.47 — which is the actual benefit. And it was still twice as slow as just decoding, because gpt2 is only 2.85x cheaper than gpt2-medium, so drafting four tokens costs about 1.4 target passes before the target pass even runs. Speculative decoding does not make decoding cheaper; it converts expensive sequential passes into cheap sequential passes plus one expensive parallel pass. If the draft is not dramatically cheaper, there is nothing to convert." }] },

    { t: "h2", n: "03", text: "The arithmetic that decides it", id: "arithmetic" },

    { t: "math", tex: "\\mathbb{E}[\\text{tokens per target pass}] = \\frac{1 - a^{K+1}}{1 - a}" },

    { t: "out", text:
"expected tokens per target forward pass\n\n  a      K=1     K=2     K=4     K=8\n  0.3    1.30    1.39    1.43    1.43\n  0.5    1.50    1.75    1.94    2.00\n  0.7    1.70    2.19    2.77    3.20\n  0.8    1.80    2.44    3.36    4.33\n  0.9    1.90    2.71    4.10    6.13" },

    { t: "callout", kind: "insight", title: "Acceptance rate dominates, and K saturates",
      body: [{ t: "p", text: "At **a = 0.9** and K = 8 you get **6.13** tokens per expensive pass — a transformative speedup. At **a = 0.3**, K = 8 gives only **1.43**, barely better than K = 1's 1.30, because the chance of a long run of agreement collapses geometrically. Notice also how quickly K saturates: at a = 0.5, going from K = 4 to K = 8 moves you from 1.94 to 2.00. There is no point drafting far beyond `1/(1−a)`. The speedup condition is roughly that expected tokens per pass must exceed `1 + K·c`, where `c` is the draft's cost as a fraction of the target's. My run had a ≈ 0.45 and c ≈ 0.35, so at K=4 the requirement was 2.4 tokens per pass against an achieved 2.53 — marginal in theory, and lost in practice to Python overhead." }] },

    { t: "p", text: "This is why production speculative decoding pairs a 7B target with a 1B draft, or uses a draft trained specifically to imitate the target rather than an arbitrary smaller model from the same family. Checking the two models at one position shows the problem directly: gpt2-medium's top token was ` 1950` and gpt2's was ` late` — they disagreed on the very first token, which costs the whole speculation round." },

    { t: "callout", kind: "insight", title: "It is lossless, which is unusual",
      body: [{ t: "p", text: "On a rejection the algorithm substitutes the **target** model's token, and the proper sampling version uses a modified rejection scheme that provably preserves the target's distribution. So the output is the same as decoding from the target alone — not similar, identical in distribution. That makes it categorically different from quantisation or distillation, which trade quality for speed. You can deploy it with no quality evaluation, exactly like FlashAttention in lesson 5.2." }] },

    { t: "h2", n: "04", text: "Continuous batching and PagedAttention", id: "batching" },

    { t: "diagram", kind: "compare", title: "Two different kinds of waste",
      columns: [
        { title: "Static batching", tone: "warn", items: [
          "Batch runs until every sequence finishes",
          "Short requests wait for the longest",
          "Finished slots sit idle producing nothing",
          "GPU utilisation collapses on mixed lengths",
          "New requests wait for the whole batch"
        ] },
        { title: "Continuous batching", tone: "good", items: [
          "Finished sequences leave immediately",
          "New requests join on the next step",
          "Every slot is always doing work",
          "Utilisation stays high on mixed lengths",
          "Orca, vLLM, TGI all do this"
        ] }
      ] },

    { t: "p", text: "Continuous batching recovers *time* — idle slots waiting on a long sequence. PagedAttention recovers *memory*, and they are independent problems." },

    { t: "callout", kind: "insight", title: "PagedAttention is virtual memory for the KV cache",
      body: [{ t: "p", text: "Allocating a contiguous KV cache per sequence means reserving space for the maximum possible length, because you cannot know in advance how long the output will be. If most requests generate 200 tokens and you reserved 4096, you have wasted 95% of the cache — and as lesson 5.2 showed, cache memory is what caps your batch size. PagedAttention stores the cache in fixed-size blocks that need not be contiguous, exactly as an operating system pages virtual memory, so a sequence allocates a block only when it actually needs one. It also enables **prefix sharing**: many requests with the same system prompt can point at the same physical blocks instead of each holding a copy. That is where the reported 2–4x throughput comes from — not faster kernels, just not wasting the memory that was limiting batch size." }] },

    { t: "h2", n: "05", text: "Quantisation", id: "quantisation" },

    { t: "out", text:
"precision     bytes/param    7B model     70B model\nFP32              4.0          28.0 GB      280.0 GB\nFP16 / BF16       2.0          14.0 GB      140.0 GB\nINT8              1.0           7.0 GB       70.0 GB\nINT4              0.5           3.5 GB       35.0 GB\n\nreference's 7B figures reproduce exactly" },

    { t: "dl", items: [
      ["GPTQ", "One-shot post-training quantisation using second-order information. Fast to apply, no retraining, widely supported."],
      ["AWQ", "Activation-aware: identifies the small fraction of weights that matter most to activations and protects them at higher precision."],
      ["GGUF", "The llama.cpp format, optimised for CPU and Apple Silicon inference. What makes running a 7B model on a laptop practical."],
      ["QLoRA", "Quantise the frozen base to 4-bit and train LoRA adapters in higher precision on top — fine-tuning a 70B model on a single card."]
    ] },

    { t: "callout", kind: "tradeoff", title: "Quality cost, and where it does not apply",
      body: [{ t: "p", text: "The usual figures are roughly **0.5%** degradation from FP16 to INT8 and **1–2%** from FP16 to INT4 — acceptable for inference and not for training, where gradients need the dynamic range. Two cautions from lesson 3.5's measurement, where quantisation shifted a logit by 0.0238. First, those percentages are averages over benchmarks; the errors concentrate near decision boundaries and on rare classes, so per-class metrics can move much more than the headline. Second, always evaluate the artefact you deploy, not the one you fine-tuned. Quantisation is the highest-return inference optimisation available — halving memory doubles your batch size, and decode is memory-bandwidth-bound so it directly halves the bottleneck — but it is the only one here that is genuinely lossy." }] },

    { t: "h2", n: "06", text: "Choosing what to do first", id: "order" },

    { t: "table",
      head: ["Technique", "What it recovers", "Lossy?", "Typical gain"],
      rows: [
        ["KV cache", "Recomputation of the prefix", "No", "Large and growing with length"],
        ["FlashAttention", "Memory traffic on the score matrix", "No", "2–4x on attention"],
        ["Continuous batching", "Idle slots waiting for long sequences", "No", "Large on mixed-length traffic"],
        ["PagedAttention", "Cache memory lost to over-allocation", "No", "2–4x throughput"],
        ["GQA / MQA", "Cache size and K,V projection cost", "Slightly", "8x cache at GQA8"],
        ["Quantisation", "Weight memory and bandwidth", "Yes, 0.5–2%", "2x per precision halving"],
        ["Speculative decoding", "Sequential dependency between tokens", "No", "2–3x, only with a much cheaper draft"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Take the lossless wins first",
      body: [{ t: "p", text: "Five of the seven are lossless, and most teams have not taken all of them. Caching, Flash, continuous batching and paged memory are engineering changes with no evaluation burden — adopt them before touching anything that changes outputs. Then quantisation, which is lossy but usually the biggest single lever. Speculative decoding last, because as this lesson measured it can be **negative** if the draft model is not dramatically cheaper, and it is the only one here whose payoff depends on a property of your specific model pair rather than on your infrastructure." }] },

    { t: "exercise", title: "Measure before adopting",
      tasks: [
        "Implement speculative decoding and measure acceptance rate at K = 2, 4 and 8 for your model pair.",
        "Compute your draft-to-target cost ratio and check whether expected tokens per pass exceeds 1 + K·c.",
        "Quantise your model to INT8 and INT4 and report per-class metrics, not just accuracy.",
        "Measure what fraction of your reserved KV cache is actually used across a realistic request mix.",
        "Compare static and continuous batching throughput on traffic with a realistic spread of output lengths."
      ] }
  ],

  takeaways: [
    "Speculative decoding drafts K tokens cheaply and verifies all K in one target pass, because verification is parallel even though generation is not.",
    "It is lossless: rejections substitute the target's own token, so the output distribution is exactly the target's.",
    "Measured acceptance fell with K — 61% at K=2, 45% at K=4, 32% at K=8 — because each extra token needs all the earlier ones to be right.",
    "Tokens per expensive pass rose correspondingly: 1.71, 2.53, 3.47.",
    "It was still 2x SLOWER than plain greedy (9.60 s against 4.85 s) because the draft was only 2.85x cheaper than the target.",
    "Expected tokens per pass is (1 − a^(K+1))/(1 − a): 6.13 at a=0.9 and K=8, but only 1.43 at a=0.3.",
    "K saturates quickly — at a=0.5, K=4 gives 1.94 and K=8 gives 2.00, so drafting far beyond 1/(1−a) is wasted.",
    "Continuous batching recovers idle time; PagedAttention recovers cache memory lost to over-allocation, and enables prefix sharing.",
    "Quantisation memory is exact: 7B at 28/14/7/3.5 GB for FP32/FP16/INT8/INT4, with roughly 0.5% and 1-2% quality cost.",
    "Five of the seven techniques are lossless — take those before anything that changes outputs."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why was speculative decoding slower than plain greedy decoding in the measurement?",
      options: ["The implementation was wrong", "The draft model was only 2.85x cheaper, so drafting K tokens cost nearly as much as the target passes it saved", "Acceptance rate was zero", "The models had different vocabularies"],
      answer: 1,
      why: "It behaved correctly — 45% acceptance at K=4 and 2.53 tokens per target pass. But speculative decoding converts expensive sequential passes into cheap sequential passes plus one expensive parallel pass, and if the draft is not dramatically cheaper there is nothing to convert. Production pairs use something like a 1B draft with a 7B target." },
    { stem: "Why does acceptance rate fall as K increases?",
      options: ["The draft model degrades", "Each additional drafted token requires all the earlier ones to have been accepted, so the probability of a long agreeing run decays geometrically", "The target model becomes less confident", "Numerical error accumulates"],
      answer: 1,
      why: "Measured 61%, 45%, 32% at K = 2, 4, 8. The expected yield is (1 − a^(K+1))/(1 − a), which saturates: at a = 0.5, K = 4 gives 1.94 and K = 8 gives 2.00. There is little point drafting far beyond 1/(1−a)." },
    { stem: "What does PagedAttention actually recover?",
      options: ["Compute time", "KV cache memory wasted by allocating for the maximum possible sequence length", "Network bandwidth", "Attention accuracy"],
      answer: 1,
      why: "A contiguous per-sequence cache must be sized for the longest possible output, so a request generating 200 tokens against a 4096 reservation wastes 95%. Since cache memory caps batch size, recovering it directly raises throughput — 2-4x — and non-contiguous blocks additionally allow many requests to share one copy of a common prefix." },
    { stem: "Which of these optimisations requires a quality evaluation before deployment?",
      options: ["FlashAttention", "Quantisation — it is the only genuinely lossy technique among them", "The KV cache", "Continuous batching"],
      answer: 1,
      why: "Caching, Flash, continuous batching, paging and speculative decoding are all exact or lossless. Quantisation costs roughly 0.5% at INT8 and 1-2% at INT4, and those are averages — errors concentrate near decision boundaries and on rare classes, so per-class metrics can move much more than the headline number." }
  ] },

  interview: { title: "Interview", sub: "Serving optimisations", questions: [
    { level: "Core", q: "How does speculative decoding work and when is it worth it?",
      strong: "Draft K tokens cheaply, verify all K in one target pass; worth it only when the draft is much cheaper and agrees often.",
      answer: [{ t: "p", text: "A small draft model generates K candidate tokens sequentially, then the large target model scores all K positions in a single forward pass, because verification is parallel even though generation isn't. You accept the longest prefix where the target agrees with the draft, and on the first disagreement you take the target's own token — which is what makes it lossless. The output distribution is exactly the target's, so there's no quality evaluation needed. Whether it's worth it comes down to two numbers: the acceptance rate and the draft's cost as a fraction of the target's. Expected tokens per target pass is one minus a to the K plus one, over one minus a. At 90% acceptance with K equals 8 that's 6.13 tokens per expensive pass, which is transformative; at 30% even K equals 8 gives only 1.43. I implemented it with gpt2 drafting for gpt2-medium and it came out twice as slow as plain greedy — 9.6 seconds against 4.85 — because gpt2 is only 2.85 times cheaper, so drafting four tokens cost more than the target passes it saved. That's the lesson: it converts expensive sequential passes into cheap ones plus a parallel verification, and if the draft isn't dramatically cheaper there's nothing to convert." }] },
    { level: "Senior", q: "What would you do first to improve LLM serving throughput?",
      strong: "The lossless wins — cache, Flash, continuous batching, paging — before anything that changes outputs.",
      answer: [{ t: "p", text: "I'd order by return per unit of risk, and the striking thing is how many high-return options are completely lossless. First, make sure the KV cache is on, which sounds trivial but turning it off is a real bug — I measured 3.46x on just 60 generated tokens, growing with length. Then FlashAttention, which is exact, not an approximation, so it's an engineering change with no evaluation burden. Then continuous batching, which recovers idle slots waiting on the longest sequence in a batch, and PagedAttention, which recovers cache memory lost to allocating for maximum length. Those last two matter more than people expect: if most requests generate 200 tokens against a 4096 reservation you're wasting 95% of the memory that caps your batch size, and paging also lets many requests share one copy of a common system prompt. Only after all of that would I reach for quantisation — the biggest single lever, halving memory and therefore halving the bandwidth bottleneck that decode is limited by, but the one genuinely lossy technique here, so it needs per-class evaluation on the artefact I actually deploy. And speculative decoding last, because it's the only one whose payoff depends on a property of my specific model pair rather than my infrastructure, and it can be net negative." }] },
    { level: "Senior", q: "How do you decide whether to quantise a production model?",
      strong: "From the memory constraint it relieves, evaluated per-class on the quantised artefact.",
      answer: [{ t: "p", text: "I'd start from what constraint it relieves rather than from the quantisation itself. Halving bytes per parameter halves weight memory — 7B goes from 14 GB at FP16 to 7 GB at INT8 — and since decode is memory-bandwidth-bound, that directly halves the thing you're bottlenecked on. It also frees card space for KV cache, which is usually what caps batch size, so the throughput gain compounds. If neither memory nor bandwidth is my constraint, quantisation buys little and I'd skip it. Then the evaluation, which has to be done properly. The usual headline figures are around 0.5% degradation at INT8 and 1 to 2% at INT4, but those are averages over benchmarks and the error doesn't distribute evenly — it concentrates near decision boundaries, so rare classes and hard examples move far more than the aggregate suggests. I measured quantisation shifting a single logit by 0.0238, which flips nothing on typical inputs and flips exactly the marginal ones. So I'd run the full evaluation set through the quantised artefact, report per-class F1 rather than accuracy, and pay specific attention to the classes I care about most. On method, I'd try AWQ before GPTQ since protecting activation-salient weights tends to hold quality better at 4-bit, and GGUF if the target is CPU or Apple Silicon. And I'd keep the FP16 model deployable so a regression can be rolled back in minutes." }] }
  ] }
});

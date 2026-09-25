/* ============================================================================
   LESSON 5.12 — Long Context and Training at Scale
   Mirrors 02_Transformers_InDepth.md · §24-25. Ring attention is implemented
   and proved exact to 7.45e-08 (§03), and the reference's "~120 GB at 1M
   tokens" is shown to be a GQA figure, not MHA (§01)
   (scratchpad/nlp/n512.py).
   ========================================================================= */
EC.receiveLesson({
  id: "5.12",

  lede: "**Ring attention across 8 devices brings a 1M-token KV cache from 524.3 GB to 65.5 GB per device — and the result is bit-comparable to full attention, agreeing to 7.45e-08.** It is not an approximation, a windowing scheme or a compression. It is the same computation, with the sequence split across devices and partial results recombined by the online softmax from lesson 5.2. This lesson covers how long context is actually achieved, and why a model advertising 1M tokens may not usefully use them.",

  objectives: [
    "Compute KV cache at extreme context and identify what limits it",
    "Explain ring attention and verify it is exact",
    "Show how sliding-window attention still propagates information globally",
    "Explain the 'lost in the middle' effect from mechanisms measured earlier",
    "Choose the right parallelism for a given training constraint"
  ],

  prerequisites: ["5.11", "5.2"],

  blocks: [

    { t: "h2", n: "01", text: "The problem at one million tokens", id: "problem" },

    { t: "out", text:
"KV cache for a 32-layer, 4096-wide 7B model at 1,000,000 tokens, fp16\n\n  full MHA   (n_kv = 32)    524.3 GB\n  GQA8       (n_kv = 8)     131.1 GB" },

    { t: "callout", kind: "warn", title: "The reference's \"~120 GB\" is a GQA figure",
      body: [{ t: "p", text: "The reference states that a 7B model at 1M tokens needs roughly **120 GB** of KV cache. That matches **GQA with 8 groups** at 131.1 GB, not full multi-head attention, which comes to **524.3 GB** — more than four times the quoted number. The distinction matters because it changes the conclusion: at 524 GB you need seven 80GB cards for the cache alone, at 131 GB you need two. Worth stating explicitly, because \"a 7B model needs 120 GB at 1M tokens\" silently assumes an architectural choice that older models do not make." }] },

    { t: "h2", n: "02", text: "Ring attention", id: "ring" },

    { t: "diagram", kind: "steps", title: "How the ring works",
      items: [
        { title: "1. Partition", text: "Split N tokens across P devices. Each device holds N/P tokens, and keeps its own Q block permanently." },
        { title: "2. Rotate", text: "KV blocks pass around the ring — each device sends its KV to the next and receives from the previous." },
        { title: "3. Accumulate", text: "At each step, every device computes attention between its local Q and whichever KV block it currently holds." },
        { title: "4. Combine", text: "After P steps every Q has seen every KV. The running (max, denominator, output) statistics merge the partial results exactly." }
      ] },

    { t: "out", text:
"1,000,000 tokens, 32 layers, d_model 4096, fp16, full MHA\n\ndevices   tokens/device   KV per device   fits on 80GB?\n1         1,000,000         524.3 GB        no\n2           500,000         262.1 GB        no\n4           250,000         131.1 GB        no\n8           125,000          65.5 GB        yes\n16           62,500          32.8 GB        yes\n64           15,625           8.2 GB        yes" },

    { t: "h2", n: "03", text: "Proving it is exact", id: "exact" },

    { t: "p", text: "Each device attends to one KV block at a time and must combine `P` partial results into the true softmax over all `N` keys. That is precisely the running-statistics update from lesson 5.2 — which is why FlashAttention's online softmax is the enabling idea for ring attention, not merely a related one." },

    { t: "out", text:
"4 devices, the running output as KV blocks rotate\n\n  after device 0: partial output[0,0] = +0.334320\n  after device 1: partial output[0,0] = +0.137551\n  after device 2: partial output[0,0] = +0.122937\n  after device 3: partial output[0,0] = +0.187467\n\n  final ring result   +0.187467\n  full attention      +0.187466\n  max abs difference   7.451e-08" },

    { t: "callout", kind: "insight", title: "The intermediate values are meaningless, and the final one is exact",
      body: [{ t: "p", text: "After device 0 the running output is **+0.334320**, which is not an approximation of the answer — it is a partial sum normalised by a partial denominator, and it bears no particular relationship to the truth. Each subsequent block rescales everything accumulated so far by `exp(m − m_new)` and adds its own contribution. Only after all four does the value land on **+0.187467** against full attention's **+0.187466**. That is exactness by construction, not convergence. Communication also overlaps with computation — while a device attends to its current KV block, the next one is already in flight — so the ring costs bandwidth rather than latency." }] },

    { t: "table",
      head: ["Technique", "How it splits", "Advantage", "Cost"],
      rows: [
        ["Ring attention", "KV blocks rotate around a ring", "Exact; overlaps communication with compute", "Needs a high-bandwidth ring topology"],
        ["Striped attention", "Round-robin token assignment", "Better load balance under a causal mask", "More complex to implement"],
        ["DeepSpeed Ulysses", "Partitions attention heads across devices", "Less communication volume", "Per-head memory unchanged"],
        ["Megatron SP", "Sequence dimension in non-attention layers", "Complements ring attention", "Does not address attention itself"]
      ] },

    { t: "callout", kind: "note", title: "Why striped attention exists",
      body: [{ t: "p", text: "A causal mask makes ring attention **load-imbalanced**. The device holding the first block of tokens has queries that attend to almost nothing, while the device holding the last block has queries attending to everything — so one device does a fraction of the work of another and the ring waits for the slowest. Striped attention assigns tokens round-robin rather than in contiguous blocks, so every device holds a mix of early and late positions and the causal work is spread evenly. It is a pure scheduling fix to a problem that only exists because of the mask." }] },

    { t: "h2", n: "04", text: "Sliding window attention", id: "sliding" },

    { t: "p", text: "Mistral's approach is different: restrict every token to attending only to the previous `W` positions. That is `O(N·W)` instead of `O(N²)`, and it looks like it should destroy long-range dependency — except that stacking layers recovers it." },

    { t: "out", text:
"window W = 4096\n\nlayers    effective receptive field\n1              4,096 tokens\n4             16,384\n8             32,768\n16            65,536\n32           131,072\n\nMistral 7B: 32 layers x 4096 = 131,072 tokens of reach\n\ncompute saving\n  N =   8,192    full 67,108,864    window   33,554,432     2x less\n  N =  32,768    full  1.07e9       window  134,217,728     8x less\n  N = 131,072    full  1.72e10      window  536,870,912    32x less" },

    { t: "callout", kind: "insight", title: "Depth buys range, exactly as in a CNN",
      body: [{ t: "p", text: "A token at layer 1 sees 4,096 positions back. At layer 2 it sees tokens that themselves saw 4,096 back, so its effective reach is 8,192 — and after 32 layers, **131,072**. This is precisely the receptive-field argument from lesson 5.7 about convolutional hierarchy, applied along the sequence instead of across an image. Information genuinely propagates the full distance; it just takes several hops rather than one. The cost is that a long-range dependency must survive being relayed through intermediate representations, which is weaker than attending directly — the same distinction that made attention better than recurrence in lesson 4.1, reappearing at a coarser granularity." }] },

    { t: "h2", n: "05", text: "Extending a trained model", id: "extending" },

    { t: "dl", items: [
      ["Position Interpolation", "Scale position indices by `L_train / L_target`. Cheap, needs light fine-tuning, compresses high-frequency detail uniformly — lesson 4.9 measured the ratios."],
      ["NTK-aware scaling", "Raise the RoPE base so high frequencies are barely touched and low ones stretch. Often works with no fine-tuning."],
      ["YaRN", "NTK-by-parts plus attention temperature. LLaMA-3 went from 8K to 128K with it."],
      ["Dynamic NTK", "Adjust the scaling factor at inference according to the actual sequence length, so short inputs are unaffected."],
      ["Landmark / beacon tokens", "Insert special tokens summarising preceding context; attend to those for distant information and keep full attention local."],
      ["Infini-attention", "Local attention plus a compressive memory updated by linear attention — a fixed-size running summary of everything before the current segment."]
    ] },

    { t: "callout", kind: "insight", title: "Infini-attention is an SSM bolted onto attention",
      body: [{ t: "p", text: "Look at what its compressive memory actually is: a fixed-size state, updated linearly as segments stream past, queried to retrieve information about the whole past. That is the state-space model from lesson 5.11, running alongside local attention rather than replacing it. The combination gives exact recall within the current segment and lossy compressed recall beyond it — which is the same resolution the SSM field reached with hybrid models, arrived at from the attention side. Worth noticing when two lines of work converge on the same structure from opposite directions." }] },

    { t: "h2", n: "06", text: "Advertised context is not usable context", id: "middle" },

    { t: "callout", kind: "crit", title: "Lost in the middle, explained by two things already measured",
      body: [{ t: "p", text: "Hide a fact at a random position in a long context and ask for it — the standard needle-in-a-haystack benchmark — and retrieval accuracy forms a **U-shape**: high at the start, high at the end, a pronounced dip in the middle. Two mechanisms from earlier lessons both point that way. **Attention sinks**: lesson 4.4 measured a BERT head sending 86.4% of its mass to a structural token, and early positions attract attention regardless of content. **RoPE's distance decay**: lesson 4.9 measured aligned query-key scores falling to 5.36% of their distance-0 value by 2,048 positions, so recent tokens are structurally easier to attend to. The beginning is favoured by the first mechanism and the end by the second. The middle gets neither." }] },

    { t: "p", text: "The practical consequence is that a model advertising 128K may degrade substantially beyond 32K on real tasks, and **effective context** should be measured rather than read off a spec sheet. Run needle-in-a-haystack at the positions and lengths your application actually uses. Where genuinely long context is needed, retrieval into a shorter window is often more reliable than trusting a long one — lesson 2.8's retrieve-then-read is competing with long context, not superseded by it." },

    { t: "h2", n: "07", text: "Parallelism for training", id: "parallelism" },

    { t: "table",
      head: ["Technique", "What it splits", "Use when", "Cost"],
      rows: [
        ["Data parallel", "Replicate model, split the batch", "Batch too large for one device", "Full model must fit on each device"],
        ["Tensor parallel", "Individual matrices across devices", "One layer too large for one device", "High communication per layer"],
        ["Pipeline parallel", "Different layers on different devices", "Model too deep for one device", "Bubble overhead between stages"],
        ["Sequence / ring", "The sequence itself", "Context too long for one device", "Needs a high-bandwidth ring"],
        ["ZeRO / FSDP", "Optimiser state, gradients, parameters", "Optimiser state too large", "Communication at every step"]
      ] },

    { t: "out", text:
"training memory, fp16 weights with fp32 Adam and master weights\n\n  7B    weights  14.0 + grads  14.0 + Adam  56.0 + master  28.0 =  112.0 GB\n  70B   weights 140.0 + grads 140.0 + Adam 560.0 + master 280.0 = 1120.0 GB" },

    { t: "callout", kind: "insight", title: "The optimiser state is the biggest term",
      body: [{ t: "p", text: "For a 7B model, weights are 14 GB and **Adam's two fp32 moments are 56 GB** — four times the weights, and the single largest item. Add fp32 master weights and you are at 112 GB before a single activation. That is why **ZeRO stage 1**, which shards only the optimiser state, already removes half the problem, and why LoRA's saving in lesson 5.6 was so large: eliminating trainable parameters eliminates this term. The techniques compose — a large run typically uses data, tensor and pipeline parallelism together with FSDP, which is what \"3D parallelism\" refers to." }] },

    { t: "exercise", title: "Size a long-context deployment",
      tasks: [
        "Compute your model's KV cache at your target context, and note whether the figure assumes MHA or GQA.",
        "Work out how many devices ring attention would need to fit that cache, and whether your interconnect supports the ring.",
        "For a sliding-window model, compute layers × window and compare it against the advertised context.",
        "Run needle-in-a-haystack at several positions and lengths, and find where your model's effective context ends.",
        "For a training run, compute the four memory terms and identify which ZeRO stage you actually need."
      ] }
  ],

  takeaways: [
    "A 7B model at 1M tokens needs 524.3 GB of KV cache under full MHA and 131.1 GB under GQA8 — the reference's ~120 GB is the GQA figure.",
    "Ring attention splits the sequence across P devices, rotating KV blocks; memory per device is O(N/P), and 8 devices bring 524.3 GB down to 65.5 GB each.",
    "It is exact, not approximate: agreement with full attention to 7.45e-08, because the online softmax recombines partial results correctly.",
    "Intermediate ring values are meaningless partial sums — +0.334320 after the first block against a true +0.187467 — and only the final combination is correct.",
    "A causal mask makes ring attention load-imbalanced; striped attention assigns tokens round-robin to fix it.",
    "Sliding-window attention is O(N·W), and depth recovers range: Mistral's 32 layers × 4096 window reaches 131,072 tokens.",
    "Infini-attention's compressive memory is structurally an SSM running alongside local attention — the same hybrid resolution reached from the attention side.",
    "'Lost in the middle' follows from two measured mechanisms: attention sinks favour the start, RoPE's distance decay favours the end.",
    "Advertised context is not effective context — measure it with needle-in-a-haystack at your own lengths.",
    "Adam's optimiser state is 56 GB for a 7B model against 14 GB of weights, which is why ZeRO stage 1 alone removes most of the training memory problem."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Is ring attention an approximation?",
      options: ["Yes, it drops distant attention", "No — it agreed with full attention to 7.45e-08, because partial results are recombined by the online softmax", "Yes, it uses lower precision", "Only under a causal mask"],
      answer: 1,
      why: "Each device attends to one KV block at a time and merges partial results using the running max, denominator and output from FlashAttention's online softmax. The intermediate values are meaningless — +0.334320 after the first of four blocks against a true +0.187467 — but the final combination is exact by construction, not by convergence." },
    { stem: "How does sliding-window attention still capture long-range dependencies?",
      options: ["It does not", "Depth compounds the window: each layer moves information W positions, so 32 layers × 4096 reaches 131,072 tokens", "It uses global tokens", "The window grows with layer index"],
      answer: 1,
      why: "A token at layer 2 sees tokens that themselves saw W positions back, so reach multiplies with depth — the same receptive-field argument as a CNN. The cost is that a long dependency must be relayed through intermediate representations rather than attended to directly, which is weaker than one hop." },
    { stem: "Why do models struggle to retrieve facts from the middle of a long context?",
      options: ["Training data is front-loaded", "Attention sinks favour early positions and RoPE's distance decay favours recent ones — the middle benefits from neither", "Positional embeddings run out", "Tokenisation degrades"],
      answer: 1,
      why: "Two independently measured mechanisms point in opposite directions. Lesson 4.4 found a head sending 86.4% of its mass to a structural token near the start; lesson 4.9 found aligned query-key scores falling to 5.36% by 2,048 positions, favouring recency. The U-shape follows, and it means advertised context must be verified rather than trusted." },
    { stem: "Which term dominates training memory for a 7B model?",
      options: ["The weights, at 14 GB", "Adam's optimiser state, at 56 GB — four times the weights", "Activations", "Gradients"],
      answer: 1,
      why: "Two fp32 moments per parameter is 8 bytes against the weights' 2, so the optimiser state is the largest single item — 56 GB against 14 GB of weights, with gradients at 14 GB and fp32 master weights at 28 GB. That is why ZeRO stage 1, sharding only optimiser state, already removes most of the problem, and why LoRA's saving was so large." }
  ] },

  interview: { title: "Interview", sub: "Scale", questions: [
    { level: "Core", q: "How do models handle a one-million-token context?",
      strong: "Distribute the sequence (ring attention), restrict attention (sliding window), or compress the past.",
      answer: [{ t: "p", text: "Three broad families. Distribute it: ring attention splits the sequence across devices, each keeping its own query block while KV blocks rotate around a ring, so memory per device is order N over P. I computed that for a 7B model at 1M tokens — 524 GB of KV cache under full MHA becomes 65.5 GB per device across eight devices, which fits. The crucial property is that it's exact, agreeing with full attention to 7.45e-08, because partial results are merged using the same online softmax statistics that make FlashAttention work. Restrict it: sliding-window attention lets each token see only the previous W positions, order N times W instead of N squared, and depth recovers the range — Mistral's 32 layers with a 4096 window reaches 131,072 tokens, the same receptive-field argument as a CNN. Compress it: Infini-attention keeps local attention plus a fixed-size compressive memory of everything earlier, which is structurally a state space model bolted onto attention. And separately from all three, you extend a trained model's positional encoding with YaRN or NTK scaling, which is lesson 4.9's material. In practice a long-context model uses several of these at once." }] },
    { level: "Senior", q: "A model advertises 128K context. What do you check before relying on it?",
      strong: "Effective context by needle-in-a-haystack at your own lengths and positions — advertised is not usable.",
      answer: [{ t: "p", text: "I'd measure it rather than trust it, because effective context is routinely much shorter than the maximum. The standard test is needle-in-a-haystack: hide a specific fact at a known position in a long context and ask for it, sweeping both the position and the total length. What you typically see is a U-shape — good retrieval near the start, good near the end, a pronounced dip in the middle — and I'd expect that from mechanisms I've measured directly. Attention sinks mean early positions attract attention regardless of content; I measured a head sending 86.4% of its mass to a structural token. And RoPE's distance decay means recent tokens are structurally easier to attend to; aligned query-key scores fell to 5.36% of their distance-zero value by 2,048 positions. The start is favoured by one mechanism, the end by the other, the middle by neither. So I'd run that benchmark at the lengths and positions my application actually uses, not at a round number, and I'd use a needle that resembles my real content rather than a synthetic sentence, since a jarringly out-of-place fact is easier to find than a plausible one. If effective context turns out to be well short of the advertised figure, the right response is usually retrieval into a shorter window rather than pushing the long context harder — retrieve-then-read is competing with long context, not obsoleted by it." }] },
    { level: "Senior", q: "You are training a 70B model. Which parallelism do you use?",
      strong: "All of them — but start from which memory term is binding.",
      answer: [{ t: "p", text: "I'd start from the memory arithmetic rather than the technique list, because the numbers tell you which constraint binds. For 70B in mixed precision: 140 GB of fp16 weights, 140 GB of gradients, 560 GB of Adam state in fp32, and 280 GB of fp32 master weights — about 1.1 terabytes before a single activation. The optimiser state is by far the largest term, four times the weights, which immediately says ZeRO or FSDP is the first move, and stage 1 alone — sharding just optimiser state — removes half the problem. Then the model still doesn't fit on one device, so tensor parallelism within a node, where the interconnect is fast, since it communicates within every layer. Pipeline parallelism across nodes, splitting layers, since that communicates only at stage boundaries — but sized carefully because pipeline bubbles waste real compute and you need enough micro-batches to fill them. Data parallelism on top for throughput once the model fits. That combination is what's meant by 3D parallelism. If I also need long context I'd add sequence or ring parallelism as a fourth axis, which is a separate concern from the model not fitting. And I'd reach for gradient checkpointing before adding more devices, because activations are the term I left out of that arithmetic and they trade cheaply against recompute." }] }
  ] }
});

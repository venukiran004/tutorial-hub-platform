EC.receiveLesson({
  id: "3.1",

  lede: "Generation has two phases that look like one from outside and behave like opposites from inside. **Prefill** processes the whole prompt in a single parallel pass and is compute-bound. **Decode** produces one token per pass and is memory-bound — it loads the entire model to emit a single token. Every optimisation in this module targets one phase or the other, and applying a decode optimisation to a prefill bottleneck is the commonest wasted quarter in LLM serving.",

  objectives: [
    "Describe what happens in each phase and which resource bounds it",
    "Name the four serving metrics and say which phase each belongs to",
    "Compute a model's memory requirement from its parameter count",
    "Explain arithmetic intensity and why it predicts the bottleneck",
    "Diagnose a workload to the phase that is limiting it"
  ],

  prerequisites: ["1.1", "1.12"],

  blocks: [

    { t: "h2", n: "01", id: "two-phases", text: "Two phases, two bottlenecks",
      sub: "Parallel over the prompt, then sequential over the output" },

    { t: "p", text: "From 1.1: the model takes a sequence and produces a next-token distribution. What that hides is that the first call and every subsequent call do very different amounts of work." },

    { t: "viz", title: "Prefill and decode", caption: "Prefill is one pass over many tokens. Decode is many passes over one token each — and each pass loads the whole model.",
      svg: `<svg viewBox="0 0 760 232" width="100%" role="img" aria-label="Prefill and decode phases">
  <text x="16" y="24" class="s-label" style="fill:var(--accent)">PREFILL — one pass, all prompt tokens at once</text>
  <rect x="16" y="34" width="330" height="36" rx="6" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="181" y="57" text-anchor="middle" class="s-sub">256 prompt tokens, processed in parallel</text>
  <text x="362" y="50" class="s-sub">compute-bound: a big matrix multiply</text>
  <text x="362" y="66" class="s-sub">time grows with prompt length</text>

  <text x="16" y="110" class="s-label" style="fill:var(--warn)">DECODE — one pass per token</text>
  <rect x="16" y="120" width="40" height="30" rx="4" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <rect x="62" y="120" width="40" height="30" rx="4" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <rect x="108" y="120" width="40" height="30" rx="4" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <rect x="154" y="120" width="40" height="30" rx="4" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <rect x="200" y="120" width="40" height="30" rx="4" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="256" y="140" class="s-sub">… one per output token</text>
  <text x="362" y="128" class="s-sub">memory-bound: load every weight</text>
  <text x="362" y="144" class="s-sub">to produce a single token</text>
  <text x="362" y="160" class="s-sub">time barely depends on prompt length</text>

  <text x="16" y="196" class="s-mono" style="fill:var(--accent)">measured: 256 tokens prefilled in 538 ms</text>
  <text x="16" y="214" class="s-mono" style="fill:var(--warn)">measured: one decode step 28–61 ms, whatever the context</text>
</svg>` },

    { t: "code", lang: "python", title: "g32.py — prefill against prompt length", code: `ids = tok("word " * 300, return_tensors="pt").input_ids

for n in (16, 32, 64, 128, 256, 512):
    sub = ids[:, :n]
    ms = timed(lambda: small(sub))        # median of 5, after warm-up
    print("%-10d %12.1f %14.3f" % (n, ms, ms / n))`,
      out: `  prompt tok   prefill ms   ms per token
  16                 52.1          3.257
  32                 84.5          2.639  (1.62x the previous)
  64                159.5          2.491  (1.89x the previous)
  128               308.8          2.412  (1.94x the previous)
  256               538.5          2.103  (1.74x the previous)
  512               765.2          1.494  (1.42x the previous)`,
      hl: [5],
      caption: "Total time grows roughly with length — each doubling costs between 1.4× and 1.9× — while **cost per token falls**, from 3.26 ms to 1.49 ms. That falling column is parallelism: a longer prompt uses the hardware better." },

    { t: "code", lang: "python", title: "g32.py — one decode step at three context lengths", code: `for ctx in (16, 128, 512):
    with torch.no_grad():
        o = small(ids[:, :ctx], use_cache=True)
    past, cur = o.past_key_values, o.logits[:, -1:].argmax(-1)
    print("%-12d %14.2f" % (ctx, timed(lambda: small(cur, past_key_values=past))))`,
      out: `  context      decode step ms
  16                    27.89
  128                   53.81
  512                   61.01`,
      caption: "Decode cost does rise with context — 2.2× across a 32× increase — but far less than proportionally, because loading the weights dominates and attending over a longer cache is the smaller growing term." },

    { t: "callout", kind: "insight", title: "Decode is sublinear in context, not independent of it",
      body: [
        { t: "p", text: "The usual summary is that decode time does not depend on context length. The measurement is more precise: it grows, and it grows slowly — 27.89 ms at 16 tokens of context against 61.01 ms at 512." },
        { t: "p", text: "The reason both halves are true is that a decode step has two components. Loading the model's weights is a fixed cost paid every step; attending over the KV cache grows with context. On a 124M-parameter model at short contexts the fixed part dominates, which is why the growth is sublinear." },
        { t: "p", text: "On a very long context the attention term stops being small, which is the whole motivation for the attention optimisations in 3.4 and for sliding-window attention. \"Decode is context-independent\" is a useful approximation that fails exactly where long-context serving gets hard." }
      ] },

    { t: "h2", n: "02", id: "metrics", text: "Four metrics, each belonging to a phase",
      sub: "And knowing which one a complaint is about" },

    { t: "table",
      head: ["Metric", "What it is", "Phase", "Reference's target"],
      rows: [
        ["**TTFT** — time to first token", "Latency until the first output token", "**Prefill**", "< 500 ms"],
        ["**TPOT** — time per output token", "Latency for each subsequent token", "**Decode**", "< 50 ms"],
        ["**Throughput**", "Tokens per second across all requests", "**Decode**, mostly", "Maximise"],
        ["**Total latency**", "`TTFT + output_tokens × TPOT`", "Both", "Minimise"]
      ],
      caption: "From the reference notes section 1. TTFT and throughput pull in opposite directions, which is the central tension of serving — and section 04 is about why." },

    { t: "p", text: "The practical value of this table is diagnostic. \"It is slow\" is not actionable; \"TTFT is 3 seconds\" points at the prompt and at prefill, and \"TPOT is 140 ms\" points at the model size and at memory bandwidth. They have almost no fixes in common." },

    { t: "h2", n: "03", id: "memory", text: "Where the memory goes",
      sub: "Weights, and then the cache that grows per request" },

    { t: "code", lang: "python", title: "memory.py — the formulas", code: `# Model weights
memory_weights = num_params * 2          # bytes, at float16

# KV cache, per request
memory_kv = 2 * n_layers * n_heads * head_dim * seq_len * 2
#           ^ K and V                                    ^ float16`,
      out: `  the 7B table, checked against the same arithmetic:
    FP32  7B x 4.0 =  28.0 GB
    FP16  7B x 2.0 =  14.0 GB
    INT8  7B x 1.0 =   7.0 GB
    INT4  7B x 0.5 =   3.5 GB`,
      caption: "The weights table checks out exactly. The KV cache formula is where the worked example goes wrong, and 3.2 has that measurement." },

    { t: "p", text: "The distinction that matters operationally: **weights are a fixed cost and the KV cache is a per-request cost that grows with sequence length**. A server has enough memory for the model and then a budget for concurrent requests, and 3.2 is about how that budget is spent and how PagedAttention stops it being wasted." },

    { t: "h2", n: "04", id: "intensity", text: "Arithmetic intensity predicts the bottleneck",
      sub: "FLOPs per byte loaded, and why decode loses" },

    { t: "p", text: "The reference gives the concept and it is the one idea that makes the rest of this module coherent. **Arithmetic intensity** is the ratio of arithmetic performed to bytes moved from memory. Hardware has a ratio too — an accelerator's FLOPs per second divided by its memory bandwidth — and whichever side of that ratio you fall on determines what limits you." },

    { t: "math", tex: "\\text{AI} = \\frac{\\text{FLOPs}}{\\text{bytes loaded}} \\qquad \\text{bound by compute if AI} > \\frac{\\text{peak FLOPs}}{\\text{bandwidth}}" },

    { t: "dl", items: [
      ["Prefill has high arithmetic intensity", "The weights are loaded once and used against hundreds or thousands of tokens, so the FLOPs-per-byte ratio is large and the accelerator's compute units are the limit."],
      ["Decode has low arithmetic intensity", "The same weights are loaded to process **one** token, so almost no arithmetic is done per byte moved. The compute units idle while memory delivers weights."]
    ] },

    { t: "p", text: "The reference gives the estimate that follows: `decode throughput ≈ model size / memory bandwidth`. A 14 GB model on an accelerator with 2 TB/s of bandwidth cannot produce tokens faster than about 7 ms each, however fast its arithmetic is — because every token requires reading 14 GB." },

    { t: "callout", kind: "insight", title: "This single ratio explains most of the module",
      body: [
        { t: "p", text: "**Quantization** (3.3) works because it reduces bytes loaded, which is the binding constraint in decode. Halving the weight precision roughly halves the decode time — the arithmetic is not what was limiting." },
        { t: "p", text: "**Batching** (3.5) works because the weights loaded for one token can serve 32 requests at once, raising arithmetic intensity without loading anything more." },
        { t: "p", text: "**Speculative decoding** (3.6) works because the GPU is idle during decode, so verifying four candidate tokens in one pass costs little more than verifying one." },
        { t: "p", text: "All three are the same observation from different angles: decode wastes compute, so anything that gets more work out of the same memory traffic is nearly free." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Find where prefill stops dominating",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Total latency is `TTFT + output_tokens × TPOT`, and which term dominates depends entirely on the shape of the request. Knowing the crossover tells you which phase to optimise for a given workload." },
        { t: "p", text: "Measure both phases on real hardware and find the crossover." }
      ],
      requirements: [
        "Measure prefill time for prompts of 16 to 512 tokens and fit a linear model",
        "Measure a single decode step at a representative context length",
        "For prompts of 100, 1,000 and 10,000 tokens, find the output length at which decode time exceeds prefill time",
        "Report the share of total latency each phase takes for a typical RAG request and a typical chat reply",
        "State which phase you would optimise for each"
      ],
      hint: "Fit prefill as `a × prompt_tokens + b` from the measurements, then solve `output × TPOT = prefill(prompt)`.",
      solution: { lang: "python", title: "g31_ex.py",
        code: `# measured on gpt2, CPU, 4 threads (g32.py)
PREFILL = {16: 52.1, 32: 84.5, 64: 159.5, 128: 308.8, 256: 538.5, 512: 765.2}
TPOT = 53.81                                   # ms, one decode step at 128 ctx

xs = list(PREFILL); ys = [PREFILL[x] for x in xs]; n = len(xs)
slope = (n * sum(x*y for x, y in zip(xs, ys)) - sum(xs)*sum(ys)) \\
        / (n * sum(x*x for x in xs) - sum(xs)**2)
icpt = (sum(ys) - slope*sum(xs)) / n
print("prefill fit: %.3f ms/token + %.1f ms" % (slope, icpt))
print("TPOT       : %.2f ms/token" % TPOT)
print()

def prefill(p): return slope * p + icpt

print("%8s %12s %16s" % ("prompt", "prefill ms", "crossover output"))
for p in (100, 1000, 10000):
    cross = prefill(p) / TPOT
    print("%8d %12.1f %16.1f tokens" % (p, prefill(p), cross))

print()
print("%-22s %8s %8s %10s %10s" % ("workload", "prompt", "output", "prefill%", "decode%"))
for name, p, o in (("RAG answer", 4000, 150),
                   ("chat reply", 300, 250),
                   ("summarise a doc", 8000, 400),
                   ("classify", 200, 2)):
    pf, dc = prefill(p), o * TPOT
    print("%-22s %8d %8d %9.0f%% %9.0f%%"
          % (name, p, o, 100*pf/(pf+dc), 100*dc/(pf+dc)))`,
        out: `prefill fit: 1.456 ms/token + 73.4 ms
TPOT       : 53.81 ms/token

  prompt   prefill ms crossover output
     100        219.1              4.1 tokens
    1000       1529.7             28.4 tokens
   10000      14636.0            272.0 tokens

workload                 prompt   output   prefill%    decode%
RAG answer                 4000      150        42%        58%
chat reply                  300      250         4%        96%
summarise a doc            8000      400        35%        65%
classify                    200        2        77%        23%`,
        notes: [
          { t: "p", text: "The crossover is startlingly low. On a 100-token prompt, decode overtakes prefill after **4.1 output tokens** — so for essentially every real response, decode is the larger cost. Even on a 10,000-token prompt the crossover is 272 tokens, which a long answer passes." },
          { t: "p", text: "That is why the serving literature is overwhelmingly about decode: quantization, batching, speculative decoding, KV cache management. Prefill matters for **TTFT** — the user staring at a spinner (1.12) — and decode matters for **throughput and total latency**, which is where the cost is." },
          { t: "p", text: "The workload table makes the exceptions visible, and there are two. A RAG answer is **42% prefill**, because 4,000 tokens of retrieved context is a lot of prompt for a short answer — so on a RAG endpoint, prompt caching (1.13) and chunked prefill (3.5) are worth more than on a chat product. And `classify` is the extreme case at **77% prefill**: a 200-token prompt and a two-token answer is almost all prefill, which is exactly the shape of the incident this lesson closes on." },
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: six weeks of quantization work on a prefill-bound service",
      body: [
        { t: "p", text: "**Symptom.** A document-analysis service had a p95 latency of 9 seconds and a target of 3. The team spent six weeks on decode optimisations — quantizing the model to INT8, upgrading to a serving framework with continuous batching, tuning the batch scheduler. p95 moved from 9 seconds to 8.4." },
        { t: "p", text: "**What the metrics showed, once they were separated.** TTFT was 7.9 seconds and TPOT was 21 ms over an average of 24 output tokens — so decode accounted for about half a second of the nine. Every optimisation had been aimed at the half-second." },
        { t: "p", text: "**Mechanism.** The service sent 30,000-token documents and asked for a two-sentence classification. That is the far end of the workload table above: almost all prompt, almost no output, and therefore almost all prefill. Prefill is compute-bound and quantization helps it least; continuous batching helps throughput and not a single request's TTFT." },
        { t: "p", text: "**Fix.** Chunked prefill so a long document did not block other requests, prompt caching for the 4,000-token instruction prefix that was identical across requests (1.13), and — by far the largest — summarising the document in a cheap first pass so the expensive model saw 2,000 tokens instead of 30,000. p95 went to 2.1 seconds. The six weeks were not wasted work badly done; they were good work aimed at the wrong phase, and separating TTFT from TPOT at the start would have shown that in an afternoon." }
      ] }
  ],

  takeaways: [
    "**Prefill processes the whole prompt in one parallel pass and is compute-bound. Decode produces one token per pass and is memory-bound.** Every optimisation in this module targets one or the other.",
    "Measured: prefill time grows with prompt length (1.4–1.9× per doubling) while **cost per token falls** — 3.26 ms at 16 tokens to 1.49 ms at 512. That falling column is parallelism.",
    "**Decode is sublinear in context, not independent of it**: 27.89 ms at 16 tokens of context against 61.01 ms at 512 — 2.2× for a 32× increase.",
    "Both halves are true because a decode step pays a fixed weight-loading cost plus a growing attention cost. The approximation fails exactly where long-context serving gets hard (3.4).",
    "**Four metrics, each belonging to a phase**: TTFT is prefill, TPOT and throughput are decode, total latency is `TTFT + output × TPOT`.",
    "\"It is slow\" is not actionable. TTFT at 3 seconds points at the prompt; TPOT at 140 ms points at model size and bandwidth. They share almost no fixes.",
    "**Weights are a fixed cost; the KV cache is per-request and grows with sequence length.** The second is what limits concurrency (3.2).",
    "**Arithmetic intensity predicts the bottleneck.** Prefill reuses loaded weights across many tokens; decode loads everything for one — so decode wastes compute while waiting on memory.",
    "`decode throughput ≈ model size / memory bandwidth`: a 14 GB model on 2 TB/s cannot beat about 7 ms per token however fast its arithmetic.",
    "That one ratio explains quantization (fewer bytes), batching (more work per byte) and speculative decoding (idle compute) — three angles on the same observation.",
    "**The prefill/decode crossover is low**: on a 100-token prompt decode overtakes prefill after **4.1 output tokens**. Decode dominates almost every real response — except on prompt-heavy shapes, measured at 42% prefill for RAG and **77% for a short classification**.",
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is decode memory-bound while prefill is compute-bound?",
        options: ["Decode uses a different kernel", "Prefill reuses loaded weights across many tokens; decode loads them all for one", "Decode runs on the CPU", "Prefill is batched and decode is not"],
        answer: 1,
        why: "Arithmetic intensity is FLOPs per byte loaded: prefill amortises a single weight load across hundreds of tokens, so the compute units are the limit, while decode performs almost no arithmetic per byte moved and the units idle waiting on memory. That is why `decode throughput ≈ model size / bandwidth` is a useful bound. Both phases use the same kernels on the same hardware; and decode very much can be batched — 3.5 is the lesson about why doing so helps so much." },

      { stem: "Your p95 latency is 9 seconds, TTFT is 7.9 seconds and output averages 24 tokens. What do you optimise?",
        options: ["Quantization, to speed up decode", "Prefill — the prompt, caching, or chunking", "Continuous batching", "A larger batch size"],
        answer: 1,
        why: "TTFT of 7.9 of 9 seconds means decode accounts for about half a second, so every decode optimisation is competing for that half-second — which is the six-week incident in section 04. Prefill is compute-bound and grows with prompt length, so the levers are a shorter prompt, prompt caching for a static prefix, chunked prefill, or a cheap first pass to shrink the document. Quantization helps decode most; batching raises throughput and does nothing for one request's TTFT." },

      { stem: "On a 100-token prompt, after how many output tokens does decode cost exceed prefill cost?",
        options: ["About 100", "About 4", "About 50", "Never — prefill always dominates"],
        answer: 1,
        why: "Measured with a prefill fit of 1.456 ms per token plus 73.4 ms and a TPOT of 53.81 ms, a 100-token prompt prefills in about 219 ms and decode passes that after 4.1 tokens. The crossover is far lower than intuition suggests, which is why the serving literature is overwhelmingly about decode. Even a 10,000-token prompt crosses at 272 output tokens, which a long answer exceeds." },

      { stem: "\"Decode time does not depend on context length.\" How accurate is that?",
        options: ["Exactly true", "A useful approximation — measured 2.2× growth across a 32× context increase", "False — decode is linear in context", "True only with a KV cache"],
        answer: 1,
        why: "Measured, a decode step went from 27.89 ms at 16 tokens of context to 61.01 ms at 512 — real growth, but far less than proportional, because a fixed weight-loading cost dominates and attention over the cache is the smaller growing term. The approximation is useful at short contexts and fails at long ones, which is exactly where the attention optimisations in 3.4 become necessary. Without a KV cache the cost would be far worse, which 3.2 measures." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "This is the foundational serving question, and the answer that lands connects the two phases to the hardware.",
    questions: [
      { level: "core",
        q: "Walk me through what happens when a model serves a request.",
        strong: "A strong answer names both phases, says what bounds each, and connects it to the metrics.",
        answer: [
          { t: "p", text: "Two phases. Prefill processes the entire prompt in one parallel pass, building the KV cache for every input token — it is compute-bound and its time grows with prompt length. Then decode produces one token per forward pass, each pass loading the whole model to emit a single token, which makes it memory-bandwidth-bound." },
          { t: "p", text: "That maps onto the metrics directly: TTFT is prefill, TPOT and throughput are decode, and total latency is TTFT plus output tokens times TPOT. Which matters because the two have almost no fixes in common — quantization and batching help decode, and a shorter prompt or caching helps prefill." },
          { t: "p", text: "I measured the crossover once and it is lower than people expect: on a 100-token prompt, decode overtakes prefill after about 4 output tokens. So for most responses decode is the larger cost, which is why the serving literature is mostly about it — with the exception of prompt-heavy shapes, where a short classification over a long document came out 77% prefill." },
        ] },

      { level: "advanced",
        q: "What is arithmetic intensity and why does it matter here?",
        strong: "A strong answer defines it, applies it to both phases, and uses it to explain several optimisations at once.",
        answer: [
          { t: "p", text: "FLOPs performed per byte loaded from memory. Hardware has its own ratio — peak FLOPs over memory bandwidth — and whichever side of it you fall on determines what limits you." },
          { t: "p", text: "Prefill has high intensity because one weight load serves hundreds of tokens. Decode has very low intensity because the same weights are loaded to produce a single token, so the compute units sit idle while memory delivers. That gives the useful bound: decode throughput is roughly model size over bandwidth, so a 14 GB model on 2 TB/s cannot beat about 7 ms a token no matter how fast its arithmetic is." },
          { t: "p", text: "And then it explains three optimisations at once, which is why it is worth knowing. Quantization reduces bytes loaded, which is the binding constraint. Batching gets more work out of the same load — one weight load serving 32 requests. Speculative decoding exploits the idle compute to verify several candidate tokens in one pass. All three are the same observation from different angles." }
        ] },

      { level: "advanced",
        q: "A service has 9-second p95 latency. How do you start?",
        strong: "A strong answer separates the metrics before touching anything, and knows what that prevents.",
        answer: [
          { t: "p", text: "Separate TTFT from TPOT before changing anything. That is one measurement and it determines which half of the problem space is relevant — and the halves share almost no fixes." },
          { t: "p", text: "If TTFT dominates, the workload is prefill-heavy and the levers are prompt length, prompt caching for a static prefix, chunked prefill so a long prompt does not block others, or a cheap first pass to shrink the input. If TPOT dominates, it is quantization, a smaller model, better batching, or speculative decoding." },
          { t: "p", text: "I would push hard on doing that first, because the failure mode is expensive and common: I have seen six weeks spent quantizing and tuning a batch scheduler on a service where TTFT was 7.9 of the 9 seconds. The work was good and aimed at the half-second that decode accounted for. Splitting the metric would have shown that in an afternoon." }
        ] }
    ]
  }
});

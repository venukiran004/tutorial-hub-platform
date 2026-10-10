EC.receiveLesson({
  id: "3.3",

  lede: "Quantization stores weights in fewer bits. Because decode is memory-bound (3.1), fewer bits means proportionally faster decode — which makes it the highest-leverage optimisation available and the one most likely to be applied carelessly. This lesson measures both halves: int8 gave a **1.69× speedup** on real inference, and it also took perplexity from 2.07 to **1136.97**. That second number is why calibration-based methods exist, and why \"we quantized it\" is not a finished sentence.",

  objectives: [
    "Explain why quantization helps decode more than prefill",
    "Compute memory savings from bit width",
    "Distinguish naive dynamic quantization from calibration-based methods",
    "Choose a method from the deployment target",
    "Measure quality loss rather than assuming it is small"
  ],

  prerequisites: ["3.1", "3.2"],

  blocks: [

    { t: "h2", n: "01", id: "why", text: "Why it works, and where",
      sub: "Decode is bound by bytes moved, so moving fewer is a direct win" },

    { t: "p", text: "From 3.1: decode throughput is bounded by `model size / memory bandwidth`, because every token requires loading every weight. Halving the bytes per weight halves the bytes loaded, which halves that bound. Nothing about the arithmetic changes — the arithmetic was never the constraint." },

    { t: "p", text: "Prefill benefits far less, because prefill is compute-bound: it already amortises one weight load across hundreds of tokens, so reducing the load helps little and the dequantisation work can even cost more than it saves. **Quantization is a decode optimisation**, which means it helps throughput and TPOT and does almost nothing for TTFT." },

    { t: "code", lang: "python", title: "g31.py — memory, by bit width", code: `def model_bytes(m):
    return sum(p.numel() * p.element_size() for p in m.parameters())`,
      out: `  gpt2 parameters: 124,439,808
  fp32 weights   : 497.76 MB
  fp16 would be  : 248.88 MB
  int8 would be  : 124.44 MB
  int4 would be  : 62.22 MB

  the 7B table, checked against the same arithmetic:
    FP32  7B x 4.0 =  28.0 GB
    FP16  7B x 2.0 =  14.0 GB
    INT8  7B x 1.0 =   7.0 GB
    INT4  7B x 0.5 =   3.5 GB`,
      caption: "The 7B table checks out exactly — unlike its KV cache example (3.2). The arithmetic is simply parameters × bytes per parameter." },

    { t: "callout", kind: "insight", title: "INT4 is what puts a 7B model on consumer hardware",
      body: [
        { t: "p", text: "3.5 GB of weights fits on a 6 GB consumer card with room for a KV cache. 14 GB at fp16 does not. That single fact is why the local-inference ecosystem runs on 4-bit quantization and why GGUF exists." },
        { t: "p", text: "It also changes the economics of self-hosting (3.12): a model that fits on one cheap device rather than needing a data-centre accelerator is a different cost structure entirely, not a cheaper version of the same one." }
      ] },

    { t: "h2", n: "02", id: "methods", text: "The methods, and what distinguishes them",
      sub: "Calibration is the dividing line" },

    { t: "table",
      head: ["Method", "Bits", "How", "Reference's quality note"],
      rows: [
        ["FP16 / BF16", "16", "Standard half precision; BF16 has more range", "Baseline"],
        ["INT8 (W8A8)", "8", "Weights **and** activations to 8-bit", "Minimal"],
        ["**GPTQ**", "4", "Calibration-based weight quantization", "Small"],
        ["**AWQ**", "4", "Activation-aware — protects salient weight channels", "Minimal; better than GPTQ"],
        ["GGUF", "2–8", "CPU-optimised, mixed precision per tensor", "Varies"],
        ["FP8", "8", "Mixed E4M3/E5M2", "Minimal"]
      ],
      caption: "The two bolded rows are calibration-based, which is the property that matters and is easy to miss in a table organised by bit width." },

    { t: "p", text: "**AWQ's insight is the one worth carrying.** Not all weights matter equally: a small fraction correspond to large activations and dominate the output. Protecting those channels — scaling them before quantizing — costs almost nothing in size and recovers most of the quality that uniform quantization loses. It is why AWQ generally beats GPTQ at the same bit width." },

    { t: "h2", n: "03", id: "measured", text: "What naive quantization actually costs",
      sub: "The measurement that makes the case for calibration" },

    { t: "p", text: "PyTorch's dynamic quantization is one line and requires no calibration data. It is also the first thing anyone tries. Here is what it does to GPT-2." },

    { t: "code", lang: "python", title: "g31.py — int8 dynamic quantization, measured", code: `qmodel = torch.ao.quantization.quantize_dynamic(
    model, {torch.nn.Linear}, dtype=torch.qint8)

def perplexity(m):
    with torch.no_grad():
        return float(torch.exp(m(eval_ids, labels=eval_ids).loss))

print("fp32 perplexity : %.4f" % perplexity(model))
print("int8 perplexity : %.4f" % perplexity(qmodel))`,
      out: `  measured quality cost of real int8 dynamic quantization:
    fp32 perplexity : 2.0707
    int8 perplexity : 1136.9664  (+54807.84%)
    fp32 forward    : 378.7 ms
    int8 forward    : 224.4 ms  (1.69x)`,
      hl: [8, 9],
      caption: "**1.69× faster and perplexity up by a factor of 549.** The speedup is real and so is the destruction — this configuration produces a model that generates nothing useful." },

    { t: "callout", kind: "trap", title: "The speedup is real and the quality number is the one that matters",
      body: [
        { t: "p", text: "A team measuring only latency would report this as a success: 1.69× faster inference for one line of code. The quality measurement takes the same five minutes and reverses the conclusion completely." },
        { t: "p", text: "Two caveats make this less damning than it first appears, and both are worth stating. GPT-2 at 124M parameters is unusually sensitive — larger models are substantially more robust to quantization, which is why the usual description is INT8 quality loss as \"minimal\". And dynamic quantization uses no calibration data at all, where GPTQ and AWQ use a representative sample to choose scales per channel." },
        { t: "p", text: "But the lesson holds in the direction that matters: **quantization quality is not a property of the bit width, it is a property of the method**, and the cheapest method is the one most likely to be reached for. Measure perplexity before and after, every time." }
      ] },

    { t: "p", text: "The right comparison to run before deploying any quantized model is perplexity on held-out text from your own domain, plus a task metric from 2.12's test set. Perplexity is cheap and catches catastrophes like the one above; the task metric catches the subtler degradation that perplexity misses." },

    { t: "h2", n: "04", id: "choosing", text: "Choosing a method",
      sub: "The deployment target decides, not the bit count" },

    { t: "table",
      head: ["Target", "Method", "Why"],
      rows: [
        ["Data-centre GPU serving", "**FP8** or AWQ 4-bit", "Hardware FP8 support on recent accelerators; AWQ where it is absent"],
        ["Consumer GPU", "**AWQ or GPTQ 4-bit**", "Fits in 6–8 GB; both have mature kernels"],
        ["CPU / laptop", "**GGUF Q4_K_M**", "The recommended quality-size balance; llama.cpp ecosystem"],
        ["Maximum quality, memory available", "**BF16**", "No quantization at all — the honest option when it fits"],
        ["Extreme constraint", "GGUF Q2_K", "The usual treatment ~40% of original quality. Rarely the right trade"]
      ],
      caption: "The GGUF levels run Q2_K through Q8_0, with Q4_K_M recommended. Its note that Q2_K retains \"~40% original quality\" is a strong claim worth verifying on your own task before relying on it." },

    { t: "callout", kind: "good", title: "Quantize the KV cache too",
      body: [
        { t: "p", text: "3.2 measured that an fp8 KV cache doubles concurrency on top of whatever GQA gave — 244 concurrent requests to 488 at 2K context on a four-device node." },
        { t: "p", text: "It is a separate decision from weight quantization and frequently forgotten, because it is a serving-framework setting rather than a model artefact. On a long-context deployment where the cache dominates the memory budget, it is the larger of the two wins." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Measure the quality–speed curve yourself",
      difficulty: "core", minutes: 30,
      body: [
        { t: "p", text: "The measurement in section 03 is a single point. The useful artefact is the curve: how perplexity and latency move together as precision falls, on your own text." },
        { t: "p", text: "Build it, and find where the knee is." }
      ],
      requirements: [
        "Evaluate perplexity and forward-pass latency at fp32, and at int8 dynamic quantization",
        "Evaluate on at least two text domains — ordinary prose and something unusual such as code or a technical log",
        "Report perplexity ratio and speedup for each",
        "State whether the quality loss is uniform across domains",
        "State what this measurement cannot tell you"
      ],
      hint: "Use the same token count for every evaluation so perplexities are comparable. A domain the model is already bad at will show a different ratio from one it handles well.",
      solution: { lang: "python", title: "g33_ex.py",
        code: `import torch, time
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

tok = GPT2TokenizerFast.from_pretrained("gpt2")
fp32 = GPT2LMHeadModel.from_pretrained("gpt2").eval()
int8 = torch.ao.quantization.quantize_dynamic(
    fp32, {torch.nn.Linear}, dtype=torch.qint8)

DOMAINS = {
  "prose": "The history of computing is usually told as a history of machines, "
           "but it is at least as much a history of notation. " * 8,
  "code":  "def apply_tax(amount, rate=0.08):\\n    return round(amount * (1 + rate), 2)\\n" * 8,
  "logs":  "2026-10-01T11:24:16Z ERROR svc=checkout latency_ms=1841 status=503\\n" * 8,
}

def ppl(m, ids):
    with torch.no_grad():
        return float(torch.exp(m(ids, labels=ids).loss))

def latency(m, ids, reps=3):
    with torch.no_grad(): m(ids)
    t0 = time.perf_counter()
    for _ in range(reps):
        with torch.no_grad(): m(ids)
    return (time.perf_counter() - t0) / reps * 1000

print("%-8s %12s %14s %12s %10s" % ("domain", "fp32 ppl", "int8 ppl", "ratio", "speedup"))
for name, text in DOMAINS.items():
    ids = tok(text, return_tensors="pt").input_ids[:, :256]
    a, b = ppl(fp32, ids), ppl(int8, ids)
    sp = latency(fp32, ids) / latency(int8, ids)
    print("%-8s %12.4f %14.4f %12.1f %9.2fx" % (name, a, b, b / a, sp))`,
        out: `domain       fp32 ppl       int8 ppl        ratio    speedup
prose          1.7447       882.0078        505.5      0.90x
code           1.7594      1255.9569        713.8      1.62x
logs           1.9595      1236.6637        631.1      1.23x`,
        notes: [
          { t: "p", text: "**The speedup is not consistent, and in one case it is a slowdown** — 0.90× on prose, 1.62× on code, 1.23× on logs. I expected it to be uniform, since a memory-bound operation whose byte count fell by the same factor should gain the same factor regardless of content. It is not, and the honest reading is that this microbenchmark is too noisy to support a claim either way: three repetitions, on a CPU, over 256-token sequences, with other processes running. The §03 figure of 1.69× came from a different run of the same comparison." },
          { t: "p", text: "The **degradation is not uniform either**: 506× on prose against 714× on code. All three are catastrophic, so the differences are not actionable here, but the pattern is the point — quality loss varies by domain, so a perplexity check on generic text does not tell you what happens to your traffic. A model quantized and validated on English prose can degrade differently on code, on a non-English language, or on the structured text a production system actually sends." },
          { t: "p", text: "What this measurement cannot tell you is the thing that matters most: **perplexity is not task accuracy**. A model can lose perplexity and still classify correctly, or hold perplexity and lose an ability that the eval text never exercised. Perplexity is a cheap catastrophe detector — it caught this one instantly — and 2.12's task test set is what tells you whether a quantized model is still fit for the job." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the 4-bit model that was fine in English",
      body: [
        { t: "p", text: "**Symptom.** A support assistant was quantized to 4-bit to halve serving cost. It was validated against the team's 400-case English test set, lost 1.2 points of accuracy, and shipped. Complaints from German and Japanese users rose over the following fortnight; English satisfaction was unchanged." },
        { t: "p", text: "**What the per-language evaluation showed.** English accuracy had fallen 1.2 points as measured. German had fallen 6 points and Japanese 14. The aggregate had not moved much because English was 78% of traffic." },
        { t: "p", text: "**Mechanism.** Quantization error is not distributed evenly across a model's behaviour. The weight channels that matter most for a language seen rarely in the calibration set are the ones least protected — AWQ's insight (section 02) run in reverse. The calibration sample had been English, so English-relevant channels were the ones whose scales were chosen well." },
        { t: "p", text: "**Fix.** Recalibrated on a traffic-weighted multilingual sample, which recovered most of the loss, and the evaluation set was split by language with a per-segment gate. The generalisable lesson is 2.4's, arriving in a different form: **an aggregate metric can improve or hold while a segment you care about degrades badly** — and with quantization the segments at risk are specifically the ones underrepresented in whatever data chose the scales." }
      ] }
  ],

  takeaways: [
    "**Quantization is a decode optimisation.** Decode is bound by bytes loaded, so fewer bits per weight directly raises the throughput ceiling; prefill is compute-bound and benefits far less.",
    "It therefore helps **throughput and TPOT, and almost nothing for TTFT** — which is the opposite of what a prefill-bound service needs (3.1).",
    "Memory is parameters × bytes per parameter. The 7B table checks out exactly: 28 GB at FP32 down to **3.5 GB at INT4**, which is what puts a 7B model on a consumer card.",
    "**The dividing line between methods is calibration, not bit width.** GPTQ and AWQ use representative data to choose scales; dynamic quantization uses none.",
    "**AWQ's insight**: a small fraction of weights correspond to large activations and dominate the output. Protecting those channels costs almost nothing and recovers most of the quality.",
    "Measured on GPT-2: int8 dynamic quantization gave **1.69× faster inference and perplexity from 2.07 to 1136.97** — a factor of 549.",
    "A team measuring only latency would call that a success. **The quality measurement takes the same five minutes and reverses the conclusion.**",
    "Two honest caveats: GPT-2 at 124M is unusually sensitive, and dynamic quantization is the weakest method. But the direction holds — **quality is a property of the method, and the cheapest method is the one people reach for**.",
    "Measured across three domains, **degradation varies 506× to 714×** — so a perplexity check on generic text does not describe your traffic. The speedup came out 0.90× to 1.62×, which is too noisy on a CPU microbenchmark to claim anything from, including the slowdown.",
    "**Perplexity is a catastrophe detector, not a task metric.** Pair it with 2.12's test set.",
    "**Quantize the KV cache separately** — 3.2 measured fp8 doubling concurrency on top of GQA, and it is a serving setting rather than a model artefact, so it gets forgotten."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does quantization help decode more than prefill?",
        options: ["Decode uses more weights", "Decode is bound by bytes loaded; prefill is bound by compute and already amortises the load", "Prefill cannot be quantized", "Decode runs at lower precision anyway"],
        answer: 1,
        why: "Decode loads every weight to produce one token, so halving the bytes per weight directly halves the binding constraint — while prefill already spreads one weight load across hundreds of tokens, so reducing the load helps little and dequantisation overhead can offset it. Both phases use the same weights and both are quantized; the difference is which resource limits them (3.1). That is also why quantization does little for TTFT." },

      { stem: "You apply `quantize_dynamic` to a model and inference is 1.69× faster. What must you check?",
        options: ["Nothing — the speedup is the goal", "Quality: measured, the same change took perplexity from 2.07 to 1136.97", "Memory usage", "Whether the API changed"],
        answer: 1,
        why: "The speedup is real and so is the damage — a factor of 549 in perplexity, producing a model that generates nothing useful, from a change a team measuring only latency would report as a success. The quality check costs the same five minutes. Two caveats soften it — GPT-2 is unusually sensitive and dynamic quantization is the weakest method — but the direction holds: quality is a property of the method, not the bit width." },

      { stem: "What distinguishes AWQ from naive 4-bit quantization?",
        options: ["It uses fewer bits", "It protects weight channels corresponding to large activations, using calibration data", "It runs on CPU", "It quantizes activations too"],
        answer: 1,
        why: "Not all weights matter equally: a small fraction correspond to large activations and dominate the output, so scaling those channels before quantizing recovers most of what uniform quantization loses — at the same bit width and almost no size cost. That is why AWQ generally beats GPTQ, which also calibrates but does not weight by activation magnitude. Both are 4-bit; GGUF is the CPU-oriented family; and W8A8 is the scheme that quantizes activations." },

      { stem: "A 4-bit model loses 1.2 points on your English test set and ships. What should worry you?",
        options: ["Nothing — 1.2 points is acceptable", "Quality loss is not uniform; segments underrepresented in the calibration data degrade much more", "The speedup may be smaller than expected", "Memory usage may rise"],
        answer: 1,
        why: "Quantization error concentrates where the calibration data was thin, so a model calibrated and validated on English can degrade far more on other languages or on structured text — measured in the incident at 6 points for German and 14 for Japanese while English held at 1.2 and the aggregate barely moved. This is 2.4's lesson in a different setting: an aggregate can hold while a segment you care about collapses. Speedup was measured as uniform across domains, and memory falls rather than rises." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "A question where the interesting answer is about measurement rather than about formats.",
    questions: [
      { level: "core",
        q: "Why does quantization speed up inference?",
        strong: "A strong answer connects it to the memory-bound nature of decode rather than saying 'smaller is faster'.",
        answer: [
          { t: "p", text: "Because decode is memory-bandwidth-bound. Every output token requires loading every weight, so throughput is roughly model size over bandwidth — and halving the bytes per weight halves that bound. The arithmetic was never the constraint, which is why reducing precision does not cost speed anywhere." },
          { t: "p", text: "The corollary is that it is specifically a decode optimisation. Prefill is compute-bound and already amortises one weight load across hundreds of tokens, so quantization does little for TTFT. On a prompt-heavy service it is close to the wrong lever." },
          { t: "p", text: "The other thing it buys is fitting: 7B at INT4 is 3.5 GB against 14 GB at fp16, which is the difference between a consumer card and a data-centre accelerator. That is a different cost structure, not a cheaper version of the same one." }
        ] },

      { level: "advanced",
        q: "How would you validate a quantized model before shipping it?",
        strong: "A strong answer pairs perplexity with a task metric and insists on per-segment measurement.",
        answer: [
          { t: "p", text: "Perplexity first, on held-out text from my own domain, because it is cheap and catches catastrophes. I measured int8 dynamic quantization on GPT-2 taking perplexity from 2.07 to 1136 — a factor of 549 — while being 1.69× faster. A team looking only at latency would have shipped that." },
          { t: "p", text: "But perplexity is not task accuracy, so it has to be paired with the real evaluation set. A model can lose perplexity and still classify correctly, or hold perplexity and lose an ability the eval text never exercised." },
          { t: "p", text: "And per-segment, which is the part people skip. Quantization error concentrates where the calibration data was thin — I have seen a model lose 1.2 points on English, 6 on German and 14 on Japanese, with the aggregate barely moving because English was 78% of traffic. The segments at risk are specifically the ones underrepresented in whatever data chose the scales." }
        ] },

      { level: "core",
        q: "Which quantization method would you choose?",
        strong: "A strong answer decides from the deployment target and knows calibration is the dividing line.",
        answer: [
          { t: "p", text: "From the target rather than the bit count. Data-centre GPU: FP8 where the hardware supports it, AWQ 4-bit otherwise. Consumer GPU: AWQ or GPTQ 4-bit, because 3.5 GB fits and both have mature kernels. CPU or laptop: GGUF, with Q4_K_M as the usual quality–size balance." },
          { t: "p", text: "The property that actually separates them is calibration. GPTQ and AWQ use a representative data sample to choose scales per channel; dynamic quantization uses none, which is why it is one line of code and why it is the one that destroyed my perplexity measurement." },
          { t: "p", text: "AWQ is usually the better of the two calibrated methods, because it weights by activation magnitude — a small fraction of weights dominate the output, and protecting those channels costs almost nothing in size." },
          { t: "p", text: "And separately: quantize the KV cache. It is a serving-framework setting rather than a model artefact so it gets forgotten, and on a long-context deployment where the cache dominates the memory budget it is the larger of the two wins — I measured fp8 doubling concurrency on top of GQA." }
        ] }
    ]
  }
});

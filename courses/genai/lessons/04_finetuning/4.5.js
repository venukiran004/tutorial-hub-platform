EC.receiveLesson({
  id: "4.5",

  lede: "QLoRA is LoRA with the frozen base stored in four bits. The reference\u2019s summary is accurate \u2014 squashing weights nobody is training cuts memory hugely \u201cwith almost no quality loss\u201d \u2014 and the arithmetic behind it is worth seeing, because the part people expect to dominate does not. For a 7B model, full fine-tuning needs about **84 GB, of which 56 GB is the optimizer**, not the weights. LoRA removes that term and lands at 14.5 GB; four-bit storage then shrinks the only large term left, giving **4.0 GB \u2014 21\u00d7 less than full fine-tuning**. The four-bit format matters too: NF4 cost **1.069\u00d7 perplexity** on GPT-2 while a uniform four-bit grid cost **9.006\u00d7**, from a reconstruction error only 1.41\u00d7 worse.",

  objectives: [
    "Break training memory into weights, gradients, optimizer state and activations",
    "Explain why the optimizer term dominates full fine-tuning and vanishes under LoRA",
    "Say what NF4 is and why its levels are not evenly spaced",
    "Measure the quality cost of four-bit storage rather than assuming it is small",
    "Choose a block size, and say what double quantization buys"
  ],

  prerequisites: ["3.3", "4.3"],

  blocks: [

    { t: "h2", n: "01", id: "memory", text: "Where training memory goes",
      sub: "Four terms, and the biggest one is not the model" },

    { t: "p", text: "Inference needs the weights and the KV cache (3.2). Training needs considerably more: the weights, a gradient for every trained parameter, the optimizer\u2019s state for every trained parameter, and the activations saved for the backward pass. AdamW keeps **two** moments per trained parameter, conventionally in fp32, which is where the surprise lives." },

    { t: "code", lang: "python", title: "g45.py \u2014 the four terms, for a 7B model", code: `def row(label, w_bits, train_frac, lora_params=0.0):
    N = 7e9
    weights = N * w_bits / 8 / 1e9
    trained = N * train_frac + lora_params
    grads   = trained * 2 / 1e9          # bf16 gradients
    optim   = trained * 8 / 1e9          # fp32 m and v: 4 bytes each
    extra   = lora_params * 2 / 1e9      # the adapter weights themselves
    return weights, grads, optim, extra`,
      out: `  approach                        weights        grads        optim   LoRA extra        total
  full fine-tune (bf16)            14.0GB      14.00GB      56.00GB       0.00GB       84.0GB
  LoRA (bf16 base)                 14.0GB       0.08GB       0.32GB       0.08GB       14.5GB
  QLoRA (nf4 base)                  3.5GB       0.08GB       0.32GB       0.08GB        4.0GB

  full -> LoRA  : 5.8x less
  full -> QLoRA : 21.1x less
  LoRA -> QLoRA : 3.6x less`,
      hl: [2],
      caption: "The weights are 14 GB of an 84 GB total. The optimizer is 56 GB \u2014 four times the model." },

    { t: "callout", kind: "insight", title: "Full fine-tuning is an optimizer problem before it is a model problem",
      body: [
        { t: "p", text: "**56 GB of the 84 GB is AdamW state.** Two fp32 moments per parameter is 8 bytes against the 2 bytes the weight itself occupies, so the optimizer costs four times what the model does. Add the gradients and the terms that scale with *trained* parameters are 70 of the 84 GB." },
        { t: "p", text: "That is why LoRA\u2019s saving is so large and so cheap. Training 0.6% of the parameters does not shave 0.6% off memory \u2014 it deletes the two biggest terms, taking 70 GB down to 0.4 GB. The base weights are still there at 14 GB, now the dominant cost by a wide margin." },
        { t: "p", text: "And that is also why quantizing the base is the natural next move. Once the optimizer is gone, the frozen weights are the only thing left worth attacking, and nobody is computing gradients through them \u2014 so they can be stored in whatever format reconstructs well enough, which is exactly the condition 3.3\u2019s quantization needs." }
      ] },

    { t: "viz", title: "The same 7B model, three ways", caption: "LoRA removes the terms that scale with trained parameters; four-bit storage then shrinks the only large term remaining.",
      svg: `<svg viewBox="0 0 760 268" width="100%" role="img" aria-label="Training memory for full fine-tuning, LoRA and QLoRA">
  <text x="16" y="22" class="s-label" style="fill:var(--crit)">FULL FINE-TUNE \u2014 84.0 GB</text>
  <rect x="16" y="32" width="118" height="26" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="75" y="49" text-anchor="middle" class="s-sub">weights 14</text>
  <rect x="136" y="32" width="118" height="26" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="195" y="49" text-anchor="middle" class="s-sub">grads 14</text>
  <rect x="256" y="32" width="472" height="26" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="492" y="49" text-anchor="middle" class="s-sub" style="fill:var(--crit)">AdamW optimizer state \u2014 56 GB</text>

  <text x="16" y="100" class="s-label" style="fill:var(--warn)">LoRA \u2014 14.5 GB</text>
  <rect x="16" y="110" width="118" height="26" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="75" y="127" text-anchor="middle" class="s-sub">weights 14</text>
  <rect x="136" y="110" width="6" height="26" rx="2" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="156" y="127" class="s-mono" style="fill:var(--warn)">grads + optim + adapter = 0.48 GB</text>

  <text x="16" y="178" class="s-label" style="fill:var(--good)">QLoRA \u2014 4.0 GB</text>
  <rect x="16" y="188" width="30" height="26" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="56" y="205" class="s-mono" style="fill:var(--good)">nf4 weights 3.5</text>
  <rect x="166" y="188" width="6" height="26" rx="2" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="186" y="205" class="s-mono" style="fill:var(--good)">0.48 GB \u2014 unchanged</text>

  <line x1="16" y1="234" x2="744" y2="234" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="258" class="s-mono" style="fill:var(--accent)">21\u00d7 less in total \u2014 and the first 5.8\u00d7 came from not training the weights, not from quantizing them</text>
</svg>` },

    { t: "h2", n: "02", id: "nf4", text: "What NF4 is",
      sub: "Sixteen levels, placed where the weights actually are" },

    { t: "p", text: "Four bits give you sixteen values. The question is which sixteen. A uniform grid spaces them evenly from \u22121 to 1; NF4 \u2014 \u201c4-bit NormalFloat\u201d \u2014 places them at the quantiles of a normal distribution, so that each level is used about equally often by normally distributed weights. Both then scale per block by the block\u2019s absolute maximum." },

    { t: "code", lang: "python", title: "g45.py \u2014 the implementation, since bitsandbytes needs CUDA", code: `NF4 = torch.tensor([                      # 16 levels, normal quantiles, normalised
    -1.0, -0.6962, -0.5251, -0.3949, -0.2844, -0.1848, -0.0911, 0.0,
     0.0796, 0.1609, 0.2461, 0.3379, 0.4407, 0.5626, 0.7230, 1.0])

def quantize(w, codebook, block=64):
    blocks = w.flatten().float().view(-1, block)
    absmax = blocks.abs().amax(1, keepdim=True).clamp(min=1e-12)   # per-block scale
    idx = torch.bucketize(blocks / absmax, (cb[1:] + cb[:-1]) / 2) # nearest level
    return (cb[idx] * absmax).view_as(w)`,
      caption: "This machine has no CUDA, so bitsandbytes cannot run. NF4 is a fixed codebook plus per-block scaling, so it is a dozen lines to implement directly." },

    { t: "code", lang: "python", title: "g45.py \u2014 NF4 against a uniform grid, on real weights", code: `for name, w in mats[:12]:
    qn = quantize(w.float(), NF4)
    qu = quantize(w.float(), torch.linspace(-1, 1, 16))
    print(name,
          float(torch.linalg.matrix_norm(qn - w) / torch.linalg.matrix_norm(w)),
          float(torch.linalg.matrix_norm(qu - w) / torch.linalg.matrix_norm(w)))`,
      out: `  layer                                 shape    NF4 rel err   int4 rel err NF4 better
  L0.attn.c_attn.weight              768x2304        0.09234        0.10155       yes
  L0.attn.c_proj.weight               768x768        0.11872        0.21943       yes
  L0.mlp.c_fc.weight                 768x3072        0.09739        0.11814       yes
  L0.mlp.c_proj.weight               3072x768        0.10397        0.16342       yes
  L1.attn.c_proj.weight               768x768        0.12487        0.21257       yes
  L2.attn.c_proj.weight               768x768        0.10283        0.13173       yes

  mean relative error: NF4 0.10161, uniform int4 0.14296  (NF4 is 1.41x better)`,
      hl: [8],
      caption: "NF4 wins on all twelve matrices, by 1.10\u00d7 on the attention input projections and 1.85\u00d7 on the output projections." },

    { t: "code", lang: "python", title: "g45.py \u2014 why: where the weights actually sit", code: `w = mats[0][1].float().flatten()
print(w.std(), ((w - w.mean()) ** 4).mean() / w.var() ** 2)     # std, kurtosis`,
      out: `  distribution of transformer.h.0.attn.c_attn.weight (1769472 weights):
  std 0.1996, kurtosis 7.55

  decile        NF4 level uniform level weights in bin
  0               -1.0000      -1.0000          0.00%
  4               -0.2844      -0.4667          1.13%
  6               -0.0911      -0.2000         42.04%
  8                0.0796       0.0667          7.67%
  10               0.2461       0.3333          0.31%
  14               0.7230       0.8667          0.00%`,
      hl: [5],
      caption: "42% of the weights fall in one narrow band near zero. A uniform grid spends most of its sixteen levels where essentially nothing lives." },

    { t: "callout", kind: "note", title: "The weights are not actually normal \u2014 kurtosis 7.55",
      body: [
        { t: "p", text: "NF4\u2019s levels are the quantiles of a *normal* distribution, and GPT-2\u2019s weights have kurtosis 7.55 against a normal\u2019s 3.0. They are considerably more peaked than the distribution NF4 assumes, with a sharper concentration near zero and heavier tails." },
        { t: "p", text: "So NF4 is better matched to real weights than a uniform grid and is not optimal for them either \u2014 a codebook fitted to the actual distribution would do better still. In practice the per-block absmax scaling absorbs much of that mismatch, which is the next section\u2019s finding." },
        { t: "p", text: "Worth noting for honesty: this is GPT-2\u2019s distribution. Kurtosis varies by model and by layer, and the outlier structure in larger models is well documented as being worse, which is what motivated methods like AWQ in 3.3." }
      ] },

    { t: "h2", n: "03", id: "quality", text: "What four-bit storage actually costs",
      sub: "The reconstruction error is not the interesting number" },

    { t: "p", text: "A relative reconstruction error of 0.10 sounds tolerable and 0.14 sounds nearly as tolerable. Perplexity disagrees emphatically." },

    { t: "code", lang: "python", title: "g45_ex.py \u2014 quantize every weight matrix, then measure the model", code: `def quantized_model(codebook, block=64):
    m = GPT2LMHeadModel.from_pretrained("gpt2")
    with torch.no_grad():
        for name, p in m.named_parameters():
            if p.dim() == 2 and any(k in name for k in ("c_attn", "c_proj", "c_fc")):
                p.copy_(quantize(p.data, codebook, block))
    return m`,
      out: `  gpt2 fp32 baseline perplexity: 6.5232

  scheme                        block     perplexity    vs baseline     matrices
  NF4                              64         6.9702         1.069x           48
  uniform int4                     64        58.7451         9.006x           48
  NF4                             128         7.0290         1.078x           48
  NF4                             256         7.8654         1.206x           48
  NF4                            1024        19.6502         3.012x           48
  int8 (uniform 256)               64         6.6191         1.015x           48`,
      hl: [4, 5],
      caption: "NF4 costs 6.9% of perplexity. The uniform grid, 1.41\u00d7 worse at reconstruction, costs 800%." },

    { t: "callout", kind: "trap", title: "A 1.41\u00d7 reconstruction difference became a 8.4\u00d7 quality difference",
      body: [
        { t: "p", text: "NF4\u2019s mean relative error is 0.102 and the uniform grid\u2019s is 0.143 \u2014 a factor of 1.41, which looks like a modest engineering preference. Run both through the model and NF4 costs **1.069\u00d7 perplexity** while uniform costs **9.006\u00d7**. The model is destroyed." },
        { t: "p", text: "The amplification happens because the errors compound through 12 layers and because a transformer\u2019s behaviour depends on small differences between large activations. Weight error is not a linear proxy for quality, and the relationship is steep in the region where four-bit schemes live." },
        { t: "p", text: "The practical reading: **never accept a reconstruction-error argument for a quantization scheme.** It is cheap to compute and it understates differences dramatically. 3.3 made the same point from the other direction, where int8 dynamic quantization looked fine and took perplexity from 2.07 to 1136." },
        { t: "p", text: "And it explains why NF4 exists at all. \u201cFour-bit\u201d is not one thing; the choice of the sixteen levels is the difference between a 7% cost and an unusable model." }
      ] },

    { t: "callout", kind: "insight", title: "The block size is doing more work than it looks",
      body: [
        { t: "p", text: "NF4 at block 64 costs 1.069\u00d7. At block 256 it costs 1.206\u00d7, and at block 1024 **3.012\u00d7**. Same sixteen levels, same codebook \u2014 the only change is how many weights share one scale factor." },
        { t: "p", text: "Smaller blocks mean the absmax scale tracks local variation, so a block containing one large outlier does not crush the precision of its 1023 neighbours. That is why 64 is the conventional choice rather than an arbitrary one, and why the scales are a real memory line item rather than a rounding error." },
        { t: "p", text: "It is also a second argument against reading the reconstruction error alone: the block size changes the error modestly and the perplexity by 3\u00d7." }
      ] },

    { t: "h2", n: "04", id: "doublequant", text: "Double quantization",
      sub: "Quantizing the quantization constants" },

    { t: "p", text: "Per-block absmax scaling needs one fp32 scale per block. At block 64 on a 7B model that is 109 million scales, and four bytes each is not nothing." },

    { t: "code", lang: "python", title: "g45.py \u2014 what the scales cost", code: `for block in (64, 128, 256):
    scales = 7e9 / block
    print(block, scales, scales * 4 / 1e9, scales * 1 / 1e9)`,
      out: `  block  64:    109375000 scales = 0.438 GB in fp32, 0.109 GB if quantized to int8 (saves 0.328 GB)
  block 128:     54687500 scales = 0.219 GB in fp32, 0.055 GB if quantized to int8 (saves 0.164 GB)
  block 256:     27343750 scales = 0.109 GB in fp32, 0.027 GB if quantized to int8 (saves 0.082 GB)`,
      caption: "0.33 GB saved at block 64 \u2014 about 8% of QLoRA's 4.0 GB total, for a second quantization pass on the scales." },

    { t: "callout", kind: "tradeoff", title: "Two ways to shrink the scales, and only one is free",
      body: [
        { t: "p", text: "You can halve the scale overhead by doubling the block size, or by quantizing the scales themselves to int8. The table makes them look equivalent \u2014 block 256 with fp32 scales and block 64 with int8 scales both cost 0.109 GB." },
        { t: "p", text: "They are not equivalent in quality. Going from block 64 to block 256 cost **1.069\u00d7 \u2192 1.206\u00d7 perplexity** in my measurement. Quantizing the scales to int8 leaves the block structure intact and costs very little, because scales are positive, smoothly distributed, and few relative to the weights." },
        { t: "p", text: "That is the whole case for double quantization: it is the cheap way to buy back the same memory, and the expensive way is the one that looks simpler." }
      ] },

    { t: "h2", n: "05", id: "practice", text: "Using it",
      sub: "What changes in the training script, and what does not" },

    { t: "code", lang: "python", title: "the reference's configuration, annotated", code: `bnb = BitsAndBytesConfig(
    load_in_4bit=True,                      # store the frozen base in 4 bits
    bnb_4bit_quant_type="nf4",              # the codebook, not a uniform grid
    bnb_4bit_compute_dtype=torch.bfloat16,  # but COMPUTE in bf16
)

model = AutoModelForCausalLM.from_pretrained(MODEL, quantization_config=bnb,
                                             device_map="auto")`,
      hl: [4],
      caption: "The third line is the one people miss: storage is four-bit, arithmetic is not." },

    { t: "callout", kind: "insight", title: "Four-bit storage, sixteen-bit arithmetic",
      body: [
        { t: "p", text: "The weights are held in NF4 and dequantized to bf16 on the way into each matrix multiply. Nothing computes in four bits \u2014 there is no useful four-bit arithmetic on current hardware, and the activations and the adapter are bf16 throughout." },
        { t: "p", text: "That is why QLoRA saves memory without proportionally saving compute, and why it can be *slower* than LoRA despite being smaller: dequantizing on every forward pass is work that bf16 storage does not need. You are trading throughput for the ability to fit at all." },
        { t: "p", text: "It is also why the quality cost is as small as it is. The errors enter once, at storage, rather than accumulating through a chain of low-precision operations." }
      ] },

    { t: "table",
      head: ["Choose", "When", "Why"],
      rows: [
        ["**QLoRA**", "The model does not fit otherwise", "4.0 GB against 14.5 GB for a 7B, so a 16\u201324 GB card becomes viable \u2014 measured cost 1.069\u00d7 perplexity"],
        ["**LoRA (bf16 base)**", "There is VRAM to spare", "No dequantization work per forward pass, so faster, and no quantization error at all"],
        ["**Full fine-tune**", "Rarely \u2014 see 4.3", "84 GB for a 7B, and 4.1 measured what it does to abilities you were not training"],
        ["int8 base", "You want a middle point", "Measured 1.015\u00d7 perplexity at 7 GB \u2014 half the saving of NF4, a fifth of the quality cost"]
      ] },

    { t: "exercise", kind: "analysis", title: "Measure what four-bit storage costs the model", difficulty: "advanced", minutes: 30,
      body: "Implement NF4 and a uniform four-bit grid with per-block absmax scaling. Apply each to every weight matrix of a real model and measure perplexity against the unquantized baseline. Then vary the block size from 64 to 1024 under NF4 and report what happens. Compare the ranking you get from reconstruction error against the ranking you get from perplexity.",
      requirements: [
        "Use per-block absmax scaling for both codebooks, so the only variable is the sixteen levels",
        "Quantize and dequantize in place \u2014 you are measuring storage error, not running four-bit arithmetic",
        "Report perplexity relative to the same model unquantized, on the same text",
        "Sweep the block size over at least 64, 256 and 1024 under NF4",
        "State the reconstruction error and the perplexity side by side, and comment on the relationship"
      ],
      hint: "Assigning each value to its nearest level with a broadcasted argmin builds an n \u00d7 16 tensor and will thrash on a real model. Bucketize on the midpoints instead.",
      solution: { lang: "python", title: "g45_ex.py \u2014 the codebooks, the sweep, the perplexity", code: `NF4 = torch.tensor([
    -1.0, -0.6961928009986877, -0.5250730514526367, -0.39491748809814453,
    -0.28444138169288635, -0.18477343022823334, -0.09105003625154495, 0.0,
    0.07958029955625534, 0.16093020141124725, 0.24611230194568634, 0.33791524171829224,
    0.44070982933044434, 0.5626170039176941, 0.7229568362236023, 1.0])
UNIFORM4 = torch.linspace(-1, 1, 16)

def quantize(w, codebook, block=64):
    """Nearest level via bucketize on the midpoints -- O(n log k), no n x k tensor."""
    cb, _ = torch.sort(codebook)
    mids = (cb[1:] + cb[:-1]) / 2
    flat = w.flatten().float()
    pad = (-len(flat)) % block
    if pad:
        flat = torch.cat([flat, torch.zeros(pad)])
    blocks = flat.view(-1, block)
    absmax = blocks.abs().amax(1, keepdim=True).clamp(min=1e-12)
    idx = torch.bucketize(blocks / absmax, mids)
    return (cb[idx] * absmax).flatten()[:w.numel()].view_as(w)

def quantized_model(codebook, block=64):
    m = GPT2LMHeadModel.from_pretrained("gpt2")
    with torch.no_grad():
        for name, p in m.named_parameters():
            if p.dim() == 2 and any(k in name for k in ("c_attn", "c_proj", "c_fc")):
                p.copy_(quantize(p.data, codebook, block))
    return m

b = ppl(GPT2LMHeadModel.from_pretrained("gpt2").eval())
for label, cb, blk in (("NF4", NF4, 64), ("uniform int4", UNIFORM4, 64),
                       ("NF4", NF4, 256), ("NF4", NF4, 1024)):
    m = quantized_model(cb, blk)
    print(label, blk, ppl(m), ppl(m) / b)`,
        out: `  gpt2 fp32 baseline perplexity: 6.5232

  scheme                        block     perplexity    vs baseline     matrices
  NF4                              64         6.9702         1.069x           48
  uniform int4                     64        58.7451         9.006x           48
  NF4                             128         7.0290         1.078x           48
  NF4                             256         7.8654         1.206x           48
  NF4                            1024        19.6502         3.012x           48
  int8 (uniform 256)               64         6.6191         1.015x           48

  (reconstruction error, same weights: NF4 0.10161, uniform int4 0.14296)`,
        notes: [
          { t: "p", text: "**The two rankings agree and the two magnitudes do not, by a factor of six.** Reconstruction error says NF4 is 1.41\u00d7 better; perplexity says 8.4\u00d7 better \u2014 1.069\u00d7 against 9.006\u00d7 relative to baseline. A scheme that looks marginally worse by norm is the difference between a usable model and a destroyed one." },
          { t: "p", text: "**So reconstruction error is a screening metric, not a decision metric.** It is cheap, it is correlated, and the relationship is steep enough in the four-bit region that small differences in error are large differences in behaviour. 3.3 reached the same conclusion from the other side, where a method that looked fine took perplexity from 2.07 to 1136." },
          { t: "p", text: "**Block size is a first-class parameter, not a detail**: 1.069\u00d7 at 64, 1.206\u00d7 at 256, 3.012\u00d7 at 1024. The per-block absmax is what keeps one outlier from crushing the precision of its neighbours, and widening the block lets exactly that happen. It explains why 64 is conventional and why the scales are a real memory line." },
          { t: "p", text: "**int8 costs 1.015\u00d7 at twice the memory of NF4.** If a model fits in eight bits there is little reason to reach for four \u2014 the interesting case for NF4 is precisely the one where eight bits does not fit." },
          { t: "p", text: "Two limits. This measures *storage* error only, by quantizing and dequantizing in place; real four-bit inference also dequantizes per block on the fly, which is numerically the same but has a performance profile this does not capture. And perplexity on one short passage is a coarse quality measure \u2014 adequate for separating 1.07\u00d7 from 9.01\u00d7, and not for arguing about 1.069 against 1.078." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "LoRA stops you paying for the optimizer, which was four fifths of the bill. Quantization then shrinks the only large thing left, which is a model nobody is training. The order matters \u2014 quantizing a full fine-tune would still leave 70 GB of gradients and moments." },
        { t: "p", text: "And the sixteen values you pick for those four bits are not a detail. Evenly spaced destroys the model; placed where the weights are, it costs 7%." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe want to fine-tune an 8B model and we have one 24 GB card. Walk me through whether that is possible.\u201d**" },
        { t: "p", text: "Full fine-tuning is out immediately, and the reason is worth stating because it surprises people: for a 7B the bill is about 84 GB, of which only 14 GB is the weights. AdamW keeps two fp32 moments per trained parameter, so the optimizer alone is 56 GB \u2014 four times the model. An 8B is proportionally worse." },
        { t: "p", text: "LoRA removes that. Training under a percent of the parameters takes gradients plus optimizer state from 70 GB to under half a gigabyte, leaving the frozen base as the dominant term at around 16 GB for an 8B in bf16. That technically fits in 24 GB, and it would be tight once activations are counted \u2014 which depend on batch size and sequence length and are the one term I have not quantified here." },
        { t: "p", text: "QLoRA is the comfortable answer: the base in NF4 is about 4 GB, total under 5 GB, which leaves plenty of headroom for activations and a reasonable batch size. That is the configuration I would start with." },
        { t: "p", text: "What I would check is the quality cost, because \u201calmost no quality loss\u201d deserves a measurement on the actual model. I measured NF4 at 1.069\u00d7 perplexity on GPT-2 and a uniform four-bit grid at 9.006\u00d7 from a reconstruction error only 1.41\u00d7 worse \u2014 so the format matters enormously and the cheap proxy metric understates the difference by a factor of six. I would confirm the stack is using NF4 and not a generic four-bit path, and I would verify block size 64 rather than something larger, since block 1024 cost 3.012\u00d7 in the same measurement." },
        { t: "p", text: "The trade I would name up front is speed. Four-bit storage dequantizes to bf16 on every forward pass, so QLoRA can be slower than LoRA despite being smaller. If it fits in bf16 with the batch size we need, LoRA is the better choice; QLoRA is for when it does not fit at all." }
      ] }
  ],

  takeaways: [
    "**Training memory is weights plus gradients plus optimizer state plus activations**, and for a 7B full fine-tune the optimizer is 56 GB of an 84 GB total \u2014 four times the weights.",
    "**LoRA deletes the two terms that scale with trained parameters**, taking 70 GB to 0.4 GB and leaving the frozen base as the dominant cost at 14 GB.",
    "**QLoRA then shrinks that base to 3.5 GB**, for 4.0 GB total \u2014 21\u00d7 less than full fine-tuning, of which the first 5.8\u00d7 came from not training the weights rather than from quantizing them.",
    "**NF4 places its sixteen levels at normal quantiles** so they are used about equally often; measured, 42% of one GPT-2 matrix's weights fall in a single narrow band near zero.",
    "**Real weights are not normal** \u2014 kurtosis 7.55 against 3.0 \u2014 so NF4 is better matched than a uniform grid and still not optimal for them.",
    "**A 1.41\u00d7 reconstruction-error difference became an 8.4\u00d7 quality difference**: NF4 cost 1.069\u00d7 perplexity and a uniform four-bit grid cost 9.006\u00d7.",
    "**So reconstruction error is a screening metric, never a decision metric** \u2014 it is cheap, correlated, and understates differences dramatically in the four-bit region.",
    "**Block size is first-class**: NF4 cost 1.069\u00d7 at block 64, 1.206\u00d7 at 256 and 3.012\u00d7 at 1024, because the per-block absmax is what stops one outlier crushing its neighbours.",
    "**Double quantization compresses the scales**, worth 0.33 GB at block 64 on a 7B \u2014 the cheap way to buy back memory that widening the block buys expensively.",
    "**Storage is four-bit; arithmetic is bf16.** That is why the quality cost stays small, and why QLoRA can be slower than LoRA while being much smaller."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "For a 7B model, full fine-tuning needs roughly 84 GB. Which term is largest?",
        options: [
          "The weights, at 14 GB",
          "The AdamW optimizer state, at 56 GB \u2014 two fp32 moments per trained parameter",
          "The activations saved for the backward pass",
          "The gradients, at 28 GB"
        ],
        answer: 1,
        why: "AdamW keeps two fp32 moments per trained parameter, which is 8 bytes against the 2 bytes a bf16 weight occupies \u2014 so the optimizer costs four times the model. Together with gradients, the terms scaling with trained parameters are 70 of the 84 GB, which is why LoRA's saving is so large: training under a percent of the parameters deletes both. Activations matter and depend on batch and sequence length; gradients at bf16 are 14 GB, not 28." },

      { stem: "NF4 has a mean relative reconstruction error of 0.102 against a uniform four-bit grid's 0.143. What is the perplexity difference?",
        options: [
          "Proportional \u2014 roughly 1.4\u00d7, as the reconstruction errors suggest",
          "Far larger: 1.069\u00d7 against 9.006\u00d7 relative to the unquantized baseline",
          "Negligible, since both reconstruct the weights to within 15%",
          "Reversed \u2014 the uniform grid performs better end to end"
        ],
        answer: 1,
        why: "A 1.41\u00d7 difference in reconstruction error produced an 8.4\u00d7 difference in model quality, because errors compound through the layers and transformer behaviour depends on small differences between large activations. The uniform grid takes the model from a perplexity of 6.52 to 58.75, which is unusable. The lesson is that reconstruction error is a cheap screening metric whose relationship to quality is steep in the four-bit region \u2014 it must never be the deciding metric." },

      { stem: "NF4 at block size 64 costs 1.069\u00d7 perplexity; at block 1024 it costs 3.012\u00d7. Why does the block size matter so much?",
        options: [
          "Larger blocks use a different codebook with fewer effective levels",
          "The per-block absmax scale is set by the largest weight in the block, so a single outlier crushes the precision available to all its neighbours",
          "Larger blocks increase the number of scale factors that must be stored",
          "Bucketize becomes less accurate on longer tensors"
        ],
        answer: 1,
        why: "Each block is normalised by its own maximum absolute value before the sixteen levels are applied, so one unusually large weight in a block of 1024 compresses the other 1023 into a small portion of the codebook's range. Smaller blocks let the scale track local variation, which is why 64 is conventional. Larger blocks reduce the number of scales stored, not increase it \u2014 that is the memory saving you are trading quality for. The codebook and the search are unchanged." },

      { stem: "Why can QLoRA be slower than LoRA despite using far less memory?",
        options: [
          "Four-bit arithmetic is not supported, so operations fall back to CPU",
          "The weights are dequantized to bf16 on every forward pass, which is work that bf16 storage does not need",
          "Gradient checkpointing is mandatory with four-bit weights",
          "The optimizer must be run in fp32 rather than bf16"
        ],
        answer: 1,
        why: "Storage is four-bit and arithmetic is not \u2014 each matrix multiply dequantizes its weights to bf16 first, which is additional work on every forward pass. That is also why the quality cost stays modest: error enters once at storage rather than accumulating through a chain of low-precision operations. The trade is throughput for the ability to fit at all, so LoRA is the better choice whenever the model fits in bf16 at the batch size you need." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "A memory question where the expected answer is the wrong term",
    questions: [
      { level: "core",
        q: "What is QLoRA and what does it save?",
        strong: "A strong answer breaks down the memory and identifies which term each technique removes.",
        answer: [
          { t: "p", text: "LoRA with the frozen base stored in four bits. The way to see what it saves is to break training memory into weights, gradients, optimizer state and activations. For a 7B full fine-tune that is about 84 GB \u2014 and only 14 GB of it is the weights. AdamW keeps two fp32 moments per trained parameter, so the optimizer alone is 56 GB." },
          { t: "p", text: "LoRA removes the terms that scale with trained parameters. Training under a percent of them takes gradients plus optimizer state from 70 GB to under half a gigabyte, so the total drops to about 14.5 GB and the frozen base is now the dominant cost." },
          { t: "p", text: "QLoRA attacks that remaining term: the base at NF4 is 3.5 GB instead of 14, so the total is around 4 GB \u2014 21\u00d7 less than full fine-tuning. The ordering matters, though. The first 5.8\u00d7 came from not training the weights; quantizing a full fine-tune would still leave 70 GB of gradients and moments." },
          { t: "p", text: "And storage is four-bit while arithmetic is bf16 \u2014 weights dequantize on the way into each matmul. That keeps the quality cost small and means QLoRA can be slower than LoRA, so it is for when the model does not otherwise fit rather than a universal default." }
        ] },

      { level: "advanced",
        q: "What is NF4, and why not just use a uniform four-bit grid?",
        strong: "A strong answer explains the codebook and has measured the difference end to end.",
        answer: [
          { t: "p", text: "Four bits give sixteen values, and NF4 places them at the quantiles of a normal distribution rather than evenly. Weights are concentrated near zero \u2014 in one GPT-2 matrix I measured 42% of them falling in a single narrow band \u2014 so a uniform grid spends most of its levels in the tails where almost nothing lives." },
          { t: "p", text: "The difference in reconstruction error is modest: 0.102 against 0.143, a factor of 1.41. The difference in the model is not. I quantized every weight matrix and measured perplexity: NF4 cost 1.069\u00d7 and the uniform grid cost 9.006\u00d7 \u2014 the model is destroyed." },
          { t: "p", text: "That gap is the thing I would carry out of this. Reconstruction error is cheap and correlated and understates differences by about sixfold here, so it is a screening metric and never a decision metric \u2014 which is the same conclusion as measuring int8 dynamic quantization and watching perplexity go from 2.07 to 1136." },
          { t: "p", text: "One honest caveat about NF4 itself: it assumes normality and real weights are more peaked than that \u2014 kurtosis 7.55 against 3.0 for GPT-2. So NF4 is well matched rather than optimal, and the per-block absmax scaling absorbs much of the remaining mismatch, which is why block size turns out to matter as much as the codebook." }
        ] },

      { level: "core",
        q: "Can you fine-tune an 8B model on a single 24 GB card?",
        strong: "A strong answer does the arithmetic and names the term it has not quantified.",
        answer: [
          { t: "p", text: "Not with full fine-tuning \u2014 a 7B needs about 84 GB and an 8B proportionally more, with the optimizer being 56 GB of it. That is out before we discuss anything else." },
          { t: "p", text: "LoRA brings it to roughly the size of the frozen base, about 16 GB for an 8B in bf16. That fits in 24 GB on paper and would be tight once activations are counted \u2014 and activations are the term I have not quantified, because they depend on batch size and sequence length and can be traded away with gradient checkpointing." },
          { t: "p", text: "QLoRA is the comfortable answer: the base in NF4 is around 4 GB, total under 5, leaving real headroom for activations and a usable batch size. That is where I would start, and the reference's own default for the same reason." },
          { t: "p", text: "Two things I would verify rather than assume. That the stack is actually using NF4 and block size 64 \u2014 I measured a uniform four-bit grid at 9.006\u00d7 perplexity and block 1024 at 3.012\u00d7, so \u2018four-bit\u2019 on its own is not a specification. And whether we need four-bit at all: int8 cost 1.015\u00d7 in the same measurement at 7 GB for a 7B, so if it fits in eight bits there is little reason to go lower." }
        ] }
    ]
  }
});

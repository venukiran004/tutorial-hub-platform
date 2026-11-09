/* ============================================================================
   LESSON 10.2 — Sizing a GPU
   ========================================================================= */
EC.receiveLesson({
  id: "10.2",

  lede: "The instance type follows from arithmetic you can do before renting anything. A model's weights are only the start: training also holds gradients, the optimiser's state and the activations saved for the backward pass, and inference holds a KV cache that grows with every token of context. This lesson measures each term on a real model, GPT-2, during a real training step, checks the arithmetic against a second model, and uses it to size GPUs for 8B and 70B models. It ends with the test that tells you whether a workload is limited by compute or by memory bandwidth, which decides what a faster GPU can buy.",

  objectives: [
    "Account for training memory: parameters, gradients, optimiser state and activations",
    "Measure activation memory and show that it scales with tokens per batch",
    "Size GPUs for inference, full fine-tuning and LoRA on 8B and 70B models",
    "Use activation checkpointing, LoRA and quantisation to change the answer",
    "Decide whether a workload is compute-bound or memory-bound from its arithmetic intensity"
  ],

  prerequisites: ["2.3", "10.1"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "terms",
      text: "Four terms of training memory",
      sub: "Measured on GPT-2 during one AdamW step" },
    { t: "p",
      text: "The script loads GPT-2 small (124M parameters) in float32, runs one forward and backward pass on 4 sequences of 256 tokens, and takes an AdamW step. It counts the bytes of every parameter, gradient and optimiser buffer, and uses autograd's saved-tensor hook to count exactly what the forward pass keeps for the backward pass, excluding the weights themselves." },
    { t: "code",
      lang: "python",
      title: "gpumem.py — every byte of a training step",
      code: `import torch
from transformers import GPT2LMHeadModel

torch.manual_seed(0)
model = GPT2LMHeadModel.from_pretrained("gpt2")                    # 124M parameters, float32
opt = torch.optim.AdamW(model.parameters(), lr=1e-4)
n_params = sum(p.numel() for p in model.parameters())
MB = 1 / 2 ** 20

def activation_bytes(batch, seq):
    """Bytes of tensors autograd saves for the backward pass, counted once per storage, excluding the weights
    themselves (a linear layer saves its weight to compute the input's gradient, but that memory exists anyway)."""
    seen, total = {p.untyped_storage().data_ptr() for p in model.parameters()}, 0
    def pack(t):
        nonlocal total
        key = (t.untyped_storage().data_ptr(), t.untyped_storage().nbytes())
        if key[0] not in seen: seen.add(key[0]); total += key[1]
        return t
    ids = torch.randint(0, 50257, (batch, seq))
    with torch.autograd.graph.saved_tensors_hooks(pack, lambda t: t):
        loss = model(ids, labels=ids).loss
    loss.backward(); return total

act = activation_bytes(4, 256)
opt.step()                                                          # creates AdamW's two moment buffers
params = sum(p.numel() * p.element_size() for p in model.parameters())
grads = sum(p.grad.numel() * p.grad.element_size() for p in model.parameters())
state = sum(v.numel() * v.element_size() for s in opt.state.values() for v in s.values() if torch.is_tensor(v) and v.dim() > 0)

print(f"GPT-2 small: {n_params / 1e6:.1f}M parameters, float32, one AdamW step at batch 4 x 256 tokens")
print(f"  parameters      {params * MB:8.0f} MB   {params / n_params:4.1f} bytes/param")
print(f"  gradients       {grads * MB:8.0f} MB   {grads / n_params:4.1f} bytes/param")
print(f"  AdamW moments   {state * MB:8.0f} MB   {state / n_params:4.1f} bytes/param")
print(f"  activations     {act * MB:8.0f} MB")
print(f"  total           {(params + grads + state + act) * MB:8.0f} MB  (weights alone: {params * MB:.0f} MB)")

print("\\nactivations scale with tokens in the batch:")
for b, s in ((1, 256), (4, 256), (8, 256), (4, 512), (4, 1024)):
    model.zero_grad(set_to_none=True)
    a = activation_bytes(b, s)
    print(f"  batch {b} x {s:>4} tokens = {b * s:>5} tokens: {a * MB:7.0f} MB  ({a / (b * s) / 1024:.0f} KB per token)")`,
      out: `GPT-2 small: 124.4M parameters, float32, one AdamW step at batch 4 x 256 tokens
  parameters           475 MB    4.0 bytes/param
  gradients            475 MB    4.0 bytes/param
  AdamW moments        949 MB    8.0 bytes/param
  activations         1283 MB
  total               3182 MB  (weights alone: 475 MB)

activations scale with tokens in the batch:
  batch 1 x  256 tokens =   256 tokens:     321 MB  (1283 KB per token)
  batch 4 x  256 tokens =  1024 tokens:    1283 MB  (1283 KB per token)
  batch 8 x  256 tokens =  2048 tokens:    2566 MB  (1283 KB per token)
  batch 4 x  512 tokens =  2048 tokens:    2566 MB  (1283 KB per token)
  batch 4 x 1024 tokens =  4096 tokens:    5132 MB  (1283 KB per token)` },
    { t: "viz",
      title: "Training memory for a 475 MB model",
      caption: "The weights were 15% of the total. AdamW keeps two moments per parameter, and activations grow with every token in the batch.",
      svg: `<svg viewBox="0 0 760 172" width="100%" role="img">
<text x="210" y="31.0" text-anchor="end" class="s-label">parameters</text>
<rect x="220" y="14" width="135.1" height="26" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="363.1" y="31.0" class="s-sub">475 MB  (4 bytes/param)</text>
<text x="210" y="69.0" text-anchor="end" class="s-label">gradients</text>
<rect x="220" y="52" width="135.1" height="26" rx="4" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="363.1" y="69.0" class="s-sub">475 MB  (4 bytes/param)</text>
<text x="210" y="107.0" text-anchor="end" class="s-label">AdamW moments</text>
<rect x="220" y="90" width="270.0" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="498.0" y="107.0" class="s-sub">949 MB  (8 bytes/param)</text>
<text x="210" y="145.0" text-anchor="end" class="s-label">activations, 1,024 tokens</text>
<rect x="220" y="128" width="365.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="593.0" y="145.0" class="s-sub">1,283 MB  (1.25 MB/token)</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "16 bytes per parameter before activations",
          def: "4 for the weight, 4 for its gradient, 8 for AdamW's two moments. Mixed-precision training keeps the same 16: 2-byte weights and gradients, plus a 4-byte master copy and the 8-byte moments." },
        { term: "Activations scale with tokens",
          def: "1,283 KB per token at every batch size and sequence length tried, so batch 4 × 1,024 tokens needed 5.1 GB. Doubling the batch or the context doubles this term." },
        { term: "The vocabulary is expensive",
          def: "Each token's logits over a 50,257-word vocabulary are 196 KB in float32, and the loss keeps another copy. With modern 128K vocabularies, the output layer alone can dominate activation memory." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Sizing from the parameter count",
      body: [
        { t: "p",
          text: "'It is a 7B model, so 14 GB in bf16, so a 24 GB GPU' is right for inference with a short context and wrong for everything else. Full fine-tuning the same model needs about 16 bytes per parameter before activations, over 110 GB. The parameter count tells you the smallest term." }
      ] },
    { t: "h2", n: "02", id: "sizing", text: "Sizing real models", sub: "Inference, full fine-tuning and LoRA" },
    { t: "p",
      text: "For inference, memory is the weights plus the **KV cache**: two vectors per layer per KV head per token, which for an 8B model with grouped-query attention is 128 KB per token in bf16. For training, the activation term can be cut by **activation checkpointing**, which stores only each layer's input and recomputes the rest during the backward pass, at roughly a third more compute. **LoRA** freezes the base weights, so gradients and optimiser state exist only for small adapter matrices. The exercise builds an estimator and applies it." },
    { t: "table",
      head: ["Workload", "Dominant term", "Lever"],
      rows: [
        ["Inference, short context", "Weights", "8-bit or 4-bit weights"],
        ["Inference, long context or many users", "KV cache", "8-bit cache, grouped-query attention, paging"],
        ["Full fine-tuning", "Optimiser state and gradients", "Shard across GPUs (ZeRO / FSDP), 8-bit optimisers"],
        ["Long sequences", "Activations", "Activation checkpointing, smaller micro-batches"],
        ["Fine-tuning on one GPU", "Frozen weights", "LoRA, or QLoRA with 4-bit base weights"]
      ] },
    { t: "h2",
      n: "03",
      id: "roofline",
      text: "Compute-bound or memory-bound?",
      sub: "Arithmetic intensity decides" },
    { t: "p",
      text: "A GPU can do a fixed number of operations per byte it reads from memory: an H100 SXM's published figures are about 989 TFLOP/s of dense bf16 and 3.35 TB/s, roughly 300 operations per byte. A workload that does fewer operations per byte read is waiting on memory, and a GPU with more FLOPs will not help it. The script measures this on the CPU at hand with one 4096 × 4096 layer, the shape of an LLM projection, at different batch sizes." },
    { t: "code",
      lang: "python",
      title: "roofline.py — throughput against operations per byte",
      code: `import time
import torch

# A linear layer y = x @ W with W of 4096 x 4096 (32M parameters), the shape of one LLM projection.
# For a batch of b rows: FLOPs = 2 * b * 4096^2; bytes moved are dominated by W (4096^2 * 4) when b is small.
torch.set_num_threads(8)
D = 4096
W = torch.randn(D, D)
print(f"{'batch':>6}{'FLOPs per byte':>16}{'GFLOP/s':>10}{'time per row':>14}")
for b in (1, 2, 8, 32, 128, 512):
    x = torch.randn(b, D)
    for _ in range(3): x @ W
    reps = max(3, 2000 // b)
    t = time.perf_counter()
    for _ in range(reps): x @ W
    el = (time.perf_counter() - t) / reps
    flops = 2 * b * D * D
    bytes_moved = (D * D + 2 * b * D) * 4
    print(f"{b:>6}{flops / bytes_moved:>16.1f}{flops / el / 1e9:>10.1f}{el / b * 1e6:>11.1f} µs")`,
      out: ` batch  FLOPs per byte   GFLOP/s  time per row
     1             0.5      20.9     1607.7 µs
     2             1.0      24.4     1376.8 µs
     8             4.0      85.2      393.8 µs
    32            15.8     194.6      172.4 µs
   128            60.2     237.2      141.5 µs
   512           204.8     281.3      119.3 µs` },
    { t: "dl",
      items: [
        { term: "Batch 1 is memory-bound",
          def: "With one row, each weight is read to do two operations, 0.5 FLOPs per byte, and the CPU reached 21 GFLOP/s. At batch 512, 205 FLOPs per byte, it reached 281 GFLOP/s: thirteen times more useful work from the same hardware." },
        { term: "This is why LLM decoding batches",
          def: "Generating one token for one user reads every weight for a handful of operations. Serving many users in one batch reuses each weight read, which is where throughput comes from (lesson 12.3)." },
        { term: "What to buy",
          def: "Memory-bound work (small-batch inference) is priced by memory bandwidth and capacity; compute-bound work (training, large-batch prefill) by FLOPs. Check intensity before paying for the faster chip." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Will it fit? An estimator, checked",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p",
          text: "Write an estimator of GPU memory for inference (weights and KV cache), full fine-tuning with mixed-precision AdamW, and LoRA, with an option for activation checkpointing. Fit its activation term on the GPT-2 measurement, then check it against a model it was not fitted to, GPT-2 medium, by measuring that model's activations. Finally, choose the smallest GPU, with 20% headroom, for seven workloads on 8B and 70B models." }
      ],
      requirements: [
        "Weights, gradients, master copy and optimiser state by mode",
        "An activation term fitted on GPT-2 and tested on GPT-2 medium",
        "KV cache from layers, KV heads, head dimension and context",
        "A GPU choice per workload with headroom"
      ],
      hint: "Fit the activation term as bytes per layer per hidden unit per token, after subtracting the logits; that form transfers between models of different depth and width.",
      solution: { lang: "python",
        title: "will_it_fit.py",
        code: `from dataclasses import dataclass
GB = 2 ** 30

@dataclass
class Model:
    name: str; params: float; layers: int; hidden: int; vocab: int; kv_heads: int; head_dim: int

# Calibrate the activation term on the GPT-2 measurement (lesson code): 1,283 KB per token in float32,
# of which the logits and their log-softmax are about vocab * 4 bytes * 2.
GPT2 = Model("gpt2", 124.4e6, 12, 768, 50257, 12, 64)
K_FP32 = (1283 * 1024 - GPT2.vocab * 8) / (GPT2.layers * GPT2.hidden)      # bytes per layer per hidden unit per token

def estimate(m: Model, mode: str, tokens: int, bytes_per: int = 2, checkpointing: bool = False, kv_tokens: int = 0) -> dict:
    w = m.params * bytes_per
    if mode == "inference":
        kv = kv_tokens * 2 * m.layers * m.kv_heads * m.head_dim * bytes_per
        return {"weights": w, "KV cache": kv}
    act_per_tok = (2 * m.layers * m.hidden if checkpointing else K_FP32 * bytes_per / 4 * m.layers * m.hidden) + m.vocab * 2 * bytes_per
    if mode == "full":            # mixed precision: 16-bit weights and grads, fp32 master copy and two AdamW moments
        return {"weights": w, "gradients": m.params * bytes_per, "fp32 master + AdamW": m.params * 12, "activations": tokens * act_per_tok}
    if mode == "lora":            # frozen 16-bit weights; adapters and their optimiser state are under 1% of the model
        return {"weights": w, "adapters + state": m.params * 0.005 * 16, "activations": tokens * act_per_tok}

GPUS = [("L4 / A10G", 24), ("A100 40GB", 40), ("A100 / H100 80GB", 80), ("H200", 141), ("8 x H100", 640)]
def smallest(total): return next((n for n, g in GPUS if total * 1.2 <= g * GB), "more than one node")   # 20% headroom

# 1. Check the activation term on a model it was not fitted to: GPT-2 medium (24 layers, hidden 1024).
import torch
from transformers import GPT2LMHeadModel
med = GPT2LMHeadModel.from_pretrained("gpt2-medium")
def measured_activations(model, batch, seq):
    seen, total = {p.untyped_storage().data_ptr() for p in model.parameters()}, 0
    def pack(t):
        nonlocal total
        ptr = t.untyped_storage().data_ptr()
        if ptr not in seen: seen.add(ptr); total += t.untyped_storage().nbytes()
        return t
    ids = torch.randint(0, 50257, (batch, seq))
    with torch.autograd.graph.saved_tensors_hooks(pack, lambda t: t): model(ids, labels=ids).loss.backward()
    return total
GPT2M = Model("gpt2-medium", 354.8e6, 24, 1024, 50257, 16, 64)
meas = measured_activations(med, 2, 256); pred = estimate(GPT2M, "full", tokens=512, bytes_per=4)["activations"]
print(f"GPT-2 medium, fp32, 512 tokens: activations predicted {pred / 2 ** 20:,.0f} MB, measured {meas / 2 ** 20:,.0f} MB "
      f"({pred / meas - 1:+.1%})")
del med

llama8 = Model("8B", 8.03e9, 32, 4096, 128256, 8, 128)
llama70 = Model("70B", 70.6e9, 80, 8192, 128256, 8, 128)
print()
for title, m, kw in [
    ("8B inference, bf16, 8 requests x 4K context", llama8, dict(mode="inference", tokens=0, kv_tokens=8 * 4096)),
    ("8B full fine-tune, 4 x 2K tokens", llama8, dict(mode="full", tokens=8192)),
    ("8B full fine-tune, checkpointing", llama8, dict(mode="full", tokens=8192, checkpointing=True)),
    ("8B LoRA, checkpointing", llama8, dict(mode="lora", tokens=8192, checkpointing=True)),
    ("70B inference, bf16, 8 x 4K context", llama70, dict(mode="inference", tokens=0, kv_tokens=8 * 4096)),
    ("70B inference, 8-bit weights and cache", llama70, dict(mode="inference", tokens=0, kv_tokens=8 * 4096, bytes_per=1)),
    ("70B LoRA, checkpointing", llama70, dict(mode="lora", tokens=8192, checkpointing=True)),
]:
    parts = estimate(m, **kw); total = sum(parts.values())
    detail = ", ".join(f"{k} {v / GB:.1f}" for k, v in parts.items())
    print(f"{title:<44} {total / GB:6.1f} GB -> {smallest(total):<18} ({detail})")`,
        out: `GPT-2 medium, fp32, 512 tokens: activations predicted 1,383 MB, measured 1,543 MB (-10.3%)

8B inference, bf16, 8 requests x 4K context    19.0 GB -> L4 / A10G          (weights 15.0, KV cache 4.0)
8B full fine-tune, 4 x 2K tokens              173.0 GB -> 8 x H100           (weights 15.0, gradients 15.0, fp32 master + AdamW 89.7, activations 53.4)
8B full fine-tune, checkpointing              125.6 GB -> 8 x H100           (weights 15.0, gradients 15.0, fp32 master + AdamW 89.7, activations 5.9)
8B LoRA, checkpointing                         21.5 GB -> A100 40GB          (weights 15.0, adapters + state 0.6, activations 5.9)
70B inference, bf16, 8 x 4K context           141.5 GB -> 8 x H100           (weights 131.5, KV cache 10.0)
70B inference, 8-bit weights and cache         70.8 GB -> H200               (weights 65.8, KV cache 5.0)
70B LoRA, checkpointing                       150.7 GB -> 8 x H100           (weights 131.5, adapters + state 5.3, activations 13.9)`,
        notes: [
          { t: "p",
            text: "On GPT-2 medium the activation term predicted 1,383 MB and the measurement was 1,543 MB, 10% low. Checking a fitted formula against a model it was not fitted to is the only way to learn how far to trust it; this is why the GPU choice uses 20% headroom rather than 10%." },
          { t: "p",
            text: "The results show where each lever matters. An 8B model serves 8 users at 4K context on a 24 GB card, but its full fine-tune needs 126–173 GB, which means several GPUs with sharded optimiser state; LoRA with checkpointing brings it to 21.5 GB. A 70B model in bf16 does not fit one 80 GB card even for inference; 8-bit weights and cache bring it to 71 GB, which with headroom still calls for an H200 or two GPUs." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: out of memory at step 1,412",
      body: [
        { t: "p",
          text: "**Symptom.** A fine-tuning job ran for three hours at 85% GPU memory, then failed with CUDA out of memory at the same step on every retry." },
        { t: "p",
          text: "**Mechanism.** Batches were padded to the longest sequence in each batch, and step 1,412 was the first batch containing a document near the 4,096-token maximum. Activation memory scales with tokens, so that batch needed about four times the activations of a typical one. The memory test had used a sample of typical batches." },
        { t: "p",
          text: "**Fix.** The team sized memory for the worst case (maximum sequence length × micro-batch), enabled activation checkpointing, and switched to token-budget batching, which packs sequences up to a fixed number of tokens per batch so memory is flat across steps." }
      ] }
  ],

  takeaways: [
    "Training memory is **parameters + gradients + optimiser state + activations**; the weights were only **15%** of GPT-2's total.",
    "AdamW costs **16 bytes per parameter** before activations, in fp32 or mixed precision.",
    "Activations measured a constant **1,283 KB per token** for GPT-2: they scale with batch × sequence length.",
    "Large vocabularies make the logits a major activation cost.",
    "Inference memory is weights plus a **KV cache** that grows with context and concurrent users.",
    "An estimator fitted on GPT-2 was **10% low** on GPT-2 medium: check fitted formulas on a second model and keep headroom.",
    "8B: inference fits a **24 GB** card; full fine-tuning needs **126–173 GB**; LoRA with checkpointing **21.5 GB**.",
    "Batch-1 matrix work reached **21 GFLOP/s**; batch 512 reached **281**: low arithmetic intensity is memory-bound.",
    "Size for the **worst-case** batch, not a typical one."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "How many bytes per parameter does full fine-tuning with AdamW need, before activations?",
        options: [
          "About 2, the size of a bf16 weight",
          "About 16: weight, gradient and two moments",
          "About 4, since gradients overwrite weights",
          "About 8: weight and one optimiser buffer"
        ],
        answer: 1,
        why: "4 for the weight, 4 for the gradient and 8 for AdamW's two moments (or 2 + 2 + 4 master + 8 in mixed precision). Gradients do not overwrite weights, and AdamW keeps two buffers, not one." },
      { stem: "Doubling the sequence length of a training batch doubles which term?",
        options: [
          "The optimiser state, as more tokens need updates",
          "The activation memory saved for the backward pass",
          "The gradient memory, since gradients are per token",
          "The parameter memory, as embeddings grow with length"
        ],
        answer: 1,
        why: "Activations were 1,283 KB per token at every shape. Gradients and optimiser state are per parameter, and parameters do not depend on sequence length." },
      { stem: "A batch-1 LLM decoder runs no faster on a GPU with twice the FLOPs. Why?",
        options: [
          "Decoding cannot run on the GPU's tensor cores at all, ever",
          "It is memory-bound: each weight read does little work",
          "The batch is too small to need any FLOPs",
          "Twice the FLOPs needs twice the batch size"
        ],
        answer: 1,
        why: "At batch 1 each weight is read for about two operations, far below the ~300 FLOPs per byte where an H100 becomes compute-bound. More bandwidth, or batching more users, helps; more FLOPs does not." },
      { stem: "What does activation checkpointing trade?",
        options: [
          "Model accuracy for lower memory use overall",
          "Extra compute in the backward pass for memory",
          "Optimiser state memory for activation memory",
          "Disk space for GPU memory during the forward pass"
        ],
        answer: 1,
        why: "It stores only layer inputs and recomputes the rest during the backward pass, about a third more compute. Results are unchanged, optimiser state is unaffected, and nothing goes to disk." }
    ] },

  interview: { title: "In an interview",
    sub: "GPU sizing questions reward arithmetic done out loud.",
    questions: [
      { level: "core",
        q: "Which GPU would you use to fine-tune a 7B model?",
        strong: "A strong answer asks full or parameter-efficient, then does the arithmetic per term.",
        answer: [
          { t: "p",
            text: "Full fine-tuning with AdamW is about 16 bytes per parameter, roughly 112 GB, plus activations, so several 80 GB GPUs with sharded optimiser state (FSDP or ZeRO-3). LoRA keeps the frozen weights at 14 GB in bf16 plus small adapters and activations, so with checkpointing it fits a single 24–40 GB card; QLoRA with 4-bit base weights fits 24 GB comfortably." },
          { t: "p",
            text: "I would then check activations at the maximum sequence length and micro-batch, not a typical batch, and keep headroom." }
        ] },
      { level: "core",
        q: "How much GPU memory does it take to serve a 70B model?",
        strong: "A strong answer separates weights from KV cache and ties the cache to context and concurrency.",
        answer: [
          { t: "p",
            text: "Weights: about 140 GB in bf16, 70 GB in 8-bit, 35 GB in 4-bit. KV cache: 2 × layers × KV heads × head dimension × bytes per token, which with 80 layers and 8 KV heads of 128 is about 320 KB per token in bf16, so 8 users at 4K context add 10 GB. In bf16 that is two 80 GB GPUs with tensor parallelism; 8-bit fits one H200 or two smaller cards with room for more concurrent users." }
        ] },
      { level: "advanced",
        q: "Your training job uses 40% of the GPU's FLOPs. How do you find out why?",
        strong: "A strong answer separates data-loading stalls, memory-bound kernels and communication, and measures each.",
        answer: [
          { t: "p",
            text: "Profile a few steps. If the GPU is idle between steps, it is the input pipeline: more workers, prefetching, data in a faster format. If kernels run but at low throughput, check arithmetic intensity: small batches or small matrices are memory-bound, so raise the micro-batch (with checkpointing to make room) or fuse operations. In multi-GPU jobs, look for time in all-reduce and overlap communication with computation. Mixed precision and an attention kernel such as FlashAttention are the usual first fixes." }
        ] }
    ] }
});

/* ============================================================================
   LESSON 7.3 — Mixed Precision and Distributed Failures
   Float format ranges and the underflow/overflow demonstrations measured
   (d71.py).
   ========================================================================= */
EC.receiveLesson({
  id: "7.3",

  lede: "**Float16's entire problem is its range, and the numbers make it obvious: a maximum of 65,504 and a smallest normal value of 6.1e-05.** A gradient of 1e-08 becomes exactly zero; an activation of 1e+05 becomes infinity. Bfloat16 has float32's range and sidesteps both. Then there is distributed training, where the characteristic failure is not an error at all — it is a job that hangs forever with no output.",

  objectives: [
    "Compare fp16, bf16 and fp32 by range and precision",
    "Explain loss scaling and why unscaling must precede clipping",
    "Choose bf16 over fp16 where hardware allows",
    "Diagnose an NCCL hang and a straggler",
    "Recognise a dataloader bottleneck from GPU utilisation"
  ],

  prerequisites: ["7.2", "2.11"],

  blocks: [

    { t: "h2", n: "01", text: "The three formats", id: "formats" },

    {"kind": "trace", "title": "Both 16-bit formats, and where the bits went", "caption": "Same 16 bits, allocated differently. Float16 spends more on the mantissa — better precision, and a range topping out at 65,504. Bfloat16 spends more on the exponent, giving **float32's full range** at worse precision. For training, range is the binding constraint: gradients span many orders of magnitude while precision requirements are modest, because the gradient is a noisy estimate anyway. That is the whole reason bf16 needs no loss scaling and fp16 does.", "left": "format", "codeW": 140, "vars": ["max", "min normal", "eps"], "steps": [{"code": "float16", "state": ["6.550e+04", "6.104e-05", "9.766e-04"], "tone": "warn", "note": "narrow range"}, {"code": "bfloat16", "state": ["3.390e+38", "1.175e-38", "7.812e-03"], "changed": [0], "tone": "good", "note": "float32's range"}, {"code": "float32", "state": ["3.403e+38", "1.175e-38", "1.192e-07"], "tone": "accent"}, {"code": "which matters?", "state": ["range", "range", "not precision"], "tone": "violet"}], "t": "diagram", "id": "dg-7_3-01-0"},



    { t: "out", text: `                     max    min normal         eps
  float16      6.550e+04     6.104e-05   9.766e-04
  bfloat16     3.390e+38     1.175e-38   7.812e-03
  float32      3.403e+38     1.192e-07` },

    { t: "callout", kind: "insight", title: "bf16 trades precision for range, and range is what matters",
      body: [{ t: "p", text: "Both 16-bit formats use 16 bits; they allocate them differently. Float16 spends more on the mantissa, giving better precision (eps 9.8e-04) and a narrow range topping out at 65,504. Bfloat16 spends more on the exponent, giving **the same range as float32** — 3.4e+38 — at worse precision (eps 7.8e-03). For training, range is the binding constraint: gradients span many orders of magnitude and precision requirements are modest, because the gradient is a noisy estimate anyway. That is why bf16 needs no loss scaling and fp16 does, and why newer hardware made bf16 the default." }] },

    { t: "out", text: `  a gradient of 1e-8 in fp16: 0.0            <- UNDERFLOWS to zero
  scaled by 1024 first       : 1.025e-05      <- survives
  an activation of 1e5 in fp16: inf           <- OVERFLOWS to inf
  the same value in bfloat16  : 9.984e+04     <- fine, bf16 has float32's range` },

    { t: "p", text: "Both failure directions in four lines. The underflow is the insidious one: a gradient that becomes exactly zero does not raise anything, it simply means that parameter receives no update this step — so the model trains, slowly and incorrectly, with no symptom beyond disappointing results." },

    { t: "h2", n: "02", text: "Loss scaling", id: "scaling" },

    {"kind": "flow", "title": "The scaler is a feedback controller, and its state is a diagnostic", "caption": "It multiplies the loss, checks the gradients for infinities, and on finding any it **skips the step and halves the scale**; after enough clean steps it doubles. So it hunts for the largest scale that does not overflow — which makes its behaviour informative. A scale that stabilises high means fp16 is comfortable; one that keeps halving means the overflow is structural and the problem is upstream. Log the scale, and log the fraction of steps skipped, because silently discarding a large share of your updates looks exactly like slow convergence.", "cols": 3, "nodes": [{"id": "s", "label": "Scale the loss up", "sub": "so small gradients survive", "tone": "accent"}, {"id": "c", "label": "Any inf in the gradients?", "sub": "checked every step", "tone": "violet"}, {"id": "h", "label": "Yes: skip the step, halve the scale", "sub": "the update is lost", "tone": "warn"}, {"id": "d", "label": "No, for many steps: double it", "sub": "hunt upward", "tone": "good"}, {"id": "t", "label": "Stabilises high: fp16 is comfortable", "sub": "healthy", "tone": "good"}, {"id": "k", "label": "Keeps halving: look upstream", "sub": "activations, LR, normalisation", "tone": "crit"}], "edges": [["s", "c"], ["c", "h"], ["c", "d"], ["d", "t"], ["h", "k"]], "t": "diagram", "id": "dg-7_3-02-1"},



    { t: "code", lang: "python", title: "The AMP loop, with the ordering that matters",
      code: `from torch.amp import autocast, GradScaler      # NOT torch.cuda.amp — deprecated
scaler = GradScaler('cuda')

for batch in loader:
    optimizer.zero_grad()
    with autocast('cuda'):                        # forward in fp16/bf16
        loss = loss_fn(model(batch["x"]), batch["y"])
    scaler.scale(loss).backward()                 # scale up so small grads survive
    scaler.unscale_(optimizer)                    # UNSCALE before clipping
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    scaler.step(optimizer)
    scaler.update()                               # adapt the scale; halves on overflow`,
      caption: "Lesson 2.11 measured why the unscale must come first: clipping a scaled gradient compares a scaled norm against an unscaled threshold, so the clip does something arbitrary that depends on whatever scale the scaler has settled on." },

    { t: "callout", kind: "mental", title: "The scaler is a feedback controller, and its behaviour is a diagnostic",
      body: [{ t: "p", text: "`GradScaler` multiplies the loss by a factor, checks the gradients for infinities, and if it finds any it **skips the step and halves the scale**; if many steps pass cleanly it doubles it. So it hunts for the largest scale that does not overflow. That makes its state informative: a scale that stabilises high means fp16 is working comfortably, while one that keeps halving means it is fighting genuine overflow and something upstream is wrong — an activation that is too large, a loss that is ill-conditioned, or a learning rate causing weights to grow. **Log the scale value**, and log the fraction of steps skipped, because silently skipping a large share of your updates looks exactly like slow convergence." }] },

    { t: "table", head: ["Symptom", "Cause", "Fix"],
      rows: [
        ["NaN only in mixed precision, fine in fp32", "fp16 overflow", "Loss scaling, or switch to bf16"],
        ["Loss scale keeps halving", "Genuine overflow upstream", "Find the large activation; check LR and normalisation"],
        ["Training is slower than fp32", "Ops falling back, or tensor cores unused", "Check dimensions are multiples of 8; profile"],
        ["Results slightly worse than fp32", "Precision loss in a sensitive op", "Keep the loss and softmax in fp32 — `autocast` does this for many ops already"]
      ] },

    { t: "h2", n: "03", text: "Distributed: the hang", id: "nccl" },

    {"kind": "flow", "title": "The hang, which produces no error at all", "caption": "Training simply stops making progress. No exception, no log line, no crash — the job sits there consuming GPUs until someone notices. The cause is almost always that the ranks **disagree about which collectives to run**, so one waits forever for a partner that never arrives. The discipline is absolute: every rank executes the same collectives in the same order, which makes a `dist.barrier()` inside an `if rank == 0:` branch an instant deadlock.", "cols": 3, "nodes": [{"id": "h", "label": "The job hangs", "sub": "no error, no log, no crash", "tone": "crit"}, {"id": "r", "label": "Ranks disagree on collectives", "sub": "one waits for a partner", "tone": "crit"}, {"id": "u", "label": "Uneven batch counts", "sub": "one rank exits the loop early", "tone": "warn"}, {"id": "b", "label": "A collective inside if rank == 0", "sub": "an instant deadlock", "tone": "warn"}, {"id": "m", "label": "A mismatched collective shape", "sub": "hangs rather than errors", "tone": "warn"}, {"id": "f", "label": "Same collectives, same order, every rank", "sub": "plus a timeout, so it fails loudly", "tone": "good"}], "edges": [["h", "r"], ["r", "u"], ["r", "b"], ["r", "m"], ["r", "f"]], "t": "diagram", "id": "dg-7_3-03-2"},



    { t: "callout", kind: "crit", title: "The most dreaded distributed bug produces no error at all",
      body: [{ t: "p", text: "Training simply **hangs**. No exception, no log line, no crash — the job sits there consuming GPUs until someone notices. The cause is almost always that the ranks disagree about which collectives to run: one GPU calls all-reduce and another does not, so the first waits forever for a partner that never arrives. The usual culprit is a `if rank == 0:` branch that skips a synchronising operation, or ranks receiving different numbers of batches so one finishes its epoch early. The fix is a discipline — **every rank must execute the same collectives in the same order** — plus a collective timeout so a hang fails loudly instead of silently, and `NCCL_DEBUG=INFO` when you need to see what each rank was waiting for." }] },

    { t: "dl", items: [
      ["Uneven batch counts", "If one rank's shard has fewer batches it exits the loop early and stops participating. Use a distributed sampler that pads, or truncate every rank to the minimum."],
      ["Rank-conditional logic", "Logging, checkpointing and evaluation on rank 0 only is correct — as long as none of it contains a collective. A `dist.barrier()` or an all-gather inside a rank-0 branch deadlocks instantly."],
      ["Mismatched world size", "Every rank must agree on world size and on the shape of every collective's tensors. A shape mismatch can hang rather than error."]
    ] },

    { t: "h2", n: "04", text: "Stragglers and starvation", id: "stragglers" },

    { t: "p", text: "Synchronous data-parallel training waits for every rank at each step, so **throughput is the slowest worker's throughput**. One thermally throttled GPU, one node with a slow disk, or one unevenly sized shard, and the whole job runs at that pace while every other GPU idles." },

    { t: "diagram", kind: "compare", title: "Two ways GPUs sit idle",
      caption: "Both show as low utilisation and have completely different fixes.",
      columns: [
        { title: "Straggler", tone: "warn", items: [
          "One rank slower than the rest at each sync",
          "Diagnose: log per-rank step time",
          "Causes: thermal throttling, slow disk, uneven shards",
          "Fix: balance shards, isolate the node, elastic training"
        ] },
        { title: "Dataloader bottleneck", tone: "crit", items: [
          "Every GPU idle waiting for the next batch",
          "Diagnose: GPU utilisation under 50 % on a 'GPU-bound' job",
          "Cause: CPU cannot prepare data fast enough",
          "Fix: more workers, pin_memory, prefetch, faster format"
        ] }
      ] },

    { t: "code", lang: "python", title: "Feeding the GPU",
      code: `loader = torch.utils.data.DataLoader(
    dataset, batch_size=256,
    num_workers=8,            # parallel CPU data prep so the GPU never waits
    pin_memory=True,          # faster host to GPU copy
    prefetch_factor=4,        # workers stage batches ahead
    persistent_workers=True,  # do not respawn workers every epoch
)`,
      caption: "If that is not enough, the next steps are moving augmentation to the GPU, caching decoded data, or a sharded format like WebDataset that avoids per-file overhead." },

    { t: "h2", n: "05", text: "Sharded checkpoints", id: "checkpoints" },

    {"kind": "flow", "title": "A checkpoint that looks fine and cannot be loaded", "caption": "With FSDP or ZeRO each rank holds only part of the parameters, so a naive `state_dict()` on rank 0 saves that rank's fragment — **a file of plausible size that cannot reconstruct the model**. The write also has to be atomic, to a temporary path then renamed, or a crash mid-save overwrites a good checkpoint with a corrupt one. On a multi-week run, discovering this is the worst possible moment to find out, which is why the last step is the one that matters.", "cols": 3, "nodes": [{"id": "s", "label": "Parameters sharded across ranks", "sub": "FSDP, DeepSpeed ZeRO", "tone": "accent"}, {"id": "n", "label": "state_dict() on rank 0", "sub": "saves one fragment", "tone": "crit"}, {"id": "p", "label": "Plausible size, unloadable", "sub": "and nothing warns you", "tone": "crit"}, {"id": "a", "label": "Use the sharded-checkpoint API", "sub": "every rank writes its part", "tone": "good"}, {"id": "t", "label": "Write atomically", "sub": "temp path, then rename", "tone": "good"}, {"id": "l", "label": "Then load one back, and train a step", "sub": "the only test that counts", "tone": "teal"}], "edges": [["s", "n"], ["n", "p"], ["p", "a"], ["a", "t"], ["t", "l"]], "t": "diagram", "id": "dg-7_3-05-3"},



    { t: "callout", kind: "trap", title: "Saving only rank 0's shard produces an unloadable checkpoint",
      body: [{ t: "p", text: "A model too large for one GPU is sharded across many with FSDP or DeepSpeed ZeRO, and each rank holds only part of the parameters. Calling `state_dict()` naively on rank 0 saves that rank's fragment, which looks like a checkpoint, has a plausible file size, and cannot reconstruct the model. Use the framework's sharded-checkpoint API, write atomically — to a temporary path, then rename — so a crash mid-save cannot leave a corrupt file that overwrote a good one, and **test that a checkpoint actually reloads** before trusting it. On a multi-week training run, discovering your checkpoints are unloadable is the worst possible time to find out." }] },

    { t: "exercise", kind: "practice", title: "Break mixed precision deliberately", difficulty: "advanced", minutes: 40,
      prompt: "Train a model in fp32, fp16 with a GradScaler, and bf16, comparing final accuracy and wall-clock time. Log the loss scale every step for the fp16 run and plot it — note when it halves. Then force an overflow by scaling one layer's output up by 1e4 and observe how each precision responds. Finally, remove the `scaler.unscale_` call before clipping and measure what the clip threshold effectively becomes.",
      requirements: [
        "Train in fp32, fp16 with GradScaler and bf16 and compare accuracy and time",
        "Log and plot the loss scale for the fp16 run",
        "Force an overflow by scaling one layer's output by 1e4 and observe each precision",
        "Remove scaler.unscale_ before clipping and measure the effective threshold"
      ],
      hints: [
        "bf16 needs no scaler — `autocast('cuda', dtype=torch.bfloat16)`.",
        "The loss scale halving is visible as a sawtooth if you plot it on a log axis.",
        "Without unscaling, the effective clip threshold is the real one divided by the current scale."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import time
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.datasets import load_digits

# CPU run: autocast("cpu") supports float16 and bfloat16. Most CPUs have no fast fp16 arithmetic, so the
# fp16 timing below is emulation cost; on a GPU with tensor cores fp16 and bf16 are both faster than fp32.
X, y = load_digits(return_X_y=True)
X = torch.tensor(X / 16.0, dtype=torch.float32); y = torch.tensor(y)
Xtr, ytr, Xva, yva = X[:1500], y[:1500], X[1500:], y[1500:]

class Net(nn.Module):
    def __init__(self, boost=1.0):
        super().__init__(); self.boost = boost
        self.a, self.b, self.c = nn.Linear(64, 512), nn.Linear(512, 512), nn.Linear(512, 10)
    def forward(self, x):
        h = F.relu(self.a(x)) * self.boost                 # boost=1e4 forces an overflow in fp16
        return self.c(F.relu(self.b(h)))

def run(dtype, boost=1.0, unscale=True, steps=300):
    torch.manual_seed(0); m = Net(boost); opt = torch.optim.SGD(m.parameters(), 0.05, momentum=0.9)
    scaler = torch.amp.GradScaler("cpu", enabled=(dtype == torch.float16))
    scales, clipped, t0 = [], 0, time.perf_counter()
    for step in range(steps):
        idx = torch.randint(0, 1500, (64,))
        with torch.autocast("cpu", dtype=dtype, enabled=(dtype != torch.float32)):
            loss = F.cross_entropy(m(Xtr[idx]), ytr[idx])
        opt.zero_grad(); scaler.scale(loss).backward()
        if unscale: scaler.unscale_(opt)
        norm = nn.utils.clip_grad_norm_(m.parameters(), 1.0)
        clipped += norm.item() > 1.0
        scaler.step(opt); scaler.update(); scales.append(scaler.get_scale() if scaler.is_enabled() else 1.0)
    with torch.no_grad(): acc = (m(Xva).argmax(1) == yva).float().mean().item()
    return acc, time.perf_counter() - t0, scales, clipped / steps, loss.item()

print("precision    val acc   seconds")
for name, dt in [("fp32", torch.float32), ("fp16+scaler", torch.float16), ("bf16", torch.bfloat16)]:
    acc, sec, scales, _, _ = run(dt)
    print(f"{name:<12} {acc:7.3f}   {sec:7.2f}")
    if dt == torch.float16:
        drops = [i for i in range(1, len(scales)) if scales[i] < scales[i - 1]]
        print(f"             loss scale: start {scales[0]:.0f}, end {scales[-1]:.0f}, halved at steps {drops[:8]}")

print("\\nforced overflow (one activation x 1e4)")
for name, dt in [("fp32", torch.float32), ("fp16+scaler", torch.float16), ("bf16", torch.bfloat16)]:
    acc, _, scales, _, last = run(dt, boost=1e4, steps=100)
    extra = f"  final loss scale {scales[-1]:.3g}" if dt == torch.float16 else ""
    print(f"{name:<12} val acc {acc:.3f}  last loss {last:.3g}{extra}")

print("\\nclipping at 1.0 with and without scaler.unscale_ (fp16)")
for unscale in [True, False]:
    acc, _, scales, frac, _ = run(torch.float16, unscale=unscale)
    print(f"unscale_ {'called ' if unscale else 'skipped'}: steps clipped {frac:.0%}  val acc {acc:.3f}"
          + ("" if unscale else f"  -> effective threshold 1.0 / {scales[-1]:.0f} = {1.0 / scales[-1]:.1e}"))`,
        out: `precision    val acc   seconds
fp32           0.916      0.91
fp16+scaler    0.916     26.71
             loss scale: start 65536, end 65536, halved at steps []
bf16           0.916      2.00

forced overflow (one activation x 1e4)
fp32         val acc 0.818  last loss 9.98
fp16+scaler  val acc 0.872  last loss 5.09  final loss scale 16
bf16         val acc 0.872  last loss 0

clipping at 1.0 with and without scaler.unscale_ (fp16)
unscale_ called : steps clipped 19%  val acc 0.916
unscale_ skipped: steps clipped 100%  val acc 0.098  -> effective threshold 1.0 / 65536 = 1.5e-05`,
       
        notes: [
          { t: "p", text: "The loss-scale plot is the most informative artefact. A healthy fp16 run shows the scale ramping up early and then sitting near a stable value with occasional halvings — a sawtooth where the teeth are rare. A run in trouble halves repeatedly and never recovers a high scale, which tells you overflow is structural rather than occasional, and you should be looking upstream at activations rather than tuning the scaler." },
          { t: "p", text: "Removing the unscale before clipping is worth measuring because the effect is so counter-intuitive. With a loss scale of 65,536, clipping at a threshold of 1.0 on scaled gradients is effectively clipping at 1/65,536 of the intended value — almost every step gets crushed, the model trains at a tiny effective learning rate, and nothing anywhere reports a problem. And because the scale moves during training, the effective threshold moves with it, so the behaviour is not even consistent." },
          { t: "p", text: "The three-way accuracy comparison usually shows fp32 and bf16 essentially tied, with fp16 also matching when the scaler is working. Where it gets interesting is the forced overflow: bf16 handles a value of 1e4 without noticing, fp16 goes to infinity, and the scaler detects it and skips the step. Watching the skip counter rise is what makes concrete that a mixed-precision run can be silently discarding a large share of its updates." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: clipping applied to scaled gradients",
      body: [
        { t: "p", text: "**Symptom.** A mixed-precision run barely learned, though its full-precision version trained fine." },
        { t: "p", text: "**Mechanism.** Gradient clipping was applied before the gradient scaler unscaled the gradients, so the threshold was compared with values thousands of times larger and clipped almost everything." },
        { t: "p", text: "**Fix.** The loop calls `scaler.unscale_` before clipping, and the clip threshold is checked against logged unscaled norms." }
      ] }
  ],

  takeaways: [
    "fp16: max 6.55e+04, min normal 6.10e-05. bf16 has float32's range (3.39e+38) at coarser precision.",
    "A gradient of 1e-08 underflows to exactly zero in fp16 and survives scaling by 1024.",
    "Prefer bf16 where hardware supports it — range matters more than precision for training.",
    "`GradScaler` halves the scale and skips the step on overflow; log the scale and the skip fraction.",
    "Always `scaler.unscale_()` before clipping, or the effective threshold is divided by the current scale.",
    "An NCCL hang produces no error — ranks disagree on collectives. Enforce identical collective order and set a timeout.",
    "Throughput equals the slowest rank's: log per-rank step time to find stragglers.",
    "GPU utilisation under 50 % on a GPU-bound job means the dataloader, not the model.",
    "Sharded checkpoints must use the framework API, write atomically, and be tested for reload."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why prefer bf16 over fp16 where the hardware supports it?",
      options: ["It runs much faster", "fp32 range, no scaling", "It has better precision", "It uses less memory"],
      answer: 1,
      why: "Both are 16 bits; bf16 spends more of them on the exponent, giving a maximum of 3.39e+38 against fp16's 65,504, at worse precision. For training, range is the binding constraint because gradients span many orders of magnitude while precision requirements are modest — so bf16 avoids the overflow and underflow that make loss scaling necessary." },
    { stem: "Why must `scaler.unscale_()` come before `clip_grad_norm_`?",
      options: ["To free memory", "Grads are still scaled", "To synchronise the GPU", "Order does not matter"],
      answer: 1,
      why: "With a scale of 65,536, clipping scaled gradients at a threshold of 1.0 effectively clips at 1/65,536 of the intended value — crushing nearly every step. Worse, the scale changes during training, so the effective threshold moves too. Nothing reports a problem; the model just trains at a tiny effective learning rate." },
    { stem: "Your multi-GPU job hangs with no error. What is the most likely cause?",
      options: ["The job ran out of GPU memory", "Ranks disagree on the collectives", "The learning rate is too high", "A corrupt shard in the data"],
      answer: 1,
      why: "Collectives like all-reduce block until every rank participates, so if one rank skips one — typically a `if rank == 0:` branch containing a barrier, or uneven batch counts causing one rank to exit its epoch early — the others wait forever. Set a collective timeout so it fails loudly, and use `NCCL_DEBUG=INFO` to see what each rank was waiting on." },
    { stem: "GPU utilisation is 40 % on a job you believe is GPU-bound. What should you check first?",
      options: ["The model's architecture", "The dataloader's throughput", "The learning-rate schedule", "The gradient clipping value"],
      answer: 1,
      why: "Low utilisation on a supposedly GPU-bound job means the GPU is waiting, and the usual reason is that the CPU cannot prepare batches fast enough. More workers, `pin_memory=True`, a larger `prefetch_factor` and `persistent_workers` are the first moves; after that, GPU-side augmentation or a sharded format that avoids per-file overhead." }
  ] },

  interview: { title: "Interview", sub: "Precision and scale", questions: [
    { level: "Core", q: "Explain mixed-precision training and its pitfalls.",
      strong: "fp16/bf16 forward and backward with fp32 master weights; fp16 needs loss scaling because of its narrow range.",
      answer: [{ t: "p", text: "You run the forward and backward passes in 16-bit for speed and memory while keeping master weights in fp32. The problem with fp16 is its range — a maximum of about 65,500 and a smallest normal value around 6e-05 — so an activation of 1e5 overflows to infinity and a gradient of 1e-08 underflows to exactly zero. Loss scaling fixes the underflow by multiplying the loss before backward and dividing out before the step, and `GradScaler` adapts that factor automatically, halving it and skipping the step whenever it detects an infinity. Bfloat16 sidesteps the whole issue by having float32's range at coarser precision, which for training is the right trade since gradients are noisy estimates anyway, so I would use bf16 wherever the hardware supports it. The pitfall I would call out is clipping: gradients are still scaled during backward, so `scaler.unscale_()` must come before `clip_grad_norm_`, or the effective threshold is divided by whatever the current scale happens to be — and it changes during training, so the behaviour is not even consistent." }] },
    { level: "Senior", q: "A distributed training job hangs. Walk me through debugging it.",
      strong: "Assume collective mismatch; check rank-conditional code and batch counts, set timeouts, use NCCL_DEBUG.",
      answer: [{ t: "p", text: "A hang with no error almost always means ranks disagree on collectives — one calls all-reduce and waits for partners that never arrive. First I would set a collective timeout so the failure is loud rather than indefinite, which should be in place before anything hangs. Then I would look for rank-conditional code: logging, checkpointing and evaluation gated on rank 0 are correct, but if any of that contains a barrier or an all-gather it deadlocks immediately. Second, uneven batch counts — if one rank's shard yields fewer batches it exits the epoch early and stops participating, so I would check that the sampler pads or that every rank is truncated to the minimum. Third, shape mismatches in collectives, which can hang rather than error. `NCCL_DEBUG=INFO` shows what each rank was waiting for, and logging the step number per rank usually makes it obvious immediately which one stopped and when. The preventive discipline is that every rank executes the same collectives in the same order, and any deviation from that is where I would look." }] },
    { level: "Senior", q: "How would you tell a straggler from a dataloader bottleneck?",
      strong: "Both show low GPU utilisation; per-rank step time distinguishes them.",
      answer: [{ t: "p", text: "They look identical from an aggregate utilisation metric and have completely different fixes, so the distinguishing measurement is per-rank step time. With a straggler, one rank is consistently slower and the others are fast but blocked at the sync — so you see high variance across ranks and the slow one is always the same one. Causes are thermal throttling, a slow disk on one node, network imbalance, or an unevenly sized shard, and the fixes are balancing shards, isolating or replacing that node, or elastic training. With a dataloader bottleneck every rank is equally slow and every GPU is idle waiting for data, so step times are uniform and utilisation is low everywhere. There the fixes are more workers, `pin_memory`, a larger prefetch factor, persistent workers, and if that is not enough, moving augmentation to the GPU or switching to a sharded format that avoids per-file overhead. The general point is that low utilisation is a symptom with several causes, and per-rank timing is the cheap measurement that separates them." }] }
  ] }
});

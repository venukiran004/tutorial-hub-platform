/* ============================================================================
   LESSON 7.2 — Loss Spikes, Divergence and Dead Neurons
   Dead-ReLU behaviour measured (d71.py).
   ========================================================================= */
EC.receiveLesson({
  id: "7.2",

  lede: "**Two failures that look nothing alike and share a cause.** A loss spike is loud — the number jumps and the run dies. Dead ReLUs are silent: a fraction of the network outputs zero for every input, receives exactly zero gradient forever, and the model trains on around it at reduced capacity. Both are usually caused by a learning rate that was briefly too high, and both are cheap to detect if you are looking.",

  objectives: [
    "Recognise a loss spike and name its likely causes",
    "Implement warmup and cosine decay",
    "Explain why warmup is near-mandatory for transformers",
    "Measure the dead-ReLU fraction in a layer",
    "Choose an activation that cannot die"
  ],

  prerequisites: ["7.1"],

  blocks: [

    { t: "h2", n: "01", text: "The spike", id: "spike" },

    {"kind": "flow", "title": "The loss spike, and what it usually is", "caption": "A sudden spike after stable training is almost never the model and almost always one of three things: a **batch of outliers**, a learning-rate schedule that stepped up, or numerical overflow in reduced precision. The diagnostic that separates them is cheap — log the batch indices, and a spike that recurs at the same data is a data problem.", "cols": 3, "nodes": [{"id": "s", "label": "A sudden loss spike", "sub": "after stable training", "tone": "warn"}, {"id": "b", "label": "A bad batch", "sub": "outliers, or corrupt labels", "tone": "accent"}, {"id": "l", "label": "The schedule stepped up", "sub": "a warm restart, or a bug", "tone": "accent"}, {"id": "o", "label": "fp16 overflow", "sub": "the scaler should have skipped it", "tone": "accent"}, {"id": "d", "label": "Log the batch indices", "sub": "recurs at the same data?", "tone": "good"}, {"id": "c", "label": "Then clip, or fix the data", "sub": "according to which it was", "tone": "teal"}], "edges": [["s", "b"], ["s", "l"], ["s", "o"], ["b", "d"], ["d", "c"]], "t": "diagram", "id": "dg-7_2-01-0"},



    { t: "out", text: `  step 1000: loss 2.1
  step 1100: loss 1.8
  step 1150: loss 1.7
  step 1160: loss 9.4   <- spike
  step 1170: loss NaN   <- diverged` },

    { t: "p", text: "Training is going well, then the loss jumps and never recovers. The optimiser has left the region it was descending in, and once weights are large the next gradient is larger still — a positive feedback loop that reaches `NaN` within a few steps." },

    { t: "table", head: ["Cause", "Fix"],
      rows: [
        ["Learning rate too high for the current region", "Warmup plus a decay schedule — cosine or linear"],
        ["A pathological batch — outliers, a corrupt sample", "Gradient clipping bounds its damage; also clean the data"],
        ["No warmup on large-batch or transformer training", "Warmup is near-mandatory there"],
        ["Recovering after the fact", "Periodic checkpoints, so you can roll back to before the spike and resume at a lower LR"]
      ] },

    { t: "callout", kind: "good", title: "Checkpoint often enough to roll back, not just to resume",
      body: [{ t: "p", text: "The usual reason to checkpoint is crash recovery, and for that a checkpoint every few hours is fine. Spike recovery has a different requirement: you need a checkpoint from *before* the spike, and you may not notice the spike for a while. On a long run that means checkpointing frequently enough that rolling back costs minutes rather than a day — and keeping several, not just the latest, since the most recent one may already contain the damage. Resuming from a pre-spike checkpoint with a lower learning rate and a different data order is the standard recovery, and on large training runs it is a routine operational event rather than an emergency." }] },

    { t: "h2", n: "02", text: "Warmup and decay", id: "warmup" },

    {"kind": "flow", "title": "Warmup and decay, and what each half is for", "caption": "They solve different problems. **Warmup** protects the first few hundred steps, when the parameters are random and Adam's second-moment estimate is still unreliable, so a full-size step can move the model somewhere it cannot recover from. **Decay** is for the end, when large steps bounce around the minimum instead of settling into it.", "cols": 3, "nodes": [{"id": "s", "label": "Step 0: parameters are random", "sub": "and Adam's v is unreliable", "tone": "warn"}, {"id": "w", "label": "Warmup: ramp the rate up", "sub": "a few hundred to a few thousand steps", "tone": "good"}, {"id": "m", "label": "Mid-training: full rate", "sub": "make progress", "tone": "accent"}, {"id": "d", "label": "Decay: cosine, or step", "sub": "toward the end", "tone": "good"}, {"id": "e", "label": "Large steps bounce at the minimum", "sub": "which decay fixes", "tone": "accent"}, {"id": "b", "label": "Post-norm transformers need both", "sub": "pre-norm tolerates less warmup (4.4)", "tone": "teal"}], "edges": [["s", "w"], ["w", "m"], ["m", "d"], ["d", "e"], ["e", "b"]], "t": "diagram", "id": "dg-7_2-02-1"},



    { t: "code", lang: "python", title: "The standard recipe",
      code: `import math

def lr_at(step, base_lr, warmup, total):
    if step < warmup:
        return base_lr * step / warmup                      # ramp up gently
    p = (step - warmup) / max(1, total - warmup)
    return 0.5 * base_lr * (1 + math.cos(math.pi * p))      # decay smoothly`,
      caption: "Linear ramp then cosine decay. Note `step / warmup` starts at 0, so step 0 has a learning rate of zero — some implementations use `(step + 1)` to avoid a wasted first step." },

    { t: "callout", kind: "insight", title: "Warmup exists because the first gradients are the worst ones",
      body: [{ t: "p", text: "At initialisation the model knows nothing, so its gradients are large and point in directions determined mostly by random weights. Taking full-sized steps on that information moves the weights a long way somewhere arbitrary, and for a deep network that can be somewhere it never recovers from. Warmup lets the model take small steps while its gradients are uninformative and full steps once they mean something. This is the same argument as lesson 2.5's advice to warm up a new classifier head before unfreezing a pretrained backbone, and the same reason lesson 4.4's post-norm transformers need warmup to train at all — there the residual path is normalised at every block, which attenuates gradients to early layers and makes the early steps even more dangerous." }] },

    { t: "p", text: "Large batches make this worse, not better. A larger batch gives a less noisy gradient estimate, which invites a larger learning rate — and a larger step on a still-uninformed model. That is why large-batch training and warmup arrived together." },

    { t: "h2", n: "03", text: "Dead ReLUs", id: "dead" },

    {"kind": "flow", "title": "Dead ReLUs, found by measurement rather than suspicion", "caption": "A dead unit outputs zero for every input in the dataset and therefore receives no gradient ever again (1.2). The way to find them is to **count**: hook the activations and report the fraction of units that are zero across a whole epoch. A few per cent is normal sparsity; forty per cent is a learning rate that was too high earlier in training.", "cols": 3, "nodes": [{"id": "h", "label": "Hook the activations", "sub": "post-ReLU, for one epoch", "tone": "accent"}, {"id": "c", "label": "Count units always zero", "sub": "across every batch", "tone": "accent"}, {"id": "f", "label": "A few per cent: normal", "sub": "that is ReLU's sparsity", "tone": "good"}, {"id": "d", "label": "Forty per cent: a problem", "sub": "the rate was too high earlier", "tone": "crit"}, {"id": "l", "label": "Lower the rate, or warm up", "sub": "prevention, not repair", "tone": "good"}, {"id": "a", "label": "Or leaky / GELU", "sub": "a gradient always survives", "tone": "teal"}], "edges": [["h", "c"], ["c", "f"], ["c", "d"], ["d", "l"], ["l", "a"]], "t": "diagram", "id": "dg-7_2-03-2"},



    { t: "out", text: `  with bias = -5.0: 64 of 64 units output 0 for EVERY input
  gradient to those units' weights: 0.0  <- exactly zero, forever
  with LeakyReLU(0.01) the same units output min -0.076 - nonzero, so gradient still flows` },

    { t: "callout", kind: "crit", title: "Exactly zero gradient means exactly no recovery",
      body: [{ t: "p", text: "A ReLU outputs 0 for negative input and its derivative there is also 0. So if a unit's pre-activation is negative for every example in the data, it emits zero, receives zero gradient, its weights never change, and it stays that way for the rest of training. It is not slow to recover — it **cannot** recover, because the only thing that could change its weights is the gradient it is not receiving. A large learning rate step that drives a bias strongly negative can kill a substantial fraction of a layer in one update, permanently." }] },

    { t: "code", lang: "python", title: "Measure it",
      code: `def dead_relu_fraction(activations):
    """activations: the output of a ReLU layer over a batch, (batch, units)."""
    never_active = (activations <= 0).all(dim=0)
    return never_active.float().mean().item()      # 0.4 = 40% of this layer is dead`,
      caption: "Run it on a validation batch every so often. A few per cent is normal and healthy; a large and growing fraction means the learning rate is too high." },

    { t: "table", head: ["Fix", "How it helps"],
      rows: [
        ["Lower the learning rate", "Prevents the large step that drives pre-activations strongly negative"],
        ["He initialisation", "Starts pre-activations centred, so roughly half are positive from the outset"],
        ["**LeakyReLU, GELU, ELU**", "A non-zero slope for negative input means the gradient is never exactly zero — recovery stays possible"],
        ["BatchNorm", "Re-centres pre-activations each batch, so a unit cannot drift permanently negative"]
      ] },

    { t: "callout", kind: "mental", title: "GELU is the transformer's answer to the same problem",
      body: [{ t: "p", text: "GELU is smooth and has a small negative response rather than a hard zero, so it shares LeakyReLU's property that gradient never vanishes exactly. That is part of why it became standard in transformers, alongside being a better empirical fit. The general principle is worth holding: **an activation with an exactly-zero derivative region has an absorbing state**, and any unit that enters it is lost. Whether that matters depends on how often units enter it, which is governed by the learning rate and the initialisation — which is why dead ReLUs are a symptom rather than a root cause." }] },

    { t: "callout", kind: "trap", title: "Training without warm-up at a high learning rate",

      body: [

        { t: "p", text: "The first gradients are the least reliable, and a full learning rate from step one can push weights into a region the model never recovers from — a spike, or units that die permanently." },

        { t: "p", text: "Ramp the learning rate up over the first few hundred to few thousand steps, and log the dead-unit fraction early in training." }

      ] },


    { t: "exercise", kind: "practice", title: "Kill a network, then prevent it", difficulty: "intermediate", minutes: 35,
      prompt: "Train a ReLU network and log the dead fraction per layer every epoch at three learning rates — one healthy, one aggressive, one clearly too high. Plot dead fraction against step for each. Then repeat the aggressive setting with LeakyReLU and with BatchNorm added, and see which prevents the deaths. Separately, train with and without warmup at a learning rate that spikes without it, and compare the loss curves over the first 500 steps.",
      requirements: [
        "Train a ReLU network at a healthy, an aggressive and a too-high learning rate",
        "Log and plot the dead fraction per layer",
        "Repeat the aggressive setting with LeakyReLU and with BatchNorm",
        "Compare the first 500 steps with and without warm-up"
      ],
      hints: [
        "Compute the dead fraction on a fixed validation batch so it is comparable across steps.",
        "The aggressive learning rate should kill units early and then plateau — the survivors are stable.",
        "For the warmup comparison, use a transformer or a deep stack, where the effect is largest."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.datasets import load_digits

X, y = load_digits(return_X_y=True)
X = torch.tensor(X / 16.0, dtype=torch.float32); y = torch.tensor(y)

def net(act="relu", bn=False):
    layers = []
    for i, o in [(64, 256), (256, 256), (256, 256)]:
        layers += [nn.Linear(i, o)] + ([nn.BatchNorm1d(o)] if bn else []) + [nn.ReLU() if act == "relu" else nn.LeakyReLU(0.01)]
    return nn.Sequential(*layers, nn.Linear(256, 10))

def dead_fraction(m):
    """share of units in each hidden layer that output <= 0 for every training example
    (for LeakyReLU such a unit still has gradient 0.01, so it can recover)"""
    out, h = [], X
    with torch.no_grad():
        for layer in m:
            h = layer(h)
            if isinstance(layer, (nn.ReLU, nn.LeakyReLU)): out.append((h <= 0).all(0).float().mean().item())
    return out

def run(lr, act="relu", bn=False, warmup=0, steps=600, log=(0, 50, 200, 600)):
    torch.manual_seed(0); m = net(act, bn); opt = torch.optim.SGD(m.parameters(), lr, momentum=0.9)
    rows, losses = [], []
    for step in range(1, steps + 1):
        for g in opt.param_groups: g["lr"] = lr * min(1.0, step / warmup) if warmup else lr
        idx = torch.randint(0, len(X), (64,))
        m.train(); loss = F.cross_entropy(m(X[idx]), y[idx]); opt.zero_grad(); loss.backward(); opt.step()
        losses.append(loss.item())
        if step in log: m.eval(); rows.append((step, dead_fraction(m)))
    return rows, losses

for name, kw in [("healthy lr 0.01", dict(lr=0.01)), ("aggressive lr 0.3", dict(lr=0.3)), ("too high lr 1.0", dict(lr=1.0)),
                 ("aggressive + LeakyReLU", dict(lr=0.3, act="leaky")), ("aggressive + BatchNorm", dict(lr=0.3, bn=True))]:
    rows, losses = run(**kw)
    if losses[-1] != losses[-1]:
        print(f"{name:<24} diverged to NaN at step {next(i for i, l in enumerate(losses, 1) if l != l)}; dead fraction at step 50: " + "/".join(f"{v:.2f}" for v in rows[0][1])); continue
    print(f"{name:<24} dead fraction per layer at steps 50 / 200 / 600: " +
          "  ".join("/".join(f"{v:.2f}" for v in d) for s, d in rows if s in (50, 200, 600)) + f"   final loss {sum(losses[-50:]) / 50:.3f}")

print("\\nfirst 500 steps at lr 0.3: max loss / mean loss over steps 400-500")
for wu in [0, 200]:
    _, losses = run(0.3, warmup=wu, steps=500, log=())
    print(f"  {'warm-up 200 steps' if wu else 'no warm-up       '}: {max(losses):10.3g} / {sum(losses[400:]) / 100:.3f}")`,
        out: `healthy lr 0.01          dead fraction per layer at steps 50 / 200 / 600: 0.02/0.08/0.14  0.02/0.12/0.14  0.02/0.09/0.10   final loss 0.093
aggressive lr 0.3        dead fraction per layer at steps 50 / 200 / 600: 0.26/0.16/0.08  0.68/0.26/0.36  0.91/0.75/0.95   final loss 1.980
too high lr 1.0          diverged to NaN at step 35; dead fraction at step 50: 0.93/0.00/0.00
aggressive + LeakyReLU   dead fraction per layer at steps 50 / 200 / 600: 0.32/0.11/0.08  0.69/0.04/0.23  0.75/0.01/0.35   final loss 0.330
aggressive + BatchNorm   dead fraction per layer at steps 50 / 200 / 600: 0.00/0.00/0.00  0.00/0.00/0.00  0.00/0.00/0.00   final loss 0.004

first 500 steps at lr 0.3: max loss / mean loss over steps 400-500
  no warm-up       :       43.3 / 2.002
  warm-up 200 steps:        2.3 / 0.215`,
       
        notes: [
          { t: "p", text: "The dead-fraction curve typically rises sharply in the first few hundred steps and then flattens, which tells you something useful: the deaths happen early, while gradients are large and uninformed, and the units that survive that phase mostly keep surviving. That is exactly the window warmup protects, so the two fixes are addressing the same moment in training from different angles." },
          { t: "p", text: "LeakyReLU should prevent permanent death entirely — units can be driven negative and still recover, because the gradient is small rather than zero. BatchNorm helps differently, by re-centring pre-activations each batch so a unit cannot drift permanently into the negative region. Seeing which one your setup needs is informative: if BatchNorm fixes it, the problem was drift; if only LeakyReLU does, individual large steps were killing units outright." },
          { t: "p", text: "The warmup comparison is starkest on a deep transformer, where without it the loss frequently spikes within the first few hundred steps and does not recover. With warmup the same configuration trains smoothly. It is worth doing once because warmup looks like a minor scheduling detail until you have watched a run die without it, and then it becomes obvious why it is standard for anything deep or large-batch." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: a loss spike that ended a week-long run",
      body: [
        { t: "p", text: "**Symptom.** A large training run diverged on day five after a sudden loss spike, and the last checkpoint was days old." },
        { t: "p", text: "**Mechanism.** A batch with unusual data produced a large gradient, and with no warm-up or clipping the update pushed the model into a bad region it never left." },
        { t: "p", text: "**Fix.** The run uses learning-rate warm-up, gradient clipping chosen from logged norms, and frequent checkpoints, with automatic rollback when the loss jumps." }
      ] }
  ],

  takeaways: [
    "A loss spike means the optimiser left the good region; weights grow, gradients grow, and NaN follows in a few steps.",
    "Causes: LR too high for the region, a pathological batch, or no warmup on transformer or large-batch training.",
    "Checkpoint frequently enough to roll back to *before* a spike, and keep several, not just the latest.",
    "Warmup exists because the earliest gradients are large and uninformed — the same argument as warming up a new head.",
    "Large batches invite larger learning rates, which makes warmup more necessary rather than less.",
    "A dead ReLU has exactly zero gradient, so it cannot recover — measured at 64 of 64 units with a bias of −5.",
    "LeakyReLU, GELU and ELU have no exactly-zero derivative region, so recovery stays possible."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why can a dead ReLU never recover?",
      options: ["Its weights are set to zero", "Its gradient is exactly zero", "It is removed from the graph", "The optimiser skips it"],
      answer: 1,
      why: "ReLU's derivative is 0 for negative input, so a unit whose pre-activation is negative for every example emits zero and receives exactly zero gradient. The only thing that could change its weights is the gradient it is not receiving — measured as exactly 0.0 for all 64 units in a layer with a strongly negative bias." },
    { stem: "Why is warmup near-mandatory for transformer training?",
      options: ["Transformers have more parameters", "Early gradients are large and uninformed", "It speeds up convergence in general", "Attention requires it numerically"],
      answer: 1,
      why: "At initialisation the model knows nothing, so full-sized steps move weights a long way in essentially arbitrary directions. Post-norm transformers make it worse because the residual path is normalised at every block, attenuating gradients reaching early layers — which is exactly why the original paper's schedule includes a warmup term." },
    { stem: "Which activation cannot produce permanently dead units?",
      options: ["ReLU", "LeakyReLU", "Hard sigmoid", "Step function"],
      answer: 1,
      why: "LeakyReLU has a small non-zero slope for negative input, so the gradient is never exactly zero and a unit driven negative can still recover. GELU and ELU share that property, which is part of why GELU became standard in transformers. Any activation with an exactly-zero derivative region has an absorbing state." },
    { stem: "Your loss spikes at step 1160 and reaches NaN by 1170. What is the recovery?",
      options: ["Restart training from scratch", "Roll back, resume at a lower LR", "Increase the batch size instead", "Switch to another optimiser"],
      answer: 1,
      why: "The weights are poisoned, so continuing is futile, but the run before the spike was healthy. Rolling back to a pre-spike checkpoint and resuming with a lower LR and a different data order is the standard recovery — which requires checkpointing often enough, and keeping several, since the most recent may already contain the damage." }
  ] },

  interview: { title: "Interview", sub: "Spikes and dead units", questions: [
    { level: "Core", q: "What causes a loss spike and how do you handle it?",
      strong: "LR too high for the region or a bad batch; warmup, clipping, and roll back to a pre-spike checkpoint.",
      answer: [{ t: "p", text: "A spike means the optimiser has stepped out of the region it was descending in, and once the weights are large the next gradient is larger too, so it feeds back and reaches NaN within a handful of steps. The usual causes are a learning rate that is fine early and too high for the current region, a pathological batch containing outliers or a corrupt sample, or no warmup on a transformer or large-batch run. Preventively: warmup plus a cosine or linear decay, and gradient clipping, which bounds what any single bad batch can do. For recovery, roll back to a checkpoint from before the spike and resume with a lower learning rate and a different data order — which means checkpointing frequently enough that rollback costs minutes, and keeping several checkpoints rather than only the latest, since the most recent may already contain the damage. On large runs this is a routine operational event rather than a crisis." }] },
    { level: "Senior", q: "Why does warmup help, and how would you set its length?",
      strong: "It protects the phase where gradients are large and uninformed; length scales with how unstable the setup is.",
      answer: [{ t: "p", text: "At initialisation the model has learned nothing, so its gradients are large and point in directions determined mostly by random weights. Full-sized steps on that information move the parameters a long way somewhere essentially arbitrary, and in a deep network that can be somewhere training never recovers from — which shows up as either a dead run or, more quietly, a large fraction of units killed in the first few hundred steps. Warmup takes small steps while the gradients are uninformative and full steps once they mean something. For length, the usual range is a few hundred to a few thousand steps, and I would scale it with how unstable the setup is: deeper models, larger batches and post-norm transformers all need more, because larger batches invite larger peak learning rates and post-norm attenuates gradients to early layers. I would set it empirically rather than by rule — run without warmup first, see whether and when it spikes, and choose a warmup comfortably longer than that. And I would plot the realised learning rate per step, because schedule bugs where warmup silently never fires are common and invisible." }] },
    { level: "Senior", q: "How would you detect and prevent dead ReLUs?",
      strong: "Measure the fraction of units zero across a whole batch; fix with LR, init, and a leaky activation.",
      answer: [{ t: "p", text: "Detection is a one-liner: for a ReLU layer's activations over a batch, count the units that are zero for every example, and report that fraction per layer. A few per cent is normal; a large or growing fraction means trouble. The reason it matters is that the death is permanent — ReLU's derivative is exactly zero for negative input, so a unit whose pre-activation is always negative receives exactly zero gradient and nothing can revive it. I have measured a whole 64-unit layer dying from a strongly negative bias, with gradient exactly 0.0. For prevention, the root cause is usually a learning rate large enough to drive pre-activations strongly negative in one step, so lowering it is the first fix, and He initialisation keeps them centred to begin with. Structurally, LeakyReLU, GELU or ELU have a small negative slope so the gradient is never exactly zero and recovery stays possible, and BatchNorm re-centres pre-activations each batch so a unit cannot drift permanently negative. Which of those helps tells you whether the cause was single large steps or gradual drift." }] }
  ] }
});

/* ============================================================================
   LESSON 7.2 — Loss Spikes, Divergence and Dead Neurons
   Mirrors 30_DL_Training_Instability.md · §3, §4. Dead-ReLU behaviour
   measured (scratchpad/dl/d71.py).
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

    { t: "exercise", kind: "practice", title: "Kill a network, then prevent it", difficulty: "intermediate", minutes: 35,
      prompt: "Train a ReLU network and log the dead fraction per layer every epoch at three learning rates — one healthy, one aggressive, one clearly too high. Plot dead fraction against step for each. Then repeat the aggressive setting with LeakyReLU and with BatchNorm added, and see which prevents the deaths. Separately, train with and without warmup at a learning rate that spikes without it, and compare the loss curves over the first 500 steps.",
      hints: [
        "Compute the dead fraction on a fixed validation batch so it is comparable across steps.",
        "The aggressive learning rate should kill units early and then plateau — the survivors are stable.",
        "For the warmup comparison, use a transformer or a deep stack, where the effect is largest."
      ],
      solution: {
        notes: [
          { t: "p", text: "The dead-fraction curve typically rises sharply in the first few hundred steps and then flattens, which tells you something useful: the deaths happen early, while gradients are large and uninformed, and the units that survive that phase mostly keep surviving. That is exactly the window warmup protects, so the two fixes are addressing the same moment in training from different angles." },
          { t: "p", text: "LeakyReLU should prevent permanent death entirely — units can be driven negative and still recover, because the gradient is small rather than zero. BatchNorm helps differently, by re-centring pre-activations each batch so a unit cannot drift permanently into the negative region. Seeing which one your setup needs is informative: if BatchNorm fixes it, the problem was drift; if only LeakyReLU does, individual large steps were killing units outright." },
          { t: "p", text: "The warmup comparison is starkest on a deep transformer, where without it the loss frequently spikes within the first few hundred steps and does not recover. With warmup the same configuration trains smoothly. It is worth doing once because warmup looks like a minor scheduling detail until you have watched a run die without it, and then it becomes obvious why it is standard for anything deep or large-batch." }
        ]
      } }

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
      options: ["Its weights are set to zero", "Its gradient is exactly zero, so nothing can change the weights that would revive it", "It is removed from the graph", "The optimiser skips it"],
      answer: 1,
      why: "ReLU's derivative is 0 for negative input, so a unit whose pre-activation is negative for every example emits zero and receives exactly zero gradient. The only thing that could change its weights is the gradient it is not receiving — measured as exactly 0.0 for all 64 units in a layer with a strongly negative bias." },
    { stem: "Why is warmup near-mandatory for transformer training?",
      options: ["Transformers have more parameters", "The earliest gradients are large and uninformed, and post-norm residuals attenuate gradients to early layers further", "It speeds up convergence", "Attention requires it numerically"],
      answer: 1,
      why: "At initialisation the model knows nothing, so full-sized steps move weights a long way in essentially arbitrary directions. Post-norm transformers make it worse because the residual path is normalised at every block, attenuating gradients reaching early layers — which is exactly why the original paper's schedule includes a warmup term." },
    { stem: "Which activation cannot produce permanently dead units?",
      options: ["ReLU", "LeakyReLU", "Hard sigmoid", "Step function"],
      answer: 1,
      why: "LeakyReLU has a small non-zero slope for negative input, so the gradient is never exactly zero and a unit driven negative can still recover. GELU and ELU share that property, which is part of why GELU became standard in transformers. Any activation with an exactly-zero derivative region has an absorbing state." },
    { stem: "Your loss spikes at step 1160 and reaches NaN by 1170. What is the recovery?",
      options: ["Restart training from scratch", "Roll back to a checkpoint from before the spike and resume at a lower learning rate", "Increase the batch size", "Switch optimiser"],
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

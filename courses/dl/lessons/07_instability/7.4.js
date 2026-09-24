/* ============================================================================
   LESSON 7.4 — Monitoring, Decision Flow and the Production Checklist
   Mirrors 30_DL_Training_Instability.md · Monitoring through Checklist.
   Closes the deep learning learn track.
   ========================================================================= */
EC.receiveLesson({
  id: "7.4",

  lede: "**Most instabilities are visible before the loss goes NaN — if you are logging the right eight numbers.** This lesson is the operational close of the module and of the track: what to watch, how to go from a symptom to a cause, and the checklist to run before committing a long training job to expensive hardware. None of it is sophisticated. All of it is the difference between losing an afternoon and losing a week of GPU time.",

  objectives: [
    "Name the signals worth logging and what healthy looks like for each",
    "Navigate from a symptom to a likely cause systematically",
    "Set up an auto-abort so a dead run stops consuming hardware",
    "Run a pre-flight checklist before a long training job"
  ],

  prerequisites: ["7.3"],

  blocks: [

    { t: "h2", n: "01", text: "What to log", id: "monitoring" },

    { t: "table", head: ["Signal", "Healthy", "Trouble"],
      rows: [
        ["**Loss**", "Smooth decrease", "Spikes, NaN, flat"],
        ["**Gradient norm**", "Stable band", "→1e6 (explode) / →1e-7 (vanish)"],
        ["**Weight / activation norms**", "Steady", "Growing unbounded"],
        ["**Learning rate**", "Follows the schedule", "Sanity-check warmup and decay actually fire"],
        ["**Dead-unit fraction**", "Low", "Rising or large"],
        ["**GPU utilisation**", "> 85 %", "< 50 % means dataloader bound"],
        ["**Per-rank step time**", "Uniform", "One slow rank is a straggler"],
        ["**Loss scale (fp16)**", "Stable and high", "Repeatedly halving means overflow"]
      ] },

    { t: "callout", kind: "insight", title: "The gradient norm leads the loss",
      body: [{ t: "p", text: "The reason to log these rather than only the loss is that the loss is a lagging indicator. A gradient norm climbing from 1e2 to 1e4 over a hundred steps is a run that will spike, and it is visible well before the loss moves — which means it is visible while you can still intervene by lowering the learning rate or rolling back. By the time the loss itself spikes, the weights are already somewhere bad. The same holds for the loss scale in fp16 and for the dead-unit fraction: both degrade gradually and are readable long before they produce a symptom in the metric everyone watches." }] },

    { t: "callout", kind: "good", title: "Auto-abort on NaN",
      body: [{ t: "p", text: "Set the run to terminate if the loss is non-finite for more than a handful of steps. Once a NaN is in the weights the run is dead — nothing recovers it — and the only question is how many GPU-hours it burns before a human notices. On a cluster that can be overnight, or over a weekend. It is a few lines, it costs nothing, and it is the single highest-return piece of training infrastructure relative to effort. Pair it with a notification, so the failure reaches someone rather than just stopping." }] },

    { t: "h2", n: "02", text: "From symptom to cause", id: "decision" },

    { t: "diagram", kind: "tree", title: "Decision flow",
      caption: "Start from what you observe, not from what you suspect. The branch you land on determines which fix is worth trying.",
      root: { label: "Training broke?", children: [
        { label: "Loss is NaN", children: [
          { label: "From step ~1 → LR or data", tone: "crit" },
          { label: "Only with AMP → fp16 overflow", tone: "warn" },
          { label: "After a while → exploding grads", tone: "warn" }
        ] },
        { label: "Loss flat", children: [
          { label: "Vanishing, dead ReLUs, LR too low", tone: "accent" }
        ] },
        { label: "Spikes then diverges", children: [
          { label: "Warmup, decay, clipping, rollback", tone: "accent" }
        ] },
        { label: "Multi-GPU", children: [
          { label: "Hangs → NCCL collective mismatch", tone: "crit" },
          { label: "Slow → straggler or dataloader", tone: "warn" }
        ] }
      ] } },

    { t: "dl", items: [
      ["NaN from step ~1", "The problem is present before learning: learning rate far too high, or bad data — `log(0)`, division by zero, unnormalised inputs. Check the data first; it is the more common of the two and the cheaper to rule out."],
      ["NaN only with AMP", "fp16 overflow. Loss scaling, or switch to bf16, which has float32's range."],
      ["NaN after a while", "Exploding gradients that built up. Clipping plus warmup, and roll back to the last good checkpoint."],
      ["Loss flat from the start", "Vanishing gradients, dead ReLUs, a learning rate too low, or a missing non-linearity. The gradient norm distinguishes these immediately."],
      ["Spike then divergence", "Warmup and decay, clipping, and checkpoints frequent enough to roll back past it."]
    ] },

    { t: "callout", kind: "mental", title: "The timing of the failure narrows the cause more than anything else",
      body: [{ t: "p", text: "A NaN at step 1 and a NaN at step 10,000 have almost disjoint cause sets. The first means something was wrong before any learning happened — data, initialisation, or a learning rate so high the first update overshoots — and it is cheap to diagnose because you can reproduce it immediately with one batch. The second means the run was healthy and something accumulated, which points at exploding gradients, a pathological batch, or numerical drift, and requires the logs to diagnose. Asking *when* before asking *why* saves a great deal of time, and it is the first question worth asking about any training failure." }] },

    { t: "h2", n: "03", text: "The pre-flight checklist", id: "checklist" },

    { t: "p", text: "Before committing a long job to expensive hardware, confirm each of these. Most are one line and every one of them has cost somebody a week." },

    { t: "table", head: ["", "Check"],
      rows: [
        ["Data", "Inputs normalised; scanned for `inf`, `nan`, `log(0)` and divide-by-zero **before** training"],
        ["Init", "Appropriate for the activation — He for ReLU, Xavier for tanh"],
        ["Depth", "Normalisation layers and/or residual connections present in deep stacks"],
        ["Gradients", "Clipping enabled, e.g. max-norm 1.0 — with the threshold chosen from observed norms"],
        ["Schedule", "Warmup plus decay, especially for transformers or large batch"],
        ["Logging", "Gradient norm and loss every N steps; **auto-abort on NaN**"],
        ["Precision", "Loss scaling for fp16, or bf16; verified no NaNs on a short run"],
        ["Activations", "Dead-unit fraction monitored on deep ReLU stacks"],
        ["Checkpoints", "Periodic, atomic write, **reload-tested**"],
        ["Distributed", "Identical collectives per rank, NCCL timeout set, per-rank step time monitored"],
        ["Sharding", "Framework sharded-checkpoint API for large models, reload verified"],
        ["Throughput", "GPU utilisation monitored; dataloader tuned if under 50 %"],
        ["Reproducibility", "Seeds set, run configuration logged"]
      ] },

    { t: "callout", kind: "crit", title: "Reload-test your checkpoints before you need them",
      body: [{ t: "p", text: "Of everything on that list, this is the one that fails most expensively. A checkpoint that saves without error but cannot be loaded — the wrong shard, a partial write, a missing optimiser state, a version mismatch — is indistinguishable from a good one until the moment you need it, which is by definition after something has already gone wrong. Save a checkpoint in the first few minutes of a run, load it into a fresh process, and confirm the model produces identical outputs. It takes two minutes and it converts your entire checkpointing strategy from an assumption into a fact." }] },

    { t: "h2", n: "04", text: "Closing the track", id: "closing" },

    { t: "p", text: "That completes the deep learning learn track: foundations, convolutional networks, sequence models, transformers, the reference cards, audio and speech, and training stability. A few threads ran through all of it and are worth naming once more." },

    { t: "dl", items: [
      ["Path length governs learning", "Residual connections, gated cells and attention all shorten or cheapen the gradient's route between distant points. Ask this of any new architecture."],
      ["Additive beats multiplicative", "`H(x) = F(x) + x` and `C_t = f⊙C_{t−1} + i⊙g` are the same idea in different clothes — a derivative of 1 rather than a product of matrices."],
      ["Inductive bias is a data budget", "Structure you build in is structure you need not learn. Weaker assumptions need more data and reward it with a higher ceiling."],
      ["Measure the baseline you would be embarrassed to lose to", "Gradient boosting on tabular data, persistence on forecasting, the majority class on classification. Several of this course's most useful findings came from adding one."],
      ["Silent failures outnumber loud ones", "Softmax applied twice, a scaler fitted before splitting, a missing causal mask, `h_n` on padded sequences, `center=True` on a rolling window. None raise. All produce plausible numbers."]
    ] },

    { t: "exercise", kind: "practice", title: "Build the harness you will reuse", difficulty: "intermediate", minutes: 45,
      prompt: "Write a reusable training harness containing every item from the checklist: finite-value guards on logits, loss and gradient norm; gradient clipping with a threshold chosen from logged norms; warmup and cosine decay; per-step logging of loss, gradient norm, learning rate and dead-unit fraction; auto-abort after K non-finite steps; and atomic checkpointing with a reload test on the first checkpoint. Then deliberately break a training run four ways and confirm your harness catches each at the right place with a useful message.",
      hints: [
        "Make the guards raise with the tensor's name, not a generic message.",
        "The reload test should compare outputs on a fixed batch, not just load without error.",
        "Four good breakages: unnormalised inputs, LR 100× too high, a NaN injected into one sample, and fp16 without a scaler."
      ],
      solution: {
        notes: [
          { t: "p", text: "The value of building this once is that every future project starts with it, and the instrumentation is what turns a mysterious failure into a diagnosed one. The specific thing worth getting right is that guards should name what failed — `logits has NaN/Inf` rather than an assertion error — because when this fires at three in the morning on a cluster, the message is all you have to work with." },
          { t: "p", text: "The reload test is the item people skip and should not. Loading without an exception is not the test; producing identical outputs on a fixed batch is. That catches partial writes, missing optimiser state, and the sharded-checkpoint mistake where you saved one rank's fragment. Two minutes at the start of a run, against the possibility of discovering at week three that nothing is recoverable." },
          { t: "p", text: "For the four breakages, note that they surface differently: unnormalised inputs give a growing loss rather than an immediate NaN, the excessive learning rate gives a spike, an injected NaN propagates instantly and should be caught at the logits guard, and fp16 without a scaler gives gradients that silently underflow to zero with no NaN anywhere. That last one is the argument for logging the gradient norm rather than relying on finite checks — a run where half the gradients are exactly zero passes every `isfinite` assertion you have." }
        ]
      } }

  ],

  takeaways: [
    "Log eight signals: loss, gradient norm, weight and activation norms, LR, dead-unit fraction, GPU utilisation, per-rank step time, loss scale.",
    "The gradient norm leads the loss — a climb from 1e2 to 1e4 is visible while you can still intervene.",
    "Auto-abort on NaN: once it is in the weights the run is dead, and the only question is how many GPU-hours it burns.",
    "Ask *when* the failure happened before asking why — step 1 and step 10,000 have almost disjoint causes.",
    "NaN at step 1 means data or learning rate; only under AMP means fp16 overflow; after a while means exploding gradients.",
    "Reload-test checkpoints in the first minutes of a run, comparing outputs rather than just loading.",
    "Across the whole track: path length governs learning, additive beats multiplicative, inductive bias is a data budget, and silent failures outnumber loud ones."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why log the gradient norm rather than relying on the loss?",
      options: ["The loss is expensive to compute", "The gradient norm is a leading indicator — it climbs before the loss spikes, while you can still intervene", "The loss is inaccurate", "It replaces the need for clipping"],
      answer: 1,
      why: "A gradient norm rising from 1e2 to 1e4 over a hundred steps is a run that will spike, and it is readable well before the loss moves. By the time the loss spikes, the weights are already somewhere bad. It also catches the fp16 case where gradients underflow to exactly zero, which passes every `isfinite` check." },
    { stem: "Your loss is NaN from step 1. What are the likely causes?",
      options: ["Exploding gradients accumulated over time", "Learning rate far too high, or bad data — log(0), division by zero, unnormalised inputs", "A straggler GPU", "Dead ReLUs"],
      answer: 1,
      why: "A failure present before any learning has happened points at the inputs or the very first update, not at accumulation. It is also cheap to diagnose, because you can reproduce it immediately on one batch. A NaN appearing after thousands of healthy steps has an almost disjoint cause set — exploding gradients, a pathological batch, numerical drift." },
    { stem: "What is the right test for a checkpoint?",
      options: ["That it saves without error", "That it loads in a fresh process and produces identical outputs on a fixed batch", "That the file size looks right", "That the path exists"],
      answer: 1,
      why: "Saving without error and having a plausible file size are both true of a checkpoint that holds one shard of a sharded model, or a partial write, or one missing optimiser state. None of those is discoverable until you need it — which is always after something has already gone wrong. Comparing outputs is the only test that actually verifies recoverability." },
    { stem: "You are training in fp16 without a GradScaler. What symptom should you expect?",
      options: ["Immediate NaN", "Gradients silently underflowing to zero, so training is slow and no finite check fires", "GPU memory errors", "Slower training"],
      answer: 1,
      why: "fp16's smallest normal value is about 6.1e-05, so a gradient of 1e-08 becomes exactly zero. Zero is finite, so every `isfinite` assertion passes while affected parameters simply receive no update. The symptom is disappointing convergence with nothing to point at — which is why the gradient norm belongs in your logs." }
  ] },

  interview: { title: "Interview", sub: "Training operations", questions: [
    { level: "Core", q: "What do you monitor during a long training run?",
      strong: "Loss, gradient norm, LR, dead-unit fraction, GPU utilisation, and loss scale — with auto-abort on NaN.",
      answer: [{ t: "p", text: "The loss, obviously, but it is a lagging indicator so the more useful one is the global gradient norm every step — a stable band is health, a climb towards 1e6 is explosion, a decay towards 1e-7 is vanishing, and it moves before the loss does, which means you can still intervene. It costs nothing if you are clipping, since `clip_grad_norm_` returns the pre-clip norm. Alongside that: weight and activation norms to catch unbounded growth, the learning rate itself to confirm the schedule actually fires, the dead-unit fraction on deep ReLU stacks, GPU utilisation where under 50 per cent means the dataloader rather than the model, per-rank step time to catch stragglers, and for fp16 the loss scale, which repeatedly halving means it is fighting real overflow. And an auto-abort if the loss is non-finite for more than a few steps, because once a NaN is in the weights nothing recovers and the only variable left is how many GPU-hours it burns before someone notices." }] },
    { level: "Senior", q: "How do you approach a training run that is not learning?",
      strong: "Establish when it failed, then use the gradient norm to separate vanishing from a too-low LR from a missing non-linearity.",
      answer: [{ t: "p", text: "First, when — a model that never learned anything and one that learned and then stopped have different cause sets, and that question narrows things faster than any other. For a flat loss from the start, the gradient norm separates the possibilities immediately: near zero means vanishing gradients or dead units, healthy but with no loss movement means the learning rate is too low, and a model plateauing at exactly linear-regression performance means a missing non-linearity, which I would check by comparing against a linear baseline. Then I would try to overfit a single batch deliberately — if the model cannot drive the loss to near zero on ten examples, the problem is in the model or the data pipeline rather than in optimisation, and that distinction saves a lot of wasted tuning. After that the usual suspects: unnormalised inputs, a learning rate wrong by orders of magnitude, and for anything deep, whether initialisation is appropriate for the activation, since I have measured a thirty-layer network's output norm spanning sixteen orders of magnitude on initialisation gain alone." }] },
    { level: "Senior", q: "What would you put in place before starting an expensive multi-week training run?",
      strong: "Instrumentation, auto-abort, reload-tested checkpoints, and a short shakedown run at full scale.",
      answer: [{ t: "p", text: "A short run at full scale first — same model, same distributed setup, same precision, just a few hundred steps — because most of what kills a long run kills it in the first ten minutes if it is going to, and finding out then costs nothing. Within that: gradient norm and loss logged every step with an auto-abort on non-finite loss, so a dead run stops rather than burning the cluster over a weekend. Checkpoints written atomically and, critically, reload-tested in a fresh process comparing outputs on a fixed batch rather than merely loading without error, because a checkpoint that cannot be restored is indistinguishable from a good one until the moment you need it. Frequent enough checkpoints to roll back past a loss spike, keeping several rather than only the latest. For distributed, a collective timeout set so a hang fails loudly, and per-rank step time logged. And seeds and the full run configuration recorded, because a run you cannot reproduce is a run you cannot debug after the fact." }] }
  ] }
});

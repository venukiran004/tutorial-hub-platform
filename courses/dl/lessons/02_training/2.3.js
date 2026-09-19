/* ============================================================================
   LESSON 2.3 — The Loop Toolkit
   ========================================================================= */
EC.receiveLesson({
  id: "2.3",

  lede: "**A training loop that works is six lines; a training loop you can leave running overnight is those six lines plus a dozen things around them, each of which is small and each of which has a way to be wrong.** Gradient accumulation is exact to 10⁻⁸ — if you divide the loss by the number of micro-batches and the model has no BatchNorm. A checkpoint that saves the model but not the optimiser resumes onto a different trajectory (weights 0.04 apart after a hundred steps). Activation checkpointing recomputes a quarter of the forward pass to save five sixths of the activation memory. Everything on this page is run, including the thing that does not work on this machine.",

  objectives: [
    "Implement gradient accumulation and prove it equals a large batch — and show when it does not",
    "Write early stopping and reduce-on-plateau as small classes with a patience and a restored best state",
    "Maintain an EMA of the weights and an SWA average, and read what they did on a noisy run",
    "Save a checkpoint that resumes exactly — model, optimiser, scheduler, step and RNG — and show what breaks without each part",
    "Use activation checkpointing, the profiler, a FLOP count, a custom loss module and torch.compile, with their costs measured"
  ],

  prerequisites: ["2.2", "1.8"],

  blocks: [

    { t: "h2", n: "01", text: "Gradient accumulation", id: "accumulation" },

    { t: "p", text: "When the batch you want does not fit in memory, run several smaller micro-batches, let their gradients accumulate in .grad (1.4), and step once. Because the loss is a mean over the batch, each micro-batch's loss must be divided by the number of micro-batches — otherwise the accumulated gradient is the sum, not the mean:" },

    { t: "code", lang: "python", title: "Four micro-batches of 16 against one batch of 64 (executed)",
      code: `opt.zero_grad()
for k in range(4):
    sub = idx[k*16:(k+1)*16]
    (F.cross_entropy(net(X[sub]), y[sub]) / 4).backward()     # /4: the mean over 64, assembled in pieces
opt.step()

max |accumulated − batch 64| = 1.02e-08          -- exact, to float32 rounding
without the /4:  the accumulated gradient is 4.00× too large -- the learning rate silently quadruples`,
      caption: "The optimiser is stepped once per accumulation cycle and the scheduler with it. The effective batch is 64 for the gradient and 16 for anything that depends on the batch itself — which is the catch." },

    { t: "callout", kind: "warn", title: "Accumulation is not exact with BatchNorm",
      body: "BatchNorm normalises each micro-batch with its own statistics, so four micro-batches of 16 see four different normalisations where one batch of 64 sees one. Measured (exercise): the accumulated gradient differs from the full-batch gradient by up to 0.042 with cosine similarity 0.96, against 10⁻⁸ for the same network in eval mode. It still trains, but the effective BatchNorm batch is the micro-batch, and at micro-batches of 2 or 4 that is the failure in lesson 1.6. GroupNorm or LayerNorm restore exactness; so does SyncBatchNorm across devices." },

    { t: "h2", n: "02", text: "Early stopping and reduce-on-plateau", id: "stopping" },

    { t: "code", lang: "python", title: "Early stopping as a class (executed)",
      code: `class EarlyStopping:
    def __init__(self, patience=5, min_delta=0.0):
        self.patience, self.min_delta = patience, min_delta
        self.best = -float("inf"); self.bad = 0; self.best_state = None
    def step(self, metric, net):                      # call once per epoch with the validation metric
        if metric > self.best + self.min_delta:
            self.best = metric; self.bad = 0
            self.best_state = copy.deepcopy(net.state_dict()); return False
        self.bad += 1
        return self.bad >= self.patience               # True: stop

300 training digits, Adam, patience 10:
  stopped at epoch 37, best validation 0.946
  test accuracy at the stopping epoch 0.928;  after restoring the best state 0.937`,
      caption: "Two details that are usually wrong: the state must be deep-copied (a reference follows the live weights, 2.2), and the weights must be restored — the stopping epoch is ten epochs past the best one by construction, and it scored a point lower here." },

    { t: "code", lang: "python", title: "Reduce-on-plateau by hand (executed, exercise)",
      code: `class ReduceOnPlateau:
    def step(self, metric, epoch):
        if metric > self.best: self.best = metric; self.bad = 0
        else:
            self.bad += 1
            if self.bad >= self.patience:
                for g in self.opt.param_groups: g["lr"] = max(g["lr"] * self.factor, self.min_lr)
                self.bad = 0

SGD 0.1 momentum, factor 0.1, patience 3:  reductions at epochs 12 (→0.01), 17 (→0.001), 20 (→1e-4), 23 (→1e-5, the floor)
test accuracy every 5 epochs: 0.950 0.957 0.976 0.976 0.976 …`,
      caption: "The first reduction, from 0.1 to 0.01 at epoch 12, took the accuracy from 0.957 to 0.976; the rest changed nothing because the network had converged. Reduce-on-plateau is the schedule for a run of unknown length; its weakness is that it only ever lowers the rate, and after a few plateaus it is at the floor whether or not that was needed." },

    { t: "h2", n: "03", text: "EMA and SWA", id: "averaging" },

    { t: "p", text: "SGD's iterates bounce around the minimum; an average of them sits closer to it. Two ways to take the average: an exponential moving average of the weights updated every step (EMA, decay 0.99–0.9999), evaluated instead of the raw weights; or stochastic weight averaging, a plain average of the weights at the end of each of the last few epochs (SWA), which needs a BatchNorm-statistics pass afterwards because the averaged weights never saw data." },

    { t: "code", lang: "python", title: "EMA update and SWA (executed)",
      code: `# EMA, after every optimizer.step():
with torch.no_grad():
    for pe, p in zip(ema_model.parameters(), model.parameters()):
        pe.mul_(decay).add_(p, alpha=1 - decay)                    # pe ← d·pe + (1−d)·p

# SWA, at the end of each epoch from swa_start:
swa_model = torch.optim.swa_utils.AveragedModel(model);  swa_model.update_parameters(model)
torch.optim.swa_utils.update_bn(loader, swa_model)                 # recompute BatchNorm statistics once, at the end

3-layer MLP on the digits, SGD 0.05 with momentum -- a deliberately noisy rate -- 30 epochs:
  seed 0: raw 0.981 (last five epochs 0.978 0.978 0.980 0.980 0.981)   ema 0.980   swa 0.980
  seed 1: raw 0.978 (last five 0.978 0.983 0.976 0.981 0.978)           ema 0.980   swa 0.981
  seed 2: raw 0.980 (last five 0.980 0.976 0.978 0.978 0.980)           ema 0.980   swa 0.976`,
      caption: "The raw accuracy bounces by half a point from epoch to epoch and the averages sit in the middle of the bounce — no gain in the mean here, but a run you can stop at any epoch. The published gains (a point on ImageNet, standard in diffusion and self-supervised training where EMA weights are what you keep) come where the bounce is larger; the honest result on a small MLP is 'same accuracy, less variance'." },

    { t: "h2", n: "04", text: "Checkpointing and resuming", id: "checkpoint" },

    { t: "p", text: "A checkpoint that can resume a run exactly must contain everything the next step reads: the model weights, the optimiser's state (Adam's m and v — 85,276 numbers for a 42,634-parameter model, twice the model), the scheduler's position, the step count, and the random generator's state for the shuffling. Miss one and the resumed run is a different run:" },

    { t: "code", lang: "python", title: "Save everything; resume; compare with an uninterrupted run (executed)",
      code: `ckpt = {"model": net.state_dict(), "opt": opt.state_dict(), "sched": sched.state_dict(),
        "step": step, "rng": gen.get_state()}
torch.save(ckpt, path)                                             # 514 KB for this model
…
ck = torch.load(path)
net.load_state_dict(ck["model"]); opt.load_state_dict(ck["opt"]); sched.load_state_dict(ck["sched"])
gen.set_state(ck["rng"]); step = ck["step"]

100 steps, checkpoint, 100 more:  resumed run matches the uninterrupted run exactly: True
model weights only (fresh Adam, scheduler restarted): max |weight difference| after 100 steps = 0.0408
checkpoint every 50 steps, crashes simulated at 100 and 200, resumed twice (exercise): identical: True`,
      caption: "With only the weights, Adam restarts with zero moments and takes its oversized early steps (1.5), the one-cycle scheduler restarts at its warmup rate, and the shuffle order differs; 0.04 in the weights is a different model. The optimiser state is why checkpoints are three times the size of the weights, and why 'save the model' and 'save the run' are different operations." },

    { t: "h2", n: "05", text: "Activation checkpointing", id: "actckpt" },

    { t: "p", text: "Training memory is dominated by the forward cache (1.4). Activation checkpointing keeps only the activations at segment boundaries, discards the rest, and recomputes each segment's forward during backward when its activations are needed. Memory falls to the boundaries plus one segment; compute rises by roughly one extra forward:" },

    { t: "code", lang: "text", title: "24 layers of width 512, batch 256 (executed)",
      code: `plain:                              162 ms per forward + backward
checkpoint_sequential, 4 segments:  225 ms   (+39 %)          gradients identical: True

activations kept between forward and backward:
  plain           24 × 256 × 512 floats = 12.6 MB
  4 segments       4 × 256 × 512 floats =  2.1 MB  at the boundaries; each segment is recomputed on demand`,
      caption: "The memory figures are computed from the shapes rather than measured, because on the CPU the tensor allocator is invisible to Python's tracemalloc (it reported 0 MB for both — an example of a measurement that is honest only when you know what it cannot see). The +39 % time is measured, and the gradient equality is the proof that nothing changed but the memory." },

    { t: "h2", n: "06", text: "Profiler, FLOPs, custom losses, compile, multi-GPU", id: "misc" },

    { t: "code", lang: "text", title: "The profiler on a 4-layer width-512 MLP, five training steps at batch 256 (executed, top rows)",
      code: `Name                                              Self CPU %   Self CPU    CPU total %   CPU total   # of Calls
autograd::engine::evaluate_function: AddmmBackward0   1.00%      1.3 ms      60.78%       80.7 ms        25
aten::mm                                             55.78%     74.0 ms      55.83%       74.1 ms        45
aten::linear                                          0.35%      0.5 ms      28.33%       37.6 ms        25
aten::addmm                                          25.81%     34.3 ms      26.80%       35.6 ms        25
autograd::engine::evaluate_function: ReluBackward0    2.14%      2.8 ms       3.81%        5.1 ms        20

FLOPs per forward at batch 256, counted by a forward hook on each Linear (2·B·in·out):  422.1 MFLOP;  1.65 MFLOP per example;  826,378 parameters`,
      caption: "Matrix multiplies (mm, addmm) are 82 % of the time; the backward's two products per layer (1.4) show as 45 calls of mm against 25 of addmm. The FLOP count is two per multiply-add per weight, times the batch; convolutions (3.2) add a kernel-size factor. Profile before optimising (11.2): here there is nothing to optimise but the matmuls, which is the normal finding." },

    { t: "code", lang: "python", title: "A custom loss as a Module, checked against the built-in (executed)",
      code: `class LabelSmoothedCE(nn.Module):
    def __init__(self, eps=0.1): super().__init__(); self.eps = eps
    def forward(self, logits, y):
        logp = F.log_softmax(logits, 1)
        nll = -logp.gather(1, y[:, None]).squeeze(1)      # −log p_y
        smooth = -logp.mean(1)                             # −mean_k log p_k
        return ((1 - self.eps) * nll + self.eps * smooth).mean()

LabelSmoothedCE(0.1)(logits, y) = 2.9010     F.cross_entropy(logits, y, label_smoothing=0.1) = 2.9010`,
      caption: "A loss is any Module returning a scalar from differentiable operations; autograd does the rest. Writing one against the built-in and asserting equality is the same discipline as the gradient check. Lesson 2.5 uses this loss." },

    { t: "dl", items: [
      ["torch.compile", "Traces the model into a graph and generates fused kernels; typical speedups 1.3–2× on GPU. **Not usable on this machine**: it failed with 'Compiler: cl is not found' — the Inductor backend needs a C++ compiler (MSVC on Windows). Everything else on this page ran; this is reported as it happened."],
      ["Multi-GPU, in one paragraph", "nn.DataParallel splits each batch across GPUs in one process — simple, and bottlenecked on the first GPU; DistributedDataParallel runs one process per GPU with all-reduce of gradients and is the standard. Model parallelism splits the model across devices for networks too large for one; FSDP shards parameters and optimiser state. None can be run here (no GPU); module 11.2 covers the serving side."],
      ["Logging", "Every step: loss.item(), the learning rate, the pre-clip gradient norm (1.8). Every epoch: validation metrics, throughput. TensorBoard or Weights & Biases for curves; a CSV is enough for a course. The gradient norm is the line most people leave out and the one that predicts a divergence."]
    ] },

    { t: "ladder",
      title: "From a loop that runs to a loop that can be left alone",
      rungs: [
        { level: "bad", label: "The six lines, with print(loss)", code: `for x, y in loader: opt.zero_grad(); loss = crit(net(x), y); loss.backward(); opt.step(); print(loss)`,
          note: "**Prints a tensor that keeps its graph alive, cannot resume, cannot stop early, and has no idea a gradient just spiked.**" },
        { level: "ok", label: "Validation each epoch, early stopping with a restored best, a checkpoint of the weights", code: `es.step(val_acc, net); torch.save(net.state_dict(), "best.pt")`,
          note: "Selects a good model. Resuming after a crash restarts Adam and the scheduler from zero: 0.04 away from the run you were on." },
        { level: "best", label: "Full-state checkpoints on a step schedule, accumulation with the divide, EMA weights, a gradient-norm log, a profile before any optimisation", code: `save({"model", "opt", "sched", "step", "rng"}) every N steps;  (loss / k).backward() × k;  ema.update();  log(grad_norm, lr, loss.item())`,
          note: "Resumes bit-exactly after two simulated crashes; the EMA copy is what you evaluate and ship; the norm log is what you read when it goes wrong (2.4)." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why must each micro-batch's loss be divided by the number of micro-batches when accumulating gradients?",
          options: [
            "To keep the loss below 1",
            "Because the loss is a mean over its batch, so summing k micro-batch gradients gives k times the mean gradient of the full batch; dividing by k restores the mean — without it the effective learning rate is multiplied by k (measured 4.00×)",
            "Because backward() divides by the batch size automatically",
            "It is optional if the learning rate is small"
          ],
          answer: 1,
          why: "The accumulated gradient matched the full batch to 10⁻⁸ with the divide and was exactly four times larger without it. Accumulation is exact for models without batch-coupled layers; with BatchNorm the micro-batch statistics make it approximate (cosine 0.96)."
        },
        {
          stem: "A run resumed from a checkpoint containing only the model weights drifted 0.04 from the uninterrupted run within 100 steps. What was missing?",
          options: [
            "The dataset",
            "The optimiser state (Adam's m and v, twice the model's size), the scheduler's position and the RNG state — without them Adam restarts with zero moments and oversized early steps, the schedule restarts, and the shuffle order changes",
            "The loss function",
            "Nothing; drift is expected"
          ],
          answer: 1,
          why: "A checkpoint of the run is model + optimiser + scheduler + step + RNG; with all five the resumed run matched exactly, including after two simulated crashes. A checkpoint of the model alone is for inference, not for resuming."
        },
        {
          stem: "Activation checkpointing in four segments cost 39 % more time and left the gradients identical. Where does the time go and where does the memory saving come from?",
          options: [
            "The time goes to disk I/O; the memory is saved by compression",
            "During backward each segment's forward is recomputed from its stored boundary activation, so roughly one extra forward pass is spent; only the four boundary activations (2.1 MB) are kept instead of all 24 layers' (12.6 MB)",
            "The gradients are approximated",
            "The batch is split into four"
          ],
          answer: 1,
          why: "It is a pure compute-for-memory trade: the same mathematics, done twice for most layers. The equality of gradients is the proof; the shape-computed memory figures are used because the CPU allocator is invisible to Python's tracer."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Accumulation with BatchNorm, reduce-on-plateau, and a crash-proof loop",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** Repeat the accumulation check on a network with a BatchNorm layer: compare four micro-batches of 16 against one batch of 64 in train mode (max difference and cosine similarity), then in eval mode." },
        { t: "p", text: "**(b)** Implement reduce-on-plateau as a class (factor 0.1, patience 3, floor 10⁻⁵) and run it on the digits with SGD 0.1 for 40 epochs; report the epochs at which the rate dropped and the test accuracy every five epochs." },
        { t: "p", text: "**(c)** Write save/load functions covering model, optimiser, scheduler, RNG generator state and step. Train 300 steps with a one-cycle schedule, checkpointing every 50 steps and simulating crashes at steps 100 and 200 by discarding the live objects and reloading. Show the final weights equal an uninterrupted run's." }
      ],
      requirements: [
        "(a) two max differences and one cosine similarity.",
        "(b) the reduction events and eight accuracies.",
        "(c) one True and the final learning rate."
      ],
      hint: "(a) Build the network identically for both runs with the same seed; BatchNorm's running statistics also diverge, which is a second difference. (c) Use a torch.Generator for the shuffle so its state can be saved; scheduler.load_state_dict restores the step position.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) train mode with BatchNorm:  max |accumulated − full| = 4.2e-02, cosine similarity 0.9602
#     eval mode (running statistics, no batch coupling):  max diff 9.3e-09

# (b) reduce-on-plateau: rate reductions at epochs 12 (→0.01), 17 (→0.001), 20 (→1e-4), 23 (→1e-5 floor), then held
#     test accuracy every 5 epochs: 0.950 0.957 0.976 0.976 0.976 0.976 0.976 0.976    -- the first drop did the work

# (c) checkpoint every 50 steps, crashes at 100 and 200, resumed twice:
#     final weights identical to the uninterrupted run: True;  learning rate at the end 5.99e-07 (one-cycle's floor)`,
        notes: [
          { t: "p", text: "(a) is the one exception to 'accumulation is exact', and it is exactly the layer whose statistics depend on the batch." },
          { t: "p", text: "(b) shows the schedule doing what a validation curve would tell you to do by hand, and then continuing to do it after it stopped mattering." },
          { t: "p", text: "(c) is the property a long run must have; the RNG state is the part most people forget, and it is what makes 'identical' rather than 'close'." }
        ]
      }
    }
  ],

  takeaways: [
    "Gradient accumulation with the loss divided by the micro-batch count equals the large batch to 10⁻⁸; without the divide the gradient is k× too large; with BatchNorm it is approximate (cosine 0.96), because each micro-batch normalises with its own statistics.",
    "Early stopping needs a deep-copied best state and a restore: the stopping epoch scored 0.928 and the restored best 0.937. Reduce-on-plateau's first drop (0.1 → 0.01 at epoch 12) took accuracy from 0.957 to 0.976; later drops changed nothing.",
    "EMA of the weights and SWA sit in the middle of SGD's epoch-to-epoch bounce (±0.5 points here) with no gain in the mean on a small MLP; their value is variance, and at scale a point.",
    "A resumable checkpoint holds model, optimiser state (twice the model for Adam), scheduler, step and RNG state — with all five the resumed run matched exactly through two simulated crashes; with weights alone it drifted 0.04 in 100 steps.",
    "Activation checkpointing in four segments cost +39 % time for identical gradients and keeps 2.1 MB of boundaries instead of 12.6 MB of activations (computed from shapes; the CPU allocator is invisible to Python's tracer).",
    "The profiler put 82 % of a training step in matrix multiplies; a forward hook counts FLOPs (2·B·in·out per Linear: 1.65 MFLOP per example); a custom loss Module matched the built-in to four decimals; torch.compile did not run here (no C++ compiler) and is reported as such."
  ],

  quiz: {
    title: "The Loop Toolkit — Knowledge Check",
    questions: [
      {
        stem: "Which layer makes gradient accumulation inexact, and what would you use instead?",
        options: [
          "Dropout; use a fixed mask",
          "BatchNorm, because each micro-batch is normalised with its own mean and variance so the four micro-batches do not see the normalisation one batch of 64 would; GroupNorm or LayerNorm normalise within an example and restore exactness",
          "Linear layers; use convolutions",
          "Any layer with a bias"
        ],
        answer: 1,
        why: "Measured: cosine 0.96 in train mode against a 10⁻⁹ difference in eval mode, where running statistics decouple the examples. The same coupling is why BatchNorm needs a minimum batch (1.6) and why its backward has cross-example terms (2.1)."
      },
      {
        stem: "Why is a checkpoint of an Adam-trained model roughly three times the size of the weights?",
        options: [
          "Because the weights are stored in float64",
          "Because Adam keeps two moving averages, m and v, per parameter — 85,276 numbers for 42,634 parameters — and resuming exactly requires them along with the scheduler and RNG state",
          "Because the dataset is included",
          "Because gradients are saved"
        ],
        answer: 1,
        why: "The optimiser state is part of the run. Loading weights alone restarts Adam with zero moments, which the bias correction turns into a fresh sequence of large early steps — the 0.04 drift. At large scale this state is why optimiser sharding (FSDP, ZeRO) exists."
      },
      {
        stem: "SWA requires update_bn after averaging. Why?",
        options: [
          "To reset the learning rate",
          "Because the averaged weights are a new network that never ran forward on data, so its BatchNorm running statistics are wrong for it; one pass over the training data recomputes them before evaluation",
          "To apply weight decay to the average",
          "It is optional cosmetics"
        ],
        answer: 1,
        why: "Running means and variances are buffers estimated during training for the weights that were training; an average of weights has different pre-activation statistics. EMA has the same issue and is usually handled by averaging the buffers too."
      },
      {
        stem: "The profiler showed aten::mm and aten::addmm at 82 % of the time. What optimisation is warranted?",
        options: [
          "Rewrite the Python loop in C++",
          "Probably none at the code level — the time is in the matrix multiplies the model requires, so the levers are the ones that change those: mixed precision (2.5), a compiled/fused graph where available, batch size, or a smaller model; profiling exists to prevent optimising the other 18 %",
          "Remove the ReLU layers",
          "Increase num_workers"
        ],
        answer: 1,
        why: "A profile that is dominated by the essential compute is the good outcome; it tells you the remaining wins are arithmetic-level (precision, fusion, hardware) rather than loop-level. Lesson 11.2 takes the same profile-first approach to inference."
      },
      {
        stem: "torch.compile failed on this machine with 'cl is not found'. What is the correct way to report and handle that?",
        options: [
          "Report the typical published speedup as if it had been measured",
          "State that the Inductor backend needs a C++ compiler that is absent, that every other tool on the page ran, and that no speedup is claimed; install MSVC or use a Linux box with a compiler to measure it",
          "Remove torch.compile from the toolkit",
          "Assume it would have given 2×"
        ],
        answer: 1,
        why: "A number that was not produced is not a number. The course's rule is that unexecuted claims are marked as such; the honest entry is the error message and the reason, which is also the information a reader on Windows needs."
      }
    ]
  },

  interview: {
    title: "Interview Questions — The Loop Toolkit",
    sub: "Accumulation and its exception, stopping rules, weight averaging, exact resumption, memory-for-compute, and profiling.",
    questions: [
      {
        level: "Core",
        q: "How does gradient accumulation work, and what are its pitfalls?",
        strong: "Run k micro-batches, call backward on each so the gradients sum in .grad, and step the optimiser once. Because each loss is a mean over its micro-batch, divide each by k; then the accumulated gradient equals the gradient of one batch of k times the size — measured to 10⁻⁸ — and without the divide it is k times too large, which silently multiplies the learning rate. Step the scheduler once per cycle as well. The pitfall is any layer whose computation depends on the batch: BatchNorm normalises each micro-batch with its own statistics, so the accumulated gradient differs from the true large-batch gradient — cosine similarity 0.96 in my measurement — and the effective BatchNorm batch is the micro-batch, which fails at 2 or 4. GroupNorm or LayerNorm restore exactness. Dropout is fine, since each micro-batch's mask is independent either way.",
        answer: [
          { t: "p", text: "The mechanism, the divide with its measured consequence, the scheduler rule, and the BatchNorm exception with numbers." }
        ]
      },
      {
        level: "Core",
        q: "What must a checkpoint contain to resume training exactly?",
        strong: "Everything the next step reads: the model's state_dict; the optimiser's state_dict — for Adam that is m and v for every parameter, 85,276 numbers for a 42,634-parameter model, so the optimiser is twice the model; the scheduler's state_dict, which holds its step position; the step or epoch counter; and the state of the random generator used for shuffling and dropout. With all five, a run checkpointed at 100 steps and resumed matched the uninterrupted run bit for bit, and a loop checkpointing every 50 steps with crashes simulated at 100 and 200 also matched. With the weights alone the resumed model was 0.04 away after 100 steps: Adam restarted with zero moments and took its oversized early steps, the one-cycle schedule restarted at its warmup rate, and the shuffle order changed. Save every N steps rather than every epoch on long runs, keep the last two, and save the best-validation weights separately for inference.",
        answer: [
          { t: "p", text: "The five components with sizes, the executed exact-match and the executed drift, and the operational practice." }
        ]
      },
      {
        level: "Core",
        q: "Explain activation checkpointing and when to use it.",
        strong: "Backward needs every layer's forward activations, and for a deep network at a large batch that cache is most of the memory. Activation checkpointing stores only the activations at a few segment boundaries, frees the rest after forward, and recomputes each segment's forward during backward when its activations are needed. The memory falls from all layers to the boundaries plus one segment — for 24 layers of width 512 at batch 256, from 12.6 MB to 2.1 MB by shape count — and the compute rises by about one extra forward: measured +39 % on the step time, with gradients identical to the plain run. Use it when the model or batch does not fit and a smaller batch with accumulation is not enough — transformers with long sequences are the usual case — and accept the time cost. torch.utils.checkpoint.checkpoint_sequential does it for sequential models; for arbitrary modules you wrap the blocks you choose.",
        answer: [
          { t: "p", text: "The cache as the cause, the mechanism, the executed time cost and gradient equality, and the regime." }
        ]
      },
      {
        level: "Advanced",
        q: "What do EMA weights and SWA give you, and did you measure it?",
        strong: "Both average SGD's iterates, which bounce around the minimum: EMA keeps an exponential moving average of the weights updated every step with decay 0.99 to 0.9999, and you evaluate and ship the EMA copy; SWA averages the weights at the ends of the last several epochs and then recomputes BatchNorm statistics with one pass, because the averaged network never saw data. On a small MLP trained with a deliberately noisy learning rate the raw test accuracy bounced by about half a point between epochs — 0.976 to 0.983 — and both averages sat in the middle at 0.980 on every seed: no gain in the mean, a clear reduction in variance, and a model you can stop at any epoch. The reported gains at scale — around a point on ImageNet for SWA, and EMA as the standard weights kept in diffusion, self-supervised and detection training — come where the bounce is larger and the loss surface flatter around the average. I would say: cheap, never harmful when the buffers are handled, and worth a point where training is noisy.",
        answer: [
          { t: "p", text: "Both mechanisms with the BatchNorm caveat, the executed variance-not-mean result, and where the published gains apply." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 10.3 — Spot Instances and Checkpointing
   ========================================================================= */
EC.receiveLesson({
  id: "10.3",

  lede: "Spot capacity is the cloud provider's spare GPUs, sold at a large discount on the condition that they can be taken back with little warning: two minutes on AWS, about thirty seconds on Google Cloud and Azure. A training job can use it only if losing the machine costs minutes, not hours. That takes two things: checkpoints at an interval chosen against the interruption rate, and a resume path that restores everything, not just the weights. This lesson simulates the interval trade-off, compares it with the classic formula, and tests a resume path for bit-exact recovery.",

  objectives: [
    "Explain what spot capacity is, what notice each provider gives, and how to receive it",
    "Choose a checkpoint interval from the checkpoint cost and the interruption rate",
    "Compute when spot is cheaper, and when it is also faster, than on-demand",
    "Write a checkpoint that resumes training exactly: weights, optimiser, scheduler, RNG and data position",
    "Test the resume path before an interruption tests it for you"
  ],

  prerequisites: ["10.2"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "interval",
      text: "The checkpoint interval",
      sub: "Too often wastes time saving; too rarely wastes time redoing" },
    { t: "p",
      text: "Each checkpoint costs time to write; each interruption loses the work since the last one, plus the time to get a new machine and reload. The simulation runs a job needing 24 hours of compute, with 2-minute checkpoints and a 10-minute restart, at three interruption rates and six intervals, and compares the best interval with the Young–Daly approximation, √(2 × checkpoint cost × mean time between interruptions)." },
    { t: "code",
      lang: "python",
      title: "spot.py — wall time and cost by checkpoint interval",
      code: `import math
import numpy as np
rng = np.random.default_rng(10)

# A job needing 24 hours of compute. Spot costs 30% of on-demand. Each interruption loses the work since
# the last checkpoint plus R minutes to get a new instance and reload; each checkpoint costs C minutes.
WORK_H, SPOT_PRICE, C_MIN, R_MIN = 24.0, 0.30, 2.0, 10.0

def run(interval_min, rate_per_h, work_h=WORK_H, trials=4000):
    walls = np.empty(trials)
    for k in range(trials):
        done = wall = 0.0                                       # hours of useful work saved, hours elapsed
        while done < work_h:
            seg = min(interval_min / 60, work_h - done)         # work until the next checkpoint
            need = seg + C_MIN / 60
            gap = rng.exponential(1 / rate_per_h) if rate_per_h > 0 else math.inf
            if gap >= need: wall += need; done += seg           # segment and checkpoint completed
            else: wall += gap + R_MIN / 60                      # interrupted: lose the segment, pay the restart
        walls[k] = wall
    return walls.mean()

print(f"{'interruptions/h':>15} {'interval':>9} {'wall h':>7} {'cost vs on-demand':>18}")
for rate in (0.05, 0.2, 0.5):
    best = None
    for interval in (10, 20, 30, 60, 120, 240):
        w = run(interval, rate)
        cost = w * SPOT_PRICE / WORK_H
        if best is None or w < best[1]: best = (interval, w)
        print(f"{rate:>15} {interval:>6} min {w:>7.1f} {cost:>17.0%}")
    young = math.sqrt(2 * C_MIN * 60 / rate)                    # Young/Daly: sqrt(2 x checkpoint cost x mean time between failures)
    print(f"{'':>15} best tried {best[0]} min; Young/Daly rule gives {young:.0f} min\\n")

# Spending the same money on more spot GPUs: 3 spot GPUs cost 90% of one on-demand GPU.
print("same budget, data-parallel on 3 spot GPUs (90% scaling efficiency), 0.2 interruptions/h per GPU:")
eff, n = 0.9, 3
w = run(30, 0.2 * n, work_h=WORK_H / (n * eff))              # less work each; any GPU's interruption stops the job
print(f"  wall time {w:.1f} h against {WORK_H:.0f} h on one on-demand GPU; cost {w * n * SPOT_PRICE / WORK_H:.0%} of on-demand")`,
      out: `interruptions/h  interval  wall h  cost vs on-demand
           0.05     10 min    29.2               36%
           0.05     20 min    26.9               34%
           0.05     30 min    26.2               33%
           0.05     60 min    25.7               32%
           0.05    120 min    25.9               32%
           0.05    240 min    27.1               34%
                best tried 60 min; Young/Daly rule gives 69 min

            0.2     10 min    30.4               38%
            0.2     20 min    28.3               35%
            0.2     30 min    28.0               35%
            0.2     60 min    28.5               36%
            0.2    120 min    31.2               39%
            0.2    240 min    38.2               48%
                best tried 30 min; Young/Daly rule gives 35 min

            0.5     10 min    32.8               41%
            0.5     20 min    31.4               39%
            0.5     30 min    31.8               40%
            0.5     60 min    35.3               44%
            0.5    120 min    45.9               57%
            0.5    240 min    84.7              106%
                best tried 20 min; Young/Daly rule gives 22 min

same budget, data-parallel on 3 spot GPUs (90% scaling efficiency), 0.2 interruptions/h per GPU:
  wall time 12.3 h against 24 h on one on-demand GPU; cost 46% of on-demand` },
    { t: "viz",
      title: "Wall-clock hours for 24 hours of work",
      caption: "Each curve has a minimum. Checkpointing too often wastes time saving; too rarely wastes time redoing work, and at 0.5 interruptions an hour a 4-hour interval took 85 hours.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="64" y1="224.0" x2="610" y2="224.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="228.0" text-anchor="end" class="s-sub">0</text>
<line x1="64" y1="169.1" x2="610" y2="169.1" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="173.1" text-anchor="end" class="s-sub">24</text>
<line x1="64" y1="114.1" x2="610" y2="114.1" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="118.1" text-anchor="end" class="s-sub">48</text>
<line x1="64" y1="59.2" x2="610" y2="59.2" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="63.2" text-anchor="end" class="s-sub">72</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">90</text>
<text x="64.0" y="242" text-anchor="middle" class="s-sub">10</text>
<text x="173.2" y="242" text-anchor="middle" class="s-sub">20</text>
<text x="282.4" y="242" text-anchor="middle" class="s-sub">30</text>
<text x="391.6" y="242" text-anchor="middle" class="s-sub">60</text>
<text x="500.8" y="242" text-anchor="middle" class="s-sub">120</text>
<text x="610.0" y="242" text-anchor="middle" class="s-sub">240</text>
<text x="337.0" y="264" text-anchor="middle" class="s-sub">checkpoint interval (minutes)</text>
<text x="14" y="121.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 121.0)">wall-clock hours</text>
<polyline points="64.0,157.2 173.2,162.4 282.4,164.0 391.6,165.2 500.8,164.7 610.0,162.0" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="157.2" r="2" style="fill:var(--good)"/>
<circle cx="173.2" cy="162.4" r="2" style="fill:var(--good)"/>
<circle cx="282.4" cy="164.0" r="2" style="fill:var(--good)"/>
<circle cx="391.6" cy="165.2" r="2" style="fill:var(--good)"/>
<circle cx="500.8" cy="164.7" r="2" style="fill:var(--good)"/>
<circle cx="610.0" cy="162.0" r="2" style="fill:var(--good)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">0.05 interruptions/h</text>
<polyline points="64.0,154.4 173.2,159.2 282.4,159.9 391.6,158.8 500.8,152.6 610.0,136.6" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="154.4" r="2" style="fill:var(--warn)"/>
<circle cx="173.2" cy="159.2" r="2" style="fill:var(--warn)"/>
<circle cx="282.4" cy="159.9" r="2" style="fill:var(--warn)"/>
<circle cx="391.6" cy="158.8" r="2" style="fill:var(--warn)"/>
<circle cx="500.8" cy="152.6" r="2" style="fill:var(--warn)"/>
<circle cx="610.0" cy="136.6" r="2" style="fill:var(--warn)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">0.2 interruptions/h</text>
<polyline points="64.0,148.9 173.2,152.1 282.4,151.2 391.6,143.2 500.8,118.9 610.0,30.1" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="148.9" r="2" style="fill:var(--crit)"/>
<circle cx="173.2" cy="152.1" r="2" style="fill:var(--crit)"/>
<circle cx="282.4" cy="151.2" r="2" style="fill:var(--crit)"/>
<circle cx="391.6" cy="143.2" r="2" style="fill:var(--crit)"/>
<circle cx="500.8" cy="118.9" r="2" style="fill:var(--crit)"/>
<circle cx="610.0" cy="30.1" r="2" style="fill:var(--crit)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">0.5 interruptions/h</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "The formula is a good start",
          def: "The best interval tried was 60, 30 and 20 minutes at the three rates; Young–Daly gave 69, 35 and 22. Near the optimum the curve is flat, so being roughly right is enough; being far too rare is not." },
        { term: "Spot stayed cheaper",
          def: "Even at one interruption every two hours with a good interval, the job cost about 40% of on-demand. With a 4-hour interval at that rate it cost 106%: more than on-demand, and three and a half times slower." },
        { term: "Faster too, by spending the saving",
          def: "Three spot GPUs at 30% each cost 90% of one on-demand GPU. Training data-parallel on three, with 90% scaling, finished in 12.3 hours instead of 24, for 46% of the on-demand cost, even though any of the three being interrupted stops the job." }
      ] },
    { t: "h2",
      n: "02",
      id: "notice",
      text: "Receiving the notice",
      sub: "Two minutes is enough for one checkpoint" },
    { t: "p",
      text: "On AWS, the instance metadata endpoint `/latest/meta-data/spot/instance-action` returns the planned interruption time two minutes ahead, and the instance receives a shutdown signal. Google Cloud's spot VMs get a preemption notice about 30 seconds ahead, and Azure exposes evictions through Scheduled Events with a similar notice. The training loop should check a flag set by a signal handler or a poller, finish the current step, write a checkpoint to durable storage and exit." },
    { t: "dl",
      items: [
        { term: "Checkpoint to object storage",
          def: "Local disk disappears with the instance. SageMaker's managed spot training syncs `/opt/ml/checkpoints` to an S3 location you set; elsewhere, write to S3, GCS or Azure Blob directly." },
        { term: "Write atomically",
          def: "Write to a temporary name and rename, or write a manifest last. An interruption during the write must leave the previous checkpoint usable." },
        { term: "Keep the last two",
          def: "If the newest checkpoint is corrupt, the job falls back one interval instead of starting over." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "A checkpoint that saves only the weights",
      body: [
        { t: "p",
          text: "`torch.save(model.state_dict())` is the checkpoint most tutorials show. Resuming from it restarts AdamW's moment estimates from zero, resets the learning-rate schedule, reshuffles the data and replays batches the model has already seen. Training continues and looks healthy, so nobody notices that the resumed run is a different run." }
      ] },
    { t: "h2",
      n: "03",
      id: "resume",
      text: "A resume path that is exact",
      sub: "Everything that makes the next step what it would have been" },
    { t: "p",
      text: "The next step after resuming depends on the weights, the optimiser's moments, the learning-rate scheduler's position, every random number generator (dropout, augmentation, sampling) and the position in the current epoch's data order. Save all of them, and the resumed run is bit-for-bit the run that was interrupted. The exercise proves it, and shows what each missing piece costs." },
    { t: "table",
      head: ["State", "If it is missing on resume"],
      rows: [
        ["Model weights", "Training starts over"],
        ["Optimiser state (AdamW moments)", "A burst of badly scaled updates while the moments rebuild"],
        ["LR scheduler", "Warm-up repeats, or the schedule restarts at its peak"],
        ["RNG states", "Different dropout masks and augmentations from here on"],
        ["Data order and position", "Some batches seen twice in the epoch, others skipped"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Prove the resume path",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p",
          text: "Train a small network with dropout, AdamW and a cosine schedule for 300 steps, and keep its final weights. Then repeat the run, interrupt it at step 137, write a checkpoint, resume in a fresh model with different seeds (as a new machine would start), and finish. Compare the final weights with the uninterrupted run for three checkpoints: weights only; weights and optimiser with scheduler; and everything including RNG states and the data position." }
      ],
      requirements: [
        "A data order you control: a shuffled permutation per epoch and a position in it",
        "Checkpoints serialised to bytes, as they would be to object storage",
        "Resume into objects built with different seeds",
        "An exact comparison (torch.equal) and the maximum difference"
      ],
      hint: "Save the current epoch's permutation and position rather than trying to fast-forward a DataLoader; it is simpler and exact.",
      solution: { lang: "python",
        title: "resume_exactly.py",
        code: `import io, random
import numpy as np, torch
from torch import nn

STEPS, BATCH = 300, 32
X = torch.randn(2_000, 20, generator=torch.Generator().manual_seed(1)); Y = (X[:, :3].sum(1) > 0).long()

class Interrupted(Exception): pass

def build(seed=0):
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)
    model = nn.Sequential(nn.Linear(20, 64), nn.ReLU(), nn.Dropout(0.2), nn.Linear(64, 2))   # dropout consumes RNG
    opt = torch.optim.AdamW(model.parameters(), lr=3e-3)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=STEPS)
    return model, opt, sched

def train(model, opt, sched, state, interrupt_at=None):
    """state: step, the current epoch's shuffled order and position in it, and the data-order generator."""
    while state["step"] < STEPS:
        if state["pos"] >= len(state["perm"]):                  # new epoch: draw a fresh order
            state["perm"] = torch.randperm(len(X), generator=state["gen"]); state["pos"] = 0
        idx = state["perm"][state["pos"]: state["pos"] + BATCH]
        loss = nn.functional.cross_entropy(model(X[idx]), Y[idx])
        opt.zero_grad(); loss.backward(); opt.step(); sched.step()
        state["pos"] += BATCH; state["step"] += 1
        if state["step"] == interrupt_at: raise Interrupted()  # the two-minute notice arrives here

def checkpoint(model, opt, sched, state, what):
    ck = {"model": model.state_dict(), "step": state["step"], "perm": state["perm"], "pos": state["pos"]}
    if "optimizer" in what: ck |= {"opt": opt.state_dict(), "sched": sched.state_dict()}
    if "rng" in what:
        ck |= {"gen": state["gen"].get_state(), "torch_rng": torch.get_rng_state(),
               "np_rng": np.random.get_state(), "py_rng": random.getstate()}
    buf = io.BytesIO(); torch.save(ck, buf); return buf.getvalue()

def resume(blob):
    ck = torch.load(io.BytesIO(blob), weights_only=False)
    model, opt, sched = build(seed=123)                          # a new machine: different process, different RNG
    model.load_state_dict(ck["model"])
    gen = torch.Generator().manual_seed(123)
    if "opt" in ck: opt.load_state_dict(ck["opt"]); sched.load_state_dict(ck["sched"])
    if "gen" in ck:
        gen.set_state(ck["gen"]); torch.set_rng_state(ck["torch_rng"]); np.random.set_state(ck["np_rng"]); random.setstate(ck["py_rng"])
    return model, opt, sched, {"step": ck["step"], "perm": ck["perm"], "pos": ck["pos"], "gen": gen}

def fresh_state(): return {"step": 0, "perm": torch.empty(0, dtype=torch.long), "pos": 0, "gen": torch.Generator().manual_seed(7)}

model, opt, sched = build(); train(model, opt, sched, fresh_state())
reference = [p.detach().clone() for p in model.parameters()]
print(f"uninterrupted: {STEPS} steps")

for what in (("model",), ("model", "optimizer"), ("model", "optimizer", "rng")):
    model, opt, sched = build(); state = fresh_state()
    try: train(model, opt, sched, state, interrupt_at=137)
    except Interrupted: blob = checkpoint(model, opt, sched, state, what)
    model, opt, sched, state = resume(blob); train(model, opt, sched, state)
    diff = max((p - r).abs().max().item() for p, r in zip(model.parameters(), reference))
    same = all(torch.equal(p, r) for p, r in zip(model.parameters(), reference))
    print(f"checkpoint with {' + '.join(what):<26} interrupted at 137, resumed: identical={same}, max weight difference {diff:.2e}, "
          f"{len(blob) / 1024:.0f} KB")`,
        out: `uninterrupted: 300 steps
checkpoint with model                      interrupted at 137, resumed: identical=False, max weight difference 1.37e-01, 24 KB
checkpoint with model + optimizer          interrupted at 137, resumed: identical=False, max weight difference 3.11e-02, 39 KB
checkpoint with model + optimizer + rng    interrupted at 137, resumed: identical=True, max weight difference 0.00e+00, 57 KB`,
        notes: [
          { t: "p",
            text: "Only the full checkpoint reproduced the run exactly: identical weights, maximum difference 0. Weights alone ended 0.137 away in the largest weight, and adding the optimiser and scheduler still left 0.031, because dropout masks and the data-order generator diverged after step 137." },
          { t: "p",
            text: "Exactness is what makes the resume path testable. If resumed runs match uninterrupted ones bit for bit, a CI test with a forced interruption catches any state someone forgets to save later. The complete checkpoint was 57 KB against 24 KB here; for large models the optimiser state is about twice the weights, which is the real cost to plan storage for." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the model that got worse every time spot was reclaimed",
      body: [
        { t: "p",
          text: "**Symptom.** A two-day training run on spot instances finished with validation loss noticeably worse than the same configuration on on-demand instances. The loss curve showed small spikes, each a few hundred steps long." },
        { t: "p",
          text: "**Mechanism.** The job had been interrupted nine times. Each resume loaded the weights but not the optimiser or the scheduler, so AdamW restarted with empty moment estimates and the learning rate jumped back to its warm-up peak. Each spike was a resume, and each one cost the model progress it never fully recovered." },
        { t: "p",
          text: "**Fix.** The checkpoint gained optimiser, scheduler, RNG and data-position state, and the CI pipeline now runs a short training job with a forced interruption and asserts that the resumed weights equal an uninterrupted run's." }
      ] }
  ],

  takeaways: [
    "Spot capacity is cheaper because it can be reclaimed: **2 minutes**' notice on AWS, about **30 seconds** on Google Cloud and Azure.",
    "Choose the checkpoint interval near **√(2 × checkpoint cost × mean time between interruptions)**; it matched the simulated best.",
    "Too-rare checkpoints turned 24 hours of work into **85 hours** at 0.5 interruptions/h, costing **106%** of on-demand.",
    "With a sensible interval, spot cost **32–40%** of on-demand at every rate simulated.",
    "Spend the saving on more GPUs: 3 spot GPUs finished in **12.3 h** instead of 24, for **46%** of the cost.",
    "Checkpoint to object storage, atomically, and keep the last two.",
    "Save **weights, optimiser, scheduler, every RNG and the data position**; only then was the resumed run **identical**.",
    "Weights alone left a **0.137** difference; adding the optimiser still left **0.031**.",
    "Test resume in CI with a forced interruption and an exact comparison."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Checkpoints take 2 minutes and interruptions come every 5 hours on average. Which interval is about right?",
        options: [
          "Every 5 minutes, to lose as little as possible",
          "About every 35 minutes, from √(2 × 2 × 300)",
          "Every 5 hours, matching the interruption rate",
          "Only when the interruption notice arrives"
        ],
        answer: 1,
        why: "Young–Daly gives √(2 × 2 × 300) ≈ 35 minutes, and the simulation's best at that rate was 30. Every 5 minutes spends too long saving; every 5 hours loses hours per interruption; the notice may be only 30 seconds." },
      { stem: "A job resumes from a checkpoint holding only model weights. What goes wrong?",
        options: [
          "Nothing: the weights fully define the training state",
          "AdamW's moments and the LR schedule restart from scratch",
          "The model's architecture can no longer be loaded at all now",
          "The job cannot start until a full checkpoint exists"
        ],
        answer: 1,
        why: "Optimiser moments, scheduler position, RNG and data order are all lost, so the resumed run differs (0.137 here) and often shows a loss spike. The architecture comes from code, and the job does start." },
      { stem: "Why can spot finish faster than on-demand for the same budget?",
        options: [
          "Spot instances have faster GPUs than on-demand",
          "The saving buys more GPUs that train in parallel",
          "Spot jobs skip the time spent on checkpointing",
          "Interruptions force more efficient training code"
        ],
        answer: 1,
        why: "At 30% of the price, three spot GPUs cost 90% of one on-demand GPU, and data-parallel training on them finished in 12.3 h instead of 24. The hardware is the same and checkpointing still costs time." },
      { stem: "Where should a spot training job write its checkpoints?",
        options: [
          "To the instance's local NVMe disk, for the fastest writes",
          "To object storage, atomically, keeping the last two",
          "To the notebook server that launched the job",
          "To GPU memory, so resuming is instantaneous"
        ],
        answer: 1,
        why: "Local disk and GPU memory vanish with the instance, and a notebook server is not durable storage. Atomic writes keep the previous checkpoint usable if the write is interrupted." }
    ] },

  interview: { title: "In an interview",
    sub: "Spot questions test whether you have actually resumed a job.",
    questions: [
      { level: "core",
        q: "How would you run a multi-day training job on spot instances?",
        strong: "A strong answer covers the notice, the interval, complete state, durable storage and testing.",
        answer: [
          { t: "p",
            text: "A signal handler or metadata poller sets a flag on the interruption notice; the loop finishes its step, writes a checkpoint and exits. Periodic checkpoints at roughly √(2 × save time × mean time between interruptions), written atomically to object storage, keeping two. The checkpoint holds weights, optimiser, scheduler, all RNG states and the data position, and the job always starts by looking for the latest checkpoint." },
          { t: "p",
            text: "A CI test interrupts a short run and asserts the resumed weights equal an uninterrupted run's. I would also diversify across instance types and zones to lower the interruption rate." }
        ] },
      { level: "advanced",
        q: "When is spot the wrong choice?",
        strong: "A strong answer gives conditions in terms of checkpoint cost, interruption rate and deadlines.",
        answer: [
          { t: "p",
            text: "When a checkpoint is expensive relative to the interruption interval, such as very large models whose state takes many minutes to write, on instance types that are interrupted often. When a job is tightly synchronous across many nodes, because any node's interruption stops all of them and the effective rate multiplies. And when a deadline matters more than cost. Latency-sensitive serving is usually on-demand or reserved, with spot only for overflow capacity." }
        ] },
      { level: "core",
        q: "What exactly must a training checkpoint contain?",
        strong: "A strong answer lists every piece of state and says how to check the list is complete.",
        answer: [
          { t: "p",
            text: "Model weights, optimiser state, LR scheduler state, gradient-scaler state for mixed precision, all RNG states (Python, NumPy, framework, per-device), the data order and position, the step and epoch, and the configuration and code version used. The way to know it is complete is a test: interrupt, resume, and compare with an uninterrupted run for exact equality." }
        ] }
    ] }
});

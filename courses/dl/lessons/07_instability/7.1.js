/* ============================================================================
   LESSON 7.1 — NaN, Inf, and the Gradient Norm
   Mirrors 30_DL_Training_Instability.md · Overview through §2. The depth
   arithmetic is verified and the three-way init comparison measured across
   30 layers (scratchpad/dl/d71.py).
   ========================================================================= */
EC.receiveLesson({
  id: "7.1",

  lede: "**Deep means many multiplications, and numbers drift exponentially unless you actively hold them near one.** That is the entire problem in a sentence, and the reference's arithmetic makes it concrete: a per-layer factor of 1.5 gives 6.4 × 10⁸ over fifty layers, and 0.7 gives 1.8 × 10⁻⁸. Everything in this module — initialisation, normalisation, residuals, clipping — exists to keep that factor near 1. This lesson covers detection: the gradient norm, and the NaN that ends a run.",

  objectives: [
    "Explain why depth causes exponential drift in both directions",
    "Recognise where NaNs originate and how they propagate",
    "Guard a training step so a NaN fails at its source",
    "Read the gradient norm as a diagnostic",
    "Relate initialisation gain to activation and gradient scale"
  ],

  prerequisites: ["6.9"],

  blocks: [

    { t: "h2", n: "01", text: "Why depth destabilises", id: "why" },

    { t: "out", text: `  each layer x1.5: 1.5^50 = 6.376e+08   EXPLODES
  each layer x1.0: 1.0^50 = 1.000e+00   stable
  each layer x0.7: 0.7^50 = 1.798e-08   VANISHES` },

    { t: "p", text: "The reference's figures check out. A forward pass is a chain of multiplications and backprop runs the same chain in reverse, so any systematic deviation from unity compounds. **Only signals near ×1.0 per layer stay stable across depth** — and 1.5 and 0.7 are not extreme values, they are what you get from a slightly wrong initialisation." },

    { t: "h2", n: "02", text: "Measured across 30 layers", id: "init" },

    { t: "out", text: `  gain 2.5 - too large  : activation norm at output 5.601e+07, grad at layer 1 5.051e+08
  gain sqrt(2) - He init: activation norm at output 1.935e+00, grad at layer 1 3.094e+01
  gain 0.7 - too small  : activation norm at output 1.456e-09, grad at layer 1 4.688e-08` },

    { t: "callout", kind: "insight", title: "Initialisation gain spans sixteen orders of magnitude",
      body: [{ t: "p", text: "Same architecture, same input, same depth — only the initialisation scale differs, and the output activation norm runs from **1.5e-09 to 5.6e+07**. He initialisation, with gain `√2` for ReLU, lands at 1.935, which is the near-unity regime where training works. This is why initialisation is not a minor detail: it sets the per-layer multiplier, and at thirty layers a factor of 1.8 either way is the difference between a model that trains and one that produces `inf` on the first forward pass. Lesson 1.7 derived the formula; this is what happens when you get it wrong." }] },

    { t: "h2", n: "03", text: "NaN", id: "nan" },

    { t: "out", text: `  x                = [1.0, 2.0, nan, 4.0]
  x.sum()          = nan      <- one NaN ruins the reduction
  x.mean()         = nan
  (x*0).sum()      = nan      <- even multiplying by zero` },

    { t: "callout", kind: "crit", title: "`nan * 0` is `nan`, which is why it spreads",
      body: [{ t: "p", text: "There is no operation that cleans a NaN out of a tensor — multiplying by zero, masking, averaging all propagate it. So a single bad value in one activation becomes a NaN in the loss, then a NaN in one weight's gradient, then after `optimizer.step()` a NaN in that weight, and from the next forward pass onward every output that weight touches is NaN. Within two or three steps the entire model is poisoned and the loss prints `nan` forever. **You must catch it at the source**, because by the time you see it in the loss, the information about where it started is gone." }] },

    { t: "out", text: `  log(0)       = -inf        isnan=False  isinf=True
  0/0          = nan         isnan=True   isinf=False
  sqrt(-1)     = nan         isnan=True   isinf=False
  inf - inf    = nan         isnan=True   isinf=False
  large exp    = inf         isnan=False  isinf=True` },

    { t: "p", text: "Note the two-stage pattern: `log(0)` and `exp(100)` produce **infinities**, not NaNs, and the NaN appears one step later when that infinity meets a subtraction or a `0 × inf`. So checking only `isnan` misses the origin — check `isfinite`, which catches both." },

    { t: "code", lang: "python", title: "Guard the step",
      code: `def assert_finite(name, t):
    if not torch.isfinite(t).all():
        raise FloatingPointError(f"{name} has NaN/Inf")   # fail loudly, at the source

def train_step(model, batch, optimizer, clip=1.0):
    optimizer.zero_grad()
    out = model(batch["x"])
    assert_finite("logits", out)                          # catch before it spreads
    loss = loss_fn(out, batch["y"])
    assert_finite("loss", loss)
    loss.backward()

    grad_norm = torch.nn.utils.clip_grad_norm_(model.parameters(), clip)
    if not torch.isfinite(grad_norm):
        optimizer.zero_grad()                             # skip, do not poison the weights
        return {"loss": float("nan"), "skipped": True}

    optimizer.step()
    return {"loss": loss.item(), "grad_norm": grad_norm.item()}`,
      caption: "Skipping a bad step is better than clipping it: a non-finite gradient has no direction worth preserving, so the only safe action is to discard it and continue." },

    { t: "callout", kind: "good", title: "`torch.autograd.set_detect_anomaly(True)` names the exact op",
      body: [{ t: "p", text: "When a NaN appears in the backward pass and you cannot find it, anomaly detection runs every backward op with a check and raises at the first one producing a non-finite value, with a stack trace pointing at the forward operation that created that node. It is slow — often several times slower — so it is a debugging tool rather than something to leave on. But it turns 'a NaN appeared somewhere in a 200-layer model' into a file and line number, which is usually the difference between an afternoon and five minutes." }] },

    { t: "h2", n: "04", text: "Unnormalised inputs", id: "inputs" },

    { t: "out", text: `  normalised [0,1]  : loss 1.221e+00 -> 1.168e+00  (stable)
  raw [0,255]       : loss 8.516e+02 -> 3.046e+14  (x3.6e+11 GROWING - diverging)` },

    { t: "p", text: "Identical model, identical learning rate — the only difference is that pixel values were left at 0–255 instead of scaled to 0–1. The loss grew by **eleven orders of magnitude in eight steps**. This is the most common cause of a run that dies immediately, and it is entirely a data-pipeline problem rather than a modelling one. Lesson 4.8 measured the milder version, where unscaled tabular features cost R² without diverging." },

    { t: "h2", n: "05", text: "The gradient norm", id: "grad-norm" },

    { t: "code", lang: "python", title: "Log it every step",
      code: `def global_grad_norm(model):
    total = 0.0
    for p in model.parameters():
        if p.grad is not None:
            total += p.grad.detach().norm() ** 2
    return total ** 0.5
# Exploding: 1e3 -> 1e6.   Vanishing: 1e-1 -> 1e-7.`,
      caption: "`clip_grad_norm_` already returns this value, so if you are clipping you get it for free — just capture the return rather than discarding it." },

    { t: "out", text: `  global grad norm before clip: 6.589e+09
  clip_grad_norm_ returned    : 6.589e+09   (the PRE-clip norm)
  global grad norm after clip : 1.0000` },

    { t: "callout", kind: "mental", title: "A healthy run has a stable band; the shape of the deviation names the problem",
      body: [{ t: "p", text: "Watch the gradient norm and the diagnosis usually reads itself. A steady band over orders of magnitude means healthy training. A sharp rise — 1e3 to 1e6 over a few steps — is explosion, and the cure is clipping and a lower learning rate. A steady decay towards 1e-7 is vanishing, and the cure is architectural: better initialisation, normalisation, residual connections. An occasional spike on particular batches points at the data rather than the model. It is one scalar per step, costs nothing if you are already clipping, and it is the single most informative thing you can log." }] },

    { t: "exercise", kind: "practice", title: "Induce and detect each failure", difficulty: "intermediate", minutes: 40,
      prompt: "Build a 30-layer network and initialise it at gains of 0.5, 1.0, √2 and 2.5, recording the activation norm at the output and the gradient norm at the first layer for each. Confirm the near-unity regime is where both are sane. Then deliberately cause a NaN four ways — unnormalised inputs, `log` of a model output that can reach zero, a learning rate ten times too high, and a division by a batch statistic that can be zero — and verify your `assert_finite` guard catches each at the right place. Finally, turn on anomaly detection for one of them and confirm it names the operation.",
      hints: [
        "For the gain sweep, `nn.init.normal_(w, 0, gain/sqrt(fan_in))`.",
        "`log` of a softmax output is the classic — add an epsilon and see the difference.",
        "Anomaly detection is slow; use a small model for that part."
      ],
      solution: {
        notes: [
          { t: "p", text: "The gain sweep should show the output activation norm spanning many orders of magnitude — I measured 1.5e-09 at gain 0.7 against 5.6e+07 at gain 2.5, across the same 30 layers. Seeing sixteen orders of magnitude appear from an initialisation constant makes the case for He and Xavier initialisation far better than the derivation does, and it explains why a model can produce `inf` before a single gradient step." },
          { t: "p", text: "The four NaN sources are worth doing separately because they surface in different places. Unnormalised inputs show up as a loss that grows rather than a NaN directly — I measured eleven orders of magnitude in eight steps. `log(0)` gives `-inf` first and a NaN only when that infinity meets a subtraction, which is why checking `isfinite` rather than `isnan` matters for catching it at the source. The division by a zero batch statistic is the subtlest, since it only triggers on batches where the statistic happens to vanish." },
          { t: "p", text: "Anomaly detection is worth using once so you know what it gives you: a stack trace pointing at the forward operation whose backward produced the first non-finite value. The slowdown is real, so it belongs in a debugging run rather than in your training loop, but it converts an unlocatable NaN into a line number." }
        ]
      } }

  ],

  takeaways: [
    "A per-layer factor of 1.5 gives 6.4e+08 over 50 layers; 0.7 gives 1.8e-08. Only near 1.0 is stable.",
    "Measured across 30 layers: gain 2.5 gives output norm 5.6e+07, He init 1.9, gain 0.7 gives 1.5e-09.",
    "NaN survives every operation including multiplication by zero, so it poisons a model within a few steps.",
    "`log(0)` and `exp(100)` give infinities first; check `isfinite`, not just `isnan`.",
    "Skip a step with a non-finite gradient rather than clipping it — there is no direction to preserve.",
    "Unnormalised [0,255] inputs grew the loss by 3.6e+11 in eight steps on an otherwise identical setup.",
    "`clip_grad_norm_` returns the pre-clip norm — log it; a stable band is health, a rise is explosion, a decay is vanishing."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does a single NaN destroy an entire model?",
      options: ["It causes an exception", "It survives every operation including multiplication by zero, so it spreads through gradients into weights", "It corrupts GPU memory", "It only affects the loss value"],
      answer: 1,
      why: "`nan * 0` is `nan`, so no masking or averaging cleans it out. It reaches the loss, then a weight's gradient, then after `optimizer.step()` that weight itself — and from the next forward pass every output that weight touches is NaN. Within a few steps the whole model is poisoned." },
    { stem: "Your loss becomes NaN. Where should the check go?",
      options: ["On the loss value only", "At the source — on the logits before the loss, and on the gradient norm before the step", "After the optimizer step", "In the data loader"],
      answer: 1,
      why: "By the time the NaN is visible in the loss, the information about its origin is gone. Checking logits before the loss and the gradient norm before the step localises it. Check `isfinite` rather than `isnan`, because `log(0)` and `exp(100)` produce infinities that only become NaN one operation later." },
    { stem: "A 30-layer network initialised at gain 2.5 produces output activations with norm 5.6e+07. What is the fix?",
      options: ["Lower the learning rate", "Use He initialisation — gain √2 for ReLU — which gave a norm of 1.9", "Add dropout", "Reduce the batch size"],
      answer: 1,
      why: "The problem is present at initialisation, before any gradient step, so no optimiser setting addresses it. The per-layer multiplier compounds across depth, and He initialisation is derived precisely to keep that multiplier near 1 for ReLU networks — measured output norm 1.935 against 5.6e+07." },
    { stem: "What does `clip_grad_norm_` return?",
      options: ["The clipped norm", "The norm before clipping", "The number of clipped parameters", "Nothing"],
      answer: 1,
      why: "It returns the pre-clip global norm — measured at 6.589e+09 in a case that was then clipped to exactly 1.0000. That makes it a free diagnostic: if you are already clipping, capturing the return value gives you the gradient norm to log every step at no cost." }
  ] },

  interview: { title: "Interview", sub: "Instability diagnosis", questions: [
    { level: "Core", q: "Your training loss becomes NaN after a few steps. How do you debug it?",
      strong: "Guard at the source with isfinite checks, then look at inputs, learning rate and the loss function's math.",
      answer: [{ t: "p", text: "The problem with a NaN is that by the time it reaches the loss it has already spread, so the first thing I do is add `isfinite` assertions on the logits before the loss and on the gradient norm before the optimiser step, which localises it. I check `isfinite` rather than `isnan` because `log(0)` and `exp` of a large number produce infinities first, and the NaN only appears an operation later when that infinity meets a subtraction. Then the usual sources in order of likelihood: unnormalised inputs, which is by far the most common — I measured raw 0-to-255 pixel values growing the loss eleven orders of magnitude in eight steps on a model that was fine with scaled inputs; a learning rate too high, where the first updates overshoot; and bad math in a custom loss, meaning `log` of something that can be zero, division by a batch statistic that can vanish, or `sqrt` of something that can go negative. If I still cannot find it, `torch.autograd.set_detect_anomaly(True)` names the exact operation, at the cost of running much slower." }] },
    { level: "Senior", q: "What would you log to catch instability early?",
      strong: "Gradient norm every step, plus activation statistics and the learning rate — the norm's shape names the problem.",
      answer: [{ t: "p", text: "The global gradient norm every step, first and foremost. It costs nothing if you are already clipping, because `clip_grad_norm_` returns the pre-clip norm, and its shape diagnoses the failure: a stable band is health, a sharp rise from say 1e3 to 1e6 is explosion, a steady decay towards 1e-7 is vanishing, and isolated spikes on particular batches point at the data rather than the model. Alongside that I would log per-layer activation and gradient statistics at a few depths, because the aggregate norm can look fine while one layer is doing something pathological. The learning rate itself, since with a schedule the value at any step is not always what you think. And the fraction of steps skipped for non-finite gradients, which is a silent failure if you are skipping and not counting. For mixed precision I would add the loss scale, because a scaler repeatedly halving its scale means it is fighting overflow and something is wrong upstream." }] },
    { level: "Senior", q: "Why is initialisation such a large factor in deep networks?",
      strong: "It sets the per-layer multiplier, and depth compounds it exponentially.",
      answer: [{ t: "p", text: "Because a forward pass is a chain of multiplications and backprop runs the same chain in reverse, so any systematic deviation from a per-layer factor of one compounds exponentially with depth. The arithmetic is stark: 1.5 to the fiftieth power is about 6e8 and 0.7 to the fiftieth is about 2e-8, and neither 1.5 nor 0.7 is an extreme value — they are what a slightly wrong initialisation gives you. I measured this across thirty layers: at gain 2.5 the output activation norm was 5.6e+07, at He initialisation with gain root-two it was 1.9, and at gain 0.7 it was 1.5e-09. Sixteen orders of magnitude from a single constant, present before any gradient step, so no optimiser setting can rescue it. He initialisation for ReLU and Xavier for tanh are derived to hold that factor near one, and normalisation layers and residual connections exist to maintain it during training rather than only at the start." }] }
  ] }
});

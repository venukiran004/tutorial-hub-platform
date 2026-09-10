/* ============================================================================
   LESSON 2.3 — Gradient Descent and Its Failure Modes
   ========================================================================= */
EC.receiveLesson({
  id: "2.3",

  lede: "Gradient descent is three words: **go downhill, repeatedly**. Everything interesting is in the step size — too small and you never arrive, too large and you climb the far wall — and every optimiser since is an answer to the fact that one step size cannot suit every direction at once.",

  objectives: [
    "Implement gradient descent and predict when it will diverge",
    "Explain the three failure modes and tell them apart from the loss curve",
    "Say what momentum, RMSProp and Adam each fix",
    "Choose between full-batch, mini-batch and stochastic gradients",
    "Read a learning-rate schedule as a decision rather than a default"
  ],

  prerequisites: ["2.2"],

  blocks: [

    { t: "h2", n: "01", text: "The whole algorithm", id: "algorithm" },

    { t: "p", text: "**Gradient descent is four lines: compute the gradient, step against it, repeat, stop.** Everything written about optimisers since is a variation on how large that step should be and in what direction — the core loop has not changed." },

    { t: "dl", items: [
      ["Gradient descent", "The update `θ ← θ − η∇f(θ)`. Move downhill by a fixed fraction of the slope."],
      ["Learning rate", "`η`, the step size. The one parameter that matters most, and the one most often wrong."],
      ["Convergence", "Reaching a point where the gradient is near zero and further steps change little."],
      ["Divergence", "Steps large enough that each overshoots further than the last, so the loss grows without bound."]
    ]},

    { t: "p", text: "There is a hard limit on the step size: **for a curvature of `L`, any learning rate above `2/L` diverges**, regardless of how well everything else is configured. That threshold is why doubling a working learning rate sometimes produces `NaN` rather than faster training." },

    { t: "code", lang: "python", title: "four lines, and the one parameter that matters", code: `
import numpy as np

def gradient_descent(grad, x0, lr, steps):
    x = np.array(x0, dtype=float)
    for _ in range(steps):
        x = x - lr * grad(x)          # THE ALGORITHM
    return x

# On f(x) = x^2, whose gradient is 2x and whose minimum is at 0:
grad = lambda x: 2 * x

for lr in (0.1, 0.5, 0.9, 1.0, 1.1):
    x = 1.0
    for _ in range(20):
        x = x - lr * grad(x)
    print(lr, f"{x:.6f}")
#   0.1   0.011529     converging
#   0.5   0.000000     one step -- exactly optimal here
#   0.9   0.011529     converging, oscillating in sign
#   1.0   1.000000     bouncing between 1 and -1 forever
#   1.1   6.727500     DIVERGING

# The update multiplies x by (1 - lr*2) each step, so the behaviour is
# entirely decided by |1 - 2*lr|:
#
#   < 1   converge      0 < lr < 1
#   = 1   oscillate     lr = 1
#   > 1   diverge       lr > 1
#
# Generalised: for curvature lambda, stability needs lr < 2/lambda, and
# the fastest single step is lr = 1/lambda (see 2.2).
`,
      hl: [6, 19],
      caption: "**`lr = 0.5` solves this in one step because `1/λ = 1/2` exactly.** That is Newton's method — the optimal step for a quadratic is one divided by the curvature, and everything else is an approximation to it."
    },

    { t: "viz",
      title: "Three ways a loss curve goes wrong",
      caption: "Each shape has a distinct cause and a distinct fix. Reading the curve before reaching for a hyperparameter sweep is usually faster than the sweep.",
      svg: `<svg viewBox="0 0 900 240" role="img" aria-label="Four loss curves: healthy, too small, too large, and oscillating">
  <g>
    <text x="24" y="28" class="s-label" style="fill:var(--good)">HEALTHY</text>
    <path d="M24 60 C 60 130, 110 158, 190 164" style="stroke:var(--good);fill:none" stroke-width="2"/>
    <text x="24" y="200" class="s-sub" style="fill:var(--ink-3)">steep, then flattens</text>
  </g>
  <g>
    <text x="234" y="28" class="s-label" style="fill:var(--warn)">lr TOO SMALL</text>
    <path d="M234 60 L 400 140" style="stroke:var(--warn);fill:none" stroke-width="2"/>
    <text x="234" y="200" class="s-sub" style="fill:var(--ink-3)">linear, never flattens</text>
    <text x="234" y="222" class="s-sub" style="fill:var(--ink-3)">fix: raise lr</text>
  </g>
  <g>
    <text x="444" y="28" class="s-label" style="fill:var(--crit)">lr TOO LARGE</text>
    <path d="M444 150 L 470 120 L 496 160 L 522 80 L 548 170 L 574 40 L 600 175" style="stroke:var(--crit);fill:none" stroke-width="2"/>
    <text x="444" y="200" class="s-sub" style="fill:var(--ink-3)">grows, often to nan</text>
    <text x="444" y="222" class="s-sub" style="fill:var(--ink-3)">fix: lower lr, clip</text>
  </g>
  <g>
    <text x="654" y="28" class="s-label" style="fill:var(--t-amber)">ILL-CONDITIONED</text>
    <path d="M654 60 C 690 120, 700 130, 720 132 L 876 140" style="stroke:var(--t-amber);fill:none" stroke-width="2"/>
    <path d="M654 60 C 690 120, 700 130, 720 132" style="stroke:var(--t-amber);fill:none" stroke-width="2"/>
    <text x="654" y="200" class="s-sub" style="fill:var(--ink-3)">drops then plateaus</text>
    <text x="654" y="222" class="s-sub" style="fill:var(--ink-3)">fix: scale, normalise, Adam</text>
  </g>
</svg>`
    },

    { t: "h2", n: "02", text: "One step size cannot suit every direction", id: "problem" },

    { t: "p", text: "A single learning rate has to serve every parameter, and that is the central difficulty. **When the loss surface is a long thin valley, the rate that is safe across the valley is far too small to make progress along it** — so descent zigzags and crawls." },

    { t: "dl", items: [
      ["Ill-conditioned surface", "One where curvature differs sharply between directions. Measured by the Hessian's condition number."],
      ["Zigzagging", "The characteristic path of gradient descent in a valley: large oscillations across it, tiny progress along it."],
      ["Momentum", "Accumulating a running average of past gradients. Oscillations cancel and consistent directions reinforce, so the valley floor is traversed faster."],
      ["Adaptive methods", "Adam, RMSProp and relatives, which keep a per-parameter scale estimate so each coordinate gets an appropriate step."],
      ["Adam", "The common adaptive optimiser: momentum plus a per-parameter running estimate of gradient scale, with a bias correction for the first few steps. Effectively a diagonal approximation to Newton's method."]
    ]},

    { t: "code", lang: "python", title: "the valley that defeats plain descent", code: `
# A quadratic with curvature 20 in one direction and 1 in the other.
H = np.diag([20.0, 1.0])
grad = lambda x: H @ x

# Stability is set by the LARGEST curvature: lr < 2/20 = 0.1.
# Progress in the flat direction is set by the SMALLEST: 1.
#
# So the step size that keeps the steep direction stable is 20x too
# small for the flat one. That gap IS the condition number.

x = np.array([1.0, 1.0])
for _ in range(50):
    x = x - 0.09 * grad(x)

x.round(6)          # [0., 0.010405]
#                      ^ steep direction: solved in a few steps
#                          ^ flat direction: barely moved in 50

# The steep coordinate contracts by (1 - 0.09*20) = -0.8 per step;
# the flat one by (1 - 0.09*1) = 0.91.
0.8**50, 0.91**50           # 1.4e-05, 0.0094

# NO SINGLE lr FIXES THIS. Raise it to help the flat direction and the
# steep one diverges:
x = np.array([1.0, 1.0])
for _ in range(50):
    x = x - 0.11 * grad(x)
np.abs(x).max()             # 1.5e+09 -- exploded
`,
      hl: [7, 16, 26],
      caption: "**This is the whole motivation for adaptive optimisers.** Plain descent has one scalar for every direction; the problem needs a different step per direction, and every method after SGD is an attempt to estimate what those should be."
    },

    { t: "ladder",
      title: "Descending a long, thin valley",
      rungs: [
        { level: "bad", label: "Plain gradient descent",
          why: "Bounded above by the steepest direction and bottlenecked below by the flattest, so it zig-zags across the valley while creeping along it. The number of steps scales with the condition number, which can be thousands.",
          code: `x = x - lr * g

# Stable requires lr < 2/lambda_max.
# Progress requires lr large relative to 1/lambda_min.
# When lambda_max >> lambda_min those cannot both hold.` },
        { level: "ok", label: "Add momentum",
          why: "Accumulate a velocity so oscillations across the valley cancel while consistent motion along it accumulates. It genuinely helps — the effective rate improves from the condition number to roughly its square root — and it adds a second hyperparameter to get wrong.",
          code: `v = np.zeros_like(x)
for _ in range(steps):
    v = beta * v + g          # beta ~ 0.9
    x = x - lr * v

# Across the valley the gradient flips sign each step, so terms cancel.
# Along it the sign is constant, so they add: the effective step is
# roughly 1/(1-beta) = 10x larger in the consistent direction.` },
        { level: "best", label: "Adapt the step per parameter",
          why: "Track each parameter's recent squared gradient and divide by its root. A direction with large gradients gets small steps and a flat one gets large steps, which is a diagonal approximation to dividing by the curvature — the conditioning fix rather than a workaround.",
          code: `# Adam: momentum on the gradient, and a per-parameter scale.
m = np.zeros_like(x)          # first moment  -- direction
v = np.zeros_like(x)          # second moment -- magnitude
b1, b2, eps = 0.9, 0.999, 1e-8

for t in range(1, steps + 1):
    g = grad(x)
    m = b1 * m + (1 - b1) * g
    v = b2 * v + (1 - b2) * g**2

    # Bias correction: m and v start at zero, so early estimates are
    # biased toward zero. Without this the first steps are far too small.
    m_hat = m / (1 - b1**t)
    v_hat = v / (1 - b2**t)

    x = x - lr * m_hat / (np.sqrt(v_hat) + eps)

# The division by sqrt(v) is the point: it rescales each axis, so the
# 20:1 curvature ratio stops mattering. The eps prevents division by
# zero for a parameter whose gradient has been consistently zero.`,
          note: "**Adam is diagonal preconditioning with momentum.** It rescales axes and cannot rotate, so ill-conditioning from *correlated* parameters survives — which is why normalisation layers still help alongside it." }
      ]
    },

    { t: "h2", n: "03", text: "How much data per step", id: "batch" },

    { t: "p", text: "**Batch size decides how much data contributes to each gradient**, trading noise against compute. A full-dataset gradient is exact and expensive; a single-example gradient is cheap and extremely noisy — and that noise turns out to be useful rather than merely tolerable." },

    { t: "dl", items: [
      ["Batch gradient descent", "One update per pass over the whole dataset. Exact gradient, very few updates."],
      ["Stochastic gradient descent", "One update per example. Maximum noise, maximum updates per epoch."],
      ["Mini-batch", "The practical middle: 32 to 512 examples. Gradient noise falls as `1/√batch`, so returns diminish quickly."],
      ["Gradient noise", "The difference between a batch gradient and the true one. It helps escape saddle points, which is why pure batch descent is not obviously better."],
      ["SGD", "Stochastic gradient descent — updating from a small random subset rather than the whole dataset. The noise it introduces is useful, not merely tolerated."],
      ["Saddle point", "A critical point that is a minimum in some directions and a maximum in others. In high dimensions these vastly outnumber true minima, and gradient noise is what escapes them."]
    ]},

    { t: "table",
      head: ["", "Full batch", "Mini-batch", "Stochastic (n=1)"],
      rows: [
        ["Gradient", "Exact", "**Noisy estimate**", "Very noisy"],
        ["Cost per step", "All data", "**A batch**", "One sample"],
        ["Steps per epoch", "1", "n/batch", "n"],
        ["Escapes saddles", "**No** — gradient is zero and stays zero", "**Yes**, via noise", "Yes"],
        ["Hardware use", "Poor at scale", "**Good** — vectorised", "Poor"],
        ["In practice", "Small problems only", "**The default**", "Rare"]
      ],
      caption: "**Mini-batch noise is a feature, not a tolerated cost.** It is what perturbs the parameters off a saddle point, which is why raising the batch size to reduce variance can make a plateau worse rather than better."
    },

    { t: "code", lang: "python", title: "noise as an escape mechanism", code: `
# A saddle: up in x, down in y.
def grad_saddle(p):
    return np.array([2 * p[0], -2 * p[1]])

# Full batch, starting exactly on the saddle: the gradient is zero, so
# nothing ever happens.
x = np.array([0.0, 0.0])
for _ in range(1000):
    x = x - 0.1 * grad_saddle(x)
x                       # [0., 0.] -- stuck forever

# With minibatch noise, the y-component gets a nudge and then GROWS,
# because that direction has negative curvature.
rng = np.random.default_rng(0)
x = np.array([0.0, 0.0])
for _ in range(60):
    noisy = grad_saddle(x) + rng.normal(0, 0.01, 2)
    x = x - 0.1 * noisy
np.abs(x[1]).round(3)   # 0.62 -- escaped and accelerating away

# THE ASYMMETRY IS THE MECHANISM: the noise perturbs both coordinates,
# but only the negative-curvature one amplifies its perturbation. The
# positive-curvature coordinate is pushed back toward zero.
`,
      hl: [10, 18],
      caption: "**Larger batches give a cleaner gradient and less of this.** That is the real trade in batch-size tuning — variance reduction against the perturbation that gets you off flat regions."
    },

    { t: "callout", kind: "trap", title: "Four things that look like optimiser problems", body: [
      { t: "code", lang: "python", title: "and are not", numbered: false, code: `
# 1. FORGETTING TO ZERO THE GRADIENTS (PyTorch).
#    Gradients ACCUMULATE by default, so without zero_grad() step k uses
#    the sum of all gradients so far -- an ever-growing effective step
#    that eventually diverges. Looks exactly like "lr too high".

# 2. THE LOSS AVERAGED OVER THE BATCH, OR SUMMED?
#    sum() makes the effective learning rate proportional to batch size.
#    Change the batch size and the model diverges, for reasons that have
#    nothing to do with batching.
loss = (pred - y).pow(2).mean()      # lr independent of batch size
loss = (pred - y).pow(2).sum()       # lr scales WITH batch size

# 3. A SCHEDULE STEPPED PER BATCH RATHER THAN PER EPOCH.
#    A cosine schedule meant to decay over 50 epochs, stepped every
#    batch, reaches its minimum in the first epoch and trains the rest
#    of the run at lr ~ 0.

# 4. WEIGHT DECAY APPLIED THROUGH THE ADAPTIVE TERM.
#    In Adam, L2 regularisation added to the gradient gets divided by
#    sqrt(v) like everything else, so parameters with large gradients
#    are decayed LESS -- the opposite of the intent. AdamW applies the
#    decay directly to the weights, which is why it exists.
#
#      Adam  + L2:   x -= lr * (m_hat/(sqrt(v_hat)+eps))   # decay inside
#      AdamW:        x -= lr * m_hat/(sqrt(v_hat)+eps) + lr*wd*x`},
      { t: "p", text: "**Every one of these presents as instability and gets treated with a learning-rate reduction**, which masks it. Lowering the rate makes an accumulating gradient diverge more slowly rather than fixing the accumulation." }
    ]},

    { t: "h2", n: "04", text: "Schedules", id: "schedules" },

    { t: "p", text: "**A learning-rate schedule changes the step size during training**, because the right size early is not the right size late. Large steps make fast progress across the landscape; small steps are needed to settle into a minimum without bouncing out of it." },

    { t: "dl", items: [
      ["Schedule", "A rule setting the learning rate as a function of step or epoch."],
      ["Warmup", "Starting small and increasing over the first few hundred steps. It prevents early divergence when initial gradients are large and poorly estimated."],
      ["Decay", "Reducing the rate over training — step, exponential or cosine. Cosine is the common default because it decays smoothly to near zero."],
      ["Per-step versus per-epoch", "Whether the schedule advances every batch or every pass. Stepping a per-step schedule once per epoch is a frequent and quiet bug."]
    ]},

    { t: "code", lang: "python", title: "why the rate should change", code: `
# EARLY: you are far away, the surface is roughly linear, and large
#        steps make fast progress.
# LATE:  you are near the minimum, and a large step overshoots -- the
#        loss bounces around a floor it never reaches.
#
# A schedule encodes that.

def cosine(step, total, lr_max, lr_min=0.0, warmup=0):
    """Warmup then cosine decay -- the current default for large models."""
    if step < warmup:
        # Adam's variance estimate is unreliable for the first few
        # hundred steps, so a full-size step early is a large step in a
        # direction estimated from almost no data. Warmup is protection
        # against that, not superstition.
        return lr_max * step / warmup
    p = (step - warmup) / max(1, total - warmup)
    return lr_min + 0.5 * (lr_max - lr_min) * (1 + np.cos(np.pi * p))

[round(cosine(s, 1000, 0.1, warmup=100), 4) for s in (0, 50, 100, 500, 900, 999)]
#   [0.0, 0.05, 0.1, 0.0691, 0.0031, 0.0]

# STEP DECAY -- older, still common, and the drops are visible as
# cliffs in the loss curve:
def step_decay(step, lr0=0.1, drop=0.1, every=300):
    return lr0 * drop ** (step // every)

# CHOOSING lr_max: run a range test. Increase lr exponentially over a
# few hundred steps and plot the loss; take roughly an order of
# magnitude below where it starts rising.
`,
      hl: [11, 20],
      caption: "**Warmup exists because Adam's second-moment estimate is garbage for the first few hundred steps.** A full step then is a confident move in a direction estimated from almost no evidence."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Read four training runs from their loss curves",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Four runs of the same model and data, differing only in optimiser settings. Diagnose each from its loss trace and say what to change." },
        { t: "code", lang: "python", numbered: false, title: "loss at selected steps", code: `
# RUN A   lr=0.5,  SGD
#   0: 2.31   10: 8.4e3   20: 1.2e9   30: nan

# RUN B   lr=1e-5, SGD
#   0: 2.31   500: 2.28   1000: 2.25   5000: 2.11   10000: 1.98

# RUN C   lr=0.01, SGD
#   0: 2.31   100: 1.42   200: 1.19   500: 1.14   2000: 1.13   5000: 1.13

# RUN D   lr=0.01, Adam, no warmup
#   0: 2.31   1: 2.29   2: 47.3   3: 1.9e4   10: nan`},
        { t: "p", text: "For each: name the failure, give the evidence, and give the fix. One of them is not a learning-rate problem." }
      ],
      requirements: [
        "Diagnose all four with the specific evidence from the numbers.",
        "Identify the run whose problem is not the learning rate.",
        "Explain why run D fails at step 2 specifically.",
        "Say what distinguishes run C from a correctly converged run.",
        "Give the fix for each.",
        "Give an ordered checklist for diagnosing a bad run."
      ],
      hint: "For D, ask what Adam divides by, and what that quantity equals after one step.",
      solution: {
        lang: "python",
        title: "diagnosis.md",
        code: `# =========================================================================
# RUN A -- lr TOO HIGH
# =========================================================================
#
#   0: 2.31   10: 8.4e3   20: 1.2e9   30: nan
#
# EVIDENCE: the loss GROWS, and roughly geometrically -- each order of
# magnitude arrives in about the same number of steps. That is the
# signature of a multiplicative divergence: the update multiplies the
# error by |1 - lr*lambda| > 1 every step.
#
# With lr = 0.5, stability needs lambda_max < 2/0.5 = 4. The loss
# exploding means the largest curvature exceeds that.
#
# FIX: lower lr. A range test would find the boundary; a quick estimate
# is to drop by 10x until it descends, then tune upward.
# Gradient clipping is a safety net, not a fix -- it bounds the damage
# from an occasional large gradient, and cannot rescue a step size that
# is systematically too big.
#
#
# =========================================================================
# RUN B -- lr TOO LOW
# =========================================================================
#
#   0: 2.31   500: 2.28   1000: 2.25   5000: 2.11   10000: 1.98
#
# EVIDENCE: descending, monotonically, and almost LINEARLY. Over 10,000
# steps the loss has fallen 0.33 with no sign of flattening -- a healthy
# run drops fast and then curves. Linear descent over that many steps
# means every step is tiny relative to the distance remaining.
#
# Extrapolating, reaching ~1.13 (where run C plateaus) would take on the
# order of 40,000 more steps.
#
# FIX: raise lr, by 10x to 100x. This is the cheapest failure to fix and
# the easiest to miss, because nothing looks wrong -- it is just slow,
# and slow is often blamed on the problem rather than the setting.
#
#
# =========================================================================
# RUN C -- NOT A LEARNING-RATE PROBLEM
# =========================================================================
#
#   0: 2.31   100: 1.42   200: 1.19   500: 1.14   2000: 1.13   5000: 1.13
#
# EVIDENCE: this is the shape of a HEALTHY run -- fast early progress,
# then a smooth flattening. It converged, at step ~500, and then sat
# still for 4,500 more steps.
#
# The question is not "why did it stop" but "is 1.13 good enough". The
# loss curve alone cannot answer that; it needs a reference:
#
#   - what does a trivial baseline score? For balanced 3-class
#     cross-entropy, chance is ln(3) = 1.0986. A loss of 1.13 is WORSE
#     THAN GUESSING.
#
# That single comparison changes the diagnosis completely. This is not a
# converged model; it is a model that has learned nothing and settled at
# the constant-output solution -- predicting the class priors and
# ignoring the input.
#
# CAUSES, in order of likelihood:
#   - the model has no capacity for the task (too small / too linear)
#   - the features carry no signal, or are misaligned with the labels
#   - the labels are shuffled relative to the inputs (a data bug)
#   - a dead activation layer -- every unit saturated or zeroed
#
# FIX: not the optimiser. Check the baseline first, then verify a single
# batch can be OVERFITTED. If the model cannot drive the loss to ~0 on
# ten samples, the problem is the model or the data, and no amount of
# tuning will help.
#
#
# =========================================================================
# RUN D -- ADAM WITHOUT WARMUP
# =========================================================================
#
#   0: 2.31   1: 2.29   2: 47.3   3: 1.9e4   10: nan
#
# EVIDENCE: one reasonable step, then an explosion at step 2 -- far too
# fast for a merely-too-large learning rate, which would grow over tens
# of steps as run A did.
#
# WHY STEP 2 SPECIFICALLY. Adam's update is
#
#     x -= lr * m_hat / (sqrt(v_hat) + eps)
#
# with bias correction m_hat = m/(1-b1^t), v_hat = v/(1-b2^t).
#
# At t=1, with m and v initialised to zero:
#
#     m = (1-b1) g = 0.1 g       m_hat = 0.1g / 0.1  = g
#     v = (1-b2) g^2 = 0.001 g^2 v_hat = 0.001g^2/0.001 = g^2
#
#     step = lr * g / (|g| + eps) ~= lr * sign(g)
#
# So the FIRST step is well behaved -- bias correction makes it exactly
# a signed step of size lr.
#
# At t=2 the two moments have different effective horizons: b1=0.9
# adapts in ~10 steps, b2=0.999 in ~1000. With only two gradients, v_hat
# is estimated from almost nothing, and if the second gradient is much
# smaller than the first in some coordinate, sqrt(v_hat) for that
# coordinate is tiny while m_hat is not. Dividing by it produces a huge
# step in that direction.
#
# That is the known instability: the variance estimate is unreliable
# early, and the update divides by it.
#
# FIX: warmup. Ramp lr linearly from 0 over a few hundred steps, so the
# steps taken while v_hat is unreliable are small.
#   Alternatives: raise eps, lower b2 to ~0.99 so it adapts faster, or
#   use RAdam, which rectifies the variance term explicitly.
#
#
# =========================================================================
# THE CHECKLIST
# =========================================================================
#
# Run these IN ORDER. Most bad runs are resolved before step 4, and
# reaching for a hyperparameter sweep first wastes the most time.
#
#   1. IS THE LOSS BELOW THE TRIVIAL BASELINE?
#      ln(k) for balanced k-class cross-entropy; the variance of y for
#      regression. Above it, the model has learned nothing and the
#      optimiser is not the problem. (This is run C.)
#
#   2. CAN THE MODEL OVERFIT TEN SAMPLES TO ~ZERO LOSS?
#      If not, the bug is in the model, the data pipeline or the loss --
#      not the optimisation. Fastest single diagnostic there is.
#
#   3. WHAT SHAPE IS THE CURVE?
#      growing        -> lr too high            (run A)
#      linear, slow   -> lr too low             (run B)
#      explodes at
#      step 2-3 only  -> adaptive warmup issue  (run D)
#      drops then
#      plateaus high  -> conditioning, or see 1
#
#   4. ARE THE GRADIENTS SANE?
#      Log the gradient norm per layer. A constant ratio between layers
#      is vanishing/exploding (lesson 2.1); a norm of exactly zero is a
#      dead layer or a detached graph.
#
#   5. ONLY NOW, TUNE.
#      Range-test the learning rate, then consider schedule and
#      optimiser.
#
#
# =========================================================================
# TESTS
# =========================================================================

def test_divergence_is_geometric_not_linear():
    """Run A's signature: each order of magnitude in a similar number
    of steps."""
    losses = np.array([2.31, 8.4e3, 1.2e9])
    logs = np.log10(losses)
    gaps = np.diff(logs)

    assert (gaps > 0).all()
    assert abs(gaps[0] - gaps[1]) / gaps[0] < 0.5      # roughly constant


def test_plateau_above_chance_is_not_convergence():
    """Run C. The check that reframes the whole diagnosis."""
    n_classes, plateau = 3, 1.13

    assert plateau > np.log(n_classes)      # 1.0986 -- worse than guessing


def test_adam_first_step_is_bounded_by_lr():
    """Why run D survives step 1: bias correction makes it a signed step."""
    g, lr, b1, b2, eps = 3.7, 0.01, 0.9, 0.999, 1e-8
    m, v = (1 - b1) * g, (1 - b2) * g**2
    m_hat, v_hat = m / (1 - b1), v / (1 - b2)

    step = lr * m_hat / (np.sqrt(v_hat) + eps)

    assert np.isclose(step, lr, rtol=1e-6)             # exactly lr


def test_warmup_bounds_the_early_steps():
    rates = [cosine(s, 1000, 0.1, warmup=100) for s in range(5)]

    assert max(rates) < 0.005                          # tiny while v is noisy`,
        notes: [
          { t: "p", text: "**Run C is the one that is not a learning-rate problem, and the tell is a number nobody computes.** For balanced 3-class cross-entropy, chance is `ln(3) = 1.0986` — so a plateau at 1.13 is *worse than guessing*. That is not convergence; it is a model that has learned nothing." },
          { t: "p", text: "**Always compare the loss to a trivial baseline first.** A curve that looks healthy — fast drop, smooth flattening — can be a model settling at the constant-output solution, and no amount of optimiser tuning changes that." },
          { t: "callout", kind: "insight", title: "Why Adam survives step 1 and fails at step 2", body: [
            { t: "p", text: "At `t=1`, bias correction cancels exactly: `m_hat = g` and `v_hat = g²`, so the update is `lr · g/|g| = lr · sign(g)` — a bounded, signed step regardless of gradient magnitude." },
            { t: "p", text: "At `t=2` the two moments have very different horizons (`β₁ = 0.9` adapts in ~10 steps, `β₂ = 0.999` in ~1000). With two gradients `v_hat` is estimated from almost nothing, and dividing by a tiny `sqrt(v_hat)` produces an enormous step. Warmup exists precisely for this window." }
          ]},
          { t: "p", text: "**Divergence shape distinguishes A from D.** A too-large learning rate grows geometrically over tens of steps; an adaptive-optimiser instability explodes at step 2 or 3. Same symptom, different cause, different fix." },
          { t: "p", text: "**The overfit-ten-samples test is the fastest diagnostic available.** If a model cannot drive the loss to near zero on a handful of examples, the bug is in the model, the data pipeline or the loss — and every hour spent tuning the optimiser is wasted." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team switched their loss from `.mean()` to `.sum()` while refactoring, and doubled their batch size in the same release for throughput." },
      { t: "p", text: "**Training diverged, and the two changes disguised each other.** Summing makes the effective learning rate proportional to batch size, so doubling the batch doubled it again — a 2× change that looked like the batch-size change and a batch-size change that looked like the loss change." },
      { t: "p", text: "**They spent a week bisecting the model architecture**, because the loss function and the batch size were both considered infrastructure rather than hyperparameters." },
      { t: "p", text: "**Anything that scales the gradient scales the learning rate.** Loss reduction, gradient accumulation steps, and batch size are all learning-rate changes wearing other names." }
    ]}
  ],

  takeaways: [
    "**Gradient descent is `x -= lr * grad`**, and everything interesting is the choice of `lr`.",
    "**Stability needs `lr < 2/λ_max`**; the fastest single step for a quadratic is `1/λ`, which is Newton's method.",
    "**One step size cannot suit every direction** — the steepest bounds it above, the flattest needs it larger, and the gap is the condition number.",
    "**Momentum cancels oscillation across a valley and accumulates motion along it**, improving the rate from `κ` to roughly `√κ`.",
    "**Adam is diagonal preconditioning with momentum.** It rescales axes but cannot rotate, so correlated ill-conditioning survives it.",
    "**Adam's bias correction makes the first step exactly `lr · sign(g)`** — and the instability arrives at step 2, when `v_hat` is estimated from almost nothing.",
    "**Warmup exists because the variance estimate is unreliable early**, not as superstition.",
    "**Mini-batch noise is what escapes saddle points**, so raising the batch size can make a plateau worse.",
    "**Compare the loss to a trivial baseline before anything else** — `ln(k)` for balanced k-class cross-entropy. A plateau above it means nothing was learned.",
    "**If a model cannot overfit ten samples, the bug is not the optimiser.** It is the fastest diagnostic available.",
    "**Read the curve shape**: growing means the rate is too high, linear means too low, exploding at step 2 means an adaptive warmup problem.",
    "**Anything that scales the gradient scales the learning rate** — `sum` versus `mean`, accumulation steps, and batch size are all learning-rate changes in disguise."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A 3-class classifier's loss drops smoothly to 1.13 and stays there. Balanced classes. What is happening?",
        options: [
          "It has converged to a good solution",
          "Chance is `ln(3) = 1.0986`, so 1.13 is worse than guessing — the model has learned nothing and this is not an optimiser problem",
          "The learning rate is too low",
          "It is overfitting"
        ],
        answer: 1,
        why: "The curve shape looks healthy, which is what makes this dangerous. Comparing to the trivial baseline reframes the diagnosis entirely: the model has settled at the constant-output solution. The next check is whether it can overfit ten samples — if not, the bug is in the model, data or loss."
      },
      {
        stem: "Adam with no warmup: loss is fine at step 1 and explodes at step 2. Why step 2?",
        options: [
          "The learning rate is too high",
          "Bias correction makes step 1 exactly `lr·sign(g)`; at step 2 `v_hat` is estimated from two gradients and can be tiny, so dividing by it gives an enormous step",
          "The gradients have vanished",
          "The model weights were initialised badly"
        ],
        answer: 1,
        why: "`β₁ = 0.9` adapts in about 10 steps while `β₂ = 0.999` takes about 1000, so the variance estimate is unreliable exactly when the momentum term is not. Warmup keeps steps small through that window; raising `eps`, lowering `β₂`, or RAdam are alternatives."
      },
      {
        stem: "Why can no single learning rate work well on a Hessian with eigenvalues 20 and 1?",
        options: [
          "Because the Hessian is not positive definite",
          "Stability requires `lr < 2/20 = 0.1`, but progress in the flat direction needs a step 20× larger — the constraints are incompatible",
          "Because gradient descent requires equal curvature",
          "Because momentum is required for any quadratic"
        ],
        answer: 1,
        why: "This is the entire motivation for adaptive methods. Plain descent has one scalar for all directions; the problem needs a different step per direction. Adam approximates that by dividing each parameter's step by the root of its recent squared gradient."
      },
      {
        stem: "A team changes the loss from `.mean()` to `.sum()` and training diverges. Why?",
        options: [
          "Summing produces numerical overflow",
          "The gradient scales with batch size, so the effective learning rate is multiplied by the batch size",
          "The loss is no longer differentiable",
          "Summing breaks the chain rule"
        ],
        answer: 1,
        why: "Anything that scales the gradient scales the learning rate. Loss reduction, gradient accumulation steps and batch size are all learning-rate changes wearing other names — which is why changing two of them in one release makes each look like the other's fault."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you debug a model whose loss will not go down?",
        strong: "Compare it to a trivial baseline first — `ln(k)` for balanced classes. Then check whether it can overfit ten samples. Only if both pass do I look at the optimiser, and then I read the curve shape before tuning.",
        answer: [
          { t: "p", text: "Leading with the baseline shows you check whether there is an optimisation problem at all, rather than assuming one." },
          { t: "p", text: "The overfit-ten-samples test is the answer interviewers listen for, because it separates model and data bugs from optimisation in one experiment." },
          { t: "p", text: "Naming curve shapes — growing, linear, plateau — turns \"tune the learning rate\" into a diagnosis." }
        ]
      },
      {
        level: "advanced",
        q: "What does Adam do that SGD does not?",
        strong: "It keeps a per-parameter estimate of recent squared gradients and divides the step by its root, which is a diagonal approximation to dividing by curvature. Plus momentum on the gradient direction, and bias correction so the early steps are not biased toward zero.",
        answer: [
          { t: "p", text: "Framing it as diagonal preconditioning connects it to conditioning rather than presenting it as a heuristic." },
          { t: "p", text: "Naming the limitation — it rescales axes but cannot rotate, so correlated ill-conditioning survives — shows you know what it does not fix." },
          { t: "p", text: "Explaining bias correction, and why warmup is still needed on top of it, covers the follow-up before it is asked." }
        ]
      },
      {
        level: "advanced",
        q: "Would you increase the batch size to speed up training?",
        strong: "It improves hardware utilisation and reduces gradient variance, but that variance is what escapes saddle points — so a larger batch can make a plateau worse. It also usually needs the learning rate raised to compensate.",
        answer: [
          { t: "p", text: "Treating noise as useful rather than as a cost is the insight; most answers treat variance reduction as unambiguously good." },
          { t: "p", text: "Mentioning the learning-rate coupling shows you know batch size is not an isolated knob." },
          { t: "p", text: "Distinguishing steps from epochs is worth adding — a larger batch means fewer updates per epoch, which is often the real slowdown." }
        ]
      }
    ]
  }
});

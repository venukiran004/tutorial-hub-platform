/* ============================================================================
   LESSON 2.1 — Derivatives and the Chain Rule
   ========================================================================= */
EC.receiveLesson({
  id: "2.1",

  lede: "A derivative is not a formula to apply — it is **the best straight line through a point**, and the number it gives you answers one question: if I nudge the input, how much does the output move? Backpropagation is that question asked repeatedly through a composition, which is why the chain rule is not a technique in deep learning but the whole of it.",

  objectives: [
    "Read a derivative as a local linear approximation and as a sensitivity",
    "Apply the chain rule to a composition and see backpropagation in it",
    "Compute a gradient by hand for a small network",
    "Recognise where a derivative does not exist and what optimisers do there",
    "Explain why the derivative of a loss with respect to a weight is what training needs"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "A derivative is a local straight line", id: "local" },

    { t: "viz",
      title: "Zoom in far enough and every smooth curve is a line",
      caption: "The derivative is that line's slope. Everything calculus does with derivatives is a consequence of curves being locally straight — including gradient descent, which follows the line and hopes the curve agrees for a short distance.",
      svg: `<svg viewBox="0 0 900 260" role="img" aria-label="A curve zoomed in progressively until it looks like a straight line">
  <g>
    <path d="M40 220 Q 110 40 190 150 T 300 90" style="stroke:var(--accent);fill:none" stroke-width="2"/>
    <circle cx="190" cy="150" r="4" style="fill:var(--t-orange)"/>
    <text x="170" y="248" class="s-sub" style="fill:var(--ink-3)">the whole curve</text>
  </g>

  <g>
    <path d="M350 190 Q 415 120 480 108 T 590 130" style="stroke:var(--accent);fill:none" stroke-width="2"/>
    <circle cx="480" cy="108" r="4" style="fill:var(--t-orange)"/>
    <line x1="390" y1="140" x2="570" y2="86" style="stroke:var(--t-orange);stroke-dasharray:4 3" fill="none"/>
    <text x="440" y="248" class="s-sub" style="fill:var(--ink-3)">zoomed in</text>
  </g>

  <g>
    <path d="M640 150 L 860 118" style="stroke:var(--accent);fill:none" stroke-width="2"/>
    <circle cx="750" cy="134" r="4" style="fill:var(--t-orange)"/>
    <line x1="640" y1="150" x2="860" y2="118" style="stroke:var(--t-orange);stroke-dasharray:4 3" fill="none"/>
    <text x="700" y="248" class="s-sub" style="fill:var(--t-orange)">indistinguishable</text>
  </g>

  <text x="40" y="34" class="s-label">f'(x) is the slope of the line you end up with</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the definition, and what it is for", code: `
import numpy as np

# THE DEFINITION is a limit of slopes over shrinking intervals:
#
#     f'(x) = lim h->0  [ f(x+h) - f(x) ] / h
#
# Read it as: "per unit of x, how much f?"

def f(x): return x**2

def slope(x, h):
    return (f(x + h) - f(x)) / h

for h in (1.0, 0.1, 0.01, 1e-6):
    print(h, round(slope(2.0, h), 6))
#   1.0     5.0
#   0.1     4.1
#   0.01    4.01
#   1e-6    4.000001      -> converging to 4, which is 2x at x=2

# TWO READINGS, both useful:
#
#   AS A SLOPE       the tangent line at x=2 has gradient 4
#   AS A SENSITIVITY nudge x by 0.001 and f moves by about 0.004
#
f(2.001) - f(2.0)          # 0.004001  -- the prediction was 0.004

# THE SENSITIVITY READING IS THE ONE TRAINING USES. dLoss/dw says how
# much the loss moves per unit of weight, so its sign tells you which
# way to step and its size tells you how much the step will achieve.
`,
      hl: [13, 22, 26],
      caption: "**The prediction 0.004 against the actual 0.004001 is the whole idea.** The derivative is exact in the limit and approximate over a real step, and the size of that gap is why learning rates must be small."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**A derivative converts a question about a curve into a question about a line.** Lines are easy — you can follow them, invert them, compose them — so every method in optimisation works by replacing the true surface with its tangent and taking a step short enough for the substitution to hold." },
      { t: "p", text: "That framing explains the failures too. A step too long leaves the region where the line is a good stand-in, so the loss can rise instead of falling. A curve with a kink has no single tangent, so the substitution is ambiguous. Neither is a quirk of the algorithm; both follow from what a derivative is." }
    ]},

    { t: "h2", n: "02", text: "The chain rule", id: "chain" },

    { t: "code", lang: "python", title: "composition multiplies sensitivities", code: `
# If y depends on u, and u depends on x, then
#
#     dy/dx = dy/du * du/dx
#
# The units make it obvious: (y per u) * (u per x) = y per x. The
# intermediate cancels, exactly as it would in a unit conversion.

# WORKED: y = (3x + 1)^2  at  x = 2
#
#   u = 3x + 1        du/dx = 3
#   y = u^2           dy/du = 2u = 2(7) = 14
#   dy/dx = 14 * 3 = 42

def y(x): return (3*x + 1)**2

(y(2.0001) - y(2.0)) / 0.0001        # 42.0003  -- confirms 42

# A LONGER CHAIN IS THE SAME RULE APPLIED REPEATEDLY. For
# x -> a -> b -> c -> L:
#
#     dL/dx = dL/dc * dc/db * db/da * da/dx
#
# A PRODUCT OF SENSITIVITIES. That single fact explains vanishing and
# exploding gradients: multiply fifty numbers below 1 and the product is
# nothing; multiply fifty above 1 and it is enormous. Nothing else is
# going on (see 1.4 for the matrix version).
np.prod([0.5] * 50)                  # 8.9e-16  -- vanished
np.prod([1.5] * 50)                  # 6.4e+08  -- exploded
`,
      hl: [6, 20, 26],
      caption: "**Backpropagation is the chain rule with the products cached.** Computing each `dL/dw` independently would recompute the same partial products thousands of times; backprop walks backwards once and reuses them."
    },

    { t: "h2", n: "03", text: "A gradient by hand", id: "byhand" },

    { t: "ladder",
      title: "Finding `dL/dw` for one neuron with a sigmoid and squared loss",
      rungs: [
        { level: "bad", label: "Guess the direction and try both ways",
          why: "Perturbing each weight to see which direction helps is finite differences, and it costs one forward pass per parameter. For a model with a million weights that is a million forward passes per step — the reason this approach was abandoned before deep learning was possible.",
          code: `def numeric_grad(w, x, y, h=1e-5):
    return (loss(w + h, x, y) - loss(w - h, x, y)) / (2 * h)

# Correct, and O(number of parameters) forward passes per step.` },
        { level: "ok", label: "Apply the chain rule term by term",
          why: "Correct and general, and it recomputes shared factors. For a deep network the same partial products reappear in every parameter's derivation, so writing them out separately does exponentially redundant work.",
          code: `# L = (a - y)^2,  a = sigmoid(z),  z = w*x + b
#
#   dL/da = 2(a - y)
#   da/dz = a(1 - a)
#   dz/dw = x
#
#   dL/dw = 2(a - y) * a(1 - a) * x` },
        { level: "best", label: "Propagate one error signal backwards",
          why: "Compute the sensitivity at each layer once and pass it back. Every parameter at that layer then needs a single multiplication by its own local input, which is what makes training a large model affordable at all.",
          code: `def sigmoid(z): return 1 / (1 + np.exp(-z))

x, y, w, b = 2.0, 1.0, 0.5, 0.0

# FORWARD -- keep the intermediates, because the backward pass needs them
z = w * x + b                 # 1.0
a = sigmoid(z)                # 0.7311
L = (a - y)**2                # 0.0723

# BACKWARD -- one error signal, reused for every parameter here
dL_da = 2 * (a - y)           # -0.5378
da_dz = a * (1 - a)           # 0.1966
delta = dL_da * da_dz         # -0.1057   <- the signal at z

dL_dw = delta * x             # -0.2113
dL_db = delta * 1             # -0.1057
dL_dx = delta * w             # -0.0528   <- what flows to the layer below

# Check against finite differences:
h = 1e-6
(( (sigmoid((w+h)*x + b) - y)**2 - L ) / h)      # -0.2113  agreed`,
          note: "**`delta` is computed once and used three times.** In a deep network it is passed to the layer below and the same pattern repeats — which is the entire algorithm, not a summary of it." }
      ]
    },

    { t: "callout", kind: "insight", title: "Why sigmoid saturates, in one number", body: [
      { t: "code", lang: "python", title: "the derivative caps at 0.25", numbered: false, code: `
# da/dz for a sigmoid is a(1-a), which is maximised at a = 0.5:
#
#     0.5 * 0.5 = 0.25
#
# So EVERY sigmoid layer multiplies the backward signal by AT MOST 0.25.
z = np.array([-8.0, -2.0, 0.0, 2.0, 8.0])
a = 1 / (1 + np.exp(-z))
(a * (1 - a)).round(5)      # [0.00034, 0.10499, 0.25, 0.10499, 0.00034]

# Ten sigmoid layers, even at their best:
0.25 ** 10                  # 9.5e-07 -- the gradient is gone

# And "at their best" never happens: a confident unit has a near 0 or 1,
# where the derivative is 0.0003 rather than 0.25.
0.0003 ** 10                # ~0

# THIS IS WHY RELU REPLACED SIGMOID IN HIDDEN LAYERS. Its derivative is
# exactly 1 for positive inputs, so it multiplies the signal by 1 and
# passes it through unchanged.`},
      { t: "p", text: "**A saturated unit is not slow to learn — it has stopped.** The gradient reaching it is multiplied by something near zero, so its weight barely moves, so it stays saturated. That is why initialisation scale and normalisation matter as much as architecture." }
    ]},

    { t: "h2", n: "04", text: "Where derivatives do not exist", id: "nondiff" },

    { t: "table",
      head: ["Function", "Problem point", "What frameworks do"],
      rows: [
        ["`|x|`", "A kink at 0", "**Return 0** (a subgradient) — any value in [−1, 1] is valid"],
        ["ReLU", "A kink at 0", "**Return 0** by convention; the case has measure zero"],
        ["`max(a, b)`", "Where they are equal", "Route the gradient to one branch"],
        ["Step / sign", "Discontinuous", "**Gradient 0 everywhere** — untrainable, hence sigmoid"],
        ["`round`, `argmax`", "Piecewise constant", "Zero gradient; needs a straight-through estimator"],
        ["`sqrt(x)` at 0", "Infinite slope", "**`nan` or `inf`** — add an epsilon inside the root"]
      ],
      caption: "**The last row causes real `nan`s.** `sqrt(x)` has an infinite derivative at zero, so any norm or standard deviation computed as `sqrt(sum of squares)` produces `nan` gradients the moment the input is exactly zero — which happens more often than intuition suggests."
    },

    { t: "code", lang: "python", title: "the epsilon that is not optional", code: `
# A norm layer, written the obvious way:
def norm_bad(v):
    return np.sqrt((v**2).sum())

# The value is fine at zero:
norm_bad(np.zeros(3))                # 0.0

# The DERIVATIVE is not. d/dv sqrt(s) = 1/(2 sqrt(s)), and at s = 0 that
# divides by zero:
#
#     gradient = v / ||v||   ->   0/0   ->   nan
#
# One nan then contaminates every parameter it touches, and the model
# dies silently several steps later.

def norm_ok(v, eps=1e-12):
    """The epsilon goes INSIDE the square root. Outside it,
    sqrt(s) + eps, the derivative is still 1/(2 sqrt(s)) and still
    infinite -- a very common way to write the fix and not fix it."""
    return np.sqrt((v**2).sum() + eps)

# The same trap in disguise:
#   - a standard deviation of a constant batch (BatchNorm on one sample)
#   - cosine similarity between a vector and itself minus itself
#   - any distance where two points can coincide
#   - log(p) where p can reach exactly 0  -> clip to [eps, 1-eps]
`,
      hl: [11, 17],
      caption: "**Adding the epsilon outside the root is the common non-fix.** It changes the value slightly and leaves the derivative infinite, so the `nan` still arrives — and the code now looks defended."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Find the layer that is killing the gradient",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "A four-layer network trains for a few hundred steps and then stops improving. The output layer's weights still move; the first layer's do not." },
        { t: "code", lang: "python", numbered: false, title: "the network and its measurements", code: `
# layer 1 -> sigmoid -> layer 2 -> sigmoid -> layer 3 -> sigmoid -> layer 4

# Mean |gradient| per layer, measured at step 500:
#   layer 4:  2.1e-02
#   layer 3:  3.8e-03
#   layer 2:  4.4e-04
#   layer 1:  6.1e-05

# Mean |activation| after each sigmoid:
#   sigmoid 1:  0.9987
#   sigmoid 2:  0.9991
#   sigmoid 3:  0.9994

# Initialisation: weights ~ Normal(0, 1.0), inputs standardised.`},
        { t: "p", text: "Explain the ratio between layers arithmetically, identify the root cause, and give the fix with the reasoning for each part." }
      ],
      requirements: [
        "Compute the per-layer gradient ratio and say what it corresponds to.",
        "Explain what the activation values reveal.",
        "Say why the problem is the initialisation rather than the depth.",
        "Give the arithmetic for a correct initialisation scale.",
        "Give the fixes, in order of effect.",
        "Explain why lowering the learning rate would not help."
      ],
      hint: "Divide each layer's gradient by the one above it. Then look at what `a(1−a)` is when `a` is 0.999.",
      solution: {
        lang: "python",
        title: "diagnosis.py",
        code: `# =========================================================================
# THE RATIO
# =========================================================================
#
#   layer 3 / layer 4 = 3.8e-03 / 2.1e-02 = 0.181
#   layer 2 / layer 3 = 4.4e-04 / 3.8e-03 = 0.116
#   layer 1 / layer 2 = 6.1e-05 / 4.4e-04 = 0.139
#
# Roughly a factor of 8 lost at every layer, consistently. That
# regularity is the tell: a bug affects one layer, a MULTIPLICATIVE
# process affects all of them equally.
#
# The chain rule says the gradient at layer k is the gradient at k+1
# multiplied by the local derivatives. The repeated ~0.14 is the sigmoid
# derivative term, and layer 1 arrives at
#
#     0.14^3 = 0.0027
#
# of the output layer's signal. With a learning rate of 1e-3 the first
# layer's weights move by ~6e-8 per step -- which is zero to float
# precision against weights of order 1.
#
#
# =========================================================================
# WHAT THE ACTIVATIONS SAY
# =========================================================================
#
# Mean |activation| of 0.999 means the sigmoids are SATURATED -- almost
# every unit sits on the flat tail rather than the responsive middle.
#
# The sigmoid derivative is a(1-a):
#
#     a = 0.999   ->   0.999 * 0.001 = 0.000999
#     a = 0.5     ->   0.5   * 0.5   = 0.25
#
# So a saturated layer multiplies the backward signal by ~0.001 instead
# of the best-case 0.25. The measured 0.14 is the average over units,
# some saturated and some not.
#
# THE VICIOUS CIRCLE: a saturated unit gets almost no gradient, so its
# weights barely change, so it stays saturated. It is not learning
# slowly -- it has stopped.
#
#
# =========================================================================
# WHY IT IS THE INITIALISATION, NOT THE DEPTH
# =========================================================================
#
# Four layers is not deep. The problem is that the units are saturated
# AT INITIALISATION, before any training has happened.
#
# With standardised inputs and weights ~ N(0, 1), the pre-activation of
# a unit with n inputs is a sum of n terms each of variance 1:
#
#     Var(z) = n * Var(w) * Var(x) = n * 1 * 1 = n
#     std(z) = sqrt(n)
#
# For n = 256 that is std(z) = 16. A sigmoid is saturated beyond about
# |z| = 4, so essentially EVERY unit starts saturated -- the network is
# broken before the first step.
#
# Depth then multiplies an already-fatal per-layer factor. Fix the
# saturation and four layers is unremarkable.
#
#
# =========================================================================
# THE CORRECT INITIALISATION SCALE
# =========================================================================
#
# We want Var(z) ~ 1, so that z lands in the sigmoid's responsive range:
#
#     Var(z) = n_in * Var(w) * Var(x) = 1
#     ->  Var(w) = 1 / n_in
#     ->  std(w) = 1 / sqrt(n_in)
#
# That is XAVIER/GLOROT initialisation. The symmetric version also
# considers the backward pass, which wants Var(w) = 1/n_out, and
# compromises:
#
#     Var(w) = 2 / (n_in + n_out)
#
# For ReLU, half the activations are zeroed, halving the variance, so
# the scale is doubled to compensate -- HE initialisation:
#
#     Var(w) = 2 / n_in

def xavier(n_in, n_out, rng):
    """For tanh/sigmoid: keeps the pre-activation variance near 1 in
    both directions."""
    return rng.normal(0, np.sqrt(2.0 / (n_in + n_out)), (n_in, n_out))

def he(n_in, n_out, rng):
    """For ReLU: doubled to offset the half of activations set to zero."""
    return rng.normal(0, np.sqrt(2.0 / n_in), (n_in, n_out))

# Check the effect on the pre-activation scale:
rng = np.random.default_rng(0)
x = rng.normal(size=(1000, 256))
(x @ rng.normal(0, 1.0, (256, 256))).std()      # ~16.0  -- saturated
(x @ xavier(256, 256, rng)).std()               # ~1.0   -- responsive


# =========================================================================
# THE FIXES, IN ORDER OF EFFECT
# =========================================================================
#
# 1. REPLACE THE HIDDEN SIGMOIDS WITH RELU. Its derivative is exactly 1
#    for positive inputs, so it multiplies the backward signal by 1
#    rather than by at most 0.25. This removes the mechanism, not just
#    the current symptom, and is the single largest change.
#
#    Keep sigmoid on the OUTPUT if the task needs a probability -- the
#    problem is sigmoid in hidden layers, not sigmoid.
#
# 2. FIX THE INITIALISATION -- He for ReLU, Xavier for tanh/sigmoid.
#    Without this the network starts saturated whatever the activation.
#
# 3. ADD NORMALISATION (batch or layer norm). It re-centres the
#    pre-activations at every step, so the network cannot drift back
#    into saturation as training proceeds. Initialisation only fixes
#    step zero.
#
# 4. ADD RESIDUAL CONNECTIONS if depth grows. A skip path gives the
#    gradient a route that is multiplied by 1, so depth stops
#    compounding the per-layer factor at all.
#
#
# =========================================================================
# WHY A LOWER LEARNING RATE WOULD NOT HELP
# =========================================================================
#
# The update is  lr * gradient. Layer 1's gradient is already 6e-05, and
# lowering lr multiplies BOTH the small gradient and the large one --
# it scales every layer equally.
#
# So a smaller lr makes the last layer learn more slowly and leaves the
# first layer exactly as stuck relative to it. The ratio between layers
# is set by the chain rule, and no global scalar changes a ratio.
#
# RAISING the learning rate is worse: the output layer, whose gradients
# are 300x larger, would diverge long before layer 1 became trainable.
#
# The problem is not step SIZE, it is that the signal reaching layer 1
# has been multiplied away. Only changing the multipliers helps.
#
#
# =========================================================================
# TESTS
# =========================================================================

def test_gradient_ratio_is_roughly_constant_across_layers():
    """A constant ratio means a multiplicative cause -- the chain rule --
    rather than a bug in one layer."""
    g = [2.1e-2, 3.8e-3, 4.4e-4, 6.1e-5]
    ratios = [g[i+1] / g[i] for i in range(3)]

    assert max(ratios) / min(ratios) < 2.0        # all within 2x


def test_sigmoid_derivative_is_capped_at_a_quarter():
    z = np.linspace(-10, 10, 1001)
    a = 1 / (1 + np.exp(-z))

    assert (a * (1 - a)).max() <= 0.25 + 1e-12


def test_saturated_units_have_negligible_derivative():
    a = 0.999
    assert a * (1 - a) < 0.001                    # 250x below the best case


def test_xavier_keeps_preactivations_in_the_responsive_range():
    rng = np.random.default_rng(0)
    x = rng.normal(size=(2000, 256))

    naive = (x @ rng.normal(0, 1.0, (256, 256))).std()
    fixed = (x @ xavier(256, 256, rng)).std()

    assert naive > 10          # saturated: |z| >> 4
    assert 0.5 < fixed < 2.0   # responsive


def test_lowering_the_learning_rate_does_not_change_the_ratio():
    """The point of the last requirement, as arithmetic."""
    g_first, g_last = 6.1e-5, 2.1e-2
    for lr in (1e-2, 1e-3, 1e-5):
        assert np.isclose((lr * g_first) / (lr * g_last), g_first / g_last)`,
        notes: [
          { t: "p", text: "**A constant ratio between layers is the diagnostic.** A bug hits one layer; a multiplicative process hits all of them equally, and roughly 0.14 per layer is the chain rule reporting the local derivative." },
          { t: "p", text: "**Mean activation 0.999 means saturated.** The sigmoid derivative `a(1−a)` is 0.000999 there against a best case of 0.25 — so the layer multiplies the backward signal by a thousandth, and a unit that gets no gradient stays saturated." },
          { t: "callout", kind: "insight", title: "The network was broken before the first step", body: [
            { t: "p", text: "With standardised inputs and `w ~ N(0,1)`, `Var(z) = n·Var(w)·Var(x) = n`, so `std(z) = √256 = 16`. A sigmoid saturates beyond about `|z| = 4`, so essentially every unit starts on the flat tail." },
            { t: "p", text: "That is why the fix is initialisation scale rather than depth. Xavier sets `Var(w) = 1/n_in` precisely to make `Var(z) ≈ 1`; He doubles it for ReLU because half the activations are zeroed." }
          ]},
          { t: "p", text: "**Lowering the learning rate cannot help, and the arithmetic says why.** The update is `lr × gradient`, so a global scalar multiplies every layer equally and leaves the ratio between them untouched — and the ratio is the problem." },
          { t: "p", text: "**ReLU removes the mechanism rather than the symptom.** Its derivative is exactly 1 for positive inputs, so it passes the signal through instead of attenuating it — which is why it replaced sigmoid in hidden layers while sigmoid remains correct on an output that needs a probability." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's model produced `nan` loss on roughly one batch in ten thousand. It trained fine otherwise, so they added a check that skipped `nan` batches and moved on." },
      { t: "p", text: "**The cause was a normalisation layer computing `sqrt(sum of squares)` with no epsilon.** When a batch happened to contain an all-zero feature vector, the value was 0 and the gradient was `0/0` — one `nan`, which then propagated into every weight it touched." },
      { t: "p", text: "**Skipping the batch did not undo the corruption**, because the `nan` had already reached the parameters on earlier occurrences; the model was quietly worse than its loss curve suggested." },
      { t: "p", text: "**A function can be perfectly well defined where its derivative is not.** `sqrt` at zero is the standard case, and the epsilon must go inside the root — adding it outside changes the value and leaves the derivative infinite." }
    ]}
  ],

  takeaways: [
    "**A derivative is the slope of the best local straight line**, and every optimisation method works by following that line for a short step.",
    "**Read a derivative as a sensitivity**: `dL/dw` is how much the loss moves per unit of weight, which is exactly what a training step needs.",
    "**The chain rule multiplies sensitivities**, and the units cancel like a conversion — `(y per u) × (u per x) = y per x`.",
    "**A long chain is a product of local derivatives**, which is the entire explanation of vanishing and exploding gradients.",
    "**Backpropagation is the chain rule with shared products cached** — computing each parameter's derivative independently repeats the same work.",
    "**Finite differences cost one forward pass per parameter**, which is why they are a check and not a training method.",
    "**The sigmoid derivative caps at 0.25** and is near 0.001 when saturated, so stacked sigmoids destroy the backward signal.",
    "**A saturated unit has stopped rather than slowed** — it gets no gradient, so it never moves out of saturation.",
    "**Initialisation scale decides saturation.** `Var(z) = n·Var(w)·Var(x)`, so `Var(w) = 1/n_in` keeps pre-activations responsive.",
    "**A global learning rate cannot fix a per-layer ratio.** It scales every layer equally, and the ratio is set by the chain rule.",
    "**Some functions are defined where their derivative is not** — `|x|` and ReLU have kinks, `sqrt` at zero has infinite slope.",
    "**Put the epsilon inside the square root.** Outside it the value shifts and the derivative is still infinite, so the `nan` still arrives."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Gradients fall by roughly the same factor at every layer. What does the consistency tell you?",
        options: [
          "One layer has a bug in its implementation",
          "The cause is multiplicative — the chain rule multiplying a local derivative per layer, most likely activation saturation",
          "The learning rate is too high",
          "The data is not shuffled"
        ],
        answer: 1,
        why: "A bug affects one layer; a multiplicative process affects all equally. Checking the mean activation confirms it — near 0.999 means saturated sigmoids, whose derivative `a(1−a)` is about 0.001 against a best case of 0.25."
      },
      {
        stem: "Why can't a lower learning rate fix vanishing gradients?",
        options: [
          "It can, but convergence takes longer",
          "The update is `lr × gradient`, so a global scalar multiplies every layer equally and leaves the ratio between layers unchanged",
          "Learning rates do not affect early layers",
          "It would cause the loss to diverge"
        ],
        answer: 1,
        why: "The ratio between layers is set by the chain rule, and no global scalar changes a ratio. Raising it is worse — the output layer, with gradients 300× larger, diverges long before the first layer becomes trainable. Only changing the per-layer multipliers helps."
      },
      {
        stem: "With standardised inputs, 256 units per layer and `w ~ N(0, 1)`, what is the standard deviation of the pre-activations?",
        options: [
          "About 1 — the inputs were standardised",
          "About 16, since `Var(z) = n·Var(w)·Var(x) = 256`, which saturates a sigmoid immediately",
          "About 256",
          "It depends on the bias initialisation"
        ],
        answer: 1,
        why: "A sigmoid saturates beyond about `|z| = 4`, so essentially every unit starts on the flat tail — the network is broken before the first step. Xavier sets `Var(w) = 1/n_in` to bring `Var(z)` back to about 1; He doubles it for ReLU to offset the zeroed half."
      },
      {
        stem: "A norm layer computes `sqrt((v**2).sum())` and produces `nan` gradients. Where does the epsilon go?",
        options: [
          "`sqrt(...) + eps` — after the square root",
          "`sqrt((v**2).sum() + eps)` — inside the root, because outside it the derivative `1/(2√s)` is still infinite at zero",
          "Either position works equally",
          "On the input vector, as `v + eps`"
        ],
        answer: 1,
        why: "The value is perfectly defined at zero; the derivative is not. Adding the epsilon outside shifts the value slightly and leaves the gradient infinite — a common way to write the fix and not fix it, with the added cost that the code now looks defended."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is backpropagation?",
        strong: "The chain rule applied through a network, with the shared partial products cached. You compute one error signal per layer and pass it backwards, so each parameter needs a single multiplication rather than its own full derivation.",
        answer: [
          { t: "p", text: "The caching point is what distinguishes it from \"the chain rule\" — that is the algorithmic contribution, and it is what makes training affordable." },
          { t: "p", text: "Contrasting with finite differences, at one forward pass per parameter, makes the efficiency argument concrete." },
          { t: "p", text: "Noting that a chain of derivatives is a product leads naturally to vanishing gradients, which is usually the follow-up." }
        ]
      },
      {
        level: "advanced",
        q: "Why do vanishing gradients happen, and how do you fix them?",
        strong: "The chain rule multiplies a local derivative per layer, so anything below 1 compounds. Sigmoid caps at 0.25 and is near 0.001 when saturated. The fixes are ReLU, correct initialisation scale, normalisation, and residual connections.",
        answer: [
          { t: "p", text: "Giving the 0.25 figure and the saturated value turns a qualitative story into arithmetic." },
          { t: "p", text: "The initialisation derivation — `Var(z) = n·Var(w)` so `Var(w) = 1/n_in` — shows Xavier and He are derived rather than magic constants." },
          { t: "p", text: "Explaining why a lower learning rate cannot help is a good test of whether the mechanism is understood rather than memorised." }
        ]
      },
      {
        level: "core",
        q: "ReLU is not differentiable at zero. Why is that not a problem?",
        strong: "Frameworks return a subgradient — conventionally 0 — and the exact-zero case has measure zero in floating point, so it essentially never arises. Any value in the valid range would work.",
        answer: [
          { t: "p", text: "Naming it as a subgradient rather than a hack shows the mathematics is well founded." },
          { t: "p", text: "The useful contrast is with genuinely problematic cases — `sqrt` at zero has an infinite derivative, which does produce `nan`s in practice." },
          { t: "p", text: "Mentioning that a step function has zero gradient everywhere, and is therefore untrainable, explains why smooth activations were needed in the first place." }
        ]
      }
    ]
  }
});

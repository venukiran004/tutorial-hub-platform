/* ============================================================================
   LESSON 2.2 — Gradients, Jacobians and Hessians
   ========================================================================= */
EC.receiveLesson({
  id: "2.2",

  lede: "One input and one output gives a number. Many inputs gives a **gradient**; many outputs gives a **Jacobian**; differentiating twice gives a **Hessian**. They are the same idea at three shapes, and knowing which shape you are holding is most of what stops you writing a broadcast bug that trains to a plausible wrong answer.",

  objectives: [
    "Say which of the three objects a situation calls for, and its shape",
    "Read the gradient as the direction of steepest ascent, and prove it",
    "Use the Jacobian to reason about shapes in a network",
    "Read the Hessian as curvature, and classify a critical point",
    "Explain why nobody computes a full Hessian for a large model"
  ],

  prerequisites: ["2.1", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "Three shapes, one idea", id: "shapes" },

    { t: "p", text: "With more than one input, a derivative becomes an array — and which array depends only on how many inputs and outputs the function has. **The three shapes are the gradient, the Jacobian and the Hessian**, and confusing them is the source of most shape errors in hand-written backpropagation." },

    { t: "dl", items: [
      ["Partial derivative", "`∂f/∂xᵢ` — the derivative with respect to one input, holding the others fixed."],
      ["Gradient", "For `n` inputs and **one** output: a vector of `n` partial derivatives, written `∇f`. Its shape matches the input."],
      ["Jacobian", "For `n` inputs and `m` outputs: an `m × n` matrix, one row per output. It is the local linear approximation of a vector-valued function."],
      ["Hessian", "For `n` inputs and one output: an `n × n` matrix of second derivatives, describing curvature rather than slope."]
    ]},

    { t: "p", text: "**The shape follows from the counts, not from the mathematics** — which makes it a reliable check. A loss function has one output, so it has a gradient and a Hessian but no Jacobian worth the name." },

    { t: "viz",
      title: "The shape follows from the counts",
      caption: "Count the inputs and outputs and the shape is determined. Almost every dimension bug in numerical code is a disagreement between the shape you assumed and the shape the counts require.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="A table relating input and output counts to derivative shapes">
  <g class="s-sub">
    <rect x="24" y="40" width="200" height="176" rx="10" style="fill:none;stroke:var(--t-green)"/>
    <text x="124" y="70" text-anchor="middle" class="s-label" style="fill:var(--t-green)">DERIVATIVE</text>
    <text x="124" y="100" text-anchor="middle">1 in → 1 out</text>
    <text x="124" y="132" text-anchor="middle" style="fill:var(--ink)">a scalar</text>
    <text x="124" y="164" text-anchor="middle" style="fill:var(--ink-3)">f(x) = x²</text>
    <text x="124" y="188" text-anchor="middle" style="fill:var(--ink-3)">f′ = 2x</text>

    <rect x="240" y="40" width="200" height="176" rx="10" style="fill:none;stroke:var(--accent)"/>
    <text x="340" y="70" text-anchor="middle" class="s-label" style="fill:var(--accent)">GRADIENT</text>
    <text x="340" y="100" text-anchor="middle">n in → 1 out</text>
    <text x="340" y="132" text-anchor="middle" style="fill:var(--ink)">a vector (n,)</text>
    <text x="340" y="164" text-anchor="middle" style="fill:var(--ink-3)">a loss</text>
    <text x="340" y="188" text-anchor="middle" style="fill:var(--ink-3)">one per parameter</text>

    <rect x="456" y="40" width="200" height="176" rx="10" style="fill:none;stroke:var(--t-violet)"/>
    <text x="556" y="70" text-anchor="middle" class="s-label" style="fill:var(--t-violet)">JACOBIAN</text>
    <text x="556" y="100" text-anchor="middle">n in → m out</text>
    <text x="556" y="132" text-anchor="middle" style="fill:var(--ink)">a matrix (m, n)</text>
    <text x="556" y="164" text-anchor="middle" style="fill:var(--ink-3)">a layer</text>
    <text x="556" y="188" text-anchor="middle" style="fill:var(--ink-3)">∂outᵢ/∂inⱼ</text>

    <rect x="672" y="40" width="204" height="176" rx="10" style="fill:none;stroke:var(--t-amber)"/>
    <text x="774" y="70" text-anchor="middle" class="s-label" style="fill:var(--t-amber)">HESSIAN</text>
    <text x="774" y="100" text-anchor="middle">n in → 1 out, twice</text>
    <text x="774" y="132" text-anchor="middle" style="fill:var(--ink)">a matrix (n, n)</text>
    <text x="774" y="164" text-anchor="middle" style="fill:var(--ink-3)">curvature</text>
    <text x="774" y="188" text-anchor="middle" style="fill:var(--ink-3)">symmetric</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "the shapes, in code", code: `
import numpy as np

# GRADIENT -- many inputs, ONE output. One partial derivative per input,
# so it has the same shape as the input.
#
#     f(x, y) = x^2 + 3xy
#     df/dx = 2x + 3y ;  df/dy = 3x
def grad_f(v):
    x, y = v
    return np.array([2*x + 3*y, 3*x])

grad_f(np.array([1.0, 2.0]))     # [8., 3.]   shape (2,), like the input

# JACOBIAN -- many inputs, MANY outputs. Row i is the gradient of output
# i, so the shape is (outputs, inputs).
#
#     g(x, y) = [x*y, x + y, x^2]        2 in, 3 out -> (3, 2)
def jac_g(v):
    x, y = v
    return np.array([[y,     x   ],
                     [1.0,   1.0 ],
                     [2*x,   0.0 ]])

jac_g(np.array([1.0, 2.0])).shape        # (3, 2)

# HESSIAN -- differentiate the gradient again. Entry (i,j) is
# d^2f/dx_i dx_j, so the shape is (inputs, inputs) and it is SYMMETRIC,
# because the order of differentiation does not matter for smooth f.
def hess_f(v):
    return np.array([[2.0, 3.0],
                     [3.0, 0.0]])        # d2/dx2, d2/dxdy ; d2/dydx, d2/dy2

H = hess_f(np.array([1.0, 2.0]))
np.allclose(H, H.T)                      # True -- always, for smooth f
`,
      hl: [11, 21, 32],
      caption: "**The Hessian's symmetry is not a convention.** For a function with continuous second derivatives, differentiating in either order gives the same result — so anything claiming to be a Hessian and coming back unsymmetric was computed wrongly."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**A loss has one output, so its derivative is a gradient — one number per parameter, laid out exactly like the parameters.** That is why `w -= lr * grad` type-checks: the gradient has the shape of the thing it updates, by construction rather than by coincidence." },
      { t: "p", text: "**A layer has many outputs, so its derivative is a Jacobian.** Backpropagation never builds those matrices; it computes vector–Jacobian products, which is the same arithmetic with the intermediate matrix never materialised. Knowing the shape exists is what lets you reason about it; knowing it is never formed is what explains the memory cost." }
    ]},

    { t: "h2", n: "02", text: "Why the gradient points uphill", id: "steepest" },

    { t: "p", text: "**The gradient points in the direction of steepest increase**, and this is a theorem rather than a definition — it follows from the dot product being maximised when two vectors align, which is the fact from lesson 1.1." },

    { t: "dl", items: [
      ["Directional derivative", "How fast `f` changes as you move along a chosen unit direction `u`. It equals `∇f · u`."],
      ["Steepest ascent", "The direction maximising that dot product, which is `∇f` itself. Steepest descent is `−∇f`."],
      ["Gradient magnitude", "`‖∇f‖` — how steep the steepest direction is. Zero magnitude means a flat point in every direction."],
      ["Level set", "The set of points with equal `f`. The gradient is always perpendicular to it, so moving along a contour changes nothing."]
    ]},

    { t: "code", lang: "python", title: "a proof you can run", code: `
# CLAIM: among all unit directions, the gradient is the one along which f
# increases fastest.
#
# The rate of change along a unit direction u is the DIRECTIONAL
# DERIVATIVE, which is the dot product:
#
#     D_u f = grad . u = ||grad|| * ||u|| * cos(theta) = ||grad|| cos(theta)
#
# That is maximised when cos(theta) = 1, i.e. u points along grad.
# Nothing deeper is going on -- it is the dot product from lesson 1.1.

g = grad_f(np.array([1.0, 2.0]))          # [8., 3.]

def rate(theta):
    u = np.array([np.cos(theta), np.sin(theta)])
    return g @ u

best = np.linspace(0, 2*np.pi, 100000)
th = best[np.argmax([rate(t) for t in best])]

np.degrees(th).round(2)                    # 20.56
np.degrees(np.arctan2(g[1], g[0])).round(2)  # 20.56  -- the gradient's angle

max(rate(t) for t in best).round(4)        # 8.544
np.linalg.norm(g).round(4)                 # 8.544  -- the norm, as claimed

# TWO CONSEQUENCES:
#   descent goes along -grad, since cos = -1 is the minimum
#   moving PERPENDICULAR to the gradient changes f not at all, to first
#   order -- which is what a contour line is
u_perp = np.array([-g[1], g[0]]) / np.linalg.norm(g)
g @ u_perp                                 # 0.0
`,
      hl: [8, 22, 30],
      caption: "**Steepest ascent is a fact about dot products, not a definition.** It also tells you the magnitude: the fastest rate available is `‖grad‖`, which is why gradient norm is the natural measure of how far from flat you are."
    },

    { t: "h2", n: "03", text: "The Hessian is curvature", id: "hessian" },

    { t: "p", text: "**The Hessian measures curvature — how the slope itself changes as you move.** It is what distinguishes a minimum from a maximum from a saddle, and its eigenvalues (lesson 1.4) set the largest step size an optimiser can safely take." },

    { t: "dl", items: [
      ["Hessian", "The matrix of second partial derivatives, `H[i][j] = ∂²f/∂xᵢ∂xⱼ`. Symmetric for any smooth function."],
      ["Critical point", "Where `∇f = 0`. The Hessian's eigenvalues then decide what kind of point it is."],
      ["Minimum / maximum / saddle", "All eigenvalues positive, all negative, or mixed signs respectively. Mixed is by far the most common in high dimensions."],
      ["Condition number", "Largest eigenvalue divided by smallest. It governs how badly a valley is stretched, and therefore how slowly gradient descent crawls along it."],
      ["Curvature", "How fast the slope itself changes. Positive curvature means the surface bends upward like a bowl; negative means it bends away; zero means locally flat."]
    ]},

    { t: "table",
      head: ["Hessian eigenvalues", "Surface", "For optimisation"],
      rows: [
        ["All positive", "A bowl", "**Local minimum** — positive definite"],
        ["All negative", "A dome", "Local maximum"],
        ["**Mixed signs**", "A saddle", "**Descent still possible** — see 1.4"],
        ["Some zero", "A flat valley", "Degenerate; second order says nothing"],
        ["Large ratio between extremes", "A long thin valley", "**Ill-conditioned — slow to descend**"]
      ],
      caption: "**This is the second-derivative test generalised.** In one dimension you check the sign of `f''`; in `n` dimensions you check the signs of `n` eigenvalues, and needing all of them positive is why minima are rare in high dimensions."
    },

    { t: "code", lang: "python", title: "curvature decides the step size", code: `
# For a quadratic f(x) = 0.5 x.T H x, gradient descent with step lr
# updates the error in each eigendirection by a factor (1 - lr*lambda).
#
# STABLE requires |1 - lr*lambda| < 1  ->  0 < lr < 2/lambda
#
# The binding constraint is the LARGEST eigenvalue, and the SLOWEST
# direction is the smallest -- so the condition number sets the rate.

H = np.diag([10.0, 0.1])
w = np.linalg.eigvalsh(H)

2 / w.max()               # 0.2   -- above this it diverges
2 / (w.max() + w.min())   # 0.198 -- the optimal rate for a quadratic

# At the optimal rate, the contraction per step is set by conditioning:
cond = w.max() / w.min()                       # 100.0
(cond - 1) / (cond + 1)                        # 0.980

# 2% progress per step in the worst direction. To cut the error 10x:
np.log(0.1) / np.log(0.980)                    # ~114 steps

# CONDITIONING, NOT SCALE, IS THE PROBLEM. Multiply H by 1000 and the
# optimal lr shrinks by 1000 while the RATE is unchanged:
H2 = H * 1000
w2 = np.linalg.eigvalsh(H2)
w2.max() / w2.min()                            # 100.0 -- identical
`,
      hl: [7, 14, 24],
      caption: "**A learning rate can be fixed by tuning; a condition number cannot.** That is why normalisation, feature scaling and Adam matter — they change the ratio, which no scalar step size can."
    },

    { t: "h2", n: "04", text: "Nobody forms the Hessian", id: "no-hessian" },

    { t: "p", text: "The Hessian is conceptually essential and computationally impossible at scale. **A model with ten million parameters has a Hessian with 10¹⁴ entries** — 800 terabytes — so every second-order method in practice works with an approximation that is never formed explicitly." },

    { t: "dl", items: [
      ["Hessian-vector product", "`Hv` computed without building `H`, by differentiating the gradient once more in the direction `v`. Costs about the same as one gradient."],
      ["Diagonal approximation", "Keeping only `∂²f/∂xᵢ²`. This is what Adam and RMSProp effectively estimate, which is why they rescale coordinates independently."],
      ["Low-rank approximation", "L-BFGS builds an inverse-Hessian estimate from a window of recent gradients, storing a few vectors rather than a matrix."]
    ]},

    { t: "ladder",
      title: "Using curvature on a model with 10 million parameters",
      rungs: [
        { level: "bad", label: "Compute the Hessian",
          why: "It is an n×n matrix. At 10 million parameters that is 10¹⁴ entries — 400 terabytes in float32 — before you consider that Newton's method then wants to invert it. The object cannot be stored, let alone used.",
          code: `n = 10_000_000
(n * n * 4) / 1e12          # 400_000 terabytes

# And Newton's step needs H^-1 g, which is O(n^3).` },
        { level: "ok", label: "Approximate the diagonal",
          why: "Keeping only the diagonal makes it `n` numbers instead of `n²`, giving a per-parameter curvature estimate. That is precisely what adaptive optimisers do, and it captures the axis-aligned part of the conditioning while ignoring interactions between parameters.",
          code: `# Adam's second-moment estimate is a running average of squared
# gradients -- a cheap stand-in for the diagonal curvature.
#
#     v = beta2 * v + (1 - beta2) * g**2
#     step = lr * g / (sqrt(v) + eps)
#
# Dividing by sqrt(v) shrinks steps in high-curvature directions and
# grows them in flat ones, which is exactly the conditioning fix.` },
        { level: "best", label: "Use Hessian-vector products, never the Hessian",
          why: "You almost never need the matrix — you need its action on a vector. `Hv` can be computed at roughly the cost of one extra gradient, with nothing of size `n²` ever existing, which is what makes second-order information affordable at scale.",
          code: `# The identity that makes it work:
#
#     H v = d/dx [ (grad f(x)) . v ]
#
# Differentiate the SCALAR (grad . v) once more -- one extra backward
# pass, memory O(n).

def hvp(grad_fn, x, v, h=1e-6):
    """Finite-difference Hessian-vector product. Autodiff frameworks do
    this exactly rather than by differencing, but the shape is the same:
    cost of a gradient, not of a matrix."""
    return (grad_fn(x + h * v) - grad_fn(x - h * v)) / (2 * h)

x = np.array([1.0, 2.0])
v = np.array([1.0, 0.0])
hvp(grad_f, x, v).round(6)        # [2., 3.]  == H @ v, first column

# WHAT THIS BUYS YOU without ever forming H:
#   - the largest eigenvalue, by power iteration (a few hvp calls)
#   - conjugate gradient, to solve H p = -g for a Newton-like step
#   - a sharpness measure, for generalisation work
np.allclose(hvp(grad_f, x, v), hess_f(x) @ v)     # True`,
          note: "**Wanting `H` itself is almost always a sign you have not asked the right question.** What you want is `Hv`, its top eigenvalue, or its diagonal — all obtainable without the matrix." }
      ]
    },

    { t: "callout", kind: "trap", title: "Shape mistakes that do not raise", body: [
      { t: "code", lang: "python", title: "broadcasting will help you write a bug", numbered: false, code: `
# 1. A GRADIENT WITH THE WRONG ORIENTATION.
w = np.zeros((3, 1))              # column
g = np.array([1.0, 2.0, 3.0])     # flat, shape (3,)

(w - 0.1 * g).shape               # (3, 3)  <- BROADCAST, not an update
# Nothing raises. The parameter silently becomes a matrix, and the next
# forward pass may still run.

# 2. SUMMING A LOSS OVER THE WRONG AXIS.
#    A loss must be a SCALAR before you differentiate it. A per-sample
#    vector "gradient" is really a Jacobian, and frameworks will either
#    raise or implicitly sum -- which changes the effective learning rate
#    by the batch size.

# 3. TRANSPOSING A JACOBIAN BY HABIT.
#    Forward mode wants J @ v ; reverse mode wants v @ J (equivalently
#    J.T @ v). For a SQUARE layer both conform and only one is right.

# THE HABIT THAT PREVENTS ALL THREE: assert the shape you expect.
def sgd_step(w, g, lr):
    assert g.shape == w.shape, f"gradient {g.shape} vs weights {w.shape}"
    return w - lr * g

# One line, and it converts a silent broadcast into an immediate failure
# at the point of the mistake.`},
      { t: "p", text: "**A gradient always has the shape of the thing it differentiates.** That single invariant catches most of these, and asserting it costs nothing compared with debugging a model that trains to a plausible wrong answer." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Explain an optimiser that behaves differently on two scalings of the same problem",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "The same model, the same data, the same optimiser. The only difference is that one run standardises the features and the other does not. Standardised converges in 200 steps; raw takes 40,000 and needs a much smaller learning rate." },
        { t: "code", lang: "python", numbered: false, title: "the two settings", code: `
# features: [rooms (1-8), area_sqft (400-6000)]
# model:    linear regression, squared loss, plain gradient descent

# RAW
#   H = [[   2.1e+01,   1.3e+04],
#        [   1.3e+04,   9.7e+06]]
#   working lr: 2e-8, converged after ~40,000 steps

# STANDARDISED
#   H = [[ 2.0, 1.4],
#        [ 1.4, 2.0]]
#   working lr: 0.4, converged after ~200 steps`},
        { t: "p", text: "Explain both numbers from the Hessians, and say what standardising actually changed." }
      ],
      requirements: [
        "Compute the eigenvalues and condition number of both Hessians.",
        "Derive the maximum stable learning rate for each and compare with the observed values.",
        "Predict the step counts from the condition numbers.",
        "Say precisely what standardising changed — and what it did not.",
        "Explain why Adam would narrow but not close the gap.",
        "Give the check you would run before training."
      ],
      hint: "Both answers come from the eigenvalues: the largest sets the stable step, the ratio sets the rate.",
      solution: {
        lang: "python",
        title: "diagnosis.py",
        code: `# =========================================================================
# THE EIGENVALUES
# =========================================================================

H_raw = np.array([[2.1e1, 1.3e4],
                  [1.3e4, 9.7e6]])
H_std = np.array([[2.0, 1.4],
                  [1.4, 2.0]])

np.linalg.eigvalsh(H_raw)      # [3.6e+00, 9.7e+06]
np.linalg.eigvalsh(H_std)      # [0.6, 3.4]

np.linalg.cond(H_raw)          # ~2.7e+06
np.linalg.cond(H_std)          # ~5.7

# The raw loss surface is a valley nearly three million times longer
# than it is wide. The standardised one is very nearly circular.
#
# WHY: the Hessian of a squared loss is 2 * X.T X, so its entries carry
# the SQUARE of the feature units. area_sqft runs to 6000, so its
# curvature term is ~6000^2 = 3.6e7 times larger than a feature of order
# 1. The 9.7e6 entry is not a property of the problem -- it is a
# property of measuring area in square feet.
#
#
# =========================================================================
# THE STABLE LEARNING RATE
# =========================================================================
#
# Gradient descent is stable when 0 < lr < 2/lambda_max.
#
#   RAW:   2 / 9.7e6 = 2.06e-7
#   STD:   2 / 3.4   = 0.588
#
# Observed working rates were 2e-8 and 0.4 -- both about a factor of 1.5
# to 10 below their theoretical ceilings, which is what you would expect
# from someone tuning by halving until it stopped diverging.
#
# So the learning rate difference is not a mystery or a hyperparameter
# quirk. It is 2/lambda_max, and lambda_max differs by six orders of
# magnitude because one feature is measured in square feet.
#
#
# =========================================================================
# THE STEP COUNT
# =========================================================================
#
# At a well-chosen rate the error contracts per step by roughly
#
#     (cond - 1) / (cond + 1)
#
#   RAW:  (2.7e6 - 1)/(2.7e6 + 1) = 0.99999926
#   STD:  (5.7 - 1)/(5.7 + 1)     = 0.7015
#
# Steps to reduce the error 1000-fold:
#
#   RAW:  ln(1e-3)/ln(0.99999926) = ~9.3e6 steps  (order-of-magnitude;
#                                    the observed 40,000 reflects a
#                                    looser convergence threshold and
#                                    the fact that the initial error was
#                                    not spread evenly across
#                                    eigendirections)
#   STD:  ln(1e-3)/ln(0.7015)     = ~19 steps
#
# The predicted RATIO is what matters, and it is enormous -- consistent
# with 40,000 against 200.
#
#
# =========================================================================
# WHAT STANDARDISING CHANGED
# =========================================================================
#
# IT CHANGED: the conditioning of the Hessian, by putting both features
# on comparable scales so neither dominates the curvature.
#
# IT DID NOT CHANGE:
#   - the model. Linear regression is equivariant to feature scaling:
#     the fitted PREDICTIONS are identical, and the coefficients are the
#     same numbers divided by the feature standard deviations.
#   - the optimum. The minimum of the loss is the same point, expressed
#     in different coordinates.
#   - the data, in any information sense.
#
# So standardising is a change of COORDINATES that makes the same
# problem easier to descend. That is why it is preprocessing rather than
# modelling -- and why it helps gradient methods enormously while making
# no difference at all to a closed-form solve, which does not descend
# anything.
#
#
# =========================================================================
# WHY ADAM NARROWS BUT DOES NOT CLOSE THE GAP
# =========================================================================
#
# Adam divides each parameter's step by sqrt of its running mean squared
# gradient, which is a diagonal preconditioner: it rescales each AXIS
# independently.
#
# That handles the part of the conditioning that is axis-aligned -- and
# here much of it is, since the problem is one feature having a large
# scale. So Adam would improve the raw run substantially.
#
# WHAT IT CANNOT FIX is the off-diagonal. H_raw has a 1.3e4 cross term,
# meaning the two parameters interact; the valley is not aligned with
# the axes. A diagonal method cannot rotate, so the correlated part of
# the ill-conditioning survives.
#
# Standardising alone does not remove the correlation either -- H_std
# still has a 1.4 off-diagonal. Removing that requires DECORRELATION
# (whitening / PCA), which is a rotation:
w_std = np.linalg.eigvalsh(H_std)
w_std.max() / w_std.min()          # 5.7 -- what remains after scaling
# Whitening would take this to 1.0, at the cost of interpretable
# coefficients.
#
#
# =========================================================================
# THE CHECK, BEFORE TRAINING
# =========================================================================

def check_conditioning(X, names=None):
    """The Hessian of a squared loss is 2 X.T X, so conditioning is
    knowable BEFORE any training happens. A ratio of feature scales in
    the thousands guarantees a badly conditioned surface."""
    scales = X.std(axis=0)
    ratio = scales.max() / scales.min()

    # Cheap proxy first: the Hessian's condition number is roughly the
    # square of the feature-scale ratio, because it carries squared units.
    if ratio > 100:
        raise ValueError(
            f"feature scales differ by {ratio:.0f}x "
            f"(largest {scales.max():.1f}, smallest {scales.min():.3f}). "
            f"Expect a condition number near {ratio**2:.0e}. Standardise."
        )

    cond = np.linalg.cond(X.T @ X)
    if cond > 1e6:
        warnings.warn(f"Hessian condition number {cond:.1e}: expect slow "
                      f"convergence even after scaling; consider whitening")
    return cond


def suggested_lr(X, safety=0.5):
    """2/lambda_max is the stability ceiling; take a fraction of it."""
    H = 2 * (X.T @ X) / len(X)
    return safety * 2 / np.linalg.eigvalsh(H).max()


# =========================================================================
# TESTS
# =========================================================================

def test_scale_ratio_predicts_condition_number():
    """The squared-units relationship, which is why a 1000x scale
    difference is a 1e6 conditioning problem."""
    rng = np.random.default_rng(0)
    X = np.column_stack([rng.normal(0, 1, 500), rng.normal(0, 1000, 500)])

    ratio = X.std(0).max() / X.std(0).min()
    cond = np.linalg.cond(X.T @ X)

    assert 0.2 < cond / ratio**2 < 5          # same order of magnitude


def test_standardising_does_not_change_predictions():
    """The point about coordinates: same fit, different parameterisation."""
    rng = np.random.default_rng(0)
    X = np.column_stack([rng.normal(3, 1, 200), rng.normal(2000, 800, 200)])
    y = X @ np.array([2.0, 0.01]) + rng.normal(0, 0.1, 200)

    raw = np.linalg.lstsq(np.c_[X, np.ones(len(X))], y, rcond=None)[0]
    Xs = (X - X.mean(0)) / X.std(0)
    std = np.linalg.lstsq(np.c_[Xs, np.ones(len(X))], y, rcond=None)[0]

    np.testing.assert_allclose(np.c_[X, np.ones(len(X))] @ raw,
                               np.c_[Xs, np.ones(len(X))] @ std, atol=1e-6)


def test_stable_learning_rate_matches_two_over_lambda_max():
    H = np.array([[2.1e1, 1.3e4], [1.3e4, 9.7e6]])

    assert np.isclose(2 / np.linalg.eigvalsh(H).max(), 2.06e-7, rtol=0.05)


def test_badly_scaled_features_are_rejected_before_training():
    rng = np.random.default_rng(0)
    X = np.column_stack([rng.uniform(1, 8, 300), rng.uniform(400, 6000, 300)])

    with pytest.raises(ValueError, match="Standardise"):
        check_conditioning(X)`,
        notes: [
          { t: "p", text: "**Both numbers come from the eigenvalues.** The largest sets the stable learning rate through `2/λ_max` — 2.06e-7 against 0.588, which matches the observed 2e-8 and 0.4 once you allow for tuning by halving." },
          { t: "p", text: "**The Hessian carries squared units.** For a squared loss it is `2XᵀX`, so a feature running to 6000 contributes a curvature term about 3.6e7 times larger than one of order 1. The 9.7e6 entry is a fact about square feet, not about houses." },
          { t: "callout", kind: "insight", title: "Standardising changes coordinates, not the problem", body: [
            { t: "p", text: "Linear regression is equivariant to feature scaling: the predictions are identical and the coefficients are the same numbers divided by the feature standard deviations. The optimum is the same point in different coordinates." },
            { t: "p", text: "That is why it is preprocessing rather than modelling — and why it transforms a gradient method while making no difference at all to a closed-form solve, which does not descend anything." }
          ]},
          { t: "p", text: "**Adam narrows the gap because much of the ill-conditioning here is axis-aligned**, and a diagonal preconditioner rescales axes. It cannot rotate, so the 1.3e4 off-diagonal — the parameter interaction — survives. Standardising leaves a 1.4 off-diagonal too; removing that needs whitening, at the cost of interpretable coefficients." },
          { t: "p", text: "**Conditioning is knowable before training.** The feature-scale ratio squared is a good proxy for the Hessian's condition number, so a check on `X.std(axis=0)` catches this at the boundary rather than after 40,000 steps." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's custom training loop ran without error and the loss decreased, slowly. After three weeks someone noticed the weights had shape `(256, 256)` where the layer was defined as `(256,)`." },
      { t: "p", text: "**A gradient with shape `(256,)` had been subtracted from weights with shape `(256, 1)`.** NumPy broadcast the two into a 256×256 matrix, and every subsequent step operated on that — mathematically meaningless, and entirely silent." },
      { t: "p", text: "**The loss still fell**, because a 256×256 matrix has plenty of capacity to reduce a training loss. It simply was not the model anyone had designed, and it generalised accordingly." },
      { t: "p", text: "**A gradient has the shape of what it differentiates.** One assertion in the update step converts this from three weeks of confusion into an exception on the first iteration." }
    ]}
  ],

  takeaways: [
    "**Count the inputs and outputs and the shape is determined**: gradient `(n,)`, Jacobian `(m, n)`, Hessian `(n, n)`.",
    "**A gradient has the shape of the thing it differentiates**, which is why `w -= lr * g` type-checks — and asserting it catches most silent broadcast bugs.",
    "**A Hessian is symmetric for any smooth function**, so an unsymmetric one was computed wrongly.",
    "**The gradient is steepest ascent because of the dot product** — `grad · u` is maximised when `u` aligns with `grad`, and the maximum rate is `‖grad‖`.",
    "**Moving perpendicular to the gradient changes the function not at all to first order**, which is what a contour line is.",
    "**Hessian eigenvalues classify a critical point**: all positive is a minimum, mixed signs a saddle.",
    "**The largest eigenvalue sets the stable step size** — `lr < 2/λ_max` — and the ratio sets the convergence rate.",
    "**Conditioning cannot be tuned away.** A learning rate is a scalar; the condition number is a ratio, and only rescaling or rotating changes it.",
    "**The Hessian carries squared units**, so a feature scale ratio of 1000 gives a condition number near 10⁶.",
    "**Standardising is a change of coordinates**, not of the model — identical predictions, a far easier surface to descend.",
    "**Nobody forms a Hessian at scale**: `n²` entries is 400 terabytes at 10 million parameters.",
    "**Use Hessian-vector products instead.** `Hv` costs about one extra gradient and gives you top eigenvalues, Newton-like steps and sharpness without the matrix."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A function takes 5 inputs and returns 3 outputs. What shape is its derivative?",
        options: [
          "A vector of length 5",
          "A 3×5 Jacobian — one row per output, one column per input",
          "A 5×5 Hessian",
          "A scalar"
        ],
        answer: 1,
        why: "Row `i` is the gradient of output `i`. A gradient is the special case with one output, and a Hessian is the second derivative of a one-output function — so the shape follows from counting, which is how most dimension bugs get caught before they are written."
      },
      {
        stem: "Why does gradient descent become unstable above `lr = 2/λ_max`?",
        options: [
          "Floating-point error accumulates",
          "In the eigendirection with curvature λ, the error is multiplied by `(1 − lr·λ)` each step, and beyond `2/λ` that factor exceeds 1 in magnitude",
          "The gradient becomes undefined",
          "The Hessian stops being positive definite"
        ],
        answer: 1,
        why: "The step overshoots and lands further from the minimum than it started, growing each iteration. The largest eigenvalue is therefore the binding constraint on step size, while the smallest determines how slowly the flattest direction converges."
      },
      {
        stem: "Features are rooms (1–8) and area in square feet (400–6000). What does that imply for the Hessian?",
        options: [
          "Nothing — gradient descent is scale-invariant",
          "The Hessian carries squared units, so a scale ratio near 1000 gives a condition number near 10⁶ and an extremely elongated valley",
          "The Hessian becomes non-symmetric",
          "Only the gradient is affected, not the curvature"
        ],
        answer: 1,
        why: "For a squared loss the Hessian is `2XᵀX`, so entries scale with the square of the feature units. The stable learning rate falls by the same factor, which is why the unstandardised run needed `2e-8` — and why the scale ratio is checkable before training begins."
      },
      {
        stem: "Why do practitioners compute Hessian-vector products rather than Hessians?",
        options: [
          "Hessian-vector products are more accurate",
          "The Hessian is `n²` entries — 400 TB at 10 million parameters — while `Hv` costs about one extra gradient with `O(n)` memory",
          "The Hessian is not defined for neural networks",
          "Hessian-vector products avoid the symmetry requirement"
        ],
        answer: 1,
        why: "`Hv = d/dx[(∇f · v)]` — differentiating a scalar once more. It gives top eigenvalues by power iteration, Newton-like steps by conjugate gradient, and sharpness measures, none of which need the matrix. Wanting `H` itself usually means the question was posed wrongly."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between a gradient, a Jacobian and a Hessian?",
        strong: "Input and output counts decide it. Many inputs and one output gives a gradient, a vector. Many outputs gives a Jacobian, a matrix of shape (outputs, inputs). Differentiating a scalar function twice gives a Hessian, square and symmetric.",
        answer: [
          { t: "p", text: "Presenting it as a consequence of counting rather than three definitions is what makes it usable for catching shape bugs." },
          { t: "p", text: "Noting that a gradient has the shape of its parameters is the practical invariant, and it is worth asserting in code." },
          { t: "p", text: "Mentioning that backprop computes vector–Jacobian products without materialising the Jacobian pre-empts the memory follow-up." }
        ]
      },
      {
        level: "advanced",
        q: "Why does feature scaling speed up gradient descent?",
        strong: "It improves the conditioning of the Hessian. For a squared loss the Hessian is `2XᵀX`, so it carries squared feature units — a scale ratio of 1000 gives a condition number near 10⁶ and a valley that gradient descent crawls along.",
        answer: [
          { t: "p", text: "The squared-units point is the substance, and it explains why the effect is so much larger than people expect." },
          { t: "p", text: "Saying that predictions are unchanged — it is a change of coordinates — shows you know it is preprocessing rather than modelling." },
          { t: "p", text: "Adding that it makes no difference to a closed-form solve is a good discriminator, since it shows the benefit is specific to descent." }
        ]
      },
      {
        level: "advanced",
        q: "Would you use second-order optimisation for a large neural network?",
        strong: "Not by forming the Hessian — `n²` is impossible at scale. But second-order information is usable through Hessian-vector products, and Adam is already a cheap diagonal approximation to curvature.",
        answer: [
          { t: "p", text: "Framing Adam as diagonal preconditioning connects a familiar tool to the theory, which is the answer's strongest move." },
          { t: "p", text: "Naming the limitation — a diagonal method cannot rotate, so correlated ill-conditioning survives — shows you know what it does not fix." },
          { t: "p", text: "Mentioning `Hv` for power iteration or conjugate gradient shows second-order methods are not simply ruled out at scale." }
        ]
      }
    ]
  }
});

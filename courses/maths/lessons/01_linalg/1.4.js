/* ============================================================================
   LESSON 1.4 — Eigenvalues and Eigenvectors
   ========================================================================= */
EC.receiveLesson({
  id: "1.4",

  lede: "Most vectors get knocked off their line by a transformation. **A few do not** — they only stretch or shrink. Those directions are the eigenvectors, the stretch factors are the eigenvalues, and finding them turns a matrix from something that mixes coordinates into something that acts on each direction independently.",

  objectives: [
    "State the eigenvector equation and say what it asks for",
    "Compute eigenvalues and eigenvectors by hand on a 2×2",
    "Read the eigenvalues of a covariance matrix as variance along directions",
    "Explain why symmetric matrices are the well-behaved case",
    "Recognise where eigenvalues govern behaviour — stability, PCA, PageRank"
  ],

  prerequisites: ["1.3"],

  blocks: [

    { t: "h2", n: "01", text: "The special directions", id: "special" },

    { t: "viz",
      title: "Most vectors turn; eigenvectors only scale",
      caption: "The transformation moves every vector. The two dashed directions come back pointing exactly where they started, longer or shorter — those are the eigenvectors, and the scale factors are the eigenvalues.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="Vectors before and after a transformation, showing that eigenvectors keep their direction">
  <line x1="70" y1="150" x2="430" y2="150" style="stroke:var(--border)" fill="none"/>
  <line x1="250" y1="30" x2="250" y2="265" style="stroke:var(--border)" fill="none"/>

  <line x1="250" y1="150" x2="340" y2="90" style="stroke:var(--ink-3)" stroke-width="2" fill="none"/>
  <line x1="250" y1="150" x2="400" y2="120" style="stroke:var(--crit)" stroke-width="2" fill="none" marker-end="url(#e1)"/>
  <text x="346" y="76" class="s-sub" style="fill:var(--ink-3)">v</text>
  <text x="404" y="114" class="s-sub" style="fill:var(--crit)">Av — turned</text>

  <line x1="130" y1="150" x2="370" y2="150" style="stroke:var(--t-green);stroke-dasharray:5 4" fill="none"/>
  <line x1="250" y1="150" x2="370" y2="150" style="stroke:var(--t-green)" stroke-width="3" fill="none" marker-end="url(#e2)"/>
  <text x="300" y="140" class="s-sub" style="fill:var(--t-green)">λ = 3</text>

  <line x1="250" y1="250" x2="250" y2="50" style="stroke:var(--t-violet);stroke-dasharray:5 4" fill="none"/>
  <line x1="250" y1="150" x2="250" y2="90" style="stroke:var(--t-violet)" stroke-width="3" fill="none" marker-end="url(#e3)"/>
  <text x="262" y="104" class="s-sub" style="fill:var(--t-violet)">λ = 1</text>

  <defs>
    <marker id="e1" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--crit)"/></marker>
    <marker id="e2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--t-green)"/></marker>
    <marker id="e3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--t-violet)"/></marker>
  </defs>

  <g class="s-sub">
    <text x="500" y="70" class="s-label">THE EQUATION</text>
    <text x="500" y="100">A v = λ v</text>
    <text x="500" y="126" style="fill:var(--ink-3)">"transforming v is the same as scaling it"</text>
    <text x="500" y="164" class="s-label">WHAT IT ASKS</text>
    <text x="500" y="192" style="fill:var(--ink-3)">Which directions does A leave alone,</text>
    <text x="500" y="214" style="fill:var(--ink-3)">and by how much does it stretch each?</text>
    <text x="500" y="252" style="fill:var(--accent)">λ &gt; 1 stretch · 0 &lt; λ &lt; 1 shrink · λ &lt; 0 flip</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "worked by hand, then checked", code: `
import numpy as np

A = np.array([[3.0, 1.0],
              [0.0, 1.0]])

# BY HAND. Av = lambda*v means (A - lambda*I)v = 0, and a non-zero v can
# only exist if that matrix is singular -- so its determinant is zero:
#
#   det([[3-L, 1  ],
#        [0,   1-L]]) = (3-L)(1-L) - 0 = 0
#
#   -> L = 3  or  L = 1
#
# For L = 3:  (A - 3I)v = [[0, 1], [0, -2]] v = 0  ->  v2 = 0
#             so v = [1, 0], any multiple.
# For L = 1:  (A - 1I)v = [[2, 1], [0, 0]] v = 0   ->  2*v1 + v2 = 0
#             so v = [1, -2], any multiple.

vals, vecs = np.linalg.eig(A)
vals                    # [3., 1.]
vecs[:, 0]              # [1., 0.]
vecs[:, 1] / vecs[0, 1] # [1., -2.]   (normalised to match our working)

# EIGENVECTORS ARE DIRECTIONS, NOT VECTORS. If v works, so does 2v and
# -v. Libraries return unit-length ones and the sign is arbitrary --
# which is why PCA components can flip sign between runs and it means
# nothing.
`,
      hl: [10, 20, 26],
      caption: "**The characteristic polynomial comes from requiring `A − λI` to be singular.** A non-zero vector can only be sent to zero by a matrix that collapses a dimension — which is lesson 1.3's determinant rule doing the work."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**Eigenvectors are the coordinate system in which the matrix is simple.** In the standard basis a matrix mixes your coordinates together; in its eigenbasis it does nothing but scale each axis independently. That is the whole payoff — a hard, coupled problem becomes several easy, uncoupled ones." },
      { t: "p", text: "It is also why powers of a matrix become tractable. `A¹⁰⁰` is impossible to reason about directly, but in the eigenbasis it is just each `λ` raised to the hundredth — which immediately tells you whether the system explodes, decays or holds steady." }
    ]},

    { t: "h2", n: "02", text: "What the numbers tell you", id: "reading" },

    { t: "table",
      head: ["Eigenvalues", "Behaviour", "Where you meet it"],
      rows: [
        ["All `|λ| < 1`", "Repeated application decays to zero", "**A stable system; a vanishing gradient**"],
        ["Some `|λ| > 1`", "Repeated application explodes", "**An unstable system; an exploding gradient**"],
        ["`λ = 1`", "That direction is fixed", "Steady state, PageRank, Markov chains"],
        ["All `λ > 0`", "Positive definite", "**A valid covariance; a bowl-shaped loss**"],
        ["Some `λ = 0`", "Singular — a direction collapses", "Rank deficiency, perfect collinearity"],
        ["Some `λ < 0`", "Indefinite", "**A saddle point in optimisation**"],
        ["Complex `λ`", "Rotation is involved", "Oscillation; no real eigenvector"]
      ],
      caption: "**The eigenvalues of the Hessian classify a critical point.** All positive is a minimum, all negative a maximum, mixed signs a saddle — which is the whole of the second-derivative test in any number of dimensions."
    },

    { t: "code", lang: "python", title: "eigenvalues govern repeated application", code: `
# The two facts worth memorising, because they let you read a spectrum
# without computing anything:
#
#   sum of eigenvalues  = trace (the diagonal sum)
#   product             = determinant

A = np.array([[3.0, 1.0], [0.0, 1.0]])
np.trace(A), np.linalg.det(A)          # 4.0, 3.0
sum([3, 1]), 3 * 1                     # 4, 3   -- they match

# WHY POWERS ARE EASY IN THE EIGENBASIS. If A = V L V^-1 with L diagonal,
#     A^k = V L^k V^-1
# and L^k is just each eigenvalue raised to k.

decay = np.array([[0.5, 0.0], [0.0, 0.9]])
np.linalg.matrix_power(decay, 50).round(6)
#   [[0., 0.], [0., 0.005]]      -- 0.5^50 and 0.9^50, both -> 0

grow = np.array([[1.1, 0.0], [0.0, 0.5]])
np.linalg.matrix_power(grow, 50)[0, 0]     # 117.4  -- 1.1^50

# THIS IS THE VANISHING/EXPLODING GRADIENT, EXACTLY. Backpropagating
# through 50 timesteps multiplies by a Jacobian 50 times. Whether the
# signal survives is decided by the largest |eigenvalue| -- the SPECTRAL
# RADIUS -- and nothing else asymptotically.
max(abs(np.linalg.eigvals(decay)))         # 0.9  -> vanishes
max(abs(np.linalg.eigvals(grow)))          # 1.1  -> explodes
`,
      hl: [6, 20, 27],
      caption: "**Gradient clipping treats the symptom of a spectral radius above 1.** Orthogonal initialisation and LSTM gates attack the cause — keeping the relevant eigenvalues near 1 so the signal neither dies nor detonates."
    },

    { t: "h2", n: "03", text: "Symmetric matrices are the good case", id: "symmetric" },

    { t: "ladder",
      title: "Decomposing a matrix",
      rungs: [
        { level: "bad", label: "Assume every matrix diagonalises",
          why: "It does not. A shear has a repeated eigenvalue with only one eigenvector, so there is no basis of eigenvectors to change into — the decomposition simply does not exist, and code that assumes it will produce a singular `V`.",
          code: `shear = np.array([[1.0, 1.0], [0.0, 1.0]])
vals, vecs = np.linalg.eig(shear)
vals            # [1., 1.]  -- repeated
vecs            # both columns are [1, 0] -- only ONE direction

np.linalg.matrix_rank(vecs)      # 1, not 2 -> V is not invertible` },
        { level: "ok", label: "Check before relying on it",
          why: "Guarding against a defective matrix is correct, and it leaves you handling a case you did not want. For most matrices arising in data work there is a better route, because they are not arbitrary.",
          code: `vals, vecs = np.linalg.eig(A)
if np.linalg.matrix_rank(vecs) < A.shape[0]:
    raise ValueError("defective: no eigenbasis exists")` },
        { level: "best", label: "Use symmetry, which you usually have",
          why: "The spectral theorem guarantees a real symmetric matrix has real eigenvalues and a full orthonormal eigenbasis — always. Covariance matrices, Gram matrices and Hessians are all symmetric, so the pathological case never arises where it would matter most.",
          code: `C = np.array([[4.0, 2.0],
              [2.0, 3.0]])          # symmetric

# eigh, not eig: it exploits symmetry, is faster, and returns REAL
# eigenvalues in ascending order with ORTHONORMAL eigenvectors.
vals, vecs = np.linalg.eigh(C)
vals                        # [1.438, 5.562]  -- real, sorted
vecs.T @ vecs               # the identity -- genuinely orthonormal

# Because V is orthonormal, V^-1 == V.T, so the decomposition is
#     C = V @ diag(vals) @ V.T
# with no inverse to compute at all.
np.allclose(C, vecs @ np.diag(vals) @ vecs.T)     # True`,
          note: "**Using `eig` on a symmetric matrix is a small bug that produces tiny imaginary parts.** `eigh` cannot, because it never leaves the reals." }
      ]
    },

    { t: "callout", kind: "trap", title: "Four things that surprise people", body: [
      { t: "code", lang: "python", title: "each one shows up in real code", numbered: false, code: `
# 1. eig RETURNS COMPLEX NUMBERS FOR ROTATIONS. There is no real
#    direction a rotation leaves alone, so the eigenvalues are complex.
rot = np.array([[0.0, -1.0], [1.0, 0.0]])
np.linalg.eigvals(rot)          # [0.+1.j, 0.-1.j]

# 2. eig ON A SYMMETRIC MATRIX RETURNS FLOATING-POINT JUNK.
C = np.array([[4.0, 2.0], [2.0, 3.0]])
np.linalg.eigvals(C)            # [5.56155281+0.j, 1.43844719+0.j]
# Complex dtype for a matrix whose eigenvalues are provably real. Any
# downstream comparison or plot now has to strip the imaginary part.
np.linalg.eigvalsh(C)           # [1.43844719, 5.56155281]  -- real

# 3. THE ORDER IS NOT GUARANTEED BY eig. Code that assumes "the first
#    eigenvalue is the largest" is relying on luck.
#    eigh sorts ASCENDING, so the LAST is the largest -- the opposite of
#    what PCA code usually wants.
vals, vecs = np.linalg.eigh(C)
order = np.argsort(vals)[::-1]              # be explicit
vals, vecs = vals[order], vecs[:, order]

# 4. SIGNS ARE ARBITRARY. v and -v are the same eigendirection, so a
#    component can flip between runs, library versions or platforms.
#    Fix it if reproducibility matters:
for i in range(vecs.shape[1]):
    if vecs[np.argmax(np.abs(vecs[:, i])), i] < 0:
        vecs[:, i] *= -1`},
      { t: "p", text: "**Number two is the one that quietly costs an afternoon.** The imaginary parts are exactly zero, so nothing is wrong numerically — but the dtype is complex, and a comparison or a plot downstream behaves differently for reasons nobody traces back to the wrong function call." }
    ]},

    { t: "h2", n: "04", text: "Eigenvalues of a covariance matrix", id: "covariance" },

    { t: "code", lang: "python", title: "the bridge to PCA", code: `
rng = np.random.default_rng(0)
x = rng.normal(size=1000)
data = np.column_stack([x, 0.8 * x + 0.3 * rng.normal(size=1000)])

C = np.cov(data, rowvar=False)
C.round(3)
#   [[1.033, 0.826],
#    [0.826, 0.752]]        symmetric, as a covariance must be

vals, vecs = np.linalg.eigh(C)
order = np.argsort(vals)[::-1]
vals, vecs = vals[order], vecs[:, order]

vals.round(3)                # [1.706, 0.079]

# WHAT THOSE NUMBERS MEAN:
#   Each eigenvalue IS the variance of the data along its eigenvector.
#   1.706 of variance lies along the first direction, 0.079 along the
#   second -- so one direction holds 96% of the spread.
vals / vals.sum()            # [0.956, 0.044]

# AND THE TRACE IS CONSERVED: the eigenvalues redistribute the total
# variance, they do not create or destroy it.
np.trace(C), vals.sum()      # 1.785, 1.785

# So "explained variance ratio" is not a separate concept bolted onto
# PCA -- it is the eigenvalues divided by their sum, and PCA is this
# calculation with the components used as new axes.
`,
      hl: [15, 20, 25],
      caption: "**A covariance matrix's eigenvalues are variances**, which is why they must be non-negative. A negative eigenvalue on something you believe is a covariance matrix means it was computed wrongly, not that the data is unusual."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Diagnose a training run from its Hessian",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "Training has plateaued. The loss is flat, the gradient norm is near zero, and the team is arguing about whether it has converged or got stuck. You have the Hessian at the current point." },
        { t: "code", lang: "python", numbered: false, title: "diagnostics", code: `
H = np.array([[ 4.0,  0.0,  0.0],
              [ 0.0,  0.02, 0.0],
              [ 0.0,  0.0, -1.5]])

grad_norm = 3.2e-7        # essentially zero
loss = 0.4413             # unchanged for 2000 steps
lr = 0.01`},
        { t: "p", text: "Say what kind of point this is, whether training can escape, what the learning rate should be, and what the conditioning implies." }
      ],
      requirements: [
        "Classify the critical point from the eigenvalues.",
        "Say whether gradient descent can escape, and how.",
        "Compute the condition number and say what it costs.",
        "Give the largest stable learning rate and check the current one.",
        "Explain what the 0.02 eigenvalue does to convergence.",
        "Recommend a concrete fix."
      ],
      hint: "Look at the signs first, then the ratio of the extremes.",
      solution: {
        lang: "python",
        title: "diagnosis.py",
        code: `# =========================================================================
# WHAT KIND OF POINT IS THIS
# =========================================================================
#
# H is diagonal, so the eigenvalues are the diagonal entries:
#
#     lambda = [4.0, 0.02, -1.5]
#
# The gradient is zero, so this IS a critical point. The SIGNS classify
# which kind:
#
#     all positive        -> local minimum   (bowl in every direction)
#     all negative        -> local maximum
#     MIXED SIGNS         -> SADDLE POINT
#
# Two positive and one negative: THIS IS A SADDLE. The surface curves up
# along directions 1 and 2, and DOWN along direction 3.
#
# So training has not converged. It has stalled at a point where the
# gradient vanishes but the loss can still be reduced -- by moving along
# the third eigenvector, where curvature is negative.
#
#
# =========================================================================
# CAN GRADIENT DESCENT ESCAPE?
# =========================================================================
#
# In exact arithmetic from a point exactly on the saddle: no. The gradient
# is zero, so the update is zero, and it sits there forever.
#
# In practice: yes, eventually, because nothing is exact.
#
#   - SGD's minibatch noise perturbs the position off the saddle, and any
#     component along the negative-curvature direction then GROWS, since
#     that direction is unstable.
#   - The escape is slow. The gradient near a saddle is proportional to
#     the distance from it, so movement is exponential with rate |−1.5|
#     but starting from a displacement of order the noise -- which is why
#     the plateau lasted 2000 steps rather than 5.
#
# THIS IS WHY SADDLES DOMINATE DEEP LEARNING. In d dimensions a critical
# point is a minimum only if ALL d eigenvalues are positive. If signs were
# independent and equally likely that is 2^-d -- vanishingly small in high
# dimensions. Almost every critical point is a saddle, and "stuck in a
# local minimum" is usually a misdiagnosis of "crawling past a saddle".
#
#
# =========================================================================
# CONDITIONING
# =========================================================================
#
# Condition number uses the extremes by MAGNITUDE:
#
#     cond = max|lambda| / min|lambda| = 4.0 / 0.02 = 200
#
np.linalg.cond(H)               # 200.0
#
# The loss surface is a long, thin valley: 200 times more curved along
# one direction than another.
#
# COST: gradient descent's convergence rate depends on the condition
# number. The error contracts per step by roughly
#
#     (cond - 1) / (cond + 1) = 199/201 = 0.990
#
# so about 1% progress per step in the worst direction. To cut the error
# by 10x needs ~230 steps; by 1000x, ~690. That is the flat-direction tax,
# and it is why the loss looks "stuck" even where it is descending.
#
#
# =========================================================================
# THE LEARNING RATE
# =========================================================================
#
# Gradient descent on a quadratic is stable in a direction with curvature
# lambda when
#
#     |1 - lr * lambda| < 1     ->     0 < lr < 2 / lambda
#
# The binding constraint is the LARGEST positive curvature:
#
#     lr < 2 / 4.0 = 0.5
#
# Current lr = 0.01, comfortably stable. Not the problem.
#
# But look at what 0.01 does in the FLAT direction (lambda = 0.02):
#
#     contraction per step = 1 - 0.01 * 0.02 = 0.9998
#
# Halving the error there takes ln(0.5)/ln(0.9998) ~= 3466 steps. THAT is
# the plateau. The flat direction is not stuck -- it is moving at
# 0.02% per step, which is indistinguishable from stuck on a loss curve.
#
# The optimal rate for a quadratic is 2/(lambda_max + lambda_min) = 0.497,
# fifty times the current value -- and even that only shifts the same
# condition-number-bound rate.
#
#
# =========================================================================
# THE RECOMMENDATION
# =========================================================================
#
# Two separate problems, needing two separate answers.
#
# 1. THE SADDLE -- add curvature awareness or noise.
#      - momentum: accumulates velocity along the persistent
#        negative-curvature direction and carries through the flat region
#      - keep minibatch noise: do not raise the batch size to remove the
#        very perturbation that escapes saddles
#      - a small warm restart / perturbation of the parameters
#
# 2. THE CONDITIONING -- reduce the 200:1 ratio rather than fight it.
#      - Adam / RMSProp: per-parameter scaling divides out the curvature
#        differences, which is exactly the flat-direction problem
#      - normalisation layers: keep activation scales comparable so the
#        Hessian stays better conditioned
#      - standardise the inputs -- unequal feature scales are one of the
#        commonest causes of a badly conditioned Hessian
#
# NOT THE ANSWER: training longer at lr = 0.01. The arithmetic above says
# that is 3466 steps to halve the error in one direction, and the saddle
# means it may not be descending at all yet.
#
#
# =========================================================================
# TESTS
# =========================================================================

def classify(H, tol=1e-8):
    """All-positive is a minimum, all-negative a maximum, mixed a saddle.
    The tolerance matters: an eigenvalue of 1e-12 is numerically zero and
    the point is degenerate, not strictly a minimum."""
    w = np.linalg.eigvalsh(H)            # eigvalsh: H is symmetric
    if np.all(w > tol):   return "minimum"
    if np.all(w < -tol):  return "maximum"
    if np.any(np.abs(w) <= tol): return "degenerate"
    return "saddle"


def test_the_reported_point_is_a_saddle():
    assert classify(H) == "saddle"


def test_max_stable_learning_rate():
    """Stability is set by the largest positive curvature."""
    lam_max = np.linalg.eigvalsh(H).max()

    assert np.isclose(2 / lam_max, 0.5)
    assert 0.01 < 2 / lam_max            # current lr is stable


def test_condition_number_predicts_slow_progress():
    """The flat direction, quantified -- this is the plateau."""
    w = np.abs(np.linalg.eigvalsh(H))
    cond = w.max() / w.min()

    assert np.isclose(cond, 200.0)
    steps_to_halve = np.log(0.5) / np.log(1 - 0.01 * w.min())
    assert steps_to_halve > 3000


def test_a_true_minimum_is_not_reported_as_a_saddle():
    assert classify(np.diag([4.0, 0.02, 1.5])) == "minimum"`,
        notes: [
          { t: "p", text: "**Mixed signs mean a saddle, so training has not converged.** The gradient is zero but the loss can still fall — along the third eigenvector, where curvature is −1.5." },
          { t: "p", text: "**Saddles dominate high dimensions.** A critical point is a minimum only if all `d` eigenvalues are positive; almost every critical point in a deep network is a saddle, so \"stuck in a local minimum\" is usually a misdiagnosis." },
          { t: "callout", kind: "insight", title: "The plateau is the flat direction, not the saddle", body: [
            { t: "p", text: "With `λ = 0.02` and `lr = 0.01`, the contraction per step is `1 − 0.0002 = 0.9998`. Halving the error in that direction takes about 3,466 steps — which looks exactly like being stuck on a loss curve, while the optimiser is in fact descending." },
            { t: "p", text: "The condition number of 200 sets the rate: error contracts by roughly `(κ−1)/(κ+1) = 0.990` per step in the worst direction. That is the flat-direction tax, and no learning rate removes it — only better conditioning does." }
          ]},
          { t: "p", text: "**Stability is set by the largest curvature**: `lr < 2/λ_max = 0.5`, so `0.01` is stable and is not the fault. Raising it toward the optimum `2/(λ_max + λ_min) ≈ 0.497` helps, but the condition-number bound still applies." },
          { t: "p", text: "**Two problems, two fixes.** Momentum and minibatch noise address the saddle; Adam, normalisation and standardised inputs address the 200:1 conditioning. Raising the batch size would remove the very noise that escapes the saddle, which is why it can make a plateau worse." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team's PCA pipeline started returning components with flipped signs after a library upgrade. Downstream code interpreted the sign as direction of effect, so half the dashboard's arrows reversed overnight." },
      { t: "p", text: "**Nothing was wrong.** An eigenvector defines a direction, so `v` and `−v` are the same component; the library had simply changed which representative it returned, and it was entitled to." },
      { t: "p", text: "**The fix was three lines** — force the largest-magnitude entry of each component to be positive — applied once at the point components are produced." },
      { t: "p", text: "**Anything that reads meaning from an eigenvector's sign is reading noise.** The subspace is determined; the representative vector is not, and the same applies to component order when eigenvalues are close together." }
    ]}
  ],

  takeaways: [
    "**An eigenvector is a direction a transformation leaves alone**, and the eigenvalue is the factor it stretches by.",
    "**The characteristic equation comes from requiring `A − λI` to be singular** — only a collapsing matrix sends a non-zero vector to zero.",
    "**Eigenvectors are directions, not vectors.** Sign and scale are arbitrary, which is why PCA components can flip between runs and it means nothing.",
    "**Trace is the sum of eigenvalues and determinant is their product** — two free checks on any spectrum.",
    "**Repeated application is governed by the spectral radius.** Largest `|λ|` below 1 decays, above 1 explodes — this is vanishing and exploding gradients exactly.",
    "**The eigenvalues of a Hessian classify a critical point**: all positive is a minimum, mixed signs a saddle.",
    "**In high dimensions almost every critical point is a saddle**, so \"stuck in a local minimum\" is usually a misdiagnosis.",
    "**A covariance matrix's eigenvalues are variances along its eigenvectors**, which is why explained-variance ratio is just `λ / Σλ`.",
    "**Not every matrix is diagonalisable** — a shear has a repeated eigenvalue and only one eigenvector.",
    "**Symmetric matrices always have real eigenvalues and an orthonormal eigenbasis**, and covariance, Gram and Hessian matrices are all symmetric.",
    "**Use `eigh` on symmetric matrices**, not `eig` — the latter returns complex dtype with zero imaginary parts and silently changes downstream behaviour.",
    "**Never assume eigenvalue order.** `eigh` sorts ascending, which is the opposite of what PCA code usually wants."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A Hessian has eigenvalues `[4.0, 0.02, −1.5]` and the gradient is zero. What is this point?",
        options: [
          "A local minimum — training has converged",
          "A saddle point — mixed signs mean the loss curves up in two directions and down in the third, so it can still be reduced",
          "A local maximum",
          "A degenerate point requiring higher derivatives"
        ],
        answer: 1,
        why: "All-positive means a minimum; mixed signs mean a saddle. In high dimensions a point is a minimum only if every eigenvalue is positive, so saddles hugely outnumber minima — which is why plateaus in deep learning are usually saddles rather than local minima."
      },
      {
        stem: "Why use `np.linalg.eigh` rather than `eig` on a covariance matrix?",
        options: [
          "`eigh` is the only one that handles 3×3 matrices",
          "A covariance matrix is symmetric, so `eigh` returns real eigenvalues and orthonormal eigenvectors — `eig` returns complex dtype with zero imaginary parts",
          "`eig` cannot compute eigenvectors",
          "`eigh` normalises the input first"
        ],
        answer: 1,
        why: "The spectral theorem guarantees real symmetric matrices have real eigenvalues and a full orthonormal eigenbasis. Using `eig` is numerically harmless but changes the dtype to complex, which alters comparisons and plots downstream for reasons nobody traces back to the function call."
      },
      {
        stem: "A recurrent network's Jacobian has spectral radius 1.1. What happens over 50 timesteps?",
        options: [
          "The signal is preserved",
          "Gradients grow like 1.1⁵⁰ ≈ 117, so they explode",
          "The gradients vanish",
          "Behaviour depends on the initialisation only"
        ],
        answer: 1,
        why: "Repeated application raises each eigenvalue to the power of the number of steps, so the largest `|λ|` decides the asymptotic behaviour. Gradient clipping treats the symptom; orthogonal initialisation and gating mechanisms attack the cause by keeping the relevant eigenvalues near 1."
      },
      {
        stem: "A PCA component's sign flipped after a library upgrade. What does that mean?",
        options: [
          "The data changed",
          "Nothing — `v` and `−v` are the same eigendirection, so the sign is an arbitrary choice of representative",
          "The covariance matrix is no longer positive definite",
          "The components are no longer orthogonal"
        ],
        answer: 1,
        why: "An eigenvector defines a direction, not a specific vector, so scale and sign are free. Any code reading meaning from the sign is reading noise. Fix it by forcing the largest-magnitude entry positive at the point components are produced — and note the same applies to ordering when eigenvalues are close."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is an eigenvector, and why does it matter?",
        strong: "A direction the transformation only scales rather than turns, with the eigenvalue as the scale factor. It matters because in the eigenbasis the matrix acts on each direction independently — a coupled problem becomes several uncoupled ones.",
        answer: [
          { t: "p", text: "The \"coordinate system where the matrix is simple\" framing is what makes the concept useful rather than definitional." },
          { t: "p", text: "Powers are the concrete payoff: `A¹⁰⁰` is intractable directly and trivial in the eigenbasis, which is exactly the vanishing-gradient story." },
          { t: "p", text: "Naming a covariance matrix's eigenvalues as variances bridges straight to PCA, which is usually the follow-up." }
        ]
      },
      {
        level: "advanced",
        q: "How would you tell a saddle point from a local minimum?",
        strong: "Look at the eigenvalues of the Hessian. All positive is a minimum; mixed signs mean a saddle, with descent still possible along the negative-curvature directions.",
        answer: [
          { t: "p", text: "The high-dimensional argument is the part that shows depth: a minimum needs every eigenvalue positive, so saddles dominate and plateaus are usually saddles." },
          { t: "p", text: "Adding that SGD noise is what escapes a saddle — and that raising the batch size removes it — is a practical consequence people miss." },
          { t: "p", text: "Distinguishing the saddle from the conditioning problem shows you can separate two causes of the same symptom." }
        ]
      },
      {
        level: "core",
        q: "What do the eigenvalues of a covariance matrix tell you?",
        strong: "Each one is the variance along its eigenvector, so they are non-negative and sum to the trace — the total variance. Dividing by that sum gives the explained-variance ratio.",
        answer: [
          { t: "p", text: "\"Explained variance is just `λ/Σλ`\" reframes a PCA output as something derived rather than reported by a library." },
          { t: "p", text: "Noting that a negative eigenvalue means the matrix was computed wrongly is a useful debugging heuristic." },
          { t: "p", text: "Mentioning that the trace is conserved — eigenvalues redistribute variance rather than create it — shows the geometry has landed." }
        ]
      }
    ]
  }
});

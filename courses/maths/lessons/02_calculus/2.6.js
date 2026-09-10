/* ============================================================================
   LESSON 2.6 — Numerical Methods You Will Actually Meet
   ========================================================================= */
EC.receiveLesson({
  id: "2.6",

  lede: "Every derivative in this module has been exact. A computer has none of them exactly. **Floating-point arithmetic is where clean mathematics meets a machine with 53 bits of mantissa** — and the places it bites are specific, predictable and worth knowing before they cost you a week.",

  objectives: [
    "Use Newton's method and say when it fails",
    "Choose a finite-difference step and explain why smaller is not better",
    "Describe what automatic differentiation does that neither of the above does",
    "Recognise catastrophic cancellation in code you would otherwise write",
    "Check a hand-derived gradient against an automatic one, correctly"
  ],

  prerequisites: ["2.2"],

  blocks: [

    { t: "h2", n: "01", text: "Newton's method: quadratic until it is not", id: "newton" },

    { t: "code", lang: "python", title: "the method and its failure modes", code: `
import numpy as np

# NEWTON FOR ROOT-FINDING: approximate f by its tangent, jump to where
# the tangent hits zero, repeat.
#
#     x_{k+1} = x_k - f(x_k) / f'(x_k)
#
# It is the same linear approximation from lesson 2.1, used to take a
# step rather than to describe a slope.

def newton(f, fp, x0, tol=1e-12, max_iter=50):
    x = float(x0)
    for k in range(max_iter):
        fx = f(x)
        if abs(fx) < tol:
            return x, k
        d = fp(x)
        if d == 0.0:
            raise ZeroDivisionError(f"flat derivative at x={x}")
        x -= fx / d
    raise RuntimeError(f"no convergence in {max_iter} iterations")

# sqrt(2) as the root of x^2 - 2:
newton(lambda x: x*x - 2, lambda x: 2*x, 1.0)     # (1.4142135623730951, 5)

# FIVE ITERATIONS TO MACHINE PRECISION. Newton converges QUADRATICALLY
# near a simple root -- the number of correct digits roughly doubles
# each step:
#
#   x0 = 1.0                    0 correct digits
#   x1 = 1.5                    1
#   x2 = 1.4166666666666665     3
#   x3 = 1.4142156862745097     6
#   x4 = 1.4142135623746899     12
#   x5 = 1.4142135623730951     16   -- exhausted the mantissa
#
# Bisection would need about 50 iterations for the same accuracy.

# FAILURE 1 -- FLAT DERIVATIVE. The tangent is horizontal and never
# meets the axis.
newton(lambda x: x**3, lambda x: 3*x**2, 0.0)     # works: f(0) = 0 already
newton(lambda x: x*x + 1, lambda x: 2*x, 0.0)     # ZeroDivisionError

# FAILURE 2 -- OVERSHOOT INTO A CYCLE. f(x) = x^3 - 2x + 2 from x = 0
# gives 0 -> 1 -> 0 -> 1 forever. It is not slow, it never converges.

# FAILURE 3 -- NO REAL ROOT AT ALL. x^2 + 1 has none, so any starting
# point wanders. The method cannot tell you that; it just fails.
#
# GLOBALLY, NEWTON IS NOT SAFE. Locally, nothing beats it. That is why
# production solvers are HYBRID: bisection or a line search to get
# close, Newton to finish.
`,
      hl: [5, 27, 62],
      caption: "**Newton doubles your correct digits per step near a simple root, and offers no guarantee anywhere else.** Production root-finders (`scipy.optimize.brentq`) bracket first and only then switch to fast local steps."
    },

    { t: "callout", kind: "insight", title: "Newton in optimisation is the Hessian version", body: [
      { t: "p", text: "Optimising means finding a root of `∇f`, so substituting into the update gives `x ← x − H⁻¹∇f`. That is Newton's method for optimisation, and it explains the whole second-order family." },
      { t: "code", lang: "python", numbered: false, title: "why nobody runs it on a network", code: `
# Newton step:  x <- x - H^-1 grad
#
# It is scale-invariant -- the condition number that crippled gradient
# descent in lesson 2.3 does not slow it down at all, because H^-1
# undoes the stretching exactly.
#
# THE COST IS WHY IT IS RARE:
#   n parameters  ->  H is n x n
#
#   n = 10^3:   10^6 entries,      solving ~ 10^9 flops    fine
#   n = 10^6:   10^12 entries = 8 TB just to store it      no
#   n = 10^9:   not worth writing down
#
# So second-order methods survive in ML only as APPROXIMATIONS that
# never form H:
#   L-BFGS      -- builds a low-rank inverse from recent gradients
#   K-FAC       -- approximates H as a Kronecker product per layer
#   Adam        -- a diagonal approximation, which is why it is cheap
#                  and why it cannot fix correlated coordinates
#
# Adam being "diagonal Newton" is the cleanest way to place it: it
# rescales each coordinate independently, so it fixes different SCALES
# but not the rotation that a genuine Hessian would.`},
      { t: "p", text: "**Adam is a diagonal approximation to Newton.** That single sentence places every adaptive optimiser: they rescale coordinates independently, which fixes differing scales but not the correlation between them." }
    ]},

    { t: "h2", n: "02", text: "Finite differences, and why smaller is not better", id: "finite-differences" },

    { t: "viz",
      title: "The error curve has a floor you cannot step below",
      caption: "Truncation error falls as h shrinks; round-off error rises as h shrinks. Their sum has a minimum near h ≈ √ε ≈ 1.5e-8 for a forward difference, and no choice of h does better.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Log-log plot of finite-difference error against step size, showing a V shape with a minimum">
  <line x1="90" y1="250" x2="820" y2="250" style="stroke:var(--line)" stroke-width="1.5"/>
  <line x1="90" y1="30"  x2="90"  y2="250" style="stroke:var(--line)" stroke-width="1.5"/>

  <text x="400" y="288" class="s-sub" style="fill:var(--ink-3)">step size h  (smaller to the right)</text>
  <text x="20" y="140" class="s-sub" style="fill:var(--ink-3)">error</text>

  <path d="M120 60 L 455 232" style="stroke:var(--accent);fill:none;stroke-dasharray:6 4" stroke-width="2"/>
  <text x="150" y="52" class="s-sub" style="fill:var(--accent)">truncation ~ h</text>

  <path d="M455 232 L 790 60" style="stroke:var(--crit);fill:none;stroke-dasharray:6 4" stroke-width="2"/>
  <text x="640" y="52" class="s-sub" style="fill:var(--crit)">round-off ~ eps/h</text>

  <path d="M120 58 L 300 150 L 420 214 L 455 228 L 500 214 L 620 150 L 790 58"
        style="stroke:var(--good);fill:none" stroke-width="3"/>
  <circle cx="455" cy="228" r="6" style="fill:var(--good)"/>
  <text x="392" y="264" class="s-label" style="fill:var(--good)">h = sqrt(eps) ~ 1.5e-8</text>

  <text x="470" y="196" class="s-sub" style="fill:var(--ink-3)">best achievable error ~ 1e-8</text>
  <text x="470" y="212" class="s-sub" style="fill:var(--ink-3)">-- about half your digits, gone</text>
</svg>`
    },

    { t: "code", lang: "python", title: "measure the floor yourself", code: `
def forward_diff(f, x, h):
    return (f(x + h) - f(x)) / h

def central_diff(f, x, h):
    return (f(x + h) - f(x - h)) / (2*h)

f, fp = np.exp, np.exp
x = 1.0
truth = fp(x)                       # e = 2.718281828459045

for h in [1e-2, 1e-4, 1e-6, 1e-8, 1e-10, 1e-12, 1e-14, 1e-16]:
    ef = abs(forward_diff(f, x, h) - truth)
    ec = abs(central_diff(f, x, h) - truth)
    print(f"h={h:.0e}   forward {ef:.2e}   central {ec:.2e}")

# h=1e-02   forward 1.36e-02   central 4.53e-05
# h=1e-04   forward 1.36e-04   central 4.53e-09
# h=1e-06   forward 1.36e-06   central 3.53e-11
# h=1e-08   forward 6.08e-09   central 6.07e-09    <- forward's best
# h=1e-10   forward 8.29e-08   central 8.29e-08       getting WORSE
# h=1e-12   forward 1.55e-05   central 1.55e-05
# h=1e-14   forward 3.53e-04   central 8.36e-04
# h=1e-16   forward 2.72e+00   central 2.72e+00    <- 100% wrong
#
# AT h = 1e-16 THE ANSWER IS ZERO. x + h rounds back to x exactly, the
# numerator is f(x) - f(x) = 0, and the derivative reads as 0.0.

# WHY THE FLOOR EXISTS. Two errors pull in opposite directions:
#
#   TRUNCATION -- the Taylor remainder you dropped.   O(h) forward,
#                 O(h^2) central.
#   ROUND-OFF  -- f(x+h) and f(x) agree to ~16 digits, so subtracting
#                 them cancels the leading digits and leaves noise,
#                 which dividing by a tiny h then amplifies. O(eps/h).
#
# Minimising h + eps/h gives h = sqrt(eps) ~ 1.5e-8, error ~ 1e-8.
# For the central difference, h^2 + eps/h gives h = eps^(1/3) ~ 6e-6,
# error ~ 1e-11 -- a thousand times better for one extra evaluation.

# THE RULE: scale the step to the argument. A fixed 1e-8 is wrong for
# x = 1e6 (h is below the spacing of nearby floats) and wrong for
# x = 1e-6 (h swamps x).
h = np.sqrt(np.finfo(float).eps) * max(abs(x), 1.0)
`,
      hl: [22, 24, 43],
      caption: "**A central difference costs one extra function evaluation and buys three orders of magnitude.** If you are going to use finite differences at all, use the central one."
    },

    { t: "h2", n: "03", text: "Automatic differentiation", id: "autodiff" },

    { t: "table",
      head: ["", "Symbolic", "Finite differences", "Automatic"],
      rows: [
        ["Accuracy", "Exact", "**~8 digits at best**", "**Exact to machine precision**"],
        ["Cost for `n` inputs", "Expression blow-up", "`n+1` evaluations", "**~2× one evaluation**"],
        ["Handles control flow", "No", "Yes", "**Yes**"],
        ["Needs a formula", "Yes", "No", "No"],
        ["Where you meet it", "SymPy, textbooks", "Gradient checks, black boxes", "**PyTorch, JAX, TensorFlow**"]
      ],
      caption: "**Reverse-mode autodiff computes a gradient of `n` inputs in roughly the cost of two forward passes, regardless of `n`.** That single property is why training a billion-parameter model is possible at all."
    },

    { t: "code", lang: "python", title: "autodiff is neither of the other two", code: `
# AUTODIFF IS NOT SYMBOLIC -- it never builds an expression for the
# derivative. It is NOT numerical differencing -- it takes no step and
# suffers no cancellation.
#
# It applies the CHAIN RULE to the sequence of primitive operations the
# program actually executed, each of which has a known exact derivative.

# ---- forward mode in about ten lines --------------------------------
class Dual:
    """Carry a value and its derivative through every operation."""
    __slots__ = ("v", "d")

    def __init__(self, v, d=0.0):
        self.v, self.d = float(v), float(d)

    def __add__(self, o):
        o = o if isinstance(o, Dual) else Dual(o)
        return Dual(self.v + o.v, self.d + o.d)

    def __mul__(self, o):
        o = o if isinstance(o, Dual) else Dual(o)
        return Dual(self.v * o.v, self.d * o.v + self.v * o.d)   # product rule

    def sin(self):
        return Dual(np.sin(self.v), np.cos(self.v) * self.d)

    __radd__, __rmul__ = __add__, __mul__

def g(x):
    return x * x * x + Dual.sin(x) * 2.0

r = g(Dual(1.5, 1.0))            # seed d=1 to differentiate wrt x
r.v                              # 4.3699  =  1.5^3 + 2 sin(1.5)
r.d                              # 6.8917  =  3(1.5)^2 + 2 cos(1.5)
3*1.5**2 + 2*np.cos(1.5)         # 6.8917  -- exact, to the last bit

# FORWARD MODE costs one pass PER INPUT, so it is right for few inputs
# and many outputs.
#
# REVERSE MODE (what backpropagation is) records the operations on a
# tape during the forward pass, then walks it backwards accumulating
# derivatives. One backward pass gives the gradient with respect to
# EVERY input at once -- which is why it, not forward mode, trains
# neural networks. The cost is memory: the tape holds every
# intermediate value, which is what an out-of-memory error during
# .backward() actually is.
`,
      hl: [23, 32, 36],
      caption: "**Dual numbers are the whole of forward-mode autodiff.** Every operation carries its derivative alongside its value, so the chain rule is applied as the program runs rather than derived beforehand."
    },

    { t: "h2", n: "04", text: "Where floating point bites", id: "floating-point" },

    { t: "code", lang: "python", title: "catastrophic cancellation, in code you would write", code: `
# SUBTRACTING TWO NEARLY EQUAL NUMBERS DESTROYS PRECISION. The leading
# digits cancel; what is left is the round-off you were carrying.

a, b = 1.0000000000000002, 1.0
a - b                       # 2.220446049250313e-16 -- one bit of signal

# TRAP 1 -- THE TEXTBOOK VARIANCE FORMULA.
#   Var(X) = E[X^2] - E[X]^2
# is algebraically right and numerically dangerous: for data with a
# large mean, the two terms are nearly equal.

x = np.array([1e8 + 1, 1e8 + 2, 1e8 + 3, 1e8 + 4], dtype=np.float64)

naive = (x**2).mean() - x.mean()**2
naive                       # 0.0        -- catastrophically wrong
np.var(x)                   # 1.25       -- correct

# numpy subtracts the mean FIRST, which is the two-pass algorithm and
# is why it survives. Never write the one-pass formula yourself.

# TRAP 2 -- exp OF A LARGE NUMBER, i.e. softmax written directly.
z = np.array([1000.0, 1001.0, 1002.0])
np.exp(z) / np.exp(z).sum() # nan  -- exp(1000) overflows to inf

def softmax(z):
    z = z - z.max()         # shift: mathematically identity, numerically
    e = np.exp(z)           # essential -- the largest exponent becomes 0
    return e / e.sum()

softmax(z)                  # [0.0900, 0.2447, 0.6652]

# TRAP 3 -- log(1 + x) AND exp(x) - 1 FOR SMALL x.
np.log(1 + 1e-16)           # 0.0        -- 1 + 1e-16 rounds to 1
np.log1p(1e-16)             # 1e-16      -- correct
np.exp(1e-16) - 1           # 0.0
np.expm1(1e-16)             # 1e-16

# TRAP 4 -- log(sigmoid(x)) FOR VERY NEGATIVE x.
x = -800.0
np.log(1 / (1 + np.exp(-x)))          # -inf   sigmoid underflows to 0
-np.logaddexp(0, -x)                  # -800.0 correct
#
# THIS IS WHY THE API SAYS BCEWithLogitsLoss. It is not a convenience
# wrapper around sigmoid + BCE -- it is a numerically different
# computation, and passing probabilities to the plain version is how
# NaN losses appear an hour into training.
`,
      hl: [16, 18, 30, 45],
      caption: "**`log1p`, `expm1`, `logaddexp` and `BCEWithLogitsLoss` all exist for the same reason.** Each is the numerically stable form of an expression that is correct on paper and wrong in float64."
    },

    { t: "ladder",
      title: "Checking a hand-derived gradient",
      rungs: [
        { level: "bad", label: "Eyeball the two numbers",
          why: "Absolute difference means nothing without scale. A discrepancy of 1e-4 is a bug when the gradient is 1e-6 and irrelevant when it is 1e4, so a fixed threshold either misses real errors or fires constantly.",
          code: `num = (loss(w + 1e-8) - loss(w)) / 1e-8
print(num, analytic)            # "looks close enough"` },
        { level: "ok", label: "Central difference with a relative tolerance",
          why: "Compares like with like and uses the step size that actually minimises error. Still checks a single coordinate, so an index error affecting only one weight can slip through.",
          code: `h = 6e-6                       # eps^(1/3), the central-difference optimum
num = (loss(w + h) - loss(w - h)) / (2*h)

rel = abs(num - analytic) / max(abs(num), abs(analytic), 1e-8)
assert rel < 1e-6, f"gradient mismatch: {rel:.2e}"` },
        { level: "best", label: "Random directions, relative error, float64",
          why: "Projecting onto a random direction tests every coordinate at once with one pair of evaluations, and repeating it makes a systematic error almost impossible to miss. Doing it in float64 removes the precision floor that makes float32 checks unreadable.",
          code: `def check_gradient(loss, grad, w, trials=5, seed=0, tol=1e-6):
    """Compare an analytic gradient against a central difference along
    random directions. Relative error, float64, no per-coordinate loop."""
    rng = np.random.default_rng(seed)
    w = np.asarray(w, dtype=np.float64)
    g = np.asarray(grad(w), dtype=np.float64)
    h = np.cbrt(np.finfo(np.float64).eps)      # ~6.06e-6
    worst = 0.0

    for _ in range(trials):
        d = rng.normal(size=w.shape)
        d /= np.linalg.norm(d)                 # unit direction

        num = (loss(w + h*d) - loss(w - h*d)) / (2*h)
        ana = float(g @ d)                     # directional derivative
        rel = abs(num - ana) / max(abs(num), abs(ana), 1e-12)
        worst = max(worst, rel)

    if worst > tol:
        raise AssertionError(f"gradient check failed: rel error {worst:.2e}")
    return worst

# WHAT A FAILING NUMBER TELLS YOU:
#   ~1e-7 or below   correct
#   ~1e-3            wrong by a constant -- a missing 1/n, or sum vs mean
#   ~1.0             wrong sign, or the wrong variable entirely
#   ~2.0             sign flip exactly (num = -ana)
#
# CHECK IN float64. In float32 the noise floor is around 1e-3, so a
# real bug of that size is invisible -- which is why torch.autograd's
# gradcheck refuses to run on float32 inputs by default.`,
          note: "**A failing gradient check has a readable magnitude.** 1e-3 is almost always a missing normalisation; exactly 2.0 is a sign flip. The number tells you where to look." }
      ]
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A model trained cleanly for six hours and then produced `NaN`. The loss was `log(model(x))`, and `model` ended with a sigmoid." },
      { t: "p", text: "**Once a logit reached about −750, `sigmoid` underflowed to exactly 0.0 and `log(0)` gave `−inf`**; the next backward pass turned it into `NaN` and every weight followed. Nothing was wrong with the maths — six hours of training had simply pushed one logit past the point where float64 can represent the probability." },
      { t: "p", text: "**The fix was `BCEWithLogitsLoss`**, which computes `log σ(x)` as `−logaddexp(0, −x)` and never forms the probability. At `x = −800` it returns `−800.0` instead of `−inf`." },
      { t: "p", text: "**The lesson is that stability bugs surface late.** They need an extreme value to appear, and training is exactly the process of producing extreme values, so a run that is fine for an hour proves nothing." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Find four numerical bugs in working code",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "This module passes its unit tests on small, well-scaled inputs and fails in production. Find every numerical defect, explain the mechanism, and give the fix." },
        { t: "code", lang: "python", numbered: true, title: "stats.py", code: `import numpy as np

def variance(x):
    x = np.asarray(x, dtype=float)
    return (x**2).mean() - x.mean()**2

def softmax(z):
    e = np.exp(np.asarray(z, dtype=float))
    return e / e.sum()

def log_likelihood(p, y):
    p = np.asarray(p, dtype=float)
    return float(np.sum(y * np.log(p) + (1 - y) * np.log(1 - p)))

def gradient(f, x, h=1e-10):
    x = np.asarray(x, dtype=float)
    g = np.empty_like(x)
    for i in range(x.size):
        step = np.zeros_like(x)
        step[i] = h
        g[i] = (f(x + step) - f(x)) / h
    return g`}
      ],
      requirements: [
        "Identify each defect and name the mechanism.",
        "Give an input that makes each one fail, with the wrong output.",
        "Provide a corrected version of every function.",
        "Say which defect would survive longest undetected, and why.",
        "Include tests that fail against the original code."
      ],
      hint: "Three are cancellation or overflow; one is a step size chosen on the wrong side of the error floor.",
      solution: {
        lang: "python",
        title: "stats_fixed.py",
        code: `import numpy as np

# =========================================================================
# DEFECT 1 -- variance: catastrophic cancellation
# =========================================================================
#
# MECHANISM: E[X^2] and E[X]^2 are nearly equal when the mean is large
# relative to the spread. Subtracting them cancels the leading digits
# and leaves round-off.
#
# FAILING INPUT:
#     x = [1e8+1, 1e8+2, 1e8+3, 1e8+4]
#     original -> 0.0        (or a negative number, which is worse)
#     correct  -> 1.25
#
# A NEGATIVE VARIANCE from this formula is common and is the giveaway.
# It is also impossible in exact arithmetic -- Jensen's inequality
# (lesson 2.4) says E[X^2] >= E[X]^2 always -- so seeing one is proof
# of numerical failure rather than a data problem.

def variance(x, ddof=0):
    """Two-pass: centre first, then square. Subtracting the mean removes
    the large shared component before it can cancel."""
    x = np.asarray(x, dtype=np.float64)
    n = x.size
    if n - ddof <= 0:
        raise ValueError(f"need more than {ddof} values, got {n}")
    d = x - x.mean()
    return float((d @ d) / (n - ddof))


# =========================================================================
# DEFECT 2 -- softmax: overflow in exp
# =========================================================================
#
# MECHANISM: exp overflows to inf above about 709.8 in float64, and
# inf/inf is nan. Large logits are normal in a trained network.
#
# FAILING INPUT:
#     z = [1000.0, 1001.0, 1002.0]
#     original -> [nan, nan, nan]
#     correct  -> [0.0900, 0.2447, 0.6652]
#
# THE FIX IS AN IDENTITY: softmax(z) = softmax(z - c) for any constant
# c, because the constant factors out of numerator and denominator.
# Choosing c = max(z) makes the largest exponent exactly 0, so nothing
# overflows and the worst underflow is a term that was negligible anyway.

def softmax(z, axis=-1):
    z = np.asarray(z, dtype=np.float64)
    e = np.exp(z - np.max(z, axis=axis, keepdims=True))
    return e / e.sum(axis=axis, keepdims=True)


# =========================================================================
# DEFECT 3 -- log_likelihood: log(0)
# =========================================================================
#
# MECHANISM: a confident model produces p = 1.0 or p = 0.0 exactly once
# the true probability passes below ~1e-308. log(0) = -inf, and -inf
# times a zero label gives nan.
#
# FAILING INPUT:
#     p = [1.0, 0.0], y = [1, 0]
#     original -> nan   (0 * log(0) = 0 * -inf = nan)
#     correct  -> 0.0
#
# CLIPPING IS THE WRONG FIX. It bounds the damage but distorts the
# gradient near the boundary and hides the real problem, which is that
# probabilities should never have been formed. Take LOGITS instead:
#
#     log(sigmoid(x))     = -logaddexp(0, -x)
#     log(1 - sigmoid(x)) = -logaddexp(0,  x)
#
# Both are exact for any finite x, including x = -800 where the
# probability itself is unrepresentable.

def log_likelihood_from_logits(logits, y):
    """Numerically stable for any finite logit. This is exactly what
    BCEWithLogitsLoss does, and why it is not a convenience wrapper."""
    x = np.asarray(logits, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    return float(np.sum(-y * np.logaddexp(0.0, -x)
                        - (1.0 - y) * np.logaddexp(0.0, x)))


def log_likelihood(p, y, eps=1e-12):
    """Kept for callers that only have probabilities. Clipping is a
    containment measure, not a fix -- prefer the logit form."""
    p = np.clip(np.asarray(p, dtype=np.float64), eps, 1.0 - eps)
    y = np.asarray(y, dtype=np.float64)
    return float(np.sum(y * np.log(p) + (1.0 - y) * np.log1p(-p)))


# =========================================================================
# DEFECT 4 -- gradient: h below the error floor, and forward differencing
# =========================================================================
#
# MECHANISM: h = 1e-10 sits well past the minimum of the error curve.
# f(x+h) and f(x) agree to more digits than float64 carries, so the
# numerator is mostly round-off, and dividing by 1e-10 multiplies that
# noise by 10^10.
#
# TWO FURTHER PROBLEMS:
#   - The step is ABSOLUTE. For x ~ 1e8, adding 1e-10 changes nothing
#     at all: x + h == x, and the derivative reads as exactly 0.
#   - A forward difference has O(h) truncation error where a central
#     difference has O(h^2), for one extra evaluation per coordinate.
#
# FAILING INPUT:
#     f = lambda v: (v**2).sum(), x = [1e8]
#     original -> [0.0]     because 1e8 + 1e-10 == 1e8
#     correct  -> [2e8]

def gradient(f, x, h=None):
    """Central differences with a relatively-scaled step at the error
    floor. Uses the ACTUAL step the float grid gave us, which matters
    once x is large enough that x + h != x + h exactly."""
    x = np.asarray(x, dtype=np.float64)
    base = np.cbrt(np.finfo(np.float64).eps) if h is None else h   # ~6.06e-6
    g = np.empty_like(x)

    for i in range(x.size):
        hi = base * max(abs(x.flat[i]), 1.0)      # scale to the argument

        up, dn = x.copy(), x.copy()
        up.flat[i] += hi
        dn.flat[i] -= hi

        actual = (up.flat[i] - dn.flat[i]) / 2.0  # what the grid allowed
        if actual == 0.0:
            raise FloatingPointError(
                f"step {hi:g} vanishes at x[{i}]={x.flat[i]:g}"
            )
        g.flat[i] = (f(up) - f(dn)) / (2.0 * actual)
    return g


# =========================================================================
# WHICH DEFECT SURVIVES LONGEST
# =========================================================================
#
# DEFECT 4, the gradient step, by a wide margin.
#
# The other three fail LOUDLY -- nan, inf, or a variance of 0.0 where
# the data plainly varies. Someone notices within a run.
#
# A bad finite-difference step fails QUIETLY. It returns a number of
# the right sign and roughly the right magnitude, with perhaps three
# correct digits instead of eleven. Every test on small, well-scaled
# inputs passes. What you get is an optimiser that converges a little
# slowly, a gradient check that "nearly" passes at 1e-3, and weeks of
# tuning learning rates to fix a problem that is not in the optimiser
# at all.
#
# THAT IS THE GENERAL SHAPE OF NUMERICAL BUGS WORTH FEARING: not the
# ones that produce nan, but the ones that produce a plausible number.


# =========================================================================
# TESTS -- each fails against the original code
# =========================================================================

def test_variance_survives_a_large_mean():
    x = np.array([1e8 + 1, 1e8 + 2, 1e8 + 3, 1e8 + 4])

    assert np.isclose(variance(x), 1.25)          # original gives 0.0
    assert variance(x) >= 0.0                     # never negative


def test_softmax_survives_large_logits():
    out = softmax([1000.0, 1001.0, 1002.0])       # original gives nan

    assert np.all(np.isfinite(out))
    assert np.isclose(out.sum(), 1.0)
    assert np.isclose(out[2], 0.66524096, atol=1e-6)


def test_softmax_is_shift_invariant():
    z = np.array([1.0, 2.0, 3.0])

    assert np.allclose(softmax(z), softmax(z + 500.0))


def test_log_likelihood_survives_certainty():
    assert np.isfinite(log_likelihood([1.0, 0.0], [1, 0]))   # original: nan


def test_logit_form_beats_the_probability_form():
    """At a logit of -800 the probability is unrepresentable, but the
    log-likelihood is a perfectly ordinary -800."""
    assert np.isclose(log_likelihood_from_logits([-800.0], [1.0]), -800.0)


def test_gradient_survives_a_large_argument():
    f = lambda v: float((v**2).sum())
    x = np.array([1e8])

    g = gradient(f, x)                            # original gives [0.0]
    assert np.isclose(g[0], 2e8, rtol=1e-6)


def test_gradient_accuracy_at_normal_scale():
    f = lambda v: float(np.exp(v[0]))

    g = gradient(f, np.array([1.0]))
    assert abs(g[0] - np.e) < 1e-9                # ~1e-6 with the original`,
        notes: [
          { t: "p", text: "**A negative variance from `E[X²] − E[X]²` is proof of numerical failure, not a data problem.** Jensen's inequality (lesson 2.4) guarantees the difference is non-negative in exact arithmetic, so a negative result can only come from cancellation." },
          { t: "p", text: "**The softmax fix is an identity, not an approximation.** `softmax(z) = softmax(z − c)` because the constant factors out of numerator and denominator; choosing `c = max(z)` makes the largest exponent exactly zero." },
          { t: "callout", kind: "trap", title: "Clipping probabilities is containment, not a fix", body: [
            { t: "p", text: "`np.clip(p, 1e-12, 1-1e-12)` stops the `NaN` but distorts the gradient near the boundary and hides the real problem — that the probability should never have been formed. `−logaddexp(0, −x)` is exact for any finite logit, including −800 where the probability itself is unrepresentable." }
          ]},
          { t: "p", text: "**The gradient bug is the one that survives longest, and that is the general lesson.** The other three fail loudly with `NaN` or a visibly wrong zero. A bad finite-difference step returns a plausible number with three correct digits instead of eleven, passes every test on small inputs, and shows up as an optimiser that converges slightly too slowly — which people fix by tuning learning rates for weeks." },
          { t: "p", text: "**Note the `actual` step in the corrected `gradient`.** Once `x` is large, `x + h` does not land where you asked, so dividing by the requested `h` rather than the realised one introduces its own error." }
        ]
      }
    }
  ],

  takeaways: [
    "**Newton's method doubles your correct digits per step near a simple root** — and offers no guarantee at all away from one.",
    "**Newton fails on a flat derivative, on an overshoot cycle, and when no root exists**; production solvers bracket first, then switch to it.",
    "**Newton for optimisation is `x ← x − H⁻¹∇f`**, scale-invariant but needing an `n × n` Hessian — 8 TB at a million parameters.",
    "**Adam is a diagonal approximation to Newton**: it fixes differing scales but not the correlation between coordinates.",
    "**Finite-difference error has a floor**: truncation falls with `h`, round-off rises, and their sum bottoms out near `√ε ≈ 1.5e-8`.",
    "**A central difference costs one extra evaluation and buys three orders of magnitude** — use `h ≈ ε^(1/3) ≈ 6e-6`.",
    "**Scale the step to the argument.** A fixed `1e-8` vanishes entirely when `x` is `1e8`.",
    "**Reverse-mode autodiff gives the full gradient in about two forward passes regardless of input count** — the property that makes large-model training possible.",
    "**Dual numbers are the whole of forward mode**: carry the derivative alongside the value and apply the chain rule as the program runs.",
    "**Subtracting nearly equal numbers destroys precision** — which is why `E[X²] − E[X]²` can return zero, or negative, for data that plainly varies.",
    "**`log1p`, `expm1`, `logaddexp` and `BCEWithLogitsLoss` all exist for one reason**: they are the stable forms of expressions that are correct on paper.",
    "**Check gradients along random directions, with relative error, in float64.** A mismatch of 1e-3 is a missing normalisation; exactly 2.0 is a sign flip."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your finite-difference gradient gets *less* accurate as you shrink `h` from 1e-8 to 1e-12. Why?",
        options: [
          "The function is not differentiable there",
          "Round-off dominates — `f(x+h)` and `f(x)` agree to more digits than float64 carries, so the numerator is mostly noise, which dividing by a tiny `h` amplifies",
          "The step size must always be an exact power of two",
          "Floating-point subtraction is not associative"
        ],
        answer: 1,
        why: "Truncation error falls as `h` shrinks while round-off rises as `ε/h`, so total error is minimised near `h = √ε ≈ 1.5e-8` for a forward difference. Below that you are differentiating noise, and at `h = 1e-16` the answer is exactly zero because `x + h` rounds back to `x`."
      },
      {
        stem: "`(x**2).mean() - x.mean()**2` returns 0.0 for data that obviously varies. What happened?",
        options: [
          "An integer overflow",
          "Catastrophic cancellation — the two terms are nearly equal for a large mean, so subtracting them cancels every significant digit",
          "The array contains NaN",
          "`mean()` uses a different dtype"
        ],
        answer: 1,
        why: "Centre the data first and the shared component is gone before it can cancel. A *negative* result from this formula is the clearest giveaway: Jensen's inequality guarantees it cannot happen in exact arithmetic, so it proves numerical failure rather than a data problem."
      },
      {
        stem: "Why does reverse-mode autodiff dominate machine learning rather than forward mode?",
        options: [
          "It is more accurate",
          "It computes the gradient with respect to *all* inputs in roughly two forward passes, regardless of how many there are — forward mode costs one pass per input",
          "It uses less memory",
          "It handles control flow better"
        ],
        answer: 1,
        why: "Both are exact to machine precision; the difference is cost. Reverse mode pays for that with memory — the tape holds every intermediate value, which is what an out-of-memory error during `.backward()` actually is."
      },
      {
        stem: "A model trains cleanly for six hours, then the loss becomes `NaN`. The loss is `log(sigmoid(x))`. What is the most likely cause?",
        options: [
          "The learning rate is too high",
          "A logit reached about −750, `sigmoid` underflowed to exactly 0.0, and `log(0)` gave `−inf`",
          "The data contains a corrupted row",
          "Gradient accumulation was not reset"
        ],
        answer: 1,
        why: "`BCEWithLogitsLoss` computes `log σ(x)` as `−logaddexp(0, −x)` and never forms the probability, returning `−800.0` where the naive form gives `−inf`. Stability bugs surface late because they need extreme values — and training is the process of producing them, so an hour of clean running proves nothing."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you check that a hand-derived gradient is correct?",
        strong: "A central difference along random directions, compared by relative error, in float64. `h ≈ ε^(1/3) ≈ 6e-6` sits at the error floor, and random directions test every coordinate at once rather than looping.",
        answer: [
          { t: "p", text: "Naming a specific step size and saying why shows you know the error floor exists — most answers say \"a small h\"." },
          { t: "p", text: "Relative rather than absolute error is the detail that makes a check usable across scales." },
          { t: "p", text: "Reading the failure magnitude — 1e-3 is a missing `1/n`, exactly 2.0 is a sign flip — turns the check into a diagnostic." }
        ]
      },
      {
        level: "advanced",
        q: "Why is Newton's method rarely used to train neural networks?",
        strong: "It needs the Hessian, which is `n × n`. At a million parameters that is 8 TB to store before you invert anything. Second-order ideas survive only as approximations that never form it — L-BFGS, K-FAC, and Adam as a diagonal version.",
        answer: [
          { t: "p", text: "Putting a number on the cost is what makes the answer concrete rather than a repeated received opinion." },
          { t: "p", text: "Framing Adam as diagonal Newton shows you can place the optimiser family, and explains why it fixes scale but not correlation." },
          { t: "p", text: "Noting that Newton is scale-invariant — immune to the condition number that cripples gradient descent — shows you know what is being given up." }
        ]
      },
      {
        level: "advanced",
        q: "What is the difference between automatic differentiation and numerical differentiation?",
        strong: "Autodiff applies the chain rule to the operations the program actually executed, each with a known exact derivative, so it is exact to machine precision and takes no step. Numerical differencing takes a step and pays for it in cancellation, capping accuracy at about eight digits.",
        answer: [
          { t: "p", text: "The \"no step, so no cancellation\" framing is the crisp distinction, and it explains the accuracy gap without hand-waving." },
          { t: "p", text: "Adding that autodiff is also not symbolic — it never builds an expression — closes the third option people conflate." },
          { t: "p", text: "Mentioning dual numbers as a ten-line implementation of forward mode shows it is not magic." }
        ]
      }
    ]
  }
});

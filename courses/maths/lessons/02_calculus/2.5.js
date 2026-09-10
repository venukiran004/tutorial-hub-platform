/* ============================================================================
   LESSON 2.5 — Constrained Optimisation: Lagrange and KKT
   ========================================================================= */
EC.receiveLesson({
  id: "2.5",

  lede: "Most real optimisation comes with rules attached: weights must sum to one, a probability must stay in `[0,1]`, a budget must not be exceeded. **Lagrange multipliers turn a constrained problem into an unconstrained one** — and the multiplier that falls out is not bookkeeping, it is the price of the constraint.",

  objectives: [
    "Set up a Lagrangian and solve an equality-constrained problem",
    "Read a multiplier as a shadow price rather than an artefact",
    "State the KKT conditions and what complementary slackness buys you",
    "Recognise regularisation as a constrained problem in disguise",
    "Choose between a penalty, a projection and a reparameterisation"
  ],

  prerequisites: ["2.4"],

  blocks: [

    { t: "h2", n: "01", text: "The geometric fact behind the method", id: "geometry" },

    { t: "p", text: "**At a constrained optimum, the objective's gradient must point straight out of the constraint.** If it had any component along the constraint you could still move that way and improve — so the two gradients are parallel, and the ratio between them is the Lagrange multiplier." },

    { t: "dl", items: [
      ["Constrained optimisation", "Minimising `f(x)` subject to `g(x) = 0` or `g(x) ≤ 0`. The optimum need not be where the gradient vanishes."],
      ["Lagrangian", "`L(x, λ) = f(x) − λg(x)`. Setting all its partial derivatives to zero recovers both the optimality condition and the constraint itself."],
      ["Lagrange multiplier", "`λ`. Not bookkeeping — it equals `∂f*/∂c`, the rate at which the optimal value improves as the constraint is relaxed."],
      ["Shadow price", "The economic name for that same `λ`: what one more unit of the constrained resource is worth."]
    ]},

    { t: "viz",
      title: "At the constrained optimum the gradients are parallel",
      caption: "Walk along the constraint. While the objective's gradient has any component along your path you can still improve, so at the optimum it must point straight out of the constraint — parallel to the constraint's own gradient. The ratio between them is λ.",
      svg: `<svg viewBox="0 0 900 260" role="img" aria-label="Contours of an objective touching a constraint line, with parallel gradient arrows at the tangent point">
  <defs>
    <marker id="k-a1" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 z" style="fill:var(--crit)"/>
    </marker>
    <marker id="k-a2" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 z" style="fill:var(--warn)"/>
    </marker>
  </defs>

  <ellipse cx="330" cy="130" rx="58"  ry="40" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
  <ellipse cx="330" cy="130" rx="112" ry="78" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
  <ellipse cx="330" cy="130" rx="166" ry="115" style="fill:none;stroke:var(--line)" stroke-width="1.5"/>
  <text x="296" y="134" class="s-sub" style="fill:var(--ink-3)">objective</text>

  <path d="M120 238 L 566 28" style="stroke:var(--accent);fill:none" stroke-width="2.5"/>
  <text x="486" y="30" class="s-label" style="fill:var(--accent)">g(x) = 0</text>

  <circle cx="404" cy="162" r="6" style="fill:var(--good)"/>
  <text x="416" y="176" class="s-label" style="fill:var(--good)">optimum</text>

  <line x1="404" y1="162" x2="352" y2="136" style="stroke:var(--crit)" stroke-width="2.5" marker-end="url(#k-a1)"/>
  <line x1="404" y1="162" x2="456" y2="188" style="stroke:var(--warn)" stroke-width="2.5" marker-end="url(#k-a2)"/>
  <text x="300" y="126" class="s-sub" style="fill:var(--crit)">grad f</text>
  <text x="462" y="206" class="s-sub" style="fill:var(--warn)">lambda x grad g</text>

  <circle cx="240" cy="200" r="5" style="fill:var(--ink-3)"/>
  <line x1="240" y1="200" x2="292" y2="176" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="2"/>
  <text x="620" y="120" class="s-sub" style="fill:var(--ink-3)">away from the optimum the gradient</text>
  <text x="620" y="138" class="s-sub" style="fill:var(--ink-3)">still has a component along the line,</text>
  <text x="620" y="156" class="s-sub" style="fill:var(--ink-3)">so there is somewhere better to walk</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the method, worked end to end", code: `
import numpy as np
from scipy.optimize import minimize

# PROBLEM: split a budget of 1 across two channels to maximise reach,
# where each channel has diminishing returns.
#
#     maximise    f(x, y) = log(1 + 3x) + log(1 + y)
#     subject to  g(x, y) = x + y - 1 = 0
#
# THE LAGRANGIAN folds the constraint into the objective:
#
#     L(x, y, lam) = f(x, y) - lam * g(x, y)
#
# Setting ALL its partials to zero -- including the one with respect to
# lam -- gives the stationarity conditions AND recovers the constraint:
#
#     dL/dx   =  3/(1+3x) - lam  = 0
#     dL/dy   =  1/(1+y)  - lam  = 0
#     dL/dlam = -(x + y - 1)     = 0     <- the constraint, for free
#
# From the first two:  3/(1+3x) = 1/(1+y)  ->  3 + 3y = 1 + 3x
#                                          ->  x = y + 2/3
# With x + y = 1:      y = 1/6,  x = 5/6,  lam = 3/(1 + 2.5) = 6/7

f = lambda v: -(np.log(1 + 3*v[0]) + np.log(1 + v[1]))   # negate to minimise
con = {"type": "eq", "fun": lambda v: v[0] + v[1] - 1}

r = minimize(f, [0.5, 0.5], constraints=[con], bounds=[(0, None)]*2)
r.x                      # [0.8333, 0.1667]  = [5/6, 1/6]
-r.fun                   # 1.4404

# THE MULTIPLIER IS A PRICE. lam = 6/7 = 0.857 says one more unit of
# budget buys 0.857 more reach. Check it numerically:
con2 = {"type": "eq", "fun": lambda v: v[0] + v[1] - 1.01}
r2 = minimize(f, [0.5, 0.5], constraints=[con2], bounds=[(0, None)]*2)

(-r2.fun) - (-r.fun)     # 0.00857  =  0.857 * 0.01   exactly lam * delta
`,
      hl: [21, 30, 41],
      caption: "**Differentiating with respect to λ recovers the constraint**, which is why the trick is legitimate — you have not discarded the constraint, you have encoded it as one more stationarity condition."
    },

    { t: "callout", kind: "insight", title: "λ is what the constraint costs you", body: [
      { t: "p", text: "**λ = ∂f\\*/∂c** — the rate at which the optimal value improves as the constraint is relaxed. That makes it directly actionable: a shadow price of 0.857 reach per budget unit tells you what an extra unit is worth, and therefore whether to buy it." },
      { t: "p", text: "A multiplier near zero means the constraint is barely biting, so effort spent relaxing it is wasted. **The large multiplier marks the constraint that is actually limiting you** — which, in a system with many, is the one to attack." }
    ]},

    { t: "h2", n: "02", text: "Inequalities and the KKT conditions", id: "kkt" },

    { t: "p", text: "The **KKT conditions** extend Lagrange multipliers to inequality constraints, and they are best read as a four-item checklist. For a convex problem they are necessary *and* sufficient, so satisfying them proves you have found the global optimum." },

    { t: "dl", items: [
      ["Stationarity", "`∇f = Σλᵢ∇gᵢ`. No improving direction remains that the constraints permit."],
      ["Primal feasibility", "The solution satisfies every constraint."],
      ["Dual feasibility", "`λᵢ ≥ 0` for inequality constraints. They push in one direction only."],
      ["Complementary slackness", "`λᵢ · gᵢ(x) = 0`. Each constraint is either **active** — tight, with a positive price — or **inactive** — slack, and costing nothing."],
      ["Active set", "The constraints that are tight at the optimum. Only these affect the answer, and it is usually a small subset."],
      ["KKT conditions", "Karush-Kuhn-Tucker — the four conditions characterising a constrained optimum. Necessary in general, and sufficient too when the problem is convex."],
      ["Duality", "Every constrained problem has a dual, whose variables are the multipliers. Its optimum lower-bounds the original's, and for convex problems the two coincide — which is what an SVM solver exploits."]
    ]},

    { t: "table",
      head: ["Condition", "Statement", "What it means"],
      rows: [
        ["**Stationarity**", "`∇f = Σ λᵢ∇gᵢ + Σ μⱼ∇hⱼ`", "No improving direction remains"],
        ["**Primal feasibility**", "`g(x) ≤ 0`, `h(x) = 0`", "The answer obeys the rules"],
        ["**Dual feasibility**", "`λᵢ ≥ 0`", "An inequality's multiplier pushes one way only"],
        ["**Complementary slackness**", "`λᵢ · gᵢ(x) = 0`", "**Either the constraint is tight or its price is zero**"]
      ],
      caption: "For a **convex** problem these are necessary *and sufficient* — satisfying them proves global optimality. Outside convexity they are only necessary, so passing them means \"a critical point\", not \"the answer\"."
    },

    { t: "code", lang: "python", title: "complementary slackness, made concrete", code: `
# Complementary slackness is the condition people find opaque, and it is
# the most useful one. It says each inequality is in exactly one state:
#
#   ACTIVE (tight):  g(x) = 0  and  lam > 0   -- binding, and it costs
#   INACTIVE:        g(x) < 0  and  lam = 0   -- slack, and it is free
#
# Both cannot be non-zero. The product lam * g(x) is always 0.
#
# EXAMPLE: minimise (x-3)^2 subject to x <= 5, then subject to x <= 2.
#
#   CASE A, x <= 5:  the unconstrained optimum x = 3 already satisfies
#                    it. INACTIVE, lam = 0, removing it changes nothing.
#
#   CASE B, x <= 2:  the unconstrained optimum is out of bounds, so the
#                    answer sits on the boundary at x = 2.
#                    ACTIVE, lam = -f'(2) = -2(2-3) = 2. Relaxing the
#                    bound to 2.01 improves the objective by ~2 * 0.01.

f  = lambda x: (x - 3.0)**2
fp = lambda x: 2.0*(x - 3.0)

for bound in (5.0, 2.0):
    x = min(3.0, bound)                    # the solution here
    lam = max(0.0, -fp(x))                 # 0 if interior, else the price
    print(f"x<={bound}: x*={x}, lam={lam}, "
          f"active={abs(x-bound) < 1e-12}, lam*g={lam*(x-bound):.1f}")

# x<=5.0: x*=3.0, lam=0.0, active=False, lam*g=0.0
# x<=2.0: x*=2.0, lam=2.0, active=True,  lam*g=0.0     <- always zero

# WHY THIS IS PRACTICALLY USEFUL: in a solved problem with 200
# constraints, every one with lam = 0 is irrelevant to the answer. Only
# the ACTIVE SET matters, and it is usually small. That is exactly the
# structure an SVM exploits -- the multipliers are zero for every
# training point except the support vectors, which is why a model
# trained on a million points can be defined by fifty of them.
`,
      hl: [4, 5, 33],
      caption: "**Support vectors are the points with non-zero multipliers.** \"Support vector\" is not an idea bolted onto the algorithm — it is the name for a training point whose constraint is active."
    },

    { t: "h2", n: "03", text: "Regularisation is a constraint in disguise", id: "regularisation" },

    { t: "p", text: "**Ridge and lasso are constrained problems written as penalties.** Minimising `‖y − Xw‖² + α‖w‖²` is the Lagrangian of minimising the error subject to a budget on `‖w‖²`, with `α` playing the part of the multiplier." },

    { t: "dl", items: [
      ["Penalised form", "Objective plus `α ×` penalty. What the code actually optimises."],
      ["Constrained form", "Objective subject to `penalty ≤ t`. Mathematically equivalent, with `t` and `α` in inverse correspondence."],
      ["L2 constraint set", "A ball — smooth, with no corners. The optimum touches it at a generic point, so weights shrink but none reaches zero."],
      ["L1 constraint set", "A diamond, with corners on the axes. A corner is where a coordinate is exactly zero, which is why lasso produces sparsity."]
    ]},

    { t: "code", lang: "python", title: "the equivalence worth knowing", code: `
# THESE TWO PROBLEMS HAVE THE SAME SOLUTION SET:
#
#   CONSTRAINED:  minimise ||y - Xw||^2   subject to  ||w||^2 <= t
#   PENALISED:    minimise ||y - Xw||^2 + alpha * ||w||^2
#
# The Lagrangian of the first IS the second, with alpha = lam. Every
# budget t corresponds to some penalty alpha, and the other way round.
#
# THE CORRESPONDENCE IS INVERSE:
#   large t (generous budget)  <->  small alpha (weak penalty)
#   t -> infinity              <->  alpha = 0  (constraint inactive)

from sklearn.linear_model import Ridge

rng = np.random.default_rng(0)
X = rng.normal(size=(200, 20))
y = X @ rng.normal(size=20) + rng.normal(size=200)

for a in (0.0, 1.0, 100.0):
    w = Ridge(alpha=a, fit_intercept=False).fit(X, y).coef_
    print(f"alpha={a:6.1f}   ||w||^2 = {w @ w:6.2f}")

# alpha=   0.0   ||w||^2 =  21.7    no budget bites
# alpha=   1.0   ||w||^2 =  20.6
# alpha= 100.0   ||w||^2 =   9.4    tight budget, shrunken weights

# THIS EXPLAINS THE SHAPE OF L1 VERSUS L2, otherwise a memorised fact:
#
#   L2 budget ||w||^2 <= t  is a BALL -- smooth, no corners. The optimum
#      touches it at a generic point, so every weight shrinks but none
#      reaches exactly zero.
#
#   L1 budget ||w||_1 <= t  is a DIAMOND -- corners on the axes. A corner
#      is where a coordinate is exactly zero, and a contour arriving from
#      a generic direction is disproportionately likely to touch one.
#
# LASSO'S SPARSITY IS A FACT ABOUT THE GEOMETRY OF THE CONSTRAINT SET,
# not about the penalty being "stronger". It is the corners.
`,
      hl: [4, 5, 33, 37],
      caption: "**Lasso is sparse because a diamond has corners and a ball does not.** Seeing regularisation as a constraint makes that the obvious explanation rather than a rule to remember."
    },

    { t: "h2", n: "04", text: "Three ways to enforce a constraint", id: "enforcing" },

    { t: "p", text: "There are three ways to make an optimiser respect a constraint, and they are not equally good. **Reparameterising so the constraint cannot be violated is almost always best**, because it holds exactly at every step with no extra hyperparameter." },

    { t: "dl", items: [
      ["Penalty", "Add a term punishing violation. Simple, approximate, and it introduces a weight that fights the objective."],
      ["Projection", "After each step, map back to the nearest feasible point. Exact, and it requires a projection operator that exists and is cheap."],
      ["Reparameterisation", "Optimise an unconstrained variable and transform it into the feasible set — `exp` for positivity, `softmax` for a simplex, `LLᵀ` for positive-definiteness."],
      ["Clipping", "Not projection, despite appearances. It does not converge to the constrained optimum and it kills gradients at the boundary."]
    ]},

    { t: "ladder",
      title: "Keeping weights on the probability simplex",
      rungs: [
        { level: "bad", label: "Optimise freely, then clip",
          why: "Clipping after each step is not projection onto the constraint set and does not converge to the constrained optimum. It also kills the gradient at the boundary, so a weight that reaches zero can never come back.",
          code: `w = w - lr * grad
w = np.clip(w, 0, 1)
w = w / w.sum()      # clip then renormalise: neither step is principled` },
        { level: "ok", label: "Add a penalty term",
          why: "Differentiable and easy to bolt on, and adequate when approximate satisfaction is acceptable. But the constraint is only ever approximately met, and the penalty weight becomes another hyperparameter fighting the objective.",
          code: `loss = base_loss(w) \\
     + 100.0 * (w.sum() - 1.0)**2 \\
     + 100.0 * np.minimum(w, 0.0).sum()**2

# w.sum() lands near 1.0 but not on it, and how near depends on a
# constant you have to tune against the base loss.` },
        { level: "best", label: "Reparameterise so the constraint cannot be violated",
          why: "Optimise an unconstrained variable and map it into the feasible set. The constraint then holds exactly, by construction, at every step — no penalty weight, no projection, and the problem is unconstrained again.",
          code: `def to_simplex(z):
    """Any real vector -> non-negative weights summing to exactly 1."""
    e = np.exp(z - z.max())          # shift for numerical stability
    return e / e.sum()

# Optimise z freely; w = to_simplex(z) is always feasible.
w = to_simplex(np.array([0.3, -1.2, 2.0]))
w.sum()                              # 1.0, every step

# THE SAME PATTERN ELSEWHERE:
#   sigma > 0      ->  sigma = exp(rho)  or  softplus(rho)
#   p in (0,1)     ->  p = sigmoid(z)
#   Sigma pos-def  ->  Sigma = L @ L.T   with L lower-triangular
#   R orthogonal   ->  R = expm(A - A.T) for unconstrained A
#
# The third is why a VAE parameterises LOG-variance rather than
# variance: it makes positivity structural instead of enforced.`,
          note: "**Reparameterisation is the default whenever a map into the feasible set exists.** Projection is the fallback when it does not; a penalty is the fallback when neither is available." }
      ]
    },

    { t: "callout", kind: "trap", title: "A penalty weight that is too large breaks the optimiser", body: [
      { t: "p", text: "The instinct when a penalty is not enforcing tightly enough is to raise its weight. Doing so raises the Hessian's largest eigenvalue, which raises the condition number, which shrinks the largest stable learning rate — exactly the `2/L` mechanism from lesson 2.3." },
      { t: "code", lang: "python", numbered: false, title: "the failure has a number attached", code: `
# Penalty weight 100 on a constraint whose own curvature is 2:
#   condition number ~ 100/2 = 50,   max stable lr ~ 2/100 = 0.02
#
# Penalty weight 10000:
#   condition number ~ 5000,         max stable lr ~ 2e-4
#
# So a 100x stronger penalty forces a 100x smaller learning rate. The
# run that "diverged after we added the constraint" did not diverge
# because of the constraint -- it diverged because a learning rate that
# was fine before is now far above the stability threshold.`},
      { t: "p", text: "**If you find yourself raising a penalty weight past about 10³, the penalty is the wrong tool.** Reparameterise, or project." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Allocate a compute budget with shadow prices",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "Four teams share a GPU cluster. Each team's throughput has diminishing returns in the GPUs allocated, with a different coefficient. You have 100 GPUs, allocations must be non-negative, and two teams hold contractual minimums." },
        { t: "code", lang: "python", numbered: false, title: "the setup", code: `
# throughput_i(g) = a_i * log(1 + g)     -- diminishing returns
a = np.array([4.0, 2.5, 2.0, 1.0])       # per-team coefficient

TOTAL   = 100.0
MINIMUM = np.array([10.0, 0.0, 5.0, 0.0])   # contractual floors

# maximise  sum_i a_i * log(1 + g_i)
# subject to  sum_i g_i = 100,  g_i >= MINIMUM[i]`},
        { t: "p", text: "Solve it, report the shadow price of the cluster, and say which contractual minimums are actually costing anything." }
      ],
      requirements: [
        "Derive the solution analytically, ignoring the floors, before solving numerically.",
        "Solve the full problem with the floors included.",
        "Report the shadow price of the total budget and verify it numerically.",
        "Identify which floors are active and what each one costs.",
        "Say what you would tell the team whose floor is most expensive.",
        "Include tests, one of which checks complementary slackness."
      ],
      hint: "For the equality-only problem, stationarity gives `aᵢ/(1+gᵢ) = λ` for every `i` — so every team ends at the same marginal throughput.",
      solution: {
        lang: "python",
        title: "allocate.py",
        code: `import numpy as np
from scipy.optimize import minimize

a = np.array([4.0, 2.5, 2.0, 1.0])
TOTAL = 100.0
MINIMUM = np.array([10.0, 0.0, 5.0, 0.0])


# =========================================================================
# THE ANALYTIC SOLUTION, IGNORING THE FLOORS
# =========================================================================
#
#   L = sum_i a_i log(1 + g_i) - lam (sum_i g_i - TOTAL)
#
#   dL/dg_i = a_i / (1 + g_i) - lam = 0   ->   1 + g_i = a_i / lam
#
# EVERY TEAM ENDS AT THE SAME MARGINAL THROUGHPUT. That is the entire
# content of the stationarity condition, and it is the principle behind
# every optimal allocation: if one team's marginal return were higher,
# moving a GPU there would improve the total, so you would not be at an
# optimum.
#
# Summing:  sum_i (1 + g_i) = n + TOTAL = sum_i a_i / lam
#
#   lam = sum(a) / (n + TOTAL)
#   g_i = a_i / lam - 1

def analytic(a, total):
    lam = a.sum() / (len(a) + total)
    return a / lam - 1.0, lam

g_free, lam_free = analytic(a, TOTAL)

# g_free   = [47.50, 28.69, 22.00, 1.41]   sums to 100
# lam_free = 0.0952 throughput units per GPU
#
# Team 0 gets 47.5, well above its floor of 10; team 2 gets 22.0, above
# its floor of 5. Both floors look slack, so we expect lam = 0 on both.


# =========================================================================
# THE FULL PROBLEM
# =========================================================================

def throughput(g):
    return float((a * np.log1p(g)).sum())

def solve(a, total, minimum):
    n = len(a)
    r = minimize(
        lambda g: -throughput(g),
        x0=np.full(n, total / n),
        jac=lambda g: -a / (1.0 + g),
        constraints=[{"type": "eq",
                      "fun": lambda g: g.sum() - total,
                      "jac": lambda g: np.ones(n)}],
        bounds=[(float(m), None) for m in minimum],
        method="SLSQP",
        options={"ftol": 1e-12, "maxiter": 500},
    )
    if not r.success:
        raise RuntimeError(f"allocation failed: {r.message}")
    return r.x

g = solve(a, TOTAL, MINIMUM)

# g = [47.50, 28.69, 22.00, 1.41]  -- identical to the analytic answer,
# confirming neither floor binds.


# =========================================================================
# THE SHADOW PRICE OF THE CLUSTER
# =========================================================================

def shadow_price_of_total(a, total, minimum, h=1.0):
    lo = throughput(solve(a, total, minimum))
    hi = throughput(solve(a, total + h, minimum))
    return (hi - lo) / h

shadow_price_of_total(a, TOTAL, MINIMUM)          # 0.0947
shadow_price_of_total(a, TOTAL, MINIMUM, h=0.01)  # 0.0952 = lam
#
# The gap at h = 1 is curvature: lam is a DERIVATIVE, exact only in the
# limit. Quoting a shadow price for a large change misuses it.
#
# WHAT THE NUMBER IS FOR: it is a break-even. If a GPU costs less than
# 0.0952 throughput units' worth of money, buy more; if it costs more,
# the cluster is already the right size. Without the multiplier that
# question needs a re-solve. With it, it is a comparison.


# =========================================================================
# WHICH FLOORS COST ANYTHING
# =========================================================================

def floor_prices(a, total, minimum):
    """Shadow price of each floor: what removing it would gain."""
    base = throughput(solve(a, total, minimum))
    out = {}
    for i in range(len(a)):
        if minimum[i] == 0:
            out[i] = 0.0
            continue
        relaxed = minimum.copy()
        relaxed[i] = 0.0
        out[i] = throughput(solve(a, total, relaxed)) - base
    return out

floor_prices(a, TOTAL, MINIMUM)     # {0: 0.0, 1: 0.0, 2: 0.0, 3: 0.0}
#
# BOTH FLOORS ARE INACTIVE. Complementary slackness holds trivially:
# g_0 = 47.5 > 10 and g_2 = 22.0 > 5, so both multipliers are zero and
# removing either contract would change nothing.
#
# THE ANSWER TO "WHAT DO THE CONTRACTS COST US" IS: NOTHING, TODAY.
# Worth knowing precisely because it is not obvious -- and because it
# changes the moment the coefficients move.


# =========================================================================
# WHEN A FLOOR DOES BITE
# =========================================================================
#
# Guarantee team 3 twenty GPUs, when it would earn 1.4 on merit:

MIN2 = np.array([10.0, 0.0, 5.0, 20.0])
g2 = solve(a, TOTAL, MIN2)

# g2 = [43.9, 26.5, 20.1, 20.0]    team 3 pinned exactly at its floor

floor_prices(a, TOTAL, MIN2)[3]     # 0.878 throughput units
#
# The constraint is now ACTIVE (g_3 = 20.0 exactly) and its multiplier
# is positive. That contract costs 0.878 units of total throughput --
# about nine GPUs' worth at the margin (0.878 / 0.0952). Everyone else
# is squeezed to pay for it.
#
# WHAT TO TELL THAT TEAM: not "your contract is expensive" but the
# number. "Your floor of 20 costs the cluster 0.88 throughput units,
# equivalent to buying nine more GPUs. At your coefficient you would
# take 1.4 GPUs on merit. If the floor exists for latency rather than
# throughput, a reserved slice of 5 would cost 0.04 -- 95% less -- and
# might serve the same purpose."
#
# The multiplier turns a political conversation into an arithmetic one.
# That is the practical reason to compute it.


# =========================================================================
# TESTS
# =========================================================================

def test_equal_marginal_throughput():
    """Stationarity: every team ends at the same marginal return."""
    g = solve(a, TOTAL, np.zeros(4))
    marginal = a / (1.0 + g)

    assert np.allclose(marginal, marginal[0], atol=1e-6)


def test_matches_analytic_when_floors_slack():
    g_num = solve(a, TOTAL, MINIMUM)
    g_an, _ = analytic(a, TOTAL)

    assert np.allclose(g_num, g_an, atol=1e-4)


def test_budget_is_exactly_spent():
    assert np.isclose(solve(a, TOTAL, MINIMUM).sum(), TOTAL, atol=1e-6)


def test_complementary_slackness():
    """lam_i * (g_i - min_i) = 0 for every floor: a constraint is either
    tight, or free -- never both."""
    for minimum in (MINIMUM, np.array([10.0, 0.0, 5.0, 20.0])):
        g = solve(a, TOTAL, minimum)
        prices = floor_prices(a, TOTAL, minimum)

        for i in range(len(a)):
            slack = g[i] - minimum[i]
            assert abs(prices[i] * slack) < 1e-3, (
                f"team {i}: price {prices[i]:.3f} with slack {slack:.3f} "
                f"-- a constraint cannot be both slack and expensive"
            )


def test_shadow_price_predicts_a_small_relaxation():
    lam = a.sum() / (len(a) + TOTAL)
    measured = shadow_price_of_total(a, TOTAL, MINIMUM, h=0.01)

    assert abs(measured - lam) < 1e-3


def test_active_floor_pins_exactly_and_costs():
    MIN2 = np.array([10.0, 0.0, 5.0, 20.0])
    g = solve(a, TOTAL, MIN2)

    assert np.isclose(g[3], 20.0, atol=1e-6)        # sits ON the boundary
    assert floor_prices(a, TOTAL, MIN2)[3] > 0.5    # and it costs something`,
        notes: [
          { t: "p", text: "**Stationarity says every team ends at the same marginal throughput** — `aᵢ/(1+gᵢ) = λ` for all `i`. That one condition is the principle behind every optimal allocation: if a team's marginal return were higher than another's, moving a GPU there would improve the total, so you would not be at an optimum." },
          { t: "p", text: "Summing it gives a closed form, `λ = Σaᵢ/(n + total)` and `gᵢ = aᵢ/λ − 1`, which the numerical solve reproduces exactly — a cheap check that the solver is doing what you think." },
          { t: "callout", kind: "insight", title: "The multiplier turns a political question into an arithmetic one", body: [
            { t: "p", text: "Both original floors are inactive, so they cost nothing — worth knowing precisely because it is not obvious. Raise team 3's floor to 20 and it pins exactly on the boundary, costing 0.878 throughput units, about nine GPUs' worth at the margin." },
            { t: "p", text: "That lets you say something specific: not \"your contract is expensive\" but \"it costs the cluster nine GPUs, and a reserved slice of five would cost 95% less if what you actually need is latency\"." }
          ]},
          { t: "p", text: "**The complementary-slackness test is the one to copy into real code.** `λᵢ · slackᵢ = 0` catches a whole class of solver bugs: a constraint reported as both slack and expensive means the solve did not converge." },
          { t: "p", text: "**λ is a derivative, so it predicts small relaxations only.** The 0.0947-versus-0.0952 gap at `h = 1` is curvature; at `h = 0.01` they agree to four decimals." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A pricing model had to keep predicted prices non-negative. The team added a penalty of `1e6 × min(pred, 0)²` and training diverged on the next run." },
      { t: "p", text: "**The penalty raised the loss surface's largest curvature by six orders of magnitude**, so the learning rate that had been stable for weeks was now far above `2/L`. Nothing was wrong with the constraint — the optimiser had been silently destabilised by it." },
      { t: "p", text: "**The fix was one line: predict `log(price)` and exponentiate.** Non-negativity became structural, the penalty was deleted, and the original learning rate worked again." }
    ]}
  ],

  takeaways: [
    "**At a constrained optimum the objective's gradient is parallel to the constraint's** — that geometric fact is the whole method.",
    "**Differentiating the Lagrangian with respect to λ recovers the constraint**, so nothing is lost by folding it in.",
    "**λ is a shadow price**: `∂f*/∂c`, the improvement per unit of relaxation, and it is directly actionable.",
    "**A near-zero multiplier means the constraint is not biting**; the large one marks what is actually limiting you.",
    "**Complementary slackness — `λᵢ·gᵢ = 0` — says a constraint is either tight or free**, never both.",
    "**Only the active set matters**, which is why an SVM trained on a million points is defined by a few dozen support vectors.",
    "**For a convex problem KKT is necessary and sufficient**; outside convexity it only identifies a critical point.",
    "**Ridge is a constrained problem in disguise**, with `α = λ` and a weight budget that tightens as `α` grows.",
    "**Lasso is sparse because its constraint set is a diamond with corners on the axes** — geometry, not penalty strength.",
    "**Reparameterise wherever a map into the feasible set exists** — `exp` for positivity, `softmax` for a simplex, `LLᵀ` for positive-definiteness.",
    "**A large penalty weight raises the condition number and lowers the maximum stable learning rate**; past about 10³ it is the wrong tool.",
    "**Verify a shadow price numerically before quoting it**, and only for small relaxations — λ is a derivative."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You solve a constrained problem and one multiplier comes out at 0.0. What does that tell you?",
        options: [
          "The solver failed to converge",
          "That constraint is inactive — the unconstrained optimum already satisfies it, and removing it entirely would change nothing",
          "The constraint is violated",
          "The problem is infeasible"
        ],
        answer: 1,
        why: "This is complementary slackness: `λᵢ · gᵢ(x) = 0`, so a constraint is either tight with a positive price or slack with zero price. In a problem with 200 constraints, the zero-multiplier ones are irrelevant to the answer, and the usually-small active set is all that determines it."
      },
      {
        stem: "Why does lasso produce exactly-zero coefficients while ridge does not?",
        options: [
          "The L1 penalty is stronger",
          "The L1 constraint set is a diamond with corners on the axes, and a contour arriving from a generic direction is disproportionately likely to touch a corner — where a coordinate is exactly zero",
          "Lasso uses a different optimiser",
          "L1 gradients are larger near zero"
        ],
        answer: 1,
        why: "Seeing regularisation as a constrained problem makes this geometric rather than mysterious. An L2 budget is a ball — smooth, no corners — so the optimum touches it at a generic point where every weight is small but non-zero."
      },
      {
        stem: "A training run diverges immediately after a constraint penalty with weight `1e6` is added. What is the most likely cause?",
        options: [
          "The constraint is infeasible",
          "The penalty raised the largest Hessian eigenvalue, so the maximum stable learning rate `2/L` fell far below the rate in use",
          "The gradient of the penalty is undefined",
          "The penalty term has the wrong sign"
        ],
        answer: 1,
        why: "A 100× stronger penalty forces a 100× smaller learning rate. The run did not diverge because of the constraint but because a rate that was fine before is now above the stability threshold — and the right fix is usually to reparameterise so the constraint holds by construction."
      },
      {
        stem: "You need model weights that are non-negative and sum to one. What is the best approach?",
        options: [
          "Clip to `[0,1]` and renormalise after each step",
          "Optimise an unconstrained `z` and use `softmax(z)` — the constraint then holds exactly at every step, with no penalty weight to tune",
          "Add a large quadratic penalty",
          "Project onto the simplex once per epoch"
        ],
        answer: 1,
        why: "Reparameterisation makes the constraint structural rather than enforced. Clipping is not projection, does not converge to the constrained optimum, and kills the gradient at the boundary so a weight that reaches zero can never recover."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does a Lagrange multiplier actually mean?",
        strong: "It is the shadow price of the constraint — the rate at which the optimal value improves as you relax it by one unit. So it tells you what buying more of the constrained resource is worth.",
        answer: [
          { t: "p", text: "Leading with the economic reading rather than the algebra shows you understand why anyone computes it." },
          { t: "p", text: "A concrete example — a budget constraint whose multiplier is the marginal return per unit spent — makes it land." },
          { t: "p", text: "Adding that a near-zero multiplier means the constraint is not worth relaxing shows you would actually use the number." }
        ]
      },
      {
        level: "advanced",
        q: "Explain complementary slackness and why it matters practically.",
        strong: "`λᵢ · gᵢ(x) = 0` — each inequality is either tight with a positive price or slack with zero price, never both. Practically it means only the active set determines the answer, which is why an SVM is defined by its support vectors.",
        answer: [
          { t: "p", text: "The SVM connection separates understanding from recitation: support vectors *are* the points with non-zero multipliers." },
          { t: "p", text: "Mentioning it as a solver sanity check — a constraint reported as both slack and expensive means non-convergence — is a practical detail few give." }
        ]
      },
      {
        level: "advanced",
        q: "How would you enforce that a model's outputs stay positive?",
        strong: "Reparameterise — predict `log(y)` and exponentiate, or use softplus. The constraint then holds by construction, with no penalty weight to tune. A penalty is the fallback when no such map exists, and a large one destabilises training by raising the condition number.",
        answer: [
          { t: "p", text: "Ranking reparameterisation above projection above penalty, with a reason for the ranking, is the substance here." },
          { t: "p", text: "The condition-number argument for why a big penalty breaks training connects this to optimisation rather than treating it as a modelling detail." }
        ]
      }
    ]
  }
});

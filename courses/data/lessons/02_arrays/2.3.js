/* ============================================================================
   LESSON 2.3 — Linear Algebra and einsum
   ========================================================================= */
EC.receiveLesson({
  id: "2.3",

  lede: "**`*` is element-wise and `@` is matrix multiplication, and mixing them up is silent when the shapes happen to broadcast.** Beyond that one distinction sits a small set of decompositions that solve most numerical problems — and `einsum`, which expresses any of them in a line you can read.",

  objectives: [
    "Distinguish element-wise, dot, matrix and outer products by shape",
    "Use `solve` rather than `inv` and say why it matters",
    "Read a condition number and know what it predicts",
    "Express contractions with `einsum` notation",
    "Recognise when SVD or eigendecomposition is the right tool"
  ],

  prerequisites: ["1.2", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "The products, and which one you meant", id: "products" },

    { t: "p", text: "NumPy has five distinct multiplication behaviours reachable through three operators. **The dangerous case is not an error — it is `*` between a `(n, 1)` and a `(1, m)` array, which broadcasts into an `n × m` outer product** where you wanted an element-wise result." },

    { t: "dl", items: [
      ["Element-wise (`*`)", "Multiplies corresponding elements, with broadcasting. `a * b` on two `(3, 3)` arrays gives nine independent products, not a matrix product."],
      ["Matrix product (`@`)", "`np.matmul`. The `(n, k) @ (k, m) → (n, m)` operation. On stacks of matrices it batches over the leading axes."],
      ["Dot product", "`np.dot`. On 1-D it is the scalar inner product; on 2-D it is the matrix product; on higher dimensions it does something else entirely — which is why `@` is preferred."],
      ["Outer product", "`np.outer(a, b)` or `a[:, None] * b[None, :]` — every pairing, giving an `(n, m)` matrix from two vectors."],
      ["Condition number", "`np.linalg.cond(A)` — how much a small change in the input can change the solution. Large means the answer is not trustworthy."],
      ["Singular matrix", "A matrix with no inverse, because its rows or columns are linearly dependent. `solve` raises; `inv` may return garbage."]
    ]},

    { t: "code", lang: "python", title: "five products, and the one that fails silently", code: `
import numpy as np

A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])

A * B                         # element-wise: [[5,12],[21,32]]
A @ B                         # matrix product: [[19,22],[43,50]]
#
# BOTH ARE (2,2). Neither raises. If you meant one and wrote the other,
# nothing tells you -- and on a square matrix the results are the same
# SHAPE, so downstream code carries on.

u = np.array([1, 2, 3])
v = np.array([4, 5, 6])

u * v                         # [4, 10, 18] -- element-wise
u @ v                         # 32 -- scalar inner product
np.dot(u, v)                  # 32 -- the same
np.outer(u, v).shape          # (3, 3) -- every pairing
u[:, None] * v[None, :]       # the same outer product, spelled out

# THE SILENT BROADCAST -- this is the one to watch for:
col = np.arange(4)[:, None]   # (4, 1)
row = np.arange(3)[None, :]   # (1, 3)
(col * row).shape             # (4, 3) -- an OUTER PRODUCT
#
# If both came from reshapes and you expected element-wise, you now
# have a matrix instead of a vector and no error was raised. See 1.2:
# this is the same failure that produces a wrong evaluation metric.

# @ ON STACKS BATCHES OVER THE LEADING AXES:
batch = np.random.default_rng(0).normal(size=(32, 4, 5))
W = np.random.default_rng(1).normal(size=(5, 3))
(batch @ W).shape             # (32, 4, 3) -- 32 independent products
#
# np.dot(batch, W) also gives (32,4,3) here, but np.dot's rule for
# ndim > 2 is a sum over the LAST axis of the first and the
# SECOND-TO-LAST of the second, which diverges from matmul as soon as
# both arguments are 3-D:
np.matmul(batch, np.random.default_rng(2).normal(size=(32,5,3))).shape
#                             # (32, 4, 3) -- batched, as expected
# np.dot(batch, other3d).shape -> (32, 4, 32, 3) -- almost never wanted
#
# USE @ . np.dot exists for backward compatibility.

# TRANSPOSE, TRACE, DIAGONAL:
A.T                           # a view -- strides swapped, no copy
np.trace(A)                   # 5 -- sum of the diagonal
np.diag(A)                    # [1, 4] -- extract the diagonal
np.diag([1, 4])               # build a diagonal matrix from a vector
#
# np.diag does two different things depending on input ndim, which is
# a small wart worth knowing.

# NORMS -- the ord argument is where the meaning lives:
np.linalg.norm(u)             # 3.74 -- L2, the default
np.linalg.norm(u, ord=1)      # 6 -- sum of absolute values
np.linalg.norm(u, ord=np.inf) # 3 -- the largest absolute value
np.linalg.norm(A, ord="fro")  # Frobenius, for matrices
#
# ROW-WISE NORMS need an axis, and keepdims to divide by them:
X = np.random.default_rng(0).normal(size=(100, 5))
X / np.linalg.norm(X, axis=1, keepdims=True)      # unit rows
`,
      hl: [10, 25, 40, 60],
      caption: "**`(4,1) * (1,3)` is an outer product.** Nothing raises, and if both operands came from reshapes you now have a matrix where you expected a vector."
    },

    { t: "h2", n: "02", text: "Solving systems: use solve, not inv", id: "solve" },

    { t: "p", text: "**`np.linalg.inv(A) @ b` is slower and less accurate than `np.linalg.solve(A, b)`, and it hides failure.** Explicitly computing an inverse is almost never the right operation — it is a step people take because the maths notation writes it that way." },

    { t: "viz",
      title: "Why an ill-conditioned system cannot be trusted",
      caption: "Two nearly parallel lines: the intersection is mathematically well defined and practically unknowable. A tiny change in a coefficient moves the answer a long way.",
      svg: `<svg viewBox="0 0 880 280" role="img" aria-label="Two well separated lines intersecting sharply, against two nearly parallel lines whose intersection moves a long way under a small perturbation">
  <text x="30" y="26" class="s-label" style="fill:var(--good)">Well conditioned — cond ≈ 1.6</text>
  <g style="stroke:var(--line);stroke-width:1"><line x1="40" y1="230" x2="380" y2="230"/><line x1="40" y1="50" x2="40" y2="230"/></g>
  <line x1="50" y1="220" x2="370" y2="70" style="stroke:var(--acc);stroke-width:2"/>
  <line x1="50" y1="70" x2="370" y2="215" style="stroke:var(--good);stroke-width:2"/>
  <circle cx="212" cy="146" r="6" style="fill:var(--good)"/>
  <text x="226" y="140" class="s-sub" style="fill:var(--good)">unambiguous</text>
  <text x="50" y="262" class="s-sub" style="fill:var(--ink-3)">a small nudge to either line barely moves the crossing</text>

  <text x="480" y="26" class="s-label" style="fill:var(--crit)">Ill conditioned — cond ≈ 10⁸</text>
  <g style="stroke:var(--line);stroke-width:1"><line x1="490" y1="230" x2="850" y2="230"/><line x1="490" y1="50" x2="490" y2="230"/></g>
  <line x1="500" y1="200" x2="840" y2="110" style="stroke:var(--acc);stroke-width:2"/>
  <line x1="500" y1="206" x2="840" y2="122" style="stroke:var(--good);stroke-width:2"/>
  <line x1="500" y1="203" x2="840" y2="104" style="stroke:var(--crit);stroke-width:1.5" stroke-dasharray="5 3"/>
  <circle cx="762" cy="130" r="6" style="fill:var(--crit)"/>
  <circle cx="640" cy="152" r="6" style="fill:var(--warn)"/>
  <text x="520" y="90" class="s-sub" style="fill:var(--crit)">the dashed line differs by 0.0001</text>
  <text x="520" y="262" class="s-sub" style="fill:var(--crit)">…and the intersection moved right across the plot</text>
  <text x="600" y="176" class="s-sub" style="fill:var(--warn)">before</text>
  <text x="740" y="164" class="s-sub" style="fill:var(--crit)">after</text>
</svg>`
    },

    { t: "code", lang: "python", title: "solving, and knowing whether to believe the answer", code: `
A = np.array([[3.0, 1.0], [1.0, 2.0]])
b = np.array([9.0, 8.0])

np.linalg.solve(A, b)         # array([2., 3.]) -- LU factorisation
np.linalg.inv(A) @ b          # the same numbers, more slowly, less exactly
#
# WHY solve IS BETTER:
#   - roughly 2-3x faster: one factorisation instead of a full inverse
#     followed by a matrix-vector product
#   - numerically better: the inverse of an ill-conditioned matrix is
#     itself badly wrong, and the error is then multiplied through
#   - it RAISES on a singular matrix, where inv may return values

singular = np.array([[1.0, 2.0], [2.0, 4.0]])     # row 2 = 2 x row 1
try:
    np.linalg.solve(singular, b)
except np.linalg.LinAlgError as e:
    print(e)                  # Singular matrix

np.linalg.inv(singular)       # LinAlgError too -- but only exactly singular
#
# THE DANGEROUS CASE IS NEARLY SINGULAR, where nothing raises:
almost = np.array([[1.0, 2.0], [2.0, 4.0 + 1e-12]])
np.linalg.cond(almost)        # ~1.6e13 -- enormous
x = np.linalg.solve(almost, b)          # returns numbers, no warning
np.allclose(almost @ x, b)              # True -- it "solved" it
#
# AND THE ANSWER IS MEANINGLESS. Perturb b by one part in a billion:
x2 = np.linalg.solve(almost, b * (1 + 1e-9))
np.abs(x - x2).max()          # a large number -- the solution moved

# THE CONDITION NUMBER TELLS YOU HOW MANY DIGITS YOU LOSE:
#   float64 gives ~16 significant digits
#   cond = 10**k means you lose about k of them
#
#   cond < 100         fine
#   cond ~ 10**8       half your precision is gone
#   cond > 10**12      the answer is noise
def trustworthy(A, tol=1e10):
    c = np.linalg.cond(A)
    return c < tol, f"cond={c:.2e}, ~{int(np.log10(c))} digits lost"

trustworthy(A)                # (True, 'cond=2.62e+00, ~0 digits lost')
trustworthy(almost)           # (False, 'cond=1.60e+13, ~13 digits lost')

# THE COMMON SOURCE IN DATA WORK: correlated features.
rng = np.random.default_rng(0)
x1 = rng.normal(size=1000)
X = np.column_stack([x1, x1 * 2 + rng.normal(0, 1e-6, 1000), rng.normal(size=1000)])
np.linalg.cond(X.T @ X)       # enormous -- two features are collinear
#
# THIS IS WHY LINEAR REGRESSION COEFFICIENTS GO WILD on correlated
# inputs. The fit is fine; the coefficients are not identifiable, and
# they swing violently between refits on slightly different data.

# lstsq HANDLES IT, and reports the rank:
coef, residuals, rank, sv = np.linalg.lstsq(X, rng.normal(size=1000),
                                            rcond=None)
rank                          # 2, not 3 -- it detected the dependency
#
# lstsq uses SVD and truncates tiny singular values, which gives the
# minimum-norm solution instead of an arbitrary one. For regression on
# real data it is the safe default.
`,
      hl: [11, 24, 37, 57],
      caption: "**A nearly singular system \"solves\" without warning and the answer is noise.** `np.linalg.cond` is the check, and its base-10 logarithm is roughly how many of your sixteen digits are gone."
    },

    { t: "callout", kind: "trap", title: "Collinear features make coefficients meaningless, not wrong", body: [
      { t: "p", text: "Two nearly-identical features make `XᵀX` ill-conditioned. The model's *predictions* remain fine — the fit is unaffected — but the coefficients swing wildly between refits on slightly different data." },
      { t: "p", text: "**This is why \"the importance of feature A dropped from +3.1 to −2.8 after retraining\" is usually a conditioning problem rather than a finding.** Nothing errored, and both numbers came out of a converged fit." },
      { t: "p", text: "**Check `np.linalg.cond(X.T @ X)` before interpreting any linear model's coefficients**, and prefer `lstsq` — it uses SVD, truncates the degenerate directions, and reports the effective rank." }
    ]},

    { t: "h2", n: "03", text: "einsum", id: "einsum" },

    { t: "p", text: "**`einsum` names each axis with a letter and says which ones to sum over.** Repeated letters are contracted, letters absent from the output are summed away — two rules that cover matrix products, traces, batched operations and contractions with no NumPy function of their own." },

    { t: "code", lang: "python", title: "the notation, from trivial to genuinely useful", code: `
a = np.arange(6).reshape(2, 3)
b = np.arange(12).reshape(3, 4)

# THE TWO RULES:
#   1. A letter repeated in the inputs is SUMMED OVER (contracted).
#   2. A letter absent from the output is SUMMED OVER.

np.einsum("ij,jk->ik", a, b)        # matrix product: j is contracted
np.einsum("ij->ji", a)              # transpose
np.einsum("ii->i", np.eye(3))       # extract the diagonal
np.einsum("ii", np.eye(3))          # trace: i repeated AND absent
np.einsum("ij->", a)                # sum everything
np.einsum("ij->j", a)               # column sums (i summed away)
np.einsum("i,j->ij", [1,2], [3,4])  # outer product: nothing contracted

# WHERE IT EARNS ITS KEEP -- operations with no simple alternative:

# 1. BATCHED MATRIX PRODUCT WITH A TWIST:
batch = np.random.default_rng(0).normal(size=(32, 10, 64))
W = np.random.default_rng(1).normal(size=(64, 64))
np.einsum("bij,jk->bik", batch, W).shape          # (32, 10, 64)
# ...same as batch @ W, but the letters say exactly what happened.

# 2. PAIRWISE DOT PRODUCTS WITHOUT AN n x n MATRIX:
X = np.random.default_rng(0).normal(size=(1000, 50))
row_sq = np.einsum("ij,ij->i", X, X)              # squared norm per row
#
# COMPARE: (X ** 2).sum(axis=1) allocates a full (1000, 50) temporary.
# einsum does not -- it fuses the square and the sum into one pass.
np.allclose(row_sq, (X ** 2).sum(axis=1))         # True

# 3. ATTENTION SCORES, which is where most people first meet it:
Q = np.random.default_rng(0).normal(size=(8, 100, 64))    # heads, seq, dim
K = np.random.default_rng(1).normal(size=(8, 100, 64))
scores = np.einsum("hqd,hkd->hqk", Q, K) / np.sqrt(64)
scores.shape                        # (8, 100, 100)
#
# The letters ARE the documentation: for each head h, every query q
# against every key k, summing over the feature dimension d. Writing
# this with transpose and matmul takes three lines and is harder to
# check.

# 4. WEIGHTED SUM OVER A CHOSEN AXIS:
values = np.random.default_rng(0).normal(size=(100, 20, 3))
weights = np.random.default_rng(1).random(20)
np.einsum("ijk,j->ik", values, weights).shape     # (100, 3)

# PERFORMANCE: einsum is not automatically faster.
# %timeit a @ b                          -> fastest, calls BLAS directly
# %timeit np.einsum("ij,jk->ik", a, b)   -> slower on plain matmul
# %timeit np.einsum("ij,jk->ik", a, b, optimize=True)   -> comparable
#
# optimize=True finds a good contraction ORDER for multi-operand
# expressions, which can be a large win:
A_, B_, C_ = (np.random.default_rng(i).normal(size=(200, 200))
              for i in range(3))
# %timeit np.einsum("ij,jk,kl->il", A_, B_, C_)                 -> ~2.6 s
# %timeit np.einsum("ij,jk,kl->il", A_, B_, C_, optimize=True)  -> ~4 ms
#
# WITHOUT optimize, einsum builds the full intermediate over all
# indices at once -- 200**4 operations. With it, it multiplies
# pairwise in the cheapest order. ALWAYS pass optimize=True for three
# or more operands.

# READING AN UNFAMILIAR einsum: name the axes, then apply the rules.
#   "bhqd,bhkd->bhqk"
#   b batch, h head, q query, k key, d feature
#   d appears in both inputs and not the output -> summed over
#   everything else is carried through
`,
      hl: [24, 34, 56, 64],
      caption: "**`optimize=True` on three operands is not a micro-optimisation** — without it einsum builds the full intermediate over every index at once, here 2.6 seconds against 4 milliseconds."
    },

    { t: "h2", n: "04", text: "Decompositions", id: "decompositions" },

    { t: "table",
      head: ["Decomposition", "Applies to", "Gives you", "Used for"],
      rows: [
        ["**SVD** `svd`", "Any matrix", "`U`, singular values, `Vᵀ`", "PCA, low-rank approximation, pseudo-inverse, rank"],
        ["**Eigen** `eig` / `eigh`", "Square / symmetric", "Eigenvalues and vectors", "PCA on a covariance matrix, stability analysis"],
        ["**QR** `qr`", "Any matrix", "Orthogonal `Q`, upper-triangular `R`", "Least squares, orthonormal bases"],
        ["**Cholesky** `cholesky`", "Symmetric positive-definite", "Lower-triangular `L` with `L Lᵀ = A`", "Sampling correlated normals, fast solves — twice as fast as LU"]
      ],
      caption: "**Use `eigh` rather than `eig` on a symmetric matrix.** It is faster, guarantees real eigenvalues, and returns them sorted — `eig` returns complex values with tiny imaginary parts that then propagate."
    },

    { t: "code", lang: "python", title: "SVD, and PCA built from it", code: `
rng = np.random.default_rng(0)
X = rng.normal(size=(200, 10))
X[:, 3] = X[:, 1] * 2 + rng.normal(0, 1e-8, 200)      # near-duplicate

U, s, Vt = np.linalg.svd(X, full_matrices=False)
U.shape, s.shape, Vt.shape        # (200,10), (10,), (10,10)

# SINGULAR VALUES ARE SORTED DESCENDING and reveal the true rank:
s.round(3)                        # the fourth is ~1e-8, the rest are not
np.linalg.matrix_rank(X)          # 9, not 10 -- the dependency is found

# PCA IS SVD ON CENTRED DATA. That is the whole algorithm:
def pca(X, n_components):
    """Return the projected data, the components and explained variance."""
    mu = X.mean(axis=0, keepdims=True)
    Xc = X - mu

    U, s, Vt = np.linalg.svd(Xc, full_matrices=False)

    # Variance along each component. The n-1 is the sample convention,
    # matching sklearn -- a detail that makes the numbers comparable.
    explained = s ** 2 / (len(X) - 1)
    ratio = explained / explained.sum()

    components = Vt[:n_components]
    projected = Xc @ components.T
    return projected, components, ratio[:n_components], mu

Z, comps, ratio, mu = pca(X, 3)
Z.shape                           # (200, 3)
ratio.round(3)                    # variance share of each component
ratio.cumsum()[-1]                # how much of the total is retained

# RECONSTRUCTING -- and the error tells you what was discarded:
X_hat = Z @ comps + mu
np.abs(X - X_hat).mean()

# CENTRING IS NOT OPTIONAL. Without it the first component points at
# the MEAN rather than at the direction of greatest variance:
def pca_wrong(X, k):
    U, s, Vt = np.linalg.svd(X, full_matrices=False)     # no centring
    return X @ Vt[:k].T

shifted = X + 1000                # same shape, same variance
np.allclose(pca(shifted, 2)[2], pca(X, 2)[2])       # True -- unaffected
# pca_wrong's first component is dominated by the offset entirely.

# LOW-RANK APPROXIMATION -- keep k components, rebuild:
def compress(X, k):
    U, s, Vt = np.linalg.svd(X, full_matrices=False)
    return (U[:, :k] * s[:k]) @ Vt[:k]

err = [np.abs(X - compress(X, k)).mean() for k in (1, 3, 5, 9, 10)]
#
# The error drops sharply then plateaus -- the plateau is where the
# remaining singular values are noise. That elbow is the honest way
# to choose k, rather than a round number.

# CHOLESKY -- generating correlated samples:
target_corr = np.array([[1.0, 0.8], [0.8, 1.0]])
L = np.linalg.cholesky(target_corr)
samples = rng.normal(size=(10_000, 2)) @ L.T
np.corrcoef(samples.T)[0, 1]      # ~0.8
#
# cholesky RAISES on a matrix that is not positive definite, which is
# a useful check in itself: a "correlation matrix" that fails it is
# not a valid correlation matrix.
try:
    np.linalg.cholesky(np.array([[1.0, 1.5], [1.5, 1.0]]))
except np.linalg.LinAlgError:
    print("not positive definite -- correlation above 1 is impossible")
`,
      hl: [11, 29, 38, 60],
      caption: "**Centring is not optional in PCA.** Without it the first component points at the mean rather than at the direction of greatest variance, and the result is dominated by an arbitrary offset."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Diagnose a regression whose coefficients will not sit still",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A linear model's predictions are stable and good, but the coefficients change sign between weekly refits. Stakeholders are drawing conclusions from those coefficients." },
        { t: "p", text: "Build the diagnostic that identifies the cause, quantifies it, and says which features are involved — then show what happens to the coefficients when the problem is addressed." }
      ],
      requirements: [
        "Detect collinearity and name the feature groups involved.",
        "Quantify with condition number and VIF.",
        "Demonstrate the instability rather than asserting it.",
        "Show that predictions are unaffected.",
        "Give at least two remedies with their trade-offs.",
        "Include tests."
      ],
      hint: "Predictions and coefficients are separate questions. A demonstration is more convincing than a metric here.",
      solution: {
        lang: "python",
        title: "collinearity.py",
        code: `import numpy as np


# =========================================================================
# THE DIAGNOSIS
# =========================================================================

def diagnose(X, names=None, cond_warn=1e3, vif_warn=10.0):
    """Report conditioning and per-feature variance inflation.

    Scaling matters: cond(X.T @ X) on unscaled features reflects unit
    choice as much as collinearity, so a feature measured in pounds
    rather than thousands looks ill-conditioned when it is not.
    We standardise first, so the number means what people think it does.
    """
    X = np.asarray(X, dtype=float)
    n, p = X.shape
    names = list(names) if names is not None else [f"f{i}" for i in range(p)]

    Xc = X - X.mean(axis=0, keepdims=True)
    sd = Xc.std(axis=0, ddof=1)
    constant = sd < 1e-12
    Z = Xc / np.where(constant, 1.0, sd)

    C = Z.T @ Z / (n - 1)                   # the correlation matrix

    cond = float(np.linalg.cond(C))
    rank = int(np.linalg.matrix_rank(Z))

    # VIF_j = 1 / (1 - R2_j) from regressing feature j on the others.
    # The diagonal of the inverse correlation matrix gives them all at
    # once -- one inversion instead of p regressions.
    #
    # pinv rather than inv, because an exactly singular C would raise
    # and we need a number for the report, not an exception.
    vif = np.diag(np.linalg.pinv(C))

    # WHICH FEATURES ARE INVOLVED: the eigenvectors of the smallest
    # eigenvalues point along the near-dependencies. A large loading
    # means that feature participates in one.
    eigval, eigvec = np.linalg.eigh(C)
    groups = []
    for i, ev in enumerate(eigval):
        if ev < 1e-3:
            loading = np.abs(eigvec[:, i])
            involved = [names[j] for j in np.flatnonzero(loading > 0.3)]
            if len(involved) > 1:
                groups.append({"eigenvalue": float(ev), "features": involved})

    return {
        "n": n,
        "p": p,
        "rank": rank,
        "rank_deficient": rank < p,
        "condition_number": cond,
        "digits_lost": int(max(0, np.log10(cond))),
        "ill_conditioned": cond > cond_warn,
        "vif": {names[j]: round(float(vif[j]), 2) for j in range(p)},
        "high_vif": [names[j] for j in range(p) if vif[j] > vif_warn],
        "dependency_groups": groups,
        "constant_features": [names[j] for j in np.flatnonzero(constant)],
    }


# =========================================================================
# DEMONSTRATING THE INSTABILITY -- more convincing than a metric
# =========================================================================

def coefficient_stability(X, y, n_boot=200, seed=0, method="lstsq"):
    """Refit on bootstrap resamples and report coefficient spread.

    This is the diagnostic that actually persuades people: it shows
    the coefficient they are quoting moving between refits on data
    drawn from the same source.
    """
    X, y = np.asarray(X, float), np.asarray(y, float)
    n = len(X)
    root = np.random.SeedSequence(seed)

    coefs = []
    for s in root.spawn(n_boot):
        rng = np.random.default_rng(s)
        idx = rng.integers(0, n, n)
        Xb, yb = X[idx], y[idx]

        if method == "lstsq":
            c, *_ = np.linalg.lstsq(Xb, yb, rcond=None)
        else:                                   # ridge
            lam = 1.0
            c = np.linalg.solve(Xb.T @ Xb + lam * np.eye(X.shape[1]),
                                Xb.T @ yb)
        coefs.append(c)

    coefs = np.array(coefs)
    mean = coefs.mean(axis=0)
    sd = coefs.std(axis=0, ddof=1)

    return {
        "mean": mean,
        "sd": sd,
        # THE TELLING NUMBER: what fraction of features change SIGN
        # across refits. A stable model has none.
        "sign_flips": (np.sign(coefs) != np.sign(mean)).mean(axis=0),
        "relative_sd": sd / np.maximum(np.abs(mean), 1e-12),
    }


# =========================================================================
# PREDICTIONS ARE FINE -- which is the part people find surprising
# =========================================================================

def prediction_stability(X, y, n_boot=100, seed=0):
    X, y = np.asarray(X, float), np.asarray(y, float)
    n = len(X)
    root = np.random.SeedSequence(seed)

    preds = []
    for s in root.spawn(n_boot):
        rng = np.random.default_rng(s)
        idx = rng.integers(0, n, n)
        c, *_ = np.linalg.lstsq(X[idx], y[idx], rcond=None)
        preds.append(X @ c)

    preds = np.array(preds)
    return {
        "pred_sd_mean": float(preds.std(axis=0, ddof=1).mean()),
        "y_sd": float(y.std(ddof=1)),
    }


# =========================================================================
# THE WORKED CASE
# =========================================================================

def build(n=500, seed=0, noise=1e-3):
    rng = np.random.default_rng(seed)
    x1 = rng.normal(size=n)
    x2 = rng.normal(size=n)
    x3 = x1 * 1.5 + rng.normal(0, noise, n)      # nearly x1
    x4 = rng.normal(size=n)

    X = np.column_stack([x1, x2, x3, x4])
    y = 2 * x1 + 3 * x2 + rng.normal(0, 0.5, n)
    return X, y, ["x1", "x2", "x3_dup", "x4"]


X, y, names = build()

d = diagnose(X, names)
d["condition_number"]              # very large
d["high_vif"]                      # ['x1', 'x3_dup']
d["dependency_groups"]             # x1 and x3_dup together

cs = coefficient_stability(X, y)
cs["sd"].round(2)                  # x1 and x3_dup enormous, x2 and x4 small
cs["sign_flips"].round(2)          # x1 and x3_dup flip sign often

ps = prediction_stability(X, y)
ps["pred_sd_mean"] / ps["y_sd"]    # small -- PREDICTIONS ARE STABLE
#
# THAT IS THE WHOLE STORY: the model predicts well, and the
# coefficients are not identifiable. "Feature x1 has a negative
# effect" is not a finding; it is an artefact of which bootstrap
# sample was drawn.


# =========================================================================
# THE REMEDIES
# =========================================================================
#
# 1. DROP ONE OF THE PAIR.
#    + Coefficients become interpretable immediately.
#    + Cheapest, and usually correct when the pair is a genuine
#      duplicate (the same quantity in two units, or a total and its
#      largest component).
#    - The retained feature absorbs the pair's combined effect, so its
#      coefficient is no longer "the effect of x1".
#    - Choosing which to drop is a domain decision, not a statistical
#      one. Dropping by VIF alone picks arbitrarily.
#
# 2. RIDGE (L2 penalty).
#    + Keeps every feature, and makes the solution unique by adding
#      lambda to the diagonal -- which is literally what fixes the
#      conditioning.
#    + Coefficients become stable and shrink toward each other, which
#      is the honest representation of "we cannot separate these".
#    - They are biased, and the size depends on lambda.
#    - REQUIRES SCALED FEATURES, or the penalty falls unevenly.
#
# 3. COMBINE THEM (PCA, or a domain-meaningful sum).
#    + Removes the dependency by construction.
#    - The new feature is harder to explain than either original.
#
# 4. DO NOTHING, AND STOP QUOTING THE COEFFICIENTS.
#    Entirely valid if the model exists to predict. The failure here
#    was interpreting an unidentifiable parameter, not fitting it.

def ridge(X, y, lam=1.0, fit_intercept=True):
    """Ridge with the intercept left unpenalised, on standardised X."""
    X = np.asarray(X, float)
    mu, sd = X.mean(axis=0), X.std(axis=0, ddof=1)
    Z = (X - mu) / np.where(sd < 1e-12, 1.0, sd)

    y_mean = y.mean() if fit_intercept else 0.0
    yc = y - y_mean

    A = Z.T @ Z + lam * np.eye(Z.shape[1])
    coef_z = np.linalg.solve(A, Z.T @ yc)

    coef = coef_z / np.where(sd < 1e-12, 1.0, sd)
    intercept = y_mean - mu @ coef
    return coef, intercept


# =========================================================================
# TESTS
# =========================================================================

def test_collinearity_is_detected():
    X, y, names = build()
    d = diagnose(X, names)

    assert d["ill_conditioned"]
    assert set(d["high_vif"]) == {"x1", "x3_dup"}


def test_independent_features_are_not_flagged():
    rng = np.random.default_rng(0)
    X = rng.normal(size=(500, 4))
    d = diagnose(X)

    assert not d["ill_conditioned"]
    assert d["high_vif"] == []
    assert d["dependency_groups"] == []


def test_dependency_group_names_both_members():
    X, y, names = build()
    groups = diagnose(X, names)["dependency_groups"]

    assert groups
    assert set(groups[0]["features"]) == {"x1", "x3_dup"}


def test_coefficients_are_unstable_and_predictions_are_not():
    """The finding the whole exercise exists to demonstrate."""
    X, y, names = build()

    cs = coefficient_stability(X, y)
    ps = prediction_stability(X, y)

    assert cs["relative_sd"][0] > 1.0          # x1 swings hugely
    assert cs["relative_sd"][1] < 0.2          # x2 is stable
    assert cs["sign_flips"][0] > 0.1           # and changes sign

    assert ps["pred_sd_mean"] / ps["y_sd"] < 0.1


def test_ridge_stabilises_the_coefficients():
    X, y, names = build()

    unstable = coefficient_stability(X, y, method="lstsq")
    stable = coefficient_stability(X, y, method="ridge")

    assert stable["sd"][0] < unstable["sd"][0] / 10


def test_dropping_the_duplicate_fixes_conditioning():
    X, y, names = build()
    X2 = X[:, [0, 1, 3]]

    assert not diagnose(X2)["ill_conditioned"]


def test_exact_duplicate_is_rank_deficient():
    rng = np.random.default_rng(0)
    x = rng.normal(size=200)
    X = np.column_stack([x, x, rng.normal(size=200)])

    d = diagnose(X)
    assert d["rank_deficient"]
    assert d["rank"] == 2


def test_constant_feature_is_reported_not_crashed_on():
    rng = np.random.default_rng(0)
    X = np.column_stack([rng.normal(size=100), np.ones(100)])

    d = diagnose(X, ["real", "const"])
    assert d["constant_features"] == ["const"]


def test_scaling_does_not_change_the_verdict():
    """cond on unscaled data reflects units; standardising fixes that."""
    X, y, names = build()
    X_scaled = X * np.array([1.0, 1000.0, 1.0, 0.001])

    a, b = diagnose(X), diagnose(X_scaled)
    assert a["ill_conditioned"] == b["ill_conditioned"]
    assert np.isclose(a["condition_number"], b["condition_number"], rtol=0.01)`,
        notes: [
          { t: "p", text: "**Predictions and coefficients are separate questions.** The model here predicts well and its coefficients are not identifiable — so \"feature x1 has a negative effect\" is an artefact of which bootstrap sample was drawn, not a finding." },
          { t: "callout", kind: "insight", title: "Demonstrate the instability rather than reporting a metric", body: [
            { t: "p", text: "A condition number of 10¹² persuades nobody who has not seen one before. **Refitting on 200 bootstrap resamples and showing the coefficient changing sign in 30% of them persuades everybody.**" },
            { t: "p", text: "Showing in the same breath that predictions barely move is what makes the diagnosis land: the model is fine, the interpretation is not." }
          ]},
          { t: "p", text: "**Standardise before computing the condition number.** On raw features it reflects unit choice as much as collinearity — a column measured in pounds rather than thousands looks ill-conditioned when nothing is wrong with it." },
          { t: "p", text: "**The diagonal of the inverse correlation matrix gives every VIF at once**, replacing p separate regressions with one inversion. `pinv` rather than `inv`, because an exactly singular matrix needs to produce a number for the report rather than an exception." },
          { t: "p", text: "**The eigenvectors of the smallest eigenvalues name the culprits.** A VIF table tells you which features are inflated; the loadings tell you which ones are inflated *together*, which is what you need to decide what to drop." },
          { t: "p", text: "**\"Do nothing and stop quoting the coefficients\" is a legitimate remedy.** If the model exists to predict, the failure was interpreting an unidentifiable parameter — not fitting it — and ridge would trade a real property for a cosmetic one." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`np.einsum(\"ij,jk,kl->il\", A, B, C)` on 200×200 matrices takes 2.6 seconds. What fixes it?",
          options: [
            "Convert to float32",
            "Pass `optimize=True` — without it einsum builds the full intermediate over every index at once",
            "Use np.dot instead",
            "Reshape the inputs"
          ],
          answer: 1,
          why: "Without `optimize`, einsum contracts all three operands simultaneously, which is 200⁴ operations. With it, it multiplies pairwise in the cheapest order — about 4 milliseconds. Always pass it for three or more operands."
        }
      ]
    }
  ],

  takeaways: [
    "**`*` is element-wise and `@` is the matrix product** — on square inputs both succeed and give the same shape, so the mistake is silent.",
    "**`(n,1) * (1,m)` is an outer product**, which is the same broadcasting failure that produces wrong evaluation metrics.",
    "**Use `@`, not `np.dot`** — `dot`'s rule for more than two dimensions diverges from batched matrix multiplication.",
    "**`np.linalg.solve` beats `inv(A) @ b`**: faster, more accurate, and it raises on a singular matrix rather than returning values.",
    "**A nearly singular system solves without warning**, and `np.linalg.cond`'s base-10 logarithm is roughly how many of your sixteen digits are gone.",
    "**Collinear features make coefficients unstable, not predictions wrong** — a sign flip between refits is usually conditioning, not a finding.",
    "**`lstsq` uses SVD, truncates degenerate directions and reports the effective rank**, which makes it the safe default for regression on real data.",
    "**einsum has two rules**: a repeated letter is contracted, and a letter absent from the output is summed away.",
    "**Always pass `optimize=True` to einsum with three or more operands** — the difference is seconds against milliseconds.",
    "**einsum can fuse operations that would otherwise allocate a temporary**, such as per-row squared norms.",
    "**PCA is SVD on centred data** — without the centring, the first component points at the mean.",
    "**Use `eigh` on symmetric matrices**: faster, real eigenvalues, and sorted, where `eig` returns complex values with tiny imaginary parts."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why prefer `np.linalg.solve(A, b)` over `np.linalg.inv(A) @ b`?",
        options: [
          "They are equivalent; solve is just shorter",
          "solve is faster, numerically more accurate, and raises on a singular matrix rather than returning values",
          "inv only works on symmetric matrices",
          "solve handles complex numbers"
        ],
        answer: 1,
        why: "`inv` does more work — a full inverse plus a product — and the inverse of an ill-conditioned matrix is itself badly wrong, with that error then multiplied through. Explicitly forming an inverse is almost always a step taken because the mathematical notation writes it that way."
      },
      {
        stem: "A linear model's coefficients change sign between weekly refits while predictions stay accurate. What is the likely cause?",
        options: [
          "Overfitting",
          "Collinear features making the coefficients unidentifiable — the fit is fine, the parameters are not separable",
          "Too few training rows",
          "A bug in the optimiser"
        ],
        answer: 1,
        why: "Near-duplicate features make `XᵀX` ill-conditioned, so many coefficient vectors fit almost equally well and the solver picks between them arbitrarily. Check `cond(X.T @ X)` on standardised features, and demonstrate it by refitting on bootstrap samples — that persuades where a condition number does not."
      },
      {
        stem: "What do the two einsum rules say about `\"bhqd,bhkd->bhqk\"`?",
        options: [
          "It transposes the last two axes",
          "`d` appears in both inputs and not the output, so it is summed over; b, h, q and k are carried through",
          "It computes an outer product over all axes",
          "It requires square inputs"
        ],
        answer: 1,
        why: "A repeated letter absent from the output is contracted. This is the attention score computation: for each batch and head, every query against every key, summing over the feature dimension. The letters are the documentation, which is einsum's real advantage over transpose-and-matmul."
      },
      {
        stem: "You run PCA without centring the data first. What happens?",
        options: [
          "Nothing — SVD centres internally",
          "The first component points at the mean rather than the direction of greatest variance",
          "It raises an error",
          "The components come out in the wrong order"
        ],
        answer: 1,
        why: "SVD finds directions of greatest *magnitude*, not greatest variance. On uncentred data the offset from the origin dominates, so the leading component describes where the cloud sits rather than how it is shaped — and adding a constant to every feature would change the result."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between `A * B` and `A @ B`?",
        strong: "`*` multiplies corresponding elements with broadcasting; `@` is the matrix product, summing over the shared inner dimension. On two square matrices both succeed and produce the same shape, so writing one when you meant the other is silent — and `(n,1) * (1,m)` broadcasts into an outer product, which is the same class of failure.",
        answer: [
          { t: "p", text: "Naming the silence — same shape, no error — is what makes this more than a definition." },
          { t: "p", text: "Adding that `np.dot` diverges from `matmul` above two dimensions justifies preferring `@` as a habit." }
        ]
      },
      {
        level: "advanced",
        q: "A stakeholder is drawing conclusions from linear regression coefficients. What would you check first?",
        strong: "Whether the coefficients are identifiable. I would standardise the features, compute the condition number of the correlation matrix and per-feature VIFs, and then demonstrate it — refit on bootstrap resamples and show how often each coefficient changes sign. If predictions are stable while coefficients swing, the model is fine and the interpretation is not.",
        answer: [
          { t: "p", text: "Separating prediction quality from parameter identifiability is the substantive insight, and it is the thing stakeholders never distinguish." },
          { t: "p", text: "Offering the demonstration rather than the metric shows you have had to convince someone of this before." }
        ]
      },
      {
        level: "advanced",
        q: "When would you reach for einsum?",
        strong: "When the operation has no clean expression in matmul and transposes — batched contractions over specific axes, attention scores, weighted sums over a chosen dimension. The letters document what happened, which matters more than the speed. And I would always pass `optimize=True` for three or more operands, because without it the contraction order can be catastrophically bad.",
        answer: [
          { t: "p", text: "Leading with readability rather than performance is correct — einsum is often slower than a direct BLAS call for a plain matmul." },
          { t: "p", text: "The `optimize=True` detail is concrete, load-bearing, and something people discover the hard way." }
        ]
      }
    ]
  }
});

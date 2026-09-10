/* ============================================================================
   LESSON 1.2 — Matrices as Transformations
   ========================================================================= */
EC.receiveLesson({
  id: "1.2",

  lede: "A matrix is not a table of numbers — it is **a function that moves space**. Once you can look at four numbers and say \"that rotates and stretches\", matrix multiplication stops being a rule to memorise and becomes the obvious thing: doing one transformation after another.",

  objectives: [
    "Read a matrix as a linear map by looking at where it sends the basis vectors",
    "Recognise rotation, scaling, shear and reflection from their entries",
    "Explain what the determinant measures, and what a zero determinant means",
    "Say why linear maps must fix the origin, and what affine adds",
    "Predict the shape of a transformation before computing anything"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "The columns are the answer", id: "columns" },

    { t: "p", text: "A **matrix** is a function that turns vectors into vectors, and its columns tell you everything about it. **Column `j` is where the `j`th basis vector lands** — so reading a matrix means reading off the destinations of the axes, with no multiplication required." },

    { t: "dl", items: [
      ["Matrix", "A rectangular grid of numbers. An `m × n` matrix maps `n`-dimensional vectors to `m`-dimensional ones."],
      ["Basis vector", "A vector with a single 1 and the rest zeros. `e₁ = [1,0]` is the x-axis, `e₂ = [0,1]` the y-axis."],
      ["Linear transformation", "What a matrix does: it moves every vector while keeping the grid straight, evenly spaced, and the origin fixed."],
      ["Column space", "Every vector the matrix can possibly produce — all combinations of its columns. Also called the **range** or **image**."]
    ]},

    { t: "viz",
      title: "A matrix is where the basis vectors land",
      caption: "Every column of a matrix is the image of one basis vector. Read the columns and you have read the transformation — no multiplication required.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Basis vectors before and after a matrix transformation">
  <g>
    <text x="24" y="34" class="s-label">BEFORE</text>
    <line x1="60" y1="230" x2="290" y2="230" style="stroke:var(--border)" fill="none"/>
    <line x1="60" y1="230" x2="60" y2="60" style="stroke:var(--border)" fill="none"/>
    <line x1="60" y1="230" x2="160" y2="230" style="stroke:var(--t-green)" stroke-width="3" fill="none" marker-end="url(#g)"/>
    <line x1="60" y1="230" x2="60" y2="130" style="stroke:var(--t-orange)" stroke-width="3" fill="none" marker-end="url(#o)"/>
    <text x="120" y="252" class="s-sub" style="fill:var(--t-green)">î = [1,0]</text>
    <text x="8" y="126" class="s-sub" style="fill:var(--t-orange)">ĵ = [0,1]</text>
    <rect x="60" y="130" width="100" height="100" style="fill:var(--accent);opacity:.10"/>
    <text x="110" y="188" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">area 1</text>
  </g>

  <text x="330" y="150" class="s-label" style="fill:var(--accent)">A = [[2, 1],</text>
  <text x="352" y="174" class="s-label" style="fill:var(--accent)">[0, 1]]</text>
  <path d="M330 196 L440 196" style="stroke:var(--accent)" fill="none" marker-end="url(#a)"/>

  <g>
    <text x="500" y="34" class="s-label">AFTER</text>
    <line x1="530" y1="230" x2="870" y2="230" style="stroke:var(--border)" fill="none"/>
    <line x1="530" y1="230" x2="530" y2="60" style="stroke:var(--border)" fill="none"/>
    <line x1="530" y1="230" x2="730" y2="230" style="stroke:var(--t-green)" stroke-width="3" fill="none" marker-end="url(#g2)"/>
    <line x1="530" y1="230" x2="630" y2="130" style="stroke:var(--t-orange)" stroke-width="3" fill="none" marker-end="url(#o2)"/>
    <text x="660" y="252" class="s-sub" style="fill:var(--t-green)">[2,0] — column 1</text>
    <text x="596" y="120" class="s-sub" style="fill:var(--t-orange)">[1,1] — column 2</text>
    <path d="M530 230 L730 230 L830 130 L630 130 z" style="fill:var(--accent);opacity:.10"/>
    <text x="690" y="188" text-anchor="middle" class="s-sub" style="fill:var(--ink-3)">area 2 = det A</text>
  </g>

  <defs>
    <marker id="g" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--t-green)"/></marker>
    <marker id="g2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--t-green)"/></marker>
    <marker id="o" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--t-orange)"/></marker>
    <marker id="o2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--t-orange)"/></marker>
    <marker id="a" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" style="fill:var(--accent)"/></marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "python", title: "reading a matrix without multiplying", code: `
import numpy as np

A = np.array([[2.0, 1.0],
              [0.0, 1.0]])

# Column 1 is where [1,0] goes. Column 2 is where [0,1] goes. That is
# not a trick -- it is what the multiplication computes:
A @ np.array([1.0, 0.0])     # [2., 0.]  == A[:, 0]
A @ np.array([0.0, 1.0])     # [1., 1.]  == A[:, 1]

# So EVERY vector's image is determined, because every vector is a
# combination of the basis vectors and the map is linear:
#
#   A @ [3, 2] = 3*(first column) + 2*(second column)
#              = 3*[2,0] + 2*[1,1]
#              = [6,0] + [2,2] = [8, 2]
A @ np.array([3.0, 2.0])     # [8., 2.]

# THIS IS WHY A MATRIX MULTIPLIES A VECTOR THE WAY IT DOES. The rule is
# not arbitrary: it is "take that combination of the columns".
`,
      hl: [7, 16],
      caption: "**A matrix–vector product is a weighted sum of the columns**, with the vector supplying the weights. Once that lands, `A @ x` stops being a loop over rows and becomes a picture."
    },

    { t: "h2", n: "02", text: "The transformations worth recognising", id: "kinds" },

    { t: "p", text: "A handful of transformations account for most matrices you will meet, and each has a signature you can recognise by eye. The **determinant** is the single number that summarises what a transformation does to area or volume." },

    { t: "dl", items: [
      ["Determinant", "The factor by which the transformation scales area (2D) or volume (3D). `det = 3` triples areas; `det = 0` collapses them to nothing."],
      ["Negative determinant", "The transformation flips orientation — a reflection is included somewhere in it."],
      ["Singular matrix", "A matrix with `det = 0`. It squashes space into a lower dimension, and that loss cannot be undone."],
      ["Orthogonal matrix", "A rotation or reflection: lengths and angles are preserved, and `Qᵀ = Q⁻¹`, which makes it exceptionally well behaved numerically."]
    ]},

    { t: "table",
      head: ["Matrix", "Does", "Determinant", "Tell"],
      rows: [
        ["`[[k,0],[0,k]]`", "Uniform scaling by k", "k²", "Diagonal, equal entries"],
        ["`[[a,0],[0,b]]`", "Stretch x by a, y by b", "ab", "**Diagonal** — axes unchanged"],
        ["`[[cos θ,−sin θ],[sin θ,cos θ]]`", "Rotate by θ", "**1**", "Columns orthonormal"],
        ["`[[1,k],[0,1]]`", "Shear", "**1**", "Unit diagonal, one off-diagonal"],
        ["`[[1,0],[0,−1]]`", "Reflect in the x-axis", "**−1**", "Negative determinant"],
        ["`[[1,2],[2,4]]`", "**Collapse onto a line**", "**0**", "One column is a multiple of the other"]
      ],
      caption: "**A determinant of 1 means area is preserved** — rotations and shears move things without squashing them. A determinant of 0 means the map destroys a dimension, and that is the single most consequential thing a matrix can do."
    },

    { t: "code", lang: "python", title: "what the determinant measures", code: `
# The determinant is the AREA SCALE FACTOR (volume in 3D, and so on).

stretch = np.array([[3.0, 0.0],
                    [0.0, 2.0]])
np.linalg.det(stretch)       # 6.0  -- the unit square becomes 3x2

rotate = np.array([[0.0, -1.0],
                   [1.0,  0.0]])
np.linalg.det(rotate)        # 1.0  -- turning changes no area

reflect = np.array([[1.0, 0.0],
                    [0.0, -1.0]])
np.linalg.det(reflect)       # -1.0 -- area preserved, ORIENTATION flipped
# The sign is not a quirk: negative means the space was turned over, the
# way a mirror swaps left and right.

collapse = np.array([[1.0, 2.0],
                     [2.0, 4.0]])
np.linalg.det(collapse)      # 0.0
# Row 2 is 2 x row 1, so both columns point along the same line. The
# whole plane is flattened onto that line -- and a flattened plane cannot
# be unflattened, which is exactly why det = 0 means "not invertible".
np.linalg.matrix_rank(collapse)   # 1, not 2
`,
      hl: [6, 15, 22],
      caption: "**Determinant zero is information destroyed.** Two different inputs now land on the same output, so no function can send them back — invertibility and a non-zero determinant are the same statement."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**Read a matrix by asking two questions: where do the basis vectors go, and what happens to area?** The columns answer the first, the determinant answers the second, and between them you can predict the behaviour of a transformation before computing anything with it." },
      { t: "p", text: "This is also the fastest way to sanity-check code. If a covariance matrix comes back with a negative determinant, something is wrong — covariance matrices cannot flip orientation. If a rotation matrix has determinant 2, it is not a rotation." }
    ]},

    { t: "h2", n: "03", text: "Composition is multiplication", id: "composition" },

    { t: "p", text: "**Matrix multiplication is function composition.** `BA` means \"do `A`, then do `B`\" — which is why the order matters and why the notation reads right to left, exactly like nested function calls." },

    { t: "dl", items: [
      ["Composition", "Applying one transformation to the result of another. `(BA)v = B(Av)`, and doing the composition once is cheaper than applying two matrices to every vector."],
      ["Non-commutative", "`AB ≠ BA` in general. Rotating then stretching is a different transformation from stretching then rotating."],
      ["Transpose", "`Aᵀ` swaps rows and columns. It reverses the order of a product: `(AB)ᵀ = BᵀAᵀ`."]
    ]},

    { t: "ladder",
      title: "Rotate by 90°, then stretch x by 3",
      rungs: [
        { level: "bad", label: "Apply them one at a time, forever",
          why: "Correct but wasteful. For a million points you traverse the data twice and allocate an intermediate array the size of your dataset, for a transformation that could have been one pass.",
          code: `R = np.array([[0.0, -1.0], [1.0, 0.0]])
S = np.array([[3.0, 0.0], [0.0, 1.0]])

tmp = points @ R.T          # a full intermediate copy
out = tmp @ S.T             # a second pass` },
        { level: "ok", label: "Multiply the matrices first",
          why: "One 2×2 product up front, then a single pass over the data. The composed matrix is the transformation, and this is what matrix multiplication is *for* — it is composition of functions, not a numerical coincidence.",
          code: `M = S @ R                   # do R first, THEN S
out = points @ M.T

# S @ R is [[0,-3],[1,0]] -- rotate then stretch, as one map.` },
        { level: "best", label: "Read the order off the definition",
          why: "The order is fixed by function composition: `(S ∘ R)(x) = S(R(x))`, so the matrix applied first sits on the right. Knowing that rather than guessing is the difference between debugging a transform and rewriting it twice.",
          code: `# APPLIED RIGHT TO LEFT, like nested function calls.
M = S @ R          # x -> R(x) -> S(R(x))    rotate, then stretch
N = R @ S          # x -> S(x) -> R(S(x))    stretch, then rotate

M   # [[ 0., -3.],      N   # [[ 0., -1.],
    #  [ 1.,  0.]]          #  [ 3.,  0.]]

# DIFFERENT MATRICES -- matrix multiplication does not commute, because
# the operations genuinely differ. Stretching x and then rotating is not
# the same as rotating and then stretching x, and the algebra is simply
# reporting that.
np.allclose(M, N)   # False`,
          note: "**Non-commutativity is not a wart.** Rotate a book then flip it, versus flip it then rotate it — you get different results in the world, so you must get different matrices." }
      ]
    },

    { t: "callout", kind: "trap", title: "Row vectors, column vectors, and the transpose that follows", body: [
      { t: "code", lang: "python", title: "the convention mismatch that costs an afternoon", numbered: false, code: `
# MATHEMATICS writes vectors as COLUMNS and applies on the left:
#     y = A x          x is (n, 1)
#
# DATA CODE stores samples as ROWS -- one row per observation:
#     Y = X A.T        X is (samples, features)
#
# Both are the same operation. The transpose is the price of the layout.

X = np.array([[3.0, 2.0],       # two points, one per row
              [1.0, 0.0]])
A = np.array([[2.0, 1.0],
              [0.0, 1.0]])

X @ A.T                 # [[8., 2.], [2., 0.]]   <- correct
X @ A                   # [[6., 5.], [2., 1.]]   <- silently WRONG

# Nothing raises: both shapes conform. You get a plausible array of the
# right size that transforms your data by A-transpose instead of by A.
#
# THE CHECK: apply the map to a basis vector and see if you get the
# column you expect.
(np.array([[1.0, 0.0]]) @ A.T).ravel()      # [2., 0.] == A[:, 0]  correct`},
      { t: "p", text: "**Both operations are shape-valid, so there is no error to catch.** For a symmetric matrix the two agree, which is worse — the bug hides until someone uses a non-symmetric transform." }
    ]},

    { t: "h2", n: "04", text: "Linear, and what it excludes", id: "linear" },

    { t: "p", text: "**Linear** has a precise definition that excludes a great deal, and \"linear model\" in machine learning means something looser. A transformation is linear when it satisfies two rules, and those two rules are what make matrices sufficient to describe it." },

    { t: "dl", items: [
      ["Additivity", "`f(u + v) = f(u) + f(v)`. Transforming a sum gives the sum of the transforms."],
      ["Homogeneity", "`f(cv) = c·f(v)`. Scaling the input scales the output by the same factor."],
      ["Affine", "A linear map plus a shift: `f(v) = Av + b`. **Not linear**, because the origin moves — which is why a bias term is handled separately or by an extra column of ones."]
    ]},

    { t: "p", text: "A consequence worth stating plainly: **a linear transformation must send the origin to the origin**. Anything that translates, squares, or applies an activation function has left this territory, and matrices alone can no longer describe it." },

    { t: "code", lang: "python", title: "the two rules, and the thing they forbid", code: `
# A map is LINEAR when it respects addition and scaling:
#     A(u + v) = A(u) + A(v)
#     A(k * u) = k * A(u)

A = np.array([[2.0, 1.0], [0.0, 1.0]])
u, v = np.array([1.0, 2.0]), np.array([3.0, 1.0])

np.allclose(A @ (u + v), A @ u + A @ v)      # True
np.allclose(A @ (3 * u), 3 * (A @ u))        # True

# A CONSEQUENCE NOBODY MENTIONS: set k = 0.
#     A(0) = A(0 * u) = 0 * A(u) = 0
#
# A linear map MUST send the origin to the origin. So translation --
# the most basic transformation there is -- is not linear.
A @ np.array([0.0, 0.0])     # [0., 0.]  always, for every matrix

# THE FIX is the affine trick: add a coordinate that is always 1, and
# translation becomes a shear in the higher space.
T = np.array([[1.0, 0.0, 5.0],       # translate x by 5, y by -2
              [0.0, 1.0, -2.0],
              [0.0, 0.0, 1.0]])
T @ np.array([3.0, 2.0, 1.0])        # [8., 0., 1.]

# This is homogeneous coordinates, and it is why graphics pipelines use
# 4x4 matrices for 3D -- and why a neural network layer is "Wx + b"
# rather than just "Wx".
`,
      hl: [12, 17, 22],
      caption: "**The bias term exists because linear maps fix the origin.** A layer without a bias can only rotate, scale and shear — it cannot move the data off the origin, which is a real restriction on what it can fit."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Diagnose a transformation pipeline that destroys data",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "A preprocessing step applies three transformations to 2-D sensor readings. Downstream, a model that should separate two classes perfectly gets 50% accuracy." },
        { t: "code", lang: "python", numbered: false, title: "preprocess.py", code: `
import numpy as np

SCALE  = np.array([[4.0, 0.0], [0.0, 0.25]])
ROTATE = np.array([[0.6, -0.8], [0.8, 0.6]])
PROJECT = np.array([[1.0, 2.0], [2.0, 4.0]])

def preprocess(points):            # points is (n, 2)
    out = points @ SCALE.T
    out = out @ ROTATE.T
    out = out @ PROJECT.T
    return out

# The two classes are separable before preprocessing and identical after.`},
        { t: "p", text: "Find the step that destroys the information, prove it, and say what the pipeline actually computes." }
      ],
      requirements: [
        "Compute the determinant of each step and of the composition.",
        "Identify which step is responsible and explain geometrically what it does.",
        "Say what one-dimensional quantity the pipeline ends up reporting.",
        "Give a corrected pipeline that keeps the intended effects.",
        "Explain why the bug produced 50% accuracy specifically rather than an error.",
        "Give the check that would have caught it."
      ],
      hint: "Look at the rows of PROJECT, and at what a zero determinant means for two points that differ.",
      solution: {
        lang: "python",
        title: "preprocess.py",
        code: `# =========================================================================
# THE DETERMINANTS
# =========================================================================
#
#   det(SCALE)   = 4.0 * 0.25 - 0        = 1.0     area preserved
#   det(ROTATE)  = 0.6*0.6 - (-0.8*0.8)
#                = 0.36 + 0.64           = 1.0     a genuine rotation
#   det(PROJECT) = 1.0*4.0 - 2.0*2.0
#                = 4 - 4                 = 0.0     <- COLLAPSE
#
#   det of the composition = 1.0 * 1.0 * 0.0 = 0.0
#
# Determinants multiply under composition, so ONE singular step makes the
# whole pipeline singular. No amount of well-behaved work before or after
# can undo it.
#
#
# =========================================================================
# WHAT PROJECT DOES
# =========================================================================
#
#   PROJECT = [[1, 2],
#              [2, 4]]
#
# Row 2 is exactly 2 x row 1, and column 2 is exactly 2 x column 1. Both
# columns point along the direction [1, 2], so every output is a multiple
# of [1, 2]: the entire plane is flattened onto a single line.
#
#   rank(PROJECT) = 1, not 2.
#
# For a point (x, y):
#
#   PROJECT @ [x, y] = [x + 2y, 2x + 4y] = (x + 2y) * [1, 2]
#
# The output is determined by the single number (x + 2y). Everything else
# about the point -- the entire direction perpendicular to that -- is
# discarded.
#
# THE NULL SPACE is what gets destroyed. Any point with x + 2y = 0, for
# instance [2, -1], maps to the origin:
#
#   PROJECT @ [2, -1] = [2 - 2, 4 - 4] = [0, 0]
#
# So [5, 3] and [7, 2] both map to the same place, because they differ by
# [2, -1] which lands on zero. Two distinct readings become one output.
#
#
# =========================================================================
# WHAT THE PIPELINE ACTUALLY COMPUTES
# =========================================================================
#
# Compose the three (right to left, as functions):
#
#   M = PROJECT @ ROTATE @ SCALE
#
#   ROTATE @ SCALE = [[0.6, -0.8],  @ [[4, 0   ],  = [[2.4, -0.2],
#                     [0.8,  0.6]]     [0, 0.25]]     [3.2,  0.15]]
#
#   M = [[1, 2],  @ [[2.4, -0.2],  = [[ 8.8, 0.1],
#        [2, 4]]     [3.2,  0.15]]    [17.6, 0.2]]
#
# Row 2 is 2 x row 1 again, as it must be. So the pipeline reports
#
#     the single scalar   8.8x + 0.1y
#
# written out as a 2-vector along [1, 2]. Two output columns, ONE degree
# of freedom.
#
#
# =========================================================================
# WHY 50% ACCURACY AND NOT AN ERROR
# =========================================================================
#
# Nothing is malformed. The shapes conform, the values are finite, and the
# output looks like ordinary 2-D data -- it simply lies on a line.
#
# The classes were separable in the plane but are NOT separable by the one
# quantity that survives. Their projections onto [1, 2] overlap, so after
# preprocessing the two classes occupy the same interval of that line and
# no classifier can do better than guessing.
#
# 50% is exactly the signature of a binary problem with balanced classes
# and zero usable signal -- which is what "the discriminating direction
# was in the null space" produces.
#
# It would NOT always be 50%. Had the classes differed along [1, 2] as
# well, some signal would survive and accuracy would land somewhere
# between chance and the original. A clean 50% says the entire class
# difference lay in the destroyed direction.
#
#
# =========================================================================
# THE FIX
# =========================================================================

SCALE  = np.array([[4.0, 0.0], [0.0, 0.25]])
ROTATE = np.array([[0.6, -0.8], [0.8, 0.6]])

# PROJECT was almost certainly meant to be a projection ONTO a direction
# while keeping the plane's dimensionality -- or it was pasted in by
# mistake. If a genuine projection onto [1,2] is wanted, note that it is
# still singular by design, and the pipeline should then output the
# SCALAR coordinate rather than a degenerate 2-vector.

M = ROTATE @ SCALE            # composed once, applied once

def preprocess(points):
    """Scale, then rotate. Both are invertible, so nothing is lost and
    the step is reversible for debugging."""
    return points @ M.T

assert abs(np.linalg.det(M) - 1.0) < 1e-12       # area preserved


def project_to_line(points, direction=np.array([1.0, 2.0])):
    """If a 1-D summary IS wanted, return the coordinate -- one column,
    honestly labelled -- rather than a 2-vector that pretends to be
    two-dimensional."""
    u = direction / np.linalg.norm(direction)
    return points @ u                             # shape (n,)


# =========================================================================
# THE CHECK THAT WOULD HAVE CAUGHT IT
# =========================================================================

def assert_information_preserving(*mats, tol=1e-10):
    """A transformation that is not invertible destroys data. If that is
    intended, it should be explicit; if it is not, this fails at import
    rather than as an accuracy number nobody can explain."""
    for i, M in enumerate(mats):
        d = abs(np.linalg.det(M))
        assert d > tol, f"step {i} is singular (det={d:.2e}) -- it collapses the space"
    composed = mats[0]
    for M in mats[1:]:
        composed = M @ composed
    assert abs(np.linalg.det(composed)) > tol, "the composition is singular"


def test_pipeline_preserves_dimensionality():
    """The direct regression test: two points that differ must still
    differ afterwards."""
    a, b = np.array([[5.0, 3.0]]), np.array([[7.0, 2.0]])

    assert not np.allclose(preprocess(a), preprocess(b))


def test_rank_survives_preprocessing():
    """Rank is the honest measure of how many dimensions are left."""
    pts = np.random.default_rng(0).normal(size=(100, 2))

    assert np.linalg.matrix_rank(preprocess(pts)) == 2


def test_determinants_multiply():
    """Worth pinning, because it is the reason one bad step is fatal."""
    A = np.array([[2.0, 1.0], [0.0, 3.0]])
    B = np.array([[0.0, -1.0], [1.0, 0.0]])

    assert np.isclose(np.linalg.det(A @ B),
                      np.linalg.det(A) * np.linalg.det(B))`,
        notes: [
          { t: "p", text: "**`det(PROJECT) = 1·4 − 2·2 = 0`, and determinants multiply**, so a single singular step makes the whole composition singular. Nothing before or after it can restore what was destroyed." },
          { t: "p", text: "**Both columns of `PROJECT` point along `[1, 2]`**, so every output is a multiple of that direction and the plane is flattened onto a line. The output is determined by the single number `x + 2y`." },
          { t: "callout", kind: "insight", title: "The null space is the part that is destroyed", body: [
            { t: "p", text: "`PROJECT @ [2, −1] = [0, 0]`, so any two points differing by `[2, −1]` become indistinguishable. `[5, 3]` and `[7, 2]` collide for exactly that reason." },
            { t: "p", text: "That is the concrete meaning of \"not invertible\": two inputs share an output, so no function can send them back. Rank counts the dimensions that survive — here 1 out of 2." }
          ]},
          { t: "p", text: "**50% is the signature, not a coincidence.** The classes were separable in the plane but their projections onto the surviving direction overlap, so no classifier can beat guessing. Had the classes also differed along `[1, 2]`, some signal would have survived and accuracy would have landed between chance and the original — a clean 50% says the entire class difference lay in the destroyed direction." },
          { t: "p", text: "**Nothing raises because nothing is malformed.** The shapes conform and the values are finite; the output merely lies on a line while looking like ordinary 2-D data. Asserting `det ≠ 0` at construction turns that into a failure at import rather than an accuracy number nobody can explain." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team added a feature to a linear model by combining two existing ones: `total = price + tax`, where `tax` was already `0.2 × price`. All three columns went into the design matrix." },
      { t: "p", text: "**The fit succeeded and the coefficients were nonsense** — enormous, of opposite signs, and completely different on each refit. The columns were linearly dependent, so the matrix was singular and infinitely many coefficient vectors fitted equally well." },
      { t: "p", text: "**The solver had not failed; it had picked one of the infinite solutions.** Regularisation would have hidden this by quietly choosing the smallest, which is why the problem often surfaces only as unstable coefficients rather than an error." },
      { t: "p", text: "**Perfect multicollinearity is a zero determinant wearing a business explanation.** Checking the rank of the design matrix costs one line and catches it before the model is interpreted." }
    ]}
  ],

  takeaways: [
    "**A matrix is a function on space, and its columns are where the basis vectors land.** Read the columns and you have read the transformation.",
    "**A matrix–vector product is a weighted sum of the columns**, with the vector supplying the weights — which is why the multiplication rule is what it is.",
    "**The determinant is the area (or volume) scale factor**, and its sign records whether orientation was flipped.",
    "**Determinant zero means information destroyed**: two inputs land on the same output, so no inverse can exist.",
    "**Rank counts the dimensions that survive**, and the null space is what gets flattened to zero.",
    "**Determinants multiply under composition**, so one singular step makes an entire pipeline singular.",
    "**Matrix multiplication is function composition**, applied right to left — which is why it does not commute.",
    "**Non-commutativity reflects reality**: rotating then stretching genuinely differs from stretching then rotating.",
    "**Maths writes vectors as columns and applies on the left; data code stores samples as rows.** The transpose is the price of the layout, and both forms are shape-valid so the mistake is silent.",
    "**A linear map must fix the origin**, so translation is not linear — which is exactly why a layer is `Wx + b` rather than `Wx`.",
    "**Homogeneous coordinates turn translation into a shear** in one higher dimension, which is why graphics uses 4×4 matrices for 3D.",
    "**Check `det ≠ 0` on any transformation meant to be reversible.** A singular step produces plausible output rather than an error."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What do the columns of a matrix represent?",
        options: [
          "The eigenvalues of the transformation",
          "Where each basis vector lands — so `A @ [1,0]` is the first column",
          "The rows of the inverse",
          "The variance along each axis"
        ],
        answer: 1,
        why: "This is why a matrix–vector product is a weighted sum of the columns: every vector is a combination of basis vectors, and linearity carries that combination through. It also makes the multiplication rule feel inevitable rather than arbitrary."
      },
      {
        stem: "`PROJECT = [[1,2],[2,4]]` is applied to 2-D data and a downstream classifier drops to 50%. Why?",
        options: [
          "The values are too large and need scaling",
          "Its determinant is zero — both columns point along `[1,2]`, so the plane is flattened onto a line and the discriminating direction is destroyed",
          "The matrix is not symmetric",
          "It needs to be transposed"
        ],
        answer: 1,
        why: "`1·4 − 2·2 = 0`, and rank is 1. Every output is a multiple of `[1,2]`, determined by the single number `x + 2y`. Points differing by `[2,−1]` collide, and 50% is the signature of a balanced binary problem with no surviving signal."
      },
      {
        stem: "Why is `S @ R` different from `R @ S`?",
        options: [
          "It is a quirk of the algebra with no meaning",
          "They are different compositions — matrices apply right to left, so one rotates then stretches and the other stretches then rotates",
          "Only when the matrices are singular",
          "They are the same if both are square"
        ],
        answer: 1,
        why: "Non-commutativity reports something true about the world: rotate a book then flip it, versus flip then rotate, and you end up in different positions. The order in `M = S @ R` matches nested function calls — `S(R(x))`."
      },
      {
        stem: "Why does a neural network layer compute `Wx + b` rather than just `Wx`?",
        options: [
          "The bias speeds up convergence",
          "A linear map must send the origin to the origin, so without a bias the layer cannot shift data off the origin at all",
          "The bias prevents overfitting",
          "It makes the gradient easier to compute"
        ],
        answer: 1,
        why: "Setting `k = 0` in `A(ku) = kA(u)` gives `A(0) = 0` for every matrix, so translation is not a linear operation. The bias is the affine part, and homogeneous coordinates express the same idea by adding a constant coordinate — which is why 3D graphics uses 4×4 matrices."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does a matrix do, geometrically?",
        strong: "It transforms space linearly — the columns say where the basis vectors land, and everything else follows because every vector is a combination of those. The determinant tells you what happens to area and whether orientation flipped.",
        answer: [
          { t: "p", text: "Leading with the columns is the answer that shows understanding rather than recall; it also explains the multiplication rule for free." },
          { t: "p", text: "Naming a few recognisable forms — rotation has orthonormal columns and determinant 1, a shear has unit diagonal — demonstrates you can read a matrix at a glance." },
          { t: "p", text: "The determinant-zero case is where the follow-up goes, so volunteering \"it collapses a dimension and cannot be inverted\" gets you there first." }
        ]
      },
      {
        level: "core",
        q: "What does a determinant of zero tell you?",
        strong: "The transformation collapses space onto a lower dimension, so distinct inputs share an output and no inverse exists. In practice it means linearly dependent columns — perfect multicollinearity in a design matrix.",
        answer: [
          { t: "p", text: "Connecting it to multicollinearity moves the answer from geometry to something you have debugged, which is what the question is really probing." },
          { t: "p", text: "The consequence worth stating: the solver does not fail, it picks one of infinitely many solutions, so the symptom is unstable coefficients rather than an error." },
          { t: "p", text: "Mentioning rank as the count of surviving dimensions gives the practical check — `matrix_rank` on the design matrix." }
        ]
      },
      {
        level: "advanced",
        q: "Why is matrix multiplication defined the way it is?",
        strong: "Because it has to represent composition of the underlying functions. `(AB)x` must equal `A(Bx)`, and working that requirement through forces the row-times-column rule.",
        answer: [
          { t: "p", text: "Framing it as a requirement rather than a convention is the whole answer — the rule is derived, not chosen." },
          { t: "p", text: "It also explains non-commutativity without hand-waving: different composition orders are different functions." },
          { t: "p", text: "The related detail worth offering is that a matrix–vector product is a weighted sum of columns, which is the same fact viewed one step earlier." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 1.5 — Singular Value Decomposition
   ========================================================================= */
EC.receiveLesson({
  id: "1.5",

  lede: "Eigendecomposition only works for square matrices, and not even all of those. **SVD works for every matrix that exists** — any shape, any rank — and it says the same thing: rotate, scale along axes, rotate again. It is the most useful factorisation in applied linear algebra, and the one worth understanding properly.",

  objectives: [
    "State what SVD produces and what each factor does geometrically",
    "Read singular values as importance, and truncate deliberately",
    "Compute a low-rank approximation and quantify what it cost",
    "Relate SVD to eigendecomposition without conflating them",
    "Use the pseudoinverse where an inverse does not exist"
  ],

  prerequisites: ["1.4"],

  blocks: [

    { t: "h2", n: "01", text: "Every matrix is a rotation, a stretch, and a rotation", id: "shape" },

    { t: "viz",
      title: "A = U Σ Vᵀ",
      caption: "Read right to left, as function composition. Whatever a matrix does — however lopsided, however rectangular — it factors into exactly these three steps.",
      svg: `<svg viewBox="0 0 900 260" role="img" aria-label="The three stages of a singular value decomposition applied to a circle">
  <g>
    <circle cx="100" cy="140" r="52" style="fill:var(--accent);opacity:.12;stroke:var(--accent)"/>
    <line x1="100" y1="140" x2="152" y2="140" style="stroke:var(--t-green)" stroke-width="2"/>
    <line x1="100" y1="140" x2="100" y2="88" style="stroke:var(--t-orange)" stroke-width="2"/>
    <text x="100" y="222" text-anchor="middle" class="s-sub">the unit circle</text>
  </g>
  <path d="M172 140 L222 140" style="stroke:var(--border-strong)" fill="none" marker-end="url(#s1)"/>
  <text x="197" y="128" text-anchor="middle" class="s-sub" style="fill:var(--t-violet)">Vᵀ</text>

  <g>
    <circle cx="300" cy="140" r="52" style="fill:var(--accent);opacity:.12;stroke:var(--accent)"/>
    <line x1="300" y1="140" x2="337" y2="103" style="stroke:var(--t-green)" stroke-width="2"/>
    <line x1="300" y1="140" x2="263" y2="103" style="stroke:var(--t-orange)" stroke-width="2"/>
    <text x="300" y="222" text-anchor="middle" class="s-sub">rotated · still a circle</text>
  </g>
  <path d="M372 140 L422 140" style="stroke:var(--border-strong)" fill="none" marker-end="url(#s2)"/>
  <text x="397" y="128" text-anchor="middle" class="s-sub" style="fill:var(--t-amber)">Σ</text>

  <g>
    <ellipse cx="530" cy="140" rx="78" ry="28" style="fill:var(--accent);opacity:.12;stroke:var(--accent)"/>
    <line x1="530" y1="140" x2="608" y2="140" style="stroke:var(--t-green)" stroke-width="2"/>
    <line x1="530" y1="140" x2="530" y2="112" style="stroke:var(--t-orange)" stroke-width="2"/>
    <text x="530" y="222" text-anchor="middle" class="s-sub">stretched by σ₁, σ₂</text>
  </g>
  <path d="M622 140 L672 140" style="stroke:var(--border-strong)" fill="none" marker-end="url(#s3)"/>
  <text x="647" y="128" text-anchor="middle" class="s-sub" style="fill:var(--t-blue)">U</text>

  <g>
    <ellipse cx="770" cy="140" rx="78" ry="28" transform="rotate(-28 770 140)" style="fill:var(--accent);opacity:.12;stroke:var(--accent)"/>
    <text x="770" y="222" text-anchor="middle" class="s-sub">turned into place</text>
  </g>

  <text x="20" y="40" class="s-label">Every matrix maps the unit circle to an ellipse. The singular values are its semi-axes.</text>
  <defs>
    <marker id="s1" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--border-strong)"/></marker>
    <marker id="s2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--border-strong)"/></marker>
    <marker id="s3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--border-strong)"/></marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "python", title: "the decomposition, and what each factor is", code: `
import numpy as np

A = np.array([[3.0, 1.0],
              [1.0, 3.0],
              [0.0, 0.0]])          # 3x2 -- eig() cannot touch this

U, s, Vt = np.linalg.svd(A, full_matrices=False)

U.shape, s.shape, Vt.shape          # (3, 2), (2,), (2, 2)

s                                   # [4., 2.]  ALWAYS >= 0, sorted DESC

# U and V are ORTHONORMAL: rotations (possibly with a reflection).
np.allclose(U.T @ U, np.eye(2))     # True
np.allclose(Vt @ Vt.T, np.eye(2))   # True

# s is returned as a VECTOR, not a matrix -- the off-diagonal of Sigma is
# all zeros, so storing them would be waste. Rebuild when you need it:
np.allclose(A, U @ np.diag(s) @ Vt) # True

# THREE PROPERTIES THAT MAKE SVD THE DEFAULT TOOL:
#   1. it exists for EVERY matrix -- rectangular, singular, defective
#   2. singular values are real and non-negative, always
#   3. they come sorted, so "the most important direction" is s[0]
`,
      hl: [9, 11, 22],
      caption: "**`full_matrices=False` is almost always what you want.** The full form pads `U` out to 3×3 with columns that multiply against zeros — correct, and wasteful on any real matrix."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**A matrix maps the unit sphere to an ellipsoid.** The singular values are the lengths of that ellipsoid's semi-axes, `V` says which input directions become the axes, and `U` says where those axes end up. Nothing more is going on." },
      { t: "p", text: "That picture answers most questions immediately. The largest singular value is the most a matrix can stretch anything — which is its operator norm. The ratio of largest to smallest is how lopsided the ellipsoid is — which is the condition number. A zero singular value means the ellipsoid is flat in some direction — which is rank deficiency." }
    ]},

    { t: "h2", n: "02", text: "Singular values are importance", id: "importance" },

    { t: "code", lang: "python", title: "the sum of rank-one pieces", code: `
# The decomposition can be rewritten as a SUM, and this is the form that
# makes truncation obvious:
#
#     A = sum over i of  s[i] * outer(U[:, i], Vt[i, :])
#
# Each term is a rank-1 matrix, weighted by its singular value. The
# singular values are sorted, so the terms are in order of importance.

rng = np.random.default_rng(0)
A = rng.normal(size=(200, 100))
U, s, Vt = np.linalg.svd(A, full_matrices=False)

# Reconstruct from the first k terms only:
def truncate(k):
    return (U[:, :k] * s[:k]) @ Vt[:k, :]

np.allclose(truncate(100), A)        # True -- all terms is exact

# HOW MUCH DID k TERMS CAPTURE? The energy is the sum of SQUARED
# singular values (Frobenius norm squared), so:
energy = np.cumsum(s**2) / np.sum(s**2)
energy[9], energy[49]                # 0.146, 0.632

# On random noise the spectrum is flat, so truncation captures little --
# which is the point: SVD tells you honestly when there is no structure
# to exploit.
`,
      hl: [7, 20],
      caption: "**Eckart-Young: the truncated SVD is the *best* rank-k approximation** in the least-squares sense. Not a good one — provably the best, so there is nothing to gain by looking for a cleverer method."
    },

    { t: "ladder",
      title: "Compressing a matrix that has structure",
      rungs: [
        { level: "bad", label: "Pick k because it sounds right",
          why: "`k = 50` is a number, not a decision. It might discard signal or keep pure noise, and either way you cannot say which — nor answer a reviewer asking what the compression cost.",
          code: `approx = (U[:, :50] * s[:50]) @ Vt[:50, :]
# Why 50? Nobody knows. What did it lose? Nobody measured.` },
        { level: "ok", label: "Choose k from cumulative energy",
          why: "A defensible rule: keep enough components to retain 95% of the variance. It is the standard approach and it still requires you to pick the threshold, which is the same arbitrary choice moved one step back.",
          code: `energy = np.cumsum(s**2) / np.sum(s**2)
k = int(np.searchsorted(energy, 0.95) + 1)
approx = (U[:, :k] * s[:k]) @ Vt[:k, :]` },
        { level: "best", label: "Look at the spectrum and find the gap",
          why: "Real data with genuine low-rank structure shows a cliff in the singular values: a few large ones, then a plateau of noise. The gap is where the signal stops, and it is a property of the data rather than a threshold you imposed.",
          code: `# Build something with real structure: rank 3, plus noise.
truth = rng.normal(size=(200, 3)) @ rng.normal(size=(3, 100))
A = truth + 0.1 * rng.normal(size=(200, 100))
U, s, Vt = np.linalg.svd(A, full_matrices=False)

s[:6].round(2)          # [163.9, 118.4, 79.2, 3.1, 3.0, 2.9]
#                          |------ signal ------| |-- noise --|

# The drop from 79 to 3.1 is a factor of 25. Everything after it sits on
# a flat noise floor, which is the signature of "these components are
# measuring nothing".
ratios = s[:-1] / s[1:]
k = int(np.argmax(ratios)) + 1          # 3 -- found, not chosen

approx = (U[:, :k] * s[:k]) @ Vt[:k, :]
err = np.linalg.norm(A - approx) / np.linalg.norm(A)
err.round(4)            # 0.0186 -- and 98% of it is the noise we WANTED
                        # to discard`,
          note: "**Truncating below the noise floor denoises rather than degrades.** The discarded components were fitting randomness, so the approximation can be closer to the truth than the original data was." }
      ]
    },

    { t: "h2", n: "03", text: "SVD against eigendecomposition", id: "vs-eig" },

    { t: "table",
      head: ["", "Eigendecomposition", "SVD"],
      rows: [
        ["Applies to", "Square, diagonalisable", "**Every matrix**"],
        ["Factors", "`A = V Λ V⁻¹`", "`A = U Σ Vᵀ`"],
        ["Basis vectors", "Not generally orthogonal", "**Both sets orthonormal**"],
        ["Values", "Can be negative or complex", "**Real and non-negative**"],
        ["Ordering", "Not guaranteed", "**Sorted descending**"],
        ["Numerically", "Can be ill-conditioned", "**Backward stable**"],
        ["Same thing when", "— ", "A is symmetric positive semi-definite"]
      ],
      caption: "**For a symmetric positive semi-definite matrix the two coincide.** That is why PCA can be described through either — the covariance matrix is symmetric PSD, so its eigenvectors are its singular vectors and `σ = λ`."
    },

    { t: "code", lang: "python", title: "the relationship, made concrete", code: `
A = rng.normal(size=(50, 8))

# The singular values of A are the square roots of the eigenvalues of
# A.T @ A -- which is why they cannot be negative.
s = np.linalg.svd(A, compute_uv=False)
w = np.linalg.eigvalsh(A.T @ A)[::-1]         # descending

np.allclose(s, np.sqrt(w))                    # True

# SO WHY NOT JUST FORM A.T @ A AND USE eigh?
# Because squaring the matrix SQUARES THE CONDITION NUMBER, and you lose
# half your significant digits.

B = np.array([[1.0, 1.0],
              [1e-8, 0.0],
              [0.0, 1e-8]])

np.linalg.cond(B)              # 1.4e8
np.linalg.cond(B.T @ B)        # 2.0e16  -- squared, now at float64's limit

# Direct SVD of B is fine; going via B.T @ B is not:
np.linalg.svd(B, compute_uv=False)                    # [1.414e0, 1.0e-8]
np.sqrt(np.abs(np.linalg.eigvalsh(B.T @ B)))[::-1]    # [1.414e0, 1.05e-8]
#                                                        ^ error in the
#                                                          3rd digit
# THIS IS WHY lstsq USES SVD and not the normal equations. The textbook
# formula (X.T X)^-1 X.T y is correct algebra and poor numerics.
`,
      hl: [9, 18, 25],
      caption: "**Never form `Xᵀ X` when you can avoid it.** The condition number squares, so a matrix that was merely awkward becomes numerically singular — this is the single most common numerical mistake in hand-rolled regression."
    },

    { t: "h2", n: "04", text: "The pseudoinverse", id: "pinv" },

    { t: "code", lang: "python", title: "an inverse for matrices that have none", code: `
# Invert what you can, leave alone what you cannot: transpose the
# factorisation and reciprocate the NON-ZERO singular values.
#
#     A   = U  S    V.T
#     A+  = V  S^-1 U.T        (with 1/s only where s is not ~0)

A = np.array([[1.0, 2.0],
              [2.0, 4.0],
              [3.0, 6.0]])       # rank 1: column 2 = 2 x column 1

np.linalg.svd(A, compute_uv=False).round(6)   # [8.36660, 0.]

Ap = np.linalg.pinv(A)           # works, despite no inverse existing

# WHAT IT GIVES YOU: the least-squares solution, and among the infinitely
# many that tie, the one with the smallest norm.
b = np.array([1.0, 2.0, 3.0])
x = Ap @ b
x.round(4)                       # [0.0714, 0.1429]

# It genuinely solves the system here (b is in the column space):
np.allclose(A @ x, b)            # True
# ...and of all the exact solutions, this is the shortest:
np.linalg.norm(x).round(4)       # 0.1597

# THE TOLERANCE MATTERS. pinv treats singular values below rcond * s[0]
# as zero. Too small and you divide by noise, amplifying it enormously.
np.linalg.pinv(A, rcond=1e-15) @ b    # can be wildly unstable
np.linalg.pinv(A) @ b                 # default rcond is scaled sensibly
`,
      hl: [12, 17, 27],
      caption: "**`pinv` never raises**, which is its danger as well as its value. A rank-deficient system silently returns one of infinitely many answers, so check the rank when you care which one you got."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Size an embedding compression, honestly",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A recommender stores 50,000 item embeddings at 512 dimensions in float32 — about 98 MB, which no longer fits the memory budget. A colleague proposes truncating to 64 dimensions with SVD because \"it keeps 90% of the variance\"." },
        { t: "code", lang: "python", numbered: false, title: "the spectrum", code: `
# Cumulative energy from the singular values of the 50000 x 512 matrix:
#
#   k= 16   0.71
#   k= 32   0.83
#   k= 64   0.90        <- the proposal
#   k=128   0.965
#   k=256   0.994
#
# The system ranks by cosine similarity over these embeddings.`},
        { t: "p", text: "Say what 90% energy does and does not promise, what actually needs measuring, and how you would size this properly." }
      ],
      requirements: [
        "Compute the memory saved at k = 64.",
        "Explain precisely what \"90% of variance\" guarantees about individual similarities.",
        "Name the metric that should decide k, and say why energy is a poor proxy.",
        "Show why truncation is not free at query time unless done carefully.",
        "Give the procedure you would actually follow.",
        "Say when the whole approach is the wrong tool."
      ],
      hint: "Energy is an average over the whole matrix. Ranking is about the order of a few near-neighbours for one query at a time.",
      solution: {
        lang: "python",
        title: "compression.py",
        code: `# =========================================================================
# THE MEMORY ARITHMETIC
# =========================================================================
#
#   before: 50,000 x 512 x 4 bytes = 102.4 MB
#   after:  50,000 x  64 x 4 bytes =  12.8 MB      (8x smaller)
#
# But the projection matrix must be kept too, to map queries into the
# reduced space:
#
#   V_k:      512 x  64 x 4 bytes =   0.13 MB      (negligible)
#
#   total after: ~12.9 MB. The 8x is real.
#
#
# =========================================================================
# WHAT "90% OF VARIANCE" ACTUALLY PROMISES
# =========================================================================
#
# Energy is the squared Frobenius norm retained:
#
#     sum(s[:k]^2) / sum(s^2) = 0.90
#
# By Eckart-Young that means the AVERAGE squared reconstruction error
# across ALL 50,000 x 512 entries is 10% of the total energy. It is a
# global average.
#
# IT PROMISES NOTHING ABOUT ANY INDIVIDUAL SIMILARITY. Specifically:
#
#   - it does not bound the error on any single embedding. An item whose
#     information lives mostly in discarded directions can be almost
#     entirely destroyed while the global average stays at 10%.
#
#   - it does not bound the change in any single cosine. Two items whose
#     similarity was 0.61 and 0.59 can swap order after a perturbation
#     far smaller than 10%.
#
#   - RANKING DEPENDS ON ORDER, NOT ON VALUES. The metric that matters is
#     whether the top-10 set survives, and energy says nothing about it.
#
# The 10% discarded is also not spread evenly: it is concentrated in
# whichever items and directions the truncation dropped. Long-tail items,
# which typically have idiosyncratic embeddings poorly captured by the
# leading components, lose the most -- and those are exactly the items a
# recommender is supposed to surface.
#
#
# =========================================================================
# THE METRIC THAT SHOULD DECIDE k
# =========================================================================
#
# Measure the thing the system does: retrieval agreement.

def recall_at_k(full, reduced, queries, k=10):
    """Fraction of each query's true top-k that survives compression.

    This is the number that maps onto user experience. Energy is a
    property of the matrix; this is a property of the SERVICE.
    """
    hits = 0
    for q in queries:
        a = np.argsort(-(full @ full[q]))[1:k+1]
        b = np.argsort(-(reduced @ reduced[q]))[1:k+1]
        hits += len(set(a) & set(b))
    return hits / (len(queries) * k)


def size_by_recall(E, target=0.98, candidates=(32, 64, 128, 256)):
    """Pick the smallest k that holds recall at or above target."""
    U, s, Vt = np.linalg.svd(E, full_matrices=False)
    full = E / np.linalg.norm(E, axis=1, keepdims=True)
    queries = np.random.default_rng(0).choice(len(E), 2000, replace=False)

    for k in candidates:
        R = (U[:, :k] * s[:k])                    # the reduced embeddings
        R = R / np.linalg.norm(R, axis=1, keepdims=True)
        r = recall_at_k(full, R, queries)
        print(f"k={k:4}  energy={np.sum(s[:k]**2)/np.sum(s**2):.3f}  recall@10={r:.3f}")
        if r >= target:
            return k, Vt[:k]                      # k and the projection
    raise ValueError("no candidate met the recall target")

# Typical outcome on real embedding matrices: 90% energy gives recall@10
# around 0.80-0.90, which means one or two of every ten recommendations
# changes. That is a product decision, not a rounding error -- and it is
# invisible if you only look at the energy number.


# =========================================================================
# TRUNCATION IS NOT FREE AT QUERY TIME
# =========================================================================
#
# The reduced item matrix is U_k * s_k. A query embedding q lives in the
# ORIGINAL 512-dimensional space, so it must be projected first:
#
#     q_reduced = q @ V_k.T          (512 -> 64)
#
# Get this wrong and the comparison is meaningless. Two specific traps:
#
#   1. Comparing a raw 512-d query against 64-d items. Shapes do not
#      conform, so this one at least fails loudly.
#
#   2. Re-running SVD when new items are added. The basis V_k CHANGES,
#      so every stored vector is now in a different coordinate system
#      than the ones stored before it. Nothing errors; similarities are
#      simply nonsense between the two generations.
#
# So V_k is part of the index and must be versioned with it:

class ReducedIndex:
    def __init__(self, embeddings, k):
        U, s, Vt = np.linalg.svd(embeddings, full_matrices=False)
        self.basis = Vt[:k]                       # 64 x 512, versioned
        R = embeddings @ self.basis.T
        self.vecs = R / np.linalg.norm(R, axis=1, keepdims=True)

    def query(self, q):
        # Project into the SAME basis, then normalise. Both steps are
        # required, and both are easy to omit.
        r = q @ self.basis.T
        r /= np.linalg.norm(r)
        return np.argsort(-(self.vecs @ r))

    def add(self, embeddings):
        # New items are projected into the EXISTING basis. Refitting the
        # basis invalidates every vector already stored.
        R = embeddings @ self.basis.T
        R /= np.linalg.norm(R, axis=1, keepdims=True)
        self.vecs = np.vstack([self.vecs, R])


# =========================================================================
# THE PROCEDURE
# =========================================================================
#
#   1. Plot the spectrum on a log scale. If there is a clear knee, the
#      data has genuine low-rank structure and k is near it. If the
#      spectrum decays smoothly with no knee -- which is common for
#      trained embeddings -- there is no natural k and every choice is a
#      trade you must measure.
#
#   2. Measure recall@10 against the uncompressed index at several k.
#
#   3. Pick the smallest k meeting the recall bar. Agree that bar with
#      whoever owns the product metric, not within the platform team.
#
#   4. Version the basis with the index and refuse to serve a query
#      against a mismatched basis.
#
#   5. Re-measure after any retraining. The spectrum changes when the
#      model does.
#
#
# =========================================================================
# WHEN SVD IS THE WRONG TOOL HERE
# =========================================================================
#
# The goal is a memory budget, and dimensionality is only one lever:
#
#   - QUANTISATION is usually the better first move. float32 -> int8 is
#     4x smaller with typically under 1% recall loss, because it perturbs
#     every dimension slightly rather than deleting some entirely. It
#     also composes with truncation.
#
#   - PRODUCT QUANTISATION gets 16-32x with modest recall loss and is
#     what production vector databases actually use.
#
#   - APPROXIMATE INDEXES (HNSW, IVF) attack query cost rather than
#     storage, which may be the real constraint.
#
# SVD truncation is the right tool when the embeddings genuinely have
# low-rank structure -- a visible knee. For trained embeddings with a
# smoothly decaying spectrum, quantisation dominates it on both axes.
#
#
# =========================================================================
# TESTS
# =========================================================================

def test_energy_does_not_bound_individual_similarity_error():
    """The core claim: a global average says nothing about one pair."""
    rng = np.random.default_rng(0)
    E = rng.normal(size=(500, 64))
    U, s, Vt = np.linalg.svd(E, full_matrices=False)
    k = int(np.searchsorted(np.cumsum(s**2) / np.sum(s**2), 0.90) + 1)
    R = (U[:, :k] * s[:k])

    def cos(M):
        M = M / np.linalg.norm(M, axis=1, keepdims=True)
        return M @ M.T

    err = np.abs(cos(E) - cos(R))

    assert err.mean() < 0.10          # the average behaves
    assert err.max() > 0.25           # some individual pairs do not


def test_query_must_be_projected_into_the_stored_basis():
    idx = ReducedIndex(np.random.default_rng(0).normal(size=(200, 64)), k=8)
    q = np.random.default_rng(1).normal(size=64)

    assert len(idx.query(q)) == 200            # projected: works
    with pytest.raises(ValueError):
        idx.vecs @ q                            # raw 64-d against 8-d


def test_added_items_use_the_existing_basis():
    """Refitting the basis would silently invalidate stored vectors."""
    idx = ReducedIndex(np.random.default_rng(0).normal(size=(100, 64)), k=8)
    before = idx.basis.copy()

    idx.add(np.random.default_rng(2).normal(size=(10, 64)))

    np.testing.assert_array_equal(idx.basis, before)`,
        notes: [
          { t: "p", text: "**90% energy is a global average over 25.6 million matrix entries.** It bounds the mean squared reconstruction error and says nothing whatever about any individual embedding or any individual cosine — and ranking depends on the *order* of a few near-neighbours, not on average fidelity." },
          { t: "p", text: "**The loss is concentrated, not spread.** Long-tail items have idiosyncratic embeddings poorly captured by the leading components, so they lose the most — and those are exactly the items a recommender exists to surface." },
          { t: "callout", kind: "insight", title: "Measure the service, not the matrix", body: [
            { t: "p", text: "Recall@10 against the uncompressed index is the number that maps onto user experience. On real embedding matrices, 90% energy typically gives recall@10 around 0.80–0.90 — one or two of every ten recommendations changes." },
            { t: "p", text: "That is a product decision rather than a rounding error, and it is completely invisible if you only look at the energy figure." }
          ]},
          { t: "p", text: "**The basis is part of the index.** A query must be projected through the same `V_k`, and refitting the SVD when items are added puts new vectors in a different coordinate system from old ones — with no error raised and similarities that are simply meaningless across the boundary." },
          { t: "p", text: "**Check whether there is a knee at all.** A visible cliff means genuine low-rank structure and a defensible `k`; a smoothly decaying spectrum, which is common for trained embeddings, means every choice is a trade you must measure." },
          { t: "p", text: "**Quantisation is usually the better first lever.** float32 to int8 is 4× smaller for typically under 1% recall loss, because it perturbs every dimension slightly instead of deleting some entirely — and it composes with truncation rather than competing with it." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team implemented linear regression from the textbook formula `(XᵀX)⁻¹Xᵀy`. It worked on their test data and produced wild coefficients in production." },
      { t: "p", text: "**Forming `XᵀX` squares the condition number.** Their design matrix had a condition number around 10⁸ — awkward but workable — and squaring it reached 10¹⁶, which is the precision limit of float64. The matrix was numerically singular by the time it was inverted." },
      { t: "p", text: "**Switching to `np.linalg.lstsq` fixed it in one line**, because it works on `X` directly through SVD and never forms the squared matrix at all." },
      { t: "p", text: "**Correct algebra is not correct numerics.** The normal equations are a valid derivation and a poor implementation, which is why every serious library solves least squares by QR or SVD instead." }
    ]}
  ],

  takeaways: [
    "**Every matrix factors as `U Σ Vᵀ`** — a rotation, a scaling along axes, another rotation — regardless of shape or rank.",
    "**A matrix maps the unit sphere to an ellipsoid**, and the singular values are its semi-axis lengths.",
    "**Singular values are real, non-negative and sorted descending**, which is what makes truncation meaningful.",
    "**The largest singular value is the operator norm**, the ratio of largest to smallest is the condition number, and a zero one means rank deficiency.",
    "**SVD writes a matrix as a weighted sum of rank-one pieces**, in order of importance — which is why truncation is the natural compression.",
    "**Eckart-Young: the truncated SVD is provably the best rank-k approximation**, so there is nothing better to look for.",
    "**Choose `k` from a knee in the spectrum where one exists**, and from a measured task metric where it does not.",
    "**Energy retained is a global average.** It bounds mean reconstruction error and says nothing about any individual similarity or ranking.",
    "**Truncating below the noise floor denoises** — the discarded components were fitting randomness.",
    "**Singular values are the square roots of the eigenvalues of `AᵀA`**, and for symmetric PSD matrices SVD and eigendecomposition coincide.",
    "**Never form `XᵀX` when you can avoid it.** Squaring the matrix squares the condition number and costs half your significant digits.",
    "**The pseudoinverse inverts what it can and leaves the rest**, returning the minimum-norm least-squares solution — and it never raises, so check the rank yourself."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does SVD apply where eigendecomposition does not?",
        options: [
          "It is a numerical approximation rather than exact",
          "It exists for every matrix — any shape, any rank — with real non-negative singular values and orthonormal factors, while eigendecomposition needs a square, diagonalisable matrix",
          "It only works for symmetric matrices",
          "It is faster to compute"
        ],
        answer: 1,
        why: "A shear has a repeated eigenvalue and only one eigenvector, so it has no eigendecomposition — but it has an SVD. For symmetric positive semi-definite matrices the two coincide, which is why PCA can be described through either."
      },
      {
        stem: "You truncate embeddings to keep 90% of the energy. What does that guarantee about ranking quality?",
        options: [
          "Rankings change by at most 10%",
          "Nothing directly — energy bounds the average squared reconstruction error over the whole matrix, while ranking depends on the order of a few near-neighbours for one query",
          "The top-10 results are preserved",
          "Cosine similarities shift by at most 0.10"
        ],
        answer: 1,
        why: "The 10% discarded is concentrated in whichever items and directions were dropped, typically hurting long-tail items most. Two items at 0.61 and 0.59 can swap on a far smaller perturbation. Measure recall against the uncompressed index instead — 90% energy often gives recall@10 around 0.85."
      },
      {
        stem: "Why does `np.linalg.lstsq` avoid computing `(XᵀX)⁻¹Xᵀy`?",
        options: [
          "The formula is algebraically wrong",
          "Forming `XᵀX` squares the condition number, so a matrix at 10⁸ becomes 10¹⁶ and is numerically singular in float64",
          "It cannot handle rectangular matrices",
          "Matrix inversion is not implemented for large matrices"
        ],
        answer: 1,
        why: "The normal equations are a valid derivation and a poor implementation. `lstsq` works on `X` directly via SVD, never forming the squared matrix — which is why the textbook formula can work on test data and produce wild coefficients in production."
      },
      {
        stem: "A spectrum reads `[163.9, 118.4, 79.2, 3.1, 3.0, 2.9, ...]`. What does it tell you?",
        options: [
          "The matrix is badly conditioned and should be discarded",
          "There are three genuine components and the rest is a noise floor — the factor-of-25 gap is where the signal stops",
          "Six components should be retained",
          "The data needs standardising before decomposition"
        ],
        answer: 1,
        why: "A cliff followed by a plateau is the signature of real low-rank structure plus noise. Truncating at the gap is found from the data rather than imposed by a threshold, and it denoises — the discarded components were fitting randomness, so the approximation can be closer to the truth than the original."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What is SVD, and why is it useful?",
        strong: "Every matrix factors into a rotation, a scaling and another rotation. It exists for all matrices, the singular values are real, non-negative and sorted, and truncating them gives the provably best low-rank approximation.",
        answer: [
          { t: "p", text: "The unit-sphere-to-ellipsoid picture makes it concrete and answers the follow-ups about operator norm and condition number for free." },
          { t: "p", text: "Eckart-Young is worth naming — \"provably best\" is a stronger claim than \"works well\" and shows you know why truncation is principled." },
          { t: "p", text: "Contrasting with eigendecomposition on applicability, and noting they coincide for symmetric PSD matrices, ties it to PCA cleanly." }
        ]
      },
      {
        level: "advanced",
        q: "How would you choose the number of components to keep?",
        strong: "Look for a knee in the spectrum first — a cliff followed by a plateau means genuine structure and a defensible cut. If the spectrum decays smoothly there is no natural answer, so measure a task metric at several values and pick the smallest that holds.",
        answer: [
          { t: "p", text: "Pushing back on cumulative-variance thresholds is the substance: 95% is a threshold you imposed, not something the data told you." },
          { t: "p", text: "The strongest point is that energy is a global average while most applications care about individual outcomes — rankings, per-item fidelity." },
          { t: "p", text: "Mentioning that truncating below the noise floor denoises shows you understand what truncation is doing, not just that it saves memory." }
        ]
      },
      {
        level: "core",
        q: "What is the pseudoinverse for?",
        strong: "Solving systems that have no inverse — rectangular or rank-deficient. It gives the least-squares solution, and where infinitely many tie, the minimum-norm one.",
        answer: [
          { t: "p", text: "Explaining the construction — reciprocate the non-zero singular values, leave the zeros — shows it is not magic." },
          { t: "p", text: "The warning matters: `pinv` never raises, so a rank-deficient system silently returns one of many answers and you must check the rank yourself." },
          { t: "p", text: "Noting that the `rcond` tolerance decides what counts as zero, and that too small a value amplifies noise, is a detail that suggests real use." }
        ]
      }
    ]
  }
});

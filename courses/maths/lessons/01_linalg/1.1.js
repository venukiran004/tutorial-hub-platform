/* ============================================================================
   LESSON 1.1 — Vectors, Norms and Geometry
   ========================================================================= */
EC.receiveLesson({
  id: "1.1",

  lede: "A vector is not a list of numbers — it is a **direction with a length**, and the list is one way to write it down. Holding that distinction is what lets you look at a 768-dimensional embedding and still reason about it, because every operation you will use on it is a statement about angle or distance.",

  objectives: [
    "Read a vector as direction and magnitude rather than as an array",
    "Compute a dot product by hand and say what the number means",
    "Choose between L1, L2 and cosine deliberately",
    "Project one vector onto another, and see why regression is that projection",
    "Recognise which operations survive high dimensions and which do not"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "What a vector is", id: "what" },

    { t: "viz",
      title: "The same vector, three descriptions",
      caption: "The components depend on the axes you chose. The length and the angle do not — which is why almost every useful formula is written in terms of those two.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="A vector drawn on axes, with its components, length and angle labelled">
  <line x1="70" y1="240" x2="380" y2="240" style="stroke:var(--border-strong)" fill="none"/>
  <line x1="70" y1="240" x2="70" y2="50" style="stroke:var(--border-strong)" fill="none"/>
  <text x="374" y="262" class="s-sub" style="fill:var(--ink-3)">x</text>
  <text x="52" y="58" class="s-sub" style="fill:var(--ink-3)">y</text>

  <line x1="70" y1="240" x2="310" y2="100" style="stroke:var(--accent)" stroke-width="2.5" fill="none" marker-end="url(#vh)"/>
  <defs><marker id="vh" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
    <path d="M0 0 L9 4.5 L0 9 z" style="fill:var(--accent)"/></marker></defs>

  <line x1="70" y1="240" x2="310" y2="240" style="stroke:var(--t-green);stroke-dasharray:4 3" fill="none"/>
  <line x1="310" y1="240" x2="310" y2="100" style="stroke:var(--t-orange);stroke-dasharray:4 3" fill="none"/>
  <text x="185" y="260" text-anchor="middle" class="s-sub" style="fill:var(--t-green)">3</text>
  <text x="326" y="176" class="s-sub" style="fill:var(--t-orange)">4</text>
  <text x="176" y="158" class="s-label" style="fill:var(--accent)">v</text>

  <path d="M104 240 A34 34 0 0 0 92 218" style="stroke:var(--t-violet)" fill="none"/>
  <text x="112" y="222" class="s-sub" style="fill:var(--t-violet)">θ</text>

  <g class="s-sub">
    <text x="460" y="76" class="s-label">AS COMPONENTS</text>
    <text x="460" y="102">v = [3, 4]</text>
    <text x="460" y="124" style="fill:var(--ink-3)">depends entirely on the axes</text>

    <text x="460" y="168" class="s-label">AS LENGTH AND ANGLE</text>
    <text x="460" y="194">‖v‖ = 5,  θ = 53.13°</text>
    <text x="460" y="216" style="fill:var(--ink-3)">the same vector in any basis</text>

    <text x="460" y="260" class="s-label" style="fill:var(--accent)">AS A DISPLACEMENT</text>
    <text x="460" y="284" style="fill:var(--ink-3)">"go 3 right and 4 up" — no origin needed</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "the length, worked", code: `
import numpy as np

v = np.array([3.0, 4.0])

# The L2 norm IS Pythagoras, extended to any number of dimensions.
#   ||v|| = sqrt(3^2 + 4^2) = sqrt(9 + 16) = sqrt(25) = 5
np.linalg.norm(v)            # 5.0

# Nothing about that formula cares that there were two components.
u = np.array([1.0, 2.0, 2.0])
#   sqrt(1 + 4 + 4) = sqrt(9) = 3
np.linalg.norm(u)            # 3.0

# A UNIT VECTOR keeps the direction and throws away the length. This is
# what "normalise the embeddings" means, and it is why cosine similarity
# and dot product become the same thing afterwards.
v_hat = v / np.linalg.norm(v)          # [0.6, 0.8]
np.linalg.norm(v_hat)                  # 1.0
`,
      hl: [7, 17],
      caption: "**0.6² + 0.8² = 0.36 + 0.64 = 1.** Worth doing once by hand: a unit vector's components are the cosines of the angles it makes with each axis."
    },

    { t: "h2", n: "02", text: "The dot product", id: "dot" },

    { t: "code", lang: "python", title: "one number, two readings", code: `
a = np.array([3.0, 4.0])
b = np.array([4.0, 3.0])

# READING 1 — multiply componentwise and add.
#   3*4 + 4*3 = 12 + 12 = 24
a @ b                        # 24.0

# READING 2 — ||a|| * ||b|| * cos(theta)
#   5 * 5 * cos(theta) = 24   ->   cos(theta) = 24/25 = 0.96
np.degrees(np.arccos(24 / 25))          # 16.26 degrees

# The two readings are the same number. The first is how you COMPUTE it;
# the second is what it MEANS.

# THE SIGN IS THE WHOLE INTUITION:
#   > 0   the vectors broadly agree      (angle under 90 degrees)
#   = 0   they are orthogonal            (exactly 90 degrees)
#   < 0   they broadly disagree          (over 90 degrees)
np.array([1, 0]) @ np.array([0, 1])     # 0.0  -- perpendicular
np.array([1, 0]) @ np.array([-1, 0])    # -1.0 -- opposite
`,
      hl: [6, 11, 17],
      caption: "**Every layer of a neural network is a pile of dot products.** A neuron computes `w @ x + b`: how much does this input agree with what I am looking for?"
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**A dot product asks: how much of one vector points along the other?** Everything else follows. Similarity search is that question. A projection is that question with the answer scaled back onto the direction. A linear layer asks it once per neuron." },
      { t: "p", text: "It also explains why orthogonality matters so much. Two orthogonal directions share no information — knowing a vector's component along one tells you nothing about its component along the other, which is exactly the property PCA is built to manufacture." }
    ]},

    { t: "h2", n: "03", text: "Which norm, and why it changes the answer", id: "norms" },

    { t: "table",
      head: ["Norm", "Formula", "Geometry", "Where it shows up"],
      rows: [
        ["**L2** (Euclidean)", "√Σxᵢ²", "Straight-line distance", "Least squares, ridge, embeddings"],
        ["**L1** (Manhattan)", "Σ|xᵢ|", "Distance along a grid", "**Lasso, robust loss, sparsity**"],
        ["**L∞** (max)", "max|xᵢ|", "The single worst component", "Worst-case bounds, adversarial radius"],
        ["**L0** (not a norm)", "count of non-zeros", "How many features are used", "The thing L1 is a stand-in for"],
        ["Cosine distance", "1 − cos θ", "Angle only, length discarded", "**Text and vector search**"]
      ],
      caption: "**L1 and L2 disagree about what \"large\" means.** L2 squares, so one component of 10 dominates ten components of 1; L1 treats them the same. That single difference is why lasso produces zeros and ridge does not."
    },

    { t: "code", lang: "python", title: "the disagreement, on one example", code: `
spread = np.array([3.0, 3.0, 3.0, 3.0])     # error shared out
spike  = np.array([6.0, 0.0, 0.0, 0.0])     # error concentrated

np.linalg.norm(spread, 1)    # 12.0    L1 says SPREAD is worse
np.linalg.norm(spike,  1)    #  6.0

np.linalg.norm(spread, 2)    #  6.0    L2 says they are EQUAL
np.linalg.norm(spike,  2)    #  6.0

np.linalg.norm(spread, np.inf)   # 3.0  L-inf says SPIKE is worse
np.linalg.norm(spike,  np.inf)   # 6.0

# Three defensible answers to "which vector is bigger". The norm is not
# a detail of the formula -- it IS the definition of the question, and
# choosing it is a modelling decision you should be able to defend.
`,
      hl: [4, 7, 10],
      caption: "**A loss function is a norm applied to the residuals.** Squared error is L2 and chases outliers; absolute error is L1 and ignores them. Neither is correct in general — they answer different questions."
    },

    { t: "h2", n: "04", text: "Projection, which is secretly regression", id: "projection" },

    { t: "ladder",
      title: "How much of `a` lies along `b`?",
      rungs: [
        { level: "bad", label: "The raw dot product",
          why: "It answers the question, but the number is contaminated by both lengths. Double `b` and the answer doubles, even though `b` points exactly where it did before — so the figure cannot be compared across different `b`.",
          code: `a @ b            # 24.0

# Now scale b, changing nothing about its direction:
a @ (2 * b)      # 48.0   -- twice the "similarity", same angle` },
        { level: "ok", label: "Divide out the lengths — cosine",
          why: "Now the answer is pure angle, between −1 and 1, and comparable across vectors of any size. It is the right tool when only direction carries meaning, which is the usual case for embeddings.",
          code: `cos = (a @ b) / (np.linalg.norm(a) * np.linalg.norm(b))
cos              # 0.96

# Scale-invariant, as intended:
(a @ (2*b)) / (np.linalg.norm(a) * np.linalg.norm(2*b))   # 0.96` },
        { level: "best", label: "Project — keep the direction, get the length",
          why: "The projection is the actual vector: the part of `a` that lies along `b`, plus a remainder orthogonal to it. That decomposition is what least squares does, so understanding it here means regression needs no new idea later.",
          code: `# The component of a along b, as a vector.
proj = (a @ b) / (b @ b) * b        # [3.84, 2.88]

# What is left over is perpendicular to b -- BY CONSTRUCTION.
resid = a - proj                    # [-0.84, 1.12]
resid @ b                           # 0.0  (to floating point)

# THAT ORTHOGONALITY IS THE WHOLE OF LEAST SQUARES:
# fitting y with X means projecting y onto the column space of X, and
# the residual is whatever the columns cannot reach. "The residuals are
# orthogonal to the predictors" is not a condition you impose -- it is
# what projection means.`,
          note: "**Draw it once.** `a` is the hypotenuse, `proj` is its shadow on `b`, and `resid` closes the right angle. Every regression diagnostic you will meet is a statement about that triangle." }
      ]
    },

    { t: "h2", n: "05", text: "What breaks in high dimensions", id: "high-d" },

    { t: "callout", kind: "trap", title: "Your two-dimensional intuition expires", body: [
      { t: "code", lang: "python", title: "three surprises, all real", numbered: false, code: `
rng = np.random.default_rng(0)

# 1. RANDOM VECTORS ARE ALL ORTHOGONAL.
#    In 2D, two random directions are often similar. In 1000D they are
#    almost never similar -- there is simply too much room to point in.
for d in (2, 10, 100, 1000):
    x = rng.normal(size=(2000, d))
    x /= np.linalg.norm(x, axis=1, keepdims=True)
    cos = np.abs(np.einsum("ij,ij->i", x[::2], x[1::2]))
    print(d, round(cos.mean(), 3))
#    2    0.637
#    10   0.246
#    100  0.080
#    1000 0.025      <- effectively perpendicular

# 2. DISTANCES CONCENTRATE. The nearest and furthest points become
#    almost equally far away, so "nearest neighbour" loses its meaning
#    long before you notice.
for d in (2, 100, 1000):
    x = rng.normal(size=(1000, d))
    dist = np.linalg.norm(x - x[0], axis=1)[1:]
    print(d, round(dist.max() / dist.min(), 2))
#    2    38.51
#    100  2.06
#    1000 1.30       <- furthest is only 30% further than nearest

# 3. THE VOLUME IS ALL IN THE SHELL. Nearly every point of a
#    high-dimensional ball is near its surface, so "the centre" is not
#    where the data is.
`},
      { t: "p", text: "**This is the curse of dimensionality stated concretely.** It is why cosine beats Euclidean distance for embeddings, why k-NN degrades in raw high-dimensional space, and why dimensionality reduction is a preprocessing step rather than a nicety." },
      { t: "p", text: "**It is also why normalising helps.** Once every vector has length 1, the dot product is the cosine, and the only thing being compared is direction — which is the part that still carries information up there." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Debug a similarity search that ranks badly",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p", text: "A document search ranks by dot product over embeddings. Users report that long documents dominate the results regardless of topic." },
        { t: "code", lang: "python", numbered: false, title: "search.py", code: `
def search(query_vec, doc_vecs, k=5):
    scores = doc_vecs @ query_vec
    return np.argsort(-scores)[:k]

# Observed: documents with the largest norms win almost every query,
# and their topics are often unrelated.
#
#   doc A: norm 42.0, angle to query 71 degrees
#   doc B: norm  3.1, angle to query  8 degrees
#
# A is returned first. B is what the user wanted.`},
        { t: "p", text: "Explain the ranking arithmetically, fix it, and say what the fix costs." }
      ],
      requirements: [
        "Compute both scores and show why A wins.",
        "Name the property the dot product has that is causing this.",
        "Give the fix, and prove it reverses the ranking.",
        "Say when the original behaviour would have been correct.",
        "Explain why normalising once at index time beats normalising per query."
      ],
      hint: "Write the dot product in its second form — the one with the cosine in it — and see which factor is doing the work.",
      solution: {
        lang: "python",
        title: "search.py",
        code: `# =========================================================================
# THE ARITHMETIC
# =========================================================================
#
# a @ b = ||a|| * ||b|| * cos(theta). The query norm is the same for
# every document, so ranking by dot product ranks by
#
#     ||doc|| * cos(theta)
#
# -- a product of RELEVANCE and LENGTH. With ||query|| = 1:
#
#   doc A:  42.0 * cos(71 deg) = 42.0 * 0.3256 = 13.67
#   doc B:   3.1 * cos( 8 deg) =  3.1 * 0.9903 =  3.07
#
# A wins by more than 4x while being far less relevant. It does not need
# to be similar; it only needs to be LONG. A document 13x the length can
# afford to be 4x less on-topic and still rank first.
#
# THE PROPERTY: the dot product is not scale-invariant. It grows with
# either factor, and ranking cannot tell which factor grew.
#
# WHY EMBEDDING NORMS VARY AT ALL: most encoders produce larger norms for
# longer inputs, and norm often tracks token count more than meaning. So
# the contaminating factor is almost exactly "document length" -- which is
# precisely the complaint.


# =========================================================================
# THE FIX -- rank by angle alone
# =========================================================================

def search(query_vec, doc_vecs, k=5):
    """Cosine similarity: the dot product with both lengths divided out.

    Ranking is now a statement about direction only, which is the part of
    an embedding that carries topic.
    """
    q = query_vec / np.linalg.norm(query_vec)
    d = doc_vecs / np.linalg.norm(doc_vecs, axis=1, keepdims=True)
    scores = d @ q
    return np.argsort(-scores)[:k]

# The ranking reverses, as it must:
#   doc A: cos(71 deg) = 0.326
#   doc B: cos( 8 deg) = 0.990      <- now first


# =========================================================================
# NORMALISE AT INDEX TIME, NOT PER QUERY
# =========================================================================
#
# Dividing the document matrix by its norms costs O(n*d) and allocates a
# second copy of the whole index -- PER QUERY. Do it once when the index
# is built and the query path becomes a plain matrix-vector product:

class Index:
    def __init__(self, doc_vecs):
        # Store unit vectors. The direction is all that ranking uses, so
        # the norms are not information being discarded -- they were
        # noise in this application.
        self.vecs = doc_vecs / np.linalg.norm(doc_vecs, axis=1, keepdims=True)

    def search(self, query_vec, k=5):
        q = query_vec / np.linalg.norm(query_vec)
        # With both sides unit length, dot product IS cosine. No division
        # in the hot path at all.
        return np.argsort(-(self.vecs @ q))[:k]

# This is why vector databases store normalised vectors and advertise
# "inner product" and "cosine" as the same metric: on unit vectors they
# are, and the inner product is the cheaper kernel.


# =========================================================================
# WHEN THE ORIGINAL WAS RIGHT
# =========================================================================
#
# Ranking by raw dot product is correct when magnitude is MEANT to count:
#
#   - a recommender where the vector length encodes confidence or
#     popularity, and a popular item genuinely should outrank a niche one
#   - a model whose training objective was the inner product itself
#     (many two-tower retrieval models), because the norms were fitted to
#     mean something
#   - any scoring where you have deliberately put a prior into the norm
#
# The bug here is not "dot product is wrong". It is using a metric whose
# magnitude term encodes DOCUMENT LENGTH and calling the result relevance.
#
#
# =========================================================================
# TESTS
# =========================================================================

def test_ranking_ignores_document_length():
    """The reported bug, pinned."""
    query = np.array([1.0, 0.0])
    on_topic_short = np.array([0.99, 0.14])      # ~8 degrees,  norm 1
    off_topic_long = np.array([13.7, 39.7])      # ~71 degrees, norm 42

    docs = np.vstack([off_topic_long, on_topic_short])

    assert search(query, docs, k=1)[0] == 1      # the short, on-topic one


def test_scaling_a_document_does_not_change_its_rank():
    """Scale invariance is the property that was missing."""
    query = np.array([1.0, 0.0])
    docs = np.array([[0.9, 0.4], [0.5, 0.9]])

    before = search(query, docs)
    after = search(query, docs * np.array([[100.0], [1.0]]))

    assert list(before) == list(after)


def test_index_normalisation_matches_per_query_cosine():
    docs = np.random.default_rng(0).normal(size=(50, 16))
    q = np.random.default_rng(1).normal(size=16)

    np.testing.assert_array_equal(Index(docs).search(q), search(q, docs))`,
        notes: [
          { t: "p", text: "**Writing the dot product as `‖a‖·‖b‖·cos θ` is the whole diagnosis.** The query norm is constant across documents, so the ranking is `‖doc‖ × relevance` — a product in which either factor can win, and the ranking cannot report which one did." },
          { t: "p", text: "**The contaminating factor is almost exactly document length**, because most encoders produce larger norms for longer inputs. So the observed symptom — long documents dominating — is not a coincidence; it is the norm term doing precisely what it measures." },
          { t: "callout", kind: "insight", title: "On unit vectors, dot product and cosine are the same operation", body: [
            { t: "p", text: "That identity is why vector databases advertise \"inner product\" and \"cosine\" as interchangeable metrics, and why they ask you to store normalised vectors. The inner product is the cheaper kernel; normalising at index time buys the cosine's scale-invariance for free." },
            { t: "p", text: "Doing it per query instead costs a full O(n·d) pass and a second copy of the index on every request — the same answer at many times the price." }
          ]},
          { t: "p", text: "**Raw dot product is not wrong in general.** It is correct wherever magnitude is meant to carry signal — a confidence weight, a popularity prior, or a two-tower model trained on the inner product itself. The bug is using a metric whose magnitude encodes length and calling the result relevance." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team migrated a recommender from cosine similarity to dot product because a benchmark showed it was faster. Offline metrics were unchanged, so it shipped." },
      { t: "p", text: "**Engagement with long-tail items collapsed within a week.** The embedding norms encoded popularity, so ranking by dot product multiplied relevance by popularity — and popular items won every slot regardless of fit." },
      { t: "p", text: "**The offline metric had not caught it** because it was computed on a sample stratified by popularity, which removed exactly the variation that was causing the problem." },
      { t: "p", text: "**Changing a metric changes the question.** Dot product and cosine are not two implementations of one idea — one ranks by direction, the other by direction times magnitude, and you need to know what your magnitudes mean before choosing." }
    ]}
  ],

  takeaways: [
    "**A vector is a direction with a length.** The components depend on the basis you chose; the length and angle do not.",
    "**The L2 norm is Pythagoras in any number of dimensions**, and a unit vector keeps the direction while discarding the length.",
    "**The dot product has two readings**: componentwise-multiply-and-add is how you compute it, `‖a‖‖b‖cos θ` is what it means.",
    "**The sign of a dot product is the intuition** — positive means broadly agreeing, zero means orthogonal, negative means opposing.",
    "**The norm you choose defines the question.** L1 and L2 genuinely disagree about which vector is larger, which is why lasso produces zeros and ridge does not.",
    "**A loss function is a norm on the residuals** — squared error chases outliers, absolute error ignores them.",
    "**Projection splits a vector into a part along a direction and a remainder orthogonal to it**, and least squares is exactly that split.",
    "**\"Residuals are orthogonal to the predictors\" is not an assumption** — it is what projection means.",
    "**Dot product is not scale-invariant; cosine is.** Ranking by dot product ranks by relevance times magnitude, and cannot tell you which factor won.",
    "**On unit vectors, dot product and cosine are the same operation** — which is why vector databases store normalised vectors.",
    "**In high dimensions random vectors are almost orthogonal**, distances concentrate, and nearest-neighbour loses meaning.",
    "**High-dimensional volume lives in the shell**, so the centre of the space is not where the data is."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A search ranks by `doc @ query` and long documents dominate regardless of topic. Why?",
        options: [
          "Long documents contain more query terms",
          "The dot product equals ‖doc‖·‖query‖·cos θ, so ranking is relevance multiplied by document norm — and encoder norms grow with length",
          "The embeddings are not trained on long documents",
          "argsort is unstable for large arrays"
        ],
        answer: 1,
        why: "The query norm is constant across documents, so it does not affect ordering — but the document norm does, and it typically tracks token count. Dividing both norms out gives cosine, which ranks by angle alone. Normalise at index time so the query path stays a plain inner product."
      },
      {
        stem: "For `spread = [3,3,3,3]` and `spike = [6,0,0,0]`, which statement is true?",
        options: [
          "Both norms rank them identically",
          "L1 calls spread larger (12 vs 6), L2 calls them equal (6 vs 6), and L∞ calls spike larger (3 vs 6)",
          "L2 always agrees with L1 up to a constant",
          "The spike vector is larger under every norm"
        ],
        answer: 1,
        why: "Three defensible answers to \"which is bigger\". The norm is not an implementation detail — it is the definition of the question, which is why squared error chases outliers while absolute error ignores them, and why L1 regularisation produces exact zeros."
      },
      {
        stem: "After projecting `a` onto `b`, why is the residual `a − proj` orthogonal to `b`?",
        options: [
          "It is an assumption that must be checked",
          "By construction — the projection removes exactly the component along `b`, so nothing along `b` remains",
          "Only when `a` and `b` are unit vectors",
          "It is approximately orthogonal, up to floating point"
        ],
        answer: 1,
        why: "This is why least squares needs no new idea: fitting `y` with `X` projects `y` onto the column space of `X`, and the residual is what the columns cannot reach. \"Residuals are orthogonal to the predictors\" describes the geometry rather than imposing a condition."
      },
      {
        stem: "In 1000 dimensions, the mean absolute cosine between random unit vectors is about 0.025. What follows?",
        options: [
          "The random number generator is biased",
          "Random directions are effectively orthogonal, so a high cosine is strong evidence of a real relationship — and Euclidean nearest-neighbour becomes uninformative",
          "Cosine similarity cannot be used above 100 dimensions",
          "The vectors must be normalised again"
        ],
        answer: 1,
        why: "There is too much room for two random directions to align. The same geometry makes distances concentrate — the furthest point may be only 30% further than the nearest — which is why raw k-NN degrades in high dimensions and dimensionality reduction is a preprocessing step rather than a nicety."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What does the dot product mean geometrically?",
        strong: "It is `‖a‖‖b‖cos θ` — how much of one vector points along the other, scaled by both lengths. The sign gives the intuition: positive is broadly agreeing, zero is orthogonal, negative is opposing.",
        answer: [
          { t: "p", text: "Giving both forms is what makes the answer complete — one is how you compute it, the other is what it means." },
          { t: "p", text: "Connecting it to a neural layer, where `w @ x` asks how much this input agrees with what the neuron looks for, shows you can use the idea rather than recite it." },
          { t: "p", text: "The follow-up is almost always cosine versus dot product, so volunteering the scale-invariance difference gets you there first." }
        ]
      },
      {
        level: "core",
        q: "When would you use cosine similarity rather than Euclidean distance?",
        strong: "When direction carries the meaning and magnitude does not — text embeddings being the standard case, where the norm often tracks document length rather than topic. Cosine is also more robust in high dimensions, where Euclidean distances concentrate.",
        answer: [
          { t: "p", text: "Naming the concrete failure — long documents dominating a ranking — is more convincing than the abstract statement." },
          { t: "p", text: "Noting that on unit vectors the two are equivalent up to a monotone transform shows you understand the relationship rather than treating them as unrelated options." },
          { t: "p", text: "The honest caveat is worth adding: if the norms were trained to mean something, discarding them is a loss rather than a cleanup." }
        ]
      },
      {
        level: "advanced",
        q: "Why does L1 regularisation produce exact zeros when L2 does not?",
        strong: "Because L1 penalises every unit of coefficient equally, so shrinking a small coefficient to zero always pays the same; L2 squares, so the penalty on an already-small coefficient is tiny and there is nothing left pushing it to zero.",
        answer: [
          { t: "p", text: "The geometric version — the L1 ball has corners on the axes, and a constrained optimum tends to land on a corner — is the picture interviewers are usually hoping for." },
          { t: "p", text: "Framing it as \"the norm defines the question\" connects the answer to loss functions generally rather than leaving it as a regularisation fact." },
          { t: "p", text: "Mentioning that L1 is a tractable stand-in for L0, which is what you actually want, shows where the idea comes from." }
        ]
      }
    ]
  }
});

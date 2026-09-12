/* ============================================================================
   LESSON 1.7 — Learning Theory and the Shape of Models
   ========================================================================= */
EC.receiveLesson({
  id: "1.7",

  lede: "**Why can a model trained on a thousand rows say anything about the million it has not seen?** Learning theory answers with a bargain: restrict the hypothesis space, and the training error becomes evidence about the true error — with a bound that grows with the space's capacity and shrinks with the number of rows. That bargain is why every algorithm carries an inductive bias, why no algorithm wins everywhere, why simpler is preferred among equals, and why distances stop meaning anything in a hundred dimensions. This lesson puts numbers on each of those: a VC bound computed, four points that cannot be shattered, the nearest-to-farthest distance ratio climbing from 0.002 to 0.86, and two datasets with two different winners.",

  objectives: [
    "State PAC learning and empirical risk minimisation, and compute a sample-complexity and a VC bound for concrete numbers",
    "Explain VC dimension through shattering, and show a linear classifier shattering three points but not four",
    "Name the inductive bias of each major family and use no-free-lunch and Occam's razor as decision rules, not slogans",
    "Classify models as parametric or non-parametric, generative or discriminative, lazy or eager — and say what each choice costs in data, time and memory",
    "Quantify the curse of dimensionality and know which methods it breaks first"
  ],

  prerequisites: ["1.3"],

  blocks: [

    { t: "h2", n: "01", text: "ERM, PAC, and why restricting the space is the whole trick", id: "theory" },

    { t: "p", text: "We want the function with the lowest **true risk** R(f) = E[L(y, f(x))] over the whole population, but we only have n rows. **Empirical risk minimisation** picks the f in the hypothesis space H that minimises the training loss, and asks: how far is the training loss from the true risk? For a single fixed f, the training loss is an average of n independent draws and concentrates around R(f). The trouble is that we chose f *because* its training loss was low — among |H| candidates, some will look good by luck. The bound has to account for every f we might have picked." },

    { t: "code", lang: "text", title: "PAC learning: the sample complexity for a finite hypothesis space, and three worked numbers",
      code: `Probably Approximately Correct:   with probability at least 1 - δ,   error(ĥ) ≤ ε

For a finite space H, a consistent learner (zero training error) needs      m  ≥  (1/ε) · ( ln|H| + ln(1/δ) )   rows.

  |H| = 2^20 (a million hypotheses), ε = 0.05, δ = 0.05:     m ≥ (1/0.05)(13.86 + 3.00) =  337 rows
  the same space, ε = 0.01:                                   m ≥ (1/0.01)(13.86 + 3.00) = 1686 rows      <- five times the precision costs five times the rows
  |H| = 2^100, ε = 0.05, δ = 0.05:                             m ≥ (1/0.05)(69.31 + 3.00) = 1446 rows      <- 2^80 times more hypotheses costs only four times the rows

The bound grows with log|H|, not |H|: doubling the space adds one row's worth of evidence per ε. Capacity is cheap; precision is expensive.
For infinite spaces (every linear classifier), |H| is replaced by the VC dimension.`,
      caption: "The union bound is the engine: the probability that *any* of |H| hypotheses is bad-but-looks-good is at most |H| times the probability for one, and one's probability falls exponentially in m. Take logs and the ln|H| appears. Everything else in learning theory is a more refined way of counting how many *effectively different* hypotheses H contains on n points."
    },

    { t: "code", lang: "python", title: "VC dimension by shattering: a line in the plane handles 3 points, not 4 (executed)",
      hl: [2, 3, 7, 8],
      code: `# try every labelling of the points with a hard-margin linear classifier; count the labellings it can realise
three = np.array([[0, 0], [1, 0], [0, 1]]);  four = np.array([[0, 0], [1, 0], [0, 1], [1, 1]])
shatters(three)    # 8 of 8 labellings separable    -> a line can shatter 3 points in the plane
shatters(four)     # 14 of 16                        -> the two XOR labellings (diagonals same class) cannot be drawn with one line
# so the VC dimension of linear classifiers in R^2 is 3; in R^d it is d + 1

# the VC generalisation bound:  test error ≤ training error + sqrt( ( d (ln(2n/d) + 1) - ln(δ/4) ) / n )       with probability 1 - δ
#   d = 11 (linear, 10 features), n = 1,000, δ = 0.05:     complexity term 0.269
#   d = 11,  n = 10,000:                                   complexity term 0.099      <- ten times the rows, a third of the slack
#   d = 101 (linear, 100 features), n = 1,000:             complexity term 0.638      <- the bound is vacuous: 100 features on 1,000 rows guarantees nothing`,
      caption: "The bound is loose in absolute terms — real models generalise far better than 0.27 slack — but its shape is exactly right: slack grows like √(d/n). Structural risk minimisation is the recipe that follows: choose the model that minimises training error plus this complexity term, which is what regularisation and cross-validation approximate in practice. The d = 101 row is the theory's version of 1.4's 65-feature logistic regression on 693 rows."
    },

    { t: "dl", items: [
      ["True risk / empirical risk", "Expected loss over the population / average loss over the training rows. Learning is using the second to control the first."],
      ["PAC learnable", "A concept class for which some algorithm, given enough rows polynomial in 1/ε and 1/δ, returns an ε-accurate hypothesis with probability 1 − δ."],
      ["VC dimension", "The largest number of points a hypothesis class can shatter — label in every possible way. Linear in d dimensions: d + 1. Decision stump: 2. RBF-SVM, 1-NN, unlimited trees: infinite."],
      ["Rademacher complexity", "How well the class can fit random ±1 labels on the actual n points — a data-dependent capacity measure that gives tighter bounds than VC and handles regularised classes."],
      ["Structural risk minimisation", "Minimise training error plus a capacity penalty; the principled ancestor of 'choose the model by validation'."],
      ["Inductive bias", "The assumptions a learner makes to prefer one hypothesis over another on data it has not seen. Without any, generalisation is impossible."],
      ["No free lunch", "Averaged over all possible target functions, every learning algorithm has the same expected error. A learner only wins on the problems its bias matches."],
      ["Occam's razor", "Among hypotheses with similar training performance, prefer the simpler — because simpler classes have smaller bounds, are cheaper to run, and are easier to explain."]
    ]},

    { t: "h2", n: "02", text: "Inductive bias, no free lunch, Occam", id: "bias" },

    { t: "table",
      head: ["Family", "Inductive bias", "Wins when", "Fails when"],
      rows: [
        ["Linear / logistic regression", "The target is a weighted sum of the features; the boundary is a hyperplane", "Effects are additive; few rows per feature", "Interactions and thresholds matter (XOR)"],
        ["Decision trees", "Axis-aligned rectangles; features interact through nesting", "Thresholds and interactions; mixed types", "Smooth diagonal boundaries; extrapolation"],
        ["KNN / kernels", "Nearby points share labels — smoothness in the metric", "Low dimension, meaningful distances", "High dimension, irrelevant features"],
        ["Naive Bayes", "Features are conditionally independent given the class", "Text; tiny data", "Strongly correlated features"],
        ["SVM (RBF)", "The widest margin generalises best; smooth boundaries", "Medium data, clean classes", "Heavy noise; large n"],
        ["Neural networks", "Composition: complex functions are stacks of simple ones", "Raw signals with structure (pixels, tokens)", "Small tabular data"],
        ["CNN / RNN / transformer", "Locality and translation invariance / sequential dependence / attention over positions", "Images / sequences / language", "Data without that structure"],
        ["Ensembles", "Several biases averaged or stacked", "Unknown structure", "When one bias is clearly right and cheaper"]
      ]
    },

    { t: "code", lang: "python", title: "No free lunch, in two rows: the same three models, two datasets (executed, 5-fold accuracy)",
      hl: [3, 4, 5, 8, 9, 10],
      code: `# dataset A: y = sign(x · w + heavy noise), 20 features -- the truth is a hyperplane
# dataset B: two interleaved half-moons in 2-D, noise 0.25 -- the truth is a curve
#                                 logistic     KNN (k=15)     random forest
# A  linear logit, 20-D, noisy      0.803        0.714           0.760          <- the hyperplane model wins by nine points
# B  two moons, 2-D                 0.862        0.926           0.928          <- the local models win by six

# generative vs discriminative, Naive Bayes against logistic regression, accuracy against training rows (20 draws each):
#   class-conditional cluster data (NB's assumption roughly true):   n=20  NB 0.664 LR 0.702 | n=100  NB 0.808 LR 0.797 | n=4000  NB 0.849 LR 0.835
#   correlated Gaussian features, linear-logit truth:                n=20  NB 0.640 LR 0.745 | n=100  NB 0.760 LR 0.868 | n=5000  NB 0.811 LR 0.909
#   the asymptotic winner is the model whose assumption matches how the data was generated; the small-n winner is the lower-variance estimator.`,
      caption: "Nothing in the algorithms changed between rows A and B; the data did. The practical form of no free lunch is not 'nothing works' but 'the model that matches the structure wins, and you find the structure by trying candidates with different biases under cross-validation'. The Naive Bayes rows temper a textbook claim — that generative models win at small n and discriminative at large n — into what was actually measured: it depends on whether the generative assumption is close to true."
    },

    { t: "callout", kind: "mental", title: "Occam is a tie-breaker with a direction, not a rule against complexity", body: [
      { t: "p", text: "If logistic regression scores 0.88 and a tuned booster 0.89, and the difference is inside the CV spread (1.5, 2.7), ship the logistic regression: the bound is tighter, the latency is lower, the explanation is a table of coefficients, and the on-call engineer can read it. **If the booster scores 0.95 on a task where 0.01 of AUC is worth real money, ship the booster** — Occam does not say simple beats better; it says simple beats equal." }
    ]},

    { t: "h2", n: "03", text: "The shape of a model: three axes", id: "axes" },

    { t: "table",
      head: ["Axis", "One side", "Other side", "What the choice costs"],
      rows: [
        ["Parametric vs non-parametric", "A fixed number of parameters whatever n is: linear, logistic, Naive Bayes, a fixed-size network. Strong assumptions, fast, needs little data, cannot grow with data", "Capacity grows with n: KNN, kernel SVM, trees, forests, GPs. Weak assumptions, needs more data, can fit anything given enough", "Parametric models plateau at their bias; non-parametric models pay in variance and compute"],
        ["Generative vs discriminative", "Models p(x, y) or p(x | y) and applies Bayes: Naive Bayes, GMM, HMM, VAE. Can generate, handle missing inputs, work with tiny data if the assumption holds", "Models p(y | x) or the boundary directly: logistic, SVM, trees, most networks. Lower asymptotic error when the generative story is wrong", "Generative buys structure with assumptions; discriminative buys accuracy with data"],
        ["Lazy vs eager (instance- vs model-based)", "Stores the data; computes at query time: KNN, kernel methods at prediction, case-based reasoning. Zero training, adapts by adding rows, local boundaries", "Compresses the data into parameters at training time: everything else. Slow to train, fast to score, one global boundary", "Lazy pays at prediction — 382 ms against 0.5 ms for 5,000 rows below — and in memory"]
      ]
    },

    { t: "code", lang: "python", title: "Lazy against eager on 50,000 rows × 20 features (executed)",
      code: `#              fit           predict 5,000 rows
# logistic     38.2 ms            0.5 ms          <- 21 numbers stored; a dot product per row
# KNN, k=5      3.0 ms          382.4 ms          <- 50,000 rows stored; a search per query. Serving cost is the training set size.`,
      caption: "The lazy learner 'trains' in 3 ms because it does nothing; it pays 800× at prediction, and the bill grows with every row added. For a batch job that is fine; for a request path with a latency budget it is the reason KNN is rarely deployed raw (5.1 covers the tree structures that soften it)."
    },

    { t: "h2", n: "04", text: "The curse of dimensionality, in numbers", id: "curse" },

    { t: "code", lang: "python", title: "Distances in high dimensions: 500 uniform points, one query (executed)",
      hl: [3, 4, 5, 8, 9],
      code: `for d in [1, 2, 5, 10, 20, 50, 100, 500]:
    X = rng.uniform(0, 1, (500, d)); q = rng.uniform(0, 1, d); dist = np.linalg.norm(X - q, axis=1)
#   d      nearest    farthest    nearest/farthest      mean ± sd of the 500 distances
#   1       0.001      0.916          0.002                0.455 ± 0.279
#   2       0.014      1.155          0.012                0.616 ± 0.257
#   10      0.498      1.588          0.314                1.039 ± 0.187
#   20      0.996      2.364          0.421                1.704 ± 0.221
#   100     3.707      5.000          0.741                4.290 ± 0.236
#   500     8.205      9.544          0.860                8.943 ± 0.225      <- the nearest neighbour is 86 % as far as the farthest point

# where the data lives: fraction of the unit cube within 0.05 of its surface
#   d=1 0.100    d=2 0.190    d=10 0.651    d=50 0.995    d=100 1.000       <- in 100 dimensions every point is on the edge`,
      caption: "In one dimension the nearest of 500 points is a thousand times closer than the farthest; in five hundred dimensions it is barely closer at all. 'Nearest' has stopped meaning anything, and with it every method built on distance: KNN, k-means, kernels, LOF. The mean distance also grows like √d while the spread stays constant, which is the same fact seen from the other side. Trees suffer differently — more dimensions mean more spurious splits to choose from — and linear models mostly through collinearity and the √(d/n) bound."
    },

    { t: "viz",
      title: "Capacity, data and the bound",
      caption: "The generalisation gap scales like √(capacity / rows). Moving right (more capacity) or up (fewer rows) widens it; regularisation, feature selection and dimensionality reduction move a model back toward the safe region without waiting for more data.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="A grid with capacity on the horizontal axis and rows on the vertical axis. A diagonal band separates a safe region in the upper left from a risky region in the lower right. Arrows show regularisation and feature selection moving a point leftward, and more data moving it upward.">
  <defs>
    <marker id="ac-ah-17" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/></marker>
  </defs>
  <line x1="80" y1="220" x2="840" y2="220" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-17)"/>
  <line x1="80" y1="220" x2="80" y2="30" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-17)"/>
  <text x="460" y="248" class="s-sub" text-anchor="middle">capacity: VC dimension, degree, depth, 1/λ</text>
  <text x="40" y="125" class="s-sub" text-anchor="middle" transform="rotate(-90 40 125)">rows n</text>
  <polygon points="80,220 840,220 840,60" style="fill:var(--crit);fill-opacity:.08"/>
  <polygon points="80,220 80,40 800,40" style="fill:var(--good);fill-opacity:.08"/>
  <line x1="80" y1="220" x2="840" y2="50" style="stroke:var(--ink-3)" stroke-width="1.2" stroke-dasharray="5 4"/>
  <text x="250" y="90" class="s-label" style="fill:var(--good);font-weight:600">gap small: training error is evidence</text>
  <text x="520" y="200" class="s-label" style="fill:var(--crit);font-weight:600">gap ~ √(d/n) large: training error is noise</text>
  <circle cx="620" cy="150" r="6" style="fill:var(--warn)"/>
  <text x="640" y="146" class="s-sub">65 features, 693 rows (1.4)</text>
  <g style="stroke:var(--accent)" stroke-width="1.6" fill="none">
    <line x1="612" y1="150" x2="380" y2="150" marker-end="url(#ac-ah-17)"/>
    <line x1="620" y1="142" x2="620" y2="70" marker-end="url(#ac-ah-17)"/>
  </g>
  <text x="470" y="140" class="s-sub" text-anchor="middle" style="fill:var(--accent)">regularise, select, reduce</text>
  <text x="700" y="100" class="s-sub" style="fill:var(--accent)">more rows</text>
</svg>`
    },

    { t: "ladder",
      title: "Choosing a first model for a 300-row, 40-feature medical dataset",
      rungs: [
        { level: "bad", label: "A deep gradient booster, because it wins competitions", code: `HistGradientBoostingClassifier(max_iter=500, max_depth=6)`,
          note: "**Capacity far beyond what 300 rows can bound.** The training score will be perfect and the validation score a coin toss with a wide interval." },
        { level: "ok", label: "A regularised logistic regression", code: `LogisticRegressionCV(Cs=10, penalty="l2")`,
          note: "**Right side of the bound**: a parametric model with a strong bias, 41 parameters shrunk by validation. Misses interactions if they exist." },
        { level: "best", label: "Two biases, compared with their spread, and the simpler kept unless beaten", code: `LogisticRegressionCV(...)  vs  RandomForestClassifier(300, max_depth=3, min_samples_leaf=10)
# repeated stratified 5-fold; if the forest is not ahead by more than the spread, the logistic regression ships`,
          note: "**No free lunch says try a second bias; Occam says keep the first unless the second earns it.** A shallow, leafy forest is the non-parametric candidate that respects 300 rows." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Bounds, shattering and distances",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Using the finite-space PAC bound, how many rows guarantee ε = 0.02 with δ = 0.01 for a space of 2³⁰ hypotheses? How many for ε = 0.02, δ = 0.001? **(b)** State the VC dimension of a decision stump (one split on one feature) in 2-D and show by construction which labelling of three collinear points a stump cannot realise — then argue whether three non-collinear points can be shattered by a stump. **(c)** Reproduce the distance-ratio table for d ∈ {2, 20, 200} with 2,000 points, and add a column: the accuracy of 5-NN on a synthetic problem with 5 informative features padded with d − 5 pure-noise features, for d = 5, 20, 50, 200 (fixed n = 1,000). Explain the trend with the ratio column." }
      ],
      requirements: [
        "Both PAC numbers with the arithmetic shown.",
        "A concrete three-point labelling that a stump cannot produce, and a verdict on the VC dimension of stumps in 2-D.",
        "The executed KNN accuracies alongside the distance ratios, and one sentence linking them."
      ],
      hint: "For (b), think about points at x = 1, 2, 3 on a line with labels +, −, +: one threshold on x gives at most one sign change. For (c), `make_classification(n_informative=5, n_redundant=0, n_features=d)` pads with noise; scale the features before KNN.",
      solution: {
        lang: "python",
        title: "theory_practice.py",
        code: `# (a) m >= (1/eps)(ln|H| + ln(1/delta))
#   |H| = 2^30: ln|H| = 30 ln 2 = 20.79
#   eps = 0.02, delta = 0.01:    m >= 50 * (20.79 + 4.61) = 1,270 rows
#   eps = 0.02, delta = 0.001:   m >= 50 * (20.79 + 6.91) = 1,385 rows      <- ten times the confidence costs 115 rows; precision is the expensive term

# (b) a stump on a single feature is a threshold: predictions change sign at most once along that axis.
#   points x = 1, 2, 3 (collinear on the x-axis) labelled +, -, + need two sign changes -> impossible with a threshold on x;
#   and a threshold on y cannot separate them at all (they share y). So a stump does not shatter these three.
#   three non-collinear points: place them at (0,0), (1,1), (2,0) and label the middle one differently: a threshold on y at 0.5 works;
#   label an end point differently: a threshold on x works; so all 8 labellings are realised and the VC dimension of 2-D stumps is 3.
#   (in general, stumps in d dimensions have VC dimension that grows only logarithmically in d -- a very low-capacity class,
#    which is why AdaBoost can add hundreds of them, 6.3)

# (c)
from sklearn.datasets import make_classification
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
for d in [5, 20, 50, 200]:
    X, y = make_classification(1000, n_features=d, n_informative=5, n_redundant=0, random_state=0)
    acc = cross_val_score(make_pipeline(StandardScaler(), KNeighborsClassifier(5)), X, y, cv=5).mean()
    Z = rng.uniform(0, 1, (2000, d)); q = rng.uniform(0, 1, d); dist = np.linalg.norm(Z - q, axis=1)
    print(d, round(acc, 3), round(dist.min() / dist.max(), 3))
#   d      5-NN accuracy    nearest/farthest
#   5         0.956             0.084
#   20        0.834             0.385
#   50        0.773             0.537
#   200       0.633             0.745        <- the same five informative features; accuracy fell 32 points as noise dimensions were added
# accuracy falls steadily with d while the ratio rises toward 1: the five informative dimensions are drowned by
# d - 5 noise dimensions that contribute equally to every distance, so the 'nearest' neighbours are chosen mostly by noise.`,
        notes: [
          { t: "p", text: "**(a) shows the asymmetry**: confidence is logarithmic, precision is linear. Halving ε doubles the rows; making δ ten times smaller adds a constant." },
          { t: "p", text: "**(b) is the shattering argument in miniature**: capacity is about what the class can *express*, and a threshold expresses one sign change. Low-capacity classes are exactly what boosting is built from." },
          { t: "p", text: "**(c) is the curse as a KNN user meets it**: noise features are not neutral to a distance; each one adds an equal share of randomness. Feature selection before KNN is not optional in wide data (3.5, 5.1)." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "In 500 dimensions the nearest of 500 random points was 86 % as far as the farthest. What breaks?",
          options: [
            "Nothing; distances are still computed correctly",
            "Every method that relies on 'nearest' meaning something — KNN, k-means, RBF kernels, LOF — because the contrast between near and far has collapsed and the neighbour set is decided by noise",
            "Only linear models",
            "Only clustering"
          ],
          answer: 1,
          why: "The ratio rose from 0.002 in 1-D to 0.86 in 500-D. Distance-based methods need feature selection or dimensionality reduction first; trees and regularised linear models degrade differently."
        }
      ]
    }
  ],

  takeaways: [
    "**ERM minimises training loss as a proxy for true risk**; the gap is controlled by the capacity of the hypothesis space relative to n.",
    "**PAC sample complexity grows with ln|H|, not |H|**: capacity is cheap, precision (1/ε) is expensive, confidence (ln 1/δ) is nearly free.",
    "**VC dimension is the largest shatterable set**: 3 for lines in the plane (4 fails on XOR), d + 1 in general, infinite for RBF-SVM, 1-NN and unlimited trees.",
    "**The VC bound's slack scales like √(d/n)** — 0.27 for 10 features on 1,000 rows, vacuous for 100 features.",
    "**Every learner has an inductive bias**; without one, generalisation is impossible — that is no free lunch.",
    "**No free lunch in practice**: the hyperplane model won by nine points on linear data and lost by six on the moons; try candidate biases under CV.",
    "**Occam breaks ties toward simplicity**; it does not say simple beats better.",
    "**Parametric plateaus at its bias; non-parametric grows with data and pays in variance.**",
    "**Generative buys structure with assumptions; discriminative buys accuracy with data** — the asymptotic winner is whichever assumption is closer to true.",
    "**Lazy learners pay at prediction time and in memory** (382 ms vs 0.5 ms for 5,000 rows).",
    "**In high dimensions the nearest point is barely nearer than the farthest**; distance methods need feature selection or reduction first."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does the PAC bound contain ln|H| rather than |H|?",
        options: [
          "Because logs are convenient",
          "Because the probability that any one hypothesis looks good by luck decays exponentially in m, so the union bound over |H| hypotheses only needs m proportional to ln|H| to keep the total failure probability below δ",
          "Because hypotheses are independent",
          "Because |H| is always small"
        ],
        answer: 1,
        why: "Exponential concentration for one hypothesis, union bound over all of them, logarithm to solve for m. Doubling the space costs one row per unit of 1/ε."
      },
      {
        stem: "Which of these has infinite VC dimension?",
        options: [
          "A linear classifier in 10 dimensions",
          "1-nearest-neighbour — it reproduces any labelling of any finite training set exactly, so it shatters every set",
          "A decision stump",
          "Logistic regression with L2 regularisation"
        ],
        answer: 1,
        why: "Infinite VC dimension means the bound gives nothing; such models generalise only through their smoothness assumption and the data's actual structure — and cross-validation is the only guarantee."
      },
      {
        stem: "What is an algorithm's inductive bias, and why is it necessary?",
        options: [
          "A bug that causes systematic error",
          "The assumptions it uses to prefer some hypotheses over others on unseen inputs — linearity, locality, axis-aligned splits, independence; without any preference, every unseen input is equally likely to be anything, and no learning is possible",
          "The bias term in the bias–variance decomposition",
          "A property only of neural networks"
        ],
        answer: 1,
        why: "No free lunch is the formal version: averaged over all targets, all learners are equal. A learner wins on the targets its bias matches."
      },
      {
        stem: "Naive Bayes beat logistic regression at every training size on class-conditional cluster data and lost at every size on correlated-feature data. What does that show?",
        options: [
          "Naive Bayes is better for small data",
          "The generative model wins when its assumption about how the data was generated is close to true, and loses — at any n — when it is not; the textbook 'generative early, discriminative late' crossover is not guaranteed",
          "Logistic regression needs more features",
          "The experiments were flawed"
        ],
        answer: 1,
        why: "Measured, not assumed. The honest statement of Ng and Jordan's result is conditional on the generative assumption holding approximately."
      },
      {
        stem: "A KNN model on 50,000 rows fits in 3 ms and predicts 5,000 rows in 382 ms. Why, and what follows?",
        options: [
          "KNN is badly implemented",
          "It is a lazy learner: fitting stores the data and prediction searches it, so serving cost grows with the training set — fine for batch scoring, a problem for a latency-bound request path",
          "The features were not scaled",
          "5,000 rows is too many"
        ],
        answer: 1,
        why: "Eager learners pay once at training; lazy learners pay at every query. The choice is a deployment decision as much as a modelling one."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between parametric and non-parametric models?",
        strong: "A parametric model has a fixed number of parameters regardless of how much data it sees — linear and logistic regression, Naive Bayes, a network of fixed size. It makes strong assumptions, trains fast, needs little data, and plateaus at whatever error its assumptions impose. A non-parametric model's capacity grows with the data — KNN, kernel SVMs, trees and forests, Gaussian processes. It assumes little and can fit anything given enough rows, at the cost of more data, more variance, and often more compute at prediction time. The practical rule: with few rows per feature start parametric; with plenty, let a non-parametric model find the structure — and compare them under cross-validation, because which is better is a fact about the data, not about the models.",
        answer: [
          { t: "p", text: "Capacity-grows-with-n is the definition; 'plateaus at its assumptions' is the consequence worth saying." }
        ]
      },
      {
        level: "core",
        q: "Explain the curse of dimensionality.",
        strong: "As dimensions grow, data becomes sparse and distances lose contrast. With 500 uniform points, the nearest is a thousand times closer than the farthest in one dimension and only 14 % closer in five hundred — every point is roughly equidistant, and almost all of the volume sits near the boundary. That breaks anything built on distance: KNN, k-means, kernels, LOF. Trees suffer through more spurious splits to choose from; linear models through collinearity and the √(d/n) generalisation bound. The cures are feature selection, dimensionality reduction, regularisation, more data, and domain knowledge that keeps the dimensions that matter — and for distance methods, scaling and selection are not optional.",
        answer: [
          { t: "p", text: "Numbers for the ratio, the volume fact, and which methods break first — that is the full answer." }
        ]
      },
      {
        level: "advanced",
        q: "What are PAC learning and VC dimension, and how do they relate to what you do in practice?",
        strong: "PAC learning asks how many rows are needed for a learner to find a hypothesis within ε of the best with probability 1 − δ; for a finite space the answer is (1/ε)(ln|H| + ln 1/δ) — logarithmic in the space, linear in precision. For infinite spaces the VC dimension replaces ln|H|: the largest number of points the class can label in every possible way; a line in the plane shatters three points but not four, so its VC dimension is three, and d + 1 in general. The generalisation bound then has slack of order √(d/n). The bounds are loose in absolute terms, but they justify what practitioners do: regularise and select features to reduce effective capacity, get more rows when the ratio is bad, and choose models by validation — which is structural risk minimisation with the penalty measured rather than derived. Rademacher complexity is the refinement that measures capacity on the actual data and handles regularised classes.",
        answer: [
          { t: "p", text: "Definitions with numbers, the √(d/n) shape, and the link to regularisation and validation — theory that explains practice." }
        ]
      }
    ]
  }
});

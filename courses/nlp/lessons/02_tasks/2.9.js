/* ============================================================================
   LESSON 2.9 — Distance and Similarity: The Whole Family
   ========================================================================= */
EC.receiveLesson({
  id: "2.9",

  lede: "2.4 used cosine similarity and did not say why. **There are perhaps a dozen metrics in working use, they disagree with each other on the same pair of points, and the disagreement is the information** — Euclidean calls two points equally far from the centre that Mahalanobis separates by a factor of four, and a distribution shift that Jensen-Shannon cannot see at all, Wasserstein measures exactly. This lesson is the family, each one computed, and the rule for choosing.",

  objectives: [
    "Compute the Lp family and say what each member is sensitive to",
    "Explain when cosine and dot product rank identically, and when they do not",
    "Use Mahalanobis for correlated features, and say what whitening has to do with it",
    "Choose between KL, Jensen-Shannon and Wasserstein for comparing distributions",
    "Pick a metric for counts, for sets, for coordinates and for mixed-type records",
    "State what distance concentration does to nearest-neighbour search in high dimensions"
  ],

  prerequisites: ["2.4", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "The metric axioms, and who breaks them", id: "axioms" },

    {"kind": "trace", "title": "Which of them is actually a metric, and why you should care", "caption": "**The triangle inequality is the condition with consequences**, because it is what lets a ball tree or KD-tree discard a whole branch: if the query is far from a region's centre, everything inside is far too. Break it and the pruning is unsound. **Squared Euclidean breaks it and is used everywhere anyway**, because it ranks identically to Euclidean and skips a square root — safe wherever only the order matters, unsafe the moment the number is averaged or thresholded.", "left": "measure", "codeW": 170, "vars": ["symmetric", "triangle", "so it is"], "steps": [{"code": "Euclidean, Manhattan, Chebyshev", "state": ["yes", "yes", "a metric - pruning is sound"], "tone": "good"}, {"code": "cosine distance", "state": ["yes", "no", "not a metric"], "changed": [1, 2], "tone": "warn"}, {"code": "squared Euclidean", "state": ["yes", "no", "not one - but it is k-means inertia"], "changed": [2], "tone": "warn"}, {"code": "KL divergence", "state": ["NO", "no", "a divergence, not a distance"], "changed": [0, 2], "tone": "crit"}, {"code": "Jensen-Shannon distance", "state": ["yes", "yes", "a metric - the sqrt of the divergence"], "changed": [0, 1, 2], "tone": "good"}, {"code": "Bray-Curtis", "state": ["yes", "no", "not a metric"], "changed": [1, 2], "tone": "warn"}, {"code": "Wasserstein", "state": ["yes", "yes", "a metric"], "changed": [1, 2], "tone": "good"}], "t": "diagram", "id": "dg-2_9-01-0"},


    { t: "p", text: "A **metric** is a function on pairs of points obeying four conditions: it is never negative, it is zero exactly when the points are identical, it is symmetric, and it satisfies the triangle inequality — the direct route is never longer than a detour." },

    { t: "p", text: "Several of the most useful things in this lesson are not metrics, and that is worth knowing before you rely on one. **The triangle inequality is the condition with practical consequences**, because it is what lets a search structure prune: a ball tree or a KD-tree discards a whole branch by reasoning that if the query is far from a region's centre, everything inside that region is far too. Break the inequality and the pruning is no longer sound." },

    { t: "table",
      head: ["", "Symmetric", "Triangle inequality", "So it is"],
      rows: [
        ["Euclidean, Manhattan, Chebyshev", "yes", "yes", "a metric — tree pruning is sound"],
        ["Cosine **distance**", "yes", "no", "not a metric, though angular distance is"],
        ["Squared Euclidean", "yes", "no", "not a metric — but it is what k-means minimises"],
        ["KL divergence", "**no**", "no", "a divergence, not a distance"],
        ["Jensen-Shannon **distance**", "yes", "yes", "a metric — the square root of the divergence"],
        ["Bray-Curtis", "yes", "no", "not a metric"],
        ["Wasserstein", "yes", "yes", "a metric"]
      ] },

    { t: "callout", kind: "insight", title: "Why squared Euclidean is everywhere despite not being a metric",
      body: [
        { t: "p", text: "It avoids a square root, so it is cheaper, and **it ranks identically to Euclidean** — if you only need to know which point is nearest, the monotone transform is free. That is why `sklearn` works in squared distances internally and why k-means minimises the sum of squared distances, the quantity it calls inertia. The place it stops being safe is anywhere the number itself is used rather than its order: averaging distances, thresholding them, or feeding them to a tree that assumes the triangle inequality." }
      ] },

    { t: "h2", n: "02", text: "The Lp family: one formula, three familiar faces", id: "lp" },

    {"kind": "trace", "title": "7, 5, 4.4979, 4 - the whole story of p", "caption": "**One formula, and p decides how much a single large difference dominates.** The difference vector is (3, 4, 0): at p = 1 both count their full size and add to 7; as p rises the 4 takes over; at the limit Chebyshev returns 4 and has discarded the 3 entirely. **The unit ball is the picture to carry** — a diamond at L1, a circle at L2, a square at L∞ — and the diamond having its corners on the axes is exactly why L1 regularisation produces exact zeros where L2 does not.", "left": "p", "codeW": 130, "vars": ["value", "unit ball", "sensitive to"], "steps": [{"code": "1 - Manhattan", "state": ["7.0000", "a diamond", "every difference, additively"], "tone": "good"}, {"code": "2 - Euclidean", "state": ["5.0000", "a circle", "the balance - the default"], "changed": [0, 1, 2], "tone": "good"}, {"code": "3 - Minkowski", "state": ["4.4979", "between the two", "the larger difference"], "changed": [0, 1, 2], "tone": "accent"}, {"code": "inf - Chebyshev", "state": ["4.0000", "a square", "ONLY the worst coordinate"], "changed": [0, 1, 2], "tone": "violet"}, {"code": "squared Euclidean", "state": ["25.0000", "-", "the same order as L2, no sqrt"], "changed": [0, 1, 2], "tone": "warn"}], "t": "diagram", "id": "dg-2_9-02-1"},


    { t: "p", text: "Manhattan, Euclidean and Chebyshev are not three ideas. They are **one formula at three values of p**, and the parameter controls how much a single large difference dominates the total." },

    { t: "math", tex: "d_p(x, y) \\;=\\; \\left(\\sum_i |x_i - y_i|^{p}\\right)^{1/p}" },

    { t: "code", lang: "python", title: "one pair of points, the whole family",
      code: `import numpy as np
from scipy.spatial import distance

x = np.array([1.0, 2.0, 3.0])
y = np.array([4.0, 6.0, 3.0])
print("difference:", y - x)                     # [3. 4. 0.]

for p, name in [(1, "Manhattan  L1"), (2, "Euclidean  L2"), (3, "Minkowski  L3")]:
    print("  %-16s %.4f" % (name, distance.minkowski(x, y, p=p)))
print("  %-16s %.4f" % ("Chebyshev  Linf", distance.chebyshev(x, y)))
print("  %-16s %.4f" % ("squared Euclidean", distance.sqeuclidean(x, y)))`,
      out: `difference: [3. 4. 0.]
  Manhattan  L1    7.0000
  Euclidean  L2    5.0000
  Minkowski  L3    4.4979
  Chebyshev  Linf  4.0000
  squared Euclidean 25.0000`,
      caption: "**The sequence 7, 5, 4.4979, 4 is the whole story of p.** At p = 1 every difference counts its full size and they add: 3 + 4. As p rises the larger difference dominates, and at the limit only the largest survives — Chebyshev returns 4, having discarded the 3 entirely." },

    { t: "dl", items: [
      ["Manhattan (L1) — use when differences add", "Grid movement, and any case where a cost is incurred per unit of each coordinate separately. It is also the robust choice: one wild coordinate contributes its own size rather than its square, which is the same reason L1 regression resists outliers."],
      ["Euclidean (L2) — the default, and why", "Straight-line distance, rotation-invariant, and differentiable everywhere — which is why nearly every optimiser and every clustering algorithm is built on it. If you have no reason to choose otherwise, this is the reason to choose it."],
      ["Chebyshev (L∞) — use when the worst case is the cost", "It reports only the largest single difference, so it answers *\"how far off is the worst coordinate\"*. A tolerance check across many measurements is naturally Chebyshev: the part is out of spec if any dimension is out of spec."]
    ] },

    { t: "p", text: "The geometry is worth carrying as a picture. **The set of points at distance exactly 1 from the origin — the unit ball — has a different shape for each p**: a diamond at L1, a circle at L2, a square at L∞. That one image explains why L1 regularisation produces exact zeros and L2 does not, because a diamond has its corners on the axes and a circle has none." },

    { t: "h2", n: "03", text: "Cosine and dot product: when they agree", id: "cosine" },

    {"kind": "flow", "title": "No vector index offers cosine, and none needs to", "caption": "**On L2-normalised vectors, squared Euclidean equals 2 − 2·cos** — a decreasing function of cosine, so L2 search, inner-product search and cosine search return the same ranking. Normalise once at indexing time and the index's metric stops being a modelling decision. **The failure is forgetting one side:** normalise at indexing and not at query time and the scores are wrong in a way that still looks plausible — the ranking distorts rather than breaking, so nothing errors and recall quietly drops.", "cols": 3, "nodes": [{"id": "n", "label": "L2-normalise before add AND search", "sub": "both sides, or neither works", "tone": "violet"}, {"id": "i", "label": "IndexFlatIP returns cosine", "sub": "inner product on unit vectors", "tone": "good"}, {"id": "l", "label": "IndexFlatL2 returns the same ranking", "sub": "because ||a-b||^2 = 2 - 2cos", "tone": "good"}, {"id": "o", "label": "Normalise one side only", "sub": "plausible scores, distorted ranking", "tone": "crit"}, {"id": "s", "label": "Nothing errors; recall drops", "sub": "which is why it survives review", "tone": "crit"}], "edges": [["n", "i"], ["n", "l"], ["o", "s"]], "t": "diagram", "id": "dg-2_9-03-2"},


    { t: "p", text: "Cosine similarity measures the **angle** and ignores magnitude. The dot product measures the angle **and** the magnitudes together. For text this usually matters, because a longer document has a longer TF-IDF vector without being more about anything." },

    { t: "code", lang: "python", title: "the same direction, three times the length",
      code: `a = np.array([1.0, 0.0])
b = np.array([3.0, 0.0])      # same direction, 3x the magnitude
c = np.array([0.0, 1.0])      # orthogonal

print("cos(a,b) = %.4f   dot(a,b) = %.4f" % (1 - distance.cosine(a, b), a @ b))
print("cos(a,c) = %.4f   dot(a,c) = %.4f" % (1 - distance.cosine(a, c), a @ c))

an, bn = a / np.linalg.norm(a), b / np.linalg.norm(b)
print("normalised: dot = %.4f, cos = %.4f" % (an @ bn, 1 - distance.cosine(an, bn)))
print("and ||an-bn||^2 = %.4f  =  2 - 2*dot = %.4f"
      % (distance.sqeuclidean(an, bn), 2 - 2 * (an @ bn)))`,
      out: `cos(a,b) = 1.0000   dot(a,b) = 3.0000
cos(a,c) = 0.0000   dot(a,c) = 0.0000
normalised: dot = 1.0000, cos = 1.0000
and ||an-bn||^2 = 0.0000  =  2 - 2*dot = 0.0000`,
      caption: "**The last line is the identity that matters operationally.** On L2-normalised vectors, squared Euclidean equals 2 − 2·cos, which is a decreasing function of cosine — so Euclidean search, dot-product search and cosine search return the *same* ranking. Normalise once at indexing time and the choice of index metric stops being a modelling decision." },

    { t: "callout", kind: "trap", title: "A vector index does not offer you cosine",
      body: [
        { t: "p", text: "FAISS gives you `IndexFlatIP` for inner product and `IndexFlatL2` for Euclidean, and there is no cosine index — because there does not need to be one. **Cosine search is inner-product search on normalised vectors**, so you normalise before `add` and before `search`, and `IndexFlatIP` is then returning cosine." },
        { t: "p", text: "The failure is forgetting one side. Normalise at indexing and not at query time and the scores are wrong in a way that still looks plausible — the ranking is distorted rather than broken, so nothing errors and recall quietly drops. Maximum inner product search is often written **MIPS**, and the name is a reminder that the index is doing something specific that only coincides with cosine when you have done your part." }
      ] },

    { t: "h2", n: "04", text: "Mahalanobis: distance that knows the data's shape", id: "mahalanobis" },

    {"kind": "trace", "title": "Euclidean says 2.83 twice; Mahalanobis says 2.04 and 9.04", "caption": "**The features correlate at 0.9, so one being high while the other is low almost never happens** — and Euclidean cannot express that, because it has no idea the features are related. A factor of four and a half between two points it calls equidistant is why Mahalanobis is the standard multivariate outlier tool: a record whose every individual field is unremarkable can still be an impossible combination. **And it is just Euclidean distance after whitening**, which is both the one-sentence explanation and a cheaper implementation route.", "left": "point", "codeW": 160, "vars": ["Euclidean", "Mahalanobis", "reading"], "steps": [{"code": "along  (2, 2)", "state": ["2.8284", "2.0397", "ordinary - the data goes this way"], "tone": "good"}, {"code": "across (2, -2)", "state": ["2.8284", "9.0402", "implausible combination"], "changed": [1, 2], "tone": "crit"}, {"code": "the ratio", "state": ["1.0", "4.4x", "Euclidean sees nothing"], "changed": [0, 1, 2], "tone": "violet"}, {"code": "and the catch", "state": ["-", "Sigma must be invertible", "shrink it, or reduce the dimension"], "changed": [0, 1, 2], "tone": "warn"}], "t": "diagram", "id": "dg-2_9-04-3"},


    { t: "p", text: "Every metric so far treats the axes as independent and equally scaled. **Mahalanobis does not**: it measures distance in units of the data's own variability, using the inverse covariance matrix, so a step along a direction the data varies in counts for less than the same step across one it does not." },

    { t: "math", tex: "d_M(x, y) \\;=\\; \\sqrt{(x - y)^{\\top} \\Sigma^{-1} (x - y)}" },

    { t: "code", lang: "python", title: "two points Euclidean says are equidistant",
      code: `rng = np.random.default_rng(0)
cov = np.array([[1.0, 0.9], [0.9, 1.0]])          # strongly correlated features
X = rng.multivariate_normal([0.0, 0.0], cov, size=5000)
VI = np.linalg.inv(np.cov(X.T))
mean = np.array([0.0, 0.0])

for name, pt in [("along  (2, 2)", np.array([2.0, 2.0])),
                 ("across (2,-2)", np.array([2.0, -2.0]))]:
    print("  %-14s euclidean %.4f   mahalanobis %.4f"
          % (name, np.linalg.norm(pt - mean), distance.mahalanobis(pt, mean, VI)))`,
      out: `  along  (2, 2)  euclidean 2.8284   mahalanobis 2.0397
  across (2,-2)  euclidean 2.8284   mahalanobis 9.0402`,
      caption: "**Euclidean gives both points 2.8284. Mahalanobis gives 2.04 and 9.04 — a factor of four and a half.** The second point is genuinely strange: the features correlate at 0.9, so one being high while the other is low almost never happens. Euclidean cannot express that, because it has no idea the features are related." },

    { t: "p", text: "That factor of four and a half is why Mahalanobis is the standard tool for **multivariate outlier detection**. A record whose every individual field is unremarkable can still be an impossible combination, and Euclidean distance from the centroid will never flag it." },

    { t: "callout", kind: "good", title: "Whitening makes Mahalanobis into Euclidean",
      body: [
        { t: "p", text: "Mahalanobis distance in the original space is exactly Euclidean distance after a linear transform that decorrelates the features and scales each to unit variance — **whitening**. That is a useful fact twice over: it explains what the metric is doing in one sentence, and it gives you an implementation route, because whitening once and using plain Euclidean afterwards is cheaper than a quadratic form per pair, and it lets you keep using an index that only supports L2." },
        { t: "p", text: "The catch is the covariance estimate. It must be inverted, so it must be well-conditioned — with more features than samples, or two near-duplicate features, the inverse is unstable and the distances become noise. Use a shrinkage estimator, or reduce the dimension first." }
      ] },

    { t: "h2", n: "05", text: "Comparing distributions: KL, Jensen-Shannon, Wasserstein", id: "distributions" },

    {"kind": "trace", "title": "The shift Jensen-Shannon cannot see", "caption": "**Wasserstein returned 1, 5 and 50 for shifts of 1, 5 and 50. Jensen-Shannon returned 0.8326 for all three.** Once the supports are disjoint, every divergence built on pointwise probability ratios is saturated — it can say the distributions do not overlap and nothing about how far apart they are, so a sensor drifting by one unit and by fifty are the same number. **KL has the same blind spot and two more besides:** it is asymmetric, 0.3195 one way and 0.3713 the other, and it is infinite the moment the second distribution has a zero where the first does not.", "left": "measure", "codeW": 160, "vars": ["symmetric", "finite always", "sees distance", "use for"], "steps": [{"code": "KL divergence", "state": ["no - 0.3195 vs 0.3713", "no - inf on a zero", "no", "a loss term"], "tone": "crit"}, {"code": "Jensen-Shannon", "state": ["yes", "yes, bounded", "no - 0.8326 for all", "categorical drift"], "changed": [0, 1, 2, 3], "tone": "good"}, {"code": "Wasserstein", "state": ["yes", "yes", "YES - 1, 5, 50", "numeric drift"], "changed": [2, 3], "tone": "violet"}], "t": "diagram", "id": "dg-2_9-05-4"},


    { t: "p", text: "A different problem: the objects being compared are **distributions** rather than points. This is the drift question — is this week's token distribution the same as last month's — and the three answers in common use behave very differently." },

    { t: "code", lang: "python", title: "asymmetry, and an infinity",
      code: `from scipy.stats import entropy

P = np.array([0.1, 0.4, 0.5])
Q = np.array([0.4, 0.4, 0.2])

print("KL(P||Q) = %.4f   KL(Q||P) = %.4f" % (entropy(P, Q), entropy(Q, P)))
print("Jensen-Shannon distance = %.4f" % distance.jensenshannon(P, Q))

Qz = np.array([0.5, 0.5, 0.0])        # Q assigns zero where P does not
print("KL(P||Qz) =", entropy(P, Qz))`,
      out: `KL(P||Q) = 0.3195   KL(Q||P) = 0.3713
Jensen-Shannon distance = 0.2853
KL(P||Qz) = inf`,
      caption: "**KL is not symmetric — 0.3195 one way and 0.3713 the other — so “the KL between P and Q” is an incomplete sentence.** And it is infinite whenever the second distribution assigns zero probability to something the first does not, which in practice means a token that appeared this week and not last month makes your drift metric infinite." },

    { t: "p", text: "Jensen-Shannon fixes both problems by comparing each distribution to their average. It is symmetric, always finite, and bounded — and its square root is a true metric, which is what `scipy` returns. **For a drift dashboard it is almost always the right choice over raw KL.**" },

    { t: "p", text: "But both share a blind spot, and it is a serious one." },

    { t: "code", lang: "python", title: "the shift that Jensen-Shannon cannot see",
      code: `from scipy.stats import wasserstein_distance

u = np.array([0.0, 1.0, 2.0])
disjoint_js = distance.jensenshannon(np.array([1/3, 1/3, 1/3, 0, 0, 0]),
                                    np.array([0, 0, 0, 1/3, 1/3, 1/3]))

for shift in (1.0, 5.0, 50.0):
    print("  shift %5.1f   wasserstein %6.2f   JS %.4f"
          % (shift, wasserstein_distance(u, u + shift), disjoint_js))`,
      out: `  shift   1.0   wasserstein   1.00   JS 0.8326
  shift   5.0   wasserstein   5.00   JS 0.8326
  shift  50.0   wasserstein  50.00   JS 0.8326`,
      caption: "**Wasserstein returns the shift exactly; Jensen-Shannon returns 0.8326 for all three.** Once the supports are disjoint, every divergence based on pointwise probability ratios is saturated — it can tell you the distributions do not overlap and nothing about how far apart they are. A sensor reading drifting by 1 unit and by 50 are the same number to KL and to JS." },

    { t: "p", text: "Wasserstein distance — the **earth mover's distance** — asks the minimum total work to transport one distribution into the other, so geometry on the underlying axis is part of the answer. That is also the reason it is the harder one to compute in general, and the reason it is the right metric for continuous quantities where *how far* the shift went is the question." },

    { t: "table",
      head: ["", "Symmetric", "Finite always", "Sees distance", "Use for"],
      rows: [
        ["KL divergence", "no", "no", "no", "A loss term, where asymmetry is intended"],
        ["Jensen-Shannon", "yes", "yes", "no", "Categorical drift — tokens, labels, classes"],
        ["Wasserstein", "yes", "yes", "**yes**", "Numeric drift — scores, latencies, embeddings"]
      ] },

    { t: "h2", n: "06", text: "Counts, sets, coordinates and mixed records", id: "others" },

    {"kind": "trace", "title": "One pair of counts, three metrics, three verdicts", "caption": "**The 0-against-1 coordinate is the entire disagreement.** Euclidean sees a difference of 1 among numbers like 10 and 12, and shrugs. Canberra divides each difference by the sum of that pair, so 0 → 1 is a *complete* change contributing a full 1.0 — which is why it dominates at 1.09. Bray-Curtis normalises by the grand total instead, so the same coordinate barely moves it. **Pick by whether a change from zero is meaningful or is noise**, because Canberra will amplify exactly whichever it is.", "left": "on [10, 0, 3] vs [12, 1, 3]", "codeW": 200, "vars": ["value", "what drove it"], "steps": [{"code": "Canberra", "state": ["1.0909", "the 0->1 term alone contributes 1.0"], "tone": "violet"}, {"code": "Euclidean", "state": ["2.2361", "the 10->12 term; the zero barely registers"], "changed": [0, 1], "tone": "warn"}, {"code": "Bray-Curtis", "state": ["0.1034", "differences over the grand total"], "changed": [0, 1], "tone": "accent"}, {"code": "Jaccard / Dice, on sets", "state": ["0.5000 / 0.6667", "Dice = 2J/(1+J): identical ranking"], "changed": [0, 1], "tone": "good"}, {"code": "Gower, on mixed records", "state": ["0.3325", "city mismatch 1.0, spend only 0.03"], "changed": [0, 1], "tone": "good"}, {"code": "Haversine vs degrees", "state": ["1739.8 km vs 15.6471", "degrees are not a unit"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-2_9-06-5"},


    { t: "p", text: "Four more, each the right answer to a specific shape of data that the Lp family handles badly." },

    { t: "code", lang: "python", title: "Jaccard, Dice, and the identity between them",
      code: `s1, s2 = {"red", "blue", "green"}, {"blue", "green", "yellow"}
inter, union = len(s1 & s2), len(s1 | s2)
jac = inter / union
dice = 2 * inter / (len(s1) + len(s2))
print("Jaccard %.4f   Dice %.4f   and 2J/(1+J) = %.4f" % (jac, dice, 2 * jac / (1 + jac)))`,
      out: `Jaccard 0.5000   Dice 0.6667   and 2J/(1+J) = 0.6667`,
      caption: "**Dice is a monotone function of Jaccard**, so the two always rank a set of candidates identically and the choice between them is about the number you want to report, not about the ordering. Dice is more forgiving — it double-counts the intersection — which is why it reads better on a dashboard." },

    { t: "code", lang: "python", title: "counts, where relative difference is the point",
      code: `cu = np.array([10.0, 0.0, 3.0])
cv = np.array([12.0, 1.0, 3.0])

print("Canberra    %.4f" % distance.canberra(cu, cv))
print("Bray-Curtis %.4f" % distance.braycurtis(cu, cv))
print("Euclidean   %.4f" % distance.euclidean(cu, cv))`,
      out: `Canberra    1.0909
Bray-Curtis 0.1034
Euclidean   2.2361`,
      caption: "**The 0-against-1 coordinate is the whole disagreement.** Euclidean sees a difference of 1 and shrugs. Canberra divides each difference by the sum of the pair, so going from 0 to 1 is a *complete* change and contributes a full 1.0 — which is why Canberra dominates at 1.09. Bray-Curtis normalises by the grand total instead, so the same coordinate barely moves it." },

    { t: "dl", items: [
      ["Canberra — when a change from zero matters", "Each term is divided by the magnitude of that coordinate, so small counts carry as much weight as large ones. Right for sparse count data where presence against absence is meaningful; wrong when near-zero coordinates are mostly noise, because it will amplify exactly that noise."],
      ["Bray-Curtis — proportional overall dissimilarity", "Total absolute difference over total abundance, bounded in [0, 1] for non-negative data. The standard choice in ecology for comparing species counts, and the same reasoning applies to any composition — topic mixtures, traffic by category. Not a metric, so no tree pruning."]
    ] },

    { t: "code", lang: "python", title: "coordinates on a sphere, and mixed-type records",
      code: `def haversine(lat1, lon1, lat2, lon2, R=6371.0):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dp, dl = p2 - p1, np.radians(lon2 - lon1)
    h = np.sin(dp / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(h))

print("Bengaluru to Delhi: %.1f km" % haversine(12.9716, 77.5946, 28.6139, 77.2090))
print("euclidean on the raw degrees: %.4f"
      % np.linalg.norm([28.6139 - 12.9716, 77.2090 - 77.5946]))

# Gower: scale each numeric column by its range, score each categorical 0 or 1, average.
A = dict(age=34, spend=1200.0, city="Bengaluru", active=True)
B = dict(age=52, spend=1350.0, city="Pune",      active=True)
RANGE = dict(age=60.0, spend=5000.0)

terms = [abs(A[k] - B[k]) / RANGE[k] for k in ("age", "spend")]
terms += [0.0 if A["city"] == B["city"] else 1.0,
          0.0 if A["active"] == B["active"] else 1.0]
for n, t in zip(["age", "spend", "city", "active"], terms):
    print("  %-7s contributes %.4f" % (n, t))
print("Gower = %.4f" % np.mean(terms))`,
      out: `Bengaluru to Delhi: 1739.8 km
euclidean on the raw degrees: 15.6471
  age     contributes 0.3000
  spend   contributes 0.0300
  city    contributes 1.0000
  active  contributes 0.0000
Gower = 0.3325`,
      caption: "**15.6471 is a number with no unit** — a degree of longitude is 111 km at the equator and nothing at the pole, so Euclidean on latitude and longitude is not a distance. Haversine gives kilometres. And the Gower breakdown shows why it exists: on the raw numbers the spend difference of 150 would swamp everything, while here each column contributes at most 1 and the city mismatch is the largest term." },

    { t: "callout", kind: "good", title: "Gower is the record-linkage shape",
      body: [
        { t: "p", text: "A customer record is a name, an address, an age, a city and some flags — numeric, categorical and boolean together, which no Lp distance can take at all. Gower handles each column in its own natural way and averages, which makes it the natural metric for the deduplication problem module 8 works on. **The parameter you must own is the per-column range**, because it is what sets the exchange rate between a year of age and a change of city, and the default of the observed range is a choice rather than a fact." }
      ] },

    { t: "h2", n: "07", text: "Distance concentration, measured", id: "concentration" },

    {"kind": "trace", "title": "The farthest point goes from 53x to 12% farther", "caption": "**That is why every vector database is more complicated than a linear scan.** The nearest neighbour still exists in a thousand dimensions, but it is barely distinguishable from the farthest, so a little noise reorders the results and a pruning bound excludes almost nothing — exact tree search degenerates to a scan. **Approximate indexes are forced by this table, not chosen.** Note also where the contrast crosses 1.0: somewhere between 10 and 100 dimensions, far below any real embedding.", "left": "dimensions", "codeW": 130, "vars": ["nearest distance", "(max-min)/min", "what it means"], "steps": [{"code": "2", "state": ["0.021", "53.127", "neighbours are obvious"], "tone": "good"}, {"code": "10", "state": ["0.550", "2.256", "still 3x contrast"], "changed": [0, 1, 2], "tone": "good"}, {"code": "100", "state": ["3.366", "0.423", "contrast below 1.0"], "changed": [0, 1, 2], "tone": "warn"}, {"code": "1000", "state": ["12.281", "0.122", "farthest is 12% farther"], "changed": [0, 1, 2], "tone": "crit"}, {"code": "so you need", "state": ["HNSW or IVF", "normalise; reduce dimension", "approximate, by necessity"], "changed": [0, 1, 2], "tone": "violet"}], "t": "diagram", "id": "dg-2_9-07-6"},


    { t: "p", text: "One property of high-dimensional space undermines the idea of a nearest neighbour, and it is the reason every vector database is more complicated than a linear scan." },

    { t: "code", lang: "python", title: "the contrast between nearest and farthest, as dimension grows",
      code: `print(" dim   nearest   (max-min)/min")
for dim in (2, 10, 100, 1000):
    pts = rng.random((1000, dim))
    q = rng.random(dim)
    ds = np.linalg.norm(pts - q, axis=1)
    print("  %4d    %.3f        %.3f" % (dim, ds.min(), (ds.max() - ds.min()) / ds.min()))`,
      out: ` dim   nearest   (max-min)/min
     2    0.021        53.127
    10    0.550        2.256
   100    3.366        0.423
  1000   12.281        0.122`,
      caption: "**In two dimensions the farthest point is 53 times farther than the nearest. In a thousand, it is 12% farther.** The nearest neighbour still exists, but it is barely distinguishable from the farthest one — so a small amount of noise reorders the results, and the distances cluster so tightly that a pruning bound rarely excludes anything." },

    { t: "dl", items: [
      ["Why approximate search exists", "Exact nearest-neighbour search in high dimensions degenerates to a scan, because tree pruning needs the distances to be spread out and they are not. HNSW and IVF give up exactness in return for sub-linear search, and that trade is forced by the numbers above rather than chosen."],
      ["Why cosine survives better than Euclidean", "Concentration affects magnitudes most. Normalising to the unit sphere discards magnitude, so the remaining signal is angular — which is part of why text embeddings are compared by cosine and why normalisation is standard practice rather than a preference."],
      ["Why dimensionality reduction helps retrieval", "Not only for speed. Projecting 1,000 dimensions to 100 restores contrast between neighbours, and the ranking can get *better* as well as faster — which is the argument for Matryoshka embeddings, where the first 128 dimensions of a vector are usable on their own."]
    ] },

    { t: "h2", n: "08", text: "Choosing, in one page", id: "choosing" },

    {"kind": "tree", "title": "What counts as a difference in this data?", "caption": "**Answer that question first, then find the row — the table is an index, not a decision procedure.** Each metric is a different answer to it: cosine says magnitude is not a difference, Mahalanobis says a difference along a correlated direction is smaller than it looks, Canberra says a difference from zero is total, Gower says a difference must first be put on a per-column scale. **And since the metric is a modelling decision, it is a thing to measure** — evaluate two candidates on a labelled set rather than reasoning about which should win.", "root": {"label": "What kind of object are you comparing?", "sub": "the question behind every row", "tone": "accent", "children": [{"label": "Vectors", "sub": "embeddings, TF-IDF, features", "tone": "good", "children": [{"label": "Normalised: cosine or inner product", "sub": "direction is the signal", "tone": "good"}, {"label": "Magnitude matters: Euclidean", "sub": "size is information", "tone": "good"}, {"label": "Correlated features: Mahalanobis", "sub": "or whiten, then Euclidean", "tone": "teal"}]}, {"label": "Distributions", "sub": "the drift question", "tone": "violet", "children": [{"label": "Categorical: Jensen-Shannon", "sub": "symmetric and finite where KL is not", "tone": "violet"}, {"label": "Numeric: Wasserstein", "sub": "the only one that sees how far", "tone": "violet"}]}, {"label": "Sets and counts", "sub": "tokens, shingles, abundances", "tone": "accent", "children": [{"label": "Sets: Jaccard or Dice", "sub": "they rank identically", "tone": "accent"}, {"label": "Zero matters: Canberra", "sub": "otherwise Bray-Curtis", "tone": "accent"}]}, {"label": "Something else entirely", "sub": "coordinates, mixed records, tolerances", "tone": "warn", "children": [{"label": "Haversine, Gower, Chebyshev", "sub": "degrees are not a unit of distance", "tone": "warn"}]}]}, "t": "diagram", "id": "dg-2_9-08-7"},

    { t: "table",
      head: ["Your data", "Metric", "Why"],
      rows: [
        ["Normalised embeddings", "Cosine / inner product", "Direction is the signal; normalise and the index metric stops mattering"],
        ["Unnormalised vectors where size matters", "Euclidean", "Magnitude is information, not noise"],
        ["Correlated numeric features", "Mahalanobis", "Equal Euclidean distances can differ fourfold in plausibility"],
        ["Sets of tokens or shingles", "Jaccard or Dice", "They rank identically; pick the number you want to report"],
        ["Sparse counts where zero matters", "Canberra", "Relative difference, so 0 → 1 is a complete change"],
        ["Compositions and abundances", "Bray-Curtis", "Proportional, bounded, and standard in that literature"],
        ["Categorical distributions", "Jensen-Shannon", "Symmetric and finite where KL is neither"],
        ["Numeric distributions", "Wasserstein", "The only one that sees *how far* the shift went"],
        ["Latitude and longitude", "Haversine", "Degrees are not a unit of distance"],
        ["Mixed-type records", "Gower", "Per-column handling, and you own the ranges"],
        ["A tolerance across measurements", "Chebyshev", "The worst coordinate is the decision"]
      ] },

    { t: "callout", kind: "mental", title: "The question behind all of them",
      body: [
        { t: "p", text: "Every row above is an answer to **what counts as a difference in this data**. Cosine says magnitude is not a difference. Mahalanobis says a difference along a correlated direction is smaller than it looks. Canberra says a difference from zero is total. Gower says a difference must first be put on a common scale per column. Wasserstein says a difference should be measured in the units of the axis." },
        { t: "p", text: "So the right way to choose is not to consult the table first but to answer that question about your own data, and then find the row. **And if the metric is a modelling decision, it is a thing to measure** — evaluate retrieval with two metrics on a labelled set rather than reasoning about which should be better, because the reasoning above tells you what each one is sensitive to and only the measurement tells you whether your data has that sensitivity in it." }
      ] },

    { t: "exercise", kind: "practice", title: "Make each metric be the one that is right", difficulty: "core", minutes: 26,
      prompt: "Construct, for each of these, a concrete pair of records where the named metric gives the sensible answer and Euclidean does not: (a) cosine, (b) Mahalanobis, (c) Canberra, (d) Haversine, (e) Gower. Compute both numbers in each case. Then take an embedding set you have, index it twice in FAISS — once with IndexFlatIP on normalised vectors and once with IndexFlatL2 on the same normalised vectors — and confirm the top-10 are identical. Finally reproduce the concentration table at dim 2, 10, 100 and 1000 and note the dimension at which the contrast drops below 1.0.",
      hints: [
        "For (a) the easy construction is one document repeated twice — same direction, double the length.",
        "For (c) you need a coordinate that is 0 in one record and small-but-nonzero in the other.",
        "The FAISS check should hold exactly; if it does not, you normalised one side only."
      ],
      solution: {
        notes: [
          { t: "p", text: "The two indexes agreeing is the practical payoff of the identity in section 03, and the reason the exercise asks you to confirm it rather than take it: once you have seen that `IndexFlatL2` and `IndexFlatIP` return the same top-10 on normalised vectors, the question *“which metric does my vector database support”* stops being a modelling worry and becomes a normalisation checklist item." },
          { t: "p", text: "Between 10 and 100 dimensions the contrast falls below 1.0 — the farthest point stops being even twice as far as the nearest. That is a long way below the dimension of any real embedding, which is the honest framing of why approximate search is not a shortcut but the only available option." }
        ]
      } }

  ],

  takeaways: [
    "**Manhattan, Euclidean and Chebyshev are one formula at three values of p** — 7, 5 and 4 on the same pair — and p controls how much one large difference dominates.",
    "**The unit ball's shape is the picture to carry:** a diamond at L1, a circle at L2, a square at L∞ — and the diamond's corners on the axes are why L1 produces exact zeros.",
    "**Squared Euclidean is not a metric and is used everywhere**, because it ranks identically to Euclidean and skips a square root. It is what k-means calls inertia.",
    "**Cosine ignores magnitude; the dot product does not.** On L2-normalised vectors, squared Euclidean equals 2 − 2·cos, so cosine, dot-product and Euclidean search return the same ranking.",
    "**No vector index offers cosine, because none needs to** — normalise before `add` and before `search`, and inner product *is* cosine. Normalising one side only distorts the ranking without erroring.",
    "**Mahalanobis measures distance in units of the data's variability** — 2.04 along a correlated direction against 9.04 across it, where Euclidean calls both 2.83. It is Euclidean distance after whitening.",
    "**KL is asymmetric and goes infinite** when the second distribution has a zero where the first does not — a single new token makes a drift metric infinite.",
    "**Jensen-Shannon is symmetric, finite and bounded**, and its square root is a metric. It is the right default for categorical drift.",
    "**Both KL and JS saturate on disjoint supports:** Wasserstein returned 1, 5 and 50 for shifts of 1, 5 and 50 where JS returned 0.8326 for all three. Use Wasserstein for numeric drift.",
    "**Dice is a monotone function of Jaccard** (Dice = 2J/(1+J)), so they always rank identically — the choice is about the reported number.",
    "**Canberra treats a change from zero as total** (1.09 where Euclidean said 2.24 and Bray-Curtis 0.10); Bray-Curtis is proportional and bounded.",
    "**Euclidean on latitude and longitude is not a distance** — a degree of longitude is 111 km at the equator and nothing at the pole. Use Haversine.",
    "**Gower is the mixed-type metric:** scale each numeric column by its range, score each categorical 0 or 1, average — and the ranges are an exchange rate you own.",
    "**Distance concentration is why approximate search exists:** the farthest point is 53× farther than the nearest at 2 dimensions and 12% farther at 1,000.",
    "**Choose by asking what counts as a difference in your data**, then measure the candidates on a labelled set rather than reasoning about which should win."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Embeddings are L2-normalised and indexed in FAISS with `IndexFlatL2`. A colleague says the retrieval is wrong because the model was trained with cosine similarity. What is the correct response?",
        options: [
          "They are right — rebuild the index with a cosine metric",
          "The ranking is identical: on normalised vectors ‖a−b‖² = 2 − 2·cos, a decreasing function of cosine, so L2 and cosine order the results the same way",
          "They are right — FAISS cannot do cosine at all",
          "It only matters if the vectors have more than 512 dimensions"
        ],
        answer: 1,
        why: "There is no cosine index in FAISS because none is needed. The thing actually worth checking is that normalisation happens on both the indexing and the query path — doing it on one side distorts the ranking silently."
      },
      {
        stem: "Two records sit at the same Euclidean distance from the centroid of a dataset whose two features correlate at 0.9. Mahalanobis scores them 2.04 and 9.04. What does that tell you?",
        options: [
          "The covariance matrix was estimated incorrectly",
          "One record moves along the direction the data varies in and the other moves across it — the second is an implausible combination of individually unremarkable values",
          "Mahalanobis distance is not reliable with correlated features",
          "The features should be dropped"
        ],
        answer: 1,
        why: "This is the case Euclidean distance structurally cannot see, and it is why Mahalanobis is the standard multivariate outlier tool. The caveat is the inverse: with near-duplicate features or more features than samples, the covariance is ill-conditioned and the distances become noise."
      },
      {
        stem: "A drift monitor on a numeric latency distribution reports the same Jensen-Shannon value whether latencies shifted by 1 ms or by 50 ms. Why, and what should it use?",
        options: [
          "JS is broken for continuous data; use KL",
          "Once the supports are disjoint, every divergence built on pointwise probability ratios saturates — it reports non-overlap, not magnitude. Wasserstein measures the shift in the units of the axis",
          "The bin count is wrong; more bins would fix it",
          "It should compare means instead"
        ],
        answer: 1,
        why: "The measurement showed JS pinned at 0.8326 for shifts of 1, 5 and 50 while Wasserstein returned 1, 5 and 50. KL has the same blind spot and is also asymmetric and unbounded, so it is a worse choice, not a better one."
      },
      {
        stem: "Comparing sparse count vectors where one coordinate is 0 in record A and 1 in record B, which metric treats that as a large difference?",
        options: [
          "Euclidean — the difference is 1",
          "Canberra — each term is divided by the magnitude of that coordinate, so 0 → 1 is a complete change contributing a full 1.0",
          "Bray-Curtis — it normalises by the grand total",
          "Chebyshev — it takes the maximum"
        ],
        answer: 1,
        why: "The measured values on one pair were Canberra 1.09, Euclidean 2.24 and Bray-Curtis 0.10, and the entire disagreement came from that coordinate. The flip side is that Canberra amplifies noise in near-zero coordinates, so it is right only when presence against absence is genuinely meaningful."
      },
      {
        stem: "Why is exact nearest-neighbour search impractical for 1,000-dimensional embeddings?",
        options: [
          "The distance computation is too slow per pair",
          "Distances concentrate — the farthest of 1,000 random points was only 12% farther than the nearest, so pruning bounds exclude almost nothing and a tree degenerates to a scan",
          "Floating-point precision is insufficient",
          "Euclidean distance is undefined above 256 dimensions"
        ],
        answer: 1,
        why: "Per-pair cost is linear in the dimension and not the problem; the loss of contrast is. It is also why normalising and comparing by angle holds up better than comparing magnitudes, and why reducing the dimension can improve ranking as well as speed."
      },
      {
        stem: "Which metric should compare two customer records holding age, total spend, city and an active flag?",
        options: [
          "Euclidean on the numeric columns, ignoring the rest",
          "Gower — each numeric column scaled by its range, each categorical scored 0 or 1, then averaged, so all four columns contribute comparably",
          "Cosine, after one-hot encoding everything",
          "Jaccard on the categorical columns only"
        ],
        answer: 1,
        why: "No Lp distance accepts mixed types at all, and the first option discards half the record while letting spend dominate what remains — 151.08 on the worked pair, essentially the spend difference. The parameter to own in Gower is the per-column range, since it sets the exchange rate between a year of age and a change of city."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "When would you use cosine similarity rather than Euclidean distance?",
        strong: "When direction carries the signal and magnitude does not — text being the standard case, since a longer document has a longer TF-IDF vector without being more about anything. And on L2-normalised vectors the distinction disappears: squared Euclidean is 2 − 2·cos, so both give the same ranking.",
        answer: [
          { t: "p", text: "The identity is what separates a memorised answer from an understood one, and it has a practical payoff: it is why no vector index offers a cosine metric." },
          { t: "p", text: "A strong answer adds the operational trap — normalising at indexing time but not at query time distorts the ranking without raising anything, so recall drops quietly." },
          { t: "p", text: "Naming the case against cosine shows judgement too. If magnitude is information — counts, amounts, intensities — then discarding it is throwing away signal, and Euclidean is the right choice." }
        ]
      },
      {
        level: "advanced",
        q: "You are monitoring a model for drift. Which distance do you use?",
        strong: "It depends on what is being compared. For categorical distributions — tokens, predicted labels — Jensen-Shannon, because KL is asymmetric and goes infinite the moment a category appears that was absent before. For numeric quantities — scores, latencies, embedding components — Wasserstein, because KL and JS both saturate once supports stop overlapping and cannot distinguish a small shift from a large one.",
        answer: [
          { t: "p", text: "Splitting the answer by data type is the structure that matters; a single named metric for all drift is the weaker answer." },
          { t: "p", text: "The saturation point is the one that shows real monitoring experience — a dashboard that reports the same number for a 1-unit and a 50-unit shift looks like it is working." },
          { t: "p", text: "The best answers mention that the infinite-KL case is routine rather than exotic: a new token or a new category arrives every week in production, so the metric that cannot handle a zero is the metric that alerts on nothing useful." }
        ]
      },
      {
        level: "advanced",
        q: "Why does high dimensionality break nearest-neighbour search, and what do you do about it?",
        strong: "Distances concentrate: as dimension grows the nearest and farthest points become nearly equidistant — I have measured the farthest at 53× the nearest in 2 dimensions and 12% farther in 1,000. Pruning bounds then exclude almost nothing, so exact tree search degenerates to a scan. The responses are approximate indexes like HNSW or IVF, normalising so the comparison is angular, and reducing dimension.",
        answer: [
          { t: "p", text: "Having a number for it is the difference between repeating the curse of dimensionality and having looked at it. The conclusion follows from the number rather than from the slogan." },
          { t: "p", text: "The subtle point worth making: dimensionality reduction can improve ranking quality and not merely speed, because restoring contrast between neighbours makes the ordering more stable. That is the reasoning behind Matryoshka embeddings." },
          { t: "p", text: "A candidate who notes that the per-pair computation is not the bottleneck — it is linear in dimension and perfectly cheap — has located the problem correctly, which is the thing the question is really testing." }
        ]
      }
    ]
  }
});

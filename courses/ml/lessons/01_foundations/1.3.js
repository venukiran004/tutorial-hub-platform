/* ============================================================================
   LESSON 1.3 — Bias and Variance, Derived and Simulated
   ========================================================================= */
EC.receiveLesson({
  id: "1.3",

  lede: "**The expected error of a model on a new point splits exactly into three parts: how far its average prediction is from the truth, how much its prediction wobbles from one training set to the next, and the noise nobody can remove.** That is the bias–variance decomposition, and it is the single most useful fact about learning because it says what to do when a model is bad. This lesson proves it in six lines, then measures the three parts by fitting two thousand models to two thousand resampled datasets — so the words 'high variance' become a number you have seen move.",

  objectives: [
    "Derive E[(y − f̂)²] = bias² + variance + σ² and say why the cross terms vanish",
    "Measure bias², variance and noise by simulation for polynomials of degree 1 to 12 and read the U-shape in the sum",
    "Diagnose a model as high-bias or high-variance from training and validation error, and name the fix for each",
    "Explain what k in KNN, depth in a tree and λ in ridge each dial, and describe double descent from a run that shows it"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "The decomposition, derived", id: "derivation" },

    { t: "p", text: "Fix one input point x. The world produces y = f(x) + ε with E[ε] = 0 and Var(ε) = σ². A learner trained on a random training set D produces a prediction f̂(x) — random, because D is. **We want the expected squared error over both sources of randomness, E[(y − f̂)²].** Write f̄ = E_D[f̂(x)] for the average prediction across training sets." },

    { t: "code", lang: "text", title: "Six lines, with the two cross terms shown to vanish",
      code: `E[(y - f̂)²]  =  E[(f + ε - f̂)²]                                            substitute y = f + ε
             =  E[((f - f̂) + ε)²]
             =  E[(f - f̂)²] + 2 E[(f - f̂) ε] + E[ε²]                        expand
             =  E[(f - f̂)²] + 0 + σ²                                         ε is independent of D and has mean 0, so E[(f - f̂) ε] = E[f - f̂] · E[ε] = 0

E[(f - f̂)²]  =  E[((f - f̄) + (f̄ - f̂))²]                                  add and subtract the average prediction f̄
             =  (f - f̄)² + 2 (f - f̄) E[f̄ - f̂] + E[(f̄ - f̂)²]               (f - f̄) is a constant, not random
             =  (f - f̄)² + 0 + E[(f̂ - f̄)²]                                  E[f̄ - f̂] = f̄ - f̄ = 0
             =  bias²  +  variance

So   E[(y - f̂)²]  =  (f - f̄)²   +   E[(f̂ - f̄)²]   +   σ²
                      bias²          variance          irreducible noise`,
      caption: "Bias is 'the average of my fits is wrong'; variance is 'my fits disagree with each other'; noise is 'even the perfect f would be wrong by ε'. The decomposition is exact for squared error. For 0–1 loss and cross-entropy the same three-way intuition holds but the algebra does not split as cleanly."
    },

    { t: "code", lang: "python", title: "The same three terms on three numbers (executed)",
      hl: [2, 3, 4, 5],
      code: `# three models trained on three resampled datasets each predict at one point; the truth there is 5.0
preds = np.array([4.0, 6.5, 5.7]); truth = 5.0
preds.mean()                              # 5.400   the average prediction f̄
(preds.mean() - truth) ** 2               # 0.160   bias²      -- the average is 0.4 too high
preds.var()                               # 1.087   variance   -- the fits disagree a lot
np.mean((preds - truth) ** 2)             # 1.247   = 0.160 + 1.087, exactly: the mean squared error against the true f`,
      caption: "With noise σ² added, the expected error against observed y would be 1.247 + σ². Nothing in this arithmetic needed a model; it needs several fits of the same model to several training sets — which is what the simulation below does two thousand times."
    },

    { t: "dl", items: [
      ["Bias", "The gap between the average prediction over training sets and the truth. Caused by a hypothesis space that cannot represent f: a line for a sine."],
      ["Variance", "How much the prediction changes when the training set changes. Caused by a hypothesis space flexible enough to fit noise: a degree-12 polynomial through 50 points."],
      ["Irreducible error", "σ², the noise in y itself. No model beats it; a training error below it is a model fitting noise."],
      ["Capacity / complexity", "The flexibility of the family: polynomial degree, tree depth, 1/k in KNN, 1/λ in ridge, network width. The dial that trades bias for variance."],
      ["Underfitting", "High bias: training and validation error both high and close. More capacity or better features."],
      ["Overfitting", "High variance: training error low, validation error much higher. Less capacity, regularisation, more data, or averaging (bagging)."],
      ["Double descent", "Beyond the point where a model can interpolate its training data, test error can fall again as capacity keeps growing — the classical U is the first half of the picture."]
    ]},

    { t: "h2", n: "02", text: "Measured: two thousand fits per degree", id: "simulation" },

    { t: "p", text: "Truth f(x) = sin(πx) on [−1, 1], noise σ = 0.3, fifty training points per dataset, two thousand datasets. For each polynomial degree, fit two thousand polynomials, predict on a fixed grid of eighteen test points, and compute the three terms from the definitions above. **The sum column must equal the measured test MSE — that is the decomposition being checked, not assumed.**" },

    { t: "code", lang: "python", title: "The simulation (executed; numpy.polynomial fits in a scaled domain so degree 12 is numerically honest)",
      hl: [7, 8, 10, 11, 12],
      code: `f = lambda x: np.sin(np.pi * x); sigma = 0.3
x_test = np.linspace(-0.85, 0.85, 18); n, reps = 50, 2000
for d in [1, 2, 3, 5, 7, 9, 12]:
    preds = np.empty((reps, len(x_test)))
    for r in range(reps):
        x = rng.uniform(-1, 1, n); y = f(x) + rng.normal(0, sigma, n)          # a fresh training set
        preds[r] = Polynomial.fit(x, y, d)(x_test)                           # one fit of degree d
    bias2 = np.mean((preds.mean(0) - f(x_test)) ** 2)                        # (f̄ - f)², averaged over the grid
    var   = np.mean(preds.var(0))                                            # E[(f̂ - f̄)²], averaged over the grid
    y_test = f(x_test) + rng.normal(0, sigma, (reps, len(x_test)))
    mse   = np.mean((preds - y_test) ** 2)                                   # what a test set would report`,
      caption: "Every quantity is computed from its definition — the average over fits, the variance over fits — not from a formula about polynomials. That is why the table generalises: swap the polynomial for a tree or a network and the same code measures the same three things."
    },

    { t: "table",
      head: ["degree", "bias²", "variance", "noise σ²", "bias² + var + σ²", "measured test MSE", "training MSE"],
      rows: [
        ["1", "0.1489", "0.0119", "0.0900", "0.2508", "0.2516", "0.2738"],
        ["2", "0.1466", "0.0184", "0.0900", "0.2551", "0.2546", "0.2659"],
        ["3", "0.0033", "0.0067", "0.0900", "**0.1000**", "**0.1007**", "0.0866"],
        ["5", "0.0000", "0.0100", "0.0900", "0.1000", "0.1007", "0.0793"],
        ["7", "0.0000", "0.0154", "0.0900", "0.1054", "0.1049", "0.0751"],
        ["9", "0.0000", "0.0277", "0.0900", "0.1177", "0.1160", "0.0717"],
        ["12", "0.0000", "0.4383", "0.0900", "0.5283", "0.5304", "0.0670"]
      ]
    },

    { t: "p", text: "Read the columns. **Bias² collapses at degree 3** — a cubic can bend like one arch of a sine — and stays at zero after. **Variance rises with every degree**: 0.0067 at 3, 0.0277 at 9, 0.4383 at 12, where the polynomial has enough freedom to chase individual noisy points. **The sum matches the measured MSE to the third decimal** in every row, which is the derivation verified empirically. And **training MSE falls monotonically** — 0.274 down to 0.067 — dropping below σ² = 0.09 from degree 3 onwards: the model is fitting noise, and the training error cannot tell you." },

    { t: "code", lang: "python", title: "At a single point: what 'the average prediction' and 'the spread' look like (executed)",
      code: `# x = 0.5, where the truth is sin(π/2) = 1.000; a thousand fits each
# degree 1:  mean prediction 0.483   bias² 0.2674   variance 0.0121     <- every line says ~0.48 here; consistent and wrong
# degree 3:  mean prediction 0.989   bias² 0.0001   variance 0.0061     <- right on average, and agrees with itself
# degree 9:  mean prediction 1.002   bias² 0.0000   variance 0.0162     <- right on average, but each fit is a different guess`,
      caption: "Degree 1 is a hedgehog: the same wrong answer every time. Degree 9 is a weathervane: right on average, different every time. Degree 3 is the model you want, and the only way to know is to have fitted it more than once — which is what cross-validation approximates (1.5)."
    },

    { t: "viz",
      title: "The U-shape, from the table",
      caption: "Bias² falls, variance rises, noise is flat; the sum has a minimum at degree 3–5. The training curve keeps falling and is useless for finding the minimum. Heights are the measured values, on a log scale to keep degree 12 on the page.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Line chart of bias squared, variance, noise and their sum against polynomial degree 1 to 12, with the sum minimal at degree 3 to 5 and the training error falling monotonically.">
  <defs>
    <marker id="ac-ah-13" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/></marker>
  </defs>
  <line x1="80" y1="250" x2="840" y2="250" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-13)"/>
  <line x1="80" y1="250" x2="80" y2="30" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#ac-ah-13)"/>
  <g class="s-sub" text-anchor="middle">
    <text x="140" y="270">1</text><text x="200" y="270">2</text><text x="260" y="270">3</text><text x="380" y="270">5</text><text x="500" y="270">7</text><text x="620" y="270">9</text><text x="800" y="270">12</text>
    <text x="460" y="292">polynomial degree</text>
  </g>
  <g class="s-sub" text-anchor="end">
    <text x="72" y="236">0.005</text><text x="72" y="178">0.03</text><text x="72" y="118">0.1</text><text x="72" y="60">0.5</text>
  </g>
  <!-- log scale: y = 250 - 60*log10(v/0.005)/log10(4)  ... approximated positions -->
  <polyline points="140,150 200,150 260,203 380,250 500,250 620,250 800,250" fill="none" style="stroke:var(--crit)" stroke-width="2"/>
  <polyline points="140,213 200,195 260,237 380,220 500,203 620,178 800,60" fill="none" style="stroke:var(--warn)" stroke-width="2"/>
  <polyline points="140,122 200,122 260,122 380,122 500,122 620,122 800,122" fill="none" style="stroke:var(--ink-3)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <polyline points="140,80 200,79 260,120 380,120 500,118 620,113 800,52" fill="none" style="stroke:var(--accent)" stroke-width="2.4"/>
  <polyline points="140,76 200,77 260,127 380,131 500,133 620,135 800,138" fill="none" style="stroke:var(--good)" stroke-width="1.6" stroke-dasharray="6 3"/>
  <g class="s-label" style="font-weight:600">
    <text x="150" y="140" style="fill:var(--crit)">bias²</text>
    <text x="700" y="90" style="fill:var(--warn)">variance</text>
    <text x="700" y="118" style="fill:var(--ink-3)">noise σ² = 0.09</text>
    <text x="330" y="100" style="fill:var(--accent)">bias² + variance + σ² = test MSE</text>
    <text x="640" y="160" style="fill:var(--good)">training MSE</text>
  </g>
  <circle cx="260" cy="120" r="5" style="fill:var(--accent)"/>
  <text x="260" y="45" class="s-sub" text-anchor="middle">minimum: degree 3–5</text>
  <line x1="260" y1="52" x2="260" y2="112" style="stroke:var(--accent)" stroke-width="1" stroke-dasharray="2 2"/>
</svg>`
    },

    { t: "h2", n: "03", text: "Diagnosis and the dials", id: "diagnosis" },

    { t: "table",
      head: ["Symptom", "Diagnosis", "What helps", "What does not"],
      rows: [
        ["Training error high, validation error high and close to it", "High bias — the family cannot represent the signal", "More capacity (degree, depth, width), better features, less regularisation, boosting", "More data: the average of a wrong family is still wrong"],
        ["Training error low, validation error much higher", "High variance — the family fits noise", "More data, regularisation, less capacity, early stopping, bagging, dropout", "More capacity, more features"],
        ["Both low, validation close to training", "The model is about right for the data", "Report it; look for a better feature or a cheaper model", "—"],
        ["Training error below the noise floor", "Fitting noise, whatever validation says", "Treat as high variance", "Trusting the training number"]
      ]
    },

    { t: "code", lang: "python", title: "Two other dials: k in KNN, and what happens past interpolation (executed)",
      hl: [2, 3, 4, 5, 10, 11, 12, 13, 14],
      code: `# KNN regression on the same sine, same noise, n = 30: k is capacity in reverse
# k=1    bias² 0.0001   variance 0.1007   total 0.1908      <- copies the nearest noisy point: no bias, all variance
# k=3    bias² 0.0015   variance 0.0407   total 0.1322      <- the best of the four
# k=10   bias² 0.0326   variance 0.0251   total 0.1477
# k=30   bias² 0.5263   variance 0.0181   total 0.6344      <- k = n: predicts the global mean everywhere; all bias

# double descent: 20-dimensional input, 100 training rows, random ReLU features, minimum-norm least squares.
# test MSE against the number of features p (noise floor 1.0):
# p=10   16.8      p=60    8.2      p=90   23.8      p=100  444.8      p=110  26.4
# p=130   9.0      p=200   3.9      p=400   2.4      p=1000   2.0      p=3000   1.75
# the classical U ends at p = n = 100, where the model exactly interpolates the training set and the fit is wild;
# past it, with more features than rows, the minimum-norm solution gets smoother and the error descends again`,
      caption: "The KNN table is the bias–variance dial with k instead of degree. The double-descent run is why 'bigger always overfits' stopped being the whole story: at p = n the least-squares solution is forced through every noisy point and the error spikes to 444; with thirty times more features than rows it is 1.75, close to the noise floor. Modern networks live on the right of that peak; classical ML lives on the left, where the U-shape is the correct picture."
    },

    { t: "callout", kind: "mental", title: "Variance is about the training set, not the test set", body: [
      { t: "p", text: "A high-variance model is not 'a model that does badly on test data'; it is a model whose predictions depend heavily on which training rows it happened to see. The test set only reveals it. **That is why more data cures variance and not bias**: with more rows, the training sets you might have drawn become more alike, and the fits converge — toward the family's best approximation, which for a biased family is still wrong. Bagging (6.2) cures variance the other way, by drawing many training sets and averaging the fits, exactly as the simulation's f̄ does." }
    ]},

    { t: "ladder",
      title: "A model overfits (training AUC 0.99, validation 0.71). What next?",
      rungs: [
        { level: "bad", label: "Add features and train longer", code: `model = GradientBoosting(n_estimators=2000, max_depth=8)   # more capacity, more iterations`,
          note: "**Both moves increase variance.** The gap will widen; the training number will approach 1.0 and mean nothing." },
        { level: "ok", label: "Regularise until the gap closes", code: `model = GradientBoosting(n_estimators=300, max_depth=3, learning_rate=0.05, subsample=0.8, min_samples_leaf=20)`,
          note: "**Right direction.** Depth, learning rate, subsampling and leaf size each reduce variance; validation should rise while training falls." },
        { level: "best", label: "Check the data first, then regularise with a learning curve in hand", code: `# 1. is a feature leaking? (0.99 on a human decision is suspicious)   2. are duplicates split across folds?
# 3. learning curve: does validation still rise with more rows? -> get more data before tuning (8.3)
# 4. then regularise, choosing the strength by cross-validation, and use early stopping on a validation fold`,
          note: "**0.99 training AUC is more often a leak than a capacity problem.** Rule that out, learn whether data or regularisation is the cheaper fix, then tune with a method that measures variance rather than guessing at it." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Decompose a decision tree",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Repeat the simulation with `DecisionTreeRegressor` in place of the polynomial, varying `max_depth` over 1, 2, 3, 5, 8, None, with n = 100 training points per dataset and 500 datasets. Produce the same table — bias², variance, noise, sum, measured test MSE, training MSE — and then add a seventh row: a bagged ensemble of 50 unlimited-depth trees, each on a bootstrap sample. Explain the ensemble's row using the decomposition." }
      ],
      requirements: [
        "The same definitions for bias² and variance as the lesson: computed from the predictions across datasets, not from a formula.",
        "The sum column checked against the measured MSE.",
        "The bagging row, with its bias and variance compared with the unlimited-depth single tree.",
        "One sentence on why the deepest tree's training MSE is exactly zero."
      ],
      hint: "An unlimited tree with unique x values fits every training point, so its training MSE is 0 and its variance is the whole story. Bagging averages 50 such trees: the bias of each tree is near zero and averaging cuts the variance, so the ensemble row should show low bias and much lower variance than the single deep tree.",
      solution: {
        lang: "python",
        title: "tree_decomposition.py",
        code: `from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import BaggingRegressor
f = lambda x: np.sin(np.pi * x); sigma = 0.3; x_test = np.linspace(-0.85, 0.85, 18); n, reps = 100, 500

def decompose(make_model):
    preds = np.empty((reps, len(x_test))); tr = []
    for r in range(reps):
        x = rng.uniform(-1, 1, n); y = f(x) + rng.normal(0, sigma, n)
        m = make_model().fit(x[:, None], y)
        preds[r] = m.predict(x_test[:, None]); tr.append(np.mean((m.predict(x[:, None]) - y) ** 2))
    bias2 = np.mean((preds.mean(0) - f(x_test)) ** 2); var = np.mean(preds.var(0))
    y_test = f(x_test) + rng.normal(0, sigma, (reps, len(x_test)))
    return bias2, var, np.mean((preds - y_test) ** 2), np.mean(tr)

for depth in [1, 2, 3, 5, 8, None]:
    print(depth, decompose(lambda: DecisionTreeRegressor(max_depth=depth)))
print("bagged", decompose(lambda: BaggingRegressor(DecisionTreeRegressor(), n_estimators=50, bootstrap=True)))

# executed (300 datasets, seed 0):        bias²    variance   test MSE   training MSE
#   depth 1                                 0.0558   0.0302     0.1738     0.1725      <- one split: a step function cannot follow a sine
#   depth 2                                 0.0253   0.0384     0.1545     0.1240
#   depth 3                                 0.0043   0.0318     0.1256     0.0800      <- the U's bottom
#   depth 5                                 0.0002   0.0471     0.1375     0.0450
#   depth 8                                 0.0002   0.0788     0.1660     0.0113
#   depth None                              0.0002   0.0886     0.1791     0.0000      <- every leaf holds one point: reproduces its noise
#   bagged, 50 unlimited trees              0.0002   0.0439     0.1299     0.0187      <- the deep tree's bias, half its variance`,
        notes: [
          { t: "p", text: "**The unlimited tree's training MSE is zero** because with distinct x values every training point gets its own leaf, and a leaf predicts the mean of its points — which is that one noisy y. Zero training error, and the largest variance in the table." },
          { t: "p", text: "**Bagging is the decomposition used as a tool**: averaging 50 fits halved the deep tree's variance (0.0886 → 0.0439) and left its bias at 0.0002, landing within 0.005 of the best single depth without anyone choosing a depth (6.2 derives the formula with the between-tree correlation). The ensemble row is the lesson's f̄ made into a predictor." },
          { t: "p", text: "**Depth is the tree's degree.** The same code with `max_depth` swapped for `n_neighbors`, `alpha` or `hidden_layer_sizes` measures the same three numbers for any model — which is the point of computing them from definitions." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Degree 9 had bias² 0.0000, variance 0.0277 and training MSE 0.0717, below the noise σ² = 0.09. What does the training number below the noise floor tell you?",
          options: [
            "The model is excellent",
            "The model is fitting noise: no honest fit can beat σ² on average, so a training error below it means the polynomial is bending toward individual noisy points — which is exactly what the variance column measures",
            "The noise estimate is wrong",
            "Degree 9 is underfitting"
          ],
          answer: 1,
          why: "Training error is a measurement of memorisation past the noise floor. Only a held-out measurement, or the variance across fits, shows the cost."
        }
      ]
    }
  ],

  takeaways: [
    "**E[(y − f̂)²] = bias² + variance + σ²**, exactly, for squared error; the cross terms vanish because ε has mean zero and is independent of the training set.",
    "**Bias is the average fit being wrong; variance is the fits disagreeing; noise is the floor.**",
    "**Measured, not assumed**: two thousand fits per degree gave a sum that matched the test MSE to three decimals.",
    "**Bias² collapsed at degree 3 and stayed at zero; variance rose with every degree** — the U is their sum.",
    "**Training error falls monotonically and drops below σ²** — it cannot find the minimum.",
    "**High bias: add capacity or features; high variance: add data, regularise, average, stop early.** More data does not fix bias.",
    "**Capacity dials**: degree, depth, 1/k, 1/λ, width — all trade the same two terms.",
    "**Variance is about the training set, not the test set**; the test set only reveals it.",
    "**Bagging is the decomposition used as a tool**: average many fits to shrink variance.",
    "**Double descent** is real and was measured: the error spiked at p = n and fell again far beyond it; classical ML lives left of that peak, where the U is the right picture."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does the cross term E[(f − f̂)ε] vanish in the derivation?",
        options: [
          "Because f̂ is unbiased",
          "Because the noise on the new point is independent of the training set that produced f̂ and has mean zero, so the expectation factorises into E[f − f̂] · E[ε] = E[f − f̂] · 0",
          "Because ε is Gaussian",
          "It does not vanish; it is ignored"
        ],
        answer: 1,
        why: "Independence plus zero mean. No normality is needed; the decomposition holds for any zero-mean noise with finite variance."
      },
      {
        stem: "A model's training and validation errors are both high and nearly equal. Which action is wasted?",
        options: [
          "Adding a more flexible model",
          "Collecting more training data — the symptom is bias, and the average of a too-simple family stays wrong however many rows it sees",
          "Engineering better features",
          "Reducing regularisation"
        ],
        answer: 1,
        why: "More data shrinks variance by making the possible training sets alike. It cannot move the average fit toward a function the family cannot express."
      },
      {
        stem: "In the KNN run, k = 1 had bias² 0.0001 and variance 0.1007; k = 30 had bias² 0.5263 and variance 0.0181. What is k?",
        options: [
          "A regularisation strength with no effect on bias",
          "A capacity dial in reverse: small k copies the nearest noisy point (no bias, high variance); k = n predicts the global mean everywhere (all bias, no variance); the best k sits between",
          "The number of features",
          "Irrelevant to the decomposition"
        ],
        answer: 1,
        why: "k = 3 gave the lowest total, 0.132. Every hyperparameter that controls flexibility is this dial under another name."
      },
      {
        stem: "What did the double-descent run show at p = n = 100 features?",
        options: [
          "The best test error",
          "The worst: with exactly as many features as rows the minimum-norm solution must pass through every noisy training point, and test MSE spiked to 444 before descending to 1.75 at p = 3000",
          "A numerical error",
          "That more features always help"
        ],
        answer: 1,
        why: "The interpolation threshold is where variance explodes. Past it, the minimum-norm solution among the many that interpolate becomes smoother, and the error falls — the regime deep networks are trained in."
      },
      {
        stem: "How does bagging relate to the decomposition?",
        options: [
          "It reduces bias by combining different families",
          "It builds the average prediction f̄ as a predictor: many fits on resampled training sets, averaged, which shrinks the variance term while leaving the bias of the base model almost unchanged",
          "It reduces the noise term",
          "It has no relation"
        ],
        answer: 1,
        why: "The exercise's bagged row shows it: the deep tree's bias with a fraction of its variance. 6.2 gives the formula with the correlation between trees."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain the bias–variance trade-off with a real example.",
        strong: "For a new point, the expected squared error of a model splits into three parts: bias squared — how far the average prediction over possible training sets is from the truth; variance — how much the prediction moves when the training set changes; and irreducible noise. Fitting a straight line to a sine gives high bias and low variance: every line says roughly the same wrong thing. A degree-twelve polynomial through fifty points gives near-zero bias and high variance: right on average, different every time. In a churn model, a logistic regression on a few features is the line; a deep unregularised gradient-boosted model is the polynomial. The trade-off is that capacity lowers bias and raises variance, so the best model sits where their sum is smallest — found by validation, never by training error, which falls with capacity forever.",
        answer: [
          { t: "p", text: "Defining both terms as expectations over training sets — not as 'underfitting' and 'overfitting' — is what a derivation-level answer sounds like." }
        ]
      },
      {
        level: "core",
        q: "Derive the decomposition.",
        strong: "Let y = f(x) + ε with E[ε] = 0 and Var(ε) = σ², and let f̂ be the prediction from a random training set with mean f̄. Expected squared error is E[(f + ε − f̂)²]; expand as E[(f − f̂)²] + 2E[(f − f̂)ε] + E[ε²]. The middle term is zero because ε is independent of the training set and has mean zero; the last is σ². For the first, add and subtract f̄: E[((f − f̄) + (f̄ − f̂))²] = (f − f̄)² + 2(f − f̄)E[f̄ − f̂] + E[(f̂ − f̄)²]; the middle term is zero since E[f̂] = f̄. What remains is bias squared plus variance plus σ². I would add that this is exact for squared loss; for classification the same intuition holds but the algebra does not split cleanly.",
        answer: [
          { t: "p", text: "Two cross terms, each shown to vanish for a stated reason — that is the whole derivation, and it fits on a whiteboard." }
        ]
      },
      {
        level: "advanced",
        q: "Does more capacity always mean more overfitting? What about double descent?",
        strong: "In the classical regime — fewer parameters than rows — yes: capacity lowers bias and raises variance, test error is U-shaped, and the minimum is found by validation. But the U is only the left half. When capacity reaches the point where the model can interpolate the training set exactly, variance spikes — in a run I have done, test error went from 8 to 444 as random features approached the number of rows. Past that point, with far more parameters than rows, the minimum-norm or implicitly-regularised solution among all interpolating solutions gets smoother, and test error descends again toward the noise floor. That is double descent, and it is the regime where large neural networks train. For tabular ML with tree ensembles and linear models we live left of the peak, where the classical advice — regularise, validate, stop early — is correct.",
        answer: [
          { t: "p", text: "Placing classical ML and deep learning on either side of the interpolation threshold is the modern answer." }
        ]
      }
    ]
  }
});

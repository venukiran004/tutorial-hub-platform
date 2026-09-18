/* ============================================================================
   LESSON 11.6 — Neural Networks from the ML Side
   ========================================================================= */
EC.receiveLesson({
  id: "11.6",

  lede: "**A neural network is logistic regression stacked: each layer is a linear map followed by a non-linearity, and everything that is new about it — backpropagation, the learning-rate dial, weight decay, dropout — is the machinery for fitting the stack.** A perceptron learns AND with weights (3, 2) and bias −4 and cannot learn XOR at all; a two-unit hidden layer solves XOR on 14 of 20 random starts, four units on all 20. Backpropagation is worked on a network with two weights: the forward pass gives ŷ = 0.4381 and loss 0.1579, the chain rule gives ∂L/∂w₂ = −0.0861 and ∂L/∂w₁ = 0.0130, a finite-difference check agrees to six decimals, and 200 gradient steps bring the output to 0.89. On two moons a straight line scores 0.846, and the same network with ReLU scores 0.942 where its logistic-unit version sat on a plateau; a batch of 1,000 takes 300 steps to reach 0.851 and a batch of 32 takes 8,928 to reach 0.938; weight decay from 0 to 1 moves a 256 × 256 network from 1.000 / 0.851 train / test to 0.930 / 0.874. On the churn table an MLP loses to logistic regression by eleven AUC points; on 64-pixel digits it beats gradient boosting — the two regimes, and the reason to know which one you are in.",

  objectives: [
    "Explain the perceptron, the multilayer perceptron and why the hidden layer's non-linearity matters, with XOR as the test",
    "Work a forward pass and backpropagation by hand on a two-weight network and verify the gradient numerically",
    "Read the learning rate, batch size and activation as dials with measured effects",
    "Apply weight decay, early stopping and dropout and explain what each regularises",
    "State when a network beats gradient boosting on tabular data, with the evidence for both regimes"
  ],

  prerequisites: ["4.5", "1.8", "6.3"],

  blocks: [

    { t: "h2", n: "01", text: "The perceptron, the MLP, and XOR", id: "perceptron" },

    { t: "code", lang: "python", title: "What a linear unit can learn (executed)",
      code: `Perceptron().fit(AND)    # weights (3, 2), bias −4: fires only when both inputs are 1.  Training accuracy 1.00
Perceptron().fit(XOR)    # weights (0, 0), bias 0: no line separates (0,1),(1,0) from (0,0),(1,1).  Accuracy 0.50

MLPClassifier(hidden_layer_sizes=(2,), activation="tanh")  on XOR, 20 random starts:
   1 hidden unit: 0 of 20 solve it     2 units: 14 of 20     3 units: 17 of 20     4 units: 20 of 20     8 units: 20 of 20
a solving two-unit network: hidden weights [[4.27, 3.80], [−4.26, −4.04]], biases [2.04, −1.68]; output weights [−6.75, 6.71], bias 6.02
   -- unit 1 fires unless both inputs are 0, unit 2 fires unless both are 1; the output is 'unit 2 and not unit 1': XOR built from two lines`,
      caption: "A perceptron is a linear classifier trained by an error-driven update; its limit is Minsky and Papert's: no linear function separates XOR. One hidden layer of non-linear units removes the limit — the hidden units carve the plane into regions and the output combines them — and with enough units a single hidden layer can approximate any continuous function. The random starts show the other half of the story: the loss surface has bad minima, and the smallest network that *can* solve a problem often does not." },

    { t: "h2", n: "02", text: "Forward pass and backpropagation, worked on two weights", id: "backprop" },

    { t: "p", text: "The network is x → h = σ(w₁x) → ŷ = σ(w₂h) with sigmoid units and the loss L = ½(y − ŷ)². Backpropagation is the chain rule applied from the loss backward, reusing each layer's partial derivative for the layers behind it. With x = 1, y = 1, w₁ = 0.5, w₂ = −0.4:" },

    { t: "code", lang: "text", title: "One step, every number (executed)",
      code: `FORWARD
  z1 = w1·x  = 0.5000        h = σ(z1) = 0.6225
  z2 = w2·h  = −0.2490       ŷ = σ(z2) = 0.4381        L = ½(1 − 0.4381)² = 0.1579

BACKWARD  (σ'(z) = σ(z)(1 − σ(z)))
  ∂L/∂ŷ  = −(y − ŷ)          = −0.5619
  ∂ŷ/∂z2 = ŷ(1 − ŷ)          =  0.2462
  ∂z2/∂w2 = h                =  0.6225        ->  ∂L/∂w2 = −0.5619 × 0.2462 × 0.6225 = −0.0861
  ∂z2/∂h  = w2               = −0.4000
  ∂h/∂z1  = h(1 − h)         =  0.2350
  ∂z1/∂w1 = x                =  1.0000        ->  ∂L/∂w1 = −0.5619 × 0.2462 × (−0.4000) × 0.2350 × 1 = 0.0130

UPDATE (learning rate 0.5)
  w1 ← 0.5 − 0.5 × 0.0130 = 0.4935      w2 ← −0.4 − 0.5 × (−0.0861) = −0.3569      new ŷ 0.4448, new loss 0.1541
finite-difference check:  ∂L/∂w1 0.013003 (backprop 0.013003)     ∂L/∂w2 −0.086103 (−0.086103)
after 10 / 50 / 200 steps:  ŷ = 0.5014 / 0.6928 / 0.8926`,
      caption: "Two things to notice. The gradient for w₁ contains the gradient for w₂'s path (−0.5619 × 0.2462) — that reuse is what makes backpropagation one backward pass rather than one per weight. And every sigmoid contributes a factor σ′ ≤ 0.25: the gradient reaching w₁ is a quarter of a quarter of the loss gradient, which for ten layers is 10⁻⁶ — the vanishing gradient, and the reason ReLU (σ′ = 1 where active) replaced sigmoids in deep stacks. The finite-difference check is the standard test of a hand-written backward pass; autograd in PyTorch does exactly this bookkeeping for any graph." },

    { t: "h2", n: "03", text: "Activation, learning rate and batch size, measured", id: "dials" },

    { t: "code", lang: "python", title: "Two moons (2,000 points, noise 0.25), one hidden layer of 32 units (executed)",
      code: `logistic regression (a straight line): 0.846

activation, learning rate 0.01, tolerance 1e-6:   identity 0.8450 (50 iterations)   logistic 0.8450 (50)   tanh 0.9400 (224)   relu 0.9370 (185)
   -- identity is a line by construction; the logistic units sat on a plateau and the solver's stopping rule fired; tanh and relu escaped

learning rate (relu, up to 500 iterations):  0.0001: 0.852 (500 its, loss 0.320)   0.001: 0.943   0.01: 0.934 (156)   0.1: 0.940 (26)   1.0: 0.941 (50)
   -- too small never arrives; the four larger rates all arrive, at different speeds (Adam's adaptivity makes it forgiving here)

batch size (300 epochs max):   8: 0.937 (21,375 gradient steps, 2.9 s)   32: 0.938 (8,928 steps, 1.3 s)   200: 0.918 (1,500 steps)   1000: 0.851 (300 steps, 0.15 s)
   -- the same 300 passes over the data are 71× more parameter updates at batch 8 than at batch 1,000`,
      caption: "The non-linearity is the point of the hidden layer: without it the network is a line (0.846) however wide. The learning rate is the same dial as 1.8's: the loss surface is non-convex and the rate decides whether descent arrives and where. Batch size trades gradient noise against steps per epoch — small batches take more, noisier steps, which also regularise; large batches need proportionally larger rates or more epochs, and at 1,000 the network had not left the linear solution after 300 epochs." },

    { t: "h2", n: "04", text: "Regularisation: weight decay, early stopping, dropout", id: "regularisation" },

    { t: "code", lang: "python", title: "A 256 × 256 network on 200 noisy points, tested on 2,000 (executed)",
      code: `#  alpha (L2 weight decay)    train    test    weight norm
#  0.0                        1.000    0.851      54.4      <- memorises 200 points
#  0.001                      1.000    0.853      46.8
#  0.01                       0.995    0.854      28.8
#  0.1                        0.935    0.867      11.7
#  1.0                        0.930    0.874       5.1      <- the best test score has the smallest weights
#  early stopping on a 20 % validation split (40 points), patience 20: stopped at epoch 23, train 0.815, test 0.806   <- 40 validation points are not enough to stop on`,
      caption: "Weight decay is 4.3's ridge penalty on every weight matrix: it shrinks the function toward smoother ones and the executed sweep shows the test score rising as the weight norm falls tenfold. Early stopping regularises by halting before the network fits the noise, and needs a validation set large enough to judge — here it stopped too early on 40 points and under-fitted. Dropout, not in scikit-learn's MLP, zeroes a random subset of hidden units at each training step so that no unit can rely on another; it trains an implicit ensemble of thinned networks and is the default regulariser in deep learning frameworks. Batch normalisation and data augmentation are the other two, and in practice a wide network with decay and early stopping on a real validation set beats a narrow one tuned by hand." },

    { t: "h2", n: "05", text: "When a network beats gradient boosting on a table", id: "tabular" },

    { t: "code", lang: "python", title: "The churn table (989 rows, 8 columns) and the digits (1,797 rows, 64 pixel columns), 5-fold (executed)",
      code: `# churn: 5-fold AUC
#  logistic regression                    0.7429 ± 0.019     0.1 s
#  HistGradientBoosting                   0.7034 ± 0.021     0.5 s
#  MLP (64, 32), alpha 1e-3               0.6245 ± 0.030     7.0 s
#  MLP (64, 32), alpha 1                  0.6879 ± 0.037     3.7 s
#  MLP (256, 256, 256), early stopping    0.6538 ± 0.121     3.6 s     <- and a spread of 0.12 across folds

# digits: 5-fold accuracy
#  logistic regression                    0.9694 ± 0.009     0.2 s
#  HistGradientBoosting                   0.9738 ± 0.008     5.9 s
#  MLP (128,)                             0.9783 ± 0.007    11.9 s
#  MLP (256, 128)                         0.9816 ± 0.007    15.6 s     <- the exercise: (16,) 0.970, (512, 256, 128) 0.980 -- width helps, depth does not, here`,
      caption: "Two regimes. The churn table is small, its columns are few and heterogeneous — a fee in pounds, a count of tickets, a plan name — and its signal is thresholds and additive effects, which a regularised linear model captures and boosting's trees capture; a network has nothing to build features from and eleven AUC points to lose. The digits are 64 homogeneous pixels whose values interact smoothly, and the hidden layer builds the strokes that trees would need thousands of splits to approximate. The 2022 'why do tree-based models still outperform deep learning on tabular data' benchmarks found the same: on medium-sized heterogeneous tables, tuned boosting wins by default; networks win on many homogeneous features, on very large tables, and where representation learning or multi-task and embedding structure is the point." },

    { t: "table", head: ["Situation", "Reach for", "Why"], rows: [
      ["Small to medium heterogeneous table", "gradient boosting; a regularised linear model as the yardstick", "thresholds and additive effects; no features to learn; the executed churn result"],
      ["Many homogeneous numeric columns (pixels, spectra, sensor arrays)", "an MLP or a convolutional network", "smooth interactions across many inputs; the executed digits result"],
      ["Very large tables with high-cardinality categoricals", "a network with learned embeddings, or boosting with target encoding", "embeddings compress categories; both scale"],
      ["Text, images, audio, sequences", "a network, usually pre-trained", "representation learning is the task"],
      ["Multi-task, transfer, or a model that must be part of a larger differentiable system", "a network", "boosting cannot share representations or be fine-tuned"],
      ["Interpretability or standard errors required", "linear or boosting with SHAP (9.2)", "a network's weights are not readable"]
    ] },

    { t: "ladder",
      title: "Trying a network on a business table",
      rungs: [
        { level: "bad", label: "A deep network as the first model, tuned until it beats logistic regression", code: `MLPClassifier(hidden_layer_sizes=(256, 256, 256)).fit(X, y)     # churn: 0.654 ± 0.121`,
          note: "**Eleven points behind a linear model, a fold-to-fold spread larger than any effect you are looking for, and thirty times the cost. Tuning it toward 0.74 is a week spent matching a baseline.**" },
        { level: "ok", label: "Boosting and a linear model first; a network only with scaling, decay and a real validation set", code: `pre = ColumnTransformer([scale numerics, one-hot categoricals]); MLPClassifier(alpha=1.0, early_stopping=True)
compare 5-fold against HistGradientBoosting and LogisticRegression`,
          note: "Honest, and on this table it says no: the network's best (0.688) trails boosting (0.703) and the linear model (0.743). Knowing that in 15 seconds is the point of the comparison." },
        { level: "best", label: "Choose by regime, and when a network is warranted, build it properly", code: `if columns are few and heterogeneous: boosting + linear, SHAP for explanation
if inputs are many and homogeneous, or representation matters: MLP / CNN in PyTorch --
   scaled inputs, ReLU, Adam with a tuned rate, weight decay + dropout, early stopping on a validation set of hundreds, a gradient check on anything hand-written`,
          note: "The digits went 0.974 → 0.982 for the network; the churn table went the other way by eleven points. The regime decides, and the baselines are what reveal it." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A two-unit tanh hidden layer solved XOR on 14 of 20 random starts and a four-unit layer on 20 of 20. Why does capacity beyond the minimum help?",
          options: [
            "Four units can represent functions two cannot",
            "Two units can represent XOR (a solving network is shown) but the loss surface for the minimal network has bad local minima and plateaus; extra units give gradient descent more directions to escape along — over-parameterisation makes optimisation easier, not just representation richer",
            "The extra units act as a regulariser",
            "tanh needs at least four units"
          ],
          answer: 1,
          why: "Representation and optimisation are different questions. The universal approximation results say what a network *can* express; whether gradient descent from a random start *finds* it is the practical question, and wider networks are consistently easier to train — one of the reasons practice moved to large models with regularisation rather than small models sized to the problem."
        },
        {
          stem: "In the worked backpropagation, ∂L/∂w₁ = 0.0130 is much smaller than ∂L/∂w₂ = −0.0861. What produced the difference, and what does it imply for deep sigmoid networks?",
          options: [
            "w₁ is less important",
            "The path to w₁ passes through one more sigmoid derivative (h(1 − h) = 0.235) and the weight w₂ (−0.4); each sigmoid layer multiplies the gradient by at most 0.25, so in a deep stack the early layers receive almost no gradient — the vanishing gradient, addressed by ReLU, careful initialisation, residual connections and normalisation",
            "The learning rate was too small",
            "Finite differences would give a different answer"
          ],
          answer: 1,
          why: "The chain rule multiplies; a product of factors each below 0.25 shrinks geometrically with depth. ReLU's derivative is 1 for active units, which is why it made ten-plus layers trainable; the finite-difference check confirms the small gradient is correct, not a bug."
        },
        {
          stem: "With a batch of 1,000 the network stopped at 0.851 after 300 epochs; with a batch of 32 it reached 0.938. Was the large batch under-fitting?",
          options: [
            "Yes — large batches cannot fit non-linear data",
            "It was under-trained: 300 epochs at batch 1,000 is 300 parameter updates against 8,928 at batch 32, and with the same learning rate the large-batch run had not left the linear solution; large batches need more epochs or a larger rate, and small batches also add gradient noise that regularises",
            "Yes — batch size 1,000 exceeds the data",
            "No — the two runs are equivalent"
          ],
          answer: 1,
          why: "Epochs count passes over the data; what moves the weights is the number of steps and their size. The batch size is a compute-versus-noise trade, and the linear scaling rule (rate proportional to batch size) exists to make large batches train as fast as small ones per epoch."
        },
        {
          stem: "On the churn table logistic regression scored 0.743 AUC and the best MLP 0.688; on the digits the MLP beat boosting. What distinguishes the two datasets?",
          options: [
            "The digits have more rows",
            "The churn table has few, heterogeneous columns whose signal is thresholds and additive effects — nothing for a hidden layer to build — while the digits are 64 homogeneous inputs whose smooth interactions (strokes) a hidden layer represents compactly and trees can only approximate with many splits",
            "The churn labels are noisier",
            "The MLP was not scaled on churn"
          ],
          answer: 1,
          why: "The 'tree models still outperform deep learning on tabular data' literature names the same causes: heterogeneous features, irregular target functions and uninformative columns favour trees. The executed pair is the regime test in miniature, and the baselines are what reveal which regime a dataset is in."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "Backprop by hand again, XOR against width, and digits against depth",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Repeat the two-weight backpropagation with x = 2, y = 0, w₁ = −0.3, w₂ = 0.8 and learning rate 0.5: forward values, δ_out, both gradients, the update and the new output; verify by finite differences." },
        { t: "p", text: "**(b)** For XOR with tanh hidden layers of width 1, 2, 3, 4 and 8, count the random starts out of 20 that reach 100 % training accuracy." },
        { t: "p", text: "**(c)** On the 8 × 8 digits, run MLPs with hidden layers (16), (64), (256), (64, 64), (256, 128) and (512, 256, 128), reporting 5-fold accuracy, time and parameter count." }
      ],
      requirements: [
        "(a) six numbers, the update, the check.",
        "(b) five counts.",
        "(c) a six-row table."
      ],
      hint: "(a) δ_out = −(y − ŷ)·ŷ(1 − ŷ) is shared by both gradients. (b) One unit cannot represent XOR at all. (c) Count parameters as Σ (inputs × outputs) over layers.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) forward: z1 = −0.6, h = 0.3543, z2 = 0.2835, ŷ = 0.5704, loss 0.1627
#     δ_out = −(0 − 0.5704)·0.5704·0.4296 = 0.1398
#     ∂L/∂w2 = δ_out·h = 0.0495;  ∂L/∂w1 = δ_out·w2·h(1 − h)·x = 0.1398·0.8·0.2288·2 = 0.0512
#     update: w1 -> −0.3256, w2 -> 0.7752; new ŷ 0.5660 (target 0: moving the right way, slowly -- the sigmoid derivative is 0.245 here)
#     finite differences: 0.051164 and 0.049528 -- agree to four decimals with the chain rule (the printed gradients are rounded)

# (b) width 1: 0 of 20     2: 14 of 20     3: 17 of 20     4: 20 of 20     8: 20 of 20

# (c) hidden layers       accuracy           time    parameters
#     (16,)               0.9700 ± 0.007     8.1 s     1,184
#     (64,)               0.9794 ± 0.005     6.8 s     4,736
#     (256,)              0.9805 ± 0.005    14.9 s    18,944
#     (64, 64)            0.9789 ± 0.007     7.0 s     8,832
#     (256, 128)          0.9816 ± 0.007    16.7 s    50,432
#     (512, 256, 128)     0.9800 ± 0.005    36.6 s   197,888
#     -- from 64 units upward the differences are within a standard deviation; 1,797 images do not need 200,000 parameters`,
        notes: [
          { t: "p", text: "(a) is the chain rule once more from the other side of the target, with the shared δ made explicit." },
          { t: "p", text: "(b) separates what a network can represent from what descent can find." },
          { t: "p", text: "(c) is the capacity curve on a small problem: it flattens early, and the cost keeps rising." }
        ]
      }
    }
  ],

  takeaways: [
    "A perceptron is a linear classifier (AND: weights (3, 2), bias −4) and cannot represent XOR; one non-linear hidden layer can, and wider layers are found by gradient descent more reliably (2 units: 14 of 20 starts; 4 units: 20 of 20).",
    "Backpropagation is the chain rule applied backward with reuse: on two weights, ∂L/∂w₂ = −0.0861 and ∂L/∂w₁ = 0.0130, verified by finite differences to six decimals; each sigmoid multiplies the gradient by at most 0.25, which is the vanishing gradient and the reason for ReLU.",
    "The hidden non-linearity is the point (identity 0.845 versus ReLU 0.942 on two moons); the learning rate decides whether descent arrives; batch size trades noise against steps per epoch (batch 1,000 was 71× fewer updates and stalled at the linear solution).",
    "Weight decay shrinks the weights and raised test accuracy from 0.851 to 0.874 while training accuracy fell from 1.000 to 0.930; early stopping needs a validation set large enough to judge; dropout trains an implicit ensemble of thinned networks.",
    "On a small heterogeneous table a network lost to logistic regression by eleven AUC points and to boosting by two; on 64 homogeneous pixels it beat boosting — the regime decides, and the baselines reveal it.",
    "When a network is warranted: scaled inputs, ReLU, an adaptive optimiser with a tuned rate, decay and dropout, early stopping on hundreds of validation points, and a gradient check on anything hand-written."
  ],

  quiz: {
    title: "Neural Networks from the ML Side — Knowledge Check",
    questions: [
      {
        stem: "Why does an MLP with the identity activation score exactly what logistic regression scores?",
        options: [
          "Because scikit-learn falls back to logistic regression",
          "Because a composition of linear maps is a linear map: W₂(W₁x + b₁) + b₂ is one affine function of x, so however many identity layers are stacked the decision boundary is a hyperplane — the non-linearity is what makes the hidden layer add anything",
          "Because the network had not converged",
          "Because the data were standardised"
        ],
        answer: 1,
        why: "The executed identity network scored 0.845 against the logistic regression's 0.846, with the same number of hidden units that gave ReLU 0.942. Depth without non-linearity is a more expensive way to fit a line."
      },
      {
        stem: "Which statement about ReLU's advantage over the sigmoid is correct?",
        options: [
          "ReLU is bounded and the sigmoid is not",
          "ReLU's derivative is 1 wherever the unit is active, so gradients pass through deep stacks undiminished, whereas each sigmoid layer scales the gradient by at most 0.25 and ten layers scale it by 10⁻⁶; ReLU's cost is 'dead' units with zero gradient, addressed by variants like leaky ReLU and by initialisation",
          "ReLU is smooth and the sigmoid is not",
          "ReLU outputs probabilities"
        ],
        answer: 1,
        why: "The worked backpropagation shows the mechanism: the gradient for the earlier weight carried an extra factor of 0.235. Sigmoids remain in the output layer (for probabilities) and in gates; in hidden layers ReLU and its relatives are the default because of exactly this arithmetic."
      },
      {
        stem: "Weight decay of 1.0 gave the best test accuracy on 200 points and the smallest weight norm. What is weight decay in the language of 4.3?",
        options: [
          "Early stopping",
          "An L2 penalty on every weight, α‖W‖², which is ridge regression's penalty applied to the whole network; it shrinks the function toward smoother ones, and the executed sweep traded training accuracy (1.000 → 0.930) for test accuracy (0.851 → 0.874) as the norm fell from 54 to 5",
          "A constraint that weights sum to one",
          "Dropout applied to the weights"
        ],
        answer: 1,
        why: "Regularisation in networks is the same idea as in linear models with more parameters to apply it to. Decay, dropout, early stopping, batch normalisation and augmentation all reduce the effective capacity; the executed early-stopping run shows that a regulariser that depends on a validation set is only as good as the validation set."
      },
      {
        stem: "A team reports that their MLP matches gradient boosting on a 50,000-row customer table after two weeks of tuning. What should the review ask?",
        options: [
          "Whether the network could go deeper",
          "What the two weeks bought: if the network only matches boosting on a heterogeneous table — the regime the executed churn result and the tabular benchmarks say favours trees — the cost of serving, explaining and retraining it must be justified by something boosting cannot do, such as embeddings shared with another model or a differentiable pipeline",
          "Whether they used ReLU",
          "Whether the batch size was 32"
        ],
        answer: 1,
        why: "Matching a baseline at higher cost is not progress unless the network is a means to something else. The regime table names the cases where it is; on a plain table the honest outcome of the comparison is usually to ship the boosting model with SHAP."
      },
      {
        stem: "How would you verify a hand-written backward pass before training with it?",
        options: [
          "Train and see whether the loss falls",
          "A gradient check: perturb each parameter by ±ε, compute the loss difference over 2ε, and compare with the analytic gradient — the executed check agreed to six decimals; a mismatch localises the bug to a layer, whereas a falling loss can hide a wrong gradient that is merely correlated with the right one",
          "Compare with a different learning rate",
          "Check that the weights are bounded"
        ],
        answer: 1,
        why: "Finite differences are slow (two forward passes per parameter) and exact enough; autograd frameworks make the hand-written case rare, but custom layers, losses and numerical tricks still get the check. A network can 'learn' with a gradient that is wrong by a sign in one layer and reach a bad plateau nobody diagnoses."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Neural Networks from the ML Side",
    sub: "The stack, the chain rule, the dials, the regularisers, and the tabular verdict.",
    questions: [
      {
        level: "Core",
        q: "Explain backpropagation with a concrete example.",
        strong: "It is the chain rule organised so that each layer's derivative is computed once and reused by every layer behind it. Take x → h = σ(w₁x) → ŷ = σ(w₂h) with loss ½(y − ŷ)², x = 1, y = 1, w₁ = 0.5, w₂ = −0.4. Forward: h = 0.6225, ŷ = 0.4381, loss 0.1579. Backward: ∂L/∂ŷ = −(y − ŷ) = −0.5619; times σ′(z₂) = ŷ(1 − ŷ) = 0.2462 gives the error at the output unit, δ = −0.1383; ∂L/∂w₂ = δ·h = −0.0861. For w₁ the same δ is multiplied by w₂ (−0.4) to reach the hidden unit, by σ′(z₁) = 0.235 to pass through it, and by x = 1: 0.0130. A finite-difference check agrees to six decimals. The reuse of δ is why the cost is one backward pass; the product of σ′ factors, each at most 0.25, is why sigmoid networks' early layers stop learning with depth and why ReLU replaced them; and the same bookkeeping, applied to any graph of differentiable operations, is what autograd does.",
        answer: [
          { t: "p", text: "The chain rule with reuse, every executed number, the vanishing-gradient consequence, and autograd." }
        ]
      },
      {
        level: "Core",
        q: "What do the learning rate and the batch size control, and how do they interact?",
        strong: "The learning rate is the step size along the negative gradient; too small and training never arrives — 0.0001 left a two-moons network at 0.852 after 500 iterations with the loss still falling — too large and it oscillates or diverges, though adaptive optimisers such as Adam widen the usable range, and 0.001 to 1.0 all reached 0.93 to 0.94 in my sweep. The batch size is how many examples each gradient estimate averages over: small batches give noisy gradients and many steps per epoch, large batches give accurate gradients and few. They interact through the number and size of the steps: 300 epochs at batch 1,000 was 300 updates and stalled at the linear solution (0.851), the same 300 epochs at batch 32 was 8,928 updates and reached 0.938. The linear scaling rule — rate proportional to batch size — compensates in the common range, and the gradient noise of small batches is itself a regulariser, which is why the smallest batches often generalise best at a compute cost.",
        answer: [
          { t: "p", text: "Both dials with the executed sweeps, their interaction through step counts, the scaling rule and the noise-as-regulariser point." }
        ]
      },
      {
        level: "Senior",
        q: "How do you regularise a neural network, and how do you know it is working?",
        strong: "Four tools with different mechanisms. Weight decay — an L2 penalty on all weights, ridge for networks — shrinks toward smoother functions; on a 256 × 256 network fitted to 200 noisy points it took training accuracy from 1.000 to 0.930 and test accuracy from 0.851 to 0.874 while the weight norm fell from 54 to 5. Dropout zeroes random hidden units at each step, so no unit can depend on another, and trains an implicit ensemble of thinned networks; it is the deep-learning default and needs the test-time rescaling that frameworks handle. Early stopping halts when validation loss stops improving — it requires a validation set large enough to judge, and my run on 40 validation points stopped at epoch 23 and under-fitted to 0.806. Batch normalisation and data augmentation are the other two. I know it is working from the train–validation gap closing without the validation score falling, from the sensitivity of the validation score to the regulariser's strength being a smooth curve with an interior optimum, and from the fold-to-fold spread: an MLP with a spread of 0.12 across folds, as one of my churn runs had, is not regularised however good its mean looks.",
        answer: [
          { t: "p", text: "The four regularisers with mechanisms and executed numbers, the validation-set caveat, and the three signs that regularisation is working." }
        ]
      },
      {
        level: "Senior",
        q: "When does a neural network beat gradient boosting on tabular data?",
        strong: "Rarely on the tables most businesses have, and reliably in a few identifiable regimes. On the churn table — 989 rows, eight heterogeneous columns — a regularised linear model scored 0.743 AUC, boosting 0.703 and the best MLP 0.688 with a much larger fold spread; the signal is thresholds and additive effects, and a hidden layer has nothing to build. On the 8 × 8 digits — 64 homogeneous pixel columns — the MLP scored 0.982 against boosting's 0.974: many smooth interacting inputs are what hidden layers represent compactly and trees approximate badly. The benchmark literature agrees: trees win on medium-sized heterogeneous tables with irregular targets and uninformative features; networks win with very large tables, high-cardinality categoricals that embeddings compress, homogeneous inputs, and whenever representation learning, multi-task sharing, transfer or a differentiable pipeline is the goal. In practice the comparison takes minutes — boosting, a linear model, an MLP with scaling and decay, five folds — and it settles the question for that table.",
        answer: [
          { t: "p", text: "The two executed regimes with numbers, the benchmark findings, the conditions that favour networks, and the cheap comparison that decides." }
        ]
      },
      {
        level: "Staff",
        q: "A junior engineer's PyTorch model trains to 100 % on the training set and 60 % on validation. Walk me through the diagnosis.",
        strong: "That gap is over-fitting, and the questions are how much capacity, how much data, and whether the split is honest. First the split: is the validation set from the same distribution and untouched by any preprocessing fitted on the full data — scalers, encoders, vocabularies — and free of duplicates or near-duplicates of training rows? Leakage in the other direction produces the same symptom as over-fitting and is the more common cause in practice. Then capacity against data: a 256 × 256 network memorised 200 points to 100 % in my experiment; the remedies in order of cost are weight decay (0.851 → 0.874 on that run), dropout on the hidden layers, early stopping on a validation set large enough to judge — not 40 points, which stopped a run at epoch 23 and under-fitted — augmentation if the inputs allow it, and a smaller or narrower network only after those. Then the learning dynamics: a learning-rate that is too high with a small batch can fit noise quickly; the training curve should show validation loss improving before it turns. Then the baseline: if logistic regression or boosting reaches 70 % on the same split, the network is not the right tool for this table and the executed churn comparison is the pattern. And throughout, a gradient check if any part of the model is hand-written, because a subtly wrong backward pass can still memorise a training set.",
        answer: [
          { t: "p", text: "Leakage first, then capacity versus data with the ordered remedies and executed numbers, the dynamics, the baseline test, and the gradient check." }
        ]
      }
    ]
  }
});

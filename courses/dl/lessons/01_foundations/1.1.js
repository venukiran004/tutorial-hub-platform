/* ============================================================================
   LESSON 1.1 — From the Perceptron to the MLP
   ========================================================================= */
EC.receiveLesson({
  id: "1.1",

  lede: "**A neuron is a weighted sum passed through a non-linearity, and everything in this course is built from that one operation.** The perceptron of 1958 learns AND and OR in a handful of passes and never learns XOR, because no line separates the two classes; add one hidden layer of two units and XOR is two lines combined. From there the questions are about depth, width, what a network of a given shape can represent, and whether gradient descent will find it — and, before any of that, whether the problem in front of you needs a network at all.",

  objectives: [
    "Write the neuron as z = w·x + b, a = f(z), and the perceptron learning rule, and run it to convergence on AND and OR",
    "Show why XOR defeats a single unit and build the two-unit solution by hand",
    "State the universal approximation theorem and what it does not promise, with a width sweep that shows both",
    "Count the parameters of a multilayer perceptron from its layer sizes and check the count in PyTorch",
    "Decide between a network and a classical model on a small table, from a comparison you ran"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "The neuron", id: "neuron" },

    { t: "p", text: "A single artificial neuron takes a vector of inputs x, multiplies each by a weight, adds a bias and passes the sum through an activation function:" },

    { t: "code", lang: "text", title: "One unit",
      code: `z = w₁x₁ + w₂x₂ + … + wₙxₙ + b  =  w·x + b        (the pre-activation, a linear function of x)
a = f(z)                                           (the activation, where f is non-linear)

step function   f(z) = 1 if z > 0 else 0   -- the perceptron
sigmoid         f(z) = 1 / (1 + e^(−z))    -- logistic regression is one sigmoid unit
ReLU            f(z) = max(0, z)           -- the default hidden unit since 2012`,
      caption: "The weights decide which inputs matter and in which direction; the bias shifts the threshold; the activation is what makes stacking units worthwhile. Without it, a stack of linear units is one linear unit." },

    { t: "p", text: "The bias is not decoration. A unit without one must pass through the origin: w·x = 0 is a line through (0, 0), and a threshold that has to sit anywhere else — *fire when the sum exceeds 0.5* — is unreachable. The bias is the intercept, and a unit has one for the same reason a regression line has one." },

    { t: "dl", items: [
      ["Weight", "One number per input. Its sign says whether the input pushes the unit toward firing; its magnitude says how strongly. Learned."],
      ["Bias", "The unit's threshold, moved to the left-hand side. Learned. A layer of n units has n biases."],
      ["Pre-activation z", "The linear part. Everything before the non-linearity; the quantity gradients flow through most directly."],
      ["Activation a", "The unit's output after f. The next layer's input. For the last layer, the prediction or the logit."],
      ["Layer", "Many units sharing the same inputs: z = Wx + b with W a matrix of shape (units, inputs). A network is a sequence of these."]
    ] },

    { t: "h2", n: "02", text: "The perceptron learning rule, executed", id: "perceptron" },

    { t: "p", text: "The perceptron is one step-function unit with the simplest possible update: show it an example, and if it is wrong, move the weights toward the example (if the target was 1) or away from it (if the target was 0). Every rule below is one line; the whole algorithm fits in ten." },

    { t: "code", lang: "python", title: "The rule, and what it learned",
      code: `def perceptron(X, y, epochs=20, lr=0.1):
    w = np.zeros(X.shape[1]); b = 0.0
    for ep in range(epochs):
        errs = 0
        for xi, yi in zip(X, y):
            pred = 1 if xi @ w + b > 0 else 0
            if pred != yi:                       # only mistakes move the weights
                w += lr * (yi - pred) * xi
                b += lr * (yi - pred)
                errs += 1
        if errs == 0: break
    return w, b

# executed on the four binary inputs
AND: w=[0.2 0.1], b=-0.20, epochs=6,  errors per epoch [.., 3, 3, 2, 1, 0], preds=[0,0,0,1], acc=1.00
OR:  w=[0.1 0.1], b= 0.00, epochs=4,  errors per epoch [1, 2, 1, 0],        preds=[0,1,1,1], acc=1.00
XOR: w=[-0.1 0.], b= 0.10, epochs=50, errors per epoch [4, 4, 4, 4, 4],     preds=[1,1,0,0], acc=0.50`,
      caption: "AND converged in six epochs to a line 0.2x₁ + 0.1x₂ = 0.2 that only (1, 1) crosses; OR in four. XOR made four errors on every one of fifty epochs and ended at chance — the weights cycle and never settle, because there is nothing to settle on." },

    { t: "p", text: "The AND weights are worth reading: 0.2x₁ + 0.1x₂ − 0.2 > 0 is true only at (1, 1), where it equals 0.1. At (1, 0) it is 0, and the rule is *strictly greater*, so the unit stays off. The perceptron found a line that works, not the most comfortable one; nothing in the rule asks for a margin. Everything with a margin — the SVM, logistic regression's smooth loss — came later for exactly that reason." },

    { t: "callout", kind: "info", title: "The convergence theorem",
      body: "If the data are linearly separable with margin γ and all inputs lie within radius R of the origin, the perceptron makes at most (R/γ)² mistakes before it stops — regardless of the order the examples arrive in. The exercise measures this: 81 updates against a bound of 1,090. The bound is loose, but it is finite, and for XOR there is no γ, so there is no bound, so it never stops." },

    { t: "h2", n: "03", text: "XOR: the wall, and the door", id: "xor" },

    { t: "p", text: "XOR is 1 when exactly one input is 1. Plot the four points: (0, 1) and (1, 0) are the positives, (0, 0) and (1, 1) the negatives, and the positives sit on one diagonal while the negatives sit on the other. A line puts one positive on each side of it, always. Minsky and Papert made this point in 1969 and neural-network research stalled for a decade; the answer was known in principle the whole time — use two lines." },

    { t: "code", lang: "python", title: "XOR from two ReLU units, by hand",
      code: `W1 = [[1, 1],      # unit 1: x1 + x2          fires on (0,1), (1,0), (1,1)
      [1, 1]]      # unit 2: x1 + x2 - 1      fires on (1,1) only
b1 = [0, -1]
W2 = [1, -2]       # output = unit1 - 2·unit2
b2 = 0

hidden activations for (0,0), (0,1), (1,0), (1,1):  [0,0], [1,0], [1,0], [2,1]
output:                                              0,     1,     1,     2 - 2 = 0     -- XOR`,
      caption: "Unit 1 counts how many inputs are on; unit 2 fires only when both are. The output subtracts twice the second from the first, which is 0, 1, 1, 0. Two lines, one non-linearity between them, and a linear read-out — the smallest network that computes XOR." },

    { t: "p", text: "Representable is not the same as learnable. Hand-built weights prove a two-unit ReLU network *can* compute XOR; whether gradient descent from a random start *finds* those weights is a separate question, and the answer depends on width and activation:" },

    { t: "table", head: ["Hidden units", "Activation", "Solved (of 10 seeds)", "Mean final loss"],
      rows: [
        ["0 (linear)", "—", "0 / 10", "0.6931 — exactly ln 2, chance"],
        ["2", "sigmoid", "6 / 10", "0.1681"],
        ["2", "ReLU", "0 / 10", "0.6369"],
        ["4", "ReLU", "9 / 10", "0.0699"],
        ["8", "tanh", "10 / 10", "0.0008"]
      ] },

    { t: "p", text: "The linear model ends at ln 2 = 0.6931 on every seed: it predicts 0.5 for every input, the best a line can do. The two-ReLU network — which you have just seen can represent XOR exactly — was found by SGD on none of ten starts. With two units, a random initialisation usually leaves at least one ReLU off for every input (its pre-activation negative everywhere), its gradient is zero, and it never recovers: the dying ReLU, met on the smallest possible example. Four units gave nine of ten; eight tanh units, whose gradient is never exactly zero, gave ten of ten. **Over-parameterisation is not waste — it is what makes the loss surface navigable.** That theme returns in every module." },

    { t: "h2", n: "04", text: "Depth, width, and the universal approximation theorem", id: "uat" },

    { t: "p", text: "Cybenko (1989) and Hornik (1991) proved that a network with one hidden layer of enough sigmoid — later, any non-polynomial — units can approximate any continuous function on a compact set to any precision. It is the theorem people quote to say networks are general. What it does not say is how many units *enough* is, whether gradient descent will find them, or anything about generalising beyond the training inputs. Here is the theorem on a number:" },

    { t: "code", lang: "text", title: "One hidden tanh layer fitting sin(3x) + 0.5x on [−2, 2], Adam, 3,000 steps (executed)",
      code: `width=  1   params=  4   mse=0.25959      -- one tanh can bend once; the target bends six times
width=  2   params=  7   mse=0.05666
width=  4   params= 13   mse=0.01466
width=  8   params= 25   mse=0.00001      -- enough
width= 16   params= 49   mse=0.00006
width= 64   params=193   mse=0.00001

depth vs width at roughly equal parameters:
width=64 depth=1 params=193 mse=0.00001
width=12 depth=3 params=349 mse=0.00001
width= 8 depth=5 params=313 mse=0.00002`,
      caption: "Eight tanh units reproduce the curve to five decimals; one cannot. On this smooth one-dimensional target, depth buys nothing over width — the theorem's setting is exactly the one where a single wide layer suffices." },

    { t: "p", text: "Why depth, then? Because for many functions a deep network needs exponentially fewer units than a shallow one — compositional structure (edges → parts → objects; characters → words → phrases) is expressed naturally by composition of layers, and a shallow network has to enumerate what a deep one can reuse. That is an argument about efficiency and inductive bias, not about what is representable, and the evidence for it is the entire history of computer vision since 2012 rather than a theorem. On sin(3x), width was enough; on images, it never has been." },

    { t: "dl", items: [
      ["Width", "Units per layer. More width: more directions for gradient descent, more parameters per layer, no extra composition. Cheap to increase; the theorem's lever."],
      ["Depth", "Number of layers. More depth: composition, hierarchical features, exponential efficiency for structured functions — and harder optimisation (module 1.8 measures the gradient shrinking through it), which residual connections (module 3.3) solve."],
      ["Universal approximation", "One hidden layer, enough units, any continuous function, any precision. Silent on the number of units, on learnability and on generalisation."]
    ] },

    { t: "h2", n: "05", text: "Counting parameters", id: "params" },

    { t: "p", text: "A fully connected layer from nᵢₙ inputs to nₒᵤₜ units has nᵢₙ × nₒᵤₜ weights and nₒᵤₜ biases. Sum over layers and you have the model's size, which is the first thing to compute for any architecture, because it bounds memory, predicts training time and, compared with the number of training examples, tells you how much regularisation you will need." },

    { t: "code", lang: "python", title: "784 → 128 → 64 → 10",
      code: `sizes = [784, 128, 64, 10]
n = sum(sizes[i] * sizes[i+1] + sizes[i+1] for i in range(len(sizes) - 1))
#   784·128 + 128  =  100,480
#   128·64  + 64   =    8,256
#    64·10  + 10   =      650
#                     109,386

net = nn.Sequential(nn.Linear(784,128), nn.ReLU(), nn.Linear(128,64), nn.ReLU(), nn.Linear(64,10))
sum(p.numel() for p in net.parameters())      # 109386  -- matches`,
      caption: "The first layer holds 92 % of the parameters: the input dimension dominates a dense network. That is the observation that motivates convolution (module 3), which shares weights across positions instead of assigning one to each pixel." },

    { t: "h2", n: "06", text: "Deep learning against classical ML, and when not to", id: "when" },

    { t: "p", text: "Deep learning differs from classical machine learning in one structural way: the features are learned rather than engineered. A gradient-boosted tree receives the columns you give it; a network receives raw pixels, waveform samples or token ids and builds its own representation in the hidden layers. That is decisive when the raw input is high-dimensional and homogeneous — images, audio, text — and irrelevant, sometimes harmful, when the input is twenty heterogeneous columns that a human already chose." },

    { t: "code", lang: "text", title: "Twenty features, five informative, 5 % label noise — test accuracy (executed)",
      code: `n=   200:  logreg=0.867 (0.0s)   gbm=0.917 (0.1s)   mlp 256-256=0.817 ( 0.3s)
n=  2000:  logreg=0.830 (0.0s)   gbm=0.878 (1.0s)   mlp 256-256=0.878 ( 3.5s)
n= 20000:  logreg=0.918 (0.0s)   gbm=0.946 (6.6s)   mlp 256-256=0.935 (25.7s)`,
      caption: "At 200 rows the network is ten points behind boosting and five behind a linear model; at 20,000 it has closed to within a point, at four times the cost. On a small table the network is the wrong tool, and the comparison takes seconds to run." },

    { t: "table", head: ["Situation", "Reach for", "Because"],
      rows: [
        ["Tabular, under ~10⁴ rows, engineered columns", "Boosting, linear models", "The features are already good; a network has nothing to learn but noise, and no data to learn it from"],
        ["Images, audio, text, sequences", "A network", "Representation is the problem; nothing else learns it from raw input"],
        ["Interpretability required by regulation", "Linear, trees, or a network with an explanation budget", "A coefficient is an explanation; a hidden layer is not, and Grad-CAM (3.7) is partial"],
        ["Millisecond latency on a CPU", "Whatever is smallest that meets the accuracy", "A 109,386-parameter MLP is cheap; a 25-million-parameter ResNet is not without module 11"],
        ["Plenty of homogeneous data, a hard perceptual task", "A network, and the rest of this course", "The regime where every measured advantage of deep learning lives"]
      ] },

    { t: "ladder",
      title: "Deciding whether the problem needs a network",
      rungs: [
        { level: "bad", label: "A deep network first, because it is the modern tool", code: `MLPClassifier((256, 256)).fit(X_small_table, y)      # 0.817 against boosting's 0.917 at n = 200`,
          note: "**Ten points behind a model that trained in a tenth of a second, and no diagnosis: the failure looks like a tuning problem and a week goes into tuning.**" },
        { level: "ok", label: "Baselines first; a network only when the input is raw and the data are plentiful", code: `for m in [LogisticRegression(), GradientBoosting(), MLP()]: score(m)     # three numbers in ten seconds`,
          note: "Honest, and on this table it says no. The same loop on 20,000 rows says *nearly* — which is the signal to ask whether more data are coming." },
        { level: "best", label: "Choose by regime, then build the network properly", code: `raw pixels / audio / tokens, ≥ 10⁴ examples  →  a network, with everything in modules 1–2
engineered columns, ≤ 10⁴ rows               →  boosting + a linear model; a network only as a checked experiment`,
          note: "The rest of this course is the *properly*. The decision that precedes it is the one most often skipped." }
      ] },

    { t: "viz",
      title: "One line cannot, two lines can",
      caption: "Left: the four XOR points with the positives on one diagonal; any single line leaves a positive on each side. Right: the hand-built hidden layer — unit 1 fires beyond x₁ + x₂ = 0, unit 2 beyond x₁ + x₂ = 1 — and the region between the two lines is exactly the positive class.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Two panels: XOR points that no single line separates, and the same points with two parallel lines from the hidden units enclosing the positive class.">
  <g>
    <line x1="60" y1="250" x2="360" y2="250" style="stroke:var(--line)" stroke-width="1.2"/>
    <line x1="60" y1="250" x2="60" y2="40" style="stroke:var(--line)" stroke-width="1.2"/>
    <text x="210" y="285" class="s-label" text-anchor="middle">one unit: any line fails</text>
    <text x="330" y="270" class="s-sub" text-anchor="middle">x₁</text><text x="45" y="55" class="s-sub" text-anchor="middle">x₂</text>
    <line x1="80" y1="110" x2="340" y2="230" style="stroke:var(--crit)" stroke-width="1.5" stroke-dasharray="6 4"/>
    <circle cx="100" cy="230" r="9" style="fill:var(--surface-2);stroke:var(--ink-3)" stroke-width="1.5"/><text x="100" y="234" class="s-sub" text-anchor="middle">0</text>
    <circle cx="320" cy="60" r="9" style="fill:var(--surface-2);stroke:var(--ink-3)" stroke-width="1.5"/><text x="320" y="64" class="s-sub" text-anchor="middle">0</text>
    <circle cx="100" cy="60" r="9" style="fill:var(--accent)"/><text x="100" y="64" class="s-sub" text-anchor="middle" style="fill:var(--surface-2)">1</text>
    <circle cx="320" cy="230" r="9" style="fill:var(--accent)"/><text x="320" y="234" class="s-sub" text-anchor="middle" style="fill:var(--surface-2)">1</text>
    <text x="215" y="150" class="s-sub" text-anchor="middle" style="fill:var(--crit)">a positive on each side</text>
  </g>
  <g>
    <line x1="500" y1="250" x2="800" y2="250" style="stroke:var(--line)" stroke-width="1.2"/>
    <line x1="500" y1="250" x2="500" y2="40" style="stroke:var(--line)" stroke-width="1.2"/>
    <text x="650" y="285" class="s-label" text-anchor="middle">two units: a band between two lines</text>
    <line x1="500" y1="145" x2="645" y2="250" style="stroke:var(--good)" stroke-width="1.5"/>
    <text x="520" y="200" class="s-sub" style="fill:var(--good)">x₁+x₂ = 0.5</text>
    <line x1="615" y1="40" x2="800" y2="175" style="stroke:var(--good)" stroke-width="1.5"/>
    <text x="700" y="60" class="s-sub" style="fill:var(--good)">x₁+x₂ = 1.5</text>
    <circle cx="540" cy="230" r="9" style="fill:var(--surface-2);stroke:var(--ink-3)" stroke-width="1.5"/><text x="540" y="234" class="s-sub" text-anchor="middle">0</text>
    <circle cx="760" cy="60" r="9" style="fill:var(--surface-2);stroke:var(--ink-3)" stroke-width="1.5"/><text x="760" y="64" class="s-sub" text-anchor="middle">0</text>
    <circle cx="540" cy="60" r="9" style="fill:var(--accent)"/><text x="540" y="64" class="s-sub" text-anchor="middle" style="fill:var(--surface-2)">1</text>
    <circle cx="760" cy="230" r="9" style="fill:var(--accent)"/><text x="760" y="234" class="s-sub" text-anchor="middle" style="fill:var(--surface-2)">1</text>
    <text x="650" y="150" class="s-sub" text-anchor="middle" style="fill:var(--accent)">unit1 on, unit2 off → 1</text>
  </g>
</svg>` },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The two-unit ReLU network can compute XOR exactly (the weights are shown), yet SGD found a solution on 0 of 10 random starts. What is the most likely reason?",
          options: [
            "Two units are not enough to represent XOR",
            "With so few units, a random start often leaves a ReLU with negative pre-activation on every input; its gradient is then zero, it never moves, and the remaining unit is linear — representable is not learnable",
            "The learning rate was too small for two units",
            "ReLU cannot be used in the hidden layer"
          ],
          answer: 1,
          why: "The hand-built weights prove representability, so the failure is one of optimisation. A dead ReLU has zero gradient everywhere it is off, and with only two units there is no spare capacity to compensate; four units solved nine of ten starts and eight tanh units, which never have exactly zero gradient, ten of ten."
        },
        {
          stem: "Why did the linear model end at a loss of exactly 0.6931 on every XOR seed?",
          options: [
            "It diverged",
            "0.6931 is ln 2, the cross-entropy of predicting probability 0.5 for every input, which is the best any single line can do on XOR",
            "The optimiser was not run long enough",
            "The bias was omitted"
          ],
          answer: 1,
          why: "No line separates the XOR classes, so the loss-minimising linear classifier assigns 0.5 to every point, and −ln 0.5 = 0.6931. The number is a signature: a binary classifier stuck at 0.693 is predicting the prior and has learned nothing."
        },
        {
          stem: "A network 784 → 128 → 64 → 10 has 109,386 parameters. Where do most of them sit, and what does that imply?",
          options: [
            "Evenly across the layers; nothing follows",
            "In the last layer, because it has the most units",
            "In the first layer (100,480 of them), because the input dimension multiplies the first width — which is why weight sharing across positions (convolution) matters for high-dimensional inputs",
            "In the biases"
          ],
          answer: 2,
          why: "784 × 128 dominates; the remaining two layers hold under 9,000 parameters between them. A dense first layer on a 224 × 224 × 3 image would have 150,528 weights per unit, which is the size argument for convolution."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "The perceptron bound, measured",
      difficulty: "foundation",
      minutes: 20,
      body: [
        { t: "p", text: "**(a)** Generate 200 points uniformly in [−1, 1]², label them by the sign of x₁ − x₂ + 0.1, and drop any point closer than 0.05 to that line. Implement the perceptron rule with the bias absorbed as a constant input and count the total number of weight updates until an epoch passes with no mistakes." },
        { t: "p", text: "**(b)** Compute R (the largest input norm, bias input included) and γ (the smallest signed distance to the true separator, normalised to unit length), and compare your update count with the bound (R/γ)²." },
        { t: "p", text: "**(c)** Run the same code on XOR for 1,000 epochs and report what the weights do. Then verify the two-ReLU hand solution." }
      ],
      requirements: [
        "(a) the number of points kept, epochs and updates.",
        "(b) R, γ, the bound and the actual count.",
        "(c) the final XOR weights and the four outputs of the hand-built network."
      ],
      hint: "Absorb the bias by appending a 1 to every input; then the update is w += y·x on a mistake and the bound applies to the augmented vectors. For γ use the true separator you generated with, normalised.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) points kept: 187  (class balance 94 / 93)
#     converged in 15 epochs after 81 updates; training accuracy 1.000

# (b) R = 1.710   gamma = 0.0518   bound (R/gamma)^2 = 1090   ->  actual updates 81
#     the bound holds with room to spare; it is a worst case over every ordering of the data

# (c) XOR: stopped after 1000 epochs, 4000 updates, final w = [0. 0. 0.]
#     -- four mistakes every epoch; the updates cancel exactly and the weights return to zero each pass
#     XOR via 2 ReLU units: [0.0, 1.0, 1.0, 0.0]`,
        notes: [
          { t: "p", text: "(a)–(b) put a number on the convergence theorem: finite, and loose by a factor of thirteen here." },
          { t: "p", text: "(c) is the theorem's other half — no margin, no bound, and the weights cycle. On XOR the four updates per epoch sum to zero, so the perceptron ends every epoch exactly where it began." }
        ]
      }
    }
  ],

  takeaways: [
    "A neuron is z = w·x + b followed by a non-linearity; the bias is the threshold and without it every unit's boundary passes through the origin.",
    "The perceptron rule moves the weights only on mistakes and converges on separable data (AND in 6 epochs, OR in 4; 81 updates against a bound of 1,090 in the exercise); on XOR it made four errors on every one of fifty epochs, because no line exists.",
    "Two hidden ReLU units compute XOR with hand-set weights, but SGD found that solution on 0 of 10 starts; four units gave 9 of 10 and eight tanh units 10 of 10 — representable and learnable are different questions, and width is what makes descent reliable.",
    "The universal approximation theorem promises one hidden layer of enough units can fit any continuous function (eight tanh units: MSE 0.00001 on sin 3x + 0.5x; one unit: 0.26); it says nothing about how many, whether descent finds them, or generalisation. Depth is about efficiency for compositional targets, not representability.",
    "Parameters = Σ (nᵢₙ × nₒᵤₜ + nₒᵤₜ) over layers: 109,386 for 784-128-64-10, 92 % of them in the first layer — the argument for weight sharing.",
    "On a 20-column table the network trailed boosting by ten points at 200 rows and by one point at 20,000, at four times the cost; deep learning's advantage lives in raw, homogeneous, plentiful input, and the baselines tell you in seconds which regime you are in."
  ],

  quiz: {
    title: "From the Perceptron to the MLP — Knowledge Check",
    questions: [
      {
        stem: "What does the perceptron learning rule do on an example it classifies correctly?",
        options: [
          "Moves the weights slightly toward the example",
          "Nothing — only mistakes change the weights, which is why the update count equals the mistake count and the convergence theorem is stated in mistakes",
          "Reduces the learning rate",
          "Updates the bias only"
        ],
        answer: 1,
        why: "The update is (y − ŷ)·x, which is zero when the prediction matches the target. On separable data the number of non-zero updates is bounded by (R/γ)² whatever the order of presentation; the exercise measured 81 against a bound of 1,090."
      },
      {
        stem: "Which statement about the universal approximation theorem is correct?",
        options: [
          "It guarantees gradient descent will find the approximating network",
          "It requires at least two hidden layers",
          "It says one hidden layer with enough non-polynomial units can approximate any continuous function on a compact set, but gives no bound on the number of units and no guarantee about generalisation",
          "It applies only to sigmoid activations"
        ],
        answer: 2,
        why: "Cybenko's and Hornik's results are existence theorems for one hidden layer; later work extended them to any non-polynomial activation. The width sweep showed eight units sufficed for sin(3x) + 0.5x and one did not — the theorem never said which."
      },
      {
        stem: "A network without bias terms is asked to fire when x₁ + x₂ > 1.5. Why does it fail?",
        options: [
          "It needs a second layer",
          "Without a bias the decision boundary w·x = 0 must pass through the origin, so the threshold 1.5 cannot be expressed",
          "ReLU cannot express thresholds",
          "It does not fail; the weights can absorb the threshold"
        ],
        answer: 1,
        why: "The bias is the intercept. w·x = 0 is a line through (0, 0) for any w; to place the boundary at x₁ + x₂ = 1.5 you need w·x − 1.5 = 0, and −1.5 is the bias. The same reasoning is why the exercise absorbs the bias as a constant input of 1."
      },
      {
        stem: "On the small tabular comparison, when did the network come closest to gradient boosting?",
        options: [
          "At 200 rows, where it was best",
          "At 20,000 rows, where it trailed by about one point (0.935 vs 0.946) at four times the cost; at 200 rows it trailed by ten",
          "Never; it was always ten points behind",
          "At 2,000 rows, where it won"
        ],
        answer: 1,
        why: "Networks need data to learn representations; with 200 rows of engineered columns there is nothing to learn but noise. The gap closed with data, which is the general pattern, and the linear model was competitive throughout because five informative features are nearly linear."
      },
      {
        stem: "Why does a deep network with no activation functions collapse to a single linear layer?",
        options: [
          "Because the biases cancel",
          "Because the product of matrices W₃W₂W₁ is itself one matrix, so the composition of linear maps is a linear map whatever the depth",
          "Because gradient descent removes the extra layers",
          "It does not collapse; depth adds capacity regardless"
        ],
        answer: 1,
        why: "Linear composed with linear is linear: y = W₃(W₂(W₁x + b₁) + b₂) + b₃ = Wx + b for some W and b. The non-linearity between layers is the entire reason stacking helps, which is why lesson 1.2 spends itself on the choice of f."
      }
    ]
  },

  interview: {
    title: "Interview Questions — From the Perceptron to the MLP",
    sub: "The neuron, the perceptron's limit, universal approximation, parameter counts, and the deep-versus-classical decision.",
    questions: [
      {
        level: "Core",
        q: "What is a perceptron and why is it limited?",
        strong: "A single unit computing step(w·x + b), trained by moving the weights toward misclassified positives and away from misclassified negatives. It is a linear classifier, so it can learn only linearly separable functions: on AND it converged in six epochs and on OR in four, but on XOR it made four errors on every epoch for fifty epochs and ended at chance, because the positives (0, 1) and (1, 0) sit on one diagonal and no line separates them. The fix is a hidden layer: two ReLU units — one firing beyond x₁ + x₂ = 0.5, one beyond 1.5 — with a read-out of unit₁ − 2·unit₂ compute XOR exactly. The limitation is the single linear boundary, and the multilayer perceptron removes it.",
        answer: [
          { t: "p", text: "Definition, the rule, the executed AND/OR/XOR result, the geometric reason, and the two-unit fix with its weights." }
        ]
      },
      {
        level: "Core",
        q: "State the universal approximation theorem and what it does not tell you.",
        strong: "A feed-forward network with one hidden layer of finitely many units and a non-polynomial activation can approximate any continuous function on a compact set to arbitrary precision. It does not say how many units are needed, whether gradient descent will find them from a random start, or anything about generalisation to inputs outside the training set. All three matter in practice: fitting sin(3x) + 0.5x on [−2, 2], one tanh unit reached MSE 0.26 and eight reached 0.00001, and the theorem gives no way to predict that eight. On XOR a two-unit network exists but SGD found it on none of ten starts — existence and learnability are different questions. Depth is preferred in practice for efficiency on compositional functions, which is an argument the theorem does not make.",
        answer: [
          { t: "p", text: "The statement, the three silences, the executed width sweep and the XOR learnability result." }
        ]
      },
      {
        level: "Core",
        q: "How many parameters does a 784-128-64-10 MLP have, and why does it matter?",
        strong: "For each layer, inputs × outputs weights plus outputs biases: 784·128 + 128 = 100,480; 128·64 + 64 = 8,256; 64·10 + 10 = 650; total 109,386, which PyTorch confirms. Ninety-two per cent sit in the first layer because the input dimension multiplies the first width. That matters three ways: memory and compute scale with it; the ratio of parameters to training examples predicts how much regularisation you need; and the concentration in the first layer is the argument for convolution, which shares weights across positions so that a 224 × 224 image does not need 150,528 weights per hidden unit.",
        answer: [
          { t: "p", text: "The formula, the executed count, the concentration in the first layer and its consequence." }
        ]
      },
      {
        level: "Advanced",
        q: "When should you not use deep learning?",
        strong: "When the input is a small table of engineered columns. The advantage of a network is learned representation, and a hand-chosen column set has nothing left to learn from: on twenty features with five informative and 200 rows, an MLP scored 0.817 against 0.917 for gradient boosting and 0.867 for logistic regression, and at 20,000 rows it was still a point behind at four times the training time. Add the cases where a coefficient is required as an explanation, where inference must be tiny, and where there are too few examples to fit a representation at all. The correct habit is to run a linear model and a boosting model first — ten seconds — and to reach for a network when the input is raw and plentiful: images, audio, text, sequences, where nothing else learns the features.",
        answer: [
          { t: "p", text: "The regime argument, the executed table comparison, the other three cases, and the baseline-first habit." }
        ]
      },
      {
        level: "Advanced",
        q: "Why did a two-unit ReLU network fail to learn XOR by gradient descent when the solution exists?",
        strong: "Because the loss surface for the minimal network is hostile. A ReLU with a negative pre-activation on all four inputs outputs zero everywhere and has zero gradient, so it never changes; with only two units, a random initialisation frequently leaves one dead, and a single ReLU plus a linear read-out is at best a line, which is chance on XOR. That is the dying-ReLU failure on the smallest possible example. Width fixes it by giving descent spare units — four gave nine of ten starts — and a smooth activation fixes it differently: eight tanh units solved ten of ten because tanh's gradient is never exactly zero. The general lesson is that over-parameterisation makes optimisation reliable, which is why practical networks are far wider than the smallest network that could represent the target.",
        answer: [
          { t: "p", text: "The dead-ReLU mechanism, the executed counts across width and activation, and the over-parameterisation principle." }
        ]
      }
    ]
  }
});

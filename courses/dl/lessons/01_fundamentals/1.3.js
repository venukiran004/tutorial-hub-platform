/* ============================================================================
   LESSON 1.3 — Forward Propagation and Loss Functions
   Mirrors 01_Neural_Network_Fundamentals.md · §3 (Matrix Form, Numerical
   Example) and §4 (Classification, Regression, Focal Loss, Hinge Loss, the
   selection rule and the MLE connection). The reference's numerical example
   is re-worked and checked in NumPy and PyTorch; every loss is computed.
   ========================================================================= */
EC.receiveLesson({
  id: "1.3",

  lede: "**The forward pass pushes an input through the layers to a prediction; the loss turns that prediction and the truth into one number the optimiser can minimise.** Both are deterministic and both are short — a forward pass is a matrix multiply, a bias and an activation per layer, and a loss is a formula — yet the pairing of the last activation with the loss decides whether training works at all. This lesson works the reference's two-layer example by hand and in matrix form, checks it in NumPy and PyTorch, and computes each loss on small examples so you can see cross-entropy's asymmetry, Huber's compromise, focal loss's down-weighting and the hinge's margin.",

  objectives: [
    "Write the forward pass in matrix form, Z⁽ˡ⁾ = W⁽ˡ⁾A⁽ˡ⁻¹⁾ + b⁽ˡ⁾, A⁽ˡ⁾ = g⁽ˡ⁾(Z⁽ˡ⁾), with the shape of every term",
    "Carry a 2 → 2 → 1 network's forward pass through by hand for one input and for a batch, and reproduce it in PyTorch",
    "Compute binary and categorical cross-entropy, MSE, MAE, Huber, focal and hinge loss on given numbers",
    "Choose the loss and the output activation for a task from the reference's selection rule, and explain the maximum-likelihood connection"
  ],

  prerequisites: ["1.1", "1.2"],

  blocks: [

    { t: "h2", n: "01", text: "Forward propagation in matrix form", id: "matrix" },

    { t: "p", text: "Forward propagation is the process of passing an input through the network, layer by layer, to produce a prediction: at each layer multiply by the weight matrix, add the bias, apply the activation. It is deterministic — the same weights and the same input always give the same output — and vectorised, so a whole batch goes through at once. With one example per column:" },

    { t: "math", tex: "\\mathbf{Z}^{[l]} = \\mathbf{W}^{[l]}\\mathbf{A}^{[l-1]} + \\mathbf{b}^{[l]}, \\qquad \\mathbf{A}^{[l]} = g^{[l]}\\!\\left(\\mathbf{Z}^{[l]}\\right), \\qquad \\mathbf{A}^{[0]} = \\mathbf{X}" },

    { t: "table", head: ["Term", "Shape", "Meaning"],
      rows: [
        ["X = A⁽⁰⁾", "n_features × m", "The batch: m examples as columns"],
        ["W⁽ˡ⁾", "n_l × n_{l−1}", "Weights of layer l: one row per unit, one column per input"],
        ["b⁽ˡ⁾", "n_l × 1", "One bias per unit, broadcast across the m columns"],
        ["Z⁽ˡ⁾", "n_l × m", "Pre-activations for every unit and every example"],
        ["A⁽ˡ⁾ = g⁽ˡ⁾(Z⁽ˡ⁾)", "n_l × m", "Activations; the next layer's input"],
        ["A⁽ᴸ⁾", "output_dim × m", "The predictions — probabilities, logits or values"]
      ] },

    { t: "viz", title: "One layer of the forward pass, as shapes",
      caption: "A (2 × 2) weight matrix times a (2 × 3) batch gives a (2 × 3) pre-activation; the bias, a column, is added to every example; the activation is applied to every entry. The batch dimension m rides along untouched through every layer.",
      svg: `<svg viewBox="0 0 760 170" role="img" aria-label="Shapes through one layer of forward propagation">
<g>
  <rect x="20" y="40" width="90" height="90" rx="8" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)" stroke-width="1.4"/>
  <text x="65" y="80" text-anchor="middle" class="s-label">W⁽¹⁾</text><text x="65" y="98" text-anchor="middle" class="s-sub">2 × 2</text>
  <text x="128" y="90" text-anchor="middle" class="s-label">×</text>
  <rect x="146" y="40" width="130" height="90" rx="8" class="s-fill s-stroke" stroke-width="1.4"/>
  <text x="211" y="80" text-anchor="middle" class="s-label">X</text><text x="211" y="98" text-anchor="middle" class="s-sub">2 × m (m = 3)</text>
  <text x="294" y="90" text-anchor="middle" class="s-label">+</text>
  <rect x="312" y="40" width="34" height="90" rx="8" style="fill:var(--warn);fill-opacity:.14;stroke:var(--warn)" stroke-width="1.4"/>
  <text x="329" y="80" text-anchor="middle" class="s-label">b</text><text x="329" y="98" text-anchor="middle" class="s-sub">2×1</text>
  <text x="366" y="90" text-anchor="middle" class="s-label">=</text>
  <rect x="384" y="40" width="130" height="90" rx="8" class="s-fill s-stroke" stroke-width="1.4"/>
  <text x="449" y="80" text-anchor="middle" class="s-label">Z⁽¹⁾</text><text x="449" y="98" text-anchor="middle" class="s-sub">2 × 3</text>
  <text x="540" y="90" text-anchor="middle" class="s-label">→ g( · ) →</text>
  <rect x="600" y="40" width="130" height="90" rx="8" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="1.4"/>
  <text x="665" y="80" text-anchor="middle" class="s-label">A⁽¹⁾</text><text x="665" y="98" text-anchor="middle" class="s-sub">2 × 3, element-wise</text>
  <text x="380" y="158" text-anchor="middle" class="s-sub">the bias column is broadcast across all m examples; the activation is applied to every entry</text>
</g></svg>` },

    { t: "h2", n: "02", text: "The numerical example, worked and checked", id: "example" },

    { t: "p", text: "The reference's network has 2 inputs, 2 hidden ReLU units and 1 sigmoid output, with these weights and this input:" },

    { t: "code", lang: "text", title: "The forward pass by hand",
      code: `W¹ = [[0.5, −0.3],     b¹ = [0.1, −0.2]       x = [1.0, 2.0]
      [0.8,  0.6]]
W² = [0.4, −0.7]        b² = [0.3]

z¹ = W¹x + b¹
   = [0.5·1.0 + (−0.3)·2.0 + 0.1,  0.8·1.0 + 0.6·2.0 + (−0.2)]
   = [0.5 − 0.6 + 0.1,  0.8 + 1.2 − 0.2]
   = [0.0, 1.8]
a¹ = ReLU(z¹) = [0.0, 1.8]              -- the first hidden unit contributes nothing for this input

z² = W²a¹ + b² = 0.4·0.0 + (−0.7)·1.8 + 0.3 = −0.96
ŷ  = σ(−0.96) = 1 / (1 + e^0.96) = 0.277

P(y = 1) = 0.277 → predict class 0`,
      caption: "The reference's text has the first pre-activation as −0.1; the arithmetic gives 0.5 − 0.6 + 0.1 = 0.0. Either way ReLU sends it to 0 and the final prediction, 0.277, is the same — but check the line, because in a backward pass (lesson 1.4) the sign of that pre-activation decides whether the unit receives any gradient." },

    { t: "p", text: "Now three examples at once, in the matrix form, and the same computation in PyTorch — which stores each layer's weight as (out, in) and takes the batch as rows, so the numbers are identical and only the orientation differs:" },

    { t: "code", lang: "python", title: "The example in NumPy (columns) and PyTorch (rows)",
      code: `import numpy as np, torch
np.set_printoptions(precision=4, suppress=True)

W1 = np.array([[0.5, -0.3], [0.8, 0.6]]); b1 = np.array([0.1, -0.2])
W2 = np.array([0.4, -0.7]);               b2 = np.array([0.3])

X = np.array([[1.0, 0.0, -1.0],          # feature 1 of examples 1, 2, 3
              [2.0, 1.0,  0.5]])         # feature 2
Z1 = W1 @ X + b1[:, None];  A1 = np.maximum(0, Z1)        # (2 x 3)
Z2 = W2 @ A1 + b2;          Y  = 1 / (1 + np.exp(-Z2))    # (3,)
print("Z1 =\\n", Z1, "\\nA1 =\\n", A1, "\\nZ2 =", Z2, "\\nY  =", Y)

lin1, lin2 = torch.nn.Linear(2, 2), torch.nn.Linear(2, 1)
with torch.no_grad():
    lin1.weight.copy_(torch.tensor(W1)); lin1.bias.copy_(torch.tensor(b1))
    lin2.weight.copy_(torch.tensor(W2)[None]); lin2.bias.copy_(torch.tensor(b2))
    xb = torch.tensor(X.T, dtype=torch.float32)          # (3 x 2): one example per ROW
    print("torch:", torch.sigmoid(lin2(torch.relu(lin1(xb)))).squeeze(1).numpy())`,
      caption: "Column 1 is the hand-worked example: Z1 = [0, 1.8], output 0.2769. Examples 2 and 3 show the first hidden unit is off for all three inputs — its weights would receive no gradient from this batch." },

    { t: "out", text: `Z1 =
 [[ 0.   -0.2  -0.55]
 [ 1.8   0.4  -0.7 ]]
A1 =
 [[0.  0.  0. ]
 [1.8 0.4 0. ]]
Z2 = [-0.96  0.02  0.3 ]
Y  = [0.2769 0.505  0.5744]
torch: [0.2769 0.505  0.5744]` },

    { t: "h2", n: "03", text: "Loss functions", id: "loss" },

    { t: "p", text: "A loss function measures how far predictions are from the truth as a single number, and its gradient with respect to the parameters is what backpropagation delivers to the optimiser. The choice is set by the task: cross-entropy for classification, where the prediction is a probability distribution, and mean squared error for regression, where it is a value." },

    { t: "h3", text: "Classification" },

    { t: "math", tex: "\\mathcal{L}_{\\text{BCE}} = -\\frac{1}{m}\\sum_{i=1}^{m}\\Big[y_i \\log \\hat{y}_i + (1-y_i)\\log(1-\\hat{y}_i)\\Big], \\qquad \\mathcal{L}_{\\text{CE}} = -\\frac{1}{m}\\sum_{i=1}^{m}\\sum_{c=1}^{C} y_{i,c}\\log \\hat{y}_{i,c}" },

    { t: "p", text: "Binary cross-entropy keeps whichever term matches the label: −log ŷ when y = 1, −log(1 − ŷ) when y = 0. Categorical cross-entropy with one-hot targets is simply −log of the probability assigned to the true class. Both punish confident mistakes without bound — −log(0.01) = 4.6, −log(0.001) = 6.9 — which is the point." },

    { t: "h3", text: "Regression" },

    { t: "math", tex: "\\mathcal{L}_{\\text{MSE}} = \\frac{1}{m}\\sum_{i=1}^{m}(y_i - \\hat{y}_i)^2, \\qquad \\mathcal{L}_{\\text{Huber}} = \\begin{cases}\\tfrac12 (y-\\hat y)^2 & |y - \\hat y| \\le \\delta \\\\ \\delta\\,|y-\\hat y| - \\tfrac12\\delta^2 & \\text{otherwise}\\end{cases}" },

    { t: "p", text: "MSE squares the residual, so one large error dominates the batch; MAE takes its absolute value, so every error counts in proportion; Huber is MSE inside a band of width δ and MAE outside it — quadratic near the answer for a smooth gradient, linear far from it so an outlier cannot take over." },

    { t: "h3", text: "Focal loss" },

    { t: "math", tex: "FL(p_t) = -\\alpha_t\\,(1-p_t)^{\\gamma}\\,\\log p_t" },

    { t: "p", text: "Cross-entropy with a factor (1 − p_t)^γ in front. When an example is already well classified (p_t → 1) the factor goes to zero and the example stops contributing, so the loss concentrates on the hard ones. γ = 2 and α = 0.25 are the usual settings; RetinaNet introduced it for object detection, where background examples outnumber objects a thousand to one." },

    { t: "h3", text: "Hinge loss" },

    { t: "math", tex: "L = \\max\\big(0,\\; 1 - y\\,\\hat{y}\\big), \\qquad y \\in \\{-1, +1\\}" },

    { t: "p", text: "The SVM's loss. It is zero once the prediction is on the correct side of the margin (y·ŷ ≥ 1) and grows linearly inside or beyond it, so it asks for confident correct predictions and then stops caring. It is not differentiable at y·ŷ = 1, which optimisers tolerate." },

    { t: "code", lang: "python", title: "Every loss, on numbers",
      code: `import torch, torch.nn.functional as F, numpy as np

# binary cross-entropy: the hand-worked prediction 0.277 with label 1, and two more
y = torch.tensor([1.0, 0.0, 1.0]); p = torch.tensor([0.277, 0.2, 0.9])
bce = -(y * torch.log(p) + (1 - y) * torch.log(1 - p))
print("BCE per example", bce.numpy(), "mean", bce.mean().item(), "| F:", F.binary_cross_entropy(p, y).item())

# categorical cross-entropy from logits, true class 0
logits = torch.tensor([[2.0, 1.0, 0.1]]); sm = torch.softmax(logits, 1)
print("softmax", sm.numpy(), " -log p_true =", -torch.log(sm[0, 0]).item(), "| F:", F.cross_entropy(logits, torch.tensor([0])).item())

# regression losses on four residuals: -0.5, +0.5, 0, +1.5
yt = torch.tensor([3.0, -0.5, 2.0, 7.0]); yp = torch.tensor([2.5, 0.0, 2.0, 8.5])
print("MSE", F.mse_loss(yp, yt).item(), "MAE", F.l1_loss(yp, yt).item(), "Huber(δ=1)", F.huber_loss(yp, yt, delta=1.0).item())

# focal against plain cross-entropy at three confidences
for pt in [0.9, 0.6, 0.3]:
    ce = -np.log(pt); fl = -0.25 * (1 - pt) ** 2 * np.log(pt)
    print(f"p_t={pt}: CE {ce:.4f}  focal(γ=2, α=0.25) {fl:.4f}  ratio {fl / ce:.4f}")

# hinge on four (label, score) pairs
for yv, s in [(1, 2.0), (1, 0.5), (1, -1.0), (-1, 0.5)]:
    print(f"y={yv:+d} score={s:+.1f}: hinge {max(0, 1 - yv * s):.2f}")`,
      caption: "The hand-written formulas agree with PyTorch's functional versions to floating-point precision. Read the focal ratios: at p_t = 0.9 the example contributes a quarter of a percent of its cross-entropy; at 0.3, twelve percent." },

    { t: "out", text: `BCE per example [1.2837 0.2231 0.1054] mean 0.5374 | F: 0.5374
softmax [[0.659  0.2424 0.0986]]  -log p_true = 0.4170 | F: 0.4170
MSE 0.6875 MAE 0.625 Huber(δ=1) 0.3125
p_t=0.9: CE 0.1054  focal(γ=2, α=0.25) 0.0003  ratio 0.0025
p_t=0.6: CE 0.5108  focal(γ=2, α=0.25) 0.0204  ratio 0.0400
p_t=0.3: CE 1.2040  focal(γ=2, α=0.25) 0.1475  ratio 0.1225
y=+1 score=+2.0: hinge 0.00
y=+1 score=+0.5: hinge 0.50
y=+1 score=-1.0: hinge 2.00
y=-1 score=+0.5: hinge 1.50` },

    { t: "p", text: "The regression line is worth a second look. Residuals of −0.5, 0.5, 0 and 1.5 give MSE 0.6875 and MAE 0.625; the single 1.5 residual is 82 % of the MSE (2.25 of 2.75 before averaging) but only 60 % of the MAE. Huber with δ = 1 treats the three small residuals quadratically (0.125, 0.125, 0) and the large one linearly (1.5 − 0.5 = 1.0): total 1.25, mean 0.3125." },

    { t: "h2", n: "04", text: "Choosing the loss", id: "choose" },

    { t: "table", head: ["Task", "Output activation", "Loss"],
      rows: [
        ["Binary classification", "Sigmoid", "Binary cross-entropy"],
        ["Multi-class, exactly one label", "Softmax", "Categorical cross-entropy"],
        ["Multi-label", "Sigmoid per class", "Binary cross-entropy per class"],
        ["Regression", "Linear", "MSE by default; MAE when robustness matters; Huber as the compromise"],
        ["Regression with outliers", "Linear", "Huber or MAE"],
        ["Severe class imbalance (detection)", "Sigmoid", "Focal loss"],
        ["Maximum-margin classification", "Linear score", "Hinge"]
      ] },

    { t: "callout", kind: "mental", title: "Loss = negative log-likelihood",
      body: [{ t: "p", text: "Cross-entropy is the negative log-likelihood of a Bernoulli (binary) or categorical model; MSE is the negative log-likelihood of a Gaussian with fixed variance. Minimising the loss is maximising the likelihood of the data under the model the output activation implies — which is why the activation and the loss come in pairs, and why the pairs cannot be mixed." }] },

    { t: "callout", kind: "trap", title: "In PyTorch the softmax is inside the loss",
      body: [{ t: "p", text: "`nn.CrossEntropyLoss` expects raw logits and applies log-softmax itself, numerically stably; `nn.BCEWithLogitsLoss` does the same with the sigmoid. Put a softmax layer at the end of a model trained with CrossEntropyLoss and you apply it twice — the model still trains, slowly, with squashed gradients, and the bug is silent. The model's last layer should be `nn.Linear` and nothing else." }] },

    { t: "exercise", kind: "practice", title: "Carry a different input through", difficulty: "foundation", minutes: 12,
      body: [{ t: "p", text: "With the reference's weights, work the forward pass by hand for x = [2.0, 1.0]: z¹, a¹, z², ŷ, and the binary cross-entropy if the true label is 1. Check every number in NumPy." }],
      requirements: [
        "Show each pre-activation and activation",
        "State the predicted class and the BCE loss for y = 1",
        "Say which hidden units are active for this input, and why that matters for the backward pass"
      ],
      hint: "z¹ = [0.5·2 − 0.3·1 + 0.1, 0.8·2 + 0.6·1 − 0.2].",
      solution: { lang: "python", title: "Solution",
        code: `import numpy as np
W1 = np.array([[0.5, -0.3], [0.8, 0.6]]); b1 = np.array([0.1, -0.2]); W2 = np.array([0.4, -0.7]); b2 = 0.3
x = np.array([2.0, 1.0])
z1 = W1 @ x + b1              # [0.8, 2.0]
a1 = np.maximum(0, z1)        # [0.8, 2.0]  -- both units active this time
z2 = W2 @ a1 + b2             # 0.32 - 1.4 + 0.3 = -0.78
yhat = 1 / (1 + np.exp(-z2))  # 0.3143
bce = -np.log(yhat)           # 1.1574 for y = 1
print(z1, a1, z2, yhat, bce)`,
        notes: [{ t: "p", text: "z¹ = [0.8, 2.0], both units active, z² = −0.78, ŷ = 0.314, predicted class 0, loss −log 0.314 = 1.157. Because both hidden units are active, both receive gradient in the backward pass; for the reference's input only the second did." }] } }
  ],

  takeaways: [
    "Forward propagation is Z⁽ˡ⁾ = W⁽ˡ⁾A⁽ˡ⁻¹⁾ + b⁽ˡ⁾, A⁽ˡ⁾ = g(Z⁽ˡ⁾), layer after layer; the batch dimension passes through untouched.",
    "The reference's 2 → 2 → 1 example gives z¹ = [0, 1.8], a¹ = [0, 1.8], z² = −0.96, ŷ = 0.277 — checked in NumPy and PyTorch, with the batch version showing which units are active per example.",
    "Cross-entropy is −log of the probability given to the truth; it punishes confident errors without bound and pairs with sigmoid (binary) or softmax (multi-class).",
    "MSE lets one large residual dominate, MAE counts every residual in proportion, Huber is quadratic inside δ and linear outside.",
    "Focal loss multiplies cross-entropy by (1 − p_t)^γ so well-classified examples fade out; hinge loss is zero beyond the margin and linear inside it.",
    "Loss and output activation are a pair implied by a likelihood model, and in PyTorch the softmax or sigmoid usually lives inside the loss function."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "In the matrix form with examples as columns, a layer with 64 units fed by 128 features processes a batch of 32. What is the shape of Z⁽ˡ⁾?",
      options: ["128 × 32", "64 × 128", "64 × 32", "32 × 64"],
      answer: 2,
      why: "W is (64 × 128), A⁽ˡ⁻¹⁾ is (128 × 32), and their product is (64 × 32): one pre-activation per unit per example. The bias (64 × 1) is broadcast across the 32 columns. PyTorch would show the transpose, (32 × 64)." },
    { stem: "A model outputs probability 0.01 for the true class of one example. What is its cross-entropy contribution?",
      options: ["0.01", "0.99", "−log 0.01 ≈ 4.6", "log 0.01 ≈ −4.6"],
      answer: 2,
      why: "Cross-entropy for that example is −log of the probability assigned to the true class: −log 0.01 ≈ 4.605. A confident mistake costs far more than a hesitant one (−log 0.4 ≈ 0.92), and the cost is unbounded as the probability approaches zero." },
    { stem: "Which loss keeps a squared penalty for small residuals but a linear one for large ones?",
      options: ["MSE", "MAE", "Huber", "Hinge"],
      answer: 2,
      why: "Huber is ½r² for |r| ≤ δ and δ|r| − ½δ² beyond, so it has MSE's smooth gradient near the answer and MAE's resistance to outliers far from it. On the example residuals it gave 0.3125 against MSE's 0.6875." },
    { stem: "Why does focal loss help with extreme class imbalance?",
      options: ["It upweights the rare class by a fixed factor only", "The (1 − p_t)^γ factor makes already-easy examples contribute almost nothing, so the abundant easy negatives stop dominating", "It replaces the softmax with a sigmoid", "It clips the loss at a maximum value"],
      answer: 1,
      why: "With thousands of easy background examples, ordinary cross-entropy is dominated by their small but numerous contributions. Focal loss scales each example by (1 − p_t)^γ: at p_t = 0.9 and γ = 2 the example keeps only 1 % of its weight (0.25 % with α = 0.25), so training concentrates on the hard examples." }
  ] },

  interview: { title: "Interview", sub: "What the reference's loss section prepares you for", questions: [
    { level: "Core", q: "Why is cross-entropy preferred over MSE for classification?",
      strong: "Its gradient does not vanish for confident wrong predictions, and it is the likelihood of the model the sigmoid or softmax implies.",
      answer: [{ t: "p", text: "With a sigmoid output and MSE, the gradient of the loss with respect to the logit carries a factor σ′(z) = ŷ(1 − ŷ), which is tiny when the prediction is confidently wrong — exactly when a big correction is needed. With cross-entropy the σ′ factor cancels and the gradient is simply ŷ − y: large when the prediction is far from the label. Cross-entropy is also the negative log-likelihood of a Bernoulli or categorical model, so minimising it is maximum-likelihood estimation of the class probabilities, which is what a classifier should be doing." }] },
    { level: "Core", q: "What is the difference between a loss and a metric?",
      strong: "The loss is what is optimised and must be differentiable; the metric is what is reported and need not be.",
      answer: [{ t: "p", text: "The loss is the training objective — cross-entropy, MSE — chosen to be smooth so gradients exist and to be a good proxy for the goal. A metric — accuracy, F1, mAP, BLEU — is what you actually care about and is usually not differentiable (accuracy is piecewise constant) or not decomposable per example. You monitor the metric on validation data and select models by it, while the optimiser only ever sees the loss. When the two disagree, the metric wins and the loss gets reconsidered." }] },
    { level: "Senior", q: "A regression target has a few extreme values. Walk through the loss choice.",
      strong: "MSE if the extremes are real and matter, MAE if they are noise, Huber if you want both regimes, and consider transforming the target.",
      answer: [{ t: "p", text: "Ask first whether the extremes are legitimate. If they are and errors on them are costly, MSE's squared penalty is what you want. If they are noise or data errors, MSE lets each one dominate a batch's gradient — a residual of 1.5 among residuals of 0.5 was 82 % of the MSE in this lesson — so MAE, whose gradient is ±1 regardless of size, is safer. Huber gives a quadratic zone of width δ for smooth convergence and linear behaviour beyond it; set δ from the residual distribution, around the point where residuals stop looking like noise. Also consider predicting log(target) if the extremes are multiplicative in nature, which often removes the problem at source." }] }
  ] }
});

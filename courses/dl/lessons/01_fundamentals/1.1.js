/* ============================================================================
   LESSON 1.1 — Neural Network Architecture
   Mirrors 01_Neural_Network_Fundamentals.md · Key Definitions and §1
   (The Perceptron, Multi-Layer Perceptron, Universal Approximation Theorem,
   Parameter Count). The parameter-count example is checked in PyTorch.
   ========================================================================= */
EC.receiveLesson({
  id: "1.1",

  lede: "**A neural network is layers of neurons, each computing a weighted sum plus a bias and passing it through a non-linearity, with the weights adjusted during training until the network maps inputs to the outputs you want.** One neuron — the perceptron — draws a single straight boundary and cannot learn XOR; stack a hidden layer between input and output and any continuous function is within reach in principle. This lesson is the vocabulary the whole course uses, the perceptron and its limit, the multi-layer perceptron and the theorem behind it, and the arithmetic of counting a network's parameters — checked against PyTorch, where the reference's own example turns out to be 64 parameters off.",

  objectives: [
    "Define neuron, layer, activation, forward pass, loss, backpropagation and the other terms in the reference's key-definitions table, in your own words",
    "Write the perceptron as y = σ(wᵀx + b) and explain, with the four XOR points, why one unit cannot learn it and two hidden units can",
    "Write the layer equations z⁽ˡ⁾ = W⁽ˡ⁾a⁽ˡ⁻¹⁾ + b⁽ˡ⁾, a⁽ˡ⁾ = σ(z⁽ˡ⁾) and state what fully connected means",
    "State the universal approximation theorem and the three things it does not promise",
    "Count the parameters of any fully connected network from its layer sizes, and check the count in PyTorch"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "Key definitions, read first", id: "definitions" },

    { t: "p", text: "The reference opens with a table of terms and so does this course, because every later lesson assumes them. Read them once now; each gets its own lesson in this module." },

    { t: "dl", items: [
      ["Neuron / perceptron", "The basic unit: a weighted sum of its inputs plus a bias, passed through an activation function."],
      ["MLP (feed-forward network)", "Layers of neurons — input, hidden, output — where every neuron connects to every neuron in the next layer."],
      ["Activation function", "The non-linearity (ReLU, sigmoid, tanh, GELU) applied to the weighted sum. Without it, any depth collapses to one linear map."],
      ["Forward propagation", "Pushing an input through the layers, in order, to produce a prediction."],
      ["Loss function", "One number measuring how wrong the prediction is — mean squared error for regression, cross-entropy for classification."],
      ["Backpropagation", "The chain rule applied layer by layer, from the output back to the input, to get the gradient of the loss with respect to every weight."],
      ["Gradient descent (SGD)", "Move every weight a small step against its gradient so the loss falls."],
      ["Learning rate", "The size of that step — the single most important hyperparameter."],
      ["Optimiser (Adam / AdamW)", "Gradient descent with momentum and a per-parameter step size; AdamW applies weight decay separately from the adaptive step."],
      ["Weight initialisation (Xavier / He)", "Scaling the starting weights so signals and gradients neither shrink to nothing nor blow up as they pass through the layers."],
      ["Regularisation (L2, dropout)", "Techniques against overfitting: penalise large weights, or randomly switch units off during training."],
      ["BatchNorm / LayerNorm", "Normalising activations so training is stable and faster."],
      ["Vanishing / exploding gradients", "Gradients that shrink towards zero or grow without bound as they travel back through many layers — addressed by initialisation, normalisation, residual connections and clipping."],
      ["Epoch / batch", "One full pass over the training data / the small group of examples used for one update."]
    ] },

    { t: "h2", n: "02", text: "The perceptron", id: "perceptron" },

    { t: "p", text: "A neural network is a computational model, loosely inspired by the brain, made of layers of connected nodes that learn a mapping from inputs to outputs by adjusting the strengths of their connections. The node is the perceptron. It takes a vector of inputs **x**, weights each one, adds a bias and applies an activation σ:" },

    { t: "math", tex: "y = \\sigma\\!\\left(\\sum_{i=1}^{n} w_i x_i + b\\right) = \\sigma(\\mathbf{w}^{\\mathsf T}\\mathbf{x} + b)" },

    { t: "viz", title: "The perceptron: weighted sum, bias, activation",
      caption: "Each input xᵢ arrives along a connection with weight wᵢ. The unit sums wᵢxᵢ, adds the bias b, and passes the total z through the activation σ to produce y. The weights and the bias are the only things that learn.",
      svg: `<svg viewBox="0 0 760 230" role="img" aria-label="Perceptron diagram">
<defs><marker id="ah11" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<g>
  <circle cx="70" cy="55" r="20" class="s-fill s-stroke" stroke-width="1.4"/><text x="70" y="59" text-anchor="middle" class="s-mono">x₁</text>
  <circle cx="70" cy="115" r="20" class="s-fill s-stroke" stroke-width="1.4"/><text x="70" y="119" text-anchor="middle" class="s-mono">x₂</text>
  <circle cx="70" cy="175" r="20" class="s-fill s-stroke" stroke-width="1.4"/><text x="70" y="179" text-anchor="middle" class="s-mono">x₃</text>
  <line x1="92" y1="58" x2="300" y2="105" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah11)"/>
  <line x1="92" y1="115" x2="300" y2="115" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah11)"/>
  <line x1="92" y1="172" x2="300" y2="125" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah11)"/>
  <text x="185" y="72" text-anchor="middle" class="s-sub">w₁</text>
  <text x="185" y="108" text-anchor="middle" class="s-sub">w₂</text>
  <text x="185" y="165" text-anchor="middle" class="s-sub">w₃</text>
  <rect x="302" y="82" width="120" height="66" rx="12" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)" stroke-width="1.4"/>
  <text x="362" y="110" text-anchor="middle" class="s-label">Σ wᵢxᵢ + b</text>
  <text x="362" y="130" text-anchor="middle" class="s-sub">z, the pre-activation</text>
  <line x1="362" y1="200" x2="362" y2="150" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah11)"/>
  <text x="362" y="216" text-anchor="middle" class="s-sub">bias b</text>
  <line x1="424" y1="115" x2="500" y2="115" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah11)"/>
  <rect x="502" y="88" width="90" height="54" rx="12" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="1.4"/>
  <text x="547" y="110" text-anchor="middle" class="s-label">σ(z)</text>
  <text x="547" y="128" text-anchor="middle" class="s-sub">activation</text>
  <line x1="594" y1="115" x2="670" y2="115" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah11)"/>
  <circle cx="700" cy="115" r="22" class="s-fill s-stroke" stroke-width="1.4"/><text x="700" y="120" text-anchor="middle" class="s-label">y</text>
</g></svg>` },

    { t: "p", text: "The bias is not decoration. A unit without one must pass through the origin — **w**ᵀ**x** = 0 is a line through (0, 0) — and a threshold that has to sit anywhere else is unreachable. The bias is the intercept, and a unit has one for the same reason a regression line does." },

    { t: "p", text: "The limitation is in the geometry. With a step or sigmoid activation, the unit's decision is whether **w**ᵀ**x** + b is above or below zero, and that is one straight line (in higher dimensions, one flat hyperplane). **A perceptron can only learn linearly separable functions.** AND and OR are separable — one line puts the true cases on one side. XOR is not: its positives, (0, 1) and (1, 0), sit on one diagonal and its negatives, (0, 0) and (1, 1), on the other, and any line leaves a positive on each side." },

    { t: "code", lang: "python", title: "One unit against AND, OR and XOR — the reference's claim, checked",
      code: `from sklearn.linear_model import Perceptron
import numpy as np

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
for name, y in [("AND", [0, 0, 0, 1]), ("OR", [0, 1, 1, 1]), ("XOR", [0, 1, 1, 0])]:
    clf = Perceptron(max_iter=1000, tol=None, random_state=0).fit(X, y)
    print(f"{name}: w = {clf.coef_[0]}, b = {clf.intercept_[0]:+.0f}, training accuracy {clf.score(X, y):.2f}")`,
      caption: "Run here. AND and OR converge to a line each; XOR ends at chance with the weights driven back to zero, because there is no line to converge to." },

    { t: "out", text: `AND: w = [3. 2.], b = -4, training accuracy 1.00
OR:  w = [2. 2.], b = -1, training accuracy 1.00
XOR: w = [0. 0.], b = +0, training accuracy 0.50` },

    { t: "p", text: "Read the AND line: 3x₁ + 2x₂ − 4 > 0 is true only at (1, 1), where it equals 1. That is a perfectly good boundary; nothing in the perceptron asks for a comfortable margin. **This is why multi-layer networks exist.** Two units can each draw a line, and a third unit can combine what they say:" },

    { t: "code", lang: "text", title: "XOR from two hidden ReLU units, by hand",
      code: `hidden unit 1:  h₁ = ReLU(x₁ + x₂)        fires on (0,1), (1,0), (1,1)   -- "at least one input on"
hidden unit 2:  h₂ = ReLU(x₁ + x₂ − 1)    fires on (1,1) only            -- "both inputs on"
output:         y  = h₁ − 2·h₂

(0,0): h = [0, 0] → y = 0
(0,1): h = [1, 0] → y = 1
(1,0): h = [1, 0] → y = 1
(1,1): h = [2, 1] → y = 2 − 2 = 0        -- XOR`,
      caption: "Two lines, one non-linearity between them, and a linear read-out. The first unit counts how many inputs are on, the second fires only when both are, and the output subtracts twice the second from the first." },

    { t: "viz", title: "XOR: no single line, two lines",
      caption: "Left: the four XOR points — positives on one diagonal, negatives on the other — and a line that fails, as every line must. Right: the two boundaries drawn by the hidden units; the positive region is the band between them.",
      svg: `<svg viewBox="0 0 760 250" role="img" aria-label="XOR points and the two-line solution">
<g transform="translate(40,20)">
  <rect x="0" y="0" width="200" height="200" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <line x1="0" y1="200" x2="200" y2="0" style="stroke:var(--crit);stroke-dasharray:5 4" stroke-width="1.6"/>
  <circle cx="40" cy="160" r="9" style="fill:var(--surface-3);stroke:var(--ink-3)" stroke-width="1.4"/>
  <circle cx="160" cy="40" r="9" style="fill:var(--surface-3);stroke:var(--ink-3)" stroke-width="1.4"/>
  <circle cx="40" cy="40" r="9" style="fill:var(--accent)"/>
  <circle cx="160" cy="160" r="9" style="fill:var(--accent)"/>
  <text x="40" y="185" text-anchor="middle" class="s-sub">(0,0) → 0</text>
  <text x="160" y="25" text-anchor="middle" class="s-sub">(1,1) → 0</text>
  <text x="40" y="25" text-anchor="middle" class="s-sub">(0,1) → 1</text>
  <text x="160" y="185" text-anchor="middle" class="s-sub">(1,0) → 1</text>
  <text x="100" y="225" text-anchor="middle" class="s-label">one line: a positive on each side</text>
</g>
<g transform="translate(420,20)">
  <rect x="0" y="0" width="200" height="200" rx="8" class="s-fill s-stroke" stroke-width="1"/>
  <polygon points="0,140 140,0 200,0 200,60 60,200 0,200" style="fill:var(--accent);fill-opacity:.12"/>
  <line x1="0" y1="140" x2="140" y2="0" style="stroke:var(--good)" stroke-width="1.8"/>
  <line x1="60" y1="200" x2="200" y2="60" style="stroke:var(--good)" stroke-width="1.8"/>
  <circle cx="40" cy="160" r="9" style="fill:var(--surface-3);stroke:var(--ink-3)" stroke-width="1.4"/>
  <circle cx="160" cy="40" r="9" style="fill:var(--surface-3);stroke:var(--ink-3)" stroke-width="1.4"/>
  <circle cx="40" cy="40" r="9" style="fill:var(--accent)"/>
  <circle cx="160" cy="160" r="9" style="fill:var(--accent)"/>
  <text x="40" y="118" text-anchor="start" class="s-sub">x₁+x₂ = 0.5</text>
  <text x="112" y="195" text-anchor="start" class="s-sub">x₁+x₂ = 1.5</text>
  <text x="100" y="225" text-anchor="middle" class="s-label">two lines: the band between them is XOR = 1</text>
</g></svg>` },

    { t: "h2", n: "03", text: "The multi-layer perceptron", id: "mlp" },

    { t: "p", text: "Put the units in layers. The input layer holds the features; one or more hidden layers hold learned intermediate representations; the output layer holds the predictions. **Fully connected** means every unit in a layer receives every unit of the previous layer as input. Layer l computes a linear transformation followed by an element-wise non-linearity:" },

    { t: "math", tex: "\\mathbf{z}^{(l)} = \\mathbf{W}^{(l)}\\mathbf{a}^{(l-1)} + \\mathbf{b}^{(l)}, \\qquad \\mathbf{a}^{(l)} = \\sigma\\!\\left(\\mathbf{z}^{(l)}\\right)" },

    { t: "viz", title: "A fully connected network: 4 inputs, 4 hidden units, 2 outputs",
      caption: "Every arrow is one weight. The hidden layer has a 4×4 weight matrix and 4 biases; the output layer a 2×4 matrix and 2 biases. The input layer has no parameters — it is the data.",
      svg: `<svg viewBox="0 0 760 260" role="img" aria-label="Multi-layer perceptron with one hidden layer">
<g style="stroke:var(--line);stroke-opacity:.55" stroke-width="1">
  <line x1="150" y1="50" x2="380" y2="50"/><line x1="150" y1="50" x2="380" y2="103"/><line x1="150" y1="50" x2="380" y2="156"/><line x1="150" y1="50" x2="380" y2="209"/>
  <line x1="150" y1="103" x2="380" y2="50"/><line x1="150" y1="103" x2="380" y2="103"/><line x1="150" y1="103" x2="380" y2="156"/><line x1="150" y1="103" x2="380" y2="209"/>
  <line x1="150" y1="156" x2="380" y2="50"/><line x1="150" y1="156" x2="380" y2="103"/><line x1="150" y1="156" x2="380" y2="156"/><line x1="150" y1="156" x2="380" y2="209"/>
  <line x1="150" y1="209" x2="380" y2="50"/><line x1="150" y1="209" x2="380" y2="103"/><line x1="150" y1="209" x2="380" y2="156"/><line x1="150" y1="209" x2="380" y2="209"/>
  <line x1="380" y1="50" x2="610" y2="95"/><line x1="380" y1="50" x2="610" y2="165"/>
  <line x1="380" y1="103" x2="610" y2="95"/><line x1="380" y1="103" x2="610" y2="165"/>
  <line x1="380" y1="156" x2="610" y2="95"/><line x1="380" y1="156" x2="610" y2="165"/>
  <line x1="380" y1="209" x2="610" y2="95"/><line x1="380" y1="209" x2="610" y2="165"/>
</g>
<g>
  <circle cx="150" cy="50" r="17" class="s-fill s-stroke" stroke-width="1.4"/><text x="150" y="54" text-anchor="middle" class="s-mono">x₁</text>
  <circle cx="150" cy="103" r="17" class="s-fill s-stroke" stroke-width="1.4"/><text x="150" y="107" text-anchor="middle" class="s-mono">x₂</text>
  <circle cx="150" cy="156" r="17" class="s-fill s-stroke" stroke-width="1.4"/><text x="150" y="160" text-anchor="middle" class="s-mono">x₃</text>
  <circle cx="150" cy="209" r="17" class="s-fill s-stroke" stroke-width="1.4"/><text x="150" y="213" text-anchor="middle" class="s-mono">x₄</text>
  <circle cx="380" cy="50" r="17" style="fill:var(--accent);fill-opacity:.18;stroke:var(--accent)" stroke-width="1.4"/><text x="380" y="54" text-anchor="middle" class="s-mono">h₁</text>
  <circle cx="380" cy="103" r="17" style="fill:var(--accent);fill-opacity:.18;stroke:var(--accent)" stroke-width="1.4"/><text x="380" y="107" text-anchor="middle" class="s-mono">h₂</text>
  <circle cx="380" cy="156" r="17" style="fill:var(--accent);fill-opacity:.18;stroke:var(--accent)" stroke-width="1.4"/><text x="380" y="160" text-anchor="middle" class="s-mono">h₃</text>
  <circle cx="380" cy="209" r="17" style="fill:var(--accent);fill-opacity:.18;stroke:var(--accent)" stroke-width="1.4"/><text x="380" y="213" text-anchor="middle" class="s-mono">h₄</text>
  <circle cx="610" cy="95" r="17" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)" stroke-width="1.4"/><text x="610" y="99" text-anchor="middle" class="s-mono">ŷ₁</text>
  <circle cx="610" cy="165" r="17" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)" stroke-width="1.4"/><text x="610" y="169" text-anchor="middle" class="s-mono">ŷ₂</text>
  <text x="150" y="250" text-anchor="middle" class="s-label">input layer</text>
  <text x="150" y="20" text-anchor="middle" class="s-sub">features</text>
  <text x="380" y="250" text-anchor="middle" class="s-label">hidden layer</text>
  <text x="380" y="20" text-anchor="middle" class="s-sub">learned representation · W⁽¹⁾ is 4×4</text>
  <text x="610" y="250" text-anchor="middle" class="s-label">output layer</text>
  <text x="610" y="20" text-anchor="middle" class="s-sub">predictions · W⁽²⁾ is 2×4</text>
</g></svg>` },

    { t: "p", text: "Two conventions to fix now, because the reference uses both and so does PyTorch. In the maths, **W**⁽ˡ⁾ has shape (units in layer l) × (units in layer l − 1) and multiplies a column vector. In code, a batch is a matrix with one example per row, so the same layer is written `X @ W.T + b` — PyTorch's `nn.Linear(in, out)` stores its weight as (out, in) to match the maths and transposes on the way through. The numbers are identical; only the orientation differs." },

    { t: "h2", n: "04", text: "The universal approximation theorem", id: "uat" },

    { t: "quote", text: "A feed-forward network with a single hidden layer containing a finite number of neurons can approximate any continuous function on compact subsets of ℝⁿ, given sufficient neurons." },

    { t: "p", text: "That is the theorem people quote to say networks are general, and it is true. It is worth being precise about what it does *not* say. It does not say how many neurons *sufficient* is — the number can be astronomically large. It does not say that gradient descent will find those neurons' weights; it is an existence result. And it says nothing about behaviour outside the training inputs, which is the generalisation question the rest of the course lives on." },

    { t: "table", head: ["Claim", "What the theorem says", "What practice says"],
      rows: [
        ["Depth needed", "One hidden layer is enough, in principle.", "Deeper networks learn hierarchical features — edges, then parts, then objects — and for many functions need exponentially fewer units than a shallow one: roughly O(2ⁿ) units for a two-layer network against O(poly(n)) for a deep one."],
        ["Width versus depth", "Not addressed.", "Wide and shallow tends to memorise and generalise poorly; narrow and deep builds abstractions layer on layer and generalises better."],
        ["Finding the weights", "Not addressed.", "Everything from lesson 1.4 onward — backpropagation, optimisers, initialisation — is about finding them."]
      ] },

    { t: "callout", kind: "mental", title: "Representable is not learnable",
      body: [{ t: "p", text: "The hand-built XOR network above proves a two-unit hidden layer *can* compute XOR. Whether training from a random start *finds* those weights is a different question, and the answer depends on the activation, the width and the initialisation. Keep the two questions apart: the theorem answers the first, the rest of this module the second." }] },

    { t: "h2", n: "05", text: "Counting parameters", id: "params" },

    { t: "p", text: "A fully connected layer with n₍ₗ₋₁₎ inputs and n₍ₗ₎ units has one weight per input–unit pair and one bias per unit:" },

    { t: "math", tex: "\\text{Params}(l) = n_{l-1}\\, n_l + n_l = n_l\\,(n_{l-1} + 1)" },

    { t: "p", text: "The reference's example is the network [784, 256, 128, 10] — an MNIST classifier with two hidden layers. Worked layer by layer:" },

    { t: "table", head: ["Layer", "Weights", "Biases", "Parameters"],
      rows: [
        ["784 → 256", "784 × 256 = 200,704", "256", "**200,960**"],
        ["256 → 128", "256 × 128 = 32,768", "128", "**32,896**"],
        ["128 → 10", "128 × 10 = 1,280", "10", "**1,290**"],
        ["Total", "", "", "**235,146**"]
      ] },

    { t: "code", lang: "python", title: "The count, checked in PyTorch",
      code: `import torch.nn as nn

net = nn.Sequential(nn.Linear(784, 256), nn.ReLU(),
                    nn.Linear(256, 128), nn.ReLU(),
                    nn.Linear(128, 10))
for name, p in net.named_parameters():
    print(f"{name:12s} {str(tuple(p.shape)):12s} {p.numel():>8,}")
total = sum(p.numel() for p in net.parameters())
first = net[0].weight.numel() + net[0].bias.numel()
print(f"total {total:,}   first layer share {first:,} / {total:,} = {first / total:.1%}")`,
      caption: "PyTorch stores each Linear layer's weight as (out, in), so the shapes read (256, 784) and so on. The total is 235,146; the reference's text gives 201,024 for the first layer and 235,210 in total, which is a slip of arithmetic — 784 × 256 is 200,704, not 200,768. This is what checking is for." },

    { t: "out", text: `0.weight     (256, 784)    200,704
0.bias       (256,)            256
2.weight     (128, 256)     32,768
2.bias       (128,)            128
4.weight     (10, 128)       1,280
4.bias       (10,)              10
total 235,146   first layer share 200,960 / 235,146 = 85.5%` },

    { t: "p", text: "The rule of thumb the reference draws from this survives the correction: **about 85 % of the parameters sit in the first fully connected layer**, because it multiplies the raw input size by the first hidden width. An image of 224 × 224 × 3 flattened into a first layer of 256 units would need 38.5 million weights before anything useful happened — which is the reason convolutional networks (module 2) share weights across positions instead of connecting every pixel to every unit." },

    { t: "ladder", title: "Parameter counting, from one layer to a whole network", rungs: [
      { level: "Beginner", label: "One layer", code: "nn.Linear(784, 256) → 784·256 + 256 = 200,960", note: "Weights are inputs × outputs; biases are one per output." },
      { level: "Practitioner", label: "A network", code: "sum(p.numel() for p in net.parameters())", note: "Sum the layers. Activations, pooling and dropout have no parameters; normalisation layers have two per channel (lesson 1.8)." },
      { level: "Senior", label: "Where the memory goes", code: "params × 4 bytes (float32) + optimiser state (Adam: ×3) + activations per batch", note: "235,146 parameters is under 1 MB of weights; the activations for a batch of 128 are what fill the memory in a large model." }
    ] },

    { t: "exercise", kind: "practice", title: "Count, then check", difficulty: "foundation", minutes: 12,
      body: [{ t: "p", text: "Using only the formula, count the parameters of the network [3072, 512, 256, 10] — a CIFAR-10 image (32 × 32 × 3 = 3072) flattened into two hidden layers. Say what fraction sits in the first layer. Then check the count in PyTorch." }],
      requirements: [
        "Work each layer as inputs × units + units, and sum",
        "Report the first layer's share of the total",
        "Confirm the total with a PyTorch `nn.Sequential` and `numel()`"
      ],
      hint: "3072 × 512 is 1,572,864 — the first layer alone is over a million and a half.",
      solution: { lang: "python", title: "Solution",
        code: `import torch.nn as nn
net = nn.Sequential(nn.Linear(3072, 512), nn.ReLU(), nn.Linear(512, 256), nn.ReLU(), nn.Linear(256, 10))
layers = [(3072, 512), (512, 256), (256, 10)]
counts = [i * o + o for i, o in layers]
print(counts, sum(counts))                      # [1573376, 131328, 2570] 1707274
print(sum(p.numel() for p in net.parameters()))  # 1707274
print(f"{counts[0] / sum(counts):.1%}")           # 92.2%`,
        notes: [{ t: "p", text: "1,573,376 + 131,328 + 2,570 = 1,707,274 parameters, 92.2 % of them in the first layer. Flattening an image into a dense layer is expensive in exactly the place where a convolution would share weights." }] } }
  ],

  takeaways: [
    "A neuron computes σ(wᵀx + b): weights decide which inputs matter, the bias sets the threshold, the activation makes stacking worthwhile.",
    "One perceptron draws one straight boundary, so it learns AND and OR and never XOR; a hidden layer of two units draws two lines and solves it.",
    "A fully connected layer is z⁽ˡ⁾ = W⁽ˡ⁾a⁽ˡ⁻¹⁾ + b⁽ˡ⁾ followed by an element-wise activation; PyTorch stores W as (out, in) and applies X @ Wᵀ + b to a batch.",
    "The universal approximation theorem guarantees a wide-enough single hidden layer can approximate any continuous function — and says nothing about how wide, whether training finds it, or how it generalises.",
    "Deep beats wide in practice because layers compose: hierarchical features need polynomially many units where a shallow network needs exponentially many.",
    "Parameters per dense layer are n₍ₗ₎(n₍ₗ₋₁₎ + 1); the [784, 256, 128, 10] network has 235,146, 85 % of them in the first layer — the reason CNNs share weights."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why can a single perceptron not learn XOR?",
      options: ["Its learning rate is too small for four examples", "Its decision boundary is one straight line, and no line separates XOR's positives from its negatives", "XOR needs a sigmoid, and the perceptron uses a step function", "Two inputs are too few for any unit to learn"],
      answer: 1,
      why: "The unit decides by the sign of wᵀx + b, which is one line in the plane. XOR's positives (0,1) and (1,0) lie on one diagonal and its negatives on the other, so every line leaves a positive on each side. Adding a hidden layer gives a second line." },
    { stem: "A network has layers of size [100, 50, 20, 5]. How many parameters does it have?",
      options: ["7,500", "8,105", "6,175", "7,575"],
      answer: 2,
      why: "Each dense layer has inputs × units + units parameters: 100·50 + 50 = 5,050; 50·20 + 20 = 1,020; 20·5 + 5 = 105. The sum is 6,175 — 6,100 weights plus 75 biases. Forgetting the biases gives 6,100; counting the input layer as if it had weights gives the larger wrong answers." },
    { stem: "What does the universal approximation theorem guarantee?",
      options: ["That gradient descent finds the weights for any continuous function", "That one hidden layer with enough neurons can approximate any continuous function on a compact set", "That deeper networks always generalise better", "That a network with n neurons fits any n training points"],
      answer: 1,
      why: "It is an existence result about representation: some single-hidden-layer network approximates the function to any precision. It says nothing about how many neurons, whether an optimiser finds them, or about behaviour off the training set." },
    { stem: "Why do most of a dense image classifier's parameters sit in its first layer?",
      options: ["Because the first layer uses a larger learning rate", "Because it multiplies the full flattened input size by the first hidden width, and the input is by far the largest dimension", "Because biases are only stored in the first layer", "Because later layers share weights"],
      answer: 1,
      why: "The first layer has (input size) × (hidden width) weights; for 784 inputs and 256 units that is 200,704 of the network's 235,146 parameters. Later layers multiply two hidden widths, which are far smaller than the input." }
  ] },

  interview: { title: "Interview", sub: "From the reference's deep-dive questions for this file, and what an interviewer asks next", questions: [
    { level: "Core", q: "Formalise a neural network mathematically. What are its parameters?",
      strong: "Layers of affine maps and element-wise non-linearities, with the weights and biases as the parameters.",
      answer: [{ t: "p", text: "A network is a function f_θ from ℝ^d_in to ℝ^d_out built from L layers: h⁽⁰⁾ = x, z⁽ˡ⁾ = W⁽ˡ⁾h⁽ˡ⁻¹⁾ + b⁽ˡ⁾, h⁽ˡ⁾ = σ(z⁽ˡ⁾), with W⁽ˡ⁾ of shape n_l × n_{l−1} and b⁽ˡ⁾ of length n_l. The output is h⁽ᴸ⁾. The parameters θ are all the W and b, and there are Σ_l (n_l n_{l−1} + n_l) of them. The activation σ is what stops the composition collapsing into one affine map." }] },
    { level: "Core", q: "Why does depth help if one hidden layer is universal?",
      strong: "Efficiency and inductive bias, not representability.",
      answer: [{ t: "p", text: "The theorem says a wide-enough single layer suffices, but for many functions the required width grows exponentially with the input dimension, while a deep network represents the same function with polynomially many units by composing simpler pieces — edges into parts into objects. Depth also matches the hierarchical structure of real data, which is why it generalises better in practice. The evidence is empirical (vision since 2012) rather than a theorem about every function." }] },
    { level: "Senior", q: "You flatten a 224 × 224 colour image into a dense first layer of 512 units. What goes wrong, and what is the fix?",
      strong: "77 million parameters in one layer, no translation structure — use convolutions.",
      answer: [{ t: "p", text: "224 × 224 × 3 = 150,528 inputs, times 512 units, is 77 million weights before the first non-linearity — most of the network's memory, easy to overfit, and every weight is tied to one pixel position so a shifted object looks like new data. A convolutional layer shares a small kernel across positions: a 3 × 3 kernel over 3 channels into 64 filters is 1,792 parameters, and translation is built in. That is module 2." }] }
  ] }
});

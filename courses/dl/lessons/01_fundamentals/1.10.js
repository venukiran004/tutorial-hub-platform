/* ============================================================================
   LESSON 1.10 — A Neural Network from Scratch in NumPy
   Mirrors 01_Neural_Network_Fundamentals.md · §12. The reference's
   NeuralNetwork class is run as written on XOR (the reference's usage
   shows a two-feature binary problem) and on two moons, and its backward()
   is gradient-checked against autograd.
   ========================================================================= */
EC.receiveLesson({
  id: "1.10",

  lede: "**Everything in lessons 1.1 to 1.9 fits in sixty lines of NumPy: He-initialised weights, a forward pass that stores what backward will need, binary cross-entropy, four lines of backpropagation, and a gradient-descent update.** The reference builds exactly that class. This lesson reads it method by method against the derivations it implements, runs it on XOR — where it reaches a loss of 0.0015 and predicts [0.002, 0.999, 0.999, 0.001] — and on a two-moons dataset where it scores 97 % on held-out points, and then checks its hand-written gradients against PyTorch's autograd to nine decimal places. After this, `loss.backward()` has no secrets.",

  objectives: [
    "Read the NeuralNetwork class and map each method to the formula it implements",
    "Explain the (features × samples) layout and why the forward pass stores Z1, A1, Z2 and A2",
    "Run the network on a two-feature binary problem and interpret the loss and accuracy trace",
    "Gradient-check a hand-written backward pass against autograd"
  ],

  prerequisites: ["1.4", "1.5", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "The class, method by method", id: "class" },

    { t: "p", text: "The reference's network is two layers — ReLU hidden, sigmoid output — with the data laid out as the maths of lesson 1.3 has it: **X is (n_features × m_samples)**, one example per column, and every weight matrix is (units × inputs). Here is the class as the reference gives it, with each method annotated against the lesson that derived it." },

    { t: "code", lang: "python", title: "Initialisation — lesson 1.6",
      code: `import numpy as np

class NeuralNetwork:
    """2-layer neural network from scratch."""

    def __init__(self, input_dim, hidden_dim, output_dim, lr=0.01):
        # He initialisation: N(0, 2 / fan_in), biases at zero
        self.W1 = np.random.randn(hidden_dim, input_dim) * np.sqrt(2.0 / input_dim)
        self.b1 = np.zeros((hidden_dim, 1))
        self.W2 = np.random.randn(output_dim, hidden_dim) * np.sqrt(2.0 / hidden_dim)
        self.b2 = np.zeros((output_dim, 1))
        self.lr = lr`,
      caption: "W1 is (hidden × input) so that W1 @ X gives (hidden × m). The biases are column vectors that broadcast across the m columns. He initialisation because the hidden layer is ReLU." },

    { t: "code", lang: "python", title: "Activations and the forward pass — lessons 1.2 and 1.3",
      code: `    def relu(self, z):
        return np.maximum(0, z)

    def relu_derivative(self, z):
        return (z > 0).astype(float)                 # 1 where the unit was on, 0 where off

    def sigmoid(self, z):
        return 1 / (1 + np.exp(-np.clip(z, -500, 500)))   # clip so exp() cannot overflow

    def forward(self, X):
        """Forward pass. X shape: (n_features, m_samples)"""
        self.Z1 = self.W1 @ X + self.b1              # (hidden × m)
        self.A1 = self.relu(self.Z1)
        self.Z2 = self.W2 @ self.A1 + self.b2        # (output × m)
        self.A2 = self.sigmoid(self.Z2)
        return self.A2`,
      caption: "Every intermediate is stored on self because backward() needs it: Z1 for the ReLU gate, A1 for dW2, A2 for the output error. This is the memory cost of training that lesson 1.4 described, in miniature." },

    { t: "code", lang: "python", title: "The loss — lesson 1.3",
      code: `    def compute_loss(self, Y, Y_hat):
        """Binary cross-entropy."""
        m = Y.shape[1]
        loss = -1/m * np.sum(Y * np.log(Y_hat + 1e-8) +
                              (1-Y) * np.log(1-Y_hat + 1e-8))
        return loss`,
      caption: "The 10⁻⁸ inside the logs keeps log(0) from producing −inf when the sigmoid saturates exactly. The mean over m examples matches the 1/m in the gradients." },

    { t: "code", lang: "python", title: "Backpropagation and the update — lessons 1.4 and 1.5",
      code: `    def backward(self, X, Y):
        """Backpropagation."""
        m = X.shape[1]

        # output layer: δ² = A2 − Y, then the outer products with what fed it
        dZ2 = self.A2 - Y                          # (output × m)
        dW2 = (1/m) * dZ2 @ self.A1.T              # (output × hidden)
        db2 = (1/m) * np.sum(dZ2, axis=1, keepdims=True)

        # hidden layer: send the error back through W2, gate by ReLU'
        dA1 = self.W2.T @ dZ2                      # (hidden × m)
        dZ1 = dA1 * self.relu_derivative(self.Z1)  # element-wise
        dW1 = (1/m) * dZ1 @ X.T                    # (hidden × input)
        db1 = (1/m) * np.sum(dZ1, axis=1, keepdims=True)

        # plain gradient descent
        self.W2 -= self.lr * dW2
        self.b2 -= self.lr * db2
        self.W1 -= self.lr * dW1
        self.b1 -= self.lr * db1

    def train(self, X, Y, epochs=1000, print_every=100):
        for epoch in range(epochs):
            Y_hat = self.forward(X)
            loss = self.compute_loss(Y, Y_hat)
            self.backward(X, Y)
            if epoch % print_every == 0:
                preds = (Y_hat > 0.5).astype(int)
                acc = np.mean(preds == Y) * 100
                print(f"Epoch {epoch}: loss={loss:.4f}, acc={acc:.1f}%")`,
      caption: "The four gradient lines are lesson 1.4's four steps with the batch average folded in: dZ2 @ A1.T sums δ²ᵢ(a¹ᵢ)ᵀ over the m examples and the 1/m averages them. Full-batch gradient descent — every epoch uses all m examples — with no momentum: the simplest optimiser from lesson 1.5." },

    { t: "viz", title: "What each method touches",
      caption: "forward() writes Z1, A1, Z2, A2 onto the object; backward() reads them, produces the four gradients in the order the chain rule dictates — top layer first — and overwrites the weights. train() alternates the two and reads the loss off A2. Nothing else is needed.",
      svg: `<svg viewBox="0 0 760 220" role="img" aria-label="Data flow between the forward, backward and train methods">
<defs><marker id="ah110" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<g>
  <rect x="20" y="70" width="110" height="80" rx="10" class="s-fill s-stroke" stroke-width="1.4"/>
  <text x="75" y="100" text-anchor="middle" class="s-label">train()</text><text x="75" y="118" text-anchor="middle" class="s-sub">for each epoch:</text><text x="75" y="134" text-anchor="middle" class="s-sub">forward · loss · backward</text>
  <rect x="190" y="30" width="150" height="70" rx="10" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)" stroke-width="1.4"/>
  <text x="265" y="56" text-anchor="middle" class="s-label">forward(X)</text><text x="265" y="74" text-anchor="middle" class="s-sub">Z1 = W1X + b1 → A1 = ReLU</text><text x="265" y="90" text-anchor="middle" class="s-sub">Z2 = W2A1 + b2 → A2 = σ</text>
  <rect x="190" y="130" width="150" height="70" rx="10" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)" stroke-width="1.4"/>
  <text x="265" y="156" text-anchor="middle" class="s-label">backward(X, Y)</text><text x="265" y="174" text-anchor="middle" class="s-sub">dZ2 → dW2, db2</text><text x="265" y="190" text-anchor="middle" class="s-sub">dZ1 → dW1, db1 → update</text>
  <rect x="420" y="30" width="140" height="170" rx="10" style="fill:var(--warn);fill-opacity:.12;stroke:var(--warn)" stroke-width="1.4"/>
  <text x="490" y="56" text-anchor="middle" class="s-label">stored on self</text>
  <text x="490" y="82" text-anchor="middle" class="s-mono">Z1  A1  Z2  A2</text>
  <text x="490" y="104" text-anchor="middle" class="s-sub">written by forward,</text><text x="490" y="120" text-anchor="middle" class="s-sub">read by backward</text>
  <text x="490" y="152" text-anchor="middle" class="s-mono">W1  b1  W2  b2</text>
  <text x="490" y="174" text-anchor="middle" class="s-sub">read by forward,</text><text x="490" y="190" text-anchor="middle" class="s-sub">overwritten by backward</text>
  <rect x="610" y="90" width="130" height="50" rx="10" class="s-fill s-stroke" stroke-width="1.4"/>
  <text x="675" y="111" text-anchor="middle" class="s-label">compute_loss</text><text x="675" y="128" text-anchor="middle" class="s-sub">reads A2 and Y</text>
  <line x1="130" y1="95" x2="188" y2="70" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah110)"/>
  <line x1="130" y1="125" x2="188" y2="160" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah110)"/>
  <line x1="340" y1="65" x2="418" y2="80" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah110)"/>
  <line x1="418" y1="150" x2="342" y2="165" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah110)"/>
  <line x1="560" y1="90" x2="608" y2="108" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah110)"/>
</g></svg>` },

    { t: "h2", n: "02", text: "Run on XOR", id: "xor" },

    { t: "p", text: "The reference's usage line — `nn.train(X_train.T, y_train.reshape(1, -1), epochs=5000)` with `input_dim=2, hidden_dim=8, lr=0.1` — asks for a two-feature binary problem. XOR is the two-feature binary problem this module opened with, and the one a single unit cannot learn:" },

    { t: "code", lang: "python", title: "The reference's usage, on XOR",
      code: `np.random.seed(0)
X_train = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], float); y_train = np.array([0, 1, 1, 0])

nn = NeuralNetwork(input_dim=2, hidden_dim=8, output_dim=1, lr=0.1)
nn.train(X_train.T, y_train.reshape(1, -1), epochs=5000, print_every=500)   # X: (2, 4), Y: (1, 4)
print("final predictions:", nn.forward(X_train.T).round(3).ravel())`,
      caption: "Four examples, eight hidden units, five thousand full-batch steps at learning rate 0.1." },

    { t: "out", text: `Epoch 0: loss=0.7992, acc=50.0%
Epoch 500: loss=0.0485, acc=100.0%
Epoch 1000: loss=0.0134, acc=100.0%
Epoch 1500: loss=0.0070, acc=100.0%
Epoch 2000: loss=0.0045, acc=100.0%
Epoch 2500: loss=0.0033, acc=100.0%
Epoch 3000: loss=0.0026, acc=100.0%
Epoch 3500: loss=0.0021, acc=100.0%
Epoch 4000: loss=0.0018, acc=100.0%
Epoch 4500: loss=0.0015, acc=100.0%
final predictions: [0.002 0.999 0.999 0.001]` },

    { t: "p", text: "At epoch 0 the loss is 0.799 — above ln 2 = 0.693, the loss of predicting 0.5 everywhere, because the random initial weights are confidently wrong on some examples — and accuracy is chance. By epoch 500 all four points are on the right side of 0.5 and the loss is 0.049. The remaining four and a half thousand epochs are the sigmoid outputs being pushed towards 0 and 1: cross-entropy keeps rewarding confidence, so the loss keeps falling, slowly, long after the classification is settled. The final predictions are within 0.002 of the targets." },

    { t: "h2", n: "03", text: "Run on two moons", id: "moons" },

    { t: "p", text: "Four points is a demonstration, not a dataset. `make_moons` gives two interleaved crescents in two dimensions — the standard small non-linear binary problem — with noise, and a held-out set to score on:" },

    { t: "code", lang: "python", title: "300 training points, 100 held out",
      code: `from sklearn.datasets import make_moons
Xm, ym = make_moons(n_samples=400, noise=0.2, random_state=0)
Xtr, ytr, Xte, yte = Xm[:300], ym[:300], Xm[300:], ym[300:]

np.random.seed(0)
nn = NeuralNetwork(input_dim=2, hidden_dim=8, output_dim=1, lr=0.1)
nn.train(Xtr.T, ytr.reshape(1, -1), epochs=5000, print_every=1000)
test_acc = np.mean((nn.forward(Xte.T) > 0.5).astype(int) == yte.reshape(1, -1)) * 100
print(f"test accuracy: {test_acc:.1f}%")` },

    { t: "out", text: `Epoch 0: loss=0.6240, acc=71.3%
Epoch 1000: loss=0.3064, acc=86.3%
Epoch 2000: loss=0.2967, acc=86.3%
Epoch 3000: loss=0.2862, acc=86.7%
Epoch 4000: loss=0.1768, acc=93.3%
test accuracy: 97.0%` },

    { t: "p", text: "The trace has a shape worth recognising. Accuracy sits at 86 % from epoch 1,000 to 3,000 while the loss creeps down — the network has found the roughly linear boundary that separates most of each crescent and is slowly bending it around the tips. Between 3,000 and 4,000 the bend completes and accuracy jumps to 93 %. Plain full-batch gradient descent at a fixed rate does eventually get there; lesson 1.5's momentum and Adam exist to get there in a fraction of the epochs. The 97 % on held-out points, higher than the final training accuracy, is a reminder that a hundred test points carry a few percent of noise either way." },

    { t: "h2", n: "04", text: "Is backward() right?", id: "check" },

    { t: "p", text: "The training curves say the gradients point downhill; they do not say they are exactly right, and a backward pass with a wrong transpose or a missing 1/m can still train — badly. The definitive check is against an independent gradient. With `lr = 1.0` the update is `new = old − grad`, so the gradient can be recovered as `old − new` and compared with autograd on the same weights and the same 16 examples:" },

    { t: "code", lang: "python", title: "Gradient check against PyTorch",
      code: `import torch
np.random.seed(1); nn = NeuralNetwork(2, 8, 1, lr=0.0)
Xb = Xtr[:16].T; Yb = ytr[:16].reshape(1, -1)
nn.forward(Xb); W1c, W2c = nn.W1.copy(), nn.W2.copy()
nn.lr = 1.0; nn.backward(Xb, Yb)                 # new = old − grad
dW1_np, dW2_np = W1c - nn.W1, W2c - nn.W2

tW1 = torch.tensor(W1c, requires_grad=True); tW2 = torch.tensor(W2c, requires_grad=True)
tb1 = torch.zeros(8, 1, dtype=torch.float64, requires_grad=True); tb2 = torch.zeros(1, 1, dtype=torch.float64, requires_grad=True)
A2 = torch.sigmoid(tW2 @ torch.relu(tW1 @ torch.tensor(Xb) + tb1) + tb2); Y = torch.tensor(Yb, dtype=torch.float64)
loss = -(Y * torch.log(A2 + 1e-8) + (1 - Y) * torch.log(1 - A2 + 1e-8)).mean()
loss.backward()
print(f"max |dW1 − autograd| = {np.abs(dW1_np - tW1.grad.numpy()).max():.2e}")
print(f"max |dW2 − autograd| = {np.abs(dW2_np - tW2.grad.numpy()).max():.2e}")` },

    { t: "out", text: `max |dW1 − autograd| = 2.98e-09
max |dW2 − autograd| = 9.06e-09` },

    { t: "p", text: "Agreement to 10⁻⁹ in float64. The residual is the 10⁻⁸ inside the logs, which the NumPy loss has and the derivation dZ2 = A2 − Y ignores — that shortcut is exact only for the un-clamped loss, and the difference is invisible at this scale. The reference's sixty lines are a correct implementation of everything this module derived." },

    { t: "callout", kind: "insight", title: "What the framework adds",
      body: "Compare this class with lesson 1.11's PyTorch version. The framework replaces backward() with autograd, the weight updates with an optimiser object that can also do momentum and Adam, the full-batch loop with a DataLoader of mini-batches, and adds the GPU. What it does not change is any of the maths: the tensors it stores during forward, the gradients it produces, and the update it applies are the ones you have just read." },

    { t: "exercise", kind: "practice", title: "Add momentum to the class", difficulty: "core", minutes: 20,
      body: [{ t: "p", text: "Give NeuralNetwork a `momentum` argument (default 0.9) and velocity buffers for all four parameters, and replace the four update lines with lesson 1.5's rule v = βv + (1 − β)·grad, θ −= lr·v. Re-run the two-moons training with the same seed and compare the epoch at which accuracy first exceeds 90 %." }],
      requirements: [
        "Four velocity arrays initialised to zeros of the right shapes",
        "The reference's plain-SGD behaviour recovered when momentum = 0",
        "The two epoch counts, with and without momentum"
      ],
      hint: "Initialise the buffers in __init__ with np.zeros_like(self.W1) and so on; update them in backward() before the parameters.",
      solution: { lang: "python", title: "Solution sketch",
        code: `# in __init__:
self.momentum = momentum
self.vW1, self.vb1, self.vW2, self.vb2 = (np.zeros_like(p) for p in (self.W1, self.b1, self.W2, self.b2))
# in backward(), replacing the four update lines:
b = self.momentum
self.vW2 = b * self.vW2 + (1 - b) * dW2; self.W2 -= self.lr * self.vW2
self.vb2 = b * self.vb2 + (1 - b) * db2; self.b2 -= self.lr * self.vb2
self.vW1 = b * self.vW1 + (1 - b) * dW1; self.W1 -= self.lr * self.vW1
self.vb1 = b * self.vb1 + (1 - b) * db1; self.b1 -= self.lr * self.vb1`,
        notes: [{ t: "p", text: "With the reference's (1 − β) convention and lr = 0.1, momentum's effective step is the same as plain SGD's once the velocity has warmed up, so the gain comes from the smoothing rather than a larger step; raise lr to 0.5 to see the acceleration the lesson-1.5 formulas promise. Whether 90 % arrives earlier depends on the seed — record both numbers and say what you observed." }] } }
  ],

  takeaways: [
    "The reference's NeuralNetwork is the module's maths in sixty lines: He initialisation, ReLU and sigmoid, a forward pass that stores Z1, A1, Z2, A2, binary cross-entropy, four lines of backpropagation, plain gradient descent.",
    "Data is (features × samples), one example per column; every weight is (units × inputs); biases are columns that broadcast across the batch.",
    "On XOR the network reaches 100 % by epoch 500 and a loss of 0.0015 by epoch 4,500, predicting [0.002, 0.999, 0.999, 0.001]; cross-entropy keeps pushing towards certainty long after the classification is settled.",
    "On two moons it plateaus at 86 % for two thousand epochs while bending its boundary, then reaches 93 % training and 97 % test accuracy — plain full-batch gradient descent is correct and slow.",
    "backward() agrees with autograd to 10⁻⁹; a training curve that falls is not proof of a correct gradient, a comparison against an independent one is.",
    "A framework replaces backward() with autograd, the update with an optimiser, and the loop with a DataLoader; the mathematics it executes is unchanged."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does forward() store Z1, A1, Z2 and A2 on self?",
      options: ["For printing", "Because backward() needs them: Z1 for the ReLU gate, A1 for dW2, A2 for the output error", "To save memory", "So the network can run without X"],
      answer: 1,
      why: "Each backward step multiplies by a forward value: dZ2 = A2 − Y, dW2 = dZ2 @ A1.T, dZ1 = dA1 · ReLU′(Z1). Storing them in the forward pass is what lets backward run without recomputing, and it is the same reason training a large network needs more memory than inference." },
    { stem: "In backward(), what does dZ2 @ self.A1.T compute?",
      options: ["The next layer's activations", "The sum over the batch of δ²ᵢ (a¹ᵢ)ᵀ — the outer products from lesson 1.4, one per example, added up", "The transpose of W2", "The mean activation"],
      answer: 1,
      why: "With examples as columns, dZ2 is (1 × m) and A1 is (hidden × m); their product (1 × hidden) sums each example's outer product δ²ᵢ(a¹ᵢ)ᵀ. The 1/m in front turns the sum into the batch mean, matching the mean in the loss." },
    { stem: "On XOR the loss was 0.049 at epoch 500 with 100 % accuracy, and 0.0015 at epoch 4,500 still with 100 % accuracy. What was happening in between?",
      options: ["The network was overfitting", "The classification was settled and cross-entropy was pushing the sigmoid outputs towards exactly 0 and 1", "The learning rate was decaying", "The gradients had vanished"],
      answer: 1,
      why: "Accuracy only needs the outputs on the right side of 0.5; cross-entropy is −log of the probability given to the truth and keeps decreasing as that probability approaches 1. The extra epochs moved predictions from roughly 0.05/0.95 to 0.002/0.999 — more confidence, same decisions." },
    { stem: "What does agreement to 10⁻⁹ between backward() and autograd establish?",
      options: ["That the network will reach 100 % accuracy", "That the hand-written gradient is the true gradient of the loss, not merely a downhill direction", "That the learning rate is correct", "That the data is linearly separable"],
      answer: 1,
      why: "A wrong gradient can still point roughly downhill and produce a falling loss; only comparison with an independent computation — autograd, or a finite difference — shows the derivation was implemented exactly. The tiny residual is the 10⁻⁸ log clamp the derivation ignores." }
  ] },

  interview: { title: "Interview", sub: "What building it from scratch prepares you for", questions: [
    { level: "Core", q: "Walk me through implementing a two-layer network's training step without a framework.",
      strong: "Forward storing intermediates, loss, four gradient lines from the chain rule, then subtract lr times each gradient.",
      answer: [{ t: "p", text: "Initialise W1 (hidden × in) and W2 (out × hidden) with He scaling and zero biases. Forward: Z1 = W1X + b1, A1 = ReLU(Z1), Z2 = W2A1 + b2, A2 = σ(Z2), keeping all four. Loss: mean binary cross-entropy over the m columns. Backward: dZ2 = A2 − Y; dW2 = dZ2 A1ᵀ/m and db2 the row-mean of dZ2; dA1 = W2ᵀ dZ2; dZ1 = dA1 ⊙ [Z1 > 0]; dW1 = dZ1 Xᵀ/m and db1 its row-mean. Update every parameter by −lr × its gradient. Then verify against a finite difference before trusting it — a wrong transpose still trains, just badly." }] },
    { level: "Core", q: "Why is the data laid out as (features × samples) here but (samples × features) in PyTorch?",
      strong: "Convention: column vectors match the textbook algebra; row-major batches match memory layout and broadcasting in frameworks. The numbers are the same.",
      answer: [{ t: "p", text: "With columns as examples, the layer is Z = WX + b exactly as the equations are written, and W has the textbook shape (units × inputs). Frameworks store a batch as rows because that is how memory and DataLoaders naturally deliver examples, so the layer becomes X Wᵀ + b — PyTorch's nn.Linear keeps W as (out, in) and transposes on the way through. Either way each example is multiplied by the same matrix and gets the same bias; only the orientation of the batch differs, along with which axis you sum over for the bias gradient." }] },
    { level: "Senior", q: "The from-scratch network trains but the loss plateaus far above what PyTorch reaches on the same data. List what you would check.",
      strong: "The gradient (finite-difference check), the 1/m and transposes, the learning rate and optimiser, initialisation, and dead ReLUs.",
      answer: [{ t: "p", text: "First the gradient itself: recover it as old − new with lr = 1 and compare with autograd or a central finite difference — a missing 1/m, a wrong transpose, or ReLU′ evaluated on A1 instead of Z1 are the usual finds. Then the optimiser gap: the class does full-batch plain gradient descent, which plateaus where PyTorch's Adam or SGD with momentum would not; check whether the plateau is simply slow progress by extending the run or raising the rate. Then initialisation: with sigmoid hidden units or a bad scale, units saturate and the class has no batch norm to rescue them. Then dead ReLUs: log the fraction of zero activations in A1. And finally the loss's clamp — a 10⁻⁸ inside the log is fine, but a clamp on the sigmoid input at ±500 hides nothing; a clamp at ±5 would flatten the gradient for confident examples." }] }
  ] }
});

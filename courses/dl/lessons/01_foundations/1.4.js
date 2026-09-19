/* ============================================================================
   LESSON 1.4 — Backpropagation, Derived and Checked
   ========================================================================= */
EC.receiveLesson({
  id: "1.4",

  lede: "**Backpropagation is the chain rule, organised so that each layer's derivative is computed once and reused by every layer before it.** There is nothing else in it. This lesson works every partial derivative of a two-layer network by hand on the numbers from lesson 1.3, matches them to autograd to 3 × 10⁻⁸, then checks a batched implementation against finite differences to 10⁻¹¹ — the test you will run on every backward pass you ever write. Along the way: why the gradient is p − y at the output, why a dead unit's weights do not move, why the check needs ε ≈ 10⁻⁴ and not 10⁻¹², and why backward costs twice forward.",

  objectives: [
    "Derive every partial derivative of a 2-2-1 network with ReLU hidden units and a sigmoid-BCE output, on given numbers",
    "Explain δ (the error signal per layer) and how it is passed backward through a weight matrix and an activation derivative",
    "Implement forward and backward for a batched MLP in NumPy and verify it with a central finite-difference check",
    "Read the finite-difference error against ε and choose ε correctly",
    "Define computational graph, static versus dynamic graphs, gradient accumulation, parameter versus hyperparameter, epoch, batch and iteration"
  ],

  prerequisites: ["1.3"],

  blocks: [

    { t: "h2", n: "01", text: "The network and the forward pass", id: "forward" },

    { t: "p", text: "The same network as lesson 1.3: two inputs, two ReLU hidden units, one sigmoid output, binary cross-entropy loss, and now a target y = 1:" },

    { t: "code", lang: "text", title: "Forward (from 1.3, with the loss)",
      code: `x = [1, 2],  y = 1
W1 = [[0.5, −0.3], [0.1, 0.8]],  b1 = [0, 0.1],  W2 = [0.7, −0.4],  b2 = 0.2

z1 = W1·x + b1     = [−0.1, 1.8]
a1 = relu(z1)      = [0, 1.8]
z2 = W2·a1 + b2    = −0.52
ŷ  = σ(z2)         = 0.3729
L  = −ln ŷ         = 0.9866            (BCE with y = 1)`,
      caption: "Every intermediate value is kept: backpropagation needs z₁ (for the ReLU mask), a₁ (for the W₂ gradient), ŷ (for the output gradient) and x (for the W₁ gradient). This is why training uses more memory than inference — the forward activations are stored until the backward pass consumes them." },

    { t: "h2", n: "02", text: "Backward, one partial at a time", id: "backward" },

    { t: "p", text: "Work from the loss toward the input. Each step is one application of the chain rule; each result is reused by the next." },

    { t: "code", lang: "text", title: "Every partial, on the numbers (executed, matched to autograd)",
      code: `1. loss → output
   ∂L/∂ŷ  = −(y/ŷ − (1−y)/(1−ŷ))  = −1/0.3729                         = −2.6820
   ∂ŷ/∂z2 = ŷ(1 − ŷ)               = 0.3729 · 0.6271                    =  0.2338
   δ2 = ∂L/∂z2 = ∂L/∂ŷ · ∂ŷ/∂z2   = −2.6820 · 0.2338                  = −0.6271   = ŷ − y   ✓

2. output layer's weights
   ∂L/∂W2 = δ2 · a1                = −0.6271 · [0, 1.8]                = [0, −1.1289]
   ∂L/∂b2 = δ2                                                          = −0.6271

3. back through W2 to the hidden activations
   ∂L/∂a1 = δ2 · W2                = −0.6271 · [0.7, −0.4]             = [−0.4390, 0.2509]

4. through the ReLU
   ∂a1/∂z1 = 1[z1 > 0]             = [0, 1]                             (z1 = [−0.1, 1.8])
   δ1 = ∂L/∂z1 = ∂L/∂a1 ⊙ 1[z1>0]  = [−0.4390·0, 0.2509·1]             = [0, 0.2509]

5. hidden layer's weights
   ∂L/∂W1 = δ1 ⊗ x  (outer product) = [[0·1, 0·2], [0.2509·1, 0.2509·2]] = [[0, 0], [0.2509, 0.5017]]
   ∂L/∂b1 = δ1                                                          = [0, 0.2509]

autograd, all parameters:   max |hand − autograd| = 2.7 × 10⁻⁸
finite differences (ε = 10⁻⁷): ∂L/∂W2[1] = −1.1288660 (analytic −1.1288660);  ∂L/∂W1[1,1] = 0.5017182 (analytic 0.5017182)`,
      caption: "Step 1 collapses to ŷ − y, the result derived in 1.3 — the sigmoid derivative and the BCE derivative cancel each other's awkwardness. Step 4 is where the first hidden unit drops out: it was off in the forward pass, so its mask entry is 0 and every gradient upstream of it (W₁'s first row, b₁'s first entry) is exactly zero. That unit learns nothing from this example." },

    { t: "p", text: "Read the structure rather than the numbers. δ₂ is the error at the output. To get δ₁ you multiply δ₂ by the weights that connect the layers (W₂) and then by the activation's derivative — that is the whole recursion, and for L layers it is δₗ = (Wₗ₊₁ᵀ δₗ₊₁) ⊙ f′(zₗ). The weight gradient at each layer is δₗ times the layer's input, and since δₗ₊₁ was already computed, nothing is computed twice. That reuse is what makes backpropagation O(forward) rather than O(parameters × forward)." },

    { t: "code", lang: "text", title: "One SGD step with learning rate 0.5",
      code: `W2 ← W2 − 0.5·∂L/∂W2 = [0.7, −0.4] − 0.5·[0, −1.1289]   = [0.7, 0.1644]
b2 ← 0.2 − 0.5·(−0.6271)                                    = 0.5136
W1, b1 updated likewise (only the second row moves)

new ŷ = 0.6650      (was 0.3729; target 1 — the step moved it the right way)`,
      caption: "One step took the prediction from 0.37 to 0.67. The output weight on the active hidden unit flipped sign, from −0.4 to +0.16, because that unit's activation (1.8) was the only path the error could flow through." },

    { t: "dl", items: [
      ["δ (delta)", "∂L/∂z for a layer: the error signal at that layer's pre-activations. It is the quantity passed backward. At the output with a matched loss it is simply prediction minus target."],
      ["Backward through a weight matrix", "∂L/∂a_prev = Wᵀ δ. The transpose sends the error back along the same connections that carried the activation forward."],
      ["Backward through an activation", "δ = (∂L/∂a) ⊙ f′(z), element-wise. For ReLU, f′ is a 0/1 mask; for sigmoid, a(1 − a); for tanh, 1 − a². This is the multiplication that vanishes or explodes with depth."],
      ["Weight gradient", "∂L/∂W = δ ⊗ input to that layer (outer product for one example; inputᵀ δ summed over a batch). Bias gradient is δ itself (summed over the batch)."],
      ["Forward cache", "z and a for every layer must be kept from the forward pass; backward consumes them. Memory during training is dominated by this cache, which is what gradient checkpointing (2.3) trades for recompute."]
    ] },

    { t: "h2", n: "03", text: "A batched implementation, checked", id: "batched" },

    { t: "p", text: "The same recursion for a batch: every vector becomes a matrix with the batch along the rows, outer products become matrix products, and biases sum over the batch. Here is a two-layer network with ReLU and softmax-cross-entropy, forward and backward in twelve lines:" },

    { t: "code", lang: "python", title: "MLP forward and backward in NumPy",
      code: `def forward(self, X):
    self.X = X
    self.Z1 = X @ self.W1 + self.b1;          self.A1 = np.maximum(0, self.Z1)
    self.Z2 = self.A1 @ self.W2 + self.b2
    m = self.Z2.max(1, keepdims=True)
    self.logP = self.Z2 - m - np.log(np.exp(self.Z2 - m).sum(1, keepdims=True))   # log-softmax, stable
    return self.logP

def backward(self, y):
    B = len(y)
    dZ2 = np.exp(self.logP); dZ2[np.arange(B), y] -= 1; dZ2 /= B      # p − onehot, mean over batch
    self.dW2 = self.A1.T @ dZ2;   self.db2 = dZ2.sum(0)                # (H, B) @ (B, K) -> (H, K)
    dA1 = dZ2 @ self.W2.T                                              # back through W2
    dZ1 = dA1 * (self.Z1 > 0)                                          # through ReLU
    self.dW1 = self.X.T @ dZ1;    self.db1 = dZ1.sum(0)`,
      caption: "Compare the shapes: A1ᵀ @ dZ2 is (H, B)(B, K) = (H, K), the shape of W2 — the batch dimension is contracted, which is the sum over examples. Every line corresponds to one of the five steps above." },

    { t: "p", text: "Now the check. For each parameter θ, perturb it by ±ε, evaluate the loss twice, and compare (L(θ+ε) − L(θ−ε)) / 2ε with the analytic gradient. It is slow — two forward passes per parameter — and it is the only way to know a hand-written backward is right:" },

    { t: "code", lang: "text", title: "Gradient check on a 5-7-3 MLP, 8 examples, ε = 10⁻⁵ (executed)",
      code: `W1: max |analytic − numeric| = 1.01e-11   relative 2.42e-11
b1: max |analytic − numeric| = 9.56e-12   relative 5.66e-11
W2: max |analytic − numeric| = 1.63e-11   relative 2.87e-11
b2: max |analytic − numeric| = 1.68e-11   relative 5.63e-11`,
      caption: "Relative error of 10⁻¹¹ in float64 is a pass. A sign error, a missing transpose, or a forgotten ReLU mask shows up as a relative error of order 1 on the affected parameter and nowhere else — the check also tells you *which* line is wrong." },

    { t: "callout", kind: "warn", title: "Choosing ε — the error has two sources",
      body: "The central difference has truncation error O(ε²) from the Taylor expansion and rounding error O(machine-ε / ε) from subtracting two nearly equal losses. Measured on W1[0,0] in float64: ε = 10⁻¹ gives 1.8 × 10⁻⁶, 10⁻² gives 1.8 × 10⁻⁸, 10⁻³ gives 1.8 × 10⁻¹⁰ (the ε² law), 10⁻⁴ gives 8 × 10⁻¹³ — the best — and then rounding takes over: 10⁻⁶ gives 7 × 10⁻¹¹, 10⁻⁸ gives 1.6 × 10⁻⁹, 10⁻¹² gives 6 × 10⁻⁵. Use ε between 10⁻⁴ and 10⁻⁶ in float64; in float32 the check is unreliable below about 10⁻³ relative error and you should run it in float64 or not at all." },

    { t: "h2", n: "04", text: "Computational graphs and autograd", id: "graphs" },

    { t: "p", text: "A framework does the above by recording every operation in the forward pass as a node in a directed acyclic graph — the computational graph — with each node knowing how to compute its local derivative. `loss.backward()` walks the graph in reverse topological order applying the chain rule, which is exactly the recursion in section 02 generalised to arbitrary operations. Two designs exist:" },

    { t: "dl", items: [
      ["Static graph", "Define the graph once, then run data through it (TensorFlow 1, Theano, torch.jit.trace). Optimisable ahead of time; control flow that depends on data must be expressed as graph operations."],
      ["Dynamic graph", "Build the graph anew on every forward pass as Python executes (PyTorch, TensorFlow eager, JAX with tracing per call). Ordinary Python if/for works; the graph can differ per example. Slightly more overhead per step; torch.compile (2.3) recovers most of it."]
    ] },

    { t: "code", lang: "python", title: "Two autograd facts you will meet in your first bug (executed)",
      code: `# 1. gradients accumulate into .grad; they are not overwritten
w = torch.tensor(2.0, requires_grad=True)
(w**2).backward();   w.grad    # 4.0
(w**2).backward();   w.grad    # 8.0   -- added, not replaced
w.grad.zero_(); (w**2).backward();  w.grad   # 4.0
# -> optimizer.zero_grad() at the top of every step, or every step's gradient is the sum of all previous ones

# 2. the graph is dynamic: control flow can depend on the data
def f(x):
    if x.sum() > 0: return (x**2).sum()
    else:           return (x**3).sum()
x = [1, 2]   -> grad [2, 4]      (2x)
x = [−1, −2] -> grad [3, 12]     (3x²) -- a different graph for a different input`,
      caption: "Accumulation is deliberate — it is how gradient accumulation across micro-batches (2.3) works with no extra code — but it means a missing zero_grad silently multiplies your effective learning rate by the step count." },

    { t: "h2", n: "05", text: "The vocabulary of a training run", id: "vocab" },

    { t: "dl", items: [
      ["Parameter", "A number the gradient updates: every weight and bias. 109,386 of them in the 1.1 network."],
      ["Hyperparameter", "A number you set before training that the gradient does not touch: learning rate, batch size, width, depth, weight decay, dropout rate, number of epochs. Chosen by validation, never by training loss."],
      ["Iteration (step)", "One forward pass, one backward pass, one parameter update, on one mini-batch."],
      ["Batch (mini-batch)", "The examples in one iteration. Batch size is a hyperparameter; its gradient is the mean of the per-example gradients."],
      ["Epoch", "One pass over the whole training set. With N = 1,257 examples and batch 64: ⌈1257 / 64⌉ = 20 iterations per epoch, the last batch holding 41 examples; ten epochs is 200 iterations."],
      ["Training mode / eval mode", "Some layers behave differently when training (dropout drops, BatchNorm uses batch statistics) and when evaluating. model.train() and model.eval() switch them; forgetting the second is lesson 2.4's most common bug."]
    ] },

    { t: "code", lang: "text", title: "What backward costs (executed, 512-1024-1024-10 MLP, batch 256, CPU)",
      code: `forward only            4.0 ms
forward + backward     11.9 ms      ratio 3.01`,
      caption: "Backward is roughly twice forward: for each layer it does two matrix products (one for δ, one for the weight gradient) where forward did one. Training a step therefore costs about three forward passes, before the optimiser's own work." },

    { t: "viz",
      title: "The forward cache and the backward recursion",
      caption: "Forward (left to right) stores z and a at every layer. Backward (right to left) starts from δ at the output, multiplies by Wᵀ and by f′(z) to get the previous δ, and at each layer pairs δ with the stored input to form the weight gradient. Nothing is recomputed.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Diagram of forward activations stored per layer and the backward recursion passing delta through W transpose and the activation derivative.">
  <defs>
    <marker id="dl14-f" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--accent)"/></marker>
    <marker id="dl14-b" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--crit)"/></marker>
  </defs>
  <g>
    <rect x="40" y="70" width="90" height="50" rx="6" style="fill:var(--surface-2);stroke:var(--line)"/><text x="85" y="100" class="s-label" text-anchor="middle">x</text>
    <rect x="230" y="70" width="110" height="50" rx="6" style="fill:var(--surface-2);stroke:var(--line)"/><text x="285" y="92" class="s-label" text-anchor="middle">z₁ = W₁x + b₁</text><text x="285" y="110" class="s-sub" text-anchor="middle">a₁ = relu(z₁)</text>
    <rect x="440" y="70" width="110" height="50" rx="6" style="fill:var(--surface-2);stroke:var(--line)"/><text x="495" y="92" class="s-label" text-anchor="middle">z₂ = W₂a₁ + b₂</text><text x="495" y="110" class="s-sub" text-anchor="middle">ŷ = σ(z₂)</text>
    <rect x="650" y="70" width="90" height="50" rx="6" style="fill:var(--surface-2);stroke:var(--line)"/><text x="695" y="100" class="s-label" text-anchor="middle">L(ŷ, y)</text>
    <line x1="130" y1="85" x2="228" y2="85" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#dl14-f)"/>
    <line x1="340" y1="85" x2="438" y2="85" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#dl14-f)"/>
    <line x1="550" y1="85" x2="648" y2="85" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#dl14-f)"/>
    <text x="180" y="78" class="s-sub" text-anchor="middle" style="fill:var(--accent)">forward</text>
    <line x1="648" y1="108" x2="552" y2="108" style="stroke:var(--crit)" stroke-width="1.6" marker-end="url(#dl14-b)"/>
    <line x1="438" y1="108" x2="342" y2="108" style="stroke:var(--crit)" stroke-width="1.6" marker-end="url(#dl14-b)"/>
    <text x="600" y="128" class="s-sub" text-anchor="middle" style="fill:var(--crit)">δ₂ = ŷ − y</text>
    <text x="390" y="128" class="s-sub" text-anchor="middle" style="fill:var(--crit)">δ₁ = (W₂ᵀδ₂) ⊙ 1[z₁&gt;0]</text>
  </g>
  <g>
    <text x="285" y="175" class="s-mono" text-anchor="middle">∂L/∂W₁ = δ₁ ⊗ x</text>
    <text x="285" y="195" class="s-mono" text-anchor="middle">= [[0, 0], [0.2509, 0.5017]]</text>
    <text x="495" y="175" class="s-mono" text-anchor="middle">∂L/∂W₂ = δ₂ ⊗ a₁</text>
    <text x="495" y="195" class="s-mono" text-anchor="middle">= [0, −1.1289]</text>
    <text x="440" y="230" class="s-sub" text-anchor="middle">stored from forward: x, z₁, a₁, ŷ — consumed by backward, then freed</text>
  </g>
</svg>` },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "In the worked example ∂L/∂W₁ was [[0, 0], [0.2509, 0.5017]]. Why is the first row zero?",
          options: [
            "Because W₁'s first row was initialised to zero",
            "Because the first hidden unit's pre-activation was −0.1, so the ReLU was off, its derivative is 0, and δ₁'s first entry — and hence every gradient upstream of that unit — is exactly zero for this example",
            "Because the learning rate was zero",
            "Because the input x₁ = 1 is too small"
          ],
          answer: 1,
          why: "δ₁ = (W₂ᵀδ₂) ⊙ 1[z₁ > 0], and the mask is [0, 1]. The unit contributed nothing forward and receives nothing backward. Across a whole dataset a unit that is off for every example is dead (1.2); here it is merely off for this one."
        },
        {
          stem: "A finite-difference check with ε = 10⁻¹² reports an error of 6 × 10⁻⁵ where ε = 10⁻⁴ reported 8 × 10⁻¹³. Which is the analytic gradient's fault?",
          options: [
            "Both — the gradient is wrong",
            "Neither — the large error at ε = 10⁻¹² is rounding: two nearly equal losses are subtracted and divided by a tiny number, so the numeric estimate itself is bad; the analytic gradient is right, and ε ≈ 10⁻⁴ to 10⁻⁶ is the usable range in float64",
            "The 10⁻⁴ result, because larger ε is less accurate",
            "It depends on the loss function"
          ],
          answer: 1,
          why: "Truncation error falls as ε² and rounding error grows as 1/ε; the measured sweep shows the minimum near 10⁻⁴ and the rounding regime from 10⁻⁶ downward. A gradient check is only as good as its ε."
        },
        {
          stem: "Why does forward + backward take about three times as long as forward alone?",
          options: [
            "Because backward runs the forward pass again",
            "Because backward does two matrix products per layer — one to pass δ back through Wᵀ and one to form the weight gradient from δ and the stored input — where forward did one; measured 11.9 ms against 4.0 ms",
            "Because of Python overhead in autograd",
            "Because the loss is computed twice"
          ],
          answer: 1,
          why: "Each layer's backward needs δ_prev = Wᵀδ and ∂L/∂W = inputᵀδ, two products of the same size as the forward product. The forward cache means nothing is recomputed, so the ratio is close to the theoretical 3."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "Backprop by hand from the other side, a three-layer backward, and a network that trains",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** With the same weights, run x = [2, 1] and y = 0 through the network. Compute the forward values, δ₂, ∂L/∂W₂, ∂L/∂b₂, δ₁, ∂L/∂W₁ and ∂L/∂b₁ by hand, then confirm against autograd." },
        { t: "p", text: "**(b)** Extend the batched NumPy MLP to any number of layers with tanh hidden units (derivative 1 − a²) and a softmax output. Gradient-check a 4-6-5-3 network on ten random examples." },
        { t: "p", text: "**(c)** Train a 64-64-32-10 version on the 8 × 8 digits (70/30 split) with plain SGD, learning rate 0.5, batch 32, for 30 epochs, and report training loss and test accuracy at epochs 1, 5, 10, 20 and 30." }
      ],
      requirements: [
        "(a) all seven quantities and the autograd discrepancy.",
        "(b) six maximum discrepancies, all below 10⁻⁹.",
        "(c) five rows."
      ],
      hint: "(a) With y = 0 the loss is −ln(1 − ŷ) and δ₂ is still ŷ − y = ŷ. Both hidden units are on this time. (b) Keep a list of activations A[0..L]; in the loop, dW[i] = A[i]ᵀ dZ, then dZ = (dZ W[i]ᵀ) ⊙ (1 − A[i]²) for the next layer down.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) forward: z1 = [0.7, 1.1]   a1 = [0.7, 1.1]   z2 = 0.25   ŷ = 0.5622   loss −ln(1 − 0.5622) = 0.8259
#     δ2 = ŷ − 0 = 0.5622        ∂L/∂W2 = δ2·a1 = [0.3935, 0.6184]        ∂L/∂b2 = 0.5622
#     δ1 = (δ2·W2) ⊙ [1, 1] = [0.3935, −0.2249]
#     ∂L/∂W1 = δ1 ⊗ x = [[0.7870, 0.3935], [−0.4497, −0.2249]]           ∂L/∂b1 = [0.3935, −0.2249]
#     max |hand − autograd| = 1.0e-09

# (b) 3-layer tanh MLP gradient check (ε = 1e-5):
#     W1 1.68e-11   b1 1.78e-11   W2 1.99e-11   b2 1.88e-11   W3 1.39e-11   b3 8.40e-12

# (c) epoch  1: train loss 0.5520   test acc 0.822
#     epoch  5: train loss 0.3531   test acc 0.869
#     epoch 10: train loss 0.0423   test acc 0.965
#     epoch 20: train loss 0.0115   test acc 0.976
#     epoch 30: train loss 0.0051   test acc 0.976`,
        notes: [
          { t: "p", text: "(a) With both units active, both rows of ∂L/∂W₁ are non-zero, and the second row is negative because W₂'s second weight is negative: raising that unit's activation would lower ŷ, which for y = 0 is the right direction." },
          { t: "p", text: "(b) is the general recursion; the tanh derivative uses the stored activation, not the pre-activation, which is why the cache keeps a." },
          { t: "p", text: "(c) is proof that the twelve lines are a working learning algorithm: 97.6 % on held-out digits with nothing but NumPy, matching the sklearn MLP of the ML course." }
        ]
      }
    }
  ],

  takeaways: [
    "Backpropagation is the chain rule with reuse: δ_L = prediction − target at a matched output (here −0.6271 = ŷ − y), then δₗ = (Wₗ₊₁ᵀ δₗ₊₁) ⊙ f′(zₗ) layer by layer, and ∂L/∂Wₗ = δₗ ⊗ inputₗ. Every hand-computed partial matched autograd to 3 × 10⁻⁸ and finite differences to seven decimals.",
    "A ReLU that was off in the forward pass passes zero gradient: the first row of ∂L/∂W₁ was exactly [0, 0]. Off for one example is normal; off for all is dead.",
    "In a batch, outer products become matrix products and biases sum over rows: dW2 = A1ᵀ @ dZ2 has shape (H, K) because the batch dimension is contracted. Twelve lines of NumPy; relative gradient error 10⁻¹¹.",
    "The finite-difference check has truncation error ∝ ε² and rounding error ∝ 1/ε; measured, the minimum was at ε = 10⁻⁴ (8 × 10⁻¹³) and ε = 10⁻¹² was a thousand times worse than ε = 10⁻¹. Run the check in float64.",
    "Autograd builds a graph of the forward pass and walks it backward; gradients accumulate into .grad (4.0 then 8.0 without zero_grad), and a dynamic graph can differ per input (grad 2x for one branch, 3x² for the other).",
    "Parameters are updated by the gradient, hyperparameters are set by validation; an epoch of 1,257 examples at batch 64 is 20 iterations with a 41-example remainder; backward costs about twice forward (11.9 ms against 4.0 ms), so a training step is about three forward passes."
  ],

  quiz: {
    title: "Backpropagation, Derived and Checked — Knowledge Check",
    questions: [
      {
        stem: "Why is δ at the output simply ŷ − y for sigmoid-plus-BCE and softmax-plus-cross-entropy?",
        options: [
          "It is an approximation that works well enough",
          "Because ∂L/∂ŷ = −1/ŷ (for y = 1) and ∂ŷ/∂z = ŷ(1 − ŷ) multiply to ŷ − 1; the loss derivative's division cancels the activation derivative's product, leaving the plain error — measured −2.6820 × 0.2338 = −0.6271 = 0.3729 − 1",
          "Because the bias absorbs the difference",
          "Because BCE is defined that way"
        ],
        answer: 1,
        why: "The cancellation is exact and is the reason these pairings are standard: the output gradient neither saturates nor vanishes however confident the prediction. The same cancellation gives p − onehot for softmax-cross-entropy (1.3)."
      },
      {
        stem: "What must the forward pass keep in memory for the backward pass, and what follows?",
        options: [
          "Only the final output",
          "Every layer's pre-activation (for the activation derivative) and activation (as the next layer's input, for the weight gradient); memory in training therefore scales with depth × batch × width, and gradient checkpointing trades some of it for recomputation",
          "Only the weights",
          "The gradients from the previous step"
        ],
        answer: 1,
        why: "δ₁ needs 1[z₁ > 0] and ∂L/∂W₂ needs a₁; neither can be recovered from the output alone. This cache, not the parameters, is usually what fills GPU memory during training."
      },
      {
        stem: "You forget optimizer.zero_grad() in a training loop. What happens?",
        options: [
          "Training proceeds normally",
          "Gradients accumulate across steps — after two backward passes w.grad was 8.0 rather than 4.0 — so each update uses the sum of all previous gradients and the effective step grows without bound",
          "PyTorch raises an error",
          "The learning rate is halved"
        ],
        answer: 1,
        why: "Accumulation is the documented behaviour, kept so that gradient accumulation across micro-batches needs no special code. The loop must zero the gradients once per intended update."
      },
      {
        stem: "A gradient check reports relative error 10⁻¹¹ on W1, b1 and b2 but 0.7 on W2. What is the most likely cause?",
        options: [
          "ε is wrong",
          "The whole backward pass is wrong",
          "A single mistake in the line that forms W2's gradient — a missing transpose, the wrong input matrix, or a forgotten mean over the batch — since every other parameter, including those computed from δ₂, is correct",
          "Float32 rounding"
        ],
        answer: 2,
        why: "The check localises errors: b2 correct means δ₂ is correct, so the error is in how δ₂ was paired with A1 to form dW2. Reading which parameters fail is the diagnostic, not just whether any do."
      },
      {
        stem: "Static and dynamic computational graphs differ in what respect?",
        options: [
          "Static graphs cannot compute gradients",
          "A static graph is defined once and run many times, so control flow must be expressed as graph operations; a dynamic graph is rebuilt on each forward pass as Python executes, so an ordinary if statement can select a different computation per input — measured as gradient 2x on one branch and 3x² on the other",
          "Dynamic graphs are always faster",
          "Static graphs are only used for inference"
        ],
        answer: 1,
        why: "PyTorch's define-by-run design records operations as they happen; TensorFlow 1 and traced/compiled graphs fix the structure in advance and can optimise it. torch.compile brings compiled-graph performance to dynamic code where the control flow permits."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Backpropagation",
    sub: "The chain rule with reuse, δ, the worked numbers, the gradient check, and the graph.",
    questions: [
      {
        level: "Core",
        q: "Explain backpropagation and work it on a small example.",
        strong: "It is the chain rule organised backward so that each layer's error signal is computed once and reused. Take x = [1, 2], y = 1, two ReLU hidden units with W₁ = [[0.5, −0.3], [0.1, 0.8]], b₁ = [0, 0.1], and a sigmoid output with W₂ = [0.7, −0.4], b₂ = 0.2. Forward: z₁ = [−0.1, 1.8], a₁ = [0, 1.8], z₂ = −0.52, ŷ = 0.3729, BCE loss 0.9866. Backward: δ₂ = ŷ − y = −0.6271; ∂L/∂W₂ = δ₂·a₁ = [0, −1.1289], ∂L/∂b₂ = −0.6271; back through W₂, ∂L/∂a₁ = δ₂·W₂ = [−0.4390, 0.2509]; through the ReLU mask [0, 1], δ₁ = [0, 0.2509]; ∂L/∂W₁ = δ₁ ⊗ x = [[0, 0], [0.2509, 0.5017]], ∂L/∂b₁ = [0, 0.2509]. Autograd agrees to 3 × 10⁻⁸ and finite differences to seven decimals. The general form is δₗ = (Wₗ₊₁ᵀδₗ₊₁) ⊙ f′(zₗ), ∂L/∂Wₗ = δₗ ⊗ aₗ₋₁; the first unit got zero gradient because it was off, and one SGD step at 0.5 moved ŷ from 0.37 to 0.67.",
        answer: [
          { t: "p", text: "The principle, every executed number, the recursion, and the two observations (dead unit, the step's effect)." }
        ]
      },
      {
        level: "Core",
        q: "How do you verify a hand-written backward pass?",
        strong: "With a central finite-difference check: for every parameter, perturb by ±ε, evaluate the loss twice, and compare (L(θ+ε) − L(θ−ε))/2ε with the analytic gradient, reporting the maximum relative discrepancy per parameter tensor. On a 5-7-3 NumPy MLP with ε = 10⁻⁵ in float64 I get 10⁻¹¹ relative error on every tensor. The choice of ε matters: truncation error falls as ε² and rounding error grows as 1/ε, and the measured sweep had its minimum near ε = 10⁻⁴ (8 × 10⁻¹³) with ε = 10⁻¹² a thousand times worse than ε = 10⁻¹; float32 is not precise enough, so run the check in float64. The check also localises the bug — if b₂ passes and W₂ fails, δ₂ is right and the line pairing δ₂ with the layer input is wrong. It is slow, two forward passes per parameter, so it is run on a tiny network once, not in training.",
        answer: [
          { t: "p", text: "The procedure, the executed result, the ε analysis with numbers, the localisation property, and when to run it." }
        ]
      },
      {
        level: "Core",
        q: "What is a computational graph, and what is the difference between static and dynamic?",
        strong: "A directed acyclic graph recording every operation of the forward pass, where each node knows its local derivative; backward walks it in reverse topological order applying the chain rule, which is backpropagation generalised from layers to arbitrary operations. A static graph is defined once and executed many times — TensorFlow 1, Theano, a traced TorchScript module — so it can be optimised ahead of time but data-dependent control flow must be expressed as graph ops. A dynamic graph is rebuilt on every forward pass as the host language runs — PyTorch, eager TensorFlow — so an ordinary Python if can choose a different computation per input; I showed a function whose gradient is 2x on one branch and 3x² on the other. The cost is per-step overhead, which torch.compile recovers by tracing the dynamic code into a compiled graph where the control flow allows.",
        answer: [
          { t: "p", text: "Definition, the two designs with their trade-off, the executed branch example, and torch.compile as the reconciliation." }
        ]
      },
      {
        level: "Advanced",
        q: "Why does training use so much more memory than inference, and what can be done about it?",
        strong: "Because backward needs the forward activations: each layer's pre-activation for the activation derivative and its activation as the input paired with δ to form the weight gradient. Those must be cached for every layer and every example in the batch until backward consumes them, so training memory scales with depth × batch × width on top of the parameters, whereas inference discards each activation as soon as the next layer has used it. The options are: a smaller batch with gradient accumulation to keep the effective batch (2.3); activation checkpointing, which stores only some layers' activations and recomputes the rest during backward, trading roughly a third more compute for a large memory reduction; mixed precision, which halves the cache (2.5); and for very long sequences, attention variants that never materialise the full activation (5.3).",
        answer: [
          { t: "p", text: "The cache as the cause, the scaling, and the four remedies with their trade-offs." }
        ]
      },
      {
        level: "Advanced",
        q: "What is the difference between a parameter and a hyperparameter, and between an epoch, a batch and an iteration?",
        strong: "A parameter is anything the gradient updates — weights and biases, 109,386 of them in a 784-128-64-10 MLP. A hyperparameter is set before training and untouched by the gradient — learning rate, batch size, width, depth, weight decay, dropout, epoch count — and is chosen on validation data, never on training loss, because the training loss would choose the largest model and the longest run. An iteration is one forward, backward and update on one mini-batch; a batch is the examples in that iteration, whose gradient is the mean of theirs; an epoch is one pass over the training set. With 1,257 examples and batch 64 that is 20 iterations per epoch with a final batch of 41, and ten epochs is 200 updates. Since backward is about twice forward — 11.9 ms against 4.0 ms measured — an iteration costs about three forward passes plus the optimiser.",
        answer: [
          { t: "p", text: "The definitions, the validation rule for hyperparameters, and the executed arithmetic and timing." }
        ]
      }
    ]
  }
});

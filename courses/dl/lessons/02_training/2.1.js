/* ============================================================================
   LESSON 2.1 — A Network from Scratch in NumPy
   ========================================================================= */
EC.receiveLesson({
  id: "2.1",

  lede: "**Everything in module 1 fits in a hundred lines of NumPy, and those hundred lines reach 97.6 % on MNIST in five epochs — within a tenth of a point of PyTorch running the same architecture.** The framework below has layers with forward and backward methods, a loss with a gradient, two optimisers, dropout, and a gradient check that passes at 2 × 10⁻¹¹. Writing it once is how the framework's `.backward()` stops being magic; the second half of the lesson shows what PyTorch and Keras add on top and what they do not.",

  objectives: [
    "Structure a network as layer objects with forward, backward, params and grads, composed by a Sequential container",
    "Implement Linear, ReLU, Dropout and softmax-cross-entropy with their backward passes, and SGD-with-momentum and Adam as optimisers",
    "Gradient-check the assembled framework and train it on the full MNIST training set, reporting test accuracy per epoch",
    "Add a layer with a non-trivial backward (BatchNorm) and verify it the same way",
    "Compare the from-scratch result with PyTorch's on the same architecture, and read the Keras version of the same loop"
  ],

  prerequisites: ["1.4", "1.5", "1.6", "1.7"],

  blocks: [

    { t: "h2", n: "01", text: "The design", id: "design" },

    { t: "p", text: "Four kinds of object. A **layer** has forward(x), which caches whatever backward will need and returns the output, and backward(dout), which receives ∂L/∂output, fills in its parameter gradients, and returns ∂L/∂input. A **loss** has forward(logits, y) and a backward() that starts the chain. A **container** calls the layers in order and in reverse. An **optimiser** holds (parameter, gradient) pairs and knows one update rule. That is the entire architecture of every deep-learning framework; the rest is autograd, GPUs and convenience." },

    { t: "code", lang: "python", title: "Linear, ReLU, Dropout, softmax-cross-entropy",
      code: `class Linear:
    def __init__(self, n_in, n_out, rng):
        self.W = rng.normal(0, np.sqrt(2 / n_in), (n_in, n_out)).astype(np.float32)   # He init
        self.b = np.zeros(n_out, np.float32)
        self.params = [self.W, self.b]; self.grads = [np.zeros_like(self.W), np.zeros_like(self.b)]
    def forward(self, x):  self.x = x; return x @ self.W + self.b
    def backward(self, dout):
        self.grads[0][...] = self.x.T @ dout          # (n_in, B) @ (B, n_out)
        self.grads[1][...] = dout.sum(0)
        return dout @ self.W.T                        # ∂L/∂x for the layer below

class ReLU:
    params = []; grads = []
    def forward(self, x):  self.mask = x > 0; return x * self.mask
    def backward(self, dout):  return dout * self.mask

class Dropout:
    params = []; grads = []
    def __init__(self, p, rng):  self.p = p; self.rng = rng; self.training = True
    def forward(self, x):
        if not self.training or self.p == 0: return x
        self.mask = (self.rng.random(x.shape) > self.p) / (1 - self.p); return x * self.mask
    def backward(self, dout):  return dout * self.mask

class SoftmaxCrossEntropy:
    def forward(self, logits, y):
        m = logits.max(1, keepdims=True)
        self.logp = logits - m - np.log(np.exp(logits - m).sum(1, keepdims=True)); self.y = y
        return -self.logp[np.arange(len(y)), y].mean()
    def backward(self):
        d = np.exp(self.logp); d[np.arange(len(self.y)), self.y] -= 1; return d / len(self.y)   # p − onehot, / B`,
      caption: "Each backward is one line of module 1: Linear is lesson 1.4's δ ⊗ input and Wᵀδ; ReLU is the mask; Dropout is its own mask reused; the loss gradient is p − y over the batch. The grads are written in place (`[...]`) so the optimiser can hold references to them." },

    { t: "code", lang: "python", title: "Sequential, SGD with momentum, Adam",
      code: `class Sequential:
    def __init__(self, *layers):  self.layers = layers
    def forward(self, x):
        for l in self.layers: x = l.forward(x)
        return x
    def backward(self, dout):
        for l in reversed(self.layers): dout = l.backward(dout)
    def params(self):  return [(p, g) for l in self.layers for p, g in zip(l.params, l.grads)]
    def train(self, flag=True):
        for l in self.layers:
            if hasattr(l, "training"): l.training = flag

class SGD:
    def __init__(self, params, lr, momentum=0.9, wd=0.0):
        self.params = params; self.lr = lr; self.m = momentum; self.wd = wd
        self.v = [np.zeros_like(p) for p, _ in params]
    def step(self):
        for (p, g), v in zip(self.params, self.v):
            v *= self.m; v += g + self.wd * p; p -= self.lr * v            # v ← βv + g (+ decay); θ ← θ − ηv

class Adam:
    def __init__(self, params, lr=1e-3, b1=0.9, b2=0.999, eps=1e-8):
        self.params = params; self.lr = lr; self.b1 = b1; self.b2 = b2; self.eps = eps; self.t = 0
        self.m = [np.zeros_like(p) for p, _ in params]; self.v = [np.zeros_like(p) for p, _ in params]
    def step(self):
        self.t += 1
        for (p, g), m, v in zip(self.params, self.m, self.v):
            m *= self.b1; m += (1 - self.b1) * g
            v *= self.b2; v += (1 - self.b2) * g * g
            mh = m / (1 - self.b1 ** self.t); vh = v / (1 - self.b2 ** self.t)
            p -= self.lr * mh / (np.sqrt(vh) + self.eps)`,
      caption: "The optimisers are lesson 1.5's update rules acting on the (parameter, gradient) list. Because the parameters are NumPy arrays updated in place, the layers see the new weights on the next forward without any registration mechanism — the same trick PyTorch's optimisers use with `param.data`." },

    { t: "h2", n: "02", text: "Check it, then train it", id: "train" },

    { t: "code", lang: "text", title: "Gradient check and MNIST training (executed)",
      code: `framework gradient check (5-7-3, six examples, float64): worst |analytic − numeric| = 2.1e-11

MNIST: 60,000 training images, 10,000 test, standardised with pixel mean 0.1307 and std 0.3081
784-256-256-10, He init, batch 64, 269,322 parameters

sgd (lr 0.05, momentum 0.9):
  ep1 loss 0.219 test 0.9637   ep2 0.098 / 0.9676   ep3 0.075 / 0.9687   ep4 0.056 / 0.9714   ep5 0.046 / 0.9734    23 s (4.6 s/epoch)
adam (lr 1e-3):
  ep1 loss 0.201 test 0.9665   ep2 0.086 / 0.9658   ep3 0.061 / 0.9746   ep4 0.048 / 0.9719   ep5 0.040 / 0.9762    36 s (7.2 s/epoch)
adam + dropout 0.2:  final test 0.9751   (59 s)

PyTorch, same architecture and initialisation, Adam:  0.9654  0.9659  0.9708  0.9740  0.9752   (29 s)`,
      caption: "97.6 % in five epochs, 4.6 seconds per epoch on a CPU in NumPy, and PyTorch on the same network lands at 97.5 %. The two differ in the random draws, not in the mathematics. Adam costs 50 % more per step than SGD here — two extra moving averages per parameter, all in NumPy — which is the price its per-coordinate normalisation carries everywhere." },

    { t: "p", text: "The training loop itself is the loop you will write for the rest of the course, in any framework: permute, slice a batch, forward, loss, backward, step; at the end of each epoch, switch off dropout, evaluate, switch it back on." },

    { t: "code", lang: "python", title: "The loop",
      code: `for ep in range(epochs):
    perm = rng.permutation(n_train)
    for i in range(0, n_train, bs):
        idx = perm[i:i+bs]
        loss = loss_fn.forward(net.forward(Xtr[idx]), ytr[idx])
        net.backward(loss_fn.backward())
        opt.step()
    net.train(False); acc = accuracy(net, Xte, yte); net.train(True)`,
      caption: "There is no zero_grad because the Linear layer overwrites its gradients on every backward; PyTorch accumulates instead (1.4), which is the one line you will add." },

    { t: "h2", n: "03", text: "Adding a layer: BatchNorm's backward", id: "bn" },

    { t: "p", text: "The framework earns its keep when you add something. BatchNorm's forward is four lines (1.6); its backward is the one derivation in this course that people usually look up rather than do, because the mean and variance depend on every example in the batch, so ∂L/∂xᵢ has contributions through μ and σ² as well as directly. The result, after the algebra collapses:" },

    { t: "code", lang: "python", title: "BatchNorm forward and backward",
      code: `class BatchNorm:
    def forward(self, x):
        if self.training:
            mu = x.mean(0); var = x.var(0)
            self.rm = (1 - self.m) * self.rm + self.m * mu                 # running statistics for eval
            self.rv = (1 - self.m) * self.rv + self.m * x.var(0, ddof=1)
        else:
            mu, var = self.rm, self.rv
        self.std = np.sqrt(var + self.eps); self.xhat = (x - mu) / self.std
        return self.gamma * self.xhat + self.beta
    def backward(self, dout):
        self.grads[0][...] = (dout * self.xhat).sum(0)                     # ∂L/∂γ
        self.grads[1][...] = dout.sum(0)                                   # ∂L/∂β
        dxhat = dout * self.gamma
        return (dxhat - dxhat.mean(0) - self.xhat * (dxhat * self.xhat).mean(0)) / self.std

gradient check, Linear-BatchNorm-ReLU-Linear:  worst |analytic − numeric| = 1.7e-11     (executed)

784-256-256-10, SGD 0.05, three epochs:
  no BN   test 0.9637  0.9676  0.9687
  BN      test 0.9681  0.9758  0.9789                  (17 s against 14 s)`,
      caption: "Read the backward's last line: the gradient through x̂ (dxhat) minus its batch mean (the path through μ) minus x̂ times the batch mean of dxhat·x̂ (the path through σ²), all over the standard deviation. The check at 1.7 × 10⁻¹¹ is how you know the algebra is right; a point of accuracy at epoch three is what the layer is worth on this network." },

    { t: "h2", n: "04", text: "What the frameworks add", id: "frameworks" },

    { t: "dl", items: [
      ["Autograd", "You wrote every backward by hand. PyTorch records the forward operations and derives the backward — for any composition of its ~2,000 operators, including ones you would never differentiate by hand (an SVD, a sort). That is the single largest thing a framework gives you, and lesson 2.2 covers its contract."],
      ["Hardware", "NumPy uses one CPU's BLAS. A framework runs the same matrix products on a GPU or TPU with no change to the model code, which is a factor of 10–100 for the networks in modules 3–5."],
      ["Layers and losses", "Convolution with its im2col and its backward (3.2), LSTM cells (4.3), attention (5.1), thirty loss functions — written, tested and fused. You will write several of these by hand in this course to understand them; you will not ship your own."],
      ["Data pipelines", "Dataset, DataLoader, multi-process loading, augmentation — the part of a real project that takes the most engineering (2.2)."],
      ["Everything around the loop", "Schedulers, mixed precision, checkpointing, distributed training, profiling, export (2.3, 2.5, 11.2)."],
      ["What they do not add", "Any change to the mathematics. The MNIST result above is the same network reaching the same accuracy; the gradient PyTorch computes is the one the framework here computes, to floating-point precision."]
    ] },

    { t: "code", lang: "python", title: "The same network in Keras (not run here — TensorFlow is not installed in this environment)",
      code: `model = keras.Sequential([
    keras.layers.Dense(256, activation="relu", kernel_initializer="he_normal", input_shape=(784,)),
    keras.layers.Dense(256, activation="relu", kernel_initializer="he_normal"),
    keras.layers.Dense(10)                                    # logits; the loss applies softmax
])
model.compile(optimizer=keras.optimizers.Adam(1e-3),
              loss=keras.losses.SparseCategoricalCrossentropy(from_logits=True),
              metrics=["accuracy"])
model.fit(x_train, y_train, batch_size=64, epochs=5, validation_data=(x_test, y_test))`,
      caption: "Keras's compile/fit hides the loop entirely; from_logits=True is the equivalent of computing cross-entropy from logits (1.3) and the most common Keras mistake is omitting it after a softmax output layer. PyTorch (2.2) keeps the loop visible, which is why this course uses it: every line of the loop is a place to instrument." },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "In the Linear layer, backward writes self.grads[0][...] = self.x.T @ dout and returns dout @ self.W.T. Which is which?",
          options: [
            "Both are the weight gradient, computed two ways",
            "The first is ∂L/∂W — the layer's input transposed times the incoming gradient, summing over the batch — and the second is ∂L/∂x, the gradient passed to the layer below through Wᵀ",
            "The first is the bias gradient",
            "The second is the momentum update"
          ],
          answer: 1,
          why: "Lesson 1.4's two products: the weight gradient pairs δ with the stored input, and the gradient for the previous layer sends δ back through the transposed weights. The shapes confirm it — (n_in, B)(B, n_out) = (n_in, n_out) for W, and (B, n_out)(n_out, n_in) = (B, n_in) for x."
        },
        {
          stem: "The NumPy framework and PyTorch reached 97.62 % and 97.52 % on the same architecture. What accounts for the difference?",
          options: [
            "PyTorch's gradient is more accurate",
            "NumPy's float32 is different from PyTorch's",
            "Different random draws for the initial weights, the batch order and dropout; the mathematics is identical and the gradient check shows the backward passes agree to 10⁻¹¹",
            "PyTorch uses a different loss"
          ],
          answer: 2,
          why: "Two runs of the same framework with different seeds differ by about this much. The framework adds autograd, hardware and convenience; it does not change what the network computes or the gradient it descends."
        },
        {
          stem: "Why does BatchNorm's backward subtract dxhat.mean(0) and x̂·(dxhat·x̂).mean(0)?",
          options: [
            "To normalise the gradient",
            "Because the batch mean and variance depend on every example, so ∂L/∂xᵢ has three terms — the direct path through x̂ᵢ and the paths through μ and σ², which appear as those two batch averages; the check at 1.7 × 10⁻¹¹ confirms the collapsed form",
            "To prevent the gradient from exploding",
            "Because γ and β are shared across the batch"
          ],
          answer: 1,
          why: "Every example's normalised value moves when any example changes the batch statistics. The full derivation expands ∂μ/∂xᵢ = 1/N and ∂σ²/∂xᵢ = 2(xᵢ − μ)/N and sums; the three-term result is what remains, and it is why BatchNorm's gradient couples examples in a batch."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Extend the framework: Tanh, BatchNorm, and the check that proves them",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Add a Tanh layer (backward: dout · (1 − a²), using the cached output) and gradient-check a Linear-Tanh-Linear network with softmax-cross-entropy on eight random examples in float64." },
        { t: "p", text: "**(b)** Add BatchNorm with the forward and backward above, including running statistics and a training flag, and gradient-check Linear-BatchNorm-ReLU-Linear on the same data (γ and β are parameters; the check must cover them)." },
        { t: "p", text: "**(c)** Train 784-256-256-10 on MNIST with SGD (lr 0.05, momentum 0.9, batch 64) for three epochs with and without BatchNorm after each hidden Linear, and report test accuracy per epoch and the time." }
      ],
      requirements: [
        "(a) one worst-case discrepancy below 10⁻⁹.",
        "(b) one worst-case discrepancy below 10⁻⁹.",
        "(c) two rows of three accuracies with times."
      ],
      hint: "Cast parameters and gradients to float64 before the check and keep the layer's attribute references pointing at the cast arrays (W, b, gamma, beta). In the check, remember to call forward in training mode so batch statistics are used, and to use the same batch throughout.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) gradient check, Linear-Tanh-Linear:            worst |analytic − numeric| = 1.9e-11
# (b) gradient check, Linear-BatchNorm-ReLU-Linear:  worst |analytic − numeric| = 1.7e-11
# (c) no BN   test acc per epoch [0.9637, 0.9676, 0.9687]   (14 s)
#     BN      test acc per epoch [0.9681, 0.9758, 0.9789]   (17 s)`,
        notes: [
          { t: "p", text: "(a) is the pattern for any element-wise layer: cache what the derivative needs, multiply on the way back." },
          { t: "p", text: "(b) is the hardest backward in the course written by hand, and the check is what makes it safe to trust." },
          { t: "p", text: "(c) is lesson 1.6's claim on a real dataset: a point at epoch three for a 20 % cost in time." }
        ]
      }
    }
  ],

  takeaways: [
    "A framework is four kinds of object: layers with forward/backward/params/grads, a loss with a gradient, a container that runs them in order and in reverse, and an optimiser over (parameter, gradient) pairs. A hundred lines of NumPy is enough.",
    "Every backward is a line from module 1 — Linear: xᵀδ and δWᵀ; ReLU: the mask; Dropout: its mask; softmax-cross-entropy: (p − onehot)/B — and the assembled framework passes a gradient check at 2 × 10⁻¹¹.",
    "On the full MNIST training set the NumPy network reached 97.34 % (SGD) and 97.62 % (Adam) in five epochs at 4.6–7.2 s per epoch; PyTorch on the same architecture reached 97.52 %. The difference is the random draws.",
    "BatchNorm's backward has three terms — the direct path and the paths through μ and σ² — collapsing to (dx̂ − mean(dx̂) − x̂·mean(dx̂·x̂))/σ; verified at 1.7 × 10⁻¹¹, and worth a point at epoch three (0.9789 vs 0.9687).",
    "Frameworks add autograd, hardware, tested layers, data pipelines and everything around the loop; they do not change the mathematics, and the loop — permute, batch, forward, loss, backward, step, evaluate in eval mode — is the same in all of them.",
    "Keras hides the loop in compile/fit (from_logits=True is its cross-entropy-from-logits); PyTorch keeps the loop visible, which is why the rest of this course uses it."
  ],

  quiz: {
    title: "A Network from Scratch — Knowledge Check",
    questions: [
      {
        stem: "Why does each layer cache its input (or output) in forward?",
        options: [
          "To save time on the next forward pass",
          "Because backward needs it: Linear needs its input to form xᵀδ, ReLU needs the mask from its input, Tanh and BatchNorm need their outputs — this cache is the memory cost of training that inference does not pay",
          "For debugging only",
          "To compute the running statistics"
        ],
        answer: 1,
        why: "Lesson 1.4's forward cache, made concrete: every backward line references something stored in forward. PyTorch does the same inside its autograd graph, and gradient checkpointing (2.3) is the choice to recompute instead of store."
      },
      {
        stem: "The NumPy loop has no zero_grad. Why, and why does PyTorch's need one?",
        options: [
          "NumPy gradients are always zero at the start",
          "Because the Linear layer overwrites its gradient buffers in place on every backward, whereas PyTorch accumulates into .grad so that gradients can be summed across several backward calls — which is a feature, and also a bug if you forget to clear them",
          "PyTorch does not need one either",
          "Because NumPy uses momentum"
        ],
        answer: 1,
        why: "Overwrite and accumulate are both defensible designs; accumulation supports gradient accumulation across micro-batches for free (2.3). The NumPy version shows the alternative and why the PyTorch line exists."
      },
      {
        stem: "Adam took 7.2 s per epoch against SGD's 4.6 s in NumPy. Where does the extra time go?",
        options: [
          "Adam computes the gradient twice",
          "Into the two moving averages per parameter and the per-element square root and division — several extra passes over 269,322 numbers per step, done in NumPy without fusion; frameworks fuse these into one kernel and the gap mostly disappears",
          "Into the bias correction",
          "Into a larger batch size"
        ],
        answer: 1,
        why: "The update rule has five element-wise operations where SGD-with-momentum has two. In PyTorch on a GPU the cost is dominated by the matrix products and the optimiser's overhead is small; in NumPy on a CPU it shows."
      },
      {
        stem: "What does from_logits=True do in the Keras cross-entropy, and what goes wrong without it?",
        options: [
          "It doubles the learning rate",
          "It tells the loss the model's output is raw logits so it applies log-softmax internally with the log-sum-exp trick; without it, after a linear output layer, the loss treats logits as probabilities and trains on the wrong objective — or, after a softmax layer, computes log of a probability that can underflow",
          "It is required for regression",
          "It enables label smoothing"
        ],
        answer: 1,
        why: "It is Keras's version of lesson 1.3's rule: cross-entropy from logits. The NumPy loss above is exactly the from_logits=True form, and PyTorch's CrossEntropyLoss has no other form."
      },
      {
        stem: "What would change in the framework to support a convolutional layer?",
        options: [
          "Nothing; convolution is a Linear layer",
          "One new layer class with a forward that computes the cross-correlation (via im2col and a matrix product) and a backward that returns the input gradient and fills the kernel gradient — the container, loss, optimisers and check all work unchanged",
          "The optimisers would need to be rewritten",
          "The gradient check no longer applies"
        ],
        answer: 1,
        why: "The layer abstraction is the point: anything with forward, backward, params and grads composes. Lesson 3.2 writes exactly that layer and checks it with the same finite-difference loop."
      }
    ]
  },

  interview: {
    title: "Interview Questions — A Network from Scratch",
    sub: "The framework design, the backward of each layer, BatchNorm's gradient, and what a real framework adds.",
    questions: [
      {
        level: "Core",
        q: "Implement a two-layer neural network from scratch. Walk me through the design.",
        strong: "I would structure it as a tiny framework rather than one function, because the structure is what generalises. Each layer has forward(x), which caches what backward needs and returns the output, and backward(dout), which fills its parameter gradients and returns the input gradient. Linear caches x and returns x@W + b; its backward sets ∂W = xᵀδ, ∂b = Σδ and returns δWᵀ. ReLU caches the mask. The softmax-cross-entropy loss computes log-softmax stably and its backward is (p − onehot)/B. A Sequential runs forward in order and backward in reverse and exposes (param, grad) pairs; an optimiser holds those pairs and applies SGD with momentum or Adam. Before training I gradient-check the whole thing in float64 — worst discrepancy 2 × 10⁻¹¹. Then the loop: permute, slice a batch, forward, loss, backward, step. That design at 784-256-256-10 reached 97.6 % on MNIST in five epochs in NumPy, and PyTorch on the same architecture reached 97.5 %; the difference is the random seed, because the mathematics is the same.",
        answer: [
          { t: "p", text: "The four-object design, each backward as a line from the derivation, the gradient check, the loop, and the executed comparison with PyTorch." }
        ]
      },
      {
        level: "Advanced",
        q: "Derive the backward pass of batch normalisation.",
        strong: "Forward: μ = mean(x), σ² = var(x) over the batch, x̂ = (x − μ)/√(σ² + ε), y = γx̂ + β. The parameter gradients are direct: ∂L/∂γ = Σ dout·x̂ and ∂L/∂β = Σ dout. For the input, write dx̂ = dout·γ; then xᵢ affects the loss three ways — through x̂ᵢ directly, through μ (∂μ/∂xᵢ = 1/N), and through σ² (∂σ²/∂xᵢ = 2(xᵢ − μ)/N). Summing the chain-rule terms and simplifying, ∂L/∂xᵢ = (dx̂ᵢ − mean(dx̂) − x̂ᵢ·mean(dx̂·x̂)) / √(σ² + ε). The middle term is the μ path — the gradient's batch mean is removed — and the last is the σ² path — the component along x̂ is removed. I verified the implementation against finite differences at 1.7 × 10⁻¹¹ on a Linear-BatchNorm-ReLU-Linear network including γ and β. The form explains two things about BatchNorm: its gradient couples the examples in a batch, which is why it needs a batch (1.6), and it projects out the mean and the x̂ direction of the incoming gradient, which is part of why it stabilises training.",
        answer: [
          { t: "p", text: "The three paths, the collapsed formula, the executed check, and the two consequences." }
        ]
      },
      {
        level: "Core",
        q: "What does PyTorch give you that the NumPy version does not?",
        strong: "Autograd first: I wrote every backward by hand and checked it; PyTorch derives the backward of any composition of its operators from the forward alone, including operations nobody differentiates by hand. Hardware second: the same code runs on a GPU, which is one to two orders of magnitude for convolutional and attention networks. Then a library of tested layers and losses — convolution, LSTM, attention, thirty losses — a data pipeline with multi-process loading and augmentation, and everything around the loop: schedulers, mixed precision, checkpointing, distributed training, export. What it does not give you is any change in the mathematics: on the same 784-256-256-10 network the NumPy code reached 97.6 % and PyTorch 97.5 %, the gradient check shows the backward passes agree to 10⁻¹¹, and the loop — batch, forward, loss, backward, step — is the same loop with one added line, zero_grad, because PyTorch accumulates gradients where mine overwrote them.",
        answer: [
          { t: "p", text: "Autograd, hardware, layers, data, tooling — and the executed evidence that the mathematics is unchanged." }
        ]
      }
    ]
  }
});

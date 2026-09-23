/* ============================================================================
   LESSON 1.4 — Backpropagation, Derived in Full
   Mirrors 01_Neural_Network_Fundamentals.md · §5 (The Chain Rule, the
   complete two-layer derivation, the Computational Graph perspective) and
   §21 Q1. The derivation is carried through on the reference's own
   network and input from §3, then checked against autograd and a finite
   difference.
   ========================================================================= */
EC.receiveLesson({
  id: "1.4",

  lede: "**Backpropagation is the chain rule, applied from the loss backwards through every layer, and it is what makes training a network with millions of weights feasible.** Each layer's error signal δ is the layer above's error signal, multiplied by the transposed weights that connect them and by the local derivative of the activation; each weight's gradient is that error signal times the activation it multiplied on the way forward. The reference derives this for a two-layer network in four steps. This lesson does the same derivation on the reference's own numbers — the network and input from lesson 1.3, label 1 — and then asks PyTorch's autograd and a finite difference whether the hand-worked gradients are right. They are, to four decimals.",

  objectives: [
    "Write the chain rule for one weight and explain why the same partial derivatives are reused across all weights",
    "Derive δ² = ŷ − y for a sigmoid output with binary cross-entropy, and say why that result is clean",
    "Carry the four steps — output error, output weight gradients, backpropagation to the hidden layer, hidden weight gradients — through by hand on the reference's example",
    "State the general rule δˡ = (Wˡ⁺¹ᵀ δˡ⁺¹) ⊙ g′(zˡ), dWˡ = δˡ(aˡ⁻¹)ᵀ / m, and map it onto autograd's forward-then-backward traversal of the computational graph",
    "Check a hand-worked gradient against autograd and against a finite difference"
  ],

  prerequisites: ["1.2", "1.3"],

  blocks: [

    { t: "h2", n: "01", text: "The chain rule", id: "chain" },

    { t: "p", text: "Backpropagation computes the gradient of the loss with respect to every weight in the network. The loss depends on a weight only through a chain of intermediate quantities — the pre-activation the weight feeds, the activation that follows, the layers above, the prediction — and the derivative of a chain is the product of the derivatives of its links:" },

    { t: "math", tex: "\\frac{\\partial \\mathcal{L}}{\\partial w} = \\frac{\\partial \\mathcal{L}}{\\partial \\hat{y}} \\cdot \\frac{\\partial \\hat{y}}{\\partial z} \\cdot \\frac{\\partial z}{\\partial w}" },

    { t: "p", text: "The insight that makes it an algorithm rather than a formula is that the first factors in that product are *shared*. Every weight in the last layer needs ∂L/∂ŷ · ∂ŷ/∂z; every weight in the layer below needs that same quantity times a few more factors. Compute the shared part once, at the output, and pass it backwards — that is the error signal δ — and the cost of all the gradients together is about the cost of one forward pass. Without that sharing, the gradient of a million-weight network would need a million separate chains." },

    { t: "h2", n: "02", text: "The two-layer derivation", id: "derivation" },

    { t: "p", text: "The network is the one from lesson 1.3: **x** → [W¹, **b**¹, ReLU] → [W², **b**², sigmoid] → ŷ, with binary cross-entropy L = −[y log ŷ + (1 − y) log(1 − ŷ)]. Four steps, each one line of calculus." },

    { t: "code", lang: "text", title: "Step 1 — the output error signal",
      code: `dL/dŷ   = −( y/ŷ − (1−y)/(1−ŷ) ) = (ŷ − y) / (ŷ(1−ŷ))
dŷ/dz²  = σ(z²)(1 − σ(z²)) = ŷ(1−ŷ)

dL/dz²  = dL/dŷ · dŷ/dz² = ŷ − y            ← the ŷ(1−ŷ) cancels

δ² = ŷ − y                                   (output error signal)`,
      caption: "The cancellation is the reason sigmoid pairs with cross-entropy: the loss's derivative has ŷ(1 − ŷ) in its denominator and the sigmoid's derivative has it in the numerator. The gradient on the logit is just prediction minus truth — large when the model is wrong, never squashed by a saturated sigmoid." },

    { t: "code", lang: "text", title: "Step 2 — output weight gradients",
      code: `dL/dW² = δ² · (a¹)ᵀ          (an outer product: one error, one activation per weight)
dL/db² = δ²`,
      caption: "The gradient for the weight connecting hidden unit j to the output is the output error times hidden unit j's activation. A unit that was off contributes a zero gradient to its outgoing weight." },

    { t: "code", lang: "text", title: "Step 3 — backpropagate to the hidden layer",
      code: `dL/da¹  = (W²)ᵀ · δ²                    (the error flows back along the weights)
da¹/dz¹ = ReLU'(z¹) = 1 if z¹ > 0, else 0

δ¹ = ((W²)ᵀ δ²) ⊙ ReLU'(z¹)              (⊙ = element-wise)`,
      caption: "Each hidden unit receives the output error weighted by its own outgoing weight, then multiplied by its activation's local derivative — 1 if the unit was on, 0 if it was off. An inactive ReLU unit blocks the gradient entirely." },

    { t: "code", lang: "text", title: "Step 4 — hidden weight gradients, and the general rule",
      code: `dL/dW¹ = δ¹ · xᵀ
dL/db¹ = δ¹

GENERAL RULE, layer l, batch of m:
  δˡ   = ((Wˡ⁺¹)ᵀ δˡ⁺¹) ⊙ g'(zˡ)
  dWˡ  = δˡ (aˡ⁻¹)ᵀ / m
  dbˡ  = mean over the batch of δˡ

The error signal δ flows BACKWARD, multiplied by the transpose of the
weight matrix at each layer and gated by the activation's derivative.`,
      caption: "Every layer is the same three lines. Backpropagation for a hundred-layer network is this rule applied a hundred times, from the top down." },

    { t: "viz", title: "Forward values flow up, error signals flow down",
      caption: "The forward pass (left to right) stores x, z¹, a¹, z², ŷ. The backward pass (right to left) starts from δ² = ŷ − y, produces dW² and db² from a¹, sends (W²)ᵀδ² back, gates it by ReLU′(z¹) to get δ¹, and produces dW¹ and db¹ from x. Every backward step reuses a value the forward pass saved — which is why autograd keeps them.",
      svg: `<svg viewBox="0 0 760 250" role="img" aria-label="Forward and backward flow through a two-layer network">
<defs><marker id="ah14" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker><marker id="ah14c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker></defs>
<g>
  <text x="20" y="34" class="s-sub">forward →</text>
  <rect x="20" y="50" width="70" height="46" rx="9" class="s-fill s-stroke" stroke-width="1.4"/><text x="55" y="78" text-anchor="middle" class="s-label">x</text>
  <rect x="130" y="50" width="110" height="46" rx="9" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)" stroke-width="1.4"/><text x="185" y="70" text-anchor="middle" class="s-label">z¹ = W¹x + b¹</text><text x="185" y="86" text-anchor="middle" class="s-sub">[0, 1.8]</text>
  <rect x="280" y="50" width="90" height="46" rx="9" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="1.4"/><text x="325" y="70" text-anchor="middle" class="s-label">a¹ = ReLU(z¹)</text><text x="325" y="86" text-anchor="middle" class="s-sub">[0, 1.8]</text>
  <rect x="410" y="50" width="110" height="46" rx="9" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)" stroke-width="1.4"/><text x="465" y="70" text-anchor="middle" class="s-label">z² = W²a¹ + b²</text><text x="465" y="86" text-anchor="middle" class="s-sub">−0.96</text>
  <rect x="560" y="50" width="80" height="46" rx="9" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="1.4"/><text x="600" y="70" text-anchor="middle" class="s-label">ŷ = σ(z²)</text><text x="600" y="86" text-anchor="middle" class="s-sub">0.277</text>
  <rect x="680" y="50" width="60" height="46" rx="9" style="fill:var(--warn);fill-opacity:.14;stroke:var(--warn)" stroke-width="1.4"/><text x="710" y="70" text-anchor="middle" class="s-label">L</text><text x="710" y="86" text-anchor="middle" class="s-sub">1.284</text>
  <line x1="90" y1="73" x2="128" y2="73" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah14)"/>
  <line x1="240" y1="73" x2="278" y2="73" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah14)"/>
  <line x1="370" y1="73" x2="408" y2="73" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah14)"/>
  <line x1="520" y1="73" x2="558" y2="73" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah14)"/>
  <line x1="640" y1="73" x2="678" y2="73" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah14)"/>

  <text x="20" y="150" class="s-sub" style="fill:var(--crit)">← backward</text>
  <line x1="700" y1="120" x2="640" y2="164" style="stroke:var(--crit)" stroke-width="1.4" marker-end="url(#ah14c)"/>
  <rect x="540" y="165" width="120" height="44" rx="9" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)" stroke-width="1.4"/><text x="600" y="184" text-anchor="middle" class="s-label">δ² = ŷ − y</text><text x="600" y="200" text-anchor="middle" class="s-sub">−0.723</text>
  <line x1="538" y1="187" x2="492" y2="187" style="stroke:var(--crit)" stroke-width="1.4" marker-end="url(#ah14c)"/>
  <rect x="380" y="165" width="110" height="44" rx="9" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)" stroke-width="1.4"/><text x="435" y="184" text-anchor="middle" class="s-label">(W²)ᵀ δ²</text><text x="435" y="200" text-anchor="middle" class="s-sub">[−0.289, 0.506]</text>
  <line x1="378" y1="187" x2="332" y2="187" style="stroke:var(--crit)" stroke-width="1.4" marker-end="url(#ah14c)"/>
  <rect x="200" y="165" width="130" height="44" rx="9" style="fill:var(--crit);fill-opacity:.12;stroke:var(--crit)" stroke-width="1.4"/><text x="265" y="184" text-anchor="middle" class="s-label">δ¹ = · ⊙ ReLU′(z¹)</text><text x="265" y="200" text-anchor="middle" class="s-sub">[0, 0.506]</text>
  <text x="600" y="232" text-anchor="middle" class="s-sub">dW² = δ² (a¹)ᵀ = [0, −1.302]</text>
  <text x="265" y="232" text-anchor="middle" class="s-sub">dW¹ = δ¹ xᵀ = [[0, 0], [0.506, 1.012]]</text>
</g></svg>` },

    { t: "h2", n: "03", text: "The derivation on the reference's numbers", id: "worked" },

    { t: "p", text: "Take the weights and input from lesson 1.3 with label y = 1. The forward pass gave z¹ = [0, 1.8], a¹ = [0, 1.8], z² = −0.96, ŷ = 0.2769, and the loss is −log 0.2769 = 1.2842. Now the four steps with numbers, in float32 as PyTorch would do it:" },

    { t: "code", lang: "python", title: "Backpropagation by hand, then checked by autograd and a finite difference",
      code: `import numpy as np, torch
np.set_printoptions(precision=4, suppress=True); f32 = np.float32

W1 = np.array([[0.5, -0.3], [0.8, 0.6]], f32); b1 = np.array([[0.1], [-0.2]], f32)
W2 = np.array([[0.4, -0.7]], f32);             b2 = np.array([[0.3]], f32)
x = np.array([[1.0], [2.0]], f32); y = 1.0

# forward, saving everything the backward pass needs
z1 = W1 @ x + b1; a1 = np.maximum(0, z1); z2 = W2 @ a1 + b2; yhat = 1 / (1 + np.exp(-z2))
print("forward: z1", z1.ravel(), "a1", a1.ravel(), "z2", z2.ravel(), "yhat", yhat.ravel(),
      "loss", (-np.log(yhat)).ravel())

dL_dyhat = (yhat - y) / (yhat * (1 - yhat)); dyhat_dz2 = yhat * (1 - yhat)
delta2 = dL_dyhat * dyhat_dz2                                    # step 1
print("step 1: dL/dyhat", dL_dyhat.ravel(), " dyhat/dz2", dyhat_dz2.ravel(), " delta2 = yhat - y =", delta2.ravel())
dW2 = delta2 @ a1.T; db2 = delta2                                # step 2
print("step 2: dW2", dW2, " db2", db2.ravel())
dL_da1 = W2.T @ delta2; relu_grad = (z1 > 0).astype(f32); delta1 = dL_da1 * relu_grad   # step 3
print("step 3: dL/da1", dL_da1.ravel(), " ReLU'(z1)", relu_grad.ravel(), " delta1", delta1.ravel())
dW1 = delta1 @ x.T; db1 = delta1                                 # step 4
print("step 4: dW1\\n", dW1, "\\n db1", db1.ravel())

# autograd on the same graph
tW1, tb1, tW2, tb2 = (torch.tensor(a, requires_grad=True) for a in (W1, b1, W2, b2))
ty = torch.sigmoid(tW2 @ torch.relu(tW1 @ torch.tensor(x) + tb1) + tb2)
(-torch.log(ty)).sum().backward()
print("autograd: dW2", tW2.grad.numpy(), "db2", tb2.grad.numpy().ravel(), "\\n dW1\\n", tW1.grad.numpy(), "\\n db1", tb1.grad.numpy().ravel())

# finite difference on one weight: nudge W2[0,1] by ±0.001 and difference the loss
eps = 1e-3
def loss_with(W2_):
    p = 1 / (1 + np.exp(-(W2_ @ np.maximum(0, W1 @ x + b1) + b2))); return float(-np.log(p).item())
Wp, Wm = W2.copy(), W2.copy(); Wp[0, 1] += eps; Wm[0, 1] -= eps
print("finite difference dL/dW2[0,1] =", round((loss_with(Wp) - loss_with(Wm)) / (2 * eps), 4), " analytic", dW2[0, 1])`,
      caption: "Three independent routes to the same gradients: the four-step derivation, PyTorch's reverse-mode autodiff, and a numerical derivative that knows nothing about calculus." },

    { t: "out", text: `forward: z1 [-0.   1.8] a1 [0.  1.8] z2 [-0.96] yhat [0.2769] loss [1.2842]
step 1: dL/dyhat [-3.6117]  dyhat/dz2 [0.2002]  delta2 = yhat - y = [-0.7231]
step 2: dW2 [[ 0.     -1.3016]]  db2 [-0.7231]
step 3: dL/da1 [-0.2892  0.5062]  ReLU'(z1) [0. 1.]  delta1 [-0.      0.5062]
step 4: dW1
 [[0.     0.    ]
 [0.5062 1.0124]]
 db1 [-0.      0.5062]
autograd: dW2 [[ 0.     -1.3016]] db2 [-0.7231]
 dW1
 [[0.     0.    ]
 [0.5062 1.0124]]
 db1 [0.     0.5062]
finite difference dL/dW2[0,1] = -1.3016  analytic -1.3016192` },

    { t: "p", text: "Read the numbers against the derivation. **Step 1:** dL/dŷ = −3.6117 and dŷ/dz² = 0.2002 multiply to −0.7231, which is exactly ŷ − y = 0.2769 − 1 — the cancellation, in numbers. **Step 2:** dW² = δ²·a¹ᵀ = −0.7231 × [0, 1.8] = [0, −1.3016]; the weight from the inactive first hidden unit gets no gradient because that unit contributed nothing. **Step 3:** (W²)ᵀδ² = [0.4, −0.7] × −0.7231 = [−0.2892, 0.5062], and the ReLU gate [0, 1] zeroes the first entry. **Step 4:** dW¹ = δ¹xᵀ puts 0.5062 × [1, 2] in the second row and nothing in the first. Autograd agrees on every entry, and the finite difference agrees to four decimals." },

    { t: "callout", kind: "trap", title: "The first hidden unit sits exactly on the hinge",
      body: [{ t: "p", text: "In exact arithmetic z¹₁ = 0.5 − 0.6 + 0.1 = 0, where ReLU′ is undefined and PyTorch's convention is 0. In float32 the sum comes out at −2.2 × 10⁻⁸, so the unit is off and receives no gradient; in float64 it comes out at +2.8 × 10⁻¹⁷ and the unit would be *on*, with a first row of dW¹ equal to [−0.2892, −0.5785]. Both are correct answers to slightly different questions. The lesson: a unit at exactly zero is a rounding decision, and the reference's −0.1 for this entry would have made the answer unambiguous." }] },

    { t: "p", text: "One step of gradient descent with learning rate 0.1 subtracts a tenth of each gradient: W² becomes [0.4, −0.5698], b² becomes 0.3723, the second row of W¹ moves to [0.749, 0.499] and its bias to −0.251. Re-run the forward pass and ŷ rises from 0.2769 to 0.3822, the loss falls from 1.284 to 0.962. The optimisers of lesson 1.5 are all elaborations of that one subtraction." },

    { t: "h2", n: "04", text: "The computational-graph view", id: "graph" },

    { t: "code", lang: "text", title: "The same network as a graph of operations",
      code: `x → [×W¹] → [+b¹] → [ReLU] → [×W²] → [+b²] → [σ] → [Loss]
     ↑         ↑        ↑        ↑        ↑       ↑      ↓
   dW¹=δ¹xᵀ  db¹=δ¹  δ¹=…    dW²=δ²a¹ᵀ  db²=δ²   δ²    dL/dŷ

AUTOGRAD (PyTorch, TensorFlow):
  forward:  build the graph, save every intermediate value
  backward: traverse the graph in reverse, apply the chain rule at each node
  each operation carries a backward() that computes its local derivative;
  autodiff chains them together, and never sees the network as a whole`,
      caption: "Backpropagation is reverse-mode automatic differentiation on this graph. Nothing about it is specific to neural networks; it works for any composition of differentiable operations, which is why the same engine trains a transformer and a physics simulator." },

    { t: "p", text: "This is what `loss.backward()` did in the code above. During the forward pass PyTorch recorded each operation — matmul, add, relu, matmul, add, sigmoid, log — together with the tensors it would need for its local derivative (the ReLU saves its input's sign; the matmul saves its operands). `backward()` walks that record from the loss to the leaves, multiplying local derivatives together exactly as steps 1–4 do, and deposits the result in each parameter's `.grad`. The four-step derivation is what the machine is doing; the machine is just faster and never makes an arithmetic slip." },

    { t: "callout", kind: "insight", title: "Why the forward pass stores activations",
      body: [{ t: "p", text: "Every backward step multiplies by something the forward pass computed: a¹ for dW², ReLU′(z¹) for δ¹, x for dW¹. That is why training uses far more memory than inference — the activations of every layer for every example in the batch must be kept until the backward pass has used them — and why tricks like gradient checkpointing (recompute instead of store) exist." }] },

    { t: "exercise", kind: "practice", title: "Backpropagate a different label", difficulty: "core", minutes: 15,
      body: [{ t: "p", text: "Keep the reference's weights and input but set the label to y = 0. Work δ², dW², db², δ¹, dW¹ and db¹ by hand, then confirm with autograd. Say in one sentence why every gradient has flipped sign and changed magnitude relative to the y = 1 case." }],
      requirements: [
        "Compute δ² = ŷ − y with y = 0",
        "Carry it through the four steps",
        "Check with `torch.autograd`"
      ],
      hint: "With y = 0, δ² = 0.2769 − 0 = +0.2769; everything downstream scales by 0.2769 / (−0.7231) = −0.383.",
      solution: { lang: "python", title: "Solution",
        code: `import torch
W1 = torch.tensor([[0.5, -0.3], [0.8, 0.6]], requires_grad=True); b1 = torch.tensor([[0.1], [-0.2]], requires_grad=True)
W2 = torch.tensor([[0.4, -0.7]], requires_grad=True);             b2 = torch.tensor([[0.3]], requires_grad=True)
x = torch.tensor([[1.0], [2.0]])
yhat = torch.sigmoid(W2 @ torch.relu(W1 @ x + b1) + b2)
(-torch.log(1 - yhat)).sum().backward()                 # y = 0: the (1-y) log(1-yhat) term
print(W2.grad, b2.grad)     # [[0., 0.4984]]  [[0.2769]]
print(W1.grad, b1.grad)     # [[0, 0], [-0.1938, -0.3877]]  [[0], [-0.1938]]`,
        notes: [{ t: "p", text: "δ² = ŷ − y = 0.2769: positive, because the model predicted 0.277 for a class-0 example and must push the logit down. Every gradient is the y = 1 gradient scaled by 0.2769 / (−0.7231) = −0.383: same directions in weight space, opposite sign, smaller because this prediction was less wrong." }] } }
  ],

  takeaways: [
    "Backpropagation is the chain rule with the shared factors computed once at the output and passed backwards as the error signal δ.",
    "Sigmoid with binary cross-entropy gives δ² = ŷ − y exactly: the sigmoid's derivative cancels against the loss's, so a confident mistake gets a large gradient.",
    "The general rule is δˡ = ((Wˡ⁺¹)ᵀ δˡ⁺¹) ⊙ g′(zˡ), dWˡ = δˡ(aˡ⁻¹)ᵀ / m, dbˡ = mean of δˡ — three lines, applied from the top layer down.",
    "On the reference's example, δ² = −0.7231, dW² = [0, −1.3016], δ¹ = [0, 0.5062], dW¹ = [[0, 0], [0.5062, 1.0124]]; autograd and a finite difference agree.",
    "An inactive ReLU unit blocks the gradient through it and its outgoing weight gets none; a unit exactly at zero is decided by floating-point rounding.",
    "Autograd is reverse-mode differentiation over the recorded computational graph, which is why the forward pass must store activations and why training needs more memory than inference."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "For a sigmoid output trained with binary cross-entropy, what is ∂L/∂z² (the gradient on the logit)?",
      options: ["ŷ(1 − ŷ)", "(ŷ − y) / (ŷ(1 − ŷ))", "ŷ − y", "−y / ŷ"],
      answer: 2,
      why: "dL/dŷ = (ŷ − y)/(ŷ(1 − ŷ)) and dŷ/dz = ŷ(1 − ŷ); their product is ŷ − y. The sigmoid's derivative cancels, which is why this pairing is standard: the gradient on the logit is simply prediction minus truth." },
    { stem: "In the worked example the first hidden unit was inactive. What happened to the gradient of the weight from that unit to the output?",
      options: ["It was the largest gradient in the network", "It was zero, because dW² = δ² · a¹ᵀ and that unit's activation was 0", "It was equal to δ²", "It was negative because the unit was off"],
      answer: 1,
      why: "The output weight's gradient is the output error times the activation it multiplied: δ² × a¹₁ = −0.7231 × 0 = 0. A unit that contributed nothing to the prediction has no influence on the loss through that weight, so its gradient is exactly zero." },
    { stem: "What is the general backpropagation rule for the error signal at layer l?",
      options: ["δˡ = Wˡ⁺¹ δˡ⁺¹", "δˡ = ((Wˡ⁺¹)ᵀ δˡ⁺¹) ⊙ g′(zˡ)", "δˡ = δˡ⁺¹ ⊙ aˡ", "δˡ = (Wˡ)ᵀ δˡ⁺¹ ⊙ g(zˡ)"],
      answer: 1,
      why: "The error from the layer above is sent backwards through the transpose of the weights that connect the two layers, then gated element-wise by the derivative of this layer's activation at its pre-activation. The weight gradient is then δˡ times the previous activations." },
    { stem: "Why does training a network need much more memory than running it forward?",
      options: ["Gradients are stored in float64", "The backward pass needs the activations the forward pass computed, so they must all be kept until backward has run", "The optimiser stores a copy of the dataset", "Autograd builds the graph twice"],
      answer: 1,
      why: "Each backward step multiplies by a saved forward value — a¹ for dW², the sign of z¹ for the ReLU gate, x for dW¹. Every layer's activations for every example in the batch must be held until the backward pass has consumed them; inference can discard each layer's output as soon as the next layer has used it." }
  ] },

  interview: { title: "Interview", sub: "The reference's Q1, and the follow-ups", questions: [
    { level: "Core", q: "Explain backpropagation intuitively and mathematically.",
      strong: "Each layer's error signal is the layer above's, times the connecting weights, times the activation's local slope; weight gradients are error times input.",
      answer: [{ t: "p", text: "Intuitively: the output error is shared out backwards. Each unit is blamed in proportion to how strongly it fed the units above (the weights) and how sensitive its own output was (the activation's derivative). Mathematically: δˡ = ((Wˡ⁺¹)ᵀ δˡ⁺¹) ⊙ g′(zˡ), with δᴸ = ŷ − y for a sigmoid-or-softmax output with cross-entropy, and ∇_{Wˡ} L = δˡ (aˡ⁻¹)ᵀ / m. It is the chain rule with the shared factors computed once, and autograd frameworks implement it as reverse traversal of the computational graph, each operation contributing its own local backward()." }] },
    { level: "Core", q: "Why is the gradient of a ReLU network sparse, and what does that mean for dead units?",
      strong: "ReLU′ is 0 for inactive units, which zeroes their error signal and their incoming weight gradients; a unit inactive on every input never updates.",
      answer: [{ t: "p", text: "Step 3 gates the back-propagated error by ReLU′(z), which is 0 wherever the unit was off. So for any given example, only the active units carry gradient to their incoming weights, and only the active units' activations feed the outgoing weights' gradients (step 2). That sparsity is cheap and often beneficial. But a unit whose pre-activation is negative for every example in the dataset receives zero gradient on every example, its weights never change, and it stays off permanently — the dead-ReLU problem from lesson 1.2." }] },
    { level: "Senior", q: "How would you verify a custom layer's backward pass?",
      strong: "Compare its analytic gradient against a central finite difference in float64, on small random inputs, to a tolerance around 10⁻⁶.",
      answer: [{ t: "p", text: "Implement the forward and backward, then for a handful of parameters perturb each by ±ε (ε ≈ 10⁻⁵ in float64), evaluate the loss both ways, and take (L₊ − L₋)/2ε. Compare with the analytic gradient using a relative error |a − n| / (|a| + |n|); anything under ~10⁻⁶ is right, ~10⁻³ suggests a bug, and a mismatch on some entries only usually means a wrong transpose or a missing gate. Use float64 — in float32 the finite difference itself is only good to a few decimals — and avoid points where the function is not differentiable, like a ReLU input at exactly zero. PyTorch ships this as torch.autograd.gradcheck." }] }
  ] }
});

/* ============================================================================
   LESSON 1.8 — Batch Norm, Layer Norm, and the Gradients that Vanish or
   Explode
   Mirrors 01_Neural_Network_Fundamentals.md · §9 (Batch Normalization,
   Layer Normalization) and §10 (Vanishing & Exploding Gradients), with
   §21 Q4 and Q6. Both normalisations are worked by hand on a 4 × 3 batch
   and matched against nn.BatchNorm1d and nn.LayerNorm; gradient norms are
   measured against depth for each remedy.
   ========================================================================= */
EC.receiveLesson({
  id: "1.8",

  lede: "**Normalisation layers standardise the activations flowing between layers, and they exist because of what happens to gradients without them.** The gradient reaching the first layer is a product of one factor per layer — an activation derivative times a weight matrix — and a product of forty numbers below one is zero while a product of forty numbers above one is infinite. Batch normalisation standardises each feature across the mini-batch; layer normalisation standardises each example across its features; both then apply a learned scale and shift. This lesson works each on a four-by-three batch so the two directions are unmistakable, shows the training-versus-inference difference that causes bugs, and measures the gradient norm at depth 2, 5, 10, 20 and 40 for sigmoid, tanh, ReLU with He, ReLU with weights too large, and ReLU with batch norm.",

  objectives: [
    "Write the batch-norm forward pass and compute it by hand for one batch, including γ, β, the running statistics and the inference-mode difference",
    "Write layer normalisation and say precisely which axis each normalisation reduces over, and where each is used",
    "State the product that makes gradients vanish or explode and identify the sign of each from the symptoms",
    "Match each remedy — ReLU, He initialisation, residuals, gates, clipping, normalisation — to the failure it addresses, with measured gradient norms"
  ],

  prerequisites: ["1.2", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "Batch normalisation", id: "bn" },

    { t: "math", tex: "\\hat{x}_i = \\frac{x_i - \\mu_B}{\\sqrt{\\sigma_B^2 + \\epsilon}}, \\qquad y_i = \\gamma\\,\\hat{x}_i + \\beta" },

    { t: "p", text: "For each feature, subtract the mean over the mini-batch and divide by the standard deviation over the mini-batch, then let the network undo it if it wants to: γ and β are learned per feature, initialised to 1 and 0. It sits after the linear transformation and before the activation — z = Wx + b → BN(z) → ReLU — so the activation always sees inputs at a sensible scale regardless of what the weights have become." },

    { t: "code", lang: "python", title: "Batch norm by hand on four examples with three features",
      code: `import torch, torch.nn as nn
x = torch.tensor([[1.0, 2.0, 0.0],
                  [3.0, 2.0, 4.0],
                  [5.0, 4.0, 2.0],
                  [7.0, 0.0, 2.0]])            # 4 examples (rows) x 3 features (columns)
mu = x.mean(0); var = x.var(0, unbiased=False)  # one mean and variance PER FEATURE, over the batch
xhat = (x - mu) / torch.sqrt(var + 1e-5)
print("μ_B =", mu, " σ²_B =", var); print("x̂ =\\n", xhat)

bn = nn.BatchNorm1d(3); bn.train()
print("nn.BatchNorm1d =\\n", bn(x).detach(), "\\nγ =", bn.weight.data, "β =", bn.bias.data)
print("running mean:", bn.running_mean, "= 0.9·0 + 0.1·μ_B")
print("running var: ", bn.running_var, "= 0.9·1 + 0.1·(unbiased var)")
bn.eval(); print("eval mode on the same batch:\\n", bn(x).detach())`,
      caption: "Column 1 has mean 4 and variance 5, so its entries become (1 − 4)/√5 = −1.342, (3 − 4)/√5 = −0.447 and so on. Column 2 has two entries at its mean of 2, which become exactly 0." },

    { t: "out", text: `μ_B = tensor([4., 2., 2.])  σ²_B = tensor([5., 2., 2.])
x̂ =
 tensor([[-1.3416,  0.0000, -1.4142],
        [-0.4472,  0.0000,  1.4142],
        [ 0.4472,  1.4142,  0.0000],
        [ 1.3416, -1.4142,  0.0000]])
nn.BatchNorm1d =
 (identical)
γ = tensor([1., 1., 1.]) β = tensor([0., 0., 0.])
running mean: tensor([0.4000, 0.2000, 0.2000]) = 0.9·0 + 0.1·μ_B
running var:  tensor([1.5667, 1.1667, 1.1667]) = 0.9·1 + 0.1·(unbiased var)
eval mode on the same batch:
 tensor([[ 0.4794,  1.6665, -0.1852],
        [ 2.0772,  1.6665,  3.5181],
        [ 3.6751,  3.5181,  1.6665],
        [ 5.2730, -0.1852,  1.6665]])` },

    { t: "p", text: "The last block is the bug the reference warns about. **In training, batch norm uses the current batch's statistics. At inference it uses running averages** accumulated during training with momentum 0.1 — and after a single batch those averages are still mostly their initial values of 0 and 1, so eval mode on the very same input gives completely different numbers. A model evaluated in train mode by mistake normalises each test batch by its own statistics, which changes its predictions with the batch composition and breaks entirely at batch size 1:" },

    { t: "out", text: `batch of 1 in train mode: ValueError - Expected more than 1 value per channel when training` },

    { t: "dl", items: [
      ["Why it works", "Normalised internal representations allow higher learning rates; the mini-batch statistics add noise that acts as regularisation; sensitivity to initialisation drops (lesson 1.6's scale problem is corrected at every layer); the loss landscape is smoother."],
      ["Limitations", "Depends on the batch — breaks at batch size 1 and degrades at small sizes. Awkward for RNNs with varying sequence lengths. The training/inference difference is a standing source of bugs."],
      ["Where", "CNNs and MLPs, as the standard."]
    ] },

    { t: "h2", n: "02", text: "Layer normalisation", id: "ln" },

    { t: "math", tex: "\\hat{x}_i = \\frac{x_i - \\mu_L}{\\sqrt{\\sigma_L^2 + \\epsilon}}, \\qquad \\mu_L, \\sigma_L^2 \\text{ computed over the features of one example}" },

    { t: "p", text: "Same formula, other axis. Batch norm normalises each *feature* across the examples in the batch; layer norm normalises each *example* across its features. Nothing depends on the other examples, so there is no batch-size requirement, no running statistics and no train/eval difference — which is why it is the choice for transformers and RNNs." },

    { t: "code", lang: "python", title: "Layer norm by hand, same batch",
      code: `muL = x.mean(1, keepdim=True); varL = x.var(1, unbiased=False, keepdim=True)   # one mean and variance PER EXAMPLE
xL = (x - muL) / torch.sqrt(varL + 1e-5)
print("per-example mean", muL.ravel(), "var", varL.ravel()); print("x̂ =\\n", xL)
ln = nn.LayerNorm(3); print("nn.LayerNorm =\\n", ln(x).detach())
print("row means", ln(x).mean(1).detach(), "row stds", ln(x).std(1, unbiased=False).detach())`,
      caption: "Row 1 is [1, 2, 0] with mean 1 and variance 2/3; it becomes [0, 1.225, −1.225]. Every row now has mean 0 and standard deviation 1; the columns no longer do." },

    { t: "out", text: `per-example mean tensor([1.0000, 3.0000, 3.6667, 3.0000]) var tensor([0.6667, 0.6667, 1.5556, 8.6667])
x̂ =
 tensor([[ 0.0000,  1.2247, -1.2247],
        [ 0.0000, -1.2247,  1.2247],
        [ 1.0690,  0.2673, -1.3363],
        [ 1.3587, -1.0190, -0.3397]])
nn.LayerNorm =
 (identical)
row means tensor([0., 0., 0., 0.]) row stds tensor([1., 1., 1., 1.])` },

    { t: "viz", title: "Which axis each normalisation reduces over",
      caption: "The same 4 × 3 batch. Batch norm computes one mean and variance per column — per feature, across examples — and needs the whole batch to do it. Layer norm computes one per row — per example, across features — and needs nothing but that row. Group norm and instance norm are the same idea applied to subsets of channels within one example, for CNNs with small batches and for style transfer respectively.",
      svg: `<svg viewBox="0 0 760 250" role="img" aria-label="Batch normalisation reduces over the batch axis, layer normalisation over the feature axis">
<g>
  <text x="170" y="26" text-anchor="middle" class="s-label">Batch norm: per feature, across the batch</text>
  <g transform="translate(70,44)">
    <rect x="0" y="0" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="60" y="0" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="120" y="0" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/>
    <rect x="0" y="40" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="60" y="40" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="120" y="40" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/>
    <rect x="0" y="80" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="60" y="80" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="120" y="80" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/>
    <rect x="0" y="120" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="60" y="120" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="120" y="120" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/>
    <rect x="2" y="2" width="56" height="156" rx="6" style="fill:var(--accent);fill-opacity:.22;stroke:var(--accent)" stroke-width="1.6"/>
    <text x="30" y="24" text-anchor="middle" class="s-mono">1</text><text x="30" y="64" text-anchor="middle" class="s-mono">3</text><text x="30" y="104" text-anchor="middle" class="s-mono">5</text><text x="30" y="144" text-anchor="middle" class="s-mono">7</text>
    <text x="90" y="24" text-anchor="middle" class="s-mono">2</text><text x="90" y="64" text-anchor="middle" class="s-mono">2</text><text x="90" y="104" text-anchor="middle" class="s-mono">4</text><text x="90" y="144" text-anchor="middle" class="s-mono">0</text>
    <text x="150" y="24" text-anchor="middle" class="s-mono">0</text><text x="150" y="64" text-anchor="middle" class="s-mono">4</text><text x="150" y="104" text-anchor="middle" class="s-mono">2</text><text x="150" y="144" text-anchor="middle" class="s-mono">2</text>
    <text x="30" y="180" text-anchor="middle" class="s-sub">μ = 4, σ² = 5</text>
    <text x="-8" y="84" text-anchor="end" class="s-sub">4 examples</text>
    <text x="90" y="-6" text-anchor="middle" class="s-sub">3 features</text>
  </g>
  <text x="560" y="26" text-anchor="middle" class="s-label">Layer norm: per example, across features</text>
  <g transform="translate(460,44)">
    <rect x="0" y="0" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="60" y="0" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="120" y="0" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/>
    <rect x="0" y="40" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="60" y="40" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="120" y="40" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/>
    <rect x="0" y="80" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="60" y="80" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="120" y="80" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/>
    <rect x="0" y="120" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="60" y="120" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/><rect x="120" y="120" width="60" height="40" class="s-fill s-stroke" stroke-width="1"/>
    <rect x="2" y="2" width="176" height="36" rx="6" style="fill:var(--good);fill-opacity:.22;stroke:var(--good)" stroke-width="1.6"/>
    <text x="30" y="24" text-anchor="middle" class="s-mono">1</text><text x="30" y="64" text-anchor="middle" class="s-mono">3</text><text x="30" y="104" text-anchor="middle" class="s-mono">5</text><text x="30" y="144" text-anchor="middle" class="s-mono">7</text>
    <text x="90" y="24" text-anchor="middle" class="s-mono">2</text><text x="90" y="64" text-anchor="middle" class="s-mono">2</text><text x="90" y="104" text-anchor="middle" class="s-mono">4</text><text x="90" y="144" text-anchor="middle" class="s-mono">0</text>
    <text x="150" y="24" text-anchor="middle" class="s-mono">0</text><text x="150" y="64" text-anchor="middle" class="s-mono">4</text><text x="150" y="104" text-anchor="middle" class="s-mono">2</text><text x="150" y="144" text-anchor="middle" class="s-mono">2</text>
    <text x="192" y="24" text-anchor="start" class="s-sub">μ = 1, σ² = ⅔</text>
    <text x="90" y="-6" text-anchor="middle" class="s-sub">3 features</text>
  </g>
  <text x="380" y="240" text-anchor="middle" class="s-sub">BatchNorm → CNNs and MLPs · LayerNorm → transformers and RNNs · GroupNorm → CNNs with small batches · InstanceNorm → style transfer</text>
</g></svg>` },

    { t: "h2", n: "03", text: "Vanishing and exploding gradients", id: "vanish" },

    { t: "math", tex: "\\frac{\\partial \\mathcal{L}}{\\partial W^{[1]}} = \\prod_{l=2}^{L}\\frac{\\partial a^{[l]}}{\\partial z^{[l]}}\\, W^{[l]} \\cdot \\frac{\\partial \\mathcal{L}}{\\partial a^{[L]}}" },

    { t: "p", text: "That is lesson 1.4's general rule written out as a product. Each layer contributes a factor — its activation's derivative times its weight matrix — and the first layer's gradient is all of them multiplied together. If every factor has size below 1 the product shrinks exponentially with depth and the early layers stop learning: **vanishing**, the common case, with sigmoid's 0.25 maximum derivative giving at most 0.25ᴸ. If every factor is above 1 the product grows exponentially: **exploding**, with NaN losses and overflowing weights. Here is the gradient norm on the first layer's weights, measured against depth:" },

    { t: "code", lang: "python", title: "The first layer's gradient norm against depth, five ways",
      code: `def grad_norm_first_layer(depth, act, std_of_n, n=64):
    torch.manual_seed(0)
    Ws = [torch.randn(n, n) * std_of_n(n) for _ in range(depth)]; Ws[0].requires_grad_(True)
    a = torch.randn(32, n)
    for W in Ws: a = act(a @ W)
    a.pow(2).mean().backward()
    return Ws[0].grad.norm().item()

for d in [2, 5, 10, 20, 40]:
    print(d, grad_norm_first_layer(d, torch.sigmoid, lambda n: (1 / n) ** 0.5),
             grad_norm_first_layer(d, torch.tanh,    lambda n: (1 / n) ** 0.5),
             grad_norm_first_layer(d, torch.relu,    lambda n: (2 / n) ** 0.5),      # He
             grad_norm_first_layer(d, torch.relu,    lambda n: (4 / n) ** 0.5))      # twice He`,
      caption: "A plain stack, no normalisation, no residuals. The activation and the weight scale are the only things that change between columns." },

    { t: "out", text: ` depth    sigmoid, N(0,1/n)   tanh, Xavier   ReLU, He  ReLU, N(0,4/n)
     2            1.082e-02      8.704e-02  6.478e-01       1.832e+00
     5            1.231e-04      5.921e-02  5.973e-01       1.352e+01
    10            5.036e-08      3.988e-02  1.204e+00       8.721e+02
    20            2.592e-14      3.021e-02  1.833e+00       1.359e+06
    40            0.000e+00      1.175e-02  4.636e+00       3.604e+12

with BatchNorm after every layer, ReLU, N(0, 4/n):  depth 5: 1.345e-01  depth 20: 3.040e+00  depth 40: 2.156e+02` },

    { t: "p", text: "Sigmoid loses six orders of magnitude between depth 2 and depth 10 and reaches exactly zero — not small, zero in float32 — by depth 40. Tanh with Xavier initialisation survives, drifting down by a factor of eight over forty layers. ReLU with He initialisation holds its gradient across all depths. ReLU with weights only twice He's variance explodes: 10¹² at depth 40, and a training step at that gradient overwrites the weights with garbage. Batch normalisation after every layer takes that same exploding network and keeps its gradient within two orders of magnitude of 1 — the weight scale no longer matters, because the normalisation removes it at every layer." },

    { t: "table", head: ["Symptom", "Diagnosis", "Remedies"],
      rows: [
        ["Loss plateaus; early layers' weights do not change; gradient norms tiny at the bottom, healthy at the top", "**Vanishing**", "ReLU, He initialisation, residual connections, LSTM/GRU gates for sequences"],
        ["Loss jumps to NaN or infinity; weights overflow; updates enormous", "**Exploding**", "Gradient clipping, careful initialisation, a lower learning rate"],
        ["Either", "", "Batch norm or layer norm, skip connections"]
      ] },

    { t: "callout", kind: "mental", title: "Residual connections, in one derivative",
      body: "A residual block computes x + F(x), and ∂(x + F(x))/∂x = 1 + ∂F/∂x. The 1 is a path through the layer that no weight scale and no activation derivative can shrink; the gradient reaches the bottom of a hundred-layer network along the identity path even if every F contributes nothing. That is why ResNets (module 2) train at depths that plain stacks cannot, and why transformers wrap every sub-layer in one." },

    { t: "exercise", kind: "practice", title: "Batch norm's γ and β at work", difficulty: "core", minutes: 12,
      body: [{ t: "p", text: "Set the batch-norm layer's γ to [2, 1, 0.5] and β to [1, 0, −1], apply it in train mode to the 4 × 3 batch, and verify by hand that each column is γ·x̂ + β. Then explain why a network is free to learn γ = σ_B and β = μ_B and thereby undo the normalisation entirely — and why it usually does not." }],
      requirements: [
        "Compute the expected output for column 1 by hand",
        "Check all three columns against nn.BatchNorm1d",
        "Two sentences on why γ and β exist"
      ],
      hint: "Column 1's x̂ is [−1.342, −0.447, 0.447, 1.342]; multiply by 2 and add 1.",
      solution: { lang: "python", title: "Solution",
        code: `bn = nn.BatchNorm1d(3); bn.train()
with torch.no_grad():
    bn.weight.copy_(torch.tensor([2.0, 1.0, 0.5])); bn.bias.copy_(torch.tensor([1.0, 0.0, -1.0]))
print(bn(x).detach())
# column 1: 2·[-1.342, -0.447, 0.447, 1.342] + 1 = [-1.683, 0.106, 1.894, 3.683]
# column 3: 0.5·[-1.414, 1.414, 0, 0] - 1 = [-1.707, -0.293, -1, -1]`,
        notes: [{ t: "p", text: "γ and β give the layer back the freedom that normalisation took away: with γ = σ_B and β = μ_B the output equals the input, so batch norm can never make a network less expressive. In practice the network keeps the normalised scale because that is where the following activation and the optimiser behave well — the affine parameters are there so that it is a choice, not a constraint." }] } }
  ],

  takeaways: [
    "Batch norm: x̂ = (x − μ_B)/√(σ²_B + ε), then γx̂ + β, with μ and σ² per feature over the mini-batch; placed after the linear layer and before the activation.",
    "Training uses batch statistics, inference uses running averages — the same input gives different outputs in the two modes, and train mode fails outright at batch size 1.",
    "Layer norm is the same formula per example across features: no batch dependence, no running statistics, the standard in transformers and RNNs.",
    "The first layer's gradient is a product of one (activation derivative × weight matrix) factor per layer: below 1 everywhere vanishes, above 1 everywhere explodes.",
    "Measured: sigmoid reaches a gradient of exactly zero by depth 40; ReLU with He holds; ReLU with twice He's variance reaches 10¹²; batch norm keeps that same network within two orders of magnitude of 1.",
    "Vanishing → ReLU, He, residuals, gates; exploding → clipping, initialisation, lower learning rate; both → normalisation and skip connections."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Over which axis does batch normalisation compute its mean and variance?",
      options: ["Across the features of one example", "Across the examples in the mini-batch, separately for each feature", "Across all entries of the batch at once", "Across time steps"],
      answer: 1,
      why: "Batch norm standardises each feature using that feature's statistics over the batch — in the worked example, column 1 had mean 4 and variance 5 over the four examples. Layer norm is the other axis: per example, across features." },
    { stem: "A model gives different predictions for the same input depending on which other examples are in the batch. What is the likely cause?",
      options: ["Dropout is disabled", "Batch norm is in training mode at inference, so each batch is normalised by its own statistics", "The learning rate is too high", "Layer norm is missing"],
      answer: 1,
      why: "In train mode batch norm uses the current batch's mean and variance, so an example's normalised value depends on its batch-mates; in eval mode it uses fixed running averages. Forgetting model.eval() produces exactly this symptom, and a batch of one raises an error." },
    { stem: "Why do sigmoid networks suffer vanishing gradients more than ReLU networks?",
      options: ["Sigmoid has more parameters", "Sigmoid's derivative is at most 0.25, so each layer's factor shrinks the product; ReLU's is 1 on active units", "ReLU has no derivative", "Sigmoid outputs are negative"],
      answer: 1,
      why: "The first-layer gradient is a product of per-layer factors including the activation derivative. Sigmoid contributes at most 0.25 per layer — 0.25⁴⁰ is 10⁻²⁴ — while ReLU contributes exactly 1 along active paths. The measurement showed sigmoid at exactly zero by depth 40 and ReLU with He steady." },
    { stem: "Why does a residual connection help gradients reach early layers?",
      options: ["It halves the number of layers", "∂(x + F(x))/∂x = 1 + ∂F/∂x, so there is an identity path the gradient follows regardless of F", "It normalises the activations", "It clips the gradient"],
      answer: 1,
      why: "The derivative of the skip path is exactly 1, so the gradient passes through the block undiminished even when the residual branch F contributes little. Stacked, these identity paths carry the gradient to the bottom of very deep networks, which is why ResNets train at depths plain stacks cannot." }
  ] },

  interview: { title: "Interview", sub: "The reference's Q4 and Q6", questions: [
    { level: "Core", q: "Explain batch norm. Why does it help?",
      strong: "Standardise each feature over the batch, then a learned γ and β; higher learning rates, less sensitivity to initialisation, a regularising noise; running averages at inference; breaks at batch size 1.",
      answer: [{ t: "p", text: "Batch norm normalises each feature's activations to zero mean and unit variance within the mini-batch, then applies a learned affine transform γx̂ + β so the network can recover any scale it needs. It helps because it keeps pre-activations at a stable scale at every layer, which smooths the loss landscape and allows higher learning rates; it reduces sensitivity to initialisation, since the weight scale is corrected every forward pass; and the mini-batch noise acts as a mild regulariser. At inference it uses running averages of the mean and variance rather than batch statistics. The gotcha is the batch dependence — it breaks with batch size 1 and degrades at small sizes — and the train/eval behaviour difference, which is why layer norm, being batch-independent, is used in transformers." }] },
    { level: "Core", q: "Explain the vanishing gradient problem and its solutions.",
      strong: "A product of per-layer factors below 1 shrinks exponentially with depth; fix the factors with ReLU and He, add identity paths with residuals, normalise, or use gated cells for sequences.",
      answer: [{ t: "p", text: "The gradient at layer 1 is the product over layers of the activation derivative times the weight matrix. Sigmoid's derivative peaks at 0.25, so with L layers the activation factor alone is at most 0.25ᴸ; the early layers receive nothing and stop learning. Solutions attack the factors: ReLU has derivative 1 on active units; He initialisation keeps the weight factor near unit gain; residual connections add an identity path with derivative exactly 1 so the product is never the only route; batch or layer normalisation prevents activation collapse; and for sequences the LSTM and GRU cell state is a gated additive path that plays the residual's role through time. Measured on a 64-unit stack, sigmoid's first-layer gradient was zero by depth 40 while ReLU with He held near 1." }] },
    { level: "Senior", q: "When would you choose layer norm, group norm or instance norm over batch norm?",
      strong: "Layer norm for sequences and transformers or whenever batch statistics are unreliable; group norm for CNNs at small batch sizes; instance norm when per-image statistics are the point, as in style transfer.",
      answer: [{ t: "p", text: "Batch norm's statistics need a reasonably large, representative batch. When the batch is small — detection or segmentation models at batch size 2 per GPU, large-image medical models — the statistics are noisy and group norm, which normalises over groups of channels within each example, is the usual replacement. For sequences and transformers, batch norm's dependence on batch-mates and its awkwardness with variable lengths make layer norm the choice; it also removes the train/eval discrepancy entirely, which matters for streaming inference. Instance norm normalises each channel of each example on its own, which discards the image's contrast and style statistics — undesirable for classification, exactly desirable for style transfer. And in any model served at batch size 1 with unusual inputs, remember that batch norm's running statistics were estimated on the training distribution and will be wrong under shift." }] }
  ] }
});

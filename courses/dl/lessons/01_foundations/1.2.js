/* ============================================================================
   LESSON 1.2 — Activation Functions
   ========================================================================= */
EC.receiveLesson({
  id: "1.2",

  lede: "**The activation function is the only thing that stops a deep network from being one matrix, and its derivative is the number every gradient in the network is multiplied by, once per layer.** Five random 4 × 4 matrices multiplied together differ from a single matrix by 6 × 10⁻⁶; a sigmoid's derivative never exceeds 0.25, and ten of them in a row leave 2 × 10⁻⁸ of the gradient; a ReLU passes the gradient unchanged or kills it entirely, and at a learning rate of 1.0 it killed 70 % of the first layer and all of the third. Every choice on this page is a choice about what happens to the gradient.",

  objectives: [
    "Write sigmoid, tanh, ReLU and its variants, ELU, GELU, Swish and softmax with their derivatives, and check each against autograd",
    "Show with a computed example why a stack of linear layers is one linear layer, and why the non-linearity is therefore the whole point",
    "Explain saturation from the derivative ceilings and read the measured gradient norm through ten layers of each activation",
    "Reproduce the dying-ReLU failure, measure the fraction of dead units, and state what fixes it and what does not",
    "Use softmax and log-softmax stably, and read temperature as a control on the entropy of the output"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "Why a non-linearity at all", id: "why" },

    { t: "p", text: "Compose two linear maps and you get a linear map: W₂(W₁x + b₁) + b₂ = (W₂W₁)x + (W₂b₁ + b₂). By induction, any depth of linear layers is one matrix and one bias, and it can fit exactly what one linear layer can fit. That is a theorem, but it is also a number you can compute:" },

    { t: "code", lang: "python", title: "Five linear layers are one matrix; three linear layers cannot fit x² (executed)",
      code: `Ws = [torch.randn(4, 4) for _ in range(5)];  h = x
for W in Ws: h = W @ h
Wc = Ws[4] @ Ws[3] @ Ws[2] @ Ws[1] @ Ws[0]
(h - Wc @ x).abs().max()                      # 5.7e-06  -- float32 rounding, nothing else

# fit y = x² on [-2, 2], Adam, 2,000 steps
linear regression                  mse = 1.4413
3 linear layers (1-32-32-1)        mse = 1.4413      -- identical: it is linear regression with extra steps
3 layers with ReLU between them    mse = 0.0000
variance of y                          = 1.4413      -- a linear fit removes the mean and nothing else`,
      caption: "The three-layer linear network has 1,153 parameters and the linear regression has 2; they reach the same loss to four decimals because they are the same function class. Put a ReLU between the layers and the loss goes to zero." },

    { t: "p", text: "So the activation is not a detail added to a linear model; it is what makes the second layer worth having. The remaining question is which non-linearity, and that question is answered almost entirely by what the function does to the gradient passing back through it." },

    { t: "h2", n: "02", text: "The functions and their derivatives", id: "functions" },

    { t: "code", lang: "text", title: "Values and derivatives at z = −3, −1, −0.5, 0, 0.5, 1, 3 (autograd)",
      code: `z:                 [-3.    -1.    -0.5    0.     0.5    1.     3.  ]
sigmoid       f:   [0.0474 0.2689 0.3775 0.5    0.6225 0.7311 0.9526]      range (0, 1)
              f':  [0.0452 0.1966 0.235  0.25   0.235  0.1966 0.0452]      max 0.25 at z = 0
tanh          f:   [-0.9951 -0.7616 -0.4621 0.  0.4621 0.7616 0.9951]      range (-1, 1), zero-centred
              f':  [0.0099 0.42   0.7864 1.     0.7864 0.42   0.0099]      max 1 at z = 0
relu          f:   [0.     0.     0.     0.     0.5    1.     3.  ]         max(0, z)
              f':  [0.     0.     0.     0.     1.     1.     1.  ]         0 or 1, nothing between
leaky(0.01)   f:   [-0.03  -0.01  -0.005 0.     0.5    1.     3.  ]
              f':  [0.01   0.01   0.01   0.01   1.     1.     1.  ]         never exactly zero
elu           f:   [-0.9502 -0.6321 -0.3935 0.  0.5    1.     3.  ]         α(e^z − 1) for z < 0
              f':  [0.0498 0.3679 0.6065 1.     1.     1.     1.  ]
gelu          f:   [-0.0041 -0.1587 -0.1543 0.  0.3457 0.8413 2.9959]      z·Φ(z)
              f':  [-0.0119 -0.0833 0.1325 0.5  0.8675 1.0833 1.0119]      slightly negative for z < −0.75
silu/swish    f:   [-0.1423 -0.2689 -0.1888 0.  0.3112 0.7311 2.8577]      z·σ(z)
              f':  [-0.0881 0.0723 0.26   0.5    0.74   0.9277 1.0881]
softplus      f:   [0.0486 0.3133 0.4741 0.6931 0.9741 1.3133 3.0486]      ln(1 + e^z), the smooth ReLU
              f':  [0.0474 0.2689 0.3775 0.5    0.6225 0.7311 0.9526]      = sigmoid(z)`,
      caption: "Read the f′ rows. Sigmoid tops out at 0.25 and is under 0.05 by |z| = 3; tanh reaches 1 but is under 0.01 at |z| = 3; ReLU is exactly 0 or exactly 1; GELU and Swish are smooth ReLUs whose derivative dips slightly negative just left of zero and exceeds 1 just right of it." },

    { t: "dl", items: [
      ["Sigmoid σ(z) = 1/(1 + e⁻ᶻ)", "Output in (0, 1), so it is the right *output* unit for a probability. As a *hidden* unit: not zero-centred (every output positive, so the gradients on the next layer's weights all share a sign) and saturating with derivative ≤ 0.25. Its derivative is σ(1 − σ), cheap to compute from the forward value."],
      ["tanh", "2σ(2z) − 1: a rescaled sigmoid, zero-centred, derivative 1 − tanh², maximum 1. Still saturates; the standard hidden unit of the 1990s and still the gate non-linearity inside LSTMs (module 4)."],
      ["ReLU max(0, z)", "No saturation on the right, derivative exactly 1 there, trivially cheap, sparse activations. The default since AlexNet (2012). Its failure is the left side: derivative exactly 0, and a unit that is off for every input stays off — the dying ReLU."],
      ["Leaky ReLU, PReLU", "max(αz, z) with α = 0.01 (leaky) or learned (PReLU). The left slope is small but non-zero, so a unit on the wrong side of zero still receives a gradient and can come back."],
      ["ELU, SELU", "α(eᶻ − 1) for z < 0: smooth at zero, negative outputs that push the mean activation toward zero. SELU fixes α and a scale so that activations self-normalise in a plain MLP under strict conditions."],
      ["GELU z·Φ(z), Swish z·σ(z)", "Smooth, non-monotonic near zero, derivatives that can exceed 1. GELU is the transformer's feed-forward activation (BERT, GPT); Swish/SiLU appears in EfficientNet and most modern convolutional networks. Neither has a hard zero."],
      ["Softplus ln(1 + eᶻ)", "The smooth ReLU whose derivative is exactly the sigmoid. Used where a strictly positive output is needed (a variance, a rate), rarely as a hidden unit."]
    ] },

    { t: "h2", n: "03", text: "Saturation, measured through ten layers", id: "saturation" },

    { t: "p", text: "Backpropagation (lesson 1.4) multiplies the gradient by f′(z) at every layer it passes through. If f′ is at most 0.25, ten layers leave at most 0.25¹⁰ ≈ 10⁻⁶ of the signal, and that is the *best* case, at z = 0 for every unit. Here is the gradient norm reaching the input of a ten-layer, 64-wide stack at PyTorch's default initialisation, per input example:" },

    { t: "code", lang: "text", title: "‖∂(Σ output)/∂x‖ after 10 layers, width 64 (executed)",
      code: `sigmoid   2.10e-08
tanh      2.09e-02
relu      1.35e-03
gelu      3.30e-05`,
      caption: "Sigmoid loses eight orders of magnitude before the input layer sees anything. tanh and ReLU keep the gradient in a usable range at this depth; lesson 1.6 shows initialisation is what decides the ReLU and GELU numbers, and lesson 1.8 shows what happens at depth thirty." },

    { t: "p", text: "The consequence shows up as a network that does not train at all. The same 64-128-128-128-10 network on the 8 × 8 digits, plain SGD at 0.1 for sixty epochs, three seeds per activation:" },

    { t: "table", head: ["Hidden activation", "Test accuracy (3 seeds)", "First epoch at ≥ 90 %"],
      rows: [
        ["sigmoid", "0.100 ± 0.002", "never — chance for 60 epochs"],
        ["tanh", "0.965 ± 0.003", "9, 9, 10"],
        ["ReLU", "0.948 ± 0.021", "16, 16, 16"],
        ["GELU", "0.935 ± 0.033", "27, 25, 27"],
        ["SiLU / Swish", "0.939 ± 0.022", "33, 34, 32"],
        ["ELU", "0.967 ± 0.003", "9, 9, 9"]
      ] },

    { t: "p", text: "Three sigmoid hidden layers and the network never leaves chance: the gradient arriving at the first layer is too small to move it, and the later layers cannot learn from features that never form. tanh and ELU, whose derivatives reach 1 and whose outputs are zero-centred, are fastest here; ReLU and its smooth relatives are slower on this tiny problem with plain SGD and default initialisation. **Do not read the table as a ranking of activations** — read it as evidence that the derivative ceiling is real and that, at this depth and learning rate, the zero-centred saturating functions had the advantage. On a deep convolutional network with He initialisation and Adam (modules 1.5, 1.6, 3.4), ReLU-family functions are the ones that scale; the point here is that the mechanism is the derivative." },

    { t: "h2", n: "04", text: "The dying ReLU, reproduced", id: "dying" },

    { t: "p", text: "A ReLU unit whose pre-activation is negative for every input in the dataset outputs zero for all of them, and since its derivative is zero on that side, no gradient reaches its weights. It is dead: it will never change, and it contributes nothing. Units die when a large update pushes their bias or weights far negative — which is to say, when the learning rate is too high. The same network, sixty epochs, with the fraction of units in each hidden layer that are off for *every* training example counted at the end:" },

    { t: "code", lang: "text", title: "Dead units per hidden layer against learning rate (executed)",
      code: `lr=0.1  relu        acc=0.970  dead=[0.02, 0.05, 0.05]
lr=0.1  leaky_relu  acc=0.970  dead=[0.02, 0.05, 0.05]        -- "dead" here means off for every input; a leaky unit still has gradient 0.01
lr=0.1  elu         acc=0.970  dead=[0.01, 0.00, 0.00]

lr=0.5  relu        acc=0.980 (min of 3 seeds 0.978)  dead=0.12
lr=0.5  leaky_relu  acc=0.976 (min 0.969)             dead=0.12
lr=0.5  elu         acc=0.391 (min 0.100)             2 of 3 seeds diverged to NaN

lr=0.7  relu        acc=0.934 (min 0.856)             dead=0.32
lr=0.7  leaky_relu  acc=0.967 (min 0.944)             dead=0.33   -- same fraction off, but they can recover
lr=0.7  elu         acc=0.100                          3 of 3 seeds NaN

lr=1.0  relu        acc=0.102  dead=[0.70, 0.84, 1.00]  final loss 2.309   -- ln 10: the network predicts the prior
lr=1.0  leaky_relu  acc=0.100  loss = NaN
lr=1.0  elu         acc=0.100  loss = NaN`,
      caption: "At lr = 1.0 every unit in the third ReLU layer is dead and the loss sits at ln 10 = 2.303, the cross-entropy of a ten-class uniform guess. Leaky ReLU and ELU do not die at that rate — they explode instead, which is the same disease with a different symptom. At lr = 0.7, a third of the units are off in both ReLU and leaky ReLU, but the leaky network scores 0.967 against 0.934 because its off units still receive a gradient and some of them come back." },

    { t: "callout", kind: "warn", title: "How to detect it, and what actually fixes it",
      body: "Detect it by counting: after a few hundred steps, the fraction of hidden units whose activation is zero on an entire batch. A few per cent is normal; tens of per cent is a problem; a loss frozen at ln(classes) is the terminal case. The fix is almost always the learning rate — lr = 1.0 killed the network; lr = 0.5 did not — followed by initialisation (lesson 1.6), then BatchNorm, then a leaky or smooth variant. Switching to leaky ReLU at the same bad learning rate did not save the network above; it produced NaN instead. The activation is the last knob, not the first." },

    { t: "h2", n: "05", text: "Softmax, and the numerics that go wrong", id: "softmax" },

    { t: "p", text: "Softmax turns a vector of scores (logits) into a probability distribution: pᵢ = exp(zᵢ) / Σⱼ exp(zⱼ). It is the output layer for multi-class classification, the attention weights inside a transformer, and the policy in reinforcement learning. Three properties matter:" },

    { t: "code", lang: "python", title: "Softmax properties (executed)",
      code: `softmax([2, 1, 0.1])        = [0.659  0.2424 0.0986]     sums to 1
softmax([2, 1, 0.1] + 100)  = [0.659  0.2424 0.0986]     shift-invariant: only differences between logits matter

temperature T -- softmax(z / T):
  T = 0.5   [0.8638 0.1169 0.0193]      sharper
  T = 1     [0.659  0.2424 0.0986]
  T = 2     [0.5017 0.3043 0.194 ]      flatter
  T = 10    [0.3661 0.3312 0.3027]      approaching uniform

naive  np.exp([1000, 999, 998]) / sum   -> [nan nan nan]           exp(1000) overflows float64
stable np.exp(z - z.max()) / sum        -> [0.6652 0.2447 0.09  ]  shift invariance makes this exact`,
      caption: "Subtracting the maximum logit before exponentiating changes nothing mathematically and prevents overflow; every framework's softmax does it. Log-softmax goes further — log pᵢ = zᵢ − max − log Σ exp(zⱼ − max) — so that a probability that underflows to zero still has a finite log, which is why cross-entropy is always computed from logits and never from a softmax output." },

    { t: "p", text: "Temperature deserves a definition because it returns in distillation (2.5), in text generation (4.6, 5.3) and in contrastive learning (7.2): dividing the logits by T > 1 flattens the distribution and raises its entropy; T < 1 sharpens it toward a one-hot. In the exercise, logits (3, 1, 0, −1) have entropy 0.595 nats at T = 1, 0.000 at T = 0.1 and 1.386 = ln 4 at T = 100 — the maximum for four classes." },

    { t: "h2", n: "06", text: "Choosing", id: "choosing" },

    { t: "table", head: ["Position", "Default", "Why", "When to deviate"],
      rows: [
        ["Hidden layers, MLP or CNN", "ReLU", "Cheap, non-saturating, well understood; with He init and a sane learning rate the dead fraction stays in single digits", "Dead units after fixing the rate → leaky ReLU or ELU; a modern CNN → SiLU; small MLPs with SGD → tanh or ELU trained fastest here"],
        ["Hidden layers, transformer FFN", "GELU", "The choice of BERT and GPT; smooth, and its slight negative region helps optimisation in practice", "SwiGLU and other gated variants in recent language models"],
        ["Recurrent gates", "sigmoid (gates), tanh (candidate)", "Gates must lie in (0, 1) to act as soft switches; the candidate must be bounded — the LSTM derivation in 4.3 depends on both", "Never; the architecture fixes them"],
        ["Binary output", "sigmoid on one logit", "A probability; pair with BCE-with-logits for stability", "—"],
        ["Multi-class output", "softmax on K logits", "A distribution; pair with cross-entropy from logits", "Multi-label → K independent sigmoids"],
        ["Regression output", "none (identity)", "The target is unbounded", "Softplus or exp for a strictly positive quantity; tanh for a target known to lie in (−1, 1)"]
      ] },

    { t: "viz",
      title: "What each activation does to a gradient",
      caption: "The derivative of each function across z. Sigmoid never exceeds 0.25; tanh reaches 1 but collapses beyond |z| ≈ 2; ReLU is 1 or 0; GELU is smooth, dips below zero near −1 and slightly exceeds 1 to the right. The gradient reaching an earlier layer is the product of one such value per layer.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Line chart of the derivatives of sigmoid, tanh, ReLU and GELU against z from minus 4 to 4.">
  <defs>
    <marker id="dl12-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/></marker>
  </defs>
  <line x1="80" y1="230" x2="840" y2="230" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#dl12-ah)"/>
  <line x1="460" y1="270" x2="460" y2="30" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#dl12-ah)"/>
  <g class="s-sub" text-anchor="middle">
    <text x="80" y="290">−4</text><text x="270" y="290">−2</text><text x="460" y="290">0</text><text x="650" y="290">2</text><text x="840" y="290">4</text>
    <text x="440" y="235" text-anchor="end">0</text><text x="440" y="135" text-anchor="end">0.5</text><text x="440" y="45" text-anchor="end">1</text>
  </g>
  <text x="860" y="225" class="s-sub">z</text>
  <text x="470" y="40" class="s-sub">f′(z)</text>
  <!-- sigmoid' : max 0.25 -> y = 230 - 190*0.25 = 182.5 -->
  <path d="M80,226 C270,222 340,190 460,182.5 C580,190 650,222 840,226" fill="none" style="stroke:var(--warn)" stroke-width="2"/>
  <text x="120" y="212" class="s-sub" style="fill:var(--warn)">sigmoid′ ≤ 0.25</text>
  <!-- tanh' : max 1 -->
  <path d="M80,229 C300,228 360,60 460,40 C560,60 620,228 840,229" fill="none" style="stroke:var(--accent)" stroke-width="2"/>
  <text x="335" y="70" class="s-sub" style="fill:var(--accent)">tanh′ ≤ 1</text>
  <!-- relu' : step -->
  <path d="M80,230 L460,230 L460,40 L840,40" fill="none" style="stroke:var(--good)" stroke-width="2"/>
  <text x="700" y="34" class="s-sub" style="fill:var(--good)">ReLU′ = 1</text>
  <text x="200" y="250" class="s-sub" style="fill:var(--good)">ReLU′ = 0 — nothing passes</text>
  <!-- gelu' : ~ -0.1 near -1, 0.5 at 0, ~1.1 near 1.5, 1 beyond -->
  <path d="M80,230 C300,231 330,255 365,248 C420,235 430,135 460,135 C500,135 560,20 620,34 C700,40 760,40 840,40" fill="none" style="stroke:var(--crit)" stroke-width="2" stroke-dasharray="5 3"/>
  <text x="560" y="22" class="s-sub" style="fill:var(--crit)">GELU′ (slightly above 1, below 0 near −1)</text>
</svg>` },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A three-hidden-layer sigmoid MLP stayed at 10 % accuracy for 60 epochs while the same network with tanh reached 96.5 %. What is the mechanism?",
          options: [
            "Sigmoid cannot represent the digits",
            "The sigmoid derivative is at most 0.25 and its outputs are not zero-centred, so the gradient reaching the first layer is orders of magnitude too small to move it — measured at 2 × 10⁻⁸ through ten layers against 2 × 10⁻² for tanh",
            "The learning rate was wrong for sigmoid only",
            "Sigmoid needs more epochs but would reach the same accuracy"
          ],
          answer: 1,
          why: "Both networks have identical capacity; the difference is entirely in how much gradient survives the backward pass. Sigmoid multiplies by ≤ 0.25 per layer and tanh by ≤ 1, and the measured gradient norms differ by six orders of magnitude at depth ten."
        },
        {
          stem: "At lr = 1.0 the ReLU network's loss froze at 2.309 with every unit in the third layer dead. Which fix should you try first?",
          options: [
            "Replace ReLU with leaky ReLU at the same learning rate",
            "Add more layers",
            "Lower the learning rate — lr = 0.5 trained to 0.980 with the same activation; leaky ReLU at lr = 1.0 produced NaN rather than a working network",
            "Increase the batch size to 1"
          ],
          answer: 2,
          why: "Dead units are caused by an update large enough to push pre-activations negative for every input, and the learning rate controls update size. Changing the activation at the same rate exchanged one failure for another; the executed run shows leaky ReLU and ELU diverged to NaN at lr = 1.0."
        },
        {
          stem: "Why does subtracting the maximum logit before exponentiating give the same softmax?",
          options: [
            "It does not; it is an approximation that is close enough",
            "Because exp(zᵢ − m) / Σ exp(zⱼ − m) = exp(−m)·exp(zᵢ) / (exp(−m)·Σ exp(zⱼ)) and the common factor cancels — softmax is shift-invariant, so the stable form is exact",
            "Because the maximum is always zero after normalisation",
            "Because PyTorch rounds the result"
          ],
          answer: 1,
          why: "The factor exp(−m) appears in numerator and denominator and cancels exactly. The executed run shows softmax([2, 1, 0.1]) and softmax([102, 101, 100.1]) identical, while the naive form on [1000, 999, 998] overflows to NaN."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Activations in NumPy, checked; softmax made safe",
      difficulty: "foundation",
      minutes: 22,
      body: [
        { t: "p", text: "**(a)** Implement sigmoid, tanh, ReLU, Swish and GELU (the tanh approximation) with their derivatives in NumPy — analytic for all but GELU, where a central finite difference is acceptable — and check both value and derivative against torch autograd at z = −2, −0.5, 0, 0.5, 2." },
        { t: "p", text: "**(b)** State the maximum derivative of sigmoid and tanh and compute the best-case gradient factor after 10 and 20 sigmoid layers." },
        { t: "p", text: "**(c)** Implement a stable softmax and a stable log-softmax. Apply both to [1000, 999, 998] and compare with torch; then show what log-softmax returns for [1000, 0, 0], where two probabilities underflow." },
        { t: "p", text: "**(d)** For logits (3, 1, 0, −1), compute the softmax and its entropy at temperatures 0.1, 1, 3 and 100." }
      ],
      requirements: [
        "(a) a table of maximum absolute differences, all below 1e-6.",
        "(b) two ceilings and two products.",
        "(c) three vectors and the underflow case.",
        "(d) four distributions with their entropies."
      ],
      hint: "σ′ = σ(1 − σ) and tanh′ = 1 − tanh²; Swish′ = σ(z) + zσ(z)(1 − σ(z)). Use F.gelu(z, approximate='tanh') for the GELU comparison. For log-softmax keep everything in log space: zᵢ − m − log Σ exp(zⱼ − m).",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a)  function            max |f − torch|   max |f' − autograd|
#      sigmoid             0.0e+00           0.0e+00
#      tanh                5.6e-17           0.0e+00
#      relu                0.0e+00           0.0e+00
#      swish               0.0e+00           1.1e-16
#      gelu (tanh approx)  0.0e+00           2.2e-11     -- finite difference, eps = 1e-6

# (b)  max sigmoid' = 0.25  ->  10 layers at best 9.5e-07, 20 layers 9.1e-13
#      max tanh'    = 1.0   ;  relu' = 1 on the active side

# (c)  stable softmax([1000, 999, 998]) = [0.66524 0.24473 0.09003]     log_softmax = [-0.40761 -1.40761 -2.40761]
#      torch                              [0.66524 0.24473 0.09003]                   [-0.40761 -1.40761 -2.40761]
#      log_softmax([1000, 0, 0])          = [0. -1000. -1000.]    -- finite; log(softmax) would give log(0) = -inf

# (d)  T=0.1 : p = [1. 0. 0. 0.]                          entropy 0.000
#      T=1   : p = [0.83095 0.11246 0.04137 0.01522]       entropy 0.595
#      T=3   : p = [0.46622 0.23937 0.17151 0.1229 ]       entropy 1.258
#      T=100 : p = [0.25566 0.2506  0.2481  0.24564]       entropy 1.386  = ln 4, the maximum`,
        notes: [
          { t: "p", text: "(a) is the check you will repeat for every hand-written backward pass in this course: analytic against autograd, to machine precision." },
          { t: "p", text: "(b) is the vanishing gradient as arithmetic, before lesson 1.8 measures it on a real network." },
          { t: "p", text: "(c) is why every framework computes cross-entropy from logits; (d) is temperature as an entropy dial, which distillation and text generation both use." }
        ]
      }
    }
  ],

  takeaways: [
    "Linear layers compose to one linear layer: five random matrices differ from their product by 6 × 10⁻⁶, and a three-layer linear network reaches exactly linear regression's loss (1.4413) on y = x² while one ReLU between the layers reaches 0.0000.",
    "Every gradient is multiplied by f′(z) once per layer: sigmoid′ ≤ 0.25, tanh′ ≤ 1, ReLU′ ∈ {0, 1}. Through ten default-initialised layers the input gradient was 2 × 10⁻⁸ for sigmoid, 2 × 10⁻² for tanh, 1.4 × 10⁻³ for ReLU.",
    "Three sigmoid hidden layers never left chance in sixty epochs (0.100); tanh and ELU reached 90 % by epoch 9, ReLU by 16. The mechanism is the derivative, and the ranking is specific to this depth, optimiser and initialisation.",
    "The dying ReLU is a learning-rate disease: lr = 1.0 killed 70–100 % of units per layer and froze the loss at ln 10; lr = 0.5 trained the same network to 0.980. Leaky ReLU at the bad rate diverged to NaN instead; at lr = 0.7 it recovered better (0.967 vs 0.934) because off units still receive gradient.",
    "Softmax is shift-invariant, so subtracting the maximum logit is exact and prevents the overflow that makes the naive form NaN; log-softmax keeps a finite log for probabilities that underflow, which is why cross-entropy is computed from logits.",
    "Temperature divides the logits: T → 0 gives a one-hot (entropy 0), T → ∞ gives uniform (entropy ln K); the same dial appears in distillation, generation and contrastive learning."
  ],

  quiz: {
    title: "Activation Functions — Knowledge Check",
    questions: [
      {
        stem: "A colleague builds a 40-layer MLP with no activation functions and reports it 'has more capacity than a linear model'. What is wrong?",
        options: [
          "Nothing; depth adds capacity",
          "The composition of linear maps is linear, so the 40-layer network represents exactly the functions a single linear layer does — measured: three linear layers fit y = x² no better than linear regression, 1.4413 in both cases",
          "It needs a bias term to gain capacity",
          "It would work if trained with Adam"
        ],
        answer: 1,
        why: "W₂(W₁x + b₁) + b₂ = (W₂W₁)x + (W₂b₁ + b₂). The extra parameters are a redundant parameterisation of one matrix; the ReLU between layers is what changes the function class, and with it the loss on x² went from 1.4413 to 0.0000."
      },
      {
        stem: "Why is the sigmoid still the right choice for LSTM gates even though it is a poor hidden-layer activation?",
        options: [
          "Because LSTMs are shallow",
          "Because a gate must produce a value in (0, 1) to act as a soft switch that scales what passes through; the range is the requirement, and the gradient concern is handled by the cell's additive path rather than by the gate's derivative",
          "Because tanh is not available inside recurrent layers",
          "Because sigmoid is faster to compute"
        ],
        answer: 1,
        why: "A gate multiplies a signal by a number between 0 and 1; sigmoid's bounded range is exactly that. The LSTM's gradient survives through the cell state's additive update, derived in lesson 4.3, not through the gates' derivatives."
      },
      {
        stem: "How would you detect dead ReLU units in a training run?",
        options: [
          "Watch for the loss becoming NaN",
          "Count, on a batch, the fraction of hidden units whose activation is zero for every example; single digits is normal, tens of per cent is a problem, and a loss frozen at ln(number of classes) is the terminal case",
          "Check whether the weights are all positive",
          "Compare training and validation accuracy"
        ],
        answer: 1,
        why: "A dead unit is exactly one that is off on all inputs. The executed run at lr = 1.0 showed fractions 0.70, 0.84 and 1.00 across three layers with the loss at 2.309 ≈ ln 10 — the network was outputting the class prior."
      },
      {
        stem: "Which pairing is correct for numerical stability?",
        options: [
          "Softmax output into a separate log and negative-log-likelihood",
          "Logits into a cross-entropy that computes log-softmax internally, so that a probability underflowing to zero still has a finite log — log_softmax([1000, 0, 0]) returned [0, −1000, −1000], where log(softmax) would return −inf",
          "Sigmoid output into a BCE that takes probabilities",
          "Either; the frameworks handle it"
        ],
        answer: 1,
        why: "Cross-entropy from logits (nn.CrossEntropyLoss, BCEWithLogitsLoss) uses the log-sum-exp trick and never forms a zero probability. Applying softmax first and then a log is the most common source of an infinite loss in hand-written training code."
      },
      {
        stem: "GELU and Swish derivatives were measured slightly above 1 for z ≈ 1 and slightly below 0 for z ≈ −1. What does that imply relative to ReLU?",
        options: [
          "They are unstable and should be avoided",
          "They are smooth and never have a hard zero-gradient region, so units cannot die in the ReLU sense, at the cost of a derivative that is not exactly 1 on the active side and slightly more compute",
          "They are identical to ReLU in practice",
          "They must be used with a lower learning rate"
        ],
        answer: 1,
        why: "The non-monotonic dip and the overshoot are what a smooth approximation to max(0, z) looks like near zero. With no exact-zero region a unit always receives some gradient, which is why the transformer literature adopted GELU; on the small SGD experiment here ReLU trained faster, so the trade-off is real in both directions."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Activation Functions",
    sub: "Why non-linearity, the derivative ceilings, the dying ReLU, softmax numerics, and the choice per position.",
    questions: [
      {
        level: "Core",
        q: "Why do neural networks need non-linear activation functions?",
        strong: "Because without them the network is one linear map however deep it is: W₂(W₁x + b₁) + b₂ = (W₂W₁)x + (W₂b₁ + b₂), and by induction any stack of linear layers collapses to a single matrix and bias. I checked it two ways — five random 4 × 4 matrices multiplied out differ from their product by 6 × 10⁻⁶, which is float32 rounding, and a three-layer linear network with 1,153 parameters fit y = x² to exactly the same loss as two-parameter linear regression, 1.4413, which is the variance of the target because a line can only remove the mean. Put a ReLU between the layers and the loss goes to zero. The non-linearity is what makes the second layer a different function class from the first.",
        answer: [
          { t: "p", text: "The algebra, the executed composition check, the executed x² fit, and the function-class framing." }
        ]
      },
      {
        level: "Core",
        q: "Compare ReLU, sigmoid and tanh as hidden-layer activations.",
        strong: "The comparison is about the derivative. Sigmoid outputs (0, 1), is not zero-centred and has derivative at most 0.25, so ten layers keep at most 10⁻⁶ of the gradient; measured through ten default-initialised layers the input gradient was 2 × 10⁻⁸, and a three-hidden-layer sigmoid MLP on the digits never left 10 % accuracy in sixty epochs. tanh is a rescaled sigmoid: zero-centred, derivative up to 1, still saturating beyond |z| ≈ 2; it reached 90 % by epoch nine. ReLU is max(0, z): derivative exactly 1 on the active side, so no saturation there, cheap, sparse, and the default for deep networks — but exactly 0 on the left, which is the dying-ReLU risk; it reached 90 % at epoch 16 on that small SGD problem and is the one that scales to deep convolutional networks with He initialisation. Sigmoid belongs on a binary output and in recurrent gates, where its range is the requirement.",
        answer: [
          { t: "p", text: "Range, centring and derivative ceiling for each, the executed gradient norms and accuracies, and where each still belongs." }
        ]
      },
      {
        level: "Core",
        q: "What is the dying ReLU problem, how do you detect it, and how do you fix it?",
        strong: "A ReLU unit whose pre-activation is negative for every input outputs zero everywhere and, because the derivative is zero on that side, receives no gradient: it is permanently off. It happens when an update — typically a large one from a high learning rate — pushes the weights or bias far negative. I reproduced it: a 64-128-128-128-10 network on the digits at SGD lr = 1.0 ended with 70 %, 84 % and 100 % of units dead in the three layers and the loss frozen at 2.309, which is ln 10, the cross-entropy of guessing the prior. Detection is that count: on a batch, the fraction of units with zero activation on every example. The fix is the learning rate first — lr = 0.5 trained the same network to 0.980 — then initialisation and normalisation, and only then a leaky or smooth variant. Leaky ReLU at lr = 1.0 did not rescue the run; it diverged to NaN. At lr = 0.7 it helped genuinely: 0.967 against 0.934, because a third of the units were off in both cases but the leaky ones could recover.",
        answer: [
          { t: "p", text: "Mechanism, the executed dead fractions and the ln 10 signature, the detection count, and the fix order with the evidence that changing the activation alone is not it." }
        ]
      },
      {
        level: "Core",
        q: "What is softmax and how do you compute it safely?",
        strong: "pᵢ = exp(zᵢ) / Σ exp(zⱼ): a vector of logits becomes a distribution that sums to one, with the largest logit getting the largest share. It is shift-invariant — adding a constant to every logit changes nothing, since the factor exp(c) cancels — and that is what makes it safe to compute: subtract the maximum logit first, so the largest exponent is exp(0) = 1 and nothing overflows. On [1000, 999, 998] the naive form is NaN and the stable form is [0.665, 0.245, 0.090]. For the loss, go one step further and compute log-softmax as zᵢ − m − log Σ exp(zⱼ − m), which keeps a finite value for a probability that underflows — log_softmax([1000, 0, 0]) is [0, −1000, −1000] rather than [0, −inf, −inf]. That is why cross-entropy losses take logits, not probabilities. Dividing the logits by a temperature before the softmax controls the entropy: T → 0 is a one-hot, T → ∞ is uniform.",
        answer: [
          { t: "p", text: "The definition, shift invariance, the executed overflow and underflow cases, the logits convention, and temperature." }
        ]
      },
      {
        level: "Advanced",
        q: "Why did GELU replace ReLU in transformers, and does it always win?",
        strong: "GELU is z·Φ(z), the input scaled by the probability a standard normal falls below it — a smooth version of ReLU that is non-monotonic just left of zero and whose derivative slightly exceeds one just right of it. It has no region of exactly zero gradient, so units cannot die in the ReLU sense, and empirically it trained BERT and GPT slightly better than ReLU, which is why it became the transformer feed-forward default; Swish, z·σ(z), is its near-twin in EfficientNet and modern convolutional networks. It does not always win: on a small MLP on the digits with plain SGD and default initialisation, ReLU reached 90 % at epoch 16 and GELU at epoch 26, with slightly lower final accuracy. The honest statement is that the smooth variants trade a derivative that is not exactly one on the active side for the absence of a hard zero, and that the gain is established at transformer scale, not universal.",
        answer: [
          { t: "p", text: "The definition and shape, the no-dead-region argument, where it is the default, and the executed case where it lost." }
        ]
      }
    ]
  }
});

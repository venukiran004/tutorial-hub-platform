/* ============================================================================
   LESSON 1.6 — Weight Initialisation
   Mirrors 01_Neural_Network_Fundamentals.md · §7 (Why It Matters, Methods,
   the PyTorch and Keras calls) and §21 Q2. The variance argument is
   measured through twenty layers for each initialisation.
   ========================================================================= */
EC.receiveLesson({
  id: "1.6",

  lede: "**Initialisation sets the starting weights, and the starting weights decide whether a signal survives the trip through the layers — and therefore whether any gradient comes back.** All zeros and every unit in a layer is the same unit forever. Too large and the activations saturate; too small and they fade to nothing by the tenth layer. The goal is one number: keep the variance of the activations about the same from layer to layer. Xavier initialisation achieves that for tanh and sigmoid, He initialisation for ReLU, and this lesson measures all of them — the activation scale at layers 1, 5, 10 and 20 for five choices — so that the formulas in the table are seen to do what they claim.",

  objectives: [
    "Explain the symmetry problem with all-equal weights and show it in a gradient",
    "Describe what too-large and too-small initialisation do to activations through depth, with measured numbers",
    "State the Xavier, He and LeCun formulas and which activation each is for",
    "Derive why ReLU needs the factor of 2 that tanh does not",
    "Apply the right initialisation in PyTorch and Keras, and know what PyTorch's default is"
  ],

  prerequisites: ["1.2", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "Why it matters", id: "why" },

    { t: "p", text: "Before the first gradient step the weights have to be something, and that something is not neutral. Three failure modes, straight from the reference:" },

    { t: "dl", items: [
      ["All zeros (or all equal)", "Every unit in a layer computes the same output, receives the same gradient and takes the same update — they remain identical forever. The network has one effective unit per layer regardless of its width. This is the symmetry problem."],
      ["Too large", "Pre-activations are far from zero, so sigmoid and tanh saturate at their flat ends where the derivative is near zero. Gradients vanish (lesson 1.8) before training starts."],
      ["Too small", "Each layer shrinks the signal; after enough layers the activations are indistinguishable from zero and so are the gradients that depend on them."]
    ] },

    { t: "quote", text: "Goal: maintain activation variance ≈ 1 across layers." },

    { t: "code", lang: "python", title: "The symmetry problem, in one gradient",
      code: `import torch, torch.nn as nn
net = nn.Sequential(nn.Linear(4, 3), nn.ReLU(), nn.Linear(3, 1))
for p in net.parameters(): nn.init.constant_(p, 0.0)
nn.init.constant_(net[0].weight, 0.5); nn.init.constant_(net[2].weight, 0.5)   # every weight equal
xb = torch.randn(8, 4)
loss = ((net(xb) - 1) ** 2).mean(); loss.backward()
print(net[0].weight.grad)`,
      caption: "Three hidden units, three identical rows of gradient. After the update they are still identical, and they always will be. Random initialisation exists to break this tie." },

    { t: "out", text: `tensor([[0.0512, 0.0804, 0.0881, 0.0489],
        [0.0512, 0.0804, 0.0881, 0.0489],
        [0.0512, 0.0804, 0.0881, 0.0489]])` },

    { t: "h2", n: "02", text: "The variance argument", id: "variance" },

    { t: "p", text: "Take one unit with n inputs, z = Σ wᵢaᵢ. If the inputs are independent with variance Var(a) and the weights are drawn independently with mean 0 and variance Var(w), then Var(z) = n · Var(w) · Var(a). To keep Var(z) equal to Var(a) — the same scale in as out — you need n · Var(w) = 1, that is **Var(w) = 1/n**. That is LeCun initialisation, and it is right for a linear layer or one followed by an activation that is roughly the identity near zero, like tanh." },

    { t: "p", text: "ReLU changes the arithmetic: it sets half the pre-activations to zero, and the half that survive carry, on average, half the variance. To compensate, the weights need twice the variance: **Var(w) = 2/n**. That is He (Kaiming) initialisation. Xavier (Glorot) uses 2/(n_in + n_out), which balances the forward pass (which cares about n_in) against the backward pass (which cares about n_out) for tanh and sigmoid." },

    { t: "table", head: ["Method", "Distribution", "Best for"],
      rows: [
        ["Xavier / Glorot", "W ~ N(0, 2 / (n_in + n_out))", "Sigmoid, tanh"],
        ["He / Kaiming", "W ~ N(0, 2 / n_in)", "**ReLU** — the default"],
        ["LeCun", "W ~ N(0, 1 / n_in)", "SELU"]
      ] },

    { t: "p", text: "Each also has a uniform version with the same variance — a uniform distribution on [−a, a] has variance a²/3, so `xavier_uniform_` draws from ±√(6 / (n_in + n_out)). The distribution's shape does not matter much; the variance does." },

    { t: "h2", n: "03", text: "Measured through twenty layers", id: "measured" },

    { t: "p", text: "Twenty layers of 256 units, an input with standard deviation 1, and the standard deviation of the activations recorded after layers 1, 5, 10 and 20, for each initialisation and its matching activation:" },

    { t: "code", lang: "python", title: "Activation scale through depth",
      code: `import torch
torch.manual_seed(0)
n, L = 256, 20; x = torch.randn(1000, n)

def run(std_of_n, act, name):
    a = x; out = []
    for l in range(L):
        W = torch.randn(n, n) * std_of_n(n)      # W ~ N(0, std²)
        a = act(a @ W); out.append(a.std().item())
    print(f"{name:30s} std at layers 1, 5, 10, 20: {out[0]:.4f} {out[4]:.4f} {out[9]:.4f} {out[19]:.2e}")

run(lambda n: 0.01,                  torch.tanh, "tanh, N(0, 0.01²)  too small")
run(lambda n: 1.0,                   torch.tanh, "tanh, N(0, 1)      too large")
run(lambda n: (2 / (n + n)) ** 0.5,  torch.tanh, "tanh, Xavier 2/(n_in+n_out)")
run(lambda n: (1 / n) ** 0.5,        torch.relu, "ReLU, N(0, 1/n)")
run(lambda n: (2 / n) ** 0.5,        torch.relu, "ReLU, He 2/n_in")`,
      caption: "The same forward pass five times with only the weight scale changed. Read the last column: three of the five have lost the signal by layer 20." },

    { t: "out", text: `tanh, N(0, 0.01²)  too small   std at layers 1, 5, 10, 20: 0.1562 0.0001 0.0000 1.12e-16
tanh, N(0, 1)      too large   std at layers 1, 5, 10, 20: 0.9749 0.9744 0.9744 9.74e-01
tanh, Xavier 2/(n_in+n_out)    std at layers 1, 5, 10, 20: 0.6266 0.3164 0.2245 1.57e-01
ReLU, N(0, 1/n)                std at layers 1, 5, 10, 20: 0.5859 0.1570 0.0343 1.06e-03
ReLU, He 2/n_in                std at layers 1, 5, 10, 20: 0.8241 0.8410 0.8945 1.20e+00` },

    { t: "viz", title: "Activation standard deviation by depth, five initialisations",
      caption: "Log scale. Too-small weights collapse to 10⁻¹⁶ by layer 20; too-large tanh weights pin at 0.97 — but that is saturation, with 87 % of the units at |a| > 0.99 and no gradient. Xavier drifts down slowly under tanh. ReLU with variance 1/n loses three orders of magnitude; He initialisation holds the scale near 1 through all twenty layers.",
      svg: `<svg viewBox="0 0 760 270" role="img" aria-label="Activation standard deviation against layer depth for five initialisations">
<g>
  <rect x="60" y="16" width="660" height="210" rx="6" class="s-fill s-stroke" stroke-width="1"/>
  <line x1="60" y1="66" x2="720" y2="66" style="stroke:var(--line);stroke-opacity:.5" stroke-width="1"/>
  <line x1="60" y1="118" x2="720" y2="118" style="stroke:var(--line);stroke-opacity:.5" stroke-width="1"/>
  <line x1="60" y1="170" x2="720" y2="170" style="stroke:var(--line);stroke-opacity:.5" stroke-width="1"/>
  <text x="54" y="70" text-anchor="end" class="s-sub">1</text>
  <text x="54" y="122" text-anchor="end" class="s-sub">10⁻²</text>
  <text x="54" y="174" text-anchor="end" class="s-sub">10⁻⁴</text>
  <text x="54" y="226" text-anchor="end" class="s-sub">10⁻⁶</text>
  <text x="120" y="244" text-anchor="middle" class="s-sub">layer 1</text>
  <text x="290" y="244" text-anchor="middle" class="s-sub">layer 5</text>
  <text x="480" y="244" text-anchor="middle" class="s-sub">layer 10</text>
  <text x="700" y="244" text-anchor="middle" class="s-sub">layer 20</text>
  <polyline points="120,68 290,66 480,66 700,66" fill="none" style="stroke:var(--crit)" stroke-width="2"/>
  <polyline points="120,64 290,63 480,62 700,60" fill="none" style="stroke:var(--good)" stroke-width="2.4"/>
  <polyline points="120,77 290,92 480,100 700,108" fill="none" style="stroke:var(--accent)" stroke-width="2"/>
  <polyline points="120,78 290,108 480,143 700,220" fill="none" style="stroke:var(--warn)" stroke-width="2"/>
  <polyline points="120,108 290,226 480,226 700,226" fill="none" style="stroke:var(--ink-3);stroke-dasharray:5 4" stroke-width="1.6"/>
  <text x="708" y="58" text-anchor="end" class="s-sub" style="fill:var(--good)">ReLU · He — holds ≈ 1</text>
  <text x="708" y="82" text-anchor="end" class="s-sub" style="fill:var(--crit)">tanh · N(0,1) — pinned at 0.97, saturated</text>
  <text x="708" y="104" text-anchor="end" class="s-sub" style="fill:var(--accent)">tanh · Xavier — slow drift</text>
  <text x="640" y="196" text-anchor="end" class="s-sub" style="fill:var(--warn)">ReLU · N(0, 1/n) — 10⁻³ by layer 20</text>
  <text x="320" y="216" text-anchor="start" class="s-sub">tanh · N(0, 0.01²) — gone by layer 5</text>
</g></svg>` },

    { t: "p", text: "The too-large tanh row looks healthy — a standard deviation of 0.97, layer after layer — and it is the worst of the five. tanh's outputs are pinned at ±1: 86.8 % of the units have |a| > 0.99, where the derivative 1 − tanh² is under 0.02. The signal survives; the gradient does not. This is why *variance ≈ 1* is the target and not *variance ≥ something*: the scale has to be right, not merely large." },

    { t: "h2", n: "04", text: "In PyTorch and Keras", id: "code" },

    { t: "code", lang: "python", title: "The reference's calls, and what they produce",
      code: `import torch.nn as nn
lin = nn.Linear(512, 256)

nn.init.kaiming_normal_(lin.weight, nonlinearity="relu")   # He init: N(0, 2/fan_in)
print(f"kaiming_normal_: std {lin.weight.std():.4f}  vs  sqrt(2/512) = {(2 / 512) ** 0.5:.4f}")

nn.init.xavier_uniform_(lin.weight)                        # Glorot init: U(±sqrt(6/(fan_in+fan_out)))
print(f"xavier_uniform_: std {lin.weight.std():.4f}  vs  sqrt(2/768) = {(2 / 768) ** 0.5:.4f}")

print(f"nn.Linear default: std {nn.Linear(512, 256).weight.std():.4f}  vs  sqrt(1/(3·512)) = {(1 / (3 * 512)) ** 0.5:.4f}")

# Keras (default is Glorot uniform; ask for He when the layer is ReLU)
# Dense(128, activation='relu', kernel_initializer='he_normal')`,
      caption: "The measured standard deviations match the formulas. The last line is the one to remember: PyTorch's default for nn.Linear is a Kaiming *uniform* with a = √5, which works out to variance 1/(3·fan_in) — a third of LeCun's and a sixth of He's." },

    { t: "out", text: `kaiming_normal_: std 0.0624  vs  sqrt(2/512) = 0.0625
xavier_uniform_: std 0.0511  vs  sqrt(2/768) = 0.0510
nn.Linear default: std 0.0255  vs  sqrt(1/(3·512)) = 0.0255` },

    { t: "callout", kind: "trap", title: "The default is not He",
      body: [{ t: "p", text: "A plain `nn.Sequential` of `nn.Linear` and `nn.ReLU` layers starts with weights six times smaller in variance than He initialisation recommends. For a handful of layers it does not matter — the optimiser fixes it in a few steps. For a deep plain network without normalisation it does, and the fix is one loop over the modules calling `kaiming_normal_` on each weight. With batch normalisation (lesson 1.8) or residual connections in place, the initialisation matters far less, which is most of why those two inventions made deep networks routine." }] },

    { t: "callout", kind: "good", title: "Biases start at zero",
      body: [{ t: "p", text: "The variance argument is about weights. Biases are initialised to zero — there is no symmetry to break among them, and a non-zero bias would only shift every pre-activation by the same amount. The exceptions are deliberate: an LSTM's forget-gate bias is often set to 1 so the cell remembers by default (module 3), and a classifier's final bias can be set to the log class prior." }] },

    { t: "exercise", kind: "practice", title: "Fix a deep plain network", difficulty: "core", minutes: 15,
      body: [{ t: "p", text: "Build a 30-layer network of `nn.Linear(256, 256)` + `nn.ReLU()` with PyTorch's default initialisation, push 1,000 random inputs through it and print the standard deviation of the output. Then zero the biases and print it again; then re-initialise every weight with `kaiming_normal_(nonlinearity='relu')` and print it a third time." }],
      requirements: [
        "Report the output standard deviation all three ways",
        "Explain the three numbers using the variance argument",
        "Say why the difference would matter less with batch normalisation"
      ],
      hint: "PyTorch's default also draws the biases from a uniform distribution, and a bias adds variance at every layer regardless of what arrived from below.",
      solution: { lang: "python", title: "Solution",
        code: `import torch, torch.nn as nn
torch.manual_seed(0)
layers = []
for _ in range(30): layers += [nn.Linear(256, 256), nn.ReLU()]
net = nn.Sequential(*layers); x = torch.randn(1000, 256)
print(f"default init (weights and biases): {net(x).std():.2e}")     # 2.30e-02
for m in net:
    if isinstance(m, nn.Linear): nn.init.zeros_(m.bias)
print(f"default weights, zero biases:      {net(x).std():.2e}")     # 1.76e-12
for m in net:
    if isinstance(m, nn.Linear): nn.init.kaiming_normal_(m.weight, nonlinearity="relu")
print(f"He weights, zero biases:           {net(x).std():.3f}")     # 0.695`,
        notes: [{ t: "p", text: "With the default weights and no biases, each ReLU layer multiplies the variance by about n·Var(w)·½ = 256 · 1/(3·256) · ½ = 1/6, and thirty layers shrink the standard deviation to 10⁻¹²: the input is gone. The default's random biases prop the output up to 0.023, but that 0.023 is bias noise, not signal — the output barely depends on the input. He weights hold the scale at 0.7. Batch normalisation re-standardises every layer's pre-activations, so the weight scale is corrected on every forward pass and none of the three numbers would differ much." }] } }
  ],

  takeaways: [
    "Equal weights give equal units with equal gradients forever; random initialisation exists to break that symmetry.",
    "Var(z) = n · Var(w) · Var(a), so Var(w) = 1/n keeps the scale through a linear or tanh layer; ReLU discards half the variance, so He uses 2/n.",
    "Xavier uses 2/(n_in + n_out) to balance the forward and backward passes for sigmoid and tanh; LeCun's 1/n_in is for SELU.",
    "Measured over 20 layers: He holds the activation scale near 1 under ReLU, variance 1/n loses three orders of magnitude, and too-large tanh weights saturate — 87 % of units at |a| > 0.99 with no gradient.",
    "PyTorch's nn.Linear default has variance 1/(3·fan_in), a sixth of He; call kaiming_normal_ on deep plain networks, and rely on batch norm or residuals otherwise.",
    "Biases start at zero except where a non-zero value is a design choice, such as an LSTM forget gate."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why can all the weights not be initialised to zero?",
      options: ["The loss would be undefined", "Every unit in a layer would compute the same output and receive the same gradient, so they would stay identical", "Zero weights overflow in float32", "The bias would also have to be zero"],
      answer: 1,
      why: "With identical weights every unit in a layer sees the same input, produces the same activation, and gets the same gradient row — the demonstration showed three identical gradient rows. Identical updates keep them identical, so the layer has one effective unit no matter how wide it is." },
    { stem: "Why does He initialisation use variance 2/n_in rather than 1/n_in?",
      options: ["Because ReLU doubles the input", "Because ReLU zeroes about half the pre-activations, halving the variance that survives, and the 2 compensates", "Because there are two layers", "Because biases add variance"],
      answer: 1,
      why: "Var(z) = n·Var(w)·Var(a) would be preserved with Var(w) = 1/n, but ReLU sets the negative half to zero, so the activation variance after ReLU is about half the pre-activation variance. Doubling the weight variance restores the scale — the measurement showed 1/n losing three orders of magnitude over 20 layers while 2/n held." },
    { stem: "A 20-layer tanh network initialised with N(0, 1) weights keeps an activation standard deviation of 0.97 at every layer. Is it well initialised?",
      options: ["Yes, the variance is preserved", "No — the units are saturated at ±1 where tanh′ ≈ 0, so gradients vanish", "Yes, tanh cannot saturate", "No, because the variance should be exactly 1"],
      answer: 1,
      why: "The 0.97 comes from outputs pinned at ±1: 87 % of units had |a| > 0.99, where 1 − tanh² is below 0.02. The forward signal survives but every backward pass is multiplied by near-zero derivatives. The target is variance about 1 with units in their linear range, which Xavier's much smaller weights give." },
    { stem: "What is PyTorch's default initialisation for nn.Linear?",
      options: ["He normal", "Xavier uniform", "Kaiming uniform with a = √5, variance 1/(3·fan_in)", "All zeros"],
      answer: 2,
      why: "The measured standard deviation of a default nn.Linear(512, 256) weight was 0.0255 = √(1/(3·512)), a sixth of the He variance. For shallow networks the optimiser corrects it; for deep plain ReLU stacks without normalisation you should set He initialisation explicitly." }
  ] },

  interview: { title: "Interview", sub: "The reference's Q2, and the derivation behind it", questions: [
    { level: "Core", q: "Why can't we initialise all weights to zero?",
      strong: "Symmetry: identical units get identical gradients and never differentiate; random initialisation breaks the tie, scaled by He or Xavier to preserve variance.",
      answer: [{ t: "p", text: "If every weight in a layer is the same, every unit computes the same function of the input, so the backward pass gives each unit the same gradient and the update keeps them equal. The layer behaves as one unit forever, whatever its width. Random initialisation makes the units different from the start. The scale is then chosen to keep the activation variance roughly constant across layers: He, variance 2/fan_in, for ReLU; Xavier, 2/(fan_in + fan_out), for sigmoid and tanh." }] },
    { level: "Core", q: "Derive the He and Glorot formulas.",
      strong: "Var(z) = n_in·Var(w)·Var(a); set it to Var(a) for 1/n_in, double for ReLU's halving, average fan-in and fan-out for the backward pass.",
      answer: [{ t: "p", text: "For z = Σᵢ wᵢaᵢ with independent zero-mean weights and inputs, Var(z) = n_in Var(w) Var(a). Preserving variance forward needs Var(w) = 1/n_in. The backward pass propagates δ through Wᵀ, so preserving gradient variance needs Var(w) = 1/n_out; Glorot compromises with 2/(n_in + n_out), the harmonic-mean choice, assuming a roughly linear activation like tanh near zero. He observes that ReLU zeroes half of the pre-activations, so E[a²] after ReLU is half of E[z²]; keeping the scale needs twice the variance, 2/n_in. Uniform versions use the same variance with bounds ±√(3·Var)." }] },
    { level: "Senior", q: "When does initialisation stop mattering, and when does it still matter?",
      strong: "Batch norm and residual connections make deep networks robust to it; deep plain stacks, transformers' output projections and RNN gates still need care.",
      answer: [{ t: "p", text: "Batch normalisation re-standardises each layer's pre-activations, so the weight scale is corrected every forward pass; residual connections give the signal an identity path that no weight scale can kill. Networks built from both train from almost any sensible initialisation. It still matters for plain deep stacks without normalisation — 30 default-initialised ReLU layers shrink the signal by ~10⁻¹² — and in specific places: transformer implementations scale the residual-branch output projections by 1/√(2·layers) so the residual sum does not grow with depth; LSTMs set the forget-gate bias to 1; and the final classifier layer is sometimes zero-initialised so the network starts from the prior. Wrong initialisation shows up as a loss stuck at ln(classes) for the first epochs or as an immediate NaN." }] }
  ] }
});

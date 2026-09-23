/* ============================================================================
   LESSON 1.2 — Activation Functions
   Mirrors 01_Neural_Network_Fundamentals.md · §2 (Comparison Table, When to
   Use Which, Dead Neuron Problem). Every value in the tables was computed
   with PyTorch; the derivatives came from autograd.
   ========================================================================= */
EC.receiveLesson({
  id: "1.2",

  lede: "**An activation function is the non-linearity applied to each neuron's weighted sum, and without one a network of any depth is a single linear map.** The choice is small — sigmoid, tanh, ReLU and its relatives, GELU and SiLU for the modern architectures, softmax at a multi-class output — but each has a formula, a range, a derivative and a characteristic way of failing, and the derivative is what matters for training: a sigmoid's gradient never exceeds 0.25, a ReLU's is exactly 1 or exactly 0. This lesson is the reference's comparison table with every entry computed, the rule for which activation goes where, and the dead-neuron problem measured.",

  objectives: [
    "Explain why a network without activations collapses to one linear transformation, in two lines of algebra",
    "Write the formula, range and derivative of sigmoid, tanh, ReLU, Leaky ReLU, ELU, GELU, SiLU, softmax, SELU and Mish, and say what each one's issue is",
    "Choose the hidden-layer activation and the output activation for a given task from the reference's rule",
    "Describe the dead-ReLU problem — its cause, how to detect it, and the four fixes"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "Why there has to be one", id: "why" },

    { t: "p", text: "Take two layers with no activation between them: **a** = W₂(W₁**x** + **b**₁) + **b**₂ = (W₂W₁)**x** + (W₂**b**₁ + **b**₂). That is one matrix and one bias — a single linear layer wearing two layers' worth of parameters. Stack a hundred and the same thing happens. A linear model cannot draw XOR's two lines (lesson 1.1), so the non-linearity between layers is not a detail: it is the only reason depth does anything." },

    { t: "p", text: "The activation is applied element-wise to the pre-activation **z** = W**a** + **b**, so its derivative is also element-wise, and that derivative multiplies into every gradient that passes through the layer during backpropagation (lesson 1.4). Which is why the table below has a derivative column and why that column decides more than the formula does." },

    { t: "h2", n: "02", text: "The comparison table, computed", id: "table" },

    { t: "viz", title: "Eight activations on the same axes, z from −4 to 4",
      caption: "Blue: the saturating pair — sigmoid in (0, 1), tanh in (−1, 1), both flat far from zero. Green: the ReLU family — a hinge at zero, linear beyond it, with Leaky ReLU and ELU allowing something through on the negative side. Amber: the smooth modern ones — GELU, SiLU and Softplus — which dip slightly below zero before rising like ReLU.",
      svg: `<svg viewBox="0 0 760 300" role="img" aria-label="Eight activation functions plotted on the same axes">
<g><rect x="10" y="14" width="150" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="10" y1="87" x2="160" y2="87" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<line x1="85" y1="14" x2="85" y2="124" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<path d="M10,87 L14,87 L18,87 L21,87 L25,86 L29,86 L32,86 L36,86 L40,85 L44,85 L48,85 L51,84 L55,83 L59,83 L62,82 L66,81 L70,80 L74,79 L78,78 L81,77 L85,76 L89,75 L92,74 L96,73 L100,72 L104,71 L108,70 L111,69 L115,68 L119,68 L122,67 L126,67 L130,66 L134,66 L138,66 L141,66 L145,65 L149,65 L152,65 L156,65 L160,65" fill="none" style="stroke:var(--accent)" stroke-width="2"/>
<text x="16" y="28" class="s-label">sigmoid</text><text x="16" y="138" class="s-sub">1 / (1 + e⁻ᶻ)</text></g>
<g><rect x="198" y="14" width="150" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="198" y1="87" x2="348" y2="87" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<line x1="273" y1="14" x2="273" y2="124" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<path d="M198,110 L202,110 L206,110 L209,110 L213,110 L217,110 L220,110 L224,110 L228,110 L232,110 L236,109 L239,109 L243,108 L247,108 L250,106 L254,105 L258,103 L262,100 L266,96 L269,92 L273,87 L277,83 L280,79 L284,75 L288,72 L292,70 L296,68 L299,67 L303,66 L307,66 L310,65 L314,65 L318,65 L322,65 L326,65 L329,65 L333,64 L337,64 L340,64 L344,64 L348,64" fill="none" style="stroke:var(--accent)" stroke-width="2"/>
<text x="204" y="28" class="s-label">tanh</text><text x="204" y="138" class="s-sub">(eᶻ − e⁻ᶻ)/(eᶻ + e⁻ᶻ)</text></g>
<g><rect x="386" y="14" width="150" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="386" y1="87" x2="536" y2="87" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<line x1="461" y1="14" x2="461" y2="124" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<path d="M386,87 L390,87 L394,87 L397,87 L401,87 L405,87 L408,87 L412,87 L416,87 L420,87 L424,87 L427,87 L431,87 L435,87 L438,87 L442,87 L446,87 L450,87 L454,87 L457,87 L461,87 L465,83 L468,78 L472,74 L476,69 L480,64 L484,60 L487,55 L491,51 L495,46 L498,42 L502,37 L506,32 L510,28 L514,23 L517,19 L521,14 L525,14 L528,14 L532,14 L536,14" fill="none" style="stroke:var(--good)" stroke-width="2"/>
<text x="392" y="28" class="s-label">ReLU</text><text x="392" y="138" class="s-sub">max(0, z)</text></g>
<g><rect x="574" y="14" width="150" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="574" y1="87" x2="724" y2="87" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<line x1="649" y1="14" x2="649" y2="124" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<path d="M574,96 L578,96 L582,96 L585,95 L589,95 L593,94 L596,94 L600,93 L604,93 L608,92 L612,92 L615,91 L619,91 L623,91 L626,90 L630,90 L634,89 L638,89 L642,88 L645,88 L649,87 L653,83 L656,78 L660,74 L664,69 L668,64 L672,60 L675,55 L679,51 L683,46 L686,42 L690,37 L694,32 L698,28 L702,23 L705,19 L709,14 L713,14 L716,14 L720,14 L724,14" fill="none" style="stroke:var(--good)" stroke-width="2"/>
<text x="580" y="28" class="s-label">Leaky ReLU</text><text x="580" y="138" class="s-sub">max(0.1z, z)</text></g>
<g><rect x="10" y="160" width="150" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="10" y1="233" x2="160" y2="233" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<line x1="85" y1="160" x2="85" y2="270" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<path d="M10,256 L14,256 L18,256 L21,255 L25,255 L29,255 L32,255 L36,255 L40,254 L44,254 L48,253 L51,252 L55,252 L59,251 L62,249 L66,248 L70,246 L74,244 L78,241 L81,237 L85,233 L89,229 L92,224 L96,220 L100,215 L104,210 L108,206 L111,201 L115,197 L119,192 L122,188 L126,183 L130,178 L134,174 L138,169 L141,165 L145,160 L149,160 L152,160 L156,160 L160,160" fill="none" style="stroke:var(--good)" stroke-width="2"/>
<text x="16" y="174" class="s-label">ELU</text><text x="16" y="284" class="s-sub">z or α(eᶻ − 1)</text></g>
<g><rect x="198" y="160" width="150" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="198" y1="233" x2="348" y2="233" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<line x1="273" y1="160" x2="273" y2="270" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<path d="M198,233 L202,233 L206,233 L209,233 L213,233 L217,233 L220,233 L224,234 L228,234 L232,234 L236,234 L239,235 L243,235 L247,236 L250,236 L254,237 L258,237 L262,237 L266,236 L269,235 L273,233 L277,231 L280,227 L284,223 L288,219 L292,214 L296,209 L299,204 L303,199 L307,194 L310,189 L314,184 L318,179 L322,174 L326,169 L329,165 L333,160 L337,160 L340,160 L344,160 L348,160" fill="none" style="stroke:var(--warn)" stroke-width="2"/>
<text x="204" y="174" class="s-label">GELU</text><text x="204" y="284" class="s-sub">z · Φ(z)</text></g>
<g><rect x="386" y="160" width="150" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="386" y1="233" x2="536" y2="233" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<line x1="461" y1="160" x2="461" y2="270" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<path d="M386,235 L390,235 L394,236 L397,236 L401,236 L405,237 L408,237 L412,237 L416,238 L420,238 L424,239 L427,239 L431,239 L435,240 L438,240 L442,239 L446,239 L450,238 L454,237 L457,235 L461,233 L465,231 L468,228 L472,224 L476,221 L480,217 L484,212 L487,208 L491,203 L495,198 L498,193 L502,188 L506,183 L510,178 L514,173 L517,168 L521,163 L525,160 L528,160 L532,160 L536,160" fill="none" style="stroke:var(--warn)" stroke-width="2"/>
<text x="392" y="174" class="s-label">SiLU / Swish</text><text x="392" y="284" class="s-sub">z · σ(z)</text></g>
<g><rect x="574" y="160" width="150" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="574" y1="233" x2="724" y2="233" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<line x1="649" y1="160" x2="649" y2="270" style="stroke:var(--line);stroke-opacity:.6" stroke-width="1"/>
<path d="M574,233 L578,233 L582,233 L585,233 L589,232 L593,232 L596,232 L600,232 L604,231 L608,231 L612,230 L615,230 L619,229 L623,228 L626,227 L630,226 L634,225 L638,223 L642,222 L645,220 L649,217 L653,215 L656,212 L660,210 L664,206 L668,203 L672,200 L675,196 L679,192 L683,189 L686,185 L690,181 L694,176 L698,172 L702,168 L705,163 L709,160 L713,160 L716,160 L720,160 L724,160" fill="none" style="stroke:var(--warn)" stroke-width="2"/>
<text x="580" y="174" class="s-label">Softplus</text><text x="580" y="284" class="s-sub">ln(1 + eᶻ)</text></g>
</svg>` },

    { t: "table", head: ["Function", "Formula", "Range", "Derivative", "Issue"],
      rows: [
        ["Sigmoid", "1 / (1 + e⁻ᶻ)", "(0, 1)", "σ(z)(1 − σ(z)) — at most 0.25", "Vanishing gradient; not zero-centred"],
        ["Tanh", "(eᶻ − e⁻ᶻ) / (eᶻ + e⁻ᶻ)", "(−1, 1)", "1 − tanh²(z) — at most 1", "Vanishing gradient"],
        ["ReLU", "max(0, z)", "[0, ∞)", "1 if z > 0, else 0", "Dead neurons"],
        ["Leaky ReLU", "max(αz, z)", "(−∞, ∞)", "1 if z > 0, else α", "α needs choosing"],
        ["ELU", "z if z > 0, else α(eᶻ − 1)", "(−α, ∞)", "Smooth: 1 or αeᶻ", "exp() is costly"],
        ["GELU", "z · Φ(z)", "(−0.17, ∞)", "Not closed-form-simple", "The transformer default"],
        ["Swish / SiLU", "z · σ(z)", "(−0.28, ∞)", "σ(z) + zσ(z)(1 − σ(z))", "Smooth ReLU alternative"],
        ["Softmax", "eᶻⁱ / Σⱼ eᶻʲ", "(0, 1), sums to 1", "A Jacobian, not a scalar", "Multi-class output only"],
        ["SELU", "λ · (z if z > 0, else α(eᶻ − 1))", "(−λα, ∞)", "Self-normalising", "Needs LeCun init and alpha-dropout; λ ≈ 1.0507, α ≈ 1.6733"],
        ["Mish", "z · tanh(ln(1 + eᶻ))", "(−0.31, ∞)", "Smooth, non-monotonic", "Used in YOLOv4 and later"]
      ] },

    { t: "p", text: "Formulas are easy to nod at. Here is each one evaluated at seven inputs, with the derivative from autograd beneath it, so the shape of the table is a set of numbers rather than a set of claims:" },

    { t: "code", lang: "python", title: "Every activation and its derivative at z ∈ {−3, −1, −0.5, 0, 0.5, 1, 3}",
      code: `import torch, torch.nn.functional as F

z = torch.tensor([-3.0, -1.0, -0.5, 0.0, 0.5, 1.0, 3.0], requires_grad=True)
acts = {"sigmoid": torch.sigmoid, "tanh": torch.tanh, "relu": F.relu,
        "leaky_relu(0.01)": lambda x: F.leaky_relu(x, 0.01), "elu": F.elu,
        "gelu": F.gelu, "silu": F.silu, "selu": F.selu, "mish": F.mish}
for name, f in acts.items():
    y = f(z)
    g, = torch.autograd.grad(y.sum(), z)        # d f(z)/dz, element-wise
    print(f"{name:17s}" + "  ".join(f"{v:7.4f}" for v in y.tolist()))
    print(f"  derivative     " + "  ".join(f"{v:7.4f}" for v in g.tolist()))`,
      caption: "autograd differentiates each activation for us; the sum() trick works because every output depends on one input only, so the gradient of the sum is the vector of element-wise derivatives." },

    { t: "out", text: `z            -3.00    -1.00    -0.50     0.00     0.50     1.00     3.00
sigmoid           0.0474   0.2689   0.3775   0.5000   0.6225   0.7311   0.9526
  derivative      0.0452   0.1966   0.2350   0.2500   0.2350   0.1966   0.0452
tanh             -0.9951  -0.7616  -0.4621   0.0000   0.4621   0.7616   0.9951
  derivative      0.0099   0.4200   0.7864   1.0000   0.7864   0.4200   0.0099
relu              0.0000   0.0000   0.0000   0.0000   0.5000   1.0000   3.0000
  derivative      0.0000   0.0000   0.0000   0.0000   1.0000   1.0000   1.0000
leaky_relu(0.01) -0.0300  -0.0100  -0.0050   0.0000   0.5000   1.0000   3.0000
  derivative      0.0100   0.0100   0.0100   0.0100   1.0000   1.0000   1.0000
elu              -0.9502  -0.6321  -0.3935   0.0000   0.5000   1.0000   3.0000
  derivative      0.0498   0.3679   0.6065   1.0000   1.0000   1.0000   1.0000
gelu             -0.0041  -0.1587  -0.1543   0.0000   0.3457   0.8413   2.9959
  derivative     -0.0119  -0.0833   0.1325   0.5000   0.8675   1.0833   1.0119
silu             -0.1423  -0.2689  -0.1888   0.0000   0.3112   0.7311   2.8577
  derivative     -0.0881   0.0723   0.2600   0.5000   0.7400   0.9277   1.0881
selu             -1.6706  -1.1113  -0.6918   0.0000   0.5254   1.0507   3.1521
  derivative      0.0875   0.6468   1.0663   1.7581   1.0507   1.0507   1.0507
mish             -0.1456  -0.3034  -0.2207   0.0000   0.3752   0.8651   2.9865
  derivative     -0.0934   0.0592   0.2895   0.6000   0.8864   1.0490   1.0211` },

    { t: "p", text: "Three things to read off the numbers. **The sigmoid's derivative peaks at 0.25 and is already 0.045 at |z| = 3**: ten sigmoid layers in a row multiply the gradient by at most 0.25¹⁰ ≈ 10⁻⁶, which is the vanishing-gradient problem in one line (lesson 1.8). Tanh peaks at 1 and is zero-centred, which is why it beat sigmoid in hidden layers before ReLU arrived, but it saturates just as hard: 0.0099 at |z| = 3. **ReLU's derivative is 1 for every positive input** — no shrinking, however deep — and 0 for every negative one, which is both its virtue and its failure mode. GELU and SiLU are ReLU with the corner rounded off: a small negative output around z ≈ −0.75 and a derivative that passes smoothly through 0.5 at zero, which is what transformers and EfficientNet use." },

    { t: "callout", kind: "note", title: "Softmax is different in kind",
      body: [{ t: "p", text: "Every other row is applied to one number at a time. Softmax takes a whole vector of logits and returns a probability distribution: softmax([2, 1, 0.1]) = [0.659, 0.242, 0.099], summing to 1. Its derivative is a matrix (the Jacobian ∂pᵢ/∂zⱼ = pᵢ(δᵢⱼ − pⱼ)), which is why it lives at the output and is paired with cross-entropy, where the two combine into the clean gradient p − y (lesson 1.4)." }] },

    { t: "h2", n: "03", text: "Which one where", id: "which" },

    { t: "p", text: "The reference's rule fits in a short table, and it is the rule almost every working architecture follows:" },

    { t: "table", head: ["Place", "Situation", "Use"],
      rows: [
        ["Hidden layers", "Default", "**ReLU** — fast, effective, well understood"],
        ["Hidden layers", "Dying-ReLU trouble", "Leaky ReLU or ELU"],
        ["Hidden layers", "Transformers", "**GELU** (BERT, GPT)"],
        ["Hidden layers", "Modern CNNs", "**SiLU / Swish** (EfficientNet, YOLOv5 and later)"],
        ["Output layer", "Binary classification", "Sigmoid — one probability"],
        ["Output layer", "Multi-class, one label", "Softmax — a distribution over classes"],
        ["Output layer", "Multi-label", "Sigmoid per class — independent probabilities"],
        ["Output layer", "Regression", "Linear — no activation"],
        ["Output layer", "Regression, positive target", "ReLU or Softplus"]
      ] },

    { t: "p", text: "The output row is decided by the loss (lesson 1.3): sigmoid pairs with binary cross-entropy, softmax with categorical cross-entropy, a linear output with mean squared error. Get that pairing wrong — a softmax output trained with MSE, say — and the network trains, slowly and badly. In PyTorch the pairing is often hidden: `nn.CrossEntropyLoss` takes raw logits and applies log-softmax internally, so the model's last layer is linear and there is no softmax in the module at all." },

    { t: "h2", n: "04", text: "The dead-neuron problem", id: "dead" },

    { t: "p", text: "A ReLU unit whose pre-activation is negative for *every* input outputs zero for every input, and — because its derivative is zero there — receives zero gradient for every input. Its weights never change again. **The neuron is dead**, and nothing in ordinary training brings it back. The reference names two causes: a learning rate large enough to push the weights into the negative region in one step, and an initialisation that starts too many pre-activations negative." },

    { t: "code", lang: "python", title: "Dead units, counted: one random layer with an increasingly negative bias",
      code: `import torch, torch.nn.functional as F
torch.manual_seed(0)
x = torch.randn(1000, 100)                 # 1,000 inputs of 100 features
W = torch.randn(100, 100) * 0.5
for b in [0.0, -2.0, -5.0]:
    a = F.relu(x @ W + b)
    print(f"bias {b:+.0f}: fraction of zero activations {(a == 0).float().mean():.3f}")`,
      caption: "With a zero bias half the activations are zero, which is normal for ReLU. A bias of −5 pushes 84 % of them to zero; units whose pre-activation is negative for all 1,000 inputs will never learn." },

    { t: "out", text: `bias +0: fraction of zero activations 0.501
bias -2: fraction of zero activations 0.659
bias -5: fraction of zero activations 0.841` },

    { t: "dl", items: [
      ["Detection", "Log the fraction of zero activations per layer during training. Around 50 % is healthy for ReLU; consistently above 50 % and rising means units are dying."],
      ["Fix 1 — lower the learning rate", "The most common cause is a step so large that a unit's weights jump into the always-negative region. Halve the rate and watch the fraction."],
      ["Fix 2 — Leaky ReLU, ELU or GELU", "A non-zero gradient on the negative side (0.01 for Leaky ReLU, αeᶻ for ELU, a smooth curve for GELU) means a unit can always recover."],
      ["Fix 3 — He initialisation", "Designed for ReLU (lesson 1.6): variance 2/fan_in keeps pre-activations at a scale where roughly half are positive, layer after layer."],
      ["Fix 4 — batch normalisation", "Centres each unit's pre-activation across the batch (lesson 1.8), so no unit can drift into the negative region for every input."]
    ] },

    { t: "callout", kind: "trap", title: "A dying network looks like a slow one",
      body: [{ t: "p", text: "The symptom is a loss that falls at first and then stalls well above where it should, or a training accuracy that plateaus early. Nothing errors. The only way to see it is to measure the activations — which is why the debugging lesson (1.12) puts activation statistics on the checklist." }] },

    { t: "exercise", kind: "practice", title: "The 0.25 ceiling", difficulty: "foundation", minutes: 12,
      body: [{ t: "p", text: "Using the derivative column, work out the largest possible factor by which a gradient can be scaled as it passes back through (a) one sigmoid layer, (b) five sigmoid layers, (c) five tanh layers, (d) five ReLU layers, ignoring the weight matrices. Then confirm (a) numerically by evaluating σ′(z) = σ(z)(1 − σ(z)) at z = 0, 1 and 3." }],
      requirements: [
        "State the maximum of each activation's derivative",
        "Raise it to the fifth power for the five-layer cases",
        "Compute σ′ at the three points and check it never exceeds 0.25"
      ],
      hint: "σ′(z) = σ(z)(1 − σ(z)) is largest where σ(z) = 0.5, which is z = 0.",
      solution: { lang: "python", title: "Solution",
        code: `import torch
z = torch.tensor([0.0, 1.0, 3.0]); s = torch.sigmoid(z)
print(s * (1 - s))              # tensor([0.2500, 0.1966, 0.0452])
print(0.25 ** 5, 1.0 ** 5)      # 0.0009765625 1.0
# (a) 0.25  (b) 0.25^5 ≈ 0.001  (c) tanh' ≤ 1, so ≤ 1 — but only exactly at z = 0
# (d) ReLU' = 1 wherever the unit is active, so the factor is 1 at any depth`,
        notes: [{ t: "p", text: "Five sigmoid layers scale a gradient by at most a thousandth before the weights even get involved; five ReLU layers scale it by exactly 1 along any path of active units. That single comparison is most of the story of why ReLU made deep networks trainable." }] } }
  ],

  takeaways: [
    "Without an activation, W₂(W₁x + b₁) + b₂ is one linear layer; the non-linearity is the only reason depth adds anything.",
    "The derivative column is what matters for training: sigmoid′ ≤ 0.25 and tanh′ ≤ 1, both vanishing far from zero; ReLU′ is exactly 1 or exactly 0.",
    "Hidden layers: ReLU by default, Leaky ReLU or ELU when units die, GELU in transformers, SiLU in modern CNNs.",
    "Output layers are fixed by the loss: sigmoid for binary, softmax for one-of-many, sigmoid per class for multi-label, linear for regression.",
    "Softmax turns a vector of logits into a distribution and has a Jacobian, not a scalar derivative; PyTorch's CrossEntropyLoss applies it internally to raw logits.",
    "A dead ReLU has a negative pre-activation for every input and a zero gradient forever; detect it by counting zero activations, fix it with a lower learning rate, a leaky activation, He initialisation or batch norm."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What is the maximum value of the sigmoid's derivative, and where is it reached?",
      options: ["1, at z = 0", "0.5, at z = 0", "0.25, at z = 0", "0.25, as z → ∞"],
      answer: 2,
      why: "σ′(z) = σ(z)(1 − σ(z)) is a product of two numbers summing to 1, which is largest when both are 0.5 — at z = 0 — giving 0.25. Far from zero one factor goes to 0 and the derivative vanishes, which is the source of vanishing gradients through sigmoid layers." },
    { stem: "A multi-label image tagger predicts whether each of 20 tags applies. What output activation should it use?",
      options: ["Softmax over the 20 tags", "A sigmoid per tag", "ReLU per tag", "Tanh per tag"],
      answer: 1,
      why: "Softmax forces the 20 outputs to sum to 1, which encodes 'exactly one tag applies'. Independent sigmoids give each tag its own probability, which is what multi-label means; the matching loss is binary cross-entropy per tag." },
    { stem: "Why does a dead ReLU stay dead?",
      options: ["Its weights are frozen by the optimiser", "Its output is zero and its derivative is zero, so no gradient ever reaches its weights", "ReLU has no bias term", "The learning rate decays to zero"],
      answer: 1,
      why: "For a unit whose pre-activation is negative on every input, ReLU outputs 0 and its derivative is 0, so the chain rule delivers zero gradient to that unit's weights on every example. With nothing to move them, they never change, and the pre-activation stays negative." },
    { stem: "Which activation would you expect inside a transformer's feed-forward block?",
      options: ["Sigmoid", "Softmax", "GELU", "Tanh"],
      answer: 2,
      why: "GELU — z·Φ(z), a smooth relative of ReLU — is the reference's stated default for transformers (BERT, GPT). Softmax appears in the attention weights, not in the feed-forward non-linearity; sigmoid and tanh saturate and are avoided in deep hidden layers." }
  ] },

  interview: { title: "Interview", sub: "What a senior interviewer asks about activations", questions: [
    { level: "Core", q: "Why does ReLU help against vanishing gradients? Show it formally.",
      strong: "Its derivative is 1 on the active side, so the activation contributes no shrinkage to the gradient product.",
      answer: [{ t: "p", text: "Backpropagation multiplies, layer by layer, the activation's derivative into the gradient: ∂L/∂z⁽ˡ⁾ = (W⁽ˡ⁺¹⁾)ᵀ δ⁽ˡ⁺¹⁾ ⊙ g′(z⁽ˡ⁾). For sigmoid, g′ ≤ 0.25, so through L layers the activation factor alone is ≤ 0.25ᴸ. For ReLU, g′ = 1 wherever z > 0, so along any path of active units the activation contributes a factor of exactly 1 at every depth; only the weight matrices scale the gradient, and He initialisation (lesson 1.6) keeps them near unit gain. The price is g′ = 0 on the inactive side — the dying-ReLU problem." }] },
    { level: "Core", q: "Compare ReLU, sigmoid and tanh for a hidden layer.",
      strong: "ReLU by default; sigmoid is not zero-centred and saturates; tanh is zero-centred but still saturates.",
      answer: [{ t: "p", text: "Sigmoid maps to (0, 1): outputs are all positive, so the next layer's gradients on its weights all share a sign, which zig-zags optimisation, and its derivative is ≤ 0.25 so gradients vanish with depth. Tanh maps to (−1, 1): zero-centred, derivative ≤ 1, but it saturates to ±1 with derivative near zero — 0.0099 at |z| = 3. ReLU is max(0, z): cheap, no saturation on the positive side, derivative exactly 1 there, sparse activations; its weakness is dead units, addressed by Leaky ReLU, ELU, GELU, He initialisation or a smaller learning rate." }] },
    { level: "Senior", q: "How would you detect and fix the dying-ReLU problem in a network that trains slowly?",
      strong: "Measure the zero-activation fraction per layer; then lower the learning rate, switch to a leaky activation, fix the initialisation, or add batch norm.",
      answer: [{ t: "p", text: "Add a hook that records, per layer, the fraction of activations equal to zero on a validation batch. Around half is normal for ReLU; a layer sitting at 80–90 % and not recovering is dying. The usual cause is a learning rate that knocked the weights into the always-negative region early, or an initialisation with too many negative pre-activations. In order of cheapness: lower the learning rate (or add warm-up), switch to Leaky ReLU, ELU or GELU so the negative side carries gradient, use He initialisation, and add batch normalisation before the activation so pre-activations stay centred. Re-run and watch the fraction return to ~50 %." }] }
  ] }
});

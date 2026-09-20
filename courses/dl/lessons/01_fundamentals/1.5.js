/* ============================================================================
   LESSON 1.5 — Optimisers: SGD to AdamW
   Mirrors 01_Neural_Network_Fundamentals.md · §6 (SGD with Momentum, Adam,
   AdamW, RMSprop, Nesterov, the Adam+L2 ≠ AdamW note, optimiser selection
   and default hyperparameters) and §21 Q3. Every update rule is worked by
   hand on one parameter and checked against torch.optim.
   ========================================================================= */
EC.receiveLesson({
  id: "1.5",

  lede: "**An optimiser turns a gradient into a parameter update, and the rules differ in how much history they keep and whether every parameter gets the same step.** Plain SGD subtracts the gradient. Momentum keeps a running average of gradients so consistent directions accelerate and oscillating ones cancel. RMSprop divides by a running average of squared gradients so every parameter moves at about the same rate. Adam does both, with a correction for the first steps, and AdamW moves weight decay out of the adaptive machinery so it works as a regulariser again. This lesson writes each rule out, carries it through three steps by hand on a single parameter, checks the arithmetic against `torch.optim`, and shows on numbers why Adam with L2 is not AdamW.",

  objectives: [
    "Write the update rules for SGD, SGD with momentum, Nesterov, RMSprop, Adam and AdamW",
    "Carry Adam through three steps by hand — m, v, the bias corrections, the step — and reproduce PyTorch's result to six decimals",
    "Explain why Adam's step size is roughly the learning rate regardless of gradient scale, and what the bias correction fixes",
    "Show on numbers why L2 regularisation inside Adam is not weight decay, and what AdamW changes",
    "Pick an optimiser and its defaults for a baseline, for fine-tuning, and for the case where Adam generalises worse than SGD"
  ],

  prerequisites: ["1.4"],

  blocks: [

    { t: "h2", n: "01", text: "From the gradient to the update", id: "sgd" },

    { t: "p", text: "Lesson 1.4 ended with one step of gradient descent: θ ← θ − α∇L. That is stochastic gradient descent when ∇L is computed on a mini-batch rather than the whole dataset, and every optimiser below is a modification of that one line. The modifications answer two questions: *should the step remember previous gradients?* (momentum) and *should every parameter take the same size of step?* (adaptive methods)." },

    { t: "h3", text: "SGD with momentum" },

    { t: "math", tex: "v_t = \\beta\\, v_{t-1} + (1-\\beta)\\,\\nabla_\\theta \\mathcal{L}, \\qquad \\theta_t = \\theta_{t-1} - \\alpha\\, v_t" },

    { t: "p", text: "The velocity v is an exponential moving average of gradients with decay β, typically 0.9. Along a direction where successive gradients agree, v grows towards the gradient and the step is full size; along a direction where they alternate sign, v averages towards zero and the oscillation is damped. That is the whole trick, and it is the reason momentum crosses a narrow valley faster than plain SGD." },

    { t: "h3", text: "Nesterov accelerated gradient" },

    { t: "math", tex: "v_t = \\gamma\\, v_{t-1} + \\eta\\,\\nabla L(\\theta_t - \\gamma v_{t-1}), \\qquad \\theta_{t+1} = \\theta_t - v_t" },

    { t: "p", text: "Look-ahead momentum: the gradient is evaluated at the position the momentum is about to carry you to, θ − γv, rather than where you are. If the momentum is about to overshoot, the look-ahead gradient already points back, so the correction arrives one step earlier. It is the choice when SGD with momentum oscillates." },

    { t: "h3", text: "RMSprop" },

    { t: "math", tex: "v_t = \\beta\\, v_{t-1} + (1-\\beta)\\, g_t^2, \\qquad \\theta_{t+1} = \\theta_t - \\frac{\\eta}{\\sqrt{v_t + \\epsilon}}\\, g_t" },

    { t: "p", text: "Here v tracks the *squared* gradient, and the step divides by its square root, so a parameter with consistently large gradients takes small steps and one with tiny gradients takes large ones — every parameter moves at about the rate η. AdaGrad did this with a cumulative sum, which shrank every step towards zero over time; RMSprop's moving average fixes that. Typical settings β = 0.9, η = 0.001, ε = 10⁻⁸." },

    { t: "h3", text: "Adam" },

    { t: "math", tex: "m_t = \\beta_1 m_{t-1} + (1-\\beta_1)\\, g_t, \\qquad v_t = \\beta_2 v_{t-1} + (1-\\beta_2)\\, g_t^2" },
    { t: "math", tex: "\\hat m_t = \\frac{m_t}{1-\\beta_1^t}, \\qquad \\hat v_t = \\frac{v_t}{1-\\beta_2^t}, \\qquad \\theta_t = \\theta_{t-1} - \\frac{\\alpha\\, \\hat m_t}{\\sqrt{\\hat v_t} + \\epsilon}" },

    { t: "p", text: "Momentum's first moment m and RMSprop's second moment v, together. The hats are the bias correction: both averages start at zero, so for the first steps m and v are biased towards zero by a factor (1 − βᵗ); dividing by that factor removes the bias, which matters most at t = 1, where 1 − β₂ = 0.001 would otherwise make the very first v a thousand times too small." },

    { t: "viz", title: "One Adam step, as a flow",
      caption: "The gradient feeds two moving averages. The first is a smoothed direction; the second a smoothed scale. After bias correction, the step is the direction divided by the scale, times the learning rate — so its size is about α however large or small the raw gradient is.",
      svg: `<svg viewBox="0 0 760 230" role="img" aria-label="Adam update as a data flow">
<defs><marker id="ah15" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<g>
  <rect x="20" y="88" width="90" height="54" rx="10" class="s-fill s-stroke" stroke-width="1.4"/><text x="65" y="112" text-anchor="middle" class="s-label">gradient gₜ</text><text x="65" y="130" text-anchor="middle" class="s-sub">from backprop</text>
  <line x1="110" y1="104" x2="178" y2="60" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah15)"/>
  <line x1="110" y1="126" x2="178" y2="170" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah15)"/>
  <rect x="180" y="30" width="170" height="58" rx="10" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)" stroke-width="1.4"/><text x="265" y="54" text-anchor="middle" class="s-label">m ← β₁m + (1−β₁)g</text><text x="265" y="74" text-anchor="middle" class="s-sub">first moment: smoothed direction</text>
  <rect x="180" y="142" width="170" height="58" rx="10" style="fill:var(--warn);fill-opacity:.14;stroke:var(--warn)" stroke-width="1.4"/><text x="265" y="166" text-anchor="middle" class="s-label">v ← β₂v + (1−β₂)g²</text><text x="265" y="186" text-anchor="middle" class="s-sub">second moment: smoothed scale</text>
  <line x1="350" y1="59" x2="408" y2="59" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah15)"/>
  <line x1="350" y1="171" x2="408" y2="171" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah15)"/>
  <rect x="410" y="36" width="120" height="46" rx="10" class="s-fill s-stroke" stroke-width="1.4"/><text x="470" y="56" text-anchor="middle" class="s-label">m̂ = m / (1−β₁ᵗ)</text><text x="470" y="72" text-anchor="middle" class="s-sub">bias correction</text>
  <rect x="410" y="148" width="120" height="46" rx="10" class="s-fill s-stroke" stroke-width="1.4"/><text x="470" y="168" text-anchor="middle" class="s-label">v̂ = v / (1−β₂ᵗ)</text><text x="470" y="184" text-anchor="middle" class="s-sub">bias correction</text>
  <line x1="530" y1="59" x2="598" y2="104" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah15)"/>
  <line x1="530" y1="171" x2="598" y2="126" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#ah15)"/>
  <rect x="600" y="84" width="140" height="62" rx="10" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="1.4"/><text x="670" y="108" text-anchor="middle" class="s-label">θ ← θ − α m̂ / (√v̂ + ε)</text><text x="670" y="128" text-anchor="middle" class="s-sub">step ≈ α in size</text>
</g></svg>` },

    { t: "h3", text: "AdamW" },

    { t: "math", tex: "\\theta_t = \\theta_{t-1} - \\alpha\\left(\\frac{\\hat m_t}{\\sqrt{\\hat v_t}+\\epsilon} + \\lambda\\,\\theta_{t-1}\\right)" },

    { t: "p", text: "Weight decay, λθ, added to the *step* rather than to the gradient. The difference sounds cosmetic and is not; section 03 shows it on numbers." },

    { t: "h2", n: "02", text: "Each rule by hand, and checked", id: "worked" },

    { t: "p", text: "One parameter, starting at θ = 1.0, receiving the gradients 2.0, 1.5 and −0.5 on three successive steps. Every rule is written out from its formula and the Adam result is compared against `torch.optim.Adam` given the same three gradients:" },

    { t: "code", lang: "python", title: "Three steps of each optimiser on one parameter",
      code: `import numpy as np, torch
g_seq = [2.0, 1.5, -0.5]

th = 1.0; print(" SGD (α=0.1):", end="")
for g in g_seq: th -= 0.1 * g; print(f" {th:.4f}", end="")
print()

th, v = 1.0, 0.0; print(" SGD+momentum (α=0.1, β=0.9):", end="")
for g in g_seq: v = 0.9 * v + 0.1 * g; th -= 0.1 * v; print(f" v={v:.4f} θ={th:.4f}", end=" |")
print()

th, v = 1.0, 0.0; print(" RMSprop (η=0.001, β=0.9):", end="")
for g in g_seq: v = 0.9 * v + 0.1 * g * g; th -= 0.001 / np.sqrt(v + 1e-8) * g; print(f" v={v:.4f} θ={th:.4f}", end=" |")
print()

th, m, v = 1.0, 0.0, 0.0; print(" Adam (α=0.001):", end="")
for t, g in enumerate(g_seq, 1):
    m = 0.9 * m + 0.1 * g;  v = 0.999 * v + 0.001 * g * g
    mh = m / (1 - 0.9 ** t); vh = v / (1 - 0.999 ** t)
    th -= 0.001 * mh / (np.sqrt(vh) + 1e-8)
    print(f" m={m:.4f} v={v:.5f} m̂={mh:.4f} v̂={vh:.4f} θ={th:.6f}", end=" |")
print()

p = torch.nn.Parameter(torch.tensor([1.0])); opt = torch.optim.Adam([p], lr=0.001)
for g in g_seq:
    opt.zero_grad(); p.grad = torch.tensor([g]); opt.step()
print(f" torch.optim.Adam after the same three gradients: θ = {p.item():.6f}")`,
      caption: "The hand-written Adam lands on 0.997398 and so does PyTorch's. Note the bias correction at t = 1: m = 0.2 but m̂ = 2.0, the actual gradient; v = 0.004 but v̂ = 4.0, its square. Without the hats the first step would be 0.001 × 0.2 / √0.004 = 0.0032, three times too large." },

    { t: "out", text: ` SGD (α=0.1): 0.8000 0.6500 0.7000
 SGD+momentum (α=0.1, β=0.9): v=0.2000 θ=0.9800 | v=0.3300 θ=0.9470 | v=0.2470 θ=0.9223 |
 RMSprop (η=0.001, β=0.9): v=0.4000 θ=0.9968 | v=0.5850 θ=0.9949 | v=0.5515 θ=0.9955 |
 Adam (α=0.001): m=0.2000 v=0.00400 m̂=2.0000 v̂=4.0000 θ=0.999000 | m=0.3300 v=0.00625 m̂=1.7368 v̂=3.1246 θ=0.998017 | m=0.2470 v=0.00649 m̂=0.9114 v̂=2.1654 θ=0.997398 |
 torch.optim.Adam after the same three gradients: θ = 0.997398` },

    { t: "p", text: "Three observations. **SGD** moves by 0.1 × gradient, so the third step, with a negative gradient, walks back. **Momentum** at the third step still moves *down* (v = 0.247 > 0) even though the gradient turned negative — the history outweighs one contrary gradient, which is what damps oscillation. **Adam's** steps are 0.001000, 0.000983, 0.000619 — all close to α = 0.001 despite gradients of 2.0, 1.5 and −0.5, because the step is m̂ / √v̂, a ratio of two quantities with the same units. That scale-invariance is why Adam's default learning rate transfers across problems and SGD's does not." },

    { t: "callout", kind: "trap", title: "PyTorch's momentum is not the reference's formula",
      body: "The reference writes v = βv + (1 − β)g. `torch.optim.SGD(momentum=0.9)` uses v = βv + g, without the (1 − β) factor — so the same learning rate gives steps up to ten times larger. Run the three gradients through it and θ ends at 0.2230 rather than 0.9223. Both are momentum; the learning rates are simply on different scales, and a value copied from a paper that used one convention will be wrong by 1/(1 − β) in the other." },

    { t: "h2", n: "03", text: "Adam + L2 is not AdamW", id: "adamw" },

    { t: "p", text: "L2 regularisation adds λθ to the gradient; weight decay subtracts αλθ from the parameter. With plain SGD these are the same thing. With Adam they are not, because the gradient — now including the λθ term — is divided by √v̂ before it is applied. A parameter with large gradients has a large √v̂ and its decay term is divided down to almost nothing; a parameter with tiny gradients has its decay term amplified. The regularisation strength becomes a function of the gradient scale, which is not what anyone asked for." },

    { t: "code", lang: "python", title: "Two parameters, one large gradient and one small, decayed both ways",
      code: `import numpy as np, torch
# θ = [1, 1]; parameter 1 always sees gradient 10, parameter 2 always sees 0.01; λ = 0.1, lr = 0.01
for name in ["Adam+L2", "AdamW"]:
    th = np.array([1.0, 1.0]); m = np.zeros(2); v = np.zeros(2)
    for t in range(1, 101):
        g = np.array([10.0, 0.01])
        if name == "Adam+L2": g = g + 0.1 * th                       # decay inside the gradient
        m = 0.9 * m + 0.1 * g; v = 0.999 * v + 0.001 * g ** 2
        mh = m / (1 - 0.9 ** t); vh = v / (1 - 0.999 ** t)
        th = th - 0.01 * (mh / (np.sqrt(vh) + 1e-8) + (0.1 * th if name == "AdamW" else 0))   # decay on the step
    print(f" {name:8s}: θ after 100 steps = {th}")

for cls, kw in [(torch.optim.Adam, dict(weight_decay=0.1)), (torch.optim.AdamW, dict(weight_decay=0.1))]:
    p = torch.nn.Parameter(torch.tensor([1.0, 1.0])); opt = cls([p], lr=0.01, **kw)
    for _ in range(100):
        opt.zero_grad(); p.grad = torch.tensor([10.0, 0.01]); opt.step()
    print(f" torch {cls.__name__:6s}: θ = {p.detach().numpy()}")`,
      caption: "PyTorch's Adam(weight_decay=λ) is the L2-in-the-gradient form and AdamW(weight_decay=λ) the decoupled form; the hand-written loops reproduce both to four decimals." },

    { t: "out", text: ` Adam+L2 : θ after 100 steps = [0.0017 0.1998]
 AdamW   : θ after 100 steps = [-0.0473 -0.0473]
 torch Adam  : θ = [0.0017 0.1998]
 torch AdamW : θ = [-0.0473 -0.0473]` },

    { t: "p", text: "With **AdamW** both parameters end in the same place: the decay λθ is applied to each directly, and the adaptive step (about 0.01 per step towards the gradient's sign for both, since Adam normalises the scale away) is the same for both. With **Adam + L2** the two parameters diverge: for the first, the decay term 0.1θ is swamped by the gradient of 10 and normalised away — it received almost no regularisation; for the second, 0.1θ is ten times larger than its gradient of 0.01, so the 'regulariser' *is* the update, and it crawls towards −g/λ = −0.1 at a fixed 0.01 per step. Same λ, two completely different effective strengths. AdamW is the standard for fine-tuning transformers for exactly this reason." },

    { t: "h2", n: "04", text: "Choosing an optimiser", id: "choose" },

    { t: "table", head: ["Situation", "Choice", "Defaults"],
      rows: [
        ["Baseline, most tasks", "**Adam**", "lr = 10⁻³, β₁ = 0.9, β₂ = 0.999, ε = 10⁻⁸"],
        ["Fine-tuning a pretrained model, transformers", "**AdamW**", "lr = 10⁻⁵ to 5 × 10⁻⁵, weight_decay = 0.01"],
        ["Very large batches", "LAMB or LARS", "layer-wise adaptive rates"],
        ["Final training of a CNN, when Adam generalises poorly", "**SGD + momentum + cosine schedule**", "lr = 0.01–0.1, momentum = 0.9"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Adam versus SGD, as the reference frames it",
      body: "Adam: adaptive per-parameter rates, fast convergence, a good default, robust to the learning rate. SGD with momentum: one global rate that needs tuning and a schedule, but often *generalises better* — it is empirically observed to find flatter minima. Use Adam to prototype and for transformers; use SGD for the final training of convolutional networks when you can afford the tuning; use AdamW when fine-tuning." },

    { t: "exercise", kind: "practice", title: "RMSprop by hand, then Adam's ε", difficulty: "core", minutes: 15,
      body: [{ t: "p", text: "(a) Carry RMSprop through the three gradients 2.0, 1.5, −0.5 by hand with β = 0.9 and η = 0.01 (not 0.001), starting at θ = 1.0, and confirm with `torch.optim.RMSprop(lr=0.01, alpha=0.9)`. (b) Then explain what happens to Adam's step when a parameter's gradient is exactly zero for many steps and ε were also zero." }],
      requirements: [
        "Show v and θ after each of the three steps",
        "Match PyTorch to four decimals",
        "Answer (b) in two sentences"
      ],
      hint: "PyTorch's RMSprop uses v = αv + (1 − α)g² with `alpha` as the decay, and divides by √v + ε (ε outside the root), which differs from the reference's √(v + ε) only at the 10⁻⁸ level.",
      solution: { lang: "python", title: "Solution",
        code: `import numpy as np, torch
th, v = 1.0, 0.0
for g in [2.0, 1.5, -0.5]:
    v = 0.9 * v + 0.1 * g * g; th -= 0.01 / np.sqrt(v + 1e-8) * g; print(f"v={v:.4f} θ={th:.4f}")
# v=0.4000 θ=0.9684 | v=0.5850 θ=0.9488 | v=0.5515 θ=0.9555
p = torch.nn.Parameter(torch.tensor([1.0])); opt = torch.optim.RMSprop([p], lr=0.01, alpha=0.9)
for g in [2.0, 1.5, -0.5]:
    opt.zero_grad(); p.grad = torch.tensor([g]); opt.step()
print(p.item())   # 0.9555`,
        notes: [{ t: "p", text: "(b) With g = 0 for long enough, both m and v decay towards zero; the step m̂/(√v̂ + ε) becomes 0/0 without ε, and with ε = 10⁻⁸ becomes a well-defined 0. ε is there for that ratio's stability, and raising it (10⁻⁶ or 10⁻⁴) is a known fix when Adam takes wild steps on parameters with tiny, noisy gradients." }] } }
  ],

  takeaways: [
    "Every optimiser is θ ← θ − (something built from gradients); momentum adds a moving average of gradients, adaptive methods divide by a moving average of their squares.",
    "Momentum damps oscillation because alternating gradients average towards zero while consistent ones accumulate; Nesterov evaluates the gradient at the look-ahead point.",
    "RMSprop divides by √v so every parameter moves at about η; Adam combines it with momentum and bias-corrects both averages so the first steps are not a thousand times too small.",
    "Adam's step is about α regardless of gradient scale — the three hand-worked steps were 0.00100, 0.00098, 0.00062 for gradients 2.0, 1.5, −0.5 — which is why its default learning rate transfers.",
    "L2 inside Adam is divided by √v̂ and becomes strong on small-gradient parameters and invisible on large-gradient ones; AdamW applies λθ to the step and decays all parameters equally.",
    "Defaults: Adam lr 10⁻³ as the baseline; AdamW lr 10⁻⁵–5 × 10⁻⁵, weight decay 0.01 for fine-tuning; SGD + momentum 0.9 + cosine when Adam generalises worse."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does Adam divide the bias-corrected first moment by the square root of the bias-corrected second moment?",
      options: ["To make the step larger when gradients are large", "So that each parameter's step is about α regardless of the scale of its gradients", "To add momentum", "To implement weight decay"],
      answer: 1,
      why: "m̂ has the units of the gradient and √v̂ has the same units, so their ratio is scale-free and of order 1; multiplied by α, the step is about α for every parameter. Large-gradient parameters are slowed and tiny-gradient parameters sped up, which is the adaptive part of Adam." },
    { stem: "What does Adam's bias correction fix?",
      options: ["Numerical overflow in v", "The moving averages starting at zero, which biases the first steps' m and v towards zero", "The sign of the gradient", "The learning-rate schedule"],
      answer: 1,
      why: "Both averages are initialised at zero and decay slowly, so after t steps they are scaled down by (1 − βᵗ). Dividing by that factor recovers unbiased estimates; at t = 1 it turns m = 0.2 into m̂ = 2.0 and v = 0.004 into v̂ = 4.0, the actual gradient and its square." },
    { stem: "Two parameters are regularised with the same λ under Adam with L2 in the gradient. One has consistently large gradients, one tiny. Which is regularised more strongly?",
      options: ["Both equally", "The large-gradient parameter", "The tiny-gradient parameter", "Neither is regularised"],
      answer: 2,
      why: "The λθ term is added to the gradient and then divided by √v̂. For the large-gradient parameter √v̂ is large and the decay is divided down to almost nothing; for the tiny-gradient one the decay term dominates the gradient and drives the update. AdamW applies λθ outside the normalisation so both decay equally." },
    { stem: "Which optimiser and setting does the reference recommend for fine-tuning a transformer?",
      options: ["SGD, lr 0.1", "Adam, lr 10⁻³", "AdamW, lr 10⁻⁵ to 5 × 10⁻⁵, weight decay 0.01", "RMSprop, lr 10⁻²"],
      answer: 2,
      why: "Fine-tuning moves a pretrained model a short distance, so the learning rate is a hundred times smaller than a from-scratch Adam default, and decoupled weight decay keeps the regularisation honest across parameters with very different gradient scales. AdamW at 10⁻⁵–5 × 10⁻⁵ is the standard." }
  ] },

  interview: { title: "Interview", sub: "The reference's Q3, and where it leads", questions: [
    { level: "Core", q: "Compare Adam and SGD. When would you prefer each?",
      strong: "Adam for a fast, robust default and for transformers; SGD with momentum and a schedule for the best generalisation on CNNs when you can afford to tune it; AdamW for fine-tuning.",
      answer: [{ t: "p", text: "Adam keeps per-parameter adaptive learning rates from a second-moment estimate plus momentum from a first-moment estimate, so it converges quickly with the defaults lr = 10⁻³, β = (0.9, 0.999) and is forgiving of the learning rate. SGD with momentum has one global rate, needs tuning and a schedule, but is repeatedly observed to generalise better — it tends to settle in flatter minima. In practice: Adam for prototyping and for transformers, SGD + momentum + cosine for the final training of convolutional networks, and AdamW — decoupled weight decay — as the standard for fine-tuning pretrained models." }] },
    { level: "Core", q: "Derive SGD, RMSprop and Adam from each other.",
      strong: "SGD steps along −g; RMSprop divides by an EMA of g²; Adam replaces g with an EMA of g and bias-corrects both averages.",
      answer: [{ t: "p", text: "SGD: θ ← θ − αg. RMSprop keeps v ← βv + (1 − β)g² and steps θ ← θ − η g / √(v + ε), so each coordinate is normalised by its recent gradient magnitude. Adam adds m ← β₁m + (1 − β₁)g as a smoothed gradient, uses v as RMSprop does with β₂ = 0.999, corrects both for their zero initialisation (m̂ = m/(1 − β₁ᵗ), v̂ = v/(1 − β₂ᵗ)), and steps θ ← θ − α m̂/(√v̂ + ε). Set β₁ = 0 and drop the corrections and Adam is RMSprop; set v ≡ 1 and it is SGD with momentum." }] },
    { level: "Senior", q: "Your fine-tuned model overfits even with weight_decay=0.1 in Adam. What is going on?",
      strong: "Adam's weight_decay is L2 in the gradient, normalised away on the parameters with large gradients; switch to AdamW.",
      answer: [{ t: "p", text: "In torch.optim.Adam the weight_decay argument adds λθ to the gradient before the adaptive normalisation, so on parameters with large gradients — typically the ones doing the fitting — the decay is divided by a large √v̂ and has almost no effect, while on near-static parameters it dominates. The regularisation you set is not the regularisation you get. AdamW applies λθ to the parameter directly, independently of gradient scale, so every weight decays at the same rate; it is the standard for fine-tuning. Also check that the decay is not being applied to biases and normalisation parameters, which are usually excluded, and that the learning rate is in the 10⁻⁵ range appropriate for fine-tuning." }] }
  ] }
});

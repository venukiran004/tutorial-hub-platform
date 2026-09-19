/* ============================================================================
   LESSON 1.5 — Optimisers, SGD to AdamW
   ========================================================================= */
EC.receiveLesson({
  id: "1.5",

  lede: "**Every optimiser is gradient descent with a memory: momentum remembers the direction, RMSProp remembers the scale, Adam remembers both, and AdamW remembers to keep weight decay out of the memory.** On a quadratic valley a hundred times longer than it is wide, plain SGD at its largest stable learning rate is still 1.47 from the minimum after a hundred steps, Nesterov momentum is within 0.007, and Adam takes steps of exactly its learning rate in every coordinate whatever the gradient's scale. On a real network the differences shrink to a few tenths of a point — until weight decay is added to Adam the wrong way and accuracy falls from 0.977 to 0.798.",

  objectives: [
    "Write the update rules for SGD, momentum, Nesterov, Adagrad, RMSProp, Adam and AdamW, and implement three of them to match PyTorch step for step",
    "Explain the stability limit of gradient descent on a quadratic and why momentum accelerates along low-curvature directions",
    "Read batch size as a trade between gradient quality and update count, from measured cosine similarities and accuracies",
    "Show why Adam needs bias correction and why L2 inside Adam is not weight decay",
    "Place LARS, LAMB, SAM and second-order methods, and choose an optimiser for a stated training run"
  ],

  prerequisites: ["1.4"],

  blocks: [

    { t: "h2", n: "01", text: "Gradient descent and its stability limit", id: "gd" },

    { t: "p", text: "The update is θ ← θ − η∇L(θ). On a quadratic 0.5(x² + 100y²) the gradient is (x, 100y) and the update multiplies y by (1 − 100η) each step: for |1 − 100η| < 1 it converges, and η = 2/100 = 0.02 is the edge. The x direction, with curvature 1, decays by only (1 − η) per step. That gap — the condition number, 100 here — is what makes plain descent slow:" },

    { t: "code", lang: "text", title: "SGD on 0.5(x² + 100y²) from (10, 1) (executed)",
      code: `lr = 0.0199   y after 200 steps = 0.134      factor per step 1 − 100·lr = −0.9900   (oscillating, decaying)
lr = 0.0200   y after 200 steps = 1.000      factor −1.0000: y flips sign forever
lr = 0.0201   y after 200 steps = 7.316      factor −1.0100: diverging
lr = 0.021    loss after 100 steps = 7.9 × 10⁹

best stable lr (0.019), 100 steps:  loss 1.12, position (1.4686, 0.0000)
   -- y is dead in a dozen steps; x has decayed only by (1 − 0.019)^100 = 0.147, from 10 to 1.47`,
      caption: "The learning rate is capped by the steepest direction and the progress is set by the flattest. Ill-conditioning is the normal state of a neural-network loss surface, and everything after SGD on this page is a way around it." },

    { t: "h2", n: "02", text: "The update rules", id: "rules" },

    { t: "code", lang: "text", title: "Seven optimisers, one line each (g = ∇L at the current step)",
      code: `SGD            θ ← θ − η g
Momentum       v ← βv + g;                    θ ← θ − η v                       β = 0.9   (PyTorch's convention)
Nesterov       v ← βv + g(θ − ηβv);           θ ← θ − η v                       gradient taken at the look-ahead point
Adagrad        s ← s + g²;                    θ ← θ − η g / (√s + ε)            per-coordinate; s only grows
RMSProp        s ← αs + (1−α) g²;             θ ← θ − η g / (√s + ε)            α = 0.99: a moving average, so s can shrink
Adam           m ← β₁m + (1−β₁) g;  v ← β₂v + (1−β₂) g²
               m̂ = m / (1−β₁ᵗ);   v̂ = v / (1−β₂ᵗ);      θ ← θ − η m̂ / (√v̂ + ε)   β₁ = 0.9, β₂ = 0.999
AdamW          as Adam, then                  θ ← θ − η λ θ                     decay applied to θ directly, outside m and v`,
      caption: "Momentum accumulates the gradient; the adaptive methods divide by a running root-mean-square of it, so every coordinate takes a step of roughly η regardless of its gradient's scale. Adam does both. The exercise implements momentum, RMSProp and Adam in NumPy and matches PyTorch's trajectory to 7 × 10⁻¹⁶." },

    { t: "p", text: "Here they are on the same quadratic, each at its best learning rate from a grid, 100 steps from (10, 1):" },

    { t: "table", head: ["Optimiser", "Best η", "Loss after 100 steps", "Position", "Steps to loss < 10⁻³"],
      rows: [
        ["SGD", "0.019", "1.12", "(1.469, 0.000)", "never"],
        ["Momentum 0.9", "0.01", "2.0 × 10⁻³", "(−0.026, 0.001)", "95"],
        ["Nesterov 0.9", "0.01", "9.6 × 10⁻⁶", "(−0.007, 0.000)", "25"],
        ["Adagrad", "1.0", "4.0 × 10⁻²", "(0.274, 0.000)", "never"],
        ["RMSProp", "0.1", "0.48", "(0.876, 0.024)", "never"],
        ["Adam", "1.0", "4.8 × 10⁻⁴", "(0.029, −0.002)", "83"]
      ] },

    { t: "p", text: "Momentum wins because the velocity accumulates along x, where the gradient points the same way every step, and cancels along y, where it alternates — an effective learning rate of η/(1 − β) = 10η in the consistent direction and much less in the oscillating one. Nesterov's look-ahead damps the overshoot and reaches 10⁻³ in a quarter of the steps. Adam's story is different: with η = 1.0 it moved *both* coordinates by exactly 1.0 on the first step although their gradients were 10 and 100 — the normalisation by √v̂ makes the step size the learning rate, not the gradient. That is why Adam's default η is 10⁻³ where SGD's is 10⁻¹, and why it is forgiving of badly scaled problems." },

    { t: "code", lang: "text", title: "Rosenbrock (1 − x)² + 100(y − x²)² from (−1.5, 2), 3,000 steps (executed)",
      code: `optimiser   best η    loss @100    loss @1000   final loss   distance to (1, 1)
sgd         0.002     1.0e-03      2.3e-04      9.1e-06      0.0068
momentum    0.002     4.9e-03      4.4e-10      4.8e-13      0.0000
nesterov    0.001     1.2e-01      2.3e-05      4.4e-12      0.0000
adagrad     0.1       5.6e+00      2.3e+00      8.1e-02      0.5661    -- the accumulated s never shrinks; steps die
rmsprop     0.003     5.7e+00      3.5e-01      2.7e-03      0.0598
adam        0.03      5.5e+00      7.7e-03      7.0e-13      0.0000`,
      caption: "On the curved valley momentum and Adam both reach the optimum to twelve decimals; Adagrad stalls at 0.57 away because its denominator only ever grows, which is the flaw RMSProp and Adam fixed with a moving average. Different surfaces rank the methods differently; no optimiser wins everywhere." },

    { t: "h2", n: "03", text: "Batch, mini-batch, stochastic", id: "batch" },

    { t: "p", text: "The gradient over the whole training set is exact and expensive; over one example it is cheap and noisy; a mini-batch is between. Two measurements settle how to think about it — how well a mini-batch gradient agrees with the full one, and what a fixed budget of epochs buys at each size:" },

    { t: "code", lang: "text", title: "Batch size on the digits, SGD η = 0.1, 30 epochs (executed)",
      code: `cosine similarity between a mini-batch gradient and the full-batch gradient (50 draws):
  bs=1     0.126 ± 0.095       bs=16    0.433 ± 0.087       bs=64    0.665 ± 0.067       bs=256   0.898 ± 0.034

bs=    1: updates=37710  time=17.0 s  test acc=0.976   first ≥ 90 %: epoch 4 (5,028 updates)
bs=   16: updates= 2370  time= 1.2 s  test acc=0.974   first ≥ 90 %: epoch 4 (316 updates)
bs=   64: updates=  600  time= 0.3 s  test acc=0.957   first ≥ 90 %: epoch 7 (140 updates)
bs=  256: updates=  150  time= 0.1 s  test acc=0.909   first ≥ 90 %: epoch 25 (125 updates)
bs= 1257: updates=   30  time= 0.0 s  test acc=0.770   never`,
      caption: "A single-example gradient points only 0.126 of the way along the true gradient, yet batch size 1 reached the highest accuracy — because at a fixed epoch count it made 37,710 updates against full-batch's 30. Batch 16 matched it in a fourteenth of the time. Full-batch descent is not wrong; at the same learning rate it simply took thirty steps." },

    { t: "dl", items: [
      ["Batch gradient descent", "Whole dataset per update. Exact gradient, one update per epoch, no noise; memory for the whole set. Slow in updates per unit compute."],
      ["Stochastic (batch 1)", "One example per update. Very noisy (cosine 0.13 here), many updates, no hardware parallelism; the noise is itself a regulariser."],
      ["Mini-batch", "The practice: 16–512 examples. Gradient noise falls as 1/√B, throughput rises with B until the hardware saturates, and the learning rate should rise with B (lesson 1.8) to keep the update count from costing accuracy."]
    ] },

    { t: "h2", n: "04", text: "The race on a real network", id: "race" },

    { t: "table", head: ["Optimiser", "Best η (grid)", "Test accuracy, 3 seeds", "Epoch reaching 90 %"],
      rows: [
        ["SGD", "0.3", "0.971 ± 0.003", "5, 4, 5"],
        ["Momentum 0.9", "0.1", "0.979 ± 0.001", "2, 2, 2"],
        ["Nesterov", "0.1", "0.978 ± 0.003", "2, 2, 2"],
        ["Adagrad", "0.1", "0.980 ± 0.003", "2, 3, 2"],
        ["RMSProp", "0.01", "0.980 ± 0.004", "2, 3, 2"],
        ["Adam", "0.01", "0.980 ± 0.002", "2, 2, 2"],
        ["AdamW, λ = 0.01", "0.01", "0.978 ± 0.004", "2, 2, 2"]
      ] },

    { t: "p", text: "On a small, well-conditioned problem with the learning rate tuned per optimiser, everything except plain SGD lands within a standard deviation of everything else. The practical differences are elsewhere: how sensitive each is to the learning rate (SGD needed 0.3, Adam 0.01, RMSProp 0.01 — three different scales), how they behave on ill-conditioned or sparse problems (the quadratic and Rosenbrock tables), and how weight decay interacts with them." },

    { t: "h2", n: "05", text: "Two things about Adam that are easy to get wrong", id: "adam" },

    { t: "p", text: "**Bias correction.** m and v start at zero and are exponential moving averages, so early on they are biased toward zero — v especially, with β₂ = 0.999. Without correction the first step would be m/√v = 0.1/√0.001 = 3.16 times the learning rate; with correction it is exactly the learning rate:" },

    { t: "code", lang: "text", title: "Adam's first three steps on a constant gradient g = 1 (executed)",
      code: `t=1: m=0.1000  v=0.001000   uncorrected m/√v = 3.1623   corrected m̂/√v̂ = 1.0000
t=2: m=0.1900  v=0.001999   uncorrected      = 4.2496   corrected      = 1.0000
t=3: m=0.2710  v=0.002997   uncorrected      = 4.9502   corrected      = 1.0000`,
      caption: "The correction divides m by 1 − β₁ᵗ and v by 1 − β₂ᵗ, which are what the averages would sum to after t steps of a constant. Without it the first hundred steps take oversized, erratic strides — one reason warmup (1.8) helps Adam even with correction, since v̂ is estimated from very few gradients." },

    { t: "p", text: "**Weight decay.** Adding λθ to the gradient (L2 regularisation) and letting Adam normalise it is not the same as shrinking θ by ηλθ each step. Inside Adam the L2 term is divided by √v̂ like everything else, so weights with small gradient history get a *larger* effective decay and weights with large gradients a smaller one — the opposite of what a regulariser should do. AdamW applies the decay outside the adaptive step:" },

    { t: "code", lang: "text", title: "Coupled L2 against decoupled decay in Adam, digits, η = 0.003, 30 epochs (executed)",
      code: `adam, no decay      acc=0.977 ± 0.002   ‖θ‖=18.54
adam + L2 0.1       acc=0.798 ± 0.006   ‖θ‖= 3.73      -- the decay, normalised by √v̂, crushed the weights
adamw  λ=0.1        acc=0.977 ± 0.002   ‖θ‖=17.20      -- gentle shrinkage, accuracy intact
adamw  λ=0.01       acc=0.976 ± 0.002   ‖θ‖=18.39`,
      caption: "The same nominal coefficient, 0.1, cost eighteen accuracy points as coupled L2 and nothing as decoupled decay. This is the whole content of the AdamW paper (Loshchilov & Hutter, 2019), and it is why weight_decay in torch.optim.Adam and in torch.optim.AdamW mean different things." },

    { t: "h2", n: "06", text: "The rest of the family", id: "family" },

    { t: "dl", items: [
      ["LARS (layer-wise adaptive rate scaling)", "Scales each layer's step by ‖w‖ / ‖g‖ — the trust ratio — so that no layer moves by more than a fraction of its own norm. On the first batch of the digits network the ratios were 32.5 (first weight), 22.8, 7.7 and 2.8 (last bias): a single global learning rate is wrong for at least one of them. Built for SGD at batch sizes of tens of thousands (SimCLR, 7.2)."],
      ["LAMB", "LARS's trust ratio applied to Adam's update; the optimiser that trained BERT at batch 32k. Same idea, adaptive base."],
      ["SAM (sharpness-aware minimisation)", "Two gradient evaluations per step: climb ρ along the gradient to the worst nearby point, take the gradient there, apply it to the original weights. Seeks flat minima. On 200 training digits with a 64-256-256-10 network: ρ = 0 gave 0.929 ± 0.005, ρ = 0.05 gave 0.932 ± 0.005, ρ = 0.1 gave 0.928 — no measurable effect here at double the cost. Its gains are reported on large vision models; do not assume them on small ones."],
      ["Nesterov momentum", "Evaluate the gradient after the momentum step rather than before. On the quadratic it reached 10⁻³ in 25 steps against momentum's 95; the difference on real networks is usually small but the cost is zero."],
      ["Second-order methods", "Newton's step −H⁻¹g solves a quadratic in one step: from (10, 1) with H = diag(1, 100), the step is exactly (−10, −1). The Hessian of a network with 10⁵ parameters has 10¹⁰ entries; L-BFGS approximates it from gradient history and works for full-batch small problems, K-FAC and Shampoo approximate it blockwise. Adam is, loosely, a diagonal second-order method with the curvature estimated from squared gradients."]
    ] },

    { t: "ladder",
      title: "Choosing the optimiser",
      rungs: [
        { level: "bad", label: "Adam with weight_decay=0.1 because both are recommended", code: `torch.optim.Adam(params, lr=1e-3, weight_decay=0.1)     # digits: 0.798`,
          note: "**Coupled L2 in Adam. Eighteen points lost to a keyword argument that means something different in this class.**" },
        { level: "ok", label: "AdamW at 10⁻³ with modest decay, for everything", code: `torch.optim.AdamW(params, lr=1e-3, weight_decay=0.01)    # digits: 0.976–0.978`,
          note: "The correct default for transformers and most fine-tuning; forgiving of scale, few knobs. On vision from scratch it can trail tuned SGD by a fraction of a point." },
        { level: "best", label: "Match the optimiser to the regime, and tune η per optimiser, not once", code: `CNN from scratch          → SGD + Nesterov 0.9, lr ~0.1 with a schedule, wd 5e-4
transformer / fine-tuning → AdamW, lr 1e-4 to 1e-3, warmup, wd 0.01–0.1
very large batch          → LARS (SGD) or LAMB (Adam)
sparse gradients (embeddings) → Adagrad / sparse Adam
always: a learning-rate grid per optimiser -- SGD wanted 0.3, Adam 0.01 on the same network`,
          note: "The race table is flat only because every optimiser got its own grid. One learning rate shared across optimisers is the most common reason a comparison is wrong." }
      ] },

    { t: "viz",
      title: "Why momentum beats descent in a long valley",
      caption: "Contours of 0.5(x² + 100y²). SGD at its largest stable rate oscillates across the narrow axis and creeps along the long one; momentum's velocity cancels the oscillation and accumulates the creep. Positions after 100 steps are the executed values: (1.47, 0) for SGD and (−0.007, 0) for Nesterov.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Elliptical contours with a zigzag SGD path creeping along the long axis and a smoother momentum path reaching the centre.">
  <g style="fill:none;stroke:var(--line)" stroke-width="1">
    <ellipse cx="440" cy="130" rx="380" ry="38"/><ellipse cx="440" cy="130" rx="300" ry="30"/><ellipse cx="440" cy="130" rx="220" ry="22"/><ellipse cx="440" cy="130" rx="140" ry="14"/><ellipse cx="440" cy="130" rx="60" ry="6"/>
  </g>
  <circle cx="440" cy="130" r="3" style="fill:var(--ink)"/>
  <text x="440" y="118" class="s-sub" text-anchor="middle">(0, 0)</text>
  <text x="820" y="150" class="s-sub" text-anchor="middle">x = 10</text>
  <!-- SGD zigzag: start at x=820 (x=10), y offset ±... decaying, x creeping -->
  <polyline points="820,168 800,94 780,164 761,98 742,160 724,102 706,156 688,106 671,152 654,110 638,148 622,114 607,144 592,118 578,140 565,122 552,136 540,126 529,132 519,128 510,130 502,130" fill="none" style="stroke:var(--crit)" stroke-width="1.8"/>
  <circle cx="502" cy="130" r="4" style="fill:var(--crit)"/>
  <text x="560" y="200" class="s-sub" style="fill:var(--crit)">SGD, η = 0.019: still at x = 1.47 after 100 steps</text>
  <!-- momentum: smooth curve into centre with slight overshoot -->
  <path d="M820,168 C760,150 700,138 640,133 C580,129 500,128 445,130" fill="none" style="stroke:var(--good)" stroke-width="2"/>
  <circle cx="445" cy="130" r="4" style="fill:var(--good)"/>
  <text x="560" y="228" class="s-sub" style="fill:var(--good)">Nesterov, η = 0.01: at x = −0.007 after 100 steps</text>
</svg>` },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "On 0.5(x² + 100y²), gradient descent diverged at η = 0.021 and converged at 0.019. What sets the limit, and what does it cost?",
          options: [
            "The starting point",
            "The largest curvature, 100: the y update multiplies by (1 − 100η), which must stay inside (−1, 1), so η < 0.02; at that rate the x direction, with curvature 1, shrinks by only 0.981 per step and was still at 1.47 after a hundred",
            "The gradient's magnitude at the start",
            "Floating-point precision"
          ],
          answer: 1,
          why: "The steepest direction caps the learning rate and the flattest direction sets the pace; their ratio is the condition number. Momentum, Nesterov and the adaptive methods each attack that gap in a different way."
        },
        {
          stem: "Adam with η = 1.0 moved x by 1.0 and y by 1.0 on the first step although their gradients were 10 and 100. Why?",
          options: [
            "Because Adam clips gradients to 1",
            "Because the step is η·m̂/√v̂ and on the first step m̂/√v̂ = g/|g| = ±1 in every coordinate; Adam's step is the learning rate times a sign-like quantity, which is why its default η is a thousand times smaller than SGD's",
            "Because the quadratic is symmetric",
            "Because bias correction was disabled"
          ],
          answer: 1,
          why: "Normalising by the root of the squared-gradient average removes the gradient's scale; with bias correction the first step is exactly η in magnitude. This is Adam's robustness to badly scaled coordinates and also why it needs no per-parameter tuning."
        },
        {
          stem: "torch.optim.Adam(..., weight_decay=0.1) took the digits network from 0.977 to 0.798; AdamW with the same 0.1 stayed at 0.977. Why?",
          options: [
            "AdamW ignores the weight_decay argument",
            "Adam adds λθ to the gradient before the adaptive normalisation, so the decay is divided by √v̂ and becomes enormous for parameters with small gradients; AdamW subtracts ηλθ from θ directly, outside the adaptive step, which is what weight decay is meant to be",
            "Adam's decay is applied twice",
            "The learning rate should have been lower for Adam"
          ],
          answer: 1,
          why: "Coupled L2 in an adaptive method regularises hardest exactly where the gradient is smallest, shrinking the weight norm to 3.73 against AdamW's 17.20. The two keyword arguments share a name and differ in meaning; this is the most consequential such difference in the library."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Three optimisers from scratch, matched to PyTorch",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** Implement SGD with momentum (v ← βv + g, θ ← θ − ηv), RMSProp (α = 0.99, ε = 10⁻⁸) and Adam with bias correction (β₁ = 0.9, β₂ = 0.999, ε = 10⁻⁸) in NumPy for the surface 0.5(x² + 100y²). Run each for 50 steps from (10, 1) — momentum at η = 0.01, RMSProp at η = 0.1, Adam at η = 1.0 — and compare every position along the trajectory with torch.optim's, in float64." },
        { t: "p", text: "**(b)** Print Adam's first five positions and the absolute step per coordinate. Explain why both coordinates move by about 1.0 on the first step." },
        { t: "p", text: "**(c)** Run plain gradient descent at η = 0.0199, 0.02 and 0.0201 for 200 steps and report y, alongside the per-step factor 1 − 100η." }
      ],
      requirements: [
        "(a) three maximum discrepancies, all below 10⁻¹².",
        "(b) five positions and the explanation.",
        "(c) three values of y and three factors."
      ],
      hint: "PyTorch's momentum is v = βv + g (no (1 − β) factor); RMSProp's default α is 0.99 and it adds ε outside the square root. Adam divides m by (1 − β₁ᵗ) and v by (1 − β₂ᵗ) with t starting at 1.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) momentum  max |mine − torch| over 50 steps = 0.0        final (−0.5845, −0.0497)  loss 2.9e-01
#     rmsprop   max |mine − torch|                = 0.0        final ( 1.1466,  0.0000)  loss 6.6e-01
#     adam      max |mine − torch|                = 6.7e-16    final (−0.0482,  0.0187)  loss 1.9e-02

# (b) adam η = 1: (10, 1) → (9.0, 0.0) → (8.004, −0.670) → (7.016, −0.744) → (6.039, −0.490) → (5.080, −0.109)
#     |step| per coordinate, first three steps: [1.0, 1.0], [0.996, 0.670], [0.988, 0.074]
#     -- on step 1, m̂/√v̂ = g/|g| exactly, so each coordinate moves by η regardless of gradient scale (10 vs 100);
#        from step 2, y's gradient has changed sign, v̂ remembers the large earlier value, and y's steps shrink

# (c) η = 0.0199: y = 1.34e-01   factor −0.9900   (oscillating, slowly decaying)
#     η = 0.0200: y = 1.00e+00   factor −1.0000   (flipping sign forever)
#     η = 0.0201: y = 7.32e+00   factor −1.0100   (diverging)`,
        notes: [
          { t: "p", text: "(a) is the optimiser as twelve lines of arithmetic; matching PyTorch to the last bit removes any mystery about what .step() does." },
          { t: "p", text: "(b) is Adam's defining behaviour — a normalised step — seen on the first update, and the reason its learning rate lives on a different scale from SGD's." },
          { t: "p", text: "(c) is the stability limit as a measurement: 2/λ_max, and nothing else, decides whether descent converges." }
        ]
      }
    }
  ],

  takeaways: [
    "Gradient descent converges only if η < 2/λ_max (0.02 on the quadratic: 0.0199 decays, 0.0201 diverges), and at that rate the flattest direction moves at (1 − ηλ_min) per step — x was still 1.47 from the optimum after 100 steps. The condition number is the problem every other optimiser addresses.",
    "Momentum accumulates consistent gradients and cancels oscillating ones: loss 2 × 10⁻³ after 100 steps against SGD's 1.12; Nesterov's look-ahead reached 10⁻³ in 25 steps against 95. Both matched PyTorch step for step when implemented by hand.",
    "Adam normalises each coordinate by its running RMS gradient, so a step is ≈ η in every coordinate — with η = 1 both x and y moved by 1.0 though their gradients were 10 and 100 — and bias correction is what makes the first step η rather than 3.16η.",
    "Batch size trades gradient quality for update count: cosine to the full gradient 0.13 at batch 1 and 0.90 at 256, yet at a fixed 30 epochs batch 1 reached 0.976 with 37,710 updates and full batch 0.770 with 30. Batch 16 matched batch 1 in a fourteenth of the time.",
    "With the learning rate tuned per optimiser, momentum, Nesterov, Adagrad, RMSProp, Adam and AdamW all reached 0.978–0.980 on the digits; the best η differed by a factor of thirty between SGD and Adam, and sharing one is how comparisons go wrong.",
    "L2 inside Adam is not weight decay: weight_decay=0.1 in Adam cost eighteen points (0.798, ‖θ‖ 3.73) while AdamW's decoupled 0.1 cost nothing (0.977). LARS trust ratios ranged from 2.8 to 32.5 across layers on one batch; SAM gave no measurable gain on a small network (0.932 vs 0.929 ± 0.005)."
  ],

  quiz: {
    title: "Optimisers — Knowledge Check",
    questions: [
      {
        stem: "Why did Adagrad stall 0.57 from the Rosenbrock optimum while RMSProp and Adam did not?",
        options: [
          "Adagrad's learning rate was too small",
          "Adagrad's denominator s accumulates every squared gradient and never shrinks, so the effective step decays toward zero whether or not the optimum has been reached; RMSProp and Adam replace the sum with an exponential moving average that can recover",
          "Adagrad is only for convex problems",
          "Adagrad has no bias correction"
        ],
        answer: 1,
        why: "That monotone accumulation is Adagrad's design — good for sparse features that are seen rarely, fatal on a long non-convex path. The moving average with α = 0.99 or β₂ = 0.999 is the one-line fix that produced RMSProp and then Adam."
      },
      {
        stem: "At a fixed number of epochs, why did full-batch gradient descent reach only 0.770 while batch 16 reached 0.974, when the full-batch gradient is exact?",
        options: [
          "The exact gradient overfits",
          "Because an epoch is one update for full batch and 79 updates for batch 16: at the same learning rate the full-batch run made 30 steps in total, and progress is counted in steps, not in gradient quality",
          "Full-batch descent needs a different loss",
          "Batch 16 uses momentum implicitly"
        ],
        answer: 1,
        why: "Gradient quality (cosine 0.90 at 256, 0.43 at 16) matters less than update count when the learning rate is fixed. Larger batches need a larger learning rate to compensate — the scaling rule in lesson 1.8 — and only then does the comparison become fair."
      },
      {
        stem: "What does the LARS trust ratio ‖w‖/‖g‖ fix, and where is it needed?",
        options: [
          "Vanishing gradients in deep networks",
          "That one global learning rate suits some layers and not others — measured ratios of 32.5, 22.8, 7.7 and 2.8 on one batch — by scaling each layer's step to a fraction of its own weight norm; it is needed when the batch size is so large that the required learning rate would otherwise blow up the small-ratio layers",
          "The bias in Adam's first steps",
          "Sparse gradients in embeddings"
        ],
        answer: 1,
        why: "A layer whose gradient is large relative to its weights would be destroyed by the learning rate a large-ratio layer needs. LARS (for SGD) and LAMB (for Adam) made batch sizes of 32k trainable, which is what SimCLR and BERT pretraining relied on."
      },
      {
        stem: "SAM on the small digits network gave 0.932 ± 0.005 against 0.929 ± 0.005 for plain SGD, at twice the compute. What is the correct conclusion?",
        options: [
          "SAM does not work",
          "SAM always helps and the experiment is wrong",
          "On this problem the flat-minimum benefit is within noise and not worth two gradient evaluations per step; the published gains are on large vision models and should be verified rather than assumed on a new setting",
          "ρ should have been larger"
        ],
        answer: 2,
        why: "A method's reported advantage is a claim about the settings it was measured in. Here the three ρ values are indistinguishable at five seeds; the honest result is 'no effect detected', and the honest recommendation is to measure before paying the cost."
      },
      {
        stem: "Which pairing of optimiser and regime is the conventional recommendation?",
        options: [
          "Adagrad for transformers, Adam for convolutional networks from scratch",
          "SGD with Nesterov momentum and a schedule for convolutional networks from scratch; AdamW with warmup for transformers and fine-tuning; LARS or LAMB for very large batches; Adagrad or sparse Adam for sparse embedding gradients",
          "AdamW for everything at η = 0.1",
          "Plain SGD for everything, since the race was flat"
        ],
        answer: 1,
        why: "The race was flat only with a per-optimiser learning-rate grid on a small well-conditioned problem. The regimes differ in conditioning, batch size and sparsity, and the conventional pairings follow from which failure each optimiser was built to avoid."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Optimisers",
    sub: "The stability limit, momentum's mechanism, Adam's normalisation and bias correction, AdamW, batch size, and the family map.",
    questions: [
      {
        level: "Core",
        q: "Compare SGD, momentum and Adam.",
        strong: "SGD steps by η times the gradient, and on an ill-conditioned surface it is trapped: the largest curvature caps η at 2/λ_max and the smallest sets the pace. On 0.5(x² + 100y²) the cap is 0.02, and at 0.019 the x coordinate was still 1.47 from the optimum after a hundred steps while y had died in a dozen. Momentum keeps a velocity v ← βv + g, so consistent gradient directions accumulate to an effective rate of η/(1 − β) and oscillating ones cancel; the same hundred steps reached a loss of 2 × 10⁻³, and Nesterov's look-ahead reached 10⁻³ in 25 steps. Adam keeps both a mean m and a mean square v of the gradient and steps by η·m̂/√v̂, so each coordinate moves by about η regardless of its gradient's scale — with η = 1 it moved x and y by exactly 1.0 on the first step although their gradients were 10 and 100. That normalisation is why Adam's default learning rate is 10⁻³ where SGD's is 10⁻¹, and why it is forgiving of scale. On a real network with each optimiser's η tuned they landed within a standard deviation of each other (0.978–0.980 on the digits); the differences are in sensitivity to η, behaviour on hard surfaces, and how decay interacts.",
        answer: [
          { t: "p", text: "The stability argument with numbers, momentum's cancellation, Adam's normalisation with the first-step evidence, and the honest race result." }
        ]
      },
      {
        level: "Core",
        q: "What is Adam's bias correction and why is it there?",
        strong: "m and v are exponential moving averages started at zero: m ← β₁m + (1 − β₁)g and v ← β₂v + (1 − β₂)g². After t steps of a constant gradient they sum to (1 − β₁ᵗ)g and (1 − β₂ᵗ)g² rather than g and g², so early on both are biased toward zero — v badly, since β₂ = 0.999. The correction divides by those factors: m̂ = m/(1 − β₁ᵗ), v̂ = v/(1 − β₂ᵗ). Without it, the first step on a unit gradient would be m/√v = 0.1/√0.001 = 3.16 times the learning rate, the second 4.25, the third 4.95 — oversized and growing; with it, each is exactly 1.0. Even corrected, v̂ after a handful of steps is an estimate from a handful of gradients, which is one reason learning-rate warmup helps Adam in practice.",
        answer: [
          { t: "p", text: "The mechanism, the executed uncorrected and corrected steps, and the link to warmup." }
        ]
      },
      {
        level: "Core",
        q: "Why is AdamW different from Adam with L2 regularisation?",
        strong: "L2 adds λθ to the gradient; in SGD that is identical to shrinking θ by ηλθ each step, which is weight decay. In Adam the gradient — including the λθ term — is divided by √v̂ before it is applied, so the decay is scaled by the inverse of each parameter's gradient history: parameters with small gradients get a huge effective decay and those with large gradients almost none, the reverse of what a regulariser should do. AdamW applies θ ← θ − ηλθ separately, outside the adaptive normalisation. Measured on the digits at η = 0.003: Adam with weight_decay=0.1 fell from 0.977 to 0.798 and shrank the weight norm from 18.5 to 3.7, while AdamW with the same 0.1 stayed at 0.977 with norm 17.2. The keyword has the same name in both classes and means different things, and that is the single most expensive confusion in torch.optim.",
        answer: [
          { t: "p", text: "Coupled versus decoupled, the mechanism of the mis-scaling, and the executed eighteen-point difference." }
        ]
      },
      {
        level: "Advanced",
        q: "How does batch size affect training?",
        strong: "Two ways that pull against each other. A larger batch gives a better gradient — cosine similarity to the full-batch gradient was 0.13 at batch 1, 0.43 at 16, 0.67 at 64, 0.90 at 256 — and better hardware utilisation. But at a fixed epoch budget and learning rate it gives fewer updates: batch 1 made 37,710 updates in 30 epochs and reached 0.976; batch 256 made 150 and reached 0.909; full batch made 30 and reached 0.770. Progress is counted in updates, so a larger batch must be paired with a larger learning rate — linear scaling with warmup for SGD, roughly square-root for Adam — and beyond a problem-dependent critical batch size even that stops helping. The noise of small batches is also a mild regulariser and tends to find flatter minima. In practice: the largest batch the hardware runs efficiently, the learning rate scaled with it, and a check that the update count has not collapsed — batch 16 here matched batch 1 in a fourteenth of the time.",
        answer: [
          { t: "p", text: "Gradient quality against update count with the executed numbers, the scaling rule, the critical batch size, and the practical choice." }
        ]
      },
      {
        level: "Advanced",
        q: "Where do LARS, LAMB, SAM and second-order methods fit?",
        strong: "LARS scales each layer's step by its trust ratio ‖w‖/‖g‖ so no layer moves by more than a fraction of its own norm; on one batch of a small MLP the ratios were 32.5, 22.8, 7.7 and 2.8 across four tensors, which shows why a single learning rate at very large batch would break the small-ratio layers. LAMB is the same ratio on Adam's update and trained BERT at batch 32k. SAM takes the gradient at the worst point within radius ρ and applies it at the original weights, seeking flat minima at the price of two gradient evaluations per step; on a small network on 200 digits it gave 0.932 against 0.929 with a standard deviation of 0.005 — no detectable effect — so its reported gains on large vision models should be measured rather than assumed. Second-order methods use curvature: Newton's step −H⁻¹g solved the quadratic from (10, 1) in one step, but the Hessian of a network with 10⁵ parameters has 10¹⁰ entries, so practice uses L-BFGS for small full-batch problems and blockwise approximations like K-FAC and Shampoo at scale. Adam is a diagonal approximation of the same idea, with curvature estimated from squared gradients.",
        answer: [
          { t: "p", text: "Each method's mechanism and regime, with the executed trust ratios, the SAM null result, and the Newton step." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 1.8 — Gradients at Depth, Clipping and Schedules
   ========================================================================= */
EC.receiveLesson({
  id: "1.8",

  lede: "**The gradient that reaches layer one is a product of thirty Jacobians, and a product of thirty numbers is either tiny, huge or — with care — about one.** Measured at initialisation: the first layer of a thirty-layer sigmoid network receives 6 × 10⁻²⁰ of the gradient the last one does; with tanh and Xavier, or ReLU and He, the ratio is about one; with weights twice He's scale the norms are 10⁴ everywhere. The same arithmetic applies through time in a recurrent network (spectral radius 0.5: 10⁻¹⁵ after fifty steps; 1.5: 34). Clipping is the tool for the explosion, initialisation and normalisation for the vanishing, and the learning-rate schedule is what turns a working run into a good one — measured here as 0.972 for a constant rate against 0.980 for cosine or one-cycle.",

  objectives: [
    "Measure the gradient norm layer by layer at initialisation and explain each row from the activation's derivative and the weight scale",
    "Show the exploding-gradient mechanism through repeated multiplication and relate it to the spectral radius",
    "Apply clipping by norm and by value, read how often it fires, and state what it can and cannot rescue",
    "Run step, exponential, cosine, one-cycle, warmup, SGDR and polynomial schedules on the same task and read the results",
    "Use a learning-rate finder and the batch-size/learning-rate scaling rule, with the measured limits of both"
  ],

  prerequisites: ["1.5", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "The gradient, layer by layer", id: "layers" },

    { t: "p", text: "Lesson 1.4 gave the recursion δₗ = (Wₗ₊₁ᵀ δₗ₊₁) ⊙ f′(zₗ). Unroll it and the gradient at layer 1 is δ_L multiplied by L − 1 factors, each a weight matrix times an activation derivative. The norm of that product is what this table measures, on a thirty-layer, width-128 network with one batch of 256 digits:" },

    { t: "code", lang: "text", title: "‖∂L/∂W‖ at layers 1, 5, 10, 20, 30 at initialisation (executed)",
      code: `                      layer 1    layer 5    layer 10   layer 20   layer 30    ratio layer 1 / layer 30
sigmoid, xavier       5.9e-20    1.9e-17    2.1e-14    3.5e-08    7.3e-02     8.2e-19       vanishing
tanh, xavier          1.1e-01    1.1e-01    1.1e-01    8.9e-02    1.0e-01     1.0           balanced
relu, xavier          6.2e-06    7.6e-06    5.9e-06    8.4e-06    7.1e-06     0.87          uniformly tiny
relu, he              2.8e-01    5.3e-01    4.7e-01    5.2e-01    4.9e-01     0.57          balanced
relu, std 2/√n        1.7e+04    2.4e+04    2.3e+04    3.8e+04    5.1e+04     0.33          exploding`,
      caption: "Sigmoid loses eighteen orders of magnitude between the last layer and the first: the classic vanishing gradient, and the reason deep sigmoid networks did not train before 2010. The ReLU-Xavier row is interesting — the ratio is fine but every layer's gradient is 10⁻⁶, because the *forward* signal halved at each layer (1.6) and the weight gradient is δ times a tiny input. Twice He's scale and every gradient is 10⁴; a learning rate of 0.01 would move the weights by 100 in one step." },

    { t: "dl", items: [
      ["Vanishing gradient", "The product of many factors below one. Causes: saturating activations (σ′ ≤ 0.25, tanh′ → 0 when saturated), weights too small (He's scale is the cure for ReLU, 1.6), plain depth without skip connections. Symptoms: early layers' weights barely change, the loss plateaus near its initial value, training accuracy stalls at chance."],
      ["Exploding gradient", "The product of many factors above one. Causes: weights too large, a recurrence with spectral radius above one (module 4), a learning rate that pushes the weights there after a few steps. Symptoms: loss spikes, NaN, weights growing without bound."],
      ["The fixes, in the order to try them", "Initialisation (1.6) · a non-saturating activation (1.2) · normalisation layers (1.6) · residual connections (3.3) · gradient clipping for explosions (this lesson) · a smaller learning rate or a warmup (this lesson) · for recurrences, gates (4.3) or truncation (4.2)."]
    ] },

    { t: "h2", n: "02", text: "Through time: the same product", id: "time" },

    { t: "p", text: "A recurrent network applies the *same* matrix at every step, so the product is Wᵗ times the activation derivatives, and its growth is governed by W's largest eigenvalue magnitude — the spectral radius ρ:" },

    { t: "code", lang: "text", title: "‖∂h₅₀/∂h₀‖ for h_t = tanh(W h_{t−1}), W a 64 × 64 matrix (executed)",
      code: `scale 0.5:  spectral radius 0.50   ‖∂h50/∂h0‖ = 4.0e-15
scale 1.0:  spectral radius 1.01   ‖∂h50/∂h0‖ = 1.0
scale 1.5:  spectral radius 1.51   ‖∂h50/∂h0‖ = 34.2`,
      caption: "ρ⁵⁰ is 10⁻¹⁵ for ρ = 0.5 and 6 × 10⁸ for ρ = 1.5; tanh's saturation keeps the last from being astronomical but the gradient is still 34× the size it started. Fifty steps is a short sentence. Lesson 4.2 measures this per time step on a trained network and 4.3 shows how the LSTM's additive cell state gives the gradient a path with a factor near one." },

    { t: "h2", n: "03", text: "Clipping", id: "clipping" },

    { t: "p", text: "Clipping by norm rescales the whole gradient vector so its norm is at most a threshold c: g ← g · min(1, c/‖g‖). The direction is preserved; only the step length is capped. Clipping by value clamps each component to [−c, c], which changes the direction. Both act after backward and before the optimiser step:" },

    { t: "code", lang: "python", title: "Where clipping goes",
      code: `loss.backward()
total_norm = torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)   # returns the pre-clip norm: log it
# or: torch.nn.utils.clip_grad_value_(model.parameters(), clip_value=0.5)
optimizer.step()`,
      caption: "clip_grad_norm_ returns the norm before clipping. Logging it is the cheapest training diagnostic there is: a healthy run has a norm that drifts slowly; a run about to diverge shows spikes a step or two before the loss does." },

    { t: "code", lang: "text", title: "A ten-layer tanh MLP, SGD momentum, 30 epochs = 600 steps, 3 seeds (executed)",
      code: `lr=0.1   no clip          acc=0.885 ± 0.061   clipped 0/600
lr=0.1   clip norm 1.0    acc=0.967 ± 0.007   clipped 398/600
lr=0.1   clip norm 0.1    acc=0.972 ± 0.004   clipped 598/600
lr=0.1   clip value 0.1   acc=0.946 ± 0.008

lr=0.5   no clip          acc=0.101 ± 0.001   -- dead
lr=0.5   clip norm 1.0    acc=0.234 ± 0.099   clipped 598/600
lr=0.5   clip norm 0.1    acc=0.947 ± 0.002   clipped 572/600
lr=0.5   clip value 0.1   acc=0.100 ± 0.002   -- dead`,
      caption: "At lr = 0.1 the unclipped run is erratic (0.885 with a spread of 0.06 across seeds) and clipping by norm makes it reliable. At lr = 0.5 the unclipped network never trains; clipping the norm to 0.1 rescues it to 0.947, because with the norm capped the effective step is 0.5 × 0.1 = 0.05 whatever the gradient does. Clipping by value did not help at either rate: clamping components changes the direction and, with 600 steps, distorted more than it protected." },

    { t: "callout", kind: "warn", title: "What clipping is for",
      body: "Clipping bounds the damage of a rare enormous gradient — the recurrent-network case, a bad batch, a loss spike. It is not a substitute for a sane learning rate: when 598 of 600 steps are clipped, the threshold has become the learning rate and you should lower the rate instead. The clipped-steps count is the diagnostic; a few per cent is protection, most of them is a mis-set optimiser." },

    { t: "h2", n: "04", text: "Schedules", id: "schedules" },

    { t: "p", text: "A constant learning rate is a compromise: large enough to make progress early, small enough not to bounce around the minimum late. A schedule refuses the compromise. Eight of them, on a five-layer ReLU MLP with SGD momentum, peak rate 0.1, 30 epochs of 20 steps, three seeds:" },

    { t: "code", lang: "text", title: "Schedules compared (executed) — the learning rate at steps 1, 60, 200, 300, 400, 600",
      code: `constant         acc=0.972 ± 0.007    0.1     0.1     0.1     0.1     0.1     0.1
step (÷10/10 ep) acc=0.973 ± 0.002    0.1     0.1     0.01    0.01    0.001   0.0001
exponential      acc=0.978 ± 0.000    0.0995  0.0729  0.0349  0.0206  0.0122  0.0042
cosine           acc=0.980 ± 0.006    0.1     0.0976  0.075   0.05    0.025   0.0
one-cycle        acc=0.980 ± 0.003    0.004   0.0282  0.0994  0.0809  0.0459  0.0
SGDR (T₀ 10 ep)  acc=0.978 ± 0.003    0.1     0.0794  0.1     0.05    0.1     0.1     -- restarts at epochs 10, 20
polynomial (p=2) acc=0.976 ± 0.002    0.0997  0.081   0.0444  0.025   0.0111  0.0
warmup + cosine  acc=0.978 ± 0.005    0.0033  0.1     0.0843  0.0587  0.0302  0.0`,
      caption: "Everything that decays to zero beats the constant rate by half a point to a point, and the constant rate has the widest seed-to-seed spread. Cosine and one-cycle tie at the top. SGDR ends at a restart — its final rate is 0.1 — and still lands at 0.978, because the earlier cycles found a good region; its intended use is to snapshot the model at each trough." },

    { t: "dl", items: [
      ["Step decay", "Multiply by γ every k epochs. The 2012–2016 default (ResNet: ÷10 at epochs 30, 60, 90). Simple; the drops are visible as cliffs in the loss curve."],
      ["Exponential", "Multiply by γ every step. Smooth; γ chosen so the total decay over the run is a factor of ten to a hundred."],
      ["Cosine annealing", "η(t) = ½η₀(1 + cos(πt/T)). Slow start, fast middle, gentle landing at zero. The modern default for a run of known length."],
      ["One-cycle", "Warm up from a small rate to the peak over the first ~30 %, then anneal to near zero. Pairs with momentum going the other way. Reaches good accuracy in few epochs; the peak can be higher than a constant run would tolerate."],
      ["Warmup", "Linear ramp from ~0 over the first few hundred steps, then any decay. Essential for Adam (its v̂ estimate is poor at first — 1.5), for large batches, and for transformers, where an un-warmed run at the target rate often diverges in the first hundred steps."],
      ["SGDR (warm restarts)", "Cosine to zero, then jump back to η₀ and repeat, optionally with longer periods. Each trough is a snapshot; the snapshots average into an ensemble for free."],
      ["Polynomial (poly)", "η₀(1 − t/T)ᵖ; p = 0.9 is the segmentation-community default (DeepLab). Between linear and cosine in shape."],
      ["Reduce on plateau", "Multiply by γ when the validation metric has not improved for k epochs. Adaptive, and the only schedule that needs no total length; slow to react."]
    ] },

    { t: "h2", n: "05", text: "The learning-rate finder", id: "finder" },

    { t: "p", text: "Before choosing a peak rate, sweep it: increase the learning rate exponentially over a few hundred mini-batches, from far too small to far too large, and record the loss. The loss falls as the rate becomes useful, bottoms out, then climbs and diverges. The usable peak is somewhat below the minimum — the minimum itself is where the loss is *about* to explode:" },

    { t: "code", lang: "text", title: "Learning-rate finder, 300 steps from 10⁻⁵ to 10, five-layer ReLU MLP (executed)",
      code: `smoothed loss at lr = 1e-4   1e-3   1e-2   1e-1   0.3    1      3
                     2.305  2.191  0.919  0.524  NaN    NaN    NaN
loss minimum at lr = 0.248;  the next window is already NaN
suggested peak: a decade below the minimum, ~0.025 -- or, reading the curve, 0.05–0.1 where the descent is steepest`,
      caption: "The finder says nothing about the schedule, only about the largest rate the network tolerates for a few steps from its current weights. Runs with 0.1 as the peak trained fine above; the rule of thumb — one decade below the loss minimum — is conservative by design." },

    { t: "h2", n: "06", text: "Batch size and learning rate", id: "scaling" },

    { t: "p", text: "Lesson 1.5 showed that a larger batch at a fixed rate makes fewer, better updates and loses accuracy in a fixed epoch budget. The linear scaling rule (Goyal et al., 2017) says: multiply the batch by k, multiply the learning rate by k — the update over k small batches and one large batch then move the weights by about the same amount. Measured, plain SGD, 30 epochs:" },

    { t: "code", lang: "text", title: "Batch size against learning rate (executed)",
      code: `bs=  32  lr=0.05   (1,200 updates)   acc=0.975 ± 0.004      the reference
bs= 256  lr=0.05   (  150 updates)   acc=0.917 ± 0.037      8× batch, same rate: 8× fewer updates, six points lost
bs= 256  lr=0.4    (  150 updates)   acc=0.968 ± 0.009      linear rule: 8× rate recovers most of it
bs= 256  lr=0.14   (  150 updates)   acc=0.973 ± 0.003      square-root rule (√8 × 0.05): best here
bs=1024  lr=0.05   (   60 updates)   acc=0.796 ± 0.085      32× batch, same rate
bs=1024  lr=1.6    (   60 updates)   acc=0.100 ± 0.000      linear rule at 32×: diverged`,
      caption: "The linear rule worked at 8× and failed at 32×, where the rate it prescribes (1.6) is far beyond the network's stability limit; the square-root rule was better at 8×. Both rules have a ceiling — the critical batch size beyond which no rate recovers the lost updates — and a warmup is what makes the large rates survivable in practice (Goyal's recipe is linear scaling *with* five epochs of warmup)." },

    { t: "ladder",
      title: "Setting up the learning rate for a new run",
      rungs: [
        { level: "bad", label: "A constant 0.01 because it usually works", code: `opt = SGD(lr=0.01)      # trains, slowly; the final accuracy depends on when you happened to stop`,
          note: "**Neither the fast early progress of a high rate nor the clean convergence of a low one. The seed-to-seed spread of the constant run was the largest in the table.**" },
        { level: "ok", label: "A finder for the peak, cosine to zero, clip at a generous norm", code: `peak = lr_finder() / 10;  sched = CosineAnnealingLR(T_max=total_steps);  clip_grad_norm_(1.0)`,
          note: "Sound for SGD on a plain network: 0.980 above. Log the pre-clip norm; if most steps clip, the peak is too high." },
        { level: "best", label: "Warmup, then cosine or one-cycle; scale the rate with the batch; clipping as insurance, not as the brake", code: `warmup 2–5 % of steps → cosine to ~0     (Adam and transformers: warmup is not optional)
batch × k → lr × k (SGD, with warmup) or × √k (Adam), verified against a small-batch reference
clip_grad_norm_(1.0), and alarm if > 5 % of steps clip`,
          note: "One-cycle and warmup-cosine both reached 0.978–0.980; the batch rule kept 8× batches within a point of the reference and the warmup is what would have saved the 32× run." }
      ] },

    { t: "viz",
      title: "Four schedules over one run",
      caption: "Learning rate against training step for the constant, step, cosine and one-cycle schedules, drawn from the executed values. The decaying schedules all finish near zero, which is where the extra half-point of accuracy comes from; one-cycle also starts near zero, which is its warmup.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Line chart of learning rate versus step for constant, step, cosine and one-cycle schedules.">
  <defs>
    <marker id="dl18-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/></marker>
  </defs>
  <line x1="80" y1="220" x2="840" y2="220" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#dl18-ah)"/>
  <line x1="80" y1="220" x2="80" y2="30" style="stroke:var(--line)" stroke-width="1.2" marker-end="url(#dl18-ah)"/>
  <g class="s-sub" text-anchor="middle">
    <text x="80" y="240">0</text><text x="200" y="240">100</text><text x="320" y="240">200</text><text x="440" y="240">300</text><text x="560" y="240">400</text><text x="680" y="240">500</text><text x="800" y="240">600</text>
    <text x="460" y="256">step</text>
    <text x="70" y="224" text-anchor="end">0</text><text x="70" y="128" text-anchor="end">0.05</text><text x="70" y="44" text-anchor="end">0.1</text>
  </g>
  <!-- y = 220 - lr*1800 ; x = 80 + step*1.2 -->
  <line x1="80" y1="40" x2="800" y2="40" style="stroke:var(--ink-3)" stroke-width="1.6" stroke-dasharray="4 3"/>
  <text x="810" y="44" class="s-sub">constant 0.1</text>
  <polyline points="80,40 320,40 320,202 560,202 560,218 800,218" fill="none" style="stroke:var(--warn)" stroke-width="1.8"/>
  <text x="330" y="196" class="s-sub" style="fill:var(--warn)">step ÷10 every 200</text>
  <path d="M80,40 C200,44 260,80 440,130 C620,180 720,212 800,220" fill="none" style="stroke:var(--accent)" stroke-width="2"/>
  <text x="470" y="120" class="s-sub" style="fill:var(--accent)">cosine</text>
  <path d="M80,213 C150,200 200,120 296,41 C360,60 560,150 800,220" fill="none" style="stroke:var(--good)" stroke-width="2"/>
  <text x="150" y="150" class="s-sub" style="fill:var(--good)">one-cycle</text>
</svg>` },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The ReLU-Xavier row had a healthy layer-1/layer-30 gradient ratio of 0.87 yet every layer's gradient was about 10⁻⁶. Why is that still a vanishing-gradient failure?",
          options: [
            "It is not; a balanced ratio is all that matters",
            "Because the weight gradient is δ times the layer's input activation, and under Xavier the forward signal halves at every ReLU layer (1.6), so every layer's input — and therefore every weight gradient — is tiny; He initialisation fixed both the forward signal and the gradients (0.28 to 0.49)",
            "Because the batch was too small",
            "Because Xavier initialisation sets the biases wrong"
          ],
          answer: 1,
          why: "Vanishing can come from the backward product or from a collapsed forward signal; the ratio diagnoses only the first. The row shows the second: uniformly negligible gradients, which He's factor of two cured."
        },
        {
          stem: "With clipping at norm 0.1 and lr = 0.5, 572 of 600 steps were clipped and the network reached 0.947. What does the clipped-step count tell you?",
          options: [
            "That clipping is working well and should be kept",
            "That the threshold has become the effective learning rate — every step is 0.5 × 0.1 in length regardless of the gradient — so the learning rate is mis-set and should be lowered, with clipping kept as protection that fires rarely",
            "That the network is exploding",
            "That the threshold should be raised to 1.0"
          ],
          answer: 1,
          why: "Clipping is insurance against rare enormous gradients; when it fires on almost every step it is doing the optimiser's job badly (direction preserved, magnitude fixed). The count is the diagnostic; a few per cent is healthy."
        },
        {
          stem: "Scaling the batch from 32 to 256 at a fixed rate cost six points (0.975 → 0.917); scaling the rate by 8 recovered most of it (0.968), but scaling to batch 1024 with rate 1.6 diverged. What is the correct reading?",
          options: [
            "The linear scaling rule is wrong",
            "Large batches never work",
            "The rule compensates for the lost updates until the prescribed rate exceeds the network's stability limit; beyond that point a warmup is needed to reach the rate gradually, and beyond the critical batch size no rate recovers the loss",
            "Batch 1024 needs momentum"
          ],
          answer: 2,
          why: "The rule is an approximation that holds while the loss is locally linear over one step. At 32× the rate is 1.6 on a network whose finder showed divergence above ~0.25; the published recipe uses linear scaling with several epochs of warmup for exactly this reason."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "A schedule by hand, clipping by hand, and the norm as a diagnostic",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Implement warmup-then-cosine as a function of the step: linear from 0 to η₀ over W steps, then ½η₀(1 + cos(π(t − W)/(T − W))). For η₀ = 0.1, W = 60, T = 600, print the rate at steps 1, 60, 200, 300, 400, 600 and compare with torch's LambdaLR values from the lesson." },
        { t: "p", text: "**(b)** Implement clip-by-norm on a list of gradient tensors without torch.nn.utils and check it against clip_grad_norm_ on a random model: the pre-clip norm, and the post-clip norm at thresholds 1.0 and 0.1." },
        { t: "p", text: "**(c)** Train the ten-layer tanh MLP at lr = 0.3 for 10 epochs, logging the pre-clip gradient norm every step with clipping at 1.0. Report the fraction of steps clipped, the largest norm seen, and the test accuracy, then repeat at lr = 0.03." }
      ],
      requirements: [
        "(a) six rates, matching the lesson's table.",
        "(b) three norms, matching torch.",
        "(c) two rows of three numbers."
      ],
      hint: "(a) The lesson's table logged the rate after the scheduler's step, so the value shown for step t is λ(t) with λ(s) = (s + 1)/W during warmup. (b) The total norm is the square root of the sum of every tensor's squared norm; scale every tensor by min(1, c / (total + 1e-6)).",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) warmup + cosine by hand at steps 1/60/200/300/400/600:  [0.0033, 0.1, 0.0843, 0.0587, 0.0302, 0.0]
#     lesson table (LambdaLR):                                [0.0033, 0.1, 0.0843, 0.0587, 0.0302, 0.0]
#     -- the table logged the rate after the scheduler's step, so step t shows lambda(t); lambda(0) = 0.0017 is
#        the rate the very first update used

# (b) pre-clip norm by hand 1.8286;  post-clip at 1.0: 1.0000;  at 0.1: 0.1000
#     torch:               1.8286;                  1.0000;          0.1000

# (c) lr=0.3:   96 % of 200 steps clipped, largest pre-clip norm 9.22, median 2.48, test acc 0.759
#     lr=0.03:  81 % of 200 steps clipped, largest pre-clip norm 4.95, median 1.58, test acc 0.965
#     -- ten layers of tanh at Xavier scale produce gradient norms above 1 on most steps at either rate; the
#        difference is the largest spike (9.2 against 5.0) and, with the norm capped, an effective step three
#        times too long at 0.3.  The clipped fraction says 'lower the rate' in both cases; the accuracy says
#        0.03 is the one that survives it`,
        notes: [
          { t: "p", text: "(a) is the schedule as arithmetic; once written you can draw any shape you want without waiting for a library class." },
          { t: "p", text: "(b) is the whole of clip_grad_norm_: one norm, one scale factor." },
          { t: "p", text: "(c) is the habit worth keeping — the pre-clip norm logged every step is the earliest warning a training run gives." }
        ]
      }
    }
  ],

  takeaways: [
    "The gradient at layer 1 is a product of L − 1 Jacobians: at depth 30 sigmoid-Xavier gives a layer-1/layer-30 ratio of 8 × 10⁻¹⁹, tanh-Xavier and ReLU-He about one, and twice He's scale gives norms of 10⁴ at every layer. ReLU-Xavier has a healthy ratio and uniformly tiny gradients, because the forward signal collapsed.",
    "Through time the same product is Wᵗ: spectral radius 0.5 gave ‖∂h₅₀/∂h₀‖ = 4 × 10⁻¹⁵, radius 1.0 gave 1.0, radius 1.5 gave 34 — the recurrent-network problem that module 4 solves with gates.",
    "Clipping by norm preserves direction and caps step length; at lr = 0.1 it turned an erratic 0.885 ± 0.061 into 0.967–0.972, and at lr = 0.5 it rescued a dead run to 0.947 — but with 572 of 600 steps clipped, which says the rate was wrong. Clipping by value did not help. Log the pre-clip norm.",
    "Schedules that decay to zero beat a constant rate by half a point to a point on the same network (constant 0.972; cosine and one-cycle 0.980; exponential, SGDR, warmup-cosine 0.978); the constant run also had the widest seed spread. Warmup is mandatory for Adam and transformers.",
    "The learning-rate finder sweeps the rate exponentially over a few hundred steps: loss minimum at 0.248 with divergence immediately after; the usable peak is a factor of a few to ten below the minimum.",
    "Batch × 8 at a fixed rate lost six points (0.917); scaling the rate ×8 recovered to 0.968 and ×√8 to 0.973; batch × 32 with rate × 32 diverged, because the rule holds only below the stability limit and needs a warmup beyond it."
  ],

  quiz: {
    title: "Gradients at Depth, Clipping and Schedules — Knowledge Check",
    questions: [
      {
        stem: "A thirty-layer sigmoid network's first layer received 6 × 10⁻²⁰ of the last layer's gradient. Which single change would help most?",
        options: [
          "A larger learning rate for the first layers",
          "Replacing sigmoid with tanh or ReLU (with matching initialisation): the tanh-Xavier and ReLU-He rows had ratios near one at the same depth, because their derivatives are not capped at 0.25",
          "Clipping the gradient",
          "A smaller batch size"
        ],
        answer: 1,
        why: "Vanishing here is the product of thirty factors each ≤ 0.25; no learning-rate trick recovers eighteen orders of magnitude, and clipping only bounds gradients from above. The activation and its matched initialisation are the cause and the cure; normalisation and residual connections are the next two."
      },
      {
        stem: "Why is clipping by norm preferred to clipping by value?",
        options: [
          "It is faster to compute",
          "It rescales the whole gradient vector, preserving its direction and capping only its length, whereas clamping each component changes the direction; measured, norm clipping reached 0.967–0.972 where value clipping reached 0.946 and did not rescue the lr = 0.5 run at all",
          "Value clipping cannot be applied to biases",
          "They are equivalent"
        ],
        answer: 1,
        why: "A gradient's direction is the information; its magnitude is what explodes. Norm clipping keeps the first and bounds the second, which is why it is the default in every recurrent and transformer training recipe."
      },
      {
        stem: "One-cycle started at a rate of 0.004, peaked at 0.1 around step 200, and ended at zero; it scored 0.980. What is each phase for?",
        options: [
          "The low start saves compute; the rest is arbitrary",
          "The warmup lets the network leave its random initialisation with small, safe steps before the large rate would destabilise it; the peak makes fast progress; the anneal to zero lets the weights settle into the minimum rather than bouncing around it",
          "The peak is where the model is evaluated",
          "The phases match the three phases of the loss curve"
        ],
        answer: 1,
        why: "Each phase addresses a different stage of training. Warmup matters most for Adam and transformers, where the early second-moment estimates are unreliable; the final anneal is what every top schedule in the table shares."
      },
      {
        stem: "The learning-rate finder's loss minimum was at 0.248. Why not train at 0.248?",
        options: [
          "Because the finder's minimum is the rate at which the loss is about to diverge — the next window was already NaN — so a rate a factor of a few to ten lower is the usable peak, and the finder in any case measures only a few steps from the initial weights",
          "Because 0.248 is not a round number",
          "Because the finder is only valid for Adam",
          "You should; the minimum is the optimum"
        ],
        answer: 0,
        why: "The finder is a stability probe, not a schedule. Reading it as 'the largest tolerable rate' and backing off from there is the intended use; runs at a peak of 0.1 trained well above."
      },
      {
        stem: "Which statement about warmup is correct?",
        options: [
          "Warmup is a form of regularisation",
          "Warmup ramps the learning rate from near zero over the first few hundred steps so that Adam's early second-moment estimates and large-batch rates do not produce oversized steps before the network has left its initialisation; it is standard for transformers and for scaled batches",
          "Warmup only applies to SGD",
          "Warmup replaces the need for a decay schedule"
        ],
        answer: 1,
        why: "Adam's v̂ after a handful of steps is estimated from a handful of gradients (1.5), large-batch rates are near the stability limit, and transformers at their target rate frequently diverge in the first hundred steps without it. Warmup precedes a decay; it does not replace one."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Gradients at Depth, Clipping and Schedules",
    sub: "Vanishing and exploding with numbers, clipping's role and limits, schedules compared, and the batch–rate rule.",
    questions: [
      {
        level: "Core",
        q: "Explain the vanishing and exploding gradient problems and how you would address each.",
        strong: "Backpropagation multiplies the output gradient by one Jacobian per layer — a weight matrix times an activation derivative — so the gradient at an early layer is a product of many factors. Factors below one shrink it: a thirty-layer sigmoid network at Xavier initialisation gave a layer-1 gradient 8 × 10⁻¹⁹ times the layer-30 gradient, because σ′ ≤ 0.25; and a forward signal that collapses does the same thing from the other side — ReLU with Xavier had a balanced ratio but every gradient at 10⁻⁶. Factors above one grow it: ReLU weights at twice He's scale gave gradient norms of 10⁴ at every layer, and a recurrence with spectral radius 1.5 gave a fifty-step gradient of 34 against 10⁻¹⁵ at radius 0.5. For vanishing the fixes are structural: a non-saturating activation, matched initialisation (He took the same rows to 0.3–0.5), normalisation layers, and residual connections, which give the gradient an identity path. For exploding: clipping by norm as protection, a lower rate or warmup as the actual fix, and for recurrences, gates. The symptoms differ — a loss stuck at its initial value against spikes and NaN — and the layer-wise gradient norms tell you which you have.",
        answer: [
          { t: "p", text: "The product mechanism, both directions with executed numbers, the forward-collapse variant, and the fixes matched to each." }
        ]
      },
      {
        level: "Core",
        q: "What does gradient clipping do, and when is it the wrong tool?",
        strong: "Clipping by norm rescales the gradient vector to at most a threshold c — g · min(1, c/‖g‖) — after backward and before the optimiser step, preserving direction and capping step length; clipping by value clamps components and distorts direction, and measured worse in every configuration I ran. Its purpose is to bound the damage of a rare enormous gradient, which is why it is standard for recurrent networks and transformers. On a ten-layer tanh MLP at lr 0.1 it turned an erratic 0.885 ± 0.06 into a reliable 0.967–0.972; at lr 0.5 it took a dead run to 0.947. But in that last case 572 of 600 steps were clipped, which means the threshold had become the learning rate — every step had length 0.5 × 0.1 regardless of the gradient — and the right fix was a lower rate with clipping kept as insurance that fires on a few per cent of steps. It is the wrong tool for vanishing gradients, which it cannot touch, and the wrong substitute for a sane learning rate. The pre-clip norm that clip_grad_norm_ returns should be logged every step; it spikes before the loss does.",
        answer: [
          { t: "p", text: "Mechanism, norm against value with evidence, the two executed rescues, the clipped-step diagnostic, and the two cases where it is wrong." }
        ]
      },
      {
        level: "Core",
        q: "Compare learning-rate schedules. Which would you use?",
        strong: "A constant rate compromises between early progress and late convergence; a schedule refuses the compromise. On a five-layer MLP with SGD momentum, 600 steps, three seeds: constant 0.972 with the widest spread; step decay 0.973; exponential 0.978; cosine 0.980; one-cycle 0.980; SGDR 0.978; polynomial 0.976; warmup-then-cosine 0.978. The pattern is that everything annealing to zero beats the constant by half a point to a point, and the shape matters less than the landing. I would use cosine to zero for SGD on a run of known length, one-cycle when I want a high peak and few epochs, and warmup followed by cosine for Adam and any transformer — warmup is not optional there, because the second-moment estimates are unreliable for the first few hundred steps and the un-warmed run diverges. SGDR is for snapshot ensembles; reduce-on-plateau is for runs of unknown length. Whichever schedule, a learning-rate finder sets the peak: the loss minimum was at 0.248 with divergence just beyond, so the usable peak is a factor of a few below.",
        answer: [
          { t: "p", text: "The executed comparison, the anneal-to-zero pattern, the choice per regime with warmup's rationale, and the finder for the peak." }
        ]
      },
      {
        level: "Advanced",
        q: "How should the learning rate change with the batch size?",
        strong: "A larger batch at the same rate makes fewer updates per epoch and loses accuracy in a fixed budget: batch 32 at 0.05 reached 0.975 with 1,200 updates, batch 256 at the same rate 0.917 with 150. The linear scaling rule multiplies the rate by the batch ratio, on the argument that k small steps and one k-times-larger step move the weights by about the same amount while the loss is locally linear; at 8× it recovered 0.968, and a square-root scaling — the rule usually quoted for Adam — did slightly better at 0.973. The rule has a ceiling: at 32× the prescribed rate of 1.6 was far past the network's stability limit and the run diverged, which is why the published recipe pairs linear scaling with several epochs of warmup, and why beyond a problem-dependent critical batch size no rate recovers the lost updates. The honest procedure is to keep a small-batch reference, scale, warm up, and verify the accuracy matches before trusting the large batch.",
        answer: [
          { t: "p", text: "The update-count mechanism, the linear and square-root rules with executed results, the divergence at 32×, and the warmup and critical-batch caveats." }
        ]
      },
      {
        level: "Advanced",
        q: "A training run's loss is fine for 400 steps, then spikes and turns to NaN. Walk me through the diagnosis.",
        strong: "A late spike after stable progress is an explosion, not a vanishing, so I look at magnitudes. First the logged pre-clip gradient norm: if it climbed over the steps before the spike, the weights had drifted into a high-curvature region and the rate was too high for that region — lower the peak, add or lengthen the warmup, or anneal earlier; if it jumped on one step, a bad batch or a numerical event is more likely. Second, the loss itself: a cross-entropy computed from probabilities rather than logits gives log(0) = −inf on the first confident wrong prediction (1.3), and a division by a variance that reached zero — BatchNorm on a tiny batch (1.6), a hand-written normalisation without ε — gives inf. Third, the numerics: float16 without loss scaling overflows above 65,504 (2.5). The fixes follow the cause: clipping at a norm that fires on a few per cent of steps as insurance, a rate or schedule change as the real fix, a fused loss, an ε, or mixed-precision scaling. Lesson 2.4 turns this into a checklist with each failure reproduced.",
        answer: [
          { t: "p", text: "Explosion versus vanishing from the symptom, the gradient-norm log as evidence, the three numerical causes, and the fixes matched to causes." }
        ]
      }
    ]
  }
});

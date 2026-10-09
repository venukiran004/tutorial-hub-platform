EC.receiveLesson({
  id: "4.4",

  lede: "The LoRA formula is `h = W\u2080x + (\u03b1/r)\u00b7BAx`, and the only part that needs explaining is the `\u03b1/r`. The reference calls it a volume knob and gives a rule: **set \u03b1 = 2r and forget it**. That rule is sound and it has a consequence nobody mentions \u2014 with \u03b1 = 2r the multiplier is *exactly 2 at every rank*, so it is not adapting to rank at all, it is pinning the scale to a constant. I ran the same LoRA fine-tune at five ranks under three scaling rules to see what that costs, and at rank 32 the `\u03b1/r` convention finished at **loss 2.241** where `\u03b1/\u221ar` finished at **0.589**. The default is safe and it measurably under-trains high ranks.",

  objectives: [
    "Read the LoRA formula and say what each term contributes to the output",
    "Explain what the \u03b1/r scaling is protecting and what it is not",
    "Show why B is initialised to zero and what that guarantees at step zero",
    "Compare \u03b1/r against \u03b1/\u221ar on a real training run",
    "Choose \u03b1 and r without re-tuning one every time the other moves"
  ],

  prerequisites: ["4.3"],

  blocks: [

    { t: "h2", n: "01", id: "formula", text: "The formula, term by term",
      sub: "Base plus a scaled low-rank add-on" },

    { t: "math", tex: "h \\;=\\; \\underbrace{W_0 x}_{\\text{frozen base}} \\;+\\; \\underbrace{\\tfrac{\\alpha}{r}\\,(BA)\\,x}_{\\text{trained add-on}}" },

    { t: "p", text: "A LoRA layer computes the base output exactly as before and adds a second term. The input passes through `A` into an `r`-dimensional bottleneck, back out through `B` to the output width, and the result is scaled by `\u03b1/r` before being added. In code it is three lines:" },

    { t: "code", lang: "python", title: "g44.py \u2014 a LoRA-wrapped GPT-2 projection", code: `class LoRAConv1D(nn.Module):
    def __init__(self, base, r, scale):
        super().__init__()
        self.base = base
        for p in self.base.parameters():
            p.requires_grad = False                       # W0 is frozen
        d_in, d_out = base.weight.shape
        self.A = nn.Parameter(torch.randn(r, d_in) * (1.0 / math.sqrt(d_in)))
        self.B = nn.Parameter(torch.zeros(d_out, r))      # B = 0 at step zero
        self.scale = scale                                # this is alpha / r

    def forward(self, x):
        out = self.base(x)
        return out + self.scale * (x @ self.A.t() @ self.B.t())`,
      hl: [9, 14],
      caption: "Two lines carry the whole method: B starts at zero, and the branch is scaled before being added." },

    { t: "table",
      head: ["Symbol", "What it is", "Trained?"],
      rows: [
        ["`W\u2080`", "The pretrained weight matrix", "No \u2014 frozen, and this is why 4.1's forgetting cannot happen"],
        ["`A`", "`r \u00d7 d_in`, projects down into the bottleneck", "Yes \u2014 initialised small and random"],
        ["`B`", "`d_out \u00d7 r`, projects back up", "Yes \u2014 **initialised to zero**"],
        ["`r`", "The rank, which is the add-on's capacity", "No \u2014 chosen; 4.3 measured what each value can represent"],
        ["`\u03b1`", "The strength numerator", "No \u2014 chosen, usually as 2r"]
      ] },

    { t: "h2", n: "02", id: "zero", text: "Why B starts at zero",
      sub: "So that attaching an adapter changes nothing" },

    { t: "p", text: "With `B = 0` the product `BA` is the zero matrix, so the add-on contributes nothing and the wrapped model is **bit-for-bit the original model**. Training moves `B` away from zero gradually, so the adapter fades in rather than perturbing a working model from the first step." },

    { t: "callout", kind: "insight", title: "That initialisation is what makes the method safe to attach",
      body: [
        { t: "p", text: "If both matrices started random, `BA` would be a random perturbation of every adapted layer at step zero \u2014 you would begin training from a model measurably worse than the one you started with, and the first phase of training would be spent undoing it." },
        { t: "p", text: "Zeroing `B` rather than `A` is the right choice because the gradient with respect to `B` is proportional to `A`, which is non-zero \u2014 so `B` can move. Had both been zero, the gradients of both would be zero and nothing would ever train. One zero, one random, is the minimum that both starts from identity and can escape it." },
        { t: "p", text: "It also means an untrained adapter is harmless, which is what lets a serving framework attach and detach adapters per request (3.7) without a correctness risk." }
      ] },

    { t: "h2", n: "03", id: "whyscale", text: "What the \u03b1/r term is for",
      sub: "And what it turns out to be, once you substitute \u03b1 = 2r" },

    { t: "p", text: "The explanation is that a bigger `r` makes `BA` produce bigger numbers, so dividing by `r` cancels that out and lets you tune capacity and strength separately. The intent is clearly right \u2014 you do not want changing the rank to silently change how hard the adapter pushes. It is worth following the arithmetic through, though, because the recommended rule has a property the explanation does not mention." },

    { t: "callout", kind: "trap", title: "With \u03b1 = 2r the multiplier is the constant 2 \u2014 at every rank",
      body: [
        { t: "p", text: "Substitute: `\u03b1/r` with `\u03b1 = 2r` gives `2r/r = 2`. At r=2, r=8, r=32, r=128 \u2014 the scale is **2.0 every time**." },
        { t: "p", text: "So the rule does achieve its stated goal perfectly: changing `r` cannot change the strength, because the strength is pinned to a constant by construction. But describing `\u03b1/r` as compensating for a rank-dependent growth is then slightly misleading \u2014 under the recommended rule there is nothing left to compensate, and `\u03b1` has become a plain multiplier you happen to express as a multiple of `r`." },
        { t: "p", text: "That matters because it raises a question the framing hides: **is a constant multiplier the right thing to want as rank grows?** The measurement below says not obviously." }
      ] },

    { t: "callout", kind: "warn", title: "My first attempt to measure this measured my own assumption",
      body: [
        { t: "p", text: "I started by generating random `A` and `B` at each rank and measuring how `\u2016BA\u2016` grows. It came out perfectly flat \u2014 0.999\u00d7 from r=1 to r=128 \u2014 which looked like a clean result." },
        { t: "p", text: "It was circular. I had drawn `B` with standard deviation `1/\u221ar`, which normalises for rank *before* the measurement. The flatness was my initialisation choice, not a property of LoRA, and the script's own printed conclusion \u2014 that the norm grows like `\u221ar` \u2014 was wrong too: it was comparing against the wrong candidates and picking the nearer one." },
        { t: "p", text: "The honest version is that after training, `B`'s scale is set by the optimiser rather than by any formula I choose, so the only way to find out what happens is to train. Which is section 04." }
      ] },

    { t: "h2", n: "04", id: "measured", text: "Three scaling rules, five ranks, measured",
      sub: "The same data, the same steps, only the multiplier changed" },

    { t: "p", text: "I wrapped every attention projection in GPT-2 with a LoRA branch, froze everything else, and ran the identical 12-example training at ranks 2 to 32 under three rules: `\u03b1/r` with `\u03b1 = 2r` (so scale 2), `\u03b1/\u221ar` with `\u03b1 = 2r` (so scale `2\u221ar`), and no scaling at all." },

    { t: "code", lang: "python", title: "g44.py \u2014 the sweep", code: `for r in (2, 4, 8, 16, 32):
    run(r, (2 * r) / r,             "alpha/r  (alpha=2r)")    # = 2.0 always
for r in (2, 4, 8, 16, 32):
    run(r, (2 * r) / math.sqrt(r),  "alpha/sqrt(r)")          # = 2*sqrt(r)
for r in (2, 4, 8, 16, 32):
    run(r, 1.0,                     "no scaling (1.0)")`,
      out: `  scaling                     r    trainable    loss in   loss out ||dW|| layer 0
  alpha/r  (alpha=2r)         2        73728      4.932      4.427        0.65270
  alpha/r  (alpha=2r)         4       147456      4.912      4.024        0.84400
  alpha/r  (alpha=2r)         8       294912      4.872      3.612        1.11549
  alpha/r  (alpha=2r)        16       589824      4.810      3.040        1.39885
  alpha/r  (alpha=2r)        32      1179648      4.693      2.241        1.77948

  alpha/sqrt(r)               2        73728      4.925      4.255        0.90027
  alpha/sqrt(r)               4       147456      4.877      3.597        1.47529
  alpha/sqrt(r)               8       294912      4.744      2.585        2.57747
  alpha/sqrt(r)              16       589824      4.494      1.559        3.83016
  alpha/sqrt(r)              32      1179648      4.126      0.589        5.50540

  no scaling (1.0)            2        73728      4.940      4.668        0.33354
  no scaling (1.0)            4       147456      4.930      4.402        0.45351
  no scaling (1.0)            8       294912      4.910      4.038        0.64140
  no scaling (1.0)           16       589824      4.877      3.639        0.81574
  no scaling (1.0)           32      1179648      4.813      3.030        1.04454`,
      hl: [11],
      caption: "Same data, same optimiser, same number of steps. The only difference between the three blocks is a scalar multiplying the adapter branch." },

    { t: "callout", kind: "insight", title: "\u03b1/r works as advertised, and under-trains high ranks",
      body: [
        { t: "p", text: "Start with what works. Under `\u03b1/r`, raising the rank improves the loss monotonically \u2014 4.427 at r=2 down to 2.241 at r=32 \u2014 which is what you want: more capacity, more learning, no re-tuning of anything else. The rule does its job." },
        { t: "p", text: "Now compare the columns. At every rank `\u03b1/\u221ar` reaches a lower loss, and the gap **widens with rank**: at r=2 it is 4.255 against 4.427, barely anything; at r=32 it is **0.589 against 2.241**, nearly four times lower. Under `\u03b1/r` the adapter at rank 32 is learning less from the same steps than its capacity allows." },
        { t: "p", text: "The `\u2016dW\u2016` column says why. Under `\u03b1/r` the realised update grows 0.653 \u2192 1.779 across the sweep, a factor of 2.7; under `\u03b1/\u221ar` it grows 0.900 \u2192 5.505, a factor of 6.1. Pinning the multiplier to a constant means the effective learning signal through the branch does not keep pace as rank rises, so high-rank adapters move less per step than they could." },
        { t: "p", text: "This is the observation behind rank-stabilised LoRA, which uses `\u03b1/\u221ar` for exactly this reason. The rule is a good default \u2014 it is safe, it is one less thing to tune, and at the ranks it recommends (8\u201316) the gap is modest. At r=32 and above it is not modest." }
      ] },

    { t: "callout", kind: "note", title: "What this measurement does and does not establish",
      body: [
        { t: "p", text: "It establishes that under a fixed step budget and learning rate, `\u03b1/\u221ar` reaches a lower training loss at every rank tested, with the advantage growing in rank. That is a real and reproducible effect on this setup." },
        { t: "p", text: "It does not establish that `\u03b1/\u221ar` produces a *better model*. The training loss here is on twelve examples, and 4.1 showed exactly this configuration memorising its training data \u2014 so a lower training loss may partly be faster overfitting. A fair quality comparison needs a held-out set, which 4.8 builds." },
        { t: "p", text: "Nor does it isolate the scaling from the learning rate. A larger multiplier on the branch is, to first order, a larger effective step on `B` \u2014 so some of the gap could be closed by raising the learning rate under `\u03b1/r`. The reason the distinction still matters is that `\u03b1/\u221ar` gets it *automatically as rank changes*, which is the whole point of having a scaling rule." },
        { t: "p", text: "And finally: `\u2016dW\u2016` is a norm, not a quality metric. A bigger update is not a better one, which 4.1 established at some length." }
      ] },

    { t: "viz", title: "Three rules, as rank grows", caption: "The multiplier under each rule, and the training loss each reached at rank 32 on identical data and steps.",
      svg: `<svg viewBox="0 0 760 286" width="100%" role="img" aria-label="Scaling rules compared across rank">
  <text x="16" y="22" class="s-label">THE MULTIPLIER ON THE ADAPTER BRANCH</text>
  <text x="16" y="48" class="s-sub">\u03b1/r with \u03b1=2r</text>
  <rect x="150" y="36" width="40" height="16" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <rect x="200" y="36" width="40" height="16" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <rect x="250" y="36" width="40" height="16" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <rect x="300" y="36" width="40" height="16" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="352" y="48" class="s-mono" style="fill:var(--accent)">constant 2.0 \u2014 r=2, 4, 8, 16, 32 all identical</text>

  <text x="16" y="84" class="s-sub">\u03b1/\u221ar with \u03b1=2r</text>
  <rect x="150" y="72" width="40" height="16" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <rect x="200" y="72" width="56" height="16" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <rect x="266" y="72" width="80" height="16" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <rect x="356" y="72" width="112" height="16" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="480" y="84" class="s-mono" style="fill:var(--violet)">2\u221ar \u2014 grows with rank</text>

  <line x1="16" y1="110" x2="744" y2="110" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="136" class="s-label">TRAINING LOSS REACHED, SAME DATA AND STEPS</text>

  <text x="16" y="166" class="s-sub">rank 2</text>
  <rect x="120" y="154" width="300" height="16" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="428" y="166" class="s-mono" style="fill:var(--accent)">4.427</text>
  <rect x="500" y="154" width="288" height="16" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="476" y="166" class="s-mono" style="fill:var(--violet)">4.255</text>

  <text x="16" y="200" class="s-sub">rank 8</text>
  <rect x="120" y="188" width="245" height="16" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="373" y="200" class="s-mono" style="fill:var(--accent)">3.612</text>
  <rect x="500" y="188" width="175" height="16" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="683" y="200" class="s-mono" style="fill:var(--violet)">2.585</text>

  <text x="16" y="234" class="s-sub">rank 32</text>
  <rect x="120" y="222" width="152" height="16" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="280" y="234" class="s-mono" style="fill:var(--accent)">2.241</text>
  <rect x="500" y="222" width="40" height="16" rx="3" class="s-fill-2" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="548" y="234" class="s-mono" style="fill:var(--good)">0.589</text>

  <text x="16" y="276" class="s-mono" style="fill:var(--warn)">the gap widens with rank: 1.04\u00d7 at r=2, 1.40\u00d7 at r=8, 3.80\u00d7 at r=32</text>
</svg>` },

    { t: "h2", n: "05", id: "practice", text: "What to actually do",
      sub: "The default is still the default" },

    { t: "ladder", title: "Setting \u03b1 and r", rungs: [
      { level: "bad", label: "Tune \u03b1 and r together on a grid", why: "Treats them as two free parameters and burns a quadratic number of runs on a question the scaling rule exists to answer. It also makes every result incomparable with the last, because two things moved.",
        code: `for r in (4, 8, 16, 32):
    for alpha in (8, 16, 32, 64, 128):
        train(r=r, alpha=alpha)        # 20 runs to learn one thing` },
      { level: "ok", label: "\u03b1 = 2r, then sweep only r", why: "The rule, and the right default. The multiplier is pinned at 2, so raising the rank adds capacity without changing the strength and the runs stay comparable \u2014 measured, loss falls monotonically 4.427 to 2.241 across r=2 to 32.",
        code: `for r in (4, 8, 16, 32):
    train(r=r, alpha=2 * r)            # 4 runs, one variable` },
      { level: "best", label: "\u03b1 = 2r and sweep r, then check \u03b1/\u221ar if high rank disappoints", why: "Keep the simple default, and know the failure mode it has. If the loss keeps falling with rank but by less than the added capacity suggests, the constant multiplier is likely the limit \u2014 and the fix is a scaling rule, not a bigger grid.",
        code: `train(r=32, alpha=64, use_rslora=True)   # scale becomes alpha/sqrt(r)`,
        note: "Measured here: 0.589 against 2.241 at r=32 on identical data and steps." }
    ] },

    { t: "callout", kind: "tradeoff", title: "Why the simple rule is still right most of the time",
      body: [
        { t: "p", text: "At the ranks most people use \u2014 8 for a simple behaviour, 16 for instruction following \u2014 the measured gap is 1.40\u00d7 and smaller, and that is on a training loss that may partly reflect faster overfitting. One fewer hyperparameter is worth a lot, and `\u03b1 = 2r` buys it." },
        { t: "p", text: "The case for knowing the alternative is that the symptom of the problem is easy to misread. An adapter at r=32 that barely beats r=16 looks like \u201cthe task does not need more capacity\u201d, which sends you to the data. It can equally be the multiplier failing to keep pace, which sends you to one flag. Those are very different afternoons." }
      ] },

    { t: "exercise", kind: "analysis", title: "Run the same adapter under three scaling rules", difficulty: "advanced", minutes: 35,
      body: "Implement a LoRA branch by hand on a real model, train the identical data at ranks 2 through 32 under three scaling rules \u2014 \u03b1/r with \u03b1 = 2r, \u03b1/\u221ar with \u03b1 = 2r, and no scaling \u2014 and record the final training loss and the norm of the realised update. Then say which rule holds the strength constant as rank changes, and whether holding it constant is what you want.",
      requirements: [
        "Freeze the base and verify only A and B receive gradients, by counting trainable parameters",
        "Initialise B to zero so the adapter is a no-op at step zero",
        "Hold the data, the learning rate, the optimiser and the step count identical across all runs",
        "Report the final loss and ||(\u03b1/r)\u00b7BA|| for one layer at every rank and rule",
        "State explicitly what the measurement cannot distinguish"
      ],
      hint: "Substitute \u03b1 = 2r into \u03b1/r before you start, and look at what the multiplier actually equals. The answer changes what the experiment is about.",
      solution: { lang: "python", title: "g44.py \u2014 the sweep and the norms", code: `class LoRAConv1D(nn.Module):
    def __init__(self, base, r, scale):
        super().__init__()
        self.base = base
        for p in self.base.parameters():
            p.requires_grad = False
        d_in, d_out = base.weight.shape
        self.A = nn.Parameter(torch.randn(r, d_in) * (1.0 / math.sqrt(d_in)))
        self.B = nn.Parameter(torch.zeros(d_out, r))
        self.scale = scale

    def forward(self, x):
        return self.base(x) + self.scale * (x @ self.A.t() @ self.B.t())

def run(r, scale, label, epochs=6, lr=2e-4):
    torch.manual_seed(0)
    m = GPT2LMHeadModel.from_pretrained("gpt2")
    for p in m.parameters():
        p.requires_grad = False
    for blk in m.transformer.h:
        blk.attn.c_attn = LoRAConv1D(blk.attn.c_attn, r, scale)

    params = [p for p in m.parameters() if p.requires_grad]
    opt = torch.optim.AdamW(params, lr=lr)
    for ep in range(epochs):
        for x, mask in batches(encode(PAIRS)):
            labels = x.clone(); labels[mask == 0] = -100
            out = m(x, attention_mask=mask, labels=labels, use_cache=False)
            out.loss.backward(); opt.step(); opt.zero_grad()

    lay = m.transformer.h[0].attn.c_attn
    dW = scale * (lay.B @ lay.A)
    return sum(p.numel() for p in params), float(torch.linalg.matrix_norm(dW))

for r in (2, 4, 8, 16, 32):
    run(r, (2 * r) / r,            "alpha/r")        # == 2.0 for every r
    run(r, (2 * r) / math.sqrt(r), "alpha/sqrt(r)")  # == 2*sqrt(r)
    run(r, 1.0,                    "none")`,
        out: `  scaling                     r    trainable    loss in   loss out ||dW|| layer 0
  alpha/r  (alpha=2r)         2        73728      4.932      4.427        0.65270
  alpha/r  (alpha=2r)         8       294912      4.872      3.612        1.11549
  alpha/r  (alpha=2r)        32      1179648      4.693      2.241        1.77948

  alpha/sqrt(r)               2        73728      4.925      4.255        0.90027
  alpha/sqrt(r)               8       294912      4.744      2.585        2.57747
  alpha/sqrt(r)              32      1179648      4.126      0.589        5.50540

  no scaling (1.0)            2        73728      4.940      4.668        0.33354
  no scaling (1.0)            8       294912      4.910      4.038        0.64140
  no scaling (1.0)           32      1179648      4.813      3.030        1.04454`,
        notes: [
          { t: "p", text: "**With \u03b1 = 2r, the multiplier \u03b1/r is the constant 2 at every rank.** That is the first thing the substitution shows, and it reframes the exercise: the rule is not compensating for a rank-dependent growth, it is pinning the strength to a constant so that `r` can be swept alone. On that goal it succeeds completely \u2014 loss falls monotonically with rank and nothing else needed touching." },
          { t: "p", text: "**But a constant multiplier under-trains high ranks.** `\u03b1/\u221ar` reaches a lower loss at every rank, and the gap widens: 1.04\u00d7 at r=2, 1.40\u00d7 at r=8, **3.80\u00d7 at r=32** (0.589 against 2.241). The realised update tells the same story \u2014 under `\u03b1/r` the norm grows 2.7\u00d7 across the sweep against 6.1\u00d7 under `\u03b1/\u221ar`." },
          { t: "p", text: "**No scaling is worst at every rank**, which confirms the term is doing something: 3.030 at r=32 against 2.241 and 0.589. A multiplier of 1 simply pushes too weakly for this learning rate." },
          { t: "p", text: "**What the measurement cannot distinguish** is scaling from learning rate. A larger branch multiplier is, to first order, a larger effective step on `B`, so part of the gap would close by raising the learning rate under `\u03b1/r`. The reason the rule still matters is that `\u03b1/\u221ar` adapts automatically as rank changes, which is exactly what a scaling rule is for \u2014 otherwise the learning rate becomes a function of rank and you are back to tuning two things." },
          { t: "p", text: "**And it cannot tell you which produces a better model.** The loss here is on twelve training examples, and 4.1 showed this setup memorising them; a lower training loss may be faster overfitting. The honest claim is about optimisation speed at fixed steps, not about quality, and settling quality needs the held-out set 4.8 builds." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "`r` is how many dials the adapter has. `\u03b1/r` is how far each turn of a dial moves the output. The rule sets the second to a constant so you only ever think about the first \u2014 which is good advice, and worth knowing as a choice rather than as physics." },
        { t: "p", text: "The failure it produces is quiet: adding dials while each turn stays the same size. More capacity, same push, less gain than you expected." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe doubled LoRA rank from 16 to 32 and the loss barely moved. Is the task saturated?\u201d**" },
        { t: "p", text: "Maybe, and I would not conclude it yet, because there is a cheaper explanation that produces exactly this symptom." },
        { t: "p", text: "If they are using the standard `\u03b1 = 2r` convention, the multiplier on the adapter branch is the constant 2 regardless of rank. So doubling `r` adds capacity while the push through the branch stays the same size, and the adapter moves less per step than its new capacity allows. I measured this directly: at rank 32 the `\u03b1/r` convention finished at loss 2.241 where `\u03b1/\u221ar` finished at 0.589 on identical data and steps, and the gap was negligible at rank 2 \u2014 it widens precisely as rank grows." },
        { t: "p", text: "So the test is a one-line change: enable rank-stabilised LoRA, or set `\u03b1` to `2r\u00b7\u221ar` by hand, and re-run at 32. If the loss drops, it was the scaling. If it does not move, the task genuinely is saturated at 16 and the answer is data or target modules rather than capacity." },
        { t: "p", text: "Target modules is where I would look next. 4.3's decomposition showed MLP projections needing 122\u2013131 directions for 90% of their update against 44\u201378 for attention output projections \u2014 so if the adapters are attention-only, a large part of the update has nowhere to live, and adding the MLP matrices often beats raising rank on the ones you have." },
        { t: "p", text: "One caution on how we judge the answer. If the loss they are watching is training loss on a small set, a lower number may be faster memorisation rather than a better model \u2014 4.1 measured exactly that failure, with training loss improving while general ability degraded. I would want the comparison on a held-out set before calling any of these a win." }
      ] }
  ],

  takeaways: [
    "**`h = W\u2080x + (\u03b1/r)\u00b7BAx`**: the base output is untouched and a scaled low-rank branch is added to it.",
    "**`B` is initialised to zero**, so `BA` is zero and the wrapped model is bit-for-bit the original at step zero \u2014 the adapter fades in rather than perturbing a working model.",
    "**`A` is random and `B` is zero, not both zero**, because the gradient on `B` is proportional to `A`; if both were zero nothing would ever train.",
    "**With `\u03b1 = 2r` the multiplier `\u03b1/r` is the constant 2 at every rank** \u2014 the rule pins the strength rather than compensating for a rank-dependent growth.",
    "**On that goal it works**: under `\u03b1/r`, loss falls monotonically with rank (4.427 \u2192 2.241 from r=2 to 32) with nothing else needing re-tuning.",
    "**A constant multiplier under-trains high ranks.** `\u03b1/\u221ar` reached a lower loss at every rank, with the gap widening from 1.04\u00d7 at r=2 to **3.80\u00d7 at r=32** (0.589 against 2.241).",
    "**The realised update shows the same thing**: the norm grew 2.7\u00d7 across the sweep under `\u03b1/r` and 6.1\u00d7 under `\u03b1/\u221ar`.",
    "**No scaling at all is worst at every rank**, so the term is genuinely doing work \u2014 a multiplier of 1 pushes too weakly at this learning rate.",
    "**The measurement cannot separate scaling from learning rate** \u2014 a bigger multiplier is roughly a bigger step on `B` \u2014 but a scaling rule is what adapts automatically as rank changes.",
    "**Keep `\u03b1 = 2r` as the default and know its failure mode**: an adapter whose loss barely improves when rank doubles may be limited by the multiplier, not by the task."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Under the standard rule \u03b1 = 2r, what is the value of the \u03b1/r multiplier at rank 32?",
        options: [
          "64, since \u03b1 = 2r = 64",
          "2, because \u03b1/r = 2r/r = 2 at every rank",
          "0.0625, the reciprocal of 16",
          "It depends on the learning rate"
        ],
        answer: 1,
        why: "Substituting \u03b1 = 2r into \u03b1/r gives 2 for every rank, which is the point of the convention: the strength is pinned to a constant so that sweeping r changes capacity without changing how hard the branch pushes. It also means the rule is not compensating for any rank-dependent growth under its own recommended setting \u2014 there is nothing left to compensate. The learning rate is a separate quantity, though it interacts with the multiplier." },

      { stem: "Why is B initialised to zero while A is initialised randomly?",
        options: [
          "To halve the memory needed for the adapter at initialisation",
          "So BA is zero \u2014 the adapter is a no-op at step zero \u2014 while B's gradient, which is proportional to A, remains non-zero so training can proceed",
          "Because zero-initialised matrices converge faster under AdamW",
          "To keep the adapter's output orthogonal to the base output"
        ],
        answer: 1,
        why: "With B = 0 the product BA is zero, so the wrapped model is identical to the original and training starts from a known-good state rather than from a randomly perturbed one. Zeroing B specifically works because its gradient depends on A, which is non-zero; zeroing both would leave both gradients at zero and nothing would train. There is no memory saving, and no orthogonality property is involved." },

      { stem: "A team doubles LoRA rank from 16 to 32 under \u03b1 = 2r and the loss barely improves. What should they test first?",
        options: [
          "Whether the dataset is too small for the added capacity",
          "Whether the constant multiplier is limiting the update, by trying \u03b1/\u221ar scaling at the same rank",
          "Whether the learning rate should be halved for the larger adapter",
          "Whether the base model has been accidentally unfrozen"
        ],
        answer: 1,
        why: "With \u03b1 = 2r the branch multiplier stays at 2 however large r becomes, so added capacity arrives without any added push \u2014 measured, \u03b1/\u221ar reached 0.589 at rank 32 where \u03b1/r reached 2.241 on identical data and steps, with no meaningful gap at rank 2. It is a one-line test that distinguishes a scaling limit from genuine saturation. Halving the learning rate moves in the wrong direction, and an unfrozen base would show as far better training loss, not worse." },

      { stem: "The measurement shows \u03b1/\u221ar reaching a lower training loss at every rank. What does it not establish?",
        options: [
          "That the scaling term affects optimisation at all",
          "That \u03b1/\u221ar produces a better model, since the loss is on twelve training examples and may reflect faster memorisation",
          "That no scaling performs worse than both alternatives",
          "That the multiplier under \u03b1 = 2r is constant in rank"
        ],
        answer: 1,
        why: "Training loss on a tiny set is a measure of fit to that set, and 4.1 showed this exact configuration memorising its training data \u2014 so a lower number may be faster overfitting rather than a better model. Settling that needs a held-out set. The measurement does establish the other three: no scaling was worst at every rank, the multiplier is constant by substitution, and the differences between rules are large and consistent." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "A formula question where the interesting part is what the default rule implies",
    questions: [
      { level: "core",
        q: "Walk me through the LoRA formula.",
        strong: "A strong answer covers every term, including why B starts at zero.",
        answer: [
          { t: "p", text: "`h = W\u2080x + (\u03b1/r)\u00b7BAx`. The first term is the frozen pretrained layer, computed exactly as before. The second is the adapter: the input goes down through `A` into an `r`-dimensional bottleneck, back up through `B` to the output width, and gets scaled before being added." },
          { t: "p", text: "`A` is initialised small and random, `B` is initialised to zero. That matters \u2014 with `B = 0` the product is zero, so attaching an adapter leaves the model bit-for-bit identical and training starts from a known-good state instead of a randomly perturbed one. Zeroing `B` rather than `A` is the right choice because `B`'s gradient is proportional to `A`; if both were zero, neither would ever move." },
          { t: "p", text: "`r` is the capacity and `\u03b1/r` is the strength. The usual convention is `\u03b1 = 2r`, and the thing worth noticing is that this makes the multiplier exactly 2 at every rank \u2014 so the rule pins the strength to a constant, which is what lets you sweep `r` alone without re-tuning anything." },
          { t: "p", text: "And since nothing writes to `W\u2080`, the base cannot be damaged \u2014 which after seeing a full fine-tune cost 25% of a model's general perplexity is the property I value most." }
        ] },

      { level: "advanced",
        q: "What is the \u03b1/r scaling actually protecting, and is the default always right?",
        strong: "A strong answer notices what \u03b1 = 2r implies and knows the high-rank failure mode.",
        answer: [
          { t: "p", text: "Its stated job is to decouple capacity from strength, so that changing `r` does not silently change how hard the adapter pushes. Under the recommended `\u03b1 = 2r` it achieves that completely, because `\u03b1/r` is then the constant 2 \u2014 the strength cannot vary with rank because it does not vary at all." },
          { t: "p", text: "That is a good default and it has a cost at high rank. I ran the same adapter at ranks 2 to 32 under `\u03b1/r` and `\u03b1/\u221ar` with everything else held fixed. `\u03b1/\u221ar` reached a lower loss at every rank and the gap widened with rank \u2014 1.04\u00d7 at r=2, 1.40\u00d7 at r=8, and 3.80\u00d7 at r=32, where it finished at 0.589 against 2.241." },
          { t: "p", text: "The mechanism is that a constant multiplier means the effective push through the branch does not keep pace with the added capacity, so a high-rank adapter moves less per step than it could. That is the observation rank-stabilised LoRA is built on, and it is why `\u03b1/\u221ar` exists as an option." },
          { t: "p", text: "I would still use `\u03b1 = 2r` by default \u2014 at ranks 8 to 16 the gap is small and one fewer hyperparameter is worth a lot. What I would not do is read a disappointing r=32 run as task saturation without testing the scaling first, because the two have the same symptom and very different fixes." },
          { t: "p", text: "One honest limit: my comparison is training loss at a fixed step budget, so part of the gap is optimisation speed and could be partly recovered by raising the learning rate under `\u03b1/r`. The reason a scaling rule still matters is that it adapts automatically as rank changes \u2014 otherwise the learning rate becomes a function of rank and you are tuning two things again." }
        ] },

      { level: "core",
        q: "How do you choose r and \u03b1 in practice?",
        strong: "A strong answer reduces it to one variable and says what evidence moves it.",
        answer: [
          { t: "p", text: "Set `\u03b1 = 2r` and sweep `r` alone. That is the whole method, and the reason it works is that the convention makes the multiplier a constant, so the runs stay comparable \u2014 only capacity changes between them." },
          { t: "p", text: "Start at 8 for a formatting or style behaviour, 16 for instruction following, and go up if the loss is still improving. In my sweep the loss fell monotonically from 4.427 at r=2 to 2.241 at r=32, so there was still headroom at the top of the range." },
          { t: "p", text: "The evidence that tells you to stop is a held-out loss that stops improving, not a training loss \u2014 4.1 measured a run whose training loss kept falling while the model got worse at everything else, so the training curve on its own is not a stopping signal." },
          { t: "p", text: "And if raising rank stops helping sooner than expected, I would check two things before blaming the task: whether the adapters cover the MLP projections and not just attention, since an unadapted matrix contributes nothing, and whether the constant multiplier is the limit, which is a one-line test with `\u03b1/\u221ar`." }
        ] }
    ]
  }
});

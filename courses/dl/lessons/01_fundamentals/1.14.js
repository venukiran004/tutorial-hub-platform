/* ============================================================================
   LESSON 1.14 — Neural ODEs
   Mirrors 01_Neural_Network_Fundamentals.md · §20. The reference's ODEFunc is
   run as written under torchdiffeq: the ResNet/Euler identity, the NFE counts
   per solver, the adjoint's gradients against direct backpropagation, and
   reverse integration (scratchpad/dl/d114.py, torch 2.10 + torchdiffeq).
   ========================================================================= */
EC.receiveLesson({
  id: "1.14",

  lede: "**A residual block is the Euler method, and once you see that the rest follows.** `h_{t+1} = h_t + f(h_t)` is exactly one step of the crudest ODE solver there is, with the step size set to 1. Neural ODEs take that seriously: replace the stack of blocks with a single learned `dh/dt = f(h, t, θ)` and hand it to a real solver, which can take as many steps as the problem needs rather than as many as you wrote layers. This lesson runs that identity to zero difference, watches a solver decide how much work to do, and checks the adjoint method's gradients against ordinary backpropagation.",

  objectives: [
    "Show that a residual block is Euler integration with step size 1",
    "Read a solver's function-evaluation count and say what drives it",
    "Explain the adjoint method and the memory-for-compute trade it makes",
    "Say why an ODE flow is invertible and what that buys",
    "Judge when a Neural ODE is the right tool and when a ResNet is"
  ],

  prerequisites: ["1.4", "1.8", "1.12"],

  blocks: [

    { t: "h2", n: "01", text: "The identity", id: "identity" },

    { t: "p", text: "A residual block adds a learned correction to its input. Written out, that is a forward Euler step on a differential equation whose right-hand side is the block's function — with `Δt = 1` because nothing in the architecture says otherwise." },

    { t: "math", tex: "h_{t+1} = h_t + f(h_t, \\theta) \\qquad\\Longleftrightarrow\\qquad \\frac{dh}{dt} = f(h(t), \\theta), \\quad \\Delta t = 1" },

    { t: "code", lang: "python", title: "d114.py — eight blocks against the solver",
      code: `h = h0.clone()
for _ in range(8):                        # eight residual blocks sharing one f
    h = h + f(0.0, h)                     # h_{t+1} = h_t + f(h_t)

euler_out = odeint(f, h0, torch.linspace(0, 8, 9), method="euler")[-1]` },

    { t: "out", text: `  8 residual blocks : [-1.3226, 0.08279, -0.22125, 0.2147]
  odeint euler, 8 steps over t=0..8 : [-1.3226, 0.08279, -0.22125, 0.2147]
  max |difference| : 0.000e+00` },

    { t: "callout", kind: "insight", title: "Zero, not approximately zero",
      body: [{ t: "p", text: "These are not two methods that happen to agree closely. They are the same arithmetic in a different notation, so the difference is exactly zero in floating point. That is what makes the reframing legitimate rather than a metaphor — and it immediately raises the question the whole field is built on: if depth is really a step count, why is it a hyperparameter you fix in the architecture rather than something a solver decides?" }] },

    { t: "diagram", kind: "compare", title: "Fixed depth against a continuous one",
      caption: "The parameter count is the striking one. A 50-layer ResNet has 50 layers' worth of weights; a Neural ODE has one f, evaluated as many times as the solver decides.",
      columns: [
        { title: "ResNet", tone: "accent", items: ["Depth fixed at design time", "One parameter set per layer", "Memory O(L) in training", "Same compute every forward pass", "Not invertible in general"] },
        { title: "Neural ODE", tone: "violet", items: ["Depth chosen by the solver", "One parameter set, reused", "Memory O(1) with the adjoint", "Compute adapts to the dynamics", "Invertible — the flow runs backwards"] }
      ] },

    { t: "h2", n: "02", text: "The solver decides how much work to do", id: "nfe" },

    { t: "p", text: "Depth becomes **NFE** — the number of times the dynamics network is evaluated. A fixed-step solver takes what you tell it; an adaptive one takes what it needs to hit your error tolerance." },

    { t: "out", text: `  euler   fixed step 0.125 NFE=8    h(1)=[0.48789, -0.67711, -0.17954, -1.3982]
  rk4     fixed step 0.125 NFE=32   h(1)=[0.48437, -0.67198, -0.18918, -1.399]
  dopri5  rtol=0.001       NFE=14   h(1)=[0.48437, -0.67198, -0.18917, -1.39901]
  dopri5  rtol=1e-07       NFE=38   h(1)=[0.48437, -0.67198, -0.18918, -1.399]` },

    { t: "p", text: "Three things to read here. **Euler at 8 evaluations is visibly wrong** — its first component is 0.48789 where every better method says 0.48437. **RK4 costs 4 evaluations per step** (32 for 8 steps) and gets the right answer. And **dopri5 at a loose tolerance beats RK4 on both counts**: 14 evaluations rather than 32, agreeing to five decimals, because it places its steps where the dynamics actually need them instead of spreading them evenly." },

    { t: "out", text: `  dopri5 on gentle  dynamics: NFE=26
  dopri5 on stiff   dynamics: NFE=200` },

    { t: "callout", kind: "trap", title: "NFE is a cost that training can inflate",
      body: [{ t: "p", text: "Swapping the dynamics for a stiff `-50h + sin(20h)` took the same solver from 26 evaluations to 200 — an eight-fold slowdown with no change to the code. Nothing stops a network *learning* dynamics like that, and it often does: NFE creeps up over training as the learned field becomes stiffer, so a run that started fast gets slower every epoch. **Log NFE per batch.** It is the Neural ODE equivalent of the gradient-norm monitor from lesson 1.12, and rising NFE is the earliest sign that training is heading somewhere expensive." }] },

    { t: "h2", n: "03", text: "The adjoint method", id: "adjoint" },

    { t: "p", text: "Backpropagating through a solver means storing every intermediate state — `O(L)` memory in the number of steps, and the solver chooses `L`. The adjoint method avoids that by solving a second ODE **backwards in time** for the gradient, recomputing the forward states as it goes." },

    { t: "math", tex: "a(t) = \\frac{\\partial \\mathcal{L}}{\\partial h(t)}, \\qquad \\frac{da(t)}{dt} = -a(t)^{\\top}\\frac{\\partial f(h(t), t, \\theta)}{\\partial h}, \\qquad \\frac{d\\mathcal{L}}{d\\theta} = -\\int_T^0 a(t)^{\\top}\\frac{\\partial f}{\\partial \\theta}\\, dt" },

    { t: "out", text: `  direct backprop : NFE=80   grad norm=9.903399
  adjoint         : NFE=160  grad norm=9.903399
  max |gradient difference| = 5.960e-07` },

    { t: "p", text: "The gradients agree to within float32 rounding, and the adjoint used **twice the function evaluations** to get there — because it recomputes on the way back what direct backpropagation had stored. That is the trade in one line: constant memory, roughly double the compute." },

    { t: "diagram", kind: "flow", title: "Why it is O(1) in memory",
      caption: "Nothing from the forward solve is kept. The backward solve reconstructs each state it needs by integrating the dynamics again, which is why the memory does not grow with the step count.",
      cols: 4,
      nodes: [
        { id: "f", label: "Forward solve", sub: "h(0) to h(T), states discarded", tone: "accent" },
        { id: "l", label: "Loss at h(T)", sub: "gives a(T) = dL/dh(T)", tone: "warn" },
        { id: "b", label: "Backward solve", sub: "a(t) integrated T to 0", tone: "violet" },
        { id: "g", label: "Parameter gradients", sub: "accumulated along the way", tone: "good" }
      ],
      edges: [["f", "l"], ["l", "b"], ["b", "g"]] },

    { t: "callout", kind: "tradeoff", title: "When the adjoint is worth it",
      body: [{ t: "p", text: "Use it when memory is the binding constraint — a long integration, a large hidden state, or a batch you cannot otherwise fit. Use direct backpropagation when it fits, because it is about twice as fast and gives exact gradients rather than gradients reconstructed from a second numerical solve. The adjoint's accuracy also depends on the backward solve's tolerance: too loose and the gradients are subtly wrong in a way that looks like a training problem rather than a numerical one." }] },

    { t: "h2", n: "04", text: "Invertibility", id: "invertible" },

    { t: "p", text: "An ODE flow can be run backwards by integrating from `T` to `0`. No discrete architecture gives you that for free, and it is what makes continuous normalising flows possible." },

    { t: "out", text: `  h(0)            : [0.620497, -0.738007, -0.593054, -1.718811]
  h(1) then back  : [0.620498, -0.738007, -0.593054, -1.718811]
  max |difference|: 8.345e-07` },

    { t: "p", text: "Integrate forward to `h(1)`, then integrate the same dynamics from `t = 1` to `t = 0`, and the input comes back to seven decimal places — the residual is solver tolerance, not a structural loss. **FFJORD** builds on exactly this: transform a Gaussian into a data distribution by integrating, and get the exact log-density from the trace of the Jacobian along the path, estimated with the Hutchinson trick rather than formed in full." },

    { t: "math", tex: "\\log p(x) = \\log p(z_0) - \\int_0^T \\operatorname{Tr}\\!\\left(\\frac{\\partial f}{\\partial h(t)}\\right) dt" },

    { t: "h2", n: "05", text: "Where they actually fit", id: "applications" },

    { t: "table", head: ["Use", "Why the continuous view helps"],
      rows: [
        ["Irregularly-sampled time series", "**The strongest case.** Observations at arbitrary times need no resampling — you integrate to whatever `t` the measurement happened at"],
        ["Medical records, patient vitals", "The same property: visits are not on a grid, and interpolating to make one invents data"],
        ["Physics-informed models", "Known laws go in as ODE structure, and the network learns only the residual dynamics"],
        ["Generative density estimation", "FFJORD: invertibility gives an exact likelihood without architectural constraints"],
        ["Learning governing equations", "The learned `f` *is* the dynamics, so it can be inspected rather than only sampled"],
        ["Ordinary image classification", "**It does not.** A ResNet is faster, easier to debug, and at least as accurate"]
      ] },

    { t: "callout", kind: "warn", title: "The honest limitations",
      body: [{ t: "p", text: "Solver steps are sequential, so they parallelise far worse than a stack of layers — the wall-clock cost is real even when NFE looks modest. Learned dynamics can become stiff and demand an implicit solver. And debugging is genuinely harder: there is no layer-by-layer output to inspect, only a trajectory. The reference is blunt about adoption, and it is right — these shine in specialised domains, and for standard tasks a ResNet is the better engineering choice." }] },

    { t: "callout", kind: "note", title: "The libraries",
      body: [{ t: "p", text: "`torchdiffeq` is the original implementation and what this lesson runs — `odeint` for direct backpropagation, `odeint_adjoint` for the constant-memory version, with the same signature so switching is one import. `diffrax` is the JAX equivalent and adds SDEs; `torchdyn` wraps torchdiffeq in a higher-level API with flows and neural SDEs built in. Note the calling convention that catches everyone: `forward(self, t, h)` takes **time first**." }] },

    { t: "exercise", kind: "practice", title: "Make depth adaptive, then watch it grow", difficulty: "advanced", minutes: 34,
      prompt: "Build the reference's NeuralODEClassifier on a small dataset. Log NFE per batch throughout training and plot it. Then: (a) compare final accuracy against a ResNet with the same parameter count in f, (b) train once with odeint and once with odeint_adjoint, recording peak memory and wall-clock time, (c) tighten rtol from 1e-3 to 1e-7 and see what happens to both NFE and accuracy.",
      hints: [
        "Reset the NFE counter at the start of each forward pass, not each epoch.",
        "Expect NFE to climb as training progresses — that is the phenomenon, not a bug.",
        "Peak memory is the point of the adjoint; measure it with torch.cuda.max_memory_allocated if you have a GPU, or count stored tensors if not."
      ],
      solution: {
        notes: [
          { t: "p", text: "The NFE curve is the thing to keep. It typically starts low and climbs steadily, because the network is free to learn faster-varying dynamics and nothing in the loss discourages it. That is why regularising the dynamics — penalising the norm of `f` or of its Jacobian — is standard practice in papers that train these seriously: it is a speed regulariser more than an accuracy one." },
          { t: "p", text: "The tolerance sweep usually surprises people. Going from 1e-3 to 1e-7 multiplies NFE substantially and moves accuracy very little, because the model was never sensitive to that many digits of the trajectory. Loose tolerances during training and a tight one at evaluation is a reasonable default, and it is the same instinct as mixed precision in lesson 1.13 — spend numerical accuracy only where it changes the answer." }
        ]
      } }

  ],

  takeaways: [
    "A residual block is forward Euler with `Δt = 1` — the executed comparison differs by exactly 0.000e+00.",
    "Depth becomes NFE, and an adaptive solver hit RK4's answer in 14 evaluations rather than 32.",
    "Stiff dynamics took the same solver from 26 to 200 evaluations, so log NFE per batch as a cost monitor.",
    "The adjoint solves a second ODE backwards for `O(1)` memory: identical gradients, twice the function evaluations.",
    "ODE flows are invertible — reverse integration recovered the input to 8e-07, which is what FFJORD is built on.",
    "The real wins are irregular time series and physics-informed models; for image classification a ResNet is better engineering."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What is the relationship between a residual block and the Euler method?",
      options: ["They are loosely analogous", "A residual block is exactly one Euler step with step size 1", "Euler is a special case of a residual block", "They agree only for small activations"],
      answer: 1,
      why: "`h_{t+1} = h_t + f(h_t)` is the Euler update with `Δt = 1` written in network notation — the same arithmetic, so the executed comparison of eight blocks against an eight-step Euler solve differs by exactly zero, not approximately." },
    { stem: "Your Neural ODE trains fine but gets slower every epoch. What is the most likely cause?",
      options: ["Memory fragmentation", "The learned dynamics are becoming stiffer, so NFE is rising", "The adjoint is accumulating error", "The learning rate schedule"],
      answer: 1,
      why: "Nothing in the loss discourages the network from learning fast-varying dynamics, and an adaptive solver responds by taking more steps. The executed run shows stiff dynamics costing 200 evaluations against 26 for gentle ones — same solver, same code. Logging NFE per batch makes this visible; penalising the norm of f is the usual remedy." },
    { stem: "What does the adjoint method trade away for O(1) memory?",
      options: ["Gradient accuracy — they are approximate", "Compute: it roughly doubles the function evaluations", "The ability to use adaptive solvers", "Invertibility"],
      answer: 1,
      why: "The executed comparison gives 80 evaluations for direct backpropagation against 160 for the adjoint, with gradients agreeing to 5.96e-07. It recomputes on the backward pass what direct backpropagation stored, so memory stops depending on the step count and compute roughly doubles." },
    { stem: "For which task is a Neural ODE the clearly better choice over a ResNet?",
      options: ["ImageNet classification", "Irregularly-sampled clinical time series", "Text classification", "Any task needing many layers"],
      answer: 1,
      why: "Observations at arbitrary times are the natural fit: you integrate to whatever `t` a measurement happened at, with no resampling onto a grid and therefore no invented data. For standard image or text classification a ResNet is faster, easier to debug and at least as accurate — the reference says so plainly." }
  ] },

  interview: { title: "Interview", sub: "Neural ODE questions", questions: [
    { level: "Core", q: "What is a Neural ODE?",
      strong: "The continuous limit of a residual network: one learned dynamics function integrated by a solver, rather than a fixed stack of layers.",
      answer: [{ t: "p", text: "It starts from an identity rather than an analogy. A residual block computes `h + f(h)`, which is exactly a forward Euler step with step size 1 — I have run eight blocks against an eight-step Euler solve and the difference is zero. Take that seriously and depth stops being an architectural constant: you define `dh/dt = f(h, t, θ)` once and let a solver decide how many evaluations the problem needs. You get one parameter set instead of one per layer, compute that adapts to the difficulty of the dynamics, and a flow that is invertible by construction, which discrete architectures are not." }] },
    { level: "Senior", q: "Explain the adjoint method and when you would use it.",
      strong: "A second ODE solved backwards in time for the gradient, giving constant memory at roughly double the compute.",
      answer: [{ t: "p", text: "Backpropagating through a solver means keeping every intermediate state, and the solver decides how many there are — so memory is `O(L)` in a number you do not control. The adjoint defines `a(t) = ∂L/∂h(t)`, notes that it satisfies its own ODE, and integrates that backwards from `T` to `0`, accumulating parameter gradients along the way and recomputing the forward states as needed. Nothing from the forward solve is retained, so memory is constant. I have checked the gradients agree with direct backpropagation to about 6e-07 while using twice the function evaluations. I would reach for it when memory is the binding constraint — long integrations, large hidden states — and use direct backpropagation otherwise, because it is roughly twice as fast and the gradients are exact rather than reconstructed from a second numerical solve whose tolerance you now also have to get right." }] },
    { level: "Senior", q: "Would you put a Neural ODE in production?",
      strong: "Only for irregular time series or physics-informed problems — and I would monitor NFE as a latency risk.",
      answer: [{ t: "p", text: "For most tasks, no. Solver steps are sequential so they parallelise badly, learned dynamics can become stiff and demand expensive solvers, and there is no layer-by-layer output to inspect when something goes wrong — which makes debugging materially harder than a ResNet that is at least as accurate and faster. Where I would use one is the case it is genuinely built for: observations at irregular times, like clinical vitals or event streams, where a discrete model forces you to resample onto a grid and thereby invent data. If I did ship one, the thing I would monitor is NFE per request, because it is an adaptive cost: the same model can take eight times as many evaluations on harder inputs, which makes tail latency a function of the data rather than a constant. I would also cap the solver's maximum steps so a pathological input degrades to a slightly wrong answer rather than a timeout." }] }
  ] }
});

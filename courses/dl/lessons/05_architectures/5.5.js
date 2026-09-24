/* ============================================================================
   LESSON 5.5 — Reference Card: the GRU
   Mirrors Architectures/gru.md. Parameter formula checked; the reference's
   "faster training" claim benchmarked and found not to hold on torch 2.10 CPU.
   ========================================================================= */
EC.receiveLesson({
  id: "5.5",

  lede: "**The GRU is the LSTM with one gate removed and one state fewer, at 75 % of the parameters.** Every published comparison finds the two indistinguishable on accuracy, so the choice usually comes down to size and speed — and the speed claim is where this card diverges from its reference. Benchmarked on torch 2.10, the GRU was **1.6 to 3.1 times slower than the LSTM** across three shapes, despite having fewer parameters.",

  objectives: [
    "Apply the GRU parameter formula and verify the 75 % ratio",
    "Explain what coupling the update gate gives up",
    "Diagnose a GRU from its symptom",
    "Decide between GRU and LSTM on evidence rather than folklore"
  ],

  prerequisites: ["5.4"],

  blocks: [

    { t: "h2", n: "01", text: "The card", id: "tldr" },

    { t: "table", head: ["", ""],
      rows: [
        ["**Core idea**", "one state, two gates — `h_t = (1−z)⊙h̃ + z⊙h_{t−1}`"],
        ["**Gates**", "update `z` (couples forget and input), reset `r`"],
        ["**Why it works**", "`∂h_t/∂h_{t−1} = z_t` exactly — the same additive path as the LSTM's cell"],
        ["**Cost**", "3H(H+D+1) — exactly 75 % of an LSTM"],
        ["**Gives up**", "independent keep/write control, and the output gate"],
        ["**PyTorch**", "`nn.GRU(input_size, hidden_size, batch_first=True)` — gates packed r, z, n"]
      ] },

    { t: "h2", n: "02", text: "Parameter count", id: "complexity" },

    { t: "out", text: `  gru.md   H=128 D=64 : formula 74,112  pytorch 74,496  (+384)

      d     h        RNN        GRU       LSTM   GRU/LSTM
    100   256     91,648    274,944    366,592   0.750  (25% fewer)
    300   512    416,768  1,250,304  1,667,072   0.750  (25% fewer)
     32    64      6,272     18,816     25,088   0.750  (25% fewer)` },

    { t: "p", text: "Exactly 0.750 at every size, as `3H(H+D)` against `4H(H+D)` requires. PyTorch's extra 384 is `3H`, one bias chunk per gate." },

    { t: "h2", n: "03", text: "The speed claim", id: "speed" },

    { t: "out", text: `  batch=32 T=100 d=128 h=256
    RNN : median    42.8 ms   GRU : median   133.6 ms   LSTM: median    67.4 ms
  batch=16 T=50 d=64 h=128
    RNN : median    12.3 ms   GRU : median    29.4 ms   LSTM: median     9.5 ms
  batch=64 T=30 d=100 h=200
    RNN : median    13.2 ms   GRU : median    43.3 ms   LSTM: median    26.4 ms` },

    { t: "callout", kind: "warn", title: "The reference says the GRU trains faster. Measured, it is slower.",
      body: [{ t: "p", text: "Across three different shapes on CPU with torch 2.10, the GRU took **2.0×, 3.1× and 1.6×** the LSTM's time for a forward and backward pass, despite 25 % fewer parameters. This is not an arithmetic result — it is a kernel-optimisation one: PyTorch's LSTM has a well-tuned fused CPU path and the GRU does not get equivalent treatment. The picture may differ on CUDA, where cuDNN fuses both. The transferable lesson is the one from depthwise convolutions in lesson 2.4: FLOP and parameter counts predict latency poorly, and if speed is your reason for choosing an architecture you must benchmark it on your own hardware and framework version." }] },

    { t: "h2", n: "04", text: "What the coupled gate costs", id: "coupling" },

    { t: "p", text: "The LSTM's forget and input gates are independent, so it can keep all of its existing memory *and* write new content in the same step. The GRU's update gate ties them: keeping fraction `z` necessarily means taking `1 − z` of the candidate. The memory budget is zero-sum at every step." },

    { t: "callout", kind: "trap", title: "PyTorch's update gate means the opposite of the reference's",
      body: [{ t: "p", text: "The reference writes `h_t = (1−z)h_{t−1} + z·h̃`, so `z` near 1 means *take the new candidate*. PyTorch computes `h_t = (1−z)·h̃ + z·h_{t−1}`, so `z` near 1 means *keep the old state* — exactly reversed. Both train identically, since the network learns whichever sign it needs. But if you implement from a paper and validate against `nn.GRU`, or inspect gate statistics from a trained model expecting one convention, every number will read backwards. Check which convention your source uses before concluding anything from a gate value." }] },

    { t: "h2", n: "04b", text: "The reset gate", id: "reset" },

    { t: "math", tex: "\\tilde{h}_t = \\tanh\\big(W_x x_t + r_t \\odot (W_h h_{t-1})\\big)" },

    { t: "p", text: "The reset gate is the GRU's second control and the one most often implemented wrongly. It multiplies the **recurrent contribution inside the tanh**, not `h` before the matrix multiply. That ordering is not cosmetic: it lets `W_h h` be computed once and reused across all three gates, which is where the implementation's efficiency comes from. Applying `r` to `h` first gives a mathematically different function that still trains, so the error is silent." },

    { t: "dl", items: [
      ["`r` near 1", "The candidate sees the full previous state — normal operation, continuing a context."],
      ["`r` near 0", "The candidate is computed from the input alone, ignoring history entirely. This is how a GRU drops context that has become irrelevant, at a sentence boundary for instance."],
      ["Why it is separate from the update gate", "The update gate decides how much of the old state to *keep*; the reset gate decides how much of it the *new candidate* may look at. A cell can therefore retain its history while computing a fresh candidate that ignores it."]
    ] },

    { t: "h2", n: "05", text: "Diagnosis", id: "failures" },

    { t: "table", head: ["Symptom", "Likely cause", "Fix"],
      rows: [
        ["Slower than the LSTM you replaced", "Kernel optimisation, not arithmetic", "Benchmark before assuming; measured 1.6–3.1× slower on CPU"],
        ["Forgets over long ranges", "Coupled gate — cannot keep and write at once", "LSTM, or attention past ~100 steps"],
        ["Loss → NaN", "Exploding gradients through the gate paths", "`clip_grad_norm_`"],
        ["Train ≫ validation", "Overfitting", "It is already 25 % smaller than an LSTM; add dropout between layers"],
        ["Gate statistics look inverted", "Convention mismatch between PyTorch and the paper", "PyTorch's `z` means *keep the old state*"],
        ["Hand implementation does not match `nn.GRU`", "Reset gate applied in the wrong place", "`r` multiplies the recurrent term *inside* the tanh, not `h` beforehand"]
      ] },

    { t: "h2", n: "06", text: "Choosing", id: "choosing" },

    { t: "diagram", kind: "compare", title: "GRU or LSTM",
      caption: "Chung et al. (2014) found neither consistently better. The gap between either and a vanilla RNN is far larger than the gap between them.",
      columns: [
        { title: "Prefer GRU", tone: "good", items: [
          "Small dataset — 25 % fewer parameters means less overfitting",
          "Model size is constrained",
          "Fewer things to tune",
          "You will benchmark speed rather than assume it"
        ] },
        { title: "Prefer LSTM", tone: "accent", items: [
          "Dependencies beyond roughly 100 steps",
          "Large dataset where overfitting is not the constraint",
          "You want the output gate's separation of memory from exposure",
          "PyTorch CPU, where it is measurably faster"
        ] }
      ] },

    { t: "callout", kind: "insight", title: "This is not a decision worth much of your time",
      body: [{ t: "p", text: "Chung et al. compared them in 2014 and concluded neither consistently wins across tasks — GRU converges faster in epochs and is easier to tune, LSTM captures longer dependencies on some problems, and **both vastly outperform a vanilla RNN**. That last clause is the one that matters. Spend an afternoon trying both if you like; spend your real effort on the data, the sequence handling and whether a pretrained transformer would beat both." }] },

    { t: "exercise", kind: "practice", title: "Compare fairly", difficulty: "intermediate", minutes: 40,
      prompt: "Benchmark GRU and LSTM forward-plus-backward time on your own hardware at three shapes, warming up and taking medians — confirm or refute the 1.6–3.1× result. Then compare accuracy two ways on the same task: matched hidden size, and matched parameter count (GRU hidden ≈ LSTM hidden × 2/√3). Run several seeds and report the spread, not just the means.",
      hints: [
        "Warm up at least three iterations before timing; use median not mean.",
        "Matched hidden size gives the GRU 25 % fewer parameters — that confounds architecture with capacity.",
        "If the spread across seeds exceeds the gap between architectures, say so."
      ],
      solution: {
        notes: [
          { t: "p", text: "Your timing result may differ from mine, and that is the lesson rather than a problem — it depends on framework version, CPU against GPU, and which kernels are fused. What should reproduce is that the ranking is not predictable from parameter counts. If you get a different answer on CUDA than I did on CPU, both are correct and both are reasons to benchmark rather than assume." },
          { t: "p", text: "The matched-parameter comparison is the one that makes the accuracy claim meaningful. At equal hidden size the GRU has 25 % fewer parameters, so you are testing architecture and capacity together — and a GRU winning might only mean the LSTM was overfitting, which is a statement about your dataset size. Give the GRU a wider state to equalise and the gap usually closes." },
          { t: "p", text: "Reporting the seed spread is what turns this from an opinion into evidence. Differences between these two architectures are typically within run-to-run variance, which matches what Chung et al. found. If your measured gap is smaller than your spread across seeds, the honest conclusion is that you cannot distinguish them on this task — which is a perfectly good result and saves you from over-claiming." }
        ]
      } }

  ],

  takeaways: [
    "`3H(H + D + 1)` — exactly 75 % of an LSTM, verified at three sizes; PyTorch adds `3H`.",
    "`∂h_t/∂h_{t−1} = z_t` exactly — the same additive gradient path as the LSTM's cell.",
    "The coupled update gate makes the memory budget zero-sum: keeping more means writing less.",
    "PyTorch's `z` means *keep the old state* — the reverse of the reference's convention.",
    "Benchmarked: the GRU was 1.6–3.1× *slower* than the LSTM on torch 2.10 CPU despite fewer parameters.",
    "The reset gate multiplies the recurrent term inside the tanh, not `h` beforehand.",
    "Neither consistently beats the other; both vastly beat a vanilla RNN."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "How many parameters does a GRU have relative to an LSTM?",
      options: ["The same", "Exactly 75 % — three gates against four", "50 %", "125 %"],
      answer: 1,
      why: "`3H(H+D+1)` against `4H(H+D+1)`, measured at exactly 0.750 across three different sizes. That reduction is the GRU's main practical attraction, particularly on small datasets where fewer parameters means less overfitting." },
    { stem: "A benchmark shows the GRU slower than the LSTM. What does that tell you?",
      options: ["The benchmark is wrong", "Kernel optimisation differs by architecture — parameter count does not determine speed", "The GRU needs more epochs", "The hidden sizes were mismatched"],
      answer: 1,
      why: "Measured at 1.6–3.1× slower across three shapes on torch 2.10 CPU, because PyTorch's LSTM has a better-optimised fused path. The same lesson as depthwise convolutions: if speed is your reason for an architectural choice, benchmark it on your hardware and framework version." },
    { stem: "What does coupling the update gate cost the GRU?",
      options: ["Nothing", "It cannot keep all its existing memory while also writing new content", "It cannot handle long sequences", "It loses the gradient highway"],
      answer: 1,
      why: "The update is a convex combination: keeping fraction z means taking 1−z of the candidate, so the memory budget is zero-sum each step. An LSTM's forget and input gates are independent and can both be 1. The gradient highway is unaffected — `∂h/∂h = z` works exactly as the LSTM's forget gate does." },
    { stem: "You read that PyTorch's GRU update gate `z` near 1 means 'take the new candidate'. Is that right?",
      options: ["Yes", "No — PyTorch computes `(1−z)·h̃ + z·h_{t−1}`, so z near 1 means keep the old state", "It depends on the version", "Only for bidirectional GRUs"],
      answer: 1,
      why: "PyTorch's convention is the reverse of the reference's. Both train identically since the network learns whichever sign it needs, but if you inspect gate statistics from a trained model expecting one convention, every number reads backwards." }
  ] },

  interview: { title: "Interview", sub: "GRU and the comparison", questions: [
    { level: "Core", q: "GRU or LSTM — how do you decide?",
      strong: "Start with GRU for its 25 % smaller size; switch to LSTM for long dependencies or large data.",
      answer: [{ t: "p", text: "I would start with a GRU because it has exactly 75 % of the parameters and fewer things to tune, which matters most when data is limited and overfitting is the binding constraint. I would move to an LSTM if dependencies run beyond about a hundred steps, where the independent forget and input gates and the dedicated cell state do measurably better, or if the dataset is large enough that the extra capacity is an asset rather than a liability. What I would not do is choose on the basis that GRUs train faster, which is repeated everywhere and did not survive my benchmark — on torch 2.10 CPU I measured the GRU between 1.6 and 3.1 times slower than the LSTM across three shapes, because PyTorch's LSTM kernel is better optimised. Honestly, though, this is not a decision worth much time: Chung et al. found neither consistently better, and the gap between either of them and a vanilla RNN dwarfs the gap between them." }] },
    { level: "Senior", q: "Why do GRU and LSTM both fix vanishing gradients despite different gate counts?",
      strong: "Because what matters is the additive update path, not the number of gates.",
      answer: [{ t: "p", text: "Both replace a multiplicative state update with an additive one, and that is the whole mechanism. In an LSTM the cell update is `C_t = f*C_prev + i*g`, so differentiating gives exactly the forget gate — I have verified that against autograd and it is exact, not approximate. In a GRU the state update is a convex combination and the Jacobian is exactly the update gate, verified the same way. In both cases it is a gate value computed fresh at each step rather than a fixed weight matrix multiplied by a tanh derivative, so the decay rate is learned per dimension per timestep instead of being fixed by initialisation. Gate count changes how expressive the control is — an LSTM can keep and write independently where a GRU cannot, since its gates are coupled — but it does not change whether the gradient survives. That is why a GRU at three quarters of the parameters does essentially as well, and why the meaningful jump is from a plain RNN to either of them rather than between them." }] },
    { level: "Senior", q: "Someone reports a GRU beating an LSTM on their task. What would you check?",
      strong: "Whether parameter count was held constant, and whether the gap exceeds seed variance.",
      answer: [{ t: "p", text: "First, what was held constant. At equal hidden size the GRU has 25 % fewer parameters, so the comparison conflates architecture with capacity — a GRU winning may just mean the LSTM was overfitting, which is a statement about dataset size rather than about the cells. The cleaner test gives the GRU a wider hidden state so both have the same parameter count. Second, variance across seeds: differences between these two are usually within run-to-run noise, so a single-run gap tells you very little, and I would want the spread reported alongside the means. Third, tuning effort — GRUs are known to be easier to tune, so an equal hyperparameter budget can favour them for reasons unrelated to their ceiling. None of this means the result is wrong, and on a small dataset a GRU winning is entirely plausible for the overfitting reason. I would just want it stated as 'better on this data at this budget' rather than as a property of the architectures." }] }
  ] }
});

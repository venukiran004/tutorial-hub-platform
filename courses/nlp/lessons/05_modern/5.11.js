/* ============================================================================
   LESSON 5.11 — State Space Models: Mamba and S4
   Mirrors 02_Transformers_InDepth.md · §23. The recurrence/convolution
   duality is proved numerically to 4.77e-07 (§02), and a selective scan is
   implemented (scratchpad/nlp/n511.py).
   ========================================================================= */
EC.receiveLesson({
  id: "5.11",

  lede: "**At one million tokens a transformer's KV cache is 524 GB. An SSM's state is 4.2 MB — and it is 4.2 MB at every sequence length.** That is not an optimisation of the same quantity; it is a different quantity. A transformer stores every token it has seen, an SSM compresses history into a fixed-size state. This lesson derives why that is possible, proves the identity that makes SSMs trainable in parallel, and is honest about what the compression costs.",

  objectives: [
    "Derive the discretised state-space recurrence from its continuous form",
    "Prove numerically that the recurrence equals a convolution",
    "Explain why linearity is what buys both parallel training and O(1) inference",
    "Describe Mamba's selectivity and why it breaks the convolution",
    "State what SSMs structurally cannot do as well as attention"
  ],

  prerequisites: ["5.10", "4.1"],

  blocks: [

    { t: "h2", n: "01", text: "From control theory to sequences", id: "origin" },

    { t: "math", tex: "h'(t) = A\\,h(t) + B\\,x(t), \\qquad y(t) = C\\,h(t) + D\\,x(t)" },

    { t: "p", text: "A continuous linear dynamical system: a latent state `h` evolving under an input `x`. Discretise it — by zero-order hold or a bilinear transform — and you get a recurrence over sequence positions." },

    { t: "math", tex: "h_k = \\bar{A}\\,h_{k-1} + \\bar{B}\\,x_k, \\qquad y_k = C\\,h_k" },

    { t: "callout", kind: "insight", title: "This is an RNN, with one crucial omission",
      body: [{ t: "p", text: "The form is exactly recurrent — carry a state forward, update it with each input. What is missing is the **non-linearity inside the state update**. An LSTM computes `h_k = tanh(W h_{k-1} + U x_k)`; an SSM computes `h_k = A h_{k-1} + B x_k` with nothing wrapped around it. That omission looks like a weakness and is the entire source of the architecture's advantage, as the next section shows. Non-linearity is reintroduced *between* layers, where it costs nothing." }] },

    { t: "h2", n: "02", text: "The duality", id: "duality" },

    { t: "p", text: "Because the recurrence is linear, it can be unrolled in closed form. Substituting repeatedly gives `y_k` as a weighted sum over all past inputs — a **convolution** with a kernel computable in advance." },

    { t: "math", tex: "y_k = \\sum_{j=0}^{k} \\underbrace{\\left(C \\bar{A}^{\\,j} \\bar{B}\\right)}_{K_j} x_{k-j}" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n511.py — the same system computed both ways", code:
"def recurrent(x, A, B, C):\n    h = torch.zeros(len(A))\n    ys = []\n    for k in range(len(x)):\n        h = A * h + B * x[k]            # sequential, O(1) state\n        ys.append((C * h).sum())\n    return torch.stack(ys)\n\ndef convolutional(x, A, B, C):\n    # the kernel exists in closed form BECAUSE the recurrence is linear\n    K = torch.stack([(C * (A ** j) * B).sum() for j in range(len(x))])\n    return causal_conv(x, K)            # parallel over the whole sequence",
      caption: "Two completely different computations — one sequential, one parallel — from the same parameters." },

    { t: "out", text:
"recurrent      y[:5]  [0.09177, 0.456604, 0.398602, 0.188152, 0.102036]\nconvolutional  y[:5]  [0.09177, 0.456604, 0.398602, 0.188152, 0.102036]\n\nmax absolute difference: 4.768e-07\n\nkernel, first 8 taps:\n  [-0.42513, -0.65283, -0.70912, -0.64549, -0.54339, -0.44074, -0.35103, -0.27724]" },

    { t: "callout", kind: "crit", title: "Parallel training and sequential inference, from one set of weights",
      body: [{ t: "p", text: "Agreement to **4.77e-07** is float32 rounding. The same parameters give two modes, and you use whichever suits the situation: **convolutional** during training, where the whole sequence is available and an FFT makes the convolution `O(N log N)` and fully parallel; **recurrent** during inference, where tokens arrive one at a time and the state is `O(1)` per step. This is exactly the combination lesson 4.1 said you had to choose between — an RNN has the cheap inference and no parallel training, a transformer has parallel training and a growing cache. The SSM has both, and linearity is the reason." }] },

    { t: "p", text: "Note the kernel decays. `|A| < 1` means `A^j` shrinks with `j`, so distant inputs contribute less — and the rate of that decay *is* the model's memory horizon." },

    { t: "h2", n: "03", text: "Why HiPPO matters", id: "hippo" },

    { t: "out", text:
"A         |A|^50            half-life (steps)\n0.500     8.882e-16               1.0\n0.900     5.154e-03               6.6\n0.990     6.050e-01              69.0\n0.999     9.512e-01             692.8" },

    { t: "callout", kind: "insight", title: "A random A gives an arbitrary memory horizon",
      body: [{ t: "p", text: "The half-life of the kernel is extraordinarily sensitive to `A`: 0.5 forgets within a single step, 0.999 remembers for nearly 700. Initialise `A` randomly and the model's ability to see the past is a matter of luck. **HiPPO** — the contribution that made S4 work — initialises `A` so the state maintains a *compressed history* of the input, specifically a projection onto Legendre polynomials, which is provably the optimal fixed-size summary of a function's past. That turns long-range memory from an accident of initialisation into a property of the architecture, and it is why S4 could handle 16k-token sequences when earlier SSMs could not." }] },

    { t: "h2", n: "04", text: "The state that does not grow", id: "state" },

    { t: "out", text:
"d_model 4096, 32 layers, d_state 16, fp16\n\nSSM state, any sequence length:         4.2 MB\n\ntransformer KV cache (MHA)\n  2,048 tokens         1.07 GB        256x the SSM state\n  8,192 tokens         4.29 GB       1024x\n  32,768 tokens       17.18 GB       4096x\n  131,072 tokens      68.72 GB      16384x\n  1,000,000 tokens   524.29 GB     125000x" },

    { t: "callout", kind: "insight", title: "Different quantities, not different constants",
      body: [{ t: "p", text: "The transformer's cache is `O(sequence)`; the SSM's state is `O(1)`. At 2,048 tokens the ratio is 256x and at a million it is 125,000x, because the two are on different curves entirely. Everything in lesson 5.2 — GQA, PagedAttention, cache quantisation — shrinks the constant in front of a linear term. An SSM removes the term. That is why SSMs keep being revisited for long context, and why the interest is not really about FLOPs." }] },

    { t: "h2", n: "05", text: "Mamba's selectivity", id: "mamba" },

    { t: "p", text: "S4's `A`, `B` and `C` are fixed, so the same filter is applied to every input regardless of content. That is a real limitation — the model cannot decide that *this* token matters more than that one. Mamba makes the parameters functions of the input." },

    { t: "math", tex: "B_k = \\text{Linear}(x_k), \\quad C_k = \\text{Linear}(x_k), \\quad \\Delta_k = \\text{softplus}(\\text{Linear}(x_k))" },

    { t: "code", lang: "python", title: "A selective scan, implemented", code:
"def selective_scan(x, A, B_t, C_t, delta_t):\n    \"\"\"Mamba-style: the parameters vary per timestep.\"\"\"\n    h = torch.zeros(A.shape[0])\n    ys = []\n    for k in range(x.shape[0]):\n        A_bar_k = torch.exp(delta_t[k] * A)      # zero-order hold\n        B_bar_k = delta_t[k] * B_t[k]\n        h = A_bar_k * h + B_bar_k * x[k]\n        ys.append((C_t[k] * h).sum())\n    return torch.stack(ys)",
      caption: "`delta` is the discretisation step, and it is the gate. A large delta writes hard and forgets fast; a small one lets the state coast." },

    { t: "out", text:
"delta range in this run: [0.0198, 0.2189]\nresulting A_bar for state 0: [0.9804, 0.8034]" },

    { t: "callout", kind: "insight", title: "Delta is a content-based forget gate",
      body: [{ t: "p", text: "Since `Ā_k = exp(Δ_k · A)` and `A` is negative, a **small** delta of 0.0198 gives `Ā = 0.9804` — the state barely decays, so the model coasts past an unimportant token. A **large** delta of 0.2189 gives `Ā = 0.8034`, a much faster decay that overwrites history with the current input. The model computes delta from the token itself, so it decides per token how much to remember. This is functionally the LSTM's forget gate, arrived at from a completely different direction, and it is what closed most of the quality gap with transformers." }] },

    { t: "callout", kind: "trap", title: "Selectivity breaks the convolution",
      body: [{ t: "p", text: "The duality in section 02 depended on `Ā` being **constant**, so that one kernel `K_j = C Ā^j B̄` applied everywhere. Once `Ā_k`, `B_k` and `C_k` vary with position, there is no single kernel to FFT — the convolutional mode is gone. Mamba recovers parallelism a different way, with a **hardware-aware parallel scan**: an associative scan computes the recurrence in `O(log N)` depth rather than `O(N)`, implemented as a fused kernel that keeps the state in SRAM. So Mamba trades the elegant FFT for a harder engineering problem, which is why the reference implementation is a custom CUDA kernel rather than a few lines of PyTorch." }] },

    { t: "h2", n: "06", text: "What SSMs cannot do", id: "limits" },

    { t: "diagram", kind: "compare", title: "The structural trade",
      columns: [
        { title: "Attention", tone: "violet", items: [
          "Stores every token explicitly",
          "Exact retrieval of any past token",
          "KV cache grows linearly forever",
          "O(n squared) compute",
          "Strong on copying and retrieval",
          "Parallel training, growing state"
        ] },
        { title: "State space model", tone: "teal", items: [
          "Compresses history into a fixed state",
          "Retrieval is lossy by construction",
          "State is constant at 4.2 MB",
          "O(n) compute",
          "Weak on copying and retrieval",
          "Parallel training AND constant state"
        ] }
      ] },

    { t: "callout", kind: "crit", title: "A fixed-size state cannot hold an arbitrary past",
      body: [{ t: "p", text: "This is information-theoretic, not a training deficiency. A transformer keeps every token and can attend to any of them exactly; an SSM compresses everything into a fixed 16-dimensional state per layer. Asked to reproduce a specific token seen 10,000 positions ago, attention looks it up and an SSM must have kept it in a summary that also had to hold everything else. That is precisely why SSMs underperform on **copying, retrieval and associative recall** benchmarks — the tasks that isolate exact memory. It also predicts where they do well: modelling that depends on aggregate context rather than specific tokens." }] },

    { t: "callout", kind: "tradeoff", title: "Which is why hybrids won",
      body: [{ t: "p", text: "The field has not replaced attention with SSMs; it has **mixed** them. Architectures like Jamba interleave a few attention layers among many Mamba layers, so the model gets constant-state efficiency for most of its depth and exact retrieval where it needs it. A small number of attention layers is enough to support the recall the SSM layers cannot do, while the cache cost is a fraction of a full transformer's. That is the usual resolution of a structural trade-off — not one side winning, but a ratio being found." }] },

    { t: "exercise", title: "Implement the duality",
      tasks: [
        "Implement both modes of an SSM and confirm they agree to floating-point precision.",
        "Plot the kernel K_j for several values of A and relate its decay to the half-life.",
        "Measure how long a value persists in the state for A = 0.9 against A = 0.999.",
        "Implement a selective scan and check that varying delta changes the effective decay rate as exp(delta · A) predicts.",
        "Compare a small SSM and a small transformer on a copying task where a token must be reproduced exactly N positions later, sweeping N."
      ] }
  ],

  takeaways: [
    "An SSM is a linear RNN: h_k = Ā h_{k-1} + B̄ x_k, with no non-linearity inside the state update.",
    "That linearity lets the recurrence unroll into a convolution with kernel K_j = C Ā^j B̄ — verified to 4.77e-07.",
    "So one set of weights gives parallel O(N log N) training via FFT and O(1)-state sequential inference.",
    "The kernel decays because |A| < 1, and that decay rate is the memory horizon: A = 0.9 has a 6.6-step half-life, A = 0.999 has 692.8.",
    "HiPPO initialises A so the state holds a provably optimal compressed history, turning long-range memory from luck into architecture.",
    "An SSM's state is 4.2 MB at any length; a transformer's KV cache is 1.07 GB at 2k tokens and 524 GB at 1M — different curves, not different constants.",
    "Mamba makes B, C and delta functions of the input; delta acts as a content-based forget gate, with Ā = 0.9804 at delta 0.0198 and 0.8034 at 0.2189.",
    "Selectivity destroys the single convolution kernel, so Mamba uses a hardware-aware parallel scan instead of an FFT.",
    "A fixed-size state cannot hold an arbitrary past, which is why SSMs underperform on copying, retrieval and associative recall.",
    "Hybrids won: a few attention layers among many SSM layers give constant-state efficiency plus exact recall where it is needed."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why can an SSM train in parallel when an LSTM cannot?",
      options: ["It has fewer parameters", "Its state update is linear, so the recurrence unrolls into a convolution with a closed-form kernel", "It uses attention internally", "It processes tokens in reverse"],
      answer: 1,
      why: "An LSTM computes h_k = tanh(W h_{k-1} + U x_k) — the non-linearity inside the state update makes closed-form unrolling impossible. An SSM's h_k = A h_{k-1} + B x_k unrolls to a sum over A^j B x_{k-j}, a convolution computable by FFT. I verified the two modes agree to 4.77e-07." },
    { stem: "How does an SSM's inference state compare with a transformer's KV cache?",
      options: ["Both grow linearly with sequence length", "The SSM's is constant — 4.2 MB at any length — while the cache is 1.07 GB at 2k tokens and 524 GB at 1M", "The SSM's grows faster", "They are the same size"],
      answer: 1,
      why: "They are different asymptotics, not different constants. A transformer stores every token; an SSM compresses history into a fixed state. Everything in lesson 5.2 — GQA, paging, cache quantisation — shrinks the constant in front of a linear term, whereas an SSM removes the term." },
    { stem: "What does Mamba's delta parameter do?",
      options: ["Controls the learning rate", "Acts as a content-based forget gate — Ā = exp(delta · A), so small delta means the state coasts and large delta means it overwrites", "Sets the state dimension", "Normalises the output"],
      answer: 1,
      why: "Measured: delta 0.0198 gives Ā = 0.9804, barely any decay, while delta 0.2189 gives 0.8034, much faster decay. Since delta is computed from the token itself, the model decides per token how much to remember — functionally an LSTM forget gate reached from a different direction, and what closed most of the quality gap." },
    { stem: "Why do SSMs underperform on copying and retrieval tasks?",
      options: ["They train less stably", "A fixed-size state cannot hold an arbitrary past — compression is lossy by construction, while attention keeps every token", "They have no positional encoding", "Their kernels decay too fast"],
      answer: 1,
      why: "It is information-theoretic rather than a training problem. Reproducing a token seen 10,000 positions ago requires that it survived compression into a state that also had to hold everything else. Attention looks it up exactly. This is why hybrids — a few attention layers among many SSM layers — are where the field landed." }
  ] },

  interview: { title: "Interview", sub: "Alternatives to attention", questions: [
    { level: "Core", q: "What is a state space model and why is it interesting?",
      strong: "A linear RNN that unrolls into a convolution, giving parallel training and constant inference state.",
      answer: [{ t: "p", text: "It's a sequence model derived from continuous linear dynamical systems — a latent state evolving under an input — discretised into a recurrence: h_k equals A-bar h_{k-1} plus B-bar x_k, with y_k equals C h_k. Structurally it's an RNN, but with no non-linearity inside the state update, and that omission is the whole point. Because the recurrence is linear you can unroll it in closed form, and it becomes a convolution with kernel K_j equals C A^j B. I implemented both modes and they agree to 4.77e-07. So one set of weights gives you two computations: convolutional mode during training, parallel over the whole sequence via FFT, and recurrent mode at inference with an O(1) state. That's the combination you're normally told to choose between — an RNN has cheap inference and no parallel training, a transformer has parallel training and a cache that grows forever. The practical consequence is stark at long context. For a 4096-wide, 32-layer model the SSM state is 4.2 megabytes regardless of sequence length, while a transformer's KV cache is 1.07 GB at 2k tokens and 524 GB at a million. Those are different curves, not different constants." }] },
    { level: "Senior", q: "What did Mamba add over S4, and what did it cost?",
      strong: "Input-dependent parameters — content-based gating — at the price of losing the convolutional mode.",
      answer: [{ t: "p", text: "S4's A, B and C are fixed, so the same filter applies to every token regardless of content — the model can't decide that this token matters more than that one. Mamba makes B, C and the discretisation step delta functions of the input. Delta is the interesting one: since A-bar equals exp of delta times A, and A is negative, a small delta means almost no decay and the state coasts past an unimportant token, while a large delta decays fast and overwrites history with the current input. In my implementation delta ranged from 0.0198 to 0.2189, giving A-bar from 0.9804 down to 0.8034. That's a content-based forget gate, functionally the same thing an LSTM has, reached from a completely different direction — and it's what closed most of the quality gap with transformers. The cost is that it breaks the duality. The convolution existed because a single kernel C A^j B applied everywhere; once the parameters vary per position there's no single kernel to FFT, so the convolutional training mode is gone. Mamba recovers parallelism with a hardware-aware associative scan that computes the recurrence in logarithmic depth as a fused kernel keeping state in SRAM. So the elegance is traded for a harder engineering problem, which is why the reference implementation is custom CUDA rather than a few lines of PyTorch." }] },
    { level: "Senior", q: "Will SSMs replace transformers?",
      strong: "No — hybrids won, because a fixed state cannot do exact retrieval.",
      answer: [{ t: "p", text: "I don't think so, and the reason is structural rather than a matter of more research. A transformer stores every token explicitly and can attend to any of them exactly. An SSM compresses history into a fixed-size state — 16 dimensions per layer in typical configurations. Asked to reproduce a specific token seen 10,000 positions ago, attention looks it up; the SSM needs that token to have survived compression into a summary that also had to hold everything else. That's information-theoretic, not a training deficiency, and it shows up exactly where you'd predict: SSMs consistently underperform on copying, retrieval and associative recall benchmarks, the tasks that isolate exact memory. What has actually happened is hybridisation. Architectures like Jamba interleave a small number of attention layers among many Mamba layers, so most of the depth gets constant-state efficiency and a few layers provide the exact retrieval the rest can't. The cache cost is a fraction of a full transformer's while the recall capability is largely preserved. That's the normal resolution of a real structural trade-off — not one side winning, but a ratio being found. I'd also note that the pressure driving interest in SSMs is long context, and attention's side of that has kept improving too, with FlashAttention making exact attention affordable at lengths that seemed impossible when S4 appeared." }] }
  ] }
});

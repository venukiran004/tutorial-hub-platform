/* ============================================================================
   LESSON 5.3 — Reference Card: the Recurrent Network
   Mirrors Architectures/rnn.md. Parameter formula checked against PyTorch,
   including the discrepancy from PyTorch's second bias vector.
   ========================================================================= */
EC.receiveLesson({
  id: "5.3",

  lede: "**The vanilla RNN is a teaching architecture and a diagnostic baseline, not something to ship.** Module 3 measured exactly where it stops working: at twenty steps the gradient reaching the first position is already down by a factor of 3.7 million, and at a hundred it is exactly zero. This card exists so you can recognise those failures quickly — in an RNN, and in the gated cells where milder versions of the same problems persist.",

  objectives: [
    "Apply the RNN parameter formula and account for PyTorch's extra bias vector",
    "Diagnose an RNN from its symptom",
    "State the compute characteristics and why they cannot be parallelised",
    "Say when a vanilla RNN is still the right choice"
  ],

  prerequisites: ["5.2"],

  blocks: [

    { t: "h2", n: "01", text: "The card", id: "tldr" },

    { t: "table", head: ["", ""],
      rows: [
        ["**Recurrence**", "`h_t = tanh(W_hh h_{t−1} + W_xh x_t + b)`"],
        ["**Assumes**", "order matters; history can be summarised into a fixed-size state"],
        ["**Gives you**", "variable-length input, parameter sharing across time, O(1) state"],
        ["**Key risks**", "vanishing and exploding gradients; no parallelism over time"],
        ["**Practical ceiling**", "about 10–20 steps of dependency"],
        ["**PyTorch**", "`nn.RNN(input_size, hidden_size, batch_first=True)`"]
      ] },

    { t: "h2", n: "02", text: "Parameter count", id: "complexity" },

    { t: "math", tex: "\\text{params} \\approx H(H + D + 1), \\qquad \\text{compute} = O(T \\cdot H^2) \\; \\text{— not parallel over } T" },

    { t: "out", text: `  rnn.md   H=128 D=64 : formula 24,704  pytorch 24,832  (pytorch has 2 bias vectors: +128)` },

    { t: "callout", kind: "note", title: "PyTorch keeps a second, redundant bias",
      body: [{ t: "p", text: "The reference's formula gives 24,704 and PyTorch reports 24,832. The 128 difference is `bias_hh`, a second bias vector that PyTorch stores alongside `bias_ih` for CuDNN kernel compatibility. Mathematically they are redundant — only their sum affects the computation — which is why any hand implementation must add both to match. The same offset appears in the LSTM and GRU cards, scaled by the number of gates." }] },

    { t: "p", text: "Compute is `O(T·H²)` and **cannot be parallelised across T**, because each step needs the previous state. That is the architectural limitation lesson 4.1 identified as decisive: no amount of hardware removes it, which is why transformers scaled and RNNs did not." },

    { t: "h2", n: "03", text: "Diagnosis", id: "failures" },

    { t: "table", head: ["Symptom", "Likely cause", "Fix"],
      rows: [
        ["Ignores the start of long inputs", "Vanishing gradients — measured 0.000e+00 at 100 steps", "LSTM or GRU; attention for anything longer"],
        ["Loss spikes or goes to NaN", "Exploding gradients", "`clip_grad_norm_` — rescaled a measured norm of 753 to 1.0"],
        ["Accuracy correlates with sequence length", "Padding leaking through `h_n`", "`pack_padded_sequence` — packed and padded `h_n` genuinely differ"],
        ["Training is slow and the GPU is idle", "Sequential dependency, not arithmetic", "Larger batches, truncated BPTT, or a transformer"],
        ["Train ≫ validation", "Overfitting", "Dropout between layers — never on the recurrent path"],
        ["`dropout` argument seems to do nothing", "`num_layers=1`, so there is no between-layer position", "Apply `nn.Dropout` to embeddings or outputs explicitly"],
        ["Bidirectional model underperforms slightly", "Using `output[:, -1, :]` as the summary", "`torch.cat([h_n[-2], h_n[-1]], dim=1)`"]
      ] },

    { t: "callout", kind: "crit", title: "Clipping fixes exploding, never vanishing",
      body: [{ t: "p", text: "The asymmetry is worth holding onto because it determines whether you reach for a hyperparameter or an architecture. An exploding gradient still points in a meaningful direction, so rescaling it preserves the information — clipping took a measured norm of 753 down to 1.0 cleanly. A vanished gradient contains no direction to preserve; at a hundred steps I measured exactly 0.000e+00 after float32 underflow, and no rescaling recovers signal from zero. If your problem is vanishing, the fix is gating, skip connections or attention — not a knob." }] },

    { t: "h2", n: "03b", text: "Why the gradient decays, in one line", id: "why" },

    { t: "math", tex: "\\frac{\\partial h_t}{\\partial h_k} = \\prod_{j=k+1}^{t} W_{hh}^{T} \\, \\mathrm{diag}(\\tanh'(z_j))" },

    { t: "p", text: "Two factors, both working against you. `tanh'` is at most 1 and falls away fast — 0.42 at `z=1`, 0.07 at `z=2` — so the activation alone shrinks the gradient at every step, and it shrinks *more* as the network becomes confident and its states saturate. And because the weights are shared, `W_hh` appears `t − k` times, so the product behaves like its largest eigenvalue raised to that power: below 1 it vanishes, above 1 it explodes, with no stable middle over long sequences." },

    { t: "out", text: `  small init  |lambda_max| = 0.478  ->  ||dh_50/dh_0|| = 6.046e-17
  standard    |lambda_max| = 0.957  ->  ||dh_50/dh_0|| = 3.231e-03
  large init  |lambda_max| = 1.435  ->  ||dh_50/dh_0|| = 1.528e+00` },

    { t: "callout", kind: "insight", title: "Even an eigenvalue of 0.957 loses three orders of magnitude",
      body: [{ t: "p", text: "That is the argument against trying to fix this with initialisation. At an eigenvalue of essentially 1 — 0.957 — the gradient over fifty steps still falls to 3.2e-03, because the tanh derivative is pulling it down independently. There is no setting of `W_hh` that keeps gradients healthy across long sequences while remaining stable, which is precisely why the solution had to be architectural. Gated cells replace this product with a multiply by a learned gate, removing both the fixed matrix and the activation derivative from the path." }] },

    { t: "h2", n: "04", text: "The knobs", id: "hyperparameters" },

    { t: "table", head: ["Parameter", "Effect"],
      rows: [
        ["Hidden size `H`", "Memory capacity; cost grows as `H²`"],
        ["Number of layers", "Depth of recurrence — 2–4 for NLP, more for speech"],
        ["Truncation length", "Context against memory; `O(k)` instead of `O(T)`"],
        ["Bidirectional", "Future context — and it destroys causality, so never for generation"],
        ["Dropout", "Between layers only; silently ignored at `num_layers=1`"],
        ["Gradient clip norm", "Stability — log the actual norms before choosing the threshold"]
      ] },

    { t: "callout", kind: "warn", title: "Set the clip threshold from data, not from the default",
      body: [{ t: "p", text: "`clip_grad_norm_` returns the pre-clip norm. In a measured run those sat between 5.3 and 7.0 against a threshold of 1.0, meaning every single step was being divided by five to seven — a permanent reduction in effective learning rate that nobody configured deliberately and that interacts confusingly with the LR schedule. Log the returned norms for a few hundred steps and set the threshold somewhere above the typical value, so clipping catches genuine outliers rather than firing constantly." }] },

    { t: "h2", n: "04b", text: "The shapes PyTorch returns", id: "shapes" },

    { t: "table", head: ["Tensor", "Shape", "What it is"],
      rows: [
        ["`output`", "`(B, T, H x directions)`", "The **top layer's** hidden state at every timestep"],
        ["`h_n`", "`(layers x directions, B, H)`", "The final state of **every** layer and direction"],
        ["`c_n` (LSTM only)", "`(layers x directions, B, H)`", "The final cell state"]
      ] },

    { t: "callout", kind: "trap", title: "`output` is not every layer, and `h_n[-1]` is not always what you want",
      body: [{ t: "p", text: "Two confusions that cost people hours. `output` contains only the top layer regardless of depth — its shape does not change when you go from one layer to four, so a model that silently ignores your extra layers looks identical to one that uses them. And for a bidirectional model the sequence summary is `torch.cat([h_n[-2], h_n[-1]], dim=1)`, not `h_n[-1]` and not `output[:, -1, :]`, because the backward direction's final state corresponds to timestep 0. Both mistakes degrade accuracy without raising anything, which is exactly why they survive review." }] },

    { t: "h2", n: "05", text: "When it is still the right choice", id: "when" },

    { t: "p", text: "Rarely, and specifically. A vanilla RNN is appropriate when dependencies are genuinely short — a handful of steps — and you want the smallest possible model, as on a microcontroller. Beyond that, a GRU costs three times the parameters and removes the dominant failure mode, which is nearly always worth it. The RNN's real value now is pedagogical and diagnostic: it is the baseline that tells you whether your problem needs gating at all." },

    { t: "exercise", kind: "practice", title: "Map the ceiling", difficulty: "intermediate", minutes: 35,
      prompt: "Build the signal-at-position-0 task from lesson 3.3 and find where a vanilla RNN's accuracy falls to chance, sweeping lag from 5 to 60 in steps of 5. For each lag, also record the gradient norm arriving at position 0 before training. Plot accuracy and gradient on the same axis with a log scale for the gradient, and identify the gradient magnitude below which learning fails.",
      hints: [
        "Keep hidden size, optimiser and step count fixed across lags.",
        "Use `retain_grad()` on the embedding output for per-position gradients.",
        "The accuracy cliff and the gradient threshold should line up."
      ],
      solution: {
        notes: [
          { t: "p", text: "The two curves lining up is the result worth having. Accuracy holds near 100 % while the gradient at position 0 stays above some threshold and collapses to chance below it — which makes the abstract claim about vanishing gradients into a concrete, predictive number for your setup. Once you have it, you can estimate whether a given architecture will work on a given dependency length before training anything." },
          { t: "p", text: "One thing to be careful about: this task is unusually easy for an RNN because it only requires preserving a single bit. In my measurements a vanilla RNN solved it at lags of 20 and 30 where I expected failure, and only broke down at 50. Real tasks require carrying much richer state, so the practical ceiling is lower than a single-bit probe suggests — treat the number you measure as an upper bound rather than a typical case." }
        ]
      } }

  ],

  takeaways: [
    "`H(H + D + 1)` parameters; PyTorch adds `H` more for its redundant second bias vector.",
    "Compute is `O(T·H²)` and cannot be parallelised across T — the limitation that ended RNN scaling.",
    "Practical dependency ceiling is roughly 10–20 steps.",
    "Clipping fixes exploding gradients completely and vanishing ones not at all.",
    "Log the pre-clip gradient norms before setting a threshold — a default of 1.0 against norms of 5–7 rescales every step.",
    "Pack padded sequences, or `h_n` is the state several zero-input steps past the real end.",
    "Use a GRU instead unless you need the very smallest possible model."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why is PyTorch's RNN parameter count higher than `H(H+D+1)`?",
      options: ["It includes the output layer", "PyTorch stores a second, mathematically redundant bias vector", "It counts gradients too", "The formula is wrong"],
      answer: 1,
      why: "`bias_ih` and `bias_hh` are stored separately for CuDNN compatibility though only their sum matters — measured 24,832 against the formula's 24,704 at H=128, D=64. Any hand implementation must add both to match, and the same offset scales by gate count in LSTM and GRU." },
    { stem: "Which problem does gradient clipping NOT solve?",
      options: ["Exploding gradients", "Vanishing gradients", "NaN losses", "Loss spikes"],
      answer: 1,
      why: "Clipping preserves direction while capping magnitude, which works because an exploding gradient still points somewhere useful — it took a measured norm of 753 to 1.0 cleanly. A vanished gradient was measured at exactly 0.000e+00 at 100 steps, and there is no direction in zero to rescale." },
    { stem: "Why can't RNN training be parallelised across time?",
      options: ["PyTorch does not support it", "Each step's hidden state depends on the previous one", "The gradients are too large", "Memory limits"],
      answer: 1,
      why: "`h_t` requires `h_{t−1}`, so the T steps form a strict chain no hardware can overlap. Compute is `O(T·H²)` with an unavoidable sequential structure, which is why RNN training time scales with sequence length and why transformers, which compute all positions at once, scaled where RNNs did not." },
    { stem: "`clip_grad_norm_(params, 1.0)` returns values of 5–7 every step. What does that mean?",
      options: ["Training is diverging", "Every step is being divided by 5–7 — clipping is acting as a permanent LR reduction", "The clipping is working correctly", "Gradients are too small"],
      answer: 1,
      why: "The return value is the norm before clipping, so a norm of 6 against a threshold of 1 divides that step's gradient by 6. Clipping should catch rare spikes; when it fires every step it is silently scaling down the learning rate. Log the norms and set the threshold above the typical value." }
  ] },

  interview: { title: "Interview", sub: "RNN diagnosis", questions: [
    { level: "Core", q: "When would you use a vanilla RNN today?",
      strong: "Almost never — only where dependencies are very short and model size is severely constrained.",
      answer: [{ t: "p", text: "Very rarely. Its practical ceiling is around ten to twenty steps of dependency — I have measured the gradient reaching position zero at 3.8e-07 over twenty steps and exactly zero at a hundred, after float32 underflow. A GRU costs three times the parameters and removes that failure mode entirely, so unless I am fighting for every kilobyte on a microcontroller with genuinely short dependencies, the gated cell is worth it. Where the vanilla RNN still has value is as a diagnostic baseline: if it matches your GRU, your task does not actually need long-range memory, which is useful to know before you spend time on architecture. And it is the right thing to implement by hand once, because BPTT is much easier to understand when you have written the backward loop than when you have read the equations." }] },
    { level: "Senior", q: "An RNN outputs the same thing for every input. How do you debug it?",
      strong: "Check the input reaches the recurrence, then the pooling, then saturation, then class balance.",
      answer: [{ t: "p", text: "A constant output means the model has learned to ignore its input, and the causes are distinguishable if you look at the right thing. First, does the input path actually vary — a vocabulary bug mapping everything to the unknown token produces exactly this, and so does an embedding initialised to a constant. Second, how the sequence is pooled: a many-to-one model reading `output[:, -1, :]` on padded batches summarises short inputs by the state after several zero-input steps, which is nearly constant across examples. Third, saturation — if the recurrent weights are large, tanh saturates and the state converges to a fixed point regardless of input, which you can see by feeding two very different sequences and comparing hidden-state trajectories. Fourth, class imbalance, where predicting the majority class genuinely is the best the model has found; the tell is a loss near the entropy of the class distribution. I would inspect the hidden states directly rather than guess, because each of these leaves a different fingerprint." }] },
    { level: "Senior", q: "How would you set a gradient clipping threshold?",
      strong: "Log the actual pre-clip norms first and set it above the typical value.",
      answer: [{ t: "p", text: "Empirically, because the common default of 1.0 is frequently wrong. `clip_grad_norm_` returns the norm before clipping, so I would log that for a few hundred steps and look at the distribution. In one run I measured norms sitting between 5.3 and 7.0 against a threshold of 1.0 — every single step was being divided by five to seven, which is a permanent reduction in effective learning rate that nobody intended and which interacts confusingly with whatever LR schedule is also running. Clipping is meant to be a safety net for rare spikes, so I would set the threshold around the 95th percentile of what I observe. The exception is when aggressive clipping is a deliberate stability mechanism, which it sometimes is for RNNs on long sequences — but then it should be a conscious choice with the effect on the effective learning rate understood, rather than a default nobody examined." }] }
  ] }
});

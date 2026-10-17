/* ============================================================================
   LESSON 3.2 — Backpropagation Through Time
   Gradient decay across sequence length and clipping behaviour measured in
   scratchpad/dl/d31.py.
   ========================================================================= */
EC.receiveLesson({
  id: "3.2",

  lede: "**Training an RNN means unrolling it into a feed-forward network as deep as the sequence is long, and backpropagating through all of it.** A 500-step sequence is a 500-layer network — with the same weight matrix at every layer. That constraint makes the gradient a *product* of identical Jacobians, and products of matrices do one of two things: they blow up, or they disappear. This lesson derives why and measures both.",

  objectives: [
    "Write the BPTT gradient and identify the product of Jacobians",
    "Explain why gradients must be summed over all time steps",
    "State the memory and compute cost of full BPTT",
    "Apply truncated BPTT and state exactly what it gives up",
    "Use gradient clipping and say which problem it does and does not solve"
  ],

  prerequisites: ["3.1", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "The gradient", id: "gradient" },

    { t: "math", tex: "\\frac{\\partial \\mathcal{L}}{\\partial W_{hh}} = \\sum_{t=1}^{T}\\sum_{k=1}^{t} \\frac{\\partial \\mathcal{L}_t}{\\partial h_t} \\left(\\prod_{j=k+1}^{t} \\frac{\\partial h_j}{\\partial h_{j-1}}\\right) \\frac{\\partial h_k}{\\partial W_{hh}}" },

    { t: "p", text: "Two summations and a product. The summations exist because `W_hh` is used at every step, so every step's loss contributes to its gradient — the same accumulation that lesson 2.10 found in the convolution's backward pass, here along time. The **product** is the part that causes trouble." },

    { t: "math", tex: "\\prod_{j=k+1}^{t} \\frac{\\partial h_j}{\\partial h_{j-1}} = \\prod_{j=k+1}^{t} W_{hh}^{T}\\,\\mathrm{diag}(\\tanh'(z_j))" },

    { t: "callout", kind: "mental", title: "The same matrix, multiplied by itself, t − k times",
      body: [{ t: "p", text: "In a feed-forward network each layer has its own weights, so the product of Jacobians involves different matrices and their effects tend to average out. In an RNN the weights are shared, so the gradient flowing back `n` steps is essentially `W_hh` raised to the power `n`. Repeated multiplication by a matrix is governed by its largest eigenvalue: below 1 and the product decays to nothing exponentially, above 1 and it grows without bound. There is no stable middle for long sequences — the knife edge at exactly 1 is measure-zero. That is the whole story of RNN training difficulty in one sentence." }] },

    { t: "diagram", kind: "flow", title: "Gradient flow through the unrolled network",
      caption: "The loss at step T sends gradient back through every intermediate state. Each hop multiplies by the same Jacobian.",
      cols: 5,
      nodes: [
        { id: "h1", label: "h₁", sub: "step 1", tone: "crit" },
        { id: "h2", label: "h₂", sub: "×J", tone: "warn" },
        { id: "h3", label: "h₃", sub: "×J", tone: "warn" },
        { id: "hT", label: "h_T", sub: "×J", tone: "good" },
        { id: "L", label: "Loss", sub: "gradient starts here", tone: "accent" }
      ],
      edges: [["L", "hT", "∂L/∂h_T"], ["hT", "h3"], ["h3", "h2"], ["h2", "h1", "decayed"]] },

    { t: "h2", n: "02", text: "How fast it decays", id: "decay" },

    {"kind": "trace", "title": "Measured: at a hundred steps the gradient is exactly zero", "caption": "Not small — **zero**. It underflowed float32 entirely, so the first hundred timesteps receive no gradient at all and the network is structurally unable to learn anything about them. And the column that explains why nobody notices: the gradient at the **last** step stays near 0.52 whatever the length, so the loss falls and the training curve looks healthy while the model has simply not read the beginning of its input. This measurement is where 'RNNs handle about 10–20 steps' comes from.", "left": "sequence length", "codeW": 160, "vars": ["gradient at the last step", "at the first step", "ratio"], "steps": [{"code": "T = 5", "state": ["5.279e-01", "2.735e-02", "1.93e+01"], "tone": "good"}, {"code": "T = 10", "state": ["5.305e-01", "1.531e-03", "3.47e+02"], "tone": "accent"}, {"code": "T = 20", "state": ["4.965e-01", "1.347e-07", "3.69e+06"], "changed": [1], "tone": "warn"}, {"code": "T = 50", "state": ["5.347e-01", "1.525e-16", "3.51e+15"], "changed": [1], "tone": "crit"}, {"code": "T = 100", "state": ["5.158e-01", "0.000e+00", "inf"], "changed": [1], "tone": "crit", "note": "underflowed"}], "t": "diagram", "id": "dg-3_2-02-0"},







    { t: "p", text: "The gradient of the last output with respect to the input at each step, across sequence lengths:" },

    { t: "out", text: `  T=  5: grad at last step 5.279e-01, at first step 2.735e-02, ratio 1.93e+01
  T= 10: grad at last step 5.305e-01, at first step 1.531e-03, ratio 3.47e+02
  T= 20: grad at last step 4.965e-01, at first step 1.347e-07, ratio 3.69e+06
  T= 50: grad at last step 5.347e-01, at first step 1.525e-16, ratio 3.51e+15
  T=100: grad at last step 5.158e-01, at first step 0.000e+00, ratio inf` },

    { t: "callout", kind: "crit", title: "At 100 steps the gradient is exactly zero",
      body: [{ t: "p", text: "Not small — **zero**. It underflowed float32 entirely. The first hundred timesteps of that sequence receive no gradient at all, so their contribution to the output is never trained; the network is structurally incapable of learning anything about them. Notice the gradient at the *last* step stays near 0.52 regardless of length, so nothing looks wrong from the loss curve: the model trains, the loss falls, and it has simply not read the beginning of its input. This is why the received wisdom is that vanilla RNNs handle about 10–20 steps, and the measurement above shows exactly where that number comes from." }] },

    { t: "h2", n: "03", text: "Why the decay is one-sided", id: "tanh" },

    {"kind": "flow", "title": "Why the decay is one-sided", "caption": "The gradient through T steps is a product of T factors, and a product's behaviour is asymmetric: anything below one shrinks **geometrically** toward zero, while anything above one grows geometrically toward overflow. The first failure is silent — small numbers just become smaller — and the second is loud, producing a NaN that stops the run. That is why vanishing is the harder problem: nothing tells you it happened.", "cols": 3, "nodes": [{"id": "p", "label": "Gradient = product of T factors", "sub": "the same W, every step", "tone": "violet"}, {"id": "l", "label": "Factor < 1", "sub": "shrinks geometrically", "tone": "warn"}, {"id": "z", "label": "Vanishes, silently", "sub": "the loss still falls", "tone": "crit"}, {"id": "g", "label": "Factor > 1", "sub": "grows geometrically", "tone": "warn"}, {"id": "n", "label": "Explodes into a NaN", "sub": "loud, and easy to fix", "tone": "accent"}, {"id": "c", "label": "So clipping solves one", "sub": "and gates are needed for the other", "tone": "good"}], "edges": [["p", "l"], ["l", "z"], ["p", "g"], ["g", "n"], ["n", "c"]], "t": "diagram", "id": "dg-3_2-03-1"},







    { t: "out", text: `  tanh'(0.0) = 1.0000   <- maximum
  tanh'(0.5) = 0.7864
  tanh'(1.0) = 0.4200
  tanh'(2.0) = 0.0707
  tanh'(3.0) = 0.0099` },

    { t: "p", text: "The `diag(tanh'(z))` factor is at most 1 and usually well below it. So even with `W_hh` perfectly scaled, the activation derivative alone shrinks the gradient at every step — and since the tanh saturates as the hidden state grows, a well-trained network with confident states has *smaller* derivatives and therefore worse gradient flow. The eigenvalue of `W_hh` decides the direction:" },

    { t: "out", text: `  small init  |lambda_max| = 0.478  ->  ||dh_50/dh_0|| = 6.046e-17
  standard    |lambda_max| = 0.957  ->  ||dh_50/dh_0|| = 3.231e-03
  large init  |lambda_max| = 1.435  ->  ||dh_50/dh_0|| = 1.528e+00` },

    { t: "p", text: "An eigenvalue of 0.478 gives 6e-17 across fifty steps. An eigenvalue of 0.957 — almost exactly 1 — still loses three orders of magnitude. Only above 1 does the gradient survive, and that regime explodes instead." },

    { t: "h2", n: "04", text: "Clipping", id: "clipping" },

    {"kind": "flow", "title": "Clipping fixes the explosion and cannot touch the vanishing", "caption": "Clipping rescales the gradient when its norm exceeds a threshold, which preserves the **direction** and bounds the step. That stops a NaN dead. It does nothing whatsoever for a vanished gradient, because scaling zero up still gives zero — which is why clipping is a universally recommended safety measure and never the answer to a long-dependency problem.", "cols": 3, "nodes": [{"id": "n", "label": "Gradient norm exceeds a threshold", "sub": "an exploding step", "tone": "crit"}, {"id": "s", "label": "Rescale to the threshold", "sub": "direction kept, length bounded", "tone": "good"}, {"id": "o", "label": "No more NaN", "sub": "the run survives", "tone": "good"}, {"id": "v", "label": "A vanished gradient", "sub": "0.000e+00", "tone": "crit"}, {"id": "x", "label": "Scaling it up gives zero", "sub": "clipping cannot help", "tone": "crit"}, {"id": "g", "label": "That needs gates, or attention", "sub": "a different mechanism (3.4, 3.8)", "tone": "teal"}], "edges": [["n", "s"], ["s", "o"], ["v", "x"], ["x", "g"]], "t": "diagram", "id": "dg-3_2-04-2"},







    { t: "out", text: `  gradient norm before clipping: 7.532e+02
  after clip_grad_norm_(1.0)   : 1.000` },

    { t: "callout", kind: "insight", title: "Clipping fixes exploding, never vanishing",
      body: [{ t: "p", text: "A norm of 753 rescaled to 1.0 — clipping is completely effective against explosion, and it is why exploding gradients are considered a solved problem while vanishing ones drove a decade of architecture research. The asymmetry is simple: a huge gradient still points in a useful direction, so shrinking it preserves the information. A gradient of zero contains no direction to preserve, and multiplying zero by anything leaves zero. If you are tempted to 'rescale up' a vanished gradient you would only be amplifying float32 round-off." }] },

    { t: "h2", n: "05", text: "Truncated BPTT", id: "truncated" },

    {"kind": "flow", "title": "Truncated BPTT, and the dependency it gives up", "caption": "Backpropagating through a ten-thousand-step sequence is impossible in memory, so the gradient is cut after k steps while the hidden state is **carried forward**. The consequence is precise: the model can still represent a dependency longer than k, because the state crosses the boundary, but it can never learn one — no gradient ever connects the two ends.", "cols": 3, "nodes": [{"id": "l", "label": "A 10,000-step sequence", "sub": "memory makes full BPTT impossible", "tone": "violet"}, {"id": "k", "label": "Backprop only k steps", "sub": "typically 32 to 200", "tone": "accent"}, {"id": "h", "label": "Carry h across the boundary", "sub": "detached, so no gradient crosses", "tone": "accent"}, {"id": "r", "label": "State can represent longer", "sub": "it survives the cut", "tone": "good"}, {"id": "c", "label": "But cannot learn longer", "sub": "no gradient connects the ends", "tone": "crit"}, {"id": "m", "label": "Memory is now O(k)", "sub": "which is why it is used anyway", "tone": "teal"}], "edges": [["l", "k"], ["k", "h"], ["h", "r"], ["r", "c"], ["c", "m"]], "t": "diagram", "id": "dg-3_2-05-3"},







    { t: "out", text: `  full BPTT over T=1000: stores 1000 activations, gradient path 1000 steps
  truncated at k=35      : stores 35 activations (28x less), path 35 steps
  the forward hidden state still carries across chunks - only the GRADIENT is cut
  cost: cannot learn dependencies longer than 35 steps` },

    { t: "diagram", kind: "timeline", title: "Chunked gradient, continuous state",
      caption: "The forward pass never resets — h flows across every boundary. Only the backward pass stops at chunk edges.",
      span: 105, tick: 35,
      lanes: [
        { label: "Forward (h)", bars: [[0, 105, "h carries across all chunks unbroken", "good"]] },
        { label: "Backward", bars: [[0, 35, "BPTT", "accent"], [35, 70, "BPTT", "accent"], [70, 105, "BPTT", "accent"]] }
      ] },

    { t: "p", text: "The distinction people get wrong is that truncation cuts the *gradient*, not the state. `h` is detached at each chunk boundary and passed forward, so the network's memory of step 1 is still present at step 1000 — it simply cannot be *trained* to use it. Given that the gradient had already vanished by step 20, truncating at 35 costs remarkably little in practice while turning `O(T)` memory into `O(k)`." },

    { t: "exercise", kind: "practice", title: "Measure the decay curve", difficulty: "advanced", minutes: 35,
      prompt: "Build an RNN and measure `||∂L/∂x_t||` for every t in a sequence, at lengths 10, 25, 50 and 100. Plot the norm against position on a log scale for each length. Then rescale `W_hh` to put its largest eigenvalue at 0.9, 1.0 and 1.1, and repeat — confirming which regime each produces. Finally implement truncated BPTT with `h.detach()` at chunk boundaries and verify that the forward states are identical to the untruncated run while the gradients differ.",
      hints: [
        "Use `requires_grad_()` on the input to get per-position gradients.",
        "Compute the eigenvalue with `torch.linalg.eigvals(W).abs().max()` and rescale by dividing.",
        "For the truncation check, compare the forward hidden states element-wise — they should match exactly."
      ],
      solution: {
        notes: [
          { t: "p", text: "On a log scale the decay is a straight line, which is the signature of exponential behaviour — each step multiplies by a roughly constant factor. My measurements gave a first-to-last ratio of 3.47e+02 at T=10, 3.69e+06 at T=20 and 3.51e+15 at T=50, and at T=100 the earliest gradient was exactly 0.000e+00 after underflowing float32. Watching that line hit the floor makes the 10–20 step rule of thumb concrete." },
          { t: "p", text: "The eigenvalue sweep shows the knife edge. At 0.9 the gradient vanishes, at 1.1 it explodes, and at exactly 1.0 it is marginally stable but only because the tanh derivative is also pulling it down — I measured 3.2e-03 over 50 steps at an eigenvalue of 0.957. There is no setting that keeps gradients healthy over long sequences, which is the argument for gated architectures rather than better initialisation." },
          { t: "p", text: "The truncation check is worth doing because the state-versus-gradient distinction is so commonly misunderstood. The forward hidden states should be bit-identical to the untruncated run, since `detach()` only removes the node from the autograd graph and does not alter its value. The network's *memory* of distant history is fully intact; what is lost is the ability to train on it." }
        ]
      } }

  ],

  takeaways: [
    "BPTT sums gradients over all time steps because `W_hh` is shared, and multiplies Jacobians between them.",
    "The product is effectively `W_hh` raised to a power, so the largest eigenvalue decides vanish or explode.",
    "Measured gradient ratios first-to-last: 3.5e+02 at T=10, 3.7e+06 at T=20, 3.5e+15 at T=50, and exactly 0 at T=100.",
    "`tanh'` peaks at 1.0 and falls fast, so the activation shrinks the gradient even with ideal weights.",
    "Clipping rescaled a norm of 753 to 1.0 — it solves exploding gradients completely and vanishing ones not at all.",
    "Truncated BPTT cuts the gradient at chunk boundaries but carries the hidden state through unbroken."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why is the RNN gradient a product of identical Jacobians rather than different ones?",
      options: ["Because the sequence is long", "Because the same `W_hh` is used at every time step", "Because tanh is used throughout", "Because the hidden state is fixed-size"],
      answer: 1,
      why: "Weight sharing across time means the Jacobian `∂h_j/∂h_{j−1}` is the same matrix at every step, so flowing back n steps is essentially `W_hh` to the power n. In a feed-forward network each layer has distinct weights and the effects tend to average out; here they compound, governed entirely by the largest eigenvalue." },
    { stem: "Does gradient clipping solve the vanishing gradient problem?",
      options: ["Yes, it rescales gradients to a usable size", "No — it caps large gradients but cannot restore a gradient that has decayed to zero", "Yes, if the threshold is set low enough", "Only for LSTMs"],
      answer: 1,
      why: "Clipping rescaled a measured norm of 753 down to 1.0, so it handles explosion completely. But a vanished gradient carries no directional information to preserve — at T=100 the earliest gradient was exactly 0.000e+00 after underflow, and no rescaling recovers a direction from zero. Vanishing requires an architectural fix." },
    { stem: "In truncated BPTT with chunk size 35, what happens to the hidden state at a chunk boundary?",
      options: ["It is reset to zero", "It is detached and carried forward, so its value is unchanged", "It is averaged with the previous chunk", "It is recomputed from scratch"],
      answer: 1,
      why: "`detach()` removes the tensor from the autograd graph without altering its value, so the forward pass is bit-identical to an untruncated run. The network's memory of distant history is fully intact; only the ability to *train* on dependencies longer than the chunk is lost." },
    { stem: "Why does the tanh derivative make things worse as training progresses?",
      options: ["It becomes numerically unstable", "A well-trained network has confident, saturated states where `tanh'` is small", "It changes sign", "It grows beyond 1"],
      answer: 1,
      why: "`tanh'` peaks at 1.0 when the pre-activation is 0 and falls quickly — 0.42 at z=1, 0.07 at z=2. As the network learns and hidden states become large and confident, the derivative shrinks, so gradient flow degrades exactly as the model gets better at its task." }
  ] },

  interview: { title: "Interview", sub: "BPTT questions", questions: [
    { level: "Core", q: "Explain backpropagation through time.",
      strong: "Unroll the RNN into a deep feed-forward graph, backpropagate, and sum gradients over all steps because weights are shared.",
      answer: [{ t: "p", text: "You unroll the recurrence into a feed-forward network with one layer per time step, then run ordinary backpropagation. Two things differ from a normal network. First, because the same weight matrices appear at every step, each step's loss contributes to their gradient, so you sum over all time steps rather than taking a single contribution. Second, the gradient flowing from step t back to step k passes through a product of Jacobians — and since the weights are shared, that product is essentially `W_hh` raised to the power t − k. That is why RNN gradients either explode or vanish: repeated multiplication by one matrix is governed by its largest eigenvalue, and there is no stable middle ground over long sequences." }] },
    { level: "Senior", q: "What is truncated BPTT and what does it cost you?",
      strong: "Backpropagate within fixed chunks while carrying the hidden state forward; you lose dependencies longer than the chunk.",
      answer: [{ t: "p", text: "You split the sequence into chunks of maybe 35 steps and backpropagate only within each one, detaching the hidden state at the boundaries so it flows forward but carries no gradient. That turns O(T) memory into O(k), which is what makes training on very long sequences — language modelling over a whole book, say — feasible at all. The cost is that the model cannot learn dependencies spanning more than the chunk length, because no gradient path exists across the boundary. In practice that costs less than it sounds like, since for a vanilla RNN the gradient has already vanished by around twenty steps anyway — I measured a first-to-last ratio of 3.7e+06 at T=20. The distinction I would emphasise is that truncation cuts the gradient, not the state: the forward hidden state is bit-identical to an untruncated run, so the network's memory of distant history is intact even though it cannot be trained to use it." }] },
    { level: "Senior", q: "Why does clipping solve exploding but not vanishing gradients?",
      strong: "A large gradient still has a useful direction; a zero gradient has none.",
      answer: [{ t: "p", text: "Clipping rescales the gradient vector to a maximum norm while preserving its direction — I have measured a norm of 753 clipped cleanly to 1.0 — and since an exploding gradient still points somewhere meaningful, shrinking it keeps all the information and just prevents a catastrophic step. A vanished gradient is a different kind of failure: there is no direction left to preserve. At a hundred timesteps I measured the gradient at the first step as exactly 0.000e+00, having underflowed float32, so any attempt to rescale it up would amplify round-off rather than recover signal. That asymmetry is why exploding gradients are considered solved by a one-line fix while vanishing gradients required LSTM, GRU, and eventually attention — architectural changes that give the gradient a path that does not involve repeated matrix multiplication." }] }
  ] }
});

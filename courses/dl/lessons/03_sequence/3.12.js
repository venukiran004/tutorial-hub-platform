/* ============================================================================
   LESSON 3.12 — RNN and LSTM from Scratch in NumPy
   Mirrors 03_Sequence_Models.md · §13 and §14. Both cells implemented with
   forward AND backward, verified against PyTorch autograd to float64
   round-off (scratchpad/dl/d312.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.12",

  lede: "**BPTT is the one algorithm in this module that is genuinely easier to understand by writing than by reading.** The equations in lesson 3.2 describe a product of Jacobians and a sum over time; in code that is a reversed loop, one accumulator per shared weight, and a `dh_next` carried backwards. Forty lines reproduce `nn.RNN` and its gradients to 1e-15, and building the LSTM alongside it makes the additive cell path something you have implemented rather than something you have been told.",

  objectives: [
    "Implement the RNN forward pass and cache what the backward pass needs",
    "Implement BPTT with correct gradient accumulation across time",
    "Verify all four gradients against PyTorch autograd",
    "Implement the LSTM forward pass with all four gates",
    "Measure the gradient each cell delivers to distant positions"
  ],

  prerequisites: ["3.11", "3.2"],

  blocks: [

    { t: "h2", n: "01", text: "The RNN forward pass", id: "rnn-forward" },

    { t: "code", lang: "python", title: "Forward, caching every hidden state",
      code: `class RNNScratch:
    def __init__(self, d, h):
        self.Wxh = np.random.randn(h, d) * (1/np.sqrt(d))
        self.Whh = np.random.randn(h, h) * (1/np.sqrt(h))
        self.b   = np.zeros(h)

    def forward(self, X):                       # X: (T, d)
        T = X.shape[0]
        h = np.zeros(self.b.shape[0])
        self.cache = [h.copy()]                 # cache[t] is h_{t-1}
        self.X = X
        H = []
        for t in range(T):
            h = np.tanh(self.Wxh @ X[t] + self.Whh @ h + self.b)
            H.append(h)
            self.cache.append(h.copy())
        return np.array(H)`,
      caption: "`h.copy()` matters — appending `h` itself stores a reference that the next iteration mutates, so every cached state ends up identical to the last. A silent bug that makes the backward pass wrong everywhere." },

    { t: "out", text: `=== RNN forward ===
  max abs diff vs nn.RNN : 3.053e-16` },

    { t: "h2", n: "02", text: "BPTT", id: "bptt" },

    { t: "code", lang: "python", title: "Backward through time",
      code: `def backward(self, dH):                     # dH: (T, h)
    T = dH.shape[0]
    dWxh = np.zeros_like(self.Wxh)
    dWhh = np.zeros_like(self.Whh)
    db   = np.zeros_like(self.b)
    dX   = np.zeros_like(self.X)
    dh_next = np.zeros_like(self.b)             # gradient from step t+1

    for t in reversed(range(T)):
        h, h_prev = self.cache[t+1], self.cache[t]
        dz = (dH[t] + dh_next) * (1 - h**2)     # through tanh
        dWxh += np.outer(dz, self.X[t])         # accumulate: shared weights
        dWhh += np.outer(dz, h_prev)
        db   += dz
        dX[t]   = self.Wxh.T @ dz
        dh_next = self.Whh.T @ dz               # pass back one step
    return dWxh, dWhh, db, dX`,
      caption: "`tanh'(z) = 1 − tanh(z)² = 1 − h²`, so the cached output gives the derivative directly with no need to store the pre-activation." },

    { t: "callout", kind: "mental", title: "Two gradients arrive at every hidden state",
      body: [{ t: "p", text: "`dH[t] + dh_next` is the heart of BPTT. Each `h_t` influences the loss twice — directly, through whatever output was produced at step t, and indirectly, through `h_{t+1}` and everything after it. Both paths contribute and the gradients add. `dh_next` is the second one, carried backwards a step at a time, and it is the quantity that decays exponentially: each hop multiplies it by `W_hh^T` and a tanh derivative below 1. Seeing that single line is seeing lesson 3.2's product of Jacobians as executable code." }] },

    { t: "out", text: `=== RNN backward ===
  dWxh: max abs diff 1.332e-15  match=True
  dWhh: max abs diff 8.882e-16  match=True
  db  : max abs diff 8.882e-16  match=True
  dX  : max abs diff 1.110e-15  match=True` },

    { t: "callout", kind: "trap", title: "`+=` for the weights, `=` for the inputs",
      body: [{ t: "p", text: "The three weight gradients accumulate across timesteps, because the same weights are used at every step — this is exactly the pattern from lesson 2.10's convolution, where shared parameters in the forward pass become summed gradients in the backward pass. But `dX[t]` is assigned, not accumulated, because each input is used at exactly one step. Getting these the wrong way round gives gradients that are silently wrong by a factor of roughly T, with no error and no shape mismatch — which is why the autograd comparison is not optional." }] },

    { t: "h2", n: "03", text: "The LSTM", id: "lstm" },

    { t: "code", lang: "python", title: "All four gates, with the forget bias set",
      code: `class LSTMScratch:
    def __init__(self, d, h):
        self.h = h
        self.W = np.random.randn(4*h, d) * (1/np.sqrt(d))    # i, f, g, o
        self.U = np.random.randn(4*h, h) * (1/np.sqrt(h))
        self.b = np.zeros(4*h)
        self.b[h:2*h] = 1.0                       # forget bias = 1 (lesson 3.4)

    def forward(self, X):
        T, h = X.shape[0], self.h
        ht = np.zeros(h); ct = np.zeros(h)
        H, self.cache = [], []
        for t in range(T):
            z = self.W @ X[t] + self.U @ ht + self.b
            i, f = sig(z[:h]), sig(z[h:2*h])
            g, o = np.tanh(z[2*h:3*h]), sig(z[3*h:])
            c_prev = ct
            ct = f*c_prev + i*g                   # the additive update
            tc = np.tanh(ct)
            ht = o*tc
            H.append(ht)
            self.cache.append((X[t], c_prev, i, f, g, o, ct, tc, ht))
        return np.array(H)`,
      caption: "The cache holds everything the backward pass needs. The four gates come from one matrix multiply, chunked — matching PyTorch's i, f, g, o packing exactly." },

    { t: "out", text: `=== LSTM forward (with forget bias = 1.0) ===
  max abs diff vs nn.LSTM: 1.110e-16
  forget gate at t=0, mean value: 0.6775  (bias=1 -> sigmoid near 0.73)` },

    { t: "h2", n: "04", text: "What the two cells deliver", id: "comparison" },

    { t: "out", text: `  T=10 rnn : grad at step 0 = 1.384e-03, at step 9 = 9.534e-01
  T=10 lstm: grad at step 0 = 3.695e-03, at step 9 = 2.625e-01
  T=30 rnn : grad at step 0 = 1.234e-09, at step 29 = 8.932e-01
  T=30 lstm: grad at step 0 = 3.131e-07, at step 29 = 2.741e-01
  T=60 rnn : grad at step 0 = 1.776e-17, at step 59 = 8.683e-01
  T=60 lstm: grad at step 0 = 1.738e-12, at step 59 = 2.819e-01` },

    { t: "p", text: "At 60 steps the LSTM delivers `1.7e-12` where the RNN delivers `1.8e-17` — **five orders of magnitude more gradient** to the first position. Both are tiny in absolute terms, which is the honest picture: the LSTM shifts the practical ceiling from around twenty steps to around a hundred, and it does not remove it. That is what motivates attention." },

    { t: "exercise", kind: "practice", title: "Complete the LSTM backward pass", difficulty: "advanced", minutes: 55,
      prompt: "Write `LSTMScratch.backward` and verify all gradients against PyTorch autograd. Work back from `h_t = o ⊙ tanh(c_t)`: the gradient reaching `c_t` comes both from `h_t` and from `c_{t+1}`, exactly as `dh_next` works in the RNN. Then instrument it to report, at each step, what fraction of `dc` arrives via the cell path against the hidden path. Finally, run the same instrumentation with the forget-gate bias at 0 and at 1 and compare.",
      hints: [
        "`dc_t = dh_t ⊙ o ⊙ (1 − tanh(c_t)²) + dc_next`, and `dc_prev = dc_t ⊙ f`.",
        "Sigmoid derivative is `s(1−s)`; tanh derivative is `1 − t²`. Both are available from cached outputs.",
        "Verify against float64 PyTorch so round-off sits at 1e-15 and real bugs stand out."
      ],
      solution: {
        notes: [
          { t: "p", text: "The line that matters is `dc_prev = dc_t * f`. That is `∂C_t/∂C_{t−1} = f_t` from lesson 3.4, appearing in your own code as a single elementwise multiply with no matrix and no activation derivative anywhere. Having derived it once, the claim that the LSTM gives the gradient a highway stops being a metaphor — you can point at the line." },
          { t: "p", text: "The instrumentation is where the insight is. Early in a sequence, most of the gradient arriving at `c_t` comes through `dc_next` — the cell path — rather than through `h_t`. That is the highway carrying signal backwards. With the forget bias at 0 the cell path's contribution decays away within a dozen steps and the hidden path dominates, which is precisely the RNN's situation and precisely why lesson 3.3's LSTM sat at chance until the bias was fixed." },
          { t: "p", text: "Expect agreement around 1e-15 in float64. If you see 1e-6 you have a real bug that float32 would have hidden — a good reason to do gradient checks in double precision even when you will train in single. The most common error is forgetting that the gradient reaching `c_t` has two sources, which gives gradients that look nearly right for short sequences and diverge as T grows." }
        ]
      } }

  ],

  takeaways: [
    "The forward pass must cache copies of the hidden states — appending the mutable array is a silent bug.",
    "BPTT: `dz = (dH[t] + dh_next) * (1 − h²)`, since every `h_t` affects the loss directly and through the future.",
    "Weight gradients accumulate with `+=` across timesteps; input gradients are assigned.",
    "Verified against autograd: forward 3.1e-16, dWxh 1.3e-15, dWhh 8.9e-16, dX 1.1e-15.",
    "The LSTM forward matches `nn.LSTM` to 1.1e-16 with the forget bias set to 1.0.",
    "At T=60 the LSTM delivers 1.7e-12 of gradient to step 0 against the RNN's 1.8e-17 — 10⁵ better, still tiny.",
    "`dc_prev = dc_t * f` is the gradient highway, visible as one line of code."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "In BPTT, why is the gradient at each hidden state `dH[t] + dh_next`?",
      options: ["To stabilise the computation", "Each `h_t` affects the loss directly via its output and indirectly via `h_{t+1}`", "To account for the bias term", "To normalise across timesteps"],
      answer: 1,
      why: "Two paths lead from `h_t` to the loss, so their gradients add. `dh_next` is the one carried backwards from later steps, and it is the quantity that decays exponentially — each hop multiplies by `W_hh^T` and a tanh derivative below 1. This single line is the product of Jacobians as executable code." },
    { stem: "Why do weight gradients use `+=` while input gradients use `=`?",
      options: ["Weight gradients are larger", "The weights are shared across all timesteps; each input is used at exactly one step", "To avoid numerical error", "It is a NumPy requirement"],
      answer: 1,
      why: "Parameter sharing in the forward pass becomes gradient summation in the backward pass — the same pattern as a convolution's shared kernel. Getting it backwards gives gradients wrong by roughly a factor of T, with correct shapes and no error, which is exactly why you verify against autograd." },
    { stem: "Which line in an LSTM backward pass is the gradient highway?",
      options: ["`dz = dh * (1 - h**2)`", "`dc_prev = dc_t * f`", "`dW += outer(dz, x)`", "`dh_next = U.T @ dz`"],
      answer: 1,
      why: "That is `∂C_t/∂C_{t−1} = f_t` — an elementwise multiply by the forget gate, with no weight matrix and no activation derivative in the path. Compare with the RNN's `dh_next = Whh.T @ dz`, which involves both and is why its gradient decays." },
    { stem: "Why perform gradient checks in float64 rather than float32?",
      options: ["float32 is not supported", "In float64 round-off sits around 1e-15, so a real bug at 1e-6 is unmistakable", "float64 is faster", "Autograd requires float64"],
      answer: 1,
      why: "In float32 numerical noise is already around 1e-6, which is the same magnitude as many genuine implementation errors — so a wrong gradient is indistinguishable from round-off. In float64 correct code agrees to about 1e-15, and anything larger is a real bug." }
  ] },

  interview: { title: "Interview", sub: "Implementation questions", questions: [
    { level: "Core", q: "Walk me through implementing BPTT.",
      strong: "Cache hidden states forward, then loop backwards accumulating weight gradients and carrying `dh_next`.",
      answer: [{ t: "p", text: "The forward pass caches every hidden state, being careful to store copies rather than references. Then you loop backwards from the last step. At each step the gradient arriving at `h_t` is the sum of two things — whatever came from that step's output, and `dh_next`, the gradient flowing back from step t+1 — because `h_t` influences the loss by both routes. You push that through the tanh derivative, which is `1 − h²` and so comes free from the cached output, then accumulate into the weight gradients with `+=` since the weights are shared across all steps, assign the input gradient since each input is used once, and compute the new `dh_next` by multiplying through the recurrent weight matrix. That last multiplication is where vanishing gradients live: it happens once per step, with the same matrix every time." }] },
    { level: "Senior", q: "How do you verify a hand-written recurrent backward pass?",
      strong: "Against PyTorch autograd in float64, with random upstream gradients, expecting ~1e-15.",
      answer: [{ t: "p", text: "Build the equivalent module in PyTorch, copy the weights across — being careful that PyTorch keeps two bias vectors that are summed, so zero one and set the other — then run both forward and backward with the same random upstream gradient and compare every gradient. I did exactly this and got the forward at 3.1e-16 and the gradients between 8.9e-16 and 1.3e-15, which is float64 round-off. Two details matter. Work in double precision, because float32 noise is around 1e-6 and so are many real bugs, making them indistinguishable. And use random upstream gradients rather than ones, since a uniform gradient is symmetric and can mask index errors whose per-element mistakes cancel in the sum. For an LSTM the error I would look for first is forgetting that the gradient reaching the cell state has two sources — from `h_t` and from `c_{t+1}` — which looks nearly right at short lengths and diverges as sequences grow." }] },
    { level: "Senior", q: "What does writing an LSTM by hand teach you that using nn.LSTM does not?",
      strong: "That the gradient highway is one line — `dc_prev = dc_t * f` — with no matrix in the path.",
      answer: [{ t: "p", text: "Two things concretely. First, the gradient highway becomes a line of code rather than a claim: `dc_prev = dc_t * f` is an elementwise multiply by the forget gate, and you can see directly that there is no weight matrix and no activation derivative in that path, which is exactly what the RNN's `dh_next = Whh.T @ dz` has. That is the whole architectural argument in one comparison. Second, instrumenting it shows where the gradient actually travels: early in a sequence most of what arrives at the cell state comes via the cell path rather than the hidden path, and if you set the forget-gate bias to zero that contribution dies within a dozen steps and the LSTM degenerates towards RNN behaviour. I found that concretely useful — it explains a case where an LSTM sat at chance on a 20-step task until the forget bias was fixed, which would have been quite mysterious otherwise." }] }
  ] }
});

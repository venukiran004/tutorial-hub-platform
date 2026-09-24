/* ============================================================================
   LESSON 3.4 — LSTM: Long Short-Term Memory
   Mirrors 03_Sequence_Models.md · §4. The six equations are implemented from
   scratch and matched against nn.LSTM; dC_t/dC_{t-1} = f_t is verified
   exactly (scratchpad/dl/d34.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.4",

  lede: "**The LSTM's answer to the vanishing gradient is to stop multiplying and start adding.** It carries a second state — the cell state — updated by addition rather than by a matrix multiply, so the gradient flowing backwards through it is multiplied by the forget gate and nothing else. No weight matrix, no tanh derivative. That single structural change turns gradient decay from something determined by initialisation into something the network learns to control, and this lesson verifies it exactly.",

  objectives: [
    "Write the six LSTM equations and implement them from scratch",
    "Explain what each of the three gates controls",
    "Prove that the cell-state gradient is the forget gate alone",
    "Justify initialising the forget-gate bias to 1",
    "Compute an LSTM's parameter count and compare it with an RNN's"
  ],

  prerequisites: ["3.3", "3.2"],

  blocks: [

    { t: "h2", n: "01", text: "The six equations", id: "equations" },

    { t: "math", tex: "\\begin{aligned} f_t &= \\sigma(W_f[h_{t-1}, x_t] + b_f) & &\\text{forget} \\\\ i_t &= \\sigma(W_i[h_{t-1}, x_t] + b_i) & &\\text{input} \\\\ \\tilde{C}_t &= \\tanh(W_C[h_{t-1}, x_t] + b_C) & &\\text{candidate} \\\\ C_t &= f_t \\odot C_{t-1} + i_t \\odot \\tilde{C}_t & &\\text{cell update} \\\\ o_t &= \\sigma(W_o[h_{t-1}, x_t] + b_o) & &\\text{output} \\\\ h_t &= o_t \\odot \\tanh(C_t) & &\\text{hidden} \\end{aligned}" },

    { t: "code", lang: "python", title: "All six, implemented directly",
      code: `Wi, Wh = lstm.weight_ih_l0, lstm.weight_hh_l0
b = lstm.bias_ih_l0 + lstm.bias_hh_l0

h = torch.zeros(B, H); c = torch.zeros(B, H)
for t in range(T):
    z = x[:, t] @ Wi.T + h @ Wh.T + b
    i, f, g, o = z.chunk(4, dim=1)          # PyTorch packs gates as i, f, g, o
    i, f, o = torch.sigmoid(i), torch.sigmoid(f), torch.sigmoid(o)
    g = torch.tanh(g)
    c = f * c + i * g                       # <- the additive update
    h = o * torch.tanh(c)`,
      caption: "One matrix multiply produces all four gates at once — PyTorch stores `weight_ih_l0` as `(4H, d)` and the chunks are in the order i, f, g, o." },

    { t: "out", text: `  my loop vs nn.LSTM : max abs diff 5.960e-08
  final h matches True, final c matches True` },

    { t: "h2", n: "02", text: "What the gates do", id: "gates" },

    { t: "diagram", kind: "flow", title: "The LSTM cell",
      caption: "The cell state runs straight across the top, modified only by an elementwise multiply and an add. That path is the gradient highway.",
      cols: 4,
      nodes: [
        { id: "cp", label: "C₍t−1₎", sub: "previous cell state", tone: "accent" },
        { id: "fg", label: "× f_t", sub: "forget: what to discard", tone: "warn" },
        { id: "ig", label: "+ i_t ⊙ g_t", sub: "input: what to add", tone: "good" },
        { id: "c", label: "C_t", sub: "new cell state", tone: "accent" },
        { id: "og", label: "× o_t", sub: "output: what to expose", tone: "violet" },
        { id: "h", label: "h_t", sub: "hidden state", tone: "teal" }
      ],
      edges: [["cp", "fg"], ["fg", "ig"], ["ig", "c"], ["c", "og"], ["og", "h"]] },

    { t: "dl", items: [
      ["Forget gate `f_t`", "What to discard from memory. At 1 it keeps everything; at 0 it wipes the dimension. Seeing a full stop might flush the previous sentence's subject."],
      ["Input gate `i_t`", "Which dimensions to update. Paired with the candidate, which supplies the *content* of the update."],
      ["Candidate `C̃_t`", "The proposed new information — a tanh, so it ranges over (−1, 1) and can subtract as well as add."],
      ["Output gate `o_t`", "What part of memory to expose as `h_t`. Memory can hold something without revealing it at this step."]
    ] },

    { t: "out", text: `  input  i     range [+0.274, +0.759]  mean +0.532
  forget f     range [+0.249, +0.733]  mean +0.525
  candidate g  range [-0.777, +0.556]  mean +0.158
  output o     range [+0.319, +0.769]  mean +0.568` },

    { t: "callout", kind: "mental", title: "Three sigmoids and a tanh, and the difference matters",
      body: [{ t: "p", text: "`i`, `f` and `o` are sigmoids, bounded in (0, 1) — they are **valves**, each deciding how much of something passes. `g` is a tanh in (−1, 1) — it is **content**, the actual values being written. Getting this distinction straight makes the cell update readable at a glance: `C_t = f ⊙ C_{t−1} + i ⊙ g` says *keep this fraction of what you had, and write this fraction of this new thing*. The separation of hidden state from cell state follows the same logic: `C` is what the network knows, `h` is what it chooses to say." }] },

    { t: "h2", n: "03", text: "The gradient highway", id: "highway" },

    { t: "math", tex: "C_t = f_t \\odot C_{t-1} + i_t \\odot \\tilde{C}_t \\qquad\\Longrightarrow\\qquad \\frac{\\partial C_t}{\\partial C_{t-1}} = f_t" },

    { t: "out", text: `  forget gate f_t : [0.6593821048736572, 0.7684034109115601, 0.569654643535614, 0.1654583215713501]
  measured dC/dC  : [0.6593821048736572, 0.7684034109115601, 0.569654643535614, 0.1654583215713501]
  identical: True` },

    { t: "callout", kind: "insight", title: "The Jacobian is the forget gate — not a matrix, not a derivative",
      body: [{ t: "p", text: "Compare with the vanilla RNN's `∂h_t/∂h_{t−1} = W_hh^T diag(tanh'(z))`, which is a fixed matrix whose eigenvalue you cannot control and an activation derivative that is always below 1. Here the Jacobian is **the forget gate's value**, computed fresh at every step from the current input. Gradient decay is no longer a property of initialisation — it is something the network *learns*, per dimension, per timestep. If a piece of information should persist, the network sets `f ≈ 1` for that dimension and the gradient passes through untouched. This is structurally the same idea as ResNet's skip connection from lesson 2.3: replace a multiplicative path with an additive one and the gradient survives." }] },

    { t: "out", text: `  f=0.99: after 100 steps the cell gradient is 3.660e-01
  f=0.90: after 100 steps the cell gradient is 2.656e-05
  f=0.50: after 100 steps the cell gradient is 7.889e-31` },

    { t: "p", text: "At `f = 0.99` the gradient retains 37 % of its magnitude across a hundred steps — compare with lesson 3.2's vanilla RNN, whose gradient at a hundred steps was **exactly zero**. The LSTM does not abolish decay; it puts the decay rate under the network's control." },

    { t: "h2", n: "04", text: "Initialising the forget gate", id: "bias" },

    { t: "out", text: `  PyTorch default: forget-gate bias chunk mean -0.0623
  after setting the forget chunk to 1.0: sigmoid(1.0) = 0.7311
  so f_t starts near 0.73 rather than 0.5
  0.73^50 = 1.47e-07  vs  0.5^50 = 8.88e-16` },

    { t: "p", text: "A bias of zero gives `f ≈ 0.5` at initialisation, which halves the gradient at every step before learning has begun. Setting the forget-gate bias to 1.0 starts it at 0.73 instead — **a factor of 1.6 × 10⁸ better gradient flow over fifty steps**, purely from an initialisation choice. The network can learn to forget later; what it cannot do is learn from a gradient that has already vanished." },

    { t: "code", lang: "python", title: "Setting it in PyTorch",
      code: `H = lstm.hidden_size
with torch.no_grad():
    lstm.bias_ih_l0[H:2*H].fill_(1.0)      # the f chunk is [H:2H] in i,f,g,o order`,
      caption: "PyTorch does not do this by default, so it is worth adding explicitly for any sequence longer than a few dozen steps." },

    { t: "h2", n: "05", text: "The cost", id: "cost" },

    { t: "out", text: `  d=100, h=256: RNN    91,648   LSTM   366,592   ratio 4.00x
    reference formula 4h(h+d) = 364,544; with both bias vectors PyTorch has 366,592
  d= 32, h= 64: RNN     6,272   LSTM    25,088   ratio 4.00x` },

    { t: "p", text: "Four gates, four sets of weights — **exactly 4× a vanilla RNN**. The reference's `4h(h+d)` formula gives 364,544 for the first case against PyTorch's 366,592; the 2,048 difference is the two separate bias vectors PyTorch keeps for CuDNN compatibility, which are mathematically redundant with each other." },

    { t: "exercise", kind: "practice", title: "Build an LSTM and watch its gates", difficulty: "advanced", minutes: 45,
      prompt: "Implement the six equations and verify against `nn.LSTM` to 1e-6, being careful with the i,f,g,o packing order. Then train it on a task with a known long-range dependency and log the mean forget-gate value per timestep across training — does the network learn to keep the gate open where it matters? Finally, train two identical models differing only in forget-gate bias initialisation (0 against 1) on a 50-step task and compare convergence.",
      hints: [
        "`z.chunk(4, dim=1)` gives i, f, g, o in that order — not the f,i,g,o order some papers use.",
        "Sum `bias_ih_l0` and `bias_hh_l0`; PyTorch keeps both.",
        "Log the forget gate as a heatmap of timestep against training step."
      ],
      solution: {
        notes: [
          { t: "p", text: "The gate-order detail catches nearly everyone porting between frameworks or papers. PyTorch uses i, f, g, o; the original paper's presentation and some other frameworks order them differently. Get it wrong and the model still trains — the shapes are identical and gradients flow — it just learns badly, because the sigmoid gates and the tanh candidate have been swapped around. That is a silent failure of the same family as lesson 2.11's double softmax." },
          { t: "p", text: "The forget-gate heatmap is genuinely illuminating. On a task where information must persist, you see the gate rise towards 1 for the dimensions carrying that information and stay low elsewhere — the network learning its own memory policy, per dimension. That is the concrete meaning of 'the decay rate is learned rather than fixed', and it explains why an LSTM can handle hundreds of steps where an RNN manages twenty." },
          { t: "p", text: "The bias comparison should show a clear convergence gap at 50 steps. The arithmetic is stark: 0.5^50 is 8.9e-16 while 0.73^50 is 1.5e-07, a factor of 1.6e+08 in the starting gradient. The model initialised at 0 may eventually learn to open its forget gates, but it has to do so using the very gradient signal that the closed gates are suppressing — a chicken-and-egg problem that the initialisation simply sidesteps." }
        ]
      } }

  ],

  takeaways: [
    "Six equations: three sigmoid gates, a tanh candidate, an additive cell update, and a gated output.",
    "A hand implementation matches `nn.LSTM` to 5.96e-08; PyTorch packs gates in i, f, g, o order.",
    "`C_t = f⊙C_{t−1} + i⊙g` gives `∂C_t/∂C_{t−1} = f_t` exactly — verified, not approximated.",
    "The Jacobian is a learned gate value, not a fixed matrix, so decay is under the network's control.",
    "At f = 0.99 the gradient retains 37 % over 100 steps, where a vanilla RNN's was exactly zero.",
    "Initialising the forget-gate bias to 1.0 improves gradient flow over 50 steps by 1.6 × 10⁸.",
    "An LSTM has exactly 4× the parameters of a comparable RNN."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What is `∂C_t/∂C_{t−1}` in an LSTM?",
      options: ["`W_hh^T diag(tanh')`", "The forget gate `f_t`", "The input gate `i_t`", "Always 1"],
      answer: 1,
      why: "Because the cell update is additive — `C_t = f⊙C_{t−1} + i⊙g` — differentiating leaves the forget gate alone. This was verified exactly against autograd. There is no weight matrix and no activation derivative in that path, which is precisely why the gradient survives where a vanilla RNN's does not." },
    { stem: "Why initialise the forget-gate bias to 1.0?",
      options: ["To make the network forget faster", "So `f` starts near 0.73 rather than 0.5, preserving gradient flow early in training", "To prevent exploding gradients", "To match the input gate"],
      answer: 1,
      why: "A zero bias gives `f ≈ 0.5`, halving the gradient at every step before learning starts — 0.5^50 is 8.9e-16. A bias of 1 gives 0.73, and 0.73^50 is 1.5e-07, a factor of 1.6e+08 better. The network can learn to forget later, but it cannot learn from a gradient that has already vanished." },
    { stem: "Which LSTM components are sigmoids and which is a tanh, and why does it matter?",
      options: ["All four are sigmoids", "i, f, o are sigmoids (gates in (0,1)); the candidate g is a tanh (content in (−1,1))", "All four are tanh", "i and f are tanh; g and o are sigmoids"],
      answer: 1,
      why: "The sigmoids are valves deciding how much passes; the tanh is the actual content being written, and its negative range lets the cell subtract as well as add. Swapping them — easy to do when porting between frameworks with different gate orderings — trains without error but learns badly." },
    { stem: "How many parameters does an LSTM have relative to a vanilla RNN of the same size?",
      options: ["The same", "Twice as many", "Exactly four times as many", "Eight times as many"],
      answer: 2,
      why: "Four gates each need their own input and recurrent weight matrices and biases, so the count is 4h(h+d) against the RNN's h(h+d). Measured at d=100, h=256: 366,592 against 91,648, a ratio of exactly 4.00." }
  ] },

  interview: { title: "Interview", sub: "LSTM questions", questions: [
    { level: "Core", q: "Explain the LSTM gates and why each exists.",
      strong: "Forget decides what to discard, input plus candidate decide what to write, output decides what to expose.",
      answer: [{ t: "p", text: "There are two states: a cell state that is the network's memory, and a hidden state that is what it reveals at this step. The forget gate is a sigmoid deciding, per dimension, what fraction of the existing cell state to keep — near 1 keeps, near 0 wipes, which is what you want when a sentence ends and the previous subject is no longer relevant. The input gate decides which dimensions to update, and the candidate, a tanh, supplies the content of that update; the tanh range means it can subtract as well as add. The output gate then decides what portion of the cell state to expose as the hidden state, so the network can hold something in memory without acting on it yet. The cell update `C_t = f⊙C_{t−1} + i⊙g` is the crucial line, because it is additive — that is what makes the gradient survive." }] },
    { level: "Senior", q: "Why does an LSTM solve the vanishing gradient problem?",
      strong: "The cell-state gradient is the forget gate alone, so decay is learned per dimension rather than fixed by the weights.",
      answer: [{ t: "p", text: "Because the cell state is updated by addition, `∂C_t/∂C_{t−1}` is just the forget gate — I have verified that against autograd and it is exact, not approximate. Compare with the vanilla RNN, where the Jacobian is `W_hh^T diag(tanh')`: a fixed matrix whose largest eigenvalue determines vanishing or exploding, times an activation derivative that is always at most 1. In the LSTM there is no matrix and no derivative in that path. The consequence is that decay becomes a learned quantity, computed fresh per dimension per timestep — if something matters, the network sets the gate near 1 and the gradient flows through unchanged. I would be careful not to overstate it: at f = 0.9 the gradient is still down to 2.7e-05 over a hundred steps, so this is not unlimited memory. But at f = 0.99 it retains 37 % over the same span, where the vanilla RNN's gradient had underflowed to exactly zero." }] },
    { level: "Senior", q: "What implementation details would you check in someone's LSTM code?",
      strong: "Gate packing order, forget-bias initialisation, and whether both bias vectors are handled.",
      answer: [{ t: "p", text: "First the gate ordering. PyTorch packs the four gates as i, f, g, o in a single `(4H, d)` matrix, and other frameworks and papers use different orders — get it wrong and sigmoids and tanh end up on the wrong quantities, which trains without error and learns badly. Second, the forget-gate bias: PyTorch initialises it near zero, giving `f ≈ 0.5` and halving the gradient every step from the start. Setting that chunk to 1.0 is worth a factor of about 1.6e+08 in gradient flow over fifty steps and is a one-line change most codebases omit. Third, PyTorch keeps two bias vectors, `bias_ih` and `bias_hh`, which are mathematically redundant — anyone reimplementing the cell needs to sum them or they will have a small unexplained offset. And I would check gradient clipping is present, since the input and output gates still involve ordinary multiplicative paths that can explode even though the cell state cannot." }] }
  ] }
});

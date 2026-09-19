/* ============================================================================
   LESSON 4.3 — LSTM, Derived
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "**The LSTM's answer to the vanishing gradient is a second state that is updated by addition instead of by a matrix: c_t = f_t ⊙ c_{t−1} + i_t ⊙ g_t, so the Jacobian along the cell state is a diagonal of forget-gate values rather than a product of weight matrices.** With the forget gate near 0.95 the gradient through 200 steps is 0.99; through a tanh RNN it is 0.0. Every gate is written out on numbers and matched to nn.LSTMCell to 2 × 10⁻⁸; the full cell is implemented in NumPy over a sequence and matched to nn.LSTM to 5 × 10⁻⁸; the parameter count is derived (four times the RNN's); and the adding problem that the vanilla RNN failed at length 50 is run with an LSTM at three forget-gate initialisations — with the honest finding that it takes far longer to train than the GRU of 4.4.",

  objectives: [
    "Write the forget, input and output gates and the candidate, compute one step by hand, and match nn.LSTMCell",
    "Explain the constant error carousel: why ∂c_t/∂c_{t−1} = diag(f_t) preserves the gradient, and measure it against a tanh RNN",
    "Count the parameters (4·(H·D + H² + H)) and confirm against torch, RNN and GRU",
    "Implement the full LSTM forward in NumPy over a batch and a sequence and match nn.LSTM",
    "Read the adding-problem runs with forget-bias initialisation, and name the variants (peephole, CIFG, projection) and what the ablations found"
  ],

  prerequisites: ["4.2"],

  blocks: [

    { t: "h2", n: "01", text: "The cell, gate by gate", id: "gates" },

    { t: "code", lang: "text", title: "The equations (torch's block order: i, f, g, o)",
      code: `z   = W_ih x_t + W_hh h_{t−1} + b            one matrix product produces all four blocks, each of size H
i_t = σ(z_i)         input gate:   how much of the candidate to write         (0, 1)
f_t = σ(z_f)         forget gate:  how much of the old cell state to keep     (0, 1)
g_t = tanh(z_g)      candidate:    what to write                              (−1, 1)
o_t = σ(z_o)         output gate:  how much of the cell to expose             (0, 1)

c_t = f_t ⊙ c_{t−1} + i_t ⊙ g_t                the cell state: gated keep + gated write, ADDITIVE
h_t = o_t ⊙ tanh(c_t)                          the hidden state: a gated, squashed read of the cell`,
      caption: "Two states. The cell c is the memory: it is changed only by multiplying with a gate in (0, 1) and adding a gated candidate, never by passing through a weight matrix. The hidden state h is what the next step and the output see. The gates are sigmoids because they must lie in (0, 1) to act as soft switches (1.2); the candidate is a tanh because the cell must be bounded." },

    { t: "code", lang: "text", title: "One step by hand, input 2, hidden 3 (executed, matched to nn.LSTMCell)",
      code: `x = [0.5, −1.0]    h_prev = [0.1, −0.2, 0.3]    c_prev = [0.4, 0.0, −0.5]

z = W_ih x + W_hh h_prev + b:   i-block [0.392, 0.333, −0.057]   f-block [0.260, 0.141, 0.029]   g-block [−0.265, 0.548, −0.971]   o-block [−0.905, 0.547, −0.088]
i = σ(z_i) = [0.597, 0.582, 0.486]     f = σ(z_f) = [0.565, 0.535, 0.507]     g = tanh(z_g) = [−0.259, 0.499, −0.749]     o = σ(z_o) = [0.288, 0.634, 0.478]

c = f ⊙ c_prev + i ⊙ g = [0.565·0.4 + 0.597·(−0.259), 0.535·0 + 0.582·0.499, 0.507·(−0.5) + 0.486·(−0.749)] = [0.071, 0.291, −0.618]
h = o ⊙ tanh(c)           = [0.288·tanh 0.071, 0.634·tanh 0.291, 0.478·tanh(−0.618)]                                = [0.021, 0.179, −0.263]

nn.LSTMCell with the same weights:  h = [0.021, 0.179, −0.263]   c = [0.071, 0.291, −0.618]     max |diff| 1.9e-08`,
      caption: "Read the second cell unit: its old value was 0, the forget gate is irrelevant, and it takes 0.582 of the candidate 0.499. The third unit keeps half of −0.5 and adds half of −0.749. Every operation is element-wise once z is computed; the recurrence's only matrix products are in z." },

    { t: "code", lang: "text", title: "Parameter count (executed)",
      code: `LSTM(D, H):  4 · (H·D + H·H + H)         four blocks, each a linear map of [x; h] with a bias
  D=1,   H=64    16,896      torch 17,152 (torch keeps two bias vectors: +256)      RNN  4,288      GRU  12,864
  D=128, H=256  394,240      torch 395,264                                            RNN 98,816      GRU 296,448
  D=300, H=512  1,665,024    torch 1,667,072                                          RNN 416,768     GRU 1,250,304
  -> LSTM ≈ 4× the RNN, GRU ≈ 3× the RNN, at the same hidden size`,
      caption: "Four gates, four times the RNN's weights; the H² term dominates once H is large, so an LSTM of hidden 512 is 1.7 M parameters per layer. torch's separate b_ih and b_hh are redundant (they are always summed) and a historical artefact of cuDNN's layout." },

    { t: "h2", n: "02", text: "The constant error carousel", id: "cec" },

    { t: "p", text: "Differentiate the cell update: ∂c_t/∂c_{t−1} = diag(f_t) plus terms through the gates' dependence on h_{t−1}, which are small when the gates are saturated. Along the cell state, then, the gradient over T steps is a product of forget-gate values — numbers in (0, 1) chosen by the network — not a product of weight matrices with a fixed spectral radius. If the network sets f near 1, the gradient survives; Hochreiter called this the constant error carousel:" },

    { t: "code", lang: "text", title: "‖∂c_T/∂c_0‖ through the LSTM cell against ‖∂h_T/∂h_0‖ through a tanh RNN, random weights (executed)",
      code: `                 tanh RNN     LSTM, forget bias 0 (f≈0.50)    bias 1 (f≈0.73)    bias 3 (f≈0.95)
T = 10           1.4e-02      1.5e-02                         4.1e-01            4.5e+00
T = 50           3.2e-13      2.1e-10                         7.3e-04            1.3e+01
T = 100          4.6e-22      6.3e-20                         4.9e-07            2.2e+00
T = 200          0.0e+00      0.0e+00                         1.0e-12            9.9e-01`,
      caption: "With the forget gate at 0.5 the cell state's gradient halves every step and the LSTM is no better than the RNN. At 0.73 it is 10⁷ times better at T = 100 and still vanishing. At 0.95 the gradient through 200 steps is 0.99 — it arrives. The gates make the gradient's survival a *learnable* quantity, and the forget-gate bias sets where learning starts; initialising it to 1 or higher (Jozefowicz et al., 2015) is the single most useful LSTM trick." },

    { t: "h2", n: "03", text: "The full cell in NumPy", id: "numpy" },

    { t: "code", lang: "python", title: "Forward over a batch and a sequence, matched to nn.LSTM (executed)",
      code: `def lstm_np(X):                                     # X: (B, T, D); W_ih (4H, D), W_hh (4H, H), biases (4H,)
    h = zeros((B, H)); c = zeros((B, H)); outs = []
    for t in range(T):
        z = X[:, t] @ W_ih.T + h @ W_hh.T + b_ih + b_hh
        i, f, g, o = σ(z[:, :H]), σ(z[:, H:2H]), tanh(z[:, 2H:3H]), σ(z[:, 3H:])
        c = f * c + i * g
        h = o * tanh(c); outs.append(h)
    return stack(outs, 1), h, c

(batch 3, T 7, input 4, hidden 5) vs nn.LSTM:  output max |diff| 4.7e-08,  final h 4.7e-08,  final c 8.5e-08`,
      caption: "Nine lines. nn.LSTM's speed comes from a fused cuDNN kernel and from computing the four blocks in one product; the arithmetic is exactly this. The backward pass follows lesson 4.1's BPTT with the gate derivatives σ′ = σ(1 − σ) and tanh′ = 1 − tanh² inserted, and two gradient channels — through h and through c — instead of one." },

    { t: "h2", n: "04", text: "On the adding problem", id: "adding" },

    { t: "code", lang: "text", title: "LSTM hidden 64, Adam 1e-3, clip 1.0, on the task the RNN failed (executed)",
      code: `T = 50 (the tanh RNN of 4.2: 0.169 at 30 epochs = the mean baseline), 60 epochs; test MSE at epochs 10 / 20 / 30 / 40 / 50 / 60:
  forget bias 0.0    0.1705   0.1487   0.0432   0.0418   0.0039   0.0017
  forget bias 1.0    0.1699   0.1621   0.0151   0.0061   0.0064   0.0009
  forget bias 2.0    0.1702   0.1143   0.0512   0.0156   0.0037   0.0011

T = 100, 20 epochs (from the first attempt):  0.168 at every bias -- not learned in that budget
for comparison (4.4):  a GRU at T = 50 reached 0.0068 in 20 epochs; at T = 100, 0.0143`,
      caption: "The LSTM solves the length-50 problem the RNN could not — but it sits at the baseline for twenty epochs before the loss falls, and in a twenty-epoch budget at T = 100 it never left it. The forget bias changed the shape of the curve (bias 1 reached 0.006 by epoch 40 where bias 0 took fifty) rather than whether it learned. The GRU of the next lesson, with one gate fewer, learned the same task in a third of the epochs; the LSTM's extra gate is not free, and on this task it is slower to find the solution." },

    { t: "h2", n: "05", text: "Variants and what the ablations found", id: "variants" },

    { t: "dl", items: [
      ["Peephole connections", "The gates also read c_{t−1}: f_t = σ(W_f [x_t; h_{t−1}] + V_f ⊙ c_{t−1} + b_f). Lets the gates see the memory directly, which helps precise timing and counting tasks; rarely used now."],
      ["Coupled input and forget gates (CIFG)", "i_t = 1 − f_t: what is forgotten is exactly replaced. One gate fewer, three quarters of the parameters, and Greff et al. (2017) found no loss of accuracy across their benchmarks. The GRU's update gate is the same coupling."],
      ["Projection (LSTMP)", "h_t = W_p (o_t ⊙ tanh c_t) with W_p mapping to a smaller size: the cell can be wide while the recurrent and output dimension stays small. Standard in large speech models."],
      ["Greff et al.'s ablation (2017)", "Eight variants on three tasks: the forget gate and the output activation (the tanh on c) are the two components whose removal hurts everywhere; the peepholes and the output gate can go with little loss; coupling input and forget gates is free. The forget-gate bias initialisation and the learning rate were the hyperparameters that mattered most."],
      ["Forget-gate bias", "Initialise b_f to 1 (or higher) so the cell starts by remembering; the gradient table shows why, and the adding-problem runs above show what it costs when it is left at 0."]
    ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why does the LSTM's cell state preserve gradients where the RNN's hidden state does not?",
          options: [
            "Because the LSTM has more parameters",
            "Because c_t = f_t ⊙ c_{t−1} + i_t ⊙ g_t is an element-wise gated addition, so ∂c_t/∂c_{t−1} = diag(f_t) — a product of forget-gate values the network can set near 1 — rather than the RNN's product of weight matrices with a fixed spectral radius; measured: 0.99 through 200 steps at f ≈ 0.95 against 0.0 for the RNN",
            "Because the LSTM uses sigmoid instead of tanh",
            "Because the LSTM processes the sequence in both directions"
          ],
          answer: 1,
          why: "The additive path is the residual connection of recurrence (3.3): the state passes through with a multiplier the network controls. With f at 0.5 the LSTM was no better than the RNN (2 × 10⁻¹⁰ at T = 50) — the mechanism is the gate's value, and the initialisation decides where it starts."
        },
        {
          stem: "In the by-hand step, the second cell unit's old value was 0.0 and its new value was 0.291. Which quantities produced it?",
          options: [
            "The forget gate times the previous value",
            "The input gate (0.582) times the candidate (0.499): with c_prev = 0 the forget term contributes nothing and the new value is entirely the gated write i ⊙ g",
            "The output gate times tanh of the previous value",
            "The sum of all four gates"
          ],
          answer: 1,
          why: "Each cell unit is updated independently: keep a fraction of the old value, add a fraction of the candidate. The third unit shows both terms (0.507·(−0.5) + 0.486·(−0.749) = −0.618). The output gate then decides how much of tanh(c) reaches h."
        },
        {
          stem: "Why is the LSTM roughly four times the size of an RNN with the same hidden width?",
          options: [
            "Because it has two hidden states",
            "Because it computes four H-dimensional blocks — three gates and the candidate — each a linear map of [x; h] with a bias: 4·(H·D + H² + H), 16,896 for D = 1, H = 64 against the RNN's 4,288; the GRU's three blocks make it about three times",
            "Because of the peephole connections",
            "Because the cell state is stored in float64"
          ],
          answer: 1,
          why: "The count is exact and independent of sequence length; torch adds a redundant second bias vector (+256 here). At hidden 512 with 300-dimensional input a single LSTM layer is 1.67 M parameters, which is why speech models use projection layers."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "The LSTM by hand, over a sequence, and its gradient path",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Take an nn.LSTMCell(2, 3), extract its weights, and compute one step by hand for x = [0.5, −1], h_prev = [0.1, −0.2, 0.3], c_prev = [0.4, 0, −0.5]: all four gate blocks, c and h. Compare with the cell's output." },
        { t: "p", text: "**(b)** Implement the full LSTM forward in NumPy for a (batch, T, D) input using nn.LSTM's weights, and compare the output and final states on a (3, 7, 4) input with hidden size 5." },
        { t: "p", text: "**(c)** Measure ‖∂c_T/∂c_0‖ for an LSTMCell with the forget-gate bias set to 0, 1 and 3, and ‖∂h_T/∂h_0‖ for an RNNCell, at T = 10, 50, 100, 200." },
        { t: "p", text: "**(d)** Compute the parameter count 4·(H·D + H² + H) for (1, 64), (128, 256), (300, 512) and compare with nn.LSTM, nn.RNN and nn.GRU." }
      ],
      requirements: [
        "(a) the gate values, c, h and the discrepancy.",
        "(b) three maximum differences.",
        "(c) a 4 × 4 table.",
        "(d) three rows."
      ],
      hint: "torch's weight rows are ordered i, f, g, o in blocks of H; nn.LSTM uses W_ih of shape (4H, D) so the product is x @ W_ih.T. For (c), make c_0 a leaf with requires_grad and use torch.autograd.grad on c_T.sum().",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) i = [0.597, 0.582, 0.486]  f = [0.565, 0.535, 0.507]  g = [−0.259, 0.499, −0.749]  o = [0.288, 0.634, 0.478]
#     c = [0.071, 0.291, −0.618]   h = [0.021, 0.179, −0.263]   max |diff| vs nn.LSTMCell 1.9e-08

# (b) NumPy LSTM vs nn.LSTM on (3, 7, 4) -> hidden 5:  output 4.7e-08,  final h 4.7e-08,  final c 8.5e-08

# (c)            tanh RNN    LSTM b_f=0 (f≈0.50)   b_f=1 (f≈0.73)   b_f=3 (f≈0.95)
#     T=10       1.4e-02     1.5e-02               4.1e-01          4.5e+00
#     T=50       3.2e-13     2.1e-10               7.3e-04          1.3e+01
#     T=100      4.6e-22     6.3e-20               4.9e-07          2.2e+00
#     T=200      0.0e+00     0.0e+00               1.0e-12          9.9e-01

# (d) (1,64) 16,896 vs torch 17,152 (RNN 4,288, GRU 12,864);  (128,256) 394,240 vs 395,264;  (300,512) 1,665,024 vs 1,667,072`,
        notes: [
          { t: "p", text: "(a) and (b) are the cell as arithmetic; once matched to torch there is nothing left to take on faith." },
          { t: "p", text: "(c) is the constant error carousel measured: the gradient's survival is the forget gate's value raised to T." },
          { t: "p", text: "(d) is why a hidden size is chosen with the H² term in mind." }
        ]
      }
    }
  ],

  takeaways: [
    "Four blocks from one product z = W_ih x + W_hh h + b: input gate i = σ, forget gate f = σ, candidate g = tanh, output gate o = σ; then c_t = f ⊙ c_{t−1} + i ⊙ g and h_t = o ⊙ tanh(c_t). One step by hand matched nn.LSTMCell to 2 × 10⁻⁸; the full cell in nine lines of NumPy matched nn.LSTM to 5 × 10⁻⁸.",
    "The cell state is updated by gated addition, so ∂c_t/∂c_{t−1} = diag(f_t): the gradient over T steps is a product of forget-gate values the network controls, not of weight matrices. At f ≈ 0.95 it is 0.99 through 200 steps; at f ≈ 0.5 the LSTM is no better than the RNN.",
    "Parameters: 4·(H·D + H² + H) — four times an RNN, a third more than a GRU; 1.67 M for one layer at D = 300, H = 512.",
    "The forget-gate bias is the initialisation that matters: it sets f's starting value and hence how far the gradient reaches before any learning; set it to 1 or higher.",
    "On the adding problem at T = 50 the LSTM reached MSE 0.0009–0.0017 in 60 epochs — the task the RNN failed — after twenty epochs at the baseline; the forget bias moved the curve (bias 1 fastest) rather than the outcome; at T = 100 nothing was learned in 20 epochs, and a GRU learned both in a third of the time.",
    "Variants: peepholes let gates read the cell; coupling input and forget gates (i = 1 − f) is free (the GRU's idea); projection keeps a wide cell with a small output; ablations found the forget gate and the output tanh essential and the rest optional."
  ],

  quiz: {
    title: "LSTM, Derived — Knowledge Check",
    questions: [
      {
        stem: "What do the three gates of an LSTM control?",
        options: [
          "The learning rate, the batch size and the sequence length",
          "The forget gate scales how much of the previous cell state is kept, the input gate scales how much of the new candidate is written, and the output gate scales how much of the (tanh-squashed) cell state is exposed as the hidden state; each is a sigmoid so its value lies in (0, 1)",
          "Which layer processes the input",
          "The direction of the recurrence"
        ],
        answer: 1,
        why: "The by-hand step shows all three at work on three cell units. Because the gates are computed from the current input and previous hidden state, the network decides per step and per unit what to remember, write and reveal."
      },
      {
        stem: "Why does the LSTM keep two states (c and h) rather than one?",
        options: [
          "For numerical stability of the softmax",
          "The cell c is the unbounded-path memory updated only by gated addition (the gradient highway); the hidden h is a gated, tanh-squashed read of it that feeds the next step's gates and the output — separating what is stored from what is shown lets the memory persist without saturating the recurrence",
          "One for the forward direction and one for the backward",
          "h is a copy of c kept for the output layer"
        ],
        answer: 1,
        why: "If the only state were h, it would pass through tanh and the gates every step and the additive path would be lost. The GRU (4.4) merges the two by making h itself the additively updated state with an interpolation gate."
      },
      {
        stem: "With the forget-gate bias at 0, the LSTM's cell-state gradient at T = 50 was 2 × 10⁻¹⁰ — barely better than the RNN's 3 × 10⁻¹³. What does this say about the LSTM's advantage?",
        options: [
          "That the LSTM has no advantage",
          "That the advantage is not automatic: it exists when the forget gates are near 1, and at initialisation with zero bias they sit at 0.5, halving the gradient every step; setting b_f to 1 or 3 is what turns the additive path into a working gradient highway from the first step of training",
          "That the sigmoid should be replaced by a tanh",
          "That the cell state needs normalisation"
        ],
        answer: 1,
        why: "The mechanism is a *capacity* to preserve gradients, realised by gate values the network must learn or be given. It is why the forget-bias initialisation appears in every serious LSTM recipe and why the adding-problem runs depend on it."
      },
      {
        stem: "What did Greff et al.'s large ablation of LSTM variants conclude?",
        options: [
          "That peephole connections are essential",
          "That the forget gate and the output activation (tanh on the cell) are the two components whose removal hurts across tasks; peepholes and the output gate can be dropped with little loss; coupling the input and forget gates costs nothing; and the forget-bias initialisation and learning rate matter more than the architecture choices",
          "That the GRU is strictly better",
          "That more gates are always better"
        ],
        answer: 1,
        why: "It is the reason the CIFG/GRU simplification is safe and the reason 'set the forget bias' is the first thing to check. The vanilla LSTM as specified in 1997–2000 (with the forget gate added) remains the reference."
      },
      {
        stem: "Which parameterisation is used in large speech LSTMs and why?",
        options: [
          "Peephole connections, for timing",
          "Projection (LSTMP): the cell can be wide while h_t = W_p(o ⊙ tanh c) is projected to a smaller size, cutting the H² recurrent term and the output size without shrinking the memory",
          "Bidirectional cells at every layer",
          "A single shared gate for all three roles"
        ],
        answer: 1,
        why: "At hidden 2,048 a single LSTM layer would have 33 M recurrent parameters; projecting to 512 cuts the recurrent product fourfold. The variant list is about cost as much as accuracy."
      }
    ]
  },

  interview: {
    title: "Interview Questions — LSTM",
    sub: "The gates on numbers, the additive path and its measurement, the parameter count, and the initialisation that matters.",
    questions: [
      {
        level: "Core",
        q: "How does an LSTM work? Write the equations and explain the intuition.",
        strong: "One matrix product z = W_ih x_t + W_hh h_{t−1} + b produces four H-sized blocks: an input gate i = σ(z_i), a forget gate f = σ(z_f), a candidate g = tanh(z_g) and an output gate o = σ(z_o). The cell state updates additively, c_t = f ⊙ c_{t−1} + i ⊙ g: keep a gated fraction of the old memory, add a gated fraction of the new candidate. The hidden state is a gated read, h_t = o ⊙ tanh(c_t), which feeds the next step and the output. I worked one step by hand for input 2 and hidden 3 and matched nn.LSTMCell to 2 × 10⁻⁸, and the full cell over a batch and a sequence in nine lines of NumPy matched nn.LSTM to 5 × 10⁻⁸. The intuition is two states with different jobs: c is a memory that nothing multiplies except a gate in (0, 1), so it can carry a value unchanged for as long as the forget gate stays near 1; h is what the network shows and reasons with, bounded by the tanh. The gates are sigmoids because they must be soft switches; the candidate is a tanh because the memory must stay bounded. It costs four times an RNN's parameters — 4·(H·D + H² + H).",
        answer: [
          { t: "p", text: "The four blocks, both state updates, the executed checks, the two-state intuition, and the cost." }
        ]
      },
      {
        level: "Core",
        q: "Why does the LSTM solve the vanishing gradient problem, and does it always?",
        strong: "Because the cell state's update is additive: differentiating c_t = f_t ⊙ c_{t−1} + i_t ⊙ g_t with respect to c_{t−1} gives diag(f_t), plus small terms through the gates. So the gradient along the cell over T steps is a product of forget-gate values — the constant error carousel — rather than the RNN's product of the same weight matrix, whose norm is a fixed spectral radius to the power T. I measured both with random weights: through 200 steps the tanh RNN's gradient was 0.0 and the LSTM's was 0.99 — with the forget gate near 0.95. It does not always: with the forget-gate bias at 0 the gates sit at 0.5 at initialisation, the gradient halves every step, and at T = 50 the LSTM's 2 × 10⁻¹⁰ was hardly better than the RNN's 3 × 10⁻¹³; at bias 1 (f ≈ 0.73) it was 7 × 10⁻⁴. The advantage is a capacity the gates must realise, which is why the forget-bias initialisation is the LSTM's most important hyperparameter, and why on the adding problem the LSTM trained much more slowly than a GRU under the same budget.",
        answer: [
          { t: "p", text: "The diagonal Jacobian, the executed comparison across T and bias, and the honest condition." }
        ]
      },
      {
        level: "Advanced",
        q: "What LSTM variants exist and which matter?",
        strong: "Peephole connections let the gates read the previous cell state directly, which helps tasks needing precise timing and is otherwise rarely used now. Coupled input–forget gates set i = 1 − f so that whatever is forgotten is replaced — one gate fewer, and the idea the GRU is built on. Projection layers map the output to a smaller dimension so the cell can be wide without the H² recurrent cost, standard in large speech models. Multiplicative and layer-normalised LSTMs exist for language modelling. Greff et al.'s ablation over eight variants and three tasks found that only the forget gate and the output tanh are essential — removing either hurts everywhere — that the peepholes and the output gate are optional, that coupling is free, and that the forget-bias initialisation and the learning rate matter more than any of the architecture choices. So the vanilla LSTM with a forget gate initialised to 1 remains the reference; the GRU is the coupled, two-gate simplification; and the choice between them is usually made on speed, where the GRU's three blocks against four give it about a quarter less compute.",
        answer: [
          { t: "p", text: "The variants, the ablation's findings, and the practical choice." }
        ]
      }
    ]
  }
});

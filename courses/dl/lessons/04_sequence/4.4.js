/* ============================================================================
   LESSON 4.4 — GRU, and the Comparison That Matters
   ========================================================================= */
EC.receiveLesson({
  id: "4.4",

  lede: "**The GRU keeps the LSTM's idea — an additive, gated path for the state — with one state instead of two and two gates instead of three, and on the adding problem it learned length 50 in twenty epochs where the LSTM needed sixty.** One step is worked by hand and matched to nn.GRUCell; then the race: RNN, LSTM and GRU at lengths 20, 50 and 100, where the RNN fails everywhere, the LSTM learns only the shortest within the budget, and the GRU learns all three (0.0036, 0.0068, 0.0143). Then the things built on top — bidirectional and stacked layers, recurrent dropout done correctly, echo state networks, temporal convolutional networks — each measured on the same task, with one implementation mistake reproduced and explained.",

  objectives: [
    "Write the GRU's reset and update gates and candidate, compute one step by hand, and note torch's variant",
    "Run the RNN/LSTM/GRU race across sequence lengths and read parameters, time and accuracy",
    "Explain bidirectional and stacked recurrent layers with their shapes and measured effects",
    "Apply variational (locked) dropout to the recurrent connection correctly, and show what applying it to the carried state does",
    "Place echo state networks and temporal convolutional networks against gated recurrence"
  ],

  prerequisites: ["4.3"],

  blocks: [

    { t: "h2", n: "01", text: "The GRU", id: "gru" },

    { t: "code", lang: "text", title: "The equations and one step by hand (executed, matched to nn.GRUCell)",
      code: `r_t = σ(W_r [x_t; h_{t−1}] + b_r)                  reset gate:   how much of the old state the candidate may read
z_t = σ(W_z [x_t; h_{t−1}] + b_z)                  update gate:  how much of the old state to keep (and 1 − z of the candidate to write)
n_t = tanh(W_n x_t + r_t ⊙ (U_n h_{t−1}) + b_n)     candidate     (torch applies r inside: r ⊙ (U_n h + b); the paper: U_n (r ⊙ h))
h_t = (1 − z_t) ⊙ n_t + z_t ⊙ h_{t−1}               one state, interpolated

x = [0.5, −1],  h_prev = [0.1, −0.2, 0.3]:
  r = [0.773, 0.435, 0.402]    z = [0.342, 0.604, 0.413]    n = [−0.121, 0.392, 0.025]
  h = (1 − z) ⊙ n + z ⊙ h_prev = [−0.046, 0.035, 0.139]        nn.GRUCell: [−0.046, 0.035, 0.139]`,
      caption: "The update gate does the LSTM's forget and input gates' jobs with one number: z keeps, 1 − z writes (the coupled-gate variant of 4.3). The reset gate lets the candidate ignore the past when a new segment starts. There is no separate cell: h itself is the additively updated state, and ∂h_t/∂h_{t−1} contains the term diag(z_t) that carries gradient the way the LSTM's forget gate does." },

    { t: "code", lang: "text", title: "Parameters at hidden 64, input 2 (from 4.3's count): RNN 4,417 · GRU 13,121 · LSTM 17,473 (including the output layer)",
      code: `GRU:  3 · (H·D + H·H + 2H)     three blocks (r, z, n) against the LSTM's four`,
      caption: "Three quarters of the LSTM's parameters and compute per step, with the same additive path. The empirical comparison (Chung et al., 2014; Greff et al., 2017) finds them equivalent on most tasks, with the GRU faster and the LSTM occasionally ahead on language modelling and translation at scale." },

    { t: "h2", n: "02", text: "The race", id: "race" },

    { t: "code", lang: "text", title: "The adding problem, best test MSE in 20 epochs; hidden 64, Adam 1e-3, clip 1.0; predicting the mean gives 0.167 (executed)",
      code: `           RNN (4,417 params)      LSTM (17,473, forget bias 1)     GRU (13,121)
T =  20    0.1469  (12 s)         0.0184  (12 s)                   0.0036  (32 s)
T =  50    0.1691  (47 s)         0.1625  (56 s)                   0.0068  (95 s)
T = 100    0.1639  (43 s)         0.1655  (34 s)                   0.0143  (177 s)

the LSTM with 60 epochs at T = 50 (4.3): 0.0009–0.0017 -- it learns, three times later`,
      caption: "The RNN does not learn the task at any length in twenty epochs — the vanishing gradient of 4.2. The LSTM learns length 20 and is still at the baseline at 50 and 100 after twenty epochs; given sixty it reaches 0.001 at length 50. The GRU learns all three lengths in the same twenty epochs. On this task, at this budget, the simpler gated cell finds the solution faster; that is the honest ranking here, not a law — on large language tasks the LSTM has often matched or beaten the GRU." },

    { t: "dl", items: [
      ["Why the GRU was faster here", "Fewer parameters to coordinate, and the update gate's interpolation h = (1 − z)n + zh starts every unit as a leaky integrator, which is close to what the adding problem needs; the LSTM has to learn to open its output gate and set its forget gate before its cell is useful."],
      ["When the LSTM is preferred", "Tasks with a clear separate 'memory' and 'expose' need (the output gate), very long sequences where the cell's unbounded range helps, and the large-scale language results that predate transformers. Both are cheap to try; the choice is empirical."],
      ["The GRU's time cost", "The runs above are Python-looped cells for the dropout variants and cuDNN for the plain ones; the GRU's 32 s against the LSTM's 12 s at T = 20 is a kernel-selection artefact of this CPU run, not the arithmetic, which is three quarters of the LSTM's."]
    ] },

    { t: "h2", n: "03", text: "Bidirectional and stacked", id: "bidir" },

    { t: "code", lang: "text", title: "GRUs on the adding problem at T = 50, 20 epochs (executed)",
      code: `1 layer                              MSE 0.0068    ( 63 s, 13,121 params)
bidirectional                        MSE 0.0077    (126 s, 26,241 params)
2 layers                             MSE 0.0005    (108 s, 38,081 params)
2 layers, dropout 0.3 between        MSE 0.0024    ( 75 s, 38,081 params)

bidirectional shapes: output (4, 10, 16) = forward ‖ backward;  h_n (2, 4, 8) = one final state per direction
  the forward state at t = 0 has seen one step; the backward state at t = 0 has seen all ten`,
      caption: "Stacking helped (0.0005): the second layer reads the first's sequence of states, a hierarchy like a CNN's. The bidirectional layer did not help on a task where the answer is a function of the whole sequence read once — it doubles the parameters for a second reading in reverse — but it is the default for tagging, where each position benefits from both contexts (4.5, 4.7). Dropout between layers (torch's dropout argument) cost a little on this small, clean task, as in 1.7." },

    { t: "h2", n: "04", text: "Dropout on the recurrence, done right and done wrong", id: "dropout" },

    { t: "p", text: "Ordinary dropout on a recurrent network's *state* with a fresh mask at every step destroys the memory it is trying to regularise. Gal & Ghahramani's variational dropout uses one mask per sequence, applied to the recurrent *input* of the gates — what the gates see of the state — while the carried state itself is left intact. The distinction is exact, and the wrong version is easy to write:" },

    { t: "code", lang: "text", title: "GRU, T = 50, 20 epochs (executed)",
      code: `dropout on the gates' view of the state (the carried state intact):
  no dropout                                  0.0025
  variational p = 0.1 (one mask per sequence) 0.0030
  variational p = 0.3                         0.0041
  naive per-step mask p = 0.1                 0.0024
  naive per-step mask p = 0.3                 0.0034

the first attempt -- the mask applied to the carried state itself, every step:
  variational p = 0.1                         0.165     (the task is not learned)
  per-step p = 0.1                            0.025`,
      caption: "Applied correctly, recurrent dropout at 0.1–0.3 costs almost nothing on a task that needs exact memory, and on language modelling it is the regulariser that made LSTMs competitive (weight-dropped LSTM, AWD-LSTM). Applied to the carried state, one mask per sequence zeroes the same units for the whole sequence — those units can never carry the number — and the network fails. The difference is one line: h_in = h ⊙ mask for the gate computations, and h itself for the interpolation." },

    { t: "h2", n: "05", text: "Two alternatives to gated recurrence", id: "alternatives" },

    { t: "code", lang: "text", title: "Echo state network and temporal convolutional network on the same task (executed)",
      code: `echo state network: a fixed random reservoir of 300 tanh units at spectral radius 0.9, only a ridge read-out is trained
  adding problem T = 50:  test MSE 0.1471     (5 s)      -- barely better than the mean; the reservoir does not store a marked number for 25 steps

temporal convolutional network: 4 causal dilated 1-D convolutions, k = 3, dilations 1/2/4/8, receptive field 31, 9,569 params
  adding problem T = 50:  best MSE 0.0690     (10 s)     -- parallel over time; the field of 31 cannot always reach the first marked value`,
      caption: "Reservoir computing trains nothing but the read-out; it is fast and works for prediction of chaotic dynamics, and it cannot learn to hold a specific value. The TCN (Bai et al., 2018) is the convolutional answer to sequences — 3.1's dilation stack over time, causal so that no output sees the future — and it is competitive with recurrent models on many benchmarks; here its receptive field (31) is shorter than the dependency (up to 50), and a fifth layer would fix it. The transformer is the third alternative, and module 5 is about it." },

    { t: "table", head: ["Model", "State", "Parallel over time", "Long dependencies", "Best at"],
      rows: [
        ["Vanilla RNN", "h, bounded", "No", "A few steps (4.2)", "Nothing in practice; the baseline"],
        ["LSTM", "c and h, gated", "No", "Hundreds of steps with f near 1", "Language, speech, the classical sequence tasks"],
        ["GRU", "h, gated", "No", "As LSTM", "The same, cheaper; the default first try"],
        ["Echo state", "Fixed reservoir", "No", "Fading memory only", "Chaotic-series prediction, tiny compute"],
        ["TCN", "None", "Yes", "Receptive field = Σ (k − 1)·d", "Fixed-horizon forecasting, audio (WaveNet)"],
        ["Transformer (5.x)", "None (attention)", "Yes", "Any, at O(T²)", "Everything at scale"]
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "How does the GRU's update gate relate to the LSTM's gates?",
          options: [
            "It is the output gate",
            "It couples the forget and input gates into one: z keeps the old state and 1 − z writes the candidate, h = (1 − z)⊙n + z⊙h_prev, so what is forgotten is exactly replaced — the CIFG variant of the LSTM, with the additive path preserved (∂h_t/∂h_{t−1} contains diag(z_t))",
            "It replaces the tanh candidate",
            "It has no LSTM counterpart"
          ],
          answer: 1,
          why: "Greff et al. found coupling the two gates free; the GRU takes it and drops the output gate and the second state. The by-hand step shows the interpolation directly."
        },
        {
          stem: "The GRU learned the adding problem at length 100 in twenty epochs (0.014) and the LSTM did not (0.166), yet the LSTM has more parameters. What is the right reading?",
          options: [
            "The GRU is a better architecture in general",
            "On this task and budget the GRU found the solution faster — its interpolation gate starts close to the integrator the task needs, while the LSTM must first learn to set its forget and output gates; given three times the epochs the LSTM also learns (0.001 at length 50). The ranking is task- and budget-specific, and both are cheap to try",
            "The LSTM's forget bias was wrong",
            "The GRU has a longer receptive field"
          ],
          answer: 1,
          why: "Speed of learning and final capability are different things; the race measured the first. The honest conclusion is the one the literature reached: try the GRU first, keep the LSTM in reserve, and expect them to tie."
        },
        {
          stem: "Applying one dropout mask per sequence to the GRU's carried state made the network fail (0.165), while applying the same mask to the gates' view of the state cost nothing (0.0030). Why?",
          options: [
            "Because the learning rate must be lowered with dropout",
            "Because masking the carried state zeroes the same units at every step, so those units cannot hold anything for the length of the sequence — the memory the task depends on is destroyed; masking only what the gates read leaves the state intact and regularises how the gates use it, which is Gal & Ghahramani's construction",
            "Because the mask was not rescaled by 1/(1 − p)",
            "Because dropout cannot be used with GRUs"
          ],
          answer: 1,
          why: "The two implementations differ by which tensor the mask multiplies. It is the kind of one-line error that produces a plausible-looking training run with a wrong conclusion, and the measurement is what caught it."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "The GRU by hand, the race, and recurrent dropout on the right tensor",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Take an nn.GRUCell(2, 3), extract its weights, and compute r, z, n and h by hand for x = [0.5, −1], h_prev = [0.1, −0.2, 0.3]; match the cell's output." },
        { t: "p", text: "**(b)** Train nn.RNN, nn.LSTM (forget bias 1) and nn.GRU classifiers (hidden 64, Adam 1e-3, clip 1.0, 20 epochs) on the adding problem at T = 20, 50, 100; report best test MSE, time and parameters." },
        { t: "p", text: "**(c)** Write a GRU cell by hand so that a dropout mask can be applied to the recurrent input of the gates only. Train at T = 50 with no dropout, variational p = 0.1 and 0.3 (one mask per sequence), and per-step masks at 0.1 and 0.3. Then apply the mask to the carried state instead and report what happens at p = 0.1." },
        { t: "p", text: "**(d)** Train a 4-layer causal dilated TCN (k = 3, dilations 1, 2, 4, 8) on T = 50 and report its receptive field and MSE." }
      ],
      requirements: [
        "(a) the three gate vectors, h, and the match.",
        "(b) a 3 × 3 table.",
        "(c) six MSEs.",
        "(d) a receptive field and an MSE."
      ],
      hint: "(a) torch's candidate is tanh(W_in x + b_in + r ⊙ (W_hn h + b_hn)). (c) h_in = h * mask feeds Wh(·) for r, z, n; the interpolation h = (1 − z)n + zh uses the unmasked h. (d) Pad each conv by (k − 1)·d on the left (or pad both sides and crop) so no output sees the future.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) r = [0.773, 0.435, 0.402]  z = [0.342, 0.604, 0.413]  n = [−0.121, 0.392, 0.025]  h = [−0.046, 0.035, 0.139] == nn.GRUCell

# (b)          RNN       LSTM      GRU
#     T=20     0.1469    0.0184    0.0036
#     T=50     0.1691    0.1625    0.0068
#     T=100    0.1639    0.1655    0.0143      (params 4,417 / 17,473 / 13,121)

# (c) gates' view masked:  none 0.0025  var 0.1 0.0030  var 0.3 0.0041  per-step 0.1 0.0024  per-step 0.3 0.0034
#     carried state masked (wrong): var 0.1 0.165 -- the task is not learned; per-step 0.1 0.025

# (d) TCN receptive field 31, best MSE 0.0690 (9,569 params, 10 s)`,
        notes: [
          { t: "p", text: "(a) is the cell as arithmetic; note where torch puts the reset gate." },
          { t: "p", text: "(b) is the comparison the lesson is named for, with the budget stated." },
          { t: "p", text: "(c) is the bug that produces a confident wrong conclusion about regularisation; (d) is what a convolutional alternative can and cannot reach." }
        ]
      }
    }
  ],

  takeaways: [
    "GRU: reset r and update z gates, candidate n = tanh(W_n x + r ⊙ (U_n h)), and h = (1 − z)⊙n + z⊙h_prev — one state, two gates, three quarters of the LSTM's parameters, the same additive path; one step matched nn.GRUCell exactly.",
    "The race at 20 epochs: the RNN failed at every length (0.147–0.169), the LSTM learned only T = 20 (0.018), the GRU learned T = 20, 50 and 100 (0.0036, 0.0068, 0.0143); the LSTM learns T = 50 given 60 epochs. Faster to learn here, not better in general.",
    "Stacking two GRU layers took T = 50 from 0.0068 to 0.0005; a bidirectional layer did not help a whole-sequence task (0.0077) but is the default for tagging; inter-layer dropout cost a little on clean data.",
    "Variational dropout goes on the gates' view of the state, one mask per sequence, and costs nothing at p = 0.1–0.3; put the mask on the carried state and the network cannot learn the task (0.165) — a one-line difference.",
    "An echo state network (fixed reservoir, ridge read-out) cannot hold a marked value (0.147); a 4-layer dilated TCN with a receptive field of 31 reaches 0.069 at T = 50 in parallel over time — a fifth layer would cover the dependency.",
    "The choice: GRU first, LSTM in reserve, both cheap to try; TCNs for fixed horizons and audio; transformers (module 5) at scale."
  ],

  quiz: {
    title: "GRU and the Comparison — Knowledge Check",
    questions: [
      {
        stem: "What does the GRU's reset gate do?",
        options: [
          "It resets the hidden state to zero at the end of each sequence",
          "It scales how much of the previous state the candidate may read (r ⊙ U_n h): near 0 the candidate is computed from the current input alone, which lets the network start fresh at a boundary; near 1 the candidate sees the full past",
          "It controls the learning rate of the recurrent weights",
          "It selects between the forward and backward directions"
        ],
        answer: 1,
        why: "The update gate decides how much of the past survives; the reset gate decides how much of the past shapes the proposal for the new state. In the by-hand step r = [0.77, 0.44, 0.40] let the candidate see most of the first unit's past and less than half of the others'."
      },
      {
        stem: "Bidirectional GRU: what are the output and h_n shapes for input (4, 10, 2) with hidden 8, and why does h_n[1] differ from output[:, 0, 8:]?",
        options: [
          "output (4, 10, 8), h_n (1, 4, 8); they are equal",
          "output (4, 10, 16) with forward and backward concatenated, h_n (2, 4, 8) with one final state per direction; h_n[1] is the backward direction's final state, which is its state at t = 0 after reading the whole sequence backwards — and that is exactly output[:, 0, 8:], while output[:, −1, 8:] is the backward state after one step",
          "output (4, 10, 16), h_n (2, 4, 8); h_n[1] equals output[:, −1, 8:]",
          "output (8, 10, 4), h_n (2, 4, 8)"
        ],
        answer: 1,
        why: "The backward direction runs from the last step to the first, so its 'final' state sits at position 0 of the output. For classification concatenate h_n[0] and h_n[1]; for tagging use output, which has both contexts at every position."
      },
      {
        stem: "Why did stacking two GRU layers help the adding problem (0.0068 → 0.0005) while a bidirectional layer did not (0.0077)?",
        options: [
          "Stacking adds more gates",
          "The second layer reads the first layer's sequence of states and can compute functions of them — a hierarchy, as depth does in a CNN — which helps a task that requires combining two marked values; the backward direction re-reads the same information in reverse, which adds nothing to a whole-sequence decision and doubles the parameters",
          "The bidirectional layer had too few epochs",
          "Stacking reduces the sequence length"
        ],
        answer: 1,
        why: "Depth and direction are different resources. Bidirectionality pays when each position's output benefits from the future — tagging, encoding for attention (4.6) — and stacking pays when the task needs composition."
      },
      {
        stem: "What is an echo state network and where does it fit?",
        options: [
          "A GRU with tied weights",
          "A recurrent network whose recurrent and input weights are random and fixed (a reservoir scaled to spectral radius below 1 for fading memory) and only whose linear read-out is trained by regression — seconds to fit, good for chaotic-series prediction, and unable to learn to store a specific value (0.147 on the adding problem)",
          "A network trained only with reinforcement learning",
          "A recurrent network with no hidden state"
        ],
        answer: 1,
        why: "Reservoir computing trades learnability for cost: the reservoir's dynamics are whatever the random matrix gives, and the read-out can only combine them. The spectral-radius condition is the same quantity 4.2 measured, used deliberately."
      },
      {
        stem: "Why is a TCN's receptive field the quantity to check before using it, and what was it here?",
        options: [
          "Because TCNs have no receptive field",
          "Because a causal dilated convolution stack sees exactly Σ (k − 1)·dᵢ + 1 past steps — 31 for k = 3 and dilations 1, 2, 4, 8 — and anything further back cannot influence the output at all; on the adding problem with a dependency of up to 50 steps that limit is why it reached only 0.069, and one more layer (dilation 16) would cover it",
          "Because the receptive field grows during training",
          "Because it determines the batch size"
        ],
        answer: 1,
        why: "It is 3.1's receptive-field formula on the time axis, with dilation doing the exponential growth. A recurrent model's reach is soft (a gradient that fades); a TCN's is hard (a window), and both must match the task."
      }
    ]
  },

  interview: {
    title: "Interview Questions — GRU and the Comparison",
    sub: "The GRU's gates, the LSTM comparison with evidence, bidirectional and stacked layers, recurrent dropout, and the alternatives.",
    questions: [
      {
        level: "Core",
        q: "What is a GRU and how does it compare with an LSTM?",
        strong: "A GRU is a gated recurrent unit with one state and two gates: a reset gate r that scales how much of the previous state the candidate may read, an update gate z that interpolates between the old state and the candidate — h_t = (1 − z)⊙n + z⊙h_{t−1} — and a tanh candidate n computed from the input and the reset-scaled state. The update gate couples the LSTM's forget and input gates into one (what is forgotten is replaced), there is no output gate and no separate cell, and the parameter count is three blocks instead of four — 13,121 against 17,473 in my classifier at hidden 64. The additive path is the same: ∂h_t/∂h_{t−1} contains diag(z_t), so gradients survive when z is near 1. Empirically they are close. On the adding problem in a twenty-epoch budget the GRU learned lengths 20, 50 and 100 (0.0036, 0.0068, 0.0143) while the LSTM learned only length 20 and needed sixty epochs to solve 50 — the GRU found the solution faster there because its interpolation starts close to the integrator the task needs. The literature's summary is that they tie on most tasks, the GRU is cheaper, and the LSTM sometimes wins at large scale on language; the practical rule is GRU first, LSTM in reserve.",
        answer: [
          { t: "p", text: "The equations, the coupling and the missing parts, the parameter count, the executed race, and the practical rule." }
        ]
      },
      {
        level: "Core",
        q: "How do you apply dropout to a recurrent network?",
        strong: "Not the way you apply it to a feed-forward layer. A fresh mask on the hidden state at every step, or worse a mask on the carried state, destroys the memory the recurrence exists to keep: I applied one mask per sequence to a GRU's carried state and the adding problem was not learned at all (0.165 against 0.0025 without dropout). Gal and Ghahramani's variational dropout uses one mask per sequence, applied to the recurrent input of the gates — what the gates read of the state — and to the inputs, while the carried state itself is left intact; implemented that way, p = 0.1 and 0.3 cost nothing on the same task (0.0030, 0.0041), and on language modelling it is the regulariser behind the strong LSTM results. Dropout between stacked layers (torch's dropout argument) is safe because it acts on the sequence passed upward, not on the recurrence; it cost a little on the clean adding task, as any regulariser does on data with nothing to regularise. The rule: one mask per sequence, on the gate inputs, never on the state that carries the memory.",
        answer: [
          { t: "p", text: "The failure with its executed number, the correct construction with its numbers, inter-layer dropout, and the rule." }
        ]
      },
      {
        level: "Advanced",
        q: "What alternatives to gated RNNs exist for sequences, and how do they compare?",
        strong: "Three families. Temporal convolutional networks stack causal dilated 1-D convolutions — 3.1's dilation over time — so they are parallel over time and have a hard receptive field of Σ (k − 1)·dᵢ + 1; with four layers of k = 3 at dilations 1, 2, 4, 8 that is 31 steps, which is why the TCN reached only 0.069 on a length-50 adding problem where the dependency can span 50 — a fifth layer would cover it. They are competitive with LSTMs on many benchmarks and are the architecture of WaveNet. Echo state networks fix a random recurrent reservoir at spectral radius below 1 and train only a linear read-out: seconds to fit, useful for chaotic-series prediction, and unable to learn to store a specific value (0.147 on the same task). Transformers replace recurrence with attention: any position reads any other in one step, training is parallel, and the cost is quadratic in length — module 5. The trade-offs are the ones this course has measured: recurrence has a fixed-size state and sequential training; convolution has parallelism and a hard window; attention has parallelism and unlimited reach at O(T²). State-space models (5.3) are the newest attempt to combine parallel training with a fixed inference state.",
        answer: [
          { t: "p", text: "TCNs, reservoirs and transformers with the executed numbers, and the trade-off axes." }
        ]
      }
    ]
  }
});

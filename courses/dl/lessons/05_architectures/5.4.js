/* ============================================================================
   LESSON 5.4 — Reference Card: the LSTM
   Mirrors Architectures/lstm.md. Parameter formula checked; the forget-gate
   bias item is backed by the measured result from lesson 3.3.
   ========================================================================= */
EC.receiveLesson({
  id: "5.4",

  lede: "**The LSTM card has one entry that matters more than the rest: initialise the forget-gate bias to 1.** The reference lists it among five failure modes, which understates it. Module 3 measured an LSTM sitting at chance — 48.2 %, losing to a vanilla RNN — on a task it should have solved easily, and that one line of initialisation took it to 100 %. This card is organised so that item is hard to miss.",

  objectives: [
    "Apply the LSTM parameter formula and account for PyTorch's extra biases",
    "Diagnose an LSTM from its symptom",
    "Set the forget-gate bias correctly in PyTorch",
    "State what an LSTM is genuinely good and bad at"
  ],

  prerequisites: ["5.3"],

  blocks: [

    { t: "h2", n: "01", text: "The card", id: "tldr" },

    { t: "table", head: ["", ""],
      rows: [
        ["**Core idea**", "an additive cell state, gated — `C_t = f⊙C_{t−1} + i⊙g`"],
        ["**Gates**", "forget, input, output — three sigmoids, plus a tanh candidate"],
        ["**Why it works**", "`∂C_t/∂C_{t−1} = f_t` exactly — a learned decay rate, no matrix, no tanh′"],
        ["**Cost**", "4× a vanilla RNN's parameters"],
        ["**Practical ceiling**", "hundreds of steps; still forgets past roughly a thousand"],
        ["**Must do**", "initialise the forget-gate bias to 1"],
        ["**PyTorch**", "`nn.LSTM(input_size, hidden_size, batch_first=True)`"]
      ] },

    { t: "h2", n: "02", text: "Parameter count", id: "complexity" },

    { t: "math", tex: "\\text{params} = 4H(H + D + 1), \\qquad \\text{compute} = O(T \\cdot H^2) \\; \\text{— not parallel over } T" },

    { t: "out", text: `  lstm.md  H=128 D=64 : formula 98,816  pytorch 99,328  (+512)` },

    { t: "p", text: "The reference's worked example checks out exactly: `4·128·193 = 98,816`. PyTorch's extra 512 is `4H` — the second bias vector, one chunk per gate. Four gate transforms means exactly 4× a vanilla RNN and 4/3× a GRU, ratios that hold at every size." },

    { t: "h2", n: "03", text: "The one that bites", id: "forget-bias" },

    { t: "code", lang: "python", title: "Set both bias vectors",
      code: `H = lstm.hidden_size
with torch.no_grad():
    lstm.bias_ih_l0[H:2*H].fill_(1.0)    # f chunk is [H:2H] in i,f,g,o order
    lstm.bias_hh_l0[H:2*H].fill_(0.0)    # they SUM, so zero the other one`,
      caption: "Setting only `bias_ih` leaves `bias_hh` at its random initialisation, so the effective bias is 1 plus noise. Both must be set." },

    { t: "out", text: `  PyTorch default : mean f at init = 0.4991   f^20 = 9.188e-07   f^50 = 8.092e-16
  bias set to 1.0 : mean f at init = 0.7311   f^20 = 1.901e-03   f^50 = 1.576e-07

   lag T    RNN     LSTM (default bias)   LSTM (forget bias = 1.0)
    T= 20   100.0%         48.2%                100.0%
    T= 30   100.0%         49.2%                100.0%
    T= 50    51.3%         51.5%                 51.8%` },

    { t: "callout", kind: "crit", title: "Chance to perfect, from one line",
      body: [{ t: "p", text: "At PyTorch's default the forget gate starts at 0.4991, so the cell gradient is halved at every step before any learning has occurred — a factor of a million over twenty steps. The model cannot get started, because opening the gates would require the gradient signal that the closed gates are suppressing. Setting the bias to 1 starts the gate at 0.7311 and breaks the circularity. Note the honest limit in the third row: at fifty steps everything still fails, so this buys roughly 10⁹ in starting gradient and is not unlimited memory." }] },

    { t: "h2", n: "04", text: "Diagnosis", id: "failures" },

    { t: "table", head: ["Symptom", "Likely cause", "Fix"],
      rows: [
        ["At chance on a moderate-range task", "Forget-gate bias at PyTorch's default", "Set it to 1.0 — measured 48.2 % → 100 %"],
        ["Loss → NaN on long sequences", "Exploding gradients through the gate paths", "`clip_grad_norm_` — the cell path is safe, the gates are not"],
        ["Still forgets past ~1000 steps", "Finite gating capacity — `f = 0.9` gives 2.7e-05 over 100 steps", "Attention or a transformer"],
        ["Train ≫ validation", "4× the parameters of an RNN on a small dataset", "GRU instead, dropout between layers, weight decay"],
        ["Training is slow", "Sequential — no parallelism over time", "Truncated BPTT, or switch architecture"],
        ["Model trains but learns badly after a port", "Gate order mismatch — PyTorch packs i, f, g, o", "Check the framework's ordering"],
        ["Hand implementation is slightly off", "Only one of the two bias vectors summed", "Add `bias_ih` and `bias_hh`"]
      ] },

    { t: "callout", kind: "trap", title: "Gate ordering differs between frameworks and papers",
      body: [{ t: "p", text: "PyTorch packs the four gates as **i, f, g, o** in a single `(4H, d)` matrix. Other frameworks and the original paper's presentation order them differently. Get it wrong when porting weights or setting the forget bias and the model still trains — the shapes are identical and gradients flow — it simply learns badly, because the sigmoid gates and the tanh candidate have been swapped around. It is a silent failure of the same family as applying softmax twice." }] },

    { t: "h2", n: "04b", text: "Reading the gates", id: "gates" },

    { t: "p", text: "When an LSTM misbehaves, gate statistics are the most informative thing available, and a forward hook extracts them in one line." },

    { t: "table", head: ["Observation", "What it means"],
      rows: [
        ["Forget gate near 1 for most dimensions", "The model is holding memory — expected on long-dependency tasks"],
        ["Forget gate near 0 everywhere", "History is being ignored; check whether the task needs memory at all"],
        ["Forget gate stuck near 0.5 after training", "Usually the bias initialisation problem — the gate never received enough gradient to move"],
        ["Input gate near 0 with forget near 1", "The cell is frozen: carrying old state, writing nothing new"],
        ["Output gate near 0", "Memory held but not exposed — legitimate, worth confirming against the task"]
      ] },

    { t: "callout", kind: "good", title: "Log the mean forget gate per timestep during training",
      body: [{ t: "p", text: "One line with a forward hook, and it turns an opaque failure into a readable one. On a task where information must persist you should see the gate rise towards 1 for the dimensions carrying that information and drift down elsewhere — the network learning its own retention policy per dimension. A gate that never moves from its initialisation is the signature of the bootstrap problem, where the model cannot learn to open its gates because the closed gates suppress the very gradient it would need." }] },

    { t: "h2", n: "05", text: "Honest strengths and weaknesses", id: "tradeoffs" },

    { t: "diagram", kind: "compare", title: "What an LSTM is for",
      caption: "It solved the problem it was designed for and was then overtaken on long context.",
      columns: [
        { title: "Good at", tone: "good", items: [
          "Long-range dependencies — 1.7e-12 of gradient at 60 steps against an RNN's 1.8e-17",
          "Stable gradients via the additive cell path",
          "Streaming — O(1) state regardless of length",
          "Variable-length sequences"
        ] },
        { title: "Bad at", tone: "warn", items: [
          "Very long context — outperformed by transformers",
          "Parallel training — strictly sequential over time",
          "Small datasets — 4× the parameters is real overfitting risk",
          "Simplicity — three gates and two states is a lot of surface area for bugs"
        ] }
      ] },

    { t: "exercise", kind: "practice", title: "Sweep the forget-gate bias", difficulty: "intermediate", minutes: 35,
      prompt: "On a task with a controlled dependency length, sweep the forget-gate bias over −2, −1, 0, 1, 2, 3 and 5 and plot final accuracy against bias. Record the initial mean forget-gate value for each. Then pick the best value and log the mean forget gate through training — does it stay near where you initialised it, or move? Finally, verify that setting only `bias_ih` and leaving `bias_hh` random gives noticeably worse and more variable results than setting both.",
      hints: [
        "`sigmoid(bias)` gives the initial gate value; compute `sigmoid(b)^T` for your lag T.",
        "The effective bias is the sum of the two vectors.",
        "Run several seeds — the one-vector version should be visibly more variable."
      ],
      solution: {
        notes: [
          { t: "p", text: "Expect a threshold rather than a smooth curve: below roughly 0.5 the model never gets started, above it the task is solved, and very large values eventually hurt because the network struggles to learn to forget anything at all. The arithmetic explains the shape — `sigmoid(0)^20` is about 1e-06 while `sigmoid(1)^20` is 1.9e-03, a factor of two thousand in the starting gradient at twenty steps." },
          { t: "p", text: "Logging the gate through training usually shows it rising above the initialised value for dimensions carrying the signal and drifting down elsewhere, which is the network learning its own retention policy per dimension. That is the point worth taking away: the initialisation only has to make learning *possible*: once training is underway the gate is data-driven and the bias no longer matters." },
          { t: "p", text: "The single-vector version is worth doing because it is the mistake people actually make. Setting `bias_ih` to 1 while `bias_hh` keeps its uniform random initialisation gives an effective bias of 1 plus noise on the order of ±1/√H, so the gate starts somewhere uncontrolled and varies by seed. It mostly works, which is exactly why it survives — the symptom is run-to-run variance rather than failure." }
        ]
      } }

  ],

  takeaways: [
    "`4H(H + D + 1)` parameters — exactly 4× an RNN, 4/3× a GRU; PyTorch adds `4H` for its second bias.",
    "Initialise the forget-gate bias to 1.0, setting *both* bias vectors since they sum.",
    "Measured: default bias gives 48.2 % on a 20-step task; bias 1.0 gives 100 %.",
    "PyTorch's default puts f at 0.4991, halving the cell gradient at every step before training starts.",
    "The cell path is gradient-safe; the gate paths are not, so still clip.",
    "PyTorch packs gates as i, f, g, o — a mismatch trains without error and learns badly.",
    "At fifty steps even a correctly initialised LSTM failed — gating is not unlimited memory."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why initialise the LSTM forget-gate bias to 1?",
      options: ["To make the model forget faster", "PyTorch's default puts f near 0.5, halving the cell gradient every step before training begins", "To reduce parameters", "To match the input gate"],
      answer: 1,
      why: "At the default the gate starts at 0.4991, giving 9.2e-07 of the gradient over twenty steps. Setting the bias to 1 starts it at 0.7311, giving 1.9e-03. Measured effect on a 20-step task: 48.2 % against 100 %. The model cannot learn to open its gates using the gradient those closed gates suppress." },
    { stem: "When setting the forget-gate bias in PyTorch, why must you touch both bias vectors?",
      options: ["For CUDA compatibility", "`bias_ih` and `bias_hh` are summed, so leaving one random gives an uncontrolled effective bias", "They control different gates", "Only one is used in training"],
      answer: 1,
      why: "The computation uses their sum, so setting `bias_ih` to 1 while `bias_hh` keeps its uniform random init gives an effective bias of 1 plus noise. It mostly works, which is why the mistake survives — the symptom is run-to-run variance rather than outright failure." },
    { stem: "How many parameters does an LSTM have relative to a GRU at the same sizes?",
      options: ["The same", "4/3× — four gates against three", "2×", "3×"],
      answer: 1,
      why: "`4H(H+D+1)` against `3H(H+D+1)`, so the GRU is exactly 75 % of the LSTM — a ratio that holds at every size. Against a vanilla RNN the LSTM is exactly 4×." },
    { stem: "Does an LSTM still need gradient clipping?",
      options: ["No — the cell state solves gradient problems", "Yes — the gate paths still involve ordinary multiplicative transformations that can explode", "Only for very short sequences", "Only with bidirectional layers"],
      answer: 1,
      why: "The additive cell path is gradient-safe, but the input, forget and output gates are computed through ordinary weight matrices and can still explode on long sequences. The cell state solves *vanishing*; clipping is still the defence against exploding." }
  ] },

  interview: { title: "Interview", sub: "LSTM diagnosis", questions: [
    { level: "Core", q: "An LSTM performs at chance on a task a plain RNN solves. What would you check?",
      strong: "The forget-gate bias initialisation.",
      answer: [{ t: "p", text: "That result contradicts the theory, so I would look for something preventing the LSTM from using the gradient advantage it structurally has, rather than concluding the architecture does not help. I have hit exactly this: the per-position gradient measurement showed the LSTM's gradient at position zero was actually *larger* than the RNN's, which ruled out the architecture and pointed at initialisation. PyTorch initialises the forget-gate bias near zero, so the gate starts at about 0.4991 and the cell gradient is halved at every step before any learning happens — a factor of a million over twenty steps. Setting that bias to 1.0 took the model from 48.2 % to 100 % with nothing else changed. The general habit I would emphasise is measuring something that discriminates between explanations before trying fixes in sequence." }] },
    { level: "Senior", q: "LSTM or transformer for a production system?",
      strong: "Decided by whether you need streaming with bounded state, and whether pretrained weights exist.",
      answer: [{ t: "p", text: "Two questions settle it most of the time. Does inference need to be streaming, processing one item as it arrives under a fixed memory budget? An LSTM carries a constant hidden and cell state — 256 floats in one setup I measured — however long the stream runs, while a transformer needs a KV cache that grows with context, around 369 MB per sequence at 10,000 tokens for a modest 12-layer model. For real-time audio or an embedded device that is decisive. And does a pretrained transformer exist for the domain? For text it always does, and fine-tuning it will beat anything trained from scratch — I measured the vision analogue at 67.1 per cent against 34.3 per cent, thirty-three points from the weights alone. No streaming constraint plus pretrained weights available means the decision is already made. Where it stays genuinely open is long sequences under a memory budget, since both architectures are uncomfortable there and the linear-attention and state-space families are worth looking at rather than forcing either." }] },
    { level: "Senior", q: "What are an LSTM's real limits?",
      strong: "Finite gating capacity past roughly a thousand steps, and no parallelism over time.",
      answer: [{ t: "p", text: "Two, and they are different in kind. The memory limit is quantitative: the cell gradient is multiplied by the forget gate at every step, so at f = 0.99 it retains 37 % over a hundred steps but at f = 0.9 it is down to 2.7e-05. The network can learn to keep gates near one for dimensions that matter, but it is still an exponential decay with a learned rate, so somewhere past a thousand steps it genuinely forgets. Attention removes that by making the path length one hop regardless of distance. The second limit is structural: the recurrence cannot be parallelised across time, so training throughput is capped by sequence length no matter what hardware you have, which is what ended LSTM's dominance rather than any accuracy gap. I would add that the LSTM's advantage over a plain RNN is large but not magical — at sixty steps I measured 1.7e-12 of gradient reaching position zero against the RNN's 1.8e-17, which is five orders of magnitude better and still very small." }] }
  ] }
});

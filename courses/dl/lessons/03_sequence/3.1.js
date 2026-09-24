/* ============================================================================
   LESSON 3.1 — The Vanilla RNN
   Mirrors 03_Sequence_Models.md · §1. The recurrence is implemented by hand
   and checked against nn.RNN (scratchpad/dl/d31.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.1",

  lede: "**A convolution assumes neighbouring pixels are related. A recurrent network assumes the past matters.** It keeps a hidden state, updates it at every step from the current input and the previous state, and reuses the same weights throughout — so one small set of parameters processes a sequence of any length. That design gives it enormous flexibility and one crippling weakness, which the next two lessons measure.",

  objectives: [
    "Write the RNN recurrence and implement it from the equations",
    "Explain weight sharing across time and its consequence for parameter count",
    "Identify the fixed-size hidden state as an information bottleneck",
    "Match the four input/output shapes to their tasks"
  ],

  prerequisites: ["2.13", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "The recurrence", id: "recurrence" },

    { t: "math", tex: "h_t = \\tanh(W_{hh} h_{t-1} + W_{xh} x_t + b_h) \\qquad\\qquad y_t = W_{hy} h_t + b_y" },

    { t: "p", text: "Two inputs combine at every step: what is arriving now (`x_t`) and everything that came before, compressed into `h_{t-1}`. The tanh squashes the result into `(−1, 1)`, keeping the state bounded no matter how long the sequence runs." },

    { t: "diagram", kind: "flow", title: "The RNN unrolled",
      caption: "One cell, applied repeatedly. The horizontal arrows carrying h are the only route by which information from step 1 reaches step t.",
      cols: 4,
      nodes: [
        { id: "h0", label: "h₀ = 0", sub: "initial state", tone: "accent" },
        { id: "h1", label: "h₁", sub: "tanh(W·h₀ + W·x₁)", tone: "good" },
        { id: "h2", label: "h₂", sub: "tanh(W·h₁ + W·x₂)", tone: "good" },
        { id: "h3", label: "h₃", sub: "tanh(W·h₂ + W·x₃)", tone: "good" },
        { id: "y", label: "y_t = W_hy h_t", sub: "output at any step", tone: "violet" }
      ],
      edges: [["h0", "h1"], ["h1", "h2"], ["h2", "h3"], ["h3", "y"]] },

    { t: "code", lang: "python", title: "The equations, coded directly",
      code: `Wxh, Whh = cell.weight_ih_l0, cell.weight_hh_l0
bh = cell.bias_ih_l0 + cell.bias_hh_l0     # PyTorch keeps two bias vectors

h = torch.zeros(B, H)
outputs = []
for t in range(T):
    h = torch.tanh(x[:, t] @ Wxh.T + h @ Whh.T + bh)
    outputs.append(h)`,
      caption: "`Whh` is referenced inside the loop and never indexed by `t` — the same weight sharing that lesson 2.10 identified in the convolution, applied across time instead of across space." },

    { t: "out", text: `  my loop vs nn.RNN: max abs diff 8.941e-08
  final hidden matches: True` },

    { t: "p", text: "Agreement to float32 round-off. `nn.RNN` is doing exactly this loop with a fused kernel — there is no hidden machinery." },

    { t: "h2", n: "02", text: "Weight sharing across time", id: "sharing" },

    { t: "out", text: `  T=  5: output (1, 5, 6), parameters 72 (unchanged)
  T= 50: output (1, 50, 6), parameters 72 (unchanged)
  T=500: output (1, 500, 6), parameters 72 (unchanged)` },

    { t: "callout", kind: "insight", title: "Parameter count is independent of sequence length",
      body: [{ t: "p", text: "Seventy-two parameters process a sequence of 5 steps or of 500. This is the same argument as a convolution's independence from image size, rotated from space into time: because the same `W_hh` applies at every step, a pattern learned at step 3 during training is recognised at step 300 at test time. Without sharing you would need separate weights per position, the model could only handle the sequence length it was trained on, and nothing learned early would transfer late. It is also, as the next lesson shows, precisely the property that makes the gradient a product of `T` identical matrices — and therefore the source of the vanishing gradient problem." }] },

    { t: "h2", n: "03", text: "The bottleneck", id: "bottleneck" },

    { t: "out", text: `  T=  10:    40 input values -> 6 hidden values (7:1 compression)
  T= 100:   400 input values -> 6 hidden values (67:1 compression)
  T=1000:  4000 input values -> 6 hidden values (667:1 compression)` },

    { t: "p", text: "The hidden state is a fixed-size summary of an unbounded history. At ten steps that is a mild compression; at a thousand it is 667:1, and the network must decide at every step what to keep and what to overwrite — with no mechanism for making that decision deliberately. **LSTM and GRU are, in essence, the addition of that mechanism**, and attention is the decision to abandon the fixed-size summary entirely." },

    { t: "h2", n: "04", text: "Four shapes, four tasks", id: "variants" },

    { t: "diagram", kind: "compare", title: "RNN configurations",
      caption: "The recurrence is identical in all four; only which steps consume inputs and emit outputs changes.",
      columns: [
        { title: "Many-to-one", tone: "accent", items: [
          "Read the whole sequence, emit one output at the end",
          "Only h_T is used",
          "Sentiment classification, sequence categorisation"
        ] },
        { title: "One-to-many", tone: "good", items: [
          "One input, then generate step by step",
          "Each output feeds the next step's input",
          "Image captioning, unconditional generation"
        ] },
        { title: "Many-to-many, aligned", tone: "violet", items: [
          "One output per input, same length",
          "Every h_t produces a y_t",
          "Part-of-speech tagging, named entity recognition"
        ] },
        { title: "Many-to-many, seq2seq", tone: "teal", items: [
          "Encoder reads all, decoder writes all",
          "Lengths need not match",
          "Translation, summarisation"
        ] }
      ] },

    { t: "callout", kind: "trap", title: "Only the last hidden state is trained in a many-to-one model",
      body: [{ t: "p", text: "If the loss only touches `h_T`, then every earlier step is trained solely through the gradient that flows backwards along the chain. That is fine when the sequence is short. When it is long, lesson 3.3 shows that gradient has already vanished by the time it reaches the early steps — so those steps receive essentially no learning signal at all, and the model effectively ignores the beginning of its input. A common symptom is a sentiment classifier that keys almost entirely on the last few words." }] },

    { t: "exercise", kind: "practice", title: "Implement and verify an RNN", difficulty: "intermediate", minutes: 30,
      prompt: "Implement the RNN recurrence from the equations and verify it against `nn.RNN` to at least 1e-6, being careful about PyTorch's two separate bias vectors. Then confirm the parameter count does not change with sequence length, and build a many-to-one classifier on a toy task: decide whether a sequence contains a particular token. Vary where in the sequence that token appears — beginning, middle, end — and measure accuracy for each position at sequence lengths 10, 30 and 100.",
      hints: [
        "PyTorch stores `bias_ih_l0` and `bias_hh_l0` separately; sum them.",
        "`weight_ih_l0` is stored as (hidden, input), so you need the transpose for `x @ W.T`.",
        "Generate the data so the token's position is controlled, not random, or you cannot separate the effects."
      ],
      solution: {
        notes: [
          { t: "p", text: "The position experiment is the important half. At length 10 the RNN should detect the token anywhere. At length 100, accuracy for tokens near the end stays high while accuracy for tokens near the beginning collapses towards chance — the model genuinely cannot see them. That is not a capacity problem and more hidden units will not fix it; it is the vanishing gradient, which lesson 3.3 measures directly. Seeing it as a curve of accuracy against token position is more convincing than any amount of theory." },
          { t: "p", text: "On the verification, the bias detail catches most people. PyTorch keeps `bias_ih` and `bias_hh` as separate vectors for CuDNN compatibility even though they are mathematically redundant — the sum is the only thing that matters. Forgetting one gives a small constant offset that looks like a subtle numerical issue rather than a missing term." }
        ]
      } }

  ],

  takeaways: [
    "`h_t = tanh(W_hh h_{t−1} + W_xh x_t + b)` — the same weights at every step.",
    "A hand-written loop matches `nn.RNN` to 8.9e-08; there is no hidden machinery.",
    "Parameter count is independent of sequence length: 72 parameters handle T=5 or T=500.",
    "The hidden state is a fixed-size bottleneck — 667:1 compression at T=1000.",
    "Four configurations — many-to-one, one-to-many, aligned many-to-many, and seq2seq — share one recurrence.",
    "In a many-to-one model, early steps learn only through the backward chain, which is where the trouble starts."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does an RNN's parameter count not depend on sequence length?",
      options: ["Parameters are added dynamically", "The same weight matrices are reused at every time step", "The hidden state stores the parameters", "Sequences are padded to a fixed length"],
      answer: 1,
      why: "Measured: 72 parameters handle T=5, T=50 and T=500 identically. Weight sharing across time is what makes the model applicable to arbitrary lengths and lets a pattern learned at one position transfer to another — and it is also why the gradient becomes a product of T copies of the same matrix, which causes the vanishing gradient problem." },
    { stem: "What is the fundamental limitation of the hidden state?",
      options: ["It is too slow to compute", "It compresses unbounded history into a fixed-size vector", "It can only hold positive values", "It resets at every step"],
      answer: 1,
      why: "At T=1000 with 6 hidden units, 4,000 input values are squeezed into 6 numbers — 667:1. The network must continually decide what to keep and overwrite with no explicit mechanism for doing so. LSTM and GRU add that mechanism; attention removes the fixed-size summary altogether." },
    { stem: "Which configuration suits named entity recognition?",
      options: ["Many-to-one", "One-to-many", "Many-to-many with matched lengths", "Seq2seq"],
      answer: 2,
      why: "Every token gets its own label, so there is one output per input and the lengths match by construction. Seq2seq is for tasks where input and output lengths differ independently, like translation; many-to-one emits a single label for the whole sequence, which would lose the per-token structure NER requires." },
    { stem: "A sentiment classifier on long reviews seems to ignore the opening sentences. What is the most likely cause?",
      options: ["Insufficient hidden units", "The gradient reaching early steps has vanished, so they receive almost no training signal", "The learning rate is too low", "The embeddings are untrained"],
      answer: 1,
      why: "In a many-to-one model the loss touches only `h_T`, so early steps learn solely through the backward chain. Over a long sequence that gradient decays exponentially — measured at a ratio of 3.5e+15 across 50 steps — so the early positions get essentially no signal. Adding capacity does not help; the architecture has to change." }
  ] },

  interview: { title: "Interview", sub: "RNN fundamentals", questions: [
    { level: "Core", q: "Explain how an RNN processes a sequence.",
      strong: "A hidden state updated at each step from the current input and previous state, with shared weights throughout.",
      answer: [{ t: "p", text: "It maintains a hidden state vector that acts as memory. At each step it computes `h_t = tanh(W_hh h_{t−1} + W_xh x_t + b)` — combining what is arriving now with a summary of everything before — and optionally emits an output from `h_t`. The same weight matrices are used at every step, which is the crucial design decision: it means the parameter count is independent of sequence length, the model handles inputs of any length, and a pattern learned at one position generalises to others. The cost is that the entire history has to fit in that fixed-size hidden state, which becomes an increasingly severe bottleneck as sequences get longer — and the weight sharing also makes the gradient a product of many copies of the same matrix, which is what causes vanishing gradients." }] },
    { level: "Senior", q: "What is the fundamental limitation of the RNN hidden state?",
      strong: "It is a fixed-size summary of unbounded history, with no explicit mechanism for deciding what to keep.",
      answer: [{ t: "p", text: "Everything the network knows about the sequence so far has to fit in one fixed-size vector. With six hidden units and a thousand timesteps that is 4,000 input values compressed into 6 numbers — a 667:1 compression — and the network has to decide at every step what to overwrite, with no explicit machinery for making that decision. It is a lossy summary that degrades as sequences lengthen. This framing is useful because it explains the whole line of development that follows: LSTM and GRU add explicit gates so the network can decide deliberately what to keep and what to discard, and attention goes further by abandoning the fixed-size summary entirely and letting the decoder look back at every encoder state directly. Each step is addressing the same bottleneck." }] },
    { level: "Core", q: "What are the main RNN configurations and what are they for?",
      strong: "Many-to-one, one-to-many, aligned many-to-many, and seq2seq — the recurrence is the same, only inputs and outputs differ.",
      answer: [{ t: "p", text: "Many-to-one reads the whole sequence and produces one output from the final hidden state — sentiment classification. One-to-many takes a single input and generates a sequence, feeding each output back as the next input — image captioning. Aligned many-to-many emits one output per input at matched lengths — POS tagging or NER. And seq2seq uses an encoder to read the input into a context vector and a decoder to generate an output of independent length — translation or summarisation. The cell is identical in all four; what changes is which steps consume inputs and which emit outputs. Worth noting that the many-to-one case is the one most exposed to vanishing gradients, since early steps are trained only through the backward chain from the very end." }] }
  ] }
});

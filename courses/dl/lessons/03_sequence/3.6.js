/* ============================================================================
   LESSON 3.6 — Bidirectional and Stacked Architectures
   Mirrors 03_Sequence_Models.md · §7. Causality, h_n layout and dropout
   behaviour all verified in scratchpad/dl/d36.py.
   ========================================================================= */
EC.receiveLesson({
  id: "3.6",

  lede: "**Two ways to give a recurrent model more: let it read backwards as well as forwards, or stack layers on top of each other.** Both are one keyword argument in PyTorch, and both carry consequences that the keyword does not advertise. Bidirectionality destroys causality — measurably, as this lesson shows — which silently rules out every generation and streaming task. Stacking changes what `h_n` means and where dropout lands.",

  objectives: [
    "Build bidirectional RNNs and interpret the doubled output dimension",
    "Demonstrate that bidirectionality breaks causality and say which tasks that excludes",
    "Index `h_n` correctly for stacked and bidirectional models",
    "Choose a depth and apply dropout in the right place"
  ],

  prerequisites: ["3.5"],

  blocks: [

    { t: "h2", n: "01", text: "Bidirectional", id: "bidirectional" },

    { t: "p", text: "Run one RNN forwards and a second, independent one backwards, and concatenate their states at each position. Every output then carries context from both sides." },

    { t: "diagram", kind: "flow", title: "Two passes, concatenated",
      caption: "The output at every position is [forward; backward], so its size is 2 × hidden.",
      cols: 4,
      nodes: [
        { id: "f1", label: "h→₁", sub: "seen x₁", tone: "accent" },
        { id: "f2", label: "h→₂", sub: "seen x₁,x₂", tone: "accent" },
        { id: "f3", label: "h→₃", sub: "seen x₁..x₃", tone: "accent" },
        { id: "b3", label: "h←₃", sub: "seen x₃", tone: "violet" },
        { id: "b2", label: "h←₂", sub: "seen x₃,x₂", tone: "violet" },
        { id: "b1", label: "h←₁", sub: "seen x₃..x₁", tone: "violet" },
        { id: "o", label: "[h→ ; h←]", sub: "2H per position", tone: "good" }
      ],
      edges: [["f1", "f2"], ["f2", "f3"], ["b3", "b2"], ["b2", "b1"], ["f3", "o"], ["b1", "o"]] },

    { t: "out", text: `  unidirectional: output (2, 6, 16), h_n (1, 2, 16), 1,792 params
  bidirectional : output (2, 6, 32), h_n (2, 2, 16), 3,584 params
  exactly 2x the parameters: 2.00x` },

    { t: "p", text: "The motivating example is disambiguation. *\"The bank of the ___\"* is genuinely ambiguous read left to right; *\"the bank of the river\"* is not. A forward-only model at the word *bank* has no access to the evidence that resolves it. For named entity recognition, part-of-speech tagging and sentence classification that access is often decisive." },

    { t: "h2", n: "02", text: "The cost: causality", id: "causality" },

    { t: "p", text: "Change **only the final input** and look at what happens to the output at position 0:" },

    { t: "out", text: `  unidirectional : changed by 0.000e+00  (causal - the future cannot reach the past)
  bidirectional  : changed by 9.387e-02  (NOT causal - t=0 sees the whole sequence)` },

    { t: "callout", kind: "crit", title: "This rules out generation and streaming entirely",
      body: [{ t: "p", text: "Exactly zero against 9.4e-02 is the whole story. In a bidirectional model, the representation at position 0 depends on input at position T — so if you train a language model this way it learns to predict each token from information that includes that token, scores beautifully, and generates nonsense at inference when the future does not exist. The same applies to any streaming or real-time system: the backward pass cannot start until the sequence is complete, so a bidirectional model structurally cannot emit an output until it has seen every input. Neither failure raises an error. The first shows up as a training metric that is too good; the second shows up when you try to deploy." }] },

    { t: "table", head: ["Task", "Bidirectional?", "Why"],
      rows: [
        ["Named entity recognition", "Yes", "Full sentence available; following words disambiguate"],
        ["Sentence classification", "Yes", "The whole input is present before any output"],
        ["Part-of-speech tagging", "Yes", "Grammatical role often depends on what follows"],
        ["Language modelling", "**No**", "Predicting token t from token t+1 is leakage"],
        ["Text generation", "**No**", "The future does not exist yet at inference"],
        ["Real-time speech", "**No**", "Cannot wait for the utterance to end"]
      ] },

    { t: "h2", n: "03", text: "Indexing the final state", id: "hn" },

    { t: "out", text: `  h_n (2, 2, 16): shape is (num_layers * num_directions, B, H)
  h_n[0] == output[:, -1, :H] : True
  h_n[1] == output[:,  0, H:] : True` },

    { t: "callout", kind: "trap", title: "The backward direction's final state lives at t = 0",
      body: [{ t: "p", text: "For a many-to-one bidirectional model you want the summary of the whole sequence, which is the forward pass at the *last* step concatenated with the backward pass at the *first* step. Reaching for `output[:, -1, :]` gives you the forward pass's genuine final state alongside the backward pass's state after it has seen only one token — half your representation is nearly empty. The correct summary is `torch.cat([h_n[-2], h_n[-1]], dim=1)`, or equivalently `torch.cat([output[:, -1, :H], output[:, 0, H:]], dim=1)`. This is one of the most common bugs in bidirectional code, and it degrades accuracy without ever failing." }] },

    { t: "h2", n: "04", text: "Stacking", id: "stacked" },

    { t: "out", text: `  1 layer(s): output (2, 6, 16), h_n (1, 2, 16),   1,792 params
  2 layer(s): output (2, 6, 16), h_n (2, 2, 16),   3,968 params
  3 layer(s): output (2, 6, 16), h_n (3, 2, 16),   6,144 params
  4 layer(s): output (2, 6, 16), h_n (4, 2, 16),   8,320 params` },

    { t: "p", text: "Each layer's output sequence becomes the next layer's input sequence, so lower layers learn local patterns and higher ones learn longer-range structure — the temporal analogue of the spatial hierarchy in lesson 2.2. Note that **`output` is always the top layer only**, whatever the depth; `h_n` is where the per-layer states live." },

    { t: "dl", items: [
      ["NLP", "2–4 layers, with clearly diminishing returns beyond 3."],
      ["Speech recognition", "4–8 layers — longer sequences with more hierarchical structure."],
      ["Bidirectional and stacked", "2–3 bidirectional layers, which is 4–6 directional passes."]
    ] },

    { t: "h2", n: "05", text: "Dropout in the right place", id: "dropout" },

    { t: "out", text: `  num_layers=3, dropout=0.5, train mode: two passes differ by 4.212e-02
  same model in eval mode                : 0.000e+00` },

    { t: "p", text: "PyTorch's `dropout` argument applies **between layers**, never on the recurrent connections. That distinction matters: dropping recurrent connections randomly at each timestep injects noise into the memory path itself and disrupts exactly the temporal dependencies you are trying to learn. Variational dropout — the same mask reused at every timestep — is the technique that makes recurrent dropout work, and it is not what this argument does." },

    { t: "callout", kind: "trap", title: "`dropout` on a single-layer RNN does nothing",
      body: [{ t: "p", text: "With `num_layers=1` there is no between-layer position to apply it, so PyTorch emits a warning and ignores the argument entirely. People set it, see the warning scroll past in a busy log, and believe their model is regularised when it is not. If you need dropout around a single-layer RNN, apply an explicit `nn.Dropout` to the embeddings going in or the output coming out." }] },

    { t: "out", text: `  3 layers, bidirectional: output (2, 6, 32), h_n (6, 2, 16)
  h_n has 6 rows = num_layers(3) x num_directions(2)` },

    { t: "exercise", kind: "practice", title: "Prove the causality violation", difficulty: "intermediate", minutes: 30,
      prompt: "Build a unidirectional and a bidirectional LSTM. Perturb only the last timestep of the input and measure how much each model's output changes at position 0 — confirm one is exactly zero and the other is not. Then train a bidirectional model as a next-token language model and compare its training perplexity against a unidirectional one; explain the gap. Finally, build a many-to-one bidirectional classifier two ways — using `output[:, -1, :]` and using the correct concatenation — and compare accuracy.",
      hints: [
        "For the causality test, use the same weights for both perturbed and unperturbed runs.",
        "The bidirectional language model's perplexity will look implausibly good. That is the point.",
        "The correct summary is `torch.cat([h_n[-2], h_n[-1]], dim=1)`."
      ],
      solution: {
        notes: [
          { t: "p", text: "The causality measurement should be exactly 0.000e+00 for the unidirectional model — not small, zero, because there is genuinely no computational path from a later input to an earlier output. The bidirectional model changes by something on the order of 1e-02. Having a hard zero on one side makes this a proof rather than an observation." },
          { t: "p", text: "The bidirectional language model will report a perplexity far better than any unidirectional model achieves, because it is predicting each token using a representation that has already read that token. It is pure leakage. This matters beyond the toy case: it is the same error as fitting a scaler on the full dataset before splitting, and it produces the same symptom — an offline number that is wonderful and does not survive deployment. Anything implausibly good deserves a check for a path from the label into the features." },
          { t: "p", text: "The `output[:, -1, :]` version will be measurably worse but not catastrophic, which is what makes it survive code review. Half the representation is the backward pass having seen a single token, so you have roughly a unidirectional model carrying some dead weight. Since it still trains and still beats a random baseline, nothing flags it." }
        ]
      } }

  ],

  takeaways: [
    "A bidirectional RNN concatenates independent forward and backward passes: 2× output width, 2× parameters.",
    "Measured: perturbing the last input changes the unidirectional output at t=0 by exactly 0, the bidirectional by 9.4e-02.",
    "That rules out language modelling, generation and streaming — silently, with no error.",
    "`h_n` is `(num_layers × num_directions, B, H)`; the backward direction's final state corresponds to t = 0.",
    "For a bidirectional summary use `torch.cat([h_n[-2], h_n[-1]])`, not `output[:, -1, :]`.",
    "`output` is always the top layer only, whatever the depth.",
    "PyTorch's `dropout` argument applies between layers only, and is silently ignored when `num_layers=1`."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why can't you use a bidirectional RNN for language modelling?",
      options: ["It is too slow", "Each position's representation depends on future tokens, so predicting the next token leaks the answer", "It uses too much memory", "It cannot be trained with backpropagation"],
      answer: 1,
      why: "Measured: perturbing the final input changes the bidirectional output at position 0 by 9.4e-02, while the unidirectional change is exactly zero. The model would predict each token using a representation that has already read it, giving implausibly good training perplexity and nonsense at generation time." },
    { stem: "For a many-to-one bidirectional model, which gives the correct sequence summary?",
      options: ["`output[:, -1, :]`", "`torch.cat([h_n[-2], h_n[-1]], dim=1)`", "`output.mean(dim=1)`", "`h_n[0]`"],
      answer: 1,
      why: "The backward pass's final state is at position 0, not position T−1. `output[:, -1, :]` pairs the forward pass's genuine summary with a backward state that has seen exactly one token, so half the representation is nearly empty. The model still trains, just worse — which is why this bug survives." },
    { stem: "What does `nn.LSTM(..., num_layers=1, dropout=0.5)` do?",
      options: ["Applies dropout to the recurrent connections", "Nothing — PyTorch warns and ignores it, since there is no between-layer position", "Applies dropout to the output", "Applies dropout to the input"],
      answer: 1,
      why: "The argument controls dropout between stacked layers, so with one layer there is nowhere to apply it. PyTorch emits a warning that is easy to miss in a busy log, leaving you believing the model is regularised when it is not. Use an explicit `nn.Dropout` on the embeddings or outputs instead." },
    { stem: "In a 3-layer LSTM, what does `output` contain?",
      options: ["The concatenation of all three layers", "The top layer's hidden states at every timestep", "The average across layers", "The first layer's states"],
      answer: 1,
      why: "`output` is always the top layer's sequence of hidden states, regardless of depth — the shape stays `(B, T, H)` whether you have one layer or four. Per-layer final states live in `h_n`, which gains one row per layer (and per direction, if bidirectional)." }
  ] },

  interview: { title: "Interview", sub: "Architecture variants", questions: [
    { level: "Core", q: "When would you use a bidirectional RNN?",
      strong: "Whenever the whole sequence is available before any output is needed — never for generation or streaming.",
      answer: [{ t: "p", text: "Whenever the entire input exists before you need to produce anything: named entity recognition, part-of-speech tagging, sentence classification. In those tasks the words after a position frequently disambiguate it — 'the bank of the river' versus 'the bank of England' — and a forward-only model simply has no access to that evidence at the moment it needs it. The hard exclusions are language modelling, text generation and any real-time or streaming task. For generation it is leakage: each position's representation has already read the token you are asking it to predict, so training perplexity looks wonderful and the model generates nonsense. For streaming it is structural: the backward pass cannot begin until the sequence ends, so no output can be emitted early. I have verified the causality directly — perturbing the last input changes the unidirectional output at position zero by exactly zero, and the bidirectional one by about 1e-02." }] },
    { level: "Senior", q: "How deep should a stacked RNN be, and where does dropout go?",
      strong: "2–4 layers for NLP, more for speech; dropout between layers, never on recurrent connections.",
      answer: [{ t: "p", text: "Two to four layers for most NLP work, with clearly diminishing returns past three; speech recognition benefits from more, four to eight, because the sequences are longer and more hierarchically structured. With bidirectionality I would stay at two or three bidirectional layers, since that is already four to six directional passes. Dropout goes between layers, which is what PyTorch's `dropout` argument does — applying it to recurrent connections with a fresh mask each timestep injects noise directly into the memory path and disrupts the temporal dependencies you are trying to learn. If you want recurrent dropout the right technique is variational dropout, where the same mask is reused across timesteps, and that is not what the argument provides. One practical trap: with `num_layers=1` the argument does nothing at all and PyTorch only warns, so people think they have regularisation when they do not." }] },
    { level: "Senior", q: "A colleague's bidirectional classifier underperforms slightly. What would you check first?",
      strong: "How they extract the sequence summary — `output[:, -1, :]` is the classic bug.",
      answer: [{ t: "p", text: "How they are pooling the sequence into a single vector. The natural-looking `output[:, -1, :]` is wrong for a bidirectional model: it takes the forward pass's genuine final state and pairs it with the backward pass's state at the last timestep, which has seen exactly one token. So half the representation carries almost no information and you effectively have a unidirectional model with dead weight attached. The correct summary is `torch.cat([h_n[-2], h_n[-1]], dim=1)`, or equivalently the forward half at the last position with the backward half at position zero. What makes this worth checking first is that it degrades results by a few points rather than breaking anything — the model trains, the loss falls, nothing errors — so it passes review and sits there. After that I would check whether mean or max pooling over all positions works better than using endpoints at all, which for classification it often does." }] }
  ] }
});

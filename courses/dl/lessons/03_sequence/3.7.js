/* ============================================================================
   LESSON 3.7 — Sequence-to-Sequence and Teacher Forcing
   Mirrors 03_Sequence_Models.md · §8. The teacher-forcing / free-running
   input divergence is executed in scratchpad/dl/d37.py.
   ========================================================================= */
EC.receiveLesson({
  id: "3.7",

  lede: "**Seq2seq is the architecture that made neural machine translation work, and its central flaw is visible in one diagram.** An encoder reads the whole input into a single vector; a decoder writes the whole output from that vector. Everything the source said has to fit in one fixed-size summary — the bottleneck from lesson 3.1, now load-bearing. Training introduces a second problem: the decoder is fed correct inputs it will never see at inference.",

  objectives: [
    "Describe the encoder-decoder structure and where the context vector sits",
    "Explain why performance degrades beyond 20–30 tokens",
    "Contrast teacher forcing with free running and name the resulting bias",
    "Apply scheduled sampling and state its trade-off"
  ],

  prerequisites: ["3.6"],

  blocks: [

    { t: "h2", n: "01", text: "Encoder and decoder", id: "architecture" },

    { t: "diagram", kind: "flow", title: "One vector between two networks",
      caption: "Everything the decoder ever learns about the source passes through c. The intermediate encoder states are discarded.",
      cols: 3,
      nodes: [
        { id: "x", label: "x₁ x₂ x₃ x₄", sub: "source tokens", tone: "accent" },
        { id: "e", label: "Encoder RNN", sub: "h₁ → h₂ → h₃ → h₄", tone: "teal" },
        { id: "c", label: "context c = h₄", sub: "fixed size", tone: "crit" },
        { id: "d", label: "Decoder RNN", sub: "s₁ → s₂ → s₃", tone: "violet" },
        { id: "y", label: "ŷ₁ ŷ₂ ŷ₃ [EOS]", sub: "target tokens", tone: "good" }
      ],
      edges: [["x", "e"], ["e", "c"], ["c", "d"], ["d", "y"]] },

    { t: "p", text: "The decoder is a conditional language model: it generates one token at a time, each conditioned on the context vector and everything generated so far, stopping when it emits `[EOS]`. Because the two networks are separate, input and output lengths are independent — which is what makes translation and summarisation possible at all." },

    { t: "h2", n: "02", text: "The bottleneck", id: "bottleneck" },

    { t: "out", text: `  source of   5 tokens -> context vector of 256 floats (5 states collapsed into 1)
  source of  30 tokens -> context vector of 256 floats (30 states collapsed into 1)
  source of 100 tokens -> context vector of 256 floats (100 states collapsed into 1)
  the decoder sees ONLY the final encoder state; everything else is discarded` },

    { t: "callout", kind: "crit", title: "One vector, no matter how long the input",
      body: [{ t: "p", text: "The encoder computes a hidden state at every position and then throws all but the last one away. For five tokens that is a reasonable summary; for a hundred, one 256-dimensional vector must hold every name, number, clause and relationship in the source, and it was written incrementally by a network that had no idea what would be asked of it later. Empirically the quality falls off beyond about 20–30 tokens, and — the detail that makes it obviously a bottleneck rather than a capacity problem — **reversing the source sentence improved translation quality**, because it shortened the distance between the first source words and the first target words. A fix that depends on word order is a fix to a plumbing problem, and attention is the real one." }] },

    { t: "h2", n: "03", text: "Teacher forcing", id: "teacher-forcing" },

    { t: "p", text: "At training time the decoder needs an input at each step. Two options: feed its own previous prediction, or feed the ground truth. Here is what each actually supplies, with an untrained decoder:" },

    { t: "out", text: `  target sequence                  : [3, 5, 7, 2, 9, 4]
  teacher forcing feeds the decoder: [0, 3, 5, 7, 2, 9]   (always correct)
  free running feeds the decoder   : [0, 1, 1, 1, 1, 1]   (its own, untrained, guesses)` },

    { t: "p", text: "Free running on an untrained model produces the same token repeatedly, and every subsequent step is conditioned on that garbage — so the gradient signal is about recovering from its own noise rather than about the task. Teacher forcing removes that, which is why it converges far faster and more stably. It also makes the decoder's steps independent of each other during training, so they can be computed in parallel." },

    { t: "diagram", kind: "compare", title: "Training against inference",
      caption: "The mismatch is the point: the decoder is trained in a world it never encounters at test time.",
      columns: [
        { title: "Training — teacher forcing", tone: "good", items: [
          "Decoder input at step t is the true token y₍t−1₎",
          "Every step sees a correct prefix",
          "Fast, stable convergence",
          "Steps are parallelisable"
        ] },
        { title: "Inference — free running", tone: "warn", items: [
          "Decoder input at step t is its own prediction ŷ₍t−1₎",
          "One mistake changes every subsequent input",
          "No ground truth exists",
          "Strictly sequential"
        ] }
      ] },

    { t: "callout", kind: "trap", title: "Exposure bias",
      body: [{ t: "p", text: "The model has only ever conditioned on correct prefixes, so it has never learned what to do after its own mistake. At inference a single early error puts it in a state it has no training for, and errors compound — the characteristic symptom is output that starts well and degenerates, sometimes into repetition loops. The gap between a good validation loss (computed with teacher forcing) and disappointing generated output is this bias, and it is why you should always evaluate generation by *generating*, not by measuring teacher-forced loss." }] },

    { t: "h2", n: "04", text: "Scheduled sampling", id: "scheduled" },

    { t: "code", lang: "python", title: "Mixing the two",
      code: `for t in range(max_len):
    logits, h = decoder.step(inp, h)
    outputs.append(logits)
    use_truth = random.random() < teacher_forcing_ratio
    inp = target[:, t] if use_truth else logits.argmax(1)

# teacher_forcing_ratio decays over training: 1.0 -> 0.0`,
      caption: "Start fully teacher-forced so the model learns the task, then hand over to its own predictions so it learns to recover from them." },

    { t: "callout", kind: "tradeoff", title: "Scheduled sampling is not free",
      body: [{ t: "p", text: "It reduces exposure bias, and it also makes the objective inconsistent — the model is trained on a distribution of prefixes that changes as the schedule advances, which can destabilise training and, as later analysis showed, does not correspond to maximising the likelihood of the true sequence. It often helps in practice; it is not a clean fix. The modern alternatives are to accept teacher forcing and improve the *decoding* instead (beam search, which is lesson 3.9), or to fine-tune with a sequence-level objective that scores whole generated outputs." }] },

    { t: "exercise", kind: "practice", title: "Build seq2seq and measure exposure bias", difficulty: "advanced", minutes: 45,
      prompt: "Build an encoder-decoder for a toy task — reversing a sequence, or copying it. Train with full teacher forcing and evaluate two ways: teacher-forced loss, and true free-running generation accuracy. Compare the two at source lengths 5, 10, 20 and 40. Then add scheduled sampling with a linear decay and see whether the gap narrows. Finally, log where in the output the first error occurs during free running and what happens after it.",
      hints: [
        "Evaluate generation by actually generating — feed the model's own argmax back in.",
        "Plot both metrics against sequence length on the same axes.",
        "For the error analysis, record the position of the first mismatch and the edit distance of the remainder."
      ],
      solution: {
        notes: [
          { t: "p", text: "The two evaluation curves should diverge sharply with length. Teacher-forced loss degrades gently because every step gets a correct prefix regardless; free-running accuracy falls off a cliff, because the probability of getting *every* step right is the product of per-step probabilities and that product collapses. This is why a teacher-forced validation loss is close to useless as a proxy for generation quality — it is measuring a task the model will never perform." },
          { t: "p", text: "The error-position analysis makes compounding concrete. You will typically see output that is correct up to some position and then degrades rapidly rather than making isolated independent mistakes, because after the first error the decoder is conditioning on a prefix unlike anything in training. Repetition loops are the common failure mode, and they arise for exactly this reason." },
          { t: "p", text: "Scheduled sampling should narrow the gap but may also make training noisier, and it is worth noticing that the training loss gets *worse* as the schedule advances — the task genuinely is harder when the model must condition on its own errors. That is not a bug. It is the point, and it is also why the technique is theoretically awkward: the objective changes shape during training rather than staying fixed." }
        ]
      } }

  ],

  takeaways: [
    "Seq2seq: an encoder compresses the source to one context vector, a decoder generates from it.",
    "Separate networks mean input and output lengths are independent.",
    "All encoder states but the last are discarded, so quality falls beyond roughly 20–30 tokens.",
    "That reversing the source improved translation is direct evidence the problem is a bottleneck.",
    "Teacher forcing feeds the true previous token during training; free running feeds the model's own prediction.",
    "An untrained decoder free-running emits the same token repeatedly — hence teacher forcing's stability.",
    "Exposure bias: the model never learns to recover from its own mistakes, so errors compound at inference."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What is the fundamental limitation of basic seq2seq?",
      options: ["It cannot handle different input and output lengths", "The entire source must be compressed into a single fixed-size context vector", "It is too slow to train", "It requires teacher forcing"],
      answer: 1,
      why: "The encoder computes a state at every position and discards all but the last, so one vector must carry a hundred tokens' worth of content as easily as five. Quality degrades beyond about 20–30 tokens, and the fact that *reversing the source sentence* improved results is direct evidence that this is a plumbing problem rather than a capacity one." },
    { stem: "What is exposure bias?",
      options: ["Overfitting to the training set", "The model is trained on correct prefixes but must condition on its own predictions at inference", "Bias from imbalanced classes", "Gradient explosion in the decoder"],
      answer: 1,
      why: "Teacher forcing means the decoder only ever sees correct prefixes during training, so it has no experience of recovering from its own mistakes. At inference one early error puts it in an unfamiliar state and errors compound — output that starts well and degenerates, often into repetition." },
    { stem: "Why is teacher-forced validation loss a poor proxy for generation quality?",
      options: ["It is computed on the wrong data", "It measures a task the model never performs at inference — every step gets a correct prefix", "It uses a different loss function", "It ignores the EOS token"],
      answer: 1,
      why: "Teacher-forced loss degrades gently with length because each step is scored given a correct prefix regardless of earlier errors. Free-running accuracy collapses, since getting the whole sequence right requires every step to be right. Evaluate generation by generating." },
    { stem: "What does scheduled sampling do, and what is its drawback?",
      options: ["Samples training data adaptively; slower training", "Gradually replaces ground-truth decoder inputs with the model's own predictions; the objective becomes inconsistent", "Schedules the learning rate; needs tuning", "Samples from the output distribution; adds randomness"],
      answer: 1,
      why: "It starts fully teacher-forced and hands over to the model's own predictions as training proceeds, so the model learns to recover from its errors. The cost is that the training distribution shifts during training and the objective no longer corresponds to maximising the true sequence's likelihood — it often helps empirically but is not a clean fix." }
  ] },

  interview: { title: "Interview", sub: "Seq2seq questions", questions: [
    { level: "Core", q: "Explain the seq2seq architecture and its main weakness.",
      strong: "Encoder compresses to a context vector, decoder generates from it; the fixed-size vector is a bottleneck.",
      answer: [{ t: "p", text: "An encoder RNN reads the source and its final hidden state becomes a context vector; a decoder RNN is initialised from that vector and generates the output one token at a time until it emits an end-of-sequence marker. Because they are separate networks the lengths are independent, which is what makes translation possible. The weakness is that the context vector is fixed-size regardless of input length — the encoder computes a state at every position and discards all but the last. For a hundred-token source, one vector has to hold every name, number and relationship. Quality falls off beyond about twenty or thirty tokens. The telling piece of evidence is that people found reversing the source sentence improved translation, which only makes sense if the problem is distance between related positions rather than capacity — and that is what attention fixes properly." }] },
    { level: "Senior", q: "How would you reduce exposure bias in a generation model?",
      strong: "Better decoding first (beam search), then scheduled sampling or a sequence-level objective — each with costs.",
      answer: [{ t: "p", text: "I would start with decoding rather than training, because beam search addresses a large part of the practical damage: greedy decoding commits to a locally best token that can doom the rest of the sequence, and keeping several hypotheses alive recovers from that without touching the model. Scheduled sampling is the direct attack — gradually replace ground-truth decoder inputs with the model's own predictions so it learns to recover from its errors — but it makes the training objective inconsistent, since the distribution of prefixes shifts as the schedule advances and no longer corresponds to maximising the true sequence's likelihood. It often helps empirically and it is not a clean fix. The more principled option is fine-tuning with a sequence-level objective that scores whole generated outputs, via minimum risk training or a reinforcement-learning formulation, which optimises the thing you actually care about at the cost of a much noisier gradient. Whatever I chose, I would insist on evaluating by generating, since teacher-forced validation loss cannot see this problem at all." }] },
    { level: "Senior", q: "What is teacher forcing and would you use it?",
      strong: "Feeding ground-truth decoder inputs during training. Yes — but evaluate by generating, not by teacher-forced loss.",
      answer: [{ t: "p", text: "During training the decoder needs an input at each step, and teacher forcing supplies the true previous token rather than the model's own prediction. It converges far faster: an untrained decoder free-running just emits the same token over and over, so every subsequent step is conditioned on garbage and the gradient is about recovering from its own noise rather than about the task. It also makes decoder steps independent, so they parallelise. I would use it, with one discipline attached: always evaluate generation by actually generating. Teacher-forced validation loss degrades gently with length because every step gets a correct prefix, while free-running accuracy collapses — so the metric that looks fine is measuring a task the model will never perform. The residual problem is exposure bias, and I would address it with better decoding, beam search in particular, before reaching for scheduled sampling, which reduces the bias but makes the training objective inconsistent." }] }
  ] }
});

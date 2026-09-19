/* ============================================================================
   LESSON 4.1 — Sequential Data and the Vanilla RNN
   ========================================================================= */
EC.receiveLesson({
  id: "4.1",

  lede: "**A recurrent network applies one small set of weights at every position of a sequence and carries a state between positions — the same sharing convolution does across space, done across time, with memory added.** An MLP trained on 9-bit strings cannot even accept a 15-bit string; an RNN with 338 parameters trained on 9 bits scores 0.989 on 15, 0.970 on 21 and 0.859 on 41. This lesson writes the recurrence, counts its parameters, implements it in NumPy with backpropagation through time checked to 5 × 10⁻¹¹, trains it to generate text, and settles two practical questions — stateful or stateless, learned or zero initial state — by measurement. It also shows a task the vanilla RNN fails at (parity, 0.48), which is where lessons 4.2 to 4.4 begin.",

  objectives: [
    "Explain why sequences need a model with shared weights and a state, and show an MLP's limits and an RNN's length generalisation",
    "Write the RNN equations, count the parameters and confirm them against nn.RNN",
    "Implement an RNN and its backward pass through time in NumPy, gradient-check it, and train a character model",
    "Classify tasks as one-to-one, many-to-one, one-to-many and many-to-many, and read nn.RNN's output shapes",
    "Decide between stateful and stateless training and between zero and learned initial states from measurements"
  ],

  prerequisites: ["2.2", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "Why not an MLP", id: "why" },

    { t: "p", text: "A sequence has two properties an MLP cannot handle: its length varies, and the same pattern means the same thing wherever it occurs. An MLP has a fixed input size and a separate weight for every position. A recurrent network processes one element at a time with the *same* weights and keeps a hidden state that summarises what it has seen — so any length is an input and a pattern learned at position 3 is recognised at position 30:" },

    { t: "code", lang: "text", title: "Majority vote of a bit string — trained on length 9, tested on lengths never seen (executed)",
      code: `4,000 training strings of 9 bits, 40 epochs, question: are there more 1s than 0s?

length  9 (trained)    MLP 1.000    RNN 1.000
length 15 (unseen)     MLP cannot take the input (fixed 9 inputs)    RNN 0.989
length 21 (unseen)                                                   RNN 0.970
length 41 (unseen)                                                   RNN 0.859
parameters:  MLP 4,930    RNN 338   -- the RNN's are shared across every time step

parity of an 8-bit string (the state must flip on every 1), 60 epochs:   MLP 1.000   tanh RNN 0.482   GRU 0.518`,
      caption: "The RNN learned a counter — accumulate the evidence, decide at the end — and the counter runs for as long as the input does, degrading slowly as the sequence outgrows what it was trained on. Parity is the honest counter-example: an 8-input MLP memorises all 256 cases, while the recurrent networks failed to discover the flip-flop in sixty epochs. Recurrences that must react sharply to every input are hard to find by gradient descent, which is the subject of 4.2 and 4.3." },

    { t: "h2", n: "02", text: "The recurrence and its parameters", id: "equations" },

    { t: "code", lang: "text", title: "The vanilla RNN",
      code: `h_t = tanh(W_xh x_t + W_hh h_{t−1} + b)          state update: the new state from the input and the old state
y_t = W_hy h_t + c                               read-out, at every step or only the last

nn.RNN(input 1, hidden 16):  W_xh 16×1 + W_hh 16×16 + b_ih + b_hh = 304 parameters   torch: 304
  -- independent of sequence length: the same 304 numbers are used at step 1 and step 1,000`,
      caption: "W_hh is the memory: it decides how much of the previous state survives and how it is transformed. tanh keeps the state bounded in (−1, 1) so that a hundred applications of the recurrence do not explode — but its saturation is also the vanishing-gradient mechanism (1.2), which 4.2 measures through time." },

    { t: "dl", items: [
      ["One-to-one", "An output at every step from that step's state: part-of-speech tagging, per-frame labelling. Output shape (batch, T, out)."],
      ["Many-to-one", "One output from the final state h_T (or a pool over states): sentiment, sequence classification, the majority task above."],
      ["One-to-many", "One input seeds the state, then the network unrolls producing outputs that feed back as inputs: image captioning, generation from a prompt."],
      ["Many-to-many (encoder–decoder)", "Read the whole input into a state, then generate the output from it: translation, summarisation (4.6). Lengths may differ."],
      ["nn.RNN's shapes", "Input (batch, T, features) with batch_first=True; output (batch, T, hidden) is every step's state; h_n (layers × directions, batch, hidden) is the final state. For (4, 10, 3) with hidden 8: output (4, 10, 8), h_n (1, 4, 8)."]
    ] },

    { t: "h2", n: "03", text: "An RNN in NumPy, with backpropagation through time", id: "numpy" },

    { t: "code", lang: "python", title: "Forward and backward over a sequence (character-level, one-hot input)",
      code: `def forward(self, ids, h0=None):
    h = zeros(H) if h0 is None else h0; hs, logits = [], []
    for t in ids:
        x = onehot(t); h = tanh(Wxh @ x + Whh @ h + b); hs.append(h); logits.append(Why @ h + c)
    return hs, logits

def backward(...):                                    # the loss is the mean cross-entropy over the T steps
    dh_next = zeros(H)
    for t in reversed(range(T)):
        dlog = probs[t]; dlog[target[t]] -= 1          # p − onehot at step t
        dWhy += outer(dlog, hs[t]); dc += dlog
        dh = Why.T @ dlog + dh_next                    # gradient into h_t: from this step's output AND from step t+1
        dz = dh * (1 − hs[t]²)                         # through tanh
        dWxh += outer(dz, x_t); dWhh += outer(dz, hs[t−1]); db += dz
        dh_next = Whh.T @ dz                           # sent back to step t−1

gradient check of the hand-written BPTT (sampled parameters, 10 steps): worst |analytic − numeric| = 4.9e-11`,
      caption: "Backpropagation through time is ordinary backpropagation on the unrolled network, with one twist: the state h_t receives gradient from two places — its own output at step t and the next state at step t + 1 — and the weight gradients are *summed* over steps because the same W is used at each. The line dh_next = Whhᵀ dz is the product of Jacobians that 4.2 is about." },

    { t: "code", lang: "text", title: "Training the character model on 'hello world ' repeated (executed)",
      code: `vocabulary 8 characters, 48 characters of text, hidden 32, Adagrad, chunks of 12 with the state carried across chunks
  epoch  1: loss per char 2.032     (ln 8 = 2.08: chance)
  epoch  5: loss per char 0.088
  epoch 20: loss per char 0.011
  epoch 60: loss per char 0.003
greedy sample from 'h':  'hello world hello world hello w'      (0.4 s)
hidden state at t = 0, 1, 2 (first 5 of 32 units):  [0.54, 0.67, −0.04, −0.69, −0.25]  [0.93, −0.05, 0.15, −0.91, −0.93]  [0.44, −0.83, −0.98, −0.97, 0.86]`,
      caption: "The network learns the text as a dynamical system: feed it 'h' and its own predictions, and the state cycles through the 12-character period. This is Karpathy's min-char-rnn in a hundred lines; on a real corpus the same code produces the famous half-plausible Shakespeare. The hidden states are the network's memory of position within the phrase." },

    { t: "h2", n: "04", text: "Stateful or stateless; zero or learned initial state", id: "state" },

    { t: "code", lang: "text", title: "Two practical questions, measured (executed)",
      code: `stateful vs stateless on a continuous stream (the character text), chunks of 12, 30 epochs:
  stateful (carry h across chunks)     final loss per char 0.007
  stateless (reset h each chunk)       final loss per char 0.008

initial state on the majority task, 3 seeds, 20 epochs:
  zero h0       1.000 ± 0.000
  learned h0    1.000 ± 0.000`,
      caption: "Stateful training carries the hidden state from one chunk to the next so the network can use context older than the chunk — right for a continuous stream (a long text, a sensor feed), wrong for independent sequences (separate sentences), where the state must be reset. The difference here is small because the period fits in a chunk. A learned initial state is a free parameter that occasionally helps on short sequences; on this task it made no difference, and zero is the default." },

    { t: "callout", kind: "info", title: "The detach rule for stateful training",
      body: "When the state is carried across chunks, detach it: h = h.detach(). Otherwise the autograd graph grows across every chunk since the start of the stream — backward gets slower at every step and eventually you either run out of memory or hit 'trying to backward through the graph a second time'. Lesson 4.2 reproduces both symptoms. Truncated BPTT is exactly this: full state forward, gradient only within the chunk."
    },

    { t: "table", head: ["Sequence model", "Sharing", "State", "Receptive field", "Parallel over time?"],
      rows: [
        ["MLP on a fixed window", "None", "None", "The window", "Yes"],
        ["1-D convolution / TCN (4.4)", "Across positions", "None", "Kernel × depth (dilation grows it)", "Yes"],
        ["Vanilla RNN", "Across steps", "h_t, bounded by tanh", "Unbounded in principle; short in practice (4.2)", "No"],
        ["LSTM / GRU (4.3, 4.4)", "Across steps", "Gated state", "Long", "No"],
        ["Transformer (module 5)", "Across positions", "None (attention sees everything)", "The whole sequence", "Yes"]
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "An RNN with 338 parameters trained on 9-bit strings scored 0.989 on 15-bit strings. What property of the model makes that possible, and why does accuracy still fall by length 41?",
          options: [
            "It memorised longer strings during training",
            "The same weights are applied at every step with a carried state, so any length is a valid input and the learned counter keeps running; but the state was only ever trained to represent counts up to 9, so as the count grows beyond that range the tanh-bounded state saturates and the decision degrades (0.859 at 41)",
            "The bias term scales with length",
            "The test strings were easier"
          ],
          answer: 1,
          why: "Weight sharing gives length generalisation in principle; the state's finite range and the training distribution limit it in practice. The fall-off is graceful, which is what distinguishes a learned counter from a memorised lookup."
        },
        {
          stem: "In backpropagation through time, why does the gradient for W_hh involve a sum over time steps?",
          options: [
            "Because W_hh is larger than W_xh",
            "Because the same W_hh is used at every step, so the loss depends on it through every step's state; the chain rule sums the contributions dz_t ⊗ h_{t−1} over t, and the check at 5 × 10⁻¹¹ confirms the sum is the whole gradient",
            "Because the loss is a mean over steps",
            "It does not; only the last step contributes"
          ],
          answer: 1,
          why: "Shared parameters accumulate gradient from every place they are used — the same rule as a convolution kernel summing over positions (3.2). Here the 'positions' are time steps, and the recurrence adds the second channel of gradient, dh_next, through which later steps reach earlier ones."
        },
        {
          stem: "When should the hidden state be carried across batches (stateful training)?",
          options: [
            "Always; it uses more context",
            "When consecutive batches are consecutive pieces of one continuous stream, so that context older than the chunk is real; for independent sequences the state must be reset, and in either case the carried state must be detached so the graph does not grow across chunks",
            "Only for bidirectional networks",
            "Never; it causes exploding gradients"
          ],
          answer: 1,
          why: "Statefulness is a statement about the data, not a training trick. Carrying state between unrelated sentences feeds the second sentence a memory of the first; resetting on a continuous signal throws away context. The detach is what makes the carried state safe."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "The RNN in NumPy: forward, BPTT, gradient check, generation",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Implement a character-level RNN in NumPy — one-hot input, tanh recurrence, softmax output — with forward returning all hidden states and logits, and a backward implementing BPTT over a chunk. Gradient-check it in float64 on ten steps." },
        { t: "p", text: "**(b)** Train it on 'hello world ' repeated four times with Adagrad (lr 0.1) in chunks of 12, carrying the state across chunks, for 60 epochs; report the loss per character at epochs 1, 5, 20, 60 and a greedy sample of 30 characters from 'h'." },
        { t: "p", text: "**(c)** Train the majority-vote classifier (nn.RNN, hidden 16) on 9-bit strings and evaluate it on lengths 9, 15, 21 and 41. Then train the same network on 8-bit parity and report what happens." }
      ],
      requirements: [
        "(a) the worst gradient discrepancy.",
        "(b) four losses and the sample.",
        "(c) four accuracies and the parity result."
      ],
      hint: "(a) In backward, keep dh_next = Whhᵀ dz from step t + 1 and add it to the output gradient at step t; the weight gradients accumulate over t. (b) Adagrad: divide the update by the root of the running sum of squared gradients. (c) Take the final hidden state h_n[0] into a linear layer.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) gradient check of the hand-written BPTT (sampled parameters, 10 steps): worst |analytic − numeric| = 4.9e-11

# (b) epoch 1: 2.032   epoch 5: 0.088   epoch 20: 0.011   epoch 60: 0.003  (loss per character)
#     greedy sample from 'h': 'hello world hello world hello w'

# (c) majority, trained on length 9:  length 9 1.000   15 0.989   21 0.970   41 0.859
#     parity, 8 bits, 60 epochs:  tanh RNN 0.482 (chance);  a GRU 0.518;  an 8-input MLP 1.000 (it memorises the 256 cases)`,
        notes: [
          { t: "p", text: "(a) is the lesson's derivation as code; the two gradient channels into h_t are the whole of BPTT." },
          { t: "p", text: "(b) reproduces min-char-rnn; the sample is the learned dynamical system run on its own output." },
          { t: "p", text: "(c) is the pair of results to remember: length generalisation from weight sharing, and a recurrence gradient descent could not find — the problem the gated cells address." }
        ]
      }
    }
  ],

  takeaways: [
    "Sequences need shared weights and a carried state: an MLP has a fixed input and a weight per position; an RNN applies W_xh, W_hh, b at every step and summarises the past in h_t. Trained on 9-bit strings it scored 0.989 on 15, 0.970 on 21, 0.859 on 41 — lengths an MLP cannot accept.",
    "h_t = tanh(W_xh x_t + W_hh h_{t−1} + b): 304 parameters for input 1 and hidden 16, whatever the length. The tanh bounds the state and is also the vanishing-gradient mechanism.",
    "BPTT is backpropagation on the unrolled network: each h_t receives gradient from its output and from h_{t+1} (dh_next = W_hhᵀ dz), and the shared weights' gradients sum over steps; checked at 4.9 × 10⁻¹¹.",
    "A 32-unit character RNN trained on 'hello world ' reached loss 0.003 per character and regenerates the text from 'h'; its hidden state encodes position within the phrase.",
    "Stateful training carries h across chunks of a continuous stream (0.007 vs 0.008 here) and must detach it; independent sequences reset the state. A learned initial state made no difference to a zero one.",
    "Parity — a recurrence that must flip on every input — was not found by a tanh RNN or a GRU in 60 epochs (0.48, 0.52 against an MLP's 1.000): sharp long-range recurrences are hard for gradient descent, which is what 4.2–4.4 measure and fix."
  ],

  quiz: {
    title: "Sequential Data and the Vanilla RNN — Knowledge Check",
    questions: [
      {
        stem: "What is the hidden state of an RNN?",
        options: [
          "The output at the last time step",
          "A fixed-size vector, updated at every step from the input and its previous value, that summarises the sequence so far; it is the network's memory, bounded by the tanh, and everything the network knows about earlier inputs must be encoded in it",
          "The weight matrix W_hh",
          "A cache of all previous inputs"
        ],
        answer: 1,
        why: "The state's fixed size is the model's inductive bias and its limitation: the character model's states cycled through the phrase's period, and the majority counter saturated when counts grew beyond the training range."
      },
      {
        stem: "Which task type is 'generate a caption from an image'?",
        options: [
          "Many-to-one",
          "One-to-many: a single input (the image's encoding) seeds the state and the network unrolls, feeding each generated word back as the next input until an end token",
          "One-to-one",
          "Many-to-many with equal lengths"
        ],
        answer: 1,
        why: "The taxonomy is by the shape of inputs and outputs in time. Captioning is one input and a sequence out; translation is a sequence in and a different-length sequence out, which needs the encoder–decoder of 4.6."
      },
      {
        stem: "nn.RNN with batch_first=True receives (4, 10, 3) and has hidden size 8. What are the shapes of its two outputs and what does each contain?",
        options: [
          "(4, 8) and (4, 8): the last state twice",
          "output (4, 10, 8): the hidden state at every step for every sequence; h_n (1, 4, 8): the final state (layers × directions, batch, hidden) — for a single-layer unidirectional network h_n[0] equals output[:, −1]",
          "output (10, 4, 8) and h_n (4, 8)",
          "Both (4, 10, 8)"
        ],
        answer: 1,
        why: "Tagging reads the first; classification reads the second (or pools the first). With padding or bidirectionality the equality between h_n and output[:, −1] breaks, which 4.5 handles with packing."
      },
      {
        stem: "Why did the tanh RNN fail on 8-bit parity when it solved majority perfectly?",
        options: [
          "Parity needs more parameters",
          "Majority is a smooth accumulation the state can represent as a running sum; parity needs the state to flip sharply on every 1 and remember an exact binary value across all eight steps — a recurrence with a fixed point that gradient descent from a random tanh network does not find in sixty epochs",
          "The learning rate was too high",
          "Parity is not computable by an RNN"
        ],
        answer: 1,
        why: "An RNN can represent parity (two states, one flip rule); finding it by gradient descent is the problem. Gated cells and careful initialisation make such recurrences learnable, and the vanishing gradient through time (4.2) is the reason the plain cell struggles."
      },
      {
        stem: "A stateful training loop keeps getting slower every batch and eventually raises 'trying to backward through the graph a second time'. What is wrong?",
        options: [
          "The learning rate is too high",
          "The carried hidden state was not detached, so each batch's graph is attached to every previous batch's; backward walks a graph that grows without bound, and once a portion has been freed a second backward through it fails — h = h.detach() between batches fixes both",
          "The sequence is too long for an RNN",
          "The optimiser needs zero_grad"
        ],
        answer: 1,
        why: "Truncated BPTT in one line. The state value is passed forward (so context is kept) while the gradient path is cut (so the graph is bounded to the chunk). Lesson 4.2 reproduces the growing backward time."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Sequential Data and the Vanilla RNN",
    sub: "Why recurrence, the equations and parameters, BPTT, the task types, and the practical state questions.",
    questions: [
      {
        level: "Core",
        q: "What is a recurrent neural network and why use one instead of an MLP for sequences?",
        strong: "An RNN processes a sequence one element at a time with the same weights at every step and carries a hidden state: h_t = tanh(W_xh x_t + W_hh h_{t−1} + b), with a read-out y_t = W_hy h_t + c at every step or at the end. Two things follow from the sharing. Any length is a valid input, because the parameter count — 304 for input 1 and hidden 16 — does not depend on the sequence length; an MLP has a fixed input width and a separate weight per position. And a pattern learned at one position is recognised at any position, like a convolution kernel across space. I measured the first property: a 338-parameter RNN trained to detect the majority bit in 9-bit strings scored 0.989 on 15-bit strings, 0.970 on 21 and 0.859 on 41, inputs the MLP could not accept at all. The cost is that the state is a fixed-size bottleneck through which everything about the past must pass, that computation is sequential so it cannot be parallelised over time, and that some recurrences are hard to learn — the same network failed on 8-bit parity, which needs the state to flip exactly on every 1.",
        answer: [
          { t: "p", text: "The equations, the two consequences of sharing with the executed generalisation numbers, and the three costs including the parity failure." }
        ]
      },
      {
        level: "Core",
        q: "Explain backpropagation through time.",
        strong: "Unroll the recurrence over the T steps of a chunk: the unrolled network is a deep feed-forward network in which the same weights appear at every layer, and BPTT is ordinary backpropagation on it. Two features distinguish it. First, each hidden state h_t receives gradient from two sources — the loss at step t through the read-out, and the next state h_{t+1} through the recurrence — so the backward loop runs from t = T down to 1, at each step adding Whyᵀ dlog_t to the dh_next carried from t + 1, passing the sum through the tanh derivative (1 − h_t²), and sending Whhᵀ dz_t back as the new dh_next. Second, because the weights are shared, their gradients are summed over steps: dWhh += dz_t ⊗ h_{t−1} for every t. I implemented it in NumPy for a character model and checked it against finite differences at 4.9 × 10⁻¹¹. That product Whhᵀ diag(1 − h²) applied at every step backward is the term whose repeated multiplication vanishes or explodes — 4.2 measures it — and truncated BPTT is the practical version: carry the state forward across chunks but detach it, so the gradient runs only within a chunk.",
        answer: [
          { t: "p", text: "The unrolling, the two gradient channels and the summed weight gradients, the executed check, the Jacobian product, and truncation." }
        ]
      },
      {
        level: "Core",
        q: "What is the difference between stateful and stateless RNN training, and when does each apply?",
        strong: "Stateful training carries the final hidden state of one batch in as the initial state of the next; stateless resets it to zero (or a learned vector) at every batch. It is a statement about the data: if consecutive batches are consecutive chunks of one continuous stream — a long text, a sensor log, a market series — the carried state is genuine context older than the chunk, and on a character model I measured 0.007 against 0.008 loss per character, a small gain because the phrase fitted in a chunk. If batches are independent sequences — separate sentences, separate customers — carrying state feeds each one a memory of an unrelated predecessor and must be reset. Two rules travel with stateful training: the batch's sequences must line up across batches (sequence i in batch k continues sequence i in batch k − 1), and the state must be detached between batches, or the autograd graph grows without bound and backward slows down every step before failing. A learned initial state, tried on the majority task, made no difference to zeros.",
        answer: [
          { t: "p", text: "The distinction as a data question, the executed comparison, the two rules of stateful training, and the initial-state result." }
        ]
      }
    ]
  }
});

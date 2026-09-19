/* ============================================================================
   LESSON 4.2 — Backpropagation Through Time
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "**The gradient that reaches the first step of a sequence is the last step's gradient multiplied by one Jacobian per step, and thirty multiplications by a matrix of spectral radius 0.5 leave 10⁻¹⁵ of it.** That is the whole of the vanishing-gradient problem in recurrent networks, and it is measured here at four scales of the recurrent weights: radius 0.52 gives a ratio of 1.7 × 10⁻¹⁵ between step 0 and step 29, radius 1.04 gives 10⁻⁷, radius 3.12 gives 56 the other way. On the adding problem a tanh RNN learns the task at length 10 (MSE 0.019), half-learns it at 20 (0.145) and does not learn it at 50 (0.169, the mean baseline). Truncated BPTT, clipping, the two classic bugs, and the failure modes of RNN training follow — and 4.3 is the fix.",

  objectives: [
    "Derive ∂L/∂h_t as a product of per-step Jacobians and bound its norm",
    "Measure the gradient through time at several spectral radii and on a real task before and after training",
    "Show the length at which a tanh RNN stops learning and read the gradient profile that explains it",
    "Apply truncated BPTT and read what truncation costs when the dependency exceeds the window",
    "Reproduce exploding gradients in training and the effect of clipping, and the two classic implementation bugs"
  ],

  prerequisites: ["4.1", "1.8"],

  blocks: [

    { t: "h2", n: "01", text: "The product of Jacobians", id: "product" },

    { t: "p", text: "For h_t = tanh(W_xh x_t + W_hh h_{t−1} + b), the Jacobian of one step is ∂h_t/∂h_{t−1} = diag(1 − h_t²) · W_hh. The gradient of a loss at step T with respect to the state at step t is the chain of them:" },

    { t: "code", lang: "text", title: "The derivation and its bound",
      code: `∂L/∂h_t = ∂L/∂h_T · ∂h_T/∂h_{T−1} · ∂h_{T−1}/∂h_{T−2} · … · ∂h_{t+1}/∂h_t
        = ∂L/∂h_T · Π_{k=t+1}^{T} diag(1 − h_k²) W_hh

‖∂h_k/∂h_{k−1}‖ ≤ ‖W_hh‖₂ · max|tanh′| = ‖W_hh‖₂ · 1        (for sigmoid: · 0.25)
‖∂L/∂h_t‖ ≤ ‖∂L/∂h_T‖ · ‖W_hh‖₂^(T−t)

measured on a random W_hh with ‖W_hh‖₂ = 1.81:  bound after 30 steps 5.2 × 10⁷  (with sigmoid units: 4.5 × 10⁻¹¹)`,
      caption: "A product of T − t matrices of the same size behaves like ρ^(T−t), where ρ is the spectral radius of W_hh (scaled by the activation derivatives, which are at most 1 for tanh and 0.25 for sigmoid). Below 1 the gradient vanishes exponentially in distance; above 1 it explodes; the tanh derivatives, which are below 1 whenever a unit is not at zero, push everything toward vanishing. The bound with the largest singular value is loose; the measurement is the truth:" },

    { t: "code", lang: "text", title: "‖∂L/∂h_t‖ for a loss at step 29, T = 30, tanh RNN of hidden size 32, random weights (executed)",
      code: `W_hh scale    spectral radius    ‖∂L/∂h_t‖ at t = 0        t = 10       t = 20       t = 29      ratio t=0 / t=29
0.5           0.52               3.0e-15                  6.7e-10      2.1e-04      1.7e+00     1.7e-15
1.0           1.04               3.8e-07                  5.7e-04      1.2e-01      3.4e+00     1.1e-07
1.5           1.56               2.5e-02                  4.3e-01      1.9e+00      5.3e+00     4.8e-03
3.0           3.12               3.7e+02                  2.5e+01      7.3e+00      6.7e+00     5.6e+01`,
      caption: "At radius 0.52 the first step receives 10⁻¹⁵ of the last step's gradient — nothing it does can affect the loss as far as gradient descent can tell. At radius 1.04, ten steps back is 10⁻⁴ of the signal. At radius 3.12 the gradient grows fifty-fold going backward; the tanh saturation is all that keeps it from growing 3¹⁰ = 59,000-fold. The window in which a vanilla RNN can learn dependencies is the distance over which this product stays near one, and with random weights that window is a handful of steps." },

    { t: "h2", n: "02", text: "On a real task: the adding problem", id: "adding" },

    { t: "p", text: "The adding problem (Hochreiter & Schmidhuber, 1997): a sequence of random numbers, two of them marked, and the target is their sum. The first mark falls in the first half of the sequence, so the network must carry one number across at least T/2 steps. Predicting the mean (1.0) gives MSE 0.167:" },

    { t: "code", lang: "text", title: "A tanh RNN (hidden 64), Adam 1e-3, 30 epochs, best test MSE (executed)",
      code: `T = 10    0.0193       learned
T = 20    0.1447       partly
T = 50    0.1691       not at all -- the mean baseline is 0.167

‖∂L/∂h_t‖ on the trained networks at t = 0, T/4, T/2, 3T/4, T−1:
  T = 20:   3.0e-03   4.2e-03   6.1e-03   1.0e-02   3.3e-02       -- an order of magnitude across the sequence
  T = 50:   1.7e-06   1.6e-05   1.8e-04   1.8e-03   3.2e-02       -- four orders: the first half of the sequence is invisible`,
      caption: "The gradient profile after training is the diagnosis. At T = 50 the states where the first number sits receive 10⁻⁴ to 10⁻⁶ of the loss gradient; the network cannot learn to store the number because nothing tells it that storing it would help. This is the experiment that motivated the LSTM, and 4.3 runs the same problem with one." },

    { t: "h2", n: "03", text: "Truncated BPTT", id: "tbptt" },

    { t: "p", text: "Backpropagating through thousands of steps is expensive in memory and pointless when the gradient has vanished anyway. Truncated BPTT runs the forward pass over the whole sequence but detaches the state every k steps, so each backward covers at most k steps — the state carries information forward, the gradient reaches only k steps back:" },

    { t: "code", lang: "python", title: "Truncation is one line (executed at T = 10)",
      code: `for t in range(T):
    if t % k == 0: h = h.detach()          # cut the graph: the value continues, the gradient stops here
    h = cell(x[:, t], h)

T = 10, the first marked number lies in steps 0–4, the loss is at step 9:
  k = full   0.0193
  k = 5      0.0263       -- the gradient still reaches steps 5–9 and, through the carried state, indirectly learns to keep the first number
  k = 3      0.1321       -- the first number is beyond the window: not learned
  k = 2      0.1073`,
      caption: "Truncation trades exactly what the table shows: cheaper backward passes (the k = 2 run was a third faster) for a hard limit on the dependencies that can be learned directly. Language models train with k of a few hundred tokens; the carried state lets them use longer context at inference than the gradient ever spanned, imperfectly." },

    { t: "h2", n: "04", text: "Exploding gradients and clipping", id: "exploding" },

    { t: "code", lang: "text", title: "A character RNN with recurrent weights at spectral radius ~2.5, SGD 0.5 with momentum, chunks of 40, 3 epochs (executed)",
      code: `no clipping     loss 3.53 -> 2.66   gradient norm max 1.2e+03, median 2.48   steps with norm > 10: 5 of 99    (no NaN, but stuck)
clip norm 1.0   loss 3.53 -> 0.00   gradient norm max 1.2e+03, median 0.28   steps with norm > 10: 10 of 99   -- memorises the text`,
      caption: "Five of ninety-nine steps had a gradient a thousand times the median; each unclipped one threw the weights somewhere useless and the run never converged. With clipping the same spikes are bounded and the model learns the text. Clipping does not remove the spikes — the clipped run had more of them, because it kept learning into sharper regions — it makes them survivable, which is why it is standard in every recurrent training recipe (and in transformer recipes, 5.2)." },

    { t: "dl", items: [
      ["Vanishing (the common case)", "Symptoms: the model learns short patterns and plateaus; the gradient profile falls across the sequence (10⁻⁶ at the start for T = 50). Fixes: gated cells (4.3, 4.4), orthogonal or identity initialisation of W_hh, shorter effective paths (attention, 4.6), or a different architecture (TCN, transformer)."],
      ["Exploding", "Symptoms: loss spikes, NaN, a gradient norm log with outliers three orders above the median. Fixes: clip by norm at 1–5, a smaller learning rate, a smaller initial W_hh scale. The tanh saturation limits explosion in the forward pass but not in the gradient."],
      ["Slow training", "One step at a time, no parallelism over T; the wall-clock cost grows linearly with length and the GPU sits idle on small batches. Fixes: cuDNN-fused kernels (nn.LSTM rather than a Python loop over cells), larger batches, truncation, or a parallel architecture."],
      ["Overfitting", "Recurrent networks memorise sequences readily; variational dropout (4.4), weight decay, and early stopping on validation perplexity."],
      ["Bad shapes and states", "The two bugs below, plus: padding fed as real steps (4.5), the wrong final state for a bidirectional or padded batch, and a stateful loop whose batches do not align."]
    ] },

    { t: "code", lang: "text", title: "The two classic bugs (executed)",
      code: `bug 1: stateful training without h = h.detach()
  backward time per step with retain_graph=True:  1.0  1.1  1.3  2.2  3.3  2.9 ms   -- the graph grows every step
  without retain_graph:  RuntimeError: Trying to backward through the graph a second time
  fix: detach the carried state between chunks (which is truncated BPTT)

bug 2: feeding (T, B, F) to an nn.RNN built with batch_first=True
  input transposed to (5, 8, 2): output (5, 8, 64) -- it runs, silently treating time as batch and batch as time`,
      caption: "The first bug shows up as a training loop that slows down, then crashes; the second as a model that trains and is wrong, since it processed eight 'sequences' of length five that were really five sequences of length eight. batch_first is the argument to check in every shape error, and an assert on x.shape[1] == expected_T is cheap." },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "At spectral radius 0.52 the first step received 10⁻¹⁵ of the last step's gradient, and at radius 3.12 it received 56 times more. Where is a vanilla RNN trainable?",
          options: [
            "At any radius, with a small enough learning rate",
            "Only where the product of Jacobians stays near one over the distances that matter — a narrow band around radius 1, narrowed further by the tanh derivatives below one — which with random weights is a window of a few steps; that is why the adding problem is learned at length 10 and not at 50",
            "Only above radius 1, where the gradient is large",
            "Only below radius 1, where training is stable"
          ],
          answer: 1,
          why: "Vanishing and exploding are the two sides of the same exponential; between them is the regime where information about distant steps reaches the weights with a usable magnitude. Gated cells widen that regime by making the product's factors close to one by construction."
        },
        {
          stem: "Truncated BPTT with k = 3 failed the adding problem at T = 10 (0.132) while k = 5 nearly matched full BPTT (0.026). Why?",
          options: [
            "k = 3 is too few parameters",
            "The first marked number lies in steps 0–4 and the loss is at step 9; with k = 5 the gradient from the loss reaches step 5 directly and the network can learn to keep the number in the carried state, but with k = 3 no gradient ever reaches the steps where the number appears, so nothing teaches the network to store it",
            "Detaching resets the hidden state to zero",
            "k must divide T"
          ],
          answer: 1,
          why: "The state carries the value forward at any k; the gradient carries the *reason* to keep it only k steps back. Dependencies longer than the window are learned indirectly or not at all — the trade every truncated recurrent training makes."
        },
        {
          stem: "Clipping at norm 1.0 turned a character RNN that plateaued at loss 2.66 into one that reached 0.00, yet the clipped run had more steps with gradient norm above 10. What does that show?",
          options: [
            "Clipping removes large gradients",
            "Clipping does not prevent gradient spikes — it bounds the update they cause; the clipped run kept learning into sharper regions (hence more spikes) while every spike stayed survivable, whereas the unclipped run's five thousand-fold spikes threw the weights somewhere it could not recover from",
            "The unclipped run needed a higher learning rate",
            "Clipping should be applied to the loss, not the gradient"
          ],
          answer: 1,
          why: "Lesson 1.8's point on a recurrent network: the spike count is a diagnostic of the landscape, the clip is insurance against it. The pre-clip norm log is what shows both."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "The gradient through time, measured three ways",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** Build a tanh RNN of hidden size 32 with random W_hh scaled to spectral radius roughly 0.5, 1, 1.5 and 3, run 30 steps on random input with a loss at the last step, and report ‖∂L/∂h_t‖ at t = 0, 10, 20, 29 and the ratio between t = 0 and t = 29." },
        { t: "p", text: "**(b)** Train a tanh RNN (hidden 64, Adam 1e-3, 30 epochs, clip 1.0) on the adding problem at T = 10, 20 and 50 and report the best test MSE; on the trained T = 20 and T = 50 networks, report ‖∂L/∂h_t‖ at five points along the sequence." },
        { t: "p", text: "**(c)** Implement truncated BPTT by detaching the state every k steps, and at T = 10 compare k = full, 5, 3, 2." },
        { t: "p", text: "**(d)** Reproduce the growing-backward-time bug (no detach, retain_graph) and the error without retain_graph." }
      ],
      requirements: [
        "(a) a 4 × 5 table.",
        "(b) three MSEs and two gradient profiles.",
        "(c) four MSEs.",
        "(d) the timing sequence and the error message."
      ],
      hint: "(a) torch.autograd.grad(loss, [h0] + hs[:-1], retain_graph=True) returns the gradient at every state. (b) Use an RNNCell loop and retain_grad() on each state to read per-step gradients; nn.RNN's output tensor does not carry the recurrent gradient. (c) The detach must happen before the cell call at step t.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) radius 0.52:  3.0e-15  6.7e-10  2.1e-04  1.7e+00   ratio 1.7e-15
#     radius 1.04:  3.8e-07  5.7e-04  1.2e-01  3.4e+00   ratio 1.1e-07
#     radius 1.56:  2.5e-02  4.3e-01  1.9e+00  5.3e+00   ratio 4.8e-03
#     radius 3.12:  3.7e+02  2.5e+01  7.3e+00  6.7e+00   ratio 5.6e+01

# (b) T=10 0.0193   T=20 0.1447   T=50 0.1691 (mean baseline 0.167)
#     T=20 profile: 3.0e-03 4.2e-03 6.1e-03 1.0e-02 3.3e-02;   T=50 profile: 1.7e-06 1.6e-05 1.8e-04 1.8e-03 3.2e-02

# (c) T=10: k=full 0.0193   k=5 0.0263   k=3 0.1321   k=2 0.1073

# (d) backward ms per step without detach: 1.0 1.1 1.3 2.2 3.3 2.9;  without retain_graph: 'Trying to backward through the graph a second time'`,
        notes: [
          { t: "p", text: "(a) is the exponential in the derivation, measured; the band around radius 1 is where the vanilla RNN lives." },
          { t: "p", text: "(b) turns the theory into a failure on a task and a profile that explains it." },
          { t: "p", text: "(c) and (d) are the two things every stateful training loop must get right: where to cut the graph, and that it must be cut." }
        ]
      }
    }
  ],

  takeaways: [
    "∂L/∂h_t = ∂L/∂h_T · Π diag(1 − h_k²) W_hh: a product of T − t Jacobians whose norm behaves like ρ^(T−t) — the spectral radius of W_hh scaled by activation derivatives ≤ 1 (≤ 0.25 for sigmoid).",
    "Measured at T = 30: radius 0.52 leaves 1.7 × 10⁻¹⁵ of the gradient at step 0, radius 1.04 leaves 10⁻⁷, radius 3.12 amplifies it 56×. A vanilla RNN is trainable only where the product stays near one over the distances that matter.",
    "On the adding problem a tanh RNN learned T = 10 (MSE 0.019), half-learned T = 20 (0.145) and failed T = 50 (0.169 = the mean baseline); the trained T = 50 network's gradient at the start of the sequence was 10⁻⁶ of its gradient at the end.",
    "Truncated BPTT detaches the state every k steps: values flow forward, gradients reach k steps back. At T = 10 with the dependency in steps 0–4, k = 5 gave 0.026 and k = 3 gave 0.132 — beyond the window, the dependency is not learned.",
    "Exploding gradients in training: five thousand-fold spikes in 99 steps left an unclipped character RNN at loss 2.66; clipping at 1.0 took it to 0.00 by making the same spikes survivable.",
    "The two bugs: a carried state that is not detached grows the graph (backward 1.0 → 3.3 ms per step, then a 'backward through the graph a second time' error), and a (T, B, F) tensor fed to a batch_first RNN runs silently with time and batch swapped."
  ],

  quiz: {
    title: "Backpropagation Through Time — Knowledge Check",
    questions: [
      {
        stem: "Why do vanishing gradients affect RNNs more severely than a feed-forward network of the same depth?",
        options: [
          "Because RNNs have more parameters",
          "Because the same W_hh is applied at every step, so the product of Jacobians is close to a power of one matrix — its behaviour is set by a single spectral radius and compounds exactly, whereas a feed-forward stack multiplies different matrices whose effects partly cancel; and sequence lengths of hundreds are routine where depths of hundreds are not",
          "Because RNNs use sigmoid activations",
          "Because RNNs cannot use BatchNorm"
        ],
        answer: 1,
        why: "ρ^T with one ρ is the sharpest form of the problem: radius 0.52 gave 10⁻¹⁵ at thirty steps. Residual connections (3.3) are what fixed depth for feed-forward networks; the LSTM's additive cell state (4.3) is the recurrent analogue."
      },
      {
        stem: "What does the gradient profile of the trained T = 50 network (10⁻⁶ at the start, 3 × 10⁻² at the end) tell you about why it failed?",
        options: [
          "The learning rate was too low",
          "That the loss gradient reaching the early steps is a hundred-thousandth of what reaches the late ones, so the weights receive almost no signal about how to treat the first marked number; the failure is not capacity but the absence of a teaching signal at the distance required",
          "That the network is over-fitting the late steps",
          "That the hidden size was too small"
        ],
        answer: 1,
        why: "The profile is measurable on any recurrent model and is the first diagnostic for 'it learns short patterns and plateaus'. The same profile on an LSTM (4.3) is what shows the fix working."
      },
      {
        stem: "How does truncated BPTT differ from simply training on shorter sequences?",
        options: [
          "It does not; they are the same",
          "Truncation keeps the forward state across the whole sequence — only the gradient is cut every k steps — so the model can still carry and use information older than k at inference and even learn to do so indirectly (k = 5 nearly matched full BPTT at T = 10), whereas short sequences discard the older context entirely",
          "Truncation uses a smaller learning rate",
          "Short sequences require padding"
        ],
        answer: 1,
        why: "The detach severs the graph, not the value. Language models trained with windows of a few hundred tokens routinely use longer context at inference, imperfectly, for exactly this reason."
      },
      {
        stem: "A recurrent training run has a gradient-norm log with a median of 2.5 and five entries above 1,000. What do you do?",
        options: [
          "Lower the learning rate until the spikes disappear",
          "Clip the gradient norm (at around 1 to 5), which bounds the update those spikes cause without changing the typical step; the executed character RNN went from a plateau at 2.66 to convergence at 0.00 with clipping and no other change — then reduce the initial recurrent weight scale if spikes remain frequent",
          "Remove the tanh",
          "Increase the batch size"
        ],
        answer: 1,
        why: "Lowering the rate enough to survive thousand-fold spikes would stall the ordinary steps. Clipping treats the rare event as rare. The recurrent weight scale (radius 2.5 here) is the root cause and the second lever."
      },
      {
        stem: "Which statement about the batch_first bug is correct?",
        options: [
          "PyTorch raises an error when the input is transposed",
          "An nn.RNN built with batch_first=True given a (T, B, F) tensor runs without error, treating the T axis as batch and the B axis as time; the output has the transposed shape and the model trains on nonsense — an explicit shape assertion is the defence",
          "The bug only affects LSTMs",
          "The output shape reveals the error immediately"
        ],
        answer: 1,
        why: "Executed: input (5, 8, 2) produced output (5, 8, 64) with no complaint. Shape-silent bugs are the reason 2.4's sanity suite exists; for recurrent models, asserting the time axis is the cheapest check."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Backpropagation Through Time",
    sub: "The Jacobian product, the measured band, the adding problem, truncation, and clipping.",
    questions: [
      {
        level: "Core",
        q: "Explain the vanishing gradient problem in RNNs with the mathematics.",
        strong: "Unroll the recurrence h_t = tanh(W_xh x_t + W_hh h_{t−1} + b) and differentiate a loss at step T with respect to the state at an earlier step t: ∂L/∂h_t = ∂L/∂h_T · Π_{k=t+1}^{T} diag(1 − h_k²) W_hh. It is a product of T − t Jacobians, each the recurrent matrix scaled by the activation derivatives, so its norm behaves like ρ^(T−t) where ρ is the spectral radius of W_hh reduced by the tanh derivatives (≤ 1; ≤ 0.25 for sigmoid). I measured it: with T = 30 and random W_hh at spectral radius 0.52 the first step received 1.7 × 10⁻¹⁵ of the last step's gradient; at 1.04, 10⁻⁷; at 3.12 the gradient grew 56-fold going backward. There is a narrow band around radius 1 where the product stays usable, and it is a few steps wide. On a real task the consequence is measurable: a tanh RNN learned the adding problem at length 10 (MSE 0.019) and failed at 50 (0.169, the baseline), and the trained network's gradient at the start of a 50-step sequence was 10⁻⁶ of its gradient at the end — the early steps get no teaching signal. The fixes are structural: an additive path through the state (LSTM's cell, 4.3) or a path that skips the steps altogether (attention).",
        answer: [
          { t: "p", text: "The product, the spectral-radius behaviour, the executed table, the task failure with its gradient profile, and the direction of the fix." }
        ]
      },
      {
        level: "Core",
        q: "What is truncated BPTT and what does it cost?",
        strong: "Run the forward recurrence over the whole sequence but detach the hidden state every k steps, so the autograd graph — and therefore the gradient — covers at most k steps while the state's value continues across the cut. It bounds memory and backward time to k regardless of sequence length and is how language models train on long streams. Its cost is a hard limit on the dependencies that receive gradient directly: on the adding problem at T = 10, where the first marked number lies in steps 0–4 and the loss is at step 9, full BPTT gave 0.019, k = 5 gave 0.026 — the gradient reaches step 5 and the network learns, through the carried state, to keep the number — but k = 3 gave 0.132: no gradient ever reaches the steps where the number appears, so nothing teaches the network to store it. The same detach is also the fix for the classic stateful-training bug, in which a state carried without detaching makes the graph grow every step (backward 1.0 to 3.3 ms per step, then an error).",
        answer: [
          { t: "p", text: "The mechanism, the executed trade-off at T = 10, and the connection to the detach bug." }
        ]
      },
      {
        level: "Core",
        q: "How do you handle exploding gradients in an RNN?",
        strong: "Clip the gradient norm before the optimiser step — rescale the whole gradient to at most c, typically 1 to 5 — and log the pre-clip norm. On a character RNN with recurrent weights at spectral radius 2.5, five of ninety-nine steps had gradient norms a thousand times the median; unclipped, those steps threw the weights somewhere useless and the loss plateaued at 2.66; with clipping at 1.0 and nothing else changed, the model converged to loss 0.00. Clipping does not remove the spikes — the clipped run actually had more steps above 10, because it kept learning into sharper regions — it bounds the damage each one causes. The root cause is the scale of W_hh, so the second lever is a smaller initialisation (orthogonal or radius-1 scaling), and gated cells reduce the problem further by keeping the state's Jacobian near the identity. A lower learning rate is the wrong tool: it would have to be small enough to survive the thousand-fold step and would then stall everything else.",
        answer: [
          { t: "p", text: "Clipping with the executed before/after, what it does and does not do, the root cause, and why the learning rate is not the fix." }
        ]
      }
    ]
  }
});

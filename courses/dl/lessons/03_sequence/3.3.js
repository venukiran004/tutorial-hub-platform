/* ============================================================================
   LESSON 3.3 — The Vanishing Gradient in Practice
   Mirrors 03_Sequence_Models.md · §3. A real training experiment on a
   controlled long-range task (scratchpad/dl/d33.py, d33b.py, d33c.py). The
   first run gave a surprising result; the cause was found and verified.
   ========================================================================= */
EC.receiveLesson({
  id: "3.3",

  lede: "**The previous lesson showed the gradient vanishing. This one shows what that costs you — and turns up a result worth the whole module.** Training a vanilla RNN and an LSTM on a task with a controlled dependency length, the LSTM *lost*, sitting at chance while the RNN scored 100 %. The cause was not the architecture. It was one line of initialisation, and fixing it took the LSTM from 48.2 % to 100 %.",

  objectives: [
    "Measure the gradient a model receives at each position of a sequence",
    "Relate gradient magnitude to what a model can actually learn",
    "Diagnose a failing gated model by checking its forget-gate initialisation",
    "List the four families of solution and what each addresses"
  ],

  prerequisites: ["3.2"],

  blocks: [

    { t: "h2", n: "01", text: "A task with a dial on it", id: "task" },

    { t: "p", text: "To measure long-range learning you need a task where the dependency length is a parameter you control. Put the answer at position 0, fill the next `T−1` positions with noise, and ask for a prediction at the end. Nothing else varies." },

    { t: "code", lang: "python", title: "The task",
      code: `def make(n, T, vocab=8):
    x = torch.randint(2, vocab, (n, T))   # noise tokens 2..7
    y = torch.randint(0, 2, (n,))         # the answer: 0 or 1
    x[:, 0] = y                           # the signal, at the very start
    return x, y`,
      caption: "A model must carry one bit from step 0 to step T−1 through T−1 steps of pure noise. Chance is 50 %." },

    { t: "h2", n: "02", text: "The gradient each position receives", id: "gradients" },

    { t: "out", text: `  T=  5 rnn  : grad at step 0 = 1.497e-02, at step 4 = 2.641e-01, ratio 1.76e+01
  T=  5 lstm : grad at step 0 = 6.549e-03, at step 4 = 7.840e-02, ratio 1.20e+01

  T= 20 rnn  : grad at step 0 = 3.776e-07, at step 19 = 2.635e-01, ratio 6.98e+05
  T= 20 lstm : grad at step 0 = 3.056e-06, at step 19 = 7.835e-02, ratio 2.56e+04

  T= 80 rnn  : grad at step 0 = 8.272e-25, at step 79 = 2.610e-01, ratio 3.16e+23
  T= 80 lstm : grad at step 0 = 9.618e-18, at step 79 = 7.745e-02, ratio 8.05e+15` },

    { t: "p", text: "At 80 steps the RNN delivers 8.3e-25 to the position that holds the answer; the LSTM delivers 9.6e-18 — **seven orders of magnitude more**, though still vanishingly small in absolute terms. The gated architecture helps enormously and does not make the problem disappear." },

    { t: "h2", n: "03", text: "The result that did not fit", id: "surprise" },

    { t: "p", text: "Training both for 3,000 steps with matched hidden size, optimiser and clipping:" },

    { t: "out", text: `   lag T   vanilla RNN    LSTM
   T= 10      100.0%      100.0%
   T= 20      100.0%       50.0%
   T= 30      100.0%       48.7%
   T= 50       50.2%       49.6%` },

    { t: "callout", kind: "warn", title: "The LSTM at chance while the RNN is perfect",
      body: [{ t: "p", text: "This is the opposite of what the theory predicts, and the honest first response is that something in the setup is wrong rather than that LSTMs do not work. The gradient measurements above rule out the obvious explanation — the LSTM's gradient at step 0 is *larger* than the RNN's at every length tested. So the architecture is delivering what it promises and something else is preventing the model from using it. Lesson 3.4 supplies a candidate: PyTorch initialises the forget-gate bias near zero." }] },

    { t: "h2", n: "04", text: "One line of initialisation", id: "diagnosis" },

    { t: "out", text: `  PyTorch default : mean f at init = 0.4991   f^20 = 9.188e-07   f^50 = 8.092e-16
  bias set to 1.0 : mean f at init = 0.7311   f^20 = 1.901e-03   f^50 = 1.576e-07` },

    { t: "p", text: "At the default the forget gate sits at 0.4991 — almost exactly a half — so the cell state's gradient is halved at every step before any learning has happened. Over twenty steps that is a factor of a million. Setting the forget-gate bias to 1.0 starts it at 0.7311 instead. Same architecture, same everything else:" },

    { t: "out", text: `   lag T    RNN     LSTM (default bias)   LSTM (forget bias = 1.0)
    T= 20   100.0%         48.2%                100.0%
    T= 30   100.0%         49.2%                100.0%
    T= 50    51.3%         51.5%                 51.8%` },

    { t: "callout", kind: "insight", title: "Chance to perfect, from one line",
      body: [{ t: "p", text: "48.2 % to 100 % at T=20, and 49.2 % to 100 % at T=30, by changing `bias_ih_l0[H:2H]` from roughly zero to one. Nothing else differs — same seeds, same optimiser, same number of steps. This is worth dwelling on for two reasons. First, it confirms the mechanism concretely: the gradient budget at initialisation determines what the model can learn *before* it has learned anything, and a model that cannot get started cannot bootstrap. Second, it is a warning about attributing failures to architecture. The obvious conclusion from the first experiment was 'the LSTM does not help here', and that conclusion was wrong — the architecture was fine and the default initialisation was not." }] },

    { t: "code", lang: "python", title: "The fix",
      code: `H = lstm.hidden_size
with torch.no_grad():
    lstm.bias_ih_l0[H:2*H].fill_(1.0)    # f chunk is [H:2H] in i,f,g,o order
    lstm.bias_hh_l0[H:2*H].fill_(0.0)    # the two biases sum, so zero the other`,
      caption: "PyTorch keeps two bias vectors that are added together, so setting one to 1.0 and leaving the other at its random init gives an uncontrolled value. Zero the second." },

    { t: "p", text: "At T=50 everything still fails, including the corrected LSTM at 51.8 %. That is honest too: a fifty-step dependency through pure noise needs more capacity, more training, or attention. The initialisation buys roughly a factor of 10⁹ in starting gradient over fifty steps, and it is still not enough." },

    { t: "h2", n: "05", text: "The four families of solution", id: "solutions" },

    { t: "diagram", kind: "layers", title: "What actually addresses the problem",
      caption: "Only the first and fourth change the structure of the gradient path. The middle two manage symptoms.",
      items: [
        { label: "Gated architectures", sub: "LSTM, GRU — additive path, learned decay rate", tone: "good" },
        { label: "Gradient clipping", sub: "Fixes exploding only; does nothing for vanishing", tone: "warn" },
        { label: "Skip connections across time", sub: "Residual paths that bypass steps", tone: "accent" },
        { label: "Self-attention", sub: "Constant-length path between any two positions", tone: "violet" }
      ] },

    { t: "table", head: ["Approach", "Addresses", "Limitation"],
      rows: [
        ["LSTM / GRU", "Vanishing — the Jacobian becomes a learned gate", "Still decays; needs the forget-bias fix; roughly 100-step practical ceiling"],
        ["Gradient clipping", "Exploding only", "Cannot restore a gradient that has reached zero"],
        ["Skip connections over time", "Vanishing — shortens the path", "Fixed skip length must be chosen in advance"],
        ["Self-attention", "Vanishing — path length is O(1) for any pair", "O(T²) memory and compute; no recurrence to stream"]
      ] },

    { t: "callout", kind: "mental", title: "Path length is the quantity that matters",
      body: [{ t: "p", text: "Every solution here can be read as shortening the gradient's journey. An RNN's path from step 1 to step T passes through T multiplications. An LSTM keeps the path the same length but makes each hop cheap — multiply by a gate the network sets near 1. Skip connections literally shorten it. Self-attention reduces it to a single hop between *any* two positions, regardless of distance, which is why transformers handle thousands of tokens where LSTMs manage hundreds. When you meet a new sequence architecture, asking 'how long is the gradient path between distant positions?' will usually tell you what it is for." }] },

    { t: "exercise", kind: "practice", title: "Run the diagnosis yourself", difficulty: "advanced", minutes: 45,
      prompt: "Build the signal-at-position-0 task and train an RNN, a default LSTM and an LSTM with forget-gate bias 1.0 at lags of 10, 20, 30 and 50. Before training, measure the gradient each model delivers to position 0. Then confirm the initialisation effect by sweeping the forget-gate bias over −1, 0, 1, 2 and 3 at a fixed lag, plotting accuracy against bias. Finally, log the mean forget-gate value during a successful run to see where it settles.",
      hints: [
        "Set both `bias_ih_l0[H:2H]` and `bias_hh_l0[H:2H]` — they are summed.",
        "Use the same seed across variants so the comparison is about the bias alone.",
        "For the gradient measurement, `retain_grad()` on the embedding output gives per-position norms."
      ],
      solution: {
        notes: [
          { t: "p", text: "The bias sweep should show a clear threshold rather than a smooth curve: below about 0.5 the model never gets started, above it the model solves the task, and very high values eventually hurt because the network struggles to learn to forget anything. The arithmetic explains the shape — `sigmoid(0) = 0.5` gives 0.5^20 ≈ 1e-06 of the starting gradient, while `sigmoid(1) = 0.73` gives 1.9e-03, a factor of two thousand at twenty steps." },
          { t: "p", text: "The broader lesson is about diagnosis. The first experiment said the LSTM lost to a vanilla RNN, which contradicts everything the theory predicts. The right move was not to accept it and not to dismiss it, but to find a measurement that discriminated between explanations — the per-position gradient, which showed the LSTM's gradient was *larger*, ruling out the architecture and pointing at something preventing the model from exploiting it. Most confusing experimental results in deep learning resolve this way, with a default you did not know you had accepted." },
          { t: "p", text: "Logging the forget gate during a successful run typically shows it rising well above its initialised value for the dimensions carrying the signal and drifting down elsewhere. That is the network learning its own retention policy, which is the thing the initialisation only has to make *possible* — once training is underway the gate is data-driven, and the bias matters only for getting off the ground." }
        ]
      } }

  ],

  takeaways: [
    "Measured at T=80: the RNN delivers 8.3e-25 of gradient to position 0, the LSTM 9.6e-18 — better by 10⁷, still tiny.",
    "In a first experiment the LSTM sat at chance while the RNN scored 100 % — the opposite of theory.",
    "The cause was PyTorch's forget-gate bias default, giving f ≈ 0.4991 and halving the gradient every step.",
    "Setting the forget-gate bias to 1.0 took the LSTM from 48.2 % to 100 % at T=20 and 49.2 % to 100 % at T=30.",
    "PyTorch sums two bias vectors, so set both when applying this fix.",
    "At T=50 everything still failed — the fix buys ~10⁹ in starting gradient and is still not enough.",
    "Path length is the unifying idea: LSTM makes hops cheap, skips shorten the path, attention makes it O(1)."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "An LSTM performs at chance on a 20-step dependency task while a vanilla RNN solves it. What should you check first?",
      options: ["Increase the hidden size", "The forget-gate bias initialisation", "Switch to a GRU", "Lower the learning rate"],
      answer: 1,
      why: "PyTorch initialises the forget-gate bias near zero, giving f ≈ 0.4991 — the gradient is halved at every step before learning begins, a factor of a million over twenty steps. Setting that bias to 1.0 took the measured accuracy from 48.2 % to 100 % with nothing else changed." },
    { stem: "Why does the forget-gate bias matter so much at initialisation specifically?",
      options: ["It prevents overfitting", "A model that cannot receive gradient at the start cannot learn to open its gates", "It speeds up the forward pass", "It reduces the parameter count"],
      answer: 1,
      why: "It is a bootstrap problem. The network could in principle learn to set its forget gates near 1, but it would have to do so using the very gradient signal the closed gates are suppressing. The initialisation sidesteps the circularity; once training is underway the gate is data-driven and the bias no longer matters." },
    { stem: "Which of these does gradient clipping solve?",
      options: ["Vanishing gradients", "Exploding gradients only", "Both", "Neither"],
      answer: 1,
      why: "Clipping rescales an oversized gradient while preserving its direction, so the information is kept. A vanished gradient has no direction left to preserve — at 80 steps the measured value was 8.3e-25, and scaling that up amplifies round-off, not signal. Vanishing needs an architectural fix." },
    { stem: "What single property unifies LSTM, skip connections and self-attention as solutions?",
      options: ["They all add parameters", "They all shorten or cheapen the gradient's path between distant positions", "They all use gating", "They all require more memory"],
      answer: 1,
      why: "An RNN's gradient passes through T multiplications to reach the start. An LSTM keeps the path length but makes each hop a multiply by a learned gate near 1; skip connections shorten the path directly; attention reduces it to one hop between any pair. Asking about path length is a reliable way to understand a new sequence architecture." }
  ] },

  interview: { title: "Interview", sub: "Diagnosing sequence models", questions: [
    { level: "Core", q: "Why can't a vanilla RNN learn long-range dependencies?",
      strong: "The gradient reaching early steps decays exponentially, so those positions receive no training signal.",
      answer: [{ t: "p", text: "Because the gradient from the loss to an early timestep passes through a product of Jacobians, each involving the same recurrent weight matrix and a tanh derivative that is at most 1. That product decays exponentially with distance. I have measured it on a task where the signal sits at position 0: at 20 steps the gradient reaching that position is 3.8e-07, and at 80 steps it is 8.3e-25. Those positions are effectively untrained, so the model cannot learn to use them however long you train. The practical ceiling is around ten to twenty steps, and what makes it insidious is that nothing looks wrong — the loss falls, the model trains, it has just silently ignored the start of its input." }] },
    { level: "Senior", q: "Your LSTM performs no better than chance on a long-range task. Walk me through your diagnosis.",
      strong: "Measure the per-position gradient first, then check the forget-gate bias initialisation.",
      answer: [{ t: "p", text: "I would measure before changing anything — specifically the gradient norm arriving at each input position, which tells me whether the model is receiving signal where the information is. I hit exactly this case recently: an LSTM sat at chance on a 20-step task while a vanilla RNN scored 100 %, which contradicts the theory. The gradient measurement showed the LSTM's gradient at position 0 was actually *larger* than the RNN's, so the architecture was working and something was preventing the model from exploiting it. That pointed at the forget-gate bias: PyTorch initialises it near zero, so f starts at about 0.4991 and the cell gradient is halved at every step before any learning happens — a factor of a million over twenty steps. Setting that bias to 1.0 took the model from 48.2 % to 100 %. The general habit I would emphasise is finding a measurement that discriminates between explanations rather than trying fixes in sequence." }] },
    { level: "Senior", q: "What are the ways to address vanishing gradients, and how do they relate?",
      strong: "Gating, skip connections and attention all shorten or cheapen the gradient path; clipping addresses a different problem.",
      answer: [{ t: "p", text: "The unifying idea is path length. In a vanilla RNN the gradient from the end to the start passes through T multiplications by the same matrix, which is what makes it decay. Gated cells keep the path the same length but make each hop cheap: the Jacobian becomes a learned gate the network can set near 1, so decay is data-driven instead of fixed. Skip connections across time shorten the path literally. Self-attention takes it to the limit — a single hop between any two positions regardless of distance — which is why transformers handle thousands of tokens where an LSTM manages hundreds, at the cost of quadratic memory and no streaming. Gradient clipping belongs on a different list: it handles exploding gradients, where the direction is still meaningful and only the magnitude is wrong. It cannot help with vanishing, because there is nothing left to rescale. I would add that gating is necessary but not sufficient — on a 50-step task even a correctly initialised LSTM failed in my measurements." }] }
  ] }
});

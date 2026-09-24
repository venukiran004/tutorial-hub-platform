/* ============================================================================
   LESSON 3.5 — GRU, and Choosing Between the Gated Cells
   Mirrors 03_Sequence_Models.md · §5 and §6. Equations verified against
   nn.GRU; the reference's "GRU trains faster" claim is benchmarked and does
   NOT hold on this setup (scratchpad/dl/d35.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.5",

  lede: "**The GRU asks whether three gates and two states were ever necessary.** It merges the cell and hidden state into one, couples the forget and input gates into a single update gate, and drops the output gate — arriving at 75 % of the LSTM's parameters with, in most published comparisons, indistinguishable accuracy. This lesson derives it, verifies it against PyTorch, and benchmarks the speed claim that everyone repeats, which turns out not to survive measurement.",

  objectives: [
    "Write the four GRU equations and implement them from scratch",
    "Explain what coupling the update gate gives up relative to an LSTM",
    "Show that the GRU has the same additive gradient path as the LSTM",
    "Compare parameter counts and verify the 75 % ratio",
    "Choose between RNN, GRU, LSTM and transformer for a given problem"
  ],

  prerequisites: ["3.4"],

  blocks: [

    { t: "h2", n: "01", text: "Four equations instead of six", id: "equations" },

    { t: "math", tex: "\\begin{aligned} z_t &= \\sigma(W_z[h_{t-1}, x_t] + b_z) & &\\text{update} \\\\ r_t &= \\sigma(W_r[h_{t-1}, x_t] + b_r) & &\\text{reset} \\\\ \\tilde{h}_t &= \\tanh(W_h[r_t \\odot h_{t-1}, x_t] + b_h) & &\\text{candidate} \\\\ h_t &= (1-z_t)\\odot h_{t-1} + z_t \\odot \\tilde{h}_t & &\\text{final state} \\end{aligned}" },

    { t: "out", text: `  my loop vs nn.GRU : max abs diff 2.980e-08
  PyTorch gate order is r, z, n; weight_ih is (21, 5) = (3*7, 5)` },

    { t: "callout", kind: "trap", title: "PyTorch's update gate means the opposite of the reference's",
      body: [{ t: "p", text: "The reference writes `h_t = (1−z)h_{t−1} + z·h̃`, so `z` near 1 means *take the new candidate*. PyTorch computes `h_t = (1−z)·h̃ + z·h_{t−1}`, so `z` near 1 means *keep the old state* — the exact reverse. Both are the same family of functions and both train identically, since the network simply learns the sign it needs. But if you implement from a paper and validate against `nn.GRU`, or read gate statistics from a trained model expecting one convention, you will misinterpret every number. Check which one your source uses before drawing any conclusion from a gate value." }] },

    { t: "p", text: "There is a second subtlety in the candidate. The reset gate is applied to the *recurrent* contribution only, inside the tanh — `tanh(W_x x + r ⊙ (W_h h))` — not to `h` before the matrix multiply. This matters because it lets PyTorch compute `W_h h` once for all three gates." },

    { t: "h2", n: "02", text: "The coupled gate", id: "coupling" },

    { t: "diagram", kind: "compare", title: "Three gates against two",
      caption: "The GRU's update gate does the work of the LSTM's forget and input gates at once, with one number instead of two.",
      columns: [
        { title: "LSTM", tone: "accent", items: [
          "Forget and input are independent",
          "Can keep 100 % of memory and add 100 % of new content",
          "Separate cell state and hidden state",
          "Output gate controls what is exposed",
          "4h(h+d) parameters"
        ] },
        { title: "GRU", tone: "good", items: [
          "Update gate couples them: keep z, take 1−z",
          "Keeping more necessarily means adding less",
          "One state serving both roles",
          "No output gate — the whole state is exposed",
          "3h(h+d) parameters"
        ] }
      ] },

    { t: "out", text: `  z=0.1: keep 10% of old state, take 90% of the candidate
  z=0.5: keep 50% of old state, take 50% of the candidate
  z=0.9: keep 90% of old state, take 10% of the candidate` },

    { t: "p", text: "The two gates being tied is the GRU's real simplification, and the real thing it gives up. An LSTM can set `f = 1` and `i = 1` simultaneously — keep everything you had *and* write something new. A GRU cannot: the memory budget is zero-sum at every step. The **reset gate** is the other control, deciding how much of the previous state the candidate is even allowed to see; at `r ≈ 0` the candidate is computed from the input alone, which is how the cell drops history that has become irrelevant." },

    { t: "h2", n: "03", text: "The same gradient trick", id: "gradient" },

    { t: "out", text: `  update gate z   : [0.9005606174468994, 0.05347728729248047, 0.15878444910049438, 0.41920870542526245]
  measured dh/dh  : [0.9005606174468994, 0.05347728729248047, 0.15878444910049438, 0.41920870542526245]
  identical: True` },

    { t: "p", text: "`∂h_t/∂h_{t−1} = z_t` exactly — structurally identical to the LSTM's `∂C_t/∂C_{t−1} = f_t` from the previous lesson. An additive update with a learned, per-dimension decay rate. This is why both architectures solve the vanishing gradient problem and the vanilla RNN does not: **it is the additive path that matters, not the number of gates**." },

    { t: "h2", n: "04", text: "Parameters and speed", id: "cost" },

    { t: "out", text: `      d     h        RNN        GRU       LSTM   GRU/LSTM
    100   256     91,648    274,944    366,592   0.750  (25% fewer)
    300   512    416,768  1,250,304  1,667,072   0.750  (25% fewer)
     32    64      6,272     18,816     25,088   0.750  (25% fewer)` },

    { t: "p", text: "Exactly 75 %, as `3h(h+d)` against `4h(h+d)` predicts. The speed claim, however, does not survive contact with a benchmark:" },

    { t: "out", text: `  batch=32 T=100 d=128 h=256
    RNN : median    42.8 ms   GRU : median   133.6 ms   LSTM: median    67.4 ms
  batch=16 T=50 d=64 h=128
    RNN : median    12.3 ms   GRU : median    29.4 ms   LSTM: median     9.5 ms
  batch=64 T=30 d=100 h=200
    RNN : median    13.2 ms   GRU : median    43.3 ms   LSTM: median    26.4 ms` },

    { t: "callout", kind: "warn", title: "The reference says GRU trains faster. On this setup it is 1.6–3.1× slower.",
      body: [{ t: "p", text: "Across all three shapes, on CPU with torch 2.10, the GRU is **slower than the LSTM** despite having 25 % fewer parameters — by 2.0×, 3.1× and 1.6× respectively. This is not a FLOP fact but an implementation one: PyTorch's LSTM has a well-optimised fused CPU kernel and the GRU does not get the same treatment. The reference's claim is correct about arithmetic and wrong about wall-clock here, and the picture may differ on CUDA with cuDNN where both are fused. The general lesson is the one from lesson 2.4's depthwise convolutions: parameter and FLOP counts are a poor predictor of latency, and if speed is your reason for choosing an architecture you must benchmark it on your actual hardware." }] },

    { t: "h2", n: "05", text: "Choosing", id: "choosing" },

    { t: "table", head: ["Aspect", "LSTM", "GRU"],
      rows: [
        ["Gates", "3 — forget, input, output", "2 — update, reset"],
        ["States", "`h_t` and `C_t` separately", "`h_t` only"],
        ["Parameters", "4h(h+d)", "3h(h+d) — 25 % fewer"],
        ["Long sequences", "Better — independent gates, dedicated memory path", "Good, slightly worse"],
        ["Small datasets", "More prone to overfitting", "Better — fewer parameters"],
        ["Measured speed (CPU, torch 2.10)", "**Faster here**", "1.6–3.1× slower"],
        ["Typical use", "NLP, speech, long sequences", "Time series, edge devices"]
      ] },

    { t: "callout", kind: "insight", title: "Chung et al. found neither consistently wins",
      body: [{ t: "p", text: "The 2014 empirical comparison that everyone cites concluded that neither architecture dominates across tasks — GRU tends to converge faster in epochs and is easier to tune, LSTM captures longer dependencies on some problems, and **both vastly outperform a vanilla RNN**. That last clause is the one that matters. The choice between LSTM and GRU is worth a few hours of experiment at most; the choice between either of them and a vanilla RNN is the difference between a model that works and one that cannot learn anything beyond twenty steps." }] },

    { t: "dl", items: [
      ["Start with GRU", "Fewer parameters, fewer things to tune, and less prone to overfit a small dataset."],
      ["Switch to LSTM if", "Dependencies exceed roughly 100 steps, the dataset is large, or you need the output gate's separation of memory from exposure."],
      ["Switch to a transformer if", "Sequences exceed roughly 500 steps, you need parallel training, or pretrained models exist for your task — which for text they invariably do."],
      ["Never ship a vanilla RNN", "It is a teaching device. Lesson 3.3 measured where it stops working."]
    ] },

    { t: "exercise", kind: "practice", title: "Implement GRU and test the trade-offs", difficulty: "advanced", minutes: 40,
      prompt: "Implement the GRU equations and verify against `nn.GRU` to 1e-6, noting which convention PyTorch uses for the update gate. Then train RNN, GRU and LSTM on the same sequence task at lengths 20, 50 and 150, with matched hidden sizes, recording accuracy, epochs to convergence and wall-clock time. Finally, match them on *parameter count* rather than hidden size — give the GRU a larger hidden dimension so all three have the same number of parameters — and see whether the comparison changes.",
      hints: [
        "PyTorch packs GRU gates as r, z, n, and applies the reset gate inside the tanh to the recurrent term only.",
        "Time forward plus backward, warm up first, and take a median rather than a mean.",
        "For parameter matching, GRU hidden size ≈ LSTM hidden size × 2/√3."
      ],
      solution: {
        notes: [
          { t: "p", text: "The parameter-matched comparison is the one worth doing, because comparing at equal hidden size confounds architecture with capacity. Given the same parameter budget the GRU gets a wider state, and the accuracy gap that appears in the naive comparison often closes or reverses. Any claim that one architecture beats another needs to say what was held constant." },
          { t: "p", text: "On wall-clock, expect to be surprised. I measured the GRU slower than the LSTM on CPU across three different shapes — 2.0×, 3.1× and 1.6× — despite 25 % fewer parameters, because PyTorch's LSTM has a better-optimised fused kernel. If your reason for choosing GRU is speed, benchmark it rather than trusting the parameter count; the answer depends on your framework version and hardware, not on the arithmetic." },
          { t: "p", text: "At length 150 both gated cells should comfortably beat the vanilla RNN, which is the result that actually matters. The LSTM-versus-GRU difference will likely be within run-to-run noise, matching what Chung et al. reported in 2014. If you see a large gap, check the seeds and the learning rate before concluding anything about architecture." }
        ]
      } }

  ],

  takeaways: [
    "Four equations: update gate, reset gate, candidate, and a convex combination for the new state.",
    "A hand implementation matches `nn.GRU` to 2.98e-08; PyTorch packs gates as r, z, n.",
    "PyTorch's `z` means *keep the old state* — the reverse of the reference's convention.",
    "Coupling forget and input makes the memory budget zero-sum; an LSTM can keep and add simultaneously.",
    "`∂h_t/∂h_{t−1} = z_t` exactly — the same additive gradient path as the LSTM's forget gate.",
    "GRU has exactly 75 % of the LSTM's parameters, confirmed at three sizes.",
    "But measured on CPU with torch 2.10 the GRU is 1.6–3.1× *slower* than the LSTM — benchmark, do not assume."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What does coupling the update gate cost a GRU relative to an LSTM?",
      options: ["Nothing — they are equivalent", "It cannot keep all of its old state while also writing new content, since the two are tied", "It cannot handle long sequences", "It has no gradient highway"],
      answer: 1,
      why: "The update is a convex combination: keeping fraction z of the old state means taking 1−z of the candidate. An LSTM's forget and input gates are independent, so it can set both to 1. The GRU's memory budget is zero-sum at every step — a genuine loss of expressiveness, though in practice rarely a decisive one." },
    { stem: "How many parameters does a GRU have compared with an LSTM?",
      options: ["The same", "Exactly 75 % — three gates instead of four", "50 %", "Twice as many"],
      answer: 1,
      why: "`3h(h+d)` against `4h(h+d)`. Measured at three different sizes the ratio was exactly 0.750 every time. That reduction is the GRU's main practical attraction, particularly on small datasets where fewer parameters means less overfitting." },
    { stem: "A benchmark shows the GRU running slower than the LSTM despite having fewer parameters. What is the explanation?",
      options: ["The benchmark is wrong", "Kernel optimisation differs by architecture — parameter count does not determine wall-clock speed", "GRUs need more epochs", "The hidden size was mismatched"],
      answer: 1,
      why: "Measured across three shapes on CPU with torch 2.10, the GRU was 1.6–3.1× slower. PyTorch's LSTM has a well-optimised fused kernel and the GRU does not get equivalent treatment. This is the same lesson as depthwise convolutions in 2.4: FLOPs predict latency poorly, so benchmark on your actual hardware." },
    { stem: "What did Chung et al. (2014) conclude about LSTM versus GRU?",
      options: ["LSTM is consistently better", "GRU is consistently better", "Neither consistently wins, but both vastly outperform a vanilla RNN", "They are mathematically identical"],
      answer: 2,
      why: "The comparison found task-dependent results with no consistent winner — GRU converging faster and being easier to tune, LSTM sometimes capturing longer dependencies. The clause that matters is the last one: the gap between either gated cell and a vanilla RNN dwarfs the gap between them." }
  ] },

  interview: { title: "Interview", sub: "GRU and architecture choice", questions: [
    { level: "Core", q: "How does a GRU differ from an LSTM?",
      strong: "Two gates not three, one state not two, 25 % fewer parameters, and the forget/input gates are coupled.",
      answer: [{ t: "p", text: "The GRU merges the cell state and hidden state into one vector, and replaces the separate forget and input gates with a single update gate — keeping fraction z of the old state and taking 1−z of the candidate. It also drops the output gate, so the whole state is exposed at every step. That gives three weight matrices instead of four, which is exactly 75 % of the parameters; I have verified that ratio at several sizes. The reset gate is the second control, deciding how much of the previous state the candidate is allowed to see. The key thing they share is the additive update: `∂h_t/∂h_{t−1} = z_t` in a GRU, exactly as `∂C_t/∂C_{t−1} = f_t` in an LSTM. Both solve vanishing gradients the same way, so the number of gates is not what matters — the additive path is." }] },
    { level: "Senior", q: "How would you choose between RNN, GRU, LSTM and a transformer?",
      strong: "Never a vanilla RNN; GRU or LSTM for moderate sequences and small data; transformer for long sequences or where pretrained weights exist.",
      answer: [{ t: "p", text: "A vanilla RNN is a teaching device — it stops learning past about twenty steps, which I have measured directly. Between GRU and LSTM I would start with GRU because it has 25 % fewer parameters and fewer things to tune, and switch to LSTM if dependencies run beyond about a hundred steps or the dataset is large enough that overfitting is not the binding constraint. Chung et al. found neither consistently better, so I would not spend much time on that choice. The bigger decision is whether to use a recurrent model at all: for text there are pretrained transformers for essentially every task and they will beat anything I train from scratch, and for sequences beyond a few hundred steps attention's constant-length path between positions is decisive. I would stay recurrent for streaming inference where you need to process one step at a time with bounded state, and for small time-series problems where a transformer is overkill. One caveat on GRU: if you are choosing it for speed, benchmark first — I measured it 1.6 to 3.1 times slower than LSTM on CPU despite the smaller parameter count." }] },
    { level: "Senior", q: "Someone reports a GRU beating an LSTM on their task. What would you check?",
      strong: "Whether the comparison held parameter count constant, and whether the difference exceeds run-to-run variance.",
      answer: [{ t: "p", text: "First, what was held constant. Comparing at equal hidden size means the GRU has 25 % fewer parameters, so you are testing architecture and capacity together — if the GRU wins, that might just mean the LSTM was overfitting, which is a statement about the dataset size rather than the cell design. The cleaner comparison gives the GRU a wider hidden state so both have the same parameter count. Second, variance: I would want several seeds, because differences between these two architectures are usually within run-to-run noise and a single-run gap tells you very little. Third, tuning effort — GRU is known to be easier to tune, so an equal hyperparameter search can favour it for reasons unrelated to its ceiling. None of this means the result is wrong, and on a small dataset a GRU winning is entirely plausible for exactly the overfitting reason. I would just want the claim stated as 'better on this data at this budget' rather than as a property of the architectures." }] }
  ] }
});

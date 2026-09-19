/* ============================================================================
   LESSON 2.4 — Debugging and Training Instability
   ========================================================================= */
EC.receiveLesson({
  id: "2.4",

  lede: "**A training run fails in about eight ways, each has a signature, and each signature can be reproduced on purpose in a few lines — which is how you learn to read them.** A loss frozen at exactly 2.3026 is a network predicting the prior (ln 10). A gradient norm of 5.8 × 10⁶ two steps before the first NaN is the explosion announcing itself. A single NaN in one input pixel turns every gradient in the network to NaN after one backward. A batch of 32 that a correct pipeline drives to loss 0.0002 in 300 steps is the cheapest test there is — and it passes on a pipeline whose labels are shuffled, which is why it is one test of seven. This lesson builds the failure-mode map, the monitoring, the decision flow and the checklist, from failures that were made to happen.",

  objectives: [
    "Produce NaN and inf five different ways and name the fix for each",
    "Read loss spikes against the logged gradient norm and apply the right remedy",
    "Diagnose a flat loss at ln K, dead units and a forgotten eval() from their signatures",
    "Run the overfit-one-batch and shuffled-label tests and state exactly what each can and cannot detect",
    "Monitor a run with update-to-weight ratios, activation statistics and dead fractions, and follow a decision flow from symptom to cause"
  ],

  prerequisites: ["2.3", "1.8"],

  blocks: [

    { t: "h2", n: "01", text: "NaN and inf, five ways", id: "nan" },

    { t: "code", lang: "text", title: "Each produced on purpose (executed)",
      code: `(a) log of a probability that underflowed to 0:    −log([1, 0]) = [0, inf]
    fix: cross-entropy from logits (1.3); never softmax-then-log

(b) standardising a constant column:  std = 0, (x − μ)/std = NaN
    fix: divide by (std + ε); drop constant columns; same for any hand-written normalisation

(c) huge logits (first-layer weights × 50):  loss 2.8 is still finite -- log-sum-exp holds --
    but the gradient norm is 10, and at lr 0.05 the weights will be far larger next step
    fix: initialisation (1.6); the loss is not where this shows first, the gradient norm is

(d) learning rate 3.0:  loss per step 2.31 2.32 2.33 2.25 2.14 2.87 … first non-finite at step 14
    gradient norms on the three steps before: 5.8e+06, 3.1e+10, inf
    fix: the rate; clipping as insurance -- the norm log gave two steps of warning

(e) one NaN in one input pixel:  1 of 64 output rows NaN; after one backward, NaN gradients in 8 of 8 parameter tensors
    fix: assert torch.isfinite(x).all() on the way in; one bad row poisons every weight`,
      caption: "Four of the five are visible before the loss is: (b) and (e) at the input, (c) and (d) in the gradient norm. torch.autograd.set_detect_anomaly(True) raises at the backward node that first produced a NaN, at a large speed cost — it is a tool for finding which operation, once the norm log has told you when." },

    { t: "dl", items: [
      ["Fix order for NaN", "Check the data (finite, scaled). Check the loss is computed from logits. Check any division (normalisation, cosine similarity, attention softmax with an all-masked row). Lower the learning rate or add warmup. Clip. Then mixed-precision overflow (2.5) if float16 is in use."],
      ["Anomaly mode", "set_detect_anomaly(True) makes every backward node check for NaN and report the forward operation that created it. Ten times slower; switch it on for one reproduction, then off."],
      ["The two-step warning", "In (d) the gradient norm was 5.8 × 10⁶ two steps before the loss became NaN and 3 × 10¹⁰ one step before. A run that logs the norm every step knows it is dying before the loss shows it."]
    ] },

    { t: "h2", n: "02", text: "Spikes, divergence, and what the norm log shows", id: "spikes" },

    { t: "p", text: "A spike is a loss that jumps several-fold on one step and usually recovers; divergence is a spike that does not. Both are the learning rate being too high for the local curvature, and both are preceded by a gradient norm above the run's median. An eight-layer tanh network with SGD momentum, six epochs (120 steps):" },

    { t: "code", lang: "text", title: "Spikes against learning rate, with and without clipping (executed)",
      code: `lr=0.05   spikes 0                                                      test acc 0.633   (slow; the rate is low for this network)
lr=0.10   spikes 2  at steps 89, 108   loss 0.62→1.18, 0.42→0.95         test acc 0.713
          gradient norm the step before each: 1.1, 2.1   vs run median 1.4
lr=0.15   spikes 4  at steps 65, 66, 70, 77   loss 0.88→1.44, 1.44→2.40, 1.05→1.69, 2.00→3.13    test acc 0.552
          gradient norm the step before each: 2.9, 5.6, 3.2, 3.8   vs median 2.2
          with clip norm 1.0:  spikes 3, test acc 0.746
lr=0.20   spikes 6   test acc 0.191
          with clip norm 1.0:  spikes 3, test acc 0.746
lr=0.30   the loss never moves from 2.30 -- dead from step one (test acc 0.102);  with clipping 0.800`,
      caption: "At lr 0.15 every spike was preceded by a gradient norm above the median, and the spikes came in a cluster (steps 65–77) once the weights reached a sharper region. Clipping at 1.0 did not remove the spikes but bounded them, and took the accuracy from 0.552 to 0.746. At 0.3 the run is not spiking; it is dead — a different failure with a different signature." },

    { t: "h2", n: "03", text: "The flat loss, dead units, the forgotten eval()", id: "flat" },

    { t: "code", lang: "text", title: "Three signatures (executed here or in module 1)",
      code: `flat loss:   output layer frozen (excluded from the optimiser, or requires_grad False) ->
             loss stays at 2.3026 = ln 10; output variance across inputs 0.0e+00
             -- the network predicts the class prior for every input. Signatures: loss = ln K to four decimals, outputs
                identical across inputs, accuracy = the majority class rate

dead units:  lr 1.0 on a ReLU MLP (1.2): dead fractions per layer 0.70, 0.84, 1.00; loss frozen at ln 10
             -- the same flat loss, from a different cause: every unit in a layer is off for every input

forgotten eval():  BatchNorm in train mode at test (1.6): 0.719 at batch 8 against 0.957; batch 1 raises
                   dropout in train mode at test: two calls on the same input differ (exercise: 'eval mode deterministic' FAIL)`,
      caption: "The flat loss has at least four causes — a frozen output layer, dead units, a learning rate of zero (an optimiser built on the wrong parameters), and inputs that carry no signal — and the same number every time. The output variance across inputs separates 'predicting the prior' from 'learning slowly'." },

    { t: "h2", n: "04", text: "The two tests", id: "tests" },

    { t: "p", text: "**Overfit one batch.** Take 32 examples and train on them alone for a few hundred steps. A correct pipeline drives the loss to nearly zero; a pipeline that cannot memorise 32 examples has a bug in the model, the loss, the optimiser or the data path:" },

    { t: "code", lang: "text", title: "Overfit-one-batch on six pipelines (executed, 300 Adam steps)",
      code: `correct pipeline                                   final loss 0.00023     PASS
bug: labels shuffled relative to the inputs          final loss 0.00057     PASSES -- a random pairing is just as memorisable
bug: inputs on a 0..255 scale instead of 0..1        final loss 0.00000     PASSES -- scale does not stop memorisation
bug: 9-class output head with a label 9 present       IndexError: Target 9 is out of bounds   (caught, but by the runtime)
bug: learning rate 0 (optimiser on the wrong params)  final loss 2.3153     FAIL
bug: loss reduction='sum' with a rate tuned for mean  final loss 0.0000     PASSES -- 32× the rate happened to survive`,
      caption: "The test catches everything that prevents learning and nothing that permits the wrong learning. Shuffled labels, wrong input scale and a mis-scaled loss all pass; they are caught by the other tests, by the validation curve, or by the learning-rate finder. Run it first because it is fast and because a failure is unambiguous." },

    { t: "p", text: "**Shuffled labels.** Randomly permute the training labels and train. The network should still reach high *training* accuracy — showing it has the capacity to memorise — and *test* accuracy on the true labels should be chance. A test score above chance under shuffled training labels can only come from information leaking from the test set into the pipeline:" },

    { t: "code", lang: "text", title: "Shuffled-label test (executed, 150 epochs, width 256)",
      code: `training accuracy on the random labels  1.000     -- 1,257 random labels memorised: capacity is not the constraint
test accuracy on the true labels        0.109     -- chance (0.1): no leakage`,
      caption: "Two facts from one run. Zhang et al. (2017) made this the standard demonstration that generalisation is not explained by capacity limits — the same network that memorises noise also generalises on real labels (1.7). And as a leakage test it is definitive: with random training labels there is nothing legitimate to learn, so any test signal is a bug." },

    { t: "h2", n: "05", text: "Input scale", id: "scale" },

    { t: "code", lang: "text", title: "The same network and rates, three input scales (executed, 10 epochs)",
      code: `                      lr 0.001    lr 0.01    lr 0.05
inputs in 0..1         0.141       0.804      0.963
inputs in 0..16        0.926       0.972      0.961
inputs in 0..255       0.965       0.102      NaN`,
      caption: "Unscaled inputs do not stop training; they move the usable learning rate by a factor equal to the scale. On 0..255 the rate that was best for 0..1 diverges and the rate that was useless for 0..1 is best. Standardise the inputs so that the learning-rate knowledge from every other run transfers — and so that the first layer's gradient (δ ⊗ input, 1.4) is not 255× larger than every other layer's." },

    { t: "h2", n: "06", text: "What to monitor", id: "monitor" },

    { t: "code", lang: "text", title: "Three quantities on a healthy run (lr 0.05) and one step of an unhealthy one (executed)",
      code: `                      update/weight per layer                  activation std per layer   dead fraction
step  0 (lr 0.05)     3.6e-04  4.7e-04  4.5e-04  2.0e-03       0.16  0.07  0.04           0.05  0.06  0.21
step 20               2.8e-03  3.1e-03  2.9e-03  9.8e-03       0.16  0.08  0.05           0.05  0.09  0.17
step 59               1.3e-02  1.3e-02  1.3e-02  3.2e-02       0.36  0.47  0.65           0.05  0.14  0.16
step  0 at lr 2.0     1.5e-02  1.9e-02  1.8e-02  8.0e-02       -- forty times the healthy step-0 ratio`,
      caption: "The update-to-weight ratio ‖Δw‖/‖w‖ per layer is the most informative single number: around 10⁻³ per step is the classic healthy range (Karpathy's rule), 10⁻² is fast, 10⁻¹ is destruction. The healthy run's ratio grows as momentum builds; at lr 2.0 the very first step is already at the top of the range. Activation stds should sit in a moderate range and not collapse toward zero or grow layer by layer; the dead fraction should stay in single digits for early layers." },

    { t: "table", head: ["Log every step", "Log every epoch", "Alarm when"],
      rows: [
        ["loss.item(), learning rate", "validation loss and metric", "loss not finite; loss > 2× its recent median"],
        ["pre-clip gradient norm", "update/weight ratio per layer", "norm > 10× median; ratio > 10⁻¹ or < 10⁻⁵"],
        ["fraction of steps clipped", "activation std and dead fraction per layer", "clipped > 5 %; dead > 30 %; std collapsing"],
        ["throughput (examples/s)", "weight norm per layer", "throughput halves (data loader, memory); weight norm growing without bound"]
      ] },

    { t: "h2", n: "07", text: "The decision flow and the checklist", id: "flow" },

    { t: "code", lang: "text", title: "From symptom to first action",
      code: `loss is NaN/inf
  ├─ from step 1 ─────────── data (finite? scaled?), loss from logits, a division by zero          -> (a)(b)(e)
  └─ after N steps ────────── gradient norm rising before it? -> rate too high: lower, warm up, clip  -> (c)(d)
                              norm fine, then sudden? -> a bad batch or float16 overflow (2.5)
loss flat at ln K
  ├─ outputs identical across inputs ─ frozen/unregistered output layer, lr 0, all units dead
  └─ outputs vary ────────── rate too low, inputs unscaled (the 0..1 / lr 0.001 cell: 0.141), or no signal in the data
loss spikes
  └─ norm above median before each ─ rate too high for this region: clip (0.552 -> 0.746), lower the rate, longer warmup
training loss falls, validation does not
  ├─ validation never above chance ─ leakage-free but useless features, or a label/feature misalignment (shuffled-label test)
  └─ validation rises then falls ──── overfitting: early stopping first (1.7)
training loss will not fall on one batch
  └─ model / loss / optimiser bug ─── overfit-one-batch fails only here; every other bug passes it
different results on the same input
  └─ eval() forgotten (dropout, BatchNorm), or non-determinism (2.2)`,
      caption: "Every branch ends in something measured on this page or in module 1. The flow is worth following literally the first ten times; after that the signatures are recognisable at a glance." },

    { t: "dl", items: [
      ["Distributed failures (not run here — no multi-GPU)", "Two that the reference lists: a hang when ranks disagree on the number of steps (one rank's loader has one more batch — use drop_last or a shared length), and a silent divergence when a rank's gradient is not all-reduced (a parameter unused on some ranks; find_unused_parameters). Both show as a run that stops or as ranks whose losses differ; the fix is to log per rank."],
      ["The production training checklist", "Data: finite, scaled, labels in range, splits disjoint (hash-checked). Model: parameter count printed, initial loss ≈ ln K (measured 2.305), overfit-one-batch passes, shuffled-label test at chance. Loop: zero_grad, eval()/no_grad() for validation, scheduler stepped, full-state checkpoints, gradient norm logged and clipped as insurance. Run: learning rate from a finder, warmup, seeds recorded, three seeds before a conclusion."]
    ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A run's loss is exactly 2.3026 for a hundred steps on a ten-class problem and the outputs are identical for every input. What is happening?",
          options: [
            "The learning rate is slightly too low",
            "The network is predicting the class prior: ln 10 = 2.3026 is the cross-entropy of a uniform prediction, and identical outputs mean the input is not reaching the output — a frozen or unregistered output layer, an optimiser on the wrong parameters, or a layer of dead units",
            "The data are too hard",
            "The loss function is wrong"
          ],
          answer: 1,
          why: "The exact value is the diagnosis: a slow run drifts below ln K, a run predicting the prior sits on it to four decimals. Output variance across inputs of 0.0 (measured) separates the cause from a merely slow run, whose outputs vary."
        },
        {
          stem: "The overfit-one-batch test passed on a pipeline whose labels were shuffled relative to the inputs (loss 0.0006). What does that tell you about the test?",
          options: [
            "The test is broken",
            "The test detects only whether the pipeline can memorise 32 examples — any pairing of inputs and labels is memorisable — so it catches bugs that prevent learning (lr 0: loss 2.32) and none that permit learning the wrong thing; misalignment is caught by the validation curve or the shuffled-label test",
            "Shuffled labels are not a bug",
            "The batch was too small"
          ],
          answer: 1,
          why: "A cheap test with a precise scope. Its value is that a failure is unambiguous and immediate; its limit is that a pass proves only that gradient descent works end to end. Both facts were measured."
        },
        {
          stem: "Two steps before the first NaN, the logged gradient norm was 5.8 × 10⁶. What should the loop have done?",
          options: [
            "Nothing; NaN is unpredictable",
            "Alarmed on a norm ten times its median and stopped or lowered the rate — the explosion was visible two steps early; with clipping as insurance the step would have been bounded, and the real fix is the learning rate (3.0 here) or a warmup",
            "Switched to float64",
            "Increased the batch size"
          ],
          answer: 1,
          why: "The norm log is the earliest signal a run gives. Clipping bounds the damage; the alarm is what turns a crash after an hour into a stop after a second."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "A sanity suite, run on one correct pipeline and four broken ones",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Write sanity_suite(net, opt, X, y) that returns pass/fail with a detail string for seven checks: inputs finite; output varies across inputs; eval mode deterministic (two calls equal); every parameter receives a non-zero gradient; every parameter moves after one optimiser step; overfit-one-batch (32 examples, 200 Adam steps, loss < 0.01); initial loss within 0.5 of ln K on a freshly re-initialised copy." },
        { t: "p", text: "Run it on a correct 64-128-128-10 pipeline and on four broken ones: (A) the optimiser built without the first layer's parameters; (B) one NaN in the training data; (C) the output layer frozen with requires_grad = False; (D) dropout that stays active in eval mode. Report which checks fail for each." }
      ],
      requirements: [
        "Five reports of seven checks each.",
        "A one-line statement of which check is the unique detector for each bug."
      ],
      hint: "For 'moves', clone every parameter before the step and compare with torch.equal after. For the initial-loss check, deepcopy the model and call reset_parameters() on each layer that has one. Bug D can be simulated by a Dropout subclass whose forward ignores self.training.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# correct pipeline:   all seven PASS   (overfit loss 0.0027; initial loss 2.305 vs ln 10 = 2.303)
#
# bug A, optimiser missing layer 1:   FAIL  every parameter moves            unmoved: ['0.weight', '0.bias']
#                                     PASS  everything else -- including overfit-one-batch (0.0034): two layers can memorise 32 examples
# bug B, one NaN in the data:         FAIL  inputs finite (1), output varies (nan), eval deterministic (nan != nan),
#                                           overfit-one-batch (nan), initial loss (nan)    -- one bad value fails five checks
# bug C, output layer frozen:         FAIL  every parameter has a gradient   no gradient: ['5.weight', '5.bias']
#                                     FAIL  every parameter moves            unmoved: ['5.weight', '5.bias']
#                                     FAIL  overfit-one-batch                final loss 0.0229
# bug D, dropout active at inference: FAIL  eval mode deterministic          two calls differ
#                                     FAIL  overfit-one-batch                final loss 0.0259 (noise in every forward)
#
# unique detectors: A -> 'moves';  B -> 'inputs finite';  C -> 'has a gradient';  D -> 'eval deterministic'`,
        notes: [
          { t: "p", text: "Bug A is the one to remember: the overfit test passes, the loss falls, accuracy is fine — and the first layer is frozen at its random initialisation for the whole run. Only 'does every parameter move' sees it." },
          { t: "p", text: "Bug B fails five checks at once, which is itself the signature: when everything is NaN, look at the data first." },
          { t: "p", text: "The suite takes a few seconds; run it at the start of every project and after every refactor of the model or the loop." }
        ]
      }
    }
  ],

  takeaways: [
    "NaN has a handful of causes, each reproduced: log of an underflowed probability (inf), division by a zero std (NaN), a rate too high (norm 5.8 × 10⁶ two steps before the first NaN at lr 3.0), and one NaN in one input pixel poisoning all 8 parameter tensors in one backward. The fixes are data checks, loss-from-logits, ε in divisions, the rate, clipping, anomaly mode to locate.",
    "Spikes are preceded by a gradient norm above the run's median (2.9–5.6 vs 2.2 at lr 0.15); clipping bounded them and took 0.552 to 0.746; at a higher rate the run is not spiking but dead from step one.",
    "A loss at exactly ln K with zero output variance across inputs is the network predicting the prior — frozen or unregistered output layer, lr 0, or dead units — and is different from a slow run, whose outputs vary.",
    "Overfit-one-batch fails only for bugs that prevent learning (lr 0: loss 2.32) and passes shuffled labels, wrong input scale and a mis-scaled loss; the shuffled-label test proves capacity (train 1.000 on random labels) and detects leakage (test 0.109 = chance).",
    "Input scale shifts the usable learning rate by the scale factor: 0..255 inputs diverged at the rate that was best for 0..1 and trained best at the rate that was useless for 0..1. Standardise.",
    "Monitor the pre-clip gradient norm every step and the per-layer update/weight ratio (healthy ~10⁻³, 40× that at lr 2.0), activation std and dead fraction every epoch; alarm on norm > 10× median, ratio > 10⁻¹, clipped > 5 %, dead > 30 %."
  ],

  quiz: {
    title: "Debugging and Training Instability — Knowledge Check",
    questions: [
      {
        stem: "What is the update-to-weight ratio, and what range indicates a healthy run?",
        options: [
          "The learning rate divided by the batch size; it should be 1",
          "‖Δw‖/‖w‖ per layer per step — the fraction by which a layer's weights change in one update; around 10⁻³ is the classic healthy range, 10⁻² is aggressive, 10⁻¹ is destructive, and 10⁻⁵ means the layer is not learning",
          "The gradient norm divided by the loss",
          "The ratio of training to validation loss"
        ],
        answer: 1,
        why: "It normalises the learning rate by the scale of each layer's weights and gradients, which is why it is comparable across layers and architectures. The healthy run measured 4 × 10⁻⁴ to 3 × 10⁻² as momentum built; lr 2.0 started at 8 × 10⁻² on the output layer."
      },
      {
        stem: "Why does torch.autograd.set_detect_anomaly(True) exist, and why not leave it on?",
        options: [
          "It prevents NaN from occurring; it is always on by default",
          "It checks every backward node for non-finite values and reports the forward operation that produced the first one — locating a NaN to a line — at roughly a tenfold slowdown, so it is enabled for one reproduction and then disabled",
          "It replaces NaN with zero",
          "It only works on GPUs"
        ],
        answer: 1,
        why: "The norm log tells you when; anomaly mode tells you which operation. Together they turn a NaN from a mystery into a stack trace. The measured run raised nothing because that loss happened to be finite — it reports only actual non-finite values."
      },
      {
        stem: "Training loss falls steadily; validation accuracy stays at exactly chance for the whole run. Which is the most likely cause and the test that confirms it?",
        options: [
          "Overfitting; add dropout",
          "A misalignment between features and labels in the validation path (or between train and validation preprocessing) — the model learns something on training data that has no relation to the validation labels; the shuffled-label test on the training set should give chance on validation, and if the real labels also give chance, the validation pairing is wrong",
          "The learning rate is too high",
          "The model is too small"
        ],
        answer: 1,
        why: "Overfitting shows a validation curve that rises and then falls, not one pinned at chance. Chance throughout means the validation targets carry no information about the validation inputs as the model sees them — a shuffled DataFrame, a different scaler, or a label offset. The decision flow's 'validation never above chance' branch."
      },
      {
        stem: "Which of these is NOT caught by the overfit-one-batch test?",
        options: [
          "An optimiser constructed with lr = 0",
          "An output layer whose parameters are frozen",
          "Labels shuffled relative to inputs — any pairing of 32 inputs and labels is memorisable, so the loss goes to 0.0006 just as it does for correct labels",
          "A loss function that returns a constant"
        ],
        answer: 2,
        why: "The test's scope is 'can gradient descent reduce this loss on this batch', which a misalignment does not prevent. The measured pass at loss 0.0006 is why the suite has seven checks rather than one."
      },
      {
        stem: "Why should inputs be standardised even though a network can train on 0..255 inputs at some learning rate?",
        options: [
          "Because PyTorch requires it",
          "Because the input scale multiplies the first layer's gradient (δ ⊗ input) and so shifts the usable learning rate by the scale factor — 0..255 diverged at the rate best for 0..1 and needed one fifty times smaller — making every other layer's rate wrong and every learning-rate rule from other runs untransferable",
          "Because unscaled inputs cause dead ReLUs",
          "Because it reduces memory"
        ],
        answer: 1,
        why: "The three-scale table shows the best rate sliding with the scale. Standardisation is what makes 'lr 10⁻³ for Adam' a sensible default rather than a value that depends on the units of column three."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Debugging and Training Instability",
    sub: "NaN causes, the norm log, the flat loss, the two tests and their limits, monitoring, and the decision flow.",
    questions: [
      {
        level: "Core",
        q: "Your training loss becomes NaN. Walk me through the diagnosis.",
        strong: "First, when. NaN from the very first steps points to the data or the loss: a non-finite value in the input — I showed one NaN pixel producing NaN gradients in every parameter tensor after one backward — a constant column standardised to (x − μ)/0, or a loss that takes the log of a probability that underflowed, which cross-entropy from logits avoids. NaN after some steps points to the optimisation: the gradient norm log shows it — at lr 3.0 the norm was 5.8 × 10⁶ two steps before the first NaN and 3 × 10¹⁰ one step before — so the rate is too high for the region the weights reached, and the fixes are a lower rate, warmup, and clipping as insurance. If the norm was flat and the loss became NaN suddenly, suspect a bad batch or float16 overflow if mixed precision is on. To locate the exact operation, set_detect_anomaly(True) for one reproduction. Then I add the checks that would have caught it earlier: assert inputs finite, ε in every division, an alarm on the norm.",
        answer: [
          { t: "p", text: "Timing as the first split, the data/loss causes with executed examples, the norm-log evidence, anomaly mode, and the preventive checks." }
        ]
      },
      {
        level: "Core",
        q: "The loss will not decrease. What do you check?",
        strong: "Its value first. If it sits at ln K — 2.3026 for ten classes, to four decimals — and the outputs are identical across inputs, the network is predicting the prior: the output layer is frozen or not registered, the optimiser was built on the wrong parameters (lr effectively zero), or a layer of ReLUs is dead. Each is a five-second check: does every parameter receive a gradient and move after one step, what is the dead fraction per layer. If the loss is below ln K but barely moving, it is a rate problem — too low, or inputs on a scale that shifts the usable rate; on 0..255 inputs the rate that worked for 0..1 was useless. Then the overfit-one-batch test: 32 examples, a few hundred steps, and a correct pipeline reaches loss 0.0002; if it does not, the bug is in the model, the loss or the optimiser and I bisect there. If it does, the pipeline can learn and the problem is the data or the schedule — the validation curve and the shuffled-label test are next.",
        answer: [
          { t: "p", text: "The ln K signature, the three causes with their checks, the scale case, and the overfit test as the bisection point." }
        ]
      },
      {
        level: "Core",
        q: "What are the overfit-one-batch and shuffled-label tests, and what does each prove?",
        strong: "Overfit-one-batch: train on a single batch of ~32 for a few hundred steps; a correct pipeline drives the loss to nearly zero — 0.0002 measured. It proves gradient descent works end to end through the data path, the model, the loss and the optimiser, and it fails unambiguously for anything that blocks learning: a zero learning rate gave 2.32. It does not prove the pipeline learns the right thing — shuffled labels reached 0.0006, unscaled inputs 0.0000 — because any pairing of 32 examples is memorisable. Shuffled labels: permute the training labels and train fully; training accuracy should reach nearly 100 % (1.000 measured, proving capacity is not the constraint, the Zhang et al. result) and test accuracy on the true labels should be chance (0.109). Any test signal under random training labels can only be leakage, since there is nothing legitimate to learn, so it is the definitive leakage test. Together they bracket the pipeline: the first says it can learn, the second says what it learns is not coming from the test set.",
        answer: [
          { t: "p", text: "Both procedures, what each proves and does not with the executed passes and failures, and how they complement each other." }
        ]
      },
      {
        level: "Advanced",
        q: "What do you log during training and what thresholds do you alarm on?",
        strong: "Every step: the loss as a float, the learning rate, and the pre-clip gradient norm, which is the earliest warning a run gives — spikes were preceded by norms above the median in every case I measured, and the NaN at lr 3.0 was announced two steps ahead. Also the fraction of steps that clipping fires on; a few per cent is insurance, most steps means the threshold has become the learning rate. Every epoch: validation metrics; per-layer update-to-weight ratios, where about 10⁻³ is healthy and the run at lr 2.0 started at 8 × 10⁻²; per-layer activation standard deviations and dead fractions, which should be moderate and in single digits respectively; weight norms; and throughput, which halving usually means a data-loading or memory problem. Alarms: any non-finite loss; loss above twice its recent median; gradient norm above ten times its median; ratio above 10⁻¹ or below 10⁻⁵; clipped steps above 5 %; dead fraction above 30 %. On a multi-GPU run, all of it per rank, because the distributed failures — a hang from mismatched step counts, a silent divergence from an un-reduced parameter — show as ranks that disagree.",
        answer: [
          { t: "p", text: "Per-step and per-epoch quantities with measured healthy values, the alarm thresholds, and the per-rank rule." }
        ]
      }
    ]
  }
});

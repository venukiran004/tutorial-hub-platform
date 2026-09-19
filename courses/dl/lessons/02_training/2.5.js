/* ============================================================================
   LESSON 2.5 — Mixed Precision, Label Smoothing and Distillation
   ========================================================================= */
EC.receiveLesson({
  id: "2.5",

  lede: "**Three techniques that change what the network is trained on rather than how: fewer bits, softer targets, and a second network's opinion.** Half precision overflows at 65,504 (300 × 300 is inf) and its gradients underflow, so training with it needs a scale factor and a format decision — bf16 keeps float32's range at the price of a 7-bit mantissa. Label smoothing replaces the one-hot target with 0.91 and nine 0.01s, which gives the loss a finite optimum (a logit gap of exactly 4.511) and, on 5,000 MNIST images, 1.3 points of accuracy along with a model that is *under*-confident. Distillation trains a 50,890-parameter student on a 1.86-million-parameter teacher's soft outputs: nothing when the student already has enough labels, +1.7 points with 2,000 labels, +5 points with 20,000 unlabelled images — and the teacher's hard pseudo-labels did just as well as its soft ones.",

  objectives: [
    "State the range and precision of float32, float16 and bfloat16, reproduce overflow and underflow, and explain loss scaling",
    "Run autocast and a manual GradScaler loop, and report what changes in dtype, accuracy and time",
    "Derive the label-smoothed target and its optimal logit gap, and measure accuracy, confidence and calibration against ε",
    "Implement knowledge distillation with temperature and the T² factor, and explain the teacher's dark knowledge",
    "Read the distillation results honestly: when it helps, when it does not, and what the unlabelled pool contributed"
  ],

  prerequisites: ["2.3", "1.3"],

  blocks: [

    { t: "h2", n: "01", text: "The number formats", id: "formats" },

    { t: "code", lang: "text", title: "Three floating-point formats (executed with torch.finfo)",
      code: `format      max         smallest normal   eps (1 + eps ≠ 1)   mantissa bits
float32     3.4e+38     1.2e-38           1.2e-07             23
float16     6.6e+04     6.1e-05           9.8e-04             10
bfloat16    3.4e+38     1.2e-38           7.8e-03              7

fp16 overflow:   70000 -> inf;   300 × 300 -> inf                     -- a logit of 300 squared is already gone
fp16 underflow:  1e-8 -> 0.0;    1e-8 × 65536 -> 6.6e-04            -- the small gradient vanishes unless scaled first
bf16 precision:  1 + 0.001 -> 1.0;   1 + 0.01 -> 1.0078              -- steps of 1/128 near 1
fp16 precision:  1 + 0.001 -> 1.00098                                 -- steps of 1/1024 near 1`,
      caption: "float16 trades range for precision; bfloat16 keeps float32's exponent and gives up mantissa. The two failure modes follow: fp16 overflows on large activations and underflows on small gradients, needing loss scaling; bf16 does neither but represents 1.001 as 1.0, which is fine for activations and gradients and not fine for the master weights or the optimiser state." },

    { t: "p", text: "How real is the underflow risk? On one batch through a 784-256-10 MLP, 1.7 % of gradient entries were below fp16's smallest normal number. Cast to fp16, 0.0 % became exactly zero — subnormals caught them this time — but the margin is thin, and in deeper networks with smaller gradients it is not there. Loss scaling multiplies the loss by a large constant before backward (so every gradient is scaled up out of the underflow zone), then divides the gradients by the same constant before the optimiser step:" },

    { t: "code", lang: "python", title: "Mixed precision: autocast plus loss scaling (executed on the CPU with bfloat16)",
      code: `with torch.autocast("cpu", dtype=torch.bfloat16):     # "cuda" and float16 on a GPU
    loss = F.cross_entropy(net(x), y)
# under autocast: Linear outputs are bfloat16, the loss is float32 (reductions stay in fp32), parameters stay float32

# GradScaler by hand (torch.cuda.amp.GradScaler does this):
scale = 65536.0
(loss * scale).backward()
if not all gradients finite:  scale /= 2; skip the step          # overflow: shrink and retry
else:  divide every gradient by scale; optimizer.step()          # and every ~2000 clean steps, double the scale

MNIST 784-1024-1024-10, 20k images, 3 epochs, Adam:
  fp32            acc 0.9672   15.9 s
  autocast bf16   acc 0.9674   42.0 s      -- 2.6× SLOWER on this CPU: no bf16 hardware; the point is the GPU's tensor cores`,
      caption: "Accuracy is unchanged and the CPU run is slower, which is the honest result: mixed precision is a hardware feature. On a GPU with tensor cores the same code is typically 1.5–3× faster and halves the activation memory; here it exercises the mechanics only. The master weights stay float32 — autocast casts inputs per operation, never the parameters." },

    { t: "dl", items: [
      ["What autocast casts", "Matrix multiplies and convolutions run in the low-precision type; reductions (softmax, loss, norms) stay in float32; the parameters and optimiser state stay float32. That is why the loss dtype printed as float32 under autocast."],
      ["fp16 vs bf16", "fp16 needs a GradScaler and can still overflow in attention logits; bf16 needs nothing and is the default on Ampere-class GPUs and TPUs. bf16's coarse mantissa (relative error 2.5 × 10⁻³ through eight layers, exercise) is tolerated by training; fp16's finer mantissa gave 3.7 × 10⁻⁴."],
      ["Pitfalls (30_DL_Training_Instability §5)", "A loss computed outside autocast on bf16 logits; BatchNorm statistics accumulated in half precision; a hand-written softmax in fp16 (overflow at logits above ~11 after exponentiation is only safe because of the max-subtraction, 1.2); optimiser state in fp16 (Adam's v underflows). Keep reductions and state in float32."]
    ] },

    { t: "h2", n: "02", text: "Label smoothing", id: "smoothing" },

    { t: "p", text: "Cross-entropy against a one-hot target has no finite minimum: the loss keeps falling as the true logit grows without bound (exercise: after 3,000 Adam steps the logit gap was 10.7 and still growing). Label smoothing replaces the target with (1 − ε) on the true class and ε/K on each class:" },

    { t: "code", lang: "text", title: "The smoothed target and its optimum (executed)",
      code: `ε = 0.1, K = 10, true class 3:   target = [0.01, 0.01, 0.01, 0.91, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01]

train a free logit vector against it:  optimal p_true = 0.9100,  logit gap true − others = 4.511
                                         = log(0.91 · 9 / 0.09)  -- exactly the predicted value
minimum loss 0.5003 = the entropy of the target                  -- a finite floor, where one-hot has none`,
      caption: "The optimum is finite and the logits stay bounded (mean logit norm 4.6 with smoothing against 27.3 without, below): the network is discouraged from becoming arbitrarily confident. That is the regulariser." },

    { t: "code", lang: "text", title: "5,000 MNIST images, 784-256-10, Adam, 20 epochs, 3 seeds (executed)",
      code: `ε=0.0   test acc 0.9456 ± 0.0005   mean confidence 0.971   ECE 0.0255   mean logit norm 27.3
ε=0.1   test acc 0.9585 ± 0.0006   mean confidence 0.822   ECE 0.1369   mean logit norm  4.6
ε=0.2   test acc 0.9585 ± 0.0011   mean confidence 0.727   ECE 0.2315   mean logit norm  3.7`,
      caption: "Accuracy rose by 1.3 points at ε = 0.1 and no further at 0.2. Calibration moved the other way: the unsmoothed model's confidence (0.971) already matched its accuracy (0.946), and smoothing pushed confidence down to 0.82 on a model that is right 96 % of the time — the expected calibration error rose from 0.026 to 0.137. The published claim that smoothing improves calibration holds for over-confident models; this small one was not over-confident, and smoothing made it under-confident. Measure both." },

    { t: "callout", kind: "info", title: "Where label smoothing is used",
      body: "Inception-v3 introduced it (ε = 0.1) and it is standard in ImageNet training and in transformer training for translation. Two interactions to know: it makes the penultimate features cluster tightly, which hurts *distillation from* a smoothed teacher in Müller et al.'s experiments — though the teacher below was smoothed precisely so that its outputs would not be one-hot, and it worked; and it should not be combined with a loss that already softens targets (mixup, 1.7) without checking the dose."
    },

    { t: "h2", n: "03", text: "Knowledge distillation", id: "distillation" },

    { t: "p", text: "A large teacher's output distribution carries more than the label: which wrong classes are plausible for this input — Hinton's *dark knowledge*. Distillation trains a small student to match the teacher's softened distribution, with a temperature T that spreads the probability mass so the small entries are visible:" },

    { t: "code", lang: "python", title: "The distillation loss",
      code: `soft = F.kl_div(F.log_softmax(s / T, 1), F.softmax(t / T, 1), reduction="batchmean") * T * T
hard = F.cross_entropy(s, y)
loss = alpha * soft + (1 - alpha) * hard

# the T² factor: the gradient of the soft term scales as 1/T²  (exercise, executed)
#   T=1 ‖∂KL/∂s‖ = 0.506     T=2 0.136 (×T² = 0.543)     T=4 0.034 (×T² = 0.541)     T=8 0.008 (×T² = 0.531)
#   multiplying by T² keeps the soft term's weight relative to the hard term roughly constant as T changes`,
      caption: "s are the student's logits, t the teacher's (computed once, detached); kl_div takes log-probabilities as input and probabilities as target (1.3). At T = 1 the soft target is nearly one-hot for a confident teacher and there is nothing to distil — which is the first result below." },

    { t: "code", lang: "text", title: "Attempt one: a confident teacher and a student with enough labels (executed)",
      code: `teacher 784-1024-1024-10 (1,863,690 params) on 10k images:  test acc 0.9634
teacher's soft targets for one image, true class 5:
   T=1  [0, 0, 0, 0, 0, 1.000, 0, 0, 0, 0]
   T=4  [0, 0, 0, 0.003, 0, 0.996, 0, 0, 0, 0]              -- no dark knowledge: the teacher is one-hot even at T=4

student 784-32-10 (25,450 params, 73× smaller), 15 epochs on the same 10k, 3 seeds:
  labels only               0.9371 ± 0.0013
  KD T=1 α=0.9              0.9347 ± 0.0039
  KD T=4 α=0.9              0.9319 ± 0.0021
  KD T=10 α=0.9             0.9232 ± 0.0027
  KD T=4 α=0.5              0.9314 ± 0.0033
  KD T=4, no labels         0.9325 ± 0.0035
  KD T=4 + feature hint     0.9310 ± 0.0025`,
      caption: "Distillation did nothing, and higher temperatures hurt. Two reasons, both visible in the numbers: the teacher's outputs are one-hot to three decimals, so the soft targets carry no more than the labels; and the student already has 10,000 labels, which is enough for a 25k-parameter network to reach 0.937 on its own. A negative result worth having — it says what distillation needs." },

    { t: "code", lang: "text", title: "Attempt two: a smoothed teacher, a label-poor student, and an unlabelled pool (executed)",
      code: `teacher on all 60k images with label smoothing 0.1, 8 epochs:  test acc 0.9844      (178 s)
teacher's T=4 soft targets for three images (true 5, 0, 4):
   [0.082, 0.088, 0.086, 0.117, 0.081, 0.223, 0.084, 0.086, 0.077, 0.075]     -- 5 first, 3 second: a 5 that could be a 3
   [0.239, 0.088, 0.080, 0.084, 0.085, 0.080, 0.082, 0.086, 0.089, 0.086]
   [0.086, 0.099, 0.083, 0.086, 0.240, 0.078, 0.080, 0.078, 0.086, 0.083]
   mean entropy 2.20 nats (one-hot: 0)

student 784-64-10 (50,890 params), 3 seeds:
  labels only, 2,000 labelled images, 40 epochs         0.9055 ± 0.0015
  KD T=4 α=0.9 on the 2,000                             0.9221 ± 0.0007     +1.7
  KD T=1 α=0.9 on the 2,000                             0.9159 ± 0.0005     +1.0
  KD T=4, no labels at all, on the 2,000                0.9213 ± 0.0009     +1.6  -- the teacher's opinion alone beats the labels
  KD T=4 on the 2,000 + 20,000 unlabelled, 6 epochs     0.9566 ± 0.0004     +5.1
  teacher's HARD pseudo-labels on the same 22,000       0.9581 ± 0.0004     +5.3`,
      caption: "With a teacher whose outputs carry information and a student short of labels, distillation earns 1.7 points, and T = 4 beats T = 1. The large gain comes from the unlabelled pool — 20,000 images the student could not otherwise use — and there the teacher's argmax did as well as its soft distribution. On MNIST the label is nearly all the information; the dark knowledge is small. On harder tasks the soft targets matter more, but the pool of unlabelled data is the lever to check first." },

    { t: "dl", items: [
      ["Logit distillation", "The KL term above: match the teacher's output distribution. Hinton, Vinyals & Dean (2015)."],
      ["Feature distillation", "Add an MSE between a student layer (through a learned projection) and a teacher layer — FitNets 'hints'. Attempt one included it (0.9310, no gain there); it matters more when the student is much shallower and for detection (11.2)."],
      ["Self- and teacher-free distillation", "Distil a network into an identical architecture (born-again networks) or into itself across training; gains of a fraction of a point are reported. The mechanism is the same regularisation as label smoothing with input-dependent targets."],
      ["Progressive / teacher-assistant", "When the gap between teacher and student is very large, distil through an intermediate-size network; a 73× gap here was fine, a 1000× gap often is not."],
      ["For LLMs (pointer)", "Sequence-level distillation trains the student on the teacher's generated outputs — the pseudo-label row above at scale; module GenAI covers it."]
    ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why does float16 training need loss scaling while bfloat16 does not?",
          options: [
            "Because bfloat16 is more precise",
            "Because float16's smallest normal number is 6 × 10⁻⁵ and gradients below it underflow to zero (1e-8 → 0.0 measured), so the loss is multiplied by a large factor before backward and the gradients divided after; bfloat16 keeps float32's exponent range (smallest normal 1.2 × 10⁻³⁸), so nothing underflows",
            "Because float16 is only available on GPUs",
            "Because bfloat16 stores gradients in float32"
          ],
          answer: 1,
          why: "The formats differ in how they spend their 16 bits: fp16 on mantissa (precision), bf16 on exponent (range). Underflow and overflow are range problems, hence the scaler for fp16; bf16's cost is precision (1 + 0.001 = 1.0), which training tolerates."
        },
        {
          stem: "Label smoothing at ε = 0.1 raised test accuracy from 0.9456 to 0.9585 but raised the expected calibration error from 0.026 to 0.137. How do you reconcile this with the claim that smoothing improves calibration?",
          options: [
            "The claim is false",
            "The claim holds for over-confident models; this model's confidence (0.971) already matched its accuracy (0.946), and smoothing pushed confidence to 0.82 on a model that is right 96 % of the time — under-confidence is also miscalibration, and both effects must be measured rather than assumed",
            "ECE was computed wrongly",
            "Smoothing only improves calibration at ε = 0.2"
          ],
          answer: 1,
          why: "Smoothing bounds the logits (norm 27 → 4.6), which pulls confidence toward (1 − ε) regardless of accuracy. Whether that improves or worsens calibration depends on where the model started; the executed numbers show the second case."
        },
        {
          stem: "In attempt one, distillation with a 96.3 % teacher did not help a student with 10,000 labels; in attempt two, a 98.4 % smoothed teacher helped a student with 2,000 labels by 1.7 points and by 5 points with an unlabelled pool. What does distillation need?",
          options: [
            "A higher temperature",
            "A teacher whose outputs carry information beyond the label (the first teacher was one-hot to three decimals even at T = 4; the second had entropy 2.2 nats) and a student that is short of information — few labels or, better, a pool of unlabelled inputs the teacher can label",
            "A student with more parameters",
            "A feature hint"
          ],
          answer: 1,
          why: "Both conditions were measured: soft targets with no entropy transfer nothing, and a student with enough labels has nothing to gain. The unlabelled pool contributed most, and there the teacher's hard labels matched its soft ones on this task."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "bf16 error, the smoothing optimum, and the T² factor",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p", text: "**(a)** Pass a batch through an 8-layer width-256 MLP in float32, under bf16 autocast, and with the whole model cast to float16. Report the relative output error of each half-precision run against float32 and the argmax agreement." },
        { t: "p", text: "**(b)** Train a free 10-dimensional logit vector with Adam against the ε = 0.1 smoothed target for class 3. Report the optimal p_true, the logit gap between the true class and any other, and the minimum loss; compare the gap with log((1 − ε)(K − 1)/ε). Repeat against the one-hot target and report the gap after 3,000 steps." },
        { t: "p", text: "**(c)** For random student and teacher logits, compute ‖∂KL(softmax(t/T) ‖ softmax(s/T))/∂s‖ at T = 1, 2, 4, 8 and show that multiplying by T² makes it roughly constant." }
      ],
      requirements: [
        "(a) two relative errors and an agreement rate.",
        "(b) p_true, the gap, the minimum, the predicted gap, and the one-hot gap.",
        "(c) four gradient norms and their T²-scaled values."
      ],
      hint: "(b) The loss against a smoothed target is −Σ target·log_softmax(z); its minimum equals the entropy of the target, since KL is zero there. (c) Use reduction='sum' and torch.autograd; the 1/T² comes from one 1/T in the softmax argument and one in the gradient of the log-softmax.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) bf16 autocast vs fp32: relative output error 2.5e-03, argmax agreement 1.000
#     fp16 (whole model half):  relative error 3.7e-04       -- fp16 is more precise, bf16 has more range

# (b) smoothed target: optimal p_true 0.9100, logit gap 4.511 (predicted log(0.91·9/0.09) = 4.511),
#     minimum loss 0.5003 = entropy of the target 0.5003
#     one-hot target after 3,000 Adam steps: gap 10.7 and still growing -- no finite optimum

# (c) T=1 ‖∂KL/∂s‖ = 0.5059 (×T² 0.506)    T=2 0.1357 (0.543)    T=4 0.0338 (0.541)    T=8 0.0083 (0.531)`,
        notes: [
          { t: "p", text: "(a) puts numbers on the two formats' trade: bf16 is seven times less precise here and still gets every argmax right." },
          { t: "p", text: "(b) is label smoothing's mechanism in one optimisation: a finite target, a finite optimum, bounded logits." },
          { t: "p", text: "(c) is the reason Hinton's loss carries a T² and the reason the temperature can be tuned without re-tuning α." }
        ]
      }
    }
  ],

  takeaways: [
    "float16 has range 6.6 × 10⁴ and a 10-bit mantissa; bfloat16 has float32's range and a 7-bit mantissa. fp16 overflows (300 × 300 = inf) and underflows (1e-8 = 0), so it needs loss scaling; bf16 needs nothing but represents 1.001 as 1.0. Autocast casts matmuls and keeps reductions, parameters and optimiser state in float32.",
    "On this CPU bf16 autocast matched fp32 accuracy (0.9674 vs 0.9672) and was 2.6× slower — mixed precision is a hardware feature, and the speed and memory gains belong to GPUs with tensor cores.",
    "Label smoothing's target (0.91, nine 0.01s) has a finite optimum at a logit gap of log((1 − ε)(K − 1)/ε) = 4.511 and bounds the logits (norm 27 → 4.6); it gave +1.3 points on 5,000 MNIST images and made an already-calibrated model under-confident (ECE 0.026 → 0.137).",
    "Distillation matches the student's softened distribution to the teacher's with a T² factor that keeps the soft term's gradient scale constant (0.51–0.54 across T = 1…8). A one-hot teacher at T = 4 and a student with 10,000 labels gained nothing; a smoothed 98.4 % teacher and a student with 2,000 labels gained 1.7 points.",
    "The biggest distillation gain (+5 points) came from 20,000 unlabelled images the teacher labelled, and the teacher's hard pseudo-labels did as well as its soft targets — on MNIST the label holds nearly all the information. Check the unlabelled pool before the temperature.",
    "All three techniques are checked the same way: a dtype printed, a loss minimum computed, an accuracy and a calibration measured against the baseline — and reported when they fail."
  ],

  quiz: {
    title: "Mixed Precision, Label Smoothing and Distillation — Knowledge Check",
    questions: [
      {
        stem: "Under torch.autocast, which of these stays in float32?",
        options: [
          "The outputs of nn.Linear",
          "The parameters, the optimiser state and reductions such as the loss and softmax — measured: Linear outputs bfloat16, loss float32, parameters float32",
          "Nothing; everything is cast",
          "Only the inputs"
        ],
        answer: 1,
        why: "Autocast is per-operation: matmuls and convolutions run in the low-precision type for speed, and numerically sensitive reductions stay in float32. The master weights are never cast, which is why the update can be applied precisely even when the gradient was computed in half precision."
      },
      {
        stem: "A GradScaler halves its scale factor when it finds an inf gradient and skips that step. Why skip rather than clip?",
        options: [
          "Because clipping is slower",
          "Because an inf gradient means the scaled backward overflowed, so the gradient values are garbage rather than merely large — the correct response is to discard them, reduce the scale, and recompute next step; clipping would apply a bounded version of garbage",
          "Because skipping improves accuracy",
          "It does clip; the skip is a bug"
        ],
        answer: 1,
        why: "Overflow in fp16 loses the value entirely, unlike a large but finite gradient. The scaler's dynamic search — halve on overflow, double after a run of clean steps — keeps the scale as high as possible without garbage, and the skipped steps are rare."
      },
      {
        stem: "Why does cross-entropy against a one-hot target have no finite minimum, and what does label smoothing change?",
        options: [
          "It has a minimum at zero; smoothing changes nothing",
          "The loss −log p_true falls toward zero only as the true logit grows without bound (gap 10.7 after 3,000 steps and rising); a smoothed target puts ε/K on every other class, so the optimum is at a finite gap log((1 − ε)(K − 1)/ε) = 4.511 with loss equal to the target's entropy",
          "Smoothing makes the loss convex",
          "Smoothing adds L2 regularisation to the logits"
        ],
        answer: 1,
        why: "The executed optimisation shows the finite optimum exactly where the formula predicts. Bounded logits are the regularising effect, and they are also why smoothed models are less confident whether or not that improves calibration."
      },
      {
        stem: "The teacher's hard pseudo-labels on 22,000 images gave 0.9581 and its soft targets 0.9566. What is the honest conclusion?",
        options: [
          "Soft targets are useless in general",
          "On this task the value of the teacher was the labels it provided for the unlabelled pool, not the shape of its distribution; dark knowledge is small when the label is nearly all the information, and on harder tasks with more class confusion the soft targets carry more",
          "The temperature was wrong",
          "Hard labels are always better"
        ],
        answer: 1,
        why: "MNIST classes are almost never confusable, so the teacher's second-choice probabilities add little. The measurement distinguishes 'more data' from 'softer targets', which the usual presentation of distillation conflates."
      },
      {
        stem: "Why multiply the soft loss by T²?",
        options: [
          "To make the loss larger",
          "Because the gradient of the KL term with respect to the student's logits scales as 1/T² (measured 0.506, 0.136, 0.034, 0.008 at T = 1, 2, 4, 8), so without the factor raising T would silently shrink the soft term's contribution relative to the hard cross-entropy",
          "To compensate for the teacher's temperature",
          "It is a convention with no effect"
        ],
        answer: 1,
        why: "One factor of 1/T comes from the softmax argument and one from the gradient of log-softmax; T² cancels both. With it the soft term's gradient norm stayed within 0.51–0.54 across the sweep, so α means the same thing at every temperature."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Mixed Precision, Label Smoothing and Distillation",
    sub: "The formats and loss scaling, smoothing's optimum and its calibration effect, distillation's mechanism and its measured conditions.",
    questions: [
      {
        level: "Core",
        q: "What is mixed-precision training and what can go wrong?",
        strong: "Running the expensive operations — matmuls and convolutions — in a 16-bit format while keeping the master weights, optimiser state and numerically sensitive reductions in float32. It halves activation memory and, on hardware with tensor cores, speeds training by 1.5–3×; on this CPU it was 2.6× slower with identical accuracy, because there is no bf16 hardware, which is the honest reminder that it is a hardware feature. What goes wrong depends on the format. float16 has range only to 65,504 and underflows below 6 × 10⁻⁵: 300 × 300 is inf, a gradient of 1e-8 is 0. So it needs loss scaling — multiply the loss by a large factor before backward, divide the gradients after, halve the factor and skip the step on any inf — and it can still overflow in attention logits. bfloat16 keeps float32's range and gives up mantissa: 1 + 0.001 is 1.0, a relative error of 2.5 × 10⁻³ through eight layers, which training tolerates for activations but not for weights or Adam's v. The other pitfalls are BatchNorm statistics or a hand-written softmax computed in half precision; keep every reduction in float32, which autocast does for you.",
        answer: [
          { t: "p", text: "The mechanism, the executed CPU result, fp16's range failures with the scaler, bf16's precision trade, and the reduction rule." }
        ]
      },
      {
        level: "Core",
        q: "What does label smoothing do and why does it help?",
        strong: "It replaces the one-hot target with 1 − ε on the true class and ε/K on the others — for ε = 0.1 and ten classes, 0.91 and nine 0.01s. Against a one-hot target cross-entropy has no finite minimum: the loss keeps falling as the true logit grows, and after 3,000 Adam steps a free logit vector had a gap of 10.7 and rising. Against the smoothed target the optimum is finite — p_true = 0.91, a logit gap of log((1 − ε)(K − 1)/ε) = 4.511, verified numerically — so the logits stay bounded (mean norm 4.6 against 27.3) and the network cannot become arbitrarily confident on the training set. That is the regularisation, and it gave 1.3 points on 5,000 MNIST images. One caveat I would raise unprompted: it is said to improve calibration, and that holds for over-confident models; this one was already calibrated (confidence 0.971, accuracy 0.946) and smoothing made it under-confident, raising ECE from 0.026 to 0.137. It bounds confidence at about 1 − ε whether or not that is where the accuracy is.",
        answer: [
          { t: "p", text: "The target, the finite-optimum derivation with the executed gap, the accuracy gain, and the honest calibration caveat." }
        ]
      },
      {
        level: "Core",
        q: "Explain knowledge distillation and when it helps.",
        strong: "A large teacher's softmax output contains more than the label — which wrong classes are plausible for this input, Hinton's dark knowledge. Distillation trains a small student to match the teacher's distribution softened by a temperature T, with a KL term scaled by T² so its gradient magnitude does not fall as T rises (measured 0.51–0.54 across T = 1 to 8), usually mixed with the ordinary cross-entropy. I measured when it helps and when it does not. A confident teacher at 96.3 % whose outputs were one-hot to three decimals even at T = 4, distilled into a student that already had 10,000 labels: no gain at any temperature, and higher temperatures hurt. A teacher trained with label smoothing on 60,000 images (98.4 %, soft targets with 2.2 nats of entropy) distilled into a student with 2,000 labels: +1.7 points at T = 4, and the teacher's opinion alone beat the labels. Adding 20,000 unlabelled images the teacher labelled: +5 points — and the teacher's hard pseudo-labels did as well as its soft targets there. So distillation needs a teacher with informative outputs and a student short of information, and on a task like MNIST the unlabelled pool is worth more than the temperature. Feature distillation adds a hint loss on intermediate layers and matters for large depth gaps and for detection.",
        answer: [
          { t: "p", text: "The mechanism and the T² factor, both executed attempts with their conditions, the pool result, and the feature variant." }
        ]
      },
      {
        level: "Advanced",
        q: "How would you compress a model for deployment using what is in this lesson, and what would you measure?",
        strong: "Two of the three techniques apply directly. Distillation: train the small deployment architecture on the large model's outputs, using every unlabelled input I can collect, because the pool was worth five points where the temperature was worth two; compare soft targets against hard pseudo-labels, since on an easy task they were equal and hard labels are cheaper to store. Mixed precision at inference: run the student in bf16 or fp16, checking the argmax agreement with float32 on a held-out set (1.000 here through eight layers) and the relative output error, and keeping any softmax or normalisation in float32. Label smoothing enters through the teacher — a smoothed teacher had usable soft targets where an unsmoothed one did not — and as the student's own regulariser, with the calibration measured, because the deployment threshold depends on the confidences being honest. What I would report: student accuracy against the teacher and against a student trained on labels alone; calibration (ECE) of the model that ships; agreement and latency of the half-precision version; and the size of the unlabelled pool used, since that is the lever that moved most. Pruning and quantisation, which take the size down further, are module 11.",
        answer: [
          { t: "p", text: "Distillation with the pool as the lever, half-precision inference with its checks, smoothing's two roles, and the measurements that make the result reportable." }
        ]
      }
    ]
  }
});

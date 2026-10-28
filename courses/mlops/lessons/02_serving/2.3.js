EC.receiveLesson({
  id: "2.3",

  lede: "Compression is quoted far more often than it is measured: *four times smaller, three times faster, one percent accuracy loss*. Here all three are measured on the same inputs, and two of the results are not what the slogan predicts. ONNX conversion was a free win — **0.59x the size, 2.00x faster, and not one of 6,000 decisions changed**. Dynamic int8 on a torch MLP gave **3.78x smaller and 1.43x faster** for 0.0007 of accuracy. And then the distillation experiment produced the finding that matters: a **0.7 KB logistic regression beat the 163.7 KB gradient-boosted teacher**, 0.7692 against 0.7667. The best compression available was not compression at all. It was noticing the model had been over-specified from the start.",

  objectives: [
    "Measure size, latency and accuracy together rather than quoting a compression ratio",
    "Explain what ONNX changes about a model artifact beyond its speed",
    "Interpret dynamic int8 quantization: what moves, what does not, and what the aggregate metric hides",
    "Recognise when the correct compression is a simpler model class"
  ],

  prerequisites: ["2.2"],

  blocks: [

    { t: "h2", n: "01", id: "baseline", text: "The three numbers, together",
      sub: "Any one of them alone is marketing" },

    { t: "p", text: "A compression claim has to carry three numbers or it means nothing: how much smaller, how much faster, and how much worse. They are routinely reported separately, by different people, on different hardware — which is how *4x smaller* and *1% accuracy loss* end up in the same sentence despite having been measured on different models." },

    { t: "p", text: "So everything below runs against the same baseline and the same 6,000 held-out applicants: the loan classifier from module 1." },

    { t: "code", lang: "python", title: "m23.py — the baseline",
      out: `== the baseline: HistGradientBoostingClassifier ==
  trees            44
  pickle on disk      163.7 KB
  accuracy         0.7667
  AUC              0.8473
  latency, 6000 rows   6.88 ms   (1.15 us/row)` },

    { t: "p", text: "Note the tree count: **44**, not the 200 that `max_iter` requested — early stopping again, exactly as lesson 1.2 measured. The artifact being compressed is already smaller than the configuration implies, which is worth knowing before anyone claims a reduction." },

    { t: "callout", kind: "note", title: "A compression ratio needs a denominator you have verified",
      body: [
        { t: "p", text: "If this model were described from its configuration, the baseline would be '200 trees'. It is 44. A compression project reporting *4x fewer trees* against the configured number would be reporting a reduction that early stopping had already performed." },
        { t: "p", text: "Measure the artifact, not the config. It is the same requested-versus-realised distinction as logging `n_iter_`." }
      ] },

    { t: "h2", n: "02", id: "onnx", text: "ONNX: smaller, faster, identical",
      sub: "The result that is actually free" },

    { t: "p", text: "ONNX is a specified graph format with its own runtime. Converting means the model stops being a pickle of Python objects and becomes a declared computation, which has consequences beyond speed." },

    { t: "code", lang: "python", title: "m23.py — conversion and the agreement check",
      code: `from skl2onnx import to_onnx
import onnxruntime as ort

onx = to_onnx(model, Xtr[:1].astype(np.float32),
              options={id(model): {"zipmap": False}})
sess = ort.InferenceSession(onnx_path, so, providers=["CPUExecutionProvider"])

# The check that matters: do the two agree on every decision?
maxdiff  = float(np.max(np.abs(prob_onnx - base_prob)))
disagree = int(np.sum((prob_onnx >= 0.5) != (base_prob >= 0.5)))`,
      out: `== Part A: converted to ONNX ==
  outputs          ['label', 'probabilities']
  onnx on disk         96.4 KB   (0.59x the pickle)
  accuracy         0.7667   (baseline 0.7667)
  AUC              0.8473   (baseline 0.8473)
  latency, 6000        3.44 ms   (2.00x sklearn)
  max |prob diff|  1.032e-07
  decisions changed 0 of 6000` },

    { t: "p", text: "**0.59x the size, 2.00x the speed, and the maximum probability difference across six thousand rows is 1.03e-07** — float32 rounding, nothing more. Zero decisions changed. This is the rare case where the trade-off has no cost side." },

    { t: "p", text: "The speed comes from leaving Python: a tree ensemble in ONNX Runtime is a compiled traversal over a packed array, where scikit-learn's prediction path crosses into Python per call. On a batch of 6,000 that is 6.88 ms against 3.44 ms, and the gap would widen on single-row calls where per-call overhead dominates — which is exactly the online case from lesson 2.1." },

    { t: "callout", kind: "insight", title: "The real reason to convert is the versioning, not the speed",
      body: [
        { t: "p", text: "Lesson 1.3 ended on a pickle being a version-coupled artifact: it embeds class paths and attribute layouts, so loading under a different scikit-learn gives you an exception, a warning, or a silent behaviour change. ONNX is a **declared graph with an opset version**, so the artifact and the runtime are independently versioned." },
        { t: "p", text: "That is what turns the model into something you can store for a year and load with confidence, and it removes the library-version half of the skew measured in lesson 13.3. The 2x speed-up is the smaller benefit." }
      ] },

    { t: "p", text: "Two practical notes from doing it. The converter needs a **typed sample input** to trace shapes, which is why `Xtr[:1].astype(np.float32)` is passed; and the default scikit-learn output is a list of dictionaries, which `zipmap: False` turns into a plain array. Both are the kind of detail that makes the first conversion attempt fail and is never in the summary." },

    { t: "h2", n: "03", id: "int8", text: "Dynamic int8, on a model that has weights",
      sub: "3.78x smaller, and the aggregate hides the movement" },

    { t: "p", text: "Quantization needs weights to quantize, and a tree ensemble has thresholds rather than matrices — so the gradient-boosted model is the wrong subject. A four-layer MLP trained on the same data is the right one, and it is also the realistic case: quantization is a neural-network technique." },

    { t: "code", lang: "python", title: "m23.py — dynamic quantization",
      code: `qnet = torch.quantization.quantize_dynamic(net, {nn.Linear}, dtype=torch.qint8)`,
      out: `== Part B: a torch MLP, then dynamic int8 ==
  parameters       133121
                      size KB   accuracy        AUC    ms/6000
  fp32                  523.6     0.7663     0.8489       7.09
  dynamic int8          138.4     0.7657     0.8481       4.96

  size      3.78x smaller
  latency   1.43x faster
  accuracy  -0.0007   AUC -0.0008
  max |prob diff| 4.513e-02` },

    { t: "p", text: "**3.78x smaller** — close to the theoretical 4x from 32 bits to 8, with the shortfall being the per-tensor scales and zero-points that have to be stored alongside. **1.43x faster**, which is well short of 4x because int8 matrix multiply on a CPU gains throughput but the model also pays dequantization at each layer boundary, and these layers are small. Accuracy moved by **0.0007**." },

    { t: "p", text: "The number worth pausing on is the last one. **The maximum probability difference is 4.5e-02** — individual predictions moved by up to 0.045, four and a half percentage points of probability, while aggregate accuracy barely registered. The aggregate is stable because most of that movement happens away from the decision boundary, where it changes no decision." },

    { t: "callout", kind: "trap", title: "Accuracy is the wrong acceptance test for a quantized model",
      body: [
        { t: "p", text: "A 0.0007 accuracy delta looks like nothing. But if the score feeds a downstream threshold, a price, a ranking, or a human reviewer's queue ordering, a 0.045 probability shift is a real change in behaviour that an accuracy check certifies as harmless." },
        { t: "p", text: "The acceptance test should be **agreement on decisions** plus the **maximum and 99th-percentile probability difference** — the three numbers measured here. ONNX passed all three exactly; int8 passed on decisions and moved on probabilities, and whether that is acceptable depends on what consumes the score." }
      ] },

    { t: "callout", kind: "note", title: "On the API used here",
      body: [
        { t: "p", text: "`torch.quantization.quantize_dynamic` emits a DeprecationWarning on torch 2.10: eager-mode quantization is moving to `torchao`'s `quantize_` API, and FX graph mode to `prepare_pt2e`/`convert_pt2e`. The measurement stands, but the call will not survive the next major version — which is itself an argument for exporting to ONNX, whose opset is versioned independently of the framework that produced it." }
      ] },

    { t: "h2", n: "04", id: "distil", text: "Distillation, and the uncomfortable result",
      sub: "A 0.7 KB model beat the teacher" },

    { t: "p", text: "Distillation trains a small student on the large model's outputs rather than on the original labels, the idea being that the teacher's probabilities carry more information than hard labels do. Four students were tried: a depth-4 tree and a logistic regression, each on hard labels and on the teacher's labels." },

    { t: "code", lang: "python", title: "m23.py — four students against the teacher",
      out: `== Part C: distillation, big model's probabilities as targets ==
  student                          size KB  accuracy       AUC    agree%
  TEACHER (HistGBT)                  163.7    0.7667    0.8473     100.0
  depth-4 tree, hard labels            3.5    0.7380    0.8080      85.8
  depth-4 tree, teacher labels         3.5    0.7415    0.8025      86.6
  logistic, hard labels                0.7    0.7692    0.8491      93.4
  logistic, teacher labels             0.7    0.7678    0.8492      93.6` },

    { t: "p", text: "Read the logistic rows against the teacher. **0.7 KB, accuracy 0.7692 against the teacher's 0.7667, AUC 0.8491 against 0.8473.** A model 234 times smaller and essentially free to evaluate is *better* than the gradient-boosted ensemble it was supposed to approximate." },

    { t: "diagram", kind: "compare", id: "dg-2_3-04-0",
      title: "The teacher against the 0.7 KB student",
      caption: "Not a compression result — a modelling result. **The boosted ensemble was never buying anything on this problem**, which lesson 1.2 had already hinted at when a sixfold hyperparameter sweep moved AUC by 0.3 points.",
      columns: [
        { title: "HistGBT teacher", items: [
          "163.7 KB on disk",
          "44 trees after early stopping",
          "accuracy 0.7667",
          "AUC 0.8473",
          "6.88 ms per 6,000 rows",
          "a pickle, version-coupled"
        ] },
        { title: "Logistic regression", items: [
          "0.7 KB on disk — 234x smaller",
          "4 coefficients and an intercept",
          "accuracy 0.7692 — higher",
          "AUC 0.8491 — higher",
          "effectively free",
          "inspectable, and trivially portable"
        ] }
      ] },

    { t: "p", text: "The explanation is in how the data was built. The label comes from a logistic function of a linear combination of transformed features, so the true decision boundary is one a logistic regression can represent exactly — once it has the right inputs. The ensemble spends 44 trees approximating a shape that four coefficients describe. This is synthetic data being honest about its own structure." },

    { t: "callout", kind: "insight", title: "The first compression question is whether the model class is right",
      body: [
        { t: "p", text: "Lesson 1.2 measured a sixfold hyperparameter sweep moving AUC by 0.3 points and concluded the remaining error was in the data rather than the fit. This is the same finding arriving from the other direction: if tuning buys nothing and a linear model matches the ensemble, the ensemble's capacity was never the binding constraint." },
        { t: "p", text: "So before quantizing, pruning or distilling, fit the simplest reasonable model and compare. It is an afternoon, and when it works it beats every compression technique by two orders of magnitude — while also being inspectable, portable and immune to lesson 1.3's pickle problem." }
      ] },

    { t: "p", text: "And distillation itself did essentially nothing: teacher labels gave the tree +0.0035 accuracy and *cost* the logistic 0.0014. That is the honest result on this problem. Distillation earns its reputation where the teacher's soft probabilities encode genuine structure the hard labels obscure — large models on hard perceptual tasks — and not on a four-feature tabular problem whose labels are already generated from a smooth function." },

    { t: "h2", n: "05", id: "decide", text: "When compression is worth it",
      sub: "And the three cases where it is not" },

    { t: "p", text: "Compression is work, and it introduces an artifact that differs from the one you validated. The decision should come from the measurement in lesson 2.1, not from the availability of the technique." },

    { t: "diagram", kind: "steps", id: "dg-2_3-05-0",
      title: "The order to try things in",
      caption: "Cheapest and most reversible first. **Three of the four steps are not compression**, and in this lesson the last one was unnecessary because the second had already won.",
      items: [
        { label: "Measure the split first (lesson 2.1)", desc: "The model was 30% of a warm request, so halving inference buys 15% end to end." },
        { label: "Export to ONNX", desc: "0.59x size, 2.00x speed, zero decisions changed. Free, and it fixes the pickle versioning too." },
        { label: "Try the simplest model class", desc: "0.7 KB logistic beat the 163.7 KB teacher on both accuracy and AUC. An afternoon of work, 234x the reduction." },
        { label: "Then quantize, if the model is a network", desc: "3.78x smaller, 1.43x faster, 0.0007 accuracy. Accept on decision agreement and probability deltas, not accuracy." }
      ] },

    { t: "table",
      head: ["Do not compress when", "Because"],
      rows: [
        ["The model is a minority of request latency", "Lesson 2.1 measured 30%: halving inference bought 15% end to end, for a week of work."],
        ["The score feeds a threshold, price or ranking", "int8 moved individual probabilities by up to 0.045 while accuracy held — the aggregate certifies a change it cannot see."],
        ["You have not tried a simpler model class", "A logistic regression beat the ensemble here at 1/234th the size, with no compression at all."],
        ["The bottleneck is feature fetching", "Lesson 12.1 decomposes this. A faster model does not help a slow feature lookup."],
        ["You cannot re-validate the compressed artifact", "It is a different model. If it cannot go through the gate in lesson 3.2, it should not go to production."]
      ] },

    { t: "exercise", kind: "practice", title: "Measure all three numbers on your own model", difficulty: "core", minutes: 35,
      prompt: "Take a model you serve and produce a four-row table: baseline, ONNX, a simpler model class, and a quantized version if it is a network. For each row record size on disk, latency on a fixed batch, accuracy, AUC, the fraction of decisions that differ from the baseline, and the maximum and p99 absolute probability difference. Then answer two questions with the numbers in front of you. Given the latency split you measured in 2.1, what does the fastest row actually buy end to end? And does the simplest model class row make the others irrelevant?",
      hints: [
        "skl2onnx needs a typed sample input to trace shapes, and zipmap: False to get an array instead of a list of dicts.",
        "Decision agreement and probability deltas are the acceptance test; accuracy is too coarse to see a 0.045 shift.",
        "Fit the simple model first. If it wins, you can stop."
      ],
      solution: {
        body: [
          { t: "p", text: "ONNX usually comes out as it did here — smaller, faster, numerically identical — because it is a format change rather than an approximation. That makes it the one step worth doing unconditionally, and the versioning benefit outlasts the speed benefit." },
          { t: "p", text: "The simple-model row is the one that surprises people. It will not always win, and when it loses you have learned that the capacity is doing real work and compression is a genuine trade. Either way the afternoon was worth it, and it is the only step that can make the whole project unnecessary." }
        ]
      } }

  ],

  takeaways: [
    "**A compression claim needs three numbers measured together**: size, latency and accuracy, on the same inputs and the same hardware.",
    "**Measure the artifact, not the config.** The baseline was 44 trees, not the 200 requested — early stopping had already shrunk it.",
    "**ONNX was free**: 0.59x the size, 2.00x faster, max probability difference 1.03e-07, and zero of 6,000 decisions changed.",
    "**The better reason to export to ONNX is versioning.** A declared graph with an opset is independently versioned, which removes the pickle coupling from 1.3 and the library-version skew of 13.3.",
    "**Dynamic int8 gave 3.78x smaller and 1.43x faster** for -0.0007 accuracy — short of 4x on both counts, because of stored scales and dequantization at layer boundaries.",
    "**int8 moved individual probabilities by up to 0.045** while accuracy held, so **accuracy is the wrong acceptance test** — use decision agreement plus max and p99 probability deltas.",
    "**`torch.quantization.quantize_dynamic` is deprecated on torch 2.10**, moving to torchao; another argument for an independently versioned export format.",
    "**A 0.7 KB logistic regression beat the 163.7 KB teacher**: accuracy 0.7692 vs 0.7667, AUC 0.8491 vs 0.8473, at 1/234th the size.",
    "**That is a modelling result, not a compression result** — and it agrees with 1.2, where a sixfold sweep moved AUC 0.3 points, meaning capacity was never the constraint.",
    "**Distillation did nothing here**: teacher labels gave the tree +0.0035 and cost the logistic 0.0014. It earns its reputation on perceptual tasks, not four-feature tabular ones.",
    "**Try the simplest model class before compressing anything.** It is an afternoon, and when it wins it beats every technique by two orders of magnitude.",
    "**Do not compress when the model is a minority of latency** — 30% in lesson 2.1, so halving it bought 15% end to end."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You quantize a model to int8. Accuracy falls by 0.0007 and no decisions change on your test set. What else must you check before shipping it?",
        options: [
          "Nothing — unchanged decisions and negligible accuracy loss is a pass",
          "How far individual probabilities moved: int8 shifted them by up to 0.045 here, which matters if the score feeds a threshold, a price, a ranking or a review queue",
          "Whether the model file is smaller than the original"
        ],
        answer: 1,
        why: "Aggregate accuracy is too coarse to see probability movement that changes no decision on your test set but does change downstream behaviour. The acceptance test is decision agreement plus max and p99 probability deltas — three numbers, not one."
      },
      {
        stem: "A 0.7 KB logistic regression matches a 163.7 KB gradient-boosted ensemble's accuracy and AUC. What does that tell you?",
        options: [
          "The distillation worked well and the teacher's soft labels were informative",
          "The ensemble's extra capacity was never buying anything on this problem — a modelling finding, consistent with a hyperparameter sweep that moved AUC only 0.3 points",
          "The test set is too small to distinguish the models"
        ],
        answer: 1,
        why: "The logistic trained on hard labels did just as well as the one trained on teacher labels (0.7692 vs 0.7678), so distillation contributed nothing. The signal is about model class: if tuning buys nothing and a linear model matches the ensemble, capacity was not the binding constraint."
      },
      {
        stem: "Besides speed, what does exporting to ONNX give you?",
        options: [
          "Smaller files, because the format is more compact than pickle",
          "An artifact versioned independently of the training framework — a declared graph with an opset, rather than a pickle embedding class paths and attribute layouts",
          "Automatic quantization of the model weights"
        ],
        answer: 1,
        why: "The first option happened to be true here (0.59x) but is not guaranteed. The durable benefit is decoupling the artifact from the library that produced it, which removes the silent-behaviour-change risk of loading a pickle under a different scikit-learn."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "How would you make a model faster to serve?",
        strong: "I would measure where the time goes before changing the model, because when I did that the model was 0.58 ms of a 1.94 ms request — thirty percent — so halving inference would have bought fifteen percent end to end. If the model genuinely dominates, I would export to ONNX first: I measured 0.59x the size, 2.00x the speed, and zero of six thousand decisions changed, so it is free. Then I would try a simpler model class, which in my case gave a 0.7 KB logistic regression that beat a 163.7 KB ensemble on both accuracy and AUC. Quantization comes after those, and only for networks.",
        answer: [
          { t: "p", text: "The ordering is the answer. Candidates usually reach for quantization immediately; leading with the latency split and putting compression last shows the decision is driven by measurement." },
          { t: "p", text: "ONNX being free in all three dimensions is worth stating as a measurement, since it is the one step that is almost unconditionally worth doing." }
        ]
      },
      {
        level: "senior",
        q: "How do you validate a compressed model before shipping it?",
        strong: "As a different model, through the same gate as any other candidate — because that is what it is. The specific tests are three numbers rather than accuracy: the fraction of decisions that differ from the baseline on a fixed set, and the maximum and 99th-percentile absolute probability difference. I use those because I have measured int8 quantization moving individual probabilities by up to 0.045 while accuracy moved 0.0007 — so an accuracy check would have certified it as harmless while a downstream threshold or ranking saw a real change. ONNX by contrast came through at 1e-07 maximum difference with zero decisions changed, which is a genuinely equivalent artifact.",
        answer: [
          { t: "p", text: "Treating the compressed artifact as a new candidate rather than an optimisation of an existing one is the senior framing, and it is what connects this to the promotion gate." },
          { t: "p", text: "The contrast between 1e-07 and 4.5e-02 is the detail that makes the point concrete: one is a format change, the other is an approximation, and they deserve different levels of scrutiny." }
        ]
      },
      {
        level: "senior",
        q: "When is model compression the wrong project?",
        strong: "Four cases, and I have measured the first. When the model is a minority of request latency — thirty percent in my case, so a halving bought fifteen percent for a week of work. When the bottleneck is actually feature fetching or serialization, which a faster model does not touch. When the score feeds something threshold-sensitive, because compression moves probabilities more than it moves accuracy. And when nobody has tried a simpler model class: I had a 0.7 KB logistic regression match a 163.7 KB ensemble, which is a 234x reduction that no compression technique would have reached, and it also made the artifact inspectable and portable. The general principle is that compression trades fidelity for resources, so you should first establish that resources are the binding constraint.",
        answer: [
          { t: "p", text: "Having four concrete cases with a measurement behind the first is much stronger than a general caution. The simpler-model-class case is the one most teams never test." }
        ]
      }
    ]
  }
});

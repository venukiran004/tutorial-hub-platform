/* ============================================================================
   LESSON 2.12 — Production Deployment
   Mirrors 02_CNNs.md · §14. Every export was actually performed and every
   number measured on torch 2.10 + onnxruntime (scratchpad/dl/d212.py).
   Two current-version gotchas found and reported.
   ========================================================================= */
EC.receiveLesson({
  id: "2.12",

  lede: "**A trained model is not a product; a served model is.** Getting from one to the other means detaching the model from Python, shrinking it, and choosing a batch size that satisfies a latency budget rather than a throughput chart. This lesson runs every export for real on torch 2.10 — and finds two things that will break a deployment today: ONNX writes its weights to a *separate file*, and quantising a CNN barely helps unless you know where its parameters live.",

  objectives: [
    "Export a model to ONNX and TorchScript, and verify numerical agreement",
    "Avoid shipping an incomplete ONNX artefact",
    "Predict where quantisation helps from a model's parameter distribution",
    "Choose a batch size from a latency requirement rather than a throughput curve",
    "Name the serving and edge runtimes and what each is for"
  ],

  prerequisites: ["2.11", "2.5"],

  blocks: [

    { t: "h2", n: "01", text: "Leaving Python", id: "export" },

    { t: "p", text: "A trained `nn.Module` needs its class definition, its Python dependencies and an interpreter to run. Export formats package the *computation* so a C++ server, a phone or an inference runtime can execute it without any of that." },

    { t: "diagram", kind: "flow", title: "From checkpoint to endpoint",
      caption: "TorchScript stays in the PyTorch runtime; ONNX is the neutral format that the other runtimes consume.",
      cols: 3,
      nodes: [
        { id: "m", label: "Trained nn.Module", sub: "needs Python", tone: "accent" },
        { id: "ts", label: "TorchScript", sub: "C++ via LibTorch", tone: "good" },
        { id: "on", label: "ONNX", sub: "runtime-neutral graph", tone: "violet" },
        { id: "rt", label: "ONNX Runtime · TensorRT", sub: "server GPU/CPU", tone: "teal" },
        { id: "ed", label: "CoreML · TFLite", sub: "phone, edge", tone: "teal" }
      ],
      edges: [["m", "ts"], ["m", "on"], ["on", "rt"], ["on", "ed"]] },

    { t: "code", lang: "python", title: "The three exports",
      code: `model.eval()                                  # ALWAYS — see the trap below
dummy = torch.randn(1, 3, 224, 224)

torch.onnx.export(model, dummy, "model.onnx",
                  input_names=['image'], output_names=['prediction'],
                  dynamic_axes={'image':      {0: 'batch_size'},
                                'prediction': {0: 'batch_size'}},
                  opset_version=18)

scripted = torch.jit.script(model)            # follows control flow
scripted.save("model_scripted.pt")

traced = torch.jit.trace(model, dummy)        # records ONE execution path`,
      caption: "The reference passes `opset_version=13`; torch 2.10 silently upgrades it to 18 with a warning, because its exporter has no implementation for versions below that." },

    { t: "out", text: `  script  -> m_script.pt  46.89 MB  max diff 0.00e+00
  trace   -> m_trace.pt   46.93 MB  max diff 0.00e+00

  onnxruntime batch  1 -> output (1, 1000)   (dynamic axis works)
  onnxruntime batch  4 -> output (4, 1000)   (dynamic axis works)
  onnxruntime batch 16 -> output (16, 1000)  (dynamic axis works)
  max abs diff vs PyTorch: 2.86e-06` },

    { t: "p", text: "TorchScript reproduces PyTorch exactly. ONNX differs by 2.9e-06 — fp32 round-off from the runtime's graph optimisations, not an error. **Always check this number after exporting**; a difference of 1e-2 rather than 1e-6 means an operator was translated incorrectly, and you want to find that before it reaches production." },

    { t: "callout", kind: "trap", title: "ONNX writes the weights to a separate file",
      body: [{ t: "p", text: "Exporting ResNet-18 on torch 2.10 produces `model.onnx` at **0.09 MB** and `model.onnx.data` at **46.79 MB**. The first is the graph; the second holds every weight. Ship only `model.onnx` — which looks complete, has the right extension and loads without complaint in some tools — and your service fails at inference time with a missing-initialiser error. Copy both files, keep them side by side with the exact same base name, and check the total size against what you expect the model to weigh. This bit of behaviour is new enough that plenty of older deployment scripts get it wrong." }] },

    { t: "callout", kind: "trap", title: "`model.eval()` before exporting, always",
      body: [{ t: "p", text: "Export captures whatever mode the model is in. Export in training mode and dropout is baked into the graph, randomly zeroing activations on every production request, while batch norm uses batch statistics instead of its running averages — so predictions depend on what else happens to be in the batch. Both produce a model that works, returns plausible numbers, and is quietly wrong. Nothing in the export process warns you." }] },

    { t: "h2", n: "02", text: "Script or trace", id: "script-trace" },

    { t: "diagram", kind: "compare", title: "The two TorchScript modes",
      caption: "Tracing is easier and silently wrong for data-dependent models. Scripting is stricter and safer.",
      columns: [
        { title: "torch.jit.trace", tone: "warn", items: [
          "Runs the model once and records the operations executed",
          "Handles almost any Python — because it ignores it",
          "Branches and loop counts are frozen at what the dummy input hit",
          "Silently wrong for data-dependent control flow"
        ] },
        { title: "torch.jit.script", tone: "good", items: [
          "Compiles the source, preserving control flow",
          "Requires a supported subset of Python — may need edits",
          "Branches and loops behave correctly on any input",
          "Fails loudly at export rather than quietly at inference"
        ] }
      ] },

    { t: "p", text: "For a plain feed-forward CNN both are equivalent — measured max difference 0.00e+00 either way. The distinction matters for models with input-dependent behaviour, where tracing bakes in one path. Prefer `script` and fall back to `trace` when scripting rejects your code." },

    { t: "h2", n: "03", text: "Making it smaller", id: "quantization" },

    { t: "out", text: `  resnet18 state_dict on disk : 46.83 MB  (11,689,512 parameters)

  fp32 46.83 MB -> fp16 23.43 MB = 2.00x smaller

  resnet18 Linear-only int8   : 45.29 MB (vs 46.83 MB fp32)
    fc = 513,000 of 11,689,512 params (4.4%)

  an MLP (all Linear): 33.38 MB -> 8.36 MB = 3.99x smaller
  output max abs diff after quantization: 0.0081` },

    { t: "callout", kind: "insight", title: "Dynamic quantisation does nothing for a CNN",
      body: [{ t: "p", text: "`quantize_dynamic(model, {nn.Linear})` cut an all-Linear MLP by **3.99×**, essentially the theoretical 4× from fp32 to int8. On ResNet-18 it achieved 3 % — because only 4.4 % of ResNet's parameters are in a Linear layer; the rest are convolutions, which dynamic quantisation does not touch. The lesson generalises: before reaching for an optimisation, check where the parameters actually are. Lesson 2.3 measured VGG16 at 89.4 % Linear, so dynamic quantisation would have transformed *that* model. For a modern CNN you need static quantisation with a calibration pass, which does cover convolutions but requires representative data and costs more accuracy." }] },

    { t: "p", text: "fp16 is the reliable, boring win: exactly 2.00× smaller, trivially applied, and usually no measurable accuracy loss on a network trained with AMP anyway. Note also that `torch.ao.quantization` emits a deprecation warning on torch 2.10 and points at `torchao` as its replacement." },

    { t: "h2", n: "04", text: "Latency against throughput", id: "batching" },

    { t: "out", text: `  batch  1:    25.3 ms total,   25.3 ms/image,   39.6 img/s
  batch  8:   151.1 ms total,   18.9 ms/image,   52.9 img/s
  batch 32:   687.2 ms total,   21.5 ms/image,   46.6 img/s` },

    { t: "p", text: "Batching amortises fixed per-call overhead, so images get cheaper — 25.3 ms each alone, 18.9 ms in a batch of eight. But **the batch of 32 takes 687 ms to return anything at all**. If your service promises a 100 ms response, batch 32 violates it by a factor of seven no matter how good the throughput number looks." },

    { t: "callout", kind: "tradeoff", title: "The batch size is an SLA decision",
      body: [{ t: "p", text: "Throughput charts push you towards large batches; latency budgets push you towards small ones. For an interactive request the total time is what the user experiences, so pick the largest batch whose *total* latency fits the budget, then add a queue timeout so a partially filled batch is dispatched rather than waiting for stragglers. For offline or batch scoring, none of this applies and you should use the largest batch that fits in memory. Note too that throughput here peaked at batch 8 and *fell* at 32 — beyond some point you exceed cache capacity and per-image cost rises again, so the optimum is found by measurement, not by assuming bigger is better." }] },

    { t: "h2", n: "05", text: "The runtime landscape", id: "runtimes" },

    { t: "dl", items: [
      ["TorchServe", "Serves TorchScript or eager PyTorch models with batching, versioning and metrics built in."],
      ["TensorFlow Serving", "The equivalent for SavedModel, with a mature gRPC interface."],
      ["NVIDIA Triton", "Framework-neutral — serves ONNX, TensorRT, PyTorch and TensorFlow together, with dynamic batching."],
      ["TensorRT", "Compiles for a specific NVIDIA GPU: layer fusion, kernel autotuning, fp16 and int8. The largest GPU gains, at the cost of a per-GPU-architecture build."],
      ["ONNX Runtime", "Cross-platform CPU and GPU execution. Measured 1.95× faster than PyTorch eager on CPU here."],
      ["CoreML / TFLite", "On-device inference for iOS and Android, with hardware accelerator access."]
    ] },

    { t: "p", text: "ONNX Runtime being **1.95× faster than PyTorch eager on the same CPU** is worth noting — for CPU serving, exporting is not only about leaving Python, it is a free doubling of throughput from graph optimisation and operator fusion." },

    { t: "exercise", kind: "practice", title: "Take a model to production shape", difficulty: "advanced", minutes: 45,
      prompt: "Export a trained model to both TorchScript and ONNX. Verify output agreement against PyTorch for at least twenty real inputs, not one — record the maximum difference. Confirm the dynamic batch axis works at three batch sizes. Then benchmark latency at batch sizes 1, 2, 4, 8, 16 and 32, and pick the batch size for a 100 ms p99 budget. Finally, export once with the model in training mode and compare its outputs across repeated runs on the same input.",
      hints: [
        "Run the ONNX comparison on real data; a random tensor can miss operator bugs that only fire on realistic activations.",
        "Check what files the export produced and their sizes before you package anything.",
        "For the training-mode export, run the same input through several times and compare."
      ],
      solution: {
        notes: [
          { t: "p", text: "Expect around 1e-6 agreement for ONNX in fp32 — I measured 2.86e-06 — and exactly 0.00e+00 for TorchScript, which runs the same kernels. Anything larger than about 1e-4 indicates an operator translated differently rather than round-off, and it is worth tracking down before deployment. Testing on twenty real inputs rather than one matters because operator bugs often only appear for particular value ranges." },
          { t: "p", text: "The file check is the one that bites people. On torch 2.10, exporting ResNet-18 gives a 0.09 MB `model.onnx` plus a 46.79 MB `model.onnx.data`, and the graph file alone looks like a complete artefact. Packaging only the first produces a container that builds, passes a smoke test that merely loads the file in some tools, and fails at first inference." },
          { t: "p", text: "The training-mode export gives non-deterministic outputs for the same input, because dropout is live in the exported graph. That is the clearest possible demonstration of why `model.eval()` comes before export — and it is a bug that produces plausible-looking predictions rather than an error, so it can survive a long way into a deployment before anyone notices the model is slightly random." }
        ]
      } }

  ],

  takeaways: [
    "TorchScript reproduces PyTorch exactly (0.00e+00); ONNX agrees to 2.9e-06, which is fp32 round-off.",
    "On torch 2.10, ONNX export writes a 0.09 MB graph plus a 46.79 MB `.data` file — ship both or inference fails.",
    "Call `model.eval()` before exporting, or dropout and batch-norm training behaviour are baked into the graph.",
    "`script` preserves control flow; `trace` freezes one path and is silently wrong for data-dependent models.",
    "fp16 gives exactly 2.00× size reduction; dynamic int8 gave 3.99× on an MLP but 3 % on ResNet-18, where only 4.4 % of parameters are Linear.",
    "Measured: batch 32 reaches 687 ms total latency — a throughput win that breaks any interactive SLA.",
    "ONNX Runtime ran 1.95× faster than PyTorch eager on the same CPU."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "You export to ONNX and ship the resulting `model.onnx`. Inference fails with a missing-initialiser error. Why?",
      options: ["The opset version is too low", "The weights were written to a separate `.data` file that was not shipped", "The model was not in eval mode", "The dynamic axes were misconfigured"],
      answer: 1,
      why: "On torch 2.10 the exporter writes the graph to `model.onnx` (0.09 MB for ResNet-18) and every weight to `model.onnx.data` (46.79 MB). The graph file looks like a complete artefact and has the expected extension, so packaging only it is an easy mistake — check the total exported size against what the model should weigh." },
    { stem: "Why must you call `model.eval()` before exporting?",
      options: ["To free GPU memory", "Otherwise dropout and batch-norm training behaviour are captured in the exported graph", "To enable optimisations", "It is only needed for ONNX"],
      answer: 1,
      why: "Export records whatever mode the model is in. In training mode the exported graph randomly zeroes activations via dropout and computes batch-norm statistics from each incoming batch, so predictions vary run to run and depend on batch composition. The exported model works and returns plausible numbers, which is exactly what makes it dangerous." },
    { stem: "Dynamic int8 quantisation shrinks an MLP by 3.99× but ResNet-18 by only 3 %. Why?",
      options: ["ResNet is already optimised", "Dynamic quantisation targets Linear layers, and only 4.4 % of ResNet's parameters are Linear", "ResNet-18 is too small", "int8 does not support residual connections"],
      answer: 1,
      why: "`quantize_dynamic(model, {nn.Linear})` converts only the layer types you list. ResNet is almost entirely convolutions, so 95.6 % of its weights are untouched. Convolutions need static quantisation with a calibration pass. The general point: check where your parameters live before choosing an optimisation." },
    { stem: "Your service has a 100 ms latency budget. Benchmarks show batch 32 gives the lowest cost per image. What do you deploy?",
      options: ["Batch 32 — it is the most efficient", "A smaller batch whose total latency fits the budget", "Batch 1 always", "Batch 32 with more replicas"],
      answer: 1,
      why: "Batch 32 took 687 ms to return anything at all — the user waits for the whole batch, so per-image cost is irrelevant to the SLA. Pick the largest batch whose *total* latency fits, and add a queue timeout so partial batches dispatch rather than waiting. Note throughput also peaked at batch 8 and fell at 32, so bigger is not reliably faster." }
  ] },

  interview: { title: "Interview", sub: "Deployment questions", questions: [
    { level: "Core", q: "How do you take a trained PyTorch model to production?",
      strong: "eval mode, export to TorchScript or ONNX, verify numerical agreement, then serve through a runtime with batching.",
      answer: [{ t: "p", text: "First `model.eval()`, because export captures the current mode and a model exported in training mode bakes in dropout and batch-norm batch statistics — it works and is quietly wrong. Then export: TorchScript if I am staying in the PyTorch ecosystem, ONNX if I want runtime neutrality or plan to use TensorRT or ONNX Runtime. Then verify — run twenty or so real inputs through both and compare. I expect exact agreement from TorchScript and around 1e-6 from ONNX; anything much larger means an operator translated wrong. I would also check what files the export actually produced, because on recent torch versions ONNX writes weights to a separate `.data` file and shipping only the graph gives you a service that fails at first inference. Then serve through TorchServe or Triton with dynamic batching, and size the batch against the latency budget." }] },
    { level: "Core", q: "What is the difference between tracing and scripting?",
      strong: "Tracing records one execution; scripting compiles the source and preserves control flow.",
      answer: [{ t: "p", text: "Tracing runs the model once with a sample input and records the operations that actually executed. It handles arbitrary Python because it ignores the Python — but any `if` branch or loop count is frozen at whatever the dummy input happened to trigger, so a model whose behaviour depends on its input is silently wrong for every other input. Scripting compiles the source code itself, so control flow is preserved, at the cost of requiring a supported subset of Python and sometimes needing code changes. I prefer scripting because it fails loudly at export time rather than quietly at inference time, and I fall back to tracing when scripting rejects the code. For a plain feed-forward CNN with no data-dependent branching the two are equivalent — I measured identical outputs from both." }] },
    { level: "Senior", q: "How do you decide between quantisation, pruning and distillation?",
      strong: "From where the parameters are, what the accuracy budget is, and whether retraining is available.",
      answer: [{ t: "p", text: "I start by measuring where the model's parameters and time actually are, because that determines which technique can help at all. Dynamic int8 quantisation only touches Linear layers, so it cut an MLP by 3.99× and ResNet-18 by 3 % — on a CNN you need static quantisation with a calibration pass. fp16 is the boring reliable option: exactly 2× smaller, no retraining, and usually no measurable accuracy cost for a model trained with AMP. Pruning needs retraining to recover accuracy and only pays off if your runtime exploits sparsity, which many do not, so dense speedups are often disappointing. Distillation gives the best quality-per-parameter but is the most expensive — you are training a new model. In practice I would try fp16 first, then static quantisation if I need more, and only reach for distillation when there is a hard edge-deployment constraint and time to train. I would also check whether exporting alone is enough: ONNX Runtime was 1.95× faster than eager PyTorch on CPU in my measurement, with no change to the model at all." }] }
  ] }
});

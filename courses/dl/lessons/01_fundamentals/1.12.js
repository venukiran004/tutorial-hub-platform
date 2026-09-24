/* ============================================================================
   LESSON 1.12 — Debugging Neural Networks and Gradient Clipping
   Mirrors 01_Neural_Network_Fundamentals.md · §15 (Debugging Neural Networks)
   and §16 (Gradient Clipping). Every item in the reference's checklist is run
   rather than asserted: the expected initial losses, the overfit-one-batch
   test, the double-softmax bug, the train/eval difference, and both clipping
   modes (scratchpad/dl/d112.py, torch 2.10).
   ========================================================================= */
EC.receiveLesson({
  id: "1.12",

  lede: "**A network that does not learn is not a mystery; it is a checklist you have not worked through.** Almost every failure is one of six things — the data, the loss, the gradients, the learning rate, the architecture, or one of a handful of bugs that produce a model which trains and is quietly wrong. This lesson runs the reference's checklist item by item, so each check comes with the number it should produce and what you see when it fails, then covers gradient clipping: what `clip_grad_norm_` actually returns, and why clipping by norm and clipping by value are not two flavours of the same thing.",

  objectives: [
    "Predict a model's initial loss and use it to catch a wrong head, wrong loss or wrong labels before training",
    "Run the overfit-one-batch test and say what a failure rules in",
    "Recognise the double-softmax bug, the train/eval bug and the other silent ones",
    "Apply gradient clipping in the right place in the loop, and read what `clip_grad_norm_` returns",
    "Choose between clipping by norm and clipping by value, and justify it"
  ],

  prerequisites: ["1.4", "1.8", "1.11"],

  blocks: [

    { t: "h2", n: "01", text: "The order the checks go in", id: "order" },

    { t: "p", text: "The reference's checklist is ordered, and the order is the useful part: each step rules out a class of cause, so a failure tells you where to look next. Working it top to bottom is faster than the instinct, which is to start changing the learning rate." },

    { t: "diagram", kind: "steps", title: "Seven checks, in order",
      caption: "Steps 1 to 3 cost seconds and catch most real bugs. The instinct is to start at step 5, which is why so much time gets spent tuning a model that had a label bug.",
      items: [
        { label: "1 · Overfit one batch", sub: "loss to ~0, or there is a bug", tone: "crit" },
        { label: "2 · Check the data", sub: "labels, normalisation, NaN in the inputs", tone: "warn" },
        { label: "3 · Check the loss", sub: "is the initial value what it should be?", tone: "warn" },
        { label: "4 · Check the gradients", sub: "flowing, and roughly 1e-3 to 1e-1" },
        { label: "5 · Learning rate", sub: "sweep decades, or use an LR finder", tone: "accent" },
        { label: "6 · Architecture", sub: "start small, verify, then add", tone: "accent" },
        { label: "7 · The common bugs", sub: "train/eval, double softmax, no shuffle", tone: "good" }
      ] },

    { t: "h2", n: "02", text: "What the loss should be before training", id: "initial-loss" },

    { t: "p", text: "An untrained classifier has no preference, so it spreads probability evenly and the loss is the entropy of a uniform guess. That gives you a number to check against **before a single step**, and it is the cheapest bug detector in deep learning." },

    { t: "code", lang: "python", title: "d112.py — measured against the formula",
      code: `for k in (2, 10, 1000):
    logits = torch.zeros(4096, k)              # an untrained head: no preference
    target = torch.randint(0, k, (4096,))
    ce = nn.CrossEntropyLoss()(logits, target).item()
    print(f"{k} classes: measured {ce:.4f}   -ln(1/{k}) = {math.log(k):.4f}")` },

    { t: "out", text: `     2 classes: measured 0.6931   -ln(1/2) = 0.6931
    10 classes: measured 2.3026   -ln(1/10) = 2.3026
  1000 classes: measured 6.9078   -ln(1/1000) = 6.9078
  binary (BCE): measured 0.6931   -ln(0.5) = 0.6931` },

    { t: "callout", kind: "insight", title: "Read the first loss, every time",
      body: [{ t: "p", text: "A 10-class model starting at 2.30 is wired correctly. Starting at 6.9 means it has a thousand outputs, not ten. Starting at 0.69 means the head is binary. Starting at 11 means the last layer was initialised far too large. Starting at exactly 0 means the labels are leaking into the input. One printed number separates four different bugs that otherwise all look like \"it is not learning\"." }] },

    { t: "h2", n: "03", text: "The overfit-one-batch test", id: "overfit" },

    { t: "p", text: "Take 32 examples and train on them repeatedly. A model with enough capacity **must** be able to memorise them — the loss should collapse. If it cannot, no amount of data, regularisation or scheduling will help, because the problem is in the model, the loss or the labels." },

    { t: "out", text: `=== overfit one batch ===
  step   0: loss 1.1331
  step  50: loss 0.0010
  step 100: loss 0.0005
  step 150: loss 0.0003
  step 200: loss 0.0002` },

    { t: "p", text: "From 1.13 to 0.0002 in fifty steps on random labels, which is the point — the labels here are noise, and the network memorised them anyway. **That is what passing looks like.** A run that plateaus at 1.09 instead has told you something specific: the gradient is not reaching the parameters that need to change." },

    { t: "table", head: ["What you see", "What it rules in"],
      rows: [
        ["Loss collapses to ~0", "Model, loss and label wiring are sound. The problem is elsewhere — data, generalisation or optimisation"],
        ["Loss stalls near the initial value", "No gradient path: a detached tensor, a frozen layer, a `requires_grad=False`, or a loss that does not depend on the output"],
        ["Loss decreases then flattens high", "Not enough capacity, or an activation saturating — check for dead ReLUs (lesson 1.2)"],
        ["Loss goes to NaN", "Exploding gradients or a log of zero. Section 05 and lesson 7.2"],
        ["Loss falls but accuracy does not", "The labels and predictions are misaligned — an argmax over the wrong axis, or shifted targets"]
      ] },

    { t: "h2", n: "04", text: "The bugs that let the model train anyway", id: "silent" },

    { t: "p", text: "The dangerous bugs are not the ones that crash. They are the ones that leave you with a model that trains, converges, and is worse than it should be — so you tune hyperparameters for a week against a mistake." },

    { t: "code", lang: "python", title: "Softmax into CrossEntropyLoss",
      code: `logits = torch.tensor([[2.0, 1.0, 0.1]])
target = torch.tensor([0])
right = nn.CrossEntropyLoss()(logits, target)                      # correct
wrong = nn.CrossEntropyLoss()(torch.softmax(logits, dim=1), target)  # double softmax`,
      caption: "PyTorch's `CrossEntropyLoss` applies `log_softmax` internally, so it wants **logits**. Handing it probabilities applies the softmax twice." },

    { t: "out", text: `  logits straight into CE : 0.4170   <- correct
  softmax(logits) into CE : 0.8021   <- wrong, and it still trains
  the wrong one is 1.92x the loss and has a much flatter gradient` },

    { t: "callout", kind: "trap", title: "It converges, which is why it survives review",
      body: [{ t: "p", text: "Softmaxing twice squashes the logits into a narrow range, so the loss is nearly double and the gradients are much flatter — the model still learns, just slowly and to a worse optimum. Nothing errors and nothing looks obviously wrong on a loss curve. The rule is simple and worth stating in a code review: `CrossEntropyLoss` and `BCEWithLogitsLoss` take **logits**; `NLLLoss` takes log-probabilities; `BCELoss` takes probabilities. If your last layer is a softmax or a sigmoid, you have almost certainly picked the wrong loss." }] },

    { t: "code", lang: "python", title: "Forgetting model.eval()",
      code: `m = nn.Sequential(nn.Linear(10, 10), nn.BatchNorm1d(10), nn.Dropout(0.5))
m.train(); a = m(inp); b = m(inp)
m.eval();  c = m(inp); d = m(inp)` },

    { t: "out", text: `  train(): two passes differ by 3.7595  (dropout is random)
  eval():  two passes differ by 0.0000  (deterministic)` },

    { t: "p", text: "In `train()` the same input gives a different answer every call, because dropout samples a new mask and batch norm uses the batch's own statistics. Evaluating in `train()` mode therefore produces a validation number that is both noisy and pessimistic — and for a batch of size 1, batch norm normalises a single example against itself, which is meaningless. Lessons 1.7 and 1.8 explain both mechanisms; this is the bug they cause." },

    { t: "h2", n: "05", text: "Gradient clipping", id: "clipping" },

    { t: "p", text: "When a gradient is enormous, the optimiser takes an enormous step, and the parameters land somewhere the loss is worse — often irrecoverably. Clipping caps the size of the step without changing which way it points." },

    { t: "code", lang: "python", title: "Where it goes in the loop",
      code: `for batch in dataloader:
    optimizer.zero_grad()
    loss = criterion(model(batch.x), batch.y)
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)   # after backward, before step
    optimizer.step()`,
      caption: "The position is not negotiable. Before `backward()` there are no gradients to clip; after `step()` the damage is done." },

    { t: "out", text: `  gradient norm before clipping : 5548.06
  clip_grad_norm_ returned      : 5548.06   (the norm it saw, before clipping)
  gradient norm after clipping  : 1.0000` },

    { t: "callout", kind: "good", title: "The return value is a free monitor",
      body: [{ t: "p", text: "`clip_grad_norm_` returns the total norm **before** clipping — 5548 here. Log it every step and you have an exploding-gradient detector that costs nothing: a healthy run sits in a stable band, and a run about to diverge shows the norm climbing several steps before the loss does. That early warning is the single most useful signal in lesson 7.2." }] },

    { t: "h2", n: "06", text: "By norm or by value", id: "norm-vs-value" },

    { t: "p", text: "Both cap the gradient. Only one preserves what the gradient was telling you." },

    { t: "out", text: `  original gradient      : [3.0, 4.0]  (norm 5.00)
  clip_grad_norm_(1.0)   : [0.6, 0.8]  same direction, norm 1.00
  clip_grad_value_(1.0)  : [1.0, 1.0]  direction CHANGED
  cosine(original, value-clipped) = 0.9899` },

    { t: "p", text: "Norm clipping scales the whole vector by one factor, so `[3, 4]` becomes `[0.6, 0.8]` — the same direction, shorter. Value clipping clamps each component independently, so `[3, 4]` becomes `[1, 1]`: the second component was 33 % larger than the first and is now equal to it. The gradient is no longer pointing where steepest descent said." },

    { t: "diagram", kind: "compare", title: "Two ways to make a gradient smaller",
      caption: "The cosine similarity of 0.99 in the executed run looks reassuring and is measured on a two-element vector. Across millions of parameters, value clipping distorts far more, because every component that was above the threshold is flattened to the same number.",
      columns: [
        { title: "clip_grad_norm_", tone: "good", items: ["Scales the whole vector by one factor", "Direction preserved exactly", "One hyperparameter: max_norm", "Returns the pre-clip norm, free monitoring", "The default choice"] },
        { title: "clip_grad_value_", tone: "warn", items: ["Clamps each element independently", "Direction changed", "Flattens every large component to the same value", "No useful return value", "Only when one parameter's gradient is pathological"] }
      ] },

    { t: "callout", kind: "tradeoff", title: "Choosing max_norm",
      body: [{ t: "p", text: "Log the norm for a few hundred steps without clipping, then set `max_norm` somewhere above the typical value — around the 90th percentile is a common starting point. Set it too low and you are scaling down every step, which is a learning-rate reduction wearing a disguise and will look like slow convergence. Set it too high and it never fires. `1.0` is the conventional default for RNNs and transformers, and it is a default rather than an answer." }] },

    { t: "callout", kind: "note", title: "Clipping is a seatbelt, not a fix",
      body: [{ t: "p", text: "It stops one bad batch destroying a run, which is worth having. It does not address why the gradients were large — that is usually initialisation (lesson 1.6), a missing normalisation layer (1.8), or a learning rate that is too high (1.9). If clipping fires on most steps, it is not protecting the run, it is running it." }] },

    { t: "exercise", kind: "practice", title: "Break it on purpose, then find it", difficulty: "core", minutes: 26,
      prompt: "Take the PyTorch classifier from lesson 1.11 and introduce one bug at a time, without looking at which: (a) softmax before the loss, (b) validation without model.eval(), (c) shuffle=False, (d) labels shifted by one, (e) the last layer initialised with std=5. For each, record the initial loss, whether one batch overfits, and the gradient norm on step one. Build a table of symptom against cause, then check it against the reference's checklist.",
      hints: [
        "The initial loss separates (d) and (e) immediately.",
        "The overfit test passes for (b) and (c) and fails for (d).",
        "Log `clip_grad_norm_`'s return value even when you are not clipping."
      ],
      solution: {
        notes: [
          { t: "p", text: "The table is the deliverable, and the useful discovery is how few symptoms there are: initial loss, does-one-batch-overfit, and gradient norm distinguish nearly every bug on the list between them. That is why the reference's checklist is ordered the way it is — those three checks come first because they partition the space." },
          { t: "p", text: "Two of these do not fail the overfit test at all. Missing `eval()` and `shuffle=False` both memorise a single batch perfectly, because neither bug affects a single repeated batch — the first only matters when you evaluate, the second only when there is more than one batch. That is worth feeling: the sanity check is powerful and it is not complete, which is why the checklist keeps going after step 1." }
        ]
      } }

  ],

  takeaways: [
    "Check the initial loss against `-ln(1/k)` before training — it separates a wrong head, a wrong loss and leaking labels.",
    "A model that cannot overfit one batch has a bug; the executed run went from 1.13 to 0.0002 on random labels.",
    "`CrossEntropyLoss` and `BCEWithLogitsLoss` take logits — a softmax before them nearly doubles the loss and still trains.",
    "In `train()` mode two identical inputs give different outputs; evaluating without `eval()` produces noisy, pessimistic numbers.",
    "Clip after `backward()` and before `step()`; `clip_grad_norm_` returns the pre-clip norm, which is a free divergence monitor.",
    "Clip by norm to preserve direction; value clipping flattens every large component to the same number."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Your 10-class classifier prints an initial loss of 6.91. What does that tell you?",
      options: ["The learning rate is too high", "The output layer has about 1000 units, not 10", "The labels are wrong", "Nothing — it is within the normal range"],
      answer: 1,
      why: "An untrained head should start at `-ln(1/k)`, which is 2.30 for ten classes and 6.91 for a thousand — the executed run measures both. A loss matching `ln(1000)` almost always means the head was built with the wrong number of outputs, which is a one-line fix found before a single epoch." },
    { stem: "A model cannot drive the loss below its initial value when trained on a single batch. What is ruled in?",
      options: ["Not enough data", "Too much regularisation", "No gradient path to the parameters — a detached tensor or frozen layer", "The learning rate schedule"],
      answer: 2,
      why: "One batch removes data, generalisation and scheduling from the picture entirely, which is why the test is first. A loss stuck at its starting value means the parameters are not being updated at all: something is detached, frozen, or the loss does not depend on the output." },
    { stem: "Why does putting a softmax before CrossEntropyLoss still produce a model that trains?",
      options: ["It does not — it raises an error", "The loss is still monotonic in the right direction, just larger with flatter gradients", "PyTorch detects and removes the extra softmax", "It only fails for more than two classes"],
      answer: 1,
      why: "The executed comparison gives 0.4170 correct against 0.8021 wrong — 1.92× the loss, and the double squashing flattens the gradients. The model still improves, slowly and to a worse optimum, which is exactly why this bug survives long enough to waste a week of tuning." },
    { stem: "What does clip_grad_norm_ return?",
      options: ["The clipped norm", "The total gradient norm before clipping", "The number of parameters clipped", "Nothing"],
      answer: 1,
      why: "It returns the norm it observed — 5548.06 in the executed run, before scaling the gradients down to 1.0. Logging that value every step gives you an exploding-gradient detector for free, and it typically climbs several steps before the loss shows any sign of trouble." }
  ] },

  interview: { title: "Interview", sub: "Debugging questions", questions: [
    { level: "Core", q: "A model is not learning. Walk me through what you check.",
      strong: "Overfit one batch, then the data, then the initial loss — in that order, because each rules out a class of cause.",
      answer: [{ t: "p", text: "First I try to overfit a single batch. If the loss does not collapse, the problem is the model, the loss or the labels, and no amount of data or tuning will help — that one test removes most of the search space in about thirty seconds. Then the data: print a few examples with their labels, check normalisation, check for NaN. Then the initial loss against `-ln(1/k)`, which is a surprisingly sharp instrument — 2.30 for ten classes, and a different number tells you specifically what is miswired. Only then the learning rate, and only then the architecture. The mistake I try to avoid is starting with the learning rate, which is where the instinct goes and which cannot fix a label bug." }] },
    { level: "Core", q: "Where does gradient clipping go, and which kind do you use?",
      strong: "After `backward()`, before `step()`; clip by norm, because it preserves direction.",
      answer: [{ t: "p", text: "The position matters: before `backward()` there are no gradients yet, and after `step()` the bad update has already happened. For the kind, norm clipping scales the whole vector by a single factor so the direction is unchanged — `[3, 4]` with `max_norm=1` becomes `[0.6, 0.8]`. Value clipping clamps each element, so the same vector becomes `[1, 1]` and the gradient now points somewhere steepest descent did not. I use norm clipping by default, and I log its return value, which is the pre-clip norm and doubles as an early warning that a run is about to diverge." }] },
    { level: "Senior", q: "Training was fine for six hours, then the loss went to NaN. How do you investigate?",
      strong: "Look at the gradient-norm history first, then the batch at the transition, then the loss terms that can produce infinities.",
      answer: [{ t: "p", text: "The gradient norm is where I start, because if it is being logged the failure is usually visible several hundred steps earlier as a rising trend — NaN is the end of a process, not an event. If it spikes at one step, I want the batch that caused it, which means the data loader needs to be reproducible enough to fetch it; corrupted samples, a zero-length sequence or an extreme outlier are common. If the norm was stable and the loss still went NaN, I look at the loss terms that can produce infinities on their own: a `log` of something that reached zero, a division by a variance that collapsed, a `sqrt` at zero with no epsilon. Mixed precision adds another candidate, since fp16 overflows around 65504 and a loss scaler that is too aggressive will produce infinities in the backward pass that never appear in the forward. Clipping would likely have prevented the run dying, which is the argument for having it on from the start rather than adding it after an incident." }] }
  ] }
});

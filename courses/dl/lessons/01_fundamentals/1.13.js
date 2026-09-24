/* ============================================================================
   LESSON 1.13 — Label Smoothing, Knowledge Distillation and Mixed Precision
   Mirrors 01_Neural_Network_Fundamentals.md · §17 (Label Smoothing),
   §18 (Knowledge Distillation) and §19 (Mixed Precision Training). The
   reference's distillation_loss is run as written; the fp16 section is run on
   the numeric properties that cause the problem, because this machine has no
   GPU and a fabricated speed-up would not be a measurement
   (scratchpad/dl/d113.py, torch 2.10).
   ========================================================================= */
EC.receiveLesson({
  id: "1.13",

  lede: "**Three techniques that cost almost nothing and are in every modern training script.** Label smoothing stops a model insisting it is 99.95 % sure. Distillation moves what a large model knows into a small one, using the part of the teacher's output that hard labels throw away. Mixed precision halves the memory and roughly doubles the speed on the right hardware, at the cost of a number format that silently rounds small gradients to zero — which is what the loss scaler exists to prevent. Each one is a few lines, and each has a mechanism worth seeing on actual numbers.",

  objectives: [
    "Say exactly what label smoothing does to the target vector and to the model's confidence",
    "Explain why temperature reveals a teacher's inter-class knowledge, and why the loss is scaled by T²",
    "Implement the reference's distillation loss and describe what each term contributes",
    "State the fp16 range, and why gradients underflow without a loss scaler",
    "Write a mixed-precision training loop and say what `scaler.update()` is for"
  ],

  prerequisites: ["1.3", "1.7", "1.12"],

  blocks: [

    { t: "h2", n: "01", text: "Label smoothing", id: "smoothing" },

    { t: "p", text: "A one-hot target tells the network the correct class has probability exactly 1 and every other class exactly 0. Since softmax never reaches 1, the only way to keep reducing the loss is to keep pushing the logits further apart — forever. Label smoothing replaces the target with a slightly softened one, which gives the model a finite target to reach." },

    { t: "code", lang: "python", title: "One argument",
      code: `criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
# For 10 classes: the true label gets 0.91, each other 0.01`,
      caption: "PyTorch spreads `eps` over all K classes, so the true class keeps `1 - eps + eps/K` rather than exactly `1 - eps`." },

    { t: "out", text: `  K=10, eps=0.1:  true class -> 0.910   each other -> 0.010` },

    { t: "p", text: "The effect on the trained model is the point, and it is easy to measure: take a single example, train logits to convergence with and without smoothing, and look at the confidence that results." },

    { t: "out", text: `  what it does to confidence (same model, trained to convergence):
    smoothing 0.0: p(true)=0.9995  max logit gap=9.90
    smoothing 0.1: p(true)=0.9100  max logit gap=4.51` },

    { t: "p", text: "Without smoothing the model runs to 99.95 % confidence and a logit gap of 9.9, and it would keep going if you trained longer. With smoothing it settles at exactly **0.91** — the target it was given — and the logit gap stops at 4.5. The model is no less correct; it has stopped being certain." },

    { t: "callout", kind: "insight", title: "The benefit is calibration, not accuracy",
      body: [{ t: "p", text: "Label smoothing rarely moves top-1 accuracy much. What it changes is whether the probability means anything: an unsmoothed network that says 0.999 is right about 97 % of the time, which makes its confidence useless as a signal. If anything downstream thresholds on the probability — routing to a human, abstaining, ranking by certainty — that gap is the whole problem, and this one argument closes most of it." }] },

    { t: "callout", kind: "trap", title: "The loss no longer goes to zero, and should not",
      body: [{ t: "p", text: "With `label_smoothing=0.1` the minimum achievable loss is the entropy of the smoothed target, not zero — the executed run shows the same logits scoring 0.1891 unsmoothed and 0.5341 smoothed. So loss curves are not comparable across smoothing settings, and a monitor alerting on \"loss above 0.5\" will fire forever. Compare accuracy, or compare against a run with the same smoothing." }] },

    { t: "h2", n: "02", text: "What a teacher knows that a label does not", id: "dark-knowledge" },

    { t: "p", text: "A hard label says \"cat\". A trained teacher says \"cat, and it is somewhat dog-like, slightly fox-like, and definitely not a car\". That relative ordering among the wrong classes is real information about the input, and one-hot targets discard all of it. Temperature is how you get at it." },

    { t: "out", text: `  T=1.0: cat=0.923  dog=0.046  fox=0.028  car=0.003
  T=2.0: cat=0.689  dog=0.154  fox=0.120  car=0.038
  T=4.0: cat=0.471  dog=0.222  fox=0.196  car=0.110
  T=8.0: cat=0.355  dog=0.244  fox=0.229  car=0.172` },

    { t: "p", text: "At `T=1` the teacher's opinion about dog versus car is buried at 0.046 against 0.003 — a difference the student's gradient barely registers. At `T=4` those become 0.222 against 0.110, a ratio the student can actually learn from. Dividing the logits by `T` before the softmax flattens the distribution without changing its ordering, which is exactly what \"soften\" means here." },

    { t: "diagram", kind: "flow", title: "Two targets, one student",
      caption: "The student learns the task from the labels and the structure of the problem from the teacher. Alpha decides the balance; 0.7 toward the teacher is a common starting point.",
      cols: 3,
      nodes: [
        { id: "t", label: "Teacher", sub: "large, frozen, eval mode", tone: "violet" },
        { id: "s", label: "Student", sub: "small, training", tone: "accent" },
        { id: "soft", label: "Soft loss", sub: "KL at temperature T, x T squared", tone: "warn" },
        { id: "hard", label: "Hard loss", sub: "cross-entropy on true labels", tone: "good" },
        { id: "sum", label: "alpha x soft + (1-alpha) x hard", sub: "what the student descends" }
      ],
      edges: [["t", "soft"], ["s", "soft"], ["s", "hard"], ["soft", "sum"], ["hard", "sum"]] },

    { t: "code", lang: "python", title: "The reference's distillation loss, as written",
      code: `def distillation_loss(student_logits, teacher_logits, labels, T=4.0, alpha=0.7):
    """Combined soft (teacher) + hard (ground truth) loss."""
    soft_loss = F.kl_div(
        F.log_softmax(student_logits / T, dim=1),
        F.softmax(teacher_logits / T, dim=1),
        reduction='batchmean'
    ) * (T ** 2)                       # keep gradient magnitude consistent across T

    hard_loss = F.cross_entropy(student_logits, labels)
    return alpha * soft_loss + (1 - alpha) * hard_loss` },

    { t: "h2", n: "03", text: "Why the T-squared factor is there", id: "t-squared" },

    { t: "p", text: "Dividing logits by `T` shrinks the gradients by `1/T` — and it happens on both sides of the KL, so the soft term's gradient falls by `1/T²`. Without correction, raising the temperature would quietly turn the teacher off. The `T²` puts it back." },

    { t: "out", text: `    T=1.0: soft(raw KL)=0.31586  soft(xT^2)=0.31586  hard=0.5542  |grad|=0.4350
    T=2.0: soft(raw KL)=0.18230  soft(xT^2)=0.72919  hard=0.5542  |grad|=0.6067
    T=4.0: soft(raw KL)=0.05727  soft(xT^2)=0.91637  hard=0.5542  |grad|=0.6353
    T=8.0: soft(raw KL)=0.01494  soft(xT^2)=0.95627  hard=0.5542  |grad|=0.6243` },

    { t: "p", text: "Read the first column: the raw KL collapses from 0.316 to 0.015 as `T` goes from 1 to 8 — a factor of 21, close to the `T² = 64`-ish shrinkage the softening causes. After multiplying by `T²` the term stays in the same range, and the total gradient norm settles around 0.62 rather than falling away. **That is the entire justification for a line that otherwise looks arbitrary.**" },

    { t: "callout", kind: "good", title: "Two things people get wrong",
      body: [{ t: "p", text: "The teacher must be in `eval()` and inside `torch.no_grad()` — otherwise dropout randomises the targets the student is chasing, and you carry gradients for a model you are not training. And the same `T` must be used for both distributions in the KL; softening one side and not the other computes a divergence between two different things. Neither mistake raises an error." }] },

    { t: "h2", n: "04", text: "Mixed precision, and the range problem", id: "fp16" },

    { t: "p", text: "fp16 halves memory and roughly doubles throughput on hardware with tensor cores. What you buy that with is range: the format's usable numbers stop far sooner at both ends than fp32's." },

    { t: "out", text: `  float16  max=65504.0  min normal=6.104e-05  eps=0.0009765625
  float32  max=3.403e+38  min normal=1.175e-38  eps=1.192e-07` },

    { t: "p", text: "The small end is the one that bites. Gradients late in training are routinely `1e-7` or smaller, and in fp16 those are simply zero." },

    { t: "out", text: `  small gradients underflow to zero in fp16:
    1e-04 -> fp16 1.000e-04   kept
    1e-06 -> fp16 1.013e-06   kept
    1e-08 -> fp16 0.000e+00   LOST
    1e-10 -> fp16 0.000e+00   LOST` },

    { t: "callout", kind: "insight", title: "The loss scaler is one multiplication",
      body: [{ t: "p", text: "Multiply the loss by a large constant before `backward()` and every gradient is multiplied by the same constant, lifting them off the floor. Divide them back before the optimiser step and the update is unchanged. That is the whole trick, and it is why `GradScaler` exists rather than some deeper redesign of the arithmetic." }] },

    { t: "out", text: `  what the loss scaler fixes (scale by 2^16 = 65536):
    1e-06 x65536 -> fp16 6.555e-02 -> /scale -> 1.000e-06   recovered
    1e-08 x65536 -> fp16 6.552e-04 -> /scale -> 9.997e-09   recovered
    1e-10 x65536 -> fp16 6.557e-06 -> /scale -> 1.000e-10   recovered

  and the overflow it must avoid:
    60000 x65536 in fp16 -> inf   (inf: the scaler halves and retries this step)` },

    { t: "p", text: "Every value that was lost comes back. But the same multiplication that rescues the small end can push the large end past 65504 into infinity — which is why the scale factor cannot be a fixed constant, and why `GradScaler` adjusts it." },

    { t: "h2", n: "05", text: "The loop", id: "loop" },

    { t: "code", lang: "python", title: "autocast and GradScaler",
      code: `from torch.amp import autocast, GradScaler

scaler = GradScaler('cuda')

for batch in dataloader:
    optimizer.zero_grad()
    with autocast('cuda'):                  # fp16 for the forward pass
        output = model(batch.x.cuda())
        loss = criterion(output, batch.y.cuda())

    scaler.scale(loss).backward()           # scaled backward, so gradients survive fp16
    scaler.step(optimizer)                  # unscale, check for inf/nan, then step
    scaler.update()                         # raise or lower the scale for next time` },

    { t: "dl", items: [
      ["`autocast`", "Runs each operation in the precision that suits it — matrix multiplications and convolutions in fp16, reductions and softmax in fp32. You do not choose per-op; the list is maintained for you."],
      ["`scaler.scale(loss)`", "Multiplies the loss by the current scale factor, so the backward pass produces gradients that fp16 can hold."],
      ["`scaler.step(optimizer)`", "Unscales the gradients, **checks them for inf or NaN, and skips the step entirely if it finds any**. A skipped step is normal, not a failure."],
      ["`scaler.update()`", "Adjusts the scale: halve it after an overflow, and raise it after a run of clean steps. This is the search for the largest safe multiplier."],
      ["Master weights", "The parameters stay fp32. Only the activations and gradients are fp16 — which is what \"mixed\" means, and why accuracy barely moves."]
    ] },

    { t: "callout", kind: "trap", title: "Clip after unscaling, not before",
      body: [{ t: "p", text: "Gradient clipping in a mixed-precision loop must come after `scaler.unscale_(optimizer)`, otherwise you are clipping numbers that have been multiplied by 65536 and your `max_norm=1.0` is really `max_norm=65536`. The call order is `scaler.unscale_(optimizer)`, then `clip_grad_norm_`, then `scaler.step(optimizer)`. Getting this wrong disables clipping silently, which is exactly the sort of bug lesson 1.12 is about." }] },

    { t: "callout", kind: "note", title: "What this lesson cannot show you",
      body: [{ t: "p", text: "The \"2× faster, half the memory\" claim needs a GPU with tensor cores, and this machine has none — so the numbers above are the arithmetic that makes mixed precision necessary, not a benchmark. bf16 is worth knowing as the modern alternative: it has fp32's exponent range with fewer mantissa bits, so it does not underflow and generally needs no loss scaler at all, at the cost of precision. On hardware that supports it, bf16 is usually the easier choice." }] },

    { t: "exercise", kind: "practice", title: "Distil a small network, and calibrate it", difficulty: "advanced", minutes: 32,
      prompt: "Train a wide teacher on a small dataset, then train two students of identical size: one on hard labels alone, one with the reference's distillation loss at T=4, alpha=0.7. Compare test accuracy. Then sweep T over {1, 2, 4, 8, 16} and plot student accuracy against T. Finally, take the best student and retrain it with label_smoothing=0.1, and compare not just accuracy but calibration — bucket predictions by confidence and check how often each bucket is right.",
      hints: [
        "Keep the teacher in eval() inside torch.no_grad(), or the targets move underneath you.",
        "Very high T flattens the teacher toward uniform — expect the curve to turn over.",
        "For calibration, ten buckets of predicted probability against observed accuracy is enough to see the gap."
      ],
      solution: {
        notes: [
          { t: "p", text: "The temperature sweep usually shows a hump: too low and the teacher's soft targets are nearly one-hot, so distillation adds nothing over the labels; too high and the distribution approaches uniform, so it carries no information either. The useful range is wide and shallow, which is why 3 to 5 is such a common default — the exact value matters much less than being somewhere in the middle." },
          { t: "p", text: "The calibration comparison is the part worth keeping. An unsmoothed network's 0.99 bucket is typically right well below 99 % of the time, and smoothing closes most of that gap while barely moving accuracy. Once you have seen the two curves side by side, the reason modern training scripts turn smoothing on by default stops being folklore." }
        ]
      } }

  ],

  takeaways: [
    "Label smoothing gives the true class `1 - eps + eps/K` — measured at 0.910 for K=10, eps=0.1.",
    "It stops confidence escalating: 0.9995 unsmoothed against exactly 0.9100 smoothed, with the logit gap halved.",
    "The minimum loss is no longer zero, so loss curves are not comparable across smoothing settings.",
    "Temperature flattens the teacher without reordering it, exposing inter-class structure a one-hot label discards.",
    "The `T²` factor undoes the `1/T²` gradient shrinkage that softening causes — measured across T = 1 to 8.",
    "fp16 tops out at 65504 and loses anything below ~6e-5; the loss scaler multiplies gradients up and divides them back."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "With label_smoothing=0.1 and 10 classes, what probability does the true class get in the target?",
      options: ["1.0", "0.9", "0.91", "0.99"],
      answer: 2,
      why: "PyTorch spreads eps across all K classes, so the true class keeps `1 - eps + eps/K` = 0.9 + 0.01 = 0.91, and each of the others gets 0.01. The executed run prints exactly that, and the trained model converges to 0.9100 — the target it was given." },
    { stem: "Why is the soft loss multiplied by T²?",
      options: ["To match the hard loss's magnitude", "Because dividing logits by T shrinks the soft gradient by 1/T² on both sides of the KL", "To make the loss positive", "It is an empirical constant with no derivation"],
      answer: 1,
      why: "Softening divides by T on both the student's and the teacher's side, so the soft term's gradient falls as 1/T². The executed sweep shows the raw KL dropping from 0.316 to 0.015 between T=1 and T=8 and the T² factor restoring it — without it, raising the temperature would silently switch the teacher off." },
    { stem: "A gradient of 1e-8 is computed in fp16 without a loss scaler. What happens?",
      options: ["It is rounded to 6.1e-5", "It becomes zero", "It raises an overflow error", "It is stored exactly"],
      answer: 1,
      why: "fp16's smallest normal value is about 6.1e-5, and the executed run shows 1e-8 and 1e-10 both landing on exactly 0.000e+00. The parameter then receives no update at all — the training silently stops learning in the layers where gradients are smallest, usually the earliest ones." },
    { stem: "What does scaler.update() do?",
      options: ["Updates the model weights", "Unscales the gradients", "Raises or lowers the scale factor based on whether an overflow occurred", "Copies fp16 weights back to fp32"],
      answer: 2,
      why: "It searches for the largest multiplier that does not overflow: halve after an inf or NaN is detected, raise after a run of clean steps. `scaler.step` is what unscales and decides whether to skip, and the weights were never fp16 in the first place — the master copy stays fp32." }
  ] },

  interview: { title: "Interview", sub: "Training-technique questions", questions: [
    { level: "Core", q: "What does label smoothing do and why would you use it?",
      strong: "Softens the one-hot target so the model stops escalating its confidence — the gain is calibration rather than accuracy.",
      answer: [{ t: "p", text: "It replaces the target with `1 - eps + eps/K` on the true class and `eps/K` elsewhere. The reason it matters is that softmax can never output exactly 1, so a one-hot target gives the model an unreachable goal and it keeps pushing logits apart indefinitely. I measured that: unsmoothed, a single example converges to 0.9995 confidence with a logit gap of 9.9; with smoothing at 0.1 it stops at exactly 0.91 and a gap of 4.5. Accuracy usually barely moves — what improves is whether the probability means anything, which matters the moment something downstream thresholds on it. The practical catch is that the minimum loss is no longer zero, so you cannot compare loss curves across smoothing settings." }] },
    { level: "Core", q: "Explain knowledge distillation and the role of temperature.",
      strong: "Train a small student on the teacher's softened distribution; temperature exposes the relative ordering among wrong classes.",
      answer: [{ t: "p", text: "A hard label says \"cat\" and throws away the fact that the teacher also thought it was a bit dog-like and definitely not a car. That relative structure is real information, and dividing the logits by a temperature above 1 flattens the distribution so the student's gradient can see it — in my run, dog against car went from 0.046 versus 0.003 at T=1 to 0.222 versus 0.110 at T=4. The loss combines a KL against that softened teacher with ordinary cross-entropy on the true labels, weighted by alpha. The detail worth knowing is the T² multiplier: softening shrinks the soft gradient by 1/T², so without it raising the temperature would quietly turn the teacher's contribution off." }] },
    { level: "Senior", q: "You enable mixed precision and the loss becomes NaN in the second epoch. How do you debug it?",
      strong: "Check the scaler is actually in use, look at where the inf appears, and consider bf16 — then look for operations that should not be in fp16.",
      answer: [{ t: "p", text: "First I would confirm the loop is correct, because the common cause is structural rather than numerical: `scaler.scale(loss).backward()` rather than a plain `backward()`, and clipping placed after `scaler.unscale_` rather than before — clipping scaled gradients means the `max_norm` is effectively multiplied by the scale factor and does nothing. `scaler.step` already skips steps where it finds inf or NaN, so if NaN is reaching the weights, either the scaler is not in the path or the NaN is being produced in the forward pass. For the forward pass I would look for the operations that overflow fp16's 65504 ceiling — a large sum, an exponential, an attention score matrix before softmax, a loss term computed on unnormalised values. Those usually belong in fp32, and `autocast` lets you force that locally. If the hardware supports it I would try bf16 first, because it carries fp32's exponent range and so does not underflow or overflow the same way, which removes the whole class of problem at the cost of some mantissa precision." }] }
  ] }
});

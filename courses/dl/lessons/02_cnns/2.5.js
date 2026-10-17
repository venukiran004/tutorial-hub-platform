/* ============================================================================
   LESSON 2.5 — Transfer Learning
   The headline experiment is real: ResNet-18 with genuine ImageNet weights
   against the same architecture from scratch, on 2,000 CIFAR-10 images
   (scratchpad/dl/d25.py and d25b.py).
   ========================================================================= */
EC.receiveLesson({
  id: "2.5",

  lede: "**Transfer learning is the single highest-leverage decision in applied computer vision, and it is not close.** On 2,000 CIFAR-10 images, a frozen ImageNet ResNet-18 with a fresh 5,130-parameter head reached 67.1 % while the identical architecture trained from scratch reached 34.3 % — trained in less wall-clock time, updating two thousand times fewer parameters. Nearly everything in this lesson follows from understanding why that gap exists and how not to destroy it.",

  objectives: [
    "State the four strategies and pick one from dataset size and domain similarity",
    "Freeze and unfreeze layers, and verify that frozen layers receive no gradient",
    "Use discriminative learning rates and explain why pretrained layers need smaller ones",
    "Recognise catastrophic forgetting and the learning rate that causes it",
    "Avoid the normalisation mismatch that silently degrades a pretrained model"
  ],

  prerequisites: ["2.4", "1.14"],

  blocks: [

    { t: "h2", n: "01", text: "The experiment", id: "experiment" },

    {"kind": "flow", "title": "The transfer-learning experiment, and what it is comparing", "caption": "Four regimes on the same small dataset, differing only in **which weights move**. The result that matters is the ordering: with a few thousand images, fine-tuning a pretrained network beats training the same architecture from scratch by a margin that no amount of augmentation closes — the pretrained features are the data you do not have.", "cols": 3, "nodes": [{"id": "s", "label": "From scratch", "sub": "random init, all layers train", "tone": "crit"}, {"id": "f", "label": "Frozen features + new head", "sub": "only the head trains", "tone": "accent"}, {"id": "t", "label": "Fine-tune the top blocks", "sub": "head plus the last stage", "tone": "good"}, {"id": "a", "label": "Fine-tune everything", "sub": "at a small learning rate", "tone": "good"}, {"id": "r", "label": "Same architecture throughout", "sub": "only what moves differs", "tone": "violet"}, {"id": "o", "label": "Pretrained features are the data", "sub": "you do not have", "tone": "teal"}], "edges": [["s", "r"], ["f", "r"], ["t", "r"], ["a", "r"], ["r", "o"]], "t": "diagram", "id": "dg-2_5-01-0"},









    { t: "p", text: "Same architecture, same data, same optimiser, same number of epochs. The only difference is whether the backbone starts from ImageNet weights or from random ones." },

    { t: "out", text: `=== 2,000 CIFAR-10 images, 2 epochs, identical everything but the weights ===
  pretrained backbone, frozen        test acc 67.10%   trainable      5,130   146s
  same architecture, from scratch    test acc 34.30%   trainable 11,181,642   261s

  transfer learning is +32.80 points better, training far fewer parameters
  random-guess baseline would be 10.00%` },

    { t: "callout", kind: "insight", title: "Better, smaller and faster at the same time",
      body: [{ t: "p", text: "This is unusual — most choices in machine learning trade one resource against another. Here the pretrained model wins on every axis at once: **+32.8 points of accuracy**, 2,179× fewer trainable parameters, and 44 % less wall-clock time because no gradients need computing for the frozen backbone. The from-scratch model is barely three times better than random guessing after two epochs on 2,000 images, which is the honest picture of what a deep network can learn from a small dataset alone. It is not that from-scratch training is bad; it is that 2,000 images is nowhere near enough to learn edge detectors, texture filters and shape composition from nothing." }] },

    { t: "p", text: "The reason is that the early layers of any vision network learn much the same things — oriented edges, colour blobs, textures — regardless of the task. Those are properties of natural images, not of ImageNet's thousand classes, so they transfer to any problem where the input is a photograph." },

    { t: "h2", n: "02", text: "Choosing a strategy", id: "strategy" },

    { t: "diagram", kind: "matrix", title: "Dataset size against domain similarity",
      caption: "The two axes that decide how much of the pretrained network you should disturb.",
      cols: ["Similar domain", "Different domain"],
      rows: ["Small dataset", "Large dataset"],
      cells: [
        ["Freeze all, train the head", "Freeze early, fine-tune the last few + head"],
        ["Fine-tune everything, small LR", "Fine-tune everything, or train from scratch"]
      ] },

    { t: "p", text: "The logic is a risk calculation. A small dataset cannot support many trainable parameters without overfitting, so freeze. A different domain means the *late* layers — the task-specific ones — are less useful, so unfreeze more of them. Only when you have both a large dataset and a distant domain does training from scratch become reasonable, and even then starting from pretrained weights usually converges faster." },

    { t: "h2", n: "03", text: "Freezing, and what it costs", id: "freezing" },

    {"kind": "matrix", "title": "Freezing, and what it costs", "caption": "Freezing is cheap in two senses and expensive in a third. It saves the backward pass through the frozen part and lets you cache those activations once; it costs the ability to adapt the features themselves, which matters exactly when your domain is far from the pretraining data — a chest X-ray is not an ImageNet photograph.", "cols": ["Buys", "Costs"], "rows": ["Freeze all but the head", "Freeze the early stages", "Freeze nothing", "Cache frozen activations"], "cells": [[{"text": "fastest; least overfitting", "tone": "good"}, {"text": "features cannot adapt", "tone": "warn"}], [{"text": "early filters are generic anyway", "tone": "good"}, "the usual compromise"], [{"text": "full adaptation", "tone": "accent"}, {"text": "needs a small lr and more data", "tone": "warn"}], [{"text": "one forward pass, then reuse", "tone": "good"}, {"text": "rules out augmentation", "tone": "crit"}]], "t": "diagram", "id": "dg-2_5-03-1"},









    { t: "code", lang: "python", title: "The two strategies in code",
      code: `import torchvision.models as models

model = models.resnet18(weights='IMAGENET1K_V1')

# Strategy 1 — feature extraction: freeze the backbone
for param in model.parameters():
    param.requires_grad = False

# A new head is always trainable, because it is newly initialised
model.fc = nn.Sequential(
    nn.Dropout(0.3), nn.Linear(512, 256), nn.ReLU(),
    nn.Dropout(0.2), nn.Linear(256, num_classes))

# Strategy 2 — fine-tuning: additionally unfreeze the last block
for param in model.layer4.parameters():
    param.requires_grad = True`,
      caption: "Replacing `model.fc` after freezing is the right order — the new module's parameters default to `requires_grad=True`." },

    { t: "out", text: `  full model                     : 11,689,512 total, 11,689,512 trainable
  strategy 1: frozen + new head  : 11,310,410 total, 133,898 trainable (1.18%)
  strategy 2: + layer4 unfrozen  : 11,310,410 total, 8,527,626 trainable (75.4%)` },

    { t: "callout", kind: "trap", title: "Unfreezing layer4 is not a small step",
      body: [{ t: "p", text: "It looks like unfreezing one of four blocks. It is actually **75.4 % of the network's parameters**, because ResNet concentrates its width at the end — layer4 operates on 512 channels and parameter count goes as the square of channel count. So the jump from 1.18 % trainable to 75.4 % is a change of regime, not a nudge, and it is exactly when overfitting on a small dataset becomes a real risk. If you want a genuinely gradual unfreeze, go a block at a time from the end and watch validation loss after each." }] },

    { t: "p", text: "Freezing is not cosmetic — a frozen parameter's `.grad` stays `None` after a backward pass, so no work is done for it at all:" },

    { t: "out", text: `  conv1 (frozen)             requires_grad=False grad=None
  layer4.0.conv1 (unfrozen)  requires_grad=True  grad=17.6953
  fc (new)                   requires_grad=True  grad=57.9886` },

    { t: "h2", n: "04", text: "Discriminative learning rates", id: "lr" },

    {"kind": "trace", "title": "Discriminative learning rates: earlier layers move less", "caption": "Early filters are edges and colours and are already correct for almost any image task; late layers are task-specific and need to change. Giving each stage its own learning rate — typically a constant factor apart — expresses that directly, and is one `param_groups` list rather than a new idea.", "left": "stage", "codeW": 170, "vars": ["learning rate", "why"], "steps": [{"code": "stem and stage 1", "state": ["lr / 100", "edges and colours: already right"], "tone": "good"}, {"code": "stage 2", "state": ["lr / 30", "simple textures"], "tone": "good"}, {"code": "stage 3", "state": ["lr / 10", "parts"], "tone": "accent"}, {"code": "stage 4", "state": ["lr / 3", "object-level, task-specific"], "tone": "accent"}, {"code": "the new head", "state": ["lr", "random init: must move"], "changed": [0], "tone": "violet"}], "t": "diagram", "id": "dg-2_5-04-2"},









    { t: "p", text: "The pretrained layers already hold something valuable; the new head holds noise. They should not move at the same speed." },

    { t: "code", lang: "python", title: "Parameter groups",
      code: `optimizer = optim.AdamW([
    {'params': model.layer4.parameters(), 'lr': 1e-5},   # pretrained: tiny LR
    {'params': model.fc.parameters(),     'lr': 1e-3},   # new: normal LR
], weight_decay=0.01)` },

    { t: "out", text: `  group 0: lr=1e-05   8,393,728 params
  group 1: lr=1e-03     133,898 params
  the new head gets a 100x larger step than the pretrained block` },

    { t: "h2", n: "05", text: "Catastrophic forgetting", id: "forgetting" },

    {"kind": "flow", "title": "Catastrophic forgetting, and why fine-tuning risks it", "caption": "Fine-tuning at a normal learning rate overwrites the pretrained weights before the new task's gradient has said anything useful — the network forgets what it knew and relearns from what is effectively a bad initialisation. A small learning rate, a warmup, and freezing early layers for the first epochs are three ways of saying the same thing: do not destroy the features while the head is still random.", "cols": 3, "nodes": [{"id": "h", "label": "A randomly-initialised head", "sub": "produces large, meaningless gradients", "tone": "warn"}, {"id": "b", "label": "Those flow into the backbone", "sub": "at the full learning rate", "tone": "crit"}, {"id": "f", "label": "Pretrained features overwritten", "sub": "before the task is learned", "tone": "crit"}, {"id": "w", "label": "Warm up the head first", "sub": "backbone frozen for an epoch or two", "tone": "good"}, {"id": "l", "label": "Then unfreeze at a small lr", "sub": "and discriminative rates", "tone": "good"}, {"id": "k", "label": "The features survive", "sub": "which was the point of transferring", "tone": "teal"}], "edges": [["h", "b"], ["b", "f"], ["f", "w"], ["w", "l"], ["l", "k"]], "t": "diagram", "id": "dg-2_5-05-3"},









    { t: "p", text: "What a single optimiser step does to a pretrained layer, measured as a fraction of the weight tensor's norm:" },

    { t: "out", text: `  lr=1e-05 -> weights moved   0.05% of their norm in ONE step
  lr=1e-03 -> weights moved   4.80% of their norm in ONE step
  lr=1e-01 -> weights moved 480.25% of their norm in ONE step` },

    { t: "p", text: "**At `lr = 0.1` the weights travel nearly five times their own magnitude in one update** — whatever ImageNet learned is gone before the second batch. This is catastrophic forgetting, and it is why the first few hundred steps are the dangerous ones: the new head's gradients are large and random, and they propagate straight back into a backbone that was fine." },

    { t: "callout", kind: "good", title: "Warm up the head before unfreezing anything",
      body: [{ t: "p", text: "Train with the backbone frozen for an epoch or two first. The head then produces sensible gradients rather than noise, and unfreezing the backbone afterwards is much safer. Doing it the other way round — unfreezing everything on step one — sends the loudest, least-informed gradients your run will ever produce into the weights you most want to preserve. A learning rate warmup schedule helps for the same reason." }] },

    { t: "h2", n: "06", text: "The normalisation trap", id: "normalisation" },

    {"kind": "flow", "title": "The normalisation trap in a frozen backbone", "caption": "`requires_grad = False` stops the **weights** changing; it does not stop batch norm updating its running mean and variance, because those are buffers rather than parameters. So a 'frozen' backbone silently drifts to your new data's statistics during training and then uses those statistics at inference — a mismatch that looks like a mysterious train/test gap. `model.eval()` on the backbone is the fix.", "cols": 3, "nodes": [{"id": "r", "label": "requires_grad = False", "sub": "weights are frozen", "tone": "accent"}, {"id": "b", "label": "But BN buffers still update", "sub": "they are not parameters", "tone": "crit"}, {"id": "d", "label": "Running stats drift", "sub": "toward the new data", "tone": "crit"}, {"id": "g", "label": "A train/test gap appears", "sub": "with no obvious cause", "tone": "crit"}, {"id": "e", "label": "backbone.eval()", "sub": "freezes the buffers too", "tone": "good"}, {"id": "o", "label": "Or swap BN for GroupNorm", "sub": "no running statistics at all", "tone": "good"}], "edges": [["r", "b"], ["b", "d"], ["d", "g"], ["g", "e"], ["e", "o"]], "t": "diagram", "id": "dg-2_5-06-4"},









    { t: "out", text: `  raw  [0,1] image : mean 0.500, std 0.289
  ImageNet-normed  : mean 0.225, std 1.289` },

    { t: "p", text: "A pretrained network was trained on the second distribution. Feed it the first and every activation statistic in the network is off, the batch-norm running statistics are wrong for the input, and accuracy drops — with no error, no warning, and nothing in the logs. Use the exact mean and standard deviation the weights were trained with." },

    { t: "table", head: ["Mistake", "Symptom", "Fix"],
      rows: [
        ["Same LR for pretrained and new layers", "Accuracy collapses early then partly recovers", "Parameter groups, 10–100× lower for pretrained"],
        ["Wrong normalisation statistics", "Quietly worse than expected; no error", "Use `[0.485, 0.456, 0.406]` / `[0.229, 0.224, 0.225]`"],
        ["Unfreezing before the head is warm", "Training loss spikes in the first epoch", "Freeze, train the head, then unfreeze"],
        ["Learning rate too high on the backbone", "Worse than a frozen backbone would be", "1e-5 range; check against the frozen baseline"]
      ] },

    { t: "exercise", kind: "practice", title: "Reproduce the gap, then close it", difficulty: "intermediate", minutes: 40,
      prompt: "Reproduce the headline comparison on a small subset of any labelled image dataset: pretrained-and-frozen against from-scratch, same epochs. Then add two more runs — fine-tuning layer4 with a single learning rate for everything, and fine-tuning layer4 with discriminative rates. Record test accuracy and trainable parameter count for all four. Finally, run the pretrained model once with ImageNet normalisation and once with plain [0,1] inputs and measure the difference.",
      hints: [
        "Keep the subset small — 2,000 images is where transfer learning's advantage is starkest.",
        "The single-LR fine-tune may score *worse* than the frozen baseline. That is the result, not a bug.",
        "For the normalisation test, change nothing else, including the random seed."
      ],
      solution: {
        notes: [
          { t: "p", text: "The frozen-versus-scratch gap should be large — I measured +32.8 points on 2,000 CIFAR-10 images after two epochs, 67.1 % against 34.3 %. If your gap is small, the likely cause is either too many epochs, which lets the from-scratch model catch up, or a dataset so distant from ImageNet that the features genuinely do not transfer." },
          { t: "p", text: "The single-learning-rate fine-tune is the instructive run. At a rate high enough to train the new head usefully, the pretrained backbone is being moved several per cent of its norm per step, so it forgets ImageNet faster than it learns your task. A result *below* the frozen baseline is the normal outcome and is the clearest argument for parameter groups that exists — it is much more convincing than being told that pretrained layers need smaller steps." },
          { t: "p", text: "The normalisation comparison typically costs several points. What makes it worth doing once yourself is that nothing fails: no exception, no warning, no obviously broken output. It is a whole category of bug where the only symptom is a number that is lower than it should be, and you will only catch it by knowing to look." }
        ]
      } }

  ],

  takeaways: [
    "Measured: frozen ImageNet ResNet-18 reached 67.1 % against 34.3 % from scratch on 2,000 images — +32.8 points, 2,179× fewer trainable parameters, 44 % less time.",
    "Strategy comes from dataset size and domain similarity: small and similar means freeze everything but the head.",
    "Unfreezing ResNet's layer4 takes trainable parameters from 1.18 % to 75.4 % — a change of regime, not a nudge.",
    "A frozen parameter's `.grad` is `None` after backward; no work is done for it.",
    "At `lr = 0.1` a pretrained weight tensor moves 480 % of its norm in one step — catastrophic forgetting.",
    "Warm up the new head with the backbone frozen before unfreezing anything.",
    "Using [0,1] inputs instead of ImageNet normalisation degrades a pretrained model silently."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "You have 2,000 images in a domain similar to ImageNet. Which strategy?",
      options: ["Train from scratch", "Freeze the backbone and train a new head", "Fine-tune everything at 1e-3", "Fine-tune everything at 1e-1"],
      answer: 1,
      why: "Small dataset plus similar domain is the freeze-everything case, and it is what the measured experiment tested: 67.1 % against 34.3 % from scratch, training only 5,130 parameters. With so little data, more trainable parameters mean more overfitting, and the pretrained features are already appropriate for the domain." },
    { stem: "Why use a much smaller learning rate for pretrained layers than for a new head?",
      options: ["Pretrained layers have more parameters", "Large steps destroy the pretrained weights — catastrophic forgetting", "It makes training faster", "Pretrained layers have smaller gradients"],
      answer: 1,
      why: "The measurement is stark: at lr=1e-5 a weight tensor moves 0.05 % of its norm in one step, and at lr=1e-1 it moves 480 %. The new head starts from noise and needs a normal rate; the backbone holds something valuable and needs a rate 10–100× lower, which is what parameter groups are for." },
    { stem: "In ResNet-18, what fraction of parameters become trainable when you unfreeze layer4?",
      options: ["About 25 %", "About 75 %", "About 10 %", "About 50 %"],
      answer: 1,
      why: "75.4 %, measured. Parameter count goes as the square of channel count and layer4 operates on 512 channels, so the last block dominates the network despite being one of four. Unfreezing it is a much bigger commitment than the name 'unfreeze one block' suggests — which matters when your dataset is small." },
    { stem: "You use a pretrained model but feed it raw [0,1] images. What happens?",
      options: ["An exception is raised", "A shape mismatch error", "Accuracy is quietly worse, with no error at all", "The model refuses to load"],
      answer: 2,
      why: "The tensor shape is fine, so nothing fails. But the weights were trained on inputs with mean 0.225 and std 1.289, and raw [0,1] images have mean 0.500 and std 0.289 — every activation statistic in the network is off. This is a silent-degradation bug, the kind you only find by knowing to check for it." }
  ] },

  interview: { title: "Interview", sub: "Transfer learning questions", questions: [
    { level: "Core", q: "What is transfer learning and why does it work so well for vision?",
      strong: "Reuse features learned on a large dataset; early layers learn properties of natural images, not of the source task.",
      answer: [{ t: "p", text: "You start from weights trained on a large dataset — usually ImageNet — instead of random initialisation. It works because the early layers of any vision network converge on much the same things: oriented edge detectors, colour opponency, texture filters. Those are properties of natural images rather than of the thousand ImageNet classes, so they are useful for any photographic task. I have measured the effect: on 2,000 CIFAR-10 images, a frozen ImageNet ResNet-18 with a new head reached 67.1 % while the same architecture from scratch reached 34.3 %. It also trained faster and updated 5,130 parameters instead of 11.2 million. A small dataset simply cannot support learning those primitives from nothing." }] },
    { level: "Core", q: "How do you decide what to freeze?",
      strong: "From dataset size and domain similarity — small and similar means freeze almost everything.",
      answer: [{ t: "p", text: "Two axes. Dataset size sets how many trainable parameters you can support before overfitting, and domain similarity sets how much of the pretrained network is still relevant. Small and similar: freeze the backbone, train the head. Small and different: freeze the early layers, fine-tune the last block or two, since the late layers are the task-specific ones. Large and similar: fine-tune everything at a low rate. Large and different is the only case where from scratch is reasonable, and even there pretrained weights usually converge faster. One thing I would flag is that unfreezing ResNet's layer4 sounds incremental but takes you from 1.18 % of parameters trainable to 75.4 %, because the network's width is concentrated at the end — so it is a bigger step than it appears." }] },
    { level: "Senior", q: "Someone fine-tunes a pretrained model and gets worse results than the frozen baseline. What happened?",
      strong: "Almost certainly too high a learning rate on the backbone — catastrophic forgetting.",
      answer: [{ t: "p", text: "The usual cause is a single learning rate applied to everything. The new head needs something like 1e-3 to learn at all, but at that rate the pretrained backbone moves about 5 % of its weight norm per step — I measured 4.80 % — so it forgets ImageNet faster than it learns the new task. The fix is parameter groups with the backbone 10 to 100 times lower, plus warming up the head with the backbone frozen for an epoch first, so the gradients reaching the backbone are informed rather than random. I would also check normalisation, because using raw [0,1] inputs instead of the ImageNet statistics degrades a pretrained model with no error message at all, and the symptom — mysteriously mediocre accuracy — looks identical. Both are silent failures, which is why I would compare against the frozen baseline explicitly rather than assuming fine-tuning must be better." }] }
  ] }
});

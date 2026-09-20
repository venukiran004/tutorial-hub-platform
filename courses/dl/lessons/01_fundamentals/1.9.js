/* ============================================================================
   LESSON 1.9 — Learning-Rate Schedules
   Mirrors 01_Neural_Network_Fundamentals.md · §11 (the five PyTorch
   schedulers and the recommendation table). Each scheduler in the
   reference's snippet was run for 100 epochs and its learning rate
   recorded; the plotted curves are those recordings.
   ========================================================================= */
EC.receiveLesson({
  id: "1.9",

  lede: "**A learning-rate schedule changes the step size as training proceeds: large early, when the weights are far from anything good and big steps are cheap, and small late, when the optimiser is near a minimum and needs to settle into it.** The reference lists five PyTorch schedulers and a rule for choosing among them. This lesson runs every one of them for a hundred epochs and plots what the learning rate actually did — step decay's cliffs, cosine's smooth fall, one-cycle's rise-then-fall, warm restarts' saw-tooth, plateau's reaction to a stalled validation loss — then adds the warm-up the reference recommends for the first 5–10 % of any run.",

  objectives: [
    "Describe the shape of StepLR, CosineAnnealingLR, OneCycleLR, CosineAnnealingWarmRestarts and ReduceLROnPlateau from their parameters",
    "Wire a scheduler into a PyTorch training loop correctly, including the plateau scheduler's need for a metric",
    "Explain what warm-up protects against and implement linear warm-up followed by cosine decay",
    "Choose a schedule for fixed-length training, unknown-length training, fine-tuning a transformer, and super-convergence"
  ],

  prerequisites: ["1.5"],

  blocks: [

    { t: "h2", n: "01", text: "Why the step size should change", id: "why" },

    { t: "p", text: "The learning rate is the single most important hyperparameter, and no single value is right for a whole run. Early on, a large rate covers ground quickly and the noise of mini-batch gradients does no harm — the weights are nowhere near a minimum anyway. Later, the same rate makes the optimiser bounce around the bottom of the valley without settling; a smaller one lets it descend into the minimum. A schedule is the compromise: decide in advance how the rate will fall, or let the validation loss decide for you." },

    { t: "h2", n: "02", text: "The five schedulers, run", id: "five" },

    { t: "code", lang: "python", title: "The reference's schedulers",
      code: `import torch.optim as optim
from torch.optim.lr_scheduler import (StepLR, CosineAnnealingLR, OneCycleLR,
                                      CosineAnnealingWarmRestarts, ReduceLROnPlateau)

optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)

# step decay: reduce by a factor every N epochs
scheduler = StepLR(optimizer, step_size=30, gamma=0.1)

# cosine annealing: smooth decay to (almost) 0 — best for fixed-epoch training
scheduler = CosineAnnealingLR(optimizer, T_max=100, eta_min=1e-6)

# one-cycle: linear warm-up → cosine decay (super-convergence)
scheduler = OneCycleLR(optimizer, max_lr=1e-3, total_steps=len(train_loader) * epochs)

# reduce on plateau: lower the rate when the validation loss stops improving
scheduler = ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)

# warm restarts: cosine with periodic resets
scheduler = CosineAnnealingWarmRestarts(optimizer, T_0=10, T_mult=2)

# in the loop, after optimizer.step():
#   scheduler.step()             for all but the plateau scheduler
#   scheduler.step(val_loss)     for ReduceLROnPlateau, once per epoch`,
      caption: "Each constructor wraps the optimiser and rewrites its learning rate on every scheduler.step(). Every scheduler above was run for 100 epochs from lr = 10⁻³ and its rate recorded at each epoch:" },

    { t: "out", text: `                                                epoch:  0        10       29       30       50       60       90       99
StepLR(step_size=30, gamma=0.1)                        1.00e-03 1.00e-03 1.00e-03 1.00e-04 1.00e-04 1.00e-05 1.00e-06 1.00e-06
CosineAnnealingLR(T_max=100, eta_min=1e-6)             1.00e-03 9.76e-04 8.07e-04 7.94e-04 5.01e-04 3.46e-04 2.54e-05 1.25e-06
OneCycleLR(max_lr=1e-3, total_steps=100)               4.00e-05 2.95e-04 1.00e-03 9.99e-04 7.94e-04 5.89e-04 4.02e-05 4.00e-09
CosineAnnealingWarmRestarts(T_0=10, T_mult=2)          1.00e-03 1.00e-03 6.16e-06 1.00e-03 5.00e-04 1.46e-04 8.54e-04 7.09e-04
linear warm-up 10 epochs + cosine                      0.00e+00 1.00e-03 8.94e-04 8.83e-04 5.87e-04 4.13e-04 3.02e-05 3.05e-07
ReduceLROnPlateau(factor=0.5, patience=5), loss stalls at epoch 40
                                                       1.00e-03 1.00e-03 1.00e-03 1.00e-03 5.00e-04 1.25e-04 3.91e-06 1.95e-06` },

    { t: "viz", title: "What each schedule did to the learning rate over 100 epochs",
      caption: "Recorded from the schedulers above, all starting from 10⁻³ (one-cycle starts at max_lr/25 and peaks at epoch 30). Step decay falls in cliffs; cosine falls smoothly and reaches almost zero exactly at T_max; one-cycle rises then anneals to nothing; warm restarts reset to the full rate at epochs 10, 30 and 70 — periods of 10, 20 and 40 with T_mult = 2; warm-up plus cosine is the transformer default; reduce-on-plateau holds until the validation loss stalls and then halves every six epochs.",
      svg: `<svg viewBox="0 0 760 320" role="img" aria-label="Learning-rate schedules over 100 epochs">
<g><rect x="20" y="14" width="210" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="20" y1="124" x2="230" y2="124" style="stroke:var(--line)" stroke-width="1"/>
<polyline points="20,38 22,38 24,38 26,38 28,38 31,38 33,38 35,38 37,38 39,38 41,38 43,38 45,38 48,38 50,38 52,38 54,38 56,38 58,38 60,38 62,38 65,38 67,38 69,38 71,38 73,38 75,38 77,38 79,38 82,38 84,115 86,115 88,115 90,115 92,115 94,115 96,115 98,115 101,115 103,115 105,115 107,115 109,115 111,115 113,115 115,115 118,115 120,115 122,115 124,115 126,115 128,115 130,115 132,115 135,115 137,115 139,115 141,115 143,115 145,115 147,123 149,123 152,123 154,123 156,123 158,123 160,123 162,123 164,123 166,123 168,123 171,123 173,123 175,123 177,123 179,123 181,123 183,123 185,123 188,123 190,123 192,123 194,123 196,123 198,123 200,123 202,123 205,123 207,123 209,123 211,124 213,124 215,124 217,124 219,124 222,124 224,124 226,124 228,124 230,124" fill="none" style="stroke:var(--accent)" stroke-width="2"/>
<text x="26" y="28" class="s-label">StepLR</text><text x="26" y="138" class="s-sub">step 30, ×0.1</text>
<text x="226" y="138" text-anchor="end" class="s-sub">epoch 0 → 100</text></g>
<g><rect x="265" y="14" width="210" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="265" y1="124" x2="475" y2="124" style="stroke:var(--line)" stroke-width="1"/>
<polyline points="265,38 267,38 269,38 271,38 273,38 276,39 278,39 280,39 282,39 284,40 286,40 288,41 290,41 293,42 295,42 297,43 299,43 301,44 303,45 305,45 307,46 310,47 312,48 314,49 316,50 318,51 320,52 322,53 324,54 327,55 329,56 331,57 333,58 335,59 337,60 339,61 341,63 343,64 346,65 348,66 350,68 352,69 354,70 356,72 358,73 360,74 363,76 365,77 367,78 369,80 371,81 373,82 375,84 377,85 380,86 382,88 384,89 386,90 388,92 390,93 392,94 394,96 397,97 399,98 401,99 403,100 405,102 407,103 409,104 411,105 413,106 416,107 418,108 420,109 422,110 424,111 426,112 428,113 430,114 433,115 435,116 437,116 439,117 441,118 443,119 445,119 447,120 450,120 452,121 454,121 456,122 458,122 460,123 462,123 464,123 467,123 469,124 471,124 473,124 475,124" fill="none" style="stroke:var(--accent)" stroke-width="2"/>
<text x="271" y="28" class="s-label">CosineAnnealingLR</text><text x="271" y="138" class="s-sub">T_max 100 → 10⁻⁶</text>
<text x="471" y="138" text-anchor="end" class="s-sub">epoch 0 → 100</text></g>
<g><rect x="510" y="14" width="210" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="510" y1="124" x2="720" y2="124" style="stroke:var(--line)" stroke-width="1"/>
<polyline points="510,121 512,120 514,120 516,118 518,117 521,115 523,112 525,109 527,106 529,102 531,99 533,95 535,90 538,86 540,82 542,77 544,73 546,68 548,64 550,60 552,56 555,53 557,49 559,46 561,44 563,42 565,40 567,39 569,38 572,38 574,38 576,38 578,38 580,39 582,39 584,40 586,40 588,41 591,41 593,42 595,43 597,44 599,45 601,46 603,47 605,49 608,50 610,51 612,53 614,54 616,56 618,57 620,59 622,61 625,62 627,64 629,66 631,68 633,70 635,71 637,73 639,75 642,77 644,79 646,81 648,83 650,85 652,87 654,89 656,91 658,92 661,94 663,96 665,98 667,100 669,101 671,103 673,105 675,106 678,108 680,109 682,111 684,112 686,113 688,115 690,116 692,117 695,118 697,119 699,120 701,121 703,121 705,122 707,122 709,123 712,123 714,124 716,124 718,124 720,124" fill="none" style="stroke:var(--good)" stroke-width="2"/>
<text x="516" y="28" class="s-label">OneCycleLR</text><text x="516" y="138" class="s-sub">warm-up then anneal</text>
<text x="716" y="138" text-anchor="end" class="s-sub">epoch 0 → 100</text></g>
<g><rect x="20" y="166" width="210" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="20" y1="276" x2="230" y2="276" style="stroke:var(--line)" stroke-width="1"/>
<polyline points="20,190 22,192 24,198 26,208 28,220 31,233 33,246 35,258 37,268 39,274 41,190 43,191 45,192 48,195 50,198 52,203 54,208 56,213 58,220 60,226 62,233 65,240 67,246 69,253 71,258 73,263 75,268 77,271 79,274 82,275 84,190 86,190 88,191 90,191 92,192 94,193 96,195 98,196 101,198 103,200 105,203 107,205 109,208 111,211 113,213 115,217 118,220 120,223 122,226 124,230 126,233 128,236 130,240 132,243 135,246 137,249 139,253 141,255 143,258 145,261 147,263 149,266 152,268 154,270 156,271 158,273 160,274 162,275 164,275 166,276 168,190 171,190 173,190 175,190 177,191 179,191 181,191 183,192 185,192 188,193 190,193 192,194 194,195 196,195 198,196 200,197 202,198 205,199 207,200 209,201 211,203 213,204 215,205 217,206 219,208 222,209 224,211 226,212 228,213 230,215" fill="none" style="stroke:var(--warn)" stroke-width="2"/>
<text x="26" y="180" class="s-label">Warm restarts</text><text x="26" y="290" class="s-sub">T₀ = 10, T_mult = 2</text>
<text x="226" y="290" text-anchor="end" class="s-sub">epoch 0 → 100</text></g>
<g><rect x="265" y="166" width="210" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="265" y1="276" x2="475" y2="276" style="stroke:var(--line)" stroke-width="1"/>
<polyline points="265,276 267,267 269,259 271,250 273,242 276,233 278,224 280,216 282,207 284,199 286,190 288,190 290,190 293,190 295,190 297,191 299,191 301,191 303,192 305,192 307,193 310,193 312,194 314,194 316,195 318,196 320,197 322,197 324,198 327,199 329,200 331,201 333,202 335,203 337,204 339,205 341,207 343,208 346,209 348,210 350,212 352,213 354,214 356,216 358,217 360,218 363,220 365,221 367,223 369,224 371,226 373,227 375,229 377,230 380,231 382,233 384,235 386,236 388,237 390,239 392,240 394,242 397,243 399,245 401,246 403,248 405,249 407,250 409,252 411,253 413,254 416,256 418,257 420,258 422,259 424,261 426,262 428,263 430,264 433,265 435,266 437,267 439,268 441,269 443,269 445,270 447,271 450,272 452,272 454,273 456,273 458,274 460,274 462,275 464,275 467,275 469,276 471,276 473,276 475,276" fill="none" style="stroke:var(--good)" stroke-width="2"/>
<text x="271" y="180" class="s-label">Warm-up + cosine</text><text x="271" y="290" class="s-sub">10 epochs linear, then cosine</text>
<text x="471" y="290" text-anchor="end" class="s-sub">epoch 0 → 100</text></g>
<g><rect x="510" y="166" width="210" height="110" rx="6" class="s-fill s-stroke" stroke-width="1"/>
<line x1="510" y1="276" x2="720" y2="276" style="stroke:var(--line)" stroke-width="1"/>
<polyline points="510,190 512,190 514,190 516,190 518,190 521,190 523,190 525,190 527,190 529,190 531,190 533,190 535,190 538,190 540,190 542,190 544,190 546,190 548,190 550,190 552,190 555,190 557,190 559,190 561,190 563,190 565,190 567,190 569,190 572,190 574,190 576,190 578,190 580,190 582,190 584,190 586,190 588,190 591,190 593,190 595,190 597,190 599,190 601,190 603,190 605,190 608,190 610,233 612,233 614,233 616,233 618,233 620,233 622,254 625,254 627,254 629,254 631,254 633,254 635,265 637,265 639,265 642,265 644,265 646,265 648,271 650,271 652,271 654,271 656,271 658,271 661,273 663,273 665,273 667,273 669,273 671,273 673,275 675,275 678,275 680,275 682,275 684,275 686,275 688,275 690,275 692,275 695,275 697,275 699,276 701,276 703,276 705,276 707,276 709,276 712,276 714,276 716,276 718,276 720,276" fill="none" style="stroke:var(--crit)" stroke-width="2"/>
<text x="516" y="180" class="s-label">ReduceLROnPlateau</text><text x="516" y="290" class="s-sub">×0.5 after 5 stalled epochs</text>
<text x="716" y="290" text-anchor="end" class="s-sub">epoch 0 → 100</text></g>
</svg>` },

    { t: "dl", items: [
      ["StepLR", "Multiply by γ every step_size epochs. Simple, and the classic ImageNet recipe (÷10 at epochs 30, 60, 90). The cliffs are abrupt: the loss usually drops sharply right after each one, which tells you the rate had been too high for a while."],
      ["CosineAnnealingLR", "Follow half a cosine from the initial rate to eta_min over T_max epochs. Smooth, no hyperparameters to speak of beyond the length, and the reference's recommendation whenever the number of epochs is fixed in advance."],
      ["OneCycleLR", "Start low, rise linearly to max_lr over the first part of the run, then anneal below the starting rate. The warm-up phase lets a higher peak rate be used than would otherwise be stable — the 'super-convergence' effect — and the annealing settles the weights. Note it steps per *batch*, hence total_steps = batches × epochs."],
      ["CosineAnnealingWarmRestarts", "Cosine decay over T_0 epochs, then a jump back to the full rate, with each period T_mult times longer than the last. The restarts kick the optimiser out of the current basin; the models at the end of each period can be averaged as a snapshot ensemble."],
      ["ReduceLROnPlateau", "Watch a metric; when it has not improved for `patience` epochs, multiply the rate by `factor`. The only scheduler that reacts to training rather than following a plan, and the one for a run whose length you do not know."]
    ] },

    { t: "h2", n: "03", text: "Warm-up", id: "warmup" },

    { t: "p", text: "The reference's recommendation: **start from 0 and rise to the peak rate over the first 5–10 % of steps.** Fresh random weights produce large, uninformative gradients, and Adam's second-moment estimate is unreliable for the first few dozen steps; a full-size learning rate applied to both can throw the weights somewhere bad in the first hundred updates, and the run never recovers. Warm-up keeps the early steps small until the statistics settle. Transformers are especially sensitive, which is why 'linear warm-up then cosine (or linear) decay' is the default schedule for training and fine-tuning them." },

    { t: "code", lang: "python", title: "Linear warm-up then cosine decay, as a LambdaLR",
      code: `import math
from torch.optim.lr_scheduler import LambdaLR

warmup, total = 10, 100
def lr_factor(t):
    if t < warmup:
        return t / warmup                                        # 0 → 1 over the warm-up
    return 0.5 * (1 + math.cos(math.pi * (t - warmup) / (total - warmup)))   # 1 → 0 cosine
scheduler = LambdaLR(optimizer, lr_factor)   # multiplies the optimiser's base lr by lr_factor(epoch)`,
      caption: "LambdaLR scales the base learning rate by whatever the function returns; any shape can be built this way. This is the 'linear warm-up 10 epochs + cosine' row in the table." },

    { t: "h2", n: "04", text: "Which schedule when", id: "choose" },

    { t: "table", head: ["Situation", "The reference's recommendation"],
      rows: [
        ["Fixed number of epochs, known runtime", "**CosineAnnealingLR**"],
        ["Unknown training length", "**ReduceLROnPlateau**"],
        ["Fine-tuning transformers", "**Linear warm-up + cosine decay**"],
        ["Super-convergence, fastest possible training", "**OneCycleLR**"],
        ["Any run from random weights", "Warm-up over the first 5–10 % of steps"]
      ] },

    { t: "callout", kind: "trap", title: "Order and frequency",
      body: "Call `optimizer.step()` before `scheduler.step()` — PyTorch warns if you reverse them, and the first scheduled rate is skipped. Epoch-based schedulers step once per epoch; OneCycleLR steps once per batch and needs total_steps to match, or it raises an error partway through the run. ReduceLROnPlateau must be given the metric, `scheduler.step(val_loss)`, and it should be the validation metric — stepping it on the training loss makes it react to noise." },

    { t: "callout", kind: "insight", title: "Read the loss curve against the schedule",
      body: "A step-decay run whose loss plunges at every cliff was running too hot between them. A cosine run whose loss is still falling steeply at the end was cut short — extend T_max. A plateau scheduler that halves the rate five times in a row is telling you the model has converged and the remaining epochs are wasted. The schedule is a plan; the loss curve is the review of it." },

    { t: "exercise", kind: "practice", title: "Build the warm-up schedule and check it", difficulty: "core", minutes: 12,
      body: [{ t: "p", text: "Using LambdaLR, build a schedule that warms up linearly for 5 epochs to lr = 3 × 10⁻⁴, holds for 15 epochs, then decays linearly to zero at epoch 50. Record the rate every epoch and print it at epochs 0, 2, 5, 10, 20, 35 and 49." }],
      requirements: [
        "A single lr_factor function with three regimes",
        "The base optimiser lr set to 3e-4",
        "The seven printed values"
      ],
      hint: "For t in [20, 50): factor = (50 − t) / 30.",
      solution: { lang: "python", title: "Solution",
        code: `import torch
from torch.optim.lr_scheduler import LambdaLR
opt = torch.optim.AdamW(torch.nn.Linear(2, 1).parameters(), lr=3e-4)
def lr_factor(t):
    if t < 5: return t / 5
    if t < 20: return 1.0
    return max(0.0, (50 - t) / 30)
sch = LambdaLR(opt, lr_factor); lrs = []
for t in range(50):
    lrs.append(opt.param_groups[0]["lr"]); opt.step(); sch.step()
print([f"{lrs[t]:.1e}" for t in [0, 2, 5, 10, 20, 35, 49]])
# ['0.0e+00', '1.2e-04', '3.0e-04', '3.0e-04', '3.0e-04', '1.5e-04', '1.0e-05']`,
        notes: [{ t: "p", text: "Epoch 0 is zero (the warm-up starts from nothing), epoch 2 is 2/5 of the peak, epochs 5–20 hold at 3 × 10⁻⁴, epoch 35 is halfway down, epoch 49 is one thirtieth of the peak. Trapezoid schedules like this are common for fine-tuning: the hold phase is where most of the learning happens." }] } }
  ],

  takeaways: [
    "Large steps early and small steps late: a schedule is how the learning rate follows the run's needs.",
    "StepLR falls in cliffs, CosineAnnealingLR follows half a cosine to eta_min at T_max, OneCycleLR warms up then anneals below the start, warm restarts reset with lengthening periods, ReduceLROnPlateau reacts to a stalled metric.",
    "Warm-up — 0 to the peak over the first 5–10 % of steps — protects fresh weights and Adam's early statistics from a full-size first step; it is the default for transformers.",
    "Fixed length → cosine; unknown length → plateau; fine-tuning transformers → warm-up + cosine; fastest training → one-cycle.",
    "optimizer.step() before scheduler.step(); one-cycle steps per batch; plateau needs the validation metric.",
    "The loss curve reviews the schedule: plunges at cliffs mean the rate was too high, a still-falling cosine means the run was cut short."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "With CosineAnnealingWarmRestarts(T_0=10, T_mult=2), at which epochs does the learning rate reset to its initial value?",
      options: ["10, 20, 30, 40", "10, 30, 70", "10, 20, 40, 80", "Every 10 epochs"],
      answer: 1,
      why: "The first period is 10 epochs and each period is twice the last: 10, then 20, then 40. Resets happen at the ends of periods — epochs 10, 30 and 70 — which is what the recorded trace showed, with the rate back at 10⁻³ at epoch 30 and again at 70." },
    { stem: "Which scheduler steps once per batch rather than once per epoch?",
      options: ["StepLR", "CosineAnnealingLR", "OneCycleLR", "ReduceLROnPlateau"],
      answer: 2,
      why: "OneCycleLR is defined over total_steps = batches per epoch × epochs and is stepped after every optimiser step; the others in the reference's snippet are stepped once per epoch, and ReduceLROnPlateau is stepped once per epoch with the validation metric." },
    { stem: "What does warm-up protect against?",
      options: ["Overfitting late in training", "Large, uninformative early gradients and unreliable Adam statistics throwing fresh weights somewhere bad", "The plateau scheduler triggering too soon", "Vanishing gradients"],
      answer: 1,
      why: "Random initial weights give large gradients that say little about the loss surface, and Adam's second-moment estimate has not settled; a full-size first step can damage the weights irreparably. Rising from zero over the first 5–10 % of steps keeps those early updates small." },
    { stem: "You do not know how many epochs a run will need. Which scheduler does the reference recommend?",
      options: ["CosineAnnealingLR", "StepLR", "ReduceLROnPlateau", "OneCycleLR"],
      answer: 2,
      why: "Cosine, one-cycle and step schedules are plans over a known length; ReduceLROnPlateau reacts to the validation loss instead, lowering the rate only when progress stalls, so it needs no assumption about how long training will take." }
  ] },

  interview: { title: "Interview", sub: "What the schedule section prepares you for", questions: [
    { level: "Core", q: "Why decay the learning rate at all, if Adam is already adaptive?",
      strong: "Adam normalises the gradient's scale, not the noise; a fixed rate keeps the weights bouncing at the minimum, and decay lets them settle.",
      answer: [{ t: "p", text: "Adam's per-parameter normalisation makes the step about α regardless of gradient magnitude, but α itself sets how far each mini-batch's noisy gradient moves the weights. Near a minimum the gradient is mostly noise, so at a fixed α the weights wander in a region whose size is proportional to α. Decaying α shrinks that region and lets the optimiser converge; the reference's cosine schedule takes it to 10⁻⁶. Empirically, the final drop in learning rate is where a good part of the final accuracy comes from, for Adam as much as for SGD." }] },
    { level: "Core", q: "Describe the one-cycle policy and why it can train faster.",
      strong: "Warm up to a high peak, anneal to near zero; the warm-up makes the high peak stable, and the high peak covers ground quickly.",
      answer: [{ t: "p", text: "One-cycle starts at a small fraction of the maximum rate, rises linearly to the maximum over roughly the first 30 % of steps, then follows a cosine down to a tiny final rate. The rising phase acts as warm-up, letting the run use a peak learning rate that would diverge if applied from step one; the large-rate phase then makes rapid progress and acts as a regulariser; the annealing phase converges. Combined with a matching momentum schedule (high when the rate is low, and vice versa), this is 'super-convergence': training to a given accuracy in a fraction of the usual epochs. The cost is that total_steps must be known in advance." }] },
    { level: "Senior", q: "A fine-tuning run's loss spikes in the first 200 steps and never recovers. What do you change?",
      strong: "Add or lengthen warm-up, lower the peak rate towards 10⁻⁵, check that the schedule is per-step not per-epoch, and clip gradients.",
      answer: [{ t: "p", text: "The pattern — an early spike from which the run does not recover — is the classic warm-up failure. First step: linear warm-up from zero over 5–10 % of total steps, stepped per batch, so the first updates to pretrained weights are tiny while Adam's moment estimates settle. Second: the peak rate; for fine-tuning a transformer the reference's range is 10⁻⁵ to 5 × 10⁻⁵, and a from-scratch rate of 10⁻³ will wreck a pretrained model in a few steps. Third: gradient clipping at norm 1.0 as insurance against a single bad batch. Fourth: check the scheduler is actually being stepped — a OneCycleLR with total_steps mismatched, or a scheduler stepped before the optimiser, silently gives the wrong rate. If the spike persists with all four in place, the problem is data — a corrupted batch or a label mismatch — not the schedule." }] }
  ] }
});

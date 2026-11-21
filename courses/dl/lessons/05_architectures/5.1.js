/* ============================================================================
   LESSON 5.1 — Reference Card: the Dense Network
   A diagnosis-oriented consolidation: symptom to cause to fix, complexity,
   and the knobs that matter. Numbers are drawn from measurements made in
   modules 1 and 4.
   ========================================================================= */
EC.receiveLesson({
  id: "5.1",

  lede: "**This module is five reference cards, one per architecture, organised around what goes wrong.** Modules 1 to 4 built these networks and explained why they work; this module is what you reach for when one is not working. Each card gives the parameter formula, the hyperparameters that actually matter, and a symptom-to-cause-to-fix table. Starting with the dense network, because every failure mode here recurs in all the others.",

  objectives: [
    "Recall the parameter formula for a fully connected layer and apply it",
    "Diagnose a dense network from its symptom",
    "Rank the hyperparameters by how much they matter",
    "State what a dense network is genuinely good and bad at"
  ],

  prerequisites: ["4.10"],

  blocks: [

    { t: "h2", n: "01", text: "The card", id: "tldr" },

    {"kind": "tree", "title": "The ANN card, at a glance", "caption": "A fully connected stack: every unit in a layer sees every unit in the one below. That is maximum flexibility and the **weakest possible prior** — nothing about locality, order or sharing — which is why it is the right model for a fixed-size feature vector and the wrong one for an image, a sequence or anything with structure to exploit.", "root": {"label": "MLP / ANN", "sub": "fully connected layers", "tone": "violet", "children": [{"label": "Input", "sub": "a fixed-size feature vector", "tone": "accent"}, {"label": "Assumes", "sub": "nothing structural at all", "tone": "warn"}, {"label": "Shares", "sub": "no weights; every connection is its own", "tone": "warn"}, {"label": "Right for", "sub": "tabular features, a final classifier head", "tone": "good"}]}, "t": "diagram", "id": "dg-5_1-01-0"},



    { t: "table", head: ["", ""],
      rows: [
        ["**Unit**", "`a = φ(wᵀx + b)`"],
        ["**Structure**", "input → hidden layers → output"],
        ["**Trained by**", "backpropagation + gradient descent"],
        ["**Why it works**", "universal approximation — one hidden layer suffices in principle"],
        ["**Must have**", "a non-linear activation, or the whole stack collapses to one linear map"],
        ["**Key risks**", "overfitting, vanishing gradients, dead ReLUs"],
        ["**PyTorch**", "`nn.Linear` + activation in `nn.Sequential`"]
      ] },

    { t: "callout", kind: "trap", title: "Universal approximation is an existence result, not advice",
      body: [{ t: "p", text: "One hidden layer can approximate any continuous function to arbitrary accuracy — and the theorem says nothing about how *wide* that layer must be, or whether gradient descent can find the weights. The required width can be exponential in the input dimension. Depth is what makes approximation practical, by composing features hierarchically. Quoting universal approximation as a reason to use a shallow network gets the theorem backwards: it tells you the hypothesis class is rich enough, not that the shallow version is findable." }] },

    { t: "h2", n: "02", text: "Parameter count", id: "complexity" },

    {"kind": "trace", "title": "The parameter count, and where it goes", "caption": "A dense layer costs inputs × outputs plus one bias per output, so the count is driven by the **widest adjacent pair** — and a flatten in front of it is what makes the number explode. That is the VGG lesson of 2.3 in its simplest form: the layer that touches the flattened image is almost the whole model.", "left": "layer", "codeW": 190, "vars": ["weights", "biases", "total"], "steps": [{"code": "784 -> 256", "state": ["200,704", "256", "200,960"], "tone": "crit", "note": "the flatten's cost"}, {"code": "256 -> 128", "state": ["32,768", "128", "32,896"], "tone": "accent"}, {"code": "128 -> 10", "state": ["1,280", "10", "1,290"], "tone": "good"}, {"code": "total", "state": ["234,752", "394", "235,146"], "tone": "violet", "note": "85% in layer 1"}], "t": "diagram", "id": "dg-5_1-02-1"},



    { t: "math", tex: "\\text{params} = (n_{in} + 1) \\times n_{out} \\qquad \\text{per layer}" },

    { t: "p", text: "The worked example: `784 → 256 → 10` gives `(784+1)·256 + (256+1)·10 = 200,960 + 2,570 = 203,530`. Lesson 4.8's network checked out the same way — 11,521 from this formula plus 384 of BatchNorm scale and shift, totalling the 11,905 PyTorch reported. Forward and backward cost is roughly `O(params)` per sample." },

    { t: "callout", kind: "insight", title: "Parameters concentrate where the layers are widest",
      body: [{ t: "p", text: "In `784 → 256 → 10`, the first layer holds 98.7 % of the parameters. This is the same phenomenon lesson 2.3 measured in VGG16, where 89.4 % of 138 million parameters sat in the classifier head. Whenever you want to know where a model's capacity — and its overfitting risk — actually lives, compute the per-layer split rather than counting layers. It is usually more lopsided than it looks." }] },

    { t: "h2", n: "03", text: "Diagnosis", id: "failures" },

    {"kind": "matrix", "title": "Diagnosing an MLP", "caption": "Four symptoms with four distinct causes. The first is the one to check before anything else, because an unscaled input makes the loss ill-conditioned and no amount of architecture work will compensate — 1.8's condition-number argument applies directly.", "cols": ["Symptom", "First check"], "rows": ["Will not converge", "Train good, validation poor", "Both poor and flat", "Loss is NaN"], "cells": [[{"text": "inputs not standardised", "tone": "crit"}, "the condition number (1.8)"], [{"text": "too much capacity", "tone": "warn"}, "dropout, weight decay, fewer units"], [{"text": "too little, or bad features", "tone": "warn"}, "an MLP cannot invent structure"], [{"text": "learning rate, or a log(0)", "tone": "crit"}, "clip, and check the loss's domain"]], "t": "diagram", "id": "dg-5_1-03-2"},



    { t: "table", head: ["Symptom", "Likely cause", "Fix"],
      rows: [
        ["Loss is flat from step 1", "Learning rate wrong, inputs unscaled, or no non-linearity", "Check the activation exists; standardise inputs; sweep LR by powers of 10"],
        ["Loss → NaN", "Exploding gradients, LR too high, log(0) somewhere", "Clip gradients, lower LR, check for `log` of a non-positive number"],
        ["Train ≪ validation accuracy", "Overfitting", "Dropout, weight decay, early stopping, more data"],
        ["Both train and validation poor", "Underfitting", "More depth or width, train longer, check the LR is not too low"],
        ["Early layers never change", "Vanishing gradients through saturating activations", "ReLU or GELU, BatchNorm, residual connections, He init"],
        ["Many units stuck at exactly 0", "Dead ReLUs from a large negative bias or too high an LR", "Leaky ReLU or GELU, lower LR, better init"],
        ["Validation metric varies run to run on a fixed model", "Dropout or BatchNorm left in training mode", "`model.eval()` before evaluating"]
      ] },

    { t: "callout", kind: "good", title: "Check inputs and learning rate before anything else",
      body: [{ t: "p", text: "The two most common causes of a network that will not learn are unscaled inputs and a wrong learning rate, and both are quick to rule out. Lesson 4.8 measured the scaling effect directly: R² fell from 0.629 to 0.512 with identical architecture and training, purely from removing standardisation. For learning rate, sweep by powers of ten rather than tuning finely — you are looking for the right order of magnitude, and the difference between 1e-3 and 1e-4 matters far more than between 1e-3 and 2e-3." }] },

    { t: "h2", n: "04", text: "The knobs", id: "hyperparameters" },

    { t: "diagram", kind: "layers", title: "Hyperparameters by how much they matter",
      caption: "Spend your tuning budget from the top. The lower items rarely change a conclusion.",
      items: [
        { label: "Learning rate", sub: "the make-or-break knob; sweep by powers of 10", tone: "crit" },
        { label: "Depth and width", sub: "capacity — match to data volume", tone: "accent" },
        { label: "Regularisation strength", sub: "dropout rate, weight decay", tone: "accent" },
        { label: "Optimiser", sub: "AdamW is a good default; SGD+momentum can generalise better", tone: "teal" },
        { label: "Batch size", sub: "gradient noise against throughput", tone: "teal" },
        { label: "Activation", sub: "ReLU unless you have a reason", tone: "good" }
      ] },

    { t: "p", text: "Epochs is not on this list because it should not be a hyperparameter — use early stopping on a validation metric instead. Lesson 4.8's run bottomed out at epoch 40 and was measurably worse by epoch 59, which is free accuracy lost to a fixed epoch count." },

    { t: "h2", n: "05", text: "Honest strengths and weaknesses", id: "tradeoffs" },

    { t: "diagram", kind: "compare", title: "What a dense network is for",
      caption: "It is the foundation of everything else, and rarely the best choice on its own.",
      columns: [
        { title: "Good at", tone: "good", items: [
          "Learning features with no manual engineering",
          "Any modality, once represented as a vector",
          "Scaling with data and compute",
          "Being the head or the backbone of every other architecture"
        ] },
        { title: "Bad at", tone: "warn", items: [
          "Small tabular data — beaten by gradient boosting at R² 0.837 to 0.629",
          "Interpretability",
          "Exploiting structure it is not told about (order, locality)",
          "Working without tuning — sensitive to init and learning rate"
        ] }
      ] },

    { t: "exercise", kind: "practice", title: "Induce every failure mode deliberately", difficulty: "intermediate", minutes: 40,
      prompt: "Take a working dense network on any dataset and break it six ways, one at a time, recording the exact symptom each produces: remove all activations; set the learning rate to 10; set it to 1e-8; feed unscaled inputs; remove all regularisation and train far past convergence; and initialise all weights to zero. For each, write down what you would see in the loss curve and what would distinguish it from the others.",
      requirements: [
        "Break a working network six ways: no activations, learning rate 10, learning rate 1e-8, unscaled inputs, no regularisation, zero initialisation",
        "Record the symptom of each",
        "Describe what each looks like in the loss curve",
        "Say what distinguishes each from the others"
      ],
      hints: [
        "Removing activations makes the model exactly a linear map — compare against `LinearRegression`.",
        "All-zero initialisation has a specific failure: think about what happens to the gradients of units in the same layer.",
        "Keep the loss curves so you can compare their shapes side by side."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.datasets import fetch_california_housing
from sklearn.linear_model import LinearRegression

X, y = fetch_california_housing(return_X_y=True)
X, y = torch.tensor(X, dtype=torch.float32), torch.tensor(y, dtype=torch.float32)
Xtr, ytr, Xva, yva = X[:15000], y[:15000], X[15000:], y[15000:]
mu, sd = Xtr.mean(0), Xtr.std(0)
lin = LinearRegression().fit((Xtr - mu) / sd, ytr)
print(f"linear-regression baseline val MSE: {F.mse_loss(torch.tensor(lin.predict((Xva - mu) / sd), dtype=torch.float32), yva):.3f}\\n")

def model(act=True, zero=False, dropout=0.1):
    layers = []
    for i, o in [(8, 128), (128, 128)]:
        layers += [nn.Linear(i, o)] + ([nn.ReLU()] if act else []) + ([nn.Dropout(dropout)] if dropout else [])
    m = nn.Sequential(*layers, nn.Linear(128, 1))
    if zero:
        for p in m.parameters(): nn.init.zeros_(p)
    return m

def run(name, lr=1e-3, scale=True, epochs=30, **kw):
    torch.manual_seed(0); m = model(**kw); opt = torch.optim.Adam(m.parameters(), lr, weight_decay=0 if kw.get("dropout") == 0 else 1e-4)
    xtr, xva = ((Xtr - mu) / sd, (Xva - mu) / sd) if scale else (Xtr, Xva)
    curve = []
    for ep in range(epochs):
        m.train()
        for i in range(0, 15000, 256):
            loss = F.mse_loss(m(xtr[i:i+256]).squeeze(1), ytr[i:i+256]); opt.zero_grad(); loss.backward(); opt.step()
        m.eval()
        with torch.no_grad(): curve.append((F.mse_loss(m(xtr).squeeze(1), ytr).item(), F.mse_loss(m(xva).squeeze(1), yva).item()))
    pick = [0, 4, 14, epochs - 1]
    extra = ""
    if kw.get("zero"):
        w = m[0].weight; extra = f"  first-layer rows identical: {bool((w - w[0]).abs().max() == 0)}"
    print(f"{name:<24} " + "  ".join(f"ep{p+1}: {curve[p][0]:.3g}/{curve[p][1]:.3g}" for p in pick) + extra)

print("train/val MSE at epochs 1, 5, 15, last")
run("healthy")
run("no activations", act=False)
run("learning rate 10", lr=10)
run("learning rate 1e-8", lr=1e-8)
run("unscaled inputs", scale=False)
run("no regularisation, long", dropout=0, epochs=150)
run("zero initialisation", zero=True)`,
        out: `linear-regression baseline val MSE: 0.602

train/val MSE at epochs 1, 5, 15, last
healthy                  ep1: 1.03/1.99  ep5: 0.58/0.953  ep15: 0.373/0.496  ep30: 0.323/0.482
no activations           ep1: 0.652/0.825  ep5: 0.633/1.03  ep15: 0.574/0.663  ep30: 0.566/0.645
learning rate 10         ep1: 6.17e+13/7.48e+14  ep5: 1.38e+07/7.6e+06  ep15: 6.72e+04/3.58e+05  ep30: 7.93e+03/1.17e+04
learning rate 1e-8       ep1: 4.91/6.32  ep5: 4.91/6.32  ep15: 4.9/6.32  ep30: 4.9/6.31
unscaled inputs          ep1: 47/42.9  ep5: 9.17/10.5  ep15: 2.11/2.93  ep30: 1.97/2.72
no regularisation, long  ep1: 1.02/1.9  ep5: 0.553/0.9  ep15: 0.363/0.498  ep150: 0.234/0.501
zero initialisation      ep1: 4.97/6.46  ep5: 4.2/5.55  ep15: 2.8/3.87  ep30: 1.73/2.47  first-layer rows identical: True`,
       
        notes: [
          { t: "p", text: "The all-zeros initialisation is the one worth doing if you only do one. Every unit in a layer receives an identical gradient, so they stay identical forever — the layer has the expressive power of a single unit no matter how wide it is. The model trains, the loss falls somewhat, and nothing indicates anything is wrong. It is the cleanest demonstration of why symmetry breaking is a requirement rather than a convention." },
          { t: "p", text: "Removing the activations gives a network that trains fine and plateaus at exactly linear-regression performance, because a composition of linear maps is a linear map. The useful diagnostic habit it teaches is to compare against a linear baseline: if your deep network matches it exactly, suspect a missing non-linearity rather than a hard problem." },
          { t: "p", text: "The two learning-rate failures look completely different, which is why they are easy to tell apart in practice. Too high gives a loss that spikes or goes to NaN within a few steps; too low gives a loss that decreases smoothly but far too slowly, looking almost flat over the window you are watching. Once you have seen both shapes you can diagnose a learning rate from the curve alone, which saves a lot of sweeping." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: a network initialised to zero",
      body: [
        { t: "p", text: "**Symptom.** A dense network trained for hours with no change in loss." },
        { t: "p", text: "**Mechanism.** Every weight was initialised to zero, so all units in a layer computed the same thing and received the same gradient; they never differentiated." },
        { t: "p", text: "**Fix.** Weights are initialised randomly with He or Xavier scaling, and a check confirms units in a layer differ after one step." }
      ] }
  ],

  takeaways: [
    "A fully connected layer has `(n_in + 1) × n_out` parameters; 784→256→10 gives 203,530.",
    "Parameters concentrate in the widest layers — 98.7 % in the first layer of that example.",
    "Universal approximation is an existence result; depth is what makes approximation practical.",
    "Check input scaling and learning rate before anything else — scaling alone moved R² from 0.512 to 0.629.",
    "Flat loss means LR, scaling or a missing non-linearity; NaN means exploding gradients or log(0).",
    "Learning rate dominates the hyperparameter list; sweep it by powers of ten.",
    "Epochs should not be a hyperparameter — use early stopping."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "How many parameters in a 784 → 256 → 10 MLP?",
      options: ["200,960", "203,530", "201,984", "2,570"],
      answer: 1,
      why: "`(784+1)×256 + (256+1)×10 = 200,960 + 2,570 = 203,530`, counting biases via the +1. Note the first layer holds 98.7 % of them — capacity and overfitting risk concentrate in the widest layers, which is worth computing rather than assuming." },
    { stem: "Your deep network plateaus at exactly linear-regression performance. What is the likely cause?",
      options: ["The learning rate is set too low", "No non-linearity: one linear map", "Too few parameters in the stack", "Bad initialisation of the weights"],
      answer: 1,
      why: "A composition of linear maps is a linear map, so without activations the network cannot express anything beyond linear regression no matter how deep it is. It still trains and the loss still falls — which is why comparing against a linear baseline is a useful diagnostic habit." },
    { stem: "What happens if you initialise all weights to zero?",
      options: ["The network trains normally", "Every unit stays identical", "The gradients explode", "An error is raised"],
      answer: 1,
      why: "Symmetry is never broken: all units in a layer compute the same thing and receive the same gradient forever, so a 256-unit layer has the expressive power of one unit. The model still trains and the loss still falls somewhat, so nothing signals the problem." },
    { stem: "Which hyperparameter deserves the most tuning budget?",
      options: ["Activation function", "Learning rate", "Batch size", "Number of epochs"],
      answer: 1,
      why: "Learning rate is the one that determines whether training works at all, and the right search is by powers of ten rather than fine adjustment. Epochs should not be tuned — use early stopping, since a fixed count cost about 1.8 % of accuracy in a measured run that peaked at epoch 40 of 60." }
  ] },

  interview: { title: "Interview", sub: "Dense network diagnosis", questions: [
    { level: "Core", q: "A neural network's loss is completely flat. How do you debug it?",
      strong: "Check for a missing non-linearity, unscaled inputs, and a wrong learning rate — in that order.",
      answer: [{ t: "p", text: "I would work from cheapest to most expensive. First confirm there is actually a non-linear activation between the linear layers, because without one the model is a linear map and will plateau immediately at linear-regression performance — comparing against a linear baseline tells you this in seconds. Second, check input scaling: I have measured R² dropping from 0.629 to 0.512 on identical architecture purely from removing standardisation, because features on wildly different scales cannot share one learning rate. Third, sweep the learning rate by powers of ten, since too low gives a nearly flat curve and too high gives spikes or NaN, and the two are easy to distinguish once you have seen them. After those I would try overfitting a single batch deliberately — if the model cannot drive the loss to near zero on ten examples, the problem is in the model or the data pipeline rather than in optimisation." }] },
    { level: "Senior", q: "How would you decide a network's depth and width?",
      strong: "From the data volume, starting from a known-good configuration rather than searching blindly.",
      answer: [{ t: "p", text: "Capacity should be matched to data, and the practical procedure is to start somewhere reasonable and move in whichever direction the train/validation gap indicates. A wide gap with low training error means too much capacity or too little regularisation; both errors high means too little capacity or an optimisation problem. I would start from a configuration known to work on a similar problem rather than searching from scratch, because the search space is large and most of it is uninteresting. Two things worth knowing: parameters concentrate in the widest layers — in a 784 to 256 to 10 network, 98.7 per cent sit in the first layer — so widening early layers costs far more than it looks, and depth buys hierarchical composition that width cannot, which is why the universal approximation theorem is not an argument for going shallow. I would also fix the epoch count with early stopping rather than treating it as a capacity knob; in one measured run the best epoch was 40 of 60 and shipping the final epoch cost about 1.8 per cent for nothing." }] },
    { level: "Senior", q: "What does the universal approximation theorem actually tell you?",
      strong: "That a wide-enough single hidden layer can approximate any continuous function — not that it is findable or efficient.",
      answer: [{ t: "p", text: "It says the hypothesis class is rich enough: a single hidden layer with enough units can approximate any continuous function on a compact domain to arbitrary accuracy. What it does not say is how many units that requires — which can be exponential in the input dimension — or whether gradient descent will find those weights, or how much data you would need. So it is an existence result about representability, not a design recommendation. In practice depth is what makes approximation efficient, because composing features hierarchically lets you represent with polynomial width what a shallow network would need exponential width for. I mention this because people sometimes cite the theorem as a reason not to go deep, which inverts what it actually establishes." }] }
  ] }
});

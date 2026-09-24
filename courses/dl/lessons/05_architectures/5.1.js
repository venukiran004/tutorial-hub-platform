/* ============================================================================
   LESSON 5.1 — Reference Card: the Dense Network
   Mirrors Architectures/ann.md. A diagnosis-oriented consolidation: symptom
   to cause to fix, complexity, and the knobs that matter. Numbers are drawn
   from measurements made in modules 1 and 4.
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

    { t: "math", tex: "\\text{params} = (n_{in} + 1) \\times n_{out} \\qquad \\text{per layer}" },

    { t: "p", text: "The reference's worked example: `784 → 256 → 10` gives `(784+1)·256 + (256+1)·10 = 200,960 + 2,570 = 203,530`. Lesson 4.8's network checked out the same way — 11,521 from this formula plus 384 of BatchNorm scale and shift, totalling the 11,905 PyTorch reported. Forward and backward cost is roughly `O(params)` per sample." },

    { t: "callout", kind: "insight", title: "Parameters concentrate where the layers are widest",
      body: [{ t: "p", text: "In `784 → 256 → 10`, the first layer holds 98.7 % of the parameters. This is the same phenomenon lesson 2.3 measured in VGG16, where 89.4 % of 138 million parameters sat in the classifier head. Whenever you want to know where a model's capacity — and its overfitting risk — actually lives, compute the per-layer split rather than counting layers. It is usually more lopsided than it looks." }] },

    { t: "h2", n: "03", text: "Diagnosis", id: "failures" },

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
      hints: [
        "Removing activations makes the model exactly a linear map — compare against `LinearRegression`.",
        "All-zero initialisation has a specific failure: think about what happens to the gradients of units in the same layer.",
        "Keep the loss curves so you can compare their shapes side by side."
      ],
      solution: {
        notes: [
          { t: "p", text: "The all-zeros initialisation is the one worth doing if you only do one. Every unit in a layer receives an identical gradient, so they stay identical forever — the layer has the expressive power of a single unit no matter how wide it is. The model trains, the loss falls somewhat, and nothing indicates anything is wrong. It is the cleanest demonstration of why symmetry breaking is a requirement rather than a convention." },
          { t: "p", text: "Removing the activations gives a network that trains fine and plateaus at exactly linear-regression performance, because a composition of linear maps is a linear map. The useful diagnostic habit it teaches is to compare against a linear baseline: if your deep network matches it exactly, suspect a missing non-linearity rather than a hard problem." },
          { t: "p", text: "The two learning-rate failures look completely different, which is why they are easy to tell apart in practice. Too high gives a loss that spikes or goes to NaN within a few steps; too low gives a loss that decreases smoothly but far too slowly, looking almost flat over the window you are watching. Once you have seen both shapes you can diagnose a learning rate from the curve alone, which saves a lot of sweeping." }
        ]
      } }

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
      options: ["Learning rate too low", "A missing non-linear activation, making the whole stack one linear map", "Too few parameters", "Bad initialisation"],
      answer: 1,
      why: "A composition of linear maps is a linear map, so without activations the network cannot express anything beyond linear regression no matter how deep it is. It still trains and the loss still falls — which is why comparing against a linear baseline is a useful diagnostic habit." },
    { stem: "What happens if you initialise all weights to zero?",
      options: ["The network trains normally", "Every unit in a layer gets an identical gradient and stays identical — the layer acts as one unit", "Gradients explode", "An error is raised"],
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

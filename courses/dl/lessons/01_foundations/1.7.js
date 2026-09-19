/* ============================================================================
   LESSON 1.7 — Regularisation
   ========================================================================= */
EC.receiveLesson({
  id: "1.7",

  lede: "**A network with 84,000 parameters and 300 training examples fits every one of them — including the seventy-six whose labels were deliberately wrong — and regularisation is everything you do to stop it.** On clean labels the network overfit gently (train 1.000, test 0.941) and the whole toolbox moved the test score by a point at most. On 30 % label noise it memorised the noise (train 1.000 on the wrong labels, test 0.772) and early stopping alone recovered eleven points. This lesson builds the tools — penalties, dropout, augmentation, noise, stochastic depth, early stopping — derives the ones that have a derivation, and measures every one on both problems, because the measurement is the only way to know which are worth their cost.",

  objectives: [
    "Write L1 and L2 penalties, explain them as priors and as gradient terms, and read the sparsity each produces",
    "Derive inverted dropout, show the train/eval scaling on numbers, and explain the ensemble view and MC dropout",
    "Implement mixup, cutout, input noise, DropConnect, stochastic depth and R-Drop, and know what each perturbs",
    "Run early stopping on a validation set and read the epoch it picks against the curve",
    "Read the two experiment tables — clean and noisy labels — and say which regulariser to reach for in which situation"
  ],

  prerequisites: ["1.5", "1.6"],

  blocks: [

    { t: "h2", n: "01", text: "The network, built to overfit", id: "setup" },

    { t: "p", text: "64 inputs, two hidden layers of 256, ten outputs: 84,234 parameters. Three hundred training digits, 957 held out for validation, 540 for test. AdamW at 10⁻³ for 200 epochs. Everything on this page is measured on that network, three seeds each, first with clean labels and then with 30 % of the training labels replaced by random ones." },

    { t: "code", lang: "text", title: "The baseline, clean labels (executed)",
      code: `train accuracy 1.000     test accuracy 0.941 ± 0.003
validation accuracy, seed 0, at epochs 1, 5, 10, 20, 50, 100, 200:  0.702  0.870  0.905  0.925  0.929  0.925  0.926   best at epoch 39`,
      caption: "The generalisation gap is six points. The validation curve climbs for forty epochs and then flattens with a slight decline; the network has memorised its 300 examples by epoch 50 and the remaining 150 epochs change nothing useful." },

    { t: "h2", n: "02", text: "Penalties: L2, weight decay, L1", id: "penalties" },

    { t: "p", text: "Add λ‖θ‖² to the loss and the gradient gains a term 2λθ that pulls every weight toward zero in proportion to its size; in SGD that is identical to multiplying the weights by (1 − 2ηλ) each step — weight decay. Add λ‖θ‖₁ instead and the pull is λ·sign(θ), the same size for every weight, which drives small weights exactly to zero. In Bayesian terms L2 is a Gaussian prior on the weights and L1 a Laplacian one; the ML course derived both. What matters here is the mechanism and the measurement:" },

    { t: "code", lang: "text", title: "Penalties on the clean task, 200 epochs (executed)",
      code: `baseline                 train 1.000   test 0.941 ± 0.003
weight decay 0.01        train 1.000   test 0.941 ± 0.003
weight decay 0.1         train 1.000   test 0.942 ± 0.001
weight decay 1.0         train 1.000   test 0.948 ± 0.003
L1 1e-5                  train 1.000   test 0.944 ± 0.002

sparsity -- fraction of layer-1 weights with |w| < 0.001:
  none 0.006      L2 / wd 0.1  0.007      L1 1e-5  0.407      L1 1e-4  0.731   (test 0.939)`,
      caption: "L2 shrinks everything a little and zeroes nothing (0.7 % near zero, same as no penalty); L1 at 10⁻⁵ put 41 % of the first layer's weights below 10⁻³ and at 10⁻⁴ put 73 % there while losing nothing on test. If you want a sparse network — for pruning (11.1) or for feature selection — L1 is the penalty; if you want a smaller-norm network, L2. Neither did much for accuracy here; the baseline's gap is not a large-weight problem." },

    { t: "callout", kind: "info", title: "Which parameters to decay",
      body: "Convention says decay the weight matrices and not the biases or the normalisation layers' γ and β, on the argument that a bias is a threshold with no reason to prefer zero and a shrunken γ under-scales its layer. Measured on this network at wd 0.1: decaying all parameters gave 0.940 ± 0.002 and weights-only 0.941 ± 0.002 — indistinguishable here, with a small MLP and no normalisation. Follow the convention anyway; it costs nothing and on deep normalised networks it matters. In torch it is two parameter groups with different weight_decay values."
    },

    { t: "h2", n: "03", text: "Dropout, derived", id: "dropout" },

    { t: "p", text: "During training, zero each hidden unit independently with probability p, and scale the survivors by 1/(1 − p) so that the expected activation is unchanged. At evaluation, do nothing. That is inverted dropout, the form every framework uses:" },

    { t: "code", lang: "python", title: "Inverted dropout in three lines, and what it does to a distribution (executed)",
      code: `def dropout(h, p, training):
    if not training or p == 0: return h
    mask = (torch.rand_like(h) > p).float()
    return h * mask / (1 - p)

input mean 3.0, variance 1.0:
  p=0.2   kept 0.800   output mean 2.997   variance 3.50    (survivors scaled by 1.25)
  p=0.5   kept 0.500   output mean 2.996   variance 10.99   (survivors scaled by 2.00)
  p=0.8   kept 0.199   output mean 2.984   variance 40.79   (survivors scaled by 5.00)
eval mode returns the input unchanged: True
kept values at p=0.5 are exactly 2.0 for an input of 1.0`,
      caption: "The mean is preserved — that is the point of the 1/(1 − p) — but the variance is not: at p = 0.5 the next layer sees inputs eleven times noisier than in evaluation. Every unit must therefore learn to be useful without relying on any particular other unit being present, which is the regularising pressure. The variance mismatch is also why dropout and BatchNorm interact badly when placed adjacently." },

    { t: "dl", items: [
      ["The ensemble view", "Each mask selects a different thinned sub-network; with n units there are 2ⁿ of them, all sharing weights. Training with dropout trains this exponential ensemble one member at a time; evaluation with the full network approximates averaging them — exactly, for a single linear layer, approximately for deeper ones."],
      ["MC dropout", "Keep dropout on at test time and average many stochastic passes. It is the ensemble taken literally and gives an uncertainty estimate for free. On the noisy-label task, 20 passes gave 0.831 against 0.833 for the deterministic pass, agreeing on 97 % of predictions — the approximation is good; the value of MC dropout is the spread, not the mean."],
      ["Where to put it", "After the activation of a hidden layer, never on the output logits, rarely on the input (small p if at all). p = 0.5 was Hinton's default for wide fully connected layers; 0.1–0.3 is typical elsewhere; transformers use 0.1."],
      ["DropConnect", "Drop weights rather than activations: each connection is zeroed with probability p. A superset of dropout (dropping a unit drops all its connections); measured, a p = 0.5 mask kept the output mean near zero but raised its std from 8.1 to 11.6 — the same variance injection, finer-grained."],
      ["Spatial dropout", "For convolutional feature maps, drop whole channels rather than individual pixels — adjacent pixels are so correlated that pixel-wise dropout barely removes information. nn.Dropout2d."],
      ["Variational dropout", "For recurrent networks, the same mask at every time step (4.4); a fresh mask per step destroys the memory."]
    ] },

    { t: "code", lang: "text", title: "Dropout on the clean task (executed)",
      code: `dropout 0.2      train 1.000   test 0.939 ± 0.005
dropout 0.5      train 1.000   test 0.941 ± 0.005
dropout 0.8      train 1.000   test 0.944 ± 0.003
R-Drop p=0.5     train 1.000   test 0.944 ± 0.002      -- two dropout passes + symmetric KL between them`,
      caption: "Nothing — within a standard deviation of the baseline at every rate, and even p = 0.8 still reached training accuracy 1.000. On a clean, easy task with a modest gap, dropout's cost (slower training, noisier gradients) buys no accuracy. Hold that thought until the noisy table." },

    { t: "h2", n: "04", text: "Perturbing the data", id: "data" },

    { t: "p", text: "The other family regularises through the input rather than the weights: show the network variations of each example so that it cannot memorise the exact pixels. Data augmentation is the largest single source of accuracy in computer vision (3.4, 3.5); here it is applied to 8 × 8 digits, where the room is small:" },

    { t: "code", lang: "text", title: "Input perturbations on the clean task (executed)",
      code: `augmentation (±1 px roll)    train 0.991   test 0.933 ± 0.014     -- worse: torch.roll wraps a column to the far side
mixup α = 0.4                train 1.000   test 0.956 ± 0.003     -- the best single change on this table
cutout 3×3                   train 0.999   test 0.941 ± 0.008
input noise σ = 0.1          train 1.000   test 0.951 ± 0.003
dropout 0.5 + wd 0.1 + aug   train 0.982   test 0.910 ± 0.014     -- over-regularised: three points below baseline`,
      caption: "The roll augmentation is a lesson in itself: on an 8 × 8 image a one-pixel wrap moves a stroke to the opposite edge, which is not a plausible digit. Augmentation has to produce inputs that could occur. Mixup and Gaussian input noise, which do, added 1.5 and 1.0 points. Stacking three regularisers cost three points — regularisation is a dose, and the combined dose was too high for 300 clean examples." },

    { t: "dl", items: [
      ["Mixup", "Train on convex combinations: x̃ = λxᵢ + (1 − λ)xⱼ, ỹ = λyᵢ + (1 − λ)yⱼ with λ ~ Beta(α, α). Implemented as λ·CE(out, yᵢ) + (1 − λ)·CE(out, yⱼ), which equals cross-entropy against the soft target exactly (verified: 2.289455 both ways). Encourages linear behaviour between examples; also improves calibration."],
      ["Cutout / random erasing", "Zero a random patch of the input. Forces the network to use the whole image rather than one distinctive region. CutMix (3.5) pastes a patch from another image and mixes the labels by area."],
      ["Gaussian input noise", "x + σε. Equivalent, to first order, to an L2 penalty on the input gradient (Bishop, 1995); a cheap regulariser that helped here."],
      ["Noise injection elsewhere", "Gradient noise, weight noise, label noise as smoothing (2.5) — all the same idea: make the objective stochastic so that sharp minima are averaged away."]
    ] },

    { t: "h2", n: "05", text: "Stochastic depth", id: "depth" },

    { t: "p", text: "For a residual network (3.3), drop whole blocks during training: with probability pₗ, block l is skipped and its input passes straight through; at evaluation every block runs, scaled by its survival probability. Deeper blocks are dropped more often (the linear decay rule). It is dropout at the level of layers, it makes an ensemble of networks of different depths, and it shortens the expected gradient path:" },

    { t: "code", lang: "text", title: "Drop-path on an 8-block residual MLP, clean task (executed)",
      code: `drop-path p = 0.0    test 0.938 ± 0.002
drop-path p = 0.3    test 0.921 ± 0.024
drop-path p = 0.6    test 0.908 ± 0.029`,
      caption: "Worse, and noisier, with every increase. Stochastic depth was designed for networks of a hundred blocks or more where the ensemble is enormous and the gradient path matters; on eight blocks and 300 examples it only removes capacity. The published gains (ResNet-110 and deeper, and every modern vision transformer at rates 0.1–0.3) are real; this network is not where they live." },

    { t: "h2", n: "06", text: "Early stopping", id: "early" },

    { t: "p", text: "Train, evaluate on the validation set after every epoch, keep the weights from the best epoch, stop when there has been no improvement for a patience of k epochs. It is the regulariser that costs nothing, needs no hyperparameter beyond the patience, and — because the effective capacity of a network grows with training time — it is an L2-like constraint in disguise (the ML course's derivation)." },

    { t: "code", lang: "text", title: "Early stopping, clean task, seed 0 (executed)",
      code: `baseline       last-epoch test 0.939     best validation epoch 28    test at that epoch 0.943
dropout 0.5    last-epoch test 0.946     best validation epoch 182   test at that epoch 0.954`,
      caption: "Half a point on the clean task: the curve had flattened rather than fallen, so stopping early recovered little. With dropout the best epoch was 182 — dropout slows training enough that 200 epochs was barely long enough. Now the same experiments where the training set lies." },

    { t: "h2", n: "07", text: "The noisy table", id: "noisy" },

    { t: "p", text: "Seventy-six of the 300 training labels replaced by a uniformly random class (a few land on the truth). The network can still reach 100 % training accuracy — by memorising the wrong labels — and the validation curve shows it doing so:" },

    { t: "code", lang: "text", title: "30 % label noise, 200 epochs, 3 seeds — training accuracy is against the noisy labels (executed)",
      code: `baseline               train 1.000   test 0.772 ± 0.002
   validation, seed 0, at epochs 1, 5, 10, 20, 50, 100, 200:  0.437  0.842  0.864  0.847  0.781  0.754  0.745    best at epoch 12
weight decay 0.1       train 1.000   test 0.776 ± 0.005
weight decay 1.0       train 0.988   test 0.821 ± 0.003
dropout 0.5            train 0.994   test 0.832 ± 0.004
mixup α = 0.4          train 1.000   test 0.796 ± 0.017
input noise σ = 0.1    train 1.000   test 0.812 ± 0.007

early stopping on validation, 3 seeds:
  baseline       last epoch 0.775    best val epochs 16, 10, 14    test at best epoch 0.888
  dropout 0.5    last epoch 0.832    best val epochs 26, 27, 22    test at best epoch 0.894
  wd 1.0         last epoch 0.820    best val epochs 12, 15, 14    test at best epoch 0.887`,
      caption: "The validation curve peaks at epoch 12 (0.864) and then falls for 188 epochs as the network memorises the wrong labels; the last-epoch test score is 0.772. Stop at the validation peak and it is 0.888 — eleven points from a rule that costs nothing. Dropout at 0.5 is the best regulariser run to completion (0.832, six points) because it slows the memorisation; weight decay needs to be heavy (1.0) to do anything; mixup, which interpolates the wrong labels along with the right ones, helps least. Every regulariser plus early stopping lands at 0.887–0.894: the stopping is doing most of the work." },

    { t: "p", text: "The two tables are the lesson. Regularisation is not a fixed list of things to switch on; it is a dose, matched to how much the network can memorise and how much of what it memorises is wrong. **The validation curve tells you the dose**: flat after the peak means the gap is small and the tools will buy a point at most (clean table); falling after the peak means the network is learning something false and early stopping plus a strong regulariser will buy ten (noisy table)." },

    { t: "table", head: ["Situation", "Reach for", "Evidence here"],
      rows: [
        ["Validation flat after its peak, small gap", "Mixup or input noise, mild weight decay; early stopping as a formality", "+1.5 mixup, +1.0 noise, +0.7 wd 1.0; dropout ±0"],
        ["Validation falling after its peak", "Early stopping first, then dropout 0.5", "+11 early stopping, +6 dropout, +5 wd 1.0"],
        ["Sparse weights wanted", "L1", "73 % of weights below 10⁻³ at no accuracy cost"],
        ["Small images, augmentation", "Only transformations that produce plausible inputs", "The wrapping roll cost 0.8; 3.4 does it properly"],
        ["Very deep residual network", "Stochastic depth 0.1–0.3", "Hurt on 8 blocks; designed for 100+"],
        ["Stacking several", "Measure the combined dose", "dropout + wd + aug: −3 points on the clean task"]
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why does inverted dropout multiply the surviving activations by 1/(1 − p) during training?",
          options: [
            "To compensate for the learning rate",
            "So that the expected value of each unit's output is the same in training as in evaluation, when nothing is dropped and nothing is scaled — measured: mean 2.997 in, 2.996 out at p = 0.5 — so the network can be used unchanged at test time",
            "To increase the variance and make training harder",
            "It is a historical accident"
          ],
          answer: 1,
          why: "The original formulation scaled at test time instead; inverting it moves the correction into training so that inference is a plain forward pass. The variance is not preserved (11× at p = 0.5), and that injected noise is the regularisation."
        },
        {
          stem: "On the noisy-label task the baseline reached 100 % training accuracy against labels that were 30 % wrong. What does that tell you, and which single measure helped most?",
          options: [
            "The labels were not really noisy",
            "The network memorised the wrong labels — capacity is not the constraint on 300 examples — and the validation curve, peaking at epoch 12 then falling, shows when it started; early stopping at the validation peak recovered 0.888 against 0.772 at the last epoch",
            "The network needs more parameters",
            "Weight decay 0.01 fixed it"
          ],
          answer: 1,
          why: "Networks learn simple patterns first and noise later (the clean signal is fit by epoch 12, the noise over the next 188). Stopping at the peak keeps the first and discards the second, which no penalty at a sane strength managed to match."
        },
        {
          stem: "Mixup was the best regulariser on clean labels (+1.5) and the weakest on noisy labels (+2.4 against dropout's +6). Why the reversal?",
          options: [
            "Mixup only works with images",
            "Mixup interpolates labels as well as inputs, so on noisy data it blends wrong labels into every mixed example and teaches them more thoroughly; dropout perturbs the network rather than the targets and slows memorisation of whatever the labels say",
            "The α parameter was wrong for noisy labels",
            "It was seed variance; they are equivalent"
          ],
          answer: 1,
          why: "Each regulariser perturbs something specific: mixup the inputs and targets, dropout the hidden units, weight decay the weights, early stopping the training time. Which one helps depends on where the thing being memorised lives — here, in the targets."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Dropout, DropConnect, MC dropout and mixup by hand",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Implement inverted dropout in three lines. On an input with mean 3 and variance 1, report the kept fraction, output mean and output variance for p = 0.2, 0.5, 0.8, and confirm eval mode returns the input unchanged." },
        { t: "p", text: "**(b)** Implement DropConnect on a 256 × 64 weight matrix (p = 0.5, survivors scaled by 2) and compare the output's mean and std with the full-weight output on a batch of 32." },
        { t: "p", text: "**(c)** Train the 64-256-256-10 network with dropout 0.5 on the noisy-label task for 200 epochs, then compare the deterministic eval prediction with the average softmax of 20 dropout-on passes: both accuracies and the fraction of test examples where the two agree, three seeds." },
        { t: "p", text: "**(d)** Verify numerically that λ·CE(out, yᵢ) + (1 − λ)·CE(out, yⱼ) equals cross-entropy against the soft target λ·onehot(yᵢ) + (1 − λ)·onehot(yⱼ)." }
      ],
      requirements: [
        "(a) three rows and one boolean.",
        "(b) two means and two stds.",
        "(c) two accuracies and an agreement fraction.",
        "(d) two equal numbers."
      ],
      hint: "(a) mask = (rand_like(h) > p); return h · mask / (1 − p). (c) Keep the model in train mode for the MC passes and use torch.no_grad(); average probabilities, not logits. (d) Cross-entropy is linear in the target vector, which is the whole proof.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) p=0.2  kept 0.800  mean 2.997 -> 2.997  var 1.001 -> 3.496     survivors × 1.25
#     p=0.5  kept 0.500  mean 2.997 -> 2.996  var 1.001 -> 10.986    survivors × 2.00
#     p=0.8  kept 0.199  mean 2.997 -> 2.984  var 1.001 -> 40.788    survivors × 5.00
#     eval mode returns the input unchanged: True

# (b) DropConnect p=0.5:  output mean −0.055 vs full 0.060;  output std 11.59 vs full 8.14
#     -- the mean is preserved up to noise (both ≈ 0); the std rises by the same mechanism as dropout's variance

# (c) MC dropout (20 passes) vs deterministic eval, 3 seeds:  eval 0.833   mc 0.831   agreement 0.971
#     -- the weight-scaling approximation to the ensemble average holds to within noise here

# (d) mixup: interpolated-loss form 2.289455 == soft-target cross-entropy 2.289455`,
        notes: [
          { t: "p", text: "(a) and (b) are the two masks — on activations, on weights — and both preserve the mean while injecting variance." },
          { t: "p", text: "(c) is the ensemble view tested: the deterministic pass is a good approximation of the average, and MC dropout's real product is the disagreement between passes, which is an uncertainty estimate." },
          { t: "p", text: "(d) is why mixup is one extra line in a training loop rather than a new loss." }
        ]
      }
    }
  ],

  takeaways: [
    "An 84,000-parameter network fits 300 examples exactly whatever the labels say: train 1.000 on clean labels (test 0.941) and train 1.000 on labels that were 30 % wrong (test 0.772). Regularisation is a dose set by how much of what the network memorises is false.",
    "L2/weight decay shrinks all weights and zeroes none (0.7 % near zero); L1 drives small weights to exactly zero (41 % at 10⁻⁵, 73 % at 10⁻⁴) at no accuracy cost — the penalty for sparsity. Decay weights, not biases or normalisation parameters; measured indistinguishable here, conventional elsewhere.",
    "Inverted dropout zeroes units with probability p and scales survivors by 1/(1 − p): the mean is preserved (2.997 → 2.996) and the variance is not (1.0 → 11.0 at p = 0.5); that noise trains an ensemble of 2ⁿ thinned networks whose average the deterministic pass approximates (MC dropout agreed on 97 % of predictions).",
    "On clean labels: mixup +1.5, input noise +1.0, weight decay 1.0 +0.7, dropout ±0, stochastic depth on 8 blocks −2 to −3, a wrapping augmentation −0.8, and dropout + decay + augmentation together −3 — over-regularisation is real.",
    "On 30 % label noise the validation curve peaked at epoch 12 and fell for 188 more; early stopping at the peak gave 0.888 against 0.772, dropout 0.5 run to completion gave 0.832, weight decay had to be 1.0 to reach 0.821, and mixup — which interpolates the wrong labels too — helped least.",
    "Read the validation curve to choose the dose: flat after the peak means small tools and a point at most; falling after the peak means early stopping first and a strong regulariser second, for ten points or more."
  ],

  quiz: {
    title: "Regularisation — Knowledge Check",
    questions: [
      {
        stem: "How do L1 and L2 penalties differ in their effect on the weights?",
        options: [
          "They are equivalent for neural networks",
          "L2's gradient 2λθ shrinks each weight in proportion to its size, so weights approach zero but never reach it (0.7 % below 10⁻³); L1's gradient λ·sign(θ) is constant, so small weights are driven exactly to zero (73 % below 10⁻³ at λ = 10⁻⁴) — L1 for sparsity, L2 for a smaller norm",
          "L1 is stronger than L2 at the same λ",
          "L2 produces sparse weights and L1 does not"
        ],
        answer: 1,
        why: "The difference is in the gradient near zero: proportional for L2 (vanishing as the weight does) and constant for L1 (which crosses zero and stays there under a proximal update). The measured sparsity fractions are the direct consequence, and L1's sparse solution lost nothing on test."
      },
      {
        stem: "Dropout at p = 0.5 adjacent to a BatchNorm layer often hurts. Why?",
        options: [
          "BatchNorm removes the dropout mask",
          "Dropout injects variance (11× at p = 0.5) that is present in training and absent in evaluation, so the BatchNorm running statistics estimated during training do not match the variance the layer sees at test time — a train/eval distribution mismatch at exactly the layer that assumes there is none",
          "They use different random seeds",
          "Dropout cannot follow a normalisation layer in PyTorch"
        ],
        answer: 1,
        why: "The measured variance shift is the whole mechanism. The usual remedies are to place dropout after the last BatchNorm, use a low rate, or use one of the two rather than both — which is what most modern convolutional networks do."
      },
      {
        stem: "Stochastic depth cost two to three points on an eight-block residual MLP. Should you conclude it does not work?",
        options: [
          "Yes; the measurement is definitive",
          "No — the measurement says it does not help this network: the ensemble over 2⁸ depths is small and the gradient path is short, whereas the method was designed for hundreds of blocks and is standard at rates 0.1–0.3 in vision transformers; the conclusion is that the regime matters and the claim should be tested in yours",
          "Yes, because it removed capacity",
          "No, because the seeds were unlucky"
        ],
        answer: 1,
        why: "A regulariser's benefit is a property of the pairing between method and setting. Here the seed spread also widened (±0.024), consistent with removing capacity that the small network needed. Neither generalising the failure nor ignoring it is right."
      },
      {
        stem: "Which is the correct implementation of early stopping?",
        options: [
          "Stop when the training loss stops decreasing",
          "Evaluate on a validation set every epoch, save the weights at the best validation score, stop after k epochs without improvement, and restore the saved weights; the test set is touched once, at the end",
          "Stop after a fixed number of epochs chosen in advance",
          "Stop when training accuracy reaches 100 %"
        ],
        answer: 1,
        why: "Training loss falls monotonically on a network that can memorise (it reached 1.000 with wrong labels), so it cannot signal the stop. Selecting the epoch on the test set would leak; the validation set is what selects, and the noisy-label result — 0.888 against 0.772 — is what the procedure is worth."
      },
      {
        stem: "Gaussian input noise (σ = 0.1) improved the clean test score by a point. What is it doing?",
        options: [
          "Increasing the effective dataset size by a factor of ten",
          "Penalising the network's sensitivity to small input changes — to first order, adding noise to the inputs is equivalent to an L2 penalty on the gradient of the output with respect to the input, which smooths the learned function between training points",
          "Correcting mislabelled examples",
          "Reducing the learning rate"
        ],
        answer: 1,
        why: "Bishop's 1995 result connects noise injection to Tikhonov regularisation. It is one of the cheapest regularisers, it composes with the others, and — unlike the wrapping roll — it always produces plausible inputs."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Regularisation",
    sub: "Dropout's derivation and ensemble view, L1 against L2, augmentation and mixup, early stopping, and the dose argument from the two tables.",
    questions: [
      {
        level: "Core",
        q: "How does dropout work, mathematically, and why does it regularise?",
        strong: "During training each hidden unit is kept with probability 1 − p and zeroed otherwise, and the kept units are scaled by 1/(1 − p) — inverted dropout — so the expected activation is unchanged and evaluation can use the full network with no scaling. Measured on an input of mean 3 and variance 1 at p = 0.5: half kept, mean 2.996, but variance 11 — the mean is preserved and the variance is not, and that injected noise is the regularisation: no unit can rely on any specific other unit being present, so co-adapted features are broken up. The cleaner explanation is the ensemble view: each mask picks one of 2ⁿ thinned sub-networks sharing weights, training trains them one at a time, and the full network at test approximates averaging them. I tested the approximation on a noisy-label task: 20 dropout-on passes averaged gave 0.831 against 0.833 for the deterministic pass, agreeing on 97 % of predictions. Where it helps is where memorisation is the problem — on 30 % label noise dropout 0.5 gave 0.832 against a baseline of 0.772 — and on a clean task with a small gap it did nothing at any rate, at the cost of slower training.",
        answer: [
          { t: "p", text: "Inverted dropout with the executed statistics, the ensemble view with the MC test, and the two tables' verdict on when it matters." }
        ]
      },
      {
        level: "Core",
        q: "Compare L1 and L2 regularisation for a neural network.",
        strong: "Both add a penalty on the weights; they differ in the gradient near zero. L2 adds λ‖θ‖², gradient 2λθ, proportional to the weight — in SGD it is weight decay, multiplying each weight by (1 − 2ηλ) per step — so weights shrink toward zero without reaching it; measured, 0.7 % of a layer's weights were below 10⁻³, the same as with no penalty. L1 adds λ‖θ‖₁, gradient λ·sign(θ), the same pull regardless of size, so small weights are driven to and held at zero: 41 % below 10⁻³ at λ = 10⁻⁵, 73 % at 10⁻⁴, with no loss of test accuracy. As priors, L2 is Gaussian and L1 Laplacian. In practice L2 is the default for generalisation, with the decay applied to weight matrices and not to biases or normalisation parameters; L1 is what you use when you want sparsity — for pruning or interpretability. One caveat from the optimiser lesson: in Adam, L2 as a gradient term is not weight decay; AdamW's decoupled decay is.",
        answer: [
          { t: "p", text: "The gradient mechanism, the executed sparsity numbers, the prior view, the conventions, and the AdamW caveat." }
        ]
      },
      {
        level: "Core",
        q: "What is early stopping and why does it work?",
        strong: "Evaluate on a validation set after every epoch, keep the weights from the best epoch, and stop after a patience of k epochs without improvement. It works because a network learns simple, general structure first and idiosyncratic detail — including noise — later, so the validation score rises and then falls, and the peak marks the point where what is being learned stops generalising. On 300 digits with 30 % of the labels randomised the validation curve peaked at epoch 12 at 0.864 and declined for the remaining 188 epochs to 0.745 while training accuracy on the wrong labels reached 1.000; stopping at the peak gave a test score of 0.888 against 0.772 at the end — eleven points from a rule with one hyperparameter. On clean labels the curve flattened rather than fell and the gain was half a point. It is equivalent to a constraint on how far the weights travel from their initialisation, which makes it an L2-like regulariser whose strength is the training time; and it is the one regulariser that also tells you when to stop paying for compute.",
        answer: [
          { t: "p", text: "The procedure, the mechanism, the executed noisy-label curve and gain, the clean-label contrast, and the L2 interpretation." }
        ]
      },
      {
        level: "Advanced",
        q: "How do you decide how much regularisation a model needs?",
        strong: "From the validation curve, not from a checklist. I trained the same 84,000-parameter network on 300 examples twice. With clean labels the validation accuracy rose to a plateau and stayed there: the gap was six points, and the entire toolbox moved the test score by at most 1.5 points (mixup), with dropout at any rate doing nothing and dropout plus decay plus augmentation together costing three points. With 30 % label noise the curve peaked at epoch 12 and fell for 188 epochs: the network was memorising false targets, early stopping alone recovered eleven points, dropout 0.5 six, and weight decay had to be ten times the usual strength to recover five. So: a flat curve after the peak means a small gap and mild tools — mixup, input noise, light decay; a falling curve means the model is learning something false and needs early stopping first and a strong regulariser second. The dose is the total across all of them; and each regulariser perturbs something specific — inputs, targets, hidden units, weights, training time — so the right one depends on where the thing being memorised lives, which is why mixup, which blends targets, helped least when the targets were the problem.",
        answer: [
          { t: "p", text: "The curve as the diagnostic, both executed tables, the dose argument, and the perturbation-locus principle." }
        ]
      },
      {
        level: "Advanced",
        q: "Explain mixup, cutout and stochastic depth, and where each belongs.",
        strong: "Mixup trains on convex combinations of pairs: x̃ = λxᵢ + (1 − λ)xⱼ with λ from Beta(α, α), and a loss that is λ·CE(out, yᵢ) + (1 − λ)·CE(out, yⱼ) — identical to cross-entropy against the mixed one-hot target, which I verified to six decimals. It encourages linear behaviour between examples and improves calibration; it was the best single regulariser on clean labels (+1.5) and the weakest on noisy ones (+2.4), because it blends wrong labels in. Cutout zeroes a random patch so the network cannot rely on one region; CutMix pastes a patch from another image and mixes labels by area; both belong in vision pipelines with real images — on 8 × 8 digits cutout was neutral. Stochastic depth skips whole residual blocks with a depth-increasing probability during training and runs them all, scaled, at evaluation; it is layer-level dropout that trains an ensemble of depths and shortens the gradient path, and it is standard at 0.1–0.3 in networks of a hundred blocks and in vision transformers. On an eight-block network it cost two to three points and widened the seed spread — it removes capacity the small network needed. Each of these has a regime; the honest answer to 'where does it belong' is 'where it has been measured to help, and measure it in yours'.",
        answer: [
          { t: "p", text: "Each method's mechanism with the executed evidence, the label-noise reversal for mixup, and the regime caveat for stochastic depth." }
        ]
      }
    ]
  }
});

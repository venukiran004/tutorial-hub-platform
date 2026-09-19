/* ============================================================================
   LESSON 1.6 — Initialisation and Normalisation
   ========================================================================= */
EC.receiveLesson({
  id: "1.6",

  lede: "**A network at initialisation should pass a signal forward and a gradient backward without either growing or shrinking, and the two tools for that are the scale of the random weights and a normalisation layer.** With weights of standard deviation 0.01 the activations of a thirty-layer ReLU network are 10⁻²⁹ by the last layer; with standard deviation 1 they are 10³¹; with He's √(2/n) they are 0.54, about where they started. The same thirty-layer network trained to 0.100 — chance — under every initialisation with plain SGD, and to 0.898 once BatchNorm was added. This lesson derives the two scales, measures every claim, and then does the same for BatchNorm, LayerNorm and their relatives, including the two ways BatchNorm fails.",

  objectives: [
    "Show why zero and constant initialisation fail (symmetry) with a five-step experiment",
    "Derive Var(z) = n·Var(w)·Var(x) and from it the Xavier and He scales, and verify both through thirty layers",
    "Read a depth sweep to see where initialisation alone stops being enough",
    "Compute BatchNorm by hand, explain train against eval mode and the running statistics, and reproduce its two failure modes",
    "Distinguish BatchNorm, LayerNorm, GroupNorm and InstanceNorm by the axes they normalise, and choose one for a stated setting"
  ],

  prerequisites: ["1.4", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "Symmetry: why not zeros", id: "symmetry" },

    { t: "p", text: "If every weight starts at the same value, every hidden unit in a layer computes the same function of its input, receives the same gradient, and takes the same update. They stay identical forever; a layer of 128 units is a layer of one." },

    { t: "code", lang: "text", title: "Zero and constant initialisation after five SGD steps (executed)",
      code: `64-8-10 MLP, all parameters 0:     after 5 steps, hidden weight rows identical? True   (std across units 0.0)
all parameters 0.1:                 after 5 steps, rows identical? True`,
      caption: "Random initialisation exists to break this symmetry. The question is only how large the random values should be — and the answer is set by what happens to the variance as the signal passes through a layer." },

    { t: "h2", n: "02", text: "The variance through one layer, then thirty", id: "variance" },

    { t: "p", text: "Take a unit z = Σᵢ wᵢxᵢ over n inputs, with the weights and inputs independent, zero-mean. Then Var(z) = n · Var(w) · Var(x). Verified: with n = 256, Var(w) = 0.0025 and Var(x) = 3.77, the formula gives 2.41 and the measurement 2.34. So to keep Var(z) = Var(x) through a linear layer you need Var(w) = 1/n. That is Xavier (Glorot) initialisation, derived for tanh, where the activation is roughly linear near zero. A ReLU discards half the distribution: E[relu(h)²] measured 0.5012 against E[h²]/2 = 0.5015. To compensate, double the weight variance: Var(w) = 2/n. That is He (Kaiming) initialisation." },

    { t: "code", lang: "text", title: "Activation standard deviation by layer, width 256, input std 1 (executed)",
      code: `                    layer 1   layer 5   layer 10  layer 20    layer 30
tanh  std=0.01       0.156     0.000     0.000     1.1e-16     1.3e-24     -- dies
tanh  xavier √(1/n)  0.628     0.319     0.222     0.153       0.130       -- slow decay: tanh is not quite linear
tanh  he √(2/n)      0.721     0.565     0.552     0.554       0.555       -- stable; tanh's saturation absorbs the extra
tanh  std=1.0        0.975     0.974     0.974     0.974       0.974       -- saturated: every unit at ±1, gradient gone

relu  std=0.01       0.094     0.000     0.000     7.0e-20     2.2e-29     -- dies
relu  xavier √(1/n)  0.585     0.147     0.019     5.8e-04     1.7e-05     -- halves every layer, as the derivation says
relu  he √(2/n)      0.827     0.830     0.599     0.593       0.543       -- stable
relu  std=1.0        9.359     153,787   2.1e+10   7.0e+20     2.2e+31     -- explodes`,
      caption: "Read the ReLU-Xavier row: 0.585, 0.147, 0.019 — a factor of about two lost per layer, exactly the half that ReLU throws away. He's extra factor of two cancels it and the signal arrives at layer 30 with std 0.54. The tanh-1.0 row looks healthy at 0.974 and is the worst of all: every unit is saturated and (lesson 1.2) the gradient through a saturated tanh is 0.01." },

    { t: "dl", items: [
      ["Xavier / Glorot", "Var(w) = 1/fan_in, or the symmetric 2/(fan_in + fan_out); uniform on ±√(6/(fan_in + fan_out)) or the matching normal. For tanh, sigmoid and linear layers. torch: xavier_uniform_, xavier_normal_."],
      ["He / Kaiming", "Var(w) = 2/fan_in; uniform on ±√(6/fan_in) or normal with std √(2/fan_in). For ReLU and its relatives; the exercise shows the uniform and normal forms both hold std through forty layers. torch: kaiming_normal_(nonlinearity='relu'). PyTorch's default for nn.Linear is kaiming_uniform_ with a = √5, which comes out at Var(w) = 1/(3·fan_in) — smaller than either, and the reason 'default' died below."],
      ["Biases", "Zero. There is no symmetry to break in the bias, and a non-zero bias shifts every unit's threshold in the same direction."],
      ["LSUV, orthogonal, others", "Layer-sequential unit variance runs data through and rescales each layer to unit output variance empirically; orthogonal initialisation keeps norms exactly for linear layers and is common in RNNs (module 4). Both are refinements of the same aim: unit variance in and out."]
    ] },

    { t: "h2", n: "03", text: "Where initialisation stops being enough", id: "depth" },

    { t: "code", lang: "text", title: "ReLU MLP, width 128, SGD momentum 0.05, 40 epochs on the digits — test accuracy (executed)",
      code: `depth       xavier    he        he + Adam 1e-3
  5         0.980     0.983     0.978
 10         0.737     0.974     0.969
 20         0.194     0.278     0.969
 30         0.102     0.100     0.819

depth 30, gradient norm at the input at init:
  std 0.01    0.00e+00      default (kaiming a=√5)  8.8e-14      xavier  1.0e-06      he  4.5e-02
depth 30 with BatchNorm after every linear (default init):   input grad norm 21.3,   accuracy 0.898`,
      caption: "At depth 10 the choice of scale is the difference between 0.737 and 0.974. At depth 20 He initialisation keeps the gradient alive (4.5 × 10⁻² against Xavier's 10⁻⁶) but plain SGD still cannot train the network; Adam can. At depth 30 nothing without normalisation trains well, and BatchNorm takes the same network to 0.898. Initialisation sets the starting point; normalisation keeps the network there as the weights change." },

    { t: "p", text: "That is the honest picture of a thirty-layer plain network: no skip connections, no normalisation, and even a perfect initialisation is not enough because the variance argument holds only at step zero. Lesson 3.3 adds the residual connection, which is the other half of the answer, and reproduces exactly this degradation." },

    { t: "h2", n: "04", text: "BatchNorm, by hand", id: "bn" },

    { t: "p", text: "Batch normalisation (Ioffe & Szegedy, 2015) standardises each feature over the mini-batch, then lets the network undo it with two learned parameters per feature:" },

    { t: "code", lang: "text", title: "The equations, on a batch of four with two features (executed)",
      code: `x = [[1, 10], [2, 20], [3, 30], [6, 60]]          batch of 4, 2 features

μ  = mean over the batch, per feature      = [3, 30]
σ² = variance over the batch (biased)      = [3.5, 350]
x̂  = (x − μ) / √(σ² + ε)                   = [[−1.069, −1.069], [−0.535, −0.535], [0, 0], [1.604, 1.604]]
y  = γ x̂ + β                               (γ = 1, β = 0 at init)          torch max diff 1.2e-07

running_mean ← (1 − m)·running_mean + m·μ          m = 0.1:  [0.3, 3.0] after one batch
running_var  ← (1 − m)·running_var  + m·σ²_unbiased          [1.37, 47.6]     (unbiased var [4.67, 466.7]·0.1 + 0.9)`,
      caption: "Both features standardise to the same x̂ because the second is ten times the first — BatchNorm removes scale. γ and β are what let the next layer receive whatever scale and offset it prefers; without them BatchNorm would force every pre-activation into the same range regardless of what the network needs." },

    { t: "p", text: "Two modes. In **training** the batch's own μ and σ² are used, and the running averages are updated. In **evaluation** the running averages are used instead, so that a single example gets a deterministic output that does not depend on what else is in its batch. That distinction produces both of BatchNorm's characteristic failures:" },

    { t: "code", lang: "text", title: "Failure one: the batch is too small (executed)",
      code: `train mode, batch of 1:   ValueError: Expected more than 1 value per channel when training     -- variance of one value is 0

10-layer MLP with BN, lr 0.1, 20 epochs:
  bs= 2   acc=0.100        bs= 4   acc=0.100        bs= 8   acc=0.757        bs=64   acc=0.957`,
      caption: "With two or four examples the batch statistics are so noisy that the network never trains. BatchNorm needs a batch that estimates a mean and variance — in practice 16 or more per device, which is why it is the wrong choice for very large models on small per-device batches and for sequence models with variable lengths." },

    { t: "code", lang: "text", title: "Failure two: the forgotten model.eval() (executed)",
      code: `same network, at test time:
  eval mode                                       0.957
  train mode, whole test set as one batch         0.969     -- 540 examples give good statistics; accidentally fine
  train mode, batches of 8                        0.719     -- each prediction depends on its seven neighbours
  train mode, batch of 1                          ValueError`,
      caption: "A model served one request at a time in train mode either crashes or, with dropout also active, gives different answers to the same input. model.eval() before inference — and torch.no_grad() alongside it — is the first line of every inference function." },

    { t: "p", text: "What BatchNorm buys, measured on a ten-layer He-initialised MLP:" },

    { t: "table", head: ["Learning rate", "Without BN", "With BN"],
      rows: [
        ["0.01", "0.980", "0.970"],
        ["0.1", "0.100 (NaN)", "0.957"],
        ["0.5", "0.100", "0.967"],
        ["1.0", "0.100 (NaN)", "0.883"]
      ] },

    { t: "p", text: "Without normalisation the network trains at one learning rate and diverges at the next; with it, every rate from 0.01 to 1.0 trains. That robustness — to the learning rate, to the initialisation, to depth — is BatchNorm's actual contribution. The original paper attributed it to reducing 'internal covariate shift'; later work (Santurkar et al., 2018) showed the loss surface simply becomes smoother, so larger steps are safe. Either way the effect is the table above." },

    { t: "h2", n: "05", text: "LayerNorm, GroupNorm, InstanceNorm: the axes", id: "axes" },

    { t: "p", text: "Every normalisation layer computes the same (x − μ)/σ · γ + β; they differ only in which elements are averaged to get μ and σ. On an image batch of shape (N, C, H, W):" },

    { t: "code", lang: "text", title: "Which axes each layer normalises over — verified on a (2, 4, 3, 3) tensor (executed)",
      code: `BatchNorm      per channel, over (N, H, W)              mean 1e-07, std 1.000     -- needs a batch; has running stats
LayerNorm      per example, over (C, H, W)              mean 4e-07, std 1.000     -- no batch dependence at all
GroupNorm(2)   per example, per group of 2 channels     mean 4e-07, std 1.000     -- batch-independent, keeps some channel structure
InstanceNorm   per example, per channel, over (H, W)    mean 1e-06, std 1.000     -- style transfer; removes per-image contrast`,
      caption: "LayerNorm on row 0 alone equals row 0 of LayerNorm on the whole batch (exercise): its output for an example depends on that example only, so there is no train/eval distinction, no running statistics, and no minimum batch size. That is why it is the normalisation inside every transformer (module 5) and every RNN that uses one." },

    { t: "table", head: ["Setting", "Use", "Because"],
      rows: [
        ["Convolutional network, batch ≥ 16 per device", "BatchNorm", "Best accuracy in that regime; the statistics are reliable and the running averages give free, deterministic inference"],
        ["Transformer, RNN, any sequence model", "LayerNorm", "Sequence lengths vary and batches are small; per-token normalisation over the feature dimension is the natural unit"],
        ["Convolutional network, tiny batches (detection, segmentation at high resolution)", "GroupNorm (32 groups)", "Batch-independent; within a point of BN at batch 32 and far better at batch 2"],
        ["Style transfer, image-to-image", "InstanceNorm", "Removing each image's own contrast statistics is the point"],
        ["Inference with BN", "Fold BN into the preceding linear/conv", "y = γ(Wx + b − μ)/σ + β is another affine map; module 11.2 does the folding"]
      ] },

    { t: "callout", kind: "info", title: "Where the layer goes",
      body: "The original placement is Linear → BN → activation, so that the activation receives a standardised input; that is what every experiment on this page uses. Some architectures put it after the activation, and transformers put LayerNorm either before each sub-block (pre-norm, the modern default — 5.2) or after (post-norm, the original). Both orders work; pre-norm trains more stably at depth. What matters more than the position is not decaying γ and β with weight decay — treat them like biases (1.7)." },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A ReLU network with Xavier initialisation lost about half its activation variance per layer (0.585, 0.147, 0.019 at layers 1, 5, 10). Why, and what is the fix?",
          options: [
            "Xavier is too large for ReLU",
            "ReLU zeroes half the distribution, so E[relu(h)²] = E[h²]/2 (measured 0.5012 vs 0.5015); Xavier's Var(w) = 1/n was derived assuming a linear activation, and He's Var(w) = 2/n supplies the missing factor of two",
            "The biases were not initialised",
            "The width was too small"
          ],
          answer: 1,
          why: "Var(z) = n·Var(w)·Var(x) keeps the variance through the linear map; the ReLU halves it afterwards. Doubling Var(w) is exactly the correction, and the He row held std 0.54 at layer 30 where the Xavier row was 1.7 × 10⁻⁵."
        },
        {
          stem: "BatchNorm in train mode with a batch of one raises an error, and with a batch of two the network never trained (0.100). What is the common cause?",
          options: [
            "BatchNorm requires powers of two",
            "The batch statistics are estimated from the batch itself: one value has zero variance, and two or four values give a mean and variance so noisy that every forward pass sees a different normalisation — BatchNorm needs a batch that can estimate them, roughly 16 or more",
            "The learning rate was wrong",
            "BatchNorm only works with convolutions"
          ],
          answer: 1,
          why: "This is the structural reason BatchNorm is replaced by LayerNorm in sequence models and GroupNorm in small-batch vision: those normalise within an example and need no batch at all. The exercise shows LayerNorm on one row equalling the batched result exactly."
        },
        {
          stem: "A served model gives different predictions for the same input on different requests. Which line is missing?",
          options: [
            "torch.manual_seed(0)",
            "model.eval(), which switches BatchNorm to its running statistics and turns dropout off — in train mode each prediction depended on its batch-mates (0.719 at batch 8 against 0.957 in eval mode) and a batch of one crashed",
            "optimizer.zero_grad()",
            "model.train()"
          ],
          answer: 1,
          why: "Train-mode BatchNorm normalises each example with the statistics of whatever batch it arrived in, so the same input yields different outputs. eval mode uses the fixed running averages; with torch.no_grad() it is the standard inference preamble."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "He by hand through forty layers, LayerNorm by hand, and the thirty-layer network three ways",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** In NumPy, initialise forty 512 × 512 weight matrices with (i) normal std 1/√n, (ii) normal std √(2/n), (iii) uniform on ±√(6/n), and pass a unit-variance input through forty ReLU layers. Report the activation std at layers 1, 10, 20 and 40 for each." },
        { t: "p", text: "**(b)** Implement LayerNorm over the last dimension by hand (biased variance, ε = 10⁻⁵, γ = 1, β = 0), compare with F.layer_norm on a 3 × 8 tensor, and confirm that normalising row 0 alone gives the same result as row 0 of the batched call." },
        { t: "p", text: "**(c)** Build the thirty-layer width-128 ReLU MLP with He initialisation and train it on the digits with Adam 10⁻³ for 30 epochs, three ways: no normalisation, BatchNorm after each linear, LayerNorm after each linear — at batch 64 and at batch 4. Report the six test accuracies and explain the pattern." }
      ],
      requirements: [
        "(a) a 3 × 4 table of standard deviations.",
        "(b) the maximum discrepancy and the equality check.",
        "(c) six accuracies and an explanation."
      ],
      hint: "(a) The uniform on ±a has variance a²/3, so ±√(6/n) has variance 2/n — He uniform. (c) Keep the last incomplete batch out when it has a single example, or BatchNorm will raise.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a)                                 layer 1   layer 10   layer 20   layer 40
#     xavier  normal 1/√n             0.586     0.028      0.001      0.000       -- halves per layer under ReLU
#     he      normal √(2/n)           0.825     0.879      0.997      0.991
#     he      uniform ±√(6/n)         0.825     0.822      0.841      0.802       -- same variance, same result

# (b) LayerNorm by hand vs F.layer_norm: max diff 2.4e-07
#     per-row mean [0, 0, 0], per-row std [1, 1, 1]
#     layer_norm(x[:1]) == layer_norm(x)[:1]:  True     -- no batch dependence

# (c) 30-layer He MLP, Adam 1e-3, 30 epochs, test accuracy
#     batch 64:   none = 0.969     BatchNorm = 0.687     LayerNorm = 0.100
#     batch  4:   none = 0.761     BatchNorm = 0.122     LayerNorm = 0.100
#     -- the pattern is not the textbook one, so investigate rather than explain it away:
#     LayerNorm run, loss every 6 epochs at Adam 1e-3:  2.23, 0.83, 0.58, 0.85, 1.23   -- it trains, then destabilises
#     same LayerNorm network at Adam 1e-4:  0.919        at 3e-5:  0.843                -- a learning-rate problem, not a dead network
#     BatchNorm network at 1e-4:  0.106     at 3e-5:  0.102                            -- BN wants the larger rate here
#     gradient norm of the first three linear layers at init:  none ≈ [0.65, 1.15, 1.11]   LN ≈ [0.74, 1.14, 1.18]   BN ≈ [297, 331, 259]
#     -- BatchNorm in a thirty-layer plain stack amplifies the early layers' gradients three-hundredfold at step 0;
#        Adam's per-coordinate normalisation is what makes that survivable at all.
#     conclusion: in a plain (non-residual) stack of thirty layers, every normalisation choice interacts with the learning
#     rate, small batches hurt everything (BatchNorm most), and the architecture itself is the problem -- lesson 3.3 adds
#     the residual connection, after which both BatchNorm and LayerNorm behave as the textbooks say`,
        notes: [
          { t: "p", text: "(a) is the derivation as a measurement: the factor of two per layer is real, and normal against uniform makes no difference once the variance matches." },
          { t: "p", text: "(b) is why LayerNorm belongs in models that see one sequence at a time." },
          { t: "p", text: "(c) is the result that should make you suspicious of any rule stated without a measurement, and it is discussed in full in the solution." }
        ]
      }
    }
  ],

  takeaways: [
    "Identical initial weights stay identical: after five SGD steps the hidden rows of a zero- or constant-initialised layer were still equal. Randomness breaks the symmetry; the scale is set by Var(z) = n·Var(w)·Var(x) (2.41 predicted, 2.34 measured).",
    "Xavier Var(w) = 1/n holds the variance through a linear or tanh layer; ReLU halves the second moment (0.5012 measured), so He's 2/n is needed: through thirty ReLU layers std went 0.585 → 1.7 × 10⁻⁵ under Xavier and 0.827 → 0.543 under He. Std 0.01 dies (10⁻²⁹) and std 1 explodes (10³¹).",
    "Initialisation alone runs out at depth: He gave 0.974 at ten layers where Xavier gave 0.737, but at thirty layers every initialisation reached 0.100 with SGD, Adam reached 0.819, and BatchNorm on the default initialisation reached 0.898.",
    "BatchNorm standardises each feature over the batch (μ = [3, 30], σ² = [3.5, 350], x̂ identical for both features) then applies γ and β; train mode uses batch statistics and updates running averages with momentum 0.1, eval mode uses the running averages.",
    "BatchNorm's two failures: a batch too small (batch 1 raises, batches 2 and 4 never trained) and the forgotten eval() (0.719 at batch 8 in train mode against 0.957). Its benefit: a ten-layer MLP trained at every learning rate from 0.01 to 1.0 with BN and only at 0.01 without.",
    "LayerNorm, GroupNorm and InstanceNorm differ from BatchNorm only in the averaging axes; LayerNorm on one example equals LayerNorm in a batch, so it needs no batch and no running statistics — the choice for transformers and RNNs, with GroupNorm for small-batch vision."
  ],

  quiz: {
    title: "Initialisation and Normalisation — Knowledge Check",
    questions: [
      {
        stem: "Why is a thirty-layer tanh network with weights of standard deviation 1.0 in trouble even though its activation std stays at 0.974 through every layer?",
        options: [
          "It is not in trouble; a stable std is the goal",
          "Because 0.974 is the std of a distribution piled up at ±1: every unit is saturated, tanh′ there is about 0.01, and the gradient vanishes through thirty such factors — forward looks healthy, backward is dead",
          "Because tanh cannot be used at depth thirty",
          "Because the biases are zero"
        ],
        answer: 1,
        why: "A healthy activation distribution is spread across the activation's linear region, not stacked at its limits. The variance argument must hold for the gradient as well as the signal; Xavier's derivation balances both, which is why its scale is the geometric compromise 2/(fan_in + fan_out)."
      },
      {
        stem: "PyTorch's default nn.Linear initialisation gave an input gradient of 8.8 × 10⁻¹⁴ at depth 30 and did not train. Why is the default not He?",
        options: [
          "It is He; the network failed for another reason",
          "The default is kaiming_uniform_ with a = √5, which works out to Var(w) = 1/(3·fan_in) — a third of Xavier and a sixth of He, kept for backward compatibility — so deep ReLU stacks should be initialised explicitly",
          "The default is zeros",
          "The default depends on the batch size"
        ],
        answer: 1,
        why: "The default is small enough to be safe for shallow networks and wrong for deep plain ones. nn.init.kaiming_normal_(w, nonlinearity='relu') on each Linear or Conv is the two-line fix, and the depth sweep is the evidence."
      },
      {
        stem: "What are γ and β in BatchNorm for?",
        options: [
          "They are the batch mean and variance",
          "They are learned per-feature scale and shift applied after standardisation, so the network can restore whatever scale and offset the next layer needs — without them every pre-activation would be forced to zero mean and unit variance regardless of what the loss prefers",
          "They are the running statistics used at inference",
          "They are momentum coefficients"
        ],
        answer: 1,
        why: "Standardisation removes information the network may want; γ and β give it back under the network's control. Setting γ = 1, β = 0 at initialisation is why the by-hand computation matched torch exactly, and at inference they fold into the preceding layer."
      },
      {
        stem: "Which normalisation would you use in a transformer, and why not BatchNorm?",
        options: [
          "BatchNorm, because it is the most accurate",
          "LayerNorm, because it normalises each token's feature vector independently of the batch: sequence lengths vary, padding would pollute batch statistics, batches are small, and there is no train/eval discrepancy",
          "InstanceNorm, because tokens are instances",
          "No normalisation; attention does not need it"
        ],
        answer: 1,
        why: "BatchNorm's statistics are estimated across the batch, which for sequences means across tokens of different sentences at the same position — meaningless — and fail at small batch. LayerNorm's independence from the batch is structural (row 0 alone equals row 0 of the batch, verified) and is why every transformer uses it."
      },
      {
        stem: "Ten-layer network: without BN it trained at lr 0.01 and diverged at 0.1; with BN it trained at 0.01, 0.1, 0.5 and 1.0. What is the best description of BatchNorm's benefit?",
        options: [
          "It increases the model's capacity",
          "It makes optimisation robust — to the learning rate, to depth and to initialisation — by keeping each layer's input distribution stable as the weights change, which smooths the loss surface so larger steps are safe",
          "It removes the need for an activation function",
          "It reduces the number of parameters"
        ],
        answer: 1,
        why: "The accuracy at a good learning rate barely changed (0.980 vs 0.970); the range of learning rates that work widened by two orders of magnitude, and a thirty-layer network went from chance to 0.898. That robustness, not a capacity gain, is what the layer delivers."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Initialisation and Normalisation",
    sub: "Symmetry, the variance derivation, Xavier against He, BatchNorm's mechanics and failures, and the normalisation family.",
    questions: [
      {
        level: "Core",
        q: "Why does weight initialisation matter, and how do you choose the scale?",
        strong: "Two reasons. First, symmetry: identical initial weights give identical units that receive identical gradients and never diverge — after five steps a zero-initialised layer's rows were still equal — so the weights must be random. Second, scale: a unit z = Σ wᵢxᵢ over n inputs has Var(z) = n·Var(w)·Var(x), verified numerically (2.41 predicted, 2.34 measured), so to hold the variance through a layer you need Var(w) = 1/n — Xavier, derived for tanh where the activation is near-linear. ReLU zeroes half the distribution, halving the second moment (measured 0.5012 against 0.5015), so He doubles it to Var(w) = 2/n. Measured through thirty ReLU layers: std 0.01 died to 10⁻²⁹, std 1 exploded to 10³¹, Xavier decayed from 0.585 to 1.7 × 10⁻⁵ — halving each layer as predicted — and He held 0.83 to 0.54. Biases start at zero. On a ten-layer network the choice was 0.737 against 0.974; PyTorch's default for nn.Linear is smaller than either and should be overridden for deep ReLU stacks.",
        answer: [
          { t: "p", text: "Symmetry with the experiment, the variance derivation with its check, the ReLU correction, and the executed thirty-layer table and accuracies." }
        ]
      },
      {
        level: "Core",
        q: "Explain batch normalisation: the forward computation, train versus eval, and what it achieves.",
        strong: "For each feature, compute the mean and biased variance over the mini-batch, standardise x̂ = (x − μ)/√(σ² + ε), then output γx̂ + β with γ and β learned per feature. On a batch [[1, 10], [2, 20], [3, 30], [6, 60]], μ = [3, 30], σ² = [3.5, 350], and both features standardise to the same column [−1.069, −0.535, 0, 1.604] — scale is removed, and γ, β let the network put back whatever scale and offset the next layer needs. In training the batch's statistics are used and exponential running averages are updated (momentum 0.1: running mean [0.3, 3.0] after one batch); in eval the running averages are used so a single example's output is deterministic. What it achieves is robustness of optimisation: a ten-layer MLP without BN trained at learning rate 0.01 and diverged at 0.1, with BN it trained at 0.01, 0.1, 0.5 and 1.0; a thirty-layer network went from chance to 0.898. The paper's 'internal covariate shift' story has been superseded by the observation that the loss surface becomes smoother; the measured effect is the same.",
        answer: [
          { t: "p", text: "The equations on the executed batch, γ/β's purpose, the two modes with the running-statistics numbers, and the measured robustness." }
        ]
      },
      {
        level: "Core",
        q: "When would you use LayerNorm instead of BatchNorm?",
        strong: "Whenever the batch cannot supply reliable statistics or an example's output must not depend on its batch-mates. BatchNorm averages each feature over (N, H, W) — across examples — so it needs a batch of roughly sixteen or more (batches of 2 and 4 never trained, batch 1 raises), it has separate train and eval behaviour that produces the forgotten-eval() bug (0.719 at batch 8 in train mode against 0.957), and for sequences it would average across tokens of unrelated sentences. LayerNorm averages over the feature dimensions of each example alone — verified that LayerNorm of row 0 by itself equals row 0 of the batched call — so it needs no batch, no running statistics and has no train/eval distinction. That makes it the normalisation of every transformer and RNN. In convolutional networks with small batches GroupNorm is the usual substitute, keeping some channel grouping; InstanceNorm, per example per channel, is for style transfer where removing an image's own contrast is the point.",
        answer: [
          { t: "p", text: "The axes distinction, BatchNorm's two batch-related failures with numbers, LayerNorm's independence, and the family placement." }
        ]
      },
      {
        level: "Advanced",
        q: "You forgot model.eval() before serving. What happens, and why?",
        strong: "Two things, depending on the layers present. BatchNorm in train mode normalises each request with the statistics of its batch: served one request at a time it raises — 'expected more than 1 value per channel' — and served in small batches each prediction depends on the other requests in the batch, so the same input returns different outputs; measured 0.719 accuracy at batch 8 against 0.957 in eval mode. Dropout in train mode keeps randomly zeroing units, so predictions are stochastic and, without the inverted scaling being disabled, systematically noisy. The fix is model.eval() — which flips both — together with torch.no_grad() to skip building the graph. It should be the first two lines of any inference path, and a test that calls the model twice on one input and asserts equality catches the omission.",
        answer: [
          { t: "p", text: "Both mechanisms, the executed numbers, the crash case, and the fix with a regression test." }
        ]
      },
      {
        level: "Advanced",
        q: "At depth 30, He initialisation kept the input gradient at 4.5 × 10⁻² yet SGD still reached only chance. Why, and what is the remedy?",
        strong: "Because the variance argument is a statement about the network at initialisation. It guarantees that the first forward and backward pass are well scaled; it says nothing about the weights after a hundred updates, and in a thirty-layer plain stack a few updates are enough to move some layers off the unit-variance regime, after which the products of thirty Jacobians drift again. He initialisation took a ten-layer network from 0.737 to 0.974 and a twenty-layer one to 0.278 with SGD — better than Xavier's 0.194 but not trainable — while Adam, whose per-coordinate normalisation tolerates badly scaled gradients, reached 0.969 at twenty layers and 0.819 at thirty. The remedies that make depth routine are normalisation layers, which re-standardise every layer's input on every step (BatchNorm: 0.898 at depth 30 on the default initialisation), and residual connections, which give the gradient an identity path around each block (3.3). Modern deep networks use both; initialisation is necessary and not sufficient.",
        answer: [
          { t: "p", text: "Initialisation as a step-zero guarantee, the executed depth sweep with SGD and Adam, and the two structural remedies." }
        ]
      }
    ]
  }
});

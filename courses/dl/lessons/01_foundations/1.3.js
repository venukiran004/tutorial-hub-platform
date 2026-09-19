/* ============================================================================
   LESSON 1.3 — Forward Propagation and Loss Functions
   ========================================================================= */
EC.receiveLesson({
  id: "1.3",

  lede: "**The forward pass is a sequence of matrix products with a non-linearity between each, and the loss is one number at the end that says how wrong the output was — every gradient in the network is a derivative of that one number.** Track the shapes and the forward pass cannot go wrong; pick the loss to match the target and its gradient will push the right way. The same network trained with cross-entropy reached 96 % on the digits while MSE on the softmax output reached 53 % — the wrong loss is not a small mistake.",

  objectives: [
    "Write a forward pass for a batch as matrix products with every shape tracked, and work one by hand on small numbers",
    "Compute MSE, MAE, Huber, binary and categorical cross-entropy, focal loss, KL divergence, contrastive and triplet loss on given numbers",
    "Derive that the gradient of softmax-cross-entropy with respect to the logits is p − y, and confirm it with autograd",
    "Explain why the loss and the metric differ, and why a differentiable surrogate is needed",
    "Choose the loss for a stated target — regression with outliers, imbalanced classification, embeddings — with the measured reason"
  ],

  prerequisites: ["1.1", "1.2"],

  blocks: [

    { t: "h2", n: "01", text: "The forward pass, with shapes", id: "forward" },

    { t: "p", text: "A batch of B examples with D features is a matrix X of shape (B, D). A layer with H units has a weight matrix of shape (D, H) and a bias of shape (H,); the product X @ W is (B, H), the bias broadcasts across the batch, and the activation is applied element-wise. Repeat to the output. The only rule is that the inner dimensions agree, and if you write the shapes down first, the code follows." },

    { t: "code", lang: "python", title: "Three layers, batch of 4, shapes tracked (executed)",
      code: `X                (4, 3)        batch of 4, 3 features
W1               (3, 5)        3 inputs -> 5 hidden units
Z1 = X @ W1 + b1 (4, 5)        pre-activations, one row per example
A1 = relu(Z1)    (4, 5)
W2               (5, 2)
Z2 = A1 @ W2 + b2(4, 2)
W3               (2, 3)        2 -> 3 classes
Z3 (logits)      (4, 3)
P = softmax(Z3)  (4, 3)        rows sum to: [1. 1. 1. 1.]`,
      caption: "The batch dimension rides along untouched: the same weights are applied to every row. That is also why the gradient with respect to W is a sum over the batch — every row contributed through the same matrix." },

    { t: "p", text: "Here is the same thing on numbers small enough to check by hand, for a network with two inputs, two ReLU hidden units and one sigmoid output — the network that lesson 1.4 will backpropagate through:" },

    { t: "code", lang: "text", title: "Worked forward pass",
      code: `x  = [1, 2]
W1 = [[0.5, −0.3],     b1 = [0, 0.1]
      [0.1,  0.8]]
W2 = [0.7, −0.4]       b2 = 0.2

z1 = W1·x + b1 = [0.5·1 + (−0.3)·2 + 0,  0.1·1 + 0.8·2 + 0.1] = [−0.1, 1.8]
a1 = relu(z1)                                                    = [0, 1.8]        -- the first unit is off for this input
z2 = W2·a1 + b2 = 0.7·0 + (−0.4)·1.8 + 0.2                       = −0.52
ŷ  = sigmoid(−0.52)                                              = 0.3729          -- torch: 0.37285`,
      caption: "Every number here reappears in 1.4 when the gradient is worked backward through the same path. Note that the first hidden unit is off: its weights will receive no gradient from this example, which is the dying ReLU in miniature." },

    { t: "h2", n: "02", text: "Regression losses", id: "regression" },

    { t: "p", text: "For a continuous target the loss is a function of the residual r = ŷ − y. Three choices, computed on residuals of 0.5, −2 and 3:" },

    { t: "code", lang: "text", title: "MSE, MAE and Huber on the same residuals (executed)",
      code: `residuals r = [0.5, −2, 3]

MSE  = mean(r²)                          = (0.25 + 4 + 9) / 3        = 4.4167
MAE  = mean(|r|)                         = (0.5 + 2 + 3) / 3         = 1.8333
Huber(δ=1) per element:  ½r² if |r| ≤ δ, else δ(|r| − ½δ)
                                         = [0.125, 1.5, 2.5]   mean  = 1.3750

gradients with respect to ŷ, per element:
  MSE    2r        -> [−20, −4, −1, 0.6, 8, 200] for residuals [−10, −2, −0.5, 0.3, 4, 100]     unbounded
  Huber  clip(r,±δ)-> [−1, −1, −0.5, 0.3, 1, 1]                                                 bounded by δ
  MAE    sign(r)   -> [−1, −1, −1, 1, 1, 1]                                                     constant magnitude, undefined at 0`,
      caption: "MSE squares the residual, so one outlier at 100 contributes a gradient of 200 and dominates the update. Huber is quadratic near zero (smooth, with a gradient that shrinks as you approach the optimum) and linear beyond δ (a bounded gradient, so an outlier cannot dominate). MAE is linear everywhere and its gradient never shrinks, which makes convergence to the exact optimum jittery." },

    { t: "p", text: "What each loss *predicts* differs too. Fit a single constant to the values [1, 1.2, 0.9, 1.1, 1, 10] — five ordinary points and one outlier:" },

    { t: "code", lang: "text", title: "The constant that minimises each loss (executed)",
      code: `MSE optimum  2.533   = the mean   (2.533)   -- dragged two and a half units toward the outlier
MAE optimum  1.003   ≈ the median (1.050)   -- the outlier moves it not at all
                     (any value between the two middle points 1.0 and 1.1 minimises MAE; SGD stopped at 1.003)`,
      caption: "MSE estimates the conditional mean, MAE the conditional median. If your target has heavy tails and you want a typical value, MAE or Huber; if you want the expectation and the noise is roughly Gaussian, MSE — it is the maximum-likelihood loss for Gaussian noise, as MAE is for Laplacian." },

    { t: "h2", n: "03", text: "Classification losses", id: "classification" },

    { t: "p", text: "For a probability output, the loss is the negative log-likelihood of the correct label — the cross-entropy. Binary first, then multi-class:" },

    { t: "code", lang: "text", title: "BCE and CE on numbers (executed)",
      code: `binary cross-entropy   BCE = −[y·ln p + (1 − y)·ln(1 − p)]
  p = [0.9, 0.2, 0.6],  y = [1, 1, 0]
  per example  = [−ln 0.9, −ln 0.2, −ln(1 − 0.6)] = [0.1054, 1.6094, 0.9163]   mean 0.8770
  -- a confident correct answer costs 0.11; a confident wrong one costs 1.61

categorical cross-entropy   CE = −ln p_y   with p = softmax(logits)
  logits row 1 = [2, 1, 0.1],  y = 0   ->  softmax [0.659, 0.242, 0.099]   CE = −ln 0.659 = 0.417
  logits row 2 = [0.5, 0.5, 3], y = 1   ->  softmax [0.071, 0.071, 0.859]   CE = −ln 0.071 = 2.652`,
      caption: "Cross-entropy is unbounded above: as the probability of the true class goes to zero the loss goes to infinity, which is why a single mislabelled example with a confident model can produce an enormous gradient — and why label smoothing (2.5) exists." },

    { t: "p", text: "The gradient of softmax followed by cross-entropy, taken with respect to the logits, is the reason this pairing is universal. Work it: L = −ln pᵧ with pᵢ = exp zᵢ / Σ exp zⱼ. Then ∂L/∂zᵢ = pᵢ − 𝟙[i = y] — the predicted probability minus the one-hot target. No saturation, no vanishing, a gradient that is exactly the error:" },

    { t: "code", lang: "python", title: "∂CE/∂logits = p − onehot (executed)",
      code: `logits = [[2, 1, 0.1], [0.5, 0.5, 3]],  y = [0, 1]

autograd  dCE/dlogits = [[-0.341   0.2424  0.0986]
                         [ 0.0705 -0.9295  0.859 ]]
p − onehot            = [[-0.341   0.2424  0.0986]
                         [ 0.0705 -0.9295  0.859 ]]         -- identical`,
      caption: "Row 2 is the informative one: the model put 0.859 on the wrong class, so that logit is pushed down by 0.859 and the correct logit is pushed up by 0.9295. The gradient is large exactly when the model is confidently wrong, which is the behaviour you want from a loss." },

    { t: "callout", kind: "info", title: "Derivation in four lines",
      body: "ln pᵧ = zᵧ − ln Σⱼ exp zⱼ. Differentiate with respect to zᵢ: the first term gives 𝟙[i = y]; the second gives exp zᵢ / Σ exp zⱼ = pᵢ. So ∂(ln pᵧ)/∂zᵢ = 𝟙[i = y] − pᵢ, and L = −ln pᵧ gives ∂L/∂zᵢ = pᵢ − 𝟙[i = y]. The sigmoid-plus-BCE case is the same result with two classes: ∂L/∂z = p − y." },

    { t: "h2", n: "04", text: "Focal loss, class weights and KL", id: "focal" },

    { t: "p", text: "Cross-entropy treats every example alike, and on an imbalanced problem the many easy negatives add up to most of the loss even though each contributes little. Focal loss multiplies each example's cross-entropy by (1 − pₜ)^γ, where pₜ is the probability assigned to the true class — a factor near zero for confident correct predictions and near one for wrong ones:" },

    { t: "code", lang: "text", title: "Focal loss against cross-entropy (executed)",
      code: `p(true class)   0.95     0.70     0.30     0.05
CE              0.0513   0.3567   1.2040   2.9957
focal γ=2       0.0001   0.0321   0.5899   2.7036
ratio           0.0025   0.09     0.49     0.90        -- the easy example is down-weighted 400×, the hard one barely

a batch of 990 easy negatives (p = 0.05) and 10 hard positives (p = 0.30):
  CE        negatives 50.78  positives 12.04   -> negatives are 81 % of the loss
  focal γ=2 negatives  0.13  positives  5.90   -> negatives are  2 % of the loss
  CE with positive weight 99:  negatives 50.78  positives 1191.93  -> the other extreme`,
      caption: "Focal loss (RetinaNet, module 3.6) re-balances by difficulty rather than by class: an easy positive is down-weighted just as an easy negative is. Class weights re-balance by label and can over-correct; the weighted row is dominated by ten examples." },

    { t: "p", text: "KL divergence measures how one distribution differs from another, and cross-entropy is KL plus an entropy that the model cannot change:" },

    { t: "code", lang: "text", title: "KL and its relation to cross-entropy (executed)",
      code: `P = [0.7, 0.2, 0.1]   Q = [0.5, 0.3, 0.2]
KL(P‖Q) = Σ P ln(P/Q) = 0.0851        KL(Q‖P) = 0.0920       -- not symmetric
H(P, Q) = −Σ P ln Q   = 0.8869  =  H(P) 0.8018  +  KL(P‖Q) 0.0851`,
      caption: "With a one-hot target H(P) = 0 and cross-entropy *is* the KL divergence. With soft targets — distillation (2.5), label smoothing — the entropy term is non-zero but constant, so minimising cross-entropy still minimises KL. torch.nn.KLDivLoss expects log-probabilities as its input and probabilities as its target; that argument order is the most common mistake with it." },

    { t: "h2", n: "05", text: "Losses on embeddings", id: "embeddings" },

    { t: "p", text: "When the network's output is a vector meant to be compared with other vectors — face verification, retrieval, self-supervised pretraining (module 7) — the loss is defined on distances between outputs rather than on a target value:" },

    { t: "code", lang: "text", title: "Contrastive, triplet and cosine losses on three points (executed)",
      code: `anchor a = [1, 0]   positive p = [0.8, 0.3]   negative n = [−0.2, 0.9]
d(a, p) = 0.3606     d(a, n) = 1.5000

contrastive (Hadsell 2006), margin m = 1:
  similar pair      L = d²                = 0.1300     -- pull together
  dissimilar pair   L = max(0, m − d)²    = 0.0000     -- already beyond the margin, nothing to push

triplet, margin 1:  L = max(0, d(a,p) − d(a,n) + m) = max(0, 0.3606 − 1.5 + 1) = 0        -- satisfied
  with n = [0.6, 0.5]:  d(a,n) = 0.6403   L = max(0, 0.3606 − 0.6403 + 1) = 0.7202          -- violated; torch agrees

cosine embedding, similar pair:  1 − cos(a, p) = 1 − 0.9363 = 0.0637`,
      caption: "A triplet loss is zero once the negative is a margin further away than the positive — which means most triplets contribute nothing after a little training, and mining the hard ones is the whole engineering problem. Lesson 7.2 replaces these with the batch-wise NT-Xent loss." },

    { t: "h2", n: "06", text: "Loss against metric, and the wrong loss", id: "metric" },

    { t: "p", text: "The metric is what you care about — accuracy, F1, mAP, WER. The loss is what you can differentiate. Accuracy is piecewise constant: moving p(correct) from 0.51 to 0.99 changes it not at all, and moving from 0.51 to 0.49 flips it. Cross-entropy sees both moves in proportion to their probability change:" },

    { t: "code", lang: "text", title: "Why accuracy cannot be the loss (executed)",
      code: `p(correct) 0.51 -> 0.99   accuracy unchanged      CE 0.6733 -> 0.0101
p(correct) 0.51 -> 0.49   accuracy flips           CE 0.6733 -> 0.7133`,
      caption: "A loss must have a gradient that points toward the metric; it does not have to be the metric. Cross-entropy is a smooth upper bound on the 0–1 loss, which is why minimising it tends to raise accuracy — but a validation *metric* is still what you select and stop on." },

    { t: "p", text: "Using a loss that does not match the output is the most common silent failure. The same 64-128-10 network, the same SGD, three losses:" },

    { t: "table", head: ["Loss", "Epoch 1", "Epoch 5", "Epoch 10", "Epoch 20", "Epoch 40"],
      rows: [
        ["Cross-entropy on logits", "0.587", "0.863", "0.913", "0.950", "0.963"],
        ["MSE on softmax output", "0.096", "0.146", "0.254", "0.374", "0.526"],
        ["MSE on raw logits vs one-hot", "0.165", "0.696", "0.852", "0.900", "0.935"]
      ] },

    { t: "p", text: "MSE on the softmax output is the disaster: its gradient with respect to the logits carries a factor of p(1 − p), which is tiny when the softmax is confident — including confidently wrong — so the network barely learns from its worst mistakes. Forty epochs reached 53 %. MSE on raw logits works surprisingly well (a linear-output regression to the one-hot vector) but still trails cross-entropy at every epoch. **The loss and the output layer are chosen together**: sigmoid with BCE-with-logits, softmax with cross-entropy from logits, identity with MSE or Huber." },

    { t: "table", head: ["Target", "Output layer", "Loss", "Note"],
      rows: [
        ["Continuous, Gaussian noise", "identity", "MSE", "Estimates the mean; gradient unbounded in the residual"],
        ["Continuous, heavy tails or outliers", "identity", "Huber (or MAE)", "Bounded gradient; Huber smooth at zero, MAE estimates the median"],
        ["Binary", "one logit", "BCEWithLogits", "Never sigmoid-then-BCE: the fused form is stable"],
        ["K exclusive classes", "K logits", "CrossEntropy (from logits)", "Gradient p − y; combine with label smoothing if over-confident"],
        ["K non-exclusive labels", "K logits", "BCEWithLogits per label", "Each label an independent binary problem"],
        ["Rare positives, dense negatives", "logits", "Focal, or CE with class weights", "Focal re-weights by difficulty; weights by label"],
        ["Soft targets (distillation, smoothing)", "K logits", "CE or KL", "Same minimiser; KLDivLoss takes log-probabilities as input"],
        ["Embeddings", "a vector", "Contrastive, triplet, NT-Xent", "Defined on distances; needs hard-negative handling"],
        ["Counts", "softplus or exp", "Poisson NLL", "Positive rate; the log link is built in"]
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The gradient of softmax-cross-entropy with respect to the logits was measured as [0.0705, −0.9295, 0.859] for a row whose true class was 1. What does each entry mean?",
          options: [
            "The logits themselves",
            "Predicted probability minus one-hot target: the wrong class with 0.859 is pushed down by 0.859 and the true class, at 0.0705, is pushed up by 1 − 0.0705 = 0.9295 — the gradient is the error itself",
            "The learning rate applied to each class",
            "The softmax output rescaled"
          ],
          answer: 1,
          why: "∂L/∂zᵢ = pᵢ − 𝟙[i = y]. A large probability on a wrong class gives a large positive gradient (push down); a small probability on the right class gives a large negative one (push up). The derivation is four lines and autograd matched it to four decimals."
        },
        {
          stem: "A regression target has a few extreme outliers and you want the typical value. Which loss, and why?",
          options: [
            "MSE, because it is the standard",
            "MAE or Huber: fitting a constant to [1, 1.2, 0.9, 1.1, 1, 10] gave 2.533 under MSE (the mean, dragged by the outlier) and 1.003 under MAE (the median); Huber additionally keeps a smooth gradient near zero and bounds it at δ beyond",
            "Cross-entropy on binned targets",
            "MSE with a larger learning rate"
          ],
          answer: 1,
          why: "MSE's gradient 2r is unbounded, so one outlier at residual 100 contributes a gradient of 200 and dominates the update; MSE estimates the mean, which the outlier moves. Huber clips the gradient at δ and MAE at 1, and both estimate something close to the median."
        },
        {
          stem: "Why did MSE applied to the softmax output train to only 53 % where cross-entropy reached 96 %?",
          options: [
            "MSE cannot be used for classification at all",
            "The gradient of MSE through a softmax carries a factor of p(1 − p), which is near zero when the softmax is confident — including confidently wrong — so the network learns almost nothing from its worst errors",
            "The learning rate was too high for MSE",
            "Softmax outputs cannot be compared with one-hot vectors"
          ],
          answer: 1,
          why: "Cross-entropy's gradient with respect to the logits is p − y, which is large for confident mistakes; MSE-on-softmax's gradient is (p − y)·p(1 − p), which vanishes for them. The same network with MSE on the raw logits reached 93.5 %, showing the softmax factor is the culprit."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Cross-entropy from logits, Huber's bounded gradient, and the imbalanced batch",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Implement cross-entropy from logits in NumPy using log-sum-exp, and its gradient pᵢ − 𝟙[i = y] divided by the batch size. Check the loss against torch on a random 3 × 4 logit matrix and the gradient against central finite differences." },
        { t: "p", text: "**(b)** Write the gradient of MSE, Huber (δ = 1) and MAE with respect to the prediction for residuals [−10, −2, −0.5, 0.3, 4, 100] and state which are bounded." },
        { t: "p", text: "**(c)** A batch has 990 negatives at p(positive) = 0.05 and 10 positives at p = 0.30. Compute the share of the total loss contributed by the negatives under cross-entropy, under focal loss with γ = 2, and under cross-entropy with a positive-class weight of 99." },
        { t: "p", text: "**(d)** For anchor [1, 0], positive [0.8, 0.3] and negative [0.6, 0.5], compute the triplet loss with margin 1 and check it with torch." }
      ],
      requirements: [
        "(a) the loss to four decimals and the maximum gradient discrepancy.",
        "(b) three gradient vectors and the boundedness statement.",
        "(c) three percentages.",
        "(d) one number matching torch."
      ],
      hint: "log-softmax is Z − max − log Σ exp(Z − max), row-wise; the CE gradient with mean reduction is (P − onehot) / B. Focal loss per example is −(1 − pₜ)^γ ln pₜ with pₜ the probability of the true label.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) CE = 1.5922   torch: 1.5922
#     max |analytic − numeric| gradient: 1.4e-11

# (b) residuals  [−10   −2   −0.5   0.3   4    100]
#     MSE  2r    [−20   −4   −1     0.6   8    200]     unbounded
#     Huber      [ −1   −1   −0.5   0.3   1      1]     bounded by δ = 1
#     MAE sign   [ −1   −1   −1     1     1      1]     bounded, constant magnitude

# (c) CE:             negatives 50.78 vs positives 12.04     -> negatives 81 % of the loss
#     focal γ=2:      negatives  0.13 vs positives  5.90     -> negatives  2 %
#     CE, weight 99:  negatives 50.78 vs positives 1191.93   -> negatives  4 %; ten examples now dominate

# (d) d_pos = 0.3606   d_neg = 0.6403   triplet = max(0, 0.3606 − 0.6403 + 1) = 0.7202   torch: 0.7202`,
        notes: [
          { t: "p", text: "(a) is the loss you will use most, written once so its stability trick and its gradient are not magic." },
          { t: "p", text: "(b) is why Huber exists: the quadratic region's gradient shrinks toward the optimum and the linear region's gradient cannot be hijacked by an outlier." },
          { t: "p", text: "(c) shows the two re-balancing strategies pulling in opposite directions; focal loss re-weights by difficulty and leaves the easy negatives at 2 % without making ten positives worth 1,192." }
        ]
      }
    }
  ],

  takeaways: [
    "The forward pass is X (B, D) → X@W₁ (B, H₁) → … → logits (B, K) → softmax rows summing to 1; track the shapes and the batch dimension takes care of itself. The worked example gave z₁ = [−0.1, 1.8], a₁ = [0, 1.8], z₂ = −0.52, ŷ = 0.3729.",
    "MSE, MAE and Huber on residuals [0.5, −2, 3] are 4.4167, 1.8333 and 1.3750; MSE's gradient 2r is unbounded (200 for a residual of 100), Huber's is clipped at δ, MAE's is ±1. MSE estimates the mean (2.533 with an outlier), MAE the median (1.003).",
    "BCE and CE are negative log-likelihoods: −ln 0.9 = 0.105, −ln 0.2 = 1.609; unbounded above, so confident mistakes are punished hard. The gradient of softmax-cross-entropy with respect to the logits is p − onehot, confirmed by autograd.",
    "Focal loss multiplies CE by (1 − pₜ)^γ: an example at p = 0.95 is down-weighted 400× and one at 0.05 barely; on a 990:10 batch the easy negatives fell from 81 % of the loss to 2 %, where a class weight of 99 swung to the other extreme.",
    "Cross-entropy H(P, Q) = H(P) + KL(P‖Q) (0.8869 = 0.8018 + 0.0851), so with soft targets minimising CE minimises KL; KL is not symmetric (0.0851 vs 0.0920).",
    "Loss and output layer are chosen together: MSE on a softmax output trained to 53 % where CE reached 96 %, because the p(1 − p) factor silences confident mistakes. Accuracy cannot be the loss — it is flat between 0.51 and 0.99 — but it is still the metric you select on."
  ],

  quiz: {
    title: "Forward Propagation and Loss Functions — Knowledge Check",
    questions: [
      {
        stem: "A batch X has shape (32, 100) and the first layer has 256 units. What are the shapes of W₁, b₁ and the pre-activation?",
        options: [
          "W₁ (256, 100), b₁ (256, 32), Z₁ (256, 32)",
          "W₁ (100, 256), b₁ (256,), Z₁ (32, 256) — the batch dimension is preserved and the bias broadcasts across it",
          "W₁ (32, 256), b₁ (32,), Z₁ (100, 256)",
          "W₁ (100, 256), b₁ (32, 256), Z₁ (256,)"
        ],
        answer: 1,
        why: "X @ W₁ requires W₁'s first dimension to equal D = 100, and its second dimension is the number of units. The bias has one entry per unit and is added to every row. PyTorch stores the weight transposed, (256, 100), but the product is the same."
      },
      {
        stem: "Why is cross-entropy computed from logits rather than from a softmax output?",
        options: [
          "Because softmax is expensive",
          "Because forming the probability first can underflow to exactly zero, whose log is −inf; computing log-softmax as z − max − log Σ exp(z − max) keeps every term finite, and the fused gradient p − y is also cleaner",
          "Because logits are already probabilities",
          "It makes no numerical difference"
        ],
        answer: 1,
        why: "The fused form uses the log-sum-exp trick and is exact; the two-step form fails on any confident prediction. nn.CrossEntropyLoss and BCEWithLogitsLoss exist for this reason, and lesson 1.2 showed the concrete overflow."
      },
      {
        stem: "Which statement about KL divergence and cross-entropy is correct?",
        options: [
          "They are the same quantity",
          "KL is symmetric and cross-entropy is not",
          "Cross-entropy H(P, Q) equals H(P) + KL(P‖Q); with a one-hot target H(P) = 0 and they coincide, and with soft targets they differ by a constant the model cannot change, so both have the same minimiser",
          "KL can be negative"
        ],
        answer: 2,
        why: "Executed: 0.8869 = 0.8018 + 0.0851. KL(P‖Q) = 0.0851 while KL(Q‖P) = 0.0920, so it is not symmetric; it is never negative (Gibbs' inequality). The identity is why distillation can use either loss."
      },
      {
        stem: "When does a triplet contribute zero loss, and why does that matter?",
        options: [
          "When the anchor and positive are identical",
          "When the negative is already at least the margin further from the anchor than the positive is — d(a,n) ≥ d(a,p) + m — which after a little training is most triplets, so hard-negative mining is what makes the loss useful",
          "Never; every triplet contributes",
          "When the margin is zero"
        ],
        answer: 1,
        why: "With d(a,p) = 0.36 and d(a,n) = 1.5 the loss max(0, 0.36 − 1.5 + 1) is zero; with the negative moved to distance 0.64 it is 0.72. Random triplets are mostly easy, and the gradient comes only from the violating ones."
      },
      {
        stem: "Focal loss with γ = 2 reduced the easy negatives' share of an imbalanced batch's loss from 81 % to 2 %. What distinguishes it from a class weight?",
        options: [
          "Nothing; they are equivalent",
          "Focal loss re-weights by difficulty — every confident correct prediction is down-weighted, whatever its class — while a class weight re-weights by label; the class weight of 99 made ten positives worth 1,192 against the negatives' 51",
          "Focal loss only applies to the positive class",
          "A class weight cannot be used with cross-entropy"
        ],
        answer: 1,
        why: "(1 − pₜ)^γ depends on the model's confidence, not the label; an easy positive is discounted exactly as an easy negative is. That is why RetinaNet could train a one-stage detector on 100,000 anchors of which a handful are positive."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Forward Propagation and Loss Functions",
    sub: "Shapes, the loss zoo on numbers, the p − y gradient, focal loss, and loss against metric.",
    questions: [
      {
        level: "Core",
        q: "Walk me through forward propagation for a batch.",
        strong: "A batch is a matrix X of shape (B, D). Each layer computes Z = A_prev @ W + b with W of shape (inputs, units) and b of shape (units,), which broadcasts over the batch, then A = f(Z) element-wise. The batch dimension rides along: a batch of 4 with 3 features through layers of 5, 2 and 3 units gives shapes (4, 5), (4, 2), (4, 3), and the final softmax makes each of the four rows sum to one. On numbers: x = [1, 2] through W₁ = [[0.5, −0.3], [0.1, 0.8]] with b₁ = [0, 0.1] gives z₁ = [−0.1, 1.8], ReLU gives a₁ = [0, 1.8], and W₂ = [0.7, −0.4] with b₂ = 0.2 gives z₂ = −0.52 and ŷ = σ(−0.52) = 0.3729. Two things worth saying: the same weights serve every row, so the weight gradient is a sum over the batch; and the first hidden unit is off for this input, so its weights get no gradient from this example.",
        answer: [
          { t: "p", text: "Shapes as the discipline, the executed worked example, and the two observations that set up backpropagation." }
        ]
      },
      {
        level: "Core",
        q: "Derive the gradient of softmax-cross-entropy with respect to the logits.",
        strong: "L = −ln pᵧ where pᵢ = exp zᵢ / Σⱼ exp zⱼ, so ln pᵧ = zᵧ − ln Σⱼ exp zⱼ. Differentiating with respect to zᵢ: the first term gives 𝟙[i = y], the second gives exp zᵢ / Σ exp zⱼ = pᵢ. Therefore ∂L/∂zᵢ = pᵢ − 𝟙[i = y]: the predicted distribution minus the one-hot target. I verified it — for logits [0.5, 0.5, 3] with true class 1, autograd gave [0.0705, −0.9295, 0.859], which is exactly softmax minus one-hot. The result explains why the pairing is universal: the gradient is the error itself, it never saturates, and it is largest exactly when the model is confidently wrong. Contrast MSE on a softmax output, whose gradient carries an extra p(1 − p) factor that vanishes for confident predictions — the same network trained to 53 % with that loss against 96 % with cross-entropy.",
        answer: [
          { t: "p", text: "The four-line derivation, the autograd confirmation, and the contrast with MSE-on-softmax as the reason the pairing matters." }
        ]
      },
      {
        level: "Core",
        q: "MSE, MAE or Huber — how do you choose?",
        strong: "By what the gradient does with a large residual and what the minimiser estimates. MSE's gradient is 2r: unbounded, so a residual of 100 contributes 200 and one outlier dominates the update; its minimiser is the mean, which an outlier moves — fitting a constant to five values near 1 and one at 10 gave 2.533. MAE's gradient is ±1: bounded, its minimiser is the median (1.003 on the same data), but it never shrinks near the optimum so convergence jitters and it is undefined at zero. Huber is quadratic within δ and linear beyond: gradient r inside, clipped to ±δ outside — on residuals [−10, −2, −0.5, 0.3, 4, 100] that is [−1, −1, −0.5, 0.3, 1, 1] — so it is smooth where MAE is not and bounded where MSE is not. MSE for Gaussian noise when you want the mean; Huber as the robust default; MAE when you want the median specifically.",
        answer: [
          { t: "p", text: "Gradient behaviour and estimand for each, with the executed constants and gradients." }
        ]
      },
      {
        level: "Advanced",
        q: "What is focal loss and when would you use it over class weights?",
        strong: "Focal loss multiplies each example's cross-entropy by (1 − pₜ)^γ, where pₜ is the probability the model assigned to the true label. Confident correct predictions are almost silenced — at pₜ = 0.95 with γ = 2 the factor is 0.0025 — and hard examples are left nearly untouched, 0.90 at pₜ = 0.05. On a batch of 990 easy negatives at p = 0.05 and 10 positives at p = 0.30, cross-entropy is 81 % easy negatives; focal loss with γ = 2 makes them 2 %. A class weight re-balances by label instead: weight 99 on the positives made ten examples worth 1,192 against the negatives' 51, which over-corrects and up-weights easy positives along with hard ones. Focal loss is the choice when the imbalance is between easy and hard rather than merely between labels — dense object detection, where most anchors are trivially background, is the canonical case and RetinaNet's reason for existing.",
        answer: [
          { t: "p", text: "The definition, the executed factors and batch shares, and the difficulty-versus-label distinction with the detection example." }
        ]
      },
      {
        level: "Advanced",
        q: "Why can't you train on the metric directly?",
        strong: "Because most metrics have no useful gradient. Accuracy is piecewise constant: moving the probability of the correct class from 0.51 to 0.99 changes it not at all, and 0.51 to 0.49 flips it, so its gradient is zero almost everywhere and undefined at the boundary. Cross-entropy sees both moves — 0.673 → 0.010 and 0.673 → 0.713 — and is a smooth upper bound on the 0–1 loss, so minimising it tends to raise accuracy without being accuracy. The same holds for F1, mAP and WER. The discipline is: differentiate a surrogate that is aligned with the metric, and select, stop and report on the metric itself, on validation data. Where alignment is poor — a ranking metric, say — you change the surrogate (pairwise or listwise losses) rather than pretend the metric is differentiable.",
        answer: [
          { t: "p", text: "The flatness argument with the executed numbers, the surrogate principle, and the select-on-metric discipline." }
        ]
      }
    ]
  }
});

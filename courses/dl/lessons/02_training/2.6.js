/* ============================================================================
   LESSON 2.6 — Neural ODEs and the Theory Corner
   ========================================================================= */
EC.receiveLesson({
  id: "2.6",

  lede: "**A residual block is one Euler step of a differential equation, and once you see that, a network with continuous depth is a solver choice away.** A Neural ODE with 392 parameters classified two spirals at 98.6 % where a ten-block ResNet with 3,226 reached 96.4 % — using a fourth-order solver whose error falls 10⁴-fold when the steps rise 10-fold. The rest of this lesson is the phenomena that a good practitioner should be able to reproduce rather than recite: double descent (test error 174 at the interpolation threshold, 0.6 beyond it), grokking (100 % training accuracy at step 300, test accuracy still climbing at step 30,000), the lottery ticket (a 95 %-sparse subnetwork at 0.957 with its original initialisation, 0.892 with a random mask), the NTK (kernel change 0.98 at width 16, 0.015 at width 16,384), the implicit bias of gradient descent (cosine 0.99999 to the max-margin direction), flat minima, a scaling law (loss ∝ n⁻⁰·⁴⁸) and calibration (ECE 0.031 → 0.006 with one fitted number).",

  objectives: [
    "Derive the residual block as an Euler step, implement RK4, train a Neural ODE and read its solver-step trade-off",
    "Reproduce double descent with random features and explain the interpolation threshold and the minimum-norm solution",
    "Run a grokking experiment and describe delayed generalisation under weight decay",
    "Reproduce the lottery-ticket result at two sparsities and separate the roles of mask and initialisation",
    "Measure the NTK's change with width, the implicit bias toward max margin, sharpness against batch size, a data scaling law, and temperature scaling for calibration"
  ],

  prerequisites: ["2.3", "1.7", "1.3"],

  blocks: [

    { t: "h2", n: "01", text: "The residual block is an Euler step", id: "euler" },

    { t: "p", text: "A ResNet block computes h ← h + f(h). Write it as h(t + Δt) = h(t) + Δt·f(h(t)) with Δt = 1 and it is Euler's method for the ordinary differential equation dh/dt = f(h). Ten blocks are ten steps; the depth of the network is the length of the integration. Chen et al. (2018) took the observation literally: define the network as dh/dt = f(h, t; θ), integrate it with any ODE solver from t = 0 to t = 1, and put the classifier on h(1). The parameters θ are shared across all of 'depth', the number of function evaluations is a solver setting, and the memory does not grow with depth." },

    { t: "code", lang: "python", title: "RK4 and the Neural ODE",
      code: `class Field(nn.Module):                     # dh/dt = f(h, t)
    def __init__(self, d=2, h=64):  super().__init__(); self.net = nn.Sequential(nn.Linear(d + 1, h), nn.Tanh(), nn.Linear(h, d))
    def forward(self, t, h):        return self.net(torch.cat([h, torch.full_like(h[:, :1], t)], 1))

def rk4(f, h, t0=0.0, t1=1.0, steps=10):         # fourth-order Runge–Kutta; Euler is k1 alone
    dt = (t1 - t0) / steps; t = t0
    for _ in range(steps):
        k1 = f(t, h); k2 = f(t + dt/2, h + dt/2*k1); k3 = f(t + dt/2, h + dt/2*k2); k4 = f(t + dt, h + dt*k3)
        h = h + dt/6 * (k1 + 2*k2 + 2*k3 + k4); t += dt
    return h

class NODE(nn.Module):
    def forward(self, x, steps=10):  return self.head(rk4(self.f, x, steps=steps))     # backprop through the solver`,
      caption: "Backpropagating through the solver's operations is the simplest training method and what is used here; the original paper's adjoint method integrates a second ODE backward in time to get the gradient in constant memory. torchdiffeq is not installed in this environment, so the solver is written out — twelve lines." },

    { t: "code", lang: "text", title: "Two spirals, 1,000 train / 1,000 test, full-batch Adam, 300 steps (executed)",
      code: `ResNet, 10 blocks h + 0.1·f(h)        params 3,226   test acc 0.964   3.1 s
Neural ODE, Euler, 10 steps           params   392   test acc 0.932   2.3 s
Neural ODE, RK4,   10 steps           params   392   test acc 0.986   9.5 s
Neural ODE, RK4,    4 steps           params   392   test acc 0.902   4.2 s

solver accuracy on dh/dt = −h (exercise): error at t = 1 with 1 / 10 / 100 steps
  Euler  3.7e-01 / 1.9e-02 / 1.9e-03       first order:  error ∝ 1/steps
  RK4    7.1e-03 / 3.3e-07 / 3.1e-11       fourth order: error ∝ 1/steps⁴

a second RK4-10 model (different initialisation; 0.884 at its training setting) evaluated with other step counts at test time:
  1 step 0.53   2 steps 0.72   4 steps 0.83   10 steps 0.88   40 steps 0.88      -- fewer steps degrade, more do not help
one test point's trajectory h(t):  t=0 (−0.05, 0.96)  →  t=0.5 (1.57, 0.22)  →  t=1 (−1.41, −1.38)`,
      caption: "The ODE with RK4 beats the ResNet with an eighth of the parameters because the same vector field is applied forty times (four evaluations × ten steps) — depth without parameters. Euler with the same field is worse than the ResNet; the solver matters as much as the model. The step-count sweep is the property ResNets do not have: accuracy can be traded for compute at inference without retraining." },

    { t: "dl", items: [
      ["Where Neural ODEs are used", "Continuous-time models of irregularly sampled series (latent ODEs), normalising flows with a continuous change of variables (FFJORD, 6.4), physics-informed models. For plain classification a ResNet is faster to train and as accurate; the spirals are a demonstration, not a recommendation."],
      ["Adjoint method", "Solve dλ/dt = −λᵀ ∂f/∂h backward from t = 1 to get ∂L/∂h(0) and ∂L/∂θ without storing the forward trajectory. O(1) memory in depth; slower and less accurate than backprop through the solver. Not run here."],
      ["Adaptive solvers", "Dormand–Prince and friends choose the step size from a local error estimate; the number of function evaluations then grows during training as the field becomes harder to integrate — a known cost of the approach, and the reason for regularisers that keep the dynamics simple."]
    ] },

    { t: "h2", n: "02", text: "Double descent", id: "dd" },

    { t: "p", text: "Classical learning theory says test error is U-shaped in model capacity. Modern practice trains models with far more parameters than examples and they generalise. Both are right, and the reconciliation is double descent: the U-shape up to the point where the model can just fit the training data exactly — the interpolation threshold — a peak there, and a second descent beyond it. Random-feature regression shows it exactly: n = 100 training points, N random ReLU features, least squares (minimum-norm when N > n):" },

    { t: "code", lang: "text", title: "Ridgeless regression on N random features, n = 100 (executed)",
      code: `N      train mse    test mse    ‖coef‖
  10     17.06        19.08        6.1
  30      5.17         8.68        9.0
  60      1.31         8.41        9.9
  90      0.12        26.74       18.1        -- approaching the threshold: the fit strains
 100      0.00       173.66       45.2        -- N = n: exact interpolation, the peak
 110      0.00        39.94       22.6
 150      0.00         4.47        7.1
 300      0.00         1.18        3.1
1000      0.00         0.67        1.4        -- far past the threshold: the second descent
2000      0.00         0.60        1.0

with ridge λ = 1 (exercise):  N=90 4.62   N=100 4.45   N=110 3.78   N=300 1.08   N=1000 0.67    -- no peak`,
      caption: "At N = n there is exactly one interpolating solution and it must contort itself to hit every noisy point: the coefficient norm is 45 and the test error 174. Past N = n there are infinitely many interpolating solutions and least squares picks the minimum-norm one, which is smooth; the norm falls to 1 and the test error to 0.6. The peak is a property of *interpolating with no regularisation at the threshold*: a small ridge penalty removes it entirely." },

    { t: "h2", n: "03", text: "Grokking", id: "grokking" },

    { t: "code", lang: "text", title: "(a + b) mod 23, half the 529 pairs for training, MLP 46-256-23, AdamW wd 1.0, full batch (executed)",
      code: `step      100     300    1,000   2,000   5,000   8,000   12,000   20,000   30,000
train    0.777   1.000   1.000   1.000   1.000   1.000   1.000    1.000    1.000
test     0.000   0.000   0.000   0.000   0.000   0.023   0.098    0.449    0.740

first step with training accuracy > 99 %: 300;   test accuracy > 99 %: not reached in 30,000 steps (61 s)`,
      caption: "The network memorises the training pairs by step 300 and generalises to none of the held-out pairs for five thousand steps — then, with the training loss long since near zero, test accuracy begins to climb and reaches 74 % at step 30,000, still rising. Power et al. (2022) named this grokking. The driver is the weight decay: with the training loss flat, decay keeps shrinking the weights, and the memorising solution is gradually replaced by a lower-norm one that implements the actual modular structure. Without decay the transition does not happen." },

    { t: "h2", n: "04", text: "The lottery ticket", id: "lottery" },

    { t: "p", text: "Frankle & Carbin (2019): a dense network contains a sparse subnetwork that, trained in isolation *from the original initialisation*, matches the dense network. Find it by training, pruning the smallest-magnitude weights, rewinding the survivors to their initial values, and retraining. The control experiments separate the mask from the initialisation:" },

    { t: "code", lang: "text", title: "64-256-256-10 on the digits, magnitude pruning, 3 seeds (executed)",
      code: `sparsity 80 %:   dense 0.980   winning ticket (mask + original init) 0.977   same mask, new init 0.973   random mask, original init 0.965
sparsity 95 %:   dense 0.980   winning ticket (mask + original init) 0.957   same mask, new init 0.934   random mask, original init 0.892`,
      caption: "At 95 % sparsity — one weight in twenty — the ticket keeps 0.957. Re-initialising the same mask costs two points and a random mask costs six: both the *which weights* and the *what values they started at* matter, which is the paper's claim. Pruning (11.1) uses the mask; the initialisation dependence is why 'train sparse from scratch' rarely works and why the hypothesis is stated the way it is." },

    { t: "h2", n: "05", text: "The neural tangent kernel", id: "ntk" },

    { t: "p", text: "Linearise the network in its parameters around initialisation: f(x; θ) ≈ f(x; θ₀) + ∇θf(x; θ₀)·(θ − θ₀). Gradient descent on that linear model is kernel regression with the kernel K(x, x′) = ∇θf(x)·∇θf(x′) — the neural tangent kernel (Jacot et al., 2018). The claim is that as width → ∞ under the right parameterisation, the network *stays* in that linear regime: its weights barely move and the kernel does not change during training. Measured:" },

    { t: "code", lang: "text", title: "Relative change of the empirical NTK (20 points) and of the weight vector after 300 SGD steps, NTK parameterisation (executed)",
      code: `width       16      64      256     1,024    4,096    16,384
NTK change  0.977   1.312   0.322   0.118    0.050    0.015
weights     0.232   0.106   0.053   0.027    0.014    0.009      -- halving with every 4× width: ∝ 1/√width
train loss  →0.33   →0.29   →0.28   →0.23    →0.23    →0.22`,
      caption: "At width 16 the kernel changes completely during training — the network is learning features. At width 16,384 it changes by 1.5 % and the weights by under 1 %: the network is the linear model, and its training is kernel regression. The theory explains why very wide networks train predictably and converge; its limitation is the other reading of the table — real networks are the left-hand columns, where the kernel moves, and that movement (feature learning) is what makes them better than kernels." },

    { t: "h2", n: "06", text: "Implicit bias, flat minima, the information bottleneck", id: "bias" },

    { t: "code", lang: "text", title: "Gradient descent on the logistic loss, separable 2-D data, against the max-margin direction from an SVM (executed)",
      code: `step       cosine(w/‖w‖, w_svm)   ‖w‖     loss
   10        0.99827               2.06    2.3e-01
  100        0.99998               5.39    6.6e-02
1,000        1.00000              11.29    1.6e-02
10,000       0.99999              20.63    2.5e-03
100,000      0.99999              32.37    3.1e-04`,
      caption: "The loss never reaches zero and the weight norm grows like log t, but the *direction* converges to the maximum-margin separator within a hundred steps (Soudry et al., 2018). Nothing in the loss asked for a margin. This is the implicit bias of gradient descent: among the infinitely many separators it finds the one an SVM would, which is part of why over-parameterised networks generalise." },

    { t: "code", lang: "text", title: "Sharpness: training loss and its rise under random weight perturbations (relative scale 0.05), by batch size (executed)",
      code: `batch   8:   train loss 0.0004   rise 0.0000   test acc 0.978
batch  64:   train loss 0.0117   rise 0.0003   test acc 0.980
batch 512:   train loss 0.0953   rise 0.0004   test acc 0.972`,
      caption: "The flat-minima hypothesis (Keskar et al., 2017) says small batches find wider minima that generalise better. The ordering here agrees — the batch-8 solution barely moves under perturbation and batch-512's moves most — but the effect is tiny, and the batch-512 run also has a higher training loss because it made fewer updates (1.5), which confounds the comparison. Honest reading: consistent with the hypothesis, not evidence for it; the strong versions of the claim have been contested (Dinh et al., 2017: sharpness is not reparameterisation-invariant)." },

    { t: "dl", items: [
      ["Information bottleneck (Tishby)", "The claim: layers first fit (mutual information with the label rises) then compress (mutual information with the input falls), and compression is why they generalise. Measuring mutual information in continuous networks is the hard part, and Saxe et al. (2018) showed the compression phase depends on the activation (present with tanh, absent with ReLU). Not measured here; a hypothesis with disputed evidence rather than a result."],
      ["Depth vs width (Practice 01 §38, 49, 69)", "Depth buys compositional efficiency (1.1) and optimisation difficulty (1.6, 1.8); width buys optimisation reliability (1.1's XOR seeds) and, in the limit, the NTK regime. Modern networks are deep because of residual connections and normalisation, which removed the optimisation penalty."],
      ["Effect of initialisation scale (Practice 10 §47)", "Large initial weights push a wide network toward the lazy (NTK) regime — the linearisation holds because the weights need not move far relative to their size; small initial weights force feature learning. The scale is a dial between the two regimes, not merely a stability setting."]
    ] },

    { t: "h2", n: "07", text: "Scaling laws and calibration", id: "scaling" },

    { t: "code", lang: "text", title: "Test cross-entropy against training-set size, 784-256-256-10, 6,000 Adam steps each (executed)",
      code: `n       500     2,000    8,000    32,000   60,000
loss    0.714   0.354    0.187    0.092    0.071
power-law fit:  test loss ∝ n^(−0.48)`,
      caption: "Loss falls as a power of the data size, straight on a log-log plot, with an exponent near −0.5. Kaplan et al. (2020) found the same form for language models in data, parameters and compute, with exponents that let you predict the loss of a run you have not done. The exponent is task- and architecture-specific; the straightness is what is general, and it is why 'more data' is a quantitative plan rather than a hope." },

    { t: "code", lang: "text", title: "Calibration and temperature scaling (executed)",
      code: `784-256-10 trained 40 epochs on 5,000 MNIST images (over-fitting on purpose):
  test accuracy 0.9463   mean confidence 0.977   ECE 0.0305        -- over-confident by three points

temperature scaling: fit one scalar T by minimising the NLL of the logits / T on 5,000 held-out images
  T = 2.06 (L-BFGS)   or   T = 2.05 (grid search, exercise)
  test ECE after 0.0059 / 0.0055   mean confidence 0.942   accuracy unchanged (argmax is invariant to T)`,
      caption: "Accuracy and calibration are different properties: a model can be right 95 % of the time and claim 98 % confidence. Temperature scaling (Guo et al., 2017) fixes the second with one parameter fitted after training, without touching the first — the opposite of label smoothing (2.5), which changes both during training. Expected calibration error is the confidence-weighted gap between confidence and accuracy over bins." },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why did the Neural ODE with RK4 (392 parameters) beat the ten-block ResNet (3,226 parameters), while the same ODE with Euler lost to it?",
          options: [
            "Fewer parameters always generalise better",
            "The ODE applies one shared vector field forty times (four evaluations per RK4 step), so it has depth without extra parameters, and RK4's fourth-order accuracy integrates that field faithfully; Euler with ten steps is a crude integration of the same field, and the discretisation error, not the model, cost the accuracy",
            "The ResNet was under-trained",
            "RK4 uses more parameters than reported"
          ],
          answer: 1,
          why: "The exercise measured the solvers on a known equation: Euler's error 1.9 × 10⁻² at ten steps against RK4's 3.3 × 10⁻⁷. The step-count sweep shows the same thing at test time — fewer steps degrade accuracy and more do not help once the integration is accurate."
        },
        {
          stem: "Random-feature regression had test error 174 at N = 100 features for 100 points and 0.6 at N = 2,000. What happens at N = n, and why does adding features fix it?",
          options: [
            "The model underfits at N = n",
            "At N = n there is exactly one interpolating solution and it must fit every noisy point (coefficient norm 45); beyond N = n there are infinitely many, least squares returns the minimum-norm one, which is smooth (norm 1.0), and the test error descends again",
            "Numerical error in the solver",
            "The features become linearly dependent"
          ],
          answer: 1,
          why: "Double descent is a statement about interpolation at the threshold without regularisation; ridge λ = 1 removed the peak entirely (4.45 at N = 100). Over-parameterisation generalises because the training procedure's implicit choice among interpolators is a low-norm one."
        },
        {
          stem: "In the lottery-ticket experiment at 95 % sparsity, the mask with its original initialisation scored 0.957, the mask with a new initialisation 0.934, and a random mask 0.892. What does each comparison establish?",
          options: [
            "That sparsity is harmless",
            "Mask vs random mask: which weights survive matters (+6.5 points); original vs new initialisation on the same mask: the starting values matter too (+2.3 points) — the ticket is the pair, which is the hypothesis's claim and why sparse-from-scratch training with a random start underperforms",
            "That pruning improves accuracy",
            "That the dense network was over-parameterised by 20×"
          ],
          answer: 1,
          why: "Two controls isolate two factors. Pruning methods (11.1) exploit the first; the initialisation dependence is the part that was surprising and that motivates rewinding to early weights rather than re-initialising."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "Solver order, ridge against the peak, and one fitted temperature",
      difficulty: "advanced",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Implement Euler and RK4 for dh/dt = −h from h(0) = 1 to t = 1 and report the absolute error against e⁻¹ at 1, 2, 4, 10 and 100 steps. State the order of each method from the numbers. Explain in one sentence how a ResNet block with h + 0.1·f(h) maps onto Euler." },
        { t: "p", text: "**(b)** Repeat the random-feature regression at N = 60, 90, 100, 110, 150, 300, 1,000 with ridge λ = 1 alongside the ridgeless solution, and report both test errors." },
        { t: "p", text: "**(c)** Train 784-256-10 on 5,000 MNIST images for 40 epochs, save the logits on 5,000 held-out training images and on the test set, grid-search the temperature T ∈ [0.5, 4] that minimises held-out NLL, and report test ECE, mean confidence and accuracy at T = 1 and at the fitted T." }
      ],
      requirements: [
        "(a) a 5 × 2 table of errors and two orders.",
        "(b) a 7 × 2 table.",
        "(c) T and six numbers."
      ],
      hint: "(a) The order is the power p with error ∝ 1/stepsᵖ: read it from consecutive rows. (c) Use 15 bins for ECE; the argmax of logits/T equals the argmax of logits for any T > 0.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) steps      1         2         4         10        100
#     euler     3.7e-01   1.2e-01   5.2e-02   1.9e-02   1.9e-03      ∝ 1/steps    (first order)
#     rk4       7.1e-03   2.9e-04   1.5e-05   3.3e-07   3.1e-11      ∝ 1/steps⁴   (fourth order)
#     a block h + 0.1·f(h) is one Euler step of dh/dt = f with Δt = 0.1; ten such blocks integrate t from 0 to 1

# (b) N        60      90      100      110     150     300     1000
#     ridgeless 8.41   26.74   173.66   39.94   4.47    1.18    0.67
#     ridge λ=1 5.60    4.62     4.45    3.78   2.25    1.08    0.67        -- the peak is gone; the two agree far past the threshold

# (c) validation NLL at T=1 0.2689;  best T 2.05 with NLL 0.1915
#     test ECE 0.0305 -> 0.0055;  mean confidence 0.977 -> 0.942;  accuracy 0.9463, unchanged`,
        notes: [
          { t: "p", text: "(a) is the reason the RK4 ODE beat the ResNet: the same field, integrated four orders of magnitude more accurately." },
          { t: "p", text: "(b) says double descent is a fact about unregularised interpolation, not about over-parameterised models as such." },
          { t: "p", text: "(c) is the single cheapest improvement you can make to a classifier that will be thresholded: one number, fitted after training, that makes the probabilities mean what they say." }
        ]
      }
    }
  ],

  takeaways: [
    "A residual block h + Δt·f(h) is an Euler step; a Neural ODE integrates dh/dt = f(h, t; θ) with any solver. With RK4 (error ∝ 1/steps⁴) a 392-parameter ODE reached 0.986 on two spirals against 0.964 for a 3,226-parameter ResNet; with Euler it reached 0.932. Steps can be traded for accuracy at test time without retraining.",
    "Double descent: random-feature regression with n = 100 had test error 174 at N = 100 (one interpolator, coefficient norm 45) and 0.6 at N = 2,000 (minimum-norm interpolator, norm 1.0); ridge λ = 1 removed the peak.",
    "Grokking: modular addition memorised by step 300, zero test accuracy until step 5,000, then a climb to 74 % by step 30,000 under weight decay 1.0 — generalisation long after fitting.",
    "The lottery ticket at 95 % sparsity: mask + original init 0.957, same mask re-initialised 0.934, random mask 0.892 — both the mask and the starting values matter.",
    "NTK: the kernel changed by 98 % during training at width 16 and 1.5 % at width 16,384, with the weight change falling as 1/√width — wide networks are kernel machines, real networks learn features. Gradient descent on separable data converged in direction to the max-margin separator (cosine 0.99999) with no margin term in the loss.",
    "Test loss fell as n⁻⁰·⁴⁸ from 500 to 60,000 examples — a straight line on log-log axes; an over-fitted classifier's ECE fell from 0.031 to 0.006 with a single fitted temperature (T = 2.06) and no change in accuracy. Sharpness ordered with batch size as the flat-minima hypothesis predicts but by amounts too small to call evidence."
  ],

  quiz: {
    title: "Neural ODEs and the Theory Corner — Knowledge Check",
    questions: [
      {
        stem: "What does the adjoint method give a Neural ODE, and what does it cost?",
        options: [
          "Faster training with the same memory",
          "Constant memory in depth: instead of storing the forward trajectory for backpropagation through the solver, it integrates a second ODE for the adjoint λ = ∂L/∂h backward in time; the costs are a second solve, some accuracy, and sensitivity to the solver's tolerance",
          "Higher accuracy than backpropagation",
          "It replaces the solver"
        ],
        answer: 1,
        why: "Backprop through the solver (used here) stores every intermediate state, so memory grows with the number of function evaluations; the adjoint trades that for a backward integration. Neither changes what the model computes."
      },
      {
        stem: "Which statement about grokking is supported by the experiment?",
        options: [
          "Test accuracy rises together with training accuracy",
          "Training accuracy reached 100 % by step 300 while test accuracy stayed at zero until about step 5,000 and then climbed to 74 % by step 30,000 with weight decay 1.0 — generalisation arrived thousands of steps after fitting, driven by decay replacing the memorising solution with a lower-norm one",
          "Grokking requires a transformer",
          "The transition completed within 1,000 steps"
        ],
        answer: 1,
        why: "The delayed rise is the phenomenon; 30,000 steps was not enough to finish it, which is reported as such. The mechanism — decay shrinking a memorising solution until a structured one wins — is the current understanding and is consistent with the run."
      },
      {
        stem: "Why does gradient descent on the logistic loss for separable data converge to the max-margin direction although the loss has no margin term?",
        options: [
          "Because the logistic loss is the hinge loss",
          "Because the loss can only be driven toward zero by growing ‖w‖, and the direction that keeps every example's margin largest is the one whose loss decreases slowest to zero last — the max-margin direction dominates asymptotically; measured cosine 0.99998 by step 100 with ‖w‖ growing like log t",
          "Because the data are 2-D",
          "Because the learning rate was 1.0"
        ],
        answer: 1,
        why: "Soudry et al.'s result: the exponential tail of the loss makes the smallest-margin examples dominate the gradient, which pushes the direction toward the SVM solution. It is one concrete instance of the implicit bias that lets over-parameterised models generalise."
      },
      {
        stem: "What is the difference between accuracy and calibration, and what does temperature scaling change?",
        options: [
          "They are the same; temperature scaling improves both",
          "Accuracy is how often the argmax is right; calibration is whether a stated confidence matches the empirical accuracy at that confidence. Temperature scaling divides the logits by one fitted scalar, which leaves every argmax unchanged (accuracy 0.9463 before and after) and moved ECE from 0.031 to 0.006",
          "Temperature scaling improves accuracy by rescaling the logits",
          "Calibration is only defined for binary classifiers"
        ],
        answer: 1,
        why: "A thresholded decision depends on the probabilities meaning what they say; an over-fitted network claims 97.7 % confidence at 94.6 % accuracy. One parameter fitted on held-out data after training fixes that without retraining — the cheapest post-processing step in deployment."
      },
      {
        stem: "A test loss that falls as n⁻⁰·⁴⁸ with data — why does the straightness on log-log axes matter more than the exponent?",
        options: [
          "Because the exponent is always 0.5",
          "Because a straight line can be extrapolated: a scaling law lets you predict the loss of a run at 10× the data or compute before paying for it, which turns 'get more data' into a quantitative plan; the exponent itself is task- and architecture-specific",
          "Because the exponent cannot be measured",
          "It does not; only the exponent matters"
        ],
        answer: 1,
        why: "Kaplan et al.'s laws are used to allocate compute between model size and data size, and to decide whether a larger run is worth it. The measured exponent here is one MLP on MNIST; the form is what transfers."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Neural ODEs and the Theory Corner",
    sub: "The Euler-step view, double descent, grokking, lottery tickets, the NTK, implicit bias, and calibration.",
    questions: [
      {
        level: "Advanced",
        q: "Explain Neural ODEs and how they relate to ResNets.",
        strong: "A residual block computes h + f(h), which is one Euler step with Δt = 1 of the differential equation dh/dt = f(h); ten blocks with h + 0.1·f(h) integrate that equation from t = 0 to 1 in steps of 0.1. A Neural ODE makes the equation the model: dh/dt = f(h, t; θ) with one shared parameter set, integrated by a solver of your choice, with the classifier on h(1). Depth becomes a solver setting, memory does not grow with it, and the trajectory is continuous. I trained one on two spirals: with a fourth-order RK4 solver at ten steps — forty evaluations of a 392-parameter field — it reached 98.6 %, against 96.4 % for a ten-block ResNet with 3,226 parameters; with Euler at ten steps the same field reached only 93.2 %, because Euler's error falls as 1/steps and RK4's as 1/steps⁴ (measured on dh/dt = −h: 1.9 × 10⁻² against 3.3 × 10⁻⁷ at ten steps). At test time the step count can be changed without retraining — fewer steps degrade, more do not help. Training here is backprop through the solver; the adjoint method gets constant memory by integrating the gradient backward in time. They matter for irregular time series and continuous flows; for plain classification a ResNet is the practical choice.",
        answer: [
          { t: "p", text: "The Euler correspondence, the model, the executed comparison with the solver-order explanation, the test-time property, and the honest scope." }
        ]
      },
      {
        level: "Advanced",
        q: "What is double descent, and does it contradict the bias–variance trade-off?",
        strong: "It extends it. The classical U-shape holds as capacity grows toward the point where the model can exactly fit the training data; at that interpolation threshold the test error peaks, and beyond it — where there are many interpolating solutions — the error descends again. I reproduced it with ridgeless regression on N random ReLU features for n = 100 points: test error 8 at N = 60, 27 at N = 90, 174 at N = 100 and 0.6 at N = 2,000. At N = n there is exactly one interpolator and it contorts to hit every noisy point (coefficient norm 45); past N = n least squares returns the minimum-norm interpolator, which is smooth (norm 1.0). The peak is a fact about unregularised interpolation at the threshold — ridge λ = 1 removed it, giving 4.45 at N = 100 — so the trade-off is not wrong, it simply did not describe the regime we now train in, where the implicit norm preference of the optimiser controls variance. The practical consequence is that a model that is 'too big' is often safer than one that is 'just big enough', and that the danger zone is the threshold.",
        answer: [
          { t: "p", text: "The three regimes with the executed numbers, the minimum-norm mechanism, the ridge control, and the practical reading." }
        ]
      },
      {
        level: "Advanced",
        q: "What does the neural tangent kernel tell us, and what does it miss?",
        strong: "Linearise the network in its parameters around initialisation; gradient descent on that linear model is kernel regression with the tangent kernel K(x, x′) = ∇θf(x)·∇θf(x′). The theorem is that as width goes to infinity, under the NTK parameterisation, the network stays in that linear regime — the weights move by O(1/√width) and the kernel is constant — so training is a convex kernel problem that provably converges. I measured it: after 300 SGD steps the empirical kernel on twenty points changed by 98 % at width 16, 32 % at 256, 5 % at 4,096 and 1.5 % at 16,384, with the relative weight change halving for every fourfold width, as 1/√width predicts. What it misses is the left of that table. Real networks are the narrow columns, where the kernel moves substantially — that movement is feature learning, and it is why finite networks beat their own tangent kernels on every serious benchmark. The NTK explains why wide networks train stably and gives a tractable model of generalisation; it does not explain why depth and representation matter, and the initialisation scale is the dial between the lazy regime it describes and the feature-learning regime it does not.",
        answer: [
          { t: "p", text: "The linearisation and the theorem, the executed width sweep, and the limitation stated from the same table." }
        ]
      },
      {
        level: "Core",
        q: "How would you check whether a classifier's probabilities are trustworthy, and fix them if not?",
        strong: "Compare confidence with accuracy. Bin the test predictions by confidence, compute the accuracy in each bin, and sum the confidence-weighted gaps — the expected calibration error. A network over-fitted on 5,000 MNIST images had accuracy 0.946 and mean confidence 0.977, ECE 0.031: over-confident by three points. The fix is temperature scaling: divide the logits by one scalar T fitted to minimise the negative log-likelihood on held-out data, which leaves every argmax — and so the accuracy — unchanged and rescales the confidences; T came out at 2.06 and ECE fell to 0.006. It is fitted after training, costs one parameter, and should be standard for any model whose probabilities feed a threshold or a downstream decision. Label smoothing changes calibration during training and can push a model under-confident (2.5), so I would measure ECE in either case rather than assume.",
        answer: [
          { t: "p", text: "ECE as the measurement, the executed over-confidence, temperature scaling with its numbers and its invariance, and the contrast with smoothing." }
        ]
      }
    ]
  }
});

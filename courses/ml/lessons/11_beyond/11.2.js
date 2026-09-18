/* ============================================================================
   LESSON 11.2 — Bayesian Machine Learning and Gaussian Processes
   ========================================================================= */
EC.receiveLesson({
  id: "11.2",

  lede: "**A frequentist estimate is a number; a Bayesian estimate is a distribution, and everything in this lesson follows from carrying the distribution instead of the number.** On a coin that shows three heads in four tosses, the maximum-likelihood estimate is 0.75, the posterior mode under a Beta(2, 2) prior is 0.667, the posterior mean 0.625 with a 95 % interval from 0.29 to 0.90 — and at 4,000 tosses all three agree to three decimals, because the prior washes out at 1/n. Bayesian linear regression is worked in closed form on five points, its mean shown to equal ridge regression with λ = σ²/τ² exactly, and its predictive standard deviation shown to grow from 1.09 at the centre of the data to 3.31 ten units away. A Gaussian process posterior is computed by hand from a 3 × 3 kernel matrix and matches scikit-learn to four decimals; a periodic kernel learns the store's weekly pattern where an RBF kernel cannot, and still loses to the seasonal naive. Metropolis sampling recovers the coin posterior's mean to 0.005; expected improvement finds a 1-D maximum in 15 evaluations on every one of 20 seeds where random search manages it on two; and Thompson sampling cuts a bandit's regret from 117 to 27.",

  objectives: [
    "Contrast Bayesian and frequentist estimation and compute MLE, MAP and posterior mean on a conjugate model",
    "Derive the Bayesian linear regression posterior and predictive, and identify MAP with ridge regression",
    "Compute a Gaussian process posterior by hand, choose kernels for structure, and read the posterior variance",
    "Explain MCMC, the Laplace approximation and variational inference as ways of approximating a posterior without a closed form",
    "Apply Bayesian optimisation's acquisition functions and Thompson sampling, and state when they beat their alternatives"
  ],

  prerequisites: ["4.1", "4.3", "8.1"],

  blocks: [

    { t: "h2", n: "01", text: "Bayes against frequentist: MLE, MAP and the posterior", id: "map" },

    { t: "p", text: "A frequentist treats the parameter as fixed and the data as random, and reports the parameter value that makes the data most likely — the maximum-likelihood estimate — with a confidence interval about the procedure. A Bayesian treats the parameter as uncertain, encodes what was believed before the data in a prior p(θ), and updates it by Bayes' rule to a posterior p(θ | data) ∝ p(data | θ) p(θ). The posterior mode is the MAP estimate — the MLE with a prior — and the posterior mean, spread and intervals are all read from the same distribution. When the prior and likelihood are conjugate the posterior has a closed form; a Beta prior on a coin's probability is the classic case." },

    { t: "code", lang: "text", title: "Three heads in four tosses, prior Beta(2, 2) (executed)",
      code: `MLE            θ̂ = h/n                     = 3/4                = 0.7500
MAP            (h + a − 1) / (n + a + b − 2)  = (3 + 1) / (4 + 2)  = 0.6667
posterior      Beta(h + a, n − h + b)         = Beta(5, 3):   mean (h + a)/(n + a + b) = 5/8 = 0.6250,   95 % interval [0.290, 0.901]

the same 75 % head rate at larger n:
   n =    4:  MLE 0.7500   MAP 0.6667   mean 0.6250   sd 0.1614
   n =   40:  MLE 0.7500   MAP 0.7381   mean 0.7273   sd 0.0664
   n =  400:  MLE 0.7500   MAP 0.7488   mean 0.7475   sd 0.0216
   n = 4000:  MLE 0.7500   MAP 0.7499   mean 0.7498   sd 0.0068       -- the prior washes out as 1/n

a stronger prior, Beta(20, 20), on the same 3 of 4:  MAP 0.5238, mean 0.5227 -- the data are 4 tosses and the prior is worth 40`,
      caption: "The prior's parameters are pseudo-counts: Beta(a, b) is 'a − 1 heads and b − 1 tails seen before'. That is why MAP pulls the MLE toward the prior mean by an amount that shrinks with n, why a strong prior on little data reports the prior, and why the interval — which the MLE alone does not give — is the honest summary of four tosses. 4.3's ridge and lasso are exactly this: L2 is a Gaussian prior on the weights, L1 a Laplace prior, and the penalty is −log p(w)." },

    { t: "h2", n: "02", text: "Bayesian linear regression, worked", id: "blr" },

    { t: "p", text: "With Gaussian noise σ² and a Gaussian prior w ~ N(0, τ²I) on the weights, the posterior over w is Gaussian with precision A = ΦᵀΦ/σ² + I/τ² and mean m = A⁻¹Φᵀy/σ². The predictive distribution at a new input φ is Gaussian with mean φᵀm and variance σ² + φᵀA⁻¹φ: the noise plus the parameter uncertainty, and the second term grows with distance from the data. Five points from y = 2 + 1.5x + N(0, 1), with σ² = 1 and τ² = 4:" },

    { t: "code", lang: "text", title: "The posterior in closed form (executed)",
      code: `x = (−2, −1, 0, 1, 2),  y = (−1.2, 0.9, 1.7, 3.6, 5.3),  Φ = [1, x]

ΦᵀΦ = [[5, 0], [0, 10]]           Φᵀy = [10.3, 15.7]
A = ΦᵀΦ/σ² + I/τ² = [[5.25, 0], [0, 10.25]]          S = A⁻¹ = [[0.1905, 0], [0, 0.0976]]
m = S Φᵀy/σ² = [1.9619, 1.5317]                       OLS = [2.06, 1.57]       ridge with λ = σ²/τ² = 0.25: [1.9619, 1.5317]   <- MAP is ridge, exactly

predictive at x =  0:   mean 1.962   sd 1.091   (noise 1.000, parameter part 0.436)
predictive at x =  2:   mean 5.025   sd 1.257   (parameter part 0.762)
predictive at x =  5:   mean 9.620   sd 1.905   (parameter part 1.622)
predictive at x = 10:   mean 17.279  sd 3.309   (parameter part 3.154)`,
      caption: "The posterior mean is the ridge solution with the penalty set by the ratio of noise variance to prior variance — the Bayesian reading of 4.3's λ. What ridge does not give is the second number: the predictive standard deviation, which is the noise near the data and three times the noise ten units away, because the slope's uncertainty (sd √0.0976 = 0.31) is multiplied by the distance. That growth is what a point estimate hides and what a Gaussian process makes the whole model." },

    { t: "h2", n: "03", text: "Gaussian processes: a prior over functions", id: "gp" },

    { t: "p", text: "A Gaussian process puts the prior on the function itself: any finite set of function values is jointly Gaussian with a covariance given by a kernel k(x, x′) that says how similar two inputs' outputs should be. The RBF kernel k = exp(−(x − x′)²/2ℓ²) says nearby inputs have nearly equal outputs and inputs more than a few length-scales apart are unrelated. Conditioning the joint Gaussian on the observed values gives the posterior at any new point in closed form: mean k*ᵀ(K + σ²I)⁻¹y and variance k(x*, x*) − k*ᵀ(K + σ²I)⁻¹k*, where K is the kernel matrix of the training inputs and k* the kernel between the new point and each of them." },

    { t: "code", lang: "text", title: "Three training points, RBF with ℓ = 1, noise 0.01, posterior at x* = 1.5 (executed; the arithmetic is checkable)",
      code: `X = (0, 1, 3),  y = (0.5, 1.2, −0.3)

K  = [[1.0000, 0.6065, 0.0111],            k(0, 1) = e^(−0.5) = 0.6065,   k(0, 3) = e^(−4.5) = 0.0111
      [0.6065, 1.0000, 0.1353],
      [0.0111, 0.1353, 1.0000]]
k* = [0.3247, 0.8825, 0.3247]              k(1.5, 0) = e^(−1.125), k(1.5, 1) = e^(−0.125), k(1.5, 3) = e^(−1.125)

(K + 0.01 I)⁻¹ y = [−0.3952, 1.4914, −0.4925]
posterior mean      = k*ᵀ (K + σ²I)⁻¹ y            = 1.0280
posterior variance  = 1 − k*ᵀ (K + σ²I)⁻¹ k*      = 0.1292,  sd 0.3594
sklearn GaussianProcessRegressor, same kernel: mean 1.0280, sd 0.3731 = √(0.1292 + 0.01)   (its sd includes the noise)

elsewhere:  x = 0.5: mean +0.946, sd 0.212      x = 3.0: mean −0.295, sd 0.141      x = 6.0: mean −0.005, sd 1.005   <- far from data: the prior, mean 0 and sd 1
three posterior samples at x = 1.5: 1.686, 1.177, 1.393`,
      caption: "The variance is small next to data and returns to the prior's away from it — the model knows what it does not know, which is the property Bayesian optimisation exploits. The cost is the (K + σ²I)⁻¹, O(n³) in the number of training points, which limits exact GPs to a few thousand; sparse and inducing-point approximations extend them. The kernel's hyperparameters (length-scale, amplitude, noise) are fitted by maximising the marginal likelihood, which is what scikit-learn's optimiser does." },

    { t: "code", lang: "python", title: "Kernels encode structure: the store's weekly pattern, 84 days of training, 14 ahead (executed, store A)",
      code: `#  kernel                                  MAE      80 % coverage   fitted kernel
#  RBF only                                40.61        0.86         0.378² · RBF(ℓ = 37.2) + noise 0.913        <- a smooth curve through a weekly sawtooth: nearly the mean
#  Matern 3/2                              39.90        0.86         0.835² · Matern(ℓ = 0.717) + noise           <- a rough curve that cannot see 7 days ahead
#  periodic (7) + RBF trend                23.58        0.79         0.882² · ExpSineSquared(ℓ = 0.63, p = 7) + 0.743² · RBF(...) + noise
#  seasonal naive, 4-week mean             21.23`,
      caption: "A GP is only as good as its kernel, and the kernel is where the modeller's knowledge goes: a periodic term with period 7 turns the GP from useless into competitive, and a sum of kernels is a sum of structures (season plus trend plus noise). Even so, on this series the four-week seasonal naive is better and free — the GP's advantage is the calibrated uncertainty, not the point forecast, and 10.7 measured what that is worth." },

    { t: "h2", n: "04", text: "When there is no closed form: MCMC, Laplace and variational inference", id: "inference" },

    { t: "p", text: "Conjugacy is the exception. For a logistic regression, a hierarchical model or anything with a non-Gaussian likelihood the posterior has no closed form, and three families approximate it. **MCMC** draws samples from the posterior by a random walk whose stationary distribution is the posterior — Metropolis accepts a proposal with probability min(1, p(θ′)/p(θ)); Hamiltonian Monte Carlo and NUTS (PyMC's and Stan's default) use gradients to propose far and accept often. **The Laplace approximation** fits a Gaussian at the mode with the curvature there. **Variational inference** chooses a tractable family q(θ) and optimises its parameters to minimise the KL divergence to the posterior — fast, scalable, and biased toward under-estimating the spread." },

    { t: "code", lang: "python", title: "Metropolis and Laplace on the coin posterior, where the answer is known (executed)",
      code: `def logpost(th): return beta(2, 2).logpdf(th) + 3 * log(th) + 1 * log(1 - th)          # prior × likelihood, up to a constant
th = 0.5
for i in range(20000):
    prop = th + normal(0, 0.2)                                                          # a symmetric proposal
    if random() < exp(logpost(prop) - logpost(th)): th = prop                           # accept with probability min(1, ratio)
    chain.append(th)
# acceptance rate 0.66; after a 2,000-step burn-in: posterior mean 0.6297 (analytic 0.6250), sd 0.1593 (0.1614), 95 % interval [0.298, 0.896] (analytic [0.290, 0.901])
# effective sample size from the lag-1 autocorrelation: 3,098 of 18,000 draws -- consecutive samples are correlated

# Laplace: a Gaussian at the MAP 0.6667 with sd (−∂² log p)^(−1/2) = 0.1925  -- in the neighbourhood of 0.1614, and symmetric where the truth is skewed on [0, 1]
# PyMC / Stan: the same model in four lines, sampled by NUTS with convergence diagnostics (R̂, effective sample size, divergences) -- not executed here`,
      caption: "MCMC is exact in the limit and slow; its diagnostics — acceptance rate, autocorrelation and effective sample size, R̂ across chains — are what tell you the limit has been approached. The Laplace and variational approximations trade that guarantee for speed and put a Gaussian where the posterior may not be one; on a bounded, skewed posterior the Gaussian's spread is roughly right and its shape is wrong. In practice: conjugate or Laplace for a quick answer, NUTS for a model with tens to thousands of parameters, variational inference for millions." },

    { t: "h2", n: "05", text: "Bayesian optimisation: the acquisition function", id: "bo" },

    { t: "p", text: "8.1 used Bayesian optimisation to tune hyperparameters; this is the mechanism. A GP surrogate is fitted to the evaluations so far, and an acquisition function turns its posterior mean μ(x) and standard deviation σ(x) into a score for where to evaluate next. **Expected improvement** EI(x) = (μ − f_best − ξ) Φ(z) + σ φ(z), with z = (μ − f_best − ξ)/σ, rewards points that are either promising or uncertain; **upper confidence bound** μ + κσ makes the trade-off explicit; **probability of improvement** Φ(z) is greedier. The next point is the acquisition's maximiser, the function is evaluated there, and the surrogate is refitted." },

    { t: "code", lang: "python", title: "Fifteen evaluations of a 1-D objective, 20 seeds: EI against random search (executed)",
      code: `f(x) = −(sin 3x + 0.3x² − 0.5x) on [−2, 3];  true maximum 1.0554 at x = 1.527

Bayesian optimisation (3 random points + 12 EI steps):   best found 1.0553 ± 0.0001;  within 0.01 of the maximum in 100 % of seeds
random search (15 draws):                                best found 0.8692 ± 0.2144;  within 0.01 in 10 %

after three points at −1.5, 0, 2:   EI proposes x = 2.65 (EI 0.511);   UCB with κ = 2 proposes 2.75;   the greedy mean alone would propose 2.00 (an evaluated point: no exploration)`,
      caption: "The greedy choice re-evaluates the best point seen; EI and UCB go where the surrogate is uncertain and promising, which is how twelve model-guided evaluations beat fifteen random ones on every seed. The advantage is largest when evaluations are expensive (a training run) and the dimension is low (under ~20); in high dimension the GP surrogate degrades and 8.1's successive-halving and random-search results are the alternatives." },

    { t: "h2", n: "06", text: "Thompson sampling: the posterior as the policy", id: "thompson" },

    { t: "code", lang: "python", title: "A three-armed Bernoulli bandit — arms 0.05, 0.08, 0.10 — over 5,000 pulls, 200 runs (executed)",
      code: `# Thompson: keep a Beta(successes + 1, failures + 1) posterior per arm; each round SAMPLE a rate from each posterior and pull the arm with the largest sample
#  policy         cumulative regret       share of pulls on the best arm
#  Thompson          26.7 ± 17.5                 0.792
#  ε-greedy 0.1      27.7 ± 24.6                 0.790      <- keeps exploring at 10 % forever; higher variance
#  UCB1              79.8 ±  6.6                 0.490      <- its bonus is tuned for rewards in [0, 1] and is far too wide for 5 % rates
#  uniform          116.7 ±  1.4                 0.333      (expectation 5,000 × (0.10 − 0.0767) = 117)

# the exercise repeats it with arms 0.10 / 0.11 / 0.12: Thompson 29.0, UCB1 43.6, ε-greedy 27.3 ± 22.8, uniform 50.0`,
      caption: "Thompson sampling explores exactly as much as its uncertainty warrants: an arm with a wide posterior is sometimes sampled high and pulled, an arm whose posterior has collapsed below the leader almost never is. It has no exploration parameter to tune, extends to contextual bandits by putting the posterior on a model, and is the standard answer to 11.1's rollout question when the aim is to *learn which variant is better while serving it* rather than to run a fixed-size test. The same machinery — a posterior sampled rather than maximised — is why it is cheaper than UCB to get right." },

    { t: "ladder",
      title: "Choosing a Bayesian tool",
      rungs: [
        { level: "bad", label: "A point estimate and a post-hoc 'confidence' from the residuals", code: `w = OLS(X, y); interval = w ± 2 * resid.std()`,
          note: "**The residual sd is the noise; the interval ignores the parameter uncertainty that triples the predictive sd ten units from the data.**" },
        { level: "ok", label: "Ridge with λ chosen by cross-validation, intervals by conformal", code: `Ridge(alpha=cv_best).fit(X, y); conformal band from held-out residuals`,
          note: "The MAP estimate with an honest, distribution-free band (10.7). What it lacks is the model's own account of where it is uncertain — the band is constant width." },
        { level: "best", label: "The posterior: conjugate where possible, a GP where the function matters, MCMC or VI where neither applies, and the posterior used for the decision", code: `m, S = bayesian_linear(X, y, sigma2, tau2)          # predictive sd 1.09 near the data, 3.31 far from it
gp = GaussianProcessRegressor(kernel=periodic + trend + noise)   # calibrated uncertainty by input
next_x = argmax EI(mu, sd)                                  # or: pull the arm with the highest posterior sample`,
          note: "The uncertainty is a function of the input, comes from the model, and is what the downstream decision — where to evaluate next, which arm to pull, how much stock to hold — consumes directly." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Under a Beta(2, 2) prior, three heads in four tosses give MAP 0.667 and posterior mean 0.625, while the MLE is 0.75. Why do the two Bayesian summaries differ from each other?",
          options: [
            "One uses the prior and the other does not",
            "They summarise the same skewed Beta(5, 3) posterior differently: the mode is where the density peaks, the mean is its centre of mass, and on a distribution skewed toward 0 the mean sits below the mode",
            "The MAP is computed with n − 1",
            "Rounding"
          ],
          answer: 1,
          why: "The posterior is a whole distribution; MAP, mean and median are three summaries of it and coincide only when it is symmetric. As n grows the posterior concentrates and all three approach the MLE — at 4,000 tosses they agree to three decimals — which is the sense in which the prior washes out."
        },
        {
          stem: "The Bayesian linear regression posterior mean equalled ridge with λ = 0.25 to four decimals. What is λ in Bayesian terms?",
          options: [
            "The noise variance",
            "The ratio of the noise variance to the prior variance, σ²/τ² = 1/4: a tighter prior on the weights is a larger penalty, and the MAP of a Gaussian-prior, Gaussian-noise model is exactly the ridge solution",
            "The prior mean",
            "The number of parameters"
          ],
          answer: 1,
          why: "Maximising log p(w | y) = −‖y − Φw‖²/2σ² − ‖w‖²/2τ² + const is minimising ‖y − Φw‖² + (σ²/τ²)‖w‖². The Bayesian model adds what ridge cannot: the posterior covariance S, and with it a predictive interval whose width depends on the input."
        },
        {
          stem: "A GP with an RBF kernel fitted to the store's daily sales scored an MAE of 40.6 and a fitted length-scale of 37 days; with a period-7 kernel added, 23.6. What happened?",
          options: [
            "The RBF kernel over-fitted",
            "The RBF kernel can only express smooth similarity by distance in time, so the best it can do with a weekly sawtooth is a long-length-scale curve near the mean; the periodic kernel encodes that days seven apart are similar, which is the structure the data has",
            "The noise level was wrong",
            "The periodic kernel has more parameters"
          ],
          answer: 1,
          why: "The kernel is the model. A GP with the wrong kernel is not slightly wrong; it is fitting the wrong hypothesis space, and the marginal-likelihood optimiser can only choose the least bad member of it (here: nearly flat with a large noise term). Kernels add and multiply, so season, trend and noise are composed rather than chosen between."
        },
        {
          stem: "Thompson sampling and ε-greedy reached nearly the same regret (26.7 vs 27.7) but ε-greedy's standard deviation across runs was 40 % larger. Why?",
          options: [
            "ε-greedy uses a worse estimate",
            "ε-greedy explores at a fixed 10 % forever, regardless of what it has learned, and exploits greedily otherwise — so it sometimes locks onto a wrong arm early and sometimes wastes pulls late; Thompson's exploration shrinks with the posteriors and is proportionate to the remaining uncertainty",
            "Thompson uses more samples",
            "The arms were too close"
          ],
          answer: 1,
          why: "A fixed ε is a compromise that is too much exploration once the answer is known and too little before it is. Thompson sampling's randomness comes from the posterior, so it adapts automatically; it also generalises to contexts and to delayed rewards, which is why it is the default in modern bandit systems."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "Priors on a coin, a GP posterior by hand, and a harder bandit",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** Seven heads in ten tosses. Compute the MAP, posterior mean, posterior sd and 95 % interval under Beta(1, 1), Beta(2, 2), Beta(0.5, 0.5) and Beta(10, 30). Explain what each prior says." },
        { t: "p", text: "**(b)** Training inputs (0, 1) with outputs (1, 2), an RBF kernel with length-scale 1 and noise 0.1. Compute K + σ²I, k* at x* = 2, (K + σ²I)⁻¹y, the posterior mean and variance by hand, and check with scikit-learn. Why is the mean at x* = 2 below the last observation although the data rise?" },
        { t: "p", text: "**(c)** Repeat the bandit with arms 0.10, 0.11 and 0.12 for Thompson, UCB1, ε-greedy and uniform over 5,000 pulls and 200 runs, reporting regret, the share of pulls on the best arm, and the fraction of runs in which the best arm received under a third of the pulls." }
      ],
      requirements: [
        "(a) four rows and a sentence per prior.",
        "(b) the five quantities, the check, and the explanation.",
        "(c) a four-row table."
      ],
      hint: "(a) Beta(1, 1) is flat. (b) The RBF prior mean is zero and has no trend term. (c) With a 1-point gap, 5,000 pulls is not enough for anyone to be sure.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) prior          MAP     mean    sd      95 % interval
#     Beta(1, 1)     0.7000  0.6667  0.1307  [0.390, 0.891]   flat: MAP = MLE
#     Beta(2, 2)     0.6667  0.6429  0.1237  [0.386, 0.861]   one pseudo-head and one pseudo-tail
#     Beta(0.5,0.5)  0.7222  0.6818  0.1345  [0.394, 0.907]   Jeffreys: pushes the mode toward the edges
#     Beta(10, 30)   0.3333  0.3400  0.0663  [0.217, 0.475]   a belief in 25 % heads worth 40 tosses; ten real tosses barely move it

# (b) K + σ²I = [[1.1, 0.6065], [0.6065, 1.1]];  k* = [0.1353, 0.6065];  (K + σ²I)⁻¹y = [−0.1343, 1.8922]
#     mean 1.1295;  variance 0.6138, sd 0.7834;  sklearn: mean 1.1295, sd 0.8449 = √(0.6138 + 0.1)
#     The RBF prior has mean 0 and no trend, so one unit past the last point the posterior mean is already decaying toward 0
#     and the variance is most of the way back to the prior's 1. A linear + RBF kernel (or a fitted mean function) would extrapolate the slope.

# (c) arms 0.10 / 0.11 / 0.12
#     policy        regret          best-arm share   runs with best arm under a third
#     Thompson      29.0 ± 14.9        0.578                 15 %
#     UCB1          43.6 ±  3.5        0.401                  6 %
#     ε-greedy 0.1  27.3 ± 22.8        0.576                 30 %
#     uniform       50.0 ±  0.6        0.333                 48 %
#     With a one-point gap the posteriors overlap after 5,000 pulls; Thompson and ε-greedy tie on the mean, and ε-greedy's greedy
#     lock-in shows in the 30 % of runs where it under-pulled the best arm. UCB1's cautious bonus is a liability at these rates.`,
        notes: [
          { t: "p", text: "(a) makes the prior concrete as pseudo-counts and shows a strong wrong prior doing exactly what it should: reporting itself until the data outweigh it." },
          { t: "p", text: "(b) is the conditioning formula once more, and the reminder that the prior mean matters wherever the data run out." },
          { t: "p", text: "(c) is the regime where exploration policy matters most — small gaps, finite horizon — and where Thompson's adaptivity shows as lower variance of outcome." }
        ]
      }
    }
  ],

  takeaways: [
    "Bayesian inference carries a posterior instead of a point: MLE 0.75, MAP 0.667, posterior mean 0.625 with an interval, converging as the prior washes out at 1/n; the prior is pseudo-counts, and L2 and L1 penalties are Gaussian and Laplace priors.",
    "Bayesian linear regression has a closed-form Gaussian posterior (precision ΦᵀΦ/σ² + I/τ²) whose mean is ridge with λ = σ²/τ² exactly, and a predictive sd that grows with distance from the data (1.09 to 3.31) because the parameter uncertainty is carried through.",
    "A Gaussian process is a prior over functions defined by a kernel; the posterior mean and variance at a new point follow from conditioning a joint Gaussian and were computed by hand to four decimals; the variance returns to the prior's away from data, and the kernel is the model — a period-7 kernel took the store MAE from 40.6 to 23.6.",
    "Without conjugacy: MCMC samples the posterior (Metropolis recovered the mean to 0.005 with acceptance 0.66 and 3,098 effective draws), the Laplace approximation puts a Gaussian at the mode (sd 0.19 against 0.16), variational inference optimises an approximating family; NUTS in PyMC or Stan is the practical default.",
    "Bayesian optimisation uses a GP surrogate and an acquisition function — EI (μ − f_best) Φ(z) + σ φ(z), or μ + κσ — to choose evaluations; twelve EI steps found the maximum on every seed where fifteen random draws did on two.",
    "Thompson sampling pulls the arm whose posterior sample is highest, explores in proportion to uncertainty with no parameter to tune, and cut regret from 117 to 27 where UCB1 reached 80 and ε-greedy 28 with higher variance."
  ],

  quiz: {
    title: "Bayesian Machine Learning and Gaussian Processes — Knowledge Check",
    questions: [
      {
        stem: "A product manager wants the conversion rate of a new feature after 20 trials with 3 successes. What does the Bayesian answer add to '15 %'?",
        options: [
          "Nothing — the rate is 15 %",
          "A posterior — Beta(4, 18) under a flat prior — whose 95 % interval runs from about 0.05 to 0.36, which says the rate is somewhere between a third of and more than twice the point estimate, and which can be combined with a prior from similar features to shrink a noisy early estimate",
          "A p-value against 20 %",
          "A confidence interval that excludes zero"
        ],
        answer: 1,
        why: "Twenty trials carry little information and the point estimate hides that; the posterior's width is the honest report, and its dependence on the prior is a feature when a defensible prior exists. The executed coin example showed the same: 3 of 4 gives an interval from 0.29 to 0.90."
      },
      {
        stem: "Why does a Gaussian process's predictive variance return to the prior variance far from the training data?",
        options: [
          "Because the kernel is normalised",
          "Because k* → 0 as the distance grows, so the term k*ᵀ(K + σ²I)⁻¹k* subtracted from the prior variance vanishes and nothing has been learned about that region — executed: sd 0.14 next to a point, 1.005 six units away",
          "Because of the noise term",
          "Because the optimiser inflates the length-scale"
        ],
        answer: 1,
        why: "The posterior variance is the prior variance minus what the data explain, and the data explain nothing about inputs they are unrelated to under the kernel. This is the property that makes GPs useful as surrogates: the acquisition function can see where the model is ignorant."
      },
      {
        stem: "Which is a correct statement about variational inference relative to MCMC?",
        options: [
          "VI is exact and MCMC is approximate",
          "VI replaces sampling by optimisation of a tractable family's parameters to minimise KL(q ‖ p), which scales to large models but is biased — typically under-estimating the posterior's spread and missing multi-modality — while MCMC is asymptotically exact and slower",
          "VI requires conjugate priors",
          "MCMC cannot handle more than a few parameters"
        ],
        answer: 1,
        why: "The KL(q ‖ p) direction penalises q for putting mass where p has little, so q tends to sit inside one mode and be too narrow. The Laplace approximation executed on the coin is the simplest such Gaussian fit and showed the shape mismatch; NUTS on the same problem would reproduce the skew, as Metropolis did."
      },
      {
        stem: "Expected improvement proposed x = 2.65 after evaluations at −1.5, 0 and 2, whereas the greedy posterior mean proposed x = 2.0 — a point already evaluated. What does that illustrate?",
        options: [
          "EI is random",
          "The acquisition must reward uncertainty as well as promise: the greedy mean re-evaluates the best known point and learns nothing, while EI's σφ(z) term sends it to an unexplored region where the surrogate's uncertainty makes improvement plausible",
          "The GP was misfitted",
          "UCB is better than EI"
        ],
        answer: 1,
        why: "Exploration is built into the acquisition function, not the surrogate; without it Bayesian optimisation degenerates to hill-climbing on a model. EI and UCB balance the two terms explicitly, which is why twelve EI steps beat fifteen random draws on every seed."
      },
      {
        stem: "UCB1 scored a regret of 79.8 against Thompson's 26.7 on arms of 5, 8 and 10 %. Is UCB1 a worse algorithm?",
        options: [
          "Yes — UCB is obsolete",
          "Not in general: UCB1's bonus √(2 ln t / n) is calibrated for rewards spanning [0, 1] and is far too wide for rates near 5 %, so it over-explores; a variance-aware UCB or a rescaled bonus narrows the gap, whereas Thompson sampling needs no such tuning because its exploration comes from the posterior itself",
          "Yes — Thompson sampling is always optimal",
          "No — the difference is noise"
        ],
        answer: 1,
        why: "UCB1's guarantee is worst-case over bounded rewards and its constant is conservative; on low-rate Bernoulli arms the confidence bound dwarfs the differences between arms. The executed result is a property of that mismatch, not of the UCB idea, and it is the practical reason Thompson sampling is preferred: its exploration is scaled automatically."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Bayesian ML and Gaussian Processes",
    sub: "Priors and posteriors, the linear model, GPs, approximate inference, and the two Bayesian decision tools.",
    questions: [
      {
        level: "Core",
        q: "What is the difference between MLE and MAP, and when do they agree?",
        strong: "MLE maximises the likelihood p(data | θ); MAP maximises the posterior p(θ | data) ∝ p(data | θ) p(θ), which is the likelihood times a prior — so MAP is MLE with a penalty of −log p(θ). On a coin with three heads in four, the MLE is 0.75 and the MAP under Beta(2, 2) is 0.667, because the prior contributes one pseudo-head and one pseudo-tail. They agree when the prior is flat, when the data dominate — at 4,000 tosses the two differed by 0.0001 — and they differ most when the data are few and the prior strong: Beta(20, 20) on the same four tosses gives 0.524. The familiar version is regularisation: ridge is MAP with a Gaussian prior and lasso is MAP with a Laplace prior, and I have verified the first numerically — the Bayesian linear posterior mean equalled ridge with λ = σ²/τ² to four decimals. What MAP does not give and the full posterior does is the spread, which is the interval and the predictive uncertainty.",
        answer: [
          { t: "p", text: "The two objectives, the coin numbers, the three conditions for agreement, regularisation as MAP with the executed check, and what the posterior adds." }
        ]
      },
      {
        level: "Core",
        q: "Explain what a Gaussian process is and how it makes a prediction.",
        strong: "A prior over functions: any finite set of function values is jointly Gaussian, with a mean function — usually zero — and a covariance given by a kernel that says how similar two inputs' outputs should be; the RBF kernel says similarity decays with squared distance over a length-scale. A prediction is conditioning: the training outputs and the new output are jointly Gaussian, so the conditional at the new input has mean k*ᵀ(K + σ²I)⁻¹y and variance k(x*, x*) − k*ᵀ(K + σ²I)⁻¹k*. I have computed that by hand on three points — kernel matrix, k*, the solve, mean 1.028 and sd 0.359 — and matched scikit-learn to four decimals. Two properties follow: the variance is small near data and returns to the prior far from it, so the model reports its own ignorance; and the kernel is the model, so structure goes into it — on daily sales an RBF kernel was useless and a period-7 kernel halved the error. Hyperparameters are fitted by maximising the marginal likelihood; the cost is cubic in the number of points, so exact GPs stop at a few thousand.",
        answer: [
          { t: "p", text: "The definition, the conditioning formula with the hand-computed numbers, the two properties, kernel choice with the executed store result, and the cost." }
        ]
      },
      {
        level: "Senior",
        q: "How would you get a posterior for a Bayesian logistic regression, and how would you know the answer is right?",
        strong: "There is no conjugate prior, so one of three approximations. For a quick answer, the Laplace approximation: find the MAP by a regularised fit and put a Gaussian there with the inverse Hessian as covariance — on the coin example it gave a spread in the right neighbourhood and a symmetric shape where the truth was skewed. For a reliable answer, MCMC with NUTS in PyMC or Stan: it samples the posterior exactly in the limit, and I judge whether the limit has been reached from the diagnostics — R̂ near 1 across several chains, an effective sample size in the hundreds or thousands rather than the raw draw count (my Metropolis chain had 18,000 draws and an effective size of 3,098), no divergences, and trace plots that mix. For a large model, variational inference — ADVI in PyMC — knowing it is biased toward narrow posteriors and can be checked against a short NUTS run on a subset. And in every case a posterior predictive check: simulate data from the fitted posterior and compare with the real data; if the simulations cannot produce what was observed, the model, not the sampler, is wrong.",
        answer: [
          { t: "p", text: "Laplace, NUTS and VI with when each applies, the MCMC diagnostics with the executed effective sample size, VI's bias, and the posterior predictive check." }
        ]
      },
      {
        level: "Senior",
        q: "Explain Bayesian optimisation and when it is worth using over random search.",
        strong: "Fit a Gaussian process to the evaluations so far, use an acquisition function to score every candidate by the surrogate's mean and uncertainty, evaluate the function at the acquisition's maximiser, refit, repeat. Expected improvement, (μ − f_best) Φ(z) + σ φ(z), rewards points that are promising or uncertain; UCB μ + κσ makes the trade-off a dial. Executed on a 1-D function with twelve EI steps after three random points, it found the maximum to within 0.01 on all twenty seeds where fifteen random draws did on two; and after three evaluations EI proposed an unexplored region while the greedy mean would have re-evaluated the best known point. It is worth using when each evaluation is expensive — a model training run — and the search space is low-dimensional, up to a few tens of continuous or ordinal dimensions with a sensible kernel; random search or successive halving win when evaluations are cheap and many, the space is high-dimensional or heavily categorical, or the evaluations are noisy enough that the surrogate cannot be trusted, which was the 8.1 finding on the noisy random-forest search.",
        answer: [
          { t: "p", text: "The loop, the two acquisitions, the executed comparison and the exploration example, and the conditions with the 8.1 cross-reference." }
        ]
      },
      {
        level: "Staff",
        q: "You are asked to choose between an A/B test and a bandit for rolling out a new recommendation model. How do you decide?",
        strong: "By what the organisation needs to learn and what it costs to learn it. An A/B test with fixed allocation and a pre-registered sample size gives a clean causal estimate of the difference, a p-value the business trusts, and the ability to measure secondary and long-term metrics — at the cost of serving the worse variant to half the users for the whole test; on a 5 % conversion, detecting half a point needs 31,000 users an arm. A bandit — Thompson sampling, with a Beta posterior per variant or a model posterior for contexts — shifts traffic toward the better variant as evidence accumulates and minimises regret: on three arms of 5, 8 and 10 % it cut regret from 117 to 27 over 5,000 pulls, and its exploration needs no tuning. Its costs are that the estimate of the difference is less precise and harder to explain, that adaptive allocation complicates the analysis of secondary metrics and delayed outcomes, and that non-stationarity — a variant that is better at weekends — can mislead it. So: an A/B test when the decision is a one-off with stakeholders who need a defensible number and the variants are cheap to serve; a bandit when there are many variants, the cost of serving a bad one is high, the reward is quick and stationary, or the choice must keep adapting — and often both, a short A/B phase for the estimate and a bandit for the rollout. Either way the assignment is a stable hash, the guardrails from 11.1 apply, and the metric is the business outcome, not the model's offline score.",
        answer: [
          { t: "p", text: "What each answers, the executed sizing and regret numbers, the bandit's three costs, the decision rule, and the hybrid." }
        ]
      }
    ]
  }
});

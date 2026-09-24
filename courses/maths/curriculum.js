/* ============================================================================
   MATHEMATICS & STATISTICS — CURRICULUM
   ----------------------------------------------------------------------------
   Six modules, in the order the ideas depend on each other: the algebra a
   model is written in, the calculus that trains it, the probability that
   describes its uncertainty, then the statistics that decides whether a
   measured difference is real.

   Every lesson works a number. A formula you have not evaluated by hand is a
   formula you cannot debug, so worked arithmetic appears wherever a symbol
   would otherwise do the hiding.
   ========================================================================= */
(function () {
  EC.defineCourse({
    id: "maths",
    title: "Mathematics & Statistics",
    short: "MS",
    blurb: "The linear algebra, calculus, probability and inference that models actually rest on.",

    trackLabels: { learn: "Mathematics", practice: "Practice", interview: "Interview" },
    trackBlurbs: {
      learn: "Six modules, in the order the ideas depend on each other — every formula evaluated on a number.",
      practice: "Fifty scenarios where the mathematics decides the answer, with the working folded away.",
      interview: "One hundred and eleven questions across linear algebra, calculus, probability, statistics and A/B testing."
    },

    published: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "4.1", "4.2", "4.3", "4.4", "4.5", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "5.12", "6.1", "6.2", "6.3", "6.4", "i1.1", "i1.2", "i1.3", "i1.4", "i1.5", "i1.6", "i2.1", "p1.1", "p1.2", "p1.3", "p1.4", "p1.5"],

    modules: [

      /* ================================================================
         PHASE 1 · THE MATHEMATICS A MODEL IS MADE OF — linear algebra
         ================================================================ */
      {
        id: "linalg",
        short: "M1",
        phase: "Phase 1 · The mathematics a model is made of",
        title: "Linear Algebra",
        blurb: "Vectors, matrices and decompositions, as geometry you can picture rather than notation you memorise.",
        outcome: "You can say what a matrix does to space, and derive PCA rather than recite it.",
        lessons: [
          { id: "1.1", title: "Vectors, Norms and Geometry", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "Vectors as direction and magnitude, the dot product as similarity, and why the norm you pick changes the answer.",
            keywords: ["vector", "norm", "dot product", "cosine", "projection", "l1", "l2"] },
          { id: "1.2", title: "Matrices as Transformations", difficulty: "foundation", minutes: 36, tier: "must",
            summary: "A matrix is a function on space — rotation, scaling, shear — and the determinant is what it does to area.",
            keywords: ["matrix", "linear map", "determinant", "basis", "transformation"] },
          { id: "1.3", title: "Multiplication, Rank and Invertibility", difficulty: "core", minutes: 38, tier: "must",
            summary: "Why matrix multiplication is defined the way it is, what rank measures, and when a system has no answer.",
            keywords: ["matmul", "rank", "inverse", "singular", "linear system", "null space"] },
          { id: "1.4", title: "Eigenvalues and Eigenvectors", difficulty: "core", minutes: 40, tier: "must",
            summary: "The directions a transformation leaves alone, computed by hand on a 2x2 and then read off a covariance matrix.",
            keywords: ["eigenvalue", "eigenvector", "diagonalisation", "spectrum", "characteristic"] },
          { id: "1.5", title: "Singular Value Decomposition", difficulty: "advanced", minutes: 42, tier: "must",
            summary: "The decomposition every matrix has, what the singular values mean, and low-rank approximation with real numbers.",
            keywords: ["svd", "singular value", "low rank", "compression", "pseudoinverse"] },
          { id: "1.6", title: "PCA, Derived Rather Than Recited", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "PCA falls out of the covariance eigenproblem — including why you centre, when you scale, and what the components are not.",
            keywords: ["pca", "covariance", "variance explained", "whitening", "scree"] },
          { id: "1.7", title: "Numerical Stability and Conditioning", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Condition numbers, why you never invert a matrix to solve a system, and the cancellation that ruins a variance.",
            keywords: ["condition number", "stability", "cancellation", "lstsq", "cholesky", "qr"] }
        ]
      },

      /* ================================================================
         PHASE 1 · THE MATHEMATICS A MODEL IS MADE OF — calculus
         ================================================================ */
      {
        id: "calculus",
        short: "M2",
        phase: "Phase 1 · The mathematics a model is made of",
        title: "Calculus & Optimisation",
        blurb: "Derivatives, gradients and the optimisation that turns a loss surface into trained weights.",
        outcome: "You can derive a gradient, explain why an optimiser stalls, and recognise a problem convexity has already solved.",
        lessons: [
          { id: "2.1", title: "Derivatives and the Chain Rule", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "The derivative as a local linear approximation, and the chain rule as the whole of backpropagation.",
            keywords: ["derivative", "chain rule", "limit", "backprop", "tangent"] },
          { id: "2.2", title: "Gradients, Jacobians and Hessians", difficulty: "core", minutes: 38, tier: "must",
            summary: "From one variable to many: the gradient as steepest ascent, the Jacobian as a shape, the Hessian as curvature.",
            keywords: ["gradient", "jacobian", "hessian", "partial derivative", "curvature"] },
          { id: "2.3", title: "Gradient Descent and Its Failure Modes", difficulty: "core", minutes: 40, tier: "must",
            summary: "Step size, momentum and adaptive methods — worked on a surface where you can see each one fail.",
            keywords: ["gradient descent", "learning rate", "momentum", "adam", "sgd", "saddle"] },
          { id: "2.4", title: "Convexity, and Why It Decides Everything", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "What convexity buys you, how to test for it, and what changes the moment a problem is not convex.",
            keywords: ["convex", "jensen", "local minimum", "global", "second derivative"] },
          { id: "2.5", title: "Constrained Optimisation and KKT", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "Lagrange multipliers as a price on a constraint, and the KKT conditions read as a checklist.",
            keywords: ["lagrange", "kkt", "constraint", "duality", "slack"] },
          { id: "2.6", title: "Numerical Methods You Will Actually Meet", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Newton's method, finite differences, automatic differentiation, and why float arithmetic bites here first.",
            keywords: ["newton", "finite difference", "autodiff", "root finding", "precision"] }
        ]
      },

      /* ================================================================
         PHASE 2 · UNCERTAINTY AND DATA — probability
         ================================================================ */
      {
        id: "probability",
        short: "M3",
        phase: "Phase 2 · Uncertainty and data",
        title: "Probability",
        blurb: "Random variables, distributions and the theorems that let a sample say something about a population.",
        outcome: "You can choose a distribution for a situation, and compute with it rather than gesture at it.",
        lessons: [
          { id: "3.1", title: "Axioms, Counting and the Sample Space", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "The three axioms everything else follows from, and the counting that most probability errors come down to.",
            keywords: ["axioms", "sample space", "combinatorics", "permutation", "combination"] },
          { id: "3.2", title: "Random Variables: PMF, PDF and CDF", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "Discrete against continuous, why a density is not a probability, and what the CDF is for.",
            keywords: ["random variable", "pmf", "pdf", "cdf", "quantile", "support"] },
          { id: "3.3", title: "Expectation, Variance and Moments", difficulty: "core", minutes: 36, tier: "must",
            summary: "Linearity of expectation as the most useful fact in the subject, and variance as a squared unit you must respect.",
            keywords: ["expectation", "variance", "moment", "linearity", "independence"] },
          { id: "3.4", title: "Discrete Distributions", difficulty: "core", minutes: 38, tier: "must",
            summary: "Bernoulli, binomial, geometric and Poisson — each derived from the situation that produces it.",
            keywords: ["bernoulli", "binomial", "poisson", "geometric", "negative binomial"] },
          { id: "3.5", title: "Continuous Distributions", difficulty: "core", minutes: 40, tier: "must",
            summary: "Uniform, normal, exponential and the heavy tails that break assumptions built on the normal.",
            keywords: ["normal", "exponential", "uniform", "lognormal", "heavy tail", "t distribution"] },
          { id: "3.6", title: "Conditional Probability and Bayes", difficulty: "core", minutes: 38, tier: "must",
            summary: "Bayes' theorem worked on a screening test, where the base rate does the thing nobody expects.",
            keywords: ["conditional", "bayes", "prior", "posterior", "base rate", "independence"] },
          { id: "3.7", title: "Joint Distributions, Covariance and Independence", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Marginals, conditionals, and the difference between uncorrelated and independent.",
            keywords: ["joint", "marginal", "covariance", "independence", "correlation"] },
          { id: "3.8", title: "Information Theory: Entropy and KL", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "Entropy as expected surprise, cross-entropy as the loss you already use, and KL as a distance that is not one.",
            keywords: ["entropy", "cross entropy", "kl divergence", "mutual information", "surprise"] },
          { id: "3.9", title: "Concentration Inequalities", difficulty: "expert", minutes: 34, tier: "adv",
            summary: "Markov, Chebyshev and Hoeffding — how to bound a tail when you refuse to assume a distribution.",
            keywords: ["markov", "chebyshev", "hoeffding", "bound", "tail", "concentration"] }
        ]
      },

      /* ================================================================
         PHASE 2 · UNCERTAINTY AND DATA — descriptive statistics
         ================================================================ */
      {
        id: "descriptive",
        short: "M4",
        phase: "Phase 2 · Uncertainty and data",
        title: "Descriptive Statistics",
        blurb: "Summaries that inform and summaries that mislead, and how to tell which one you are looking at.",
        outcome: "You can summarise a distribution honestly, and spot a summary that is hiding its shape.",
        lessons: [
          { id: "4.1", title: "Central Tendency, and When the Mean Lies", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "Mean, median and mode, and the skewed distributions where reporting the mean is a decision rather than a description.",
            keywords: ["mean", "median", "mode", "skew", "robust", "outlier"] },
          { id: "4.2", title: "Dispersion and the Denominator Question", difficulty: "core", minutes: 34, tier: "must",
            summary: "Variance, standard deviation, and why the sample variance divides by n minus 1 — derived, not asserted.",
            keywords: ["variance", "standard deviation", "bessel", "degrees of freedom", "mad", "range"] },
          { id: "4.3", title: "Percentiles, Quartiles and the IQR", difficulty: "core", minutes: 30, tier: "must",
            summary: "Order statistics, the several definitions of a percentile that disagree, and the box plot's hidden rule.",
            keywords: ["percentile", "quartile", "iqr", "box plot", "order statistic", "median"] },
          { id: "4.4", title: "Skewness, Kurtosis and Shape", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "The third and fourth moments, what they actually tell you, and why kurtosis is not peakedness.",
            keywords: ["skewness", "kurtosis", "moment", "tail", "shape", "normality"] },
          { id: "4.5", title: "Correlation: What It Does Not Say", difficulty: "core", minutes: 36, tier: "must",
            summary: "Pearson against Spearman, Anscombe's quartet as a warning, and confounding as the usual explanation.",
            keywords: ["pearson", "spearman", "anscombe", "confounding", "causation", "nonlinear"] }
        ]
      },

      /* ================================================================
         PHASE 3 · DECIDING WHAT IS REAL — statistical inference
         ================================================================ */
      {
        id: "inference",
        short: "M5",
        phase: "Phase 3 · Deciding what is real",
        title: "Statistical Inference",
        blurb: "From a sample to a claim about the world, with the error rates stated rather than assumed.",
        outcome: "You can design a test, read its output honestly, and say what it does not license you to conclude.",
        lessons: [
          { id: "5.1", title: "Sampling, Standard Error and the CLT", difficulty: "core", minutes: 38, tier: "must",
            summary: "The sampling distribution as the object inference is about, and why the CLT is the reason any of this works.",
            keywords: ["sampling", "standard error", "clt", "lln", "sampling distribution", "bias"] },
          { id: "5.2", title: "Estimation and Maximum Likelihood", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "Estimators, bias and variance, and MLE derived on a coin and then on a normal.",
            keywords: ["estimator", "mle", "bias", "consistency", "likelihood", "efficiency"] },
          { id: "5.3", title: "Confidence Intervals", difficulty: "core", minutes: 36, tier: "must",
            summary: "What 95% actually refers to, why it is not the probability the parameter is inside, and how width is bought.",
            keywords: ["confidence interval", "coverage", "margin of error", "precision", "sample size"] },
          { id: "5.4", title: "The Hypothesis Testing Framework", difficulty: "core", minutes: 38, tier: "must",
            summary: "Null and alternative, the test statistic, and the decision rule — assembled once so every test after it is the same shape.",
            keywords: ["hypothesis", "null", "alternative", "test statistic", "significance", "rejection region"] },
          { id: "5.5", title: "Z-Tests and T-Tests", difficulty: "core", minutes: 38, tier: "must",
            summary: "One sample, two samples, paired and unequal variance — with the assumption each one is quietly making.",
            keywords: ["z test", "t test", "welch", "paired", "assumptions", "normality"] },
          { id: "5.6", title: "Chi-Square and ANOVA", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "Testing counts and testing several means at once, and why you do not run six t-tests instead.",
            keywords: ["chi square", "anova", "f test", "goodness of fit", "independence", "post hoc"] },
          { id: "5.7", title: "P-Values: What They Are Not", difficulty: "core", minutes: 36, tier: "must",
            summary: "The definition, the five misreadings that appear in real reports, and what a p-value cannot tell you.",
            keywords: ["p value", "significance", "misinterpretation", "evidence", "p hacking"] },
          { id: "5.8", title: "Errors, Power and Effect Size", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "Type I and II errors as a chosen trade, power as the thing nobody computes, and effect size as the question that matters.",
            keywords: ["type i", "type ii", "power", "effect size", "sample size", "mde"] },
          { id: "5.9", title: "Non-Parametric Tests", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Mann-Whitney, Wilcoxon and Kruskal-Wallis — what you give up and what you stop having to assume.",
            keywords: ["non parametric", "mann whitney", "wilcoxon", "kruskal wallis", "rank", "permutation"] },
          { id: "5.10", title: "Multiple Testing Correction", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Why twenty tests find a result by construction, and the difference between controlling FWER and FDR.",
            keywords: ["multiple testing", "bonferroni", "fdr", "benjamini hochberg", "family wise"] },
          { id: "5.11", title: "Bootstrap and Resampling", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Getting a confidence interval for a statistic with no formula, and the cases where the bootstrap quietly fails.",
            keywords: ["bootstrap", "resampling", "permutation test", "jackknife", "percentile"] },
          { id: "5.12", title: "Bayesian Inference", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "Prior, likelihood, posterior — worked numerically, and compared with the frequentist answer on the same data.",
            keywords: ["bayesian", "prior", "posterior", "credible interval", "conjugate", "beta binomial"] }
        ]
      },

      /* ================================================================
         PHASE 3 · DECIDING WHAT IS REAL — applied statistics
         ================================================================ */
      {
        id: "applied",
        short: "M6",
        phase: "Phase 3 · Deciding what is real",
        title: "Applied Statistics",
        blurb: "Experiments and models as they are actually run, and the mistakes that survive code review.",
        outcome: "You can design and read an A/B test, and defend a regression against the objections that matter.",
        lessons: [
          { id: "6.1", title: "A/B Testing End to End", difficulty: "advanced", minutes: 44, tier: "must",
            summary: "Sizing, randomisation, running, stopping and reading — with peeking, novelty effects and sample-ratio mismatch handled explicitly.",
            keywords: ["ab test", "experiment", "randomisation", "peeking", "srm", "sequential"] },
          { id: "6.2", title: "Regression from a Statistical View", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "OLS as an estimator with assumptions, what the coefficients mean, and what the R-squared does not.",
            keywords: ["ols", "regression", "coefficient", "r squared", "residual", "assumptions"] },
          { id: "6.3", title: "Outliers, Leverage and Multicollinearity", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "The three ways a regression misleads you quietly, and the diagnostics that surface each one.",
            keywords: ["outlier", "leverage", "cook distance", "multicollinearity", "vif", "diagnostics"] },
          { id: "6.4", title: "The Statistical Mistakes That Ship", difficulty: "expert", minutes: 38, tier: "should",
            summary: "Simpson's paradox, survivorship bias, regression to the mean and the rest — each with the shape it takes in a real report.",
            keywords: ["simpson", "survivorship", "regression to mean", "selection bias", "berkson"] }
        ]
      }
,
      {
        id: "sc_math", short: "P1", dir: "01_sc_math", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Mathematics and Statistics Scenarios",
        blurb: "Fifty situations where the mathematics decides the answer — A/B tests that mislead, models that will not converge, distributions that break an assumption.",
        outcome: "You can say what a number means, and what it does not, before anyone ships a decision on it.",
        source: "Practice/01_Math_and_Stats_Scenarios.md",
        lessons: [
          { id: "p1.1", title: "A/B Testing & Experimentation", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "10 questions with hidden answers, from mathematics and statistics scenarios.",
            keywords: ["mathematics", "statistics", "scenarios"] },
          { id: "p1.2", title: "Statistical Modeling", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "10 questions with hidden answers, from mathematics and statistics scenarios.",
            keywords: ["mathematics", "statistics", "scenarios"] },
          { id: "p1.3", title: "Probability & Distributions", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "10 questions with hidden answers, from mathematics and statistics scenarios.",
            keywords: ["mathematics", "statistics", "scenarios"] },
          { id: "p1.4", title: "Feature Engineering & Modeling Math", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "10 questions with hidden answers, from mathematics and statistics scenarios.",
            keywords: ["mathematics", "statistics", "scenarios"] },
          { id: "p1.5", title: "Advanced & Edge Cases", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "10 questions with hidden answers, from mathematics and statistics scenarios.",
            keywords: ["mathematics", "statistics", "scenarios"] }
        ]
      },
      {
        id: "iv_math", short: "I1", dir: "01_iv_math", track: "interview", numPrefix: "I",
        phase: "Interview \u00b7 Question banks",
        title: "Mathematics and Statistics Interview Bank",
        blurb: "One hundred questions across linear algebra, calculus and optimisation, probability, statistics, A/B testing and the applied mathematics of ML.",
        outcome: "You can answer a maths or statistics question with the definition, the formula and the reason it matters.",
        source: "00_Interview_Bank/01_Math_and_Stats_Interview.md",
        lessons: [
          { id: "i1.1", title: "Section 1: Linear Algebra", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "15 questions with hidden answers, from mathematics and statistics interview bank.",
            keywords: ["mathematics", "statistics", "interview", "bank"] },
          { id: "i1.2", title: "Section 2: Calculus & Optimization", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "15 questions with hidden answers, from mathematics and statistics interview bank.",
            keywords: ["mathematics", "statistics", "interview", "bank"] },
          { id: "i1.3", title: "Section 3: Probability", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from mathematics and statistics interview bank.",
            keywords: ["mathematics", "statistics", "interview", "bank"] },
          { id: "i1.4", title: "Section 4: Statistics", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from mathematics and statistics interview bank.",
            keywords: ["mathematics", "statistics", "interview", "bank"] },
          { id: "i1.5", title: "Section 5: A/B Testing", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "15 questions with hidden answers, from mathematics and statistics interview bank.",
            keywords: ["mathematics", "statistics", "interview", "bank"] },
          { id: "i1.6", title: "Section 6: Applied Math for ML", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "15 questions with hidden answers, from mathematics and statistics interview bank.",
            keywords: ["mathematics", "statistics", "interview", "bank"] }
        ]
      },
      {
        id: "iv_deep", short: "I2", dir: "02_iv_deep", track: "interview", numPrefix: "I",
        phase: "Interview \u00b7 Question banks",
        title: "Deep Dive: The Questions Asked Most",
        blurb: "The eleven questions the reference singles out at the end of the statistics chapters — population versus sample, Bayes, MLE, the CLT, designing an A/B test, and reading a confidence interval against a p-value.",
        outcome: "You can give the long answer to the questions that come up in almost every interview.",
        source: "02_Descriptive_Stats_and_Probability.md + 03_Inference_and_Testing.md",
        lessons: [
          { id: "i2.1", title: "Deep Dive", difficulty: "advanced", minutes: 22, tier: "should",
            summary: "11 questions with hidden answers, from deep dive: the questions asked most.",
            keywords: ["deep", "dive", "questions", "asked", "most"] }
        ]
      }
    ]
  });
})();

/* ============================================================================
   INTERVIEW I1.2 — Algorithms
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/01_ML_Core_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.2",
 "lede": "**30 questions** from Core ML Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the reference answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Algorithms",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "21",
   "q": "Explain how linear regression works with full mathematical derivation.",
   "body": [
    {
     "t": "p",
     "text": "**Model:**"
    },
    {
     "t": "math",
     "tex": "\\hat{y} = \\mathbf{w}^T\\mathbf{x} + b = \\sum_{j=1}^d w_j x_j + b"
    },
    {
     "t": "p",
     "text": "**Loss function (MSE):**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}(\\mathbf{w}) = \\frac{1}{n}\\sum_{i=1}^n (y_i - \\hat{y}_i)^2 = \\frac{1}{n}||\\mathbf{y} - \\mathbf{X}\\mathbf{w}||^2"
    },
    {
     "t": "p",
     "text": "**Closed-form solution (Normal Equation):** Set \\(\\nabla_\\mathbf{w}\\mathcal{L} = 0\\):"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{w}} = \\frac{2}{n}\\mathbf{X}^T(\\mathbf{X}\\mathbf{w} - \\mathbf{y}) = 0 \\implies \\mathbf{w}^* = (\\mathbf{X}^T\\mathbf{X})^{-1}\\mathbf{X}^T\\mathbf{y}"
    },
    {
     "t": "p",
     "text": "Complexity: \\(O(d^3)\\) for the matrix inverse — infeasible for large \\(d\\)."
    },
    {
     "t": "p",
     "text": "**Gradient Descent update:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{w}_{t+1} = \\mathbf{w}_t - \\eta \\cdot \\frac{2}{n}\\mathbf{X}^T(\\mathbf{X}\\mathbf{w}_t - \\mathbf{y})"
    },
    {
     "t": "p",
     "text": "**Probabilistic view:** Assuming \\(y_i = \\mathbf{w}^T\\mathbf{x}_i + \\epsilon_i\\) with \\(\\epsilon_i \\sim \\mathcal{N}(0,\\sigma^2)\\), maximizing the likelihood gives the same MSE objective. MSE minimization ≡ MLE under Gaussian noise."
    },
    {
     "t": "p",
     "text": "**Gauss-Markov assumptions (BLUE guarantee):**"
    },
    {
     "t": "ol",
     "items": [
      "Linearity: \\(y = X\\beta + \\epsilon\\)",
      "Strict exogeneity: \\(E[\\epsilon|X] = 0\\)",
      "No multicollinearity: \\(X^TX\\) invertible (full rank)",
      "Homoscedasticity: \\(\\text{Var}(\\epsilon_i) = \\sigma^2\\) constant",
      "No autocorrelation: \\(\\text{Cov}(\\epsilon_i, \\epsilon_j) = 0\\)"
     ]
    },
    {
     "t": "p",
     "text": "Under these, OLS is the **Best Linear Unbiased Estimator (BLUE)**."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "How does logistic regression work? Derive the loss and gradient.",
   "body": [
    {
     "t": "p",
     "text": "**Model — Sigmoid function:**"
    },
    {
     "t": "math",
     "tex": "\\hat{p}_i = P(y_i=1|\\mathbf{x}_i) = \\sigma(\\mathbf{w}^T\\mathbf{x}_i) = \\frac{1}{1+e^{-\\mathbf{w}^T\\mathbf{x}_i}}"
    },
    {
     "t": "p",
     "text": "**Why sigmoid?** It maps \\((-\\infty, +\\infty)\\) to \\((0,1)\\) and is the canonical link function for Bernoulli likelihood. The log-odds (logit) are linear:"
    },
    {
     "t": "math",
     "tex": "\\log\\frac{p}{1-p} = \\mathbf{w}^T\\mathbf{x}"
    },
    {
     "t": "p",
     "text": "**Loss — Binary Cross-Entropy (MLE derivation):** Likelihood: \\(\\mathcal{L}(\\mathbf{w}) = \\prod_{i=1}^n \\hat{p}_i^{y_i}(1-\\hat{p}_i)^{1-y_i}\\)"
    },
    {
     "t": "p",
     "text": "Taking \\(-\\log\\):"
    },
    {
     "t": "math",
     "tex": "J(\\mathbf{w}) = -\\frac{1}{n}\\sum_{i=1}^n \\left[y_i\\log\\hat{p}_i + (1-y_i)\\log(1-\\hat{p}_i)\\right]"
    },
    {
     "t": "p",
     "text": "This is **convex** in \\(\\mathbf{w}\\) — has a unique global minimum (no closed form though)."
    },
    {
     "t": "p",
     "text": "**Gradient (elegant form):**"
    },
    {
     "t": "math",
     "tex": "\\nabla_\\mathbf{w} J = \\frac{1}{n}\\mathbf{X}^T(\\hat{\\mathbf{p}} - \\mathbf{y}) = \\frac{1}{n}\\sum_{i=1}^n (\\hat{p}_i - y_i)\\mathbf{x}_i"
    },
    {
     "t": "p",
     "text": "The gradient has the same form as linear regression but with the sigmoid squashing!"
    },
    {
     "t": "p",
     "text": "**Multi-class extension (Softmax):**"
    },
    {
     "t": "math",
     "tex": "P(y=k|\\mathbf{x}) = \\frac{e^{\\mathbf{w}_k^T\\mathbf{x}}}{\\sum_{j=1}^K e^{\\mathbf{w}_j^T\\mathbf{x}}}"
    },
    {
     "t": "p",
     "text": "Loss becomes categorical cross-entropy: \\(J = -\\frac{1}{n}\\sum_i \\sum_k y_{ik}\\log\\hat{p}_{ik}\\)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Explain SVM with full mathematical derivation: primal, dual, KKT, and kernel trick.",
   "body": [
    {
     "t": "p",
     "text": "**Primal problem — Hard-margin SVM:** Find hyperplane \\(\\mathbf{w}^T\\mathbf{x}+b = 0\\) that maximizes margin \\(\\frac{2}{||\\mathbf{w}||}\\):"
    },
    {
     "t": "math",
     "tex": "\\min_{\\mathbf{w},b} \\frac{1}{2}||\\mathbf{w}||^2 \\quad \\text{s.t.} \\quad y_i(\\mathbf{w}^T\\mathbf{x}_i+b) \\geq 1 \\quad \\forall i"
    },
    {
     "t": "p",
     "text": "**Soft-margin (slack variables \\(\\xi_i \\geq 0\\)):**"
    },
    {
     "t": "math",
     "tex": "\\min_{\\mathbf{w},b,\\xi} \\frac{1}{2}||\\mathbf{w}||^2 + C\\sum_i\\xi_i \\quad \\text{s.t.} \\quad y_i(\\mathbf{w}^T\\mathbf{x}_i+b) \\geq 1-\\xi_i"
    },
    {
     "t": "p",
     "text": "\\(C\\) controls bias-variance tradeoff: large \\(C\\) → small margin, low bias; small \\(C\\) → wide margin, high bias."
    },
    {
     "t": "p",
     "text": "**Lagrangian:**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = \\frac{1}{2}||\\mathbf{w}||^2 - \\sum_i \\alpha_i[y_i(\\mathbf{w}^T\\mathbf{x}_i+b)-1]"
    },
    {
     "t": "p",
     "text": "**KKT conditions** (stationarity + complementary slackness):"
    },
    {
     "t": "ul",
     "items": [
      "\\(\\frac{\\partial\\mathcal{L}}{\\partial\\mathbf{w}} = 0 \\implies \\mathbf{w} = \\sum_i \\alpha_i y_i \\mathbf{x}_i\\) (representer theorem)",
      "\\(\\frac{\\partial\\mathcal{L}}{\\partial b} = 0 \\implies \\sum_i \\alpha_i y_i = 0\\)",
      "\\(\\alpha_i \\geq 0\\), and \\(\\alpha_i[y_i(\\mathbf{w}^T\\mathbf{x}_i+b)-1] = 0\\) (only support vectors have \\(\\alpha_i > 0\\))"
     ]
    },
    {
     "t": "p",
     "text": "**Dual problem:** Substituting back:"
    },
    {
     "t": "math",
     "tex": "\\max_\\alpha \\sum_i\\alpha_i - \\frac{1}{2}\\sum_{i,j}\\alpha_i\\alpha_j y_i y_j \\mathbf{x}_i^T\\mathbf{x}_j \\quad \\text{s.t.} \\quad \\alpha_i\\geq 0,\\ \\sum_i\\alpha_i y_i=0"
    },
    {
     "t": "p",
     "text": "Decision: \\(\\hat{y} = \\text{sign}\\left(\\sum_i \\alpha_i y_i \\mathbf{x}_i^T\\mathbf{x} + b\\right)\\)"
    },
    {
     "t": "p",
     "text": "**Kernel trick:** Replace \\(\\mathbf{x}_i^T\\mathbf{x}_j\\) with \\(K(\\mathbf{x}_i,\\mathbf{x}_j) = \\phi(\\mathbf{x}_i)^T\\phi(\\mathbf{x}_j)\\) — no explicit \\(\\phi\\) needed! By **Mercer's theorem**, any symmetric positive semi-definite function is a valid kernel."
    },
    {
     "t": "table",
     "head": [
      "Kernel",
      "Formula",
      "When to use"
     ],
     "rows": [
      [
       "Linear",
       "\\(\\mathbf{x}^T\\mathbf{z}\\)",
       "Linearly separable, high-dim"
      ],
      [
       "RBF/Gaussian",
       "\\(\\exp(-\\gamma|\\mathbf{x}-\\mathbf{z}|^2)\\)",
       "Default; non-linear"
      ],
      [
       "Polynomial",
       "\\((\\mathbf{x}^T\\mathbf{z}+c)^d\\)",
       "Interaction features"
      ],
      [
       "Sigmoid",
       "\\(\\tanh(\\kappa\\mathbf{x}^T\\mathbf{z}+\\theta)\\)",
       "Neural net-like"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How does a Decision Tree work? Derive impurity measures mathematically.",
   "body": [
    {
     "t": "p",
     "text": "**Tree building — greedy recursive splitting:** At each node, find feature \\(j\\) and threshold \\(t\\) that minimize impurity:"
    },
    {
     "t": "math",
     "tex": "\\text{split}^* = \\arg\\min_{j,t} \\frac{|S_L|}{|S|}H(S_L) + \\frac{|S_R|}{|S|}H(S_R)"
    },
    {
     "t": "p",
     "text": "**Entropy (ID3, C4.5):**"
    },
    {
     "t": "math",
     "tex": "H(S) = -\\sum_{c=1}^C p_c \\log_2 p_c"
    },
    {
     "t": "p",
     "text": "where \\(p_c\\) = fraction of samples with class \\(c\\). Range: \\([0, \\log_2 C]\\)."
    },
    {
     "t": "p",
     "text": "**Information Gain:**"
    },
    {
     "t": "math",
     "tex": "IG(S, j, t) = H(S) - \\left[\\frac{|S_L|}{|S|}H(S_L) + \\frac{|S_R|}{|S|}H(S_R)\\right]"
    },
    {
     "t": "p",
     "text": "**Gini Impurity (CART):**"
    },
    {
     "t": "math",
     "tex": "G(S) = 1 - \\sum_{c=1}^C p_c^2 = \\sum_{c\\neq c'} p_c p_{c'} = \\text{probability of misclassification}"
    },
    {
     "t": "p",
     "text": "Range: \\([0, 1 - 1/C]\\). Faster to compute than entropy (no log). Slightly favors larger partitions."
    },
    {
     "t": "p",
     "text": "**MSE for regression trees:**"
    },
    {
     "t": "math",
     "tex": "\\text{Impurity}(S) = \\frac{1}{|S|}\\sum_{i\\in S}(y_i - \\bar{y}_S)^2"
    },
    {
     "t": "p",
     "text": "**Prediction:**"
    },
    {
     "t": "ul",
     "items": [
      "Classification: majority class in leaf",
      "Regression: mean of \\(y\\) in leaf"
     ]
    },
    {
     "t": "p",
     "text": "**Complexity:** Tree is a piecewise constant function. Axis-aligned splits create rectangular decision regions. \\(\\Theta(nd \\log n)\\) training, \\(O(\\text{depth})\\) inference."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is Random Forest? Derive bias-variance reduction through bagging.",
   "body": [
    {
     "t": "p",
     "text": "**Bagging (Bootstrap Aggregating):** Train \\(T\\) trees \\(\\{h_t\\}\\) on bootstrap samples \\(\\{D_t\\}\\) (n samples with replacement, ~63.2% unique):"
    },
    {
     "t": "math",
     "tex": "\\hat{y} = \\frac{1}{T}\\sum_{t=1}^T h_t(\\mathbf{x}) \\quad \\text{(regression)}"
    },
    {
     "t": "p",
     "text": "**Bias-variance analysis of bagging:**"
    },
    {
     "t": "math",
     "tex": "\\text{Var}(\\bar{h}) = \\frac{1-\\rho}{T}\\sigma^2 + \\rho\\sigma^2"
    },
    {
     "t": "p",
     "text": "where \\(\\rho\\) = average pairwise correlation between trees, \\(\\sigma^2\\) = variance of each tree."
    },
    {
     "t": "ul",
     "items": [
      "First term: \\(\\to 0\\) as \\(T\\to\\infty\\) (why more trees always helps)",
      "Second term: irreducible correlation floor"
     ]
    },
    {
     "t": "p",
     "text": "**Feature randomness:** At each split, consider only \\(m = \\sqrt{d}\\) (classif.) or \\(m = d/3\\) (regress.) random features. This **decorrelates** trees, reducing \\(\\rho\\) and lowering variance."
    },
    {
     "t": "p",
     "text": "**Out-of-Bag (OOB) Error:** Each sample is OOB for ~37% of trees. OOB error ≈ unbiased estimate of generalization error (no separate validation set needed)."
    },
    {
     "t": "p",
     "text": "**Feature Importance — Mean Decrease Impurity (MDI):**"
    },
    {
     "t": "math",
     "tex": "FI(j) = \\frac{1}{T}\\sum_t \\sum_{\\text{node } v \\in h_t \\text{ splits on }j} p_v \\cdot \\Delta G_v"
    },
    {
     "t": "p",
     "text": "where \\(p_v = |S_v|/n\\) and \\(\\Delta G_v\\) = impurity decrease at node \\(v\\)."
    },
    {
     "t": "p",
     "text": "**Permutation Importance:** Shuffle feature \\(j\\) in validation set, measure drop in score. Less biased than MDI for high-cardinality features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "26",
   "q": "Explain Gradient Boosting with full maths. How does XGBoost extend it?",
   "body": [
    {
     "t": "p",
     "text": "**Functional gradient descent in function space:** Build ensemble: \\(F_m(\\mathbf{x}) = F_{m-1}(\\mathbf{x}) + \\gamma_m h_m(\\mathbf{x})\\)"
    },
    {
     "t": "p",
     "text": "The new tree \\(h_m\\) fits the **negative gradient** (pseudo-residuals) of the loss:"
    },
    {
     "t": "math",
     "tex": "\\tilde{r}_i^{(m)} = -\\left[\\frac{\\partial \\mathcal{L}(y_i, F(x_i))}{\\partial F(x_i)}\\right]_{F=F_{m-1}}"
    },
    {
     "t": "p",
     "text": "For MSE loss: \\(\\tilde{r}_i = y_i - F_{m-1}(x_i)\\) (actual residuals). For log-loss: \\(\\tilde{r}_i = y_i - \\sigma(F_{m-1}(x_i))\\) (residuals in probability space)."
    },
    {
     "t": "p",
     "text": "**Step size:** \\(\\gamma_m = \\arg\\min_\\gamma \\sum_i \\mathcal{L}(y_i, F_{m-1}(x_i) + \\gamma h_m(x_i))\\)"
    },
    {
     "t": "p",
     "text": "**XGBoost — Second-order Taylor approximation:**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}^{(m)} \\approx \\sum_i \\left[g_i f_m(x_i) + \\frac{1}{2}h_i f_m(x_i)^2\\right] + \\Omega(f_m)"
    },
    {
     "t": "p",
     "text": "where:"
    },
    {
     "t": "ul",
     "items": [
      "\\(g_i = \\partial_{\\hat{y}} \\mathcal{L}(y_i, \\hat{y}_i^{(m-1)})\\) — first-order gradient",
      "\\(h_i = \\partial^2_{\\hat{y}} \\mathcal{L}(y_i, \\hat{y}_i^{(m-1)})\\) — second-order (Hessian)",
      "\\(\\Omega(f) = \\gamma T + \\frac{1}{2}\\lambda\\sum_{j=1}^T w_j^2\\) — regularization (T = leaf count, \\(w_j\\) = leaf weights)"
     ]
    },
    {
     "t": "p",
     "text": "**Optimal leaf weight** for leaf \\(j\\):"
    },
    {
     "t": "math",
     "tex": "w_j^* = -\\frac{\\sum_{i\\in I_j} g_i}{\\sum_{i\\in I_j} h_i + \\lambda}"
    },
    {
     "t": "p",
     "text": "**Optimal gain for a split:**"
    },
    {
     "t": "math",
     "tex": "\\text{Gain} = \\frac{1}{2}\\left[\\frac{(\\sum_{i\\in I_L}g_i)^2}{\\sum_{i\\in I_L}h_i+\\lambda} + \\frac{(\\sum_{i\\in I_R}g_i)^2}{\\sum_{i\\in I_R}h_i+\\lambda} - \\frac{(\\sum_{i\\in I}g_i)^2}{\\sum_{i\\in I}h_i+\\lambda}\\right] - \\gamma"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "How does K-Nearest Neighbors work? Analyze its complexity and theoretical properties.",
   "body": [
    {
     "t": "p",
     "text": "**Algorithm:** Given test point \\(\\mathbf{x}\\), find \\(k\\) training points with smallest distance:"
    },
    {
     "t": "math",
     "tex": "\\hat{y} = \\begin{cases} \\text{majority}(\\{y_i : i \\in \\mathcal{N}_k(\\mathbf{x})\\}) & \\text{classification} \\\\ \\frac{1}{k}\\sum_{i\\in\\mathcal{N}_k(\\mathbf{x})} y_i & \\text{regression} \\end{cases}"
    },
    {
     "t": "p",
     "text": "**Distance metrics:**"
    },
    {
     "t": "ul",
     "items": [
      "\\(L^p\\) norm: \\(d(\\mathbf{x},\\mathbf{z}) = \\left(\\sum_j |x_j-z_j|^p\\right)^{1/p}\\)",
      "\\(p=2\\): Euclidean; \\(p=1\\): Manhattan; \\(p=\\infty\\): Chebyshev"
     ]
    },
    {
     "t": "p",
     "text": "**Theoretical guarantee (Cover & Hart 1967):** As \\(n\\to\\infty\\) with \\(k\\to\\infty\\) and \\(k/n\\to 0\\):"
    },
    {
     "t": "math",
     "tex": "\\epsilon^* \\leq \\epsilon_{KNN} \\leq 2\\epsilon^*(1-\\epsilon^*)"
    },
    {
     "t": "p",
     "text": "where \\(\\epsilon^*\\) = Bayes error. So 1-NN error ≤ twice the Bayes error — remarkable!"
    },
    {
     "t": "p",
     "text": "**Complexity:** Brute force: \\(O(nd)\\) per query. KD-trees: \\(O(d\\log n)\\) for low \\(d\\). Ball trees: better for moderate \\(d\\)."
    },
    {
     "t": "p",
     "text": "**Curse of dimensionality for KNN:** In \\(d\\) dimensions, the expected distance to the nearest neighbor scales as \\(n^{-1/d}\\) — points are far apart, making local neighborhoods meaningless."
    },
    {
     "t": "p",
     "text": "**Decision boundary:** Voronoi tessellation of the training data for \\(k=1\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "Explain the Naive Bayes classifier with full mathematical derivation.",
   "body": [
    {
     "t": "p",
     "text": "**Bayes' theorem:**"
    },
    {
     "t": "math",
     "tex": "P(y=c|\\mathbf{x}) = \\frac{P(\\mathbf{x}|y=c)\\cdot P(y=c)}{P(\\mathbf{x})}"
    },
    {
     "t": "p",
     "text": "**Naive independence assumption:** \\(P(\\mathbf{x}|y=c) = \\prod_{j=1}^d P(x_j|y=c)\\)"
    },
    {
     "t": "p",
     "text": "**Prediction:** \\(\\hat{y} = \\arg\\max_c P(y=c)\\prod_{j=1}^d P(x_j|y=c)\\)"
    },
    {
     "t": "p",
     "text": "In log-space (numerically stable):"
    },
    {
     "t": "math",
     "tex": "\\hat{y} = \\arg\\max_c \\left[\\log P(y=c) + \\sum_{j=1}^d \\log P(x_j|y=c)\\right]"
    },
    {
     "t": "p",
     "text": "**Gaussian Naive Bayes:**"
    },
    {
     "t": "math",
     "tex": "P(x_j|y=c) = \\frac{1}{\\sqrt{2\\pi\\sigma_{jc}^2}}\\exp\\left(-\\frac{(x_j-\\mu_{jc})^2}{2\\sigma_{jc}^2}\\right)"
    },
    {
     "t": "p",
     "text": "Parameters: \\(\\hat{\\mu}_{jc} = \\frac{1}{n_c}\\sum_{i:y_i=c}x_{ij}\\), \\(\\hat{\\sigma}^2_{jc} = \\frac{1}{n_c}\\sum_{i:y_i=c}(x_{ij}-\\hat{\\mu}_{jc})^2\\)"
    },
    {
     "t": "p",
     "text": "**Multinomial Naive Bayes (text):** \\(P(w_j|c) = \\frac{\\text{count}(w_j,c)+\\alpha}{\\sum_{j'}\\text{count}(w_{j'},c)+d\\alpha}\\) with Laplace smoothing \\(\\alpha\\)."
    },
    {
     "t": "p",
     "text": "**Why it works despite the naive assumption:** The decision boundary needs \\(P(y|x)\\) to be *calibrated*, not the joint to be *exactly* modelled. The ranking \\(P(y=1|\\mathbf{x}) > P(y=0|\\mathbf{x})\\) is often preserved even with violated independence."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is K-Means clustering? Derive the algorithm and its EM connection.",
   "body": [
    {
     "t": "p",
     "text": "**Objective (WCSS — Within-Cluster Sum of Squares):**"
    },
    {
     "t": "math",
     "tex": "J(\\{\\mu_k\\}) = \\sum_{k=1}^K \\sum_{\\mathbf{x}\\in C_k}||\\mathbf{x}-\\mu_k||^2"
    },
    {
     "t": "p",
     "text": "**Lloyd's Algorithm (alternating optimization):**"
    },
    {
     "t": "ul",
     "items": [
      "**E-step (Assignment):** \\(z_i = \\arg\\min_k ||\\mathbf{x}_i - \\mu_k||^2\\)",
      "**M-step (Update):** \\(\\mu_k = \\frac{1}{|C_k|}\\sum_{i:z_i=k}\\mathbf{x}_i\\)"
     ]
    },
    {
     "t": "p",
     "text": "Guaranteed to converge (objective decreases monotonically) but to a local minimum."
    },
    {
     "t": "p",
     "text": "**EM connection:** K-Means is a hard-assignment EM for a GMM with equal, isotropic Gaussians \\((\\Sigma_k = \\sigma^2 I, \\sigma\\to 0)\\)."
    },
    {
     "t": "p",
     "text": "**K-Means++ initialization:**"
    },
    {
     "t": "ol",
     "items": [
      "Pick first centroid uniformly",
      "Pick each subsequent centroid with probability \\(\\propto d(\\mathbf{x})^2\\) (distance to nearest existing centroid)"
     ]
    },
    {
     "t": "p",
     "text": "Guarantees \\(E[J] \\leq 8(\\ln k + 2) \\cdot J_{\\text{opt}}\\) — \\(O(\\log k)\\)-competitive."
    },
    {
     "t": "p",
     "text": "**Limitations:**"
    },
    {
     "t": "ul",
     "items": [
      "Assumes spherical, equal-sized clusters (minimizes \\(L^2\\) distance)",
      "Sensitive to scale → must standardize features",
      "Local minimum → run multiple restarts with k-means++",
      "\\(k\\) is not automatically inferred (use Elbow/Silhouette)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is DBSCAN? Explain density definitions and algorithm precisely.",
   "body": [
    {
     "t": "p",
     "text": "**Density definitions:**"
    },
    {
     "t": "ul",
     "items": [
      "**\\(\\epsilon\\)-neighborhood:** \\(N_\\epsilon(\\mathbf{x}) = \\{p \\in D : d(\\mathbf{x},p) \\leq \\epsilon\\}\\)",
      "**Core point:** \\(|N_\\epsilon(\\mathbf{x})| \\geq \\text{minPts}\\)",
      "**Directly density-reachable:** \\(p\\) from \\(q\\) if \\(p\\in N_\\epsilon(q)\\) and \\(q\\) is a core point",
      "**Density-reachable:** Chain of directly density-reachable points",
      "**Density-connected:** Both reachable from a common core point",
      "**Border point:** In neighborhood of core point but not core itself",
      "**Noise:** Not reachable from any core point"
     ]
    },
    {
     "t": "p",
     "text": "**Algorithm:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "for each point p:\n    if not visited:\n        N = neighborhood(p, ε)\n        if |N| < minPts: mark as noise\n        else: expand_cluster(p, N)  # BFS/DFS"
    },
    {
     "t": "p",
     "text": "Time: \\(O(n \\log n)\\) with spatial index, \\(O(n^2)\\) brute force."
    },
    {
     "t": "p",
     "text": "**No \\(k\\) needed**, arbitrary shapes, noise detection."
    },
    {
     "t": "p",
     "text": "**vs. K-Means:**"
    },
    {
     "t": "table",
     "head": [
      "",
      "K-Means",
      "DBSCAN"
     ],
     "rows": [
      [
       "Cluster shape",
       "Spherical",
       "Arbitrary"
      ],
      [
       "Outliers",
       "Assigned to cluster",
       "Labelled as noise"
      ],
      [
       "Parameters",
       "\\(k\\)",
       "\\(\\epsilon\\), minPts"
      ],
      [
       "Varying density",
       "Struggles",
       "Struggles"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Parameter selection:** MinPts ≥ d+1. \\(\\epsilon\\) = \"elbow\" in sorted \\(k\\)-NN distance graph."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is PCA? Derive it from variance maximisation and SVD.",
   "body": [
    {
     "t": "p",
     "text": "**Goal:** Find direction \\(\\mathbf{v}_1\\) (unit vector) that maximises variance of projections:"
    },
    {
     "t": "math",
     "tex": "\\max_{\\mathbf{v}: ||\\mathbf{v}||=1} \\text{Var}(\\mathbf{X}\\mathbf{v}) = \\max_\\mathbf{v} \\mathbf{v}^T\\mathbf{C}\\mathbf{v}"
    },
    {
     "t": "p",
     "text": "where \\(\\mathbf{C} = \\frac{1}{n-1}\\mathbf{X}_c^T\\mathbf{X}_c\\) is the sample covariance matrix (\\(\\mathbf{X}_c\\) = mean-centered)."
    },
    {
     "t": "p",
     "text": "**Solution (Lagrangian):** \\(\\mathbf{C}\\mathbf{v} = \\lambda\\mathbf{v}\\) — the optimal direction is the **eigenvector with largest eigenvalue**."
    },
    {
     "t": "p",
     "text": "**Full eigendecomposition:** \\(\\mathbf{C} = \\mathbf{V}\\Lambda\\mathbf{V}^T\\) where \\(\\lambda_1\\geq\\lambda_2\\geq\\ldots\\)"
    },
    {
     "t": "p",
     "text": "**SVD connection:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{X}_c = \\mathbf{U}\\Sigma\\mathbf{V}^T"
    },
    {
     "t": "ul",
     "items": [
      "\\(\\mathbf{V}\\): principal directions (same as eigenvectors of \\(\\mathbf{C}\\))",
      "\\(\\mathbf{U}\\Sigma\\): principal component scores",
      "\\(\\sigma_k = \\sqrt{(n-1)\\lambda_k}\\): singular values from eigenvalues"
     ]
    },
    {
     "t": "p",
     "text": "**Explained variance ratio:**"
    },
    {
     "t": "math",
     "tex": "\\text{EVR}_k = \\frac{\\lambda_k}{\\sum_{j=1}^d \\lambda_j}"
    },
    {
     "t": "p",
     "text": "**Projection to \\(r\\) dimensions:** \\(\\tilde{\\mathbf{X}} = \\mathbf{X}_c\\mathbf{V}_r\\) where \\(\\mathbf{V}_r\\) = first \\(r\\) eigenvectors."
    },
    {
     "t": "p",
     "text": "**Reconstruction error:** \\(||\\mathbf{X}_c - \\tilde{\\mathbf{X}}\\mathbf{V}_r^T||_F^2 = \\sum_{k=r+1}^d \\lambda_k\\) (sum of discarded eigenvalues)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is t-SNE? Derive the objective and explain the role of perplexity.",
   "body": [
    {
     "t": "p",
     "text": "**High-dimensional similarity (Gaussian kernel):**"
    },
    {
     "t": "math",
     "tex": "p_{j|i} = \\frac{\\exp(-||\\mathbf{x}_i-\\mathbf{x}_j||^2 / 2\\sigma_i^2)}{\\sum_{k\\neq i}\\exp(-||\\mathbf{x}_i-\\mathbf{x}_k||^2 / 2\\sigma_i^2)}, \\quad p_{ij} = \\frac{p_{j|i}+p_{i|j}}{2n}"
    },
    {
     "t": "p",
     "text": "\\(\\sigma_i\\) is chosen per-point so that \\(\\text{Perplexity}(P_i) = 2^{H(P_i)} =\\) target perplexity (binary search). Perplexity ≈ effective number of neighbors (typically 5–50)."
    },
    {
     "t": "p",
     "text": "**Low-dimensional similarity (Student \\(t\\), 1 d.o.f.):**"
    },
    {
     "t": "math",
     "tex": "q_{ij} = \\frac{(1+||\\mathbf{y}_i-\\mathbf{y}_j||^2)^{-1}}{\\sum_{k\\neq l}(1+||\\mathbf{y}_k-\\mathbf{y}_l||^2)^{-1}}"
    },
    {
     "t": "p",
     "text": "**Why \\(t\\)-distribution?** Heavy tails prevent \"crowding\" — dissimilar points are pushed far apart in 2D even though many points need to be placed far from a dense cluster."
    },
    {
     "t": "p",
     "text": "**Objective (KL divergence):**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = KL(P||Q) = \\sum_{i\\neq j} p_{ij}\\log\\frac{p_{ij}}{q_{ij}}"
    },
    {
     "t": "p",
     "text": "**Gradient:**"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial\\mathcal{L}}{\\partial\\mathbf{y}_i} = 4\\sum_{j\\neq i}(p_{ij}-q_{ij})(1+||\\mathbf{y}_i-\\mathbf{y}_j||^2)^{-1}(\\mathbf{y}_i-\\mathbf{y}_j)"
    },
    {
     "t": "p",
     "text": "Attractive forces for nearby high-dim pairs, repulsive for dissimilar pairs."
    },
    {
     "t": "p",
     "text": "**Limitations:** Non-convex, random init, \\(O(n^2)\\) (Barnes-Hut approximation → \\(O(n\\log n)\\)), not suitable for feature engineering."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Explain AdaBoost with full mathematical derivation.",
   "body": [
    {
     "t": "p",
     "text": "**Exponential loss view:** AdaBoost minimises \\(\\mathcal{L} = \\sum_i \\exp(-y_i F(\\mathbf{x}_i))\\) where \\(F = \\sum_m\\alpha_m h_m\\) — this is a forward stagewise additive model."
    },
    {
     "t": "p",
     "text": "**At step \\(m\\), given current scores \\(F_{m-1}\\), sample weights:**"
    },
    {
     "t": "math",
     "tex": "w_i^{(m)} = \\exp(-y_i F_{m-1}(\\mathbf{x}_i))"
    },
    {
     "t": "p",
     "text": "**Weak learner weighted error:**"
    },
    {
     "t": "math",
     "tex": "\\epsilon_m = \\frac{\\sum_i w_i^{(m)}\\mathbf{1}[h_m(\\mathbf{x}_i)\\neq y_i]}{\\sum_i w_i^{(m)}}"
    },
    {
     "t": "p",
     "text": "**Classifier weight** (derived from minimising \\(\\mathcal{L}\\)):"
    },
    {
     "t": "math",
     "tex": "\\alpha_m = \\frac{1}{2}\\ln\\frac{1-\\epsilon_m}{\\epsilon_m}"
    },
    {
     "t": "p",
     "text": "Note: \\(\\alpha_m > 0\\) iff \\(\\epsilon_m < 0.5\\) (better than random)."
    },
    {
     "t": "p",
     "text": "**Sample weight update:**"
    },
    {
     "t": "math",
     "tex": "w_i^{(m+1)} = w_i^{(m)} \\exp(-\\alpha_m y_i h_m(\\mathbf{x}_i))"
    },
    {
     "t": "p",
     "text": "= \\(w_i^{(m)}\\cdot e^{-\\alpha_m}\\) if correct, \\(w_i^{(m)}\\cdot e^{+\\alpha_m}\\) if wrong."
    },
    {
     "t": "p",
     "text": "**Final model:** \\(\\hat{y} = \\text{sign}\\left(\\sum_{m=1}^M \\alpha_m h_m(\\mathbf{x})\\right)\\)"
    },
    {
     "t": "p",
     "text": "**Training error bound:**"
    },
    {
     "t": "math",
     "tex": "\\frac{1}{n}\\sum_i\\mathbf{1}[\\hat{y}_i\\neq y_i] \\leq \\prod_m \\sqrt{4\\epsilon_m(1-\\epsilon_m)} = \\prod_m\\sqrt{1-4\\gamma_m^2} \\leq e^{-2\\sum_m\\gamma_m^2}"
    },
    {
     "t": "p",
     "text": "where \\(\\gamma_m = 0.5-\\epsilon_m > 0\\). Training error decreases exponentially!"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is LightGBM? Explain GOSS, EFB, and leaf-wise growth.",
   "body": [
    {
     "t": "p",
     "text": "**Level-wise (XGBoost) vs Leaf-wise (LightGBM):**"
    },
    {
     "t": "ul",
     "items": [
      "Level-wise: grow all leaves on a level before going deeper — balanced but slower",
      "Leaf-wise: always split leaf with maximum gain — deeper one branch, much lower loss per tree"
     ]
    },
    {
     "t": "p",
     "text": "**Gradient-based One-Side Sampling (GOSS):** Keep all instances with large gradients \\(|g_i| \\geq\\) threshold (top \\(a\\)%), sample fraction \\(b\\) of small-gradient instances, reweight: \\(w_i = \\frac{1-a}{b}\\) for sampled instances."
    },
    {
     "t": "p",
     "text": "**Why?** Instances with large \\(g_i\\) contribute more information to learning. Random sampling wastes compute on already-learned instances."
    },
    {
     "t": "p",
     "text": "**Exclusive Feature Bundling (EFB):** Mutually exclusive features (features that rarely take non-zero values together) are bundled into one feature, reducing dimensionality. Finding optimal bundles is NP-hard → greedy approximation."
    },
    {
     "t": "p",
     "text": "**Histogram-based splits:** Bin continuous features into \\(B\\) bins (\\(B \\leq 255\\)). Compute gradient histograms: \\(O(nd)\\) → \\(O(nB)\\) per level. Memory: \\(O(B)\\) instead of \\(O(n)\\) per feature."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is the difference between hard and soft voting classifiers?",
   "body": [
    {
     "t": "p",
     "text": "**Hard voting:** \\(\\hat{y} = \\text{mode}(\\{h_1(\\mathbf{x}), \\ldots, h_T(\\mathbf{x})\\})\\)"
    },
    {
     "t": "p",
     "text": "**Soft voting:** \\(\\hat{y} = \\arg\\max_c \\frac{1}{T}\\sum_{t=1}^T P_t(y=c|\\mathbf{x})\\)"
    },
    {
     "t": "p",
     "text": "Soft voting uses confidence information — a classifier 99% confident in class A outweighs three classifiers 51% confident. Always preferred when classifiers are well-calibrated."
    },
    {
     "t": "p",
     "text": "**Error analysis:** If T classifiers each have accuracy \\(p > 0.5\\) and are independent, the ensemble error:"
    },
    {
     "t": "math",
     "tex": "\\epsilon_T = \\sum_{k > T/2}\\binom{T}{k}p^k(1-p)^{T-k}"
    },
    {
     "t": "p",
     "text": "Decreases rapidly with \\(T\\). For \\(p=0.7\\), \\(T=10\\): \\(\\epsilon_T \\approx 0.05\\) vs \\(\\epsilon_1 = 0.3\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "Derive Ridge and Lasso regression mathematically. Explain geometric intuition.",
   "body": [
    {
     "t": "p",
     "text": "**Ridge (L2 regularization):**"
    },
    {
     "t": "math",
     "tex": "J(\\mathbf{w}) = ||\\mathbf{y}-\\mathbf{X}\\mathbf{w}||^2 + \\lambda||\\mathbf{w}||^2"
    },
    {
     "t": "p",
     "text": "Closed-form: \\(\\mathbf{w}^* = (\\mathbf{X}^T\\mathbf{X}+\\lambda\\mathbf{I})^{-1}\\mathbf{X}^T\\mathbf{y}\\)"
    },
    {
     "t": "p",
     "text": "Note: \\(\\lambda\\mathbf{I}\\) ensures invertibility (fixes multicollinearity)!"
    },
    {
     "t": "p",
     "text": "**Spectral view:** If SVD \\(\\mathbf{X}=\\mathbf{U}\\Sigma\\mathbf{V}^T\\), then \\(\\mathbf{w}_{Ridge} = \\sum_k \\frac{\\sigma_k}{\\sigma_k^2+\\lambda}\\mathbf{u}_k^T\\mathbf{y}\\cdot\\mathbf{v}_k\\) — shrinks small singular values more."
    },
    {
     "t": "p",
     "text": "**Lasso (L1 regularization):**"
    },
    {
     "t": "math",
     "tex": "J(\\mathbf{w}) = ||\\mathbf{y}-\\mathbf{X}\\mathbf{w}||^2 + \\lambda||\\mathbf{w}||_1"
    },
    {
     "t": "p",
     "text": "No closed form — solved via coordinate descent:"
    },
    {
     "t": "math",
     "tex": "w_j \\leftarrow \\frac{S(r_j, \\lambda/2)}{x_j^Tx_j}, \\quad S(\\rho, \\lambda) = \\text{sign}(\\rho)(|\\rho|-\\lambda)_+"
    },
    {
     "t": "p",
     "text": "\\(S\\) = soft-thresholding operator. Forces exact zeros for \\(|\\rho| < \\lambda\\)."
    },
    {
     "t": "p",
     "text": "**Geometric intuition:**"
    },
    {
     "t": "ul",
     "items": [
      "Ridge: constraint region = sphere. The elliptical loss contour touches sphere at a non-axis-aligned point → no sparsity.",
      "Lasso: constraint region = L1 ball (diamond). Corners lie on coordinate axes → sparse solutions."
     ]
    },
    {
     "t": "p",
     "text": "**ElasticNet:** \\(J = ||\\mathbf{y}-\\mathbf{X}\\mathbf{w}||^2 + \\lambda_1||\\mathbf{w}||_1 + \\lambda_2||\\mathbf{w}||^2\\). Groups correlated features (Ridge grouping effect) while maintaining sparsity (Lasso selection)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "Explain SVM kernels. What is Mercer's theorem?",
   "body": [
    {
     "t": "p",
     "text": "**Kernel function:** \\(K: \\mathcal{X}\\times\\mathcal{X}\\to\\mathbb{R}\\) computes \\(K(\\mathbf{x},\\mathbf{z}) = \\langle\\phi(\\mathbf{x}),\\phi(\\mathbf{z})\\rangle_\\mathcal{H}\\) in some (possibly infinite-dim) RKHS."
    },
    {
     "t": "p",
     "text": "**Mercer's theorem:** \\(K\\) is a valid kernel iff it is **symmetric** and **positive semi-definite**, meaning the Gram matrix \\(K_{ij} = K(\\mathbf{x}_i,\\mathbf{x}_j)\\) is PSD for all datasets."
    },
    {
     "t": "table",
     "head": [
      "Kernel",
      "Formula",
      "Feature space"
     ],
     "rows": [
      [
       "Linear",
       "\\(\\mathbf{x}^T\\mathbf{z}\\)",
       "Original"
      ],
      [
       "Polynomial",
       "\\((\\mathbf{x}^T\\mathbf{z}+c)^d\\)",
       "All monomials up to degree \\(d\\)"
      ],
      [
       "RBF",
       "\\(\\exp(-\\gamma|\\mathbf{x}-\\mathbf{z}|^2)\\)",
       "Infinite dimensional"
      ],
      [
       "Laplace",
       "\\(\\exp(-\\gamma|\\mathbf{x}-\\mathbf{z}|_1)\\)",
       "Infinite dim, sparser"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**RBF feature space:** Via Taylor expansion:"
    },
    {
     "t": "math",
     "tex": "e^{-\\gamma||\\mathbf{x}||^2}e^{2\\gamma\\mathbf{x}^T\\mathbf{z}}e^{-\\gamma||\\mathbf{z}||^2} = e^{-\\gamma||\\mathbf{x}||^2}\\left(\\sum_{n=0}^\\infty\\frac{(2\\gamma)^n(\\mathbf{x}^T\\mathbf{z})^n}{n!}\\right)e^{-\\gamma||\\mathbf{z}||^2}"
    },
    {
     "t": "p",
     "text": "→ infinite-dimensional polynomial features, weighted by \\(e^{-\\gamma||\\cdot||^2}\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "Explain EM algorithm. Derive it using Jensen's inequality.",
   "body": [
    {
     "t": "p",
     "text": "**Problem:** Maximise marginal log-likelihood with latent variables \\(\\mathbf{Z}\\):"
    },
    {
     "t": "math",
     "tex": "\\log p(\\mathbf{X}|\\boldsymbol\\theta) = \\log\\sum_\\mathbf{Z} p(\\mathbf{X},\\mathbf{Z}|\\boldsymbol\\theta)"
    },
    {
     "t": "p",
     "text": "**Evidence Lower Bound (ELBO) via Jensen's inequality:**"
    },
    {
     "t": "math",
     "tex": "\\log p(\\mathbf{X}|\\boldsymbol\\theta) \\geq \\sum_\\mathbf{Z} q(\\mathbf{Z})\\log\\frac{p(\\mathbf{X},\\mathbf{Z}|\\boldsymbol\\theta)}{q(\\mathbf{Z})} = \\mathcal{L}(q,\\boldsymbol\\theta)"
    },
    {
     "t": "p",
     "text": "**E-step:** Maximise ELBO over \\(q\\) with \\(\\boldsymbol\\theta\\) fixed:"
    },
    {
     "t": "math",
     "tex": "q^*(\\mathbf{Z}) = p(\\mathbf{Z}|\\mathbf{X},\\boldsymbol\\theta^{old})"
    },
    {
     "t": "p",
     "text": "ELBO becomes: \\(\\mathcal{L} = Q(\\boldsymbol\\theta|\\boldsymbol\\theta^{old}) - H[q^*]\\) where \\(Q = E_{q^*}[\\log p(\\mathbf{X},\\mathbf{Z}|\\boldsymbol\\theta)]\\)"
    },
    {
     "t": "p",
     "text": "**M-step:** Maximise \\(Q\\) over \\(\\boldsymbol\\theta\\):"
    },
    {
     "t": "math",
     "tex": "\\boldsymbol\\theta^{new} = \\arg\\max_{\\boldsymbol\\theta} Q(\\boldsymbol\\theta|\\boldsymbol\\theta^{old})"
    },
    {
     "t": "p",
     "text": "**Convergence:** Each EM step increases \\(\\log p(\\mathbf{X}|\\boldsymbol\\theta)\\) (or leaves it unchanged). Converges to local maximum."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is a Gaussian Mixture Model? Derive EM update equations.",
   "body": [
    {
     "t": "p",
     "text": "**Model:**"
    },
    {
     "t": "math",
     "tex": "p(\\mathbf{x}) = \\sum_{k=1}^K \\pi_k \\mathcal{N}(\\mathbf{x}|\\boldsymbol\\mu_k,\\boldsymbol\\Sigma_k)"
    },
    {
     "t": "p",
     "text": "where \\(\\pi_k \\geq 0\\), \\(\\sum_k\\pi_k=1\\) (mixing coefficients)."
    },
    {
     "t": "p",
     "text": "**E-step — Responsibilities:**"
    },
    {
     "t": "math",
     "tex": "r_{ik} = \\frac{\\pi_k\\mathcal{N}(\\mathbf{x}_i|\\boldsymbol\\mu_k,\\boldsymbol\\Sigma_k)}{\\sum_{j=1}^K\\pi_j\\mathcal{N}(\\mathbf{x}_i|\\boldsymbol\\mu_j,\\boldsymbol\\Sigma_j)}"
    },
    {
     "t": "p",
     "text": "\\(r_{ik}\\) = posterior probability that \\(x_i\\) was generated by component \\(k\\)."
    },
    {
     "t": "p",
     "text": "**M-step — Update parameters:**"
    },
    {
     "t": "math",
     "tex": "N_k = \\sum_{i=1}^n r_{ik}, \\quad \\hat{\\pi}_k = \\frac{N_k}{n}"
    },
    {
     "t": "math",
     "tex": "\\hat{\\boldsymbol\\mu}_k = \\frac{1}{N_k}\\sum_{i=1}^n r_{ik}\\mathbf{x}_i"
    },
    {
     "t": "math",
     "tex": "\\hat{\\boldsymbol\\Sigma}_k = \\frac{1}{N_k}\\sum_{i=1}^n r_{ik}(\\mathbf{x}_i-\\hat{\\boldsymbol\\mu}_k)(\\mathbf{x}_i-\\hat{\\boldsymbol\\mu}_k)^T"
    },
    {
     "t": "p",
     "text": "**vs K-Means:** Soft assignment (r_{ik} ∈ [0,1]) vs hard; models elliptical clusters via \\(\\Sigma_k\\); produces density model (generative)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "How does hierarchical clustering work? Explain linkage criteria mathematically.",
   "body": [
    {
     "t": "p",
     "text": "**Agglomerative algorithm:**"
    },
    {
     "t": "ol",
     "items": [
      "Start: \\(n\\) clusters \\(\\{x_i\\}\\)",
      "Repeat: Merge the two closest clusters until 1 cluster remains",
      "Result: Dendrogram"
     ]
    },
    {
     "t": "p",
     "text": "**Linkage functions** (distance between cluster \\(A\\) and \\(B\\)):"
    },
    {
     "t": "table",
     "head": [
      "Linkage",
      "Formula",
      "Tendency"
     ],
     "rows": [
      [
       "Single",
       "\\(\\min_{a\\in A, b\\in B}d(a,b)\\)",
       "Elongated chains"
      ],
      [
       "Complete",
       "\\(\\max_{a\\in A, b\\in B}d(a,b)\\)",
       "Compact spheres"
      ],
      [
       "Average (UPGMA)",
       "\\(\\frac{1}{|A||B|}\\sum_{a,b}d(a,b)\\)",
       "Balanced"
      ],
      [
       "Ward",
       "\\(\\Delta J = \\frac{|A||B|}{|A|+|B|}||\\bar{A}-\\bar{B}||^2\\)",
       "Minimizes within-cluster variance"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Ward's method** is the most commonly recommended: equivalent to a greedy agglomerative K-Means."
    },
    {
     "t": "p",
     "text": "**Complexity:** \\(O(n^3)\\) naive, \\(O(n^2\\log n)\\) with priority queue and efficient linkage."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is the difference between L1 and L2 loss? When to use each?",
   "body": [
    {
     "t": "p",
     "text": "**L2 Loss (MSE):**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}_2 = \\frac{1}{n}\\sum_i(y_i-\\hat{y}_i)^2"
    },
    {
     "t": "ul",
     "items": [
      "Gradient: \\(\\nabla = \\frac{2}{n}\\sum_i(y_i-\\hat{y}_i)\\) (proportional to error)",
      "Differentiable everywhere → smooth optimization",
      "Penalizes large errors quadratically → sensitive to outliers",
      "Maximum Likelihood under \\(\\epsilon_i\\sim\\mathcal{N}(0,\\sigma^2)\\)"
     ]
    },
    {
     "t": "p",
     "text": "**L1 Loss (MAE):**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}_1 = \\frac{1}{n}\\sum_i|y_i-\\hat{y}_i|"
    },
    {
     "t": "ul",
     "items": [
      "Subgradient: \\(\\text{sign}(y_i-\\hat{y}_i)\\) (constant magnitude)",
      "Not differentiable at 0 (use subgradient or smooth approximation)",
      "Robust to outliers (constant penalty for large errors)",
      "Optimal estimator: conditional median (vs. L2 → conditional mean)",
      "Maximum Likelihood under Laplace distribution: \\(p(y|\\hat{y}) \\propto e^{-|y-\\hat{y}|/b}\\)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is Huber loss? Derive and compare.",
   "body": [
    {
     "t": "math",
     "tex": "\\mathcal{L}_\\delta(y,\\hat{y}) = \\begin{cases} \\frac{1}{2}(y-\\hat{y})^2 & \\text{if }|y-\\hat{y}|\\leq\\delta \\\\ \\delta\\left(|y-\\hat{y}|-\\frac{\\delta}{2}\\right) & \\text{otherwise} \\end{cases}"
    },
    {
     "t": "p",
     "text": "**Gradient:**"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial\\mathcal{L}_\\delta}{\\partial\\hat{y}} = \\begin{cases} -(y-\\hat{y}) & |y-\\hat{y}|\\leq\\delta \\\\ -\\delta\\cdot\\text{sign}(y-\\hat{y}) & \\text{otherwise} \\end{cases}"
    },
    {
     "t": "p",
     "text": "At \\(\\delta = 1.35\\hat{\\sigma}\\) (data scale), Huber is ~95% efficient as MSE under Gaussian noise. When \\(\\delta\\to\\infty\\): recovers L2; \\(\\delta\\to 0\\): recovers L1."
    },
    {
     "t": "p",
     "text": "**Log-cosh loss (alternative smooth approximation):**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = \\sum_i \\log\\cosh(y_i-\\hat{y}_i) \\approx \\frac{1}{2}(y-\\hat{y})^2 \\text{ small}, \\quad |y-\\hat{y}| \\text{ large}"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "Explain Bayesian Optimization for hyperparameter tuning with mathematical detail.",
   "body": [
    {
     "t": "p",
     "text": "**Surrogate model (Gaussian Process):** Model \\(f:\\mathcal{X}\\to\\mathbb{R}\\) (objective function) as a GP:"
    },
    {
     "t": "math",
     "tex": "f \\sim \\mathcal{GP}(m(\\mathbf{x}), k(\\mathbf{x},\\mathbf{x}'))"
    },
    {
     "t": "p",
     "text": "After \\(n\\) evaluations \\(\\mathcal{D}_n = \\{(\\mathbf{x}_i, y_i)\\}\\), posterior:"
    },
    {
     "t": "math",
     "tex": "\\mu_n(\\mathbf{x}) = \\mathbf{k}^T(\\mathbf{K}+\\sigma^2\\mathbf{I})^{-1}\\mathbf{y}"
    },
    {
     "t": "math",
     "tex": "\\sigma_n^2(\\mathbf{x}) = k(\\mathbf{x},\\mathbf{x}) - \\mathbf{k}^T(\\mathbf{K}+\\sigma^2\\mathbf{I})^{-1}\\mathbf{k}"
    },
    {
     "t": "p",
     "text": "**Expected Improvement (EI) acquisition function:**"
    },
    {
     "t": "math",
     "tex": "EI(\\mathbf{x}) = E[\\max(0, f(\\mathbf{x})-f^*)] = \\sigma_n(\\mathbf{x})\\left[\\phi(Z)Z + \\varphi(Z)\\right]"
    },
    {
     "t": "p",
     "text": "where \\(Z = \\frac{\\mu_n(\\mathbf{x})-f^*}{\\sigma_n(\\mathbf{x})}\\), \\(\\varphi\\) = Gaussian PDF, \\(\\Phi\\) = CDF."
    },
    {
     "t": "p",
     "text": "Balances **exploitation** (\\(Z\\) large, near current best) with **exploration** (\\(\\sigma_n\\) large, uncertain regions)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is early stopping? Derive its regularization equivalence.",
   "body": [
    {
     "t": "p",
     "text": "Early stopping terminates training when validation loss stops improving (with patience \\(p\\)):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "best_loss = inf; patience_counter = 0\nfor epoch in range(max_epochs):\n    train(); val_loss = evaluate()\n    if val_loss < best_loss - tol:\n        best_loss = val_loss; save_checkpoint()\n        patience_counter = 0\n    else:\n        patience_counter += 1\n        if patience_counter >= p: break"
    },
    {
     "t": "p",
     "text": "**Theoretical equivalence:** For SGD on L2-regularized models, early stopping at step \\(T\\) is equivalent to L2 regularization with \\(\\lambda = 1/(T\\eta)\\) where \\(\\eta\\) = step size. Early stopping implicitly constrains the model's movement from initialization — a soft form of the norm-ball constraint."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "Online vs batch learning — convergence analysis.",
   "body": [
    {
     "t": "p",
     "text": "**Batch GD:** \\(\\mathbf{w}_{t+1} = \\mathbf{w}_t - \\eta\\nabla_\\mathbf{w}\\mathcal{L}(\\mathbf{w}_t; D_{all})\\)"
    },
    {
     "t": "ul",
     "items": [
      "Gradient is the true full gradient → deterministic convergence",
      "For strictly convex: linear convergence rate \\(O(\\rho^t)\\) where \\(\\rho < 1\\)"
     ]
    },
    {
     "t": "p",
     "text": "**SGD (Online):** \\(\\mathbf{w}_{t+1} = \\mathbf{w}_t - \\eta_t\\nabla_\\mathbf{w}\\ell(\\mathbf{w}_t; x_i,y_i)\\)"
    },
    {
     "t": "ul",
     "items": [
      "Gradient is noisy unbiased estimate of true gradient",
      "Convergence rate: \\(O(1/\\sqrt{T})\\) for convex, \\(O(1/T)\\) with variance reduction",
      "Robbins-Monro conditions: \\(\\sum_t \\eta_t = \\infty\\), \\(\\sum_t \\eta_t^2 < \\infty\\) (e.g., \\(\\eta_t = 1/t\\))",
      "Noise acts as implicit regularizer — SGD finds flatter minima with better generalization"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is a learning curve and how does it inform model selection?",
   "body": [
    {
     "t": "p",
     "text": "**Training error** monotonically decreases as data grows (more data, harder to fit perfectly in training)."
    },
    {
     "t": "p",
     "text": "**Validation error** decreases then plateaus."
    },
    {
     "t": "p",
     "text": "**Bias regime** (underfitting):"
    },
    {
     "t": "ul",
     "items": [
      "Both curves are high",
      "Gap is small",
      "Fix: more complex model, better features"
     ]
    },
    {
     "t": "p",
     "text": "**Variance regime** (overfitting):"
    },
    {
     "t": "ul",
     "items": [
      "Train error low, val error high",
      "Large gap",
      "Fix: more data, regularization, simpler model"
     ]
    },
    {
     "t": "p",
     "text": "**Convergence check:** If both curves have converged and gap is small, adding more data won't help much — need architectural changes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is multi-label classification? Mathematical formulations.",
   "body": [
    {
     "t": "p",
     "text": "**Problem:** Each instance \\(\\mathbf{x}_i\\) has label vector \\(\\mathbf{y}_i \\in \\{0,1\\}^K\\)."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Binary Relevance:** Train \\(K\\) independent binary classifiers — ignores label correlation.",
      "**Classifier Chains:** Classifier \\(k\\) uses predictions \\(\\hat{y}_1,\\ldots,\\hat{y}_{k-1}\\) as features — propagates dependencies.",
      "**Label Powerset:** Treat each unique label subset as a class — exponential classes, data sparsity.",
      "**Multi-label neural net:** Output layer has \\(K\\) sigmoid units, separate binary cross-entropy per label."
     ]
    },
    {
     "t": "p",
     "text": "**Metrics:**"
    },
    {
     "t": "ul",
     "items": [
      "Hamming loss: \\(\\frac{1}{nK}\\sum_{i,k}\\mathbf{1}[\\hat{y}_{ik}\\neq y_{ik}]\\)",
      "Subset accuracy (exact match): strictest metric",
      "Macro/micro F1 across labels"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is transfer learning in ML? Explain feature reuse mathematically.",
   "body": [
    {
     "t": "p",
     "text": "**Assumption:** Source domain \\(\\mathcal{D}_S\\) with task \\(\\mathcal{T}_S\\) and target \\(\\mathcal{D}_T, \\mathcal{T}_T\\). If \\(P_S(\\mathbf{x})\\approx P_T(\\mathbf{x})\\) and shared features exist → transfer beneficial."
    },
    {
     "t": "p",
     "text": "**Types of shift:**"
    },
    {
     "t": "ul",
     "items": [
      "**Covariate shift:** \\(P_S(\\mathbf{x})\\neq P_T(\\mathbf{x})\\) but \\(P(y|\\mathbf{x})\\) same → importance weighting \\(w_i = P_T(x_i)/P_S(x_i)\\)",
      "**Label shift:** \\(P_S(y)\\neq P_T(y)\\) but \\(P(\\mathbf{x}|y)\\) same → reweight by label prior ratio",
      "**Domain adaptation:** Both \\(P(\\mathbf{x})\\) and \\(P(y|\\mathbf{x})\\) differ → adversarial domain adaptation"
     ]
    },
    {
     "t": "p",
     "text": "In classical ML: pre-trained embeddings (word2vec), kernel methods, covariate shift correction with KLIEP or TrAdaBoost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is SMOTE? Describe the interpolation mechanism mathematically.",
   "body": [
    {
     "t": "p",
     "text": "For minority class point \\(\\mathbf{x}_i\\):"
    },
    {
     "t": "ol",
     "items": [
      "Find \\(k\\) nearest neighbors (same class): \\(N_k = \\{\\mathbf{x}_{i_1},\\ldots,\\mathbf{x}_{i_k}\\}\\)",
      "Select neighbor \\(\\mathbf{x}_{nn}\\) from \\(N_k\\)",
      "Synthetic sample: \\(\\mathbf{x}_{new} = \\mathbf{x}_i + u \\cdot (\\mathbf{x}_{nn} - \\mathbf{x}_i)\\), \\(u\\sim U(0,1)\\)"
     ]
    },
    {
     "t": "p",
     "text": "Generates points **along line segments** between minority instances → fills minority manifold."
    },
    {
     "t": "p",
     "text": "**Variants:**"
    },
    {
     "t": "ul",
     "items": [
      "**Borderline SMOTE:** Only oversample boundary region instances",
      "**ADASYN:** Weight oversampling by local density — more synthetic in harder regions",
      "**SMOTE-Tomek:** SMOTE + remove Tomek links (overlapping pairs) = cleaning"
     ]
    },
    {
     "t": "p",
     "text": "**Limitation:** Can generate noisy/ambiguous samples in sparse regions. Does not help with Bayes error."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is the difference between model accuracy and model performance?",
   "body": [
    {
     "t": "p",
     "text": "**Accuracy** = \\(\\frac{TP+TN}{TP+TN+FP+FN}\\) — fraction of correct predictions."
    },
    {
     "t": "p",
     "text": "**The imbalance problem:** If 99% of samples are class 0:"
    },
    {
     "t": "ul",
     "items": [
      "A trivial \"predict always 0\" classifier gets **99% accuracy**",
      "But has precision=0, recall=0 for class 1 — completely useless!"
     ]
    },
    {
     "t": "p",
     "text": "**Richer metrics:**"
    },
    {
     "t": "table",
     "head": [
      "Metric",
      "Formula",
      "Best for"
     ],
     "rows": [
      [
       "Precision",
       "\\(\\frac{TP}{TP+FP}\\)",
       "Costly false positives"
      ],
      [
       "Recall",
       "\\(\\frac{TP}{TP+FN}\\)",
       "Costly false negatives"
      ],
      [
       "F1",
       "\\(\\frac{2PR}{P+R}\\)",
       "Balance both"
      ],
      [
       "ROC-AUC",
       "Area under TPR-FPR curve",
       "Threshold-free ranking"
      ],
      [
       "PR-AUC",
       "Area under Prec-Recall curve",
       "Imbalanced data"
      ],
      [
       "MCC",
       "\\(\\frac{TP\\cdot TN-FP\\cdot FN}{\\sqrt{(TP+FP)(TP+FN)(TN+FP)(TN+FN)}}\\)",
       "Most balanced single number"
      ]
     ]
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

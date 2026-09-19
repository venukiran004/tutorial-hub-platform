/* ============================================================================
   INTERVIEW I1.1 — Fundamentals
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/00_Interview_Bank/01_DL_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.1",
 "lede": "**20 questions** from Deep Learning Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Fundamentals",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What is a neural network? Formalise it mathematically.",
   "body": [
    {
     "t": "p",
     "text": "A neural network is a parameterised function \\(f_\\theta: \\mathbb{R}^{d_{in}} \\to \\mathbb{R}^{d_{out}}\\) composed of \\(L\\) layers:"
    },
    {
     "t": "math",
     "tex": "\\mathbf{h}^{(0)} = \\mathbf{x}"
    },
    {
     "t": "math",
     "tex": "\\mathbf{z}^{(l)} = \\mathbf{W}^{(l)}\\mathbf{h}^{(l-1)} + \\mathbf{b}^{(l)}"
    },
    {
     "t": "math",
     "tex": "\\mathbf{h}^{(l)} = \\sigma(\\mathbf{z}^{(l)})"
    },
    {
     "t": "p",
     "text": "where \\(\\mathbf{W}^{(l)}\\in\\mathbb{R}^{n_l\\times n_{l-1}}\\), \\(\\mathbf{b}^{(l)}\\in\\mathbb{R}^{n_l}\\), \\(\\sigma\\) is element-wise activation. The output: \\(\\hat{\\mathbf{y}} = \\mathbf{h}^{(L)}\\)."
    },
    {
     "t": "p",
     "text": "Total parameters: \\(\\sum_{l=1}^L (n_l \\cdot n_{l-1} + n_l)\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Why does depth help? Expressiveness theory.",
   "body": [
    {
     "t": "p",
     "text": "A shallow (1-hidden-layer) network needs exponentially many neurons to represent certain functions that a deep network with \\(O(\\text{poly}(d))\\) neurons can represent."
    },
    {
     "t": "p",
     "text": "**Depth separation theorem** (Eldan & Shamir, 2016): There exist functions computable by depth-3 networks of polynomial size that require exponential size depth-2 networks."
    },
    {
     "t": "p",
     "text": "In practice: depth provides **hierarchical feature composition**:"
    },
    {
     "t": "ul",
     "items": [
      "Layer 1: edges (Gabor-like filters)",
      "Layer 2: shapes (curves, corners)",
      "Layer 3: parts (eyes, wheels)",
      "Layer L: semantic concepts"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Derive backpropagation mathematically. Show full chain rule derivation.",
   "body": [
    {
     "t": "p",
     "text": "**Goal:** Compute \\(\\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{W}^{(l)}}\\) and \\(\\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{b}^{(l)}}\\) for all layers."
    },
    {
     "t": "p",
     "text": "**Define error signal (delta):**"
    },
    {
     "t": "math",
     "tex": "\\boldsymbol\\delta^{(l)} = \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{z}^{(l)}}"
    },
    {
     "t": "p",
     "text": "**Output layer (\\(l=L\\)):**"
    },
    {
     "t": "math",
     "tex": "\\boldsymbol\\delta^{(L)} = \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{h}^{(L)}} \\odot \\sigma'(\\mathbf{z}^{(L)})"
    },
    {
     "t": "p",
     "text": "For MSE: \\(\\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{h}^{(L)}} = \\hat{\\mathbf{y}} - \\mathbf{y}\\)"
    },
    {
     "t": "p",
     "text": "**Backward pass (recursion):**"
    },
    {
     "t": "math",
     "tex": "\\boldsymbol\\delta^{(l)} = \\left(\\mathbf{W}^{(l+1)T}\\boldsymbol\\delta^{(l+1)}\\right) \\odot \\sigma'(\\mathbf{z}^{(l)})"
    },
    {
     "t": "p",
     "text": "**Weight gradients:**"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{W}^{(l)}} = \\boldsymbol\\delta^{(l)} \\cdot (\\mathbf{h}^{(l-1)})^T, \\quad \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{b}^{(l)}} = \\boldsymbol\\delta^{(l)}"
    },
    {
     "t": "p",
     "text": "**Update:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{W}^{(l)} \\leftarrow \\mathbf{W}^{(l)} - \\eta \\frac{\\partial\\mathcal{L}}{\\partial\\mathbf{W}^{(l)}}"
    },
    {
     "t": "p",
     "text": "**Computational complexity:** \\(O(W)\\) per sample for both forward and backward pass, where \\(W\\) = total parameters. Backprop is exactly 2× forward pass cost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Gradient descent and learning rate — convergence analysis.",
   "body": [
    {
     "t": "p",
     "text": "**Gradient descent update:**"
    },
    {
     "t": "math",
     "tex": "\\boldsymbol\\theta_{t+1} = \\boldsymbol\\theta_t - \\eta \\nabla_{\\boldsymbol\\theta}\\mathcal{L}(\\boldsymbol\\theta_t)"
    },
    {
     "t": "p",
     "text": "**Convergence for \\(\\beta\\)-smooth convex functions** (Lipschitz gradient): After \\(T\\) steps: \\(\\mathcal{L}(\\boldsymbol\\theta_T) - \\mathcal{L}^* \\leq \\frac{||\\boldsymbol\\theta_0-\\boldsymbol\\theta^*||^2}{2\\eta T}\\) with \\(\\eta = 1/\\beta\\)."
    },
    {
     "t": "p",
     "text": "Rate: \\(O(1/T)\\) for convex, \\(O(\\rho^T)\\) for strongly convex."
    },
    {
     "t": "p",
     "text": "**Learning rate impact:**"
    },
    {
     "t": "ul",
     "items": [
      "\\(\\eta > 2/\\beta\\): divergence (overshooting)",
      "\\(\\eta = 1/\\beta\\): optimal step = Lipschitz constant",
      "\\(\\eta \\ll 1/\\beta\\): slow convergence"
     ]
    },
    {
     "t": "p",
     "text": "**Relationship between \\(\\eta\\), loss landscape curvature:** \\(\\eta_{\\max} = 2/\\lambda_{\\max}(\\mathbf{H})\\) where \\(\\mathbf{H}\\) = Hessian."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What are activation functions? Derive gradients for each.",
   "body": [
    {
     "t": "p",
     "text": "**Sigmoid:**"
    },
    {
     "t": "math",
     "tex": "\\sigma(x) = \\frac{1}{1+e^{-x}}, \\quad \\sigma'(x) = \\sigma(x)(1-\\sigma(x)) \\in (0, 0.25]"
    },
    {
     "t": "p",
     "text": "Range \\((0,1)\\). Gradient saturates for \\(|x| \\gg 0\\) → vanishing gradients."
    },
    {
     "t": "p",
     "text": "**Tanh:**"
    },
    {
     "t": "math",
     "tex": "\\tanh(x) = \\frac{e^x-e^{-x}}{e^x+e^{-x}}, \\quad \\tanh'(x) = 1-\\tanh^2(x) \\in (0,1]"
    },
    {
     "t": "p",
     "text": "Zero-centered (unlike sigmoid) → faster training. Still saturates."
    },
    {
     "t": "p",
     "text": "**ReLU:**"
    },
    {
     "t": "math",
     "tex": "\\text{ReLU}(x) = \\max(0,x), \\quad \\text{ReLU}'(x) = \\mathbf{1}[x>0]"
    },
    {
     "t": "p",
     "text": "No saturation for \\(x>0\\). Gradient = 1 for positive inputs → no vanishing for active neurons."
    },
    {
     "t": "p",
     "text": "**GELU (Gaussian Error Linear Unit):**"
    },
    {
     "t": "math",
     "tex": "\\text{GELU}(x) = x\\cdot\\Phi(x) = x\\cdot\\frac{1}{2}\\left[1+\\erf\\left(\\frac{x}{\\sqrt{2}}\\right)\\right]"
    },
    {
     "t": "p",
     "text": "Used in BERT, GPT. Smooth approximation: \\(\\approx 0.5x(1+\\tanh[\\sqrt{2/\\pi}(x+0.044715x^3)])\\)"
    },
    {
     "t": "p",
     "text": "**SiLU/Swish:** \\(x\\cdot\\sigma(x)\\) — self-gated, non-monotonic."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Why does ReLU prevent vanishing gradients? Derive formally.",
   "body": [
    {
     "t": "p",
     "text": "For a \\(L\\)-layer network with sigmoid activations:"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial\\mathcal{L}}{\\partial\\mathbf{W}^{(1)}} = \\prod_{l=2}^L \\frac{\\partial\\mathbf{h}^{(l)}}{\\partial\\mathbf{h}^{(l-1)}} \\cdot \\frac{\\partial\\mathcal{L}}{\\partial\\mathbf{h}^{(L)}}"
    },
    {
     "t": "p",
     "text": "Each Jacobian \\(\\frac{\\partial h^{(l)}_i}{\\partial h^{(l-1)}_j} = W^{(l)}_{ij}\\sigma'(z^{(l)}_i)\\)"
    },
    {
     "t": "p",
     "text": "Sigmoid: \\(\\sigma'(z) \\leq 0.25\\), so \\(||\\frac{\\partial\\mathbf{h}^{(l)}}{\\partial\\mathbf{h}^{(l-1)}}||_2 \\leq 0.25\\cdot||\\mathbf{W}^{(l)}||_2\\)"
    },
    {
     "t": "p",
     "text": "For \\(L\\)=20 layers: gradient scales as \\((0.25)^{20} \\approx 10^{-12}\\)! → Numerically zero."
    },
    {
     "t": "p",
     "text": "**ReLU fix:** \\(\\text{ReLU}'(x) = 1\\) for \\(x>0\\) → gradient magnitude preserved through active neurons. Only \"dying ReLU\" problem (\\(x\\leq 0\\) forever) remains."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the vanishing gradient problem? Mathematical analysis.",
   "body": [
    {
     "t": "p",
     "text": "The gradient of layer \\(l\\) depends on a product of terms:"
    },
    {
     "t": "math",
     "tex": "||\\boldsymbol\\delta^{(1)}|| \\leq ||\\boldsymbol\\delta^{(L)}|| \\cdot \\prod_{l=2}^L ||W^{(l)}|| \\cdot |\\sigma'(\\cdot)|"
    },
    {
     "t": "p",
     "text": "If spectral norm \\(||W^{(l)}||_2 < 1\\) and \\(|\\sigma'| < 1\\) (sigmoid): product \\(\\to 0\\) exponentially. If spectral norm \\(||W^{(l)}||_2 > 1\\): gradients **explode**."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ul",
     "items": [
      "ReLU: \\(|\\sigma'|=1\\) for active neurons",
      "BatchNorm: normalises \\(z^{(l)}\\), stabilises spectral norms",
      "ResNets: gradient flows through identity shortcut \\(\\frac{\\partial}{\\partial x}[F(x)+x] = \\frac{\\partial F}{\\partial x} + 1 \\geq 1\\)",
      "Gradient clipping: \\(\\mathbf{g} \\leftarrow \\mathbf{g}\\cdot\\min(1, c/||\\mathbf{g}||)\\)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is the exploding gradient problem? Gradient clipping.",
   "body": [
    {
     "t": "math",
     "tex": "||g|| = \\left|\\left|\\frac{\\partial\\mathcal{L}}{\\partial\\boldsymbol\\theta}\\right|\\right| \\gg 1"
    },
    {
     "t": "p",
     "text": "Caused by spectral norms of weight matrices \\(> 1\\) and long sequence unrolling in RNNs."
    },
    {
     "t": "p",
     "text": "**Gradient clipping by norm:**"
    },
    {
     "t": "math",
     "tex": "\\hat{\\mathbf{g}} = \\begin{cases} \\mathbf{g} & \\text{if } ||\\mathbf{g}|| \\leq c \\\\ c \\cdot \\mathbf{g}/||\\mathbf{g}|| & \\text{otherwise} \\end{cases}"
    },
    {
     "t": "p",
     "text": "Clips norm to \\(c\\) but preserves direction. Typical \\(c \\in [0.5, 5.0]\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is weight initialization? Derive He and Glorot formulations.",
   "body": [
    {
     "t": "p",
     "text": "**Problem:** If weights are too large/small, signals and gradients vanish or explode at layer 0 before training."
    },
    {
     "t": "p",
     "text": "**Condition:** Preserve activation variance across layers. If \\(h_i^{(l)} = \\sum_{j=1}^{n_{l-1}} w_{ij}^{(l)} h_j^{(l-1)}\\), then:"
    },
    {
     "t": "math",
     "tex": "\\text{Var}(h_i^{(l)}) = n_{l-1}\\text{Var}(w_{ij})\\text{Var}(h_j^{(l-1)})"
    },
    {
     "t": "p",
     "text": "For stable propagation: \\(n_{l-1}\\text{Var}(w) = 1 \\implies \\text{Var}(w) = 1/n_{l-1}\\)"
    },
    {
     "t": "p",
     "text": "**Glorot/Xavier** (sigmoid/tanh): Balance forward AND backward:"
    },
    {
     "t": "math",
     "tex": "w \\sim U\\left[-\\sqrt{\\frac{6}{n_{in}+n_{out}}}, \\sqrt{\\frac{6}{n_{in}+n_{out}}}\\right]"
    },
    {
     "t": "p",
     "text": "**He initialization** (ReLU): Only positive half of distribution active → variance is halved:"
    },
    {
     "t": "math",
     "tex": "w\\sim\\mathcal{N}\\left(0, \\frac{2}{n_{in}}\\right)"
    },
    {
     "t": "p",
     "text": "Factor of 2 compensates for ReLU zeroing out negative half."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is batch normalization? Derive forward and backward pass.",
   "body": [
    {
     "t": "p",
     "text": "**For a mini-batch \\(\\mathcal{B} = \\{z_1,\\ldots,z_m\\}\\), normalise each feature:**"
    },
    {
     "t": "math",
     "tex": "\\mu_\\mathcal{B} = \\frac{1}{m}\\sum_{i=1}^m z_i, \\quad \\sigma^2_\\mathcal{B} = \\frac{1}{m}\\sum_{i=1}^m(z_i-\\mu_\\mathcal{B})^2"
    },
    {
     "t": "math",
     "tex": "\\hat{z}_i = \\frac{z_i-\\mu_\\mathcal{B}}{\\sqrt{\\sigma^2_\\mathcal{B}+\\epsilon}}"
    },
    {
     "t": "math",
     "tex": "y_i = \\gamma\\hat{z}_i + \\beta"
    },
    {
     "t": "p",
     "text": "where \\(\\gamma, \\beta\\) are **learnable** parameters (identity at initialisation: \\(\\gamma=1, \\beta=0\\))."
    },
    {
     "t": "p",
     "text": "**Why does it help?**"
    },
    {
     "t": "ol",
     "items": [
      "Reduces internal covariate shift — input distribution to each layer is stabilised",
      "Acts as regularizer (noise from batch statistics)",
      "Allows higher learning rates (landscape is smoother)",
      "Reduces sensitivity to initialization"
     ]
    },
    {
     "t": "p",
     "text": "**Backward pass:**"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial\\mathcal{L}}{\\partial\\gamma} = \\sum_i\\delta_i\\hat{z}_i, \\quad \\frac{\\partial\\mathcal{L}}{\\partial\\beta} = \\sum_i\\delta_i"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial\\mathcal{L}}{\\partial z_i} = \\frac{\\gamma}{m\\sigma_\\mathcal{B}}\\left[m\\delta_i - \\sum_j\\delta_j - \\hat{z}_i\\sum_j\\delta_j\\hat{z}_j\\right]"
    },
    {
     "t": "p",
     "text": "**At inference:** Use running mean/variance computed during training (EMA)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is dropout? Mathematical interpretation as ensemble.",
   "body": [
    {
     "t": "p",
     "text": "During training, each neuron is independently set to 0 with probability \\(p\\) (keep prob = \\(1-p\\)):"
    },
    {
     "t": "math",
     "tex": "\\tilde{h}_i = h_i \\cdot \\text{Bernoulli}(1-p) / (1-p)"
    },
    {
     "t": "p",
     "text": "The \\((1-p)\\) denominator = **inverted dropout** — scales activations so expected output is unchanged at inference."
    },
    {
     "t": "p",
     "text": "**Ensemble interpretation:** With \\(n\\) neurons, there are \\(2^n\\) possible sub-networks. Dropout trains a stochastic ensemble of all these. At inference, using full network with scaled weights approximates geometric mean of ensemble predictions."
    },
    {
     "t": "p",
     "text": "**Regularization effect:** Adds noise \\(\\propto\\) activation magnitude → prevents co-adaptation. Equivalent to L2 regularization under certain assumptions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "Double descent phenomenon in deep learning.",
   "body": [
    {
     "t": "p",
     "text": "Classical bias-variance: test error \\(U\\)-shaped as model complexity increases."
    },
    {
     "t": "p",
     "text": "**Double descent:** For over-parameterised models (\\(\\text{params} \\gg n\\)):"
    },
    {
     "t": "ol",
     "items": [
      "Classical regime: error decreases as complexity grows",
      "Interpolation threshold: error peaks when model just fits training data",
      "Modern/over-parameterised regime: error decreases again as model grows much larger!"
     ]
    },
    {
     "t": "p",
     "text": "Explanation: Over-parameterisation allows SGD to find flat minima with better generalisation. Implicit regularisation of gradient descent selects the minimum-norm solution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Derive SGD, RMSProp, and Adam optimizers.",
   "body": [
    {
     "t": "p",
     "text": "**Momentum SGD:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{v}_t = \\beta\\mathbf{v}_{t-1} + (1-\\beta)\\mathbf{g}_t"
    },
    {
     "t": "math",
     "tex": "\\boldsymbol\\theta_t = \\boldsymbol\\theta_{t-1} - \\eta\\mathbf{v}_t"
    },
    {
     "t": "p",
     "text": "Exponential moving average of gradients. \\(\\beta=0.9\\) typical. Dampens oscillations, accelerates along consistent gradient directions."
    },
    {
     "t": "p",
     "text": "**RMSProp:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{v}_t = \\beta\\mathbf{v}_{t-1} + (1-\\beta)\\mathbf{g}_t^2 \\quad \\text{(element-wise)}"
    },
    {
     "t": "math",
     "tex": "\\boldsymbol\\theta_t = \\boldsymbol\\theta_{t-1} - \\frac{\\eta}{\\sqrt{\\mathbf{v}_t+\\epsilon}}\\mathbf{g}_t"
    },
    {
     "t": "p",
     "text": "Adapts per-parameter learning rate — large gradients → smaller effective LR."
    },
    {
     "t": "p",
     "text": "**Adam (Adaptive Moment Estimation):**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{m}_t = \\beta_1\\mathbf{m}_{t-1} + (1-\\beta_1)\\mathbf{g}_t \\quad \\text{(1st moment — mean)}"
    },
    {
     "t": "math",
     "tex": "\\mathbf{v}_t = \\beta_2\\mathbf{v}_{t-1} + (1-\\beta_2)\\mathbf{g}_t^2 \\quad \\text{(2nd moment — variance)}"
    },
    {
     "t": "p",
     "text": "**Bias correction** (crucial at early steps when moments are near 0):"
    },
    {
     "t": "math",
     "tex": "\\hat{\\mathbf{m}}_t = \\frac{\\mathbf{m}_t}{1-\\beta_1^t}, \\quad \\hat{\\mathbf{v}}_t = \\frac{\\mathbf{v}_t}{1-\\beta_2^t}"
    },
    {
     "t": "math",
     "tex": "\\boldsymbol\\theta_t = \\boldsymbol\\theta_{t-1} - \\frac{\\eta}{\\sqrt{\\hat{\\mathbf{v}}_t}+\\epsilon}\\hat{\\mathbf{m}}_t"
    },
    {
     "t": "p",
     "text": "Typical: \\(\\beta_1=0.9\\), \\(\\beta_2=0.999\\), \\(\\epsilon=10^{-8}\\), \\(\\eta=10^{-3}\\)."
    },
    {
     "t": "p",
     "text": "**AdamW:** Decouples weight decay from adaptive LR:"
    },
    {
     "t": "math",
     "tex": "\\boldsymbol\\theta_t = \\boldsymbol\\theta_{t-1} - \\eta\\left(\\frac{\\hat{\\mathbf{m}}_t}{\\sqrt{\\hat{\\mathbf{v}}_t}+\\epsilon} + \\lambda\\boldsymbol\\theta_{t-1}\\right)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Dying ReLU problem — mathematical explanation and fixes.",
   "body": [
    {
     "t": "p",
     "text": "**Dead neuron condition:** If for all inputs \\(x\\), \\(z = w^Tx + b < 0\\), then \\(\\text{ReLU}(z) = 0\\) and \\(\\text{ReLU}'(z) = 0\\)."
    },
    {
     "t": "p",
     "text": "The gradient \\(\\boldsymbol\\delta = 0\\) → weight updates are zero → neuron stays dead permanently."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "table",
     "head": [
      "Activation",
      "Formula",
      "Fix"
     ],
     "rows": [
      [
       "Leaky ReLU",
       "\\(\\max(\\alpha x, x)\\), \\(\\alpha=0.01\\)",
       "Tiny gradient for \\(x<0\\)"
      ],
      [
       "PReLU",
       "\\(\\max(\\alpha x, x)\\), \\(\\alpha\\) learned",
       "Adaptive"
      ],
      [
       "ELU",
       "\\(x\\) if \\(x\\geq 0\\); \\(\\alpha(e^x-1)\\) if \\(x<0\\)",
       "Smooth negative region"
      ],
      [
       "SELU",
       "$\\lambda\\cdot$ELU",
       "Self-normalizing networks"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Prevention:** He initialization, small learning rate, BatchNorm before activation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is a perceptron? Derive the perceptron learning algorithm.",
   "body": [
    {
     "t": "p",
     "text": "\\(\\hat{y} = \\text{sign}(\\mathbf{w}^T\\mathbf{x}+b)\\)"
    },
    {
     "t": "p",
     "text": "**Perceptron update rule:** For each misclassified point \\((\\mathbf{x}_i, y_i)\\) where \\(y_i\\in\\{-1,+1\\}\\):"
    },
    {
     "t": "math",
     "tex": "\\mathbf{w} \\leftarrow \\mathbf{w} + y_i\\mathbf{x}_i"
    },
    {
     "t": "p",
     "text": "**Convergence theorem (Novikoff, 1962):** If data is linearly separable with margin \\(\\gamma = \\min_i y_i(\\mathbf{w}^*\\cdot\\mathbf{x}_i)/||\\mathbf{w}^*||\\), then perceptron converges in at most \\(R^2/\\gamma^2\\) updates where \\(R = \\max||x_i||\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Universal Approximation Theorem — statement and implications.",
   "body": [
    {
     "t": "p",
     "text": "**Theorem (Cybenko 1989, Hornik 1991):** For any continuous function \\(f: [0,1]^n \\to \\mathbb{R}\\) and \\(\\epsilon > 0\\), there exists a shallow network:"
    },
    {
     "t": "math",
     "tex": "F(\\mathbf{x}) = \\sum_{k=1}^N \\alpha_k\\sigma(\\mathbf{w}_k^T\\mathbf{x}+b_k)"
    },
    {
     "t": "p",
     "text": "such that \\(\\sup_\\mathbf{x}|F(\\mathbf{x})-f(\\mathbf{x})| < \\epsilon\\), for any non-polynomial \\(\\sigma\\)."
    },
    {
     "t": "p",
     "text": "**Caveat:** Theorem guarantees existence but NOT how large \\(N\\) must be (can be exponential in dimension)."
    },
    {
     "t": "p",
     "text": "**Depth provides efficiency:** Lunaberg (2018): Functions representable by deep networks with \\(O(kn)\\) neurons may require \\(O(k^n)\\) neurons in shallow networks."
    },
    {
     "t": "p",
     "text": "**Practical implication:** Depth allows efficient representation; width provides universal approximation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the difference between loss and metric?",
   "body": [
    {
     "t": "table",
     "head": [
      "",
      "Loss Function",
      "Metric"
     ],
     "rows": [
      [
       "Role",
       "Optimized during training",
       "Evaluates model"
      ],
      [
       "Differentiability",
       "Must be differentiable",
       "Need not be"
      ],
      [
       "Scale",
       "Can be arbitrary",
       "Interpretable"
      ],
      [
       "Examples",
       "Cross-entropy, MSE",
       "Accuracy, F1, BLEU"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Why not optimize metrics directly?**"
    },
    {
     "t": "ul",
     "items": [
      "Accuracy: 0-1 loss is non-continuous, non-differentiable — gradient is 0 almost everywhere",
      "Cross-entropy is a smooth surrogate for 0-1 loss that upper bounds it:"
     ]
    },
    {
     "t": "math",
     "tex": "\\mathbf{1}[\\hat{y}\\neq y] \\leq -\\log P(y|\\mathbf{x})"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Weight regularization in neural networks — L1, L2, and weight decay.",
   "body": [
    {
     "t": "p",
     "text": "**L2 regularization (weight decay):** Add \\(\\frac{\\lambda}{2}||\\boldsymbol\\theta||^2\\) to loss:"
    },
    {
     "t": "math",
     "tex": "\\nabla J = \\nabla \\mathcal{L} + \\lambda\\boldsymbol\\theta"
    },
    {
     "t": "math",
     "tex": "\\boldsymbol\\theta_{t+1} = (1-\\eta\\lambda)\\boldsymbol\\theta_t - \\eta\\nabla\\mathcal{L}"
    },
    {
     "t": "p",
     "text": "The \\((1-\\eta\\lambda)\\) multiplicative factor \"decays\" weights each step."
    },
    {
     "t": "p",
     "text": "**L1 regularization:** Add \\(\\lambda||\\boldsymbol\\theta||_1\\):"
    },
    {
     "t": "math",
     "tex": "\\nabla J = \\nabla\\mathcal{L} + \\lambda\\text{sign}(\\boldsymbol\\theta)"
    },
    {
     "t": "p",
     "text": "Promotes sparse activations/weights."
    },
    {
     "t": "p",
     "text": "**Max-norm regularization:** Constrain \\(||\\mathbf{w}_i|| \\leq c\\) after each update. Used with dropout (prevents blow-up of unregularized weights)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Data augmentation — theoretical justification.",
   "body": [
    {
     "t": "p",
     "text": "By increasing the effective dataset size from \\(n\\) to \\(nK\\) (with \\(K\\) augmentations), the generalisation bound improves:"
    },
    {
     "t": "math",
     "tex": "\\epsilon_{test} \\lesssim \\sqrt{\\frac{\\mathcal{O}(\\text{model complexity})}{nK}}"
    },
    {
     "t": "p",
     "text": "**Key augmentations and invariances enforced:**"
    },
    {
     "t": "ul",
     "items": [
      "Horizontal flip → left-right equivariance",
      "Random crop → translation equivariance",
      "Color jitter → photometric invariance",
      "Mixup: \\(\\tilde{x} = \\lambda x_i + (1-\\lambda)x_j\\), \\(\\tilde{y} = \\lambda y_i + (1-\\lambda)y_j\\) — linear interpolation of examples and labels; improves calibration",
      "CutMix: replace patches from another image"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Epoch, batch, iteration — learning dynamics analysis.",
   "body": [
    {
     "t": "p",
     "text": "For dataset size \\(n\\), batch size \\(B\\):"
    },
    {
     "t": "ul",
     "items": [
      "Iterations per epoch = \\(\\lceil n/B \\rceil\\)",
      "Total gradient updates = epochs \\(\\times\\) iterations/epoch"
     ]
    },
    {
     "t": "p",
     "text": "**Effect of batch size on generalisation (Keskar et al., 2017):**"
    },
    {
     "t": "ul",
     "items": [
      "Small batch → noisy gradients → explores loss landscape → finds flatter minima → better generalisation",
      "Large batch → accurate gradient estimate → finds sharper minima → worse test performance (but same training loss)",
      "Linear scaling rule: when multiplying \\(B\\) by \\(k\\), multiply \\(\\eta\\) by \\(k\\) (maintains same weight update magnitude)"
     ]
    },
    {
     "t": "p",
     "text": "**Gradient noise scale:** \\(\\hat{S} = \\frac{||\\nabla\\mathcal{L}||^2}{\\mathbb{E}||\\mathbf{g}_i-\\nabla\\mathcal{L}||^2/B}\\) — optimal batch size = \\(\\hat{S}\\)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

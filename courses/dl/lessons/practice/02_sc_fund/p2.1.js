/* ============================================================================
   PRACTICE P2.1 — Fundamentals and Optimisation · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/01_Fundamentals_and_Optimization.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p2.1",
 "lede": "**25 scenarios** from Fundamentals and Optimisation. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each scenario out loud before revealing the answer",
  "Give the mechanism, not the slogan — the formula, the failure mode, the fix",
  "Recognise the pattern behind the question so the next variant is easy",
  "Mark the ones you got wrong and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "drill",
   "n": "1",
   "q": "What is the fundamental difference between deep learning and traditional machine learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Deep learning automatically learns hierarchical feature representations from raw data through multiple layers, while traditional ML requires manual feature engineering."
    },
    {
     "t": "p",
     "text": "**Explanation:** In image recognition, traditional ML needs hand-crafted features (SIFT, HOG). Deep learning learns low-level features (edges) → mid-level (textures) → high-level (objects) automatically. This hierarchical representation learning is what makes deep learning powerful for unstructured data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is a perceptron and why is it limited?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A perceptron is a single neuron: `output = activation(w·x + b)`. It can only learn linearly separable functions."
    },
    {
     "t": "p",
     "text": "**Example:** XOR problem cannot be solved by a single perceptron because XOR is not linearly separable."
    },
    {
     "t": "p",
     "text": "**Explanation:** Adding hidden layers (Multi-Layer Perceptron) overcomes this limitation by learning non-linear decision boundaries through composition of non-linear activations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is the Universal Approximation Theorem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A feedforward neural network with a single hidden layer containing a finite number of neurons can approximate any continuous function on compact subsets of ℝⁿ, given appropriate activation functions."
    },
    {
     "t": "p",
     "text": "**Explanation:** This is an existence theorem — it says such a network exists, not that gradient descent can find it. In practice, deep networks (many layers) are more efficient than wide networks (many neurons, one layer) for learning complex functions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is a loss function and why is it important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A loss function measures how far model predictions are from true values. It defines what the model optimizes."
    },
    {
     "t": "p",
     "text": "**Common losses:**"
    },
    {
     "t": "ul",
     "items": [
      "**MSE:** Regression, `L = (y - ŷ)²`",
      "**Cross-entropy:** Classification, `L = -y·log(ŷ)`",
      "**Hinge:** SVM-style, `L = max(0, 1 - y·ŷ)`"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Wrong loss function → wrong model behavior. Cross-entropy works better than MSE for classification because its gradient doesn't vanish when predictions are confident."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is forward propagation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The process of computing output from input by passing data through each layer sequentially:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input → Layer 1 (z₁ = W₁x + b₁, a₁ = σ(z₁)) → Layer 2 → ... → Output"
    },
    {
     "t": "p",
     "text": "**Explanation:** Each layer applies linear transformation (weights, biases) followed by non-linear activation. The final output gives the prediction, which is compared with true labels via the loss function."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is backpropagation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Algorithm to compute gradients of the loss with respect to all weights using the chain rule:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "∂L/∂W₁ = ∂L/∂a₃ · ∂a₃/∂z₃ · ∂z₃/∂a₂ · ∂a₂/∂z₂ · ∂z₂/∂W₁"
    },
    {
     "t": "p",
     "text": "**Explanation:** Backprop is simply efficient application of chain rule. It computes gradients backward from output to input. Without it, computing gradients would be exponentially expensive. Each layer stores intermediate activations in the forward pass for use in the backward pass."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the vanishing gradient problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Gradients become exponentially small as they propagate backward through many layers, effectively preventing early layers from learning."
    },
    {
     "t": "p",
     "text": "**Cause:** Activation functions like sigmoid/tanh have gradients < 1. Multiplying many small gradients → near-zero gradient."
    },
    {
     "t": "p",
     "text": "**Solutions:** ReLU activation, skip connections (ResNet), batch normalization, LSTM/GRU for sequences, proper initialization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is the exploding gradient problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Gradients become exponentially large during backpropagation, causing unstable training (NaN values, wild weight oscillations)."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "**Gradient clipping:** Cap gradient norms, `torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)`",
      "**Proper initialization** (He, Xavier)",
      "**Batch normalization**",
      "**Learning rate scheduling**"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Common in RNNs processing long sequences. Gradient clipping is the most direct fix."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Why do we need non-linear activation functions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Without non-linearity, stacking linear layers is equivalent to a single linear layer: `W₂(W₁x + b₁) + b₂ = W'x + b'`. No matter how many layers, the network can only learn linear functions."
    },
    {
     "t": "p",
     "text": "**Explanation:** Non-linear activations allow the network to learn complex, non-linear mappings. This is what gives deep networks their expressive power."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Compare ReLU, sigmoid, and tanh activation functions.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Property",
      "ReLU",
      "Sigmoid",
      "Tanh"
     ],
     "rows": [
      [
       "Range",
       "[0, ∞)",
       "(0, 1)",
       "(-1, 1)"
      ],
      [
       "Vanishing gradient",
       "Only for x<0",
       "Yes (x→±∞)",
       "Yes (x→±∞)"
      ],
      [
       "Zero-centered",
       "No",
       "No",
       "Yes"
      ],
      [
       "Computation",
       "Fast",
       "Slower",
       "Slower"
      ],
      [
       "Dead neurons",
       "Yes",
       "No",
       "No"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ReLU is default for hidden layers. Sigmoid for binary output. Tanh when zero-centered output needed. Leaky ReLU fixes dead neuron problem."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the \"dying ReLU\" problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** If a neuron's input is always negative, the gradient is always zero (ReLU outputs 0 for negative inputs). The neuron never updates and is permanently \"dead.\""
    },
    {
     "t": "p",
     "text": "**Cause:** Large learning rate pushes weights to produce only negative pre-activations."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Leaky ReLU: `f(x) = max(0.01x, x)`",
      "PReLU: `f(x) = max(αx, x)` where α is learned",
      "ELU: `f(x) = x if x>0, α(eˣ-1) if x≤0`",
      "Reduce learning rate"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is gradient descent and its variants?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Batch GD:** Uses entire dataset per update. Stable but slow.",
      "**Stochastic GD (SGD):** Uses one sample per update. Noisy but fast.",
      "**Mini-batch GD:** Uses a batch (32-256 samples). Best of both."
     ]
    },
    {
     "t": "p",
     "text": "**Update rule:** `θ = θ - η · ∂L/∂θ`"
    },
    {
     "t": "p",
     "text": "**Explanation:** Mini-batch GD is standard. Batch size affects: convergence speed, generalization, GPU utilization. Noisy gradients from SGD can help escape local minima."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is learning rate and why is it crucial?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Too high:** Overshoots the minimum, unstable training, may diverge",
      "**Too low:** Very slow convergence, may get stuck in poor local minimum",
      "**Just right:** Smooth, steady convergence"
     ]
    },
    {
     "t": "p",
     "text": "**Best practices:**"
    },
    {
     "t": "ol",
     "items": [
      "Learning rate finder (gradually increase, find steepest descent)",
      "Start high, decay over training (step, cosine, exponential)",
      "Warmup: start low, increase, then decay"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Learning rate is often the single most important hyperparameter. Use schedulers rather than fixed LR."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is the difference between SGD and Adam optimizer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**SGD:** `θ = θ - η·g` — pure gradient descent",
      "**SGD + Momentum:** `v = βv + g; θ = θ - η·v` — accelerated",
      "**Adam:** Adaptive LR per parameter using first and second moment estimates:"
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "  m = β₁m + (1-β₁)g     (first moment / mean)\n  v = β₂v + (1-β₂)g²    (second moment / variance)\n  θ = θ - η·m/(√v + ε)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Adam converges faster initially. SGD with momentum often generalizes better with proper tuning. Use Adam for quick prototyping, SGD+momentum for final training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is the role of bias in a neural network?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Bias allows the activation function to shift left or right, enabling the model to fit data that doesn't pass through the origin."
    },
    {
     "t": "p",
     "text": "**Without bias:** `y = Wx` — hyperplane must pass through origin."
    },
    {
     "t": "p",
     "text": "**With bias:** `y = Wx + b` — hyperplane can be at any position."
    },
    {
     "t": "p",
     "text": "**Explanation:** Analogous to intercept in linear regression. Each neuron has its own bias term. Essential for learning arbitrary functions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is weight initialization and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**All zeros:** Every neuron computes same gradient → symmetry problem",
      "**Too large:** Exploding activations/gradients",
      "**Too small:** Vanishing activations/gradients"
     ]
    },
    {
     "t": "p",
     "text": "**Recommended:**"
    },
    {
     "t": "ul",
     "items": [
      "**Xavier/Glorot:** For sigmoid/tanh. `W ~ N(0, 2/(fan_in + fan_out))`",
      "**He/Kaiming:** For ReLU. `W ~ N(0, 2/fan_in)`"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Proper initialization ensures activations and gradients neither explode nor vanish at the start of training. Sets the model up for smooth optimization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the difference between an epoch, batch, and iteration?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Epoch:** One complete pass through the entire training dataset",
      "**Batch:** Subset of training data used for one gradient update",
      "**Iteration:** One gradient update step"
     ]
    },
    {
     "t": "p",
     "text": "**Example:** 1000 samples, batch size 100 → 10 iterations per epoch."
    },
    {
     "t": "p",
     "text": "**Explanation:** Typical training: 10-300 epochs. Batch size 32-256 common. More iterations = more gradient updates = more learning (until overfitting)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is overfitting in deep learning and how do you detect it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Model memorizes training data instead of learning generalizable patterns."
    },
    {
     "t": "p",
     "text": "**Detection:** Training loss decreases but validation loss increases."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "More data / data augmentation",
      "Regularization (L1/L2, dropout, weight decay)",
      "Early stopping",
      "Simpler architecture",
      "Batch normalization"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Deep networks have millions of parameters — they can memorize entire datasets. Regularization is essential, not optional."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is dropout and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** During training, randomly set a fraction p of neuron outputs to zero at each step."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Conceptually:\nmask = torch.bernoulli(torch.ones_like(h) * (1-p))\nh = h * mask / (1-p)  # Scale by 1/(1-p) to maintain expected values"
    },
    {
     "t": "p",
     "text": "**Explanation:** Forces network to not rely on any single neuron. Acts as ensemble of 2ⁿ sub-networks. At test time, use all neurons but scale weights. Typical p: 0.2 for input, 0.5 for hidden layers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is batch normalization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Normalize activations within each mini-batch to have zero mean and unit variance, then apply learnable scale (γ) and shift (β):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "μ_B = mean(x_batch)\nσ²_B = var(x_batch)\nx̂ = (x - μ_B) / √(σ²_B + ε)\ny = γx̂ + β"
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces internal covariate shift (changing distribution of layer inputs during training). Allows higher learning rates, acts as mild regularizer. At test time, uses running mean/variance from training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "When do you use batch norm vs layer norm?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Batch Norm:** Normalizes across batch dimension. Good for CNNs, fixed-size inputs.",
      "**Layer Norm:** Normalizes across feature dimension. Good for RNNs, Transformers, variable sequence lengths."
     ]
    },
    {
     "t": "p",
     "text": "**Why:** Batch norm depends on batch statistics — fails with small batches or varying sequence lengths. Layer norm is independent of batch size."
    },
    {
     "t": "p",
     "text": "**Explanation:** Transformers exclusively use Layer Norm. CNNs typically use Batch Norm. Both stabilize training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is the softmax function and where is it used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Converts logits (raw scores) to probabilities:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "softmax(zᵢ) = exp(zᵢ) / Σⱼ exp(zⱼ)"
    },
    {
     "t": "p",
     "text": "**Properties:** Outputs sum to 1, all positive. Amplifies differences between logits."
    },
    {
     "t": "p",
     "text": "**Example:** logits [2.0, 1.0, 0.1] → softmax [0.659, 0.242, 0.099]"
    },
    {
     "t": "p",
     "text": "**Explanation:** Used as the final layer for multi-class classification. Combined with cross-entropy loss (numerically stable implementation uses LogSoftmax + NLLLoss)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is the difference between L1 and L2 regularization in deep learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**L1 (Lasso):** `Loss + λΣ|wᵢ|` — drives weights to exactly zero → sparsity",
      "**L2 (Ridge/Weight Decay):** `Loss + λΣwᵢ²` — shrinks weights toward zero → small but non-zero"
     ]
    },
    {
     "t": "p",
     "text": "**In practice:** L2 (weight decay) is far more common in deep learning. L1 can be useful for feature selection within the network. AdamW correctly implements L2 as decoupled weight decay."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is early stopping?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Stop training when validation performance stops improving for a specified number of epochs (patience)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "best_val_loss = float('inf')\npatience_counter = 0\nfor epoch in range(max_epochs):\n    val_loss = evaluate(model, val_loader)\n    if val_loss < best_val_loss:\n        best_val_loss = val_loss\n        save_checkpoint(model)\n        patience_counter = 0\n    else:\n        patience_counter += 1\n        if patience_counter >= patience:\n            break"
    },
    {
     "t": "p",
     "text": "**Explanation:** Simple and effective regularization. Prevents overfitting without modifying the model. Always restore best checkpoint."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is the difference between model parameters and hyperparameters?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Parameters:** Learned by the model (weights, biases). Updated by optimizer during training.",
      "**Hyperparameters:** Set by the practitioner before training. Not learned."
     ]
    },
    {
     "t": "p",
     "text": "**Examples of hyperparameters:** Learning rate, batch size, number of layers, dropout rate, optimizer choice, activation function."
    },
    {
     "t": "p",
     "text": "**Explanation:** Hyperparameters control the learning process. Tuned via grid search, random search, or Bayesian optimization."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

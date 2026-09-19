/* ============================================================================
   PRACTICE P9.3 — NLP and Neural Networks · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/09_NLP_and_Neural_Networks.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p9.3",
 "lede": "**25 scenarios** from NLP and Neural Networks. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "n": "51",
   "q": "What is a perceptron and how does it relate to logistic regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A perceptron is a single neuron: y = activation(w·x + b). With sigmoid activation, it's equivalent to logistic regression."
    },
    {
     "t": "p",
     "text": "**Explanation:** Perceptron: simplest neural unit. Can only learn linearly separable patterns. Multi-layer perceptron (MLP) overcomes this by stacking layers with non-linear activations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What is the role of activation functions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Introduce non-linearity. Without activations, stacking layers is just one big linear transformation (matrix multiplication)."
    },
    {
     "t": "p",
     "text": "**Common activations:**"
    },
    {
     "t": "ul",
     "items": [
      "**ReLU:** max(0, x) — simple, fast, most popular",
      "**Sigmoid:** 1/(1+e^-x) — outputs (0,1), vanishing gradients",
      "**Tanh:** (e^x - e^-x)/(e^x + e^-x) — outputs (-1,1)",
      "**Softmax:** Multi-class output probabilities"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ReLU is default for hidden layers. Sigmoid for binary output. Softmax for multi-class output."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is the vanishing gradient problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** In deep networks with sigmoid/tanh, gradients become exponentially small during backpropagation, making early layers learn extremely slowly."
    },
    {
     "t": "p",
     "text": "**Explanation:** Sigmoid derivative max = 0.25. Multiplying through many layers: 0.25^20 ≈ 10^-12. Solutions: ReLU, batch normalization, residual connections, better initialization (He/Xavier)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is the exploding gradient problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Gradients become exponentially large, causing weight updates to overflow."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Gradient clipping: cap gradient magnitude",
      "Proper initialization (Xavier/He)",
      "Batch normalization",
      "Learning rate reduction"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Common in RNNs. Gradient clipping: if ||gradient|| > threshold, scale down to threshold. Simple and effective."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What is backpropagation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Algorithm to compute gradients of loss with respect to all weights by applying chain rule from output to input layer."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "∂Loss/∂w = ∂Loss/∂output × ∂output/∂hidden × ∂hidden/∂w"
    },
    {
     "t": "p",
     "text": "**Explanation:** Forward pass: compute predictions. Backward pass: compute gradients. Update weights: w = w - lr × gradient. Foundation of neural network training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is the difference between batch, mini-batch, and stochastic gradient descent?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Batch GD:** Use entire dataset for each update (stable, slow)",
      "**Mini-batch GD:** Use subset (32-256 samples) per update (balanced)",
      "**Stochastic GD:** Use 1 sample per update (noisy, fast)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Mini-batch is standard practice. Batch size affects: convergence speed, generalization, memory usage. Larger batch → faster but may generalize worse."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What are common optimizers and when to use each?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**SGD + Momentum:** Simple, good generalization, needs tuning",
      "**Adam:** Adaptive learning rates, fast convergence, default choice",
      "**AdamW:** Adam with decoupled weight decay (better regularization)",
      "**RMSprop:** Good for RNNs"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Adam: maintains per-parameter learning rates based on gradient history. Converges faster than SGD. AdamW: fixes weight decay inconsistency in Adam."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is the learning rate and why is it the most important hyperparameter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Controls step size of weight updates: w_new = w_old - lr × gradient."
    },
    {
     "t": "ul",
     "items": [
      "**Too high:** Overshoots, unstable/diverges",
      "**Too low:** Very slow convergence, may get stuck",
      "**Just right:** Fast convergence to good minimum"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Use learning rate finder (increase lr exponentially, plot loss). Typically 1e-5 to 1e-1. Cosine annealing or warmup schedules improve training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is dropout and how does it prevent overfitting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Randomly sets a fraction of neuron outputs to zero during training. Forces network to learn redundant representations."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "nn.Dropout(p=0.5)  # Drop 50% of neurons randomly each forward pass"
    },
    {
     "t": "p",
     "text": "**Explanation:** Ensemble effect: each forward pass uses a different subnetwork. At inference: use all neurons, scale by (1-p). Typical: 0.1-0.5. Not used in batch norm layers typically."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is batch normalization and why does it help?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Normalizes layer inputs to zero mean and unit variance within each mini-batch, then applies learned scale and shift."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "BN(x) = γ × (x - μ_batch) / σ_batch + β"
    },
    {
     "t": "p",
     "text": "**Explanation:** Benefits: faster training, higher learning rates, slight regularization, reduces internal covariate shift. Applied before or after activation (debate). Uses running statistics at inference."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What is the difference between L1 and L2 regularization in neural networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**L1 (Lasso):** Adds |w| to loss → drives weights to exactly zero (sparse)",
      "**L2 (Weight decay):** Adds w² to loss → keeps weights small but non-zero"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** L2 is more common in neural networks (weight_decay parameter in optimizers). L1 leads to sparse networks. Both prevent overfitting by penalizing large weights."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is Xavier (Glorot) initialization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Initializes weights from distribution with variance = 2 / (fan_in + fan_out)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Normal: W ~ N(0, sqrt(2/(n_in + n_out)))\n# Uniform: W ~ U(-sqrt(6/(n_in + n_out)), sqrt(6/(n_in + n_out)))"
    },
    {
     "t": "p",
     "text": "**Explanation:** Designed for sigmoid/tanh activations. Keeps variance stable across layers. He initialization (variance = 2/fan_in) for ReLU activations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is a loss function and how do you choose one?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Binary classification:** Binary cross-entropy (BCELoss)",
      "**Multi-class classification:** Cross-entropy loss (softmax + NLL)",
      "**Regression:** MSE, MAE, Huber loss",
      "**Ranking:** Margin loss, triplet loss"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Loss function defines what the network optimizes. Must match the task. Custom losses for specific business needs (e.g., asymmetric loss for imbalanced data)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is the softmax function?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Converts raw scores (logits) to probabilities that sum to 1."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "softmax(z_i) = exp(z_i) / Σ exp(z_j)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Used as output layer for multi-class classification. Amplifies differences between logits. Temperature parameter T: softmax(z/T) — lower T → sharper distribution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is early stopping for neural networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Stop training when validation loss stops improving for a specified number of epochs (patience)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "early_stop = EarlyStopping(monitor='val_loss', patience=10, \n                           restore_best_weights=True)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Prevents overfitting without explicit regularization. Training loss continues to decrease while validation loss increases → overfitting point. Restore best weights from the epoch with lowest validation loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is the universal approximation theorem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A neural network with a single hidden layer of sufficient width can approximate any continuous function to arbitrary accuracy."
    },
    {
     "t": "p",
     "text": "**Explanation:** Guarantees existence, not learnability. Doesn't tell you: how many neurons, how to train, or if gradient descent will find the solution. Deep networks are more efficient approximators than wide ones."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is transfer learning in neural networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Using a pre-trained network (trained on large dataset) and adapting it to a new task."
    },
    {
     "t": "p",
     "text": "**Strategies:**"
    },
    {
     "t": "ol",
     "items": [
      "**Feature extraction:** Freeze pre-trained layers, train new head",
      "**Fine-tuning:** Unfreeze and train all layers with small lr",
      "**Progressive unfreezing:** Gradually unfreeze layers"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ImageNet-trained CNN for medical imaging. BERT for domain-specific NLP. Saves compute and works with small datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is the difference between fine-tuning and feature extraction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Feature extraction:** Pre-trained layers frozen. Only new layers train. Faster, less overfitting risk.",
      "**Fine-tuning:** All layers trainable (small lr for pre-trained, larger for new). Better adaptation but risk overfitting on small data."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Start with feature extraction. If performance insufficient, fine-tune with small lr (1e-5 to 1e-4). Freeze early layers (generic features) more aggressively."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is a residual connection (skip connection)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Adds the input of a layer directly to its output: output = F(x) + x."
    },
    {
     "t": "p",
     "text": "**Explanation:** Enables training of very deep networks (100+ layers). Gradient flows directly through skip connection. Network only needs to learn the residual F(x) = desired_output - x. Foundation of ResNet."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is a convolutional layer and how does it differ from dense layers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Dense (fully connected):** Each neuron connects to ALL inputs. Parameters: n_in × n_out.",
      "**Convolutional:** Small filter slides across input. Parameter sharing, local connectivity. Parameters: filter_size × filters."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** CNN: translation invariant, much fewer parameters for spatial data (images). Dense: no spatial structure assumed. CNN for images/sequences, Dense for tabular."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "When would you use a neural network vs traditional ML for tabular data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Traditional ML (XGBoost, Random Forest) is generally better for tabular data because:"
    },
    {
     "t": "ol",
     "items": [
      "Handles heterogeneous features naturally",
      "Fewer hyperparameters to tune",
      "Less data needed",
      "Handles missing values natively",
      "More interpretable"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Neural nets for tabular: TabNet, FT-Transformer sometimes match, rarely beat XGBoost. Use neural nets when: massive data, multimodal, representation learning needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is the role of the bias term in neural networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Allows the activation function to shift left/right, enabling the neuron to fit data that doesn't pass through the origin. **y = w×x + b** — b shifts the activation function."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without bias: line must pass through origin. With bias: can fit any intercept. Each neuron has its own bias. Small but important for flexibility."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is gradient checking and why is it useful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Verifying backpropagation correctness by comparing analytical gradients to numerical gradients:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "∂L/∂w ≈ [L(w+ε) - L(w-ε)] / (2ε)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Compare numerical approximation to backprop gradient. If they differ significantly (relative error > 1e-5), backprop implementation is buggy. Essential when implementing custom layers/losses."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is the dying ReLU problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Neurons with ReLU that output 0 for all inputs. Their gradients are 0, so they never update (permanently dead)."
    },
    {
     "t": "p",
     "text": "**Causes:** Large negative bias or very large learning rate."
    },
    {
     "t": "p",
     "text": "**Solutions:** Leaky ReLU (small slope for negative), PReLU (learnable slope), ELU, GELU."
    },
    {
     "t": "p",
     "text": "**Explanation:** Leaky ReLU: max(0.01x, x). GELU: smooth approximation used in BERT/GPT. Dying ReLU rarely a problem with He init + reasonable lr."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is data parallelism vs model parallelism?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Data parallelism:** Same model replicated on multiple GPUs, each processes different data batch. Gradients averaged.",
      "**Model parallelism:** Different parts of model on different GPUs. For models too large for one GPU."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Data parallelism: easy, scales batch size. Model parallelism: complex, for very large models (GPT-3+). Most common: data parallelism with PyTorch DDP."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

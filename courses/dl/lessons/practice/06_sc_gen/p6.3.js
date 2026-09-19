/* ============================================================================
   PRACTICE P6.3 — Generative Models · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/05_Generative_Models.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p6.3",
 "lede": "**25 scenarios** from Generative Models. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "What is an autoencoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Neural network trained to reconstruct its input through a bottleneck:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: input x → latent code z (compressed representation)\nDecoder: z → reconstructed x̂\nLoss: L = ||x - x̂||²  (reconstruction error)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Bottleneck forces model to learn efficient representation. z has lower dimensionality than x. Learns data compression. Not used for generation directly — latent space is not structured."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What is a Variational Autoencoder (VAE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Autoencoder with probabilistic latent space:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: x → q(z|x) = N(μ, σ²)   (outputs mean and variance)\nz ~ N(μ, σ²)                       (sample from distribution)\nDecoder: z → p(x|z)                (reconstruct from sample)\nLoss = Reconstruction + KL(q(z|x) || p(z))"
    },
    {
     "t": "p",
     "text": "**Explanation:** KL term regularizes latent space to be close to N(0,1). Enables generation: sample z ~ N(0,1) → decode → new data. Smooth, continuous latent space allows interpolation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is the reparameterization trick?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Make sampling differentiable for backpropagation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Instead of: z ~ N(μ, σ²)       (not differentiable)\nDo:         ε ~ N(0, 1)         (sample noise)\n            z = μ + σ × ε       (differentiable w.r.t. μ, σ)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Gradient can flow through μ and σ (learned parameters) but not through random sampling. Moving randomness to external ε makes the path differentiable. Essential for training VAEs with backpropagation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is the KL divergence loss in VAEs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "KL(q(z|x) || p(z)) = -½ Σ (1 + log(σ²) - μ² - σ²)"
    },
    {
     "t": "p",
     "text": "**Purpose:** Forces encoded distribution q(z|x) to be close to prior p(z) = N(0,1)."
    },
    {
     "t": "p",
     "text": "**Without KL:** Encoder could encode each input to a distinct point → no generation ability."
    },
    {
     "t": "p",
     "text": "**With KL:** Latent space is smooth, complete, and structured."
    },
    {
     "t": "p",
     "text": "**Explanation:** Balance: too much KL → latent space is pure noise (poor reconstruction). Too little → overfitting to training data (poor generation)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What is the β-VAE?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** VAE with weighted KL term: `Loss = Reconstruction + β × KL`"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "β > 1: Stronger disentanglement, worse reconstruction\nβ < 1: Better reconstruction, less structured latent space\nβ = 1: Standard VAE"
    },
    {
     "t": "p",
     "text": "**Explanation:** Higher β forces more information through bottleneck via structured latent space → each latent dimension captures a single factor of variation (size, color, orientation). Used for disentangled representation learning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is a denoising autoencoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train autoencoder to reconstruct clean input from corrupted input:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Corrupt: x̃ = corrupt(x)   (add noise, mask pixels, drop features)\nTrain: minimize ||decoder(encoder(x̃)) - x||²"
    },
    {
     "t": "p",
     "text": "**Explanation:** Forces encoder to learn robust representations (not just identity mapping). Different from standard AE which can simply learn identity if capacity is sufficient. Better features for downstream tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is a sparse autoencoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Add sparsity constraint — only few neurons active at a time:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss = Reconstruction + λ × Σ |a_i|  (L1 on activations)\nor KL divergence between desired and actual sparsity"
    },
    {
     "t": "p",
     "text": "**Explanation:** Forces each neuron to specialize. Different subsets of neurons activate for different inputs. Learns interpretable, overcomplete representations (can have more latent dimensions than input, but sparsity prevents trivial encoding)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is a contractive autoencoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Add penalty on the Jacobian of the encoder outputs with respect to inputs:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss = Reconstruction + λ × ||∂h/∂x||²_F  (Frobenius norm of Jacobian)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Penalizes sensitivity to input changes → learns smooth representations. Small changes in input → small changes in latent space. Related to denoising AE (both learn robust features) but approaches from different angle."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is VQ-VAE (Vector Quantized VAE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Uses discrete latent representations instead of continuous:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Encoder outputs continuous vector e\n2. Quantize: find nearest codebook entry z_q = argmin ||e - e_k||\n3. Decoder reconstructs from z_q"
    },
    {
     "t": "p",
     "text": "**Codebook:** Learned dictionary of discrete vectors. Like an embedding lookup."
    },
    {
     "t": "p",
     "text": "**Explanation:** Avoids \"posterior collapse\" (latent ignoring). Discrete tokens enable autoregressive modeling on top. VQ-VAE-2 generates high-quality images by autoregressive sampling of discrete codes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is posterior collapse in VAEs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Decoder ignores latent code z and generates output purely from its own capacity:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "q(z|x) collapses to p(z) = N(0,1) for all x\nKL becomes 0 (encoder gives no useful information)\nDecoder generates equally from any z → poor latent representation"
    },
    {
     "t": "p",
     "text": "**Causes:** Powerful decoder (autoregressive), too much KL weight."
    },
    {
     "t": "p",
     "text": "**Solutions:** KL annealing (start with low KL weight), free bits (minimum KL per dimension), weaker decoder, VQ-VAE."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What is KL annealing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Gradually increase KL weight during training:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Epoch 1-10: β = 0 → 0.1    (focus on reconstruction)\nEpoch 10-50: β = 0.1 → 1.0 (gradually add KL)\nAfter 50: β = 1.0           (standard VAE)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Prevents posterior collapse by first letting encoder/decoder learn useful representations, then gradually regularizing latent space. Cyclical annealing (reset β periodically) can also help."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is the ELBO (Evidence Lower Bound)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "log p(x) ≥ E_q[log p(x|z)] - KL(q(z|x) || p(z)) = ELBO"
    },
    {
     "t": "p",
     "text": "**Components:**"
    },
    {
     "t": "ul",
     "items": [
      "`E_q[log p(x|z)]`: Expected reconstruction quality",
      "`KL(q(z|x) || p(z))`: Penalty for deviating from prior"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** We can't compute p(x) directly. ELBO is a tractable lower bound. Maximizing ELBO maximizes a lower bound on data likelihood. VAE training = maximizing ELBO."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is conditional VAE (CVAE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generate data conditioned on a label or attribute:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: q(z | x, c)    (condition on x and class c)\nDecoder: p(x | z, c)    (generate x from z and class c)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Like conditional GAN but with VAE framework. Can generate digits of specific class, faces with specific attributes. Controllable generation with structured latent space."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What are the applications of autoencoders?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Dimensionality reduction:** Non-linear alternative to PCA",
      "**Anomaly detection:** High reconstruction error = anomaly",
      "**Denoising:** Remove noise from signals/images",
      "**Image compression:** Learned compression (vs JPEG)",
      "**Feature learning:** Pre-train encoder, use features for downstream tasks",
      "**Generation:** VAE for sampling new data"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Anomaly detection is one of the most practical applications. Train on normal data → abnormal data has high reconstruction error."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "How do autoencoders compare to PCA for dimensionality reduction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "PCA",
      "Autoencoder"
     ],
     "rows": [
      [
       "Type",
       "Linear",
       "Non-linear"
      ],
      [
       "Computation",
       "Closed-form solution",
       "Gradient descent"
      ],
      [
       "Reconstruction",
       "Optimal for linear",
       "Better for complex data"
      ],
      [
       "Interpretability",
       "Components have meaning",
       "Less interpretable"
      ],
      [
       "Speed",
       "Fast",
       "Slower"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Linear AE with MSE loss recovers PCA directions (equivalent). Non-linear AE captures more complex structure. Use PCA first; if insufficient, try AE."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is the ladder network?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combine supervised and unsupervised learning in an autoencoder-like architecture:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: noisy forward pass (with noise injection at each layer)\nDecoder: denoising path (reconstruct clean activations at each layer)\nLoss = supervised_loss + Σ denoising_loss_per_layer"
    },
    {
     "t": "p",
     "text": "**Explanation:** Semi-supervised learning: labels for some data + reconstruction for all data. Each layer has its own denoising objective. Achieved impressive semi-supervised results before self-supervised learning era."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is a convolutional autoencoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use convolutions in encoder and transposed convolutions in decoder:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: Conv → Pool → Conv → Pool → Bottleneck\nDecoder: UpConv → Conv → UpConv → Conv → Output"
    },
    {
     "t": "p",
     "text": "**Advantage:** Preserves spatial structure (unlike fully connected AE which flattens). Better for image data."
    },
    {
     "t": "p",
     "text": "**Explanation:** Convolutional layers are parameter-efficient for spatial data. Used for image denoising, super-resolution, segmentation as U-Net backbone."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is a masked autoencoder (MAE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Mask random patches of input image, train model to reconstruct masked patches:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Split image into patches\n2. Randomly mask 75% of patches\n3. Encode only visible patches (efficient!)\n4. Decode → reconstruct ALL patches (including masked)\n5. Loss: MSE only on masked patches"
    },
    {
     "t": "p",
     "text": "**Explanation:** Self-supervised pre-training for Vision Transformers. Very effective — masking 75% forces understanding of image structure. Encoder only processes 25% → fast training. Pre-trained features transfer well."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is the difference between deterministic and stochastic autoencoders?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Deterministic (AE):** Encoder outputs fixed latent code: z = f(x)",
      "**Stochastic (VAE):** Encoder outputs distribution: z ~ q(z|x) = N(μ, σ²)"
     ]
    },
    {
     "t": "p",
     "text": "**Implication:** Deterministic → holes in latent space (some z don't decode meaningfully). Stochastic → continuous latent space (better for generation)."
    },
    {
     "t": "p",
     "text": "**Explanation:** For generation, stochastic (VAE) is better. For representation learning or anomaly detection, deterministic is simpler and often sufficient."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is the Wasserstein Autoencoder (WAE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Replace KL divergence with Wasserstein distance to match aggregate posterior to prior:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss = Reconstruction + λ × W(q(z), p(z))"
    },
    {
     "t": "p",
     "text": "**vs VAE:** VAE matches per-sample q(z|x) to p(z). WAE matches aggregate q(z) = E[q(z|x)] to p(z)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Less pressure on each individual encoding → better reconstruction. Uses MMD (Maximum Mean Discrepancy) or adversarial training to measure distribution distance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "How do you choose the latent dimension for an autoencoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Too small:** Underfitting, poor reconstruction (information loss)",
      "**Too large:** Overfitting, may learn identity mapping (no compression)"
     ]
    },
    {
     "t": "p",
     "text": "**Heuristics:**"
    },
    {
     "t": "ul",
     "items": [
      "Start with data dimensionality / 10-100",
      "Plot reconstruction error vs latent dim → find \"elbow\"",
      "For VAE: KL divergence per dimension shows which dimensions are used"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Intrinsic dimensionality of data is the target. MNIST: ~10-20 dimensions capture most variation. ImageNet faces: 100-512."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is disentangled representation learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learning latent factors that are independent and correspond to meaningful attributes:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "z₁ = size    (changing z₁ changes only size)\nz₂ = color   (changing z₂ changes only color)\nz₃ = rotation (changing z₃ changes only rotation)"
    },
    {
     "t": "p",
     "text": "**Why:** Controllable generation, transfer learning, interpretability."
    },
    {
     "t": "p",
     "text": "**Methods:** β-VAE, FactorVAE, DIP-VAE."
    },
    {
     "t": "p",
     "text": "**Explanation:** Entangled: z₁ affects both size and color. Disentangled: each z controls exactly one attribute. Debate exists on whether unsupervised disentanglement is achievable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is the difference between undercomplete and overcomplete autoencoders?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Undercomplete:** Latent dimension < input dimension. Forces compression. Standard AE.",
      "**Overcomplete:** Latent dimension > input dimension. Can learn identity without compression."
     ]
    },
    {
     "t": "p",
     "text": "**Why overcomplete works:** With sparsity/denoising constraints, overcomplete AE learns useful features despite having more latent dimensions than input."
    },
    {
     "t": "p",
     "text": "**Explanation:** Overcomplete + sparsity → dictionary learning (like sparse coding). Each latent dimension captures a specific feature."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is anomaly detection with autoencoders?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Train on normal data only\nautoencoder.train(normal_data)\n\n# At test time: high reconstruction error = anomaly\nreconstruction_error = ||x - autoencoder(x)||²\nif reconstruction_error > threshold:\n    flag_as_anomaly(x)"
    },
    {
     "t": "p",
     "text": "**Why it works:** AE learns to reconstruct normal patterns. Abnormal data → high error (AE hasn't seen similar patterns)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Set threshold using validation set (with known anomalies). Works for manufacturing defects, fraud detection, medical abnormalities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is a sequence autoencoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Encoder-decoder for sequential data:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder LSTM: sequence → fixed-size latent vector\nDecoder LSTM: latent vector → reconstructed sequence"
    },
    {
     "t": "p",
     "text": "**Applications:** Text representation, sentence embeddings (Skip-Thought), time series compression."
    },
    {
     "t": "p",
     "text": "**Explanation:** Bottleneck forces learning of sequence-level features. Fixed-size representation useful for downstream tasks (classification, similarity search)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

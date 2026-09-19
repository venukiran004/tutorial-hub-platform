/* ============================================================================
   PRACTICE P6.4 — Generative Models · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/05_Generative_Models.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p6.4",
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
   "n": "76",
   "q": "What is the difference between VAE and normalizing flows?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "VAE",
      "Normalizing Flow"
     ],
     "rows": [
      [
       "Density",
       "Approximate (ELBO)",
       "Exact"
      ],
      [
       "Latent space",
       "Approximate posterior",
       "Exact posterior"
      ],
      [
       "Generation quality",
       "Blurry",
       "Can be sharp"
      ],
      [
       "Flexibility",
       "Limited encoder",
       "Bijective transformations"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Normalizing flows: chain of invertible transformations that map simple distribution to complex one. Exact log-likelihood. No reconstruction/KL trade-off. But: requires invertible architecture (restrictive)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is a normalizing flow?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Chain of invertible transformations:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "z₀ ~ p(z₀) = N(0, I)\nz₁ = f₁(z₀)\nz₂ = f₂(z₁)\n...\nx = f_K(z_{K-1})\n\nlog p(x) = log p(z₀) - Σ log|det(∂f_k/∂z_{k-1})|"
    },
    {
     "t": "p",
     "text": "**Key:** Each f_k must be invertible and have tractable Jacobian determinant."
    },
    {
     "t": "p",
     "text": "**Examples:** RealNVP, Glow, Neural Spline Flows."
    },
    {
     "t": "p",
     "text": "**Explanation:** Exact density estimation + generation. Trade-off: architectural constraints (invertibility) for exact likelihood."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is Glow?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generative flow model using invertible 1×1 convolutions:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Flow step: ActNorm → Invertible 1×1 Conv → Affine Coupling Layer\nMulti-scale: squeeze → flow steps → split"
    },
    {
     "t": "p",
     "text": "**Innovation:** Invertible 1×1 conv generalizes channel permutation (learned). ActNorm replaces batch norm."
    },
    {
     "t": "p",
     "text": "**Result:** High-quality face generation with exact likelihood and meaningful latent manipulations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is the affine coupling layer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Core building block of normalizing flows:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Split input: x = [x₁, x₂]\ny₁ = x₁                          (unchanged)\ny₂ = x₂ × exp(s(x₁)) + t(x₁)   (affine transform based on x₁)"
    },
    {
     "t": "p",
     "text": "**Invertible:** y₂ → x₂ = (y₂ - t(x₁)) × exp(-s(x₁)). s,t can be any neural network."
    },
    {
     "t": "p",
     "text": "**Explanation:** Half of input is unchanged, other half is transformed. Jacobian is triangular → determinant is easy. Alternate which half is unchanged."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is energy-based model (EBM) and how does it relate to autoencoders?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Assigns energy (scalar) to each input configuration:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "E(x) = energy function (low = likely, high = unlikely)\nP(x) ∝ exp(-E(x))"
    },
    {
     "t": "p",
     "text": "**Relation to AE:** Reconstruction error can be interpreted as energy. Low reconstruction = low energy = likely data."
    },
    {
     "t": "p",
     "text": "**Explanation:** EBMs are more general than VAEs/GANs. Training: make real data low energy, everything else high energy. MCMC sampling for generation (slow). Score-based models and diffusion are related."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is a Variational Information Bottleneck?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combine variational inference with Information Bottleneck principle:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "max I(Z; Y) - β × I(Z; X)\nZ contains enough info to predict Y but minimal info about X"
    },
    {
     "t": "p",
     "text": "**Explanation:** Learn compressed representation Z that is maximally predictive of target Y while being maximally compressed from input X. Generalizes VAE to supervised setting. β controls compression-prediction trade-off."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is Neural Discrete Representation Learning (VQ-VAE-2)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Hierarchical VQ-VAE for high-quality image generation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Level 1 (top): 32×32 codebook → captures global structure\nLevel 2 (bottom): 64×64 codebook → captures local details\nAutoregressive prior: PixelCNN samples codes → decoder produces image"
    },
    {
     "t": "p",
     "text": "**Result:** Generated images rivaling GANs with autoencoder-based approach."
    },
    {
     "t": "p",
     "text": "**Explanation:** Two-level hierarchy captures different scales. Autoregressive prior enables high-quality sampling. Key insight: separate representation learning from generation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is DALL-E (original) architecture?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Stage 1: VQ-VAE encodes images as 32×32 grid of 8192 codebook tokens\nStage 2: Autoregressive Transformer generates image tokens conditioned on text tokens"
    },
    {
     "t": "p",
     "text": "**Input:** Text tokens + image tokens as single sequence."
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces image generation to sequence generation. 12B parameter Transformer. Text-image generation as next-token prediction. DALL-E 2 uses CLIP + diffusion (different approach)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is the relationship between autoencoders and self-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Autoencoders are one form of self-supervised learning (learning from data itself):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "AE: reconstruct input → learns representations as byproduct\nContrastive: learn similar/different → learns representations\nMasked prediction: predict masked parts → learns representations"
    },
    {
     "t": "p",
     "text": "**Explanation:** Modern self-supervised learning (SimCLR, BYOL, DINO, MAE) has largely replaced traditional autoencoders for representation learning. But autoencoder principle (encode-decode) remains foundational."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "How do autoencoders handle missing data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Training: mask missing values, compute loss only on observed values\nx_masked = x * mask  # Zero out missing values\nx_reconstructed = autoencoder(x_masked)\nloss = ((x_reconstructed - x) * mask).pow(2).sum() / mask.sum()"
    },
    {
     "t": "p",
     "text": "**Imputation:** After training, feed data with missing values → decoder fills in missing positions."
    },
    {
     "t": "p",
     "text": "**Explanation:** AE learns data structure from observed values → can infer missing ones. Works well when missingness is random. For systematic missingness, be careful of bias."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is a Transformer autoencoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use Transformer architecture as encoder and decoder:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: Self-attention on input sequence → latent representation\nBottleneck: Compress to fixed-size or reduced sequence\nDecoder: Cross-attention to latent + self-attention → reconstruction"
    },
    {
     "t": "p",
     "text": "**Example:** BERT is essentially a masked autoencoder with Transformer."
    },
    {
     "t": "p",
     "text": "**Explanation:** Transformer AEs handle sequential data well. Used for text representation, music generation, molecular design."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the difference between generative and discriminative autoencoders?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Generative (VAE):** Learns to generate new data. Structured latent space. Sampling.",
      "**Discriminative (standard AE):** Learns representations for downstream tasks. No generation focus."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Use generative when you need: sampling, interpolation, density estimation. Use discriminative when you need: features for classification, anomaly detection, compression."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is a hierarchical VAE?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multiple levels of latent variables:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "z_L → z_{L-1} → ... → z_1 → x\np(z_l | z_{l+1}) at each level"
    },
    {
     "t": "p",
     "text": "**Example:** NVAE — deep hierarchical VAE with residual blocks at each level."
    },
    {
     "t": "p",
     "text": "**Benefit:** Captures data at multiple scales/abstraction levels. Top levels: global structure. Bottom levels: fine details."
    },
    {
     "t": "p",
     "text": "**Explanation:** Shallow VAEs can't capture complex distributions well. Hierarchical structure enables progressive refinement. NVAE achieved near-GAN quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is the relationship between autoencoders and diffusion models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Latent Diffusion (Stable Diffusion):** Run diffusion in AE's latent space instead of pixel space:"
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Train VAE: image ↔ latent representation\n2. Run diffusion process in latent space (much smaller)\n3. Sample latent → decode to image"
    },
    {
     "t": "p",
     "text": "**Explanation:** Pixel-space diffusion is expensive (high resolution). Latent space is compressed (4-8× smaller) → much faster diffusion. Stable Diffusion = autoencoder + latent diffusion."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is Adversarial Autoencoder (AAE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Replace KL divergence with adversarial training to match posterior to prior:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: x → z (deterministic or stochastic)\nDecoder: z → x̂\nDiscriminator: distinguish samples from q(z) vs p(z)"
    },
    {
     "t": "p",
     "text": "**vs VAE:** KL divergence requires specific distributional form. Adversarial matching works with any prior distribution."
    },
    {
     "t": "p",
     "text": "**Explanation:** Can impose arbitrary prior (mixture of Gaussians, uniform, Swiss roll). More flexible than VAE's KL constraint. Combines autoencoder and GAN principles."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is a Variational RNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** RNN with stochastic latent variables at each time step:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Prior:     p(z_t | h_{t-1})\nPosterior: q(z_t | h_{t-1}, x_t)\nz_t ~ posterior\nRecurrence: h_t = f(h_{t-1}, x_t, z_t)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard RNN is deterministic given input. VRNN adds stochasticity → better modeling of uncertainty in sequential data. Captures variability in time series, speech, handwriting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is the reconstruction loss choice for different data types?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Data Type",
      "Reconstruction Loss"
     ],
     "rows": [
      [
       "Binary (MNIST)",
       "Binary Cross-Entropy"
      ],
      [
       "Real-valued (images)",
       "MSE or Gaussian log-likelihood"
      ],
      [
       "Categorical",
       "Cross-Entropy"
      ],
      [
       "Mixed",
       "Sum of appropriate losses"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** MSE assumes Gaussian noise. BCE assumes Bernoulli distribution. Match loss to data distribution. Wrong loss → poor reconstruction or training instability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is the concept of \"holes\" in latent space?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Regions in latent space that don't correspond to valid data:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard AE: training data maps to sparse points → most of space is \"holes\"\nVAE: KL regularization fills space → fewer holes"
    },
    {
     "t": "p",
     "text": "**Problem:** Sampling from holes → garbage output."
    },
    {
     "t": "p",
     "text": "**Explanation:** Why VAE's KL loss is important: forces encoder to spread representations across space. But too much smoothing → blurry outputs (all data maps to similar region)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is the Gumbel-Softmax trick?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Differentiable approximation to discrete sampling:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "y = softmax((log(π) + g) / τ)\nwhere g ~ Gumbel(0,1), τ = temperature"
    },
    {
     "t": "p",
     "text": "**As τ → 0:** Approaches one-hot (discrete). **τ → ∞:** Approaches uniform (continuous)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Used in VQ-VAE variants, discrete latent variable models, text generation. Enables gradient-based training with discrete choices. Alternative to REINFORCE (lower variance)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is a memory-augmented autoencoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Add external memory module to autoencoder:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder → query memory → combine with encoding → Decoder\nMemory: set of learned prototypical patterns"
    },
    {
     "t": "p",
     "text": "**For anomaly detection:** Normal patterns stored in memory. Abnormal data can't find matching memory → high reconstruction error."
    },
    {
     "t": "p",
     "text": "**Explanation:** Memory constrains reconstruction to only normal patterns. Prevents autoencoder from being too good (reconstructing anomalies too)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is the relationship between compression and representation learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Good compression = good representation (Minimum Description Length principle):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Better compression → captures more data structure → more useful features"
    },
    {
     "t": "p",
     "text": "**AE bottleneck = compression.** Smaller bottleneck = more compression = more abstraction."
    },
    {
     "t": "p",
     "text": "**Explanation:** Lossy compression retains important patterns, discards noise. This is exactly what good features do. Information theory provides theoretical foundation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is a Symmetric autoencoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Encoder and decoder have symmetric (mirror) architecture:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: [Conv64 → Conv128 → Conv256 → FC]\nDecoder: [FC → DeConv256 → DeConv128 → DeConv64]"
    },
    {
     "t": "p",
     "text": "**Explanation:** Symmetry is a design choice, not a requirement. Popular because it ensures same capacity for encoding and decoding. Some asymmetric designs work better (larger decoder for generation)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "How do autoencoders handle multi-modal data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "# Separate encoders per modality, shared latent space\nz_image = encoder_image(image)\nz_text = encoder_text(text)\nz = combine(z_image, z_text)  # concatenate, average, or attention\n\n# Decode to any modality\nreconstructed_image = decoder_image(z)\nreconstructed_text = decoder_text(z)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Cross-modal retrieval: encode text → search image space. Translation: encode image → decode to text (captioning). Shared latent space must align modalities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What are the failure modes of VAEs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Blurry outputs:** MSE loss averages over modes → blurriness",
      "**Posterior collapse:** Decoder ignores z (powerful decoder + KL)",
      "**Poor sample quality:** Limited expressiveness of Gaussian posterior",
      "**Under-fitting:** Bottleneck too small for data complexity"
     ]
    },
    {
     "t": "p",
     "text": "**Solutions:** Perceptual loss (instead of MSE), KL annealing, VQ-VAE, hierarchical latent spaces."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "What is the future of autoencoder-based models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Latent diffusion:** AE + diffusion = Stable Diffusion (dominant approach)",
      "**Tokenization:** VQ-VAE converts continuous data to discrete tokens for LLM processing",
      "**Multi-modal:** Encode/decode across modalities",
      "**World models:** AE learns compressed world state for decision-making",
      "**Scientific discovery:** Latent spaces for protein structure, molecular design"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Pure autoencoders are less common. But the encoder-decoder principle is fundamental and appears in almost every generative model architecture."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

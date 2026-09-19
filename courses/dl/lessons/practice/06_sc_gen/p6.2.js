/* ============================================================================
   PRACTICE P6.2 — Generative Models · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/05_Generative_Models.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p6.2",
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
   "n": "26",
   "q": "What is the role of noise in GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "z = torch.randn(batch_size, latent_dim)  # Random noise input\nfake_images = generator(z)"
    },
    {
     "t": "p",
     "text": "**Purpose:** Noise provides randomness/diversity. Different z → different outputs. Latent space topology determines generation quality."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without noise, generator would produce same output every time. Noise dimension (latent_dim) affects diversity. Too low → limited diversity. Too high → harder to train. 128-512 typical."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is label smoothing for GAN discriminator?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Instead of training D with labels {0, 1}, use {0, 0.9}:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Real label: 0.9 instead of 1.0 (one-sided smoothing)\nFake label: 0 (keep at 0, don't smooth)"
    },
    {
     "t": "p",
     "text": "**Why:** Prevents discriminator from becoming too confident, which provides more useful gradients to generator."
    },
    {
     "t": "p",
     "text": "**Explanation:** Only smooth real labels (one-sided). Smoothing fake labels would encourage generator to produce more \"fake-looking\" samples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is a GAN for text generation and why is it hard?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generating discrete text with GANs is challenging:"
    },
    {
     "t": "p",
     "text": "**Problem:** Discrete tokens → can't backpropagate gradient through sampling."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "SeqGAN: REINFORCE algorithm for discrete generation",
      "RelGAN: Gumbel-softmax for continuous relaxation",
      "MaskGAN: Fill in masked text"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GANs work naturally with continuous data (images). Discrete data requires RL or continuous relaxation tricks. LLMs with next-token prediction have largely superseded GAN text generation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is an adversarial attack vs adversarial training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Adversarial attack:** Craft inputs that fool a model (add imperceptible noise → misclassification)",
      "**Adversarial training:** Train model on adversarial examples to be robust"
     ]
    },
    {
     "t": "p",
     "text": "**GAN connection:** GANs use adversarial training (D vs G), but this is different from adversarial robustness."
    },
    {
     "t": "p",
     "text": "**Explanation:** Adversarial examples: `x_adv = x + ε·sign(∇_x L)` (FGSM). Small ε → imperceptible to humans but fools model. Training on these makes model robust."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is image-to-image translation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Transform images from one domain to another:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Paired: Sketch → Photo (Pix2Pix)\nUnpaired: Horse → Zebra (CycleGAN)\nMulti-domain: Young ↔ Old ↔ Male ↔ Female (StarGAN)"
    },
    {
     "t": "p",
     "text": "**Key question:** Is paired data available? Paired → Pix2Pix (simpler, better quality). Unpaired → CycleGAN (cycle consistency constraint)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is StarGAN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multi-domain image-to-image translation with single model:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "G(x, c) → image x in domain c\nOne generator handles ALL domain translations"
    },
    {
     "t": "p",
     "text": "**vs CycleGAN:** Need 2 generators per domain pair. For n domains: n(n-1) generators."
    },
    {
     "t": "p",
     "text": "**StarGAN:** 1 generator for ALL pairs."
    },
    {
     "t": "p",
     "text": "**Explanation:** Auxiliary classifier + cycle consistency + adversarial loss. Domain c is concatenated with input. Eficiently handles many domains (hair color, age, expression)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is neural style transfer using GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Original (Gatys et al.):** Optimization-based — slow. Not GAN."
    },
    {
     "t": "p",
     "text": "**Fast neural style:** Train feedforward network (takes ~1 second):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Style image → compute style features (Gram matrices)\nContent image → generator → stylized image\nLoss = content_loss (feature match) + style_loss (Gram match)"
    },
    {
     "t": "p",
     "text": "**AdaIN:** Adaptive Instance Normalization — real-time arbitrary style transfer."
    },
    {
     "t": "p",
     "text": "**Explanation:** GAN-based: add discriminator to encourage realistic stylized outputs. Perceptual loss from VGG features measures content and style similarity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is the latent space of a GAN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The input noise space z from which generator creates data:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Properties of good latent space:\n1. Continuous: small change in z → small change in output\n2. Smooth: interpolation between z₁ and z₂ → meaningful transition\n3. Complete: every z maps to realistic output"
    },
    {
     "t": "p",
     "text": "**Latent space manipulation:** Find direction for \"smiling\" → add to any face's z → face starts smiling."
    },
    {
     "t": "p",
     "text": "**Explanation:** GANs often have entangled latent spaces. StyleGAN's W space is more disentangled. Latent space exploration enables controlled editing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is GAN interpolation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Smoothly transition between two generated images:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "z1, z2 = torch.randn(1, 128), torch.randn(1, 128)\nfor alpha in [0, 0.2, 0.4, 0.6, 0.8, 1.0]:\n    z_interp = (1-alpha) * z1 + alpha * z2  # Linear interpolation in latent space\n    img = generator(z_interp)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Smooth interpolation = well-structured latent space. Spherical interpolation (slerp) often works better (stays on the manifold). Sharp transitions or artifacts indicate poor latent space structure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is feature matching loss?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train generator to match feature statistics of real data:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L_FM = ||E[f(x_real)] - E[f(G(z))]||²\nf = intermediate discriminator features"
    },
    {
     "t": "p",
     "text": "**Explanation:** Instead of trying to maximize D(G(z)), match internal feature representations. More stable training signal. Prevents generator from focusing on fooling D's final decision."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is the difference between GAN and diffusion models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "GAN",
      "Diffusion"
     ],
     "rows": [
      [
       "Training",
       "Adversarial (unstable)",
       "Denoising (stable)"
      ],
      [
       "Generation",
       "Single forward pass (fast)",
       "Many denoising steps (slow)"
      ],
      [
       "Quality",
       "Very good",
       "State-of-the-art"
      ],
      [
       "Diversity",
       "Mode collapse risk",
       "Full coverage"
      ],
      [
       "Control",
       "Less controllable",
       "Highly controllable"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Diffusion models have largely replaced GANs for image generation (Stable Diffusion, DALL-E 2, Midjourney). GANs still useful where speed matters (real-time generation, video)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is a GAN for video generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generate temporally coherent video sequences:"
    },
    {
     "t": "p",
     "text": "**Challenges:**"
    },
    {
     "t": "ol",
     "items": [
      "Temporal consistency (no flickering)",
      "Long-term coherence",
      "Massive computation"
     ]
    },
    {
     "t": "p",
     "text": "**Approaches:** 3D convolutions, temporal discriminator, motion models (optical flow)."
    },
    {
     "t": "p",
     "text": "**Explanation:** DVD-GAN, MoCoGAN, VideoGPT. Video generation is much harder than image generation. Current models generate short clips (a few seconds). Diffusion-based video models (Sora) are now leading."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is the truncation trick in GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** At inference, sample z from truncated normal distribution instead of full normal:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "z = torch.randn(batch_size, latent_dim)\nz = torch.clamp(z, -truncation, truncation)  # or resampling"
    },
    {
     "t": "p",
     "text": "**Effect:** Lower truncation → higher quality but less diversity. Higher truncation → more diversity but lower quality."
    },
    {
     "t": "p",
     "text": "**Explanation:** Truncation=1.0 is standard normal. Truncation=0.5 restricts to more \"typical\" latent vectors. Commonly used in BigGAN, StyleGAN for quality-diversity trade-off."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is domain adaptation using adversarial training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn domain-invariant features using adversarial loss:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Feature extractor → task classifier (predict labels)\n                  → domain classifier (predict source/target domain)\nAdversarial: feature extractor trained to FOOL domain classifier"
    },
    {
     "t": "p",
     "text": "**Explanation:** Gradient reversal layer negates domain classifier gradient. Features become domain-invariant → model transfers from labeled source to unlabeled target domain."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the difference between implicit and explicit density models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Explicit:** Model defines P(x) explicitly. Can compute density. VAE, normalizing flows.",
      "**Implicit:** Model generates samples but P(x) is not tractable. GANs."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GANs: can sample from distribution but can't compute P(x) for a given x. VAEs: can compute P(x) approximately. Normalizing flows: exact P(x) via change of variables. Diffusion: explicit density via ELBO."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is a Wasserstein distance intuitively?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Minimum cost to transform one distribution into another (Earth Mover's Distance):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Imagine piles of dirt (distribution P) that must be moved to fill holes (distribution Q).\nWasserstein distance = minimum total work (mass × distance)."
    },
    {
     "t": "p",
     "text": "**Why better for GANs:** Provides smooth, continuous gradient signal even when distributions don't overlap (unlike KL divergence which can be infinite)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the generator architecture evolution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "DCGAN (2014): Transposed convolutions, batch norm, ReLU\nResNet Generator (2017): Residual blocks, skip connections\nStyleGAN (2019): Mapping network + AdaIN style injection\nDiffusion U-Net (2020+): U-Net with attention for denoising"
    },
    {
     "t": "p",
     "text": "**Explanation:** Architecture improvements: deeper networks, better normalization, skip connections, attention. StyleGAN's mapping network (z→w) was key innovation for controllability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is a GAN for 3D generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generate 3D objects (meshes, point clouds, implicit representations):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Approaches:\n1. Voxel-based: 3D convolutions (memory-intensive)\n2. Point cloud: PointNet-based generator\n3. Implicit (NeRF-GAN): Neural radiance field + adversarial training\n4. Mesh-based: Generate mesh vertices and faces"
    },
    {
     "t": "p",
     "text": "**Explanation:** 3D generation is harder (additional dimension, various representations). Text-to-3D (DreamFusion) uses diffusion models with NeRF. Applications: gaming, AR/VR, product design."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "What is the gradient penalty in WGAN-GP?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Enforce Lipschitz constraint via penalty on gradient norm:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L = E[D(x_fake)] - E[D(x_real)] + λ × E[(||∇D(x̂)||₂ - 1)²]\nx̂ = ε×x_real + (1-ε)×x_fake   (random interpolation)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Penalty ensures gradient norm ≈ 1 everywhere between real and fake distributions. λ=10 standard. Better than weight clipping (maintains weight capacity). No mode collapse."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is self-supervised GAN training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Add self-supervised task (rotation prediction) to discriminator:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "D outputs: real/fake score + rotation prediction (0°, 90°, 180°, 270°)"
    },
    {
     "t": "p",
     "text": "**Benefit:** Discriminator learns better features. Prevents forgetting. Improves FID."
    },
    {
     "t": "p",
     "text": "**Explanation:** Self-supervised auxiliary task prevents discriminator from overfitting to trivial real/fake distinction. Forces learning of meaningful features that benefit generator training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is differentiable augmentation for GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Apply random augmentations to BOTH real and fake images before discriminator:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "real_aug = augment(real_images)   # Color, translation, cutout\nfake_aug = augment(fake_images)\nloss_D = D(real_aug) - D(fake_aug)"
    },
    {
     "t": "p",
     "text": "**Explanation:** With limited data, discriminator overfits to training images. Augmenting both real and fake prevents this. Augmentation must be applied to both (otherwise discriminator detects augmentation artifacts as \"fake\"). Enables training with as few as 100 images."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the role of the discriminator in GAN convergence?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Discriminator provides the learning signal for the generator:"
    },
    {
     "t": "ul",
     "items": [
      "**Too strong D:** Generator gets zero gradient → no learning",
      "**Too weak D:** No useful feedback → generator produces garbage",
      "**Balanced D:** Provides informative gradients → generator improves"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Balance is crucial. TTUR (different learning rates) helps. Don't train D to convergence before each G step. Typical: 1-5 D steps per G step."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is a BigGAN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Large-scale GAN for ImageNet generation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Key techniques:\n1. Large batch size (2048)\n2. Class-conditional batch norm\n3. Orthogonal regularization\n4. Truncation trick\n5. Massive model (87M+ params)"
    },
    {
     "t": "p",
     "text": "**Result:** First GAN to generate 256×256 images of 1000 ImageNet classes at high quality. FID=7.4."
    },
    {
     "t": "p",
     "text": "**Explanation:** Showed scaling (model size, batch size) dramatically improves GAN quality. But unstable — training often collapses eventually (\"mode collapse at scale\")."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What are the ethical concerns with GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Deepfakes:** Realistic fake videos of real people",
      "**Misinformation:** Generate fake news images",
      "**Identity theft:** Clone someone's appearance/voice",
      "**Non-consensual content:** Generate fake intimate images",
      "**Art forgery:** Generate art in others' styles"
     ]
    },
    {
     "t": "p",
     "text": "**Mitigation:** Watermarking, detection tools, legislation, responsible AI guidelines."
    },
    {
     "t": "p",
     "text": "**Explanation:** GAN technology is dual-use. Same technology that helps medical imaging can create deepfakes. Detection research races against generation quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "When should you use GANs vs diffusion models vs VAEs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**GANs:** When speed matters (real-time), specific domains (face editing), adversarial training benefits",
      "**Diffusion:** Highest quality, controllable, diverse outputs. Accept slower generation.",
      "**VAEs:** Smooth latent space needed, density estimation, simpler training"
     ]
    },
    {
     "t": "p",
     "text": "**Current trend:** Diffusion dominates image generation. GANs for real-time applications. VAEs for representation learning."
    },
    {
     "t": "p",
     "text": "**Explanation:** Diffusion models (2022+) have largely replaced GANs for image generation quality. But GANs remain faster and relevant in specific applications."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

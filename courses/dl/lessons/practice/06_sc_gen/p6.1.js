/* ============================================================================
   PRACTICE P6.1 — Generative Models · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/05_Generative_Models.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p6.1",
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
   "n": "1",
   "q": "What is a GAN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Two networks trained adversarially:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Generator G: Random noise z → fake data G(z)\nDiscriminator D: Data → P(real)\nTraining: G tries to fool D. D tries to distinguish real from fake."
    },
    {
     "t": "p",
     "text": "**Loss:** `min_G max_D E[log D(x)] + E[log(1 - D(G(z)))]`"
    },
    {
     "t": "p",
     "text": "**Explanation:** Generator learns to produce realistic data. Discriminator learns to detect fakes. Equilibrium: generator produces data indistinguishable from real. Nash equilibrium of a minimax game."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is mode collapse in GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generator produces only a few types of outputs, ignoring diversity in real data."
    },
    {
     "t": "p",
     "text": "**Example:** Trained on all digits 0-9, but generator only produces \"1\" and \"7.\""
    },
    {
     "t": "p",
     "text": "**Causes:** Generator finds \"safe\" outputs that consistently fool discriminator."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Wasserstein loss (WGAN)",
      "Minibatch discrimination",
      "Unrolled GANs",
      "Feature matching"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Fundamental GAN challenge. Generator finds the easiest way to fool discriminator rather than covering full distribution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is the Wasserstein GAN (WGAN)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Uses Earth Mover's Distance instead of JS divergence:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss_D = E[D(x)] - E[D(G(z))]     (maximize)\nLoss_G = -E[D(G(z))]               (minimize)\nD must be 1-Lipschitz: enforce via weight clipping or gradient penalty"
    },
    {
     "t": "p",
     "text": "**Benefits:** Stable training, meaningful loss correlating with sample quality, no mode collapse."
    },
    {
     "t": "p",
     "text": "**Explanation:** JS divergence is 0 when distributions don't overlap → zero gradients. Wasserstein distance provides gradients even when distributions don't overlap. WGAN-GP uses gradient penalty instead of weight clipping."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is conditional GAN (cGAN)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generate data conditioned on additional information (class label, text, etc.):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "G(z, c) → fake image of class c\nD(x, c) → P(real image of class c)"
    },
    {
     "t": "p",
     "text": "**Example:** Generate handwritten digits: G(noise, \"5\") → image of digit 5."
    },
    {
     "t": "p",
     "text": "**Explanation:** Gives control over generation. Text-to-image, image-to-image translation, super-resolution all use conditional generation. Pix2Pix is a famous conditional GAN."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is Pix2Pix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Conditional GAN for paired image-to-image translation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: source image (e.g., sketch)\nOutput: target image (e.g., photo)\nLoss = cGAN_loss + λ × L1_loss"
    },
    {
     "t": "p",
     "text": "**L1 loss:** Ensures output is close to ground truth (prevents blurriness that L2 causes)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Requires paired training data (sketch↔photo). U-Net generator with skip connections. PatchGAN discriminator classifies NxN patches. Applications: edges→photos, maps→satellite, day→night."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is CycleGAN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Unpaired image-to-image translation using cycle consistency:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "G_AB: domain A → domain B       G_BA: domain B → domain A\nCycle consistency: G_BA(G_AB(a)) ≈ a   and   G_AB(G_BA(b)) ≈ b"
    },
    {
     "t": "p",
     "text": "**No paired data needed.** Learn mapping from unpaired images of horses and zebras."
    },
    {
     "t": "p",
     "text": "**Explanation:** Cycle consistency prevents mode collapse and ensures content is preserved. Two generators + two discriminators. Applications: style transfer, domain adaptation, photo enhancement."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the PatchGAN discriminator?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Instead of classifying entire image as real/fake, classifies each N×N patch:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard D: image → single score (real/fake)\nPatchGAN D: image → grid of scores (each for a patch)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Captures high-frequency texture quality. Each patch acts as an independent discriminator. Fewer parameters. Can be applied to any image size. 70×70 patches common."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is StyleGAN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generates high-quality images with style control at different levels:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Mapping network: z → w (intermediate latent space)\nSynthesis network: constant → image, with w injected at each layer via AdaIN"
    },
    {
     "t": "p",
     "text": "**Style injection at different layers:**"
    },
    {
     "t": "ul",
     "items": [
      "Coarse (4×4-8×8): pose, face shape",
      "Middle (16×16-32×32): facial features, hairstyle",
      "Fine (64×64+): color scheme, micro-features"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Separates high-level (style) from low-level (detail). State-of-the-art face generation. Progressive growing for stability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is the problem of training instability in GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** GANs are notoriously hard to train:"
    },
    {
     "t": "ol",
     "items": [
      "**Oscillation:** G and D keep outperforming each other without convergence",
      "**Vanishing gradients:** Strong D → G gets no useful gradient",
      "**Mode collapse:** G produces limited variety"
     ]
    },
    {
     "t": "p",
     "text": "**Solutions:** WGAN-GP, spectral normalization, progressive training, careful hyperparameter tuning, two-timescale update rule (TTUR)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is spectral normalization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Normalize weight matrices by their spectral norm (largest singular value):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "W̄ = W / σ(W)    where σ(W) = largest singular value"
    },
    {
     "t": "p",
     "text": "**Effect:** Constrains discriminator to be 1-Lipschitz continuous."
    },
    {
     "t": "p",
     "text": "**Explanation:** Replaces weight clipping (WGAN) and gradient penalty (WGAN-GP). Applied per layer. Stabilizes discriminator. No extra loss terms. Simpler and effective."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is progressive growing of GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Start training with low resolution, progressively add higher-resolution layers:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Phase 1: 4×4 resolution\nPhase 2: 4×4 → 8×8\nPhase 3: 8×8 → 16×16\n... until 1024×1024"
    },
    {
     "t": "p",
     "text": "**Explanation:** Each phase trains on an easier problem. New layers faded in gradually (interpolation with existing output). First to generate 1024×1024 faces. Basis for StyleGAN."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the Fréchet Inception Distance (FID)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Measures quality and diversity of generated images:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "FID = ||μ_real - μ_gen||² + Tr(Σ_real + Σ_gen - 2(Σ_real × Σ_gen)^½)"
    },
    {
     "t": "p",
     "text": "Computed on Inception v3 features of real and generated images. **Lower FID = better.** Captures both quality and diversity."
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard GAN evaluation metric. IS (Inception Score) measures quality but not diversity. FID measures both. FID=0 means identical distributions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the Inception Score (IS)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "IS = exp(E[KL(p(y|x) || p(y))])"
    },
    {
     "t": "ul",
     "items": [
      "**High p(y|x):** Generated images should be classifiable (quality)",
      "**High p(y) entropy:** Generated images should cover all classes (diversity)"
     ]
    },
    {
     "t": "p",
     "text": "**Limitation:** Uses Inception classifier → biased toward ImageNet classes. Doesn't compare with real data directly."
    },
    {
     "t": "p",
     "text": "**Explanation:** Higher IS = better. FID is generally preferred as it also measures how close generated distribution is to real distribution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is image inpainting with GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fill in missing or damaged parts of an image:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: image with masked region\nGenerator: completes the masked region plausibly\nDiscriminator: judges if result looks real\nLoss: adversarial + reconstruction (L1 on visible pixels) + perceptual"
    },
    {
     "t": "p",
     "text": "**Explanation:** Model must understand context to fill plausibly. Applications: photo editing, restoration, object removal. Contextual attention mechanism helps by copying similar features from unmasked regions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is data augmentation with GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generate synthetic training data, especially for rare classes:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Train GAN on rare class data\n2. Generate additional samples\n3. Add to training set"
    },
    {
     "t": "p",
     "text": "**Medical imaging:** Generate rare pathology images. **Fraud detection:** Generate synthetic fraud cases."
    },
    {
     "t": "p",
     "text": "**Explanation:** Quality check essential — bad synthetic data can hurt model. Validate by training classifier with/without synthetic data and comparing performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the difference between GAN and VAE for image generation?",
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
      "VAE"
     ],
     "rows": [
      [
       "Output quality",
       "Sharper, more realistic",
       "Blurrier"
      ],
      [
       "Training",
       "Unstable, adversarial",
       "Stable, maximum likelihood"
      ],
      [
       "Mode coverage",
       "May collapse",
       "Better coverage"
      ],
      [
       "Latent space",
       "Less structured",
       "Smooth, meaningful"
      ],
      [
       "Loss",
       "Adversarial",
       "Reconstruction + KL"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GANs optimize for individual sample quality. VAEs optimize for distribution coverage. Modern diffusion models surpass both. VQ-VAE combines VAE structure with high quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What are conditional image generation techniques?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Class conditional:** cGAN, conditional diffusion (provide class label)",
      "**Text conditional:** DALL-E, Stable Diffusion (text prompt → image)",
      "**Image conditional:** Pix2Pix, ControlNet (input image → output image)",
      "**Layout conditional:** Specify bounding boxes, generate objects in positions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Conditioning provides control over generation. CLIP-guided generation conditions on text embeddings. Classifier-free guidance controls quality-diversity trade-off."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is the two-timescale update rule (TTUR)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use different learning rates for generator and discriminator:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "lr_D > lr_G (discriminator learns faster)"
    },
    {
     "t": "p",
     "text": "**Why:** Discriminator needs to be strong enough to provide useful gradients to generator. If G learns too fast, D can't keep up → useless gradients."
    },
    {
     "t": "p",
     "text": "**Explanation:** Theoretical convergence guarantee with TTUR. Typically lr_D = 4×10⁻⁴, lr_G = 1×10⁻⁴."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is a super-resolution GAN (SRGAN)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Generator: Low-res image → High-res image (using residual blocks)\nDiscriminator: Distinguish real high-res from generated high-res\nLoss = adversarial + content/perceptual loss"
    },
    {
     "t": "p",
     "text": "**Perceptual loss:** Compare VGG features of generated vs real high-res (not pixel-level)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Pixel loss (MSE) → blurry. Perceptual + adversarial → sharp, realistic textures. ESRGAN improves with RRDB blocks and relativistic discriminator."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the difference between unconditional and conditional generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Unconditional:** G(z) → random sample from learned distribution. No control.",
      "**Conditional:** G(z, c) → sample matching condition c. Controlled generation."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unconditional: \"generate any face.\" Conditional: \"generate a smiling woman with blonde hair.\" Most practical applications are conditional."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "How do you evaluate GAN quality beyond FID?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**FID:** Distribution similarity (lower = better)",
      "**IS:** Quality and diversity (higher = better)",
      "**Precision:** Fraction of generated samples that look real (quality)",
      "**Recall:** Fraction of real samples covered by generated distribution (diversity)",
      "**LPIPS:** Learned perceptual image similarity",
      "**Human evaluation:** Gold standard but expensive"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Single metric is insufficient. Use FID + Precision/Recall. Precision=quality, Recall=diversity. Some GANs have high precision but low recall (mode collapse)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is the InfoGAN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn disentangled representations without supervision:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "G(z, c) where c = latent codes (continuous or categorical)\nExtra loss: maximize mutual information I(c; G(z,c))"
    },
    {
     "t": "p",
     "text": "**Effect:** Each latent code captures a meaningful factor of variation (rotation, width, digit type) automatically."
    },
    {
     "t": "p",
     "text": "**Explanation:** Discovers interpretable features without labels. The mutual information objective forces the code to be used meaningfully. Makes the latent space more interpretable and controllable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is a Least Squares GAN (LSGAN)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Replace binary cross-entropy with least squares loss:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L_D = E[(D(x) - 1)²] + E[D(G(z))²]\nL_G = E[(D(G(z)) - 1)²]"
    },
    {
     "t": "p",
     "text": "**Benefits:** More stable training (no vanishing gradient from sigmoid saturation), higher quality images."
    },
    {
     "t": "p",
     "text": "**Explanation:** Penalizes samples that are far from the decision boundary even if correctly classified. Produces more gradients for samples that are already on the correct side."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is semantic image synthesis with GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Generate realistic images from semantic label maps:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: segmentation map (sky=blue, road=gray, tree=green)\nOutput: photorealistic image matching the layout"
    },
    {
     "t": "p",
     "text": "**Model:** SPADE (Spatially Adaptive Normalization) — modulates batch norm with semantic layout."
    },
    {
     "t": "p",
     "text": "**Explanation:** Gives precise spatial control. User draws segmentation map → model fills in realistic textures. GauGAN/NVIDIA Canvas is a commercial application."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is face aging/de-aging with GANs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Transform face images to appear older or younger:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Approaches:\n1. Conditional GAN: condition on target age\n2. CycleGAN: unpaired young ↔ old translation\n3. Style mixing: inject age-related style features"
    },
    {
     "t": "p",
     "text": "**Challenge:** Preserve identity while changing age-related features."
    },
    {
     "t": "p",
     "text": "**Explanation:** Must change wrinkles, hair color, face shape while keeping identity recognizable. Disentangling age from identity is key."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

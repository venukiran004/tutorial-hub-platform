/* ============================================================================
   PRACTICE P6.5 — Generative Models · 5
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/05_Generative_Models.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p6.5",
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
   "n": "101",
   "q": "What is a diffusion model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A generative model that learns to reverse a gradual noising process:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Forward process: x₀ → x₁ → ... → x_T (gradually add Gaussian noise)\nReverse process: x_T → x_{T-1} → ... → x₀ (learned denoising)\n\nForward: x_t = √(ᾱ_t)x₀ + √(1-ᾱ_t)ε,  ε ~ N(0,I)\nReverse: neural network predicts noise ε given x_t, t"
    },
    {
     "t": "p",
     "text": "**Explanation:** Forward destroys information (easy, fixed). Reverse creates information (hard, learned). Model learns to denoise at each noise level. State-of-the-art image generation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "102",
   "q": "What is the training objective of diffusion models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Simple noise prediction (denoising score matching):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L = E[||ε - ε_θ(x_t, t)||²]\n\nwhere:\nε ~ N(0, I)           (true noise added)\nε_θ(x_t, t)           (predicted noise by neural network)\nx_t = √(ᾱ_t)x₀ + √(1-ᾱ_t)ε  (noised image at step t)"
    },
    {
     "t": "p",
     "text": "**Explanation:** At each training step: sample image x₀, noise level t, noise ε. Create noisy image x_t. Train model to predict ε from x_t and t. Simple MSE loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "103",
   "q": "What is the difference between DDPM and DDIM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**DDPM:** Stochastic sampling, 1000 steps, slow but diverse",
      "**DDIM:** Deterministic sampling, 20-50 steps, fast, same quality"
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "DDPM: x_{t-1} = f(x_t) + σ_t × z,  z~N(0,I)     (stochastic)\nDDIM: x_{t-1} = f(x_t)                              (deterministic, no noise)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Same trained model supports both. DDIM: skip steps, deterministic trajectory. Same noise → same image. Enables latent space interpolation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "104",
   "q": "What is classifier-free guidance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Balance between conditional and unconditional generation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "ε_guided = ε_uncond + w × (ε_cond - ε_uncond)\nw > 1: stronger adherence to condition (higher quality, less diversity)\nw = 1: standard conditional generation\nw = 0: unconditional generation"
    },
    {
     "t": "p",
     "text": "**Training:** Randomly drop condition 10-20% of time. Model learns both conditional and unconditional."
    },
    {
     "t": "p",
     "text": "**Explanation:** Guidance scale w controls quality-diversity trade-off. Stable Diffusion typically uses w=7-11. Higher w → closer to prompt but less creative."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "105",
   "q": "What is Stable Diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Latent diffusion model:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. VAE encoder compresses image: 512×512×3 → 64×64×4 (latent space)\n2. Diffusion process operates in latent space (much cheaper)\n3. U-Net with cross-attention denoises latent\n4. VAE decoder: latent → image"
    },
    {
     "t": "p",
     "text": "**Conditioning:** CLIP text encoder processes prompt → cross-attention in U-Net."
    },
    {
     "t": "p",
     "text": "**Explanation:** Running diffusion in pixel space is expensive. Latent space is 48× smaller → much faster. Quality comparable to pixel-space diffusion."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "106",
   "q": "What is the U-Net architecture in diffusion models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: Conv → Downsample → Conv → Downsample → Bottleneck\nDecoder: Conv → Upsample → Skip connection → Conv → Upsample → Skip\nPlus:\n- Self-attention at certain resolutions\n- Cross-attention for conditioning (text)\n- Time embedding (sinusoidal → MLP → add to features)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Skip connections preserve fine details. Attention enables global context and conditioning. Time embedding tells model the noise level. ResNet blocks with group norm."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "107",
   "q": "What is DALL-E 2?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Architecture:\n1. CLIP text encoder: text → text embedding\n2. Prior: text embedding → CLIP image embedding\n3. Decoder: CLIP image embedding → image (diffusion in pixel space)\n\nText → CLIP text → Prior → CLIP image → Decoder → Image"
    },
    {
     "t": "p",
     "text": "**Explanation:** Uses CLIP's learned text-image alignment. Prior maps between text and image embedding spaces. Decoder generates image from image embedding. Unifies understanding (CLIP) and generation (diffusion)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "108",
   "q": "What is Imagen?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Google's text-to-image model:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. T5-XXL text encoder (frozen, 11B params) → text embeddings\n2. 64×64 base diffusion model with text conditioning\n3. 64→256 super-resolution diffusion model\n4. 256→1024 super-resolution diffusion model"
    },
    {
     "t": "p",
     "text": "**Key insight:** Scaling the text encoder is more important than scaling the image model."
    },
    {
     "t": "p",
     "text": "**Explanation:** Larger language model = better understanding of complex prompts. Cascade of diffusion models for progressively higher resolution. Demonstrates importance of language understanding for image generation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "109",
   "q": "What is ControlNet?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Add spatial conditioning to pre-trained diffusion models:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: text prompt + spatial control (edge map, pose, depth map)\nControlNet: zero-initialized copy of U-Net encoder\n    → processes spatial condition\n    → adds to main U-Net via zero convolutions"
    },
    {
     "t": "p",
     "text": "**Examples:** Canny edges → image, pose skeleton → image, depth map → image."
    },
    {
     "t": "p",
     "text": "**Explanation:** Preserves pre-trained model's generation capability. Zero initialization means ControlNet starts by doing nothing → gradually learns to add control. Very successful for guided generation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "110",
   "q": "What is the noise schedule in diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Determines how much noise to add at each step:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Linear: β increases linearly from β_1=0.0001 to β_T=0.02\nCosine: more gradual at beginning and end\nᾱ_t = Π(1-β_i) for i=1 to t"
    },
    {
     "t": "p",
     "text": "**Cosine schedule:** Better for low-resolution images (linear destroys too fast)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Schedule affects: training stability, sample quality, generation speed. Cosine preserves more information at later steps → better detail recovery."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "111",
   "q": "What is image inpainting with diffusion models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fill in masked regions while preserving unmasked areas:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "At each denoising step:\n1. x_t = denoise(x_{t+1})          (normal denoising)\n2. x_t[unmasked] = forward_noise(x_original, t)  (preserve unmasked)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Unmasked regions are fixed at each step. Model fills masked region conditioned on surrounding context. Better coherence than GAN inpainting. Repaint: iterative resampling for better coherence."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "112",
   "q": "What is img2img generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Start diffusion from a partially noised existing image instead of pure noise:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Encode existing image: z₀ = encode(image)\n2. Add noise to step t (not T): z_t = noise(z₀, t)\n3. Denoise from step t → 0 with text conditioning\nStrength = t/T (higher → more change from original)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Lower strength → more similar to original. Higher strength → more creative freedom. Enables style transfer, editing, variations of existing images."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "113",
   "q": "What is the difference between pixel-space and latent-space diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "Pixel-space",
      "Latent-space"
     ],
     "rows": [
      [
       "Operates on",
       "Raw pixels (512×512×3)",
       "Latent codes (64×64×4)"
      ],
      [
       "Computation",
       "Very expensive",
       "Much cheaper (~48×)"
      ],
      [
       "Quality",
       "Slightly better",
       "Near-identical"
      ],
      [
       "Speed",
       "Slow",
       "Fast"
      ],
      [
       "Model",
       "DALL-E 2, Imagen",
       "Stable Diffusion, SDXL"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Latent diffusion: compress once (VAE), diffuse in small space, decompress once. Democratized diffusion (runs on consumer GPUs). Standard approach now."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "114",
   "q": "What is SDXL?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Stable Diffusion XL — improved architecture:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Changes from SD 1.5:\n1. Larger U-Net (2.6B vs 860M params)\n2. Two text encoders (CLIP ViT-L + OpenCLIP ViT-bigG)\n3. Conditioning on image size, crop, and aspect ratio\n4. Refiner model for detail enhancement\n5. No more 512×512 — native 1024×1024"
    },
    {
     "t": "p",
     "text": "**Explanation:** Larger model + better conditioning + architectural improvements = significantly better images. Refiner is optional second-stage diffusion for detail improvement."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "115",
   "q": "What is consistency model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Distill diffusion model into single-step generator:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard diffusion: 20-50 steps to generate\nConsistency model: 1-4 steps\nKey: model learns to map ANY noise level directly to final image\nf(x_t, t) = f(x_s, s) = x₀   for all t, s along the trajectory"
    },
    {
     "t": "p",
     "text": "**Explanation:** Much faster generation. Trained by distillation from diffusion model or directly. Quality gap narrowing. Latent consistency models (LCM) for Stable Diffusion."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "116",
   "q": "What is text-to-video diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Extend image diffusion to generate video:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Architecture:\n1. 2D image layers (from pre-trained image model)\n2. + Temporal attention layers (model motion across frames)\n3. + Temporal convolutions\nTraining: video data (paired with text descriptions)"
    },
    {
     "t": "p",
     "text": "**Models:** Sora (OpenAI), Gen-2, Runway ML, Stable Video Diffusion."
    },
    {
     "t": "p",
     "text": "**Challenges:** Temporal consistency, long-duration coherence, physics understanding."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "117",
   "q": "What is the score function in score-based models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Score: ∇_x log p(x) (gradient of log probability w.r.t. data)\nModel learns: s_θ(x) ≈ ∇_x log p(x)\nSampling: Langevin dynamics — follow the score to high-probability regions\nx_{t+1} = x_t + ε/2 × s_θ(x_t) + √ε × z"
    },
    {
     "t": "p",
     "text": "**Explanation:** Score-based models and diffusion models are mathematically equivalent (Song et al., 2021). Score = direction toward data. Following score = denoising. Unified framework: SDEs/ODEs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "118",
   "q": "What is the SDE formulation of diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Forward SDE:  dx = f(x,t)dt + g(t)dw    (noise process)\nReverse SDE:  dx = [f(x,t) - g²(t)∇log p_t(x)]dt + g(t)dw̄\n\nProbability flow ODE (deterministic):\ndx = [f(x,t) - ½g²(t)∇log p_t(x)]dt"
    },
    {
     "t": "p",
     "text": "**Explanation:** Continuous-time formulation unifies DDPM, score matching, denoising. ODE formulation → deterministic sampling + exact likelihood. Flexible choice of noise schedule and sampler."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "119",
   "q": "What are DPM-Solver and PNDM samplers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fast ODE solvers for diffusion:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "DDPM: 1000 steps (Euler method)\nDDIM: 50 steps\nDPM-Solver: 10-20 steps (higher-order ODE solver)\nDPM-Solver++: 10-15 steps (even faster)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard DDPM uses Euler discretization (slow). DPM-Solver uses exponential integrator (analytically solves the linear part). Much faster convergence with same quality. Standard in production."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "120",
   "q": "What is textual inversion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn new \"words\" (embeddings) for specific concepts:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: 3-5 images of concept (e.g., your specific dog)\nLearn: new token embedding V* that captures the concept\nUse: \"a V* dog playing in the park\""
    },
    {
     "t": "p",
     "text": "**Training:** Only learn one embedding vector. Model weights frozen."
    },
    {
     "t": "p",
     "text": "**Explanation:** Personalization without fine-tuning model. Very parameter-efficient. Combined with DreamBooth for better quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "121",
   "q": "What is DreamBooth?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fine-tune entire diffusion model for specific subject:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: 3-5 images of subject\nFine-tune: U-Net (sometimes text encoder too)\nPrior preservation: mix subject images with class images to prevent forgetting\nUse: \"a [V] dog on the beach\" (unique identifier)"
    },
    {
     "t": "p",
     "text": "**vs Textual Inversion:** DreamBooth fine-tunes model weights (more capacity, better quality). Textual inversion only learns embedding (less capacity, faster)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "122",
   "q": "What is IP-Adapter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Image prompt adapter for diffusion models:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: reference image + text prompt\nIP-Adapter: extract image features → inject via cross-attention\nOutput: generated image combining text description + reference image style/content"
    },
    {
     "t": "p",
     "text": "**Explanation:** Decoupled cross-attention: separate attention for text and image prompts. No fine-tuning needed (adapter trained once). Enables: style transfer, character consistency, image variation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "123",
   "q": "What is the difference between conditional and unconditional diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Unconditional:** p(x) — random sample from learned distribution",
      "**Conditional:** p(x|c) — sample conditioned on text, class, image, etc."
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Conditional: ε_θ(x_t, t, c)     (model takes condition c)\nClassifier-free guidance: combine conditional and unconditional during sampling"
    },
    {
     "t": "p",
     "text": "**Explanation:** Unconditional is simpler but uncontrollable. Conditional is practical (text-to-image). CFG improves conditional quality by contrasting with unconditional."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "124",
   "q": "What is the VAE in Stable Diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: 512×512×3 → 64×64×4 (compress to latent space)\nDecoder: 64×64×4 → 512×512×3 (reconstruct to pixel space)\nTraining: reconstruction loss + perceptual loss + adversarial loss + small KL"
    },
    {
     "t": "p",
     "text": "**Details:** KL weight very small (0.00001) → latent space is nearly deterministic. Perceptual loss from VGG. Adversarial loss from PatchGAN discriminator."
    },
    {
     "t": "p",
     "text": "**Explanation:** VAE quality determines final image quality. VAE is trained separately from diffusion model. Different VAEs exist (e.g., SDXL uses improved VAE with better fine details)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "125",
   "q": "What is the CLIP text encoder's role in diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Text → tokenize → CLIP text encoder → text embeddings\nText embeddings → cross-attention in U-Net\n\nCross-attention: Q from image features, K,V from text embeddings\nThis allows each spatial location in image to attend to relevant text tokens"
    },
    {
     "t": "p",
     "text": "**Explanation:** CLIP provides text understanding. Cross-attention injects text meaning into generation. Larger/better text encoder → better prompt understanding. SDXL uses two text encoders for richer representations."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

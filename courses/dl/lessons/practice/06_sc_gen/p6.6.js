/* ============================================================================
   PRACTICE P6.6 — Generative Models · 6
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/05_Generative_Models.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p6.6",
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
   "n": "126",
   "q": "What is the scheduler in diffusion inference?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Controls the denoising trajectory during sampling:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Schedulers determine:\n1. How many steps to take\n2. How much noise to remove per step\n3. Stochastic vs deterministic\n\nPopular:\n- DDPM: 1000 steps, stochastic\n- DDIM: 20-50 steps, deterministic\n- DPM-Solver++: 15-25 steps, fast\n- Euler: 20-30 steps, simple\n- UniPC: 10-15 steps, very fast"
    },
    {
     "t": "p",
     "text": "**Explanation:** Scheduler is separate from trained model. Can swap schedulers at inference time. Faster schedulers reduce generation time dramatically."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "127",
   "q": "What is negative prompting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Positive: \"beautiful landscape, mountains, sunset, high quality\"\nNegative: \"blurry, ugly, deformed, low quality\"\n\nImplementation: compute ε for positive and negative conditions\nε_final = ε_negative + w × (ε_positive - ε_negative)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Negative prompt tells model what to AVOID. Steers generation away from undesirable attributes. Very effective for improving quality. Some negative prompts are almost universal (\"blurry, bad anatomy\")."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "128",
   "q": "What is LoRA for diffusion models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Same LoRA principle applied to diffusion U-Net:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Add low-rank adapters to attention layers in U-Net\nfor layer in unet.attention_layers:\n    layer.to_q = LoRA(layer.to_q, rank=4)\n    layer.to_k = LoRA(layer.to_k, rank=4)\n    layer.to_v = LoRA(layer.to_v, rank=4)"
    },
    {
     "t": "p",
     "text": "**Use:** Train on specific style/character → small adapter (~50-200MB vs ~4GB full model)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Community creates thousands of LoRAs for different styles, characters, concepts. Multiple LoRAs can be combined (merged or stacked). Civitai and HuggingFace host libraries."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "129",
   "q": "What is the difference between diffusion and flow matching?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Diffusion:** Forward = add noise (fixed). Reverse = denoise (learned).",
      "**Flow matching:** Learn direct velocity field from noise to data."
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Diffusion: curved trajectory, many steps\nFlow matching: straight path, fewer steps\n\nFlow matching: dx/dt = v_θ(x_t, t)  (velocity field)\nOptimal transport: straight paths are most efficient"
    },
    {
     "t": "p",
     "text": "**Explanation:** Stable Diffusion 3, Flux use flow matching (rectified flow). Straighter paths → fewer sampling steps → faster generation. Same quality or better."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "130",
   "q": "What is DiT (Diffusion Transformer)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Replace U-Net with Transformer in diffusion model:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Image → patchify → Transformer blocks (self-attention + FFN) → predict noise\nConditioning: adaptive layer norm (adaLN-Zero)"
    },
    {
     "t": "p",
     "text": "**Why:** Transformers scale better than U-Nets with more compute. Follow language model scaling recipe."
    },
    {
     "t": "p",
     "text": "**Explanation:** Sora uses DiT architecture. Better scaling properties → can train larger models effectively. Shift from U-Net to Transformer for next-gen diffusion models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "131",
   "q": "What is 3D generation with diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Approaches:\n1. DreamFusion: Text → 2D diffusion supervision → optimize 3D representation (NeRF)\n2. Zero-1-to-3: Single image → multi-view diffusion → 3D reconstruction  \n3. Direct 3D diffusion: diffusion on point clouds, meshes, or triplane features"
    },
    {
     "t": "p",
     "text": "**Score Distillation Sampling (SDS):** Use 2D diffusion model as critic for 3D generation."
    },
    {
     "t": "p",
     "text": "**Explanation:** 3D training data is scarce. Leverage 2D diffusion models trained on billions of images to guide 3D generation. Quality improving rapidly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "132",
   "q": "What is the role of cross-attention in diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# In U-Net block:\n# Self-attention: image features attend to themselves (spatial coherence)\nattn_out = self_attention(image_features)\n\n# Cross-attention: image features attend to text embeddings (conditioning)\nQ = image_features @ W_Q\nK = text_embeddings @ W_K\nV = text_embeddings @ W_V\ncross_attn_out = softmax(Q @ K.T / √d) @ V"
    },
    {
     "t": "p",
     "text": "**Explanation:** Cross-attention is HOW text controls image generation. Each spatial position in the image attends to relevant words. \"Red car\" → pixels in car region attend strongly to \"red.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "133",
   "q": "What is Rectified Flow?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn straight-line paths between noise and data:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Training objective:\nx_t = (1-t)×x₀ + t×ε         (linear interpolation)\nv_θ(x_t, t) predicts direction to data\nLoss = ||v_θ(x_t, t) - (x₀ - ε)||²"
    },
    {
     "t": "p",
     "text": "**Benefit:** Straight paths → fewer sampling steps (1-4 steps possible)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Used in Stable Diffusion 3 and Flux. More principled than DDPM's noise schedule. Naturally leads to few-step generation. Reflow: iteratively straighten paths."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "134",
   "q": "What is video diffusion vs image diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Image: denoise single 2D tensor\nVideo: denoise 3D tensor (frames × height × width)\n\nVideo-specific components:\n1. Temporal attention (attend across frames)\n2. Temporal convolutions (local frame relationships)\n3. Motion models (optical flow, temporal coherence)"
    },
    {
     "t": "p",
     "text": "**Challenges:** Temporal consistency, motion quality, computation cost (T× more than image)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Most approaches inflate image U-Net with temporal layers. Pre-train on images, then add temporal layers and train on video. Sora, Kling, Runway use this approach."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "135",
   "q": "What is the difference between denoising and score matching?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Denoising: ε_θ(x_t, t) predicts noise ε added to x                    \nScore matching: s_θ(x_t, t) predicts ∇_x log p(x_t)\n\nRelationship: s_θ(x_t, t) = -ε_θ(x_t, t) / √(1-ᾱ_t)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Mathematically equivalent (connected by simple scaling). Denoising is more intuitive (remove noise). Score matching is more theoretically grounded (follow gradient of log density). Same model, different parameterizations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "136",
   "q": "What is the v-prediction parameterization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: predict noise ε\nv-prediction: predict v = ᾱ_t × ε - √(1-ᾱ_t) × x₀\n\nv represents the \"velocity\" of the diffusion process"
    },
    {
     "t": "p",
     "text": "**Benefit:** Better numerical stability at extreme noise levels (very high or very low). Better for high-resolution generation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Used in Imagen, SDXL. Interpolation between predicting noise and predicting clean image. More stable training dynamics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "137",
   "q": "What is a diffusion model for audio generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Process:\n1. Convert audio to mel spectrogram (2D representation)\n2. Run diffusion on spectrogram\n3. Convert spectrogram to waveform (vocoder: HiFi-GAN)\n\nModels: AudioLDM, MusicGen (autoregressive), Stable Audio"
    },
    {
     "t": "p",
     "text": "**Conditioning:** Text descriptions, melody, reference audio."
    },
    {
     "t": "p",
     "text": "**Explanation:** Same latent diffusion principle as images but in audio spectrogram space. Music generation, sound effects, speech synthesis. Rapidly improving quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "138",
   "q": "What is inpainting mask conditioning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input to model: concatenate [noised_image, mask, masked_image] along channel dim\nModel: 4+1+4 = 9 input channels (instead of standard 4)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Dedicated inpainting model takes mask as explicit input. Better than test-time repaint approach. Knows exactly which regions to generate and which to preserve."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "139",
   "q": "What is the difference between text-to-image and image editing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Text-to-image: noise → image (full generation)\nImage editing: existing image → modified image (preserve + edit)\n\nEditing methods:\n1. img2img: add noise, denoise with new prompt\n2. InstructPix2Pix: \"make the sky red\" (trained on edit instructions)\n3. Attention manipulation: swap/modify cross-attention maps\n4. Mask-based: inpaint specific regions"
    },
    {
     "t": "p",
     "text": "**Explanation:** Editing must preserve unedited regions. Balance: enough noise to make changes, not so much that original is lost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "140",
   "q": "What is the Euler sampler?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Simplest ODE solver for diffusion:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "x_{t-Δt} = x_t + Δt × f(x_t, t)    (Euler method)\nf = model prediction (noise/score/velocity)"
    },
    {
     "t": "p",
     "text": "**Explanation:** First-order solver. Simple but requires more steps. Higher-order: Heun (2nd order), DPM-Solver (custom). Trade-off: more complex solver = fewer steps but more computation per step."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "141",
   "q": "What is the difference between CFG and classifier guidance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Classifier guidance:** Train separate classifier on noisy images. Use its gradient. `ε' = ε - w × σ × ∇_x log p(y|x_t)`",
      "**Classifier-free guidance:** Single model trained with/without conditions. `ε' = ε_uncond + w × (ε_cond - ε_uncond)`"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Classifier guidance requires training an extra classifier. CFG is simpler — just drop condition during training. CFG has won: used in all modern diffusion models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "142",
   "q": "What is attention store/injection for image editing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Run diffusion with original prompt → store cross-attention maps\n2. Run diffusion with new prompt → inject stored attention maps\nResult: same layout, different content\n\nPrompt-to-Prompt:\n\"a cat sitting\" (attention maps stored)\n\"a dog sitting\" (inject cat's spatial attention → dog in same position)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Cross-attention maps control WHERE objects appear. Swapping/blending maps enables spatial control without retraining. Enables: object replacement, attribute editing, attention-based editing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "143",
   "q": "What is the multi-step distillation for diffusion?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Teacher: 50-step diffusion model\nStudent: learns to match teacher in fewer steps\n\nProgressive distillation:\n1. Student learns 2-step ≈ teacher 2-step\n2. Halve student to 1-step (from teacher's 2-step)\n3. Repeat: 50 → 25 → 12 → 6 → 3 → 1 steps"
    },
    {
     "t": "p",
     "text": "**Explanation:** Each distillation halves the steps. Final model generates in 1-4 steps. Quality-speed trade-off. LCM-LoRA achieves 4-8 step generation with good quality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "144",
   "q": "What is the FLUX architecture?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Next-gen diffusion model using rectified flow + DiT:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Architecture:\n1. Dual text encoders (CLIP + T5)\n2. DiT-based model (not U-Net)\n3. Rectified flow (not standard diffusion)\n4. Joint attention (image + text tokens in same sequence)"
    },
    {
     "t": "p",
     "text": "**Explanation:** 12B parameters. State-of-the-art text-to-image. Joint attention processes image and text tokens together (vs cross-attention which separates them). Better text understanding and following."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "145",
   "q": "What are the challenges of training diffusion models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Compute:** Millions of GPU hours for large models",
      "**Data:** Billions of text-image pairs needed",
      "**Memory:** Large U-Net/DiT + EMA weights",
      "**Stability:** Loss can spike, noise schedule matters",
      "**Evaluation:** FID/IS don't fully capture quality",
      "**Copyright:** Training on copyrighted images controversial"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Diffusion models are expensive to train from scratch. Most practitioners fine-tune existing models. Community LoRAs extend capabilities without full training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "146",
   "q": "What is AnimateDiff?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Add temporal motion module to pre-trained image diffusion model:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Pre-trained image U-Net + inserted temporal attention layers\nTemporal layers trained on video data while image layers frozen\nWorks with any personalized SD model + LoRA"
    },
    {
     "t": "p",
     "text": "**Explanation:** Modular approach: separate motion from appearance. Image model handles appearance (can swap styles). Motion module handles movement. Combine for animated outputs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "147",
   "q": "What is the latent consistency model (LCM)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Distill diffusion model for 1-4 step generation:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Training: consistency distillation from teacher diffusion model\nSpecial: augmented PF-ODE solver for better distillation\nLCM-LoRA: distill as LoRA adapter (~67MB)"
    },
    {
     "t": "p",
     "text": "**Result:** 4-step generation with quality close to 50-step. Can be applied as LoRA to any SD model."
    },
    {
     "t": "p",
     "text": "**Explanation:** Makes real-time generation possible. Interactive editing at 5-10 fps. Combined with StreamDiffusion for real-time video processing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "148",
   "q": "What is depth-conditioned generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use depth map to control 3D structure of generated image:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input: text prompt + depth map\nModel: ControlNet with depth conditioning\nOutput: image matching the 3D structure\n\nPipeline:\n1. Estimate depth from reference image (MiDaS, Depth Anything)\n2. Generate new image conditioned on depth + text"
    },
    {
     "t": "p",
     "text": "**Explanation:** Maintains spatial structure while changing content. Interior design: keep room layout, change style. Scene generation: keep terrain, change weather/season."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "149",
   "q": "How do you evaluate diffusion model quality?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Quantitative:\n1. FID (Fréchet Inception Distance): distribution similarity\n2. CLIP Score: text-image alignment\n3. IS (Inception Score): quality + diversity\n4. LPIPS: perceptual similarity\n5. Human preference: ELO ratings, side-by-side comparison\n\nQualitative:\n1. Prompt following: does image match text?\n2. Coherence: realistic composition?\n3. Detail quality: textures, faces, hands?\n4. Diversity: different outputs from different seeds?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "150",
   "q": "What is the future of generative models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Unified models:** Single model for image, video, audio, 3D (multimodal)",
      "**Real-time generation:** 1-step models, streaming generation",
      "**Controllability:** Fine-grained spatial and temporal control",
      "**World models:** Generate consistent interactive environments",
      "**Personalization:** Instant adaptation to user preferences",
      "**Efficiency:** Smaller models, mobile generation",
      "**3D native:** Direct 3D generation (not 2D supervised)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Moving from separate specialized models to unified architectures. Generation becoming a component of AI assistants, not standalone tool."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

/* ============================================================================
   LESSON 7.4 — Image Generation
   Mirrors 03_Multimodal_AI.md · §4. The diffusion forward process is
   implemented and the latent compression computed at 48x; classifier-free
   guidance is shown to EXTRAPOLATE past the model's own conditional
   prediction (§05) (scratchpad/nlp/n74.py).
   ========================================================================= */
EC.receiveLesson({
  id: "7.4",

  lede: "**At the default guidance scale of 7.5, Stable Diffusion's effective noise prediction sits 1.52 away from what the model actually predicted for your prompt.** Classifier-free guidance does not select the conditional prediction — it extrapolates *past* it, along the line away from the unconditional one. That single fact explains the saturated, exaggerated, over-typical look of high-guidance images: you are asking for something more prompt-like than the model believes your prompt implies. This lesson derives the diffusion process and the arithmetic behind that behaviour.",

  objectives: [
    "Compute why latent diffusion is 48x cheaper than pixel diffusion",
    "Implement the forward noising process and verify it destroys the signal",
    "Explain why the network predicts noise rather than the image",
    "Derive classifier-free guidance and what the scale actually does",
    "Trace how CLIP's weaknesses become the generator's weaknesses"
  ],

  prerequisites: ["7.3", "7.2"],

  blocks: [

    { t: "h2", n: "01", text: "Why latent space", id: "latent" },

    { t: "out", text:
"Stable Diffusion's VAE: 8x spatial downsample, 4 channels\n\n  resolution      pixels        latent            compression\n  256x256        196,608       32x32x4 =   4,096      48.0x\n  512x512        786,432       64x64x4 =  16,384      48.0x\n  1024x1024    3,145,728      128x128x4 =  65,536      48.0x" },

    { t: "callout", kind: "crit", title: "48x, and the U-Net pays it fifty times",
      body: [{ t: "p", text: "Diffusion requires the denoising network to run once per sampling step — typically 20 to 50 times per image. Doing that in pixel space at 512×512 means 50 passes over **786,432** values; in latent space it is 50 passes over **16,384**. The compression is not a modest optimisation, it is what made high-resolution diffusion affordable at all, and it is the single idea that separates Stable Diffusion from the pixel-space models before it. The VAE itself runs just twice — encode once at training, decode once at the end of sampling — so its cost is negligible against the U-Net's." }] },

    { t: "h2", n: "02", text: "The forward process", id: "forward" },

    { t: "math", tex: "z_t = \\sqrt{\\bar{\\alpha}_t}\\, z_0 + \\sqrt{1 - \\bar{\\alpha}_t}\\, \\epsilon, \\qquad \\epsilon \\sim \\mathcal{N}(0, I)" },

    { t: "out", text:
"1000 steps, linear beta schedule from 1e-4 to 0.02\n\n  t       alpha_bar     signal coeff   noise coeff   corr(z_t, z_0)\n  0       0.999900        0.9999         0.0100          0.9999\n  100     0.895141        0.9461         0.3238          0.9265\n  300     0.394011        0.6277         0.7785          0.5307\n  500     0.077797        0.2789         0.9603          0.1755\n  700     0.006868        0.0829         0.9966         -0.0017\n  900     0.000270        0.0164         0.9999         -0.0595\n  999     0.000040        0.0064         1.0000         -0.0682" },

    { t: "callout", kind: "insight", title: "The signal is gone by t = 700, not t = 999",
      body: [{ t: "p", text: "Correlation with the original latent reaches **−0.0017** at t = 700 and stays at noise level thereafter — the last 300 steps are destroying something already destroyed. More importantly, that closed form lets you jump to **any** `t` in one operation. Training therefore does not simulate a thousand-step chain: sample a random `t`, add the corresponding noise once, ask the network to predict the noise, done. Without that closed form, diffusion training would be intractable, and it is available only because each step adds Gaussian noise and Gaussians compose." }] },

    { t: "h2", n: "03", text: "Why predict noise", id: "epsilon" },

    { t: "out", text:
"given a predicted epsilon, recovering the clean latent is algebra\n\n  z_0_hat = (z_t - sqrt(1 - alpha_bar) * eps) / sqrt(alpha_bar)\n\n  with the true epsilon, max abs error: 4.06e-07" },

    { t: "callout", kind: "insight", title: "Predicting the noise and predicting the image are equivalent — but not equally trainable",
      body: [{ t: "p", text: "They are related by exact algebra, so information-theoretically the two targets are the same. The reason `ε`-prediction won is **conditioning of the loss**: `ε` is standard normal at every timestep, so the target's scale is constant whether `t` is 1 or 999. Predicting `z_0` directly means the target's difficulty varies enormously with `t` — nearly trivial at low noise, nearly impossible at high — so the loss is dominated by whichever regime happens to have larger gradients. Note also what the division by `sqrt(alpha_bar)` implies at large `t`: it is `1/0.0064` at t=999, so a small error in `ε` becomes an enormous error in the reconstructed image. That is why sampling starts at high `t` and takes many small steps rather than one." }] },

    { t: "h2", n: "04", text: "The three components", id: "components" },

    { t: "diagram", kind: "flow", title: "Stable Diffusion, assembled", cols: 3,
      nodes: [
        { id: "p", text: "Text prompt", tone: "accent" },
        { id: "c", text: "CLIP text encoder", tone: "teal" },
        { id: "n", text: "Noise z_T", tone: "accent" },
        { id: "u", text: "U-Net: predict noise, cross-attend to text", tone: "violet" },
        { id: "l", text: "Repeat ~50 steps", tone: "violet" },
        { id: "v", text: "VAE decoder: latent to pixels", tone: "good" }
      ],
      edges: [["p","c"],["c","u"],["n","u"],["u","l"],["l","u"],["l","v"]] },

    { t: "table",
      head: ["Component", "What it does", "Why it is there"],
      rows: [
        ["VAE encoder/decoder", "512×512×3 ↔ 64×64×4", "Makes diffusion affordable — the 48x above"],
        ["U-Net (or DiT)", "Predict the noise in z_t given t and text", "Where all the learning is"],
        ["CLIP text encoder", "Prompt → embeddings for cross-attention", "The conditioning signal"]
      ] },

    { t: "callout", kind: "crit", title: "The text encoder is CLIP, so CLIP's weaknesses are inherited",
      body: [{ t: "p", text: "Stable Diffusion conditions on embeddings from the **same contrastive model** lesson 7.2 probed. So the generator inherits the text tower's blind spots directly: counting, spatial relations like *left of* and *above*, and fine-grained distinctions are all things web alt-text rarely states, so CLIP encodes them weakly, so the U-Net receives weak conditioning on them. That is the mechanistic reason *\"three cats to the left of a sofa\"* is famously unreliable — the failure is not in the image model at all, it is in the sentence embedding it was given. It also predicts the fix, which is what Imagen and SD3 did: use a stronger text encoder such as T5." }] },

    { t: "h2", n: "05", text: "Classifier-free guidance", id: "cfg" },

    { t: "math", tex: "\\hat{\\epsilon} = \\epsilon_{\\text{uncond}} + w\\,(\\epsilon_{\\text{cond}} - \\epsilon_{\\text{uncond}})" },

    { t: "out", text:
"eps_uncond = [0.10, -0.20, 0.30]     eps_cond = [0.25, -0.05, 0.20]\n\n  w      eps_hat                          distance from eps_cond\n  0.0    [ 0.100, -0.200,  0.300]              0.2345\n  1.0    [ 0.250, -0.050,  0.200]              0.0000\n  3.0    [ 0.550,  0.250,  0.000]              0.4690\n  7.5    [ 1.225,  0.925, -0.450]              1.5244\n  15.0   [ 2.350,  2.050, -1.200]              3.2833" },

    { t: "callout", kind: "crit", title: "w = 1 gives the model's prediction; the default is 7.5",
      body: [{ t: "p", text: "At `w = 1` the formula collapses to exactly `ε_cond` — the model's honest prediction given your prompt. At `w = 0` you get the unconditional prediction, ignoring the prompt. Stable Diffusion's **default is 7.5**, which puts the effective prediction **1.52** away from `ε_cond` — six and a half times further from the conditional prediction than the unconditional one was. You are not sampling what the model thinks your prompt implies; you are extrapolating along the prompt direction well past it. That is precisely why high guidance produces saturated colours, exaggerated features and over-typical compositions, and why pushing to 15 or 20 degrades images rather than improving prompt adherence indefinitely." }] },

    { t: "out", text:
"sampling cost\n\n  steps    U-Net calls    with CFG (2 per step)\n  20            20               40\n  50            50              100\n  100          100              200" },

    { t: "p", text: "Guidance **doubles** inference cost, because every step needs both a conditional and an unconditional forward pass. That is a large, permanent overhead, and it is why distilled-guidance models — which learn to produce the guided output in one pass — are an active area." },

    { t: "h2", n: "06", text: "Control and editing", id: "control" },

    { t: "dl", items: [
      ["ControlNet", "A parallel copy of the U-Net encoder processes a condition — edges, depth, pose — and injects it through **zero-initialised convolutions**, so at the start of training the model is unchanged. The same trick as Flamingo's zero gate in lesson 7.3."],
      ["Inpainting", "Fill a masked region. The unmasked latent is re-imposed at every denoising step, so only the masked area is free to change."],
      ["Img2Img", "Start from a partially noised real image rather than pure noise. The noise level sets how much of the original survives."],
      ["InstructPix2Pix", "Instruction-conditioned editing — *make it sunset* — trained on synthetic before-and-after pairs."],
      ["DreamBooth / Textual Inversion", "Teach the model a *specific* subject from a handful of images, by fine-tuning weights or by learning a new token embedding."]
    ] },

    { t: "callout", kind: "insight", title: "Zero-initialisation keeps appearing",
      body: [{ t: "p", text: "ControlNet's zero convolutions, Flamingo's zero-gated cross-attention, and LoRA's zero-initialised `B` matrix are the same idea three times: **add a new pathway whose initial contribution is exactly zero**, so the augmented model starts identical to the working model and the new capability is learned in gradually. It is a general recipe for extending a pretrained model without risking what it already does, and recognising it makes each individual case easier to remember." }] },

    { t: "h2", n: "07", text: "The lineage", id: "lineage" },

    { t: "out", text:
"GANs (2014)  ->  VAEs  ->  Flow models  ->  Diffusion (2020+)  ->  Flow matching\n\nDALL-E 3          diffusion + a better captioner      text fidelity\nStable Diffusion  latent diffusion, CLIP conditioning  open weights\nSD3 / Flux        DiT + flow matching                  transformer backbone\nImagen 3          cascaded diffusion, T5 encoder       text fidelity" },

    { t: "p", text: "Two trends are visible. The U-Net is being replaced by a **transformer** (DiT), which is the same convergence lesson 5.7 described for vision — once you can tokenise the input, the transformer block works. And the text encoder is moving from CLIP to T5, addressing exactly the conditioning weakness described above." },

    { t: "exercise", title: "Work the diffusion arithmetic",
      tasks: [
        "Implement the forward process and find the timestep at which correlation with the original drops below 0.1.",
        "Recover z_0 from z_t and the true epsilon, and confirm the error is floating-point noise.",
        "Compute the latent compression for a resolution you care about, and multiply by your step count.",
        "Sweep the guidance scale from 1 to 20 on one prompt and note where image quality peaks.",
        "Compute how many U-Net calls a 50-step generation with guidance actually costs."
      ] }
  ],

  takeaways: [
    "Latent diffusion compresses 48x — 512×512×3 to 64×64×4 — and the U-Net pays that saving on every one of ~50 sampling steps.",
    "The forward process has a closed form, so training can jump to any timestep in one operation instead of simulating a chain.",
    "Correlation with the original latent reaches noise level by t = 700; the remaining steps destroy nothing further.",
    "Predicting epsilon and predicting z_0 are related by exact algebra (error 4.06e-07), but epsilon has constant variance at every t, which conditions the loss well.",
    "Stable Diffusion's text encoder is CLIP, so CLIP's weak encoding of counting and spatial relations becomes the generator's weakness directly.",
    "Classifier-free guidance at w = 1 gives the model's conditional prediction; SD's default of 7.5 lands 1.52 away from it.",
    "High guidance extrapolates past what the model predicted, which is why it produces saturated, over-typical images.",
    "Guidance doubles inference cost, since every step needs a conditional and an unconditional pass.",
    "ControlNet's zero convolutions, Flamingo's zero gate and LoRA's zero-initialised B are the same recipe: a new pathway contributing exactly zero at initialisation.",
    "The U-Net is being replaced by transformers (DiT) and CLIP by T5 — both moves visible in SD3 and Imagen."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why does Stable Diffusion operate in latent space?",
      options: ["Latents are easier to interpret", "48x fewer values, and the denoising network pays that saving on every one of ~50 sampling steps", "The VAE improves image quality", "To support variable resolutions"],
      answer: 1,
      why: "512×512×3 is 786,432 values against a latent's 16,384. The VAE runs twice per image — encode and decode — while the U-Net runs 20 to 50 times, so the compression is multiplied by the step count. It is what made high-resolution diffusion affordable, not a marginal optimisation." },
    { stem: "Why does the network predict the noise rather than the clean image?",
      options: ["The noise is easier to compute", "Epsilon has constant variance at every timestep, so the target's difficulty does not vary with t and the loss stays well conditioned", "It is the only tractable option", "To support classifier-free guidance"],
      answer: 1,
      why: "The two targets are related by exact algebra — recovering z_0 from a true epsilon has error 4.06e-07 — so they carry the same information. Predicting z_0 directly makes the task nearly trivial at low noise and nearly impossible at high, so whichever regime has larger gradients dominates training." },
    { stem: "What does a guidance scale of 7.5 actually do?",
      options: ["Selects the conditional prediction", "Extrapolates past it — the result sits 1.52 away from what the model predicted for the prompt", "Averages conditional and unconditional", "Increases the number of sampling steps"],
      answer: 1,
      why: "At w = 1 the formula gives exactly the conditional prediction. At 7.5 it continues along the line away from the unconditional one, far beyond where the model actually landed. That is why high guidance produces saturated, exaggerated, over-typical images, and why pushing to 15 or 20 degrades them." },
    { stem: "Why is 'three cats to the left of a sofa' unreliable for Stable Diffusion?",
      options: ["The U-Net cannot represent counts", "Conditioning comes from CLIP, whose text tower encodes counting and spatial relations weakly because captions rarely state them", "The latent space is too small", "Guidance interferes with spatial layout"],
      answer: 1,
      why: "The failure originates in the sentence embedding, not the image model. Lesson 7.2 established CLIP's blind spots trace to its caption training distribution, and Stable Diffusion inherits them by conditioning on the same encoder. It also predicts the fix — Imagen and SD3 use T5 instead." }
  ] },

  interview: { title: "Interview", sub: "Diffusion models", questions: [
    { level: "Core", q: "How does a latent diffusion model generate an image?",
      strong: "Denoise a latent iteratively, conditioned on text by cross-attention, then decode once.",
      answer: [{ t: "p", text: "Three components. A VAE compresses images into a latent space — 512 by 512 by 3 becomes 64 by 64 by 4, which I computed as 48 times fewer values. A U-Net, or in newer models a transformer, is trained to predict the noise present in a noisy latent given the timestep and a text embedding, conditioning on the text through cross-attention. And a text encoder, usually CLIP, turns the prompt into those embeddings. Generation starts from pure Gaussian noise in latent space and iteratively denoises — typically 20 to 50 steps — then decodes once through the VAE. Training uses a closed form for the forward process: z_t equals root alpha-bar times z_0 plus root one-minus-alpha-bar times epsilon, which lets you jump to any timestep in one operation rather than simulating a chain. So you sample a random t, add noise once, and ask the network to predict the noise you added. The compression matters more than it first appears, because the U-Net runs 20 to 50 times per image while the VAE runs twice — so that 48x saving is multiplied by the step count, and it's what made high-resolution diffusion affordable at all." }] },
    { level: "Senior", q: "What does the guidance scale control, and why does turning it up eventually hurt?",
      strong: "It extrapolates past the conditional prediction, so high values leave the model's own estimate behind.",
      answer: [{ t: "p", text: "Classifier-free guidance computes epsilon-hat as epsilon-unconditional plus w times the difference between conditional and unconditional. At w equals 1 that collapses exactly to the conditional prediction — what the model actually believes your prompt implies. At w equals 0 you get the unconditional prediction, ignoring the prompt entirely. Above 1 you're extrapolating along the prompt direction past the conditional estimate. I computed this for Stable Diffusion's default of 7.5 and the effective prediction sits 1.52 away from epsilon-conditional — about six and a half times further from the conditional prediction than the unconditional one was. That's why it hurts eventually: you're asking for something more prompt-like than the model's own estimate, which produces saturated colours, exaggerated features and over-typical compositions, and past roughly 10 to 15 the images degrade rather than adhering better. There's also a real cost: guidance doubles inference, because every step needs both a conditional and an unconditional forward pass. A 50-step generation is 100 U-Net calls, not 50. That's why guidance distillation, training a model to produce the guided output in a single pass, is an active area." }] },
    { level: "Senior", q: "Your image model gets object counts and spatial relations wrong. Where is the problem?",
      strong: "In the text encoder, not the image model — CLIP encodes those properties weakly.",
      answer: [{ t: "p", text: "Almost certainly in the conditioning rather than the generator. Stable Diffusion conditions on CLIP text embeddings, and CLIP was trained on web alt-text, which rarely states counts or spatial relations — nobody captions an image 'three cats to the left of a sofa'. So CLIP encodes those properties weakly, and the U-Net receives weak conditioning on them. It isn't that the image model can't draw three cats; it's that the sentence embedding it was handed doesn't clearly distinguish three from two. I'd verify this before acting on it, and it's testable directly: embed 'two cats' and 'three cats' with the CLIP text encoder and measure their cosine similarity. If they're nearly identical, the information isn't in the conditioning signal at all and no amount of work on the generator will fix it. The fixes follow from the diagnosis. Use a stronger text encoder — that's exactly what Imagen did with T5 and what SD3 does with a combination — since a language model trained on full text represents counts and relations far better than a contrastive caption model. Or add explicit spatial control through ControlNet with a layout or depth condition, which bypasses the text bottleneck for spatial structure entirely. Or decompose into regional prompting, generating parts separately with masks. The general lesson is that when a pipeline's output is wrong, check which component actually carries the failing information." }] }
  ] }
});

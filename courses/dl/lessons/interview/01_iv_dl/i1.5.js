/* ============================================================================
   INTERVIEW I1.5 — Advanced Training & Deployment
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/00_Interview_Bank/01_DL_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.5",
 "lede": "**30 questions** from Deep Learning Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Advanced Training & Deployment",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is curriculum learning?",
   "body": [
    {
     "t": "p",
     "text": "Training on easy examples first, then gradually introducing harder ones. Inspired by human learning. Can accelerate convergence and improve generalization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is a GAN? Derive the minimax objective and optimal discriminator.",
   "body": [
    {
     "t": "p",
     "text": "**Minimax game:**"
    },
    {
     "t": "math",
     "tex": "\\min_G\\max_D V(D,G) = \\mathbb{E}_{x\\sim p_{data}}[\\log D(x)] + \\mathbb{E}_{z\\sim p_z}[\\log(1-D(G(z)))]"
    },
    {
     "t": "p",
     "text": "**Optimal discriminator** (with \\(G\\) fixed):"
    },
    {
     "t": "math",
     "tex": "D^*(x) = \\frac{p_{data}(x)}{p_{data}(x)+p_g(x)}"
    },
    {
     "t": "p",
     "text": "Substituting \\(D^*\\) back, the game becomes:"
    },
    {
     "t": "math",
     "tex": "\\min_G V(D^*,G) = \\underbrace{-\\log 4}_{\\text{constant}} + 2\\cdot KL\\left(p_{data}\\middle\\|\\frac{p_{data}+p_g}{2}\\right) + 2\\cdot KL\\left(p_g\\middle\\|\\frac{p_{data}+p_g}{2}\\right)"
    },
    {
     "t": "math",
     "tex": "= -\\log 4 + 4\\cdot JSD(p_{data}\\|p_g)"
    },
    {
     "t": "p",
     "text": "**Global minimum** at \\(G^*\\): \\(p_g = p_{data}\\) → \\(JSD = 0\\)."
    },
    {
     "t": "p",
     "text": "**Vanishing gradient problem:** When \\(D\\) is perfect:"
    },
    {
     "t": "math",
     "tex": "D(G(z)) \\approx 0 \\implies \\nabla_G\\log(1-D(G(z))) \\approx 0"
    },
    {
     "t": "p",
     "text": "→ Generator receives zero gradient."
    },
    {
     "t": "p",
     "text": "**Non-saturating loss fix (heuristic):**"
    },
    {
     "t": "math",
     "tex": "\\max_G \\mathbb{E}_z[\\log D(G(z))]"
    },
    {
     "t": "p",
     "text": "Same fixed point, but provides stronger gradient early in training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "WGAN — derive the Wasserstein distance and gradient penalty.",
   "body": [
    {
     "t": "p",
     "text": "**Problem with JSD:** Disjoint support of \\(p_{data}\\) and \\(p_g\\) → \\(JSD = \\log 2\\) (constant, zero gradient)."
    },
    {
     "t": "p",
     "text": "**Earth Mover's (Wasserstein-1) distance:**"
    },
    {
     "t": "math",
     "tex": "W(p,q) = \\inf_{\\gamma\\in\\Pi(p,q)} \\mathbb{E}_{(x,y)\\sim\\gamma}[||x-y||]"
    },
    {
     "t": "p",
     "text": "**Kantorovich-Rubinstein duality (1-Lipschitz functions \\(f\\) with \\(||f||_L \\leq 1\\)):**"
    },
    {
     "t": "math",
     "tex": "W(p,q) = \\sup_{||f||_L\\leq 1} \\mathbb{E}_x[f(x)] - \\mathbb{E}_y[f(y)]"
    },
    {
     "t": "p",
     "text": "**WGAN objective:**"
    },
    {
     "t": "math",
     "tex": "\\min_G\\max_{||D||_L\\leq 1} \\mathbb{E}_{x\\sim p_{data}}[D(x)] - \\mathbb{E}_{z\\sim p_z}[D(G(z))]"
    },
    {
     "t": "p",
     "text": "**Gradient Penalty (WGAN-GP):** Enforce Lipschitz constraint via:"
    },
    {
     "t": "math",
     "tex": "\\lambda \\mathbb{E}_{\\hat{x}}[(||\\nabla_{\\hat{x}}D(\\hat{x})||_2 - 1)^2]"
    },
    {
     "t": "p",
     "text": "where \\(\\hat{x}\\) is sampled uniformly along lines between real and fake samples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "Derive the VAE ELBO objective from first principles.",
   "body": [
    {
     "t": "p",
     "text": "**Goal:** Learn a generative model \\(p_\\theta(x) = \\int p_\\theta(x|z)p(z)dz\\) — intractable integral."
    },
    {
     "t": "p",
     "text": "**Variational inference:** Introduce approximate posterior \\(q_\\phi(z|x)\\):"
    },
    {
     "t": "math",
     "tex": "\\log p_\\theta(x) = \\mathbb{E}_{q_\\phi(z|x)}\\left[\\log\\frac{p_\\theta(x,z)}{q_\\phi(z|x)}\\right] + KL(q_\\phi(z|x)||p_\\theta(z|x))"
    },
    {
     "t": "math",
     "tex": "\\geq \\underbrace{\\mathbb{E}_{q_\\phi(z|x)}[\\log p_\\theta(x|z)] - KL(q_\\phi(z|x)||p(z))}_{\\text{ELBO} = \\mathcal{L}(\\theta,\\phi;x)}"
    },
    {
     "t": "p",
     "text": "**ELBO decomposition:**"
    },
    {
     "t": "ul",
     "items": [
      "\\(\\mathbb{E}_{q_\\phi(z|x)}[\\log p_\\theta(x|z)]\\): reconstruction term (log-likelihood)",
      "\\(-KL(q_\\phi(z|x)||p(z))\\): regularisation (keep posterior close to prior \\(p(z)=\\mathcal{N}(0,I)\\))"
     ]
    },
    {
     "t": "p",
     "text": "**Encoder:** \\(q_\\phi(z|x) = \\mathcal{N}(z|\\mu_\\phi(x), \\text{diag}(\\sigma^2_\\phi(x)))\\)"
    },
    {
     "t": "p",
     "text": "**Reparameterisation trick:**"
    },
    {
     "t": "math",
     "tex": "z = \\mu_\\phi(x) + \\sigma_\\phi(x)\\odot\\epsilon, \\quad \\epsilon\\sim\\mathcal{N}(0,I)"
    },
    {
     "t": "p",
     "text": "**Closed-form KL** (Gaussian prior):"
    },
    {
     "t": "math",
     "tex": "KL = -\\frac{1}{2}\\sum_j(1+\\log\\sigma_j^2 - \\mu_j^2 - \\sigma_j^2)"
    },
    {
     "t": "p",
     "text": "**Training loss:**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = -\\mathbb{E}_{\\epsilon}[\\log p_\\theta(x|\\mu_\\phi(x)+\\sigma_\\phi(x)\\odot\\epsilon)] + \\frac{1}{2}\\sum_j(\\mu_j^2+\\sigma_j^2-1-\\log\\sigma_j^2)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "Derive diffusion models — forward process, reverse process, and training objective.",
   "body": [
    {
     "t": "p",
     "text": "**Forward process (DDPM):** Add Gaussian noise over \\(T\\) steps:"
    },
    {
     "t": "math",
     "tex": "q(x_t|x_{t-1}) = \\mathcal{N}(x_t;\\sqrt{1-\\beta_t}x_{t-1}, \\beta_t\\mathbf{I})"
    },
    {
     "t": "p",
     "text": "**Closed-form marginal** (let \\(\\alpha_t = 1-\\beta_t\\), \\(\\bar{\\alpha}_t = \\prod_{s=1}^t\\alpha_s\\)):"
    },
    {
     "t": "math",
     "tex": "q(x_t|x_0) = \\mathcal{N}(x_t;\\sqrt{\\bar{\\alpha}_t}x_0, (1-\\bar{\\alpha}_t)\\mathbf{I})"
    },
    {
     "t": "math",
     "tex": "\\implies x_t = \\sqrt{\\bar{\\alpha}_t}x_0 + \\sqrt{1-\\bar{\\alpha}_t}\\epsilon, \\quad \\epsilon\\sim\\mathcal{N}(0,\\mathbf{I})"
    },
    {
     "t": "p",
     "text": "**Reverse process:** Learn \\(p_\\theta(x_{t-1}|x_t) = \\mathcal{N}(x_{t-1};\\mu_\\theta(x_t,t), \\Sigma_\\theta)\\)"
    },
    {
     "t": "p",
     "text": "**ELBO training objective:**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = \\mathbb{E}_{x_0,\\epsilon,t}\\left[||\\epsilon - \\epsilon_\\theta(x_t,t)||^2\\right]"
    },
    {
     "t": "p",
     "text": "The neural network \\(\\epsilon_\\theta\\) predicts the noise \\(\\epsilon\\) added at step \\(t\\) — equivalent to score matching."
    },
    {
     "t": "p",
     "text": "**Posterior mean (known):**"
    },
    {
     "t": "math",
     "tex": "\\tilde{\\mu}_t(x_t,x_0) = \\frac{\\sqrt{\\bar{\\alpha}_{t-1}}\\beta_t}{1-\\bar{\\alpha}_t}x_0 + \\frac{\\sqrt{\\alpha_t}(1-\\bar{\\alpha}_{t-1})}{1-\\bar{\\alpha}_t}x_t"
    },
    {
     "t": "p",
     "text": "**DDIM (deterministic):** Replace stochastic reverse with non-Markovian update:"
    },
    {
     "t": "math",
     "tex": "x_{t-1} = \\sqrt{\\bar{\\alpha}_{t-1}}\\hat{x}_0 + \\sqrt{1-\\bar{\\alpha}_{t-1}}\\epsilon_\\theta(x_t,t)"
    },
    {
     "t": "p",
     "text": "Allows $\\sim$50 steps instead of 1000."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "76",
   "q": "Derive contrastive learning objectives — NT-Xent (SimCLR) and CLIP.",
   "body": [
    {
     "t": "p",
     "text": "**SimCLR NT-Xent loss:** For a batch of \\(N\\) samples, create \\(2N\\) views via augmentation. For a positive pair \\((i, j)\\):"
    },
    {
     "t": "math",
     "tex": "\\ell(i,j) = -\\log\\frac{\\exp(\\text{sim}(z_i,z_j)/\\tau)}{\\sum_{k=1}^{2N}\\mathbf{1}[k\\neq i]\\exp(\\text{sim}(z_i,z_k)/\\tau)}"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}_{SimCLR} = \\frac{1}{2N}\\sum_{k=1}^N[\\ell(2k-1,2k)+\\ell(2k,2k-1)]"
    },
    {
     "t": "p",
     "text": "where \\(\\text{sim}(u,v) = u^Tv/(||u||\\cdot||v||)\\) and \\(\\tau\\) = temperature."
    },
    {
     "t": "p",
     "text": "**CLIP contrastive loss** (joint image-text): For batch of \\((image_i, text_i)\\) pairs:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}_{CLIP} = -\\frac{1}{2N}\\sum_i\\left[\\log\\frac{e^{\\phi_i^T\\psi_i/\\tau}}{\\sum_j e^{\\phi_i^T\\psi_j/\\tau}} + \\log\\frac{e^{\\phi_i^T\\psi_i/\\tau}}{\\sum_j e^{\\phi_j^T\\psi_i/\\tau}}\\right]"
    },
    {
     "t": "p",
     "text": "where \\(\\phi_i = f_{vision}(image_i)\\), \\(\\psi_i = g_{text}(text_i)\\) are normalized embeddings."
    },
    {
     "t": "p",
     "text": "**InfoNCE lower bound:** \\(\\mathcal{L}_{NT-Xent}\\) is an upper bound on \\(-MI(z_i;z_j)\\) — maximising it maximises a lower bound on mutual information between views."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is self-supervised learning?",
   "body": [
    {
     "t": "p",
     "text": "Learning representations from unlabeled data using automatically generated supervision signals (masked tokens in BERT, next frame prediction). Removes need for expensive labeling."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is the difference between instance normalization, layer normalization, and batch normalization?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Batch Norm:** Normalize across the batch dimension. Good for CNNs.",
      "**Layer Norm:** Normalize across features of a single sample. Good for Transformers/RNNs.",
      "**Instance Norm:** Normalize each spatial feature map per sample. Good for style transfer."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is gradient clipping and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "Gradient clipping rescales gradients when their norm exceeds a threshold. Prevents exploding gradients in RNNs and Transformers. `torch.nn.utils.clip_grad_norm_(params, max_norm=1.0)`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is the difference between model quantization and pruning?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Quantization:** Reduce numerical precision (float32 → int8). Reduces model size and improves inference speed.",
      "**Pruning:** Remove weights below a threshold (magnitude pruning) or entire neurons/heads. Reduces model size."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is INT8 quantization?",
   "body": [
    {
     "t": "p",
     "text": "Converting float32 weights and activations to 8-bit integers. Reduces model memory by 4×, inference latency by 2–4× with minimal accuracy loss. Post-training quantization (PTQ) or quantization-aware training (QAT)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is ONNX?",
   "body": [
    {
     "t": "p",
     "text": "Open Neural Network Exchange — an open format for representing ML/DL models, enabling interoperability between frameworks (PyTorch → TensorFlow) and deployment targets (ONNX Runtime, TensorRT)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is TensorRT?",
   "body": [
    {
     "t": "p",
     "text": "NVIDIA's high-performance inference SDK. Optimizes trained models by: layer fusion, precision calibration (FP16/INT8), kernel auto-tuning. Achieves 2–10× speedup vs. standard PyTorch inference on NVIDIA GPUs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is vLLM and how does it optimize LLM inference?",
   "body": [
    {
     "t": "p",
     "text": "vLLM implements PagedAttention — managing KV cache in non-contiguous memory pages (like OS virtual memory). Eliminates KV cache fragmentation, enabling up to 24× throughput improvement for LLM serving."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is speculative decoding?",
   "body": [
    {
     "t": "p",
     "text": "A small draft model generates multiple tokens quickly; the large model verifies them in parallel in a single forward pass. If tokens are accepted, multiple tokens are generated per large-model call — faster than sequential."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What are the components of a modern LLM training pipeline?",
   "body": [
    {
     "t": "p",
     "text": "Pre-training → SFT (Supervised Fine-Tuning) → RLHF/DPO alignment → Quantization → Deployment with serving infrastructure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is Direct Preference Optimization (DPO)?",
   "body": [
    {
     "t": "p",
     "text": "An alternative to RLHF that eliminates the separate reward model training step. Directly optimizes the LLM using preference pairs (chosen vs. rejected responses) using a reparameterized binary cross-entropy loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is Flash Decoding?",
   "body": [
    {
     "t": "p",
     "text": "An optimization that parallelizes the decoding attention across the KV sequence dimension using online softmax. Particularly effective when the KV cache is very long (large batch sizes or long sequences)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is Mixture of Experts (MoE)?",
   "body": [
    {
     "t": "p",
     "text": "Only a subset of model parameters (experts) are activated per input, based on a router network. Allows very large model capacity with controlled compute. Examples: Mixtral 8×7B, GPT-4 rumored MoE."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is continual learning and what is catastrophic forgetting?",
   "body": [
    {
     "t": "p",
     "text": "Continual learning: Learning new tasks without forgetting old ones. Catastrophic forgetting: Training on new data overwrites previously learned information. Solutions: EWC (Elastic Weight Consolidation), replay buffers, modular networks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is the role of learning rate warmup and decay?",
   "body": [
    {
     "t": "p",
     "text": "Warmup: Start with a small learning rate and gradually increase for the first N steps. Prevents early instability. Decay: Reduce learning rate over time (cosine, linear, multiplicative) to fine-tune convergence."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is label smoothing in deep learning?",
   "body": [
    {
     "t": "p",
     "text": "Replace one-hot labels with soft labels (e.g., 0.9 for true class, 0.1/K distributed elsewhere). Prevents overconfidence, improves calibration and generalization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "How does the Transformer attention mask work?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Padding mask:** Prevents attending to padding tokens.",
      "**Causal mask (decoder):** Lower triangular mask prevents each position from attending to future tokens (autoregressive constraint)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is perplexity in language modeling?",
   "body": [
    {
     "t": "p",
     "text": "Perplexity = exp(average negative log-likelihood per token). Measures how well the model predicts a held-out test set. Lower is better; a perplexity of k means the model is as uncertain as choosing uniformly among k options."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is the difference between greedy decoding, temperature sampling, top-k and top-p (nucleus) sampling?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Greedy:** Always picks the highest probability token. Predictable, repetitive.",
      "**Temperature:** Divides logits by T before softmax. T > 1 = more random; T < 1 = more focused.",
      "**Top-k:** Sample only from the k most likely tokens.",
      "**Top-p (nucleus):** Sample from the smallest set of tokens whose cumulative probability exceeds p."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "How does weight tying in language models work?",
   "body": [
    {
     "t": "p",
     "text": "Sharing the weights between the input embedding matrix and the final output projection matrix. Reduces parameters and often improves performance, especially in smaller models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is model merging (SLERP, DARE, TIES)?",
   "body": [
    {
     "t": "p",
     "text": "Combining weights of multiple fine-tuned models derived from the same base without additional training. SLERP: spherical linear interpolation in weight space. TIES: resolves sign conflicts during merge. Popular in open-source LLM community."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is FSDP (Fully Sharded Data Parallel)?",
   "body": [
    {
     "t": "p",
     "text": "PyTorch's distributed training strategy that shards model parameters, gradients, and optimizer states across GPUs instead of replicating them. Enables training models that don't fit on a single GPU memory."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the difference between a frozen and unfrozen backbone in fine-tuning?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Frozen:** Pre-trained weights don't change; only task head is trained. Fast; prevents catastrophic forgetting. Best with limited data.",
      "**Unfrozen (full fine-tuning):** All weights are updated. Better performance but slower and risks forgetting."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "What is the attention bottleneck at inference and how is it being solved?",
   "body": [
    {
     "t": "p",
     "text": "Standard attention is O(n²) time and memory in sequence length. Solutions:"
    },
    {
     "t": "ul",
     "items": [
      "KV cache compression (quantized KV, GQA, MQA)",
      "Grouped Query Attention (GQA): Fewer K/V heads than Q heads",
      "Multi-Query Attention (MQA): Single K/V head shared across all Q heads",
      "Sliding window / sparse attention for very long sequences"
     ]
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

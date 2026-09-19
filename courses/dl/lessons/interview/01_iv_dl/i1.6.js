/* ============================================================================
   INTERVIEW I1.6 — Advanced Architectures
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/00_Interview_Bank/01_DL_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.6",
 "lede": "**20 questions** from Deep Learning Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Advanced Architectures",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "101",
   "q": "What is a Residual Network (ResNet) and why does it work?",
   "body": [
    {
     "t": "p",
     "text": "Skip connections allow gradient flow directly through identity mappings:"
    },
    {
     "t": "math",
     "tex": "\\mathbf{y} = \\mathcal{F}(\\mathbf{x}, \\{W_i\\}) + \\mathbf{x}"
    },
    {
     "t": "p",
     "text": "Networks can learn residuals \\(\\mathcal{F}(\\mathbf{x})\\) rather than full mappings. Solves vanishing gradients in 100+ layer networks. ResNet-50/101/152 remain production baselines."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "102",
   "q": "What is a DenseNet architecture?",
   "body": [
    {
     "t": "p",
     "text": "Each layer receives feature maps from ALL previous layers (dense connectivity). Encourages feature reuse, reduces parameter count, improves gradient flow vs ResNets. Connection: \\(\\mathbf{x_l} = H_l([\\mathbf{x_0}, \\mathbf{x_1}, ..., \\mathbf{x_{l-1}}])\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "103",
   "q": "What is MobileNet and why is it used for edge deployment?",
   "body": [
    {
     "t": "p",
     "text": "Replaces standard convolutions with depthwise separable convolutions:"
    },
    {
     "t": "ul",
     "items": [
      "Depthwise conv: 1 filter per input channel (spatial features).",
      "Pointwise conv: 1×1 conv to combine channels (cross-channel features)."
     ]
    },
    {
     "t": "p",
     "text": "Reduces params/FLOPs by ~8-9× vs standard conv with minimal accuracy loss. Ideal for mobile/embedded inference."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "104",
   "q": "What is EfficientNet and its compound scaling strategy?",
   "body": [
    {
     "t": "p",
     "text": "Uniformly scales network width (channels), depth (layers), and resolution together using a compound coefficient \\(\\phi\\):"
    },
    {
     "t": "math",
     "tex": "d = \\alpha^\\phi, \\quad w = \\beta^\\phi, \\quad r = \\gamma^\\phi \\quad s.t. \\quad \\alpha \\cdot \\beta^2 \\cdot \\gamma^2 \\approx 2"
    },
    {
     "t": "p",
     "text": "Achieves state-of-the-art accuracy with far fewer parameters than ResNets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "105",
   "q": "What is Vision Transformer (ViT)?",
   "body": [
    {
     "t": "p",
     "text": "Treats image as a sequence of patches:"
    },
    {
     "t": "ol",
     "items": [
      "Split image into 16×16 patches.",
      "Linearly embed each patch.",
      "Add positional embeddings.",
      "Feed through standard Transformer encoder.",
      "[CLS] token is classified."
     ]
    },
    {
     "t": "p",
     "text": "Outperforms CNNs on large-scale data but needs more data than CNNs for small datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "106",
   "q": "What is Swin Transformer and how does it differ from ViT?",
   "body": [
    {
     "t": "p",
     "text": "Introduces hierarchical (multi-scale) representations and shifted window attention (instead of global attention). Attention computed within local windows — O(N) vs ViT's O(N²). Suitable as vision backbone for detection and segmentation tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "107",
   "q": "What is YOLO (You Only Look Once)?",
   "body": [
    {
     "t": "p",
     "text": "Single-shot object detection: divides image into grid, each cell predicts bounding boxes + class probabilities in one forward pass. Much faster than two-stage detectors (R-CNN family). YOLOv8 achieves ~55ms inference on CPU for full-HD images."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "108",
   "q": "What is UNet and what is it used for?",
   "body": [
    {
     "t": "p",
     "text": "An encoder-decoder CNN with skip connections between corresponding encoder and decoder layers. Produces pixel-wise segmentation maps. Originally designed for biomedical image segmentation; now a backbone for diffusion models' denoising U-Nets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "109",
   "q": "What is a Generative Adversarial Network (GAN)?",
   "body": [
    {
     "t": "p",
     "text": "Two networks trained adversarially:"
    },
    {
     "t": "ul",
     "items": [
      "**Generator G:** Maps noise \\(z\\) to fake samples.",
      "**Discriminator D:** Distinguishes real from fake."
     ]
    },
    {
     "t": "p",
     "text": "Objective: \\(\\min_G \\max_D \\mathbb{E}[\\log D(x)] + \\mathbb{E}[\\log(1-D(G(z)))]\\) Training instability (mode collapse, vanishing gradients) is the main challenge."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "110",
   "q": "What is mode collapse in GANs and how do you mitigate it?",
   "body": [
    {
     "t": "p",
     "text": "Generator produces only a few high-quality samples while ignoring most of the data distribution. Mitigation:"
    },
    {
     "t": "ul",
     "items": [
      "**Wasserstein GAN (WGAN):** Uses earth mover's distance — more stable training.",
      "**Minibatch discrimination:** Expose D to statistics across batch.",
      "**Progressive growing (ProGAN):** Gradually increase resolution during training."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "111",
   "q": "What is a Variational Autoencoder (VAE)?",
   "body": [
    {
     "t": "p",
     "text": "Encodes inputs to a latent distribution \\(q(z|x) = \\mathcal{N}(\\mu, \\sigma^2)\\) rather than a point. Trained to maximize ELBO:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = \\mathbb{E}_{q(z|x)}[\\log p(x|z)] - KL(q(z|x) \\| p(z))"
    },
    {
     "t": "p",
     "text": "Reconstruction loss + KL regularization toward standard normal prior. Enables smooth interpolation and generation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "112",
   "q": "What is the reparameterization trick in VAEs?",
   "body": [
    {
     "t": "p",
     "text": "Backpropagation cannot flow through sampling \\(z \\sim \\mathcal{N}(\\mu, \\sigma^2)\\). Instead:"
    },
    {
     "t": "math",
     "tex": "z = \\mu + \\sigma \\cdot \\epsilon, \\quad \\epsilon \\sim \\mathcal{N}(0, I)"
    },
    {
     "t": "p",
     "text": "Gradients flow through \\(\\mu\\) and \\(\\sigma\\), not through the stochastic node."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "113",
   "q": "What is a diffusion model?",
   "body": [
    {
     "t": "p",
     "text": "Two processes:"
    },
    {
     "t": "ul",
     "items": [
      "**Forward (noising):** Gradually adds Gaussian noise to data over T timesteps.",
      "**Reverse (denoising):** Train a U-Net to predict and remove noise at each step."
     ]
    },
    {
     "t": "p",
     "text": "At inference: start from Gaussian noise, predict and remove noise iteratively. State-of-the-art for image/audio/video generation (DALL·E 3, Stable Diffusion, Sora)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "114",
   "q": "What is DDPM vs DDIM?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**DDPM (Denoising Diffusion Probabilistic Models):** Stochastic reverse process, requires ~1000 steps.",
      "**DDIM (Denoising Diffusion Implicit Models):** Deterministic reverse process, ~50 steps with nearly identical quality. Enables image interpolation and editing."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "115",
   "q": "What is a flow-based generative model?",
   "body": [
    {
     "t": "p",
     "text": "Learn an invertible transformation \\(f: x \\leftrightarrow z\\) (bijection between data and latent space). Exact log-likelihood computation via change of variables formula. Examples: Glow, RealNVP, Normalizing Flows. Slower than diffusion/GANs in practice."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "116",
   "q": "What is a Capsule Network?",
   "body": [
    {
     "t": "p",
     "text": "Hinton's alternative to CNNs: capsules are groups of neurons encoding entity properties (position, orientation, size) as vectors. Dynamic routing replaces max-pooling. Better at equivariance but expensive. Not yet widely adopted in industry."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "117",
   "q": "What is Graph Neural Network (GNN)?",
   "body": [
    {
     "t": "p",
     "text": "Extends neural networks to graph-structured data. Message passing: each node aggregates information from neighbors:"
    },
    {
     "t": "math",
     "tex": "h_v^{(l+1)} = \\sigma\\!\\left(W \\cdot \\text{AGG}\\!\\left(\\{h_u^{(l)} : u \\in \\mathcal{N}(v)\\}\\right)\\right)"
    },
    {
     "t": "p",
     "text": "Applications: molecular property prediction, recommendation systems, social networks, knowledge graphs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "118",
   "q": "What are GCN, GAT, and GraphSAGE?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**GCN (Graph Convolutional Network):** Averages neighbor features with fixed symmetric normalization.",
      "**GAT (Graph Attention Network):** Learns importance weights for each neighbor via attention.",
      "**GraphSAGE:** Samples a fixed number of neighbors, then aggregates — scales to millions of nodes."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "119",
   "q": "What is a Neural ODE?",
   "body": [
    {
     "t": "p",
     "text": "Parameterizes the derivative of hidden state with a neural network:"
    },
    {
     "t": "math",
     "tex": "\\frac{dh(t)}{dt} = f_\\theta(h(t), t)"
    },
    {
     "t": "p",
     "text": "Hidden state is the ODE solution at time T. Memory-efficient (O(1) memory for backprop). Applications: continuous normalizing flows, time-series modeling."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "120",
   "q": "What is a State Space Model (SSM) and Mamba?",
   "body": [
    {
     "t": "p",
     "text": "SSMs model sequences with recurrent state: \\(h'(t) = Ah(t) + Bx(t)\\), \\(y(t) = Ch(t) + Dx(t)\\). Mamba introduces input-selective SSM (S6 layer) — linear complexity O(N) vs Transformer's O(N²). Competitive with Transformers on long sequences."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

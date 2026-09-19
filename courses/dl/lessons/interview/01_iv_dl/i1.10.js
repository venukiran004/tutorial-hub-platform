/* ============================================================================
   INTERVIEW I1.10 — Production Deep Learning · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/00_Interview_Bank/01_DL_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.10",
 "lede": "**15 questions** from Deep Learning Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Production Deep Learning · 2",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "186",
   "q": "What is model merging (SLERP, TIES)?",
   "body": [
    {
     "t": "p",
     "text": "Combine multiple fine-tuned models at the weight level without additional training:"
    },
    {
     "t": "ul",
     "items": [
      "**SLERP:** Spherical interpolation in weight space.",
      "**TIES-merging:** Resolve sign conflicts in delta weights before averaging.",
      "**DARE:** Randomly prune and rescale deltas before merging."
     ]
    },
    {
     "t": "p",
     "text": "Enables capability blending without additional GPU training."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "187",
   "q": "What is retrieval-augmented pretraining (RETRO)?",
   "body": [
    {
     "t": "p",
     "text": "DeepMind's model that augments language modeling with retrieved text at each attention layer. Achieves GPT-3 performance with 25× fewer parameters by leveraging a large external text database at inference."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "188",
   "q": "What is the difference between encoder, decoder, and encoder-decoder models for NLP tasks?",
   "body": [
    {
     "t": "table",
     "head": [
      "Model Type",
      "Best For",
      "Examples"
     ],
     "rows": [
      [
       "Encoder-only",
       "Classification, NER, QA",
       "BERT, RoBERTa"
      ],
      [
       "Decoder-only",
       "Generation, code, reasoning",
       "GPT, LLaMA"
      ],
      [
       "Encoder-Decoder",
       "Translation, summarization",
       "T5, BART, mT5"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "189",
   "q": "What is PEFT (Parameter-Efficient Fine-Tuning)?",
   "body": [
    {
     "t": "p",
     "text": "Fine-tune LLMs by training only a small fraction of parameters while keeping the rest frozen:"
    },
    {
     "t": "ul",
     "items": [
      "**LoRA / QLoRA:** Low-rank adapters.",
      "**Prefix tuning:** Trainable prefix tokens.",
      "**Prompt tuning:** Trainable soft prompt embeddings.",
      "**Adapter layers:** Small bottleneck layers inserted between Transformer layers."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "190",
   "q": "What is long-context retrieval augmented generation (Long-RAG) vs standard RAG?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Standard RAG:** Retrieve top-K chunks (~1K tokens total), fit in short context.",
      "**Long-RAG:** Use a long-context LLM (128K+ tokens), inject more context; fewer retrieval errors but expensive."
     ]
    },
    {
     "t": "p",
     "text": "Trade-off: long context = higher quality recall but higher inference cost and \"lost in the middle\" attention degradation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "191",
   "q": "What is multimodal deep learning?",
   "body": [
    {
     "t": "p",
     "text": "Models that process and reason across multiple modalities (text, images, audio, video, code). Examples:"
    },
    {
     "t": "ul",
     "items": [
      "CLIP: Contrastive image-text pretraining.",
      "GPT-4o / Gemini: Native multimodal generation.",
      "Flamingo: Visual language model with cross-attention to images."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "192",
   "q": "What is CLIP and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "Trains an image encoder and text encoder jointly with a contrastive objective:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = -\\frac{1}{N}\\sum_i \\log \\frac{\\exp(\\text{sim}(i_i, t_i)/\\tau)}{\\sum_j \\exp(\\text{sim}(i_i, t_j)/\\tau)}"
    },
    {
     "t": "p",
     "text": "Learns aligned image-text representations from 400M internet image-caption pairs. Zero-shot classification: compare image embedding to class description embeddings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "193",
   "q": "What is object detection evaluation metric — mAP?",
   "body": [
    {
     "t": "p",
     "text": "Mean Average Precision across all object classes:"
    },
    {
     "t": "ol",
     "items": [
      "For each class, compute precision-recall curve.",
      "Average Precision (AP) = area under the PR curve.",
      "mAP = mean AP across all classes."
     ]
    },
    {
     "t": "p",
     "text": "COCO uses mAP@[.5:.95] (average over 10 IoU thresholds). PASCAL VOC uses mAP@0.5."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "194",
   "q": "What is panoptic segmentation?",
   "body": [
    {
     "t": "p",
     "text": "Combines semantic segmentation (classify every pixel) and instance segmentation (delineate individual object instances) into a single unified output. Each pixel gets a semantic class + optional instance ID (if it belongs to a \"thing\" class)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "195",
   "q": "What is Neural Radiance Fields (NeRF)?",
   "body": [
    {
     "t": "p",
     "text": "Represent a 3D scene as a continuous volumetric radiance field \\(F: (x,y,z,\\theta,\\phi) \\rightarrow (RGB, \\sigma)\\) modeled by an MLP. Rendered via differentiable volume rendering. Enables novel view synthesis from limited 2D images."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "196",
   "q": "What is image generation evaluation metric (FID)?",
   "body": [
    {
     "t": "p",
     "text": "Fréchet Inception Distance: measures statistical distance between real and generated image distributions in Inception feature space:"
    },
    {
     "t": "math",
     "tex": "FID = \\|\\mu_r - \\mu_g\\|^2 + Tr(\\Sigma_r + \\Sigma_g - 2(\\Sigma_r\\Sigma_g)^{1/2})"
    },
    {
     "t": "p",
     "text": "Lower = better. Sensitive to both image quality and diversity (contrast to IS which only measures quality)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "197",
   "q": "What is text-to-image generation pipeline?",
   "body": [
    {
     "t": "ol",
     "items": [
      "Text → CLIP/T5 text embedding.",
      "Latent diffusion: u-Net denoising in compressed latent space.",
      "VAE decoder: Decode latent to pixel space."
     ]
    },
    {
     "t": "p",
     "text": "SDXL, Stable Diffusion 3 use transformer-based DiT (Diffusion Transformer) instead of U-Net."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "198",
   "q": "What is RLVR (Reinforcement Learning with Verifiable Rewards)?",
   "body": [
    {
     "t": "p",
     "text": "Train reasoning models (math, code) using RL with a verifier that checks exact correctness (not an LLM judge). Groups of rollouts; correct answers get positive reward. Used in DeepSeek-R1, OpenAI o1. Produces chain-of-thought reasoning without step-level annotations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "199",
   "q": "What is the difference between thinking/reasoning models and standard chat models?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Standard chat:** Outputs directly, fast.",
      "**Thinking/reasoning (o1, R1, Gemini Flash Thinking):** Generates a hidden or visible chain-of-thought scratchpad before producing the final answer. Much better on STEM/logic tasks; higher latency and token cost."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "200",
   "q": "What is mixture of experts (MoE) and how is it used in modern LLMs?",
   "body": [
    {
     "t": "p",
     "text": "Replace dense FFN layers with a router + multiple expert FFNs. At each token, the router selects top-K experts (typically 2 out of 8-64). Only selected experts activate → dense model capacity at sparse compute:"
    },
    {
     "t": "ul",
     "items": [
      "Mixtral 8×7B activates ~13B params per token out of 47B total.",
      "GPT-4 (rumored): MoE architecture enables scale beyond dense models."
     ]
    },
    {
     "t": "p",
     "text": "Challenges: load balancing among experts, router collapse."
    },
    {
     "t": "p",
     "text": "*Last Updated: April 2026* *Topic: Deep Learning Interview Questions*"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

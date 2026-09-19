/* ============================================================================
   PRACTICE P4.4 — Sequence Models and NLP · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/03_Sequence_Models_and_NLP.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.4",
 "lede": "**25 scenarios** from Sequence Models and NLP. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "What is the role of layer normalization in Transformers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Post-norm (original):** Apply LN after residual connection: LN(x + sublayer(x))",
      "**Pre-norm (modern):** Apply LN before sublayer: x + sublayer(LN(x))"
     ]
    },
    {
     "t": "p",
     "text": "**Pre-norm advantages:**"
    },
    {
     "t": "ol",
     "items": [
      "More stable training (gradients don't explode)",
      "Can train deeper models without careful warmup",
      "Used in GPT-2/3, LLaMA"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Pre-norm is now standard for large models. RMSNorm (simplified LN without mean subtraction) is even faster, used in LLaMA."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is multi-task learning in NLP?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train one model on multiple tasks simultaneously."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Example: T5 multi-task\ntasks = [\n    (\"translate English to French: Hello\", \"Bonjour\"),\n    (\"sentiment: Great movie!\", \"positive\"),\n    (\"summarize: Long article...\", \"Summary...\"),\n]"
    },
    {
     "t": "p",
     "text": "**Benefits:**"
    },
    {
     "t": "ol",
     "items": [
      "Shared representations across tasks",
      "Regularization — prevents overfitting to any single task",
      "Improved performance on low-resource tasks"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Natural language instructions enable zero-shot multi-task learning — model learns to follow instructions, not just perform fixed tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is the difference between semantic similarity and lexical matching?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Lexical (TF-IDF, BM25):** Match based on shared words",
      "— \"automobile repair\" vs \"car fix\" → low match (different words)",
      "**Semantic (SBERT, embeddings):** Match based on meaning",
      "— \"automobile repair\" vs \"car fix\" → high match (same meaning)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Semantic search uses dense embeddings. Lexical uses sparse vectors. Hybrid approaches combine both — BM25 for recall, re-rank with semantic model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is instruction tuning for language models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fine-tune pre-trained LM on diverse instructions with outputs:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Instruction: \"Translate to Spanish: Hello\"\nOutput: \"Hola\"\n\nInstruction: \"What is 2+2?\"\nOutput: \"4\"\n\nInstruction: \"Write a poem about cats\"\nOutput: \"Whiskers soft...\""
    },
    {
     "t": "p",
     "text": "**Models:** FLAN-T5, InstructGPT, Alpaca, Vicuna."
    },
    {
     "t": "p",
     "text": "**Explanation:** Instruction tuning bridges the gap between \"predict next token\" and \"follow user instructions\". RLHF further aligns model behavior with human preferences."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "How does causal language modeling differ from masked language modeling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Causal LM (GPT):** Predict next token given previous tokens. Left-to-right only."
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "  P(w_t | w_1, w_2, ..., w_{t-1})"
    },
    {
     "t": "ul",
     "items": [
      "**Masked LM (BERT):** Predict masked token given all other tokens (bidirectional)."
     ]
    },
    {
     "t": "code",
     "lang": "text",
     "code": "  P(w_t | w_1, ..., w_{t-1}, [MASK], w_{t+1}, ..., w_n)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Causal LM naturally generates text (autoregressive). MLM better for understanding but can't generate naturally. Prefix LM (UniLM) combines both."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is the role of special tokens in Transformer models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "BERT: [CLS] text [SEP] text2 [SEP] [PAD] [PAD]\nGPT: <|startoftext|> text <|endoftext|>\nT5: <pad> text </s>\nChat: <|user|> question <|assistant|> answer <|end|>"
    },
    {
     "t": "p",
     "text": "**Purposes:**"
    },
    {
     "t": "ol",
     "items": [
      "[CLS]: Aggregate sequence representation for classification",
      "[SEP]: Separate sentence pairs",
      "[PAD]: Fill variable-length sequences to same length",
      "[MASK]: Indicate positions to predict (MLM)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Special tokens are critical for model training. Misusing them during fine-tuning causes degraded performance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is the vanishing gradient problem in NLP and how did attention solve it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**RNN problem:** Information from early tokens fades as sequence grows:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Token 1 → RNN → ... → RNN (100 steps) → Token 100\nGradient must flow through 100 multiplications → vanishes/explodes"
    },
    {
     "t": "p",
     "text": "**Attention solution:** Direct connection from any token to any other:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Token 1 ←→ Token 100 (direct attention, no chain)\nGradient path length: O(1) regardless of sequence distance"
    },
    {
     "t": "p",
     "text": "**Explanation:** LSTM/GRU partially solved this with gates. Attention fully solved it — every token-pair has a direct path for gradient flow."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is document-level NLP and its challenges?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Processing full documents rather than sentences."
    },
    {
     "t": "p",
     "text": "**Challenges:**"
    },
    {
     "t": "ol",
     "items": [
      "**Length:** Documents exceed model context window (512, 4096 tokens)",
      "**Coherence:** Track entities, coreference across paragraphs",
      "**Structure:** Sections, headings, tables need different treatment"
     ]
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Hierarchical models (sentence → paragraph → document)",
      "Long-context models (Longformer, BigBird)",
      "Chunking + aggregation",
      "Extended context LLMs (128K tokens)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Most NLP benchmarks are sentence-level, but real applications need document understanding."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is the difference between sequence labeling and sequence classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Sequence classification:** One label for entire sequence",
      "— \"I love this movie!\" → Positive sentiment",
      "**Sequence labeling:** One label per token",
      "— \"John lives in Paris\" → B-PER O O B-LOC"
     ]
    },
    {
     "t": "p",
     "text": "**Models:**"
    },
    {
     "t": "ul",
     "items": [
      "Classification: [CLS] embedding → linear layer",
      "Labeling: Each token embedding → linear layer (+ CRF for dependencies)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** POS tagging, NER, chunking are sequence labeling. Sentiment, topic, intent are sequence classification."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is the role of pre-training data quality in NLP models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Data quality factors:**"
    },
    {
     "t": "ol",
     "items": [
      "**Diversity:** Cover many topics, styles, languages",
      "**Cleanliness:** Remove duplicates, low-quality text, harmful content",
      "**Recency:** Up-to-date information",
      "**Size:** More data generally helps (log-linear scaling)"
     ]
    },
    {
     "t": "p",
     "text": "**Impact of bad data:**"
    },
    {
     "t": "ul",
     "items": [
      "Toxic content → model generates toxic text",
      "Duplicates → model memorizes and regurgitates",
      "Biased data → biased outputs"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GPT-3 trained on 570GB. LLaMA filtered from 5TB to 1.4TB. Data curation is as important as architecture."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is zero-shot classification with NLI models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Use NLI model for any classification without training\nfrom transformers import pipeline\n\nclassifier = pipeline(\"zero-shot-classification\",\n                      model=\"facebook/bart-large-mnli\")\n\nresult = classifier(\n    \"I need to book a flight to New York\",\n    candidate_labels=[\"travel\", \"finance\", \"food\"]\n)\n# Output: travel (highest score)"
    },
    {
     "t": "p",
     "text": "**How:** Frame as NLI — \"This text is about {label}\" → entailment probability = confidence."
    },
    {
     "t": "p",
     "text": "**Explanation:** No training data needed. Add any label category dynamically. Quality depends on label descriptions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the Chain-of-Thought (CoT) prompting technique?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: \"What is 23 × 17?\" → \"391\" (direct)\n\nCoT: \"What is 23 × 17? Think step by step.\"\n→ \"23 × 17 = 23 × 10 + 23 × 7 = 230 + 161 = 391\""
    },
    {
     "t": "p",
     "text": "**Variants:**"
    },
    {
     "t": "ol",
     "items": [
      "Zero-shot CoT: \"Let's think step by step\"",
      "Few-shot CoT: Provide examples with reasoning",
      "Self-consistency: Sample multiple CoTs, take majority answer"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** CoT elicits reasoning from LLMs, dramatically improving math, logic, and multi-step tasks. Works best for large models (>~10B parameters)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is the difference between GPT-2, GPT-3, and GPT-4?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Model",
      "Parameters",
      "Context",
      "Key Innovation"
     ],
     "rows": [
      [
       "GPT-2",
       "1.5B",
       "1024",
       "Showed scaling works for generation"
      ],
      [
       "GPT-3",
       "175B",
       "2048",
       "In-context learning (few-shot)"
      ],
      [
       "GPT-4",
       "~1.8T (rumored MoE)",
       "128K",
       "Multimodal, RLHF, much better reasoning"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** The progression shows: scale + data + RLHF alignment = dramatic capability jumps. Each generation isn't just bigger — training methodology also substantially improved."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is the problem of catastrophic forgetting in NLP fine-tuning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fine-tuning on task A causes model to forget pre-trained knowledge."
    },
    {
     "t": "p",
     "text": "**Mitigations:**"
    },
    {
     "t": "ol",
     "items": [
      "**Lower learning rate:** 2e-5 to 5e-5 for BERT fine-tuning (not 1e-3)",
      "**Fewer epochs:** 3-5 epochs typically optimal",
      "**Layer-wise learning rates:** Lower LR for earlier layers",
      "**Data mixing:** Include some pre-training data during fine-tuning",
      "**PEFT methods:** LoRA/adapters modify few parameters → less forgetting"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Delicate balance: too little training = underfitting. Too much = forgetting. Early stopping on validation set is critical."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the difference between hard attention and soft attention?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Soft attention:** Weighted sum of all values using differentiable weights (standard approach)",
      "— Differentiable → trainable with backpropagation",
      "**Hard attention:** Select one (or few) positions discretely",
      "— Non-differentiable → requires REINFORCE or straight-through estimator"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Soft attention is used everywhere (Transformers). Hard attention is used in some image captioning and reading tasks. Sparse attention (top-k) bridges the gap."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is the Longformer and how does it handle long documents?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Combines local + global attention for O(n) complexity:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard Transformer: O(n²) — every token attends to every other\nLongformer:\n1. Local attention: sliding window (size w) — each token attends to w neighbors\n2. Global attention: selected tokens ([CLS]) attend to ALL tokens\n3. Dilated attention: skip tokens at certain intervals\n\nComplexity: O(n × w) instead of O(n²)"
    },
    {
     "t": "p",
     "text": "**Explanation:** For n=4096, w=512: Transformer = 16.7M attention scores. Longformer = 2.1M. Enables processing documents up to 16K tokens."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is the role of tokenizer alignment in NLP models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Different tokenizers produce different subword splits — model MUST use same tokenizer for training and inference."
    },
    {
     "t": "p",
     "text": "**Common issues:**"
    },
    {
     "t": "ol",
     "items": [
      "Using wrong tokenizer for pre-trained model",
      "Vocabulary mismatch between tokenizer versions",
      "Not handling special tokens correctly for the specific model"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Always load tokenizer paired with model\ntokenizer = AutoTokenizer.from_pretrained(\"bert-base-uncased\")\nmodel = AutoModelForMaskedLM.from_pretrained(\"bert-base-uncased\")"
    },
    {
     "t": "p",
     "text": "**Explanation:** Using GPT tokenizer with BERT model will produce garbage. Always check tokenizer-model compatibility."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is contrastive learning for text representations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Learn embeddings where similar texts are close, dissimilar texts are far."
    },
    {
     "t": "p",
     "text": "**SimCSE approach:**"
    },
    {
     "t": "ol",
     "items": [
      "**Unsupervised:** Same sentence through dropout twice = positive pair",
      "**Supervised:** NLI entailment = positive, contradiction = negative"
     ]
    },
    {
     "t": "p",
     "text": "**Loss:** InfoNCE / NT-Xent — maximize similarity of positive pairs, minimize for negatives."
    },
    {
     "t": "p",
     "text": "**Explanation:** Produces high-quality sentence embeddings for search, clustering, semantic similarity without task-specific labels."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What is the difference between pre-training, fine-tuning, and in-context learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Pre-training: Train on massive text data (self-supervised)\n   → General language understanding\n   → Expensive (weeks on many GPUs)\n\nFine-tuning: Continue training on labeled task data\n   → Task-specific performance\n   → Moderate cost (hours on single GPU)\n\nIn-context learning: Provide examples in prompt, no training\n   → Flexible, instant adaptation\n   → Free (no GPU training needed)\n   → Quality depends on model size and examples"
    },
    {
     "t": "p",
     "text": "**Explanation:** Foundation model evolution: pre-train once, fine-tune or prompt for many tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is the difference between span-based and generative approaches for information extraction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Span-based:** Extract text spans from input (like QA)",
      "— \"CEO of Apple is Tim Cook\" → extract \"Tim Cook\" with role \"CEO\" and org \"Apple\"",
      "**Generative:** Generate structured output from input",
      "— Input: \"CEO of Apple is Tim Cook\"",
      "— Output: '{\"person\": \"Tim Cook\", \"role\": \"CEO\", \"org\": \"Apple\"}'"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Span-based is constrained (output from input). Generative is flexible but may hallucinate. LLMs make generative IE increasingly practical."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is the role of the feed-forward network in Transformer blocks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Transformer block = Multi-Head Attention + Feed-Forward Network (FFN)\n\nFFN(x) = GELU(xW₁ + b₁)W₂ + b₂\n\nTypical dimensions:\nx: d_model = 768\nW₁: 768 → 3072 (expand 4×)\nW₂: 3072 → 768 (project back)"
    },
    {
     "t": "p",
     "text": "**Explanation:** FFN provides non-linearity and increased capacity. Recent research suggests FFN acts as key-value memory — stores factual knowledge. Attention routes information, FFN processes it."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What is the difference between autoregressive and non-autoregressive generation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Autoregressive (AR):** Generate one token at a time, conditioning on previous tokens. Sequential → slow.",
      "**Non-autoregressive (NAR):** Generate all tokens in parallel. Fast but lower quality."
     ]
    },
    {
     "t": "p",
     "text": "**NAR challenges:**"
    },
    {
     "t": "ol",
     "items": [
      "Multi-modality problem (multiple valid outputs)",
      "Repetition and omission errors",
      "Need length prediction"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** AR is standard for LLMs (GPT). NAR used in some translation and speech synthesis for speed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is the RLHF (Reinforcement Learning from Human Feedback) process?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Step 1: Supervised Fine-Tuning (SFT)\n   - Fine-tune LM on demonstration data\n\nStep 2: Reward Model Training\n   - Humans rank model outputs (A > B > C)\n   - Train reward model to predict rankings\n\nStep 3: RL Optimization (PPO)\n   - Use reward model as reward function\n   - Optimize policy (LM) with PPO\n   - KL penalty prevents diverging too far from SFT model"
    },
    {
     "t": "p",
     "text": "**Explanation:** RLHF aligns model behavior with human preferences — less toxic, more helpful, more truthful. Key to ChatGPT's success."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the scaling law for language models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Loss ∝ C^(-α) where C = compute (FLOPs)\n\nKaplan et al. scaling laws:\nL(N) = (Nc/N)^(αN)  — model size\nL(D) = (Dc/D)^(αD)  — dataset size\nL(C) = (Cc/C)^(αC)  — compute\n\nChinchilla optimal: Tokens ≈ 20 × Parameters\nFor 70B params → need ~1.4T tokens"
    },
    {
     "t": "p",
     "text": "**Explanation:** Predictable relationship between compute/data/params and loss. Enables planning training runs. Chinchilla showed previous models (GPT-3) were undertrained relative to size."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "What are the current frontiers in NLP with deep learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Multimodal LLMs:** Understand text + images + audio + video (GPT-4V, Gemini)",
      "**Long context:** 1M+ token context windows (Gemini 1.5)",
      "**Reasoning:** Chain-of-thought, tree-of-thought, reasoning models",
      "**Efficiency:** Smaller models matching larger ones (Phi, Gemma)",
      "**Agentic AI:** LLMs using tools, planning, executing multi-step tasks",
      "**Alignment:** Better RLHF, constitutional AI, safety",
      "**Multilingual:** Equal quality across all languages"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** NLP has been transformed by Transformers and scaling. Current focus is on capability, efficiency, safety, and real-world deployment."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

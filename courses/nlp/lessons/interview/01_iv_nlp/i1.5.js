/* ============================================================================
   INTERVIEW I1.5 — Section 5: HuggingFace & Practical
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/06_NLP_and_Transformers/Interview_Questions/06_NLP_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.5",
 "lede": "**20 questions** from NLP and Transformers Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Section 5: HuggingFace & Practical",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "81",
   "q": "How do you use HuggingFace Transformers for any task?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from transformers import pipeline\n\n# Text classification\nclassifier = pipeline(\"text-classification\")\n\n# NER\nner = pipeline(\"ner\", grouped_entities=True)\n\n# QA\nqa = pipeline(\"question-answering\")\n\n# Summarization\nsummarizer = pipeline(\"summarization\", model=\"facebook/bart-large-cnn\")\n\n# Translation\ntranslator = pipeline(\"translation_en_to_fr\")\n\n# Text generation\ngenerator = pipeline(\"text-generation\", model=\"meta-llama/Llama-2-7b-chat-hf\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "How do you create a custom HuggingFace Dataset?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from datasets import Dataset, DatasetDict\n\n# From pandas DataFrame\ndataset = Dataset.from_pandas(df)\n\n# From dict\ndataset = Dataset.from_dict({\"text\": texts, \"label\": labels})\n\n# Train/val split\ndataset = dataset.train_test_split(test_size=0.2)\n\n# Map preprocessing\ndef preprocess(examples):\n    return tokenizer(examples[\"text\"], padding=\"max_length\", truncation=True)\n\ntokenized = dataset.map(preprocess, batched=True)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "How do you fine-tune BERT for text classification with HuggingFace?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from transformers import AutoModelForSequenceClassification, AutoTokenizer\nfrom transformers import Trainer, TrainingArguments\nimport evaluate\n\nmodel_name = \"bert-base-uncased\"\ntokenizer = AutoTokenizer.from_pretrained(model_name)\nmodel = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=3)\n\nmetric = evaluate.load(\"accuracy\")\n\ndef compute_metrics(eval_pred):\n    logits, labels = eval_pred\n    predictions = logits.argmax(axis=-1)\n    return metric.compute(predictions=predictions, references=labels)\n\ntraining_args = TrainingArguments(\n    output_dir=\"./results\",\n    learning_rate=2e-5,\n    per_device_train_batch_size=16,\n    num_train_epochs=3,\n    weight_decay=0.01,\n    eval_strategy=\"epoch\",\n    save_strategy=\"epoch\",\n    load_best_model_at_end=True,\n)\n\ntrainer = Trainer(\n    model=model,\n    args=training_args,\n    train_dataset=train_ds,\n    eval_dataset=val_ds,\n    compute_metrics=compute_metrics,\n)\n\ntrainer.train()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "How do you export a model to ONNX for production?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from optimum.onnxruntime import ORTModelForSequenceClassification\nfrom transformers import AutoTokenizer\n\n# Export to ONNX\nmodel = ORTModelForSequenceClassification.from_pretrained(\n    \"bert-base-uncased-finetuned-sst2\",\n    export=True\n)\ntokenizer = AutoTokenizer.from_pretrained(\"bert-base-uncased-finetuned-sst2\")\n\n# Save\nmodel.save_pretrained(\"onnx_model/\")\ntokenizer.save_pretrained(\"onnx_model/\")\n\n# Inference (2-4x faster than PyTorch)\ninputs = tokenizer(\"This movie was great!\", return_tensors=\"np\")\noutputs = model(**inputs)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is tokenizer alignment and why does it matter for NER?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Problem: Subword tokenization breaks word-label alignment\n# \"Washington\" → [\"Wash\", \"##ington\"]  but label is B-LOC\n\n# Solution: word_ids() mapping\nencoding = tokenizer(\"Washington went to Washington\", return_offsets_mapping=True)\nword_ids = encoding.word_ids()\n# [None, 0, 0, 1, 2, 3, 3, None]  (None for special tokens)\n\n# Label alignment: assign B-label to first subtoken, I-label to rest\ndef align_labels(word_ids, labels):\n    aligned = []\n    prev_word = None\n    for word_id in word_ids:\n        if word_id is None:\n            aligned.append(-100)  # ignore in loss\n        elif word_id != prev_word:\n            aligned.append(labels[word_id])\n        else:\n            # If B-X, change to I-X for continuation\n            label = labels[word_id]\n            aligned.append(label if label == 0 else label + 1)\n        prev_word = word_id\n    return aligned"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "How does Sentence Transformers training work?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sentence_transformers import SentenceTransformer, InputExample, losses\nfrom torch.utils.data import DataLoader\n\nmodel = SentenceTransformer(\"all-MiniLM-L6-v2\")\n\n# Training examples (anchor, positive, negative)\ntrain_examples = [\n    InputExample(texts=[\"query about Python\", \"Python programming guide\"], label=0.9),\n    InputExample(texts=[\"query about Python\", \"Java tutorial\"], label=0.1),\n]\n\ntrain_dataloader = DataLoader(train_examples, shuffle=True, batch_size=16)\ntrain_loss = losses.CosineSimilarityLoss(model)\n\nmodel.fit(\n    train_objectives=[(train_dataloader, train_loss)],\n    epochs=5,\n    warmup_steps=100,\n)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the difference between autoregressive and autoencoding models for text generation?",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "Autoregressive (GPT)",
      "Autoencoding (BERT)"
     ],
     "rows": [
      [
       "Generation",
       "Natural (left-to-right)",
       "Not designed for generation"
      ],
      [
       "Training",
       "Predict next token",
       "Predict masked tokens"
      ],
      [
       "Inference",
       "Sequential (slow)",
       "Parallel (fast, but not for generation)"
      ],
      [
       "Use case",
       "Chat, code gen, creative writing",
       "Embeddings, classification, NER"
      ]
     ]
    },
    {
     "t": "p",
     "text": "For generation: GPT, LLaMA, Mistral (autoregressive). For understanding: BERT, RoBERTa, DeBERTa (autoencoding)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "How do you handle multi-label text classification?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Key differences from single-label:\n# 1. Use BCEWithLogitsLoss instead of CrossEntropyLoss\n# 2. Labels are multi-hot vectors [0, 1, 1, 0, 1]\n# 3. Use sigmoid (not softmax) for predictions\n# 4. Threshold at 0.5 (or tune per-class thresholds)\n\nfrom transformers import AutoModelForSequenceClassification\n\nmodel = AutoModelForSequenceClassification.from_pretrained(\n    \"bert-base-uncased\",\n    num_labels=10,\n    problem_type=\"multi_label_classification\"  # Key setting\n)\n\n# In compute_metrics:\ndef compute_metrics(eval_pred):\n    logits, labels = eval_pred\n    predictions = (torch.sigmoid(torch.tensor(logits)) > 0.5).int()\n    f1 = f1_score(labels, predictions, average=\"micro\")\n    return {\"f1\": f1}"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "How do you build a question answering system?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "EXTRACTIVE QA (BERT-based):\n  Input: [CLS] Question [SEP] Context [SEP]\n  Output: Start and end token positions in context\n  Model: AutoModelForQuestionAnswering\n  \nGENERATIVE QA (LLM-based):\n  Input: \"Answer based on context: {context}\\nQuestion: {question}\"\n  Output: Free-form generated answer\n  Model: GPT-4, LLaMA with RAG\n  \nOPEN-DOMAIN QA:\n  Query → Retriever (BM25/Dense) → Top-k passages → Reader (BERT/LLM) → Answer"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What are the best practices for NLP model evaluation?",
   "body": [
    {
     "t": "ol",
     "items": [
      "**Use multiple metrics:** Accuracy + F1 + per-class precision/recall",
      "**Stratified splits:** Maintain class distribution in train/val/test",
      "**Cross-validation:** Especially for small datasets (5-fold)",
      "**Error analysis:** Manually examine top errors, confusion matrix",
      "**Statistical significance:** Bootstrap CI or McNemar's test",
      "**Slice analysis:** Performance per subgroup (language, text length, domain)",
      "**Calibration:** Check if model confidence matches accuracy",
      "**Adversarial evaluation:** Test with adversarial examples (TextAttack)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is embedding drift and how do you monitor it?",
   "body": [
    {
     "t": "p",
     "text": "When the input text distribution changes over time:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "DETECTION:\n  1. Store reference embeddings from training data\n  2. Periodically embed new production data\n  3. Compare distributions (cosine distance, MMD, KL divergence)\n  4. Alert if drift exceeds threshold\n\nCAUSES: New topics, language shift, seasonal patterns, adversarial inputs\nFIXES: Retrain model, expand training data, update embeddings"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "How do you handle PII (personally identifiable information) in NLP pipelines?",
   "body": [
    {
     "t": "table",
     "head": [
      "Method",
      "Approach",
      "Tool"
     ],
     "rows": [
      [
       "**Regex**",
       "Pattern matching (SSN, email, phone)",
       "Custom rules"
      ],
      [
       "**NER-based**",
       "Detect person names, locations, orgs",
       "spaCy, Presidio"
      ],
      [
       "**LLM-based**",
       "Prompt model to identify/redact PII",
       "GPT-4 with structured output"
      ],
      [
       "**Differential privacy**",
       "Add noise during training",
       "Opacus"
      ],
      [
       "**Anonymization**",
       "Replace with fake data",
       "Faker library"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is the difference between word-level, character-level, and subword-level models?",
   "body": [
    {
     "t": "table",
     "head": [
      "Level",
      "Vocab Size",
      "OOV",
      "Sequence Length",
      "Example"
     ],
     "rows": [
      [
       "**Word**",
       "50K-500K",
       "Yes (UNK token)",
       "Short",
       "Word2Vec, GloVe"
      ],
      [
       "**Character**",
       "~256",
       "None",
       "Very long",
       "CharCNN"
      ],
      [
       "**Subword**",
       "30K-50K",
       "None (decomposes)",
       "Medium",
       "BPE, WordPiece"
      ]
     ]
    },
    {
     "t": "p",
     "text": "All modern LLMs use subword tokenization — best balance of vocabulary size, OOV handling, and sequence length."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "What are adapter layers and how do they enable efficient fine-tuning?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Original Transformer Layer:\n  Input → MultiHeadAttn → LayerNorm → FFN → LayerNorm → Output\n\nWith Adapters:\n  Input → MultiHeadAttn → [Adapter] → LayerNorm → FFN → [Adapter] → LayerNorm → Output\n\nAdapter architecture:\n  Input (d) → Down-project (d→r) → NonLinearity → Up-project (r→d) → + Input\n  \n  Trainable params per layer: 2 × d × r (e.g., 2 × 768 × 64 = 98K vs 7M for full layer)"
    },
    {
     "t": "ul",
     "items": [
      "**vs LoRA:** Adapters add new parameters (sequential), LoRA modifies existing weights (parallel). LoRA has zero inference overhead."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "How do you handle text in multiple scripts (Arabic, Chinese, Hindi)?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Tokenizer:** SentencePiece (script-agnostic, operates on Unicode codepoints)",
      "**Model:** XLM-R (100 languages), mT5, BLOOM (46 languages + 13 programming languages)",
      "**Preprocessing:** Unicode normalization (NFC), script detection, right-to-left handling",
      "**Evaluation:** Per-language metrics (not averaged across languages)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is contrastive learning for NLP?",
   "body": [
    {
     "t": "p",
     "text": "Train model to bring similar examples close and push dissimilar examples apart:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = -\\log \\frac{e^{\\text{sim}(z_i, z_j)/\\tau}}{\\sum_{k \\neq i} e^{\\text{sim}(z_i, z_k)/\\tau}}"
    },
    {
     "t": "ul",
     "items": [
      "**SimCSE:** Use dropout as augmentation — same sentence through BERT twice with different dropout masks → positive pair",
      "**E5, BGE:** Contrastive training with hard negatives for embedding models",
      "**CLIP:** Align text and image embeddings contrastively"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "What are the practical differences between small and large models?",
   "body": [
    {
     "t": "table",
     "head": [
      "Aspect",
      "Small (≤1B)",
      "Medium (1-10B)",
      "Large (10B+)"
     ],
     "rows": [
      [
       "Fine-tuning",
       "Full fine-tuning feasible",
       "LoRA recommended",
       "QLoRA / API only"
      ],
      [
       "Inference",
       "CPU possible",
       "GPU needed",
       "Multi-GPU / API"
      ],
      [
       "Few-shot",
       "Poor",
       "Good",
       "Excellent"
      ],
      [
       "Latency",
       "<50ms",
       "50-500ms",
       "500ms+"
      ],
      [
       "Cost",
       "$0.01/1K tokens",
       "$0.1/1K tokens",
       "$1+/1K tokens"
      ],
      [
       "Use case",
       "Classification, NER",
       "Summarization, QA",
       "General assistant, reasoning"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "How do you build a multilingual sentiment analysis system?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Option 1: Multilingual model\nfrom transformers import pipeline\nclassifier = pipeline(\"sentiment-analysis\", model=\"nlptown/bert-base-multilingual-uncased-sentiment\")\nresult = classifier(\"Das ist großartig!\")  # German\n\n# Option 2: Translate + monolingual\nfrom deep_translator import GoogleTranslator\ntranslated = GoogleTranslator(source='auto', target='en').translate(text)\nresult = en_classifier(translated)\n\n# Option 3: Fine-tune XLM-R on multilingual sentiment data\nmodel = AutoModelForSequenceClassification.from_pretrained(\"xlm-roberta-base\", num_labels=3)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What are the emerging trends in NLP (2024-2026)?",
   "body": [
    {
     "t": "table",
     "head": [
      "Trend",
      "Description"
     ],
     "rows": [
      [
       "**Long-context models**",
       "1M+ token contexts (Gemini, Claude)"
      ],
      [
       "**Multimodal**",
       "Text + image + audio + video in one model"
      ],
      [
       "**Efficient architectures**",
       "Mamba, RWKV, Hyena (sub-quadratic)"
      ],
      [
       "**Agentic NLP**",
       "LLMs as agents with tool use and planning"
      ],
      [
       "**Synthetic data**",
       "LLM-generated training data at scale"
      ],
      [
       "**Alignment**",
       "RLHF → DPO → Constitutional AI → RLAIF"
      ],
      [
       "**On-device models**",
       "Phi-3, Gemma, quantized LLaMA for mobile/edge"
      ],
      [
       "**Structured generation**",
       "Guaranteed JSON/schema output"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "Design a complete NLP system for customer support ticket routing.",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "REQUIREMENTS: Route incoming tickets to correct department (billing, technical, returns, general)\n\nARCHITECTURE:\n  ┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐\n  │ Ticket Input││────→│ Preprocessor │────→│ Classifier  │────→│ Router/Queue│\n  │ (API/email) ││     │ (clean, PII) │     │ (BERT/LLM)  │     │ (Kafka)     │\n  └─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘\n                                                  ↓\n                                           ┌─────────────┐\n                                           │ Confidence  │\n                                           │ Check (<0.7)││──→ Human review\n                                           └─────────────┘\n\nMODEL CHOICES:\n  - DistilBERT fine-tuned (fast, 95%+ accuracy with good data)\n  - GPT-4 zero-shot (no training, but expensive)\n  - Hybrid: DistilBERT primary + LLM fallback for low-confidence\n\nTRAINING DATA: 10K+ labeled tickets per category\nMETRICS: Macro-F1, per-class accuracy, routing latency p95\nMONITORING: Drift detection on embedding distributions, daily accuracy sampling"
    },
    {
     "t": "p",
     "text": "*100 questions covering the full NLP & Transformers stack — from classical NLP through modern LLM architectures, HuggingFace practical usage, and production deployment.*"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

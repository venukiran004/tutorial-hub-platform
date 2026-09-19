/* ============================================================================
   PRACTICE P1.6 — Scenarios · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/01_Fundamentals.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.6",
 "lede": "**25 scenarios** from Fundamentals: Programs and Scenarios. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each scenario out loud before revealing the answer",
  "Give the mechanism, not the slogan — the formula, the failure mode, the fix",
  "Recognise the pattern behind the question so the next variant is easy",
  "Mark the ones you got wrong and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Scenarios · 2",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "26",
   "q": "2: Outliers in Salary Data",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your salary data has values: most are $30K-$200K, but some are $0, $500, \\(50M, and\\)-10K."
    },
    {
     "t": "p",
     "text": "**Question:** How do you handle this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Identify outliers:**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "Q1 = df['salary'].quantile(0.25)\nQ3 = df['salary'].quantile(0.75)\nIQR = Q3 - Q1\nlower, upper = Q1 - 1.5*IQR, Q3 + 1.5*IQR\n\n# Also check for domain-specific invalids\ninvalid = (df['salary'] <= 0) | (df['salary'] > 10_000_000)"
    },
    {
     "t": "ol",
     "items": [
      "**Treatment options:**",
      "Remove if clearly data entry errors ($0, negative)",
      "Cap/clip to reasonable bounds (winsorization): `df['salary'].clip(15000, 500000)`",
      "Replace with NaN and impute",
      "Use robust models (tree-based) that handle outliers naturally",
      "Log transform: `np.log1p(df['salary'])` to compress the range",
      "Keep if legitimate (CEO salary of $50M might be real!)"
     ]
    },
    {
     "t": "p",
     "text": "**Key:** Always understand WHY the outlier exists before deciding."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "1: Preprocessing Leaks into Validation",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You scale features, then split into train/test, then evaluate. Your colleague says this is wrong."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# WRONG!\nscaler = StandardScaler()\nX_scaled = scaler.fit_transform(X)  # Fit on ALL data\nX_train, X_test = train_test_split(X_scaled)"
    },
    {
     "t": "p",
     "text": "**Question:** Why is this wrong and how to fix?"
    },
    {
     "t": "p",
     "text": "**Answer:** The scaler learns mean/std from the test data too — this is data leakage. The test set should be completely unseen."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# CORRECT!\nX_train, X_test, y_train, y_test = train_test_split(X, y)\nscaler = StandardScaler()\nX_train = scaler.fit_transform(X_train)   # Fit ONLY on train\nX_test = scaler.transform(X_test)          # Transform test with train stats\n\n# BEST: Use Pipeline (handles this automatically in CV)\nfrom sklearn.pipeline import Pipeline\npipe = Pipeline([\n    ('scaler', StandardScaler()),\n    ('model', LogisticRegression()),\n])\ncross_val_score(pipe, X, y, cv=5)  # Scaler fit only on each CV train fold"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "2: Cross-Validation Score Much Higher Than Test Score",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your model gets 92% in 5-fold CV but 78% on the holdout test set."
    },
    {
     "t": "p",
     "text": "**Question:** What could cause this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Distribution shift:** Test data comes from a different time period or population",
      "**Data leakage in preprocessing:** Feature engineering done before CV split",
      "**Target leakage:** A feature correlated with target due to shared derivation",
      "**Small dataset:** CV variance is high with few samples",
      "**Temporal dependence:** Using standard K-Fold on time series (use `TimeSeriesSplit`)",
      "**Hyperparameter overfitting:** Excessive tuning on CV → overfit to the CV folds"
     ]
    },
    {
     "t": "p",
     "text": "**Diagnosis:** Check data distributions (train vs test), check feature importance for suspicious features, use stratified splitting, ensure all preprocessing is inside the CV loop."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "1: Loss Not Decreasing",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your neural network's training loss stays flat after the first epoch."
    },
    {
     "t": "p",
     "text": "**Question:** Possible causes and fixes?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Learning rate too high:** Loss oscillates or diverges → reduce LR by 10×",
      "**Learning rate too low:** Loss decreases extremely slowly → increase LR",
      "**Dead ReLU neurons:** Many neurons output 0 → use LeakyReLU or He initialization",
      "**Vanishing gradients:** Deep network with sigmoid/tanh → use ReLU, batch norm, skip connections",
      "**Wrong loss function:** Using MSE for classification, or wrong target format",
      "**Data issue:** Labels are wrong, features aren't normalized, data isn't shuffled",
      "**Bug in data pipeline:** All batches get the same data"
     ]
    },
    {
     "t": "p",
     "text": "**Systematic debug:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 1. Overfit on 1 batch first (loss should go to ~0)\nsmall_batch = next(iter(train_loader))\nfor epoch in range(100):\n    loss = train_step(small_batch)  # Should decrease rapidly\n\n# 2. If it doesn't → learning rate, loss function, or architecture bug\n# 3. If it does → data pipeline issue or regularization too strong"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "2: Choosing Activation Functions",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You're designing a neural network for different tasks."
    },
    {
     "t": "p",
     "text": "**Question:** Which activation for: (a) hidden layers, (b) binary output, (c) multi-class output, (d) regression output?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Layer",
      "Activation",
      "Why"
     ],
     "rows": [
      [
       "Hidden layers",
       "**ReLU** (default)",
       "Fast, no vanishing gradient, sparse activation"
      ],
      [
       "Hidden (if dying ReLU)",
       "**LeakyReLU / GELU**",
       "Allows small negative gradient"
      ],
      [
       "Binary output",
       "**Sigmoid**",
       "Outputs probability [0, 1]"
      ],
      [
       "Multi-class output",
       "**Softmax**",
       "Outputs probability distribution summing to 1"
      ],
      [
       "Regression output",
       "**None (Linear)**",
       "Unrestricted output range"
      ],
      [
       "Regression [0, 1]",
       "**Sigmoid**",
       "Bounded output"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "1: CNN Not Learning on Custom Image Dataset",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You train a CNN from scratch on 5,000 images across 10 classes. Accuracy is stuck at 10% (random)."
    },
    {
     "t": "p",
     "text": "**Question:** Diagnosis and fix."
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Use transfer learning!** 5K images is too few to train from scratch."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model = torchvision.models.resnet18(pretrained=True)\nmodel.fc = nn.Linear(512, 10)  # Replace last layer for 10 classes\n# Freeze early layers, train only the last few\nfor param in model.parameters():\n    param.requires_grad = False\nmodel.fc.requires_grad_(True)"
    },
    {
     "t": "ol",
     "items": [
      "**Data augmentation:** RandomCrop, HorizontalFlip, ColorJitter, rotation",
      "**Verify data pipeline:** Check that images are correctly loaded and labels match",
      "**Normalize properly:** Use ImageNet stats if using pretrained model",
      "**Start with known working architecture:** Don't invent architecture for small data"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "2: Choosing Between CNN Architectures",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You need to deploy an image classifier on a mobile device."
    },
    {
     "t": "p",
     "text": "**Question:** Which architecture and why?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Requirement",
      "Architecture",
      "Why"
     ],
     "rows": [
      [
       "Mobile/Edge",
       "**MobileNetV3**",
       "Depthwise separable convolutions, tiny model"
      ],
      [
       "Best accuracy (no constraints)",
       "**EfficientNetV2**",
       "Best accuracy-efficiency tradeoff"
      ],
      [
       "Real-time detection",
       "**YOLOv8**",
       "Fast single-shot detection"
      ],
      [
       "Medical/fine-grained",
       "**DenseNet**",
       "Feature reuse, works well with small datasets"
      ],
      [
       "Quick prototyping",
       "**ResNet-50**",
       "Well-understood, good baseline"
      ]
     ]
    },
    {
     "t": "p",
     "text": "For mobile: MobileNetV3 (3.4M params) vs ResNet-50 (25.6M params) — 7.5× smaller with similar accuracy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "1: RNN Gradient Exploding During Training",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your RNN for text classification produces NaN losses after a few epochs."
    },
    {
     "t": "p",
     "text": "**Question:** Cause and solution."
    },
    {
     "t": "p",
     "text": "**Answer:** **Exploding gradients** — in RNNs, gradients are multiplied through many time steps (BPTT). If the weight matrix has eigenvalues > 1, gradients grow exponentially."
    },
    {
     "t": "p",
     "text": "**Fixes:**"
    },
    {
     "t": "ol",
     "items": [
      "**Gradient clipping** (most common): `torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)`",
      "**Use LSTM or GRU** instead of vanilla RNN — gating mechanisms control gradient flow",
      "**Reduce sequence length** — truncate BPTT",
      "**Reduce learning rate**",
      "**Use Layer Normalization**"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "1: LSTM for Time Series Forecasting — Sequence Length Selection",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You're forecasting daily stock prices using LSTM. How do you choose the lookback window?"
    },
    {
     "t": "p",
     "text": "**Question:** How to select sequence length and format data?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Sliding window approach\ndef create_sequences(data, seq_length):\n    X, y = [], []\n    for i in range(len(data) - seq_length):\n        X.append(data[i:i+seq_length])\n        y.append(data[i+seq_length])\n    return np.array(X), np.array(y)\n\n# Choosing seq_length:\n# - Domain knowledge: 30 days for monthly patterns, 252 for yearly\n# - Autocorrelation analysis: look at ACF/PACF plots\n# - Try multiple and compare: [7, 14, 30, 60, 90]\n# - Too short: misses long-term patterns\n# - Too long: harder to train, vanishing gradient even with LSTM\n\n# Important: Scale data AFTER train-test split!\nfrom sklearn.preprocessing import MinMaxScaler\nscaler = MinMaxScaler()\ntrain_scaled = scaler.fit_transform(train_data)\ntest_scaled = scaler.transform(test_data)  # Use train statistics!"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "1: GRU vs LSTM for Production",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your NLP pipeline needs a recurrent model. You've tried both LSTM and GRU with similar accuracy."
    },
    {
     "t": "p",
     "text": "**Question:** Which do you choose for production and why?"
    },
    {
     "t": "p",
     "text": "**Answer:** Choose **GRU** if performance is comparable because:"
    },
    {
     "t": "ol",
     "items": [
      "**Fewer parameters:** GRU has 2 gates (reset, update) vs LSTM's 3 (forget, input, output) → ~25% fewer parameters",
      "**Faster training and inference:** Less computation per time step",
      "**Less memory:** Important for production/mobile",
      "**Comparable performance:** On most tasks, GRU matches LSTM"
     ]
    },
    {
     "t": "p",
     "text": "Choose **LSTM** when:"
    },
    {
     "t": "ul",
     "items": [
      "Very long sequences (>500 tokens) where the extra gate helps",
      "Tasks requiring precise memory control (e.g., code generation, bracket matching)",
      "You have enough compute and data"
     ]
    },
    {
     "t": "p",
     "text": "**In practice today:** Both LSTM and GRU are largely **replaced by Transformers** for most NLP tasks, and by temporal convolutions (TCN) or Transformers for time series."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "1: Transformer Self-Attention is O(n²) — Scaling Problem",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your document classification model needs to handle 10,000-token documents, but standard Transformer attention is O(n²), making it impractically slow."
    },
    {
     "t": "p",
     "text": "**Question:** How do you handle this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Chunking + aggregation:** Split document into 512-token chunks, encode each, aggregate (mean/max pool or CLS tokens)",
      "**Efficient attention variants:**",
      "— **Longformer:** Sliding window attention + global attention on special tokens → O(n)",
      "— **BigBird:** Random + window + global sparse attention → O(n)",
      "— **Flash Attention:** Not algorithmically different but 2-4× faster (IO-aware)",
      "**Hierarchical approach:** Sentence-level encoding → document-level encoding",
      "**Truncation:** For classification, first + last 256 tokens often capture key info"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from transformers import LongformerModel\nmodel = LongformerModel.from_pretrained('allenai/longformer-base-4096')\n# Handles up to 4096 tokens with O(n) attention"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "2: BERT vs GPT — When to Use Which?",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You need to choose between BERT-style and GPT-style models for different tasks."
    },
    {
     "t": "p",
     "text": "**Question:** Selection criteria?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Task",
      "Model",
      "Why"
     ],
     "rows": [
      [
       "Text classification",
       "**BERT** (encoder)",
       "Bidirectional context for understanding"
      ],
      [
       "Named Entity Recognition",
       "**BERT** (encoder)",
       "Token-level classification needs full context"
      ],
      [
       "Sentiment analysis",
       "**BERT** (encoder)",
       "Understanding meaning requires bidirectional"
      ],
      [
       "Text generation",
       "**GPT** (decoder)",
       "Autoregressive generation"
      ],
      [
       "Chatbot / Dialogue",
       "**GPT** (decoder)",
       "Sequential generation"
      ],
      [
       "Summarization",
       "**T5/BART** (enc-dec)",
       "Input understanding + output generation"
      ],
      [
       "Translation",
       "**T5/BART** (enc-dec)",
       "Encoder for source, decoder for target"
      ],
      [
       "General purpose",
       "**GPT-4 / Claude**",
       "Few-shot, zero-shot versatility"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "1: Limited GPU Memory for Fine-Tuning",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You need to fine-tune Llama-2-7B on a single 24GB GPU for a domain-specific chatbot."
    },
    {
     "t": "p",
     "text": "**Question:** How do you make it fit?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Strategy: QLoRA (Quantized LoRA)\nfrom peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training\nfrom transformers import AutoModelForCausalLM, BitsAndBytesConfig\n\n# 1. Load model in 4-bit\nbnb_config = BitsAndBytesConfig(\n    load_in_4bit=True,\n    bnb_4bit_quant_type=\"nf4\",\n    bnb_4bit_compute_dtype=torch.float16,\n)\nmodel = AutoModelForCausalLM.from_pretrained(\"meta-llama/Llama-2-7b-hf\",\n    quantization_config=bnb_config)\n\n# 2. Apply LoRA (train only ~0.1% of parameters)\nlora_config = LoraConfig(r=16, lora_alpha=32, target_modules=[\"q_proj\",\"v_proj\"],\n    lora_dropout=0.05, task_type=\"CAUSAL_LM\")\nmodel = get_peft_model(model, lora_config)\n\n# Memory: ~6GB (vs 28GB for full model in fp16)\n# Also use: gradient_checkpointing=True, gradient_accumulation_steps=8"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "2: Fine-Tuned Model Outputs Gibberish",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** After fine-tuning, the model sometimes outputs repetitive or nonsensical text."
    },
    {
     "t": "p",
     "text": "**Question:** Diagnose and fix."
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Training data quality:** Check for duplicates, empty responses, or corrupted examples in training data",
      "**Overfitting:** Training too long on small dataset → reduce epochs, increase dropout",
      "**Learning rate too high:** Catastrophic forgetting of base model → use 1e-5 to 5e-5",
      "**Wrong chat template:** Prompt format doesn't match training format",
      "**Generation parameters:** Adjust decoding:"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Fix repetition\noutput = model.generate(\n    repetition_penalty=1.2,     # Penalize repeating tokens\n    temperature=0.7,            # Not too random, not too greedy\n    top_p=0.9,                  # Nucleus sampling\n    max_new_tokens=512,\n)"
    },
    {
     "t": "ol",
     "items": [
      "**Evaluate before deploying:** Use perplexity on held-out set, human evaluation"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "1: RAG Retrieves Irrelevant Documents",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your RAG system for customer support retrieves wrong documents, leading to incorrect answers."
    },
    {
     "t": "p",
     "text": "**Question:** How do you improve retrieval quality?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Better chunking:** Don't split mid-sentence. Use semantic chunking or context-aware overlap.",
      "**Hybrid search:** Combine dense (embedding) + sparse (BM25) retrieval",
      "**Re-ranking:** Add a cross-encoder re-ranker after initial retrieval"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Hybrid search with re-ranking\ninitial_results = vector_store.similarity_search(query, k=20)  # Broad retrieval\nbm25_results = bm25.search(query, k=20)  # Keyword match\ncombined = merge_and_deduplicate(initial_results, bm25_results)\nreranked = cross_encoder.rank(query, combined, top_k=5)  # Precision"
    },
    {
     "t": "ol",
     "items": [
      "**Better embeddings:** Use domain-specific embedding model or fine-tune embeddings on your data",
      "**Metadata filtering:** Filter by date, category, department before similarity search",
      "**Query transformation:** Rephrase, expand, or decompose complex queries"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "2: RAG Hallucination Despite Having Correct Context",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** The correct document IS retrieved, but the LLM still generates incorrect information."
    },
    {
     "t": "p",
     "text": "**Question:** How do you fix hallucination in RAG?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Better prompting:** \"Answer ONLY based on the provided context. If the answer is not in the context, say 'I don't have that information.'\"",
      "**Citation mechanism:** Force the model to cite which chunk its answer comes from",
      "**Smaller context window:** Too many chunks dilute the relevant one",
      "**Use Self-RAG:** Model evaluates its own retrieval and generation quality",
      "**Post-generation verification:** Use a separate model/rule to check if the answer is grounded in the context",
      "**Fine-tune for groundedness:** Train the model to stay faithful to context",
      "**RAGAS evaluation:** Measure faithfulness, answer relevancy, context recall systematically"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "1: Chain Fails on Some Inputs",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your LangChain Q&A chain works for most queries but fails on certain long or complex inputs."
    },
    {
     "t": "p",
     "text": "**Question:** How do you debug and handle?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Enable verbose/debug mode:**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import langchain\nlangchain.debug = True  # See all intermediate steps"
    },
    {
     "t": "ol",
     "items": [
      "**Add error handling:**"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from langchain.schema import OutputParserException\n\nchain_with_fallback = main_chain.with_fallbacks([fallback_chain])"
    },
    {
     "t": "ol",
     "items": [
      "**Token limit issues:** Long inputs exceed context window → implement text splitting or summarization before the chain",
      "**Output parsing failures:** LLM doesn't follow expected format → add output parser with retry"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from langchain.output_parsers import RetryOutputParser\nretry_parser = RetryOutputParser.from_llm(parser=parser, llm=llm)"
    },
    {
     "t": "ol",
     "items": [
      "**Rate limiting:** Add exponential backoff for API calls",
      "**Streaming for long outputs:** Use streaming callback for better UX"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "2: Building a Multi-Tool Agent",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You need an agent that can search the web, query a database, and send emails based on user request."
    },
    {
     "t": "p",
     "text": "**Question:** How do you design this in LangChain?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from langchain.agents import create_openai_tools_agent, AgentExecutor\nfrom langchain.tools import Tool\n\n# Define tools\ntools = [\n    Tool(name=\"search\", func=search_api, description=\"Search the web for current information\"),\n    Tool(name=\"sql_query\", func=run_sql, description=\"Query the company database\"),\n    Tool(name=\"send_email\", func=send_email, description=\"Send an email to a recipient\"),\n]\n\n# Create agent\nagent = create_openai_tools_agent(llm, tools, prompt)\nexecutor = AgentExecutor(agent=agent, tools=tools, verbose=True,\n    max_iterations=5,           # Prevent infinite loops\n    handle_parsing_errors=True, # Graceful error handling\n)\n\n# Safety: Add human-in-the-loop for dangerous tools\nfrom langchain.tools import HumanApprovalCallbackHandler\nsend_email_tool.callbacks = [HumanApprovalCallbackHandler()]"
    },
    {
     "t": "p",
     "text": "**Design principles:** (1) Clear tool descriptions for accurate selection, (2) Limit max iterations, (3) Human approval for irreversible actions (email, DB writes)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "1: Complex Multi-Step Workflow with State",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You need a customer support system that: collects info → classifies intent → routes to specialist → generates response → checks for quality → either returns response or escalates."
    },
    {
     "t": "p",
     "text": "**Question:** How do you implement this with LangGraph?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from langgraph.graph import StateGraph, END\nfrom typing import TypedDict, Literal\n\nclass SupportState(TypedDict):\n    messages: list\n    intent: str\n    specialist_response: str\n    quality_score: float\n\ndef classify_intent(state):\n    # LLM classifies: billing, technical, general, complaint\n    intent = llm.classify(state[\"messages\"])\n    return {\"intent\": intent}\n\ndef route_to_specialist(state) -> Literal[\"billing\", \"technical\", \"general\", \"escalate\"]:\n    if state[\"intent\"] == \"complaint\":\n        return \"escalate\"\n    return state[\"intent\"]\n\ndef quality_check(state) -> Literal[\"respond\", \"escalate\"]:\n    if state[\"quality_score\"] > 0.8:\n        return \"respond\"\n    return \"escalate\"\n\n# Build graph\ngraph = StateGraph(SupportState)\ngraph.add_node(\"classify\", classify_intent)\ngraph.add_node(\"billing\", billing_agent)\ngraph.add_node(\"technical\", technical_agent)\ngraph.add_node(\"general\", general_agent)\ngraph.add_node(\"quality\", quality_check_node)\ngraph.add_node(\"escalate\", escalate_to_human)\ngraph.add_node(\"respond\", send_response)\n\ngraph.set_entry_point(\"classify\")\ngraph.add_conditional_edges(\"classify\", route_to_specialist)\ngraph.add_edge(\"billing\", \"quality\")\ngraph.add_edge(\"technical\", \"quality\")\ngraph.add_edge(\"general\", \"quality\")\ngraph.add_conditional_edges(\"quality\", quality_check)\ngraph.add_edge(\"respond\", END)\ngraph.add_edge(\"escalate\", END)\n\napp = graph.compile()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "2: Adding Persistence and Human-in-the-Loop",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your LangGraph application needs to pause for human approval before executing certain actions."
    },
    {
     "t": "p",
     "text": "**Question:** How do you implement this?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from langgraph.checkpoint.sqlite import SqliteSaver\nfrom langgraph.graph import StateGraph, END\n\n# 1. Add checkpointer for persistence\nmemory = SqliteSaver.from_conn_string(\":memory:\")\napp = graph.compile(checkpointer=memory, interrupt_before=[\"execute_action\"])\n\n# 2. Run until interrupt point\nconfig = {\"configurable\": {\"thread_id\": \"user_123\"}}\nresult = app.invoke(inputs, config)\n# Graph pauses at \"execute_action\" node\n\n# 3. Show pending action to human, get approval\npending_state = app.get_state(config)\nprint(f\"Pending action: {pending_state.values['planned_action']}\")\n\n# 4. If approved, resume; if rejected, modify state and resume\nif human_approves:\n    result = app.invoke(None, config)  # None = continue\nelse:\n    app.update_state(config, {\"planned_action\": \"cancelled\"})\n    result = app.invoke(None, config)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "1: Exposing Multiple Data Sources via MCP",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You need to build an MCP server that lets an LLM query a PostgreSQL database, read from S3, and interact with a REST API."
    },
    {
     "t": "p",
     "text": "**Question:** How do you design the MCP server?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from mcp.server import Server\nfrom mcp.types import Resource, Tool\n\napp = Server(\"multi-source-server\")\n\n# Resource: Database tables (readable context)\n@app.list_resources()\nasync def list_resources():\n    tables = await get_db_tables()\n    return [Resource(uri=f\"db://table/{t}\", name=t) for t in tables]\n\n@app.read_resource()\nasync def read_resource(uri):\n    table = uri.split(\"/\")[-1]\n    data = await query_db(f\"SELECT * FROM {table} LIMIT 100\")\n    return data.to_markdown()\n\n# Tool: Run SQL queries (action)\n@app.list_tools()\nasync def list_tools():\n    return [\n        Tool(name=\"query_db\", description=\"Run read-only SQL\",\n             inputSchema={\"type\": \"object\", \"properties\": {\"sql\": {\"type\": \"string\"}}}),\n        Tool(name=\"upload_s3\", description=\"Upload file to S3\",\n             inputSchema={\"type\": \"object\", \"properties\": {\"key\": {\"type\": \"string\"}, \"content\": {\"type\": \"string\"}}}),\n        Tool(name=\"call_api\", description=\"Call external REST API\", ...)\n    ]\n\n@app.call_tool()\nasync def call_tool(name, arguments):\n    if name == \"query_db\":\n        # SECURITY: Validate SQL is read-only!\n        if not arguments[\"sql\"].strip().upper().startswith(\"SELECT\"):\n            raise ValueError(\"Only SELECT queries allowed\")\n        return await query_db(arguments[\"sql\"])"
    },
    {
     "t": "p",
     "text": "**Key design principles:** (1) Resources for read-only context, Tools for actions, (2) Validate all inputs — never allow arbitrary SQL/code, (3) Use Prompts for common workflows, (4) Keep tools focused — one clear purpose each."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "2: MCP Server Security Concerns",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You're deploying an MCP server that gives an LLM access to internal company systems."
    },
    {
     "t": "p",
     "text": "**Question:** What security measures are needed?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Input validation:** Sanitize all tool inputs, prevent injection attacks",
      "**Least privilege:** MCP server uses a read-only database user, limited S3 permissions",
      "**Rate limiting:** Prevent runaway agents from making thousands of requests",
      "**Audit logging:** Log every tool call with user, timestamp, inputs, outputs",
      "**Authentication:** Verify the client (LLM application) is authorized",
      "**Sandboxing:** Run tools in isolated environments, no arbitrary code execution",
      "**Human-in-the-loop:** Require approval for write/destructive operations",
      "**Timeout:** Kill long-running operations",
      "**Data masking:** Redact PII/secrets from responses",
      "**Transport security:** Use stdio (local) or SSE with TLS (remote)"
     ]
    },
    {
     "t": "p",
     "text": "*These scenario-based questions cover real-world situations across all topics. Practice explaining your reasoning process, not just the answer — interviewers want to see how you think through problems.*"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What type of ML problem is this?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Given historical house prices with features like area, bedrooms, location — predict price of a new house."
    },
    {
     "t": "p",
     "text": "**Answer:** Supervised Learning — Regression"
    },
    {
     "t": "p",
     "text": "**Explanation:** Continuous target variable (price) with labeled training data. Regression predicts numerical values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What type of ML problem is this?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Given customer transaction data with no labels — group customers into segments."
    },
    {
     "t": "p",
     "text": "**Answer:** Unsupervised Learning — Clustering"
    },
    {
     "t": "p",
     "text": "**Explanation:** No target labels. The algorithm discovers natural groupings in the data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "A model achieves 99% accuracy on training data but 60% on test data. What is this called?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Overfitting"
    },
    {
     "t": "p",
     "text": "**Explanation:** High training accuracy but low test accuracy = model memorized training data, doesn't generalize."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

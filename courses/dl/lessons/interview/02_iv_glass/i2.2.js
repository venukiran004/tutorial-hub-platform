/* ============================================================================
   INTERVIEW I2.2 — NLP & Generative AI · Computer Vision · System Design for AI · AI Ethics & Responsible AI · Data Preprocessing & Engineering · Projects & Behavioral · Additional Algorithms & Coding
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/00_Interview_Bank/02_Glassdoor_AI_Engineer.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.2",
 "lede": "**10 questions** from Glassdoor AI Engineer. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "NLP & Generative AI · Computer Vision · System Design for AI · AI Ethics & Responsible AI · Data Preprocessing & Engineering · Projects & Behavioral · Additional Algorithms & Coding",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "10",
   "q": "How do you define a good prompt? (FPT Software — AI Intern)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What makes a prompt effective for LLMs?"
    },
    {
     "t": "p",
     "text": "**Answer — Prompt Engineering Framework:**"
    },
    {
     "t": "table",
     "head": [
      "Principle",
      "Description",
      "Example"
     ],
     "rows": [
      [
       "**Clarity**",
       "Be specific, unambiguous",
       "❌ \"Summarize this\" → ✅ \"Summarize in 3 bullet points\""
      ],
      [
       "**Context**",
       "Provide background info",
       "\"You are a senior data scientist...\""
      ],
      [
       "**Format**",
       "Specify output format",
       "\"Return as JSON with keys: name, score\""
      ],
      [
       "**Examples**",
       "Few-shot learning",
       "\"Example: Input: X → Output: Y\""
      ],
      [
       "**Constraints**",
       "Set boundaries",
       "\"Use only information from this text\""
      ],
      [
       "**Chain of Thought**",
       "Step-by-step reasoning",
       "\"Think step by step before answering\""
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ═══════════════ PROMPT PATTERNS ═══════════════\n\n# 1. Zero-shot\nprompt = \"Classify this review as positive or negative: 'Great product!'\"\n\n# 2. Few-shot\nprompt = \"\"\"Classify reviews:\nReview: \"Amazing quality\" → Positive\nReview: \"Terrible experience\" → Negative\nReview: \"Could be better but works fine\" → \"\"\"\n\n# 3. Chain-of-Thought\nprompt = \"\"\"Q: A store has 45 apples. 12 are sold and 28 more arrive. How many?\nLet's think step by step:\n1. Start: 45 apples\n2. Sold 12: 45 - 12 = 33\n3. Received 28: 33 + 28 = 61\nAnswer: 61 apples\n\nQ: A warehouse has 200 items. 35% are shipped and 50 new arrive. How many?\nLet's think step by step:\"\"\"\n\n# 4. System prompt with guardrails\nsystem_prompt = \"\"\"You are a medical information assistant.\nRules:\n- Only provide general health information\n- Always recommend consulting a doctor\n- Never diagnose conditions\n- Cite medical guidelines when possible\n- If uncertain, say \"I'm not sure, please consult a healthcare provider\"\n\"\"\"\n\n# 5. Structured output prompt\nprompt = \"\"\"Extract entities from this text and return as JSON.\n\nText: \"Apple CEO Tim Cook announced iPhone 16 at WWDC in Cupertino on June 10.\"\n\nReturn JSON with keys: organizations, people, products, locations, dates\n\"\"\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Comments classification — NLP approach (zarplata.ru — AI/ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How would you build a comments classification system?"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ═══════════════ APPROACH 1: TRADITIONAL ML ═══════════════\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.feature_extraction.text import TfidfVectorizer\nfrom sklearn.svm import LinearSVC\n\npipeline = Pipeline([\n    ('tfidf', TfidfVectorizer(max_features=50000, ngram_range=(1, 3))),\n    ('clf', LinearSVC(C=1.0))\n])\npipeline.fit(X_train, y_train)\n\n# ═══════════════ APPROACH 2: TRANSFORMER FINE-TUNING ═══════════════\nfrom transformers import AutoTokenizer, AutoModelForSequenceClassification\nfrom transformers import TrainingArguments, Trainer\n\nmodel_name = \"bert-base-uncased\"\ntokenizer = AutoTokenizer.from_pretrained(model_name)\nmodel = AutoModelForSequenceClassification.from_pretrained(\n    model_name, num_labels=3  # positive, negative, neutral\n)\n\n# Tokenize\ndef tokenize_function(examples):\n    return tokenizer(\n        examples[\"text\"],\n        padding=\"max_length\",\n        truncation=True,\n        max_length=128\n    )\n\ntokenized = dataset.map(tokenize_function, batched=True)\n\n# Train\ntraining_args = TrainingArguments(\n    output_dir=\"./results\",\n    num_train_epochs=3,\n    per_device_train_batch_size=16,\n    evaluation_strategy=\"epoch\",\n    learning_rate=2e-5,\n    weight_decay=0.01,\n)\n\ntrainer = Trainer(\n    model=model,\n    args=training_args,\n    train_dataset=tokenized[\"train\"],\n    eval_dataset=tokenized[\"test\"],\n)\ntrainer.train()\n\n# ═══════════════ APPROACH 3: LLM WITH LANGCHAIN ═══════════════\nfrom langchain_openai import ChatOpenAI\nfrom langchain.prompts import ChatPromptTemplate\n\nllm = ChatOpenAI(model=\"gpt-4o-mini\")\n\nprompt = ChatPromptTemplate.from_messages([\n    (\"system\", \"Classify user comments as: positive, negative, spam, or neutral.\"),\n    (\"human\", \"Comment: {comment}\\n\\nClassification:\")\n])\n\nchain = prompt | llm\nresult = chain.invoke({\"comment\": \"This product is amazing! Buy now at www.spam.com\"})"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "Build an algorithm to play Game of Ur (NewsBytes — AI Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Assignment was building an algorithm to play the Game of Ur (complete functions in existing code). Discussion about whether the approach will converge."
    },
    {
     "t": "p",
     "text": "**Answer — Game AI approaches:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# ═══════════════ APPROACH 1: MINIMAX WITH ALPHA-BETA ═══════════════\n\ndef minimax(state, depth, is_maximizing, alpha, beta):\n    \"\"\"Classic game tree search with pruning.\"\"\"\n    if depth == 0 or state.is_terminal():\n        return state.evaluate()\n\n    if is_maximizing:\n        max_eval = float('-inf')\n        for move in state.get_legal_moves():\n            new_state = state.apply_move(move)\n            eval_score = minimax(new_state, depth-1, False, alpha, beta)\n            max_eval = max(max_eval, eval_score)\n            alpha = max(alpha, eval_score)\n            if beta <= alpha:\n                break  # Prune\n        return max_eval\n    else:\n        min_eval = float('inf')\n        for move in state.get_legal_moves():\n            new_state = state.apply_move(move)\n            eval_score = minimax(new_state, depth-1, True, alpha, beta)\n            min_eval = min(min_eval, eval_score)\n            beta = min(beta, eval_score)\n            if beta <= alpha:\n                break  # Prune\n        return min_eval\n\n# ═══════════════ APPROACH 2: REINFORCEMENT LEARNING ═══════════════\n\nimport numpy as np\n\nclass QLearningAgent:\n    def __init__(self, actions, lr=0.1, gamma=0.95, epsilon=0.1):\n        self.q_table = {}  # state → action values\n        self.lr = lr\n        self.gamma = gamma\n        self.epsilon = epsilon\n        self.actions = actions\n\n    def get_q(self, state, action):\n        return self.q_table.get((state, action), 0.0)\n\n    def choose_action(self, state):\n        if np.random.random() < self.epsilon:\n            return np.random.choice(self.actions)\n\n        q_values = [self.get_q(state, a) for a in self.actions]\n        return self.actions[np.argmax(q_values)]\n\n    def update(self, state, action, reward, next_state):\n        \"\"\"Q-learning update rule.\"\"\"\n        best_next = max(self.get_q(next_state, a) for a in self.actions)\n        current = self.get_q(state, action)\n\n        # Q(s,a) ← Q(s,a) + α[r + γ·max_a'Q(s',a') - Q(s,a)]\n        self.q_table[(state, action)] = current + self.lr * (\n            reward + self.gamma * best_next - current\n        )\n\n# Convergence: Q-learning converges if:\n# 1. All state-action pairs visited infinitely often\n# 2. Learning rate decreases appropriately (Σα = ∞, Σα² < ∞)\n# 3. MDP is finite"
    },
    {
     "t": "p",
     "text": "**Will the approach converge?**"
    },
    {
     "t": "ul",
     "items": [
      "**Minimax:** Always terminates (bounded by tree depth), but may not find optimal play without sufficient depth",
      "**Q-learning:** Converges to optimal policy given sufficient exploration (ε-greedy) and proper learning rate decay",
      "**Deep RL (DQN):** No convergence guarantees, but empirically works with experience replay + target networks"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Design an end-to-end AI system",
   "body": [
    {
     "t": "p",
     "text": "**Architecture for production AI:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "┌──────────────────────────────────────────────────────┐\n│                 AI SYSTEM ARCHITECTURE               │\n├──────────────────────────────────────────────────────┤\n│                                                      │\n│  DATA LAYER      MODEL LAYER      SERVING LAYER      │\n│  ┌──────────┐    ┌──────────┐    ┌──────────────┐    │\n│  │ Ingestion│    │ Training │    │  API Gateway  │   │\n│  │ (Kafka)  │───►│ (GPU     │───►│  (FastAPI)    │   │\n│  │          │    │  Cluster)│    │               │   │\n│  ├──────────┤    ├──────────┤    ├──────────────┤    │\n│  │ Feature  │    │ Registry │    │  Inference    │   │\n│  │ Store    │───►│ (MLflow) │───►│  (TorchServe) │   │\n│  │ (Feast)  │    │          │    │               │   │\n│  ├──────────┤    ├──────────┤    ├──────────────┤    │\n│  │ Storage  │    │ Eval     │    │  Monitoring   │   │\n│  │ (S3/GCS) │    │ Pipeline │    │  (Prometheus) │   │\n│  └──────────┘    └──────────┘    └──────────────┘    │\n│                                                      │\n│  MONITORING: Data drift │ Model drift │ Latency      │\n└──────────────────────────────────────────────────────┘"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# FastAPI serving example\nfrom fastapi import FastAPI\nfrom pydantic import BaseModel\nimport torch\n\napp = FastAPI()\n\nclass PredictionRequest(BaseModel):\n    features: list[float]\n\nclass PredictionResponse(BaseModel):\n    prediction: float\n    confidence: float\n\n# Load model at startup\nmodel = torch.jit.load(\"model.pt\")\nmodel.eval()\n\n@app.post(\"/predict\", response_model=PredictionResponse)\nasync def predict(request: PredictionRequest):\n    with torch.no_grad():\n        tensor = torch.tensor([request.features])\n        output = model(tensor)\n        prob = torch.sigmoid(output).item()\n\n    return PredictionResponse(\n        prediction=1 if prob > 0.5 else 0,\n        confidence=prob\n    )\n\n# Health check\n@app.get(\"/health\")\nasync def health():\n    return {\"status\": \"healthy\", \"model_loaded\": True}"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What was your inspiration for pursuing AI? (Sonasoft — Senior AI Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Framework for answering:**"
    },
    {
     "t": "p",
     "text": "This is a behavioral/motivation question. Structure your answer around:"
    },
    {
     "t": "ol",
     "items": [
      "**Personal connection:** What sparked your interest?",
      "**Technical fascination:** Which aspect excites you? (vision, NLP, RL, etc.)",
      "**Impact motivation:** How do you see AI helping society?",
      "**Continuous learning:** How do you stay current?"
     ]
    },
    {
     "t": "p",
     "text": "**Also be prepared for ethics questions:**"
    },
    {
     "t": "table",
     "head": [
      "Topic",
      "Key Issues",
      "Your Position"
     ],
     "rows": [
      [
       "**Bias**",
       "Training data biases, demographic disparities",
       "Regular bias audits, diverse datasets"
      ],
      [
       "**Privacy**",
       "Data collection, model memorization",
       "Differential privacy, federated learning"
      ],
      [
       "**Transparency**",
       "Black box decisions",
       "XAI (SHAP, LIME), model cards"
      ],
      [
       "**Safety**",
       "Harmful outputs, misuse",
       "Guardrails, RLHF, red teaming"
      ],
      [
       "**Displacement**",
       "Job automation",
       "Augmentation over replacement"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "Feature engineering best practices",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\n# ═══════════════ TEMPORAL FEATURES ═══════════════\ndf['hour'] = df['timestamp'].dt.hour\ndf['day_of_week'] = df['timestamp'].dt.dayofweek\ndf['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)\ndf['month'] = df['timestamp'].dt.month\n\n# Cyclical encoding for temporal features\ndf['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)\ndf['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)\n\n# ═══════════════ AGGREGATION FEATURES ═══════════════\n# Rolling statistics\ndf['price_7d_mean'] = df.groupby('product')['price'].transform(\n    lambda x: x.rolling(7, min_periods=1).mean()\n)\ndf['price_7d_std'] = df.groupby('product')['price'].transform(\n    lambda x: x.rolling(7, min_periods=1).std()\n)\n\n# Lag features\ndf['price_lag_1'] = df.groupby('product')['price'].shift(1)\ndf['price_lag_7'] = df.groupby('product')['price'].shift(7)\n\n# ═══════════════ INTERACTION FEATURES ═══════════════\ndf['price_per_sqft'] = df['price'] / df['sqft']\ndf['rooms_per_person'] = df['rooms'] / df['family_size']\n\n# ═══════════════ TEXT FEATURES ═══════════════\ndf['text_length'] = df['review'].str.len()\ndf['word_count'] = df['review'].str.split().str.len()\ndf['avg_word_length'] = df['text_length'] / df['word_count']\ndf['has_exclamation'] = df['review'].str.contains('!').astype(int)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Common AI Engineer behavioral questions",
   "body": [
    {
     "t": "table",
     "head": [
      "Company",
      "Question"
     ],
     "rows": [
      [
       "**Google**",
       "Basic algorithm questions (expect LC Medium+)"
      ],
      [
       "**Accenture**",
       "Deep technical: ML domains, Statistical Learning Theory, SVMs, NNs"
      ],
      [
       "**AMD**",
       "Algorithms, data preprocessing methods, models"
      ],
      [
       "**IBM**",
       "BST and SQL questions"
      ],
      [
       "**NewsBytes**",
       "Game AI algorithm + convergence analysis"
      ],
      [
       "**FPT Software**",
       "Prompt engineering and LLM concepts"
      ],
      [
       "**E42.ai**",
       "Python internals (dict sorting, data structures)"
      ],
      [
       "**Pirimid Fintech**",
       "Explain your projects and resume"
      ],
      [
       "**zarplata.ru**",
       "NLP: Comments classification system"
      ],
      [
       "**WB Hotels**",
       "Recommendation algorithm design"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**STAR Method template for projects:**"
    },
    {
     "t": "quote",
     "text": "**S:** \"At [Company], our team faced [specific problem] affecting [metric].\" **T:** \"I was responsible for [your specific role/task].\" **A:** \"I implemented [specific technical approach] — chose [Algorithm X] because [reason]. Key challenges: [1, 2, 3]. Solutions: [1, 2, 3].\" **R:** \"This resulted in [quantified improvement]: [X% improvement in metric], [Y% reduction in latency], [Z% cost savings].\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Implement beam search for sequence generation (Google — AI Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Implement beam search decoding for a language model. Compare with greedy decoding."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef greedy_decode(model_fn, start_token, max_len=20, eos_token=2):\n    \"\"\"Greedy: always pick highest probability token.\"\"\"\n    sequence = [start_token]\n    for _ in range(max_len):\n        logits = model_fn(sequence)\n        next_token = np.argmax(logits)\n        sequence.append(next_token)\n        if next_token == eos_token:\n            break\n    return sequence\n\ndef beam_search(model_fn, start_token, beam_width=3, max_len=20, eos_token=2):\n    \"\"\"\n    Beam search: maintain top-k sequences at each step.\n\n    Args:\n        model_fn: function(sequence) → logits over vocab\n        beam_width: number of beams to keep\n    \"\"\"\n    # Each beam: (log_probability, sequence)\n    beams = [(0.0, [start_token])]\n    completed = []\n\n    for step in range(max_len):\n        all_candidates = []\n\n        for score, seq in beams:\n            if seq[-1] == eos_token:\n                completed.append((score, seq))\n                continue\n\n            logits = model_fn(seq)\n            log_probs = logits - np.log(np.sum(np.exp(logits)))  # log softmax\n\n            # Get top-k tokens for this beam\n            top_k = np.argsort(log_probs)[-beam_width:]\n\n            for token in top_k:\n                new_score = score + log_probs[token]\n                new_seq = seq + [token]\n                all_candidates.append((new_score, new_seq))\n\n        if not all_candidates:\n            break\n\n        # Keep top beam_width candidates\n        all_candidates.sort(key=lambda x: x[0], reverse=True)\n        beams = all_candidates[:beam_width]\n\n    # Add remaining beams to completed\n    completed.extend(beams)\n\n    # Length-normalize scores\n    completed = [(score / len(seq), seq) for score, seq in completed]\n    completed.sort(key=lambda x: x[0], reverse=True)\n\n    return completed[0][1] if completed else beams[0][1]\n\n# Simulate with dummy model\nvocab_size = 100\ndef dummy_model(sequence):\n    np.random.seed(len(sequence))\n    return np.random.randn(vocab_size)\n\ngreedy_result = greedy_decode(dummy_model, start_token=1)\nbeam_result = beam_search(dummy_model, start_token=1, beam_width=5)\nprint(f\"Greedy: {greedy_result[:10]}...\")\nprint(f\"Beam:   {beam_result[:10]}...\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Greedy decoding is suboptimal — local best ≠ global best. Beam search explores multiple paths. Length normalization prevents bias toward shorter sequences. Nucleus sampling (top-p) is preferred for creative generation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Implement image augmentation pipeline from scratch (AMD — AI Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Build a data augmentation pipeline for computer vision without using torchvision.transforms."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nclass ImageAugmentor:\n    \"\"\"Custom image augmentation pipeline.\"\"\"\n\n    def __init__(self, transforms=None):\n        self.transforms = transforms or []\n\n    def add(self, fn, probability=0.5):\n        self.transforms.append((fn, probability))\n        return self\n\n    def __call__(self, image):\n        for fn, prob in self.transforms:\n            if np.random.random() < prob:\n                image = fn(image)\n        return image\n\ndef random_horizontal_flip(image):\n    return image[:, ::-1, :]\n\ndef random_vertical_flip(image):\n    return image[::-1, :, :]\n\ndef random_rotation(image, max_angle=30):\n    \"\"\"Rotate image by random angle.\"\"\"\n    angle = np.random.uniform(-max_angle, max_angle)\n    h, w = image.shape[:2]\n    cy, cx = h // 2, w // 2\n\n    # Rotation matrix\n    theta = np.radians(angle)\n    cos_t, sin_t = np.cos(theta), np.sin(theta)\n\n    rotated = np.zeros_like(image)\n    for y in range(h):\n        for x in range(w):\n            # Inverse mapping\n            src_x = cos_t * (x - cx) + sin_t * (y - cy) + cx\n            src_y = -sin_t * (x - cx) + cos_t * (y - cy) + cy\n\n            if 0 <= int(src_x) < w and 0 <= int(src_y) < h:\n                rotated[y, x] = image[int(src_y), int(src_x)]\n\n    return rotated\n\ndef random_brightness(image, factor_range=(0.7, 1.3)):\n    factor = np.random.uniform(*factor_range)\n    return np.clip(image * factor, 0, 255).astype(np.uint8)\n\ndef random_crop(image, crop_ratio=0.8):\n    h, w = image.shape[:2]\n    new_h, new_w = int(h * crop_ratio), int(w * crop_ratio)\n    top = np.random.randint(0, h - new_h)\n    left = np.random.randint(0, w - new_w)\n    cropped = image[top:top+new_h, left:left+new_w]\n    # Resize back to original (nearest neighbor)\n    result = np.zeros_like(image)\n    for y in range(h):\n        for x in range(w):\n            sy = int(y * new_h / h)\n            sx = int(x * new_w / w)\n            result[y, x] = cropped[sy, sx]\n    return result\n\ndef cutout(image, n_holes=1, hole_size=16):\n    \"\"\"Random erasing / cutout augmentation.\"\"\"\n    h, w = image.shape[:2]\n    augmented = image.copy()\n\n    for _ in range(n_holes):\n        cy = np.random.randint(0, h)\n        cx = np.random.randint(0, w)\n        y1 = max(0, cy - hole_size // 2)\n        y2 = min(h, cy + hole_size // 2)\n        x1 = max(0, cx - hole_size // 2)\n        x2 = min(w, cx + hole_size // 2)\n        augmented[y1:y2, x1:x2] = 0  # Or random noise\n\n    return augmented\n\ndef mixup(image1, image2, label1, label2, alpha=0.2):\n    \"\"\"Mixup: blend two images and labels.\"\"\"\n    lam = np.random.beta(alpha, alpha)\n    mixed_image = (lam * image1 + (1 - lam) * image2).astype(np.uint8)\n    mixed_label = lam * label1 + (1 - lam) * label2\n    return mixed_image, mixed_label\n\n# Build pipeline\npipeline = ImageAugmentor()\npipeline.add(random_horizontal_flip, 0.5)\npipeline.add(random_brightness, 0.3)\npipeline.add(lambda img: cutout(img, n_holes=1, hole_size=16), 0.5)\n\n# Test\nimage = np.random.randint(0, 255, (64, 64, 3), dtype=np.uint8)\naugmented = pipeline(image)\nprint(f\"Original shape: {image.shape}, Augmented shape: {augmented.shape}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Augmentation prevents overfitting and improves generalization. CutOut forces model to use non-discriminative features. MixUp regularizes decision boundaries. Use albumentations in production (10x faster than torchvision)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Implement BFS and DFS for graph problems (IBM — AI Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Given a graph, implement BFS (shortest path) and DFS (cycle detection). Apply to AI knowledge graph traversal."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import deque, defaultdict\n\nclass Graph:\n    def __init__(self, directed=False):\n        self.adj = defaultdict(list)\n        self.directed = directed\n\n    def add_edge(self, u, v, weight=1):\n        self.adj[u].append((v, weight))\n        if not self.directed:\n            self.adj[v].append((u, weight))\n\n    def bfs(self, start, target=None):\n        \"\"\"BFS: shortest path in unweighted graph. O(V + E)\"\"\"\n        visited = {start}\n        queue = deque([(start, [start])])\n        parent = {start: None}\n\n        while queue:\n            node, path = queue.popleft()\n\n            if node == target:\n                return path\n\n            for neighbor, _ in self.adj[node]:\n                if neighbor not in visited:\n                    visited.add(neighbor)\n                    parent[neighbor] = node\n                    queue.append((neighbor, path + [neighbor]))\n\n        return None if target else visited\n\n    def dfs(self, start, visited=None):\n        \"\"\"DFS: traversal and cycle detection. O(V + E)\"\"\"\n        if visited is None:\n            visited = set()\n\n        visited.add(start)\n        result = [start]\n\n        for neighbor, _ in self.adj[start]:\n            if neighbor not in visited:\n                result.extend(self.dfs(neighbor, visited))\n\n        return result\n\n    def has_cycle(self):\n        \"\"\"Detect cycle using DFS coloring.\"\"\"\n        WHITE, GRAY, BLACK = 0, 1, 2\n        color = defaultdict(int)\n\n        def dfs_cycle(node):\n            color[node] = GRAY\n            for neighbor, _ in self.adj[node]:\n                if color[neighbor] == GRAY:\n                    return True  # Back edge → cycle\n                if color[neighbor] == WHITE and dfs_cycle(neighbor):\n                    return True\n            color[node] = BLACK\n            return False\n\n        for node in self.adj:\n            if color[node] == WHITE:\n                if dfs_cycle(node):\n                    return True\n        return False\n\n    def dijkstra(self, start):\n        \"\"\"Shortest path in weighted graph. O((V + E) log V)\"\"\"\n        import heapq\n\n        distances = {start: 0}\n        pq = [(0, start)]\n        parent = {start: None}\n\n        while pq:\n            dist, node = heapq.heappop(pq)\n\n            if dist > distances.get(node, float('inf')):\n                continue\n\n            for neighbor, weight in self.adj[node]:\n                new_dist = dist + weight\n                if new_dist < distances.get(neighbor, float('inf')):\n                    distances[neighbor] = new_dist\n                    parent[neighbor] = node\n                    heapq.heappush(pq, (new_dist, neighbor))\n\n        return distances, parent\n\n# AI Knowledge Graph example\nkg = Graph(directed=True)\nkg.add_edge(\"Neural_Network\", \"CNN\")\nkg.add_edge(\"Neural_Network\", \"RNN\")\nkg.add_edge(\"CNN\", \"ResNet\")\nkg.add_edge(\"CNN\", \"YOLO\")\nkg.add_edge(\"RNN\", \"LSTM\")\nkg.add_edge(\"LSTM\", \"Transformer\")\nkg.add_edge(\"Transformer\", \"BERT\")\nkg.add_edge(\"Transformer\", \"GPT\")\n\npath = kg.bfs(\"Neural_Network\", \"GPT\")\nprint(f\"Path from Neural_Network to GPT: {' → '.join(path)}\")\n\nall_nodes = kg.dfs(\"Neural_Network\")\nprint(f\"DFS traversal: {' → '.join(all_nodes)}\")\nprint(f\"Has cycle: {kg.has_cycle()}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** BFS = shortest unweighted path, level-order traversal. DFS = cycle detection, topological sort, connected components. Knowledge graphs in AI use these for reasoning paths. Dijkstra for weighted shortest path."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

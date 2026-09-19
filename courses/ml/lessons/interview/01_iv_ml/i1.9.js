/* ============================================================================
   INTERVIEW I1.9 — ML System Design & Scalability
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/01_ML_Core_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.9",
 "lede": "**20 questions** from Core ML Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "ML System Design & Scalability",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "156",
   "q": "How do you scale ML training to very large datasets?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Mini-batch SGD:** Load batches from disk (Dask, TF datasets, PyTorch DataLoader).",
      "**Distributed training:** Horovod, PyTorch DDP — gradient synchronization across GPUs/nodes.",
      "**Incremental/online learning:** Partial fit on streaming data (sklearn `partial_fit`).",
      "**Approximate algorithms:** Approximate nearest-neighbor, sketches (HyperLogLog, MinHash)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "157",
   "q": "What is the train-serve skew problem?",
   "body": [
    {
     "t": "p",
     "text": "Discrepancy between the data distribution during training and the data distribution in production. Causes silent model degradation. Prevention:"
    },
    {
     "t": "ul",
     "items": [
      "Use the same preprocessing pipeline for training and serving.",
      "Log production features and compare distributions to training data.",
      "Monitor feature drift with PSI / KL divergence."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "158",
   "q": "What is data drift vs concept drift?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Data drift (covariate shift):** Input feature distribution P(X) changes; P(Y|X) stays the same.",
      "**Concept drift:** The relationship P(Y|X) changes; model becomes stale.",
      "**Label shift:** Output distribution P(Y) changes (upstream business change)."
     ]
    },
    {
     "t": "p",
     "text": "Detect with: statistical tests (KS, PSI), embedding drift monitoring, prediction distribution monitoring."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "159",
   "q": "What is feature store and why is it used?",
   "body": [
    {
     "t": "p",
     "text": "A centralized repository for computed features that ensures:"
    },
    {
     "t": "ul",
     "items": [
      "**Consistency:** Same features for training and serving.",
      "**Reuse:** Precomputed features across teams/models.",
      "**Point-in-time correctness:** No future data leakage."
     ]
    },
    {
     "t": "p",
     "text": "Examples: Feast, Tecton, Hopsworks, Vertex AI Feature Store."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "160",
   "q": "What is a data pipeline for ML and what are its stages?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Raw Source → Ingestion (Kafka/Batch) → Validation (Great Expectations) →\nTransformation (Spark/dbt) → Feature Engineering → Feature Store →\nTraining → Evaluation → Registry → Serving → Monitoring"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "161",
   "q": "What is model registry and why is it important?",
   "body": [
    {
     "t": "p",
     "text": "A versioned central store for trained models with metadata (metrics, data version, training config). Enables: rollback, A/B testing, audit trail. Tools: MLflow Model Registry, Weights & Biases Artifacts, Vertex AI Model Registry."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "162",
   "q": "What is shadow mode deployment?",
   "body": [
    {
     "t": "p",
     "text": "Deploy a new model alongside the production model. Both receive the same requests but only the production model's predictions are shown to users. The shadow model's predictions are logged for offline analysis before promoting it."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "163",
   "q": "What is canary deployment for ML models?",
   "body": [
    {
     "t": "p",
     "text": "Gradually route an increasing percentage (1% → 5% → 25% → 100%) of traffic to the new model while monitoring key metrics (accuracy, latency, error rate). Roll back immediately if metrics degrade."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "164",
   "q": "What is concept drift detection with ADWIN?",
   "body": [
    {
     "t": "p",
     "text": "ADWIN (ADaptive WINdowing) maintains a sliding window of predictions and automatically shrinks the window when it detects a statistically significant change in the error distribution. Part of the River (online ML) library."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "165",
   "q": "What is the two-sample test and how is it used for drift detection?",
   "body": [
    {
     "t": "p",
     "text": "Compare feature distributions between a reference window (training data) and production data:"
    },
    {
     "t": "ul",
     "items": [
      "**KS test:** For continuous features.",
      "**Chi-squared test:** For categorical features.",
      "**MMD (Maximum Mean Discrepancy):** Two-sample test in kernel space."
     ]
    },
    {
     "t": "p",
     "text": "Set p-value threshold (e.g., 0.05) and alert if test detects shift."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "166",
   "q": "What is online learning and how does sklearn support it?",
   "body": [
    {
     "t": "p",
     "text": "Update the model incrementally as new data arrives without retraining from scratch:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import SGDClassifier\n\nclf = SGDClassifier()\nfor batch in stream:\n    X_batch, y_batch = batch\n    clf.partial_fit(X_batch, y_batch, classes=[0, 1])"
    },
    {
     "t": "p",
     "text": "Sklearn supports `partial_fit` for: SGDClassifier, MultinomialNB, IncrementalPCA, MiniBatchKMeans."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "167",
   "q": "What is model distillation in traditional ML?",
   "body": [
    {
     "t": "p",
     "text": "Train a smaller, faster model (student) to mimic a larger, more complex model (teacher). The student is trained on soft labels (teacher's predicted probabilities) rather than hard labels. Achieves near-teacher accuracy at a fraction of inference cost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "168",
   "q": "What is the curse of dimensionality and its effects?",
   "body": [
    {
     "t": "p",
     "text": "In high-dimensional spaces:"
    },
    {
     "t": "ul",
     "items": [
      "Data becomes sparse — all points are far from each other.",
      "Volume of space grows exponentially with dimensions.",
      "K-NN degrades (all distances become similar).",
      "Density estimation becomes intractable."
     ]
    },
    {
     "t": "p",
     "text": "Mitigation: PCA/dimensionality reduction, feature selection, regularization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "169",
   "q": "What is a serving infrastructure for ML models?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**REST API:** FastAPI + Uvicorn; simple, flexible.",
      "**TensorFlow Serving / TorchServe:** Native deep learning serving.",
      "**BentoML / Ray Serve:** Framework-agnostic, supports batching.",
      "**Triton Inference Server:** NVIDIA, multi-model, GPU-optimized.",
      "**Vertex AI / SageMaker Endpoints:** Managed cloud options."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "170",
   "q": "What is batch inference vs real-time inference?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Batch inference:** Process large volumes of data asynchronously (nightly runs). Higher throughput, lower cost.",
      "**Real-time inference:** Low-latency predictions for individual requests. Higher cost, higher availability requirements."
     ]
    },
    {
     "t": "p",
     "text": "Choose based on use case: fraud detection = real-time; churn scoring = batch."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "171",
   "q": "What is request batching in inference and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "Groups multiple inference requests into a single forward pass (GPU loves large batches). TorchServe and Triton support dynamic batching:"
    },
    {
     "t": "ul",
     "items": [
      "`max_batch_size`: Maximum requests per batch.",
      "`batch_delay`: How long to wait to fill a batch."
     ]
    },
    {
     "t": "p",
     "text": "Trades latency for throughput."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "172",
   "q": "What is model quantization in scikit-learn / traditional ML?",
   "body": [
    {
     "t": "p",
     "text": "Represent model parameters with lower precision (float32 → int8). For tree models: discretize thresholds, quantize leaf values. sklearn's `export_text` for trees or custom serialization. More commonly applied in deep learning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "173",
   "q": "What is the holdout strategy for time-series data?",
   "body": [
    {
     "t": "p",
     "text": "Never use random split for time-series — it causes data leakage. Use:"
    },
    {
     "t": "ul",
     "items": [
      "**Walk-forward validation:** Train on period [1,t], validate on [t+1,t+h]; slide forward.",
      "**Expanding window:** Train set grows; validation window slides."
     ]
    },
    {
     "t": "p",
     "text": "Sklearn: `TimeSeriesSplit`."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "174",
   "q": "What is label leakage vs feature leakage?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Label leakage:** Target information present in features (e.g., using future data).",
      "**Feature leakage:** Features derived from the test set statistics contaminate the training pipeline (e.g., fitting scaler on entire dataset before split)."
     ]
    },
    {
     "t": "p",
     "text": "Prevention: Always fit preprocessing inside cross-validation folds using sklearn Pipelines."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "175",
   "q": "What is the difference between offline and online metrics in ML?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Offline metrics:** Computed on held-out dataset during development. Accuracy, AUC, F1, RMSE.",
      "**Online metrics:** Business metrics from A/B testing in production. CTR, conversion rate, revenue per user."
     ]
    },
    {
     "t": "p",
     "text": "A model can have great offline metrics but fail online (proxy metric mismatch). Always validate with online A/B tests before full deployment."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

/* ============================================================================
   PRACTICE P10.1 — Pipelines, Deployment and Advanced · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/10_Pipelines_Deployment_and_Advanced.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p10.1",
 "lede": "**25 scenarios** from Pipelines, Deployment and Advanced. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "n": "1",
   "q": "What is the difference between a notebook prototype and a production ML pipeline?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Notebook:** Exploratory, manual steps, single execution, no error handling",
      "**Production:** Automated, reproducible, monitored, scalable, tested, version-controlled"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Notebook → production requires: code refactoring, testing, containerization, monitoring, CI/CD, logging, error handling. ~10× more work than prototyping."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What are the key components of an ML pipeline?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Data ingestion:** Collect, validate incoming data",
      "**Data preprocessing:** Clean, transform, feature engineer",
      "**Feature store:** Store and serve computed features",
      "**Training:** Model training with experiment tracking",
      "**Evaluation:** Validate model performance",
      "**Registry:** Store and version models",
      "**Serving:** Deploy model for inference",
      "**Monitoring:** Track performance, drift, errors"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Each component should be modular, testable, and independently deployable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is MLflow and what problems does it solve?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Open-source ML lifecycle platform:"
    },
    {
     "t": "ol",
     "items": [
      "**Tracking:** Log parameters, metrics, artifacts per experiment",
      "**Projects:** Package code for reproducibility",
      "**Models:** Model packaging and deployment",
      "**Registry:** Model versioning, staging, production transitions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Without MLflow: manually track experiments in spreadsheets, lose track of best parameters. With MLflow: all experiments logged, comparable, reproducible."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "How do you version control ML models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Code:** Git for training code, configs, pipelines",
      "**Data:** DVC (Data Version Control), Delta Lake",
      "**Models:** MLflow Model Registry, Weights & Biases",
      "**Experiments:** MLflow tracking, experiment metadata"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Must track: code version + data version + hyperparameters + environment → reproducible model. Code alone is insufficient."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is a model registry?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Central repository for managing model lifecycle:"
    },
    {
     "t": "ul",
     "items": [
      "Store trained model artifacts",
      "Version models (v1, v2, v3...)",
      "Track model lineage (which data, code, params)",
      "Manage stages: development → staging → production → archived"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** MLflow, SageMaker, Vertex AI provide registries. Enables rollback, A/B testing, gradual rollout."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What are the common model serving patterns?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Batch prediction:** Scheduled batch scoring (nightly, hourly)",
      "**Real-time API:** REST/gRPC endpoint for online prediction",
      "**Edge/embedded:** Model deployed on device",
      "**Streaming:** Predictions on data streams (Kafka + model)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Batch: high throughput, simple. Real-time: low latency requirement. Edge: no network dependency. Choose based on latency requirements and infrastructure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the difference between model serving with REST API vs gRPC?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**REST:** HTTP/JSON, human-readable, widely compatible, higher latency",
      "**gRPC:** HTTP/2, Protocol Buffers, binary encoding, lower latency, streaming support"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** REST for simplicity and browser compatibility. gRPC for high-performance, low-latency, service-to-service communication. gRPC typically 2-5× faster."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "How do you containerize an ML model for deployment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "FROM python:3.10-slim\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY model/ /app/model/\nCOPY serve.py /app/\nEXPOSE 8080\nCMD [\"python\", \"/app/serve.py\"]"
    },
    {
     "t": "p",
     "text": "**Explanation:** Docker ensures environment consistency. Pin all dependencies. Multi-stage build for smaller images. Use GPU-enabled base images for GPU inference."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is model drift and how do you detect it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Data drift:** Input feature distribution changes (P(X) shifts)",
      "**Concept drift:** Relationship between features and target changes (P(Y|X) shifts)",
      "**Prediction drift:** Output distribution changes"
     ]
    },
    {
     "t": "p",
     "text": "**Detection:** KS test, PSI (Population Stability Index), JS divergence on feature distributions. Monitor prediction distributions over time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is the training-serving skew?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Discrepancy between how features are computed during training vs serving."
    },
    {
     "t": "p",
     "text": "**Causes:**"
    },
    {
     "t": "ol",
     "items": [
      "Different code paths for training and serving",
      "Different data sources",
      "Different preprocessing logic",
      "Feature computation timing differences"
     ]
    },
    {
     "t": "p",
     "text": "**Solution:** Feature store (single source of truth), shared preprocessing code, end-to-end testing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "How do you A/B test ML models in production?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Split traffic randomly (e.g., 50/50 or 90/10 for canary)",
      "Route requests based on user hash (consistent assignment)",
      "Measure business metrics (conversion, engagement, revenue)",
      "Statistical significance testing before declaring winner",
      "Run for sufficient duration (1-4 weeks)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Never rely on offline metrics alone. A/B test captures real-world impact. Guard rails: monitor latency, error rates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is a canary deployment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Deploy new model to small percentage of traffic (5-10%) and gradually increase if metrics look good."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Day 1: 5% new model, 95% old model\nDay 3: 25% new model, 75% old model\nDay 7: 50/50\nDay 14: 100% new model (if metrics good)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces risk of bad deployments. Automatic rollback if key metrics degrade. Shadow mode: run new model on all traffic but only serve old model's predictions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is shadow deployment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Run new model alongside production model on all traffic. New model's predictions are logged but not served. Compare predictions offline."
    },
    {
     "t": "p",
     "text": "**Explanation:** Zero risk to users. Validates: latency, error rates, prediction distribution. Limitation: can't measure user behavior impact (only A/B test can)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is a feature store and why is it important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Centralized platform for computing, storing, and serving ML features."
    },
    {
     "t": "p",
     "text": "**Features:**"
    },
    {
     "t": "ol",
     "items": [
      "Single source of truth for features",
      "Share features across models/teams",
      "Point-in-time correct feature retrieval (prevents leakage)",
      "Online (low-latency) and offline (batch) serving"
     ]
    },
    {
     "t": "p",
     "text": "**Tools:** Feast, Tecton, Hopsworks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What are the key ML monitoring metrics?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Model performance:** Accuracy, precision, recall (requires labels)",
      "**Data quality:** Missing values, outliers, schema violations",
      "**Feature drift:** Distribution changes vs training data",
      "**Prediction drift:** Changes in output distribution",
      "**System metrics:** Latency, throughput, error rates, memory"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Labels often delayed → proxy metrics needed. Monitor inputs (drift) as early warning before performance degrades."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "How do you handle model retraining?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Triggers:**"
    },
    {
     "t": "ol",
     "items": [
      "**Scheduled:** Weekly, monthly, quarterly",
      "**Performance-based:** When monitored metrics drop below threshold",
      "**Data-based:** When significant drift detected",
      "**Event-based:** Known distribution shift (policy change, COVID)"
     ]
    },
    {
     "t": "p",
     "text": "**Pipeline:** Automated data pull → retrain → evaluate → compare vs current model → deploy if better."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is CI/CD for ML (MLOps)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**CI:** Automated testing (unit tests, data validation, model quality tests) on code changes",
      "**CD:** Automated deployment pipeline (retrain → evaluate → register → deploy)",
      "**CT (Continuous Training):** Automated retraining on new data"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Unit tests for preprocessing code. Integration tests for pipeline. Model quality tests: performance above threshold. Tools: GitHub Actions, Jenkins, Kubeflow Pipelines."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What tests should you write for ML code?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Unit tests:** Individual functions (preprocessing, feature engineering)",
      "**Data validation:** Schema checks, value ranges, missing value rates",
      "**Model tests:** Output shape, probability ranges, deterministic predictions",
      "**Integration tests:** Full pipeline end-to-end",
      "**Performance tests:** Inference latency, throughput"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Test: \"Does the model output probabilities between 0 and 1?\" \"Does preprocessing handle edge cases (empty strings, NaN)?\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is ONNX and why is it useful for deployment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Open Neural Network Exchange — open format for ML models enabling interoperability."
    },
    {
     "t": "p",
     "text": "**Benefits:**"
    },
    {
     "t": "ol",
     "items": [
      "Framework-agnostic (PyTorch → ONNX → any runtime)",
      "ONNX Runtime: optimized inference",
      "Hardware-specific optimization (CPU, GPU, edge devices)",
      "Typically 2-3× faster inference than native framework"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Train in PyTorch, export to ONNX, serve with ONNX Runtime. Avoids heavy training framework in production."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "How do you handle model latency requirements?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Model optimization:** Quantization, pruning, distillation",
      "**Serving optimization:** Batching, caching, pre-computation",
      "**Infrastructure:** GPU serving, auto-scaling, CDN for static models",
      "**Architecture:** Simpler model, fewer features, pre-computed embeddings"
     ]
    },
    {
     "t": "p",
     "text": "**Targets:** Real-time search: < 50ms. Recommendation API: < 100ms. Batch scoring: throughput > latency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is model interpretability in production and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Regulatory:** GDPR Right to Explanation, Equal Credit Opportunity Act",
      "**Trust:** Users/stakeholders need to understand decisions",
      "**Debugging:** Identify why model makes wrong predictions",
      "**Bias detection:** Ensure model isn't discriminating"
     ]
    },
    {
     "t": "p",
     "text": "**Tools:** SHAP, LIME, feature importance, attention visualization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is an ML platform and what are the major ones?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**AWS SageMaker:** End-to-end ML on AWS (notebooks, training, deployment)",
      "**Google Vertex AI:** GCP ML platform (AutoML, custom training, pipelines)",
      "**Azure ML:** Microsoft's ML platform",
      "**Databricks:** Unified analytics + ML (MLflow integrated)",
      "**Open source:** Kubeflow, MLflow, Airflow + custom"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Managed platforms reduce infrastructure burden. Open source gives more control."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is data validation in ML pipelines?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Automated checks on incoming data:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Great Expectations example\nexpect_column_values_to_be_between('age', min=0, max=150)\nexpect_column_values_to_not_be_null('customer_id')\nexpect_column_to_exist('purchase_amount')\nexpect_column_values_to_be_in_set('status', ['active', 'inactive'])"
    },
    {
     "t": "p",
     "text": "**Tools:** Great Expectations, TFX Data Validation, Pandera."
    },
    {
     "t": "p",
     "text": "**Explanation:** Catch data quality issues before they corrupt model predictions. Run on every data ingestion."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is experiment tracking and why is it essential?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Logging all information about each ML experiment:"
    },
    {
     "t": "ul",
     "items": [
      "Hyperparameters",
      "Metrics (train, validation, test)",
      "Data version",
      "Code version",
      "Environment/dependencies",
      "Artifacts (model, plots, configs)"
     ]
    },
    {
     "t": "p",
     "text": "**Tools:** MLflow, Weights & Biases, Neptune, Comet."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without tracking: \"Which of the 100 experiments gave the best result?\" With tracking: searchable, comparable, reproducible."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "How do you handle model rollback?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Keep previous model versions in registry",
      "Automated rollback trigger (performance drops below threshold)",
      "Blue-green deployment (switch back to old model instantly)",
      "Feature flags to control model version"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Rollback should be instantaneous — never delete old model before new one is validated. Blue-green: two environments, switch traffic between them."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

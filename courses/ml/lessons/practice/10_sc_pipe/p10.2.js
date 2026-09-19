/* ============================================================================
   PRACTICE P10.2 — Pipelines, Deployment and Advanced · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/10_Pipelines_Deployment_and_Advanced.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p10.2",
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
   "n": "26",
   "q": "What is the difference between online and offline feature computation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Offline features:** Computed in batch jobs (daily user aggregates, historical stats)",
      "**Online features:** Computed in real-time (current session features, real-time events)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Feature store bridges both: batch features pre-computed and available for low-latency serving. Online features computed at request time."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is model governance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Policies and processes for responsible ML model management:"
    },
    {
     "t": "ol",
     "items": [
      "Model documentation (Model Card)",
      "Approval workflow for production deployment",
      "Audit trail (who deployed what, when)",
      "Bias/fairness assessments",
      "Performance monitoring requirements",
      "Data privacy compliance"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Regulated industries (finance, healthcare) require formal governance. Model Cards document intended use, limitations, and evaluation results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is a Model Card?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Documentation template for ML models including:"
    },
    {
     "t": "ol",
     "items": [
      "Model details (architecture, training data)",
      "Intended use cases and limitations",
      "Performance metrics across subgroups",
      "Ethical considerations",
      "Maintenance information"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Google introduced Model Cards. Promotes transparency, trust, and responsible ML. Should be updated with each model version."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "How do you ensure reproducibility of ML experiments?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Set random seeds (Python, NumPy, PyTorch, CUDA)",
      "Pin dependency versions (requirements.txt with ==)",
      "Version control data (DVC, data snapshots)",
      "Log all hyperparameters",
      "Container/environment specification (Docker)",
      "Store model artifacts with experiment reference"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Full reproducibility: same code + same data + same environment + same random seed → identical model. Often approximated in GPU training due to non-deterministic operations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is the difference between batch inference and real-time inference?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Batch:** Process large dataset at once (hourly/daily), results stored for later retrieval",
      "**Real-time:** Process single request immediately, return result in milliseconds"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Batch: cost-efficient, higher throughput, doesn't need serving infrastructure. Real-time: requires API, low-latency infrastructure, caching. Many systems use both."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "How do you handle model versioning in a microservices architecture?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "API versioning: /v1/predict, /v2/predict",
      "Model version as HTTP header or parameter",
      "Service mesh routing (Istio) for traffic splitting",
      "Model version embedded in Docker image tag"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Multiple model versions may run simultaneously (A/B testing, gradual rollout). Service mesh enables fine-grained traffic control."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is Kubeflow and how does it help?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Kubernetes-native ML platform providing:"
    },
    {
     "t": "ol",
     "items": [
      "**Pipelines:** DAG-based ML workflow orchestration",
      "**Notebooks:** Jupyter on Kubernetes",
      "**Training operators:** Distributed training (TF, PyTorch)",
      "**Serving:** KFServing (now KServe) for model deployment",
      "**Katib:** Hyperparameter tuning"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Runs on any Kubernetes cluster. Scalable, portable. Steeper learning curve than managed platforms but more flexible."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is data lineage and why is it important for ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Tracking the complete journey of data: source → transformations → features → model → predictions."
    },
    {
     "t": "p",
     "text": "**Importance:**"
    },
    {
     "t": "ol",
     "items": [
      "Debug prediction errors (trace back to source data)",
      "Compliance (prove data provenance)",
      "Impact analysis (if data source changes, which models affected?)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Data lineage + model lineage = full traceability. Tools: Apache Atlas, Amundsen, OpenLineage."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "How do you scale ML model serving?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Horizontal scaling:** Multiple model replicas behind load balancer",
      "**Auto-scaling:** Scale based on request rate/latency (Kubernetes HPA)",
      "**Batch prediction:** Process many inputs at once",
      "**Model optimization:** Quantization, distillation for faster per-request inference",
      "**Caching:** Cache frequent predictions (Redis, Memcached)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Start simple (single instance), scale as needed. Kubernetes + auto-scaling handles most production loads."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is the difference between model training and model inference optimization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Training optimization:** Faster convergence (optimizer, lr schedule, data loading, distributed training)",
      "**Inference optimization:** Faster prediction (quantization, pruning, batching, hardware acceleration)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Training: throughput-oriented, can use large GPUs. Inference: latency-oriented, cost-sensitive, often on cheaper hardware."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is TFX (TensorFlow Extended)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** End-to-end ML platform for production:"
    },
    {
     "t": "ol",
     "items": [
      "ExampleGen (data ingestion)",
      "StatisticsGen + SchemaGen (data validation)",
      "Transform (preprocessing)",
      "Trainer (model training)",
      "Evaluator (model validation)",
      "Pusher (deployment)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Production-tested at Google. Strong data validation and model analysis. TF-specific but concepts apply universally."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "How do you handle secrets and credentials in ML pipelines?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Never hardcode in code or configs",
      "Environment variables for simple cases",
      "Secret managers: AWS Secrets Manager, HashiCorp Vault, Azure Key Vault",
      "Kubernetes Secrets for container deployments"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Database passwords, API keys, cloud credentials must be managed securely. Rotate regularly. Audit access logs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is model compression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Techniques to reduce model size for deployment:"
    },
    {
     "t": "ol",
     "items": [
      "**Pruning:** Remove unnecessary weights",
      "**Quantization:** Reduce precision (FP32 → INT8)",
      "**Knowledge distillation:** Train smaller student model",
      "**Low-rank factorization:** Decompose weight matrices",
      "**Architecture search:** Design efficient architectures (MobileNet, EfficientNet)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Combined: often achieve 10-100× compression with <5% accuracy loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is concept drift adaptation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Strategies when P(Y|X) changes over time:"
    },
    {
     "t": "ol",
     "items": [
      "**Periodic retraining:** Scheduled model updates",
      "**Windowed training:** Train only on recent data",
      "**Online learning:** Continuous model updates",
      "**Ensemble of temporal models:** Combine models from different time periods",
      "**Explicit drift detection:** DDM, ADWIN algorithms trigger retraining"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Monitor performance metrics. When degradation detected → trigger retraining on recent data. Balance recency and stability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "How do you implement a feedback loop for ML models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "User interaction → Prediction stored → \nGround truth eventually obtained → \nPerformance computed → \nIf degraded → Trigger retraining → \nNew model evaluated → Deploy if better"
    },
    {
     "t": "p",
     "text": "**Explanation:** Feedback can be: explicit (user rates prediction), implicit (user behavior after prediction), or delayed (label becomes available later). Active learning: model requests labels for uncertain predictions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is edge deployment for ML models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Running models on edge devices (mobile, IoT, browser) instead of cloud servers."
    },
    {
     "t": "p",
     "text": "**Frameworks:** TensorFlow Lite (mobile), ONNX Runtime (edge), Core ML (Apple), TensorRT (NVIDIA edge)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Benefits: low latency, privacy (data stays on device), works offline. Constraints: limited compute, memory, battery."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is serverless ML inference?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Run model inference on serverless platforms (AWS Lambda, Google Cloud Functions) — pay per request, auto-scaling."
    },
    {
     "t": "p",
     "text": "**Limitations:**"
    },
    {
     "t": "ol",
     "items": [
      "Cold start latency (model loading time)",
      "Memory/time limits",
      "No GPU (usually)",
      "Model size restrictions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Good for low-traffic, bursty workloads. Pre-warm lambdas for latency-sensitive applications."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is the difference between horizontal and vertical scaling for model serving?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Vertical:** Bigger machine (more CPU, RAM, GPU) — limited ceiling",
      "**Horizontal:** More machines/replicas — theoretically unlimited"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Start vertical (simpler). Scale horizontally when hitting limits. Horizontal requires load balancing and stateless design."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "How do you implement model monitoring dashboards?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Prediction distribution histograms (daily/hourly)",
      "Feature value distributions vs training baseline",
      "Performance metrics over time (if labels available)",
      "Latency percentiles (p50, p95, p99)",
      "Error rates and types",
      "Alerting thresholds for anomalies"
     ]
    },
    {
     "t": "p",
     "text": "**Tools:** Grafana, Datadog, custom dashboards with Streamlit."
    },
    {
     "t": "p",
     "text": "**Explanation:** Dashboard must be actionable — alerts should trigger investigation or automatic retraining."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is responsible ML deployment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Fairness testing across demographic groups",
      "Explainability for high-stakes decisions",
      "Privacy compliance (GDPR, CCPA)",
      "Robustness testing (adversarial, edge cases)",
      "Human oversight for critical decisions",
      "Fail-safe defaults when model is uncertain"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ML models affect people's lives (loans, hiring, medical diagnosis). Responsible deployment is ethical and legal obligation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is the ML technical debt concept?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Hidden costs that grow over time in ML systems:"
    },
    {
     "t": "ol",
     "items": [
      "Data dependencies (unstable upstream data)",
      "Configuration dependencies",
      "Undeclared consumers of model outputs",
      "Pipeline jungles (tangled preprocessing)",
      "Dead experimental code"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** From Google's \"Hidden Technical Debt in ML Systems\" paper. ML systems accumulate debt faster than traditional software due to data dependencies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "How do you handle model fallback strategies?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Fallback model:** Simple model (rules, heuristics) if primary model fails",
      "**Cached predictions:** Serve last known good prediction",
      "**Degraded service:** Return default/popular items instead of personalized",
      "**Circuit breaker:** Stop sending requests to failing model"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Primary model may fail (timeout, OOM, bug). Fallback ensures service continues. Never return errors to users without trying alternatives."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is MLOps maturity model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Level 0:** Manual, ad-hoc (Jupyter notebooks, manual deployment)",
      "**Level 1:** ML pipeline automation (automated training, manual deployment)",
      "**Level 2:** CI/CD pipeline automation (automated training + deployment + monitoring)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Most organizations are Level 0-1. Level 2 requires significant infrastructure investment. Progress incrementally."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "How do you estimate infrastructure costs for ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Training:** GPU hours × cost/hour × retraining frequency",
      "**Serving:** Instances × hours × cost/hour (consider auto-scaling)",
      "**Storage:** Model artifacts + training data + logs",
      "**Data processing:** ETL, feature computation",
      "**Monitoring:** Logging, dashboards, alerting"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GPU training dominates costs for deep learning. Batch inference much cheaper than real-time. Spot instances for training (up to 70% savings)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What are the key differences between deploying ML in startups vs enterprises?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Startup:** Move fast, simple infrastructure, cloud-native, few models, one team",
      "**Enterprise:** Governance, compliance, on-premises/hybrid, many models, cross-team coordination, legacy integration"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Startups: optimize for speed (managed services, simple pipelines). Enterprise: optimize for reliability, security, governance (formal MLOps platform)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

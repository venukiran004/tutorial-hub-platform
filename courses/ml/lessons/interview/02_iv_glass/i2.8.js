/* ============================================================================
   INTERVIEW I2.8 — Additional Math & Optimization · Additional Behavioral & ML Projects · Additional Model Deployment & Serving
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/02_Glassdoor_DS_and_MLE.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.8",
 "lede": "**5 questions** from Glassdoor Data Scientist and ML Engineer. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Additional Math & Optimization · Additional Behavioral & ML Projects · Additional Model Deployment & Serving",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "31",
   "q": "Implement gradient descent variants — Adam, RMSProp, SGD with momentum (Google — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Implement Adam optimizer from scratch and explain the intuition behind momentum and adaptive learning rates."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nclass SGDMomentum:\n    def __init__(self, lr=0.01, momentum=0.9):\n        self.lr = lr\n        self.momentum = momentum\n        self.velocity = None\n\n    def step(self, params, grads):\n        if self.velocity is None:\n            self.velocity = [np.zeros_like(p) for p in params]\n\n        for i in range(len(params)):\n            self.velocity[i] = self.momentum * self.velocity[i] - self.lr * grads[i]\n            params[i] += self.velocity[i]\n        return params\n\nclass RMSProp:\n    def __init__(self, lr=0.001, decay=0.99, eps=1e-8):\n        self.lr = lr\n        self.decay = decay\n        self.eps = eps\n        self.cache = None\n\n    def step(self, params, grads):\n        if self.cache is None:\n            self.cache = [np.zeros_like(p) for p in params]\n\n        for i in range(len(params)):\n            self.cache[i] = self.decay * self.cache[i] + (1 - self.decay) * grads[i]**2\n            params[i] -= self.lr * grads[i] / (np.sqrt(self.cache[i]) + self.eps)\n        return params\n\nclass Adam:\n    \"\"\"Adam = Momentum + RMSProp + Bias correction\"\"\"\n    def __init__(self, lr=0.001, beta1=0.9, beta2=0.999, eps=1e-8):\n        self.lr = lr\n        self.beta1 = beta1\n        self.beta2 = beta2\n        self.eps = eps\n        self.m = None  # First moment (mean)\n        self.v = None  # Second moment (variance)\n        self.t = 0\n\n    def step(self, params, grads):\n        if self.m is None:\n            self.m = [np.zeros_like(p) for p in params]\n            self.v = [np.zeros_like(p) for p in params]\n\n        self.t += 1\n\n        for i in range(len(params)):\n            # Update biased moments\n            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * grads[i]\n            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * grads[i]**2\n\n            # Bias correction (critical for early steps)\n            m_hat = self.m[i] / (1 - self.beta1**self.t)\n            v_hat = self.v[i] / (1 - self.beta2**self.t)\n\n            # Update parameters\n            params[i] -= self.lr * m_hat / (np.sqrt(v_hat) + self.eps)\n\n        return params\n\n# Comparison on Rosenbrock function\ndef rosenbrock(x, y):\n    return (1 - x)**2 + 100 * (y - x**2)**2\n\ndef rosenbrock_grad(x, y):\n    dx = -2 * (1 - x) - 400 * x * (y - x**2)\n    dy = 200 * (y - x**2)\n    return np.array([dx, dy])\n\n# Test all optimizers\noptimizers = {\n    'SGD+Momentum': SGDMomentum(lr=0.0001, momentum=0.9),\n    'RMSProp': RMSProp(lr=0.001),\n    'Adam': Adam(lr=0.01)\n}\n\nfor name, opt in optimizers.items():\n    params = [np.array([-1.0, -1.0])]\n\n    for step in range(1000):\n        x, y = params[0]\n        grads = [rosenbrock_grad(x, y)]\n        params = opt.step(params, grads)\n\n    x, y = params[0]\n    loss = rosenbrock(x, y)\n    print(f\"{name:15s}: x={x:.4f}, y={y:.4f}, loss={loss:.6f}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Momentum: accumulates gradient direction, avoids oscillation. RMSProp: per-parameter adaptive LR, divides by running avg of gradient magnitude. Adam: combines both + bias correction. Adam is the default choice for most DL tasks. AdamW (weight-decoupled) is preferred for transformers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "Behavioral questions for ML Engineers (Various — All Levels)",
   "body": [
    {
     "t": "table",
     "head": [
      "#",
      "Company",
      "Question"
     ],
     "rows": [
      [
       "1",
       "**Google**",
       "Tell me about a time you had to choose between model accuracy and latency"
      ],
      [
       "2",
       "**Meta**",
       "Describe a project where you had to scale an ML system to handle 10x traffic"
      ],
      [
       "3",
       "**Amazon**",
       "How did you handle a situation where the model performed well offline but poorly in production? (LP: Dive Deep)"
      ],
      [
       "4",
       "**Apple**",
       "Walk me through a time you had to explain an ML model's decision to a non-technical executive"
      ],
      [
       "5",
       "**Netflix**",
       "Describe how you balanced exploration vs exploitation in a real system"
      ],
      [
       "6",
       "**Uber**",
       "Tell me about a data pipeline failure and how you resolved it"
      ],
      [
       "7",
       "**Microsoft**",
       "How do you decide when to rebuild a model vs fine-tune an existing one?"
      ],
      [
       "8",
       "**Stripe**",
       "Describe a time when you identified and fixed a data leakage issue"
      ],
      [
       "9",
       "**ByteDance**",
       "How did you handle class imbalance in a real-world ML problem?"
      ],
      [
       "10",
       "**Databricks**",
       "Tell me about your most impactful feature engineering work"
      ],
      [
       "11",
       "**NVIDIA**",
       "Describe how you optimized model inference time by >50%"
      ],
      [
       "12",
       "**Shopee**",
       "How did you handle model versioning and rollback in production?"
      ],
      [
       "13",
       "**Atlassian**",
       "Tell me about a cross-team collaboration on an ML project"
      ],
      [
       "14",
       "**Palantir**",
       "How do you ensure reproducibility in your ML experiments?"
      ],
      [
       "15",
       "**Two Sigma**",
       "Describe a situation where your model's predictions had ethical implications"
      ],
      [
       "16",
       "**Deloitte**",
       "How do you communicate model limitations to business stakeholders?"
      ],
      [
       "17",
       "**TCS**",
       "Describe a time you had to deliver an ML solution with a tight deadline"
      ],
      [
       "18",
       "**Infosys**",
       "How do you handle client requests for \"AI\" when a simpler solution would work?"
      ],
      [
       "19",
       "**Cognizant**",
       "Tell me about migrating a legacy ML system to cloud"
      ],
      [
       "20",
       "**HCL**",
       "How do you ensure model compliance with industry regulations?"
      ],
      [
       "21",
       "**KPMG**",
       "Describe an analytics project where you had to work with sensitive financial data"
      ],
      [
       "22",
       "**PwC**",
       "How do you validate that an ML model is ready for production deployment?"
      ],
      [
       "23",
       "**EY**",
       "Tell me about a time you had to balance model performance with interpretability"
      ],
      [
       "24",
       "**Tech Mahindra**",
       "How do you handle data quality issues in enterprise ML projects?"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Design a real-time ML model serving architecture (TCS — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Design a low-latency model serving system that handles 10K requests/second with model versioning and A/B testing."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Dict, Optional\nfrom dataclasses import dataclass\nimport time\nimport hashlib\nimport random\n\n@dataclass\nclass ModelVersion:\n    model_id: str\n    version: str\n    model: object  # Loaded model\n    traffic_pct: float  # Traffic allocation for A/B\n\nclass ModelServingPlatform:\n    \"\"\"Production model serving with versioning and A/B testing.\"\"\"\n\n    def __init__(self):\n        self.models: Dict[str, list] = {}  # model_id -> [versions]\n        self.cache = {}\n        self.metrics = {\"requests\": 0, \"cache_hits\": 0, \"errors\": 0}\n\n    def deploy_model(self, model_id: str, version: str, model: object,\n                     traffic_pct: float = 100.0):\n        \"\"\"Deploy a model version with traffic allocation.\"\"\"\n        mv = ModelVersion(model_id, version, model, traffic_pct)\n        if model_id not in self.models:\n            self.models[model_id] = []\n        self.models[model_id].append(mv)\n        # Normalize traffic percentages\n        total = sum(m.traffic_pct for m in self.models[model_id])\n        for m in self.models[model_id]:\n            m.traffic_pct = m.traffic_pct / total * 100\n\n    def predict(self, model_id: str, features: Dict,\n                request_id: str = None) -> Dict:\n        \"\"\"Route request to appropriate model version.\"\"\"\n        self.metrics[\"requests\"] += 1\n        start = time.time()\n\n        # Check cache\n        cache_key = f\"{model_id}:{hashlib.md5(str(features).encode()).hexdigest()}\"\n        if cache_key in self.cache:\n            self.metrics[\"cache_hits\"] += 1\n            return {**self.cache[cache_key], \"cached\": True}\n\n        # Select model version (A/B routing)\n        version = self._route_request(model_id, request_id)\n        if not version:\n            self.metrics[\"errors\"] += 1\n            return {\"error\": f\"Model {model_id} not found\"}\n\n        try:\n            prediction = version.model.predict(features)\n            result = {\n                \"prediction\": prediction,\n                \"model_version\": version.version,\n                \"latency_ms\": (time.time() - start) * 1000,\n                \"cached\": False\n            }\n            self.cache[cache_key] = result\n            return result\n        except Exception as e:\n            self.metrics[\"errors\"] += 1\n            return {\"error\": str(e), \"model_version\": version.version}\n\n    def _route_request(self, model_id: str, request_id: str = None):\n        \"\"\"Route to model version based on traffic split.\"\"\"\n        versions = self.models.get(model_id, [])\n        if not versions:\n            return None\n\n        # Deterministic routing for consistency\n        if request_id:\n            hash_val = int(hashlib.md5(request_id.encode()).hexdigest(), 16) % 100\n        else:\n            hash_val = random.randint(0, 99)\n\n        cumulative = 0\n        for v in versions:\n            cumulative += v.traffic_pct\n            if hash_val < cumulative:\n                return v\n        return versions[-1]\n\n    def rollback(self, model_id: str, to_version: str):\n        \"\"\"Rollback to a specific version (100% traffic).\"\"\"\n        versions = self.models.get(model_id, [])\n        for v in versions:\n            v.traffic_pct = 100.0 if v.version == to_version else 0.0\n\n    def get_metrics(self):\n        cache_rate = self.metrics[\"cache_hits\"] / max(self.metrics[\"requests\"], 1)\n        return {**self.metrics, \"cache_hit_rate\": f\"{cache_rate:.1%}\"}\n\n# Architecture:\n# Load Balancer → API Gateway → Model Router → Model Container\n# Sidecar: Monitoring, Logging, Feature Store lookup\n# Key: Canary deployment (5% → 25% → 100%) with auto-rollback on metric degradation"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Production model serving needs: (1) deterministic A/B routing (same user → same model), (2) caching for repeated predictions, (3) canary deployments (5%→25%→100%), (4) auto-rollback on metric degradation, (5) model versioning with instant rollback. Target: p99 latency <100ms for real-time serving."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "Implement model monitoring and drift detection (Deloitte — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Build a system to detect data drift, concept drift, and model performance degradation in production."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nfrom typing import Dict, List\nfrom scipy import stats\nfrom collections import deque\n\nclass ModelMonitor:\n    \"\"\"Production model monitoring for drift and degradation.\"\"\"\n\n    def __init__(self, window_size: int = 1000):\n        self.reference_stats = {}\n        self.window_size = window_size\n        self.prediction_buffer = deque(maxlen=window_size)\n        self.actual_buffer = deque(maxlen=window_size)\n        self.alerts = []\n\n    def set_reference(self, feature_data: Dict[str, np.ndarray],\n                      predictions: np.ndarray):\n        \"\"\"Set reference distribution from training/validation data.\"\"\"\n        for feat_name, values in feature_data.items():\n            self.reference_stats[feat_name] = {\n                \"mean\": np.mean(values),\n                \"std\": np.std(values),\n                \"min\": np.min(values),\n                \"max\": np.max(values),\n                \"distribution\": np.histogram(values, bins=50)\n            }\n        self.reference_stats[\"predictions\"] = {\n            \"mean\": np.mean(predictions),\n            \"std\": np.std(predictions)\n        }\n\n    def check_data_drift(self, current_data: Dict[str, np.ndarray],\n                         threshold: float = 0.05) -> Dict:\n        \"\"\"Detect data drift using KS test and PSI.\"\"\"\n        drift_results = {}\n\n        for feat_name, current_values in current_data.items():\n            if feat_name not in self.reference_stats:\n                continue\n\n            ref = self.reference_stats[feat_name]\n\n            # KS Test\n            ks_stat, ks_p = stats.ks_2samp(\n                np.random.choice(current_values, min(500, len(current_values))),\n                np.random.normal(ref[\"mean\"], ref[\"std\"], 500)\n            )\n\n            # PSI (Population Stability Index)\n            psi = self._calculate_psi(\n                ref[\"distribution\"], current_values\n            )\n\n            is_drifted = ks_p < threshold or psi > 0.2\n            drift_results[feat_name] = {\n                \"ks_statistic\": round(ks_stat, 4),\n                \"ks_p_value\": round(ks_p, 6),\n                \"psi\": round(psi, 4),\n                \"drifted\": is_drifted,\n                \"severity\": \"HIGH\" if psi > 0.25 else (\"MEDIUM\" if psi > 0.1 else \"LOW\")\n            }\n\n            if is_drifted:\n                self.alerts.append(f\"⚠️ Drift in {feat_name}: PSI={psi:.3f}\")\n\n        return drift_results\n\n    def check_performance_degradation(self, predictions: np.ndarray,\n                                       actuals: np.ndarray) -> Dict:\n        \"\"\"Monitor model performance over time.\"\"\"\n        self.prediction_buffer.extend(predictions)\n        self.actual_buffer.extend(actuals)\n\n        if len(self.actual_buffer) < 100:\n            return {\"status\": \"insufficient_data\"}\n\n        preds = np.array(self.prediction_buffer)\n        acts = np.array(self.actual_buffer)\n\n        # Current performance\n        accuracy = np.mean((preds > 0.5) == acts)\n\n        # Prediction distribution shift\n        pred_mean = np.mean(preds)\n        ref_mean = self.reference_stats.get(\"predictions\", {}).get(\"mean\", 0.5)\n        pred_drift = abs(pred_mean - ref_mean) / (ref_mean + 1e-6)\n\n        return {\n            \"current_accuracy\": round(accuracy, 4),\n            \"prediction_mean\": round(pred_mean, 4),\n            \"reference_mean\": round(ref_mean, 4),\n            \"prediction_drift_pct\": round(pred_drift * 100, 2),\n            \"alert\": pred_drift > 0.1 or accuracy < 0.7\n        }\n\n    def _calculate_psi(self, ref_histogram, current_values, bins=50):\n        \"\"\"Population Stability Index.\"\"\"\n        ref_counts, bin_edges = ref_histogram\n        curr_counts, _ = np.histogram(current_values, bins=bin_edges)\n\n        ref_pct = ref_counts / ref_counts.sum() + 1e-6\n        curr_pct = curr_counts / curr_counts.sum() + 1e-6\n\n        psi = np.sum((curr_pct - ref_pct) * np.log(curr_pct / ref_pct))\n        return psi\n\n# PSI interpretation: <0.1 = stable, 0.1-0.25 = moderate drift, >0.25 = significant\n# Monitor: data drift (features), concept drift (relationship), performance metrics\n# Automate: alert → investigate → retrain → redeploy pipeline"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Monitor three things: (1) data drift (feature distributions), (2) concept drift (target relationship changes), (3) model performance (accuracy/AUC over time). PSI >0.25 = retrain needed. KS test for continuous features. Set up automated alerting pipelines: drift detected → Slack alert → auto-retrain if below threshold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Implement feature store design (Cognizant — ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Design a feature store that serves features for both training and inference with consistency guarantees."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from typing import Dict, List, Optional, Any\nfrom dataclasses import dataclass, field\nfrom datetime import datetime\nimport hashlib\n\n@dataclass\nclass FeatureDefinition:\n    name: str\n    dtype: str\n    description: str\n    source: str\n    transformation: str = \"\"\n    freshness_sla: str = \"1h\"\n\n@dataclass\nclass FeatureGroup:\n    name: str\n    entity_key: str  # e.g., \"user_id\", \"product_id\"\n    features: List[FeatureDefinition]\n    online: bool = True  # Serve in real-time\n    offline: bool = True  # Available for training\n\nclass FeatureStore:\n    \"\"\"Simplified feature store for ML training and serving.\"\"\"\n\n    def __init__(self):\n        self.feature_groups: Dict[str, FeatureGroup] = {}\n        self.online_store: Dict[str, Dict] = {}  # Fast key-value\n        self.offline_store: List[Dict] = []  # Historical data\n        self.lineage: Dict[str, Dict] = {}\n\n    def register_feature_group(self, fg: FeatureGroup):\n        \"\"\"Register a new feature group.\"\"\"\n        self.feature_groups[fg.name] = fg\n        self.lineage[fg.name] = {\n            \"created\": datetime.now().isoformat(),\n            \"features\": [f.name for f in fg.features],\n            \"entity_key\": fg.entity_key\n        }\n\n    def ingest(self, group_name: str, entity_id: str,\n               features: Dict[str, Any], timestamp: datetime = None):\n        \"\"\"Ingest features for an entity.\"\"\"\n        ts = timestamp or datetime.now()\n        record = {\n            \"entity_id\": entity_id,\n            \"features\": features,\n            \"timestamp\": ts.isoformat(),\n            \"group\": group_name\n        }\n\n        # Online store (latest value)\n        key = f\"{group_name}:{entity_id}\"\n        self.online_store[key] = {**features, \"_ts\": ts.isoformat()}\n\n        # Offline store (append for history)\n        self.offline_store.append(record)\n\n    def get_online_features(self, group_name: str,\n                             entity_ids: List[str]) -> List[Dict]:\n        \"\"\"Get latest features for real-time inference.\"\"\"\n        results = []\n        for eid in entity_ids:\n            key = f\"{group_name}:{eid}\"\n            features = self.online_store.get(key, {})\n            results.append({\"entity_id\": eid, \"features\": features})\n        return results\n\n    def get_training_data(self, group_name: str,\n                           start_date: str = None,\n                           end_date: str = None) -> List[Dict]:\n        \"\"\"Get historical features for model training (point-in-time correct).\"\"\"\n        data = [r for r in self.offline_store if r[\"group\"] == group_name]\n        if start_date:\n            data = [r for r in data if r[\"timestamp\"] >= start_date]\n        if end_date:\n            data = [r for r in data if r[\"timestamp\"] <= end_date]\n        return data\n\n# Feature Store Architecture:\n# Offline Store: S3/HDFS → Batch features → Training pipelines\n# Online Store: Redis/DynamoDB → Real-time features → Model serving\n# Key guarantee: Same feature computation for training AND serving (no skew)\n# Tools: Feast, Tecton, Hopsworks, Databricks Feature Store"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Feature stores solve the #1 ML production problem: training-serving skew. Same transformation code runs for both batch (training) and real-time (serving). Key components: offline store (S3/HDFS), online store (Redis/DynamoDB), feature registry (metadata), and point-in-time correct joins. Major tools: Feast (open-source), Tecton (managed), Databricks Feature Store."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

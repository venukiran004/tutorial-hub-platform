/* ============================================================================
   PRACTICE P3.17 — Predict the Output / Scenarios · 17
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.17",
 "lede": "**25 scenarios** from Data Science Scenarios. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the worked answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Predict the Output / Scenarios · 17",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "401",
   "q": "Your manager wants to use AutoML (e.g., H2O, Auto-sklearn) instead of manual model building. When is this appropriate and when not?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: AutoML & Automated Pipelines**"
    },
    {
     "t": "p",
     "text": "**Answer:** Appropriate: (1) quick baseline/proof-of-concept, (2) many similar modeling tasks (e.g., forecasting 100 products), (3) limited ML expertise on team, (4) feature selection and hyperparameter search. Not appropriate: (1) highly regulated domains requiring full explainability of model selection, (2) custom loss functions or domain-specific constraints, (3) novel problem types not well-represented in AutoML search space, (4) when data preprocessing requires deep domain knowledge, (5) production deployment with strict latency requirements. Best practice: use AutoML for exploration, then refine the best approach manually."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "402",
   "q": "You run AutoML and it selects a stacked ensemble of 15 models. How do you evaluate whether this is production-ready?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Compare ensemble vs. best single model — is the improvement worth the complexity?, (2) profile inference latency: 15 models vs. 1, (3) memory footprint: can your serving infrastructure handle it?, (4) monitoring: can you debug errors when 15 models contribute?, (5) try ablation: remove models one by one, measure accuracy drop, (6) knowledge distillation: train a single model on ensemble predictions, (7) often a 2-3 model subset captures 90%+ of ensemble benefit."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "403",
   "q": "You need to build models for 500 product lines. How do you automate this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Templatize the pipeline: data extraction → preprocessing → training → evaluation → deployment, (2) use MLflow or similar for experiment tracking per product, (3) automated data quality checks before training, (4) shared feature engineering code, per-product configuration, (5) automated model selection: train 3-4 model types, pick best per product, (6) threshold-based deployment: only deploy if accuracy > X, (7) automated monitoring per model, (8) alert for models that need retraining, (9) human review for outlier models (unusually high/low performance)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "404",
   "q": "Your AutoML pipeline keeps selecting a model that overfits. How do you constrain it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Reduce max model complexity: limit tree depth, max features, network size, (2) increase regularization penalties in search space, (3) enforce more aggressive cross-validation (more folds, stratification), (4) add time-based validation split (not random) for time-series data, (5) set minimum sample requirements per leaf/split, (6) limit training time per model to prevent deep search, (7) exclude model types prone to overfitting (e.g., very deep trees), (8) add early stopping criteria, (9) increase weight on validation performance vs. training performance in selection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "405",
   "q": "How do you handle feature engineering in an automated pipeline when different features need different transformations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use sklearn ColumnTransformer:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.compose import ColumnTransformer\nfrom sklearn.pipeline import Pipeline\n\npreprocessor = ColumnTransformer([\n    ('num', Pipeline([('impute', SimpleImputer(strategy='median')),\n                      ('scale', StandardScaler())]), numeric_cols),\n    ('cat', Pipeline([('impute', SimpleImputer(strategy='most_frequent')),\n                      ('encode', OneHotEncoder(handle_unknown='ignore'))]), cat_cols),\n    ('text', TfidfVectorizer(), 'text_col'),\n    ('date', FunctionTransformer(extract_date_features), ['date_col'])\n])"
    },
    {
     "t": "p",
     "text": "This ensures train/test consistency, serializable pipeline, and reproducible transformations."
    },
    {
     "t": "p",
     "text": "**Theme: Transfer Learning & Pre-trained Models**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "406",
   "q": "You have only 500 labeled examples for an image classification task. How do you leverage transfer learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use pre-trained model (ResNet, EfficientNet) trained on ImageNet, (2) freeze all layers except the final classification head, (3) train only the head on your 500 examples, (4) if performance is insufficient: unfreeze last 2-3 layers, fine-tune with very low learning rate (1e-5), (5) data augmentation: rotation, flip, crop, color jitter to effectively multiply your dataset, (6) use stratified split to ensure all classes represented in train/val, (7) consider few-shot learning approaches if classes are very limited."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "407",
   "q": "You want to use a pre-trained NLP model (BERT) for text classification in a specialized domain (medical notes). The model wasn't trained on medical text. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Domain-adaptive pre-training: continue masked language model training on unlabeled medical text (cheapest approach), (2) then fine-tune on your labeled classification data, (3) alternatively: use existing domain-specific model like BioBERT, ClinicalBERT, (4) compare: generic BERT fine-tuned vs. domain BERT fine-tuned, (5) if very few labels: use prompt-based learning or few-shot approaches, (6) active learning: have domain experts label uncertain examples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "408",
   "q": "Your transfer learning model works great on the source domain but poorly on the target domain. How do you diagnose the gap?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Domain shift analysis: compare feature distributions between source and target, (2) t-SNE/UMAP visualization of embeddings: do they cluster differently?, (3) A-distance or proxy A-distance to quantify domain shift, (4) error analysis on target domain: what types of examples fail?, (5) gradual unfreezing: unfreeze more layers to allow adaptation, (6) domain adversarial training: force model to learn domain-invariant features, (7) self-training: use confident predictions on target as pseudo-labels."
    },
    {
     "t": "p",
     "text": "**Theme: Multi-Modal Data**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "409",
   "q": "Your dataset has both tabular features (customer demographics) and text (support tickets). How do you combine them in one model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Options: (1) **Late fusion**: train separate models on tabular and text, combine predictions (averaging, stacking), (2) **Early fusion**: extract text features (TF-IDF, embeddings) → concatenate with tabular → train single model, (3) **Intermediate fusion**: shared neural network with separate input branches that merge at a hidden layer, (4) For simple approach: extract 10-20 text features (sentiment, length, keywords) and add to tabular model, (5) For best performance: transformer for text, GBM for tabular, then stacking meta-learner."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "410",
   "q": "You have images of products along with structured metadata (price, category, brand). How do you build a model that uses both?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) CNN branch for images → feature vector, (2) Dense branch for tabular data → feature vector, (3) Concatenate both vectors → shared dense layers → output, (4) Implementation:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "image_input = Input(shape=(224, 224, 3))\nimage_features = ResNet50(weights='imagenet', include_top=False)(image_input)\nimage_features = GlobalAveragePooling2D()(image_features)\n\ntabular_input = Input(shape=(num_features,))\ntabular_features = Dense(64, activation='relu')(tabular_input)\n\nmerged = Concatenate()([image_features, tabular_features])\noutput = Dense(num_classes, activation='softmax')(merged)"
    },
    {
     "t": "p",
     "text": "(5) Train end-to-end with lower learning rate for pre-trained image branch."
    },
    {
     "t": "p",
     "text": "**Theme: Experiment Design & Causal Inference**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "411",
   "q": "Your company ran an A/B test showing a 5% conversion lift, but you suspect selection bias. How do you validate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Check randomization: compare treated/control group distributions on pre-treatment features, (2) statistical test: chi-squared on demographics between groups, (3) check for self-selection: did users opt into treatment?, (4) instrument variable approach if randomization is imperfect, (5) regression discontinuity if assignment based on a threshold, (6) propensity score matching to control for observed confounders, (7) run SRM (Sample Ratio Mismatch) test: are group sizes as expected?, (8) check for spillover effects between groups."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "412",
   "q": "You can't run a randomized experiment (ethical/practical reasons). How do you estimate causal effects from observational data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Propensity Score Matching: match treated/untreated on probability of treatment, (2) Difference-in-Differences: compare before/after between treated and control groups, (3) Regression Discontinuity: exploit a threshold in treatment assignment, (4) Instrumental Variables: find a variable that affects treatment but not outcome directly, (5) Synthetic Control: create a synthetic counterfactual from control units, (6) Doubly Robust Estimation: combine outcome modeling with propensity scoring, (7) always test sensitivity to unmeasured confounders."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "413",
   "q": "Your A/B test has been running for 2 weeks. The p-value fluctuates between 0.04 and 0.06. Should you stop or continue?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Do NOT peek and stop early based on p-value (peeking inflates false positive rate), (2) determine sample size needed BEFORE the test using power analysis, (3) if pre-calculated duration hasn't been reached, continue, (4) alternatives to fixed-horizon testing: (a) sequential testing with alpha spending (O'Brien-Fleming), (b) Bayesian approach: calculate posterior probability of lift, (c) always valid p-values, (5) practical significance: is the effect size meaningful regardless of p-value?, (6) if at boundary, run longer for confidence."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "414",
   "q": "You're designing an A/B test but the metric you care about (customer lifetime value) takes 12 months to observe. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Proxy metrics: find shorter-term metrics correlated with LTV (first-month purchases, engagement), (2) validate proxy: show historical correlation between proxy and LTV, (3) Bayesian approach: update beliefs as data accumulates, (4) predictive LTV models: predict LTV from early behavior, use predicted LTV as metric, (5) staged approach: test short-term proxy, then monitor long-term LTV for winners, (6) survival analysis: model time-to-event rather than waiting for full observation, (7) interim analysis with proper alpha adjustment."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "415",
   "q": "You're told to measure the causal impact of a marketing campaign that was rolled out to all customers simultaneously (no control group). How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Pre/post comparison with careful control for trends: interrupted time series analysis, (2) synthetic control method: use similar markets/regions that didn't get the campaign, (3) difference-in-differences if you have a natural comparison group, (4) CausalImpact (Google): Bayesian structural time series model, (5) account for seasonality with same period last year comparison, (6) holdback test: if possible, delay rollout to a small random group, (7) matched market test: compare treated vs. similar untreated markets."
    },
    {
     "t": "p",
     "text": "**Theme: Data Privacy & Compliance**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "416",
   "q": "You need to build a model using health data subject to HIPAA. What constraints affect your workflow?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) De-identification: remove 18 HIPAA identifiers (name, SSN, DOB, etc.), (2) minimum necessary principle: only access data you need, (3) BAA (Business Associate Agreement) with all data processors, (4) no data in personal laptops — use secure compute environments, (5) encryption at rest and in transit, (6) audit logging: track all data access, (7) model outputs can't reveal individual patient data, (8) privacy-preserving techniques: differential privacy, federated learning, (9) regular security assessments, (10) data retention policies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "417",
   "q": "Your model inadvertently memorizes and can reproduce training data (e.g., names, addresses). How do you prevent this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Differential privacy during training: add calibrated noise to gradients, (2) regularization: weight decay and dropout reduce memorization, (3) membership inference testing: check if model can identify training data, (4) canary testing: insert known fake records, check if model memorizes them, (5) K-anonymity/L-diversity on training data, (6) for language models: train deduplication, output filtering for PII patterns, (7) limit model capacity to prevent memorization, (8) federated learning keeps data distributed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "418",
   "q": "GDPR requires \"right to be forgotten.\" A user requests deletion. How do you handle this for your ML model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Delete user's data from databases and training datasets, (2) challenge: model has already learned from this data, (3) options: (a) retrain model without user's data (expensive for one user), (b) machine unlearning: techniques to remove a data point's influence without full retrain, (c) SISA training: train on shards, retrain only affected shard, (4) document the deletion request and actions taken, (5) update feature stores, caches, and derived datasets, (6) for production: implement automated deletion pipeline triggered by requests."
    },
    {
     "t": "p",
     "text": "**Theme: Anomaly & Outlier Detection**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "419",
   "q": "Your transaction monitoring system flags 5000 anomalies per day but only 50 are actually fraudulent (1% precision). How do you reduce false positives?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature engineering: add context features (user history, device fingerprint), (2) two-stage system: anomaly detection → classification model on flagged transactions, (3) feedback loop: analysts label alerts, retrain on labeled data, (4) increase threshold: trade recall for precision based on analyst capacity, (5) rule-based pre-filter: common benign patterns (payroll, recurring charges), (6) user-specific baselines: what's normal for this user?, (7) alert scoring: rank by severity, analysts review top-scored first, (8) adaptive thresholds based on analyst feedback."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "420",
   "q": "You need to detect anomalies in multivariate sensor data from IoT devices. What approach do you take?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Isolation Forest: efficient for high-dimensional data, (2) Autoencoder: learn normal pattern, flag high reconstruction error, (3) LSTM-based anomaly detection: capture temporal dependencies, (4) One-Class SVM: learn boundary of normal data, (5) Statistical: Mahalanobis distance for multivariate outliers, (6) Clustering: DBSCAN labels points in sparse regions as outliers, (7) for temporal data: use sliding windows of sensor readings as features, (8) ensemble of methods: flag if multiple methods agree, (9) contextual: time-of-day, machine state affect what's \"normal.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "421",
   "q": "How do you evaluate an anomaly detection model when you have very few labeled anomalies?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Precision@k: what fraction of top-k flagged items are true anomalies?, (2) If some labels exist: AUPRC (Precision-Recall curve) — better than AUC-ROC for imbalanced data, (3) Unsupervised evaluation: silhouette score, anomaly score distribution analysis, (4) Expert review: have domain experts review a sample of flagged items, (5) Contamination estimation: inject synthetic anomalies, check detection rate, (6) Time-based validation: does the model flag known historical anomalies?, (7) Compare against rule-based baseline."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced SQL & Data Manipulation**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "422",
   "q": "You need to calculate a running cumulative sum partitioned by customer, ordered by date. Write the SQL.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT\n    customer_id,\n    transaction_date,\n    amount,\n    SUM(amount) OVER (\n        PARTITION BY customer_id\n        ORDER BY transaction_date\n        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n    ) AS cumulative_amount\nFROM transactions\nORDER BY customer_id, transaction_date;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "423",
   "q": "You need to find the top 3 products by revenue for each category. Write the SQL.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "WITH ranked AS (\n    SELECT\n        category,\n        product_name,\n        SUM(revenue) AS total_revenue,\n        ROW_NUMBER() OVER (\n            PARTITION BY category\n            ORDER BY SUM(revenue) DESC\n        ) AS rank\n    FROM sales\n    GROUP BY category, product_name\n)\nSELECT category, product_name, total_revenue\nFROM ranked\nWHERE rank <= 3;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "424",
   "q": "You need to identify customers whose spending this month is more than 2 standard deviations above their historical average. Write the SQL.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "WITH customer_stats AS (\n    SELECT\n        customer_id,\n        AVG(monthly_spend) AS avg_spend,\n        STDDEV(monthly_spend) AS std_spend\n    FROM monthly_spending\n    WHERE month < '2024-01-01'  -- historical period\n    GROUP BY customer_id\n),\ncurrent_month AS (\n    SELECT customer_id, monthly_spend\n    FROM monthly_spending\n    WHERE month = '2024-01-01'\n)\nSELECT\n    c.customer_id,\n    c.monthly_spend AS current_spend,\n    s.avg_spend,\n    (c.monthly_spend - s.avg_spend) / NULLIF(s.std_spend, 0) AS z_score\nFROM current_month c\nJOIN customer_stats s ON c.customer_id = s.customer_id\nWHERE c.monthly_spend > s.avg_spend + 2 * s.std_spend;"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "425",
   "q": "You need to calculate month-over-month growth for each product. Write the SQL.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT\n    product_id,\n    month,\n    revenue,\n    LAG(revenue) OVER (PARTITION BY product_id ORDER BY month) AS prev_month_revenue,\n    ROUND(\n        (revenue - LAG(revenue) OVER (PARTITION BY product_id ORDER BY month))\n        / NULLIF(LAG(revenue) OVER (PARTITION BY product_id ORDER BY month), 0) * 100,\n        2\n    ) AS mom_growth_pct\nFROM monthly_revenue\nORDER BY product_id, month;"
    },
    {
     "t": "p",
     "text": "**Theme: Healthcare & Life Sciences**"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

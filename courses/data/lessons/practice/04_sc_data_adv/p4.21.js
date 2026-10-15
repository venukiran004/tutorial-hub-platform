/* ============================================================================
   PRACTICE P4.21 — Predict the Output / Scenarios · 21
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.21",
 "lede": "**25 scenarios** from Data Science Scenarios: Advanced. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Predict the Output / Scenarios · 21",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "501",
   "q": "Scenario: You're building a recommendation system for an e-commerce platform but cold-start users have no interaction history.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you generate recommendations for new users with zero browsing/purchase history?"
    },
    {
     "t": "p",
     "text": "**Answer:** Use content-based filtering with demographic features (age, location, device), popularity-based recommendations for initial suggestions, ask onboarding preference questions, leverage session-based recommendations from current browsing behavior, and transition to collaborative filtering once sufficient interaction data accumulates. Implement a hybrid approach that blends popularity scores with any available signals."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "502",
   "q": "Scenario: Your sentiment analysis model trained on product reviews performs poorly on social media text.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What causes this domain shift and how do you address it?"
    },
    {
     "t": "p",
     "text": "**Answer:** Social media text contains slang, abbreviations, emojis, sarcasm, and informal grammar absent from product reviews. Address by: fine-tuning on labeled social media data, adding emoji-to-sentiment mappings, handling hashtags and mentions as features, using domain adaptation techniques (e.g., pivot features), and leveraging pre-trained models like BERTweet that understand social media language patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "503",
   "q": "Scenario: You're analyzing customer churn and find that contract length is the strongest predictor but it's not actionable.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you build an actionable churn model when the top predictor isn't useful for intervention?"
    },
    {
     "t": "p",
     "text": "**Answer:** Separate predictive features into actionable (usage decline, support tickets, payment delays) and non-actionable (contract type, tenure). Build two models: one for prediction accuracy including all features, another for prescriptive insights using only actionable features. Use SHAP values on the actionable model to identify intervention points. Create uplift models to estimate treatment effect of retention offers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "504",
   "q": "Scenario: Your time series forecast for daily sales shows good MAPE overall but terrible performance on weekends.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you diagnose and fix this weekend prediction problem?"
    },
    {
     "t": "p",
     "text": "**Answer:** Segment evaluation by day-of-week reveals systematic weekend errors. Add day-of-week as explicit features, include weekend-specific lagged features (lag-7, lag-14), create separate weekend/weekday models or a hierarchical model, add holiday indicators that often coincide with weekends, and consider weekend-specific external features like weather, events, and promotions that affect weekend shopping differently."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "505",
   "q": "Scenario: You need to detect anomalous financial transactions but labeled fraud data is extremely scarce (0.01%).",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What unsupervised or semi-supervised approaches work for anomaly detection with almost no labels?"
    },
    {
     "t": "p",
     "text": "**Answer:** Use Isolation Forest or Local Outlier Factor for unsupervised detection, autoencoders trained on normal transactions (high reconstruction error = anomaly), one-class SVM trained on legitimate transactions only, and statistical methods (Z-score on transaction amounts, frequency). For semi-supervised: label the few known frauds and use PU learning (Positive-Unlabeled). Combine multiple detector scores via ensemble for robust detection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "506",
   "q": "Scenario: Your NLP pipeline processes documents in 12 languages but model quality varies significantly across languages.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you ensure consistent quality across all supported languages?"
    },
    {
     "t": "p",
     "text": "**Answer:** Use multilingual models (mBERT, XLM-R) as baseline, then fine-tune on per-language data where available. Implement language-specific evaluation benchmarks, use translation-based data augmentation for low-resource languages, apply cross-lingual transfer learning from high-resource to low-resource languages, and set minimum quality thresholds per language with fallback to English translation when quality is below threshold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "507",
   "q": "Scenario: You're building a disease prediction model from electronic health records but patients have varying numbers of visits.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you handle variable-length patient histories in your model?"
    },
    {
     "t": "p",
     "text": "**Answer:** Aggregate visit-level features into patient-level (count, mean, max, last-value, trend), use sequence models (LSTM, Transformer) that naturally handle variable lengths, create fixed-window features (last 30/90/365 days), pad shorter sequences or use masking, implement attention mechanisms to weight recent visits more heavily, and consider set-based architectures like DeepSets that are permutation-invariant for unordered visits."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "508",
   "q": "Scenario: Your A/B test shows a statistically significant 2% lift in click-through rate but no change in revenue.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What explains this discrepancy and what should you decide?"
    },
    {
     "t": "p",
     "text": "**Answer:** Higher CTR without revenue gain suggests the new variant attracts low-intent clicks (clickbait effect), users click more but don't convert, or the increase is in low-value product clicks. Analyze: conversion rate per click, average order value changes, time-to-purchase patterns, and segment the lift by user value tiers. The revenue metric (primary guardrail) should take precedence. Consider the variant may be degrading user experience despite higher engagement."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "509",
   "q": "Scenario: You're tasked with predicting employee attrition but HR data contains highly correlated features.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How does multicollinearity affect your model and what techniques handle it?"
    },
    {
     "t": "p",
     "text": "**Answer:** Multicollinearity inflates coefficient variance in linear models, making interpretation unreliable. Handle with: VIF analysis (remove features with VIF > 10), PCA to create uncorrelated components, regularization (Ridge/Elastic Net penalizes correlated features), tree-based models (naturally handle collinearity), domain-driven feature selection (keep most interpretable from correlated groups), and LASSO for automatic feature elimination."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "510",
   "q": "Scenario: Your image classification model achieves 95% accuracy on test data but users report frequent misclassifications in production.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What are the likely causes of this train-test vs production accuracy gap?"
    },
    {
     "t": "p",
     "text": "**Answer:** Common causes: test set not representative of production distribution (different lighting, angles, quality), data leakage in test set (same source images in train/test), preprocessing differences between training and serving, adversarial or edge-case inputs not in test set, and concept drift (new product types, seasonal changes). Fix by: collecting production failure cases for retraining, implementing online evaluation, creating a more representative test set from production data, and adding input validation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "511",
   "q": "Scenario: You're building a loan default prediction model and regulators require you to explain every individual decision.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you provide individual-level explanations that satisfy regulatory requirements?"
    },
    {
     "t": "p",
     "text": "**Answer:** Use SHAP values for per-prediction feature contributions, generate natural language explanations (\"Loan denied primarily due to: high debt-to-income ratio contributing 35% to risk score, short credit history contributing 25%...\"), provide counterfactual explanations (\"Loan would be approved if DTI decreased from 0.45 to 0.35\"), log all explanations for audit trail, use inherently interpretable models (logistic regression, GAMs) where possible, and ensure explanations are consistent and deterministic."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "512",
   "q": "Scenario: Your data pipeline ingests data from 15 different sources with varying schemas and update frequencies.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you build a reliable multi-source data integration pipeline?"
    },
    {
     "t": "p",
     "text": "**Answer:** Implement schema registry for tracking source schemas, data contracts between producers and consumers, validation gates at ingestion (schema conformance, completeness, freshness), CDC (Change Data Capture) for real-time sources, batch ingestion with idempotent writes for periodic sources, dead letter queues for failed records, data quality dashboards per source, and SLA monitoring for each source's update frequency. Use a medallion architecture (bronze/silver/gold) for progressive refinement."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "513",
   "q": "Scenario: You need to build a model that predicts equipment failure 48 hours in advance from IoT sensor data.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you frame this predictive maintenance problem and handle the temporal aspects?"
    },
    {
     "t": "p",
     "text": "**Answer:** Frame as: for each time window, predict if failure occurs within next 48 hours. Create rolling features from sensor data (mean, std, trend, rate-of-change over 1h, 6h, 24h windows), use remaining useful life (RUL) as continuous target for regression approach, handle class imbalance (equipment mostly healthy), implement time-series cross-validation respecting temporal order, and engineer degradation indicators. Consider survival analysis for time-to-failure modeling and LSTM/Transformer for sequence patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "514",
   "q": "Scenario: Your model performs well on average but consistently fails for a specific demographic group.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you detect and mitigate this fairness issue?"
    },
    {
     "t": "p",
     "text": "**Answer:** Compute fairness metrics per group: demographic parity (equal positive rates), equalized odds (equal TPR/FPR), and calibration (equal precision). Use AIF360 or Fairlearn libraries to assess bias. Mitigate with: pre-processing (resampling, reweighting), in-processing (fairness constraints during training), post-processing (threshold adjustment per group). Document disparities, set acceptable fairness bounds, and implement continuous fairness monitoring in production."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "515",
   "q": "Scenario: You're building a search ranking model and have implicit feedback (clicks) but no explicit relevance labels.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you create training labels from click data and what biases should you be aware of?"
    },
    {
     "t": "p",
     "text": "**Answer:** Position bias: higher-ranked items get more clicks regardless of relevance. Address with: inverse propensity weighting (IPW), position-aware click models, and randomized experiments. Presentation bias: items with better thumbnails/titles get more clicks. Create labels using: click-through rate normalized by position, dwell time (long clicks = relevant), skip-next patterns (clicked item followed by next click = unsatisfied), and pairwise preferences (clicked vs skipped at similar positions)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "516",
   "q": "Scenario: Your data science team produces many ad-hoc analyses in Jupyter notebooks but results are inconsistent.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you standardize analytical workflows for reproducibility?"
    },
    {
     "t": "p",
     "text": "**Answer:** Implement: notebook templates with standard sections (objective, data, analysis, conclusions), version-controlled notebooks with cleared outputs, parameterized notebooks (papermill) for reproducible runs, shared utility libraries for common operations, code review process for analytical notebooks, environment management (conda/Docker), data versioning (DVC), and a results registry for tracking key findings and their supporting analyses."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "517",
   "q": "Scenario: You're predicting customer lifetime value (CLV) but some customers are still active (right-censored data).",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you handle censoring when modeling CLV?"
    },
    {
     "t": "p",
     "text": "**Answer:** Use survival analysis models (Cox PH, AFT) that explicitly handle censoring, or probabilistic models like BG/NBD (Buy-till-you-die) for contractual settings and Pareto/NBD for non-contractual. For ML approaches: use specialized loss functions that account for censoring (e.g., concordance-based losses), predict CLV at fixed horizons (6-month, 1-year) where censoring is less impactful, and use Kaplan-Meier estimates to adjust naive CLV calculations for censored observations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "518",
   "q": "Scenario: Your text classification system needs to handle inputs that don't belong to any known category.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you implement open-set classification with an \"unknown\" category?"
    },
    {
     "t": "p",
     "text": "**Answer:** Don't simply add a catch-all \"other\" class (it becomes a garbage collector). Instead: use confidence thresholds (reject predictions below 0.6), train an outlier detector on feature representations, use OpenMax (replace softmax with open-set recognition layer), implement distance-based rejection (if input embedding is far from all class centroids, classify as unknown), and combine softmax entropy with feature-space density for robust detection. Route unknown inputs to human review for labeling."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "519",
   "q": "Scenario: You're analyzing website conversion funnels and find that adding a step (email verification) improved final conversion rate.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you explain this counterintuitive result where adding friction increased conversions?"
    },
    {
     "t": "p",
     "text": "**Answer:** This is a survivorship/selection bias effect. The verification step filters out low-intent users (bots, accidental visitors), so the remaining users are higher quality with stronger purchase intent. The conversion rate increases because the denominator changed (fewer but better-qualified users). Analyze absolute conversion numbers (total purchases likely decreased), cost per acquisition, and revenue impact. The metric improvement is real but may mask a net negative business outcome if total revenue dropped."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "520",
   "q": "Scenario: Your recommendation model's offline evaluation (NDCG, MAP) looks great but online A/B tests show no improvement.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What causes offline-online metric disagreement in recommendation systems?"
    },
    {
     "t": "p",
     "text": "**Answer:** Common causes: offline metrics computed on historical data reflect past user behavior not future, popularity bias in offline evaluation (popular items always score well), missing counterfactual (can't evaluate items never shown to users), user fatigue from repeated recommendations not captured offline, and presentation effects. Fix with: unbiased offline evaluation using IPS (Inverse Propensity Scoring), replay-based evaluation, and designing offline metrics that better correlate with online outcomes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "521",
   "q": "Scenario: You need to build a model that handles both numerical and categorical features with many categories (1000+ product categories).",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What encoding strategy works for high-cardinality categorical variables?"
    },
    {
     "t": "p",
     "text": "**Answer:** One-hot encoding creates too many columns. Better approaches: target encoding with regularization (smoothing toward global mean), entity embeddings learned during neural network training, frequency encoding, hash encoding (feature hashing to fixed dimensions), leave-one-out encoding to prevent target leakage, and category embeddings pre-trained on interaction data. For tree models, CatBoost handles high-cardinality natively. Consider grouping rare categories, and always validate encoding on a holdout set."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "522",
   "q": "Scenario: Your ML model's predictions are used to auto-approve insurance claims but you discover the model has learned to approve claims from wealthy zip codes.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you identify and remove this proxy discrimination?"
    },
    {
     "t": "p",
     "text": "**Answer:** Zip code is a proxy for race/income, creating indirect discrimination. Detect with: feature attribution analysis (SHAP showing zip code importance), outcome analysis by protected groups, and testing with zip code removed vs included. Mitigate: remove zip code and correlated features (property value, neighborhood stats), use fairness constraints during training, implement disparate impact testing (80% rule), replace geographic features with relevant non-discriminatory alternatives (claim type, documentation quality), and conduct regular fairness audits."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "523",
   "q": "Scenario: You're building a demand forecasting model and need to account for promotional events that haven't happened before.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you model the impact of new types of promotions with no historical data?"
    },
    {
     "t": "p",
     "text": "**Answer:** Decompose promotions into feature attributes: discount percentage, duration, channel (email/in-store/online), product category scope, and timing (holiday vs regular). Build a promotion effect model using these features rather than promotion IDs, so new promotions with similar attributes get similar predictions. Use hierarchical Bayesian models for partial pooling across promotion types, simulate scenarios based on analogous past promotions, and implement rapid feedback loops to update predictions once promotion data starts arriving."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "524",
   "q": "Scenario: Your object detection model works well in controlled lab conditions but fails in outdoor deployments.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What domain-specific challenges affect outdoor deployment and how do you address them?"
    },
    {
     "t": "p",
     "text": "**Answer:** Outdoor challenges: varying lighting (sun glare, shadows, night), weather conditions (rain, fog, snow), occlusions, motion blur, and diverse backgrounds. Address with: training data augmentation (brightness, contrast, noise, blur variations), collecting real outdoor training data across conditions, domain adaptation from lab to outdoor, using robust architectures (YOLO variants handle real-world better), implementing confidence thresholds for uncertain conditions, and split evaluation by lighting/weather conditions to identify specific failure modes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "525",
   "q": "Scenario: You need to merge customer data from CRM, web analytics, and purchase databases but there's no common unique ID.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you perform entity resolution across databases without a shared key?"
    },
    {
     "t": "p",
     "text": "**Answer:** Use probabilistic matching on: email (exact/fuzzy), phone number (normalized), name + address (fuzzy string matching with Jaro-Winkler), and device fingerprinting. Implement: blocking (reduce comparison pairs using shared attributes), scoring (weighted combination of match signals), clustering (transitively merge matched records), and manual review for uncertain matches. Use tools like Splink or dedupe library. Create a master data management (MDM) system with golden records and maintain match confidence scores."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

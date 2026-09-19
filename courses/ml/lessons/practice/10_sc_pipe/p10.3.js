/* ============================================================================
   PRACTICE P10.3 — Pipelines, Deployment and Advanced · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/10_Pipelines_Deployment_and_Advanced.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p10.3",
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
   "n": "51",
   "q": "You trained a model with 99.5% accuracy but the stakeholder rejects it. What might be wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Accuracy misleading due to class imbalance",
      "Model doesn't predict the right thing (wrong metric)",
      "Latency/cost too high for production",
      "Not interpretable enough for regulatory requirements",
      "Doesn't handle edge cases important to the business",
      "Data leakage gave inflated metrics"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Accuracy alone is insufficient. Understand stakeholder requirements: fairness, explainability, latency, cost, specific error types."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "Your model performs well in development but poorly in production. What are possible causes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Training-serving skew:** Different preprocessing in train vs serve",
      "**Data drift:** Production data distribution differs from training data",
      "**Feature mismatch:** Features computed differently or missing",
      "**Time leakage:** Used future data in training",
      "**Sampling bias:** Training data not representative of production traffic"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Debug systematically: compare feature distributions, check preprocessing code paths, log predictions vs actuals."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is Simpson's Paradox and how can it affect ML models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A trend that appears in aggregated data reverses when data is split into subgroups."
    },
    {
     "t": "p",
     "text": "**Example:** Treatment A has higher overall success rate, but Treatment B is better for EACH disease type when analyzed separately."
    },
    {
     "t": "p",
     "text": "**Explanation:** Confounding variable causes this. ML models can learn the confounded pattern. Always check model performance across meaningful subgroups."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "You notice your model's performance degrades every Monday. What's happening?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Likely a day-of-week distribution shift:"
    },
    {
     "t": "ol",
     "items": [
      "Different user behavior on Mondays (e.g., higher work-related activity)",
      "Data pipeline differences (weekend data batch processed Monday)",
      "Seasonal features not capturing weekly patterns"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Add day-of-week features. Train with sufficient weekly variation. Monitor performance by day to catch pattern."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What happens when you train a model on data with label noise?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Model learns noise patterns → lower generalization",
      "Overparameterized models (deep learning) can memorize noise easily",
      "Decision boundary becomes noisy"
     ]
    },
    {
     "t": "p",
     "text": "**Mitigation:**"
    },
    {
     "t": "ol",
     "items": [
      "Confident learning (identify noisy labels)",
      "Label smoothing",
      "Robust loss functions (symmetric cross-entropy)",
      "cleanlab library for label noise detection"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Even 5-10% label noise can significantly degrade model performance. Clean data > more data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "How do you handle a scenario where the test set follows a different distribution than training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Domain adaptation techniques:"
    },
    {
     "t": "ol",
     "items": [
      "**Covariate shift correction:** Importance weighting (weight training samples by P_test(x)/P_train(x))",
      "**Domain adversarial training:** Learn domain-invariant features",
      "**Transfer learning:** Fine-tune on target domain data",
      "**Feature alignment:** Match feature distributions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Distribution shift is common (developed country data → developing country deployment). Evaluate on target distribution whenever possible."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is the trade-off between model complexity and interpretability?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Interpretability ←→ Performance\nHigh: Linear Regression, Decision Trees, Rule-based\nMedium: Random Forest (with importance), GAMs, EBMs\nLow: Deep Learning, XGBoost (to some extent), Neural networks"
    },
    {
     "t": "p",
     "text": "**Explanation:** Explainable Boosting Machines (EBMs) and GAMs offer competitive performance with high interpretability. SHAP/LIME can explain any model post-hoc. Regulation may require interpretable models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "Your Random Forest and XGBoost have identical test performance. Which do you deploy?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Consider:"
    },
    {
     "t": "ol",
     "items": [
      "**Inference speed:** RF is parallelizable (independent trees); XGBoost sequential",
      "**Training speed:** RF faster to train typically",
      "**Interpretability:** Both have feature importance; RF slightly simpler",
      "**Maintenance:** XGBoost has more hyperparameters",
      "**Edge cases:** XGBoost may be more robust to missing values"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** If performance is equal, choose the simpler one (Occam's razor). RF is typically simpler to maintain."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is Goodhart's Law and how does it apply to ML metrics?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \"When a measure becomes a target, it ceases to be a good measure.\""
    },
    {
     "t": "p",
     "text": "**ML example:** Optimizing for click-through rate → model shows clickbait. Optimizing for engagement → model shows outrage."
    },
    {
     "t": "p",
     "text": "**Explanation:** Metric hacking: model finds shortcuts to optimize metric without actual improvement. Use multiple metrics, include guardrail metrics, align with business objectives not proxy metrics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is the difference between causation and correlation in ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Correlation:** Two variables move together (observed in data)",
      "**Causation:** One variable directly affects another (requires experimentation or causal inference)"
     ]
    },
    {
     "t": "p",
     "text": "**Example:** Ice cream sales and drowning deaths correlate (both increase in summer). ML might use ice cream to predict drowning — but it's not causal."
    },
    {
     "t": "p",
     "text": "**Explanation:** ML models learn correlations. For causal claims: A/B testing, instrumental variables, difference-in-differences, causal graphs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "How do you handle concept drift in a production classification model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Detection:** Monitor prediction distribution, performance metrics, feature distributions",
      "**Adaptation:**",
      "— Retrain on recent data (sliding window)",
      "— Online learning (continuous updates)",
      "— Ensemble of models from different time periods",
      "**Alert:** Trigger when drift exceeds threshold"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** COVID-19 is a dramatic example — consumer behavior shifted overnight, invalidating models trained on pre-COVID data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What are spurious correlations and how do they affect models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Coincidental statistical relationships that don't hold causally or in new data."
    },
    {
     "t": "p",
     "text": "**Examples:**"
    },
    {
     "t": "ul",
     "items": [
      "Model learns background (grass) predicts \"cow\" instead of cow features",
      "Watermark on X-ray correlates with hospital quality, not diagnosis"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Models exploit shortcuts. Mitigation: data augmentation, adversarial training, domain knowledge for feature selection, diverse training data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is the Matthew Effect in ML systems?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Rich-get-richer feedback loop: popular items get recommended more → get more interactions → become even more popular."
    },
    {
     "t": "p",
     "text": "**Explanation:** Creates unfair amplification of existing biases. New items/creators disadvantaged. Solutions: exploration mechanisms, diversity constraints, fair ranking algorithms."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "When would you choose a simple model over a complex one?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Small dataset (complex model overfits)",
      "Interpretability required (regulatory, debugging)",
      "Latency constraints (simple → faster)",
      "Limited computational resources",
      "When simple model performance is within 1-2% of complex model",
      "Rapid development and deployment needed"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Start simple, add complexity when justified. Linear regression + good features often beats poorly tuned neural networks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is leakage through external data sources?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When external data inadvertently contains information about the target."
    },
    {
     "t": "p",
     "text": "**Example:** Using a customer churn prediction feature that includes \"cancel_reason\" — this is filled AFTER the churn event."
    },
    {
     "t": "p",
     "text": "**Explanation:** Time-based leakage: feature is only available after the event you're predicting. Always ask: \"Would this feature be available at prediction time in production?\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "How do you handle a model that works well overall but fails on important subgroups?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Slice-based evaluation to identify weak subgroups",
      "Oversample or weight underperforming subgroups",
      "Separate models for different subgroups",
      "Additional features that help distinguish subgroup patterns",
      "Fairness constraints in optimization"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** A medical model working well on average but failing for elderly patients is dangerous. Subgroup performance must meet minimum thresholds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is the curse of dimensionality in practice?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Real-world effects:"
    },
    {
     "t": "ol",
     "items": [
      "Distance metrics become meaningless (all points equidistant)",
      "Data becomes increasingly sparse (need exponentially more data)",
      "Models overfit more easily",
      "Feature selection becomes critical"
     ]
    },
    {
     "t": "p",
     "text": "**Rule of thumb:** Need 5-10× more samples per dimension for reliable learning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is multi-modal learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Training models on multiple data types simultaneously: text + images, audio + video, tabular + text."
    },
    {
     "t": "p",
     "text": "**Examples:** CLIP (image + text), visual question answering, multimodal sentiment analysis."
    },
    {
     "t": "p",
     "text": "**Explanation:** Different modalities provide complementary information. Fusion strategies: early fusion (combine inputs), late fusion (combine predictions), cross-attention."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "How do you handle class overlap in classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When classes share the same feature space region:"
    },
    {
     "t": "ol",
     "items": [
      "Better features that separate classes",
      "Cost-sensitive learning (emphasize misclassification costs)",
      "Probabilistic outputs instead of hard decisions",
      "Reject option (don't classify ambiguous instances)",
      "Non-linear models that find complex boundaries"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Perfect accuracy impossible with overlap. Focus on calibrated probabilities and business-appropriate thresholds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is the sample selection bias?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Training data is not representative of the deployment population."
    },
    {
     "t": "p",
     "text": "**Examples:**"
    },
    {
     "t": "ol",
     "items": [
      "Survival bias: only studying successful companies",
      "Self-selection: only surveying volunteers",
      "Historical bias: past decisions encoded in data"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Model trained on biased sample → biased predictions in production. Collect representative data. Use importance weighting when bias is known."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is the difference between model bias and data bias?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Model bias:** Assumptions model makes that may not fit data (linear model on non-linear data)",
      "**Data bias:** Systematic errors in data collection, labeling, or representation"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Model bias: underfitting, wrong model family. Data bias: reflects historical discrimination or sampling issues. Both need addressing but with different techniques."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "How do you handle adversarial examples?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Inputs crafted to fool ML models with imperceptible perturbations:"
    },
    {
     "t": "p",
     "text": "**Defense:**"
    },
    {
     "t": "ol",
     "items": [
      "Adversarial training (train on adversarial examples)",
      "Input preprocessing (smoothing, compression)",
      "Ensemble methods (harder to fool multiple models)",
      "Certified robustness (provable bounds)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Small pixel changes can flip image classification. Critical for security-sensitive applications (autonomous driving, malware detection)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is meta-learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \"Learning to learn\" — algorithms that improve with experience across different tasks."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**MAML:** Learn initialization that adapts quickly to new tasks",
      "**Prototypical Networks:** Learn metric space for few-shot classification",
      "**Hyperparameter transfer:** Learn optimal hyperparameters across tasks"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Useful for few-shot learning, AutoML, personalization. Train on many tasks, generalize to new tasks with few examples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is the bootstrap method in ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Resampling with replacement to estimate statistics (confidence intervals, standard errors)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "n_bootstrap = 1000\nscores = []\nfor _ in range(n_bootstrap):\n    indices = np.random.choice(len(y_test), len(y_test), replace=True)\n    score = metric(y_test[indices], y_pred[indices])\n    scores.append(score)\nci = np.percentile(scores, [2.5, 97.5])"
    },
    {
     "t": "p",
     "text": "**Explanation:** Distribution-free uncertainty estimation. Used for: confidence intervals on metrics, model comparison, feature importance stability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is the difference between out-of-distribution detection and anomaly detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**OOD detection:** Identifying inputs that come from a different distribution than training data",
      "**Anomaly detection:** Finding unusual patterns within the expected distribution"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** OOD: \"This input is nothing like what the model was trained on\" (e.g., cat image to a car classifier). Anomaly: \"This is unusual within normal operation\" (e.g., unusually large transaction)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

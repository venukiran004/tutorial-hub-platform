/* ============================================================================
   PRACTICE P4.22 — Predict the Output / Scenarios · 22
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p4.22",
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
   "text": "Predict the Output / Scenarios · 22",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "526",
   "q": "Scenario: Your model training takes 12 hours and you need to iterate faster on feature engineering.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What strategies speed up the experimentation cycle without sacrificing model quality?"
    },
    {
     "t": "p",
     "text": "**Answer:** Use data sampling (train on 10-20% for feature experiments, full data for final model), implement feature caching (pre-compute expensive features once), use proxy models (fast linear model to validate features before training complex model), progressive training (start with simple model, add complexity), parallel feature computation, incremental training where possible, use lighter model variants for experimentation (fewer trees, smaller network), and implement automated feature evaluation pipelines."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "527",
   "q": "Scenario: You're building a credit scoring model and find that including social media features improves accuracy but raises ethical concerns.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you balance model performance with ethical data usage considerations?"
    },
    {
     "t": "p",
     "text": "**Answer:** Apply the ethical framework: is the data collected with informed consent? Does it create proxy discrimination? Is it legal in your jurisdiction (GDPR, ECOA)? Would customers find it objectionable? Conduct: disparate impact analysis, consent audit, regulatory review, and public perception assessment. Often the marginal accuracy gain (1-2%) doesn't justify the ethical/reputational/legal risk. Document the decision process, consider alternative features that achieve similar performance without ethical concerns, and involve ethics committees."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "528",
   "q": "Scenario: Your streaming ML system processes events in real-time but occasionally receives out-of-order events.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you handle late-arriving and out-of-order events in a streaming ML pipeline?"
    },
    {
     "t": "p",
     "text": "**Answer:** Implement watermarking (define acceptable lateness window, e.g., 5 minutes), use event-time processing instead of processing-time, implement windowing with allowed lateness, buffer events for reordering within a tolerance window, design features that are robust to ordering (aggregations over time windows rather than sequential features), implement late-data sidecar that updates previously computed features, and use append-only feature stores that handle late arrivals."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "529",
   "q": "Scenario: Your model uses 200 features but stakeholders want to understand the model with fewer features for transparency.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you reduce features while maintaining model performance and improving interpretability?"
    },
    {
     "t": "p",
     "text": "**Answer:** Apply multi-stage reduction: first remove zero/near-zero variance features, then remove highly correlated features (keep most interpretable from each group), use LASSO for regularization-based selection, rank by mutual information or SHAP importance. Build models at 10, 20, 50, 100, 200 features and plot performance vs feature count — often 20-30 features capture 95% of performance. Present the feature count vs accuracy tradeoff to stakeholders and let business context guide the final count."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "530",
   "q": "Scenario: You're building a document similarity system and need to handle documents of vastly different lengths (100 to 50,000 words).",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you compute meaningful similarity between documents of different lengths?"
    },
    {
     "t": "p",
     "text": "**Answer:** Length-invariant approaches: TF-IDF with cosine similarity (inherently normalized), document embeddings from models that handle long text (Longformer, hierarchical attention), chunking long documents and using max/mean pooling of chunk embeddings, topic modeling (LDA) for distributional similarity, and key-phrase extraction followed by key-phrase set similarity. For very long documents: summarize first then compare summaries, or use hierarchical representations (paragraph → section → document embeddings)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "531",
   "q": "Scenario: Your ML service needs to handle traffic spikes of 10x during flash sales but keep costs low during normal periods.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you design auto-scaling that handles extreme traffic bursts while being cost-effective?"
    },
    {
     "t": "p",
     "text": "**Answer:** Implement: predictive scaling (pre-scale before known events like flash sales), reactive HPA with aggressive scale-up and conservative scale-down, use Knative or KEDA for event-driven scaling, warm pools (keep minimum instances warm for instant response), request queuing during spike overflow, feature caching to reduce per-request compute, pre-computed batch predictions for catalog items, and CDN caching for repeated prediction requests. Set cost budgets with maximum replica limits."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "532",
   "q": "Scenario: You're analyzing clinical trial data with small sample sizes (N=50) and many measured outcomes.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you draw valid conclusions from small-sample, high-dimensional clinical data?"
    },
    {
     "t": "p",
     "text": "**Answer:** Apply multiple testing correction (Bonferroni, Benjamini-Hochberg FDR), use Bayesian methods that work better with small samples (informative priors from literature), report effect sizes with confidence intervals rather than just p-values, pre-register primary outcomes to avoid p-hacking, use non-parametric tests (fewer distributional assumptions), consider exact tests (Fisher's exact, permutation tests), pool similar outcomes into composite endpoints, and use hierarchical models to borrow strength across related outcomes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "533",
   "q": "Scenario: Your NER model extracts entity mentions but doesn't link them to a knowledge base (e.g., \"Apple\" → company or fruit).",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you implement entity linking/disambiguation for extracted entities?"
    },
    {
     "t": "p",
     "text": "**Answer:** Build an entity linking pipeline: candidate generation (retrieve possible KB entries using string matching, aliases, and popularity), context encoding (encode surrounding text with BERT), candidate scoring (compute similarity between context embedding and entity description embedding), and disambiguation (select highest-scoring candidate above threshold). Use features: prior probability (how often \"Apple\" means the company), context similarity, entity type consistency, and coreference (if \"Apple\" was disambiguated earlier in the document, use that for subsequent mentions)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "534",
   "q": "Scenario: You've deployed a real-time fraud detection model but it blocks too many legitimate transactions (high false positive rate).",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you reduce false positives without significantly increasing missed fraud?"
    },
    {
     "t": "p",
     "text": "**Answer:** Adjust decision threshold using precision-recall curve analysis, implement multi-tier scoring (auto-approve < 0.3, review 0.3-0.7, auto-block > 0.7), add rule-based whitelisting for known good patterns, use customer-specific baselines (unusual for THIS customer, not unusual in general), implement velocity checks as secondary signal, add real-time customer verification for medium-risk transactions, use feedback from manual reviews to retrain model, and analyze false positive patterns to create specific exclusion rules."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "535",
   "q": "Scenario: Your data lake has grown to petabytes and data scientists can't find the datasets they need.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you implement data discovery and governance for a large data lake?"
    },
    {
     "t": "p",
     "text": "**Answer:** Implement data catalog (Apache Atlas, Amundsen, DataHub) with automatic metadata extraction, schema discovery, lineage tracking, and usage statistics. Add data stewards who maintain business descriptions and quality tags, implement search with column-level lineage, tag datasets with classification labels (PII, confidential, public), track data freshness and quality scores, create domain-specific data marts, and implement access controls based on data classification. Make the catalog the entry point for all data access."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "536",
   "q": "Scenario: You're building a pricing optimization model but need to account for competitor pricing that you can only observe with a delay.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you model competitive dynamics with incomplete and delayed competitor data?"
    },
    {
     "t": "p",
     "text": "**Answer:** Use web scraping for daily competitor price collection, impute missing competitor prices using their historical patterns (time series forecasting of competitor prices), model price elasticity as a function of relative pricing (your price / competitor price ratio), use game theory concepts for equilibrium pricing, implement lagged competitor features (their pricing from 1-7 days ago), and build scenarios (competitor price up 5%, down 5%, unchanged) for decision support. Account for asymmetric information by using confidence intervals on competitor price estimates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "537",
   "q": "Scenario: Your model needs to make predictions under strict latency constraints (< 10ms) but the feature computation itself takes 50ms.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you achieve sub-10ms prediction when feature engineering is the bottleneck?"
    },
    {
     "t": "p",
     "text": "**Answer:** Pre-compute features: use a feature store (Feast, Tecton) to pre-materialize features, compute features in batch and cache in Redis/Memcached for online lookup, use change-data-capture to keep feature cache updated. For features that must be real-time: simplify computation (approximate algorithms), compute in parallel, use compiled code (Cython, C++ extensions), and move feature computation to the edge. Design the feature set with latency budget in mind — sometimes simpler features with sub-ms lookup beat complex features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "538",
   "q": "Scenario: You're training a language model for a specialized domain (legal, medical) and general-purpose models perform poorly.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What's the most efficient approach to building a domain-specific language model?"
    },
    {
     "t": "p",
     "text": "**Answer:** Start with a pre-trained model (BERT, GPT) and apply domain-adaptive pre-training (continued pre-training on domain corpus). Then fine-tune on downstream tasks. This is more efficient than training from scratch. Steps: collect domain corpus (legal documents, medical literature), continue pre-training with MLM/CLM objective on domain text, then fine-tune on specific tasks (classification, NER, QA). Examples: BioBERT (biomedical), LegalBERT (legal), ClinicalBERT (clinical notes). Consider vocabulary extension for domain-specific terminology."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "539",
   "q": "Scenario: Your classification model output probabilities are poorly calibrated — it says 90% confidence but is only correct 60% of the time.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you diagnose and fix model calibration issues?"
    },
    {
     "t": "p",
     "text": "**Answer:** Diagnose with reliability diagrams (plot predicted probability vs actual frequency) and ECE (Expected Calibration Error). Common issue: neural networks and boosted trees are often overconfident. Fix with post-hoc calibration: Platt scaling (logistic regression on validation probabilities), isotonic regression (non-parametric calibration curve), temperature scaling (divide logits by temperature T before softmax). Always calibrate on a held-out calibration set, not the training set. Evaluate calibration per class for multi-class problems."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "540",
   "q": "Scenario: Your team needs to choose between building a custom ML solution vs using an AutoML platform.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What factors determine when custom ML is worth the investment vs AutoML?"
    },
    {
     "t": "p",
     "text": "**Answer:** Use AutoML when: standard tabular classification/regression, time-to-market is critical, limited ML expertise available, problem is well-defined with clean data, and baseline performance is sufficient. Build custom when: domain-specific architecture needed (custom loss functions, special layers), data requires significant preprocessing/domain knowledge, production constraints (latency, model size) need optimization, interpretability requirements are specific, problem is novel (few-shot, multi-modal, reinforcement learning), or competitive advantage depends on ML quality. Often start with AutoML as baseline, then invest in custom only where it significantly outperforms."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "541",
   "q": "Scenario: Your geospatial analysis model predicts property values but standard features don't capture neighborhood effects.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you engineer spatial features that capture neighborhood and proximity effects?"
    },
    {
     "t": "p",
     "text": "**Answer:** Create spatial features: distance to nearest POIs (schools, transit, parks), count of amenities within radius bands (500m, 1km, 2km), spatial lag of target variable (average price of K nearest properties), inverse distance weighted averages of neighbor features, walk score and transit score, clustering-based neighborhood segments, spatial autocorrelation indicators (Moran's I), and geospatial embeddings (hex2vec, location2vec). Use spatial cross-validation (spatial blocks) to avoid data leakage from spatial autocorrelation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "542",
   "q": "Scenario: You're deploying a model in a regulated industry that requires model validation by an independent team.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you prepare for independent model validation and what documentation is required?"
    },
    {
     "t": "p",
     "text": "**Answer:** Prepare: model development documentation (MDD) covering methodology, data, assumptions, limitations; validation data sets separate from development; model performance reports across segments; stability analysis (PSI on scores over time); sensitivity analysis (how predictions change with input perturbations); stress testing (extreme scenarios); champion-challenger analysis; regulatory compliance mapping; fairness assessment; and implementation verification (match between development and production environments). Provide all code, data lineage, and decision rationale in an auditable format."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "543",
   "q": "Scenario: Your recommendation system creates a filter bubble where users only see content similar to what they've already consumed.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you balance relevance with diversity and serendipity in recommendations?"
    },
    {
     "t": "p",
     "text": "**Answer:** Implement: diversity-aware re-ranking (MMR — Maximal Marginal Relevance), inject exploration items (epsilon-greedy: 10% random diverse items), track and optimize for diversity metrics alongside relevance, use multi-objective optimization (relevance + diversity + novelty), implement category/topic coverage constraints, expose users to content from adjacent interest clusters, Thompson sampling for exploration-exploitation balance, and periodically reset user profiles to prevent extreme narrowing. Monitor long-term engagement metrics to verify diversity improves retention."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "544",
   "q": "Scenario: Your data contains a natural hierarchy (products → categories → departments) that flat models don't capture.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you leverage hierarchical structure in your features and model?"
    },
    {
     "t": "p",
     "text": "**Answer:** Hierarchical approaches: hierarchical classification (predict department → category → product), encode hierarchy as features (parent category, depth level, sibling count), hierarchical regularization (share parameters across related categories), entity embeddings that respect hierarchy (tree-structured embeddings), hierarchical Bayesian models for partial pooling, and aggregate features at each hierarchy level. For sparse leaf-level items, borrow strength from parent category statistics. Consider hierarchical loss functions that penalize errors differently based on hierarchy distance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "545",
   "q": "Scenario: Your model monitoring shows that feature importance has shifted significantly since deployment, but overall accuracy hasn't changed.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Should you retrain the model even though accuracy is stable, and what does the importance shift mean?"
    },
    {
     "t": "p",
     "text": "**Answer:** Investigate before deciding. Importance shift without accuracy change may indicate: compensating features (one feature degraded but another compensated), input distribution shift that hasn't yet affected predictions, or a data pipeline issue changing one feature while others maintain predictions. Risks of ignoring: the model is now fragile (fewer effective features), the compensation may be temporary, and sudden failure could occur. Action: investigate root cause of importance shift, validate feature pipelines, run canary test with retrained model, and set up alerts for continued importance drift."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "546",
   "q": "Scenario: You're building a model to predict which patients will miss their appointments.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you design features and handle the ethical considerations of no-show prediction?"
    },
    {
     "t": "p",
     "text": "**Answer:** Features: historical no-show rate per patient, appointment lead time, day/time of appointment, distance to clinic, weather forecast, previous cancellation patterns, appointment type, and reminder acknowledgment. Ethical considerations: don't penalize patients for predicted no-shows (don't deny appointments), use predictions for positive interventions (extra reminders, transportation assistance), ensure model doesn't discriminate by demographics, avoid creating a self-fulfilling prophecy (overbooking based on predictions may worsen access), and be transparent about how predictions are used."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "547",
   "q": "Scenario: Your deep learning model trains successfully on a single GPU but you need to scale to multi-GPU for larger datasets.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What distributed training strategies exist and how do you choose between them?"
    },
    {
     "t": "p",
     "text": "**Answer:** Data parallelism: replicate model on each GPU, split data across GPUs, synchronize gradients (most common, works when model fits on one GPU). Model parallelism: split model layers across GPUs (needed when model doesn't fit on one GPU). Pipeline parallelism: split model into stages across GPUs with micro-batching. Hybrid: combine data and model parallelism. Use: PyTorch DDP (DistributedDataParallel) for data parallelism, DeepSpeed/FSDP for large models, gradient accumulation to simulate larger batches. Key consideration: communication overhead — use NCCL for GPU-to-GPU, minimize synchronization frequency."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "548",
   "q": "Scenario: You need to explain to a non-technical board why the company should invest in MLOps infrastructure.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you make the business case for MLOps to non-technical executives?"
    },
    {
     "t": "p",
     "text": "**Answer:** Frame in business terms: \"Currently each model takes 3 months from prototype to production; MLOps reduces this to 2 weeks\" (time-to-value). Quantify: number of models stuck in development, revenue from faster deployment, cost of model failures without monitoring, engineer time spent on manual deployment. Use analogies: \"MLOps is to ML what DevOps is to software — it's the factory that turns prototypes into reliable products.\" Show competitor benchmarks, risk reduction from automated monitoring, and calculate ROI based on accelerated model deployment and reduced incidents."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "549",
   "q": "Scenario: Your NLP model needs to process documents with mixed content — text, tables, and charts.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** How do you build a multimodal document understanding pipeline?"
    },
    {
     "t": "p",
     "text": "**Answer:** Use a multi-stage pipeline: document layout analysis (detect text regions, tables, figures using object detection), OCR for text extraction, table structure recognition (row/column detection) with outputs parsed into structured data, chart/figure analysis (classify chart type, extract data points), and combine all modalities into a unified representation. Models: LayoutLM/LayoutLMv3 for layout-aware text understanding, DETR/Faster R-CNN for element detection, TaPas for table QA. Represent the full document as a structured object with linked text, table, and figure content."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "550",
   "q": "Scenario: You're reflecting on lessons learned from deploying 20+ ML models in production over the past year.",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What are the most important principles for successful production ML that you'd share with a new data science team?"
    },
    {
     "t": "p",
     "text": "**Answer:** Top principles: (1) Start simple — a baseline model in production beats a perfect model in a notebook. (2) Data quality > model complexity — invest in data pipelines before model architecture. (3) Monitor everything — models degrade silently. (4) Automate retraining — manual processes don't scale. (5) Build for rollback — every deployment needs an undo button. (6) Measure business impact, not just model metrics. (7) Feature stores save time across projects. (8) Documentation is not optional — future you will thank present you. (9) Test your ML code like software — unit tests, integration tests, data tests. (10) Collaborate with stakeholders throughout — not just at kickoff and delivery."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

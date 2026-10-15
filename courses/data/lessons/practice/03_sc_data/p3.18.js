/* ============================================================================
   PRACTICE P3.18 — Predict the Output / Scenarios · 18
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.18",
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
   "text": "Predict the Output / Scenarios · 18",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "426",
   "q": "You're building a clinical trial outcome prediction model. What unique challenges do you face?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Small sample sizes (100-1000 patients), (2) high-dimensional data (thousands of biomarkers), (3) missing data from patient dropout, (4) regulatory requirements: FDA wants validation, reproducibility, (5) censored outcomes (patients leave trial before event), (6) multiple endpoints: primary, secondary, safety, (7) site effects: different hospitals have different practices, (8) covariate shift between trial population and real-world patients, (9) ethical constraints: can't withhold treatment from control group in some cases."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "427",
   "q": "You're using electronic health records (EHR) to predict patient deterioration. How do you handle irregular time intervals between measurements?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Forward-fill: carry last observation forward (with decay), (2) discretize into regular intervals: aggregate within bins, (3) time-since-last-measurement as a feature, (4) GRU-D: neural network designed for irregular time series with decay, (5) Gaussian processes: naturally handle irregular sampling, (6) attention-based models: learn to weight observations by their timing, (7) imputation with contextual awareness: vitals decay differently (heart rate normalizes quickly, lab values persist longer), (8) medical domain knowledge: some missing values are informative (lab not ordered = not clinically indicated)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "428",
   "q": "Your medical imaging model (chest X-ray) has high accuracy in your hospital but fails at another hospital. Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Different X-ray machines produce different image characteristics, (2) different patient populations (demographics, disease prevalence), (3) label bias: different radiologists have different diagnostic thresholds, (4) positioning differences: protocols vary between hospitals, (5) image preprocessing differences: contrast, resolution, cropping. Solutions: (1) train on multi-site data, (2) domain adaptation techniques, (3) standardize preprocessing, (4) fine-tune on target site data, (5) evaluate site-by-site during development."
    },
    {
     "t": "p",
     "text": "**Theme: Financial Data Science**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "429",
   "q": "You're building a stock price prediction model. A colleague claims 95% accuracy. Why should you be skeptical?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Stock prices are highly autocorrelated — predicting \"same direction as yesterday\" achieves >50%, (2) predicting the direction (up/down) using close-to-close: market goes up ~53% of days, so always predicting \"up\" gets ~53%, (3) accuracy doesn't capture magnitude of errors, (4) backtest bias: fitting to known data inflates performance, (5) look-ahead bias: using information not available at prediction time, (6) survivorship bias: only including stocks that still exist, (7) transaction costs, slippage, and market impact make profitable trading much harder than raw accuracy suggests."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "430",
   "q": "You need to detect money laundering patterns in transaction data. What makes this harder than typical fraud detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Extremely rare events: <<0.01% of transactions, (2) sophisticated actors who adapt to detection methods, (3) multi-step patterns: split large amounts (\"structuring\") across multiple transactions, (4) networks: money flows through multiple accounts, (5) evolving typologies: new laundering methods emerge constantly, (6) false positive costs: blocking legitimate business has consequences, (7) regulatory requirements: SAR filing has legal implications, (8) need graph/network features, not just individual transaction features, (9) temporal patterns: layering occurs over days/weeks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "431",
   "q": "Your credit scoring model needs to comply with fair lending laws. How do you test for bias?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Disparate impact analysis: approval rates across protected groups (80% rule), (2) statistical parity: P(approved|group A) ≈ P(approved|group B), (3) equalized odds: same TPR and FPR across groups, (4) predictive parity: same precision across groups, (5) check proxy variables: zip code may proxy for race, (6) log-linear analysis to measure impact of each feature by group, (7) counterfactual fairness: would prediction change if protected attribute differed?, (8) regular fairness audits with quantitative reports, (9) document mitigation strategies for identified biases."
    },
    {
     "t": "p",
     "text": "**Theme: Retail & Marketing Analytics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "432",
   "q": "Your marketing team wants to identify which customers will churn in the next 30 days. How do you frame and solve this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Define churn: no purchase/activity in next 30 days, (2) Label creation: use historical data — was each customer inactive in the following 30 days?, (3) Features: RFM (recency, frequency, monetary), engagement metrics, complaint history, (4) Handle class imbalance if churn is rare, (5) Model: GBM or logistic regression with interpretable features, (6) Output: churn probability for each customer, (7) Actionability: rank by probability × customer value, (8) segment by churn reason for targeted interventions, (9) evaluate with precision@k (can marketing team contact top-k?)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "433",
   "q": "You need to build a market basket analysis to identify product associations. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Association rules: Apriori algorithm — find {A, B} → {C} patterns, (2) metrics: support (frequency), confidence (P(C|A,B)), lift (above random), (3) filter: minimum support threshold (avoid rare patterns), minimum confidence, (4) FP-Growth for efficient computation on large datasets, (5) collaborative filtering: customers who bought A also bought B, (6) visualize: heatmap of product co-occurrence matrix, (7) business use: product placement, cross-selling recommendations, bundle pricing, (8) consider sequential patterns: what do customers buy next?."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "434",
   "q": "Your demand forecasting model for retail needs to account for promotions, holidays, and weather. How do you incorporate these external factors?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Binary/categorical features for promotions (type, discount %, channel), (2) holiday indicators: day before, day of, day after (demand shifts), (3) holiday type features: payday, religious, national, (4) weather: temperature, precipitation, severe weather warnings, (5) competitor actions if available, (6) use regression with ARIMA errors (ARIMAX), or (7) Prophet with holiday regressors, or (8) LightGBM with all features including temporal, (9) caution with promotions: separate promotion lift from base demand, (10) weather × product interaction: ice cream demand × temperature."
    },
    {
     "t": "p",
     "text": "**Theme: Natural Language Processing Scenarios**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "435",
   "q": "You have 50K customer reviews and need to extract actionable insights without labeled data. How do you approach this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Topic modeling (LDA, BERTopic): discover themes automatically, (2) sentiment analysis using pre-trained models (VADER, transformers), (3) aspect-based sentiment: what topics are positive/negative?, (4) keyword extraction (TF-IDF, RAKE, KeyBERT), (5) named entity recognition: extract product names, features mentioned, (6) clustering embeddings: group similar reviews, label clusters, (7) trend analysis: how topics/sentiment change over time, (8) summarization: representative review per topic, (9) word clouds for quick visualization, (10) actionable deliverable: \"top 5 complaints with example reviews and trends.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "436",
   "q": "You need to classify support tickets into 50 categories with only 20 labeled examples per category. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Pre-trained model fine-tuning: BERT/RoBERTa fine-tuned on 1000 total examples, (2) SetFit: few-shot text classification framework, (3) prompt-based classification with LLM: \"classify this ticket: ...\", (4) data augmentation: back-translation, synonym replacement on labeled examples, (5) semi-supervised: use confident predictions to expand training data, (6) active learning: human labels uncertain examples iteratively, (7) zero-shot classification as baseline: use class names as labels with zero-shot models, (8) evaluate with macro F1 to ensure coverage across all 50 categories."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "437",
   "q": "Your text classifier works in English but needs to support 10 languages. How do you scale?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Multilingual model: XLM-RoBERTa, mBERT — train once, works across languages, (2) zero-shot cross-lingual transfer: train on English, evaluate on other languages, (3) translate-train: machine translate labeled English data to target languages, train per-language models, (4) translate-test: translate test inputs to English, use English model, (5) compare approaches: multilingual models often competitive with translate-train, (6) language-specific evaluation: some languages have different performance, (7) consider language families: transfer works better between similar languages."
    },
    {
     "t": "p",
     "text": "**Theme: Cloud & Distributed Computing**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "438",
   "q": "Your dataset doesn't fit in memory on a single machine (200GB). How do you process it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Chunk processing in pandas: `pd.read_csv(file, chunksize=100000)`, (2) Dask: pandas-like API with lazy evaluation and distributed computation, (3) PySpark: distributed processing across cluster, (4) Polars: out-of-core processing with streaming, (5) use database for heavy aggregations: push computation to SQL, (6) sample: does your analysis need all 200GB or is a representative sample sufficient?, (7) data format: switch CSV to Parquet (column-oriented, compressed), (8) cloud solutions: BigQuery, Redshift for serverless SQL."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "439",
   "q": "You need to train a model on data distributed across 5 hospitals that can't share raw data due to privacy. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Federated learning: (1) each hospital trains locally on their data, (2) only model updates (gradients/weights) are shared with central server, (3) server aggregates updates (FedAvg algorithm), (4) updated global model sent back to hospitals, (5) repeat for multiple rounds. Considerations: (6) non-IID data across hospitals (different patient populations), (7) secure aggregation: encrypt updates so server can't see individual hospitals, (8) differential privacy: add noise to gradients for additional protection, (9) communication efficiency: compress model updates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "440",
   "q": "Your Spark job takes 4 hours. How do you optimize it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Partition optimization: repartition to avoid skew and small files, (2) caching: `df.cache()` for DataFrames used multiple times, (3) broadcast join: for small tables joined with large ones:`broadcast(small_df)`, (4) avoid shuffles: reduce `groupBy` operations, use `reduceByKey` over `groupByKey`, (5) filter early: push filters before joins, (6) data format: Parquet with appropriate compression, (7) tune spark.sql.shuffle.partitions, executor memory, (8) avoid UDFs: use built-in Spark functions, (9) monitor Spark UI for shuffle bottlenecks and straggler tasks."
    },
    {
     "t": "p",
     "text": "**Theme: Graph & Network Analytics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "441",
   "q": "Your social network data has 10M users and 500M connections. You need to find communities. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Louvain algorithm: efficient modularity-based community detection, O(n log n), (2) Label Propagation: fast, scalable but non-deterministic, (3) for implementation: use NetworkX for small graphs, graph-tool or igraph for medium, Apache Spark GraphX or Neo4j for 10M+ nodes, (4) hierarchical communities: Louvain gives multi-level partitioning, (5) evaluate: modularity score, coverage, NMI against ground truth, (6) overlapping communities: BigCLAM or DEMON algorithms, (7) connected components as pre-processing: analyze giant component separately."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "442",
   "q": "You need to predict which users in a social network will become friends (link prediction). How do you approach this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Feature-based: common neighbors, Jaccard coefficient, Adamic-Adar index, preferential attachment, (2) path-based: shortest path length, Katz centrality, (3) community-based: same community membership, (4) node embeddings: Node2Vec, GraphSAGE — learn vector representations, (5) GNN (Graph Neural Network): learn from graph structure, (6) negative sampling: pair positive (existing edges) with random negative pairs, (7) temporal: use older network to predict newer edges, (8) feature combination: concatenate users' profiles + graph features → classifier."
    },
    {
     "t": "p",
     "text": "**Theme: Ethics & Responsible AI (Advanced)**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "443",
   "q": "Your model is fair on aggregate metrics but unfair for a specific subgroup intersection (e.g., Black women). How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** This is intersectional fairness: (1) evaluate metrics on all relevant subgroup intersections, not just individual protected attributes, (2) this can create many small groups — need adequate sample sizes, (3) Gerrymandering fairness: model can satisfy parity on each attribute alone but discriminate at intersections, (4) solutions: (a) include interaction terms, (b) multi-calibration: ensure calibration for all detectable subgroups, (c) minimax fairness: minimize worst-case group performance, (5) prioritize subgroups based on historical disadvantage and sample size."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "444",
   "q": "You built a resume screening model. How do you ensure it doesn't discriminate against protected classes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Remove direct protected attributes (gender, race, age), (2) remove proxy features: university name (correlated with demographics), name, (3) use gender-neutral language processing (he/she → they), (4) test disparate impact: compare selection rates across groups, (5) adversarial debiasing: train model to not predict protected class from features, (6) calibrate separately across groups, (7) audit: have diverse humans review model decisions, (8) regulatory compliance: EEOC guidelines, (9) consider using the model for candidate advancement (not elimination)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "445",
   "q": "Your model's predictions are being used to make irreversible decisions. What safeguards do you implement?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Human-in-the-loop: require human approval for irreversible decisions, (2) confidence thresholds: only auto-decide when model is very confident (>95%), (3) cooling-off period: delay execution to allow review, (4) appeal process: mechanism to challenge decisions, (5) audit trail: log every decision with features, prediction, and explanation, (6) regular review: sample decisions for quality assessment, (7) bias monitoring by subgroup, (8) model cards documenting limitations, (9) fallback policy: what happens when model is uncertain or unavailable."
    },
    {
     "t": "p",
     "text": "**Theme: Advanced Statistics**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "446",
   "q": "You're comparing 20 models using statistical tests. You get 3 with p < 0.05. How many are likely true positives?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multiple comparisons problem: with 20 tests at α=0.05, expect 1 false positive by chance (20 × 0.05 = 1). With 3 significant results, likely 2 are true positives and 1 is false. Corrections: (1) Bonferroni: use α/20 = 0.0025 — conservative, (2) Holm-Bonferroni: stepwise, less conservative, (3) Benjamini-Hochberg: controls false discovery rate (FDR) — better for exploratory analysis, (4) report adjusted p-values, (5) in ML: just use proper cross-validation instead of statistical tests."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "447",
   "q": "Your sample size is too small for a normal hypothesis test (n=15). What alternatives do you have?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Non-parametric tests: Wilcoxon signed-rank (paired), Mann-Whitney U (unpaired), (2) permutation tests: compute exact p-value by enumerating all permutations, (3) bootstrap: resample data to estimate confidence intervals, (4) exact tests: Fisher's exact test (2×2 tables), (5) Bayesian methods: prior + data → posterior, works well with small n, (6) t-test with caution: robust if data is approximately normal (check Q-Q plot), (7) effect size reporting: Cohen's d — more meaningful than p-values with small samples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "448",
   "q": "You're fitting a Bayesian model. How do you choose your priors?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Approaches: (1) Uninformative priors: flat or vague — let data speak (e.g., Normal(0, 100)), (2) weakly informative priors: constrain to reasonable range (e.g., coefficient between -10 and 10), (3) informative priors: from previous studies, domain knowledge, (4) empirical Bayes: estimate priors from data (bridge between Bayesian and frequentist), (5) sensitivity analysis: run with different priors, check if conclusions change, (6) default recommendations: Stan/PyMC suggest weakly informative priors for common models, (7) hierarchical priors: learn prior parameters from data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "449",
   "q": "Your dataset has multicollinearity between features. How do you detect and handle it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Detection: (1) correlation matrix: pairwise correlations > 0.8, (2) VIF (Variance Inflation Factor): VIF > 5-10 indicates problematic collinearity, (3) condition number of design matrix: >30 suggests issues. Impact: inflates standard errors of coefficients, makes them unstable. Handle: (1) remove one of correlated features, (2) PCA/dimensionality reduction, (3) regularization: L1 (Lasso) automatically selects, L2 (Ridge) shrinks correlated features, (4) domain-guided: combine features (e.g., debt/income → ratio), (5) tree models are less affected by multicollinearity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "450",
   "q": "You need to compare the performance of two models. When do you use a paired t-test vs. a Wilcoxon test vs. McNemar's test?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Paired t-test: compare mean performance (accuracy, RMSE) across k folds — assumes normally distributed differences, (2) Wilcoxon signed-rank: non-parametric alternative when normality assumption fails or small k, (3) McNemar's test: compare two classifiers on the same test set — looks at disagreements: cases where model A is right and B is wrong vs. vice versa, (4) 5×2 cv paired t-test: more robust version by Dietterich, (5) Bayesian comparison: probability that model A is better — more informative than p-values."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

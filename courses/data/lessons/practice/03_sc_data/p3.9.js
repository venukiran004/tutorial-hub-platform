/* ============================================================================
   PRACTICE P3.9 — Predict the Output / Scenarios · 9
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.9",
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
   "text": "Predict the Output / Scenarios · 9",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "201",
   "q": "You're building a binary classifier for loan default prediction. The cost of approving a defaulter is 10x the cost of rejecting a good borrower. How do you adjust?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Classification & Decision Boundaries**"
    },
    {
     "t": "p",
     "text": "**Answer:** (1) Use cost-sensitive learning: set class_weight={0:1, 1:10}, (2) adjust classification threshold — lower threshold catches more defaults, (3) optimize for expected cost: E[cost] = FP×cost_fp + FN×cost_fn, (4) use decision curve analysis to find optimal threshold, (5) train with custom loss function reflecting asymmetric costs, (6) evaluate with profit/loss metric instead of accuracy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "202",
   "q": "Your classifier achieves 99% accuracy on an imbalanced dataset (99% negative, 1% positive). Is this a good model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** No — a trivial \"always predict negative\" model gets 99% accuracy. Better evaluation: (1) check precision and recall for the positive class, (2) use F1-score or F-beta (beta>1 if recall matters more), (3) use AUROC — should be significantly better than 0.5, (4) use AUPRC (precision-recall curve area) — more informative for imbalanced data, (5) check confusion matrix: if TP=0, the model is useless."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "203",
   "q": "Your multiclass classifier confuses two specific classes frequently. How do you fix this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Analyze the confusion matrix to identify which classes overlap, (2) add distinguishing features between those classes, (3) merge them if they're truly similar, then separate later, (4) use hierarchical classification — first broad categories, then fine-grained, (5) use One-vs-One (OvO) classifiers for the confused pair, (6) collect more labeled data for the ambiguous cases, (7) use focal loss to focus on hard examples."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "204",
   "q": "Your logistic regression gives calibrated probabilities (0.7 means 70% chance). Your Random Forest doesn't. How do you calibrate it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use Platt scaling: fit sigmoid to model outputs vs. true labels, (2) use isotonic regression for non-parametric calibration, (3) sklearn's `CalibratedClassifierCV` implements both, (4) validate calibration with reliability diagrams (calibration curves), (5) use Brier score to measure calibration quality, (6) calibrate on held-out data, not training data, (7) re-calibrate periodically in production as data shifts."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "205",
   "q": "You need to classify customer segments into 20 categories. Most classifiers work poorly with so many classes. What approaches help?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Hierarchical classification — group 20 into 4–5 super-categories first, then sub-classify, (2) one-vs-rest with well-tuned individual classifiers, (3) error-correcting output codes (ECOC), (4) ensure sufficient samples per class (at least 50–100), (5) use embeddings-based approach — encode classes and predict nearest embedding, (6) augment minority classes, (7) evaluate per-class metrics to identify weak spots."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "206",
   "q": "Your SVM classifier works well but is too slow for 10 million records. How do you scale it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use LinearSVC instead of SVC (O(n) vs. O(n²)), (2) use SGDClassifier with hinge loss (online SVM), (3) subsample training data — SVM often converges with fewer samples, (4) use kernel approximation (Nyström method, RBF sampler), (5) use LIBLINEAR backend for linear kernels, (6) consider alternative models: logistic regression or LightGBM which scale better."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "207",
   "q": "Your model needs to handle \"I don't know\" — it should abstain when uncertain rather than guessing. How do you implement this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Set confidence threshold — abstain when max probability < 0.6, (2) use two thresholds: predict positive if P>0.7, negative if P<0.3, abstain otherwise, (3) train a reject option classifier, (4) use ensemble disagreement — abstain when models disagree, (5) use conformal prediction for guaranteed coverage, (6) track abstention rate and adjust thresholds to balance coverage vs. accuracy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "208",
   "q": "You're building a medical diagnosis classifier. The doctor wants to understand WHY the model makes each prediction. What do you provide?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use inherently interpretable models: logistic regression with clinical features, decision trees, rule-based systems, (2) provide SHAP values per prediction — \"these 3 features contributed most,\" (3) use counterfactual explanations — \"the prediction would change if blood pressure decreased by 10,\" (4) show similar past cases (case-based reasoning), (5) generate natural language explanations, (6) display feature contribution waterfall charts."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "209",
   "q": "Your classifier performs differently for different demographic groups (e.g., accuracy is 95% for group A but 80% for group B). How do you address this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** This is a fairness issue. Approaches: (1) evaluate disparate impact — check if selection rates differ across groups, (2) use equalized odds — ensure TPR and FPR are equal across groups, (3) training-time: use adversarial debiasing or reweighting, (4) post-processing: adjust thresholds per group, (5) pre-processing: remove proxy variables or balance training data, (6) report disaggregated metrics in model card, (7) legal/regulatory compliance check."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "210",
   "q": "Your binary classifier output needs to be a \"risk score\" (1-100) rather than just yes/no. How do you create this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use calibrated probability output: risk_score = int(predicted_probability × 100), (2) ensure calibration first (Platt scaling), (3) validate with calibration curve — score of 70 should mean ~70% positive rate, (4) binning approach: group into risk tiers (low/medium/high) for business use, (5) consider monotonic transformation if certain score ranges need emphasis, (6) A/B test the scoring system against previous decision-making."
    },
    {
     "t": "p",
     "text": "**Theme: Clustering & Unsupervised Learning**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "211",
   "q": "Your marketing team wants customer segments but doesn't know how many. How do you determine the optimal number of clusters?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multiple methods (they won't always agree): (1) elbow method — plot inertia vs. K, look for bend, (2) silhouette score — higher is better, (3) gap statistic — compare within-cluster dispersion to null distribution, (4) domain knowledge — what's actionable (3–7 segments usually), (5) Bayesian Information Criterion (BIC) for Gaussian Mixtures, (6) dendrogram for hierarchical clustering — cut at consistent height, (7) try several K values and validate with stakeholders."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "212",
   "q": "Your K-means clustering gives different results each time you run it. How do you get stable clusters?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use `n_init=20` (or higher) — runs K-means 20 times with different seeds, picks best, (2) set `random_state=42` for reproducibility, (3) use K-means++ initialization (default in sklearn), (4) if still unstable, data may not have clear cluster structure, (5) try 100 runs and consensus clustering — assign to most frequent cluster, (6) consider if K-means is appropriate — non-spherical clusters need DBSCAN or Gaussian Mixture."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "213",
   "q": "You've clustered customers but stakeholders say \"these segments don't make business sense.\" How do you improve?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Features may need engineering — cluster on business-relevant features (RFM: recency, frequency, monetary), (2) scale features appropriately (spending shouldn't dominate age just because it's larger), (3) reduce dimensions with PCA first, then cluster, (4) involve domain experts in feature selection, (5) try different algorithms (K-means, hierarchical, DBSCAN), (6) profile clusters post-hoc and name them meaningfully, (7) iterate: show profiles to stakeholders, refine features, re-cluster."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "214",
   "q": "Your DBSCAN clustering labels 40% of data points as noise. Is this acceptable?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Depends on context: (1) if data is truly noisy/diverse, this is expected, (2) 40% noise suggests epsilon is too small or min_samples too large, (3) try different epsilon values — use k-distance plot to find natural threshold, (4) consider HDBSCAN which handles varying densities better, (5) noise points might form their own clusters at different density levels, (6) if the goal is clean segments, 40% noise is usually too much — relax parameters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "215",
   "q": "You need to cluster both continuous and categorical features. K-means only handles continuous. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) K-prototypes algorithm — extends K-means for mixed data, (2) encode categoricals numerically: target encoding, binary encoding, (3) Gower distance with hierarchical clustering — handles mixed types natively, (4) convert everything to embeddings then cluster, (5) Latent Class Analysis for categorical-heavy data, (6) two-step approach: cluster separately by type then combine, (7) use FAMD (Factor Analysis of Mixed Data) for dimensionality reduction first."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "216",
   "q": "Your clustering results change significantly when you add one new feature. How do you handle feature sensitivity?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) This indicates the new feature has high variance and dominates distance calculations, (2) standardize all features to mean=0, std=1 before clustering, (3) use feature weighting — domain experts assign importance, (4) reduce with PCA to orthogonal components first, (5) test stability: bootstrap clustering and measure cluster membership consistency, (6) consider feature selection specifically for clustering (Laplacian score, spectral methods)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "217",
   "q": "You're asked to validate clustering results. There are no labels. How do you assess cluster quality?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Internal validation metrics: (1) silhouette score — measures how similar points are to own cluster vs. nearest other, (2) Davies-Bouldin Index — lower is better, measures cluster separation, (3) Calinski-Harabasz Index — ratio of between-cluster to within-cluster dispersion, (4) cluster stability via bootstrapping, (5) visual validation: PCA/t-SNE/UMAP plots colored by cluster, (6) business validation: do clusters have distinct, interpretable profiles?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "218",
   "q": "You've built customer segments using clustering. Now a new customer arrives. How do you assign them to a segment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use the trained cluster centers — assign to nearest centroid (for K-means), (2) use `model.predict(new_data)` from trained model, (3) for DBSCAN, classify as nearest core point's cluster or noise, (4) train a classifier on (features → cluster_label) for faster real-time assignment, (5) set up monitoring — if many new customers don't fit existing clusters well, it's time to re-cluster, (6) periodically retrain clusters to capture evolving patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "219",
   "q": "Your dimensionality reduction (t-SNE) shows nice clusters visually, but K-means on the original data doesn't find them. Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) t-SNE is non-linear and distorts distances — clusters in t-SNE don't always exist in original space, (2) t-SNE parameters (perplexity) affect cluster appearance — different perplexity gives different visualizations, (3) K-means assumes spherical clusters — use DBSCAN or spectral clustering for non-convex shapes, (4) apply UMAP (preserves more global structure than t-SNE) and cluster on UMAP embeddings, (5) don't use t-SNE for clustering — only for visualization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "220",
   "q": "You need to detect anomalies in a high-dimensional dataset (100 features). What approach do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Isolation Forest — efficient for high dimensions, (2) autoencoder — train on normal data, high reconstruction error = anomaly, (3) PCA → Mahalanobis distance in reduced space, (4) One-Class SVM — learn boundary of normal data, (5) LOF doesn't work well in high dimensions (curse of dimensionality), (6) ensemble multiple detectors for robustness, (7) reduce dimensions first (PCA/UMAP) then apply density-based methods."
    },
    {
     "t": "p",
     "text": "**Theme: Natural Language Processing**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "221",
   "q": "You're building a sentiment analysis model for product reviews. Reviews contain sarcasm and mixed sentiments. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use transformer models (BERT/RoBERTa) fine-tuned on sentiment — they capture context better than bag-of-words, (2) aspect-based sentiment: analyze sentiment per aspect (quality: positive, price: negative), (3) train on sarcasm-labeled data as additional task, (4) use emoji and punctuation as features (sarcasm often has \"!! 🙄\"), (5) ensemble lexicon-based + ML approach, (6) for mixed reviews: sentence-level sentiment aggregation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "222",
   "q": "Your text classification model works well on formal text but fails on social media data. How do you adapt?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Preprocessing: handle hashtags, mentions, emojis, URLs, slang, abbreviations, (2) fine-tune on social media data (domain adaptation), (3) use models pre-trained on social media (BERTweet, Twitter-RoBERTa), (4) expand your training data with social media examples, (5) handle code-switching (multiple languages), (6) normalize text: \"u r\" → \"you are\", \"gonna\" → \"going to\", (7) keep emojis as features — they carry sentiment information."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "223",
   "q": "You need to extract key information (names, dates, amounts) from unstructured invoices. What approach do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Named Entity Recognition (NER) for entity extraction, (2) fine-tune spaCy or BERT-NER on invoice-specific entities, (3) use regex patterns for structured fields (dates, amounts, invoice numbers), (4) template matching for fixed-format invoices, (5) for variable formats: document AI models (LayoutLM) that use both text and layout, (6) pipeline: OCR → text extraction → NER → structured output, (7) active learning to iteratively improve with human feedback."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "224",
   "q": "Your NLP model needs to support 15 different languages. Training separate models for each is expensive. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Use multilingual models: mBERT, XLM-RoBERTa — trained on 100+ languages, (2) fine-tune on combined multilingual data, (3) zero-shot cross-lingual transfer: train on English, test on other languages, (4) translate-train: machine translate English training data to other languages, (5) language-specific tokenizers matter — use SentencePiece with multilingual vocab, (6) evaluate per-language to identify weak languages needing more data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "225",
   "q": "You're building a search engine. Users type queries like \"cheap hotels near beach\" and you need to match with hotel descriptions. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Semantic search with sentence embeddings (Sentence-BERT), (2) BM25 for keyword matching + neural reranking for relevance, (3) hybrid: BM25 retrieves candidates, cross-encoder reranks top-k, (4) query expansion: add synonyms (\"cheap\" → \"affordable, budget\"), (5) generate embeddings for both queries and documents offline, (6) use approximate nearest neighbor (FAISS/Annoy) for fast similarity search, (7) fine-tune embeddings on your query-document pairs for domain adaptation."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

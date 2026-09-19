/* ============================================================================
   PRACTICE P5.4 — SVM, KNN and Naive Bayes · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/05_SVM_KNN_NaiveBayes.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p5.4",
 "lede": "**25 scenarios** from SVM, KNN and Naive Bayes. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "n": "76",
   "q": "How does KNN handle missing values?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** KNN doesn't handle missing values natively. Options:"
    },
    {
     "t": "ol",
     "items": [
      "**KNN imputation:** Use KNN itself to fill missing values (from complete features distance)",
      "**Remove:** Skip features with missing values for distance",
      "**Impute:** Mean/median imputation before KNN"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** KNN can be both algorithm and imputation method."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is locality-sensitive hashing (LSH) and how does it help KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Approximate nearest neighbor search using hash functions that map similar items to same bucket."
    },
    {
     "t": "ul",
     "items": [
      "Maps: nearby points → same hash → same bucket",
      "Query: only search within matching buckets"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces search from O(n) to O(1) average. Approximate but much faster for high-dimensional data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is the decision boundary shape for KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Piecewise linear (Voronoi diagram for K=1). For larger K, boundaries become smoother."
    },
    {
     "t": "p",
     "text": "**Explanation:** Unlike SVM/LR with clean hyperplane boundaries, KNN creates complex local boundaries. Can represent any decision boundary."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "How does KNN handle imbalanced classes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Distance-weighted voting:** Closer neighbors count more",
      "**Adjust K:** Use smaller K for minority class",
      "**Over/under-sampling:** Balance classes before applying KNN",
      "**Class-specific K:** Different K for different classes"
     ]
    },
    {
     "t": "p",
     "text": "**Problem:** With imbalanced data, most neighbors are from majority class."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is the Bayesian error rate?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The lowest possible error rate for any classifier on a given problem. Determined by class overlap."
    },
    {
     "t": "p",
     "text": "**Explanation:** Even with perfect algorithm and infinite data, some samples can't be correctly classified (overlapping class distributions). KNN with K→∞ approaches Bayesian error rate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is the BallTree algorithm for KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Organizes data into nested hyperspheres:"
    },
    {
     "t": "ol",
     "items": [
      "Build: recursively partition data into balls",
      "Query: prune branches when ball is farther than current K-th nearest"
     ]
    },
    {
     "t": "p",
     "text": "**Advantage over KD-tree:** Works better in higher dimensions (up to ~40)."
    },
    {
     "t": "p",
     "text": "**Explanation:** BallTree: O(m log n) query. KD-tree degrades past ~20 dimensions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is Prototype-based KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Instead of storing all training points, use representative prototypes:"
    },
    {
     "t": "ol",
     "items": [
      "**Condensed Nearest Neighbor:** Keep only boundary points",
      "**K-means + KNN:** Use cluster centroids as prototypes",
      "**Edited Nearest Neighbor:** Remove noisy points"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces storage and prediction time while maintaining accuracy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "How would you use Naive Bayes for document classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.feature_extraction.text import TfidfVectorizer\nfrom sklearn.naive_bayes import MultinomialNB\nfrom sklearn.pipeline import Pipeline\n\npipe = Pipeline([\n    ('tfidf', TfidfVectorizer(max_features=10000)),\n    ('nb', MultinomialNB(alpha=1.0))\n])\npipe.fit(train_texts, train_labels)\npredictions = pipe.predict(test_texts)"
    },
    {
     "t": "p",
     "text": "**Explanation:** TF-IDF converts text to features, MultinomialNB classifies. Fast and effective baseline for text."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is the effect of prior probability in Naive Bayes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** P(y) = proportion of each class in training data. Affects prediction when features are ambiguous."
    },
    {
     "t": "p",
     "text": "**Override:** `GaussianNB(priors=[0.3, 0.7])` — set custom priors."
    },
    {
     "t": "p",
     "text": "**Explanation:** With balanced priors (0.5, 0.5), only features determine prediction. With imbalanced priors, model is biased toward majority class."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is the radius-based nearest neighbor?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Instead of fixed K, consider all neighbors within a fixed radius ε."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.neighbors import RadiusNeighborsClassifier\nmodel = RadiusNeighborsClassifier(radius=1.0)"
    },
    {
     "t": "p",
     "text": "**Advantage:** Variable number of neighbors — more in dense regions, fewer in sparse."
    },
    {
     "t": "p",
     "text": "**Risk:** Empty neighborhood → no prediction possible."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "How do you handle categorical features in KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**One-hot encoding:** Each category becomes binary feature",
      "**Hamming distance:** For purely categorical data",
      "**Mixed distance:** Gower distance combines different feature types",
      "**Target encoding:** Convert categories to numeric"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Euclidean distance on one-hot features equals counting mismatches (like Hamming)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the difference between KNN classifier and KNN regressor?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Classifier:** Returns mode (most common class) of K neighbors",
      "**Regressor:** Returns mean (or weighted mean) of K neighbors' target values"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Same concept, different aggregation. Both rely on \"similar inputs → similar outputs\" assumption."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is the effect of noise on KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**K=1:** Very sensitive — one noisy point creates wrong prediction",
      "**Large K:** Smooths out noise — one noisy point diluted by other neighbors"
     ]
    },
    {
     "t": "p",
     "text": "**Tradeoff:** Noise robustness vs. ability to capture fine-grained patterns."
    },
    {
     "t": "p",
     "text": "**Explanation:** Optimal K depends on noise level. Noisier data → larger K."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "How does Naive Bayes handle multi-label classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Train independent binary classifiers, one per label. Each classifier uses NB to predict presence/absence of its label."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.multiclass import OneVsRestClassifier\nfrom sklearn.naive_bayes import MultinomialNB\nmodel = OneVsRestClassifier(MultinomialNB())"
    },
    {
     "t": "p",
     "text": "**Explanation:** NB's independence assumption extends naturally: each label is predicted independently."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the time complexity comparison between NB and KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Phase",
      "Naive Bayes",
      "KNN"
     ],
     "rows": [
      [
       "Training",
       "O(n×m)",
       "O(1) — just stores data"
      ],
      [
       "Prediction",
       "O(m×c) per sample",
       "O(n×m) per sample"
      ],
      [
       "Memory",
       "O(m×c) parameters",
       "O(n×m) all data"
      ]
     ]
    },
    {
     "t": "p",
     "text": "n=samples, m=features, c=classes"
    },
    {
     "t": "p",
     "text": "**Explanation:** NB: fast everywhere. KNN: instant training, slow prediction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is the condensed nearest neighbor (CNN) algorithm?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reduces training set while maintaining decision boundary:"
    },
    {
     "t": "ol",
     "items": [
      "Start with one point per class",
      "Classify remaining points using current set",
      "Add misclassified points to set",
      "Repeat until no misclassifications"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Keeps boundary points, removes interior points. Reduces prediction time and storage."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is label propagation and how does it relate to KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Semi-supervised method — propagates labels from labeled to unlabeled points through graph of nearest neighbors."
    },
    {
     "t": "p",
     "text": "**Process:**"
    },
    {
     "t": "ol",
     "items": [
      "Build KNN graph",
      "Assign labels to labeled points",
      "Propagate labels through graph edges",
      "Repeat until convergence"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Uses neighborhood structure to leverage unlabeled data. Related to KNN but works with limited labels."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What are the limitations of Naive Bayes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Independence assumption rarely holds",
      "Poor probability calibration (overconfident)",
      "Can't learn feature interactions",
      "Assumes specific feature distribution (Gaussian/multinomial)",
      "Zero-frequency problem (mitigated by smoothing)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Despite limitations, NB is a strong baseline. Often competitive with complex models on small data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "How would you use KNN for anomaly detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Distance-based:** Points where average KNN distance is large are anomalies",
      "**Local Outlier Factor (LOF):** Compare local density to neighbors' density"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.neighbors import LocalOutlierFactor\nlof = LocalOutlierFactor(n_neighbors=20)\npredictions = lof.fit_predict(X)  # -1 = outlier"
    },
    {
     "t": "p",
     "text": "**Explanation:** LOF is density-based — works when anomalies are in sparse regions but normal data has varying density."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is the effect of dimensionality on KNN performance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Dimensions",
      "Effect"
     ],
     "rows": [
      [
       "1-10",
       "KNN works well"
      ],
      [
       "10-20",
       "Performance starts degrading"
      ],
      [
       "20-50",
       "Need more data, consider PCA"
      ],
      [
       "50+",
       "Distances become meaningless, KNN fails"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Curse of dimensionality — exponentially more data needed for same coverage."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is the difference between hard and soft nearest neighbor predictions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Hard:** Majority vote → class label",
      "**Soft:** Weighted vote → probability per class"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model.predict(X)       # Hard: class labels\nmodel.predict_proba(X) # Soft: probabilities"
    },
    {
     "t": "p",
     "text": "**Explanation:** Soft predictions allow threshold tuning and are needed for some ensemble methods."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "How does Bernoulli Naive Bayes differ from Multinomial?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**BernoulliNB:** Binary features (word present/absent). Explicitly models absence of words.",
      "**MultinomialNB:** Count features (word frequency). Only considers present words."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** BernoulliNB: P(x_i=0|spam) matters. MultinomialNB: absence doesn't contribute. Use BernoulliNB for short texts."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is the instance-based learning perspective of KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** KNN is instance-based (memory-based) learning — it stores training instances and compares new inputs to them."
    },
    {
     "t": "p",
     "text": "**Properties:**"
    },
    {
     "t": "ol",
     "items": [
      "No explicit model building",
      "Each prediction uses entire training set",
      "Local approximation — different regions use different \"models\""
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Opposite of model-based learning (LR, SVM) that builds explicit parameter model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "How would you optimize KNN for very large datasets?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Approximate NN:** LSH, ANNOY, FAISS",
      "**Reduce training set:** Prototype selection, CNN",
      "**Reduce dimensions:** PCA, UMAP before KNN",
      "**Use BallTree/KDTree:** For exact but faster search",
      "**Quantization:** Reduce feature precision"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Exact KNN doesn't scale. Approximate methods trade small accuracy for large speed gains."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "What is the Naive Bayes classifier's relationship to MAP estimation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Naive Bayes predicts the class with Maximum A Posteriori probability:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "ŷ = argmax_y P(y) × ∏ P(x_i | y)"
    },
    {
     "t": "p",
     "text": "This is MAP estimation with the naive independence assumption."
    },
    {
     "t": "p",
     "text": "**Explanation:** If priors are uniform, MAP reduces to MLE (Maximum Likelihood Estimation) → just maximize likelihood."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

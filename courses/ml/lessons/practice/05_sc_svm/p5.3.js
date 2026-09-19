/* ============================================================================
   PRACTICE P5.3 — SVM, KNN and Naive Bayes · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/05_SVM_KNN_NaiveBayes.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p5.3",
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
   "n": "51",
   "q": "How does K-Nearest Neighbors (KNN) make predictions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Compute distance from query point to all training points",
      "Find K closest training points",
      "Classification: majority vote among K neighbors",
      "Regression: average of K neighbors' values"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Lazy learner — no training phase. All computation happens at prediction time. Simple but effective."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What happens with K=1 in KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Assigns query point to the class of its single nearest neighbor."
    },
    {
     "t": "ul",
     "items": [
      "Training accuracy = 100% (each point is its own nearest neighbor)",
      "Very sensitive to noise — one noisy point affects predictions",
      "Decision boundary is highly complex (Voronoi diagram)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** K=1 is a lower bound on bias, upper bound on variance. Will overfit."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What happens with K = N (total samples)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Always predicts the majority class — equivalent to predicting the mode."
    },
    {
     "t": "ul",
     "items": [
      "Maximum bias, zero variance",
      "Useless for any meaningful prediction"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** With K=N, all training points vote → majority class always wins. Extreme underfitting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "How do you choose the optimal K?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Use cross-validation to evaluate different K values",
      "Start with K = √n (square root of training size)",
      "Use odd K for binary classification (avoids ties)",
      "Plot accuracy vs. K — choose elbow point"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Small K: high variance, low bias. Large K: low variance, high bias. Optimal K balances both."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "Why is feature scaling essential for KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** KNN uses distance calculations. Features with larger ranges dominate distance."
    },
    {
     "t": "p",
     "text": "**Example:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Point A: age=25, salary=100000\nPoint B: age=30, salary=100001\nDistance ≈ 100001 # Salary dominates completely"
    },
    {
     "t": "p",
     "text": "**Explanation:** Scale features to equal ranges (StandardScaler/MinMaxScaler) so all features contribute equally."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What distance metrics can KNN use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Euclidean:** √Σ(x_i - y_i)² — default, works for continuous",
      "**Manhattan:** Σ|x_i - y_i| — robust to outliers",
      "**Minkowski:** (Σ|x_i - y_i|^p)^(1/p) — generalization",
      "**Cosine:** 1 - cos(θ) — for text/sparse data",
      "**Hamming:** for categorical features"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Choice depends on data type and domain. Euclidean assumes equal importance of all dimensions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What is the curse of dimensionality for KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** In high dimensions, all points become approximately equidistant → nearest neighbor becomes meaningless."
    },
    {
     "t": "p",
     "text": "**Example:** In 100 dimensions, ratio of nearest to farthest distance approaches 1."
    },
    {
     "t": "p",
     "text": "**Fix:** Dimensionality reduction (PCA), feature selection before KNN."
    },
    {
     "t": "p",
     "text": "**Explanation:** Volume of space grows exponentially. Data becomes sparse → distances less meaningful."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is weighted KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Give closer neighbors more voting power:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model = KNeighborsClassifier(n_neighbors=5, weights='distance')"
    },
    {
     "t": "ul",
     "items": [
      "Weight = 1/distance",
      "Closer neighbors have more influence"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces effect of distant (less relevant) neighbors. Helps when K is large."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is the time complexity of KNN prediction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Brute force:** O(n × m) per query — compute distance to all n points in m dimensions",
      "**KD-tree:** O(m × log n) average — efficient for low dimensions",
      "**Ball tree:** O(m × log n) — better for higher dimensions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** KD-tree degrades in high dimensions (>20). Ball tree uses hyperspheres instead of hyperrectangles."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "When would KNN outperform other algorithms?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Small to medium dataset",
      "Decision boundary is irregular/complex",
      "Low-dimensional data",
      "Non-parametric relationship needed",
      "No training time available"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** KNN makes no assumptions about data distribution. Can capture any decision boundary with enough data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What is the fundamental assumption of Naive Bayes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Features are **conditionally independent** given the class label:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "P(x₁, x₂, ..., x_n | y) = P(x₁|y) × P(x₂|y) × ... × P(x_n|y)"
    },
    {
     "t": "p",
     "text": "**Explanation:** \"Naive\" because this assumption is rarely true (height and weight are correlated). Despite this, works surprisingly well in practice."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is Bayes' theorem and how does Naive Bayes apply it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "P(y|X) = P(X|y) × P(y) / P(X)"
    },
    {
     "t": "ul",
     "items": [
      "P(y|X): Posterior probability (what we want)",
      "P(X|y): Likelihood (learned from data)",
      "P(y): Prior probability",
      "P(X): Evidence (constant, can ignore for classification)"
     ]
    },
    {
     "t": "p",
     "text": "**Prediction:** Choose class with highest posterior."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What are the three main types of Naive Bayes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**GaussianNB:** Assumes features follow Gaussian distribution — for continuous features",
      "**MultinomialNB:** Assumes multinomial distribution — for word counts/frequencies",
      "**BernoulliNB:** Assumes binary features — for presence/absence features"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Choose based on feature distribution. MultinomialNB is default for text classification."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "Why does Naive Bayes work well for text classification despite the naive assumption?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Only needs to rank classes correctly (not calibrated probabilities)",
      "Dependence between words doesn't change the winning class much",
      "High-dimensional text → independence assumption is a good regularizer",
      "Very fast — can handle huge vocabulary"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Despite poor probability estimates, classification accuracy is often good because ranking is preserved."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is Laplace smoothing and why is it necessary?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Add α to all counts to avoid zero probabilities:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "P(x_i | y) = (count(x_i, y) + α) / (count(y) + α × |V|)"
    },
    {
     "t": "p",
     "text": "**Without smoothing:** Unseen word → P=0 → entire product = 0 → classification fails."
    },
    {
     "t": "p",
     "text": "**Explanation:** Even α=1 (Laplace) works well. Prevents zero probability from one unseen feature killing the entire prediction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is the output of Naive Bayes?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.naive_bayes import GaussianNB\nmodel = GaussianNB()\nmodel.fit(X_train, y_train)\nproba = model.predict_proba(X_test[0:1])"
    },
    {
     "t": "p",
     "text": "**Answer:** Probability for each class. But probabilities are typically poorly calibrated (too extreme — close to 0 or 1)."
    },
    {
     "t": "p",
     "text": "**Explanation:** The independence assumption makes probabilities overconfident. Use CalibratedClassifierCV for better calibration."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is the zero-frequency problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When a feature value never appears with a class during training, P(feature|class) = 0 → product = 0 regardless of other features."
    },
    {
     "t": "p",
     "text": "**Solution:** Laplace smoothing (add-α smoothing)."
    },
    {
     "t": "p",
     "text": "**Example:** Word \"blockchain\" never seen in \"sports\" category → P(\"blockchain\"|sports)=0 → any document with \"blockchain\" gets P(sports)=0."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "How does Gaussian Naive Bayes estimate P(x|y)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "P(x_i | y) = (1 / √(2πσ²_y)) × exp(-(x_i - μ_y)² / (2σ²_y))"
    },
    {
     "t": "p",
     "text": "Estimates mean (μ) and variance (σ²) for each feature per class during training."
    },
    {
     "t": "p",
     "text": "**Explanation:** Assumes each feature follows a Gaussian distribution within each class. May underperform if features are not Gaussian."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "When would you choose Naive Bayes over Logistic Regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Small training set:** NB has less parameters to estimate",
      "**High-dimensional sparse data:** NB handles well",
      "**Need very fast training/prediction:** O(n×m) training, O(m) prediction",
      "**Streaming data:** NB supports incremental learning"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** NB converges to its asymptotic error faster. LR converges to lower asymptotic error."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What is the difference between generative and discriminative classifiers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Generative (Naive Bayes):** Models P(X|y) and P(y), then uses Bayes' rule for P(y|X)",
      "**Discriminative (Logistic Regression):** Directly models P(y|X)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Generative models learn the full data distribution → can generate new samples. Discriminative models focus on boundary → often more accurate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "How does Naive Bayes handle continuous features with MultinomialNB?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** It doesn't — MultinomialNB expects non-negative counts/frequencies."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Use GaussianNB for continuous features",
      "Discretize continuous features into bins",
      "Use ComplementNB for text with TF-IDF values"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** MultinomialNB models count data (word frequencies). Continuous features need different distribution assumption."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is ComplementNB and when is it better than MultinomialNB?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Estimates class probability using complement (all classes except current):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "P(x|y) is estimated using data NOT in class y"
    },
    {
     "t": "p",
     "text": "**Better when:** Classes are imbalanced. Corrects MultinomialNB's bias toward majority class."
    },
    {
     "t": "p",
     "text": "**Explanation:** Works well for text classification with skewed class distributions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is the naive Bayes assumption violation in spam detection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Words are not independent — \"Nigerian\" and \"prince\" co-occur more than independence predicts."
    },
    {
     "t": "p",
     "text": "**Despite violation:** NB still classifies correctly because:"
    },
    {
     "t": "ol",
     "items": [
      "Correlated features provide redundant evidence → overcounting helps the right class",
      "Only relative ranking of P(spam|X) vs P(not_spam|X) matters"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "How would you combine KNN with Naive Bayes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Stacking:** Use both as base learners, meta-learner combines predictions",
      "**Feature engineering:** NB probability as feature for KNN",
      "**Ensemble voting:** Average predictions from both"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** NB captures global statistics, KNN captures local patterns. Complementary strengths."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is the effect of correlated features on KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Correlated features effectively \"double-count\" — that dimension contributes disproportionately to distance."
    },
    {
     "t": "p",
     "text": "**Example:** height_cm and height_inches → height matters twice as much as other features."
    },
    {
     "t": "p",
     "text": "**Fix:** PCA to remove correlations, or feature selection."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

/* ============================================================================
   PRACTICE P5.2 — SVM, KNN and Naive Bayes · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/05_SVM_KNN_NaiveBayes.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p5.2",
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
   "n": "26",
   "q": "What is the difference between hard margin and soft margin SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Hard margin:** No misclassifications allowed → only works for linearly separable data",
      "**Soft margin:** Allows misclassifications with penalty C → works for noisy/overlapping data"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Hard margin fails if any noise or overlap exists. Soft margin (C-SVM) is always used in practice."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "How do you handle class imbalance in SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model = SVC(class_weight='balanced')\n# OR manually:\nmodel = SVC(class_weight={0: 1, 1: 10})"
    },
    {
     "t": "p",
     "text": "**Explanation:** class_weight='balanced' sets weight inversely proportional to class frequency. Effective: penalizes minority class errors more."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is the One-Class SVM and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Unsupervised anomaly detection — learns boundary around \"normal\" data."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.svm import OneClassSVM\nmodel = OneClassSVM(kernel='rbf', gamma=0.1, nu=0.05)\nmodel.fit(X_normal)\npredictions = model.predict(X_test)  # 1 = normal, -1 = anomaly"
    },
    {
     "t": "p",
     "text": "**Explanation:** Used when normal data is abundant but anomalies are rare/unknown. ν controls expected proportion of anomalies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What is the curse of dimensionality for SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** In very high dimensions, all points become equidistant → margins become meaningless."
    },
    {
     "t": "p",
     "text": "**Paradox:** SVM is supposedly good in high dimensions but:"
    },
    {
     "t": "ol",
     "items": [
      "Kernel computation becomes expensive",
      "Feature distances become less meaningful",
      "Need more support vectors"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Linear SVM handles high dimensions better (no kernel matrix). Use with text/genomic data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What is the computational cost of prediction for SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Linear SVM:** O(m) per sample — just dot product w·x + b",
      "**Kernel SVM:** O(n_sv × m) per sample — kernel evaluation with each support vector",
      "n_sv = number of support vectors"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** If model has 10,000 support vectors, each prediction requires 10,000 kernel evaluations → slow."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "How do custom kernels work in SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def my_kernel(X, Y):\n    return np.dot(X, Y.T) ** 2  # Custom squared dot product\n\nmodel = SVC(kernel=my_kernel)\n# OR precompute kernel matrix:\nmodel = SVC(kernel='precomputed')\nK = my_kernel_matrix(X)\nmodel.fit(K, y)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Any positive semi-definite function can be a kernel. Must satisfy Mercer's condition."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is Mercer's theorem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A function K(x,y) is a valid kernel if and only if the resulting kernel matrix is positive semi-definite for any set of input points."
    },
    {
     "t": "p",
     "text": "**Implication:** Guarantees that an implicit feature space exists where dot product equals the kernel."
    },
    {
     "t": "p",
     "text": "**Explanation:** Ensures optimization problem is convex → unique global solution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "How would you handle a non-linearly separable dataset with SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** In order of preference:"
    },
    {
     "t": "ol",
     "items": [
      "Try RBF kernel (default non-linear choice)",
      "Try polynomial kernel with different degrees",
      "Feature engineering to make it linearly separable",
      "Increase C (if near-separable with noise)",
      "Consider a different algorithm"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Kernel trick maps data to higher-dimensional space where it may become linearly separable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is the significance of the number of support vectors?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Few SVs:** Simple model, clear separation → good generalization",
      "**Many SVs (>50% of data):** Complex model → may overfit, or classes overlap significantly"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Number of SVs indicates model complexity. If most training points are SVs, SVM isn't finding a clean boundary."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is regularization in SVM vs logistic regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**SVM:** C parameter (inverse regularization, C = 1/λ)",
      "**Logistic Regression:** C parameter (same convention in sklearn) or λ"
     ]
    },
    {
     "t": "p",
     "text": "**Key difference:** SVM uses hinge loss, LR uses log loss. SVM focuses on margin, LR on probability."
    },
    {
     "t": "p",
     "text": "**Explanation:** Strong regularization → simple model. SVM regularization affects margin width."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "How does SVM compare to neural networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "SVM",
      "Neural Network"
     ],
     "rows": [
      [
       "Data size",
       "Small-medium",
       "Large"
      ],
      [
       "Training",
       "Convex optimization",
       "Non-convex"
      ],
      [
       "Feature engineering",
       "Often needed",
       "Can learn features"
      ],
      [
       "Interpretability",
       "Moderate",
       "Low"
      ],
      [
       "Hyperparameters",
       "Few (C, γ)",
       "Many"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** NN has replaced SVM for most tasks due to better scaling and automatic feature learning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is the string kernel for text classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Measures similarity between strings based on shared substrings of length k:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "K(s,t) = Σ count of common substrings of length k"
    },
    {
     "t": "p",
     "text": "**Explanation:** Enables SVM on sequence data without explicit feature extraction. Useful for bioinformatics and text classification."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is the advantage of linear SVM for text classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Text is naturally high-dimensional (large vocabulary)",
      "Text features are often linearly separable",
      "Linear SVM is fast: O(n × m) training",
      "Sparse data representation (CSR matrix) is efficient"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Linear SVM + TF-IDF was state-of-the-art for text classification before deep learning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is the geometric interpretation of kernel PCA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** PCA in the kernel-induced feature space. Finds principal directions in high-dimensional space."
    },
    {
     "t": "p",
     "text": "**Steps:**"
    },
    {
     "t": "ol",
     "items": [
      "Compute kernel matrix K",
      "Center kernel matrix",
      "Eigendecompose centered K"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Captures non-linear structure missed by standard PCA. Useful for non-linear dimensionality reduction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the sigmoid kernel and why is it unusual?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "K(x,y) = tanh(γ × x·y + c)"
    },
    {
     "t": "p",
     "text": "**Unusual because:** Not always positive semi-definite (not a valid kernel for all γ, c). Only valid for specific parameter ranges."
    },
    {
     "t": "p",
     "text": "**Explanation:** Mimics a two-layer neural network. Rarely used in practice due to theoretical limitations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "How does SVM handle high-dimensional data efficiently?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Dual formulation: optimization depends on n (samples) not m (features)",
      "Kernel trick avoids explicit feature transformation",
      "Sparse solution: only support vectors matter"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For text with 100K features but 1K samples, SVM works in sample space (1K×1K) not feature space."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the Structural Risk Minimization principle?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** SVM is based on minimizing:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Risk = Empirical_risk + Model_complexity"
    },
    {
     "t": "p",
     "text": "**Explanation:** Balances training error (how well it fits data) with model simplicity (margin width). Theoretical foundation for SVM's generalization ability."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is the VC dimension and how does it relate to SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** VC dimension = maximum number of points the model can shatter (classify in all possible ways)."
    },
    {
     "t": "ul",
     "items": [
      "Linear classifier in d dimensions: VC = d + 1",
      "SVM maximizes margin → effective VC dimension is lower → better generalization"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Lower effective VC dimension = less overfitting. SVM's maximum margin reduces capacity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "When would you NOT use SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Very large datasets (>100K samples) — too slow",
      "Many features with noise — needs feature selection",
      "Need probability outputs — requires expensive Platt scaling",
      "Need online learning — SVM is batch algorithm",
      "Multi-class with many classes — OvO creates many classifiers"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Modern alternatives (gradient boosting, neural networks) are often more practical."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "How does SVM handle outliers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Hard margin:** Very sensitive — one outlier can completely change boundary",
      "**Soft margin (small C):** Robust — outliers become slack variables with penalty",
      "**RBF kernel:** Each support vector has local influence → inherently somewhat robust"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Use small C for noisy data with outliers. Very small C effectively ignores outliers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "What is the Sequential Minimal Optimization (SMO) algorithm?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Efficient algorithm for solving SVM optimization:"
    },
    {
     "t": "ol",
     "items": [
      "Select two α values (heuristically)",
      "Optimize these two while keeping others fixed (analytical solution)",
      "Repeat until convergence"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Full QP solver is O(n³). SMO breaks into sub-problems with closed-form solutions → practical for larger datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the Radial Basis Function interpretation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Each support vector creates a \"bump\" in the feature space:"
    },
    {
     "t": "ul",
     "items": [
      "Near SV: high influence → positive contribution to class",
      "Far from SV: low influence → contribution decays exponentially"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Decision function is weighted sum of Gaussians centered on support vectors. γ controls bump width."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "What is transfer learning with SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use features learned from one domain as input to SVM in another domain:"
    },
    {
     "t": "ol",
     "items": [
      "Extract features from pre-trained neural network",
      "Train SVM on these features for new task"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** CNN features + SVM was popular before end-to-end deep learning. Still useful for small target domain datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "How would you compare SVM with k-NN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "SVM",
      "k-NN"
     ],
     "rows": [
      [
       "Training",
       "Slow (optimization)",
       "None (lazy learner)"
      ],
      [
       "Prediction",
       "Fast (kernel: depends on n_sv)",
       "Slow (compare to all points)"
      ],
      [
       "Memory",
       "Store support vectors only",
       "Store entire dataset"
      ],
      [
       "Decision boundary",
       "Optimal hyperplane",
       "Local voting"
      ],
      [
       "Parameters",
       "C, γ, kernel",
       "k, distance metric"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is the relationship between SVM and logistic regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "Both are linear classifiers (with linear kernel)",
      "Both can be regularized",
      "**SVM:** Hinge loss → sparse support vectors, margin maximization",
      "**LR:** Log loss → probability estimates, all points contribute"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** As regularization increases, SVM and LR solutions converge. SVM focuses on boundary; LR uses all data."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

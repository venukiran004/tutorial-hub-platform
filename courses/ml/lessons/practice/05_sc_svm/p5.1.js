/* ============================================================================
   PRACTICE P5.1 — SVM, KNN and Naive Bayes · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/05_SVM_KNN_NaiveBayes.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p5.1",
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
   "n": "1",
   "q": "What is the core idea behind Support Vector Machines?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Find the hyperplane that maximizes the margin (distance) between the two closest points from different classes (support vectors)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Maximum margin → best generalization. Only support vectors determine the boundary — all other points are irrelevant."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What are support vectors?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The data points closest to the decision boundary. They \"support\" (define) the hyperplane."
    },
    {
     "t": "p",
     "text": "**Key properties:**"
    },
    {
     "t": "ol",
     "items": [
      "Removing a support vector changes the boundary",
      "Removing non-support vectors doesn't change anything",
      "The model is defined entirely by support vectors"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** This makes SVMs memory-efficient in high dimensions — only store support vectors."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is the margin and why do we want to maximize it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Margin = 2 / ||w|| (distance between the two parallel hyperplanes touching support vectors)."
    },
    {
     "t": "p",
     "text": "**Why maximize:** Larger margin → more confidence in separating classes → better generalization."
    },
    {
     "t": "p",
     "text": "**Explanation:** Maximizing margin = minimizing ||w|| subject to correct classification. Unique optimal solution."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What happens when data is not linearly separable?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use soft-margin SVM (C parameter) or kernel trick."
    },
    {
     "t": "p",
     "text": "**Soft-margin:** Allows some misclassification with penalty C."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Minimize: (1/2)||w||² + C * Σξ_i\nSubject to: y_i(wᵀx_i + b) ≥ 1 - ξ_i, ξ_i ≥ 0"
    },
    {
     "t": "p",
     "text": "**Explanation:** ξ_i (slack variables) allow points inside margin or on wrong side. C controls tradeoff."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What does the C parameter control in SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Large C:** Small margin, few misclassifications → may overfit",
      "**Small C:** Large margin, more misclassifications allowed → may underfit",
      "**C = penalty for each misclassified point**"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** C=∞ → hard margin (no misclassification). C→0 → all points on wrong side okay. Tune via cross-validation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is the kernel trick?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Computes dot products in high-dimensional space without explicitly transforming data."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "K(x_i, x_j) = φ(x_i) · φ(x_j)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Maps data to higher dimension where it becomes linearly separable. Kernel function avoids computational cost of actual transformation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the RBF (Gaussian) kernel?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "K(x_i, x_j) = exp(-γ||x_i - x_j||²)"
    },
    {
     "t": "ul",
     "items": [
      "γ controls the width of the Gaussian",
      "High γ: small radius → complex boundary → may overfit",
      "Low γ: large radius → smooth boundary → may underfit"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Maps data to infinite-dimensional space. Most popular non-linear kernel."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is the polynomial kernel?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "K(x_i, x_j) = (x_i · x_j + c)^d"
    },
    {
     "t": "ul",
     "items": [
      "d = degree of polynomial",
      "c = coefficient"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Equivalent to polynomial feature expansion but computed via dot products. Degree 2 or 3 common."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "When would you use different kernels?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Kernel",
      "When to Use"
     ],
     "rows": [
      [
       "Linear",
       "High-dimensional data (text), linearly separable"
      ],
      [
       "RBF",
       "Default choice, non-linear relationships"
      ],
      [
       "Polynomial",
       "Known polynomial relationship"
      ],
      [
       "Sigmoid",
       "Neural network-like behavior (rarely used)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Start with linear (fast), try RBF if insufficient. RBF with proper γ can approximate any boundary."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Why is feature scaling crucial for SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** SVMs rely on distance calculations. Unscaled features with different magnitudes dominate the optimization."
    },
    {
     "t": "p",
     "text": "**Example:** Feature A (0-1) vs Feature B (0-1000) → SVM's margin depends mostly on B."
    },
    {
     "t": "p",
     "text": "**Fix:** StandardScaler or MinMaxScaler before SVM."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without scaling, large-scale features contribute disproportionately to ||w||."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the dual formulation of SVM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Instead of minimizing ||w||, maximize:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L = Σα_i - (1/2)ΣΣ α_i α_j y_i y_j K(x_i, x_j)"
    },
    {
     "t": "p",
     "text": "Subject to: 0 ≤ α_i ≤ C, Σα_i y_i = 0"
    },
    {
     "t": "p",
     "text": "**Explanation:** Dual form uses dot products → kernel trick possible. Support vectors have α_i > 0."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the time complexity of SVM training?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "Standard SVM (SMO): O(n² × m) to O(n³ × m) where n = samples, m = features",
      "With kernel: O(n² × kernel_cost)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Doesn't scale well to large datasets (>100K samples). Use LinearSVC for large datasets with linear kernel."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the difference between SVC, LinearSVC, and SGDClassifier in sklearn?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**SVC:** Full kernel SVM, uses libsvm, O(n²-n³)",
      "**LinearSVC:** Linear kernel only, uses liblinear, faster for large data",
      "**SGDClassifier(loss='hinge'):** SGD-based linear SVM, scalable to millions of samples"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For linear SVM on large data: SGDClassifier >> LinearSVC >> SVC(kernel='linear')."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "How does SVM handle multi-class classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**One-vs-One (default in sklearn):** K(K-1)/2 classifiers, majority vote",
      "**One-vs-Rest:** K classifiers, highest confidence wins"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** OvO with n classes: n(n-1)/2 models, each trained on 2 classes. OvR: n models, each class vs all others."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is the hinge loss function?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "L = max(0, 1 - y × f(x))"
    },
    {
     "t": "ul",
     "items": [
      "If y×f(x) ≥ 1: loss = 0 (correctly classified with margin)",
      "If y×f(x) < 1: loss = 1 - y×f(x)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Only penalizes points inside or on wrong side of margin. Points beyond margin contribute zero loss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the effect of γ in RBF kernel?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Too large γ:** Decision boundary fits tightly around each point → overfitting",
      "**Too small γ:** Very smooth boundary → underfitting (essentially linear)",
      "**Optimal γ:** Captures true pattern without fitting noise"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** γ = 1/(2σ²). Large γ → narrow Gaussians → each support vector affects only nearby points."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How would you tune SVM hyperparameters?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import GridSearchCV\nparam_grid = {\n    'C': [0.01, 0.1, 1, 10, 100],\n    'gamma': ['scale', 'auto', 0.001, 0.01, 0.1],\n    'kernel': ['rbf', 'linear']\n}\ngrid = GridSearchCV(SVC(), param_grid, cv=5, scoring='accuracy')\ngrid.fit(X_train, y_train)"
    },
    {
     "t": "p",
     "text": "**Explanation:** C and gamma interact — search jointly. Use log scale for both."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "When would SVM outperform Random Forest?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "High-dimensional data with few samples (text classification)",
      "Clear margin of separation exists",
      "Small to medium datasets",
      "When decision boundary is complex but smooth"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** SVM excels in high-dimensional spaces and with clear margins. RF better for large data and mixed feature types."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the kernel matrix (Gram matrix)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Matrix K where K_ij = K(x_i, x_j). Size: n × n."
    },
    {
     "t": "p",
     "text": "**Properties:** Must be positive semi-definite for valid kernel."
    },
    {
     "t": "p",
     "text": "**Explanation:** Stores all pairwise kernel evaluations. O(n²) memory — problematic for large datasets. This is why SVMs don't scale well."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the nu-SVM formulation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Alternative to C-SVM where ν parameter controls:"
    },
    {
     "t": "ul",
     "items": [
      "Upper bound on fraction of margin errors",
      "Lower bound on fraction of support vectors",
      "ν ∈ (0, 1]"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** More intuitive than C — directly relates to proportion of support vectors/errors. ν = 0.1 means at most 10% errors."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "How does SVM handle regression (SVR)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Support Vector Regression creates ε-insensitive tube around function:"
    },
    {
     "t": "ul",
     "items": [
      "Points inside tube: zero loss",
      "Points outside tube: linear loss proportional to distance from tube"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Only cares about points outside ε-tube (those become support vectors). Robust to outliers within the tube."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is the ε (epsilon) parameter in SVR?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Width of the insensitive tube. Points within ε from prediction have zero error."
    },
    {
     "t": "ul",
     "items": [
      "**Large ε:** Wider tube → fewer support vectors → smoother fit",
      "**Small ε:** Narrow tube → more support vectors → tighter fit"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Trade-off between accuracy and model complexity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Can SVM output probabilities?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Not natively. Use Platt scaling to convert SVM scores to probabilities:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "model = SVC(probability=True)\nmodel.fit(X_train, y_train)\nproba = model.predict_proba(X_test)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Platt scaling fits sigmoid function to SVM decision values using cross-validation. Adds computational cost."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is the maximum margin interpretation geometrically?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Two parallel hyperplanes that separate two classes with the largest gap between them. The decision boundary is equidistant from both."
    },
    {
     "t": "p",
     "text": "**Math:** Margin = 2/||w||. Maximize margin → minimize ||w||."
    },
    {
     "t": "p",
     "text": "**Explanation:** Like finding the widest road between two groups. Cars (support vectors) on the edges define the road."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What happens when you apply SVM to data with many irrelevant features?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** SVM performance degrades because:"
    },
    {
     "t": "ol",
     "items": [
      "Distance calculations include irrelevant features",
      "Margin can be large along irrelevant dimensions",
      "Curse of dimensionality in kernel space"
     ]
    },
    {
     "t": "p",
     "text": "**Fix:** Feature selection before SVM, or use L1 penalty (LinearSVC with penalty='l1')."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

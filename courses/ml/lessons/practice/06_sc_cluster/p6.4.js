/* ============================================================================
   PRACTICE P6.4 — Clustering and Dimensionality Reduction · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/06_Clustering_and_DimReduction.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p6.4",
 "lede": "**25 scenarios** from Clustering and Dimensionality Reduction. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "How does NMF (Non-negative Matrix Factorization) work and when is it preferred?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Factorizes matrix X ≈ W × H where W, H have only non-negative values. Used when data is inherently non-negative (images, text counts)."
    },
    {
     "t": "p",
     "text": "**Explanation:** NMF produces parts-based representation (face = eyes + nose + mouth). More interpretable than PCA. Used in topic modeling, image processing, recommenders."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is the intrinsic dimensionality of a dataset?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The minimum number of dimensions needed to represent the data without significant information loss."
    },
    {
     "t": "p",
     "text": "**Estimation methods:**"
    },
    {
     "t": "ol",
     "items": [
      "PCA explained variance curve",
      "Correlation/fractal dimension",
      "Maximum likelihood estimation"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** 100 features might have intrinsic dimensionality of 10 if data lies on a 10D manifold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "Can you apply PCA to categorical data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** No — PCA requires continuous numeric data. For categorical data use:"
    },
    {
     "t": "ol",
     "items": [
      "**MCA (Multiple Correspondence Analysis):** PCA analog for categorical data",
      "**One-hot encode → PCA** (lossy, but sometimes practical)",
      "**FAMD:** Factor Analysis of Mixed Data"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** One-hot + PCA introduces artifacts but is commonly used in practice with awareness of limitations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is the difference between n_components=0.95 and n_components=10 in sklearn PCA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "`n_components=0.95` (float): Keep enough components to explain 95% of variance (adapts to data)",
      "`n_components=10` (int): Keep exactly 10 components regardless of variance explained"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Float is more flexible — automatically adjusts dimensionality. Integer gives fixed size output. Use float for robust pipelines."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "How would you use dimensionality reduction to speed up a KNN classifier?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.pipeline import Pipeline\nfrom sklearn.decomposition import PCA\nfrom sklearn.neighbors import KNeighborsClassifier\n\npipe = Pipeline([\n    ('pca', PCA(n_components=0.95)),\n    ('knn', KNeighborsClassifier(n_neighbors=5))\n])"
    },
    {
     "t": "p",
     "text": "**Explanation:** KNN distance calculation is O(n×d) per query. Reducing d from 500 to 20 gives 25× speedup. Also removes noise dimensions that confuse distance-based methods."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is the difference between PCA and Whitening (ZCA)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**PCA:** Projects onto principal components, optionally scales by eigenvalues",
      "**Whitening:** PCA + scaling each component to unit variance (divides by √eigenvalue)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Whitened data has identity covariance matrix — all components have equal scale. Useful as preprocessing for algorithms assuming uncorrelated, equal-variance features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "You have a 1000×50000 gene expression dataset. How would you approach dimensionality reduction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Variance filtering — remove low-variance genes",
      "PCA to reduce to ~50-100 components",
      "t-SNE/UMAP for visualization",
      "Feature selection using statistical tests (differential expression)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** n << p problem (1000 samples, 50000 features). At risk of overfitting. PCA is essential. Also consider sparse PCA or autoencoders."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "What is Sparse PCA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** PCA variant that produces components with few non-zero loadings (sparse). Uses L1 penalty."
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard PCA: each component is a linear combination of ALL features. Sparse PCA: each component uses a SUBSET of features → more interpretable. Controlled by `alpha` parameter."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "How does Multi-Dimensional Scaling (MDS) work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Finds low-dimensional embedding that preserves pairwise distances from original space. Minimizes stress (discrepancy between original and embedded distances)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Metric MDS: preserves actual distances. Non-metric MDS: preserves only ranking of distances. Classical MDS on Euclidean distances ≡ PCA."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is the curse of dimensionality specifically for distance-based methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** As dimensions increase:"
    },
    {
     "t": "ol",
     "items": [
      "All pairwise distances become approximately equal",
      "Nearest neighbor distance → farthest neighbor distance",
      "Volume of unit hypersphere → 0 relative to unit hypercube"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** In 100D, a \"near\" neighbor might be almost as far as the \"farthest\" point. k-NN, DBSCAN, K-Means all degrade. Dimensionality reduction before distance-based methods is critical."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What is the difference between linear and non-linear dimensionality reduction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Linear:** PCA, LDA, SVD, Factor Analysis — new features are linear combinations",
      "**Non-linear:** t-SNE, UMAP, Isomap, Kernel PCA, Autoencoders — can capture curved/complex structure"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Linear: faster, more interpretable, invertible. Non-linear: captures manifold structure but harder to interpret and slower."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is Laplacian Eigenmaps?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Builds weight graph of nearest neighbors, computes graph Laplacian, then finds eigenvectors for embedding. Preserves local distances."
    },
    {
     "t": "p",
     "text": "**Explanation:** Similar to spectral clustering. Connected points in graph stay close in embedding. Good for data on smooth manifolds. Related to spectral methods."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "When would you use random projections instead of PCA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When:"
    },
    {
     "t": "ol",
     "items": [
      "Speed is critical (random projection is O(nd k), PCA is O(nd min(n,d)))",
      "Data is very high dimensional",
      "Only approximate distance preservation needed",
      "Streaming data (no need to compute covariance)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Random projection: just multiply by random matrix. No fitting. Johnson-Lindenstrauss guarantees distance preservation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "What is the difference between global and local structure preservation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Global:** Large distances between distant points are preserved (PCA, Isomap, MDS)",
      "**Local:** Neighborhood relationships are preserved, global layout may distort (t-SNE, LLE)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** UMAP claims both. For visualization, local structure often more important. For downstream ML, global structure matters more."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "You reduced 100 features to 2 using t-SNE and see clear clusters. Does this prove real clusters exist?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** No — t-SNE can create artificial clusters from continuous/uniform data depending on perplexity."
    },
    {
     "t": "p",
     "text": "**Explanation:** t-SNE distortions: can break one cluster into pieces or merge separate clusters. Always validate clusters with proper clustering algorithms and metrics, not just visual inspection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is Incremental PCA and when do you need it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Processes data in batches — memory-efficient PCA for datasets that don't fit in memory."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.decomposition import IncrementalPCA\nipca = IncrementalPCA(n_components=50, batch_size=1000)\nfor batch in data_batches:\n    ipca.partial_fit(batch)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard PCA loads full data into memory. Incremental PCA processes chunks. Result similar to standard PCA for large datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "How would you visualize a 50-dimensional dataset?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "PCA to 2D for quick overview of variance structure",
      "t-SNE or UMAP for cluster visualization",
      "Parallel coordinates plot for feature patterns",
      "Heatmap of feature correlations",
      "Pairplot of top PCA components"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Use PCA first for sanity check, then t-SNE/UMAP for detailed cluster exploration. UMAP preferred for larger datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is the difference between PCA loadings and PCA scores?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Loadings:** How much each original feature contributes to each component (eigenvectors)",
      "**Scores:** The projected data in the new component space (data × loadings)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** High loading = feature strongly influences that component. Use loadings to interpret what each component represents."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "How does supervised dimensionality reduction work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Uses label information to find projections that optimize class separation:"
    },
    {
     "t": "ol",
     "items": [
      "**LDA:** Maximizes between-class / within-class variance ratio",
      "**Supervised UMAP:** Uses labels to influence neighbor graph",
      "**Neighborhood Component Analysis (NCA)**"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Supervised methods typically outperform unsupervised when labels available and task is classification."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is the difference between feature extraction using PCA and using an autoencoder?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "PCA",
      "Autoencoder"
     ],
     "rows": [
      [
       "Type",
       "Linear",
       "Non-linear"
      ],
      [
       "Training",
       "Eigendecomposition",
       "Gradient descent"
      ],
      [
       "Interpretability",
       "Higher (loadings)",
       "Lower (black box)"
      ],
      [
       "Flexibility",
       "Fixed",
       "Architecture choices"
      ],
      [
       "Speed",
       "Faster",
       "Slower"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Autoencoders learn richer representations for complex data. PCA is faster, deterministic, and sufficient for linearly structured data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is t-SVD (Tensor SVD) and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Extension of SVD to multi-dimensional arrays (tensors). Used for multi-way data — e.g., users × items × time."
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard SVD for matrices (2D). Tensor decomposition methods: CP decomposition, Tucker decomposition, t-SVD. Used in video data, social networks, recommendation systems."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "How would you handle dimensionality reduction for a mixed dataset (numerical + categorical)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**FAMD:** Factor Analysis of Mixed Data (combines PCA for numerical, MCA for categorical)",
      "One-hot encode categoricals, standardize everything, then PCA",
      "Separate reduction: PCA on numerical, MCA on categorical, then combine"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** FAMD from prince library is purpose-built. One-hot + PCA is practical but increases dimensionality first."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is the out-of-sample extension problem in dimensionality reduction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Some methods can't transform new unseen data — they only embed the training points."
    },
    {
     "t": "ul",
     "items": [
      "**Has extension:** PCA, UMAP, NMF (use `.transform()`)",
      "**No extension:** t-SNE, Isomap (must recompute with new data)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For production ML pipelines, need `.transform()` capability. t-SNE for exploration only."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the relationship between PCA and the covariance matrix?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** PCA components are eigenvectors of the covariance matrix, ordered by eigenvalues (variance explained)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Steps: 1) Center data. 2) Compute covariance matrix C = X^T X / (n-1). 3) Eigendecompose: C = VΛV^T. 4) V = principal directions, Λ = variances."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "You apply dimensionality reduction as part of an ML pipeline. What's a critical mistake to avoid?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Fitting the reduction on the full dataset (including test data) before splitting — data leakage."
    },
    {
     "t": "p",
     "text": "**Explanation:** Correct: fit PCA/UMAP on training data only, then transform both train and test. Use `Pipeline` + `cross_val_score` to ensure proper handling."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pipe = Pipeline([\n    ('pca', PCA(n_components=20)),\n    ('clf', RandomForestClassifier())\n])\ncross_val_score(pipe, X, y, cv=5)  # PCA fits only on each fold's train"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

/* ============================================================================
   PRACTICE P6.2 — Clustering and Dimensionality Reduction · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/06_Clustering_and_DimReduction.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p6.2",
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
   "n": "26",
   "q": "You cluster customer data and get 8 clusters. How would you profile/interpret them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Compute cluster centroids (mean/median of each feature per cluster)",
      "Compare feature distributions across clusters",
      "Statistical tests for feature differences",
      "Assign business labels (\"High-value frequent buyers\", \"Discount hunters\")",
      "Visualization with radar/spider charts"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Interpretability is key for business adoption. Create customer personas from cluster profiles."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is HDBSCAN and how does it improve over DBSCAN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Hierarchical DBSCAN — doesn't require fixed eps parameter. Builds hierarchy of clusters at all density levels, then extracts stable clusters."
    },
    {
     "t": "p",
     "text": "**Explanation:** Handles varying density clusters. Only one parameter: min_cluster_size. More robust, produces outlier scores instead of binary labels."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is the difference between clustering and classification?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Classification:** Supervised — learns from labeled data to predict predefined categories",
      "**Clustering:** Unsupervised — discovers natural groupings without labels"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Classification maps input to known output. Clustering explores data structure. Clustering can serve as feature engineering for classification."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "How would you handle categorical features in K-Means?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** K-Means works only with numerical data. Options:"
    },
    {
     "t": "ol",
     "items": [
      "**K-Modes:** Uses mode instead of mean, hamming distance",
      "**K-Prototypes:** Handles mixed numerical + categorical",
      "Encode categoricals (one-hot, then scale)",
      "Use Gower distance with other algorithms"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** One-hot encoding inflates dimensionality and can distort distances. K-Modes/Prototypes purpose-built for this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What are the assumptions of K-Means clustering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Clusters are spherical (isotropic)",
      "Clusters are of similar size/density",
      "Features are scaled similarly",
      "Number of clusters K is known",
      "Data is not heavily outlier-contaminated"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Violations: elongated clusters → GMM. Different sizes → may split large cluster or merge small ones. Outliers → pull centroids."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "How does the Elbow method work and what are its limitations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Plot inertia (within-cluster sum of squares) vs K. The \"elbow\" = where adding more clusters stops improving much."
    },
    {
     "t": "p",
     "text": "**Limitations:**"
    },
    {
     "t": "ol",
     "items": [
      "Elbow can be unclear/gradual",
      "Subjective — different people see different elbows",
      "Doesn't account for cluster shape quality"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Best combined with silhouette analysis. Use kneed library for automatic elbow detection."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "What is cluster stability and how do you measure it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** How much clusters change when data is perturbed/resampled. Stable clusters = real structure; unstable = random partitioning."
    },
    {
     "t": "p",
     "text": "**Measurement:**"
    },
    {
     "t": "ol",
     "items": [
      "Bootstrap resampling — cluster subsamples, compute ARI",
      "Add noise — recluster, measure consistency",
      "Cross-validation for clustering"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Stability analysis is underused but important for validating clusters represent real patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "You apply K-Means to image pixels [R, G, B] for color quantization. What does K represent?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** K = number of colors in the resulting image. Each pixel gets assigned to nearest centroid color."
    },
    {
     "t": "p",
     "text": "**Explanation:** K=16: reduces image to 16 colors. Each cluster centroid is a representative color. Classic application of K-Means — simple, effective, and visually interpretable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "How would you cluster time series data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Feature extraction first (mean, std, trend, seasonality) → standard clustering",
      "DTW (Dynamic Time Warping) distance → hierarchical clustering",
      "Shape-based clustering (k-Shape)",
      "Subsequence clustering"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Euclidean distance fails with shifted/scaled time series. DTW aligns sequences for meaningful distance. tslearn library provides tools."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What is the difference between K-Means and K-Medoids (PAM)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**K-Means:** Centroid = mean of cluster points (may not be an actual data point)",
      "**K-Medoids:** Centroid = actual data point (medoid) that minimizes total distance"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** K-Medoids: more robust to outliers, works with any distance metric (not just Euclidean), but slower O(n²k)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "You need to cluster 10 million data points. Which algorithm would you choose?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Mini-Batch K-Means or BIRCH (Balanced Iterative Reducing and Clustering using Hierarchies)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Full K-Means is expensive at this scale. BIRCH builds a compact summary (CF tree) in one pass. For density-based: subsample + HDBSCAN, or use approximate methods."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is Affinity Propagation and when is it useful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Passes \"preference\" and \"responsibility\" messages between data points to find exemplars. Automatically determines number of clusters."
    },
    {
     "t": "p",
     "text": "**Explanation:** No need to specify K. Based on similarity matrix. Downsides: O(n²) time/space, sensitive to preference parameter. Good for small-medium datasets where natural cluster count is unknown."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "How would you validate that your clustering captures meaningful segments vs random noise?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Compare silhouette score to random permutation baseline",
      "Gap statistic (compares to uniform reference)",
      "Prediction strength across train/test split",
      "Check if clusters differ on held-out features not used in clustering"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** If clusters don't predict anything useful or aren't stable, they may reflect noise, not structure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is the difference between UMAP and t-SNE for cluster visualization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**t-SNE:** Better local structure preservation, slow, non-deterministic",
      "**UMAP:** Preserves both local and global structure, faster, more reproducible"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Both are nonlinear dimensionality reduction for 2D visualization of clusters. UMAP increasingly preferred. Neither should be used to determine cluster count."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is Mean Shift clustering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Shifts each point toward the densest region in its neighborhood (mean of nearby points). Converges to cluster modes/peaks."
    },
    {
     "t": "p",
     "text": "**Explanation:** Automatically determines number of clusters. No cluster shape assumption. Requires bandwidth parameter. Slow for large datasets O(n²). Good when clusters have clear density peaks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "How would you handle the issue of K-Means getting stuck in local optima?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Run multiple times with different initializations (`n_init=10+`)",
      "Use K-Means++ initialization",
      "Try global optimization (e.g., genetic algorithm initialization)",
      "Use hierarchical clustering to initialize centroids"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** K-Means optimizes a non-convex objective. Multiple restarts with best result is standard practice."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is consensus clustering (cluster ensemble)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Run multiple clustering algorithms/runs, combine results into a consensus. Points frequently in the same cluster across runs get assigned together."
    },
    {
     "t": "p",
     "text": "**Explanation:** More robust than single run. Reduces sensitivity to algorithm choice, initialization, and parameters. Uses co-association matrix."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "When would you use Bisecting K-Means?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When you want a divisive hierarchical approach. Repeatedly picks a cluster and splits it into 2 using K-Means."
    },
    {
     "t": "p",
     "text": "**Explanation:** Faster than full agglomerative. More interpretable than flat K-Means. Available in scikit-learn as `BisectingKMeans`. Good for medium datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "How do you measure cluster cohesion and separation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Cohesion:** Avg distance of points to own centroid (within-cluster sum of squares)",
      "**Separation:** Distance between cluster centroids (between-cluster sum of squares)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Good clustering = low cohesion + high separation. Silhouette combines both. Trade-off: more clusters always reduces cohesion."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is the role of distance metrics in clustering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Choice of distance metric fundamentally changes what \"similar\" means:"
    },
    {
     "t": "ul",
     "items": [
      "**Euclidean:** Geometric distance (most common)",
      "**Manhattan:** Grid-like distance (robust to high dimensions)",
      "**Cosine:** Angle-based (for text/sparse data)",
      "**Mahalanobis:** Accounts for feature correlations"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** K-Means assumes Euclidean. Other algorithms accept arbitrary metrics. Match metric to data characteristics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "You cluster documents by topic. What distance metric and algorithm would you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Distance:** Cosine similarity (handles varying document lengths)",
      "**Features:** TF-IDF vectors",
      "**Algorithm:** Spherical K-Means or LDA (Latent Dirichlet Allocation) for topic modeling"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Euclidean on TF-IDF is problematic due to high dimensionality and sparse vectors. Cosine normalizes for document length."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the OPTICS algorithm?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Ordering Points To Identify Clustering Structure. Like DBSCAN but doesn't need fixed eps. Creates a reachability plot that reveals clusters at multiple density levels."
    },
    {
     "t": "p",
     "text": "**Explanation:** Reachability distances ordered by processing — valleys in the plot = clusters, peaks = cluster boundaries. More informative than DBSCAN for exploring density structure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "How would you use clustering results as features for a supervised model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Cluster assignment as a categorical feature (one-hot encoded)",
      "Distance to each centroid as continuous features",
      "Cluster membership probability (from GMM)",
      "Run clustering on train only, transform test using fitted model"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** This is a form of representation learning. Clusters capture latent structure the supervised model can exploit."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What are the limitations of the silhouette score?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Assumes convex clusters (penalizes DBSCAN-type shapes)",
      "O(n²) computation for pairwise distances",
      "Averages can hide poor individual assignments",
      "Not meaningful for density-based or overlapping clusters"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Always look at per-sample silhouette plots, not just average. Use DBCV for density-based clustering evaluation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "How would you implement an end-to-end customer segmentation pipeline?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# 1. Preprocess\nscaler = StandardScaler()\nX_scaled = scaler.fit_transform(X)\n\n# 2. Dimensionality reduction\npca = PCA(n_components=0.95)\nX_reduced = pca.fit_transform(X_scaled)\n\n# 3. Determine K (elbow + silhouette)\n# 4. Cluster\nkmeans = KMeans(n_clusters=4, init='k-means++', n_init=10)\nlabels = kmeans.fit_predict(X_reduced)\n\n# 5. Profile clusters\ndf['cluster'] = labels\nprofiles = df.groupby('cluster').mean()\n\n# 6. Validate stability with bootstrap"
    },
    {
     "t": "p",
     "text": "**Explanation:** Production pipeline also needs monitoring for cluster drift, re-clustering schedule, and business KPI tracking per segment."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

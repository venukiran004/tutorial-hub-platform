/* ============================================================================
   PRACTICE P6.1 — Clustering and Dimensionality Reduction · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/06_Clustering_and_DimReduction.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p6.1",
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
   "n": "1",
   "q": "You run K-Means with K=3 on a dataset and get different results each run. Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** K-Means initialization is random — different initial centroids lead to different local optima."
    },
    {
     "t": "p",
     "text": "**Explanation:** Fix with `n_init=10` (runs 10 times, picks best) or use `init='k-means++'` which selects initial centroids spread apart. Set `random_state` for reproducibility."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "How does K-Means++ improve over random initialization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** K-Means++ selects initial centroids that are far apart from each other, reducing the chance of poor convergence."
    },
    {
     "t": "p",
     "text": "**Explanation:** Algorithm: pick first centroid randomly, then pick subsequent centroids with probability proportional to squared distance from nearest existing centroid. Results in faster convergence and better optima."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Your K-Means produces one giant cluster and two tiny clusters. What's likely wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Outliers or skewed feature distributions pulling centroids. Features may not be scaled."
    },
    {
     "t": "p",
     "text": "**Explanation:** K-Means is sensitive to scale and outliers. Always StandardScale before clustering. Consider removing outliers or using a robust algorithm like DBSCAN."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "How do you determine the optimal number of clusters K?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Elbow method:** Plot inertia vs K, find \"elbow\" point",
      "**Silhouette score:** Average silhouette coefficient for each K",
      "**Gap statistic:** Compare within-cluster dispersion to null reference",
      "**Domain knowledge:** Business-driven cluster count"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** No single method is definitive. Combine quantitative metrics with domain expertise. Silhouette > 0.5 generally indicates good clustering."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What does a negative silhouette score for a data point mean?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The point is closer to a neighboring cluster than to its own assigned cluster — it's likely misassigned."
    },
    {
     "t": "p",
     "text": "**Explanation:** Silhouette: s(i) = (b(i) - a(i)) / max(a(i), b(i)). a(i) = avg distance to same-cluster points. b(i) = avg distance to nearest other cluster. s < 0 means a > b."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "When would you choose DBSCAN over K-Means?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "Data has non-spherical/arbitrary-shaped clusters",
      "Unknown number of clusters",
      "Need to detect outliers/noise",
      "Clusters have varying densities (partially)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** K-Means assumes spherical, equal-sized clusters. DBSCAN finds density-based clusters of any shape and labels outliers as noise."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What are the two key parameters of DBSCAN and how do you choose them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**eps (ε):** Maximum neighborhood distance",
      "**min_samples:** Minimum points to form a dense region"
     ]
    },
    {
     "t": "p",
     "text": "**Choosing:** k-distance plot — plot sorted distance to k-th nearest neighbor, find the \"elbow\". min_samples ≥ dimensions + 1 as rule of thumb."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "DBSCAN assigns most of your points as noise (-1). What should you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** eps is too small or min_samples is too high. Increase eps or decrease min_samples. Also check if data is scaled."
    },
    {
     "t": "p",
     "text": "**Explanation:** Use k-distance plot to find appropriate eps. If data genuinely has no dense clusters, DBSCAN may not be appropriate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is the limitation of DBSCAN with varying density clusters?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** DBSCAN uses a global eps — can't handle clusters with significantly different densities. Dense clusters get merged, sparse clusters get labeled as noise."
    },
    {
     "t": "p",
     "text": "**Explanation:** Solution: HDBSCAN (Hierarchical DBSCAN) adapts density threshold per cluster. OPTICS also handles varying densities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is hierarchical clustering and what are the two main approaches?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Agglomerative (bottom-up):** Start with each point as its own cluster, merge closest pairs iteratively",
      "**Divisive (top-down):** Start with all points in one cluster, split iteratively"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Agglomerative is more common. Results visualized as a dendrogram. Cut dendrogram at chosen height to get desired number of clusters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What are the different linkage methods in hierarchical clustering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Single linkage:** Min distance between clusters (can create chain effect)",
      "**Complete linkage:** Max distance (creates compact clusters)",
      "**Average linkage:** Mean distance between all pairs",
      "**Ward's linkage:** Minimizes within-cluster variance (similar to K-Means)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Ward's is most common for spherical clusters. Single linkage good for elongated/irregular shapes but suffers chaining."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "How do you read a dendrogram to determine number of clusters?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Look for the longest vertical lines (largest gaps) — horizontal cuts through these gaps give natural cluster numbers. The height of merge represents dissimilarity."
    },
    {
     "t": "p",
     "text": "**Explanation:** Cut at height where adding more clusters doesn't significantly reduce within-cluster distance. Inconsistency coefficient also helps."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the time complexity of K-Means vs Agglomerative Clustering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**K-Means:** O(n × K × d × iterations) — roughly linear in n",
      "**Agglomerative:** O(n³) time, O(n²) space for naive implementation"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** K-Means scales well to large datasets. Agglomerative impractical for n > ~10,000 without optimizations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "When would you use Gaussian Mixture Models (GMM) instead of K-Means?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "Clusters have different shapes/orientations (elliptical)",
      "Need soft/probabilistic cluster assignments",
      "Clusters overlap significantly",
      "Need cluster assignment confidence"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** GMM models clusters as Gaussian distributions with different covariances. K-Means is a special case of GMM (spherical, equal covariance, hard assignment)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What does the covariance_type parameter in GMM control?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**'full':** Each cluster has own covariance matrix (most flexible, most parameters)",
      "**'tied':** All clusters share one covariance matrix",
      "**'diag':** Diagonal covariance (features independent within cluster)",
      "**'spherical':** Single variance per cluster (equivalent to K-Means)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** 'full' captures correlations but needs more data. 'diag' is a good middle ground."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "How do you choose number of components in GMM?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use information criteria:"
    },
    {
     "t": "ul",
     "items": [
      "**BIC (Bayesian Information Criterion):** Penalizes model complexity more — preferred",
      "**AIC (Akaike Information Criterion):** Less penalty for complexity"
     ]
    },
    {
     "t": "p",
     "text": "Pick the number of components that minimizes BIC/AIC."
    },
    {
     "t": "p",
     "text": "**Explanation:** Lower BIC = better trade-off between fit and complexity. Silhouette score also applicable."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "What is the difference between hard and soft clustering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Hard:** Each point belongs to exactly one cluster (K-Means, DBSCAN)",
      "**Soft (fuzzy):** Each point has probabilities of belonging to each cluster (GMM, Fuzzy C-Means)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Soft clustering useful when boundaries are unclear — a customer might be 60% \"budget\" and 40% \"mid-range\" shopper."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "You have customer data with features: [age, income, purchase_amount]. Income ranges 20K-200K, age 18-80, purchase 5-50. K-Means gives poor results. Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Feature scales are vastly different — income dominates distance calculations. Must standardize features first."
    },
    {
     "t": "p",
     "text": "**Explanation:** K-Means uses Euclidean distance. Income difference of 1000 vs age difference of 1 — income controls all assignments."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is the Calinski-Harabasz Index?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Ratio of between-cluster variance to within-cluster variance. Higher = better separation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Also called Variance Ratio Criterion. Fast to compute, favors convex clusters. Compare across different K values. Unlike silhouette, no bounded range."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the Davies-Bouldin Index?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Average similarity ratio of each cluster with most similar cluster. Lower = better separation."
    },
    {
     "t": "p",
     "text": "**Explanation:** For each cluster, computes ratio of within-cluster scatter to between-cluster distance. 0 = perfect but unachievable. Doesn't require distance matrix — faster than silhouette for large n."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "When would you use spectral clustering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When clusters are non-convex, connected by narrow bridges, or defined by graph structure rather than distance to centroid."
    },
    {
     "t": "p",
     "text": "**Explanation:** Uses eigenvalues of similarity/affinity matrix. Can find interlocking spirals, concentric circles. K-Means on spectral embeddings. Slow for large n."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is the Mini-Batch K-Means and when to use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Uses random mini-batches of data for centroid updates instead of full dataset. Use when n > 10,000."
    },
    {
     "t": "p",
     "text": "**Explanation:** Much faster than K-Means with slight quality trade-off. Convergence is noisier but practical for large-scale applications."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "How do you evaluate clustering when you have no ground truth labels?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Internal metrics:** Silhouette score, Calinski-Harabasz, Davies-Bouldin, inertia",
      "**Stability:** Run multiple times, measure consistency",
      "**Visual inspection:** PCA/t-SNE projections",
      "**Domain validation:** Do clusters make business sense?"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Clustering is inherently subjective. Multiple metrics may disagree. Business utility is the ultimate measure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How do you evaluate clustering when you DO have ground truth labels?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Adjusted Rand Index (ARI):** Measures agreement between clusters and labels, adjusted for chance",
      "**Normalized Mutual Information (NMI):** Measures shared information",
      "**Homogeneity / Completeness / V-measure**",
      "**Fowlkes-Mallows Index**"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ARI ranges [-1, 1], 0 = random assignment, 1 = perfect match. NMI ranges [0, 1]."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is the curse of dimensionality in clustering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** In high dimensions, distances between points become nearly equal, making distance-based clustering meaningless."
    },
    {
     "t": "p",
     "text": "**Explanation:** As dimensions increase, all pairwise distances converge. Solutions: dimensionality reduction (PCA, UMAP) before clustering, feature selection, or subspace clustering."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

/* ============================================================================
   PRACTICE P6.3 — Clustering and Dimensionality Reduction · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/06_Clustering_and_DimReduction.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p6.3",
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
   "n": "51",
   "q": "You have a dataset with 500 features. Training takes hours and performance is poor. What should you do first?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Apply dimensionality reduction — PCA, feature selection, or both. High dimensionality causes curse of dimensionality, overfitting, and computational overhead."
    },
    {
     "t": "p",
     "text": "**Explanation:** Start with removing zero-variance features and highly correlated pairs, then apply PCA or use feature importance from a tree model."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What is PCA and what does it optimize?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Principal Component Analysis finds orthogonal directions (principal components) that maximize variance in the data. Projects data onto these directions."
    },
    {
     "t": "p",
     "text": "**Explanation:** PCA solves for eigenvectors of the covariance matrix. PC1 captures most variance, PC2 captures next most (orthogonal to PC1), etc. Linear transformation — can't capture non-linear structure."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "You apply PCA and the first component explains 95% of variance. What does this mean?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Data is mostly one-dimensional — nearly all variation occurs along one direction. Other features are nearly constant or highly correlated."
    },
    {
     "t": "p",
     "text": "**Explanation:** May indicate one dominant feature or strong correlations. Check if one component is sufficient or if remaining 5% contains important signal."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "How do you choose the number of components in PCA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Explained variance ratio:** Keep components explaining ≥ 95% cumulative variance",
      "**Scree plot:** Plot explained variance per component, find \"elbow\"",
      "**Kaiser's rule:** Keep components with eigenvalue > 1",
      "**Cross-validation:** Downstream model performance with different n_components"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** 95% is a common threshold but domain-dependent. For visualization, use 2-3 components."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What preprocessing is required before applying PCA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Standardization (mean=0, variance=1) is essential. PCA is scale-sensitive."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without scaling, features with larger variance dominate principal components regardless of importance. Only skip if features are already on same scale."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is the difference between PCA and LDA (Linear Discriminant Analysis)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**PCA:** Unsupervised — maximizes variance, ignores labels",
      "**LDA:** Supervised — maximizes class separation (between-class variance / within-class variance)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** PCA for general dimensionality reduction. LDA when goal is classification — projects onto directions that best separate classes. LDA limited to c-1 components (c = number of classes)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "When would you use Kernel PCA instead of standard PCA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When data has non-linear structure that PCA can't capture. Kernel PCA applies kernel trick to perform PCA in higher-dimensional feature space."
    },
    {
     "t": "p",
     "text": "**Explanation:** Two concentric circles: PCA fails (linear), Kernel PCA with RBF kernel separates them. Kernels: RBF, polynomial, sigmoid. Computationally more expensive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is t-SNE and what are its main limitations?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** t-Distributed Stochastic Neighbor Embedding — non-linear dimensionality reduction for visualization (2D/3D)."
    },
    {
     "t": "p",
     "text": "**Limitations:**"
    },
    {
     "t": "ol",
     "items": [
      "Non-deterministic (stochastic optimization)",
      "Doesn't preserve global structure",
      "Perplexity parameter sensitive",
      "Can't transform new data points",
      "Slow O(n²) — not for large n"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Great for visualizing clusters in high-dimensional data. Don't interpret distances between clusters or cluster sizes in t-SNE."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What does the perplexity parameter in t-SNE control?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Roughly the number of effective nearest neighbors. Balances local vs global structure."
    },
    {
     "t": "ul",
     "items": [
      "Low perplexity (5-10): Focus on very local structure",
      "High perplexity (30-50): More global view"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Typical range: 5-50. Should be less than n. Try multiple values — t-SNE results can change dramatically. Perplexity ≈ 30 is common default."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is UMAP and how does it compare to t-SNE?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Uniform Manifold Approximation and Projection. Non-linear reduction like t-SNE but:"
    },
    {
     "t": "ol",
     "items": [
      "Preserves both local AND global structure",
      "Much faster",
      "Can transform new data (has `.transform()`)",
      "Supports supervised/semi-supervised mode"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** UMAP increasingly preferred over t-SNE. Key params: `n_neighbors` (local structure control), `min_dist` (point spread)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "Why can't you use t-SNE components as features for a supervised model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "t-SNE can't transform unseen test data",
      "Distorts distances — components don't have meaningful scale",
      "Non-deterministic — different runs give different embeddings",
      "Primarily for visualization, not feature engineering"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Use PCA, UMAP, or autoencoders for feature extraction. t-SNE is for exploratory visualization only."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is the Johnson-Lindenstrauss lemma and how does it relate to random projections?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** States that n points in high-dimensional space can be projected to O(log n / ε²) dimensions while preserving pairwise distances within (1 ± ε) factor."
    },
    {
     "t": "p",
     "text": "**Explanation:** Random Projection: multiply data by random matrix. Fast, no fitting needed. Quality guaranteed by J-L lemma. Good for very high dimensional, sparse data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is an autoencoder and how is it used for dimensionality reduction?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Neural network trained to reconstruct its input through a bottleneck layer. The bottleneck learns a compressed representation."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Input(500) → Encoder → Bottleneck(20) → Decoder → Output(500)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Non-linear dimensionality reduction. More flexible than PCA. The bottleneck layer is the reduced representation. Variational autoencoders (VAE) provide probabilistic embeddings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is the difference between feature extraction and feature selection?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Feature extraction:** Creates NEW features from original ones (PCA, t-SNE, autoencoders)",
      "**Feature selection:** Selects a SUBSET of original features (filter, wrapper, embedded methods)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Feature extraction: transformed features not interpretable. Feature selection: preserved original features, easier to interpret."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "You apply PCA to a 100-feature dataset and get 100 components. What would you expect?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Eigenvalues decrease, cumulative explained variance approaches 100%. First few components capture most variance. Last components capture noise."
    },
    {
     "t": "p",
     "text": "**Explanation:** PCA doesn't reduce features unless you decide to keep fewer. It reorders variance — you choose how many components to retain."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is Independent Component Analysis (ICA) and when is it used instead of PCA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** ICA finds components that are statistically INDEPENDENT (not just uncorrelated). Used for blind source separation."
    },
    {
     "t": "p",
     "text": "**Explanation:** Classic: separating mixed audio signals (cocktail party problem). PCA: uncorrelated components explaining variance. ICA: independent components, no ordering by importance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is the difference between SVD and PCA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Mathematically equivalent for centered data. PCA uses eigendecomposition of covariance matrix. SVD directly decomposes the data matrix X = UΣV^T."
    },
    {
     "t": "p",
     "text": "**Explanation:** SVD is numerically more stable and can handle non-square matrices. sklearn PCA uses SVD internally. Truncated SVD works on sparse matrices (no centering needed)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "When would you use Truncated SVD instead of PCA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For sparse matrices (e.g., TF-IDF text data). PCA requires centering which destroys sparsity. Truncated SVD works directly on sparse input."
    },
    {
     "t": "p",
     "text": "**Explanation:** Also called LSA (Latent Semantic Analysis) when applied to text. Faster for sparse data. Doesn't center data — components may not have zero mean."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is the reconstruction error in PCA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The difference between original data and its PCA reconstruction using k < d components. Measured as ||X - X_reconstructed||²."
    },
    {
     "t": "p",
     "text": "**Explanation:** Lower k → higher reconstruction error but simpler representation. Choose k to balance information preservation (low error) and dimensionality reduction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "You apply PCA and plot the explained variance. It's nearly uniform across all components. What does this mean?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Features are nearly independent with similar variances — no dominant direction of variation. PCA won't help much for dimensionality reduction."
    },
    {
     "t": "p",
     "text": "**Explanation:** Uniform explained variance = isotropic data. Dimensionality is intrinsically high. Consider non-linear methods or domain-specific feature engineering instead."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is manifold learning?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Assumes high-dimensional data lies on a lower-dimensional manifold (surface). Algorithms: Isomap, LLE, Laplacian Eigenmaps, t-SNE, UMAP."
    },
    {
     "t": "p",
     "text": "**Explanation:** Swiss roll: 3D data that's really 2D (unrolled). Linear methods (PCA) fail. Manifold methods preserve the intrinsic geometry."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is Isomap and how does it work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Builds k-nearest-neighbor graph, computes geodesic (shortest path) distances, then applies MDS (Multi-Dimensional Scaling) on geodesic distances."
    },
    {
     "t": "p",
     "text": "**Explanation:** Preserves global geodesic structure unlike t-SNE. Requires connected graph. Sensitive to noise and holes in the manifold. Good for smooth, continuous manifolds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "What is Locally Linear Embedding (LLE)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Reconstructs each point as a linear combination of its k nearest neighbors, then finds low-dimensional embedding preserving these linear relationships."
    },
    {
     "t": "p",
     "text": "**Explanation:** Assumes local linearity. Struggles with non-uniform sampling density. Computationally lighter than Isomap. Variants: Modified LLE, Hessian LLE."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "You applied PCA and the model performance dropped. What might have happened?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Important discriminative information was in low-variance components that got discarded",
      "Non-linear relationships were lost (PCA is linear)",
      "Too few components retained",
      "Class separation was along minor variance directions"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** PCA maximizes variance, not predictive power. Use supervised methods (LDA) or check if key features were preserved."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is Factor Analysis and how does it differ from PCA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**PCA:** Data = components + noise (all variance explained by components)",
      "**FA:** Data = latent factors + unique noise per feature (separates common variance from unique variance)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** FA assumes a generative model. Better for understanding latent constructs (like intelligence from test scores). PCA better for dimensionality reduction."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

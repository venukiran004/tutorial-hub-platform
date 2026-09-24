/* ============================================================================
   INTERVIEW I1.1 — Section 1: Linear Algebra
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/02_Mathematics_and_Statistics/00_Interview_Bank/01_Math_and_Stats_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.1",
 "lede": "**15 questions** from Mathematics and Statistics Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the reference answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Section 1: Linear Algebra",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What is an eigenvalue and eigenvector? Why do they matter in ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For a square matrix \\(A\\), an eigenvector \\(\\mathbf{v}\\) satisfies \\(A\\mathbf{v} = \\lambda\\mathbf{v}\\), where \\(\\lambda\\) is the eigenvalue. The matrix stretches the eigenvector by \\(\\lambda\\) without changing its direction."
    },
    {
     "t": "p",
     "text": "**ML applications:**"
    },
    {
     "t": "ul",
     "items": [
      "**PCA:** Eigenvectors of the covariance matrix define principal components; eigenvalues indicate variance explained",
      "**PageRank:** Dominant eigenvector of the link matrix gives page importance",
      "**Spectral clustering:** Eigenvectors of the graph Laplacian define cluster structure",
      "**Stability analysis:** Eigenvalues of the Hessian determine convergence of optimization"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Explain Singular Value Decomposition (SVD) and its applications.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Any matrix \\(A_{m \\times n}\\) can be decomposed as:"
    },
    {
     "t": "math",
     "tex": "A = U \\Sigma V^T"
    },
    {
     "t": "ul",
     "items": [
      "\\(U\\) (\\(m \\times m\\)): Left singular vectors (orthonormal) — column space",
      "\\(\\Sigma\\) (\\(m \\times n\\)): Diagonal matrix of singular values \\(\\sigma_1 \\geq \\sigma_2 \\geq \\dots \\geq 0\\)",
      "\\(V^T\\) (\\(n \\times n\\)): Right singular vectors (orthonormal) — row space"
     ]
    },
    {
     "t": "p",
     "text": "**Applications:**"
    },
    {
     "t": "table",
     "head": [
      "Application",
      "How SVD is used"
     ],
     "rows": [
      [
       "PCA",
       "SVD on centered data gives principal components directly"
      ],
      [
       "Recommender systems",
       "Low-rank approximation of user-item matrix"
      ],
      [
       "Image compression",
       "Keep top-\\(k\\) singular values, discard rest"
      ],
      [
       "Pseudoinverse",
       "\\(A^+ = V\\Sigma^+ U^T\\) for least squares"
      ],
      [
       "Latent Semantic Analysis",
       "Reduce term-document matrix dimensionality"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is a positive definite matrix? Why is it important?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A symmetric matrix \\(A\\) is positive definite if \\(\\mathbf{x}^T A \\mathbf{x} > 0\\) for all nonzero \\(\\mathbf{x}\\). Equivalently, all eigenvalues are positive."
    },
    {
     "t": "p",
     "text": "**Importance in ML:**"
    },
    {
     "t": "ul",
     "items": [
      "Covariance matrices must be positive semi-definite (PSD)",
      "Kernel matrices (Gram matrices) must be PSD for valid kernels",
      "The Hessian being positive definite at a point guarantees a local minimum",
      "Cholesky decomposition only works on positive definite matrices"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Explain the difference between rank, null space, and column space.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Rank:** Number of linearly independent rows (or columns). \\(\\text{rank}(A) = \\dim(\\text{column space})\\)",
      "**Column space (range):** Set of all possible outputs \\(A\\mathbf{x}\\). Dimension = rank",
      "**Null space (kernel):** Set of all \\(\\mathbf{x}\\) such that \\(A\\mathbf{x} = \\mathbf{0}\\). Dimension = \\(n - \\text{rank}(A)\\) (rank-nullity theorem)"
     ]
    },
    {
     "t": "p",
     "text": "**ML relevance:** If your feature matrix has rank < number of features, you have multicollinearity. The null space tells you which feature combinations are redundant."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the condition number of a matrix and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The condition number is \\(\\kappa(A) = \\frac{\\sigma_{\\max}}{\\sigma_{\\min}}\\) (ratio of largest to smallest singular value)."
    },
    {
     "t": "ul",
     "items": [
      "\\(\\kappa \\approx 1\\): Well-conditioned — small input changes → small output changes",
      "\\(\\kappa \\gg 1\\): Ill-conditioned — numerically unstable"
     ]
    },
    {
     "t": "p",
     "text": "**ML impact:** Ill-conditioned feature matrices cause:"
    },
    {
     "t": "ul",
     "items": [
      "Unstable regression coefficients",
      "Slow convergence in gradient descent",
      "Numerical errors in matrix inversions"
     ]
    },
    {
     "t": "p",
     "text": "**Fix:** Feature scaling, regularization, or SVD-based pseudoinverse."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How does matrix multiplication relate to neural networks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A fully connected layer computes \\(\\mathbf{y} = W\\mathbf{x} + \\mathbf{b}\\), which is an affine transformation. The weight matrix \\(W\\) performs:"
    },
    {
     "t": "ul",
     "items": [
      "**Rotation/reflection** (orthogonal component)",
      "**Scaling** (singular values)",
      "**Projection** (if output dim < input dim)"
     ]
    },
    {
     "t": "p",
     "text": "A deep network is a composition of affine transformations with nonlinear activations:"
    },
    {
     "t": "math",
     "tex": "f(\\mathbf{x}) = \\sigma(W_L \\cdot \\sigma(W_{L-1} \\cdots \\sigma(W_1 \\mathbf{x} + b_1) \\cdots + b_{L-1}) + b_L)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the difference between L1 and L2 norms?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Property",
      "L1 Norm (\\(|\\mathbf{x}|_1 = \\sum|x_i|\\))",
      "L2 Norm (\\(|\\mathbf{x}|_2 = \\sqrt{\\sum x_i^2}\\))"
     ],
     "rows": [
      [
       "Geometry",
       "Diamond shape",
       "Circle/sphere"
      ],
      [
       "Sparsity",
       "Promotes sparse solutions",
       "Distributes weight evenly"
      ],
      [
       "Derivative",
       "Not differentiable at 0",
       "Smooth everywhere except origin"
      ],
      [
       "ML use",
       "Lasso (feature selection)",
       "Ridge (weight decay)"
      ],
      [
       "Robustness",
       "More robust to outliers",
       "Sensitive to large values"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is an orthogonal matrix? Where is it used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A matrix \\(Q\\) is orthogonal if \\(Q^T Q = QQ^T = I\\), meaning \\(Q^{-1} = Q^T\\). Columns (and rows) are orthonormal. Orthogonal matrices preserve norms: \\(\\|Q\\mathbf{x}\\| = \\|\\mathbf{x}\\|\\)."
    },
    {
     "t": "p",
     "text": "**Uses:**"
    },
    {
     "t": "ul",
     "items": [
      "SVD components (\\(U\\) and \\(V\\))",
      "QR decomposition for numerical stability",
      "Orthogonal initialization of neural network weights (reduces vanishing/exploding gradients)",
      "Rotation matrices in computer vision"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Explain the Gram matrix and its role in kernel methods.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The Gram matrix \\(G_{ij} = \\mathbf{x}_i^T \\mathbf{x}_j\\) stores all pairwise inner products. In kernel methods, \\(G_{ij} = K(\\mathbf{x}_i, \\mathbf{x}_j)\\) where \\(K\\) is the kernel function."
    },
    {
     "t": "p",
     "text": "**Requirements:** Must be symmetric positive semi-definite (Mercer's condition). This guarantees the kernel corresponds to an inner product in some (possibly infinite-dimensional) feature space."
    },
    {
     "t": "p",
     "text": "**Applications:** SVM, Gaussian processes, kernel PCA, style transfer (Gram matrix of CNN features captures texture)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is the trace of a matrix and when is it useful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \\(\\text{tr}(A) = \\sum_{i} A_{ii}\\) — sum of diagonal elements. Also equals the sum of eigenvalues."
    },
    {
     "t": "p",
     "text": "**Properties:**"
    },
    {
     "t": "ul",
     "items": [
      "\\(\\text{tr}(AB) = \\text{tr}(BA)\\) (cyclic property)",
      "\\(\\text{tr}(A^T A) = \\sum_{ij} A_{ij}^2\\) (Frobenius norm squared)"
     ]
    },
    {
     "t": "p",
     "text": "**ML uses:** Nuclear norm (sum of singular values) for matrix completion, Frobenius norm in regularization, trace in Fisher information matrix."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "How do you solve a system of linear equations \\(Ax = b\\)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "When to use",
      "Complexity"
     ],
     "rows": [
      [
       "Direct inverse \\(x = A^{-1}b\\)",
       "Small systems, \\(A\\) invertible",
       "\\(O(n^3)\\)"
      ],
      [
       "LU decomposition",
       "General dense systems",
       "\\(O(n^3)\\) once, \\(O(n^2)\\) per solve"
      ],
      [
       "Cholesky",
       "\\(A\\) is positive definite",
       "\\(O(n^3/3)\\) — 2x faster than LU"
      ],
      [
       "QR decomposition",
       "Overdetermined (least squares)",
       "\\(O(mn^2)\\)"
      ],
      [
       "SVD",
       "Ill-conditioned or rank-deficient",
       "\\(O(mn^2)\\)"
      ],
      [
       "Conjugate gradient",
       "Large sparse systems",
       "\\(O(n\\sqrt{\\kappa})\\) iterations"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the matrix determinant and what does it signify?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The determinant \\(\\det(A)\\) measures the signed volume scaling factor of the linear transformation."
    },
    {
     "t": "ul",
     "items": [
      "\\(\\det(A) = 0\\): Matrix is singular (not invertible), columns are linearly dependent",
      "\\(|\\det(A)| > 1\\): Transformation expands volume",
      "\\(\\det(A) < 0\\): Transformation includes a reflection"
     ]
    },
    {
     "t": "p",
     "text": "**ML relevance:** Appears in the multivariate Gaussian density:"
    },
    {
     "t": "math",
     "tex": "p(\\mathbf{x}) = \\frac{1}{(2\\pi)^{d/2}|\\Sigma|^{1/2}} \\exp\\left(-\\frac{1}{2}(\\mathbf{x}-\\mu)^T \\Sigma^{-1}(\\mathbf{x}-\\mu)\\right)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the Hadamard product vs standard matrix multiplication?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Hadamard (element-wise):** \\((A \\odot B)_{ij} = A_{ij} \\cdot B_{ij}\\) — same-shape matrices",
      "**Standard (dot):** \\((AB)_{ij} = \\sum_k A_{ik} B_{kj}\\) — inner dimensions must match"
     ]
    },
    {
     "t": "p",
     "text": "**In ML:**"
    },
    {
     "t": "ul",
     "items": [
      "Hadamard: Gating mechanisms (LSTM gates), attention masking, dropout masks",
      "Standard: Layer transformations, attention (\\(QK^T\\)), projection"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is the Moore-Penrose pseudoinverse?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For any matrix \\(A\\), the pseudoinverse \\(A^+\\) satisfies \\(A^+ = V\\Sigma^+ U^T\\) (from SVD), where \\(\\Sigma^+\\) inverts the non-zero singular values."
    },
    {
     "t": "ul",
     "items": [
      "If \\(A\\) is invertible: \\(A^+ = A^{-1}\\)",
      "Overdetermined (\\(m > n\\)): \\(A^+ = (A^T A)^{-1} A^T\\) — least squares solution",
      "Underdetermined (\\(m < n\\)): \\(A^+ = A^T (AA^T)^{-1}\\) — minimum norm solution"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "Explain the relationship between PCA and SVD.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Given centered data matrix \\(X\\) (\\(n\\) samples × \\(d\\) features):"
    },
    {
     "t": "ol",
     "items": [
      "PCA finds eigenvectors of covariance matrix \\(C = \\frac{1}{n-1}X^T X\\)",
      "SVD of \\(X = U\\Sigma V^T\\) gives \\(X^T X = V\\Sigma^2 V^T\\)",
      "Therefore, \\(V\\) columns = principal components, \\(\\sigma_i^2/(n-1)\\) = variance explained"
     ]
    },
    {
     "t": "p",
     "text": "SVD is preferred computationally because:"
    },
    {
     "t": "ul",
     "items": [
      "No need to form \\(X^T X\\) (avoids squaring condition number)",
      "Numerically more stable",
      "Works for non-square matrices directly"
     ]
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

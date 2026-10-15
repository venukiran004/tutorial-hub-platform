/* ============================================================================
   INTERVIEW I1.3 — Linear Algebra
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.3",
 "lede": "**10 questions** from NumPy and Pandas Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Linear Algebra",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "36",
   "q": "How do you solve a linear system Ax = b?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "A = np.array([[2, 1], [1, 3]])\nb = np.array([5, 10])\nx = np.linalg.solve(A, b)     # Faster + more stable than inv(A) @ b"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What is `np.linalg.lstsq`?",
   "body": [
    {
     "t": "p",
     "text": "Computes the least-squares solution to Ax ≈ b, minimizing ||Ax − b||². Used for overdetermined systems (more equations than unknowns) — e.g., linear regression from scratch:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "coeffs, residuals, rank, sv = np.linalg.lstsq(X, y, rcond=None)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "What is Singular Value Decomposition (SVD)?",
   "body": [
    {
     "t": "p",
     "text": "Decomposes any matrix A into A = U·Σ·Vᵀ where U, V are orthogonal and Σ is diagonal. Used in PCA, image compression, collaborative filtering:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "U, S, Vt = np.linalg.svd(A, full_matrices=False)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "How do you compute eigenvalues and eigenvectors?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "eigenvalues, eigenvectors = np.linalg.eig(A)    # General\neigenvalues, eigenvectors = np.linalg.eigh(A)   # Symmetric/Hermitian (more stable)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What is the rank of a matrix and how do you compute it?",
   "body": [
    {
     "t": "p",
     "text": "The rank is the number of linearly independent rows (or columns). Use `np.linalg.matrix_rank(A)`. Related to the number of non-zero singular values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "What is a positive definite matrix and why does it matter in ML?",
   "body": [
    {
     "t": "p",
     "text": "A symmetric matrix A is positive definite if xᵀAx > 0 for all non-zero x. Covariance matrices are positive semi-definite. Important for: Cholesky decomposition, ensuring a valid metric or kernel."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the Cholesky decomposition?",
   "body": [
    {
     "t": "p",
     "text": "Decomposes a positive definite matrix A = LLᵀ (L is lower triangular). More efficient than full LU decomposition for symmetric positive definite matrices:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "L = np.linalg.cholesky(A)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is the difference between `np.dot`, `np.matmul`, and the `@` operator?",
   "body": [
    {
     "t": "ul",
     "items": [
      "`np.dot`: General dot product — behaves differently for N-D arrays (sums over last axis of first, second-to-last of second).",
      "`np.matmul` / `@`: Matrix product — no scalar broadcasting; cleaner semantics for 2D+ matrices."
     ]
    },
    {
     "t": "p",
     "text": "Prefer `@` for clarity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "How do you compute the pseudoinverse?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "A_pinv = np.linalg.pinv(A)   # Moore-Penrose pseudoinverse\n# Useful for underdetermined or overdetermined systems"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "How do you compute cosine similarity using NumPy?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def cosine_similarity(a, b):\n    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))\n\n# Batch (all pairs):\nnorms = np.linalg.norm(matrix, axis=1, keepdims=True)\nnormalized = matrix / norms\nsim_matrix = normalized @ normalized.T"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

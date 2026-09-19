/* ============================================================================
   INTERVIEW I1.3 — Feature Engineering & Data
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/01_ML_Core_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.3",
 "lede": "**15 questions** from Core ML Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Feature Engineering & Data",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "51",
   "q": "What is feature engineering and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "Creating new or transformed features from raw data to improve model performance. Often has more impact than choosing a fancy algorithm."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "How do you handle missing values?",
   "body": [
    {
     "t": "ul",
     "items": [
      "Drop rows/columns (if small fraction).",
      "Impute: mean/median (numerical), mode (categorical), KNN imputation, model-based imputation.",
      "Treat missing as a category (for tree models).",
      "Flag missingness as a binary feature."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is feature scaling and when is it necessary?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Standardization (Z-score):** Mean=0, Std=1.",
      "**Min-Max Normalization:** Scale to [0, 1]."
     ]
    },
    {
     "t": "p",
     "text": "Necessary for: KNN, SVM, PCA, gradient descent-based models. Not necessary for: tree-based models."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "How do you encode categorical variables?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**One-hot encoding:** Binary column per category (for nominal with few categories).",
      "**Label encoding:** Integer per category (for ordinal or tree models).",
      "**Target encoding:** Replace category with mean target value (risk of leakage — use CV carefully).",
      "**Embedding:** Learned dense vectors (deep learning)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What is multicollinearity and how do you detect/fix it?",
   "body": [
    {
     "t": "p",
     "text": "Multicollinearity: High correlation between features. Causes unstable coefficient estimates in linear models. Detection: VIF (Variance Inflation Factor) > 10 is problematic. Fix: Remove correlated features, PCA, Ridge regression."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is the difference between feature selection and feature extraction?",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Feature selection:** Choose a subset of original features (Filter, Wrapper, Embedded methods).",
      "**Feature extraction:** Create new features from originals (PCA, autoencoders, polynomial features)."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "What are wrapper methods for feature selection?",
   "body": [
    {
     "t": "p",
     "text": "Wrapper methods use a model to evaluate feature subsets. Examples: Recursive Feature Elimination (RFE), Forward/Backward selection. Expensive but account for feature interactions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "How do you handle outliers?",
   "body": [
    {
     "t": "p",
     "text": "Detect: IQR method (< Q1 - 1.5*IQR or > Q3 + 1.5*IQR), Z-score, visualization. Handle: Remove, cap/floor (winsorization), transform (log), use robust models (tree-based, L1 regression)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is target encoding and what is its risk?",
   "body": [
    {
     "t": "p",
     "text": "Target encoding replaces a categorical value with its mean target value. Risk: data leakage if computed on the full dataset before splitting. Fix: compute only within cross-validation folds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is the pipeline concept in ML?",
   "body": [
    {
     "t": "p",
     "text": "An ML pipeline chains preprocessing steps (scaling, encoding, imputation) and the model into a single object. Prevents data leakage (all steps are fit only on training data), simplifies deployment, and enables clean CV."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "What is dimensionality reduction and why is it useful?",
   "body": [
    {
     "t": "p",
     "text": "Reducing the number of features while preserving information. Benefits: reduces overfitting, speeds up training, removes noise, helps visualization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is polynomial feature engineering?",
   "body": [
    {
     "t": "p",
     "text": "Creating new features as products/powers of existing features (e.g., x₁², x₁·x₂). Adds expressiveness to linear models but increases dimensionality rapidly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "How do you deal with skewed distributions?",
   "body": [
    {
     "t": "p",
     "text": "Apply transformations: log (for right skew), square root, Box-Cox, Yeo-Johnson. Assess with skewness metric and Q-Q plot."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is binning / discretization?",
   "body": [
    {
     "t": "p",
     "text": "Converting continuous features into discrete bins (e.g., age → young/middle/senior). Useful for adding non-linearity to linear models and capturing threshold effects."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is the difference between train-time and inference-time feature engineering?",
   "body": [
    {
     "t": "p",
     "text": "Train-time: Statistics (mean, std, encodings) computed on training data only. Inference-time: Apply the same transformations using train-set statistics. Never refit scalers/encoders on new data."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

/* ============================================================================
   PRACTICE P2.1 — Preprocessing and Feature Engineering · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/02_Preprocessing_and_Feature_Engineering.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p2.1",
 "lede": "**25 scenarios** from Preprocessing and Feature Engineering. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "q": "What's wrong with this imputation approach?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "df['age'].fillna(df['age'].mean(), inplace=True)\n# Then split into train/test"
    },
    {
     "t": "p",
     "text": "**Answer:** Data leakage — mean is computed on entire dataset including test data."
    },
    {
     "t": "p",
     "text": "**Explanation:** Must compute mean on training data only, then use that value for both train and test imputation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "When would you use median imputation instead of mean imputation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When the feature has outliers or is skewed. Median is robust to outliers."
    },
    {
     "t": "p",
     "text": "**Explanation:** Mean is pulled by outliers: [1, 2, 3, 100] → mean=26.5, median=2.5. Median better represents typical values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is the output after applying StandardScaler?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Feature values: [10, 20, 30, 40, 50]\nMean = 30, Std = ~14.14"
    },
    {
     "t": "p",
     "text": "**Answer:** `[-1.41, -0.71, 0, 0.71, 1.41]` (approximately)"
    },
    {
     "t": "p",
     "text": "**Explanation:** StandardScaler: z = (x - mean) / std. Centers data at 0, scales to unit variance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is the difference between MinMaxScaler and RobustScaler?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**MinMaxScaler:** Scales to [0,1] using min/max — sensitive to outliers",
      "**RobustScaler:** Uses median and IQR — robust to outliers"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Use RobustScaler when data has outliers you don't want to remove."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "You have a feature with values [1, 2, 3, 1000]. Which scaler would you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** RobustScaler or log-transform before scaling."
    },
    {
     "t": "p",
     "text": "**Explanation:** MinMaxScaler would compress [1,2,3] into tiny range near 0. StandardScaler similarly affected. RobustScaler uses IQR, resistant to 1000."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What feature engineering would you apply to a datetime column?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Extract: year, month, day, day_of_week, hour, is_weekend, quarter, season, time_since_reference, cyclical encoding (sin/cos)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Raw datetime is unusable by most ML models. Cyclical encoding preserves the circular nature (December close to January)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "How would you handle a categorical feature with 50,000 unique values?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Target encoding (mean of target per category)",
      "Frequency encoding (count per category)",
      "Embedding layers (for neural networks)",
      "Group rare categories into \"Other\""
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** One-hot encoding would create 50K columns — impractical. Target encoding captures category-target relationship."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What's wrong with this approach?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Target encoding without proper validation\ndf['city_encoded'] = df.groupby('city')['price'].transform('mean')"
    },
    {
     "t": "p",
     "text": "**Answer:** Target leakage — each row's target contributes to its own encoding."
    },
    {
     "t": "p",
     "text": "**Explanation:** Use leave-one-out encoding or compute target mean using cross-validation folds to prevent leakage."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "When would you use log transformation on a feature?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When the feature is right-skewed (long right tail) — log compression reduces skewness."
    },
    {
     "t": "p",
     "text": "**Explanation:** Income, prices, counts often benefit. Log(0) is undefined — use log(x+1). Check skewness before/after."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is the output of this one-hot encoding?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Categories: ['cat', 'dog', 'cat', 'bird', 'dog']"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "   cat  dog  bird\n0    1    0     0\n1    0    1     0\n2    1    0     0\n3    0    0     1\n4    0    1     0"
    },
    {
     "t": "p",
     "text": "**Explanation:** Each category becomes a binary column. To avoid multicollinearity, you can drop one column (drop_first=True)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the dummy variable trap and how to avoid it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When one-hot encoding creates perfect multicollinearity (features sum to 1). Drop one category column."
    },
    {
     "t": "p",
     "text": "**Explanation:** For k categories, use k-1 binary columns. The dropped category becomes the reference class."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What feature engineering would you do for these text features?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "\"Great product, highly recommended!\"\n\"Terrible quality, waste of money\""
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "TF-IDF vectorization",
      "Word count, character count",
      "Sentiment score",
      "Presence of specific keywords",
      "Word embeddings (Word2Vec, BERT)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Raw text → numerical features. Choice depends on downstream model and compute budget."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How would you create interaction features?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "features: ['age', 'income', 'education_years']"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "df['age_income'] = df['age'] * df['income']\ndf['income_per_year_edu'] = df['income'] / df['education_years']\ndf['age_squared'] = df['age'] ** 2"
    },
    {
     "t": "p",
     "text": "**Explanation:** Interaction and polynomial features capture non-linear relationships that linear models miss."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is the difference between ordinal encoding and one-hot encoding?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Ordinal:** Maps categories to integers preserving order (Low=1, Medium=2, High=3)",
      "**One-hot:** Creates binary columns, no order implied"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Use ordinal for ordered categories only. One-hot for nominal (no natural ordering)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "You have 200 features. How do you select the most important ones?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Filter:** Correlation with target, mutual information, chi-squared",
      "**Wrapper:** Forward/backward selection, RFE",
      "**Embedded:** Lasso (L1), tree feature importance"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Start with filter (fast), validate with embedded methods. Wrapper is thorough but computationally expensive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is feature binning and when is it useful?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# Example: Age binning\nbins = [0, 18, 35, 50, 65, 100]\nlabels = ['child', 'young_adult', 'adult', 'middle_aged', 'senior']\ndf['age_group'] = pd.cut(df['age'], bins=bins, labels=labels)"
    },
    {
     "t": "p",
     "text": "**Answer:** Converting continuous features into discrete bins. Useful when relationship is non-linear or step-like."
    },
    {
     "t": "p",
     "text": "**Explanation:** Captures threshold effects (e.g., voting age at 18). Can reduce noise and handling outliers. Loses granularity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How would you handle multicollinear features?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "Feature correlation matrix shows:\nfeature_A and feature_B: r = 0.95\nfeature_C and feature_D: r = 0.92"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Drop one from each correlated pair (keep more predictive one)",
      "PCA to combine into uncorrelated components",
      "Use Ridge regression (handles multicollinearity)",
      "Calculate VIF and remove features with VIF > 10"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Multicollinearity inflates coefficient variance in linear models but doesn't affect prediction accuracy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is target encoding and what are its risks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Replace categorical values with mean of target variable for each category."
    },
    {
     "t": "p",
     "text": "**Risks:**"
    },
    {
     "t": "ol",
     "items": [
      "Target leakage (each row contributes to its own encoding)",
      "Overfitting on rare categories (small sample size per category)"
     ]
    },
    {
     "t": "p",
     "text": "**Mitigation:** Use cross-validation folds for encoding, add smoothing/regularization."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What preprocessing would you apply before KNN?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Feature scaling (StandardScaler or MinMaxScaler) — essential for distance-based",
      "Handle missing values (KNN can't use NaN)",
      "Dimensionality reduction if high-dimensional",
      "Encode categorical features numerically"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** KNN relies on distance calculations — unequal scales make some features dominate."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is the effect of not handling outliers in linear regression?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Outliers disproportionately influence the regression line, pulling it toward outlier values."
    },
    {
     "t": "p",
     "text": "**Explanation:** Linear regression minimizes MSE, which squares errors — outliers have outsized impact. Use robust regression or remove outliers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "How would you detect outliers?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**IQR method:** Values below Q1 - 1.5×IQR or above Q3 + 1.5×IQR",
      "**Z-score:** |z| > 3",
      "**Isolation Forest:** Anomaly detection algorithm",
      "**DBSCAN:** Points not in any cluster",
      "**Visual:** Box plots, scatter plots"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Method depends on data distribution and dimensionality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is SMOTE and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Synthetic Minority Over-sampling Technique — creates synthetic samples of the minority class by interpolating between existing minority examples."
    },
    {
     "t": "p",
     "text": "**Explanation:** Used for imbalanced classification. Creates new points along lines connecting minority samples. Apply only to training data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What's wrong with applying SMOTE before train-test split?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Data leakage — synthetic samples based on test data could appear in training set."
    },
    {
     "t": "p",
     "text": "**Explanation:** Always: split first → apply SMOTE to training data only → evaluate on original test data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How would you handle a dataset with 30% missing values in a critical feature?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "If MCAR: Multiple imputation (MICE) or model-based imputation",
      "Create a \"missing\" indicator feature alongside imputed values",
      "Use algorithms that handle missing values (XGBoost)",
      "If too much missing, consider dropping the feature"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Missingness pattern matters — MCAR/MAR/MNAR determine appropriate strategy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is the difference between MCAR, MAR, and MNAR?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**MCAR (Missing Completely At Random):** Missingness unrelated to any variable",
      "**MAR (Missing At Random):** Missingness related to observed variables",
      "**MNAR (Missing Not At Random):** Missingness related to the missing value itself"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** MCAR: safe to impute. MAR: use other features for imputation. MNAR: most problematic, may need domain knowledge."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

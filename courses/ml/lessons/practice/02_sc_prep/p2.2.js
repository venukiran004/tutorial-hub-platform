/* ============================================================================
   PRACTICE P2.2 — Preprocessing and Feature Engineering · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/02_Preprocessing_and_Feature_Engineering.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p2.2",
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
   "n": "26",
   "q": "What feature engineering would you apply for GPS coordinates (latitude, longitude)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Distance to important locations (city center, nearest store)",
      "Cluster assignments (geographic regions)",
      "Grid/hexagonal binning",
      "Haversine distance features",
      "Geohash encoding"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Raw lat/lon are poor features — model can't learn geographic relationships from coordinates alone."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "What is polynomial feature expansion and what are the risks?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import PolynomialFeatures\npoly = PolynomialFeatures(degree=3, include_bias=False)\nX_poly = poly.fit_transform(X)  # X has 5 features"
    },
    {
     "t": "p",
     "text": "**Answer:** Creates all polynomial combinations up to degree 3. With 5 features and degree 3: generates 55 features."
    },
    {
     "t": "p",
     "text": "**Risks:** Exponential feature growth, multicollinearity, overfitting."
    },
    {
     "t": "p",
     "text": "**Explanation:** 2 features, degree 2: [x1, x2, x1², x2², x1×x2]. Useful with regularization. Expensive for high degree."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "How would you encode cyclical features like hour-of-day (0-23)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\ndf['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)\ndf['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Sin/cos encoding preserves cyclical nature — hour 23 is close to hour 0. One-hot or ordinal encoding loses this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "What's the purpose of a power transformer (Box-Cox or Yeo-Johnson)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Transforms skewed data to approximate normal distribution."
    },
    {
     "t": "ul",
     "items": [
      "**Box-Cox:** Only for positive values",
      "**Yeo-Johnson:** Handles zero and negative values"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Many models assume normally distributed features. Power transforms can improve model performance on skewed data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "What feature would you create from this data?",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "customer_first_purchase: 2020-01-15\ncustomer_last_purchase: 2024-06-01\ntotal_purchases: 50"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Tenure (days since first purchase)",
      "Recency (days since last purchase)",
      "Purchase frequency (purchases/tenure)",
      "Average time between purchases",
      "Is_active (recency < threshold)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** RFM (Recency, Frequency, Monetary) features are powerful for customer analytics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What is label smoothing and when is it useful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Replacing hard labels (0 or 1) with soft labels (0.1 or 0.9). Prevents overconfident predictions."
    },
    {
     "t": "p",
     "text": "**Explanation:** Hard: [0, 1] → Soft: [0.05, 0.95]. Reduces overfitting, especially with noisy labels. Common in deep learning."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "How would you handle text features with different languages?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Language detection first",
      "Multilingual embeddings (mBERT, XLM-R)",
      "Language as a separate feature",
      "Translate to one language then process"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Language-specific preprocessing (tokenization, stopwords) needed. Multilingual models handle diversity."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "What is the purpose of Winsorization?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Capping extreme values at specified percentiles instead of removing them."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Cap at 1st and 99th percentile\nlower = df['income'].quantile(0.01)\nupper = df['income'].quantile(0.99)\ndf['income_winsorized'] = df['income'].clip(lower, upper)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Preserves all samples (unlike outlier removal) while limiting outlier influence."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What is the difference between bag-of-words and TF-IDF?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Bag-of-Words:** Raw word counts per document",
      "**TF-IDF:** Word frequency weighted by inverse document frequency — penalizes common words"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** TF-IDF: \"the\" appears everywhere → low weight. \"quantum\" appears rarely → high weight. Better for most NLP tasks."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "How would you handle a feature that is 70% zeros?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Create binary indicator: is_zero / is_nonzero",
      "Log-transform non-zero values: log(x+1)",
      "Separate into two features: presence + magnitude",
      "Consider if the feature is useful at all"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Sparse features can be informative — the pattern of zeros often matters as much as the values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "What is feature hashing (hashing trick)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Maps features to fixed-size hash table using hash function. Handles high-cardinality categoricals without explicit vocabulary."
    },
    {
     "t": "p",
     "text": "**Explanation:** Pros: O(1) memory, handles unseen categories. Cons: hash collisions, no inverse mapping. Used in large-scale ML."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What preprocessing is needed for Principal Component Analysis (PCA)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Standardization (mean=0, variance=1) is essential. PCA is sensitive to feature scales."
    },
    {
     "t": "p",
     "text": "**Explanation:** Without scaling, features with larger scales dominate principal components. Mean centering is minimum requirement."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "How would you handle a feature with the format \"city, state, country\"?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Split into separate features: city, state, country",
      "Hierarchical encoding",
      "Geocode to lat/lon",
      "Target encode each level",
      "Combine rare cities into state-level groups"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Hierarchical geographic data has different granularity levels. Use domain knowledge to determine useful level."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "What is data augmentation in tabular ML?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Creating synthetic training samples to increase dataset size:"
    },
    {
     "t": "ol",
     "items": [
      "SMOTE for imbalanced classes",
      "Gaussian noise injection",
      "Random feature masking",
      "Mixup (interpolating between samples)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** More common in image/text ML but can help tabular data, especially for small datasets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "What's the effect of using LabelEncoder on a non-ordinal categorical feature in a tree model vs linear model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Tree model:** Works fine — trees make binary splits, don't assume ordering",
      "**Linear model:** Problematic — assumes linear relationship between label values"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Tree: splits on x>2 separating \"blue\" from \"red,green\". Linear model: treats blue(0) as closer to red(1) than green(2)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "How would you handle date features for a model predicting holiday sales?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Days_to_nearest_holiday",
      "Is_holiday (binary)",
      "Days_after_previous_holiday",
      "Holiday_type encoding",
      "Month/week features",
      "Year-over-year trends"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Holiday proximity is non-linear — engineered features capture this better than raw dates."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "What is the difference between forward fill and backward fill for missing values?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Forward fill (ffill):** Copies last valid value forward",
      "**Backward fill (bfill):** Copies next valid value backward"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** For time series — ffill assumes value persists until changed. Bfill assumes future value applies. Choice depends on domain."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "What is the purpose of quantile transformation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Maps feature values to a uniform or normal distribution using quantiles. Robust to outliers."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.preprocessing import QuantileTransformer\nqt = QuantileTransformer(output_distribution='normal')\nX_transformed = qt.fit_transform(X)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Spreads data evenly across the distribution, handling skewness and outliers simultaneously."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "How do you calculate Variance Inflation Factor (VIF)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** VIF(i) = 1 / (1 - R²_i) where R²_i is R-squared from regressing feature i on all other features."
    },
    {
     "t": "ul",
     "items": [
      "VIF = 1: No correlation",
      "VIF > 5: Moderate multicollinearity",
      "VIF > 10: High multicollinearity"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** High VIF means the feature is well-predicted by other features — redundant information."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "What is the effect of adding a constant feature (e.g., all values = 1)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** No predictive value — zero variance feature. Most algorithms handle it but it's wasted computation."
    },
    {
     "t": "p",
     "text": "**Explanation:** StandardScaler would give NaN (std=0). Many preprocessing pipelines should include variance threshold to remove such features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "How would you handle missing values in a categorical feature?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Treat \"missing\" as a separate category",
      "Mode imputation",
      "Model-based imputation using other features",
      "Random sampling from observed distribution"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** \"Missing\" can be informative (e.g., people who didn't answer income might have particular patterns)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "What is the difference between feature importance and feature correlation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Correlation:** Linear relationship between feature and target (or between features)",
      "**Importance:** How much a feature contributes to model predictions (can capture non-linear effects)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Feature can have low correlation but high importance (non-linear relationship), or high correlation but low importance (redundant with another feature)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "How would you handle a target variable with extreme class imbalance (1:1000)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Sampling:** SMOTE, undersampling, ADASYN",
      "**Class weights:** Adjust loss function weights",
      "**Threshold tuning:** Optimize classification threshold",
      "**Anomaly detection:** Treat as anomaly detection problem",
      "**Metric:** Use precision-recall AUC, not accuracy"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Class weights = less data waste. SMOTE = more training signal. Often combine approaches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "What is the purpose of a ColumnTransformer in scikit-learn?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Applies different transformations to different feature subsets within a single pipeline."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.compose import ColumnTransformer\nct = ColumnTransformer([\n    ('num', StandardScaler(), numeric_features),\n    ('cat', OneHotEncoder(), categorical_features)\n])"
    },
    {
     "t": "p",
     "text": "**Explanation:** Ensures consistent preprocessing in train/test/production and prevents data leakage."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "What is the Pipeline pattern and why is it important?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.pipeline import Pipeline\npipe = Pipeline([\n    ('scaler', StandardScaler()),\n    ('pca', PCA(n_components=10)),\n    ('model', LogisticRegression())\n])\npipe.fit(X_train, y_train)\nscore = pipe.score(X_test, y_test)"
    },
    {
     "t": "p",
     "text": "**Answer:** Pipeline chains preprocessing and modeling steps into a single estimator. Ensures:"
    },
    {
     "t": "ol",
     "items": [
      "No data leakage (scaler fits only on training data)",
      "Reproducibility",
      "Easy deployment",
      "Clean cross-validation"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Without Pipeline, each step must be manually managed, risking inconsistency and leakage."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

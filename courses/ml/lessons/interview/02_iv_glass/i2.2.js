/* ============================================================================
   INTERVIEW I2.2 — Machine Learning Concepts · Product & Business Sense · A/B Testing & Experimentation · System Design for DS · Behavioral · Additional SQL & Data Analysis
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/02_Glassdoor_DS_and_MLE.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.2",
 "lede": "**12 questions** from Glassdoor Data Scientist and ML Engineer. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Machine Learning Concepts · Product & Business Sense · A/B Testing & Experimentation · System Design for DS · Behavioral · Additional SQL & Data Analysis",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Explain bias-variance tradeoff",
   "body": [
    {
     "t": "code",
     "lang": "text",
     "code": "High Bias (Underfitting)          Balanced          High Variance (Overfitting)\nâ”œâ”€ Simple model                   â”œâ”€ Right          â”œâ”€ Complex model\nâ”œâ”€ High training error            â”‚  complexity     â”œâ”€ Low training error\nâ”œâ”€ High test error                â”œâ”€ Low train err  â”œâ”€ High test error\nâ””â”€ Example: Linear Regression     â””â”€ Regularized    â””â”€ Example: Deep tree\n   on non-linear data                               â””â”€ Memorizes noise"
    },
    {
     "t": "p",
     "text": "**Total Error = BiasÂ² + Variance + Irreducible Noise**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.model_selection import cross_val_score\nfrom sklearn.tree import DecisionTreeClassifier\nimport numpy as np\n\n# Demonstrate bias-variance with tree depth\nfor depth in [1, 3, 5, 10, None]:\n    model = DecisionTreeClassifier(max_depth=depth, random_state=42)\n    scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')\n    print(f\"Depth={depth}: Mean={scores.mean():.4f}, Std={scores.std():.4f}\")\n    # Low depth â†’ high bias, low variance\n    # High depth â†’ low bias, high variance"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "When would you use L1 vs L2 regularization?",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "L1 (Lasso)",
      "L2 (Ridge)"
     ],
     "rows": [
      [
       "Penalty",
       "\\(\\sum |w_i|\\)",
       "\\(\\sum w_i^2\\)"
      ],
      [
       "Effect",
       "Drives weights to exactly 0",
       "Shrinks weights toward 0"
      ],
      [
       "Feature selection",
       "âœ… Yes (sparse)",
       "âŒ No"
      ],
      [
       "Correlated features",
       "Picks one randomly",
       "Distributes weight"
      ],
      [
       "Use case",
       "Many irrelevant features",
       "All features relevant"
      ],
      [
       "Solution",
       "Not differentiable at 0",
       "Smooth, closed-form"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.linear_model import Lasso, Ridge, ElasticNet\n\n# L1 â€” Feature selection\nlasso = Lasso(alpha=0.1)\nlasso.fit(X_train, y_train)\nprint(f\"Non-zero features: {(lasso.coef_ != 0).sum()}/{len(lasso.coef_)}\")\n\n# L2 â€” Prevent overfitting\nridge = Ridge(alpha=1.0)\nridge.fit(X_train, y_train)\n\n# ElasticNet â€” Best of both\nelastic = ElasticNet(alpha=0.1, l1_ratio=0.5)  # 50% L1 + 50% L2"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "Explain precision, recall, F1-score â€” when to use each?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.metrics import classification_report, confusion_matrix\n\ny_true = [1, 1, 1, 0, 0, 0, 1, 0, 1, 0]\ny_pred = [1, 1, 0, 0, 0, 1, 1, 0, 0, 0]\n\nprint(classification_report(y_true, y_pred))"
    },
    {
     "t": "table",
     "head": [
      "Metric",
      "Formula",
      "Optimize When..."
     ],
     "rows": [
      [
       "**Precision**",
       "TP / (TP + FP)",
       "Cost of false positive is high (spam detection)"
      ],
      [
       "**Recall**",
       "TP / (TP + FN)",
       "Cost of false negative is high (cancer screening)"
      ],
      [
       "**F1**",
       "2 Ã— (P Ã— R) / (P + R)",
       "Balance between precision and recall"
      ],
      [
       "**AUC-ROC**",
       "Area under ROC curve",
       "Ranking quality matters"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How would you measure the success of a new feature?",
   "body": [
    {
     "t": "p",
     "text": "**Framework (Meta's approach):**"
    },
    {
     "t": "ol",
     "items": [
      "**Define the goal:** What metric are we trying to move?",
      "**Primary metric:** Direct measure (e.g., DAU, revenue, engagement)",
      "**Secondary metrics:** Related measures (e.g., session length, retention)",
      "**Guardrail metrics:** Ensure no negative impact (e.g., crash rate, latency)",
      "**Experiment design:** A/B test with proper sample size"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Sample size calculation\nfrom scipy.stats import norm\nimport numpy as np\n\ndef required_sample_size(baseline_rate, mde, alpha=0.05, power=0.80):\n    \"\"\"\n    baseline_rate: current conversion rate\n    mde: minimum detectable effect (relative)\n    \"\"\"\n    p1 = baseline_rate\n    p2 = baseline_rate * (1 + mde)\n\n    z_alpha = norm.ppf(1 - alpha/2)\n    z_beta = norm.ppf(power)\n\n    pooled_p = (p1 + p2) / 2\n\n    n = ((z_alpha * np.sqrt(2 * pooled_p * (1 - pooled_p)) +\n          z_beta * np.sqrt(p1*(1-p1) + p2*(1-p2))) / (p2 - p1)) ** 2\n\n    return int(np.ceil(n))\n\n# Example: 5% baseline CTR, detect 10% relative increase\nn = required_sample_size(0.05, 0.10)\nprint(f\"Required sample size per group: {n:,}\")"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Design an A/B test â€” key considerations",
   "body": [
    {
     "t": "p",
     "text": "**Step-by-step framework:**"
    },
    {
     "t": "table",
     "head": [
      "Step",
      "Details"
     ],
     "rows": [
      [
       "**Hypothesis**",
       "\"Adding feature X will increase metric Y by Z%\""
      ],
      [
       "**Randomization**",
       "User-level (not session-level) to avoid spillover"
      ],
      [
       "**Sample size**",
       "Power analysis: 80% power, 5% significance"
      ],
      [
       "**Duration**",
       "Cover full weekly cycles (min 1-2 weeks)"
      ],
      [
       "**Metrics**",
       "Primary + secondary + guardrails"
      ],
      [
       "**Analysis**",
       "t-test for means, chi-square for proportions"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Common pitfalls:**"
    },
    {
     "t": "ul",
     "items": [
      "**Peeking:** Checking results before planned duration â†’ inflated false positive rate",
      "**Multiple comparisons:** Testing many metrics â†’ Bonferroni correction",
      "**Novelty effect:** New features get initial engagement spike â†’ wait for steady state",
      "**Network effects:** Social products â†’ use cluster randomization"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from scipy import stats\n\ndef ab_test_analysis(control, treatment):\n    \"\"\"Perform two-sample t-test for A/B test.\"\"\"\n    t_stat, p_value = stats.ttest_ind(control, treatment)\n\n    control_mean = np.mean(control)\n    treatment_mean = np.mean(treatment)\n    lift = (treatment_mean - control_mean) / control_mean * 100\n\n    ci = stats.t.interval(0.95,\n                          df=len(control)+len(treatment)-2,\n                          loc=treatment_mean - control_mean,\n                          scale=stats.sem(treatment - control_mean))\n\n    return {\n        'control_mean': control_mean,\n        'treatment_mean': treatment_mean,\n        'lift': f\"{lift:.2f}%\",\n        'p_value': p_value,\n        'significant': p_value < 0.05,\n        'confidence_interval': ci\n    }"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "Design a recommendation system",
   "body": [
    {
     "t": "p",
     "text": "**High-level architecture:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "User Request â†’ API Gateway â†’ Feature Store â†’ Model Service â†’ Ranking â†’ Response\n                                  â†‘                â†‘\n                           Offline Pipeline    Model Registry\n                           (Spark/Airflow)     (MLflow)"
    },
    {
     "t": "p",
     "text": "**Approach layers:**"
    },
    {
     "t": "ol",
     "items": [
      "**Candidate Generation:** Collaborative filtering (ALS), content-based filtering",
      "**Ranking:** Gradient-boosted trees (XGBoost/LightGBM) or deep neural network",
      "**Re-ranking:** Business rules, diversity, freshness",
      "**Serving:** Low-latency inference (<50ms), caching popular items"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Simplified collaborative filtering\nfrom sklearn.decomposition import NMF\nimport numpy as np\n\n# User-Item matrix (ratings)\nR = np.array([\n    [5, 3, 0, 1],\n    [4, 0, 0, 1],\n    [1, 1, 0, 5],\n    [0, 0, 5, 4],\n])\n\n# Matrix factorization\nmodel = NMF(n_components=2, init='random', random_state=42)\nW = model.fit_transform(R)  # User factors\nH = model.components_         # Item factors\n\n# Predicted ratings (fills in zeros)\npredicted = np.dot(W, H)\nprint(predicted.round(2))"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Common behavioral questions at data science interviews",
   "body": [
    {
     "t": "table",
     "head": [
      "Company",
      "Question"
     ],
     "rows": [
      [
       "**Meta**",
       "Tell me about a time you used data to influence a product decision"
      ],
      [
       "**Meta**",
       "How do you prioritize multiple data requests?"
      ],
      [
       "**LinkedIn**",
       "Describe a project where your analysis was wrong. What did you learn?"
      ],
      [
       "**Google**",
       "How do you communicate complex statistical concepts to non-technical stakeholders?"
      ],
      [
       "**Amazon**",
       "Give an example of when you had to make a decision with incomplete data"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Write a query to find the second highest salary in each department (Google — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Given an `employees` table, find the second highest salary per department."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "WITH ranked AS (\n    SELECT\n        department,\n        employee_name,\n        salary,\n        DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) as rnk\n    FROM employees\n)\nSELECT department, employee_name, salary\nFROM ranked\nWHERE rnk = 2;"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\ndf = pd.DataFrame({\n    'department': ['Eng', 'Eng', 'Eng', 'DS', 'DS', 'DS'],\n    'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'],\n    'salary': [150000, 130000, 120000, 140000, 135000, 125000]\n})\n\nresult = (df.groupby('department')\n           .apply(lambda x: x.nlargest(2, 'salary').iloc[-1:])\n           .reset_index(drop=True))\nprint(result)"
    },
    {
     "t": "p",
     "text": "**Key Insight:** `DENSE_RANK` handles ties correctly. Use `ROW_NUMBER` if you want exactly one result per department regardless of ties."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Calculate running 7-day active users (Meta — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Given a `user_activity` table with `user_id` and `activity_date`, compute the 7-day rolling count of active users."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "SELECT\n    a.activity_date,\n    COUNT(DISTINCT b.user_id) as active_7d\nFROM (SELECT DISTINCT activity_date FROM user_activity) a\nJOIN user_activity b\n    ON b.activity_date BETWEEN DATE_SUB(a.activity_date, INTERVAL 6 DAY)\n                          AND a.activity_date\nGROUP BY a.activity_date\nORDER BY a.activity_date;"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndates = pd.date_range('2024-01-01', periods=30)\ndf = pd.DataFrame({\n    'user_id': np.random.randint(1, 20, 100),\n    'activity_date': np.random.choice(dates, 100)\n})\n\ndaily_users = df.groupby('activity_date')['user_id'].apply(set)\nrolling_7d = []\nfor date in sorted(daily_users.index):\n    window_start = date - pd.Timedelta(days=6)\n    users = set()\n    for d in daily_users.index:\n        if window_start <= d <= date:\n            users.update(daily_users[d])\n    rolling_7d.append({'date': date, 'active_7d': len(users)})\n\nprint(pd.DataFrame(rolling_7d))"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Rolling windows with DISTINCT counts are common at Meta. Self-join approach works in SQL. In pandas, iterate with a set union."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Retention cohort analysis query (LinkedIn — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Build a monthly retention cohort analysis from a user events table."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "WITH first_activity AS (\n    SELECT\n        user_id,\n        DATE_TRUNC('month', MIN(event_date)) as cohort_month\n    FROM user_events\n    GROUP BY user_id\n),\nmonthly_activity AS (\n    SELECT DISTINCT\n        user_id,\n        DATE_TRUNC('month', event_date) as activity_month\n    FROM user_events\n)\nSELECT\n    f.cohort_month,\n    DATEDIFF('month', f.cohort_month, m.activity_month) as month_number,\n    COUNT(DISTINCT m.user_id) as retained_users,\n    ROUND(COUNT(DISTINCT m.user_id) * 100.0 /\n          COUNT(DISTINCT CASE WHEN f.cohort_month = m.activity_month THEN m.user_id END)\n          OVER (PARTITION BY f.cohort_month), 1) as retention_pct\nFROM first_activity f\nJOIN monthly_activity m ON f.user_id = m.user_id\nGROUP BY f.cohort_month, month_number\nORDER BY f.cohort_month, month_number;"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\n# Simulate data\nnp.random.seed(42)\ndf = pd.DataFrame({\n    'user_id': np.random.randint(1, 100, 500),\n    'event_date': pd.date_range('2024-01-01', periods=180, freq='D')[\n        np.random.randint(0, 180, 500)\n    ]\n})\n\n# Cohort analysis\ndf['cohort'] = df.groupby('user_id')['event_date'].transform('min').dt.to_period('M')\ndf['activity_month'] = df['event_date'].dt.to_period('M')\ndf['month_number'] = (df['activity_month'] - df['cohort']).apply(lambda x: x.n)\n\ncohort_table = (df.groupby(['cohort', 'month_number'])['user_id']\n                  .nunique()\n                  .unstack(fill_value=0))\n\n# Retention percentages\ncohort_sizes = cohort_table.iloc[:, 0]\nretention = cohort_table.div(cohort_sizes, axis=0).round(3) * 100\nprint(retention)"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Cohort = month of first activity. Month_number = months since cohort. Divide retained by cohort size. This is THE most-asked DS question at social media companies."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Find mutual friends between two users (Meta — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Given a `friendships(user1_id, user2_id)` table, find all mutual friends between users A and B."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "sql",
     "code": "-- Normalize friendships (both directions)\nWITH all_friends AS (\n    SELECT user1_id as user_id, user2_id as friend_id FROM friendships\n    UNION\n    SELECT user2_id, user1_id FROM friendships\n)\nSELECT a.friend_id as mutual_friend\nFROM all_friends a\nJOIN all_friends b ON a.friend_id = b.friend_id\nWHERE a.user_id = 101  -- User A\n  AND b.user_id = 202  -- User B\n  AND a.friend_id NOT IN (101, 202);"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def mutual_friends(friendships, user_a, user_b):\n    # Build adjacency set\n    friends = {}\n    for u1, u2 in friendships:\n        friends.setdefault(u1, set()).add(u2)\n        friends.setdefault(u2, set()).add(u1)\n\n    friends_a = friends.get(user_a, set())\n    friends_b = friends.get(user_b, set())\n    return friends_a & friends_b - {user_a, user_b}\n\ndata = [(1,2), (1,3), (1,4), (2,3), (2,5), (3,4), (3,5)]\nprint(mutual_friends(data, 1, 2))  # {3}"
    },
    {
     "t": "p",
     "text": "**Key Insight:** UNION to normalize bidirectional friendships. Set intersection for mutual friends. O(min(|friends_A|, |friends_B|)) with hash sets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "Revenue attribution — multi-touch model (Airbnb — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Implement last-touch and linear attribution models for marketing channels."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nfrom collections import defaultdict\n\n# Touchpoint data: user journeys before conversion\njourneys = pd.DataFrame({\n    'user_id': [1,1,1,2,2,3,3,3,3],\n    'channel': ['search','email','social','search','email','display','search','email','social'],\n    'timestamp': pd.date_range('2024-01-01', periods=9, freq='D'),\n    'converted': [0,0,1,0,1,0,0,0,1],\n    'revenue': [0,0,100,0,200,0,0,0,150]\n})\n\n# Last-touch attribution\ndef last_touch(df):\n    conversions = df[df['converted'] == 1]\n    # Last touchpoint before conversion for each user\n    last_touches = (df.groupby('user_id')\n                     .apply(lambda x: x[x['converted'] == 1].iloc[0] if x['converted'].any() else None)\n                     .dropna())\n    return last_touches.groupby('channel')['revenue'].sum()\n\n# Linear attribution (equal credit to all touchpoints)\ndef linear_attribution(df):\n    attribution = defaultdict(float)\n    for user_id, group in df.groupby('user_id'):\n        if group['converted'].any():\n            revenue = group[group['converted'] == 1]['revenue'].iloc[0]\n            touchpoints = group[group['converted'] == 0].append(\n                group[group['converted'] == 1].head(1)\n            )\n            credit = revenue / len(touchpoints)\n            for _, row in touchpoints.iterrows():\n                attribution[row['channel']] += credit\n    return dict(attribution)\n\n# Time-decay attribution\ndef time_decay_attribution(df, half_life_days=7):\n    import numpy as np\n    attribution = defaultdict(float)\n\n    for user_id, group in df.groupby('user_id'):\n        if group['converted'].any():\n            conv_row = group[group['converted'] == 1].iloc[0]\n            revenue = conv_row['revenue']\n            conv_time = conv_row['timestamp']\n\n            # Calculate decay weights\n            weights = {}\n            for _, row in group.iterrows():\n                days_before = (conv_time - row['timestamp']).days\n                weight = np.exp(-0.693 * days_before / half_life_days)\n                weights[row.name] = weight\n\n            total_weight = sum(weights.values())\n            for idx, weight in weights.items():\n                channel = group.loc[idx, 'channel']\n                attribution[channel] += revenue * (weight / total_weight)\n\n    return dict(attribution)\n\nprint(\"Last-touch:\", last_touch(journeys).to_dict())\nprint(\"Linear:\", linear_attribution(journeys))"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Last-touch over-credits bottom-funnel channels. Linear is fair but simplistic. Time-decay balances recency and contribution. Shapley value is the gold standard."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

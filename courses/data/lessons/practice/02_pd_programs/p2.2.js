/* ============================================================================
   PRACTICE P2.2 — Pandas Programs · 2
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p2.2",
 "lede": "**25 programs** from Pandas Programs. Read the title, write the program yourself, then open the worked version and what it printed when it was run.",
 "objectives": [
  "Write each program from its title before opening the worked version",
  "Predict the printed shapes and numbers before revealing the output",
  "Say which layer, loss or trick each program demonstrates and when you would reach for it",
  "Change one thing in each program — a shape, a hyperparameter — and predict what the output becomes"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "drill",
   "n": "26",
   "q": "Binning (cut & qcut)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\nages = pd.Series([15, 22, 35, 45, 55, 65, 75, 28, 42])\n\n# Fixed-width bins\nage_bins = pd.cut(ages, bins=[0, 18, 35, 55, 100], labels=['Teen', 'Young', 'Middle', 'Senior'])\nprint(age_bins)\n\n# Quantile-based bins\nquartiles = pd.qcut(ages, q=4, labels=['Q1', 'Q2', 'Q3', 'Q4'])\nprint(quartiles)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "27",
   "q": "Correlation Analysis",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame({\n    'x': np.random.randn(100),\n    'y': np.random.randn(100),\n})\ndf['z'] = df['x'] * 2 + np.random.randn(100) * 0.1\n\nprint(\"Correlation matrix:\")\nprint(df.corr().round(3))\nprint(f\"\\nCorr(x,z): {df['x'].corr(df['z']):.4f}\")  # ~0.99"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "28",
   "q": "Stack & Unstack",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\ndf = pd.DataFrame({\n    'city': ['NYC', 'NYC', 'LA', 'LA'],\n    'year': [2023, 2024, 2023, 2024],\n    'sales': [100, 120, 80, 95]\n})\npivoted = df.set_index(['city', 'year']).unstack()\nprint(pivoted)\nstacked = pivoted.stack()\nprint(stacked)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "29",
   "q": "Where & Mask",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\ndf = pd.DataFrame({'A': [1, -2, 3, -4, 5]})\n# where: keep where True, replace where False\nprint(df.where(df > 0, 0))     # Replace negatives with 0\n# mask: replace where True, keep where False\nprint(df.mask(df > 0, 999))    # Replace positives with 999"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "30",
   "q": "Assign & Eval",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame({'x': range(1, 6), 'y': range(10, 60, 10)})\n\n# Method chaining with assign\nresult = df.assign(\n    z=lambda d: d['x'] + d['y'],\n    ratio=lambda d: d['y'] / d['x'],\n    log_y=lambda d: np.log(d['y'])\n)\nprint(result)\n\n# Eval for complex expressions\ndf['result'] = df.eval('(x ** 2 + y) / (x + 1)')\nprint(df)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "31",
   "q": "Custom Aggregation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame({\n    'group': ['A', 'A', 'B', 'B', 'C', 'C'],\n    'value': [10, 20, 15, 25, 30, 5]\n})\n\n# Named aggregation\nresult = df.groupby('group').agg(\n    avg_value=('value', 'mean'),\n    max_value=('value', 'max'),\n    range_value=('value', lambda x: x.max() - x.min()),\n    count=('value', 'count')\n)\nprint(result)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "32",
   "q": "Rolling Apply with Custom Function",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame({\n    'price': np.random.randn(20).cumsum() + 100\n})\n\n# Custom rolling function: Sharpe-like ratio\ndef rolling_sharpe(window):\n    return window.mean() / window.std() if window.std() != 0 else 0\n\ndf['sharpe_10'] = df['price'].pct_change().rolling(10).apply(rolling_sharpe, raw=False)\nprint(df.tail(10))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Complex Filtering",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\ndf = pd.DataFrame({\n    'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],\n    'age': [25, 30, 35, 28, 42],\n    'dept': ['Eng', 'Mkt', 'Eng', 'DS', 'Mkt'],\n    'salary': [90000, 65000, 95000, 80000, 70000]\n})\n\n# isin\nprint(df[df['dept'].isin(['Eng', 'DS'])])\n\n# between\nprint(df[df['age'].between(28, 35)])\n\n# Multiple conditions\nmask = (df['salary'] > 70000) & (df['dept'] != 'Mkt') | (df['age'] > 40)\nprint(df[mask])\n\n# nlargest / nsmallest\nprint(df.nlargest(3, 'salary'))\nprint(df.nsmallest(2, 'age'))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "34",
   "q": "Data Type Conversion",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame({\n    'str_num': ['1', '2', '3', 'four', '5'],\n    'float_str': ['1.5', '2.3', 'NA', '4.1', '5.0'],\n    'bool_int': [0, 1, 1, 0, 1],\n    'date_str': ['2024-01-01', '2024-02-15', '2024-03-20', 'invalid', '2024-05-10']\n})\n\ndf['int_col'] = pd.to_numeric(df['str_num'], errors='coerce')\ndf['float_col'] = pd.to_numeric(df['float_str'], errors='coerce')\ndf['bool_col'] = df['bool_int'].astype(bool)\ndf['date_col'] = pd.to_datetime(df['date_str'], errors='coerce')\n\nprint(df.dtypes)\nprint(df)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Sample & Bootstrap",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame({\n    'value': np.random.randn(100)\n})\n\n# Random sample\nsample = df.sample(n=10, random_state=42)\nprint(f\"Sample mean: {sample['value'].mean():.4f}\")\n\n# Bootstrap confidence interval\ndef bootstrap_ci(data, n_boot=1000, ci=0.95):\n    means = [data.sample(frac=1, replace=True)['value'].mean() for _ in range(n_boot)]\n    lower = np.percentile(means, (1-ci)/2 * 100)\n    upper = np.percentile(means, (1+ci)/2 * 100)\n    return lower, upper\n\nlo, hi = bootstrap_ci(df)\nprint(f\"95% CI: ({lo:.4f}, {hi:.4f})\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "36",
   "q": "MultiIndex GroupBy",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\ndf = pd.DataFrame({\n    'year': [2023, 2023, 2023, 2024, 2024, 2024],\n    'quarter': ['Q1', 'Q2', 'Q3', 'Q1', 'Q2', 'Q3'],\n    'region': ['East', 'East', 'West', 'East', 'West', 'West'],\n    'revenue': [100, 150, 120, 110, 160, 130]\n})\n\nresult = df.groupby(['year', 'quarter'])['revenue'].agg(['sum', 'mean'])\nprint(result)\n\n# Cross-group percentage\ndf['pct_of_year'] = df.groupby('year')['revenue'].transform(lambda x: x / x.sum() * 100)\nprint(df)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "37",
   "q": "Sparse DataFrames",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\n# Create sparse data (many zeros)\ndata = np.random.choice([0, 0, 0, 0, 1, 2, 3], size=(1000, 10))\ndf_dense = pd.DataFrame(data, columns=[f'col_{i}' for i in range(10)])\ndf_sparse = df_dense.astype(pd.SparseDtype(int, fill_value=0))\n\nprint(f\"Dense memory: {df_dense.memory_usage(deep=True).sum():,} bytes\")\nprint(f\"Sparse memory: {df_sparse.memory_usage(deep=True).sum():,} bytes\")\nprint(f\"Density: {df_sparse['col_0'].sparse.density:.2%}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "38",
   "q": "Data Profiling",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndef data_profile(df):\n    profile = pd.DataFrame({\n        'dtype': df.dtypes,\n        'count': df.count(),\n        'missing': df.isnull().sum(),\n        'missing_pct': (df.isnull().sum() / len(df) * 100).round(1),\n        'unique': df.nunique(),\n        'unique_pct': (df.nunique() / len(df) * 100).round(1)\n    })\n    \n    # Add numeric stats\n    numeric = df.select_dtypes(include=[np.number])\n    if not numeric.empty:\n        stats = numeric.describe().T[['mean', 'std', 'min', 'max']]\n        profile = profile.join(stats)\n    \n    return profile\n\ndf = pd.DataFrame({\n    'id': range(100),\n    'value': np.random.randn(100),\n    'category': np.random.choice(['A', 'B', 'C'], 100),\n    'flag': np.random.choice([True, False, None], 100)\n})\n\nprint(data_profile(df))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "39",
   "q": "Interval Index",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\n# Create interval-based binning\nscores = np.random.randint(0, 100, 20)\nbins = pd.IntervalIndex.from_breaks([0, 40, 60, 80, 100])\nlabels = ['Fail', 'Pass', 'Good', 'Excellent']\n\nresult = pd.cut(scores, bins)\nprint(pd.value_counts(result))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "40",
   "q": "Accessor Extensions",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\n# String accessor\ns = pd.Series(['hello world', 'foo bar', 'python pandas'])\nprint(s.str.upper())\nprint(s.str.contains('o'))\nprint(s.str.split().str.len())\n\n# Datetime accessor\ndates = pd.to_datetime(['2024-01-15', '2024-06-20', '2024-12-25'])\ns_dates = pd.Series(dates)\nprint(s_dates.dt.month_name())\nprint(s_dates.dt.is_month_end)\nprint(s_dates.dt.day_of_year)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "41",
   "q": "JSON Handling",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport json\n\ndata = {'records': [\n    {'name': 'Alice', 'scores': {'math': 90, 'science': 85}},\n    {'name': 'Bob', 'scores': {'math': 75, 'science': 92}}\n]}\n\ndf = pd.json_normalize(data['records'])\nprint(df)\n# Output: name  scores.math  scores.science"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "42",
   "q": "Excel-like Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame({\n    'product': ['A', 'B', 'C', 'D', 'E'],\n    'price': [100, 200, 150, 300, 250],\n    'quantity': [50, 30, 40, 10, 20]\n})\ndf['revenue'] = df['price'] * df['quantity']\ndf['cum_revenue'] = df['revenue'].cumsum()\ndf['pct_total'] = df['revenue'] / df['revenue'].sum() * 100\ndf['running_pct'] = df['pct_total'].cumsum()\nprint(df)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "43",
   "q": "Pareto Analysis",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame({\n    'issue': [f'Issue_{i}' for i in range(10)],\n    'count': [45, 32, 28, 22, 18, 15, 12, 10, 8, 5]\n})\ndf = df.sort_values('count', ascending=False)\ndf['cum_pct'] = df['count'].cumsum() / df['count'].sum() * 100\ndf['pareto_class'] = pd.cut(df['cum_pct'], bins=[0, 80, 95, 100], labels=['A', 'B', 'C'])\nprint(df)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "44",
   "q": "Cohort Analysis Setup",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\nnp.random.seed(42)\nn = 500\ndf = pd.DataFrame({\n    'user_id': np.random.randint(1, 100, n),\n    'order_date': pd.date_range('2024-01-01', periods=n, freq='8H'),\n    'amount': np.random.randint(10, 500, n)\n})\n\ndf['order_month'] = df['order_date'].dt.to_period('M')\ndf['cohort'] = df.groupby('user_id')['order_month'].transform('min')\ncohort_data = df.groupby(['cohort', 'order_month']).agg(\n    users=('user_id', 'nunique'),\n    revenue=('amount', 'sum')\n).reset_index()\nprint(cohort_data.head(10))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "45",
   "q": "RFM Analysis",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\nnp.random.seed(42)\ndf = pd.DataFrame({\n    'customer_id': np.random.randint(1, 50, 200),\n    'date': pd.date_range('2024-01-01', periods=200, freq='2D'),\n    'amount': np.random.randint(10, 500, 200)\n})\n\nreference_date = df['date'].max() + pd.Timedelta(days=1)\nrfm = df.groupby('customer_id').agg(\n    recency=('date', lambda x: (reference_date - x.max()).days),\n    frequency=('date', 'count'),\n    monetary=('amount', 'sum')\n)\n\nfor col in ['recency', 'frequency', 'monetary']:\n    ascending = col == 'recency'  # Lower recency is better\n    rfm[f'{col}_score'] = pd.qcut(rfm[col].rank(method='first', ascending=ascending), \n                                   q=4, labels=[1,2,3,4]).astype(int)\n\nrfm['rfm_score'] = rfm['recency_score'] + rfm['frequency_score'] + rfm['monetary_score']\nprint(rfm.sort_values('rfm_score', ascending=False).head())"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "46",
   "q": "Lag Features",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame({\n    'date': pd.date_range('2024-01-01', periods=20),\n    'value': np.random.randn(20).cumsum() + 50\n})\n\nfor lag in [1, 3, 7]:\n    df[f'lag_{lag}'] = df['value'].shift(lag)\n    df[f'diff_{lag}'] = df['value'].diff(lag)\n    df[f'pct_change_{lag}'] = df['value'].pct_change(lag)\n\nprint(df.tail(10))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "47",
   "q": "Feature Engineering Pipeline",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndef engineer_features(df, date_col, numeric_cols, cat_cols):\n    result = df.copy()\n    \n    # Date features\n    result[f'{date_col}_year'] = result[date_col].dt.year\n    result[f'{date_col}_month'] = result[date_col].dt.month\n    result[f'{date_col}_dow'] = result[date_col].dt.dayofweek\n    result[f'{date_col}_is_weekend'] = result[date_col].dt.dayofweek >= 5\n    \n    # Numeric features\n    for col in numeric_cols:\n        result[f'{col}_log'] = np.log1p(result[col].clip(lower=0))\n        result[f'{col}_sq'] = result[col] ** 2\n    \n    # Interaction features\n    if len(numeric_cols) >= 2:\n        for i in range(len(numeric_cols)):\n            for j in range(i+1, len(numeric_cols)):\n                c1, c2 = numeric_cols[i], numeric_cols[j]\n                result[f'{c1}_x_{c2}'] = result[c1] * result[c2]\n    \n    # Categorical encoding\n    for col in cat_cols:\n        dummies = pd.get_dummies(result[col], prefix=col)\n        result = pd.concat([result, dummies], axis=1)\n    \n    return result\n\ndf = pd.DataFrame({\n    'date': pd.date_range('2024-01-01', periods=10),\n    'sales': np.random.randint(100, 1000, 10),\n    'price': np.random.uniform(10, 50, 10),\n    'category': np.random.choice(['A', 'B', 'C'], 10)\n})\n\ndf_fe = engineer_features(df, 'date', ['sales', 'price'], ['category'])\nprint(f\"Original cols: {len(df.columns)}, Engineered: {len(df_fe.columns)}\")\nprint(df_fe.columns.tolist())"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "48",
   "q": "Pivot & Unpivot",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\ndf = pd.DataFrame({\n    'student': ['Alice', 'Alice', 'Bob', 'Bob'],\n    'subject': ['Math', 'Science', 'Math', 'Science'],\n    'score': [90, 85, 75, 92]\n})\n\nwide = df.pivot(index='student', columns='subject', values='score')\nprint(\"Wide:\\n\", wide)\n\nlong = wide.reset_index().melt(id_vars='student', var_name='subject', value_name='score')\nprint(\"\\nLong:\\n\", long)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "49",
   "q": "Data Validation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndef validate_dataframe(df, rules):\n    \"\"\"Apply validation rules to dataframe\"\"\"\n    issues = []\n    for col, checks in rules.items():\n        if col not in df.columns:\n            issues.append(f\"Missing column: {col}\")\n            continue\n        for check_name, check_fn in checks.items():\n            failures = df[~df[col].apply(check_fn)]\n            if len(failures) > 0:\n                issues.append(f\"{col}.{check_name}: {len(failures)} failures\")\n    return issues\n\ndf = pd.DataFrame({\n    'age': [25, -5, 30, 200, 28],\n    'email': ['a@b.com', 'invalid', 'c@d.com', '', 'e@f.com'],\n    'salary': [50000, 60000, None, 55000, 70000]\n})\n\nrules = {\n    'age': {\n        'positive': lambda x: x > 0 if pd.notna(x) else True,\n        'reasonable': lambda x: 0 < x < 120 if pd.notna(x) else True\n    },\n    'email': {\n        'contains_at': lambda x: '@' in str(x) and len(str(x)) > 3\n    }\n}\n\nissues = validate_dataframe(df, rules)\nfor issue in issues:\n    print(f\"⚠ {issue}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "50",
   "q": "Chained Operations Summary",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\nnp.random.seed(42)\ndf = pd.DataFrame({\n    'date': pd.date_range('2024-01-01', periods=365),\n    'category': np.random.choice(['Electronics', 'Clothing', 'Food'], 365),\n    'sales': np.random.lognormal(5, 1, 365),\n    'returns': np.random.lognormal(2, 0.5, 365)\n})\n\nsummary = (df\n    .assign(net_sales=lambda d: d['sales'] - d['returns'])\n    .assign(month=lambda d: d['date'].dt.month)\n    .groupby(['month', 'category'])\n    .agg(\n        total_sales=('sales', 'sum'),\n        total_returns=('returns', 'sum'),\n        avg_net=('net_sales', 'mean'),\n        count=('net_sales', 'count')\n    )\n    .round(2)\n    .sort_values(['month', 'total_sales'], ascending=[True, False])\n)\nprint(summary.head(12))"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

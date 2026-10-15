/* ============================================================================
   PRACTICE P2.1 — Pandas Programs · 1
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p2.1",
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
   "n": "1",
   "q": "DataFrame Creation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\n# From dictionary\ndf = pd.DataFrame({\n    'name': ['Alice', 'Bob', 'Charlie', 'Diana'],\n    'age': [25, 30, 35, 28],\n    'salary': [50000, 60000, 75000, 55000],\n    'department': ['Engineering', 'Marketing', 'Engineering', 'Data Science']\n})\nprint(df)\nprint(f\"\\nShape: {df.shape}\")  # (4, 4)\nprint(f\"Dtypes:\\n{df.dtypes}\")\nprint(f\"Info:\")\ndf.info()"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "2",
   "q": "DataFrame Indexing & Selection",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\ndf = pd.DataFrame({\n    'A': [1, 2, 3, 4, 5],\n    'B': [10, 20, 30, 40, 50],\n    'C': ['a', 'b', 'c', 'd', 'e']\n}, index=['r1', 'r2', 'r3', 'r4', 'r5'])\n\n# Column selection\nprint(df['A'])\nprint(df[['A', 'B']])\n\n# Row selection\nprint(df.loc['r2'])          # By label\nprint(df.iloc[1])            # By position\nprint(df.loc['r2':'r4'])     # Slice by label (inclusive)\nprint(df.iloc[1:4])          # Slice by position\n\n# Conditional\nprint(df[df['A'] > 2])\nprint(df.query('A > 2 and B < 50'))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "3",
   "q": "GroupBy Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\ndf = pd.DataFrame({\n    'department': ['Eng', 'Eng', 'Marketing', 'Marketing', 'DS', 'DS'],\n    'employee': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'],\n    'salary': [90000, 85000, 70000, 72000, 95000, 88000],\n    'years': [5, 3, 7, 2, 4, 6]\n})\n\n# Basic groupby\nprint(df.groupby('department')['salary'].mean())\nprint(df.groupby('department').agg({\n    'salary': ['mean', 'min', 'max'],\n    'years': 'mean'\n}))\n\n# Transform\ndf['salary_zscore'] = df.groupby('department')['salary'].transform(\n    lambda x: (x - x.mean()) / x.std()\n)\nprint(df[['employee', 'salary_zscore']])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Merge & Join",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\nemployees = pd.DataFrame({\n    'emp_id': [1, 2, 3, 4],\n    'name': ['Alice', 'Bob', 'Charlie', 'Diana'],\n    'dept_id': [101, 102, 101, 103]\n})\n\ndepartments = pd.DataFrame({\n    'dept_id': [101, 102, 104],\n    'dept_name': ['Engineering', 'Marketing', 'HR']\n})\n\n# Inner join\nprint(pd.merge(employees, departments, on='dept_id'))\n\n# Left join\nprint(pd.merge(employees, departments, on='dept_id', how='left'))\n\n# Outer join\nprint(pd.merge(employees, departments, on='dept_id', how='outer'))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Pivot Table",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\ndf = pd.DataFrame({\n    'date': ['2024-01', '2024-01', '2024-02', '2024-02'] * 2,\n    'product': ['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B'],\n    'region': ['East', 'East', 'East', 'East', 'West', 'West', 'West', 'West'],\n    'sales': [100, 150, 120, 180, 90, 160, 130, 200]\n})\n\npivot = df.pivot_table(\n    values='sales',\n    index='product',\n    columns='region',\n    aggfunc='sum'\n)\nprint(pivot)\n\n# With margins (totals)\npivot_full = df.pivot_table(\n    values='sales',\n    index=['product', 'date'],\n    columns='region',\n    aggfunc='sum',\n    margins=True\n)\nprint(pivot_full)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Missing Data Handling",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame({\n    'A': [1, np.nan, 3, np.nan, 5],\n    'B': [np.nan, 2, np.nan, 4, 5],\n    'C': [1, 2, 3, 4, 5]\n})\n\nprint(f\"Null counts:\\n{df.isnull().sum()}\")\nprint(f\"Null percentage:\\n{(df.isnull().sum() / len(df) * 100).round(1)}\")\n\n# Fill methods\nprint(df.fillna(0))                # Fill with value\nprint(df.fillna(method='ffill'))   # Forward fill\nprint(df.fillna(method='bfill'))   # Backward fill\nprint(df.fillna(df.mean()))        # Fill with mean\nprint(df.dropna())                 # Drop rows with NaN\nprint(df.dropna(thresh=2))        # Keep rows with at least 2 non-null"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "7",
   "q": "String Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\ndf = pd.DataFrame({\n    'name': ['John Smith', 'jane doe', 'BOB JONES', '  Alice Brown  '],\n    'email': ['john@gmail.com', 'jane@yahoo.com', 'bob@outlook.com', 'alice@gmail.com']\n})\n\n# String methods\ndf['name_clean'] = df['name'].str.strip().str.title()\ndf['first_name'] = df['name_clean'].str.split().str[0]\ndf['last_name'] = df['name_clean'].str.split().str[-1]\ndf['domain'] = df['email'].str.split('@').str[1]\ndf['is_gmail'] = df['email'].str.contains('gmail')\ndf['name_len'] = df['name_clean'].str.len()\n\nprint(df[['name_clean', 'first_name', 'last_name', 'domain', 'is_gmail']])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "8",
   "q": "DateTime Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\ndf = pd.DataFrame({\n    'timestamp': pd.date_range('2024-01-01', periods=100, freq='D'),\n    'value': range(100)\n})\n\ndf['year'] = df['timestamp'].dt.year\ndf['month'] = df['timestamp'].dt.month\ndf['day_name'] = df['timestamp'].dt.day_name()\ndf['is_weekend'] = df['timestamp'].dt.dayofweek >= 5\ndf['quarter'] = df['timestamp'].dt.quarter\n\n# Resample\nmonthly = df.set_index('timestamp').resample('M')['value'].agg(['mean', 'sum'])\nprint(monthly)\n\n# Date arithmetic\ndf['next_week'] = df['timestamp'] + pd.Timedelta(days=7)\ndf['days_from_start'] = (df['timestamp'] - df['timestamp'].min()).dt.days\nprint(df[['timestamp', 'day_name', 'is_weekend', 'days_from_start']].head())"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Apply & Transform",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame({\n    'name': ['Alice', 'Bob', 'Charlie'],\n    'math': [90, 75, 85],\n    'science': [88, 92, 78],\n    'english': [95, 70, 82]\n})\n\n# Apply to columns\ndf['avg'] = df[['math', 'science', 'english']].mean(axis=1)\ndf['grade'] = df['avg'].apply(lambda x: 'A' if x >= 90 else 'B' if x >= 80 else 'C')\n\n# Apply function row-wise\ndef classify_student(row):\n    if row['avg'] >= 90:\n        return 'Excellent'\n    elif row['math'] == max(row['math'], row['science'], row['english']):\n        return 'Math-oriented'\n    return 'Average'\n\ndf['category'] = df.apply(classify_student, axis=1)\nprint(df)\n\n# Applymap (element-wise)\nnumeric_cols = df[['math', 'science', 'english']]\nprint(numeric_cols.map(lambda x: f\"{x/100:.0%}\"))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Window Functions",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\nnp.random.seed(42)\ndf = pd.DataFrame({\n    'date': pd.date_range('2024-01-01', periods=30),\n    'price': np.random.randn(30).cumsum() + 100\n})\n\n# Rolling calculations\ndf['MA_7'] = df['price'].rolling(7).mean()\ndf['MA_14'] = df['price'].rolling(14).mean()\ndf['rolling_std'] = df['price'].rolling(7).std()\ndf['rolling_min'] = df['price'].rolling(7).min()\ndf['rolling_max'] = df['price'].rolling(7).max()\n\n# Expanding window\ndf['cummax'] = df['price'].expanding().max()\ndf['cummin'] = df['price'].expanding().min()\n\n# EWMA\ndf['ewma'] = df['price'].ewm(span=7).mean()\n\nprint(df.tail(10))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Multi-Index DataFrames",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\narrays = [\n    ['NYC', 'NYC', 'LA', 'LA', 'Chicago', 'Chicago'],\n    ['2023', '2024', '2023', '2024', '2023', '2024']\n]\nindex = pd.MultiIndex.from_arrays(arrays, names=['city', 'year'])\n\ndf = pd.DataFrame({\n    'revenue': [100, 120, 80, 95, 60, 75],\n    'profit': [20, 25, 15, 18, 10, 12]\n}, index=index)\n\nprint(df)\nprint(f\"\\nNYC data:\\n{df.loc['NYC']}\")\nprint(f\"\\n2024 data:\\n{df.xs('2024', level='year')}\")\n\n# Reset / set index\ndf_flat = df.reset_index()\nprint(df_flat)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "12",
   "q": "Categorical Data",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\ndf = pd.DataFrame({\n    'size': ['S', 'M', 'L', 'XL', 'M', 'S', 'L', 'XL'],\n    'color': ['red', 'blue', 'red', 'green', 'blue', 'red', 'green', 'blue']\n})\n\n# Ordered categorical\ndf['size'] = pd.Categorical(df['size'], categories=['S', 'M', 'L', 'XL'], ordered=True)\nprint(df.sort_values('size'))\nprint(f\"\\nSize > M:\\n{df[df['size'] > 'M']}\")\n\n# Memory savings\ndf['color_cat'] = df['color'].astype('category')\nprint(f\"\\nString memory: {df['color'].memory_usage()}\")\nprint(f\"Category memory: {df['color_cat'].memory_usage()}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Data Cleaning Pipeline",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\n# Messy data\ndf = pd.DataFrame({\n    'name': ['  Alice ', 'bob', None, 'DIANA', 'alice'],\n    'age': [25, -5, 30, 200, 28],\n    'salary': ['50,000', '60000', '$75,000', '55000', None],\n    'date': ['2024-01-01', '01/15/2024', '2024-02-01', 'invalid', '2024-03-01']\n})\n\ndef clean_pipeline(df):\n    df = df.copy()\n    \n    # Clean names\n    df['name'] = df['name'].str.strip().str.title()\n    df = df.dropna(subset=['name'])\n    df = df.drop_duplicates(subset='name', keep='first')\n    \n    # Fix age outliers\n    df.loc[df['age'] < 0, 'age'] = np.nan\n    df.loc[df['age'] > 120, 'age'] = np.nan\n    df['age'] = df['age'].fillna(df['age'].median())\n    \n    # Clean salary\n    df['salary'] = df['salary'].astype(str).str.replace(r'[$,]', '', regex=True)\n    df['salary'] = pd.to_numeric(df['salary'], errors='coerce')\n    df['salary'] = df['salary'].fillna(df['salary'].median())\n    \n    # Parse dates\n    df['date'] = pd.to_datetime(df['date'], errors='coerce')\n    \n    return df\n\nprint(clean_pipeline(df))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Efficient Data Reading",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport io\n\n# CSV with options\ncsv_data = \"\"\"name,age,salary,department\nAlice,25,50000,Engineering\nBob,30,60000,Marketing\nCharlie,35,75000,Engineering\nDiana,,55000,Data Science\"\"\"\n\ndf = pd.read_csv(io.StringIO(csv_data), \n                 dtype={'name': str, 'department': 'category'},\n                 na_values=['', 'NA', 'null'])\nprint(df)\nprint(f\"\\nMemory: {df.memory_usage(deep=True).sum()} bytes\")\n\n# Memory optimization\ndef optimize_dtypes(df):\n    for col in df.select_dtypes(include=['int64']).columns:\n        df[col] = pd.to_numeric(df[col], downcast='integer')\n    for col in df.select_dtypes(include=['float64']).columns:\n        df[col] = pd.to_numeric(df[col], downcast='float')\n    for col in df.select_dtypes(include=['object']).columns:\n        if df[col].nunique() / len(df) < 0.5:\n            df[col] = df[col].astype('category')\n    return df\n\ndf_opt = optimize_dtypes(df.copy())\nprint(f\"Optimized memory: {df_opt.memory_usage(deep=True).sum()} bytes\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "15",
   "q": "Cross-Tabulation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\ndf = pd.DataFrame({\n    'gender': ['M', 'F', 'M', 'F', 'M', 'F', 'M', 'F'],\n    'product': ['A', 'A', 'B', 'B', 'A', 'B', 'A', 'A'],\n    'purchased': [1, 1, 0, 1, 1, 0, 0, 1]\n})\n\nct = pd.crosstab(df['gender'], df['product'])\nprint(\"Crosstab:\\n\", ct)\n\nct_norm = pd.crosstab(df['gender'], df['product'], normalize='index')\nprint(\"\\nNormalized:\\n\", ct_norm)\n\nct_margins = pd.crosstab(df['gender'], df['product'], margins=True)\nprint(\"\\nWith margins:\\n\", ct_margins)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "16",
   "q": "DataFrame Styling (Display)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame(np.random.randn(5, 4), columns=['A', 'B', 'C', 'D'])\n\n# Format display\nprint(df.round(2))\nprint(df.describe().round(2))\n\n# Custom formatting\nformatted = df.style.format(\"{:.2%}\").highlight_max(axis=0).set_caption(\"Random Data\")\n# In Jupyter: displays styled table\n\n# Summary stats\nprint(f\"\\nColumn stats:\")\nfor col in df.columns:\n    print(f\"  {col}: mean={df[col].mean():.4f}, std={df[col].std():.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Explode & Melt",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\n# Explode (unnest lists)\ndf = pd.DataFrame({\n    'name': ['Alice', 'Bob'],\n    'skills': [['Python', 'SQL', 'ML'], ['Java', 'AWS']]\n})\nprint(df.explode('skills'))\n\n# Melt (wide to long)\ndf_wide = pd.DataFrame({\n    'student': ['Alice', 'Bob'],\n    'math': [90, 75],\n    'science': [88, 92],\n    'english': [95, 70]\n})\n\ndf_long = df_wide.melt(id_vars='student', var_name='subject', value_name='score')\nprint(df_long)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Window Ranking",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\ndf = pd.DataFrame({\n    'department': ['Eng', 'Eng', 'Eng', 'Mkt', 'Mkt', 'DS', 'DS'],\n    'employee': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace'],\n    'salary': [90000, 85000, 95000, 70000, 72000, 88000, 92000]\n})\n\n# Rank within groups\ndf['dept_rank'] = df.groupby('department')['salary'].rank(ascending=False)\ndf['overall_rank'] = df['salary'].rank(ascending=False)\ndf['pct_rank'] = df.groupby('department')['salary'].rank(pct=True)\n\n# Dense rank\ndf['dense_rank'] = df['salary'].rank(method='dense', ascending=False)\n\nprint(df.sort_values(['department', 'dept_rank']))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Pipe & Method Chaining",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\ndef add_log_column(df, col):\n    return df.assign(**{f'log_{col}': np.log1p(df[col])})\n\ndef filter_positive(df, col):\n    return df[df[col] > 0]\n\ndef add_rank(df, col):\n    return df.assign(**{f'{col}_rank': df[col].rank()})\n\ndf = pd.DataFrame({\n    'value': np.random.randn(100) * 10 + 50,\n    'category': np.random.choice(['A', 'B', 'C'], 100)\n})\n\nresult = (df\n    .pipe(filter_positive, 'value')\n    .pipe(add_log_column, 'value')\n    .pipe(add_rank, 'value')\n    .groupby('category')\n    .agg({'value': ['mean', 'std'], 'log_value': 'mean'})\n    .round(2)\n)\n\nprint(result)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Time Series Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\nimport numpy as np\n\n# Create time series\ndates = pd.date_range('2020-01-01', '2023-12-31', freq='D')\nts = pd.Series(np.random.randn(len(dates)).cumsum() + 100, index=dates, name='stock_price')\n\n# Resampling\nmonthly = ts.resample('M').agg(['mean', 'std', 'min', 'max'])\nquarterly = ts.resample('Q').mean()\nyearly = ts.resample('Y').mean()\nprint(monthly.tail())\n\n# Shift and pct_change\ndf = pd.DataFrame({'price': ts})\ndf['prev_day'] = df['price'].shift(1)\ndf['daily_return'] = df['price'].pct_change()\ndf['7d_return'] = df['price'].pct_change(7)\ndf['cumulative_return'] = (1 + df['daily_return']).cumprod() - 1\n\nprint(df.tail())"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "21",
   "q": "Value Counts",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\ns = pd.Series(['a', 'b', 'a', 'c', 'a', 'b', 'd'])\nprint(s.value_counts())               # Count\nprint(s.value_counts(normalize=True)) # Percentage"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "22",
   "q": "Map & Replace",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\ndf = pd.DataFrame({'grade': ['A', 'B', 'C', 'A', 'B']})\nmapping = {'A': 'Excellent', 'B': 'Good', 'C': 'Fair'}\ndf['description'] = df['grade'].map(mapping)\ndf['points'] = df['grade'].replace({'A': 4, 'B': 3, 'C': 2})\nprint(df)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Cumulative Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\ndf = pd.DataFrame({'sales': [10, 20, 15, 25, 30]})\ndf['cum_sum'] = df['sales'].cumsum()\ndf['cum_max'] = df['sales'].cummax()\ndf['cum_min'] = df['sales'].cummin()\ndf['cum_prod'] = df['sales'].cumprod()\nprint(df)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "24",
   "q": "DataFrame Concatenation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\ndf1 = pd.DataFrame({'A': [1, 2], 'B': [3, 4]})\ndf2 = pd.DataFrame({'A': [5, 6], 'B': [7, 8]})\nprint(pd.concat([df1, df2], ignore_index=True))  # Vertical\nprint(pd.concat([df1, df2], axis=1))              # Horizontal"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "25",
   "q": "Duplicate Handling",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\ndf = pd.DataFrame({\n    'name': ['Alice', 'Bob', 'Alice', 'Charlie', 'Bob'],\n    'score': [90, 85, 90, 78, 92]\n})\nprint(f\"Duplicates: {df.duplicated().sum()}\")\nprint(f\"Duplicated rows:\\n{df[df.duplicated(subset='name', keep=False)]}\")\ndf_dedup = df.drop_duplicates(subset='name', keep='last')\nprint(f\"After dedup:\\n{df_dedup}\")"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

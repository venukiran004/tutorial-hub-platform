/* ============================================================================
   INTERVIEW I2.3 — Additional Probability & Statistics · Additional Machine Learning
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/02_Glassdoor_DS_and_MLE.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.3",
 "lede": "**8 questions** from Glassdoor Data Scientist and ML Engineer. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Additional Probability & Statistics · Additional Machine Learning",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "22",
   "q": "Birthday problem — probability of shared birthdays (Jane Street — Quantitative DS)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What's the probability that at least 2 people in a group of 23 share a birthday? Simulate it."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nfrom math import comb, factorial\n\n# Analytical solution\ndef birthday_probability(n, days=365):\n    \"\"\"P(at least one shared birthday) in group of n.\"\"\"\n    p_no_match = 1\n    for i in range(n):\n        p_no_match *= (days - i) / days\n    return 1 - p_no_match\n\nprint(f\"P(match in 23 people): {birthday_probability(23):.4f}\")  # ~0.5073\n\n# Monte Carlo simulation\ndef simulate_birthday(n_people, n_simulations=100000):\n    matches = 0\n    for _ in range(n_simulations):\n        birthdays = np.random.randint(0, 365, n_people)\n        if len(set(birthdays)) < n_people:\n            matches += 1\n    return matches / n_simulations\n\nprint(f\"Simulated: {simulate_birthday(23):.4f}\")\n\n# Find group size for given probability\nfor n in range(1, 100):\n    if birthday_probability(n) > 0.5:\n        print(f\"50% probability reached at n={n}\")  # n=23\n        break\n    if birthday_probability(n) > 0.99:\n        print(f\"99% probability reached at n={n}\")  # n=57\n        break"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Counter-intuitive result: only 23 people needed for 50% chance. Key formula: P(no match) = 365/365 × 364/365 × ... × (365-n+1)/365."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Bayesian A/B testing vs frequentist (Spotify — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Compare Bayesian and frequentist approaches to A/B testing. When to use each?"
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nfrom scipy import stats\n\n# Frequentist A/B Test\ndef frequentist_ab_test(control_conversions, control_total,\n                        treatment_conversions, treatment_total, alpha=0.05):\n    p1 = control_conversions / control_total\n    p2 = treatment_conversions / treatment_total\n\n    # Pooled proportion\n    p_pool = (control_conversions + treatment_conversions) / (control_total + treatment_total)\n    se = np.sqrt(p_pool * (1 - p_pool) * (1/control_total + 1/treatment_total))\n\n    z = (p2 - p1) / se\n    p_value = 2 * (1 - stats.norm.cdf(abs(z)))\n\n    return {\n        'control_rate': p1,\n        'treatment_rate': p2,\n        'lift': (p2 - p1) / p1 * 100,\n        'z_statistic': z,\n        'p_value': p_value,\n        'significant': p_value < alpha\n    }\n\n# Bayesian A/B Test\ndef bayesian_ab_test(control_conversions, control_total,\n                     treatment_conversions, treatment_total,\n                     n_simulations=100000):\n    # Beta posterior (uninformative prior: Beta(1,1))\n    control_samples = np.random.beta(\n        control_conversions + 1,\n        control_total - control_conversions + 1,\n        n_simulations\n    )\n    treatment_samples = np.random.beta(\n        treatment_conversions + 1,\n        treatment_total - treatment_conversions + 1,\n        n_simulations\n    )\n\n    prob_treatment_better = np.mean(treatment_samples > control_samples)\n    expected_lift = np.mean((treatment_samples - control_samples) / control_samples) * 100\n\n    return {\n        'P(treatment > control)': prob_treatment_better,\n        'expected_lift': expected_lift,\n        'lift_95_ci': np.percentile(\n            (treatment_samples - control_samples) / control_samples * 100,\n            [2.5, 97.5]\n        )\n    }\n\n# Example\nfreq = frequentist_ab_test(500, 10000, 550, 10000)\nbayes = bayesian_ab_test(500, 10000, 550, 10000)\nprint(\"Frequentist:\", freq)\nprint(\"Bayesian:\", bayes)"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Frequentist answers \"would we see this result by chance?\" Bayesian answers \"what's the probability treatment is better?\" Bayesian is preferred when you need to make continuous decisions (e.g., bandits)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "Explain and detect Simpson's Paradox (Uber — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What is Simpson's Paradox? Give a real-world example and how to detect it."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import pandas as pd\n\n# Classic example: Treatment effectiveness\ndata = pd.DataFrame({\n    'group': ['A']*200 + ['B']*200,\n    'treatment': ['drug']*100 + ['placebo']*100 + ['drug']*100 + ['placebo']*100,\n    'severity': ['mild']*80 + ['severe']*20 + ['mild']*30 + ['severe']*70 +\n                ['mild']*90 + ['severe']*10 + ['mild']*10 + ['severe']*90,\n    'recovered': [1]*70 + [0]*10 + [1]*5 + [0]*15 + [1]*15 + [0]*15 +\n                 [1]*18 + [0]*52 + [1]*85 + [0]*5 + [1]*3 + [0]*7 +\n                 [1]*7 + [0]*3 + [1]*60 + [0]*30\n})\n\n# Overall: Drug appears worse\noverall = data.groupby('treatment')['recovered'].mean()\nprint(\"Overall recovery rate:\")\nprint(overall)\n\n# Stratified by severity: Drug is actually better in BOTH groups\nfor severity in ['mild', 'severe']:\n    subset = data[data['severity'] == severity]\n    rates = subset.groupby('treatment')['recovered'].mean()\n    print(f\"\\n{severity.title()} cases:\")\n    print(rates)\n\n# Detection: Check if confounding variable reverses the trend\ndef detect_simpsons_paradox(df, treatment_col, outcome_col, confound_col):\n    \"\"\"Detect if overall trend reverses when stratified.\"\"\"\n    overall = df.groupby(treatment_col)[outcome_col].mean()\n    overall_winner = overall.idxmax()\n\n    reversals = 0\n    for stratum in df[confound_col].unique():\n        subset = df[df[confound_col] == stratum]\n        stratified = subset.groupby(treatment_col)[outcome_col].mean()\n        if stratified.idxmax() != overall_winner:\n            reversals += 1\n            print(f\"Reversal in {confound_col}={stratum}: {stratified.to_dict()}\")\n\n    if reversals > 0:\n        print(f\"\\n⚠️  Simpson's Paradox detected! {reversals} reversals found.\")\n    return reversals > 0"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Simpson's Paradox occurs when a confounding variable reverses aggregate trends. Always stratify by potential confounders. Causal inference (do-calculus) is the proper framework."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "Power analysis — sample size calculation (Netflix — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Calculate the required sample size for an A/B test detecting a 2% lift with 80% power."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from scipy import stats\nimport numpy as np\n\ndef sample_size_proportions(p1, mde, alpha=0.05, power=0.80):\n    \"\"\"Calculate sample size per group for proportion test.\n\n    Args:\n        p1: baseline conversion rate\n        mde: minimum detectable effect (absolute)\n        alpha: significance level\n        power: statistical power (1 - beta)\n    \"\"\"\n    p2 = p1 + mde\n\n    z_alpha = stats.norm.ppf(1 - alpha / 2)  # Two-tailed\n    z_beta = stats.norm.ppf(power)\n\n    p_avg = (p1 + p2) / 2\n\n    n = ((z_alpha * np.sqrt(2 * p_avg * (1 - p_avg)) +\n          z_beta * np.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2) / (mde ** 2)\n\n    return int(np.ceil(n))\n\n# Example: 5% baseline, detect 0.5% absolute lift\nn = sample_size_proportions(p1=0.05, mde=0.005)\nprint(f\"Sample size per group: {n:,}\")  # ~31,234\n\n# Power curve\nmdes = np.arange(0.001, 0.02, 0.001)\nsizes = [sample_size_proportions(0.05, mde) for mde in mdes]\n\nfor mde, size in zip(mdes, sizes):\n    print(f\"MDE: {mde:.1%} → n = {size:>10,}\")\n\n# Multi-variant test correction (Bonferroni)\ndef sample_size_multivariate(p1, mde, num_variants, alpha=0.05, power=0.80):\n    adjusted_alpha = alpha / num_variants  # Bonferroni correction\n    return sample_size_proportions(p1, mde, adjusted_alpha, power)\n\nn_multi = sample_size_multivariate(0.05, 0.005, num_variants=3)\nprint(f\"\\n3-variant test sample size: {n_multi:,}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Smaller MDE requires exponentially more samples. Bonferroni correction for multiple variants increases required sample size. Always calculate sample size BEFORE running the test."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "26",
   "q": "Implement gradient descent from scratch (Google — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Implement batch, mini-batch, and stochastic gradient descent for linear regression."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nclass LinearRegressionGD:\n    def __init__(self, learning_rate=0.01, n_iterations=1000, batch_size=None):\n        self.lr = learning_rate\n        self.n_iter = n_iterations\n        self.batch_size = batch_size  # None=batch, 1=SGD, >1=mini-batch\n\n    def fit(self, X, y):\n        n_samples, n_features = X.shape\n        self.weights = np.zeros(n_features)\n        self.bias = 0\n        self.loss_history = []\n\n        for _ in range(self.n_iter):\n            if self.batch_size:\n                # Mini-batch or SGD\n                indices = np.random.choice(n_samples, self.batch_size, replace=False)\n                X_batch, y_batch = X[indices], y[indices]\n            else:\n                X_batch, y_batch = X, y\n\n            # Forward pass\n            y_pred = X_batch @ self.weights + self.bias\n\n            # Compute gradients\n            dw = (1 / len(X_batch)) * X_batch.T @ (y_pred - y_batch)\n            db = (1 / len(X_batch)) * np.sum(y_pred - y_batch)\n\n            # Update parameters\n            self.weights -= self.lr * dw\n            self.bias -= self.lr * db\n\n            # Track loss\n            mse = np.mean((X @ self.weights + self.bias - y) ** 2)\n            self.loss_history.append(mse)\n\n        return self\n\n    def predict(self, X):\n        return X @ self.weights + self.bias\n\n# Test\nnp.random.seed(42)\nX = np.random.randn(100, 3)\ny = 2 * X[:, 0] + 3 * X[:, 1] - X[:, 2] + np.random.randn(100) * 0.1\n\nmodel = LinearRegressionGD(learning_rate=0.1, n_iterations=500)\nmodel.fit(X, y)\nprint(f\"Weights: {model.weights}\")  # Close to [2, 3, -1]\nprint(f\"Final MSE: {model.loss_history[-1]:.4f}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Batch GD: stable but slow. SGD: fast but noisy. Mini-batch: best of both. Learning rate too high → diverges; too low → slow convergence. Use learning rate scheduling in practice."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "Build a decision tree from scratch (Amazon — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Implement a decision tree classifier using information gain."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nfrom collections import Counter\n\nclass DecisionTree:\n    def __init__(self, max_depth=10, min_samples=2):\n        self.max_depth = max_depth\n        self.min_samples = min_samples\n\n    def _entropy(self, y):\n        counts = Counter(y)\n        probs = [c / len(y) for c in counts.values()]\n        return -sum(p * np.log2(p) for p in probs if p > 0)\n\n    def _information_gain(self, X, y, feature, threshold):\n        left_mask = X[:, feature] <= threshold\n        right_mask = ~left_mask\n\n        if sum(left_mask) == 0 or sum(right_mask) == 0:\n            return 0\n\n        parent_entropy = self._entropy(y)\n        n = len(y)\n        left_entropy = self._entropy(y[left_mask])\n        right_entropy = self._entropy(y[right_mask])\n\n        child_entropy = (sum(left_mask)/n * left_entropy +\n                        sum(right_mask)/n * right_entropy)\n\n        return parent_entropy - child_entropy\n\n    def _best_split(self, X, y):\n        best_gain = 0\n        best_feature = None\n        best_threshold = None\n\n        for feature in range(X.shape[1]):\n            thresholds = np.unique(X[:, feature])\n            for threshold in thresholds:\n                gain = self._information_gain(X, y, feature, threshold)\n                if gain > best_gain:\n                    best_gain = gain\n                    best_feature = feature\n                    best_threshold = threshold\n\n        return best_feature, best_threshold, best_gain\n\n    def _build_tree(self, X, y, depth=0):\n        # Base cases\n        if (depth >= self.max_depth or len(set(y)) == 1 or\n            len(y) < self.min_samples):\n            return Counter(y).most_common(1)[0][0]\n\n        feature, threshold, gain = self._best_split(X, y)\n\n        if gain == 0:\n            return Counter(y).most_common(1)[0][0]\n\n        left_mask = X[:, feature] <= threshold\n        left_tree = self._build_tree(X[left_mask], y[left_mask], depth + 1)\n        right_tree = self._build_tree(X[~left_mask], y[~left_mask], depth + 1)\n\n        return {'feature': feature, 'threshold': threshold,\n                'left': left_tree, 'right': right_tree}\n\n    def fit(self, X, y):\n        self.tree = self._build_tree(X, y)\n        return self\n\n    def _predict_one(self, x, tree):\n        if not isinstance(tree, dict):\n            return tree\n        if x[tree['feature']] <= tree['threshold']:\n            return self._predict_one(x, tree['left'])\n        return self._predict_one(x, tree['right'])\n\n    def predict(self, X):\n        return np.array([self._predict_one(x, self.tree) for x in X])\n\n# Test with Iris-like data\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)\n\ndt = DecisionTree(max_depth=5)\ndt.fit(X_train, y_train)\naccuracy = np.mean(dt.predict(X_test) == y_test)\nprint(f\"Accuracy: {accuracy:.4f}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Entropy measures impurity. Information gain = parent entropy - weighted child entropy. Greedy splits at each node. Max depth prevents overfitting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "Explain and implement cross-validation (Apple — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Implement k-fold cross-validation from scratch and explain stratified vs regular."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nfrom collections import defaultdict\n\ndef k_fold_split(X, y, k=5, shuffle=True, stratified=False):\n    \"\"\"Generate k-fold train/test splits.\"\"\"\n    n = len(X)\n    indices = np.arange(n)\n\n    if stratified:\n        # Group indices by class\n        class_indices = defaultdict(list)\n        for i, label in enumerate(y):\n            class_indices[label].append(i)\n\n        folds = [[] for _ in range(k)]\n        for label, idx_list in class_indices.items():\n            if shuffle:\n                np.random.shuffle(idx_list)\n            for i, idx in enumerate(idx_list):\n                folds[i % k].append(idx)\n    else:\n        if shuffle:\n            np.random.shuffle(indices)\n        folds = np.array_split(indices, k)\n\n    for i in range(k):\n        test_idx = np.array(folds[i])\n        train_idx = np.concatenate([folds[j] for j in range(k) if j != i])\n        yield train_idx, test_idx\n\ndef cross_validate(model_class, X, y, k=5, metric_fn=None, **model_params):\n    \"\"\"Run k-fold CV and return scores.\"\"\"\n    if metric_fn is None:\n        metric_fn = lambda y_true, y_pred: np.mean(y_true == y_pred)\n\n    scores = []\n    for fold, (train_idx, test_idx) in enumerate(k_fold_split(X, y, k, stratified=True)):\n        X_train, X_test = X[train_idx], X[test_idx]\n        y_train, y_test = y[train_idx], y[test_idx]\n\n        model = model_class(**model_params)\n        model.fit(X_train, y_train)\n        y_pred = model.predict(X_test)\n\n        score = metric_fn(y_test, y_pred)\n        scores.append(score)\n        print(f\"Fold {fold+1}: {score:.4f}\")\n\n    print(f\"\\nMean: {np.mean(scores):.4f} ± {np.std(scores):.4f}\")\n    return scores"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Stratified CV maintains class proportions in each fold — critical for imbalanced data. k=5 or k=10 is standard. Leave-one-out (k=n) has high variance, rarely used."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "Feature importance — permutation vs built-in (Microsoft — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Compare feature importance methods and their trade-offs."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.inspection import permutation_importance\nfrom sklearn.datasets import make_classification\n\n# Create dataset with known important features\nX, y = make_classification(n_samples=1000, n_features=10, n_informative=3,\n                           n_redundant=2, random_state=42)\n\nmodel = RandomForestClassifier(n_estimators=100, random_state=42)\nmodel.fit(X, y)\n\n# Method 1: Built-in (Gini importance)\ngini_importance = model.feature_importances_\nprint(\"Gini Importance:\")\nfor i, imp in enumerate(gini_importance):\n    print(f\"  Feature {i}: {imp:.4f}\")\n\n# Method 2: Permutation importance\nperm_imp = permutation_importance(model, X, y, n_repeats=10, random_state=42)\nprint(\"\\nPermutation Importance:\")\nfor i in np.argsort(perm_imp.importances_mean)[::-1]:\n    print(f\"  Feature {i}: {perm_imp.importances_mean[i]:.4f} ± {perm_imp.importances_std[i]:.4f}\")\n\n# Method 3: Drop-column importance (gold standard but slow)\nfrom sklearn.model_selection import cross_val_score\n\nbaseline = cross_val_score(model, X, y, cv=5).mean()\nprint(f\"\\nDrop-Column Importance (baseline: {baseline:.4f}):\")\nfor i in range(X.shape[1]):\n    X_dropped = np.delete(X, i, axis=1)\n    score = cross_val_score(\n        RandomForestClassifier(n_estimators=100, random_state=42),\n        X_dropped, y, cv=5\n    ).mean()\n    print(f\"  Feature {i}: drop = {baseline - score:.4f}\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Gini importance is biased toward high-cardinality features. Permutation importance is model-agnostic and unbiased. Drop-column is most accurate but O(features × training time). SHAP values are the gold standard for interpretability."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

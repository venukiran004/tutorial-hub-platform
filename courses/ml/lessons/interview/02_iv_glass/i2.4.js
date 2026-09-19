/* ============================================================================
   INTERVIEW I2.4 — Additional Product & Business Sense · Additional A/B Testing · Additional System Design for Data Science · Additional Behavioral & Scenarios · Additional Statistics & Probability
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/02_Glassdoor_DS_and_MLE.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.4",
 "lede": "**11 questions** from Glassdoor Data Scientist and ML Engineer. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Additional Product & Business Sense · Additional A/B Testing · Additional System Design for Data Science · Additional Behavioral & Scenarios · Additional Statistics & Probability",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "30",
   "q": "Design metrics for a new social media feature (Meta — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Meta is launching a new \"Stories\" feature. What metrics would you track to evaluate success?"
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"\"\"\nMetric Framework for Social Media Stories Feature:\n\n1. ENGAGEMENT METRICS (North Star: DAU/MAU ratio for Stories)\n   - Stories created per user per day\n   - Stories viewed per user per day\n   - View-through rate (% viewers who watch full story)\n   - Reply rate (replies per story view)\n   - Share rate (shares per story view)\n\n2. RETENTION METRICS\n   - D1, D7, D30 retention of story creators\n   - D1, D7, D30 retention of story viewers\n   - Time to first story creation after feature launch\n\n3. CANNIBALIZATION CHECK\n   - Did News Feed posts decrease?\n   - Did time spent on feed change?\n   - Did message volume change?\n\n4. QUALITY METRICS\n   - Average story creation time\n   - % stories with stickers/effects (engagement depth)\n   - Report rate (safety)\n\n5. BUSINESS METRICS\n   - Ad revenue per story view\n   - Story ad completion rate\n   - Advertiser adoption rate\n\"\"\"\n\n# Metric calculation example\nimport pandas as pd\nimport numpy as np\n\ndef calculate_story_metrics(events_df):\n    \"\"\"Calculate key metrics from event data.\"\"\"\n\n    # DAU/MAU\n    dau = events_df.groupby('date')['user_id'].nunique()\n    mau = events_df.groupby(events_df['date'].dt.to_period('M'))['user_id'].nunique()\n\n    # Stories per user\n    creators = events_df[events_df['event'] == 'story_created']\n    stories_per_user = (creators.groupby(['date', 'user_id']).size()\n                       .reset_index(name='count')\n                       .groupby('date')['count'].mean())\n\n    # View-through rate\n    views = events_df[events_df['event'].isin(['story_view_start', 'story_view_complete'])]\n    starts = views[views['event'] == 'story_view_start'].shape[0]\n    completes = views[views['event'] == 'story_view_complete'].shape[0]\n    vtr = completes / starts if starts > 0 else 0\n\n    return {\n        'avg_dau': dau.mean(),\n        'stories_per_user_per_day': stories_per_user.mean(),\n        'view_through_rate': vtr\n    }"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Always define a North Star metric. Check for cannibalization of existing features. Use guardrail metrics (e.g., report rate) to ensure quality. Framework: Acquisition → Activation → Engagement → Retention → Revenue."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "Root cause analysis — revenue drop investigation (Amazon — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Revenue dropped 15% week-over-week. Walk through your investigation framework."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"\"\"\nRevenue Drop Investigation Framework:\n\nStep 1: VERIFY the drop\n- Is it a data pipeline issue?\n- Compare multiple data sources\n- Check for logging changes\n\nStep 2: DECOMPOSE revenue\nRevenue = Users × Conversion Rate × Average Order Value\n\nStep 3: SEGMENT analysis\n\"\"\"\nimport pandas as pd\nimport numpy as np\n\ndef investigate_revenue_drop(current_week, previous_week):\n    \"\"\"Decompose revenue drop into contributing factors.\"\"\"\n\n    # Overall comparison\n    metrics = {}\n    for period_name, df in [('prev', previous_week), ('curr', current_week)]:\n        metrics[period_name] = {\n            'revenue': df['revenue'].sum(),\n            'users': df['user_id'].nunique(),\n            'orders': len(df),\n            'conversion_rate': len(df) / df['user_id'].nunique(),\n            'aov': df['revenue'].mean()\n        }\n\n    # Contribution analysis\n    print(\"=== Revenue Decomposition ===\")\n    for metric in ['users', 'conversion_rate', 'aov']:\n        prev = metrics['prev'][metric]\n        curr = metrics['curr'][metric]\n        change = (curr - prev) / prev * 100\n        print(f\"{metric}: {prev:.2f} → {curr:.2f} ({change:+.1f}%)\")\n\n    # Segment analysis\n    print(\"\\n=== By Segment ===\")\n    for segment_col in ['platform', 'region', 'channel']:\n        if segment_col in current_week.columns:\n            prev_seg = previous_week.groupby(segment_col)['revenue'].sum()\n            curr_seg = current_week.groupby(segment_col)['revenue'].sum()\n            change = ((curr_seg - prev_seg) / prev_seg * 100).sort_values()\n            print(f\"\\n{segment_col}:\")\n            print(change)\n\n    # Time-based analysis\n    print(\"\\n=== Daily Trend ===\")\n    daily = current_week.groupby('date')['revenue'].sum()\n    print(daily)\n\n# Checklist\nchecklist = \"\"\"\nCommon Root Causes:\n□ Technical: Checkout bug, payment gateway issue, site outage\n□ Product: Price change, out-of-stock items, UX regression\n□ Marketing: Campaign ended, SEO ranking drop, email deliverability\n□ External: Competitor promotion, holiday effect, economic event\n□ Data: Tracking pixel broken, attribution change, timezone shift\n\"\"\"\nprint(checklist)"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Always verify data first. Decompose the metric (Revenue = Traffic × CVR × AOV). Segment by every dimension (platform, region, channel, device). Check for external events. This is the #1 product sense question."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "Multi-armed bandit vs traditional A/B test (DoorDash — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** When would you use a multi-armed bandit instead of a traditional A/B test?"
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nclass EpsilonGreedyBandit:\n    \"\"\"Multi-armed bandit with epsilon-greedy strategy.\"\"\"\n\n    def __init__(self, n_arms, epsilon=0.1):\n        self.n_arms = n_arms\n        self.epsilon = epsilon\n        self.counts = np.zeros(n_arms)\n        self.values = np.zeros(n_arms)\n\n    def select_arm(self):\n        if np.random.random() < self.epsilon:\n            return np.random.randint(self.n_arms)  # Explore\n        return np.argmax(self.values)  # Exploit\n\n    def update(self, arm, reward):\n        self.counts[arm] += 1\n        n = self.counts[arm]\n        self.values[arm] += (reward - self.values[arm]) / n\n\nclass ThompsonSamplingBandit:\n    \"\"\"Thompson Sampling for Beta-Bernoulli bandits.\"\"\"\n\n    def __init__(self, n_arms):\n        self.n_arms = n_arms\n        self.successes = np.ones(n_arms)  # Prior: Beta(1,1)\n        self.failures = np.ones(n_arms)\n\n    def select_arm(self):\n        samples = [np.random.beta(self.successes[i], self.failures[i])\n                   for i in range(self.n_arms)]\n        return np.argmax(samples)\n\n    def update(self, arm, reward):\n        if reward:\n            self.successes[arm] += 1\n        else:\n            self.failures[arm] += 1\n\n# Simulation: Compare A/B test vs bandit\ndef simulate(true_rates, n_rounds=10000):\n    n_arms = len(true_rates)\n\n    # A/B test: equal allocation\n    ab_rewards = []\n    for _ in range(n_rounds):\n        arm = np.random.randint(n_arms)\n        reward = np.random.random() < true_rates[arm]\n        ab_rewards.append(reward)\n\n    # Thompson Sampling\n    ts = ThompsonSamplingBandit(n_arms)\n    ts_rewards = []\n    for _ in range(n_rounds):\n        arm = ts.select_arm()\n        reward = np.random.random() < true_rates[arm]\n        ts.update(arm, reward)\n        ts_rewards.append(reward)\n\n    print(f\"A/B test total reward: {sum(ab_rewards)}\")\n    print(f\"Thompson Sampling reward: {sum(ts_rewards)}\")\n    print(f\"Regret reduction: {sum(ts_rewards) - sum(ab_rewards)}\")\n\nsimulate([0.05, 0.06, 0.04])  # Variant B is best"
    },
    {
     "t": "p",
     "text": "**Key Insight:** A/B test: best for causal inference and statistical rigor. Bandit: best when opportunity cost of exploration is high (e.g., homepage recommendations). Thompson Sampling is the most practical bandit algorithm."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Design an experiment for a two-sided marketplace (Uber — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Uber wants to test a new pricing algorithm. How would you design the experiment considering network effects?"
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"\"\"\nTwo-Sided Marketplace Experiment Design:\n\nCHALLENGE: User-level randomization causes interference\n- If treatment riders get better prices → more rides → fewer drivers for control riders\n- This is the \"interference\" or \"spillover\" problem\n\nSOLUTIONS:\n\n1. GEO-BASED RANDOMIZATION (preferred)\n   - Randomize at city/region level\n   - Each market gets either treatment or control\n   - No cross-contamination between groups\n\"\"\"\n\nimport numpy as np\nimport pandas as pd\n\ndef geo_randomization(markets, treatment_fraction=0.5):\n    \"\"\"Stratified geo-randomization.\"\"\"\n    # Stratify by market size\n    markets = markets.sort_values('size')\n    markets['stratum'] = pd.qcut(markets['size'], q=4, labels=False)\n\n    assigned = []\n    for _, stratum_df in markets.groupby('stratum'):\n        n_treatment = int(len(stratum_df) * treatment_fraction)\n        indices = stratum_df.index.tolist()\n        np.random.shuffle(indices)\n        for i, idx in enumerate(indices):\n            assigned.append({\n                'market': stratum_df.loc[idx, 'market_name'],\n                'group': 'treatment' if i < n_treatment else 'control'\n            })\n\n    return pd.DataFrame(assigned)\n\n\"\"\"\n2. TIME-BASED SWITCHBACK\n   - Alternate treatment/control within same market over time\n   - Each market serves as its own control\n   - Handles market-level confounders\n\"\"\"\n\ndef switchback_design(markets, n_periods=14, period_hours=6):\n    \"\"\"Generate switchback schedule.\"\"\"\n    schedule = []\n    for market in markets:\n        for period in range(n_periods * (24 // period_hours)):\n            # Randomize with constraints (no more than 3 consecutive same treatment)\n            group = 'treatment' if np.random.random() > 0.5 else 'control'\n            schedule.append({\n                'market': market,\n                'period': period,\n                'group': group\n            })\n    return pd.DataFrame(schedule)\n\n\"\"\"\n3. ANALYSIS: Difference-in-Differences\n   Pre-period: Compare treatment and control markets\n   Post-period: Measure change in outcome\n   DiD estimate = (Treatment_post - Treatment_pre) - (Control_post - Control_pre)\n\"\"\"\n\ndef diff_in_diff(data, treatment_col, time_col, outcome_col, post_period):\n    \"\"\"Simple Difference-in-Differences estimator.\"\"\"\n    groups = {}\n    for treat in [0, 1]:\n        for post in [0, 1]:\n            mask = (data[treatment_col] == treat) & ((data[time_col] >= post_period) == post)\n            groups[(treat, post)] = data.loc[mask, outcome_col].mean()\n\n    did_estimate = (groups[(1,1)] - groups[(1,0)]) - (groups[(0,1)] - groups[(0,0)])\n    return did_estimate\n\nmarkets = pd.DataFrame({\n    'market_name': [f'city_{i}' for i in range(20)],\n    'size': np.random.randint(10000, 1000000, 20)\n})\nprint(geo_randomization(markets))"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Network effects violate SUTVA (Stable Unit Treatment Value Assumption). Geo-randomization + DiD is the gold standard for marketplace experiments. Switchback handles within-market seasonality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "Design a feature store (Databricks — Staff Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Design a feature store that serves both batch training and real-time inference."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"\"\"\nFeature Store Architecture:\n\n┌──────────────┐    ┌─────────────────┐    ┌──────────────┐\n│  Raw Data    │───→│ Feature Pipeline │───→│ Feature Store│\n│  (S3/Kafka)  │    │ (Spark/Flink)   │    │              │\n└──────────────┘    └─────────────────┘    │ ┌──────────┐ │\n                                           │ │  Offline  │ │←── Training\n                                           │ │  (Parquet)│ │\n                                           │ └──────────┘ │\n                                           │ ┌──────────┐ │\n                                           │ │  Online   │ │←── Serving\n                                           │ │  (Redis)  │ │\n                                           │ └──────────┘ │\n                                           └──────────────┘\n\"\"\"\n\nfrom dataclasses import dataclass, field\nfrom typing import Dict, List, Optional, Any\nfrom datetime import datetime\nimport json\n\n@dataclass\nclass FeatureDefinition:\n    name: str\n    entity: str  # e.g., \"user\", \"item\"\n    dtype: str\n    description: str\n    source: str\n    freshness_sla: str  # e.g., \"1h\", \"1d\"\n    version: int = 1\n    tags: List[str] = field(default_factory=list)\n\nclass FeatureStore:\n    def __init__(self):\n        self.registry: Dict[str, FeatureDefinition] = {}\n        self.offline_store: Dict[str, List[Dict]] = {}  # entity_key -> features\n        self.online_store: Dict[str, Dict] = {}  # entity_key -> latest features\n\n    def register_feature(self, feature_def: FeatureDefinition):\n        \"\"\"Register a feature definition in the registry.\"\"\"\n        key = f\"{feature_def.entity}/{feature_def.name}/v{feature_def.version}\"\n        self.registry[key] = feature_def\n        return key\n\n    def ingest_batch(self, entity: str, feature_name: str, data: List[Dict]):\n        \"\"\"Ingest batch features (for training).\"\"\"\n        for record in data:\n            entity_key = f\"{entity}:{record['entity_id']}\"\n            if entity_key not in self.offline_store:\n                self.offline_store[entity_key] = []\n            self.offline_store[entity_key].append({\n                'feature': feature_name,\n                'value': record['value'],\n                'timestamp': record.get('timestamp', datetime.now().isoformat())\n            })\n            # Also update online store with latest\n            if entity_key not in self.online_store:\n                self.online_store[entity_key] = {}\n            self.online_store[entity_key][feature_name] = record['value']\n\n    def get_training_features(self, entity: str, entity_ids: List[str],\n                             feature_names: List[str],\n                             point_in_time: Optional[str] = None) -> List[Dict]:\n        \"\"\"Get historical features for training (point-in-time correct).\"\"\"\n        results = []\n        for eid in entity_ids:\n            entity_key = f\"{entity}:{eid}\"\n            features = {'entity_id': eid}\n\n            if entity_key in self.offline_store:\n                for record in self.offline_store[entity_key]:\n                    if record['feature'] in feature_names:\n                        if point_in_time is None or record['timestamp'] <= point_in_time:\n                            features[record['feature']] = record['value']\n\n            results.append(features)\n        return results\n\n    def get_online_features(self, entity: str, entity_id: str,\n                           feature_names: List[str]) -> Dict:\n        \"\"\"Get latest features for real-time serving (<10ms).\"\"\"\n        entity_key = f\"{entity}:{entity_id}\"\n        stored = self.online_store.get(entity_key, {})\n        return {f: stored.get(f) for f in feature_names}\n\n# Usage\nfs = FeatureStore()\n\n# Register features\nfs.register_feature(FeatureDefinition(\n    name=\"purchase_count_30d\", entity=\"user\",\n    dtype=\"int\", description=\"Purchases in last 30 days\",\n    source=\"orders_table\", freshness_sla=\"1h\"\n))\n\n# Ingest data\nfs.ingest_batch(\"user\", \"purchase_count_30d\", [\n    {\"entity_id\": \"u1\", \"value\": 5, \"timestamp\": \"2024-01-15\"},\n    {\"entity_id\": \"u2\", \"value\": 12, \"timestamp\": \"2024-01-15\"},\n])\n\n# Training: point-in-time features\ntrain_data = fs.get_training_features(\"user\", [\"u1\", \"u2\"], [\"purchase_count_30d\"])\nprint(\"Training:\", train_data)\n\n# Serving: real-time features\nonline = fs.get_online_features(\"user\", \"u1\", [\"purchase_count_30d\"])\nprint(\"Online:\", online)"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Feature stores solve training-serving skew. Offline store (Parquet/Delta) for training, online store (Redis/DynamoDB) for serving. Point-in-time joins prevent data leakage."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Behavioral questions for Data Scientists (Various — All Levels)",
   "body": [
    {
     "t": "table",
     "head": [
      "#",
      "Company",
      "Question"
     ],
     "rows": [
      [
       "1",
       "**Meta**",
       "You found that your model has a 5% accuracy improvement but introduces bias against a minority group. What do you do?"
      ],
      [
       "2",
       "**Google**",
       "How do you handle a situation where stakeholders want to launch despite inconclusive A/B test results?"
      ],
      [
       "3",
       "**Amazon**",
       "Tell me about a time you automated a manual data process (LP: Invent and Simplify)"
      ],
      [
       "4",
       "**Netflix**",
       "How do you decide between building a simple heuristic vs a complex ML model?"
      ],
      [
       "5",
       "**Airbnb**",
       "Describe a time when your data analysis contradicted the team's hypothesis"
      ],
      [
       "6",
       "**Uber**",
       "How do you handle a request for an analysis you know will take 2 weeks but stakeholders want in 2 days?"
      ],
      [
       "7",
       "**LinkedIn**",
       "Walk me through how you would present a complex analysis to a VP"
      ],
      [
       "8",
       "**Spotify**",
       "Tell me about a time you had to work with messy, incomplete data"
      ],
      [
       "9",
       "**Microsoft**",
       "How do you validate that your model is actually creating business value?"
      ],
      [
       "10",
       "**Apple**",
       "Describe a project where you had to balance statistical rigor with business speed"
      ],
      [
       "11",
       "**Stripe**",
       "How do you handle data quality issues in your analysis?"
      ],
      [
       "12",
       "**Pinterest**",
       "Tell me about a time you identified a metric that was being gamed"
      ],
      [
       "13",
       "**Snap**",
       "How do you decide what NOT to analyze?"
      ],
      [
       "14",
       "**Salesforce**",
       "Describe a time you had to convince a team to adopt a data-driven approach"
      ],
      [
       "15",
       "**Databricks**",
       "What's the most impactful analysis you've done? What made it impactful?"
      ],
      [
       "16",
       "**Deloitte**",
       "How do you explain complex ML models to non-technical audit partners?"
      ],
      [
       "17",
       "**TCS**",
       "Describe a time you built a reusable data pipeline for multiple clients"
      ],
      [
       "18",
       "**Infosys**",
       "How do you manage scope creep in a data science project?"
      ],
      [
       "19",
       "**Cognizant**",
       "Tell me about a time you had to deliver insights with limited data"
      ],
      [
       "20",
       "**HCL**",
       "How do you ensure model fairness when deploying for government clients?"
      ],
      [
       "21",
       "**KPMG**",
       "Walk me through a fraud detection project you worked on"
      ],
      [
       "22",
       "**PwC**",
       "How do you handle conflicting data from multiple enterprise sources?"
      ],
      [
       "23",
       "**EY**",
       "Describe a time you translated business requirements into a data science problem"
      ],
      [
       "24",
       "**Tech Mahindra**",
       "How do you prioritize model accuracy vs latency for telecom use cases?"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "36",
   "q": "Implement hypothesis testing from scratch (Deloitte — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Walk through t-tests, chi-square, and ANOVA with implementations."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nfrom scipy import stats\n\nclass HypothesisTesting:\n    @staticmethod\n    def two_sample_ttest(a, b, alpha=0.05):\n        n_a, n_b = len(a), len(b)\n        mean_a, mean_b = np.mean(a), np.mean(b)\n        var_a, var_b = np.var(a, ddof=1), np.var(b, ddof=1)\n        se = np.sqrt(var_a/n_a + var_b/n_b)\n        t = (mean_a - mean_b) / se\n        df = (var_a/n_a + var_b/n_b)**2 / ((var_a/n_a)**2/(n_a-1) + (var_b/n_b)**2/(n_b-1))\n        p = 2 * (1 - stats.t.cdf(abs(t), df))\n        pooled = np.sqrt(((n_a-1)*var_a + (n_b-1)*var_b) / (n_a+n_b-2))\n        return {\"t\": round(t,4), \"p\": round(p,6), \"reject\": p < alpha,\n                \"cohens_d\": round((mean_a-mean_b)/pooled, 4)}\n\n    @staticmethod\n    def chi_square(observed, expected=None, alpha=0.05):\n        if expected is None:\n            expected = np.full_like(observed, observed.mean(), dtype=float)\n        chi2 = np.sum((observed - expected)**2 / expected)\n        df = len(observed) - 1\n        p = 1 - stats.chi2.cdf(chi2, df)\n        return {\"chi2\": round(chi2,4), \"p\": round(p,6), \"reject\": p < alpha}\n\n    @staticmethod\n    def anova(*groups, alpha=0.05):\n        k, N = len(groups), sum(len(g) for g in groups)\n        grand = np.mean(np.concatenate(groups))\n        ss_b = sum(len(g) * (np.mean(g) - grand)**2 for g in groups)\n        ss_w = sum(np.sum((g - np.mean(g))**2) for g in groups)\n        f = (ss_b/(k-1)) / (ss_w/(N-k))\n        p = 1 - stats.f.cdf(f, k-1, N-k)\n        return {\"f\": round(f,4), \"p\": round(p,6), \"reject\": p < alpha,\n                \"eta_sq\": round(ss_b/(ss_b+ss_w), 4)}\n\n# Use: t-test (2 groups) | chi-square (categorical) | ANOVA (3+ groups)\n# Always report effect size + confidence intervals, not just p-values"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Effect size matters more than p-value. Always check assumptions: t-test needs normality or n=30, chi-square needs expected=5. In consulting, report CIs alongside p-values."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "Build an A/B testing framework (Cognizant — Senior Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Design A/B testing with sample size calculation and multiple comparison correction."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nfrom scipy import stats\nimport math\n\nclass ABTest:\n    @staticmethod\n    def sample_size(baseline, mde, alpha=0.05, power=0.8):\n        p1, p2 = baseline, baseline * (1 + mde)\n        p_avg = (p1 + p2) / 2\n        za = stats.norm.ppf(1 - alpha/2)\n        zb = stats.norm.ppf(power)\n        n = ((za * np.sqrt(2*p_avg*(1-p_avg)) +\n              zb * np.sqrt(p1*(1-p1) + p2*(1-p2))) / (p2-p1))**2\n        return math.ceil(n)\n\n    @staticmethod\n    def proportion_test(c_conv, c_tot, t_conv, t_tot, alpha=0.05):\n        pc, pt = c_conv/c_tot, t_conv/t_tot\n        pp = (c_conv+t_conv) / (c_tot+t_tot)\n        se = np.sqrt(pp*(1-pp)*(1/c_tot + 1/t_tot))\n        z = (pt - pc) / se\n        p = 2 * (1 - stats.norm.cdf(abs(z)))\n        return {\"control\": round(pc,4), \"treatment\": round(pt,4),\n                \"lift\": round((pt-pc)/pc*100, 2), \"p\": round(p,6),\n                \"significant\": p < alpha}\n\n    @staticmethod\n    def bonferroni(p_values, alpha=0.05):\n        n = len(p_values)\n        return {\"adjusted_alpha\": alpha/n,\n                \"significant\": [min(p*n, 1.0) < alpha for p in p_values]}\n\nab = ABTest()\nprint(f\"Need {ab.sample_size(0.10, 0.05):,} per group for 5% MDE\")"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Don't peek at results early (inflates false positives). Always calculate sample size first. Multiple variants need Bonferroni correction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "Time series forecasting approaches (TCS — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Compare statistical vs ML approaches to time series."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nclass TSForecaster:\n    @staticmethod\n    def exponential_smoothing(data, alpha=0.3):\n        result = np.zeros_like(data, dtype=float)\n        result[0] = data[0]\n        for t in range(1, len(data)):\n            result[t] = alpha * data[t] + (1-alpha) * result[t-1]\n        return result\n\n    @staticmethod\n    def holt_winters(data, alpha=0.3, beta=0.1, gamma=0.1, season=12, horizon=12):\n        n = len(data)\n        level, trend = data[0], (data[season] - data[0]) / season\n        seasonal = [data[i] - data[0] for i in range(season)]\n        for t in range(season, n):\n            prev = level\n            level = alpha*(data[t]-seasonal[t%season]) + (1-alpha)*(level+trend)\n            trend = beta*(level-prev) + (1-beta)*trend\n            seasonal[t%season] = gamma*(data[t]-level) + (1-gamma)*seasonal[t%season]\n        return [level + h*trend + seasonal[(n+h)%season] for h in range(1, horizon+1)]\n\n    @staticmethod\n    def ml_features(dates, values):\n        \"\"\"Lag + rolling features for XGBoost forecasting.\"\"\"\n        import pandas as pd\n        df = pd.DataFrame({'date': dates, 'value': values})\n        df['dow'] = df['date'].dt.dayofweek\n        df['month'] = df['date'].dt.month\n        for lag in [1, 7, 30]:\n            df[f'lag_{lag}'] = df['value'].shift(lag)\n        for w in [7, 30]:\n            df[f'roll_mean_{w}'] = df['value'].rolling(w).mean()\n        return df.dropna()\n\n# ARIMA: interpretable, univariate | Prophet: seasonality + holidays\n# XGBoost: non-linear, multivariate | LSTM: deep patterns, needs more data\n# Always use time-based splits, never random!"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Start simple ? complex. Most business problems solved by Prophet or XGBoost with lags. Walk-forward validation is the gold standard."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "Customer churn prediction pipeline (Infosys — Data Scientist)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Design end-to-end churn prediction with business value optimization."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nimport pandas as pd\n\nclass ChurnPipeline:\n    def features(self, df):\n        f = pd.DataFrame()\n        f['usage_trend'] = (df['usage_30d'] - df['usage_prev']) / (df['usage_prev']+1)\n        f['usage_decline'] = (f['usage_trend'] < -0.2).astype(int)\n        f['days_since_login'] = df['days_since_login']\n        f['login_freq'] = df['logins_30d']\n        f['adoption'] = df['features_used'] / df['total_features']\n        f['spend_trend'] = (df['spend_last'] - df['spend_prev']) / (df['spend_prev']+1)\n        f['overdue'] = (df['overdue'] > 0).astype(int)\n        f['tickets'] = df['tickets_30d']\n        f['contract_ending'] = (df['contract_months'] < 3).astype(int)\n        f['engagement'] = (0.3*(1-f['days_since_login']/90).clip(0,1) +\n                           0.3*(f['login_freq']/30).clip(0,1) + 0.4*f['adoption'])\n        f['risk'] = (f['usage_decline'] + f['overdue'] +\n                     (f['tickets']>3).astype(int) + f['contract_ending']) / 4\n        return f\n\n    def business_eval(self, y_true, y_pred):\n        tp = ((y_pred==1) & (y_true==1)).sum()\n        fp = ((y_pred==1) & (y_true==0)).sum()\n        saved = tp * 0.3 * 5000 * 12  # 30% save rate, ?5K/month, annual\n        cost = (tp + fp) * 500\n        return {\"net_value\": f\"?{saved-cost:,.0f}\", \"roi\": f\"{(saved-cost)/cost*100:.0f}%\"}\n\n# Optimize for RECALL — missing churners costs more than false alarms\n# Top features: usage decline, login recency, support sentiment, contract end"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Churn is about business value, not AUC. Optimize threshold on ROI = revenue_saved - intervention_cost. Retrain monthly."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "Feature selection methods (KPMG — Analytics Consultant)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Implement filter, wrapper, and embedded feature selection."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\nimport pandas as pd\n\nclass FeatureSelector:\n    @staticmethod\n    def correlation_filter(X, y, threshold=0.05):\n        return X.corrwith(y).abs().pipe(lambda s: s[s > threshold]).sort_values(ascending=False).index.tolist()\n\n    @staticmethod\n    def variance_filter(X, threshold=0.01):\n        return X.columns[X.var() > threshold].tolist()\n\n    @staticmethod\n    def forward_selection(X, y, model_fn, score_fn, max_feat=10):\n        selected, remaining = [], list(X.columns)\n        for _ in range(min(max_feat, len(remaining))):\n            best_s, best_f = -np.inf, None\n            for f in remaining:\n                s = score_fn(model_fn, X[selected+[f]], y)\n                if s > best_s: best_s, best_f = s, f\n            if best_f:\n                selected.append(best_f)\n                remaining.remove(best_f)\n        return selected\n\n    @staticmethod\n    def lasso(X, y, alpha=0.01, iters=1000):\n        n, p = X.shape\n        w, lr = np.zeros(p), 0.001\n        for _ in range(iters):\n            w = w - lr * (-2 * X.T @ (y - X @ w) / n)\n            w = np.sign(w) * np.maximum(np.abs(w) - lr * alpha, 0)\n        return np.where(np.abs(w) > 1e-6)[0].tolist()\n\n# Approach: variance ? correlation ? MI/tree importance ? wrapper\n# Fewer features = easier to explain (critical in consulting)"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Layered selection: variance ? correlation (>0.95) ? MI ? wrapper. In consulting, fewer features = clearer story for stakeholders."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

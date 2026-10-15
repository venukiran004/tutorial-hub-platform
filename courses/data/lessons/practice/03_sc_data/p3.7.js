/* ============================================================================
   PRACTICE P3.7 — Predict the Output / Scenarios · 7
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.7",
 "lede": "**25 scenarios** from Data Science Scenarios. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Predict the Output / Scenarios · 7",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "151",
   "q": "You're forecasting daily sales for a retail chain. The data shows strong weekly seasonality and yearly trends. Which model handles both simultaneously?",
   "body": [
    {
     "t": "p",
     "text": "**Theme: Time Series Analysis & Forecasting**"
    },
    {
     "t": "p",
     "text": "**Answer:** Use SARIMA with seasonal orders (e.g., SARIMA(1,1,1)(1,1,1,7) for weekly) or Facebook Prophet which automatically decomposes trend, weekly, and yearly seasonality. For complex multi-seasonal patterns, use TBATS or multiple Fourier terms."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "152",
   "q": "Your time series forecast has increasing prediction intervals as the horizon grows. What does this indicate and how do you communicate it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** This is expected behavior — uncertainty compounds over time. Communicate by: (1) showing confidence intervals visually, (2) recommending shorter forecast horizons for high-stakes decisions, (3) providing point estimates with explicit uncertainty ranges, (4) re-forecasting frequently with updated data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "153",
   "q": "You notice your ARIMA model residuals are autocorrelated. What's wrong and how do you fix it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Autocorrelated residuals mean the model hasn't captured all temporal patterns. Fix by: (1) increasing AR or MA order, (2) checking for missed seasonality, (3) adding external regressors, (4) trying non-linear models like LSTM. Use Ljung-Box test to verify residuals are white noise."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "154",
   "q": "Your demand forecast performs well on average but misses sudden spikes. How do you handle demand shocks?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Add external regressors for known events (holidays, promotions), (2) use regime-switching models, (3) implement anomaly detection to flag unusual periods, (4) create separate models for normal vs. event periods, (5) use ensemble with one model for baseline and another for spikes."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "155",
   "q": "You're building a forecasting system for 10,000 SKUs. Training individual models for each is expensive. What approach do you take?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use hierarchical/grouped forecasting: (1) cluster SKUs by behavior patterns, (2) train models per cluster, (3) use global models like DeepAR or N-BEATS that learn across all series, (4) apply reconciliation to ensure forecasts are coherent across hierarchy levels."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "156",
   "q": "Your time series has a structural break (business model changed 6 months ago). How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Only use post-break data for training, (2) use Chow test to formally detect breakpoints, (3) add a level shift indicator variable, (4) use piecewise models with different parameters before/after break, (5) apply exponential smoothing with heavier recent weights."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "157",
   "q": "You need to detect seasonality period automatically in a new dataset. What methods do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) ACF plot — look for repeating peaks, (2) FFT (Fast Fourier Transform) — find dominant frequencies, (3) periodogram analysis, (4) seasonal decomposition with candidate periods, (5) Chi-squared test for seasonality. Libraries like `statsmodels.tsa.seasonal` or `pmdarima.arima.auto_arima` can auto-detect."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "158",
   "q": "Your forecasting model was trained pre-COVID. Now post-COVID demand patterns are different. How do you adapt?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Retrain on post-COVID data only, (2) use transfer learning — fine-tune on recent data, (3) add COVID indicator variables, (4) increase weight of recent observations via exponential weighting, (5) use online learning to continuously adapt, (6) monitor forecast errors and trigger retraining when accuracy degrades."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "159",
   "q": "You're forecasting inventory for perishable goods. Overstock means waste, understock means lost sales. How do you optimize?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use asymmetric loss functions: (1) define cost of overstock vs. understock (e.g., overstock costs 30% of item price, understock costs 100%), (2) optimize for the specific cost ratio using quantile regression, (3) forecast demand distribution not just point estimate, (4) use service level targets (e.g., 95% fill rate) to set order quantities."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "160",
   "q": "Your multivariate time series model uses 20 exogenous variables. Not all are available at forecast time. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Separate variables into \"known future\" (calendar, planned promotions) and \"unknown future\" (weather, competitor actions), (2) forecast unknown variables separately, (3) use only known-future variables as regressors, (4) use lagged versions of unknown variables, (5) test sensitivity to each variable and drop those with minimal impact."
    },
    {
     "t": "p",
     "text": "**Theme: A/B Testing & Experimentation**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "161",
   "q": "Your A/B test shows a 5% lift in conversion rate with p-value 0.03. The product manager wants to launch immediately. What do you recommend?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Caution before launching: (1) check if the test ran for full business cycles, (2) verify no sample ratio mismatch (SRM), (3) check if the effect is consistent across segments, (4) calculate practical significance (is 5% lift worth the engineering cost?), (5) check for novelty effect by looking at time-based trends, (6) consider running a holdout group post-launch."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "162",
   "q": "Your A/B test has a p-value of 0.06. The PM asks \"is it significant?\" How do you respond?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \"Not at the conventional 0.05 threshold, but let's consider: (1) what was our pre-registered significance level? (2) with more sample size, it might reach significance — calculate required N, (3) look at the confidence interval — does it include practically meaningful effects? (4) consider Bayesian analysis to get probability of treatment being better, (5) this is suggestive but not conclusive evidence.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "163",
   "q": "You discover that 60% of users in your A/B test are repeat visitors who may have seen both variants. How does this affect results?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** This causes contamination/crossover bias, diluting treatment effects. Fix by: (1) use user-level (not session-level) randomization, (2) implement sticky bucketing (user always sees same variant), (3) analyze first-exposure data only, (4) use intent-to-treat analysis, (5) adjust for crossover using instrumental variable methods."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "164",
   "q": "Your A/B test on a recommendation algorithm shows +2% revenue but -5% user engagement. How do you decide?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** This is a metrics tradeoff requiring business judgment: (1) determine which metric is the North Star, (2) analyze if engagement drop indicates long-term risk (users leaving?), (3) check if revenue gain is from few high-value conversions vs. broad improvement, (4) segment analysis — who is hurt?, (5) consider guardrail metrics (retention, satisfaction), (6) run longer to see if engagement recovers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "165",
   "q": "You need to test 5 different homepage layouts simultaneously. How do you design this experiment?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use a multi-arm bandit or multi-variant test: (1) split traffic equally 20% each for traditional A/B/C/D/E, (2) apply Bonferroni correction (α/5 = 0.01 per comparison), (3) alternatively use Thompson Sampling to dynamically allocate more traffic to winning variants, (4) calculate required sample size accounting for multiple comparisons, (5) define primary metric upfront to avoid cherry-picking."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "166",
   "q": "Your A/B test shows different results on weekdays vs. weekends. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) This is a heterogeneous treatment effect — stratify analysis by day type, (2) ensure the test ran for complete weeks to balance day-of-week effects, (3) use CUPED (Controlled-experiment Using Pre-Experiment Data) for variance reduction, (4) report overall and stratified results, (5) consider launching the change only for the days where it's effective."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "167",
   "q": "You're running an A/B test but the sample sizes between groups differ by 10%. What could cause this and what do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Sample Ratio Mismatch (SRM) — a critical issue: (1) check randomization logic for bugs, (2) check if certain users are filtered differently per variant, (3) check for bot traffic affecting one variant, (4) investigate if the variant causes page crashes (users drop before logging), (5) DO NOT trust the results until SRM is resolved — the test is likely biased."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "168",
   "q": "Your company can't do randomized A/B tests because all users must get the same experience. What alternatives exist?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Quasi-experimental methods: (1) time-based testing (before/after with control period), (2) geo-based experiments (different regions get different treatments), (3) regression discontinuity design, (4) difference-in-differences (DiD), (5) interrupted time series analysis, (6) synthetic control methods, (7) propensity score matching on observational data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "169",
   "q": "You notice that your test group's metric starts dropping after 2 weeks of being flat. What's happening?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Possible explanations: (1) novelty effect wore off — initial curiosity drove engagement, (2) external factor affecting the test group disproportionately, (3) caching/technical issue emerging over time, (4) user fatigue with the new experience, (5) selection bias if users opted in. Investigate by checking time trends, segment stability, and technical logs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "170",
   "q": "How do you calculate the minimum sample size for an A/B test detecting a 2% conversion rate lift from a 10% baseline?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Using the formula: n = (Zα/2 + Zβ)² × (p1(1-p1) + p2(1-p2)) / (p2-p1)², where p1=0.10, p2=0.12, α=0.05, β=0.20 (80% power): n ≈ 3,623 per group. Total: ~7,246 users. At 1,000 visitors/day, the test needs ~8 days. Use power analysis libraries: `statsmodels.stats.power` or online calculators."
    },
    {
     "t": "p",
     "text": "**Theme: Feature Engineering & Selection**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "171",
   "q": "You have a date column. What features can you engineer from it for a retail demand forecasting model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Extract: (1) day of week, month, quarter, year, (2) is_weekend, is_holiday, (3) days_until_next_holiday, days_since_last_holiday, (4) week_of_year, day_of_year, (5) is_month_start, is_month_end, is_payday, (6) season (spring/summer/fall/winter), (7) cyclical encoding: sin/cos for month and day_of_week, (8) business day count in month."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "172",
   "q": "You have 500 features but suspect many are redundant. How do you systematically reduce them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multi-step approach: (1) remove zero/near-zero variance features, (2) remove one of each pair with correlation > 0.95, (3) use VIF to detect multicollinearity (remove VIF > 10), (4) use Lasso (L1) regularization — zero coefficients indicate removable features, (5) tree-based feature importance, (6) SHAP values for model-specific importance, (7) forward/backward stepwise selection with cross-validation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "173",
   "q": "Your target variable is \"customer lifetime value\" which is right-skewed with some extremely high values. How do you handle this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Log-transform the target: y = log(1 + CLV), (2) use Box-Cox transformation, (3) train separate models for high-value vs. regular customers, (4) use quantile regression instead of mean regression, (5) cap extreme outliers at 99th percentile, (6) evaluate with MAE instead of RMSE (less sensitive to outliers), (7) use Tweedie or Gamma distribution regression."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "174",
   "q": "You're building features for a fraud detection model. The \"transaction amount\" feature alone is weak. How do you improve it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Create behavioral features: (1) amount relative to user's average, (2) amount z-score within user history, (3) amount percentile within merchant category, (4) ratio to user's max historical amount, (5) rolling average amount (7d, 30d) and deviation, (6) time since last similar-amount transaction, (7) amount rounded indicator (fraudsters often use round numbers), (8) amount relative to time of day average."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "175",
   "q": "You have text data (customer reviews) and tabular data (purchase history). How do you combine them in one model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multi-modal fusion: (1) extract text features (TF-IDF, sentiment score, topic distributions) and concatenate with tabular, (2) use pre-trained embeddings (BERT) for text → dense vector → concatenate, (3) early fusion: combine raw features before model, (4) late fusion: train separate models, combine predictions, (5) use libraries like `multimodal` or custom neural networks with separate encoders."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

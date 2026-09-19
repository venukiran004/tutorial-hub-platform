/* ============================================================================
   PRACTICE P8.4 — Imbalanced Data, Time Series and Recommenders · 4
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/08_Imbalanced_TimeSeries_Recommenders.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p8.4",
 "lede": "**25 scenarios** from Imbalanced Data, Time Series and Recommenders. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "n": "76",
   "q": "What is cointegration?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Two non-stationary time series that move together over time such that a linear combination is stationary."
    },
    {
     "t": "p",
     "text": "**Explanation:** Example: Gas price and oil price — both non-stationary but their ratio/difference is stationary. Implies long-run equilibrium. Test: Johansen test, Engle-Granger test."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "How do you detect seasonality in a time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Visual inspection (plot + decomposition)",
      "ACF plot (peaks at seasonal lags: 12, 24, 36...)",
      "Fourier analysis / periodogram",
      "Seasonal decomposition (STL)",
      "Statistical test: Kruskal-Wallis test per seasonal period"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Multiple seasonalities possible (daily, weekly, yearly). Fourier analysis reveals frequency components."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "What is the difference between interpolation and forecasting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Interpolation:** Filling missing values within the known data range",
      "**Forecasting:** Predicting values beyond the known data range (extrapolation)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Interpolation is generally more reliable — surrounded by known data. Forecasting assumes patterns continue, which may not hold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What are Fourier features for capturing seasonality?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Represent periodic patterns using sin and cos terms at different frequencies."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "for k in range(1, 4):\n    df[f'sin_{k}'] = np.sin(2 * np.pi * k * df['day_of_year'] / 365)\n    df[f'cos_{k}'] = np.cos(2 * np.pi * k * df['day_of_year'] / 365)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Fourier terms can model complex seasonal patterns. More terms = more flexible. Used in Prophet and regression-based approaches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "What is the difference between a trend-stationary and difference-stationary process?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Trend-stationary:** Stationary after removing deterministic trend (detrend by regression)",
      "**Difference-stationary:** Stationary after differencing (stochastic trend, unit root)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ADF test determines type. Trend-stationary: trend is predictable. Difference-stationary: trend is random walk. Different modeling approaches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is the rolling window approach for time series features?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Rolling statistics as features\ndf['rolling_mean_7'] = df['value'].rolling(window=7).mean()\ndf['rolling_std_30'] = df['value'].rolling(window=30).std()\ndf['rolling_min_7'] = df['value'].rolling(window=7).min()\ndf['expanding_mean'] = df['value'].expanding().mean()"
    },
    {
     "t": "p",
     "text": "**Explanation:** Captures recent patterns: level, volatility, trends. Multiple window sizes capture short and long-term dynamics. Expanding mean: growing window from start."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What is the Kalman filter for time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Recursive algorithm that estimates hidden state from noisy observations. Combines prediction (model) and correction (data) steps."
    },
    {
     "t": "p",
     "text": "**Explanation:** State-space model framework. Handles missing data, varying noise, and provides uncertainty estimates. Used in tracking, finance, sensor fusion."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "How do you handle multiple seasonalities (e.g., daily and yearly)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Prophet:** Multiple Fourier components for each seasonality",
      "**TBATS:** Trigonometric seasonality, Box-Cox, ARMA errors",
      "**Feature engineering:** Separate sin/cos features for each period",
      "**Hierarchical decomposition:** Remove each seasonality sequentially"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** SARIMA handles only one seasonality. Prophet and TBATS handle multiple. Neural approaches (N-BEATS, NHITS) also handle complex seasonality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "What is the concept of forecast uncertainty?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Prediction intervals quantifying how confident the forecast is. Wider interval = more uncertainty."
    },
    {
     "t": "p",
     "text": "**Methods:**"
    },
    {
     "t": "ol",
     "items": [
      "Parametric: ARIMA provides analytical prediction intervals",
      "Bootstrap: Resample residuals, generate many forecasts",
      "Conformal prediction: Distribution-free intervals"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Point forecasts are incomplete. Always provide uncertainty estimates. Uncertainty grows with forecast horizon."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is backtesting in time series forecasting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Testing a forecasting strategy on historical data as if making real-time predictions. Walk-forward: at each point, use only past data."
    },
    {
     "t": "p",
     "text": "**Explanation:** Different from random cross-validation. Measures how the model would have performed in practice. Gold standard for time series model evaluation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "86",
   "q": "What modern deep learning models are used for time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**N-BEATS:** Pure DL architecture for univariate forecasting",
      "**N-HiTS:** Hierarchical interpolation for efficient long-horizon",
      "**Temporal Fusion Transformer (TFT):** Attention-based with interpretability",
      "**PatchTST:** Transformer with patching for long sequences",
      "**TimeGPT:** Foundation model for time series"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** These often outperform traditional methods on large datasets. But require significant data and compute."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "87",
   "q": "What is the concept of temporal causality in feature engineering?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Features at time t must only use information available before time t. Using future information = data leakage."
    },
    {
     "t": "p",
     "text": "**Explanation:** `rolling_mean(3)` at time t should use t-1, t-2, t-3 (NOT t). Use `.shift(1)` + `.rolling()` to ensure feature uses only past data."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "88",
   "q": "What is the difference between point forecast and probabilistic forecast?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Point forecast:** Single predicted value (y_hat = 42.5)",
      "**Probabilistic forecast:** Distribution of future values (y_hat ~ N(42.5, 3.2)) or prediction intervals"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Probabilistic forecasts enable better decision-making under uncertainty. Quantile regression, conformal prediction, Bayesian methods provide these."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "89",
   "q": "How do you handle structural breaks in time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Change point detection (CUSUM, Bai-Perron, ruptures library)",
      "Separate models for each regime",
      "Regime-switching models (Markov switching)",
      "Adaptive models that reweight recent data"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** COVID-19 created structural breaks in many time series. Pre-break data may be irrelevant. Detect breaks, model each period separately or use adaptive approaches."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "90",
   "q": "What is the difference between time series classification and forecasting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Forecasting:** Predict future values of the same series",
      "**Classification:** Assign a class label to an entire time series or segment"
     ]
    },
    {
     "t": "p",
     "text": "**Examples:** Classification: ECG → normal/abnormal. Activity recognition from accelerometer data."
    },
    {
     "t": "p",
     "text": "**Explanation:** Classification often uses feature extraction (shape, statistics) or specialized algorithms (DTW + KNN, rocket transform, InceptionTime)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "91",
   "q": "What is Dynamic Time Warping (DTW)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Distance metric that aligns two time series by warping the time axis. Handles temporal shifts and different speeds."
    },
    {
     "t": "p",
     "text": "**Explanation:** Euclidean distance fails when patterns are shifted or stretched. DTW finds optimal alignment. O(n²) but approximations exist. Used in speech, gesture recognition, and time series clustering."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "92",
   "q": "What is anomaly detection in time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Detecting unusual patterns: point anomalies (spike), contextual anomalies (unusual for that time), collective anomalies (unusual sequence)."
    },
    {
     "t": "p",
     "text": "**Methods:**"
    },
    {
     "t": "ol",
     "items": [
      "Statistical: Z-score, IQR on residuals",
      "ML: Isolation Forest on features",
      "DL: Autoencoder reconstruction error",
      "Prophet: Flag points outside prediction intervals"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** First forecast \"normal,\" then flag deviations. Context matters — high sales on holiday is normal, high sales on random Tuesday is anomalous."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "93",
   "q": "What is the MASE metric and why is it preferred?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Mean Absolute Scaled Error: MAE of model / MAE of naive (seasonal) forecast."
    },
    {
     "t": "ul",
     "items": [
      "MASE < 1: Better than naive",
      "MASE = 1: Same as naive",
      "MASE > 1: Worse than naive"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Scale-independent, handles intermittent demand, doesn't have MAPE's zero-division problem. Recommended by Hyndman & Koehler."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "94",
   "q": "How do you forecast intermittent demand (sparse time series)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Many periods with zero demand, occasional non-zero:"
    },
    {
     "t": "ol",
     "items": [
      "**Croston's method:** Separate models for non-zero demand size and inter-arrival time",
      "**TSB (Teunter-Syntetos-Babai):** Modified Croston's",
      "**Zero-inflated models:** Mixture of zero process and demand process"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Standard methods fail — they smooth zeros and non-zeros together. Croston's is the standard for spare parts inventory."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "95",
   "q": "What is the concept of forecast reconciliation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Ensuring forecasts at different aggregation levels are consistent. Total sales = sum of regional sales."
    },
    {
     "t": "p",
     "text": "**Methods:** Bottom-up, top-down, optimal reconciliation (MinT)."
    },
    {
     "t": "p",
     "text": "**Explanation:** Independent forecasts at each level are inconsistent. Reconciliation adjusts to coherence. Crucial for hierarchical business forecasting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "96",
   "q": "What is the effect of data frequency on forecasting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**High frequency (minutely):** More data but more noise. Need to aggregate or filter.",
      "**Low frequency (annual):** Fewer data points, harder to learn patterns."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Match frequency to business need. Aggregate noisy high-frequency data before modeling. Hourly demand → daily aggregation may suffice."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "97",
   "q": "How do you handle time zones in time series analysis?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Convert all timestamps to UTC for storage",
      "Apply time zone conversion for feature engineering (local hour matters for behavior)",
      "Handle daylight saving time transitions",
      "Be consistent within pipeline"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** User behavior depends on local time. Store in UTC, compute features in local time. DST creates 23- and 25-hour days."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "98",
   "q": "What is transfer learning for time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Pre-train on large time series dataset, fine-tune on target series."
    },
    {
     "t": "p",
     "text": "**Examples:**"
    },
    {
     "t": "ol",
     "items": [
      "Foundation models (TimeGPT, Chronos)",
      "Pre-train LSTM on many customers, fine-tune on new customer",
      "Feature extractors trained on related domains"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Especially useful when target series is short. Foundation models are emerging — can forecast zero-shot."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "99",
   "q": "What is the difference between ex-post and ex-ante forecasting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Ex-post:** Test on historical period where actual values are known (backtesting)",
      "**Ex-ante:** Genuine future prediction where actuals don't yet exist"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Ex-post may use actual exogenous variables (known weather). Ex-ante must also forecast exogenous variables or use lagged versions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "100",
   "q": "How would you build a production time series forecasting system?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1. Data pipeline: Collect, clean, validate incoming data\n2. Feature store: Lag features, calendar features, external data\n3. Model training: Automated retraining on schedule\n4. Evaluation: Walk-forward backtesting on rolling window\n5. Serving: Generate forecasts at required frequency\n6. Monitoring: Track forecast accuracy, detect drift\n7. Alerting: Flag when accuracy degrades below threshold\n8. Retraining: Triggered by concept drift or schedule"
    },
    {
     "t": "p",
     "text": "**Explanation:** Production systems need automation, monitoring, and graceful handling of data quality issues. Model performance degrades over time — continuous monitoring is essential."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

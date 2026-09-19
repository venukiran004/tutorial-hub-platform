/* ============================================================================
   PRACTICE P8.3 — Imbalanced Data, Time Series and Recommenders · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/Practice/08_Imbalanced_TimeSeries_Recommenders.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p8.3",
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
   "n": "51",
   "q": "What makes time series data different from tabular data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Temporal ordering matters — observations are not independent",
      "Autocorrelation — past values predict future values",
      "Seasonality and trends",
      "Can't use random train/test splitting",
      "Stationarity assumptions for many models"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Randomly shuffling time series destroys temporal structure. Special methods required for splitting, feature engineering, and modeling."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What is stationarity and why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A stationary time series has constant mean, variance, and autocorrelation over time."
    },
    {
     "t": "p",
     "text": "**Why it matters:** Most statistical time series models (ARIMA, exponential smoothing) assume stationarity."
    },
    {
     "t": "p",
     "text": "**Explanation:** Non-stationary: trends, changing variance, seasonality. Transform to stationary via differencing, log transform, detrending."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "How do you test for stationarity?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**ADF (Augmented Dickey-Fuller) test:** Null hypothesis = non-stationary. p < 0.05 → stationary",
      "**KPSS test:** Null = stationary. p < 0.05 → non-stationary",
      "**Visual:** Plot mean/variance over rolling windows"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Use both ADF and KPSS for confirmation. ADF: rejects non-stationarity. KPSS: rejects stationarity. Different null hypotheses → complementary."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is differencing and how does it help?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Subtracting previous value from current: y'(t) = y(t) - y(t-1). Removes trends, making series stationary."
    },
    {
     "t": "p",
     "text": "**Explanation:** First differencing removes linear trend. Second differencing removes quadratic trend. Seasonal differencing: y'(t) = y(t) - y(t-s) removes seasonality with period s."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "What are the components of a time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Trend:** Long-term increase/decrease",
      "**Seasonality:** Regular periodic patterns (daily, weekly, yearly)",
      "**Cyclical:** Irregular fluctuations (business cycles)",
      "**Residual/Noise:** Random variation"
     ]
    },
    {
     "t": "p",
     "text": "**Decomposition:** Additive: Y = T + S + R. Multiplicative: Y = T × S × R."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is the ARIMA model and what do p, d, q represent?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**p:** Order of AutoRegressive component (how many past values)",
      "**d:** Order of differencing (to make stationary)",
      "**q:** Order of Moving Average component (how many past errors)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** AR(p): y(t) depends on y(t-1)...y(t-p). MA(q): y(t) depends on ε(t-1)...ε(t-q). I(d): d-th order differencing. ARIMA combines all three."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "How do you determine p and q for ARIMA?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**ACF plot:** Cuts off at lag q → MA(q). Decays gradually → AR component needed",
      "**PACF plot:** Cuts off at lag p → AR(p). Decays gradually → MA component needed",
      "**Auto ARIMA:** Tests multiple (p,d,q) combinations, selects by AIC/BIC"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ACF: correlation at lag k. PACF: correlation at lag k after removing intermediate correlations. auto_arima (pmdarima) automates this."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is SARIMA and when do you use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Seasonal ARIMA: ARIMA(p,d,q)(P,D,Q,s) where (P,D,Q) are seasonal AR, differencing, MA orders and s is the seasonal period."
    },
    {
     "t": "p",
     "text": "**Explanation:** Use for data with regular seasonality (s=12 for monthly/yearly, s=7 for daily/weekly). Captures both non-seasonal and seasonal patterns."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What are exponential smoothing methods?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Simple (SES):** Level only — flat forecasts",
      "**Holt's (Double):** Level + trend — linear forecasts",
      "**Holt-Winters (Triple):** Level + trend + seasonality — seasonal forecasts"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Each component has a smoothing parameter (α, β, γ). More recent observations weighted more heavily. Holt-Winters handles additive or multiplicative seasonality."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is the difference between additive and multiplicative decomposition?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Additive:** Y = Trend + Season + Residual. Seasonal effect is constant magnitude.",
      "**Multiplicative:** Y = Trend × Season × Residual. Seasonal effect proportional to trend level."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** If seasonal swings grow with the level → multiplicative (common for sales, stock prices). If constant → additive (temperature variations)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "How do you create lag features for ML-based time series forecasting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "for lag in [1, 7, 14, 30]:\n    df[f'lag_{lag}'] = df['target'].shift(lag)\n# Rolling statistics\ndf['rolling_mean_7'] = df['target'].rolling(7).mean()\ndf['rolling_std_7'] = df['target'].rolling(7).std()"
    },
    {
     "t": "p",
     "text": "**Explanation:** Transform time series into tabular supervised learning. Lag features capture autocorrelation. Rolling statistics capture recent trends. Drop rows with NaN from shifting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is the proper way to split time series data?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Always chronological — train on past, test on future. Never random split."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Train: [0, split_point), Test: [split_point, end]\ntrain = df[df['date'] < '2024-01-01']\ntest = df[df['date'] >= '2024-01-01']"
    },
    {
     "t": "p",
     "text": "**Explanation:** Random splitting causes future leakage. Use `TimeSeriesSplit` for CV. Walk-forward validation for robust evaluation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is walk-forward validation?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Expanding or sliding window approach:"
    },
    {
     "t": "ol",
     "items": [
      "Train on [1, t], predict t+1",
      "Train on [1, t+1], predict t+2",
      "Repeat..."
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Each prediction uses only past data. Most realistic evaluation for production forecasting. Computationally expensive but necessary."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is the Prophet model and when is it useful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Facebook Prophet: additive regression model handling trends, multiple seasonalities, holidays, and missing data."
    },
    {
     "t": "p",
     "text": "**Use when:**"
    },
    {
     "t": "ul",
     "items": [
      "Multiple seasonality (daily, weekly, yearly)",
      "Holidays/events matter",
      "Missing data or outliers present",
      "Non-technical users need to tune"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Decomposable: y(t) = g(t) + s(t) + h(t) + ε. Easy to use but may underperform for complex patterns. Good baseline for business forecasting."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is autocorrelation and how do you interpret an ACF plot?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Autocorrelation = correlation between a time series and its lagged version. ACF(lag k) = corr(y(t), y(t-k))."
    },
    {
     "t": "p",
     "text": "**ACF Plot interpretation:**"
    },
    {
     "t": "ul",
     "items": [
      "Slow decay → non-stationary or strong AR",
      "Cuts off sharply at lag q → MA(q) process",
      "Significant at seasonal lags (12, 24...) → seasonal pattern"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Significance line: typically ±1.96/√n. Values outside = significant autocorrelation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What is the partial autocorrelation function (PACF)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Correlation between y(t) and y(t-k) after removing the linear dependence of y(t-1)...y(t-k+1). Direct effect of lag k."
    },
    {
     "t": "p",
     "text": "**Explanation:** If PACF cuts off at lag p, AR(p) is appropriate. If PACF decays gradually, MA component needed. Used with ACF to determine ARIMA order."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is the difference between endogenous and exogenous variables in time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Endogenous:** The target variable being forecast (past values of itself)",
      "**Exogenous:** External variables that influence the target (holiday indicators, weather, marketing spend)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ARIMA: only endogenous. ARIMAX/SARIMAX: endogenous + exogenous. Include exogenous when external factors meaningfully affect the target."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "How do you handle missing values in time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Forward fill (assume value persists)",
      "Interpolation (linear, cubic, spline)",
      "Seasonal interpolation (use same period from previous cycle)",
      "Model-based imputation (Kalman filter)",
      "Mark and model separately"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Don't use mean/median — destroys temporal structure. Forward fill is simplest. Interpolation is better for smooth series."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is the naive forecast baseline?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Simple naive:** y_hat(t+1) = y(t) (last value persists)",
      "**Seasonal naive:** y_hat(t+1) = y(t-s) (same time last season)",
      "**Drift:** y_hat projects the line between first and last observation"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Any model must beat the naive baseline to be useful. Surprisingly hard to beat in many real-world scenarios."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "What forecasting metrics are commonly used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**MAPE:** Mean Absolute Percentage Error (scale-independent)",
      "**sMAPE:** Symmetric MAPE (better for near-zero values)",
      "**RMSE:** Root Mean Squared Error (penalizes large errors)",
      "**MAE:** Mean Absolute Error (robust)",
      "**MASE:** Mean Absolute Scaled Error (compares to naive baseline)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** MAPE undefined for y=0. MASE > 1 means worse than naive forecast. Use MASE for most robust comparison."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "71",
   "q": "What is the difference between one-step and multi-step forecasting?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**One-step:** Predict next single time step (easiest)",
      "**Multi-step:** Predict h steps ahead. Approaches:",
      "— Recursive: predict t+1, use as input for t+2, etc.",
      "— Direct: separate model for each horizon",
      "— MIMO: single model predicts all h steps at once"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Recursive: error accumulates. Direct: no error propagation but more models. MIMO: captures dependencies between future steps."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is the Granger causality test?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Tests whether past values of variable X improve prediction of variable Y beyond what Y's own past provides."
    },
    {
     "t": "p",
     "text": "**Explanation:** Granger causality ≠ true causation. It's about predictive utility. If X Granger-causes Y, X's history has information about Y's future not captured by Y's own history."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "How do you handle trend + seasonality in time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Classical decomposition:** Separate trend, seasonal, residual",
      "**Differencing:** First difference (trend) + seasonal difference",
      "**STL decomposition:** Robust decomposition handling outliers",
      "**Direct modeling:** Prophet, SARIMA, state space models"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** STL (Seasonal and Trend decomposition using Loess) is most robust. After decomposition, forecast each component or just the residual."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "When would you use LSTM vs ARIMA for time series?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**ARIMA:** Univariate, linear relationships, smaller datasets, interpretable",
      "**LSTM:** Multivariate, non-linear, large datasets, complex patterns"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** ARIMA: simpler, faster, well-understood theory. LSTM: flexible but needs more data and tuning. For many business problems, ARIMA/ETS outperforms LSTM."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "What is the Vector AutoRegression (VAR) model?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multivariate extension of AR — each variable depends on its own past and other variables' past."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "y1(t) = α + β11*y1(t-1) + β12*y2(t-1) + ε1\ny2(t) = α + β21*y1(t-1) + β22*y2(t-1) + ε2"
    },
    {
     "t": "p",
     "text": "**Explanation:** Captures inter-dependencies between multiple time series. Select lag order using AIC/BIC. Variables should be stationary (or cointegrated)."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

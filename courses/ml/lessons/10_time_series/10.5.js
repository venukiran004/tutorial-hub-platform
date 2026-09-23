/* ============================================================================
   LESSON 10.5 — ARIMA, SARIMA and SARIMAX
   ========================================================================= */
EC.receiveLesson({
  id: "10.5",

  lede: "**ARIMA regresses a series on its own past values and its own past forecast errors after differencing it enough to be stationary — three ideas, three letters, and a forecast whose shape you can predict before you fit anything.** The pieces are simulated and recovered one at a time, and the one-step forecast is computed by hand for an ARIMA(1,1,1) with drift: z₁₃ = 0.8 + 0.5 × 11.5 + 0.3 × (−1.2) = 6.19, so y₁₃ = 60.19, converging to a straight line of slope c/(1 − φ) = 1.6; the same recursion applied to a fitted model's own parameters reproduces statsmodels' four forecasts to three decimals — once you know that statsmodels reports the drift as the mean of the differences, not the intercept. SARIMA multiplies its polynomials, and the cross term the multiplication creates (−0.30 for φ = 0.5, Φ = 0.6) is recovered by a fit. On the store's log sales, the model read from 10.2's plots fails the residual test (Ljung–Box p = 0.000) and loses to the seasonal naive; the airline model passes (p = 0.945) and scores 20.1 against 23.1; auto_arima's 37-second search finds a nine-parameter model that scores the same 20.1; and SARIMAX with the promotion calendar, the holidays and two Fourier terms — regressors known in advance — scores 14.3, recovering the promotion effect as 0.197 against a built-in 0.182. The exercise shows what happens when the regressor is not known in advance: a leak scores 5.8, the honest version 14.1 — worse than no regressor at all.",

  objectives: [
    "Explain the AR, I and MA components and compute an ARIMA forecast by hand from parameters, the last values and the last residual",
    "State the long-run shape of an ARIMA forecast from d and the drift",
    "Expand a multiplicative SARIMA polynomial and read seasonal orders from the plots",
    "Choose orders with AICc and auto_arima, knowing when AICs are comparable",
    "Add exogenous regressors that are known at forecast time, and run the residual diagnostics that validate the model"
  ],

  prerequisites: ["10.2", "10.4"],

  blocks: [

    { t: "h2", n: "01", text: "Three pieces, one at a time", id: "pieces" },

    { t: "code", lang: "text", title: "ARIMA(p, d, q) and SARIMA(p, d, q)(P, D, Q)_m",
      code: `AR(p)   y_t = c + φ₁ y_{t−1} + ... + φ_p y_{t−p} + ε_t        the series remembers its own LEVEL; |φ| < 1 for stationarity, φ = 1 is a random walk
MA(q)   y_t = c + ε_t + θ₁ ε_{t−1} + ... + θ_q ε_{t−q}        the series remembers its own SHOCKS; a surprise persists exactly q steps
I(d)    fit the AR and MA terms to the d-times differenced series; cumulatively sum the forecast back
SARIMA  the same three ideas again at lag m, MULTIPLIED with the non-seasonal ones (§03)

executed on 2,000 simulated points:
  AR(1) with c 2, φ 0.6:  fitted φ 0.600, mean 4.92 (theory c/(1−φ) = 5.0)
                          last value 4.24; forecasts 4.515  4.677  4.774  4.832   -> decay toward the mean at rate φ per step
  MA(1) with θ 0.7:       fitted θ 0.697, mean 4.95
                          forecasts 5.265  4.953  4.953                          -> the shock is used once, then the mean`,
      caption: "An AR forecast decays geometrically toward the mean — after h steps the departure is φʰ of what it was — and an MA forecast is the mean after q steps because future shocks have expectation zero. The two ACF shapes of 10.2 are these two facts seen from the other side." },

    { t: "h2", n: "02", text: "A one-step forecast by hand", id: "by-hand" },

    { t: "p", text: "This is the classic interview question, and it has a definite answer. A fitted ARIMA(1,1,1) with drift has c = 0.8, φ = 0.5, θ = 0.3; the last two observations are y₁₁ = 42.5 and y₁₂ = 54.0; the last residual is ε₁₂ = −1.2. Because d = 1 the model lives in differences z_t = y_t − y_{t−1}, so the first move is z₁₂ = 11.5. The one-step forecast is z̑₁₃ = c + φ z₁₂ + θ ε₁₂; beyond one step the future errors are unknown, their expectation is zero, and the MA term drops out; each further step feeds its own prediction back in; and the level forecast is the cumulative sum." },

    { t: "code", lang: "text", title: "ARIMA(1,1,1) with drift, four steps ahead (executed)",
      code: `z₁₂ = y₁₂ − y₁₁ = 54.0 − 42.5 = 11.5

h=1:  z = 0.8 + 0.5·11.500 + 0.3·(−1.2) = 0.8 + 5.750 − 0.360 = 6.190       y₁₃ = 54.000 + 6.190 = 60.190
h=2:  z = 0.8 + 0.5·6.190  + 0.3·0      = 3.895                              y₁₄ = 60.190 + 3.895 = 64.085
h=3:  z = 0.8 + 0.5·3.895                = 2.747                              y₁₅ = 64.085 + 2.747 = 66.832
h=4:  z = 0.8 + 0.5·2.747                = 2.174                              y₁₆ = 66.832 + 2.174 = 69.006

long run: z → c/(1 − φ) = 0.8/0.5 = 1.60 per quarter -- the forecast becomes a straight line of slope 1.6

the same recursion on a FITTED model (a simulated ARIMA(1,1,1)+drift, n = 600):
  statsmodels reports the drift as the mean of the differences, μ = 1.5149 (theory c/(1−φ) = 1.6); c = μ(1 − φ) = 0.7631; φ 0.4963; θ 0.3240
  last residual 0.2745, last difference 0.4504
  hand recursion:      910.997  912.294  913.701  915.162
  statsmodels forecast: 910.997  912.294  913.701  915.162`,
      caption: "Every ARIMA forecast converges to one of three shapes: a flat line at the mean (d = 0), a straight line with slope equal to the drift (d = 1), or a curve (d = 2). Knowing which shape you have signed up for matters more than the coefficients. The check against statsmodels also shows the parameterisation trap: its 'trend' for a differenced model is the mean of the differences, and using it as the intercept c gives the wrong recursion." },

    { t: "callout", kind: "trap", title: "Twelve points cannot estimate an ARIMA(1,1,1)", body: [{ t: "p", text: "Fitted to the twelve quarterly numbers alone, statsmodels returns φ = −1.000 and θ = 0.996 — the boundary of the parameter space, where the AR root sits on the unit circle and the MA term tries to cancel it. That is not a model; it is an optimiser with nothing to work with. The hand example above uses *given* parameters for that reason. ARIMA needs enough history to identify its orders and estimate its parameters — a few dozen points for a simple model, several seasons for a seasonal one — and the exercise in 10.4 and the store fits below have 900." }] },

    { t: "h2", n: "03", text: "SARIMA multiplies", id: "sarima" },

    { t: "p", text: "In backshift notation a SARIMA model is (1 − φB)(1 − ΦBᵐ)(1 − B)ᵈ(1 − Bᵐ)ᴰ y_t = (1 + θB)(1 + ΘBᵐ) ε_t: an AR polynomial, a seasonal AR polynomial, the differencing, and on the right an MA polynomial and a seasonal MA polynomial. The multiplication is what people miss. Expanding (1 − φB)(1 − ΦB⁷) gives 1 − φB − ΦB⁷ + φΦB⁸, so y_t = φ y_{t−1} + Φ y_{t−7} − φΦ y_{t−8} + ε_t: a term at lag 8 that nobody wrote down. SARIMA does not bolt a seasonal model onto a non-seasonal one; it modulates one by the other, and the cross term is real." },

    { t: "code", lang: "python", title: "The cross term, simulated and recovered (executed, 2,500 points)",
      code: `# simulate with the EXPANDED form: y_t = 0.5 y_{t−1} + 0.6 y_{t−7} − 0.30 y_{t−8} + ε_t
SARIMAX(y, order=(1, 0, 0), seasonal_order=(1, 0, 0, 7)).fit()      # φ 0.491, Φ 0.626        two parameters
ARIMA(y, order=(8, 0, 0)).fit()                                      # lag 1 0.488, lag 7 0.617, lag 8 −0.308, lags 2-6 within ±0.03
                                                                     # eight parameters to do what two did, and the lag-8 coefficient is φΦ`,
      caption: "The unrestricted AR(8) finds the cross term at −0.31 and five near-zero coefficients it had to estimate anyway; the SARIMA form imposes the structure and spends two parameters. On a daily series with a weekly season the equivalent AR would need lags to 8 or 15; on monthly data with m = 12, lags to 13 or 25." },

    { t: "table", head: ["What the plots show (on the stationary series)", "Set"], rows: [
      ["ACF decays slowly from 1", "d = 1"],
      ["ACF spikes at m, 2m, 3m barely decaying", "D = 1"],
      ["PACF cuts off at lag p (short lags)", "p"],
      ["ACF cuts off at lag q (short lags)", "q"],
      ["PACF spike at lag m only", "P = 1"],
      ["ACF spike at lag m only, PACF decaying at m, 2m, 3m", "Q = 1"],
      ["Monthly retail, as a starting point", "(1,1,1)(1,1,1)₁₂ or the airline model (0,1,1)(0,1,1)₁₂"]
    ] },

    { t: "h2", n: "04", text: "The store: orders, AIC and what the residuals say", id: "store" },

    { t: "code", lang: "python", title: "Four candidates on log sales, and auto_arima (executed, store A, closures interpolated)",
      code: `#  model                                AIC       AICc      BIC       parameters                        Ljung–Box(14) p    fit time
#  (0,0,0)(0,1,1)7  read from 10.2   −1263.2   −1263.2   −1253.6   Θ −0.663                               0.000            0.1 s
#  (0,1,1)(0,1,1)7  airline          −1417.1   −1417.1   −1402.7   θ −0.884, Θ −0.978                     0.945            0.4 s
#  (1,0,0)(0,1,1)7 + drift           −1296.4   −1296.4   −1277.2   c 0.003, φ 0.191, Θ −0.722             0.000            0.4 s
#  (1,1,1)(1,1,1)7                   −1413.9   −1413.9   −1389.9   φ 0.025, θ −0.891, Φ 0.023, Θ −0.980   0.967            1.2 s
#  AICs compare only within the same (d, D): rows 1 and 3 share (0, 1); rows 2 and 4 share (1, 1)

pm.auto_arima(log_sales, seasonal=True, m=7, d=None, D=None, max_p=3, max_q=3, max_P=2, max_Q=2, information_criterion="aicc", stepwise=True)
# 37 s -> (3,1,2)(2,0,2)7, AICc −1361.3, Ljung–Box(14) p 0.315 -- nine parameters; D = 0, since the OCSB test found no seasonal unit root`,
      caption: "The model read from the plots captures the weekly structure and fails the residual test: with p = 0.000 at lag 14 there is autocorrelation left — the trend, the yearly cycle, the promotions. The airline model's d = 1 absorbs the trend and its residuals are white. Its Θ = −0.978 is close to −1, which is a seasonal MA root nearly cancelling the seasonal difference: the sign that D = 1 was nearly unnecessary, consistent with pmdarima's nsdiffs = 0 in 10.2, and with (1,1,1)(1,1,1)₇ finding φ and Φ of 0.02 — nothing for the AR terms to do." },

    { t: "p", text: "AIC = −2 log L + 2k, AICc adds a small-sample correction 2k(k+1)/(n−k−1) and is the right default for time series, and BIC = −2 log L + k log n penalises harder and picks smaller models — prefer it when the coefficients must be interpretable, AICc when the forecast must be accurate. Lower is better, k counts every parameter including the variance, and the one rule that matters: never compare AIC across different d or D, because differencing changes the data and the likelihoods are of different series. Fix d and D first, by test; then search p, q, P, Q. auto_arima's stepwise search (Hyndman and Khandakar) does exactly that in a fraction of the exhaustive cost, and on this series found a model that backtests identically to the airline model at eight times the fitting cost." },

    { t: "code", lang: "python", title: "Residual diagnostics: the step people skip (executed, the (0,0,0)(0,1,1)7 model)",
      code: `resid.mean()  +0.0117      resid.std()  0.1196
the five largest |residuals|:  2024-11-29  0.703  Black Friday (also a promo day)
                               2023-11-24  0.455  Black Friday
                               2024-03-08  0.382  promo
                               2024-12-23  0.378  Christmas week
                               2023-04-03  0.365  promo
mean residual on promo days  +0.190   (the generator's promotion effect is log(1.2) = 0.182)
Ljung–Box(14): p = 0.000     -- autocorrelation remains; the model has missed structure`,
      caption: "The residuals name what is missing: every large one is a dated event, and the promotion effect sits in them at almost exactly its true size. A model that has missed a regressor shows it here before any backtest does. The four checks are: no autocorrelation (Ljung–Box p > 0.05 at lag min(10, n/5) or the season), zero mean, constant variance (a funnel means the interval is wrong even if the point forecast is fine), and rough normality — needed for the interval, not the point." },

    { t: "h2", n: "05", text: "SARIMAX: things you know about the future", id: "sarimax" },

    { t: "p", text: "The X is a matrix of exogenous regressors — columns you will still know at forecast time: your own promotion calendar, public holidays, a price you set, a competitor's opening date, weather *forecasts*, and Fourier terms sin(2πt/365.25), cos(2πt/365.25) that give a long season to a model whose seasonal machinery is busy with the weekly one. The regression coefficients and the ARIMA errors are estimated together, and the forecast requires the regressors for every future step." },

    { t: "code", lang: "python", title: "(0,0,0)(0,1,1)7 with the promotion calendar, holidays and a yearly Fourier pair (executed)",
      code: `X = DataFrame({"promo", "black_friday", "xmas_week", "closed", "sin1", "cos1"})        # all known in advance
SARIMAX(log_sales, exog=X, order=(0, 0, 0), seasonal_order=(0, 1, 1, 7)).fit()

# AICc −1932.4 (was −1263.2 without X; same d and D, so comparable)
# coefficients:  promo 0.197   black_friday 0.521   xmas_week 0.232   closed 0.077   sin1 0.036   cos1 −0.151
# built in:      promo 0.182   black_friday 0.588   xmas_week 0.223   yearly amplitude 0.15 -> fitted √(sin² + cos²) = 0.155
# residual sd 0.0813 (was 0.1196);  Ljung–Box(14) p 0.461 -- white now`,
      caption: "The regressors recover the generator's effects to within a few percent, cut the residual standard deviation by a third, and leave residuals that pass the test the plain model failed. `closed` has a small positive coefficient because the closures were interpolated before the fit — its job here is to mark the days, and the forecast for a closure is overridden to zero afterwards." },

    { t: "code", lang: "python", title: "Backtest: h = 28, 10 origins, refit at each, on the sales scale (executed, store A)",
      code: `#  model                                                 MAE     sd across origins    time for 10 refits
#  seasonal naive, 4-week mean                           23.10        3.24                 0.0 s
#  SARIMA (0,0,0)(0,1,1)7 on log                         23.49        2.81                 1.0 s    <- read from the plots; loses to the baseline
#  SARIMA airline (0,1,1)(0,1,1)7 on log                 20.07        3.29                 3.9 s
#  auto_arima's (3,1,2)(2,0,2)7 on log                   20.08        3.26                17.4 s
#  SARIMAX (0,0,0)(0,1,1)7 + promo/holiday/Fourier       14.25        1.85                 8.6 s
#  SARIMAX, same, with the log-normal mean correction    14.13        1.95                 8.6 s    exp(forecast + σ²/2)`,
      caption: "The plots' model captures the season and nothing else, and a seasonal naive that averages four weeks does as well. Absorbing the trend gains 13 %; the nine-parameter search gains nothing over the two-parameter airline model; and the regressors you already know gain another 29 % and halve the spread across origins — because a promotion day is not noise if you know it is coming. The mean correction matters little here because σ is small (0.08)." },

    { t: "callout", kind: "warn", title: "A regressor you will not know is two forecasting problems", body: [{ t: "p", text: "'Today's web traffic' is a superb predictor of today's sales, and useless for a 28-day forecast unless you can forecast traffic 28 days out. The exercise builds exactly this: a same-day traffic proxy that tracks log sales to 5 %. Fed the *true* future traffic — the leak — the model scores 5.8. Fed traffic forecast by its own seasonal naive — the only honest option — it scores 14.1, worse than the 11.9 it had with no regressor at all, because the traffic forecast's error is added to the sales forecast's. If a regressor must be forecast, you now own its forecast too, and the errors compound. Only regressors known in advance earn their place in X." }] },

    { t: "ladder",
      title: "Fitting an ARIMA-family model to a seasonal series",
      rungs: [
        { level: "bad", label: "auto_arima on the raw series, take the summary", code: `pm.auto_arima(sales, seasonal=True, m=7).summary()`,
          note: "**On the raw scale the multiplicative season becomes an additive misfit, the closures are zeros the model must explain, and the search's AICc winner was not better than a two-parameter model on the backtest.**" },
        { level: "ok", label: "Logs, orders from the plots, residual check", code: `m = SARIMAX(np.log(s), order=(0, 0, 0), seasonal_order=(0, 1, 1, 7)).fit()
acorr_ljungbox(m.resid, lags=[14])       # p = 0.000 -> structure remains`,
          note: "The plots gave the seasonal structure and the residual test says it is not enough: the trend and the events are still in the residuals, and the backtest (23.5) is no better than the baseline." },
        { level: "best", label: "Logs, d from the tests, the known calendar as X, residuals white, backtested against the baseline", code: `X = calendar_features(known_in_advance=True)           # promo, holidays, Fourier(365.25)
m = SARIMAX(np.log(s), exog=X, order=(0, 0, 0), seasonal_order=(0, 1, 1, 7)).fit()
acorr_ljungbox(m.resid, lags=[14])                       # p = 0.461
backtest(...)                                            # 14.3 vs the baseline's 23.1
np.exp(m.forecast(28, exog=X_future) + m.params["sigma2"] / 2); forecast[closed] = 0`,
          note: "Every choice was checked: the transformation from 10.1, the orders from 10.2 and the residual test, the regressors from what is genuinely known in advance, and the value from a backtest against the free alternative." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why does the MA term drop out of the ARIMA(1,1,1) forecast after the first step?",
          options: [
            "Because θ is small",
            "Because the MA term multiplies the previous period's error, and beyond one step ahead that error is a future shock whose expectation is zero — the last known residual is used once, at h = 1",
            "Because the model is differenced",
            "Because the forecast is cumulative"
          ],
          answer: 1,
          why: "At h = 1 the forecast uses ε₁₂ = −1.2, which is known; at h = 2 it would need ε₁₃, which has not happened, and E[ε₁₃] = 0. The AR term, by contrast, feeds the model's own previous forecast back in indefinitely, which is why the forecast converges to c/(1 − φ) per step rather than to c."
        },
        {
          stem: "An AR(8) fitted to a SARIMA(1,0,0)(1,0,0)₇ process found coefficients of 0.488 at lag 1, 0.617 at lag 7 and −0.308 at lag 8. Where does the lag-8 term come from?",
          options: [
            "Over-fitting to noise",
            "From multiplying the polynomials: (1 − φB)(1 − ΦB⁷) contains +φΦB⁸, so the process has a lag-8 coefficient of −φΦ = −0.30 that the seasonal form implies and the unrestricted form must estimate",
            "From the seasonal difference",
            "From the intercept"
          ],
          answer: 1,
          why: "The multiplicative structure means the seasonal effect is modulated by the short-term one. The SARIMA fit recovered φ = 0.491 and Φ = 0.626 with two parameters; the AR(8) needed eight and found five near-zero coefficients plus the implied cross term at −0.31."
        },
        {
          stem: "The (0,0,0)(0,1,1)₇ model has AICc −1263 and the airline model (0,1,1)(0,1,1)₇ has −1417. Is the airline model 154 units better?",
          options: [
            "Yes — lower is better",
            "The comparison is not valid: the two models have different d, so their likelihoods are of different series (the second is fitted to first differences); compare them on the backtest, where the airline model scored 20.1 against 23.5",
            "No — the airline model has more parameters",
            "Yes, but only if BIC agrees"
          ],
          answer: 1,
          why: "Differencing changes the data and the number of observations; AIC compares models of the same data. Fix d and D first by test, then let AICc choose among p, q, P, Q; and use the backtest — which is on the same scale for everyone — to compare across differencing orders and across model families."
        },
        {
          stem: "The (0,0,0)(0,1,1)₇ model's largest residuals fall on Black Friday, promotion days and Christmas week, with a mean promo-day residual of +0.190. What is the right response?",
          options: [
            "Increase the MA order until the residuals pass",
            "Add those dated events as exogenous regressors — they are known in advance — which recovered the promotion effect as 0.197, cut the residual sd by a third, made the residuals white and cut the backtest MAE from 23.5 to 14.3",
            "Remove those days as outliers",
            "Switch to an additive model"
          ],
          answer: 1,
          why: "A residual pattern with a name is a missing regressor, not a missing ARMA term: no amount of autocorrelation structure predicts a promotion the model was not told about. Removing the days would forecast a promotion-free future. The events are in the calendar, so they are legitimate X."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "An AR(2) forecast by hand, the airline model expanded, and a regressor you cannot know",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** An AR(2) has c = 2, φ₁ = 0.5, φ₂ = −0.3; the last two observations are 10 and 12. Forecast five steps ahead by hand, compute the long-run mean, and describe the path." },
        { t: "p", text: "**(b)** Fit the airline model (0,1,1)(0,1,1)₇ to store B's log sales (closures interpolated). Report θ, Θ, AICc, the Ljung–Box(14) p-value and the residual sd. Expand (1 − B)(1 − B⁷) y_t = (1 + θB)(1 + ΘB⁷) ε_t into lags, compute the cross term θΘ, and interpret Θ." },
        { t: "p", text: "**(c)** Build a same-day 'web traffic' regressor as log sales plus N(0, 0.05) noise. Backtest the airline model on store B with h = 28 over 10 origins three ways: no regressor; traffic as exog with the *true* future traffic supplied; traffic as exog with the future traffic forecast by its own four-week seasonal naive. Report the in-sample traffic coefficient and explain the three numbers." }
      ],
      requirements: [
        "(a) five forecasts, the mean, and the path.",
        "(b) five numbers, the expansion, and the interpretation of Θ.",
        "(c) three MAEs, the coefficient, and the explanation."
      ],
      hint: "(a) φ₂ < 0 makes the forecasts overshoot and come back. (b) A seasonal MA coefficient at −1 cancels a seasonal difference. (c) The honest version must forecast the regressor, and its error adds.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) h=1: 2 + 0.5·12 − 0.3·10 = 5.000     h=2: 2 + 0.5·5.0 − 0.3·12 = 0.900     h=3: 2 + 0.5·0.9 − 0.3·5.0 = 0.950
#     h=4: 2 + 0.5·0.95 − 0.3·0.9 = 2.205    h=5: 2 + 0.5·2.205 − 0.3·0.95 = 2.8175
#     long-run mean c/(1 − φ1 − φ2) = 2/(1 − 0.5 + 0.3) = 2.5; the path drops from 12 through 5 to below 1 and climbs back:
#     a damped oscillation toward 2.5, because φ2 < 0 gives the characteristic equation complex roots.

# (b) store B airline model: θ −0.898, Θ −1.000; AICc −1381.9; Ljung–Box(14) p 0.881; residual sd 0.1117
#     (1 − B)(1 − B⁷) y_t = (1 + θB)(1 + ΘB⁷) ε_t
#     y_t = y_{t−1} + y_{t−7} − y_{t−8} + ε_t + θ ε_{t−1} + Θ ε_{t−7} + θΘ ε_{t−8};   cross term θΘ = +0.897
#     Θ = −1.000 is the optimiser at the boundary: a seasonal MA root ON the unit circle exactly cancels the seasonal
#     difference (1 − B⁷) -- the model is saying D = 1 was not needed, which is what pmdarima's nsdiffs said in 10.2.
#     The forecasts are fine; the interval and the parameter are not trustworthy, and (0,1,1)(1,0,0)7 or seasonal dummies
#     would be the cleaner specification.

# (c) store B, h = 28, 10 origins:
#     airline, no regressor                                           MAE 11.94  (sd 2.23)
#     airline + traffic, future exog = the TRUE future traffic         MAE  5.82  (sd 1.07)   <- a leak: the future was supplied
#     airline + traffic, future traffic forecast by its seasonal naive MAE 14.08  (sd 2.81)   <- honest, and WORSE than no regressor
#     in-sample traffic coefficient 0.828: traffic explains sales almost exactly, in-sample.
#     The model learned to lean on traffic; at forecast time traffic is itself a forecast with its own error, which is added to the
#     sales error. A regressor is only worth its coefficient if you will know it; otherwise you own two forecasting problems.`,
        notes: [
          { t: "p", text: "(a) is the recursion again with two lags, and the shape a negative φ₂ produces." },
          { t: "p", text: "(b) is the expansion the multiplicative form implies, and the boundary parameter that tells you a differencing order was too many." },
          { t: "p", text: "(c) is the executed version of the warning: the in-sample coefficient is real and the out-of-sample value is negative." }
        ]
      }
    }
  ],

  takeaways: [
    "AR terms regress on past values and produce forecasts that decay to the mean at rate φ; MA terms regress on past errors and are used once; I differences first and cumulates back. The forecast's long-run shape is set by d and the drift — flat, a line of slope c/(1 − φ), or a curve — before any coefficient is read.",
    "The hand recursion for ARIMA(1,1,1) with drift — z̑ = c + φz + θε, level = last + z̑, MA term only at h = 1 — reproduced statsmodels to three decimals once the drift was read as the mean of the differences (c = μ(1 − φ)); twelve points cannot estimate the model at all.",
    "SARIMA multiplies its polynomials: (1 − φB)(1 − ΦB⁷) implies a lag-8 coefficient of −φΦ, recovered at −0.31 by an AR(8) that needed eight parameters where the seasonal form needed two.",
    "AICc is the default criterion, BIC when interpretability matters, and neither compares across different d or D: fix the differencing by test, then search. auto_arima's nine-parameter winner backtested identically to the two-parameter airline model.",
    "Residuals must be white (Ljung–Box), centred and of constant variance; the model read from the plots failed at p = 0.000, and its five largest residuals were all dated events with the promotion effect sitting in them at +0.190.",
    "Regressors known in advance — the promo calendar, holidays, Fourier terms for a long season — cut the backtest MAE from 23.5 to 14.3 and recovered the built-in effects to a few percent; a regressor that must itself be forecast scored 5.8 as a leak and 14.1 honestly, worse than no regressor.",
    "Exponentiate a log-scale forecast with σ²/2 for a mean, override closures to zero, and compare everything on the backtest against the seasonal naive."
  ],

  quiz: {
    title: "ARIMA, SARIMA and SARIMAX — Knowledge Check",
    questions: [
      {
        stem: "A fitted ARIMA(0,1,0) with drift 1.6 is asked for a 12-step forecast from y_T = 54. What is it?",
        options: [
          "54 at every step",
          "54 + 1.6h: a straight line, because d = 1 with a drift makes each difference forecast equal to the drift and the level the cumulative sum",
          "54 × 1.6^h",
          "The mean of the series"
        ],
        answer: 1,
        why: "ARIMA(0,1,0) with drift is the random walk with drift — the 'drift' baseline of 10.3 — and its forecast is the last value plus the drift times the horizon: 55.6, 57.2, … 73.2 at h = 12. With p = q = 0 there is no decay and no shock to use; the shape is set entirely by d and the constant."
      },
      {
        stem: "Which pair of models can be compared by AIC?",
        options: [
          "(0,1,1)(0,1,1)₇ and (0,0,0)(0,1,1)₇ — both seasonal",
          "(1,0,0)(0,1,1)₇ and (0,0,0)(0,1,1)₇ — same d and D, so the likelihoods are of the same differenced series",
          "(3,1,2)(2,0,2)₇ and (0,1,1)(0,1,1)₇ — both have d = 1",
          "Any two SARIMAX models on the same series"
        ],
        answer: 1,
        why: "AIC compares likelihoods of the same data. The first pair differ in d; the third pair differ in D; both comparisons are of different series and different n. Only models with identical differencing (and identical exogenous treatment of the sample) are comparable; everything else goes to the backtest."
      },
      {
        stem: "A SARIMA fit returns Θ = −1.000 exactly. What does it indicate?",
        options: [
          "A perfect seasonal fit",
          "A seasonal MA root on the unit circle that cancels the seasonal difference — the model is signalling that D = 1 was one difference too many; the point forecasts may be fine but the parameter is at a boundary and the interval is not trustworthy",
          "The season length is wrong",
          "Convergence failure only"
        ],
        answer: 1,
        why: "(1 + ΘB⁷) with Θ = −1 is (1 − B⁷), which cancels the (1 − B⁷) on the other side: the seasonal difference is undone by the seasonal MA. Store B's airline fit showed it, and pmdarima's OCSB test had said no seasonal unit root; the cleaner model uses D = 0 with a seasonal AR term or seasonal dummies."
      },
      {
        stem: "Why did SARIMAX with the promotion calendar beat the same model without it by 29 % on the backtest, when the promotions are a random 10 % of days?",
        options: [
          "Because the model over-fitted the calendar",
          "Because the promotion days are random but *known in advance*: the calendar is the company's own, so a +20 % day is predictable, and a model told the dates forecasts it while a model not told treats it as an unpredictable +0.19 shock",
          "Because the Fourier terms did the work",
          "Because promotions are seasonal"
        ],
        answer: 1,
        why: "Randomness in the past is not the same as unpredictability in the future: the regressor's value for every future day is available at forecast time. That is the whole criterion for X. The fitted coefficient 0.197 against the built-in 0.182 shows the effect was learned; the leaked-traffic exercise shows the other side, where the regressor's future is not available and the model is worse for having it."
      },
      {
        stem: "auto_arima returned (3,1,2)(2,0,2)₇ with a lower AICc than the airline model but the same backtest MAE (20.08 vs 20.07). Which should ship?",
        options: [
          "auto_arima's — lower AICc",
          "The airline model: identical accuracy, two parameters instead of nine, a quarter of the fitting time, and interpretable coefficients; the AICc comparison across different D was invalid anyway",
          "auto_arima's — more parameters capture more",
          "Neither — SARIMAX with regressors is better still, and the same argument for parsimony applies to its ARMA part"
        ],
        answer: 3,
        why: "The honest answer is that the ARMA choice is not the important one on this series: the regressors known in advance took the MAE from 20 to 14, and the ARMA structure around them should be as small as passes the residual test. Between the two searched models, parsimony wins at equal accuracy — but the comparison that matters is with the model that has the calendar."
      }
    ]
  },

  interview: {
    title: "Interview Questions — ARIMA, SARIMA and SARIMAX",
    sub: "The mechanics by hand, the multiplicative structure, order selection, diagnostics, and exogenous regressors.",
    questions: [
      {
        level: "Core",
        q: "Given an ARIMA(1,1,1) with c = 0.8, φ = 0.5, θ = 0.3, last values 42.5 and 54.0 and last residual −1.2, forecast four steps ahead.",
        strong: "Work in differences because d = 1: z₁₂ = 54.0 − 42.5 = 11.5. One step: z̑ = c + φz₁₂ + θε₁₂ = 0.8 + 5.75 − 0.36 = 6.19, so y̑₁₃ = 60.19. From step two the MA term is gone — the next error is unknown with expectation zero — and the AR term feeds the forecast back in: z̑ = 0.8 + 0.5 × 6.19 = 3.895, y̑₁₄ = 64.085; then 2.747 and 66.832; then 2.174 and 69.006. The differences converge to c/(1 − φ) = 1.6, so far out the forecast is a straight line of slope 1.6 a quarter. If I were checking this against statsmodels, the trap is that its reported 'trend' for a differenced model is the mean of the differences, 1.6, not the intercept 0.8; with that conversion the recursion matches its forecasts exactly.",
        answer: [
          { t: "p", text: "The difference, the one-step with the residual, the MA term dropping out, the AR feedback, the cumulative sum, the long-run slope, and the parameterisation trap." }
        ]
      },
      {
        level: "Core",
        q: "What is the difference between an AR and an MA process, in terms of memory?",
        strong: "An AR process remembers its own level: with φ = 0.6, 60 % of today's departure from the mean survives to tomorrow, 36 % to the day after, decaying geometrically forever, which is why its ACF decays and its forecast approaches the mean at rate φ. An MA process remembers its own shocks: a surprise today shows up tomorrow at θ of its size and is then gone, which is why its ACF cuts off at lag q and its forecast is the mean after q steps — executed, the MA(1) forecasts were 5.265 then the mean 4.953 from step two. The two are duals: a finite AR has an infinite MA representation and a finite invertible MA has an infinite AR one, and the PACF and ACF shapes swap. Which one fits is a question for the plots in 10.2 and for AICc, and in practice low-order mixtures cover most series.",
        answer: [
          { t: "p", text: "Level memory versus shock memory, the executed forecast shapes, the ACF consequences, and the duality." }
        ]
      },
      {
        level: "Senior",
        q: "Explain the seasonal part of SARIMA and why it is multiplicative rather than additive.",
        strong: "The seasonal part applies the same three ideas at lag m: a seasonal AR term on y_{t−m}, a seasonal difference (1 − Bᵐ), a seasonal MA term on ε_{t−m}. It is combined with the non-seasonal part by multiplying the polynomials, (1 − φB)(1 − ΦBᵐ), which expands to include a cross term φΦ at lag m + 1: the seasonal effect is modulated by the short-term one rather than added to it. I have simulated that process with φ = 0.5 and Φ = 0.6, and an unrestricted AR(8) recovers a lag-8 coefficient of −0.31 — the −φΦ the multiplication predicts — with five near-zero coefficients in between, where the SARIMA form recovered the same structure with two parameters. The multiplicative form is a parsimony device grounded in how seasonal series behave: a shock last Saturday and a shock yesterday interact. The orders are read from the stationary series' plots at the seasonal lags — a spike at m in the ACF with decay in the PACF at m, 2m, 3m is a seasonal MA(1), which is what the store showed — and the airline model (0,1,1)(0,1,1)ₘ is the default starting point for retail data.",
        answer: [
          { t: "p", text: "The seasonal operators, the expansion with the executed cross term, parsimony, reading the seasonal orders, and the airline default." }
        ]
      },
      {
        level: "Senior",
        q: "What diagnostics do you run on a fitted ARIMA, and what does each failure mean?",
        strong: "Four, all on the residuals. Ljung–Box at a lag covering the season: a p-value below 0.05 means autocorrelation remains and the model has missed structure — on the store, the model read from the plots failed at p = 0.000 because the trend, the yearly cycle and the promotions were still in the residuals, and the airline model passed at 0.945. The residual mean: a non-zero mean is a missing drift or intercept. Constant variance: a funnel in the residuals against time or level means the point forecast may be fine but the prediction interval is wrong, which for inventory or capacity decisions is the number that matters; the fix is usually a log transform or a GARCH error model. Rough normality, by a Q–Q plot: needed for the interval, not the point forecast. And one that is not a test: look at the largest residuals and ask whether they have names — on the store the five largest were Black Friday, promotions and Christmas week, and the promotion effect sat in the residuals at +0.190 against a true 0.182, which is a missing regressor and no amount of ARMA structure will find it.",
        answer: [
          { t: "p", text: "Ljung–Box, mean, variance and normality with what each failure means, plus naming the large residuals as the route to missing regressors." }
        ]
      },
      {
        level: "Staff",
        q: "A colleague proposes adding 'yesterday's web traffic' to a 28-day SARIMAX sales forecast because it has a coefficient of 0.83 and cuts the in-sample error in half. What do you say?",
        strong: "That the coefficient is real and the value is negative. The criterion for an exogenous regressor is not how predictive it is in-sample but whether its value will be known at forecast time for every step of the horizon. For a 28-day horizon yesterday's traffic is known for day one and a forecast for the other twenty-seven, so the model now depends on a traffic forecast, whose error adds to its own. I built exactly this case: a same-day traffic proxy with an in-sample coefficient of 0.83; supplied with the true future traffic the 28-day backtest MAE fell from 11.9 to 5.8, which is the leak my colleague's in-sample number reflects; supplied with traffic forecast by its own seasonal naive, the honest version scored 14.1 — worse than the model with no regressor at all, because the fitted model had learned to lean on a variable it no longer had. The regressors that earn their place are the ones we control or the calendar fixes: on the same store the promotion calendar, holidays and Fourier terms cut the MAE from 20 to 14. If traffic must be used, it is a one-day-ahead feature for a one-day-ahead model, or a leading indicator lagged by at least the horizon, and either way its availability is asserted in the pipeline rather than assumed.",
        answer: [
          { t: "p", text: "The availability criterion, the executed leak and honest numbers, why the honest version is worse than nothing, which regressors qualify, and the two legitimate ways to use traffic." }
        ]
      }
    ]
  }
});

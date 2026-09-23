/* ============================================================================
   LESSON 10.8 — Multivariate, Hierarchical, Intermittent and Volatile Series
   ========================================================================= */
EC.receiveLesson({
  id: "10.8",

  lede: "**Five problems that the single-series toolkit does not cover, each with a worked example and its own trap.** A VAR recovers a two-day lead of one series over another (0.457 against a built 0.4), and the Granger test that confirms it is then fooled at p = 10⁻¹²¹ by a confounder that touches both series and links neither. Two random walks that share a common walk are cointegrated — the spread is stationary, Johansen's trace statistic is 214.6 against a critical 15.5 — and the error-correction model that keeps the spread beats a VAR on differences that throws it away. Hierarchical reconciliation is worked by hand: base forecasts of 300 for the total and 120, 95, 70 for three stores that sum to 285 become 296.25 and 123.75, 98.75, 73.75 under OLS, and MinT pulls the noisy total harder. Croston's method is iterated on thirteen periods of intermittent demand to a forecast of 1.2857 per period, and on a simulated spare part MAE ranks the all-zero forecast first, which is why intermittent forecasts are scored on RMSSE, bias and totals. A GARCH(1,1) is simulated and recovered (α + β = 0.946), and its time-varying interval covers 91 % of the most volatile decile where a constant one covers 79 %. CUSUM on a seasonal-naive residual finds store C's level shift four days after it happens with no false alarm in 602 days, while the same detector on the level fires nineteen times before the shift ever occurs.",

  objectives: [
    "Fit a VAR, run a Granger test, and state exactly what it does and does not establish",
    "Explain cointegration, test for it, and say why differencing destroys the relationship a VECM keeps",
    "Reconcile hierarchical forecasts by bottom-up, top-down, OLS and MinT, by hand and on data",
    "Iterate Croston's method by hand, apply SBA and TSB, and evaluate intermittent forecasts without MAE or MAPE",
    "Fit a GARCH model and use it for a volatility-aware interval; detect changepoints with CUSUM on a stationary residual and distinguish them from anomalies"
  ],

  prerequisites: ["10.5", "10.4", "9.4"],

  blocks: [

    { t: "h2", n: "01", text: "VAR and Granger causality", id: "var" },

    { t: "p", text: "A vector autoregression regresses every series on every series' past: y_t = c + A₁y_{t−1} + … + A_p y_{t−p} + ε_t, with k²p coefficients for k series and p lags — three series at four lags is 36 parameters, which is the main practical constraint. Granger's test asks whether the past of x improves the prediction of y beyond what y's own past gives: an F-test of the restricted regression (y on its own lags) against the unrestricted one (y on its own lags and x's). Both series must be stationary first, or the test compares common trends." },

    { t: "code", lang: "python", title: "A two-day lead, recovered; and the confounder that fools the test (executed, 600 points)",
      code: `# built:  x_t = 0.6 x_{t−1} + ε;   y_t = 0.5 y_{t−1} + 0.4 x_{t−2} + ε        x leads y by two days
grangercausalitytests(df[["y", "x"]], maxlag=3)      # x -> y: p = 0.0000 at lags 1, 2, 3
grangercausalitytests(df[["x", "y"]], maxlag=3)      # y -> x: p = 0.81, 0.55, 0.13
VAR(df).fit(2)                                       # y-equation: y_{t−1} 0.460 (built 0.5), x_{t−2} 0.457 (0.4), x_{t−1} 0.059 (0);  k²p = 8 coefficients

# the confounder: z_t = 0.7 z_{t−1} + ε;  x_t = 0.8 z_{t−1} + noise;  y_t = 0.8 z_{t−2} + noise   -- x and y never touch
grangercausalitytests(df2[["y", "x"]], maxlag=2)     # 'x Granger-causes y': p = 4.5e−121

# the stores, ∇₇ log sales: does B's past help forecast A?  p = 0.08 (lag 1), 0.17 (lag 7)  -- they share the calendar, not information`,
      caption: "Granger causality is predictive precedence, nothing more: a confounder that moves x one day before it moves y produces the same result as x causing y, and the test cannot tell the difference. Say 'Granger-causes' in an interview and this is the question you will be asked. The VAR is worth its parameters when the extra series are known only up to now and genuinely lead; when they are known into the future, SARIMAX or a boosting model with the regressor (10.5, 10.6) is the cheaper and stronger route." },

    { t: "h2", n: "02", text: "Cointegration: when differencing throws away the signal", id: "cointegration" },

    { t: "code", lang: "python", title: "Spot and futures share one random walk (executed, 500 points)",
      code: `spot = w + noise;  futures = w + 2 + noise                        # w is a random walk
ADF p:  spot 0.600, futures 0.639 (unit roots);  the spread futures − spot: 0.0e+00 (stationary)  -> cointegrated
coint_johansen(P, det_order=0, k_ar_diff=1).lr1        # trace statistics 214.6, 1.7 vs 95 % critical 15.5, 3.8  -> rank 1

# 20 steps ahead, MAE on spot:   VECM 2.970   VAR on differences 3.432
# the SPREAD's forecast:         VECM 0.617   VAR on differences 0.669
# VECM's error-correction coefficient in the spot equation: −0.745  -- spot is pulled toward futures − 2`,
      caption: "Two series can each be a random walk while a linear combination of them is stationary — tied together in the long run. Differencing both destroys exactly that tie. The vector error-correction model keeps a term proportional to the previous period's departure from equilibrium, which pulls the pair back; that term is what a VAR on differences cannot see, and it is why the VECM's forecasts of both the level and the spread are better." },

    { t: "table", head: ["Situation", "Reach for"], rows: [
      ["Extra series known into the future (price, promotions, holidays)", "SARIMAX or boosting with exogenous regressors"],
      ["Extra series known only up to now; a few of them; they lead", "VAR"],
      ["Non-stationary series tied together long-run", "VECM"],
      ["Many series; cross-learning wanted", "a global boosting model, or TFT / DeepAR"],
      ["Not sure it is worth it", "a Granger test as a screen, then the backtest as the verdict"]
    ] },

    { t: "h2", n: "03", text: "Hierarchical reconciliation, worked", id: "hierarchy" },

    { t: "p", text: "Forecasts made at different levels of a hierarchy do not add up: the total's model and the stores' models are different models, and their disagreement is not a rounding problem. Reconciliation makes them coherent while losing as little accuracy as possible. Bottom-up forecasts the leaves and sums; top-down forecasts the total and splits by historical proportions; optimal reconciliation forecasts every node and projects the whole vector onto the coherent space. With a summing matrix S mapping bottom series to all nodes, the OLS projection is b̃ = (SᵀS)⁻¹Sᵀŷ, and MinT (minimum trace) weights by the inverse covariance of the base forecast errors, b̃ = (SᵀW⁻¹S)⁻¹SᵀW⁻¹ŷ, so noisier nodes are pulled harder." },

    { t: "code", lang: "text", title: "Three stores under one total (executed; every number checkable by hand)",
      code: `base forecasts:  Total 300;   A 120, B 95, C 70   ->  the stores sum to 285, not 300: incoherent

S = [[1,1,1],[1,0,0],[0,1,0],[0,0,1]]      S'S = [[2,1,1],[1,2,1],[1,1,2]]      (S'S)⁻¹ = [[.75,−.25,−.25],[−.25,.75,−.25],[−.25,−.25,.75]]
S'ŷ = [300+120, 300+95, 300+70] = [420, 395, 370]

OLS:  b̃ = (S'S)⁻¹ S'ŷ = [123.75, 98.75, 73.75]      reconciled total 296.25
      every node moved: the total came down 3.75, each store went up 3.75 -- the 15-unit disagreement split a quarter each way

bottom-up:  total = 285 (the total's forecast is discarded)
top-down with proportions 42 / 33 / 25 %:  A 126, B 99, C 75 (the stores' forecasts are discarded)
MinT with error variances (25, 9, 4, 4):  b̃ = [123.21, 96.43, 71.43], total 291.07 -- the noisy total is pulled hardest, the precise stores least`,
      caption: "OLS treats every node's forecast as equally trustworthy and averages the disagreement; MinT lets the nodes with the larger historical errors absorb more of it. Both use all four numbers, which is what bottom-up and top-down throw away — and empirically the optimal methods usually beat both." },

    { t: "code", lang: "python", title: "On the stores: Holt–Winters per node, reconciled four ways (executed; last 5 of 10 origins, h = 28; MinT variances from the first 5)",
      code: `mean |A + B + C − T| across the base forecasts: 3.14      (incoherent by construction)
base error variances (T, A, B, C): 1300, 453, 157, 144       -- the total's model is the noisy one

#  method                          MAE total   MAE A    MAE B    MAE C
#  base (incoherent)                 34.91     22.36    13.05    10.74
#  bottom-up                         33.76     22.36    13.05    10.74     <- the stores' models are better than the total's, so summing them wins the total
#  top-down                          34.91     24.75    15.41    14.82     <- the stores lose their own dynamics
#  OLS                               34.60     22.69    13.19    10.76
#  MinT (WLS on error variances)     34.14     22.65    13.08    10.74     <- close to bottom-up, because the variances say to trust the stores`,
      caption: "Reconciliation's gain depends on where the accuracy is. Here the store models are good and the total's is not, so bottom-up wins the total and MinT — told the same thing by the variances — lands near it without discarding anything. Always reconcile: an incoherent forecast set will be reconciled anyway, by a person in a spreadsheet, badly and late. MinT is the default; `hierarchicalforecast` implements it with shrinkage for large hierarchies." },

    { t: "h2", n: "04", text: "Intermittent demand: Croston, SBA, TSB", id: "intermittent" },

    { t: "p", text: "When most periods are zero the mean is not the thing to forecast. A squared-error model on 0, 0, 0, 4, 0, 0, 7, … predicts about 1.5 every period — right on average and wrong every day. Croston keeps two exponentially smoothed quantities updated only when demand occurs — the demand size z and the interval p between demands — and forecasts z/p per period. The Syntetos–Boylan approximation multiplies by (1 − α/2) to remove Croston's upward bias; TSB updates the *probability* of demand every period, so a part that is dying out is noticed; Tweedie boosting handles the zero mass directly when there are many parts and rich features." },

    { t: "code", lang: "text", title: "Croston on thirteen periods, α = 0.2 (executed)",
      code: `demand:  0  0  0  4  0  0  7  0  0  0  2  0  6

t=4:   first demand 4 after 4 periods            z = 4.0000  p = 4.0000   forecast z/p = 1.0000
t=7:   demand 7, gap 3    z = 0.2·7 + 0.8·4.0000 = 4.6000    p = 0.2·3 + 0.8·4.0000 = 3.8000   forecast 1.2105
t=11:  demand 2, gap 4    z = 0.2·2 + 0.8·4.6000 = 4.0800    p = 0.2·4 + 0.8·3.8000 = 3.8400   forecast 1.0625
t=13:  demand 6, gap 2    z = 0.2·6 + 0.8·4.0800 = 4.4640    p = 0.2·2 + 0.8·3.8400 = 3.4720   forecast 1.2857

Croston 1.2857 per period;  SBA = (1 − α/2) × 1.2857 = 0.9 × 1.2857 = 1.1571;  the series' mean is 1.4615
classification: ADI = 13/4 = 3.25 (> 1.32);  CV² of the non-zero sizes = 0.22 (< 0.49)  -> intermittent (sparse arrivals, regular sizes); lumpy would need CV² > 0.49`,
      caption: "Two smoothers, updated only on demand days, and a flat forecast that is a rate, not a prediction of any particular day. The ADI/CV² classification (Syntetos, Boylan and Croston) decides which family of method is appropriate before any is fitted." },

    { t: "code", lang: "python", title: "A simulated spare part: P(demand) = 0.25, size 1 + Poisson(3); rolling one-step forecasts over the last 100 periods (executed)",
      code: `#  method            MAE     MASE    RMSSE    forecast total (100 periods)   actual total   bias
#  zero forecast     1.400   0.851   1.005            0                          140          +1.400   <- MAE's winner
#  mean of history   1.829   1.111   0.872          110                          140          +0.296
#  Croston           1.954   1.187   0.886          133                          140          +0.065
#  SBA               1.924   1.169   0.885          127                          140          +0.132
#  TSB               1.927   1.171   0.891          130                          140          +0.095`,
      caption: "MAE ranks forecasting nothing first, because zero is 'right' three days in four; MAPE is undefined on those days. Intermittent forecasts are judged on RMSSE (the M5 metric), on bias, and on totals over a window — the questions a stock policy asks — and on those the Croston family wins. The forecast is a rate for an order-up-to policy, not a claim about tomorrow." },

    { t: "h2", n: "05", text: "Volatility: ARCH and GARCH", id: "garch" },

    { t: "p", text: "In financial series the mean is nearly unpredictable and the variance is not: quiet periods follow quiet ones and violent periods follow violent ones. GARCH(1,1) models that clustering directly: r_t = μ + ε_t, ε_t = σ_t z_t, σ²_t = ω + α ε²_{t−1} + β σ²_{t−1}. α is how strongly yesterday's shock raises today's variance, β how strongly yesterday's variance persists, α + β the persistence — 0.95 to 0.99 in real markets, and at exactly 1 the variance never mean-reverts — and ω/(1 − α − β) the long-run variance." },

    { t: "code", lang: "python", title: "GARCH(1,1) simulated with ω 0.05, α 0.10, β 0.85 and t(6) shocks, then fitted (executed, 3,000 points)",
      code: `ACF of returns, lags 1-3:          0.054  0.010  0.051       the mean is unpredictable
ACF of SQUARED returns, lags 1-3:  0.096  0.072  0.123       the variance is not

arch_model(r, vol="GARCH", p=1, q=1, dist="t").fit()
# ω 0.0478 (built 0.05)   α 0.077 (0.10)   β 0.869 (0.85)   α + β = 0.946   long-run variance 0.878 (built 1.00)

# a 90 % interval for the next return:          overall coverage    coverage in the most volatile decile
#   constant σ (±1.645 × 0.942)                       0.915                     0.790
#   GARCH σ_t (±1.645 × σ_t)                          0.911                     0.910`,
      caption: "A constant-width band is right on average and wrong when it matters: in the most volatile tenth of days it covers 79 % for a nominal 90 %. The GARCH band widens and narrows with the conditional variance and holds 91 % in that decile — the volatility-aware interval of 10.7. EGARCH adds asymmetry without positivity constraints, GJR-GARCH the leverage effect (a negative return raises volatility more than a positive one), and the t or skew-t distribution the fat tails equity returns have." },

    { t: "h2", n: "06", text: "Changepoints and anomalies", id: "changepoints" },

    { t: "p", text: "Two different questions: is this one point strange (an anomaly, which you page someone about), or did the process itself change here (a changepoint, which means the model's assumptions have expired and the response is to retrain or truncate the training window)? Confusing them produces alert storms or missed regime shifts. The residual route from 9.4 finds anomalies: model the series, flag large residuals. CUSUM finds changepoints: accumulate standardised deviations above a drift allowance and alarm when the running sum exceeds a threshold — cheap, online, and only meaningful on a series that is stationary before the change." },

    { t: "code", lang: "python", title: "CUSUM on store C, where the refurbishment lifted the level on 1 September 2024 (executed)",
      code: `def cusum(x, threshold, drift):                          # x standardised on a reference period; drift = the smallest shift you care about, in σ
    gp = gn = 0.0
    for i, v in enumerate(x):
        gp = max(0.0, gp + v - drift); gn = max(0.0, gn - v - drift)        # upward and downward accumulators
        if gp > threshold or gn > threshold: alarm(i); gp = gn = 0.0        # reset after alarming

# on the seasonal-naive residual ∇₇ log C, standardised on the data before June 2024:
#  threshold 5, drift 0.5σ:  2 alarms in the 602 days before the shift (1 Jun 2023, 1 Jan 2024); after: 4 Sep 2024 up, then Black Friday and Christmas
#  threshold 8, drift 0.5σ:  0 alarms before; first alarm 5 September 2024, up
#  threshold 8, drift 1.0σ:  0 alarms before; first alarm 7 September 2024, up
# ∇₇ log C on 1-7 September: 0.14 0.26 0.44 0.33 0.39 0.24 0.45 against a typical |∇₇| of 0.09 -- seven consecutive positives of 2-5× the usual size

# the same CUSUM on the deseasonalised LEVEL (log C minus the STL season): 19 alarms before the shift ever happens
# the residual route (STL residual, robust z > 3.5): 67 point anomalies -- events and closures; 0 flags in the two weeks after 1 September`,
      caption: "Detect on a residual that is stationary before the change: the seasonal-naive residual is, and the level is not — its yearly cycle and slow trend read to CUSUM as nineteen changes. And the residual route cannot see the shift at all, because a level change is absorbed by the trend within days and stops being a large residual. The exercise measures the trade-off the threshold and drift set: at threshold 5 a stationary series false-alarms in 47 % of 300-day runs and a 1σ shift is caught in 8 days; at threshold 8 the false-alarm rate is 3 % and the delay 13 days." },

    { t: "table", head: ["Method", "Detects", "Notes"], rows: [
      ["Residual z-score after a forecast", "point anomalies", "the honest default: model, then flag large residuals"],
      ["STL residual + robust threshold", "point and contextual anomalies", "removes the season first so a normal Saturday is not flagged"],
      ["Isolation Forest / LOF on windows", "collective anomalies", "featurise windows (9.4, 9.5), then any detector"],
      ["Interval breach", "contextual anomalies", "'outside the 99 % band' is an interpretable rule"],
      ["CUSUM, Page–Hinkley", "changepoints, online", "cheap; needs a stationary residual and a chosen drift and threshold"],
      ["PELT / binary segmentation (`ruptures`)", "changepoints, offline", "exact and fast for a batch review"],
      ["Bayesian online changepoint detection", "changepoints, probabilistic", "a run-length distribution"],
      ["Matrix profile (STUMPY)", "motifs and discords", "repeated-pattern data"]
    ] },

    { t: "callout", kind: "production", title: "The operational difference", body: [{ t: "p", text: "An anomaly is a one-off: page someone, exclude the point from training, add a regressor if it has a name. A changepoint means the model's assumptions have expired: retrain, or truncate the training window to start after the break, or add a step regressor — and until you do, the forecasts stay wrong by roughly the size of the change (10.3 measured +22.8 of bias for months after this shift with an expanding window). The CUSUM alarm four days after 1 September is the signal that should trigger that retraining, and the adaptive interval's doubling in 10.7 is the same signal seen from the uncertainty side." }] },

    { t: "ladder",
      title: "Forecasting several related series that must add up",
      rungs: [
        { level: "bad", label: "Forecast the total and the stores separately, publish both", code: `for node in [total, A, B, C]: forecast[node] = model(node).predict(28)`,
          note: "**A + B + C − T was 3.1 on average; the planner will make them add up in a spreadsheet, and the total's forecast (the noisiest of the four) will win the argument.**" },
        { level: "ok", label: "Bottom-up: forecast the stores, sum them", code: `forecast[total] = forecast[A] + forecast[B] + forecast[C]`,
          note: "Coherent, and here the best total (33.76) because the store models were good. It discards the total's forecast, which on a hierarchy with noisy leaves (thousands of products) is the accurate one." },
        { level: "best", label: "Forecast every node, reconcile with MinT, report accuracy per level", code: `b = inv(S.T @ Winv @ S) @ S.T @ Winv @ y_hat     # W from the base forecasts' backtest error covariance
y_tilde = S @ b                                 # coherent; nothing discarded; noisy nodes pulled hardest
report MAE per level vs base and vs bottom-up`,
          note: "Uses all the information, weights it by demonstrated accuracy, produces a coherent set by construction, and the per-level report shows where the reconciliation helped and where it cost." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "x 'Granger-causes' y at p = 10⁻¹²¹ in a system where a third series drives x one day before it drives y and x and y are otherwise unrelated. What does the test establish?",
          options: [
            "That x causes y",
            "That x's past improves the prediction of y beyond y's own past — predictive precedence — which a common driver with different lags produces exactly as a causal link would",
            "That the series are cointegrated",
            "Nothing, because p is too small to be real"
          ],
          answer: 1,
          why: "The F-test compares two regressions and cannot distinguish 'x moves y' from 'z moves x, then z moves y'. Granger causality is useful as a screen for whether a series is worth including in a VAR, and as a claim about causation it is exactly as strong as any other correlation."
        },
        {
          stem: "Why did the VECM forecast the spot–futures spread better than a VAR on differences?",
          options: [
            "Because it has more lags",
            "Because the two series are cointegrated — their spread is stationary — and the VECM keeps an error-correction term (coefficient −0.745) that pulls spot back toward futures − 2; differencing both series removes the level information that term uses",
            "Because the VAR was over-fitted",
            "Because futures are known in advance"
          ],
          answer: 1,
          why: "Each series is a random walk, so the levels are non-stationary; but the combination futures − spot − 2 is stationary, and that is a forecastable quantity a model in differences cannot represent. Johansen's trace statistic of 214.6 against a critical 15.5 is the test; the VECM's 0.617 against 0.669 on the spread is the consequence."
        },
        {
          stem: "OLS reconciliation moved the total down 3.75 and each of three stores up 3.75 for a 15-unit disagreement. What would MinT do differently?",
          options: [
            "Move the total only",
            "Split the disagreement according to the base forecasts' error variances: with variances 25, 9, 4, 4 the noisy total absorbed most of it (down 8.9) and the precise stores little — nothing is discarded, but the trust is proportional to demonstrated accuracy",
            "Move the stores only",
            "The same as OLS, since the sum constraint is the same"
          ],
          answer: 1,
          why: "OLS is MinT with equal variances. The weighting is the whole idea: on the store data the total's model had an error variance of 1,300 against 144 to 453 for the stores, so MinT (34.14 on the total) landed near bottom-up (33.76), which is what the variances said to do, without discarding the total's forecast."
        },
        {
          stem: "On the simulated spare part the all-zero forecast has the lowest MAE. Why is it the wrong choice, and what metric shows that?",
          options: [
            "It is the right choice — lowest MAE wins",
            "It forecasts 0 units against 140 actually demanded over the window and carries a bias of +1.40 per period; RMSSE (1.005 against 0.886 for Croston), bias and the window total show it, because a stock policy needs the rate, not a guess at each day",
            "MAPE shows it",
            "It has the highest RMSE only because of outliers"
          ],
          answer: 1,
          why: "With demand on one day in four, predicting zero is correct 75 % of the time and useless for ordering. MAE optimises the median, which is zero; MAPE is undefined on the zero days. The M5 competition scored intermittent series with RMSSE for this reason, and a planner reads the bias and the total."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "Reconciliation by hand, Croston by hand, and CUSUM's run lengths",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Base forecasts: Total 500; stores A 200, B 180, C 150. Reconcile by OLS by hand (S′ŷ, then b̃), state how the 30-unit disagreement was split, and then by MinT with error variances (100, 4, 4, 4) — what share of the disagreement does the total absorb?" },
        { t: "p", text: "**(b)** Demand 0, 3, 0, 0, 0, 6, 0, 2, 0, 0, 5 with α = 0.3: iterate Croston, give the SBA forecast, the series mean, and the ADI/CV² classification." },
        { t: "p", text: "**(c)** Simulate 2,000 runs of 600 N(0,1) points with a +1σ shift at t = 300 and run CUSUM with (threshold, drift) = (5, 0.5), (8, 0.5), (8, 1.0), (4, 0.25). Report the false-alarm rate before t = 300 and the median and 90th-percentile detection delay. Then run CUSUM (8, 0.5) on ∇₇ log sales of stores A and B, which have no built-in shift, and interpret the alarms." }
      ],
      requirements: [
        "(a) the OLS vector and total, the split, the MinT vector and share.",
        "(b) four update rows, three forecasts, the classification.",
        "(c) a four-row table and the store alarms with an interpretation."
      ],
      hint: "(a) With equal variances OLS gives a quarter of the discrepancy to each of the four nodes. (b) The gap q counts periods since the last demand, including the current one. (c) Lower thresholds catch faster and cry wolf more.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) stores sum to 530 against a total of 500: discrepancy +30
#     S'ŷ = [700, 680, 650];  b̃ = (S'S)⁻¹ S'ŷ = [192.5, 172.5, 142.5];  total 507.50
#     each store moved −7.5, the total moved +7.5: a quarter of the discrepancy to each of the four nodes
#     MinT, variances (100, 4, 4, 4): b̃ = [198.93, 178.93, 148.93], total 526.79 -- the total, 25× noisier, absorbs 89 % of the discrepancy

# (b) t=2: initialise z = 3, p = 2, forecast 1.5000
#     t=6:  z = 0.3·6 + 0.7·3.0 = 3.9000;  p = 0.3·4 + 0.7·2.0 = 2.6000;  forecast 1.5000
#     t=8:  z = 0.3·2 + 0.7·3.9 = 3.3300;  p = 0.3·2 + 0.7·2.6 = 2.4200;  forecast 1.3760
#     t=11: z = 0.3·5 + 0.7·3.33 = 3.8310; p = 0.3·3 + 0.7·2.42 = 2.5940; forecast 1.4769
#     Croston 1.4769;  SBA 0.85 × 1.4769 = 1.2553;  mean 1.4545;  ADI 11/4 = 2.75 (> 1.32), CV² 0.21 (< 0.49) -> intermittent

# (c) threshold, drift     false alarm before t = 300    median delay    90th pct delay
#     5, 0.5                     47.5 %                       8               16
#     8, 0.5                      3.1 %                      13               25
#     8, 1.0                      0.0 %                      62              167      <- a drift equal to the shift barely accumulates
#     4, 0.25                   100.0 %                      no run survived to the shift
#     store A: one alarm, 2 Jan 2024 (down);  store B: 23 Dec 2023 (up), 5 Jan 2024 (down), 1 Jan 2025 (down)
#     -> the Christmas week and the New Year closure: known events that the seasonal-naive residual does not remove.
#        Regress the calendar out first (10.5), or expect and suppress alarms on known dates.`,
        notes: [
          { t: "p", text: "(a) makes the weighting concrete: OLS is MinT with equal variances, and unequal variances move the disagreement to where the uncertainty is." },
          { t: "p", text: "(b) is the recursion once more, and the classification that decides whether Croston is even the right family." },
          { t: "p", text: "(c) is the trade-off every online detector has: the threshold buys false-alarm rate with delay, the drift sets the smallest shift worth catching, and known events must be removed or the detector will find them." }
        ]
      }
    }
  ],

  takeaways: [
    "A VAR regresses each series on every series' past (k²p coefficients) and recovered a built-in two-day lead; Granger causality is a predictive-precedence F-test that a common driver fools completely — a screen for a VAR, not a causal claim.",
    "Cointegrated series are individually random walks with a stationary combination; differencing destroys the tie, and a VECM's error-correction term (−0.745 here) keeps it, forecasting both the level and the spread better than a VAR on differences.",
    "Reconciliation makes hierarchical forecasts add up: bottom-up and top-down discard a level, OLS projects with b̃ = (SᵀS)⁻¹Sᵀŷ (a 15-unit disagreement split a quarter to each node), and MinT weights by error variance so the noisy total absorbed most of it; on the stores the store models were the accurate ones and bottom-up and MinT agreed.",
    "Intermittent demand is forecast as a rate: Croston smooths the demand size and interval only on demand days (1.2857 per period on the worked series), SBA removes its bias, TSB notices obsolescence; score with RMSSE, bias and window totals, because MAE ranks the all-zero forecast first.",
    "GARCH(1,1) models the clustering of variance (fitted α + β = 0.946); a constant-σ interval covered 79 % of the most volatile decile at a nominal 90 %, the GARCH interval 91 %.",
    "CUSUM on a stationary residual found the level shift four days after it happened with no false alarms in 602 days; on the level it alarmed nineteen times first, and the residual route never saw the shift at all — a changepoint is not an anomaly, and its response is retraining."
  ],

  quiz: {
    title: "Multivariate, Hierarchical, Intermittent and Volatile Series — Knowledge Check",
    questions: [
      {
        stem: "A marketing team wants to include next month's web traffic in a VAR with sales. Is a VAR the right tool?",
        options: [
          "Yes — VAR handles multiple series",
          "No — a VAR forecasts traffic and sales jointly from their own past, so it adds a second forecasting problem; if traffic will be known in advance, use it as an exogenous regressor (SARIMAX or boosting); if it will not, 10.5 showed the honest version is worse than no regressor",
          "Yes, provided the series are differenced",
          "No — VAR only works for two series"
        ],
        answer: 1,
        why: "The practical hierarchy: known-future series go into X; series known only up to now that genuinely lead can justify a VAR's k²p parameters; the decision is made by a Granger screen and then a backtest. Next month's traffic is not known now, and a VAR would forecast it with its own error."
      },
      {
        stem: "Two commodity prices are each a random walk and their ratio has been stable for a decade. A colleague differences both and fits a VAR. What has been lost?",
        options: [
          "Nothing — differencing is required for stationarity",
          "The cointegrating relationship: the log-ratio is stationary and mean-reverting, and a VECM's error-correction term would use departures from it to forecast both series, which a model in differences cannot see",
          "The seasonality",
          "The trend"
        ],
        answer: 1,
        why: "Differencing is the right move for a single unit-root series; for a cointegrated pair it throws away the one stationary, forecastable quantity. Johansen's test decides the rank, and the executed VECM beat the VAR-in-differences on both the level and the spread."
      },
      {
        stem: "Why is top-down reconciliation the worst method at the store level in the executed comparison (24.75 versus 22.36 for store A)?",
        options: [
          "Because the total's forecast was too high",
          "Because top-down replaces each store's own forecast — which carries the store's dynamics, including store C's level shift — with a fixed share of the total's forecast, so every store inherits the total's error and loses its own information",
          "Because the proportions were computed on the test period",
          "Because top-down is not coherent"
        ],
        answer: 1,
        why: "Top-down is coherent by construction and cheap, and it is right when the leaves are too noisy to model — thousands of low-volume products — and wrong when the leaves have structure of their own. Store C's post-shift level is exactly what a historical proportion cannot know. MinT uses the leaf forecasts and the total's, weighted by their errors."
      },
      {
        stem: "A GARCH fit on daily returns gives α = 0.05 and β = 0.96. What does α + β = 1.01 mean?",
        options: [
          "A very persistent, well-behaved volatility",
          "The variance process is non-stationary: shocks never decay, the long-run variance ω/(1 − α − β) is undefined, and the fit should be constrained (IGARCH) or the sample re-examined for a structural break in volatility",
          "The model is over-fitted",
          "Nothing unusual — α + β is often above 1"
        ],
        answer: 1,
        why: "Real markets show α + β of 0.95 to 0.99 — high persistence with mean reversion. At or above 1 the unconditional variance does not exist and multi-step variance forecasts grow without bound. A break in the volatility regime (a crisis in the sample) often produces this; the executed simulation with α + β = 0.95 was recovered at 0.946."
      },
      {
        stem: "CUSUM on the deseasonalised level of store C alarmed nineteen times before the real changepoint. What was the error and the fix?",
        options: [
          "The threshold was too high",
          "The input was not stationary: the yearly cycle and the slow trend accumulate like a shift; detect on a residual that is stationary before the change — the seasonal-naive residual gave zero false alarms and caught the shift in four days",
          "CUSUM cannot be used on daily data",
          "The drift should have been negative"
        ],
        answer: 1,
        why: "CUSUM assumes the reference distribution is constant until the change; a slow drift violates that and accumulates steadily. The same principle as 9.4's outlier rule on seasonal data: the detector must see a series whose 'normal' is actually stable, which means a model residual, not the raw level."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Multivariate, Hierarchical, Intermittent and Volatile Series",
    sub: "Five specialised problems and the standard answer to each.",
    questions: [
      {
        level: "Core",
        q: "What does 'x Granger-causes y' mean, and what does it not mean?",
        strong: "It means the past of x improves the prediction of y beyond what y's own past provides — an F-test comparing y regressed on its own lags against y regressed on its own lags plus x's lags, on stationary series. It does not mean x causes y. A common driver that moves x one day before it moves y gives the same result: I built exactly that — z drives x at lag 1 and y at lag 2, x and y never interact — and the test reported x Granger-causes y at p = 10⁻¹²¹. It is predictive precedence, a screen for whether a series is worth including in a VAR, and on the stores it correctly found that store B's past does not help store A beyond the calendar they share. Two further cautions: on non-stationary series it tests common trends, and with enough lags and series it finds something by chance.",
        answer: [
          { t: "p", text: "The definition as an F-test, the executed confounder, its role as a screen, and the two cautions." }
        ]
      },
      {
        level: "Core",
        q: "Explain Croston's method and how you would evaluate it.",
        strong: "Intermittent demand is mostly zeros, so the mean is the wrong target; Croston forecasts how much when it happens and how often, and divides. Two exponentially smoothed quantities, updated only in periods with demand: the demand size z and the interval p since the last demand, each z ← αd + (1 − α)z, p ← αq + (1 − α)p; the forecast is z/p per period, a rate. On 0, 0, 0, 4, 0, 0, 7, 0, 0, 0, 2, 0, 6 with α = 0.2 it iterates to 1.2857; the SBA correction (1 − α/2) removes Croston's upward bias to 1.1571; TSB updates the demand probability every period so a dying part is noticed. Evaluation cannot use MAE or MAPE: on a simulated part the all-zero forecast had the best MAE because zero is right three days in four, and MAPE is undefined there. I score with RMSSE, bias, and totals over the ordering window — Croston forecast 133 against 140 actual with a bias of 0.07, the zero forecast 0 with a bias of 1.4. And I classify first: ADI above 1.32 and CV² below 0.49 is intermittent, above is lumpy, and smooth series should not use Croston at all.",
        answer: [
          { t: "p", text: "The two smoothers, the worked numbers, SBA and TSB, the MAE trap with executed values, the right metrics, and the classification." }
        ]
      },
      {
        level: "Senior",
        q: "Forecasts for a product hierarchy do not add up. What do you do?",
        strong: "Reconcile, and never by hand. Base forecasts at every node — total, regions, stores, products — are different models and disagree; the options are bottom-up (sum the leaves, discard the aggregate forecasts), top-down (split the total by historical proportions, discard the leaf forecasts), or optimal reconciliation, which projects the whole vector onto the coherent space: b̃ = (SᵀW⁻¹S)⁻¹SᵀW⁻¹ŷ with S the summing matrix and W the covariance of the base forecast errors. With W = I that is OLS, which on a worked example split a 15-unit disagreement a quarter to each of four nodes; MinT uses the errors from the backtest, so noisy nodes are pulled hardest — the total with variance 1,300 against stores at 144 to 453 on my data, where MinT landed near bottom-up because the store models were the accurate ones. I report accuracy per level before and after, because reconciliation can cost a level while helping another; I use the shrinkage estimator of W for large hierarchies; and I make sure the proportions and the covariance come from training-period data, which is leak 12 in 10.3's catalogue.",
        answer: [
          { t: "p", text: "The three approaches and what each discards, the MinT formula with the worked and executed numbers, per-level reporting, and the leakage caution." }
        ]
      },
      {
        level: "Senior",
        q: "What does a GARCH model add to a forecasting system, and when would you use one?",
        strong: "A model of the variance rather than the mean. Financial returns have an unpredictable mean — the executed return ACF was 0.05 at lag 1 — and a predictable variance: the squared-return ACF was 0.10 to 0.12, the signature of volatility clustering. GARCH(1,1) writes today's variance as ω + α·(yesterday's shock)² + β·(yesterday's variance); α is reaction, β is memory, α + β is persistence, typically 0.95 to 0.99, and ω/(1 − α − β) the long-run variance. Fitted to a simulated series with α + β = 0.95 it recovered 0.946. Its uses are Value at Risk, position sizing, option pricing, and — for a forecaster — intervals whose width moves with the conditional variance: a constant-σ 90 % band covered 79 % of the most volatile decile, the GARCH band 91 %. I would use it wherever the residual variance of a forecast clusters in time, which is finance first and energy, traffic and web load after that, and I would reach for the t or skew-t error and the GJR asymmetry as soon as the residual diagnostics showed fat tails or a leverage effect.",
        answer: [
          { t: "p", text: "Variance not mean, the executed ACF evidence, the equation and parameter meanings, the recovered fit, the interval application, and the domains." }
        ]
      },
      {
        level: "Staff",
        q: "Design the monitoring that tells a forecasting system its assumptions have expired.",
        strong: "Two detectors for two different failures, both on residuals. For anomalies — one bad day — the residual route: a forecast, its residual, a robust z-score on the STL residual; 67 flags on store C, all events and closures, which get a page and a regressor, not a retrain. For changepoints — the process moved — CUSUM on a residual that is stationary before the change: standardise on a reference window, accumulate deviations above a drift allowance, alarm at a threshold. The input matters more than the tuning: on store C's seasonal-naive residual, threshold 8 and drift 0.5σ gave zero false alarms in 602 days and an alarm four days after the refurbishment; on the deseasonalised level the same detector fired nineteen times before the change, because a yearly cycle and a slow trend accumulate like shifts. The threshold and drift set a trade-off I would quantify by simulation — at threshold 5 a stationary series false-alarms in 47 % of 300-day runs and catches a 1σ shift in 8 days; at 8 the rate is 3 % and the delay 13 — and choose from the cost of a missed regime against the cost of an unnecessary retrain. Known events go in as regressors first, or the detector will find Christmas every year, as it did on stores A and B. The alarm's action is the point: a changepoint truncates the training window or adds a step regressor and triggers a refit, because until then the forecast stays wrong by the size of the change — 22.8 units of bias for months in 10.3 — and the interval monitor of 10.7, which doubled its width after the same shift, is the same signal from the other side.",
        answer: [
          { t: "p", text: "Two detectors on residuals, the executed input comparison, the quantified threshold trade-off, known events first, and the action an alarm triggers with the cost of not taking it." }
        ]
      }
    ]
  }
});

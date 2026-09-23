/* ============================================================================
   LESSON 10.3 — Baselines, Backtesting and Forecast Metrics
   ========================================================================= */
EC.receiveLesson({
  id: "10.3",

  lede: "**Four one-line forecasters are so hard to beat on real data that any model which does not beat them is not a model, and the only way to know is to run them first, on a backtest that recreates the forecasting moment, scored with a metric that answers the business question.** On the twelve quarterly numbers the naive forecast wins with an MAE of 5.25, the seasonal naive misses by exactly 6.0 at every step — the trend — and adding the trend back gives an error of zero. On the store's daily sales, over 20 rolling origins and a 28-day horizon, the seasonal naive averaged over four weeks scores 26.9 against the plain naive's 53.4, and a gradient-boosting model tuned in 10.6 will have to beat 26.9 to justify its existence. A same-weekday model with an expanding window carries a +22.8 bias for months after store C's level shift; a four-week sliding window carries +3.3. A rolling feature built without a shift lets a linear regression score an MAE of 0.0000 while the same leak inside a boosting model shows as a plausible 20.9. The metrics are worked on five numbers, and MAPE is shown to score the same 15-unit miss at 150 % or 60 % depending only on which number is the actual. Twenty-four random configurations chosen on the reported folds, and TimeSeriesSplit's gap, close the lesson.",

  objectives: [
    "Compute the naive, seasonal naive, drift and mean forecasts and explain when each wins",
    "Build a rolling-origin backtest that refits at every origin, choose expanding versus sliding windows, and report per-horizon error with a spread",
    "Explain why a gap between training and test is needed for rolling features and pipeline latency, and set it",
    "Compute ME, MAE, RMSE, MAPE, sMAPE, WAPE and MASE by hand and choose among them for a given decision",
    "Recognise the twelve time-series leaks and apply the one question that catches most of them"
  ],

  prerequisites: ["10.1", "2.4", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "Four baselines", id: "baselines" },

    { t: "table", head: ["Baseline", "Forecast for T + h", "Right when"], rows: [
      ["Naive", "y_T — the last value, repeated", "a random walk; finance; anything near a unit root"],
      ["Seasonal naive", "y_{T+h−m} — the value one season ago", "a strong, stable season: the default retail baseline"],
      ["Drift", "y_T + h · (y_T − y_1)/(T − 1) — the last value plus the average historical slope", "a steady trend and no season"],
      ["Mean", "ȳ — the training mean", "a genuinely stationary series with no trend"]
    ] },

    { t: "code", lang: "text", title: "The twelve numbers: train on quarters 1–8, forecast 9–12 (executed; actuals 40.5, 46.0, 42.5, 54.0)",
      code: `naive            48.0  48.0  48.0  48.0       errors −7.5  −2.0  −5.5  +6.0     MAE 5.250
seasonal naive   34.5  40.0  36.5  48.0       errors +6.0  +6.0  +6.0  +6.0     MAE 6.000   <- every error is the four-quarter trend
mean             36.75 × 4                    errors +3.75 +9.25 +5.75 +17.25   MAE 9.000
drift            50.79 53.57 56.36 59.14      errors −10.3 −7.6  −13.9 −5.1     MAE 9.214   slope (48 − 28.5)/7 = 2.786: the season inflates it

seasonal naive + the trend it missed (y_{t−4} + 6):   MAE 0.000`,
      caption: "Naive wins because the series trends and the last value is nearer the future than a value four quarters stale; the seasonal naive's errors are all exactly +6.0, which is the trend it does not model, and the drift's slope is corrupted by the season (the first and last values are a Q1 and a Q4). Which baseline wins is an empirical question about the series, and the answer here is not the answer on a daily retail series." },

    { t: "code", lang: "python", title: "The store: five baselines over 20 rolling origins, 28 days ahead (executed, store A)",
      code: `origins = [len(y) - 28 - 13 * k for k in range(19, -1, -1)]      # 13-day steps so the origin weekday rotates
#  baseline                            MAE     bias     h=1     h=7    h=28    fold-to-fold sd of MAE
#  naive                              53.35   −5.00   45.08   29.58   26.45      26.86
#  seasonal naive (m = 7)             31.25   +0.22   28.33   29.58   26.45      11.83
#  seasonal naive, mean of 4 weeks    26.88   +4.95   17.88   24.65   18.70       6.75    <- the number to beat
#  drift                              54.11   −9.68   45.09   29.98   27.70      29.20
#  mean                               42.40  +13.98   36.18   43.59   34.89      10.54`,
      caption: "On a weekly-seasonal series the naive forecast is wrong by a weekday most of the time, and the mean is a month stale. Averaging four same-weekday values cuts the seasonal naive's error by 14 % and its fold-to-fold spread by nearly half, because it averages the noise out of a single stale week. At h = 7 and h = 28 the naive and seasonal naive coincide: one season back from a multiple of seven is the last value." },

    { t: "callout", kind: "mental", title: "The baseline is the denominator", body: [{ t: "p", text: "Every metric that compares across series (MASE, §05) divides by the in-sample error of a naive or seasonal-naive forecast, and every forecast-value-added review (10.9) asks how much each step of the pipeline improved on it. Compute the baselines first, on the same backtest, at the same horizon, and keep the number: a model with a 28-day MAE of 24 is a 10 % improvement on 26.9 at store A, which may or may not be worth its cost, and that is the only frame in which the 24 means anything." }] },

    { t: "h2", n: "02", text: "Rolling-origin backtesting", id: "backtesting" },

    { t: "p", text: "A backtest simulates what you would have known at each decision point: fix an origin, fit on everything before it, forecast h steps, score, move the origin forward, repeat. Every forecast is made with only prior data; every origin is a sample of the error, and the spread across origins is as much a result as the mean. Two choices define the scheme. The **window** is expanding (train on all history; right when the process is stable) or sliding (a fixed length that moves; right after a regime change, when recent data is more relevant and old data dilutes the fit). The **step** between origins trades the number of folds against their overlap." },

    { t: "viz",
      title: "Rolling origin: twelve points, initial training length six, horizon two",
      caption: "Five origins, ten forecasts, every one made with only prior data. The training set expands by one at each step; a sliding window would drop the earliest point as it added the newest.",
      svg: `<svg viewBox="0 0 700 230" role="img" aria-label="Five rows of twelve cells. In each row the training cells run from 1 to 6 plus the row number, followed by two test cells; the training block grows by one cell per row.">
  <g font-size="11" fill="var(--ink-3)" font-family="ui-monospace, monospace">
    <text x="128" y="26">1</text><text x="168" y="26">2</text><text x="208" y="26">3</text><text x="248" y="26">4</text><text x="288" y="26">5</text><text x="328" y="26">6</text><text x="368" y="26">7</text><text x="408" y="26">8</text><text x="448" y="26">9</text><text x="484" y="26">10</text><text x="524" y="26">11</text><text x="564" y="26">12</text>
  </g>
  <g font-size="12" fill="var(--ink-2)" font-family="ui-sans-serif, system-ui, sans-serif">
    <text x="20" y="52">origin 6</text><text x="20" y="84">origin 7</text><text x="20" y="116">origin 8</text><text x="20" y="148">origin 9</text><text x="20" y="180">origin 10</text>
  </g>
  <g fill="var(--accent)" opacity="0.85">
    <rect x="120" y="36" width="238" height="22" rx="3"/><rect x="120" y="68" width="278" height="22" rx="3"/><rect x="120" y="100" width="318" height="22" rx="3"/><rect x="120" y="132" width="358" height="22" rx="3"/><rect x="120" y="164" width="398" height="22" rx="3"/>
  </g>
  <g fill="var(--good)">
    <rect x="362" y="36" width="76" height="22" rx="3"/><rect x="402" y="68" width="76" height="22" rx="3"/><rect x="442" y="100" width="76" height="22" rx="3"/><rect x="482" y="132" width="76" height="22" rx="3"/><rect x="522" y="164" width="76" height="22" rx="3"/>
  </g>
  <g font-size="12" font-family="ui-sans-serif, system-ui, sans-serif">
    <rect x="120" y="204" width="14" height="14" fill="var(--accent)" opacity="0.85"/><text x="140" y="216" fill="var(--ink-2)">train (expanding)</text>
    <rect x="280" y="204" width="14" height="14" fill="var(--good)"/><text x="300" y="216" fill="var(--ink-2)">test: h = 1, 2</text>
    <text x="420" y="216" fill="var(--ink-3)">5 origins · 10 forecasts · none uses the future</text>
  </g>
</svg>` },

    { t: "code", lang: "python", title: "A backtest that refits, and the expanding-versus-sliding choice on store C's level shift (executed, 40 origins, h = 28)",
      code: `def backtest(y, fit_predict, origins, h):
    rows = []
    for o in origins:                               # refit on EVERY origin -- if that is too slow, so is your retraining cadence
        fc = fit_predict(y[:o], h); act = y[o:o + h]
        rows += [(o, i + 1, act[i], fc[i]) for i in range(h)]
    return DataFrame(rows, columns=["origin", "h", "actual", "forecast"])

# a same-weekday mean model on store C, which gained +30 on 1 September 2024
#  window                    MAE     origins before the shift   origins after (bias)
#  expanding, all history   17.99         10.52                  24.11  (+22.76)     <- the old level drags the forecast down for months
#  sliding, 8 weeks         11.59          8.78                  13.88  (+5.09)
#  sliding, 4 weeks         11.56          8.83                  13.80  (+3.33)`,
      caption: "After a regime change the expanding window is not merely worse, it is biased: it forecasts the old level and is 23 units low on average for every origin after the shift. Before the shift the sliding windows are also better, because the store's slow yearly cycle makes last month a better guide than last year. The choice is a hyperparameter of the backtest, and the backtest is what chooses it." },

    { t: "dl", items: [
      ["Refit the model at every origin", "Otherwise you are scoring a model that has seen the test period; and if refitting is too slow to do in the backtest, the retraining cadence in production is also too slow, which is worth knowing now."],
      ["Refit all preprocessing too", "A scaler, encoder or imputer fitted on the whole series carries the test period's mean into training. Fit inside the fold."],
      ["Use the production horizon", "A one-step backtest says nothing about a 28-day product; report per horizon, because the error at h = 1 (17.9) and h = 28 (18.7) are different quantities."],
      ["Use enough origins", "One split is one sample of a noisy quantity; the fold-to-fold sd of the seasonal naive's MAE was 11.8. Twenty origins is a floor, and report the spread."],
      ["Hold out a final untouched block", "The rolling folds get used for tuning and are no longer clean (§06)."]
    ] },

    { t: "h2", n: "03", text: "The gap", id: "gap" },

    { t: "p", text: "A fold boundary is porous whenever a feature is built from a window. If the model uses a 7-day rolling mean, the first test row's feature was computed from the last seven training rows — mild, and honest if the feature is shifted. If the rolling mean is *not* shifted, the target is inside its own feature. And if production receives yesterday's data three days late, then at forecast time `lag_1` does not exist and a model that used it in the backtest will be fed a stale or missing value in use. A **gap** (embargo) of at least the longest feature window plus the data latency between the end of training and the start of test fixes the first; features that respect the latency fix the second." },

    { t: "code", lang: "python", title: "A rolling feature that contains its own target (executed, store A, 8 folds × 28 days)",
      code: `r7 = sales.rolling(7).mean()             # NOT shifted: r7[t] = (y[t] + y[t−1] + ... + y[t−6]) / 7  -- y[t] is the target
X  = [lag1 ... lag6, lag7, lag14, lag21, lag28, r7, weekday, t, promo]    # so y[t] = 7·r7 − (lag1 + ... + lag6), exactly

#  feature set                                     boosting MAE    linear regression MAE
#  rolling(7) unshifted + lags 1-6                    20.85              0.0000        <- the leak, fully exploited by a linear model
#  shift(1).rolling(7) + lags >= 1                    22.32             23.57          <- honest
#  3-day latency: lags >= 3, shift(3).rolling(7)      23.18             23.61          <- what production can actually compute`,
      caption: "The linear model reconstructs the target exactly and reports zero error. The boosting model cannot represent the linear identity across seven features and shows a plausible 20.9 — a leak that improves the score by 7 % and would never be noticed. This is the reason for the one question: at the moment the forecast is made, would this exact number have been available? An unshifted rolling mean fails it; so does lag 1 under a three-day latency, which here costs 0.9 units of MAE once the features are honest." },

    { t: "code", lang: "python", title: "TimeSeriesSplit with a gap (executed on the 911-day series)",
      code: `tscv = TimeSeriesSplit(n_splits=5, test_size=28, gap=g)
for train, test in tscv.split(X):
    assert X.index[train].max() < X.index[test].min()          # cheap, catches real bugs

#  gap    first fold: train ends / test starts    test rows whose 28-day feature window reaches into training
#   0            771 / 772                                    140 of 140
#   7            764 / 772                                    105 of 140
#  28            743 / 772                                      0 of 140     <- gap >= the longest window`,
      caption: "The gap must cover the longest feature window and the data latency. With a 28-day rolling feature and no gap, every test row's window overlaps training; only a gap of 28 makes the folds disjoint in the sense that matters." },

    { t: "h2", n: "04", text: "Metrics, worked on five numbers", id: "metrics" },

    { t: "code", lang: "text", title: "Every metric on one example (executed)",
      code: `actual     120   80  100   90  110       sum 500
forecast   110   90   95  100  105
e = a − f  +10  −10   +5  −10   +5       sum   0        |e|  10 10 5 10 5   sum 40        e²  100 100 25 100 25   sum 350

ME (bias)  =  0/5              =  0.00      the forecast is not systematically high or low
MAE        = 40/5              =  8.00      in the data's units; optimised by the MEDIAN forecast
MSE        = 350/5             = 70.00
RMSE       = √70               =  8.3666    punishes the 10s more than the 5s; optimised by the MEAN forecast
MAPE       = mean(10/120, 10/80, 5/100, 10/90, 5/110) = mean(0.0833, 0.1250, 0.0500, 0.1111, 0.0455) = 8.298 %
sMAPE      = mean(2|e| / (|a| + |f|))  = mean(0.0870, 0.1176, 0.0513, 0.1053, 0.0465)              = 8.153 %
WAPE       = 100 · 40 / 500                                                                          = 8.000 %
MASE       = MAE / (in-sample naive MAE of the training series 95 105 88 112 100 90 115 85 = 18.286) = 0.4375`,
      caption: "The bias is the number reviews forget to print: here it is zero, but the store's plain naive carried −5.0 and its mean +14.0, and for an inventory decision the direction is the whole conversation. MASE below 1 means better than the naive forecast would have been in-sample; the scale is computed once from the training data and reused." },

    { t: "table", head: ["Metric", "Scale", "Punishes", "Breaks when", "Use for"], rows: [
      ["MAE", "units", "errors linearly", "—", "the default; the median forecast minimises it"],
      ["RMSE", "units", "large errors quadratically", "outliers dominate", "when big misses cost disproportionately; the mean forecast minimises it"],
      ["MAPE", "%", "over-forecasts more than under (§05)", "any actual is 0 or small", "never on intermittent or low-volume data"],
      ["sMAPE", "%", "still asymmetric; a miss at actual 0 scores 200 %", "both near zero", "legacy comparisons only"],
      ["WAPE", "%", "errors weighted by volume", "the total is zero", "one number across products of different sizes; what the business reads"],
      ["MASE", "ratio", "relative to the naive or seasonal-naive in-sample error", "the scale is 0 (a constant series)", "comparing across series; always defined"],
      ["RMSSE", "ratio", "as MASE, squared", "as MASE", "the M5 competition metric"],
      ["Pinball, CRPS", "loss", "miscalibrated quantiles and distributions", "—", "probabilistic forecasts (10.7)"]
    ] },

    { t: "h2", n: "05", text: "The MAPE trap, and the metric for the job", id: "mape" },

    { t: "code", lang: "text", title: "The same miss, four scores (executed)",
      code: `actual  forecast   |e|    APE
 100       60       40    40.0 %
 100      140       40    40.0 %       symmetric when the actual is fixed...
  10       25       15   150.0 %
  25       10       15    60.0 %       ...and not when the actual changes: the same 15-unit miss scores 150 % or 60 % by which number is the actual

on the store backtest (seasonal naive, 4-week mean, 20 origins × 28 days):
                              MAE      MAPE     sMAPE     WAPE     bias
  forecast − 30 (under)      40.69   16.01 %   19.36 %  17.10 %   +34.95
  forecast as is             26.88   10.55 %   12.16 %  11.30 %    +4.95
  forecast + 30 (over)       35.30   15.17 %   15.22 %  14.84 %   −25.05
  4 closed days (actual 0) in the windows: MAPE undefined there, computed on the other 556 rows`,
      caption: "Dividing by the actual makes a miss on a small day count for more, and a forecast can never be more than 100 % too low but can be unboundedly too high — so MAPE rewards under-forecasting on low-volume days and punishes it on high-volume ones, in proportions that depend on the series, not the decision. Optimise it and you ship a model that runs out of stock on the days that matter. Here the −30 forecast has the larger MAE and WAPE; MAPE ranks the two shifted forecasts within a point of each other." },

    { t: "code", lang: "python", title: "MASE across the three stores (executed; seasonal naive, 4-week mean, h = 28)",
      code: `#  store   level    MAE    WAPE     seasonal-naive in-sample MAE (the scale)   MASE
#    A     228.7   26.88  11.30 %             26.62                               1.010
#    B     132.3   16.11  11.97 %             15.54                               1.036
#    C      92.2   13.38  12.21 %             10.52                               1.272     <- the level shift: the in-sample scale is from a calmer past`,
      caption: "MAE is not comparable across stores whose levels differ by 2.5×; WAPE and MASE are. MASE above 1 for a 28-day-ahead forecast against a 7-day in-sample scale is normal — the horizon is longer — and its meaning is relative: store C's 1.27 says the recent past was harder to forecast from its history than A's or B's, which is the level shift." },

    { t: "callout", kind: "production", title: "Report MASE for selection, WAPE for the business, bias beside both, and everything by horizon and segment", body: [{ t: "p", text: "MASE is scale-free, always defined and comparable across series, so it chooses the model. WAPE is a percentage weighted by volume, which is what a planner understands and what the P&L feels. Bias is a decision, not a detail. And a single aggregate hides the one place the model is failing: break every number down by horizon (h = 1 against h = 28), by weekday against weekend, and by the top products against the long tail, because that place is usually where the money is." }] },

    { t: "h2", n: "06", text: "The leakage catalogue", id: "leakage" },

    { t: "table", head: ["#", "Leak", "What it looks like", "Fix"], rows: [
      ["1", "Random train/test split", "99 % R² on a random walk (10.1: 22.3 vs 31.3)", "split by time, always"],
      ["2", "`rolling(7).mean()` without `shift(1)`", "MAE 0.0000 in a linear model; a plausible 7 % gain in a tree model", "shift first, then roll"],
      ["3", "Scaler fitted on the whole series", "the test mean is baked into training", "fit on train, transform test, inside each fold"],
      ["4", "`bfill()` on missing values", "a real day scored against a copy of itself (10.1)", "interpolate on the past only"],
      ["5", "Target encoding over all rows", "future category means leak in", "expanding-window encoding"],
      ["6", "An exogenous variable unknown at forecast time", "'yesterday's traffic' for a 30-day horizon", "only covariates known in advance (10.5)"],
      ["7", "Restated or revised data", "training on numbers corrected after the fact", "use the vintage as of each date"],
      ["8", "No gap for pipeline latency", "features that will not exist at run time", "gap = latency; lags ≥ latency"],
      ["9", "Feature selection over the full dataset", "the selection saw the test set", "select inside each fold"],
      ["10", "Hyperparameters tuned on the reported folds", "optimistic by the amount of tuning", "nested scheme, or a final untouched block"],
      ["11", "Outliers clipped or deduplicated globally", "a test outlier informed the training clip", "compute the clip on train only"],
      ["12", "Hierarchy reconciled with test-period proportions", "future proportions leak downward (10.8)", "proportions from train only"]
    ] },

    { t: "code", lang: "python", title: "Leak 10, measured (executed: 24 random boosting configurations on store A, 8 folds of 28 days)",
      code: `sel = MAE on folds 1-5 for each config;  rep = MAE on folds 6-8
best on folds 1-5:  22.40 there, 20.78 on folds 6-8;  the best config on 6-8 would have scored 20.69;  the median config 22.32
best on folds 6-8:  20.69 there, 24.20 on folds 1-5;  the best on 1-5 was 22.40
Spearman between the two rankings across the 24 configs: 0.78`,
      caption: "The number to report is the chosen configuration's score on folds it was not chosen on (20.78), never the folds that chose it. The winner's-curse gap is small here (0.09) because 24 configurations with a fairly stable ranking do not overfit the folds much; with hundreds of configurations, noisier folds or a smaller series it is the difference between a model that ships and one that does not." },

    { t: "callout", kind: "insight", title: "The one question", body: [{ t: "p", text: "For every feature column: at 09:00 on the day this forecast must be produced, would this exact number have been available to me? If the answer is no, or 'probably by then', it is a leak. Encode the answer as an assertion in the pipeline — `assert X_train.index.max() < X_test.index.min()`, `assert lag >= latency` — not as a comment. Every one of the twelve leaks has shipped somewhere, and every one produces the same symptom: a wonderful backtest and a model that adds no value." }] },

    { t: "ladder",
      title: "Evaluating a forecasting model",
      rungs: [
        { level: "bad", label: "One split, one number", code: `train, test = y[:-28], y[-28:]
model.fit(train); print("MAPE", mape(test, model.predict(28)))`,
          note: "**One origin is one sample of a quantity whose fold-to-fold sd was 12; MAPE is undefined on the closed days and rewards under-forecasting; and there is no baseline, so the number has no meaning.**" },
        { level: "ok", label: "Rolling origins, a baseline, MAE and bias", code: `rows = backtest(y, model, origins, h=28); base = backtest(y, snaive4, origins, h=28)
report(MAE, bias, per_h)                          # model 24.1 vs baseline 26.9`,
          note: "Honest and comparable. Still missing the gap for rolling features, the spread across origins, and a clean block for the final number if the folds were used to tune." },
        { level: "best", label: "Gap, refit inside folds, MASE and WAPE by horizon and segment, tuning folds separate from reporting folds", code: `tscv = TimeSeriesSplit(n_splits=20, test_size=28, gap=28)      # gap >= longest window + latency
tune on folds 1..k; report on k+1..20 and on the untouched final block
report(MASE, WAPE, bias, by=["h", "weekday", "store"], spread="sd across origins")`,
          note: "Each number answers a question a planner asks, each is comparable across stores and against the baseline, and none was computed with anything the forecaster would not have had." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "On the twelve numbers the seasonal naive's four errors were all exactly +6.0. What does that pattern say?",
          options: [
            "The seasonal naive is broken on quarterly data",
            "The seasonal pattern is captured perfectly and the entire error is the four-quarter trend the method ignores — adding it back gives zero error",
            "The series has no seasonality",
            "The training set was too short"
          ],
          answer: 1,
          why: "y_{t} − y_{t−4} is the constant 6 for this series (10.2), so a forecast of y_{t−4} misses by exactly that at every horizon. A constant error is a bias, and a bias is the cheapest thing to fix — which is why a baseline's bias is always printed next to its MAE."
        },
        {
          stem: "The unshifted rolling mean gave a linear regression an MAE of 0.0000 and a boosting model 20.85 against an honest 22.32. Which model is more dangerous?",
          options: [
            "The linear one — its error is zero",
            "The boosting one: its leak shows as a plausible 7 % improvement that would pass review and vanish in production, whereas an MAE of zero is obviously wrong",
            "Neither — both are fine if the backtest is rolling-origin",
            "The linear one, because it overfits"
          ],
          answer: 1,
          why: "A leak that produces an impossible score gets caught; a leak that produces a slightly-better score gets shipped. Trees cannot represent the exact linear identity y = 7·r7 − Σ lags, so they exploit the leak partially and the result looks like a good feature. The defence is the availability question asked of every column, not the plausibility of the score."
        },
        {
          stem: "Why did the expanding-window model carry a +22.8 bias after store C's level shift while the four-week sliding window carried +3.3?",
          options: [
            "The sliding window uses more recent noise",
            "The expanding window averages the old level into every forecast for months, so it forecasts too low by roughly the size of the shift; the sliding window forgets the old level within four weeks",
            "Expanding windows always have positive bias",
            "The shift was in the test set"
          ],
          answer: 1,
          why: "After a regime change, history before the change is not evidence about the present; a window that keeps it is systematically wrong in the direction of the old regime. Before the shift the sliding windows were also better (8.8 vs 10.5) because of the yearly cycle. The window length is chosen by the backtest, and a persistent bias in one direction is its signature."
        },
        {
          stem: "A planner asks for one percentage across 2,000 products of very different volumes. Which metric?",
          options: [
            "MAPE, averaged across products",
            "WAPE — total absolute error over total actual — because it weights each product by its volume, is defined when some days are zero, and is the percentage the P&L feels",
            "sMAPE, because it is symmetric",
            "RMSE, converted to a percentage of the mean"
          ],
          answer: 1,
          why: "MAPE averaged across products gives a slow-moving product with a 300 % error the same weight as the top seller, is undefined on zero days and rewards under-forecasting; WAPE is the error in units divided by the volume in units. For choosing between models across those products, MASE is the companion, because it is relative to each product's own naive error."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "Metrics by hand with a zero, a store-B backtest, and the gap measured",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** Actuals 40, 60, 50, 0, 30; forecasts 50, 50, 45, 5, 40; training series 42, 58, 47, 3, 35, 44, 61, 52, 2, 33 with season length 5. Compute ME, MAE, RMSE, MAPE (say what happens at t = 4), sMAPE (give the t = 4 term), WAPE, and MASE with the naive scale and with the seasonal-naive scale. Explain why the two MASE values differ by a factor of nine." },
        { t: "p", text: "**(b)** Backtest the naive, seasonal naive, four-week seasonal naive and drift on store B with h = 14 over 15 origins 13 days apart. Report MAE, MASE (seasonal-naive scale), bias, and MAE at h = 1, 7 and 14. Explain why two of the baselines coincide at h = 7 and h = 14." },
        { t: "p", text: "**(c)** With `TimeSeriesSplit(n_splits=5, test_size=28, gap=g)` for g = 0, 7, 28 on the 911-day series, count the test rows whose 28-day feature window reaches into the training set, and report the first fold's train end and test start." }
      ],
      requirements: [
        "(a) eight numbers and the explanation.",
        "(b) a four-row table and the coincidence explained.",
        "(c) three counts and three boundaries."
      ],
      hint: "(a) The training series has a strong period-5 pattern, so its seasonal-naive error is tiny. (b) One season back from h = 7 is the last value. (c) A window of 28 needs a gap of 28.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) e = −10 +10 +5 −5 −10;  ME −2.00 (over-forecasting);  MAE 8.00;  RMSE 8.3666
#     MAPE: undefined -- actual 0 at t = 4 (division by zero); on the other four points 21.250 %
#     sMAPE: 55.900 % -- the t = 4 term is 2·5/(0 + 5) = 200 %, the maximum, for a 5-unit miss; one zero dominates the metric
#     WAPE: 100 · 40 / 180 = 22.222 %
#     MASE, naive scale (m = 1): in-sample naive MAE 24.333 -> 0.3288     the training series swings by ~24 a step, so 8 looks excellent
#     MASE, seasonal scale (m = 5): in-sample seasonal-naive MAE 2.600 -> 3.0769   the series repeats every 5 steps almost exactly,
#     so 'one season ago' is a very good forecast and 8 is three times worse than it. The scale must match the baseline the
#     model is meant to beat -- on seasonal data, the seasonal one.

# (b) store B, h = 14, 15 origins;  seasonal-naive in-sample scale 15.81
#                                    MAE    MASE    bias     h=1     h=7    h=14
#     naive                         31.71   2.006   −0.56   27.78   12.93    9.57
#     seasonal naive                16.36   1.035   +1.32   10.88   12.93    9.57   <- identical to the naive at h = 7 and 14:
#     seasonal naive, 4-week mean   14.73   0.931   +4.01    5.82   11.18    3.59      y_{T+7−7} = y_T is the last value
#     drift                         31.89   2.017   −1.85   27.75   12.29   10.20

# (c) TimeSeriesSplit(5, test_size=28, gap=g), 911 days:
#     gap  0: train ends 771, test starts 772; 140 of 140 test rows have a 28-day window touching training
#     gap  7: train ends 764, test starts 772; 105 of 140
#     gap 28: train ends 743, test starts 772;   0 of 140    <- the gap must be at least the longest window`,
        notes: [
          { t: "p", text: "(a) shows that MAPE and sMAPE are not merely biased but undefined or saturated on a single zero, and that MASE's meaning is fixed by the choice of scale." },
          { t: "p", text: "(b) is the reason per-horizon reporting matters: two baselines with very different overall MAEs are the same forecast at two of the horizons." },
          { t: "p", text: "(c) is the gap computed rather than assumed." }
        ]
      }
    }
  ],

  takeaways: [
    "Compute the naive, seasonal naive, drift and mean first, on the production horizon, over many origins: on the store the four-week seasonal naive (MAE 26.9) is the number every model must beat, and on the twelve numbers the plain naive (5.25) beat the seasonal naive whose every error was the trend.",
    "A rolling-origin backtest refits at every origin and reports per horizon with the spread across origins; the window is a choice — expanding when the process is stable, sliding after a change, where the expanding window carried a +22.8 bias for months.",
    "A gap of at least the longest feature window plus the data latency keeps folds disjoint; an unshifted rolling mean let a linear model score 0.0000 and a tree model a plausible 20.9 against an honest 22.3 — the dangerous leak is the plausible one.",
    "MAE is in units and is minimised by the median, RMSE by the mean; bias is a decision; MAPE divides by the actual, is undefined at zero and scores the same 15-unit miss at 150 % or 60 %; sMAPE saturates at 200 %; WAPE is the volume-weighted percentage the business reads; MASE is MAE over the in-sample naive or seasonal-naive error and compares across series (1.01, 1.04, 1.27 for the three stores).",
    "Report MASE for selection, WAPE for the business, bias beside both, broken down by horizon and segment.",
    "The twelve leaks share one symptom — a wonderful backtest and no value — and one test: would this exact number have been available at the moment of the forecast? Encode it as an assertion.",
    "Tune on some folds and report on others: the chosen configuration's score on the folds that chose it (22.40) is not its score (20.78), and the gap grows with the number of configurations."
  ],

  quiz: {
    title: "Baselines, Backtesting and Forecast Metrics — Knowledge Check",
    questions: [
      {
        stem: "A model's 28-day backtest MAE at store A is 24.1. Is it good?",
        options: [
          "Yes — it is small relative to the level of 229",
          "It cannot be judged without the baseline: the four-week seasonal naive scored 26.9 on the same origins and horizon, so the model is a 10 % improvement, and whether that is worth its cost is the decision",
          "No — the naive scored 53",
          "Yes if its RMSE is also low"
        ],
        answer: 1,
        why: "A forecast error has no meaning in isolation; the seasonal naive is the free alternative, and MASE is literally the ratio to it. The plain naive is the wrong comparison on a weekly-seasonal series (it is wrong by a weekday most days). The forecast-value-added review in 10.9 makes this comparison the structure of the whole report."
      },
      {
        stem: "Which is the right window when the backtest shows the expanding-window model with a persistent positive bias after a known date?",
        options: [
          "Expanding — more data is always better",
          "A sliding window (or a step regressor): the bias is the old regime being averaged into every forecast, and the backtest that revealed it is the evidence for the window length",
          "A longer horizon",
          "A different metric"
        ],
        answer: 1,
        why: "After store C's shift the expanding window was 22.8 low on average and the four-week window 3.3 low. Data from before a regime change is not evidence about the present; how much history to keep is an empirical question the rolling backtest answers directly, and a one-directional bias is how it shows."
      },
      {
        stem: "Why is a gap of 7 not enough for a model with a 28-day rolling feature?",
        options: [
          "It is enough — the gap only needs to cover the horizon",
          "With a gap of 7, 105 of 140 test rows still have their 28-day window reaching into the training period; the gap must be at least the longest feature window plus the data latency",
          "Because TimeSeriesSplit requires gap ≥ test_size",
          "Because the gap must equal the season length"
        ],
        answer: 1,
        why: "The gap exists so that no test row's features are computed from training rows in a way production could not reproduce, and so that features unavailable under the pipeline's latency are not used. Executed: gap 0 left 140 of 140 overlapping, gap 7 left 105, gap 28 left none."
      },
      {
        stem: "A product's forecast is evaluated by MAPE. Its actuals include several zero-sales days. What happens?",
        options: [
          "Those days are ignored automatically",
          "MAPE is undefined (division by zero); the usual silent fix drops those days and rewards a model that under-forecasts everywhere else, since a low forecast can never be more than 100 % wrong while a high one is unbounded",
          "MAPE becomes 100 % on those days",
          "sMAPE fixes it"
        ],
        answer: 1,
        why: "The executed store backtest had four closed days in its windows, on which MAPE could not be computed at all, and the ±30 comparison showed MAPE nearly indifferent between an under- and an over-forecast with MAEs of 40.7 and 35.3. sMAPE does not fix it: a 5-unit miss on a zero day scores 200 %. Use WAPE or MASE."
      },
      {
        stem: "You tune 200 configurations on a set of rolling folds and report the best one's MAE from those same folds. What is wrong and how large is the effect?",
        options: [
          "Nothing, if the folds are forward-only",
          "The reported number is the winner of 200 draws on the same folds and is optimistic by roughly the amount of tuning; with 24 configurations the executed gap was small (0.09), and it grows with the number of configurations and the noise in the folds — report on folds or a block not used for selection",
          "The effect is always exactly the standard error of the MAE",
          "The problem is that rolling folds overlap"
        ],
        answer: 1,
        why: "Selecting the minimum over many noisy estimates biases the minimum downward — the winner's curse. Leak 10 in the catalogue. The fix is a nested scheme or a final untouched block; the executed comparison showed the selected configuration's clean-block score (20.78) and its selection score (22.40) differ, and only the former is the model's error."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Baselines, Backtesting and Metrics",
    sub: "The free forecasts, the honest evaluation, and the metric that answers the question.",
    questions: [
      {
        level: "Core",
        q: "What baselines do you run before any forecasting model, and why?",
        strong: "Four: the naive (last value), the seasonal naive (the value one season ago), the drift (last value plus the average slope) and the mean, plus in practice a smoothed seasonal naive — the mean of the last few same-weekday values — which on daily retail data is usually the strongest. I run them on the same rolling-origin backtest and the same horizon as the candidate models, because their errors are the yardstick: MASE divides by the naive's in-sample error, and a forecast-value-added review measures each stage against them. On the store data the smoothed seasonal naive scored 26.9 at 28 days and the plain naive 53; on twelve quarterly numbers with a trend the plain naive won. Which one wins is a property of the series, and a model that does not beat the winner is not a model.",
        answer: [
          { t: "p", text: "The four plus the smoothed seasonal naive, the same backtest and horizon, their role as the denominator, and the two executed outcomes." }
        ]
      },
      {
        level: "Core",
        q: "Explain rolling-origin backtesting and how it differs from cross-validation.",
        strong: "Fix an origin, fit on everything before it, forecast h steps ahead, score, advance the origin and repeat, refitting the model and all preprocessing at every step. Every forecast uses only prior data, which is what distinguishes it from K-fold: there is no shuffling and no fold whose test rows sit between training rows. The origins give a sample of the error, so I report the mean and the spread — the seasonal naive's MAE had a fold-to-fold standard deviation of 12 on the store — and I report per horizon, because h = 1 and h = 28 are different quantities. Two choices are the window, expanding or sliding, which the backtest itself decides — after a level shift the expanding window carried a 23-unit bias and the sliding one 3 — and the gap between training and test, which must cover the longest feature window and the data latency.",
        answer: [
          { t: "p", text: "The procedure, the contrast with K-fold, spread and per-horizon reporting, and the window and gap choices with executed numbers." }
        ]
      },
      {
        level: "Senior",
        q: "Why is MAPE a bad metric, and what do you use instead?",
        strong: "Three reasons. It is undefined when the actual is zero, which happens on any series with closures or intermittent demand — four of the store backtest's 560 rows. It is asymmetric in a way that depends on the data, not the decision: the same 15-unit miss scores 150 % when the actual is 10 and 60 % when the actual is 25, and because a low forecast can never be more than 100 % wrong while a high one is unbounded, minimising MAPE pushes toward under-forecasting on low-volume days — a model that runs out of stock. And it weights a small product's error the same as a large one's when averaged across products. sMAPE does not fix it; a miss on a zero day scores 200 %. I use MASE for model selection — scale-free, always defined, comparable across series, and it reads as 'relative to the seasonal naive' — WAPE for the business, because it is a volume-weighted percentage, and bias beside both, broken down by horizon and segment.",
        answer: [
          { t: "p", text: "Undefined at zero, data-dependent asymmetry with the executed numbers, the under-forecasting incentive, the sMAPE non-fix, and the MASE/WAPE/bias replacement." }
        ]
      },
      {
        level: "Senior",
        q: "Name the time-series leaks you check for and the one test that catches most of them.",
        strong: "Random splits; rolling features without a shift — a linear model scored exactly zero on one, and a tree model a plausible 7 % gain; scalers, encoders, imputers or outlier clips fitted on the whole series; backward fill; target encoding over all rows; exogenous variables that will not be known at forecast time; revised data used instead of the vintage; no gap for pipeline latency; feature selection over the full set; hyperparameters tuned on the reported folds; and hierarchy proportions from the test period. The one test is availability: at the moment the forecast has to be produced, would this exact number have existed? An unshifted rolling mean fails it, lag 1 under a three-day latency fails it, a scaler fitted on the future fails it. I write the answer as assertions in the pipeline — train index strictly before test index, lags at least the latency, gap at least the longest window — because a comment does not fail a build.",
        answer: [
          { t: "p", text: "The catalogue with the executed leak, the availability question, and assertions rather than comments." }
        ]
      },
      {
        level: "Staff",
        q: "How would you design the evaluation for a forecasting system that will be tuned, compared across 2,000 products, and reported to planners?",
        strong: "Three layers with a firewall between them. The backtest: rolling origins on the production horizon, at least twenty, with a gap covering the longest feature window and the data latency, refitting everything inside each fold, on every product, with the smoothed seasonal naive run on the same folds. Selection: MASE per product against the seasonal-naive scale, aggregated as a distribution rather than a mean so that the tail of hard products is visible, computed on the tuning folds only; the chosen configuration is then scored on later folds it never saw and on a final untouched block, because the score on the folds that chose it is optimistic — I measured the direction of that gap even with 24 configurations. Reporting: WAPE, because planners read a volume-weighted percentage, and bias, because the direction of error is an inventory decision; both broken down by horizon, by weekday, and by product tier, since the aggregate hides the failure. And the whole thing versioned: which origins, which gap, which folds were used for what, so that next quarter's number is comparable to this one's and the tuning leak cannot re-enter through a change in the folds.",
        answer: [
          { t: "p", text: "Backtest design with gap and refit, MASE for selection with a firewall between tuning and reporting folds, WAPE and bias by segment for planners, and versioning." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 10.6 — The Machine-Learning Route and Multi-Step Strategies
   ========================================================================= */
EC.receiveLesson({
  id: "10.6",

  lede: "**Turn the sequence into an ordinary table — one row per day, every column built from the past — and any regressor will do; that reshape is how gradient boosting came to win most forecasting competitions with many related series, and it is also where most of the leaks live.** The reshape is worked on seven numbers, with the rolling mean built from lagged values only. The weekday encoded as an integer explains 13 % of the weekly pattern in a linear model, as one-hot 68 %, as three Fourier pairs 68 %. Three multi-step strategies are run on the store over ten origins: recursive scores 18.7, direct 18.6, a multi-output random forest 23.6 — all with the calendar, against the Holt–Winters 20.2 and the SARIMAX-with-calendar 14.3 of the previous lessons. One global boosting model over the three stores beats three per-store models at every store, by 26 % at the store with the level shift. A boosting model on a trending series flattens the moment it leaves the training range (max forecast 412.8, training max 424.6, actual max 470.6; MAE 26.3), and two fixes bring it to 8.7 and 4.3. A minimal LSTM scores 21.9, worse than the boosting it was meant to replace, and the lesson ends with when deep learning and foundation models earn their cost — which, on one series with 900 points, they do not.",

  objectives: [
    "Reshape a series into a supervised table with lag, rolling, calendar, cyclical and event features, built from the past only",
    "Explain why cyclical encoding exists and when one-hot is better",
    "Implement the recursive, direct and multi-output strategies and state their error and compute trade-offs",
    "Explain the global-model advantage over related series, and the boosting blind spot on trends with two fixes",
    "State when deep learning and foundation models earn their cost, and the evidence against them by default"
  ],

  prerequisites: ["10.3", "6.3", "3.2"],

  blocks: [

    { t: "h2", n: "01", text: "The reshape, drawn and checked", id: "reshape" },

    { t: "code", lang: "text", title: "Seven numbers become a supervised table (executed; 2 January 2025 is a Thursday)",
      code: `A SERIES                            THE TABLE: every column is known BEFORE y is observed
t  y                                date        lag1   lag2   lag3   roll3     dow   |  y
1  100                              2025-01-05   90    120    100    103.33    Sun   | 110
2  120                              2025-01-06  110     90    120    106.67    Mon   | 130
3   90                              2025-01-07  130    110     90    110.00    Tue   | 105
4  110                              2025-01-08  105    130    110    115.00    Wed   | 125
5  130
6  105          row t=4 by hand:  lag1 = y3 = 90,  lag2 = y2 = 120,  lag3 = y1 = 100,  roll3 = (90 + 120 + 100)/3 = 103.3333
7  125                            roll3 = s.shift(1).rolling(3).mean() -- y4 itself is NOT in it. Getting this wrong is leak #2 of 10.3.`,
      caption: "Three rows are lost to the longest lag, which on the store table with a 28-day lag means the first usable row is 29 January 2023. From here the problem is tabular regression, with two exceptions: the split must still be by time, and the features must still be computable at the moment the forecast is made." },

    { t: "table", head: ["Family", "Examples", "Captures"], rows: [
      ["Lags", "y_{t−1}, y_{t−7}, y_{t−28}, y_{t−364}", "autocorrelation; the weekly and yearly echo"],
      ["Rolling statistics", "mean, sd, min, max, median over 7, 28, 91 days — of *lagged* values", "local level and volatility"],
      ["Differences", "y_{t−1} − y_{t−2}, y_{t−1} − y_{t−8}", "momentum, week-on-week change"],
      ["Calendar", "weekday, day of month, month, week of year, is-weekend", "fixed seasonality"],
      ["Cyclical / Fourier", "sin, cos(2πkt/m) for k = 1 … K", "smooth seasonality, long periods, continuity at the wrap"],
      ["Events", "holidays, promotions, paydays, days-to and days-since an event", "named spikes"],
      ["Cross-series and static", "store mean, category mean, price ratio; store size, region", "shared behaviour in a global model"]
    ] },

    { t: "code", lang: "python", title: "Cyclical encoding: the weekday three ways in a linear model (executed on the detrended log series, store A)",
      code: `#  encoding                    R² of a linear fit to the weekly pattern
#  integer 0-6                   0.135      <- Sunday (6) is 'six steps' from Monday (0); a line through seven levels
#  one-hot (7 columns)           0.675      <- exact: one free parameter per weekday
#  sin/cos, k = 1                0.472      <- one smooth wave cannot draw a Saturday peak next to a Sunday trough
#  sin/cos, k = 1..3             0.675      <- three harmonics on a 7-day cycle = 6 columns = the one-hot, minus one degree of freedom

# the circle: month 11 = (−0.500, 0.866), 12 = (0.000, 1.000), 1 = (0.500, 0.866)  -- 12 and 1 are 0.518 apart, the same as 11 and 12`,
      caption: "Cyclical encoding solves the wrap-around problem (December and January are one step apart, not eleven) and gives a smooth representation for long periods where one-hot would need 52 or 365 columns; for a short period with a jagged pattern, one-hot or enough harmonics is exact and one harmonic is not. A tree model can split an integer weekday into any pattern and does not need either — the encoding matters for linear models and neural networks." },

    { t: "h2", n: "02", text: "Three ways to forecast 28 steps", id: "strategies" },

    { t: "viz",
      title: "Recursive, direct and multi-output",
      caption: "Recursive feeds its own predictions back into the lag features; direct trains one model per horizon with the target shifted; multi-output predicts all horizons at once. DirRec is direct with earlier predicted steps as inputs.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="Three panels. Recursive: one model, arrows feeding output back to input across steps. Direct: 28 separate models each pointing to one horizon. Multi-output: one model with 28 outputs.">
  <g font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" fill="var(--ink)">
    <text x="30" y="30" font-weight="600">RECURSIVE</text><text x="330" y="30" font-weight="600">DIRECT</text><text x="630" y="30" font-weight="600">MULTI-OUTPUT (MIMO)</text>
  </g>
  <g fill="var(--surface-2)" stroke="var(--accent)" stroke-width="1.5">
    <rect x="30" y="60" width="90" height="36" rx="6"/><rect x="30" y="120" width="90" height="36" rx="6"/><rect x="30" y="180" width="90" height="36" rx="6"/>
  </g>
  <g font-family="ui-monospace, monospace" font-size="11" fill="var(--ink-2)">
    <text x="40" y="82">f(history)</text><text x="40" y="142">f(ŷ₁, hist)</text><text x="40" y="202">f(ŷ₂, ŷ₁, …)</text>
    <text x="140" y="82">→ ŷ₁</text><text x="140" y="142">→ ŷ₂</text><text x="140" y="202">→ ŷ₃ …</text>
  </g>
  <g stroke="var(--crit)" stroke-width="1.5" fill="none"><path d="M175 84 C 200 100, 200 110, 125 130" stroke-dasharray="4 3"/><path d="M175 144 C 200 160, 200 170, 125 190" stroke-dasharray="4 3"/></g>
  <text x="30" y="238" font-size="11" fill="var(--crit)" font-family="ui-sans-serif, system-ui, sans-serif">one model · errors compound</text>
  <g fill="var(--surface-2)" stroke="var(--good)" stroke-width="1.5">
    <rect x="330" y="60" width="80" height="30" rx="6"/><rect x="330" y="100" width="80" height="30" rx="6"/><rect x="330" y="140" width="80" height="30" rx="6"/><rect x="330" y="180" width="80" height="30" rx="6"/>
  </g>
  <g font-family="ui-monospace, monospace" font-size="11" fill="var(--ink-2)">
    <text x="340" y="80">f₁(hist)</text><text x="340" y="120">f₂(hist)</text><text x="340" y="160">f₃(hist)</text><text x="340" y="200">f₂₈(hist)</text>
    <text x="430" y="80">→ ŷ₁</text><text x="430" y="120">→ ŷ₂</text><text x="430" y="160">→ ŷ₃</text><text x="430" y="200">→ ŷ₂₈</text>
    <text x="345" y="178" fill="var(--ink-3)">⋮</text>
  </g>
  <text x="330" y="238" font-size="11" fill="var(--good)" font-family="ui-sans-serif, system-ui, sans-serif">28 models · no compounding · each sees fewer rows</text>
  <rect x="630" y="90" width="110" height="60" rx="6" fill="var(--surface-2)" stroke="var(--warn)" stroke-width="1.5"/>
  <text x="645" y="125" font-family="ui-monospace, monospace" font-size="11" fill="var(--ink-2)">f(hist)</text>
  <g font-family="ui-monospace, monospace" font-size="11" fill="var(--ink-2)"><text x="760" y="82">→ ŷ₁</text><text x="760" y="108">→ ŷ₂</text><text x="760" y="134">→ ŷ₃</text><text x="760" y="160">→ ŷ₂₈</text><text x="765" y="146" fill="var(--ink-3)">⋮</text></g>
  <g stroke="var(--ink-3)" stroke-width="1"><line x1="740" y1="100" x2="758" y2="80"/><line x1="740" y1="110" x2="758" y2="105"/><line x1="740" y1="125" x2="758" y2="130"/><line x1="740" y1="140" x2="758" y2="156"/></g>
  <text x="630" y="238" font-size="11" fill="var(--warn)" font-family="ui-sans-serif, system-ui, sans-serif">one model, 28 outputs · shares structure · the neural default</text>
</svg>` },

    { t: "code", lang: "python", title: "The three strategies on store A: 19 features, calendar known in advance, h = 28, 10 origins (executed; 107 s)",
      code: `features: lag 1,2,3,7,14,21,28 · roll7, roll28, std7 of lagged values · week-on-week change · weekday · yearly sin/cos · promo, closed, Black Friday, Christmas week · store

recursive:  one HistGradientBoosting model on one-step features; at each of the 28 steps the lags and rollings are recomputed from the predictions so far
direct:     28 models; model h has target y_{t+h} and features at t plus the KNOWN covariates of day t+h (weekday, promo, holidays)
MIMO:       one RandomForest with 28 outputs (multi-output is native to forests)

#  strategy                MAE     h=1     h=7    h=14    h=28
#  recursive              18.72   16.30   17.82   10.98   25.04
#  direct                 18.60   12.30   23.12   13.17   13.89
#  MIMO (random forest)   23.57   12.95   32.48   17.45   17.74
#  reference on the same origins: seasonal naive 23.1 · Holt–Winters 20.2 (10.4) · SARIMAX + calendar 14.3 (10.5)`,
      caption: "Recursive and direct tie overall and differ where theory says: recursive degrades toward h = 28 (25.0) as its own errors compound through the lags, direct does not (13.9). The random forest's multi-output is weaker because a forest's leaf averages blur 28 targets at once. Per-horizon numbers on ten origins are noisy — the direct h = 7 value is a fold accident — so the block averages in the exercise are the fairer reading. None of the three beats SARIMAX with the same calendar on this single series, which is the honest headline of §04." },

    { t: "table", head: ["Strategy", "Models", "Errors compound", "Best when"], rows: [
      ["Recursive", "1", "yes", "short horizons; what ARIMA and ETS do natively"],
      ["Direct", "h", "no", "long horizons and enough data; each model can use the target day's known covariates"],
      ["Multi-output", "1", "no", "neural networks; horizons share structure; a forest's version is weak"],
      ["DirRec", "h", "partly", "competitions; the most accurate and the most complex"]
    ] },

    { t: "callout", kind: "insight", title: "Report the error per horizon, not one number", body: "A model with MAE 3 at h = 1 and 40 at h = 28 and a model flat at 20 average the same and are completely different products. The per-horizon curve — or, with few origins, the error by horizon block — is the single most useful plot in a forecasting review, and the recursive strategy's compounding is invisible without it: 18.7 overall hides the 25.0 at the end of the month." },

    { t: "h2", n: "03", text: "One global model over many series", id: "global" },

    { t: "code", lang: "python", title: "Per-store models versus one model over all three stores (executed; direct strategy, h = 28, 10 origins, 395 s)",
      code: `#  store    level    per-store direct MAE    global direct MAE
#    A      229.7          18.60                  17.56
#    B      132.9          11.16                  10.84
#    C       92.6          12.15                   8.97      <- the store with the level shift: −26 %
#  volume-weighted total error: per-store 0.0921, global 0.0821 (−11 %)

# the global model sees 3× the rows, a store id, and the same calendar across stores; store C's post-shift history is short,
# and the pooled model borrows the weekly and yearly structure from A and B`,
      caption: "This is the real advantage of the ML route: cross-learning. A per-series boosting model on a single store is not better than a per-series ARIMA; a single boosting model over many related series usually is, and it is the reason gradient boosting won the M5 competition over 30,000 products. New series with little history get sensible forecasts from the first week." },

    { t: "table", head: ["Situation", "Winner", "Why"], rows: [
      ["One series, 60 monthly points", "ARIMA / ETS", "a boosting model has nothing to learn from"],
      ["One daily series, 900 points, known calendar", "SARIMAX with the calendar (14.3 against boosting's 18.6 here)", "the structure is linear on logs and the regressors do the work"],
      ["10,000 related products", "one global boosting model", "pools information; cold-start for new items"],
      ["Irregular, event-driven demand", "boosting", "non-linear interactions among calendar and event features"],
      ["Strong smooth trend, little else", "ARIMA / ETS, or boosting with a trend fix (§04)", "trees cannot extrapolate"],
      ["Explaining to a regulator", "ARIMA / ETS", "closed form, standard errors, named coefficients"]
    ] },

    { t: "h2", n: "04", text: "The boosting blind spot: trees cannot extrapolate", id: "trend" },

    { t: "p", text: "A tree's prediction is an average of training targets in a leaf, so it cannot output a value above the maximum it has seen or below the minimum. On a trending series the forecast flattens the moment it leaves the training range — and a recursive forecast leaves it quickly. This is the number one reason a boosting model loses to a plain ARIMA on a single trending series, and it has two standard fixes: model the change (the difference, or the ratio to a rolling level) rather than the level, or fit the trend with a linear model and boost the residual." },

    { t: "code", lang: "python", title: "A series with slope 0.5 a day, trained on 600 rows, forecast 100 ahead recursively (executed)",
      code: `#  target                                    MAE     max forecast     (training max 424.6, actual max in the window 470.6)
#  levels                                    26.34      412.8         <- flat at the top of the training range
#  first differences, cumulated back          8.67      486.1         <- can leave the range; overshoots a little
#  linear trend + boosted residual            4.30      469.6         <- fitted slope 0.499 against a truth of 0.5
# the exercise repeats it with a falling trend and the ratio-to-rolling-mean target: 25.3 -> 6.6 -> 4.8`,
      caption: "Differencing hands the extrapolation to the cumulative sum; the linear-plus-residual hybrid hands it to a model that can extrapolate and leaves the trees the part they are good at. On the store the trend is 0.05 a day and the ratio-to-level features (roll28) carry most of it, which is why the plain boosting was not badly hurt there." },

    { t: "code", lang: "python", title: "Objectives (executed; one-step table, store A, 8 folds of 28 days)",
      code: `#  loss              one-step MAE    RMSE     bias
#  squared_error         19.86       28.09    −3.08     the mean; the default
#  absolute_error        19.19       28.14    −5.61     the median; robust to spikes, lower MAE, larger bias on a right-skewed target
#  poisson               19.64       27.78    −3.48     counts; variance grows with the mean
# LightGBM adds tweedie (retail counts with a mass at zero) and quantile (one model per quantile -> intervals, 10.7)`,
      caption: "The objective decides which statistic the model estimates: squared error the mean, absolute error the median, a quantile loss the quantile. On a right-skewed target the median is below the mean, so the absolute-error model has the lower MAE and the larger negative bias — the same MAE-versus-bias trade-off as 10.3, made by the loss function rather than after the fact." },

    { t: "h2", n: "05", text: "Deep learning and foundation models: when they earn their cost", id: "deep" },

    { t: "code", lang: "python", title: "A minimal LSTM on the store: lookback 28 → 28 outputs, sales only (executed; 300 epochs per origin, 44 s)",
      code: `class LSTMF(nn.Module):
    def __init__(self, hidden=32): self.lstm = nn.LSTM(1, hidden, batch_first=True); self.head = nn.Linear(hidden, 28)
    def forward(self, x): out, _ = self.lstm(x); return self.head(out[:, -1])       # last hidden state -> all 28 steps at once (MIMO)
# scaling fitted on the training window only; L1 loss; gradient clipping at 1.0; windows never cross the origin

#  LSTM, sales only          MAE 21.88    h=1 21.04    h=28 15.71
#  direct boosting           MAE 18.60    (with the calendar)
#  seasonal naive            MAE 23.10`,
      caption: "On one series of 900 points a small recurrent network without covariates is a worse seasonal naive. That is the M4/M5 and 'are transformers effective for time-series forecasting' result in miniature: on many benchmarks a well-tuned linear model or a boosted feature table beats a deep network, and several transformer papers were beaten by a one-layer linear model (DLinear). The families that do earn their place — N-BEATS and N-HiTS for univariate long horizons, DeepAR and the Temporal Fusion Transformer for quantile outputs with static, known-future and past-only covariates in separate channels, PatchTST for long context — do so on thousands of long series with rich covariates." },

    { t: "dl", items: [
      ["Reach for deep learning when", "there are thousands of series with thousands of points; non-linear interactions with covariates; quantiles from one model are needed (DeepAR, TFT); cold-start for new items via shared embeddings is valuable."],
      ["Do not when", "there is one series with a few hundred points; the structure is a trend and a stable season; interpretability is a hard requirement; the retraining budget is minutes."],
      ["Foundation models (Chronos, TimesFM, Moirai, TimeGPT, Lag-Llama)", "pre-trained on billions of points across domains and applied zero-shot: a strong baseline in an afternoon, a cold-start forecast when there is no history, a sanity check on a bespoke pipeline. Not executed in this course: they need model weights of hundreds of megabytes and a GPU to be practical."],
      ["Where foundation models do not help", "anything driven by covariates they cannot see — your promotions, your prices — which on this store were worth 29 % of the error; regimes absent from the pre-training; latency or air-gap requirements a hosted API cannot meet. Treat one as a baseline: if it beats your tuned model zero-shot, that is information about your features."]
    ] },

    { t: "ladder",
      title: "Forecasting with gradient boosting",
      rungs: [
        { level: "bad", label: "One model per series on the levels, rolling mean unshifted, random K-fold", code: `X["roll7"] = y.rolling(7).mean(); cross_val_score(model, X, y, cv=5, shuffle=True)`,
          note: "**The target is inside its feature (10.3: linear MAE 0.0000), the split interpolates (10.1), and a per-series tree model on a trending level flattens at the training maximum.**" },
        { level: "ok", label: "Shifted features, forward folds, recursive forecast", code: `X = lags + shift(1).rolling(...) + calendar;  TimeSeriesSplit(gap=28)
recursive_forecast(model, h=28)                        # MAE 18.7, but 25.0 at h = 28`,
          note: "Honest, and the compounding is hidden inside the average. No known-future covariates for the target day; no cross-learning; no trend fix." },
        { level: "best", label: "Direct (or DirRec) with the target day's known covariates, one global model over related series, a trend fix where needed, reported per horizon against the baseline", code: `for h in 1..28: model_h.fit(features_at_t + known_covariates(t + h), y[t + h])
global model over stores with store id;  target = y − linear_trend  or  y / roll28 on trending series
report MAE by horizon block vs the seasonal naive and vs SARIMAX + calendar`,
          note: "No compounding, the calendar of the day being forecast is used, information is pooled across series (−11 % overall, −26 % on the shifted store), extrapolation is handed to something that can do it, and the comparison that decides whether the ML route was worth it is on the table." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "In the seven-number table, roll3 at t = 4 is 103.33 = (90 + 120 + 100)/3. Why is 110 — the value at t = 4 — not included?",
          options: [
            "Because three values is the window",
            "Because the row's features must be computable before y₄ is observed: the rolling mean is of lagged values, s.shift(1).rolling(3), and including y₄ would put the target inside its own feature",
            "Because rolling means always exclude the current row in pandas",
            "Because 110 is an outlier"
          ],
          answer: 1,
          why: "pandas' rolling(3).mean() at t includes y_t; the shift(1) before it is what makes the feature legal. 10.3 measured the leak: a linear model with the unshifted rolling mean scored MAE 0.0000, a tree model a plausible 7 % improvement that would have shipped."
        },
        {
          stem: "The weekday as an integer gave R² 0.135 in a linear model and 0.675 as one-hot. Would a boosting model care?",
          options: [
            "Yes — trees need one-hot too",
            "Far less: a tree can split an integer weekday at any threshold, repeatedly, and carve out any pattern of seven levels; the encoding matters for linear models and neural networks, where an integer imposes an ordering and a line",
            "Yes — trees cannot handle integers",
            "No model cares about encoding"
          ],
          answer: 1,
          why: "A linear model fits one slope to the integer, which is why 0.135; a tree fits a step function. Cyclical sin/cos encoding solves the wrap-around for linear models and gives long periods a smooth, compact representation; for a jagged seven-day pattern one harmonic (0.472) is not enough and three (0.675) equal the one-hot."
        },
        {
          stem: "Recursive scored 25.0 at h = 28 and direct 13.9, with the same overall MAE. What is the mechanism?",
          options: [
            "Direct uses more data",
            "The recursive model's lag features at step 28 are built from its own 27 previous predictions, so each step's error feeds the next; the direct model for h = 28 uses only true history at the origin and the target day's known calendar",
            "Direct is regularised",
            "Recursive cannot use the calendar"
          ],
          answer: 1,
          why: "Compounding is the recursive strategy's defining cost and it grows with the horizon; in exchange it trains one model instead of 28. Direct trains a weaker model per horizon (the shift loses rows and the far-horizon relationship is noisier) but no error is reused. The per-horizon report is what makes the difference visible."
        },
        {
          stem: "The global model beat the per-store models at every store, by 26 % at store C. Why C most?",
          options: [
            "Store C has the most data",
            "Store C had a level shift eleven months before the end, so its own post-shift history is short; the pooled model borrows the weekly and yearly structure from stores A and B and only needs C's recent level, which its lag and rolling features supply",
            "Store C is the smallest, so its errors are smaller",
            "The global model over-fits the larger stores"
          ],
          answer: 1,
          why: "Cross-learning is most valuable exactly where a series' own history is least informative: short, shifted, or new. The global model saw three times the rows and a store id, and the volume-weighted error fell 11 % overall. This is the mechanism behind boosting's competition results on tens of thousands of products."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "A reshape by hand, recursive versus direct on store B, and a falling trend",
      difficulty: "advanced",
      minutes: 32,
      body: [
        { t: "p", text: "**(a)** For y = 40, 55, 45, 60, 50, 65, 58 starting Monday 6 January 2025, build the table with lag1–3, roll3 of lagged values, diff1 = y_{t−1} − y_{t−2}, and weekday. Check row t = 5 by hand and say which feature would be a leak if the shift were omitted." },
        { t: "p", text: "**(b)** Run the recursive and direct strategies on store B (h = 28, 10 origins, the 19-feature table). Report MAE overall, at h = 1, 7 and 28, and by horizon block (1–7, 8–14, 15–21, 22–28) for both." },
        { t: "p", text: "**(c)** Build a series 400 − 0.4t + weekly season + noise (720 points), train boosting on the first 600 rows and forecast 100 ahead recursively three ways: on levels; on the ratio to the 28-day rolling mean, multiplied back; and as a linear trend plus boosted residual. Report MAE and the minimum forecast against the training minimum and the actual minimum." }
      ],
      requirements: [
        "(a) the table, the check, and the leak.",
        "(b) two rows of five numbers and the block table.",
        "(c) three MAEs and three minima."
      ],
      hint: "(a) diff1 is a difference of lags — legal as written. (b) The block averages are more stable than single horizons on ten origins. (c) A falling trend leaves the training range at the bottom.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a)   date        lag1  lag2  lag3  roll3   diff1  dow |  y
#       2025-01-09   45    55    40   46.67   −10   Thu | 60
#       2025-01-10   60    45    55   53.33   +15   Fri | 50      <- t = 5: lag1 = y4 = 60, lag2 = 45, lag3 = 55, roll3 = 160/3 = 53.3333, diff1 = 60 − 45 = 15
#       2025-01-11   50    60    45   51.67   −10   Sat | 65
#       2025-01-12   65    50    60   58.33   +15   Sun | 58
#     Without the shift, roll3 at t = 5 would be (50 + 60 + 45)/3 and contain y5; diff1 as y_t − y_{t−1} would contain it too.

# (b) store B, h = 28, 10 origins (95 s)
#     recursive: MAE 11.70   h=1 9.16   h=7 11.58   h=28 10.03
#     direct:    MAE 11.16   h=1 9.06   h=7 10.77   h=28  7.12
#     by block (recursive / direct): 1-7 10.47 / 9.46;  8-14 12.36 / 12.46;  15-21 11.82 / 11.78;  22-28 12.16 / 10.93
#     -> tied in the middle of the month; direct better in the first week (it uses the target day's calendar exactly) and the last (no compounding)

# (c) falling trend, slope −0.4, training minimum 138.0, actual minimum in the window 97.7
#     levels:                            MAE 25.31   min forecast 144.9    <- cannot go below what it has seen
#     ratio to the 28-day rolling mean:  MAE  6.61   min forecast 111.7
#     linear trend + boosted residual:   MAE  4.84   min forecast 102.5    fitted slope −0.399`,
        notes: [
          { t: "p", text: "(a) is the reshape once more, with the feature that is a difference of lags shown to be legal and the two ways of making it illegal." },
          { t: "p", text: "(b) shows the pattern of §02 on a second store: the strategies tie overall and part at the ends of the horizon." },
          { t: "p", text: "(c) is the blind spot in the other direction; the ratio target lets the level fall with the rolling mean, and the hybrid recovers the slope to three decimals." }
        ]
      }
    }
  ],

  takeaways: [
    "The reshape makes one row per timestamp with columns built from the past only — lags, rolling statistics of lagged values, differences, calendar, cyclical and Fourier terms, events, cross-series and static features — and the two rules that survive it are the time split and the availability question.",
    "Cyclical encoding fixes the wrap-around and compresses long periods for linear models and networks (weekday: integer 0.135, one harmonic 0.472, three harmonics 0.675 = one-hot); trees split integers and do not need it.",
    "Recursive (one model, errors compound: 25.0 at h = 28), direct (h models, no compounding: 13.9), multi-output (one model, h outputs; native to networks, weak in forests: 23.6) — tied overall at 18.7 / 18.6 on the store, and the per-horizon report is what tells them apart.",
    "The ML route's real advantage is one global model over related series: −11 % overall and −26 % on the store with a level shift; a per-series boosting model on a single series lost to SARIMAX with the same calendar (18.6 vs 14.3).",
    "Trees cannot extrapolate: a boosting model on a trending series flattened at the training maximum (MAE 26.3); differences (8.7), the ratio to a rolling level (6.6) or a linear trend plus boosted residual (4.3 and 4.8) fix it.",
    "The objective chooses the statistic — squared error the mean, absolute error the median, quantile loss a quantile — and with it the MAE-versus-bias trade-off.",
    "A minimal LSTM on one series (21.9) lost to the boosting model and nearly to the seasonal naive; deep learning earns its cost on thousands of long series with covariates and quantile needs, and a foundation model is a baseline to beat in an afternoon, blind to the covariates you own."
  ],

  quiz: {
    title: "The Machine-Learning Route and Multi-Step Strategies — Knowledge Check",
    questions: [
      {
        stem: "A team builds one LightGBM model per product for 8,000 products, each with two years of daily history. Forecast quality is poor on new and low-volume products. What is the first change?",
        options: [
          "Add more lag features per product",
          "Train one global model over all products with a product id and static attributes: cross-learning pools the shared weekly and yearly structure, gives new products a sensible forecast from the first week, and on the store data cut the error 11 % overall and 26 % where history was least informative",
          "Switch to per-product ARIMA",
          "Increase the number of trees"
        ],
        answer: 1,
        why: "Per-series tree models have nothing to learn from on thin series; the global model is the mechanism by which boosting won the M5 competition. It is also cheaper: one model to tune, retrain and monitor instead of 8,000."
      },
      {
        stem: "Which target transformation is appropriate for a boosting model on a series with a strong upward trend, and why?",
        options: [
          "None — boosting handles trends",
          "Model the difference or the ratio to a rolling level, or fit a linear trend and boost the residual: a tree's prediction is a leaf average and cannot exceed the training maximum, so the level forecast flattens (MAE 26.3 versus 4.3 for the hybrid)",
          "Take logs only",
          "Add the time index as a feature"
        ],
        answer: 1,
        why: "The time index as a feature does not help: the tree splits it at thresholds it has seen and predicts the last leaf's average beyond them. Handing the extrapolation to a cumulative sum or a linear model is what lets the forecast leave the range; the executed maximum forecasts were 412.8, 486.1 and 469.6 against an actual 470.6."
      },
      {
        stem: "Why does the direct strategy's model for h = 28 use the calendar of day t + 28 rather than of day t?",
        options: [
          "It does not — direct models use only origin features",
          "Because the target is y_{t+28} and the weekday, promotion flag and holiday of that day are known in advance; they are the covariates that explain it, and the recursive strategy can use them too by feeding them at each step — the leak would be using unknown values, not known ones",
          "Because the calendar of day t is already in the lags",
          "To avoid leakage"
        ],
        answer: 1,
        why: "The availability test is about whether the value is known at forecast time, not about whether the date is in the future: the calendar 28 days ahead is fixed. Both strategies in the executed run used the target day's known covariates; SARIMAX did the same through its exogenous matrix and won on this single series because the structure was linear on logs."
      },
      {
        stem: "A paper reports a transformer beating classical models on a benchmark. What should a practitioner check before adopting it for a single retail series?",
        options: [
          "Nothing — newer is better",
          "Whether the comparison included a tuned linear model, a boosted feature table and the seasonal naive on the same folds; whether the benchmark has thousands of long series; and whether their own series has the covariates and volume that make a network's cost worthwhile — the executed LSTM scored 21.9 against 18.6 for boosting and 23.1 for the naive",
          "Only the parameter count",
          "Whether it supports GPUs"
        ],
        answer: 1,
        why: "The M4/M5 results and the DLinear line of work found several transformer papers beaten by a one-layer linear model once the baselines were run properly. Deep models earn their place on many long series with covariates and quantile needs; on one series of 900 points they are an expensive way to lose to a seasonal naive."
      },
      {
        stem: "What is a foundation model for time series good for, and what can it not do?",
        options: [
          "It replaces the forecasting pipeline",
          "A zero-shot baseline in an afternoon, a cold-start forecast with no history, and a sanity check on a bespoke model; it cannot see the covariates you own — promotions, prices, closures — which on the store were worth 29 % of the error, and it may never have seen your domain's regime",
          "It is only for finance",
          "It requires labelled anomalies"
        ],
        answer: 1,
        why: "Chronos, TimesFM, Moirai and similar models are pre-trained on billions of points and forecast unseen series without fitting; that makes them a strong default and a poor final answer when the drivers are in your calendar. If one beats your tuned model zero-shot, the information is about your feature engineering."
      }
    ]
  },

  interview: {
    title: "Interview Questions — The Machine-Learning Route",
    sub: "The reshape, the strategies, cross-learning, the tree blind spot, and the honest case for and against deep models.",
    questions: [
      {
        level: "Core",
        q: "How do you turn a time series into a supervised learning problem, and what is the most common mistake?",
        strong: "One row per timestamp, with every column built from the past: lags at the autocorrelation and seasonal distances, rolling statistics of *lagged* values, differences of lags, calendar features — weekday, month, Fourier terms for long periods — and event flags known in advance; the target is the value at that timestamp, or, for a horizon h, the value h steps later. On seven numbers the row for t = 4 has lag1 = 90, lag2 = 120, lag3 = 100 and roll3 = 103.33 — and not y₄ = 110, which is the target. The most common mistake is exactly that: `rolling(7).mean()` without a `shift(1)` puts the target inside its own feature; measured in 10.3, a linear model scores zero error and a tree model a plausible 7 % gain that would pass review. The second is splitting by row instead of by time. Once the table is honest, any regressor applies, and the choice between them is decided by a rolling-origin backtest against the seasonal naive.",
        answer: [
          { t: "p", text: "The feature families, the worked row, the unshifted-rolling leak with the executed numbers, and the time split." }
        ]
      },
      {
        level: "Core",
        q: "Compare the recursive and direct strategies for a 28-day forecast.",
        strong: "Recursive trains one one-step model and feeds its predictions back into the lag features 27 times; direct trains 28 models, one per horizon, each with the target shifted h steps and the features fixed at the origin, plus the known covariates of the target day. Recursive is cheap and is what ARIMA and ETS do natively; its cost is compounding — on the store, 16.3 at h = 1 and 25.0 at h = 28. Direct has no compounding — 13.9 at h = 28 — but trains 28 weaker models, each on fewer rows with a noisier relationship, and costs 28 times the compute. Overall they tied at 18.7 and 18.6, which is why I report per horizon or per horizon block rather than one number: on store B the two were tied in weeks two and three and direct won the first and last weeks. A multi-output model — one model, 28 outputs — avoids compounding with one fit and is the neural default; a random forest's version scored 23.6 because leaf averages over 28 targets blur. DirRec, direct with earlier predictions as inputs, is the competition choice.",
        answer: [
          { t: "p", text: "Mechanisms, costs, the executed per-horizon numbers, the multi-output variant, and the reporting rule." }
        ]
      },
      {
        level: "Senior",
        q: "When does gradient boosting beat ARIMA for forecasting, and when does it lose?",
        strong: "It wins when there are many related series — one global model pools the weekly and yearly structure across them, gives cold-start forecasts, and on the three stores cut the volume-weighted error 11 %, with 26 % on the store whose own history was shortest — and when the demand is event-driven with non-linear interactions among calendar and covariate features that a linear model cannot express. It loses on a single series with a few hundred points where there is nothing to pool, on a series whose structure is a smooth trend and a stable season — on store A alone SARIMAX with the same calendar scored 14.3 against boosting's 18.6, because the structure is linear on logs — and on trends in general, because a tree cannot predict outside the training range: a boosting model flattened at the training maximum with MAE 26.3, which differencing or a linear-trend-plus-residual hybrid fixed to 8.7 and 4.3. And it loses whenever standard errors and named coefficients are required. The honest procedure is to run both on the same rolling origins with the same known covariates, and to run the seasonal naive beside them.",
        answer: [
          { t: "p", text: "Cross-learning and event-driven demand for boosting, single series and linear structure for ARIMA, the trend blind spot with its fixes, and the procedure." }
        ]
      },
      {
        level: "Senior",
        q: "Explain the tree blind spot on trends and the two fixes.",
        strong: "A tree predicts the average of the training targets that fell in a leaf, so its output lies between the training minimum and maximum; as a recursive forecast on a trending series climbs out of that range, every leaf it lands in predicts the top of the range and the forecast goes flat. On a series with slope 0.5 a day, trained to a maximum of 424.6, the level model's maximum forecast was 412.8 against an actual 470.6 and the MAE was 26.3. First fix: model the change instead of the level — the first difference, or the ratio to a rolling mean — and cumulate or multiply back, so the extrapolation is done by the sum rather than the tree: 8.7, or 6.6 with the ratio on a falling series. Second fix: fit a linear trend first and boost the residual, so the model that can extrapolate does the extrapolating and the trees model what is left: 4.3 with the slope recovered as 0.499. The second is usually the cleaner one, and it generalises: any component the trees cannot represent — a trend, a known multiplicative factor — is removed first.",
        answer: [
          { t: "p", text: "The leaf-average mechanism, the executed flattening, and both fixes with numbers." }
        ]
      },
      {
        level: "Staff",
        q: "You are asked to replace a boosting forecaster with a deep model because 'transformers are state of the art'. How do you respond?",
        strong: "With a test rather than an opinion. The evidence base is not on the transformer's side by default: the M4 and M5 competitions were won by hybrid and boosting methods, and the 'are transformers effective for time-series forecasting' work showed several published transformers beaten by a one-layer linear model once the baselines were run on the same folds. On our single store, a small LSTM with honest scaling and windowing scored 21.9 against 18.6 for the boosting and 23.1 for the seasonal naive — it lost to the model it was meant to replace and nearly to the free one. Deep models earn their place under specific conditions: thousands of long series, rich covariates in the three channels TFT is built for — static, known-future, past-only — a need for quantiles from one model, and cold-start through shared embeddings. If we have those, I would run N-HiTS or TFT on the same rolling origins with the same known covariates as the boosting model and the same baseline, report per horizon and per segment, and include the retraining cost and the explanation cost in the comparison. If we do not, I would first run a foundation model zero-shot as a baseline — an afternoon's work — because if Chronos beats our tuned boosting, that is information about our features, not a reason to train a transformer. What I would not do is change the model class on a benchmark that did not include our baseline.",
        answer: [
          { t: "p", text: "The evidence, the executed LSTM result, the conditions under which deep models win, the fair test design, the foundation-model baseline, and the refusal to decide on someone else's benchmark." }
        ]
      }
    ]
  }
});

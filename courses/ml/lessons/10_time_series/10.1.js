/* ============================================================================
   LESSON 10.1 — Why Time Breaks Ordinary ML, and Getting the Data Right
   ========================================================================= */
EC.receiveLesson({
  id: "10.1",

  lede: "**A time series is a table whose rows are not exchangeable: the order is the information, and everything in ordinary machine learning that assumed independent rows — the random split, the standard error, the rolling window that does not know a day is missing — quietly breaks.** This module works on one dataset built for it: daily sales for three stores over two and a half years, with a known trend, a known weekly and yearly season, promotions, holidays and a level shift, delivered as a raw file that also carries a duplicated ETL load, a five-day feed outage, a till fault recorded as £3.10 and a partial last day. A gradient-boosting model with lag features scores an MAE of 22.3 under a shuffled 5-fold split and 31.3 when it is only ever tested on the future — because 67 % of the shuffled test rows had both neighbours in training. An AR(1) series with φ = 0.9 and 200 points has the standard error of a sample of 10.5. The seven hygiene checks find every planted fault. A robust outlier flag on the raw series marks 50 Saturdays; the same flag on a same-weekday ratio marks the four closures, the two Black Fridays and the till fault. Classical decomposition is worked on twelve numbers and recovers the seasonal indices exactly; on the daily series the weekly factors come back within 0.02 of the ones that built it, and the swing-to-level ratio of 0.42, 0.44 and 0.45 across the three stores says the world is multiplicative.",

  objectives: [
    "Explain why a random split, an i.i.d. standard error and a shuffled cross-validation are wrong for a series, with the executed evidence",
    "Run the seven hygiene checks in order on a raw file and state what each one catches",
    "Choose a missing-value treatment from what the gap means, and explain why backward fill is leakage",
    "Distinguish an outlier from an event and from a level shift, and flag outliers against the local season rather than the raw series",
    "Work classical decomposition by hand, read STL's output, and decide additive versus multiplicative from the data"
  ],

  prerequisites: ["1.5", "1.6", "3.3"],

  blocks: [

    { t: "h2", n: "01", text: "The dataset for this module, and why the order is the data", id: "dataset" },

    { t: "p", text: "Every lesson in this module uses the same series. Three stores — A, B and C — report daily sales from 1 January 2023 to 30 June 2025. The generator gave each store a base level (200, 120 and 80), a slow trend, a weekly pattern with factors 0.85, 0.90, 0.95, 1.00, 1.15, 1.30 and 0.85 from Monday to Sunday, a yearly pattern peaking in early July with an amplitude of 15 %, promotions on a random 10 % of days at +20 %, a +80 % Black Friday, a +25 % week before Christmas, closures on 25 December and 1 January, a permanent +30 lift for store C from 1 September 2024 after a refurbishment, and 8 % multiplicative noise. The raw file `sales_raw.csv` contains those numbers with faults you will meet in any warehouse: rows arrive unsorted with string dates, three days in March 2024 were loaded twice, store B's feed dropped for five days in June 2024 so the rows are absent rather than zero, one day at store A was recorded as £3.10 by a failed till, and the extract for the last day ran mid-afternoon. `store_sales.csv` is the clean version with the promo and holiday flags, which the later lessons use once the hygiene has been done here." },

    { t: "table", head: ["", "Ordinary tabular learning", "A time series"], rows: [
      ["Rows are", "independent draws from one distribution", "one dependent sequence; each row is correlated with its neighbours"],
      ["Shuffling is", "harmless, and expected", "destroys the signal"],
      ["Validation", "random K-fold", "forward only: every test point after every training point"],
      ["A feature is", "measured alongside the target", "knowable *before* the target happens, at the time the forecast is made"],
      ["The test set", "a random sample", "always the latest block, and the error grows with the horizon"],
      ["The standard error", "σ/√n", "larger, often much larger: n is not the number of independent observations"]
    ] },

    { t: "code", lang: "python", title: "The random split that lies (executed: store A, lag 1/2/7/14 + weekday + trend features, gradient boosting)",
      code: `X = DataFrame({lag_k: sales.shift(k) for k in [1, 2, 7, 14]}) + weekday + t
gb = HistGradientBoostingRegressor(max_depth=3, learning_rate=0.05, max_iter=300)

cross_val_score(gb, X, y, cv=KFold(5, shuffle=True))      # MAE 22.25
# forward only: five folds, each trained on everything before and tested on the next 90 days
#                                                          # MAE 31.30   (folds 38.0, 32.4, 29.6, 20.4, 36.1)
# series mean 229.7
# in the first shuffled fold, 67 % of test rows have BOTH t−1 and t+1 in the training set`,
      caption: "The shuffled score is 29 % better than anything the model will achieve in use, because a shuffled test row usually sits between two training rows it can interpolate. The forward-only folds also show the second thing a random split hides: the error varies by period (20 to 38), and only a forward scheme reports that." },

    { t: "p", text: "The second casualty is every statistic that divides by √n. Sales at store A have an autocorrelation of 0.42 at lag 1 and 0.73 at lag 7: today is like yesterday and very like last week. For a first-order autoregressive series with coefficient φ, the variance of the sample mean is what it would be for n(1 − φ)/(1 + φ) independent points. Simulated with φ = 0.9 and n = 200, the standard deviation of the sample mean over 2,000 runs was 0.678; the i.i.d. formula gave 0.162; the effective-n formula, with n_eff = 10.5, gave 0.707. A confidence interval, a t-test on a difference of means, a bootstrap that resamples rows — all inherit the same understatement, by a factor of four here. Blocked bootstraps and HAC standard errors exist for exactly this reason." },

    { t: "callout", kind: "mental", title: "The one-sentence test of a split", body: "If you can describe your training and test sets without using the words *before* and *after*, the split is wrong. Every design in this module — rolling-origin backtests, lag features, the gap between training and test — follows from the fact that at the moment a forecast is made, the future is not available, and the evaluation must recreate that moment." },

    { t: "h2", n: "02", text: "Getting the data right: seven checks, in order", id: "hygiene" },

    { t: "p", text: "More forecasting projects fail here than at the model, and the failures are silent: a lag that points at the wrong row, a rolling window that spans a hole, a trailing day that reads as a collapse. Each check below is cheap, each catches a different fault, and the order matters because a later check assumes the earlier ones hold." },

    { t: "code", lang: "python", title: "The seven checks on sales_raw.csv (executed)",
      code: `raw = pd.read_csv("sales_raw.csv")                         # 2,740 rows; date dtype object; sorted: False
raw["date"] = pd.to_datetime(raw.date); raw = raw.sort_values(["store", "date"])            # 1. a real, sorted timestamp

dup = raw.duplicated(["store", "date"], keep=False)         # 3. duplicates: 18 rows on 3 dates (4-6 March 2024) -- an ETL re-run
raw = raw.drop_duplicates(["store", "date"])                #    summing them would double those days; here keep-first is right

full = raw.set_index("date").groupby("store").sales.apply(lambda s: s.asfreq("D"))          # 2 + 4. a regular grid with explicit NaN
full.isna().sum()                                           # 5 missing days: store B, 10-14 June 2024
# without asfreq, shift(1) on 15 June would have pointed at 9 June

last_day.sum() / same_weekday_last_week.sum()               # 7. the end: 217 vs 588 = 37 % -> a partial day; drop it
# 5. timezone: store UTC, display local (two 02:00s in autumn, none in spring, if you do not)
# 6. units and definitions: a mid-series redefinition looks exactly like a trend break -- version the definition`,
      caption: "Every planted fault is found by the check designed for it, and none by any other: the duplicates are invisible to asfreq, the missing days are invisible to drop_duplicates, and the partial last day passes both. The number of missing days is a number you must be able to explain before you model." },

    { t: "table", head: ["#", "Check", "What breaks if you skip it", "Fix"], rows: [
      ["1", "Index is a real timestamp, sorted ascending", "lags point at the wrong row", "`to_datetime`, `sort_index`"],
      ["2", "Frequency is regular", "`shift(1)` stops meaning 'yesterday'", "`asfreq` / `resample`"],
      ["3", "No duplicate timestamps", "one row silently overwrites — or doubles — another", "inspect, then `drop_duplicates` or `groupby.sum`, whichever the duplication means"],
      ["4", "Gaps are explicit NaN, not absent rows", "rolling windows span the gap invisibly (§03)", "`asfreq` inserts them"],
      ["5", "Timezone fixed and DST-aware", "two 02:00 rows in autumn, none in spring", "store UTC, display local"],
      ["6", "Units and definitions constant", "a redefinition reads as a trend break", "version the definition, add a regressor at the change"],
      ["7", "The series ends where you think", "a trailing partial period reads as a crash", "drop the incomplete last bucket"]
    ] },

    { t: "h2", n: "03", text: "Missing values, outliers, events and shifts", id: "missing" },

    { t: "p", text: "A gap in a series is not a missing cell; it is a missing day, and whatever you put there flows into every lag, window and difference that touches it. The treatment follows from what the gap *means*. A sensor that dropped out measured nothing, but the quantity existed: interpolate. A shop that was closed sold nothing: fill zero and add a `closed` flag, because zero is a value the model must learn to expect on those dates. A product not yet launched has no series yet: truncate. A public holiday is a real, explainable dip: keep it and add a regressor. A backfill lag in the pipeline means the value will arrive later: exclude the tail from training rather than fill it. And one method is never right for a series you will model." },

    { t: "code", lang: "python", title: "Backward fill is leakage written as a method call (executed: store B's five-day gap, naive one-step forecast)",
      code: `#                     values written into 10-14 June          naive error on 15 June (a REAL day, 206.2)    on 10 June
# interpolate("time")   143.3, 155.8, 168.4, 181.0, 193.6              12.6                                        12.6
# ffill                 130.7 × 5                                       75.5                                         0.0
# bfill                 206.2 × 5                                        0.0   <- 15 June 'forecast' from its own value      75.5
# truth (never recorded) 130.6, 122.7, 136.2, 135.1, 167.2              39.0                                         0.0`,
      caption: "bfill copies 15 June's value into 10–14 June, so a model that uses yesterday's value predicts 15 June perfectly: a real day scored against a copy of itself. Forward fill is safe on history but freezes the last value across the gap, which flatters any naive baseline it is compared with. Interpolation is honest and is still an invention — the truth was 147 on average and the interpolated window says 168." },

    { t: "p", text: "Outliers and events look alike on a chart and are opposites in treatment. A spike with a name — Black Friday, a campaign, an outage you can date — is an **event**, and it gets a regressor column, because it will happen again and the model should predict it. A spike with no name is an **outlier**, and it gets clipped or set missing, because one 10× point can dominate a fit through the squared error. A permanent change of level — store C's refurbishment — is neither: a global outlier rule flags every day after it (five of five flags on store C fall after 1 September 2024), and the right treatment is a step regressor or a model that allows the break. The flagging itself has a trap on seasonal data." },

    { t: "code", lang: "python", title: "Robust flags against the raw series, then against the local season (executed, store A)",
      code: `med = s.rolling(7, center=True).median(); mad = (s - med).abs().rolling(7, center=True).median()
robust_z = 0.6745 * (s - med) / mad                          # 50 flags: 1 Jan 2023 (closed) ... then Saturday after Saturday
# a 7-day window's median is a weekday; a Saturday at 1.30× the weekday level is 'far from the local median' every week

ratio = s / same_weekday_rolling_median(s, weeks=9)          # compare each day with the same weekday around it
robust_z2 = 0.6745 * (ratio - 1) / local_mad(ratio - 1)      # 34 flags, and now they mean something:
#   −17.3  2023-01-01  0.0    closed          −5.7  2023-12-25  0.0    closed         −10.3  2024-02-17    3.1   <- the till fault
#    +5.5  2023-11-24  360.5  Black Friday    +6.4  2024-11-29  477.0  Black Friday   −10.6  2025-06-30  104.2   <- the partial day
#   and 25 promotion days at +3.5 to +5.2 -- named events once the promo calendar is joined`,
      caption: "The first rule flags the season; the second flags the closures, the two Black Fridays, the till fault, the partial last day and the promotions — every one of which has a name except the fault. Look at every flag before deciding: this list becomes the `closed`, `black_friday` and `promo` columns of the clean file, and one clipped value." },

    { t: "callout", kind: "trap", title: "Fix the data before you look for structure", body: "Each of the faults above would have survived into a model and produced a plausible number. The duplicated days become a 'spike' the model tries to learn. The absent rows make the 7-day rolling mean on 15 June an average of 4–9 June plus 15 June — 166.6, a number that looks fine and spans a hole. The partial last day is a 63 % drop the model will forecast forward. The till fault is a −10 sd residual that widens every prediction interval. None of them raises an error." },

    { t: "h2", n: "04", text: "Classical decomposition, worked on twelve numbers", id: "decomposition" },

    { t: "p", text: "Decomposition splits a series into trend, season and remainder so that each can be seen alone: y = T + S + R additively, or y = T × S × R multiplicatively. It is a diagnostic more than a model — its job is to tell you the season length, whether the trend has a break, and whether the remainder has anything left in it. The classical procedure is worked here on twelve quarterly numbers built as trend 30 + 1.5t plus a seasonal pattern of −3, +1, −4, +6, so that every intermediate value is exact and the pattern is recovered from the data alone." },

    { t: "code", lang: "text", title: "Twelve numbers, four stages (executed; the arithmetic is exact)",
      code: `t :   1     2     3     4  |   5     6     7     8  |   9    10    11    12
y : 28.5  34.0  30.5  42.0 | 34.5  40.0  36.5  48.0 | 40.5  46.0  42.5  54.0

STAGE 1  trend by a 2×4 centred moving average (m = 4 is even, so a plain 4-average sits between two quarters; average two of them)
  T_t = (½ y_{t−2} + y_{t−1} + y_t + y_{t+1} + ½ y_{t+2}) / 4
  T_3 = (½·28.5 + 34.0 + 30.5 + 42.0 + ½·34.5) / 4 = (14.25 + 34 + 30.5 + 42 + 17.25) / 4 = 138 / 4 = 34.5
  T   :  —     —    34.5  36.0  37.5  39.0  40.5  42.0  43.5  45.0   —     —        rises by exactly 1.5 a quarter; no estimate at the ends

STAGE 2  detrend  d_t = y_t − T_t
  d   :  —     —    −4.0  +6.0  −3.0  +1.0  −4.0  +6.0  −3.0  +1.0   —     —

STAGE 3  average by position in the season, then force the indices to sum to zero
  Q1: (−3.0 − 3.0)/2 = −3.0     Q2: (+1.0 + 1.0)/2 = +1.0     Q3: (−4.0 − 4.0)/2 = −4.0     Q4: (+6.0 + 6.0)/2 = +6.0     sum 0.0

STAGE 4  remainder  R_t = y_t − T_t − S_t  =  0.0 at every t that has a trend estimate

with N(0, 1) noise added to the same twelve numbers, one draw: indices −2.44, +1.20, −4.26, +5.51 (truth −3, +1, −4, +6); remainder sd 0.57`,
      caption: "The centred average cannot see past the ends, so the first and last two quarters have no trend and no remainder; with only three years, each seasonal index is the mean of two numbers. STL replaces the moving average with a LOESS fit that reaches the ends, lets the season change shape slowly, and downweights outliers when `robust=True`." },

    { t: "viz",
      title: "The twelve numbers and their centred-moving-average trend",
      caption: "The series (points) oscillates around a straight trend (line) by exactly the seasonal index of its quarter: −3, +1, −4, +6. The trend exists only where the 2×4 window fits.",
      svg: `<svg viewBox="0 0 720 300" role="img" aria-label="Twelve quarterly values plotted against time with the eight-point centred moving average trend as a straight line from 34.5 at t=3 to 45 at t=10.">
  <line x1="50" y1="270" x2="690" y2="270" stroke="var(--line)"/><line x1="50" y1="270" x2="50" y2="40" stroke="var(--line)"/>
  <g font-size="11" fill="var(--ink-3)" font-family="ui-monospace, monospace">
    <text x="26" y="274">25</text><text x="26" y="201">35</text><text x="26" y="127">45</text><text x="26" y="54">55</text>
    <text x="56" y="288">1</text><text x="111" y="288">2</text><text x="166" y="288">3</text><text x="221" y="288">4</text><text x="276" y="288">5</text><text x="331" y="288">6</text><text x="386" y="288">7</text><text x="441" y="288">8</text><text x="496" y="288">9</text><text x="549" y="288">10</text><text x="604" y="288">11</text><text x="659" y="288">12</text>
  </g>
  <polyline points="60,244.3 115,204 170,229.7 225,145.3 280,200.3 335,160 390,185.7 445,101.3 500,156.3 555,116 610,141.7 665,57.3" fill="none" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="3 3"/>
  <line x1="170" y1="200.3" x2="555" y2="123.3" stroke="var(--accent)" stroke-width="2.5"/>
  <g fill="var(--ink)">
    <circle cx="60" cy="244.3" r="4"/><circle cx="115" cy="204" r="4"/><circle cx="170" cy="229.7" r="4"/><circle cx="225" cy="145.3" r="4"/><circle cx="280" cy="200.3" r="4"/><circle cx="335" cy="160" r="4"/><circle cx="390" cy="185.7" r="4"/><circle cx="445" cy="101.3" r="4"/><circle cx="500" cy="156.3" r="4"/><circle cx="555" cy="116" r="4"/><circle cx="610" cy="141.7" r="4"/><circle cx="665" cy="57.3" r="4"/>
  </g>
  <g font-size="11" font-family="ui-sans-serif, system-ui, sans-serif">
    <text x="150" y="250" fill="var(--crit)">−4</text><text x="230" y="140" fill="var(--good)">+6</text><text x="262" y="222" fill="var(--crit)">−3</text><text x="340" y="150" fill="var(--good)">+1</text>
    <text x="575" y="120" fill="var(--accent)">trend: 2×4 CMA, t = 3 … 10</text>
  </g>
</svg>` },

    { t: "h2", n: "05", text: "Additive or multiplicative, and what STL says about the daily series", id: "multiplicative" },

    { t: "p", text: "The choice is read from how the seasonal swing behaves as the level changes: if the swing stays the same size in units, the components add; if it grows with the level, they multiply, and the right move is to model log(y), which turns the product into a sum for everything downstream. On the store data the evidence is across stores rather than across time, because the trend is slow: the Saturday-minus-Monday swing is 96.9 at store A, 59.0 at B and 41.3 at C, and divided by each store's level that is 0.422, 0.444 and 0.446 — one ratio, three levels. Pooled across the stores, the 28-day rolling standard deviation has a Spearman correlation of 0.931 with the rolling mean. The generator multiplied, and the data says so." },

    { t: "code", lang: "python", title: "STL on the daily series, and the weekly factors recovered (executed, store A, closures interpolated)",
      code: `res = STL(np.log(s), period=7, robust=True).fit()
strength_S = 1 - var(R) / var(S + R)                        # seasonal strength 0.759 (0.737 on the raw scale)
strength_T = 1 - var(R) / var(T + R)                        # trend strength    0.681 (0.626)

exp(res.seasonal.groupby(weekday).mean()) / mean            # Mon..Sun  0.861  0.891  0.948  1.008  1.151  1.282  0.859
seasonal_decompose(s, "multiplicative", period=7)           #           0.862  0.890  0.941  1.004  1.165  1.284  0.854
# built as                                                  #           0.85   0.90   0.95   1.00   1.15   1.30   0.85

exp(mean(log s)) = 224.3   vs   mean(s) = 229.7             # a log-scale forecast, exponentiated, is a MEDIAN
exp(σ² / 2) with σ = 0.217  ->  × 1.024                     # the lognormal correction if the business wants an expected value`,
      caption: "Both procedures recover the weekly factors to within about 0.02, with the promotions and yearly cycle still in the series. STL's strengths put a number on what the plot shows: three quarters of the non-trend variance is weekly season, and the remainder carries the promotions, the yearly cycle (period 365 was not asked for) and the noise." },

    { t: "dl", items: [
      ["seasonal_decompose", "The classical procedure above: centred moving average, fixed indices. Quick, transparent, loses the ends, cannot follow a season that changes shape."],
      ["STL", "Seasonal-Trend decomposition by LOESS. Reaches the ends, lets the seasonal pattern evolve, `robust=True` downweights outliers. The default diagnostic for one season."],
      ["MSTL", "STL applied for several periods at once — daily data with a weekly and a yearly cycle, hourly data with daily and weekly. `MSTL(s, periods=(7, 365))`."],
      ["X-13ARIMA-SEATS", "Model-based, with trading-day and holiday adjustment; the standard for official statistics and the wrong amount of machinery for a store's sales."]
    ] },

    { t: "ladder",
      title: "Starting a forecasting project",
      rungs: [
        { level: "bad", label: "Load, shuffle, fit, report", code: `df = pd.read_csv("sales_raw.csv"); X, y = features(df), df.sales
cross_val_score(model, X, y, cv=5, shuffle=True)      # MAE 22.3`,
          note: "**Duplicated days learned as spikes, a hole spanned by every window, a partial day forecast forward, and a score 29 % better than reality.** Nothing in this sequence raises an error." },
        { level: "ok", label: "Hygiene, then a forward split", code: `s = to_regular_series(raw)                            # sorted, deduplicated, asfreq('D'), tail dropped
s = s.interpolate("time")                              # every gap, the same way
forward_folds(model, X, y)                             # MAE 31.3`,
          note: "The score is honest. The interpolation is applied blindly — the closures become interpolated 'sales' and the model never learns that 25 December is zero." },
        { level: "best", label: "Hygiene, gap-by-meaning, events as regressors, decomposition as the diagnostic", code: `s = to_regular_series(raw)
s[closed] = 0; flags = same_weekday_robust_z(s) > 3.5   # look at each flag: closed / event / fault
X["closed"], X["promo"], X["black_friday"] = ...         # named spikes become columns
s.loc["2024-02-17"] = np.nan; s = s.interpolate("time")   # the one unnamed fault
STL(np.log(s), period=7, robust=True)                   # multiplicative; strengths 0.76 / 0.68; season length confirmed`,
          note: "Every decision is traceable to a look at the data, the events will be forecast rather than smoothed away, and the transformation (logs) and the season length (7) are settled before any model is chosen." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The shuffled 5-fold MAE was 22.3 and the forward-only MAE 31.3 for the same model and features. What is the mechanism?",
          options: [
            "The forward folds are smaller",
            "In a shuffled split most test rows have their immediate neighbours in the training set (67 % had both t−1 and t+1), so the model interpolates between known values — a task it will never face in use",
            "The forward folds include the holidays",
            "Gradient boosting overfits time indices"
          ],
          answer: 1,
          why: "A series is autocorrelated, so a row's neighbours nearly determine it; giving the model those neighbours at test time is the same leak as giving it the answer's nearest relatives. The forward scheme recreates the forecasting moment, in which the future is unavailable, and also exposes the period-to-period variation (20 to 38) that a single shuffled number hides."
        },
        {
          stem: "Why did the 7-day robust z-score flag 50 days at store A, almost all Saturdays?",
          options: [
            "Saturdays have more noise",
            "A 7-day window's median is a weekday value, and a Saturday at 1.30 times the weekday level is 'far from the local median' every single week — the rule flags the season",
            "The MAD was computed on the wrong window",
            "The threshold 3.5 is too low for daily data"
          ],
          answer: 1,
          why: "Outlier rules assume the reference is what the point should look like; on a seasonal series the reference must share the season. Comparing each day with the same weekday in the surrounding nine weeks left 34 flags — closures, Black Fridays, promotions, the till fault and the partial day — each of which is real."
        },
        {
          stem: "A closed shop on 25 December, a sensor that dropped out for five days, and a product launched mid-series all appear as gaps. Why not one fill method?",
          options: [
            "One method is fine if it is interpolation",
            "The gaps mean different things — a real zero the model must learn, an unmeasured value that existed, and a series that has not begun — and each needs a different treatment: zero plus a flag, interpolation, truncation",
            "Because pandas cannot fill all three at once",
            "Because the gaps have different lengths"
          ],
          answer: 1,
          why: "Whatever is written into a gap flows into every lag and window; writing 'interpolated sales' into a closed day teaches the model that Christmas has sales, and writing zero into a sensor dropout teaches it a collapse that never happened. The fill is a statement about what happened, and it must be true."
        },
        {
          stem: "The swing-to-level ratio is 0.42, 0.44 and 0.45 at the three stores whose levels are 230, 133 and 93. What does that decide?",
          options: [
            "The stores should be modelled together",
            "The seasonal swing scales with the level, so the components multiply; model log(y) so that trend, season and noise become additive, and remember the exponentiated forecast is a median",
            "The weekly season is the same at every store",
            "Nothing — the ratio is a coincidence"
          ],
          answer: 1,
          why: "In an additive world the Saturday–Monday difference would be the same number of units at every store; a constant ratio across a 2.5× range of levels is the multiplicative signature, confirmed by the 0.93 correlation between rolling sd and rolling mean. On logs the swing becomes a constant shift, and every additive method applies; exp(mean of logs) was 224 against a mean of 230, and the σ²/2 correction recovers the difference."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "A multiplicative decomposition by hand, a level shift found, and a rolling window across a hole",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Twelve quarterly numbers were built as trend 100 + 5t times seasonal factors 0.8, 1.1, 0.9, 1.2: 84.0, 121.0, 103.5, 144.0, 100.0, 143.0, 121.5, 168.0, 116.0, 165.0, 139.5, 192.0. Work the classical *multiplicative* decomposition: 2×4 centred moving average, the ratio y/T, the mean ratio by quarter normalised to average 1, and the remainder. Then do it additively on the logs and compare the exponentiated indices — why do they not average exactly 1?" },
        { t: "p", text: "**(b)** Store C had a permanent level change. Fit `STL(log(sales), period=7, robust=True)`, find the largest 28-day rise in the exponentiated trend, and report the trend's median before and after 1 September 2024 and the raw monthly means for August and September 2024 and 2023. Then apply a *global* robust z-score to store C and say what it flags and why that is the wrong tool." },
        { t: "p", text: "**(c)** For store B, compute the 7-day rolling mean on 15 June 2024 four ways: with the five gap rows absent, with them present as NaN (`rolling(7)`), present as NaN with `min_periods=1`, and interpolated; and compare with the rolling mean of the true values. Which days did the absent-rows window actually average?" }
      ],
      requirements: [
        "(a) the four stages with numbers, and the explanation of the log version.",
        "(b) the change location and size, the medians, the monthly means, and the global-z verdict.",
        "(c) four numbers, the truth, and the list of days."
      ],
      hint: "(a) Multiplicative indices average 1; log-indices sum to 0, which is a geometric mean of 1. (b) Compare a month with the same month a year earlier to separate a shift from the yearly cycle. (c) With rows absent, `rolling(7)` counts rows, not days.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) 2×4 CMA (t = 3..10): 115.12  119.88  124.88  130.12  135.12  139.88  144.88  150.12
#     ratio y / T:          0.899   1.201   0.801   1.099   0.899   1.201   0.801   1.099
#     mean ratio by quarter: Q1 0.8007  Q2 1.0990  Q3 0.8991  Q4 1.2012   (sum 4.000, so normalising to mean 1 changes nothing)
#     remainder y / (T·S):   0.9999 .. 1.0001 -- the factors are recovered to three decimals; the CMA of a product is not exactly the trend
#     on logs: exp(indices) = 0.8102  1.1139  0.9116  1.2154 -- each 1.3 % above the truth, because log-indices that SUM to zero
#     have a geometric mean of 1, and the arithmetic mean of their exponentials is 1.0128 > 1 (Jensen). Divide by 1.0128 to compare.

# (b) largest 28-day rise in the STL trend: 25.7, centred on 24 August 2024 (the window 10 Aug - 7 Sep straddles the change)
#     trend median before 1 Sep 2024: 83.2; after: 105.1
#     raw monthly means: Aug 2024 89.5 -> Sep 2024 113.2;  Aug 2023 86.8 -> Sep 2023 81.3  -- the yearly cycle FALLS into September; the shift is real
#     global robust z on store C: 5 flags, all after the shift -- it treats the new level as five bad days and misses the change itself.
#     A level shift is a step regressor (or a model with a break), not an outlier.

# (c) rolling mean at 15 June 2024, store B:
#     rows absent (no asfreq)        166.6   <- the window was 4, 5, 6, 7, 8, 9 and 15 June: seven ROWS, fourteen days
#     NaN present, rolling(7)        NaN     <- honest: the window is incomplete
#     NaN present, min_periods=1     168.4   <- the mean of the two real days (9 and 15 June)
#     interpolated                   168.4   <- identical to the line above, because a linear fill's mean is the mean of its endpoints
#     truth (never recorded)         147.0`,
        notes: [
          { t: "p", text: "(a) is the multiplicative procedure and the Jensen detail that separates 'indices average 1' from 'log-indices sum to 0'." },
          { t: "p", text: "(b) shows why a shift is checked against the same period a year earlier, and why outlier rules cannot see it." },
          { t: "p", text: "(c) is check 4 in numbers: absent rows make a window span a hole with no warning, and two honest options remain — NaN, or an interpolation you can defend." }
        ]
      }
    }
  ],

  takeaways: [
    "A series' rows are dependent, so a shuffled split lets the model interpolate between neighbours (MAE 22.3 versus 31.3 forward-only, with 67 % of shuffled test rows flanked by training rows) and every √n statistic overstates the information: n = 200 with φ = 0.9 has the standard error of 10.5 independent points.",
    "Run the seven hygiene checks in order — timestamp sorted, regular grid, duplicates, explicit NaN gaps, timezone, constant definitions, complete last bucket — because each catches a fault the others cannot, and all of them fail silently.",
    "Fill a gap according to what it means: interpolate a dropout, zero-and-flag a closure, truncate before a launch, keep and regress a holiday, exclude a backfill tail. Never bfill a series you will model — it scored a real day against a copy of itself.",
    "Flag outliers against the local season, not the raw series: the raw rule marked 50 Saturdays, the same-weekday rule marked the closures, Black Fridays, promotions, the till fault and the partial day. Named spikes become regressors; unnamed ones are clipped; a level shift is a step, not an outlier.",
    "Classical decomposition — 2×4 centred moving average, detrend, average by season position, force the indices to sum to zero — recovers −3, +1, −4, +6 exactly from twelve numbers; STL reaches the ends, follows a changing season and resists outliers, and its strength statistics (0.76 seasonal, 0.68 trend) quantify the plot.",
    "Read additive versus multiplicative from the swing against the level: a constant ratio across stores (0.42–0.45) and a 0.93 correlation of rolling sd with rolling mean mean model log(y), and the exponentiated forecast is a median that needs exp(σ²/2) to become a mean.",
    "Decomposition is a diagnostic: it settles the transformation, the season length and whether the remainder has structure, before any model is fitted."
  ],

  quiz: {
    title: "Time Series Foundations and Data Hygiene — Knowledge Check",
    questions: [
      {
        stem: "A colleague reports a 95 % confidence interval for a store's mean daily sales computed as mean ± 1.96 sd/√n over 200 days. The series has lag-1 autocorrelation of about 0.9. What is wrong?",
        options: [
          "Nothing — the central limit theorem applies",
          "The interval is far too narrow: with φ = 0.9 the 200 days carry the information of about 10 independent observations, and the true standard error is roughly four times larger",
          "The interval should use the median",
          "Autocorrelation makes the mean biased"
        ],
        answer: 1,
        why: "The variance of a mean of autocorrelated observations is inflated by (1 + φ)/(1 − φ) relative to the i.i.d. case; simulated, the sd of the mean was 0.678 against the formula's 0.162. HAC standard errors or a block bootstrap are the fixes; the mean itself is unbiased."
      },
      {
        stem: "A raw feed arrives with three days loaded twice. Which is right: `groupby(date).sum()` or `drop_duplicates()`?",
        options: [
          "Always sum — it is the standard idiom",
          "Always drop — duplicates are errors",
          "It depends on what the duplication means: an ETL re-run of identical rows should be deduplicated, while several genuine partial records for one day should be summed; look before choosing",
          "Neither — keep both rows"
        ],
        answer: 2,
        why: "Check 3 exists because either default can be wrong: summing an accidental re-load doubles those days and the model learns a spike; dropping genuine partials halves them. The executed case was a re-run of identical rows, so keep-first was right. The fix is chosen from an inspection of the duplicated rows, not from habit."
      },
      {
        stem: "Why does the classical decomposition lose the first and last two quarters of a quarterly series?",
        options: [
          "The seasonal indices need two full years",
          "The 2×4 centred moving average needs two observations on each side of t, so no trend estimate exists at t = 1, 2, 11, 12 — and without a trend there is no detrended value or remainder there",
          "The first year is used to initialise the level",
          "Quarterly data always has four missing values"
        ],
        answer: 1,
        why: "The centred window is symmetric by design so that the trend is not shifted in time, and the price is the ends. STL's LOESS trend extends to the edges, which matters most in forecasting, where the most recent points are exactly the ones a centred average discards."
      },
      {
        stem: "Which observation would argue for an *additive* model of the store data instead of the multiplicative one the lesson chose?",
        options: [
          "The stores have different levels",
          "The Saturday-minus-Monday swing being about 97 units at every store regardless of level, rather than about 0.43 times the level",
          "The weekly pattern repeating every seven days",
          "Sales being positive"
        ],
        answer: 1,
        why: "Additive means the seasonal effect is a fixed number of units; multiplicative means a fixed proportion. The data showed swings of 96.9, 59.0 and 41.3 for levels of 230, 133 and 93 — proportional — which is why logs are taken. A constant swing in units across those levels would have said the opposite."
      },
      {
        stem: "The extract for the last day ran mid-afternoon, so 30 June shows 37 % of a normal Monday. If it is left in, what happens downstream?",
        options: [
          "Nothing — one day cannot matter",
          "A model forecasts the drop forward, an outlier rule flags it as a −10 sd fault (it did), and the last point — the most influential one for any forecast — is wrong in every method",
          "The seasonal indices absorb it",
          "Only the MAPE is affected"
        ],
        answer: 1,
        why: "The end of the series is the anchor of every forecast: exponential smoothing's level, ARIMA's last residuals, a lag-1 feature. A partial period reads as a collapse and propagates into the whole horizon. Check 7 — drop the incomplete last bucket — is the cheapest check on the list and the one with the largest effect when skipped."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Time Series Foundations and Data Hygiene",
    sub: "Why the tabular toolkit fails on a sequence, the discipline that replaces it, and reading a decomposition.",
    questions: [
      {
        level: "Core",
        q: "Why can you not use ordinary K-fold cross-validation on a time series?",
        strong: "Because the rows are dependent and the task is extrapolation. In a shuffled fold most test rows have their immediate neighbours in the training set — 67 % had both t−1 and t+1 in my executed check — so the model interpolates between known values, which is far easier than predicting an unseen future. The reported error is a fiction: 22.3 shuffled against 31.3 when every test point followed every training point, for the same model and features. Forward-only evaluation also reveals what a single number hides: the error varies by period, 20 to 38 across my five folds, and that variation is what the business will experience. The rule I use is that a split described without the words 'before' and 'after' is wrong.",
        answer: [
          { t: "p", text: "Dependence and interpolation, the executed gap, the period-to-period variation, and the before/after rule." }
        ]
      },
      {
        level: "Core",
        q: "How do you decide between an additive and a multiplicative decomposition?",
        strong: "From how the seasonal swing behaves as the level changes. If the swing is a constant number of units, the components add; if it is a constant proportion of the level, they multiply. I look for it two ways: the seasonal amplitude at different levels — across stores, the Saturday–Monday swing was 0.42 to 0.45 of the level at levels of 93 to 230 — and the correlation between a rolling standard deviation and a rolling mean, 0.93 in that data. Multiplicative means I model log(y), which makes trend, season and noise additive for everything downstream, and I remember that exponentiating a log-scale forecast gives a median — 224 against a mean of 230 there — and add σ²/2 if an expected value is wanted. Box–Cox is the general version when logs over- or under-correct.",
        answer: [
          { t: "p", text: "Swing versus level, the two checks with numbers, the log transform, and the median caveat." }
        ]
      },
      {
        level: "Senior",
        q: "Walk me through what you do with a raw daily feed before any model.",
        strong: "Seven checks in a fixed order, because each assumes the previous. Parse the timestamps and sort. Look for duplicate stamps and inspect them before choosing: an ETL re-run of identical rows is deduplicated, genuine partial records are summed — my file had three days loaded twice. Put the series on a regular grid with asfreq so that gaps become explicit NaN — five absent days appeared, and without that step a rolling week on the day after the gap averaged fourteen calendar days and a lag-1 pointed six days back. Fix the timezone as UTC. Confirm units and definitions did not change mid-series. Check the last bucket is complete — mine was a 37 % partial day. Then the gaps by meaning: interpolate dropouts, zero-and-flag closures, truncate pre-launch, never backward-fill because it copies the future into the past and scored a real day against itself. Then flag outliers against the same weekday, not the raw series, look at every flag, turn the named ones into regressor columns and clip the unnamed one. Then decompose, which settles logs versus raw and the season length. Only then a model.",
        answer: [
          { t: "p", text: "The seven checks with what each caught, gaps by meaning, the bfill leak, seasonal outlier flagging, and decomposition as the last diagnostic." }
        ]
      },
      {
        level: "Senior",
        q: "A rolling seven-day mean feature looks fine but you suspect the series has holes. How would the fault show, and how do you make it impossible?",
        strong: "It would not show — that is the problem. With absent rows, `rolling(7)` counts rows rather than days, so on the day after a five-day hole the window averaged 4 to 9 June plus 15 June: seven rows across fourteen days, a plausible 166.6, no warning. The only structural fix is check 4: put the series on a regular grid with asfreq so that missing days exist as NaN, at which point `rolling(7)` returns NaN for any window touching the hole and forces a decision — leave it NaN, use min_periods and accept a mean of two days, or interpolate, which for a linear fill gives exactly the mean of the endpoints, 168.4, against a truth of 147. I also add an assertion in the pipeline that the index frequency is set and the row count equals the day count, so the fault cannot recur silently.",
        answer: [
          { t: "p", text: "The silent row-counting window, asfreq as the structural fix, the three honest options with numbers, and the pipeline assertion." }
        ]
      },
      {
        level: "Staff",
        q: "Store C's sales jump 30 % in September 2024 and stay there. The outlier rule flags five September days. What is going on and what do you do?",
        strong: "The rule has found a level shift and misread it as five bad days, because a global rule measures distance from the whole series' median and the new level is far from it. First I confirm it is a shift and not the season: August to September 2024 rose from 89.5 to 113.2, while the same months a year earlier fell from 86.8 to 81.3 — the yearly cycle goes down into September, so the rise is real. The STL trend shows it as a 25.7 rise in a 28-day window straddling 1 September, with medians of 83 before and 105 after. Then I find the cause — a refurbishment, dated — and treat it as an event: a step regressor from that date, or a model that allows a structural break, and if the shift is recent enough that the post-shift history is short, I weight or truncate training so the old level does not pull the forecast down. What I do not do is clip those days, which would forecast the old level forever, or let a global z-score decide anything on a series with a trend.",
        answer: [
          { t: "p", text: "Shift versus season by the year-earlier comparison, the STL evidence, the step-regressor treatment, and the two wrong moves." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 10.4 — Exponential Smoothing and ETS
   ========================================================================= */
EC.receiveLesson({
  id: "10.4",

  lede: "**Exponential smoothing forecasts with a weighted average of the past whose weights shrink geometrically, and then adds one recursion for the trend and one for the season — three equations that a spreadsheet can run and that the M-competitions kept finding hard to beat.** Each form is iterated by hand on the twelve quarterly numbers. Simple smoothing with α = 0.3 reaches a level of 33.99 after five points and forecasts a flat line. Holt's method reads the seasonal dips as a collapsing trend and drags the slope from 5.5 to 3.47 in four steps. Holt–Winters, initialised from the first two years, produces one-step forecasts with an MAE of 1.88, migrates the seasonal indices from (−5.25, 0.25, −3.25, 8.25) toward the truth, and forecasts year four within 0.9 of it; statsmodels with the same initialisation and parameters agrees to the tenths, and with everything estimated it recovers the generating process exactly. On the store's daily sales, four Holt–Winters forms score 20.2 to 21.0 against the seasonal naive's 23.1 and simple smoothing's 37.9, the fitted α of 0.08 says the level barely moves, and damping caps a trend that would otherwise add 37 units over a year. The lesson closes with the ETS taxonomy, its likelihood and intervals, and the equivalence between simple smoothing and ARIMA(0,1,1) verified to two decimals.",

  objectives: [
    "Iterate simple exponential smoothing, Holt's linear trend and Holt–Winters by hand, and state what each smoothing parameter does",
    "Explain why Holt's method fails on seasonal data and how the seasonal recursion fixes it",
    "Initialise Holt–Winters from the first seasons and explain why the initialisation matters on short series",
    "Use damping and explain what it does to a long-horizon forecast",
    "Navigate the ETS taxonomy, read its AIC and intervals, and state the SES ↔ ARIMA(0,1,1) equivalence"
  ],

  prerequisites: ["10.3", "10.1"],

  blocks: [

    { t: "h2", n: "01", text: "Simple exponential smoothing: one level, one parameter", id: "ses" },

    { t: "p", text: "The level is updated as ℓ_t = α y_t + (1 − α) ℓ_{t−1}, and every future value is forecast as the current level. Unrolling the recursion shows what it is: ℓ_t = α y_t + α(1 − α) y_{t−1} + α(1 − α)² y_{t−2} + …, a weighted average of all history with weights that sum to one and shrink geometrically. α is the only knob — near 1 trusts the newest point, near 0 trusts the long average — and the forecast is a flat line, which is exactly the limitation the next two forms remove." },

    { t: "code", lang: "text", title: "α = 0.3, ℓ₁ = y₁, on the twelve numbers (executed)",
      code: `t   y_t     forecast made at t−1     ℓ_t = 0.3·y_t + 0.7·ℓ_{t−1}
1   28.5    —                        28.5000  (initialised)
2   34.0    28.5000                  0.3·34.0 + 0.7·28.5000 = 10.200 + 19.9500 = 30.1500
3   30.5    30.1500                  0.3·30.5 + 0.7·30.1500 =  9.150 + 21.1050 = 30.2550
4   42.0    30.2550                  0.3·42.0 + 0.7·30.2550 = 12.600 + 21.1785 = 33.7785
5   34.5    33.7785                  0.3·34.5 + 0.7·33.7785 = 10.350 + 23.6449 = 33.9949

weights on y_t, y_{t−1}, y_{t−2}, ...: 0.300  0.210  0.147  0.103  0.072  0.050 ...   (sum to 1; the first twelve sum to 0.986)

one-step SSE over the twelve numbers:  α 0.1: 1101   α 0.3: 533   α 0.5: 443   α 0.9: 562     statsmodels' optimised α: 0.528, forecast 48.9
final level (= the forecast for every horizon):  38.1   45.6   48.6   52.9`,
      caption: "On a series that trends and cycles, the best α is high because the level is always behind, and the forecast is still a flat line at the last level: 48.9 for a series whose next four values are 46.5, 52.0, 48.5 and 60.0. Simple smoothing is right for a series with no trend and no season — a noisy level, the ARIMA(0,1,1) case of §05 — and wrong for this one by construction." },

    { t: "viz",
      title: "The weights simple smoothing puts on the past",
      caption: "Bars are α(1 − α)^k for k = 0 … 5. With α = 0.3 the last six observations carry 88 % of the weight; with α = 0.9 the last one carries 90 % and the rest is almost nothing — the naive forecast is α → 1.",
      svg: `<svg viewBox="0 0 700 250" role="img" aria-label="Two bar charts of geometric weights. Alpha 0.3: 0.30, 0.21, 0.15, 0.10, 0.07, 0.05. Alpha 0.9: 0.90, 0.09, 0.009 and then negligible.">
  <g font-size="12" fill="var(--ink-2)" font-family="ui-sans-serif, system-ui, sans-serif"><text x="60" y="26">α = 0.3</text><text x="410" y="26">α = 0.9</text></g>
  <g stroke="var(--line)"><line x1="50" y1="210" x2="320" y2="210"/><line x1="400" y1="210" x2="670" y2="210"/></g>
  <g fill="var(--accent)">
    <rect x="70" y="150" width="28" height="60"/><rect x="110" y="168" width="28" height="42"/><rect x="150" y="180.6" width="28" height="29.4"/><rect x="190" y="189.4" width="28" height="20.6"/><rect x="230" y="195.6" width="28" height="14.4"/><rect x="270" y="199.9" width="28" height="10.1"/>
    <rect x="420" y="30" width="28" height="180"/><rect x="460" y="192" width="28" height="18"/><rect x="500" y="208.2" width="28" height="1.8"/><rect x="540" y="209.8" width="28" height="0.2"/>
  </g>
  <g font-size="11" fill="var(--ink-3)" font-family="ui-monospace, monospace">
    <text x="74" y="145">.30</text><text x="114" y="163">.21</text><text x="154" y="176">.15</text><text x="194" y="185">.10</text><text x="234" y="191">.07</text><text x="274" y="195">.05</text>
    <text x="424" y="25">.90</text><text x="464" y="187">.09</text><text x="500" y="203">.009</text>
    <text x="80" y="228">t</text><text x="112" y="228">t−1</text><text x="152" y="228">t−2</text><text x="192" y="228">t−3</text><text x="232" y="228">t−4</text><text x="272" y="228">t−5</text>
    <text x="430" y="228">t</text><text x="462" y="228">t−1</text><text x="502" y="228">t−2</text><text x="542" y="228">t−3</text>
  </g>
</svg>` },

    { t: "h2", n: "02", text: "Holt's linear trend, and why it fails on a season", id: "holt" },

    { t: "p", text: "Holt adds a slope: ℓ_t = α y_t + (1 − α)(ℓ_{t−1} + b_{t−1}) updates the level toward the observation from where the trend said it would be, b_t = β(ℓ_t − ℓ_{t−1}) + (1 − β) b_{t−1} updates the slope toward the level's latest change, and the forecast is ℓ_t + h b_t, a straight line. Worked with α = 0.5, β = 0.3 from ℓ₁ = 28.5 and b₁ = y₂ − y₁ = 5.5:" },

    { t: "code", lang: "text", title: "Four steps of Holt on the twelve numbers (executed)",
      code: `t  y_t    forecast ℓ + b            new ℓ = 0.5·y + 0.5·forecast         new b = 0.3·(ℓ_t − ℓ_{t−1}) + 0.7·b_{t−1}
3  30.5   28.5000 + 5.5000 = 34.0000   0.5·30.5 + 0.5·34.0000 = 32.2500     0.3·(32.2500 − 28.5000) + 0.7·5.5000 = 4.9750
4  42.0   32.2500 + 4.9750 = 37.2250   0.5·42.0 + 0.5·37.2250 = 39.6125     0.3·(39.6125 − 32.2500) + 0.7·4.9750 = 5.6912
5  34.5   39.6125 + 5.6912 = 45.3037   0.5·34.5 + 0.5·45.3037 = 39.9019     0.3·(39.9019 − 39.6125) + 0.7·5.6912 = 4.0707
6  40.0   39.9019 + 4.0707 = 43.9726   0.5·40.0 + 0.5·43.9726 = 41.9863     0.3·(41.9863 − 39.9019) + 0.7·4.0707 = 3.4748

the true slope is 1.5 a quarter; b started at 5.5 (a Q1-to-Q2 jump that is mostly season) and each seasonal dip drags it further`,
      caption: "Holt has no season, so it reads every dip as the trend collapsing and every peak as the trend accelerating; the slope swings between 3.5 and 5.7 around a truth of 1.5, and the forecast at t = 5 (45.3) is 10.8 above the actual. This is the failure Holt–Winters exists to fix." },

    { t: "callout", kind: "production", title: "Damp the trend", body: [{ t: "p", text: "An undamped trend extrapolated a year out produces numbers nobody will sign off. The damped form replaces h·b_t by (φ + φ² + … + φʰ) b_t with 0 < φ < 1: for φ = 0.9 the multiplier is 0.9 at h = 1, 3.1 at h = 4, 6.5 at h = 12 and 9.0 at h = 52, with an asymptote of φ/(1 − φ) = 9 slopes however far out. On the store, the undamped Holt–Winters forecast rose from 251.6 at h = 28 to 288.9 at h = 364; the damped fit (φ = 0.988) went 253.3 → 261.6. Neither knows the yearly cycle, but the damped one stops inventing a trend from the last few months. Damping is the highest-value default change in this family; the M3 and M4 competitions found the damped trend the single most robust method." }] },

    { t: "h2", n: "03", text: "Holt–Winters: level, slope and season", id: "holt-winters" },

    { t: "p", text: "The additive form keeps m seasonal indices and updates the one for the current position: ℓ_t = α(y_t − s_{t−m}) + (1 − α)(ℓ_{t−1} + b_{t−1}) deseasonalises the observation before updating the level; b_t = β(ℓ_t − ℓ_{t−1}) + (1 − β) b_{t−1} as before; s_t = γ(y_t − ℓ_t) + (1 − γ) s_{t−m} moves the index toward the observation's departure from the level; and the forecast is ℓ_t + h b_t + s_{t+h−m}. It needs starting values, and on a short series they matter: the level from the first season's mean, the slope from the difference between the first two seasons' means divided by m, the indices from the first season minus its mean." },

    { t: "code", lang: "text", title: "Holt–Winters additive, α 0.4, β 0.2, γ 0.3, m = 4, on the twelve numbers (executed)",
      code: `initialise from years 1 and 2:
  ℓ0 = mean(28.5, 34.0, 30.5, 42.0) = 33.75      b0 = (mean year 2 − mean year 1)/4 = (39.75 − 33.75)/4 = 1.5      s = y1..4 − ℓ0 = (−5.25, +0.25, −3.25, +8.25)

t    y_t    one-step forecast ℓ + b + s_{t−4}                 new ℓ      new b     new s_t
5   34.5    33.7500 + 1.5000 + (−5.2500) = 30.0000            37.0500    1.8600    −4.4400
6   40.0    37.0500 + 1.8600 + (+0.2500) = 39.1600            39.2460    1.9272    +0.4012
7   36.5    39.2460 + 1.9272 + (−3.2500) = 37.9232            40.6039    1.8133    −3.5062
8   48.0    40.6039 + 1.8133 + (+8.2500) = 50.6673            41.3504    1.6000    +7.7699
9   40.5    41.3504 + 1.6000 + (−4.4400) = 38.5103            43.7462    1.7591    −4.0819
10  46.0    43.7462 + 1.7591 + (+0.4012) = 45.9065            45.5427    1.7666    +0.4180
11  42.5    45.5427 + 1.7666 + (−3.5062) = 43.8032            46.7881    1.6624    −3.7407
12  54.0    46.7881 + 1.6624 + (+7.7699) = 56.2203            47.5623    1.4847    +7.3702

one-step MAE over t = 5..12: 1.880
year-4 forecasts ℓ + h·b + s:  44.965  50.950  48.276  60.871     truth 46.5  52.0  48.5  60.0    (MAE 0.92)
seasonal indices after twelve points: (−4.08, +0.42, −3.74, +7.37), from a start of (−5.25, +0.25, −3.25, +8.25), truth (−3, +1, −4, +6)

statsmodels ExponentialSmoothing, same initialisation and parameters (optimized=False): 45.209  50.634  47.450  59.959
statsmodels with everything estimated:  α 0.208  β 0.001  γ 0.754  ->  46.5  52.0  48.5  60.0   -- exact: the series is noise-free`,
      caption: "The recursion learns: the slope settles near 1.5 and the indices migrate toward the truth, and the exercise shows that a larger γ gets them there faster on a noise-free series. statsmodels' 'same initialisation' forecasts differ from the hand table in the tenths because its implementation applies the initial seasonal indices with a different alignment; with everything estimated it finds the generating process because there is no noise to fit. On real data the estimated β is usually near zero — the slope is set by the initialisation and barely updated." },

    { t: "code", lang: "python", title: "On the store: five smoothing forms backtested (executed, store A, h = 28, 10 origins, refit at each)",
      code: `#  form                                  MAE     sd across origins
#  seasonal naive, 4-week mean           23.10        3.24        <- the baseline from 10.3 on these origins
#  Holt–Winters additive (A,A,A)         20.16        3.56
#  Holt–Winters additive, damped         20.99        3.52
#  Holt–Winters multiplicative, damped   20.76        3.62
#  Holt–Winters additive on log, damped  20.63        3.27
#  simple exponential smoothing          37.93        4.43        <- no season: wrong by a weekday most days

fitted on the whole series, (A,Ad,M):  α 0.084   β 0.015   γ 0.000   φ 0.988
seasonal factors by weekday (Mon..Sun): 0.824  0.844  0.898  0.958  1.108  1.223  0.810      built as 0.85 0.90 0.95 1.00 1.15 1.30 0.85`,
      caption: "All four seasonal forms beat the baseline by 9–13 %, and they are within one standard deviation of each other: on a series with a stable season the choice between additive, multiplicative and log is second-order, and the backtest, not the theory, should make it. The fitted α of 0.08 says the level moves slowly — a week of noise should not move it — and γ = 0.000 says the weekly pattern did not change over the fit, which is true of the generator." },

    { t: "h2", n: "04", text: "The ETS taxonomy", id: "ets" },

    { t: "p", text: "Exponential smoothing is a family of thirty models named by three letters — Error, Trend, Season — each Additive, Multiplicative or None, with the trend optionally damped (Ad). Hyndman's state-space formulation gives every member a likelihood, so parameters are estimated by maximum likelihood rather than by minimising the one-step SSE, AIC can compare members, and prediction intervals follow from the model instead of from a residual bootstrap. The error term is the difference that matters most: additive errors have constant variance, multiplicative errors scale with the level — the 10.1 diagnosis again." },

    { t: "table", head: ["Name", "ETS", "Equivalent ARIMA", "Notes"], rows: [
      ["Simple exponential smoothing", "(A,N,N)", "ARIMA(0,1,1), θ = α − 1", "a noisy level"],
      ["Holt's linear trend", "(A,A,N)", "ARIMA(0,2,2)", "an undamped straight line"],
      ["Damped trend", "(A,Ad,N)", "ARIMA(1,1,2)", "the M-competition workhorse"],
      ["Holt–Winters additive", "(A,A,A)", "none", "constant seasonal swing"],
      ["Holt–Winters multiplicative", "(A,A,M) / (M,A,M)", "none", "swing proportional to the level"],
      ["Multiplicative errors", "(M,·,·)", "none", "variance scales with the level; a different likelihood from (A,·,·)"]
    ] },

    { t: "code", lang: "python", title: "ETSModel: likelihood, AIC, intervals, and the ARIMA equivalence checked (executed)",
      code: `ets = ETSModel(sales, error="mul", trend="add", damped_trend=True, seasonal="mul", seasonal_periods=7).fit()
ets.get_prediction(start=n, end=n + 27).summary_frame(alpha=0.2)     # mean, pi_lower, pi_upper
# ETS(M,Ad,M): AIC 8524; 80 % interval width 73.3 at h = 1, 84.4 at h = 28 -- it widens, slowly, because α is small

#  ETS(A,A,A)  AIC 8615.8      ETS(A,Ad,A)  AIC 8619.2     <- comparable with each other (additive errors)
#  ETS(M,Ad,M) AIC 8523.7      ETS(M,N,M)   AIC 8515.8     <- comparable with each other (multiplicative errors), NOT with the row above

# SES == ARIMA(0,1,1): a random walk plus measurement noise, 500 points
SimpleExpSmoothing(y).fit().params["smoothing_level"]      # α = 0.427
ARIMA(y, order=(0, 1, 1)).fit().params[0]                  # θ = −0.571;  theory θ = α − 1 = −0.573
# next-step forecasts −13.376 vs −13.379`,
      caption: "The equivalence is exact in the limit: ARIMA(0,1,1) with θ = α − 1 produces the same forecasts as simple smoothing with parameter α, which is why the two families overlap without either containing the other — ETS covers multiplicative seasonality and errors that ARIMA cannot express without logs, ARIMA covers autocorrelation structures that ETS cannot. Fit both and let the backtest choose." },

    { t: "callout", kind: "trap", title: "Three ways the fit goes wrong", body: [{ t: "p", text: "**Initialisation on a short series.** With two seasons of data the initial indices are the first season's departures from its mean, noise included, and γ has little chance to correct them; on the twelve numbers the indices were still 1.4 off the truth after eight updates with γ = 0.3. Prefer `initialization_method='estimated'`, and distrust any seasonal fit on fewer than three cycles. **Multiplicative forms on zeros.** A multiplicative season or error divides by the level; a closed day at zero breaks it. Interpolate closures for the fit and add them back afterwards, or use the additive form on logs with a floor. **The optimiser's boundary.** Fitted parameters of exactly 0.000 or 1.000 — the store's γ, the noise-free β — are the optimiser at the edge of its box, not an estimate; statsmodels warns about it, and a backtest with a small fixed value is the check." }] },

    { t: "ladder",
      title: "Fitting exponential smoothing to a seasonal series",
      rungs: [
        { level: "bad", label: "Simple smoothing, because it is simple", code: `SimpleExpSmoothing(sales).fit().forecast(28)      # MAE 37.9`,
          note: "**Wrong by a weekday most days: 64 % worse than the free seasonal naive.** A flat line is a forecast for a series with no structure." },
        { level: "ok", label: "Holt–Winters with the default initialisation, undamped", code: `ExponentialSmoothing(sales, trend="add", seasonal="add", seasonal_periods=7).fit().forecast(28)   # MAE 20.2`,
          note: "Beats the baseline by 13 %. Undamped: the trend the last few months implied is extrapolated for as long as you ask, and at a year out it has added 37 units." },
        { level: "best", label: "ETS with the error form chosen from the data, damped, initialisation estimated, backtested against the alternatives", code: `ETSModel(sales, error="mul", trend="add", damped_trend=True, seasonal="mul", seasonal_periods=7).fit()
# or the additive form on log(sales); the backtest (20.6-21.0 on these origins) chooses between them
# intervals from the model; closures interpolated for the fit; γ at 0.000 checked with a fixed small value`,
          note: "The error form matches the multiplicative diagnosis, the trend cannot run away, the intervals come from a likelihood, and the choice among near-equivalent forms was made by the backtest rather than by preference." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "With α = 0.3 the weights on y_t, y_{t−1}, y_{t−2} are 0.30, 0.21, 0.147. What is the weight on y_{t−k} in general, and what do the weights sum to?",
          options: [
            "α/k, summing to α",
            "α(1 − α)^k, a geometric series summing to 1 over an infinite past — the level is a weighted average of all history with recent points weighted most",
            "(1 − α)^k, summing to 1/α",
            "α^k, summing to α/(1 − α)"
          ],
          answer: 1,
          why: "Unrolling ℓ_t = α y_t + (1 − α) ℓ_{t−1} gives ℓ_t = Σ α(1 − α)^k y_{t−k}, and Σ α(1 − α)^k = α · 1/(1 − (1 − α)) = 1. The first twelve weights with α = 0.3 sum to 0.986; α = 1 is the naive forecast and α → 0 is the long-run mean."
        },
        {
          stem: "Holt's slope fell from 5.69 at t = 4 to 4.07 at t = 5 when y dropped from 42 to 34.5. What went wrong?",
          options: [
            "β was too large",
            "Nothing went wrong with the arithmetic: the method has no seasonal component, so a seasonal dip is read as evidence that the trend is collapsing, and the slope is pulled toward the drop — Holt–Winters deseasonalises the observation before it touches the level and slope",
            "The initial slope was wrong",
            "α should have been smaller"
          ],
          answer: 1,
          why: "Holt's level update uses y_t directly; Holt–Winters uses y_t − s_{t−m}, so a Q1 value 3 below the level is seen as 'on trend' rather than as a fall. On the same numbers Holt–Winters' slope stayed between 1.48 and 1.93 around the true 1.5 while Holt's swung from 3.5 to 5.7."
        },
        {
          stem: "ETS(M,N,M) has AIC 8515.8 and ETS(A,A,A) has 8615.8 on the same series. Is the multiplicative model 100 AIC units better?",
          options: [
            "Yes — lower AIC is better",
            "The two are not comparable: additive and multiplicative errors are different likelihoods on different scales, so AIC compares models only within the same error class; compare across classes with a backtest",
            "No — the additive one has more parameters",
            "Yes, and the difference is significant at 100 units"
          ],
          answer: 1,
          why: "AIC is −2 log L + 2k, and log L for a multiplicative-error model is a density on a relatively-scaled residual; the numbers live on different scales. Within the multiplicative class, (M,N,M) beat (M,Ad,M) by 8 units, which is a fair comparison; across classes only the rolling-origin MAE (20.2 to 21.0 here, indistinguishable) decides."
        },
        {
          stem: "The fitted seasonal smoothing γ on the store is exactly 0.000. What does that mean?",
          options: [
            "There is no seasonality",
            "The optimiser is on the boundary of its box: the seasonal indices were never updated after initialisation, which is consistent with a weekly pattern that did not change, but 0.000 is a constraint hit, not an estimate — check with a small fixed γ in the backtest",
            "The seasonal indices are all zero",
            "The model has over-fitted the season"
          ],
          answer: 1,
          why: "Parameters at exactly 0 or 1 are the optimiser stopped by its bounds. Here the generator's weekly factors were constant, so a non-updating season is correct, and the fitted factors (0.824 … 1.223) match the ones built in. On real data a γ of 0 means the season learned from the initialisation is frozen forever, which is fine until the pattern changes."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "Simple smoothing by hand, the seasonal smoothing rate, and three forms on store B",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** Iterate simple exponential smoothing on the twelve numbers for t = 2 … 6 with α = 0.5 and with α = 0.1, starting from ℓ₁ = 28.5, showing the forecast and the new level at each step, and give the forecast for t = 7 onward in each case." },
        { t: "p", text: "**(b)** Rerun the Holt–Winters table of §03 with γ = 0.9 instead of 0.3 (α 0.4, β 0.2). Report the final seasonal indices and their sum, the one-step MAE, and the year-4 forecasts against the truth 46.5, 52.0, 48.5, 60.0. Why does the larger γ win here, and when would it lose?" },
        { t: "p", text: "**(c)** Backtest (A,Ad,A), (A,Ad,M) and the additive form on logs on store B with h = 28 over 10 origins, reporting MAE, its sd across origins and the bias, next to the four-week seasonal naive. Report the parameters of (A,Ad,M) fitted on all of store B." }
      ],
      requirements: [
        "(a) two five-row tables and two flat forecasts.",
        "(b) the indices, both MAEs, and the two-part explanation.",
        "(c) a four-row table and four parameters."
      ],
      hint: "(a) The level with α = 0.1 barely leaves 28.5. (b) The series is noise-free, so the observation is the truth. (c) Store B's level is 132 and the closures are interpolated before the multiplicative fit.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) α = 0.5:  t  y     forecast    ℓ            α = 0.1:  t  y     forecast   ℓ
#               2  34.0  28.5000   31.2500                  2  34.0  28.5000  29.0500
#               3  30.5  31.2500   30.8750                  3  30.5  29.0500  29.1950
#               4  42.0  30.8750   36.4375                  4  42.0  29.1950  30.4755
#               5  34.5  36.4375   35.4688                  5  34.5  30.4755  30.8780
#               6  40.0  35.4688   37.7344                  6  40.0  30.8780  31.7902
#     forecast for t >= 7:  37.7344 (α 0.5)  and  31.7902 (α 0.1) -- both flat, the second still near the first value

# (b) γ 0.3: indices (−4.08, +0.42, −3.74, +7.37), sum −0.03; one-step MAE 1.880; year-4 44.97 50.95 48.28 60.87, MAE 0.920
#     γ 0.9: indices (−2.62, +1.01, −4.08, +6.24), sum +0.55; one-step MAE 1.443; year-4 46.79 52.00 48.49 60.39, MAE 0.171
#     The series is noise-free, so every observation's departure from the level IS the seasonal index, and a γ near 1 copies it in
#     almost at once; the crude initial indices are forgotten within one cycle. On a noisy series a γ of 0.9 would copy the noise
#     into the index every time -- the fitted γ on the store was 0.000 -- and the sum drifting to +0.55 shows the indices are no
#     longer constrained to cancel, which a renormalisation step (or the estimated fit) would fix.

# (c) store B, h = 28, 10 origins
#     seasonal naive, 4-week mean          MAE 14.12  (sd 2.76)  bias +7.90
#     HW additive, damped (A,Ad,A)         MAE 11.95  (sd 2.30)  bias +2.51
#     HW multiplicative, damped (A,Ad,M)   MAE 11.89  (sd 2.30)  bias +2.83
#     HW additive on log, damped           MAE 11.83  (sd 2.34)  bias +2.26
#     -> all three 15-16 % better than the baseline, indistinguishable from each other; the positive bias is the yearly cycle
#        rising through the backtest window, which none of them models.
#     (A,Ad,M) on all of store B: α 0.047  β 0.047  γ 0.000  φ 0.986`,
        notes: [
          { t: "p", text: "(a) is the recursion twice, and the reason α is a hyperparameter: 0.1 is a long memory that never catches a trend, 0.5 a short one that follows the season around." },
          { t: "p", text: "(b) shows that the right γ depends on the noise: a noise-free series wants γ → 1, a noisy one wants γ → 0, and the estimated fit chooses between them." },
          { t: "p", text: "(c) is the pattern the store shows on every method: forms that model the season are close to each other and far from forms that do not, and the remaining bias points at the component still missing." }
        ]
      }
    }
  ],

  takeaways: [
    "Simple exponential smoothing is a geometric weighted average of the past, ℓ_t = α y_t + (1 − α) ℓ_{t−1}, forecasting a flat line; iterated by hand with α = 0.3 it reached 33.99 after five points, and it is wrong by construction on a trending or seasonal series (MAE 37.9 on the store against a baseline of 23.1).",
    "Holt adds a slope and reads a season as a collapsing or accelerating trend: the slope fell from 5.5 to 3.47 in four steps against a truth of 1.5. Damping caps the extrapolation at φ/(1 − φ) slopes and is the safest default in the family.",
    "Holt–Winters deseasonalises before updating the level, updates one seasonal index per step, and forecasts ℓ + h b + s; initialised from the first two years it scored a one-step MAE of 1.88 on the twelve numbers and forecast year four within 0.92, and statsmodels with everything estimated recovered the noise-free process exactly.",
    "On the store the four seasonal forms scored 20.2 to 21.0 against 23.1, within one standard deviation of each other; the fitted α 0.08 and γ 0.000 say the level moves slowly and the weekly pattern did not change, and a parameter at exactly 0 or 1 is a boundary, not an estimate.",
    "ETS names thirty models by Error, Trend and Season; the state-space form gives a likelihood, AIC comparable within an error class only, and model-based intervals. SES is ARIMA(0,1,1) with θ = α − 1, verified to −0.571 against −0.573.",
    "Initialisation matters on short series, multiplicative forms break on zeros, and the choice among near-equivalent forms belongs to the backtest."
  ],

  quiz: {
    title: "Exponential Smoothing and ETS — Knowledge Check",
    questions: [
      {
        stem: "A demand planner wants a 52-week forecast from a Holt–Winters model whose trend was estimated over a strong recent quarter. What should be changed and why?",
        options: [
          "Increase α so the level responds faster",
          "Use the damped trend: an undamped slope is extrapolated linearly for 52 weeks, and on the store it added 37 units over the year against 8 for the damped fit; damping bounds the total trend contribution at φ/(1 − φ) slopes",
          "Remove the seasonal component",
          "Fit on the last quarter only"
        ],
        answer: 1,
        why: "Trends estimated over a few months are the least reliable part of the model and the part that compounds with the horizon. Damping is a one-parameter change that converts a straight line into an asymptote and was the most consistently accurate configuration across the M-competition series."
      },
      {
        stem: "Why does Holt–Winters need three initial values and where do they come from on a short series?",
        options: [
          "They are set to zero",
          "The recursions update from a starting level, slope and set of seasonal indices; with little data they are taken from the first seasons — the first season's mean, the difference of the first two seasons' means over m, and the first season's departures from its mean — and their noise persists until the smoothing parameters wash it out",
          "They are the last three observations",
          "They are estimated from the test set"
        ],
        answer: 1,
        why: "On the twelve numbers the crude initial indices (−5.25, 0.25, −3.25, 8.25) were still 1.4 units off the truth after eight updates with γ = 0.3. With three or more cycles the 'estimated' initialisation fits them by likelihood alongside the parameters; with fewer, any seasonal model is mostly its initialisation."
      },
      {
        stem: "Which statement about the SES–ARIMA(0,1,1) equivalence is correct?",
        options: [
          "They give the same forecasts with θ = α",
          "ARIMA(0,1,1) with θ = α − 1 produces the same point forecasts as simple smoothing with parameter α; the executed fits gave θ = −0.571 and α − 1 = −0.573 with next-step forecasts agreeing to 0.003",
          "SES is an AR(1) model",
          "The equivalence holds only for α = 0.5"
        ],
        answer: 1,
        why: "Write ARIMA(0,1,1) as y_t = y_{t−1} + ε_t + θ ε_{t−1}; its one-step forecast is an exponentially weighted average of past values with weight 1 + θ on the latest — which is α. The two families overlap here and diverge elsewhere: no ARIMA reproduces multiplicative seasonality and no ETS reproduces an AR(2) cycle."
      },
      {
        stem: "A Holt–Winters multiplicative fit fails on a retail series. The series contains two Christmas-day zeros. What happened?",
        options: [
          "The season length was wrong",
          "The multiplicative form divides the observation by the seasonal factor and the level; a zero makes the update degenerate. Interpolate closures for the fit and add them back after, or use the additive form on logs with a floor",
          "The trend was undamped",
          "α was too small"
        ],
        answer: 1,
        why: "Multiplicative components are ratios, and ratios with a zero numerator or denominator are not estimates. The store lessons interpolate the closures before any multiplicative fit and treat closures as a known regressor or post-hoc override, which is also the honest treatment: a closure is not a sales observation."
      },
      {
        stem: "Four Holt–Winters variants score 20.2, 20.6, 20.8 and 21.0 with a standard deviation across origins of about 3.5. How should the choice be made?",
        options: [
          "Take the lowest, 20.2",
          "They are indistinguishable at this sample size; choose on other grounds — the error form that matches the diagnosis, damping for safety, interval quality — or run more origins; a 0.8 difference under a 3.5 spread over 10 origins is noise",
          "Average the four forecasts",
          "Take the one with the lowest AIC"
        ],
        answer: 1,
        why: "The standard error of a mean over 10 origins with sd 3.5 is about 1.1, larger than the gaps between the variants. Ranking by a difference smaller than its uncertainty is the tuning leak of 10.3 in miniature. Averaging is a reasonable answer too — forecast combination is robust — but the point is that the backtest has not separated them."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Exponential Smoothing and ETS",
    sub: "The three recursions, their failure modes, and the family they belong to.",
    questions: [
      {
        level: "Core",
        q: "Explain simple exponential smoothing and what α controls.",
        strong: "The level is updated as a convex combination of the new observation and the previous level, ℓ_t = α y_t + (1 − α) ℓ_{t−1}, and the forecast for every horizon is the current level. Unrolled, the level is Σ α(1 − α)^k y_{t−k}: a weighted average of the whole past with geometrically shrinking weights that sum to one. α sets the memory — with 0.3 the last six points carry 88 % of the weight, with 0.9 the last one carries 90 %; α = 1 is the naive forecast and α → 0 the long-run mean. It is the right model for a noisy level with no trend or season — equivalently ARIMA(0,1,1) — and on anything else it produces a flat line at the wrong place: 37.9 MAE on a weekly-seasonal series where the seasonal naive scored 23.1.",
        answer: [
          { t: "p", text: "The recursion, the unrolled weights, α as memory with the executed weights, the ARIMA equivalence, and where it fails." }
        ]
      },
      {
        level: "Core",
        q: "Why does Holt's method perform badly on seasonal data, and what does Holt–Winters change?",
        strong: "Holt updates the level from the raw observation, so a seasonal dip looks like the level falling and the slope update then pulls the trend down: on twelve quarterly numbers with a true slope of 1.5, the slope went 5.5 → 4.98 → 5.69 → 4.07 → 3.47 as peaks and dips alternated, and one forecast was 10.8 too high. Holt–Winters keeps m seasonal indices and subtracts the relevant one before the observation touches the level, ℓ_t = α(y_t − s_{t−m}) + (1 − α)(ℓ_{t−1} + b_{t−1}), then updates that index toward the observation's departure from the new level. On the same numbers the slope stayed between 1.48 and 1.93 and the one-step MAE was 1.88, with the indices migrating from the crude initial values toward the truth.",
        answer: [
          { t: "p", text: "The mechanism of Holt's failure with the executed slope path, the deseasonalised update, and the executed Holt–Winters result." }
        ]
      },
      {
        level: "Senior",
        q: "How do you choose between additive and multiplicative Holt–Winters, and between them and a log transform?",
        strong: "From the data first: if the seasonal swing is proportional to the level — the 10.1 diagnosis, a constant swing-to-level ratio across stores or across time and a rolling sd that tracks the rolling mean — the season is multiplicative, and I can express that either with the multiplicative form or with the additive form on logs. The two differ in the error: the multiplicative form on the raw scale has additive errors around a multiplicative structure, while the log form makes everything multiplicative, errors included, and its exponentiated forecast is a median. Then the backtest: on the store, additive, multiplicative and log-additive scored 20.2, 20.8 and 20.6 with a spread across origins of 3.5, so they are indistinguishable there, and I would choose on the intervals and on robustness to zeros — the multiplicative form breaks on closures, the log form needs a floor. Within a class, ETSModel's AIC can rank; across additive and multiplicative error classes it cannot, because they are different likelihoods.",
        answer: [
          { t: "p", text: "The diagnosis from 10.1, the difference between multiplicative-season and log-additive, the executed backtest tie, the zero problem, and the AIC caveat." }
        ]
      },
      {
        level: "Senior",
        q: "What is the ETS framework and what does it add to the classical recursions?",
        strong: "A state-space formulation of exponential smoothing in which each model is named by its error, trend and season components — additive, multiplicative or none, with a damped trend option — giving thirty members. Writing each as a state-space model with a single source of error gives it a likelihood, so parameters and initial states are estimated by maximum likelihood rather than by minimising the one-step squared error; AIC can choose among members of the same error class; and prediction intervals follow from the model's error structure rather than from an ad hoc residual bootstrap — on the store, ETS(M,Ad,M) gave an 80 % interval that widened from 73 at h = 1 to 84 at h = 28. It also makes the ARIMA overlap precise: (A,N,N) is ARIMA(0,1,1), (A,A,N) is ARIMA(0,2,2), (A,Ad,N) is ARIMA(1,1,2), and the seasonal and multiplicative members have no ARIMA equivalent, which is the argument for fitting both families and letting the backtest choose.",
        answer: [
          { t: "p", text: "The taxonomy, likelihood-based estimation and intervals with the executed widths, AIC within a class, and the ARIMA overlap." }
        ]
      },
      {
        level: "Staff",
        q: "You are handed a fitted Holt–Winters model with α = 0.08, β = 0.015, γ = 0.000 and φ = 0.988 for a store's daily sales. Interpret it and say what you would check.",
        strong: "α = 0.08 says the level is a long average — a single day moves it 8 % of the way — which is right for a series with 8 % daily noise and a slow trend. β = 0.015 with φ = 0.988 says the slope is almost never updated and almost never extrapolated: the trend is essentially the initial slope, damped to an asymptote about 80 slopes out, which is the conservative behaviour I want a year ahead. γ = 0.000 is not an estimate but the optimiser on its boundary: the weekly indices were set at initialisation and never revised. That is fine if the weekly pattern is stable — the fitted factors 0.82 to 1.22 match what I know of the store — and dangerous if it changes, because the model cannot follow. I would check four things: refit with γ fixed at a small value like 0.02 and compare the backtest; look at the residuals by weekday for a drifting pattern; confirm the model was fitted with closures interpolated rather than as zeros, since the multiplicative form cannot handle them; and confirm its 28-day backtest against the four-week seasonal naive, which on this store is a 13 % improvement and the reason the model exists.",
        answer: [
          { t: "p", text: "Each parameter read as behaviour, γ = 0 as a boundary with the risk it carries, and four concrete checks including the baseline." }
        ]
      }
    ]
  }
});

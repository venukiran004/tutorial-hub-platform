/* ============================================================================
   LESSON 10.7 — Intervals, Conformal Prediction and Probabilistic Forecasts
   ========================================================================= */
EC.receiveLesson({
  id: "10.7",

  lede: "**A single number is almost never the deliverable: inventory, staffing and capacity are decided against a range, and the width of the range is itself the product — which makes 'how wide, and is it honest' the two questions this lesson answers.** For a random walk the h-step error is a sum of h shocks, so the 95 % half-width is 1.96σ√h: 5.88 at h = 1 and 16.63 at h = 8 for σ = 3, and 20,000 simulated walks land inside it 94.8 to 95.1 % of the time. Four ways to an interval are run on the store's one-step model over its last 150 days: quantile boosting covers 68.7 % for a nominal 80 %, a residual bootstrap from training residuals covers 44 %, the SARIMAX analytic interval 87 %, and split conformal on a recent calibration block 92 % for a nominal 90 % — the one method whose coverage is guaranteed by construction. The pinball loss is worked by hand (under-forecasting by 12 at τ = 0.9 costs 10.8, over-forecasting 1.2), quantile crossing is counted, and when store C's level shifts, a static conformal band drops to 59.5 % coverage in the following six weeks while an adaptive one holds 83.3 % by widening from 30 to 57. ETS simulations score a CRPS of 15.4 against a median-path MAE of 20.5, and CRPS is shown to reduce to MAE when the spread is removed.",

  objectives: [
    "Derive why a prediction interval widens with the horizon and check it by simulation",
    "Produce intervals four ways — analytic, quantile regression, bootstrap, conformal — and state what each assumes",
    "Compute the pinball loss by hand and explain why its asymmetry yields a quantile",
    "Apply split conformal prediction with the finite-sample correction, calibrate on the most recent block, and adapt it under drift",
    "Score a probabilistic forecast with pinball loss, CRPS and coverage, and explain why coverage must be reported beside the loss"
  ],

  prerequisites: ["10.5", "10.6", "2.5"],

  blocks: [

    { t: "h2", n: "01", text: "Why the interval widens", id: "widening" },

    { t: "code", lang: "text", title: "A random walk with σ = 3, forecast 200 (executed)",
      code: `y_{T+h} = y_T + ε_{T+1} + ... + ε_{T+h}      ->   Var = hσ²   ->   95 % interval = ŷ ± 1.96 σ √h

h   sd = σ√h    half-width 1.96σ√h    interval
1    3.0000         5.8800            194.12 to 205.88
2    4.2426         8.3156            191.68 to 208.32
4    6.0000        11.7600            188.24 to 211.76
8    8.4853        16.6312            183.37 to 216.63

20,000 simulated walks, share inside the band at h = 1, 4, 8:  0.948  0.951  0.950`,
      caption: "Doubling the horizon does not double the uncertainty; it multiplies it by √2. Models with mean reversion widen more slowly (an AR(1)'s variance converges to σ²/(1 − φ²)), models with a trend or a unit root widen at least this fast, and a forecast whose interval does not widen with the horizon is either nearly deterministic or broken — the exercise finds one of each." },

    { t: "viz",
      title: "The fan of a random walk: ±1.96σ√h for σ = 3",
      caption: "Half-widths 5.9, 8.3, 10.2, 11.8, 13.1, 14.4, 15.6, 16.6 at h = 1 … 8. The square-root shape is the honest picture of compounding shocks.",
      svg: `<svg viewBox="0 0 720 300" role="img" aria-label="A fan chart widening with the square root of the horizon from h equals 1 to 8 around a flat forecast of 200.">
  <line x1="60" y1="150" x2="680" y2="150" stroke="var(--ink-3)" stroke-width="1.5"/>
  <polygon points="80,126.5 160,116.7 240,109.3 320,103.0 400,97.4 480,92.4 560,87.8 640,83.5 640,216.5 560,212.2 480,207.6 400,202.6 320,197.0 240,190.7 160,183.3 80,173.5" fill="var(--accent)" opacity="0.18" stroke="var(--accent)" stroke-width="1.5"/>
  <g font-size="11" fill="var(--ink-3)" font-family="ui-monospace, monospace">
    <text x="76" y="290">h=1</text><text x="156" y="290">2</text><text x="236" y="290">3</text><text x="316" y="290">4</text><text x="396" y="290">5</text><text x="476" y="290">6</text><text x="556" y="290">7</text><text x="636" y="290">8</text>
    <text x="14" y="154">200</text><text x="14" y="87">+16.6</text><text x="14" y="220">−16.6</text>
    <text x="90" y="120">±5.9</text><text x="640" y="76">±16.6</text>
  </g>
  <text x="380" y="140" font-size="12" fill="var(--ink-2)" font-family="ui-sans-serif, system-ui, sans-serif">point forecast: the last value</text>
</svg>` },

    { t: "h2", n: "02", text: "Four ways to get an interval", id: "four-ways" },

    { t: "table", head: ["Method", "How", "Assumes", "Good for"], rows: [
      ["Analytic", "the model's own variance formula", "the model is right and the errors normal", "ARIMA, ETS"],
      ["Quantile regression", "one model per quantile, pinball loss", "nothing about the shape; enough data per quantile", "boosting, networks"],
      ["Bootstrap / simulation", "resample residuals or simulate paths, re-run the recursion", "residuals exchangeable and representative", "any model with a recursion"],
      ["Conformal", "the quantile of absolute residuals on a held-out calibration block", "exchangeability of calibration and test errors", "any model; coverage guaranteed"]
    ] },

    { t: "code", lang: "python", title: "All four on the store's one-step boosting model, last 150 days (executed; nominal levels as stated)",
      code: `#  method                                                      nominal   coverage   mean width
#  quantile boosting, τ 0.1 and 0.9                              80 %      0.687        46.1     3 of 150 rows crossed before sorting
#  residual bootstrap: 500 draws of TRAINING residuals            80 %      0.440        24.0     in-sample residuals are too small
#  SARIMAX airline + calendar, analytic one-step (log scale)      80 %      0.873        54.1     constant width 0.207 on the log scale
#  split conformal, calibration = the 90 days before the test     90 %      0.920        84.0     half-width 42.0 = the 82nd of 90 sorted |residuals|
#  split conformal, calibration = 90 RANDOM days                  90 %      0.947        87.6     a random block is not the recent error distribution`,
      caption: "Two methods under-cover badly. The quantile models were fitted to the whole history and the last 150 days were harder than average; the bootstrap used residuals from data the model had fitted, which are smaller than its errors on new data — the same optimism as a training-set score. The analytic and conformal intervals are honest because they were built from errors the model did not see, and conformal's is honest by construction." },

    { t: "h2", n: "03", text: "The pinball loss", id: "pinball" },

    { t: "p", text: "The pinball (quantile) loss at level τ is τ(y − ŷ) when the forecast is below the actual and (1 − τ)(ŷ − y) when it is above. Minimising it over a distribution gives the τ-quantile, and the asymmetry is the whole mechanism: at τ = 0.9 being too low is penalised nine times as hard as being too high, so the minimiser is pushed up until only 10 % of outcomes sit above it. At τ = 0.5 it is half the absolute error, and its minimiser is the median." },

    { t: "code", lang: "text", title: "Actual 80; forecasts 68, 80, 92 (executed)",
      code: `forecast    τ = 0.1    τ = 0.5    τ = 0.9
  68 (under)   1.20       6.00      10.80      <- at τ 0.9: 0.9 × 12 = 10.8
  80 (exact)   0.00       0.00       0.00
  92 (over)   10.80       6.00       1.20      <- at τ 0.9: 0.1 × 12 = 1.2

on 200,000 draws from a lognormal(4, 0.5), the minimisers of the three losses are the sample quantiles 28.8, 54.6, 103.7; the mean is 61.9`,
      caption: "A model trained with the τ = 0.5 loss forecasts the median, which on a right-skewed target is below the mean — the MAE-versus-bias trade-off of 10.3 and 10.6, made by the loss. Independently fitted quantile models can cross (the 90th below the 50th); three of 150 rows did here, and the fix is to sort the predicted quantiles row-wise or to fit a model with a monotone constraint." },

    { t: "h2", n: "04", text: "Conformal prediction: coverage without distributional assumptions", id: "conformal" },

    { t: "p", text: "Split conformal fits the model on a training block, computes absolute residuals on a calibration block the model never saw, and takes the (1 − α) empirical quantile of those residuals — with a finite-sample correction, the ⌈(n + 1)(1 − α)⌉-th smallest of n — as the half-width around every new point forecast. If the calibration and test errors are exchangeable, coverage is at least 1 − α, whatever the model and whatever the error distribution. That guarantee is what the other three methods lack. Its cost is a constant-width band (a residual quantile knows nothing about which days are harder) and the exchangeability assumption, which time series violate in two ways: the errors are autocorrelated, and the error distribution drifts." },

    { t: "code", lang: "python", title: "Split conformal, and what the calibration block should be (executed)",
      code: `def conformal(model, X_cal, y_cal, X_new, alpha):
    r = np.sort(np.abs(y_cal - model.predict(X_cal))); n = len(r)
    q = r[min(int(np.ceil((n + 1) * (1 - alpha))) - 1, n - 1)]        # the finite-sample correction
    p = model.predict(X_new); return p - q, p, p + q

# α 0.1, calibration = the 90 days before the test: half-width 42.0, coverage 0.920
# α 0.1, calibration = 90 random days from history:   half-width 43.8, coverage 0.947
# exercise, α 0.2, recent calibration of 30 / 90 / 180 days: coverage 0.753 / 0.793 / 0.793 -- 30 days is too few to estimate an 80th percentile`,
      caption: "Calibrate on the most recent block, not a random sample: the recent block is the error distribution the next weeks will resemble. Thirty days gives a quantile estimated from 30 residuals and misses the target; 90 and 180 hit it. The guarantee is marginal — over all days, not for each day — so a band that is right on average is wider than needed on quiet days and narrower than needed on promotion days." },

    { t: "code", lang: "python", title: "Drift: static conformal against adaptive conformal when store C's level shifts (executed; real data, 7-day-ahead boosting model)",
      code: `# model fitted to May 2024, calibrated May-July, tested August-November; the refurbishment lifts the level on 1 September
#                                                        coverage before   6 weeks after   Sep-Nov    band width before / after
#  static conformal, α 0.1, half-width 15.7                   0.920           0.595         0.773           31.4 / 31.4
#  adaptive conformal (ACI), γ 0.02, online calibration       0.920           0.833         0.887           29.8 / 57.4

# ACI:  α_{t+1} = α_t + γ (α − miss_t)      a miss raises the target coverage for the next step, so the band widens until misses stop;
#       the calibration set also grows with each observed residual`,
      caption: "After the shift the model under-forecasts by about the size of the shift, the static band misses 40 % of days for six weeks, and nothing in it can notice. The adaptive band reacts to each miss and recovers most of the coverage at the price of doubling its width — which is the honest response to a model that has become wrong. EnbPI (bootstrap ensembles with leave-one-out residuals) is the other standard time-series conformal method; both exist because plain conformal's exchangeability does not hold across a change." },

    { t: "h2", n: "05", text: "Scoring a whole distribution", id: "scoring" },

    { t: "code", lang: "python", title: "ETS(M,Ad,M) with 300 simulated paths per origin, 28 days ahead, 10 origins (executed, store A)",
      code: `CRPS(F, y) = E|X − y| − ½ E|X − X'|      for samples X, X' from the forecast distribution F

CRPS                                     15.38
MAE of the median path                   20.53
mean pinball over τ = 0.05 ... 0.95       8.05      (CRPS is the integral of the pinball loss over τ; twice the mean pinball ≈ CRPS)
80 % coverage                             0.871     mean width 80.3
width at h = 1 / h = 28                   71.0 / 86.9        coverage at h = 1 / h = 28   0.90 / 1.00 (ten origins each)

CRPS of a POINT forecast (every path collapsed to the median): 20.53 = its MAE`,
      caption: "CRPS is the standard for sample-based forecasts (DeepAR, Chronos, any simulation): lower is better, it rewards sharpness and calibration together, and it reduces to MAE when the spread is zero — which is why a point forecast can never beat a well-calibrated distribution on it. Coverage is reported beside it because a forecast with excellent CRPS and 60 % coverage on a nominal 90 % band is not safe to plan against, and here the 80 % band over-covers (0.871) because ETS's multiplicative error is wide on a series whose noise is 8 %." },

    { t: "callout", kind: "production", title: "What the interval is for", body: [{ t: "p", text: "An 80 % interval that covers 87 % is not 'better' — it is wider than it needs to be, and a planner holding stock at its upper edge pays for the excess. An interval that covers 44 % is a promise that will be broken one day in two. The deliverable is a band whose coverage matches its label on the recent past, checked every week, with the width reported per horizon so that a 28-day order and a 1-day order are sized differently. Report the loss (pinball or CRPS) for choosing between methods, the coverage for trusting the one chosen, and the width for the decision it feeds." }] },

    { t: "ladder",
      title: "Producing an interval for a boosting forecaster",
      rungs: [
        { level: "bad", label: "Point forecast ± a fixed percentage", code: `lo, hi = 0.9 * yhat, 1.1 * yhat`,
          note: "**A number with no coverage attached. The one-step RMSE on this store was 28 (10.6) against a level near 250, so ±10 % is ±25 — about 63 % coverage under normal errors (a calculation, not a backtest) — and less at every longer horizon.**" },
        { level: "ok", label: "Bootstrap the training residuals, or three quantile models", code: `lo, hi = np.percentile(yhat + rng.choice(train_resid, (500, n)), [10, 90], axis=0)     # coverage 0.440
q10, q90 = quantile_models(...)                                                          # coverage 0.687, crossings`,
          note: "Both are honest in principle and both under-covered here: training residuals are optimistic, and quantile models need more data than a point model and can cross. Neither carries a guarantee." },
        { level: "best", label: "Conformal on a recent calibration block, adaptive under drift, coverage monitored per horizon", code: `q = conformal_quantile(recent_90_days, alpha)                         # coverage 0.92 at nominal 0.90
alpha_t += gamma * (alpha - miss_t)                                    # widens itself when the model goes wrong
report(pinball_or_crps, coverage_by_h, width_by_h)                     # weekly`,
          note: "Coverage guaranteed under exchangeability, monitored where exchangeability fails, and the numbers the decision needs — loss, coverage and width per horizon — reported together." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The residual bootstrap covered 44 % of the test days for a nominal 80 %. What went wrong?",
          options: [
            "Too few bootstrap draws",
            "The residuals were taken from the training data the model had fitted, and they are smaller than its errors on new data — the same optimism as a training-set score; the fix is residuals from a held-out block, which is what conformal does",
            "The percentiles were computed the wrong way round",
            "Bootstrapping does not work for time series"
          ],
          answer: 1,
          why: "A boosting model with 400 trees fits its training data much more closely than it predicts new data; a band built from in-sample residuals inherits that fit. Held-out residuals — the calibration block — describe the errors the model will actually make, and the executed conformal band built from them covered 92 %."
        },
        {
          stem: "Why does the pinball loss at τ = 0.9 produce the 90th percentile rather than the mean plus some margin?",
          options: [
            "Because it is scaled by 0.9",
            "Because it charges 0.9 per unit for being too low and 0.1 per unit for being too high, and the point where the expected cost of moving up equals the expected cost of moving down is the point with 10 % of the probability above it",
            "Because it is a squared loss",
            "Because quantiles are always above the mean"
          ],
          answer: 1,
          why: "Taking the derivative of the expected loss with respect to the forecast gives −τ P(y > ŷ) + (1 − τ) P(y < ŷ) = 0, so P(y < ŷ) = τ. The worked table shows the 9-to-1 asymmetry, and the lognormal check shows the three minimisers landing on the sample's 10th, 50th and 90th percentiles."
        },
        {
          stem: "A conformal band calibrated on 90 random days from history covered 94.7 % for a nominal 90 %, and one calibrated on the 90 most recent days covered 92.0 %. Which is better?",
          options: [
            "The random one — higher coverage",
            "The recent one: the guarantee holds when calibration errors resemble test errors, and the recent block is the distribution the next weeks will follow; over-coverage is width the decision pays for without need",
            "Neither — 90 days is too few",
            "The random one, because random samples are unbiased"
          ],
          answer: 1,
          why: "Exchangeability between calibration and test is the assumption; a random sample from two years of history mixes error regimes that no longer apply. Coverage above the nominal level is not free — the band is wider than the errors require. The exercise shows 30 recent days is too few and 90 or 180 both hit 80 % at α = 0.2."
        },
        {
          stem: "After store C's level shift the static conformal band covered 59.5 % for six weeks while the adaptive band covered 83.3 %. What did the adaptive band do?",
          options: [
            "It refitted the model",
            "It raised its target coverage after each miss (α_{t+1} = α_t + γ(α − miss)) and added each new residual to the calibration set, so the band widened from 30 to 57 until misses stopped — it did not fix the model, it reported honestly that the model had become wrong",
            "It shifted the point forecast upward",
            "It reduced α to zero"
          ],
          answer: 1,
          why: "Adaptive conformal keeps coverage near the target under drift by adjusting the band, not the model; a doubled width is the correct signal that the forecaster needs retraining, and in 10.9 that signal is one of the monitors. The point forecast's bias after the shift is a different problem, solved by refitting or a step regressor."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "Pinball by hand, an interval by horizon, and the size of the calibration block",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** With actual 50, compute the pinball loss for forecasts 40, 50 and 65 at τ = 0.2, 0.5 and 0.8, and explain the τ = 0.2 column." },
        { t: "p", text: "**(b)** On the ten-origin backtest of store A, take SARIMAX (0,1,1)(0,1,1)₇ with the calendar and its analytic 80 % interval, and report coverage and mean width at h = 1, 7, 14 and 28, the overall coverage, and the ratio of the width at h = 28 to the width at h = 1. Compare the ratio with the random-walk rule and explain." },
        { t: "p", text: "**(c)** For the one-step boosting model on store A, build split conformal bands at α = 0.2 with calibration blocks of the most recent 30, 90 and 180 days, and report the half-width, its rank in the sorted residuals, and the coverage on the last 150 days." }
      ],
      requirements: [
        "(a) a 3 × 3 table and a sentence.",
        "(b) four rows, the overall coverage, the ratio and the explanation.",
        "(c) three rows."
      ],
      hint: "(a) At τ = 0.2, over-forecasting costs 0.8 per unit. (b) MA roots near −1 make the integrated model nearly deterministic. (c) The rank is ⌈(n + 1)(1 − α)⌉.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) forecast   τ 0.2   τ 0.5   τ 0.8
#       40        2.00    5.00    8.00      under by 10: τ·10
#       50        0.00    0.00    0.00
#       65       12.00    7.50    3.00      over by 15: (1 − τ)·15
#     At τ = 0.2 over-forecasting costs four times what under-forecasting costs, so the minimiser sits low -- where 80 % of outcomes are above it.

# (b) SARIMAX airline + calendar, 80 % analytic interval, 10 origins:
#     h=1  coverage 0.90  width 51.6      h=7  0.70  54.9      h=14  0.90  52.4      h=28  1.00  52.7
#     overall coverage 0.879 (target 0.80); width(h=28)/width(h=1) = 1.02; the random-walk rule would give √28 = 5.29
#     The fitted airline model has θ = −0.88 and Θ = −0.98: MA roots near the unit circle almost cancel the two differences, so the
#     model is close to a deterministic trend-plus-season and its forecast variance barely grows. The interval is honest on average
#     (0.88 vs 0.80, slightly wide) but its flatness says the model's own uncertainty accounting is not to be trusted at long horizons;
#     the ETS simulation on the same series widened from 71 to 87.

# (c) split conformal, α 0.2, one-step boosting, last 150 days:
#     calibration  30 days: half-width 28.4 (rank 25 of 30),   coverage 0.753     <- an 80th percentile from 30 numbers
#     calibration  90 days: half-width 29.9 (rank 73 of 90),   coverage 0.793
#     calibration 180 days: half-width 29.3 (rank 145 of 180), coverage 0.793`,
        notes: [
          { t: "p", text: "(a) is the mechanism once more, from the low side." },
          { t: "p", text: "(b) is the executed exception to §01: an interval that does not widen is a model claiming near-certainty about the far future, and the reason to check coverage by horizon rather than trust the formula." },
          { t: "p", text: "(c) is the practical minimum for the calibration block: enough residuals to estimate the quantile, recent enough to be exchangeable with what comes next." }
        ]
      }
    }
  ],

  takeaways: [
    "Forecast uncertainty compounds: for a random walk the h-step half-width is 1.96σ√h (5.88 → 16.63 from h = 1 to 8 at σ = 3), verified at 95 % coverage by simulation; an interval that does not widen is a model claiming certainty, and the SARIMAX airline fit with MA roots near −1 was one.",
    "Four routes to an interval — analytic, quantile regression, bootstrap, conformal — with different assumptions; on the store's one-step model they covered 87 %, 69 %, 44 % and 92 % of their nominal 80 / 80 / 80 / 90 %, and the two that failed used errors the model had already fitted or too little data per quantile.",
    "The pinball loss is τ(y − ŷ) below and (1 − τ)(ŷ − y) above; its asymmetry makes the minimiser the τ-quantile (10.8 versus 1.2 for the same 12-unit miss at τ = 0.9), and independently fitted quantiles can cross and must be sorted.",
    "Split conformal takes the ⌈(n + 1)(1 − α)⌉-th smallest calibration |residual| as the half-width and guarantees coverage under exchangeability; calibrate on the most recent block (recent 92 %, random 95 %) with enough days (30 was too few, 90 and 180 were right).",
    "Under drift the guarantee fails — 59.5 % coverage for six weeks after store C's shift — and adaptive conformal restores it (83.3 %) by widening the band from 30 to 57, which is the honest signal that the model has become wrong.",
    "Score a distribution with pinball loss or CRPS (15.4 against a median-path MAE of 20.5; CRPS reduces to MAE when the spread is zero) and always report coverage and width per horizon beside it — an 80 % band that covers 87 % costs the decision width it does not need."
  ],

  quiz: {
    title: "Intervals, Conformal Prediction and Probabilistic Forecasts — Knowledge Check",
    questions: [
      {
        stem: "An ARIMA(0,1,0) forecast for a series with residual sd 4 is reported with a 95 % interval of ±7.84 at every horizon from 1 to 30 days. What is wrong?",
        options: [
          "Nothing — the interval is correct for a random walk",
          "The random walk's h-step variance is hσ², so the half-width must grow as 1.96σ√h: 7.84 at h = 1, 42.9 at h = 30; a constant band understates the far horizon by a factor of √30",
          "The interval should shrink with the horizon",
          "The interval should be ±4"
        ],
        answer: 1,
        why: "Each future step adds an independent shock; the errors accumulate and the standard deviation grows with the square root of the horizon — verified at 95 % coverage in 20,000 simulated walks. A band that is right at h = 1 and constant thereafter will cover far fewer than 95 % of outcomes a month out."
      },
      {
        stem: "Three quantile models (τ = 0.1, 0.5, 0.9) are fitted independently and the 0.9 prediction falls below the 0.5 prediction on some rows. What should be done?",
        options: [
          "Discard those rows",
          "Sort the predicted quantiles row-wise (or use a model with a monotone constraint across quantiles): crossing is an artefact of fitting each quantile separately, and the executed run had 3 of 150 rows crossed",
          "Refit with more trees",
          "Average the three predictions"
        ],
        answer: 1,
        why: "Nothing in three separate optimisations forces the outputs to be ordered; on rows with few similar training examples they can invert. Sorting is a valid post-processing step that cannot worsen the pinball loss; joint quantile models and monotone constraints prevent it at source."
      },
      {
        stem: "What does split conformal prediction guarantee, and under what condition?",
        options: [
          "Exact coverage for every point",
          "Marginal coverage of at least 1 − α on new points, for any model and any error distribution, provided the calibration and test errors are exchangeable — which a level shift breaks, as the 59.5 % post-shift coverage showed",
          "Coverage only for normal errors",
          "Coverage only for linear models"
        ],
        answer: 1,
        why: "The guarantee is distribution-free and model-free but marginal (on average over days, not per day) and conditional on exchangeability. Time series violate it through autocorrelated errors and drift; calibrating on the recent block handles the first in practice, and adaptive conformal or EnbPI handle the second."
      },
      {
        stem: "Two probabilistic forecasters have CRPS 15.4 and 15.9. The first covers 87 % with a nominal 80 % band; the second covers 79 %. Which is preferable for a planner?",
        options: [
          "The first — lower CRPS",
          "It depends on what the decision needs: the second's band is honest at its label, while the first is sharper on average but its 80 % band is too wide by construction; report both numbers, and choose by the horizon and the cost of stock-outs versus excess",
          "The second — coverage matters more than CRPS",
          "Neither — CRPS and coverage cannot disagree"
        ],
        answer: 1,
        why: "CRPS rewards sharpness and calibration together across all quantiles; coverage checks one band. A planner sizing an order at the 90th percentile needs that quantile to be right, which is a coverage question at that level and that horizon. This is why the lesson insists on reporting loss, coverage and width per horizon rather than one of them."
      },
      {
        stem: "Why does CRPS reduce to MAE for a point forecast?",
        options: [
          "Because CRPS is defined as MAE",
          "Because CRPS = E|X − y| − ½E|X − X′| and for a degenerate distribution the second term is zero while the first is |ŷ − y|; the executed collapse of the ETS paths to their median gave CRPS 20.53 = the median path's MAE",
          "Because the median minimises both",
          "Because CRPS is symmetric"
        ],
        answer: 1,
        why: "The second term rewards spread — a wider distribution pays E|X − X′|/2 — and the first penalises distance from the outcome; a well-calibrated distribution's CRPS (15.4) is below its median's MAE (20.5) because on days it misses, part of its mass was closer. A point forecast can never beat a calibrated distribution on CRPS."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Intervals and Probabilistic Forecasts",
    sub: "Where the width comes from, how to get it honestly, and how to score it.",
    questions: [
      {
        level: "Core",
        q: "Why does a forecast interval widen with the horizon, and how fast?",
        strong: "Because each step into the future adds a shock the model cannot know, and the errors accumulate. For a random walk the h-step error is a sum of h independent shocks, so its variance is hσ² and the 95 % half-width is 1.96σ√h — 5.88 at one step and 16.63 at eight for σ = 3, which 20,000 simulated walks confirmed at 94.8 to 95.1 % coverage. The square-root shape is the honest default: doubling the horizon multiplies the uncertainty by √2. Mean-reverting models widen more slowly and plateau at the series' unconditional variance; trending or integrated models widen at least as fast as the random walk. A forecast whose interval does not widen is claiming certainty about the far future, and when I saw it on an airline-model fit whose MA roots sat near −1, it told me the model's own uncertainty accounting was not to be trusted at long horizons.",
        answer: [
          { t: "p", text: "Accumulating shocks, the √h formula with executed values, the model-dependent rates, and the flat-interval warning sign." }
        ]
      },
      {
        level: "Core",
        q: "Explain the pinball loss and how it produces a quantile.",
        strong: "It is an asymmetric absolute error: τ times the shortfall when the forecast is below the outcome, (1 − τ) times the excess when it is above. At τ = 0.9 a 12-unit under-forecast costs 10.8 and a 12-unit over-forecast costs 1.2, nine to one, so the expected loss is minimised by a forecast that is exceeded only 10 % of the time — setting the derivative to zero gives P(y < ŷ) = τ. At τ = 0.5 it is half the absolute error and the minimiser is the median, which on a right-skewed target sits below the mean. On a lognormal sample the three minimisers landed on the 10th, 50th and 90th percentiles. It is what quantile regression and LightGBM's quantile objective minimise, its average over many τ is proportional to CRPS, and it was the M5 uncertainty competition's metric.",
        answer: [
          { t: "p", text: "The asymmetric loss with the worked 9-to-1, the derivative argument, the median at τ 0.5, and its role in quantile regression and scoring." }
        ]
      },
      {
        level: "Senior",
        q: "How would you put an interval on a gradient-boosting forecaster, and what can go wrong?",
        strong: "Three honest options and one dishonest one. Quantile models — one per τ with the pinball loss — assume nothing about the error shape but need more data than a point model and can cross; on the store's last 150 days they covered 68.7 % for a nominal 80 % and crossed on 3 rows, because the recent period was harder than the history they were fitted to. A residual bootstrap resamples errors around the point forecast; done with training residuals it covered 44 %, because a boosting model's in-sample errors are far smaller than its out-of-sample ones — the same optimism as a training-set score — so it must use held-out residuals. Split conformal is the one I default to: fit on the training block, take the ⌈(n + 1)(1 − α)⌉-th smallest absolute residual on a recent calibration block as the half-width, and coverage is guaranteed under exchangeability — 92 % at a nominal 90 % with 90 recent days, and 30 days was too few. The dishonest option is a fixed percentage around the point forecast, which carries no coverage at all. What goes wrong afterwards is drift: a level shift dropped a static conformal band to 59.5 % coverage for six weeks, and adaptive conformal, which widens after each miss, held 83.3 % at double the width — the signal to retrain.",
        answer: [
          { t: "p", text: "Quantile, bootstrap and conformal with the executed coverages and failure causes, the finite-sample rule, the recent calibration block, and drift with ACI." }
        ]
      },
      {
        level: "Senior",
        q: "What is CRPS and why is it preferred to MAE for a probabilistic forecast?",
        strong: "The continuous ranked probability score is the integral of the pinball loss over all quantile levels — equivalently, for a sample-based forecast, E|X − y| − ½E|X − X′| where X and X′ are independent draws from the forecast distribution. It rewards calibration and sharpness together: the first term penalises distance from the outcome, the second rewards a tight distribution, and a forecaster cannot game it by hedging or by over-confidence. For a point forecast the second term is zero and it reduces exactly to MAE — the ETS paths collapsed to their median scored 20.53, the median's MAE — so a calibrated distribution always scores at least as well as its own point forecast, and the executed ETS distribution scored 15.4 against 20.5. It is the standard for DeepAR, Chronos and any simulated forecast. What it does not tell you is whether a particular band is honest, so I report coverage and width per horizon beside it: an 80 % band that covers 87 %, as ETS's did, is wider than the decision needs.",
        answer: [
          { t: "p", text: "The definition, the two terms, the reduction to MAE with the executed check, the executed advantage of the distribution, and why coverage is reported beside it." }
        ]
      },
      {
        level: "Staff",
        q: "A planning team says the forecast's 90 % intervals are 'too wide to be useful'. How do you respond?",
        strong: "First I check whether they are honest, because a wide interval that covers 90 % is the truth about the series and a narrow one that covers 60 % is a promise that breaks one day in three. Coverage on the recent past, per horizon, is the test; if the band over-covers — like the ETS 80 % band at 87 % — it can be tightened legitimately by recalibrating on recent errors, and conformal on the last 90 days does that with a guarantee. If it covers correctly, the width is information, and the conversation moves to the decision: which quantile does the order actually need? A stock decision with cheap excess and expensive stock-outs should be sized at a high quantile and needs only that quantile to be right, which is a pinball-loss model or a conformal band at that level, not a symmetric interval. Then the levers that genuinely reduce uncertainty: the horizon — the band is √h wider at 28 days than at 1, so shortening the lead time is worth more than any model change; the regressors — the promotion calendar cut the point error 29 %, and a band around a better point forecast is narrower for the same coverage; and aggregation — the interval on a region's total is proportionally narrower than on a store's. What I do not do is narrow the band to make it acceptable; the cost of that shows up as stock-outs with the forecast's name on them.",
        answer: [
          { t: "p", text: "Honesty first via coverage, legitimate tightening by recalibration, the decision's quantile, the three real levers, and the refusal to narrow by fiat." }
        ]
      }
    ]
  }
});

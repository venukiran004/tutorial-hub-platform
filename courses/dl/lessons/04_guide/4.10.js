/* ============================================================================
   LESSON 4.10 — Project: Time-Series Forecasting
   Mirrors rnn-lstm-gru-transformer-guide.md · §10. The reference's setup is
   run, plus the baselines it omits. The random-split leakage test gave a
   smaller effect than expected and is reported as measured
   (scratchpad/dl/d410.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.10",

  lede: "**The last project, and the one where the baselines matter most.** Forecasting invites self-deception: a model that predicts tomorrow's price as roughly today's looks impressive on a plot and is worth nothing. This lesson runs the reference's RNN, LSTM and GRU comparison, then adds the two baselines it omits — and finds the LSTM reaching RMSE 3.105 against an **irreducible noise floor of 3.000**, which is about as close to optimal as a model can get.",

  objectives: [
    "Build sliding-window sequences for forecasting and split them temporally",
    "Fit a scaler without leaking the future",
    "Compare against a persistence baseline and the noise floor",
    "Interpret an error in the units of the series",
    "Judge when a leakage risk is real and when it is theoretical"
  ],

  prerequisites: ["4.9"],

  blocks: [

    { t: "h2", n: "01", text: "The series and the split", id: "setup" },

    { t: "out", text: `  synthetic series: 1000 days, trend + 250-day seasonality + noise
  range [94.9, 157.7], std of the noise term = 3.0

  TEMPORAL split at day 800 - never shuffle a time series
  scaler fitted on train only: mu=120.29 sd=12.91
  train windows (740, 60, 1), test windows (200, 60, 1)` },

    { t: "p", text: "Sixty days of history predicting the next day. Two disciplines apply before any modelling: the split is **temporal**, not random, and the scaler is fitted on the training portion only — computing the mean over the whole series would put information about the test period into every training example." },

    { t: "callout", kind: "insight", title: "The noise floor is the number to beat toward, not past",
      body: [{ t: "p", text: "This series is `trend + seasonality + N(0, 3)`. The trend and seasonality are learnable; **the noise is not**, by construction. So no model can do better than RMSE 3.0, and anything claiming to has either leaked or is being evaluated wrong. Knowing this number transforms how you read results: a model at 3.1 is essentially perfect and further tuning is wasted, while a model at 3.9 has real headroom. On real data you cannot compute the floor exactly, but you can usually bound it — and asking 'how much of this series is even predictable?' before modelling prevents a lot of futile effort." }] },

    { t: "h2", n: "02", text: "Results", id: "results" },

    { t: "out", text: `  model          RMSE      MAE
  rnn           3.423    2.717
  lstm          3.105    2.533
  gru           3.283    2.610
  naive         3.977    3.181   <- predict yesterday's price
  mean         24.409   23.720   <- predict the training mean

  irreducible noise floor (the series' own noise std): 3.000` },

    { t: "callout", kind: "good", title: "The LSTM is within 3.5 % of optimal",
      body: [{ t: "p", text: "RMSE 3.105 against a floor of 3.000 means the model has extracted essentially all the learnable structure — the trend and the 250-day cycle — and what remains is noise. The ordering is the expected one (LSTM best, then GRU, then RNN) but the gaps are small, which is itself informative: on a sixty-step window with smooth structure, all three gated and ungated cells can carry what is needed. This is exactly the 'simple time series with short dependencies' case where lesson 4.7 said recurrence is still appropriate and the architecture choice barely matters." }] },

    { t: "p", text: "The two baselines are what make those numbers interpretable. **Predicting yesterday's price gives 3.977** — respectable, and it is the bar a forecasting model must clear to be worth anything. The mean baseline at 24.409 shows the series has strong structure, which is why a plot of predictions against actuals would look impressive for any of these models, including the naive one." },

    { t: "callout", kind: "trap", title: "The persistence baseline is the one that embarrasses forecasting models",
      body: [{ t: "p", text: "On many real financial series, 'tomorrow will be like today' is extremely hard to beat, and a great many published forecasting results fail to beat it because the comparison was never made. A predictions-versus-actuals plot looks convincing for a model that has simply learned to output its last input with a small correction. Always report the persistence baseline. If your model does not beat it, you have not built a forecaster." }] },

    { t: "h2", n: "03", text: "The leakage test, honestly", id: "leakage" },

    { t: "out", text: `  RANDOM split test RMSE (normalised): 0.2532
  TEMPORAL split test RMSE (normalised): 0.2406` },

    { t: "callout", kind: "note", title: "The expected leak did not appear — and that is worth explaining",
      body: [{ t: "p", text: "The standard warning is that randomly splitting overlapping windows puts near-identical examples in both sets, inflating the test metric. I ran it expecting the random split to look better, and it came out slightly **worse** — 0.2532 against 0.2406. The reason is that this synthetic series is stationary in structure: trend plus a fixed-period cycle plus constant-variance noise, so the test period is statistically identical to the training period and the temporal split poses no extra difficulty. There is nothing for the leak to hide. On real data with regime changes, shifting volatility or structural breaks, a temporal split is genuinely harder and a random split does inflate the metric substantially. So the rule stands — always split temporally — but the *demonstration* of why needs non-stationary data, and I am reporting what I measured rather than the result I expected." }] },

    { t: "h2", n: "03b", text: "Forecasting-specific leakage", id: "feature-leakage" },

    { t: "p", text: "The split is only the most visible way the future gets into a forecasting model. Features are the subtler one, and the failures are quiet." },

    { t: "table", head: ["Feature", "Problem", "Fix"],
      rows: [
        ["Centred rolling mean", "A window centred on time t includes t+1 onwards", "Use trailing windows only"],
        ["`resample().mean()` on the target", "Aggregates across the prediction boundary", "Aggregate, then shift"],
        ["Any statistic over the whole series", "Mean, std, min, max all encode the future", "Compute on the training portion only"],
        ["Interpolated missing values", "Interpolation fills a gap using later points", "Forward-fill, or leave the gap"],
        ["Target-derived features", "Lag 0 of the target is the answer", "Shift every target-derived feature by at least one step"]
      ] },

    { t: "callout", kind: "trap", title: "`.rolling(window, center=True)` is the classic one",
      body: [{ t: "p", text: "Pandas will happily centre a rolling window, and a centred 7-day mean at day t averages days t−3 through t+3. The feature then contains three days of future information at every row, the model learns to rely on it, and offline results are excellent. In production those future values do not exist. Nothing errors, the column looks reasonable, and the only symptom is a model that performs far worse live than it did in backtesting — which is usually attributed to market conditions rather than to the feature. Grep for `center=True` in any forecasting codebase you inherit." }] },

    { t: "h2", n: "04", text: "What this generalises to", id: "generalises" },

    { t: "dl", items: [
      ["Always split temporally", "Even when a random split appears not to hurt, it cannot be trusted, and on non-stationary data it inflates results badly."],
      ["Always report persistence", "It is the real bar for forecasting, and it is frequently not cleared."],
      ["Estimate the noise floor", "It tells you when to stop tuning. On real data, bound it from the residual variance of a well-specified model."],
      ["Report errors in the series' units", "RMSE 3.1 on a series ranging 95 to 158 is interpretable; a normalised loss is not."],
      ["Forecast horizon matters more than architecture", "One step ahead is a far easier problem than twenty; say which you are solving."]
    ] },

    { t: "exercise", kind: "practice", title: "Make the leak visible", difficulty: "advanced", minutes: 45,
      prompt: "Reproduce the comparison including both baselines. Then construct a non-stationary series — add a regime change at day 700 where the trend slope or noise variance shifts — and repeat the random-versus-temporal split comparison. Measure how much the random split inflates the metric now. Finally, extend the forecast horizon to 5 and 20 steps ahead and plot error against horizon for all three architectures and the persistence baseline.",
      hints: [
        "For a regime change, multiply the noise std by 3 after day 700, or change the trend slope.",
        "Persistence for an h-step horizon means predicting the value h steps ago.",
        "Error against horizon should grow for the models and grow faster for persistence."
      ],
      solution: {
        notes: [
          { t: "p", text: "The regime change is what makes the leakage demonstration work. With a structural break, a temporally split test set is drawn from a different distribution than training, which is the real difficulty of forecasting — and a random split destroys that by mixing pre- and post-break windows into both sets. You should see a large gap appear where the stationary version showed essentially none. That is the honest version of the lesson: the danger of random splitting scales with how non-stationary your data is, and real series are considerably less well-behaved than synthetic ones." },
          { t: "p", text: "The horizon sweep usually shows model error growing roughly with the square root of horizon while persistence degrades faster, so the model's advantage over the baseline *widens* with horizon even as its absolute error grows. That is worth knowing when someone reports strong one-step-ahead results: one-step forecasting on a smooth series is nearly trivial, and the interesting question is almost always what happens further out." },
          { t: "p", text: "On the architecture comparison, expect the differences to stay small. I measured LSTM 3.105, GRU 3.283 and RNN 3.423 against a floor of 3.000 — the LSTM is within 3.5 % of optimal and the spread between architectures is a fraction of the gap to the persistence baseline. When you are that close to the noise floor, effort goes into features and horizon definition rather than into the cell type." }
        ]
      } }

  ],

  takeaways: [
    "Split time series temporally and fit scalers on the training portion only.",
    "Measured: LSTM 3.105, GRU 3.283, RNN 3.423, persistence 3.977, mean 24.409.",
    "The series' noise floor is 3.000, so the LSTM is within 3.5 % of the best any model could do.",
    "Always report the persistence baseline — many forecasting models fail to beat it.",
    "The random-split leak did *not* appear on this stationary synthetic series (0.2532 against 0.2406).",
    "It appears on non-stationary data; the rule holds, but the demonstration needs a regime change.",
    "Report error in the series' own units so it can be judged."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why must time series be split temporally rather than randomly?",
      options: ["Random splits are slower", "A random split lets the model train on windows that overlap or postdate the test period", "Temporal splits produce more data", "It only matters for RNNs"],
      answer: 1,
      why: "Overlapping sliding windows put near-identical examples in both sets, and a random split also lets the model learn from periods after the test window. Note the measured caveat: on a stationary synthetic series the inflation was negligible — the effect scales with how non-stationary the data is, and real series are much less well-behaved." },
    { stem: "What is the persistence baseline and why does it matter?",
      options: ["Predicting the training mean", "Predicting that tomorrow equals today — often very hard to beat", "A moving average", "The model's previous prediction"],
      answer: 1,
      why: "It scored RMSE 3.977 here against the LSTM's 3.105. On real financial series it is frequently not beaten at all, and a predictions-versus-actuals plot looks convincing for a model that merely echoes its last input. If your forecaster does not beat persistence, it is not a forecaster." },
    { stem: "The series is built as trend + seasonality + N(0, 3). What is the best achievable RMSE?",
      options: ["0", "About 3.0 — the noise is unlearnable by construction", "About 1.0", "It depends on the model"],
      answer: 1,
      why: "The noise term is independent of everything the model can observe, so no amount of capacity predicts it. The LSTM's 3.105 is within 3.5 % of that floor, meaning it has extracted essentially all the learnable structure and further tuning would be wasted effort." },
    { stem: "The measured random-split test error was slightly *worse* than the temporal split. What explains this?",
      options: ["The measurement is wrong", "The series is stationary, so the test period is statistically identical to training and there is nothing for the leak to hide", "Random splits are always better", "The model overfitted"],
      answer: 1,
      why: "Trend plus fixed-period cycle plus constant-variance noise means the test window poses no distributional challenge, so a temporal split is not harder and a random split gains nothing. The leak becomes large when there are regime changes or shifting volatility — which real series have and synthetic ones often do not." }
  ] },

  interview: { title: "Interview", sub: "Forecasting", questions: [
    { level: "Core", q: "How do you evaluate a time-series forecasting model?",
      strong: "Temporal split, persistence baseline, error in the series' units, and an estimate of the noise floor.",
      answer: [{ t: "p", text: "Split temporally and fit any scaler on the training portion only, since computing statistics over the whole series puts the future into every training example. Then compare against baselines, and the essential one is persistence — predicting that tomorrow equals today. I measured that at RMSE 3.977 on a synthetic series where the LSTM reached 3.105, and on real financial data persistence is often not beaten at all. Report the error in the series' own units so it can be judged against the quantity being predicted, not as a normalised loss. And I would try to bound the noise floor: this series was built with N(0, 3) noise, so 3.0 is the best achievable and the LSTM at 3.105 was within three and a half per cent of optimal, which tells you immediately that further tuning is pointless. On real data you cannot compute that exactly but you can usually estimate it, and it stops a lot of wasted effort." }] },
    { level: "Senior", q: "How do you know when to stop improving a forecasting model?",
      strong: "Estimate the irreducible noise floor and stop when you are close to it.",
      answer: [{ t: "p", text: "By bounding how much of the series is predictable at all. On a synthetic series built as trend plus seasonality plus N(0, 3) noise, the best achievable RMSE is 3.0 by construction, and I measured an LSTM at 3.105 — within three and a half per cent of optimal, which means every remaining point of error is noise and further tuning is wasted. On real data you cannot compute that exactly, but you can estimate it: fit a well-specified model and look at the residual autocorrelation, and if the residuals are indistinguishable from white noise there is no structure left to extract. Without that number people tune indefinitely against a target they cannot reach, or worse, keep pushing until they find a configuration that beats the floor — which is always a sign of leakage rather than skill. The same reasoning applies to the other end: if your model is far from the floor and also barely beating persistence, the problem is usually features or horizon definition rather than architecture." }] },
    { level: "Senior", q: "You inherit a forecasting model with impressive plots. What do you check?",
      strong: "Whether it beats persistence, whether the split was temporal, and what horizon it actually predicts.",
      answer: [{ t: "p", text: "The plots are the least informative artefact, because a model that outputs its last input with a small correction produces a predictions-versus-actuals chart that looks excellent — the line tracks the data closely, just shifted by one step. So first, does it beat a persistence baseline, and is that number reported anywhere. Second, was the split temporal: overlapping sliding windows split randomly put near-identical examples in both sets, and the model may also have trained on periods after the test window. I would note that the size of that effect depends on stationarity — I measured essentially no inflation on a smooth synthetic series, and it becomes large when there are regime changes, which real data has. Third, what horizon is being predicted, because one step ahead on a smooth series is nearly trivial and the interesting question is what happens at five or twenty steps. And fourth, whether any feature encodes information unavailable at prediction time, which is the forecasting-specific form of leakage and is easy to introduce accidentally with rolling statistics." }] }
  ] }
});

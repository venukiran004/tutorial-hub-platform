/* ============================================================================
   LESSON 10.9 — Forecasting in Production: The Store-Sales Case
   ========================================================================= */
EC.receiveLesson({
  id: "10.9",

  lede: "**A forecast is a perishable product: the pipeline that refreshes it, the checks that catch it going stale, and the record of what was predicted matter more than the model class — and this lesson runs the whole module on the store data from the raw file to the table that ends the review.** The raw feed loses nine duplicate rows, gains five missing days, drops a partial last day and has one till fault set missing. Four methods are backtested on identical folds — eight origins, 28 days apart, 28-day horizon, all three stores, refit at every origin — and written to a forecast-versus-actual table of 2,688 rows. On that table SARIMAX with the calendar has a WAPE of 6.29 %, the global boosting model 7.90 %, damped ETS 9.45 % and the seasonal naive 10.65 %; the boosting model under-forecasts by 5.6 units a day and a blanket +5 % override improves it, which is a finding about the model's bias, not about overrides; reconciliation with a weaker total costs 4 %. The same table answers the monitoring questions — which run, which store, which horizon — and shows the seasonal naive beaten in 8 of 8 runs by two models and 6 of 8 by the third. PSI is shown to alarm on its own sampling noise with 28-day windows (1.22 under no change) and to flag the yearly cycle when the reference is the previous quarter (2.42), and to be right when the windows are a year apart (0.19 for a 5 % trend, 3.90 across store C's shift). Re-forecasting a SARIMAX with a week of new actuals takes 18 ms; refitting it 1.4 s; the global boosting 9 s per origin.",

  objectives: [
    "Run the full pipeline — hygiene, features, baselines, backtest, intervals, reconciliation — on one problem and produce the result table",
    "Choose between batch and on-demand serving, and between re-forecasting and refitting, with their measured costs",
    "Design the monitoring layers and read the forecast-versus-actual table to localise a degradation",
    "Conduct a forecast-value-added review and interpret a negative or surprising step",
    "Use the model chooser and the symptom-to-cause table to decide what to do next"
  ],

  prerequisites: ["10.8", "10.7", "10.6"],

  blocks: [

    { t: "h2", n: "01", text: "The decisions, and why", id: "decisions" },

    { t: "table", head: ["Decision", "Choice for the store case", "Reason"], rows: [
      ["Granularity", "daily, per store", "matches the replenishment decision"],
      ["Horizon", "28 days", "matches the ordering lead time"],
      ["Seasonality", "m = 7, plus a yearly Fourier pair", "the weekly shape and the summer peak (10.1)"],
      ["Transformation", "logs", "the swing scales with the level (10.1)"],
      ["Metric", "WAPE for the business, MASE for selection, bias always", "volume-weighted; scale-free; direction (10.3)"],
      ["Baseline", "seasonal naive, mean of four weeks", "the strongest free forecast on this data (10.3)"],
      ["Backtest", "8 origins 28 days apart, h = 28, refit at each; lags ≥ 1 with same-day known covariates", "enough folds to see the spread; the features respect the availability rule (10.3, 10.6)"],
      ["Candidates", "damped ETS, SARIMAX + calendar, one global direct boosting model", "the two classical families and the ML route, all with the same calendar"],
      ["Intervals", "SARIMAX analytic; split conformal per horizon block for the boosting model", "coverage checked, not assumed (10.7)"],
      ["Reconciliation", "MinT over stores → total", "the plan must add up (10.8)"],
      ["Closures", "interpolated for fitting, overridden to zero in the output", "a closure is not a sales observation (10.1)"]
    ] },

    { t: "code", lang: "python", title: "From sales_raw.csv to the fitting panel (executed; every fix counted)",
      code: `raw rows 2,740
-> duplicates removed: 9                      (an ETL re-run of three days)
-> asfreq('D') adds 5 missing days            (store B, 10-14 June 2024; interpolated)
-> last day at 37 % of the previous week's:   dropped
-> till fault (store A, 2024-02-17 = 3.10):   set missing, interpolated
-> closures (5 days) interpolated for the fit; the output forecast for a closed day is overridden to 0
fitting panel: 911 days × 3 stores;  calendar known in advance: promo, Black Friday, Christmas week, closed, yearly sin/cos`,
      caption: "Every hygiene decision from 10.1 is a line that runs nightly and is logged with its count. A count that changes — twelve duplicates instead of nine, a partial day that is not the last one — is the data-quality gate's alarm, and it aborts the run before a model sees the data." },

    { t: "h2", n: "02", text: "The result table that ends the review", id: "results" },

    { t: "code", lang: "python", title: "All three stores, eight origins, 28 days ahead (executed; 234 s for the backtest)",
      code: `#  model                          WAPE      MASE    bias     WAPE h=1-7   WAPE h=22-28
#  seasonal naive (4-week mean)   10.65 %   1.064   +5.90     10.47 %      10.59 %      <- the yardstick
#  ETS damped (A,Ad,M)             9.45 %   0.937   +5.50      8.68 %       9.54 %
#  SARIMAX + calendar              6.29 %   0.638   −1.27      6.53 %       6.27 %      <- ship this
#  global boosting (direct)        7.90 %   0.792   +5.60      7.83 %       7.95 %

#  intervals:  SARIMAX analytic 80 %: coverage 0.821, mean width 36.3
#              boosting + split conformal per horizon block, calibrated on runs 1-4, scored on 5-8: coverage 0.777 at a nominal 0.80
#              (half-widths 24.2 / 20.1 / 18.4 / 20.0 for blocks 1-7 / 8-14 / 15-21 / 22-28)`,
      caption: "On three stores with a known calendar and a structure that is linear on logs, the two-parameter SARIMAX with the calendar wins by a wide margin, and the boosting model's +5.6 bias — it under-forecasts on a series rising into its summer peak — is the tree blind spot of 10.6 in a mild form. MASE is the store-averaged ratio to each store's own seasonal-naive scale; WAPE is volume-weighted across stores. The h = 1–7 and h = 22–28 columns barely differ because the calendar carries most of the predictable variation at every horizon." },

    { t: "callout", kind: "insight", title: "Notice what actually moved the number", body: "From the baseline to a decent classical model (ETS) bought 1.2 points of WAPE. Adding the calendar as regressors bought 3.2 more — the largest step in the whole pipeline, and it came from knowing the promotion dates, not from a better algorithm. The ML route, with the same calendar, landed between the two. The backtest, the gap, the metric and the availability rule are what made those numbers visible and comparable; the model class was the smallest decision." },

    { t: "h2", n: "03", text: "The forecast-value-added review", id: "fva" },

    { t: "code", lang: "python", title: "Each level of effort scored against the previous one (executed)",
      code: `#  level                                              WAPE      MASE    bias     value added over the previous level
#  seasonal naive (4-week mean)                       10.65 %   1.064   +5.90    <- the yardstick
#  + ETS damped                                        9.45 %   0.937   +5.50    +11.2 %
#  + SARIMAX with the calendar                         6.29 %   0.638   −1.27    +33.5 %
#  + global boosting, direct                           7.90 %   0.792   +5.60    −25.6 %      <- the ML step is negative on this data
#  + MinT reconciliation (with an ETS total node)      8.22 %   0.821   +5.56     −4.1 %      <- the price of coherence with a weaker total
#  + a planner's blanket +5 % override on the boosting 7.84 %   0.796   −2.39     +4.6 %      <- constructed; it corrects a real bias`,
      caption: "The review records what each stage of the pipeline added, and it is allowed to be negative. Here the ML step is negative relative to SARIMAX, reconciliation costs 4 % because the total's forecast is worse than the stores' (10.8), and a crude human override *helps* — because the boosting model under-forecasts by 5.6 a day and any upward nudge corrects it. That last line is not a licence for overrides; it is a finding about the model's bias, and the SARIMAX row carries −1.27 of bias with no override at all. In real planning organisations the override line is more often negative, and this review is what exposes it either way." },

    { t: "h2", n: "04", text: "Serving, retraining and monitoring", id: "serving" },

    { t: "viz",
      title: "The nightly run",
      caption: "Batch precompute is the default for demand planning: the data changes once a day, so the forecast does; writing it to a table gives the audit log for free. Re-forecasting through the fitted model is cheap and daily; refitting is expensive and weekly, or on a changepoint alarm.",
      svg: `<svg viewBox="0 0 900 200" role="img" aria-label="A timeline of seven nightly stages from ingest at 02:00 to the accuracy comparison at 05:00, with a data-quality gate that can abort the run and a weekly refit branch.">
  <line x1="40" y1="100" x2="860" y2="100" stroke="var(--line)" stroke-width="2"/>
  <g font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="var(--ink)">
    <g><rect x="40" y="70" width="100" height="60" rx="6" fill="var(--surface-2)" stroke="var(--line)"/><text x="90" y="92" text-anchor="middle" font-weight="600">02:00 ingest</text><text x="90" y="108" text-anchor="middle" fill="var(--ink-3)">yesterday's actuals</text><text x="90" y="122" text-anchor="middle" fill="var(--ink-3)">→ raw table</text></g>
    <g><rect x="160" y="70" width="100" height="60" rx="6" fill="var(--surface-2)" stroke="var(--crit)"/><text x="210" y="92" text-anchor="middle" font-weight="600">02:30 gate</text><text x="210" y="108" text-anchor="middle" fill="var(--ink-3)">rows, nulls, dupes,</text><text x="210" y="122" text-anchor="middle" fill="var(--ink-3)">max timestamp → abort?</text></g>
    <g><rect x="280" y="70" width="100" height="60" rx="6" fill="var(--surface-2)" stroke="var(--line)"/><text x="330" y="92" text-anchor="middle" font-weight="600">03:00 features</text><text x="330" y="108" text-anchor="middle" fill="var(--ink-3)">past-only, versioned</text><text x="330" y="122" text-anchor="middle" fill="var(--ink-3)">+ calendar known ahead</text></g>
    <g><rect x="400" y="70" width="100" height="60" rx="6" fill="var(--surface-2)" stroke="var(--accent)"/><text x="450" y="92" text-anchor="middle" font-weight="600">03:30 model</text><text x="450" y="108" text-anchor="middle" fill="var(--ink-3)">re-forecast daily (18 ms)</text><text x="450" y="122" text-anchor="middle" fill="var(--ink-3)">refit weekly (1.4 s)</text></g>
    <g><rect x="520" y="70" width="100" height="60" rx="6" fill="var(--surface-2)" stroke="var(--line)"/><text x="570" y="92" text-anchor="middle" font-weight="600">04:00 forecast</text><text x="570" y="108" text-anchor="middle" fill="var(--ink-3)">28 × 3 × (p10, p50, p90)</text><text x="570" y="122" text-anchor="middle" fill="var(--ink-3)">stamped with run_id</text></g>
    <g><rect x="640" y="70" width="100" height="60" rx="6" fill="var(--surface-2)" stroke="var(--line)"/><text x="690" y="92" text-anchor="middle" font-weight="600">04:30 reconcile</text><text x="690" y="108" text-anchor="middle" fill="var(--ink-3)">MinT: stores → total</text><text x="690" y="122" text-anchor="middle" fill="var(--ink-3)">closures → 0</text></g>
    <g><rect x="760" y="70" width="100" height="60" rx="6" fill="var(--surface-2)" stroke="var(--good)"/><text x="810" y="92" text-anchor="middle" font-weight="600">05:00 score</text><text x="810" y="108" text-anchor="middle" fill="var(--ink-3)">yesterday's forecast vs</text><text x="810" y="122" text-anchor="middle" fill="var(--ink-3)">actual; naive beside it</text></g>
  </g>
  <path d="M210 130 L210 165 L90 165 L90 130" fill="none" stroke="var(--crit)" stroke-width="1" stroke-dasharray="4 3"/><text x="150" y="180" font-size="11" fill="var(--crit)" font-family="ui-sans-serif, system-ui, sans-serif" text-anchor="middle">gate fails → abort, page, keep yesterday's forecast</text>
  <path d="M810 130 L810 165 L450 165 L450 130" fill="none" stroke="var(--good)" stroke-width="1" stroke-dasharray="4 3"/><text x="630" y="180" font-size="11" fill="var(--good)" font-family="ui-sans-serif, system-ui, sans-serif" text-anchor="middle">accuracy breach or changepoint alarm → refit now, truncated history</text>
</svg>` },

    { t: "table", head: ["Signal", "Retraining cadence"], rows: [
      ["Stable process, slow-moving series", "monthly refit, daily re-forecast"],
      ["Retail with promotions", "weekly refit"],
      ["Changepoint detected (10.8: CUSUM alarm four days after the shift)", "immediate refit on truncated history, or a step regressor"],
      ["Rolling accuracy breaches a threshold against the baseline", "trigger a refit; if it does not recover, revisit the features"],
      ["Data schema or definition change", "refit and revalidate the backtest"]
    ] },

    { t: "code", lang: "python", title: "Re-forecast versus refit, measured (executed, store A)",
      code: `SARIMAX + calendar:  refit from scratch 1,408 ms;  append a week of actuals without refitting and re-forecast 28 days: 18 ms
per origin in the backtest:  ETS 138 ms · SARIMAX 1,329 ms · global direct boosting (28 models over 3 stores) 9 s
# 200 stores × SARIMAX refit ≈ 4.5 minutes nightly; 200 stores × re-forecast ≈ 4 seconds -- refit weekly, re-forecast daily`,
      caption: "Re-forecasting runs the latest actuals through the fitted model and updates the state; refitting re-estimates the parameters. Conflating them is why teams either serve stale forecasts or burn compute nightly for no accuracy gain. The global boosting model is one fit for all stores, which is its scaling advantage; per-store SARIMAX is 200 fits, which is why the reference case keeps it as a fallback rather than the default at scale." },

    { t: "table", head: ["Layer", "Metric", "Alarm on"], rows: [
      ["Input", "row count, null rate, max timestamp, duplicate count", "any deviation from the daily norm (the 9 duplicates and the 37 % partial day would both fire)"],
      ["Input", "feature distribution against a like-for-like reference (PSI, KS)", "PSI > 0.2 with windows long enough and a year-apart reference (§05)"],
      ["Output", "forecast distribution against the last run", "a large jump without an input reason"],
      ["Accuracy", "rolling WAPE and MASE per horizon and per store, with the seasonal naive scored beside them", "worse than the baseline, or a step change"],
      ["Calibration", "empirical coverage of the 80 % and 95 % bands", "coverage below nominal minus 10 points"],
      ["Bias", "rolling mean error", "the same sign for 14 days (fired once in the executed table)"],
      ["Freshness", "age of the newest actual and of the newest forecast", "past the SLA"]
    ] },

    { t: "h2", n: "05", text: "Reading the forecast-versus-actual table", id: "monitoring" },

    { t: "p", text: "The single most valuable artefact is a table with one row per (store, target date, horizon, run, model, forecast, interval, actual). It makes every question answerable after the fact — which horizon degraded, when, for which store, under which model version — and it is what the backtest wrote. Without it a regression is unarguable; with it the questions below are one-line queries." },

    { t: "code", lang: "python", title: "Queries on the 2,688-row table (executed)",
      code: `WAPE by run (origin):        boosting    naive            beat the naive:   ETS 6 of 8 runs · SARIMAX 8 of 8 · boosting 8 of 8
  2024-11-17 (Black Friday)     11.50     14.04            worst run:        ETS 14.72 % and boosting 11.50 % on the Black Friday window; SARIMAX 7.25 % on the Christmas window
  2024-12-15 (Christmas)         8.43     15.70
  2025-01-12                     8.55      8.67   <- the naive nearly caught up in January: the calendar is quiet
  2025-02-09 .. 2025-06-01    6.7-7.3   8.5-10.6

boosting WAPE by horizon block:  1-7 7.83 · 8-14 8.21 · 15-21 7.59 · 22-28 7.95     -- flat: the calendar, not the lags, carries the horizon
boosting by store:               A 7.54 % (bias +10.2) · B 7.84 % (+3.1) · C 8.75 % (+3.6)   -- the bias lives at store A
worst (store, block) for boosting: (C, 8-14) 10.71 %;  best: (B, 15-21) 6.23 %
SARIMAX 80 % coverage by block:  1-7 0.77 · 8-14 0.79 · 15-21 0.85 · 22-28 0.87   -- honest near, slightly wide far
SARIMAX's three worst days:      27 and 29 May 2025, 27 June 2025 (summed |error| 79-84 over three stores) -- promotion days at the summer peak
longest run of same-sign daily mean error: 14 days -> a 14-day bias rule fires once`,
      caption: "The table localises: the boosting model's bias is a store-A problem, the naive's failures are the event windows, the intervals are right where the decision is made (the first two weeks) and a little wide beyond. The baseline is in the same table on the same days, which is the only way to know that a model which beat it at launch is still beating it." },

    { t: "code", lang: "python", title: "PSI is only as good as its reference (executed)",
      code: `# under NO change (two samples from the same distribution), mean PSI over 2,000 draws:
#   n = 28 per window, 10 bins: 1.219      <- a month of daily data cannot use PSI at all
#   n = 91, 10 bins: 0.223 · 91, 5 bins: 0.092 · 365, 10 bins: 0.049 · 365, 5 bins: 0.023        (the usual alarm is 0.2)

# daily sales, 5 bins, quarter-long windows:
#   store A, Apr-Jun 2025 vs Apr-Jun 2024:   0.189     a 5 % trend, same season -- just under the alarm
#   store A, Apr-Jun 2025 vs Jan-Mar 2025:   2.416     the yearly cycle: a false alarm if the reference is the previous quarter
#   store C, Sep-Nov 2024 vs Sep-Nov 2023:   3.900     the level shift, correctly flagged
#   store B, Sep-Nov 2024 vs Sep-Nov 2023:   0.088     no shift, correctly quiet`,
      caption: "A drift statistic on a seasonal series must compare like with like — the same season a year earlier — and must have enough points per window to sit below its own sampling noise; a 28-day window fires on nothing. The same discipline as the outlier rule in 10.1 and the CUSUM input in 10.8: the reference must be a distribution that is actually stable." },

    { t: "h2", n: "06", text: "The model chooser and the cheat sheet", id: "chooser" },

    { t: "code", lang: "text", title: "The decision path",
      code: `how many series?
├── ONE
│   ├── fewer than ~50 points ............ seasonal naive or drift; anything else over-fits
│   ├── 50-500 points
│   │   ├── trend + one season ........... damped ETS or SARIMA (10.4, 10.5)
│   │   ├── known-future covariates ...... SARIMAX (the store case: 6.29 % vs 7.90 % for boosting)
│   │   └── several seasons .............. MSTL + ETS, Fourier terms in SARIMAX, or Prophet (additive trend + seasons + holidays; convenient, rarely the most accurate; not run here)
│   └── 1,000+ points, non-linear ........ boosting on features, with a trend fix (10.6)
└── MANY related series
    ├── rich covariates, tabular ......... ONE global boosting model (−11 % vs per-store in 10.6)
    ├── long context, lots of data ....... N-HiTS / TFT / DeepAR
    ├── no time to build anything ........ a foundation model zero-shot, as the baseline to beat
    └── a hierarchy that must add up ..... any of the above + MinT (10.8)

always: baselines first · rolling-origin backtest with a gap · MASE and bias · an interval with its coverage checked · the baseline monitored beside the model`,
      caption: "The path is a starting point, and the backtest is the arbiter: on the store data the 'known-future covariates' branch was decisive and the ML branch, though it used the same covariates, was not the winner." },

    { t: "table", head: ["Symptom", "Likely cause", "Fix"], rows: [
      ["Backtest superb, production poor", "leakage", "audit against the catalogue in 10.3; assert availability"],
      ["Forecast is a flat line", "SES or naive fitted; or a tree outside its range", "add trend and season; model differences"],
      ["Forecast flattens far out", "a tree model beyond the training range", "difference, ratio to level, or linear + boosted residual (10.6)"],
      ["Error explodes at long horizons", "recursive compounding", "direct or multi-output (10.6)"],
      ["Intervals too narrow", "an analytic formula assuming the model is right; training residuals", "conformal on a recent block; check coverage (10.7)"],
      ["Residual ACF spiky at lag m", "missing seasonal terms", "add (P, D, Q)_m (10.5)"],
      ["ACF at lag 1 near −0.5", "over-differenced", "reduce d (10.2)"],
      ["Great MAPE, stock-outs everywhere", "MAPE rewarded under-forecasting", "WAPE and MASE; watch bias (10.3)"],
      ["Model was fine, degraded suddenly", "changepoint", "detect it, retrain on post-break data (10.8)"],
      ["One store wrecks the aggregate", "scale differences", "MASE per series; volume weights"],
      ["Persistent one-sign error", "a missing trend, level shift or regressor", "the bias monitor; a step regressor; the FVA review"]
    ] },

    { t: "dl", items: [
      ["First thing to do", "plot it, then decompose it (10.1)"],
      ["First model to fit", "the seasonal naive, averaged over a few weeks (10.3)"],
      ["Additive or multiplicative", "does the swing grow with the level? if yes, logs (10.1)"],
      ["How many differences", "as few as possible; seasonal first; ADF and KPSS both (10.2)"],
      ["ACF cuts off at q / PACF cuts off at p / both decay", "MA(q) / AR(p) / ARMA by AICc — never across different d (10.2, 10.5)"],
      ["Default single-series model", "damped ETS, or SARIMAX with the calendar if there is one (10.4, 10.5)"],
      ["Default many-series model", "one global boosting model with a trend fix, direct strategy (10.6)"],
      ["Default metric", "MASE for selection, WAPE for the business, bias always (10.3)"],
      ["Default validation", "rolling origin, expanding or sliding by the backtest, with a gap (10.3)"],
      ["Default interval", "conformal on a recent block, adaptive under drift, coverage checked per horizon (10.7)"],
      ["Always monitor", "the baseline, next to the model, in the same table, every day (10.9)"]
    ] },

    { t: "ladder",
      title: "Shipping the store forecast",
      rungs: [
        { level: "bad", label: "One model, one number, refit nightly, no record", code: `model.fit(all_data); write(model.predict(28))`,
          note: "**No baseline to know whether 7.9 % is good; no table to know when it stopped being good; a nightly refit that costs 200× the re-forecast for no gain; and a forecast of sales on Christmas Day.**" },
        { level: "ok", label: "Backtested model, batch table, weekly refit", code: `backtest -> choose SARIMAX + calendar (6.29 % vs naive 10.65 %)
nightly: append actuals, re-forecast, write (store, date, h, run_id, forecast)`,
          note: "Honest and cheap. Still missing the interval, the reconciliation, the baseline scored beside the model each day, and the monitors that would catch a shift or a broken feed." },
        { level: "best", label: "The full run: gate, features, model, intervals, reconciliation, scoring, FVA", code: `02:30 gate (counts, nulls, dupes, freshness)  ->  03:30 re-forecast daily / refit weekly or on a CUSUM alarm
04:00 p10/p50/p90 with coverage tracked      ->  04:30 MinT; closures -> 0
05:00 score yesterday against actuals, naive beside it, by store and horizon; bias run-length; PSI year-on-year
monthly: the FVA review from the same table`,
          note: "Every number the review needs is produced by the pipeline that serves the forecast, and every failure mode this module measured has a monitor with an executed alarm rule behind it." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The FVA review shows the global boosting step at −25.6 % relative to SARIMAX and a +5 % planner override at +4.6 %. What should happen next?",
          options: [
            "Adopt the override permanently and drop SARIMAX",
            "Ship SARIMAX (6.29 %, bias −1.27); read the override's gain as evidence of the boosting model's +5.6 bias and fix that in the model — a trend fix or the ratio target from 10.6 — rather than institutionalise a manual correction",
            "Average the boosting and the override",
            "Drop the FVA review because it gave a surprising answer"
          ],
          answer: 1,
          why: "The review's job is to attribute accuracy to stages honestly, including negative and surprising steps. A crude override that helps is a diagnostic: it says the model is biased in a known direction. The right response is to remove the bias at source and re-run the review, at which point the override's value should return to zero or below."
        },
        {
          stem: "Why is re-forecasting separated from refitting in the nightly run?",
          options: [
            "Because refitting is impossible in batch",
            "Because re-forecasting (18 ms: run the new actuals through the fitted model and update its state) captures the daily information, while refitting (1.4 s, or 9 s for the global model) re-estimates parameters that change slowly; nightly refits cost 200× for no accuracy and weekly refits plus daily re-forecasts give both",
            "Because the model must never see new data between refits",
            "Because re-forecasting is more accurate"
          ],
          answer: 1,
          why: "Parameters — smoothing constants, ARMA coefficients, tree splits — are properties of the process and move slowly; the state — the current level, season and last residual — moves daily. Conflating the two is why teams serve stale forecasts or burn compute nightly. A changepoint alarm is the exception that triggers an immediate refit on truncated history."
        },
        {
          stem: "A PSI monitor with 28-day windows reports 1.2 on a feature every week. What is happening?",
          options: [
            "The feature is drifting badly",
            "Nothing: with 28 points per window and 10 bins the expected PSI under no change is 1.22 — the monitor is reporting its own sampling noise; it needs windows of hundreds of points, fewer bins, and a reference from the same season a year earlier",
            "The bins are wrong",
            "The reference window is too long"
          ],
          answer: 1,
          why: "PSI is a sum of relative-entropy terms over bins, each estimated from a handful of points; the executed null values were 1.22 (28 points, 10 bins), 0.22 (91, 10), 0.09 (91, 5) and 0.02 (365, 5). And on a seasonal series a previous-quarter reference fires on the yearly cycle (2.42) while a year-apart reference is quiet on a 5 % trend (0.19) and loud on a real shift (3.90)."
        },
        {
          stem: "Which single artefact makes a production forecasting regression arguable, and what is in it?",
          options: [
            "The model file",
            "The forecast-versus-actual table: one row per (series, target date, horizon, run, model version, forecast, interval, actual), with the baseline scored in the same rows — from which WAPE by run, store and horizon, coverage by horizon, bias run-length and the FVA review are all one-line queries",
            "The training log",
            "The dashboard screenshot"
          ],
          answer: 1,
          why: "The executed backtest wrote 2,688 such rows and every monitoring answer in the lesson came from them: the naive beaten in 8 of 8 runs, the bias at store A, the event windows where the naive failed, the coverage by horizon. A model file says what the model is; the table says what it did."
        }
      ] },

    { t: "exercise",
      kind: "Investigate",
      title: "An FVA table, queries on the forecast table, and the monitor that lies",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** A pipeline's WAPE by stage is 12.0 (seasonal naive), 10.2 (+ ETS), 9.1 (+ boosting), 9.4 (+ reconciliation), 8.8 (+ override). Compute the value added at each stage over the previous one and cumulatively over the naive, and say what each negative or positive step means." },
        { t: "p", text: "**(b)** On the saved forecast-versus-actual table, find for the boosting model the three worst (store, horizon block) WAPEs and the best; count the runs in which each model beat the seasonal naive and report each model's worst run; give the SARIMAX 80 % coverage by horizon block; and list SARIMAX's three worst days summed over stores." },
        { t: "p", text: "**(c)** Simulate PSI under no change for window sizes 28, 91 and 365 with 10 and 5 bins, then compute PSI of daily sales for store A between April–June 2025 and (i) April–June 2024, (ii) January–March 2025, and for stores B and C between September–November 2024 and the same months in 2023. Explain which comparisons are legitimate." }
      ],
      requirements: [
        "(a) two columns of percentages and a sentence per step.",
        "(b) the four query results.",
        "(c) five null values and four comparisons with the explanation."
      ],
      hint: "(a) Value added is relative to the previous stage, not the naive. (b) The table has a horizon column; bin it. (c) PSI's null mean is roughly (bins − 1)(1/n₁ + 1/n₂).",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) stage              WAPE    vs previous    cumulative vs naive
#     seasonal naive      12.0
#     + ETS               10.2      +15.0 %          +15.0 %
#     + boosting           9.1      +10.8 %          +24.2 %
#     + reconciliation     9.4       −3.3 %          +21.7 %      the price of coherence: acceptable if small, since an incoherent plan cannot be executed
#     + override           8.8       +6.4 %          +26.7 %      a helpful override is a bias the model should be fixing

# (b) boosting worst (store, block): (C, 8-14) 10.71 %, (C, 1-7) 9.03 %, (B, 8-14) 9.01 %;  best (B, 15-21) 6.23 %
#     beat the naive:  ETS 6 of 8 runs (worst 14.72 %, the Black Friday window)
#                      SARIMAX 8 of 8 (worst 7.25 %, the Christmas window)
#                      boosting 8 of 8 (worst 11.50 %, the Black Friday window)
#     SARIMAX 80 % coverage by block: 1-7 0.77 · 8-14 0.79 · 15-21 0.85 · 22-28 0.87
#     SARIMAX's worst days: 2025-05-29 (83.7), 2025-05-27 (78.7), 2025-06-27 (76.3) -- promotion days at the summer peak

# (c) PSI under no change: n 28 / 10 bins 1.219;  91 / 10 0.223;  91 / 5 0.092;  365 / 10 0.049;  365 / 5 0.023
#     store A Apr-Jun 2025 vs Apr-Jun 2024: 0.189   legitimate (same season, a year apart): a 5 % trend, just under the alarm
#     store A Apr-Jun 2025 vs Jan-Mar 2025: 2.416   illegitimate: the reference is a different season, and the yearly cycle fires the alarm
#     store C Sep-Nov 2024 vs Sep-Nov 2023: 3.900   legitimate and correct: the level shift
#     store B Sep-Nov 2024 vs Sep-Nov 2023: 0.088   legitimate and quiet: no shift`,
        notes: [
          { t: "p", text: "(a) is the arithmetic of the review and the reading of its two awkward rows." },
          { t: "p", text: "(b) is the table doing the job the lesson claims for it: four monitoring questions, four one-line queries." },
          { t: "p", text: "(c) is the monitor that lies unless its reference and its sample size are right, with the null values that say how large the windows must be." }
        ]
      }
    }
  ],

  takeaways: [
    "The pipeline is the product: hygiene with counted fixes, features that respect availability, baselines on the same folds, a refit-per-origin backtest, intervals with checked coverage, reconciliation, and a forecast-versus-actual table that everything else reads.",
    "On the store case SARIMAX with the calendar won (WAPE 6.29 %, MASE 0.638, bias −1.27) over global boosting (7.90 %), damped ETS (9.45 %) and the seasonal naive (10.65 %); the calendar, not the algorithm, was the largest step, and the ML step was negative on this data.",
    "The FVA review scores each stage against the previous one and is allowed to surprise: reconciliation with a weaker total cost 4 %, and a blanket +5 % override helped because the boosting model under-forecast by 5.6 — a bias to fix in the model, not a case for overrides.",
    "Serve in batch, re-forecast daily (18 ms) and refit weekly (1.4 s, or 9 s for the global model) or on a changepoint alarm; monitor inputs, outputs, accuracy per horizon and store with the baseline beside the model, calibration, bias run-length and freshness.",
    "The forecast-versus-actual table localises everything: the naive was beaten in 8 of 8 runs by two models and failed on the event windows, the boosting bias lives at store A, the intervals are right in the first two weeks and slightly wide beyond.",
    "A drift monitor needs a like-for-like reference and enough points: PSI's null mean is 1.22 with 28 points and 10 bins, a previous-quarter reference fires on the yearly cycle (2.42), and a year-apart reference is quiet on a trend (0.19) and loud on a real shift (3.90).",
    "The model chooser starts from the number of series and the covariates you know; the symptom-to-cause table names the fix for each way a forecast fails; and the backtest, not the chooser, has the last word."
  ],

  quiz: {
    title: "Forecasting in Production — Knowledge Check",
    questions: [
      {
        stem: "The data-quality gate at 02:30 counts duplicate rows and finds 9, the same as every night since the ETL was fixed. Tonight it finds 30. What should happen?",
        options: [
          "Deduplicate and continue — the fix handles duplicates",
          "Abort the run, keep yesterday's forecast, and page: a change in the count means the upstream process changed, and a forecast built on it would be plausible and wrong — the same 'silent fault' the hygiene checks of 10.1 exist to catch",
          "Sum the duplicates instead",
          "Skip the gate tonight and investigate tomorrow"
        ],
        answer: 1,
        why: "The gate's value is in the comparison with the norm, not in the fix: the fix assumes the duplication means what it meant before. A tripled count might be a re-run of ten days, or genuine partial records that should be summed. Serving yesterday's forecast for one more day costs little; serving a forecast trained on a corrupted feed costs weeks of wrong orders."
      },
      {
        stem: "Why must the seasonal naive be scored every day in the same table as the production model?",
        options: [
          "For the FVA review only",
          "Because a model that beat the baseline at launch can quietly stop beating it after a regime change, and only a live side-by-side comparison shows it; in the executed table the naive nearly caught up in the quiet January window (8.67 vs 8.55) and fell far behind in the event windows",
          "Because the naive is cheaper",
          "Because the naive has no bias"
        ],
        answer: 1,
        why: "Accuracy has no absolute scale; the baseline is the yardstick, and yardsticks drift too. A model at 8.5 % WAPE is excellent when the naive is at 15 % and worthless when the naive is at 8.6 %. Scoring both on the same days in the same rows is the only way to keep the comparison honest over time."
      },
      {
        stem: "A CUSUM alarm fires on a store four days after a refurbishment. What is the retraining response, and why not just wait for the weekly refit?",
        options: [
          "Wait — the weekly refit will pick it up",
          "Refit immediately on truncated history (or add a step regressor): a scheduled refit on the full history keeps averaging the old level into the forecast, which 10.3 measured as a +22.8 bias for months with an expanding window",
          "Increase the smoothing parameters",
          "Switch to the seasonal naive until the next month"
        ],
        answer: 1,
        why: "A changepoint means the model's assumptions have expired, and a refit that includes the pre-break history does not restore them — it dilutes the new regime. The response is a shorter window, a step regressor, or a sliding-window model, triggered by the alarm rather than the calendar."
      },
      {
        stem: "The boosting model's bias is +10.2 at store A and +3 to +4 at stores B and C. What does the table say about where to look?",
        options: [
          "The model is under-fitted everywhere",
          "The bias is concentrated at the largest, fastest-rising store, which is where a tree model's inability to extrapolate a trend costs most — a trend fix or a ratio-to-level target for store A, and a re-run of the FVA review",
          "Store A's data is wrong",
          "The seasonal naive should be used for store A"
        ],
        answer: 1,
        why: "Store A has the highest level (230) and the steepest trend (0.05 a day) of the three; a leaf average cannot follow it. Breaking the error down by store and horizon is what turns a single WAPE into a diagnosis — the lesson of 10.3 and the reason the table has a store column."
      },
      {
        stem: "Which statement about the model chooser is correct?",
        options: [
          "It tells you the best model for a series",
          "It tells you where to start; the backtest decides — on the store data the 'known-future covariates' branch (SARIMAX) beat the ML branch that used the same covariates, which no chooser could have known in advance",
          "It always recommends a global boosting model for retail",
          "It replaces the baseline"
        ],
        answer: 1,
        why: "The chooser encodes what usually works by the number of series, the length, the covariates and the need for coherence. Every recommendation in it is a candidate for the rolling-origin backtest, which on this data ranked the candidates in an order the chooser's retail default did not predict."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Forecasting in Production",
    sub: "The pipeline, the review, the monitors, and the judgement of what moved the number.",
    questions: [
      {
        level: "Core",
        q: "What does a production forecasting pipeline look like, night to night?",
        strong: "A batch run, because the data changes once a day so the forecast should. Ingest yesterday's actuals; a data-quality gate that counts rows, nulls, duplicates and the newest timestamp against the daily norm and aborts if anything moved — on my data it would fire on a tripled duplicate count or a partial last day; rebuild the features, past-only, versioned, with the calendar that is known in advance; run the model — re-forecast daily by appending the new actuals to the fitted state, which took 18 ms for a SARIMAX, and refit weekly or on an alarm, which took 1.4 s per store or 9 s for the global boosting model; write the 28-day forecasts with their intervals to a table stamped with a run id; reconcile the hierarchy and override closures to zero; and score yesterday's forecast against today's actual with the seasonal naive scored in the same rows. The table that step produces is the audit log, the monitoring source and the input to the monthly review.",
        answer: [
          { t: "p", text: "Batch and why, the gate with what fires it, re-forecast versus refit with measured costs, the stamped table, reconciliation, and daily scoring with the baseline." }
        ]
      },
      {
        level: "Core",
        q: "What is a forecast-value-added review and what did it show on your data?",
        strong: "A table that scores each stage of the pipeline against the previous one, so that accuracy is attributed to effort rather than assumed. On the store data: the seasonal naive at 10.65 % WAPE was the yardstick; damped ETS added 11 %; SARIMAX with the promotion and holiday calendar added a further 34 %, the largest step, and it came from knowing the dates, not from a better algorithm; the global boosting model with the same calendar was 26 % worse than SARIMAX, so the ML step was negative on this data; MinT reconciliation with a weaker total forecast cost 4 %, the price of a plan that adds up; and a constructed blanket +5 % override on the boosting forecasts *helped* by 4.6 %, because that model under-forecast by 5.6 units a day. The last row is the review doing its job: a helpful override is a bias the model should be fixing, and in most planning organisations the override row is negative and this table is what exposes it.",
        answer: [
          { t: "p", text: "The definition, every executed row with its value added, and the reading of the negative ML step and the positive override." }
        ]
      },
      {
        level: "Senior",
        q: "Design the monitoring for a forecasting system, and say how you would tell a real drift from a false alarm.",
        strong: "Seven layers, all fed from the forecast-versus-actual table and the input logs. Inputs: counts, nulls, duplicates, freshness, against the daily norm. Feature distributions: PSI or a KS test, but only against a like-for-like reference and with enough points — I simulated PSI under no change and found a mean of 1.22 with 28-day windows and ten bins, 0.09 with quarter windows and five bins; a previous-quarter reference fires on the yearly cycle at 2.4 while a year-apart reference is quiet on a 5 % trend at 0.19 and loud on a real level shift at 3.9. Outputs: the forecast distribution against the last run. Accuracy: rolling WAPE and MASE per horizon and per store, with the seasonal naive scored beside the model every day, because the yardstick drifts too. Calibration: coverage of the 80 and 95 % bands per horizon block. Bias: the run-length of same-sign daily error, which fired once at 14 days in my table. And a changepoint detector on a stationary residual, which caught store C's shift four days after it happened. A real drift shows in several layers at once and in the year-apart comparison; a false alarm shows in one layer against the wrong reference, or in a window too short to estimate anything.",
        answer: [
          { t: "p", text: "The seven layers with executed alarm values, the PSI reference and sample-size discipline, the baseline beside the model, and the multi-layer test for a real drift." }
        ]
      },
      {
        level: "Senior",
        q: "SARIMAX beat the global boosting model on your three stores. Would you still recommend boosting for 2,000 stores?",
        strong: "Probably, and I would test it rather than assume it. Three stores with a shared calendar and a structure that is linear on logs is the case SARIMAX is built for, and the boosting model's loss there was mostly bias from the trend it cannot extrapolate — fixable with a ratio-to-level target or a linear trend plus boosted residual. At 2,000 stores the picture changes in three ways: cross-learning matters more, and in 10.6 the global model beat per-store models by 11 % overall and 26 % on the store with the shortest useful history; the operational cost changes, since 2,000 SARIMAX refits at 1.4 s each is 47 minutes nightly while one global model is a single fit; and the leaves get noisier, which favours pooled models and MinT reconciliation. So the recommendation is the global boosting model with a trend fix and the calendar, SARIMAX as a fallback for stores the global model handles badly, and the same backtest protocol — rolling origins, the naive beside them, WAPE and MASE by store and horizon — as the arbiter, with the FVA review re-run at scale before anything ships.",
        answer: [
          { t: "p", text: "Why SARIMAX won on three, what changes at 2,000 with the executed cross-learning and cost numbers, the hybrid recommendation, and the protocol that decides." }
        ]
      },
      {
        level: "Staff",
        q: "Walk me through what you learned from this store-sales case that you would apply to any forecasting engagement.",
        strong: "Five things, each with a number behind it. First, the data work is where projects die: nine duplicates, five missing days, a partial last day and a till fault were all silent, and any of them would have produced a plausible wrong forecast; the hygiene runs nightly with counts that are themselves monitored. Second, the evaluation is the product: a rolling-origin backtest with a gap, the seasonal naive on the same folds, WAPE and MASE and bias by store and horizon, and a forecast-versus-actual table that every later question is a query on. Third, what moved the number was knowledge, not machinery: the calendar of promotions and holidays took WAPE from 9.5 to 6.3, the largest step, and the ML route with the same calendar was worse; the algorithm was the smallest decision. Fourth, intervals and coherence are part of the deliverable, and both have to be checked rather than assumed — coverage by horizon, reconciliation costed in the review. Fifth, the forecast is perishable: re-forecast daily, refit weekly or on a changepoint alarm, monitor the inputs, the accuracy against the live baseline, the calibration and the bias, and run the value-added review monthly so that every stage — including the human ones — has to justify itself. The model class I would choose next time depends on the number of series and the covariates; the discipline does not.",
        answer: [
          { t: "p", text: "Data hygiene, evaluation as the product, knowledge over machinery, intervals and coherence checked, and the perishable forecast with its monitors and review — each with the executed number." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 10.2 — Stationarity, ACF and PACF by Hand
   ========================================================================= */
EC.receiveLesson({
  id: "10.2",

  lede: "**Classical models assume the series behaves the same way in every window — same mean, same variance, same autocorrelation — and the work of this lesson is to make that true, to test whether it is, and then to read the two plots that say which model fits.** Differencing is worked on the twelve quarterly numbers: the first difference leaves a repeating +5.5, −3.5, +11.5, −7.5 pattern; the seasonal difference leaves the constant 6.0, which is four quarters of the 1.5 trend; differencing again leaves zeros. Regressing one random walk on another gave a 'significant' slope in 83 % of 1,000 pairs and in 5.2 % after differencing. The augmented Dickey–Fuller test is written as ordinary least squares and reproduces statsmodels to two decimals — a random walk scores t = −1.76 against a critical −2.87, a stationary AR(1) scores −7.43 — and KPSS is run beside it because the two tests have opposite nulls. On the store's log sales the seasonal difference halves the standard deviation where the plain difference does not, and differencing twice produces the −0.48 lag-1 autocorrelation that marks over-differencing. The ACF is computed on twelve integers from its definition and the PACF from the Durbin–Levinson recursion, both to four decimals against statsmodels; the store's seasonally differenced series then reads straight off the table as a seasonal MA(1), which 10.5 fits.",

  objectives: [
    "State weak stationarity, apply the transformation ladder in order, and undo it",
    "Explain spurious regression and why differencing removes it",
    "Write the ADF regression as OLS, compute its t-statistic, and explain why its critical values are not those of the t distribution",
    "Run ADF and KPSS together and read the 2×2 verdict, including the cases where both tests are wrong",
    "Compute the ACF from its definition and the PACF by Durbin–Levinson, and read the two plots into an AR, MA, seasonal or over-differenced diagnosis"
  ],

  prerequisites: ["10.1", "4.1"],

  blocks: [

    { t: "h2", n: "01", text: "Stationarity and the transformation ladder", id: "stationarity" },

    { t: "p", text: "A series is weakly stationary when its mean is constant, its variance is constant, and the covariance between y_t and y_{t−k} depends only on k. A trend breaks the first condition, a level that multiplies its noise breaks the second, a season breaks the third in a structured way. The models of 10.4 and 10.5 are built for stationary input, so the series is transformed until the conditions hold and the forecast is transformed back. The order of transformations matters, because each is chosen for a symptom and undone in reverse." },

    { t: "table", head: ["Symptom", "Transform", "Notation", "Undo"], rows: [
      ["Variance grows with the level", "log, or Box–Cox λ", "w = log y", "exponentiate (a median — add σ²/2 for a mean)"],
      ["Seasonality", "seasonal difference", "w_t = y_t − y_{t−m} = (1 − Bᵐ) y_t", "add back y_{t−m}"],
      ["Trend", "first difference", "w_t = y_t − y_{t−1} = (1 − B) y_t", "cumulative sum from the last value"],
      ["Trend still present", "second difference (rarely more)", "(1 − B)² y_t", "cumulative sum twice"],
      ["Season and trend", "seasonal first, then regular if needed", "(1 − B)(1 − Bᵐ) y_t", "reverse the order"]
    ] },

    { t: "code", lang: "text", title: "The ladder on the twelve numbers (executed; trend 30 + 1.5t, season −3, +1, −4, +6)",
      code: `y     : 28.5  34.0  30.5  42.0  34.5  40.0  36.5  48.0  40.5  46.0  42.5  54.0
∇y    :       +5.5  −3.5  +11.5 −7.5  +5.5  −3.5  +11.5 −7.5  +5.5  −3.5  +11.5      mean 2.32, sd 7.60 -- the trend is gone,
                                                                                    the season is not: the same four numbers repeat
∇₄y   :                         6.0   6.0   6.0   6.0   6.0   6.0   6.0   6.0         one seasonal difference removed BOTH:
                                                                                    the constant is 4 quarters × 1.5 -- the trend
∇∇₄y  :                               0.0   0.0   0.0   0.0   0.0   0.0   0.0         differencing a constant: zeros. Over-differenced.`,
      caption: "Season first: the seasonal difference of a series with a linear trend and a fixed season is a constant, and a constant is stationary with zero variance. The constant left behind IS the trend — when an ARIMA fit later reports a 'drift', that number is this one. A second difference here would add a spurious moving-average component and inflate every forecast interval for nothing." },

    { t: "p", text: "The cost of ignoring this is not abstract. Two series that both wander will look related because they both wander. In 1,000 simulated pairs of independent random walks of 200 points, regressing one on the other gave a slope significant at the 5 % level in 83.1 % of pairs, with a median R² of 0.164 between two things that have nothing to do with each other. Differencing both series first brought the rejection rate to 5.2 % — the nominal level. This is the spurious-regression result (Granger and Newbold, 1974), and it is the most common statistical error in forecasting work: a dashboard that correlates two trending metrics, a 'driver analysis' regressing sales on marketing spend in levels, a feature-importance chart from a model fitted to raw series." },

    { t: "h2", n: "02", text: "Unit-root tests: the ADF regression as OLS, and KPSS beside it", id: "adf" },

    { t: "p", text: "A random walk y_t = y_{t−1} + ε_t has a *unit root*: the coefficient on its own past is exactly one, so a shock never decays and the variance grows without bound. The Dickey–Fuller idea is to regress the change Δy_t on the level y_{t−1}: if the coefficient γ is zero, the level tells you nothing about the next change and there is no pull toward any mean — a unit root; if γ is negative, high levels are followed by falls, and the series reverts. The *augmented* version adds lagged changes to absorb short-run autocorrelation so that the t-statistic on γ is not distorted, and optionally a constant and a trend." },

    { t: "code", lang: "python", title: "ADF as plain least squares, checked against statsmodels (executed, n = 300)",
      code: `def adf_t(y, lags=1, trend="c"):
    dy = np.diff(y); n = len(dy) - lags
    cols = [y[lags:-1]] + [dy[lags - i:-i] for i in range(1, lags + 1)] + [np.ones(n)]   # γ·y_{t−1}, δ_i·Δy_{t−i}, α
    if trend == "ct": cols.append(np.arange(1.0, n + 1))                                # β·t
    X = np.column_stack(cols); b = lstsq(X, dy[lags:])[0]; resid = dy[lags:] - X @ b
    s2 = resid @ resid / (n - X.shape[1]); return b[0] / np.sqrt(s2 * inv(X.T @ X)[0, 0])   # t = γ̂ / se(γ̂)

#  series                      γ̂        ADF t (ours)   statsmodels   p        KPSS(c) p      verdict
#  random walk               −0.008      −1.76          −1.76        0.400    0.010          unit root: ADF cannot reject, KPSS rejects
#  AR(1) φ = 0.6             −0.383      −7.43          −7.43        0.000    0.100          stationary: both agree
#  random walk, differenced  −1.014     −12.25         −12.25        0.000    0.100          differencing fixed it
#  trend + white noise       −0.023      −1.47          −1.47        0.549    0.010          looks like a unit root to both...
#     ... with a trend term:            ADF(ct) −12.71               0.000    KPSS(ct) 0.032 ... and like a trend-stationary series with one

# 5 % critical values: −2.87 (constant), −3.42 (constant + trend).  A normal t-test would use −1.65 one-sided.`,
      caption: "Under the null of a unit root the t-statistic does not follow the t distribution — the regressor y_{t−1} is itself non-stationary — and its critical values (the Dickey–Fuller distribution, tabulated by simulation) are around −2.9 rather than −1.65. That is the detail interviewers probe. The two-decimal agreement with statsmodels shows there is nothing in the test beyond the regression." },

    { t: "p", text: "ADF and KPSS are run together because their nulls are opposite: ADF's null is a unit root and rejecting it says *stationary*; KPSS's null is stationarity and rejecting it says *not*. ADF has low power on short or persistent series — 'ADF did not reject' is weak evidence — so KPSS supplies the other direction. The four cells: both say stationary, proceed; both say not, difference and test again; ADF rejects but KPSS also rejects, suspect a trend-stationary series and try the trend specification or detrend; ADF fails and KPSS passes, a persistent but probably stationary series, where more data or a seasonal transformation usually settles it. The exercise shows the two cases both tests get wrong — a level shift reads as a unit root to both, and an AR(1) with φ = 0.95 and 100 points is 'stationary' by the narrowest margin — because no test can distinguish a structural break from a random walk, or φ = 0.95 from φ = 1, without more data than a short series has." },

    { t: "code", lang: "python", title: "The store: which differences, in which order (executed, store A, log sales)",
      code: `#  series             ADF t     p        KPSS(c)   p       sd       lag-1 ACF   lag-7 ACF
#  log sales          −1.94    0.314     2.213    0.010   0.2166    +0.468      +0.761      non-stationary
#  ∇  log sales      −11.24    0.000     0.050    0.100   0.2233    −0.237      +0.595      'stationary' -- and the season is untouched
#  ∇₇ log sales       −8.23    0.000     0.041    0.100   0.1455    +0.057      −0.461      stationary, sd a third lower: season first
#  ∇∇₇ log sales     −11.68    0.000     0.221    0.100   0.1997    −0.476      −0.501      over-differenced: the lag-1 ACF near −0.5

pmdarima.ndiffs(log_sales, test="adf") -> 1;  ndiffs(test="kpss") -> 1;  nsdiffs(m=7, test="ocsb") -> 0;  nsdiffs(m=7, test="ch") -> 0`,
      caption: "Unit-root tests answer one question — is there a unit root — and a plain difference passes both while leaving a 0.60 autocorrelation at lag 7: stationary is not the same as white. The seasonal difference does more with less variance. pmdarima's seasonal tests say no seasonal *difference* is required, because the weekly pattern is stable: it can be handled by a seasonal difference or by seasonal AR/MA terms or by dummies, and 10.5 compares those routes." },

    { t: "callout", kind: "trap", title: "Over-differencing is a failure, not a safe default", body: "Differencing white noise produces a series with autocorrelation −0.5 at lag 1 (executed: −0.496 on 20,000 points), and differencing a stationary AR(1) with φ = 0.7 produces −(1 − φ)/2 = −0.15 (executed −0.158). Each unnecessary difference injects a negative MA(1) component the model must then estimate, inflates the forecast variance — the variance of ∇y is 2(1 − ρ₁) times that of y — and makes the model chase noise. The store series shows it at the second step: sd rises from 0.146 to 0.200 and the lag-1 ACF drops to −0.476. If in doubt, fit d and d + 1 and let the backtest decide." },

    { t: "h2", n: "03", text: "The ACF from its definition", id: "acf" },

    { t: "p", text: "The autocorrelation at lag k is the correlation of the series with a copy of itself shifted k steps: r_k = c_k / c_0, where c_k = (1/n) Σ (y_t − ȳ)(y_{t+k} − ȳ) over the n − k available pairs and c_0 is the variance. The same n in every denominator makes the estimates well-behaved (positive definite) at the cost of a small downward bias at long lags. Twelve integers keep the arithmetic exact." },

    { t: "code", lang: "text", title: "Twelve integers, four lags (executed; every sum is exact)",
      code: `x  :  5   7   8   6   4   3   5   7   9   8   6   4        sum 72, n 12, mean 6
d  : −1  +1  +2   0  −2  −3  −1  +1  +3  +2   0  −2        d = x − mean

c0 = (1 + 1 + 4 + 0 + 4 + 9 + 1 + 1 + 9 + 4 + 0 + 4) / 12 = 38 / 12 = 3.1667

lag 1: (−1)(1) + (1)(2) + (2)(0) + (0)(−2) + (−2)(−3) + (−3)(−1) + (−1)(1) + (1)(3) + (3)(2) + (2)(0) + (0)(−2)
     = −1 + 2 + 0 + 0 + 6 + 3 − 1 + 3 + 6 + 0 + 0 = 18          c1 = 18/12 = 1.5000     r1 = 1.5/3.1667 = 0.4737
lag 2: Σ = −12                                                    c2 = −1.0000            r2 = −0.3158
lag 3: Σ = −27                                                    c3 = −2.2500            r3 = −0.7105
lag 4: Σ = −17                                                    c4 = −1.4167            r4 = −0.4474

band ±1.96/√12 = ±0.566        statsmodels acf(x, nlags=4): [1.0, 0.4737, −0.3158, −0.7105, −0.4474]`,
      caption: "Only r₃ is outside the band, at −0.71: the series rises for three steps and falls for three, so a value three steps ago is on the opposite side of the mean. With n = 12 the band is wide and the ACF is an illustration; with the store's 900 days it is ±0.065." },

    { t: "h2", n: "04", text: "The PACF, and why it is not the ACF", id: "pacf" },

    { t: "p", text: "If y_t depends on y_{t−1} and y_{t−1} depends on y_{t−2}, then y_t is correlated with y_{t−2} even when there is no direct link, and the ACF at lag 2 reports the total of both routes. The partial autocorrelation at lag k is the correlation between y_t and y_{t−k} after the intermediate lags have been regressed out — the direct effect only. It is the coefficient on y_{t−k} in a regression of y_t on y_{t−1} … y_{t−k}, and the Durbin–Levinson recursion computes it from the ACF alone: φ₁₁ = r₁, then for each k, φ_kk = (r_k − Σ_j φ_{k−1,j} r_{k−j}) / (1 − Σ_j φ_{k−1,j} r_j), with the earlier coefficients updated as φ_kj = φ_{k−1,j} − φ_kk φ_{k−1,k−j}." },

    { t: "code", lang: "text", title: "PACF for the same twelve integers (executed)",
      code: `φ11 = r1 = 0.4737
φ22 = (r2 − r1²) / (1 − r1²) = (−0.3158 − 0.2244) / (1 − 0.2244) = −0.5402 / 0.7756 = −0.6964
φ33, φ44 by the recursion:  −0.3176, −0.0625

PACF (Durbin–Levinson):        [0.4737, −0.6964, −0.3176, −0.0625]
statsmodels pacf(method="ywm"): [0.4737, −0.6964, −0.3176, −0.0625]`,
      caption: "The lag-2 partial (−0.70) is more negative than the lag-2 autocorrelation (−0.32): once the positive lag-1 route is removed, the direct link two steps back is strongly negative. statsmodels' default `ywadjusted` divides c_k by n − k rather than n and gives slightly different numbers; `ywm` is the recursion above." },

    { t: "viz",
      title: "ACF and PACF of the twelve integers, with the ±0.566 band",
      caption: "Bars are the executed values. Left: r₁ … r₄; right: φ₁₁ … φ₄₄. Only r₃ leaves the band; with twelve points the plots illustrate the computation rather than diagnose a model.",
      svg: `<svg viewBox="0 0 700 260" role="img" aria-label="Two bar charts. ACF: lags 1 to 4 with values 0.47, -0.32, -0.71, -0.45. PACF: 0.47, -0.70, -0.32, -0.06. Dashed band at plus and minus 0.566.">
  <g font-size="12" fill="var(--ink-2)" font-family="ui-sans-serif, system-ui, sans-serif"><text x="60" y="28">ACF r_k</text><text x="410" y="28">PACF φ_kk</text></g>
  <g stroke="var(--line)"><line x1="50" y1="150" x2="300" y2="150"/><line x1="400" y1="150" x2="650" y2="150"/></g>
  <g stroke="var(--warn)" stroke-dasharray="4 3"><line x1="50" y1="93.4" x2="300" y2="93.4"/><line x1="50" y1="206.6" x2="300" y2="206.6"/><line x1="400" y1="93.4" x2="650" y2="93.4"/><line x1="400" y1="206.6" x2="650" y2="206.6"/></g>
  <g fill="var(--accent)">
    <rect x="70" y="102.6" width="20" height="47.4"/><rect x="120" y="150" width="20" height="31.6"/><rect x="170" y="150" width="20" height="71.05" fill="var(--crit)"/><rect x="220" y="150" width="20" height="44.7"/>
    <rect x="420" y="102.6" width="20" height="47.4"/><rect x="470" y="150" width="20" height="69.6"/><rect x="520" y="150" width="20" height="31.8"/><rect x="570" y="150" width="20" height="6.25"/>
  </g>
  <g font-size="11" fill="var(--ink-3)" font-family="ui-monospace, monospace">
    <text x="74" y="98">.47</text><text x="120" y="194">−.32</text><text x="170" y="234">−.71</text><text x="220" y="207">−.45</text>
    <text x="424" y="98">.47</text><text x="470" y="232">−.70</text><text x="520" y="194">−.32</text><text x="570" y="169">−.06</text>
    <text x="77" y="246">1</text><text x="127" y="246">2</text><text x="177" y="246">3</text><text x="227" y="246">4</text>
    <text x="427" y="246">1</text><text x="477" y="246">2</text><text x="527" y="246">3</text><text x="577" y="246">4</text>
    <text x="255" y="90">+.566</text><text x="255" y="218">−.566</text>
  </g>
</svg>` },

    { t: "h2", n: "05", text: "Reading the two plots into a model", id: "reading" },

    { t: "table", head: ["ACF", "PACF", "Model", "Why"], rows: [
      ["decays gradually", "**cuts off** after lag p", "AR(p)", "only p direct links exist; the ACF carries their indirect echoes"],
      ["**cuts off** after lag q", "decays gradually", "MA(q)", "a shock persists exactly q steps; the PACF sees its echoes"],
      ["decays", "decays", "ARMA(p, q)", "both mechanisms; use AIC to choose orders"],
      ["all inside the band", "all inside the band", "white noise", "nothing left to model — stop"],
      ["decays very slowly from near 1", "one large spike at lag 1", "needs differencing", "a unit root"],
      ["spikes at m, 2m, 3m …", "spike at m", "seasonal terms", "add (P, D, Q)_m"],
      ["lag 1 near −0.5", "alternating decay", "over-differenced", "reduce d"]
    ] },

    { t: "code", lang: "python", title: "The two textbook shapes, theory against 20,000 simulated points (executed)",
      code: `AR(1), φ = 0.7      theory  ACF φ^k: 0.700  0.490  0.343  0.240       PACF: 0.700  0  0  0
                    sample  ACF:     0.690  0.479  0.337  0.235       PACF: 0.690  0.003  0.010  −0.003

MA(1), θ = 0.6      theory  ACF ρ₁ = θ/(1+θ²) = 0.441, then 0          PACF: 0.441  −0.242  0.141  −0.083  (alternating decay)
                    sample  ACF:     0.429  −0.015  0.001  0.004       PACF: 0.429  −0.244  0.147  −0.085

the AR(1) partial at lag 2, by hand:  φ22 = (r2 − r1²)/(1 − r1²) = (0.49 − 0.49)/(1 − 0.49) = 0 -- the indirect route is the whole lag-2 correlation`,
      caption: "The shapes are mirror images: an autoregression's ACF decays because each lag's effect echoes through the lags between, while its PACF dies after p; a moving average's ACF dies after q because a shock is gone after q steps, while its PACF decays because regressing out intermediate lags cannot remove a shock's echo." },

    { t: "code", lang: "python", title: "The store's plots, read off the table (executed, ∇₇ log sales, 904 points, band ±0.065)",
      code: `ACF   lags 1-3: 0.057  0.012  0.015      lag 7: −0.461     14: −0.020    21: −0.003    28: 0.050
PACF  lags 1-3: 0.057  0.009  0.014      lag 7: −0.468     14: −0.314    21: −0.224    28: −0.116

# nothing at the short lags; at the seasonal lags the ACF CUTS OFF after 7 and the PACF DECAYS: 7, 14, 21, 28
# -> a seasonal MA(1) on the seasonally differenced series: SARIMA(0,0,0)(0,1,1)[7]  (10.5 fits it)
# the −0.46 at lag 7 is the seasonal difference's own signature: ∇₇ of a stable season behaves like seasonal white noise differenced

Ljung–Box on ∇₇ log sales:      Q(7) = 199, p = 1.6e−39;  Q(28) = 213, p = 2.6e−30    structure remains -> a model is needed
Ljung–Box on white noise, same n: Q(7) = 7.1, p = 0.41;    Q(28) = 27.8, p = 0.48        nothing to model

for contrast, the ACF of the RAW log series: lags 1, 7, 14, 28 = 0.468  0.761  0.730  0.688   -- a slow decay: trend and season, nothing you did not know`,
      caption: "Plot the ACF of the stationary version, never the raw series. The Ljung–Box statistic tests all lags up to h at once (Q = n(n+2) Σ r_k²/(n−k), χ² with h degrees of freedom) and is the check applied to a fitted model's residuals in 10.5: a p-value above 0.05 there means the residuals are white and the model has taken everything the ACF could see." },

    { t: "callout", kind: "insight", title: "What the plots cannot tell you", body: "They are estimates with a band of ±1.96/√n, so a spike at lag 13 of 0.07 on 900 points is not a lag-13 effect, and on 40 points nothing short of 0.31 is. They describe linear dependence only; a series whose variance clusters (10.8) has a flat ACF and a strongly autocorrelated squared series. They are computed on one realisation and change with the sample: the store's lag-7 value moved from −0.461 to −0.500 between the seasonal difference and the double difference. And they choose among ARMA structures, not among models: a gradient-boosting model with lag features (10.6) does not need them, though it benefits from the same diagnosis of which lags matter."
    },

    { t: "ladder",
      title: "Preparing a series for an ARIMA-family model",
      rungs: [
        { level: "bad", label: "Fit on the raw series and read its ACF", code: `plot_acf(sales); ARIMA(sales, order=(1, 0, 0)).fit()`,
          note: "**The raw ACF decays from 0.76 at lag 7 and says only 'trend and season'; an AR(1) on a trending, seasonal series is a random walk with extra steps.**" },
        { level: "ok", label: "Difference until ADF rejects, then read the plots", code: `d = 0
while adfuller(s)[1] > 0.05: s = s.diff().dropna(); d += 1      # stops at d = 1: ADF −11.2
plot_acf(s); plot_pacf(s)                                        # lag-7 ACF still 0.60`,
          note: "Stops at the plain difference, which passes both tests and leaves the season in the residual; the model then needs seasonal terms it was not told about, and the plots are read on a series that has been differenced in the wrong order." },
        { level: "best", label: "Logs if multiplicative, season first, both tests, plots on the result, and the over-differencing check", code: `w = np.log(s)                                     # 10.1: multiplicative
w7 = w.diff(7).dropna()                           # season first: sd 0.146 vs 0.223 for the plain difference
adfuller(w7)[1], kpss(w7)[1]                      # 0.000, 0.100 -> stationary by both
acf(w7)[1], acf(w7.diff().dropna())[1]            # +0.057 vs −0.476: one more difference would over-difference
plot_acf(w7); plot_pacf(w7)                       # ACF cuts at 7, PACF decays at 7, 14, 21 -> seasonal MA(1)`,
          note: "Each transformation is chosen for a symptom and checked with the tests, the plots are read on the stationary series, and the diagnosis is a specific model to fit and then check with Ljung–Box on its residuals." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The seasonal difference of the twelve numbers is the constant 6.0 at every quarter. What is that number?",
          options: [
            "The seasonal index of Q4",
            "Four quarters of the 1.5-per-quarter trend: differencing at lag 4 removes the season exactly and turns the linear trend into its four-step increment",
            "The mean of the series divided by the season length",
            "A coincidence of the chosen numbers"
          ],
          answer: 1,
          why: "y_t − y_{t−4} = (30 + 1.5t + S_t) − (30 + 1.5(t−4) + S_{t−4}) = 6 + (S_t − S_{t−4}) = 6, because the season repeats every four quarters. The constant left after differencing is the drift term an ARIMA fit reports; differencing again would turn it into zeros and add a spurious MA(1) component."
        },
        {
          stem: "Why are the ADF critical values around −2.87 rather than the −1.65 of a one-sided t-test?",
          options: [
            "Because the test uses more lags",
            "Because under the null the regressor y_{t−1} is non-stationary, so the t-statistic follows the Dickey–Fuller distribution, tabulated by simulation, rather than the t distribution",
            "Because the test is two-sided",
            "Because of the constant term"
          ],
          answer: 1,
          why: "The usual t distribution assumes a regressor with stable variance; a unit-root regressor's variance grows with t and the distribution of γ̂/se(γ̂) shifts left. The consequence is that a naive t-test rejects the unit root far too often. The executed random walk scored −1.76 — 'significant' by the normal rule, not by the correct one."
        },
        {
          stem: "The plain difference of the store's log sales passes ADF (−11.2) and KPSS (0.10), yet its lag-7 autocorrelation is 0.60. Is it stationary?",
          options: [
            "No — the tests were run wrongly",
            "Yes in the unit-root sense, and that is not enough: a stationary series can carry strong seasonal autocorrelation, and the seasonal difference removed it with a third less variance",
            "No — KPSS should have rejected",
            "Yes, and the lag-7 value is noise"
          ],
          answer: 1,
          why: "Unit-root tests ask about a unit root, not about whiteness. The lag-7 correlation of 0.60 on 900 points (band ±0.065) is a stable weekly pattern that a model must either difference away or fit with seasonal terms; the ladder says season first because the seasonal difference here does both jobs — sd 0.146 against 0.223 — and leaves a series with no short-lag structure at all."
        },
        {
          stem: "For the twelve integers, r₂ = −0.32 but φ₂₂ = −0.70. Why is the partial more negative than the autocorrelation?",
          options: [
            "The recursion amplifies small numbers",
            "The lag-2 autocorrelation is the sum of a positive indirect route through lag 1 (r₁ = 0.47) and a negative direct link; removing the indirect route leaves the direct link alone",
            "The partial is always larger in magnitude",
            "Because n = 12 is too small"
          ],
          answer: 1,
          why: "φ₂₂ = (r₂ − r₁²)/(1 − r₁²) = (−0.316 − 0.224)/0.776: the r₁² term is the correlation that lag 2 inherits through lag 1, and it is positive, so subtracting it makes the direct effect more negative than the total. For an AR(1) the same formula gives exactly zero, which is why the PACF cuts off."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "An ACF by hand, the tests where both are wrong, and a level shift under differencing",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** For x = 2, 4, 5, 4, 2, 1, 2, 4, 5, 4, 2, 1, compute the mean, deviations, c₀, and r₁ … r₆ from the definition; state which lags leave the ±1.96/√12 band; compute φ₂₂ by hand and check against `pacf(method=\"ywm\")`." },
        { t: "p", text: "**(b)** Simulate 100 points of: a random walk with drift 0.2; white noise plus a level shift of +3 from t = 50; an AR(1) with φ = 0.95; an AR(1) with φ = 0.5. Run ADF and KPSS with a constant and with a trend, and fill in the 2×2 verdict for each. Then rerun the φ = 0.95 case with 1,000 points." },
        { t: "p", text: "**(c)** Store C's log sales have a level shift on 1 September 2024. Run ADF and KPSS on ∇₇ log C, on ∇₇ of the residual after regressing log C on a step dummy, and on that residual without differencing. Report the seasonal differences for 1–7 September against the typical |∇₇|, and the fitted step in log units." }
      ],
      requirements: [
        "(a) six autocorrelations, the band verdict, and the checked φ₂₂.",
        "(b) a four-row table of verdicts and a sentence on each surprise.",
        "(c) three test rows, the seven differences, and the step size."
      ],
      hint: "(a) The deviations are integers; c₀ = 24/12. (b) A level shift and a near-unit root are the classic ways to fool both tests. (c) Differencing turns a step into seven spikes; a step dummy removes it.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) mean 3; d = −1 +1 +2 +1 −1 −2 −1 +1 +2 +1 −1 −2; c0 = 24/12 = 2.0
#     lag   Σ d_t d_{t+k}    c_k        r_k
#      1        +10        +0.8333    +0.4167
#      2        −11        −0.9167    −0.4583
#      3        −18        −1.5000    −0.7500     <- the only lag outside ±0.566: half a period apart, opposite sides of the mean
#      4         −7        −0.5833    −0.2917
#      5         +8        +0.6667    +0.3333
#      6        +12        +1.0000    +0.5000     <- one full period: positive, just inside the band with n = 12
#     φ22 = (−0.4583 − 0.1736)/(1 − 0.1736) = −0.7647;  statsmodels pacf(ywm)[2] = −0.7647

# (b) n = 100                     ADF(c) p    KPSS(c) p    verdict                              with a trend term
#     random walk + drift 0.2       0.732      0.010      unit root by both                     ADF(ct) 0.292, KPSS(ct) 0.010
#     noise + level shift at 50     0.678      0.010      'unit root' by both -- WRONG: it is white noise with a break; a step reads as a random walk to both tests
#     AR(1) φ = 0.95                0.048      0.100      stationary by both -- by 0.002 of p-value; ADF's power near a unit root is poor
#     AR(1) φ = 0.5                 0.000      0.100      stationary by both
#     AR(1) φ = 0.95, n = 1,000:    ADF p 0.0000, KPSS p 0.023 -- ADF now rejects decisively; KPSS starts to reject a stationary but very persistent series (its own size distortion)

# (c) store C
#     ∇₇ log C                         ADF p 0.000   KPSS 0.046 p 0.100   sd 0.1527   lag-7 ACF −0.500
#     ∇₇ (log C − step)                ADF p 0.000   KPSS 0.044 p 0.100   sd 0.1502   lag-7 ACF −0.511
#     log C − step, no differencing    ADF p 0.609   KPSS 0.905 p 0.010   -- the trend and season remain; the step was not the only non-stationarity
#     ∇₇ log C, 1-7 Sep 2024:  0.137  0.264  0.436  0.335  0.385  0.235  0.448    typical |∇₇| elsewhere 0.092
#     -> differencing turns one step into seven outliers of 2-5× the usual size, which then sit in the residuals of any model
#     fitted step: 0.289 log units = ×1.335   (built as +30 on a level of ~83: ×1.33)`,
        notes: [
          { t: "p", text: "(a) is the definition applied once more; the period-6 structure shows in r₃ ≈ −r₆ and would be a seasonal signature on a longer series." },
          { t: "p", text: "(b) is the reason the tests are advisory: a break and a near-unit root are indistinguishable from a random walk on 100 points, and only the story of the series — or more data — settles it." },
          { t: "p", text: "(c) is the argument for a step regressor over differencing: the tests pass either way, but the differenced series carries seven large residuals every model will pay for." }
        ]
      }
    }
  ],

  takeaways: [
    "Weak stationarity — constant mean, constant variance, covariance depending on lag only — is what classical models assume; the ladder (log for a level-dependent variance, seasonal difference, then a regular difference only if still needed) makes it true and is undone in reverse.",
    "On the twelve numbers, ∇ leaves the season and ∇₄ leaves the constant 6 = 4 × 1.5, the trend; ∇∇₄ leaves zeros. The constant after differencing is the drift.",
    "Two independent random walks regressed on each other were 'significant' 83 % of the time and 5 % after differencing: spurious regression is what non-stationarity does to every correlation.",
    "ADF is the OLS regression of Δy_t on y_{t−1} (plus lagged changes, a constant, optionally a trend) and a t-test on γ against Dickey–Fuller critical values (−2.87, −3.42), not −1.65; it reproduced statsmodels to two decimals. KPSS has the opposite null; run both and read the 2×2, knowing a level shift fools both and φ = 0.95 on 100 points barely passes.",
    "On the store, a plain difference passes both tests and leaves a 0.60 lag-7 correlation; the seasonal difference passes with a third less variance; differencing again gives the −0.48 lag-1 signature of over-differencing.",
    "r_k = c_k/c₀ with c_k the lag-k covariance over the n available pairs divided by n; the PACF is the direct effect after regressing out the intermediate lags, computed from the ACF by Durbin–Levinson; both reproduced statsmodels to four decimals on twelve integers.",
    "AR(p): ACF decays, PACF cuts at p. MA(q): ACF cuts at q, PACF decays. Seasonal spikes at multiples of m mean seasonal terms; a slow decay from 1 means difference; −0.5 at lag 1 means you differenced too much. The store's ∇₇ series reads as a seasonal MA(1), and Ljung–Box (Q(7) = 199) says a model is needed."
  ],

  quiz: {
    title: "Stationarity, ACF and PACF — Knowledge Check",
    questions: [
      {
        stem: "A dashboard reports that monthly revenue and monthly head-count have R² = 0.9 over five years. Both series trend upward. What can be concluded?",
        options: [
          "Head-count drives revenue",
          "Almost nothing: two trending series correlate because they trend, and the simulated rate of a 'significant' slope between independent random walks was 83 %; difference both (or model them jointly with the trend) before reading any coefficient",
          "Revenue drives head-count",
          "The relationship is real because R² is high"
        ],
        answer: 1,
        why: "Spurious regression produces high R² and small p-values between unrelated non-stationary series as a matter of course. Differencing brought the rejection rate to the nominal 5 %. A relationship that survives in differences (or in a cointegration test, 10.8) is evidence; one that exists only in levels is the trend."
      },
      {
        stem: "Why is the seasonal difference taken before the regular difference?",
        options: [
          "Because seasonal patterns are larger",
          "Because a seasonal difference of a series with a linear trend and a stable season removes both at once, leaving a constant; a regular difference first leaves the season in place and usually forces a second difference later",
          "Because the library requires that order",
          "Because it makes the ACF easier to read"
        ],
        answer: 1,
        why: "y_t − y_{t−m} cancels a repeating season exactly and turns a linear trend into a constant; the twelve numbers went to 6.0 in one step, and the store's log sales went from sd 0.217 to 0.146 with no short-lag structure left. Regular-first left the weekly pattern (lag-7 ACF 0.60) and a higher variance, and a further seasonal difference would then over-difference."
      },
      {
        stem: "A series of 100 points shows white noise before t = 50 and the same noise shifted up by three standard deviations after. What will ADF and KPSS say?",
        options: [
          "Both say stationary, because each half is white",
          "ADF fails to reject a unit root (p ≈ 0.68) and KPSS rejects stationarity (p 0.01): a level shift is indistinguishable from a random walk to both tests, and the right treatment is a step regressor, not differencing",
          "ADF rejects, KPSS does not",
          "The tests cannot be run on a series with a break"
        ],
        answer: 1,
        why: "A step is one enormous 'shock' that never decays — exactly what a unit root looks like to a regression of Δy on y_{t−1}, and exactly what makes the KPSS partial sums explode. Perron's critique: unit-root tests over-find unit roots in the presence of breaks. Differencing would turn the step into a single outlier (or seven, seasonally) and the tests would then pass while the residuals carry it."
      },
      {
        stem: "The PACF of an MA(1) process decays with alternating sign while its ACF is zero beyond lag 1. Why does regressing out intermediate lags not make the partial correlation vanish?",
        options: [
          "Because the MA process is non-stationary",
          "Because an MA(1) is an infinite-order autoregression (y_t = ε_t + θε_{t−1} inverts to ε_t = y_t − θy_{t−1} + θ²y_{t−2} − …), so every lag has a direct coefficient, decaying as (−θ)^k",
          "Because the PACF uses a different sample",
          "Because θ is positive"
        ],
        answer: 1,
        why: "The two plots are dual: a finite AR has an infinite MA representation and a finite MA has an infinite AR one. The direct coefficients of the MA(1)'s AR form alternate and shrink, which is the executed PACF 0.441, −0.242, 0.141, −0.083 (theory) against 0.429, −0.244, 0.147, −0.085 (sample). A finite PACF means finite AR; a finite ACF means finite MA."
      },
      {
        stem: "After a seasonal difference, the store's series has ACF −0.46 at lag 7 and nothing elsewhere, and a PACF of −0.47, −0.31, −0.22, −0.12 at lags 7, 14, 21, 28. Which model does the table indicate?",
        options: [
          "An AR(7)",
          "A seasonal MA(1) at period 7 on the seasonally differenced series — the ACF cuts off after one seasonal lag and the PACF decays across seasonal lags — that is, SARIMA(0,0,0)(0,1,1)₇",
          "White noise, since the short lags are empty",
          "A second seasonal difference"
        ],
        answer: 1,
        why: "Cut-off in the ACF with decay in the PACF is the MA signature, and here it appears at multiples of the season, so the term is seasonal. The empty short lags mean no regular AR or MA terms are indicated. Ljung–Box (Q(7) = 199, p ≈ 10⁻³⁹) confirms the series is not white, so 'stop' is not an option; 10.5 fits this model and checks its residuals."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Stationarity, ACF and PACF",
    sub: "The definitions, the tests as regressions, and the reading of the plots.",
    questions: [
      {
        level: "Core",
        q: "What does stationarity mean and why do ARIMA-type models need it?",
        strong: "Weak stationarity is three conditions: constant mean, constant variance, and an autocovariance that depends on the lag but not on the time. ARIMA models describe a series by a fixed set of autocorrelations — an AR coefficient says 'this lag matters this much, always' — so they need those quantities to exist and be constant; on a trending series the sample autocorrelations are artefacts of the trend, and on a series whose variance grows the residuals are heteroskedastic and the intervals wrong. The practical route is the ladder: logs if the variance scales with the level, a seasonal difference, then a regular difference if the tests still say so; on the store data the seasonal difference alone took log sales from an ADF of −1.9 to −8.2 with the variance cut by a third. The 'I' in ARIMA is exactly this: the model is fitted to the differenced series and the forecast integrated back.",
        answer: [
          { t: "p", text: "The three conditions, why fixed autocorrelations need them, the ladder with the executed store numbers, and where the I in ARIMA comes from." }
        ]
      },
      {
        level: "Core",
        q: "Explain the difference between the ACF and the PACF with an example.",
        strong: "The ACF at lag k is the plain correlation between the series and itself k steps back, all routes included. The PACF at lag k is the correlation after regressing out lags 1 to k−1 — the direct route only. For an AR(1) with φ = 0.7, the ACF at lag 2 is 0.49, entirely inherited through lag 1, and the partial at lag 2 is (0.49 − 0.7²)/(1 − 0.49) = 0: there is no direct link. On twelve integers I worked by hand, the lag-2 autocorrelation was −0.32 and the partial −0.70, because the inherited route through a positive r₁ was masking a strongly negative direct effect. The two together diagnose the model: an AR(p) has a PACF that cuts at p and a decaying ACF; an MA(q) has an ACF that cuts at q and a decaying PACF, because an MA is an infinite autoregression with coefficients that shrink.",
        answer: [
          { t: "p", text: "Total versus direct, the AR(1) zero by hand, the worked −0.32 versus −0.70, and the diagnostic duality." }
        ]
      },
      {
        level: "Senior",
        q: "Walk me through the ADF test — what is being regressed, what is the null, and why are the critical values unusual?",
        strong: "Regress the change Δy_t on the lagged level y_{t−1}, a constant, optionally a trend, and p lagged changes Δy_{t−1} … Δy_{t−p}. The null is that the coefficient on the level, γ, is zero — the level does not predict the next change, so there is no reversion and the series has a unit root; the alternative is γ < 0, reversion. The statistic is the ordinary t-ratio γ̂/se(γ̂) — I have written it as plain least squares and matched statsmodels to two decimals — but its distribution under the null is not Student's t, because y_{t−1} is itself a random walk whose variance grows with t; the null distribution is the Dickey–Fuller one, tabulated by simulation, with 5 % critical values of about −2.87 with a constant and −3.42 with a trend, against −1.65 for a one-sided normal. The lagged changes are the augmentation: they soak up autocorrelation in the errors so the t-ratio is not distorted, and their number is chosen by AIC. The test has low power near the null — an AR(1) with φ = 0.95 on 100 points rejected at p = 0.048 — and a level shift makes it fail to reject, which is why I always pair it with KPSS and with a look at the series.",
        answer: [
          { t: "p", text: "The regression, the null on γ, the Dickey–Fuller distribution and why, the augmentation, and the two weaknesses." }
        ]
      },
      {
        level: "Senior",
        q: "How do you tell over-differencing, and what does it cost?",
        strong: "The signature is a lag-1 autocorrelation near −0.5 in the differenced series with an alternating PACF: differencing white noise gives exactly −0.5, and I measured −0.496 on 20,000 points; differencing a stationary AR(1) with φ = 0.7 gives −(1 − φ)/2 = −0.15. On the store data the seasonal difference had a lag-1 ACF of +0.06, and one more difference took it to −0.48 with the standard deviation up from 0.146 to 0.200 — that step was the over-differencing. The cost is threefold: the model has to estimate a negative MA(1) that exists only because of the differencing, so it is a parameter spent to undo damage; the forecast variance is inflated, since var(∇y) = 2(1 − ρ₁)var(y) and each integration step compounds the uncertainty; and the fitted model chases noise because the differenced series is mostly noise. The rule I use is the ladder plus the ACF check after each step, and when the tests are ambiguous, fitting both d and d + 1 and letting the backtest decide.",
        answer: [
          { t: "p", text: "The −0.5 signature with executed values, the store's second step, the three costs, and the backtest tie-break." }
        ]
      },
      {
        level: "Staff",
        q: "ADF and KPSS disagree on a series. Walk me through what you do.",
        strong: "First I identify which cell I am in. ADF rejects and KPSS rejects: the usual cause is a deterministic trend — a trend-stationary series looks like a unit root to the constant-only specification (my trend-plus-noise series had ADF −1.47 with a constant and −12.7 with a trend) — so I rerun both with the trend specification, and if that resolves it, I detrend or include the trend rather than difference, because differencing a trend-stationary series over-differences. ADF fails and KPSS passes: a persistent, probably stationary series where ADF lacks power — φ = 0.95 on 100 points — and I look at the half-life implied by the AR coefficient, get more data if I can, and if the series is seasonal try the seasonal difference first because it often resolves the persistence. Then I check the two things no test can see: a structural break, which both tests read as a unit root and which needs a step regressor, and a variance that scales with the level, which needs logs before either test means anything. Finally I remember what the decision is for — choosing d for a forecast model — and that the backtest can arbitrate between d = 0 and d = 1 directly, which is often cheaper than certainty about the test.",
        answer: [
          { t: "p", text: "The two disagreeing cells and their usual causes with executed numbers, the specification rerun, the two invisible cases, and the backtest as the final arbiter." }
        ]
      }
    ]
  }
});

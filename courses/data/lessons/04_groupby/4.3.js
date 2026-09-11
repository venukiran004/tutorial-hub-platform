/* ============================================================================
   LESSON 4.3 — Rolling, Expanding and Window Functions
   ========================================================================= */
EC.receiveLesson({
  id: "4.3",

  lede: "**A rolling window is a moving statistic; `shift` is what makes it a feature rather than a leak.** The difference between a rolling mean that includes the current row and one that ends the row before is the difference between a model that works in production and one that only worked in the notebook.",

  objectives: [
    "Compute rolling, expanding and exponentially weighted statistics",
    "Use `shift` to make a window feature strictly causal",
    "Choose between count-based and time-based windows",
    "Control edge behaviour with `min_periods`, `center` and `closed`",
    "Apply windows within groups without crossing group boundaries"
  ],

  prerequisites: ["4.2", "2.6"],

  blocks: [

    { t: "h2", n: "01", text: "Three kinds of window", id: "kinds" },

    { t: "p", text: "pandas has three window types, distinguished by **how far back they look**: a fixed count or time span, everything so far, or everything so far with decaying weight. Each answers a different question about \"recent\"." },

    { t: "dl", items: [
      ["`rolling(n)`", "A fixed window of the last `n` rows (or a time span). The statistic at each row is over that row and the `n−1` before it. **The current row is included.**"],
      ["`expanding()`", "Everything from the start to the current row. A running mean, a running max, a cumulative count of anything."],
      ["`ewm(span=n)`", "Exponentially weighted: every past row contributes, with weight decaying geometrically. Reacts faster than a rolling mean of the same span and never has a hard edge."],
      ["`shift(k)`", "Move values down by `k` rows. `shift(1)` puts yesterday's value on today's row — the operation that turns a window into a **feature about the past**."],
      ["`min_periods`", "How many observations a window needs before it produces a value rather than `NaN`. Defaults to the window size for `rolling`, to 1 for `expanding`."],
      ["`closed`", "Which end of a time-based window is inclusive: `\"right\"` (default), `\"left\"`, `\"both\"`, `\"neither\"`. Decides whether the current timestamp is in the window."]
    ]},

    { t: "viz",
      title: "Where each window looks",
      caption: "At row t: rolling(3) covers t−2..t; expanding covers 0..t; ewm covers everything with decaying weight. All three include t — shift(1) is what excludes it.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="A row of ten time points with the coverage of rolling, expanding and exponentially weighted windows at position t, and the shifted version excluding t">
  <g stroke-width="1.5">
    <rect x="30" y="40" width="60" height="26" style="fill:none;stroke:var(--line)"/>
    <rect x="90" y="40" width="60" height="26" style="fill:none;stroke:var(--line)"/>
    <rect x="150" y="40" width="60" height="26" style="fill:none;stroke:var(--line)"/>
    <rect x="210" y="40" width="60" height="26" style="fill:none;stroke:var(--line)"/>
    <rect x="270" y="40" width="60" height="26" style="fill:none;stroke:var(--line)"/>
    <rect x="330" y="40" width="60" height="26" style="fill:none;stroke:var(--line)"/>
    <rect x="390" y="40" width="60" height="26" style="fill:var(--warn);fill-opacity:.25;stroke:var(--warn);stroke-width:2"/>
    <rect x="450" y="40" width="60" height="26" style="fill:none;stroke:var(--line);stroke-dasharray:3 2"/>
    <rect x="510" y="40" width="60" height="26" style="fill:none;stroke:var(--line);stroke-dasharray:3 2"/>
  </g>
  <text x="412" y="30" class="s-sub" style="fill:var(--warn)">t</text>
  <text x="466" y="30" class="s-sub" style="fill:var(--ink-3)">future</text>

  <text x="30" y="106" class="s-sub" style="fill:var(--acc)">rolling(3)</text>
  <rect x="270" y="90" width="180" height="22" rx="3" style="fill:var(--acc);fill-opacity:.22;stroke:var(--acc);stroke-width:1.5"/>
  <text x="600" y="106" class="s-sub" style="fill:var(--ink-3)">t−2, t−1, t — includes t</text>

  <text x="30" y="148" class="s-sub" style="fill:var(--good)">expanding()</text>
  <rect x="30" y="132" width="420" height="22" rx="3" style="fill:var(--good);fill-opacity:.22;stroke:var(--good);stroke-width:1.5"/>
  <text x="600" y="148" class="s-sub" style="fill:var(--ink-3)">everything to t — includes t</text>

  <text x="30" y="190" class="s-sub" style="fill:var(--crit)">ewm(span=3)</text>
  <g>
    <rect x="30" y="174" width="60" height="22" style="fill:var(--crit);fill-opacity:.03;stroke:none"/>
    <rect x="90" y="174" width="60" height="22" style="fill:var(--crit);fill-opacity:.05;stroke:none"/>
    <rect x="150" y="174" width="60" height="22" style="fill:var(--crit);fill-opacity:.08;stroke:none"/>
    <rect x="210" y="174" width="60" height="22" style="fill:var(--crit);fill-opacity:.12;stroke:none"/>
    <rect x="270" y="174" width="60" height="22" style="fill:var(--crit);fill-opacity:.18;stroke:none"/>
    <rect x="330" y="174" width="60" height="22" style="fill:var(--crit);fill-opacity:.28;stroke:none"/>
    <rect x="390" y="174" width="60" height="22" style="fill:var(--crit);fill-opacity:.42;stroke:none"/>
    <rect x="30" y="174" width="420" height="22" rx="3" style="fill:none;stroke:var(--crit);stroke-width:1.5"/>
  </g>
  <text x="600" y="190" class="s-sub" style="fill:var(--ink-3)">all rows, decaying weight — includes t</text>

  <line x1="30" y1="220" x2="850" y2="220" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="250" class="s-sub" style="fill:var(--acc)">rolling(3).mean().shift(1)</text>
  <rect x="210" y="234" width="180" height="22" rx="3" style="fill:var(--acc);fill-opacity:.22;stroke:var(--acc);stroke-width:1.5"/>
  <text x="600" y="250" class="s-sub" style="fill:var(--good)">t−3, t−2, t−1 — EXCLUDES t</text>
  <text x="30" y="282" class="s-sub" style="fill:var(--ink-3)">If the target at t is derived from the value at t, every unshifted window leaks it. shift(1) is the one-token fix.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the three windows, and their edges", code: `
import pandas as pd
import numpy as np

s = pd.Series([10, 12, 11, 15, 14, 16, 13, 18], name="v")

# ROLLING -- fixed window, current row included:
s.rolling(3).mean()
# 0     NaN
# 1     NaN          <- fewer than 3 observations
# 2    11.00         <- mean of 10, 12, 11
# 3    12.67
# ...
#
# The first n-1 values are NaN because the window is not full. That
# is the default min_periods = window.

s.rolling(3, min_periods=1).mean()
# 0    10.00         <- mean of just 10
# 1    11.00         <- mean of 10, 12
# 2    11.00
#
# min_periods=1 gives a value from the first row. The early values
# are averages of fewer points, which is honest as long as the
# consumer knows.

# EXPANDING -- everything so far:
s.expanding().mean()          # running mean
s.expanding().max()           # running max == cummax
s.expanding(min_periods=3).mean()     # NaN until three points

# EWM -- exponentially weighted:
s.ewm(span=3).mean()
# 0    10.00
# 1    11.33
# 2    11.14
# ...
#
# span=3 means "roughly the responsiveness of a 3-row rolling mean",
# but every past row contributes. No hard cutoff, no NaN warm-up,
# and it reacts to a change faster than the rolling equivalent.
#
# THE THREE PARAMETERISATIONS mean the same thing:
#   span=n         alpha = 2 / (n + 1)
#   halflife=h     weight halves every h rows
#   alpha=a        the raw decay factor
# halflife is the one non-specialists can reason about.

# adjust=False GIVES THE RECURSIVE FORM used in trading and control:
s.ewm(span=3, adjust=False).mean()
#   y[t] = alpha * x[t] + (1 - alpha) * y[t-1]
# adjust=True (default) corrects for the early rows having fewer
# contributors. They converge after a few spans.

# WHICH STATISTICS: mean sum std var min max median count quantile
# corr cov apply -- and for ewm: mean std var corr cov.
s.rolling(3).std()
s.rolling(3).quantile(0.9)
s.rolling(3).apply(lambda w: w.max() - w.min(), raw=True)
#
# raw=True passes a NumPy array to the callable rather than a Series.
# Much faster; use it unless the callable needs the index.

# CENTER -- a symmetric window, for smoothing:
s.rolling(3, center=True).mean()
# 0     NaN
# 1    11.00         <- mean of 10, 12, 11: row 1 is the CENTRE
# 2    12.67
#
# center=True USES THE FUTURE. Correct for a chart; leakage for a
# feature. The two uses look identical in source.

# ROLLING ON A DATAFRAME applies to every column:
df = pd.DataFrame({"a": s, "b": s * 2})
df.rolling(3).mean()

# ROLLING CORRELATION BETWEEN TWO SERIES:
df["a"].rolling(5).corr(df["b"])
`,
      hl: [15, 27, 51, 61],
      caption: "**`center=True` uses future rows.** It is correct for a chart and leakage for a feature, and the two uses are indistinguishable in the source."
    },

    { t: "h2", n: "02", text: "shift, and the leak that every unshifted window contains", id: "shift" },

    { t: "p", text: "**A rolling mean at row `t` includes the value at `t`.** If the target you are predicting is derived from that same value — tomorrow's price from today's, this week's demand from this week's — the feature already contains the answer. `shift(1)` moves the window back one row so it ends *before* the current one." },

    { t: "code", lang: "python", title: "the leak, and the one-token fix", code: `
prices = pd.Series([100, 102, 101, 105, 107, 106, 110, 112],
                   index=pd.date_range("2026-01-01", periods=8), name="close")

# THE TARGET: tomorrow's return.
target = prices.pct_change().shift(-1)         # shift(-1) pulls NEXT day back
#
# On 2026-01-01 the target is the return from 01-01 to 01-02. Fine.

# THE LEAKY FEATURE: today's 3-day mean, INCLUDING TODAY.
leaky = prices.rolling(3).mean()
#
# On day t, leaky[t] contains prices[t]. The target on day t is
# prices[t+1] / prices[t] - 1. The feature contains half the target.
# Not a perfect leak -- but a model will find it, score brilliantly
# in backtest, and fail in production where prices[t] is not known
# when the feature is computed at the start of day t.

# THE CAUSAL FEATURE:
causal = prices.rolling(3).mean().shift(1)
#
# On day t, causal[t] is the mean of days t-3, t-2, t-1. Everything in
# it was known before day t began. shift(1) is the whole fix.

pd.DataFrame({"close": prices, "leaky": leaky, "causal": causal, "target": target})
#             close   leaky  causal  target
# 2026-01-01    100     NaN     NaN   0.020
# 2026-01-02    102     NaN     NaN  -0.010
# 2026-01-03    101  101.00     NaN   0.040    <- leaky uses 101 (today)
# 2026-01-04    105  102.67  101.00   0.019    <- causal uses 100,102,101
# ...

# THE SAME PATTERN FOR EVERY WINDOW:
prices.expanding().max().shift(1)          # highest close BEFORE today
prices.ewm(span=5).mean().shift(1)         # EWMA as of yesterday
prices.pct_change().shift(1)               # YESTERDAY's return, a lag feature

# LAG FEATURES ARE JUST shift:
prices.shift(1)               # yesterday's close
prices.shift(7)               # a week ago
prices.shift(1) / prices.shift(2) - 1      # yesterday's return, spelled out

# THE DIRECTION IS EVERYTHING:
prices.shift(1)               # PAST  -> feature
prices.shift(-1)              # FUTURE -> target, or leakage if used as feature
#
# A positive shift moves values DOWN (later rows see earlier values).
# A negative shift moves them UP. The sign is easy to get wrong, and
# wrong means the feature IS the target.

# freq= SHIFTS THE INDEX INSTEAD OF THE VALUES:
prices.shift(1, freq="D")     # same values, every date moved one day
#
# Different operation. shift(1) on a series with gaps moves by ROW;
# shift(1, freq="D") moves by CALENDAR DAY and leaves gaps where there
# was no row. For "the value one day ago" on irregular data, the freq
# form is correct and the row form is wrong.

# A CHECK THAT CATCHES THE LEAK: the feature at t must not change
# when values from t onward are altered.
def assert_causal(make_feature, series, at=5):
    f_before = make_feature(series)
    altered = series.copy()
    altered.iloc[at:] = altered.iloc[at:] * 100          # corrupt the future
    f_after = make_feature(altered)
    assert f_before.iloc[at] == f_after.iloc[at], "feature at t depends on t or later"

assert_causal(lambda p: p.rolling(3).mean().shift(1), prices)      # passes
# assert_causal(lambda p: p.rolling(3).mean(), prices)             # FAILS
`,
      hl: [9, 17, 40, 60],
      caption: "**The feature at `t` must not change when values from `t` onward are altered.** That is a mechanical test for causality, and it fails on every unshifted window."
    },

    { t: "callout", kind: "trap", title: "shift(-1) is a target; shift(1) is a feature", body: [
      { t: "p", text: "A positive shift moves values down, so later rows see earlier values — the past. A negative shift moves them up, so each row sees the *next* value — the future." },
      { t: "p", text: "**Getting the sign wrong does not produce an error or an obviously bad feature.** It produces a feature that is the target, a backtest that looks miraculous, and a production model that has no idea what to do." },
      { t: "p", text: "The `assert_causal` check — corrupt everything from `t` onward and confirm the feature at `t` is unchanged — is cheap and catches every variant of this, including the ones you have not thought of." }
    ]},

    { t: "h2", n: "03", text: "Time-based windows and groups", id: "time" },

    { t: "code", lang: "python", title: "windows by elapsed time, and windows that respect group boundaries", code: `
# IRREGULAR TIMESTAMPS: rolling(3) means "the last 3 rows", which is
# a different span of time at every row.
events = pd.Series(
    [1, 2, 3, 4, 5, 6],
    index=pd.to_datetime(["2026-01-01 09:00", "2026-01-01 09:05",
                          "2026-01-01 09:06", "2026-01-01 14:00",
                          "2026-01-01 14:01", "2026-01-02 09:00"]),
)

events.rolling(3).sum()
# 09:06 -> 6  (09:00, 09:05, 09:06 -- 6 minutes of data)
# 14:01 -> 12 (09:06, 14:00, 14:01 -- 5 HOURS of data)
#
# "The last three events" is not "the last N minutes". A count window
# on irregular data is a feature whose meaning changes row by row.

# A TIME WINDOW -- rolling over an offset string:
events.rolling("10min").sum()
# 09:00 -> 1
# 09:05 -> 3
# 09:06 -> 6
# 14:00 -> 4   (nothing else in the last 10 minutes)
# 14:01 -> 9
# 09:00 next day -> 6
#
# The window is defined by ELAPSED TIME. It needs a monotonic
# DatetimeIndex (or on= a datetime column), and min_periods defaults
# to 1 -- so there is no NaN warm-up, which is a behaviour difference
# from count windows worth knowing.

# closed= DECIDES WHETHER THE CURRENT TIMESTAMP IS IN THE WINDOW:
events.rolling("10min", closed="right").sum()    # default: (t-10min, t]
events.rolling("10min", closed="left").sum()     # [t-10min, t) -- EXCLUDES t
events.rolling("10min", closed="both").sum()
events.rolling("10min", closed="neither").sum()
#
# closed="left" IS THE TIME-WINDOW EQUIVALENT OF shift(1). It gives
# "everything in the last 10 minutes, not including this instant" --
# the causal version without a separate shift.

# on= FOR A DATETIME COLUMN INSTEAD OF THE INDEX:
df = events.reset_index()
df.columns = ["ts", "v"]
df.rolling("10min", on="ts")["v"].sum()

# WINDOWS WITHIN GROUPS -- the boundary must not be crossed:
trades = pd.DataFrame({
    "symbol": ["A", "A", "A", "B", "B", "B"],
    "ts": pd.to_datetime(["10:00", "10:01", "10:02"] * 2),
    "price": [10.0, 11.0, 12.0, 100.0, 101.0, 102.0],
})

# WRONG -- the window runs across the A/B boundary:
trades["price"].rolling(2).mean()
# row 3 (B, 10:00) -> mean of 12 (A) and 100 (B) = 56. Meaningless.

# RIGHT -- groupby then rolling:
trades.groupby("symbol")["price"].rolling(2).mean()
# symbol
# A       0     NaN
#         1    10.5
#         2    11.5
# B       3     NaN
#         4   100.5
#         5   101.5
#
# The result has a (symbol, original_index) MultiIndex. To assign it
# back as a column, drop the group level:
trades["ma2"] = (trades.groupby("symbol")["price"]
                       .rolling(2).mean()
                       .reset_index(level=0, drop=True))
#
# Or use transform, which returns the source index directly:
trades["ma2"] = trades.groupby("symbol")["price"].transform(
    lambda s: s.rolling(2).mean())
#
# transform with a lambda runs Python per group -- fine for a few
# hundred symbols, slow for a million users. The groupby.rolling form
# is the fast one; the reset_index is the price.

# THE CAUSAL VERSION WITHIN GROUPS -- shift is also per group:
trades["ma2_lag"] = (trades.groupby("symbol")["price"]
                           .transform(lambda s: s.rolling(2).mean().shift(1)))
#
# A plain .shift(1) on the whole column would put A's last price onto
# B's first row. groupby("symbol").shift(1) does not.
trades.groupby("symbol")["price"].shift(1)       # NaN at each group's start

# TIME WINDOWS WITHIN GROUPS need the datetime as index or on=:
(trades.set_index("ts")
       .groupby("symbol")["price"]
       .rolling("2min", closed="left").mean())
`,
      hl: [11, 24, 33, 60],
      caption: "**A plain `shift(1)` on a multi-symbol column puts symbol A's last price onto symbol B's first row.** `groupby(\"symbol\").shift(1)` gives NaN at each group's start instead."
    },

    { t: "ladder",
      title: "A \"recent activity\" feature for each user",
      rungs: [
        { level: "bad", label: "Rolling over the whole frame", code: `df = df.sort_values("ts")
df["recent"] = df["amount"].rolling(5).mean()`,
          note: "**Crosses user boundaries and includes the current row.** Each user's first rows contain the previous user's activity, and the current transaction — which is often what the target is about — sits inside its own feature." },
        { level: "ok", label: "Grouped, count-based, shifted", code: `df = df.sort_values(["user", "ts"])
df["recent"] = (df.groupby("user")["amount"]
                  .transform(lambda s: s.rolling(5, min_periods=1).mean().shift(1)))`,
          note: "**Causal and per-user.** But \"the last five transactions\" is a different time span for a daily user and a yearly one — the feature means something different on every row." },
        { level: "best", label: "Grouped, time-based, closed left", code: `df = df.sort_values(["user", "ts"]).set_index("ts")
df["recent"] = (df.groupby("user")["amount"]
                  .rolling("30D", closed="left").mean()
                  .reset_index(level=0, drop=True))`,
          note: "**\"Mean spend in the 30 days before this transaction\" — same meaning for every row, every user.** `closed=\"left\"` excludes the current timestamp, which is the causal boundary; the reset_index is the cost of using the fast groupby.rolling path." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Anomaly flags that cannot see the anomaly they are flagging",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "Build a rolling anomaly detector for per-sensor readings. A reading is anomalous when it is more than `k` robust standard deviations from the recent level. It runs on a stream, so at each row it may only use readings that arrived before it." },
        { t: "p", text: "Sensors report at different rates, so the baseline must be time-based. And the baseline must not include the anomalies it has already flagged, or a burst of bad readings raises the bar and hides the rest of the burst." }
      ],
      requirements: [
        "Time-based baseline per sensor, strictly excluding the current reading.",
        "Robust location and scale (median / MAD), not mean / std.",
        "Exclude previously flagged readings from the baseline.",
        "Produce a flag, a z-score and the baseline used, per reading.",
        "Prove causality with a corruption test.",
        "Include tests, including a burst and a sensor with sparse data."
      ],
      hint: "Excluding flagged readings from the baseline means the baseline depends on earlier flags. That is sequential — decide whether it must be a loop, and what it costs.",
      solution: {
        lang: "python",
        title: "anomaly.py",
        code: `import pandas as pd
import numpy as np


# =========================================================================
# THE DESIGN QUESTION: masked baseline is sequential
# =========================================================================
#
# "Exclude readings that were flagged" means the baseline at row t
# depends on flags at rows < t, which depend on baselines at those
# rows. That is a genuine recurrence, and no rolling() call expresses
# it directly.
#
# Two honest options:
#
#   A. TWO-PASS APPROXIMATION. Compute a baseline over ALL past rows,
#      flag, then recompute the baseline excluding those flags, and
#      flag again. Vectorised, and converges in one or two passes on
#      real data because a robust baseline is barely moved by the
#      anomalies in the first place.
#
#   B. A LOOP per sensor. Exact, O(n) in Python, and fine for a few
#      thousand readings per sensor. Slow for millions.
#
# We build A, with the robust statistics doing most of the work, and
# note where B would be required.


def _robust_window(values, times, window, closed_left=True):
    """Time-windowed median and MAD, excluding the current row."""
    s = pd.Series(values, index=times)
    r = s.rolling(window, closed="left" if closed_left else "right",
                  min_periods=3)
    med = r.median()
    # MAD needs the median inside the window -- rolling.apply with
    # raw=True gives the window as an array.
    mad = r.apply(lambda w: np.median(np.abs(w - np.median(w))), raw=True)
    return med, mad * 1.4826               # scale MAD to sd for normal data


def detect(readings, *, window="1h", k=4.0, passes=2, min_scale=1e-9):
    """Flag anomalies per sensor, using only the past.

    readings   columns: sensor, ts, value
    window     baseline span, e.g. "1h" -- elapsed time, not row count
    k          threshold in robust standard deviations
    passes     baseline recomputations excluding earlier flags
    """
    df = readings.copy()
    df["ts"] = pd.to_datetime(df["ts"])
    df = df.sort_values(["sensor", "ts"], kind="stable").reset_index(drop=True)

    flagged = pd.Series(False, index=df.index)

    for _ in range(passes):
        baseline = pd.Series(np.nan, index=df.index)
        scale = pd.Series(np.nan, index=df.index)

        for sensor, grp in df.groupby("sensor", sort=False):
            # THE MASK: previously flagged readings are removed from
            # the series the baseline is computed FROM, but the
            # baseline is still EVALUATED at every reading's timestamp.
            # Reindexing the rolling result onto all timestamps does
            # that; ffill carries the last clean baseline forward to
            # a flagged row's position.
            clean = grp[~flagged[grp.index]]
            if len(clean) < 3:
                continue

            med, sd = _robust_window(clean["value"].to_numpy(),
                                     clean["ts"].to_numpy(), window)
            # Evaluate at every reading in the group, clean or not.
            # asof-style: the baseline as of just before each ts.
            med_all = med.reindex(grp["ts"].to_numpy(), method="ffill")
            sd_all = sd.reindex(grp["ts"].to_numpy(), method="ffill")

            baseline[grp.index] = med_all.to_numpy()
            scale[grp.index] = sd_all.to_numpy()

        # A CONSTANT WINDOW HAS MAD 0. Dividing would flag any change
        # at all. Floor the scale so a sensor that has been perfectly
        # flat is not hypersensitive.
        scale = scale.clip(lower=min_scale)
        z = (df["value"] - baseline) / scale
        new_flags = z.abs() > k
        new_flags = new_flags.fillna(False)

        if new_flags.equals(flagged):
            break                              # converged
        flagged = new_flags

    df["baseline"] = baseline
    df["scale"] = scale
    df["z"] = z
    df["anomaly"] = flagged
    return df


# =========================================================================
# THE CAUSALITY TEST -- the property that matters most
# =========================================================================

def assert_causal(readings, at_row, **kw):
    """Corrupting readings at or after at_row must not change the
    flag or baseline at at_row itself."""
    before = detect(readings, **kw)
    corrupted = readings.copy().sort_values(["sensor", "ts"]).reset_index(drop=True)
    corrupted.loc[at_row:, "value"] *= 1000
    after = detect(corrupted, **kw)

    for col in ("baseline", "z", "anomaly"):
        b, a = before.loc[at_row, col], after.loc[at_row, col]
        same = (b == a) or (pd.isna(b) and pd.isna(a))
        assert same, f"{col} at row {at_row} changed when the future changed"


# =========================================================================
# WHY MEDIAN / MAD
# =========================================================================
#
# A burst of anomalous readings inflates the MEAN and the STANDARD
# DEVIATION of any window containing it. With mean/std, the fourth
# bad reading in a burst is compared against a baseline the first
# three have already pulled toward themselves -- so it passes. The
# burst hides itself.
#
# Median and MAD are unmoved by a minority of extreme values. The
# masked-baseline passes are a second line of defence; the robust
# statistics are the first, and they do most of the work.


# =========================================================================
# TESTS
# =========================================================================

def _stream(n=200, seed=0, rate="1min"):
    rng = np.random.default_rng(seed)
    ts = pd.date_range("2026-01-01", periods=n, freq=rate)
    return pd.DataFrame({
        "sensor": "s1",
        "ts": ts,
        "value": 20 + rng.normal(0, 0.5, n),
    })


def test_single_spike_is_flagged():
    r = _stream()
    r.loc[100, "value"] = 40.0

    out = detect(r, window="30min")
    assert out.loc[100, "anomaly"]
    assert out["anomaly"].sum() == 1


def test_burst_is_fully_flagged_not_just_its_start():
    """With mean/std the later readings in a burst would pass."""
    r = _stream()
    r.loc[100:110, "value"] = 40.0

    out = detect(r, window="30min")
    assert out.loc[100:110, "anomaly"].all()


def test_reading_after_burst_is_not_flagged():
    """The baseline must recover -- the burst must not poison it."""
    r = _stream()
    r.loc[100:110, "value"] = 40.0

    out = detect(r, window="30min")
    assert not out.loc[115:, "anomaly"].any()


def test_causality():
    r = _stream()
    r.loc[100, "value"] = 40.0
    assert_causal(r, at_row=90, window="30min")
    assert_causal(r, at_row=100, window="30min")


def test_current_reading_is_not_in_its_own_baseline():
    """A spike must not raise the median it is compared against."""
    r = _stream(n=50)
    r.loc[40, "value"] = 40.0

    out = detect(r, window="30min")
    assert abs(out.loc[40, "baseline"] - 20) < 1.0


def test_sparse_sensor_gets_no_flags_until_enough_history():
    r = pd.DataFrame({
        "sensor": "sparse",
        "ts": pd.to_datetime(["10:00", "10:01"]),
        "value": [1.0, 100.0],
    })
    out = detect(r, window="1h")

    assert not out["anomaly"].any()
    assert out["baseline"].isna().all()


def test_sensors_do_not_share_baselines():
    a = _stream(seed=1).assign(sensor="a")
    b = _stream(seed=2).assign(sensor="b", value=lambda d: d["value"] + 1000)
    r = pd.concat([a, b], ignore_index=True)

    out = detect(r, window="30min")
    assert not out["anomaly"].any()          # each is normal for itself


def test_constant_sensor_is_not_hypersensitive():
    r = _stream()
    r["value"] = 20.0
    r.loc[100, "value"] = 20.001             # a tiny wobble

    out = detect(r, window="30min")
    # MAD is 0 -> scale floored -> z is huge -> flagged. That IS the
    # behaviour for a genuinely constant sensor: any deviation is
    # unprecedented. The test documents it rather than hiding it.
    assert out.loc[100, "anomaly"]


def test_time_window_not_row_window():
    """Two readings 2 hours apart must not be in a 1h window."""
    r = pd.DataFrame({
        "sensor": "s",
        "ts": pd.to_datetime(["09:00", "09:01", "09:02", "09:03", "12:00"]),
        "value": [20.0, 20.0, 20.0, 20.0, 40.0],
    })
    out = detect(r, window="1h")

    assert out.loc[4, "baseline"] is np.nan or pd.isna(out.loc[4, "baseline"])`,
        notes: [
          { t: "p", text: "**The masked baseline is a genuine recurrence**, and no `rolling` call expresses it. The two-pass approximation is honest about that: it converges because a robust baseline is barely moved by the anomalies in the first place, so the robust statistics do most of the work and the masking is a second line of defence." },
          { t: "callout", kind: "insight", title: "Why a burst hides itself under mean/std", body: [
            { t: "p", text: "The first three bad readings pull the window's mean and standard deviation toward themselves, so **the fourth is compared against a baseline they have already corrupted, and passes.**" },
            { t: "p", text: "Median and MAD are unmoved by a minority of extreme values. The burst test — all eleven readings flagged, not just the first — is the one that fails with mean/std." }
          ]},
          { t: "p", text: "**`closed=\"left\"` is what keeps the current reading out of its own baseline.** A spike that raises the median it is compared against would partially hide itself; the test checks that the baseline at the spike is still near 20." },
          { t: "p", text: "**The causality test is mechanical**: multiply every value from row `t` onward by 1000 and assert that the flag, z-score and baseline at `t` are unchanged. It catches the unshifted window, the wrong `closed`, and any future variant of the same mistake." },
          { t: "p", text: "**The constant-sensor case is documented rather than hidden.** A sensor that has been perfectly flat has MAD 0, and any deviation is genuinely unprecedented — flagging it is correct, and the scale floor exists to make it a large finite z-score rather than a division by zero." },
          { t: "p", text: "**The baseline is evaluated at every reading but computed from only the clean ones.** Reindexing the rolling result onto all timestamps with `ffill` carries the last clean baseline forward to a flagged row's position — the as-of pattern from 2.2, applied to a window." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`prices.rolling(3).mean()` is used as a feature to predict tomorrow's return. What is wrong?",
          options: [
            "The window is too short",
            "The window includes today's price, which is half of tomorrow's return — the feature contains part of the target",
            "It should be an expanding window",
            "Nothing"
          ],
          answer: 1,
          why: "A rolling window at row `t` includes row `t`. If the target is derived from the value at `t`, the feature already contains it. `.shift(1)` moves the window to end at `t−1`, so everything in it was known before `t` began — one token, and the difference between a backtest and a production model."
        }
      ]
    }
  ],

  takeaways: [
    "**`rolling` is a fixed window, `expanding` is everything so far, `ewm` is everything with decaying weight** — and all three include the current row.",
    "**`shift(1)` turns a window into a feature about the past**; `shift(-1)` produces a target, or a leak if used as a feature.",
    "**The feature at `t` must not change when values from `t` onward are altered** — a mechanical causality test that catches every unshifted window.",
    "**`min_periods` defaults to the window size for `rolling`** and to 1 for `expanding` and time-based windows, so the NaN warm-up differs.",
    "**`center=True` uses future rows** — correct for smoothing a chart, leakage in a feature, indistinguishable in source.",
    "**A count window on irregular timestamps means a different span of time at every row**; use an offset string for a time-based window.",
    "**`closed=\"left\"` is the time-window equivalent of `shift(1)`** — it excludes the current timestamp.",
    "**`shift(1, freq=\"D\")` moves by calendar day; `shift(1)` moves by row** — on data with gaps they differ.",
    "**A rolling window on a multi-group column crosses group boundaries** — use `groupby(...).rolling(...)` and drop the group level, or `groupby(...).shift(1)`.",
    "**`groupby.rolling` is Cython; `transform(lambda s: s.rolling(...))` runs Python per group** — the reset_index is the price of the fast path.",
    "**`ewm(span=n)` reacts faster than `rolling(n)` and has no hard edge**; `halflife` is the parameterisation non-specialists can reason about.",
    "**Robust windows (median, MAD) are what stop a burst of anomalies from raising the bar and hiding itself.**"
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does `closed=\"left\"` do on a time-based rolling window?",
        options: [
          "Reverses the window direction",
          "Excludes the current timestamp from its own window — the causal boundary, without a separate shift",
          "Includes only the first observation",
          "Sorts the index"
        ],
        answer: 1,
        why: "The default `closed=\"right\"` gives `(t−w, t]`, including `t`. `\"left\"` gives `[t−w, t)`, so the statistic at `t` uses only earlier timestamps. It is the time-window form of `shift(1)`, and it composes correctly with `groupby`."
      },
      {
        stem: "`df[\"price\"].rolling(2).mean()` on a frame with several symbols sorted by symbol. What happens at each symbol's first row?",
        options: [
          "NaN, correctly",
          "It averages the previous symbol's last price with this symbol's first — the window crosses the group boundary",
          "It raises",
          "It uses the symbol's own mean"
        ],
        answer: 1,
        why: "A plain rolling window knows nothing about groups; it just looks back two rows. `groupby(\"symbol\")[\"price\"].rolling(2)` restarts at each group, and `groupby(\"symbol\").shift(1)` gives NaN at each group's start instead of the previous group's value."
      },
      {
        stem: "Why prefer median and MAD over mean and std for a rolling anomaly baseline?",
        options: [
          "They are faster",
          "A burst of anomalies inflates the mean and std of any window containing it, so later readings in the burst are compared against a baseline they have already corrupted and pass",
          "They handle NaN better",
          "They are more precise"
        ],
        answer: 1,
        why: "Robust statistics are unmoved by a minority of extreme values, so the fourth bad reading in a burst still looks bad. With mean/std the burst hides itself — the test that flags all eleven readings rather than just the first is the one that distinguishes the two."
      },
      {
        stem: "`rolling(5)` on transactions with irregular timestamps. What does the feature mean?",
        options: [
          "The last five minutes",
          "The last five rows, which is a different span of time at every row — six minutes for one user, five hours for another",
          "The last five days",
          "A fixed span set by the index frequency"
        ],
        answer: 1,
        why: "A count window is defined in rows, not time. On irregular data its meaning changes row by row. `rolling(\"30D\")` on a datetime index defines the window by elapsed time, so \"mean spend in the 30 days before this transaction\" means the same thing for every row and every user."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you make a rolling-window feature safe for a forecasting model?",
        strong: "Shift it. A rolling mean at row `t` includes row `t`, and if the target is derived from that value the feature contains part of the answer. `.rolling(n).mean().shift(1)` ends the window at `t−1`. For time-based windows, `closed=\"left\"` does the same thing. And I would test it mechanically: corrupt everything from `t` onward and assert the feature at `t` is unchanged.",
        answer: [
          { t: "p", text: "The one-token fix is the answer; the causality test is what shows you would verify rather than assume." }
        ]
      },
      {
        level: "advanced",
        q: "When would you use a time-based window rather than a count-based one?",
        strong: "Whenever timestamps are irregular, which is nearly always for event data. `rolling(5)` means \"the last five rows\" — six minutes for a busy user, five months for a dormant one — so the feature means something different on every row. `rolling(\"30D\")` means the same elapsed span everywhere. It needs a monotonic datetime index or `on=`, defaults `min_periods` to 1, and takes `closed=` to exclude the current instant.",
        answer: [
          { t: "p", text: "Explaining the semantic problem with count windows — the feature's meaning drifts — is more persuasive than listing the API." }
        ]
      },
      {
        level: "advanced",
        q: "How would you compute a per-user rolling feature on ten million rows without crossing user boundaries?",
        strong: "Sort by user and time, then `groupby(\"user\")[\"v\"].rolling(...)`, which runs in Cython and restarts at each group. It returns a `(user, index)` MultiIndex, so `reset_index(level=0, drop=True)` before assigning. `transform(lambda s: s.rolling(...))` gives the source index directly but runs Python per user — fine for hundreds of groups, not millions. And `shift` has to be grouped too, or one user's last value lands on the next user's first row.",
        answer: [
          { t: "p", text: "Knowing the fast path and its reset_index cost, against the convenient path and its speed cost, is the practical distinction." }
        ]
      }
    ]
  }
});

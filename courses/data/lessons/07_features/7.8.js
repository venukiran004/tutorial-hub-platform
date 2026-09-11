/* ============================================================================
   LESSON 7.8 — Datetime Features and Cyclical Encoding
   ========================================================================= */
EC.receiveLesson({
  id: "7.8",

  lede: "**A timestamp is not a feature. It is a bundle of features — hour, weekday, month, days since something, days until something — and a model handed the raw integer learns almost nothing from it.** The month column that comes out of that bundle has a problem of its own: December is 12 and January is 1, so a linear model believes they are eleven months apart when they are adjacent. The sine-cosine trick fixes that, and it is the one piece of datetime feature engineering people most often skip.",

  objectives: [
    "Decompose a timestamp into the components that carry signal for a given problem",
    "Compute elapsed-time features — since an event, until an event, between events — without using the future",
    "Encode cyclical components with sine and cosine and explain what it does to distance",
    "Handle timezone, calendar and holiday effects as features rather than noise",
    "Build a datetime transformer that is causal, fit-free, and correct across a year boundary"
  ],

  prerequisites: ["4.4", "7.6"],

  blocks: [

    { t: "h2", n: "01", text: "What a timestamp contains", id: "components" },

    { t: "p", text: "`2026-03-14 15:09:26` is a point in time. **For a model it is also a Saturday, mid-afternoon, mid-March, the 73rd day of the year, the second week of the month, not a holiday, and a certain number of days since the customer signed up.** Each of those is a separate hypothesis about what drives the outcome, and each is a separate column." },

    { t: "dl", items: [
      ["Component features", "The calendar parts of a timestamp: year, month, day, weekday, hour, minute, quarter, day-of-year, week-of-year. Extracted with the `.dt` accessor."],
      ["Elapsed-time features", "Durations between the row's timestamp and some reference: days since signup, hours since last login, days until contract end. Usually the strongest datetime features."],
      ["Cyclical feature", "A component that wraps around: hour (23 → 0), weekday (6 → 0), month (12 → 1). Its integer encoding has a false discontinuity at the wrap."],
      ["Sine-cosine encoding", "Mapping a cyclical value `v` with period `P` to `(sin(2πv/P), cos(2πv/P))` — two coordinates on a circle, so that the wrap point is adjacent to its neighbour."],
      ["Calendar feature", "A fact about the date that is not derivable from its components: public holiday, school term, end of quarter, payday. Needs an external table."],
      ["Causal", "Computed using only information available at the row's timestamp. `days_until_churn` is a label, not a feature."]
    ]},

    { t: "viz",
      title: "Month as an integer against month on a circle",
      caption: "On the integer line, December and January are 11 apart — further than any other adjacent pair. On the circle they are neighbours, and every adjacent pair is the same distance apart. A distance-based or linear model sees the second picture only if you give it sine and cosine.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="A number line from 1 to 12 with December and January far apart, beside a circle with twelve month points where December and January are adjacent">
  <text x="30" y="26" class="s-label" style="fill:var(--crit)">month as an integer</text>
  <line x1="40" y1="120" x2="400" y2="120" style="stroke:var(--line);stroke-width:1.5"/>
  <g style="fill:var(--acc)">
    <circle cx="52" cy="120" r="5"/><circle cx="84" cy="120" r="5"/><circle cx="116" cy="120" r="5"/><circle cx="148" cy="120" r="5"/>
    <circle cx="180" cy="120" r="5"/><circle cx="212" cy="120" r="5"/><circle cx="244" cy="120" r="5"/><circle cx="276" cy="120" r="5"/>
    <circle cx="308" cy="120" r="5"/><circle cx="340" cy="120" r="5"/><circle cx="372" cy="120" r="5"/>
  </g>
  <circle cx="52" cy="120" r="7" style="fill:none;stroke:var(--crit);stroke-width:2"/>
  <circle cx="372" cy="120" r="7" style="fill:none;stroke:var(--crit);stroke-width:2"/>
  <text x="44" y="146" class="s-sub" style="fill:var(--ink-3)">1</text>
  <text x="362" y="146" class="s-sub" style="fill:var(--ink-3)">12</text>
  <path d="M52 108 Q212 20 372 108" style="fill:none;stroke:var(--crit);stroke-width:1.5;stroke-dasharray:4 3"/>
  <text x="150" y="60" class="s-sub" style="fill:var(--crit)">Jan → Dec: distance 11</text>
  <text x="40" y="190" class="s-sub" style="fill:var(--ink-3)">Nov → Dec: distance 1. Dec → Jan: distance 11.</text>
  <text x="40" y="210" class="s-sub" style="fill:var(--ink-3)">A linear model fits one slope: "later in the year → more".</text>
  <text x="40" y="230" class="s-sub" style="fill:var(--ink-3)">It cannot express "winter", which straddles the wrap.</text>

  <text x="500" y="26" class="s-label" style="fill:var(--good)">month on a circle — (sin, cos)</text>
  <circle cx="660" cy="150" r="90" style="fill:none;stroke:var(--line);stroke-width:1.5"/>
  <g style="fill:var(--acc)">
    <circle cx="660" cy="60" r="5"/><circle cx="705" cy="72" r="5"/><circle cx="738" cy="105" r="5"/><circle cx="750" cy="150" r="5"/>
    <circle cx="738" cy="195" r="5"/><circle cx="705" cy="228" r="5"/><circle cx="660" cy="240" r="5"/><circle cx="615" cy="228" r="5"/>
    <circle cx="582" cy="195" r="5"/><circle cx="570" cy="150" r="5"/><circle cx="582" cy="105" r="5"/><circle cx="615" cy="72" r="5"/>
  </g>
  <circle cx="660" cy="60" r="7" style="fill:none;stroke:var(--good);stroke-width:2"/>
  <circle cx="615" cy="72" r="7" style="fill:none;stroke:var(--good);stroke-width:2"/>
  <text x="652" y="50" class="s-sub" style="fill:var(--ink-3)">Jan</text>
  <text x="590" y="66" class="s-sub" style="fill:var(--ink-3)">Dec</text>
  <text x="752" y="154" class="s-sub" style="fill:var(--ink-3)">Apr</text>
  <text x="652" y="258" class="s-sub" style="fill:var(--ink-3)">Jul</text>
  <text x="540" y="154" class="s-sub" style="fill:var(--ink-3)">Oct</text>
  <text x="500" y="284" class="s-sub" style="fill:var(--good)">every adjacent pair is the same distance apart, including Dec → Jan</text>
</svg>`
    },

    { t: "code", lang: "python", title: "components, and which ones matter for which problem", code: `
import pandas as pd
import numpy as np

rng = np.random.default_rng(0)
ts = pd.Series(pd.date_range("2025-11-20", "2026-03-20", freq="37min"))

# THE .dt ACCESSOR: one call per component.
f = pd.DataFrame({"ts": ts})
f["year"]        = ts.dt.year
f["month"]       = ts.dt.month                 # 1-12
f["day"]         = ts.dt.day                   # 1-31
f["weekday"]     = ts.dt.dayofweek             # 0 = Monday
f["hour"]        = ts.dt.hour
f["minute"]      = ts.dt.minute
f["quarter"]     = ts.dt.quarter
f["dayofyear"]   = ts.dt.dayofyear             # 1-366
f["weekofyear"]  = ts.dt.isocalendar().week.astype(int)
f["is_weekend"]  = (ts.dt.dayofweek >= 5).astype(int)
f["is_month_end"] = ts.dt.is_month_end.astype(int)
f["days_in_month"] = ts.dt.days_in_month

# WHICH ONES, for which problem -- a hypothesis each:
#   hour          intraday demand, fraud (3am is not 3pm), server load
#   weekday       retail, B2B (nothing happens Sunday), commuting
#   is_weekend    a cleaner version of weekday for many problems
#   month         seasonality: heating, tourism, tax deadlines
#   day           payday effects (1st, 25th, last), rent day
#   dayofyear     finer seasonality than month, for long series
#   quarter       reporting cycles, budget flushes
#   year          TREND. Dangerous: a model trained on 2024-2025
#                 has never seen year=2026 and will extrapolate
#                 a linear effect that may not exist. Prefer an
#                 elapsed-time feature (days since a fixed epoch)
#                 and let the model see it as continuous.
#
# THE ONES THAT ARE USUALLY NOISE: minute, second, and day-of-month
# on data with no monthly rhythm. Each is a column the model can
# overfit. Add components as hypotheses, not by default.

# WEEK-OF-YEAR HAS A TRAP AT THE YEAR BOUNDARY:
pd.Timestamp("2026-01-01").isocalendar().week          # 1
pd.Timestamp("2025-12-29").isocalendar().week          # 1  <- ISO week 1 of 2026
pd.Timestamp("2027-01-01").isocalendar().week          # 53 <- ISO week 53 of 2026
#
# ISO weeks belong to the year that has the Thursday. Dec 29 2025 is
# week 1; Jan 1 2027 is week 53. A feature that groups by (year,
# week) must use the ISO YEAR, not the calendar year:
f["iso_year"] = ts.dt.isocalendar().year.astype(int)

# THE DATE WITH A FAKE TIME (see 6.1): if 90% of timestamps are at
# 00:00:00, hour and minute are meaningless. Check before building
# intraday features:
(ts.dt.time == pd.Timestamp("00:00").time()).mean()       # ~0.03 here: real times

# INTERACTIONS THE COMPONENTS IMPLY:
f["hour_weekend"] = f["hour"] * f["is_weekend"]           # 10am Saturday != 10am Tuesday
#
# A tree finds this on its own. A linear model needs the product.

# THE INTEGER ENCODING OF A CYCLE, and its problem:
f[["month"]].describe().loc[["min", "max"]]                # 1, 12
#
# For a linear model, month=12 is eleven units from month=1. For
# KNN, a December row is far from a January row. Both are wrong
# about the calendar. Section 3 fixes it; but first, the features
# that matter most.
`,
      hl: [21, 33, 42, 50],
      caption: "**A model trained on 2024–2025 has never seen `year = 2026`** and will extrapolate a linear effect that may not exist. Prefer days-since-epoch as a continuous feature and let the model treat it as one."
    },

    { t: "h2", n: "02", text: "Elapsed time: the features that carry the most", id: "elapsed" },

    { t: "p", text: "**How long since — or until — something happened is usually a stronger predictor than any calendar component.** Days since signup, hours since last purchase, days until the contract ends: each is a duration, each is continuous, and each is computed against a reference that must have been known at the row's time." },

    { t: "code", lang: "python", title: "durations, recency, and the ones that use the future", code: `
customers = pd.DataFrame({
    "customer_id": range(1, 6),
    "signup":      pd.to_datetime(["2024-01-15", "2025-06-01", "2025-11-30", "2026-02-10", "2023-03-03"]),
    "last_order":  pd.to_datetime(["2026-02-28", "2026-03-01", None, "2026-03-05", "2025-12-20"]),
    "contract_end": pd.to_datetime(["2026-06-30", "2027-01-01", "2026-04-15", "2026-12-31", "2026-03-31"]),
})
as_of = pd.Timestamp("2026-03-10")                        # THE REFERENCE TIME

# EVERY ELAPSED FEATURE IS RELATIVE TO as_of. Never datetime.now():
# the feature must be reproducible, and it must match what the model
# will see in production, where as_of is the scoring time.

customers["tenure_days"]        = (as_of - customers["signup"]).dt.days
customers["days_since_order"]   = (as_of - customers["last_order"]).dt.days   # NaN if never
customers["days_to_contract_end"] = (customers["contract_end"] - as_of).dt.days
customers["never_ordered"]      = customers["last_order"].isna().astype(int)
customers
#    customer_id  tenure_days  days_since_order  days_to_contract_end  never_ordered
# 0            1          785              10.0                   112              0
# 1            2          282               9.0                   297              0
# 2            3          100               NaN                    36              1
# 3            4           28               5.0                   296              0
# 4            5         1103              80.0                    21              0
#
# .dt.days on a Timedelta series -> integer days. .dt.total_seconds()
# / 3600 for hours. Negative days_to_contract_end means it already
# ended -- which is a state, not an error.

# THE SIGN OF THE FUTURE: days_to_contract_end uses contract_end,
# which is a date in the future -- but it was KNOWN at as_of (it is
# in the contract). That is fine. What is not fine:
#   days_until_churn        churn has not happened at as_of: LABEL
#   days_until_next_order   the next order is the future: LABEL
#   time_to_resolution      for an open ticket: LABEL
#
# The test: could this value have been computed at as_of with only
# what was known then? A contract end date, yes. A churn date, no.

# TRANSFORMS THAT USUALLY HELP:
customers["log_tenure"] = np.log1p(customers["tenure_days"])
#   tenure is skewed (most customers are new) and its effect
#   saturates (year 5 vs year 6 matters less than month 1 vs 2).
customers["recency_bucket"] = pd.cut(customers["days_since_order"],
                                     [-1, 7, 30, 90, 365, np.inf],
                                     labels=["week", "month", "quarter", "year", "older"])
#   RFM-style buckets: domain edges (7.6), and "never" stays NaN
#   with its own flag.

# BETWEEN EVENTS -- from an event log, per entity:
events = pd.DataFrame({
    "customer_id": [1, 1, 1, 2, 2],
    "ts": pd.to_datetime(["2026-01-05", "2026-01-20", "2026-02-28", "2026-02-01", "2026-03-01"]),
}).sort_values(["customer_id", "ts"])
events["gap_days"] = events.groupby("customer_id")["ts"].diff().dt.days         # since PREVIOUS
events["n_prior"]  = events.groupby("customer_id").cumcount()                    # count before
events["mean_gap_so_far"] = (events.groupby("customer_id")["gap_days"]
                                   .transform(lambda s: s.expanding().mean().shift(0)))
#
# gap_days is causal: diff() looks back. A shift(-1) would look
# forward -- "days until next event" -- and that is a label.
# mean_gap_so_far uses an expanding window INCLUDING the current
# gap, which is known at the current event (the gap ended when the
# event happened). Whether to include it depends on when the
# feature is computed: at the event, yes; one second before, no.

# AGE AT EVENT -- a duration between two columns, not against as_of:
orders = pd.DataFrame({"customer_id": [1, 2], "order_ts": pd.to_datetime(["2026-03-01", "2026-03-05"])})
orders = orders.merge(customers[["customer_id", "signup"]], on="customer_id")
orders["tenure_at_order"] = (orders["order_ts"] - orders["signup"]).dt.days
#
# Per-row reference: how old was the account WHEN THIS ORDER
# happened. Different from tenure at as_of, and often the right one
# for an event-level model.

# DURATIONS IN THE RIGHT UNIT: a model does not care, but a reader
# does, and so does a scaler (7.4). Days for tenure; hours for
# session gaps; seconds for latency. One unit per feature, named in
# the column.
`,
      hl: [9, 22, 43, 61],
      caption: "**`days_to_contract_end` uses a future date that was known at `as_of` — that is fine. `days_until_churn` uses a future date that was not — that is the label.** The test is whether the value could have been computed at scoring time."
    },

    { t: "callout", kind: "trap", title: "datetime.now() in a feature", body: [
      { t: "p", text: "A feature computed against the wall clock is different every time the code runs. Training on Monday and scoring on Friday gives every customer four extra days of tenure that the model was not trained on — and a backfill run next year makes every historical row a year older than it was." },
      { t: "p", text: "**Every elapsed-time feature takes an explicit `as_of` parameter.** In training it is the snapshot date; in production it is the scoring time; in a backfill it is the historical date. The feature is then a pure function of the data and the reference, and it reproduces." }
    ]},

    { t: "h2", n: "03", text: "Cyclical encoding", id: "cyclical" },

    { t: "p", text: "**Hour 23 and hour 0 are one hour apart. Their integer encodings are 23 apart.** Any model that uses distance or fits a slope reads the integer, and it reads it wrongly at the wrap. Mapping the value onto a circle — one coordinate for sine, one for cosine — puts every adjacent pair the same distance apart, including the pair that crosses midnight." },

    { t: "code", lang: "python", title: "sine and cosine, and what it does and does not fix", code: `
def cyclical(v, period):
    """Map a cyclical integer/float onto the unit circle."""
    angle = 2 * np.pi * v / period
    return np.sin(angle), np.cos(angle)

hours = np.arange(24)
sin_h, cos_h = cyclical(hours, 24)
pd.DataFrame({"hour": hours, "sin": sin_h.round(3), "cos": cos_h.round(3)}).iloc[[0, 1, 6, 12, 18, 23]]
#     hour    sin    cos
# 0      0  0.000  1.000
# 1      1  0.259  0.966
# 6      6  1.000  0.000
# 12    12  0.000 -1.000
# 18    18 -1.000 -0.000
# 23    23 -0.259  0.966     <- next to hour 0 in (sin, cos) space

# THE DISTANCE, before and after:
def dist(a, b, period):
    sa, ca = cyclical(a, period); sb, cb = cyclical(b, period)
    return np.hypot(sa - sb, ca - cb)

abs(23 - 0), dist(23, 0, 24)              # (23, 0.26)  -- integer vs circle
abs(11 - 12), dist(11, 12, 24)            # (1, 0.26)   -- the same 0.26
#
# On the circle, every adjacent hour is 0.26 apart. Hour 23 to hour
# 0 is 0.26. Hour 0 to hour 12 is 2.0 -- the diameter, the maximum.
# A KNN on (sin, cos) treats 23:30 and 00:30 as neighbours. On the
# raw integer it treats them as the two most distant hours.

# WHY TWO COLUMNS, NOT ONE: sin alone maps hour 6 and hour 18 to
# +1 and -1 -- fine -- but hour 3 and hour 9 BOTH map to 0.707.
# One coordinate on a circle is ambiguous; two identify the point.
sin_only = np.sin(2 * np.pi * np.array([3, 9]) / 24)
sin_only                                   # [0.707, 0.707] -- indistinguishable
#
# Both columns, always. A model that only gets sin cannot tell
# morning from afternoon.

# THE PERIODS:
#   hour         24
#   minute       60
#   weekday      7
#   month        12
#   dayofyear    365.25 (or 366 in a leap year -- see below)
#   day of month 28-31 -- VARIES. Cyclical encoding of day-of-month
#                is dubious: the 30th and the 1st are adjacent only
#                in months with 30 days.

# DAY OF YEAR: the period changes in leap years. Use the fraction
# of the year instead, so Dec 31 is always just before Jan 1:
def year_fraction(ts):
    start = ts.dt.year.map(lambda y: pd.Timestamp(year=y, month=1, day=1))
    end   = ts.dt.year.map(lambda y: pd.Timestamp(year=y + 1, month=1, day=1))
    return (ts - start).dt.total_seconds() / (end - start).dt.total_seconds()

frac = year_fraction(ts)
sin_y, cos_y = cyclical(frac, 1.0)          # period 1 = one year

# WHAT IT FIXES: the wrap, for LINEAR and DISTANCE models.
# WHAT IT DOES NOT FIX:
#   - trees. A tree splits on thresholds and can already express
#     "hour >= 22 OR hour <= 2" in two splits. Sin/cos gives it two
#     columns it must combine to recover what it had. Trees are
#     usually FINE with the raw integer, and sometimes worse with
#     sin/cos. Give them both and let CV decide.
#   - a non-sinusoidal pattern. Sin/cos of hour lets a LINEAR model
#     fit one smooth bump per day. Real intraday demand has TWO
#     bumps (morning and evening). A linear model on (sin, cos)
#     cannot draw two bumps; it needs harmonics -- sin(2*angle),
#     cos(2*angle) -- or one-hot hours.
#   - the interaction between cycles. "Saturday at 10am" is not the
#     sum of a Saturday effect and a 10am effect.

# HARMONICS, for a linear model that needs more than one bump:
for k in (1, 2, 3):
    f[f"hour_sin{k}"] = np.sin(2 * np.pi * k * f["hour"] / 24)
    f[f"hour_cos{k}"] = np.cos(2 * np.pi * k * f["hour"] / 24)
#
# k=1: one bump per day. k=2: two. k=3: three. Six columns give a
# linear model a smooth curve with up to three peaks -- a Fourier
# basis, which is the same idea as 2.6 applied to features. More
# harmonics, more flexibility, more overfitting; CV picks k.

# ONE-HOT AS THE ALTERNATIVE: 24 hour columns, or 7 weekday columns.
# No wrap problem (each is a separate coefficient), any shape, and
# for weekday it is usually the better choice -- seven categories is
# not many, and "Monday" is not smoothly related to "Tuesday" anyway.
# For hour, 24 columns is a lot; sin/cos with harmonics is smoother.
# For dayofyear, 365 columns is absurd; sin/cos is the only option.
`,
      hl: [18, 26, 44, 56],
      caption: "**One coordinate on a circle is ambiguous — hours 3 and 9 both have sine 0.707.** Both columns, always; a model given only sine cannot tell morning from afternoon."
    },

    { t: "table",
      head: ["Component", "Encoding", "For linear / distance", "For trees", "Note"],
      rows: [
        ["hour", "sin/cos (+ harmonics), or one-hot", "sin/cos with k = 2 harmonics for two daily peaks", "Raw integer is fine", "Check it is a real time, not 00:00 padding"],
        ["weekday", "**one-hot**", "7 columns, any shape", "Raw integer", "Days are categorical more than cyclical"],
        ["month", "sin/cos, or one-hot", "sin/cos for smooth seasonality; one-hot for 12 distinct effects", "Raw integer", "Fine either way at 12 levels"],
        ["day of year", "**sin/cos on year fraction**", "The only practical choice", "Raw integer or fraction", "Use the fraction so leap years wrap cleanly"],
        ["day of month", "Raw, or flags", "`is_month_start`, `is_month_end`, `is_payday`", "Raw", "Period varies; cyclical encoding is dubious"],
        ["year", "**Do not use as a category**", "Days since a fixed epoch, continuous", "Same", "Unseen years break a categorical; a trend extrapolates"],
        ["elapsed durations", "Raw or log", "Log for skewed tenure", "Raw", "Against an explicit `as_of`, never the wall clock"]
      ],
      caption: "**Weekday is categorical more than cyclical.** Seven levels is not many, and Tuesday is not \"between\" Monday and Wednesday in any sense a model needs — one-hot gives each day its own effect."
    },

    { t: "h2", n: "04", text: "Calendars, holidays and time zones", id: "calendar" },

    { t: "code", lang: "python", title: "the features a timestamp alone cannot give you", code: `
# HOLIDAYS: an external table. The date does not know it is one.
try:
    import holidays
    uk = holidays.country_holidays("GB", subdiv="ENG", years=range(2025, 2027))
except ImportError:
    uk = {pd.Timestamp("2025-12-25").date(): "Christmas", pd.Timestamp("2026-01-01").date(): "New Year"}

f["is_holiday"] = ts.dt.date.map(lambda d: d in uk).astype(int)
#
# AND THE DAYS AROUND IT, which often matter more:
hol_dates = pd.to_datetime(sorted(uk.keys()))
def days_to_nearest_holiday(t):
    d = (hol_dates - t.normalize())
    return int(np.abs(d.days).min())
f["days_to_holiday"] = ts.map(days_to_nearest_holiday)
f["holiday_week"] = (f["days_to_holiday"] <= 3).astype(int)
#
# Retail demand rises BEFORE Christmas and drops ON it. A single
# is_holiday flag misses the run-up. The distance feature sees it.

# BRIDGE DAYS: a Friday after a Thursday holiday is effectively a
# holiday. Computable from the table:
f["date"] = ts.dt.normalize()
f["is_bridge"] = (
    (f["weekday"] == 4) & f["date"].sub(pd.Timedelta(days=1)).dt.date.map(lambda d: d in uk)
    | (f["weekday"] == 0) & f["date"].add(pd.Timedelta(days=1)).dt.date.map(lambda d: d in uk)
).astype(int)

# BUSINESS DAYS: "3 business days since" is not "3 days since".
f["biz_days_since_month_start"] = [
    int(np.busday_count(d.replace(day=1).date(), d.date())) for d in f["date"]
]
#
# np.busday_count with a holidays= argument skips those too. A
# "days to deadline" feature in business days is a different number
# from calendar days, and the model should get the one the process
# runs on.

# PAYDAY AND MONTH-END EFFECTS -- domain rules:
f["is_last_working_day"] = (f["date"] == f["date"] + pd.offsets.BMonthEnd(0)).astype(int)
f["days_since_payday"] = ((f["day"] - 25) % f["days_in_month"])       # if payday is the 25th
#
# These are the "day of month" features that actually carry signal:
# not the integer 1-31, but the distance from the day the money
# arrives.

# TIME ZONES (see 4.4): the hour feature must be in the LOCAL zone of
# the event, not UTC. A UK customer at 09:00 and a Sydney customer at
# 09:00 are both "morning"; in UTC they are 09:00 and 22:00.
events_utc = pd.DataFrame({
    "ts_utc": pd.to_datetime(["2026-03-10 09:00", "2026-03-10 09:00"]).tz_localize("UTC"),
    "tz": ["Europe/London", "Australia/Sydney"],
})
events_utc["local_hour"] = [t.tz_convert(z).hour for t, z in zip(events_utc["ts_utc"], events_utc["tz"])]
events_utc["local_hour"].tolist()                          # [9, 20]
#
# Per-row zones need a per-row convert; a single tz_convert applies
# one zone to the column. Store UTC, keep the zone, compute local
# components at feature time.

# DST: the hour feature jumps on transition days. Usually ignorable;
# for hourly demand models, the 23-hour and 25-hour days are two
# rows a year that a robust model shrugs off and a fragile one
# overfits. Flag them if it matters:
f["is_dst_transition"] = 0   # from a zone's transition table, if needed

# WHAT DAY IS IT FOR THE BUSINESS: a "day" that runs 06:00 to 06:00
# (bars, logistics, gaming) means the calendar date of 02:00 is the
# PREVIOUS business day. Shift before extracting:
f["business_date"] = (ts - pd.Timedelta(hours=6)).dt.normalize()
`,
      hl: [14, 25, 40, 55],
      caption: "**Retail demand rises before Christmas and drops on it.** A single `is_holiday` flag misses the run-up; days-to-nearest-holiday sees it — and the date alone knows neither."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "A datetime transformer that is causal, fit-free and right at the year boundary",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Build the transformer that turns a timestamp column plus a per-entity reference table into features: calendar components with the right encoding for the consumer, cyclical hour and year-fraction, elapsed time against an explicit `as_of`, holiday distance, and a business-day count. It must be fit-free, causal, and correct across December-to-January. Then show which encoding each of a linear model and a tree prefers on a synthetic hourly demand series with two daily peaks and a weekly cycle." },
        { t: "p", text: "Include a feature that leaks — `days_until_next_event` — and a test that catches it." }
      ],
      requirements: [
        "Components, sin/cos for hour (with a second harmonic) and year-fraction, one-hot weekday, elapsed features against `as_of`.",
        "Fit-free: the transform of a row does not depend on other rows.",
        "Causal: a corruption test on future timestamps leaves earlier features unchanged.",
        "Year boundary: Dec 31 and Jan 1 are adjacent in the cyclical features; ISO week uses ISO year.",
        "Linear model needs harmonics for two peaks; tree is fine on raw hour — tested.",
        "A leak detector that flags any feature computed from timestamps after `as_of`."
      ],
      hint: "The two-peak intraday pattern is the test for harmonics: one sine-cosine pair fits a single bump and gets the morning rush wrong. The tree does not care.",
      solution: {
        lang: "python",
        title: "datetime_features.py",
        code: `import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import cross_val_score, KFold


HOLIDAYS = pd.to_datetime(["2025-12-25", "2025-12-26", "2026-01-01", "2026-04-03",
                           "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31",
                           "2026-12-25", "2026-12-28"])


def _cyc(v, period, harmonics=1):
    out = {}
    for k in range(1, harmonics + 1):
        a = 2 * np.pi * k * v / period
        out[f"sin{k}"], out[f"cos{k}"] = np.sin(a), np.cos(a)
    return out


def year_fraction(ts):
    start = pd.to_datetime(ts.dt.year.astype(str) + "-01-01")
    end = pd.to_datetime((ts.dt.year + 1).astype(str) + "-01-01")
    return (ts - start).dt.total_seconds() / (end - start).dt.total_seconds()


def datetime_features(ts, *, as_of, entity_ref=None, hour_harmonics=2):
    """Fit-free, causal datetime features.

    ts          a datetime Series (naive local time, or tz-aware)
    as_of       the reference instant; nothing after it is used
    entity_ref  optional frame aligned to ts with reference dates
                (signup, last_event) -- must be <= as_of to be causal
    """
    ts = pd.to_datetime(ts)
    if (ts > as_of).any():
        raise ValueError(f"{int((ts > as_of).sum())} timestamps are after as_of: "
                         "features would use the future")
    f = pd.DataFrame(index=ts.index)

    # --- components ---------------------------------------------------
    f["hour"] = ts.dt.hour
    f["weekday"] = ts.dt.dayofweek
    f["month"] = ts.dt.month
    f["is_weekend"] = (f["weekday"] >= 5).astype(int)
    f["is_month_end"] = ts.dt.is_month_end.astype(int)
    iso = ts.dt.isocalendar()
    f["iso_year"] = iso["year"].astype(int)
    f["iso_week"] = iso["week"].astype(int)

    # --- cyclical -------------------------------------------------------
    for k, v in _cyc(f["hour"], 24, hour_harmonics).items():
        f[f"hour_{k}"] = v
    yf = year_fraction(ts)
    for k, v in _cyc(yf, 1.0, 1).items():
        f[f"year_{k}"] = v

    # --- one-hot weekday ---------------------------------------------------
    for d in range(7):
        f[f"wd_{d}"] = (f["weekday"] == d).astype(int)

    # --- calendar -------------------------------------------------------------
    dates = ts.dt.normalize()
    f["is_holiday"] = dates.isin(HOLIDAYS).astype(int)
    f["days_to_holiday"] = dates.map(lambda d: int(np.abs((HOLIDAYS - d).days).min()))
    f["biz_days_into_month"] = [int(np.busday_count(d.replace(day=1).date(), d.date()))
                                for d in dates]

    # --- elapsed against as_of --------------------------------------------------
    f["hours_since_ts"] = (as_of - ts).dt.total_seconds() / 3600
    if entity_ref is not None:
        for col in entity_ref.columns:
            ref = pd.to_datetime(entity_ref[col])
            if (ref > as_of).any():
                raise ValueError(f"reference {col!r} has dates after as_of: a label, not a feature")
            f[f"days_since_{col}"] = (as_of - ref).dt.days
            f[f"{col}_missing"] = ref.isna().astype(int)
    return f


def leak_check(feature_fn, ts, as_of, cutoff_frac=0.5):
    """Corrupt every timestamp after the median; features for rows
    before it must be identical. Any that change used the future."""
    ts = pd.to_datetime(ts).sort_values().reset_index(drop=True)
    a = feature_fn(ts)
    cut = int(len(ts) * cutoff_frac)
    ts2 = ts.copy(); ts2.iloc[cut:] = ts2.iloc[cut:] + pd.Timedelta(days=400)
    ts2 = ts2.clip(upper=as_of)
    b = feature_fn(ts2)
    changed = [c for c in a.columns if not np.allclose(a[c].iloc[:cut].astype(float),
                                                        b[c].iloc[:cut].astype(float), equal_nan=True)]
    return changed


# =========================================================================
# THE DEMAND SERIES: two daily peaks + weekly cycle + holiday dip
# =========================================================================

def demand(n_days=120, seed=0):
    rng = np.random.default_rng(seed)
    ts = pd.Series(pd.date_range("2025-11-01", periods=n_days * 24, freq="h"))
    h = ts.dt.hour.to_numpy(); wd = ts.dt.dayofweek.to_numpy()
    intraday = 3 * np.exp(-((h - 8) / 2) ** 2) + 4 * np.exp(-((h - 18) / 2.5) ** 2)   # 8am and 6pm
    weekly = np.where(wd >= 5, -2.0, 0.0)
    hol = -3.0 * ts.dt.normalize().isin(HOLIDAYS).to_numpy()
    y = 10 + intraday + weekly + hol + rng.normal(0, 0.5, len(ts))
    return ts, y


def cv(model, X, y):
    return cross_val_score(model, X, y, cv=KFold(5, shuffle=True, random_state=0),
                           scoring="neg_mean_absolute_error").mean()


# =========================================================================
# TESTS
# =========================================================================

AS_OF = pd.Timestamp("2026-03-01")


def test_fit_free_row_independent():
    ts = pd.Series(pd.to_datetime(["2026-01-15 10:00", "2026-02-20 22:00"]))
    a = datetime_features(ts.iloc[[0]], as_of=AS_OF).iloc[0]
    b = datetime_features(ts, as_of=AS_OF).iloc[0]
    pd.testing.assert_series_equal(a, b, check_names=False)


def test_year_boundary_is_adjacent_on_the_circle():
    ts = pd.Series(pd.to_datetime(["2025-12-31 12:00", "2026-01-01 12:00", "2026-07-01 12:00"]))
    f = datetime_features(ts, as_of=AS_OF)
    d_adjacent = np.hypot(f.loc[0, "year_sin1"] - f.loc[1, "year_sin1"],
                          f.loc[0, "year_cos1"] - f.loc[1, "year_cos1"])
    d_far = np.hypot(f.loc[0, "year_sin1"] - f.loc[2, "year_sin1"],
                     f.loc[0, "year_cos1"] - f.loc[2, "year_cos1"])
    assert d_adjacent < 0.05 and d_far > 1.9


def test_midnight_is_adjacent_to_23():
    ts = pd.Series(pd.to_datetime(["2026-01-10 23:00", "2026-01-11 00:00", "2026-01-11 12:00"]))
    f = datetime_features(ts, as_of=AS_OF)
    near = np.hypot(f.loc[0, "hour_sin1"] - f.loc[1, "hour_sin1"], f.loc[0, "hour_cos1"] - f.loc[1, "hour_cos1"])
    far = np.hypot(f.loc[0, "hour_sin1"] - f.loc[2, "hour_sin1"], f.loc[0, "hour_cos1"] - f.loc[2, "hour_cos1"])
    assert near < 0.3 and far > 1.9


def test_iso_week_uses_iso_year():
    ts = pd.Series(pd.to_datetime(["2025-12-29", "2026-01-01"]))
    f = datetime_features(ts, as_of=AS_OF)
    assert f["iso_week"].tolist() == [1, 1]
    assert f["iso_year"].tolist() == [2026, 2026]


def test_holiday_distance():
    ts = pd.Series(pd.to_datetime(["2025-12-24 09:00", "2025-12-25 09:00", "2026-02-14 09:00"]))
    f = datetime_features(ts, as_of=AS_OF)
    assert f["days_to_holiday"].tolist()[:2] == [1, 0]
    assert f["is_holiday"].tolist() == [0, 1, 0]


def test_timestamp_after_as_of_is_rejected():
    ts = pd.Series(pd.to_datetime(["2026-03-02"]))
    try:
        datetime_features(ts, as_of=AS_OF)
        assert False, "should have raised"
    except ValueError as e:
        assert "after as_of" in str(e)


def test_reference_after_as_of_is_rejected_as_a_label():
    ts = pd.Series(pd.to_datetime(["2026-01-01"]))
    ref = pd.DataFrame({"next_event": pd.to_datetime(["2026-04-01"])})     # the future
    try:
        datetime_features(ts, as_of=AS_OF, entity_ref=ref)
        assert False, "should have raised"
    except ValueError as e:
        assert "label" in str(e)


def test_leak_check_passes_on_the_transformer():
    ts, _ = demand(60)
    changed = leak_check(lambda t: datetime_features(t, as_of=AS_OF), ts, AS_OF)
    assert changed == [], changed


def test_leak_check_catches_a_leaky_feature():
    ts, _ = demand(60)
    def leaky(t):
        f = datetime_features(t, as_of=AS_OF)
        f["hours_until_next"] = (t.shift(-1) - t).dt.total_seconds() / 3600     # the future
        return f
    changed = leak_check(leaky, ts, AS_OF)
    assert "hours_until_next" in changed


def test_linear_model_needs_harmonics_for_two_peaks():
    ts, y = demand()
    f1 = datetime_features(ts, as_of=AS_OF, hour_harmonics=1)
    f2 = datetime_features(ts, as_of=AS_OF, hour_harmonics=2)
    cols1 = [c for c in f1.columns if c.startswith(("hour_sin", "hour_cos", "wd_", "is_holiday"))]
    cols2 = [c for c in f2.columns if c.startswith(("hour_sin", "hour_cos", "wd_", "is_holiday"))]
    mae1 = -cv(Ridge(), f1[cols1], y)
    mae2 = -cv(Ridge(), f2[cols2], y)
    assert mae2 < mae1 * 0.8, (mae1, mae2)          # the second harmonic matters


def test_tree_is_fine_on_raw_hour():
    ts, y = demand()
    f = datetime_features(ts, as_of=AS_OF, hour_harmonics=2)
    raw = -cv(HistGradientBoostingRegressor(random_state=0), f[["hour", "weekday", "is_holiday"]], y)
    cyc = -cv(HistGradientBoostingRegressor(random_state=0),
              f[["hour_sin1", "hour_cos1", "hour_sin2", "hour_cos2", "weekday", "is_holiday"]], y)
    assert abs(raw - cyc) < 0.15, (raw, cyc)


def test_one_hot_weekday_sums_to_one():
    ts, _ = demand(10)
    f = datetime_features(ts, as_of=AS_OF)
    assert (f[[f"wd_{d}" for d in range(7)]].sum(axis=1) == 1).all()`,
        notes: [
          { t: "p", text: "**The transformer raises on any timestamp or reference date after `as_of`.** That one check turns a whole class of temporal leaks — `days_until_next_event`, `time_to_resolution` — into an immediate error at feature-build time, with the message naming the column as a label." },
          { t: "callout", kind: "insight", title: "The leak check is mechanical", body: [
            { t: "p", text: "Push every timestamp after the median 400 days into the future, recompute, and compare the features for the rows before the median. **Any column that changed used the future.** The honest transformer changes nothing; the planted `hours_until_next` is caught by name." },
            { t: "p", text: "It is the same corruption test as 4.3 and 5.6, applied to the whole feature frame at once." }
          ]},
          { t: "p", text: "**One harmonic fits one bump; the demand has two.** Ridge on a single sine-cosine pair gets the morning rush wrong and the MAE is 20% worse than with a second harmonic. The gradient booster on the raw hour matches the cyclical version to within noise — it splits at 7, 9, 17 and 19 on its own." },
          { t: "p", text: "**Year fraction, not day-of-year, is what makes 31 December adjacent to 1 January.** The distance between them on the circle is under 0.05 against 1.9 for a six-month gap, in a leap year or otherwise." },
          { t: "p", text: "**ISO week 1 of 2026 starts on 29 December 2025.** The test pins both `iso_week` and `iso_year`, because grouping by calendar year and ISO week puts the last days of December into a week that belongs to the next year." },
          { t: "p", text: "**Everything is fit-free, and the row-independence test proves it.** No quantile, no vocabulary, no statistic — a single row transforms identically alone or in a batch, which is what makes the transformer impossible to leak through and trivial to run in production." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A model receives `hour` as an integer 0–23. Which model type is harmed, and why?",
          options: [
            "Trees, because they cannot split on integers",
            "Linear and distance-based models — 23 and 0 are one hour apart but 23 units apart, so a slope or a distance reads midnight as the furthest point from 11 pm",
            "All models equally",
            "None; hour is fine as an integer"
          ],
          answer: 1,
          why: "A tree can express `hour >= 22 or hour <= 2` in two splits and is usually fine on the raw integer. A linear model fits one slope across the wrap and a KNN measures the wrap as the maximum distance. Sine and cosine of `2π·hour/24` put every adjacent hour the same distance apart, including 23 → 0."
        }
      ]
    }
  ],

  takeaways: [
    "**A timestamp is a bundle of features** — components, elapsed durations, calendar facts — and each is a separate hypothesis about what drives the outcome.",
    "**Elapsed-time features usually carry the most**: days since signup, hours since last event, days to contract end.",
    "**Every elapsed feature takes an explicit `as_of`, never `datetime.now()`** — the feature must reproduce and must match scoring time.",
    "**The causality test: could the value have been computed at `as_of` with only what was known then?** A contract end date, yes; a churn date, no.",
    "**Year as a categorical breaks on the first unseen year**; days since a fixed epoch is the continuous alternative.",
    "**ISO weeks belong to the year with the Thursday** — group by ISO year, or 29 December lands in week 1 of the wrong year.",
    "**Cyclical integers have a false discontinuity at the wrap**: sine and cosine put 23 next to 0 and December next to January.",
    "**Both coordinates, always** — hours 3 and 9 share a sine; one column cannot tell morning from afternoon.",
    "**One harmonic fits one bump per period; real intraday demand has two** — add `sin(2·angle), cos(2·angle)` for a linear model.",
    "**Trees do not need cyclical encoding** and can be worse with it; give them the raw integer and let CV decide.",
    "**Weekday is categorical more than cyclical** — seven one-hot columns give each day its own effect.",
    "**Holidays, bridge days, paydays and business-day counts need an external table**; the date alone knows none of them, and distance-to-holiday beats an on/off flag.",
    "**Hour must be in the event's local zone** — 09:00 in London and 09:00 in Sydney are both morning, and in UTC they are eleven hours apart."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why should an elapsed-time feature never be computed against `datetime.now()`?",
        options: [
          "It is slow",
          "The feature changes every time the code runs — training and scoring see different tenures, and a backfill next year ages every historical row — so it neither reproduces nor matches production",
          "Timezones make it wrong",
          "pandas does not support it"
        ],
        answer: 1,
        why: "An explicit `as_of` makes the feature a pure function of the data and the reference: the snapshot date in training, the scoring time in production, the historical date in a backfill. The transformer can then also reject any timestamp or reference after `as_of` as a label."
      },
      {
        stem: "Ridge on `(sin, cos)` of hour fits hourly demand with a morning and an evening peak poorly. What is missing?",
        options: [
          "More training data",
          "A second harmonic — one sine-cosine pair draws one smooth bump per day; `sin(2θ), cos(2θ)` lets the linear model draw two",
          "The raw hour integer",
          "Standardisation"
        ],
        answer: 1,
        why: "Sine and cosine of the base angle span a single sinusoid. Two peaks need the second harmonic; three need the third. It is a Fourier basis for the feature, and CV chooses how many terms. A tree finds both peaks on the raw integer without any of this."
      },
      {
        stem: "`days_to_contract_end` uses a date in the future. Is it a leak?",
        options: [
          "Yes — any future date is a leak",
          "No — the contract end date was known at `as_of` (it is in the contract), so it could have been computed at scoring time; `days_until_churn` uses a date that was not known, and that is the label",
          "Only if the contract has ended",
          "Only for tree models"
        ],
        answer: 1,
        why: "The test is not whether the date is after `as_of` but whether its value was known at `as_of`. A scheduled event is a feature; an outcome is a label. The transformer enforces the distinction by rejecting reference dates after `as_of` that were not known in advance."
      },
      {
        stem: "Why is `dayofyear` encoded via the year fraction rather than the integer 1–366?",
        options: [
          "Integers cannot be encoded cyclically",
          "The period changes in leap years — sin/cos of `day/365` puts 31 December slightly out of place in a leap year, while `(ts − year_start) / year_length` always wraps exactly to 1 January",
          "The fraction is faster to compute",
          "Trees require it"
        ],
        answer: 1,
        why: "A fixed period of 365.25 is approximately right; the exact year fraction is right by construction and costs one line. The test asserts 31 December and 1 January are within 0.05 on the circle while a six-month gap is near the diameter."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What features would you build from a timestamp column?",
        strong: "Three kinds. Calendar components — hour, weekday, month, holiday flags — each as a hypothesis about what drives the outcome, encoded for the consumer: sine-cosine for hour in a linear model, one-hot for weekday, raw integers for a tree. Elapsed durations against an explicit reference time — days since signup, hours since last event — which are usually the strongest. And calendar facts the date does not contain: distance to a holiday, business days into the month, payday proximity, from an external table. Everything computed at an `as_of`, never the wall clock.",
        answer: [
          { t: "p", text: "The three-kinds structure, plus 'never the wall clock', is the complete shape of the answer." }
        ]
      },
      {
        level: "advanced",
        q: "Explain cyclical encoding and when it is the wrong choice.",
        strong: "A cyclical integer — hour, month — has a false discontinuity at the wrap: 23 and 0 are adjacent in time and 23 apart as numbers. Mapping to sine and cosine of `2πv/P` puts the value on a circle where every adjacent pair is equidistant. Both columns are needed; one is ambiguous. It is wrong for trees, which split on thresholds and can express the wrap in two cuts, and it is insufficient on its own for a linear model when the pattern has more than one bump per cycle — that needs harmonics or one-hot. Weekday is better one-hot regardless: seven levels, and Tuesday is not 'between' Monday and Wednesday in any sense the model needs.",
        answer: [
          { t: "p", text: "Naming the two cases where it is wrong — trees, and multi-peak patterns — shows you have measured it rather than applied it by habit." }
        ]
      },
      {
        level: "advanced",
        q: "How do you make sure a datetime feature is causal?",
        strong: "Compute everything against an explicit `as_of`, reject any timestamp or reference date after it at build time, and then test it mechanically: push every timestamp after the median far into the future, recompute, and assert the features for the earlier rows are unchanged. Any column that moved used the future. `days_until_next_event` fails that test by name; `days_to_contract_end` passes because the contract date was known — the distinction is whether the value was knowable at scoring time, not whether it lies in the future.",
        answer: [
          { t: "p", text: "The corruption test is the same one used for windows and SQL features; knowing it generalises is the mark of understanding." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 4.4 — Time Series: Resampling and Offsets
   ========================================================================= */
EC.receiveLesson({
  id: "4.4",

  lede: "**A daily total is only right if you know which day each timestamp belongs to — and that depends on a timezone decision someone made, or failed to make.** Resampling is the mechanical part; the timezone, the bin edges and what to do with empty periods are the decisions that make the numbers mean something.",

  objectives: [
    "Build and manipulate a `DatetimeIndex` and read frequency strings",
    "Downsample with `resample` and choose the right aggregation per column",
    "Upsample and fill honestly, without inventing data",
    "Handle timezones so that a daily total is the day the business means",
    "Use offsets, periods and business-day logic for calendar arithmetic"
  ],

  prerequisites: ["4.1", "4.3"],

  blocks: [

    { t: "h2", n: "01", text: "Timestamps, frequencies and the index", id: "index" },

    { t: "p", text: "pandas time series rest on three types: **a `Timestamp` is an instant, a `Timedelta` is a duration, and a `Period` is a span** like \"March 2026\". Most confusion is a `Timestamp` being treated as a `Period` — a point in time standing in for a whole day." },

    { t: "dl", items: [
      ["`Timestamp`", "A single instant, to nanosecond precision, optionally with a timezone. `pd.Timestamp(\"2026-03-01 14:30\")`."],
      ["`DatetimeIndex`", "An index of Timestamps. Enables `.resample`, partial-string slicing (`df[\"2026-03\"]`), and the `.dt`-style accessors on the index itself."],
      ["`Timedelta`", "A duration — `pd.Timedelta(\"90min\")`. Subtracting two Timestamps gives one."],
      ["`Period`", "A span of time at a frequency: `pd.Period(\"2026-03\", freq=\"M\")` is the whole of March. A `PeriodIndex` is the honest index for monthly data."],
      ["Frequency string", "`\"D\"`, `\"h\"`, `\"15min\"`, `\"W-MON\"`, `\"MS\"`, `\"QE\"`, `\"B\"`. The alias grammar behind `date_range`, `resample` and `shift(freq=)`."],
      ["Offset", "A calendar-aware step: `pd.offsets.MonthEnd()`, `BusinessDay(3)`. Adding one to a Timestamp respects month lengths and weekends where a Timedelta does not."]
    ]},

    { t: "code", lang: "python", title: "building the index, and what it gives you", code: `
import pandas as pd
import numpy as np

# PARSING: to_datetime is the entry point, and format= is not optional
# on real data.
pd.to_datetime("2026-03-01")                    # ISO -- unambiguous
pd.to_datetime("01/03/2026")                    # 3 January? 1 March?
pd.to_datetime("01/03/2026", format="%d/%m/%Y") # 1 March, stated
pd.to_datetime("01/03/2026", dayfirst=True)     # the same, less precise
#
# Without format=, pandas GUESSES from the first value and applies the
# guess to the rest. On a column where 01/03 is followed by 13/03 it
# infers day-first from the 13 -- unless it saw 01/03 first and
# inferred month-first, in which case 13/03 raises or becomes NaT.
# State the format.

# errors= DECIDES WHAT A BAD VALUE DOES:
pd.to_datetime(["2026-01-01", "not a date"], errors="coerce")
# [2026-01-01, NaT]  -- silent, and then isna() finds it
pd.to_datetime(["2026-01-01", "not a date"], errors="raise")   # default

# THE INDEX:
idx = pd.date_range("2026-03-01", periods=5, freq="D")
idx = pd.date_range("2026-03-01", "2026-03-31", freq="D")     # inclusive
idx = pd.date_range("2026-03-01", periods=4, freq="W-MON")    # Mondays
idx = pd.date_range("2026-01-01", periods=4, freq="QE")       # quarter ends
idx = pd.date_range("2026-01-01", periods=4, freq="MS")       # month starts
#
# THE ALIASES CHANGED IN PANDAS 2.2: "H" -> "h", "M" -> "ME" (month
# end), "Q" -> "QE". The old ones warn. "MS" (month start) and "W"
# are unchanged.

df = pd.DataFrame({"v": range(31)},
                  index=pd.date_range("2026-03-01", periods=31, freq="D"))

# PARTIAL STRING SLICING -- the reason to keep dates in the index:
df["2026-03"]                       # the whole month
df["2026-03-10":"2026-03-15"]       # inclusive on both ends
df.loc["2026-03-10"]                # one day
#
# This works only on a DatetimeIndex. On a datetime COLUMN you write
# the comparison out:
flat = df.reset_index(names="ts")
flat[(flat["ts"] >= "2026-03-10") & (flat["ts"] <= "2026-03-15")]

# COMPONENTS -- on the index directly, or via .dt on a column:
df.index.dayofweek                  # 0 = Monday
df.index.is_month_end
df.index.to_period("M")             # PeriodIndex: 2026-03, 2026-03, ...
flat["ts"].dt.dayofweek
flat["ts"].dt.day_name()

# ARITHMETIC: Timedelta vs offset.
t = pd.Timestamp("2026-01-31")
t + pd.Timedelta(days=30)           # 2026-03-02 -- 30 days, mechanically
t + pd.offsets.MonthEnd(1)          # 2026-02-28 -- the NEXT month end
t + pd.offsets.MonthBegin(1)        # 2026-02-01
t + pd.offsets.BusinessDay(3)       # skips the weekend
t + pd.DateOffset(months=1)         # 2026-02-28 -- "same day next month",
                                    # clipped because Feb has no 31st
#
# "A month from now" has no fixed length. Timedelta cannot express it;
# DateOffset(months=1) can, and it handles the 31st -> 28th clipping
# the way a person would.

# CHECKS WORTH RUNNING ON ANY TIME INDEX:
df.index.is_monotonic_increasing    # sorted? resample and asof need it
df.index.is_unique                  # duplicates? they break reindexing
df.index.freq                       # inferred frequency, or None if irregular
pd.infer_freq(df.index)             # "D"
`,
      hl: [8, 27, 43, 66],
      caption: "**`to_datetime` without `format=` guesses from the first value and applies the guess to the rest.** On a `dd/mm` column that starts with `01/03`, the guess is month-first until it meets a 13 — and then it raises or produces NaT."
    },

    { t: "h2", n: "02", text: "Resampling", id: "resample" },

    { t: "p", text: "**`resample` is a groupby whose keys are time bins.** Downsampling — hourly to daily — aggregates; upsampling — daily to hourly — creates empty bins that you must decide how to fill. The second is where data gets invented." },

    { t: "viz",
      title: "Downsampling aggregates; upsampling creates gaps",
      caption: "Hourly readings resampled to daily produce one aggregated value per day. Daily values resampled to hourly produce one real value and 23 empty slots per day — what goes in them is a decision, not a default.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Hourly points collapsing into a daily bar, and a daily point expanding into hourly slots that are mostly empty">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">downsample — hourly → daily, .sum()</text>
  <g style="fill:var(--acc)">
    <circle cx="40" cy="60" r="4"/><circle cx="56" cy="54" r="4"/><circle cx="72" cy="66" r="4"/><circle cx="88" cy="58" r="4"/>
    <circle cx="104" cy="62" r="4"/><circle cx="120" cy="50" r="4"/><circle cx="136" cy="64" r="4"/><circle cx="152" cy="56" r="4"/>
  </g>
  <text x="40" y="90" class="s-sub" style="fill:var(--ink-3)">24 readings on 03-01</text>
  <line x1="170" y1="60" x2="230" y2="60" style="stroke:var(--ink-3);stroke-width:1.5" marker-end="url(#rs-a)"/>
  <rect x="240" y="44" width="70" height="32" rx="4" style="fill:var(--acc);fill-opacity:.25;stroke:var(--acc);stroke-width:1.5"/>
  <text x="256" y="65" class="s-sub" style="fill:var(--ink-2)">1 total</text>
  <text x="330" y="60" class="s-sub" style="fill:var(--ink-3)">every input contributes; the only decision is which aggregation</text>
  <text x="330" y="82" class="s-sub" style="fill:var(--ink-3)">— sum for counts, mean for rates, last for balances</text>

  <line x1="30" y1="118" x2="850" y2="118" style="stroke:var(--line);stroke-dasharray:3 3"/>

  <text x="30" y="148" class="s-label" style="fill:var(--ink-2)">upsample — daily → hourly</text>
  <rect x="30" y="166" width="70" height="32" rx="4" style="fill:var(--good);fill-opacity:.25;stroke:var(--good);stroke-width:1.5"/>
  <text x="48" y="187" class="s-sub" style="fill:var(--ink-2)">03-01</text>
  <line x1="110" y1="182" x2="170" y2="182" style="stroke:var(--ink-3);stroke-width:1.5" marker-end="url(#rs-a)"/>
  <g stroke-width="1.5">
    <rect x="180" y="166" width="26" height="32" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
    <rect x="206" y="166" width="26" height="32" style="fill:none;stroke:var(--line);stroke-dasharray:3 2"/>
    <rect x="232" y="166" width="26" height="32" style="fill:none;stroke:var(--line);stroke-dasharray:3 2"/>
    <rect x="258" y="166" width="26" height="32" style="fill:none;stroke:var(--line);stroke-dasharray:3 2"/>
    <rect x="284" y="166" width="26" height="32" style="fill:none;stroke:var(--line);stroke-dasharray:3 2"/>
    <rect x="310" y="166" width="26" height="32" style="fill:none;stroke:var(--line);stroke-dasharray:3 2"/>
  </g>
  <text x="346" y="187" class="s-sub" style="fill:var(--ink-3)">… 23 empty hours</text>
  <text x="30" y="232" class="s-sub" style="fill:var(--crit)">.ffill()      → the daily value repeated 24 times: a claim that it held all day</text>
  <text x="30" y="254" class="s-sub" style="fill:var(--crit)">.interpolate() → a smooth ramp between days: a claim about the shape of a curve nobody observed</text>
  <text x="30" y="276" class="s-sub" style="fill:var(--good)">.asfreq()     → NaN in the gaps: the only option that invents nothing</text>

  <defs><marker id="rs-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/></marker></defs>
</svg>`
    },

    { t: "code", lang: "python", title: "downsampling, per-column aggregation, and the bin edges", code: `
rng = np.random.default_rng(0)
hourly = pd.DataFrame({
    "sales": rng.poisson(5, 24 * 7),
    "price": 10 + rng.normal(0, 0.1, 24 * 7).cumsum(),
    "stock": 1000 - np.arange(24 * 7),
}, index=pd.date_range("2026-03-02", periods=24 * 7, freq="h"))   # a Monday

# DAILY TOTALS -- resample is a groupby on time bins:
hourly.resample("D").sum()                      # 7 rows
hourly["sales"].resample("D").sum()

# DIFFERENT COLUMNS NEED DIFFERENT AGGREGATIONS. .sum() on price is
# meaningless; .mean() on sales is a rate, not a total.
daily = hourly.resample("D").agg({
    "sales": "sum",          # a count: add them up
    "price": "mean",         # a level: average it
    "stock": "last",         # a balance: take the closing value
})
#
# The default -- everything summed -- produces a daily "price" of 240
# and a daily "stock" that is the sum of 24 declining balances. Both
# look like numbers. Both are nonsense. Aggregation is per column.

# OHLC IS BUILT IN, because it comes up constantly:
hourly["price"].resample("D").ohlc()            # open high low close

# WEEKLY, AND WHICH DAY THE WEEK ENDS:
hourly["sales"].resample("W").sum()             # weeks ending SUNDAY (default)
hourly["sales"].resample("W-MON").sum()         # weeks ending Monday
hourly["sales"].resample("W-SAT").sum()
#
# "W" alone means Sunday-anchored. A business that runs Monday to
# Sunday wants "W-SUN" (the same thing) -- but one that reports
# Saturday-to-Friday wants "W-FRI", and the default silently splits
# every one of their weeks in two.

# label= AND closed= DECIDE WHAT A BIN IS CALLED AND WHAT IT CONTAINS:
hourly["sales"].resample("D").sum().index[0]           # 2026-03-02
hourly["sales"].resample("D", label="right").sum().index[0]  # 2026-03-03
#
# label="left" (default for most freqs): the bin is named for its
# START. label="right": for its END. A daily total labelled 03-03
# under label="right" is the total FOR 03-02. Reports that
# mislabel by one day come from here.
#
# closed= is which edge is inclusive. For "D" the default is left:
# [00:00, 24:00). For "ME" and "W" it is right. A reading at exactly
# midnight goes into different days depending on closed=.

# EMPTY BINS APPEAR AS ZERO OR NaN DEPENDING ON THE AGGREGATION:
sparse = hourly["sales"].iloc[::48]             # every other day
sparse.resample("D").sum()                      # 0 on empty days
sparse.resample("D").mean()                     # NaN on empty days
sparse.resample("D").sum(min_count=1)           # NaN -- honest for sum too
#
# A zero that means "no data" and a zero that means "no sales" look
# identical. min_count=1 on sum makes the empty days NaN, and
# .count() alongside says how many readings each bin had.

# origin= FOR BINS THAT DO NOT START AT MIDNIGHT:
hourly["sales"].resample("D", origin="start_day", offset="6h").sum()
#
# A "day" that runs 06:00 to 06:00 -- shift work, or a business whose
# day closes at dawn. offset= moves every bin edge; the label follows.

# resample ON A COLUMN RATHER THAN THE INDEX:
flat = hourly.reset_index(names="ts")
flat.resample("D", on="ts")["sales"].sum()

# resample WITHIN GROUPS -- Grouper is the groupby form:
flat["store"] = np.where(np.arange(len(flat)) % 2, "a", "b")
flat.groupby(["store", pd.Grouper(key="ts", freq="D")])["sales"].sum()
#
# Or groupby then resample, which reads more naturally:
flat.set_index("ts").groupby("store")["sales"].resample("D").sum()
`,
      hl: [14, 25, 35, 47],
      caption: "**`.resample(\"D\").sum()` on every column produces a daily \"price\" of 240 and a \"stock\" that is the sum of 24 declining balances.** Aggregation is per column — sum for counts, mean for rates, last for balances."
    },

    { t: "callout", kind: "trap", title: "Which zero is it?", body: [
      { t: "p", text: "`resample(\"D\").sum()` gives 0 for a day with no readings and 0 for a day with readings that summed to zero. A report of daily sales cannot distinguish \"closed\" from \"open, sold nothing\" — and the two mean very different things to whoever reads it." },
      { t: "p", text: "**`sum(min_count=1)` returns NaN for empty bins**, and `.count()` alongside the total says how many readings each bin had. On a sparse series, always carry the count." },
      { t: "p", text: "The same distinction applies to `mean`, which returns NaN on an empty bin by default — so a frame with sum and mean columns can show `0` and `NaN` on the same row for the same reason, which is confusing until you know why." }
    ]},

    { t: "code", lang: "python", title: "upsampling, and what each fill claims", code: `
daily = pd.Series([100, 110, 90],
                  index=pd.date_range("2026-03-02", periods=3, freq="D"))

# asfreq -- THE HONEST UPSAMPLE. New slots are NaN.
daily.resample("6h").asfreq()
# 2026-03-02 00:00    100.0
# 2026-03-02 06:00      NaN
# 2026-03-02 12:00      NaN
# 2026-03-02 18:00      NaN
# 2026-03-03 00:00    110.0
# ...
#
# Nothing has been invented. The gaps are gaps.

# ffill -- "THE VALUE HELD UNTIL THE NEXT READING":
daily.resample("6h").ffill()
# 100 repeated four times, then 110 four times, then 90.
#
# Correct for a STATE: a price that stayed in force, a configuration
# that was active, a stock level between counts. Wrong for a FLOW:
# a daily sales total does not happen four times at six-hour spacing.

# bfill -- the same, using the NEXT value. Leakage in a feature.

# interpolate -- "IT MOVED SMOOTHLY BETWEEN READINGS":
daily.resample("6h").interpolate()
# 100, 102.5, 105, 107.5, 110, 105, 100, 95, 90
#
# A claim about the shape of a curve nobody observed. Reasonable for
# a slowly-varying physical quantity sampled too rarely; wrong for
# anything that jumps, and wrong as a feature because every
# interpolated value uses the FUTURE reading.

# THE FLOW CASE -- spreading a total across sub-periods:
daily.resample("6h").ffill() / 4
#
# "Daily sales, assumed evenly spread across four six-hour blocks."
# This IS sometimes what a model needs. It is an assumption, so it
# goes in a comment, not a default.

# DOWN THEN UP: a common mistake is resampling to a coarser frequency
# and then back, and expecting the original.
hourly_v = pd.Series(range(48), index=pd.date_range("2026-03-02", periods=48, freq="h"))
hourly_v.resample("D").mean().resample("h").ffill()
#
# 24 copies of each daily mean. The hourly variation is gone and
# cannot be recovered. Resampling down is lossy; up does not restore.

# reindex IS THE GENERAL FORM -- align to ANY index, not just a
# frequency:
target = pd.date_range("2026-03-01", "2026-03-05", freq="D")
daily.reindex(target)                    # NaN on 03-01 and 03-05
daily.reindex(target, method="ffill")    # 03-05 gets 90; 03-01 stays NaN
daily.reindex(target, fill_value=0)      # a claim, again
#
# reindex with method="nearest" or tolerance= is the alignment tool
# for joining two series sampled at different times:
daily.reindex(target, method="nearest", tolerance=pd.Timedelta("12h"))
`,
      hl: [5, 15, 26, 46],
      caption: "**`asfreq` invents nothing; every other fill is a claim.** `ffill` claims the value held; `interpolate` claims a smooth curve; a divided `ffill` claims an even spread. Each is sometimes right, and none is a default."
    },

    { t: "h2", n: "03", text: "Timezones", id: "tz" },

    { t: "p", text: "**A naive timestamp — one without a timezone — is not \"in UTC\". It is in whatever zone the writer assumed, and that assumption is gone.** Every daily total from timestamps in the wrong zone is a total for the wrong day, and the error is largest exactly at the day boundary where it moves the most revenue." },

    { t: "code", lang: "python", title: "localise, convert, and the daily total that was wrong", code: `
# NAIVE vs AWARE:
naive = pd.Timestamp("2026-03-29 01:30")
naive.tz                                  # None -- no zone at all
aware = pd.Timestamp("2026-03-29 01:30", tz="Europe/London")
aware.tz                                  # <DstTzInfo 'Europe/London'>

# TWO OPERATIONS, OFTEN CONFUSED:
naive.tz_localize("Europe/London")        # ATTACH a zone: "this WAS London time"
aware.tz_convert("UTC")                   # TRANSLATE: the same instant, in UTC
#
# tz_localize says what the naive stamp MEANT. tz_convert changes how
# an aware stamp is DISPLAYED. Localising an already-aware stamp
# raises; converting a naive one raises. The errors are the guard.

# THE DAILY-TOTAL FAILURE, concretely:
events = pd.DataFrame({
    "amount": [100, 200, 300],
    "ts": pd.to_datetime(["2026-06-01 23:30", "2026-06-02 00:30",
                          "2026-06-02 23:45"]),          # NAIVE, from a DB in UTC
})

# Summed by naive day -- the UTC day:
events.set_index("ts")["amount"].resample("D").sum()
# 2026-06-01    100
# 2026-06-02    500

# The business is in London (UTC+1 in June). 23:30 UTC on 06-01 is
# 00:30 on 06-02 LOCAL. The first sale belongs to the second day:
local = events.set_index("ts").tz_localize("UTC").tz_convert("Europe/London")
local["amount"].resample("D").sum()
# 2026-06-02    600      <- ALL THREE are on 06-02 local
#
# The naive version put 100 on the wrong day. On a real day's data
# the misassigned revenue is everything in the hour(s) either side of
# midnight -- which for a retailer is not small.

# THE RULE:
#   1. Store and compute in UTC.
#   2. Localise on the way in (from whatever zone the source used).
#   3. Convert to the business zone ONLY for bin edges and display.

# DST: the hour that does not exist and the hour that happens twice.
try:
    pd.Timestamp("2026-03-29 01:30").tz_localize("Europe/London")
except Exception as e:
    print(type(e).__name__)   # NonExistentTimeError -- clocks skipped 01:00-02:00
#
pd.Timestamp("2026-03-29 01:30").tz_localize("Europe/London", nonexistent="shift_forward")
#
try:
    pd.Timestamp("2026-10-25 01:30").tz_localize("Europe/London")
except Exception as e:
    print(type(e).__name__)   # AmbiguousTimeError -- 01:30 happened twice
#
pd.Timestamp("2026-10-25 01:30").tz_localize("Europe/London", ambiguous=True)   # DST side
pd.Timestamp("2026-10-25 01:30").tz_localize("Europe/London", ambiguous=False)  # standard side
#
# ON A SERIES, ambiguous="infer" resolves the repeated hour by ORDER
# -- which works only if the data is sorted and has both occurrences.
# ambiguous="NaT" marks them missing, which is honest when you cannot
# tell.

# A "DAY" IS 23 OR 25 HOURS ON DST TRANSITION DATES:
idx = pd.date_range("2026-03-28", periods=3, freq="D", tz="Europe/London")
np.diff(idx.asi8) / 3.6e12               # [24., 23.] hours
#
# resample("D") on an aware index handles this. A daily total built
# from resample("24h") does not -- it drifts an hour at every
# transition and never recovers.

# MIXED ZONES IN ONE COLUMN become object dtype and lose every
# datetime method:
mixed = pd.Series([pd.Timestamp("2026-01-01", tz="UTC"),
                   pd.Timestamp("2026-01-01", tz="US/Eastern")])
mixed.dtype                               # object
#
# Convert everything to one zone (UTC) before combining.

# utc=True IN to_datetime -- parse and convert in one step:
pd.to_datetime(["2026-01-01T09:00+01:00", "2026-01-01T09:00Z"], utc=True)
# both in UTC: 08:00 and 09:00

# THE CHECK: an aware index that is not UTC should be a deliberate
# choice for display; internal frames should be UTC.
assert local.index.tz is not None, "naive datetime index -- zone unknown"
`,
      hl: [8, 24, 36, 61],
      caption: "**`tz_localize` says what a naive timestamp meant; `tz_convert` changes how an aware one is displayed.** Localising an aware stamp raises, converting a naive one raises — the errors are the guard against confusing them."
    },

    { t: "table",
      head: ["Frequency", "Meaning", "Bin label default", "Note"],
      rows: [
        ["`\"D\"`", "Calendar day", "left (start)", "23 or 25 hours on DST dates with an aware index"],
        ["`\"B\"`", "Business day", "left", "Weekends skipped; no holiday calendar unless you supply one"],
        ["`\"W\"` / `\"W-SUN\"`", "Week ending Sunday", "right (end)", "`\"W-FRI\"` etc. for other anchors"],
        ["`\"MS\"` / `\"ME\"`", "Month start / end", "left / right", "`\"M\"` is deprecated for `\"ME\"`"],
        ["`\"QS\"` / `\"QE\"`", "Quarter start / end", "left / right", "`\"QE-JAN\"` for a fiscal year ending January"],
        ["`\"h\"`, `\"15min\"`, `\"s\"`", "Sub-daily", "left", "`\"H\"` and `\"T\"` are deprecated aliases"],
        ["`\"24h\"`", "Exactly 24 hours", "left", "**Not a day** — drifts across DST transitions"]
      ],
      caption: "**`\"24h\"` is not `\"D\"`.** On an aware index, a calendar day is 23 or 25 hours twice a year, and a 24-hour bin drifts by an hour at each transition and never recovers."
    },

    { t: "code", lang: "python", title: "Business days, and a calendar that knows your holidays",
      code: `print(len(pd.bdate_range("2025-12-22", "2026-01-02")))            # 10: weekends dropped, holidays not
print(len(pd.date_range("2025-12-22", "2026-01-02", freq="B")))    # 10: the same thing as a frequency

from pandas.tseries.offsets import CustomBusinessDay
uk = CustomBusinessDay(holidays=["2025-12-25", "2025-12-26", "2026-01-01"])
print(len(pd.date_range("2025-12-22", "2026-01-02", freq=uk)))     # 7
print(pd.Timestamp("2025-12-24") + 2 * uk)                          # 2025-12-30: two working days later
# resample("B") and a rolling window over a business-day index treat weekends as absent, not as zeros`,
      caption: "`bdate_range` and `freq=\"B\"` know about weekends and nothing else. Holidays are a calendar you supply, and `CustomBusinessDay` makes that calendar the unit of date arithmetic."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "The daily revenue report that is wrong twice a year and slightly wrong every day",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A daily revenue report for a UK retailer disagrees with the till system by a small amount every day, and by a large amount on two specific days each year. Transactions come from a database that stores timestamps in UTC without a zone marker." },
        { t: "code", lang: "python", numbered: false, title: "daily_revenue.py", code: `
import pandas as pd

def daily_revenue(tx):
    # tx: columns [ts, amount, store]; ts is a naive datetime (UTC)
    df = tx.set_index("ts").sort_index()
    daily = df["amount"].resample("24h").sum()
    weekly = daily.resample("W").sum()
    return daily, weekly`},
        { t: "p", text: "Explain both symptoms, fix the function, and add the checks that make a timezone mistake impossible to ship silently." }
      ],
      requirements: [
        "Explain the small daily error and the large twice-yearly error separately.",
        "Fix with explicit localisation and conversion.",
        "Use a calendar-day bin, not a 24-hour one.",
        "Make the week end on the day the business uses (Saturday-to-Friday).",
        "Report empty days honestly and carry a transaction count.",
        "Include tests, including a DST transition and a midnight-straddling sale."
      ],
      hint: "The small error is every transaction between 23:00 and 00:00 UTC in summer. The large error is a 23-hour and a 25-hour day. Both come from the same missing line.",
      solution: {
        lang: "python",
        title: "daily_revenue_fixed.py",
        code: `import pandas as pd
import numpy as np


BUSINESS_TZ = "Europe/London"
WEEK_ANCHOR = "W-FRI"          # weeks end Friday: Saturday-to-Friday


# =========================================================================
# THE TWO SYMPTOMS
# =========================================================================
#
# SMALL, EVERY DAY (in summer):
#   The timestamps are UTC. The business is in London, which is UTC+1
#   from late March to late October. Every transaction between 23:00
#   and 00:00 UTC is between 00:00 and 01:00 LOCAL -- the NEXT day.
#   resample on the naive index bins by UTC day and puts that hour's
#   revenue on the wrong day. In winter (UTC+0) it vanishes, which
#   is why it looks intermittent.
#
# LARGE, TWICE A YEAR:
#   resample("24h") makes bins of exactly 24 hours. On the DST
#   transition days a local calendar day is 23 or 25 hours. Even with
#   a correct zone, "24h" bins drift by an hour at the spring
#   transition and by another at autumn, and they never re-align.
#   Every day after March is offset by an hour; after October by
#   two -- and the transition days themselves are wildly wrong.
#
#   The fix for both is the same two lines: localise, and use "D".
#
# AND THE WEEK:
#   resample("W") ends weeks on SUNDAY. The business runs
#   Saturday-to-Friday. Every weekly figure straddles two business
#   weeks.


def demonstrate():
    tx = pd.DataFrame({
        "ts": pd.to_datetime(["2026-06-01 23:30", "2026-06-02 00:30"]),
        "amount": [100.0, 200.0],
    })
    naive = tx.set_index("ts")["amount"].resample("24h").sum()
    # 06-01: 100, 06-02: 200   <- but 23:30 UTC is 00:30 local on 06-02
    return naive


# =========================================================================
# THE FIX
# =========================================================================

def daily_revenue(tx, *, tz=BUSINESS_TZ, source_tz="UTC", week=WEEK_ANCHOR):
    """Daily and weekly revenue in the business's calendar.

    tx.ts is expected NAIVE, in source_tz. If it arrives aware, it is
    converted; the source_tz argument is then ignored.
    """
    df = tx.copy()
    df["ts"] = pd.to_datetime(df["ts"])

    if df["ts"].isna().any():
        raise ValueError(f"{df['ts'].isna().sum()} unparseable timestamps")

    # STEP 1: MAKE THE ZONE EXPLICIT. A naive stamp is a stamp whose
    # zone the writer forgot to tell us; we are told it is UTC, so we
    # say so. If it is already aware we leave it alone.
    if df["ts"].dt.tz is None:
        df["ts"] = df["ts"].dt.tz_localize(source_tz)

    # STEP 2: CONVERT TO THE BUSINESS ZONE. Now "day" means the
    # business's day, and resample("D") handles 23- and 25-hour days.
    df["ts"] = df["ts"].dt.tz_convert(tz)
    df = df.set_index("ts").sort_index()

    # STEP 3: CALENDAR DAYS, NOT 24-HOUR BLOCKS.
    daily = df["amount"].resample("D").agg(["sum", "count"])
    daily.columns = ["revenue", "transactions"]

    # STEP 4: EMPTY DAYS ARE NaN REVENUE, NOT ZERO. A day the shop
    # was closed and a day with no sales are different claims, and
    # the count column says which.
    daily.loc[daily["transactions"] == 0, "revenue"] = np.nan

    # STEP 5: THE BUSINESS WEEK.
    weekly = daily["revenue"].resample(week).sum(min_count=1).to_frame("revenue")
    weekly["transactions"] = daily["transactions"].resample(week).sum()
    weekly["days_with_sales"] = daily["revenue"].resample(week).count()

    # RECONCILE: every penny in, every penny out.
    total_in = float(tx["amount"].sum())
    total_daily = float(daily["revenue"].sum())
    if not np.isclose(total_in, total_daily):
        raise AssertionError(f"daily total {total_daily} != input {total_in}")

    return daily, weekly


# =========================================================================
# TESTS
# =========================================================================

def _tx(stamps, amounts):
    return pd.DataFrame({"ts": pd.to_datetime(stamps), "amount": amounts})


def test_midnight_straddling_sale_lands_on_the_local_day():
    """23:30 UTC in June is 00:30 London on the next day."""
    tx = _tx(["2026-06-01 23:30", "2026-06-02 00:30"], [100.0, 200.0])
    daily, _ = daily_revenue(tx)

    assert pd.isna(daily.loc["2026-06-01", "revenue"])       # nothing local on 06-01
    assert daily.loc["2026-06-02", "revenue"] == 300.0


def test_winter_has_no_offset():
    """In January London is UTC, so the same stamps stay on their day."""
    tx = _tx(["2026-01-05 23:30", "2026-01-06 00:30"], [100.0, 200.0])
    daily, _ = daily_revenue(tx)

    assert daily.loc["2026-01-05", "revenue"] == 100.0
    assert daily.loc["2026-01-06", "revenue"] == 200.0


def test_the_original_puts_it_on_the_wrong_day():
    naive = demonstrate()
    assert naive.iloc[0] == 100.0          # on 06-01, wrongly


def test_spring_transition_day_is_23_hours_and_still_one_day():
    """2026-03-29: clocks go forward at 01:00 UTC. Sales at 00:30 UTC
    and 23:30 UTC are both on 03-29 local, and the day is 23h long."""
    tx = _tx(["2026-03-29 00:30", "2026-03-29 22:30"], [10.0, 20.0])
    daily, _ = daily_revenue(tx)

    assert daily.loc["2026-03-29", "revenue"] == 30.0
    assert len(daily) == 1


def test_autumn_transition_day_is_25_hours():
    """2026-10-25: clocks go back at 01:00 UTC. 00:30 UTC is 01:30 BST;
    01:30 UTC is 01:30 GMT -- the repeated hour. Both are 10-25 local."""
    tx = _tx(["2026-10-25 00:30", "2026-10-25 01:30", "2026-10-25 23:30"],
             [1.0, 2.0, 4.0])
    daily, _ = daily_revenue(tx)

    assert daily.loc["2026-10-25", "revenue"] == 7.0


def test_24h_bins_drift_after_dst():
    """The original's second symptom, demonstrated."""
    stamps = pd.date_range("2026-03-27 12:00", "2026-04-02 12:00", freq="12h")
    tx = pd.DataFrame({"ts": stamps, "amount": 1.0})

    local = (tx.set_index("ts").tz_localize("UTC").tz_convert(BUSINESS_TZ))
    by_day = local["amount"].resample("D").sum()
    by_24h = local["amount"].resample("24h").sum()

    assert not by_day.index.equals(by_24h.index)     # bins have drifted


def test_week_ends_friday():
    tx = _tx(["2026-06-05 12:00",      # Friday
              "2026-06-06 12:00"],     # Saturday -- next business week
             [100.0, 200.0])
    _, weekly = daily_revenue(tx)

    assert len(weekly) == 2
    assert weekly.iloc[0]["revenue"] == 100.0
    assert weekly.iloc[1]["revenue"] == 200.0


def test_empty_day_is_nan_not_zero():
    tx = _tx(["2026-06-01 12:00", "2026-06-03 12:00"], [50.0, 60.0])
    daily, _ = daily_revenue(tx)

    assert pd.isna(daily.loc["2026-06-02", "revenue"])
    assert daily.loc["2026-06-02", "transactions"] == 0


def test_totals_reconcile():
    rng = np.random.default_rng(0)
    stamps = pd.date_range("2026-03-20", "2026-04-10", freq="37min")
    tx = pd.DataFrame({"ts": stamps, "amount": rng.uniform(1, 50, len(stamps))})
    daily, weekly = daily_revenue(tx)

    assert np.isclose(daily["revenue"].sum(), tx["amount"].sum())
    assert np.isclose(weekly["revenue"].sum(), tx["amount"].sum())


def test_aware_input_is_accepted():
    tx = _tx(["2026-06-01 23:30"], [100.0])
    tx["ts"] = tx["ts"].dt.tz_localize("UTC")
    daily, _ = daily_revenue(tx)

    assert daily.loc["2026-06-02", "revenue"] == 100.0


def test_bad_timestamp_raises():
    tx = pd.DataFrame({"ts": ["2026-06-01 12:00", "nonsense"], "amount": [1.0, 2.0]})
    tx["ts"] = pd.to_datetime(tx["ts"], errors="coerce")

    try:
        daily_revenue(tx)
        assert False, "should have raised"
    except ValueError as e:
        assert "unparseable" in str(e)`,
        notes: [
          { t: "p", text: "**Both symptoms come from the same missing line.** Localising the UTC stamps and converting to the business zone fixes the midnight hour in summer and, combined with `\"D\"` instead of `\"24h\"`, fixes the DST days — because a calendar day on an aware index is allowed to be 23 or 25 hours long." },
          { t: "callout", kind: "trap", title: "\"24h\" drifts and never recovers", body: [
            { t: "p", text: "A 24-hour bin is exactly 24 hours. After the spring transition every bin starts an hour late relative to the calendar; after autumn, two hours. **The transition days are wildly wrong and every day after them is slightly wrong, permanently.**" },
            { t: "p", text: "`resample(\"D\")` on an aware index knows that 29 March 2026 is 23 hours long, and bins accordingly. The test that compares the two bin indexes is the one that shows the drift." }
          ]},
          { t: "p", text: "**The autumn test has a timestamp in the repeated hour.** 00:30 UTC and 01:30 UTC are both 01:30 London time on 25 October — one BST, one GMT. Converting from UTC resolves it unambiguously, which is the reason to store in UTC in the first place." },
          { t: "p", text: "**`\"W\"` ends weeks on Sunday, and this business ends them on Friday.** Every weekly figure under the default straddles two business weeks. The anchor is a fact about the business and belongs in a named constant, not a default nobody chose." },
          { t: "p", text: "**An empty day is NaN revenue with a transaction count of 0.** \"Closed\" and \"open, sold nothing\" are different claims, and the count column is what lets a reader tell them apart." },
          { t: "p", text: "**The reconciliation is the guard against every future variant.** Every penny that goes in must appear in a daily bin; if the zone handling, the bin edges or the week anchor ever drop or double a transaction, the assertion fires." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Transactions are stored as naive UTC timestamps. Summing by `resample(\"D\")` gives daily totals for which day?",
          options: [
            "The business's local day",
            "The UTC day — every sale between local midnight and UTC midnight lands on the wrong date",
            "It depends on the server's clock",
            "It raises because the index is naive"
          ],
          answer: 1,
          why: "A naive index is binned as-is, and as-is means UTC. In British Summer Time the hour from 23:00 to 00:00 UTC is 00:00 to 01:00 local — the next day. `tz_localize(\"UTC\").tz_convert(\"Europe/London\")` before resampling puts every sale on the day the till thinks it happened."
        }
      ]
    }
  ],

  takeaways: [
    "**A `Timestamp` is an instant, a `Timedelta` is a duration, a `Period` is a span** — most confusion is a Timestamp standing in for a Period.",
    "**`to_datetime` without `format=` guesses from the first value**; on `dd/mm` data the guess can be wrong until it meets a 13.",
    "**Partial-string slicing (`df[\"2026-03\"]`) works only on a `DatetimeIndex`** — one reason to keep dates in the index.",
    "**`Timedelta(days=30)` is thirty days; `DateOffset(months=1)` is a month** — only the second knows that February is short.",
    "**`resample` is a groupby on time bins**; aggregation is per column — sum for counts, mean for rates, last for balances.",
    "**`resample(\"D\").sum()` returns 0 for empty bins**, indistinguishable from a real zero; `sum(min_count=1)` and a `count` column make the difference visible.",
    "**`label=` names a bin for its start or end** — a report mislabelled by one day usually comes from here.",
    "**`asfreq` is the only upsample that invents nothing**; `ffill` claims the value held, `interpolate` claims a smooth curve.",
    "**Resampling down is lossy and resampling back up does not restore it.**",
    "**A naive timestamp is not \"in UTC\"** — it is in whatever zone the writer assumed, and the assumption is gone.",
    "**`tz_localize` says what a naive stamp meant; `tz_convert` changes how an aware stamp is displayed** — and each raises on the other's input.",
    "**`\"24h\"` is not `\"D\"`**: a calendar day on an aware index is 23 or 25 hours twice a year, and a 24-hour bin drifts at each transition and never recovers."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is the difference between `tz_localize` and `tz_convert`?",
        options: [
          "They are aliases",
          "`tz_localize` attaches a zone to a naive stamp, stating what it meant; `tz_convert` translates an aware stamp to another zone, keeping the instant",
          "`tz_localize` is for Series and `tz_convert` for DataFrames",
          "`tz_convert` only works with UTC"
        ],
        answer: 1,
        why: "Localising says \"this naive value was London time\"; converting says \"show this instant in New York\". Localising an already-aware stamp raises and converting a naive one raises — the errors are what stop the two being confused."
      },
      {
        stem: "A daily report uses `resample(\"24h\")` on a timezone-aware index. What happens at a DST transition?",
        options: [
          "Nothing — 24 hours is a day",
          "The bins drift by an hour at each transition and never realign, because a calendar day is 23 or 25 hours on those dates",
          "It raises an AmbiguousTimeError",
          "The transition day is dropped"
        ],
        answer: 1,
        why: "`\"24h\"` is a fixed duration; `\"D\"` is a calendar day. On an aware index `resample(\"D\")` knows the spring day is 23 hours and bins correctly. The 24-hour version is wrong on the transition day and offset by an hour on every day after it."
      },
      {
        stem: "`hourly.resample(\"D\").sum()` on a frame with `sales`, `price` and `stock` columns. What is wrong?",
        options: [
          "Nothing — sum is the default",
          "Every column is summed: daily \"price\" becomes 24 prices added together and \"stock\" the sum of 24 balances — aggregation must be chosen per column",
          "resample cannot handle multiple columns",
          "It should be mean for everything"
        ],
        answer: 1,
        why: "Sum is right for a count, mean for a level, last for a balance. `resample(\"D\").agg({\"sales\": \"sum\", \"price\": \"mean\", \"stock\": \"last\"})` says which is which. The default produces numbers that look plausible and mean nothing."
      },
      {
        stem: "Which upsampling fill invents no data?",
        options: [
          "`ffill`",
          "`asfreq` — new slots are NaN; every other fill is a claim about values nobody observed",
          "`interpolate`",
          "`bfill`"
        ],
        answer: 1,
        why: "`ffill` claims the value held until the next reading — right for a state, wrong for a flow. `interpolate` claims a smooth curve and uses the future reading. `asfreq` leaves the gaps as gaps, which is the honest starting point before deciding what a gap means."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between downsampling and upsampling, and which is dangerous?",
        strong: "Downsampling aggregates finer data into coarser bins — hourly to daily — and the only decision is the aggregation per column. Upsampling creates bins the data never had, and every fill is a claim: `ffill` says the value held, `interpolate` says it moved smoothly, and only `asfreq` invents nothing. Upsampling is where data gets manufactured, and a fill that uses the next value is leakage in a feature.",
        answer: [
          { t: "p", text: "Framing each fill as a claim about the world is the insight; it turns a method choice into a modelling decision." }
        ]
      },
      {
        level: "advanced",
        q: "A daily total disagrees with the source system by a small amount every day. What would you check first?",
        strong: "Timezones. If the timestamps are naive UTC and the business is somewhere else, every transaction in the hour between local midnight and UTC midnight lands on the wrong day. I would localise to UTC, convert to the business zone, and resample on `\"D\"` — not `\"24h\"`, which drifts at DST transitions. Then a reconciliation: input total equals the sum of the daily bins, always.",
        answer: [
          { t: "p", text: "Reasoning from the symptom's pattern — small, daily, worse in summer — to the zone offset is what shows experience." },
          { t: "p", text: "Naming `\"24h\"` as a separate trap preempts the follow-up question." }
        ]
      },
      {
        level: "advanced",
        q: "How would you handle timestamps in the repeated hour at the end of daylight saving?",
        strong: "By not having naive timestamps in that hour in the first place. If the source stores UTC, converting to local resolves the ambiguity exactly — 00:30 UTC and 01:30 UTC are different instants that both display as 01:30 local. If the source is naive local time, `ambiguous=\"infer\"` works only on sorted data with both occurrences present; `ambiguous=\"NaT\"` is the honest choice when you genuinely cannot tell.",
        answer: [
          { t: "p", text: "Leading with \"store UTC so the problem does not arise\" is the senior answer; the `ambiguous=` options are the fallback for data you did not design." }
        ]
      }
    ]
  }
});

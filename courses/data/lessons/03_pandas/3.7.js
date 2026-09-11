/* ============================================================================
   LESSON 3.7 — Duplicates, Ranking and Counting
   ========================================================================= */
EC.receiveLesson({
  id: "3.7",

  lede: "**`value_counts`, `duplicated`, `rank` and `nunique` are the four operations every profiling script is built from, and each has an edge that produces a wrong number without an error.** Ties in `rank`, missing values in `nunique`, and the `keep` argument in `duplicated` are where the surprises live.",

  objectives: [
    "Use `value_counts` with its normalisation, binning and missing-value options",
    "Detect duplicates on a subset of columns and control which copy survives",
    "Choose a tie-breaking method for `rank` and say what each does to the result",
    "Compute cumulative and running statistics without a loop",
    "Distinguish `nunique`, `unique` and `len(set(...))` when missing values are present"
  ],

  prerequisites: ["3.4"],

  blocks: [

    { t: "h2", n: "01", text: "Counting values", id: "counting" },

    { t: "p", text: "**`value_counts` is a groupby-size in disguise, sorted descending, with missing values excluded.** Each of those three defaults is worth knowing, because each one changes a number." },

    { t: "dl", items: [
      ["`value_counts()`", "Frequency of each distinct value, sorted by count descending. Excludes missing values unless `dropna=False`."],
      ["`normalize=True`", "Proportions rather than counts. **Computed over the non-missing rows**, so the proportions of a column with 40% missing sum to 1 over the other 60%."],
      ["`nunique()`", "Number of distinct values, **excluding missing**. `len(s.unique())` includes it. The two disagree by exactly one when there is a missing value."],
      ["`duplicated()`", "Boolean mask marking rows that repeat an earlier row. `keep=` controls which occurrence is *not* marked."],
      ["`rank()`", "Position in sorted order. Ties are averaged by default, which produces fractional ranks and is rarely what a leaderboard wants."],
      ["Cardinality ratio", "`nunique() / len()`. Near 0 is a category; near 1 is an identifier; and either extreme changes what the column is good for."]
    ]},

    { t: "code", lang: "python", title: "value_counts, and the defaults that change the answer", code: `
import pandas as pd
import numpy as np

s = pd.Series(["a", "b", "a", None, "c", "a", None])

s.value_counts()
# a    3
# b    1
# c    1
#              <- two Nones, NOT SHOWN

s.value_counts(dropna=False)
# a      3
# NaN    2
# b      1
# c      1

# normalize DIVIDES BY THE NON-MISSING COUNT:
s.value_counts(normalize=True)
# a    0.6     <- 3 of 5, not 3 of 7
# b    0.2
# c    0.2
#
# A report saying "60% of customers chose a" when 29% of customers
# chose nothing at all is the default doing what it says. If the
# missing rows matter, include them:
s.value_counts(normalize=True, dropna=False)
# a      0.43
# NaN    0.29
# ...

# sort=False KEEPS THE ORDER OF FIRST APPEARANCE; ascending=True
# puts the RARE values first, which is what you want when hunting
# for typos:
s.value_counts(ascending=True).head()

# bins= FOR A CONTINUOUS COLUMN -- a quick histogram:
amounts = pd.Series(np.random.default_rng(0).lognormal(4, 1, 1000))
amounts.value_counts(bins=5)              # equal-width bins
amounts.value_counts(bins=[0, 50, 100, 500, np.inf])   # your edges
#
# The bins are Intervals, and the output is sorted by COUNT, not by
# bin -- .sort_index() to see them in order.

# DataFrame.value_counts COUNTS COMBINATIONS:
df = pd.DataFrame({"region": ["n", "n", "s", "s", "s"],
                   "tier": ["gold", "gold", "gold", "silver", None]})
df.value_counts()
# region  tier
# n       gold      2
# s       gold      1
#         silver    1
#              <- the (s, None) row is EXCLUDED
df.value_counts(dropna=False)             # 4 rows
df.value_counts(subset=["region"])        # just one column

# nunique VS unique -- they disagree on missing:
s.nunique()                   # 3 -- a, b, c
len(s.unique())               # 4 -- a, b, None, c
s.nunique(dropna=False)       # 4
#
# On a frame, nunique per column is the fastest cardinality profile:
df.nunique()
# region    2
# tier      2

# THE CARDINALITY RATIO decides what a column IS:
def classify(s):
    n = s.nunique()
    ratio = n / max(len(s), 1)
    if n <= 1:
        return "constant -- carries nothing"
    if ratio > 0.95:
        return "identifier -- not a feature"
    if n <= 20:
        return "low-cardinality category"
    return "high-cardinality -- needs encoding thought"

# mode -- the most common value, WITH ITS EDGE:
pd.Series([1, 1, 2, 2, 3]).mode()         # [1, 2] -- a SERIES, both ties
pd.Series([1, 1, 2, 2, 3]).mode()[0]      # 1 -- take the first if one is needed
#
# mode() returns every value that ties for most frequent. Code that
# does s.mode() expecting a scalar breaks on the first tie.
`,
      hl: [17, 30, 55, 74],
      caption: "**`normalize=True` divides by the non-missing count.** \"60% chose a\" when 29% chose nothing is the default doing what it says — `dropna=False` puts the missing rows in the denominator."
    },

    { t: "h2", n: "02", text: "Duplicates", id: "duplicates" },

    { t: "p", text: "**A duplicate is a row that repeats an earlier row on the columns you care about.** Which columns, and which copy to keep, are both decisions — and the defaults (all columns, keep the first) are only sometimes right." },

    { t: "viz",
      title: "keep= decides which occurrence is marked",
      caption: "Three copies of the same key. `keep=\"first\"` marks the later two; `keep=\"last\"` marks the earlier two; `keep=False` marks all three — which is what you want to *see* the duplicates rather than remove them.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Five rows with three sharing a key, showing which rows duplicated() flags under each keep setting">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">rows:  k=1   k=2   k=2   k=3   k=2</text>

  <text x="30" y="72" class="s-sub" style="fill:var(--ink-3)">keep="first"</text>
  <g stroke-width="1.5">
    <rect x="160" y="54" width="60" height="28" rx="4" style="fill:none;stroke:var(--line)"/>
    <rect x="228" y="54" width="60" height="28" rx="4" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
    <rect x="296" y="54" width="60" height="28" rx="4" style="fill:var(--crit);fill-opacity:.18;stroke:var(--crit)"/>
    <rect x="364" y="54" width="60" height="28" rx="4" style="fill:none;stroke:var(--line)"/>
    <rect x="432" y="54" width="60" height="28" rx="4" style="fill:var(--crit);fill-opacity:.18;stroke:var(--crit)"/>
  </g>
  <text x="510" y="72" class="s-sub" style="fill:var(--ink-3)">first copy survives; 2 flagged</text>

  <text x="30" y="126" class="s-sub" style="fill:var(--ink-3)">keep="last"</text>
  <g stroke-width="1.5">
    <rect x="160" y="108" width="60" height="28" rx="4" style="fill:none;stroke:var(--line)"/>
    <rect x="228" y="108" width="60" height="28" rx="4" style="fill:var(--crit);fill-opacity:.18;stroke:var(--crit)"/>
    <rect x="296" y="108" width="60" height="28" rx="4" style="fill:var(--crit);fill-opacity:.18;stroke:var(--crit)"/>
    <rect x="364" y="108" width="60" height="28" rx="4" style="fill:none;stroke:var(--line)"/>
    <rect x="432" y="108" width="60" height="28" rx="4" style="fill:var(--good);fill-opacity:.18;stroke:var(--good)"/>
  </g>
  <text x="510" y="126" class="s-sub" style="fill:var(--ink-3)">last copy survives — "most recent wins"</text>

  <text x="30" y="180" class="s-sub" style="fill:var(--ink-3)">keep=False</text>
  <g stroke-width="1.5">
    <rect x="160" y="162" width="60" height="28" rx="4" style="fill:none;stroke:var(--line)"/>
    <rect x="228" y="162" width="60" height="28" rx="4" style="fill:var(--crit);fill-opacity:.18;stroke:var(--crit)"/>
    <rect x="296" y="162" width="60" height="28" rx="4" style="fill:var(--crit);fill-opacity:.18;stroke:var(--crit)"/>
    <rect x="364" y="162" width="60" height="28" rx="4" style="fill:none;stroke:var(--line)"/>
    <rect x="432" y="162" width="60" height="28" rx="4" style="fill:var(--crit);fill-opacity:.18;stroke:var(--crit)"/>
  </g>
  <text x="510" y="180" class="s-sub" style="fill:var(--ink-3)">all 3 flagged — to inspect, not to drop</text>

  <text x="30" y="228" class="s-sub" style="fill:var(--ink-3)">"Which copy is correct?" is a domain question. "first" means the earliest row in the current order — which is only meaningful if the frame is sorted.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "finding, inspecting and resolving duplicates", code: `
events = pd.DataFrame({
    "user": [1, 2, 2, 3, 2],
    "event": ["login", "buy", "buy", "login", "buy"],
    "ts": pd.to_datetime(["10:00", "10:01", "10:01", "10:02", "10:05"]),
    "amount": [0, 50, 50, 0, 60],
})

# EXACT DUPLICATES -- every column identical:
events.duplicated()                       # only row 2 (identical to row 1)
events.duplicated().sum()                 # 1
events.drop_duplicates()                  # row 2 gone

# DUPLICATES ON A SUBSET -- the usual real case:
events.duplicated(subset=["user", "event"])         # rows 2 AND 4
#
# Row 4 is a different purchase (10:05, 60) but the same user+event.
# Whether that is a duplicate depends entirely on what the row means.
# The subset IS the definition of "duplicate" and it must be stated.

# keep= DECIDES WHICH SURVIVES:
events.drop_duplicates(subset=["user", "event"], keep="first")   # rows 0,1,3
events.drop_duplicates(subset=["user", "event"], keep="last")    # rows 0,3,4
events.drop_duplicates(subset=["user", "event"], keep=False)     # rows 0,3 only
#
# "first" MEANS FIRST IN THE CURRENT ROW ORDER. If the frame is not
# sorted by time, "first" is arbitrary. Sort, THEN dedupe:
latest = (events.sort_values("ts")
                .drop_duplicates(subset=["user", "event"], keep="last"))
#
# This is "keep the most recent record per key" -- the pattern behind
# every slowly-changing-dimension table.

# INSPECT BEFORE DROPPING -- keep=False shows every copy:
dupes = events[events.duplicated(subset=["user", "event"], keep=False)]
dupes.sort_values(["user", "event", "ts"])
#
# Seeing rows 1, 2 and 4 together makes it obvious that 1 and 2 are a
# genuine double-submission and 4 is a separate purchase. A blind
# drop_duplicates on the subset would have deleted a real sale.

# THE RESOLUTION IS OFTEN NOT "DROP": it is "aggregate" or "choose".
# Two records for the same customer with different phone numbers:
#   - keep the most recently updated (sort + keep="last")
#   - keep the most complete (fewest NaN)
#   - merge them field by field (first non-null per column)
crm = pd.DataFrame({
    "customer": [1, 1, 2],
    "phone": [None, "555-0100", "555-0200"],
    "email": ["a@x.com", None, "b@x.com"],
})
crm.groupby("customer").first()           # FIRST NON-NULL per column
#   phone       email
# 1 555-0100    a@x.com       <- merged from both rows
# 2 555-0200    b@x.com
#
# groupby.first() skips NaN, so it coalesces. That is usually better
# than either drop_duplicates outcome for CRM-style data.

# DUPLICATES ON A FLOAT COLUMN ARE UNRELIABLE:
pd.Series([0.1 + 0.2, 0.3]).duplicated()          # [False, False]
#
# 0.30000000000000004 != 0.3. Round before comparing, or compare on
# the columns that are actually keys.

# DUPLICATED INDEX -- a separate check people forget:
events.index.duplicated().any()           # False here
pd.concat([events, events]).index.duplicated().sum()    # 5
#
# After a concat without ignore_index, or a bad set_index, the INDEX
# has duplicates even when the rows do not. .loc then returns
# multiple rows for one label. index.is_unique is the check.
`,
      hl: [14, 24, 51, 68],
      caption: "**`keep=\"first\"` means first in the current row order.** On an unsorted frame that is arbitrary — sort by time first, then \"keep last\" is \"most recent record per key\"."
    },

    { t: "callout", kind: "trap", title: "drop_duplicates on a subset deletes real rows", body: [
      { t: "p", text: "Deduplicating events on `[user, event]` treats two genuine purchases by the same user as one duplicate, and deletes a sale. The subset defines what \"duplicate\" means, and a subset that is too narrow deletes data." },
      { t: "p", text: "**Inspect with `keep=False` before dropping.** Seeing every copy side by side is the only way to tell a double-submission from two distinct records — and the difference is usually a timestamp or an amount that the subset excluded." },
      { t: "p", text: "Report the count removed. A dedupe that silently removes 8% of rows is a data-quality finding, not a cleaning step." }
    ]},

    { t: "h2", n: "03", text: "Ranking and cumulative operations", id: "rank" },

    { t: "code", lang: "python", title: "rank, its tie methods, and running statistics", code: `
scores = pd.Series([90, 85, 85, 70, 85], index=list("abcde"))

# THE DEFAULT AVERAGES TIES, producing fractional ranks:
scores.rank(ascending=False)
# a    1.0
# b    3.0     <- b, c, e tie for 2nd; positions 2,3,4 average to 3
# c    3.0
# d    5.0
# e    3.0
#
# A leaderboard showing "3rd, 3rd, 3rd" with nobody in 2nd or 4th is
# the default. It is statistically correct and presentationally odd.

# THE FIVE METHODS:
scores.rank(ascending=False, method="min")     # 1, 2, 2, 5, 2 -- competition
scores.rank(ascending=False, method="max")     # 1, 4, 4, 5, 4
scores.rank(ascending=False, method="dense")   # 1, 2, 2, 3, 2 -- no gaps
scores.rank(ascending=False, method="first")   # 1, 2, 3, 5, 4 -- by row order
scores.rank(ascending=False, method="average") # the default above
#
#   min     "1st, 2nd, 2nd, 2nd, 5th"  -- sports leaderboards
#   dense   "1st, 2nd, 2nd, 2nd, 3rd"  -- "how many distinct levels above me"
#   first   breaks ties by ORDER, which is arbitrary unless sorted
#
# THE CHOICE CHANGES DOWNSTREAM NUMBERS. "Top 3" under min has three
# people tied at 2nd and gives you four rows; under first it gives
# exactly three, chosen by row order.

# pct=True GIVES PERCENTILE RANK:
scores.rank(pct=True)                     # 0..1, useful as a feature

# na_option DECIDES WHERE MISSING GOES:
with_nan = pd.Series([90, np.nan, 85])
with_nan.rank()                           # [2, NaN, 1] -- NaN gets no rank
with_nan.rank(na_option="bottom")         # [2, 3, 1]
with_nan.rank(na_option="top")            # [3, 1, 2]

# RANK WITHIN GROUPS -- the common real case:
df = pd.DataFrame({
    "region": ["n", "n", "n", "s", "s"],
    "sales": [100, 300, 200, 150, 150],
})
df["rank_in_region"] = df.groupby("region")["sales"].rank(
    ascending=False, method="min")
#
# TOP-N PER GROUP uses this:
df[df["rank_in_region"] <= 2]
# or, more directly:
df.sort_values("sales", ascending=False).groupby("region").head(2)
#
# The two DIFFER on ties: rank<=2 with method="min" keeps every row
# tied at 2nd; head(2) keeps exactly two. Decide which you mean.

# CUMULATIVE OPERATIONS:
s = pd.Series([3, 1, 4, 1, 5])
s.cumsum()                    # 3, 4, 8, 9, 14
s.cumprod()
s.cummax()                    # 3, 3, 4, 4, 5 -- running maximum
s.cummin()
s.cumcount                    # does not exist on Series; see groupby
#
# cumsum ON A BOOLEAN IS A RUN-ID GENERATOR:
flags = pd.Series([True, False, False, True, False, True])
flags.cumsum()                # 1, 1, 1, 2, 2, 3 -- increments at each True
#
# This labels consecutive segments: every row between one True and
# the next gets the same id. It is how you turn "session start" flags
# into session numbers without a loop.

# CUMULATIVE WITHIN GROUPS:
df.groupby("region")["sales"].cumsum()    # running total per region
df.groupby("region").cumcount()           # 0, 1, 2, 0, 1 -- position in group
#
# cumcount is "how many rows of this group came before this one" --
# the nth event per user, the visit number, the attempt count.

# pct_change AND diff -- change from the previous row:
s.pct_change()                # NaN, -0.67, 3.0, -0.75, 4.0
s.diff()                      # NaN, -2, 3, -3, 4
#
# Both need the frame SORTED and GROUPED correctly first. pct_change
# across a group boundary compares the last row of one user to the
# first row of the next.
df.groupby("region")["sales"].pct_change()     # within region only
`,
      hl: [14, 27, 51, 65],
      caption: "**`cumsum` on a boolean column is a run-id generator.** Every row between one `True` and the next gets the same number — session start flags become session numbers with no loop."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Sessionise a click stream and rank the sessions",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "Raw click events arrive as `(user, ts, page)`. A session is a run of events by one user with no gap longer than 30 minutes. You need per-session features and each user's sessions ranked by length." },
        { t: "p", text: "The events contain exact duplicates from a retry mechanism, and they are not sorted." }
      ],
      requirements: [
        "Remove exact duplicates and report the count.",
        "Assign a session id without a Python loop.",
        "Compute per-session: start, end, duration, event count, distinct pages.",
        "Rank each user's sessions by duration with a stated tie rule.",
        "Number events within a session.",
        "Include tests, including the gap boundary and the tie."
      ],
      hint: "A session starts wherever the gap from the previous event by the same user exceeds the threshold. A cumulative sum of those starts is the session id.",
      solution: {
        lang: "python",
        title: "sessionise.py",
        code: `import pandas as pd
import numpy as np


def sessionise(events, gap=pd.Timedelta("30min")):
    """Assign session ids and per-event positions. No loops.

    Returns (events_with_sessions, n_duplicates_removed).
    """
    ev = events.copy()
    ev["ts"] = pd.to_datetime(ev["ts"])

    # EXACT DUPLICATES -- the retry mechanism. Report, do not hide.
    n_before = len(ev)
    ev = ev.drop_duplicates()
    n_dupes = n_before - len(ev)

    # ORDER IS EVERYTHING BELOW. Every shift, diff and cumsum assumes
    # the frame is sorted by user then time. kind="stable" keeps
    # same-timestamp events in their arrival order.
    ev = ev.sort_values(["user", "ts"], kind="stable").reset_index(drop=True)

    # GAP TO THE PREVIOUS EVENT BY THE SAME USER. groupby.diff gives
    # NaT for each user's first event, which is what we want: a first
    # event is always a session start.
    ev["gap"] = ev.groupby("user")["ts"].diff()

    # A SESSION STARTS when the gap is missing (first event) or too
    # large. The comparison NaT > gap is False, so the isna() is
    # required -- without it, every user's first event would NOT
    # start a session.
    ev["session_start"] = ev["gap"].isna() | (ev["gap"] > gap)

    # THE cumsum TRICK: a running count of starts is a session number.
    # Done within user so numbering restarts per user.
    ev["session_n"] = ev.groupby("user")["session_start"].cumsum()
    ev["session_id"] = ev["user"].astype(str) + "-" + ev["session_n"].astype(str)

    # POSITION WITHIN SESSION -- cumcount is exactly this.
    ev["event_n"] = ev.groupby("session_id").cumcount() + 1

    return ev.drop(columns=["gap", "session_start"]), n_dupes


def session_features(ev):
    """One row per session, with the user's sessions ranked."""
    s = ev.groupby(["user", "session_id"]).agg(
        start=("ts", "min"),
        end=("ts", "max"),
        events=("page", "size"),
        distinct_pages=("page", "nunique"),
        first_page=("page", "first"),
        last_page=("page", "last"),
    ).reset_index()

    s["duration"] = s["end"] - s["start"]
    s["duration_s"] = s["duration"].dt.total_seconds()

    # RANK BY DURATION WITHIN USER. method="min" so that two sessions
    # of equal length share a rank and the next rank is skipped --
    # "joint 1st, joint 1st, 3rd". This is the honest representation
    # of a tie; method="first" would break it by row order, which
    # after our sort means "earlier session wins", and that is a
    # rule nobody asked for.
    s["duration_rank"] = s.groupby("user")["duration_s"].rank(
        ascending=False, method="min").astype(int)

    # A SINGLE-EVENT SESSION HAS ZERO DURATION. It is not a data
    # error -- a bounce is a real session. But it ranks last, and
    # anything that divides by duration needs to know.
    s["is_bounce"] = s["events"] == 1

    return s.sort_values(["user", "start"]).reset_index(drop=True)


# =========================================================================
# WHY NO LOOP
# =========================================================================
#
# The loop version -- iterate rows, track last_ts per user, increment
# a counter when the gap exceeds the threshold -- is O(n) in Python
# and takes minutes on ten million events. The version above is three
# vectorised operations (diff, comparison, cumsum) and takes seconds.
#
# The cumsum-of-flags idiom generalises: any "new group starts here"
# boolean becomes a group id with one cumsum.


# =========================================================================
# TESTS
# =========================================================================

def _events():
    return pd.DataFrame({
        "user": [1, 1, 1, 1, 2, 2, 1, 1],
        "ts": ["2026-01-01 10:00", "2026-01-01 10:10", "2026-01-01 10:10",
               "2026-01-01 11:00", "2026-01-01 09:00", "2026-01-01 09:20",
               "2026-01-01 10:20", "2026-01-01 12:00"],
        "page": ["home", "search", "search", "home", "home", "cart",
                 "product", "home"],
    })
    # user 1: 10:00, 10:10, 10:10 (dupe), 10:20 | 11:00 | 12:00
    #         -> session 1 (3 events), session 2 (1), session 3 (1)
    # user 2: 09:00, 09:20 -> one session


def test_duplicates_are_removed_and_counted():
    ev, n = sessionise(_events())

    assert n == 1
    assert len(ev) == 7


def test_session_boundaries():
    ev, _ = sessionise(_events())
    u1 = ev[ev["user"] == 1]

    assert u1["session_n"].tolist() == [1, 1, 1, 2, 3]


def test_exact_gap_is_same_session():
    """A gap of exactly 30 minutes does NOT start a new session."""
    ev = pd.DataFrame({
        "user": [1, 1],
        "ts": ["2026-01-01 10:00", "2026-01-01 10:30"],
        "page": ["a", "b"],
    })
    out, _ = sessionise(ev)

    assert out["session_n"].nunique() == 1


def test_gap_just_over_threshold_starts_new_session():
    ev = pd.DataFrame({
        "user": [1, 1],
        "ts": ["2026-01-01 10:00", "2026-01-01 10:30:01"],
        "page": ["a", "b"],
    })
    out, _ = sessionise(ev)

    assert out["session_n"].tolist() == [1, 2]


def test_first_event_per_user_starts_a_session():
    """The NaT-comparison trap: NaT > gap is False."""
    ev, _ = sessionise(_events())

    firsts = ev.groupby("user").head(1)
    assert (firsts["session_n"] == 1).all()
    assert (firsts["event_n"] == 1).all()


def test_unsorted_input_is_handled():
    shuffled = _events().sample(frac=1, random_state=0)
    ev, _ = sessionise(shuffled)

    u1 = ev[ev["user"] == 1]
    assert u1["session_n"].tolist() == [1, 1, 1, 2, 3]


def test_event_numbering_restarts_per_session():
    ev, _ = sessionise(_events())
    u1 = ev[ev["user"] == 1]

    assert u1["event_n"].tolist() == [1, 2, 3, 1, 1]


def test_session_features():
    ev, _ = sessionise(_events())
    s = session_features(ev)

    first = s[(s["user"] == 1) & (s["session_id"] == "1-1")].iloc[0]
    assert first["events"] == 3
    assert first["distinct_pages"] == 3           # home, search, product
    assert first["duration_s"] == 1200            # 20 minutes
    assert first["first_page"] == "home"


def test_duration_rank_with_ties():
    """User 1's sessions 2 and 3 are both single events: tied last."""
    ev, _ = sessionise(_events())
    s = session_features(ev)
    u1 = s[s["user"] == 1].sort_values("session_id")

    assert u1["duration_rank"].tolist() == [1, 2, 2]
    assert u1["is_bounce"].tolist() == [False, True, True]


def test_sessions_do_not_cross_users():
    """User 2's 09:00 and user 1's 10:00 are 60 min apart but that
    gap must not be computed at all."""
    ev, _ = sessionise(_events())

    assert ev[ev["user"] == 2]["session_n"].tolist() == [1, 1]


def test_empty_input():
    ev, n = sessionise(pd.DataFrame({"user": [], "ts": [], "page": []}))

    assert len(ev) == 0 and n == 0`,
        notes: [
          { t: "p", text: "**`cumsum` on the session-start flag is the whole algorithm.** Any boolean meaning \"a new group begins here\" becomes a group id with one cumulative sum, and doing it within `groupby(\"user\")` restarts the numbering per user." },
          { t: "callout", kind: "trap", title: "NaT compared to anything is False", body: [
            { t: "p", text: "Each user's first event has a `NaT` gap, and `NaT > 30min` is `False` — so without the explicit `isna()` check, **no user's first event would start a session** and every user's first session would be missing." },
            { t: "p", text: "This is the same failure as `NaN > x` in 3.4, wearing a datetime. The test that asserts every user's first event has `session_n == 1` exists for it." }
          ]},
          { t: "p", text: "**Everything below the sort assumes the sort.** `diff`, `cumsum` and `cumcount` all read row order as time order, so an unsorted frame produces sessions that are wrong in ways that look plausible. `kind=\"stable\"` keeps same-timestamp events in arrival order rather than reshuffling them." },
          { t: "p", text: "**`method=\"min\"` is chosen so a tie is visible as a tie.** Two single-event sessions rank joint 2nd with no 3rd; `method=\"first\"` would break the tie by row order — \"earlier session wins\" — which is a rule nobody asked for and nobody would notice." },
          { t: "p", text: "**A bounce is a real session with zero duration**, not a data error. It ranks last, and the `is_bounce` flag exists so anything dividing by duration can decide what to do rather than producing `inf`." },
          { t: "p", text: "**The exact-boundary test is the one people skip.** A gap of exactly 30 minutes is the same session and 30:01 is a new one; the comparison direction (`>` not `>=`) is a decision and the test records it." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`s.nunique()` is 3 and `len(s.unique())` is 4. What explains the difference?",
          options: [
            "unique() includes duplicates",
            "The Series contains a missing value — `nunique` excludes it by default and `unique` includes it",
            "nunique is approximate",
            "The dtype is object"
          ],
          answer: 1,
          why: "The two disagree by exactly one whenever a missing value is present. `nunique(dropna=False)` matches `len(unique())`. It is a small inconsistency that becomes a wrong cardinality figure in a profiling report."
        }
      ]
    }
  ],

  takeaways: [
    "**`value_counts` excludes missing values by default**, and `normalize=True` divides by the non-missing count — `dropna=False` changes both.",
    "**`nunique` excludes missing and `unique` includes it**, so they disagree by one whenever a missing value is present.",
    "**`mode()` returns a Series of every tied value**, so code expecting a scalar breaks on the first tie.",
    "**The cardinality ratio classifies a column**: near 0 is a category, near 1 is an identifier, and 1 distinct value is a constant.",
    "**The `subset` argument is the definition of duplicate**, and one that is too narrow deletes real rows.",
    "**`keep=\"first\"` means first in the current row order** — sort by time first, then `keep=\"last\"` is \"most recent per key\".",
    "**Inspect with `keep=False` before dropping** to see every copy side by side.",
    "**`groupby.first()` coalesces** — first non-null per column — which is usually better than either `drop_duplicates` outcome for CRM-style data.",
    "**`rank` averages ties by default**, producing fractional ranks; `min` is a leaderboard, `dense` has no gaps, `first` breaks ties by arbitrary row order.",
    "**Top-N via `rank <= n` and via `head(n)` differ on ties** — one keeps every tied row, the other keeps exactly n.",
    "**`cumsum` on a boolean is a run-id generator**: session-start flags become session numbers with no loop.",
    "**`diff`, `pct_change`, `cumsum` and `cumcount` all read row order as meaning** — sort and group first, or the values cross boundaries."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`s.value_counts(normalize=True)` reports 60% for value \"a\" on a column where 2 of 7 rows are missing. What does 60% mean?",
        options: [
          "3 of 7 rows",
          "3 of the 5 non-missing rows — missing values are excluded from the denominator",
          "It is an estimate",
          "The proportion after imputation"
        ],
        answer: 1,
        why: "Normalisation divides by the count of values actually counted, and missing values are not counted. `dropna=False` puts them in as their own category and makes the denominator the full row count — which is usually what a report about customers should say."
      },
      {
        stem: "You `drop_duplicates(subset=[\"user\", \"event\"])` on a click stream and lose 8% of rows. What should you have done first?",
        options: [
          "Used keep=\"last\"",
          "Inspected with `keep=False` to see whether the flagged rows are genuine duplicates or distinct events that merely share user and event",
          "Reset the index",
          "Sorted by user"
        ],
        answer: 1,
        why: "The subset defines what counts as a duplicate. Two real purchases by the same user share `[user, event]` and differ in timestamp and amount — a blind drop deletes a sale. Seeing every copy side by side is the only way to tell, and 8% removed is a finding to report, not a step to hide."
      },
      {
        stem: "Scores 90, 85, 85, 70. What does `rank(ascending=False, method=\"min\")` give the two 85s?",
        options: [
          "2.5 each",
          "2 each, with the 70 ranked 4th — competition ranking with a gap",
          "2 and 3, by row order",
          "2 each, with the 70 ranked 3rd"
        ],
        answer: 1,
        why: "`min` assigns tied values the lowest position they occupy and skips the following ranks — \"1st, joint 2nd, joint 2nd, 4th\". `average` would give 2.5, `dense` would give the 70 a 3, and `first` would split the tie by whichever 85 appears first in the frame."
      },
      {
        stem: "How do you turn a boolean \"session starts here\" column into session numbers without a loop?",
        options: [
          "`rank()`",
          "`cumsum()` — it increments at every True, so all rows up to the next start share a number",
          "`cumcount()`",
          "`factorize()`"
        ],
        answer: 1,
        why: "A cumulative sum of a boolean counts the Trues seen so far, which labels each consecutive run. Within `groupby(\"user\")` the numbering restarts per user. The idiom generalises to any \"new group begins here\" flag — gaps in time, changes in state, page reloads."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you find duplicate records in a customer table, and what would you do with them?",
        strong: "First decide what a duplicate *is* — which columns constitute identity — since `drop_duplicates()` with no subset only catches rows identical in every field. Then inspect with `duplicated(subset, keep=False)` to see every copy together before removing anything. The resolution is often not \"drop\": for CRM data `groupby(key).first()` coalesces the first non-null per column, which is usually better than keeping either row whole.",
        answer: [
          { t: "p", text: "Separating detection from resolution, and naming coalescing as an option, shows you have dealt with real customer data rather than tidy examples." }
        ]
      },
      {
        level: "advanced",
        q: "How would you assign session ids to a click stream at scale?",
        strong: "Sort by user and time, compute the gap to the previous event with `groupby(\"user\")[\"ts\"].diff()`, flag a session start where the gap is missing or exceeds the threshold, and `cumsum` the flag within each user. Three vectorised operations, no loop — seconds on ten million rows where the row-by-row version takes minutes. The trap is that a first event's gap is `NaT`, which compares False, so the `isna()` check is essential.",
        answer: [
          { t: "p", text: "The cumsum-of-flags idiom is the thing being tested, and the NaT detail proves you have shipped it." }
        ]
      },
      {
        level: "advanced",
        q: "A leaderboard shows three people ranked 3rd and nobody in 2nd or 4th. What happened, and what would you change?",
        strong: "The default `rank` averages ties: positions 2, 3 and 4 become 3.0 for all three. For a leaderboard I would use `method=\"min\"` — joint 2nd, joint 2nd, joint 2nd, then 5th — which is how competition ranking works. `dense` is right when the question is \"how many distinct levels are above me\". And I would avoid `first`, which breaks ties by row order and invents a winner.",
        answer: [
          { t: "p", text: "Knowing all the tie methods is fine; knowing which one fits which question is the answer." }
        ]
      }
    ]
  }
});

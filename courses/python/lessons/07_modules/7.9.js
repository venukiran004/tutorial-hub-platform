/* ============================================================================
   LESSON 7.9 — Dates, Times and Time Zones in Depth
   ========================================================================= */
EC.receiveLesson({
  id: "7.9",

  lede: "Lesson 7.8 gave you the rule — store aware datetimes in UTC, convert at the edge. This lesson is about the places where following that rule is not enough. **Python's datetime type represents two different things — an instant and a reading on a wall clock — and most time bugs are one being used as the other.** Daylight saving creates local times that never happen and times that happen twice, the wall clock can jump backwards under your timeout, and a calendar date turned into a datetime can arrive in another country as the day before.",

  objectives: [
    "Distinguish an instant, a wall-clock time, a calendar date and a duration, and choose the right type for each",
    "Parse and format timestamps with an explicit offset, and reject naive input at the boundary",
    "Predict what happens at a DST gap and a DST fold, including the `fold` attribute and intra-zone comparison",
    "Choose `time.monotonic`, `time.perf_counter` or the wall clock for timeouts, measurements and timestamps",
    "Make time-dependent code testable by injecting a clock instead of reading it"
  ],

  prerequisites: ["7.8"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "Four things called \"time\"", id: "kinds" },

    { t: "p", text: "Before any API, settle what the value *means*. A payment captured at a moment, a shop that opens at 09:00, a contract that starts on 1 June and a session that lasts 30 minutes are four different kinds of value, and they need different types and different storage." },

    {"t": "diagram", "kind": "compare", "title": "Choose the type from the meaning", "caption": "**An instant is the same moment everywhere** — store it as an aware datetime in UTC. **A wall-clock time is a reading that depends on a place** — store the local time *and* the zone name, because the offset for a future date is not known yet. **A date is not a time at all**, and turning it into midnight-somewhere is how a birthday moves.", "columns": [
      {"title": "instant", "tone": "accent", "items": ["payment captured", "aware datetime, UTC", "timestamptz"]},
      {"title": "wall-clock time", "tone": "violet", "items": ["shop opens 09:00", "time + zone name", "offset decided later"]},
      {"title": "calendar date", "tone": "good", "items": ["contract starts 1 June", "datetime.date", "no zone at all"]},
      {"title": "duration", "tone": "warn", "items": ["session lasts 30 min", "timedelta", "elapsed, not calendar"]}
    ]},

    { t: "p", text: "The distinction between the middle two matters most for anything scheduled in the future. If a user books a 09:00 meeting in London for next July, store `09:00` and `Europe/London`, not the UTC instant you computed today: governments change DST rules, and the instant is only knowable once the rules for that date are final." },

    { t: "callout", kind: "warn", title: "zoneinfo needs a database, and some machines have none", body: [
      { t: "p", text: "`zoneinfo` reads the operating system's time-zone database. Windows has none, and neither do many slim container images, so the same code that works on your laptop fails in CI or production:" },
      { t: "code", lang: "text", numbered: false, title: "a clean interpreter on Windows", code: `>>> ZoneInfo("Europe/London")
zoneinfo._common.ZoneInfoNotFoundError: 'No time zone found with key Europe/London'` },
      { t: "p", text: "**Declare `tzdata` as a dependency** (Lesson 7.6). It is the IANA database packaged for Python, `zoneinfo` falls back to it automatically, and it pins the rules to a version you control rather than whatever the image happened to ship." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Parsing: demand an offset", id: "parsing" },

    { t: "p", text: "Every timestamp that crosses a boundary — an API body, a CSV column, a log line — should carry its offset. ISO 8601 is the format to ask for, and since 3.11 `datetime.fromisoformat` accepts all of it, including the trailing `Z` that older versions rejected." },

    { t: "code", lang: "python", title: "ISO 8601 in, ISO 8601 out", code: `
from datetime import datetime

a = datetime.fromisoformat("2026-03-14T09:30:00Z")          # 3.11+: "Z" accepted
b = datetime.fromisoformat("2026-03-14T09:30:00+05:30")
c = datetime.fromisoformat("2026-03-14T09:30:00")           # no offset at all
print(a, a.tzinfo)
print(b, b.tzinfo)
print(c, c.tzinfo)                                          # naive

d = datetime.strptime("14/03/2026 09:30 +0000", "%d/%m/%Y %H:%M %z")
print(d.isoformat())
print(a.isoformat(timespec="seconds"), a == d)
`,
      out: `2026-03-14 09:30:00+00:00 UTC
2026-03-14 09:30:00+05:30 UTC+05:30
2026-03-14 09:30:00 None
2026-03-14T09:30:00+00:00
2026-03-14T09:30:00+00:00 True`,
      caption: "`strptime` is for formats you do not control; give it an explicit format string, never a guess. `%z` is what makes the result aware." },

    { t: "callout", kind: "trap", title: "A missing offset parses without complaint", body: [
      { t: "p", text: "`fromisoformat` accepts a timestamp with no offset and returns a **naive** datetime. Nothing fails at the parse. It fails later, somewhere far from the input, the first time the value meets an aware one:" },
      { t: "code", lang: "python", title: "the failure arrives later", code: `
from datetime import datetime, timezone

event = datetime.fromisoformat("2026-03-14T09:30:00")     # a partner omitted the offset
now = datetime.now(timezone.utc)
try:
    print(now - event)
except TypeError as exc:
    print(f"TypeError: {exc}")
`,
        out: `TypeError: can't subtract offset-naive and offset-aware datetimes` },
      { t: "p", text: "**Check `value.tzinfo is not None` immediately after parsing and reject the input otherwise.** Never \"fix\" it by attaching UTC: if the partner meant their local time, you have silently shifted every event by their offset. Pydantic's `AwareDatetime` type (Lesson 12.3) does the check for you." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Daylight saving: the gap and the fold", id: "dst" },

    { t: "p", text: "Twice a year the wall clock in most of Europe and North America is discontinuous. In spring it jumps forward, so an hour of local times **never happens** — the gap. In autumn it falls back, so an hour of local times **happens twice** — the fold. Python does not raise for either; it gives you an answer, and you need to know which." },

    { t: "code", lang: "python", title: "a time that never happens, and one that happens twice", code: `
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

LONDON = ZoneInfo("Europe/London")

# Spring forward: 01:00 -> 02:00 on 29 March 2026. 01:30 never happens.
gap = datetime(2026, 3, 29, 1, 30, tzinfo=LONDON)
print(gap, gap.utcoffset())
print(gap.astimezone(ZoneInfo("UTC")).astimezone(LONDON))   # round-trip moves it

# Fall back: 02:00 -> 01:00 on 25 October 2026. 01:30 happens twice.
first = datetime(2026, 10, 25, 1, 30, tzinfo=LONDON, fold=0)
second = datetime(2026, 10, 25, 1, 30, tzinfo=LONDON, fold=1)
print(first.utcoffset(), second.utcoffset())
print(second.astimezone(ZoneInfo("UTC")) - first.astimezone(ZoneInfo("UTC")))
`,
      out: `2026-03-29 01:30:00+00:00 0:00:00
2026-03-29 02:30:00+01:00
1:00:00 0:00:00
1:00:00`,
      caption: "The gap time is accepted and quietly interpreted with the pre-transition offset; converting it to UTC and back reveals it as 02:30. In the fold, `fold=0` is the first occurrence (still BST) and `fold=1` the second (GMT), one real hour apart." },

    {"t": "diagram", "kind": "trace", "title": "The autumn fold, as instants", "caption": "**The wall clock reads 01:30 twice, an hour apart.** `fold` is the only thing that tells the two readings apart, and it defaults to 0 — the first. A job scheduled for \"01:30 local\" with no thought about this runs at whichever one your code happens to compute, or at both.", "left": "instant (UTC)", "codeW": 150, "vars": ["London wall clock", "fold"], "steps": [
      {"code": "00:30 UTC", "state": ["01:30 BST (+01:00)", "0"], "tone": "accent"},
      {"code": "01:00 UTC", "state": ["clocks go back to 01:00", "-"], "changed": [0], "tone": "warn"},
      {"code": "01:30 UTC", "state": ["01:30 GMT (+00:00)", "1"], "changed": [0, 1], "tone": "crit"},
      {"code": "02:30 UTC", "state": ["02:30 GMT", "0"], "changed": [0, 1], "tone": "good"}
    ]},

    { t: "callout", kind: "trap", title: "Two datetimes in the same zone compare by wall clock", body: [
      { t: "p", text: "When both operands share a `tzinfo`, Python compares their *wall-clock readings* and ignores `fold` entirely. So the two 01:30s above are equal, even though they are an hour apart:" },
      { t: "code", lang: "python", title: "equal, and an hour apart", code: `
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

LONDON = ZoneInfo("Europe/London")
first = datetime(2026, 10, 25, 1, 30, tzinfo=LONDON, fold=0)    # 00:30 UTC
second = datetime(2026, 10, 25, 1, 30, tzinfo=LONDON, fold=1)   # 01:30 UTC

print(first == second, first < second)                # same tzinfo: wall time only
print(first.astimezone(timezone.utc) < second.astimezone(timezone.utc))
`,
        out: `True False
True` },
      { t: "p", text: "**Compare and subtract instants in UTC.** It is the same rule as storage, applied to arithmetic: convert first, then compare, and a datetime is only ever local at the moment you display it." }
    ]},

    { t: "code", lang: "python", title: "\"one day later\" is not 24 hours", code: `
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

LONDON = ZoneInfo("Europe/London")
start = datetime(2026, 3, 28, 9, 0, tzinfo=LONDON)     # the day before the change

wall = start + timedelta(days=1)                       # same zone: wall-clock arithmetic
print(wall, "elapsed:", wall.astimezone(timezone.utc) - start.astimezone(timezone.utc))

utc = (start.astimezone(timezone.utc) + timedelta(hours=24)).astimezone(LONDON)
print(utc, "elapsed: 24h exactly")
`,
      out: `2026-03-29 09:00:00+01:00 elapsed: 23:00:00
2026-03-29 10:00:00+01:00 elapsed: 24h exactly`,
      caption: "Both are correct answers to different questions. Adding to a local datetime keeps the wall time — right for \"the same time tomorrow\". Adding in UTC keeps the elapsed time — right for \"expires in 24 hours\". Decide which question you are asking." },

    /* ================================================================== */
    { t: "h2", n: "04", text: "Clocks: wall, monotonic and performance", id: "clocks" },

    { t: "p", text: "`datetime.now()` and `time.time()` read the **wall clock**, which the operating system is allowed to change: NTP corrects it, an administrator sets it, a virtual machine resumes from a snapshot. A wall-clock timestamp is right for recording *when* something happened and wrong for measuring *how long* it took." },

    { t: "code", lang: "python", title: "which clocks can move", code: `
import time

deadline = time.monotonic() + 5.0          # a timeout: immune to the wall clock moving
print(time.monotonic() < deadline)

t0 = time.perf_counter()                   # a measurement: highest resolution
sum(range(100_000))
print(time.perf_counter() - t0 < 1.0)

print(time.get_clock_info("monotonic").adjustable, time.get_clock_info("time").adjustable)
`,
      out: `True
True
False True`,
      caption: "`adjustable` is the whole story: the system may set `time.time()`, and it may never set `time.monotonic()`. Monotonic values have no meaning on their own — only differences between two readings in the same process do." },

    { t: "ladder", title: "Measuring a timeout", rungs: [
      { level: "bad", label: "datetime.now() differences", why: "the wall clock can step", code: `start = datetime.now()
while datetime.now() - start < timedelta(seconds=30):
    poll()`, note: "If NTP steps the clock back by a minute, this loop runs for ninety seconds. If it steps forward, the timeout fires immediately." },
      { level: "ok", label: "time.time() differences", why: "same clock, cheaper", code: `start = time.time()
while time.time() - start < 30:
    poll()`, note: "Faster and simpler, but it reads the same adjustable wall clock, so it has the same failure." },
      { level: "best", label: "time.monotonic()", why: "cannot go backwards", code: `deadline = time.monotonic() + 30
while time.monotonic() < deadline:
    poll()`, note: "The clock that exists for this purpose. `asyncio` and `threading` timeouts already use it internally." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Dates that are not datetimes, and clocks you can control", id: "dates-testing" },

    { t: "code", lang: "python", title: "how a birthday moves", code: `
from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

birthday = date(1990, 6, 1)

# WRONG: turn a calendar date into an instant, then display it somewhere else
as_instant = datetime.combine(birthday, time(0), tzinfo=timezone.utc)
print(as_instant.astimezone(ZoneInfo("America/Los_Angeles")).date())

# RIGHT: a date is a date. Store it as one; there is no time zone to get wrong.
print(birthday.isoformat())
`,
      out: `1990-05-31
1990-06-01`,
      caption: "Midnight UTC is the previous evening in Los Angeles. The same bug appears in databases as a `DATE` column mapped to a timestamp, and in JavaScript clients that parse `\"1990-06-01\"` as midnight UTC." },

    { t: "p", text: "Code that calls `datetime.now()` internally is code you cannot test at a boundary — the expiry exactly at the hour, the run on the day the clocks change. **Make the clock a parameter.** The production default reads the real clock; a test passes a function that returns whatever moment the test needs." },

    { t: "code", lang: "python", title: "a clock is a dependency", code: `
from collections.abc import Callable
from datetime import datetime, timedelta, timezone

Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def is_expired(issued_at: datetime, ttl: timedelta, now: Clock = utc_now) -> bool:
    return now() - issued_at >= ttl


issued = datetime(2026, 3, 14, 9, 0, tzinfo=timezone.utc)
fixed = lambda: datetime(2026, 3, 14, 9, 59, 59, tzinfo=timezone.utc)
later = lambda: datetime(2026, 3, 14, 10, 0, 0, tzinfo=timezone.utc)

print(is_expired(issued, timedelta(hours=1), now=fixed))
print(is_expired(issued, timedelta(hours=1), now=later))
`,
      out: `False
True` },

    { t: "callout", kind: "good", title: "Inject the clock rather than freezing it", body: [
      { t: "p", text: "Libraries such as `freezegun` and `time-machine` patch the clock globally, which works but hides the dependency: the function still looks like it takes no time input. A `now` parameter makes the dependency visible in the signature, works identically with `async` code and threads, and is the same seam that dependency injection uses for everything else (Lesson 9.6)." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Schedule a daily job that survives both DST changes",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "A report must run every day at 09:00 London time, and a billing job at 01:30 London time. Write `next_run(at, tz, now)` that returns the next run as an aware UTC datetime. On the spring-forward day the billing job's 01:30 does not exist; on the fall-back day it exists twice, and billing must run once." }
      ],
      requirements: [
        "Reject a naive `now` with a `ValueError`",
        "Return an aware datetime in UTC, strictly after `now`",
        "Show three consecutive 09:00 runs across the spring change: the UTC hour must move from 09 to 08",
        "Handle the gap: a 01:30 run on 29 March 2026 runs just after the gap",
        "Handle the fold: on 25 October 2026 the 01:30 job runs once, at the first occurrence, and the next run is the following day"
      ],
      hint: "Build the local wall time with `datetime.combine(day, at, tzinfo=tz)`, convert it to UTC, and compare *that* with `now` in UTC. Remember from section 03 why comparing the local datetimes directly would be wrong.",
      solution: {
        lang: "python",
        title: "schedule.py",
        code: `"""Next run of a daily job at a local wall-clock time, correct across DST."""
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

UTC = timezone.utc


def next_run(at: time, tz: ZoneInfo, now: datetime) -> datetime:
    """The next instant, in UTC, at which the wall clock in tz reads at."""
    if now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    day = now.astimezone(tz).date()
    while True:
        # fold=0: in an ambiguous hour, run at the FIRST occurrence only
        wall = datetime.combine(day, at, tzinfo=tz)
        instant = wall.astimezone(UTC)            # a gap time lands just after the gap
        if instant > now.astimezone(UTC):         # compare instants, never wall times
            return instant
        day += timedelta(days=1)


LONDON = ZoneInfo("Europe/London")
now = datetime(2026, 3, 27, 12, 0, tzinfo=UTC)
for _ in range(3):
    now = next_run(time(9, 0), LONDON, now)
    print(now.isoformat(), "=", now.astimezone(LONDON).strftime("%a %H:%M %Z"))

gap = next_run(time(1, 30), LONDON, datetime(2026, 3, 29, 0, 0, tzinfo=UTC))
print(gap.isoformat(), "=", gap.astimezone(LONDON).strftime("%H:%M %Z"))

fold = next_run(time(1, 30), LONDON, datetime(2026, 10, 24, 23, 0, tzinfo=UTC))
again = next_run(time(1, 30), LONDON, fold)
print(fold.isoformat(), "then", again.isoformat())`,
        out: `2026-03-28T09:00:00+00:00 = Sat 09:00 GMT
2026-03-29T08:00:00+00:00 = Sun 09:00 BST
2026-03-30T08:00:00+00:00 = Mon 09:00 BST
2026-03-29T01:30:00+00:00 = 02:30 BST
2026-10-25T00:30:00+00:00 then 2026-10-26T01:30:00+00:00`,
        notes: [
          { t: "p", text: "**The loop advances the calendar date, not the instant.** Adding a day to the date and rebuilding the wall time is what keeps the job at 09:00 local through the change; adding 24 hours to the previous instant would drift it to 10:00." },
          { t: "p", text: "**The fold is handled by `fold=0` plus the strict comparison.** The first 01:30 (00:30 UTC) is returned. Asked again from that instant, the loop rebuilds the same day's 01:30 with `fold=0` — the same instant, not strictly after `now` — so it moves on to the next day. The second occurrence is never built, so the job runs once by construction." },
          { t: "p", text: "**The gap needs no special case** because `zoneinfo` interprets a non-existent time with the pre-transition offset, which lands it just after the gap. That is a defensible policy for a billing job; if yours must instead skip the day, detect the gap by checking that a round trip through UTC changes the wall time." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A subscription service ran its nightly billing job from cron at `30 1 * * *` on servers configured for `Europe/London`. On the last Sunday of October, every customer due that day was charged twice. On the last Sunday of March the following year, nobody due that day was charged at all, and the shortfall was found a week later in finance's reconciliation." },
      { t: "p", text: "**Both incidents were the same bug.** The schedule was expressed as a local wall-clock time inside the DST transition hour, so it ran at both occurrences of 01:30 in the fold and at neither in the gap. The job itself was not idempotent, so running twice meant charging twice." },
      { t: "p", text: "**The fix had two independent layers.** The schedule moved to UTC (`TZ=UTC` on the scheduler, with the local intent documented next to it), so the job runs exactly once every 24 hours. And billing became idempotent per customer per billing date, with a unique constraint on `(customer_id, billing_date)`, so even a scheduler that fires twice charges once. The second layer is the one that matters: schedulers retry, and time is not the only reason they do." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**A datetime can mean an instant or a wall-clock reading**, and most time bugs use one as the other. Decide which before choosing a type.",
    "**Store instants as aware UTC datetimes; store future wall-clock times as a local time plus a zone name**, because the offset for a future date may change.",
    "**A calendar date is not a datetime.** Converting it to midnight in one zone shows the previous day in another.",
    "**Demand an offset at every boundary** and reject naive input immediately — never attach UTC to a value whose zone you do not know.",
    "**DST creates gaps and folds, and Python raises for neither.** A gap time is interpreted with the old offset; `fold` chooses between the two readings in a fold.",
    "**Two datetimes with the same `tzinfo` compare by wall clock and ignore `fold`.** Compare and subtract in UTC.",
    "**Adding a `timedelta` to a local datetime keeps the wall time; adding it in UTC keeps the elapsed time.** They answer different questions.",
    "**Use `time.monotonic()` for timeouts and `perf_counter()` for measurements**; the wall clock can be stepped backwards or forwards at any moment.",
    "**Make the clock a parameter** so that the boundary cases — the expiry at the hour, the run on the DST day — are ordinary tests.",
    "**Declare `tzdata` as a dependency**: Windows and slim containers have no time-zone database for `zoneinfo` to read."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`a` and `b` are both `datetime(2026, 10, 25, 1, 30, tzinfo=ZoneInfo(\"Europe/London\"))`, with `fold=0` and `fold=1` respectively. What is `a == b`?",
        options: [
          "`False` — they are an hour apart",
          "It raises, because the time is ambiguous",
          "`False`, because `fold` is part of equality",
          "`True` — same-zone comparison ignores `fold`"
        ],
        answer: 3,
        why: "Intra-zone comparison uses the naive wall-clock fields, so both read 01:30 and compare equal despite being one real hour apart. Python never raises for an ambiguous time; it uses `fold` only when converting to another zone, and `fold` is deliberately excluded from same-zone equality. Converting both to UTC first gives the right answer."
      },
      {
        stem: "A partner's API sends `\"2026-03-14T09:30:00\"` with no offset. What should your parser do?",
        options: [
          "Attach `timezone.utc`, since most systems exchange timestamps in UTC",
          "Reject it: the instant is unknown without an offset",
          "Attach the server's local zone",
          "Accept it as naive and convert later"
        ],
        answer: 1,
        why: "Without an offset the value is a wall-clock reading in an unknown place. Attaching UTC or your server's zone is a guess that is wrong by the partner's offset if they meant their local time, and it fails silently. Accepting it naive only moves the failure to the first comparison with an aware value. Rejecting it forces the contract to be fixed."
      },
      {
        stem: "Which clock should a retry loop use to enforce a 30-second deadline?",
        options: [
          "`time.monotonic()`",
          "`datetime.now()`",
          "`time.time()`",
          "`datetime.now(timezone.utc)`"
        ],
        answer: 0,
        why: "`time.monotonic()` cannot be adjusted by the system, so a deadline computed from it cannot be extended or cut short by an NTP step or a manual clock change. The other three all read the wall clock — `time.time()` directly, both `datetime.now()` forms via it — and making the datetime aware does not stop the clock moving."
      },
      {
        stem: "You store a customer's date of birth by converting it to midnight UTC. What goes wrong?",
        options: [
          "Nothing, as long as the database column is `timestamptz`, which keeps the zone",
          "West of UTC, the birthday displays as the day before",
          "Leap years are miscalculated",
          "The value cannot be serialised to JSON"
        ],
        answer: 1,
        why: "Midnight UTC is still the previous evening in the Americas, so converting the stored instant to a local zone yields the wrong date. timestamptz preserves the instant faithfully, which is exactly the problem: a date was never an instant. Leap years and JSON serialisation are unaffected. Store a `date` as a `DATE`."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you handle time zones in a backend service?",
        strong: "Aware datetimes everywhere, stored and compared in UTC, converted to a local zone only for display. Reject naive input at the boundary. Store future local times — a meeting next July — as a local time plus an IANA zone name, because the offset is not fixed yet. Dates stay dates.",
        answer: [
          { t: "p", text: "The baseline answer is \"store UTC\". What lifts it is the second sentence: the cases where UTC is not enough — future wall-clock events and calendar dates — and why." },
          { t: "p", text: "Mentioning `zoneinfo` with `tzdata` as a declared dependency, rather than `pytz`, signals current practice." }
        ],
        weak: "\"We use UTC everywhere.\" It is the right default, but it predicts the wrong behaviour for a recurring 09:00 meeting across a DST change."
      },
      {
        level: "advanced",
        q: "A job scheduled for 01:30 local time ran twice one night. What happened, and how do you fix it?",
        strong: "A DST fold: 01:30 occurred twice, and the scheduler fired at both. Fix the schedule by expressing it in UTC or choosing a time outside the transition hour, and — more importantly — make the job idempotent per business date so that any double fire is harmless.",
        answer: [
          { t: "p", text: "Name both halves of the transition: the fold explains the double run, and the gap means the same job will be skipped entirely in spring. Interviewers often ask the follow-up precisely to see whether you anticipate it." },
          { t: "p", text: "The senior move is to treat the scheduler fix as secondary. Schedulers retry and fire twice for many reasons; idempotency keyed on the business date is the control that holds regardless of cause." }
        ]
      },
      {
        level: "expert",
        q: "Why is time.monotonic() preferred over time.time() for timeouts, and what can you not do with it?",
        strong: "The wall clock is adjustable — NTP, administrators and VM resumes all change it — so durations computed from it can be negative or wildly long. Monotonic time cannot go backwards. But its absolute value is meaningless and not comparable across processes or machines, so it is for measuring intervals only, never for timestamps.",
        answer: [
          { t: "p", text: "Give a concrete failure: an NTP step backwards turns a 30-second timeout into a much longer one. Then state the limitation clearly — a monotonic reading cannot be logged, stored or compared with another host's." },
          { t: "p", text: "Adding that `perf_counter` is the higher-resolution choice for benchmarks, and that `asyncio` uses the monotonic clock for its own timeouts, shows you have looked underneath the standard library." }
        ]
      }
    ]
  }
});

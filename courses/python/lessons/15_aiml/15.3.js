/* ============================================================================
   LESSON 15.3 — Data Pipelines and Validation
   ========================================================================= */
EC.receiveLesson({
  id: "15.3",

  lede: "A pipeline that runs once is a script. **A pipeline is something that will be re-run** — after a failure, after a bug fix, after upstream sends corrected data — and almost every property that matters follows from designing for that second run rather than the first.",

  objectives: [
    "Make a transform idempotent, so a re-run is always safe",
    "Validate data at the boundary, with a schema that is a contract",
    "Handle partial failure without losing the good rows or the bad ones",
    "Design a backfill that can be interrupted and resumed",
    "Detect data quality regressions before a consumer does"
  ],

  prerequisites: ["12.7", "15.2"],

  blocks: [

    { t: "h2", n: "01", text: "Idempotence", id: "idempotence" },

    { t: "ladder",
      title: "Writing a day's aggregates",
      rungs: [
        { level: "bad", label: "Append",
          why: "A re-run doubles the data. Since re-runs happen — a transient failure, a corrected input, a manual retry — the table quietly accumulates duplicates and every downstream sum is wrong by a factor nobody can determine after the fact.",
          code: `def run(day):
    result = compute(day)
    result.to_sql("daily_totals", engine, if_exists="append")

# Ran twice on 2026-03-04? That day is now counted twice, and there
# is no column that says so.` },
        { level: "ok", label: "Delete then insert",
          why: "Idempotent in effect: the same day always ends with one set of rows. But the delete and the insert are separate, so a crash between them leaves the day missing entirely — and a reader between them sees nothing.",
          code: `def run(day):
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM daily_totals WHERE day = :d"),
                     {"d": day})
        compute(day).to_sql("daily_totals", conn, if_exists="append")
# Better -- and note the transaction is what makes it survivable.` },
        { level: "best", label: "Upsert on a natural key",
          why: "One atomic statement per row set. There is no window in which the day is absent, a re-run converges to the same state, and concurrent runs of the same day do not corrupt each other.",
          code: `INSERT INTO daily_totals (day, country, revenue, order_count, computed_at)
SELECT * FROM staging_daily_totals
ON CONFLICT (day, country) DO UPDATE SET
    revenue      = EXCLUDED.revenue,
    order_count  = EXCLUDED.order_count,
    computed_at  = EXCLUDED.computed_at;

-- The natural key (day, country) is what makes this work: it says
-- what "the same row" means, so a re-run replaces rather than adds.
--
-- computed_at is not decoration. When a consumer asks "is this
-- current?", it is the only column that can answer.`,
          note: "**Idempotence is a property of the write, not of the computation.** A perfectly deterministic transform with an appending write is not idempotent." }
      ]
    },

    { t: "callout", kind: "insight", title: "Partitioned overwrite, for files", body: [
      { t: "code", lang: "python", title: "the same idea without a database", numbered: false, code: `
# The file equivalent of an upsert: one directory per partition, and
# a re-run REPLACES that directory.
#
#   s3://warehouse/daily_totals/day=2026-03-04/part-0.parquet
#   s3://warehouse/daily_totals/day=2026-03-05/part-0.parquet

df.to_parquet(
    "s3://warehouse/daily_totals/",
    partition_cols=["day"],
    existing_data_behavior="delete_matching",   # replace THIS day only
)

# WRITE TO A TEMPORARY PATH, THEN MOVE. A reader must never see a
# half-written partition.
tmp = f"{base}/_tmp/day={day}"
final = f"{base}/day={day}"
write(tmp)
atomic_replace(tmp, final)      # a rename, not a copy

# On S3 there are no atomic directory renames, which is why table
# formats exist -- Iceberg and Delta add a manifest so a reader sees
# either the old snapshot or the new one, never a mixture.`},
      { t: "p", text: "**Partition by the thing you re-run.** If you reprocess a day at a time, partition by day; if by customer, partition by customer. A partition scheme that does not match your re-run granularity forces you to rewrite far more than you changed." }
    ]},

    { t: "h2", n: "02", text: "Schemas as contracts", id: "schemas" },

    { t: "code", lang: "python", title: "validate at the boundary, once", code: `
import pandera.pandas as pa
from pandera.typing import DataFrame, Series


class RawOrder(pa.DataFrameModel):
    """The contract for what upstream sends us. If this fails, the
    problem is theirs -- and we can say so with evidence."""

    order_id: Series[int] = pa.Field(unique=True, gt=0)
    customer_id: Series[int] = pa.Field(gt=0)
    total: Series[float] = pa.Field(ge=0, le=1_000_000)
    currency: Series[str] = pa.Field(isin=["GBP", "EUR", "USD"])
    status: Series[str] = pa.Field(isin=["pending", "paid", "cancelled"])
    created_at: Series[pd.Timestamp] = pa.Field(nullable=False)

    @pa.check("created_at")
    def not_in_the_future(cls, s: Series) -> Series[bool]:
        # A clock skew or a timezone bug upstream shows up here rather
        # than as a mysteriously empty report next month.
        return s <= pd.Timestamp.now(tz="UTC")

    class Config:
        strict = "filter"      # drop unexpected columns rather than
                               # failing -- upstream adds columns
        coerce = True          # "123" -> 123 where unambiguous


@pa.check_types(lazy=True)     # collect ALL errors, not just the first
def load_orders(path: str) -> DataFrame[RawOrder]:
    return pd.read_parquet(path)
`,
      hl: [12, 18, 25, 30],
      caption: "**`lazy=True` reports every violation at once.** Without it you fix one column, re-run for ten minutes, and discover the next — which is how a five-minute data problem becomes an afternoon."
    },

    { t: "callout", kind: "tradeoff", title: "Where validation belongs", body: [
      { t: "table",
        head: ["Boundary", "Validate", "On failure"],
        rows: [
          ["**Ingest**", "**Everything.** This is the contract", "**Reject and alert upstream**"],
          ["Between internal steps", "Cheap invariants only", "Fail the run — it is your bug"],
          ["Before publishing", "Row counts, nulls, ranges", "**Block the publish**"],
          ["Every function", "No — it is noise", "n/a"]
        ]
      },
      { t: "p", text: "**Validate hard at the edges and lightly in the middle.** Data that has passed the ingest contract does not need re-checking at every step; what it needs is one more check before anyone consumes the result." },
      { t: "p", text: "**A failed validation should name the rows.** \"3 of 40,000 rows have a negative total: order_ids 8812, 9104, 9855\" is actionable; \"validation failed\" starts an investigation." }
    ]},

    { t: "h2", n: "03", text: "Partial failure", id: "partial" },

    { t: "code", lang: "python", title: "keep the good rows and the bad ones", code: `
@dataclass
class Outcome:
    valid: pd.DataFrame
    rejected: pd.DataFrame       # WITH a reason column
    stats: dict[str, int]


def process(df: pd.DataFrame) -> Outcome:
    """All-or-nothing is rarely right for a batch. One malformed row
    in 40 million should not stop the other 39,999,999 -- and it must
    not be silently dropped either."""
    try:
        RawOrder.validate(df, lazy=True)
        return Outcome(df, empty_like(df), {"valid": len(df), "rejected": 0})

    except pa.errors.SchemaErrors as exc:
        # failure_cases names the exact rows and the exact checks.
        bad_index = exc.failure_cases["index"].dropna().unique()
        reasons = (
            exc.failure_cases.groupby("index")["check"]
               .apply(lambda s: "; ".join(sorted(set(s))))
        )

        rejected = df.loc[bad_index].copy()
        rejected["rejection_reason"] = reasons.reindex(bad_index).values
        rejected["rejected_at"] = pd.Timestamp.now(tz="UTC")

        valid = df.drop(index=bad_index)

        # A THRESHOLD. 3 bad rows in 40M is data entropy; 30% bad is a
        # broken upstream, and continuing would publish a report that
        # silently excludes a third of the business.
        rate = len(rejected) / max(len(df), 1)
        if rate > 0.05:
            raise DataQualityError(
                f"{rate:.1%} of rows rejected -- refusing to continue"
            )

        # Rejects go to a table someone looks at, not to /dev/null.
        rejected.to_sql("rejected_orders", engine, if_exists="append")
        logger.warning("rows_rejected", extra={
            "count": len(rejected), "rate": rate,
            "reasons": reasons.value_counts().head(5).to_dict(),
        })

        return Outcome(valid, rejected, {"valid": len(valid),
                                         "rejected": len(rejected)})
`,
      hl: [18, 25, 33, 39],
      caption: "**The rejection threshold is what separates tolerance from negligence.** Skipping a few malformed rows is sensible; skipping a third of them produces a report that is confidently wrong."
    },

    { t: "h2", n: "04", text: "Backfills", id: "backfill" },

    { t: "viz",
      title: "A backfill is a long-running job that will be interrupted",
      caption: "Three years of daily partitions is a thousand units of work. Something will fail around unit 600 — a deploy, a bad day of data, an operator. The design question is what happens next.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="A backfill progress bar interrupted partway, with resume behaviour">
  <text x="24" y="30" class="s-label" style="fill:var(--crit)">Not resumable — one transaction over 1,000 days</text>
  <rect x="24" y="44" width="852" height="26" rx="5" style="fill:var(--surface-2);stroke:var(--border)"/>
  <rect x="24" y="44" width="512" height="26" rx="5" style="fill:var(--crit);opacity:.3"/>
  <text x="546" y="62" class="s-sub" style="fill:var(--crit)">✕ fails at day 600</text>
  <text x="24" y="94" class="s-sub" style="fill:var(--ink-3)">Everything rolls back. 14 hours of work discarded, and the next attempt starts from zero.</text>

  <text x="24" y="142" class="s-label" style="fill:var(--good)">Resumable — one transaction per day, state recorded</text>
  <rect x="24" y="156" width="852" height="26" rx="5" style="fill:var(--surface-2);stroke:var(--border)"/>
  <rect x="24" y="156" width="512" height="26" rx="5" style="fill:var(--good);opacity:.3"/>
  <text x="546" y="174" class="s-sub" style="fill:var(--warn)">✕ fails at day 600</text>
  <rect x="536" y="156" width="340" height="26" rx="5" style="fill:var(--surface-3)"/>
  <text x="24" y="206" class="s-sub" style="fill:var(--ink-3)">599 days are committed and recorded. Restarting skips them and continues from 600.</text>
  <text x="24" y="230" class="s-sub" style="fill:var(--ink-3)">Because each day is an upsert, re-running a completed day is harmless — so the resume point need not be exact.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the shape that survives being stopped", code: `
def backfill(start: date, end: date, *, rate_limit: float = 0.5) -> None:
    """Resumable, observable, and polite to the systems it reads."""
    days = pd.date_range(start, end, freq="D").date

    for day in days:
        # SKIP what is already done. This is what makes the job
        # restartable -- and it is a query, not a memory.
        if is_complete(day):
            continue

        try:
            with engine.begin() as conn:          # one day, one txn
                result = compute_day(day)
                upsert(conn, result)
                mark_complete(conn, day, rows=len(result))

        except TransientError:
            logger.warning("day_failed_retriable", extra={"day": day})
            continue          # move on; a later pass picks it up

        except Exception:
            logger.exception("day_failed", extra={"day": day})
            mark_failed(day)
            continue          # ONE bad day must not stop 999 others

        # Backfills run against production databases and APIs. Without
        # a pause, a backfill IS a denial-of-service against your own
        # systems -- and it will be blamed on something else.
        time.sleep(rate_limit)

    failed = list_failed(start, end)
    if failed:
        raise BackfillIncomplete(f"{len(failed)} days failed: {failed[:10]}")
`,
      hl: [8, 13, 23, 28],
      caption: "**Rate limiting is the part people omit.** A backfill that runs as fast as it can will saturate the database it reads from, and the resulting production incident is rarely attributed to the backfill."
    },

    { t: "h2", n: "05", text: "Detecting quality regressions", id: "quality" },

    { t: "code", lang: "python", title: "checks that compare against yesterday", code: `
# STATIC checks catch violations. They do not catch DRIFT -- data
# that is valid and wrong.

def check_against_history(today: pd.DataFrame, history: pd.DataFrame) -> None:
    # 1. VOLUME. A silent upstream failure usually shows here first:
    #    a partial file loads cleanly and contains a third of the rows.
    expected = history["row_count"].tail(28).median()
    if not 0.5 * expected <= len(today) <= 2.0 * expected:
        raise DataQualityError(
            f"row count {len(today)} vs a 28-day median of {expected:.0f}"
        )

    # 2. NULL RATE per column. A renamed upstream field produces a
    #    column that is suddenly 100% null and passes every schema
    #    check that allows nulls.
    for column in CRITICAL_COLUMNS:
        rate = today[column].isna().mean()
        baseline = history[f"{column}_null_rate"].tail(28).median()
        if rate > baseline + 0.10:
            raise DataQualityError(
                f"{column} null rate {rate:.1%} vs baseline {baseline:.1%}"
            )

    # 3. DISTRIBUTION. A currency or unit change upstream keeps every
    #    value valid and moves them all by a constant factor.
    median = today["total"].median()
    baseline = history["total_median"].tail(28).median()
    if not 0.7 * baseline <= median <= 1.3 * baseline:
        raise DataQualityError(
            f"median total {median:.2f} vs baseline {baseline:.2f}"
        )

    # 4. FRESHNESS. The most common failure of all: the pipeline
    #    succeeded and processed yesterday's file again.
    newest = today["created_at"].max()
    if newest < pd.Timestamp.now(tz="UTC") - pd.Timedelta(hours=26):
        raise DataQualityError(f"newest record is {newest} -- stale input")
`,
      hl: [7, 16, 25, 34],
      caption: "**Freshness is the check that catches the most incidents.** A pipeline that reprocesses yesterday's file succeeds, reports success, and produces a dashboard that simply stops moving — and nobody notices for days."
    },

    { t: "callout", kind: "trap", title: "Four ways a pipeline lies about success", body: [
      { t: "code", lang: "python", title: "each exits zero", numbered: false, code: `
# 1. IT PROCESSED AN EMPTY FILE. Zero rows in, zero rows out, exit 0.
#    The dashboard shows zero revenue and everyone assumes a bad day.
assert len(df) > 0, "input file is empty"

# 2. IT PROCESSED THE SAME FILE TWICE. Upstream did not deliver, so
#    yesterday's file is still there. See the freshness check.

# 3. IT SILENTLY DROPPED ROWS. An inner join, a groupby with NaN
#    keys, a filter with an unexpected type (Lesson 15.2). The count
#    changes and nothing raises.
assert len(out) == len(inp), f"row count changed: {len(inp)} -> {len(out)}"

# 4. IT WROTE TO THE WRONG PLACE. A stale environment variable, and
#    the job writes staging results into the production table --
#    successfully.
assert engine.url.host == settings.expected_db_host`},
      { t: "p", text: "**Exit code zero means the code did not crash.** It says nothing about whether the output is correct, and a pipeline without output assertions is a pipeline whose success signal is meaningless." }
    ]},

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make a pipeline safe to re-run",
      difficulty: "advanced",
      minutes: 40,
      body: [
        { t: "p", text: "This runs nightly. Last week it failed halfway, was re-run, and the finance team now reports that some days are double-counted while others are missing entirely. Nobody can tell which." },
        { t: "code", lang: "python", numbered: false, title: "pipelines/daily_revenue.py", code: `
def run(date_str):
    df = pd.read_parquet(f"s3://raw/orders/{date_str}.parquet")

    df = df[df["status"] == "paid"]
    df["revenue"] = df["quantity"] * df["unit_price"]

    daily = df.groupby("country")["revenue"].sum().reset_index()
    daily["date"] = date_str

    daily.to_sql("daily_revenue", engine, if_exists="append",
                 index=False)

    send_slack(f"Daily revenue loaded for {date_str}")

if __name__ == "__main__":
    run(sys.argv[1])`},
        { t: "p", text: "Rewrite it. Also give the procedure for repairing the existing damaged table — you cannot simply re-run everything." }
      ],
      requirements: [
        "List every problem, marking which caused the double-counting.",
        "Explain how days could go missing when nothing deleted them.",
        "Make the write idempotent.",
        "Add validation with a rejection path.",
        "Give the repair procedure for the existing table.",
        "Give the checks that would have caught this on the first run."
      ],
      hint: "The write mode explains the duplicates. For the missing days, ask what the input filter does and what happens if a file is absent.",
      solution: {
        lang: "python",
        title: "pipelines/daily_revenue.py",
        code: `# =========================================================================
# THE PROBLEMS
# =========================================================================
#
# ---- CAUSED THE DOUBLE-COUNTING -----------------------------------
#
# 1. if_exists="append" WITH NO NATURAL KEY.
#    Every run adds rows. A re-run of 2026-03-04 adds a SECOND set of
#    rows for that date, and nothing distinguishes them -- no run id,
#    no timestamp, no unique constraint. The table now contains two
#    rows for (2026-03-04, "UK") and any SUM over it is doubled for
#    that day.
#
#    This is the entire cause of the double-counting, and it is one
#    keyword argument.
#
# ---- CAUSED THE MISSING DAYS --------------------------------------
#
# 2. A MISSING INPUT FILE RAISES, AND NOTHING RECORDS THE FAILURE.
#    read_parquet on an absent key raises. The process exits non-zero,
#    the scheduler may or may not alert, and NO RECORD EXISTS that
#    the day was attempted. So the day is simply absent, and the only
#    way to discover it is to notice a gap in the output.
#
# 3. NO ROW-COUNT CHECK ON A DAY WITH NO PAID ORDERS.
#    If the status filter matches nothing, groupby returns an EMPTY
#    frame, to_sql writes zero rows successfully, and Slack reports
#    success. That day is missing from the table and the pipeline
#    said it worked.
#
#    Note this is indistinguishable in the output from a genuinely
#    zero-revenue day, which is why an explicit assertion is needed
#    rather than an inspection.
#
#    TOGETHER, 2 AND 3 EXPLAIN THE MISSING DAYS. Nothing deleted
#    them; they were never written, and nothing noticed.
#
# ---- OTHER ---------------------------------------------------------
#
# 4. NO VALIDATION. A null unit_price makes revenue NaN, and NaN sums
#    to NaN -- so one bad row makes a whole country's revenue NaN,
#    which then propagates into every total.
#
# 5. NO SCHEMA CHECK ON THE INPUT. A renamed upstream column
#    ("unit_price" -> "price") gives a KeyError, which at least
#    fails; a column that changes MEANING (pence to pounds) does not
#    fail at all and silently changes every number by 100x.
#
# 6. date_str IS AN UNVALIDATED STRING FROM argv. "2026-3-4",
#    "yesterday" or a typo produces a wrong S3 path or a wrongly
#    formatted date column that will not join to anything.
#
# 7. THE SLACK MESSAGE IS SENT REGARDLESS OF THE OUTCOME -- it is
#    after the write, so it reports success for a zero-row load.
#
# 8. NO TRANSACTION. to_sql may write partially on failure, leaving
#    an incomplete day that looks complete.
#
# 9. THE STATUS FILTER IS A SILENT ASSUMPTION. If upstream introduces
#    "settled" or "captured" as a new status value, those orders are
#    excluded and revenue drops with no error (Lesson 12.6 -- a new
#    enum value is breaking in practice).
#
# 10. NO STATE TABLE. There is no way to answer "which days have been
#     loaded?" without querying the output table itself, which is
#     exactly what is corrupted.
#
#
# =========================================================================
# THE REWRITE
# =========================================================================

import pandera.pandas as pa
from pandera.typing import DataFrame, Series


class RawOrder(pa.DataFrameModel):
    """The contract with upstream. Problems 4, 5 and 9."""
    order_id: Series[int] = pa.Field(unique=True, gt=0)
    country: Series[str] = pa.Field(nullable=False)
    status: Series[str] = pa.Field(isin=VALID_STATUSES)
    quantity: Series[int] = pa.Field(gt=0, le=10_000)
    unit_price: Series[float] = pa.Field(ge=0, le=1_000_000,
                                         nullable=False)
    created_at: Series[pd.Timestamp] = pa.Field(nullable=False)

    class Config:
        strict = "filter"     # upstream may add columns; tolerate it
        coerce = True


def run(day: date) -> RunResult:
    """Idempotent, validated, recorded. Safe to run any number of
    times for any day, in any order."""

    run_id = uuid4()
    started = utcnow()

    # --- 1. record the ATTEMPT before doing anything (problem 2) ---
    # This is what makes a missing day discoverable: even a crash
    # leaves evidence that the day was tried.
    record_run_start(run_id, day, started)

    try:
        # --- 2. read, and treat a missing file as a FAILURE, not an
        #        absence (problem 2) --------------------------------
        path = f"s3://raw/orders/{day:%Y-%m-%d}.parquet"
        if not s3_exists(path):
            raise InputNotReady(f"no input for {day}: {path}")

        df = pd.read_parquet(path)

        # --- 3. validate, with a rejection path (problem 4) --------
        outcome = validate_with_rejects(df, RawOrder, day)

        # --- 4. freshness. The most common silent failure: upstream
        #        did not deliver and yesterday's file is still there.
        newest = outcome.valid["created_at"].max()
        if newest.date() < day:
            raise DataQualityError(
                f"newest record is {newest}, expected data for {day} "
                f"-- upstream likely did not deliver"
            )

        # --- 5. transform -----------------------------------------
        paid = outcome.valid[outcome.valid["status"] == "paid"]
        paid = paid.assign(revenue=paid["quantity"] * paid["unit_price"])

        daily = (
            paid.groupby("country", dropna=False)["revenue"]   # 15.2
                .sum()
                .reset_index()
                .assign(day=day, run_id=run_id, computed_at=utcnow())
        )

        # --- 6. assert the OUTPUT before writing (problem 3) -------
        # A zero-row result is either a real zero-revenue day or a
        # broken input. Refuse to guess.
        if daily.empty:
            raise DataQualityError(
                f"{day}: no paid orders among {len(outcome.valid)} valid "
                f"rows -- check the status values"
            )
        assert not daily["revenue"].isna().any(), "NaN revenue"
        assert (daily["revenue"] >= 0).all(), "negative revenue"

        # Compare against history -- catches drift that passes every
        # static check.
        check_against_history(daily, day)

        # --- 7. IDEMPOTENT WRITE (problem 1) ----------------------
        with engine.begin() as conn:              # problem 8
            upsert_daily_revenue(conn, daily)
            record_run_success(conn, run_id, day, rows=len(daily),
                               revenue=float(daily["revenue"].sum()))

    except InputNotReady as exc:
        # Distinguish "not yet" from "broken": the scheduler can
        # retry this, and it should not page anyone at 02:00.
        record_run_failure(run_id, day, str(exc), retriable=True)
        logger.warning("input_not_ready", extra={"day": str(day)})
        raise

    except Exception as exc:
        record_run_failure(run_id, day, str(exc), retriable=False)
        logger.exception("run_failed", extra={"day": str(day)})
        # Problem 7: notify on FAILURE, which is the case anyone
        # actually needs to hear about.
        send_slack(f":x: daily_revenue FAILED for {day}: {exc}")
        raise

    send_slack(
        f":white_check_mark: daily_revenue {day}: "
        f"{len(daily)} countries, {daily['revenue'].sum():,.2f} revenue, "
        f"{outcome.stats['rejected']} rows rejected"
    )
    return RunResult(run_id=run_id, day=day, rows=len(daily))


# ---- the idempotent write ------------------------------------------

def upsert_daily_revenue(conn, daily: pd.DataFrame) -> None:
    """ON CONFLICT on the NATURAL KEY (day, country).

    A re-run REPLACES that day's rows rather than adding to them, so
    running this a hundred times leaves the same state as running it
    once. Problem 1, fixed at the schema level rather than by
    remembering.
    """
    daily.to_sql("daily_revenue_staging", conn, if_exists="replace",
                 index=False)
    conn.execute(text("""
        INSERT INTO daily_revenue (day, country, revenue, run_id, computed_at)
        SELECT day, country, revenue, run_id, computed_at
        FROM   daily_revenue_staging
        ON CONFLICT (day, country) DO UPDATE SET
            revenue     = EXCLUDED.revenue,
            run_id      = EXCLUDED.run_id,
            computed_at = EXCLUDED.computed_at
    """))


# The constraint that makes the upsert possible AND makes the
# original bug impossible to reintroduce:
#
#   ALTER TABLE daily_revenue
#       ADD CONSTRAINT daily_revenue_day_country_key
#       UNIQUE (day, country);
#
# With this in place, if_exists="append" would have RAISED on the
# second run instead of silently duplicating. The schema is the
# defence; the code is the convenience (Lesson 13.2).


# ---- entry point ---------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    # A real date type, not a string (problem 6).
    parser.add_argument("--day", type=date.fromisoformat, required=True)
    parser.add_argument("--end", type=date.fromisoformat)
    args = parser.parse_args()

    if args.end:
        backfill(args.day, args.end)
    else:
        run(args.day)


# =========================================================================
# REPAIRING THE EXISTING TABLE
# =========================================================================
#
# You cannot simply re-run everything: the raw files for some days may
# no longer exist, and a blind re-run would not fix days that are
# missing because their input was never delivered.
#
# --- STEP 1: measure the damage. Do not guess. ---------------------
#
#   -- Which (day, country) pairs are duplicated, and by how much?
#   SELECT day, country, count(*) AS copies, sum(revenue) AS overstated
#   FROM   daily_revenue
#   GROUP  BY day, country
#   HAVING count(*) > 1
#   ORDER  BY day;
#
#   -- Which days are missing entirely?
#   SELECT d::date AS missing_day
#   FROM   generate_series('2026-01-01'::date, current_date - 1,
#                          '1 day') AS d
#   WHERE  NOT EXISTS (
#       SELECT 1 FROM daily_revenue WHERE day = d::date);
#
# Write both results down before changing anything. This is the
# evidence finance will ask for.
#
# --- STEP 2: snapshot before touching it. -------------------------
#
#   CREATE TABLE daily_revenue_backup_20260905 AS
#       SELECT * FROM daily_revenue;
#
# Non-negotiable. Every step below is reversible only because of it.
#
# --- STEP 3: deduplicate. ------------------------------------------
#
# THE DIFFICULTY: with no run_id and no computed_at on the existing
# rows, duplicate rows are INDISTINGUISHABLE. There is no way to know
# which copy came from which run. Two cases:
#
#   (a) The duplicates have IDENTICAL revenue -- the re-run computed
#       the same answer. Keeping either copy is correct:
#
#         DELETE FROM daily_revenue a
#         USING daily_revenue b
#         WHERE a.ctid < b.ctid           -- ctid: the physical row id
#           AND a.day = b.day
#           AND a.country = b.country
#           AND a.revenue = b.revenue;
#
#   (b) The duplicates DIFFER -- the input changed between runs. You
#       cannot tell which is right from this table. Recompute those
#       days from the raw files (step 4) and treat the table as
#       unreliable for them.
#
#         SELECT day, country, array_agg(revenue)
#         FROM   daily_revenue
#         GROUP  BY day, country HAVING count(DISTINCT revenue) > 1;
#
# --- STEP 4: add the constraint, so it cannot recur. ---------------
#
#   ALTER TABLE daily_revenue
#       ADD CONSTRAINT daily_revenue_day_country_key
#       UNIQUE (day, country);
#
# This must come AFTER deduplication -- it will fail while duplicates
# exist, which is a useful confirmation that step 3 finished.
#
#   ALTER TABLE daily_revenue ADD COLUMN run_id uuid;
#   ALTER TABLE daily_revenue ADD COLUMN computed_at timestamptz;
#
# --- STEP 5: recompute the affected days with the NEW code. --------
#
#   python -m pipelines.daily_revenue --day 2026-03-04 --end 2026-03-11
#
# Now idempotent, so this is safe to run repeatedly. Days whose raw
# files are gone will fail as InputNotReady and be RECORDED as such
# -- which is the honest outcome. Do not fabricate them.
#
# --- STEP 6: reconcile and communicate. ---------------------------
#
#   SELECT b.day, b.revenue AS old, n.revenue AS new,
#          n.revenue - b.revenue AS delta
#   FROM   daily_revenue_backup_20260905 b
#   JOIN   daily_revenue n USING (day, country)
#   WHERE  b.revenue <> n.revenue
#   ORDER  BY abs(n.revenue - b.revenue) DESC;
#
# Give finance this table. They need to know which figures they
# previously reported were wrong and by how much -- restating a
# number quietly is worse than the original error.
#
# --- STEP 7: only then drop the backup, and not for a month. ------


# =========================================================================
# THE CHECKS THAT WOULD HAVE CAUGHT THIS ON RUN ONE
# =========================================================================

def test_running_twice_produces_the_same_state():
    """THE test. Everything else in this lesson is downstream of it."""
    run(date(2026, 3, 4))
    first = query("SELECT * FROM daily_revenue ORDER BY country")

    run(date(2026, 3, 4))
    second = query("SELECT * FROM daily_revenue ORDER BY country")

    assert len(first) == len(second)
    pd.testing.assert_frame_equal(
        first.drop(columns=["run_id", "computed_at"]),
        second.drop(columns=["run_id", "computed_at"]),
    )


def test_the_unique_constraint_prevents_duplicate_days():
    """The schema-level guarantee. With this, the original code would
    have raised on its second run instead of corrupting the table."""
    insert_daily_revenue(day=date(2026, 3, 4), country="UK", revenue=100)

    with pytest.raises(IntegrityError):
        insert_daily_revenue(day=date(2026, 3, 4), country="UK",
                             revenue=200)


def test_a_missing_input_file_is_recorded_as_a_failure():
    """Problem 2. The day must not simply be absent."""
    with pytest.raises(InputNotReady):
        run(date(2026, 3, 4))

    assert run_status(date(2026, 3, 4)) == "failed_retriable"


def test_a_day_with_no_paid_orders_fails_loudly():
    """Problem 3. Zero rows written with a success message is how the
    days went missing."""
    seed_orders(day=date(2026, 3, 4), statuses=["pending", "cancelled"])

    with pytest.raises(DataQualityError, match="no paid orders"):
        run(date(2026, 3, 4))


def test_a_stale_input_file_is_rejected():
    """Upstream did not deliver and yesterday's file is still there --
    the most common silent pipeline failure there is."""
    write_input(day=date(2026, 3, 4), records_dated=date(2026, 3, 3))

    with pytest.raises(DataQualityError, match="upstream likely"):
        run(date(2026, 3, 4))


def test_rows_with_null_prices_are_rejected_not_propagated():
    """Problem 4. One NaN made a whole country's revenue NaN."""
    seed_orders(day=date(2026, 3, 4), include_null_price=True)

    run(date(2026, 3, 4))

    assert query_revenue(date(2026, 3, 4), "UK") is not None
    assert rejected_count(date(2026, 3, 4)) == 1


def test_every_day_in_a_range_is_either_loaded_or_recorded_failed():
    """The completeness invariant. A day that is neither is invisible,
    which is exactly what happened."""
    backfill(date(2026, 3, 1), date(2026, 3, 31))

    for day in pd.date_range("2026-03-01", "2026-03-31").date:
        assert run_status(day) in ("succeeded", "failed_retriable",
                                   "failed"), f"{day} has no record"`,
        notes: [
          { t: "p", text: "**`if_exists=\"append\"` with no unique constraint is the whole double-counting bug.** A re-run adds a second set of rows for the same day, nothing distinguishes them, and every subsequent sum is doubled for that date." },
          { t: "p", text: "**The missing days have two causes, and neither deleted anything.** A missing input file raises with no record that the day was attempted, and a day with no paid orders writes zero rows and reports success — so both are absences nobody can distinguish from a day that was never scheduled." },
          { t: "callout", kind: "insight", title: "Record the attempt before doing the work", body: [
            { t: "p", text: "A run-state table written at the start is what makes a missing day discoverable. Without it, the only evidence a day existed is the output row — which is precisely what is absent when something went wrong." },
            { t: "p", text: "It also gives the backfill its resume point and turns \"which days are loaded?\" into a query against a table that is not the one being corrupted." }
          ]},
          { t: "p", text: "**The unique constraint is the real fix; the upsert is the convenience.** With `UNIQUE (day, country)` in place the original code would have raised on its second run instead of silently duplicating — the schema enforces what the code merely intends." },
          { t: "p", text: "**Duplicate rows with differing revenue cannot be repaired from the table alone.** With no `run_id` or `computed_at` there is no way to know which copy is current, which is why step 4 adds those columns and step 5 recomputes from source." },
          { t: "p", text: "**Days whose raw files are gone should fail and be recorded as failed.** Fabricating a plausible number is worse than a documented gap, and finance needs the reconciliation table in step 6 more than they need every cell populated." },
          { t: "p", text: "**The freshness check catches the most common silent failure of all**: upstream does not deliver, yesterday's file is still in place, the pipeline succeeds, and the dashboard simply stops moving." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A pipeline ran nightly for two years without incident. Then a schema change upstream renamed a column, and the pipeline's `df.get(\"amount\", 0)` quietly returned zeros." },
      { t: "p", text: "**Revenue reported as zero for eleven days before anyone noticed.** Every run exited zero, every dashboard rendered, and the numbers were plausible enough during a quiet period that nobody questioned them." },
      { t: "p", text: "**A volume check against the 28-day median would have caught it on night one.** Not a schema check — the schema was still valid — but a comparison against what yesterday looked like." },
      { t: "p", text: "**Static validation catches violations; comparison against history catches drift.** You need both, and the second is the one most pipelines lack." }
    ]}
  ],

  takeaways: [
    "**Design for the second run.** A pipeline will be re-run after failures, fixes and corrected inputs, and nearly every design property follows from that.",
    "**Idempotence is a property of the write, not the computation.** A deterministic transform with an appending write is not idempotent.",
    "**Upsert on a natural key**, and add the unique constraint — the schema makes duplication impossible, where code only intends to avoid it.",
    "**Partition by the granularity you re-run at**, or a fix forces you to rewrite far more than changed.",
    "**Validate hard at ingest, lightly in the middle, and again before publishing.** Data that passed the contract does not need re-checking at every step.",
    "**Use `lazy=True` so validation reports every violation at once**, and name the offending rows in the error.",
    "**One bad row must not stop the batch, and must not be silently dropped.** Route rejects to a table with a reason, and set a rate threshold.",
    "**A backfill will be interrupted.** One transaction per unit, a completion record, and a skip check make it resumable.",
    "**Rate limit backfills.** Running as fast as possible turns a backfill into a denial-of-service against your own database.",
    "**Record the attempt before doing the work**, so a day that failed is distinguishable from a day nobody ran.",
    "**Exit code zero means the code did not crash** — assert row counts, non-null outputs and the destination before believing it.",
    "**Static validation catches violations; comparison against history catches drift.** Volume, null rates, distributions and freshness.",
    "**Freshness is the check that catches the most incidents** — reprocessing yesterday's file succeeds, reports success, and freezes the dashboard.",
    "**When repairing corrupted data, snapshot first, measure the damage, and give consumers the reconciliation.** A quiet restatement is worse than the original error."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A pipeline writes with `if_exists=\"append\"` and is re-run after a failure. What happens?",
        options: [
          "The write fails because the rows already exist",
          "That day's rows are added a second time, with nothing distinguishing them, so every downstream sum is doubled for that day",
          "Pandas deduplicates on the index",
          "Only new rows are appended"
        ],
        answer: 1,
        why: "Idempotence is a property of the write. The fix is an upsert on a natural key plus a unique constraint — with the constraint in place, the appending write would have raised on the second run instead of silently corrupting the table."
      },
      {
        stem: "A daily job produces zero rows because the status filter matched nothing. What does the pipeline report?",
        options: [
          "A failure, since the output is empty",
          "Success — zero rows are written without error, so the day is silently missing and indistinguishable from a genuine zero-revenue day",
          "A warning from the database",
          "It retries automatically"
        ],
        answer: 1,
        why: "Exit code zero means the code did not crash, not that the output is correct. An explicit assertion on the output — non-empty, non-null, within a plausible range — is what turns this into a failure someone can act on."
      },
      {
        stem: "Upstream fails to deliver, so yesterday's file is still in place. Which check catches this?",
        options: [
          "A schema validation — the columns will differ",
          "A freshness check comparing the newest record's timestamp against the expected date",
          "A row-count check — the file is smaller",
          "A null-rate check"
        ],
        answer: 1,
        why: "The file is perfectly valid and the row count is normal, so every static check passes. It is the most common silent pipeline failure: the job succeeds, reports success, and the dashboard stops moving without anyone noticing for days."
      },
      {
        stem: "A backfill over 1,000 days fails at day 600 inside one transaction. What is the design problem?",
        options: [
          "The transaction isolation level is too strict",
          "Everything rolls back, so 14 hours of work is discarded and the next attempt starts from zero",
          "The database ran out of connections",
          "Backfills should not use transactions"
        ],
        answer: 1,
        why: "One transaction per unit of work, plus a completion record and a skip check, makes the job resumable — and because each unit is an upsert, re-running a completed day is harmless, so the resume point does not need to be exact."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "What makes a data pipeline idempotent?",
        strong: "Running it twice leaves the same state as running it once. That means an upsert on a natural key rather than an append, and a unique constraint so the schema enforces it rather than the code intending it.",
        answer: [
          { t: "p", text: "The distinction between the write and the computation is the substance — a deterministic transform with an appending write is not idempotent." },
          { t: "p", text: "Naming the constraint as the real fix shows you think in terms of guarantees rather than conventions." },
          { t: "p", text: "The partitioned-overwrite equivalent for files demonstrates you can apply the idea outside a database." }
        ]
      },
      {
        level: "advanced",
        q: "How do you know a pipeline succeeded?",
        strong: "Not from the exit code. Assert the output: row count against history, no unexpected nulls, distributions within a band of the recent baseline, and that the input was actually fresh.",
        answer: [
          { t: "p", text: "\"Exit zero means it did not crash\" is a memorable framing that reorients the whole answer." },
          { t: "p", text: "Distinguishing static validation from comparison against history is the point most people miss — drift passes every schema check." },
          { t: "p", text: "Freshness as the single highest-value check is a specific worth offering, since it catches the most common silent failure." }
        ]
      },
      {
        level: "advanced",
        q: "How would you design a backfill over three years of daily data?",
        strong: "One transaction per day, a completion record so it can resume, a skip check at the top, per-day failure isolation, and a rate limit so it does not saturate the systems it reads from.",
        answer: [
          { t: "p", text: "Assuming interruption rather than hoping against it is the right framing, and it drives every other choice." },
          { t: "p", text: "Rate limiting is the detail people omit, and the resulting production incident is rarely attributed to the backfill." },
          { t: "p", text: "Noting that idempotent writes make the resume point approximate — re-running a completed day is harmless — shows the design fits together." }
        ]
      }
    ]
  }
});

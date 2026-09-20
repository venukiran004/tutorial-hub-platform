/* ============================================================================
   LESSON 15.4 — Jupyter for Professionals
   ========================================================================= */
EC.receiveLesson({
  id: "15.4",

  lede: "A notebook is an excellent place to think and a poor place to keep anything. **Its defining feature — hidden mutable state that outlives any cell — is exactly what makes it unreproducible**, and every professional practice around notebooks exists to contain that one property.",

  objectives: [
    "Explain why execution order makes a notebook unreproducible",
    "Keep notebooks reviewable in version control",
    "Move code out of a notebook at the right moment",
    "Parameterise and run a notebook non-interactively",
    "Decide when the work should never have been a notebook"
  ],

  prerequisites: ["15.2"],

  blocks: [

    { t: "h2", n: "01", text: "The hidden state problem", id: "state" },

    {"kind": "steps", "title": "The hidden-state problem", "caption": "Cells run in the order you clicked, not the order on the page. A notebook that passes 'Restart and run all' is reproducible; one that does not is a collection of results nobody can regenerate.", "items": [{"label": "cell 3 defines df", "desc": "run first"}, {"label": "cell 1 uses df", "desc": "works — because of the order you ran them", "tone": "warn"}, {"label": "cell 3 edited, not re-run", "desc": "cell 1's result is now stale", "tone": "crit"}, {"label": "Restart kernel, Run all", "desc": "the only test of a notebook", "tone": "good"}], "t": "diagram", "id": "dg-15_4-01-0"},


    { t: "viz",
      title: "What the numbers in the margin mean",
      caption: "The cells are displayed top to bottom and were executed in the order shown. The reader sees a story; the kernel executed something else entirely, and only the kernel's version produced the output.",
      svg: `<svg viewBox="0 0 900 280" role="img" aria-label="A notebook whose cells were executed out of order">
  <g class="s-sub">
    <rect x="24" y="26" width="600" height="34" rx="5" style="fill:var(--surface-2);stroke:var(--border)"/>
    <text x="40" y="48" style="fill:var(--ink-3)">[1]</text>
    <text x="90" y="48">df = pd.read_csv("orders.csv")</text>

    <rect x="24" y="66" width="600" height="34" rx="5" style="fill:var(--surface-2);stroke:var(--border)"/>
    <text x="40" y="88" style="fill:var(--ink-3)">[7]</text>
    <text x="90" y="88">df = df[df.total &gt; 100]</text>

    <rect x="24" y="106" width="600" height="34" rx="5" style="fill:var(--surface-2);stroke:var(--border)"/>
    <text x="40" y="128" style="fill:var(--ink-3)">[3]</text>
    <text x="90" y="128">df["revenue"] = df.qty * df.price</text>

    <rect x="24" y="146" width="600" height="34" rx="5" style="fill:var(--surface-2);stroke:var(--crit)"/>
    <text x="40" y="168" style="fill:var(--crit)">[12]</text>
    <text x="90" y="168" style="fill:var(--crit)">df = df.drop(columns=["price"])</text>

    <rect x="24" y="186" width="600" height="34" rx="5" style="fill:var(--surface-2);stroke:var(--border)"/>
    <text x="40" y="208" style="fill:var(--ink-3)">[9]</text>
    <text x="90" y="208">result = df.groupby("country").revenue.sum()</text>
  </g>

  <text x="650" y="48" class="s-sub" style="fill:var(--good)">1st</text>
  <text x="650" y="88" class="s-sub" style="fill:var(--warn)">4th</text>
  <text x="650" y="128" class="s-sub" style="fill:var(--warn)">2nd</text>
  <text x="650" y="168" class="s-sub" style="fill:var(--crit)">6th</text>
  <text x="650" y="208" class="s-sub" style="fill:var(--warn)">5th</text>

  <text x="24" y="250" class="s-sub" style="fill:var(--crit)">Run top to bottom in a fresh kernel, cell [3] raises: "price" was dropped before groupby ran — but AFTER revenue was computed.</text>
  <text x="24" y="272" class="s-sub" style="fill:var(--ink-3)">The output you are reading was produced by a program that no longer exists anywhere.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the three failures that follow from it", code: `
# 1. A DELETED CELL WHOSE EFFECT REMAINS.
#    You define a helper, use it, then delete the cell. The function
#    is still in the kernel, so everything works -- until tomorrow,
#    when nothing does and there is no trace of what was missing.

# 2. AN OUT-OF-DATE VARIABLE.
df = load()            # [1]
df = clean(df)         # [2]
# ...you edit cell [1] and re-run only it. df is now the RAW frame,
# but every cell below was computed from the CLEAN one and their
# outputs still say so. The notebook looks consistent and is not.

# 3. A CELL THAT IS NOT IDEMPOTENT.
df = df.drop(columns=["price"])      # fine once
                                     # KeyError on the second run
df["total"] = df["total"] * 1.2      # silently applies VAT TWICE

# THE ONE HABIT THAT PREVENTS ALL THREE:
#   Restart the kernel and Run All, before you trust any result and
#   before you show it to anyone.
#
#   Kernel -> Restart & Run All
#
# If it does not run clean from top to bottom, the result is not
# reproducible -- including by you, tomorrow.
`,
      hl: [11, 15, 20],
      caption: "**Non-idempotent cells are the subtlest of the three.** `df[\"total\"] *= 1.2` produces a plausible number every time it runs, and the number is wrong by a factor that depends on how many times you pressed shift-enter."
    },

    { t: "h2", n: "02", text: "Notebooks in version control", id: "vcs" },

    { t: "table",
      head: ["Problem", "Why", "Fix"],
      rows: [
        ["Diffs are unreadable", "JSON with embedded outputs and metadata", "**`nbstripout`** — strip outputs on commit"],
        ["Merge conflicts are unresolvable", "Execution counts change on every run", "Strip those too"],
        ["Repository bloat", "A base64 PNG per plot, per commit", "Stripping fixes it"],
        ["**Secrets committed**", "An API key echoed in a cell output", "**Stripping, plus a secret scanner**"],
        ["Review is impossible", "Reviewers see JSON, not code", "`nbdime`, or `jupytext` pairing"]
      ],
      caption: "**The secret case is the one with lasting consequences.** A key printed in a cell output is committed inside the `.ipynb`, and git history is permanent (Lesson 14.7)."
    },

    { t: "code", lang: "bash", title: "the setup, once per repository", code: `
# 1. STRIP OUTPUTS AUTOMATICALLY ON COMMIT.
pip install nbstripout
nbstripout --install --attributes .gitattributes
# Adds a git filter. Outputs are removed from what is committed while
# staying in your working copy, so nothing changes in your session.

# 2. A READABLE DIFF, when you need to see one.
pip install nbdime
nbdime config-git --enable --global
git diff notebook.ipynb        # cell-by-cell, not JSON

# 3. PAIR WITH A .py FILE -- the strongest option for review.
pip install jupytext
jupytext --set-formats ipynb,py:percent notebook.ipynb
# Now notebook.ipynb and notebook.py stay in sync. Commit the .py;
# gitignore the .ipynb. Reviewers read Python, merges are ordinary
# text merges, and blame works.

# 4. IN PRE-COMMIT.
#   - repo: https://github.com/kynan/nbstripout
#     rev: 0.7.1
#     hooks: [{ id: nbstripout }]
`,
      hl: [3, 15, 17],
      caption: "**Jupytext pairing is the strongest of these.** Committing the `.py` means review, blame, merges and grep all behave normally, and the notebook becomes a rendering rather than the artefact."
    },

    { t: "h2", n: "03", text: "Graduating code out", id: "graduating" },

    { t: "ladder",
      title: "A cleaning function used across four notebooks",
      rungs: [
        { level: "bad", label: "Copy the cell",
          why: "Four copies that diverge. A bug fixed in one stays in three, and nobody knows which version produced which result — including the results already circulated.",
          code: `# In analysis_march.ipynb, analysis_april.ipynb, and two others:
def clean(df):
    df = df[df["status"] == "paid"]
    df["total"] = df["total"].fillna(0)
    return df
# Edited in one. Not the others.` },
        { level: "ok", label: "Import from another notebook",
          why: "It removes the duplication and adds a worse problem: importing a notebook executes every cell in it, including the plots and the ten-minute query. There is also no way to test it.",
          code: `import import_ipynb          # runs the whole notebook on import
from data_cleaning import clean` },
        { level: "best", label: "A package, imported and tested",
          why: "One implementation, testable, reviewable, versioned. The notebook keeps what notebooks are good at — narrative, plots, exploration — and the logic lives where logic belongs.",
          code: `# src/analytics/cleaning.py
def clean_orders(df: pd.DataFrame) -> pd.DataFrame:
    """Paid orders only, with missing totals treated as zero."""
    return (
        df.loc[df["status"] == "paid"]
          .assign(total=lambda d: d["total"].fillna(0))
    )

# tests/test_cleaning.py -- now possible
def test_missing_totals_become_zero(): ...

# In every notebook:
%load_ext autoreload
%autoreload 2                  # edits to the package take effect
                               # without restarting the kernel
from analytics.cleaning import clean_orders`,
          note: "**`%autoreload 2` is what makes this practical.** Without it, every edit to the package requires a kernel restart, and people go back to pasting cells." }
      ]
    },

    { t: "callout", kind: "insight", title: "The moment to extract", body: [
      { t: "code", lang: "python", title: "four signals", numbered: false, code: `
# 1. IT IS USED IN A SECOND NOTEBOOK.        -> extract now
# 2. IT HAS A BUG WORTH A TEST.              -> extract now
# 3. IT IS OVER ~20 LINES AND NOT A PLOT.    -> probably extract
# 4. SOMEONE ELSE ASKED HOW IT WORKS.        -> extract now

# WHAT STAYS IN THE NOTEBOOK, legitimately:
#   - loading and looking at data
#   - plots and their narrative
#   - one-off analysis with a written conclusion
#   - the sequence of steps, as documentation
#
# WHAT LEAVES:
#   - anything reused
#   - anything with edge cases worth testing
#   - anything scheduled
#   - anything another person depends on being correct`},
      { t: "p", text: "**The productive division: notebooks call functions, they do not define them.** A notebook that is mostly `def` statements has become a badly-versioned module with an unreliable execution order." }
    ]},

    { t: "h2", n: "04", text: "Notebooks that run unattended", id: "papermill" },

    { t: "code", lang: "python", title: "parameterised execution", code: `
# Tag ONE cell as "parameters" in the notebook's cell metadata.
# Papermill injects a new cell immediately after it with the values
# you pass, so the defaults below are what you get interactively.

# --- cell tagged "parameters" ---
month = "2026-03"
country = "UK"
output_path = "/tmp/report.html"


# Run it from the command line, or from a scheduler:
#   papermill report.ipynb output/report_2026_03.ipynb \\
#       -p month 2026-03 -p country UK
#
# The OUTPUT notebook is the artefact: it contains the parameters
# used, every cell's output, and the execution timestamps. That is a
# genuine advantage over a script -- the record of what happened is
# the same object as the result.

import papermill as pm

for month in months_to_process:
    pm.execute_notebook(
        "report.ipynb",
        f"output/report_{month}.ipynb",
        parameters={"month": month, "country": "UK"},
        kernel_name="python3",
    )
`,
      hl: [5, 13, 22],
      caption: "**The executed notebook as an artefact is the real argument for papermill.** For a report that a human reads, having the numbers, the plots and the parameters in one reviewable file beats a log and a CSV."
    },

    { t: "callout", kind: "tradeoff", title: "Notebook or script for a scheduled job", body: [
      { t: "table",
        head: ["", "Papermill notebook", "Python script"],
        rows: [
          ["Output artefact", "**Rich — plots, tables, narrative**", "Logs and files"],
          ["Testing", "Awkward", "**Ordinary**"],
          ["Debugging a failure", "Read the output notebook", "**Stack trace, py-spy**"],
          ["Version control", "Needs tooling", "**Nothing special**"],
          ["Right for", "**Reports a human reads**", "**Anything a system consumes**"]
        ]
      },
      { t: "p", text: "**Use a notebook when the output is for a person and a script when the output is for a system.** A monthly report with plots is a good notebook; a job that writes to a table other jobs depend on is not." },
      { t: "p", text: "**Either way, the logic lives in an importable package.** The notebook or script is a thin entry point, so the same tested code runs in both." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Rescue an unreproducible analysis",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "A colleague has left. Their notebook produced a revenue figure now used in a board paper, and nobody can reproduce it — the notebook raises on a fresh kernel." },
        { t: "code", lang: "python", numbered: false, title: "revenue_analysis.ipynb (execution counts shown)", code: `
[1]  import pandas as pd
     df = pd.read_csv("~/Downloads/orders_final_v3.csv")

[14] df = df[df["region"] == "EMEA"]

[3]  df["revenue"] = df["qty"] * df["price"]

[22] df = df.drop_duplicates(subset=["order_id"])

[8]  API_KEY = "sk_live_4f8a2b..."
     extra = fetch_from_api(API_KEY)

[19] df["total"] = df["revenue"] * 1.2

[11] print(f"Total revenue: {df['total'].sum():,.0f}")
     # Total revenue: 4,182,993`},
        { t: "p", text: "Diagnose why it cannot be reproduced, and give the plan to produce a figure the board can rely on." }
      ],
      requirements: [
        "List every reason this is unreproducible.",
        "Identify which cells changed the number in a way the order affects.",
        "Explain the immediate security action required.",
        "Give the reproducible rewrite.",
        "Say what you would tell the board about the existing figure.",
        "Give the practices that prevent a repeat."
      ],
      hint: "Read the execution counts as the actual order of events, and ask what `drop_duplicates` does after a VAT multiplication rather than before.",
      solution: {
        lang: "python",
        title: "the rescue",
        code: `# =========================================================================
# WHY IT CANNOT BE REPRODUCED
# =========================================================================
#
# THE ACTUAL EXECUTION ORDER, from the counts:
#
#   [1]  load
#   [3]  revenue = qty * price
#   [8]  fetch_from_api
#   [11] PRINT THE TOTAL          <- the board's number came from here
#   [14] filter to EMEA
#   [19] total = revenue * 1.2
#   [22] drop_duplicates
#
# READ THAT AGAIN: the printed figure was produced at [11], BEFORE
# the EMEA filter [14], BEFORE the VAT multiplication [19], and
# BEFORE deduplication [22].
#
# But cell [11] prints df['total'], and 'total' is only created at
# [19]. So [11] must have been run a SECOND time after [19] --
# except its count is 11, which means the displayed output is from
# the run at 11, when 'total' did not exist.
#
# EITHER the output shown is stale from an earlier version of the
# notebook that no longer exists, OR cells were edited after
# execution. Both mean the same thing:
#
#   THE NUMBER IN THE BOARD PAPER WAS NOT PRODUCED BY THIS CODE.
#
# The specific reasons, enumerated:
#
# 1. OUT-OF-ORDER EXECUTION. Top-to-bottom is not the order that
#    ran. A fresh kernel executes a different program.
#
# 2. THE INPUT FILE IS UNVERSIONED AND LOCAL.
#      ~/Downloads/orders_final_v3.csv
#    On a laptop that has left the building. There is no copy, no
#    checksum, no row count, and "final_v3" tells you there were at
#    least two other versions with different contents.
#    THIS ALONE MAKES THE FIGURE UNREPRODUCIBLE, whatever else is
#    fixed.
#
# 3. ORDER-DEPENDENT TRANSFORMS. Three cells whose result depends on
#    when they ran relative to each other:
#
#      drop_duplicates AFTER revenue is computed  -> same answer
#      drop_duplicates AFTER the *1.2             -> same answer
#      drop_duplicates BEFORE the EMEA filter     -> DIFFERENT answer
#          (a duplicate order_id split across regions is resolved
#           differently depending on which runs first)
#
#      The EMEA filter running before or after dedup changes which
#      duplicate row survives, and therefore the total.
#
# 4. NON-IDEMPOTENT CELLS.
#      df = df[df["region"] == "EMEA"]     -- safe to repeat
#      df["total"] = df["revenue"] * 1.2   -- OVERWRITES, so safe
#      df = df.drop_duplicates(...)        -- safe to repeat
#    ...but if [19] had been written as df["total"] *= 1.2, each
#    re-run would apply VAT again. It is one keystroke from a figure
#    that is 20% too high per shift-enter.
#
# 5. AN EXTERNAL API CALL WITH NO RECORD. fetch_from_api returns
#    whatever it returned that day. 'extra' is never used in the
#    printed calculation, which is its own question -- why is it
#    there?
#
# 6. NO ENVIRONMENT RECORD. No pandas version, no Python version.
#    Behaviour that differs between pandas 1.x and 2.x -- groupby
#    defaults, dtype inference -- would change the result silently.
#
# 7. THE OUTPUT IS COMMITTED BUT THE STATE IS NOT. The number is
#    visible; the program that produced it is not.
#
#
# =========================================================================
# IMMEDIATE SECURITY ACTION
# =========================================================================
#
#   API_KEY = "sk_live_4f8a2b..."
#
# A LIVE production key, hardcoded, in a notebook, committed to git.
#
# DO THIS FIRST, BEFORE ANY ANALYSIS WORK:
#
#   1. REVOKE THE KEY. Now, not after the investigation. Assume it is
#      compromised -- it is in git history, in every clone, in every
#      CI cache, and possibly in a notebook output cell too.
#
#   2. Issue a replacement with the MINIMUM scope the job needs, not
#      a like-for-like copy of an over-privileged key (Lesson 14.2).
#
#   3. Audit the provider's logs for the exposure window -- from the
#      commit date, not from today.
#
#   4. Note that rewriting git history does NOT undo this. Anyone who
#      cloned has it. Revocation is the only real remedy.
#
#   5. Add gitleaks to pre-commit and CI so the next one is caught
#      before it lands (Lesson 14.7).
#
#
# =========================================================================
# THE REPRODUCIBLE REWRITE
# =========================================================================

# --- src/analytics/revenue.py -- the logic, tested ----------------

VAT_RATE = Decimal("1.20")


def clean_orders(df: pd.DataFrame) -> pd.DataFrame:
    """Deduplicate BEFORE filtering, so the surviving row is chosen
    on a stable rule rather than on which filter ran first.

    keep="last" with an explicit sort makes the choice deterministic;
    the original's behaviour depended on file order.
    """
    return (
        df.sort_values(["order_id", "updated_at"])
          .drop_duplicates(subset=["order_id"], keep="last")
    )


def compute_revenue(df: pd.DataFrame, region: str) -> pd.DataFrame:
    """One function, one order of operations, written down."""
    df = clean_orders(df)                      # 1. dedup first
    df = df.loc[df["region"] == region]        # 2. then filter
    return df.assign(
        revenue=df["qty"] * df["price"],       # 3. then compute
        total=lambda d: d["revenue"] * float(VAT_RATE),
    )


def total_revenue(df: pd.DataFrame, region: str) -> float:
    return float(compute_revenue(df, region)["total"].sum())


# --- tests/test_revenue.py ----------------------------------------

def test_deduplication_happens_before_filtering():
    """The order-dependence bug, pinned. A duplicate order_id whose
    two rows have different regions must resolve the same way
    regardless of anything else."""
    df = frame([
        {"order_id": 1, "region": "EMEA", "updated_at": "2026-01-01",
         "qty": 1, "price": 100},
        {"order_id": 1, "region": "AMER", "updated_at": "2026-01-02",
         "qty": 1, "price": 200},
    ])

    # The later row wins, and it is AMER -- so EMEA gets nothing.
    assert total_revenue(df, "EMEA") == 0
    assert total_revenue(df, "AMER") == 240.0


def test_computing_twice_gives_the_same_answer():
    """Idempotence. The *= 1.2 failure mode, prevented."""
    df = sample_orders()

    assert total_revenue(df, "EMEA") == total_revenue(df, "EMEA")


def test_vat_is_applied_exactly_once():
    df = frame([{"order_id": 1, "region": "EMEA", "qty": 2,
                 "price": 50, "updated_at": "2026-01-01"}])

    assert total_revenue(df, "EMEA") == pytest.approx(120.0)


# --- notebooks/revenue_analysis.ipynb -- thin, and honest ---------
#
#   %load_ext autoreload
#   %autoreload 2
#
#   from analytics.revenue import total_revenue
#   from analytics.io import load_orders
#
#   # --- cell tagged "parameters" ---
#   INPUT = "s3://warehouse/orders/2026-03/"   # versioned, not ~/Downloads
#   REGION = "EMEA"
#
#   df = load_orders(INPUT)
#
#   # Record what was actually used, in the notebook itself.
#   print(f"rows:     {len(df):,}")
#   print(f"checksum: {file_checksum(INPUT)}")
#   print(f"pandas:   {pd.__version__}")
#   print(f"commit:   {git_sha()}")
#
#   revenue = total_revenue(df, REGION)
#   print(f"{REGION} revenue: {revenue:,.2f}")
#
# Six cells, no logic, and every input recorded. Restart & Run All
# gives the same number every time, on any machine.


# =========================================================================
# WHAT TO TELL THE BOARD
# =========================================================================
#
# Say plainly that the figure cannot be verified, and why, without
# either defending it or overstating the problem:
#
#   "The £4,182,993 figure cannot be reproduced. The analysis
#    depended on a local file that no longer exists and on an
#    execution order we cannot reconstruct, so we cannot confirm the
#    number is right OR wrong.
#
#    We have rebuilt the calculation from the warehouse data with a
#    documented method and tests. The verified figure for the same
#    period is £X, a difference of Y%.
#
#    The most likely source of the discrepancy is the order in which
#    deduplication and regional filtering were applied, which changes
#    which of a duplicated order's rows is counted.
#
#    Going forward, every figure in a board paper will cite a commit
#    and a data snapshot."
#
# DO NOT quietly substitute the new number. A restated figure with an
# explanation is recoverable; a silently changed one is not, and it
# is the difference between an error and a credibility problem
# (Lesson 14.9 -- the same principle as a postmortem).
#
# If the new figure is materially different and the board paper has
# been issued, that is a correction to raise, not a detail to manage.
#
#
# =========================================================================
# PREVENTING THE REPEAT
# =========================================================================
#
# 1. RESTART & RUN ALL before trusting or sharing any result. If it
#    does not run clean from a fresh kernel, the result does not
#    exist. This one habit prevents most of the above.
#
# 2. nbstripout in pre-commit -- readable diffs, and outputs
#    (including any echoed secret) never reach git.
#
# 3. gitleaks in pre-commit and CI -- the API key, caught before it
#    lands.
#
# 4. NO LOCAL FILES AS INPUTS. Read from a versioned location, and
#    print the checksum and row count in the notebook.
#
# 5. LOGIC IN A PACKAGE, notebooks call it. Then it is tested,
#    reviewed, versioned, and the same code runs everywhere.
#
# 6. RECORD THE ENVIRONMENT -- commit sha, library versions, input
#    checksum -- in the notebook output itself.
#
# 7. PAPERMILL FOR ANYTHING RECURRING, so the executed notebook with
#    its parameters is the artefact.
#
# 8. A CI CHECK that every committed notebook runs top to bottom:
#
#      pytest --nbmake notebooks/
#
#    This is the one that makes item 1 a guarantee rather than a
#    habit -- a notebook that cannot execute cleanly fails the build.`,
        notes: [
          { t: "p", text: "**The execution counts prove the printed figure was not produced by this code.** Cell [11] prints `df['total']`, but `total` is only created at [19] — so the output shown is either stale or from a version of the notebook that no longer exists." },
          { t: "p", text: "**The unversioned local input is independently fatal.** `~/Downloads/orders_final_v3.csv` is on a laptop that has left, with no checksum and no row count — and the filename admits there were at least two earlier versions with different contents." },
          { t: "callout", kind: "insight", title: "Dedup before or after the filter changes the answer", body: [
            { t: "p", text: "A duplicated `order_id` whose two rows carry different regions resolves differently depending on which operation runs first. Filtering to EMEA first keeps the EMEA row; deduplicating first may keep the AMER row and leave EMEA with nothing." },
            { t: "p", text: "The rewrite fixes the order in one function and pins it with a test, so the question stops being about execution order and becomes a documented decision." }
          ]},
          { t: "p", text: "**Revoke the key before doing any analysis work.** It is in git history, in every clone and in every CI cache; rewriting history does not undo that, and revocation is the only real remedy." },
          { t: "p", text: "**Tell the board the figure cannot be verified, rather than defending or quietly replacing it.** A restated number with an explanation is recoverable; a silently changed one turns an error into a credibility problem." },
          { t: "p", text: "**`pytest --nbmake notebooks/` is what turns Restart & Run All from a habit into a guarantee.** A committed notebook that cannot execute top to bottom fails the build, which is the only durable version of this discipline." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A data scientist's notebook produced a model that went into production. Six months later the model degraded and the team went to retrain it." },
      { t: "p", text: "**The notebook did not run.** Cells had been deleted, the feature engineering depended on a variable defined in a cell that no longer existed, and the input file had been overwritten. Nobody could reproduce the original model at all." },
      { t: "p", text: "**They rebuilt from scratch — six weeks — and the new model performed differently.** Not obviously worse, which was its own problem: there was no way to tell whether the difference was the code, the data, or a genuine change in the world." },
      { t: "p", text: "**Restart & Run All, once, before shipping, would have surfaced this in five minutes.** The habit is trivially cheap and the alternative is discovering it at the moment you most need the thing to work." }
    ]}
  ],

  takeaways: [
    "**A notebook's defining feature is hidden mutable state that outlives any cell**, and every practice around notebooks exists to contain it.",
    "**Execution counts are the real order of events.** Top-to-bottom is a story the reader infers, not what the kernel ran.",
    "**Restart & Run All before trusting or sharing any result.** If it does not run clean from a fresh kernel, the result is not reproducible by anyone, including you tomorrow.",
    "**Non-idempotent cells are the subtlest failure.** `df[\"total\"] *= 1.2` gives a plausible number that depends on how many times you pressed shift-enter.",
    "**A deleted cell's effects remain in the kernel**, so a notebook can work perfectly today and be missing a definition tomorrow.",
    "**Use `nbstripout`** — it makes diffs readable, prevents repository bloat, and keeps secrets echoed in outputs out of git history.",
    "**Pair with jupytext and commit the `.py`.** Review, blame, merges and grep then behave normally.",
    "**Notebooks call functions; they do not define them.** A notebook that is mostly `def` statements is a badly-versioned module.",
    "**Extract when code is used twice, has a bug worth a test, or someone asks how it works.**",
    "**`%autoreload 2` is what makes package extraction practical**, since edits take effect without a kernel restart.",
    "**Papermill's real advantage is the executed notebook as an artefact** — parameters, outputs and plots in one reviewable file.",
    "**Notebook when the output is for a person; script when it is for a system.** Either way the logic lives in a tested package.",
    "**Never read a local unversioned file.** Print the input path, checksum, row count and library versions in the notebook itself.",
    "**`pytest --nbmake` in CI turns Restart & Run All into a guarantee** rather than a habit people mean to follow."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A notebook's cells show execution counts [1], [14], [3], [22]. Why does this matter?",
        options: [
          "It affects rendering performance",
          "The kernel executed them in that order, so the displayed outputs were produced by a different program than the one a reader sees top to bottom",
          "Jupyter will renumber them on save",
          "It indicates the cells were copied from elsewhere"
        ],
        answer: 1,
        why: "The reader infers a story from the layout; the kernel executed something else, and only the kernel's version produced the outputs. Restarting and running all is the only way to confirm that what is displayed and what the code does are the same thing."
      },
      {
        stem: "Why use `nbstripout` on a repository containing notebooks?",
        options: [
          "It compresses notebooks for faster cloning",
          "It removes outputs before commit — making diffs readable, avoiding merge conflicts on execution counts, and keeping secrets echoed in cell outputs out of git history",
          "It converts notebooks to scripts",
          "It enforces cell execution order"
        ],
        answer: 1,
        why: "Outputs are the bulk of a notebook's JSON: base64 images, execution counts that change on every run, and occasionally an API key printed by a cell. Since git history is permanent, the secret case is the one with lasting consequences."
      },
      {
        stem: "When should code move out of a notebook into a package?",
        options: [
          "When the notebook exceeds 500 lines",
          "When it is used in a second notebook, has a bug worth testing, or someone asks how it works",
          "Only when it is scheduled to run",
          "Never — notebooks are self-contained by design"
        ],
        answer: 1,
        why: "The useful division is that notebooks call functions rather than defining them. A notebook that is mostly `def` statements is a module with an unreliable execution order and no tests, and copying cells between notebooks guarantees they will diverge."
      },
      {
        stem: "What is papermill's main advantage over a plain script for a recurring report?",
        options: [
          "It executes faster than a script",
          "The executed notebook is the artefact — parameters, outputs, plots and timestamps in one reviewable file",
          "It handles retries automatically",
          "It removes the need for version control"
        ],
        answer: 1,
        why: "For output a human reads, having the record of what happened be the same object as the result is genuinely better than a log plus a CSV. For output a system consumes, a script wins on testing, debugging and version control."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why are notebooks hard to reproduce?",
        strong: "Hidden state. Cells can run in any order, a deleted cell's effects persist in the kernel, and a re-run cell can produce a different result from the output displayed above it.",
        answer: [
          { t: "p", text: "Naming Restart & Run All as the one habit that addresses all of it is the practical answer, and it costs nothing." },
          { t: "p", text: "The non-idempotent cell is the example worth giving — a plausible number that depends on how many times you pressed shift-enter." },
          { t: "p", text: "Mentioning `pytest --nbmake` in CI shows you know how to make the habit enforceable rather than aspirational." }
        ]
      },
      {
        level: "advanced",
        q: "How do you use notebooks in a professional codebase?",
        strong: "Logic in a tested package, notebooks as thin callers. `nbstripout` in pre-commit, jupytext pairing so the `.py` is what gets reviewed, and papermill for anything recurring.",
        answer: [
          { t: "p", text: "\"Notebooks call functions, they do not define them\" is a memorable formulation of the division." },
          { t: "p", text: "`%autoreload 2` is the small detail that makes the discipline survivable, and its absence is why people go back to pasting cells." },
          { t: "p", text: "Distinguishing notebooks for human output from scripts for system output shows judgement rather than a blanket rule." }
        ]
      },
      {
        level: "core",
        q: "A colleague's analysis cannot be reproduced. What do you do?",
        strong: "Establish what is recoverable: the code, the input, and the environment. If the input was a local unversioned file, the figure cannot be verified — say so plainly and rebuild with a documented method.",
        answer: [
          { t: "p", text: "Being willing to say a number cannot be verified, rather than defending or quietly replacing it, is the answer that shows integrity." },
          { t: "p", text: "Recognising the unversioned input as independently fatal shows you can identify which problem dominates." },
          { t: "p", text: "Closing with the practices that prevent a repeat turns an incident into a process improvement, which is what the question is testing." }
        ]
      }
    ]
  }
});

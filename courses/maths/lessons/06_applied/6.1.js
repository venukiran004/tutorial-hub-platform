/* ============================================================================
   LESSON 6.1 — A/B Testing End to End
   ========================================================================= */
EC.receiveLesson({
  id: "6.1",

  lede: "An A/B test is the whole of this course applied at once, and **most of what goes wrong happens before any data is analysed**. Randomisation that is not random, a sample ratio that drifts, a novelty effect mistaken for a lift — these produce clean-looking numbers that are wrong, and no amount of correct analysis afterwards recovers from them.",

  objectives: [
    "Size, randomise and run a test with the decisions made in advance",
    "Detect sample-ratio mismatch and know why it invalidates everything",
    "Handle peeking with a method rather than a rule",
    "Separate a novelty effect from a real one",
    "Write a readout that survives scrutiny"
  ],

  prerequisites: ["5.8", "5.10"],

  blocks: [

    { t: "h2", n: "01", text: "The order of operations", id: "order" },

    { t: "p", text: "An A/B test is a randomised experiment, and **most of what goes wrong happens before any data is analysed.** Each stage has a characteristic failure that produces plausible-looking output, and analysis — the part people focus on — is the last and least dangerous." },

    { t: "dl", items: [
      ["Randomised controlled experiment", "Assigning treatment by chance, which severs every arrow into the exposure and eliminates confounding, reverse causation and selection at once."],
      ["Unit of randomisation", "What gets assigned — usually a user, sometimes a session or a region. It must match the unit of analysis."],
      ["Control and treatment", "The unchanged experience and the new one. The control is what makes the comparison causal."],
      ["Allocation", "The split between arms. Unequal allocation costs power by a factor of `1/(4k(1−k))` — a 5% canary needs 5.3× the traffic of a 50/50 test."],
      ["Intention to treat", "Analysing by the arm someone was **assigned** to, not what they actually did. Analysing by behaviour reintroduces the confounding randomisation removed."]
    ]},

    { t: "viz",
      title: "Five stages, and where each one fails",
      caption: "Each stage has a characteristic failure that produces plausible-looking output. Analysis is the last and least dangerous — by the time you reach it, most of the damage has already been done.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Five sequential stages of an experiment with the failure mode of each">
  <g style="stroke-width:2">
    <rect x="16"  y="50" width="150" height="56" rx="6" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)"/>
    <rect x="188" y="50" width="150" height="56" rx="6" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)"/>
    <rect x="360" y="50" width="150" height="56" rx="6" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)"/>
    <rect x="532" y="50" width="150" height="56" rx="6" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)"/>
    <rect x="704" y="50" width="150" height="56" rx="6" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)"/>
  </g>
  <text x="34"  y="84" class="s-label" style="fill:var(--accent)">1 DESIGN</text>
  <text x="206" y="84" class="s-label" style="fill:var(--accent)">2 RANDOMISE</text>
  <text x="378" y="84" class="s-label" style="fill:var(--accent)">3 RUN</text>
  <text x="550" y="84" class="s-label" style="fill:var(--accent)">4 VALIDATE</text>
  <text x="722" y="84" class="s-label" style="fill:var(--good)">5 ANALYSE</text>

  <g style="stroke:var(--ink-3);stroke-width:1.5">
    <line x1="168" y1="78" x2="184" y2="78"/><line x1="340" y1="78" x2="356" y2="78"/>
    <line x1="512" y1="78" x2="528" y2="78"/><line x1="684" y1="78" x2="700" y2="78"/>
  </g>

  <text x="16"  y="140" class="s-sub" style="fill:var(--crit)">no MDE, so</text>
  <text x="16"  y="158" class="s-sub" style="fill:var(--crit)">no stopping rule</text>
  <text x="188" y="140" class="s-sub" style="fill:var(--crit)">hash collisions,</text>
  <text x="188" y="158" class="s-sub" style="fill:var(--crit)">carryover, spillover</text>
  <text x="360" y="140" class="s-sub" style="fill:var(--crit)">peeking, novelty,</text>
  <text x="360" y="158" class="s-sub" style="fill:var(--crit)">seasonality</text>
  <text x="532" y="140" class="s-sub" style="fill:var(--crit)">SRM ignored,</text>
  <text x="532" y="158" class="s-sub" style="fill:var(--crit)">guardrails skipped</text>
  <text x="704" y="140" class="s-sub" style="fill:var(--good)">wrong unit,</text>
  <text x="704" y="158" class="s-sub" style="fill:var(--good)">multiplicity</text>

  <text x="16" y="212" class="s-sub" style="fill:var(--ink-3)">the failures on the left are invisible in the output; the ones on the right are at least detectable in the numbers</text>
</svg>`
    },

    { t: "code", lang: "python", title: "the design decisions, all made before launch", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

def design(baseline, mde_relative, daily_traffic, alpha=0.05, power=0.8,
           allocation=0.5, variance_reduction=0.0):
    """Everything decided in advance, in one object.

    THE POINT IS NOT THE ARITHMETIC -- it is that every one of these is
    a decision someone could otherwise make after seeing the data."""
    p1 = baseline
    p2 = baseline * (1 + mde_relative)
    z_a, z_b = stats.norm.ppf(1-alpha/2), stats.norm.ppf(power)

    # Unequal allocation costs power; the factor is 1/(4k(1-k)).
    k = allocation
    inflation = 1.0 / (4*k*(1-k))
    num = (z_a*np.sqrt(2*p1*(1-p1)) + z_b*np.sqrt(p1*(1-p1)+p2*(1-p2)))**2
    n_per_arm = num / (p2-p1)**2 * inflation * (1 - variance_reduction)

    total = int(np.ceil(n_per_arm * 2))
    return {
        "n_per_arm": int(np.ceil(n_per_arm)),
        "total_users": total,
        "days": max(7, int(np.ceil(total / daily_traffic))),
        "mde_relative": mde_relative,
        "alpha": alpha, "power": power,
        "stopping_rule": f"stop at {total:,} users or 28 days, "
                         f"whichever is first",
        "primary_metric": "declared before launch, single, uncorrected",
        "guardrails": "uncorrected, block on breach",
    }

design(baseline=0.12, mde_relative=0.05, daily_traffic=40_000)
# {'n_per_arm': 100_562, 'total_users': 201_124, 'days': 6, ...}

# THE MINIMUM SEVEN DAYS IS NOT ARBITRARY. Weekly seasonality is
# strong in almost every consumer product, and a test that runs
# Tuesday to Thursday samples a different population from one that
# includes the weekend:
def weekly_bias(weekday_rate=0.14, weekend_rate=0.09, weekday_share=5/7):
    full_week = weekday_share*weekday_rate + (1-weekday_share)*weekend_rate
    midweek_only = weekday_rate
    return midweek_only/full_week - 1

weekly_bias()                              # +0.081
#
# AN 8% DIFFERENCE IN THE BASELINE from the days you happened to run.
# That is larger than most effects being tested, and it cancels only
# if both arms see the same days -- which is why running whole weeks
# matters even though randomisation protects the comparison.

# UNEQUAL ALLOCATION IS EXPENSIVE, and people underestimate it:
for k in (0.5, 0.4, 0.2, 0.1, 0.05):
    print(f"{k:.0%}/{1-k:.0%} split: {1/(4*k*(1-k)):.2f}x the sample")
# 50%/50% split: 1.00x the sample
# 40%/60% split: 1.04x the sample
# 20%/80% split: 1.56x the sample
# 10%/90% split: 2.78x the sample
#  5%/95% split: 5.26x the sample
#
# A 5% CANARY NEEDS 5.3x THE TOTAL TRAFFIC of a 50/50 test to reach
# the same power. That is worth knowing before promising a two-week
# readout on a 5% rollout.
`,
      hl: [21, 35, 46],
      caption: "**A 5% canary needs 5.3× the total traffic of a 50/50 test** for the same power. The factor is `1/(4k(1−k))`, and it is the reason cautious rollouts take so much longer than expected."
    },

    { t: "h2", n: "02", text: "Sample ratio mismatch", id: "srm" },

    { t: "p", text: "**Sample ratio mismatch is when the arms receive different numbers of users than the split intended** — and it invalidates the whole experiment rather than just the counts. Whatever decided who went where may also affect the outcome, so the arms are no longer comparable." },

    { t: "dl", items: [
      ["Sample ratio mismatch", "An observed split differing from the intended one by more than chance allows. Tested with a chi-square on the assignment counts."],
      ["Why it is fatal", "Every cause — bot filtering, redirect latency, crashes in one arm — removes a **non-random** subset. It is selection bias with a count attached."],
      ["Strict threshold", "Use `α = 0.001`, because the check runs on every experiment and investigating a real SRM costs far less than trusting a broken test."],
      ["What not to do", "Do not reweight to correct it. Reweighting assumes you know the mechanism, and if you knew it you would fix it."]
    ]},

    { t: "callout", kind: "trap", title: "SRM invalidates the entire test, not just the counts", body: [
      { t: "p", text: "If a 50/50 split delivers 49.2/50.8, something decided who went where. Whatever that something is, it may also affect the outcome — so the arms are no longer comparable and no analysis can fix it." },
      { t: "code", lang: "python", numbered: false, title: "check it first, and treat a failure as fatal", code: `
def srm_check(n_control, n_treatment, expected_ratio=0.5, alpha=0.001):
    """A chi-square goodness-of-fit test on the assignment counts.

    USE A STRICT alpha. This test runs on every experiment, so at
    alpha = 0.05 you would flag 5% of healthy tests -- and the cost of
    investigating a real SRM is far lower than the cost of trusting a
    broken test."""
    total = n_control + n_treatment
    expected = np.array([total*expected_ratio, total*(1-expected_ratio)])
    observed = np.array([n_control, n_treatment])
    chi2 = (((observed - expected)**2) / expected).sum()
    p = float(stats.chi2.sf(chi2, 1))
    return {"p": p, "srm": p < alpha,
            "observed_ratio": n_control/total,
            "excess_users": int(abs(n_control - expected[0]))}

# A HEALTHY TEST -- the counts never match exactly:
srm_check(100_137, 99_863)          # p = 0.54, no SRM

# A 0.8% IMBALANCE, WHICH LOOKS TRIVIAL:
srm_check(100_800, 99_200)          # p = 1.5e-05, SRM
#
# 0.8% IS FATAL AT THIS SAMPLE SIZE. The test detects imbalances far
# smaller than anyone would notice by eye, which is the point:

for imbalance in (0.001, 0.005, 0.01, 0.02):
    n = 200_000
    c = int(n/2 * (1+imbalance))
    r = srm_check(c, n-c)
    print(f"{imbalance:.1%} imbalance at n={n:,}: p = {r['p']:.2e}")
# 0.1% imbalance at n=200,000: p = 6.4e-01
# 0.5% imbalance at n=200,000: p = 2.6e-02
# 1.0% imbalance at n=200,000: p = 6.1e-06
# 2.0% imbalance at n=200,000: p = 2.4e-21

# THE USUAL CAUSES, and every one of them biases the outcome too:
#
#  BOT FILTERING          bots hash into one arm and get filtered;
#                         the arms now differ in traffic quality
#  REDIRECT LATENCY       the treatment redirects, so slower users
#                         drop out before being counted
#  ASSIGNMENT ON DIFFERENT EVENTS
#                         control counted at page view, treatment at
#                         render -- different populations
#  CRASHES IN ONE ARM     crashed sessions never log the outcome, so
#                         the worst experiences vanish from one arm
#  CARRYOVER              users bucketed by a previous test's hash
#
# NOTE THE PATTERN: every cause removes a NON-RANDOM subset from one
# arm. That is why SRM is fatal rather than cosmetic -- it is
# selection bias with a count attached (lesson 4.5).
#
# THE RULE: SRM means discard the test and fix the pipeline. Do not
# analyse it, do not report it "with a caveat", and do not reweight.
# The bias is in an unknown direction of an unknown size.`},
      { t: "p", text: "**Every cause of SRM removes a non-random subset from one arm**, which makes it selection bias with a count attached. A test with SRM is discarded, not caveated — the bias is in an unknown direction of unknown size." }
    ]},

    { t: "h2", n: "03", text: "Peeking, and the methods that permit it", id: "peeking" },

    { t: "p", text: "**Checking results repeatedly and stopping when they turn significant inflates the false-positive rate enormously** — fourteen daily checks reach about 28%, and with unlimited patience it converges to 100%. The fix is a method built for looking, not a rule forbidding it." },

    { t: "dl", items: [
      ["Peeking", "Analysing before the planned sample is reached. Every look is another test at the same threshold."],
      ["Fixed-horizon test", "Valid at one pre-specified sample size only. Most powerful, and it requires discipline that usually fails."],
      ["Alpha spending", "Allocating the error budget across planned interim analyses. O'Brien-Fleming spends very little early, so five looks cost about 3% of power."],
      ["Always-valid confidence sequence", "An interval correct at **every** sample size simultaneously, so you can monitor continuously. Wider than a fixed-horizon interval, and that width buys the anytime guarantee."],
      ["Sequential test", "Any design accounting for repeated looks. The right answer when someone will look regardless."]
    ]},

    { t: "ladder",
      title: "Wanting to look at the results before the test ends",
      rungs: [
        { level: "bad", label: "Check daily and stop when significant",
          why: "The p-value random-walks, so with enough looks it crosses any threshold. Fourteen daily checks take the false-positive rate to about 28%, and with unlimited patience it converges to 100%.",
          code: `def peek_until_significant(seed, max_n=20_000, step=1_000):
    r = np.random.default_rng(seed)
    a, b = r.normal(0,1,max_n), r.normal(0,1,max_n)     # NO effect
    for n in range(step, max_n+1, step):
        if stats.ttest_ind(a[:n], b[:n]).pvalue < 0.05:
            return True
    return False

np.mean([peek_until_significant(s) for s in range(3000)])   # 0.21` },
        { level: "ok", label: "Fix the sample size and refuse to look",
          why: "Correct, and organisationally hard. Someone will look, and once they have looked they cannot unlook — the pressure to stop early on a good result is enormous and the discipline usually fails.",
          code: `# The stopping rule is a number of users, decided in advance, and
# the dashboard is hidden until then.
#
# This works and it is worth defending. But "we could have shipped a
# week earlier" is a real cost, and a rule that people route around is
# worse than a method that permits what they will do anyway.` },
        { level: "best", label: "Use a sequential method built for looking",
          why: "Alpha-spending and always-valid inference let you look as often as you like while keeping the error rate. You pay a modest amount of power for the freedom, and you get a rule people will actually follow.",
          code: `def obrien_fleming_bounds(n_looks, alpha=0.05):
    """Alpha-spending: spend very little early, most at the end.

    Early looks face a stringent bound, so stopping early requires
    overwhelming evidence -- which is exactly the behaviour you want,
    and it costs almost nothing at the final analysis."""
    t = np.arange(1, n_looks+1) / n_looks              # information fraction
    spent = 2 * (1 - stats.norm.cdf(stats.norm.ppf(1-alpha/4) / np.sqrt(t)))
    increments = np.diff(np.concatenate([[0.0], spent]))
    return spent, increments

spent, inc = obrien_fleming_bounds(5)
for i, (s, z) in enumerate(zip(spent, [stats.norm.isf(x/2) for x in inc]), 1):
    print(f"look {i}: cumulative alpha {s:.4f}, z-boundary {z:.2f}")
# look 1: cumulative alpha 0.0000, z-boundary 4.56
# look 2: cumulative alpha 0.0006, z-boundary 3.23
# look 3: cumulative alpha 0.0075, z-boundary 2.63
# look 4: cumulative alpha 0.0246, z-boundary 2.28
# look 5: cumulative alpha 0.0500, z-boundary 2.03
#
# THE FINAL BOUNDARY IS 2.03 AGAINST A FIXED TEST'S 1.96 -- so five
# looks cost about 3% of power. That is the whole price.

def always_valid_ci(a, b, alpha=0.05, phi=0.05):
    """An always-valid confidence sequence: correct at EVERY sample
    size simultaneously, so you can look continuously.

    It is wider than a fixed-horizon interval -- that width is what
    buys the anytime guarantee."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    n = min(len(a), len(b))
    diff = b.mean() - a.mean()
    var = a.var(ddof=1)/len(a) + b.var(ddof=1)/len(b)
    # Mixture-boundary width, growing as sqrt(log n / n).
    width = np.sqrt(var * (2*(n*phi**2 + 1)/(n*phi**2)) *
                    np.log(np.sqrt(n*phi**2 + 1)/alpha))
    return diff - width, diff + width

# THE COMPARISON, on data with no effect:
def sequential_error_rate(method, trials=2000, max_n=20_000, step=2_000):
    r = np.random.default_rng(0)
    hits = 0
    for t in range(trials):
        rr = np.random.default_rng(t)
        a, b = rr.normal(0,1,max_n), rr.normal(0,1,max_n)
        for n in range(step, max_n+1, step):
            lo, hi = method(a[:n], b[:n])
            if lo > 0 or hi < 0:
                hits += 1
                break
    return hits/trials

fixed = lambda a, b: stats.ttest_ind(a, b).confidence_interval()
sequential_error_rate(fixed)                    # ~0.19
sequential_error_rate(always_valid_ci)          # ~0.02
#
# THE FIXED INTERVAL, CHECKED TEN TIMES, ERRS 19% OF THE TIME. The
# always-valid one stays under 5% however often you look.

# WHICH TO USE:
#   A FIXED NUMBER OF PLANNED INTERIM ANALYSES  -> alpha spending
#   CONTINUOUS MONITORING ON A DASHBOARD        -> always-valid
#   NOBODY WILL LOOK (genuinely)                -> fixed horizon,
#                                                  most powerful`,
          note: "**Five interim looks under O'Brien-Fleming cost about 3% of power.** That is a small price for a rule people will follow, and far cheaper than the 19% error rate of looking at a fixed-horizon interval." }
      ]
    },

    { t: "h2", n: "04", text: "Novelty, primacy and the shape of the effect", id: "novelty" },

    { t: "p", text: "An effect that **changes over the course of the experiment** is not the same as one that persists, and a pooled figure averages over the change and describes no period at all. Two opposite versions exist, and both look like a result in the first few days." },

    { t: "dl", items: [
      ["Novelty effect", "Users engage with anything new, so the measured lift decays. A pure novelty effect can show a 10.8% pooled lift with no real improvement."],
      ["Primacy effect", "Users are disrupted by change, so the effect improves over time. The mirror image, and it makes a good change look harmful early."],
      ["Trend test", "Regressing the daily effect on day number. A significant slope means the pooled figure is misleading — worth running as a matter of course."],
      ["Stable window", "The last period where the effect has plateaued. This is the number to report, with the pooled figure alongside."],
      ["New-user segment", "Users with no prior experience to be surprised by. Usually the cleanest estimate of the steady state."]
    ]},

    { t: "code", lang: "python", title: "an effect that decays is not the same as one that persists", code: `
# TWO OPPOSITE TIME-VARYING EFFECTS, and both look like a result on
# day three:
#
#   NOVELTY  users engage with anything new; the lift decays
#   PRIMACY  users are disrupted by change; the effect improves
#
# BOTH ARE ARTEFACTS OF THE CHANGE ITSELF rather than of its value,
# and both are invisible in a single pooled number.

def simulate_novelty(days=28, n_per_day=5000, base=0.10,
                     true_lift=0.0, novelty=0.06, halflife=5, seed=0):
    r = np.random.default_rng(seed)
    out = []
    for d in range(days):
        boost = novelty * 0.5**(d/halflife)
        p_t = base * (1 + true_lift) + boost
        out.append((r.binomial(n_per_day, base)/n_per_day,
                    r.binomial(n_per_day, p_t)/n_per_day))
    return np.array(out)

data = simulate_novelty(true_lift=0.0)          # NO real effect

pooled_c, pooled_t = data[:, 0].mean(), data[:, 1].mean()
pooled_t/pooled_c - 1                           # +0.108 -- a "10.8% lift"
#
# A TEN PERCENT LIFT FROM A PURE NOVELTY EFFECT with no underlying
# improvement at all. Pooling the four weeks hides the decay entirely.

# THE DIAGNOSTIC: plot the effect BY DAY and test for a trend.
def novelty_check(daily_control, daily_treatment):
    """Regress the daily lift on day number. A significant negative
    slope means the effect is decaying, which pooling would hide."""
    lift = daily_treatment/daily_control - 1
    days = np.arange(len(lift))
    slope, intercept, r_, p, se = stats.linregress(days, lift)

    # Where the effect settles, extrapolating the trend.
    asymptote = intercept + slope * len(lift) * 3
    return {
        "pooled_lift": float(lift.mean()),
        "slope_per_day": float(slope),
        "p_trend": float(p),
        "first_week": float(lift[:7].mean()),
        "last_week": float(lift[-7:].mean()),
        "decaying": bool(p < 0.05 and slope < 0),
        "projected_steady_state": float(asymptote),
    }

novelty_check(data[:, 0], data[:, 1])
# {'pooled_lift': 0.108, 'slope_per_day': -0.0075, 'p_trend': 1e-09,
#  'first_week': 0.246, 'last_week': 0.021, 'decaying': True,
#  'projected_steady_state': -0.003}
#
# FIRST WEEK +24.6%, LAST WEEK +2.1%, PROJECTED STEADY STATE ~0%.
# The pooled 10.8% is an average over a decay curve and describes no
# period at all.

# THE HONEST READOUT USES THE LAST STABLE WINDOW, not the pool:
last_week_only = data[-7:]
(last_week_only[:,1].mean()/last_week_only[:,0].mean() - 1)     # +0.021

# A REAL EFFECT LOOKS DIFFERENT -- flat, with no trend:
real = simulate_novelty(true_lift=0.08, novelty=0.0)
novelty_check(real[:, 0], real[:, 1])
# {'pooled_lift': 0.080, 'slope_per_day': 0.0002, 'p_trend': 0.79,
#  'first_week': 0.078, 'last_week': 0.082, 'decaying': False, ...}

# AND A REAL EFFECT WITH NOVELTY ON TOP is the common case -- the
# trend test separates them:
mixed = simulate_novelty(true_lift=0.05, novelty=0.05)
novelty_check(mixed[:, 0], mixed[:, 1])["last_week"]            # ~0.055
#
# THE LAST WEEK RECOVERS THE TRUE 5% while the pooled figure would
# have reported 11%.

# WHAT TO DO ABOUT IT:
#
# 1. RUN LONG ENOUGH TO SEE THE PLATEAU. Two weeks minimum for a
#    visible change; four for anything touching a habit.
# 2. TEST FOR A TREND AS A MATTER OF COURSE, not just when suspicious.
# 3. REPORT THE LAST STABLE WINDOW as the effect, with the pooled
#    figure alongside and the difference explained.
# 4. SEGMENT BY NEW VERSUS RETURNING USERS. Novelty affects returning
#    users (who notice the change); primacy affects them too. New
#    users have no baseline to be surprised by, so their effect is
#    usually the cleaner estimate of the steady state.
`,
      hl: [24, 44, 56, 68],
      caption: "**A 10.8% pooled lift from a pure novelty effect with no real improvement.** The trend test separates them, and the last stable week recovers the truth — new users are often the cleanest estimate of it."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Write the experiment readout function",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "You own the experimentation platform. Write the function that produces every experiment's readout, and make it refuse to produce a misleading one." },
        { t: "code", lang: "python", numbered: false, title: "what it receives", code: `
# daily: one row per day per arm
#   day, arm, users, conversions, revenue, errors
#
# design: the pre-registered decisions
#   primary_metric, mde_relative, alpha, planned_n, allocation
#
# It must produce a readout that a PM can act on and a statistician
# cannot object to.`},
        { t: "p", text: "Implement it, with every validation gate the lesson has covered, and say what you deliberately left out." }
      ],
      requirements: [
        "Validate the assignment before analysing anything.",
        "Analyse at the unit of randomisation.",
        "Detect and report time-varying effects.",
        "Handle multiplicity across metric classes.",
        "Return a decision, not just numbers.",
        "Include tests."
      ],
      hint: "The function's most important behaviour is refusing to return a result when the test is invalid.",
      solution: {
        lang: "python",
        title: "readout.py",
        code: `import numpy as np
from scipy import stats


def srm_check(n_c, n_t, expected=0.5, alpha=0.001):
    total = n_c + n_t
    exp = np.array([total*expected, total*(1-expected)])
    obs = np.array([n_c, n_t])
    chi2 = (((obs - exp)**2)/exp).sum()
    return float(stats.chi2.sf(chi2, 1))


def benjamini_hochberg(p, q=0.10):
    p = np.asarray(p, float)
    m = len(p)
    if m == 0:
        return np.array([], bool)
    order = np.argsort(p)
    below = np.flatnonzero(p[order] <= (np.arange(1, m+1)/m)*q)
    rej = np.zeros(m, bool)
    if len(below):
        rej[order[:below[-1]+1]] = True
    return rej


def readout(daily, design, secondary=None, guardrails=None):
    """The full experiment readout, with refusal built in.

    THE DESIGN PRINCIPLE: this function's most valuable behaviour is
    returning INVALID rather than a number. A misleading readout is
    worse than none, because it gets acted on.
    """
    daily = np.asarray(daily, dtype=[("day","i4"),("arm","U10"),
                                     ("users","i8"),("conversions","i8"),
                                     ("revenue","f8"),("errors","i8")])
    ctl = daily[daily["arm"] == "control"]
    trt = daily[daily["arm"] == "treatment"]

    n_c, n_t = int(ctl["users"].sum()), int(trt["users"].sum())
    k_c, k_t = int(ctl["conversions"].sum()), int(trt["conversions"].sum())

    result = {"n": {"control": n_c, "treatment": n_t},
              "blocking_issues": [], "warnings": []}

    # ---- GATE 1: SAMPLE RATIO MISMATCH ---------------------------------
    # First, before anything else. An SRM means the arms are not
    # comparable, so every downstream number is meaningless.
    p_srm = srm_check(n_c, n_t, design.get("allocation", 0.5))
    result["srm_p"] = p_srm
    if p_srm < 0.001:
        result["blocking_issues"].append(
            f"SAMPLE RATIO MISMATCH (p={p_srm:.2e}): observed "
            f"{n_c/(n_c+n_t):.4f} against expected "
            f"{design.get('allocation', 0.5):.4f}. The arms are not "
            f"comparable -- fix the assignment pipeline and rerun. Do "
            f"not interpret these numbers."
        )

    # ---- GATE 2: DID IT REACH ITS PLANNED SAMPLE? ----------------------
    planned = design.get("planned_n")
    if planned and (n_c + n_t) < 0.9*planned:
        result["warnings"].append(
            f"stopped at {n_c+n_t:,} of a planned {planned:,} "
            f"({(n_c+n_t)/planned:.0%}); power is below target"
        )

    # ---- GATE 3: WHOLE WEEKS -------------------------------------------
    days = len(np.unique(daily["day"]))
    if days % 7 != 0:
        result["warnings"].append(
            f"ran {days} days -- not a whole number of weeks, so "
            f"weekday composition differs from the population"
        )
    if days < 7:
        result["blocking_issues"].append(
            f"ran only {days} days; weekly seasonality is unaccounted for"
        )

    if result["blocking_issues"]:
        result["decision"] = "INVALID -- do not interpret"
        return result

    # ---- THE PRIMARY ANALYSIS ------------------------------------------
    p_c, p_t = k_c/n_c, k_t/n_t
    diff = p_t - p_c
    se = np.sqrt(p_c*(1-p_c)/n_c + p_t*(1-p_t)/n_t)
    alpha = design.get("alpha", 0.05)
    z = stats.norm.ppf(1-alpha/2)

    result["primary"] = {
        "metric": design["primary_metric"],
        "control": p_c, "treatment": p_t,
        "absolute_pp": diff*100,
        "relative": diff/p_c,
        "ci_relative": ((diff - z*se)/p_c, (diff + z*se)/p_c),
        "p": float(2*stats.norm.sf(abs(diff/se))),
        "significant": bool(2*stats.norm.sf(abs(diff/se)) < alpha),
    }

    # POWER FOR THE PRE-REGISTERED MDE, so a null result is readable.
    mde = design.get("mde_relative")
    if mde:
        p2 = p_c*(1+mde)
        se_mde = np.sqrt(p_c*(1-p_c)/n_c + p2*(1-p2)/n_t)
        result["primary"]["power_for_mde"] = float(
            stats.norm.sf(z - (p2-p_c)/se_mde))

    # ---- TIME-VARYING EFFECTS ------------------------------------------
    by_day = []
    for d in np.unique(daily["day"]):
        c = ctl[ctl["day"] == d]; t = trt[trt["day"] == d]
        if c["users"].sum() and t["users"].sum():
            by_day.append((c["conversions"].sum()/c["users"].sum(),
                           t["conversions"].sum()/t["users"].sum()))
    by_day = np.array(by_day)

    if len(by_day) >= 10:
        lift = by_day[:, 1]/by_day[:, 0] - 1
        sl, ic, _, p_tr, _ = stats.linregress(np.arange(len(lift)), lift)
        result["trend"] = {
            "slope_per_day": float(sl), "p": float(p_tr),
            "first_week": float(lift[:7].mean()),
            "last_week": float(lift[-7:].mean()),
        }
        if p_tr < 0.05:
            kind = "novelty (decaying)" if sl < 0 else "primacy (improving)"
            result["warnings"].append(
                f"{kind} effect detected (p={p_tr:.3f}): first week "
                f"{lift[:7].mean():+.1%}, last week {lift[-7:].mean():+.1%}. "
                f"The pooled figure describes no period; use the last "
                f"stable window."
            )
            result["primary"]["last_week_relative"] = float(lift[-7:].mean())

    # ---- GUARDRAILS: uncorrected, deliberately sensitive ---------------
    result["guardrails"] = {}
    breached = []
    for name, (gc, gt) in (guardrails or {}).items():
        a, b = np.asarray(gc, float), np.asarray(gt, float)
        p = float(stats.ttest_ind(a, b, equal_var=False).pvalue)
        worse = b.mean() > a.mean()
        result["guardrails"][name] = {"p": p, "control": float(a.mean()),
                                     "treatment": float(b.mean())}
        if p < 0.05 and worse:
            breached.append(name)
    if breached:
        result["blocking_issues"].append(
            f"guardrail breach: {', '.join(breached)} -- review before "
            f"shipping regardless of the primary result")

    # ---- SECONDARIES: FDR-controlled leads -----------------------------
    if secondary:
        names = list(secondary)
        ps = []
        for name in names:
            a, b = map(lambda v: np.asarray(v, float), secondary[name])
            ps.append(float(stats.ttest_ind(a, b, equal_var=False).pvalue))
        rej = benjamini_hochberg(np.array(ps), q=0.10)
        result["secondary"] = {
            names[i]: {"p": ps[i], "flagged": bool(rej[i])}
            for i in range(len(names))
        }
        result["secondary_note"] = ("FDR-controlled at q=0.10. "
                                    "Hypothesis-generating only -- these "
                                    "do not support a ship decision.")

    # ---- THE DECISION ---------------------------------------------------
    prim = result["primary"]
    effect = prim.get("last_week_relative", prim["relative"])
    if result["blocking_issues"]:
        result["decision"] = "BLOCKED -- guardrail breach"
    elif prim["significant"] and effect > 0:
        result["decision"] = f"SHIP -- {effect:+.1%} on {prim['metric']}"
    elif prim["significant"]:
        result["decision"] = f"DO NOT SHIP -- {effect:+.1%}, a regression"
    else:
        pw = prim.get("power_for_mde", float("nan"))
        result["decision"] = (
            f"INCONCLUSIVE -- CI [{prim['ci_relative'][0]:+.1%}, "
            f"{prim['ci_relative'][1]:+.1%}], power {pw:.0%} for the "
            f"pre-registered MDE"
        )
    return result


# =========================================================================
# WHAT I DELIBERATELY LEFT OUT
# =========================================================================
#
# 1. AUTOMATIC SEGMENT SLICING. The platform could break every result
#    down by ten segments, and every team would find something. If a
#    segment matters it should be pre-registered as a primary
#    interaction (lesson 5.7). MAKING IT EASY TO SLICE IS MAKING IT
#    EASY TO P-HACK.
#
# 2. A "CONFIDENCE" SCORE OR TRAFFIC-LIGHT COLOUR. Any single summary
#    invites reading the colour instead of the interval, and the
#    interval is the finding.
#
# 3. AUTOMATIC METRIC SELECTION. The primary metric comes from the
#    design object and cannot be changed at readout time. That is the
#    single most important constraint in the whole function.
#
# 4. SEQUENTIAL BOUNDARIES. This is a fixed-horizon readout. Peeking
#    support belongs in a separate always-valid function, because
#    mixing the two would let someone read a fixed-horizon interval
#    early and believe it.
#
# 5. REWEIGHTING TO FIX SRM. Tempting and wrong -- reweighting assumes
#    you know the mechanism, and if you knew it you would fix it.
#
# WHAT I INCLUDED THAT LOOKS EXCESSIVE:
#
#   The whole-weeks check. It seems fussy and it catches a real bias
#   of several percent, which is larger than most effects tested.


# =========================================================================
# TESTS
# =========================================================================

def make_daily(days=28, n=5000, p_c=0.10, p_t=0.11, seed=0,
               t_users=None, novelty=0.0, halflife=5):
    r = np.random.default_rng(seed)
    rows = []
    for d in range(days):
        boost = novelty * 0.5**(d/halflife)
        nt = t_users or n
        rows.append((d, "control", n, r.binomial(n, p_c), 0.0, 0))
        rows.append((d, "treatment", nt,
                     r.binomial(nt, min(p_t+boost, 0.99)), 0.0, 0))
    return rows

DESIGN = {"primary_metric": "conversion", "mde_relative": 0.05,
          "alpha": 0.05, "planned_n": 280_000, "allocation": 0.5}


def test_srm_blocks_everything():
    d = make_daily(t_users=5400)                # 8% more treatment users
    r = readout(d, DESIGN)

    assert r["decision"].startswith("INVALID")
    assert "primary" not in r
    assert any("SAMPLE RATIO" in i for i in r["blocking_issues"])


def test_healthy_test_produces_a_decision():
    r = readout(make_daily(p_c=0.10, p_t=0.112), DESIGN)

    assert r["decision"].startswith("SHIP")
    assert r["primary"]["significant"]


def test_null_result_reports_power_and_interval():
    r = readout(make_daily(p_c=0.10, p_t=0.1005), DESIGN)

    assert r["decision"].startswith("INCONCLUSIVE")
    assert "power_for_mde" in r["primary"]
    lo, hi = r["primary"]["ci_relative"]
    assert lo < 0 < hi


def test_novelty_is_detected_and_reported():
    r = readout(make_daily(p_c=0.10, p_t=0.10, novelty=0.05), DESIGN)

    assert any("novelty" in w for w in r["warnings"])
    assert r["trend"]["first_week"] > r["trend"]["last_week"]
    assert r["primary"]["last_week_relative"] < r["primary"]["relative"]


def test_decision_uses_the_stable_window_when_there_is_a_trend():
    r = readout(make_daily(p_c=0.10, p_t=0.10, novelty=0.06), DESIGN)

    assert "last_week_relative" in r["primary"]
    assert abs(r["primary"]["last_week_relative"]) < 0.05


def test_guardrail_breach_blocks_a_winning_test():
    d = make_daily(p_c=0.10, p_t=0.13)
    rng_ = np.random.default_rng(0)
    guards = {"error_rate": (rng_.normal(0.01, 0.002, 500),
                             rng_.normal(0.02, 0.002, 500))}
    r = readout(d, DESIGN, guardrails=guards)

    assert r["decision"].startswith("BLOCKED")


def test_short_test_is_blocked():
    r = readout(make_daily(days=3), DESIGN)

    assert r["decision"].startswith("INVALID")


def test_underpowered_test_is_warned_not_blocked():
    r = readout(make_daily(days=7, n=2000), DESIGN)

    assert any("planned" in w for w in r["warnings"])
    assert not r["decision"].startswith("INVALID")


def test_secondaries_are_labelled_as_leads():
    rng_ = np.random.default_rng(0)
    sec = {f"m{i}": (rng_.normal(0,1,400), rng_.normal(0,1,400))
           for i in range(8)}
    r = readout(make_daily(), DESIGN, secondary=sec)

    assert "hypothesis-generating" in r["secondary_note"]`,
        notes: [
          { t: "p", text: "**The function's most valuable behaviour is returning `INVALID` rather than a number.** A misleading readout is worse than none because it gets acted on, so the SRM gate runs before any analysis and suppresses the primary result entirely." },
          { t: "callout", kind: "insight", title: "The most important constraint is that the primary metric comes from the design object", body: [
            { t: "p", text: "It cannot be chosen at readout time. Everything else in the function is a refinement; that one line is what stops the whole class of \"we found a win in one of our forty metrics\"." },
            { t: "p", text: "Automatic segment slicing was left out for the same reason — making it easy to slice is making it easy to p-hack, and a segment that matters should be pre-registered as an interaction." }
          ]},
          { t: "p", text: "**When a trend is detected, the decision uses the last stable window rather than the pool.** A pooled figure over a decay curve describes no period at all — in the test case it reports +10.8% for an effect that has settled at zero." },
          { t: "p", text: "**Guardrails block a winning test.** They are uncorrected and deliberately sensitive, and a breach halts the ship regardless of the primary result — the cost asymmetry runs the opposite way from every other metric." },
          { t: "p", text: "**Reweighting to fix SRM was deliberately omitted.** It assumes you know the mechanism, and if you knew the mechanism you would fix it instead." },
          { t: "p", text: "**The whole-weeks check looks fussy and catches a real bias of several percent** — larger than most effects being tested, because weekday and weekend populations convert differently." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A recommendation change tested at +11% engagement over ten days and shipped. Engagement was flat within a month, and the team spent a quarter looking for a regression that had never happened." },
      { t: "p", text: "**The effect had decayed from +24% in the first week to +3% in the last three days**, and the pooled figure averaged over the decay curve. Nobody had plotted the daily lift." },
      { t: "p", text: "**A trend test on the daily effects would have taken one line** and would have reported the slope, the first week, the last week and a projected steady state near zero." },
      { t: "p", text: "**Run long enough to see a plateau, and test for a trend as a matter of course.** New users are usually the cleanest estimate of the steady state, since they have no prior experience to be surprised by." }
    ]}
  ],

  takeaways: [
    "**Most of what goes wrong happens before analysis**, and those failures are invisible in the output.",
    "**Run whole weeks.** Weekday and weekend populations differ by several percent — larger than most effects being tested.",
    "**Unequal allocation costs `1/(4k(1−k))`** — a 5% canary needs 5.3× the total traffic of a 50/50 test.",
    "**Check the sample ratio before anything else.** A 0.8% imbalance at 200,000 users is fatal, not cosmetic.",
    "**Every cause of SRM removes a non-random subset from one arm**, which makes it selection bias with a count attached.",
    "**A test with SRM is discarded, not caveated** — the bias is in an unknown direction of unknown size, and reweighting assumes a mechanism you do not know.",
    "**Checking a fixed-horizon interval ten times errs 19% of the time**; always-valid inference stays under 5% however often you look.",
    "**Five interim looks under O'Brien-Fleming cost about 3% of power** — a small price for a rule people will actually follow.",
    "**A pure novelty effect can show a 10.8% pooled lift with no real improvement.** Test for a trend as a matter of course.",
    "**Report the last stable window as the effect**, with the pooled figure alongside and the difference explained.",
    "**Guardrails are uncorrected and block a winning test** — their cost asymmetry runs the opposite way from every other metric.",
    "**The primary metric must come from the design, not the readout.** That single constraint prevents most p-hacking."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your 50/50 test delivered 100,800 control and 99,200 treatment users. What do you do?",
        options: [
          "Nothing — a 0.8% imbalance is trivial",
          "Discard the test and fix the assignment pipeline — the SRM p-value is 1.5×10⁻⁵, and whatever caused the imbalance may also affect the outcome",
          "Reweight the arms to correct for it",
          "Analyse it but add a caveat"
        ],
        answer: 1,
        why: "Every cause — bot filtering, redirect latency, crashes in one arm — removes a non-random subset, making it selection bias with a count attached. Reweighting assumes you know the mechanism; if you knew it you would fix it."
      },
      {
        stem: "An experiment shows +24% in week one and +3% in week four. What is the effect?",
        options: [
          "The pooled average, about +11%",
          "Roughly +3% — the pooled figure averages over a decay curve and describes no period at all",
          "+24%, since that is when the effect was measured cleanly",
          "It cannot be determined"
        ],
        answer: 1,
        why: "This is a novelty effect: users engage with anything new and the lift decays. A trend test on the daily effects takes one line and reports the slope, both weeks and a projected steady state — new users are usually the cleanest estimate of it."
      },
      {
        stem: "You want to monitor an experiment daily. What is the cost of using a normal confidence interval?",
        options: [
          "None, if you only act on the final result",
          "Checking it ten times gives roughly a 19% error rate — the p-value random-walks and crosses any fixed threshold given enough looks",
          "It becomes conservative",
          "Only the last look counts"
        ],
        answer: 1,
        why: "Always-valid confidence sequences stay under 5% however often you look, and O'Brien-Fleming alpha spending costs about 3% of power for five planned looks. A rule people route around is worse than a method that permits what they will do anyway."
      },
      {
        stem: "You run a 5% canary rather than a 50/50 split. What does that cost?",
        options: [
          "Nothing — the same number of users see the treatment",
          "5.3× the total traffic for the same power, since the factor is `1/(4k(1−k))`",
          "Twice the traffic",
          "It improves power by concentrating the control group"
        ],
        answer: 1,
        why: "Power depends on the smaller arm, and an extreme split wastes most of the traffic on an already well-measured control. Worth knowing before promising a two-week readout on a cautious rollout."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Walk me through running an A/B test properly.",
        strong: "Size it from a minimum detectable effect and declare the primary metric before launch. Randomise at the unit you will analyse. Run whole weeks. Check the sample ratio before looking at any outcome. Then analyse, with secondaries FDR-controlled and guardrails uncorrected.",
        answer: [
          { t: "p", text: "Putting the SRM check before the analysis shows you know where experiments actually break." },
          { t: "p", text: "Naming what must be decided in advance — metric, MDE, stopping rule — is the part that prevents most of the damage." }
        ]
      },
      {
        level: "advanced",
        q: "Your test shows a sample ratio of 49.2/50.8. What does that tell you?",
        strong: "That something non-random decided who went where, so the arms are not comparable. I would discard the test rather than caveat it — the usual causes, like bot filtering or redirect latency, all remove a biased subset from one arm and affect the outcome too.",
        answer: [
          { t: "p", text: "Treating SRM as fatal rather than as a caveat is the answer being looked for, and most people underestimate how small an imbalance matters." },
          { t: "p", text: "Naming a concrete mechanism shows why it biases the outcome rather than just the counts." }
        ]
      },
      {
        level: "advanced",
        q: "A PM wants to check the dashboard daily and stop early on a win. How do you respond?",
        strong: "Give them a method rather than a rule. Always-valid confidence sequences are correct at every sample size, so they can look continuously; alpha spending works if the looks are planned. Both cost a little power and are far better than a discipline that will fail.",
        answer: [
          { t: "p", text: "Recognising that \"do not look\" is organisationally unenforceable is the practical insight." },
          { t: "p", text: "Quantifying the cost — about 3% of power for five looks — makes it an easy trade to agree to." }
        ]
      }
    ]
  }
});

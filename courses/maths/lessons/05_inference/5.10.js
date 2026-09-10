/* ============================================================================
   LESSON 5.10 — Multiple Testing Correction
   ========================================================================= */
EC.receiveLesson({
  id: "5.10",

  lede: "**Run twenty tests at `α = 0.05` and you will find a significant result whether or not one exists.** That is not a risk, it is the design of the threshold. The question is never whether to correct but which error rate to control — and controlling the wrong one either buries every real finding or lets through a flood of false ones.",

  objectives: [
    "Compute the family-wise error rate for a set of tests",
    "Distinguish FWER control from FDR control and choose between them",
    "Apply Bonferroni, Holm and Benjamini-Hochberg correctly",
    "Recognise the hidden multiplicity in analyses that look like one test",
    "Define the family before running anything"
  ],

  prerequisites: ["5.7"],

  blocks: [

    { t: "h2", n: "01", text: "The arithmetic, and why it is unavoidable", id: "arithmetic" },

    { t: "code", lang: "python", title: "significance is guaranteed at scale", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

# WITH m INDEPENDENT TESTS AT LEVEL alpha, the probability of at least
# one false positive is
#
#     FWER = 1 - (1 - alpha)^m

for m in (1, 5, 10, 20, 50, 100):
    print(f"{m:3d} tests: P(at least one false positive) = "
          f"{1 - 0.95**m:.1%}")
#   1 tests: P(at least one false positive) =  5.0%
#   5 tests: P(at least one false positive) = 22.6%
#  10 tests: P(at least one false positive) = 40.1%
#  20 tests: P(at least one false positive) = 64.2%
#  50 tests: P(at least one false positive) = 92.3%
# 100 tests: P(at least one false positive) = 99.4%
#
# AT TWENTY TESTS IT IS MORE LIKELY THAN NOT. At a hundred it is
# essentially certain -- and a hundred tests is a small dashboard.

# THE EXPECTED NUMBER OF FALSE POSITIVES IS SIMPLER AND MORE USEFUL:
#     E[false positives] = alpha x m
for m in (20, 100, 1000, 20_000):
    print(f"{m:>6,} tests -> expect {0.05*m:>7,.0f} false positives")
#     20 tests -> expect       1 false positives
#    100 tests -> expect       5 false positives
#  1,000 tests -> expect      50 false positives
# 20,000 tests -> expect   1,000 false positives
#
# A GENOMICS SCAN OF 20,000 GENES PRODUCES 1,000 "SIGNIFICANT" GENES
# FROM NOISE ALONE. Without correction the result is not weak evidence
# -- it is no evidence.

# VERIFY IT ON PURE NOISE:
def uncorrected_hits(m, n=100, trials=2000, seed=0):
    r = np.random.default_rng(seed)
    counts = []
    for _ in range(trials):
        ps = [stats.ttest_ind(r.normal(0,1,n), r.normal(0,1,n)).pvalue
              for _ in range(m)]
        counts.append(sum(p < 0.05 for p in ps))
    return np.mean(counts), np.mean([c > 0 for c in counts])

uncorrected_hits(20)              # (1.00, 0.641) -- matches the formula

# THE TESTS ARE OFTEN CORRELATED, which reduces the FWER but never
# removes it:
def correlated_hits(m, rho=0.7, n=100, trials=2000, seed=0):
    """Metrics that share an underlying driver, as real dashboards do."""
    r = np.random.default_rng(seed)
    any_hit = 0
    for _ in range(trials):
        shared_a, shared_b = r.normal(0,1,n), r.normal(0,1,n)
        hit = False
        for _ in range(m):
            a = np.sqrt(rho)*shared_a + np.sqrt(1-rho)*r.normal(0,1,n)
            b = np.sqrt(rho)*shared_b + np.sqrt(1-rho)*r.normal(0,1,n)
            if stats.ttest_ind(a, b).pvalue < 0.05:
                hit = True
        any_hit += hit
    return any_hit / trials

correlated_hits(20, rho=0.0)      # 0.643 -- independent
correlated_hits(20, rho=0.7)      # 0.402 -- correlated, still 8x nominal
correlated_hits(20, rho=0.95)     # 0.183
#
# CORRELATION HELPS AND DOES NOT RESCUE YOU. Even at rho = 0.95 the
# rate is nearly four times nominal, and most corrections are valid
# under arbitrary dependence anyway.
`,
      hl: [10, 27, 34, 61],
      caption: "**A 20,000-gene scan produces 1,000 significant results from noise alone.** Without correction that is not weak evidence — it is no evidence, and the expected-count form makes it obvious."
    },

    { t: "h2", n: "02", text: "Two error rates, two different jobs", id: "two-rates" },

    { t: "viz",
      title: "FWER controls any error; FDR controls the proportion",
      caption: "Of the discoveries you make, FWER asks whether even one is false and FDR asks what fraction are. As the number of tests grows, only the second stays usable.",
      svg: `<svg viewBox="0 0 880 240" role="img" aria-label="Two panels of discovery sets, one with a single false discovery highlighted and one with a small proportion">
  <g>
    <text x="40" y="28" class="s-label" style="fill:var(--accent)">FWER &lt;= 0.05</text>
    <text x="40" y="50" class="s-sub" style="fill:var(--ink-3)">P(any false discovery) &lt;= 5%</text>
    <g style="fill:var(--good)">
      <circle cx="60" cy="100" r="11"/><circle cx="96" cy="100" r="11"/><circle cx="132" cy="100" r="11"/>
    </g>
    <text x="40" y="146" class="s-sub" style="fill:var(--ink-3)">3 discoveries, all likely real</text>
    <text x="40" y="170" class="s-sub" style="fill:var(--crit)">but 40 real effects were missed</text>
    <text x="40" y="194" class="s-sub" style="fill:var(--ink-3)">use when ONE mistake is costly:</text>
    <text x="40" y="214" class="s-sub" style="fill:var(--ink-3)">a drug approval, a safety claim</text>
  </g>

  <g transform="translate(450,0)">
    <text x="40" y="28" class="s-label" style="fill:var(--good)">FDR &lt;= 0.05</text>
    <text x="40" y="50" class="s-sub" style="fill:var(--ink-3)">E[false / discovered] &lt;= 5%</text>
    <g style="fill:var(--good)">
      <circle cx="60" cy="100" r="11"/><circle cx="94" cy="100" r="11"/><circle cx="128" cy="100" r="11"/>
      <circle cx="162" cy="100" r="11"/><circle cx="196" cy="100" r="11"/><circle cx="230" cy="100" r="11"/>
      <circle cx="264" cy="100" r="11"/><circle cx="298" cy="100" r="11"/><circle cx="332" cy="100" r="11"/>
    </g>
    <circle cx="366" cy="100" r="11" style="fill:var(--crit)"/>
    <text x="40" y="146" class="s-sub" style="fill:var(--ink-3)">10 discoveries, ~1 false</text>
    <text x="40" y="170" class="s-sub" style="fill:var(--good)">far more real effects found</text>
    <text x="40" y="194" class="s-sub" style="fill:var(--ink-3)">use when discoveries are LEADS:</text>
    <text x="40" y="214" class="s-sub" style="fill:var(--ink-3)">a screen, a dashboard, a scan</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "three procedures, and what each guarantees", code: `
def bonferroni(pvals, alpha=0.05):
    """FWER control. Reject where p <= alpha/m.

    Valid under ANY dependence structure, which is why it survives
    despite being conservative."""
    p = np.asarray(pvals, float)
    return p <= alpha/len(p), np.minimum(p*len(p), 1.0)

def holm(pvals, alpha=0.05):
    """FWER control, uniformly more powerful than Bonferroni.

    Sort ascending and compare the k-th smallest against
    alpha/(m-k+1). Stop at the first failure -- everything after it
    is retained regardless of its own p-value."""
    p = np.asarray(pvals, float)
    m = len(p)
    order = np.argsort(p)
    reject = np.zeros(m, bool)
    adj = np.empty(m)
    running = 0.0
    for k, i in enumerate(order):
        running = max(running, min(1.0, (m - k) * p[i]))
        adj[i] = running
        if p[i] <= alpha/(m - k):
            reject[i] = True
        else:
            break                       # step-down: stop at first failure
    return reject, adj

def benjamini_hochberg(pvals, q=0.05):
    """FDR control. Sort ascending, find the largest k with
    p_(k) <= k*q/m, and reject everything up to it.

    Note it rejects the whole PREFIX, including any p-value above its
    own threshold -- which is what makes it more powerful."""
    p = np.asarray(pvals, float)
    m = len(p)
    order = np.argsort(p)
    ranked = p[order]
    thresholds = (np.arange(1, m+1) / m) * q
    below = np.flatnonzero(ranked <= thresholds)
    reject = np.zeros(m, bool)
    if len(below):
        reject[order[:below[-1] + 1]] = True
    adj = np.minimum.accumulate((ranked * m / np.arange(1, m+1))[::-1])[::-1]
    out_adj = np.empty(m)
    out_adj[order] = np.minimum(adj, 1.0)
    return reject, out_adj

# ---- COMPARE ON A REALISTIC SCREEN -----------------------------------
# 1,000 tests, 50 of them genuinely non-null.
def make_screen(m=1000, n_true=50, effect=0.5, n=60, seed=0):
    r = np.random.default_rng(seed)
    ps, truth = [], []
    for i in range(m):
        real = i < n_true
        shift = effect if real else 0.0
        ps.append(stats.ttest_ind(r.normal(0,1,n), r.normal(shift,1,n)).pvalue)
        truth.append(real)
    return np.array(ps), np.array(truth)

ps, truth = make_screen()

for name, fn in [("uncorrected", lambda p: (p <= 0.05, p)),
                 ("bonferroni", bonferroni),
                 ("holm", holm),
                 ("benjamini-hochberg", benjamini_hochberg)]:
    rej, _ = fn(ps)
    tp = int((rej & truth).sum())
    fp = int((rej & ~truth).sum())
    fdr = fp/max(rej.sum(), 1)
    print(f"{name:20s} discoveries {rej.sum():3d}  true {tp:2d}  "
          f"false {fp:3d}  observed FDR {fdr:5.1%}  power {tp/50:5.1%}")

# uncorrected          discoveries  76  true 30  false  46  observed FDR 60.5%  power 60.0%
# bonferroni           discoveries   4  true  4  false   0  observed FDR  0.0%  power  8.0%
# holm                 discoveries   4  true  4  false   0  observed FDR  0.0%  power  8.0%
# benjamini-hochberg   discoveries  22  true 21  false   1  observed FDR  4.5%  power 42.0%
#
# THE UNCORRECTED SCREEN IS 60% FALSE. Bonferroni finds 4 of 50 real
# effects. BH finds 21 of 50 with one false positive -- five times the
# discoveries at a defensible error rate.
#
# HOLM IS NEVER WORSE THAN BONFERRONI and often better; there is no
# reason to use Bonferroni when Holm is available, except that
# Bonferroni is easier to explain in a footnote.
`,
      hl: [8, 30, 60, 84],
      caption: "**Bonferroni finds 4 of 50 real effects; Benjamini-Hochberg finds 21 with one false positive.** Controlling the wrong error rate is not cautious — it discards 34 real findings."
    },

    { t: "callout", kind: "insight", title: "Which rate to control is a question about consequences", body: [
      { t: "p", text: "**FWER when a single false positive is costly and hard to reverse.** FDR when discoveries are leads that will be followed up anyway, so a few duds cost only the follow-up work." },
      { t: "code", lang: "python", numbered: false, title: "and the choice has a cost you can compute", code: `
# THE DECIDING QUESTION: what happens to a false discovery next?
#
#   IT GETS ACTED ON IRREVERSIBLY  -> FWER
#     a drug approved, a safety claim published, a system shipped to
#     millions, a person convicted
#
#   IT GETS INVESTIGATED FURTHER   -> FDR
#     a gene flagged for a follow-up assay, a metric flagged for
#     review, a candidate feature queued for an experiment
#
# PUT NUMBERS ON IT. If a follow-up costs C and a missed discovery
# costs M, the optimal q balances them:
def optimal_q(cost_followup, cost_missed, n_tests, n_true_expected):
    """Roughly: accept false leads until the marginal follow-up cost
    equals the marginal value of an extra true discovery."""
    return float(np.clip(cost_followup / (cost_followup + cost_missed),
                         1e-4, 0.5))

optimal_q(cost_followup=2_000, cost_missed=500_000, n_tests=20_000,
          n_true_expected=100)                  # 0.004
optimal_q(cost_followup=200_000, cost_missed=50_000, n_tests=20,
          n_true_expected=3)                    # 0.5 -> clamp, use FWER
#
# CHEAP FOLLOW-UP AND EXPENSIVE MISSES -> a loose q. EXPENSIVE
# FOLLOW-UP -> tighten it, or control FWER instead.

# THE COMMON MIDDLE GROUND IN PRODUCT WORK: a PRIMARY metric with no
# correction, and SECONDARY metrics under FDR.
def experiment_readout(primary_p, secondary_ps, alpha=0.05, q=0.10):
    """One pre-registered primary decision; secondaries as leads."""
    rej, adj = benjamini_hochberg(np.asarray(secondary_ps), q)
    return {
        "primary_significant": bool(primary_p < alpha),
        "primary_p": float(primary_p),
        "secondary_flagged": [i for i, r in enumerate(rej) if r],
        "secondary_adjusted_p": adj.tolist(),
        "note": ("Secondary metrics are exploratory and FDR-controlled "
                 f"at q={q}. They generate hypotheses; they do not "
                 "support the ship decision."),
    }
#
# THAT STRUCTURE IS WORTH ADOPTING WHOLESALE. It gives the primary
# decision full power, keeps the secondaries honest, and stops the
# familiar pattern of a null primary followed by a hunt through
# secondaries (lesson 5.4).`},
      { t: "p", text: "**The deciding question is what happens to a false discovery next.** Acted on irreversibly means FWER; investigated further means FDR — and cheap follow-up with expensive misses argues for a loose `q`." }
    ]},

    { t: "h2", n: "03", text: "Multiplicity you did not notice", id: "hidden" },

    { t: "code", lang: "python", title: "the tests you did not count", code: `
# EXPLICIT MULTIPLICITY IS EASY TO SEE AND EASY TO CORRECT. The
# damaging kind is implicit.

# 1. SUBGROUPS. Five binary splits give 2^5 - 1 = 31 subgroup
#    combinations, and analysts rarely stop at the main effect.
def subgroup_hunting(seed, n=2000, n_splits=5):
    r = np.random.default_rng(seed)
    a, b = r.normal(0, 1, n), r.normal(0, 1, n)      # NO effect
    splits = r.integers(0, 2, (n_splits, n))
    ps = [stats.ttest_ind(a, b).pvalue]
    for i in range(n_splits):
        for v in (0, 1):
            m = splits[i] == v
            ps.append(stats.ttest_ind(a[m], b[m]).pvalue)
    return min(ps)

np.mean([subgroup_hunting(s) < 0.05 for s in range(3000)])    # 0.339

# 2. MULTIPLE METRICS ON ONE DASHBOARD. A typical experiment readout
#    shows 15-40 metrics, and any of them turning green is treated as
#    a finding.
np.mean([min(stats.ttest_ind(np.random.default_rng(s*100+i).normal(0,1,500),
                             np.random.default_rng(s*100+i+50).normal(0,1,500)
                             ).pvalue for i in range(25)) < 0.05
         for s in range(1000)])                                # ~0.72

# 3. MULTIPLE TIME WINDOWS. 1-day, 7-day, 14-day and 30-day retention
#    is four tests of one hypothesis.
#
# 4. MULTIPLE MODEL SPECIFICATIONS. With covariates, transforms and
#    outlier rules there are dozens of defensible pipelines, and only
#    one gets reported (lesson 5.7).
#
# 5. MULTIPLE EXPERIMENTS OVER TIME. A team running 100 experiments a
#    year at alpha = 0.05 ships 5 pure-noise features annually, and
#    nobody counts across experiments.
100 * 0.05                                                     # 5/year

# 6. PEEKING. Every look is a test (lesson 5.7).

# THE DEFENCE IS TO DEFINE THE FAMILY IN ADVANCE:
def define_family(primary, secondary, guardrail):
    """State up front what is being tested and how each will be judged.

    THE FAMILY IS THE SET OF TESTS AMONG WHICH YOU WOULD BE WILLING TO
    CLAIM A FINDING. If you would report any green metric, all of them
    are in the family -- regardless of what the plan says."""
    return {
        "primary": {"metrics": primary, "alpha": 0.05,
                    "correction": "none -- single pre-registered test"},
        "secondary": {"metrics": secondary, "q": 0.10,
                      "correction": "benjamini-hochberg"},
        "guardrail": {"metrics": guardrail, "alpha": 0.05,
                      "correction": ("none -- we WANT sensitivity to "
                                     "harm, and correcting would make "
                                     "us less likely to detect it")},
    }

define_family(primary=["conversion"],
              secondary=["aov", "sessions", "retention_7d", "nps"],
              guardrail=["error_rate", "latency_p99", "unsubscribes"])
#
# GUARDRAILS ARE THE EXCEPTION WORTH KNOWING. Correcting them makes
# you LESS likely to notice harm, which is the opposite of what a
# guardrail is for. Their false positives cost an investigation;
# their false negatives cost users.
`,
      hl: [16, 34, 45, 60],
      caption: "**Five binary subgroup splits give a 34% false-positive rate on data with no effect.** The damaging multiplicity is the kind nobody counts as tests."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Design the correction policy for an experiment platform",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "You own the experimentation platform. Every experiment readout currently shows 34 metrics with uncorrected p-values, and teams ship whenever any turns green. Design and justify a policy." },
        { t: "code", lang: "python", numbered: false, title: "what the platform reports today", code: `
METRICS = {
    "primary":   ["conversion_rate"],
    "secondary": ["aov", "sessions_per_user", "retention_d7",
                  "retention_d30", "search_usage", "cart_adds",
                  "checkout_starts", "nps", "support_tickets",
                  "time_on_site"],
    "guardrail": ["error_rate", "p99_latency", "crash_rate",
                  "unsubscribe_rate"],
    "segments":  ["mobile", "desktop", "new_user", "returning",
                  "eu", "us", "apac"],
}
# 15 metrics x (1 + 7 segments) = 120 tests per experiment.
# The platform runs ~250 experiments per year.`},
        { t: "p", text: "Give the policy, quantify what it fixes, and say what it costs." }
      ],
      requirements: [
        "Quantify the current false-positive rate per experiment and per year.",
        "Assign an error-rate policy to each metric class, with reasoning.",
        "Handle the segment multiplicity separately.",
        "Implement the policy.",
        "Say what teams will complain about and answer it.",
        "Include tests."
      ],
      hint: "Guardrails should not be corrected the same way as secondary metrics — work out why.",
      solution: {
        lang: "python",
        title: "policy.py",
        code: `import numpy as np
from scipy import stats

N_PRIMARY, N_SECONDARY, N_GUARDRAIL, N_SEGMENTS = 1, 10, 4, 7
EXPERIMENTS_PER_YEAR = 250
TESTS_PER_EXPERIMENT = (N_PRIMARY + N_SECONDARY + N_GUARDRAIL) * (1 + N_SEGMENTS)
TESTS_PER_EXPERIMENT                              # 120


# =========================================================================
# THE CURRENT DAMAGE
# =========================================================================

p_any = 1 - 0.95**TESTS_PER_EXPERIMENT
p_any                                             # 0.998
#
# 99.8% OF EXPERIMENTS SHOW AT LEAST ONE SIGNIFICANT METRIC, whether
# or not anything works. "We found a win" carries no information at
# all under the current policy.

expected_fp = 0.05 * TESTS_PER_EXPERIMENT         # 6.0 per experiment
expected_fp * EXPERIMENTS_PER_YEAR                # 1,500 per year
#
# FIFTEEN HUNDRED FALSE POSITIVES A YEAR. If teams ship on any green
# metric, the platform is a machine for shipping noise -- and it will
# look productive while doing it.

# HOW MANY FEATURES SHIP ON NOISE ALONE, assuming a team ships when
# any metric is green and roughly a third of experiments contain a
# real effect:
def ships_on_noise(n_tests=120, p_real=0.33, trials=20_000, seed=0):
    r = np.random.default_rng(seed)
    noise_ships = 0
    for _ in range(trials):
        if r.random() < p_real:
            continue                              # a real effect exists
        if r.random() < 1 - 0.95**n_tests:        # something turned green
            noise_ships += 1
    return noise_ships / trials

ships_on_noise() * EXPERIMENTS_PER_YEAR           # ~167 per year


# =========================================================================
# THE POLICY, CLASS BY CLASS
# =========================================================================
#
# PRIMARY -- one pre-registered metric, alpha = 0.05, NO CORRECTION.
#   There is one test, so there is nothing to correct. This is the
#   ship decision and it gets full power.
#   Rule: the primary metric is declared before the experiment starts
#   and cannot be changed afterwards.
#
# SECONDARY -- FDR at q = 0.10, Benjamini-Hochberg.
#   These are leads, not decisions. A false lead costs an
#   investigation; a missed one costs an idea. q = 0.10 rather than
#   0.05 because follow-up is cheap here.
#   Rule: secondary results never justify shipping on their own.
#
# GUARDRAIL -- alpha = 0.05, NO CORRECTION, and one-sided towards harm.
#   THIS IS THE COUNTERINTUITIVE ONE. Correcting guardrails makes you
#   LESS likely to detect harm, which inverts their purpose. Their
#   false positives cost an investigation; their false negatives cost
#   users.
#   Rule: any guardrail breach blocks the ship pending review,
#   regardless of the primary result.
#
# SEGMENTS -- FDR at q = 0.10 WITHIN each metric, and flagged as
#   exploratory always.
#   Rule: a segment result never justifies a segment-only rollout
#   without a confirmatory experiment in that segment.

def apply_policy(primary_p, secondary_ps, guardrail_ps,
                 segment_ps=None, alpha=0.05, q=0.10):
    """One decision, several classes of evidence."""
    out = {}

    # PRIMARY: one test, uncorrected.
    out["primary"] = {"p": float(primary_p),
                      "significant": bool(primary_p < alpha)}

    # SECONDARY: FDR-controlled leads.
    sec = np.asarray(secondary_ps, float)
    rej, adj = benjamini_hochberg(sec, q)
    out["secondary"] = {"flagged": np.flatnonzero(rej).tolist(),
                        "adjusted_p": adj.tolist(),
                        "role": "hypothesis-generating only"}

    # GUARDRAILS: uncorrected, deliberately sensitive.
    g = np.asarray(guardrail_ps, float)
    out["guardrail"] = {"breached": np.flatnonzero(g < alpha).tolist(),
                        "note": ("uncorrected by design -- a missed harm "
                                 "costs users, a false alarm costs a "
                                 "review")}

    # SEGMENTS: FDR within each metric.
    if segment_ps is not None:
        out["segments"] = {}
        for metric, ps in segment_ps.items():
            r_, a_ = benjamini_hochberg(np.asarray(ps, float), q)
            out["segments"][metric] = {"flagged": np.flatnonzero(r_).tolist(),
                                       "adjusted_p": a_.tolist()}

    # THE DECISION, stated explicitly rather than left to the reader.
    out["decision"] = (
        "BLOCK: guardrail breach" if out["guardrail"]["breached"] else
        "SHIP: primary metric significant" if out["primary"]["significant"] else
        "DO NOT SHIP: primary metric not significant"
    )
    return out


# =========================================================================
# WHAT THE POLICY FIXES
# =========================================================================

def policy_false_positive_rate(trials=20_000, seed=0):
    """A pure-noise experiment. How often does the policy say SHIP?"""
    r = np.random.default_rng(seed)
    ships = 0
    for _ in range(trials):
        primary = r.uniform()                     # uniform under the null
        secondary = r.uniform(size=N_SECONDARY)
        guard = r.uniform(size=N_GUARDRAIL)
        d = apply_policy(primary, secondary, guard)
        ships += d["decision"].startswith("SHIP")
    return ships / trials

policy_false_positive_rate()                      # ~0.041
#
# 4.1% -- BELOW the nominal 5%, because a spurious guardrail breach
# occasionally blocks a spurious ship. Down from 99.8%.

0.041 * EXPERIMENTS_PER_YEAR                      # ~10 per year
#
# TEN FALSE SHIPS A YEAR INSTEAD OF ~167. And the ten are all
# single-metric primary false positives, which is the irreducible
# cost of alpha = 0.05.

# WHAT IT COSTS IN POWER on the secondaries:
ps, truth = make_screen(m=10, n_true=3, effect=0.45, n=400, seed=3)
uncorrected = int((ps < 0.05).sum())
flagged = int(benjamini_hochberg(ps, 0.10)[0].sum())
uncorrected, flagged                              # e.g. 4, 3
#
# One fewer flagged lead out of ten. THAT IS THE ENTIRE COST, and it
# buys the difference between 167 and 10 false ships.


# =========================================================================
# WHAT TEAMS WILL COMPLAIN ABOUT
# =========================================================================
#
# COMPLAINT 1: "Our secondary metric moved and you will not let us
#               ship."
#   ANSWER: correct -- that is what a secondary metric is. If you
#   believe the effect, run a confirmatory experiment with that metric
#   as primary. It will take two weeks and you will actually know.
#   THE POLICY DOES NOT FORBID THE CLAIM; IT REQUIRES A TEST OF IT.
#
# COMPLAINT 2: "Correcting for 7 segments makes segment analysis
#               useless."
#   ANSWER: BH at q = 0.10 across 7 segments is a mild correction --
#   the smallest p only needs to beat 0.014, and the largest can be as
#   high as 0.10. It is not Bonferroni.
(np.arange(1, 8)/7 * 0.10).round(4)               # [0.014 ... 0.100]
#
# COMPLAINT 3: "Guardrails are uncorrected, so we get false alarms."
#   ANSWER: yes, about 0.2 per experiment, roughly 50 reviews a year.
#   That is the price of detecting real harm, and the asymmetry is
#   deliberate. If review cost is the issue, raise the guardrail
#   thresholds -- do not correct them.
1 - 0.95**N_GUARDRAIL                             # 0.185 per experiment
#
# COMPLAINT 4: "This makes it harder to show impact."
#   ANSWER: it makes it harder to show FALSE impact. Under the old
#   policy 99.8% of experiments produced a green metric, so the metric
#   carried no information about whether anything worked. The new
#   policy makes a win mean something.
#
# THE ONE ACCOMMODATION WORTH MAKING: let teams declare TWO primary
# metrics with Bonferroni at 0.025 each, for genuinely two-sided
# objectives like "revenue or retention". It costs little power and
# removes the strongest objection.
stats.norm.ppf(1-0.025/2) / stats.norm.ppf(1-0.05/2)   # 1.14x the n


# =========================================================================
# TESTS
# =========================================================================

def test_current_policy_is_essentially_guaranteed_to_find_something():
    assert 1 - 0.95**TESTS_PER_EXPERIMENT > 0.99


def test_policy_restores_the_nominal_rate():
    rate = policy_false_positive_rate(trials=5000)

    assert rate < 0.06


def test_guardrails_are_not_corrected():
    """A guardrail at p = 0.04 must still block, even with four of
    them."""
    d = apply_policy(0.01, [0.5]*10, [0.04, 0.5, 0.5, 0.5])

    assert d["decision"].startswith("BLOCK")


def test_secondary_alone_cannot_ship():
    d = apply_policy(primary_p=0.40, secondary_ps=[0.001]*10,
                     guardrail_ps=[0.9]*4)

    assert d["decision"].startswith("DO NOT SHIP")
    assert len(d["secondary"]["flagged"]) > 0        # flagged, not shipped


def test_bh_is_milder_than_bonferroni():
    ps = np.array([0.001, 0.02, 0.03, 0.06, 0.09, 0.4, 0.5, 0.6, 0.7, 0.8])

    assert benjamini_hochberg(ps, 0.10)[0].sum() > bonferroni(ps)[0].sum()


def test_holm_never_worse_than_bonferroni():
    r = np.random.default_rng(0)
    for _ in range(200):
        ps = r.uniform(size=20)
        assert holm(ps)[0].sum() >= bonferroni(ps)[0].sum()


def test_bh_controls_fdr_on_a_screen():
    fdrs = []
    for seed in range(30):
        ps, truth = make_screen(m=500, n_true=25, effect=0.5, n=60, seed=seed)
        rej = benjamini_hochberg(ps, 0.05)[0]
        if rej.sum():
            fdrs.append((rej & ~truth).sum() / rej.sum())

    assert np.mean(fdrs) < 0.08                      # ~q, within noise


def test_bh_finds_far_more_than_bonferroni():
    ps, truth = make_screen(m=1000, n_true=50, effect=0.5, n=60, seed=0)

    assert (benjamini_hochberg(ps)[0] & truth).sum() > \\
           4 * (bonferroni(ps)[0] & truth).sum()`,
        notes: [
          { t: "p", text: "**99.8% of experiments currently show at least one significant metric**, whether or not anything works — so \"we found a win\" carries no information. That is 1,500 false positives a year, and roughly 167 features shipped on noise." },
          { t: "callout", kind: "insight", title: "Guardrails must not be corrected, and that is deliberate", body: [
            { t: "p", text: "Correcting them makes you *less* likely to detect harm, which inverts their purpose. A guardrail's false positive costs an investigation; its false negative costs users, so the asymmetry runs the other way from every other metric." },
            { t: "p", text: "The price is about 0.2 false alarms per experiment — roughly 50 reviews a year. If that is too many, raise the thresholds rather than applying a correction." }
          ]},
          { t: "p", text: "**The policy's false-ship rate is 4.1%, slightly *below* nominal**, because an occasional spurious guardrail breach blocks an occasional spurious ship. Ten false ships a year instead of 167." },
          { t: "p", text: "**The cost is about one fewer flagged lead in ten.** That is the entire price of the correction, and BH at `q = 0.10` across seven segments is mild — the smallest p only needs to beat 0.014 and the largest can reach 0.10." },
          { t: "p", text: "**The answer to \"our secondary moved\" is not refusal but a test.** The policy does not forbid the claim; it requires the claim to be made primary in a confirmatory experiment, which takes two weeks and settles it." },
          { t: "p", text: "**Holm is never worse than Bonferroni**, so there is no reason to use Bonferroni except that it is easier to explain in a footnote." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A clinical trial missed its primary endpoint, then reported a significant benefit in patients aged 55 to 64 — one of nine age bands examined after the fact." },
      { t: "p", text: "**Nine subgroups at `α = 0.05` give a 37% chance of at least one significant band under no effect at all.** The finding was reported without correction and without noting how many bands had been examined." },
      { t: "p", text: "**A confirmatory trial in that age band alone found nothing.** The subgroup result was the expected yield of a nine-way search, and the second trial cost four years." },
      { t: "p", text: "**Declare the family before running anything**, and treat any post-hoc subgroup as hypothesis-generating. The correction is not the hard part — counting the tests honestly is." }
    ]}
  ],

  takeaways: [
    "**Twenty tests at `α = 0.05` give a 64% chance of a false positive**; a hundred give 99.4%.",
    "**`E[false positives] = α × m` is the more useful form** — a 20,000-gene scan yields 1,000 from noise alone.",
    "**Correlated tests reduce the family-wise rate but never rescue you** — at `ρ = 0.95` it is still four times nominal.",
    "**FWER asks whether *any* discovery is false; FDR asks what fraction are.** They are different jobs, not different strengths.",
    "**Bonferroni found 4 of 50 real effects where Benjamini-Hochberg found 21** with one false positive.",
    "**Holm is uniformly at least as powerful as Bonferroni**, so use it unless a footnote needs the simpler explanation.",
    "**Choose the rate by what happens to a false discovery next**: acted on irreversibly means FWER, investigated further means FDR.",
    "**Guardrail metrics should not be corrected** — correcting them makes you less likely to detect harm, inverting their purpose.",
    "**Five binary subgroup splits give a 34% false-positive rate** on data with no effect at all.",
    "**A 25-metric dashboard turns something green 72% of the time** under the null.",
    "**The family is the set of tests among which you would claim a finding** — if you would report any green metric, all of them are in it.",
    "**A team running 100 experiments a year at `α = 0.05` ships five noise features annually**, and nobody counts across experiments."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your experiment dashboard shows 25 metrics with uncorrected p-values. How often does at least one turn green under no effect?",
        options: [
          "5% of the time",
          "About 72% — `1 − 0.95²⁵`, so a green metric carries almost no information",
          "25% of the time",
          "It depends on the correlation between metrics"
        ],
        answer: 1,
        why: "Correlation between metrics reduces the rate but never removes it — even at `ρ = 0.95` across 20 tests it is nearly four times nominal. The expected-count form, `α × m`, makes the problem obvious: 1.25 false positives per readout."
      },
      {
        stem: "Screening 20,000 genes, you want to control the proportion of false discoveries among those you report. Which correction?",
        options: [
          "Bonferroni",
          "Benjamini-Hochberg — FDR is the right rate when discoveries are leads that will be followed up",
          "No correction, since the tests are correlated",
          "Holm"
        ],
        answer: 1,
        why: "On a 1,000-test screen with 50 real effects, Bonferroni found 4 and BH found 21 with one false positive. Controlling FWER here is not cautious — it discards 34 real findings to avoid a single false one."
      },
      {
        stem: "Should guardrail metrics (error rate, latency, crashes) be corrected for multiplicity?",
        options: [
          "Yes, like all other metrics",
          "No — correcting them makes you less likely to detect harm, and a guardrail's false negative costs users while its false positive costs a review",
          "Yes, but with a looser `q`",
          "Only if there are more than ten of them"
        ],
        answer: 1,
        why: "The cost asymmetry runs the opposite way from every other metric class. The price is about 0.2 false alarms per experiment; if that is too many, raise the thresholds rather than applying a correction."
      },
      {
        stem: "A trial misses its primary endpoint but finds significance in one of nine age subgroups. How much should you believe it?",
        options: [
          "It is a real effect in that subgroup",
          "Very little — nine subgroups give a 37% chance of at least one significant band under no effect, and the search was post-hoc",
          "It is real if the p-value is below 0.01",
          "It depends on the subgroup's sample size"
        ],
        answer: 1,
        why: "This is the expected yield of a nine-way search. Declaring the family before running anything is the defence — the correction is not the hard part, counting the tests honestly is."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why does running many tests cause a problem?",
        strong: "Because `α` is a per-test error rate. At 20 tests the chance of at least one false positive is 64%, and the expected count is one — so with a large enough dashboard, finding something significant is guaranteed rather than informative.",
        answer: [
          { t: "p", text: "The expected-count framing, `α × m`, communicates faster than the FWER formula and generalises better." },
          { t: "p", text: "Noting that correlation reduces but never removes the problem pre-empts the usual objection." }
        ]
      },
      {
        level: "advanced",
        q: "Bonferroni or Benjamini-Hochberg?",
        strong: "It depends on what a false discovery costs next. FWER when it gets acted on irreversibly; FDR when it becomes a lead for follow-up. On a screen with 1,000 tests, Bonferroni might find 4 real effects where BH finds 21 with one false positive.",
        answer: [
          { t: "p", text: "Framing it as a question about consequences rather than about strictness is what the question is testing." },
          { t: "p", text: "Adding that Holm dominates Bonferroni shows you know the FWER family too, not just the headline choice." }
        ]
      },
      {
        level: "advanced",
        q: "How would you handle multiplicity on an experiment platform?",
        strong: "A pre-registered primary metric with no correction, secondaries under FDR as leads only, and guardrails uncorrected — because correcting a guardrail makes you less likely to detect harm. Segments FDR-controlled within each metric and always exploratory.",
        answer: [
          { t: "p", text: "The guardrail exception is the detail that shows you have thought about it rather than applied a rule uniformly." },
          { t: "p", text: "Insisting the family is declared before the experiment is the part that actually works — the arithmetic is easy, the counting is not." }
        ]
      }
    ]
  }
});

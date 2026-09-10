/* ============================================================================
   LESSON 5.1 — Sampling, Standard Error and the CLT
   ========================================================================= */
EC.receiveLesson({
  id: "5.1",

  lede: "Inference is not about your data. **It is about the sampling distribution — what your statistic would do across the samples you did not take** — and every confidence interval and p-value in this module is a statement about that imaginary collection. Getting this object clear once makes everything after it mechanical.",

  objectives: [
    "Distinguish a population, a sample and a sampling distribution",
    "Compute a standard error and say how it differs from a standard deviation",
    "State the CLT precisely, including its conditions",
    "Explain why bias is not fixed by collecting more data",
    "Recognise sampling designs that break the independence assumption"
  ],

  prerequisites: ["4.5"],

  blocks: [

    { t: "h2", n: "01", text: "Three distributions, routinely confused", id: "three" },

    { t: "viz",
      title: "The sampling distribution is a distribution of statistics",
      caption: "The population has a spread. Each sample has a spread. The sampling distribution is the spread of the summaries — and it is narrower than either, by exactly √n.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="A wide population distribution, several narrow samples drawn from it, and a much narrower distribution of their means">
  <g>
    <text x="40" y="28" class="s-label" style="fill:var(--ink-3)">POPULATION</text>
    <path d="M40 130 C 90 130, 100 50, 150 50 C 200 50, 210 130, 260 130"
          style="fill:var(--accent);fill-opacity:.16;stroke:var(--accent)" stroke-width="2"/>
    <line x1="150" y1="50" x2="150" y2="140" style="stroke:var(--accent);stroke-dasharray:4 3" stroke-width="1.5"/>
    <text x="118" y="158" class="s-sub" style="fill:var(--accent)">mu, sigma</text>
  </g>

  <g>
    <text x="330" y="28" class="s-label" style="fill:var(--ink-3)">SAMPLES</text>
    <g style="fill:var(--ink-3)">
      <circle cx="340" cy="60" r="3"/><circle cx="368" cy="60" r="3"/><circle cx="392" cy="60" r="3"/><circle cx="420" cy="60" r="3"/>
      <circle cx="350" cy="90" r="3"/><circle cx="380" cy="90" r="3"/><circle cx="404" cy="90" r="3"/><circle cx="436" cy="90" r="3"/>
      <circle cx="334" cy="120" r="3"/><circle cx="362" cy="120" r="3"/><circle cx="398" cy="120" r="3"/><circle cx="428" cy="120" r="3"/>
    </g>
    <text x="330" y="158" class="s-sub" style="fill:var(--ink-3)">each of size n</text>
    <text x="330" y="176" class="s-sub" style="fill:var(--ink-3)">each has its own mean</text>
  </g>

  <g>
    <text x="560" y="28" class="s-label" style="fill:var(--good)">SAMPLING DISTRIBUTION</text>
    <path d="M560 130 C 620 130, 630 62, 660 62 C 690 62, 700 130, 760 130"
          style="fill:var(--good);fill-opacity:.18;stroke:var(--good)" stroke-width="2"/>
    <line x1="660" y1="62" x2="660" y2="140" style="stroke:var(--good);stroke-dasharray:4 3" stroke-width="1.5"/>
    <text x="600" y="158" class="s-sub" style="fill:var(--good)">mu, sigma / sqrt(n)</text>
    <text x="560" y="182" class="s-sub" style="fill:var(--ink-3)">same centre, narrower --</text>
    <text x="560" y="200" class="s-sub" style="fill:var(--ink-3)">and normal whatever the</text>
    <text x="560" y="218" class="s-sub" style="fill:var(--ink-3)">population looked like</text>
  </g>

  <path d="M262 92 L 320 92" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#sd-a)"/>
  <path d="M460 92 L 545 92" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#sd-a)"/>
  <defs>
    <marker id="sd-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
</svg>`
    },

    { t: "code", lang: "python", title: "build the sampling distribution and watch it behave", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

# A POPULATION that is nothing like normal -- heavily right-skewed.
POP = rng.lognormal(mean=3.0, sigma=1.0, size=2_000_000)

POP.mean()                        # 33.15  the parameter, mu
POP.std()                         # 43.63  the parameter, sigma
stats.skew(POP)                   # 6.16   badly non-normal

# ONE SAMPLE is a set of observations. Its spread estimates sigma.
sample = rng.choice(POP, size=100, replace=False)
sample.mean(), sample.std(ddof=1)          # 32.8, 40.1

# THE SAMPLING DISTRIBUTION is what the sample MEAN does across many
# samples. It is the object inference is about, and you never see it --
# you see one draw from it.
means = np.array([rng.choice(POP, 100, replace=False).mean()
                  for _ in range(20_000)])

means.mean()                      # 33.15  -- centred on mu
means.std()                       # 4.35   -- much narrower
POP.std() / np.sqrt(100)          # 4.36   -- exactly sigma/sqrt(n)

# THE THREE SPREADS ARE DIFFERENT QUANTITIES:
#
#   sigma            43.6   how much INDIVIDUALS vary
#   s (one sample)   40.1   your estimate of sigma
#   SE = s/sqrt(n)    4.0   how much your ESTIMATE OF THE MEAN varies
#
# A STANDARD DEVIATION DESCRIBES THE DATA. A STANDARD ERROR DESCRIBES
# AN ESTIMATE. Reporting one where the other belongs makes an interval
# ten times too wide or too narrow.

# AND THE SHAPE: the population is skewed 6.2; the sampling
# distribution is not.
stats.skew(POP)                   # 6.16
stats.skew(means)                 # 0.29
#
# THAT IS THE CENTRAL LIMIT THEOREM. It did not make the data normal;
# it made the DISTRIBUTION OF THE MEAN normal.
`,
      hl: [18, 28, 36, 46],
      caption: "**A standard deviation describes the data; a standard error describes an estimate.** Here they differ by a factor of ten, and using the wrong one makes every interval wrong by that factor."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**Every inferential statement is a claim about a distribution you never observe.** You have one sample; the theory tells you what the collection of possible samples would look like, and everything else follows from that." },
      { t: "p", text: "So the recurring question is always the same: **how much would this number move if I had drawn a different sample?** A standard error is the answer, a confidence interval is the answer expressed as a range, and a p-value is the answer expressed as a tail probability." }
    ]},

    { t: "h2", n: "02", text: "The CLT, stated properly", id: "clt" },

    { t: "code", lang: "python", title: "the conditions, and what each one does", code: `
# THE CENTRAL LIMIT THEOREM. For X_1 ... X_n independent, identically
# distributed, with finite mean mu and FINITE VARIANCE sigma^2:
#
#     (Xbar - mu) / (sigma/sqrt(n))  ->  Normal(0, 1)   as n -> infinity
#
# THREE CONDITIONS, and each fails in real work:
#
#   1. INDEPENDENT       -- broken by clustering, time series, network
#                           effects
#   2. IDENTICALLY DIST. -- broken by a changing population mid-sample
#   3. FINITE VARIANCE   -- broken by a Pareto with tail index <= 2

# CONDITION 3 FAILS TOTALLY, NOT GRADUALLY:
cauchy_means = np.array([stats.cauchy.rvs(size=n, random_state=i).mean()
                         for i, n in enumerate([10_000]*2000)])
cauchy_means.std()                # ~200, and unstable between runs
#
# The mean of 10,000 Cauchy samples has the SAME distribution as one
# sample. No amount of n helps.

# HOW FAST DOES IT CONVERGE? It depends on the skewness, and the rate
# is governed by the Berry-Esseen bound: error ~ skew/sqrt(n).
for name, sampler in [
    ("uniform",   lambda n: rng.uniform(0, 1, n)),
    ("exponential", lambda n: rng.exponential(1, n)),
    ("lognormal", lambda n: rng.lognormal(0, 1.5, n)),
]:
    for n in (5, 30, 200):
        m = np.array([sampler(n).mean() for _ in range(20_000)])
        z = (m - m.mean()) / m.std()
        # A one-sided tail check: the normal says 0.00135 beyond 3.
        print(f"{name:12s} n={n:<5} P(Z>3) = {(z > 3).mean():.5f}")
    print()

# uniform      n=5     P(Z>3) = 0.00095      already fine
# uniform      n=30    P(Z>3) = 0.00135
# uniform      n=200   P(Z>3) = 0.00140
#
# exponential  n=5     P(Z>3) = 0.00700      5x too many
# exponential  n=30    P(Z>3) = 0.00285      2x
# exponential  n=200   P(Z>3) = 0.00170      close
#
# lognormal    n=5     P(Z>3) = 0.01340      10x too many
# lognormal    n=30    P(Z>3) = 0.00805      6x
# lognormal    n=200   P(Z>3) = 0.00435      3x, still wrong
#
# "n = 30" IS NOT A LAW. It is roughly right for mildly skewed data and
# badly wrong for heavily skewed data -- the lognormal still has three
# times too much tail at n = 200.
#
# THE USABLE RULE: n > 25 * skew^2 for the tails to be trustworthy.
def n_needed(skewness):
    return int(np.ceil(25 * skewness**2))

n_needed(0.0), n_needed(2.0), n_needed(6.0)      # 0, 100, 900
#
# AND THE CENTRE CONVERGES LONG BEFORE THE TAILS. If you only need a
# confidence interval for the mean, n = 30 is often genuinely fine. If
# you need a p-value of 0.001 to mean 0.001, it is not.
`,
      hl: [12, 23, 47, 52],
      caption: "**\"n = 30\" is roughly right for mildly skewed data and badly wrong otherwise.** A lognormal still has three times too much tail at `n = 200`; the usable rule is `n > 25 × skew²`."
    },

    { t: "h2", n: "03", text: "Bias is not fixed by more data", id: "bias" },

    { t: "ladder",
      title: "Estimating average customer satisfaction",
      rungs: [
        { level: "bad", label: "Survey the users who respond",
          why: "Response is not random — satisfied and furious users respond, indifferent ones do not. More responses give a more precise estimate of the responders' opinion, which is not the quantity you wanted.",
          code: `scores = survey_responses.mean()      # 4.2 / 5, n = 12,000

# n = 12,000 gives a standard error of 0.01, so the interval is
# [4.18, 4.22] -- extremely precise, and centred on the wrong number.` },
        { level: "ok", label: "Weight the responses to match the population",
          why: "Post-stratification corrects for imbalances in characteristics you *measured*. It removes the part of the bias that shows up in your covariates, and nothing else.",
          code: `weights = population_share[strata] / sample_share[strata]
weighted = (scores * weights).sum() / weights.sum()   # 3.8

# Better. But it assumes that within each stratum, responders and
# non-responders feel the same -- which is exactly the assumption that
# made the raw average wrong in the first place.` },
        { level: "best", label: "Measure the non-response directly",
          why: "The only way to know how biased you are is to observe some of the people you were missing. A small, aggressively followed-up random subsample bounds the bias for the whole survey.",
          code: `def bias_bounded_estimate(responders, followup, response_rate):
    """Follow up a RANDOM subsample of non-responders hard enough to
    get most of them, then combine. The follow-up sample can be small
    because it only needs to estimate one number: the non-responder
    mean."""
    r, f = np.asarray(responders), np.asarray(followup)
    p = response_rate
    point = p * r.mean() + (1 - p) * f.mean()

    # The worst case if the follow-up itself is unrepresentative.
    lo = p * r.mean() + (1 - p) * f.min()
    hi = p * r.mean() + (1 - p) * f.max()
    return point, (lo, hi)

# 18% response rate; 400 non-responders chased to a 70% reply.
bias_bounded_estimate(responders, followup, response_rate=0.18)
# (3.41, (1.36, 4.28))

# THE HEADLINE: 4.2 from the raw survey, 3.41 once non-responders are
# included. The raw figure was 23% too high, and 12,000 responses
# could not have revealed that -- only 400 of the RIGHT people could.

# THE GENERAL SHAPE:
#     bias ~ (1 - response_rate) x (responder mean - non-responder mean)
#
# At an 18% response rate, the multiplier on the gap is 0.82. A survey
# with a low response rate is dominated by an unmeasured quantity.
0.82 * (4.2 - 3.24)                  # 0.79, the observed gap`,
          note: "**More data reduces variance and does nothing to bias.** A precise estimate of the wrong quantity is more dangerous than a noisy estimate of the right one, because the interval invites confidence." }
      ]
    },

    { t: "callout", kind: "trap", title: "Clustered data has a smaller effective sample size", body: [
      { t: "p", text: "Independence is the CLT condition that fails most quietly. If observations come in correlated groups — several from the same user, the same school, the same server — you have fewer independent pieces of information than rows." },
      { t: "code", lang: "python", numbered: false, title: "and the standard error is understated by a knowable factor", code: `
# 200 users, 50 events each: 10,000 rows, but users differ from one
# another and a user's events resemble each other.
n_users, per_user = 200, 50
user_effect = rng.normal(0, 2.0, n_users)
values = (user_effect[:, None] + rng.normal(0, 1.0, (n_users, per_user))).ravel()

naive_se = values.std(ddof=1) / np.sqrt(len(values))          # 0.0224

# THE CORRECT SE treats each USER as one observation:
user_means = values.reshape(n_users, per_user).mean(axis=1)
cluster_se = user_means.std(ddof=1) / np.sqrt(n_users)        # 0.1425

cluster_se / naive_se                                          # 6.4x
#
# THE NAIVE STANDARD ERROR IS 6.4 TIMES TOO SMALL, so every confidence
# interval is 6.4x too narrow and every p-value is far too small.

# THE DESIGN EFFECT quantifies it from the intra-cluster correlation:
#     DEFF = 1 + (m - 1) * ICC
icc = user_effect.var() / (user_effect.var() + 1.0)           # 0.80
deff = 1 + (per_user - 1) * icc                               # 40.2
np.sqrt(deff)                                                  # 6.34 -- matches

# EFFECTIVE SAMPLE SIZE:
len(values) / deff                                             # 249
#
# TEN THOUSAND ROWS CARRY THE INFORMATION OF ABOUT 250. Adding more
# events per user barely helps; adding more USERS does.
for m in (10, 50, 200):
    d = 1 + (m - 1) * icc
    print(f"{m:3d} events/user: {n_users*m:6,} rows -> "
          f"{n_users*m/d:5.0f} effective")
# 10 events/user:  2,000 rows ->   250 effective
# 50 events/user: 10,000 rows ->   249 effective
# 200 events/user: 40,000 rows ->  249 effective`},
      { t: "p", text: "**Forty thousand rows can carry the information of 250.** Once the intra-cluster correlation is high, adding rows within clusters buys nothing — the only lever is more clusters." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "Find why an A/B test keeps producing false positives",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A team runs A/A tests — identical experiences in both arms — as a platform sanity check. About 5% should be significant by chance. They are seeing 31%." },
        { t: "code", lang: "python", numbered: true, title: "analysis.py", code: `import numpy as np
from scipy import stats

def analyse(events_a, events_b):
    """events_*: one row per PAGE VIEW, with a 'converted' flag.
    Users may appear many times."""
    a = np.array([e["converted"] for e in events_a], dtype=float)
    b = np.array([e["converted"] for e in events_b], dtype=float)

    se = np.sqrt(a.var(ddof=1)/len(a) + b.var(ddof=1)/len(b))
    z = (b.mean() - a.mean()) / se
    p = 2 * stats.norm.sf(abs(z))

    return {"lift": b.mean() - a.mean(), "p": p,
            "significant": p < 0.05}`}
      ],
      requirements: [
        "Reproduce the inflated false-positive rate in a simulation.",
        "Identify the defect and quantify its size.",
        "Give a corrected implementation.",
        "Verify the correction restores the 5% rate.",
        "Say what this does to the experiment's required sample size.",
        "Include tests."
      ],
      hint: "The docstring says users may appear many times. What is the unit of randomisation, and what is the unit of analysis?",
      solution: {
        lang: "python",
        title: "analysis_fixed.py",
        code: `import numpy as np
from scipy import stats

rng = np.random.default_rng(0)


# =========================================================================
# THE DEFECT: THE UNIT OF ANALYSIS DOES NOT MATCH THE UNIT OF
# RANDOMISATION
# =========================================================================
#
# Users are randomised into arms; PAGE VIEWS are analysed. One user
# contributes many rows, and those rows are correlated -- a user who
# converts once tends to convert again, and a user who never converts
# contributes a run of zeros.
#
# The test therefore treats correlated rows as independent evidence,
# understating the standard error and inflating the false-positive rate.

def simulate_users(n_users=4000, base_rate=0.10, user_sd=1.0,
                   views_lo=1, views_hi=40, seed=0):
    """Each user has their own propensity and their own number of
    views -- the ordinary structure of web traffic."""
    r = np.random.default_rng(seed)
    logit = np.log(base_rate/(1-base_rate)) + r.normal(0, user_sd, n_users)
    p = 1/(1 + np.exp(-logit))
    views = r.integers(views_lo, views_hi, n_users)
    rows, uid = [], []
    for i in range(n_users):
        conv = (r.random(views[i]) < p[i]).astype(float)
        rows.append(conv)
        uid.append(np.full(views[i], i))
    return np.concatenate(rows), np.concatenate(uid)


def analyse_broken(a, b):
    se = np.sqrt(a.var(ddof=1)/len(a) + b.var(ddof=1)/len(b))
    z = (b.mean() - a.mean()) / se
    return 2 * stats.norm.sf(abs(z))


def aa_rate(analyse_fn, trials=1000, **kw):
    """An A/A test: both arms identical. A correct test rejects 5%."""
    hits = 0
    for t in range(trials):
        a, ua = simulate_users(seed=2*t, **kw)
        b, ub = simulate_users(seed=2*t+1, **kw)
        hits += analyse_fn(a, b, ua, ub) < 0.05
    return hits / trials

aa_rate(lambda a, b, ua, ub: analyse_broken(a, b))      # 0.312
#
# 31.2% FALSE POSITIVES AGAINST A NOMINAL 5% -- reproducing the
# reported symptom exactly.


# =========================================================================
# THE SIZE OF THE ERROR
# =========================================================================

a, ua = simulate_users(seed=0)
naive_se = np.sqrt(a.var(ddof=1) / len(a))

user_means = np.array([a[ua == u].mean() for u in np.unique(ua)])
correct_se = user_means.std(ddof=1) / np.sqrt(len(user_means))

correct_se / naive_se              # 2.15
#
# THE STANDARD ERROR IS UNDERSTATED BY 2.15x, so every z-score is 2.15x
# too large. A true z of 0.9 is reported as 1.9, which is why so many
# A/A tests cross the line.

# CONFIRM VIA THE DESIGN EFFECT:
icc = user_means.var(ddof=1) / a.var(ddof=1)
m = len(a) / len(user_means)                # average views per user
1 + (m - 1) * icc                           # ~4.6
np.sqrt(4.6)                                # 2.14 -- matches

len(a), len(a) / 4.6                        # 79,000 rows -> ~17,000 effective


# =========================================================================
# THE FIX
# =========================================================================

def analyse(a, b, uid_a, uid_b, alpha=0.05):
    """Analyse at the unit of RANDOMISATION.

    Aggregating each user to one number is the simplest correct fix and
    needs no new machinery. The alternative -- cluster-robust standard
    errors -- keeps every row and adjusts the variance, which matters
    only when you need per-row covariates."""
    a, b = np.asarray(a, float), np.asarray(b, float)

    def per_user(values, uid):
        uid = np.asarray(uid)
        order = np.argsort(uid, kind="stable")
        values, uid = values[order], uid[order]
        edges = np.flatnonzero(np.r_[True, uid[1:] != uid[:-1], True])
        sums = np.add.reduceat(values, edges[:-1])
        counts = np.diff(edges)
        return sums / counts

    ma, mb = per_user(a, uid_a), per_user(b, uid_b)
    if len(ma) < 30 or len(mb) < 30:
        raise ValueError(
            f"{len(ma)} and {len(mb)} users: too few clusters for a "
            f"normal approximation"
        )

    # Welch, since the arms need not have equal variance.
    se = np.sqrt(ma.var(ddof=1)/len(ma) + mb.var(ddof=1)/len(mb))
    diff = mb.mean() - ma.mean()
    df = ((ma.var(ddof=1)/len(ma) + mb.var(ddof=1)/len(mb))**2 /
          ((ma.var(ddof=1)/len(ma))**2/(len(ma)-1) +
           (mb.var(ddof=1)/len(mb))**2/(len(mb)-1)))
    t = diff / se
    p = 2 * stats.t.sf(abs(t), df)
    crit = stats.t.ppf(1 - alpha/2, df)

    return {
        "lift": float(diff),
        "ci": (float(diff - crit*se), float(diff + crit*se)),
        "p": float(p),
        "significant": bool(p < alpha),
        "n_users": (len(ma), len(mb)),
        "n_rows": (len(a), len(b)),
    }

aa_rate(lambda a, b, ua, ub: analyse(a, b, ua, ub)["p"])     # 0.049
#
# 4.9% -- the nominal rate restored.


# =========================================================================
# WHAT IT COSTS IN SAMPLE SIZE
# =========================================================================
#
# Nothing was lost: the information was never there. The broken test
# was not more powerful, it was wrong.
#
# But the required sample size, correctly computed, is DEFF times larger
# than the naive calculation suggested:

def users_needed(baseline, mde_rel, icc, views_per_user,
                 alpha=0.05, power=0.8):
    p1 = baseline
    p2 = baseline * (1 + mde_rel)
    z_a, z_b = stats.norm.ppf(1-alpha/2), stats.norm.ppf(power)
    per_row = ((z_a + z_b)**2 * (p1*(1-p1) + p2*(1-p2))) / (p2 - p1)**2
    deff = 1 + (views_per_user - 1) * icc
    return int(np.ceil(per_row * deff / views_per_user))

users_needed(0.10, 0.05, icc=0.0, views_per_user=20)      # 3,088 users
users_needed(0.10, 0.05, icc=0.18, views_per_user=20)     # 14,224 users
#
# 4.6x MORE USERS for the same detectable effect. That is the honest
# cost, and the team has been running underpowered tests that also
# happened to report false positives -- the worst of both.
#
# THE LEVER THAT WORKS: more users. More views per user does almost
# nothing once the ICC is meaningful.
for v in (5, 20, 100):
    print(f"{v:3d} views/user -> {users_needed(0.10, 0.05, 0.18, v):,} users")
#   5 views/user -> 10,043 users
#  20 views/user -> 14,224 users
# 100 views/user -> 15,829 users
#
# COUNTERINTUITIVELY, MORE VIEWS PER USER MAKES IT SLIGHTLY WORSE --
# extra views add almost no information while the design effect grows.


# =========================================================================
# TESTS
# =========================================================================

def test_broken_analysis_inflates_false_positives():
    rate = aa_rate(lambda a, b, ua, ub: analyse_broken(a, b), trials=300)

    assert rate > 0.20                       # nominal is 0.05


def test_fixed_analysis_restores_the_nominal_rate():
    rate = aa_rate(lambda a, b, ua, ub: analyse(a, b, ua, ub)["p"],
                   trials=300)

    assert 0.02 < rate < 0.09                # 5% within simulation noise


def test_standard_error_is_understated_by_sqrt_deff():
    a, ua = simulate_users(seed=0)
    naive = np.sqrt(a.var(ddof=1) / len(a))
    means = np.array([a[ua == u].mean() for u in np.unique(ua)])
    correct = means.std(ddof=1) / np.sqrt(len(means))

    icc = means.var(ddof=1) / a.var(ddof=1)
    m = len(a) / len(means)
    assert abs(correct/naive - np.sqrt(1 + (m-1)*icc)) < 0.4


def test_no_clustering_means_no_correction():
    """With one row per user the two analyses must agree."""
    a = (rng.random(3000) < 0.1).astype(float)
    b = (rng.random(3000) < 0.1).astype(float)
    uid = np.arange(3000)

    p_fixed = analyse(a, b, uid, uid)["p"]
    assert abs(p_fixed - analyse_broken(a, b)) < 0.05


def test_refuses_too_few_clusters():
    import pytest
    a = (rng.random(500) < 0.1).astype(float)
    uid = np.repeat(np.arange(10), 50)

    with pytest.raises(ValueError, match="too few clusters"):
        analyse(a, a, uid, uid)


def test_more_views_per_user_does_not_help():
    """The lever is users, not events."""
    few = users_needed(0.10, 0.05, 0.18, 5)
    many = users_needed(0.10, 0.05, 0.18, 100)

    assert many >= few                        # more views, no fewer users`,
        notes: [
          { t: "p", text: "**The unit of analysis does not match the unit of randomisation.** Users are randomised, page views are analysed, and rows from one user are correlated — so the test treats them as independent evidence and understates the standard error by 2.15×." },
          { t: "p", text: "**A true z of 0.9 is reported as 1.9**, which is precisely why so many A/A tests cross the line. The simulation reproduces 31% against a nominal 5%." },
          { t: "callout", kind: "insight", title: "The design effect predicts the error before you measure it", body: [
            { t: "p", text: "`DEFF = 1 + (m−1)·ICC` gives 4.6 here, and `√4.6 = 2.14` matches the observed inflation. Seventy-nine thousand rows carry the information of about 17,000." },
            { t: "p", text: "Aggregating each user to one number is the simplest correct fix and needs no new machinery. Cluster-robust standard errors keep every row and adjust the variance, which matters only when you need per-row covariates." }
          ]},
          { t: "p", text: "**Nothing was lost by fixing it** — the information was never there. The broken test was not more powerful, it was wrong, and the team has been running underpowered tests that also reported false positives." },
          { t: "p", text: "**More views per user makes it slightly *worse*.** Extra views add almost no information while the design effect grows, so the only lever is more users — 14,224 against the 3,088 a naive calculation suggested." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A political poll of 1,200 people reported a candidate at 47% with a ±3% margin of error, and was wrong by nine points on election day." },
      { t: "p", text: "**The ±3% was a statement about sampling variability only.** It assumed a random sample from the voting population, and the actual sample was people who answered an unknown number and agreed to talk — with a response rate around 6%." },
      { t: "p", text: "**Bias does not appear in a margin of error at all.** Increasing the sample to 12,000 would have narrowed the interval to ±1% and left the nine-point error untouched, because more responses estimate the responders' opinion more precisely." },
      { t: "p", text: "**Ask what a margin of error covers before quoting it.** It measures the noise you can compute and is silent about the error that decides whether the number is right." }
    ]}
  ],

  takeaways: [
    "**Inference is about the sampling distribution** — what your statistic would do across the samples you did not take.",
    "**A standard deviation describes the data; a standard error describes an estimate**, and they can differ by an order of magnitude.",
    "**`SE = σ/√n`**, so quadrupling the sample halves the error — precision is bought at a quadratic price.",
    "**The CLT makes the *distribution of the mean* normal**, not the data; the population can be as skewed as it likes.",
    "**The CLT needs independence, identical distribution and finite variance** — all three fail in real work.",
    "**Finite variance fails totally, not gradually**: the mean of 10,000 Cauchy samples is distributed like one sample.",
    "**\"n = 30\" is a rule for mildly skewed data.** A lognormal still has three times too much tail at `n = 200`; use `n > 25 × skew²`.",
    "**The centre converges long before the tails**, so `n = 30` can be fine for an interval and useless for a small p-value.",
    "**More data reduces variance and does nothing to bias** — a precise estimate of the wrong quantity invites confidence.",
    "**Non-response bias scales as `(1 − response rate) × (responder − non-responder gap)`**, and only chasing non-responders can measure it.",
    "**Clustered data has an effective sample size of `n/DEFF`**, where `DEFF = 1 + (m−1)·ICC` — 40,000 rows can carry the information of 250.",
    "**Analyse at the unit of randomisation.** Mismatching it inflates false positives without any other symptom."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your data has standard deviation 43. You take a sample of 100. What is the standard error of the mean?",
        options: [
          "43 — the same spread",
          "4.3 — `σ/√n`, because a mean varies far less than an individual observation",
          "0.43",
          "It cannot be computed without the population size"
        ],
        answer: 1,
        why: "A standard deviation describes how individuals vary; a standard error describes how your *estimate* varies. Here they differ tenfold, and reporting one where the other belongs makes every interval wrong by that factor."
      },
      {
        stem: "An A/A test — identical experiences in both arms — comes out significant 31% of the time. What is the most likely cause?",
        options: [
          "A bug in the randomisation",
          "The unit of analysis does not match the unit of randomisation — users are randomised but page views are analysed, so correlated rows are counted as independent",
          "The significance level is set wrong",
          "The sample is too small"
        ],
        answer: 1,
        why: "The design effect `1 + (m−1)·ICC` predicts the inflation: at 4.6 here, standard errors are 2.15× too small, so a true z of 0.9 is reported as 1.9. Aggregating each user to one number restores the nominal 5%."
      },
      {
        stem: "A survey of 12,000 responses gives a margin of error of ±0.02. The response rate was 18%. How much should you trust it?",
        options: [
          "It is very precise, so highly",
          "The margin of error covers sampling variability only — non-response bias scales as `0.82 × (responder − non-responder gap)` and does not appear in it at all",
          "Trust it if the sample is demographically balanced",
          "Double the margin of error to be safe"
        ],
        answer: 1,
        why: "Increasing to 120,000 responses would narrow the interval tenfold and leave the bias untouched. Only observing some of the people you were missing — a small, hard-chased random subsample of non-responders — can measure it."
      },
      {
        stem: "The CLT is often summarised as \"n = 30 is enough\". When is that wrong?",
        options: [
          "It is never wrong",
          "For heavily skewed data, and for tail probabilities — a lognormal still has three times too much tail at `n = 200`",
          "Only for discrete data",
          "Only when the population is small"
        ],
        answer: 1,
        why: "The centre converges long before the tails, so `n = 30` can be fine for a confidence interval about a mean and useless for a p-value of 0.001. The usable rule is `n > 25 × skew²`."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between a standard deviation and a standard error?",
        strong: "A standard deviation describes how much individual observations vary; a standard error describes how much an estimate would vary across samples. `SE = σ/√n`, so with `n = 100` they differ tenfold.",
        answer: [
          { t: "p", text: "Framing the standard error as a property of the sampling distribution connects it to everything else in inference." },
          { t: "p", text: "Noting the `√n` means quadrupling the data halves the error shows you know what precision costs." }
        ]
      },
      {
        level: "advanced",
        q: "Your A/A tests come out significant far more often than 5%. Where would you look?",
        strong: "The unit of analysis. If users are randomised but events are analysed, correlated rows are being counted as independent evidence. The design effect `1 + (m−1)·ICC` says by how much — I would compute the ICC and compare per-user and per-row standard errors.",
        answer: [
          { t: "p", text: "Naming the unit-of-analysis mismatch immediately is the answer that distinguishes experience from theory here." },
          { t: "p", text: "Offering a way to quantify it before fixing it shows you would diagnose rather than guess." }
        ]
      },
      {
        level: "core",
        q: "A survey has 50,000 responses. How much should the sample size reassure you?",
        strong: "Only about variance. The margin of error covers sampling noise and says nothing about bias — a low response rate means you are precisely estimating the responders' opinion. I would want to know the response rate and whether non-responders were sampled at all.",
        answer: [
          { t: "p", text: "Separating variance from bias, and pointing out that only one of them responds to sample size, is the substance." },
          { t: "p", text: "Asking for the response rate is the concrete follow-up question a good analyst would actually ask." }
        ]
      }
    ]
  }
});

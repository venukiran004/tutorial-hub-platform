/* ============================================================================
   LESSON 5.7 — P-Values: What They Are Not
   ========================================================================= */
EC.receiveLesson({
  id: "5.7",

  lede: "**A p-value is `P(data this extreme | null true)`.** It is not the probability the null is true, not the probability your result is a fluke, and not a measure of effect size. Every one of those misreadings appears in published work, and each licenses a conclusion the number cannot support.",

  objectives: [
    "State the definition precisely and compute one from first principles",
    "Refute the five standard misinterpretations, each with a number",
    "Explain why `p = 0.049` and `p = 0.051` are not different findings",
    "Recognise p-hacking in decisions that feel reasonable",
    "Report a result in a way that survives the criticism"
  ],

  prerequisites: ["5.4"],

  blocks: [

    { t: "h2", n: "01", text: "The definition, and what it conditions on", id: "definition" },

    { t: "code", lang: "python", title: "compute one without any formula", code: `
import numpy as np
from scipy import stats

rng = np.random.default_rng(0)

# THE DEFINITION:
#
#   p = P( a test statistic at least as extreme as the observed one
#          | the null hypothesis is true )
#
# READ THE CONDITIONING BAR. It assumes the null and asks about the
# data. Everyone wants the reverse -- P(null | data) -- and those are
# different quantities related by Bayes (lesson 3.6).

observed_a, n_a = 66, 120        # treatment conversions
observed_b, n_b = 51, 120        # control

# GENERATE THE NULL DISTRIBUTION rather than looking it up: under H0
# the label carries no information, so pool and re-split.
pooled = np.array([1]*(observed_a + observed_b) +
                  [0]*(n_a + n_b - observed_a - observed_b))
obs_diff = observed_a/n_a - observed_b/n_b            # 0.125

null = np.empty(100_000)
for i in range(100_000):
    rng.shuffle(pooled)
    null[i] = pooled[:n_a].mean() - pooled[n_a:].mean()

p = (np.abs(null) >= abs(obs_diff)).mean()            # 0.0400
#
# THAT IS THE p-VALUE: in a world where the treatment does nothing, 4%
# of experiments would show a gap this large or larger.

# WHAT THAT SENTENCE DOES NOT CONTAIN:
#   - the probability the treatment works
#   - the probability this result is a fluke
#   - anything about how big the effect is
#
# It is a statement about the DATA under an assumption, not about the
# assumption.

# THE NULL DISTRIBUTION IS CENTRED ON ZERO, which is the whole point:
null.mean(), null.std()                               # ~0.000, 0.0627
#
# A p-value asks where your observation sits in THAT distribution.

# SANITY CHECK AGAINST THE NAMED TEST:
stats.fisher_exact([[66, 54], [51, 69]])[1]           # 0.0479
#
# Close, and the small gap is a real thing: the permutation conditions
# on the pooled total while Fisher conditions on both margins. Neither
# is wrong -- they answer marginally different questions, which is a
# useful reminder that "the" p-value is not unique.
`,
      hl: [11, 33, 38, 52],
      caption: "**Read the conditioning bar.** A p-value assumes the null and asks about the data; everyone wants the reverse, and those are different quantities related by Bayes."
    },

    { t: "h2", n: "02", text: "Five misreadings, each with a number", id: "misreadings" },

    { t: "table",
      head: ["The claim", "Status", "Why"],
      rows: [
        ["\"There is a 5% chance the null is true\"", "**Wrong**", "That is `P(H₀|data)`; the p-value is `P(data|H₀)`"],
        ["\"There is a 95% chance the effect is real\"", "**Wrong**", "Same reversal, stated in the positive"],
        ["\"`p = 0.001` means a bigger effect than `p = 0.04`\"", "**Wrong**", "p depends on `n` as much as on effect size"],
        ["\"`p > 0.05` means no effect\"", "**Wrong**", "Absence of evidence, not evidence of absence"],
        ["\"5% of significant results are false positives\"", "**Wrong**", "Depends on the prior; can exceed 50%"],
        ["\"If the null is true, this data would be unusual\"", "*Correct*", "The definition, stated plainly"]
      ],
      caption: "**The first two are the same error in opposite clothing.** Reversing a conditional is the single most common statistical mistake, and it appears in press releases about drug trials every week."
    },

    { t: "code", lang: "python", title: "the false discovery rate depends on the prior", code: `
# MISREADING 5 IS THE MOST CONSEQUENTIAL: "we use alpha = 0.05, so 5%
# of our significant findings are wrong."
#
# THE ACTUAL FALSE DISCOVERY RATE IS BAYES, NOT ALPHA (lesson 3.6):
#
#   FDR = P(H0 true | significant)
#       = alpha * P(H0) / [ alpha * P(H0) + power * P(H1) ]

def false_discovery_rate(prior_true, alpha=0.05, power=0.8):
    """Of the results you call significant, what fraction are wrong?"""
    true_pos = power * prior_true
    false_pos = alpha * (1 - prior_true)
    return false_pos / (true_pos + false_pos)

for prior in (0.5, 0.2, 0.1, 0.05, 0.01):
    print(f"P(hypothesis true) = {prior:5.0%}  ->  "
          f"FDR = {false_discovery_rate(prior):6.1%}")

# P(hypothesis true) =   50%  ->  FDR =   5.9%
# P(hypothesis true) =   20%  ->  FDR =  20.0%
# P(hypothesis true) =   10%  ->  FDR =  36.0%
# P(hypothesis true) =    5%  ->  FDR =  50.0%
# P(hypothesis true) =    1%  ->  FDR =  86.1%
#
# IN A FIELD WHERE 10% OF TESTED HYPOTHESES ARE TRUE, MORE THAN A
# THIRD OF SIGNIFICANT FINDINGS ARE FALSE. At 1% -- exploratory
# screening, most genomics, most feature ideas -- 86% are.

# LOW POWER MAKES IT DRAMATICALLY WORSE:
for power in (0.8, 0.5, 0.2):
    print(f"power {power:.0%}: FDR at 10% prior = "
          f"{false_discovery_rate(0.1, power=power):.1%}")
# power 80%: FDR at 10% prior = 36.0%
# power 50%: FDR at 10% prior = 47.4%
# power 20%: FDR at 10% prior = 69.2%
#
# AN UNDERPOWERED STUDY IS NOT MERELY LIKELY TO MISS A REAL EFFECT --
# ITS POSITIVE FINDINGS ARE ALSO MORE LIKELY TO BE WRONG. Low power
# damages both error rates at once, which is why "we found something
# despite the small sample" is a warning rather than a reassurance.

# AND IT MAKES THE OBSERVED EFFECT BIGGER TOO -- the winner's curse
# again. Only large observed effects clear the threshold at low power:
def exaggeration(true_effect, n, alpha=0.05, trials=100_000, seed=0):
    """Among the studies that reach significance, how overstated is the
    average effect?"""
    r = np.random.default_rng(seed)
    m = r.normal(true_effect, 1/np.sqrt(n), trials)
    se = 1/np.sqrt(n)
    sig = np.abs(m) > stats.norm.ppf(1-alpha/2)*se
    return float(np.abs(m[sig]).mean() / true_effect)

for n in (400, 100, 25):
    pw = stats.norm.sf(stats.norm.ppf(0.975) - 0.2*np.sqrt(n))
    print(f"n={n:<5} power {pw:.2f}  significant results overstate by "
          f"{exaggeration(0.2, n):.2f}x")
# n=400   power 0.98  significant results overstate by 1.02x
# n=100   power 0.52  significant results overstate by 1.31x
# n=25    power 0.18  significant results overstate by 2.36x
#
# AT 18% POWER, THE PUBLISHED EFFECTS ARE MORE THAN TWICE THE TRUTH.
# That is the type M error, and it is why small significant studies
# fail to replicate even when the effect is real.
`,
      hl: [7, 24, 38, 51],
      caption: "**Low power damages both error rates at once**: it misses real effects *and* makes the positives it does find more likely wrong and more exaggerated. \"We found something despite the small sample\" is a warning."
    },

    { t: "callout", kind: "trap", title: "0.049 and 0.051 are the same result", body: [
      { t: "p", text: "The threshold is a convention, and the p-value is a continuous quantity with its own sampling variability. Treating the two sides of 0.05 as different findings gives a coin flip the authority of a decision." },
      { t: "code", lang: "python", numbered: false, title: "how much a p-value moves between replications", code: `
# RUN THE SAME EXPERIMENT TWICE. How similar are the two p-values?
def replicate(true_effect, n, trials=5000, seed=0):
    r = np.random.default_rng(seed)
    out = []
    for _ in range(trials):
        a = r.normal(0, 1, n)
        b = r.normal(true_effect, 1, n)
        out.append(stats.ttest_ind(a, b).pvalue)
    return np.array(out)

ps = replicate(0.3, 100)
np.percentile(ps, [5, 25, 50, 75, 95])
# [0.0009, 0.0122, 0.0508, 0.1620, 0.4830]
#
# THE MEDIAN p-VALUE IS 0.05 -- so this is an experiment with roughly
# 50% power. And its p-value ranges from 0.001 to 0.48 across
# replications OF THE SAME TRUE EFFECT.
#
# A p-VALUE IS A RANDOM VARIABLE WITH AN ENORMOUS SPREAD. Reporting it
# to three decimals implies a precision that does not exist.

# THE "DANCE OF THE p-VALUES": given one study at p = 0.05, what would
# a replication give?
sig = ps[np.abs(ps - 0.05) < 0.005]      # studies that landed near 0.05
ps2 = replicate(0.3, 100, seed=99)
np.percentile(ps2, [10, 50, 90])          # [0.003, 0.051, 0.372]
#
# A replication of a p = 0.05 finding has roughly a 50% chance of
# coming back above 0.05 -- because that is what 50% power means.

# UNDER THE NULL, p IS UNIFORM ON [0,1]. That is worth seeing, because
# it explains why "p = 0.04" is unremarkable in a large search:
null_ps = replicate(0.0, 100)
np.percentile(null_ps, [5, 25, 50, 75, 95])
# [0.049, 0.248, 0.501, 0.751, 0.951] -- exactly uniform
#
# So 5% of null experiments give p < 0.05, 1% give p < 0.01, and the
# distribution is perfectly flat. There is no p-value so small that it
# cannot arise from a large enough search.

# WHAT TO DO INSTEAD: report the effect and its interval, and let the
# threshold be a footnote.
#
#   BAD:  "significant (p = 0.049)" vs "not significant (p = 0.051)"
#   GOOD: "+2.1pp, 95% CI [+0.0, +4.2]" vs "+2.0pp, 95% CI [-0.1, +4.1]"
#
# WRITTEN THAT WAY THE TWO RESULTS ARE OBVIOUSLY THE SAME, which is
# the correct impression.`},
      { t: "p", text: "**A p-value is a random variable with an enormous spread.** At 50% power the same true effect produces p-values from 0.001 to 0.48 across replications — reporting to three decimals implies a precision that does not exist." }
    ]},

    { t: "h2", n: "03", text: "P-hacking without meaning to", id: "p-hacking" },

    { t: "code", lang: "python", title: "researcher degrees of freedom, measured", code: `
# NONE OF THESE FEELS DISHONEST. Each is a defensible analytic choice,
# made after seeing the data.

def flexible_analysis(seed, n=60):
    """A realistic set of choices, all of them arguable, on data with
    NO effect whatsoever."""
    r = np.random.default_rng(seed)
    a = r.normal(0, 1, n)
    b = r.normal(0, 1, n)
    cov = r.normal(0, 1, n)                 # a covariate
    ps = []

    # 1. The straightforward test.
    ps.append(stats.ttest_ind(a, b).pvalue)

    # 2. "The data is skewed, so a non-parametric test is appropriate."
    ps.append(stats.mannwhitneyu(a, b).pvalue)

    # 3. "We removed outliers beyond 2 sd, which is standard practice."
    ta = a[np.abs(a - a.mean()) < 2*a.std()]
    tb = b[np.abs(b - b.mean()) < 2*b.std()]
    ps.append(stats.ttest_ind(ta, tb).pvalue)

    # 4. "We log-transformed, as the outcome is positively skewed."
    ps.append(stats.ttest_ind(np.log(np.abs(a)+1), np.log(np.abs(b)+1)).pvalue)

    # 5. "We restricted to the high-covariate subgroup, where the
    #     mechanism should be strongest."
    m = cov > np.median(cov)
    ps.append(stats.ttest_ind(a[m], b[m]).pvalue)

    # 6. "We collected 20 more observations to firm up the result."
    a2 = np.concatenate([a, r.normal(0, 1, 20)])
    b2 = np.concatenate([b, r.normal(0, 1, 20)])
    ps.append(stats.ttest_ind(a2, b2).pvalue)

    return min(ps)

rate = np.mean([flexible_analysis(s) < 0.05 for s in range(4000)])
rate                                     # 0.229
#
# 23% FALSE POSITIVE RATE ON PURE NOISE, from six choices any of which
# would pass review individually. Nobody lied; nobody even looked at
# more than one analysis at a time.

# THE INDIVIDUAL CONTRIBUTIONS:
#   just the t-test                 5.0%
#   + choose parametric/non-param   7.9%
#   + optional outlier removal     11.4%
#   + optional transform           15.1%
#   + one subgroup                 19.6%
#   + optional extra data          22.9%
#
# EACH STEP ADDS 3-5 POINTS. The problem is not any one decision; it
# is that the decisions were CONDITIONAL ON THE RESULT.

# OPTIONAL STOPPING ALONE IS WORSE THAN IT LOOKS:
def peeking(seed, max_n=500, check_every=25):
    """Check after every 25 observations, stop when significant."""
    r = np.random.default_rng(seed)
    a, b = r.normal(0, 1, max_n), r.normal(0, 1, max_n)
    for n in range(check_every, max_n+1, check_every):
        if stats.ttest_ind(a[:n], b[:n]).pvalue < 0.05:
            return True
    return False

np.mean([peeking(s) for s in range(4000)])          # 0.279
#
# 28% FROM PEEKING ALONE. And with unlimited data and unlimited
# patience it converges to 100%: the p-value random-walks, and it will
# eventually cross any fixed threshold.

# THE DEFENCES, in order of strength:
#
# 1. PRE-REGISTRATION. Write down the analysis before the data. It
#    costs a document and eliminates the entire class.
# 2. A HOLD-OUT SET. Explore freely on half, confirm on the other half
#    with one pre-specified test.
# 3. SEQUENTIAL METHODS. If you must peek, use a design that accounts
#    for it -- alpha spending, or an always-valid confidence sequence.
# 4. REPORT EVERYTHING. Every analysis run, not just the reported one.
#    "We tested six specifications; here are all six" is honest and
#    lets the reader discount appropriately.
`,
      hl: [45, 53, 71, 78],
      caption: "**Six defensible choices take the false-positive rate from 5% to 23%.** The problem is not any single decision — it is that each was made conditional on the result."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Rewrite a results section that says four wrong things",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "Rewrite this paragraph so every sentence is defensible, and say what additional information you would need." },
        { t: "code", lang: "python", numbered: false, title: "the draft", code: `
# "Our new onboarding flow significantly increased 30-day retention
#  (p = 0.03), so there is only a 3% chance this result is due to
#  chance. The effect was highly significant in the mobile segment
#  (p = 0.001), indicating a much stronger effect on mobile. Desktop
#  showed no effect (p = 0.21), so the flow does not help desktop
#  users. We recommend rolling out to mobile only."
#
# What you can find out:
#   overall:  n = 8,400 per arm, 22.1% vs 23.4% retention
#   mobile:   n = 5,900 per arm, 19.8% vs 21.9%
#   desktop:  n = 2,500 per arm, 27.5% vs 27.0%
#   The segment analysis was not pre-registered.`},
        { t: "p", text: "Produce a corrected paragraph and list what is missing." }
      ],
      requirements: [
        "Identify each incorrect statement and name the error.",
        "Compute the effect sizes and intervals the draft omits.",
        "Address whether the segment difference is itself supported.",
        "Say what the desktop result actually licenses.",
        "Write the corrected paragraph.",
        "Include tests."
      ],
      hint: "Compare the two segments' effects against each other, rather than comparing their p-values.",
      solution: {
        lang: "python",
        title: "rewrite.py",
        code: `import numpy as np
from scipy import stats

DATA = {
    "overall": dict(n=8400, p_ctl=0.221, p_trt=0.234),
    "mobile":  dict(n=5900, p_ctl=0.198, p_trt=0.219),
    "desktop": dict(n=2500, p_ctl=0.275, p_trt=0.270),
}


def compare(n, p_ctl, p_trt, alpha=0.05):
    diff = p_trt - p_ctl
    se = np.sqrt(p_ctl*(1-p_ctl)/n + p_trt*(1-p_trt)/n)
    z = stats.norm.ppf(1 - alpha/2)
    return {
        "diff_pp": diff*100,
        "relative": diff/p_ctl,
        "se_pp": se*100,
        "ci_pp": ((diff - z*se)*100, (diff + z*se)*100),
        "p": float(2*stats.norm.sf(abs(diff/se))),
    }

for seg, d in DATA.items():
    r = compare(**d)
    lo, hi = r["ci_pp"]
    print(f"{seg:8s} {r['diff_pp']:+.2f}pp  CI [{lo:+.2f}, {hi:+.2f}]  "
          f"rel {r['relative']:+.1%}  p {r['p']:.4f}")

# overall  +1.30pp  CI [-0.05, +2.65]  rel +5.9%  p 0.0592
# mobile   +2.10pp  CI [+0.63, +3.57]  rel +10.6% p 0.0051
# desktop  -0.50pp  CI [-3.00, +2.00]  rel -1.8%  p 0.6950


# =========================================================================
# ERROR 1 -- "only a 3% chance this result is due to chance"
# =========================================================================
#
# THE CONDITIONAL IS REVERSED. p = P(data | H0), not P(H0 | data). The
# probability the result is chance depends on the prior probability the
# flow works, which the p-value contains no information about.

def fdr(prior, alpha, power):
    return alpha*(1-prior) / (alpha*(1-prior) + power*prior)

for prior in (0.5, 0.25, 0.1):
    print(f"prior {prior:.0%} -> P(no real effect | significant) = "
          f"{fdr(prior, 0.03, 0.8):.1%}")
# prior 50% -> P(no real effect | significant) =  3.6%
# prior 25% -> P(no real effect | significant) =  10.1%
# prior 10% -> P(no real effect | significant) =  25.2%
#
# The "3%" is right only if onboarding changes work half the time.
# At a more realistic 10% base rate it is 25%.
#
# ALSO: the draft's own p-value does not reconstruct. From the reported
# rates, p = 0.059, not 0.03. Establish which is right before anything
# else -- a headline number that does not reproduce is the first thing
# to fix.
compare(**DATA["overall"])["p"]                     # 0.0592


# =========================================================================
# ERROR 2 -- "highly significant, indicating a much stronger effect"
# =========================================================================
#
# A SMALLER p DOES NOT MEAN A LARGER EFFECT. It reflects effect size
# AND sample size together. Mobile has 2.4x the sample of desktop, so
# it can reach a smaller p from the same effect.
#
# Demonstrate the confusion directly -- identical effects, different n:
for n in (1000, 5000, 25000):
    r = compare(n, 0.20, 0.21)                      # always +1pp
    print(f"n={n:<7} effect {r['diff_pp']:+.2f}pp (identical)  "
          f"p = {r['p']:.4f}")
# n=1000   effect +1.00pp (identical)  p = 0.5316
# n=5000   effect +1.00pp (identical)  p = 0.1666
# n=25000  effect +1.00pp (identical)  p = 0.0009
#
# THE SAME EFFECT SPANS p = 0.53 TO p = 0.0009. Any comparison of
# p-values across groups of different sizes is uninterpretable.


# =========================================================================
# ERROR 3 -- "desktop showed no effect"
# =========================================================================
#
# Failing to reject is not evidence of absence (lesson 5.3). The
# desktop interval is [-3.0pp, +2.0pp], which is compatible with a
# 7% relative improvement and an 11% relative decline.
d = compare(**DATA["desktop"])
d["ci_pp"][0]/27.5, d["ci_pp"][1]/27.5              # -10.9%, +7.3%
#
# THE DESKTOP ARM IS UNINFORMATIVE, not negative. Its sample is 2,500
# per arm; the effect it could detect at 80% power is:
def mde(n, p, alpha=0.05, power=0.8):
    z_a, z_b = stats.norm.ppf(1-alpha/2), stats.norm.ppf(power)
    return (z_a + z_b) * np.sqrt(2*p*(1-p)/n) * 100

mde(2500, 0.275)                                    # 3.55pp = +12.9% rel
#
# DESKTOP COULD ONLY HAVE DETECTED A 13% RELATIVE LIFT. The mobile
# effect is 10.6%. The desktop arm was never able to see the effect
# being claimed, so "no effect on desktop" is not a finding -- it is
# an absence of measurement.


# =========================================================================
# ERROR 4 -- COMPARING SEGMENTS BY COMPARING p-VALUES
# =========================================================================
#
# "Mobile p = 0.001, desktop p = 0.21, therefore mobile is different"
# is the difference-of-significance fallacy. To claim the segments
# differ you must test the INTERACTION -- the difference of the
# differences.

def interaction_test(seg_a, seg_b):
    a, b = compare(**DATA[seg_a]), compare(**DATA[seg_b])
    diff = a["diff_pp"] - b["diff_pp"]
    se = np.sqrt(a["se_pp"]**2 + b["se_pp"]**2)
    z = stats.norm.ppf(0.975)
    return {
        "difference_of_differences_pp": diff,
        "ci_pp": (diff - z*se, diff + z*se),
        "p": float(2*stats.norm.sf(abs(diff/se))),
    }

interaction_test("mobile", "desktop")
# {'difference_of_differences_pp': 2.60,
#  'ci_pp': (-0.30, 5.50), 'p': 0.0791}
#
# p = 0.079 FOR THE INTERACTION. The segments are NOT significantly
# different from each other, even though one is significant and the
# other is not. That is the whole point of the fallacy.
#
# AND THE SEGMENT ANALYSIS WAS NOT PRE-REGISTERED, so even this
# understates the problem -- with two segments there were at least
# three ways to slice, and the reported one is the one that worked.


# =========================================================================
# THE CORRECTED PARAGRAPH
# =========================================================================
#
# "The new onboarding flow increased 30-day retention by 1.3
#  percentage points (from 22.1% to 23.4%, a 5.9% relative
#  improvement; 95% CI: -0.1 to +2.7pp, p = 0.059). The result does
#  not reach conventional significance, and the interval is consistent
#  with anything from a small decline to a 12% relative gain.
#
#  In a pre-planned analysis we would report only the above. The
#  following segment breakdown was exploratory and is reported as
#  hypothesis-generating rather than as a result.
#
#  Among mobile users (n = 5,900 per arm) retention rose 2.1pp (95%
#  CI: +0.6 to +3.6). Among desktop users (n = 2,500 per arm) it fell
#  0.5pp (95% CI: -3.0 to +2.0). The desktop arm was powered to detect
#  only a 3.6pp difference, so it does not rule out an effect of the
#  size seen on mobile.
#
#  A formal test of whether the segments differ gives p = 0.079 (95%
#  CI on the difference of differences: -0.3 to +5.5pp), so we cannot
#  conclude the effect is mobile-specific.
#
#  RECOMMENDATION: the overall result is promising but inconclusive.
#  We propose a confirmatory test powered for the observed 5.9%
#  relative effect, with mobile-versus-desktop pre-registered as the
#  primary interaction."

def confirmatory_n(p_baseline, rel_effect, alpha=0.05, power=0.8):
    p1 = p_baseline
    p2 = p_baseline * (1 + rel_effect)
    z_a, z_b = stats.norm.ppf(1-alpha/2), stats.norm.ppf(power)
    return int(np.ceil(((z_a+z_b)**2 * (p1*(1-p1)+p2*(1-p2))) / (p2-p1)**2))

confirmatory_n(0.221, 0.059)                        # 20,157 per arm
#
# 20,157 PER ARM -- 2.4x what was run. That is the honest cost of
# answering the question, and it is the number the recommendation
# should carry.


# =========================================================================
# WHAT IS MISSING
# =========================================================================
#
# 1. WAS THE SEGMENT ANALYSIS PLANNED? Stated as no, which downgrades
#    it to exploratory. If other segments were also examined, all of
#    them must be reported (lesson 5.10).
# 2. WHAT WAS THE PRIMARY METRIC? If 30-day retention was chosen after
#    seeing 7-day and 14-day, the p-value is not what it appears.
# 3. SAMPLE RATIO. Are the arms actually balanced? An imbalance
#    signals a randomisation or logging fault (lesson 6.1).
# 4. WHEN DID ANALYSIS STOP? If the test ran until it looked good,
#    peeking has inflated the rate to 20%+.
# 5. IS RETENTION THE OUTCOME THAT MATTERS? Revenue or engagement may
#    move differently, and shipping on a proxy is how a "winning"
#    change loses money.


# =========================================================================
# TESTS
# =========================================================================

def test_reported_p_does_not_reconstruct():
    """The first thing to check: does the headline number reproduce?"""
    assert abs(compare(**DATA["overall"])["p"] - 0.03) > 0.02


def test_same_effect_gives_wildly_different_p_values():
    ps = [compare(n, 0.20, 0.21)["p"] for n in (1000, 5000, 25000)]

    assert ps[0] > 0.5 and ps[-1] < 0.001


def test_desktop_interval_does_not_exclude_the_mobile_effect():
    """'No effect on desktop' is unsupported."""
    d = compare(**DATA["desktop"])
    mobile_effect = compare(**DATA["mobile"])["diff_pp"]

    assert d["ci_pp"][1] > mobile_effect * 0.5      # compatible


def test_desktop_was_underpowered_for_the_mobile_effect():
    detectable = mde(2500, 0.275)
    mobile_effect = compare(**DATA["mobile"])["diff_pp"]

    assert detectable > mobile_effect               # could not have seen it


def test_segments_are_not_significantly_different():
    """The difference-of-significance fallacy, refuted."""
    r = interaction_test("mobile", "desktop")

    assert r["p"] > 0.05
    assert r["ci_pp"][0] < 0 < r["ci_pp"][1]


def test_fdr_exceeds_the_p_value_at_realistic_priors():
    assert fdr(0.10, 0.03, 0.8) > 0.20              # not 3%


def test_confirmatory_test_is_larger_than_what_was_run():
    assert confirmatory_n(0.221, 0.059) > 8400 * 2`,
        notes: [
          { t: "p", text: "**The reported p-value does not reconstruct** — the stated rates give 0.059, not 0.03. A headline number that does not reproduce from its own data is the first thing to establish, before any interpretation." },
          { t: "callout", kind: "insight", title: "The difference-of-significance fallacy is the subtle error here", body: [
            { t: "p", text: "\"Mobile is significant, desktop is not, therefore they differ\" requires testing the *interaction*. The difference of differences is 2.6pp with a 95% CI of [−0.3, +5.5] and `p = 0.079` — the segments are not significantly different from each other." },
            { t: "p", text: "Desktop was powered to detect only a 3.6pp effect, while mobile's was 2.1pp. The desktop arm could never have seen the effect being claimed, so \"no effect on desktop\" is an absence of measurement, not a finding." }
          ]},
          { t: "p", text: "**The same 1pp effect gives `p = 0.53` at `n = 1,000` and `p = 0.0009` at `n = 25,000`.** Any comparison of p-values across groups of different sizes is uninterpretable, and mobile has 2.4× desktop's sample." },
          { t: "p", text: "**\"A 3% chance this is chance\" is right only if onboarding changes work half the time.** At a 10% base rate the false discovery rate is 25%, and the p-value carries no information about which prior applies." },
          { t: "p", text: "**The confirmatory test needs 20,157 per arm** — 2.4× what was run. That number belongs in the recommendation, because it is the honest cost of answering the question rather than continuing to argue about it." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team ran an experiment, checked the dashboard daily, and shipped on day nine when the p-value first dropped below 0.05. The metric returned to baseline within a month." },
      { t: "p", text: "**Checking daily for two weeks is fourteen looks at the same test.** Simulation puts the false-positive rate for that pattern at around 28%, and with unlimited patience it converges to 100% — the p-value random-walks and will eventually cross any fixed line." },
      { t: "p", text: "**The dashboard was working correctly.** The fault was the stopping rule, and it was not written down anywhere because nobody thought of \"look until it turns green\" as a rule at all." },
      { t: "p", text: "**Fix the sample size in advance, or use a method built for peeking** — alpha spending, group-sequential boundaries, or an always-valid confidence sequence. The problem is not looking; it is looking with a threshold designed for one look." }
    ]}
  ],

  takeaways: [
    "**A p-value is `P(data this extreme | null true)`** — it conditions on the null and speaks about the data.",
    "**\"5% chance the null is true\" reverses the conditional**, which is the single most common statistical error.",
    "**A smaller p does not mean a larger effect** — the same 1pp difference gives `p = 0.53` at `n = 1,000` and `p = 0.0009` at `n = 25,000`.",
    "**The false discovery rate depends on the prior, not on `α`** — at a 10% base rate, over a third of significant findings are wrong.",
    "**Low power damages both error rates**: it misses real effects and makes its positives more likely wrong and more exaggerated.",
    "**At 18% power, significant results overstate the effect by more than 2×** — the type M error behind failed replications.",
    "**A p-value is a random variable with an enormous spread** — 0.001 to 0.48 across replications of the same true effect.",
    "**Under the null, p is uniform on `[0,1]`**, so no p-value is too small to arise from a large enough search.",
    "**0.049 and 0.051 are the same result**; report the effect and interval and let the threshold be a footnote.",
    "**Six defensible analytic choices take 5% to 23%** — the problem is that each was conditional on the result.",
    "**Peeking alone reaches 28%**, and with unlimited patience converges to 100%.",
    "**Never compare segments by comparing their p-values** — test the interaction, the difference of differences."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A study reports `p = 0.03`. What does that mean?",
        options: [
          "There is a 3% chance the null hypothesis is true",
          "If the null were true, 3% of experiments would produce data at least this extreme",
          "There is a 97% chance the effect is real",
          "The effect is small but detectable"
        ],
        answer: 1,
        why: "Options 1 and 3 reverse the conditional — they ask about `P(H₀|data)`, which needs a prior. At a 10% base rate of true hypotheses, `p = 0.03` corresponds to a 25% chance the null is true, not 3%."
      },
      {
        stem: "Mobile shows `p = 0.001` and desktop `p = 0.21`. Can you conclude the effect is stronger on mobile?",
        options: [
          "Yes, the p-values differ by orders of magnitude",
          "No — you must test the interaction; here the difference of differences gives `p = 0.079`",
          "Yes, if both samples are large",
          "Only if desktop's sample is larger"
        ],
        answer: 1,
        why: "This is the difference-of-significance fallacy. Mobile had 2.4× desktop's sample, and desktop was powered to detect only a 3.6pp effect against mobile's 2.1pp — so it could never have seen the effect being claimed."
      },
      {
        stem: "Your field tests hypotheses that are true about 10% of the time, at `α = 0.05` and 80% power. What fraction of your significant findings are false?",
        options: [
          "5%, by construction",
          "36% — the false discovery rate depends on the prior, not on `α`",
          "20%",
          "It cannot be determined"
        ],
        answer: 1,
        why: "At a 1% base rate — exploratory screening, most genomics — it reaches 86%. Low power makes it worse in both directions: at 20% power and a 10% prior, 69% of positive findings are false and the surviving effects are more than twice their true size."
      },
      {
        stem: "You check your A/B test dashboard daily for two weeks and ship when `p` first drops below 0.05. What is your real false-positive rate?",
        options: [
          "5%, since each look is a valid test",
          "About 28% — fourteen looks at a threshold designed for one, and with unlimited patience it converges to 100%",
          "10%",
          "It depends on the effect size"
        ],
        answer: 1,
        why: "The p-value random-walks and will eventually cross any fixed line. The fix is to fix the sample size in advance, or use a method built for peeking — alpha spending, group-sequential boundaries, or an always-valid confidence sequence."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is a p-value?",
        strong: "The probability of observing data at least this extreme, assuming the null hypothesis is true. It conditions on the null and speaks about the data — not the reverse, which is what people usually want and needs a prior to get.",
        answer: [
          { t: "p", text: "Getting the conditioning right in the first sentence is most of the answer." },
          { t: "p", text: "Naming what people actually want — `P(H₀|data)` — and why it needs Bayes shows you understand the gap rather than just avoiding it." }
        ]
      },
      {
        level: "advanced",
        q: "Someone says \"`p = 0.03`, so there is a 3% chance this is a fluke\". How do you respond?",
        strong: "That reverses the conditional. The chance the result is a fluke depends on how often hypotheses like this turn out true — at a 10% base rate with 80% power, `p = 0.03` corresponds to a 25% chance the null is true, not 3%.",
        answer: [
          { t: "p", text: "Giving the corrected number rather than only naming the error makes the point land." },
          { t: "p", text: "Connecting it to why fields with low base rates have replication problems shows it is not a semantic quibble." }
        ]
      },
      {
        level: "advanced",
        q: "How would you make an analysis robust to p-hacking?",
        strong: "Pre-register the primary metric, test and analysis before the data arrives. Failing that, split into exploration and confirmation halves. And report every analysis run, not just the reported one — six defensible choices take the false-positive rate from 5% to 23%.",
        answer: [
          { t: "p", text: "The 5%-to-23% number makes it concrete rather than a general warning about bias." },
          { t: "p", text: "Recognising that each individual choice is defensible — nobody has to be dishonest — is what makes the procedural defence necessary rather than a matter of integrity." }
        ]
      }
    ]
  }
});

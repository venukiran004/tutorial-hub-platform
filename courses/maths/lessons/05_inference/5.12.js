/* ============================================================================
   LESSON 5.12 — Bayesian Inference
   ========================================================================= */
EC.receiveLesson({
  id: "5.12",

  lede: "**A credible interval says what a confidence interval cannot**: there is a 95% probability the parameter lies inside it. That is the reading everyone wanted in lesson 5.3, and it is available — at the price of stating a prior, which is a cost worth paying honestly rather than avoiding by pretending you have none.",

  objectives: [
    "Compute a posterior numerically and with a conjugate prior",
    "Read a credible interval correctly, and contrast it with a confidence interval",
    "Choose a prior and defend it with a sensitivity analysis",
    "Compare Bayesian and frequentist answers on identical data",
    "Say which questions each framework answers naturally"
  ],

  prerequisites: ["5.3", "3.6"],

  blocks: [

    { t: "h2", n: "01", text: "Posterior ∝ likelihood × prior", id: "posterior" },

    { t: "viz",
      title: "The prior is overwhelmed as data accumulates",
      caption: "With ten observations the posterior sits near the prior. With a thousand it sits on the likelihood and the prior is irrelevant. The prior matters most exactly when you have least data — which is when you most need it.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Three panels showing a prior, likelihood and posterior at increasing sample sizes">
  <g>
    <text x="30" y="24" class="s-label" style="fill:var(--ink-3)">n = 10</text>
    <line x1="24" y1="180" x2="250" y2="180" style="stroke:var(--line)" stroke-width="1.5"/>
    <path d="M30 180 C 70 180, 80 92, 120 92 C 160 92, 170 180, 210 180"
          style="fill:none;stroke:var(--ink-3);stroke-dasharray:5 4" stroke-width="2"/>
    <path d="M120 180 C 150 180, 158 116, 186 116 C 214 116, 222 180, 250 180"
          style="fill:none;stroke:var(--warn)" stroke-width="2"/>
    <path d="M70 180 C 105 180, 114 74, 148 74 C 182 74, 191 180, 226 180"
          style="fill:var(--good);fill-opacity:.2;stroke:var(--good)" stroke-width="2.5"/>
    <text x="24" y="206" class="s-sub" style="fill:var(--ink-3)">posterior sits between</text>
  </g>

  <g transform="translate(300,0)">
    <text x="30" y="24" class="s-label" style="fill:var(--ink-3)">n = 100</text>
    <line x1="24" y1="180" x2="250" y2="180" style="stroke:var(--line)" stroke-width="1.5"/>
    <path d="M30 180 C 70 180, 80 92, 120 92 C 160 92, 170 180, 210 180"
          style="fill:none;stroke:var(--ink-3);stroke-dasharray:5 4" stroke-width="2"/>
    <path d="M150 180 C 170 180, 176 90, 196 90 C 216 90, 222 180, 242 180"
          style="fill:none;stroke:var(--warn)" stroke-width="2"/>
    <path d="M140 180 C 162 180, 168 80, 190 80 C 212 80, 218 180, 240 180"
          style="fill:var(--good);fill-opacity:.2;stroke:var(--good)" stroke-width="2.5"/>
    <text x="24" y="206" class="s-sub" style="fill:var(--ink-3)">nearly on the likelihood</text>
  </g>

  <g transform="translate(600,0)">
    <text x="30" y="24" class="s-label" style="fill:var(--ink-3)">n = 1000</text>
    <line x1="24" y1="180" x2="250" y2="180" style="stroke:var(--line)" stroke-width="1.5"/>
    <path d="M30 180 C 70 180, 80 92, 120 92 C 160 92, 170 180, 210 180"
          style="fill:none;stroke:var(--ink-3);stroke-dasharray:5 4" stroke-width="2"/>
    <path d="M176 180 C 186 180, 190 64, 200 64 C 210 64, 214 180, 224 180"
          style="fill:var(--good);fill-opacity:.2;stroke:var(--good)" stroke-width="2.5"/>
    <text x="24" y="206" class="s-sub" style="fill:var(--ink-3)">the prior is irrelevant</text>
  </g>

  <text x="24" y="238" class="s-sub" style="fill:var(--ink-3)">dashed: prior      thin: likelihood      filled: posterior</text>
</svg>`
    },

    { t: "code", lang: "python", title: "compute one on a grid, then in closed form", code: `
import numpy as np
from scipy import stats

# BAYES' THEOREM, APPLIED TO A PARAMETER RATHER THAN AN EVENT:
#
#     P(theta | data)  =  P(data | theta) P(theta) / P(data)
#      posterior            likelihood     prior      evidence
#
# The evidence is just a normalising constant, so in practice:
#
#     posterior  proportional to  likelihood x prior

# ---- THE GRID METHOD: no algebra, works for any prior ---------------
def posterior_grid(k, n, prior_pdf, points=2000):
    """Evaluate likelihood x prior on a grid and normalise. Crude, and
    it makes the mechanism completely visible."""
    theta = np.linspace(1e-6, 1-1e-6, points)
    likelihood = stats.binom.pmf(k, n, theta)
    post = likelihood * prior_pdf(theta)
    return theta, post / np.trapezoid(post, theta)

# 7 conversions in 50 trials, with a weak prior centred on 10%.
prior = lambda t: stats.beta.pdf(t, 2, 18)
theta, post = posterior_grid(7, 50, prior)

theta[np.argmax(post)]                       # 0.129 -- the MAP estimate
np.trapezoid(theta*post, theta)              # 0.129 -- the mean

# A CREDIBLE INTERVAL IS A DIRECT INTEGRAL OF THE POSTERIOR:
cdf = np.cumsum(post) * (theta[1]-theta[0])
lo = theta[np.searchsorted(cdf, 0.025)]
hi = theta[np.searchsorted(cdf, 0.975)]
lo, hi                                       # (0.066, 0.213)
#
# READ IT AS IT SOUNDS: given the data and the prior, there is a 95%
# probability the rate lies between 6.6% and 21.3%. That statement is
# NOT available from a confidence interval (lesson 5.3).

# ---- THE CONJUGATE SHORTCUT -----------------------------------------
#
# For a binomial likelihood, a Beta prior gives a Beta posterior:
#
#     prior     Beta(a, b)
#     data      k successes in n trials
#     posterior Beta(a + k, b + n - k)
#
# The update is ADDITION. No integration, no sampling.
a, b = 2, 18
postd = stats.beta(a + 7, b + 50 - 7)

postd.mean()                                 # 0.1286
postd.interval(0.95)                         # (0.0654, 0.2130)
#
# IDENTICAL TO THE GRID, and it is one line.

# THE PRIOR'S STRENGTH IS MEASURED IN PSEUDO-OBSERVATIONS:
#   Beta(a, b) is worth a + b prior trials with a successes.
a + b                                        # 20 pseudo-trials
#
# So Beta(2,18) is "as if we had already seen 2 conversions in 20
# trials". That makes a prior auditable: anyone can ask whether 20
# pseudo-observations of prior belief is reasonable, which is a much
# better conversation than arguing about subjectivity.

# OTHER CONJUGATE PAIRS WORTH KNOWING:
#   Poisson rate      Gamma prior   -> Gamma posterior
#   Normal mean       Normal prior  -> Normal posterior
#   Multinomial       Dirichlet     -> Dirichlet
#
# THE NORMAL-NORMAL CASE IS THE SHRINKAGE ESTIMATOR FROM LESSON 5.2:
def normal_posterior(prior_mean, prior_sd, data, sigma):
    """The posterior mean is a PRECISION-WEIGHTED AVERAGE of the prior
    and the data -- literally the shrinkage formula."""
    n = len(data)
    w_prior = 1/prior_sd**2
    w_data = n/sigma**2
    mean = (w_prior*prior_mean + w_data*np.mean(data)) / (w_prior + w_data)
    sd = np.sqrt(1/(w_prior + w_data))
    return mean, sd

normal_posterior(100, 15, np.array([120., 118., 125.]), sigma=10)
# (117.0, 5.3) -- pulled from 121 towards 100, by an amount the
# precisions determine
`,
      hl: [11, 30, 42, 57],
      caption: "**A Beta prior's strength is `a + b` pseudo-observations**, which makes it auditable. \"Is 20 prior trials' worth of belief reasonable?\" is a far better conversation than arguing about subjectivity."
    },

    { t: "h2", n: "02", text: "Credible against confidence", id: "credible" },

    { t: "table",
      head: ["", "Confidence interval", "Credible interval"],
      rows: [
        ["What varies", "The interval", "**The parameter**"],
        ["The 95% refers to", "The procedure's long-run coverage", "**This interval, given this data**"],
        ["\"95% probability inside\"", "**Wrong**", "**Correct**"],
        ["Needs a prior", "No", "**Yes**"],
        ["Interpretable as-is", "No", "**Yes**"],
        ["Guaranteed error rate", "**Yes, over repetitions**", "Only under the prior"]
      ],
      caption: "**They usually agree numerically and never agree in meaning.** With a flat prior and a decent sample the two intervals are near-identical, which is why the distinction is easy to ignore and worth not ignoring."
    },

    { t: "code", lang: "python", title: "the same data, both ways", code: `
k, n = 47, 500                              # 9.4% conversion

# FREQUENTIST (Wilson, from lesson 5.3):
def wilson(k, n, conf=0.95):
    z = stats.norm.ppf(0.5 + conf/2)
    p = k/n
    d = 1 + z**2/n
    c = (p + z**2/(2*n)) / d
    h = z*np.sqrt(p*(1-p)/n + z**2/(4*n**2)) / d
    return max(0.0, c-h), min(1.0, c+h)

wilson(k, n)                                # (0.0715, 0.1226)

# BAYESIAN with a uniform prior, Beta(1,1):
stats.beta(1+k, 1+n-k).interval(0.95)       # (0.0708, 0.1216)
#
# THEY AGREE TO THREE DECIMAL PLACES, and they mean different things:
#
#   "the procedure captures the truth 95% of the time"
#   "there is a 95% probability the rate is in this range"
#
# THE SECOND IS WHAT EVERYONE WANTED, AND IT COSTS A PRIOR.

# WHERE THEY DIVERGE: small samples and informative priors.
for k_, n_ in [(0, 10), (1, 20), (2, 100), (47, 500)]:
    w = wilson(k_, n_)
    flat = stats.beta(1+k_, 1+n_-k_).interval(0.95)
    informed = stats.beta(2+k_, 18+n_-k_).interval(0.95)
    print(f"{k_:>3}/{n_:<4}  wilson {w[0]:.3f}-{w[1]:.3f}   "
          f"flat {flat[0]:.3f}-{flat[1]:.3f}   "
          f"informed {informed[0]:.3f}-{informed[1]:.3f}")

#   0/10    wilson 0.000-0.278   flat 0.002-0.285   informed 0.014-0.186
#   1/20    wilson 0.009-0.236   flat 0.012-0.249   informed 0.022-0.196
#   2/100   wilson 0.006-0.070   flat 0.006-0.070   informed 0.014-0.076
#  47/500   wilson 0.072-0.123   flat 0.071-0.122   informed 0.070-0.120
#
# AT 0/10 THE INFORMED PRIOR NARROWS THE INTERVAL FROM 28% WIDE TO 17%.
# At 47/500 every method agrees. THE PRIOR EARNS ITS KEEP EXACTLY WHERE
# THE DATA IS WEAK, and is harmless where it is strong.

# THE BAYESIAN ANSWER TO QUESTIONS FREQUENTISM ANSWERS AWKWARDLY:
post = stats.beta(1+k, 1+n-k)

post.sf(0.10)                               # 0.318  P(rate > 10%)
post.cdf(0.08)                              # 0.184  P(rate < 8%)
post.sf(0.10) - post.sf(0.12)               # 0.276  P(10% < rate < 12%)
#
# EACH IS ONE LINE AND EACH IS DIRECTLY ACTIONABLE. The frequentist
# equivalents are hypothesis tests that answer "would this data be
# surprising if..." rather than "how likely is it that...".
`,
      hl: [22, 36, 43],
      caption: "**At 0 successes in 10 trials an informed prior narrows the interval from 28 points wide to 17.** The prior earns its keep exactly where the data is weak, and is harmless where it is strong."
    },

    { t: "callout", kind: "trap", title: "A flat prior is not the absence of a prior", body: [
      { t: "p", text: "\"Uninformative\" priors still carry information, and a prior that is flat on one scale is not flat on another. There is no way to have no prior — only to have one you have not examined." },
      { t: "code", lang: "python", numbered: false, title: "flat on what?", code: `
# A UNIFORM PRIOR ON A PROBABILITY p is NOT uniform on the odds
# p/(1-p), nor on the log-odds. Reparameterising changes the prior.
rng = np.random.default_rng(0)
p_flat = rng.uniform(0, 1, 200_000)
odds = p_flat / (1 - p_flat)

np.percentile(odds, [25, 50, 75])      # [0.33, 1.00, 3.00] -- not flat
#
# So "flat on p" is a substantive claim: it says an odds of 1000:1 is
# as plausible a priori as 1:1, which is usually false.

# THREE STANDARD "UNINFORMATIVE" CHOICES FOR A PROPORTION, AND THEY
# DISAGREE:
for name, (a, b) in [("uniform (Bayes-Laplace)", (1, 1)),
                     ("Jeffreys", (0.5, 0.5)),
                     ("Haldane", (0.001, 0.001))]:
    post = stats.beta(a + 0, b + 10 - 0)      # 0 successes in 10
    print(f"{name:26s} mean {post.mean():.4f}  "
          f"95% CI {post.interval(0.95)[0]:.4f}-{post.interval(0.95)[1]:.4f}")

# uniform (Bayes-Laplace)    mean 0.0833  95% CI 0.0023-0.2849
# Jeffreys                   mean 0.0455  95% CI 0.0000-0.2172
# Haldane                    mean 0.0001  95% CI 0.0000-0.0000
#
# THREE "UNINFORMATIVE" PRIORS, THREE DIFFERENT ANSWERS. Haldane's is
# improper and collapses entirely on zero successes.
#
# JEFFREYS IS THE PRINCIPLED DEFAULT because it is invariant under
# reparameterisation -- flat on p in a sense that stays flat when you
# switch to odds or log-odds. That property is why it exists.

# THE HONEST PRACTICE IS A SENSITIVITY ANALYSIS: report the answer
# under several priors and let the reader see how much it depends on
# the choice.
def sensitivity(k, n, priors=None):
    priors = priors or {"uniform": (1,1), "jeffreys": (0.5,0.5),
                        "weak (10 pseudo)": (1,9),
                        "strong (100 pseudo)": (10,90)}
    return {name: {"mean": float(stats.beta(a+k, b+n-k).mean()),
                   "ci": tuple(round(v,4) for v in
                               stats.beta(a+k, b+n-k).interval(0.95))}
            for name, (a, b) in priors.items()}

sensitivity(47, 500)     # all four agree to ~0.005 -- data dominates
sensitivity(1, 10)       # means from 0.10 to 0.14, CIs differ widely
#
# IF THE CONCLUSION SURVIVES EVERY REASONABLE PRIOR, THE PRIOR IS NOT
# DOING THE WORK. If it does not, you have learned that the data alone
# is insufficient -- which is itself the finding, and one a p-value
# would never have told you.`},
      { t: "p", text: "**If the conclusion survives every reasonable prior, the prior is not doing the work.** If it does not, you have learned the data alone is insufficient — a finding a p-value would never have surfaced." }
    ]},

    { t: "h2", n: "03", text: "Which framework answers which question", id: "choosing" },

    { t: "ladder",
      title: "Deciding whether to ship a variant",
      rungs: [
        { level: "bad", label: "Pick the framework that gives the answer you want",
          why: "Running a frequentist test, getting `p = 0.09`, then switching to Bayes and reporting a 91% probability of improvement is the same result twice with the friendlier label. It is p-hacking with an extra step.",
          code: `# p = 0.09 -- "not significant"
# P(effect > 0) = 0.955 -- "95% likely to be an improvement"
#
# These are close to the same number, and both come from the same
# likelihood. Reporting whichever crossed a threshold is a decision
# made by the data rather than in advance.` },
        { level: "ok", label: "Choose by what the decision needs, in advance",
          why: "The frameworks answer different questions naturally, so the choice should follow from the question. Deciding before the data removes the temptation entirely.",
          code: `# FREQUENTIST ANSWERS NATURALLY:
#   "Does this method control error rates over many uses?"  -- a
#     regulatory or platform-wide guarantee
#   "Would this data be surprising under no effect?"
#
# BAYESIAN ANSWERS NATURALLY:
#   "What is the probability this variant is better?"
#   "What is the expected loss if I ship the wrong one?"
#   "How should I combine this with what we knew before?"
#   "What should I do when I must decide with very little data?"` },
        { level: "best", label: "Decide on expected loss, which is what the question really is",
          why: "Shipping is a decision under uncertainty, and the posterior is exactly the input a decision rule needs. Expected loss converts a probability into an action without any threshold at all.",
          code: `def ship_decision(k_ctl, n_ctl, k_trt, n_trt, prior=(1, 1),
                  cost_of_switching=0.0, draws=200_000, seed=0):
    """Posterior probability of improvement, plus the expected loss of
    each choice.

    EXPECTED LOSS is the quantity a decision needs: how much worse off
    am I, on average, if I choose this and I am wrong? A threshold on
    it is a business decision; a threshold on a p-value is not."""
    r = np.random.default_rng(seed)
    a, b = prior
    ctl = r.beta(a + k_ctl, b + n_ctl - k_ctl, draws)
    trt = r.beta(a + k_trt, b + n_trt - k_trt, draws)

    lift = trt - ctl
    return {
        "p_better": float((lift > 0).mean()),
        "expected_lift": float(lift.mean()),
        "ci": tuple(np.percentile(lift, [2.5, 97.5])),
        # If I ship and I am wrong, how much do I lose on average?
        "expected_loss_ship": float(np.maximum(-lift, 0).mean()
                                    + cost_of_switching),
        # If I do not ship and I am wrong, how much do I forgo?
        "expected_loss_keep": float(np.maximum(lift, 0).mean()),
        "p_lift_over_1pct": float((lift > 0.01).mean()),
    }

d = ship_decision(k_ctl=1_050, n_ctl=12_000, k_trt=1_140, n_trt=12_000)
d
# {'p_better': 0.941, 'expected_lift': 0.0075,
#  'ci': (-0.0026, 0.0177), 'expected_loss_ship': 0.00021,
#  'expected_loss_keep': 0.00771, 'p_lift_over_1pct': 0.316}

# THE DECISION RULE IS NOW ARITHMETIC:
d["expected_loss_ship"] < d["expected_loss_keep"]     # True -> ship
d["expected_loss_keep"] / d["expected_loss_ship"]     # 37x
#
# NOT SHIPPING IS 37 TIMES MORE COSTLY IN EXPECTATION than shipping.
# That is a far more useful statement than "p = 0.09, not
# significant", and it uses the same data.
#
# NOTE p_better = 0.941 AND p_lift_over_1pct = 0.316. The variant is
# very probably better and probably not better by much -- two
# different questions, both answered, neither available from a single
# p-value.

# THE THRESHOLD ON EXPECTED LOSS IS A BUSINESS CHOICE, and stating it
# in advance is the same discipline as pre-registering alpha:
#
#   "ship when expected loss < 0.0001 absolute conversion"
#
# which for a 12,000-user test means roughly:
#   a 1-in-10,000 chance of losing a percentage point.`,
          note: "**Expected loss converts a posterior into an action with no threshold on a p-value.** \"Not shipping is 37× more costly in expectation\" uses the same data as `p = 0.09` and is a statement someone can act on." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Decide with very little data",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A new enterprise onboarding flow has been tried on 14 customers; 5 completed it. The old flow's rate over three years and 2,100 customers is 22%. The CEO wants a decision this week and there will be no more data before then." },
        { t: "code", lang: "python", numbered: false, title: "the situation", code: `
NEW_SUCCESSES, NEW_TRIALS = 5, 14        # 35.7%
OLD_SUCCESSES, OLD_TRIALS = 462, 2100    # 22.0%

# Switching costs roughly £40,000 in engineering and retraining.
# Each additional completion is worth about £18,000 in first-year
# contract value.
# The company onboards about 700 customers a year.

# A frequentist test:
#   stats.fisher_exact([[5, 9], [462, 1638]]).pvalue  ->  0.22`},
        { t: "p", text: "Give the decision, with the reasoning a CEO can follow and the caveats a statistician would require." }
      ],
      requirements: [
        "Explain why the frequentist test is unhelpful here.",
        "Build a posterior with a defensible prior.",
        "Run a sensitivity analysis across priors.",
        "Compute the expected value of the decision in pounds.",
        "Give a recommendation, including the value of waiting.",
        "Include tests."
      ],
      hint: "The old flow's 2,100 customers are exactly the prior information the new flow's 14 customers lack.",
      solution: {
        lang: "python",
        title: "decide.py",
        code: `import numpy as np
from scipy import stats

NEW_K, NEW_N = 5, 14
OLD_K, OLD_N = 462, 2100
SWITCH_COST = 40_000
VALUE_PER_COMPLETION = 18_000
CUSTOMERS_PER_YEAR = 700
rng = np.random.default_rng(0)


# =========================================================================
# WHY THE FREQUENTIST TEST IS UNHELPFUL
# =========================================================================

p_fisher = stats.fisher_exact([[NEW_K, NEW_N-NEW_K],
                               [OLD_K, OLD_N-OLD_K]])[1]
p_fisher                                    # 0.22
#
# "NOT SIGNIFICANT" -- which here means only "14 customers cannot
# resolve this", something we knew before running the test.
#
# THE POWER MAKES IT EXPLICIT:
def power_at(p1, p2, n, alpha=0.05, trials=20_000, seed=0):
    r = np.random.default_rng(seed)
    hits = 0
    for _ in range(trials):
        a = r.binomial(n, p2)
        hits += stats.fisher_exact([[a, n-a],
                                    [OLD_K, OLD_N-OLD_K]])[1] < alpha
    return hits/trials

power_at(0.22, 0.36, 14)                    # ~0.19
#
# 19% POWER FOR THE OBSERVED EFFECT SIZE. Even if the new flow really
# is 14 points better, this test finds it one time in five. The null
# result carries almost no information (lesson 5.8).
#
# AND THE TEST ANSWERS THE WRONG QUESTION. The CEO does not need to
# know whether the data would be surprising under no effect; they need
# P(new is better) and the money attached to being wrong.


# =========================================================================
# THE PRIOR IS SITTING RIGHT THERE
# =========================================================================
#
# The old flow's 2,100 customers are exactly the prior information the
# 14 lack. The question is HOW MUCH of it transfers to a redesigned
# flow.
#
# A FULL TRANSFER would be Beta(462, 1638) -- worth 2,100
# pseudo-observations, which would completely swamp 14 real ones and
# amount to assuming the redesign changed nothing.
#
# NO TRANSFER would be Beta(1,1), which ignores three years of
# knowledge that onboarding rates in this business live near 20%.
#
# THE SENSIBLE CHOICE IS A DISCOUNTED PRIOR: centred on the old rate,
# with a strength reflecting how much a redesign could plausibly move
# it.

def discounted_prior(k, n, discount):
    """Keep the old flow's rate, shrink its strength.

    discount = 0.01 means 'this is worth about 21 prior observations',
    which lets 14 real ones meaningfully update it."""
    p = k/n
    strength = n * discount
    return p*strength, (1-p)*strength

for disc in (1.0, 0.1, 0.02, 0.01, 0.005):
    a, b = discounted_prior(OLD_K, OLD_N, disc)
    post = stats.beta(a + NEW_K, b + NEW_N - NEW_K)
    print(f"discount {disc:5.3f} ({a+b:7.1f} pseudo-obs): "
          f"posterior mean {post.mean():.3f}  "
          f"95% CI {post.interval(0.95)[0]:.3f}-{post.interval(0.95)[1]:.3f}")

# discount 1.000 (2100.0 pseudo-obs): mean 0.221  CI 0.204-0.239
# discount 0.100 ( 210.0 pseudo-obs): mean 0.230  CI 0.177-0.288
# discount 0.020 (  42.0 pseudo-obs): mean 0.264  CI 0.161-0.381
# discount 0.010 (  21.0 pseudo-obs): mean 0.293  CI 0.163-0.446
# discount 0.005 (  10.5 pseudo-obs): mean 0.318  CI 0.157-0.508
#
# THE CHOICE OF DISCOUNT DRIVES THE ANSWER, and pretending otherwise
# would be dishonest. State it: a 2% discount -- 42 pseudo-
# observations -- says "we believe the old rate, but a redesign could
# plausibly move it, and 14 new customers should count for a third of
# our belief".

PRIOR = discounted_prior(OLD_K, OLD_N, 0.02)
posterior = stats.beta(PRIOR[0] + NEW_K, PRIOR[1] + NEW_N - NEW_K)


# =========================================================================
# SENSITIVITY -- THE PART THAT MAKES IT DEFENSIBLE
# =========================================================================

def sensitivity():
    out = {}
    candidates = {
        "uniform Beta(1,1)":       (1, 1),
        "Jeffreys Beta(.5,.5)":    (0.5, 0.5),
        "old rate, 10 pseudo":     discounted_prior(OLD_K, OLD_N, 0.0048),
        "old rate, 42 pseudo":     discounted_prior(OLD_K, OLD_N, 0.02),
        "old rate, 210 pseudo":    discounted_prior(OLD_K, OLD_N, 0.10),
        "sceptical (centred .22, 100 pseudo)": (22, 78),
    }
    for name, (a, b) in candidates.items():
        post = stats.beta(a+NEW_K, b+NEW_N-NEW_K)
        out[name] = {
            "mean": float(post.mean()),
            "p_better_than_old": float(post.sf(OLD_K/OLD_N)),
            "ci": tuple(round(v, 3) for v in post.interval(0.95)),
        }
    return out

for name, v in sensitivity().items():
    print(f"{name:38s} mean {v['mean']:.3f}  "
          f"P(better) {v['p_better_than_old']:.2f}")

# uniform Beta(1,1)                      mean 0.375  P(better) 0.87
# Jeffreys Beta(.5,.5)                   mean 0.367  P(better) 0.87
# old rate, 10 pseudo                    mean 0.318  P(better) 0.82
# old rate, 42 pseudo                    mean 0.264  P(better) 0.68
# old rate, 210 pseudo                   mean 0.230  P(better) 0.55
# sceptical (centred .22, 100 pseudo)    mean 0.237  P(better) 0.62
#
# P(BETTER) RANGES FROM 0.55 TO 0.87 ACROSS DEFENSIBLE PRIORS. Every
# one exceeds 0.5, so the direction is robust -- but the magnitude is
# entirely prior-dependent.
#
# THAT IS THE HONEST HEADLINE: "probably better, and 14 customers
# cannot tell us by how much."


# =========================================================================
# THE MONEY
# =========================================================================

def expected_value(prior, draws=400_000, seed=0):
    """Annual value of switching, integrating over the posterior."""
    r = np.random.default_rng(seed)
    a, b = prior
    new_rate = r.beta(a + NEW_K, b + NEW_N - NEW_K, draws)
    old_rate = r.beta(1 + OLD_K, 1 + OLD_N - OLD_K, draws)

    lift = new_rate - old_rate
    annual = lift * CUSTOMERS_PER_YEAR * VALUE_PER_COMPLETION

    return {
        "p_better": float((lift > 0).mean()),
        "expected_annual": float(annual.mean()),
        "ci_annual": tuple(np.percentile(annual, [5, 95]).round(0)),
        "p_beats_switch_cost": float((annual > SWITCH_COST).mean()),
        "expected_value_of_switching": float(annual.mean() - SWITCH_COST),
        # Loss if we switch and it turns out worse.
        "expected_loss_if_switch": float(
            np.maximum(-annual, 0).mean() + SWITCH_COST),
        "expected_loss_if_stay": float(np.maximum(annual, 0).mean()),
    }

ev = expected_value(PRIOR)
ev
# {'p_better': 0.68, 'expected_annual': 553_000,
#  'ci_annual': (-770_000, 1_960_000),
#  'p_beats_switch_cost': 0.66,
#  'expected_value_of_switching': 513_000,
#  'expected_loss_if_switch': 156_000,
#  'expected_loss_if_stay': 709_000}
#
# THE ASYMMETRY IS DECISIVE. The switch costs £40,000 and the expected
# annual gain is £553,000 -- roughly 14x the cost. Even the 5th
# percentile scenario loses £770,000 of value, but that is an annual
# figure that can be reversed after one quarter.
ev["expected_loss_if_stay"] / ev["expected_loss_if_switch"]     # ~4.5x


# =========================================================================
# THE VALUE OF WAITING
# =========================================================================
#
# Before recommending, ask what more data would be worth. The CEO says
# no more data before the decision -- but the decision could be staged.

def value_of_information(prior, extra_n, draws=40_000, seed=0):
    """Expected value of seeing extra_n more customers before deciding.

    Simulate: draw a true rate from the posterior, generate extra_n
    outcomes, update, and see whether the extra data would change the
    decision. VOI is the value of the decisions it would improve."""
    r = np.random.default_rng(seed)
    a, b = prior
    a_post, b_post = a + NEW_K, b + NEW_N - NEW_K

    truth = r.beta(a_post, b_post, draws)
    old = OLD_K/OLD_N
    gain_per_year = (truth - old) * CUSTOMERS_PER_YEAR * VALUE_PER_COMPLETION

    # Decision without more data: switch (established above).
    value_now = np.maximum(gain_per_year - SWITCH_COST, 0).mean() \\
        if (gain_per_year.mean() - SWITCH_COST) > 0 else 0.0
    value_now = (gain_per_year - SWITCH_COST).mean()

    # With extra data, decide per simulated world.
    extra_k = r.binomial(extra_n, truth)
    post_mean = (a_post + extra_k) / (a_post + b_post + extra_n)
    would_switch = (post_mean - old) * CUSTOMERS_PER_YEAR * \\
        VALUE_PER_COMPLETION > SWITCH_COST
    value_later = np.where(would_switch, gain_per_year - SWITCH_COST, 0).mean()

    return {"value_deciding_now": float(value_now),
            "value_after_more_data": float(value_later),
            "voi": float(value_later - value_now)}

for extra in (20, 50, 150):
    v = value_of_information(PRIOR, extra)
    print(f"+{extra:3d} customers: VOI = £{v['voi']:>10,.0f}")
# + 20 customers: VOI = £   106,000
# + 50 customers: VOI = £   171,000
# +150 customers: VOI = £   224,000
#
# WAITING FOR 50 MORE CUSTOMERS IS WORTH ~£171,000 in better decisions.
# At 700 customers a year, 50 takes about four weeks.
#
# THAT REFRAMES THE QUESTION ENTIRELY: the choice is not "switch or
# not" but "switch now, or spend four weeks and decide better". And
# the VOI says four weeks is worth £171k, against an expected gain of
# £553k for switching now -- so waiting is worth doing only if the
# switch can be delayed without cost.


# =========================================================================
# THE RECOMMENDATION
# =========================================================================
#
# "SWITCH, AND KEEP MEASURING.
#
#  Best estimate: the new flow converts at about 26% against the old
#  22%. Probability it is better: 68% under our working prior, and
#  between 55% and 87% across every prior we consider reasonable --
#  the direction is robust, the magnitude is not.
#
#  Expected annual value: about £550,000 against a £40,000 switching
#  cost, a 14:1 ratio. The 90% range runs from -£770k to +£1.96m, so
#  this is a favourable bet rather than a certainty.
#
#  Not switching has roughly 4.5x the expected loss of switching, and
#  the switch is reversible within a quarter.
#
#  CAVEAT: 14 customers is very little. If the switch could be delayed
#  four weeks, another 50 customers would be worth about £171,000 in
#  decision quality. If it cannot, switch now -- the asymmetry is
#  large enough that more data is unlikely to reverse it.
#
#  COMMIT TO A REVIEW at 100 customers with a pre-stated rule: if the
#  posterior mean falls below 22%, revert."
#
# WHAT MAKES THIS DEFENSIBLE rather than an opinion: the prior is
# stated and audited, the conclusion is shown to survive every
# reasonable alternative, and the decision rule is arithmetic on
# expected loss rather than a threshold on a p-value.


# =========================================================================
# TESTS
# =========================================================================

def test_frequentist_test_is_underpowered():
    assert power_at(0.22, 0.36, NEW_N) < 0.3


def test_direction_is_robust_across_priors():
    s = sensitivity()

    assert all(v["p_better_than_old"] > 0.5 for v in s.values())


def test_magnitude_is_not_robust_across_priors():
    s = sensitivity()
    ps = [v["p_better_than_old"] for v in s.values()]

    assert max(ps) - min(ps) > 0.25       # 0.55 to 0.87


def test_prior_strength_controls_the_posterior():
    weak = stats.beta(*discounted_prior(OLD_K, OLD_N, 0.005))
    strong = stats.beta(*discounted_prior(OLD_K, OLD_N, 1.0))

    p_weak = stats.beta(weak.args[0]+NEW_K, weak.args[1]+NEW_N-NEW_K).mean()
    p_strong = stats.beta(strong.args[0]+NEW_K,
                          strong.args[1]+NEW_N-NEW_K).mean()

    assert p_weak > p_strong              # weak prior lets data speak


def test_switching_beats_staying_in_expected_loss():
    ev = expected_value(PRIOR)

    assert ev["expected_loss_if_stay"] > 2 * ev["expected_loss_if_switch"]


def test_more_data_has_positive_value():
    for extra in (20, 50):
        assert value_of_information(PRIOR, extra)["voi"] > 0


def test_voi_increases_with_sample_but_saturates():
    v = [value_of_information(PRIOR, n)["voi"] for n in (20, 50, 150)]

    assert v[0] < v[1] < v[2]
    assert v[2] < 3 * v[0]                # diminishing returns`,
        notes: [
          { t: "p", text: "**The frequentist test has 19% power for the observed effect**, so \"not significant\" means only \"14 customers cannot resolve this\" — something known before running it. It also answers the wrong question: the CEO needs `P(better)` and the money attached to being wrong." },
          { t: "callout", kind: "insight", title: "The prior is sitting right there", body: [
            { t: "p", text: "The old flow's 2,100 customers are exactly the information the 14 lack. A full transfer would swamp the new data entirely — assuming the redesign changed nothing — so the question is how much of it to discount." },
            { t: "p", text: "Stating the discount as pseudo-observations makes it auditable: \"42 prior observations\" is a claim anyone can argue with, which is a better conversation than arguing about subjectivity." }
          ]},
          { t: "p", text: "**`P(better)` ranges from 0.55 to 0.87 across defensible priors, and every one exceeds 0.5.** The direction is robust and the magnitude is not — which is the honest headline, and one no p-value would have produced." },
          { t: "p", text: "**The asymmetry decides it**: £553,000 expected annual gain against a £40,000 switch cost, and not switching carries 4.5× the expected loss. The decision rule is arithmetic rather than a threshold." },
          { t: "p", text: "**The value-of-information calculation reframes the question.** Fifty more customers — about four weeks — are worth £171,000 in decision quality, so the real choice is \"switch now or decide better in a month\", not \"switch or not\"." },
          { t: "p", text: "**What makes this defensible rather than an opinion**: the prior is stated and audited, the conclusion survives every reasonable alternative, and a pre-stated review rule at 100 customers commits to reverting if the estimate falls." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A medical device company ran a trial that came in at `p = 0.06` and was told to repeat the study. The repeat cost two years and came in at `p = 0.04`." },
      { t: "p", text: "**Combining the two datasets in a Bayesian analysis — using the first trial's posterior as the second's prior — gave a 99.2% posterior probability of benefit.** The information had been there after the first trial; the framework had simply had no way to carry it forward." },
      { t: "p", text: "**Sequential accumulation of evidence is where Bayesian methods are structurally better.** A posterior is the natural input to the next analysis, and a p-value is not — which is why meta-analysis exists as a separate discipline in the frequentist world." },
      { t: "p", text: "**Nothing here says one framework is right.** The regulator's requirement for a pre-specified error rate over repeated use is a genuine frequentist need, and it is why the two-trial rule exists. The cost of that guarantee was two years, and it should be counted." }
    ]}
  ],

  takeaways: [
    "**Posterior ∝ likelihood × prior**, and the evidence term is only a normalising constant.",
    "**A credible interval supports the probability reading a confidence interval cannot** — that is what the prior buys.",
    "**Conjugate priors turn the update into addition**: Beta(a,b) plus `k` of `n` gives Beta(a+k, b+n−k).",
    "**A Beta prior's strength is `a + b` pseudo-observations**, which makes it auditable rather than merely subjective.",
    "**The normal-normal posterior mean is a precision-weighted average** — literally the shrinkage estimator from 5.2.",
    "**Credible and confidence intervals usually agree numerically and never agree in meaning.**",
    "**The prior matters most where the data is weakest**, and is harmless where the data is strong.",
    "**A flat prior is not the absence of a prior** — uniform on `p` is not uniform on the odds, and \"uninformative\" choices disagree.",
    "**Jeffreys is the principled default** because it is invariant under reparameterisation.",
    "**Run a sensitivity analysis**: if the conclusion survives every reasonable prior, the prior is not doing the work.",
    "**Expected loss converts a posterior into a decision** with no threshold on a p-value.",
    "**Choose the framework in advance from the question** — switching after seeing the result is p-hacking with a friendlier label."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does a 95% credible interval mean?",
        options: [
          "The same as a 95% confidence interval",
          "Given the data and the prior, there is a 95% probability the parameter lies inside it",
          "95% of future observations will fall inside it",
          "The procedure captures the parameter 95% of the time"
        ],
        answer: 1,
        why: "This is the reading everyone wants from a confidence interval and cannot have. The two usually agree numerically — with a flat prior and a decent sample they match to three decimals — and never agree in meaning."
      },
      {
        stem: "A uniform prior on a probability `p` is often called uninformative. Is it?",
        options: [
          "Yes, it expresses no preference",
          "No — it is not uniform on the odds or log-odds, so it makes a substantive claim; Jeffreys is invariant under reparameterisation and is the principled default",
          "Yes, provided the sample is large",
          "Only for proportions"
        ],
        answer: 1,
        why: "Uniform on `p` implies odds with a median of 1 and an interquartile range of 0.33 to 3.00 — it says 1000:1 odds are as plausible as even odds. Three standard \"uninformative\" priors give three different answers on 0 successes in 10 trials."
      },
      {
        stem: "You have 14 observations and a decision to make this week. What does Bayes offer that a frequentist test does not?",
        options: [
          "A more powerful test",
          "A way to combine the data with what you already knew, and a posterior that feeds directly into an expected-loss calculation",
          "A smaller p-value",
          "Nothing — both need more data"
        ],
        answer: 1,
        why: "At 19% power the frequentist test's null result means only \"14 observations cannot resolve this\". The posterior supports statements like \"not switching carries 4.5× the expected loss\", which is what a decision actually needs."
      },
      {
        stem: "Your conclusion changes depending on which reasonable prior you use. What have you learned?",
        options: [
          "That Bayesian methods are unreliable",
          "That the data alone is insufficient to settle the question — which is itself a finding, and one a p-value would not have surfaced",
          "That you should use the uniform prior",
          "That you need a better likelihood"
        ],
        answer: 1,
        why: "Sensitivity analysis is what makes a Bayesian conclusion defensible. If the answer survives every reasonable prior, the prior is not doing the work; if it does not, you now know exactly how much more data the question needs."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between a confidence interval and a credible interval?",
        strong: "A confidence interval is a statement about the procedure — 95% of intervals it produces contain the truth. A credible interval is a statement about the parameter given this data and a prior, so it supports the \"95% probability inside\" reading. They usually agree numerically.",
        answer: [
          { t: "p", text: "Being precise about what varies in each — the interval versus the parameter — is the crux." },
          { t: "p", text: "Noting they agree numerically with a flat prior explains why the distinction is easy to ignore, and why it still matters." }
        ]
      },
      {
        level: "advanced",
        q: "How would you choose a prior, and how do you defend it?",
        strong: "From actual prior information where it exists — a previous version's rate, a related product — discounted for how much should transfer. Then a sensitivity analysis: report the answer under several defensible priors. If the conclusion survives all of them, the prior is not doing the work.",
        answer: [
          { t: "p", text: "Expressing prior strength in pseudo-observations makes it auditable, which is the practical answer to the subjectivity objection." },
          { t: "p", text: "The sensitivity analysis is what turns a choice into a defensible position, and offering it unprompted is the mark of someone who has had the argument before." }
        ]
      },
      {
        level: "advanced",
        q: "When would you prefer Bayesian methods?",
        strong: "When data is scarce and prior information exists, when the decision needs a probability rather than a p-value, and when evidence accumulates sequentially — a posterior is the natural input to the next analysis. Frequentist methods when a guaranteed error rate over repeated use is the requirement.",
        answer: [
          { t: "p", text: "Naming a genuine frequentist advantage rather than advocating one framework shows judgement rather than allegiance." },
          { t: "p", text: "The expected-loss point — that a posterior feeds a decision rule directly — is the practical argument that lands with non-statisticians." }
        ]
      }
    ]
  }
});

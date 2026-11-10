/* ============================================================================
   LESSON 17.1 — Designing the Test
   ========================================================================= */
EC.receiveLesson({
  id: "17.1",

  lede: "An online experiment is designed before it runs, and most bad results come from skipping the design. Decide what is randomised and make the analysis match it; write down one primary metric and the guardrails; and compute how many users the test needs to detect the effect you care about, which sometimes reveals that the test cannot answer the question at all. This lesson computes sample sizes and durations for realistic lifts, shows an A/A test that is 'significant' far too often when the analysis unit does not match the randomisation unit, and checks the assignment itself for a sample ratio mismatch.",

  objectives: [
    "Choose the randomisation unit and analyse at that unit",
    "Write a hypothesis with one primary metric and explicit guardrails",
    "Compute users and days needed for a given lift, and the minimum detectable effect for a given duration",
    "Recognise when the honest answer is that the effect cannot be detected",
    "Check assignment counts for sample ratio mismatch before reading results"
  ],

  prerequisites: ["14.2", "16.1"],

  blocks: [
    { t: "h2", n: "01", id: "power", text: "How long the test must run", sub: "Power for realistic lifts" },
    { t: "p",
      text: "A model change that lifts a 3% conversion rate by 10% is a large win; by 1% is a typical one. The script computes the users each arm needs to detect each lift with 80% power at a 5% two-sided significance level, and how many days that takes at 40,000 eligible users a day." },
    { t: "code",
      lang: "python",
      title: "design.py — sample size, duration, and the unit of analysis",
      code: `import numpy as np
from scipy import stats

# 1. How many users per arm to detect a relative lift in a 3% conversion rate, at alpha 0.05 (two-sided) and 80% power?
def n_per_arm(p, rel_lift, alpha=0.05, power=0.80):
    p2 = p * (1 + rel_lift); za, zb = stats.norm.isf(alpha / 2), stats.norm.isf(1 - power)
    return (za * np.sqrt(2 * p * (1 - p)) + zb * np.sqrt(p * (1 - p) + p2 * (1 - p2))) ** 2 / (p2 - p) ** 2

daily_users = 40_000                                            # eligible users a day, split 50/50
print(f"{'lift':>6}{'users per arm':>15}{'days at 40,000/day':>20}")
for lift in (0.10, 0.05, 0.02, 0.01):
    n = n_per_arm(0.03, lift)
    print(f"{lift:>6.0%}{n:>15,.0f}{2 * n / daily_users:>20.1f}")

# 2. Randomise users but analyse sessions as if independent: an A/A test (no real difference), 2,000 times.
rng = np.random.default_rng(23)
def aa_test(analyse_by):
    users = 4_000; sessions = rng.poisson(5, users) + 1
    user_rate = rng.beta(0.6, 19.4, users)                        # users differ: some convert far more than others
    arm = rng.random(users) < 0.5
    conv = rng.binomial(sessions, user_rate)
    if analyse_by == "session":                                  # treats every session as an independent trial
        a = (conv[arm].sum(), sessions[arm].sum()); b = (conv[~arm].sum(), sessions[~arm].sum())
        p = (a[0] + b[0]) / (a[1] + b[1]); se = np.sqrt(p * (1 - p) * (1 / a[1] + 1 / b[1]))
        z = (a[0] / a[1] - b[0] / b[1]) / se
    else:                                                        # one value per user, the unit that was randomised
        r = conv / sessions; z = stats.ttest_ind(r[arm], r[~arm]).statistic
    return abs(z) > 1.96
for unit in ("session", "user"):
    fp = np.mean([aa_test(unit) for _ in range(2_000)])
    print(f"A/A test analysed per {unit:<8}: 'significant' in {fp:.1%} of runs (should be 5%)")`,
      out: `  lift  users per arm  days at 40,000/day
   10%         51,486                 2.6
    5%        204,493                10.2
    2%      1,272,588                63.6
    1%      5,082,988               254.1
A/A test analysed per session : 'significant' in 8.6% of runs (should be 5%)
A/A test analysed per user    : 'significant' in 5.1% of runs (should be 5%)` },
    { t: "viz",
      title: "Days needed to detect a lift in a 3% conversion rate",
      caption: "Required sample grows with 1 / lift²: halving the lift you want to detect quadruples the test.",
      svg: `<svg viewBox="0 0 760 172" width="100%" role="img">
<text x="110" y="31.0" text-anchor="end" class="s-label">10% lift</text>
<rect x="120" y="14" width="4.8" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="132.8" y="31.0" class="s-sub">2.6 days</text>
<text x="110" y="69.0" text-anchor="end" class="s-label">5% lift</text>
<rect x="120" y="52" width="18.7" height="26" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="146.7" y="69.0" class="s-sub">10.2 days</text>
<text x="110" y="107.0" text-anchor="end" class="s-label">2% lift</text>
<rect x="120" y="90" width="116.4" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="244.4" y="107.0" class="s-sub">64 days</text>
<text x="110" y="145.0" text-anchor="end" class="s-label">1% lift</text>
<rect x="120" y="128" width="465.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="593.0" y="145.0" class="s-sub">254 days</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Small lifts need very large tests",
          def: "10% took under 3 days; 2% took 64 days; 1% took 254 days, longer than anyone will run a test, and long enough for seasonality and other launches to contaminate it." },
        { term: "Sometimes the answer is no",
          def: "If the plausible effect is 1% and traffic is 40,000 users a day, the test cannot detect it. The options are a more sensitive metric (one closer to the change), variance reduction (such as CUPED, which adjusts for pre-experiment behaviour), more traffic, or deciding without a test." },
        { term: "The unit of analysis must match the unit of randomisation",
          def: "Randomising users and analysing sessions as independent made an A/A test 'significant' 8.6% of the time instead of 5%, because one user's sessions are correlated. Analysing one value per user gave 5.1%." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Many metrics, no primary",
      body: [
        { t: "p",
          text: "A test with fifteen metrics and no declared primary will find a 'significant' improvement in something by chance. Write down before the test: one primary metric that decides, guardrails that can veto (latency, errors, revenue, complaints), and the minimum effect worth shipping." }
      ] },
    { t: "h2", n: "02", id: "hypothesis", text: "The design, written down", sub: "Before any traffic is split" },
    { t: "table",
      head: ["Element", "Example for a ranking model"],
      rows: [
        ["Hypothesis", "The new ranker increases purchases per session"],
        ["Randomisation unit", "User (hash of user ID, lesson 14.2)"],
        ["Primary metric", "Purchases per user over the test, analysed per user"],
        ["Guardrails", "p99 latency, error rate, revenue per user, refund rate"],
        ["Minimum effect worth shipping", "+2% relative"],
        ["Sample size and duration", "1.27M users per arm, about 64 days at current traffic"],
        ["Decision rule", "Ship if the primary's interval excludes 0 and no guardrail breaches"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "What can this test detect?",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "With 40,000 eligible users a day split evenly, compute the minimum detectable relative lift at 80% power for runs of 7, 14 and 28 days and baselines of 3%, 10% and 30%. Then check two sets of assignment counts for a sample ratio mismatch with a chi-square test, and decide whether each experiment's result can be read." }
      ],
      requirements: [
        "Invert the sample-size formula numerically",
        "Keep the treated rate below 1 in the search",
        "A 3 × 3 table of minimum detectable effects",
        "A chi-square check of the 50/50 split"
      ],
      hint: "scipy.optimize.brentq finds the lift at which the required sample equals the users available.",
      solution: { lang: "python",
        title: "mde_and_srm.py",
        code: `import numpy as np
from scipy import stats, optimize

def n_per_arm(p, rel_lift, alpha=0.05, power=0.80):
    p2 = p * (1 + rel_lift); za, zb = stats.norm.isf(alpha / 2), stats.norm.isf(1 - power)
    return (za * np.sqrt(2 * p * (1 - p)) + zb * np.sqrt(p * (1 - p) + p2 * (1 - p2))) ** 2 / (p2 - p) ** 2

def mde(p, users_per_arm):
    """Smallest relative lift detectable with 80% power for a given sample: solve n_per_arm(p, lift) = users."""
    return optimize.brentq(lambda l: n_per_arm(p, l) - users_per_arm, 1e-4, 0.99 * (1 - p) / p)   # p * (1 + lift) must stay below 1

print("minimum detectable relative lift at 40,000 users/day, split 50/50")
print(f"{'baseline':>9}" + "".join(f"{f'{d} days':>11}" for d in (7, 14, 28)))
for p in (0.03, 0.10, 0.30):
    print(f"{p:>9.0%}" + "".join(f"{mde(p, 20_000 * d):>11.1%}" for d in (7, 14, 28)))

# Sample ratio mismatch: the assignment counts themselves are a test of the experiment's plumbing.
for a, b in ((50_212, 49_788), (50_912, 49_088)):
    chi2, p = stats.chisquare([a, b])
    print(f"\\nassigned {a:,} vs {b:,} (expected 50/50): chi-square p = {p:.2g} -> "
          f"{'consistent with 50/50' if p > 0.001 else 'SAMPLE RATIO MISMATCH: do not read the result'}")`,
        out: `minimum detectable relative lift at 40,000 users/day, split 50/50
 baseline     7 days    14 days    28 days
       3%       6.0%       4.3%       3.0%
      10%       3.2%       2.2%       1.6%
      30%       1.6%       1.1%       0.8%

assigned 50,212 vs 49,788 (expected 50/50): chi-square p = 0.18 -> consistent with 50/50

assigned 50,912 vs 49,088 (expected 50/50): chi-square p = 8e-09 -> SAMPLE RATIO MISMATCH: do not read the result`,
        notes: [
          { t: "p",
            text: "A 3% baseline needs a 6% lift to be detectable in a week and 3% in four weeks; a 30% baseline can see 0.8% in four weeks. This assumes every day brings new users; in reality returning users make the count of distinct users grow more slowly, so these are the best case." },
          { t: "p",
            text: "The first split, 50,212 against 49,788, is consistent with 50/50 (p = 0.18). The second, 50,912 against 49,088, has p = 8×10⁻⁹: something in assignment or logging is dropping users from one arm, typically a redirect, a crash or a bot filter that affects one variant. Its result cannot be trusted whatever it says, and the check costs one line." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the winning variant that crashed for some users",
      body: [
        { t: "p",
          text: "**Symptom.** A new recommendation model won its A/B test by 4% on purchases per user, an unusually large effect, and lost it after full rollout." },
        { t: "p",
          text: "**Mechanism.** The new variant's page failed to load on an old mobile app version, and those users, who also bought less than average, never reached the logging point. Treatment had 1.8% fewer users than control, and the remaining treatment users were unusually active. Nobody had checked the assignment counts." },
        { t: "p",
          text: "**Fix.** Every experiment report now starts with a sample ratio mismatch test and refuses to show results if it fails, assignment is logged at randomisation rather than at page load, and effects above a plausibility threshold require a second test." }
      ] }
  ],

  takeaways: [
    "Design before running: **unit, hypothesis, one primary metric, guardrails, minimum effect, sample size, decision rule**.",
    "Sample size grows with **1 / lift²**: at 40,000 users/day, 10% took **2.6 days**, 2% **64 days**, 1% **254 days**.",
    "When the plausible effect cannot be detected, change the metric, reduce variance, add traffic, or decide without a test.",
    "Analyse at the randomisation unit: per-session analysis of a per-user test gave **8.6%** false positives instead of 5%.",
    "Minimum detectable effect at a 3% baseline: **6%** in a week, **3%** in four.",
    "Check **sample ratio mismatch** first: 50,912 vs 49,088 gave p = 8×10⁻⁹, and the result cannot be read."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Detecting a 2% lift took 64 days. Roughly how long would a 1% lift take?",
        options: [
          "About 32 days, half as long",
          "About 254 days, four times as long",
          "About 128 days, twice as long as before",
          "About 64 days, the same duration"
        ],
        answer: 1,
        why: "Required sample grows with 1 / lift², so halving the lift quadruples the users: 254 days in the script." },
      { stem: "Users are randomised but sessions are analysed as independent. What happens in an A/A test?",
        options: [
          "Results are correct, since there are more sessions",
          "False positives rise above 5%, here to 8.6%",
          "False positives fall below 5% instead",
          "The test has no power to detect anything"
        ],
        answer: 1,
        why: "Sessions of the same user are correlated, so the standard error is understated and noise looks significant. More rows do not fix a wrong unit." },
      { stem: "Assignment counts are 50,912 and 49,088 for a 50/50 test. What should you do?",
        options: [
          "Read the result, since the split is close to even",
          "Investigate the mismatch before reading anything",
          "Reweight the arms to 50/50 and proceed",
          "Extend the test until the counts even out"
        ],
        answer: 1,
        why: "p = 8×10⁻⁹ means users are being lost unevenly, which biases the comparison. Reweighting and waiting do not remove the selection, and the gap is far beyond chance." },
      { stem: "The plausible effect is 1% and the test would need 254 days. What is a sensible next step?",
        options: [
          "Run it anyway and stop when significant",
          "Find a more sensitive metric or reduce variance",
          "Lower the significance level to 0.5",
          "Run it for one week and extrapolate the trend line"
        ],
        answer: 1,
        why: "A metric closer to the change or variance reduction can cut the required sample. Stopping when significant inflates false positives, a 0.5 level is meaningless, and extrapolating a week proves nothing." }
    ] },

  interview: { title: "In an interview",
    sub: "Design questions should end with a number of days.",
    questions: [
      { level: "core",
        q: "Design an A/B test for a new ranking model.",
        strong: "A strong answer covers unit, metrics, guardrails, sample size, duration and checks.",
        answer: [
          { t: "p",
            text: "Randomise by user with a salted hash; primary metric purchases per user, analysed per user; guardrails latency, errors, revenue and complaints. Choose the minimum effect worth shipping, compute users per arm and days from baseline and traffic, and run whole weeks to cover weekly cycles. Before reading the result, check sample ratio mismatch and that guardrails held; then report the primary's confidence interval against the minimum effect." }
        ] },
      { level: "advanced",
        q: "Your test cannot detect the effect size you expect in a reasonable time. What do you do?",
        strong: "A strong answer lists variance reduction, metric choice and alternatives honestly.",
        answer: [
          { t: "p",
            text: "Use variance reduction such as CUPED with pre-experiment behaviour as a covariate; choose a metric closer to the change (clicks on ranked items rather than revenue) with a guardrail on the business metric; include more traffic or more surfaces; or accept that the decision will be made on offline evidence plus a guardrail-only canary. Running an underpowered test and reading its noise is the option to avoid." }
        ] },
      { level: "core",
        q: "What is a sample ratio mismatch and why does it matter?",
        strong: "A strong answer explains the test and typical causes.",
        answer: [
          { t: "p",
            text: "A difference between the planned and observed share of users in each arm larger than chance allows, tested with a chi-square on assignment counts. It means users are lost or added unevenly, through crashes, redirects, bot filtering or logging only after page load, and the lost users usually differ from the rest, so the comparison is biased. Results should not be read until it is explained." }
        ] }
    ] }
});

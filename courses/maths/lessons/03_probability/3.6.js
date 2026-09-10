/* ============================================================================
   LESSON 3.6 — Conditional Probability and Bayes
   ========================================================================= */
EC.receiveLesson({
  id: "3.6",

  lede: "**`P(A|B)` and `P(B|A)` are different numbers**, and confusing them is the most consequential error in applied statistics — it convicts innocent people, misreads medical tests and makes fraud detectors unusable. Bayes' theorem is the conversion between them, and the base rate is the term everyone drops.",

  objectives: [
    "Compute a conditional probability from a joint distribution",
    "Apply Bayes' theorem and identify each term by name",
    "Explain why a 99%-accurate test can be wrong most of the time",
    "Distinguish independence from conditional independence",
    "Recognise the prosecutor's fallacy in real arguments"
  ],

  prerequisites: ["3.3"],

  blocks: [

    { t: "h2", n: "01", text: "Conditioning restricts the sample space", id: "conditioning" },

    { t: "p", text: "**Conditioning means discarding every outcome where the condition failed, then rescaling what remains so it sums to 1 again.** The relative sizes inside the condition never change — only the denominator does, which is why `P(A|B)` and `P(B|A)` divide by different things." },

    { t: "dl", items: [
      ["Conditional probability", "`P(A|B) = P(A ∩ B) / P(B)`, read as \"the probability of A given B\". Undefined when `P(B) = 0`."],
      ["Joint probability", "`P(A ∩ B)` — both occur. Symmetric in `A` and `B`, unlike the conditional."],
      ["Multiplication rule", "`P(A ∩ B) = P(A|B)P(B)`. The definition rearranged, and the way joint distributions are built from conditionals."],
      ["Chain rule", "`P(A,B,C) = P(A)P(B|A)P(C|A,B)`. Every probabilistic model is a claim about which of these terms simplify."]
    ]},

    { t: "code", lang: "python", title: "the definition, and what it does geometrically", code: `
import numpy as np

# P(A | B) = P(A and B) / P(B)
#
# CONDITIONING IS RENORMALISATION. Learning that B happened discards
# every outcome outside B and rescales the rest so they sum to 1 again.
# The relative sizes within B never change -- only the denominator.

# A CONCRETE JOINT DISTRIBUTION: users by plan and by whether they
# churned this month.
#
#                 churned    stayed    total
#   free            0.180     0.520     0.700
#   paid            0.015     0.285     0.300
#   total           0.195     0.805     1.000

joint = {("free", "churn"): 0.180, ("free", "stay"): 0.520,
         ("paid", "churn"): 0.015, ("paid", "stay"): 0.285}

def marginal(joint, index, value):
    return sum(p for k, p in joint.items() if k[index] == value)

p_churn = marginal(joint, 1, "churn")            # 0.195
p_paid  = marginal(joint, 0, "paid")             # 0.300

# P(churn | paid) -- restrict to the paid row, renormalise.
joint[("paid", "churn")] / p_paid                # 0.050

# P(paid | churn) -- restrict to the churn column instead.
joint[("paid", "churn")] / p_churn               # 0.077

# THE TWO ARE DIFFERENT NUMBERS ANSWERING DIFFERENT QUESTIONS:
#
#   P(churn | paid) = 5.0%    "of paid users, how many leave?"
#   P(paid | churn) = 7.7%    "of leavers, how many were paying?"
#
# The first is a retention metric. The second is a revenue-impact
# metric. Reporting one when the other was asked for is a common and
# expensive slip.

# THE MULTIPLICATION RULE is the definition rearranged, and it is how
# you build joints from conditionals:
#     P(A and B) = P(A | B) P(B)
0.050 * p_paid                                   # 0.015, as expected

# CHAINED, it factorises any joint distribution:
#     P(A,B,C) = P(A) P(B|A) P(C|A,B)
#
# Every probabilistic model -- Bayesian networks, autoregressive
# language models, hidden Markov models -- is a claim about which
# terms in that chain can be simplified.
`,
      hl: [4, 34, 51],
      caption: "**Conditioning restricts and renormalises.** The relative sizes within `B` are untouched; only the denominator changes, which is why `P(A|B)` and `P(B|A)` divide by different things."
    },

    { t: "h2", n: "02", text: "Bayes, and the term everyone drops", id: "bayes" },

    { t: "p", text: "**Bayes' theorem converts `P(evidence | hypothesis)` into `P(hypothesis | evidence)`** — the direction you almost always want and almost never measure directly. The conversion requires the prior, and the prior is the term that gets dropped." },

    { t: "dl", items: [
      ["Prior", "`P(H)` — what you believed before seeing the evidence. In a medical test this is the prevalence; in an experiment, the base rate of ideas that work."],
      ["Likelihood", "`P(E|H)` — how well the hypothesis explains the evidence. A test's sensitivity is a likelihood."],
      ["Posterior", "`P(H|E)` — the updated belief. What the question was actually asking for."],
      ["Evidence", "`P(E)` — the normaliser, summed over every hypothesis. It makes the posterior a proper distribution."],
      ["Base rate neglect", "Ignoring the prior and reading the likelihood as the posterior. The single most consequential error in applied probability."],
      ["Sensitivity / specificity", "`P(positive | disease)` and `P(negative | healthy)`. Both are properties of the test alone; **precision is not**, because it also depends on prevalence."]
    ]},

    { t: "viz",
      title: "Why a 99% accurate test is usually wrong",
      caption: "10,000 people, 1% prevalence. The 99 true positives are outnumbered by the 99 false positives from the much larger healthy group — so a positive result is a coin flip, however accurate the test.",
      svg: `<svg viewBox="0 0 880 290" role="img" aria-label="Population split into 100 sick and 9900 healthy, with true and false positives compared">
  <rect x="60" y="50" width="70" height="150" style="fill:var(--crit);fill-opacity:.2;stroke:var(--crit)" stroke-width="2"/>
  <text x="62" y="40" class="s-label" style="fill:var(--crit)">sick: 100</text>
  <rect x="60" y="50" width="70" height="148" style="fill:var(--crit);fill-opacity:.55"/>
  <text x="70" y="222" class="s-sub" style="fill:var(--crit)">99 detected</text>

  <rect x="220" y="50" width="330" height="150" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="2"/>
  <text x="222" y="40" class="s-label" style="fill:var(--good)">healthy: 9,900</text>
  <rect x="220" y="50" width="4" height="150" style="fill:var(--warn);fill-opacity:.85"/>
  <text x="230" y="222" class="s-sub" style="fill:var(--warn)">99 false positives (1% of 9,900)</text>

  <line x1="60" y1="248" x2="550" y2="248" style="stroke:var(--line)" stroke-width="1.5"/>
  <text x="60" y="272" class="s-label" style="fill:var(--ink-2)">99 true + 99 false  =  a positive result is right 50% of the time</text>

  <text x="600" y="80"  class="s-sub" style="fill:var(--ink-3)">the test is 99% accurate</text>
  <text x="600" y="102" class="s-sub" style="fill:var(--ink-3)">and a positive result still</text>
  <text x="600" y="124" class="s-sub" style="fill:var(--ink-3)">carries no information</text>
  <text x="600" y="160" class="s-sub" style="fill:var(--ink-3)">1% of a big group can outnumber</text>
  <text x="600" y="182" class="s-sub" style="fill:var(--ink-3)">99% of a small one</text>
</svg>`
    },

    { t: "code", lang: "python", title: "count people, not probabilities", code: `
# BAYES' THEOREM:
#
#     P(H | E) = P(E | H) P(H) / P(E)
#
#   P(H)     PRIOR       what you believed before the evidence
#   P(E | H) LIKELIHOOD  how well the hypothesis explains the evidence
#   P(E)     EVIDENCE    the normaliser, summed over all hypotheses
#   P(H | E) POSTERIOR   what you believe after
#
# THE PRIOR IS THE TERM THAT GETS DROPPED, and it is usually the one
# doing the most work.

def bayes(prior, sensitivity, specificity):
    """P(disease | positive test)."""
    tp = prior * sensitivity                       # true positives
    fp = (1 - prior) * (1 - specificity)           # false positives
    return tp / (tp + fp)

bayes(prior=0.01, sensitivity=0.99, specificity=0.99)     # 0.5
#
# A 99%-ACCURATE TEST, AND A POSITIVE RESULT IS A COIN FLIP.

# THE COUNTING VERSION IS THE ONE TO USE IN CONVERSATION, because it
# makes the answer obvious rather than surprising:
#
#   10,000 people, 1% have the disease
#     100 sick     -> 99 test positive     (99% sensitivity)
#   9,900 healthy  -> 99 test positive     (1% false-positive rate)
#
#   198 positives, 99 of them real. So 50%.
#
# 1% OF A BIG GROUP CAN OUTNUMBER 99% OF A SMALL ONE. That single
# sentence is the whole of base-rate neglect.

# THE PRIOR DOMINATES:
for prior in (0.0001, 0.001, 0.01, 0.1, 0.5):
    print(f"prevalence {prior:7.2%}  ->  P(sick | positive) = "
          f"{bayes(prior, 0.99, 0.99):6.2%}")

# prevalence   0.01%  ->  P(sick | positive) =  0.98%
# prevalence   0.10%  ->  P(sick | positive) =  9.02%
# prevalence   1.00%  ->  P(sick | positive) = 50.00%
# prevalence  10.00%  ->  P(sick | positive) = 91.67%
# prevalence  50.00%  ->  P(sick | positive) = 99.00%
#
# The test never changed. The answer moved by a factor of 100.

# WHICH IS WHY SCREENING AN ASYMPTOMATIC POPULATION AND TESTING A
# SYMPTOMATIC PATIENT ARE DIFFERENT ACTS with the same instrument.
# Symptoms raise the prior, which is what makes the same test useful.

# SPECIFICITY MATTERS MORE THAN SENSITIVITY AT LOW PREVALENCE, because
# the false positives come from the larger group:
bayes(0.001, 0.99, 0.99)          # 9.0%
bayes(0.001, 0.90, 0.99)          # 8.3%   sensitivity 99 -> 90: small loss
bayes(0.001, 0.99, 0.999)         # 49.8%  specificity 99 -> 99.9: 5x gain
`,
      hl: [11, 17, 28, 55],
      caption: "**At low prevalence, specificity matters far more than sensitivity.** Dropping sensitivity from 99% to 90% costs almost nothing; raising specificity from 99% to 99.9% multiplies the answer by five."
    },

    { t: "callout", kind: "trap", title: "The prosecutor's fallacy", body: [
      { t: "p", text: "\"The chance of this DNA match occurring by coincidence is 1 in a million, so there is a one-in-a-million chance the defendant is innocent.\" **Those are different statements**, and the second does not follow." },
      { t: "code", lang: "python", numbered: false, title: "the same evidence, two very different conclusions", code: `
# P(match | innocent) = 1e-6      -- what the lab measured
# P(innocent | match) = ?         -- what the court needs
#
# Bayes converts one into the other, and the PRIOR decides the answer.

def p_guilty_given_match(pool_size, match_rate=1e-6):
    """One true perpetrator somewhere in a pool of pool_size people."""
    prior = 1.0 / pool_size
    expected_false = (pool_size - 1) * match_rate
    return 1.0 / (1.0 + expected_false)

# SCENARIO A -- the suspect was identified by other evidence, and the
# effective pool is 100 people.
p_guilty_given_match(100)          # 99.99% -- damning

# SCENARIO B -- the suspect was found by searching a national database
# of 60 million profiles.
p_guilty_given_match(60_000_000)   # 1.6%   -- 60 expected false matches
#
# THE SAME 1-IN-A-MILLION EVIDENCE. In the first case it is
# conclusive; in the second it is almost meaningless, because a large
# enough search will find a coincidental match with near certainty.
60_000_000 * 1e-6                  # 60 expected innocent matches

# THIS IS NOT A HYPOTHETICAL DISTINCTION. It is why "cold hit" database
# searches are treated differently from confirmatory tests in forensic
# guidance, and why the size of the search matters as much as the
# strength of the match.`},
      { t: "p", text: "**The same evidence supports opposite conclusions depending on how the suspect was found.** Searching a large database guarantees coincidental matches, so the search size belongs in the calculation — a rule that applies equally to hypothesis testing across many features (lesson 5.10)." }
    ]},

    { t: "h2", n: "03", text: "Independence and its conditional cousin", id: "independence" },

    { t: "p", text: "**Independence means learning one thing tells you nothing about the other**, and it is a much stronger claim than it sounds. Conditional independence — independence once a third variable is known — is a different property, and neither implies the other." },

    { t: "dl", items: [
      ["Independent", "`P(A ∩ B) = P(A)P(B)`. Equivalently `P(A|B) = P(A)`: the condition changes nothing."],
      ["Conditionally independent", "`P(A ∩ B | C) = P(A|C)P(B|C)`. Independent *once you know* `C`."],
      ["Confounder", "A common **cause** of both variables. Conditioning on it removes a spurious association."],
      ["Collider", "A common **effect** of both. Conditioning on it *creates* an association that was not there — which is why \"control for everything\" is unsafe advice."],
      ["Mutually exclusive ≠ independent", "Disjoint events are maximally dependent: knowing one occurred tells you the other did not."]
    ]},

    { t: "code", lang: "python", title: "two ideas that are routinely confused", code: `
# INDEPENDENT:              P(A and B) = P(A) P(B)
# CONDITIONALLY INDEPENDENT GIVEN C:
#                           P(A and B | C) = P(A|C) P(B|C)
#
# NEITHER IMPLIES THE OTHER. Both directions fail, and both failures
# have names.

rng = np.random.default_rng(0)
n = 500_000

# CASE 1 -- dependent marginally, INDEPENDENT given a common cause.
#   Ice cream sales and drownings both depend on temperature.
temp = rng.normal(20, 8, n)
icecream = temp * 3 + rng.normal(0, 5, n)
drownings = temp * 0.4 + rng.normal(0, 2, n)

np.corrcoef(icecream, drownings)[0, 1]           # 0.771 -- strong

# Condition on temperature (take a narrow band) and it vanishes:
band = np.abs(temp - 20) < 0.5
np.corrcoef(icecream[band], drownings[band])[0, 1]   # 0.011
#
# THIS IS CONFOUNDING, and conditioning on the confounder is the fix.

# CASE 2 -- INDEPENDENT marginally, dependent given a common EFFECT.
#   Talent and luck are independent; both cause success.
talent = rng.normal(0, 1, n)
luck = rng.normal(0, 1, n)
success = talent + luck

np.corrcoef(talent, luck)[0, 1]                  # -0.001 -- independent

# Condition on being successful, and they become NEGATIVELY correlated:
top = success > 2.0
np.corrcoef(talent[top], luck[top])[0, 1]        # -0.669
#
# Among successful people, the talented ones were less lucky -- because
# either route sufficed. THIS IS COLLIDER BIAS, and here conditioning
# CREATES the association rather than removing it.

# THE ASYMMETRY IS THE POINT AND IT IS EASY TO GET BACKWARDS:
#
#   Condition on a COMMON CAUSE   -> removes spurious association
#   Condition on a COMMON EFFECT  -> creates spurious association
#
# "Control for everything you measured" is therefore not safe advice.
# Controlling for a collider actively manufactures the correlation you
# are trying to rule out, which is how "attractive people are less
# intelligent" appears in dating-pool data and nowhere else.
`,
      hl: [5, 28, 45, 47],
      caption: "**Conditioning on a common cause removes a spurious association; conditioning on a common effect creates one.** \"Control for everything\" is not safe advice — it is how collider bias gets manufactured."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Explain why a fraud model is unusable at its stated accuracy",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A vendor pitches a fraud detector: 98% sensitivity, 97% specificity, validated on a balanced dataset. Your platform processes 2 million transactions a day, of which about 0.3% are fraudulent. Each flagged transaction goes to a human reviewer who takes four minutes." },
        { t: "p", text: "Decide whether to buy it, and say what would have to change." }
      ],
      requirements: [
        "Compute the precision at your actual base rate.",
        "Compute the daily review workload in people.",
        "Explain why the balanced-dataset validation is misleading.",
        "Say what specificity would be needed to make it viable, and whether that is realistic.",
        "Propose a design that works with the model as it is.",
        "Include tests."
      ],
      hint: "Compute the false positives per day before anything else — the number decides the answer on its own.",
      solution: {
        lang: "python",
        title: "fraud_review.py",
        code: `import numpy as np

DAILY = 2_000_000
BASE_RATE = 0.003
SENSITIVITY = 0.98
SPECIFICITY = 0.97
REVIEW_MINUTES = 4
MINUTES_PER_SHIFT = 6 * 60          # 6 productive hours


# =========================================================================
# THE CONFUSION MATRIX AT THE REAL BASE RATE
# =========================================================================

def confusion(n, base_rate, sens, spec):
    fraud = n * base_rate
    legit = n * (1 - base_rate)
    return {
        "tp": fraud * sens,
        "fn": fraud * (1 - sens),
        "fp": legit * (1 - spec),
        "tn": legit * spec,
    }

c = confusion(DAILY, BASE_RATE, SENSITIVITY, SPECIFICITY)

c["tp"]      #      5,880   fraud caught
c["fn"]      #        120   fraud missed
c["fp"]      #     59,820   legitimate transactions flagged
c["tn"]      #  1,934,180   legitimate transactions passed

precision = c["tp"] / (c["tp"] + c["fp"])
precision    # 0.0895
#
# 8.95% PRECISION. Ninety-one out of every hundred flags are wrong.


# =========================================================================
# THE WORKLOAD, WHICH SETTLES IT ON ITS OWN
# =========================================================================

flagged = c["tp"] + c["fp"]                       # 65,700 per day
minutes = flagged * REVIEW_MINUTES                # 262,800 minutes
reviewers = minutes / MINUTES_PER_SHIFT           # 730.0

reviewers    # 730 full-time reviewers
#
# SEVEN HUNDRED AND THIRTY PEOPLE, of whom 664 spend their entire day
# on transactions that were never fraudulent.
#
# THE ANSWER IS NO, AND IT DOES NOT DEPEND ON THE PRICE OF THE MODEL.
# No plausible fraud loss justifies a 730-person review team, and the
# staffing number is decisive before any accuracy argument.


# =========================================================================
# WHY THE BALANCED VALIDATION IS MISLEADING
# =========================================================================
#
# On a balanced set (50% fraud), the same model looks excellent:

bal = confusion(100_000, 0.5, SENSITIVITY, SPECIFICITY)
bal["tp"] / (bal["tp"] + bal["fp"])               # 0.9702 precision
#
# 97% PRECISION ON THE PITCH DECK, 9% IN PRODUCTION. Nothing about the
# model changed; only the base rate did.
#
# SENSITIVITY AND SPECIFICITY ARE PROPERTIES OF THE MODEL. PRECISION
# IS NOT -- it is a property of the model AND the population. Quoting
# precision from a balanced set is quoting a number that will never be
# observed, and it is the single most common way ML results are
# oversold.
#
# THE TELL, WHENEVER YOU SEE A VENDOR NUMBER: ask what base rate it was
# measured at. If the answer is "we balanced the classes", the
# precision figure is fiction.
#
# WHY THE GAP IS SO LARGE HERE: at 0.3% prevalence the legitimate group
# is 332x bigger than the fraud group, so a 3% false-positive rate on
# the big group produces 10x more flags than a 98% catch rate on the
# small one.
(1 - BASE_RATE) / BASE_RATE                       # 332.3


# =========================================================================
# WHAT SPECIFICITY WOULD BE NEEDED
# =========================================================================

def specificity_for_precision(target, base_rate, sens):
    """Invert precision = tp/(tp+fp) for the false-positive rate."""
    fpr = base_rate * sens * (1 - target) / (target * (1 - base_rate))
    return 1 - fpr

for target in (0.25, 0.50, 0.80, 0.90):
    spec = specificity_for_precision(target, BASE_RATE, SENSITIVITY)
    fp = DAILY * (1 - BASE_RATE) * (1 - spec)
    n_rev = (fp + c["tp"]) * REVIEW_MINUTES / MINUTES_PER_SHIFT
    print(f"precision {target:.0%}  needs specificity {spec:.4%}  "
          f"-> {fp:8,.0f} FP/day, {n_rev:5.0f} reviewers")

# precision 25%  needs specificity 99.1156%  ->   17,640 FP/day,   261 reviewers
# precision 50%  needs specificity 99.7052%  ->    5,880 FP/day,   131 reviewers
# precision 80%  needs specificity 99.9263%  ->    1,470 FP/day,    82 reviewers
# precision 90%  needs specificity 99.9673%  ->      653 FP/day,    73 reviewers
#
# EVEN 25% PRECISION -- three wasted reviews for every real one --
# requires specificity to rise from 97% to 99.12%. That is not a
# tuning change: the false-positive rate must fall by a factor of 3.4.
#
# For 90% precision the false-positive rate must fall by 92x, from 3%
# to 0.033%. Models do not usually improve by two orders of magnitude
# on one axis, so this is not a realistic ask of the vendor.


# =========================================================================
# THE DESIGN THAT WORKS WITH THIS MODEL
# =========================================================================
#
# The model is not useless -- it is being used wrongly. A binary flag
# feeding a human queue is the wrong architecture for a 0.3% base rate.
#
# 1. USE THE SCORE, NOT THE LABEL. A threshold at 0.5 is an arbitrary
#    choice the vendor made. Sort by score and review from the top
#    until the reviewer budget runs out. With 20 reviewers:
budget_reviews = 20 * MINUTES_PER_SHIFT / REVIEW_MINUTES    # 1,800/day
#
#    The question becomes "what is the precision in the top 1,800
#    scores", which for a model with any ranking ability is far better
#    than its precision at 0.5. This alone often makes the model
#    viable, and it costs nothing.
#
# 2. RAISE THE PRIOR BEFORE APPLYING THE MODEL. Run it only on
#    transactions already unusual on cheap rules -- new payee, unusual
#    amount, foreign IP. If that segment has 5% fraud instead of 0.3%,
#    precision rises accordingly:
confusion(50_000, 0.05, SENSITIVITY, SPECIFICITY)
# tp = 2,450, fp = 1,425  ->  precision 63%
#
#    THIS IS THE SCREENING-VERSUS-DIAGNOSIS DISTINCTION. The same
#    instrument is nearly useless on an unselected population and
#    genuinely useful on a pre-selected one, and the model did not
#    change.
#
# 3. TIER THE RESPONSE BY SCORE rather than sending everything to a
#    human:
#      very high  -> block automatically
#      high       -> human review
#      medium     -> step-up authentication (a code to the phone)
#      low        -> allow
#    Only one tier consumes reviewer time, and step-up auth is
#    effectively free per transaction.
#
# 4. MEASURE COST, NOT ACCURACY. A missed fraud costs the disputed
#    amount; a false positive costs a review plus some customer
#    goodwill. Those are different currencies and the threshold should
#    be set where expected cost is minimised, not where accuracy peaks.

def expected_cost(threshold_spec, sens, base_rate=BASE_RATE, n=DAILY,
                  fraud_cost=120.0, review_cost=3.0, friction_cost=8.0):
    c = confusion(n, base_rate, sens, threshold_spec)
    return (c["fn"] * fraud_cost
            + c["fp"] * (review_cost + friction_cost))

expected_cost(0.97, 0.98)        # 672,420/day  -- as pitched
expected_cost(0.999, 0.90)       # 57,918/day   -- less sensitive, far cheaper
#
# A LESS SENSITIVE MODEL WITH BETTER SPECIFICITY IS AN ORDER OF
# MAGNITUDE CHEAPER, which the accuracy figures alone would never
# reveal.


# =========================================================================
# TESTS
# =========================================================================

def test_precision_collapses_at_the_real_base_rate():
    c = confusion(DAILY, BASE_RATE, SENSITIVITY, SPECIFICITY)
    precision = c["tp"] / (c["tp"] + c["fp"])

    assert precision < 0.10


def test_balanced_validation_overstates_precision_tenfold():
    bal = confusion(100_000, 0.5, SENSITIVITY, SPECIFICITY)
    real = confusion(DAILY, BASE_RATE, SENSITIVITY, SPECIFICITY)

    p_bal = bal["tp"] / (bal["tp"] + bal["fp"])
    p_real = real["tp"] / (real["tp"] + real["fp"])

    assert p_bal / p_real > 10


def test_workload_is_the_decisive_number():
    c = confusion(DAILY, BASE_RATE, SENSITIVITY, SPECIFICITY)
    reviewers = ((c["tp"] + c["fp"]) * REVIEW_MINUTES) / MINUTES_PER_SHIFT

    assert reviewers > 500


def test_specificity_inversion_round_trips():
    for target in (0.25, 0.5, 0.9):
        spec = specificity_for_precision(target, BASE_RATE, SENSITIVITY)
        c = confusion(DAILY, BASE_RATE, SENSITIVITY, spec)

        assert abs(c["tp"] / (c["tp"] + c["fp"]) - target) < 1e-6


def test_raising_the_prior_beats_improving_the_model():
    """Pre-screening to a 5% segment does more than any realistic
    accuracy gain."""
    pre = confusion(50_000, 0.05, SENSITIVITY, SPECIFICITY)
    p_pre = pre["tp"] / (pre["tp"] + pre["fp"])

    assert p_pre > 0.6


def test_less_sensitive_more_specific_costs_less():
    """The accuracy figures hide this entirely."""
    assert expected_cost(0.999, 0.90) < expected_cost(0.97, 0.98) / 5`,
        notes: [
          { t: "p", text: "**The workload settles it before any accuracy argument.** 65,700 flags a day at four minutes each is 730 full-time reviewers, 664 of whom would spend their entire day on legitimate transactions. No fraud loss justifies that, and the number does not depend on the model's price." },
          { t: "callout", kind: "insight", title: "Precision is not a property of the model", body: [
            { t: "p", text: "Sensitivity and specificity belong to the model; precision belongs to the model *and* the population. The same detector shows 97% precision on a balanced set and 9% in production, with nothing changed but the base rate." },
            { t: "p", text: "**Whenever a vendor quotes precision, ask what base rate it was measured at.** \"We balanced the classes\" means the figure will never be observed." }
          ]},
          { t: "p", text: "**At 0.3% prevalence the legitimate group is 332× larger**, so a 3% false-positive rate on it produces ten times more flags than a 98% catch rate on the fraud group. That ratio is the whole mechanism." },
          { t: "p", text: "**Even 25% precision would need specificity to rise from 97% to 99.12%** — a 3.4× reduction in false positives. For 90% precision it is a 92× reduction, which is not a realistic ask." },
          { t: "p", text: "**Raising the prior beats improving the model.** Running the detector only on transactions already unusual on cheap rules lifts precision from 9% to 63% — the screening-versus-diagnosis distinction, with the model unchanged." },
          { t: "p", text: "**Optimise expected cost, not accuracy.** A *less* sensitive model with better specificity comes out an order of magnitude cheaper, which the accuracy figures alone would never reveal." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A security team deployed anomaly detection across 50,000 endpoints. It generated 400 alerts a day, the team could investigate about 30, and after two months everybody had stopped reading them." },
      { t: "p", text: "**The detector was performing exactly as specified** — a 0.8% false-positive rate on 50,000 endpoints is 400 alerts, and genuine compromises numbered perhaps one a month. Precision was around 0.008%." },
      { t: "p", text: "**Alert fatigue is a base-rate problem wearing an operational costume.** The team had bought a sensitivity number and received a workload, and the volume was predictable from the specification sheet on day one." },
      { t: "p", text: "**Compute the alerts per day before deploying any detector.** If the number exceeds what the team can investigate, the deployment has already failed — no amount of tuning after the fact recovers a queue nobody reads." }
    ]}
  ],

  takeaways: [
    "**Conditioning restricts the sample space and renormalises** — relative sizes within the condition never change.",
    "**`P(A|B)` and `P(B|A)` answer different questions** and divide by different denominators.",
    "**Bayes converts one into the other**, and the prior is the term that gets dropped.",
    "**A 99%-accurate test at 1% prevalence gives a 50% chance of disease on a positive result** — 1% of a big group outnumbers 99% of a small one.",
    "**At low prevalence specificity matters far more than sensitivity**, because false positives come from the larger group.",
    "**The prosecutor's fallacy swaps `P(evidence|innocent)` for `P(innocent|evidence)`** — and the search size belongs in the calculation.",
    "**Precision is a property of the model *and* the population**; sensitivity and specificity are properties of the model alone.",
    "**A precision figure from a balanced validation set will never be observed in production.**",
    "**Conditioning on a common cause removes spurious association; conditioning on a common effect creates it** — so \"control for everything\" is unsafe.",
    "**Raising the prior often beats improving the model** — pre-screening lifts precision more than any realistic accuracy gain.",
    "**Compute alerts per day before deploying a detector.** If it exceeds what the team can investigate, the deployment has already failed.",
    "**Optimise expected cost, not accuracy** — a less sensitive, more specific model is often an order of magnitude cheaper."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A test is 99% sensitive and 99% specific, and the disease affects 1% of people. You test positive. What is the probability you have it?",
        options: [
          "99%",
          "50% — of 10,000 people, 99 true positives from the 100 sick and 99 false positives from the 9,900 healthy",
          "1%",
          "98%"
        ],
        answer: 1,
        why: "Counting people makes it obvious rather than surprising: 1% of a big group can outnumber 99% of a small one. It is also why screening an asymptomatic population and testing a symptomatic patient are different acts with the same instrument — symptoms raise the prior."
      },
      {
        stem: "A vendor reports 97% precision on a balanced dataset. Your base rate is 0.3%. What will you actually see?",
        options: [
          "About 97%, since the model does not change",
          "About 9% — precision depends on the population, and the legitimate group is 332× larger than the fraud group",
          "Slightly less than 97%",
          "It cannot be predicted without testing"
        ],
        answer: 1,
        why: "Sensitivity and specificity are properties of the model; precision is not. A precision figure quoted from a balanced set is a number that will never be observed, which is the most common way classifier results get oversold."
      },
      {
        stem: "Among successful people, talent and luck are negatively correlated, yet they are independent in the population. Why?",
        options: [
          "The sample is too small",
          "Collider bias — conditioning on a common *effect* creates an association, because either route was sufficient for success",
          "Talent causes bad luck",
          "The correlation estimate is biased"
        ],
        answer: 1,
        why: "Conditioning on a common cause removes spurious association; conditioning on a common effect creates it. That asymmetry is why \"control for everything you measured\" is unsafe advice — it manufactures exactly the correlations you were trying to rule out."
      },
      {
        stem: "A DNA match has a 1-in-a-million coincidence rate. The suspect was found by searching a 60-million-profile database. How strong is the evidence?",
        options: [
          "Overwhelming — one in a million",
          "Weak — 60 coincidental matches are expected in a database that size, so the match alone gives roughly a 1.6% probability of guilt",
          "It cannot be quantified",
          "The same as if the suspect had been identified another way"
        ],
        answer: 1,
        why: "The same evidence supports opposite conclusions depending on how the suspect was found: with an effective pool of 100, it is 99.99% damning. Search size belongs in the calculation, which is the same principle as correcting for multiple comparisons."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "A test is 99% accurate for a disease affecting 1 in 100 people. You test positive. Should you worry?",
        strong: "It is about a 50% chance. Of 10,000 people, 100 are sick and 99 test positive; 9,900 are healthy and 99 of those also test positive. The base rate does more work than the accuracy figure.",
        answer: [
          { t: "p", text: "Answering by counting people rather than manipulating probabilities is what makes it convincing to a non-specialist." },
          { t: "p", text: "Adding that specificity matters more than sensitivity at low prevalence shows you can act on the result rather than just state it." }
        ]
      },
      {
        level: "advanced",
        q: "Your classifier has 95% precision in validation and users say it is useless. What happened?",
        strong: "Almost certainly a base-rate difference — the validation set was balanced or enriched, and production is not. Precision depends on the population, so I would recompute it at the real base rate before touching the model.",
        answer: [
          { t: "p", text: "Going to the base rate first, rather than to model quality, is the diagnostic instinct being tested." },
          { t: "p", text: "Proposing to raise the prior by pre-screening, or to use the score for ranking rather than a fixed threshold, shows you can fix it without a better model." }
        ]
      },
      {
        level: "advanced",
        q: "When is it wrong to control for a variable?",
        strong: "When it is a collider — a common effect of both the exposure and the outcome. Conditioning on it creates an association that is not there. Controlling for a common cause is right; controlling for a common effect is actively harmful.",
        answer: [
          { t: "p", text: "The cause-versus-effect distinction is the substance, and it contradicts the common instinct to adjust for everything available." },
          { t: "p", text: "A concrete example — talent and luck among successful people — makes it stick better than the abstract statement." }
        ]
      }
    ]
  }
});
